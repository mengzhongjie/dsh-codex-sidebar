/**
 * settings.js — 插件自己的设置读写（localStorage）。
 *
 * 为什么不走宿主的 settings 服务：那是主题包 / 宿主内部实现，独立插件拿不到；
 * 而设置项很少、结构简单，本地存储足够，也不受宿主升级影响。
 */
import { SETTINGS_KEY, DEFAULT_SETTINGS, ZOOM_RANGE } from './constants.js'

/** 订阅者集合：设置变化时通知侧栏与设置页。 */
const listeners = new Set()

/** 把任意输入收敛成合法设置：缺字段补默认值，脏数据不炸。 */
function normalize(raw) {
  const source = raw !== null && typeof raw === 'object' ? raw : {}
  const skip = Array.isArray(source.skipWorkspaces)
    ? source.skipWorkspaces.filter(item => typeof item === 'string' && item.trim() !== '')
    : DEFAULT_SETTINGS.skipWorkspaces.slice()
  const zoomValue = typeof source.zoom === 'number' && Number.isFinite(source.zoom) ? source.zoom : DEFAULT_SETTINGS.zoom
  return {
    dateViewEnabled: typeof source.dateViewEnabled === 'boolean' ? source.dateViewEnabled : DEFAULT_SETTINGS.dateViewEnabled,
    skipWorkspaces: skip,
    // 缩放夹在合法区间内：手填 0 或 10 会把界面搞坏。
    zoom: Math.min(ZOOM_RANGE.max, Math.max(ZOOM_RANGE.min, zoomValue))
  }
}

/** 读当前设置。 */
export function readSettings() {
  try {
    return normalize(JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? 'null'))
  } catch {
    // 存储被禁用或内容被改坏：回到默认值，不影响插件其他功能。
    return normalize(null)
  }
}

/** 写设置并通知订阅者。 */
export function writeSettings(patch) {
  const next = normalize({ ...readSettings(), ...patch })
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