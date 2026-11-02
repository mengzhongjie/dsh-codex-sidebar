#!/usr/bin/env node
/**
 * 实验：把「整体缩放」从 body 的 CSS zoom 换成 #root 的 transform: scale。
 * 目的：transform 不影响宿主弹层的坐标计算（getBoundingClientRect 是视觉坐标），
 * 但 CSS zoom 会让宿主把菜单算到视口外面。
 */
import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const [pageUrl] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  const raw = localStorage.getItem('dsh-codex-sidebar.settings')
  const parsed = raw ? JSON.parse(raw) : {}
  parsed.zoom = 1
  localStorage.setItem('dsh-codex-sidebar.settings', JSON.stringify(parsed))
})
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)
const notice = page.locator('[role="dialog"] button', { hasText: /continue|继续/i }).first()
if (await notice.count() > 0) { await notice.click().catch(() => {}); await page.waitForTimeout(300) }

// 在 #root 上做 transform 缩放
const applied = await page.evaluate(() => {
  const root = document.getElementById('root')
  if (!root) return { ok: false }
  const f = 1.25
  root.style.transformOrigin = '0 0'
  root.style.transform = 'scale(' + f + ')'
  root.style.width = (100 / f) + '%'
  root.style.height = (100 / f) + '%'
  return { ok: true, rootClass: root.className }
})
await page.waitForTimeout(600)
await page.screenshot({ path: '.debug/shot-transform-zoom-sidebar.png' })

// 账号菜单在 transform 缩放下的位置
const launcher = await page.evaluate(() => {
  const b = document.querySelector('[data-slot="settings.launcher"] button')
  if (!b) return null
  const r = b.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
let menu = null
if (launcher) {
  await page.mouse.click(launcher.x, launcher.y)
  await page.waitForTimeout(800)
  menu = await page.evaluate(() => {
    const m = document.querySelector('[role="menu"]')
    if (!m) return null
    const r = m.getBoundingClientRect()
    const items = [...m.querySelectorAll('[role="menuitem"]')].map(it => { const b = it.getBoundingClientRect(); return { t: (it.textContent||'').trim().slice(0,10), y: Math.round(b.y), inView: b.bottom <= innerHeight } })
    return { rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, items }
  })
  const item = page.locator('[role="menuitem"]', { hasText: /settings/i }).first()
  if (await item.count() > 0) { await item.click().catch(e => console.log('item click fail')) ; await page.waitForTimeout(1200) }
}
const dialog = await page.evaluate(() => {
  const d = document.querySelector('[role="dialog"]')
  if (!d) return null
  const r = d.getBoundingClientRect()
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), nav: [...document.querySelectorAll('button')].filter(b => String(b.className||'').includes('navCell')).length }
})
await page.screenshot({ path: '.debug/shot-transform-zoom-settings.png' })
console.log(JSON.stringify({ applied, launcher, menu, dialog }, null, 2))
await browser.close()
