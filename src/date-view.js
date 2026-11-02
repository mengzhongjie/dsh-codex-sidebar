/**
 * date-view.js — 日期视图控制器。
 *
 * 行为：把宿主切到扁平分组，然后按「今天 / 昨天 / 星期X / 更早」重排所有会话座位，
 * 在段落之间插入标题；正在运行的会话强制进「今天」并排在前面；
 * 每一行补一个工作区标签（扁平后没有分组标题，靠标签回忆归属）。
 * 被屏蔽的工作区、未分组会话只隐藏不删除。退出时还原顺序、标签与分组方式。
 */
import { DATE_MODE_ATTR, OWN_ATTR } from './constants.js'
import { readSettings } from './settings.js'
import { labelsFor } from './locale.js'
import { findFlatList, findSidebar, collectSeats, rowOfSeat, sessionIdOfRow } from './sidebar-dom.js'

/** 一天的毫秒数。 */
const DAY_MS = 86400000

/** 工作区标签的类名（标记为自有节点，退出时统一删）。 */
const CHIP_CLASS = 'codex-sidebar-chip'

/** 把两个时间戳之间相差的「自然日」算出来（用 UTC 折算，避开夏令时 23/25 小时日）。 */
function daysBetween(then, now) {
  const from = new Date(then)
  const to = new Date(now)
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((b - a) / DAY_MS)
}

/** 某个会话属于哪个段落：返回文本与排序序号（0 = 今天）。 */
function bucketOf(updatedAt, now, copy) {
  const day = daysBetween(updatedAt, now)
  if (day <= 0) return { text: copy.today, rank: 0 }
  if (day === 1) return { text: copy.yesterday, rank: 1 }
  if (day < 7) return { text: copy.weekdays[new Date(updatedAt).getDay()], rank: day }
  return { text: copy.earlier, rank: 7 }
}

/** 建一个段落标题节点（属于本插件，带 OWN_ATTR 供观察者跳过）。 */
function createHeader(text) {
  const header = document.createElement('div')
  header.className = 'codex-sidebar-date-header'
  header.setAttribute(OWN_ATTR, '')
  header.textContent = text
  return header
}

export function createDateView({ hostData, viewStore, locale, refreshBell, prepareEnable, afterDisable }) {
  /** 日期视图是否开着。 */
  let active = false

  /** 进入日期视图前的分组方式（用于退出时还原）。 */
  let previousGroupBy = null

  /** 被隐藏的座位：退出时要还原 display。 */
  const hiddenSeats = new Set()

  /** 自建标题节点，退出时统一删除。 */
  const headers = new Set()

  /** 自建行内标签，退出时统一删除。 */
  const chips = new Set()

  /** 重排进行中的重入标记：我们的写入会触发观察者，不加锁会自激。 */
  let applying = false

  /** 合并多次触发的调度句柄。 */
  let frameHandle = 0

  /** 用词表：语言由调用方在 apply 时判定一次。 */
  const copy = labelsFor(locale)

  /** 是否处于日期视图。 */
  function isActive() {
    return active
  }

  /**
   * 给一行补上工作区标签。
   *
   * 文字插在时间与行操作按钮之间：扁平视图里没有分组标题，标签是唯一线索。
   * pointer-events: none（样式里控制），点击仍然穿透到宿主行。
   */
  function dressRow(row, workspace) {
    if (row === null) return
    let chip = row.querySelector(`:scope > .${CHIP_CLASS}`)
    if (chip === null) {
      chip = document.createElement('span')
      chip.className = CHIP_CLASS
      chip.setAttribute(OWN_ATTR, '')
      const actions = [...row.children].find(child => {
        const className = typeof child.className === 'string' ? child.className : ''
        return className.endsWith('_rowActions')
      })
      if (actions !== null && actions !== undefined) row.insertBefore(chip, actions)
      else row.appendChild(chip)
      chips.add(chip)
    }
    if (chip.textContent !== workspace) chip.textContent = workspace
  }

  /** 删掉所有行内标签。 */
  function stripChips() {
    for (const chip of chips) chip.remove()
    chips.clear()
  }

  /** 把座位按段落排好，插标题，写回列表。 */
  function arrange() {
    if (!active || applying) return
    const container = findFlatList(findSidebar())
    if (container === null) return

    applying = true
    try {
      const settings = readSettings()
      const skip = new Set(settings.skipWorkspaces)
      const titles = hostData.workspaceTitleBySession()
      const sessions = hostData.sessionSnapshot()
      const now = Date.now()

      // 1) 逐个座位判断：可见 / 隐藏，可见的带上时间、运行状态与段落。
      const visible = []
      const nextHidden = new Set()
      for (const seat of collectSeats(container)) {
        const row = rowOfSeat(seat)
        const sessionId = sessionIdOfRow(row)
        const workspace = titles.get(sessionId) ?? ''
        // 未分组会话、被屏蔽工作区：日期视图里不出现。
        if (sessionId === '' || workspace === '' || skip.has(workspace)) {
          nextHidden.add(seat)
          continue
        }
        const state = sessions.byId?.[sessionId]
        const updatedAt = state?.updatedAt
        const time = typeof updatedAt === 'number' ? updatedAt : 0
        const running = state?.running === true
        // 正在运行的会话算作今天：它的更新时间可能很久之前，但用户现在在看它。
        const bucket = running ? { text: copy.today, rank: 0 } : bucketOf(time, now, copy)
        seat.style.display = ''
        visible.push({ seat, row, time, running, bucket, workspace })
      }

      // 2) 上一轮隐藏、这一轮可见的座位要恢复；反过来要隐藏。
      for (const seat of hiddenSeats) {
        if (!nextHidden.has(seat)) seat.style.display = ''
      }
      for (const seat of nextHidden) seat.style.display = 'none'
      hiddenSeats.clear()
      for (const seat of nextHidden) hiddenSeats.add(seat)

      // 3) 排序：段落先后 → 运行中优先 → 更新时间从新到旧。
      visible.sort((left, right) =>
        left.bucket.rank - right.bucket.rank
        || Number(right.running) - Number(left.running)
        || right.time - left.time)

      // 4) 行内标签（与排序无关，先补好再排 DOM）。
      for (const item of visible) dressRow(item.row, item.workspace)

      // 5) 生成节点序列：段落变化处插标题。
      const nodes = []
      let lastText = null
      for (const item of visible) {
        if (item.bucket.text !== lastText) {
          nodes.push(createHeader(item.bucket.text))
          lastText = item.bucket.text
        }
        nodes.push(item.seat)
      }

      // 6) 顺序没变就不动 DOM（避免每次数据刷新都抖动）。
      const current = [...container.children]
      const sameOrder = current.length === nodes.length && nodes.every((node, index) => current[index] === node)
      if (sameOrder) {
        // 标题节点上一步可能被换成新节点，回收掉旧的。
        for (const header of [...headers]) {
          if (header.parentElement !== container) headers.delete(header)
        }
        for (const node of nodes) {
          if (node.getAttribute?.(OWN_ATTR) !== null) headers.add(node)
        }
        return
      }

      // 7) 清掉旧标题、按计划顺序重排：appendChild 对已有节点等价于移动。
      for (const header of headers) {
        if (header.parentElement === container) header.remove()
      }
      headers.clear()
      for (const node of nodes) container.appendChild(node)
      for (const node of nodes) {
        if (node.getAttribute?.(OWN_ATTR) !== null) headers.add(node)
      }
    } finally {
      applying = false
    }
  }

  /** 下一帧重排：数据变化、宿主重渲染都会短时间触发多次，合并成一次。 */
  function schedule() {
    if (!active || frameHandle !== 0) return
    frameHandle = window.requestAnimationFrame(() => {
      frameHandle = 0
      arrange()
    })
  }

  /** 进入日期视图。 */
  function enable() {
    if (active) return
    // 归档筛选开着时先不进：宿主在归档视图下会换掉整份列表，混排没有意义。
    if (viewStore.archivedFilter() !== 'default') return
    previousGroupBy = viewStore.groupBy()
    // 进入前先做准备：装了 dsh-claude-style 时，宿主的分组会被主题的 provider 抢回去，
    // 需要先给它一个「日期视图正开着」的信号（见 entry 里的借用逻辑）。
    prepareEnable?.()
    if (!viewStore.flatten()) {
      // 拿不到 store：把准备阶段留下的痕迹退掉。
      afterDisable?.()
      return
    }
    active = true
    document.body.setAttribute(DATE_MODE_ATTR, '')
    // 宿主切分组是异步渲染的，等两帧再排。
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => schedule()))
    refreshBell?.()
  }

  /** 退出日期视图：删除标题与标签、恢复显示与分组方式。 */
  function disable() {
    if (!active) return
    active = false
    document.body.removeAttribute(DATE_MODE_ATTR)
    for (const header of headers) header.remove()
    headers.clear()
    stripChips()
    for (const seat of hiddenSeats) seat.style.display = ''
    hiddenSeats.clear()
    viewStore.restore(previousGroupBy)
    viewStore.forgetBackup()
    previousGroupBy = null
    // 退出后归还借用：主题的那个标记该还回去了。
    afterDisable?.()
    refreshBell?.()
  }

  /** 切换。 */
  function toggle() {
    if (active) disable()
    else enable()
  }

  return { isActive, enable, disable, toggle, schedule, arrange }
}
