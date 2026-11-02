const sleep = ms => new Promise(r => setTimeout(r, ms))
const q = s => document.querySelector(s)
const qa = s => [...document.querySelectorAll(s)]
const actions = () => q('.codex-sidebar-actions')
const ownHeaders = () => qa('[data-codex-sidebar-owned][class*="codex-sidebar-date-header"]')
const themeHeaders = () => qa('[data-dsh-claude-date-header]')
const themeTrigger = () => q('.dsh-claude-active-shelf-actions button[class*="active-shelf-trigger"]')
const visible = el => el !== null && el.getBoundingClientRect().height > 0
const steps = {}

// 1) 先让主题自己进日期视图
themeTrigger()?.click()
await sleep(1000)
steps.themeOn = {
  themeHeaders: themeHeaders().length,
  themeAttr: document.body.hasAttribute('data-dsh-claude-date-groups'),
  workspaceRows: qa('[data-row-key^="workspace:"]').length
}

// 2) 打开设置，勾选接管：主题应被请出日期视图，它的铃铛被藏起来
actions()?.querySelector('button')?.click()
await sleep(400)
q('.codex-sidebar-panel')?.querySelectorAll('input[type="checkbox"]')[0]?.click()
await sleep(1500)
q('.codex-sidebar-panel-close')?.click()
await sleep(300)
steps.afterTakeover = {
  themeHeaders: themeHeaders().length,
  themeAttr: document.body.hasAttribute('data-dsh-claude-date-groups'),
  themeTriggerVisible: visible(themeTrigger()),
  ownButtons: actions() === null ? [] : [...actions().querySelectorAll('button')].map(b => b.getAttribute('aria-label')),
  workspaceRows: qa('[data-row-key^="workspace:"]').length,
  ownHeaders: ownHeaders().length
}

// 3) 点我们自己的铃铛进日期视图
const buttons = actions() === null ? [] : [...actions().querySelectorAll('button')]
const bell = buttons.find(b => b.getAttribute('aria-pressed') !== null)
bell?.click()
await sleep(1200)
const list = q('[class*="flatList"]')
steps.afterEnable = {
  pressed: bell?.getAttribute('aria-pressed'),
  headers: ownHeaders().map(n => n.textContent),
  flatChildren: list === null ? 0 : list.children.length,
  themeHeaders: themeHeaders().length,
  workspaceRows: qa('[data-row-key^="workspace:"]').length,
  visibleSessionRows: qa('[data-row-key^="session:"]').filter(r => r.getBoundingClientRect().height > 0).length
}

// 4) 退出
bell?.click()
await sleep(900)
steps.afterDisable = {
  pressed: bell?.getAttribute('aria-pressed'),
  ownHeaders: ownHeaders().length,
  themeAttr: document.body.hasAttribute('data-dsh-claude-date-groups'),
  workspaceRows: qa('[data-row-key^="workspace:"]').length
}
return steps
