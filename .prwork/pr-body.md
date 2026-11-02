## What changes

页面缩放从五个固定档位换成可输入任意百分比（60–200）。

**设置 › 通用 › 页面缩放**这一行，档位按钮保留（跟系统 / 0.8x / 1x / 1.25x / 1.5x），
右边加一个数字框：按 Enter 或失焦提交，超出范围的夹回 60–200，输入的不是数字
就退回当前值。

缩放因子不再由属性值直接写进四条固定规则，而是落在 body 的自定义属性
`--dsh-claude-page-zoom-factor` 上，`chrome.css` 用一条 `zoom` 规则读它——任意
百分比都成立。存下来的仍是百分比文本（`text`，最多 8 个字符），旧的固定档位
（0.8 / 1 / 1.25 / 1.5）经 legacy 表迁移成 80 / 100 / 125 / 150，读者升级后看到
的页面大小不变；100% 与「跟系统」都不写属性，页面保持系统与宿主给的大小。

**与 #215 的关系。** 这一段是从 #215（`feat/sidebar-date-layout`）里拆出来单独
提的，两个 PR 碰同一批文件（`packages/contracts/src/prefs.ts`、
`settings-tab-general.ts`、`settings.copy.json`、`theme/chrome.css` 等）。若 #215
先合，本 PR 可以直接关掉；若本 PR 先合，#215 那边需要把这几个文件里的缩放段落
落一遍。

## Checks

- [x] 改动写在 `docs/changes/page-zoom-percent.json` 里（group `new`，order 80）。
- [x] 两个 README 都没有动：这次改的是设置页里一行控件的行为，不需要重拍截图。
- [x] `npm run build` 通过，`lib/` 没有进入本 PR（改动只在 `packages/*/src` 与
  `docs/changes/`）。
- [ ] 明暗两色截图还没有附：沙箱里跑得起构建与浏览器测试，但起不了宿主渲染的
  设置页，截不到真实的两色对照。需要的话请在这儿要，我在能跑宿主的环境里补上。

另外两件本机环境的事，和改动本身无关：

- `npm run verify` 的 `numbers` 一步在未改动的 `upstream/master` 基线上同样失败
  （`packages/testing/sidebar-rail.mjs` 里三条检查的数是 0，要跑
  `npm run checks:numbers`），所以这一条不是这次改动带来的。
- 相关单测：`npx vitest related` 列出受影响的 43 个文件、306 个用例全过（用
  `CHROME_PATH` 指向本机 Edge）。
