import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const url = process.argv[2]
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []
page.on('console', (m) => { const t = m.text(); if (/codex-sidebar|error/i.test(t)) logs.push(t.slice(0, 300)) })
await page.addInitScript(() => { try { window.localStorage.setItem('dsh-codex-sidebar.debug', '1') } catch {} })
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)
for (const b of await page.$$('[role="dialog"] button')) { const t = (await b.textContent()) || ''; if (/continue|继续/i.test(t)) await b.click() }
await page.waitForTimeout(400)
const opener = await page.$('button[aria-label="打开侧边栏"], button[aria-label="Open sidebar"]')
if (opener) { await opener.click(); await page.waitForTimeout(1600) }
const dump = async (label) => page.evaluate((label) => {
  const debug = window.__codexSidebarDebug
  let groupBy = null
  let backup = null
  try {
    const slots = debug.ctx.get('slots')
    const entry = slots.entries('sidebar.workspaces')[0]
    const store = entry.store.create()
    groupBy = store.getSnapshot().groupBy
    backup = window.localStorage.getItem('dsh-codex-sidebar.group-before-date-view')
  } catch (e) { groupBy = 'ERR ' + e.message }
  return {
    label,
    settings: window.localStorage.getItem('dsh-codex-sidebar.settings'),
    groupBy,
    backup,
    listClasses: [...document.querySelectorAll('[data-slot="sidebar"] [class*="list"]')].map((n) => String(n.className).slice(0, 50)).slice(0, 6),
    headers: [...document.querySelectorAll('.codex-sidebar-date-header')].map((n) => n.textContent),
    treeChildren: document.querySelectorAll('[data-slot="sidebar"] [class*="treeBody"] > *').length
  }
}, label)
const out = { before: await dump('before') }
const bell = await page.$('.codex-sidebar-actions button')
const box = await bell.boundingBox()
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
await page.waitForTimeout(2000)
out.after = await dump('after')
out.logs = logs.slice(-8)
console.log(JSON.stringify(out, null, 1))
await browser.close()