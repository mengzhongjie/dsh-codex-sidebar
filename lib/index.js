/**
 * dsh-codex-sidebar 的宿主半边。
 *
 * 这里已经没有任何逻辑：唯一职责（通过 /codex-sidebar/api/zoom 调 Electron 的
 * webContents.setZoomFactor 做窗口级缩放）在 2026-11-02 整份移除——整页缩放会和
 * 主题、better-sidebar 的浮层定位互相错位，侧栏不该承担这件事。
 *
 * 为什么还留一个空的 apply：cordis.patch.yml 要给本包插一条 Loader 条目，条目会
 * import 本包的 main；没有导出 apply，条目加载不起来，客户端半边也就不会被注入。
 */

/** 插件在 cordis.yml 里的标识。 */
export const name = 'dsh-codex-sidebar'

/** 宿主侧无副作用：样式与 DOM 由客户端半边自己挂。 */
export function apply() {}
