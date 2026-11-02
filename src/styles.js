/**
 * styles.js — 插件自带的样式。
 *
 * 两条原则：
 * 1. 只给「本插件自己创建的节点」写样式，不覆盖宿主节点（唯一例外是日期视图下隐藏行内相对时间，
 *    且挂在本插件自己的 body 标记下，退出即失效）。
 * 2. 颜色、圆角一律优先取宿主主题 token（--dsw-alias-* / --dsw-radius-*，定义在 body 上，
 *    插件节点挂在 body 下可继承），取不到时才用 light-dark() 兜底，保证浅色/深色两套都跟随宿主。
 */

/** 样式表内容：集中一处，便于校对。 */
const CSS = `
/*
 * 整页缩放（说明见 constants.js 的 ZOOM_* 注释）。
 *
 * 缩放对象是 #root 而不是 body，手段是 transform 而不是 CSS zoom —— 这一条是实测结论：
 * 宿主把弹层（账号菜单、设置页）portal 到 body 上用 position:fixed + getBoundingClientRect
 * 定位，而 body 上的 CSS zoom 会让布局像素与视口像素不同源，缩放到 125% 时菜单被算到
 * 视口下方（y=898，菜单项 903，100% 时是 y=732），于是「调整缩放后设置打不开」。
 * transform 下 getBoundingClientRect 给的是视觉坐标，宿主的算法仍然正确。
 *
 * width/height 按「窗口尺寸 / 倍率」写死（由 JS 算出），这样缩放后正好铺满窗口；
 * 只挂在本插件自己的标记上：有主题时我们不写 data-codex-sidebar-page-zoom，不与主题的
 * pageZoom 叠加。
 */
body[data-codex-sidebar][data-codex-sidebar-page-zoom] #root {
  transform: scale(var(--codex-sidebar-page-zoom-factor, 1));
  transform-origin: 0 0;
  width: var(--codex-sidebar-page-width, 100vw);
  height: var(--codex-sidebar-page-height, 100vh);
}

body[data-codex-sidebar][data-codex-sidebar-page-zoom] {
  overflow: hidden;
  margin: 0;
}

html:has(body[data-codex-sidebar][data-codex-sidebar-page-zoom]:not([data-codex-sidebar-page-zoom="1"])) {
  padding: 0;
  overflow: hidden;
}

/* 宿主弹层按视口单位封顶，缩放后会被放大一次，所以改用页面自身尺寸封顶。 */
body[data-codex-sidebar] :is(dialog, [role="dialog"]) {
  max-width: calc(var(--codex-sidebar-page-width, 100vw) - 48px);
  max-height: calc(var(--codex-sidebar-page-height, 100vh) - 48px);
}

/*
 * 顶行动作区：铃铛与齿轮，紧贴宿主原有的折叠按钮。
 * gap 与宿主顶行按钮间距一致（2px），不额外撑高 logoRow。
 */
.codex-sidebar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

/* 挂在顶行时靠右推（那一行左边是品牌按钮）；挂在工作区行时不用，那个图标组本来就靠右。 */
.codex-sidebar-actions-top {
  margin-left: auto;
}

/*
 * 图标按钮：几何尺寸对齐宿主顶行原生的 28×28 / radius 8px。
 * 颜色取宿主的次级文字色（原生折叠按钮就是 rgb(97,102,107)），
 * 悬停背景取宿主的 interactive-bg-hover，深浅色都由 token 决定。
 */
.codex-sidebar-icon-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-sm, 8px);
  background: transparent;
  color: var(--dsw-alias-label-primary-dimmed, light-dark(rgb(97, 102, 107), rgb(160, 165, 172)));
  cursor: pointer;
  transition: color 120ms ease, background-color 120ms ease;
}

.codex-sidebar-icon-button:hover {
  color: var(--dsw-alias-label-primary, light-dark(rgb(15, 17, 21), rgb(236, 237, 240)));
  background: var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, currentColor 10%, transparent));
}

.codex-sidebar-icon-button:focus-visible {
  outline: 2px solid var(--dsw-alias-border-l4, color-mix(in srgb, currentColor 45%, transparent));
  outline-offset: 1px;
}

/* 日期视图开启时铃铛常亮：用琥珀色作唯一强调色，深浅色各取一档 */
.codex-sidebar-icon-button[aria-pressed="true"] {
  color: var(--codex-sidebar-accent, light-dark(#a9720f, #f0b429));
}

/* 有会话在跑时亮一个点，不写数字 */
.codex-sidebar-dot {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--dsw-alias-state-success-primary, #35c76a);
  box-shadow: 0 0 0 2px var(--dsw-alias-bg-layer-1, light-dark(#fff, #1b1b1e));
}

/*
 * 日期段落标题。
 * 宿主原生分组标签是 14px/400 灰字、文字起点 x=16；段落标题要更弱一些，
 * 所以用 12px/600、宿主次级文字色 + 55% 不透明，左内边距与行内容对齐（8），不再多缩进 6px。
 */
.codex-sidebar-date-header {
  padding: 12px 4px 6px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.02em;
  color: var(--dsw-alias-label-primary, inherit);
  opacity: 0.55;
  user-select: none;
}

/* 日期视图下行内的工作区标签：扁平后没有分组标题，靠它回忆归属 */
.codex-sidebar-chip {
  margin-left: auto;
  flex: 0 1 auto;
  min-width: 0;
  max-width: 40%;
  padding: 1px 5px;
  border-radius: var(--dsw-radius-sm, 8px);
  background: var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, currentColor 7%, transparent));
  font-size: 10px;
  line-height: 1.4;
  letter-spacing: 0;
  opacity: 0.6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
}

/*
 * 消息视图的两行式会话行（Codex 那种聊天列表）。
 *
 * 宿主行本来是单行 flex：图标槽 + 标题 + 时间 + 我们的标签 + 操作组。
 * 改成可换行后，把「最新消息预览」作为行尾的 flex-basis:100% 节点放到第二行，
 * 行高改为自适应；时间在消息视图里已经被隐藏，第一行只剩图标 + 标题 + 标签。
 */
[data-codex-sidebar-date-view] [data-row-key^="session:"] {
  flex-wrap: wrap;
  height: auto;
  min-height: 32px;
  row-gap: 1px;
  padding-top: 6px;
  padding-bottom: 6px;
}

/*
 * 装了 dsh-claude-style 时它给会话行写了固定高度（实测 28px），优先级高于上面那条规则，
 * 结果第二行预览溢出到下一行标题上、字叠字。这里用同一属性、三个属性选择器的写法加
 * !important：只有「宿主 + 主题」同时命中时才有额外权重，solo 环境不受影响。
 */
[data-codex-sidebar-date-view] [data-slot="sidebar"] [data-row-key^="session:"] {
  height: auto !important;
  min-height: 32px !important;
  flex-wrap: wrap !important;
}

/*
 * 第二行：这段对话最后说的话。
 * 与标题文字左对齐（图标槽 16px + 间隙 8px），最多两行，超出省略；
 * pointer-events: none 让它不抢走整行的点击与悬停。
 */
.codex-sidebar-preview {
  flex: 0 0 100%;
  min-width: 0;
  padding-left: 20px;
  font-size: 12px;
  line-height: 1.45;
  letter-spacing: 0;
  color: var(--dsw-alias-label-primary, inherit);
  opacity: 0.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
  user-select: none;
  pointer-events: none;
}

/*
 * 标题窗口：宿主给会话行标题做了横向滚动（悬停时用 scrollLeft 挪文字），
 * 在消息视图里那会变成行底一条横向滚动条、标题还会自己左右窜。
 * overflow: clip 不建立滚动容器 —— 宿主再怎么设 scrollLeft 都不动，文字照旧用省略号收尾。
 */
[data-codex-sidebar-date-view] [data-row-key^="session:"] > span[class*="_title"] {
  overflow: clip !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

/*
 * 悬停：工作区小字退场，标题拿到整行宽度。
 * Codex 的会话列表也是这么做的——悬停时把注意力收回到会话本身。
 */
[data-codex-sidebar-date-view] [data-row-key^="session:"]:hover .codex-sidebar-chip {
  display: none;
}

/*
 * 标题过长时悬停横向滑动，滑一次停在尾巴上，移开就复位。
 *
 * 窗口固定成「圆点之后到行尾」：靠 overflow 裁边，滚的是内容（scrollLeft），
 * 不移动盒子本身——给标题加 transform 会把裁剪窗一起推走，左边缘就跑到侧栏外面去了。
 * 位移与时长由 date-view.js 现量现算：窗口宽度随侧栏宽与缩放变化，写死距离会滑多或滑不到。
 */
.codex-sidebar-marquee {
  /* 窗口固定：overflow 裁出「圆点到行尾」这一块，滚的是里面那条轨道（见 date-view.js）。 */
  overflow: clip !important;
  text-overflow: clip !important;
  padding-right: 10px;
  /* 只遮左端：字从圆点这一侧滑出去时渐隐，右端保持清晰——
     滑到终点时尾巴正贴在右边缘，右端再加遮罩会把刚露出来的最后一个字又蒙掉。 */
  mask-image: linear-gradient(90deg, transparent 0, #000 18px, #000 100%);
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 18px, #000 100%);
}

/*
 * 滑动轨道：包住标题文字，只平移这一层。
 * 标题自身不动，所以裁剪窗始终停在原位；不给标题加 transform 也不滚 scrollLeft，
 * 行上就不会出现横向滚动条。
 */
.codex-sidebar-marquee-track {
  display: inline-block;
  white-space: nowrap;
  will-change: transform;
}

/*
 * 日期视图里隐藏宿主自带的相对时间（8min / 1d）。
 * 段落标题已经说明「哪一天」，标签说明「哪个工作区」，两样都要标题反而被挤成省略号。
 * 只命中会话行里那一个 span，别动其他地方。
 */
[data-codex-sidebar-date-view] [data-row-key^="session:"] > span[class*="_time"] {
  display: none;
}

/*
 * 我们的铃铛在场时，藏掉 dsh-claude-style 自己那颗日期铃铛：侧栏上只留一颗铃铛，
 * 位子固定、一定点得动（点击会转交给主题的铃铛，功能不丢）。
 * 只藏它那一个 trigger（搜索按钮与其它动作不动）；我们卸载后标记消失，主题那颗自动回来。
 */
[data-codex-sidebar-bell] .dsh-claude-active-shelf-actions button[class*="active-shelf-trigger"] {
  display: none !important;
}

/*
 * 设置页：作为 section 住进官方设置页的内容列。
 * 内容列自己带左右 24px 内边距，这里只排卡片与行，不再加外边距。
 * 观感对齐官方「账号与余额」页：20px 圆角卡片、1px 描边、2px/16px 内边距，行间发丝线。
 */
.codex-sidebar-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
  color: var(--dsw-alias-label-primary, inherit);
  font-size: 14px;
}

.codex-sidebar-settings-intro {
  margin: 0 0 4px;
  font-size: 13px;
  line-height: 1.6;
  opacity: 0.65;
}

.codex-sidebar-settings-card {
  display: flex;
  flex-direction: column;
  padding: 2px 16px;
  border: 1px solid var(--dsw-alias-border-l2, light-dark(rgba(0, 0, 0, 0.12), rgba(255, 255, 255, 0.14)));
  border-radius: 20px;
  background: var(--dsw-alias-bg-layer-1, light-dark(#fff, #1c1d20));
}

/* 行：官方设置页的行是 16px 上下、标题说明在左、控件在右 */
.codex-sidebar-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 14px 0;
}

/* 行间发丝线：第一行不留线 */
.codex-sidebar-settings-row + .codex-sidebar-settings-row {
  border-top: 0.5px solid var(--dsw-alias-border-l2, light-dark(rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.12)));
}

.codex-sidebar-settings-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.codex-sidebar-settings-title {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
}

.codex-sidebar-settings-desc {
  font-size: 12px;
  line-height: 1.5;
  opacity: 0.6;
}

/* 卡片内的分区标题（复选框、缩放这类自带列表的块） */
.codex-sidebar-settings-heading {
  display: flex;
  flex-direction: column;
  padding: 14px 0 2px;
}

.codex-sidebar-settings-heading .codex-sidebar-settings-title {
  font-weight: 600;
}

/* 开关：40×22 轨道 + 18px 圆点，开态取宿主 business 主色 */
.codex-sidebar-switch {
  position: relative;
  flex: 0 0 auto;
  width: 40px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--dsw-alias-state-idle-primary, light-dark(#d4d4d4, #4a4d55));
  cursor: pointer;
  transition: background-color 140ms ease;
}

.codex-sidebar-switch.is-on {
  background: var(--dsw-alias-state-business-primary, #4176e6);
}

.codex-sidebar-switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--dsw-alias-switch-thumb, #fff);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  transition: transform 140ms ease;
}

.codex-sidebar-switch.is-on .codex-sidebar-switch-thumb {
  transform: translateX(18px);
}

.codex-sidebar-switch:focus-visible {
  outline: 2px solid var(--dsw-alias-border-l4, color-mix(in srgb, currentColor 45%, transparent));
  outline-offset: 2px;
}

/* 工作区勾选列表：最高 260px，超出滚动，不把整页撑长 */
.codex-sidebar-settings-list {
  display: flex;
  flex-direction: column;
  padding: 2px 0 6px;
  max-height: 260px;
  overflow-y: auto;
}

.codex-sidebar-settings-check {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  border-radius: var(--dsw-radius-sm, 8px);
}

.codex-sidebar-settings-check:hover {
  background: var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, currentColor 7%, transparent));
}

.codex-sidebar-check-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid var(--dsw-alias-border-l4, color-mix(in srgb, currentColor 30%, transparent));
  color: #fff;
}

.codex-sidebar-settings-check[aria-checked="true"] .codex-sidebar-check-box {
  border-color: transparent;
  background: var(--dsw-alias-state-business-primary, #4176e6);
}

.codex-sidebar-check-box svg {
  width: 11px;
  height: 11px;
}

.codex-sidebar-check-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.codex-sidebar-settings-empty {
  padding: 4px 0 8px;
  font-size: 13px;
  opacity: 0.55;
}

/* 缩放控件行：跟在标题说明下方，左对齐，窄窗口时换行 */
.codex-sidebar-settings-zoom-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 2px 0 16px;
}

/* 缩放：四档按钮 + 自定义输入框，横向排一行 */
.codex-sidebar-zoom {
  display: flex;
  align-items: center;
  gap: 8px;
}

.codex-sidebar-zoom-steps {
  display: flex;
  gap: 4px;
}

.codex-sidebar-zoom-step {
  min-width: 48px;
  padding: 5px 8px;
  border-radius: var(--dsw-radius-sm, 8px);
  border: 1px solid var(--dsw-alias-border-l2, color-mix(in srgb, currentColor 18%, transparent));
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
}

.codex-sidebar-zoom-step:hover {
  background: var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, currentColor 10%, transparent));
}

.codex-sidebar-zoom-step[data-selected="true"] {
  border-color: var(--dsw-alias-label-primary, currentColor);
  font-weight: 600;
}

.codex-sidebar-zoom-input {
  width: 62px;
  padding: 5px 8px;
  border-radius: var(--dsw-radius-sm, 8px);
  border: 1px solid var(--dsw-alias-border-l2, color-mix(in srgb, currentColor 18%, transparent));
  background: transparent;
  color: inherit;
  font-size: 12px;
}

/* 缩放控件行：跟在标题说明下方，左对齐，窄窗口时换行 */
.codex-sidebar-settings-zoom-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 2px 0 16px;
}

/* 缩放：五档按钮 + 自定义输入框，纵向居中成一排 */
.codex-sidebar-zoom {
  display: flex;
  align-items: center;
  gap: 8px;
}

.codex-sidebar-zoom-steps {
  display: flex;
  gap: 4px;
}

.codex-sidebar-zoom-step {
  min-width: 48px;
  padding: 5px 8px;
  border-radius: var(--dsw-radius-sm, 8px);
  border: 1px solid var(--dsw-alias-border-l2, color-mix(in srgb, currentColor 18%, transparent));
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
}

.codex-sidebar-zoom-step:hover {
  background: var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, currentColor 10%, transparent));
}

.codex-sidebar-zoom-step[data-selected="true"] {
  border-color: var(--dsw-alias-label-primary, currentColor);
  font-weight: 600;
}

.codex-sidebar-zoom-input {
  width: 62px;
  padding: 5px 8px;
  border-radius: var(--dsw-radius-sm, 8px);
  border: 1px solid var(--dsw-alias-border-l2, color-mix(in srgb, currentColor 18%, transparent));
  background: transparent;
  color: inherit;
  font-size: 12px;
}
`

/** 把样式注入页面，返回卸载函数。 */
export function mountStyles() {
  const tag = document.createElement('style')
  tag.setAttribute('data-codex-sidebar-owned', '')
  tag.textContent = CSS
  document.head.appendChild(tag)
  return () => tag.remove()
}