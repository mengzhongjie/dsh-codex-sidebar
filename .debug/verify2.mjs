/**
 * verify2.mjs — 两段式验证：先注入 localStorage 等准备动作，刷新页面，再跑测量脚本。
 *
 * 用法：
 *   node .debug/verify2.mjs <URL> <prep.js> <measure.js> [shot.png]
 *
 * 用途：插件的缩放档位存在 localStorage 里、只在启动时落地，所以必须「写好设置 → 刷新 → 量」。
 */
import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'
import { readFileSync } from 'node:fs'

const [url, prepPath, measurePath, shotPath] = process.argv.slice(2)
if (!url || !measurePath) {
  console.error('用法: node .debug/verify2.mjs <URL> <prep.js|-> <measure.js> [shot.png]')
  process.exit(2)
}

/** 把探针文件包进 async IIFE：探针里可以写 top-level await，并以 return 交出结果。 */
const wrap = (source) => `(async () => { ${source} })()`

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []
page.on('console', (message) => logs.push(`[${message.type()}] ${message.text()}`))
page.on('pageerror', (error) => logs.push(`[pageerror] ${error.message}`))

/** 首次运行会弹 Preview Notice，挡住后续点击，先关掉。 */
async function dismissNotice(target) {
  const button = target.locator('[role="dialog"] button', { hasText: /continue|继续/i }).first()
  if (await button.count()) await button.click().catch(() => {})
}

await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3500)
await dismissNotice(page)

if (prepPath && prepPath !== '-') {
  await page.evaluate(wrap(readFileSync(prepPath, 'utf8')))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
  await dismissNotice(page)
}

const result = await page.evaluate(wrap(readFileSync(measurePath, 'utf8')))
await page.waitForTimeout(300)
if (shotPath) await page.screenshot({ path: shotPath })
await browser.close()

console.log(JSON.stringify({ result, logs }, null, 2))
