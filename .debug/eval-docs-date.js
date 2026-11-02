// 文档截图（日期视图）：点铃铛进入日期视图后停住，由 verify.mjs 截图。
const sleep = ms => new Promise(r => setTimeout(r, ms))
const notice = [...document.querySelectorAll('[role="dialog"] button')].find(b => /continue|继续/i.test(b.textContent || ''))
if (notice) { notice.click(); await sleep(400) }
const bell = [...document.querySelectorAll('.codex-sidebar-actions button')][0]
bell?.click(); await sleep(1200)
return {
  bell: bell ? bell.getAttribute('aria-label') : null,
  pressed: bell ? bell.getAttribute('aria-pressed') : null,
  headers: [...document.querySelectorAll('[data-codex-sidebar-owned][class*="codex-sidebar-date-header"]')].map(n => n.textContent),
  workspaceRows: document.querySelectorAll('[data-row-key^="workspace:"]').length
}
