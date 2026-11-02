
import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const url = process.argv[2]
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
await page.waitForTimeout(1800)
const out = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('[data-codex-sidebar-date-view] [data-row-key^="session:"]')].filter((r) => r.offsetParent !== null).slice(0, 4)
  const info = rows.map((row) => {
    const seat = row.parentElement
    const preview = row.querySelector('.codex-sidebar-preview')
    const rect = row.getBoundingClientRect()
    const seatRect = seat.getBoundingClientRect()
    const pv = preview ? preview.getBoundingClientRect() : null
    const cs = getComputedStyle(row)
    const seatCs = getComputedStyle(seat)
    return {
      text: (row.textContent || '').slice(0, 24),
      rowRect: [Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)],
      seatRect: [Math.round(seatRect.x), Math.round(seatRect.y), Math.round(seatRect.width), Math.round(seatRect.height)],
      seatTag: seat.tagName + '.' + String(seat.className).slice(0, 24),
      seatDisplay: seatCs.display, seatHeight: seatCs.height, seatOverflow: seatCs.overflow,
      rowDisplay: cs.display, rowHeight: cs.height, rowFlexWrap: cs.flexWrap, rowOverflow: cs.overflow,
      previewRect: pv ? [Math.round(pv.x), Math.round(pv.y), Math.round(pv.width), Math.round(pv.height)] : null,
      parentOverflow: getComputedStyle(seat.parentElement).overflow,
      parentDisplay: getComputedStyle(seat.parentElement).display,
      parentHeight: getComputedStyle(seat.parentElement).height,
    }
  })
  return { count: rows.length, info }
})
console.log(JSON.stringify(out, null, 1))
await page.screenshot({ path: '/Users/apple/Desktop/SuperCode/Project/dsh-codex-messagesidebar/.debug/shot-overlap.png', clip: { x: 0, y: 0, width: 280, height: 900 } })
await browser.close()
