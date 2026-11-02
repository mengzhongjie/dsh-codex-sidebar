// 语言热切换：宿主设置里把 English 换成中文，看本插件是否跟着变（导航标签 / 正文 / 铃铛 aria-label）。
const sleep = ms => new Promise(r => setTimeout(r, ms))
const out = {}
const notice = [...document.querySelectorAll('[role="dialog"] button')].find(b => /continue|继续/i.test(b.textContent || ''))
if (notice) { notice.click(); await sleep(400) }

const findGear = () => [...document.querySelectorAll('button[aria-label]')].find(b => /sidebar settings|侧栏设置/i.test(b.getAttribute('aria-label')))
out.gearBefore = findGear()?.getAttribute('aria-label') ?? null
findGear()?.click(); await sleep(1000)

const navs = () => [...document.querySelectorAll('button')].filter(b => String(b.className || '').includes('navCell'))
out.navBefore = navs().map(b => (b.textContent || '').trim())
out.ourBefore = (document.querySelector('.codex-sidebar-settings') || {}).textContent || ''

// 通用设置 → 语言选择器
navs().find(b => /general|通用/i.test(b.textContent || ''))?.click(); await sleep(700)
const langButton = [...document.querySelectorAll('button')].find(b => String(b.className || '').includes('selector') && /english|中文|chinese/i.test(b.textContent || ''))
out.langButton = langButton ? (langButton.textContent || '').trim() : null
langButton?.click(); await sleep(500)
const options = [...document.querySelectorAll('[role="menuitem"], [role="option"], [role="menu"] button, li[role="option"]')]
out.optionTexts = options.map(o => (o.textContent || '').trim()).slice(0, 8)
const zh = options.find(o => /中文|chinese/i.test(o.textContent || ''))
out.pickedZh = Boolean(zh)
zh?.click(); await sleep(1800)

out.htmlLang = document.documentElement.lang
out.navAfter = navs().map(b => (b.textContent || '').trim())
// 回到本插件那一页（标签现在应为中文）
const ourNav = navs().find(b => /侧栏设置|sidebar settings/i.test(b.textContent || ''))
ourNav?.click(); await sleep(900)
out.ourAfter = (document.querySelector('.codex-sidebar-settings') || {}).textContent || ''
out.gearAfter = findGear()?.getAttribute('aria-label') ?? null
out.pluginButtons = [...document.querySelectorAll('button[aria-label]')].map(b => b.getAttribute('aria-label')).filter(l => /sidebar settings|侧栏设置|date view|日期视图/i.test(l))
// 铃铛在侧栏顶行：退出设置页再看日期标题是否中文
const close = document.querySelector('[role="dialog"] button[class*="close"]')
close?.click(); await sleep(500)
const bell = [...document.querySelectorAll('.codex-sidebar-actions button')][0]
out.bellLabel = bell ? bell.getAttribute('aria-label') : null
bell?.click(); await sleep(1200)
out.headers = [...document.querySelectorAll('[data-codex-sidebar-owned][class*="codex-sidebar-date-header"]')].map(n => n.textContent)
out.chips = [...document.querySelectorAll('.codex-sidebar-chip')].slice(0, 3).map(n => n.textContent)
bell?.click(); await sleep(800)
out.headersAfter = document.querySelectorAll('[data-codex-sidebar-owned][class*="codex-sidebar-date-header"]').length
return out
