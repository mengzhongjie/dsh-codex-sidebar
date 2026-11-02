#!/usr/bin/env node
/**
 * install.mjs — 把本插件装进一个 DSH profile，或从 profile 里卸掉。
 *
 * 手工装一个 client 插件要动四样东西，且每一步错了都不会报错、只会「插件不出现」：
 *   1. profile 的 cordis.patch.yml 加一行 insert，Loader 才会挂这个包；
 *   2. profile 的 package.json 的 dsh.profile.bundles 里登记包名，浏览器 roster 才会要它的 client bundle；
 *   3. package.json 的 dependencies 写 link: 指向本仓库，profile 才找得到这个包；
 *   4. profile 的 node_modules 下建符号链接，模块解析才落得到本仓库。
 * 本脚本把四件事一次做完，并在退出前把每一步的结果读回来验证一遍。
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
/** cordis.patch.yml 里那一行的 id：卸载时按它找回来。 */
const ENTRY_ID = 'ui-codex-sidebar'
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
 * 改 cordis.patch.yml：插到最前面的 insert 段里；卸载时把那一行去掉。
 *
 * 补丁文件是 YAML 列表，本插件只加一个顶层条目，所以按「文件末尾追加一个 insert
 * 列表项」处理即可；重复安装时先看 id 在不在，避免写两遍。
 *
 * @param install - true 装，false 卸。
 */
function editPatch(install) {
  const file = path.join(DIR, 'cordis.patch.yml')
  let text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
  const has = text.includes(`id: ${ENTRY_ID}`)
  if (install && !has) {
    text = text.trimEnd() + `\n\n# ${PACKAGE}：把侧栏换成 Codex 风格（按日期排列 + 铃铛开关 + 官方设置页里的「侧栏设置」）\n- insert:\n    - id: ${ENTRY_ID}\n      name: '${PACKAGE}'\n`
  }
  if (!install && has) {
    // 整段（注释行 + insert 段）一起摘掉：只删 id 行会留下空 insert，Loader 会报错。
    text = text.replace(/\n*#[^\n]*dsh-codex-sidebar[^\n]*\n- insert:\n {4}- id: ui-codex-sidebar\n {6}name: 'dsh-codex-sidebar'\n?/g, '\n')
  }
  fs.writeFileSync(file, text)
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
  const patch = fs.readFileSync(path.join(DIR, 'cordis.patch.yml'), 'utf8')
  const link = path.join(DIR, 'node_modules', PACKAGE)
  const linked = isSymlink(link) && fs.realpathSync(link) === fs.realpathSync(ROOT)
  const inBundles = (json?.dsh?.profile?.bundles ?? []).includes(PACKAGE)
  const inPatch = patch.includes(`id: ${ENTRY_ID}`)
  const ok = install ? inBundles && inPatch && linked : !inBundles && !inPatch && !linked
  console.log(`bundles=${inBundles} patch=${inPatch} link=${linked}`)
  if (!ok) throw new Error('装/卸没有全部生效，见上面三项')
}

editPackageJson(!UNINSTALL)
editPatch(!UNINSTALL)
editNodeModules(!UNINSTALL)
verify(!UNINSTALL)
console.log(`${UNINSTALL ? '卸载' : '安装'}完成：profile=${PROFILE} dir=${DIR}`)
if (!UNINSTALL) {
  console.log(`重启生效：dsh --profile ${PROFILE} --port 49800 --no-open` + '（注意不能带 web 子命令）')
  console.log('桌面 App 里用：Cmd+Q 退出后重开（关窗不退进程）。')
}
