/** 度量：125% 下浮层（账号菜单 / 设置页 / better-sidebar 面板）的缩放与几何。 */
const out = {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), b: Math.round(r.bottom) }; };
const click = el => { el?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); };

out.zoom = { attr: document.body.getAttribute('data-codex-sidebar-page-zoom'), factor: document.body.style.getPropertyValue('--codex-sidebar-page-zoom-factor') };
out.rootRect = rect(document.querySelector('#root'));

// better-sidebar：停靠按钮 + 底部面板（强制显示）
const panel = document.querySelector('[data-dsh-bottom-panel]');
if (panel) panel.className = String(panel.className).replace(/Hidden/g, '');
await sleep(600);
const dockBtn = document.querySelector('[data-dsh-dock-fallback]');
out.better = {
  panel: rect(document.querySelector('[data-dsh-bottom-panel]')),
  panelInline: document.querySelector('[data-dsh-bottom-panel]')?.getAttribute('style'),
  panelFont: panel ? getComputedStyle(panel.querySelector('button')).fontSize : null,
  dock: rect(dockBtn),
  dockStyle: dockBtn?.getAttribute('style'),
};
out.sidebarRight = (() => { const s = document.querySelector('[data-slot="sidebar"] > div'); return s ? Math.round(s.getBoundingClientRect().right) : null; })();

// 设置页
click(document.querySelector('[data-slot="settings.launcher"] button'));
await sleep(800);
const items = [...document.querySelectorAll('[role="menuitem"], [role="menu"] button')];
click(items.find(el => /settings|设置/i.test(el.textContent || '')));
await sleep(1500);
const dialog = document.querySelector('[role="dialog"]');
out.dialog = { zoom: dialog?.style.getPropertyValue('zoom') || '', rect: rect(dialog), navLabels: dialog ? [...dialog.querySelectorAll('[class*="navCell"]')].map(b => b.textContent.trim()) : [] };
const closeBtn = [...document.querySelectorAll('[role="dialog"] button')].find(b => /close|关闭/i.test(b.textContent || '') || /close/i.test(b.getAttribute('aria-label') || ''));
click(closeBtn);
await sleep(800);

// 账号菜单
click(document.querySelector('[data-slot="settings.launcher"] button'));
await sleep(900);
const menu = document.querySelector('[data-menu-material]');
out.menu = { zoom: menu?.style.getPropertyValue('zoom') || '', rect: rect(menu), inView: menu ? (r => r.y >= 0 && r.b <= innerHeight && r.x >= 0)(menu.getBoundingClientRect()) : null };

out.portals = [...document.body.children].filter(el => el.hasAttribute('data-codex-sidebar-portal-fit')).map(el => ({ cls: String(el.className).slice(0, 22), zoom: el.style.getPropertyValue('zoom'), style: (el.getAttribute('style') || '').slice(0, 90) })).slice(0, 10);
return out;
