import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const [pageUrl, zoom] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []
page.on('console', m => { const t = m.text(); if (t.includes('codex-sidebar') || t.toLowerCase().includes('better')) logs.push(t.slice(0, 160)) })
await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)
if (zoom) {
  await page.evaluate(z => {
    const raw = localStorage.getItem('dsh-codex-sidebar.settings')
    const next = raw ? JSON.parse(raw) : {}
    next.zoom = Number(z)
    localStorage.setItem('dsh-codex-sidebar.settings', JSON.stringify(next))
  }, zoom)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4500)
} else {
  await page.waitForTimeout(3000)
}
const info = await page.evaluate(() => {
  const box = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }
  const pick = sel => [...document.querySelectorAll(sel)].slice(0, 4).map(el => ({ sel, cls: String(el.className || '').slice(0, 40), box: box(el), pos: getComputedStyle(el).position }))
  return {
    viewport: { w: innerWidth, h: innerHeight },
    devicePixelRatio,
    rootTransform: getComputedStyle(document.getElementById('root')).transform,
    rootBox: box(document.getElementById('root')),
    bodyZoom: getComputedStyle(document.body).zoom,
    panelHost: pick('[data-dsh-panel-host]'),
    betterSidebar: pick('[data-dsh-better-sidebar]'),
    dockLike: [...document.querySelectorAll('aside, [class*="dock"], [class*="Dock"]')].slice(0, 6).map(el => ({ tag: el.tagName, cls: String(el.className || '').slice(0, 40), box: box(el), pos: getComputedStyle(el).position })),
    ourActions: document.querySelectorAll('.codex-sidebar-actions').length,
    themeBell: document.querySelectorAll('.dsh-claude-active-shelf-trigger').length
  }
})
console.log(JSON.stringify(info, null, 2))
console.log('logs=' + JSON.stringify(logs))
await page.screenshot({ path: '.debug/shot-zoom-probe-' + (zoom || '100') + '.png' })
await browser.close()
