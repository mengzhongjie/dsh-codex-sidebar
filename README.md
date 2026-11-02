# dsh-codex-sidebar

DSH（DeepSeek Harness）左侧栏的「消息视图」插件：把侧栏里的全部会话按 **优先级 / 昨天 / 星期X / 更早**
重新分段排列，工作区行收起来，顶行留下一颗铃铛负责切换。

拿到的是一个**独立插件**，不依赖任何主题或皮肤插件。装了 dsh-claude-style 时它会自动让位：
不碰列表，铃铛转给主题自己的日期视图（见「与 dsh-claude-style 的共存」）。

![消息视图](docs/screenshot-date-view.png)

## 功能

- **按日期分段**：把宿主切到扁平分组，按更新时间把会话排进段落，段落之间插标题（今天这一段叫「优先级」）。
- **优先级段落**：正在运行的会话强制排进最前一段并置顶，今天的会话跟在后面 —— 正在看的会话不会被埋进「更早」。
- **两行式会话行**：每行显示标题 + 一条该会话最新消息的预览（见 src/date-view.js 的 renderPreview）。
  悬停时标题横滚、预览保持不变。
- **工作区标签**：扁平后没有分组标题了，每行右侧补一个工作区名标签交代归属；未分组会话标「未分组」。
- **覆盖全部会话**：所有工作区与未分组会话都进来，不再有「屏蔽工作区」。
- **铃铛开关**：工作区行右侧一颗铃铛切换消息视图；开着时常亮，有会话在跑时点一个小绿点（不写数字）。
- **默认不接管**：装好后侧栏仍是宿主原本的工作区视图，只有按下铃铛才切到消息视图；选择写进本地存储，下次启动沿用。
- **随界面语言**：段落标题跟随宿主语言（中文 / 英文），宿主语言晚就绪或中途切换都会跟上。

## 安装

插件目录就是本仓库，直接装到一个 DSH profile 里：

    node scripts/install.mjs --profile codexprobe                  # 装
    node scripts/install.mjs --profile codexprobe --uninstall      # 卸

脚本做三件事（都可手工完成）：

1. profile 的 cordis.patch.yml 里加一条 insert（id ui-codex-sidebar）；
2. profile 的 package.json：dsh.profile.bundles 里加 dsh-codex-sidebar，dependencies 里加
   "dsh-codex-sidebar": "link:<本目录>"；
3. profile 的 node_modules/dsh-codex-sidebar 指向本目录的符号链接。

装完重启宿主生效。桌面 App 关窗不会退进程，要用 **Cmd+Q** 退出后重开。
桌面 App 自己管理的 profile（desktop）不能靠 dsh --profile desktop 启动，改了它的 bundles 之后同样只能 Cmd+Q 重开。

## 与 dsh-claude-style 的共存

dsh-claude-style 主题里也内置了一份「铃铛 + 日期分组」。两者可以同时装，规则是：

| 事项 | 行为 |
| --- | --- |
| 列表 | 有主题时本插件不碰列表：主题在自己的日期视图里搬座位，两边同时插手会把分组改回去 |
| 铃铛 | 始终显示；有主题时点它转给主题自己的日期视图，没有主题时切本插件的消息视图（src/entry.js 的 onBellClick） |
| 按下态 | 有主题时读主题铃铛自己的 aria-pressed，没有主题时读本插件的状态（bellPressed） |
| 主题检测 | 只看公开痕迹：body 上有 data-dsh-claude* 属性，或页面上有 dsh-claude- 前缀的类名（src/coexist.js） |

## 持久化

只用 localStorage 一个键（dsh-codex-sidebar.settings）：

| 键 | 类型 | 默认 | 作用 |
| --- | --- | --- | --- |
| dateViewEnabled | boolean | false | 是否处在消息视图；按铃铛会改写它 |

进入消息视图时会把宿主的原分组方式备份到 dsh-codex-sidebar.group-before-date-view。
上次异常退出留下扁平状态的话，下次启动会自动还原（只在备份还在、且当前确实仍是 flat 时才动手）。

## 开发

    node scripts/build.mjs        # 构建 lib/client.js（esbuild；react 走宿主工厂的 require，列为 external）
    node scripts/build.mjs --watch

| 文件 | 职责 |
| --- | --- |
| src/entry.js | 组装、MutationObserver 调度、solo/dormant 判定与让位、启动自愈、卸载还原 |
| src/date-view.js | 消息视图核心：分桶、排序、插标题、工作区标签、两行式预览、退出还原 |
| src/topbar.js | 工作区行右侧的铃铛（插进宿主的 headerActions 里，避开宿主图标） |
| src/sidebar-dom.js | 侧栏 DOM 定位：工作区行 / 扁平列表容器 / 座位 span / 会话 id |
| src/view-store.js | 宿主视图 store 的读写（setGroupBy）、原分组备份与恢复 |
| src/host-data.js | 读宿主 sessions / workspaces 服务快照（运行中、更新时间、标题、工作区名） |
| src/settings.js | localStorage 读写与订阅 |
| src/locale.js | 中英文案与语言解析（订阅宿主 locale 服务） |
| src/coexist.js | 主题检测、主题日期铃铛定位 |
| src/styles.js | 注入的全部样式（全部走宿主 token，浅色/深色自适应） |
| src/constants.js | 常量：属性名、类名、存储键、默认设置 |

### 验证

用 Playwright 直连一个测试 profile 的页面，探针脚本按真实 DOM 断言：

    dsh --profile codexprobe --port 49800 --no-open > .debug/probe-web.log 2>&1 &
    URL=$(grep -o 'http://127.0.0.1:49800/?token=[^ ]*' .debug/probe-web.log | tail -1)
    env -u all_proxy -u ALL_PROXY -u http_proxy -u HTTP_PROXY -u https_proxy -u HTTPS_PROXY \
      PLAYWRIGHT_BROWSERS_PATH=$PWD/.playwright-browsers \
      node .debug/probe-solo.mjs "$URL"

现成的探针在 .debug/（开发期脚本，不随版本库分发）：probe-solo.mjs（无主题：铃铛进出消息视图、段落标题、预览）、
probe-two-envs.mjs（两个隔离 profile 对照：无主题 / 带主题）、probe-height.mjs 与 probe-overlap.mjs（行高与叠字几何）。

## 已知限制

- 结果依赖宿主私有 DOM 契约（data-row-key、座位 span、flatList 容器），宿主大改版可能失效；
  选择器集中在 src/constants.js 与 src/sidebar-dom.js，方便一处改完。
- 桌面 App 没有窗口级缩放的对外通道，页面缩放只能走 CSS；本插件已不提供缩放（那是主题的能力）。
- 装了主题时本插件让位：列表由主题的日期视图负责，此时按我们的铃铛等于按主题的铃铛。

## 更新记录

- **2026-11-02 消息视图改造**：取消设置页与齿轮、取消缩放与「屏蔽工作区」；消息视图对全部工作区与未分组会话开放；
  会话行改两行式（标题 + 最新消息预览）；首段改名「优先级」。
- **2026-11-02 与主题共存**：有主题时让位（不动列表），铃铛转给主题的日期视图；无主题时切本插件的消息视图。
- **2026-11-02 17:58 回滚**：桌面 App 在运行中替换 bundle 连续崩溃两次，代码回滚到 5788b88；
  「铃铛始终切本插件的视图 + 借主题标记」与「主题下会话行叠字修复」两笔改动随之中止，崩溃日志与教训见 `交接-dsh-codex-sidebar.md`。
- **2026-11-02 悬停抖动修复**：标题节点复用 + 只比较自有节点顺序 + 忽略自有变更的 MutationObserver，
  抖动前约 1500 次/秒的 DOM 变动降到 0（有主题环境 1 次）。
