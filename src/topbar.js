/**
 * topbar.js — 侧栏顶行的铃铛与设置按钮。
 *
 * 位置：插在宿主顶行（品牌按钮与折叠按钮同在的那一行）里，紧贴折叠按钮左侧。
 * 两种形态：
 *   - 完整形态：铃铛 + 齿轮（原生宿主，或用户让本插件接管）；
 *   - 精简形态：只有齿轮（装了 dsh-claude-style 但由主题负责日期视图时）。
 * 折叠成图标栏时那一行里没有品牌按钮，此时不挂（避免挤坏布局）。
 */
import { OWN_ATTR } from './constants.js'
import { findLogoRow, findSidebar, findToggle } from './sidebar-dom.js'

/** 铃铛图标（描边风格，跟随 currentColor）。 */
const BELL_SVG = `<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.9 6.6a4.1 4.1 0 0 1 8.2 0c0 2 .5 3.2 1.1 4 .3.4 0 .9-.5.9H3.3c-.5 0-.8-.5-.5-.9.6-.8 1.1-2 1.1-4Z"/><path d="M6.4 13.2a1.8 1.8 0 0 0 3.2 0"/></svg>`

/** 齿轮图标。 */
const GEAR_SVG = `<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="1.9"/><path d="M8 1.9v1.6M8 12.5v1.6M2.6 8h1.5M11.9 8h1.5M3.9 3.9l1.1 1.1M11 11l1.1 1.1M12.1 3.9 11 5M5 11l-1.1 1.1"/></svg>`

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
 * @param openSettings 齿轮点击
 * @param labels     按钮文案（中文/英文）
 * @param showBell   是否显示铃铛（主题接管时只留齿轮）
 */
export function createTopbar({ dateView, openSettings, hostData, onToggle, labels, showBell = true }) {
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
    bell.setAttribute('aria-pressed', dateView.isActive() ? 'true' : 'false')
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

  /** 造铃铛节点并接上事件。 */
  function createBell() {
    const button = createIconButton(labels.toggleDateView, BELL_SVG)
    button.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      dateView.toggle()
      // 记住这次选择：下次启动按上次的状态来。
      onToggle?.(dateView.isActive())
      refreshBell()
    })
    return button
  }

  /** 按当前模式显示或去掉铃铛（齿轮始终在）。 */
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

  /** 按需挂载：侧栏出现、且是宽栏（有品牌按钮）时才挂。 */
  function mount() {
    const sidebar = findSidebar()
    if (sidebar === null) return false
    const logoRow = findLogoRow(sidebar)
    const toggle = findToggle(sidebar)
    if (logoRow === null || toggle === null) return false
    // 折叠态没有品牌按钮：此时不挂，等展开后再挂。
    const brand = logoRow.querySelector('button[class*="brand"]')
    if (brand === null) {
      unmount()
      return false
    }
    if (actions !== null && actions.parentElement === logoRow) return true

    actions = document.createElement('div')
    actions.className = 'codex-sidebar-actions'
    actions.setAttribute(OWN_ATTR, '')

    const gear = createIconButton(labels.sidebarSettings, GEAR_SVG)
    gear.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      openSettings()
    })
    actions.append(gear)

    logoRow.insertBefore(actions, toggle)
    bell = null
    dot = null
    applyBellVisibility()
    refreshBell()
    return true
  }

  /** 卸载顶行动作区。 */
  function unmount() {
    actions?.remove()
    actions = null
    bell = null
    dot = null
  }

  return { mount, unmount, refreshBell, setShowBell }
}
