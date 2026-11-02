// 从 verify.mjs 的输出里取出 { result, logs } 并只打印结果（日志另附）
import { readFileSync } from 'node:fs'
const text = readFileSync(process.argv[2], 'utf8')
const start = text.indexOf('{')
const end = text.lastIndexOf('}')
if (start < 0 || end < 0) {
  console.log('NO JSON: ' + text.slice(0, 800))
  process.exit(0)
}
const parsed = JSON.parse(text.slice(start, end + 1))
console.log(JSON.stringify(parsed.result, null, 1))
if (process.argv[3] === '--logs') console.log('LOGS: ' + JSON.stringify(parsed.logs))
