// 验证整页缩放（照 dsh-claude-style 的做法）与设置页在两种宿主下的表现。
const out = {}
const sleep = ms => new Promise(r => setTimeout(r, ms))

const notice = [...document.querySelectorAll('[role="dialog"] button')].find(b => /continue|继续/i.test(b.textContent || ''))
if (notice) { notice.click(); await sleep(400) }
out.closedNotice = Boolean(notice)

// 点齿轮打开官方设置页（会自动切到本插件那一页）
const gear = [...document.querySelectorAll('button[aria-label]')].find(b => /sidebar settings|侧栏设置/i.test(b.getAttribute('aria-label')))
gear?.click(); await sleep(1000)

out.themePresent = document.body.hasAttribute('data-dsh-claude-style')
out.ourPageText = (document.querySelector('.codex-sidebar-settings')?.textContent || '').slice(0, 120)
out.cards = document.querySelectorAll('.codex-sidebar-settings-card').length
out.zoomSteps = [...document.querySelectorAll('.codex-sidebar-zoom-step')].map(b => ({ text: b.textContent.trim(), selected: b.getAttribute('data-selected') }))

// 主题在场：本插件让位，不写任何缩放标记，页面缩放仍由主题负责。
out.bodyZoomAttrOur = document.body.getAttribute('data-codex-sidebar-page-zoom')
out.bodyZoomInline = document.body.style.zoom || null
out.themeZoomAttr = document.body.getAttribute('data-dsh-claude-page-zoom')
out.bodyComputedZoom = getComputedStyle(document.body).zoom

if (!out.themePresent) {
  // 点 125%：读缩放三件套与页面几何
  const step125 = [...document.querySelectorAll('.codex-sidebar-zoom-step')].find(b => b.textContent.trim() === '125%')
  step125?.click(); await sleep(600)
  out.after125 = {
    attr: document.body.getAttribute('data-codex-sidebar-page-zoom'),
    var: getComputedStyle(document.body).getPropertyValue('--codex-sidebar-page-zoom-factor').trim(),
    widthVar: getComputedStyle(document.body).getPropertyValue('--codex-sidebar-page-width').trim(),
    heightVar: getComputedStyle(document.body).getPropertyValue('--codex-sidebar-page-height').trim(),
    computedZoom: getComputedStyle(document.body).zoom,
    inlineZoom: document.body.style.zoom || null,
    bodyRect: (() => { const r = document.body.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) } })(),
    inner: { w: innerWidth, h: innerHeight },
    scrollHeight: document.documentElement.scrollHeight,
    docScrolls: document.documentElement.scrollHeight > innerHeight + 1,
    dialogRect: (() => { const d = document.querySelector('[role="dialog"]'); if (!d) return null; const r = d.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } })(),
    selected: [...document.querySelectorAll('.codex-sidebar-zoom-step')].filter(b => b.getAttribute('data-selected') === 'true').map(b => b.textContent.trim()),
    stored: JSON.parse(localStorage.getItem('dsh-codex-sidebar.settings') || 'null')
  }
  // 回到 100%：三件套应该全部撤掉
  const step100 = [...document.querySelectorAll('.codex-sidebar-zoom-step')].find(b => b.textContent.trim() === '100%')
  step100?.click(); await sleep(500)
  out.after100 = {
    attr: document.body.getAttribute('data-codex-sidebar-page-zoom'),
    widthVar: getComputedStyle(document.body).getPropertyValue('--codex-sidebar-page-width').trim(),
    computedZoom: getComputedStyle(document.body).zoom,
    scrollHeight: document.documentElement.scrollHeight,
    stored: JSON.parse(localStorage.getItem('dsh-codex-sidebar.settings') || 'null')
  }
}

return out;