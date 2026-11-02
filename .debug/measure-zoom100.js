/** 度量：100% 时浮层补偿必须「什么都没做」（还原路径）。 */
const out = {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
out.zoomAttr = document.body.getAttribute('data-codex-sidebar-page-zoom');
out.factorVar = document.body.style.getPropertyValue('--codex-sidebar-page-zoom-factor');
out.portals = [...document.body.children].filter(el => el.hasAttribute('data-codex-sidebar-portal-fit')).length;
out.inlineZooms = [...document.body.querySelectorAll('[style*="zoom"]')].map(el => (el.getAttribute('style') || '').slice(0, 60)).slice(0, 6);
const panel = document.querySelector('[data-dsh-bottom-panel]');
if (panel) panel.className = String(panel.className).replace(/Hidden/g, '');
await sleep(500);
out.betterPanel = { rect: rect(document.querySelector('[data-dsh-bottom-panel]')), inline: document.querySelector('[data-dsh-bottom-panel]')?.getAttribute('style') };
out.sidebarRight = (() => { const s = document.querySelector('[data-slot="sidebar"] > div'); return s ? Math.round(s.getBoundingClientRect().right) : null; })();
out.dateHeaders = document.querySelectorAll('[data-codex-sidebar-owned][class*="date-header"]').length;
out.workspaceRows = document.querySelectorAll('[data-row-key^="workspace:"]').length;
return out;
