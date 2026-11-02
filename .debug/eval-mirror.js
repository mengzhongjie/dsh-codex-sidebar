// 探针：镜像 desktop profile 下本插件的加载情况（dormant 模式 + 官方设置页）
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = {};
// 1) 关掉首次运行的 Preview Notice（它也是 [role=dialog]，会干扰判断）
const continueBtn = [...document.querySelectorAll('button')].find(b => /^Continue$/i.test(b.textContent.trim()));
if (continueBtn) { continueBtn.click(); await sleep(700); }
out.previewNotice = Boolean(continueBtn);
// 2) 等插件 boot 完成
await sleep(1500);
out.bodyAttrs = [...document.body.attributes].map(a => a.name).filter(n => /codex-sidebar|dsh-claude/.test(n));
out.ownedNodes = document.querySelectorAll('[data-codex-sidebar-owned]').length;
out.actionsBox = Boolean(document.querySelector('.codex-sidebar-actions'));
const gear = document.querySelector('.codex-sidebar-actions button[aria-label="Sidebar settings"]');
out.gear = Boolean(gear);
out.bell = Boolean(document.querySelector('.codex-sidebar-actions button[aria-label="Toggle date view"]'));
out.themeBell = document.querySelectorAll('.dsh-claude-active-shelf-trigger').length;
out.workspaceRows = document.querySelectorAll('[data-row-key^="workspace:"]').length;
out.sessionRows = document.querySelectorAll('[data-row-key^="session:"]').length;
out.dateHeaders = document.querySelectorAll('.codex-sidebar-date-header').length;
// 3) 点齿轮 → 官方设置页应自动停到本插件页
if (gear) { gear.click(); await sleep(1800); }
const navBtns = [...document.querySelectorAll('button')].filter(b => String(b.className).includes('navCell'));
out.navLabels = navBtns.map(b => b.textContent.trim());
out.activeNav = navBtns.filter(b => String(b.className).includes('active')).map(b => b.textContent.trim());
out.ourPageCards = document.querySelectorAll('.codex-sidebar-settings-card').length;
out.switchCount = document.querySelectorAll('.codex-sidebar-settings-switch, [role="switch"]').length;
return out;