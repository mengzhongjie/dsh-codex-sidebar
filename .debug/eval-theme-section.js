const out = {}
const wait = ms => new Promise(r => setTimeout(r, ms))
const note = (k, v) => { out[k] = v }
const findNav = () => [...document.querySelectorAll('button')].filter(b => String(b.className).includes('navCell'))
// 主题标记
note('themeMarkers', [...document.body.attributes].map(a => a.name).filter(n => n.startsWith('data-dsh-claude')).slice(0, 6))
note('themeBellBefore', document.querySelectorAll('.dsh-claude-active-shelf-trigger').length)
const cont = [...document.querySelectorAll('[role="dialog"] button')].find(b => /continue/i.test(b.textContent || ''))
cont && cont.click(); await wait(500)
const openSidebar = document.querySelector('button[aria-label="Open sidebar"], button[aria-label="打开侧边栏"]')
if (openSidebar) { openSidebar.click(); await wait(700) }
const gear = [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || '') === 'Sidebar settings')
note('gearFound', !!gear)
gear && gear.click(); await wait(2000)
note('navLabels', findNav().map(b => (b.textContent || '').trim()))
note('ourPage', !!document.querySelector('.codex-sidebar-settings'))
note('switchCount', document.querySelectorAll('.codex-sidebar-switch').length)
note('switchAriaLabels', [...document.querySelectorAll('.codex-sidebar-switch')].map(b => b.getAttribute('aria-label')))
note('switchStates', [...document.querySelectorAll('.codex-sidebar-switch')].map(b => b.getAttribute('aria-checked')))
// 打开接管
const switches = document.querySelectorAll('.codex-sidebar-switch')
switches[1] && switches[1].click(); await wait(900)
note('takeoverAttr', document.body.hasAttribute('data-codex-sidebar-takeover'))
note('themeBellHidden', (() => { const bell = document.querySelector('.dsh-claude-active-shelf-trigger'); if (!bell) return 'no-bell'; const cs = getComputedStyle(bell); return cs.display; })())
note('storedAfterTakeover', localStorage.getItem('dsh-codex-sidebar.settings'))
// 再打开日期视图
switches[0] && switches[0].click(); await wait(1200)
note('dateModeOn', document.body.hasAttribute('data-codex-sidebar-date-view'))
note('ourHeaders', document.querySelectorAll('.codex-sidebar-date-header').length)
note('themeHeaders', document.querySelectorAll('[data-dsh-claude-date-header]').length)
// 关掉设置页看侧栏
const closeBtn = [...document.querySelectorAll('[role="dialog"] button')].find(b => (b.textContent || '').trim() === 'Close')
closeBtn && closeBtn.click(); await wait(900)
note('dialogClosed', !document.querySelector('[role="dialog"]'))
note('ourHeadersSidebar', document.querySelectorAll('.codex-sidebar-date-header').length)
note('chips', document.querySelectorAll('.codex-sidebar-chip').length)
return out