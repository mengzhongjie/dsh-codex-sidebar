#!/usr/bin/env node
/**
 * 探针：原生皮肤（无主题）下，顶行铃铛是否挂上、齿轮能否打开官方设置、125% 缩放下
 * 账号菜单是否仍在视口内、设置页能否打开。
 */
import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'

const [pageUrl] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []
page.on('console', msg => logs.push(msg.text()))
await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.removeItem('dsh-codex-sidebar.settings'))
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)
async function dismissNotice() {
  const notice = page.locator('[role="dialog"] button', { hasText: /continue|继续/i }).first()
  if (await notice.count() > 0) { await notice.click().catch(() => {}); await page.waitForTimeout(300) }
}
await dismissNotice()

// 新页面默认侧栏折叠（宽度 0）：先点开，否则顶行/列表都读不到。
const expandSidebar = async () => {
  const needExpand = await page.evaluate(() => {
    const s = document.querySelector('[data-slot="sidebar"]')
    return !s || s.getBoundingClientRect().width < 100
  })
  if (!needExpand) return false
  const button = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(el => /打开侧边栏|expand sidebar|open sidebar/i.test(el.getAttribute('aria-label') || ''))
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  if (!button) return false
  await page.mouse.click(button.x, button.y)
  await page.waitForTimeout(2200)
  return true
}
const expanded = await expandSidebar()

const structure = await page.evaluate(() => {
  const describe = el => ({
    tag: el.tagName,
    cls: String(el.className || '').slice(0, 40),
    label: el.getAttribute('aria-label'),
    own: el.hasAttribute('data-codex-sidebar-owned')
  })
  const sidebar = document.querySelector('[data-slot="sidebar"]')
  const actions = document.querySelector('.codex-sidebar-actions')
  const bell = [...document.querySelectorAll('.codex-sidebar-icon-button')].find(b => (b.getAttribute('aria-label')||'').includes('日期') || (b.getAttribute('aria-label')||'').toLowerCase().includes('date'))
  const box = bell ? bell.getBoundingClientRect() : null
  return {
    sidebarWidth: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : null,
    actionsParentCls: actions ? String(actions.parentElement.className || '').slice(0, 40) : null,
    actionsRowChildren: actions ? [...actions.parentElement.children].map(describe) : [],
    ownedCount: document.querySelectorAll('[data-codex-sidebar-owned]').length,
    bellVisible: bell ? { label: bell.getAttribute('aria-label'), ariaPressed: bell.getAttribute('aria-pressed'), x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) } : null
  }
})

// 真实鼠标点齿轮
const gearPoint = await page.evaluate(() => {
  const gear = [...document.querySelectorAll('.codex-sidebar-icon-button')].find(b => {
    const t = (b.getAttribute('aria-label') || '').toLowerCase()
    return t.includes('设置') || t.includes('settings') || t.includes('sidebar settings')
  })
  if (!gear) return null
  const r = gear.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
if (gearPoint) { await page.mouse.click(gearPoint.x, gearPoint.y); await page.waitForTimeout(1400) }
const afterGear = await page.evaluate(() => ({
  dialog: (() => { const d = document.querySelector('[role="dialog"]'); if (!d) return null; const r = d.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) } })(),
  navLabels: [...document.querySelectorAll('button')].filter(b => String(b.className || '').includes('navCell')).map(b => (b.textContent || '').trim()),
  activeNav: [...document.querySelectorAll('button')].filter(b => String(b.className || '').includes('navCell') && String(b.className).includes('active')).map(b => (b.textContent || '').trim())
}))
await page.keyboard.press('Escape')
await page.waitForTimeout(500)

// 125%：写设置后重载
await page.evaluate(() => {
  const raw = localStorage.getItem('dsh-codex-sidebar.settings')
  const parsed = raw ? JSON.parse(raw) : {}
  parsed.zoom = 1.25
  localStorage.setItem('dsh-codex-sidebar.settings', JSON.stringify(parsed))
})
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)
await dismissNotice()
const zoomApplied = await page.evaluate(() => {
  const root = document.getElementById('root')
  const sidebar = document.querySelector('[data-slot="sidebar"]')
  return {
    bodyAttr: document.body.getAttribute('data-codex-sidebar-page-zoom'),
    rootTransform: root ? getComputedStyle(root).transform : null,
    rootBox: root ? { w: Math.round(root.getBoundingClientRect().width), h: Math.round(root.getBoundingClientRect().height) } : null,
    sidebarWidth: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : null,
    bell: (() => { const b = document.querySelector('.codex-sidebar-icon-button'); if (!b) return null; const r = b.getBoundingClientRect(); return { label: b.getAttribute('aria-label'), x: Math.round(r.x), y: Math.round(r.y) } })()
  }
})
const launcherPoint = await page.evaluate(() => {
  const b = document.querySelector('[data-slot="settings.launcher"] button')
  if (!b) return null
  const r = b.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
let zoomMenu = null
if (launcherPoint) {
  await page.mouse.click(launcherPoint.x, launcherPoint.y)
  await page.waitForTimeout(700)
  zoomMenu = await page.evaluate(() => {
    const m = document.querySelector('[role="menu"]')
    if (!m) return null
    const r = m.getBoundingClientRect()
    return {
      rect: { x: Math.round(r.x), y: Math.round(r.y) },
      items: [...m.querySelectorAll('[role="menuitem"]')].map(it => { const b = it.getBoundingClientRect(); return { t: (it.textContent || '').trim().slice(0, 12), y: Math.round(b.y), inView: b.bottom <= innerHeight && b.top >= 0 } })
    }
  })
  const item = page.locator('[role="menuitem"]', { hasText: /settings|设置/i }).first()
  if (await item.count() > 0) { await item.click().catch(() => {}); await page.waitForTimeout(1400) }
}
const zoomDialog = await page.evaluate(() => {
  const d = document.querySelector('[role="dialog"]')
  if (!d) return null
  const r = d.getBoundingClientRect()
  return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), nav: [...document.querySelectorAll('button')].filter(b => String(b.className || '').includes('navCell')).length }
})
await page.screenshot({ path: '.debug/shot-native-zoom.png' })
console.log(JSON.stringify({ expanded, structure, gearPoint, afterGear, zoomApplied, zoomMenu, zoomDialog, logs: logs.filter(t => t.includes('codex-sidebar')) }, null, 2))
await browser.close()
