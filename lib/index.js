/**
 * 服务端（node）半边：本插件纯前端，不做任何 host 侧的事。
 *
 * 这个 apply 是让 Cordis Loader 认得这个包的空壳 —— 浏览器半边的 bundle 由 host
 * 通过 package.json 的 dsh.client / exports["./client"] 分发给页面。
 */
export function apply() {}
