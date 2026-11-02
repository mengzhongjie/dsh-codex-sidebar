import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const [pageUrl] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []
page.on('console', m => logs.push(m.type() + ': ' + m.text()))
page.on('pageerror', e => logs.push('pageerror: ' + e.message))
await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.setItem('dsh-codex-sidebar.settings', JSON.stringify({ dateViewEnabled: true })))
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)
const notice = page.locator('[role="dialog"] button', { hasText: /continue|继续/i }).first()
if (await notice.count() > 0) { await notice.click().catch(() => {}); await page.waitForTimeout(300) }
// 点一次铃铛（在顶行）看看能不能生效
const bell = await page.evaluate(() => {
  const b = [...document.querySelectorAll('.codex-sidebar-icon-button')].find(el => /date|日期/i.test(el.getAttribute('aria-label') || ''))
  if (!b) return null
  const r = b.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, pressed: b.getAttribute('aria-pressed') }
})
if (bell) { await page.mouse.click(bell.x, bell.y); await page.waitForTimeout(1500) }
const info = await page.evaluate(() => ({
  dateMode: document.body.hasAttribute('data-codex-sidebar-date-view'),
  dateHeaders: document.querySelectorAll('.codex-sidebar-date-header').length,
  headerTexts: [...document.querySelectorAll('.codex-sidebar-date-header')].map(h => h.textContent),
  flatList: document.querySelectorAll('[class*="flatList"]').length,
  workspaceRows: document.querySelectorAll('[data-row-key^="workspace:"]').length,
  sessionRows: document.querySelectorAll('[data-row-key^="session:"]').length,
  sectionHeader: (() => { const h = [...document.querySelectorAll('div')].find(el => String(el.className||'').includes('sectionHeader')); if (!h) return null; const r = h.getBoundingClientRect(); return { rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } } })(),
  bellPressed: (() => { const b = [...document.querySelectorAll('.codex-sidebar-icon-button')].find(el => /date|日期/i.test(el.getAttribute('aria-label') || '')); return b ? b.getAttribute('aria-pressed') : null })()
}))
console.log(JSON.stringify({ bell, info, logs: logs.filter(t => /codex-sidebar|error/i.test(t)).slice(0, 12) }, null, 2))
await browser.close()
