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

/**
 * 取侧栏真正的布局盒子。
 *
 * 坑：[data-slot="sidebar"] 只是个 0×0 的挂点，量它的 getBoundingClientRect 永远是 0；
 * 真正的侧栏面板是它的第一个元素孩子（桌面 App 与 web 都是这样）。
 */
export function findSidebarBox(sidebar) {
  const root = sidebar ?? findSidebar()
  if (root === null) return null
  const box = root.firstElementChild
  if (box === null) return root
  return box.getBoundingClientRect().width > 0 ? box : root
}

/** 侧栏当前宽度（像素）：判断是展开的宽栏还是折叠成图标栏。 */
export function sidebarWidth(sidebar) {
  const box = findSidebarBox(sidebar)
  return box === null ? 0 : box.getBoundingClientRect().width
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

/** 品牌位的数据属性前缀（宽栏顶行里放品牌的那一格）。 */
const BRAND_SLOT_SELECTOR = '[data-slot^="sidebar.brand"]'

/**
 * 找顶行，以及「把动作区插在哪儿」。
 *
 * 两种宿主布局都要认：
 *   宽栏（web / 展开态）：一行里 [品牌, …, 折叠按钮] —— 动作区插在折叠按钮前，与原生的
 *     按钮挨在一起，折叠按钮仍是最后一个；
 *   桌面 App 原生皮肤：品牌自己占一行，折叠按钮单独占第一行 —— 这时动作区跟在折叠按钮
 *     后面（那一行只有它俩，插在前面的意义不大，跟在后面更像「同组按钮」）。
 *
 * 折叠成图标栏时不返回行：那里没有位置放多余按钮，等展开再挂。
 *
 * @returns {{ row: HTMLElement, toggle: HTMLElement|null, lonely: boolean } | null}
 *          lonely = 这一行只有折叠按钮一个孩子（App 原生皮肤的第一行）。
 */
export function findTopBar(sidebar) {
  const root = sidebar ?? findSidebar()
  if (root === null) return null
  const toggle = findToggle(root)
  const brandAnchor =
    root.querySelector(BRAND_SLOT_SELECTOR)?.parentElement ??
    root.querySelector('button[class*="brand"]')?.parentElement ??
    null
  // 优先用折叠按钮所在的行（它一定在侧栏里，且宽窄两种形态都有）。
  const row = toggle?.parentElement ?? brandAnchor
  if (row === null) return null
  const inRow = toggle !== null && toggle.parentElement === row
  return {
    row,
    toggle: inRow ? toggle : null,
    // 只含折叠按钮一个孩子的行：动作区跟在它后面，别插到前面。
    lonely: inRow && row.children.length <= 1
  }
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

/** 「搜索会话」按钮的 aria-label（中英文）。 */
const SEARCH_BUTTON_LABELS = ['search sessions', '搜索会话', '搜索']

/**
 * 找「工作区」那一行的动作组（搜索 / 视图选项 / 新建工作区三个图标所在的小容器）。
 *
 * 用户希望铃铛放在这一行（它本来就是列表的工具条，比顶行更贴合「操作这个列表」的语义）。
 * 定位方式：先找类名含 sectionHeader 的行，再找行里类名含 searchSlot 的容器；
 * 都不在就退回到「搜索按钮的父节点」。
 *
 * @returns {{ row: HTMLElement, slot: HTMLElement } | null}
 */
export function findWorkspaceBar(sidebar) {
  const root = sidebar ?? findSidebar()
  if (root === null) return null
  const headerRows = [...root.querySelectorAll('div')].filter(node =>
    typeof node.className === 'string' && node.className.includes('sectionHeader')
  )
  for (const row of headerRows) {
    // 首选 headerActions：这一行右侧真正的那组图标（视图选项 + 新建工作区），右对齐、不重叠。
    // 不要选 searchSlot：它和 headerActions 都贴在右侧，搜索框展开时会盖住对方，
    // 往它里面插节点会把搜索按钮和右组挤到一起（实测三组图标叠在 176/208/240 上）。
    const group = [...row.children].find(child =>
      typeof child.className === 'string' && child.className.includes('headerActions')
    )
    if (group !== undefined) return { row, slot: group }
    // 旧版宿主没有 headerActions 时，退回搜索框那一格，插在它最前面。
    const slot = [...row.children].find(child =>
      typeof child.className === 'string' && child.className.includes('searchSlot')
    )
    if (slot !== undefined) return { row, slot }
  }
  // 兜底：退回到「搜索按钮所在的行」，把它当作容器（同样插在最前面）。
  const wanted = SEARCH_BUTTON_LABELS
  const searchButton = [...root.querySelectorAll('button')].find(button =>
    button.getAttribute('data-codex-sidebar-owned') === null &&
    wanted.includes((button.getAttribute('aria-label') ?? '').toLowerCase())
  )
  if (searchButton?.parentElement) return { row: searchButton.parentElement, slot: searchButton.parentElement }
  return null
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
