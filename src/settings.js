/**
 * settings.js — 插件自己的设置读写（localStorage）。
 *
 * 为什么不走宿主的 settings 服务：那是主题包 / 宿主内部实现，独立插件拿不到；
 * 而设置项很少、结构简单，本地存储足够，也不受宿主升级影响。
 */
import { SETTINGS_KEY, DEFAULT_SETTINGS } from './constants.js'

/** 订阅者集合：设置变化时通知侧栏与设置页。 */
const listeners = new Set()

/** 内存中缓存的设置副本：保证在 localStorage 失败或不可用时，本次会话内设置持续生效。 */
let memorySettings = null

/** 把任意输入收敛成合法设置：缺字段补默认值，脏数据不炸。 */
function normalize(raw) {
  const source = raw !== null && typeof raw === 'object' ? raw : {}
  return {
    dateViewEnabled: typeof source.dateViewEnabled === 'boolean' ? source.dateViewEnabled : DEFAULT_SETTINGS.dateViewEnabled
  }
}

/** 读当前设置：优先从内存读取，未初始化时从 localStorage 读取并更新内存缓存。 */
export function readSettings() {
  if (memorySettings !== null) return memorySettings
  try {
    memorySettings = normalize(JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? 'null'))
  } catch {
    // 存储被禁用或内容被改坏：回到默认值，不影响插件其他功能。
    memorySettings = normalize(null)
  }
  return memorySettings
}

/** 写设置并通知订阅者：同步更新内存缓存与 localStorage。 */
export function writeSettings(patch) {
  const next = normalize({ ...readSettings(), ...patch })
  // 始终更新内存态：即使存储不可用，本次会话内后续读取依然能拿到最新设置
  memorySettings = next
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
  } catch {
    // 写入失败（隐私模式等）时保持内存态：本次会话仍然生效，只是不持久。
  }
  for (const listener of listeners) listener(next)
  return next
}

/** 订阅设置变化，返回取消函数。 */
export function subscribeSettings(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}