import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const url = process.argv[2]
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4200)
for (const b of await page.$$('[role="dialog"] button')) { const t = (await b.textContent()) || ''; if (/continue|继续/i.test(t)) await b.click() }
await page.waitForTimeout(400)
const opener = await page.$('button[aria-label="打开侧边栏"], button[aria-label="Open sidebar"]')
if (opener) { await opener.click(); await page.waitForTimeout(1600) }
const bell = await page.$('.codex-sidebar-actions button')
if (bell) { await bell.click(); await page.waitForTimeout(1700) }
const m = await page.evaluate(() => {
  const side = document.querySelector('[data-slot="sidebar"]').getBoundingClientRect()
  const rows = [...document.querySelectorAll('[data-codex-sidebar-date-view] [data-row-key^="session:"]')].filter((r) => r.offsetParent !== null)
  const heights = rows.map((r) => Math.round(r.getBoundingClientRect().height))
  const first = rows[0]
  const title = first.querySelector('[class*="_title"]')
  const preview = first.querySelector('.codex-sidebar-preview')
  const tr = title.getBoundingClientRect()
  const pr = preview.getBoundingClientRect()
  const cs = getComputedStyle(preview)
  const headers = [...document.querySelectorAll('.codex-sidebar-date-header')]
  const h = headers[0]
  const hr = h.getBoundingClientRect()
  const firstRowTop = rows[0].getBoundingClientRect().top
  return {
    sidebarW: Math.round(side.width),
    rowHeights: heights.slice(0, 10),
    titleX: Math.round(tr.x), titleRight: Math.round(tr.right),
    previewBoxX: Math.round(pr.x), previewTextX: Math.round(pr.x + parseFloat(cs.paddingLeft)),
    previewLines: Math.round(pr.height / parseFloat(cs.lineHeight)),
    headerTextX: Math.round(hr.x), headerToFirstRow: Math.round(firstRowTop - hr.bottom),
    overflowRight: Math.max(...rows.map((r) => Math.round(r.getBoundingClientRect().right))) - Math.round(side.x),
  }
})
console.log(JSON.stringify(m, null, 1))
await browser.close()