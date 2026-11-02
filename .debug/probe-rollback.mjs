
import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const url = process.argv[2]
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []
const errors = []
page.on('console', (m) => { const t = m.text(); if (t.includes('codex-sidebar')) logs.push(m.type() + ': ' + t) })
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)
for (const b of await page.$$('[role="dialog"] button')) { const t = (await b.textContent()) || ''; if (/continue|继续/i.test(t)) await b.click() }
await page.waitForTimeout(500)
const opener = await page.$('button[aria-label="打开侧边栏"], button[aria-label="Open sidebar"]')
if (opener) { await opener.click(); await page.waitForTimeout(1600) }
const bell = await page.$('.codex-sidebar-actions button')
let clicked = false
if (bell) { const b = await bell.boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); clicked = true; await page.waitForTimeout(2200) }
const out = await page.evaluate(() => ({
  bodyAttrs: [...document.body.attributes].map((a) => a.name).filter((n) => n.startsWith('data-codex-sidebar') || n.startsWith('data-dsh-claude-date')).join(','),
  headers: [...document.querySelectorAll('.codex-sidebar-date-header')].map((n) => n.textContent),
  themeHeaders: document.querySelectorAll('[data-dsh-claude-date-header]').length,
  rowsVisible: [...document.querySelectorAll('[data-codex-sidebar-date-view] [data-row-key^="session:"]')].filter((r) => r.offsetParent !== null).length,
  workspaceRows: document.querySelectorAll('[data-row-key^="workspace:"]').length,
  bell: document.querySelector('.codex-sidebar-actions button')?.getAttribute('aria-pressed') ?? null,
}))
console.log(JSON.stringify({ clicked, out, logs, errors }, null, 1))
await page.screenshot({ path: '/Users/apple/Desktop/SuperCode/Project/dsh-codex-messagesidebar/.debug/shot-rollback.png' })
await browser.close()
