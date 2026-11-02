import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const url = process.argv[2]
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []
page.on('console', (m) => { const t = m.text(); if (t.includes('codex-sidebar')) logs.push(t) })
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4200)
for (const b of await page.$$('[role="dialog"] button')) { const t = (await b.textContent()) || ''; if (/continue|继续/i.test(t)) await b.click() }
await page.waitForTimeout(400)
const opener = await page.$('button[aria-label="打开侧边栏"], button[aria-label="Open sidebar"]')
if (opener) { await opener.click(); await page.waitForTimeout(1600) }
const out = {}
out.actionButtons = await page.evaluate(() => [...document.querySelectorAll('.codex-sidebar-actions button')].map((b) => b.getAttribute('aria-label')))
out.gearAbsent = await page.evaluate(() => document.querySelector('.codex-sidebar-actions button[aria-label*="ettings"], .codex-sidebar-actions button[aria-label*="设置"]') === null)
const bell = await page.$('.codex-sidebar-actions button')
if (bell) { await bell.click(); await page.waitForTimeout(1700) }
out.afterOpen = await page.evaluate(() => ({ pressed: document.querySelector('.codex-sidebar-actions button')?.getAttribute('aria-pressed'), headers: [...document.querySelectorAll('.codex-sidebar-date-header')].map((n) => n.textContent), rows: [...document.querySelectorAll('[data-codex-sidebar-date-view] [data-row-key^="session:"]')].filter((r) => r.offsetParent !== null).length, previews: document.querySelectorAll('.codex-sidebar-preview').length, firstPreview: document.querySelector('.codex-sidebar-preview')?.textContent.slice(0, 40) }))
// 悬停：标题滑动 + 小字隐藏
const box = await page.evaluate(() => {
  for (const row of document.querySelectorAll('[data-codex-sidebar-date-view] [data-row-key^="session:"]')) {
    if (row.offsetParent === null) continue
    const t = row.querySelector('[class*="_title"]')
    if (t && t.scrollWidth - t.clientWidth > 20) { const r = t.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } }
  }
  return null
})
if (box) {
  await page.mouse.move(box.x, box.y)
  await page.waitForTimeout(600)
  out.hover = await page.evaluate(() => ({ marquee: document.querySelectorAll('.codex-sidebar-marquee').length, chipHidden: [...document.querySelectorAll('.codex-sidebar-chip')].some((c) => getComputedStyle(c).display === 'none'), previewKept: document.querySelectorAll('.codex-sidebar-preview').length }))
  await page.mouse.move(1000, 500)
  await page.waitForTimeout(400)
}
await page.screenshot({ path: process.argv[3] })
// 再关一次，确认还原
if (bell) { await bell.click(); await page.waitForTimeout(1700) }
out.afterClose = await page.evaluate(() => ({ headers: document.querySelectorAll('.codex-sidebar-date-header').length, previews: document.querySelectorAll('.codex-sidebar-preview').length, workspaceRows: document.querySelectorAll('[data-row-key^="workspace:"]').length }))
out.logs = logs.slice(-4)
console.log(JSON.stringify(out, null, 1))
await browser.close()