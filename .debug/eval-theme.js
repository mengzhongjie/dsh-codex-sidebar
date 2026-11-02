const sleep = ms => new Promise(r => setTimeout(r, ms))
const q = s => document.querySelector(s)
const qa = s => [...document.querySelectorAll(s)]
const ownHeaders = () => qa('[data-codex-sidebar-owned][class*="codex-sidebar-date-header"]')
const themeHeaders = () => qa('[data-dsh-claude-date-header]')
const actions = () => q('.codex-sidebar-actions')
const themeTrigger = () => q('.dsh-claude-active-shelf-actions button[class*="active-shelf-trigger"]')
const visible = el => el !== null && el.getBoundingClientRect().height > 0
const steps = {}

// 1) dormatn：只有齿轮，主题铃铛仍在
steps.dormant = {
  actionsButtons: actions() === null ? 0 : [...actions().querySelectorAll('button')].map(b => b.getAttribute('aria-label')),
  bodyFlags: [...document.body.attributes].map(a => a.name).filter(n => n.startsWith('data-codex-sidebar')).sort(),
  ownHeaders: ownHeaders().length,
  themeTriggerVisible: visible(themeTrigger()),
  themePresent: [...document.body.attributes].some(a => a.name.startsWith('data-dsh-claude'))
}

// 2) 打开设置面板，勾选「由本插件接管日期视图」
actions()?.querySelector('button')?.click()
await sleep(400)
const panel = q('.codex-sidebar-panel')
const takeovers = panel === null ? [] : [...panel.querySelectorAll('input[type="checkbox"]')]
steps.panel = {
  opened: panel !== null,
  rows: panel === null ? 0 : [...panel.querySelectorAll('.codex-sidebar-panel-row')].map(r => r.textContent.slice(0, 34)),
  checkboxCount: takeovers.length
}
takeovers[0]?.click()
await sleep(1200)
steps.afterTakeover = {
  bodyFlags: [...document.body.attributes].map(a => a.name).filter(n => n.startsWith('data-codex-sidebar')).sort(),
  actionsButtons: actions() === null ? 0 : [...actions().querySelectorAll('button')].map(b => b.getAttribute('aria-label')),
  themeTriggerVisible: visible(themeTrigger()),
  themeHeaders: themeHeaders().length
}

// 3) 关掉面板，点我们自己的铃铛进日期视图
q('.codex-sidebar-panel-close')?.click()
await sleep(300)
const buttons = actions() === null ? [] : [...actions().querySelectorAll('button')]
const bell = buttons.find(b => b.getAttribute('aria-pressed') !== null)
bell?.click()
await sleep(1000)
steps.afterEnable = {
  pressed: bell?.getAttribute('aria-pressed'),
  headers: ownHeaders().map(n => n.textContent),
  themeHeaders: themeHeaders().length,
  themeDateMode: document.body.hasAttribute('data-dsh-claude-date-groups'),
  workspaceRows: qa('[data-row-key^="workspace:"]').length,
  visibleSessionRows: qa('[data-row-key^="session:"]').filter(r => r.getBoundingClientRect().height > 0).length
}

// 4) 再点一次退出
bell?.click()
await sleep(900)
steps.afterDisable = {
  pressed: bell?.getAttribute('aria-pressed'),
  headers: ownHeaders().length,
  workspaceRows: qa('[data-row-key^="workspace:"]').length
}

return steps
