/**
 * sidebar-dom.js — 侧栏的 DOM 定位工具。
 *
 * 宿主没有对外暴露侧栏组件，只能靠数据属性定位：
 *   根节点   [data-slot="sidebar"]
 *   会话行   [data-row-key^="session:"]        （行外层还包着一个只含一个孩子的 span「座位」）
 *   工作区行 [data-row-key^="workspace:"]
 * 类名是哈希过的（bhn1Oq_list 之类），只在兜底时按「包含 flatList」这类子串匹配。
 */
import { SIDEBAR_SELECTOR, SESSION_ROW_SELECTOR, WORKSPACE_ROW_SELECTOR, TOGGLE_LABELS, SESSION_KEY_PREFIX, OWN_ATTR } from './constants.js'

/** 取侧栏根节点。 */
export function findSidebar() {
  return document.querySelector(SIDEBAR_SELECTOR)
}

/** 取侧栏折叠/展开按钮：aria-label 中英文都认。 */
export function findToggle(sidebar) {
  const root = sidebar ?? findSidebar()
  if (root === null) return null
  const wanted = TOGGLE_LABELS.map(label => label.toLowerCase())
  for (const button of root.querySelectorAll('button')) {
    const label = (button.getAttribute('aria-label') ?? '').toLowerCase()
    if (wanted.includes(label)) return button
  }
  return null
}

/** 顶行（logo 行）：折叠按钮与品牌按钮同在一个容器里。 */
export function findLogoRow(sidebar) {
  const toggle = findToggle(sidebar)
  return toggle?.parentElement ?? null
}

/**
 * 扁平列表容器。
 *
 * 日期视图要求宿主先切到扁平分组；此时所有会话座位是同一个容器的直接子节点。
 * 优先按类名子串找，找不到就退回「第一个会话座位的父容器」。
 */
export function findFlatList(sidebar) {
  const root = sidebar ?? findSidebar()
  if (root === null) return null
  for (const node of root.querySelectorAll('div')) {
    const className = typeof node.className === 'string' ? node.className : ''
    if (className.includes('flatList')) return node
  }
  const seat = document.querySelector(SESSION_ROW_SELECTOR)?.parentElement
  return seat?.parentElement ?? null
}

/** 所有会话「座位」（真正在列表里被移动的那个 span），跳过本插件自己建的节点。 */
export function collectSeats(container) {
  if (container === null) return []
  return [...container.children].filter(child => {
    if (child.hasAttribute?.(OWN_ATTR)) return false
    return child.querySelector?.(SESSION_ROW_SELECTOR) !== null
  })
}

/** 座位里的会话行。 */
export function rowOfSeat(seat) {
  return seat.querySelector?.(SESSION_ROW_SELECTOR) ?? null
}

/** 从会话行取会话 id（去掉 "session:" 前缀，剩下的就是宿主快照里的 id）。 */
export function sessionIdOfRow(row) {
  const key = row?.getAttribute?.('data-row-key') ?? ''
  return key.startsWith(SESSION_KEY_PREFIX) ? key.slice(SESSION_KEY_PREFIX.length) : ''
}

/** 工作区标题行数量：用来判断宿主是否已经切到扁平（扁平下为 0）。 */
export function countWorkspaceRows(sidebar) {
  const root = sidebar ?? findSidebar()
  return root === null ? 0 : root.querySelectorAll(WORKSPACE_ROW_SELECTOR).length
}
