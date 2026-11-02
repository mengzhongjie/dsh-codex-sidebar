/** 准备：把缩放档位写成 125%，其余设置保持默认。 */
localStorage.setItem('dsh-codex-sidebar.settings', JSON.stringify({ dateViewEnabled: false, skipWorkspaces: ['闲聊'], zoom: 1.25, takeoverWithTheme: false }))
return localStorage.getItem('dsh-codex-sidebar.settings')
