import fs from 'node:fs'
const p = '/Users/apple/.dsh/profiles/desktopmirror/cordis.patch.yml'
let text = fs.readFileSync(p, 'utf8')
const marker = '- id: ui-skin-claude-style\n'
if (!text.includes('- id: ui-skin-claude-style\n  disabled: true')) {
  text = text.replace('- id: ui-skin-claude-style\n', '- id: ui-skin-claude-style\n  disabled: true\n')
  fs.writeFileSync(p, text)
  console.log('theme disabled in mirror')
} else {
  console.log('already disabled')
}
const idx = text.indexOf('- id: ui-skin-claude-style')
console.log(text.slice(idx, idx + 120))
