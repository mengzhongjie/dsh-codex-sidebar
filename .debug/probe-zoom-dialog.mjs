#!/usr/bin/env node
/** 125% 缩放下，宿主设置页到底能不能打开：键盘快捷键 vs 菜单点击，并看点击落点。 */
import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const [pageUrl] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []
page.on('console', m => logs.push('[' + m.type() + '] ' + m.text()))
await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
// 先写 125% 缩放，再刷新，让插件启动时就是 125%
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

const state = () => page.evaluate(() => ({
  dialogs: document.querySelectorAll('[role="dialog"]').length,
  menus: document.querySelectorAll('[role="menu"]').length,
  navCells: [...document.querySelectorAll('button')].filter(b => String(b.className || '').includes('navCell')).length,
  zoomAttr: document.body.getAttribute('data-codex-sidebar-page-zoom'),
  zoom: getComputedStyle(document.body).zoom
}))

const out = { initial: await state() }

// ① 键盘快捷键打开设置（宿主绑定 ⌥⌘,）
await page.keyboard.press('Alt+Meta+Comma').catch(() => {})
await page.waitForTimeout(1200)
out.afterShortcut = await state()
await page.keyboard.press('Escape').catch(() => {})
await page.waitForTimeout(400)

// ② 菜单路线：点 launcher，再检查菜单项中心的命中元素，最后点它
const launcher = await page.evaluate(() => {
  const b = document.querySelector('[data-slot="settings.launcher"] button')
  if (!b) return null
  const r = b.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
out.launcher = launcher
if (launcher) {
  await page.mouse.click(launcher.x, launcher.y)
  await page.waitForTimeout(700)
  out.afterLauncher = await state()
  const itemInfo = await page.evaluate(() => {
    const it = [...document.querySelectorAll('[role="menuitem"]')].find(e => /settings/i.test(e.textContent || ''))
    if (!it) return null
    const r = it.getBoundingClientRect()
    const cx = r.x + r.width / 2
    const cy = r.y + r.height / 2
    const hit = document.elementFromPoint(cx, cy)
    return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, cx, cy, hit: hit ? hit.tagName + '.' + (typeof hit.className === 'string' ? hit.className : '') : null, hitText: hit ? (hit.textContent || '').trim().slice(0, 20) : '' }
  })
  out.item = itemInfo
  if (itemInfo) {
    await page.mouse.click(itemInfo.cx, itemInfo.cy)
    await page.waitForTimeout(1500)
    out.afterItemClick = await state()
  }
}
await page.screenshot({ path: '.debug/shot-zoom-dialog.png' })
console.log(JSON.stringify({ out, logs: logs.filter(l => !/404|405/.test(l)) }, null, 2))
await browser.close()
