/**
 * view-store.js — 拿侧栏「视图 store」，用于切换分组方式。
 *
 * 这个 store 不是 cordis 服务，而是挂在 sidebar.workspaces 插槽声明上的工厂：
 *   ctx.get('slots').entries('sidebar.workspaces')[0].store.create()
 * 返回实例带 action：setGroupBy('workspace' | 'flat') / setArchivedFilter(...)。
 * 日期视图需要扁平列表（一个容器里放所有会话行）才能跨工作区排序。
 */
import { GROUP_BACKUP_KEY } from './constants.js'

/** 视图 store 的三个能力，缺一个就不能进日期视图。 */
function isUsableViewStore(instance) {
  return instance !== null &&
    typeof instance?.getSnapshot === 'function' &&
    typeof instance?.actions?.setGroupBy === 'function'
}

export function createViewStore(ctx) {
  let cached = null

  /** 懒解析：侧栏还没挂出来时插槽声明可能为空，等到能取到为止。 */
  function resolve() {
    if (cached !== null) return cached
    const slots = (() => {
      try {
        return ctx.get('slots')
      } catch {
        return undefined
      }
    })()
    const entries = slots?.entries?.('sidebar.workspaces') ?? []
    const instance = entries[0]?.store?.create?.() ?? null
    if (isUsableViewStore(instance)) cached = instance
    return cached
  }

  return {
    resolve,

    /** 当前分组方式（'workspace' | 'flat' | ...）。 */
    groupBy() {
      return resolve()?.getSnapshot?.()?.groupBy ?? null
    },

    /** 当前归档筛选（'default' | 'only' | 'show'）。 */
    archivedFilter() {
      return resolve()?.getSnapshot?.()?.archivedFilter ?? 'default'
    },

    /**
     * 切到扁平列表，并备份原来的分组方式。
     * 备份写进 localStorage：进程被杀后下次启动还能自愈回原分组。
     */
    flatten() {
      const instance = resolve()
      if (instance === null) return false
      const previous = instance.getSnapshot?.()?.groupBy
      if (typeof previous !== 'string') return false
      // 已经是扁平就不要再覆盖备份，否则会把「原本的分组」冲掉。
      if (previous !== 'flat') {
        try {
          window.localStorage.setItem(GROUP_BACKUP_KEY, previous)
        } catch {
          // 存储不可用时退化为不备份：本次会话内仍能靠内存里的值还原。
        }
      }
      if (previous !== 'flat') instance.actions.setGroupBy('flat')
      return true
    },

    /** 还原分组方式：优先用本次会话记录的，其次用磁盘备份。 */
    restore(previous) {
      const instance = resolve()
      if (instance === null) return
      let target = typeof previous === 'string' ? previous : null
      if (target === null) {
        try {
          target = window.localStorage.getItem(GROUP_BACKUP_KEY)
        } catch {
          target = null
        }
      }
      if (target === null || target === 'flat') target = 'workspace'
      if (instance.getSnapshot?.()?.groupBy !== target) instance.actions.setGroupBy(target)
    },

    /** 清掉磁盘备份（成功还原后调用）。 */
    forgetBackup() {
      try {
        window.localStorage.removeItem(GROUP_BACKUP_KEY)
      } catch {
        // 忽略：清不掉也只是留着一条陈旧记录，下次自愈仍会用到它。
      }
    },

    /** 上次进程被杀时留下的扁平状态。 */
    leftoverBackup() {
      try {
        return window.localStorage.getItem(GROUP_BACKUP_KEY)
      } catch {
        return null
      }
    }
  }
}
