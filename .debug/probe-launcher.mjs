#!/usr/bin/env node
/** 逐步复现「齿轮打不开设置」：查 launcher 插槽 → 点它 → 找菜单项。 */
import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const [pageUrl] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []
page.on('console', m => logs.push('[' + m.type() + '] ' + m.text()))
await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)
const notice = page.locator('[role="dialog"] button', { hasText: /continue|继续/i }).first()
if (await notice.count() > 0) { await notice.click().catch(() => {}); await page.waitForTimeout(300) }

const step1 = await page.evaluate(() => {
  const slots = [...document.querySelectorAll('[data-slot]')].map(el => el.getAttribute('data-slot'))
  const launcherSlot = document.querySelector('[data-slot="settings.launcher"]')
  const launcherBtn = launcherSlot ? launcherSlot.querySelector('button') : null
  const sidebar = document.querySelector('[data-slot="sidebar"]')
  const foot = sidebar ? sidebar.querySelector('[class*="footArea"]') : null
  return {
    allSlots: slots,
    launcherSlot: launcherSlot !== null,
    launcherBtnAria: launcherBtn ? launcherBtn.getAttribute('aria-label') : null,
    foot: foot ? foot.className : null,
    footChildren: foot ? [...foot.children].map(c => c.tagName + '.' + (typeof c.className === 'string' ? c.className : '') + '|slot=' + (c.getAttribute('data-slot') || '')) : [],
    footButtons: foot ? [...foot.querySelectorAll('button')].map(b => b.getAttribute('aria-label') || b.textContent.trim().slice(0, 20)) : []
  }
})

// 用真实鼠标点 launcher（若存在）
let afterLauncher = null
const launcherBox = await page.evaluate(() => {
  const slot = document.querySelector('[data-slot="settings.launcher"]')
  const b = slot ? slot.querySelector('button') : null
  if (!b) return null
  const r = b.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }
})
if (launcherBox) {
  await page.mouse.click(launcherBox.x, launcherBox.y)
  await page.waitForTimeout(800)
  afterLauncher = await page.evaluate(() => ({
    menus: document.querySelectorAll('[role="menu"]').length,
    menuitems: [...document.querySelectorAll('[role="menuitem"], [role="menu"] button')].map(el => (el.textContent || '').trim().slice(0, 30)),
    dialogs: document.querySelectorAll('[role="dialog"]').length
  }))
}

console.log(JSON.stringify({ step1, launcherBox, afterLauncher, logs: logs.filter(l => !l.includes('404') && !l.includes('405')) }, null, 2))
await browser.close()
