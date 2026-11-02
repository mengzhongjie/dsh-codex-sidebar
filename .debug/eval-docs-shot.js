// 文档截图：打开官方设置页并停在本插件那一页（默认 100%，全新 browser context）。
const sleep = ms => new Promise(r => setTimeout(r, ms))
document.querySelectorAll('[role="dialog"] button').forEach(b => { if (/continue|继续/i.test(b.textContent || '')) b.click() })
await sleep(400)
const gear = [...document.querySelectorAll('button[aria-label]')].find(b => /sidebar settings|侧栏设置/i.test(b.getAttribute('aria-label')))
gear?.click(); await sleep(1200)
const navs = [...document.querySelectorAll('button')].filter(b => String(b.className || '').includes('navCell'))
return {
  active: navs.filter(b => String(b.className).includes('active')).map(b => b.textContent.trim()),
  cards: document.querySelectorAll('.codex-sidebar-settings-card').length,
  zoomSteps: [...document.querySelectorAll('.codex-sidebar-zoom-step')].map(b => b.textContent.trim()),
  zoom: document.body.getAttribute('data-codex-sidebar-page-zoom')
}
