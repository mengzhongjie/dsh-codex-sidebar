/**
 * constants.js — 插件的固定常量。
 *
 * 这里集中放选择器、属性名、存储键与默认设置，避免同一个字符串散落在多个模块里
 * 各写一遍（宿主的小版本升级经常改动类名，集中一处更好维护）。
 */

/** 插件标识：与 package.json 的 name、cordis.patch.yml 里的 name 必须一致。 */
export const PLUGIN_ID = 'dsh-codex-sidebar'

/** 控制台日志前缀，便于在页面里一眼认出是谁打的。 */
export const LOG_PREFIX = '[codex-sidebar]'

/** 挂在 <body> 上的插件标记，CSS 与自检脚本都读它。 */
export const BODY_ATTR = 'data-codex-sidebar'

/** 挂在 <body> 上的日期视图标记：日期视图开着时才有。 */
/**
 * 悬停滑动的裁剪类名。
 *
 * entry.js 的观察者要用它判断「这条 DOM 变动是不是滑动自己弄的」：
 * 给标题套轨道会触发文档变动，不忽略就会被当成宿主变化→重排→行被重建→悬停结束，滑动刚起就停。
 */
export const MARQUEE_CLASS = 'codex-sidebar-marquee'

export const DATE_MODE_ATTR = 'data-codex-sidebar-date-view'

/**
 * 挂在 <body> 上的标记：我们的铃铛已经挂上去了。
 *
 * 只有它存在时，样式表才会藏掉 dsh-claude-style 自己那颗日期铃铛 ——
 * 保证「同一时间侧栏上只有一颗铃铛」，而且那颗一定点得动。
 */
export const BELL_ATTR = 'data-codex-sidebar-bell'

/** 设置在本机的存储键（localStorage）。 */
export const SETTINGS_KEY = 'dsh-codex-sidebar.settings'

/**
 * 进入日期视图前，宿主分组方式的备份键。
 *
 * 进程被强杀时 body 标记会丢，但 localStorage 里的备份还在：
 * 下次启动据此判断「上次没收尾」，避免侧栏卡在扁平列表回不去。
 */
export const GROUP_BACKUP_KEY = 'dsh-codex-sidebar.group-before-date-view'

/** 默认设置：消息视图默认关闭，默认屏蔽「闲聊」工作区。 */
export const DEFAULT_SETTINGS = {
  // 默认不进消息视图：保持宿主原本的工作区视图，按下顶行铃铛才切换。
  dateViewEnabled: false,
  skipWorkspaces: ['闲聊']
}

/** 宿主侧栏根节点。 */
export const SIDEBAR_SELECTOR = '[data-slot="sidebar"]'

/** 会话行：data-row-key 形如 "session:session-<uuid>"。 */
export const SESSION_ROW_SELECTOR = '[data-row-key^="session:"]'

/** 工作区标题行。 */
export const WORKSPACE_ROW_SELECTOR = '[data-row-key^="workspace:"]'

/** 会话行 key 的前缀。 */
export const SESSION_KEY_PREFIX = 'session:'

/**
 * 侧栏折叠/展开按钮的 aria-label。
 *
 * 宿主按界面语言渲染，中英文都要认；找不到就靠类名兜底（见 sidebar-dom.js）。
 */
export const TOGGLE_LABELS = ['collapse sidebar', 'expand sidebar', '收起侧边栏', '打开侧边栏']

/** 本插件自建节点统一带的属性，用来自我识别（观察者据此跳过自己的写入）。 */
export const OWN_ATTR = 'data-codex-sidebar-owned'