import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const [pageUrl] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []
page.on('console', m => logs.push(m.type() + ': ' + m.text()))
page.on('pageerror', e => logs.push('pageerror: ' + e.message + ' | ' + (e.stack || '').split('\n')[1]))
await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.setItem('dsh-codex-sidebar.settings', JSON.stringify({ dateViewEnabled: false })))
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)
const notice = page.locator('[role="dialog"] button', { hasText: /continue|继续/i }).first()
if (await notice.count() > 0) { await notice.click().catch(() => {}); await page.waitForTimeout(300) }
const bell = await page.evaluate(() => {
  const b = [...document.querySelectorAll('.codex-sidebar-icon-button')].find(el => /date|日期/i.test(el.getAttribute('aria-label') || ''))
  if (!b) return null
  const r = b.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
await page.mouse.click(bell.x, bell.y)
await page.waitForTimeout(2500)
const info = await page.evaluate(() => {
  const sidebar = document.querySelector('[data-slot="sidebar"]')
  const divs = [...sidebar.querySelectorAll('div')].filter(d => {
    const c = typeof d.className === 'string' ? d.className : ''
    return c.includes('flatList') || c.includes('_list') || c.includes('groupSection')
  })
  const seats = [...sidebar.querySelectorAll('[data-row-key^="session:"]')].slice(0, 2).map(r => {
    const g1 = r.parentElement, g2 = g1?.parentElement, g3 = g2?.parentElement
    return {
      key: r.getAttribute('data-row-key').slice(0, 20),
      g1: g1 ? g1.tagName + '.' + String(g1.className || '').slice(0, 24) : null,
      g2: g2 ? g2.tagName + '.' + String(g2.className || '').slice(0, 24) : null,
      g3: g3 ? g3.tagName + '.' + String(g3.className || '').slice(0, 24) + ' children=' + g3.children.length : null
    }
  })
  return {
    dateMode: document.body.hasAttribute('data-codex-sidebar-date-view'),
    containerCandidates: divs.slice(0, 6).map(d => ({ cls: String(d.className || '').slice(0, 40), children: d.children.length })),
    seats,
    headers: document.querySelectorAll('.codex-sidebar-date-header').length,
    workspaceRows: document.querySelectorAll('[data-row-key^="workspace:"]').length
  }
})
console.log(JSON.stringify({ info, logs: logs.filter(t => !/404|Failed to load/.test(t)).slice(0, 15) }, null, 2))
await browser.close()
