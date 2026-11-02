/**
 * entry.js — dsh-codex-sidebar 的浏览器侧入口。
 *
 * 组装关系：
 *   宿主数据（sessions/workspaces 快照）+ 侧栏视图 store（分组方式）
 *     → 日期视图控制器（重排会话行、插日期标题）
 *     → 顶行铃铛（切换消息视图）
 *
 * 与 dsh-claude-style 只有两种模式（见 coexist.js）：
 *   solo     页面没有主题：铃铛可用，列表由本插件接管；
 *   dormant  页面有主题**且**它自带日期视图：不碰列表与主题的 DOM，铃铛转发给主题。
 *            主题在但日期视图被删掉时按 solo 走，列表由本插件接管。
 * 模式在 reconcile() 里判定，设置变化、侧栏挂载、页面变动都会重新跑它。
 *
 * 缩放不属于本插件：整页缩放会与主题、better-sidebar 的浮层定位打架，2026-11-02 起整份移除。
 */
import { PLUGIN_ID, LOG_PREFIX, BODY_ATTR, DATE_MODE_ATTR, OWN_ATTR, MARQUEE_CLASS } from './constants.js'
import { readSettings, writeSettings, subscribeSettings } from './settings.js'
import { createHostData } from './host-data.js'
import { createLocale } from './locale.js'
import { themeDateTrigger, themeHasDateView } from './coexist.js'
import { createViewStore } from './view-store.js'
import { createDateView } from './date-view.js'
import { createSuperagentBridge } from './superagent.js'
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
  /** 顶行动作区（延迟赋值：date-view 的回调要引用它刷新铃铛）。 */
  let topbar = null

  /** 当前模式：solo / dormant（null 表示还没判定）。 */
  let mode = null

  /**
   * superagent 的主会话探测器。
   *
   * 它把主会话行藏成 display:none、改在组标题上挂入口；消息视图拍平后入口没了，
   * 所以要问出主会话 id 并把那几行顶回可见（详见 superagent.js）。
   * onChange 里排一次重排：id 是异步查到的，查到后列表得跟着变。
   */
  let dateView = null
  const superagent = createSuperagentBridge({ onChange: () => dateView?.schedule() })

  dateView = createDateView({
    hostData,
    viewStore,
    superagent,
    // 传函数：每次重排都重新问当前语言，切换语言后标题文字立即跟上。
    locale: () => localeState.language(),
    refreshBell: () => topbar?.refreshBell()
  })

  // 设置界面直接住进官方设置页，不再自己画浮层。

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
      const next = themeHasDateView() ? 'dormant' : 'solo'
      setMode(next)

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
      // 无论日期视图是否开启，顶栏铃铛都应保持挂载（topbar.mount 内部有幂等检查：挂点未变时立即返回）；
      // 避免侧栏折叠再展开（折叠时 unmount 撤掉铃铛）或宿主重渲染时铃铛丢失无法退出消息视图。
      topbar.mount()
      reconcile()
      dateView.schedule()
    })
  }

  /** 判断一个节点是不是本插件自己放进去的（含悬停滑动套的轨道）。 */
  function isOurNode(node) {
    if (!(node instanceof Element)) return false
    return node.hasAttribute(OWN_ATTR)
      || node.classList.contains(MARQUEE_CLASS)
      || node.closest('[' + OWN_ATTR + ']') !== null
  }

  /**
   * 判断一条变动是不是我们自己写的。
   *
   * 两个面都要看：target 落在自有节点里（改铃铛、改预览），或者 target 是宿主节点、
   * 但增删的孩子全是自有节点（往宿主行里塞标签与预览、往列表里插段落标题）。
   * 只看其中一面都会把自生变动当成宿主变化，于是「写节点 → 观察者 → 重排 → 写节点」
   * 自激（实测每秒上千次 DOM 变动，鼠标扫过会话行时整行轻微抖动）。
   */
  function isOurMutation(record) {
    const target = record.target
    if (target instanceof Element) {
      if (target.closest('[' + OWN_ATTR + ']') !== null) return true
      // 悬停滑动会往标题里套一层轨道：这些变动属于我们，不能当成宿主变化去重排，
      // 否则重排会重建行、悬停当场结束，滑动刚起步就被自己掐掉。
      if (target.closest('.' + MARQUEE_CLASS) !== null) return true
    }
    const altered = [...record.addedNodes, ...record.removedNodes]
    return altered.length > 0 && altered.every(isOurNode)
  }

  // 侧栏与列表都是宿主渲染的：监听整页变化，合并到一帧里处理。
  const observer = new MutationObserver(records => {
    if (records.every(isOurMutation)) return
    schedule()
  })
  observer.observe(document.body, { childList: true, subtree: true })

  // 数据变化（会话更新、运行状态）也要重排与刷新小圆点。
  disposers.push(hostData.subscribe(() => {
    topbar?.refreshBell()
    dateView.schedule()
  }))

  // 设置变化：开关与共存模式统一交给 reconcile。
  disposers.push(subscribeSettings(() => {
    reconcile()
    dateView.schedule()
  }))

  // 等侧栏就绪后做第一次判定。
  const boot = window.setInterval(() => {
    if (findSidebar() === null) return
    window.clearInterval(boot)
    // 自愈必须先于 reconcile：reconcile 里 enable() 会写一份新的备份键并把分组切成扁平，
    // 放到它后面就会把「刚刚才扁平好」的分组又还原回工作区（真机踩到：启动时日期视图
    // 标记亮着、列表却还是工作区分组）。这里只处理上一个进程留下的陈旧备份。
    if (!themeHasDateView()) healLeftoverFlat()
    reconcile()
    topbar.mount()
    schedule()
  }, 200)

  // 卸载：把所有改动还原，宿主恢复到装插件之前的样子。
  ctx.effect(() => () => {
    // 每一步单独兜住：卸载时前面一步抛错，后面的还原就全都不执行了，
    // 表现就是「插件在管理页关掉了，侧栏还挂着」。
    const quietly = (step, action) => {
      try {
        action()
      } catch (error) {
        console.warn(`${LOG_PREFIX} 卸载时 ${step} 失败`, error)
      }
    }
    quietly('停轮询', () => window.clearInterval(boot))
    quietly('断开观察者', () => observer.disconnect())
    quietly('取消调度帧', () => {
      if (frameHandle !== 0) window.cancelAnimationFrame(frameHandle)
    })
    // 先撤视图再撤顶行：视图的清理会用到顶行挂的落座信息。
    quietly('撤销消息视图', () => dateView.disable())
    quietly('卸下顶行按钮', () => topbar.unmount())
    quietly('撤掉标记', () => {
      document.body.removeAttribute(BODY_ATTR)
      document.body.removeAttribute(DATE_MODE_ATTR)
    })
    quietly('释放 superagent 探测', () => superagent.dispose())
    for (const dispose of disposers) quietly('释放订阅', dispose)
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