#!/usr/bin/env node
/**
 * install.mjs — 把本插件装进一个 DSH profile，或从 profile 里卸掉。
 *
 * 正式安装只需要一条命令（dsh 会自己把 bundle 登记好，见 README）：
 *   dsh plugin --profile <profile> add github:mengzhongjie/dsh-codex-sidebar
 *
 * 本脚本是给「在仓库里改代码、要装本地目录」准备的，做三件事：
 *   1. profile 的 package.json：dependencies 写 link: 指向本仓库，profile 才找得到这个包；
 *   2. profile 的 package.json：dsh.profile.bundles 里登记包名，宿主才会把它当 bundle 加载
 *      （包自带的 dsh.bundle.patch 会随 bundle 一起生效，不需要再往 cordis.patch.yml 写 insert）；
 *   3. profile 的 node_modules 下建符号链接，模块解析才落得到本仓库。
 * 另外会顺手清掉旧版本脚本留在 cordis.patch.yml 里的 insert（重复登记同一个 id 没有必要）。
 *
 * 用法：
 *   node scripts/install.mjs                     # 装进 codexprobe（默认，隔离的验证 profile）
 *   node scripts/install.mjs --profile desktop   # 装进正在用的桌面 profile
 *   node scripts/install.mjs --profile desktop --uninstall   # 卸掉
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/** 插件包名：profile 里登记的 bundle、node_modules 里的链接名都用它。 */
const PACKAGE = 'dsh-codex-sidebar'
/** 旧版脚本在 cordis.patch.yml 里写过的 insert id，只用于清理。 */
const LEGACY_ENTRY_ID = 'ui-codex-sidebar'
/** 本仓库根目录（scripts/ 的上级）。 */
const ROOT = path.resolve(import.meta.dirname, '..')

/** 读命令行参数：--profile 与 --uninstall。 */
const argv = process.argv.slice(2)
const profileIndex = argv.indexOf('--profile')
const PROFILE = profileIndex >= 0 ? argv[profileIndex + 1] : 'codexprobe'
const UNINSTALL = argv.includes('--uninstall')

/** DSH_HOME 允许覆盖，默认 ~/.dsh。 */
const DSH_HOME = process.env.DSH_HOME ?? path.join(os.homedir(), '.dsh')
/** profile 目录。 */
const DIR = path.join(DSH_HOME, 'profiles', PROFILE)

if (!/^[\w.-]+$/.test(PROFILE)) {
  console.error(`profile 名不合法: ${PROFILE}`)
  process.exit(1)
}
if (!fs.existsSync(DIR)) {
  console.error(`profile 不存在: ${DIR}`)
  console.error('先用 dsh --profile <name> 跑一次让 DSH 建出 profile 骨架，再装插件。')
  process.exit(1)
}

/** 读一个 JSON 文件，读不到返回 undefined。 */
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return undefined
  }
}

/** 写回 JSON，保持两空格缩进与结尾换行。 */
function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n')
}

/**
 * 改 profile 的 package.json：bundles 里加/去包名，dependencies 里加/去 link 依赖。
 *
 * @param install - true 装，false 卸。
 */
function editPackageJson(install) {
  const file = path.join(DIR, 'package.json')
  const json = readJson(file)
  if (json === undefined) throw new Error(`读不到 ${file}`)
  json.dsh ??= {}
  json.dsh.profile ??= {}
  const bundles = (json.dsh.profile.bundles ?? []).filter(name => name !== PACKAGE)
  json.dependencies ??= {}
  if (install) {
    bundles.push(PACKAGE)
    json.dependencies[PACKAGE] = `link:${ROOT}`
  } else {
    delete json.dependencies[PACKAGE]
  }
  json.dsh.profile.bundles = bundles
  writeJson(file, json)
}

/**
 * 清掉旧版脚本在 cordis.patch.yml 里写的 insert 段。
 *
 * 现在包作为 bundle 登记就够了，额外那条 insert 会让同一个 id 在配置里出现两次；
 * 装和卸都调用一次，老用户的 profile 顺手收敛干净。
 */
function stripLegacyPatch() {
  const file = path.join(DIR, 'cordis.patch.yml')
  if (!fs.existsSync(file)) return false
  let text = fs.readFileSync(file, 'utf8')
  if (!text.includes(`id: ${LEGACY_ENTRY_ID}`)) return false
  // 整段（注释行 + insert 段）一起摘掉：只删 id 行会留下空 insert，Loader 会报错。
  const next = text.replace(/\n*#[^\n]*dsh-codex-sidebar[^\n]*\n- insert:\n {4}- id: ui-codex-sidebar\n {6}name: 'dsh-codex-sidebar'\n?/g, '\n')
  fs.writeFileSync(file, next)
  return next !== text
}

/**
 * profile 的 node_modules 下建/删符号链接，让模块解析落回本仓库。
 *
 * @param install - true 建，false 删。
 */
function editNodeModules(install) {
  const modules = path.join(DIR, 'node_modules')
  fs.mkdirSync(modules, { recursive: true })
  const link = path.join(modules, PACKAGE)
  if (fs.existsSync(link) || isSymlink(link)) fs.rmSync(link, { recursive: true, force: true })
  if (install) fs.symlinkSync(ROOT, link, 'dir')
}

/** lstat 判断是否为符号链接（断链的也算）。 */
function isSymlink(file) {
  try {
    return fs.lstatSync(file).isSymbolicLink()
  } catch {
    return false
  }
}

/** 把装/卸的结果读回来核对：每一步都自己验一遍，失败就报错退出。 */
function verify(install) {
  const json = readJson(path.join(DIR, 'package.json'))
  const link = path.join(DIR, 'node_modules', PACKAGE)
  const linked = isSymlink(link) && fs.realpathSync(link) === fs.realpathSync(ROOT)
  const inBundles = (json?.dsh?.profile?.bundles ?? []).includes(PACKAGE)
  const ok = install ? inBundles && linked : !inBundles && !linked
  console.log(`bundles=${inBundles} link=${linked}`)
  if (!ok) throw new Error('装/卸没有全部生效，见上面两项')
}

editPackageJson(!UNINSTALL)
stripLegacyPatch()
editNodeModules(!UNINSTALL)
verify(!UNINSTALL)
console.log(`${UNINSTALL ? '卸载' : '安装'}完成：profile=${PROFILE} dir=${DIR}`)
if (!UNINSTALL) {
  console.log(`重启生效：dsh --profile ${PROFILE} --port 49800 --no-open` + '（注意不能带 web 子命令）')
  console.log('桌面 App 里用：Cmd+Q 退出后重开（关窗不退进程）。')
}
