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
 * 缩放走 zoom.js：桌面 App 优先用宿主半边的窗口级 page zoom（better-sidebar 的
 * 面板才会跟着一起放大），网页版退回页面 CSS；主题在场时仍让位给主题的 pageZoom。
 */
import { PLUGIN_ID, LOG_PREFIX, BODY_ATTR, DATE_MODE_ATTR, OWN_ATTR } from './constants.js'
import { readSettings, writeSettings, subscribeSettings } from './settings.js'
import { createHostData } from './host-data.js'
import { createLocale } from './locale.js'
import { themePresent, themeDateTrigger } from './coexist.js'
import { createZoom } from './zoom.js'
import { createPortalFit } from './portal-fit.js'
import { createViewStore } from './view-store.js'
import { createDateView } from './date-view.js'
import { createSettingsSection } from './settings-section.js'
import { createTopbar } from './topbar.js'
import { mountStyles } from './styles.js'
import { findSidebar } from './sidebar-dom.js'

export const name = PLUGIN_ID

// 只声明 slots：设置页要注册进官方设置页的插槽，cordis 要求先声明 inject 才能读 ctx.slots。
// 其他宿主服务（sessions / workspaces）用 ctx.get() 只读访问，不占 inject 槽位。
export const inject = ['slots']

/**
 * 把设置界面注册进宿主官方设置页。
 *
 * 契约（settings.section，kind=list、scope=root）：
 *   ctx.slots.inject('settings.section', () => ctx.slots.register({ name, id, order, label }, Component))
 * id 必须自取：复用宿主 id 会顶掉它自己的页面。label 允许是 thunk，每次投影重读。
 * 注册失败只是少一页设置，不能影响侧栏本身，所以整段包在 try 里。
 */
function registerSettingsSection(ctx, { hostData, localeState, disposers }) {
  const slots = ctx.slots ?? (typeof ctx.get === 'function' ? ctx.get('slots') : undefined)
  if (slots === undefined || slots === null || typeof slots.inject !== 'function' || typeof slots.register !== 'function') {
    console.warn(`${LOG_PREFIX} 宿主没有 slots 服务，跳过设置页注册`)
    return
  }
  const SettingsSection = createSettingsSection({ hostData, localeState })
  try {
    const dispose = slots.inject('settings.section', () =>
      slots.register(
        {
          name: 'settings.section',
          // 自取 id：与内置页面并排，而不是替换它们。
          id: 'codex-sidebar',
          // 排在「Agent 预设」(20) 与 Claude Style(22) 之后。
          order: 24,
          // 每次投影重读：宿主语言晚就绪或中途切换时，导航标签跟着变。
          label: () => localeState.get().settingsTitle
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

  // 界面语言交给一个会自己更新的源：宿主 locale 服务常常比插件晚就绪
  // （桌面 App 实测：apply 时读到 en，设置页因此整页英文，而宿主导航是中文）。
  const localeState = createLocale(ctx)
  disposers.push(() => localeState.dispose())

  /**
   * 调试出口：localStorage 里的 DEBUG_KEY 置 1 时，把 ctx 与部件挂到 window 上。
   *
   * 只在开发期用来在页面控制台里观察宿主服务形状（例如给「最新消息预览」找数据源），
   * 正常使用不会产生任何全局变量。
   */
  try {
    if (window.localStorage.getItem('dsh-codex-sidebar.debug') === '1') {
      window.__codexSidebarDebug = { ctx, readSettings, writeSettings }
    }
  } catch {
    // localStorage 不可用（隐私模式）时静默跳过
  }

  const hostData = createHostData(ctx)
  const viewStore = createViewStore(ctx)
  // 缩放控制器：桌面 App 会走宿主半边的窗口级 page zoom，网页版退回页面 CSS。
  const zoom = createZoom()
  // 页面 CSS 缩放时，挂在 body 上的浮层（宿主菜单、设置页、better-sidebar 面板）要单独跟着放大。
  const portalFit = createPortalFit()

  /** 顶行动作区（延迟赋值：date-view 的回调要引用它刷新铃铛）。 */
  let topbar = null

  /** 当前模式：solo / dormant（null 表示还没判定）。 */
  let mode = null

  const dateView = createDateView({
    hostData,
    viewStore,
    // 传函数：每次重排都重新问当前语言，切换语言后标题文字立即跟上。
    locale: () => localeState.language(),
    refreshBell: () => topbar?.refreshBell()
  })

  // 设置界面直接住进官方设置页，不再自己画浮层。
  registerSettingsSection(ctx, { hostData, localeState, disposers })

  topbar = createTopbar({
    dateView,
    hostData,
    getLabels: () => localeState.get(),
    onToggle: active => writeSettings({ dateViewEnabled: active }),
    // 有主题时，铃铛点的是主题自己的日期视图：功能是同一件事，让它管，避免两套实现搬同一批行。
    // 这样我们的铃铛在任何组合下都「有东西可点」，不会出现装上去却按下去没反应的情况。
    onBellClick: () => {
      const trigger = themeDateTrigger()
      if (trigger === null) return false
      trigger.click()
      return true
    },
    // 按下态：委派给主题时读主题铃铛自己的 aria-pressed，否则读我们的日期视图状态。
    bellPressed: () => {
      const trigger = themeDateTrigger()
      if (trigger === null) return dateView.isActive()
      return trigger.getAttribute('aria-pressed') === 'true'
    },
  })

  /**
   * 缩放不再由侧栏负责。
   *
   * 早先本插件在 body 上做页面缩放，并给 body 上的浮层做坐标补偿；那套做法在桌面 App 里
   * 与主题、better-sidebar 的浮层反复打架。现在侧栏不再提供缩放入口，这里只负责把历史
   * 版本留下的缩放痕迹清干净（body 上的 zoom 与浮层补偿属性）。
   */
  function applyZoomFromSettings() {
    zoom.reset()
    portalFit.apply(1)
  }

  /** 落地浮层补偿：倍率为 1 或走窗口级缩放时一律还原。 */
  function applyPortalFit(factor, enabled) {
    portalFit.apply(enabled === true ? factor : 1)
  }

  /** reconcile 重入保护：它内部会写设置，设置订阅又会回调它。 */
  let reconciling = false

/**
   * 记住当前模式。
   *
   * 铃铛不再随模式隐藏：有主题时它委派给主题的日期视图，无主题时切我们自己的日期视图。
   * 早先的「有主题就只挂齿轮」让侧栏上只剩主题那颗铃铛可点，用户按下去没反应时
   * 既分不清是谁的、也没有替代入口——这正是「铃铛没法用」的来源。
   */
  function setMode(next) {
    if (mode === next) return
    mode = next
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
      applyZoomFromSettings()

      if (next === 'dormant') {
        if (dateView.isActive()) dateView.disable()
    dateView.dispose()
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

  /**
   * 判断一条变动是不是我们自己写的。
   *
   * 我们的标题、行内标签都带 OWN_ATTR，落在它们内部的改动不该再触发一轮重排：
   * 否则「写节点 → 观察者 → 重排 → 写节点」会自激（实测每秒上千次 DOM 变动，
   * 鼠标扫过会话行时整行轻微抖动就是这个）。
   */
  function isOurMutation(record) {
    const target = record.target
    return target instanceof Element && target.closest('[' + OWN_ATTR + ']') !== null
  }

  // 侧栏与列表都是宿主渲染的：监听整页变化，合并到一帧里处理。
  const observer = new MutationObserver(records => {
    if (records.every(isOurMutation)) return
    schedule()
  })
  observer.observe(document.body, { childList: true, subtree: true })

  // 窗口尺寸变化：CSS 缩放路线下，页面尺寸变量要跟着重算，满屏浮层也要重新量。
  const onResize = () => {
    zoom.handleResize()
    portalFit.handleResize()
  }
  window.addEventListener('resize', onResize)
  disposers.push(() => window.removeEventListener('resize', onResize))

  // 数据变化（会话更新、运行状态）也要重排与刷新小圆点。
  disposers.push(hostData.subscribe(() => {
    topbar?.refreshBell()
    dateView.schedule()
  }))

  // 设置变化：缩放立即生效，开关与共存模式交给 reconcile。
  disposers.push(subscribeSettings(() => {
    reconcile()
    applyZoomFromSettings()
    dateView.schedule()
  }))

  // 等侧栏就绪后做第一次判定。
  const boot = window.setInterval(() => {
    if (findSidebar() === null) return
    window.clearInterval(boot)
    // 自愈必须先于 reconcile：reconcile 里 enable() 会写一份新的备份键并把分组切成扁平，
    // 放到它后面就会把「刚刚才扁平好」的分组又还原回工作区（真机踩到：启动时日期视图
    // 标记亮着、列表却还是工作区分组）。这里只处理上一个进程留下的陈旧备份。
    if (!themePresent()) healLeftoverFlat()
    reconcile()
    topbar.mount()
    schedule()
    // 探测宿主能不能做窗口级缩放，再把设置里的倍率落地。
    // 主页面的缩放一旦由窗口接管，better-sidebar 那类挂在 body 上的面板才会跟着一起放大。
    portalFit.start()
    }, 200)

  // 卸载：把所有改动还原，宿主恢复到装插件之前的样子。
  ctx.effect(() => () => {
    window.clearInterval(boot)
    observer.disconnect()
    if (frameHandle !== 0) window.cancelAnimationFrame(frameHandle)
    dateView.disable()
    topbar.unmount()
    zoom.reset()
    zoom.dispose()
    portalFit.dispose()
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

  // 语言变化：日志留痕 + 顶行按钮文案 + 日期标题（等下一帧重排时更换）。
  disposers.push(localeState.subscribe((next, nextLabels) => {
    console.log(`${LOG_PREFIX} locale → ${next} (${nextLabels.today})`)
    topbar?.refreshLabels()
    dateView.schedule()
  }))

  const hostLocale = localeState.raw()
  console.log(`${LOG_PREFIX} applied (${localeState.language()}${hostLocale ? `, host ${hostLocale}` : ''})`)
}