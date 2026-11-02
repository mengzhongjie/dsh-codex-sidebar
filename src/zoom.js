/**
 * zoom.js — 「整体缩放」：优先用窗口级 page zoom，网页版退回页面 CSS。
 *
 * 为什么要分两条路（实测，见 lib/index.js 顶部注释）：
 *   · 页面 CSS 缩放（transform / zoom）会让挂在 body 上的第三方面板坐标错位 ——
 *     dsh-better-sidebar 的底部面板与右侧栏按 getBoundingClientRect 的视觉像素摆位，
 *     祖先一缩放，它们要么不跟着放大（#root transform），要么跑到视口外（html/body zoom）。
 *   · 桌面 App 的宿主就是 Electron 主进程，可以调 webContents.setZoomFactor() 做浏览器级
 *     缩放：布局、fixed、body 上的 portal 全部一起放大，第三方面板自然跟着对。
 *
 * 所以：先问宿主半边（/codex-sidebar/api/zoom）能不能做窗口级缩放——
 *   能  → 走窗口级，页面里什么 CSS 都不加；
 *   不能（网页版）→ 退回样式表缩放（属性 + 变量 + 页面尺寸变量三件套）。
 *
 * 三件套的细节来自 dsh-claude-style（shared/page-zoom.ts、theme/chrome.css）：
 * 绝不写 body.style.zoom —— 行内 zoom 是「另一份缩放」，会把别的插件的缩放规则整条盖掉。
 */
import { ZOOM_ATTR, ZOOM_VAR, ZOOM_WIDTH_VAR, ZOOM_HEIGHT_VAR, ZOOM_RANGE } from './constants.js'

/** 宿主半边注册的端点（客户端用同源相对路径）。 */
const ENDPOINT = '/codex-sidebar/api/zoom'

/** 把倍率夹进合法区间并收成两位小数。 */
function clampFactor(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 1
  const clamped = Math.min(ZOOM_RANGE.max, Math.max(ZOOM_RANGE.min, number))
  return Math.round(clamped * 100) / 100
}

/**
 * 页面被缩放后，vh/vw 会再乘一次倍率，宿主的弹层按视口单位封顶就会超出窗口。
 * 把「页面自身的尺寸」写成两个变量，样式表用它封顶即可。
 */
function writePageSize(factor) {
  document.body.style.setProperty(ZOOM_WIDTH_VAR, `${Math.round(window.innerWidth / factor)}px`)
  document.body.style.setProperty(ZOOM_HEIGHT_VAR, `${Math.round(window.innerHeight / factor)}px`)
}

/** 撤掉 CSS 缩放的三件套。 */
function clearCssZoom() {
  const body = document.body
  body.removeAttribute(ZOOM_ATTR)
  body.style.removeProperty(ZOOM_VAR)
  body.style.removeProperty(ZOOM_WIDTH_VAR)
  body.style.removeProperty(ZOOM_HEIGHT_VAR)
}

/** 把倍率写到页面上（CSS 兜底路线）。 */
function applyCssZoom(factor) {
  const body = document.body
  if (Math.abs(factor - 1) < 0.001) {
    clearCssZoom()
    return
  }
  body.style.setProperty(ZOOM_VAR, String(factor))
  body.setAttribute(ZOOM_ATTR, String(factor))
  writePageSize(factor)
}

export function createZoom() {
  /** 'unknown' 表示还没探测；探测完成后只会是 'window' 或 'css'。 */
  let mode = 'unknown'
  /** 最近一次要的倍率：探测完成前先记住，探测完再落地。 */
  let wanted = 1
  /** 组件是否已卸载（卸载后不再发请求、不再改 DOM）。 */
  let disposed = false

  /** 问宿主：能窗口级缩放吗？ */
  async function probe() {
    try {
      const response = await fetch(ENDPOINT, { headers: { accept: 'application/json' } })
      if (!response.ok) return 'css'
      const data = await response.json()
      return data !== null && data.supported === true ? 'window' : 'css'
    } catch {
      // 网页版没有这个路由（或还没注册好）：退回 CSS。
      return 'css'
    }
  }

  /** 让宿主把窗口缩放到某个倍率；失败返回 false（调用方据此退回 CSS）。 */
  async function pushWindowZoom(factor) {
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ factor })
      })
      if (!response.ok) return false
      const data = await response.json()
      return data !== null && data.supported === true
    } catch {
      return false
    }
  }

  /** 落地一次倍率（内部用，已知道该走哪条路）。 */
  async function land(factor) {
    if (disposed) return
    if (mode === 'window') {
      // 窗口级缩放生效时，页面里不能留任何 CSS 缩放（否则两者相乘）。
      clearCssZoom()
      const ok = await pushWindowZoom(factor)
      if (!ok) {
        // 宿主中途不给做了（比如窗口销毁）：退回 CSS，至少让倍率看得见。
        mode = 'css'
        applyCssZoom(factor)
      }
      return
    }
    applyCssZoom(factor)
  }

  return {
    /** 当前生效的路线：'window' | 'css' | 'unknown'。 */
    get mode() {
      return mode
    },

    /** 探测一次路线（启动时调一次即可）。 */
    async start() {
      mode = await probe()
      return mode
    },

    /** 应用倍率：探测还没完成时只记下来，完成后自动补上。 */
    apply(value) {
      wanted = clampFactor(value)
      if (mode === 'unknown') return Promise.resolve()
      return land(wanted)
    },

    /** 窗口尺寸变了：CSS 路线的页面尺寸变量要重算。 */
    handleResize() {
      if (mode === 'css' && Math.abs(wanted - 1) >= 0.001) writePageSize(wanted)
    },

    /** 还原到 100%（卸载时调）。 */
    reset() {
      wanted = 1
      clearCssZoom()
      if (mode === 'window') void pushWindowZoom(1)
    },

    /** 卸载：之后不再发请求。 */
    dispose() {
      disposed = true
    }
  }
}
