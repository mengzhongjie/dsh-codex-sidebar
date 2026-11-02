/**
 * entry.js — dsh-codex-sidebar 的浏览器侧入口。
 *
 * 组装关系：
 *   宿主数据（sessions/workspaces 快照）+ 侧栏视图 store（分组方式）
 *     → 日期视图控制器（重排会话行、插日期标题）
 *     → 顶行铃铛（切换消息视图）
 *
 * 与 dsh-claude-style 共处：铃铛永远是本插件自己的那颗，按下去一定进消息视图。
 * 主题在场时由 closeThemeDateView() 先让它退出自己的日期视图（两套实现不能同时搬行），
 * 并用 CSS 藏掉主题那颗重复的铃铛；主题不在场时就是普通的独立运行。
 *
 * 缩放走 zoom.js：桌面 App 优先用宿主半边的窗口级 page zoom（better-sidebar 的
 * 面板才会跟着一起放大），网页版退回页面 CSS；主题在场时仍让位给主题的 pageZoom。
 */
import { PLUGIN_ID, LOG_PREFIX, BODY_ATTR, DATE_MODE_ATTR, OWN_ATTR, THEME_DATE_MODE_ATTR } from './constants.js'
import { readSettings, writeSettings, subscribeSettings } from './settings.js'
import { createHostData } from './host-data.js'
import { createLocale } from './locale.js'
import { themePresent, themeDateTrigger } from './coexist.js'
import { createZoom } from './zoom.js'
import { createPortalFit } from './portal-fit.js'
import { createViewStore } from './view-store.js'
import { createDateView } from './date-view.js'
import { createTopbar } from './topbar.js'
import { mountStyles } from './styles.js'
import { findSidebar } from './sidebar-dom.js'

export const name = PLUGIN_ID

// 不再往官方设置页注册任何东西，因此不需要声明 slots。
// 宿主服务（sessions / workspaces）用 ctx.get() 只读访问，不占 inject 槽位。
export const inject = []

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

  /**
   * 借用 / 归还主题的「日期视图开着」标记。
   *
   * 装了 dsh-claude-style 时，主题的 workspace-view 会在下一帧把宿主的 flat 分组改回
   * 工作区分组（它认为扁平只可能是主题自己写进去的）。我们借它的标记让那次 reconcile
   * 提前返回，扁平列表才立得住；退出时原样删掉，主题的状态不受影响。
   */
  let themeMarkerBorrowed = false

  /** 进入消息视图前：有主题就借标记（主题自己的日期视图开着就不借，冲突由调用方先关掉）。 */
  function borrowThemeMarker() {
    if (!themePresent()) return
    if (document.body.hasAttribute(THEME_DATE_MODE_ATTR)) return
    document.body.setAttribute(THEME_DATE_MODE_ATTR, '')
    themeMarkerBorrowed = true
  }

  /** 退出消息视图后：把借来的标记还回去（只删我们自己加的那一次）。 */
  function returnThemeMarker() {
    if (!themeMarkerBorrowed) return
    themeMarkerBorrowed = false
    document.body.removeAttribute(THEME_DATE_MODE_ATTR)
  }

  const dateView = createDateView({
    hostData,
    viewStore,
    // 传函数：每次重排都重新问当前语言，切换语言后标题文字立即跟上。
    locale: () => localeState.language(),
    refreshBell: () => topbar?.refreshBell(),
    prepareEnable: borrowThemeMarker,
    afterDisable: returnThemeMarker
  })

  // 设置界面直接住进官方设置页，不再自己画浮层。

  /**
   * 让主题退出它自己的日期视图。
   *
   * 主题与本插件搬的是同一批会话行，两套视图同时开着会互相重排；
   * 而且主题的日期视图一开就会把工作区行藏起来（用户看到的「收起了工作区」）。
   * 所以每次要打开我们的消息视图之前，先点一次主题那颗铃铛让它退出。
   */
  function closeThemeDateView() {
    const trigger = themeDateTrigger()
    if (trigger === null) return
    if (trigger.getAttribute('aria-pressed') === 'true') trigger.click()
  }

  topbar = createTopbar({
    dateView,
    hostData,
    getLabels: () => localeState.get(),
    onToggle: active => writeSettings({ dateViewEnabled: active }),
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
   * 统一判定：消息视图该开还是该关。
   *
   * 这里不再有「有主题就让位」的分支：用户按的那颗铃铛永远是本插件的铃铛，
   * 按下去就必须进消息视图。主题那边自己的日期视图由 closeThemeDateView() 关掉，
   * 两套实现不会同时搬同一批会话行。
   */
  function reconcile() {
    if (reconciling) return
    reconciling = true
    try {
      const settings = readSettings()
      applyZoomFromSettings()
      if (settings.dateViewEnabled) {
        if (!dateView.isActive()) {
          closeThemeDateView()
          dateView.enable()
        }
        return
      }
      if (dateView.isActive()) dateView.disable()
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

  // 设置变化：缩放立即生效，开关交给 reconcile。
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
    healLeftoverFlat()
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
    returnThemeMarker()
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