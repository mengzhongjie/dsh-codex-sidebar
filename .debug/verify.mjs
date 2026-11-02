#!/usr/bin/env node
/**
 * verify.mjs — 在本地无头 Chromium 里打开 DSH 页面，跑一段探针并截图。
 *
 * 本机没有 Chrome，Edge 的 CDP 通道在这台机器上连不稳（1006），所以改用
 * Playwright 自带的 headless shell（已下载到 .playwright-browsers）。
 *
 * 用法：PLAYWRIGHT_BROWSERS_PATH=$PWD/.playwright-browsers node .debug/verify.mjs <page-url> <eval-file> [screenshot.png]
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '/Users/apple/Desktop/SuperCode/dsh-claude-style/node_modules/playwright-core/index.mjs'

const [pageUrl, evalFile, shotFile] = process.argv.slice(2)
if (pageUrl === undefined || evalFile === undefined) {
  console.error('用法: node verify.mjs <page-url> <eval-file> [screenshot.png]')
  process.exit(1)
}

// chromium.launch 会读环境变量里的浏览器目录，路径由调用方注入。
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

/** 页面控制台：插件的日志与异常都在这里，排查时先看它。 */
const logs = []
page.on('console', message => logs.push(`[${message.type()}] ${message.text()}`))
page.on('pageerror', error => logs.push(`[pageerror] ${error.message}`))

// 允许页面脚本在这种页面上暴露调试出口：窗口名在这一页的所有导航之间保留。
await page.addInitScript(() => { window.name = 'codex-debug' })
await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
// 等首屏与侧栏挂出来：DSH 的侧栏是异步挂的。
await page.waitForTimeout(4000)

let result
try {
  // 探针文件里写了 top-level await，包成 async IIFE 才能在页面里跑。
  const body = fs.readFileSync(evalFile, 'utf8')
  result = await page.evaluate(`(async () => {\n${body}\n})()`)
} catch (error) {
  result = { error: String(error) }
}

console.log(JSON.stringify({ result, logs }, null, 2))
if (shotFile !== undefined) await page.screenshot({ path: path.resolve(shotFile) })

await browser.close()