// 设置页回归：齿轮 → 官方设置页应停在本插件那一页，卡片/开关/档位齐全（语言源改造后自查）。
const sleep = ms => new Promise(r => setTimeout(r, ms))
const out = {}

const notice = [...document.querySelectorAll('[role="dialog"] button')].find(b => /continue|继续/i.test(b.textContent || ''))
if (notice) { notice.click(); await sleep(400) }

const gear = [...document.querySelectorAll('button[aria-label]')].find(b => /sidebar settings|侧栏设置/i.test(b.getAttribute('aria-label')))
out.gearLabel = gear ? gear.getAttribute('aria-label') : null
gear?.click(); await sleep(1200)

const navs = [...document.querySelectorAll('button')].filter(b => String(b.className || '').includes('navCell'))
out.navLabels = navs.map(b => (b.textContent || '').trim())
out.active = navs.filter(b => String(b.className).includes('active')).map(b => (b.textContent || '').trim())
out.cards = document.querySelectorAll('.codex-sidebar-settings-card').length
out.intro = (document.querySelector('.codex-sidebar-settings-intro') || {}).textContent || ''
const switches = [...document.querySelectorAll('[role="switch"]')]
out.switchLabels = switches.map(s => s.getAttribute('aria-label'))
out.switchCount = switches.length
out.switchChecked = switches.map(s => s.getAttribute('aria-checked'))
out.checks = document.querySelectorAll('.codex-sidebar-settings-check').length
out.checked = [...document.querySelectorAll('.codex-sidebar-settings-check[aria-checked="true"]')].map(b => b.textContent.trim())
out.zoomSteps = [...document.querySelectorAll('.codex-sidebar-zoom-step')].map(b => ({ text: b.textContent.trim(), selected: b.getAttribute('data-selected') }))
out.toggleTitle = switches.length > 0 ? switches[0].getAttribute('aria-label') : null
return out
