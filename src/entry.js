/**
 * entry.js — dsh-codex-sidebar 的浏览器侧入口。
 *
 * 组装关系：
 *   宿主数据（sessions/workspaces 快照）+ 侧栏视图 store（分组方式）
 *     → 日期视图控制器（重排会话行、插日期标题）
 *     → 顶行铃铛（切换日期视图）+ 齿轮（打开官方设置页）
 *     → 官方设置页里的「侧栏设置」一页（注册进 settings.section 插槽）
 *
 * 与 dsh-claude-style 共存有三种模式（见 coexist.js）：
 *   solo     原生宿主：铃铛 + 齿轮，全功能；
 *   dormant  装了主题、未接管：只挂齿轮，日期视图交给主题；
 *   takeover 装了主题、用户勾选接管：藏掉主题铃铛，由本插件提供日期视图。
 * 模式在 reconcile() 里统一判定，设置变化、侧栏挂载、主题状态变化都会重新跑它。
 */
import { PLUGIN_ID, LOG_PREFIX, BODY_ATTR, DATE_MODE_ATTR, TAKEOVER_ATTR, THEME_DATE_MODE_ATTR } from './constants.js'
import { readSettings, writeSettings, subscribeSettings } from './settings.js'
import { createHostData } from './host-data.js'
import { resolveLocale, labelsFor } from './locale.js'
import { coexistMode, themeDateViewActive, dismissThemeDateView } from './coexist.js'
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

/** 把缩放倍率应用到整页。 */
function applyZoom(zoom) {
  document.body.style.zoom = String(zoom)
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

  // 界面语言只判定一次：段落标题、设置面板、无主题时的按钮都跟着它走。
  const locale = resolveLocale(ctx)
  const copy = labelsFor(locale)

  const hostData = createHostData(ctx)
  const viewStore = createViewStore(ctx)

  /** 顶行动作区（延迟赋值：date-view 的回调要引用它刷新铃铛）。 */
  let topbar = null

  /** 当前共存模式：solo / dormant / takeover（null 表示还没判定）。 */
  let mode = null
  /** 接管模式下，body 上的主题日期标记是不是我们借来用的（退出时要还）。 */
  let themeMarkerLoaned = false

  /**
   * 借用主题的「日期视图开着」标记。
   *
   * 为什么需要：dsh-claude-style 把侧栏工作区列表换成了自己的 provider，它会盯着宿主的
   * 分组状态；看到 flat 就认为是我们以外的某处写的，立刻改回工作区分组。它只在 body 上
   * 有 data-dsh-claude-date-groups 时才放手 —— 那是它自己日期视图开着的信号。
   * 我们接管时借用这个标记，flatten 才能站住；退出时原样还回去。
   */
  function ensureThemeMarkerLoan() {
    if (themeMarkerLoaned || document.body.hasAttribute(THEME_DATE_MODE_ATTR)) return
    document.body.setAttribute(THEME_DATE_MODE_ATTR, '')
    themeMarkerLoaned = true
  }

  /** 归还借用（只在确实是我们加的标记时才删）。 */
  function releaseThemeMarkerLoan() {
    if (!themeMarkerLoaned) return
    document.body.removeAttribute(THEME_DATE_MODE_ATTR)
    themeMarkerLoaned = false
  }

  const dateView = createDateView({
    hostData,
    viewStore,
    locale,
    refreshBell: () => topbar?.refreshBell(),
    // 只有接管模式才需要借用主题标记；原生宿主上没有主题，不必碰。
    prepareEnable: () => {
      if (mode === 'takeover') ensureThemeMarkerLoan()
    },
    afterDisable: () => releaseThemeMarkerLoan()
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

  // 缩放：启动时恢复上次的倍率。
  applyZoom(readSettings().zoom)

  /** reconcile 重入保护：它内部会写设置，设置订阅又会回调它。 */
  let reconciling = false
  /** 让主题退出日期视图后，延时进入我们自己的（避免两边同一帧里抢同一批座位）。 */
  let takeoverTimer = 0

  /** 应用模式带来的可见变化：接管标记（CSS 藏主题铃铛）与铃铛显隐。 */
  function setMode(next) {
    if (mode === next) return
    mode = next
    if (next === 'takeover') document.body.setAttribute(TAKEOVER_ATTR, '')
    else {
      document.body.removeAttribute(TAKEOVER_ATTR)
      // 不再是接管模式：借来的主题标记立刻还回去，别把主题的界面留在日期模式。
      releaseThemeMarkerLoan()
    }
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
   *   2. takeover 下主题的日期视图必须先退出，再进我们的；
   *   3. 用户的开关（dateViewEnabled）是意图，但 dormant 下无法执行——直接写回 false。
   */
  function reconcile() {
    if (reconciling) return
    reconciling = true
    try {
      const settings = readSettings()
      const next = coexistMode(settings.takeoverWithTheme)
      setMode(next)

      if (next === 'dormant') {
        if (dateView.isActive()) dateView.disable()
        // 主题负责日期视图：把我们的开关归零，避免下次切模式时突然接管。
        if (settings.dateViewEnabled) writeSettings({ dateViewEnabled: false })
        return
      }

      // 接管模式：主题若正开着它的日期视图（标记不是我们借的），先让它退出（等价用户手点它的铃铛）。
      if (next === 'takeover' && !themeMarkerLoaned && themeDateViewActive()) {
        if (dismissThemeDateView()) {
          if (takeoverTimer !== 0) window.clearTimeout(takeoverTimer)
          takeoverTimer = window.setTimeout(() => {
            takeoverTimer = 0
            reconcile()
          }, 320)
          return
        }
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

  // 数据变化（会话更新、运行状态）也要重排与刷新小圆点。
  disposers.push(hostData.subscribe(() => {
    topbar?.refreshBell()
    dateView.schedule()
  }))

  // 设置变化：缩放立即生效，开关与共存模式交给 reconcile。
  disposers.push(subscribeSettings(settings => {
    applyZoom(settings.zoom)
    reconcile()
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
    if (takeoverTimer !== 0) window.clearTimeout(takeoverTimer)
    observer.disconnect()
    if (frameHandle !== 0) window.cancelAnimationFrame(frameHandle)
    dateView.disable()
    topbar.unmount()
    document.body.style.zoom = ''
    document.body.removeAttribute(BODY_ATTR)
    document.body.removeAttribute(DATE_MODE_ATTR)
    document.body.removeAttribute(TAKEOVER_ATTR)
    for (const dispose of disposers) {
      try {
        dispose()
      } catch {
        // 卸载期间单个清理失败不影响其他清理。
      }
    }
  })

  console.log(`${LOG_PREFIX} applied (${locale})`)
}
