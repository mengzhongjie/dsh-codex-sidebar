
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
  const pick = () => [...document.querySelectorAll('[data-codex-sidebar-date-view] [data-row-key^="session:"]')].filter((r) => r.offsetParent !== null && r.querySelector('.codex-sidebar-preview'))[0]
  const measure = (label) => {
    const row = pick()
    const pv = row.querySelector('.codex-sidebar-preview')
    const rr = row.getBoundingClientRect()
    const pr = pv.getBoundingClientRect()
    const cs = getComputedStyle(row)
    const pcs = getComputedStyle(pv)
    return { label, rowH: Math.round(rr.height), rowBottom: Math.round(rr.bottom), previewTop: Math.round(pr.top), previewH: Math.round(pr.height), overflow: cs.overflow, position: cs.position, pvPosition: pcs.position, heightCss: cs.height, minHeight: cs.minHeight, seatH: Math.round(row.parentElement.getBoundingClientRect().height) }
  }
  const before = measure('before')
  // 试 1：行内 height auto !important
  const row = pick()
  row.style.setProperty('height', 'auto', 'important')
  row.style.setProperty('min-height', '0', 'important')
  const afterInline = measure('afterInlineHeightAuto')
  // 试 2：预览改成行内块/换行更明确
  row.style.removeProperty('height')
  row.style.removeProperty('min-height')
  const pv = row.querySelector('.codex-sidebar-preview')
  pv.style.setProperty('display', 'block', 'important')
  pv.style.setProperty('flex-basis', '100%', 'important')
  const afterPvBlock = measure('afterPreviewBlock')
  return { before, afterInline, afterPvBlock }
})
console.log(JSON.stringify(out, null, 1))
await browser.close()
