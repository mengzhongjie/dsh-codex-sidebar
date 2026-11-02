/**
 * 探针：镜像 profile（主题已关）里验证铃铛、日期视图、设置页与缩放。
 */
const out = { steps: [] };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** 点掉首次运行的 Preview Notice。 */
function dismissNotice() {
  for (const b of document.querySelectorAll('button')) {
    const t = (b.textContent || '').trim();
    if (/^(continue|继续|知道了|got it)$/i.test(t)) { b.click(); return t; }
  }
  return null;
}

const notice = dismissNotice();
await sleep(600);
out.notice = notice;

/** 页面现状：主题痕迹、我们的节点。 */
function snapshot(tag) {
  const body = document.body;
  const attrs = [...body.attributes].map(a => a.name);
  const actions = document.querySelector('.codex-sidebar-actions');
  const bell = document.querySelector('.codex-sidebar-actions button[aria-pressed]');
  const gear = document.querySelector('.codex-sidebar-actions button:nth-child(2)');
  const rect = bell ? bell.getBoundingClientRect() : null;
  const hit = rect ? document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) : null;
  return {
    tag,
    themeAttrs: attrs.filter(n => n.startsWith('data-dsh-claude')),
    ours: attrs.filter(n => n.startsWith('data-codex-sidebar')),
    actionsCount: document.querySelectorAll('.codex-sidebar-actions').length,
    bell: rect ? { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height),
                  label: bell.getAttribute('aria-label'), pressed: bell.getAttribute('aria-pressed'),
                  hitIsBell: hit ? (bell.contains(hit) || hit === bell) : false,
                  hitTag: hit ? hit.tagName + '.' + String(hit.className).slice(0, 30) : null } : null,
    gearCount: gear ? 1 : 0,
    dateHeaders: document.querySelectorAll('.codex-sidebar-date-header').length,
    hasDateAttr: body.hasAttribute('data-codex-sidebar-date-view'),
    sessionRows: document.querySelectorAll('[data-row-key^="session:"]').length,
    workspaceRows: document.querySelectorAll('[data-row-key^="workspace:"]').length,
    chips: document.querySelectorAll('.codex-sidebar-chip').length,
    themeBell: document.querySelectorAll('.dsh-claude-active-shelf-trigger').length,
    zoomAttr: body.getAttribute('data-codex-sidebar-page-zoom'),
  };
}

out.before = snapshot('before');

/** 工作区行的图标几何：宿主的三个图标 + 我们的动作区，检查有没有叠在一起。 */
function iconGeometry() {
  const rows = [...document.querySelectorAll('div')].filter(n => typeof n.className === 'string' && n.className.includes('sectionHeader'));
  const row = rows[rows.length - 1];
  if (!row) return null;
  return [...row.querySelectorAll('button')].map(b => {
    const r = b.getBoundingClientRect();
    return { label: b.getAttribute('aria-label'), x: Math.round(r.x), w: Math.round(r.width), owned: b.hasAttribute('data-codex-sidebar-owned') };
  });
}
out.icons = iconGeometry();

// 点铃铛：进日期视图
const bell = document.querySelector('.codex-sidebar-actions button[aria-pressed]');
if (bell) bell.click();
await sleep(900);
out.afterToggleOn = snapshot('after-on');

// 再点一次：退出日期视图
const bell2 = document.querySelector('.codex-sidebar-actions button[aria-pressed]');
if (bell2) bell2.click();
await sleep(900);
out.afterToggleOff = snapshot('after-off');

// 齿轮 → 官方设置页
const gear = document.querySelector('.codex-sidebar-actions button:nth-child(2)');
if (gear) gear.click();
await sleep(1500);
const navs = [...document.querySelectorAll('button')].filter(b => String(b.className).includes('navCell'));
out.settings = {
  open: navs.length > 0,
  navs: navs.map(b => (b.textContent || '').trim()),
  active: navs.filter(b => String(b.className).includes('active')).map(b => (b.textContent || '').trim()),
  cards: document.querySelectorAll('.codex-sidebar-settings-card').length,
};

// 在设置页里点 125% 档位
const zoomButtons = [...document.querySelectorAll('.codex-sidebar-zoom-step')];
out.zoomSteps = zoomButtons.map(b => (b.textContent || '').trim());
const target = zoomButtons.find(b => (b.textContent || '').trim().startsWith('125'));
if (target) target.click();
await sleep(800);
out.afterZoom = {
  attr: document.body.getAttribute('data-codex-sidebar-page-zoom'),
  varValue: document.body.style.getPropertyValue('--codex-sidebar-page-zoom-factor'),
  stored: localStorage.getItem('dsh-codex-sidebar.settings'),
};

// better-sidebar 的面板（如果这个 profile 有）：记录它的盒子与内部字号，看是否跟着缩放
const panel = document.querySelector('[data-dsh-bottom-panel]');
const panelHost = document.querySelector('[data-dsh-panel-host]');
out.better = {
  panel: panel ? (r => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }))(panel.getBoundingClientRect()) : null,
  panelFont: panel ? getComputedStyle(panel.querySelector('button') || panel).fontSize : null,
  host: panelHost ? (r => ({ x: Math.round(r.x), w: Math.round(r.width) }))(panelHost.getBoundingClientRect()) : null,
};

return out;
