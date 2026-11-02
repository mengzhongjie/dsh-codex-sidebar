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
 * 顶行动作区：铃铛与齿轮，紧贴宿主原有的折叠按钮。
 * gap 与宿主顶行按钮间距一致（2px），不额外撑高 logoRow。
 */
.codex-sidebar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
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
  padding: 10px 4px 4px;
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
 * 日期视图里隐藏宿主自带的相对时间（8min / 1d）。
 * 段落标题已经说明「哪一天」，标签说明「哪个工作区」，两样都要标题反而被挤成省略号。
 * 只命中会话行里那一个 span，别动其他地方。
 */
[data-codex-sidebar-date-view] [data-row-key^="session:"] > span[class*="_time"] {
  display: none;
}

/*
 * 接管模式：藏掉 dsh-claude-style 自己的日期铃铛。
 * 只藏它那一个 trigger 按钮（搜索按钮与其它动作不动），主题卸载后这条规则自然失效。
 */
[data-codex-sidebar-takeover] .dsh-claude-active-shelf-actions button[class*="active-shelf-trigger"] {
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