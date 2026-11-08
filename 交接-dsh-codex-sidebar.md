# 交接：dsh-codex-sidebar

> 最近更新：2026-11-08（展开工作区不再「弹一下」：superagent 伪行提前藏 + 主题紧凑行高提前压 + 宿主 FLIP 位移按有效缩放折算，七环境复测归零）。
> 此前 2026-11-02：深入可用性与稳定性复核定稿，版本 0.2.0；高频切换、长短标题滑动、退出还原全绿。

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
- README、原生日期视图截图、官方设置页截图、主题让位截图 —— 完成；
- **铃铛按下态配色由琥珀改为 DeepSeek 品牌蓝 `#4D6BFE`**（浅/深色同一档；`--codex-sidebar-accent`
  保留为外部覆盖口）—— 完成并实测：`codexprobe`（原生宿主）与 `desktopmirror`（桌面同款 bundle）
  探针在 `aria-pressed=true` 时读到 computed color `rgb(77, 107, 254)`；改前 `rgb(169, 114, 15)`（琥珀）。
  对照截图在 `.debug/`（本地、不入库）：`bell-before-sidebar.png` / `bell-after-sidebar.png` /
  `bell-after-dark-sidebar.png`。

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

截图：`docs/screenshot-date-view.png`（设置页时期的 screenshot-settings.png / screenshot-theme-notice.png 已随设置页移除删掉）。

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

> **状态：已回滚。** 下面两节记录的改动在 2026-11-02 17:58 随崩溃回滚中止（`git checkout 5788b88 -- src lib`），
> 代码里已经没有它们；这里保留作记录，现行行为见「崩溃与回滚」之后的补记。

## 2026-11-02 又一轮：把主题的日期布局整个删掉（本插件改为独占侧栏）

- 方向（用户 18:0x 三条回答）：不再和主题抢同一个铃铛 —— 直接把 claude-style 的「日期布局」特性删掉，没有插件就不该有那颗小铃铛。
- 已做：主题仓库 dsh-claude-style（本地克隆）删 `features/date-groups/` 全目录、`features/settings/settings-tab-date-layout.ts`、`active-shelf` 里的铃铛、`prefs.ts` 的两个偏好项、`workspace-view.ts` 与 `active-first.ts` 里两处 `data-dsh-claude-date-groups` 守卫；`npm run build` 与 `npm run lint` 通过。
- 验证环境：两个与生产隔离的 web profile（`.testhome/profiles/webclean` 无主题 / `webtheme` 带主题，端口 49830 / 49840），`DSH_HOME=$PWD/.testhome` 起服务，探针 `.debug/probe-two-envs.mjs`。
- 结果：webtheme 里主题铃铛计数从 1 变 0，放大镜还在；我们的 `data-codex-sidebar-bell` 两边都在，5 个会话行 / 9 个工作区行正常。

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

## 2026-11-02 19:00 主题删掉日期布局，本插件独占侧栏（本轮）

用户指令：主题的日期布局删掉；主题里不要那颗铃铛；我们的插件测试放到 web profile 与生产隔离；本地用我们自己的插件；给插件配一个图标。

改了什么（主题仓库 dsh-claude-style（本地克隆），HEAD 原 `8e2f76a`）：
- 删 `packages/client/src/features/date-groups/`（5 个文件）与 `features/settings/settings-tab-date-layout.ts`；
  `settings.ts` 去掉 import 与注册，`settings.copy.json` 删四组文案，`contracts/src/prefs.ts` 删 `dateGroups`/`dateSkipWorkspaces`，
  `core/feature.ts` 的 `SettingsTabId` 去掉 `'date-layout'`，`core/scheduler.ts` 去掉 `dateGroups` 句柄，
  `workspace/workspace-view.ts` 与 `active-first/active-first.ts` 删掉原来的 `data-dsh-claude-date-groups` 守卫。
- `features/active-shelf/` 重写：只留放大镜，铃铛（`-trigger`、`-count`、`RUNNING_ATTRIBUTE`、订阅）全部移除，manifest 的 contracts 与 `ungated` 文案同步。
- 新加三处让位守卫：`workspace-view.ts` 的 `reconcile()` 与 `healGrouping()`、`active-first.ts` 的 `reorder()`，
  条件是 `document.body.hasAttribute('data-codex-sidebar-date-view')`——外部插件声明接管时，主题不再把扁平分组改回工作区、也不再重排行。
- `npm run build` 通过（`built lib/client.js (1012866 bytes)`），`npm run lint` 通过；`npm test` 跑不了（本机无 Chrome，vitest 报 `no Chrome or Edge found`，改造前就这样）。

改了什么（本仓库）：
- `src/coexist.js` 新增 `themeHasDateView()`，`src/entry.js` 用它判定 solo/dormant：主题在但日期视图被删掉时走 solo。
- `src/date-view.js` 把 `data-codex-sidebar-date-view` 标记提到 `viewStore.flatten()` **之前**写，失败时一并撤掉；
  顺序反了会被主题的 reconcile 看到扁平就改回工作区分组（实测只剩 5 行，改后 46 行）。
- `src/styles.js` 补回 `c248966` 的会话行高度修正（`height: auto !important` + 三属性选择器）。
- `src/topbar.js` 注释去掉「铃铛 + 齿轮」的过时说法。
- `package.json`：`description` 改成消息视图语义、`icon` 指向 `assets/icon.svg`、`files` 带上 `assets`。
- 新增 `assets/icon.svg`（36×36，渐变圆角方块 + 三条消息条 + 右上角铃铛，铃铛用背景色描一圈分离线以免小尺寸糊在一起）。

装到桌面（本机生产 App）：
- `~/.dsh/profiles/desktop/node_modules/dsh-claude-style/lib` 用本地构建产物替换，旧目录备份在 `lib.backup-20261102-184901`；
  回滚命令：`rm -rf <lib> && mv <lib.backup-20261102-184901> <lib>`。
- `node scripts/install.mjs --profile desktop` 装本插件（bundles / patch / link 三处都已写）。
- App 用 SIGTERM 退出后重开（`osascript quit` 对它不生效），新进程监听 49564。

验证证据：
- webclean（无主题）与 webtheme（主题在、日期视图已删）：都进入本插件视图，6 段标题
  `Priority / Yesterday / Saturday / Friday / Tuesday / Earlier`、46 行、44 个预览、46 个 chip、座位重叠 0。
- 桌面同 profile 的镜像（desktopprobe，复制 desktop 的 package.json 与 node_modules 软链）：本插件已注入
  （`data-codex-sidebar` + `data-codex-sidebar-bell`），铃铛挂在 `sidebar.workspaces` 行（aria-label `Message view`），
  点下去 46 个座位，主题铃铛计数 0。
- 未验证：桌面 App 窗口内的实际观感与点击（App 需要令牌，外部探针 401；只能由用户在窗口里点一次确认）。

坑：
- `osascript -e 'quit app "DeepSeek Harness"'` 对桌面 App 无效，仍要用 `pkill -TERM -f "DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"`。
- 守卫脚本原来用 `pgrep -f` 判断 App 是否在跑，实测匹配不到，会在运行中替换主题 lib；改成 `ps -Ao comm= | grep -qxF` 才可靠。
- 主题的 `.debug/` 与 `shots/` 在这两个仓库里都是忽略目录，探针与截图不要提交。

## 2026-11-02 可用性检查与日常 Bug 修复

针对日常高频使用场景进行了可用性排查，修复了以下日常使用可能触发的问题：
1. **侧栏折叠再展开后铃铛永久丢失**：`src/entry.js` 的 `schedule()` 中移除了 `!dateView.isActive()` 条件限制；`topbar.mount()` 自身具备 `actions.parentElement === host` 幂等保护，保证侧栏折叠展开后铃铛正常恢复，避免无法退出消息视图。
2. **初始化运行时未捕获异常**：删除了 `src/entry.js` 中不存在的方法调用 `portalFit.start()`，消除侧栏就绪时必报的 `TypeError`。
3. **鼠标快速扫过列表导致标题横向滑动失控且偏位**：重构 `src/date-view.js` 的 `startMarquee` / `stopMarquee`，引入排队 token 机制，当鼠标在两帧延迟内移出时立即取消并终止后续动画；在 `disable()` 和 `dispose()` 中增加 `stopAllMarquees()` 彻底清除活跃滑动与 track 包装，避免文字停留偏位与嵌套。
4. **运行中会话小绿点背景损坏**：`src/styles.js` 中的 CSS 变量语法修正为 `--dsw-alias-state-success-primary`（回退标准绿），小绿点恢复正常显示。
5. **点击铃铛误触发工作区折叠**：`src/topbar.js` 为铃铛补充 `pointerdown`、`mousedown`、`pointerup`、`mouseup` 的 `stopPropagation()` 拦截，避免宿主工作区行折叠展开。
6. **新建会话排序沉底**：`src/date-view.js` 会话时间提取优先使用 `updatedAt`，若无则使用 `createdAt`，再次兜底当前时间 `now`，确保新建会话处于「优先级/今天」，不会因时间为 0 被扔到「更早」最末端。
7. **多余旧段落标题（孤儿 Header）残留**：`src/date-view.js` 的 `arrange()` 在复用标题后，对 `spareHeaders` 中未被复用的多余旧标题显式调用 `remove()`，防止段落减少时留下孤儿标题。
8. **微任务自激与多余调度**：`src/entry.js` 扩展 `isOurMutation` 判定，检查 `addedNodes` / `removedNodes` 是否全为本插件节点，杜绝每次修改列表都多跑一轮 rAF 调度。
9. **内存态防掉**：`src/settings.js` 增加 `memorySettings` 缓存，在 `localStorage` 写入失败时保证本次会话内设置依然生效。
10. **代码规范**：所有修改位置均补充了完整清晰的中文注释。产物已重新打包 `npm run build`。

### 上述十条的复核（2026-11-02 19:45，实测）

逐条对着代码和真实页面核过，结论：十条全部属实，没有需要返工的假修复。

- 折叠再展开：实测折叠后铃铛消失、展开后回来（`bellAfterCollapse=false / bellAfterExpand=true`），
  点下去进消息视图 46 行——第 1 条成立。
- `grep portalFit.start src/` 无命中——第 2 条成立。
- 快速扫过前 10 行后：`tracksLeft=0 / marqueeLeft=0 / 残留 transform=0`；真悬停仍是
  `matrix(1,0,0,1,-120.86,0)` 且 1.2 秒后不再变化——第 3 条成立。
- 小绿点：插入一个 `.codex-sidebar-dot` 实测 `background=rgb(34,197,94)`、`5px`、`50%`，
  宿主的语义绿 token 解析成功，不是靠 `#35c76a` 兜底——第 4 条成立。
- 铃铛 `pointerdown/mousedown/pointerup/mouseup` 四道 `stopPropagation` 都在——第 5 条成立。
- `updatedAt → createdAt → now` 三级兜底在 `date-view.js` 的 `arrange()` 里——第 6 条成立。
- `spareHeaders` 复用后对未复用的旧标题显式 `remove()`——第 7 条成立。
- 第 8 条原来分成两处判（函数头看 `target`、尾部用 `isOurNode` 再看 `addedNodes/removedNodes`），
  行为对，但同一件事写了两遍；已收敛成一个 `isOurMutation`，并补上「target 落在滑动轨道里」
  这一面。改完复跑真悬停，位移与静止态都没变。
- `settings.js` 的 `memorySettings` 读写都落地——第 9 条成立。
- 注释与产物：`npm run build` 输出 76.3 KiB。

## 2026-11-02 20:10 整份移除整页缩放（版本 0.2.0）

用户指令：缩放可以扔了，版本号可以更新了。

删掉的东西：
- `src/zoom.js`（151 行）与 `src/portal-fit.js`（234 行）整个文件；`entry.js` 里的创建、
  `applyZoomFromSettings()`、`applyPortalFit()`、resize 监听、卸载序列里的三个释放步骤一起删。
- `constants.js` 的 `DEFAULT_SETTINGS.zoom`、`ZOOM_STEPS`、`ZOOM_RANGE`、`ZOOM_ATTR` / `ZOOM_VAR` /
  `ZOOM_WIDTH_VAR` / `ZOOM_HEIGHT_VAR`；`settings.js` 的 `zoom` 归一化与 `ZOOM_RANGE` import。
- `styles.js` 里的整页缩放规则（`#root { transform: scale(...) }`、body 与 html 的 hidden、
  弹层按页面尺寸封顶那几条）与两段重复的缩放控件样式，共 137 行。
- `locale.js` 五组缩放的两种语言文案。
- `lib/index.js` 从 123 行收成空壳：宿主半边原本只做 `/codex-sidebar/api/zoom` 这一条路由，
  路由没了就没有逻辑可留；保留 `name` 与空 `apply()` 只是为了让 `cordis.patch.yml` 的
  `ui-codex-sidebar` 条目仍能 import 到本包 main（条目加载不起来，客户端半边也不会注入）。

版本号：`package.json` 0.1.0 → 0.2.0。

验证（两个隔离环境，重启后真机探针）：
- webclean 与 webtheme 都是 6 段（Priority / Yesterday / Saturday / Friday / Tuesday / Earlier）、
  46 个座位、44 条预览、座位重叠 0，控制台只有一行 `[codex-sidebar] applied (en, host en)`。
- webtheme 那 3 条 404 与本轮无关（删缩放前后都在，服务端日志里查不到）。

坑：删 `styles.js` 的缩放控件样式时，一起删掉了 CSS 模板的收尾反引号与分号，
esbuild 报 `src/styles.js:416:1: ERROR: Unterminated string literal`；补回后产物 76.3 KiB → 60.9 KiB。

## 2026-11-02 深入可用性与稳定性复核（本轮定稿）

### 1. 接手会话与上下文回溯
- 定位到历史会话 `~/.dsh/sessions/--Users-apple-Desktop-SuperCode-Project-dsh-codex-messagesidebar--/session-5c2ceba5-6c28-4aaa-bd22-0fe9154b5f26`。
- 上下文梳理：Turn 10 逐条核实 10 项可用性修复并收敛 `isOurMutation` 观察者判定（`b21b52d`）；Turn 11 进行全仓体检，清理包清单 LICENSE 与 8 处无用符号导出（`b8c93cf`）；Turn 12 彻底清理缩放代码并升级版本至 0.2.0（`ea153e3`）。

### 2. 深入可用性与边界测试实测证据
编写复合动作探针脚本 `.debug/probe-deep-usability.mjs`，在当前运行的两个隔离 web profile 环境（`webclean:49830` 原生皮肤、`webtheme:49840` claude-style 主题皮肤）中进行了 Playwright headless 真机实测：

1. **高频连续切换测试（状态机自激与死锁防护）**：
   - 模拟用户在 80ms 间隔下连续 5 轮（10 次）快速点按铃铛进出消息视图。
   - 结果：两端均未发生微任务自激死锁，视图最终稳定展开；原生环境座位保持 47 个、主题环境保持 46 个；段落标题均为 6 个（`Priority / Yesterday / Saturday / Friday / Tuesday / Earlier`）；未产生任何孤儿 Header（`orphanHeaders: 0`）。
2. **长标题悬停与短标题滑动边缘测试**：
   - 长标题（45字符）：两帧延迟后正常启动平移，位移量分别为 `-89.5px`（webclean）与 `-76.19px`（webtheme），平滑缓动；鼠标触发 `mouseout` 后，`.codex-sidebar-marquee-track` 轨道节点被立即彻底拆解还原，文字回归主标题节点，无残留类名与内联变换。
   - 短标题（窗口可完整容纳）：计算得出 `distance <= 4`，判定无需滑动，不建立多余的 DOM 轨道包装。
3. **退出消息视图彻底还原验证**：
   - 铃铛切换关闭消息视图后，全量节点回读核实：`leftHeaders = 0`、`leftPreviews = 0`、`leftChips = 0`、`leftTracks = 0`、`leftMarqueeClasses = 0`，`data-codex-sidebar-date-view` 属性彻底移除，宿主原生侧栏 100% 还原。

### 3. 代码审查发现的遗留清理项（待办建议）
代码目前逻辑健全、运行健康，但伴随此前设置页与工作区屏蔽逻辑下线，存在以下已无调用者的死代码可随时清理：
1. `src/styles.js`：第 233~408 行仍留存约 175 行旧设置页样式（`.codex-sidebar-settings*`、`.codex-sidebar-switch*` 等）。
2. `src/locale.js`：中英用词表中残留 9 个未被引用的死键（`settingsTitle`、`skipSection`、`skipHint`、`settingsIntro`、`dateViewHint`、`themeNoticeDesc`、`emptyWorkspaces`、`untitled`、`skipped`）。
3. `src/constants.js` 与 `src/settings.js`：`skipWorkspaces` 默认配置和归一化逻辑已无调用（消息视图已对全部工作区和未分组开放）。
4. `src/host-data.js`：`previewBySession()` 上方存在连续两段重复的 JSDoc 注释。

### 4. 交付状态与桌面 App 说明
- 本地 `lib/client.js` 构建产物为 60.9 KiB，版本号 0.2.0。
- `~/.dsh/profiles/desktop` 的软链接与补丁均已指向最新版本。
- 桌面 App 关窗不退进程，用户在需要时使用 **Cmd+Q** 彻底退出并重启 App 即可加载最新 0.2.0 bundle。

## 2026-11-02 20:35 与 dsh-superagent 配合：主会话进入「优先级」

用户要求：对 superagent 插件做适配，主会话也应该进入优先级栏目。

对面怎么做的（读 `dsh-superagent/lib/client.js` 的 `installMainSessionEntry`）：
- 主会话（`orchestrator-` 开头的会话）的行被写成行内 `display: none` 藏起来，
  改在每个工作区组标题上挂一颗 M 气泡（`data-main-session-entry`）当入口；
- 它另有一个 `MutationObserver` 盯着 `document.body`，每次变动都重跑 `hide(hidden)`，
  `hidden` 就是 `/orchestrator/api/state` 返回的 `masterIds`。

后果：本插件把列表拍平后组标题没了，M 气泡一起消失，主会话彻底没有入口。

适配做法（`src/superagent.js` + `src/date-view.js`）：
- 新模块 `createSuperagentBridge`：带 `x-orchestrator-request: 1` 去问
  `/orchestrator/api/state`，把 `masterId` 与 `masterIds` 合成集合；5s 刷新、失败 30s 退避、
  连续 3 次失败就认定没装 superagent。
- 主会话的座位挂 `codex-sidebar-main-session` 类，样式表用
  `display: flex !important` 把行顶回可见；**行内保持 `none` 不动** ——
  对面只在「行内不是 none」时才动手，于是它认为早就藏好、不再来改写，
  不会变成「你写我改」的观察者互激。
- 主会话**不置顶**：它跟普通会话走同一套归段与排序规则（运行中的进「优先级」，否则按时间归段），只是行内标签写「主会话」（`copy.mainSession`）以便辨认。2026-11-02 20:48 按用户要求改的，此前是固定排最前。
- superagent 自己的其它会话（`worker-` 执行者、其它 `orchestrator-` 评估）照样不进列表：
  原来是我们把它们的 `display` 从 none 改回可见，现在直接跳过、不碰它们的样式。

验证：两个隔离环境（webclean / webtheme）点铃铛后 6 段、座位 56 / 55、重叠 0、无新报错；
用探针造一行 `data-row-key="session:orchestrator-probe"` 并写行内 `display:none`，
带类时计算值 `flex`、可见；不带类的对照仍是 `none` —— 顶回可见的机制成立。
真机效果要等桌面 App 重启后看（本机 profile 里 superagent 的 stateDir 被运行中的 App 占着，
第二个实例起不来，没法在探针里跑真数据）。

## 2026-11-02 20:20 按交接文档修 bug（本轮）

用户指令：按交接文档修 bug，不再推进旧任务。本轮做了四件事。

### 1. 死代码清理（交接文档「遗留清理项」四项全清）
- `src/styles.js`：删第 233~408 行约 175 行旧设置页样式（`.codex-sidebar-settings*`、`-switch*`、`-check*`）。
- `src/locale.js`：删 9 个无引用死键（`settingsTitle`、`skipSection`、`skipHint`、`settingsIntro`、
  `dateViewHint`、`themeNoticeDesc`、`emptyWorkspaces`、`untitled`、`skipped`），只留
  `today/yesterday/earlier/weekdays/ungrouped/mainSession/toggleDateView`。
- `src/constants.js`：错位的 `DATE_MODE_ATTR` 注释归位；`DEFAULT_SETTINGS` 去掉 `skipWorkspaces`
  （现只剩 `dateViewEnabled: false`）。
- `src/settings.js`：`normalize` 只保留 `dateViewEnabled`。
- `src/host-data.js`：合并 `previewBySession()` 上方重复的 JSDoc。
- `src/entry.js`：删陈旧设置页注释。

### 2. 预览里的 markdown 记号（真 bug，已修）
根因：宿主 `projectionsBySession[id].values.turnOutline.response` 每条都是**单行且已截断到 120 字符**，
所以 `src/preview-text.js` 里所有 `/^…/gm` 行首规则都命中不到，中段的 `## 标题`、`|---|---|`、`> ` 原样留在预览里。
修法：在「列表记号」规则之前加四条**中段**规则（井号要求前为空白/行首且后跟空白，避免误伤 C# 与 issue #216；
表格分隔行压成空格；`---` 分割线；引用记号）。离线单测 `.debug/test-preview.mjs` 五例全过，
真机 `previewMarkdownDirty` 由 5 降到 2，剩下 2 条是探针误报（`#216`、`issue #97074` 属正常文字）。

### 3. 20 行会话悬在第一个日期标题之前（真 bug，已修）
现象：消息视图里 20 个座位排在「优先级」标题前面（flatList 62 个孩子：前 20 个座位、第 21 个才是标题）。
根因：`arrange()` 里对 superagent 自家会话（`worker-` / `orchestrator-` 前缀）无条件 `continue`。
但「跳过」这个判断只在**装了 superagent** 的宿主才成立 —— 那里对面自己把这些行写成 `display:none`；
没装 superagent 的宿主里这些 id 只是普通会话、行没人藏，跳过后它们既可见又不进任何段落。
修法：
- `src/superagent.js` 增 `available: () => checkedAt !== 0`（状态路由至少成功回过一次才算「装了」）。
- `src/date-view.js` 的让位条件加上 `superagentAvailable(superagent)`；若确实要跳过而该行还可见
  （对面还没动手），我们自己写 `display:none` 并记进 `leashedSeats`，退出消息视图时只还原自己改过的行，
  不动对面已经藏好的行。

### 4. 清理与验证
- `.debug` 里一次性探针（probe-order / probe-sequence / probe-seat-classes 等）已删，只留 `verify.mjs` 与 `probe-cycle.mjs`。
- 两个隔离环境（`.testhome` 的 webclean 49830 / webtheme 49840）实测：铃铛点开 → 6 段
  `[Priority, Yesterday, Saturday, Friday, Tuesday, Earlier]`、第一个孩子就是标题、**悬空行 0**、
  55 个可见座位（27/21/3/1/1/2）、工作区行 0；再点一次 → 标题与标签清空、工作区行回到 11、
  `stored = {"dateViewEnabled": false}`；控制台只有 `[codex-sidebar] applied` 与既有 404。

### 5. 待办（本机限制）
`lib/client.js` 这次**还没有覆盖**：桌面 App 正在运行（进程 98662，19:38 启动），
在 App 运行时重写仓库里的 `lib/client.js` 会触发宿主热重载踩空
（`DesktopHostFatalError: cannot create effect on inactive context`，已踩过两次）。
正确顺序：退出 App（Cmd+Q，关窗不退进程）→ `node scripts/build.mjs` → 重新打开 App。

## 2026-11-03 收录到 awesome-dsh-plugin 前的整理（本轮）

目标：按 https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md
自查隐私与可用性，修好后把插件登记进插件市场。决定与证据：

- **隐私**：跟踪文件与 git 全历史扫过，无密钥；3 处本地绝对路径（README、本文件 :158、:195）已换成文字描述。
  `docs/screenshot-date-view.png` 原来带着真实账号昵称、真实会话标题与工作区名，已用 `.debug/shoot-docs.mjs` 重拍成示例文案
  （给行设 `data-demo-title` / `data-demo-preview` / `data-demo-chip`，再注入 `::after { content: attr(...) }` 覆盖显示；
  直接改 textContent 会被插件每轮 arrange 重写，只有 data-* 属性能留下）。另外 3 张无引用截图已删。
- **可用性（公开安装路径实测）**：`dsh plugin --profile pubtest add link:<本仓库>` 会自动把包写进
  `dsh.profile.bundles`（dsh-app-boot 的 reconcileProfilePlugins），**不需要再手写 cordis.patch.yml 的 insert**。
  pubtest profile（端口 49840）实测：控制台只有一次 `[codex-sidebar] applied (en)`；铃铛 aria-label="Message view"，
  点击后 6 段标题 `[Priority, Yesterday, Sunday, Saturday, Friday, Earlier]`、可见 57 行，再点还原 10 个工作区行。
- **发现并修掉的冗余**：`dsh --profile desktopmirror --dump-config` 里 `ui-codex-sidebar` 出现两次
  （bundle 自带 patch + 旧 install.mjs 手写的 insert）→ `scripts/install.mjs` 改为只做
  dependencies `link:` + `dsh.profile.bundles` + node_modules 符号链接三件事，并新增 `stripLegacyPatch()`
  在装/卸时顺手删掉旧的 insert 段。
- **发布元数据**：`package.json` version 0.3.1、`private` 去掉、补 `repository` / `bugs` / `homepage`；
  新增 `LICENSE`（MIT, 2026 mengzhongjie）；README 安装段改成 `dsh plugin --profile <profile> add github:mengzhongjie/dsh-codex-sidebar`，
  并说明桌面 App 自带 pnpm 的路径与垫片写法。
- **已完成（同日）**：仓库转 public（MIT、topics: dsh-plugin / dsh / deepseek-harness / sidebar / ui、description 改成消息视图的说法）；
  `dsh plugin --profile ghinstall add github:mengzhongjie/dsh-codex-sidebar` 从 GitHub 实装并实测通过
  （自动写入 bundles=[base, web-app, dsh-codex-sidebar]，控制台一次 `[codex-sidebar] applied (en, host en)`，
  铃铛 aria-label="Message view"、点击后 6 段标题 [Priority, Yesterday, Sunday, Saturday, Friday, Earlier]、
  可见 58 行、工作区行 0，再点还原 10 个工作区行）；补 `assets/icon-180.png` 与 `screenshots.json`；
  向 awesome-dsh-plugin 提 PR **#11641**（条目 `data/plugins/mengzhongjie__dsh-codex-sidebar.yml`，category ui，带图标）。
  该仓库 CI 的 gate 会跑 dsh.bundle 检查、仓库年龄、awesome-lint 与站点构建。

### 结果（2026-11-03 17:18）
PR https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/11641 的 `check` 全部 31 个步骤 success
（含 dsh.bundle 检查、仓库年龄、READMEs match data/plugins、awesome-lint、Added-date / Capability-disclosure /
Discussion-adoption / Entry-path tests、Build 站点构建），mergeable=MERGEABLE，暂无 review 与标签。
剩的是维护者合并：合并后条目会出现在仓库生成的 README / 站点上。之后没有本侧动作；
若被要求改描述或补截图，改 `data/plugins/mengzhongjie__dsh-codex-sidebar.yml` 再推同一分支即可。


## 2026-11-04 关掉列表横向滚动（本轮）

用户反馈（16:51，附图）：消息视图列表底部有一条灰色横向滚动条压在「昨天」标题上，「把这里的左右滑动的功能删掉，我们这里固定住」。

- **根因**：宿主的滚动容器是 `[data-slot="sidebar"] div.bhn1Oq_list`（`overflow-x: auto; overflow-y: auto`）。
  我们的行有 `padding-left` 与 chip 等宽度，内容超宽时就渲染出横向滚动条，视觉上正好盖住段落标题。
  headless 下量不到横向溢出（sw=cw），所以做法是防御性锁定而不是「消灭某个具体元素」。
- **实现**：新增 `src/no-hscroll.js`，`createNoHScroll()` 从 `[class*="flatList"]` 沿祖先链（到 `[data-slot="sidebar"]` 后再带上侧栏祖先）
  收集 computed `overflow-x` 为 auto/scroll 的节点，写内联 `overflow-x: hidden`（纵向不可滚时写 `clip`），原值存 Map 供还原。
  `src/entry.js` 在 `schedule()` 的 rAF 里按 `dateView.isActive()` 调 `apply()` / `restore()`，插件卸载时还原。
  `src/styles.js` 给 `.codex-sidebar-date-header` 补 `box-sizing: border-box` / `max-width: 100%`，给 `.codex-sidebar-preview` 补 `max-width: 100%`。
- **证据（Playwright headless 1440×900，两个 profile）**：codexprobe 与 desktopmirror（主题 + better-sidebar）都是
  `bhn1Oq_list ox=hidden inlineOx="hidden"`，其余祖先保持 visible，纵向滚动 `ok=true after=200`，rows=65、headers=7。
  点真铃铛（`.codex-sidebar-actions button`）退出后：`headers=0`、`groups=10`、页面内残留 `[style*=overflow-x]` 为 0。
- **踩坑**：`[data-codex-sidebar-bell]` 命中的是 **body**（那是「铃铛已挂载」标记），真按钮在
  `.codex-sidebar-actions > button`；用它点击等于给 body 派发 click，什么都不会发生。
## 2026-11-04 真机没修的根因 + 启动双视图（本轮）\n\n用户两条反馈（15:58）：「还是没有修复成功」（预览越出灰栏）、「启动的时候闹钟按着会发生工作区和消息视图同时存在」。\n\n### 1. 为什么真机没修上（预览越界那条）\n\n- 上一轮把修好的 bundle 暂存到 ，用  等 App 退出后替换仓库里的\n  。日志  里只有反复的  → ，\n  da39a3ee5e6b4b0d3255bfef95601890afd80709  - /        0       0       0 的输出全是空——launchd 的 PATH 极简，脚本里没写绝对路径，命令全部失败；\n  仓库  一直是旧的 61502 B（sha c04e1571…），所以界面当然没变。\n- 更深一层：仓库在 ，macOS TCC 会拒绝 launchd 进程读写桌面（实测\n  ）。**只要发布目录在桌面，后台替换就不可能成功。**\n- 处置：桌面 profile 的  依赖改成 \n  （备份 ），并把修好的构建发布到该目录；\n  新增 （源仓库：/Users/apple/Desktop/SuperCode/Project/dsh-codex-messagesidebar
发布到：/Users/apple/.dsh/plugins/dsh-codex-sidebar
  package.json -> /Users/apple/.dsh/plugins/dsh-codex-sidebar/package.json
  cordis.patch.yml -> /Users/apple/.dsh/plugins/dsh-codex-sidebar/cordis.patch.yml
  lib -> /Users/apple/.dsh/plugins/dsh-codex-sidebar/lib
  LICENSE -> /Users/apple/.dsh/plugins/dsh-codex-sidebar/LICENSE
  assets -> /Users/apple/.dsh/plugins/dsh-codex-sidebar/assets
完成：lib/client.js 61502 字节，sha256 c04e15717044462f98e168cc7bf8a34b9b043db19b4fafcf5a873a52fff3d3da
桌面 profile 需把依赖链到该目录：dsh plugin --profile desktop add link:/Users/apple/.dsh/plugins/dsh-codex-sidebar）作为「仓库 → 发布目录」的唯一通道。\n  仓库仍是源码与构建的唯一来源，但**桌面 App 不再直接加载仓库**。\n\n### 2. 启动即开消息视图时，两种视图并存\n\n- 复现（.debug/run-boot.mjs + prep-boot-on.js + measure-boot.js，两个 web 宿主都命中）：\n  ，控制台出现\n  。\n- 根因链：\n  1.  启动时无条件自愈：看到 localStorage 里的分组备份 + store 已被宿主持久化成 flat，\n     就  并清掉备份。但这次 flat 是用户设置  的**正当状态**。\n  2. 紧接着  →  又切回 flat；宿主水合晚一步，把分组写回 workspace。\n  3. 此时  已是 true， 的  不成立，\n     再也不会重新扁平化； 于是把日期标题插进了工作区分组容器。\n- 修复：\n  -   增加前置判断： 为 true 时直接返回（不碰。\n  -   开头校验 ：不一致就重新  并等下一帧，\n    连续最多  帧（防死循环）；容器里仍有  时这一帧不插标题。\n  -   加 （上一轮的溢出修复，本轮才真正进构建）。\n- 验证（影子副本 /tmp/codexfix2 → 发布目录，Playwright headless 1440×900）：\n  - 启动即开：solo ；\n    theme（dsh-claude-style + better-sidebar）同样 ，无自愈日志。\n  - 启动关闭：solo ；theme 。\n  - 预览越界（.debug/measure-overflow.js）：solo 63 条预览全部 （行内），theme 34 条全部 ；\n    、（行 256）。\n  - 发布目录实测：codexprobe 指向  后启动即开 。\n- 提交：（只含 src，**lib 尚未提交**，\n  App 退出后才能安全重建仓库 lib 并补提交）。\n\n### 3. 本轮的真机流程\n\n- 桌面 App（pid 9920，14:04:44 启动）运行时替换仓库  会触发宿主热重载踩空（已两次），\n  所以本轮只改 profile 依赖与发布目录，**不动仓库 lib**。\n- 已装 （脚本 /tmp/dsh-reopen-after-quit.sh）：\n  用户 Cmd+Q 退出后约 1–2 秒自动 ，App 从发布目录加载新 bundle。\n  该 waiter 只跑   PID TTY           TIME CMD 与 ，不读写用户目录，避开 TCC。\n- 下次接手要看：App 重启后首屏是否仍是消息视图但**没有**工作区分组；预览是否还在灰栏内；\n  仓库  需要重建并提交； 仍按 link 仓库工作（装到新 profile 时用），\n  桌面 profile 已是 link 发布目录。\n
## 2026-11-08 展开工作区时的「弹一下」（本轮）

用户反馈（m06464）：打开一个工作区时，下面那组会先往上一跳再落回来，问是谁的问题。

### 结论：三个来源叠在一起，已全部修掉

1. **dsh-superagent 的行内 `display:none`（主因，量到 50%~96%）**
   它在 `installMainSessionEntry` 的 `hideOwn()` 里用行内样式藏 `worker-` / `orchestrator-` 会话行与同名伪工作区，
   并用 `MutationObserver(document.body, {childList:true, subtree:true})` 盯着整棵子树。宿主每次展开/折叠都重建行，
   React 先把行插进来（列表变高）→ 宿主 AnimatedRows 读到这个「还没被藏」的位置（实测行进 266px、落定 132px，正好 2 倍）
   → 之后 superagent 的 observer 才写 `display:none` 把行缩掉 → 宿主拿到的位移比真实位移大一截。
   **修法**：`src/styles.js` 用静态 CSS 提前藏掉 ——
   `body[data-codex-sidebar] [data-row-key^="session:worker-"], body[data-codex-sidebar] [data-row-key^="session:orchestrator-"]:not(.codex-sidebar-main-session){display:none!important}`。
   用 `:not()` 让开主会话（主会话靠 `.codex-sidebar-main-session` 的 `!important` 规则显示）。

2. **主题的紧凑行高在测量之后才生效（残余 14%）**
   主题把 `height:28px` 挂在自己打的 `[data-dsh-claude-part~=session-row]` 上，而那个标记是它自己的 observer
   在 React 提交**之后**才写的。宿主在提交那一帧量到 32px 的行，之后主题压到 28px —— 每行差 4px × 3 行 = 12px（实测）。
   **修法**：`src/styles.js` 在「有主题、但两个日期视图都没开、也不是 compact 布局」时提前按主题尺寸压行：
   `body[data-dsh-claude-style]:not([data-dsh-claude-date-groups]):not([data-codex-sidebar-date-view]):not([data-dsh-claude-sidebar-layout="compact"]) [data-slot="sidebar"] [data-row-key^="session:"]{height:28px;min-height:28px}`，
   compact 布局另有一条 24px 版本。

3. **页面被缩放时宿主把视觉位移当本地位移用（残余 15%，只看得到在 `pageZoom: 115` 上）**
   宿主 AnimatedRows 的 FLIP 用 `getBoundingClientRect` 读**视觉 px**，又把同一个数写进**本地坐标系**的 `translate`，
   于是位移被缩放再放大一次：多出 dy×(s−1)。s=1.15、dy=133.31 时正好 20px。
   **修法**：新增 `src/flip-zoom-fix.js`，包一层 `Element.prototype.animate`，只对带 `data-row-key` 的行
   （`session:` / `workspace:` / `overflow:` 前缀，或挂在侧栏里）把 `translate` 的 px 值 ÷ 有效缩放。
   有效缩放取 **body 的「视觉宽 ÷ 布局宽」** —— 这点踩过坑：最初用侧栏根，但桌面布局里侧栏可以收起（宽 0），
   缩放取不到、补偿静默失效（复测 desktopmirror 仍是 0.15）；改 body 后归零。

### 复测矩阵（`.debug/probe-overshoot.mjs`，输出 collapsedY / 首帧 / 落定 / ratio）

| profile | 环境 | 修前 ratio | 修后 ratio |
| --- | --- | --- | --- |
| soloweb | 纯宿主，无主题 | 0 | 0 |
| nosuper | 无 superagent | 0 | 0 |
| notheme | 有 superagent、无我们的插件 | 0.5 | 0.5（我们的静态规则不生效，属预期） |
| themonly | 只有主题 | 0.14 | 0.14（同上） |
| codextheme | 主题 + 本插件，缩放 1 | 0 | 0 |
| desknosuper | 主题 + 本插件、无 superagent | 0.31 | **0** |
| desktopmirror | desktop 全量 22 项、缩放 1.15 | 0.31 → 0.15 | **0** |

### 回归（`.debug/probe-regress.mjs`）
- codexprobe：铃铛 aria-label「消息视图」、点开 `data-codex-sidebar-date-view`、8 段标题
  `[优先级, 昨天, 星期五, 星期四, 星期三, 星期二, 星期一, 更早]`、68 条预览、工作区行 0、69 行会话；
  再点：标题与预览清空、工作区行回 9、`aria-pressed=false`。
- codextheme：`dormant` 正常 —— 点铃铛转发主题铃铛（`data-dsh-claude-date-groups` 出现），再点还原 9 个工作区行。
- 控制台只有 `[codex-sidebar] applied` 与 `locale → zh (优先级)`，`Element.prototype.animate` 确认已被我们的包装替换。
- `docs/screenshot-date-view.png` 按新样式重拍（8 段、两行式会话行、工作区标签、中文界面）。

### 版本与发布
- `package.json` 0.3.1 → **0.3.2**；`lib/client.js` 74231 B（72.2 KiB，sha256 `49b5c33f…5334f`）。
- `node scripts/deploy.mjs` 已发布到 `/Users/apple/.dsh/plugins/dsh-codex-sidebar`（desktop profile 的依赖指向这里）。
- 提交 `138d127`（flip-zoom 补偿）与 `fef9bad`（文档 + 版本号），已推 `main`。
- **桌面 App 仍在跑 2026-11-07 10:22 起的老进程**，需用户 **Cmd+Q** 退出后重开才装载新 bundle。

### desktop 的 superagent 依赖改成 link（2026-11-08 20:17）
- 背景：`~/.dsh/profiles/desktop/node_modules/dsh-superagent` 早前已换成指向 fork 的符号链接（v0.2.2），
  但 `package.json` 里还写着 `file:.../dsh-superagent-0.2.0.tgz`，两边不一致 —— 将来重装/校验可能把目录拉回 tgz 旧版。
- 改法：`~/.dsh/profiles/desktop/package.json` 的 `dependencies["dsh-superagent"]` 由
  `file:/Users/apple/Desktop/SuperCode/Project/dsh-superagent/dsh-superagent-fork/dsh-superagent-0.2.0.tgz`
  改成 `link:/Users/apple/Desktop/SuperCode/Project/dsh-superagent/dsh-superagent-fork`（与同 profile 里
  `dsh-codex-sidebar: link:...` 的写法一致）。备份：`~/.dsh/backups/desktop-superagent-link-20261108-201702/package.json`。
- 同步：`~/.dsh/profiles/desktopmirror/package.json` 由 desktop 复制重建（name 改回 dsh-profile-desktopmirror）。
- 验证（desktopmirror 49820，`.debug/probe-hide-sheet.js`）：`styleMounted=true`，`styleText` 是
  「插件自建会话（worker- / orchestrator-）不占侧栏一行；第一帧布局就生效。」→ 确认经 link 装载到的是 v0.2.2 新构建。
- 注意：镜像 profile 与真实 desktop 共用同一个 stateDir，桌面 App 在跑时它的 superagent 会报
  `Lock file is already being held`（proper-lockfile），这是同 stateDir 双实例的预期行为，与本次改动无关。
- 其余测试 profile（notheme / desknosuper / desktopminus / nobetter / nosuper / superagent）仍写 file:tgz，
  它们的 node_modules 多为指向 desktop/node_modules 的链接，实际也吃 fork 构建；未逐个改。

### 待办
- PR #254（会话行显示最近一段回复）被维护者 CLOSED（理由「方向与插件设计理念不契合」）；本插件自己的消息视图
  已经自带两行式预览，不受影响。
- 本轮未覆盖：真实桌面 App 里的动画观感（只在 web 镜像 profile 上量过）。

