#!/usr/bin/env node
/**
 * 缩放机制实验：把 zoom 放在 body 与放在 html 上，宿主账号菜单弹出的位置差多少。
 * 目的：找出「缩放后设置打不开」的根因是菜单被推到视口外，还是坐标体系错位。
 */
import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const [pageUrl] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)
const notice = page.locator('[role="dialog"] button', { hasText: /continue|继续/i }).first()
if (await notice.count() > 0) { await notice.click().catch(() => {}); await page.waitForTimeout(300) }

const measure = async (label, applyZoom) => {
  // 还原到无缩放
  await page.evaluate(() => {
    document.body.style.zoom = ''
    document.documentElement.style.zoom = ''
    document.body.removeAttribute('data-codex-sidebar-page-zoom')
    if (document.body.hasAttribute('data-codex-sidebar')) document.body.setAttribute('data-codex-sidebar-page-zoom', '1')
    // 关掉可能存在的菜单
    document.body.click()
  })
  await page.waitForTimeout(400)
  if (applyZoom) {
    await page.evaluate(z => { if (z === 'body') document.body.style.zoom = '1.25'; else document.documentElement.style.zoom = '1.25' }, applyZoom)
    await page.waitForTimeout(400)
  }
  const rects = await page.evaluate(() => {
    const b = document.querySelector('[data-slot="settings.launcher"] button')
    const r = b ? b.getBoundingClientRect() : null
    return {
      launcher: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
      viewport: { w: innerWidth, h: innerHeight },
      bodyZoom: getComputedStyle(document.body).zoom,
      htmlZoom: getComputedStyle(document.documentElement).zoom,
      rootScrollH: document.documentElement.scrollHeight
    }
  })
  if (rects.launcher) {
    await page.mouse.click(rects.launcher.x + rects.launcher.w / 2, rects.launcher.y + rects.launcher.h / 2)
    await page.waitForTimeout(800)
  }
  const menu = await page.evaluate(() => {
    const m = document.querySelector('[role="menu"]')
    const items = [...document.querySelectorAll('[role="menuitem"]')].map(it => {
      const r = it.getBoundingClientRect()
      return { text: (it.textContent || '').trim().slice(0, 12), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), inView: r.y + r.height <= innerHeight }
    })
    return { menu: m ? (() => { const r = m.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })() : null, items }
  })
  await page.keyboard.press('Escape').catch(() => {})
  await page.waitForTimeout(300)
  return { label, ...rects, menu }
}

const base = await measure('无缩放', null)
const bodyZoom = await measure('body 1.25', 'body')
const htmlZoom = await measure('html 1.25', 'html')
console.log(JSON.stringify({ base, bodyZoom, htmlZoom }, null, 2))
await browser.close()
