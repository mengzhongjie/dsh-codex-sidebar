/**
 * portal-fit.js — 让挂在 body 上的浮层跟着「整体缩放」一起变大变小。
 *
 * 背景（实测结论，见 styles.js 顶部注释）：
 *   · 整页缩放用的是 #root { transform: scale(f) }。宿主与第三方插件把菜单、设置页、
 *     dsh-better-sidebar 的面板都 portal 到 body 上（常见形态：body > 一个 static 的「跳板」div
 *     > 一个 position:fixed 的宿主 div > 面板），并且用 getBoundingClientRect 的视觉像素摆位。
 *   · transform 不在这些节点的祖先链上，所以它们的「位置」是对的（视觉像素写多少就渲染多少），
 *     但「大小」停在 100% 尺度：缩到 125% 时弹层里的字比界面里小一圈，better-sidebar 的
 *     底部面板还会压住输入框。
 *
 * 修法（三段，缺一不可）：
 *   1. 给浮层根节点补 zoom: f —— 内容、内边距、圆角按 f 放大，与界面同尺度；
 *   2. 根节点与它子树里「行内写着 px 偏移」的元素，把 left/top/right/bottom 除以 f ——
 *      抵消 zoom 对偏移的放大，位置回到宿主算好的视觉坐标；
 *   3. 满屏浮层（四边都是 0）额外写 width/height = 视口尺寸 ÷ f，否则 zoom 会把整屏盒子
 *      放大成两屏（better-sidebar 的 [data-dsh-panel-host] 就是这种）。
 *
 * 只做「除法」不碰宽度/高度（第 3 条例外）：面板高度 220px 是设计像素，放大后应该看起来更高，
 * 除以倍率反而会把它压回原样。倍率为 1、浮层消失或卸载时，全部原样还原。
 */

/** 浮层根节点的标记属性（便于在 devtools 里认出来，也便于排查）。 */
export const PORTAL_FIT_ATTR = 'data-codex-sidebar-portal-fit'

/** 会被除以倍率的行内偏移属性。 */
const OFFSET_PROPS = ['left', 'top', 'right', 'bottom']

/** 满屏浮层额外写的尺寸属性。 */
const SIZE_PROPS = ['width', 'height']

/** 非可视节点不参与。 */
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'TEMPLATE', 'META', 'NOSCRIPT'])

/** 读 px 数值（只认纯 px；calc/var/百分比原样放过，避免把宿主的表达式改坏）。 */
function pxValue(text) {
  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(String(text).trim())
  return match === null ? null : Number(match[1])
}

/** 按倍率折算一个 px 字符串；不是纯 px 就返回 null。 */
function dividePx(text, factor) {
  const value = pxValue(text)
  if (value === null) return null
  return `${Math.round((value / factor) * 100) / 100}px`
}

/** 本插件自己的节点、以及 #root（它已经被 transform 管着）都不碰。 */
function isSkipped(el) {
  if (el.id === 'root') return true
  if (SKIP_TAGS.has(el.tagName)) return true
  if (el.hasAttribute('data-codex-sidebar-owned')) return true
  return el.closest('[data-codex-sidebar-owned]') !== null
}

export function createPortalFit() {
  /** 每个被接管的节点：原始行内值 + 我们最后写入的值（用来避免读写自激）。 */
  const records = new Map()
  /** 当前倍率（1 表示不接管）。 */
  let factor = 1
  /** rAF 句柄，合并连续的 DOM 变更。 */
  let frame = 0
  let observer = null

  function recordOf(el) {
    let record = records.get(el)
    if (record === undefined) {
      record = { original: new Map(), written: new Map() }
      records.set(el, record)
    }
    return record
  }

  /** 写一个行内属性：先记原始值；值没变就不写（避免多余回流与自激）。 */
  function writeProp(el, record, prop, value) {
    if (el.style.getPropertyValue(prop) === value) {
      record.written.set(prop, value)
      return
    }
    if (!record.original.has(prop)) record.original.set(prop, el.style.getPropertyValue(prop))
    el.style.setProperty(prop, value)
    record.written.set(prop, value)
  }

  /** 只换算偏移：把宿主写的视觉 px 除以倍率。 */
  function fitOffsets(el) {
    const record = recordOf(el)
    for (const prop of OFFSET_PROPS) {
      const current = el.style.getPropertyValue(prop)
      if (current === '') continue
      if (record.written.get(prop) === current) continue // 这份是我们刚写的，别再除一次
      const scaled = dividePx(current, factor)
      if (scaled !== null) writeProp(el, record, prop, scaled)
    }
  }

  /** 是不是「满屏浮层」（四边全 0）：这种节点 zoom 之后必须显式写回视口尺寸。 */
  function isFullscreen(el) {
    const style = getComputedStyle(el)
    return style.top === '0px' && style.left === '0px' && style.right === '0px' && style.bottom === '0px'
  }

  /** 接管一个浮层根节点：偏移换算 + 满屏尺寸 + 补 zoom。 */
  function fitRoot(el) {
    if (!el.hasAttribute(PORTAL_FIT_ATTR)) el.setAttribute(PORTAL_FIT_ATTR, '')
    const record = recordOf(el)
    fitOffsets(el)
    if (isFullscreen(el)) {
      const width = `${Math.round(window.innerWidth / factor)}px`
      const height = `${Math.round(window.innerHeight / factor)}px`
      writeProp(el, record, 'width', width)
      writeProp(el, record, 'height', height)
    }
    const zoom = String(factor)
    if (el.style.getPropertyValue('zoom') !== zoom) el.style.setProperty('zoom', zoom)
    record.zoomApplied = true
  }

  /** 还原一个节点：把行内值改回宿主原来写的。 */
  function unfit(el) {
    const record = records.get(el)
    if (record === undefined) return
    if (record.zoomApplied === true) el.style.removeProperty('zoom')
    for (const [prop, value] of record.original) {
      if (value === '') el.style.removeProperty(prop)
      else el.style.setProperty(prop, value)
    }
    el.removeAttribute(PORTAL_FIT_ATTR)
    records.delete(el)
  }

  /**
   * 收集「浮层根节点」：body 的直接孩子里，自己就是 fixed/absolute 的算一个；
   * 是 static「跳板」的，往里找到第一个 fixed/absolute 的后代（better-sidebar 就是这样挂的）。
   */
  function collectRoots() {
    const roots = []
    /** 最多往下钻三层，避免在奇怪的宿主结构里乱走。 */
    const walk = (el, depth) => {
      if (isSkipped(el)) return
      const position = getComputedStyle(el).position
      if (position === 'fixed' || position === 'absolute') {
        roots.push(el)
        return // 里面的内容归它自己管，不再往里找
      }
      if (depth >= 3) return
      for (const child of el.children) walk(child, depth + 1)
    }
    for (const child of document.body.children) walk(child, 0)
    return roots
  }

  /** 扫一遍：接管所有浮层根节点与它们子树里写了行内偏移的元素，还原已经不成立的。 */
  function refresh() {
    if (factor === 1) return
    const wanted = new Set()
    for (const root of collectRoots()) {
      wanted.add(root)
      fitRoot(root)
      for (const el of root.querySelectorAll('[style]')) {
        if (isSkipped(el)) continue
        wanted.add(el)
        fitOffsets(el)
      }
    }
    // 已经不在接管范围内的（面板收起、弹层卸载、宿主换了一个根）全部还原。
    for (const el of [...records.keys()]) {
      if (wanted.has(el) && el.isConnected) continue
      unfit(el)
    }
  }

  /** 合并成一帧再扫，避免一次弹层打开触发十几轮。 */
  function schedule() {
    if (frame !== 0) return
    frame = requestAnimationFrame(() => {
      frame = 0
      refresh()
    })
  }

  return {
    /** 应用倍率：1 表示还原。 */
    apply(value) {
      const next = Number(value)
      const normalized = Number.isFinite(next) && next > 0 ? Math.round(next * 100) / 100 : 1
      if (normalized === factor) {
        if (normalized !== 1) schedule()
        return
      }
      // 倍率变了：先按旧倍率整体还原，再按新倍率重新接管（否则原始值会被层层折算）。
      for (const el of [...records.keys()]) unfit(el)
      factor = normalized
      if (factor !== 1) schedule()
    },

    /** 视口变化：满屏浮层尺寸要重算（偏移由宿主自己重写，下一帧会被我们重新折算）。 */
    handleResize() {
      if (factor === 1) return
      schedule()
    },

    /** 开始监听：弹层是后插入 body 的，必须有人盯住。 */
    start() {
      if (observer !== null) return
      observer = new MutationObserver(() => schedule())
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
      })
    },

    /** 停止监听并全部还原。 */
    restore() {
      if (observer !== null) {
        observer.disconnect()
        observer = null
      }
      if (frame !== 0) {
        cancelAnimationFrame(frame)
        frame = 0
      }
      for (const el of [...records.keys()]) unfit(el)
      factor = 1
    },

    /** 卸载：还原并停止。 */
    dispose() {
      this.restore()
    }
  }
}
