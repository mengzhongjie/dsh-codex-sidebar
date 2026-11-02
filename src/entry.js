/**
 * entry.js — dsh-codex-sidebar 的浏览器侧入口。
 *
 * 组装关系：
 *   宿主数据（sessions/workspaces 快照）+ 侧栏视图 store（分组方式）
 *     → 日期视图控制器（重排会话行、插日期标题）
 *     → 顶行铃铛（切换日期视图）+ 齿轮（打开官方设置页）
 *     → 官方设置页里的「侧栏设置」一页（注册进 settings.section 插槽）
 *
 * 与 dsh-claude-style 只有两种模式（见 coexist.js）：
 *   solo     页面没有主题：铃铛 + 齿轮全功能；
 *   dormant  页面有主题：只挂齿轮；不动列表、不碰主题的 DOM。
 * 模式在 reconcile() 里判定，设置变化、侧栏挂载、页面变动都会重新跑它。
 *
 * 整页缩放抄的是 dsh-claude-style 的做法（见 constants.js 的 ZOOM_* 注释）：
 * 属性 + 自定义属性 + 样式表规则，绝不写行内 body.style.zoom；主题在场时让位，
 * 由主题自己的 pageZoom 负责，两边不会同时给 body 上 zoom。
 */
import {
  PLUGIN_ID,
  LOG_PREFIX,
  BODY_ATTR,
  DATE_MODE_ATTR,
  ZOOM_ATTR,
  ZOOM_VAR,
  ZOOM_WIDTH_VAR,
  ZOOM_HEIGHT_VAR
} from './constants.js'
import { readSettings, writeSettings, subscribeSettings } from './settings.js'
import { createHostData } from './host-data.js'
import { resolveLocale, labelsFor, hostLocaleText } from './locale.js'
import { themePresent } from './coexist.js'
import { createViewStore } from './view-store.js'
import { createDateView } from './date-view.js'
import { createSettingsSection } from './settings-section.js'
import { openOfficialSettings } from './open-settings.js'
import { createTopbar } from './topbar.js'
import { mountStyles } from './styles.js'
import { findSidebar } from './sidebar-dom.js'

export const name = PLUGIN_ID

// 只声明 slots：设置页要注册进官方设置页的插槽，cordis 要求先声明 inject 才能读 ctx.slots。
// 其他宿主服务（sessions / workspaces）用 ctx.get() 只读访问，不占 inject 槽位。
export const inject = ['slots']

/**
 * 缩放时把「页面自身的尺寸」写成两个变量。
 *
 * 页面被 zoom 缩放后，vh/vw 会再乘一次倍率，宿主的弹层按视口单位封顶就会超出窗口；
 * 把窗口尺寸除以倍率写成 --codex-sidebar-page-width/height，样式表就能用它封顶。
 * （与 dsh-claude-style 的 shared/page-scale.ts 同一个算法。）
 */
function writePageSize(factor) {
  document.body.style.setProperty(ZOOM_WIDTH_VAR, `${Math.round(window.innerWidth / factor)}px`)
  document.body.style.setProperty(ZOOM_HEIGHT_VAR, `${Math.round(window.innerHeight / factor)}px`)
}

/**
 * 把缩放倍率写到页面上（抄 dsh-claude-style 的样式表缩放，不写行内 zoom）。
 *
 * @param zoom    倍率（1 表示 100%）
 * @param enabled false 时把三件套全部撤掉（有主题时由主题负责缩放）
 */
function applyZoom(zoom, enabled) {
  const body = document.body
  const factor = Math.round(zoom * 100) / 100
  if (!enabled || Math.abs(factor - 1) < 0.001) {
    body.removeAttribute(ZOOM_ATTR)
    body.style.removeProperty(ZOOM_VAR)
    body.style.removeProperty(ZOOM_WIDTH_VAR)
    body.style.removeProperty(ZOOM_HEIGHT_VAR)
    return
  }
  body.style.setProperty(ZOOM_VAR, String(factor))
  body.setAttribute(ZOOM_ATTR, String(factor))
  writePageSize(factor)
}

/**
 * 把设置界面注册进宿主官方设置页。
 *
 * 契约（settings.section，kind=list、scope=root）：
 *   ctx.slots.inject('settings.section', () => ctx.slots.register({ name, id, order, label }, Component))
 * id 必须自取：复用宿主 id 会顶掉它自己的页面。label 允许是 thunk，每次投影重读。
 * 注册失败只是少一页设置，不能影响侧栏本身，所以整段包在 try 里。
 */
function registerSettingsSection(ctx, { hostData, copy, disposers }) {
  const slots = ctx.slots ?? (typeof ctx.get === 'function' ? ctx.get('slots') : undefined)
  if (slots === undefined || slots === null || typeof slots.inject !== 'function' || typeof slots.register !== 'function') {
    console.warn(`${LOG_PREFIX} 宿主没有 slots 服务，跳过设置页注册`)
    return
  }
  const SettingsSection = createSettingsSection({ hostData, copy })
  try {
    const dispose = slots.inject('settings.section', () =>
      slots.register(
        {
          name: 'settings.section',
          // 自取 id：与内置页面并排，而不是替换它们。
          id: 'codex-sidebar',
          // 排在「Agent 预设」(20) 与 Claude Style(22) 之后。
          order: 24,
          label: () => copy.settingsTitle
        },
        SettingsSection
      )
    )
    if (typeof dispose === 'function') disposers.push(dispose)
  } catch (error) {
    console.warn(`${LOG_PREFIX} 注册设置页失败`, error)
  }
}

export function apply(ctx) {
  try {
    applyUnsafe(ctx)
  } catch (error) {
    // 启动失败时把真实错误打出来（宿主只会报「entry did not activate」）。
    console.error(`${LOG_PREFIX} 启动失败`, error)
  }
}

function applyUnsafe(ctx) {
  document.body.setAttribute(BODY_ATTR, '')

  const disposers = []
  disposers.push(mountStyles())

  // 界面语言只判定一次：段落标题、设置页、无主题时的按钮都跟着它走。
  const locale = resolveLocale(ctx)
  const copy = labelsFor(locale)

  const hostData = createHostData(ctx)
  const viewStore = createViewStore(ctx)

  /** 顶行动作区（延迟赋值：date-view 的回调要引用它刷新铃铛）。 */
  let topbar = null

  /** 当前模式：solo / dormant（null 表示还没判定）。 */
  let mode = null

  const dateView = createDateView({
    hostData,
    viewStore,
    locale,
    refreshBell: () => topbar?.refreshBell()
  })

  // 设置界面直接住进官方设置页，不再自己画浮层。
  registerSettingsSection(ctx, { hostData, copy, disposers })

  topbar = createTopbar({
    dateView,
    hostData,
    labels: { toggleDateView: copy.toggleDateView, sidebarSettings: copy.settingsTitle },
    onToggle: active => writeSettings({ dateViewEnabled: active }),
    // 齿轮：打开官方设置页并切到本插件那一页。
    openSettings: () => {
      openOfficialSettings(copy).catch(() => {
        // 宿主结构变了找不到入口：静默失败，别把用户的点击变成报错。
      })
    }
  })

  /** reconcile 重入保护：它内部会写设置，设置订阅又会回调它。 */
  let reconciling = false

  /** 应用模式带来的可见变化：只有日期视图开着时才需要铃铛。 */
  function setMode(next) {
    if (mode === next) return
    mode = next
    topbar?.setShowBell(next !== 'dormant')
  }

  /**
   * 启动自愈：上次进程被强杀时会留下扁平分组。
   * 只在「有我们的备份键」时才回滚，避免覆盖用户自己选的扁平分组。
   */
  function healLeftoverFlat() {
    const leftover = viewStore.leftoverBackup()
    if (leftover === null) return
    if (viewStore.groupBy() === 'flat') {
      viewStore.restore(leftover)
      console.log(`${LOG_PREFIX} 自愈：还原分组方式 ${leftover}`)
    }
    viewStore.forgetBackup()
  }

  /**
   * 统一判定：现在该用哪种模式、日期视图该开还是该关。
   *
   * 三条不变量：
   *   1. dormant 下绝不动列表（主题在自己的日期视图里搬座位，我们插手就会打架）；
   *   2. dormant 下用户的开关是意图但执行不了 —— 直接写回 false，避免切模式时突然生效；
   *   3. solo 下按用户的开关来。
   */
  function reconcile() {
    if (reconciling) return
    reconciling = true
    try {
      const settings = readSettings()
      const next = themePresent() ? 'dormant' : 'solo'
      setMode(next)
      // 有主题时缩放归主题的 pageZoom，我们一律撤掉自己的三件套。
      applyZoom(settings.zoom, next === 'solo')

      if (next === 'dormant') {
        if (dateView.isActive()) dateView.disable()
        if (settings.dateViewEnabled) writeSettings({ dateViewEnabled: false })
        return
      }

      if (settings.dateViewEnabled && !dateView.isActive()) dateView.enable()
      if (!settings.dateViewEnabled && dateView.isActive()) dateView.disable()
    } finally {
      reconciling = false
    }
  }

  /** 统一的一帧调度：挂顶行、重新判定模式、重排日期视图。 */
  let frameHandle = 0
  function schedule() {
    if (frameHandle !== 0) return
    frameHandle = window.requestAnimationFrame(() => {
      frameHandle = 0
      if (!dateView.isActive()) topbar.mount()
      reconcile()
      dateView.schedule()
    })
  }

  // 侧栏与列表都是宿主渲染的：监听整页变化，合并到一帧里处理。
  const observer = new MutationObserver(() => schedule())
  observer.observe(document.body, { childList: true, subtree: true })

  // 窗口尺寸变化：缩放中的页面尺寸变量要跟着重算。
  const onResize = () => {
    if (document.body.hasAttribute(ZOOM_ATTR)) writePageSize(readSettings().zoom)
  }
  window.addEventListener('resize', onResize)
  disposers.push(() => window.removeEventListener('resize', onResize))

  // 数据变化（会话更新、运行状态）也要重排与刷新小圆点。
  disposers.push(hostData.subscribe(() => {
    topbar?.refreshBell()
    dateView.schedule()
  }))

  // 设置变化：缩放立即生效，开关与共存模式交给 reconcile。
  disposers.push(subscribeSettings(settings => {
    reconcile()
    applyZoom(settings.zoom, mode === 'solo')
    dateView.schedule()
  }))

  // 等侧栏就绪后做第一次判定。
  const boot = window.setInterval(() => {
    if (findSidebar() === null) return
    window.clearInterval(boot)
    reconcile()
    // 自愈只在「我们自己会动分组」的模式下做：dormant 时分组是主题在管。
    if (mode !== 'dormant') healLeftoverFlat()
    topbar.mount()
    schedule()
  }, 200)

  // 卸载：把所有改动还原，宿主恢复到装插件之前的样子。
  ctx.effect(() => () => {
    window.clearInterval(boot)
    observer.disconnect()
    if (frameHandle !== 0) window.cancelAnimationFrame(frameHandle)
    dateView.disable()
    topbar.unmount()
    applyZoom(1, false)
    document.body.removeAttribute(BODY_ATTR)
    document.body.removeAttribute(DATE_MODE_ATTR)
    for (const dispose of disposers) {
      try {
        dispose()
      } catch {
        // 卸载期间单个清理失败不影响其他清理。
      }
    }
  })

  const hostLocale = hostLocaleText(ctx)
  console.log(`${LOG_PREFIX} applied (${locale}${hostLocale ? `, host ${hostLocale}` : ''})`)
}