/**
 * date-view.js — 日期视图控制器。
 *
 * 行为：把宿主切到扁平分组，然后按「今天 / 昨天 / 星期X / 更早」重排所有会话座位，
 * 在段落之间插入标题；正在运行的会话强制进「今天」并排在前面；
 * 每一行补一个工作区标签（扁平后没有分组标题，靠标签回忆归属）。
 * 被屏蔽的工作区、未分组会话只隐藏不删除。退出时还原顺序、标签与分组方式。
 */
import { DATE_MODE_ATTR, OWN_ATTR, MARQUEE_CLASS, MAIN_SESSION_CLASS } from './constants.js'
import { labelsFor } from './locale.js'
import { findFlatList, findSidebar, collectSeats, rowOfSeat, sessionIdOfRow } from './sidebar-dom.js'

/** 一天的毫秒数。 */
const DAY_MS = 86400000

/** 工作区标签的类名（标记为自有节点，退出时统一删）。 */
const CHIP_CLASS = 'codex-sidebar-chip'

/** 最新消息预览的类名（Codex 风格两行式会话行的第二行）。 */
const PREVIEW_CLASS = 'codex-sidebar-preview'

/**
 * 滑动窗口右侧留的空隙。
 *
 * 滑到终点时最后一个字不该贴着行尾，留 10px 让「到头了」看得出来；
 * 这个值同时写进样式表的 padding-right，量宽度时要一起减掉。
 */
const MARQUEE_TAIL_ROOM = 10

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

/**
 * superagent 是否真的装在这个宿主里。
 *
 * 只有它的状态路由至少成功回过一次，才说明 worker-/orchestrator- 这些 id 真是它的内部会话、
 * 行也被它自己藏起来了，我们跳过才算让位。没装 superagent 的宿主里，这些 id 只是普通
 * 会话，行没人藏；再跳过就会让它们可见却不进任何日期段落（实测有 20 行悬在列表最前）。
 */
function superagentAvailable(superagent) {
  if (superagent === null || superagent === undefined) return false
  return superagent.available?.() === true
}

/** 建一个段落标题节点（属于本插件，带 OWN_ATTR 供观察者跳过）。 */
function createHeader(text) {
  const header = document.createElement('div')
  header.className = 'codex-sidebar-date-header'
  header.setAttribute(OWN_ATTR, '')
  header.textContent = text
  return header
}

export function createDateView({ hostData, viewStore, locale, refreshBell, prepareEnable, afterDisable, superagent }) {
  /**
   * 取当前用词表。
   *
   * locale 既可以是语言串，也可以是一个函数：宿主的语言可能比插件晚就绪，
   * 由调用方每次重排时重新问一遍（见 locale.js 的 createLocale）。
   */
  const readCopy = () => labelsFor(typeof locale === 'function' ? locale() : locale)
  /** 日期视图是否开着。 */
  let active = false

  /** 进入日期视图前的分组方式（用于退出时还原）。 */
  let previousGroupBy = null

  /** 被隐藏的座位：退出时要还原 display。 */
  const hiddenSeats = new Set()
  /**
   * 我们替 superagent 藏起来的座位（它自己的 worker-/orchestrator- 会话）。
   * 对面正常时会把行内 display 写成 none，我们只需绕开；只有它还没动手时我们才自己藏，
   * 这些行记在这里，退出消息视图时只还原我们改过的，不去动对面藏好的行。
   */
  const leashedSeats = new Set()

  /**
   * 挂上主会话标记的座位。
   *
   * 这些行的行内 display 由 superagent 写成 none，可见性来自样式表的 !important 规则，
   * 退出时只要摘掉类就行，不要动行内 display —— 一动手就成了「谁先写谁后写」的争抢。
   */
  const mainSeats = new Set()

  /** 自建标题节点，退出时统一删除。 */
  const headers = new Set()

  /** 自建行内标签，退出时统一删除。 */
  const chips = new Set()

  /** 自建的最新消息预览行，退出时统一删除。 */
  const previews = new Set()

  /** 重排进行中的重入标记：我们的写入会触发观察者，不加锁会自激。 */
  let applying = false

  /** 合并多次触发的调度句柄。 */
  let frameHandle = 0

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

  /**
   * 给一行补上「最新一条消息」的预览。
   *
   * Codex 的消息视图是两行式：第一行标题 + 工作区，第二行是这段对话最后说的话。
   * 宿主行本身是单行 flex，样式表把行改成可换行、预览独占一行（flex-basis: 100%）。
   * text 为空（这个会话还没有消息）时连节点一起撤掉，别留空行。
   */
  function dressPreview(row, text) {
    if (row === null) return
    const existing = row.querySelector(':scope > .' + PREVIEW_CLASS)
    if (text === '') {
      if (existing !== null) {
        previews.delete(existing)
        existing.remove()
      }
      return
    }
    if (existing !== null) {
      if (existing.textContent !== text) existing.textContent = text
      return
    }
    const preview = document.createElement('span')
    preview.className = PREVIEW_CLASS
    preview.setAttribute(OWN_ATTR, '')
    preview.textContent = text
    row.appendChild(preview)
    previews.add(preview)
  }

  /** 删掉所有预览行（退出日期视图时）。 */
  function stripPreviews() {
    for (const preview of previews) preview.remove()
    previews.clear()
  }

  /**
   * 行标题节点。
   *
   * 宿主行结构是 [图标槽 _slot, 标题 _title, 时间 _time, 我们的标签, 操作组 _rowActions]，
   * 直接取第一个孩子会拿到 16px 的图标槽（宽度恒定 → 永远不需要滑动），
   * 所以优先认宿主的 _title 类名，认不到再按排除法兜底。
   */
  function titleNodeOf(row) {
    const explicit = row.querySelector('[class*="_title"]')
    if (explicit !== null) return explicit
    for (const child of row.children) {
      const className = typeof child.className === 'string' ? child.className : ''
      if (className === CHIP_CLASS) continue
      if (className.includes('_time') || className.includes('_slot') || className.endsWith('_rowActions')) continue
      return child
    }
    return null
  }

  /**
   * 标题滑动的运行态：一个标题只留一条动画。
   *
   * 用 WeakMap 记录每个标题的动画或排队状态，同时用 activeTitles 记录活跃节点，
   * 退出日期视图或卸载时能干净地还原所有滑动中的标题。
   */
  const marquees = new WeakMap()
  const activeTitles = new Set()

  /** 彻底还原并清理某个标题节点的横向滑动状态。 */
  function cleanupTitleMarquee(title) {
    if (title === null || title === undefined) return
    const state = marquees.get(title)
    if (state === undefined) return
    marquees.delete(title)
    activeTitles.delete(title)
    if (state.pending) {
      if (state.frame1) cancelAnimationFrame(state.frame1)
      if (state.frame2) cancelAnimationFrame(state.frame2)
    } else if (state.frame) {
      cancelAnimationFrame(state.frame)
    }
    const track = state.track
    if (track && track.parentNode === title) {
      while (track.firstChild !== null) title.insertBefore(track.firstChild, track)
      track.remove()
    }
    // 兜底清理可能遗留的任何 track 节点（防止嵌套残留）
    for (const staleTrack of title.querySelectorAll('.codex-sidebar-marquee-track')) {
      while (staleTrack.firstChild !== null) title.insertBefore(staleTrack.firstChild, staleTrack)
      staleTrack.remove()
    }
    title.classList.remove(MARQUEE_CLASS)
  }

  /**
   * 悬停到行上：窗口固定（圆点之后到行尾），标题文字在这个窗口里向左挪。
   *
   * 做法是给文本套一层内层轨道再平移轨道，而不是平移标题本身、也不是滚 scrollLeft：
   *   - 平移标题会把裁剪窗一起推走，左边缘跑到侧栏外面；
   *   - 滚 scrollLeft 会让标题变成可滚动元素，行上能滚出横向滚动条（用户明确不要）。
   * 轨道是行内的 inline-block，宽度就是文字宽度，裁剪仍然由标题的 overflow 负责。
   * 先等两帧再量：悬停时工作区小字才隐藏、标题才拿到整行宽度，当场量会量到旧宽度。
   */
  function startMarquee(row) {
    const title = titleNodeOf(row)
    if (title === null) return
    if (marquees.has(title)) return
    // 生成本次排队的唯一凭证：鼠标快速扫过列表时，若在两帧延迟内已经移出，
    // 回调能依据凭证立即终止，绝不在鼠标离开后错误启动动画导致文字永久偏位。
    const token = Symbol('marquee')
    const queueState = { token, pending: true, frame1: 0, frame2: 0, track: null }
    marquees.set(title, queueState)
    activeTitles.add(title)

    queueState.frame1 = requestAnimationFrame(() => {
      queueState.frame2 = requestAnimationFrame(() => {
        const current = marquees.get(title)
        // 关键防御：若在排队等待期间已触发 mouseout（状态被清除或替换），立即退出
        if (!current || current.token !== token) return
        if (!title.isConnected) {
          marquees.delete(title)
          activeTitles.delete(title)
          return
        }
        // 先清理可能存在的旧 track（防止异常嵌套）
        for (const staleTrack of title.querySelectorAll('.codex-sidebar-marquee-track')) {
          while (staleTrack.firstChild !== null) title.insertBefore(staleTrack.firstChild, staleTrack)
          staleTrack.remove()
        }
        title.classList.add(MARQUEE_CLASS)
        const track = document.createElement('span')
        track.className = 'codex-sidebar-marquee-track'
        track.setAttribute(OWN_ATTR, '')
        while (title.firstChild !== null) track.appendChild(title.firstChild)
        title.appendChild(track)
        const windowWidth = title.clientWidth - MARQUEE_TAIL_ROOM
        const distance = track.getBoundingClientRect().width - windowWidth
        if (distance <= 4) {
          // 放得下就不动：把节点还回去，别留一层没用的包装。
          while (track.firstChild !== null) title.insertBefore(track.firstChild, track)
          track.remove()
          title.classList.remove(MARQUEE_CLASS)
          marquees.delete(title)
          activeTitles.delete(title)
          return
        }
        // 慢起步：位移越大走得越久，最长 3.2s；短距离也不低于 1.1s，否则像闪一下。
        const duration = Math.min(3200, Math.max(1100, (distance / 55) * 1000))
        const animState = { token, pending: false, frame: 0, start: 0, track }
        marquees.set(title, animState)
        const step = now => {
          if (marquees.get(title) !== animState) return
          if (animState.start === 0) animState.start = now
          const progress = Math.min(1, (now - animState.start) / duration)
          // easeInOutSine：两头都慢，起步不会「嗖」一下冲出去。
          const eased = -(Math.cos(Math.PI * progress) - 1) / 2
          track.style.transform = `translateX(${(-distance * eased).toFixed(2)}px)`
          if (progress < 1) animState.frame = requestAnimationFrame(step)
        }
        animState.frame = requestAnimationFrame(step)
      })
    })
  }

  /** 离开行：停掉动画，把文字从轨道里搬回标题，去掉包装与裁剪标记。 */
  function stopMarquee(row) {
    const title = titleNodeOf(row)
    if (title === null) return
    cleanupTitleMarquee(title)
  }

  /** 悬停事件交给 document 代理：座位会被宿主重建，逐个绑定留不住。 */
  function onPointerOver(event) {
    if (!active || !(event.target instanceof Element)) return
    const row = event.target.closest('[data-row-key^="session:"]')
    if (row === null) return
    startMarquee(row)
  }

  function onPointerOut(event) {
    if (!(event.target instanceof Element)) return
    const row = event.target.closest('[data-row-key^="session:"]')
    if (row === null) return
    // 在行内从标题挪到预览、再挪到标签，都会来一对 out/over：
    // 只要指针还留在这一行里就不算离开，否则滑动刚起步就被自己掐掉。
    const next = event.relatedTarget
    if (next instanceof Node && row.contains(next)) return
    stopMarquee(row)
  }

  document.addEventListener('mouseover', onPointerOver, true)
  document.addEventListener('mouseout', onPointerOut, true)

  /** 停止并还原所有标题的横向滑动动画与 DOM 包装。 */
  function stopAllMarquees() {
    for (const title of [...activeTitles]) {
      cleanupTitleMarquee(title)
    }
    activeTitles.clear()
  }

  /** 卸载时撤掉悬停代理与所有滑动动画（entry 的 effect 会调用）。 */
  function dispose() {
    stopAllMarquees()
    document.removeEventListener('mouseover', onPointerOver, true)
    document.removeEventListener('mouseout', onPointerOut, true)
  }

  /** 删掉所有行内标签。 */
  function stripChips() {
    for (const chip of chips) chip.remove()
    chips.clear()
  }

  /** 把座位按段落排好，插标题，写回列表。 */
  function arrange() {
    if (!active || applying) return
    // 若用户在宿主中切换到了归档筛选视图，不混排归档会话
    if (viewStore.archivedFilter() !== 'default') return
    const container = findFlatList(findSidebar())
    if (container === null) return

    applying = true
    try {
      const copy = readCopy()
      // 问一次 superagent 的主会话 id（有缓存，查不到就是空集，不影响正常宿主）。
      superagent?.ensure()
      const masters = superagent?.ids() ?? new Set()
      const titles = hostData.workspaceTitleBySession()
      const sessions = hostData.sessionSnapshot()
      const now = Date.now()

      // 1) 逐个座位判断：可见 / 隐藏，可见的带上时间、运行状态与段落。
      const visible = []
      const nextHidden = new Set()
      for (const seat of collectSeats(container)) {
        const row = rowOfSeat(seat)
        const sessionId = sessionIdOfRow(row)
        // 未分组的会话也要进列表（消息视图对所有工作区与未分组开放），标签用「未分组」。
        const workspace = titles.get(sessionId) ?? copy.ungrouped
        // 未分组会话、被屏蔽工作区：日期视图里不出现。
        // 认不出会话 id 的座位（理论上没有）直接跳过，别把它塞进段落里。
        if (sessionId === '') {
          nextHidden.add(seat)
          continue
        }
        const state = sessions.byId?.[sessionId]
        const updatedAt = state?.updatedAt
        const createdAt = state?.createdAt
        // 优先使用更新时间；会话新建尚无更新时间时回退使用创建时间；快照未同步时以当前时间计，保证新会话始终排在「优先级/今天」最前
        const time = typeof updatedAt === 'number' && updatedAt > 0
          ? updatedAt
          : (typeof createdAt === 'number' && createdAt > 0 ? createdAt : now)
        const running = state?.running === true
        const isMain = masters.has(sessionId)
        // superagent 自己的会话默认不进消息视图：worker- 是工单执行者，其它 orchestrator-
        // 是评估跑批，都是它的内部事务；只有主会话要露出来（否则拍平后它连入口都没有）。
        // 这里不改它们的 display：对面已经写成 none，我们不去改写，免得两边互激。
        // 但只有确认这个宿主里装了 superagent（available）才让位：没装的环境里这些 id
        // 只是普通会话，行也没人藏，跳过它们会让这些行永远不进段落（实测 20 行悬在最前）。
        if (superagentAvailable(superagent) && !isMain && superagent !== null && superagent !== undefined && superagent.isOwnSessionId(sessionId)) {
          // 对面通常已经把这行藏好了；万一还没（刚装好、还没轮询到），我们自己藏一下并记账，
          // 否则它会可见却又不进任何日期段落，永远悬在列表最前面。
          if (seat.style.display !== 'none') {
            seat.style.display = 'none'
            leashedSeats.add(seat)
          }
          continue
        }
        // 主会话固定进「优先级」段落并排在最前：它是这个工作区的对话入口，不该按时间沉下去。
        const bucket = isMain ? { text: copy.today, rank: 0 } : (running ? { text: copy.today, rank: 0 } : bucketOf(time, now, copy))
        if (isMain) {
          // 类要挂在真正带 data-row-key 的那一行上：座位只是它的外壳，
          // 样式表的 [data-row-key^="session:"] 规则命中不了外壳（实测主会话因此一直不见）。
          seat.classList.add(MAIN_SESSION_CLASS)
          row?.classList.add(MAIN_SESSION_CLASS)
          mainSeats.add(seat)
        } else {
          seat.classList.remove(MAIN_SESSION_CLASS)
          row?.classList.remove(MAIN_SESSION_CLASS)
          if (seat.style.display !== '') seat.style.display = ''
          // 这一轮它又走正常流程了（比如对面没装/刚卸载），不再需要我们替它藏。
          leashedSeats.delete(seat)
        }
        visible.push({ seat, row, sessionId, time, running, isMain, bucket, workspace })
      }

      // 2) 上一轮隐藏、这一轮可见的座位要恢复；反过来要隐藏。
      for (const seat of hiddenSeats) {
        if (!nextHidden.has(seat) && seat.style.display !== '') seat.style.display = ''
      }
      for (const seat of nextHidden) {
        if (seat.style.display !== 'none') seat.style.display = 'none'
      }
      hiddenSeats.clear()
      for (const seat of nextHidden) hiddenSeats.add(seat)

      // 3) 排序：段落先后 → 运行中优先 → 更新时间从新到旧。
      visible.sort((left, right) =>
        left.bucket.rank - right.bucket.rank
        || Number(right.isMain) - Number(left.isMain)
        || Number(right.running) - Number(left.running)
        || right.time - left.time)

      // 4) 行内标签与最新消息预览（与排序无关，先补好再排 DOM）。
      //    预览文案来自会话投影里的最后一轮，宿主已经同步到客户端，不用额外请求。
      const previewTexts = hostData.previewBySession()
      for (const item of visible) {
        dressRow(item.row, item.isMain ? copy.mainSession : item.workspace)
        dressPreview(item.row, previewTexts.get(item.sessionId) ?? '')
      }

      // 5) 生成节点序列：段落变化处插标题。
      //    标题节点必须复用上一轮的同名节点：每轮都新建的话，下面的「顺序没变」判定永远是 false，
      //    于是每帧都删标题 + 重排全部座位 → 观察者再次触发 → 自激（实测每秒上千次 DOM 变动，
      //    表现就是鼠标扫过会话行时整行轻微抖动）。
      const spareHeaders = new Map()
      for (const header of headers) {
        const text = header.textContent ?? ''
        if (!spareHeaders.has(text)) spareHeaders.set(text, header)
      }
      const nodes = []
      let lastText = null
      for (const item of visible) {
        if (item.bucket.text !== lastText) {
          const header = spareHeaders.get(item.bucket.text) ?? createHeader(item.bucket.text)
          nodes.push(header)
          lastText = item.bucket.text
        }
        nodes.push(item.seat)
      }

      // 6) 只比较「我们这套节点」的相对顺序。
      //    容器里还留着被隐藏的座位（display:none，不删是为了让宿主自己的状态不丢），
      //    直接拿 container.children 和 nodes 逐位比会永远不相等，于是每帧都重排一遍
      //    ——这正是鼠标扫过会话行时整行轻微抖动的来源。
      const wanted = new Set(nodes)
      const present = [...container.children].filter(child => wanted.has(child))
      const inOrder = present.length === nodes.length && present.every((child, index) => child === nodes[index])

      // 7) 标题集合对齐到这串节点（复用的节点留在集合里，落单的回收）。
      headers.clear()
      for (const node of nodes) {
        if (node.getAttribute?.(OWN_ATTR) !== null) headers.add(node)
      }
      // 清理上一轮存在但本轮不再需要的旧段落标题（例如更早段落会话被清空），避免在 DOM 产生永久孤儿标题
      for (const [, header] of spareHeaders) {
        if (!headers.has(header)) {
          header.remove()
        }
      }
      // 定期剔除已经不在文档中的断开连接节点，防止长期运行内存泄漏
      for (const chip of chips) {
        if (!chip.isConnected) chips.delete(chip)
      }
      for (const preview of previews) {
        if (!preview.isConnected) previews.delete(preview)
      }
      if (inOrder) return

      // 8) 顺序不对才动 DOM：appendChild 对已有节点等价于移动，按顺序 append 一遍即可，
      //    标题不必删除重建（删了再插会让宿主以为列表结构变了，整片行重渲染）。
      for (const node of nodes) container.appendChild(node)
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
    // 标记必须先于扁平化落到 body 上：皮肤监听宿主 store，看到扁平会当成残留改回分组，
    // 它读到的第一个信号决定这一趟是让位还是抢回去。
    document.body.setAttribute(DATE_MODE_ATTR, '')
    if (!viewStore.flatten()) {
      // 拿不到 store：把准备阶段、备份与标记一起退掉。
      document.body.removeAttribute(DATE_MODE_ATTR)
      previousGroupBy = null
      afterDisable?.()
      return
    }
    active = true
    // 宿主切分组是异步渲染的，等两帧再排。
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => schedule()))
    refreshBell?.()
  }

  /** 退出日期视图：删除标题与标签、恢复显示与分组方式。 */
  function disable() {
    if (!active) return
    active = false
    document.body.removeAttribute(DATE_MODE_ATTR)
    // 停止并清理所有正在跑的标题横向滑动，还原文字节点
    stopAllMarquees()
    for (const header of headers) header.remove()
    headers.clear()
    stripChips()
    stripPreviews()
    for (const seat of mainSeats) {
      seat.classList.remove(MAIN_SESSION_CLASS)
      rowOfSeat(seat)?.classList.remove(MAIN_SESSION_CLASS)
    }
    mainSeats.clear()
    for (const seat of hiddenSeats) seat.style.display = ''
    hiddenSeats.clear()
    for (const seat of leashedSeats) seat.style.display = ''
    leashedSeats.clear()
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

  return { isActive, enable, disable, toggle, schedule, arrange, dispose }
}
