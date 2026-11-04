/**
 * no-hscroll.js — 把侧栏「左右滑动」彻底锁死。
 *
 * 为什么需要它：
 *   宿主把侧栏会话列表放在一个可横向滚动的容器里（overflow-x: auto）。进入消息视图后，
 *   座位从工作区分组搬进扁平列表，只要内容比容器宽几个像素——主题的额外内边距、我们的
 *   日期标题、行内的工作区标签都会贡献这点宽度——容器就会长出横向滚动条，整片列表能被
 *   左右拖动。真机截图里列表底部那条灰色长条就是它，用户要求「固定住」。
 *
 * 做法：
 *   开启消息视图时，顺着扁平列表一路向上收集祖先（含侧栏根与其外层布局列），把其中
 *   「可横向滚动」的容器临时改成不可横向滚动，并记下原值；退出视图时逐个还原。
 *   只写内联样式，不动宿主样式表，卸载后不留痕迹。
 */
import { SIDEBAR_SELECTOR } from './constants.js'

/** 这些 overflow-x 取值意味着容器可以左右滚。 */
const SCROLLABLE_X = new Set(['auto', 'scroll'])

/**
 * 收出「从扁平列表到文档根」这段祖先链。
 *
 * 平铺状态下真正的滚动容器就在这条链上；侧栏根以外的布局列也一并收进来，
 * 否则横向滚动条可能出现在侧栏外面（同为整页左右晃动）。
 */
function ancestorChain() {
  const sidebar = document.querySelector(SIDEBAR_SELECTOR)
  const flat = document.querySelector('[class*="flatList"], [class*="_flatList"]')
  const nodes = []
  let node = flat ?? sidebar
  while (node instanceof Element && node !== document.documentElement) {
    nodes.push(node)
    if (node === sidebar) break
    node = node.parentElement
  }
  // 侧栏根再往上（布局列、#root 之类）也要看：横向滚动的也可能是它们。
  let outer = sidebar?.parentElement ?? null
  while (outer instanceof Element && outer !== document.documentElement) {
    nodes.push(outer)
    outer = outer.parentElement
  }
  return nodes
}

export function createNoHScroll() {
  /** element -> 被我们覆盖前的内联 overflow-x（'' 表示原本没写）。 */
  const saved = new Map()

  /** 锁一遍：把链上所有可横向滚动的容器变成不可横向滚动。 */
  function apply() {
    for (const node of ancestorChain()) {
      const style = getComputedStyle(node)
      if (!SCROLLABLE_X.has(style.overflowX)) continue
      if (!node.scrollWidth || node.clientWidth === 0) continue
      if (!saved.has(node)) saved.set(node, node.style.overflowX)
      // 纵向还能滚时用 hidden（只封横向）；纵向本来就 overflow: visible 时用 clip，
      // 免得 hidden 顺手把元素变成滚动容器、额外长出纵向滚动条。
      const verticalScrolls = style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'hidden'
      node.style.overflowX = verticalScrolls ? 'hidden' : 'clip'
    }
  }

  /** 还原：把所有被改过的容器恢复原值。 */
  function restore() {
    for (const [node, value] of saved) {
      node.style.overflowX = value
    }
    saved.clear()
  }

  /** 当前是否还锁着（调试与验证用）。 */
  function isLocked() {
    return saved.size > 0
  }

  return { apply, restore, isLocked }
}
