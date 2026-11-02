/**
 * host-data.js — 只读访问宿主的会话与工作区数据。
 *
 * 两个服务都在 cordis 上下文里：
 *   ctx.get('sessions').list     → getSnapshot() / subscribe()
 *   ctx.get('workspaces').list   → getSnapshot() / subscribe()
 * 快照结构（0.2.1-rc.2 实测）：
 *   sessions   : { ids: string[], byId: { [id]: { updatedAt, running, title } } }
 *   workspaces : { items: [{ id, title, sessionIds: string[] }] }
 */

/** 安全地取一次服务：插件被装到不支持的宿主版本上时返回 undefined 而不是抛。 */
function peek(ctx, serviceName) {
  try {
    return ctx.get(serviceName)
  } catch {
    return undefined
  }
}

export function createHostData(ctx) {
  const sessions = peek(ctx, 'sessions')
  const workspaces = peek(ctx, 'workspaces')

  return {
    /** 会话快照；宿主还没同步完时可能 ids 为空。 */
    sessionSnapshot() {
      try {
        return sessions?.list?.getSnapshot?.() ?? { ids: [], byId: {} }
      } catch {
        return { ids: [], byId: {} }
      }
    },

    /** 工作区快照。 */
    workspaceSnapshot() {
      try {
        return workspaces?.list?.getSnapshot?.() ?? { items: [] }
      } catch {
        return { items: [] }
      }
    },

    /** 是否有会话正在运行：铃铛只亮一个点，不写条数。 */
    hasRunningSession() {
      const snapshot = this.sessionSnapshot()
      return (snapshot.ids ?? []).some(id => snapshot.byId?.[id]?.running === true)
    },

    /** 会话 id → 工作区标题；未分组会话不在映射里。 */
    workspaceTitleBySession() {
      const titles = new Map()
      for (const item of this.workspaceSnapshot().items ?? []) {
        for (const sessionId of item.sessionIds ?? []) {
          const title = typeof item.title === 'string' ? item.title : ''
          titles.set(sessionId, title)
        }
      }
      return titles
    },

    /** 订阅两份数据的任何变化，返回取消函数。 */
    subscribe(listener) {
      const offs = []
      for (const source of [sessions?.list, workspaces?.list]) {
        try {
          const off = source?.subscribe?.(() => listener())
          if (typeof off === 'function') offs.push(off)
        } catch {
          // 单个数据源订阅失败不影响另一个。
        }
      }
      return () => {
        for (const off of offs) {
          try {
            off()
          } catch {
            // 取消订阅失败可以忽略：插件卸载时整个页面可能已经在销毁。
          }
        }
      }
    }
  }
}
