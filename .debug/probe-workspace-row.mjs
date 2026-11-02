import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const [pageUrl] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []
page.on('console', m => logs.push(m.type() + ': ' + m.text()))
await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.removeItem('dsh-codex-sidebar.settings'))
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)
const notice = page.locator('[role="dialog"] button', { hasText: /continue|继续/i }).first()
if (await notice.count() > 0) { await notice.click().catch(() => {}); await page.waitForTimeout(300) }

const rectOf = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }
const before = await page.evaluate(() => {
  const box = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }
  const actions = document.querySelector('.codex-sidebar-actions')
  const sectionHeader = [...document.querySelectorAll('div')].find(el => String(el.className || '').includes('sectionHeader'))
  return {
    actionsParentCls: actions ? String(actions.parentElement.className || '').slice(0, 40) : null,
    actionsRowChildren: actions ? [...actions.parentElement.children].map(c => ({ tag: c.tagName, cls: String(c.className || '').slice(0, 26), label: c.getAttribute('aria-label'), rect: box(c) })) : [],
    icons: [...document.querySelectorAll('.codex-sidebar-icon-button')].map(b => ({ label: b.getAttribute('aria-label'), rect: box(b), pressed: b.getAttribute('aria-pressed') })),
    sectionHeaderRect: sectionHeader ? box(sectionHeader) : null,
    topRowCls: (() => { const t = document.querySelector('button[class*="toggle"]'); return t ? String(t.parentElement.className || '') : null })(),
    dateHeaders: document.querySelectorAll('.codex-sidebar-date-header').length,
    workspaceRows: document.querySelectorAll('[data-row-key^="workspace:"]').length
  }
})

// 真实鼠标点工作区行里的铃铛
const bellRect = await page.evaluate(() => {
  const b = [...document.querySelectorAll('.codex-sidebar-icon-button')].find(el => /date|日期/i.test(el.getAttribute('aria-label') || ''))
  if (!b) return null
  const r = b.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
let afterClick = null
if (bellRect) {
  await page.mouse.click(bellRect.x, bellRect.y)
  await page.waitForTimeout(1500)
  afterClick = await page.evaluate(() => {
    const box = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }
    const header = [...document.querySelectorAll('div')].find(el => String(el.className || '').includes('sectionHeader'))
    const bell = [...document.querySelectorAll('.codex-sidebar-icon-button')].find(el => /date|日期/i.test(el.getAttribute('aria-label') || ''))
    return {
      dateMode: document.body.hasAttribute('data-codex-sidebar-date-view'),
      dateHeaders: [...document.querySelectorAll('.codex-sidebar-date-header')].map(h => h.textContent),
      workspaceRows: document.querySelectorAll('[data-row-key^="workspace:"]').length,
      sectionHeaderVisible: header ? header.getBoundingClientRect().height > 0 : false,
      sectionHeaderRect: header ? box(header) : null,
      bellStillInSectionRow: bell ? String(bell.closest('[class*="searchSlot"]')?.className || bell.parentElement.className) : null,
      bellRect: bell ? box(bell) : null,
      stored: localStorage.getItem('dsh-codex-sidebar.settings')
    }
  })
}
await page.screenshot({ path: '.debug/shot-workspace-row.png' })
console.log(JSON.stringify({ before, bellRect, afterClick, logs: logs.filter(t => /codex-sidebar|自愈/i.test(t)) }, null, 2))
await browser.close()
