// 125% 缩放下的侧栏与设置页观感：开日期视图、量几何、留一张截图。
const out = {}
const sleep = ms => new Promise(r => setTimeout(r, ms))
document.querySelectorAll('[role="dialog"] button').forEach(b => { if (/continue|继续/i.test(b.textContent || '')) b.click() })
await sleep(400)

// 125%
const gear = [...document.querySelectorAll('button[aria-label]')].find(b => /sidebar settings|侧栏设置/i.test(b.getAttribute('aria-label')))
gear?.click(); await sleep(900)
const step125 = [...document.querySelectorAll('.codex-sidebar-zoom-step')].find(b => b.textContent.trim() === '125%')
step125?.click(); await sleep(500)
out.zoom = { attr: document.body.getAttribute('data-codex-sidebar-page-zoom'), computed: getComputedStyle(document.body).zoom, inline: document.body.style.zoom || null }

// 关设置页，开日期视图
const close = [...document.querySelectorAll('[role="dialog"] button')].find(b => /close|关闭/i.test(b.textContent || ''))
close?.click(); await sleep(500)
const bell = [...document.querySelectorAll('button[aria-label]')].find(b => /toggle date view|切换日期视图/i.test(b.getAttribute('aria-label')))
bell?.click(); await sleep(1200)

out.dateView = {
  on: document.body.hasAttribute('data-codex-sidebar-date-view'),
  headers: document.querySelectorAll('.codex-sidebar-date-header').length,
  rows: document.querySelectorAll('[data-row-key^="session:"]').length,
  chips: document.querySelectorAll('.codex-sidebar-chip').length,
  workspaceRows: document.querySelectorAll('[data-row-key^="workspace:"]').length
}
out.geometry = {
  inner: { w: innerWidth, h: innerHeight },
  bodyScroll: document.documentElement.scrollHeight,
  sidebarRect: (() => { const el = document.querySelector('[data-slot="sidebar"]'); if (!el) return null; const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) } })(),
  logoRowRect: (() => { const el = document.querySelector('[data-slot="sidebar"] [class*="logoRow"]'); if (!el) return null; const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) } })(),
  bellRect: (() => { const el = document.querySelector('button[aria-label="Toggle date view"]'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } })()
}
// 设置页再开一次，留在 125% 截屏看缩放后的观感
gear?.click(); await sleep(900)
out.dialogRect = (() => { const d = document.querySelector('[role="dialog"]'); if (!d) return null; const r = d.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } })()
return out;