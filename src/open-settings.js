/**
 * open-settings.js — 让顶行齿轮打开「官方设置页」里的本插件那一页。
 *
 * 宿主没有暴露「打开设置到某一页」的 API，只能按界面自己的路径走：
 *   1) 侧栏底部的账号菜单（[data-slot="settings.launcher"] button）
 *   2) 菜单里的 Settings / 设置
 *   3) 设置页左栏里标签等于本插件页名的 navCell 按钮
 * 任一步找不到就停下（至少把设置页打开），不抛错、不挡住别的功能。
 */

/** 菜单项与导航项的候选选择器。 */
const MENU_ITEM_SELECTOR = '[role="menuitem"], [role="menu"] button'
const NAV_BUTTON_SELECTOR = 'button'

/**
 * 轮询等一个条件成立。
 *
 * 为什么不用 MutationObserver：这里的等待都很短（一两次点击的动画），
 * 轮询 40ms 足够，且不必管观察目标被替换。
 */
function waitFor(pick, timeout = 1500) {
  return new Promise(resolve => {
    const started = Date.now()
    const tick = () => {
      let value = null
      try {
        value = pick()
      } catch {
        value = null
      }
      if (value !== null && value !== undefined) {
        resolve(value)
        return
      }
      if (Date.now() - started > timeout) {
        resolve(null)
        return
      }
      window.setTimeout(tick, 40)
    }
    tick()
  })
}

/**
 * 把一次点击推到当前事件结束之后。
 *
 * 为什么必须推迟：齿轮的 click 现在还在派发中，宿主在 document 上挂着「点别处就关」，
 * 我们同步点开菜单/设置页 → 同一个事件冒泡到 document → 刚打开的面板当场被关掉
 * （真机实测：真实鼠标点齿轮 menus=0、dialogs=0）。setTimeout(0) 让点击落在事件之后。
 */
function clickLater(element) {
  return new Promise(resolve => {
    window.setTimeout(() => {
      element.click()
      resolve()
    }, 0)
  })
}

/** 设置页是否开着：它的左栏导航项类名以 navCell 结尾（宿主构件的稳定片段）。 */
function settingsPageOpen() {
  return [...document.querySelectorAll(NAV_BUTTON_SELECTOR)].some(element =>
    String(element.className).includes('navCell')
  )
}

/** 在已打开的设置页里点开本插件那一页；找不到返回 false。 */
async function jumpToSection(copy) {
  const label = copy.settingsTitle
  const button = await waitFor(() =>
    [...document.querySelectorAll(NAV_BUTTON_SELECTOR)].find(element => {
      const className = typeof element.className === 'string' ? element.className : ''
      return className.includes('navCell') && (element.textContent ?? '').trim() === label
    })
  )
  if (button === null) return false
  await clickLater(button)
  return true
}

/**
 * 打开官方设置页并切到本插件那一页。
 * @param copy - 当前语言文案（页名要与注册时的 label 完全一致）
 * @returns 是否切到了本页
 */
export async function openOfficialSettings(copy) {
  // 设置页可能已经开着：直接跳页，别再点一次账号菜单（那会把面板关掉）。
  // 判据是左栏的导航项，不是「有 dialog」——首次运行的 Preview Notice 也是 dialog。
  if (settingsPageOpen()) return jumpToSection(copy)

  const launcher =
    document.querySelector('[data-slot="settings.launcher"] button') ??
    document.querySelector('[data-slot="settings.launcher"]')
  if (launcher === null) return false
  await clickLater(launcher)

  const item = await waitFor(() =>
    [...document.querySelectorAll(MENU_ITEM_SELECTOR)].find(element =>
      /settings|设置/i.test(element.textContent ?? '')
    )
  )
  if (item === null) return false
  await clickLater(item)

  return jumpToSection(copy)
}
