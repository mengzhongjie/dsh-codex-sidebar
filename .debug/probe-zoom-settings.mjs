#!/usr/bin/env node
/** 复现两件事：①点我们的齿轮能不能打开设置；②缩放 125% 之后设置还能不能打开。 */
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
const state = () => page.evaluate(() => {
  const nav = [...document.querySelectorAll('button')].filter(b => String(b.className || '').includes('navCell'))
  return {
    dialogs: document.querySelectorAll('[role="dialog"]').length,
    menus: document.querySelectorAll('[role="menu"]').length,
    menuitems: [...document.querySelectorAll('[role="menuitem"]')].map(e => (e.textContent || '').trim().slice(0, 20)),
    navCount: nav.length,
    navTexts: nav.map(n => (n.textContent || '').trim()).slice(0, 8),
    zoomAttr: document.body.getAttribute('data-codex-sidebar-page-zoom'),
    zoomVar: getComputedStyle(document.body).getPropertyValue('--codex-sidebar-page-zoom-factor').trim(),
    computedZoom: getComputedStyle(document.body).zoom
  }
})

await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)
await closeNotice()

// ① 点我们的齿轮（真实鼠标）
const gear = page.locator('.codex-sidebar-actions button').first()
const gearBox = await gear.boundingBox()
let phase1 = { gearBox }
if (gearBox) {
  await page.mouse.click(gearBox.x + gearBox.width / 2, gearBox.y + gearBox.height / 2)
  await page.waitForTimeout(1200)
  phase1.afterGearClick = await state()
  // 如果菜单开了但没进设置页，再手动点 Settings 看看
  if (phase1.afterGearClick.dialogs === 0 && phase1.afterGearClick.menus > 0) {
    const item = page.locator('[role="menuitem"]', { hasText: /settings|设置/i }).first()
    if (await item.count() > 0) {
      await item.click().catch(() => {})
      await page.waitForTimeout(1000)
      phase1.afterManualMenuClick = await state()
    }
  }
}
// 关掉可能开着的设置页
await page.keyboard.press('Escape').catch(() => {})
await page.waitForTimeout(300)

// ② 写 125% 缩放后刷新
await page.evaluate(() => {
  const raw = localStorage.getItem('dsh-codex-sidebar.settings')
  const parsed = raw ? JSON.parse(raw) : {}
  parsed.zoom = 1.25
  localStorage.setItem('dsh-codex-sidebar.settings', JSON.stringify(parsed))
})
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)
await closeNotice()
const phase2 = { afterReload: await state() }

// 缩放后：先点齿轮
const gear2 = page.locator('.codex-sidebar-actions button').first()
const gear2Box = await gear2.boundingBox()
phase2.gearBox = gear2Box
// 同时记录齿轮的命中元素（看是否被别的元素盖住）
phase2.hitTest = gear2Box ? await page.evaluate(b => {
  const el = document.elementFromPoint(b.x + b.w / 2, b.y + b.h / 2)
  return el ? el.tagName + '.' + (typeof el.className === 'string' ? el.className : '') + '|aria=' + (el.getAttribute('aria-label') || '') : null
}, { x: gear2Box.x, y: gear2Box.y, w: gear2Box.width, h: gear2Box.height }) : null
if (gear2Box) {
  await page.mouse.click(gear2Box.x + gear2Box.width / 2, gear2Box.y + gear2Box.height / 2)
  await page.waitForTimeout(1200)
  phase2.afterGearClick = await state()
}

// 缩放后：用宿主账号菜单进设置
await page.keyboard.press('Escape').catch(() => {})
await page.waitForTimeout(300)
const launcher = await page.evaluate(() => {
  const b = document.querySelector('[data-slot="settings.launcher"] button')
  if (!b) return null
  const r = b.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
phase2.launcherBox = launcher
if (launcher) {
  await page.mouse.click(launcher.x, launcher.y)
  await page.waitForTimeout(700)
  phase2.afterLauncher = await state()
  const item = page.locator('[role="menuitem"]', { hasText: /settings|设置/i }).first()
  if (await item.count() > 0) {
    await item.click().catch(() => {})
    await page.waitForTimeout(1200)
    phase2.afterMenuItem = await state()
  }
}

console.log(JSON.stringify({ phase1, phase2, logs: logs.filter(l => !/404|405/.test(l)) }, null, 2))
await browser.close()
