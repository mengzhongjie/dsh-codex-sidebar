/**
 * settings-section.js — 嵌进宿主官方设置页的那一页。
 *
 * 宿主把「设置页左侧导航的一项」暴露成 slots 插槽 settings.section（kind=list、scope=root）：
 * 我们自己取一个 id 就多出一页，不会覆盖内置页面。组件由宿主的 React 渲染，
 * react 从工厂的 require 里拿（scripts/build.mjs 里把它标成 external）。
 *
 * 版式对齐官方设置页：内容列已经带左右 24px 内边距，这里只画卡片与行，
 * 卡片 20px 圆角 + 发丝描边，行间 0.5px 分隔线。
 *
 * 装了 dsh-claude-style 时本插件让位：日期排列与页面缩放都由主题负责，
 * 这一页只说明现状，不提供会改动主题界面的开关。
 */
import { createElement as h, useEffect, useState } from 'react'
import { ZOOM_RANGE, ZOOM_STEPS } from './constants.js'
import { readSettings, subscribeSettings, writeSettings } from './settings.js'
import { themePresent } from './coexist.js'

/** 复选框里的对勾：用 SVG，不依赖字体或图标包。 */
function CheckMark() {
  return h(
    'svg',
    { viewBox: '0 0 12 12', fill: 'none', 'aria-hidden': 'true' },
    h('path', {
      d: 'M2.2 6.3 4.7 8.8 9.8 3.4',
      stroke: 'currentColor',
      strokeWidth: '1.8',
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    })
  )
}

/** 开关：轨道 + 圆点，开态取宿主的 business 主色。 */
function Switch({ checked, onChange, label }) {
  return h(
    'button',
    {
      type: 'button',
      role: 'switch',
      'aria-checked': checked,
      'aria-label': label,
      className: checked ? 'codex-sidebar-switch is-on' : 'codex-sidebar-switch',
      onClick: () => onChange(!checked)
    },
    h('span', { className: 'codex-sidebar-switch-thumb' })
  )
}

/** 行左侧的标题 + 说明。 */
function TextBlock({ title, desc }) {
  return h(
    'div',
    { className: 'codex-sidebar-settings-text' },
    h('div', { className: 'codex-sidebar-settings-title' }, title),
    desc ? h('div', { className: 'codex-sidebar-settings-desc' }, desc) : null
  )
}

/** 开关行：左标题说明、右开关。 */
function SwitchRow({ title, desc, checked, onChange }) {
  return h(
    'div',
    { className: 'codex-sidebar-settings-row' },
    h(TextBlock, { title, desc }),
    h(Switch, { checked, onChange, label: title })
  )
}

/**
 * 造出设置页组件。
 *
 * @param hostData    - 宿主数据（工作区标题来自工作区快照）
 * @param localeState - 语言源（见 locale.js 的 createLocale）：宿主语言可能晚就绪，
 *                      这一页要在语言变化后重渲，否则中文 App 里会一直是英文
 * @returns 可直接交给 slots.register 的 React 组件
 */
export function createSettingsSection({ hostData, localeState }) {
  /**
   * 复选框的来源：当前所有工作区标题 ∪ 已被屏蔽的标题。
   * 后者必须保留：工作区被删掉或改名后，用户仍然需要能取消勾选。
   */
  function titlesFor(settings) {
    const titles = new Set()
    try {
      for (const item of hostData.workspaceSnapshot().items ?? []) {
        if (typeof item.title === 'string' && item.title !== '') titles.add(item.title)
      }
    } catch {
      // 快照读不到时只显示已屏蔽项，至少不会丢掉用户的选择。
    }
    for (const title of settings.skipWorkspaces) titles.add(title)
    return [...titles].sort((left, right) => left.localeCompare(right))
  }

  function SettingsSection() {
    const [settings, setSettings] = useState(readSettings)
    const [titles, setTitles] = useState(() => titlesFor(readSettings()))
    // 缩放输入框单独存草稿：直接绑到设置上，手打「1」会被立刻夹到下限。
    const [zoomDraft, setZoomDraft] = useState(() => String(Math.round(readSettings().zoom * 100)))
    // 语言变化时只用来触发重渲：真实文案每次渲染时现取。
    const [, setLanguageTick] = useState(0)
    const copy = localeState.get()

    useEffect(() => {
      // 宿主的语言晚就绪 / 中途切换：重渲一次，文案与导航标签都会跟着变。
      const offLocale = localeState.subscribe(() => setLanguageTick(tick => tick + 1))
      // 设置变化：本页其他行与顶行铃铛都会写设置，这里跟着刷新。
      const offSettings = subscribeSettings(next => {
        setSettings(next)
        setTitles(titlesFor(next))
        setZoomDraft(String(Math.round(next.zoom * 100)))
      })
      // 工作区增删：复选框列表跟着变。
      const offData = hostData.subscribe(() => setTitles(titlesFor(readSettings())))
      return () => {
        offSettings()
        offData()
        offLocale()
      }
    }, [])

    /** 勾选/取消一个工作区（按标题存，和 date-view 的判定一致）。 */
    const toggleSkip = title => {
      const next = new Set(settings.skipWorkspaces)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      writeSettings({ skipWorkspaces: [...next] })
    }

    /** 提交缩放输入框：非法值回填当前值，合法值夹进区间。 */
    const commitZoom = () => {
      const value = Number(zoomDraft)
      if (!Number.isFinite(value) || value <= 0) {
        setZoomDraft(String(Math.round(settings.zoom * 100)))
        return
      }
      const zoom = Math.min(ZOOM_RANGE.max, Math.max(ZOOM_RANGE.min, value / 100))
      writeSettings({ zoom })
      setZoomDraft(String(Math.round(zoom * 100)))
    }

    // 主题检测放在渲染期：用户可能在别的页面停用主题，下次进设置页就能看到开关。
    if (themePresent()) {
      return h(
        'div',
        { className: 'codex-sidebar-settings' },
        h('p', { className: 'codex-sidebar-settings-intro' }, copy.themeNoticeDesc)
      )
    }

    return h(
      'div',
      { className: 'codex-sidebar-settings' },
      h('p', { className: 'codex-sidebar-settings-intro' }, copy.settingsIntro),

      // 卡片一：日期视图开关。
      h(
        'div',
        { className: 'codex-sidebar-settings-card' },
        h(SwitchRow, {
          title: copy.toggleDateView,
          desc: copy.dateViewHint,
          checked: settings.dateViewEnabled,
          onChange: value => writeSettings({ dateViewEnabled: value })
        })
      ),

      // 卡片二：哪些工作区不进入日期视图。
      h(
        'div',
        { className: 'codex-sidebar-settings-card' },
        h(
          'div',
          { className: 'codex-sidebar-settings-heading' },
          h(TextBlock, { title: copy.skipSection, desc: copy.skipHint })
        ),
        h(
          'div',
          { className: 'codex-sidebar-settings-list' },
          titles.length === 0
            ? h('div', { className: 'codex-sidebar-settings-empty' }, copy.emptyWorkspaces)
            : titles.map(title =>
                h(
                  'button',
                  {
                    key: title,
                    type: 'button',
                    role: 'checkbox',
                    'aria-checked': settings.skipWorkspaces.includes(title),
                    className: 'codex-sidebar-settings-check',
                    onClick: () => toggleSkip(title)
                  },
                  h(
                    'span',
                    { className: 'codex-sidebar-check-box' },
                    settings.skipWorkspaces.includes(title) ? h(CheckMark) : null
                  ),
                  h('span', { className: 'codex-sidebar-check-label' }, title)
                )
              )
        )
      ),

      // 卡片三：整体缩放。档位与 dsh-claude-style 的页面缩放一致（80/100/125/150），
      // 另给自定义输入；缩放方式见 constants.js 里的 ZOOM_* 说明。
      h(
        'div',
        { className: 'codex-sidebar-settings-card' },
        h(
          'div',
          { className: 'codex-sidebar-settings-heading' },
          h(TextBlock, { title: copy.zoomSection, desc: copy.zoomHint })
        ),
        h(
          'div',
          { className: 'codex-sidebar-settings-zoom-row' },
          h(
            'div',
            { className: 'codex-sidebar-zoom' },
            h(
              'div',
              { className: 'codex-sidebar-zoom-steps' },
              ZOOM_STEPS.map(step =>
                h(
                  'button',
                  {
                    key: step,
                    type: 'button',
                    className: 'codex-sidebar-zoom-step',
                    'data-selected': Math.abs(settings.zoom - step) < 0.001,
                    onClick: () => writeSettings({ zoom: step })
                  },
                  Math.round(step * 100) + '%'
                )
              )
            ),
            h('input', {
              className: 'codex-sidebar-zoom-input',
              type: 'number',
              min: Math.round(ZOOM_RANGE.min * 100),
              max: Math.round(ZOOM_RANGE.max * 100),
              step: 5,
              'aria-label': copy.zoomCustom,
              title: copy.zoomCustomHint,
              value: zoomDraft,
              onChange: event => setZoomDraft(event.target.value),
              onBlur: commitZoom,
              onKeyDown: event => {
                if (event.key === 'Enter') commitZoom()
              }
            })
          )
        )
      )
    )
  }

  return SettingsSection
}