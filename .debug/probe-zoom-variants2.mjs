import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const [pageUrl] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5000)
const s = 1.25
const setStyle = async css => {
  await page.evaluate(css => {
    let st = document.getElementById('probe-zoom')
    if (!st) { st = document.createElement('style'); st.id = 'probe-zoom'; document.head.appendChild(st) }
    st.textContent = css
  }, css)
  await page.waitForTimeout(400)
}
const snapshot = async label => {
  // 先关掉上次打开的面板/菜单
  await page.keyboard.press('Escape').catch(() => {})
  await page.evaluate(() => { document.querySelectorAll('[role="menu"]').forEach(() => {}); })
  await page.waitForTimeout(200)
  // 打开 better-sidebar 底部面板
  await page.evaluate(() => { const d = document.querySelector('[class*="dockFallback"]'); (d?.querySelector('button') || d)?.click() })
  await page.waitForTimeout(800)
  const data = await page.evaluate(() => {
    const b = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }
    const sidebar = document.querySelector('[data-slot="sidebar"]')?.firstElementChild || document.querySelector('[class*="_root"][class*="hHd"]')
    const panel = document.querySelector('[data-dsh-bottom-panel]')
    const tab = panel ? panel.querySelector('button') : null
    const tabStyle = tab ? getComputedStyle(tab) : null
    return {
      sidebarBox: b(sidebar),
      panelBox: b(panel),
      panelFirstButtonFontSize: tabStyle?.fontSize ?? null,
      panelFirstButtonBox: b(tab),
      panelStyleAttr: panel ? (panel.getAttribute('style') || '').slice(0, 160) : null
    }
  })
  // 再打开账号菜单
  await page.evaluate(() => { document.querySelector('[data-slot="settings.launcher"] button')?.click() })
  await page.waitForTimeout(700)
  const menu = await page.evaluate(() => {
    const b = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }
    const m = document.querySelector('[role="menu"]')
    const items = m ? [...m.querySelectorAll('[role="menuitem"], button')].map(el => b(el)) : []
    const inView = m ? (() => { const r = m.getBoundingClientRect(); return r.y >= 0 && r.bottom <= innerHeight })() : false
    return { menuBox: b(m), menuInView: inView, items: items.slice(0, 3) }
  })
  await page.keyboard.press('Escape').catch(() => {})
  await page.waitForTimeout(300)
  await page.screenshot({ path: '.debug/shot-zoom-' + label + '.png' })
  return { label, ...data, ...menu }
}
const out = []
out.push(await snapshot('root-transform'))
await setStyle('html #root { transform: scale(' + s + '); transform-origin: 0 0; width: ' + (100/s) + 'vw; height: ' + (100/s) + 'vh; overflow: hidden } html body { overflow: hidden }')
out.push(await snapshot('A-root-transform'))
await setStyle('html { zoom: ' + s + ' }')
out.push(await snapshot('B-html-zoom'))
await setStyle('body { zoom: ' + s + ' }')
out.push(await snapshot('C-body-zoom'))
console.log(JSON.stringify(out, null, 2))
await browser.close()
