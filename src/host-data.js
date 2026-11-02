/**
 * host-data.js — 只读访问宿主的会话与工作区数据。
 *
 * 两个服务都在 cordis 上下文里：
 *   ctx.get('sessions').list     → getSnapshot() / subscribe()
 *   ctx.get('workspaces').list   → getSnapshot() / subscribe()
 * 快照结构（0.2.1-rc.2 实测）：
 *   sessions   : { ids: string[], byId: { [id]: { updatedAt, running, title } } }
 *   workspaces : { items: [{ id, title, sessionIds: string[] }] }
 *
 * 关键教训：**不要在建对象时把服务取一次就存起来**。桌面 App 装的插件多，
 * 本插件的 apply 常常早于 sessions/workspaces 服务注册（实测镜像里 apply 时两者都缺席，
 * 日期视图于是把每个会话都当「未分组」全部隐藏、一个段落标题都插不出来）。
 * 所以这里每次访问都重新 peek，订阅也用轮询补齐。
 */

/** 安全地取一次服务：插件被装到不支持的宿主版本上时返回 undefined 而不是抛。 */
function peek(ctx, serviceName) {
  try {
    return ctx.get(serviceName)
  } catch {
    return undefined
  }
}

/** 订阅重试间隔与次数上限（最多等 60 秒，够宿主把服务拉起来）。 */
const SUBSCRIBE_RETRY_MS = 500
const SUBSCRIBE_RETRY_LIMIT = 120

export function createHostData(ctx) {
  /** 取 sessions 服务的 list 端口（可能还没就绪）。 */
  const sessionsList = () => peek(ctx, 'sessions')?.list
  /** 取 workspaces 服务的 list 端口（可能还没就绪）。 */
  const workspacesList = () => peek(ctx, 'workspaces')?.list

  return {
    /** 会话快照；宿主还没同步完时可能 ids 为空。 */
    sessionSnapshot() {
      try {
        return sessionsList()?.getSnapshot?.() ?? { ids: [], byId: {} }
      } catch {
        return { ids: [], byId: {} }
      }
    },

    /** 工作区快照。 */
    workspaceSnapshot() {
      try {
        return workspacesList()?.getSnapshot?.() ?? { items: [] }
      } catch {
        return { items: [] }
      }
    },

    /** 宿主服务是否已经就绪（两个都在才算）。 */
    ready() {
      return sessionsList() !== undefined && workspacesList() !== undefined
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

    /**
     * 订阅两份数据的任何变化，返回取消函数。
     *
     * 服务可能还没注册：先试一次，剩下的交给 500ms 轮询补齐（上限 60 秒）。
     * 两个数据源都订阅上之后轮询自动停。
     */
    subscribe(listener) {
      const offs = []
      /** 已经订阅成功的数据源（用 Set 防重复订阅）。 */
      const subscribed = new Set()
      let timer = 0
      let stopped = false

      /** 试一次订阅：把当前能拿到的数据源都订上。 */
      const attempt = () => {
        for (const source of [sessionsList(), workspacesList()]) {
          if (source === undefined || source === null || subscribed.has(source)) continue
          try {
            const off = source.subscribe?.(() => listener())
            if (typeof off === 'function') {
              subscribed.add(source)
              offs.push(off)
            }
          } catch {
            // 单个数据源订阅失败不影响另一个。
          }
        }
      }

      /** 两个数据源都订上就可以停掉轮询。 */
      const allSubscribed = () => subscribed.size >= 2

      attempt()
      if (!allSubscribed()) {
        timer = window.setInterval(() => {
          if (stopped) return
          attempt()
          if (allSubscribed() && timer !== 0) {
            window.clearInterval(timer)
            timer = 0
          }
        }, SUBSCRIBE_RETRY_MS)
      }

      return () => {
        stopped = true
        if (timer !== 0) window.clearInterval(timer)
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
