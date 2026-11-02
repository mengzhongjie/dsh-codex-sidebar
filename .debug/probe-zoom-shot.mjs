#!/usr/bin/env node
/** 125% 缩放下宿主设置页长什么样（键盘快捷键打开，绕开菜单定位问题）。 */
import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const [pageUrl] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  const raw = localStorage.getItem('dsh-codex-sidebar.settings')
  const parsed = raw ? JSON.parse(raw) : {}
  parsed.zoom = 1.25
  localStorage.setItem('dsh-codex-sidebar.settings', JSON.stringify(parsed))
})
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)
const notice = page.locator('[role="dialog"] button', { hasText: /continue|继续/i }).first()
if (await notice.count() > 0) { await notice.click().catch(() => {}); await page.waitForTimeout(300) }
await page.screenshot({ path: '.debug/shot-zoom125-sidebar.png' })
await page.keyboard.press('Alt+Meta+Comma').catch(() => {})
await page.waitForTimeout(1500)
const info = await page.evaluate(() => {
  const overlay = document.querySelector('[role="presentation"]')
  const dialog = document.querySelector('[role="dialog"]')
  const panel = dialog && dialog.firstElementChild
  const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }
  return { overlay: box(overlay), dialog: box(dialog), panel: box(panel), navCells: [...document.querySelectorAll('button')].filter(b => String(b.className||'').includes('navCell')).length, zoom: getComputedStyle(document.body).zoom }
})
await page.screenshot({ path: '.debug/shot-zoom125-settings.png' })
console.log(JSON.stringify(info, null, 2))
await browser.close()
