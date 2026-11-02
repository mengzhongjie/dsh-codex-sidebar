
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
  const row = [...document.querySelectorAll('[data-codex-sidebar-date-view] [data-row-key^="session:"]')].filter((r) => r.offsetParent !== null && r.querySelector('.codex-sidebar-preview'))[0]
  const rules = []
  for (const sheet of document.styleSheets) {
    let list
    try { list = sheet.cssRules } catch { continue }
    const walk = (arr) => { for (const r of arr) { if (r.cssRules) { walk(r.cssRules); continue } if (!r.selectorText) continue
      let hit = false
      try { hit = row.matches(r.selectorText) } catch { continue }
      if (!hit) continue
      const h = r.style && (r.style.height || r.style.minHeight || r.style.overflow || r.style.flexWrap)
      if (h) rules.push({ sel: r.selectorText.slice(0, 120), height: r.style.height, minHeight: r.style.minHeight, overflow: r.style.overflow, wrap: r.style.flexWrap, prio: r.style.getPropertyPriority && r.style.getPropertyPriority('height') })
    } }
    walk(list)
  }
  return {
    inlineStyle: row.getAttribute('style'),
    computedHeight: getComputedStyle(row).height,
    matchesOurs: row.matches('[data-codex-sidebar-date-view] [data-row-key^="session:"]'),
    rules: rules.slice(0, 12),
    bodyAttrs: [...document.body.attributes].map((a) => a.name).filter((n) => n.startsWith('data-')).join(','),
  }
})
console.log(JSON.stringify(out, null, 1))
await browser.close()
