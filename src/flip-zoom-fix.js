/**
 * 宿主 FLIP 动画在「页面被缩放」时的位移补偿。
 *
 * 现象：打开一个工作区时，它下面那组会先往上多窜一截再落回来（残余过冲 15%，缩放 1.15 时正好 20px）。
 * 我们用 A/B 量过结论：宿主 AnimatedRows 的位移是这样算的 ——
 *   1. readPositions() 用 getBoundingClientRect 读**视觉像素**，得到 dy（例如 133.31）；
 *   2. 把这个 dy 原样写进 keyframes：transform: translate(0px, -133.31px)；
 *   3. 但 transform 是在**本地坐标系**里生效的，页面 zoom / transform 会再放大它一次。
 * 于是视觉位移变成 dy × s，比应有的 dy 多出 dy × (s − 1)：s = 1.15、dy = 133.31 时正好多 20px。
 * 纯宿主（s = 1）时这个式子恒等于 0，所以只在缩放过的页面上看得到。
 *
 * 修法：在宿主调 element.animate 的那一刻，把 translate 的两个数值按当前有效缩放除一下。
 * 只折算侧栏里带 data-row-key 的行（宿主列表动画的唯一对象），其余一律放行，
 * 缩放为 1 时整段逻辑等于没装。这样不改宿主的读数、不改宿主代码，也不碰其它插件的动画。
 *
 * 有效缩放怎么拿：取页面根的「视觉宽 ÷ 布局宽」，候选依次是 body → documentElement → #root → 被动画的元素。
 * 为什么不用侧栏根：桌面布局里侧栏可以是收起的（宽为 0），那时拿不到缩放，补偿会静默失效。
 * body 最稳：只要页面整体被缩放，body 的视觉宽与布局宽就会差出倍率，收不收侧栏都一样。
 */
import { LOG_PREFIX } from './constants.js'

/** 只在侧栏里动手：宿主的行列表都在 [data-slot="sidebar"] 下 */
const SIDEBAR_SELECTOR = '[data-slot="sidebar"]'

/** 中间结果缓存时间：缩放可能在拖动窗口或改设置时变化，隔一小会重测一次 */
const SCALE_CACHE_MS = 120

/** 从 `-12.5px` 这类值里取出数字，取不到返回 null */
function pxValue (text) {
  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(String(text == null ? '' : text).trim())
  return match === null ? null : Number(match[1])
}

/**
 * 把一条 transform 里的平移折算成 `值 ÷ 缩放`。
 * 只处理带 px 的平移：`translate(0, 0)`、`translate(0px, 0px)` 这种零位移折不折算都一样，直接放过。
 * 支持 translate(2 参) / translate3d(3 参) / translateX / translateY —— 宿主目前只用第一种，
 * 其余几种留着是为了宿主换写法时不至于悄悄失效（认不出的写法一律原样返回）。
 */
function rescaleTransform (text, scale) {
  if (typeof text !== 'string' || text === '') return text
  let changed = false
  const rescale = (body) => {
    const parts = body.split(',')
    let touched = false
    for (let index = 0; index < parts.length; index += 1) {
      const value = pxValue(parts[index])
      if (value === null || value === 0) continue
      parts[index] = ` ${(value / scale).toFixed(3)}px`
      touched = true
    }
    if (touched) changed = true
    return parts.join(',')
  }
  const result = text.replace(/translate3d\(([^)]+)\)/g, (all, body) => `translate3d(${rescale(body)})`)
    .replace(/translate\(([^)]+)\)/g, (all, body) => `translate(${rescale(body)})`)
    .replace(/translateX\(([^)]+)\)/g, (all, body) => `translateX(${rescale(body)})`)
    .replace(/translateY\(([^)]+)\)/g, (all, body) => `translateY(${rescale(body)})`)
  return changed ? result : text
}

/** 把一帧里所有 transform 属性折算一遍（不改动其它属性，也不改动非平移写法） */
function rescaleFrames (keyframes, scale) {
  const frames = Array.isArray(keyframes) ? keyframes : [keyframes]
  return frames.map((frame) => {
    if (frame === null || typeof frame !== 'object' || typeof frame.transform !== 'string') return frame
    const transform = rescaleTransform(frame.transform, scale)
    if (transform === frame.transform) return frame
    // 复制一份再改，避免动到宿主手里那份对象（它可能复用同一个字面量）
    return { ...frame, transform }
  })
}

/**
 * 创建补偿器。
 * @param {string} [selector] 侧栏根选择器，默认 `[data-slot="sidebar"]`
 */
export function createFlipZoomFix (selector = SIDEBAR_SELECTOR) {
  let installed = false
  let originalAnimate = null
  let cachedScale = 1
  let cachedAt = 0

  /**
   * 单个节点的「视觉尺寸 ÷ 布局尺寸」。视觉宽由 getBoundingClientRect 给出（已含缩放），
   * 布局宽由 offsetWidth 给出（不含缩放）；两个都为 0 时返回 null，表示这个节点量不到。
   */
  const ratioOf = (node) => {
    if (node === null || node === undefined || typeof node.getBoundingClientRect !== 'function') return null
    const width = node.getBoundingClientRect().width
    const layoutWidth = node.offsetWidth
    if (width > 0 && layoutWidth > 0) return width / layoutWidth
    const height = node.getBoundingClientRect().height
    const layoutHeight = node.offsetHeight
    if (height > 0 && layoutHeight > 0) return height / layoutHeight
    return null
  }

  /**
   * 当前有效缩放。
   * 候选项从「最不受布局影响」到「最贴近目标」：body → documentElement → #root → 侧栏根 → 元素自身。
   * 取到第一个能量出来的比值就走；都量不到就按 1，宁可不动也不能把位移折算错。
   */
  const scaleOf = (element) => {
    const now = Date.now()
    if (now - cachedAt < SCALE_CACHE_MS) return cachedScale
    cachedAt = now
    cachedScale = 1
    const candidates = [document.body, document.documentElement, document.getElementById('root'), document.querySelector(selector), element]
    for (const node of candidates) {
      const ratio = ratioOf(node)
      if (ratio !== null && Number.isFinite(ratio) && ratio > 0) {
        cachedScale = ratio
        break
      }
    }
    return cachedScale
  }

  /**
   * 只对宿主列表里的行生效：宿主的列表项都带 data-row-key，取值为 session:/workspace:/overflow:。
   * 除了看 key 前缀，也接受「挂在侧栏里」的行，这样宿主改 key 前缀时仍有兜底；
   * 其它插件的浮层动画、设置页动画都不带这些前缀，一律放行。
   */
  const ROW_KEY_PREFIXES = ['session:', 'workspace:', 'overflow:']
  const shouldRescale = (element) => {
    if (element === null || typeof element.closest !== 'function') return false
    if (typeof element.getAttribute !== 'function') return false
    const rowKey = element.getAttribute('data-row-key')
    if (rowKey === null) return false
    if (ROW_KEY_PREFIXES.some((prefix) => rowKey.startsWith(prefix))) return true
    return element.closest(selector) !== null
  }

  /** 打补丁：包一层 Element.prototype.animate，其余行为完全转交原实现 */
  const start = () => {
    if (installed) return
    if (typeof Element === 'undefined' || Element.prototype.animate === undefined) return
    originalAnimate = Element.prototype.animate
    installed = true
    Element.prototype.animate = function animate (keyframes, options) {
      try {
        const scale = scaleOf(this)
        // 缩放差 1% 以内就当没缩放，避免浮点噪声把动画数值抖一下
        if (Math.abs(scale - 1) > 0.01 && shouldRescale(this)) {
          // 除以有效缩放后，视觉位移才等于宿主读到的 dy
          return originalAnimate.call(this, rescaleFrames(keyframes, scale), options)
        }
      } catch (error) {
        // 补偿失败绝不能让宿主动画连带失败，原样放行
        console.warn(LOG_PREFIX, 'flip zoom fix skipped', error)
      }
      return originalAnimate.call(this, keyframes, options)
    }
  }

  /** 卸补丁：恢复原生 animate */
  const dispose = () => {
    if (!installed) return
    Element.prototype.animate = originalAnimate
    originalAnimate = null
    installed = false
    cachedAt = 0
    cachedScale = 1
  }

  return { start, dispose, scaleOf }
}
