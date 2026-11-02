#!/usr/bin/env node
/**
 * probe-pointer.mjs — 验证两件事：
 *   A) 用 DOM .click() 点带 better-sidebar 的账号按钮，菜单开不开（怀疑 popover 只认 pointerdown）；
 *   B) 用完整 pointer 序列点，菜单开不开；
 *   C) 宿主菜单里的 Settings 点下去之后，设置页以什么 DOM 形态出现。
 */
import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const [pageUrl] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []
page.on('console', m => logs.push('[' + m.type() + '] ' + m.text()))
page.on('pageerror', e => logs.push('[pageerror] ' + e.message))

const closeNotice = async () => {
  const n = page.locator('[role="dialog"] button', { hasText: /continue|继续/i }).first()
  if (await n.count() > 0) { await n.click().catch(() => {}); await page.waitForTimeout(300) }
}
const menus = () => page.evaluate(() => document.querySelectorAll('[role="menu"]').length)
const dismiss = async () => { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(300) }

await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)
await closeNotice()

// A) DOM .click() 点账号按钮
const a = await page.evaluate(() => {
  const b = document.querySelector('[data-slot="settings.launcher"] button')
  if (!b) return { found: false }
  b.click()
  return { found: true, aria: b.getAttribute('aria-label') }
})
await page.waitForTimeout(600)
a.menusAfterDomClick = await menus()
await dismiss()

// B) 完整 pointer 序列
const b = await page.evaluate(() => {
  const el = document.querySelector('[data-slot="settings.launcher"] button')
  if (!el) return { found: false }
  const r = el.getBoundingClientRect()
  const opts = { bubbles: true, cancelable: true, composed: true, isPrimary: true, button: 0, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }
  el.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerType: 'mouse' }))
  el.dispatchEvent(new MouseEvent('mousedown', opts))
  el.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerType: 'mouse' }))
  el.dispatchEvent(new MouseEvent('mouseup', opts))
  el.dispatchEvent(new MouseEvent('click', opts))
  return { found: true }
})
await page.waitForTimeout(800)
b.menusAfterPointerSeq = await menus()

// C) 点菜单里的 Settings，看设置页形态
let c = { menuItems: await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].map(e => (e.textContent || '').trim())) }
const item = page.locator('[role="menuitem"]', { hasText: /settings/i }).first()
if (await item.count() > 0) { await item.click().catch(() => {}); await page.waitForTimeout(1500) }
c.afterSettingsClick = await page.evaluate(() => {
  const overlayish = [...document.body.children].map(el => el.tagName + '.' + (typeof el.className === 'string' ? el.className : '').slice(0, 60) + '|id=' + el.id + '|role=' + (el.getAttribute('role') || ''))
  const navLike = [...document.querySelectorAll('button')].map(b => (b.textContent || '').trim()).filter(t => /^(Account|General|Models|Built-in plugins|Agent presets|Claude Style|Sidebar settings|账号与余额|通用设置)$/.test(t))
  return {
    menus: document.querySelectorAll('[role="menu"]').length,
    dialogs: document.querySelectorAll('[role="dialog"]').length,
    bodyChildren: overlayish,
    navLike,
    navCellCount: [...document.querySelectorAll('button')].filter(x => String(x.className || '').includes('navCell')).length,
    visibleTextTop: (document.body.innerText || '').slice(0, 200)
  }
})
await page.screenshot({ path: '.debug/shot-settings-after-menu.png' })
console.log(JSON.stringify({ a, b, c, logs: logs.filter(l => !/404|405/.test(l)) }, null, 2))
await browser.close()
