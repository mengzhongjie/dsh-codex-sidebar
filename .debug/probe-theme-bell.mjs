import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const url = process.argv[2]
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []
page.on('console', (m) => { const t = m.text(); if (t.includes('codex-sidebar')) logs.push(t) })
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)
for (const b of await page.$$('[role="dialog"] button')) { const t = (await b.textContent()) || ''; if (/continue|继续/i.test(t)) await b.click() }
await page.waitForTimeout(400)
const opener = await page.$('button[aria-label="打开侧边栏"], button[aria-label="Open sidebar"]')
if (opener) { await opener.click(); await page.waitForTimeout(1600) }
const snap = async (label) => page.evaluate((label) => ({
  label,
  body: [...document.body.attributes].map((a) => a.name).filter((n) => n.startsWith('data-')),
  ourBell: document.querySelectorAll('.codex-sidebar-actions button').length,
  ourBellOwn: document.querySelectorAll('[data-codex-sidebar-bell]').length,
  themeTrigger: document.querySelectorAll('.dsh-claude-active-shelf-trigger').length,
  themeTriggerDisplay: (() => { const b = document.querySelector('.dsh-claude-active-shelf-trigger'); return b === null ? null : getComputedStyle(b).display })(),
  themeTriggerPressed: (() => { const b = document.querySelector('.dsh-claude-active-shelf-trigger'); return b === null ? null : b.getAttribute('aria-pressed') })(),
  workspaceGroups: document.querySelectorAll('[data-row-key^="workspace:"]').length,
  sessionVisible: [...document.querySelectorAll('[data-row-key^="session:"]')].filter((r) => r.offsetParent !== null).length,
  ourHeaders: document.querySelectorAll('.codex-sidebar-date-header').length,
  themeHeaders: document.querySelectorAll('[data-dsh-claude-date-header]').length
}), label)
const out = { before: await snap('before') }
const bell = await page.$('.codex-sidebar-actions button')
if (bell) {
  const box = await bell.boundingBox()
  out.bellBox = box
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(1500)
  out.afterClick = await snap('afterClick')
}
out.logs = logs.slice(-4)
await page.screenshot({ path: '/Users/apple/Desktop/SuperCode/Project/dsh-codex-messagesidebar/.debug/shot-theme-bell.png' })
console.log(JSON.stringify(out, null, 1))
await browser.close()