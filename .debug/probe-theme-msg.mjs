import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const url = process.argv[2]
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []; const errors = []
page.on('console', (m) => { const t = m.text(); if (t.includes('codex-sidebar')) logs.push(t) })
page.on('pageerror', (e) => errors.push(e.message))
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)
for (const b of await page.$$('[role="dialog"] button')) { const t = (await b.textContent()) || ''; if (/continue|继续/i.test(t)) await b.click() }
await page.waitForTimeout(400)
const opener = await page.$('button[aria-label="打开侧边栏"], button[aria-label="Open sidebar"]')
if (opener) { await opener.click(); await page.waitForTimeout(1600) }
const snap = async () => page.evaluate(() => ({
  dateView: document.body.hasAttribute('data-codex-sidebar-date-view'),
  themeDate: document.body.hasAttribute('data-dsh-claude-date-groups'),
  ourHeaders: document.querySelectorAll('.codex-sidebar-date-header').length,
  themeHeaders: document.querySelectorAll('[data-dsh-claude-date-header]').length,
  workspaceGroups: document.querySelectorAll('[data-row-key^="workspace:"]').length,
  sessionVisible: [...document.querySelectorAll('[data-row-key^="session:"]')].filter((r) => r.offsetParent !== null).length,
  flatList: document.querySelectorAll('[class*="flatList"]').length,
  themeBellDisplay: (() => { const b = document.querySelector('.dsh-claude-active-shelf-trigger'); return b === null ? null : getComputedStyle(b).display })()
}))
const out = { before: await snap() }
const bell = await page.$('.codex-sidebar-actions button')
const box = await bell.boundingBox()
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
await page.waitForTimeout(1000)
out.after1s = await snap()
await page.waitForTimeout(2500)
out.after3s = await snap()
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
await page.waitForTimeout(1500)
out.afterSecondClick = await snap()
out.logs = logs.slice(-6)
out.errors = errors.slice(-4)
await page.screenshot({ path: '/Users/apple/Desktop/SuperCode/Project/dsh-codex-messagesidebar/.debug/shot-theme-msgview.png' })
console.log(JSON.stringify(out, null, 1))
await browser.close()