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
const snap = async (label) => page.evaluate((label) => {
  const groups = [...document.querySelectorAll('[data-row-key^="workspace:"]')]
  return {
    label,
    bodyAttrs: [...document.body.attributes].map((a) => a.name).filter((n) => n.startsWith('data-')),
    ourBell: document.querySelectorAll('.codex-sidebar-actions button').length,
    themeBell: document.querySelectorAll('.dsh-claude-active-shelf-trigger').length,
    themeBellDisplay: (() => { const b = document.querySelector('.dsh-claude-active-shelf-trigger'); return b === null ? null : getComputedStyle(b).display })(),
    sessionRowsVisible: [...document.querySelectorAll('[data-row-key^="session:"]')].filter((r) => r.offsetParent !== null).length,
    workspaceRows: groups.length,
    dateHeadersOurs: document.querySelectorAll('.codex-sidebar-date-header').length,
    dateHeadersTheme: document.querySelectorAll('[data-dsh-claude-date-header]').length,
    flatList: document.querySelectorAll('[class*="flatList"]').length,
  }
}, label)
const out = { before: await snap('before') }
const bell = await page.$('.codex-sidebar-actions button')
if (bell) {
  const box = await bell.boundingBox()
  out.bellBox = box
  const hit = await page.evaluate(({ x, y }) => { const el = document.elementFromPoint(x, y); return el === null ? null : { tag: el.tagName, cls: String(el.className).slice(0, 60), own: el.closest('[data-codex-sidebar-owned]') !== null } }, { x: box.x + box.width / 2, y: box.y + box.height / 2 })
  out.hitElement = hit
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(1600)
  out.afterOurBell = await snap('afterOurBell')
}
out.logs = logs.slice(-4)
await page.screenshot({ path: '/Users/apple/Desktop/SuperCode/Project/dsh-codex-messagesidebar/.debug/shot-bell-click.png' })
console.log(JSON.stringify(out, null, 1))
await browser.close()