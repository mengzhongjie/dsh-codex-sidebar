// 文档截图（主题态说明页）：先在宿主设置里切中文，再回到本插件那一页。
const sleep = ms => new Promise(r => setTimeout(r, ms))
const navs = () => [...document.querySelectorAll('button')].filter(b => String(b.className || '').includes('navCell'))
const notice = [...document.querySelectorAll('[role="dialog"] button')].find(b => /continue|继续/i.test(b.textContent || ''))
if (notice) { notice.click(); await sleep(400) }
const gear = [...document.querySelectorAll('button[aria-label]')].find(b => /sidebar settings|侧栏设置/i.test(b.getAttribute('aria-label')))
gear?.click(); await sleep(1000)
navs().find(b => /general|通用/i.test(b.textContent || ''))?.click(); await sleep(700)
const langButton = [...document.querySelectorAll('button')].find(b => String(b.className || '').includes('selector') && /english|中文|chinese/i.test(b.textContent || ''))
langButton?.click(); await sleep(400)
const zh = [...document.querySelectorAll('[role="option"], [role="menuitem"]')].find(o => /中文|chinese/i.test(o.textContent || ''))
zh?.click(); await sleep(1500)
navs().find(b => /侧栏设置|sidebar settings/i.test(b.textContent || ''))?.click(); await sleep(900)
return {
  navLabels: navs().map(b => (b.textContent || '').trim()),
  cards: document.querySelectorAll('.codex-sidebar-settings-card').length,
  text: (document.querySelector('.codex-sidebar-settings') || {}).textContent || ''
}
