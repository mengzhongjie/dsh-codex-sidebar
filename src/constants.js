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
export const DATE_MODE_ATTR = 'data-codex-sidebar-date-view'

/**
 * 挂在 <body> 上的「接管」标记：检测到 dsh-claude-style 且用户选择由本插件接管时才有。
 * 用来把主题自己的日期铃铛藏掉，避免两个铃铛并排。
 */
export const TAKEOVER_ATTR = 'data-codex-sidebar-takeover'

/** 设置在本机的存储键（localStorage）。 */
export const SETTINGS_KEY = 'dsh-codex-sidebar.settings'

/**
 * 进入日期视图前，宿主分组方式的备份键。
 *
 * 进程被强杀时 body 标记会丢，但 localStorage 里的备份还在：
 * 下次启动据此判断「上次没收尾」，避免侧栏卡在扁平列表回不去。
 */
export const GROUP_BACKUP_KEY = 'dsh-codex-sidebar.group-before-date-view'

/** 默认设置：日期视图默认关闭，默认屏蔽「闲聊」工作区，缩放 1 倍。 */
export const DEFAULT_SETTINGS = {
  // 默认不进日期视图：保持宿主原本的工作区视图，按下顶行铃铛才切换。
  dateViewEnabled: false,
  skipWorkspaces: ['闲聊'],
  zoom: 1,
  // 装了 dsh-claude-style 时，默认让主题的日期视图说话；用户可在设置里改成由本插件接管。
  takeoverWithTheme: false
}

/** 缩放的五个固定档位（设置面板提供快捷按钮，也可直接填数字）。 */
export const ZOOM_STEPS = [0.85, 0.9, 1, 1.1, 1.2]

/** 缩放的合法区间：太大或太小都会让侧栏错位。 */
export const ZOOM_RANGE = { min: 0.6, max: 1.6 }

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

/**
 * dsh-claude-style 的日期视图标记（它自己打的，不是宿主原生的）。
 *
 * - 日期铃铛：主题顶行动作区里的 trigger 按钮，点一下进出它的日期视图；
 * - 日期视图开启时它会给 body 加 date-groups 属性。
 */
export const THEME_DATE_BELL_SELECTOR = '.dsh-claude-active-shelf-actions button[class*="active-shelf-trigger"]'
export const THEME_DATE_MODE_ATTR = 'data-dsh-claude-date-groups'
