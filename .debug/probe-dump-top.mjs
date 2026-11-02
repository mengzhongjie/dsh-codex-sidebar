import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const [pageUrl] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)
const notice = page.locator('[role="dialog"] button', { hasText: /continue|继续/i }).first()
if (await notice.count() > 0) { await notice.click().catch(() => {}); await page.waitForTimeout(300) }
const info = await page.evaluate(() => {
  const slot = document.querySelector('[data-slot="sidebar"]')
  const rectOf = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }
  return {
    slotTag: slot ? slot.tagName : null,
    slotRect: slot ? rectOf(slot) : null,
    slotChildren: slot ? [...slot.children].map(c => ({ tag: c.tagName, cls: String(c.className || '').slice(0, 30), rect: rectOf(c) })) : [],
    buttons: [...document.querySelectorAll('button')].slice(0, 40).map(b => ({ label: b.getAttribute('aria-label'), cls: String(b.className || '').slice(0, 26), rect: rectOf(b) }))
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
