// locale.js 的语言判定：服务快照、documentElement.lang、navigator.language 三级
import { resolveLocale, labelsFor, hostLocaleText } from '/Users/apple/Desktop/SuperCode/Project/dsh-codex-messagesidebar/src/locale.js'
globalThis.document = { documentElement: { lang: 'zh-CN' } }

const cases = [
  { name: '服务的 active 是 zh-CN', ctx: { get: () => ({ getSnapshot: () => ({ active: 'zh-CN' }) }) }, hope: 'zh' },
  { name: '服务的 active 是 en-US（优先于 html lang）', ctx: { get: () => ({ getSnapshot: () => ({ active: 'en-US' }) }) }, hope: 'en' },
  { name: '服务对象直接带 locale 字段', ctx: { get: () => ({ locale: 'zh-Hans' }) }, hope: 'zh' },
  { name: '没有 locale 服务，退回 html lang', ctx: { get: () => undefined }, hope: 'zh' },
  { name: '服务抛错也不崩', ctx: { get: () => { throw new Error('no service') } }, hope: 'zh' }
]
let pass = 0
for (const item of cases) {
  const got = resolveLocale(item.ctx)
  const ok = got === item.hope
  if (ok) pass += 1
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + item.name + ' → ' + got)
}
console.log('hostLocaleText:', JSON.stringify(hostLocaleText({ get: () => ({ getSnapshot: () => ({ active: 'zh-CN' }) }) })))
console.log('中文:', labelsFor('zh').today, labelsFor('zh').weekdays[6], '| 英文:', labelsFor('en').today)
console.log(pass + '/' + cases.length + ' 通过')
