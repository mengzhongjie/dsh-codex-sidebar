# 交接：dsh-codex-sidebar

> 最近更新：2026-11-02（缩整改成与 dsh-claude-style 同款样式表做法；主题在场时整体让位）。

## 目标与验收标准

把「闹钟边栏」做成一个**独立的 DSH 插件**（不依赖 dsh-claude-style 主题）：侧栏顶行一个铃铛切换
日期视图，列表按 今天 / 昨天 / 星期X / 更早 分段，设置项注册进**官方设置页**的一个 section（日期视图开关、屏蔽工作区、整体缩放）。
同时要求**两种宿主都不坏**：原生宿主全功能；装了 dsh-claude-style 的宿主上不与主题打架（让位、但不失效）。
验收：装进 profile 后侧栏正常、铃铛可见可用、日期分段正确、退出能完整还原；有主题时页面不偏移、不空白。

## 进度（截至本文件更新）

- 插件骨架、esbuild 构建、安装/卸载脚本（`scripts/install.mjs`）—— 完成；
- 日期视图（分段、排序、运行中置顶、段落标题、工作区标签、进出还原）—— 完成；
- 顶行铃铛 + 齿轮 + 运行中小绿点；设置持久化；启动自愈 —— 完成；
- **设置从自建浮层改为注册进官方设置页**（`settings.section`，齿轮直达）—— 完成并双 profile 实测；
- 样式对齐宿主 token（浅色/深色、与原生按钮/标签同尺寸）—— 完成；
- **整页缩放改成 `dsh-claude-style` 同款**（样式表 `zoom` + 页面尺寸变量 + 弹窗封顶，不写行内 `zoom`）—— 完成并实测；
- **语言判定改为读 locale 服务的 `active` 字段** —— 中文宿主显示中文设置页，单测 5/5；
- **共存策略收缩为 `solo` / `dormant` 两种**：检测到主题就只挂齿轮、不碰列表、不写缩放标记（接管模式已删除）—— 完成并实测；
- 已装进用户的 `desktop` profile（`node scripts/install.mjs --profile desktop`，备份在
  `~/.dsh/backups/desktop-codex-sidebar-20261102-134412/`）—— 待用户 Cmd+Q 重开后确认；
- README、原生日期视图截图、官方设置页截图、主题让位截图 —— 完成。

## 关键决定与原因

1. **不 fork 宿主 `@deepseek-ai/dsh-client-ui-workspace`**，走「DOM 层重排 + 切换分组方式」路线。
   原因：fork 要跟每个 rc 版本；重排只需要 `data-row-key` 与视图 store 的 `setGroupBy`。
2. **默认不进入日期视图**（`dateViewEnabled: false`）。用户要求「默认仍是工作区 + 会话，只有按下铃铛才切换」；
   按铃铛的选择会记住。
3. **屏蔽规则存工作区标题**（与主题版一致）。工作区 id 在扁平/分组之间不稳定；代价是改标题会失配。
   设置页会列出「已屏蔽但当前不存在」的标题，方便取消。
4. **运行中的会话强制进「今天」**。它的 `updatedAt` 可能很久以前，但在看的会话不该被埋进「更早」。
5. **日期视图里隐藏宿主相对时间、改显示工作区标签**。扁平后一行里塞「时间 + 工作区 + 标题」会把标题
   挤成省略号；日期标题已经交代了哪一天。
6. **整页缩放抄 `dsh-claude-style`，绝不写 `body.style.zoom`**。旧做法（行内 `zoom`）在主题在场时把
   主题的 115% 覆盖成 100%，而主题仍按 1.15 写页面尺寸变量 → 页面右侧/底部空带、输入框光标与浮层偏移
   （用户截图里的空白带就是这个）。现在：`body[data-codex-sidebar][data-codex-sidebar-page-zoom]` 上
   `zoom: var(--codex-sidebar-page-zoom-factor)`，同时写 `--codex-sidebar-page-width/height`
   （`innerWidth/倍率`），`:is(dialog,[role="dialog"])` 用页面尺寸封顶。
7. **检测到主题就整体让位（`dormant`），不再提供接管**。原因：主题的缩放含「按倍率搬宿主浮层」
   （`page-scale` 的 scaled layer），独立插件复刻不了；而两边同时重排同一批座位节点会互相还原
   `display`、抢 `groupBy`。用户的诉求也是「关闭对 claudestyle 的修改」。
8. **语言判定读 locale 服务的 `active` 字段**（先服务对象、再 `getSnapshot()`），取不到才退回
   `documentElement.lang` / `navigator.language`。主题同样读 `active`，这是中文宿主上设置页仍显示英文的根因。

## 验证证据（真实页面，Playwright headless，1440×900）

### 原生宿主（profile `codexprobe`：dsh-base + dsh-web-app + dsh-codex-sidebar）

- 初始（全新 localStorage）：`pressed=false`、日期标题 0、工作区行 9 → 默认宿主原视图；
- 点铃铛：6 个段落标题 `Today / Yesterday / Saturday / Friday / Tuesday / Earlier`，工作区行 0，标签 17；
  再点：标题与标签清空、工作区行回 9；
- 点齿轮 → 官方设置页自动停到「Sidebar settings」（导航 6 项）；卡片 564×93 / radius 20px / padding 2px 16px；
  开关 40×22；工作区 8 个复选框只勾「闲聊」；档位 80 / 100 / 125 / 150，默认 100%；
- 点 125%：`data-codex-sidebar-page-zoom="1.25"`、`--codex-sidebar-page-zoom-factor=1.25`、
  `--codex-sidebar-page-width=1152px`、`--codex-sidebar-page-height=720px`、computed zoom `1.25`、
  **无行内 zoom**、`documentElement.scrollHeight=900`（无空白带）、设置页 rect 220,30,1000×840；
  点回 100% → 属性与变量撤掉、computed zoom `1`。

### 主题宿主（profile `codextheme`，额外装 dsh-claude-style 0.19.6）

- 启动（`dormant`）：自有节点只有 `.codex-sidebar-actions` 里的齿轮，无铃铛、无自有日期标题；
  body 上同时有 `data-codex-sidebar` 与主题的 `data-dsh-claude-*`；
- 设置页：导航多出 `Claude Style`，本页排在最后；`cards=0`，只有一句说明
  「dsh-claude-style is installed … this plugin does not modify its UI」；
- 缩放：`data-codex-sidebar-page-zoom` 不存在、无行内 zoom，页面缩放仍由主题控制（`computed zoom` 跟随主题配置）；
- 控制台只有 `[codex-sidebar] applied (en, host en)`；`dsh-better-sidebar` 的
  `panel host geometry mismatch` 警告来自主题自己的 pageZoom，与本插件无关。

### 单元测试

`.debug/test-locale.mjs`：5/5 通过（服务 `active`=zh-CN→zh、en-US→en、服务对象 `locale` 字段→zh、
无服务退回 html lang、服务抛错不崩），中文标签「今天 / 星期六」。

截图：`docs/screenshot-date-view.png`、`docs/screenshot-settings.png`、`docs/screenshot-theme-notice.png`。

## 未验证 / 限制

- **真实桌面 App 里还没确认**：新 bundle 需要用户 **Cmd+Q** 退出后重开才装载；重开后应看到
  齿轮→中文「侧栏设置」、主题在场时只有说明、不再有空白带与光标偏移。
- 主题在场时本插件不提供日期视图与缩放（主题已内置）；想用本插件的日期视图需先停用主题。
- 用户主题还开着 `pageZoom=115`，`dsh-better-sidebar` 仍会报 degraded viewport sync（主题缩放导致，非本插件引入）。
- 折叠成图标栏时不挂按钮；归档视图打开时不进入日期视图（宿主会整体换列表）。

## 下一步

1. 等用户 Cmd+Q 重开 App，在真实 `desktop` profile 里确认齿轮、中文设置页、无空白带/无光标偏移；
2. 若用户想在该 App 用本插件的日期视图：停用 dsh-claude-style（或至少关掉它的 dateGroups），插件会自动切回 `solo`；
3. 待办见 README「待办」（段落折叠、按 id 屏蔽、恢复默认）。
