/**
 * superagent.js — 与 dsh-superagent 配合，把它的「主会话」带进消息视图。
 *
 * 那个插件把自己建的会话行用行内 display:none 藏起来，改在每个工作区组标题上挂一颗
 * M 气泡当入口；本插件把列表拍平后组标题没了，藏起来的主会话就再没有入口。
 * 这里只做两件事：
 *   1. 向 /orchestrator/api/state 问出主会话 id（masterId 与 masterIds）；
 *   2. 给这些座位挂一个类，由样式表用 !important 把 display 顶回可见。
 *
 * 为什么用类而不是直接改行内样式：对面只在「行内 display 不是 none」时才动手藏，
 * 我们把行内保持在 none、只靠类规则显示，它便认为早就藏好、不再反复来藏，
 * 两边不会来回改写同一行（那会变成观察者互激的死循环）。
 */

/** 主会话 id 的来源：superagent 宿主半边的状态路由。 */
const STATE_ENDPOINT = '/orchestrator/api/state'

/** 那半边要求带这个请求头，否则当成浏览器直连拒绝掉。 */
const STATE_HEADERS = { 'x-orchestrator-request': '1' }

/** 查到之后多久再问一次（主会话会随工作区切换而变）。 */
const REFRESH_MS = 5000

/** 没查到时的重试间隔：没有装 superagent 的环境会一直 404，别问太勤。 */
const RETRY_MS = 30000

/** 连续失败几次就认定这个环境没有 superagent。 */
const MAX_MISSES = 3

/** 它自己建的会话 id 前缀：worker- 是工单执行者，orchestrator- 是主会话与评估。 */
const OWN_PREFIXES = ['worker-', 'orchestrator-']

/** 这个 id 是不是 superagent 自己的会话。 */
export function isSuperagentSessionId(id) {
  return OWN_PREFIXES.some(prefix => id.startsWith(prefix))
}

/** 上次失败的时刻：没装 superagent 的环境按 RETRY_MS 退避，别一直问。 */
let lastMissAt = 0

/**
 * 建一个主会话探测器。
 *
 * ids() 永远同步返回（查不到就是空集），ensure() 在后台补查，查到变化时通知调用方重排。
 */
export function createSuperagentBridge({ onChange }) {
  /** 已知的主会话 id。 */
  let masters = new Set()
  /** 上次成功的查询时刻。 */
  let checkedAt = 0
  /** 连续失败次数。 */
  let misses = 0
  /** 正在跑的查询。 */
  let inflight = null
  /** 卸载后不再回写。 */
  let disposed = false

  const fresh = () => checkedAt !== 0 && Date.now() - checkedAt < REFRESH_MS
  const giveUp = () => misses >= MAX_MISSES

  /** 问一次宿主，成功就把 masterId 与 masterIds 合并成集合。 */
  async function read() {
    const url = new URL(STATE_ENDPOINT, window.location.href)
    const response = await fetch(url, { headers: STATE_HEADERS }).catch(() => null)
    if (response === null || response.ok !== true) {
      misses += 1
      return
    }
    const state = await response.json().catch(() => null)
    if (state === null || typeof state !== 'object') {
      misses += 1
      return
    }
    const next = new Set()
    if (typeof state.masterId === 'string' && state.masterId !== '') next.add(state.masterId)
    if (Array.isArray(state.masterIds)) for (const id of state.masterIds) if (typeof id === 'string') next.add(id)
    misses = 0
    checkedAt = Date.now()
    const changed = next.size !== masters.size || [...next].some(id => !masters.has(id))
    masters = next
    if (changed) onChange?.()
  }

  /** 需要时补查：cheap，重排每一轮都会调。 */
  function ensure() {
    if (disposed || inflight !== null) return
    if (fresh() || giveUp()) return
    if (checkedAt === 0 && Date.now() - lastMissAt < RETRY_MS) return
    inflight = read().finally(() => {
      inflight = null
      if (misses > 0 && misses < MAX_MISSES) lastMissAt = Date.now()
    })
  }

  return {
    /** 当前已知的主会话 id。 */
    ids: () => masters,
    /** 这个 id 是不是 superagent 自己的会话（worker- / orchestrator-）。 */
    isOwnSessionId: isSuperagentSessionId,
    /**
     * 这个宿主里到底有没有装 superagent。
     * 判据是「状态路由至少成功回过一次」：只有这时它的会话行才真的被别人藏起来，
     * 我们跳过它们才是让位；没装的环境里 worker-/orchestrator- 只是普通会话，
     * 跳过它们会让这些行永远不进日期段落（实测有 20 行这样悬在列表最前面）。
     */
    available: () => checkedAt !== 0,
    ensure,
    /** 停掉后台查询。 */
    dispose() {
      disposed = true
      masters = new Set()
      inflight = null
    },
  }
}
