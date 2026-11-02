// 打开官方设置页的「内置插件」页，量面板/对话框几何，看下半屏空白到底是谁的盒子。
const out = { }
const sleep = ms => new Promise(r => setTimeout(r, ms))

// 首次运行会有 Preview Notice 弹窗，先关掉。
const notice = [...document.querySelectorAll('[role="dialog"] button')].find(b => /continue|继续/i.test(b.textContent || ''))
if (notice) { notice.click(); await sleep(400) }
out.closedNotice = Boolean(notice)

// 侧栏顶行的齿轮（本插件挂的），点开官方设置页。
const gear = [...document.querySelectorAll('button[aria-label]')].find(b => /sidebar settings|侧栏设置/i.test(b.getAttribute('aria-label')))
out.gearFound = Boolean(gear)
gear?.click(); await sleep(900)

const navs = [...document.querySelectorAll('button')].filter(b => String(b.className || '').includes('navCell'))
out.navLabels = navs.map(b => (b.textContent || '').trim())
const pluginsNav = navs.find(b => /built-in plugins|内置插件|插件市场|plugin market/i.test(b.textContent || ''))
out.pluginsNavLabel = pluginsNav ? (pluginsNav.textContent || '').trim() : null
pluginsNav?.click(); await sleep(1200)

// 页面整体缩放与根节点高度：这是行内 zoom 与主题 zoom 打架时会露馅的地方。
const cs = getComputedStyle(document.body)
out.bodyZoomInline = document.body.style.zoom || null
out.bodyZoomComputed = cs.zoom
out.themeZoomAttr = document.body.getAttribute('data-dsh-claude-page-zoom')
out.themeZoomVar = getComputedStyle(document.body).getPropertyValue('--dsh-claude-page-zoom-factor').trim()
out.htmlZoom = getComputedStyle(document.documentElement).zoom
out.innerHeight = innerHeight
out.scrollHeight = document.documentElement.scrollHeight
out.bodyRect = (() => { const r = document.body.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) } })()

// #root 与设置面板
const root = document.getElementById('root')
if (root) { const r = root.getBoundingClientRect(); out.rootRect = { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) } }

const dialog = document.querySelector('[role="dialog"]')
if (dialog) {
  const r = dialog.getBoundingClientRect()
  out.dialogRect = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  out.dialogPosition = getComputedStyle(dialog).position
  out.dialogZoom = getComputedStyle(dialog).zoom
  // 内容列：面板里可滚的那一列
  const cols = [...dialog.querySelectorAll('*')].filter(el => {
    const s = getComputedStyle(el)
    return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.getBoundingClientRect().height > 200
  }).slice(0, 3)
  out.scrollers = cols.map(el => { const s = el.getBoundingClientRect(); return { cls: String(el.className).slice(0, 40), h: Math.round(s.height), sh: el.scrollHeight, ch: el.clientHeight, top: Math.round(s.y) } })
  // 面板本身（白底卡片）
  const panel = dialog.firstElementChild
  if (panel) { const s = panel.getBoundingClientRect(); out.panelRect = { w: Math.round(s.width), h: Math.round(s.height), y: Math.round(s.y) }; out.panelCls = String(panel.className).slice(0, 40) }
}

// 空白区域里有什么：从 y=900 处取元素
out.atPoint900 = (() => { const el = document.elementFromPoint(innerWidth / 2, 900); return el ? { tag: el.tagName, cls: String(el.className).slice(0, 60) } : null })()
out.atPoint600 = (() => { const el = document.elementFromPoint(innerWidth / 2, 600); return el ? { tag: el.tagName, cls: String(el.className).slice(0, 60) } : null })()

return out;