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
if (opener) { await opener.click(); await page.waitForTimeout(1500) }
const bell = await page.$('.codex-sidebar-actions button')
const box = await bell.boundingBox()
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
await page.waitForTimeout(1800)
const out = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('[data-codex-sidebar-date-view] [data-row-key^="session:"]')].filter((r) => r.offsetParent !== null)
  const previews = [...document.querySelectorAll('.codex-sidebar-preview')]
  const chipHidden = (() => { const chip = document.querySelector('[data-codex-sidebar-date-view] .codex-sidebar-chip'); return chip === null ? null : getComputedStyle(chip).display })()
  return {
    dateView: document.body.hasAttribute('data-codex-sidebar-date-view'),
    headers: [...document.querySelectorAll('.codex-sidebar-date-header')].map((n) => n.textContent),
    rowsVisible: rows.length,
    previews: previews.length,
    previewSample: previews.slice(0, 3).map((n) => n.textContent.slice(0, 40)),
    chips: document.querySelectorAll('.codex-sidebar-chip').length,
    themeAttrOnBody: document.body.hasAttribute('data-dsh-claude-date-groups'),
    bellPressed: document.querySelector('.codex-sidebar-actions button')?.getAttribute('aria-pressed')
  }
})
out.logs = logs.slice(-3)
await page.screenshot({ path: '/Users/apple/Desktop/SuperCode/Project/dsh-codex-messagesidebar/.debug/shot-message-view.png' })
console.log(JSON.stringify(out, null, 1))
await browser.close()