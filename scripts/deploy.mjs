#!/usr/bin/env node
/**
 * deploy.mjs — 把仓库发布到桌面 App 真正加载的目录 ~/.dsh/plugins/dsh-codex-sidebar。
 *
 * 为什么不直接让 profile 的 link: 指向仓库：
 *   仓库在 ~/Desktop，macOS 的 TCC 会拦住 launchd / 后台进程读写「桌面」目录。上一轮就是
 *   用 launchctl 等 App 退出后替换仓库里的 lib/client.js，结果 shasum/cp 全部报
 *   "Operation not permitted"，替换从未落地，用户看到的仍是旧 bundle。
 *   把发布目录放到 ~/.dsh/plugins（不受 TCC 限制）后，这类后台替换才能可靠执行。
 *
 * 用法：
 *   node scripts/deploy.mjs            # 发布到 ~/.dsh/plugins/dsh-codex-sidebar
 *   node scripts/deploy.mjs --dry-run  # 只打印将要复制的文件
 *
 * 只复制运行时真正需要的东西：package.json、cordis.patch.yml、lib/、LICENSE、assets/。
 * 源码（src/）、脚本、文档留在仓库，不进入发布目录。
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 仓库根目录（scripts/ 的上一层）。 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
/** 发布目标：桌面 profile 的 node_modules 就指向这里。 */
const TARGET = join(homedir(), '.dsh', 'plugins', 'dsh-codex-sidebar')
/** 需要复制的条目。 */
const ENTRIES = ['package.json', 'cordis.patch.yml', 'lib', 'LICENSE', 'assets']
/** 是否只演练。 */
const dryRun = process.argv.includes('--dry-run')

/** 把文件算成 sha256，用来确认发布目录里就是刚构建的那一份。 */
function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

if (!existsSync(join(ROOT, 'lib', 'client.js'))) {
  console.error('lib/client.js 不存在，先跑 node scripts/build.mjs')
  process.exit(1)
}

console.log(`源仓库：${ROOT}`)
console.log(`发布到：${TARGET}`)

for (const entry of ENTRIES) {
  const from = join(ROOT, entry)
  const to = join(TARGET, entry)
  if (!existsSync(from)) {
    console.log(`  跳过（源里没有）：${entry}`)
    continue
  }
  console.log(`  ${entry} -> ${to}`)
  if (dryRun) continue
  mkdirSync(TARGET, { recursive: true })
  // lib/ 先删再拷：避免旧产物（例如删掉的模块）残留在发布目录里。
  if (entry === 'lib') rmSync(to, { recursive: true, force: true })
  cpSync(from, to, { recursive: true })
}

if (dryRun) {
  console.log('（--dry-run，未写入）')
} else {
  const built = join(TARGET, 'lib', 'client.js')
  console.log(`完成：lib/client.js ${statSync(built).size} 字节，sha256 ${sha256(built)}`)
  console.log('桌面 profile 需把依赖链到该目录：dsh plugin --profile desktop add link:' + TARGET)
}
