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
 * 顶行动作区：铃铛，紧贴宿主原有的折叠按钮。
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

/*
 * 消息视图开启时铃铛常亮：用 DeepSeek 品牌蓝 #4D6BFE 作唯一强调色，深浅色同一档
 * （品牌蓝在浅色与深色底上都够清楚，不再像早先的琥珀色那样分浅深两档；
 *  --codex-sidebar-accent 仍保留为外部覆盖口，想换别色时只改这一个变量）。
 */
.codex-sidebar-icon-button[aria-pressed="true"] {
  color: var(--codex-sidebar-accent, #4d6bfe);
}

/* 有会话在跑时亮一个点，不写数字 */
.codex-sidebar-dot {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  /* 宿主语义绿色 token：有正在运行的会话时高亮指示，回退到标准绿色 */
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
  /* 段落标题不许把列表撑宽：宽出容器一点就会让宿主长出横向滚动条。 */
  box-sizing: border-box;
  max-width: 100%;
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
 * 主会话行（dsh-superagent 的「主会话」）。
 *
 * 那个插件把主会话的行内 display 写成 none 藏起来，改在每个工作区组标题上挂 M 气泡当入口；
 * 消息视图把组标题拍平后入口就没了，所以这里用 !important 把行顶回可见。
 * 行内保持 none —— 对面据此认为已经藏好，不会反复来藏（改写行内会让两边互激）。
 */
[data-codex-sidebar-date-view] [data-row-key^="session:"].codex-sidebar-main-session {
  display: flex !important;
}

/*
 * 第二行：这段对话最后说的话。
 * 与标题文字左对齐（图标槽 16px + 间隙 8px），最多两行，超出省略；
 * pointer-events: none 让它不抢走整行的点击与悬停。
 *
 * box-sizing: border-box 是必须的：宿主是 content-box，flex-basis: 100% 指的是内容宽，
 * 再加 20px 左内缩，盒子就比行内容区宽 20px —— 文字与省略号会画到行尾外面、越过悬停底色
 * 的圆角甚至侧栏边界（真机截图里的「字超过灰色栏」就是这个）。改成 border-box 后
 * 100% 把内缩算在内，右边缘正好落在行内容区右边。
 */
.codex-sidebar-preview {
  flex: 0 0 100%;
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
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
 * 设置 pointer-events: none 与 user-select: none，确保鼠标点击与选择完全穿透给会话行。
 */
.codex-sidebar-marquee-track {
  display: inline-block;
  white-space: nowrap;
  will-change: transform;
  pointer-events: none;
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
 * 我们的铃铛在场时，藏掉 dsh-claude-style 自己那颗日期铃铛：侧栏上只留一颗铃铛，
 * 位子固定、一定点得动（点击会转交给主题的铃铛，功能不丢）。
 * 只藏它那一个 trigger（搜索按钮与其它动作不动）；我们卸载后标记消失，主题那颗自动回来。
 */
[data-codex-sidebar-bell] .dsh-claude-active-shelf-actions button[class*="active-shelf-trigger"] {
  display: none !important;
}

`;

/** 把样式注入页面，返回卸载函数。 */
export function mountStyles() {
  const tag = document.createElement('style')
  tag.setAttribute('data-codex-sidebar-owned', '')
  tag.textContent = CSS
  document.head.appendChild(tag)
  return () => tag.remove()
}