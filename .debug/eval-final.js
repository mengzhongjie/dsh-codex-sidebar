const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (fn, timeout = 4000) => { const t0 = Date.now(); while (Date.now() - t0 < timeout) { const v = fn(); if (v) return v; await sleep(50) } return null };
const out = {};
// 关掉首次运行的 Preview Notice
for (const btn of [...document.querySelectorAll('button')]) {
  if (/^(Continue|继续)$/i.test((btn.textContent || '').trim())) { btn.click(); await sleep(400); break }
}
// 侧栏折叠时先展开
const openBtn = document.querySelector('button[aria-label="打开侧边栏"], button[aria-label="Open sidebar"]');
if (openBtn) { openBtn.click(); await sleep(1500) }
const bell = await waitFor(() => document.querySelector('[data-codex-sidebar-bell]'));
out.bell = Boolean(bell);
if (bell && document.body.hasAttribute('data-codex-sidebar-date-view') === false) { bell.click(); await sleep(700) }
out.dateModeOn = document.body.hasAttribute('data-codex-sidebar-date-view');
out.headers = [...document.querySelectorAll('[data-codex-sidebar-owned][data-codex-sidebar-date-header]')].length;
out.chips = document.querySelectorAll('.codex-sidebar-chip').length;
// 齿轮 → 官方设置页
const gear = [...document.querySelectorAll('[data-codex-sidebar-owned] button, button[data-codex-sidebar-owned]')].find(b => /Sidebar settings|侧栏设置/.test(b.getAttribute('aria-label') || ''));
out.gear = Boolean(gear);
if (gear) {
  gear.click();
  const nav = await waitFor(() => { const cells = [...document.querySelectorAll('button')].filter(b => String(b.className).includes('navCell')); return cells.length ? cells : null }, 6000);
  out.navLabels = nav ? nav.map(b => (b.textContent || '').trim()) : [];
  out.activeNav = nav ? nav.filter(b => /active/.test(String(b.className))).map(b => (b.textContent || '').trim()) : [];
  out.cards = document.querySelectorAll('.codex-sidebar-settings-card').length;
  out.switches = document.querySelectorAll('.codex-sidebar-settings [role="switch"], .codex-sidebar-switch').length;
  const closeBtn = [...document.querySelectorAll('button')].find(b => /^(Close|关闭)$/.test((b.textContent || '').trim()));
  if (closeBtn) { closeBtn.click(); await sleep(600) }
  out.dialogClosed = !document.querySelector('button[class*="navCell"]');
}
// 关日期视图 → 还原工作区分组
if (bell && document.body.hasAttribute('data-codex-sidebar-date-view')) { bell.click(); await sleep(900) }
out.dateModeOff = !document.body.hasAttribute('data-codex-sidebar-date-view');
out.headersAfter = document.querySelectorAll('[data-codex-sidebar-date-header]').length;
out.chipsAfter = document.querySelectorAll('.codex-sidebar-chip').length;
out.workspaceRowsAfter = document.querySelectorAll('[data-row-key^="workspace:"]').length;
out.stored = localStorage.getItem('dsh-codex-sidebar.settings');
return out;