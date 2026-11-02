const sleep = ms => new Promise(r => setTimeout(r, ms))
const q = s => document.querySelector(s)
const qa = s => [...document.querySelectorAll(s)]
const ownHeaders = () => qa('[data-codex-sidebar-owned][class*="codex-sidebar-date-header"]')
const actions = () => q('.codex-sidebar-actions')
const steps = {}

steps.initial = {
  actionsButtons: actions() === null ? 0 : [...actions().querySelectorAll('button')].map(b => b.getAttribute('aria-label')),
  bodyFlags: [...document.body.attributes].map(a => a.name).filter(n => n.startsWith('data-codex-sidebar')).sort(),
  headers: ownHeaders().map(n => n.textContent),
  workspaceRows: qa('[data-row-key^="workspace:"]').length,
  themeTrigger: q('.dsh-claude-active-shelf-actions button[class*="active-shelf-trigger"]') !== null
}

// 第一次点铃铛：进入日期视图
actions()?.querySelector('button')?.click()
await sleep(900)
const list = q('[class*="flatList"]')
steps.afterEnable = {
  pressed: actions()?.querySelector('button')?.getAttribute('aria-pressed'),
  headers: ownHeaders().map(n => n.textContent),
  flatListFound: list !== null,
  flatChildren: list === null ? 0 : list.children.length,
  workspaceRows: qa('[data-row-key^="workspace:"]').length,
  chips: qa('.codex-sidebar-chip').length,
  visibleSessionRows: qa('[data-row-key^="session:"]').filter(r => r.getBoundingClientRect().height > 0).length
}

// 第二次点铃铛：退出并还原
actions()?.querySelector('button')?.click()
await sleep(900)
steps.afterDisable = {
  pressed: actions()?.querySelector('button')?.getAttribute('aria-pressed'),
  headers: ownHeaders().length,
  workspaceRows: qa('[data-row-key^="workspace:"]').length,
  chips: qa('.codex-sidebar-chip').length
}

return steps
