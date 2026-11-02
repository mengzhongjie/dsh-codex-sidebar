// createLocale：语言源要能等到宿主 locale 服务晚就绪，并在变化时通知/更新用词。
// 注意：createLocale 的 get()/language()/raw() 每次都会 refresh()，所以「晚出现」必须按时间模拟，
// 不能按调用次数模拟（构造与断言本身就会消耗调用次数）。
import { createLocale } from '/Users/apple/Desktop/SuperCode/Project/dsh-codex-messagesidebar/src/locale.js'
globalThis.window = globalThis
globalThis.document = { documentElement: { lang: 'en' } }

const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
const check = (name, ok, detail) => {
  results.push({ name, ok })
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' → ' + detail : ''))
}

// 用例一：服务 600ms 后才出现（模拟插件 apply 比宿主 locale 服务早）
{
  const start = Date.now()
  const lateCtx = {
    get: () => (Date.now() - start < 600 ? undefined : { getSnapshot: () => ({ active: 'zh-CN' }) })
  }
  const state = createLocale(lateCtx)
  check('初始（服务未就绪）按 html lang 判 en', state.language() === 'en', state.language())
  const seen = []
  state.subscribe((next, labels) => seen.push(next + ':' + labels.today))
  await sleep(1600)
  check('轮询后切成 zh', state.language() === 'zh', state.language())
  check('订阅者收到变化', seen.join(',') === 'zh:今天', seen.join(',') || '（无）')
  check('用词表跟着换', state.get().today === '今天', state.get().today)
  check('宿主原始串被记下', state.raw() === 'zh-CN', state.raw())
  state.dispose()
}

// 用例二：服务一开始就报中文 → 立即中文，不需要等轮询
{
  const ctx = { get: () => ({ getSnapshot: () => ({ active: 'zh-CN' }) }) }
  const state = createLocale(ctx)
  check('服务就绪时立即 zh', state.language() === 'zh', state.language())
  state.dispose()
}

// 用例三：中途切换语言（服务快照变了）→ get() 现取即变
{
  let active = 'en-US'
  const ctx = { get: () => ({ getSnapshot: () => ({ active }) }) }
  const state = createLocale(ctx)
  check('初始 en', state.get().today === 'Today', state.get().today)
  active = 'zh-CN'
  check('切换后 get() 立刻中文', state.get().today === '今天', state.get().today)
  state.dispose()
}

// 用例四：dispose 之后轮询要停（不再消耗服务、不再通知）
{
  let calls = 0
  const ctx = { get: () => { calls += 1; return undefined } }
  const state = createLocale(ctx)
  state.dispose()
  const before = calls
  await sleep(700)
  check('dispose 后不再轮询', calls === before, calls + ' vs ' + before)
}

// 用例五：服务支持 subscribe（宿主的 LocaleFace 就是这种）→ 靠订阅即时跟随，不用等轮询
{
  let active = 'en-US'
  const subs = new Set()
  const ctx = {
    get: () => ({ getSnapshot: () => ({ active }), subscribe: fn => { subs.add(fn); return () => subs.delete(fn) } })
  }
  const state = createLocale(ctx)
  const seen = []
  state.subscribe((next, labels) => seen.push(next + ':' + labels.today))
  check('订阅式服务初始 en', state.get().today === 'Today', state.get().today)
  active = 'zh-CN'
  for (const fn of subs) fn()
  check('服务快照变化后立即 zh', state.get().today === '今天', state.get().today)
  check('订阅者收到变化', seen.join(',') === 'zh:今天', seen.join(',') || '（无）')
  state.dispose()
  check('dispose 后不再持有宿主订阅', subs.size === 0, String(subs.size))
}

// 用例六：服务晚出现且支持 subscribe → 轮询绑上之后靠订阅，不再轮询
{
  const start = Date.now()
  const subs = new Set()
  let active = 'en-US'
  const ctx = {
    get: () => (Date.now() - start < 400
      ? undefined
      : { getSnapshot: () => ({ active }), subscribe: fn => { subs.add(fn); return () => subs.delete(fn) } })
  }
  const state = createLocale(ctx)
  check('晚出现的服务：初始 en', state.language() === 'en', state.language())
  await sleep(1200)
  check('轮询把服务绑上', subs.size === 1, String(subs.size))
  active = 'zh-CN'
  for (const fn of subs) fn()
  check('绑定后靠订阅跟随', state.get().today === '今天', state.get().today)
  state.dispose()
}

const passed = results.filter(r => r.ok).length
console.log(passed + '/' + results.length + ' 通过')
process.exit(passed === results.length ? 0 : 1)