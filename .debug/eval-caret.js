const sleep = ms => new Promise(r => setTimeout(r, ms));

// 关掉首次运行的 Preview Notice（它也是 dialog，会挡住点击）
const notice = [...document.querySelectorAll('button')].find(b => /continue|继续/i.test(b.textContent || ''));
if (notice) { notice.click(); await sleep(900); }

const out = {};
out.bodyInlineZoom = document.body.style.zoom || '(none)';
out.bodyComputedZoom = getComputedStyle(document.body).zoom;
out.themeZoomAttr = document.body.getAttribute('data-dsh-claude-page-zoom');
out.themeZoomVar = getComputedStyle(document.body).getPropertyValue('--dsh-claude-page-zoom-factor').trim();
out.bodyAttrNames = [...document.body.attributes].map(a => a.name).filter(n => n.startsWith('data-dsh-claude') || n.startsWith('data-codex')).sort();
out.sidebarZoom = (() => { const s = document.querySelector('[data-slot="sidebar"]'); return s ? getComputedStyle(s).zoom : null })();

// 会话页里的输入框：形如 contenteditable 或 textarea
const ed = document.querySelector('[contenteditable="true"]') || document.querySelector('textarea');
out.editorTag = ed ? ed.tagName : null;
if (ed) {
  ed.focus();
  // 写入一段文字，光标落到末尾
  if (ed.tagName === 'TEXTAREA') {
    ed.value = '光标定位测试abc';
    ed.setSelectionRange(ed.value.length, ed.value.length);
    out.editorKind = 'textarea';
  } else {
    ed.textContent = '光标定位测试abc';
    const range = document.createRange();
    range.selectNodeContents(ed);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    out.editorKind = 'contenteditable';
  }
  await sleep(120);
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const caret = sel.getRangeAt(0).cloneRange();
    caret.collapse(false);
    const caretRect = caret.getBoundingClientRect();
    const node = caret.startContainer;
    let charRect = null;
    if (node && node.nodeType === 3 && caret.startOffset > 0) {
      const cr = document.createRange();
      cr.setStart(node, caret.startOffset - 1);
      cr.setEnd(node, caret.startOffset);
      charRect = cr.getBoundingClientRect();
    }
    out.caret = { x: Math.round(caretRect.left), y: Math.round(caretRect.top), h: Math.round(caretRect.height) };
    out.lastChar = charRect ? { right: Math.round(charRect.right), y: Math.round(charRect.top), h: Math.round(charRect.height) } : null;
    out.caretDrift = charRect ? Math.round(caretRect.left - charRect.right) : null;
  }
  const box = ed.getBoundingClientRect();
  out.editorBox = { w: Math.round(box.width), h: Math.round(box.height), fs: getComputedStyle(ed).fontSize };
}
return out;
