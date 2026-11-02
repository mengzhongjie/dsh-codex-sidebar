#!/usr/bin/env node
/**
 * probe-mirror.mjs — 在桌面镜像 profile 上做「真实鼠标」探测：
 * 与 verify.mjs 的区别是点击走 Playwright 的命中测试（坐标点击），
 * 用来验证 CSS zoom 之后按钮是否还能点到。
 *
 * 用法：PLAYWRIGHT_BROWSERS_PATH=$PWD/.playwright-browsers node .debug/probe-mirror.mjs <url> [shot.png]
 */
import path from 'node:path'
import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'

const [pageUrl, shotFile] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []
page.on('console', m => logs.push('[' + m.type() + '] ' + m.text()))
page.on('pageerror', e => logs.push('[pageerror] ' + e.message))

await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)

// 预览提示（首次运行）会挡住点击，先关掉。
const notice = page.locator('[role="dialog"] button', { hasText: /continue|继续/i }).first()
if (await notice.count() > 0) { await notice.click().catch(() => {}); await page.waitForTimeout(300) }

const structure = await page.evaluate(() => {
  const short = el => el === null || el === undefined ? null : (el.tagName + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').filter(Boolean).join('.') : '')).slice(0, 140)
  const sidebar = document.querySelector('[data-slot="sidebar"]')
  const buttons = [...document.querySelectorAll('button[aria-label]')].map(b => b.getAttribute('aria-label')).slice(0, 40)
  const toggle = [...(sidebar ? sidebar.querySelectorAll('button') : [])].find(b => /collapse sidebar|expand sidebar|收起侧边栏|展开侧边栏/i.test(b.getAttribute('aria-label') || ''))
  const row = toggle ? toggle.parentElement : null
  const brand = row ? row.querySelector('button[class*="brand"]') : null
  return {
    sidebar: short(sidebar),
    sidebarChildren: sidebar ? [...sidebar.children].map(short) : [],
    toggleLabel: toggle ? toggle.getAttribute('aria-label') : null,
    logoRow: short(row),
    logoRowChildren: row ? [...row.children].map(short) : [],
    brandFound: brand !== null,
    brandTag: brand ? short(brand) : null,
    ourActions: document.querySelectorAll('.codex-sidebar-actions').length,
    ourButtons: [...document.querySelectorAll('[data-codex-sidebar-owned]')].map(el => el.tagName + ':' + (el.getAttribute('aria-label') || '')).slice(0, 8),
    ownedCount: document.querySelectorAll('[data-codex-sidebar-owned]').length,
    themePresent: [...document.body.attributes].some(a => a.name.startsWith('data-dsh-claude')),
    workspaceRows: document.querySelectorAll('[data-row-key^="workspace:"]').length,
    sessionRows: document.querySelectorAll('[data-row-key^="session:"]').length,
    dateHeaders: document.querySelectorAll('.codex-sidebar-date-header').length,
    bodyAttrs: [...document.body.attributes].map(a => a.name).slice(0, 20),
    zoomAttr: document.body.getAttribute('data-codex-sidebar-page-zoom'),
    ariaLabels: buttons
  }
})

// 真实鼠标点击齿轮（如果有），验证命中测试。
let gearClick = null
const gear = page.locator('button[aria-label]').filter({ hasNotText: /./ })
const gearHandle = await page.locator('.codex-sidebar-actions button').first()
if (await gearHandle.count() > 0) {
  const box = await gearHandle.boundingBox()
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(1200)
  }
  gearClick = await page.evaluate(() => {
    const nav = [...document.querySelectorAll('button')].filter(b => String(b.className || '').includes('navCell'))
    return { dialogs: document.querySelectorAll('[role="dialog"]').length, navCount: nav.length, navTexts: nav.map(n => (n.textContent || '').trim()) }
  })
}

console.log(JSON.stringify({ structure, gearClick, logs }, null, 2))
if (shotFile !== undefined) await page.screenshot({ path: path.resolve(shotFile) })
await browser.close()
