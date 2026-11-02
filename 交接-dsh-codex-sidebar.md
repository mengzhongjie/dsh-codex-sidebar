# 交接：dsh-codex-sidebar

> 最近更新：2026-11-02（设置搬进官方设置页，双 profile 实测定稿）。

## 目标与验收标准

把「闹钟边栏」做成一个**独立的 DSH 插件**（不依赖 dsh-claude-style 主题）：侧栏顶行一个铃铛切换
日期视图，列表按 今天 / 昨天 / 星期X / 更早 分段，设置项注册进**官方设置页**的一个 section（日期视图开关、屏蔽工作区、整体缩放）。
同时要求**两种宿主都能用**：原生宿主全功能；装了 dsh-claude-style 时与主题共存（可让位、可接管）。
验收：装进 profile 后侧栏正常、铃铛可见可用、日期分段正确、退出能完整还原；有主题时不打架。

## 进度

- 插件骨架、esbuild 构建、安装/卸载脚本（`scripts/install.mjs`）—— 完成；
- 日期视图（分段、排序、运行中置顶、段落标题、工作区标签、进出还原）—— 完成；
- 顶行铃铛 + 齿轮 + 运行中小绿点；设置持久化；启动自愈 —— 完成；
- **设置从自建浮层改为注册进官方设置页**（`settings.section`，齿轮直达）—— 完成并双 profile 实测；
- 样式对齐宿主 token（浅色/深色、与原生按钮/标签同尺寸）—— 完成；
- **与 dsh-claude-style 的三种共存模式（solo / dormant / takeover）** —— 完成并实测；
- README、原生日期视图截图、官方设置页截图、主题接管截图 —— 完成。

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
6. **三种共存模式，而不是一刀切让位或强行接管**。主题把侧栏工作区列表换成了自己的 provider，
   强行两边都排会互相还原 display、抢 `groupBy`；而完全让位又让插件在主题环境下没有价值。
   所以默认 `dormant`（只挂齿轮、不动列表），用户勾选后进 `takeover`。
7. **接管模式借用主题的 `data-dsh-claude-date-groups` 标记**。实测：主题 provider 看到 `flat` 就改回
   工作区分组，只有该标记存在时才放手；`setGroupBy(flat)` 在该标记下能站住（flatList 出现、
   groupSection 归零）。退出时只删自己加的标记。

## 验证证据（真实页面，Playwright headless）

### 原生宿主（profile `codexprobe`：dsh-base + dsh-web-app + dsh-codex-sidebar）

- 初始：`pressed=false`、日期标题 0、工作区行 9 个、无标签 → 默认宿主原视图；
- 点铃铛：6 个段落标题 `Today / Yesterday / Saturday / Friday / Tuesday / Earlier`，flatList 43 个子节点，
  工作区行 0，标签 17，可见会话行 17；
- 再点：标题与标签清空、工作区行回 9；
- 点齿轮 → 官方设置页自动停到「Sidebar settings」（导航 6 项）；卡片 564×93 / radius 20px / padding 2px 16px；
  开关 40×22；工作区 8 个复选框只勾「闲聊」；五档缩放 100% 选中；点 110% → `body.style.zoom="1.1"` 且高亮同步；
  关掉设置页后侧栏仍保持日期视图（标题 6、工作区行 0、标签 17）；复原后工作区行回 9。

### 主题宿主（profile `codextheme`：额外装 dsh-claude-style 0.19.6）

- 启动（dormant）：自有节点只有 `.codex-sidebar-actions` 里的齿轮（按钮 `Sidebar settings`），
  无铃铛、无自有日期标题；主题铃铛可见 → 主题日期视图照常可用；
- 设置页出现「Take over the date view」（本页共 2 个开关）；勾选后 body 出现 `data-codex-sidebar-takeover`，
  主题铃铛 `display:none`，主题日期标题 0；
- 点本插件铃铛：6 个自有段落标题、可见会话 17、工作区行 0、主题日期标题 0；退出后自有标题 0、工作区行回 9；
- 主题日期视图正开着时勾选接管：先自动退出主题日期视图（主题标题 6→0、`data-dsh-claude-date-groups` 消失），
  再进入本插件日期视图（flatList 43 子节点、可见会话 17）；退出后标记归还（body 无该属性）。

截图：`docs/screenshot-date-view.png`、`docs/screenshot-settings.png`、`docs/screenshot-theme-takeover.png`。

## 未验证 / 限制

- **没有装进用户的 `desktop` profile**。那个 profile 已经装了 dsh-claude-style，装上本插件后默认是
  dormant（只多一个齿轮）；要用本插件的日期视图需在设置里勾选接管。安装方式见 README「安装」。
- 接管模式依赖主题的公开标记与铃铛选择器（`.dsh-claude-active-shelf-actions button[class*="active-shelf-trigger"]`），
  主题大改版可能失效；失效即退化为 dormant。
- 主题接管时主题自带的日期视图设置（它自己的屏蔽工作区等）不共享，两边各自存 localStorage。
- 折叠成图标栏时不挂按钮；归档视图打开时不进入日期视图（宿主会整体换列表）。

## 下一步

1. 用户决定是否装进 `desktop` profile（装之前建议先备份 `~/.dsh/profiles/desktop/package.json` 与 `cordis.patch.yml`）；
2. 若装：`node scripts/install.mjs --profile desktop` → Cmd+Q 重启 → 设置里按需勾选接管；
3. 待办见 README「待办」（段落折叠、按 id 屏蔽、恢复默认）。
