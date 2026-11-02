import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const [pageUrl] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)
const rows = await page.evaluate(() => {
  const header = [...document.querySelectorAll('div')].find(el => String(el.className || '').includes('sectionHeader'))
  if (!header) return { error: 'no header' }
  const out = []
  for (const el of header.querySelectorAll('button, [role="button"]')) {
    const r = el.getBoundingClientRect()
    out.push({ label: el.getAttribute('aria-label'), cls: String(el.className || '').slice(0, 26), x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height) })
  }
  const hr = header.getBoundingClientRect()
  return { headerRect: { x: Math.round(hr.x), w: Math.round(hr.width) }, buttons: out, html: header.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '').slice(0, 900) }
})
console.log(JSON.stringify(rows, null, 2))
await browser.close()
