/**
 * coexist.js — 与 dsh-claude-style 的共存判断。
 *
 * 两个插件都提供「按日期排会话」：主题主题版把顶行换成自己的铃铛，本插件也有一套。
 * 同时生效会互相搬同一批座位 span，所以这里做三层判断，而不是简单让位：
 *
 *   solo     没有主题（原生宿主）——本插件全功能；
 *   dormant  有主题、但用户没要求接管——只挂设置齿轮，不动列表，主题的日期视图照用；
 *   takeover 有主题、用户选择了接管——藏掉主题的铃铛，由本插件提供日期视图。
 *
 * 判断依据只用主题自己留下的公开标记（类名与 body 属性），不依赖宿主私有结构。
 */
import { THEME_DATE_BELL_SELECTOR, THEME_DATE_MODE_ATTR } from './constants.js'

/** 主题在页面上留下的标记前缀（用来判断主题装没装）。 */
const THEME_MARKERS = ['data-dsh-claude', 'dsh-claude-', 'dshClaude']

/** 扫描页面上的主题痕迹：装了就返回 true。 */
export function themePresent() {
  for (const attribute of [...document.body.attributes]) {
    if (THEME_MARKERS.some(marker => attribute.name.startsWith(marker))) return true
  }
  for (const marker of ['dsh-claude-', 'dshClaude']) {
    if (document.querySelector(`[class*="${marker}"]`) !== null) return true
  }
  return false
}

/**
 * 主题的日期铃铛节点（没有就返回 null）。
 *
 * 用类名而不是 aria-label 定位：aria-label 会随界面语言变，类名是主题自己写死的。
 */
export function themeDateBell() {
  const bell = document.querySelector(THEME_DATE_BELL_SELECTOR)
  return bell instanceof HTMLElement ? bell : null
}

/** 主题的日期视图此刻是不是开着。 */
export function themeDateViewActive() {
  return document.body.hasAttribute(THEME_DATE_MODE_ATTR)
}

/**
 * 把主题的日期视图关掉（它自己开着的情况）。
 *
 * 只在点它自己的铃铛时生效——等价于用户手动退出，主题会自己还原分组与座位。
 * 返回是否真的点了。
 */
export function dismissThemeDateView() {
  if (!themeDateViewActive()) return false
  const bell = themeDateBell()
  if (bell === null) return false
  bell.click()
  return true
}

/** 当前位置该用哪种模式：solo / dormant / takeover。 */
export function coexistMode(takeoverWithTheme) {
  if (themeDateBell() === null) return 'solo'
  return takeoverWithTheme === true ? 'takeover' : 'dormant'
}
