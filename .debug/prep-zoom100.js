/** 准备：缩放回到 100%，其余默认。 */
localStorage.setItem('dsh-codex-sidebar.settings', JSON.stringify({ dateViewEnabled: false, skipWorkspaces: ['闲聊'], zoom: 1, takeoverWithTheme: false }))
return localStorage.getItem('dsh-codex-sidebar.settings')
