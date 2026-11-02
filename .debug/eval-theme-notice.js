// 有主题时的设置页：整页只有一句说明，卡片为 0（主题负责日期视图与缩放）。
const sleep = ms => new Promise(r => setTimeout(r, ms))
document.querySelectorAll('[role="dialog"] button').forEach(b => { if (/continue|继续/i.test(b.textContent || '')) b.click() })
await sleep(400)
const gear = [...document.querySelectorAll('button[aria-label]')].find(b => /sidebar settings|侧栏设置/i.test(b.getAttribute('aria-label')))
gear?.click(); await sleep(1200)
const navs = [...document.querySelectorAll('button')].filter(b => String(b.className || '').includes('navCell'))
return {
  themePresent: !!document.querySelector('[class*="dsh-claude-"]'),
  active: navs.filter(b => String(b.className).includes('active')).map(b => b.textContent.trim()),
  navLabels: navs.map(b => b.textContent.trim()),
  cards: document.querySelectorAll('.codex-sidebar-settings-card').length,
  text: (document.querySelector('.codex-sidebar-settings') || {}).textContent || '',
  themeZoomAttr: document.body.getAttribute('data-dsh-claude-page-zoom'),
  ourZoomAttr: document.body.getAttribute('data-codex-sidebar-page-zoom'),
  inlineZoom: document.body.style.zoom || null,
  computedZoom: getComputedStyle(document.body).zoom
}
