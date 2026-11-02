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

/** 设置在本机的存储键（localStorage）。 */
export const SETTINGS_KEY = 'dsh-codex-sidebar.settings'

/**
 * 进入日期视图前，宿主分组方式的备份键。
 *
 * 进程被强杀时 body 标记会丢，但 localStorage 里的备份还在：
 * 下次启动据此判断「上次没收尾」，避免侧栏卡在扁平列表回不去。
 */
export const GROUP_BACKUP_KEY = 'dsh-codex-sidebar.group-before-date-view'

/** 默认设置：日期视图默认关闭，默认屏蔽「闲聊」工作区，缩放 100%。 */
export const DEFAULT_SETTINGS = {
  // 默认不进日期视图：保持宿主原本的工作区视图，按下顶行铃铛才切换。
  dateViewEnabled: false,
  skipWorkspaces: ['闲聊'],
  zoom: 1
}

/** 缩放的五个快捷档位（百分比），与设置页按钮一致。 */
export const ZOOM_STEPS = [0.8, 1, 1.25, 1.5]

/** 缩放的合法区间：太大或太小都会让侧栏错位。 */
export const ZOOM_RANGE = { min: 0.6, max: 2 }

/**
 * 页面缩放的三件套：一个 body 属性、一个倍率变量、一组页面尺寸变量。
 *
 * 这是 dsh-claude-style 的做法（theme/chrome.css:146-167、shared/page-zoom.ts）：
 *   · 属性 data-codex-sidebar-page-zoom 只表示「现在有缩放」，值是倍率文本；
 *   · 样式表里写 `zoom: var(--codex-sidebar-page-zoom-factor, 1)`；
 *   · body 按窗口尺寸除以倍率定宽高并 overflow:hidden（页面缩放了，vh/vw 会再乘一次倍率）。
 * 关键区别：绝不写 body.style.zoom。行内 zoom 是「另一份缩放」，会把主题的
 * pageZoom 规则整条盖掉（主题仍按 1.15 补偿测量，页面却按 1 绘制，光标与浮层全偏）。
 */
export const ZOOM_ATTR = 'data-codex-sidebar-page-zoom'
export const ZOOM_VAR = '--codex-sidebar-page-zoom-factor'
export const ZOOM_WIDTH_VAR = '--codex-sidebar-page-width'
export const ZOOM_HEIGHT_VAR = '--codex-sidebar-page-height'

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