# 交接：dsh-codex-sidebar

> 最近更新：2026-11-02（缩放：窗口级 page zoom 证实不可用，改页面 CSS + body 浮层补偿；铃铛在有主题时也能用）。

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
- **语言改成响应式源 `createLocale`**（订阅 locale 服务快照 + 最多 30 秒轮询兜底，`get()` 每次现取）
  —— 修掉真实 App 设置页整页英文（宿主导航中文）的问题，热切换实测通过；
- **共存策略收缩为 `solo` / `dormant` 两种**：检测到主题就只挂齿轮、不碰列表、不写缩放标记（接管模式已删除）—— 完成并实测；
- 已装进用户的 `desktop` profile（`node scripts/install.mjs --profile desktop`，备份在
  `~/.dsh/backups/desktop-codex-sidebar-20261102-134412/`）—— 待用户 Cmd+Q 重开后确认；
- **铃铛不再「装上去按了没反应」**：有主题时铃铛挂到工作区行的图标组里，点击转发给主题自己的
  日期铃铛（同一功能，不重复实现），按下态读主题的 `aria-pressed` —— 完成并实测；
- **缩放改成「窗口级优先 + 页面 CSS 兜底 + body 浮层补偿」**：窗口级证实不可用（见决定 10），
  页面 CSS 下 `dsh-better-sidebar` 的面板会压住输入框、弹层字小一圈，用 `src/portal-fit.js` 修掉 —— 完成并实测；
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
9. **语言必须是「活的」而不是 apply 时判一次**。根因：宿主把语言选择存在 Host 用户设置文档
   （namespace `locale`、字段 `preference`），客户端 locale 服务要先 `adopt()` 那份文档，插件 apply
   时常常还读到浏览器推导的 `en`（实测启动日志 `applied (en, host en)`，约 500ms 后才切中文）。
   做法（`src/locale.js` 的 `createLocale`）：`get()/language()` 每次现取；绑定 locale 服务的
   `subscribe`（快照变化即刷新）；服务晚注册时用 500ms 轮询兜底（最多 60 次），绑上且读到宿主值就停；
   语言变化时通知订阅者 → 顶行按钮 aria-label、日期标题、设置页正文与导航标签一起换。

10. **窗口级 page zoom 在本机桌面 App 上不可用**，证据三条：宿主进程带 `ELECTRON_RUN_AS_NODE=1`
    （插件 `require('electron')` 只拿到路径字符串）；`app.asar/lib/main.js` 全文只有 `getZoomFactor()`
    （给菜单换算坐标），没有 `setZoomFactor/zoomLevel/zoomIn`；`ipcMain` 频道表没有任何 zoom 通道，
    preload 的 `dshDesktop` 也没有缩放 API。所以保留路由、实际走页面 CSS。
11. **页面缩放用 `#root { transform }` 而不是 `html/body { zoom }`**：宿主与第三方插件都用
    `getBoundingClientRect` 的视觉像素给 body 上的浮层摆位，transform 下这些数值仍正确；
    `zoom` 会把账号菜单算到视口下方（`y=898 > 900`），直接导致「缩放到 125% 后设置页打不开」。
    代价是浮层大小停在 100% → 由 `src/portal-fit.js` 补 `zoom` + 偏移 ÷ 倍率 + 满屏浮层写尺寸。

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

### 语言热切换（profile `codexprobe`，宿主设置里把 English 换成中文）

- 启动日志 `applied (en, host en)`（与真实 App 同症状）→ 约 500ms 后 `locale → zh (今天)`；
- 切换时设置页开着：导航立刻变成 `账号与余额 / 通用设置 / 模型 / 内置插件 / Agent 预设 / 侧栏设置`，
  本页正文变中文，齿轮 aria-label 变「侧栏设置」；
- 日期视图：标题 `今天 / 昨天 / 星期六 / 星期五 / 星期二 / 更早`，铃铛 aria-label「日期视图」；
- 重启后再看：启动就是中文（宿主已 adopt 偏好），设置页 3 张卡片全中文。

### 单元测试

`.debug/test-locale.mjs`：5/5 通过（服务 `active`=zh-CN→zh、en-US→en、服务对象 `locale` 字段→zh、
无服务退回 html lang、服务抛错不崩），中文标签「今天 / 星期六」。
`.debug/test-locale-live.mjs`：16/16 通过（晚就绪的服务、订阅式服务快照变化、绑定后跟随、
`dispose` 后停止轮询并退订）。

截图：`docs/screenshot-date-view.png`、`docs/screenshot-settings.png`、`docs/screenshot-theme-notice.png`。

## 未验证 / 限制

- **真实桌面 App 里还没确认**：新 bundle 需要用户 **Cmd+Q** 退出后重开才装载；重开后应看到
  齿轮→中文「侧栏设置」、主题在场时只有说明（应为中文）、不再有空白带与光标偏移。
- 主题在场时本插件不提供日期视图与缩放（主题已内置）；想用本插件的日期视图需先停用主题。
- 用户主题还开着 `pageZoom=115`，`dsh-better-sidebar` 仍会报 degraded viewport sync（主题缩放导致，非本插件引入）。
- 折叠成图标栏时不挂按钮；归档视图打开时不进入日期视图（宿主会整体换列表）。

## 下一步

1. 等用户 Cmd+Q 重开 App，在真实 `desktop` profile 里确认齿轮、中文设置页、无空白带/无光标偏移；
2. 若用户想在该 App 用本插件的日期视图：停用 dsh-claude-style（或至少关掉它的 dateGroups），插件会自动切回 `solo`；
3. 待办见 README「待办」（段落折叠、按 id 屏蔽、恢复默认）。

## 本次审计（2026-11-02）

- `npm run build` 通过；`.debug/test-locale.mjs` 5/5、`.debug/test-locale-live.mjs` 16/16 通过；安装/卸载脚本在隔离临时 profile 上三项回读均通过。
- 发现高优先级缺陷：`src/styles.js:104` 的 `background: var(--dsw-alias-state-success-primary, #35c76a)` 含未展开的占位字面量，生成的 `lib/client.js` 也原样包含；运行中小绿点的背景声明会被浏览器判为无效，需改为真实 CSS 自定义属性或直接使用回退色后再复验。
- 发现中优先级缺陷：`src/settings.js:38-46` 在 `localStorage.setItem` 失败时只通知订阅者、不保留内存设置；随后 `readSettings()` 会回到旧值。现有注释“本次会话仍然生效”与实际行为不符。
- 运行时覆盖缺口：本机无头 Chromium 启动被 macOS Mach 权限拒绝，`dsh --profile codexprobe` 未产出可用 URL；因此当前用户未提交的顶栏/缩放改动尚未在本轮独立复验。
- 保留限制：当前 `entry.js:230` 仅在日期视图未激活时调用 `topbar.mount()`；若宿主在日期视图激活期间替换顶栏节点，按钮恢复行为仍需真实页面验证。
## 2026-11-02 补记

- 完成：首段改名（今天 → 优先级 / Today → Priority）；修复日期视图悬停抖动（标题节点复用 + 只比自有节点相对顺序 + display 幂等 + 观察者跳过自写变动）。
- 验证：`.debug/hover.mjs` 实测 codexprobe 0 次 DOM 变动、desktopmirror（含主题）1 次，deltas 全 0；日期标题 [优先级, 昨天, 星期六, 星期五, 星期二, 更早]。
- 未验证：真实 desktop App 需用户 Cmd+Q 重开后确认（本轮只跑 web 镜像 profile）。

## 2026-11-02 消息视图（本轮）

- 用户四条：改名消息视图、悬停滑动 + 隐藏工作区小字 + 最新消息预览、取消缩放与设置按钮、确认 agent.md。
- 改动文件：`src/locale.js`（消息视图文案）、`src/topbar.js`（删齿轮，只留铃铛）、`src/settings-section.js`（删缩放卡片）、`src/entry.js`（删 openOfficialSettings 与 zoom.start；调试出口 `__codexSidebarDebug` 受 localStorage `dsh-codex-sidebar.debug` 控制）、`src/host-data.js`（`previewBySession()`）、`src/date-view.js`（`dressPreview`/`stripPreviews`/marquee/dispose，`titleNodeOf` 改为优先认 `[class*="_title"]`）、`src/styles.js`（两行式行、预览、悬停隐藏标签、marquee 动画、标题间距）。
- 关键数据源：`sessions` 快照 `projectionsBySession[id].values.turnOutline` 的最后一轮（`response` 优先，空则 `prompt`）。`window.__DSH_BOOT__` 不含 ctx，取不到。
- 验证：codexprobe 上 21 行可见、20 行带预览、悬停 `marquee=1` 且标签隐藏、关闭后完全还原（标题 0 / 预览 0 / 工作区行 9）。脚本 `.debug/final-check.mjs`、`.debug/metrics.mjs`、`.debug/marquee.mjs`。
- 未做：真实 desktop App 仍需 Cmd+Q 重开验证；主题共存（dormant 模式）下未跑本轮预览的回归。

## 2026-11-02 取消设置页 + 开放全部会话（本轮）

- 用户：「既然是消息视图，我们直接取消我们的设置页，对所有工作区以及未分组开放，所有的活跃会话都会进入优先级栏目」。
- 改动：删 `src/settings-section.js`、`src/open-settings.js`；`src/entry.js` 去掉 `createSettingsSection` import、`registerSettingsSection()` 与其调用，`inject` 改为 `[]`（`package.json` 的 `dsh.client.inject` 同步）；`src/date-view.js` 的 `arrange()` 去掉 `readSettings()/skipWorkspaces` 过滤，未分组会话用 `copy.ungrouped` 作标签，只跳过认不出 id 的座位；`src/locale.js` 增加 `ungrouped`（未分组 / Ungrouped）。
- 实测（codexprobe，1440×900）：消息视图内 `totalRows=43、visibleRows=43`（改前可见 21），段落仍为 `[优先级, 昨天, 星期六, 星期五, 星期二, 更早]`，预览 42 条，行内标签覆盖全部工作区；bundle 里 `settings.section` 与「侧栏设置」命中 0。
- 遗留：`src/locale.js` 里还留着设置页时期的死文案键（settingsIntro / skipHint / zoom* 等），下次清理；`src/styles.js` 里同类死样式也还没删。

## 2026-11-02 铃铛永远切本插件视图 + 借主题标记（本轮）

- 用户：「这里的闹钟键在停用之后就应该消失，然后我们按这里的闹钟键之后收起了工作区，而不是进入我们的消息会话」。
- 根因（实测）：装 dsh-claude-style 时旧代码把铃铛点击委派给主题铃铛（dormant 模式），点下去开的是主题的日期视图 → 工作区行消失、body 只有 data-dsh-claude-date-groups、ourHeaders=0。
- 改动：`src/topbar.js` 删掉委派分支，点击固定 `dateView.toggle()`，并拦截 pointerdown/mousedown/pointerup/mouseup（铃铛长在宿主工作区行里，不拦会折叠整组）；`src/entry.js` 删掉 mode/dormant/setMode 与 onBellClick/bellPressed 传参，新增 `closeThemeDateView()`、`borrowThemeMarker()` / `returnThemeMarker()`（借 `data-dsh-claude-date-groups`，作为 prepareEnable/afterDisable 传给 createDateView，卸载兜底归还）；`src/constants.js` 增 `THEME_DATE_MODE_ATTR`。
- 借标记的原因：主题 `packages/client/src/features/workspace/workspace-view.ts:195` 与 `:205-208` 会盯着视图 store，发现 groupBy==='flat' 且 body 无该标记就把分组改回 activeGroupBy —— 不借标记，我们的扁平列表会被主题撤销（实测 flatList=0、只剩 1 个标题）。
- 实测（Playwright headless 1440×900）：codextheme 点铃铛 → dateView=true、themeDate=true（借来的）、ourHeaders=6、themeHeaders=0、workspaceGroups 9→0、sessionVisible 3→43、flatList=1、主题铃铛 display:none；再点一次全还原（workspaceGroups=9、themeDate=false）。codexprobe → 标题 [优先级,昨天,星期六,星期五,星期二,更早]、可见 43 行、预览 42、标签 43、bellPressed='true'。
- 文档：README 已按当前行为重写（无设置页 / 无齿轮 / 无缩放 / 无屏蔽工作区）。
- 未决：用户说的「闹钟键在停用之后就应该消失」具体指哪一种（关视图后铃铛消失 / 主题旧铃铛消失 / 停用插件后立即消失）还需确认。

## 2026-11-02 装了主题时会话行文字叠字（本轮）

- 现象（用户截图）：消息视图里两行式会话行的预览溢出到下一行标题上，字叠字。
- 根因（实测）：装 dsh-claude-style 后主题给会话行写了固定高度（row 与座位 span 都是 28px），优先级高于我们的 `[data-codex-sidebar-date-view] [data-row-key^="session:"]` 规则；预览在 flex 换行里照常排版，但行高不跟着长 → 预览 bottom 285+17=302 越过座位 bottom 295，压在下一行标题上。无主题环境行高 38~56px，问题不出现。
- 修复：`src/styles.js` 两条规则都加 `!important`，并补一条三属性选择器 `[data-codex-sidebar-date-view] [data-slot="sidebar"] [data-row-key^="session:"]`（同一组 height/min-height/flex-wrap），只在宿主+主题同时命中时提高权重，solo 环境行为不变。
- 实测（Playwright headless，1440×900，43 行）：codextheme previewOverflow=0、seatOverlaps=0（修前预览越过座位底边）、段落仍 6 段；codexprobe 同样 0/0。截图 `.debug/shot-theme-overlap.png`、`.debug/shot-solo-overlap.png`。
- 探针：`.debug/probe-overlap.mjs`（行列几何）、`.debug/probe-rules.mjs`（规则扫描）、`.debug/probe-height.mjs`（行内 height auto 验证）、`.debug/probe-overlap2.mjs`（相邻座位/预览越界计数）。

## 2026-11-02 崩溃与回滚（重要）

- 现象：17:53-17:54 桌面 App 崩溃重启两次。
- 崩溃日志（~/Library/Logs/DeepSeek Harness）：
  - crash-2026-11-02T09-53-48-937Z-main.log：`DesktopHostFatalError: cannot create effect on inactive context`，栈在 `app.asar/lib/main.js:3831` → `dsh-desktop-host/lib/index.js:83` → cordis `Fiber._reload`。
  - crash-2026-11-02T09-54-06-995Z / 09-54-19-349Z -web-boot.log：`Error: web boot: 19 entries did not activate`，全部卡在等待 `uiWorkspace` / `uiConversation`。
- 时间线：这几条日志正好落在我连续重建 `lib/client.js`（17:37 / 17:44 / 17:52 / 17:55）之后，且 App 主进程当时正开着并 link 指向本仓库 —— 高度怀疑是「插件 bundle 在运行中被替换」触发宿主热重载（cordis reload）时上下文已失效，属于宿主 reload 路径的报错，不是我们代码里显式抛的异常。
- 处置：`git checkout 5788b88 -- src lib` 回滚到 5788b88（最后一次在真实 App 里稳定跑了半小时的版本，`lib/client.js` 67655 B），未完成的改动全部 `git stash`（stash@{0}「wip: 预览 markdown 清理 + 悬停图标收敛 + 撤销 marquee（崩溃后暂存）」）。
- 回滚后验证（desktopmirror 49820，含主题链路）：控制台只有 `[codex-sidebar] applied (en)`，无 pageerror；点铃铛 → 6 段标题（Priority/Yesterday/…）、可见 43 行、工作区行 0、主题日期标题 0。
- 教训：App 运行时不要重建 `lib/client.js`；要改就先改源码，等用户 Cmd+Q 之后再构建，或临时从 desktop 的 bundles 里摘掉本插件。
