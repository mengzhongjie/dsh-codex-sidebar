
import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const url = process.argv[2]
const shotPath = process.argv[3]
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4200)
for (const b of await page.$$('[role="dialog"] button')) { const t = (await b.textContent()) || ''; if (/continue|继续/i.test(t)) await b.click() }
await page.waitForTimeout(400)
const opener = await page.$('button[aria-label="打开侧边栏"], button[aria-label="Open sidebar"]')
if (opener) { await opener.click(); await page.waitForTimeout(1500) }
const bell = await page.$('.codex-sidebar-actions button')
const box = await bell.boundingBox()
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
await page.waitForTimeout(2000)
const out = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('[data-codex-sidebar-date-view] [data-row-key^="session:"]')].filter((r) => r.offsetParent !== null)
  let overlaps = 0
  const samples = []
  const containers = []
  for (const row of rows) {
    const rect = row.getBoundingClientRect()
    const seat = row.parentElement.getBoundingClientRect()
    const pv = row.querySelector('.codex-sidebar-preview')
    const pvRect = pv ? pv.getBoundingClientRect() : null
    if (pvRect && pvRect.bottom > seat.bottom + 1) { overlaps += 1; if (samples.length < 3) samples.push({ text: (row.textContent || '').slice(0, 20), rowH: Math.round(rect.height), seatH: Math.round(seat.height), pvBottom: Math.round(pvRect.bottom), seatBottom: Math.round(seat.bottom) }) }
    containers.push([Math.round(seat.top), Math.round(seat.height)])
  }
  // 相邻座位是否相互重叠
  containers.sort((a, b) => a[0] - b[0])
  let seatOverlaps = 0
  for (let i = 1; i < containers.length; i += 1) if (containers[i][0] < containers[i - 1][0] + containers[i - 1][1] - 1) seatOverlaps += 1
  return { rows: rows.length, previewOverflow: overlaps, seatOverlaps, samples, headers: [...document.querySelectorAll('.codex-sidebar-date-header')].map((n) => n.textContent) }
})
out.logs = []
await page.screenshot({ path: shotPath, clip: { x: 0, y: 0, width: 300, height: 900 } })
console.log(JSON.stringify(out, null, 1))
await browser.close()
