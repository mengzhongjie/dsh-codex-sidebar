# agent.md — dsh-codex-sidebar

本文件是项目说明与交接入口：先看这里，再看 README.md（对外说明）与「交接-dsh-codex-sidebar.md」（逐条决定与证据）。

## 1. 这个项目是什么

独立的 DSH（DeepSeek Harness）客户端插件：把左侧栏的会话列表按日期分段排列（今天 / 昨天 / 星期X / 更早），
并把「不进入日期视图的工作区」「整体缩放」等设置注册进**官方设置页**的一页（设置 → 侧栏设置）。

- 命名：包名 `dsh-codex-sidebar`，插件 id 同为 `dsh-codex-sidebar`，产物 id 用 `window.__ModuleLoader__.load({ id: 'dsh-codex-sidebar' })`。
- 与 `dsh-claude-style` 的关系：**不依赖**。装了主题时插件进入 dormant（只留设置页，不动列表、不碰主题 DOM），
  用户可在设置页勾选「由本插件接管日期视图」进入 takeover（用 CSS 藏掉主题的铃铛并让它退出日期视图）。
- 不修改宿主源码，只在 DOM 层接管：宿主没有对外暴露侧栏组件（`sidebar.workspaces` 是 single 独占插槽），
  所以日期视图靠「把宿主视图 store 切成 flat + 重排座位 span」实现。

## 2. 目录

```
src/
  entry.js          组装：模式判定（solo/dormant）、缩放、设置页注册、MutationObserver 调度、卸载
  constants.js      插件 id、body 标记、选择器、缩放档位与自定义属性名、默认设置
  settings.js       localStorage 读写与订阅（键 dsh-codex-sidebar.settings）
  host-data.js      ctx.get('sessions'/'workspaces') 快照的只读封装 + 订阅
  view-store.js     slots.entries('sidebar.workspaces')[0].store.create() → 扁平/还原分组（带备份键自愈）
  sidebar-dom.js    侧栏根、顶行、折叠按钮、扁平列表、座位、行 key 的定位工具
  date-view.js      日期分段：分桶、排序（运行中置顶）、插段落标题、行内工作区 chip、让开未分组/被屏蔽工作区
  topbar.js         顶行铃铛（切换日期视图）+ 齿轮（打开官方设置页）
  settings-section.js  官方设置页里的一页（React 组件，走 settings.section 插槽）
  open-settings.js  点账号菜单 → Settings → 切到本插件那一页（点击推迟到事件之后，见文件注释）
  locale.js         语言源：跟随宿主 locale 服务，晚就绪/中途切换都能跟上（createLocale）
  coexist.js        主题在场检测（body 属性/类名前缀）、手动覆盖开关
  styles.js         全部样式，颜色/圆角优先取宿主 --dsw-alias-* token
scripts/
  build.mjs         esbuild 打成一个 client.js，套 __ModuleLoader__ 外壳；react 保持 external
  install.mjs       装/卸到指定 profile（改 package.json bundles+dependencies、cordis.patch.yml、node_modules 符号链接）
lib/
  client.js         构建产物（提交进仓库，安装即用）
  index.js          host 半边（空壳）
```

## 3. 常用命令

```bash
npm run build                      # 构建 lib/client.js
node scripts/install.mjs --profile <profile>            # 装
node scripts/install.mjs --profile <profile> --uninstall # 卸

# 本地验证（web profile，不碰桌面 App）
dsh --profile codexprobe --port 49800 --no-open          # 无主题
dsh --profile codextheme  --port 49810 --no-open         # 装了 dsh-claude-style
dsh --profile desktopmirror --port 49820 --no-open       # 镜像 desktop 的 bundle 组合（重启桌面 App 前先验）
grep -o 'http://127.0.0.1:49820/?token=[^ ]*' .debug/mirror-web.log | tail -1

# 页面探针（Playwright headless；必须清掉代理变量，否则 WebSocket 被掐）
env -u all_proxy -u ALL_PROXY -u http_proxy -u HTTP_PROXY -u https_proxy -u HTTPS_PROXY \
  PLAYWRIGHT_BROWSERS_PATH=$PWD/.playwright-browsers node .debug/verify.mjs "<url>" .debug/eval-xxx.js shot.png
```

注意：
- token 一次性，每次验证先重启服务再取 URL。
- 页面刚打开时侧栏是**折叠**的（宽度 0），读列表/顶行前要先点「打开侧边栏」。
- 改了 src 之后必须 `npm run build`；桌面 App 必须 **Cmd+Q** 重开才加载新 bundle（关窗不退进程）。

## 4. 需求清单与验收状态

| 需求 | 状态 |
| --- | --- |
| 侧栏按日期分段（今天/昨天/星期X/更早），不与工作区分组混排 | 已实现、已验证 |
| 只有按下铃铛才进入日期视图；默认是工作区视图 | 已实现（默认 dateViewEnabled=false） |
| 运行中的会话排在今天最前 | 已实现 |
| 铃铛只亮「有活跃会话」的小点，不显示条数 | 已实现 |
| 未分组会话、被屏蔽工作区的会话不进日期列表（只隐藏不删） | 已实现 |
| 设置进官方设置页（含不进入日期视图的工作区、整体缩放档位+自定义） | 已实现、双 profile 已验证 |
| 跟随宿主语言（中文/英文） | 已实现（createLocale，热切换已验证） |
| 与 dsh-claude-style 共存（dormant / takeover） | 已实现、codextheme 已验证 |
| **原生皮肤（不装主题）下顶行要能看到铃铛** | **进行中：放宽挂载条件（findTopBar），待真机确认** |
| **调过缩放后仍能打开设置** | **进行中：缩放改 #root transform，镜像已验证 125% 菜单在视口内** |
| 铃铛的位置：顶行（用户 m01901「铃铛可以放到这里」） | 进行中：本轮改的是顶行插入规则 |
| 桌面 App（desktop profile）安装 | 已装（scripts/install.mjs），但需 Cmd+Q 重开加载新 bundle |

## 5. 当前进度与待办（2026-11-02 15:20）

本轮正在修两件事（都已改代码、镜像待复验）：

1. **原生皮肤下没有铃铛**：`src/topbar.js` 原来要求「折叠按钮所在行里还有品牌按钮」才挂，
   而桌面 App 的品牌与折叠按钮不在同一行 → 直接不挂。现在改用 `src/sidebar-dom.js` 的
   `findTopBar()`：只要侧栏宽 ≥140 就挂；宽栏插在折叠按钮前，App 那种「第一行只有折叠按钮」
   的布局跟在折叠按钮后面。
2. **调过缩放后设置打不开**：两个独立原因
   a) 齿轮的 click 里同步点开菜单 → 同一个 click 冒泡到 document → 宿主的「点外面就关」立刻关掉。改为 `clickLater()`（setTimeout 0）。
   b) 整页缩放原来用 body 的 CSS zoom，宿主弹层用 getBoundingClientRect 定位，125% 时菜单被算到视口外（y=898/视口 900）。
      改为对 `#root` 做 `transform: scale()` + 按「窗口尺寸/倍率」写死宽高（`src/styles.js` + `entry.js` 的 applyZoom）。

镜像实测（profile desktopmirror，125%）：账号菜单 y=719、三项都在视口内、点 Settings 打开 dialog 800×672、左栏 9 项 —— 缩放那两条已修好。
顶行铃铛还差一次「展开侧栏」后的复验（探针首次打开页面时侧栏是折叠的，宽度 0，被挂载条件跳过）。

## 6. 验证纪律

- 区分「源码改了 / 构建成功 / 页面里生效 / 真机 App 生效」四档，交付时说清到哪一档。
- 页面验证一律用 headless Playwright + 真实鼠标事件（DOM .click() 会绕过宿主的合成事件逻辑，容易误判）。
- 改完先跑 `.debug/verify.mjs` 的既有探针（eval-section-check / eval-solo / eval-locale-switch），再验新行为。
