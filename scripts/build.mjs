#!/usr/bin/env node
/**
 * build.mjs — 把 src/ 下的源码打成宿主要的那一个文件 lib/client.js。
 *
 * 宿主的模块加载器（window.__ModuleLoader__）一个插件只收一个 client bundle，
 * 且 bundle 里没有相对 require、也没有资源 URL：源码里的 import 必须在这里被
 * 内联成一份，交给页面去跑。所以用 esbuild 打成一个 CommonJS 体，再套进宿主
 * 认的工厂外壳：
 *
 *   window.__ModuleLoader__.load({ id, factory: (require) => { ...body...; return module.exports } })
 *
 * 样式表（*.css）以文本形式内联进 bundle，运行时由 entry.js 注入 <style>，
 * 这样插件只发布 lib/ 一份产物，不需要 host 侧再分发静态文件。
 */
import fs from 'node:fs'
import path from 'node:path'
import esbuild from 'esbuild'

const ROOT = path.resolve(import.meta.dirname, '..')
const ENTRY = path.join(ROOT, 'src', 'entry.js')
const OUT = path.join(ROOT, 'lib', 'client.js')
/** 宿主的模块 ID 与插件包名一致，热重载与错误栈都按它对齐。 */
const PLUGIN_ID = 'dsh-codex-sidebar'
/** 只监听源码目录，产物目录不参与。 */
const WATCH = process.argv.includes('--watch')

/**
 * 把 esbuild 的 CommonJS 产物套进宿主的工厂外壳。
 *
 * 外壳自己声明 module/exports（bundle 体是 CJS，会写 module.exports），
 * 再把 module.exports 交回去 —— Cordis 从这份导出里读 apply/inject。
 *
 * @param body - esbuild 打出来的 CJS 源码。
 * @returns 可被 __ModuleLoader__.load 接收的整份文件内容。
 */
function wrap(body) {
  return [
    '/* dsh-codex-sidebar — 生成物，请改 src/ 后重跑 npm run build */',
    'window.__ModuleLoader__.load({',
    `  id: '${PLUGIN_ID}',`,
    '  factory: (require) => {',
    '    var module = { exports: {} }',
    '    var exports = module.exports',
    body,
    '    return module.exports',
    '  },',
    '})',
    ''
  ].join('\n')
}

/** 打一次：bundle 写盘，并打印产物大小。 */
async function buildOnce() {
  const result = await esbuild.build({
    entryPoints: [ENTRY],
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'browser',
    target: 'es2020',
    // 样式表当文本内联：运行时由 entry.js 塞进 <style>。
    loader: { '.css': 'text' },
    // react 由宿主的工厂 require 提供（设置页 section 是 React 组件），必须 external，
    // 否则 esbuild 会把整份 React 打进产物，既超体积又与宿主的 React 实例不共享 hook。
    external: ['react'],
    legalComments: 'none',
    logLevel: 'warning'
  })
  const body = result.outputFiles[0].text
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, wrap(body))
  console.log(`built ${path.relative(ROOT, OUT)} (${(Buffer.byteLength(body) / 1024).toFixed(1)} KiB)`)
}

await buildOnce()

if (WATCH) {
  const ctx = await esbuild.context({
    entryPoints: [ENTRY],
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'browser',
    target: 'es2020',
    loader: { '.css': 'text' },
    external: ['react'],
    legalComments: 'none',
    plugins: [{
      name: 'write-wrapped',
      setup(build) {
        build.onEnd(result => {
          if (result.errors.length > 0) return
          fs.writeFileSync(OUT, wrap(result.outputFiles[0].text))
          console.log('rebuilt', new Date().toLocaleTimeString())
        })
      }
    }]
  })
  await ctx.watch()
  console.log('watching src/ ...')
}
