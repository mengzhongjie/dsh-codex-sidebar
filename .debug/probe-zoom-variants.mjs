import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
const [pageUrl] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5000)

const measure = async label => {
  const r = await page.evaluate(() => {
    const box = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } }
    const inView = b => b !== null && b.x >= -1 && b.y >= -1 && b.x + b.w <= innerWidth + 2 && b.y + b.h <= innerHeight + 2
    const dock = document.querySelector('[class*="dockFallback"]')
    const host = document.querySelector('[data-dsh-panel-host]')
    const menu = document.querySelector('[role="menu"]')
    const items = menu ? [...menu.querySelectorAll('[role="menuitem"], button')].slice(0, 3).map(el => box(el)) : []
    return {
      viewport: { w: innerWidth, h: innerHeight },
      rootBox: box(document.getElementById('root')),
      rootTransform: getComputedStyle(document.getElementById('root')).transform,
      htmlZoom: getComputedStyle(document.documentElement).zoom,
      bodyZoom: getComputedStyle(document.body).zoom,
      dock: { box: box(dock), inView: inView(box(dock)) },
      panelHost: box(host),
      menu: { box: box(menu), inView: inView(box(menu)), items }
    }
  })
  return { label, ...r }
}

const openMenu = async () => {
  // 用键盘/JS 打开账号菜单：点 settings.launcher
  await page.evaluate(() => { const b = document.querySelector('[data-slot="settings.launcher"] button'); b?.click() })
  await page.waitForTimeout(600)
}
const closeMenu = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(400) }

const results = []
results.push(await measure('baseline-100'))

// 变体 A：transform 到 #root
const applyVariant = async (name, css, cls) => {
  await page.evaluate(({ css, cls }) => {
    const style = document.getElementById('probe-zoom')
    const next = style || document.createElement('style')
    next.id = 'probe-zoom'
    next.textContent = css
    document.head.appendChild(next)
    document.documentElement.className = cls || ''
  }, { css, cls })
  await page.waitForTimeout(500)
  await openMenu()
  const out = await measure(name)
  await closeMenu()
  return out
}

const s = 1.25
const A = 'html.probe-a #root { transform: scale(' + s + '); transform-origin: 0 0; width: ' + (100/s) + 'vw; height: ' + (100/s) + 'vh; overflow: hidden }'
const B = 'html.probe-b { zoom: ' + s + ' }'
const C = 'html.probe-c { transform: scale(' + s + '); transform-origin: 0 0; width: ' + (100/s) + 'vw; height: ' + (100/s) + 'vh } html.probe-c body { overflow: hidden }'
results.push(await applyVariant('A-root-transform', A, 'probe-a'))
results.push(await applyVariant('B-html-zoom', B, 'probe-b'))
results.push(await applyVariant('C-html-transform', C, 'probe-c'))

console.log(JSON.stringify(results, null, 2))
await page.screenshot({ path: '.debug/shot-zoom-variants.png' })
await browser.close()
