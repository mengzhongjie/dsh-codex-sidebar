/**
 * 预览文本清洗：把一条消息正文压成两行式预览能显示的单行纯文本。
 *
 * 预览节点是 textContent，markdown 渲染不了，留着记号只会让人看到 `**` 和反引号。
 * 规则只做「去记号」：光秃的语法符号一律去掉，成对的强调记号留内容。
 * 单独成文件是为了能脱离页面直接跑测试（没有 DOM 依赖）。
 */

/**
 * @param text - 消息原文（markdown 源码）
 * @returns 去记号、压平空白后的单行文本
 */
export function cleanPreviewText(text) {
  let out = text

  // 围栏代码块：留内容不留外壳
  out = out.replace(/```[^\n]*\n?/g, ' ')
  // 行内代码记号：成对、单个、不配对的都去掉（预览里不需要等宽视觉）
  out = out.replace(/`+/g, '')

  // 图片与链接：留文字不留地址
  out = out.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  // Markdown 允许目标里出现括号（例如带空格的绝对路径写成 <...>），只匹配到成对处为止
  out = out.replace(/\[([^\]]*)\]\(\s*<[^>]*>\s*\)/g, '$1')
  out = out.replace(/\[([^\]]*)\]\(((?:[^()]|\([^()]*\))*)\)/g, '$1')
  // 兜底：链接被截断时可能只剩 "[文字](…"，把尾巴去掉
  out = out.replace(/\[([^\]]*)\]\([^)]*$/g, '$1')
  out = out.replace(/\]\(/g, ' ')
  // 裸自动链接的尖括号外壳
  out = out.replace(/<(https?:\/\/[^>]+)>/g, '$1')

  // 标题、引用、分割线、HTML 注释
  out = out.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '')
  out = out.replace(/^[ \t]{0,3}>[ \t]?/gm, '')
  out = out.replace(/^[ \t]{0,3}([-*_])[ \t]*(\1[ \t]*){2,}$/gm, '')
  out = out.replace(/<!--[\s\S]*?-->/g, ' ')

  // 列表记号与有序序号（行首，容许前置空白）
  out = out.replace(/^[ \t]{0,3}([-*+]|\d{1,3}[.)])[ \t]+/gm, '')

  // 强调：成对的去记号留内容；落单的符号也一并去掉，别留在预览里
  out = out.replace(/\*\*([^*]+)\*\*/g, '$1')
  out = out.replace(/(^|[^\w])__([^_]+)__(?![\w])/g, '$1$2')
  out = out.replace(/~~([^~]+)~~/g, '$1')
  out = out.replace(/(^|[^\w*])\*([^*\s][^*]*)\*(?![\w*])/g, '$1$2')
  out = out.replace(/\*/g, '')
  out = out.replace(/~~/g, '')

  // 表格分隔行（| --- | --- |）整行丢掉，否则只剩一串短横线
  out = out.replace(/^[ \t]*[-:| \t]*\|[ \t:|-]*$/gm, ' ')
  out = out.replace(/^[ \t]*[-:][-: \t]*$/gm, ' ')

  // 表格竖线、换行与连续空白
  out = out.replace(/\|/g, ' ')
  out = out.replace(/[ \t]+/g, ' ')
  out = out.replace(/\s*\n+\s*/g, ' ')
  return out.trim()
}
