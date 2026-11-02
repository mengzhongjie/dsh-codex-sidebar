/**
 * dsh-codex-sidebar 的宿主半边（跑在 DSH 宿主进程里）。
 *
 * 这边只做一件事：把「整体缩放」落到窗口级，而不是页面里的 CSS。
 * 原因（实测）：页面级 CSS zoom / transform 会让宿主 portal 与第三方插件的
 * 坐标空间错位——better-sidebar 的底部面板挂在 body 上、位置由 getBoundingClientRect
 * 算出，一旦把 #root 缩放它就不会跟着放大；把 body/html 缩放又会让账号菜单跑到视口外。
 * Electron 的 page zoom（webContents.setZoomFactor）是浏览器级缩放，布局、fixed 定位、
 * body 上的 portal 全部一致放大，没有坐标换算问题。
 *
 * 网页版（浏览器里跑 dsh web）没有 Electron，客户端会退回 CSS 方案。
 */

/** 插件在 cordis.yml 里的标识。 */
export const name = 'dsh-codex-sidebar'

/** 需要宿主先就绪的服务：HTTP 路由。 */
export const inject = ['webServer']

/** 缩放因子的合法范围，和客户端 constants.js 里的 ZOOM_RANGE 保持一致。 */
const ZOOM_MIN = 0.6
const ZOOM_MAX = 2

/** 懒加载 electron：网页版宿主里没有这个模块，取不到就返回 null。 */
async function loadElectron() {
  try {
    const { createRequire } = await import('node:module')
    const require = createRequire(import.meta.url)
    return require('electron')
  } catch (error) {
    return null
  }
}

/** 写一个 JSON 响应。 */
function writeJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(payload)
}

/** 读请求体（限长，缩放请求只有几十字节）。 */
function readBody(req) {
  return new Promise(resolve => {
    let text = ''
    req.on('data', chunk => {
      text += chunk
      if (text.length > 4096) req.destroy()
    })
    req.on('end', () => resolve(text))
    req.on('error', () => resolve(''))
  })
}

/** 找到当前承载界面的窗口（桌面 App 只有一个主窗口）。 */
function mainWindowOf(electron) {
  const windows = electron.BrowserWindow.getAllWindows()
  return windows[0] ?? null
}

/**
 * 把缩放因子应用到窗口；返回给客户端的结果。
 * 网页版没有 Electron，返回 supported:false，客户端据此走 CSS 兜底。
 */
async function applyZoom(factor) {
  const electron = await loadElectron()
  if (electron === null) return { supported: false, applied: null }
  const window = mainWindowOf(electron)
  if (window === null || window.isDestroyed()) return { supported: false, applied: null }
  const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, factor))
  // 窗口级缩放：Chromium 会重排整个页面，等价于浏览器的 Ctrl+加号。
  window.webContents.setZoomFactor(next)
  return { supported: true, applied: next }
}

/** 读当前窗口缩放。 */
async function currentZoom() {
  const electron = await loadElectron()
  if (electron === null) return { supported: false, factor: null }
  const window = mainWindowOf(electron)
  if (window === null || window.isDestroyed()) return { supported: false, factor: null }
  return { supported: true, factor: window.webContents.getZoomFactor() }
}

/** 路由前缀；客户端用同源相对路径访问。 */
const ROUTE_PREFIX = '/codex-sidebar/api'

export function apply(ctx) {
  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'prefix',
      path: ROUTE_PREFIX,
      handler: async (req, res) => {
        const pathname = new URL(req.url ?? '/', 'http://dsh.internal').pathname
        const method = pathname.slice(ROUTE_PREFIX.length + 1)

        // 读当前窗口缩放：客户端启动时用它决定要不要重新应用自己的偏好。
        if (req.method === 'GET' && method === 'zoom') {
          writeJson(res, 200, await currentZoom())
          return
        }

        if (req.method !== 'POST' || method !== 'zoom') {
          writeJson(res, 404, { ok: false, error: 'not-found' })
          return
        }

        const text = await readBody(req)
        let factor = Number.NaN
        try {
          factor = Number(JSON.parse(text || '{}').factor)
        } catch (error) {
          factor = Number.NaN
        }
        if (!Number.isFinite(factor)) {
          writeJson(res, 400, { ok: false, error: 'bad-factor' })
          return
        }
        writeJson(res, 200, await applyZoom(factor))
      },
    }),
  )
}
