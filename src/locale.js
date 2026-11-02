/**
 * locale.js — 界面语言判定与文案。
 *
 * 段落标题与设置页文案只有中英两套。判定顺序：
 *   1) 宿主的 locale 服务（能读到就用，最准）
 *   2) <html lang>
 *   3) 浏览器语言
 * 都没有时退回英文。
 */

/** 两套用词。 */
const LABELS = {
  zh: {
    today: '今天',
    yesterday: '昨天',
    earlier: '更早',
    weekdays: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
    untitled: '未命名',
    skipped: '不进入日期视图',
    settingsTitle: '侧栏设置',
    toggleDateView: '日期视图',
    skipSection: '不进入日期视图的工作区',
    zoomSection: '整体缩放',
    zoomCustom: '自定义倍率',
    // 设置页（官方设置页里的一页）
    settingsIntro: '侧栏按日期排列、工作区屏蔽与整体缩放。改动即时生效。',
    dateViewHint: '按今天 / 昨天 / 星期几 / 更早分段排列会话，点顶行铃铛随时切换。',
    takeoverLabel: '由本插件接管日期视图',
    takeoverHint: '检测到 dsh-claude-style：默认由主题提供日期视图，打开后改由本插件提供（主题的铃铛会被隐藏）。',
    skipHint: '勾选的工作区里的会话不会出现在日期视图，工作区视图不受影响。',
    zoomHint: '缩放整个界面，含侧栏与对话区。',
    emptyWorkspaces: '还没有工作区'
  },
  en: {
    today: 'Today',
    yesterday: 'Yesterday',
    earlier: 'Earlier',
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    untitled: 'Untitled',
    skipped: 'Hidden from date view',
    settingsTitle: 'Sidebar settings',
    toggleDateView: 'Date view',
    skipSection: 'Workspaces hidden from date view',
    zoomSection: 'Zoom',
    zoomCustom: 'Custom zoom',
    settingsIntro: 'Date grouping for the sidebar, hidden workspaces, and page zoom. Changes apply immediately.',
    dateViewHint: 'Groups sessions into Today / Yesterday / weekday / Earlier. Toggle from the bell at the top of the sidebar.',
    takeoverLabel: 'Take over the date view',
    takeoverHint: 'dsh-claude-style detected: its date view is used by default. Turn on to let this plugin provide it instead (the theme bell is hidden).',
    skipHint: 'Sessions in checked workspaces are left out of the date view. The workspace view is unaffected.',
    zoomHint: 'Scales the whole interface, sidebar and conversation included.',
    emptyWorkspaces: 'No workspaces yet'
  }
}

/** 从任意字符串猜语言：只认中文，其余按英文。 */
function languageOf(text) {
  return String(text ?? '').toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

/** 从宿主 locale 服务里挖出语言字符串（服务结构没写进文档，逐个候选字段试）。 */
function localeFromService(service) {
  if (service === null || service === undefined) return ''
  const fields = ['locale', 'language', 'lang', 'current', 'code', 'resolved', 'id']
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

/** 判定界面语言，返回 'zh' 或 'en'。 */
export function resolveLocale(ctx) {
  let fromHost = ''
  try {
    fromHost = localeFromService(ctx?.get?.('locale'))
  } catch {
    fromHost = ''
  }
  if (fromHost !== '') return languageOf(fromHost)
  const fromDocument = document.documentElement.lang
  if (typeof fromDocument === 'string' && fromDocument !== '') return languageOf(fromDocument)
  return languageOf(navigator.language)
}

/** 取某一语言的用词表。 */
export function labelsFor(locale) {
  return locale === 'zh' ? LABELS.zh : LABELS.en
}
