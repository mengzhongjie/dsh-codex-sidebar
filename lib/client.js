/* dsh-codex-sidebar — 生成物，请改 src/ 后重跑 npm run build */
window.__ModuleLoader__.load({
  id: 'dsh-codex-sidebar',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/entry.js
var entry_exports = {};
__export(entry_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(entry_exports);

// src/constants.js
var PLUGIN_ID = "dsh-codex-sidebar";
var LOG_PREFIX = "[codex-sidebar]";
var BODY_ATTR = "data-codex-sidebar";
var DATE_MODE_ATTR = "data-codex-sidebar-date-view";
var SETTINGS_KEY = "dsh-codex-sidebar.settings";
var GROUP_BACKUP_KEY = "dsh-codex-sidebar.group-before-date-view";
var DEFAULT_SETTINGS = {
  // 默认不进日期视图：保持宿主原本的工作区视图，按下顶行铃铛才切换。
  dateViewEnabled: false,
  skipWorkspaces: ["\u95F2\u804A"],
  zoom: 1
};
var ZOOM_STEPS = [0.8, 1, 1.25, 1.5];
var ZOOM_RANGE = { min: 0.6, max: 2 };
var ZOOM_ATTR = "data-codex-sidebar-page-zoom";
var ZOOM_VAR = "--codex-sidebar-page-zoom-factor";
var ZOOM_WIDTH_VAR = "--codex-sidebar-page-width";
var ZOOM_HEIGHT_VAR = "--codex-sidebar-page-height";
var SIDEBAR_SELECTOR = '[data-slot="sidebar"]';
var SESSION_ROW_SELECTOR = '[data-row-key^="session:"]';
var SESSION_KEY_PREFIX = "session:";
var TOGGLE_LABELS = ["collapse sidebar", "expand sidebar", "\u6536\u8D77\u4FA7\u8FB9\u680F", "\u6253\u5F00\u4FA7\u8FB9\u680F"];
var OWN_ATTR = "data-codex-sidebar-owned";

// src/settings.js
var listeners = /* @__PURE__ */ new Set();
function normalize(raw) {
  const source = raw !== null && typeof raw === "object" ? raw : {};
  const skip = Array.isArray(source.skipWorkspaces) ? source.skipWorkspaces.filter((item) => typeof item === "string" && item.trim() !== "") : DEFAULT_SETTINGS.skipWorkspaces.slice();
  const zoomValue = typeof source.zoom === "number" && Number.isFinite(source.zoom) ? source.zoom : DEFAULT_SETTINGS.zoom;
  return {
    dateViewEnabled: typeof source.dateViewEnabled === "boolean" ? source.dateViewEnabled : DEFAULT_SETTINGS.dateViewEnabled,
    skipWorkspaces: skip,
    // 缩放夹在合法区间内：手填 0 或 10 会把界面搞坏。
    zoom: Math.min(ZOOM_RANGE.max, Math.max(ZOOM_RANGE.min, zoomValue))
  };
}
function readSettings() {
  try {
    return normalize(JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "null"));
  } catch {
    return normalize(null);
  }
}
function writeSettings(patch) {
  const next = normalize({ ...readSettings(), ...patch });
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
  }
  for (const listener of listeners) listener(next);
  return next;
}
function subscribeSettings(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// src/host-data.js
function peek(ctx, serviceName) {
  try {
    return ctx.get(serviceName);
  } catch {
    return void 0;
  }
}
function createHostData(ctx) {
  const sessions = peek(ctx, "sessions");
  const workspaces = peek(ctx, "workspaces");
  return {
    /** 会话快照；宿主还没同步完时可能 ids 为空。 */
    sessionSnapshot() {
      try {
        return sessions?.list?.getSnapshot?.() ?? { ids: [], byId: {} };
      } catch {
        return { ids: [], byId: {} };
      }
    },
    /** 工作区快照。 */
    workspaceSnapshot() {
      try {
        return workspaces?.list?.getSnapshot?.() ?? { items: [] };
      } catch {
        return { items: [] };
      }
    },
    /** 是否有会话正在运行：铃铛只亮一个点，不写条数。 */
    hasRunningSession() {
      const snapshot = this.sessionSnapshot();
      return (snapshot.ids ?? []).some((id) => snapshot.byId?.[id]?.running === true);
    },
    /** 会话 id → 工作区标题；未分组会话不在映射里。 */
    workspaceTitleBySession() {
      const titles = /* @__PURE__ */ new Map();
      for (const item of this.workspaceSnapshot().items ?? []) {
        for (const sessionId of item.sessionIds ?? []) {
          const title = typeof item.title === "string" ? item.title : "";
          titles.set(sessionId, title);
        }
      }
      return titles;
    },
    /** 订阅两份数据的任何变化，返回取消函数。 */
    subscribe(listener) {
      const offs = [];
      for (const source of [sessions?.list, workspaces?.list]) {
        try {
          const off = source?.subscribe?.(() => listener());
          if (typeof off === "function") offs.push(off);
        } catch {
        }
      }
      return () => {
        for (const off of offs) {
          try {
            off();
          } catch {
          }
        }
      };
    }
  };
}

// src/locale.js
var LABELS = {
  zh: {
    today: "\u4ECA\u5929",
    yesterday: "\u6628\u5929",
    earlier: "\u66F4\u65E9",
    weekdays: ["\u661F\u671F\u65E5", "\u661F\u671F\u4E00", "\u661F\u671F\u4E8C", "\u661F\u671F\u4E09", "\u661F\u671F\u56DB", "\u661F\u671F\u4E94", "\u661F\u671F\u516D"],
    untitled: "\u672A\u547D\u540D",
    skipped: "\u4E0D\u8FDB\u5165\u65E5\u671F\u89C6\u56FE",
    settingsTitle: "\u4FA7\u680F\u8BBE\u7F6E",
    toggleDateView: "\u65E5\u671F\u89C6\u56FE",
    skipSection: "\u4E0D\u8FDB\u5165\u65E5\u671F\u89C6\u56FE\u7684\u5DE5\u4F5C\u533A",
    zoomSection: "\u6574\u4F53\u7F29\u653E",
    zoomCustom: "\u81EA\u5B9A\u4E49\u500D\u7387",
    zoomHint: "\u7F29\u653E\u6574\u4E2A\u754C\u9762\uFF0C\u542B\u4FA7\u680F\u4E0E\u5BF9\u8BDD\u533A\u3002\u6309\u7A97\u53E3\u5C3A\u5BF8\u6362\u7B97\uFF0C\u548C Claude Style \u7684\u9875\u9762\u7F29\u653E\u540C\u4E00\u5957\u505A\u6CD5\u3002",
    zoomSystem: "100%",
    zoomCustomHint: "\u53EF\u76F4\u63A5\u586B 60\u2013200 \u4E4B\u95F4\u7684\u6570\u5B57\uFF0C\u56DE\u8F66\u751F\u6548\u3002",
    // 设置页（官方设置页里的一页）
    settingsIntro: "\u4FA7\u680F\u6309\u65E5\u671F\u6392\u5217\u3001\u5DE5\u4F5C\u533A\u5C4F\u853D\u4E0E\u6574\u4F53\u7F29\u653E\u3002\u6539\u52A8\u5373\u65F6\u751F\u6548\u3002",
    dateViewHint: "\u6309\u4ECA\u5929 / \u6628\u5929 / \u661F\u671F\u51E0 / \u66F4\u65E9\u5206\u6BB5\u6392\u5217\u4F1A\u8BDD\uFF0C\u70B9\u9876\u884C\u94C3\u94DB\u968F\u65F6\u5207\u6362\u3002",
    skipHint: "\u52FE\u9009\u7684\u5DE5\u4F5C\u533A\u91CC\u7684\u4F1A\u8BDD\u4E0D\u4F1A\u51FA\u73B0\u5728\u65E5\u671F\u89C6\u56FE\uFF0C\u5DE5\u4F5C\u533A\u89C6\u56FE\u4E0D\u53D7\u5F71\u54CD\u3002",
    emptyWorkspaces: "\u8FD8\u6CA1\u6709\u5DE5\u4F5C\u533A",
    // 装了 dsh-claude-style 时的说明（本插件让位，不改主题界面）
    themeNoticeDesc: "\u68C0\u6D4B\u5230 dsh-claude-style\uFF1A\u4FA7\u680F\u7684\u65E5\u671F\u6392\u5217\u4E0E\u9875\u9762\u7F29\u653E\u90FD\u7531\u4E3B\u9898\u8D1F\u8D23\uFF0C\u672C\u63D2\u4EF6\u4E0D\u4FEE\u6539\u4E3B\u9898\u7684\u754C\u9762\u3002\u505C\u7528\u4E3B\u9898\u540E\uFF0C\u672C\u63D2\u4EF6\u4F1A\u81EA\u52A8\u63A5\u7BA1\u65E5\u671F\u89C6\u56FE\u4E0E\u7F29\u653E\u3002"
  },
  en: {
    today: "Today",
    yesterday: "Yesterday",
    earlier: "Earlier",
    weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    untitled: "Untitled",
    skipped: "Hidden from date view",
    settingsTitle: "Sidebar settings",
    toggleDateView: "Date view",
    skipSection: "Workspaces hidden from date view",
    zoomSection: "Zoom",
    zoomCustom: "Custom zoom",
    zoomHint: "Scales the whole interface, sidebar and conversation included. Uses the same page-scale approach as Claude Style.",
    zoomSystem: "100%",
    zoomCustomHint: "Type a percentage between 60 and 200, then press Enter.",
    settingsIntro: "Date grouping for the sidebar, hidden workspaces, and page zoom. Changes apply immediately.",
    dateViewHint: "Groups sessions into Today / Yesterday / weekday / Earlier. Toggle from the bell at the top of the sidebar.",
    skipHint: "Sessions in checked workspaces are left out of the date view. The workspace view is unaffected.",
    emptyWorkspaces: "No workspaces yet",
    themeNoticeDesc: "dsh-claude-style is installed: it provides the sidebar date grouping and page zoom, and this plugin does not modify its UI. Disable the theme and this plugin takes over both."
  }
};
function languageOf(text) {
  return String(text ?? "").toLowerCase().startsWith("zh") ? "zh" : "en";
}
function localeFromService(service) {
  if (service === null || service === void 0) return "";
  const fields = ["active", "locale", "language", "lang", "current", "code", "resolved", "id"];
  for (const field of fields) {
    const value = service[field];
    if (typeof value === "string" && value !== "") return value;
  }
  try {
    const snapshot = typeof service.getSnapshot === "function" ? service.getSnapshot() : service.snapshot;
    if (snapshot !== null && typeof snapshot === "object") {
      for (const field of fields) {
        const value = snapshot[field];
        if (typeof value === "string" && value !== "") return value;
      }
    }
  } catch {
  }
  return "";
}
function hostLocaleText(ctx) {
  try {
    return localeFromService(ctx?.get?.("locale"));
  } catch {
    return "";
  }
}
function resolveLocale(ctx) {
  const fromHost = hostLocaleText(ctx);
  if (fromHost !== "") return languageOf(fromHost);
  const fromDocument = document.documentElement.lang;
  if (typeof fromDocument === "string" && fromDocument !== "") return languageOf(fromDocument);
  return languageOf(navigator.language);
}
function labelsFor(locale) {
  return locale === "zh" ? LABELS.zh : LABELS.en;
}
function localeServiceOf(ctx) {
  try {
    const service = ctx?.get?.("locale");
    return service === null || service === void 0 ? null : service;
  } catch {
    return null;
  }
}
function createLocale(ctx) {
  let language = resolveLocale(ctx);
  let labels = labelsFor(language);
  let raw = hostLocaleText(ctx);
  const listeners2 = /* @__PURE__ */ new Set();
  let timer = 0;
  let attempts = 0;
  let offService = null;
  function stop() {
    if (timer !== 0) {
      window.clearInterval(timer);
      timer = 0;
    }
  }
  function refresh() {
    const nextRaw = hostLocaleText(ctx);
    const next = resolveLocale(ctx);
    if (nextRaw !== "") raw = nextRaw;
    if (next === language) return false;
    language = next;
    labels = labelsFor(next);
    for (const listener of listeners2) {
      try {
        listener(language, labels);
      } catch {
      }
    }
    return true;
  }
  function bindService() {
    if (offService !== null) return true;
    const service = localeServiceOf(ctx);
    if (service === null || typeof service.subscribe !== "function") return false;
    try {
      const off = service.subscribe(() => refresh());
      offService = typeof off === "function" ? off : () => {
      };
      return true;
    } catch {
      return false;
    }
  }
  function tick() {
    attempts += 1;
    const bound = bindService();
    refresh();
    if (bound && raw !== "" || attempts >= 60) stop();
  }
  function scheduleTick() {
    timer = window.setTimeout(() => {
      timer = 0;
      tick();
      if (timer === 0 && attempts < 60) scheduleTick();
    }, 500);
  }
  if (bindService()) refresh();
  scheduleTick();
  return {
    /** 当前用词表（调用时顺手刷新一次，切换语言后立刻生效）。 */
    get() {
      refresh();
      return labels;
    },
    /** 当前语言。 */
    language() {
      refresh();
      return language;
    },
    /** 宿主 locale 服务报的原始串（没有就是空串）。 */
    raw() {
      refresh();
      return raw;
    },
    /** 订阅语言变化；返回取消函数。 */
    subscribe(listener) {
      listeners2.add(listener);
      return () => listeners2.delete(listener);
    },
    /** 停掉轮询与宿主订阅，清空订阅者。 */
    dispose() {
      stop();
      if (offService !== null) {
        try {
          offService();
        } catch {
        }
        offService = null;
      }
      listeners2.clear();
    }
  };
}

// src/coexist.js
var THEME_MARKERS = ["data-dsh-claude", "dsh-claude-", "dshClaude"];
function themePresent() {
  for (const attribute of [...document.body.attributes]) {
    if (THEME_MARKERS.some((marker) => attribute.name.startsWith(marker))) return true;
  }
  for (const marker of ["dsh-claude-", "dshClaude"]) {
    if (document.querySelector(`[class*="${marker}"]`) !== null) return true;
  }
  return false;
}

// src/view-store.js
function isUsableViewStore(instance) {
  return instance !== null && typeof instance?.getSnapshot === "function" && typeof instance?.actions?.setGroupBy === "function";
}
function createViewStore(ctx) {
  let cached = null;
  function resolve() {
    if (cached !== null) return cached;
    const slots = (() => {
      try {
        return ctx.get("slots");
      } catch {
        return void 0;
      }
    })();
    const entries = slots?.entries?.("sidebar.workspaces") ?? [];
    const instance = entries[0]?.store?.create?.() ?? null;
    if (isUsableViewStore(instance)) cached = instance;
    return cached;
  }
  return {
    resolve,
    /** 当前分组方式（'workspace' | 'flat' | ...）。 */
    groupBy() {
      return resolve()?.getSnapshot?.()?.groupBy ?? null;
    },
    /** 当前归档筛选（'default' | 'only' | 'show'）。 */
    archivedFilter() {
      return resolve()?.getSnapshot?.()?.archivedFilter ?? "default";
    },
    /**
     * 切到扁平列表，并备份原来的分组方式。
     * 备份写进 localStorage：进程被杀后下次启动还能自愈回原分组。
     */
    flatten() {
      const instance = resolve();
      if (instance === null) return false;
      const previous = instance.getSnapshot?.()?.groupBy;
      if (typeof previous !== "string") return false;
      if (previous !== "flat") {
        try {
          window.localStorage.setItem(GROUP_BACKUP_KEY, previous);
        } catch {
        }
      }
      if (previous !== "flat") instance.actions.setGroupBy("flat");
      return true;
    },
    /** 还原分组方式：优先用本次会话记录的，其次用磁盘备份。 */
    restore(previous) {
      const instance = resolve();
      if (instance === null) return;
      let target = typeof previous === "string" ? previous : null;
      if (target === null) {
        try {
          target = window.localStorage.getItem(GROUP_BACKUP_KEY);
        } catch {
          target = null;
        }
      }
      if (target === null || target === "flat") target = "workspace";
      if (instance.getSnapshot?.()?.groupBy !== target) instance.actions.setGroupBy(target);
    },
    /** 清掉磁盘备份（成功还原后调用）。 */
    forgetBackup() {
      try {
        window.localStorage.removeItem(GROUP_BACKUP_KEY);
      } catch {
      }
    },
    /** 上次进程被杀时留下的扁平状态。 */
    leftoverBackup() {
      try {
        return window.localStorage.getItem(GROUP_BACKUP_KEY);
      } catch {
        return null;
      }
    }
  };
}

// src/sidebar-dom.js
function findSidebar() {
  return document.querySelector(SIDEBAR_SELECTOR);
}
function findToggle(sidebar) {
  const root = sidebar ?? findSidebar();
  if (root === null) return null;
  const wanted = TOGGLE_LABELS.map((label) => label.toLowerCase());
  for (const button of root.querySelectorAll("button")) {
    const label = (button.getAttribute("aria-label") ?? "").toLowerCase();
    if (wanted.includes(label)) return button;
  }
  return null;
}
function findLogoRow(sidebar) {
  const toggle = findToggle(sidebar);
  return toggle?.parentElement ?? null;
}
function findFlatList(sidebar) {
  const root = sidebar ?? findSidebar();
  if (root === null) return null;
  for (const node of root.querySelectorAll("div")) {
    const className = typeof node.className === "string" ? node.className : "";
    if (className.includes("flatList")) return node;
  }
  const seat = document.querySelector(SESSION_ROW_SELECTOR)?.parentElement;
  return seat?.parentElement ?? null;
}
function collectSeats(container) {
  if (container === null) return [];
  return [...container.children].filter((child) => {
    if (child.hasAttribute?.(OWN_ATTR)) return false;
    return child.querySelector?.(SESSION_ROW_SELECTOR) !== null;
  });
}
function rowOfSeat(seat) {
  return seat.querySelector?.(SESSION_ROW_SELECTOR) ?? null;
}
function sessionIdOfRow(row) {
  const key = row?.getAttribute?.("data-row-key") ?? "";
  return key.startsWith(SESSION_KEY_PREFIX) ? key.slice(SESSION_KEY_PREFIX.length) : "";
}

// src/date-view.js
var DAY_MS = 864e5;
var CHIP_CLASS = "codex-sidebar-chip";
function daysBetween(then, now) {
  const from = new Date(then);
  const to = new Date(now);
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / DAY_MS);
}
function bucketOf(updatedAt, now, copy) {
  const day = daysBetween(updatedAt, now);
  if (day <= 0) return { text: copy.today, rank: 0 };
  if (day === 1) return { text: copy.yesterday, rank: 1 };
  if (day < 7) return { text: copy.weekdays[new Date(updatedAt).getDay()], rank: day };
  return { text: copy.earlier, rank: 7 };
}
function createHeader(text) {
  const header = document.createElement("div");
  header.className = "codex-sidebar-date-header";
  header.setAttribute(OWN_ATTR, "");
  header.textContent = text;
  return header;
}
function createDateView({ hostData, viewStore, locale, refreshBell, prepareEnable, afterDisable }) {
  const readCopy = () => labelsFor(typeof locale === "function" ? locale() : locale);
  let active = false;
  let previousGroupBy = null;
  const hiddenSeats = /* @__PURE__ */ new Set();
  const headers = /* @__PURE__ */ new Set();
  const chips = /* @__PURE__ */ new Set();
  let applying = false;
  let frameHandle = 0;
  function isActive() {
    return active;
  }
  function dressRow(row, workspace) {
    if (row === null) return;
    let chip = row.querySelector(`:scope > .${CHIP_CLASS}`);
    if (chip === null) {
      chip = document.createElement("span");
      chip.className = CHIP_CLASS;
      chip.setAttribute(OWN_ATTR, "");
      const actions = [...row.children].find((child) => {
        const className = typeof child.className === "string" ? child.className : "";
        return className.endsWith("_rowActions");
      });
      if (actions !== null && actions !== void 0) row.insertBefore(chip, actions);
      else row.appendChild(chip);
      chips.add(chip);
    }
    if (chip.textContent !== workspace) chip.textContent = workspace;
  }
  function stripChips() {
    for (const chip of chips) chip.remove();
    chips.clear();
  }
  function arrange() {
    if (!active || applying) return;
    const container = findFlatList(findSidebar());
    if (container === null) return;
    applying = true;
    try {
      const copy = readCopy();
      const settings = readSettings();
      const skip = new Set(settings.skipWorkspaces);
      const titles = hostData.workspaceTitleBySession();
      const sessions = hostData.sessionSnapshot();
      const now = Date.now();
      const visible = [];
      const nextHidden = /* @__PURE__ */ new Set();
      for (const seat of collectSeats(container)) {
        const row = rowOfSeat(seat);
        const sessionId = sessionIdOfRow(row);
        const workspace = titles.get(sessionId) ?? "";
        if (sessionId === "" || workspace === "" || skip.has(workspace)) {
          nextHidden.add(seat);
          continue;
        }
        const state = sessions.byId?.[sessionId];
        const updatedAt = state?.updatedAt;
        const time = typeof updatedAt === "number" ? updatedAt : 0;
        const running = state?.running === true;
        const bucket = running ? { text: copy.today, rank: 0 } : bucketOf(time, now, copy);
        seat.style.display = "";
        visible.push({ seat, row, time, running, bucket, workspace });
      }
      for (const seat of hiddenSeats) {
        if (!nextHidden.has(seat)) seat.style.display = "";
      }
      for (const seat of nextHidden) seat.style.display = "none";
      hiddenSeats.clear();
      for (const seat of nextHidden) hiddenSeats.add(seat);
      visible.sort((left, right) => left.bucket.rank - right.bucket.rank || Number(right.running) - Number(left.running) || right.time - left.time);
      for (const item of visible) dressRow(item.row, item.workspace);
      const nodes = [];
      let lastText = null;
      for (const item of visible) {
        if (item.bucket.text !== lastText) {
          nodes.push(createHeader(item.bucket.text));
          lastText = item.bucket.text;
        }
        nodes.push(item.seat);
      }
      const current = [...container.children];
      const sameOrder = current.length === nodes.length && nodes.every((node, index) => current[index] === node);
      if (sameOrder) {
        for (const header of [...headers]) {
          if (header.parentElement !== container) headers.delete(header);
        }
        for (const node of nodes) {
          if (node.getAttribute?.(OWN_ATTR) !== null) headers.add(node);
        }
        return;
      }
      for (const header of headers) {
        if (header.parentElement === container) header.remove();
      }
      headers.clear();
      for (const node of nodes) container.appendChild(node);
      for (const node of nodes) {
        if (node.getAttribute?.(OWN_ATTR) !== null) headers.add(node);
      }
    } finally {
      applying = false;
    }
  }
  function schedule() {
    if (!active || frameHandle !== 0) return;
    frameHandle = window.requestAnimationFrame(() => {
      frameHandle = 0;
      arrange();
    });
  }
  function enable() {
    if (active) return;
    if (viewStore.archivedFilter() !== "default") return;
    previousGroupBy = viewStore.groupBy();
    prepareEnable?.();
    if (!viewStore.flatten()) {
      afterDisable?.();
      return;
    }
    active = true;
    document.body.setAttribute(DATE_MODE_ATTR, "");
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => schedule()));
    refreshBell?.();
  }
  function disable() {
    if (!active) return;
    active = false;
    document.body.removeAttribute(DATE_MODE_ATTR);
    for (const header of headers) header.remove();
    headers.clear();
    stripChips();
    for (const seat of hiddenSeats) seat.style.display = "";
    hiddenSeats.clear();
    viewStore.restore(previousGroupBy);
    viewStore.forgetBackup();
    previousGroupBy = null;
    afterDisable?.();
    refreshBell?.();
  }
  function toggle() {
    if (active) disable();
    else enable();
  }
  return { isActive, enable, disable, toggle, schedule, arrange };
}

// src/settings-section.js
var import_react = require("react");
function CheckMark() {
  return (0, import_react.createElement)(
    "svg",
    { viewBox: "0 0 12 12", fill: "none", "aria-hidden": "true" },
    (0, import_react.createElement)("path", {
      d: "M2.2 6.3 4.7 8.8 9.8 3.4",
      stroke: "currentColor",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    })
  );
}
function Switch({ checked, onChange, label }) {
  return (0, import_react.createElement)(
    "button",
    {
      type: "button",
      role: "switch",
      "aria-checked": checked,
      "aria-label": label,
      className: checked ? "codex-sidebar-switch is-on" : "codex-sidebar-switch",
      onClick: () => onChange(!checked)
    },
    (0, import_react.createElement)("span", { className: "codex-sidebar-switch-thumb" })
  );
}
function TextBlock({ title, desc }) {
  return (0, import_react.createElement)(
    "div",
    { className: "codex-sidebar-settings-text" },
    (0, import_react.createElement)("div", { className: "codex-sidebar-settings-title" }, title),
    desc ? (0, import_react.createElement)("div", { className: "codex-sidebar-settings-desc" }, desc) : null
  );
}
function SwitchRow({ title, desc, checked, onChange }) {
  return (0, import_react.createElement)(
    "div",
    { className: "codex-sidebar-settings-row" },
    (0, import_react.createElement)(TextBlock, { title, desc }),
    (0, import_react.createElement)(Switch, { checked, onChange, label: title })
  );
}
function createSettingsSection({ hostData, localeState }) {
  function titlesFor(settings) {
    const titles = /* @__PURE__ */ new Set();
    try {
      for (const item of hostData.workspaceSnapshot().items ?? []) {
        if (typeof item.title === "string" && item.title !== "") titles.add(item.title);
      }
    } catch {
    }
    for (const title of settings.skipWorkspaces) titles.add(title);
    return [...titles].sort((left, right) => left.localeCompare(right));
  }
  function SettingsSection() {
    const [settings, setSettings] = (0, import_react.useState)(readSettings);
    const [titles, setTitles] = (0, import_react.useState)(() => titlesFor(readSettings()));
    const [zoomDraft, setZoomDraft] = (0, import_react.useState)(() => String(Math.round(readSettings().zoom * 100)));
    const [, setLanguageTick] = (0, import_react.useState)(0);
    const copy = localeState.get();
    (0, import_react.useEffect)(() => {
      const offLocale = localeState.subscribe(() => setLanguageTick((tick) => tick + 1));
      const offSettings = subscribeSettings((next) => {
        setSettings(next);
        setTitles(titlesFor(next));
        setZoomDraft(String(Math.round(next.zoom * 100)));
      });
      const offData = hostData.subscribe(() => setTitles(titlesFor(readSettings())));
      return () => {
        offSettings();
        offData();
        offLocale();
      };
    }, []);
    const toggleSkip = (title) => {
      const next = new Set(settings.skipWorkspaces);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      writeSettings({ skipWorkspaces: [...next] });
    };
    const commitZoom = () => {
      const value = Number(zoomDraft);
      if (!Number.isFinite(value) || value <= 0) {
        setZoomDraft(String(Math.round(settings.zoom * 100)));
        return;
      }
      const zoom = Math.min(ZOOM_RANGE.max, Math.max(ZOOM_RANGE.min, value / 100));
      writeSettings({ zoom });
      setZoomDraft(String(Math.round(zoom * 100)));
    };
    if (themePresent()) {
      return (0, import_react.createElement)(
        "div",
        { className: "codex-sidebar-settings" },
        (0, import_react.createElement)("p", { className: "codex-sidebar-settings-intro" }, copy.themeNoticeDesc)
      );
    }
    return (0, import_react.createElement)(
      "div",
      { className: "codex-sidebar-settings" },
      (0, import_react.createElement)("p", { className: "codex-sidebar-settings-intro" }, copy.settingsIntro),
      // 卡片一：日期视图开关。
      (0, import_react.createElement)(
        "div",
        { className: "codex-sidebar-settings-card" },
        (0, import_react.createElement)(SwitchRow, {
          title: copy.toggleDateView,
          desc: copy.dateViewHint,
          checked: settings.dateViewEnabled,
          onChange: (value) => writeSettings({ dateViewEnabled: value })
        })
      ),
      // 卡片二：哪些工作区不进入日期视图。
      (0, import_react.createElement)(
        "div",
        { className: "codex-sidebar-settings-card" },
        (0, import_react.createElement)(
          "div",
          { className: "codex-sidebar-settings-heading" },
          (0, import_react.createElement)(TextBlock, { title: copy.skipSection, desc: copy.skipHint })
        ),
        (0, import_react.createElement)(
          "div",
          { className: "codex-sidebar-settings-list" },
          titles.length === 0 ? (0, import_react.createElement)("div", { className: "codex-sidebar-settings-empty" }, copy.emptyWorkspaces) : titles.map(
            (title) => (0, import_react.createElement)(
              "button",
              {
                key: title,
                type: "button",
                role: "checkbox",
                "aria-checked": settings.skipWorkspaces.includes(title),
                className: "codex-sidebar-settings-check",
                onClick: () => toggleSkip(title)
              },
              (0, import_react.createElement)(
                "span",
                { className: "codex-sidebar-check-box" },
                settings.skipWorkspaces.includes(title) ? (0, import_react.createElement)(CheckMark) : null
              ),
              (0, import_react.createElement)("span", { className: "codex-sidebar-check-label" }, title)
            )
          )
        )
      ),
      // 卡片三：整体缩放。档位与 dsh-claude-style 的页面缩放一致（80/100/125/150），
      // 另给自定义输入；缩放方式见 constants.js 里的 ZOOM_* 说明。
      (0, import_react.createElement)(
        "div",
        { className: "codex-sidebar-settings-card" },
        (0, import_react.createElement)(
          "div",
          { className: "codex-sidebar-settings-heading" },
          (0, import_react.createElement)(TextBlock, { title: copy.zoomSection, desc: copy.zoomHint })
        ),
        (0, import_react.createElement)(
          "div",
          { className: "codex-sidebar-settings-zoom-row" },
          (0, import_react.createElement)(
            "div",
            { className: "codex-sidebar-zoom" },
            (0, import_react.createElement)(
              "div",
              { className: "codex-sidebar-zoom-steps" },
              ZOOM_STEPS.map(
                (step) => (0, import_react.createElement)(
                  "button",
                  {
                    key: step,
                    type: "button",
                    className: "codex-sidebar-zoom-step",
                    "data-selected": Math.abs(settings.zoom - step) < 1e-3,
                    onClick: () => writeSettings({ zoom: step })
                  },
                  Math.round(step * 100) + "%"
                )
              )
            ),
            (0, import_react.createElement)("input", {
              className: "codex-sidebar-zoom-input",
              type: "number",
              min: Math.round(ZOOM_RANGE.min * 100),
              max: Math.round(ZOOM_RANGE.max * 100),
              step: 5,
              "aria-label": copy.zoomCustom,
              title: copy.zoomCustomHint,
              value: zoomDraft,
              onChange: (event) => setZoomDraft(event.target.value),
              onBlur: commitZoom,
              onKeyDown: (event) => {
                if (event.key === "Enter") commitZoom();
              }
            })
          )
        )
      )
    );
  }
  return SettingsSection;
}

// src/open-settings.js
var MENU_ITEM_SELECTOR = '[role="menuitem"], [role="menu"] button';
var NAV_BUTTON_SELECTOR = "button";
function waitFor(pick, timeout = 1500) {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      let value = null;
      try {
        value = pick();
      } catch {
        value = null;
      }
      if (value !== null && value !== void 0) {
        resolve(value);
        return;
      }
      if (Date.now() - started > timeout) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, 40);
    };
    tick();
  });
}
function settingsPageOpen() {
  return [...document.querySelectorAll(NAV_BUTTON_SELECTOR)].some(
    (element) => String(element.className).includes("navCell")
  );
}
async function jumpToSection(copy) {
  const label = copy.settingsTitle;
  const button = await waitFor(
    () => [...document.querySelectorAll(NAV_BUTTON_SELECTOR)].find((element) => {
      const className = typeof element.className === "string" ? element.className : "";
      return className.includes("navCell") && (element.textContent ?? "").trim() === label;
    })
  );
  if (button === null) return false;
  button.click();
  return true;
}
async function openOfficialSettings(copy) {
  if (settingsPageOpen()) return jumpToSection(copy);
  const launcher = document.querySelector('[data-slot="settings.launcher"] button') ?? document.querySelector('[data-slot="settings.launcher"]');
  if (launcher === null) return false;
  launcher.click();
  const item = await waitFor(
    () => [...document.querySelectorAll(MENU_ITEM_SELECTOR)].find(
      (element) => /settings|设置/i.test(element.textContent ?? "")
    )
  );
  if (item === null) return false;
  item.click();
  return jumpToSection(copy);
}

// src/topbar.js
var BELL_SVG = `<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.9 6.6a4.1 4.1 0 0 1 8.2 0c0 2 .5 3.2 1.1 4 .3.4 0 .9-.5.9H3.3c-.5 0-.8-.5-.5-.9.6-.8 1.1-2 1.1-4Z"/><path d="M6.4 13.2a1.8 1.8 0 0 0 3.2 0"/></svg>`;
var GEAR_SVG = `<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="1.9"/><path d="M8 1.9v1.6M8 12.5v1.6M2.6 8h1.5M11.9 8h1.5M3.9 3.9l1.1 1.1M11 11l1.1 1.1M12.1 3.9 11 5M5 11l-1.1 1.1"/></svg>`;
function createIconButton(label, svg) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "codex-sidebar-icon-button";
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
  button.setAttribute(OWN_ATTR, "");
  button.innerHTML = svg;
  return button;
}
function createTopbar({ dateView, openSettings, hostData, onToggle, getLabels, showBell = true }) {
  let actions = null;
  let bell = null;
  let gear = null;
  let dot = null;
  let bellWanted = showBell;
  function refreshBell() {
    if (bell === null) return;
    bell.setAttribute("aria-pressed", dateView.isActive() ? "true" : "false");
    const running = hostData.hasRunningSession();
    if (running && dot === null) {
      dot = document.createElement("span");
      dot.className = "codex-sidebar-dot";
      dot.setAttribute(OWN_ATTR, "");
      bell.appendChild(dot);
    } else if (!running && dot !== null) {
      dot.remove();
      dot = null;
    }
  }
  function createBell() {
    const button = createIconButton(getLabels().toggleDateView, BELL_SVG);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      dateView.toggle();
      onToggle?.(dateView.isActive());
      refreshBell();
    });
    return button;
  }
  function applyBellVisibility() {
    if (actions === null) return;
    if (bellWanted && bell === null) {
      bell = createBell();
      actions.insertBefore(bell, actions.firstElementChild);
      refreshBell();
    } else if (!bellWanted && bell !== null) {
      bell.remove();
      bell = null;
      dot = null;
    }
  }
  function setShowBell(next) {
    bellWanted = next === true;
    applyBellVisibility();
  }
  function mount() {
    const sidebar = findSidebar();
    if (sidebar === null) return false;
    const logoRow = findLogoRow(sidebar);
    const toggle = findToggle(sidebar);
    if (logoRow === null || toggle === null) return false;
    const brand = logoRow.querySelector('button[class*="brand"]');
    if (brand === null) {
      unmount();
      return false;
    }
    if (actions !== null && actions.parentElement === logoRow) return true;
    actions = document.createElement("div");
    actions.className = "codex-sidebar-actions";
    actions.setAttribute(OWN_ATTR, "");
    gear = createIconButton(getLabels().settingsTitle, GEAR_SVG);
    gear.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openSettings();
    });
    actions.append(gear);
    logoRow.insertBefore(actions, toggle);
    bell = null;
    dot = null;
    applyBellVisibility();
    refreshBell();
    return true;
  }
  function refreshLabels() {
    const next = getLabels();
    if (bell !== null) {
      bell.setAttribute("aria-label", next.toggleDateView);
      bell.setAttribute("title", next.toggleDateView);
    }
    if (gear !== null) {
      gear.setAttribute("aria-label", next.settingsTitle);
      gear.setAttribute("title", next.settingsTitle);
    }
  }
  function unmount() {
    actions?.remove();
    actions = null;
    bell = null;
    gear = null;
    dot = null;
  }
  return { mount, unmount, refreshBell, refreshLabels, setShowBell };
}

// src/styles.js
var CSS = `
/*
 * \u6574\u9875\u7F29\u653E\uFF08\u7167 dsh-claude-style \u7684\u505A\u6CD5\uFF0C\u8BF4\u660E\u89C1 constants.js \u7684 ZOOM_* \u6CE8\u91CA\uFF09\u3002
 *
 * \u53EA\u6302\u5728\u672C\u63D2\u4EF6\u81EA\u5DF1\u7684\u6807\u8BB0\u4E0A\uFF1A\u6709\u4E3B\u9898\u65F6\u6211\u4EEC\u6839\u672C\u4E0D\u5199 data-codex-sidebar-page-zoom\uFF0C
 * \u6240\u4EE5\u4E0D\u4F1A\u548C\u4E3B\u9898\u7684 body[data-dsh-claude-page-zoom] \u89C4\u5219\u540C\u65F6\u7ED9 body \u4E0A zoom\u3002
 * \u500D\u7387\u8D70\u81EA\u5B9A\u4E49\u5C5E\u6027\uFF1B\u975E 100% \u65F6 body \u6309\u300C\u7A97\u53E3\u5C3A\u5BF8 / \u500D\u7387\u300D\u5B9A\u5BBD\u9AD8\u5E76\u88C1\u6389\u6EDA\u52A8\uFF0C
 * \u5426\u5219 vh/vw \u4F1A\u518D\u4E58\u4E00\u6B21\u500D\u7387\uFF0C\u9875\u9762\u5E95\u90E8\u4F1A\u591A\u51FA\u4E00\u6761\u7A7A\u767D\u5E26\u3002
 * \u6CE8\u610F\uFF1A\u8FD9\u91CC\u7EDD\u4E0D\u5199\u884C\u5185 zoom \u2014\u2014 \u884C\u5185\u6837\u5F0F\u4F1A\u628A\u4E3B\u9898\u7684 pageZoom \u6574\u6761\u76D6\u6389\u3002
 */
body[data-codex-sidebar][data-codex-sidebar-page-zoom] {
  zoom: var(--codex-sidebar-page-zoom-factor, 1);
}

body[data-codex-sidebar][data-codex-sidebar-page-zoom]:not([data-codex-sidebar-page-zoom="1"]) {
  width: var(--codex-sidebar-page-width, 100%);
  height: var(--codex-sidebar-page-height, 100%);
  overflow: hidden;
  margin: 0;
}

html:has(body[data-codex-sidebar][data-codex-sidebar-page-zoom]:not([data-codex-sidebar-page-zoom="1"])) {
  padding: 0;
  overflow: hidden;
}

/* \u5BBF\u4E3B\u5F39\u5C42\u6309\u89C6\u53E3\u5355\u4F4D\u5C01\u9876\uFF0C\u7F29\u653E\u540E\u4F1A\u88AB\u653E\u5927\u4E00\u6B21\uFF0C\u6240\u4EE5\u6539\u7528\u9875\u9762\u81EA\u8EAB\u5C3A\u5BF8\u5C01\u9876\u3002 */
body[data-codex-sidebar] :is(dialog, [role="dialog"]) {
  max-width: calc(var(--codex-sidebar-page-width, 100vw) - 48px);
  max-height: calc(var(--codex-sidebar-page-height, 100vh) - 48px);
}

/*
 * \u9876\u884C\u52A8\u4F5C\u533A\uFF1A\u94C3\u94DB\u4E0E\u9F7F\u8F6E\uFF0C\u7D27\u8D34\u5BBF\u4E3B\u539F\u6709\u7684\u6298\u53E0\u6309\u94AE\u3002
 * gap \u4E0E\u5BBF\u4E3B\u9876\u884C\u6309\u94AE\u95F4\u8DDD\u4E00\u81F4\uFF082px\uFF09\uFF0C\u4E0D\u989D\u5916\u6491\u9AD8 logoRow\u3002
 */
.codex-sidebar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
}

/*
 * \u56FE\u6807\u6309\u94AE\uFF1A\u51E0\u4F55\u5C3A\u5BF8\u5BF9\u9F50\u5BBF\u4E3B\u9876\u884C\u539F\u751F\u7684 28\xD728 / radius 8px\u3002
 * \u989C\u8272\u53D6\u5BBF\u4E3B\u7684\u6B21\u7EA7\u6587\u5B57\u8272\uFF08\u539F\u751F\u6298\u53E0\u6309\u94AE\u5C31\u662F rgb(97,102,107)\uFF09\uFF0C
 * \u60AC\u505C\u80CC\u666F\u53D6\u5BBF\u4E3B\u7684 interactive-bg-hover\uFF0C\u6DF1\u6D45\u8272\u90FD\u7531 token \u51B3\u5B9A\u3002
 */
.codex-sidebar-icon-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-sm, 8px);
  background: transparent;
  color: var(--dsw-alias-label-primary-dimmed, light-dark(rgb(97, 102, 107), rgb(160, 165, 172)));
  cursor: pointer;
  transition: color 120ms ease, background-color 120ms ease;
}

.codex-sidebar-icon-button:hover {
  color: var(--dsw-alias-label-primary, light-dark(rgb(15, 17, 21), rgb(236, 237, 240)));
  background: var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, currentColor 10%, transparent));
}

.codex-sidebar-icon-button:focus-visible {
  outline: 2px solid var(--dsw-alias-border-l4, color-mix(in srgb, currentColor 45%, transparent));
  outline-offset: 1px;
}

/* \u65E5\u671F\u89C6\u56FE\u5F00\u542F\u65F6\u94C3\u94DB\u5E38\u4EAE\uFF1A\u7528\u7425\u73C0\u8272\u4F5C\u552F\u4E00\u5F3A\u8C03\u8272\uFF0C\u6DF1\u6D45\u8272\u5404\u53D6\u4E00\u6863 */
.codex-sidebar-icon-button[aria-pressed="true"] {
  color: var(--codex-sidebar-accent, light-dark(#a9720f, #f0b429));
}

/* \u6709\u4F1A\u8BDD\u5728\u8DD1\u65F6\u4EAE\u4E00\u4E2A\u70B9\uFF0C\u4E0D\u5199\u6570\u5B57 */
.codex-sidebar-dot {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--dsw-alias-state-success-primary, #35c76a);
  box-shadow: 0 0 0 2px var(--dsw-alias-bg-layer-1, light-dark(#fff, #1b1b1e));
}

/*
 * \u65E5\u671F\u6BB5\u843D\u6807\u9898\u3002
 * \u5BBF\u4E3B\u539F\u751F\u5206\u7EC4\u6807\u7B7E\u662F 14px/400 \u7070\u5B57\u3001\u6587\u5B57\u8D77\u70B9 x=16\uFF1B\u6BB5\u843D\u6807\u9898\u8981\u66F4\u5F31\u4E00\u4E9B\uFF0C
 * \u6240\u4EE5\u7528 12px/600\u3001\u5BBF\u4E3B\u6B21\u7EA7\u6587\u5B57\u8272 + 55% \u4E0D\u900F\u660E\uFF0C\u5DE6\u5185\u8FB9\u8DDD\u4E0E\u884C\u5185\u5BB9\u5BF9\u9F50\uFF088\uFF09\uFF0C\u4E0D\u518D\u591A\u7F29\u8FDB 6px\u3002
 */
.codex-sidebar-date-header {
  padding: 10px 4px 4px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.02em;
  color: var(--dsw-alias-label-primary, inherit);
  opacity: 0.55;
  user-select: none;
}

/* \u65E5\u671F\u89C6\u56FE\u4E0B\u884C\u5185\u7684\u5DE5\u4F5C\u533A\u6807\u7B7E\uFF1A\u6241\u5E73\u540E\u6CA1\u6709\u5206\u7EC4\u6807\u9898\uFF0C\u9760\u5B83\u56DE\u5FC6\u5F52\u5C5E */
.codex-sidebar-chip {
  margin-left: auto;
  flex: 0 1 auto;
  min-width: 0;
  max-width: 40%;
  padding: 1px 5px;
  border-radius: var(--dsw-radius-sm, 8px);
  background: var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, currentColor 7%, transparent));
  font-size: 10px;
  line-height: 1.4;
  letter-spacing: 0;
  opacity: 0.6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
}

/*
 * \u65E5\u671F\u89C6\u56FE\u91CC\u9690\u85CF\u5BBF\u4E3B\u81EA\u5E26\u7684\u76F8\u5BF9\u65F6\u95F4\uFF088min / 1d\uFF09\u3002
 * \u6BB5\u843D\u6807\u9898\u5DF2\u7ECF\u8BF4\u660E\u300C\u54EA\u4E00\u5929\u300D\uFF0C\u6807\u7B7E\u8BF4\u660E\u300C\u54EA\u4E2A\u5DE5\u4F5C\u533A\u300D\uFF0C\u4E24\u6837\u90FD\u8981\u6807\u9898\u53CD\u800C\u88AB\u6324\u6210\u7701\u7565\u53F7\u3002
 * \u53EA\u547D\u4E2D\u4F1A\u8BDD\u884C\u91CC\u90A3\u4E00\u4E2A span\uFF0C\u522B\u52A8\u5176\u4ED6\u5730\u65B9\u3002
 */
[data-codex-sidebar-date-view] [data-row-key^="session:"] > span[class*="_time"] {
  display: none;
}

/*
 * \u63A5\u7BA1\u6A21\u5F0F\uFF1A\u85CF\u6389 dsh-claude-style \u81EA\u5DF1\u7684\u65E5\u671F\u94C3\u94DB\u3002
 * \u53EA\u85CF\u5B83\u90A3\u4E00\u4E2A trigger \u6309\u94AE\uFF08\u641C\u7D22\u6309\u94AE\u4E0E\u5176\u5B83\u52A8\u4F5C\u4E0D\u52A8\uFF09\uFF0C\u4E3B\u9898\u5378\u8F7D\u540E\u8FD9\u6761\u89C4\u5219\u81EA\u7136\u5931\u6548\u3002
 */
[data-codex-sidebar-takeover] .dsh-claude-active-shelf-actions button[class*="active-shelf-trigger"] {
  display: none !important;
}

/*
 * \u8BBE\u7F6E\u9875\uFF1A\u4F5C\u4E3A section \u4F4F\u8FDB\u5B98\u65B9\u8BBE\u7F6E\u9875\u7684\u5185\u5BB9\u5217\u3002
 * \u5185\u5BB9\u5217\u81EA\u5DF1\u5E26\u5DE6\u53F3 24px \u5185\u8FB9\u8DDD\uFF0C\u8FD9\u91CC\u53EA\u6392\u5361\u7247\u4E0E\u884C\uFF0C\u4E0D\u518D\u52A0\u5916\u8FB9\u8DDD\u3002
 * \u89C2\u611F\u5BF9\u9F50\u5B98\u65B9\u300C\u8D26\u53F7\u4E0E\u4F59\u989D\u300D\u9875\uFF1A20px \u5706\u89D2\u5361\u7247\u30011px \u63CF\u8FB9\u30012px/16px \u5185\u8FB9\u8DDD\uFF0C\u884C\u95F4\u53D1\u4E1D\u7EBF\u3002
 */
.codex-sidebar-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
  color: var(--dsw-alias-label-primary, inherit);
  font-size: 14px;
}

.codex-sidebar-settings-intro {
  margin: 0 0 4px;
  font-size: 13px;
  line-height: 1.6;
  opacity: 0.65;
}

.codex-sidebar-settings-card {
  display: flex;
  flex-direction: column;
  padding: 2px 16px;
  border: 1px solid var(--dsw-alias-border-l2, light-dark(rgba(0, 0, 0, 0.12), rgba(255, 255, 255, 0.14)));
  border-radius: 20px;
  background: var(--dsw-alias-bg-layer-1, light-dark(#fff, #1c1d20));
}

/* \u884C\uFF1A\u5B98\u65B9\u8BBE\u7F6E\u9875\u7684\u884C\u662F 16px \u4E0A\u4E0B\u3001\u6807\u9898\u8BF4\u660E\u5728\u5DE6\u3001\u63A7\u4EF6\u5728\u53F3 */
.codex-sidebar-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 14px 0;
}

/* \u884C\u95F4\u53D1\u4E1D\u7EBF\uFF1A\u7B2C\u4E00\u884C\u4E0D\u7559\u7EBF */
.codex-sidebar-settings-row + .codex-sidebar-settings-row {
  border-top: 0.5px solid var(--dsw-alias-border-l2, light-dark(rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.12)));
}

.codex-sidebar-settings-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.codex-sidebar-settings-title {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
}

.codex-sidebar-settings-desc {
  font-size: 12px;
  line-height: 1.5;
  opacity: 0.6;
}

/* \u5361\u7247\u5185\u7684\u5206\u533A\u6807\u9898\uFF08\u590D\u9009\u6846\u3001\u7F29\u653E\u8FD9\u7C7B\u81EA\u5E26\u5217\u8868\u7684\u5757\uFF09 */
.codex-sidebar-settings-heading {
  display: flex;
  flex-direction: column;
  padding: 14px 0 2px;
}

.codex-sidebar-settings-heading .codex-sidebar-settings-title {
  font-weight: 600;
}

/* \u5F00\u5173\uFF1A40\xD722 \u8F68\u9053 + 18px \u5706\u70B9\uFF0C\u5F00\u6001\u53D6\u5BBF\u4E3B business \u4E3B\u8272 */
.codex-sidebar-switch {
  position: relative;
  flex: 0 0 auto;
  width: 40px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--dsw-alias-state-idle-primary, light-dark(#d4d4d4, #4a4d55));
  cursor: pointer;
  transition: background-color 140ms ease;
}

.codex-sidebar-switch.is-on {
  background: var(--dsw-alias-state-business-primary, #4176e6);
}

.codex-sidebar-switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--dsw-alias-switch-thumb, #fff);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  transition: transform 140ms ease;
}

.codex-sidebar-switch.is-on .codex-sidebar-switch-thumb {
  transform: translateX(18px);
}

.codex-sidebar-switch:focus-visible {
  outline: 2px solid var(--dsw-alias-border-l4, color-mix(in srgb, currentColor 45%, transparent));
  outline-offset: 2px;
}

/* \u5DE5\u4F5C\u533A\u52FE\u9009\u5217\u8868\uFF1A\u6700\u9AD8 260px\uFF0C\u8D85\u51FA\u6EDA\u52A8\uFF0C\u4E0D\u628A\u6574\u9875\u6491\u957F */
.codex-sidebar-settings-list {
  display: flex;
  flex-direction: column;
  padding: 2px 0 6px;
  max-height: 260px;
  overflow-y: auto;
}

.codex-sidebar-settings-check {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  border-radius: var(--dsw-radius-sm, 8px);
}

.codex-sidebar-settings-check:hover {
  background: var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, currentColor 7%, transparent));
}

.codex-sidebar-check-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid var(--dsw-alias-border-l4, color-mix(in srgb, currentColor 30%, transparent));
  color: #fff;
}

.codex-sidebar-settings-check[aria-checked="true"] .codex-sidebar-check-box {
  border-color: transparent;
  background: var(--dsw-alias-state-business-primary, #4176e6);
}

.codex-sidebar-check-box svg {
  width: 11px;
  height: 11px;
}

.codex-sidebar-check-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.codex-sidebar-settings-empty {
  padding: 4px 0 8px;
  font-size: 13px;
  opacity: 0.55;
}

/* \u7F29\u653E\u63A7\u4EF6\u884C\uFF1A\u8DDF\u5728\u6807\u9898\u8BF4\u660E\u4E0B\u65B9\uFF0C\u5DE6\u5BF9\u9F50\uFF0C\u7A84\u7A97\u53E3\u65F6\u6362\u884C */
.codex-sidebar-settings-zoom-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 2px 0 16px;
}

/* \u7F29\u653E\uFF1A\u56DB\u6863\u6309\u94AE + \u81EA\u5B9A\u4E49\u8F93\u5165\u6846\uFF0C\u6A2A\u5411\u6392\u4E00\u884C */
.codex-sidebar-zoom {
  display: flex;
  align-items: center;
  gap: 8px;
}

.codex-sidebar-zoom-steps {
  display: flex;
  gap: 4px;
}

.codex-sidebar-zoom-step {
  min-width: 48px;
  padding: 5px 8px;
  border-radius: var(--dsw-radius-sm, 8px);
  border: 1px solid var(--dsw-alias-border-l2, color-mix(in srgb, currentColor 18%, transparent));
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
}

.codex-sidebar-zoom-step:hover {
  background: var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, currentColor 10%, transparent));
}

.codex-sidebar-zoom-step[data-selected="true"] {
  border-color: var(--dsw-alias-label-primary, currentColor);
  font-weight: 600;
}

.codex-sidebar-zoom-input {
  width: 62px;
  padding: 5px 8px;
  border-radius: var(--dsw-radius-sm, 8px);
  border: 1px solid var(--dsw-alias-border-l2, color-mix(in srgb, currentColor 18%, transparent));
  background: transparent;
  color: inherit;
  font-size: 12px;
}

/* \u7F29\u653E\u63A7\u4EF6\u884C\uFF1A\u8DDF\u5728\u6807\u9898\u8BF4\u660E\u4E0B\u65B9\uFF0C\u5DE6\u5BF9\u9F50\uFF0C\u7A84\u7A97\u53E3\u65F6\u6362\u884C */
.codex-sidebar-settings-zoom-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 2px 0 16px;
}

/* \u7F29\u653E\uFF1A\u4E94\u6863\u6309\u94AE + \u81EA\u5B9A\u4E49\u8F93\u5165\u6846\uFF0C\u7EB5\u5411\u5C45\u4E2D\u6210\u4E00\u6392 */
.codex-sidebar-zoom {
  display: flex;
  align-items: center;
  gap: 8px;
}

.codex-sidebar-zoom-steps {
  display: flex;
  gap: 4px;
}

.codex-sidebar-zoom-step {
  min-width: 48px;
  padding: 5px 8px;
  border-radius: var(--dsw-radius-sm, 8px);
  border: 1px solid var(--dsw-alias-border-l2, color-mix(in srgb, currentColor 18%, transparent));
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
}

.codex-sidebar-zoom-step:hover {
  background: var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, currentColor 10%, transparent));
}

.codex-sidebar-zoom-step[data-selected="true"] {
  border-color: var(--dsw-alias-label-primary, currentColor);
  font-weight: 600;
}

.codex-sidebar-zoom-input {
  width: 62px;
  padding: 5px 8px;
  border-radius: var(--dsw-radius-sm, 8px);
  border: 1px solid var(--dsw-alias-border-l2, color-mix(in srgb, currentColor 18%, transparent));
  background: transparent;
  color: inherit;
  font-size: 12px;
}
`;
function mountStyles() {
  const tag = document.createElement("style");
  tag.setAttribute("data-codex-sidebar-owned", "");
  tag.textContent = CSS;
  document.head.appendChild(tag);
  return () => tag.remove();
}

// src/entry.js
var name = PLUGIN_ID;
var inject = ["slots"];
function writePageSize(factor) {
  document.body.style.setProperty(ZOOM_WIDTH_VAR, `${Math.round(window.innerWidth / factor)}px`);
  document.body.style.setProperty(ZOOM_HEIGHT_VAR, `${Math.round(window.innerHeight / factor)}px`);
}
function applyZoom(zoom, enabled) {
  const body = document.body;
  const factor = Math.round(zoom * 100) / 100;
  if (!enabled || Math.abs(factor - 1) < 1e-3) {
    body.removeAttribute(ZOOM_ATTR);
    body.style.removeProperty(ZOOM_VAR);
    body.style.removeProperty(ZOOM_WIDTH_VAR);
    body.style.removeProperty(ZOOM_HEIGHT_VAR);
    return;
  }
  body.style.setProperty(ZOOM_VAR, String(factor));
  body.setAttribute(ZOOM_ATTR, String(factor));
  writePageSize(factor);
}
function registerSettingsSection(ctx, { hostData, localeState, disposers }) {
  const slots = ctx.slots ?? (typeof ctx.get === "function" ? ctx.get("slots") : void 0);
  if (slots === void 0 || slots === null || typeof slots.inject !== "function" || typeof slots.register !== "function") {
    console.warn(`${LOG_PREFIX} \u5BBF\u4E3B\u6CA1\u6709 slots \u670D\u52A1\uFF0C\u8DF3\u8FC7\u8BBE\u7F6E\u9875\u6CE8\u518C`);
    return;
  }
  const SettingsSection = createSettingsSection({ hostData, localeState });
  try {
    const dispose = slots.inject(
      "settings.section",
      () => slots.register(
        {
          name: "settings.section",
          // 自取 id：与内置页面并排，而不是替换它们。
          id: "codex-sidebar",
          // 排在「Agent 预设」(20) 与 Claude Style(22) 之后。
          order: 24,
          // 每次投影重读：宿主语言晚就绪或中途切换时，导航标签跟着变。
          label: () => localeState.get().settingsTitle
        },
        SettingsSection
      )
    );
    if (typeof dispose === "function") disposers.push(dispose);
  } catch (error) {
    console.warn(`${LOG_PREFIX} \u6CE8\u518C\u8BBE\u7F6E\u9875\u5931\u8D25`, error);
  }
}
function apply(ctx) {
  try {
    applyUnsafe(ctx);
  } catch (error) {
    console.error(`${LOG_PREFIX} \u542F\u52A8\u5931\u8D25`, error);
  }
}
function applyUnsafe(ctx) {
  document.body.setAttribute(BODY_ATTR, "");
  const disposers = [];
  disposers.push(mountStyles());
  const localeState = createLocale(ctx);
  disposers.push(() => localeState.dispose());
  const hostData = createHostData(ctx);
  const viewStore = createViewStore(ctx);
  let topbar = null;
  let mode = null;
  const dateView = createDateView({
    hostData,
    viewStore,
    // 传函数：每次重排都重新问当前语言，切换语言后标题文字立即跟上。
    locale: () => localeState.language(),
    refreshBell: () => topbar?.refreshBell()
  });
  registerSettingsSection(ctx, { hostData, localeState, disposers });
  topbar = createTopbar({
    dateView,
    hostData,
    getLabels: () => localeState.get(),
    onToggle: (active) => writeSettings({ dateViewEnabled: active }),
    // 齿轮：打开官方设置页并切到本插件那一页。
    openSettings: () => {
      openOfficialSettings(localeState.get()).catch(() => {
      });
    }
  });
  let reconciling = false;
  function setMode(next) {
    if (mode === next) return;
    mode = next;
    topbar?.setShowBell(next !== "dormant");
  }
  function healLeftoverFlat() {
    const leftover = viewStore.leftoverBackup();
    if (leftover === null) return;
    if (viewStore.groupBy() === "flat") {
      viewStore.restore(leftover);
      console.log(`${LOG_PREFIX} \u81EA\u6108\uFF1A\u8FD8\u539F\u5206\u7EC4\u65B9\u5F0F ${leftover}`);
    }
    viewStore.forgetBackup();
  }
  function reconcile() {
    if (reconciling) return;
    reconciling = true;
    try {
      const settings = readSettings();
      const next = themePresent() ? "dormant" : "solo";
      setMode(next);
      applyZoom(settings.zoom, next === "solo");
      if (next === "dormant") {
        if (dateView.isActive()) dateView.disable();
        if (settings.dateViewEnabled) writeSettings({ dateViewEnabled: false });
        return;
      }
      if (settings.dateViewEnabled && !dateView.isActive()) dateView.enable();
      if (!settings.dateViewEnabled && dateView.isActive()) dateView.disable();
    } finally {
      reconciling = false;
    }
  }
  let frameHandle = 0;
  function schedule() {
    if (frameHandle !== 0) return;
    frameHandle = window.requestAnimationFrame(() => {
      frameHandle = 0;
      if (!dateView.isActive()) topbar.mount();
      reconcile();
      dateView.schedule();
    });
  }
  const observer = new MutationObserver(() => schedule());
  observer.observe(document.body, { childList: true, subtree: true });
  const onResize = () => {
    if (document.body.hasAttribute(ZOOM_ATTR)) writePageSize(readSettings().zoom);
  };
  window.addEventListener("resize", onResize);
  disposers.push(() => window.removeEventListener("resize", onResize));
  disposers.push(hostData.subscribe(() => {
    topbar?.refreshBell();
    dateView.schedule();
  }));
  disposers.push(subscribeSettings((settings) => {
    reconcile();
    applyZoom(settings.zoom, mode === "solo");
    dateView.schedule();
  }));
  const boot = window.setInterval(() => {
    if (findSidebar() === null) return;
    window.clearInterval(boot);
    reconcile();
    if (mode !== "dormant") healLeftoverFlat();
    topbar.mount();
    schedule();
  }, 200);
  ctx.effect(() => () => {
    window.clearInterval(boot);
    observer.disconnect();
    if (frameHandle !== 0) window.cancelAnimationFrame(frameHandle);
    dateView.disable();
    topbar.unmount();
    applyZoom(1, false);
    document.body.removeAttribute(BODY_ATTR);
    document.body.removeAttribute(DATE_MODE_ATTR);
    for (const dispose of disposers) {
      try {
        dispose();
      } catch {
      }
    }
  });
  disposers.push(localeState.subscribe((next, nextLabels) => {
    console.log(`${LOG_PREFIX} locale \u2192 ${next} (${nextLabels.today})`);
    topbar?.refreshLabels();
    dateView.schedule();
  }));
  const hostLocale = localeState.raw();
  console.log(`${LOG_PREFIX} applied (${localeState.language()}${hostLocale ? `, host ${hostLocale}` : ""})`);
}

    return module.exports
  },
})
