/**
 * locale.js — 界面语言判定与文案。
 *
 * 段落标题与设置页文案只有中英两套。判定顺序：
 *   1) 宿主的 locale 服务（读快照的 active 字段，最准）
 *   2) <html lang>
 *   3) 浏览器语言
 * 都没有时退回英文。
 */

/** 两套用词。 */
const LABELS = {
  zh: {
    // 第一段装的是「正在跑的会话 + 今天的会话」，用户要的名字是「优先级」：
    // 活跃会话被强制提到这一段最前，它才是这段的主语。
    today: '优先级',
    yesterday: '昨天',
    earlier: '更早',
    weekdays: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
    untitled: '未命名',
    skipped: '不进入消息视图',
    settingsTitle: '侧栏设置',
    toggleDateView: '消息视图',
    skipSection: '不进入消息视图的工作区',
    zoomSection: '整体缩放',
    zoomCustom: '自定义倍率',
    zoomHint: '缩放整个界面，含侧栏与对话区。按窗口尺寸换算，和 Claude Style 的页面缩放同一套做法。',
    zoomSystem: '100%',
    zoomCustomHint: '可直接填 60–200 之间的数字，回车生效。',
    // 设置页（官方设置页里的一页）
    settingsIntro: '侧栏按消息分段排列、工作区屏蔽。改动即时生效。',
    dateViewHint: '按优先级 / 昨天 / 星期几 / 更早分段排列会话，点顶行铃铛随时切换。',
    skipHint: '勾选的工作区里的会话不会出现在消息视图，工作区视图不受影响。',
    emptyWorkspaces: '还没有工作区',
    // 装了 dsh-claude-style 时的说明（本插件让位，不改主题界面）
    themeNoticeDesc: '检测到 dsh-claude-style：侧栏的日期排列与页面缩放都由主题负责，本插件不修改主题的界面。停用主题后，本插件会自动接管日期视图与缩放。'
  },
  en: {
    today: 'Priority',
    yesterday: 'Yesterday',
    earlier: 'Earlier',
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    untitled: 'Untitled',
    skipped: 'Hidden from message view',
    settingsTitle: 'Sidebar settings',
    toggleDateView: 'Message view',
    skipSection: 'Workspaces hidden from message view',
    zoomSection: 'Zoom',
    zoomCustom: 'Custom zoom',
    zoomHint: 'Scales the whole interface, sidebar and conversation included. Uses the same page-scale approach as Claude Style.',
    zoomSystem: '100%',
    zoomCustomHint: 'Type a percentage between 60 and 200, then press Enter.',
    settingsIntro: 'Message grouping for the sidebar and hidden workspaces. Changes apply immediately.',
    dateViewHint: 'Groups sessions into Priority / Yesterday / weekday / Earlier. Toggle from the bell at the top of the sidebar.',
    skipHint: 'Sessions in checked workspaces are left out of the message view. The workspace view is unaffected.',
    emptyWorkspaces: 'No workspaces yet',
    themeNoticeDesc: 'dsh-claude-style is installed: it provides the sidebar date grouping and page zoom, and this plugin does not modify its UI. Disable the theme and this plugin takes over both.'
  }
}

/** 从任意字符串猜语言：只认中文，其余按英文。 */
function languageOf(text) {
  return String(text ?? '').toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

/** 从宿主 locale 服务里挖出语言字符串（服务结构没写进文档，逐个候选字段试）。 */
function localeFromService(service) {
  if (service === null || service === undefined) return ''
  // active 是宿主 locale 服务快照里的正式字段（dsh-claude-style 也读它），其余是各版本可能的别名。
  const fields = ['active', 'locale', 'language', 'lang', 'current', 'code', 'resolved', 'id']
  for (const field of fields) {
    const value = service[field]
    if (typeof value === 'string' && value !== '') return value
  }
  try {
    const snapshot = typeof service.getSnapshot === 'function' ? service.getSnapshot() : service.snapshot
    if (snapshot !== null && typeof snapshot === 'object') {
      for (const field of fields) {
        const value = snapshot[field]
        if (typeof value === 'string' && value !== '') return value
      }
    }
  } catch {
    // 读取快照失败就继续走后面的候选。
  }
  return ''
}

/** 宿主 locale 服务报的原始语言串（诊断日志用；读不到就是空串）。 */
export function hostLocaleText(ctx) {
  try {
    return localeFromService(ctx?.get?.('locale'))
  } catch {
    return ''
  }
}

/** 判定界面语言，返回 'zh' 或 'en'。 */
export function resolveLocale(ctx) {
  const fromHost = hostLocaleText(ctx)
  if (fromHost !== '') return languageOf(fromHost)
  const fromDocument = document.documentElement.lang
  if (typeof fromDocument === 'string' && fromDocument !== '') return languageOf(fromDocument)
  return languageOf(navigator.language)
}

/** 取某一语言的用词表。 */
export function labelsFor(locale) {
  return locale === 'zh' ? LABELS.zh : LABELS.en
}

/**
 * 造一个「会自己更新」的界面语言源。
 *
 * 为什么不在 apply 时判定一次：宿主的 locale 服务与 <html lang> 都可能比插件晚就绪
 * （实测桌面 App 里 apply 时读到的还是 en，设置页因此整页英文，而宿主导航是中文）。
 * 这里先判一次，然后最多轮询 30 秒；读到宿主值就停，之后靠订阅/轮询捕捉切换。
 *
 * @param ctx 插件上下文（用来取 locale 服务）
 * @returns {{ get: () => object, language: () => string, raw: () => string, subscribe: (fn) => Function, dispose: Function }}
 */
/** 从上下文里取宿主 locale 服务（没有/不允许时返回 null，绝不抛）。 */
function localeServiceOf(ctx) {
  try {
    const service = ctx?.get?.('locale')
    return service === null || service === undefined ? null : service
  } catch {
    // 未声明 inject 或服务尚未注册时这里会抛：当作没有。
    return null
  }
}

/**
 * 造一个「会自己更新」的界面语言源。
 *
 * 为什么不在 apply 时判定一次：桌面 App 实测 apply 时读到的还是 en（设置页整页英文，
 * 而宿主导航是中文）。宿主把语言选择存在 Host 用户设置文档里（namespace "locale"、
 * 字段 "preference"），客户端要等设置文档就绪后才 adopt 过来，所以这里既订阅服务
 * 快照变化，又保留一段轮询兜底，保证「晚就绪 / 中途切换」两种情况都能跟上。
 *
 * @param ctx 插件上下文（用来取 locale 服务）
 * @returns {{ get: () => object, language: () => string, raw: () => string, subscribe: (fn) => Function, dispose: Function }}
 */
export function createLocale(ctx) {
  /** 上一次判定的语言（'zh' / 'en'）。 */
  let language = resolveLocale(ctx)
  /** 当前语言对应的用词表；语言不变时对象复用，便于调用方做身份比较。 */
  let labels = labelsFor(language)
  /** 宿主 locale 服务最后报出的原始串（诊断用）。 */
  let raw = hostLocaleText(ctx)

  const listeners = new Set()
  /** 轮询句柄：0 表示已停。 */
  let timer = 0
  /** 已经轮询的次数（上限 60 次 ≈ 30 秒）。 */
  let attempts = 0
  /** 对宿主 locale 服务的退订函数。 */
  let offService = null

  function stop() {
    if (timer !== 0) {
      window.clearInterval(timer)
      timer = 0
    }
  }

  /** 重新判定；语言变了就换用词表并通知订阅者。 */
  function refresh() {
    const nextRaw = hostLocaleText(ctx)
    const next = resolveLocale(ctx)
    if (nextRaw !== '') raw = nextRaw
    if (next === language) return false
    language = next
    labels = labelsFor(next)
    for (const listener of listeners) {
      try {
        listener(language, labels)
      } catch {
        // 单个订阅者出错不影响其他订阅者。
      }
    }
    return true
  }

  /**
   * 绑定宿主 locale 服务的订阅（服务可能比插件晚注册，所以每轮都试一次）。
   * 宿主快照在 adopt 设置文档后会变：订阅比轮询更及时，也不会白耗一次请求。
   */
  function bindService() {
    if (offService !== null) return true
    const service = localeServiceOf(ctx)
    if (service === null || typeof service.subscribe !== 'function') return false
    try {
      const off = service.subscribe(() => refresh())
      offService = typeof off === 'function' ? off : () => {}
      return true
    } catch {
      // 订阅失败就只靠轮询。
      return false
    }
  }

  /** 轮询一次：绑定到服务并且读到值（或轮询到期）就停。 */
  function tick() {
    attempts += 1
    const bound = bindService()
    refresh()
    if ((bound && raw !== '') || attempts >= 60) stop()
  }

  // 用 setTimeout 链而不是 setInterval：每次回调里可能触发别的重排，串行更稳。
  function scheduleTick() {
    timer = window.setTimeout(() => {
      timer = 0
      tick()
      if (timer === 0 && attempts < 60) scheduleTick()
    }, 500)
  }
  if (bindService()) refresh()
  scheduleTick()

  return {
    /** 当前用词表（调用时顺手刷新一次，切换语言后立刻生效）。 */
    get() {
      refresh()
      return labels
    },
    /** 当前语言。 */
    language() {
      refresh()
      return language
    },
    /** 宿主 locale 服务报的原始串（没有就是空串）。 */
    raw() {
      refresh()
      return raw
    },
    /** 订阅语言变化；返回取消函数。 */
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    /** 停掉轮询与宿主订阅，清空订阅者。 */
    dispose() {
      stop()
      if (offService !== null) {
        try {
          offService()
        } catch {
          // 退订失败不影响卸载。
        }
        offService = null
      }
      listeners.clear()
    }
  }
}
