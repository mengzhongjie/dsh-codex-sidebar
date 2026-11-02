/**
 * coexist.js — 判断页面上有没有 dsh-claude-style。
 *
 * 主题把侧栏列表整个换成了自己的实现（按日期排列、顶行换成它自己的铃铛），而且会盯着
 * 宿主的视图 store：看到分组被外面改成 flat 就立刻改回去。两套日期视图搬的是同一批
 * 座位 span，同时生效必然互相拆台。
 *
 * 所以只要页面上有主题，本插件就退到「让位模式」：不动列表、不碰主题的 DOM、
 * 也不接管页面缩放，只保留官方设置页里的那一页（并说明日期视图由主题提供）。
 * 判断依据只用主题自己留下的公开标记（body 属性前缀与类名前缀），不看宿主私有结构。
 */

/** 主题在页面上留下的标记前缀（用来判断主题装没装）。 */
const THEME_MARKERS = ['data-dsh-claude', 'dsh-claude-', 'dshClaude']

/**
 * 主题自己的日期铃铛（没有主题时返回 null）。
 *
 * 主题的铃铛是它日期视图的唯一开关，点击它等于点击这个按钮 —— 所以我们的铃铛在
 * 有主题时直接代它触发，用户看到的是「一颗铃铛，按下去就切换」。
 */
export function themeDateTrigger() {
  return document.querySelector('.dsh-claude-active-shelf-actions button[class*="active-shelf-trigger"]')
}

/**
 * 主题在，但它的日期视图已经不在了（0.19.7 起把「日期布局」特性整个删掉）。
 *
 * 这种情况不能进让位模式：让位的前提是主题接手了列表的日期排列，它不接手就会变成谁都
 * 不排，铃铛点下去也没有对象。此时按「无主题」处理，列表交给本插件自己的消息视图。
 * 判据是主题自己的两处痕迹：顶行那颗铃铛，或 body 上的日期分组标记。
 */
export function themeHasDateView() {
  if (!themePresent()) return false
  if (themeDateTrigger() !== null) return true
  return document.body.hasAttribute('data-dsh-claude-date-groups')
}

/** 扫描页面上的主题痕迹：装了就返回 true。 */
function themePresent() {
  // body 属性：主题把每个偏好都镜像成一个 data-dsh-claude-* 属性。
  for (const attribute of [...document.body.attributes]) {
    if (THEME_MARKERS.some(marker => attribute.name.startsWith(marker))) return true
  }
  // 类名：主题的组件都带 dsh-claude- 前缀（设置页挂载得晚，属性可能还没写）。
  for (const marker of ['dsh-claude-', 'dshClaude']) {
    if (document.querySelector(`[class*="${marker}"]`) !== null) return true
  }
  return false
}
