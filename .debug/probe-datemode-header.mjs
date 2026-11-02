import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const [pageUrl] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.setItem('dsh-codex-sidebar.settings', JSON.stringify({ dateViewEnabled: true })))
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)
const notice = page.locator('[role="dialog"] button', { hasText: /continue|继续/i }).first()
if (await notice.count() > 0) { await notice.click().catch(() => {}); await page.waitForTimeout(300) }
const info = await page.evaluate(() => {
  const rectOf = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }
  const header = [...document.querySelectorAll('.bhn1Oq_sectionHeader, div')].find(el => {
    const t = (el.textContent || '').trim()
    return (t === 'Workspaces' || t === '工作区') && el.children.length > 0 && String(el.className || '').includes('sectionHeader')
  })
  const searchButton = document.querySelector('button[aria-label="Search sessions"], button[aria-label="搜索会话"]')
  const title = document.title
  return {
    dateMode: document.body.hasAttribute('data-codex-sidebar-date-view'),
    dateHeaders: document.querySelectorAll('.codex-sidebar-date-header').length,
    sectionHeader: header ? { cls: String(header.className || ''), rect: rectOf(header), display: getComputedStyle(header).display, visible: header.getBoundingClientRect().height > 0 } : null,
    searchButton: searchButton ? { rect: rectOf(searchButton), visible: searchButton.getBoundingClientRect().height > 0 } : null,
    searchSlotParentCls: searchButton ? String(searchButton.closest('[class*="searchSlot"]')?.className || '') : null,
    bellInTopRow: !!document.querySelector('.codex-sidebar-actions'),
    bellRowCls: (() => { const a = document.querySelector('.codex-sidebar-actions'); return a ? String(a.parentElement.className || '') : null })(),
    workspaceRows: document.querySelectorAll('[data-row-key^="workspace:"]').length,
    title
  }
})
console.log(JSON.stringify(info, null, 2))
await page.screenshot({ path: '.debug/shot-datemode-header.png' })
await browser.close()
