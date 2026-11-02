import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const [pageUrl] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)
const notice = page.locator('[role="dialog"] button', { hasText: /continue|继续/i }).first()
if (await notice.count() > 0) { await notice.click().catch(() => {}); await page.waitForTimeout(300) }
const info = await page.evaluate(() => {
  const rectOf = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }
  // 找「工作区」这一行的标题与动作按钮
  const all = [...document.querySelectorAll('div,span,button')]
  const headerLike = all.filter(el => {
    const t = (el.textContent || '').trim()
    return t === 'Workspaces' || t === '工作区'
  })
  const header = headerLike[0] || null
  const row = header ? header.parentElement : null
  return {
    headerTag: header ? header.tagName + '.' + String(header.className || '').slice(0, 30) : null,
    rowTag: row ? row.tagName + '.' + String(row.className || '').slice(0, 40) : null,
    rowRect: row ? rectOf(row) : null,
    rowHTML: row ? row.outerHTML.slice(0, 700) : null,
    rowButtons: row ? [...row.querySelectorAll('button')].map(b => ({ label: b.getAttribute('aria-label'), cls: String(b.className || '').slice(0, 26), rect: rectOf(b) })) : []
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
