import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const [pageUrl, mode] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5000)
const s = 1.25
if (mode === 'zoom') {
  await page.evaluate(s => {
    const st = document.createElement('style'); st.id = 'probe-zoom'
    st.textContent = 'html #root { transform: scale(' + s + '); transform-origin: 0 0; width: ' + (100/s) + 'vw; height: ' + (100/s) + 'vh; overflow: hidden } html body { overflow: hidden }'
    document.head.appendChild(st)
  }, s)
  await page.waitForTimeout(600)
}
const before = await page.evaluate(() => {
  const b = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }
  const dock = document.querySelector('[class*="dockFallback"]')
  return { dock: b(dock), dockLabel: dock?.getAttribute('aria-label') ?? dock?.textContent?.slice(0, 20) }
})
// 点 dock 的按钮，看看打开面板后的几何
const opened = await page.evaluate(async () => {
  const dock = document.querySelector('[class*="dockFallback"]')
  const btn = dock?.querySelector('button') || dock
  btn?.click()
  await new Promise(r => setTimeout(r, 900))
  const b = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }
  const host = document.querySelector('[data-dsh-panel-host]')
  const bs = document.querySelector('[data-dsh-better-sidebar]')
  return {
    hostBox: b(host),
    hostChildren: host ? [...host.children].map(c => ({ cls: String(c.className || '').slice(0, 30), attr: [...c.attributes].map(a => a.name).join(',').slice(0, 60), box: b(c), pos: getComputedStyle(c).position })) : [],
    bsBox: b(bs),
    bsChildren: bs ? [...bs.children].map(c => ({ cls: String(c.className || '').slice(0, 30), box: b(c) })) : []
  }
})
console.log(JSON.stringify({ mode: mode || '100', before, opened }, null, 2))
await page.screenshot({ path: '.debug/shot-better-' + (mode || '100') + '.png' })
await browser.close()
