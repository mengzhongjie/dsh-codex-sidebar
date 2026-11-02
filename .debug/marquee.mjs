import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const url = process.argv[2]
const shot = process.argv[3]
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []
page.on('console', (m) => logs.push(m.text()))
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message))
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)
for (const b of await page.$$('[role="dialog"] button')) { const t = (await b.textContent()) || ''; if (/continue|继续/i.test(t)) await b.click() }
await page.waitForTimeout(500)
const opener = await page.$('button[aria-label="打开侧边栏"], button[aria-label="Open sidebar"]')
if (opener) { await opener.click(); await page.waitForTimeout(1800) }
const bell = await page.$('.codex-sidebar-actions button')
if (bell && (await bell.getAttribute('aria-pressed')) !== 'true') { await bell.click(); await page.waitForTimeout(1800) }
// 找一条标题被截断的可见行
const info = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('[data-codex-sidebar-date-view] [data-row-key^="session:"]')].filter((r) => r.offsetParent !== null)
  for (const row of rows) {
    for (const c of row.children) {
      const cls = String(c.className || '')
      if (cls.includes('codex-sidebar-chip') || cls.includes('_time') || cls.endsWith('_rowActions') || cls.includes('_slot')) continue
      if (c.scrollWidth - c.clientWidth > 20) { const rect = c.getBoundingClientRect(); return { title: (c.textContent || '').slice(0, 24), overflow: c.scrollWidth - c.clientWidth, x: rect.x, y: rect.y, w: rect.width, h: rect.height } }
    }
  }
  return null
})
const out = { info }
if (info) {
  await page.mouse.move(info.x + info.w / 2, info.y + info.h / 2)
  await page.waitForTimeout(700)
  out.hover = await page.evaluate(() => {
    const titled = [...document.querySelectorAll('.codex-sidebar-marquee')]
    const chip = document.querySelector('[data-codex-sidebar-date-view] [data-row-key^="session:"]:hover .codex-sidebar-chip')
    const anyChipHidden = [...document.querySelectorAll('.codex-sidebar-chip')].some((c) => getComputedStyle(c).display === 'none')
    return { marqueeNodes: titled.length, classes: titled.map((n) => n.className), shifts: titled.map((n) => n.style.getPropertyValue('--codex-sidebar-marquee-shift')), animations: titled.map((n) => getComputedStyle(n).animationName), chipHidden: anyChipHidden, chipHoverSelector: chip !== null }
  })
  await page.screenshot({ path: shot })
  await page.mouse.move(900, 400)
  await page.waitForTimeout(600)
  out.afterLeave = await page.evaluate(() => ({ marqueeNodes: document.querySelectorAll('.codex-sidebar-marquee').length }))
}
console.log(JSON.stringify({ out, logs: logs.slice(-8) }, null, 2))
await browser.close()