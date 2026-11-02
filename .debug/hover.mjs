#!/usr/bin/env node
/**
 * hover.mjs — 量「鼠标悬停会话行时的轻微抖动」：悬停某一行，连续采样它的矩形与列表 DOM 变动次数。
 *
 * 用法：PLAYWRIGHT_BROWSERS_PATH=$PWD/.playwright-browsers node .debug/hover.mjs <page-url> [截图.png]
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'

const [pageUrl, shotFile] = process.argv.slice(2)
if (pageUrl === undefined) { console.error('用法: node hover.mjs <page-url> [shot.png]'); process.exit(1) }

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []
page.on('console', m => logs.push('[' + m.type() + '] ' + m.text()))
page.on('pageerror', e => logs.push('[pageerror] ' + e.message))

await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)
// 关掉首次运行的 Preview Notice
await page.evaluate(async () => {
  for (let i = 0; i < 25; i++) {
    const b = [...document.querySelectorAll('[role="dialog"] button')].find(x => /continue|继续/i.test(x.textContent || ''))
    if (b) { b.click(); return }
    await new Promise(r => setTimeout(r, 120))
  }
})
await page.waitForTimeout(1200)

// 打开日期视图：优先点本插件铃铛，没有就点主题铃铛
const opened = await page.evaluate(async () => {
  // 我们的铃铛 = 动作区里的第一个按钮（齿轮是第二个）；data-codex-sidebar-bell 打在 body 上，不能拿来点。
  const ours = document.querySelector('.codex-sidebar-actions button')
  const theme = document.querySelector('.dsh-claude-active-shelf-trigger')
  const target = ours ?? theme
  if (!target) return { clicked: null }
  target.click()
  await new Promise(r => setTimeout(r, 1200))
  return {
    clicked: ours ? 'ours' : 'theme',
    ourHeaders: [...document.querySelectorAll('.codex-sidebar-date-header')].map(el => el.textContent.trim()),
    themeHeaders: [...document.querySelectorAll('[data-dsh-claude-date-header]')].map(el => el.textContent.trim()),
    bodyAttrs: [...document.body.attributes].map(a => a.name).filter(n => /claude|codex/i.test(n)),
  }
})

// 在列表上装变动计数器，再挑一行做悬停采样
const setup = await page.evaluate(() => {
  const list = document.querySelector('[data-slot="sidebar"] [class*="flatList"]')
    ?? document.querySelector('[data-slot="sidebar"] [class*="treeBody"]')
  window.__mut = 0
  window.__mutKinds = {}
  if (list) {
    new MutationObserver(recs => {
      for (const rec of recs) {
        window.__mut += 1
        const kind = rec.type + ':' + (rec.attributeName || '')
        window.__mutKinds[kind] = (window.__mutKinds[kind] || 0) + 1
      }
    }).observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] })
  }
  const rows = [...document.querySelectorAll('[data-row-key^="session:"]')].filter(el => {
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && el.closest('[style*="display: none"]') === null
  })
  const pick = rows[2] ?? rows[0]
  if (!pick) return { error: 'no row', listFound: !!list }
  const r = pick.getBoundingClientRect()
  window.__row = pick
  return { listFound: !!list, rowKey: pick.getAttribute('data-row-key'), cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2), rect: { x: r.x, y: r.y, w: r.width, h: r.height } }
})

const samples = []
if (setup && setup.cx !== undefined) {
  // 先把鼠标停在别处，避免一开始就处于悬停态
  await page.mouse.move(700, 500)
  await page.waitForTimeout(300)
  await page.mouse.move(setup.cx, setup.cy)
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(70)
    samples.push(await page.evaluate(() => {
      const el = window.__row
      if (!el) return null
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      const title = el.querySelector('[class*="_title"], [class*="title"]')
      const titleRect = title ? title.getBoundingClientRect() : null
      return {
        x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2),
        transform: cs.transform, padLeft: cs.paddingLeft,
        titleW: titleRect ? +titleRect.width.toFixed(2) : null,
        mut: window.__mut ?? 0,
      }
    }))
  }
}
const mutKinds = await page.evaluate(() => window.__mutKinds ?? {})

// 抖动统计：同一属性的极差
const range = key => {
  const vals = samples.filter(s => s).map(s => s[key]).filter(v => v !== null && v !== undefined && typeof v === 'number')
  if (vals.length === 0) return null
  return +(Math.max(...vals) - Math.min(...vals)).toFixed(2)
}

const report = {
  opened,
  setup,
  mutKinds,
  deltas: { x: range('x'), y: range('y'), w: range('w'), h: range('h'), titleW: range('titleW') },
  transforms: [...new Set(samples.filter(s => s).map(s => s.transform))].slice(0, 4),
  mutSeries: samples.filter(s => s).map(s => s.mut),
}
console.log(JSON.stringify({ report, logs }, null, 2))
if (shotFile) await page.screenshot({ path: path.resolve(shotFile) })
await browser.close()