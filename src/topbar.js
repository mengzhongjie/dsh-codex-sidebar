/**
 * topbar.js — 侧栏顶行的铃铛与设置按钮。
 *
 * 位置：宿主「工作区」那一行的图标组里（找不到才退回顶行）。
 * 只挂一颗铃铛（齿轮与设置页在 5788b88 取消，别再照着旧注释加回来）：
 *   · 无主题、或主题在但它的日期视图已被删掉时：切本插件自己的消息视图；
 *   · 主题在且自带日期视图时：委派给主题那颗铃铛（两套日期视图搬同一批行，只能有一套真在动）。
 * 折叠成图标栏（侧栏过窄）时不挂，展开后自动补上。
 */
import { BELL_ATTR, OWN_ATTR } from './constants.js'
import { findSidebar, findTopBar, findWorkspaceBar, sidebarWidth } from './sidebar-dom.js'

/** 侧栏窄于这个宽度就当作「折叠成图标栏」，不往顶行塞按钮。 */
const MIN_SIDEBAR_WIDTH = 140

/** 铃铛图标（描边风格，跟随 currentColor）。 */
const BELL_SVG = `<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.9 6.6a4.1 4.1 0 0 1 8.2 0c0 2 .5 3.2 1.1 4 .3.4 0 .9-.5.9H3.3c-.5 0-.8-.5-.5-.9.6-.8 1.1-2 1.1-4Z"/><path d="M6.4 13.2a1.8 1.8 0 0 0 3.2 0"/></svg>`


/** 建一个图标按钮。 */
function createIconButton(label, svg) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'codex-sidebar-icon-button'
  button.setAttribute('aria-label', label)
  button.setAttribute('title', label)
  button.setAttribute(OWN_ATTR, '')
  button.innerHTML = svg
  return button
}

/**
 * @param dateView   日期视图控制器
 * @param hostData   宿主数据（判断有没有会话在跑）
 * @param onToggle   铃铛切换后的回调（用于持久化开关）
 * @param getLabels  取按钮文案的函数（宿主语言可能晚就绪，每次用都重新问）
 * @param showBell   是否显示铃铛（默认显示；隐藏只用于临时调试）
 * @param onBellClick 外部接管铃铛点击：返回 true 表示已处理（有主题时委派给主题的铃铛）
 * @param bellPressed 按下态来源：默认读我们自己的日期视图，委派时读主题铃铛的 aria-pressed
 */
export function createTopbar({
  dateView,
  hostData,
  onToggle,
  onBellClick,
  bellPressed,
  getLabels,
  showBell = true
}) {
  /** 顶行动作区容器（挂上后一直复用）。 */
  let actions = null
  /** 铃铛节点：精简形态下为 null。 */
  let bell = null
  /** 铃铛旁的小绿点。 */
  let dot = null
  /** 当前是否要显示铃铛（设置变化时可能翻转，需要重建节点）。 */
  let bellWanted = showBell

  /** 铃铛旁的小绿点：有会话在跑就亮。 */
  function refreshBell() {
    if (bell === null) return
    // 按下态可能来自主题的铃铛（委派模式），所以让外部提供，默认才是我们自己的状态。
    const active = typeof bellPressed === 'function' ? bellPressed() === true : dateView.isActive()
    bell.setAttribute('aria-pressed', active ? 'true' : 'false')
    const running = hostData.hasRunningSession()
    if (running && dot === null) {
      dot = document.createElement('span')
      dot.className = 'codex-sidebar-dot'
      dot.setAttribute(OWN_ATTR, '')
      bell.appendChild(dot)
    } else if (!running && dot !== null) {
      dot.remove()
      dot = null
    }
  }

  /**
   * 稍后再刷一次按下态。
   *
   * 委派模式下，按下态来自主题那颗铃铛的 aria-pressed，而主题是 React 组件：
   * trigger.click() 只是派发了事件，真正的 DOM 属性要等它下一次提交才更新。
   * 在同一帧里 refreshBell() 读到的还是旧值（实测按下后图标仍是未按下色，
   * 用户因此觉得「按钮没反应」）。所以点完再补两帧 + 一个短定时器，覆盖 React 的提交时机。
   */
  function refreshBellSoon() {
    window.requestAnimationFrame(() => {
      refreshBell()
      window.requestAnimationFrame(refreshBell)
    })
    window.setTimeout(refreshBell, 90)
  }

  /** 造铃铛节点并接上事件。 */
  function createBell() {
    const button = createIconButton(getLabels().toggleDateView, BELL_SVG)

    // 拦截指针与鼠标按下/抬起事件：铃铛挂在宿主工作区行（sectionHeader）中，
    // 宿主行自身绑定了折叠/展开事件，不阻止冒泡会导致每次点铃铛时工作区整组被折叠或展开。
    const stopBubble = event => {
      event.stopPropagation()
    }
    button.addEventListener('pointerdown', stopBubble)
    button.addEventListener('mousedown', stopBubble)
    button.addEventListener('pointerup', stopBubble)
    button.addEventListener('mouseup', stopBubble)

    button.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      // 有主题时把这次点击交给主题自己的铃铛：它才是当前真正在动的日期视图。
      if (typeof onBellClick === 'function' && onBellClick() === true) {
        // 主题的按钮可能被我们藏起来了（display:none），改完状态要重新读一次按下态。
        // 它的状态是异步提交的，所以要等下一帧再读，见 refreshBellSoon。
        refreshBellSoon()
        return
      }
      dateView.toggle()
      // 记住这次选择：下次启动按上次的状态来。
      onToggle?.(dateView.isActive())
      refreshBell()
    })
    return button
  }

  /** 按当前模式显示或去掉铃铛。 */
  function applyBellVisibility() {
    if (actions === null) return
    if (bellWanted && bell === null) {
      bell = createBell()
      actions.insertBefore(bell, actions.firstElementChild)
      refreshBell()
    } else if (!bellWanted && bell !== null) {
      bell.remove()
      bell = null
      dot = null
    }
  }

  /** 切换铃铛显示（设置里改了共存模式时用）。 */
  function setShowBell(next) {
    bellWanted = next === true
    applyBellVisibility()
  }

  /** 按需挂载：侧栏出现、且是宽栏（不是图标栏）时才挂。 */
  function mount() {
    const sidebar = findSidebar()
    if (sidebar === null) return false
    // 折叠态侧栏很窄：这一行放不下额外的按钮，等展开后再挂。
    // 注意量的是侧栏面板本身，不是 [data-slot="sidebar"] 那个 0×0 的挂点（见 sidebar-dom.js）。
    if (sidebarWidth(sidebar) < MIN_SIDEBAR_WIDTH) {
      unmount()
      return false
    }
    // 首选「工作区」那一行的图标组：它是列表自己的工具条，铃铛放这里语义最顺，
    // 且这一行在日期视图下也还在。找不到才退回顶行（品牌/折叠按钮那一行）。
    const workspaceBar = findWorkspaceBar(sidebar)
    const bar = workspaceBar === null ? findTopBar(sidebar) : null
    const host = workspaceBar?.slot ?? bar?.row ?? null
    if (host === null) return false
    // 防呆：如果锚点落在我们自己的节点里面（上一次插错位置），就不要再往里套一层。
    // 曾经因为没有这道检查，每 200ms 的巡检都会把动作区插进上一次的动作区里，形成十几层嵌套。
    if (host.closest('[' + OWN_ATTR + ']') !== null) return false
    if (actions !== null && actions.parentElement === host) return true

    // 清掉历史残留：React 重渲染可能把旧动作区挪到别处，或者被重复创建过。
    for (const stale of document.querySelectorAll('.codex-sidebar-actions')) {
      if (stale !== actions) stale.remove()
    }
    if (actions === null) {
      actions = document.createElement('div')
      actions.className = 'codex-sidebar-actions'
      actions.setAttribute(OWN_ATTR, '')
    }
    // 顶行那份要靠右推（宿主那一行左边有品牌）；工作区行本身已靠右，不需要。
    actions.classList.toggle('codex-sidebar-actions-top', workspaceBar === null)

    actions.replaceChildren()

    if (workspaceBar !== null) {
      // 工作区行：排在宿主的图标组前面（标签 → 铃铛/齿轮 → 搜索 → 视图选项 → 新建工作区）。
      host.insertBefore(actions, host.firstElementChild)
    } else if (bar.lonely || bar.toggle === null) {
      // App 原生皮肤那种「第一行只有折叠按钮」的布局：跟在折叠按钮后面，凑成一组图标。
      host.appendChild(actions)
    } else {
      // 有品牌的宽栏：插在折叠按钮前，折叠按钮保持最后一个。
      host.insertBefore(actions, bar.toggle)
    }
    bell = null
    dot = null
    applyBellVisibility()
    refreshBell()
    // 告诉样式表「铃铛已经在场」：它据此藏掉主题那颗重复的铃铛（见 styles.js）。
    document.body.setAttribute(BELL_ATTR, '')
    return true
  }

  /** 语言变了：把两个按钮的 aria-label / title 换成新文案。 */
  function refreshLabels() {
    const next = getLabels()
    if (bell !== null) {
      bell.setAttribute('aria-label', next.toggleDateView)
      bell.setAttribute('title', next.toggleDateView)
    }
  }

  /** 卸载顶行动作区。 */
  function unmount() {
    actions?.remove()
    // 我们的铃铛撤了，主题那颗要放出来，否则侧栏上一个铃铛都不剩。
    document.body.removeAttribute(BELL_ATTR)
    actions = null
    bell = null
    dot = null
  }

  return { mount, unmount, refreshBell, refreshLabels, setShowBell }
}
