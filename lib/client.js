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
var BELL_ATTR = "data-codex-sidebar-bell";
var SETTINGS_KEY = "dsh-codex-sidebar.settings";
var GROUP_BACKUP_KEY = "dsh-codex-sidebar.group-before-date-view";
var DEFAULT_SETTINGS = {
  // 默认不进日期视图：保持宿主原本的工作区视图，按下顶行铃铛才切换。
  dateViewEnabled: false,
  skipWorkspaces: ["\u95F2\u804A"],
  zoom: 1
};
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

// src/preview-text.js
function cleanPreviewText(text) {
  let out = text;
  out = out.replace(/```[^\n]*\n?/g, " ");
  out = out.replace(/`+/g, "");
  out = out.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  out = out.replace(/\[([^\]]*)\]\(\s*<[^>]*>\s*\)/g, "$1");
  out = out.replace(/\[([^\]]*)\]\(((?:[^()]|\([^()]*\))*)\)/g, "$1");
  out = out.replace(/\[([^\]]*)\]\([^)]*$/g, "$1");
  out = out.replace(/\]\(/g, " ");
  out = out.replace(/<(https?:\/\/[^>]+)>/g, "$1");
  out = out.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "");
  out = out.replace(/^[ \t]{0,3}>[ \t]?/gm, "");
  out = out.replace(/^[ \t]{0,3}([-*_])[ \t]*(\1[ \t]*){2,}$/gm, "");
  out = out.replace(/<!--[\s\S]*?-->/g, " ");
  out = out.replace(/^[ \t]{0,3}([-*+]|\d{1,3}[.)])[ \t]+/gm, "");
  out = out.replace(/\*\*([^*]+)\*\*/g, "$1");
  out = out.replace(/(^|[^\w])__([^_]+)__(?![\w])/g, "$1$2");
  out = out.replace(/~~([^~]+)~~/g, "$1");
  out = out.replace(/(^|[^\w*])\*([^*\s][^*]*)\*(?![\w*])/g, "$1$2");
  out = out.replace(/\*/g, "");
  out = out.replace(/~~/g, "");
  out = out.replace(/^[ \t]*[-:| \t]*\|[ \t:|-]*$/gm, " ");
  out = out.replace(/^[ \t]*[-:][-: \t]*$/gm, " ");
  out = out.replace(/\|/g, " ");
  out = out.replace(/[ \t]+/g, " ");
  out = out.replace(/\s*\n+\s*/g, " ");
  return out.trim();
}

// src/host-data.js
function peek(ctx, serviceName) {
  try {
    return ctx.get(serviceName);
  } catch {
    return void 0;
  }
}
var SUBSCRIBE_RETRY_MS = 500;
function createHostData(ctx) {
  const sessionsList = () => peek(ctx, "sessions")?.list;
  const workspacesList = () => peek(ctx, "workspaces")?.list;
  return {
    /** 会话快照；宿主还没同步完时可能 ids 为空。 */
    sessionSnapshot() {
      try {
        return sessionsList()?.getSnapshot?.() ?? { ids: [], byId: {} };
      } catch {
        return { ids: [], byId: {} };
      }
    },
    /** 工作区快照。 */
    workspaceSnapshot() {
      try {
        return workspacesList()?.getSnapshot?.() ?? { items: [] };
      } catch {
        return { items: [] };
      }
    },
    /** 宿主服务是否已经就绪（两个都在才算）。 */
    ready() {
      return sessionsList() !== void 0 && workspacesList() !== void 0;
    },
    /** 是否有会话正在运行：铃铛只亮一个点，不写条数。 */
    hasRunningSession() {
      const snapshot = this.sessionSnapshot();
      return (snapshot.ids ?? []).some((id) => snapshot.byId?.[id]?.running === true);
    },
    /**
     * 会话 id → 最新一条消息的预览文本。
     *
     * 数据来自 sessions 快照里的投影 projectionsBySession[id].values.turnOutline：
     * 每轮一个 { turn, seq, prompt, response }，response 是该轮助手的最终回复。
     * 用快照而不是按会话拉历史——侧栏一次要画几十行，逐会话请求代价太高，
     * 而这份投影宿主本来就已经同步到客户端了。
     * 最新一轮 response 为空（正在跑 / 被中断）时退回用 prompt，保证每行都有字。
     */
    /**
     * 会话 id → 最新一条消息的预览文本。
     *
     * 预览是单行纯文本，渲染不了 markdown，所以这里先把记号去掉：星号、井号、
     * 反引号、引用符、列表序号、表格竖线、链接外壳都不该出现在两行式预览里。
     */
    previewBySession() {
      const previews = /* @__PURE__ */ new Map();
      const snapshot = this.sessionSnapshot();
      const projections = snapshot.projectionsBySession ?? {};
      for (const id of snapshot.ids ?? []) {
        const values = projections[id]?.values;
        const outline = values?.turnOutline;
        if (!Array.isArray(outline) || outline.length === 0) continue;
        const last = outline[outline.length - 1] ?? {};
        const response = typeof last.response === "string" ? last.response.trim() : "";
        const prompt = typeof last.prompt === "string" ? last.prompt.trim() : "";
        const text = cleanPreviewText(response !== "" ? response : prompt);
        if (text !== "") previews.set(id, text);
      }
      return previews;
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
    /**
     * 订阅两份数据的任何变化，返回取消函数。
     *
     * 服务可能还没注册：先试一次，剩下的交给 500ms 轮询补齐（上限 60 秒）。
     * 两个数据源都订阅上之后轮询自动停。
     */
    subscribe(listener) {
      const offs = [];
      const subscribed = /* @__PURE__ */ new Set();
      let timer = 0;
      let stopped = false;
      const attempt = () => {
        for (const source of [sessionsList(), workspacesList()]) {
          if (source === void 0 || source === null || subscribed.has(source)) continue;
          try {
            const off = source.subscribe?.(() => listener());
            if (typeof off === "function") {
              subscribed.add(source);
              offs.push(off);
            }
          } catch {
          }
        }
      };
      const allSubscribed = () => subscribed.size >= 2;
      attempt();
      if (!allSubscribed()) {
        timer = window.setInterval(() => {
          if (stopped) return;
          attempt();
          if (allSubscribed() && timer !== 0) {
            window.clearInterval(timer);
            timer = 0;
          }
        }, SUBSCRIBE_RETRY_MS);
      }
      return () => {
        stopped = true;
        if (timer !== 0) window.clearInterval(timer);
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
    // 第一段装的是「正在跑的会话 + 今天的会话」，用户要的名字是「优先级」：
    // 活跃会话被强制提到这一段最前，它才是这段的主语。
    today: "\u4F18\u5148\u7EA7",
    yesterday: "\u6628\u5929",
    earlier: "\u66F4\u65E9",
    weekdays: ["\u661F\u671F\u65E5", "\u661F\u671F\u4E00", "\u661F\u671F\u4E8C", "\u661F\u671F\u4E09", "\u661F\u671F\u56DB", "\u661F\u671F\u4E94", "\u661F\u671F\u516D"],
    untitled: "\u672A\u547D\u540D",
    skipped: "\u4E0D\u8FDB\u5165\u6D88\u606F\u89C6\u56FE",
    // 未归入任何工作区的会话在消息视图里的标签
    ungrouped: "\u672A\u5206\u7EC4",
    settingsTitle: "\u4FA7\u680F\u8BBE\u7F6E",
    toggleDateView: "\u6D88\u606F\u89C6\u56FE",
    skipSection: "\u4E0D\u8FDB\u5165\u6D88\u606F\u89C6\u56FE\u7684\u5DE5\u4F5C\u533A",
    zoomSection: "\u6574\u4F53\u7F29\u653E",
    zoomCustom: "\u81EA\u5B9A\u4E49\u500D\u7387",
    zoomHint: "\u7F29\u653E\u6574\u4E2A\u754C\u9762\uFF0C\u542B\u4FA7\u680F\u4E0E\u5BF9\u8BDD\u533A\u3002\u6309\u7A97\u53E3\u5C3A\u5BF8\u6362\u7B97\uFF0C\u548C Claude Style \u7684\u9875\u9762\u7F29\u653E\u540C\u4E00\u5957\u505A\u6CD5\u3002",
    zoomSystem: "100%",
    zoomCustomHint: "\u53EF\u76F4\u63A5\u586B 60\u2013200 \u4E4B\u95F4\u7684\u6570\u5B57\uFF0C\u56DE\u8F66\u751F\u6548\u3002",
    // 设置页（官方设置页里的一页）
    settingsIntro: "\u4FA7\u680F\u6309\u6D88\u606F\u5206\u6BB5\u6392\u5217\u3001\u5DE5\u4F5C\u533A\u5C4F\u853D\u3002\u6539\u52A8\u5373\u65F6\u751F\u6548\u3002",
    dateViewHint: "\u6309\u4F18\u5148\u7EA7 / \u6628\u5929 / \u661F\u671F\u51E0 / \u66F4\u65E9\u5206\u6BB5\u6392\u5217\u4F1A\u8BDD\uFF0C\u70B9\u9876\u884C\u94C3\u94DB\u968F\u65F6\u5207\u6362\u3002",
    skipHint: "\u52FE\u9009\u7684\u5DE5\u4F5C\u533A\u91CC\u7684\u4F1A\u8BDD\u4E0D\u4F1A\u51FA\u73B0\u5728\u6D88\u606F\u89C6\u56FE\uFF0C\u5DE5\u4F5C\u533A\u89C6\u56FE\u4E0D\u53D7\u5F71\u54CD\u3002",
    emptyWorkspaces: "\u8FD8\u6CA1\u6709\u5DE5\u4F5C\u533A",
    // 装了 dsh-claude-style 时的说明（本插件让位，不改主题界面）
    themeNoticeDesc: "\u68C0\u6D4B\u5230 dsh-claude-style\uFF1A\u4FA7\u680F\u7684\u65E5\u671F\u6392\u5217\u4E0E\u9875\u9762\u7F29\u653E\u90FD\u7531\u4E3B\u9898\u8D1F\u8D23\uFF0C\u672C\u63D2\u4EF6\u4E0D\u4FEE\u6539\u4E3B\u9898\u7684\u754C\u9762\u3002\u505C\u7528\u4E3B\u9898\u540E\uFF0C\u672C\u63D2\u4EF6\u4F1A\u81EA\u52A8\u63A5\u7BA1\u65E5\u671F\u89C6\u56FE\u4E0E\u7F29\u653E\u3002"
  },
  en: {
    today: "Priority",
    yesterday: "Yesterday",
    earlier: "Earlier",
    weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    untitled: "Untitled",
    skipped: "Hidden from message view",
    ungrouped: "Ungrouped",
    settingsTitle: "Sidebar settings",
    toggleDateView: "Message view",
    skipSection: "Workspaces hidden from message view",
    zoomSection: "Zoom",
    zoomCustom: "Custom zoom",
    zoomHint: "Scales the whole interface, sidebar and conversation included. Uses the same page-scale approach as Claude Style.",
    zoomSystem: "100%",
    zoomCustomHint: "Type a percentage between 60 and 200, then press Enter.",
    settingsIntro: "Message grouping for the sidebar and hidden workspaces. Changes apply immediately.",
    dateViewHint: "Groups sessions into Priority / Yesterday / weekday / Earlier. Toggle from the bell at the top of the sidebar.",
    skipHint: "Sessions in checked workspaces are left out of the message view. The workspace view is unaffected.",
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
function themeDateTrigger() {
  return document.querySelector('.dsh-claude-active-shelf-actions button[class*="active-shelf-trigger"]');
}
function themeHasDateView() {
  if (!themePresent()) return false;
  if (themeDateTrigger() !== null) return true;
  return document.body.hasAttribute("data-dsh-claude-date-groups");
}
function themePresent() {
  for (const attribute of [...document.body.attributes]) {
    if (THEME_MARKERS.some((marker) => attribute.name.startsWith(marker))) return true;
  }
  for (const marker of ["dsh-claude-", "dshClaude"]) {
    if (document.querySelector(`[class*="${marker}"]`) !== null) return true;
  }
  return false;
}

// src/zoom.js
var ENDPOINT = "/codex-sidebar/api/zoom";
function clampFactor(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  const clamped = Math.min(ZOOM_RANGE.max, Math.max(ZOOM_RANGE.min, number));
  return Math.round(clamped * 100) / 100;
}
function writePageSize(factor) {
  document.body.style.setProperty(ZOOM_WIDTH_VAR, `${Math.round(window.innerWidth / factor)}px`);
  document.body.style.setProperty(ZOOM_HEIGHT_VAR, `${Math.round(window.innerHeight / factor)}px`);
}
function clearCssZoom() {
  const body = document.body;
  body.removeAttribute(ZOOM_ATTR);
  body.style.removeProperty(ZOOM_VAR);
  body.style.removeProperty(ZOOM_WIDTH_VAR);
  body.style.removeProperty(ZOOM_HEIGHT_VAR);
}
function applyCssZoom(factor) {
  const body = document.body;
  if (Math.abs(factor - 1) < 1e-3) {
    clearCssZoom();
    return;
  }
  body.style.setProperty(ZOOM_VAR, String(factor));
  body.setAttribute(ZOOM_ATTR, String(factor));
  writePageSize(factor);
}
function createZoom() {
  let mode = "unknown";
  let wanted = 1;
  let disposed = false;
  async function probe() {
    try {
      const response = await fetch(ENDPOINT, { headers: { accept: "application/json" } });
      if (!response.ok) return "css";
      const data = await response.json();
      return data !== null && data.supported === true ? "window" : "css";
    } catch {
      return "css";
    }
  }
  async function pushWindowZoom(factor) {
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ factor })
      });
      if (!response.ok) return false;
      const data = await response.json();
      return data !== null && data.supported === true;
    } catch {
      return false;
    }
  }
  async function land(factor) {
    if (disposed) return;
    if (mode === "window") {
      clearCssZoom();
      const ok = await pushWindowZoom(factor);
      if (!ok) {
        mode = "css";
        applyCssZoom(factor);
      }
      return;
    }
    applyCssZoom(factor);
  }
  return {
    /** 当前生效的路线：'window' | 'css' | 'unknown'。 */
    get mode() {
      return mode;
    },
    /** 探测一次路线（启动时调一次即可）。 */
    async start() {
      mode = await probe();
      return mode;
    },
    /** 应用倍率：探测还没完成时只记下来，完成后自动补上。 */
    apply(value) {
      wanted = clampFactor(value);
      if (mode === "unknown") return Promise.resolve();
      return land(wanted);
    },
    /** 窗口尺寸变了：CSS 路线的页面尺寸变量要重算。 */
    handleResize() {
      if (mode === "css" && Math.abs(wanted - 1) >= 1e-3) writePageSize(wanted);
    },
    /** 还原到 100%（卸载时调）。 */
    reset() {
      wanted = 1;
      clearCssZoom();
      if (mode === "window") void pushWindowZoom(1);
    },
    /** 卸载：之后不再发请求。 */
    dispose() {
      disposed = true;
    }
  };
}

// src/portal-fit.js
var PORTAL_FIT_ATTR = "data-codex-sidebar-portal-fit";
var OFFSET_PROPS = ["left", "top", "right", "bottom"];
var SKIP_TAGS = /* @__PURE__ */ new Set(["SCRIPT", "STYLE", "LINK", "TEMPLATE", "META", "NOSCRIPT"]);
function pxValue(text) {
  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(String(text).trim());
  return match === null ? null : Number(match[1]);
}
function dividePx(text, factor) {
  const value = pxValue(text);
  if (value === null) return null;
  return `${Math.round(value / factor * 100) / 100}px`;
}
function isSkipped(el) {
  if (el.id === "root") return true;
  if (SKIP_TAGS.has(el.tagName)) return true;
  if (el.hasAttribute("data-codex-sidebar-owned")) return true;
  return el.closest("[data-codex-sidebar-owned]") !== null;
}
function createPortalFit() {
  const records = /* @__PURE__ */ new Map();
  let factor = 1;
  let frame = 0;
  let observer = null;
  function recordOf(el) {
    let record = records.get(el);
    if (record === void 0) {
      record = { original: /* @__PURE__ */ new Map(), written: /* @__PURE__ */ new Map() };
      records.set(el, record);
    }
    return record;
  }
  function writeProp(el, record, prop, value) {
    if (el.style.getPropertyValue(prop) === value) {
      record.written.set(prop, value);
      return;
    }
    if (!record.original.has(prop)) record.original.set(prop, el.style.getPropertyValue(prop));
    el.style.setProperty(prop, value);
    record.written.set(prop, value);
  }
  function fitOffsets(el) {
    const record = recordOf(el);
    for (const prop of OFFSET_PROPS) {
      const current = el.style.getPropertyValue(prop);
      if (current === "") continue;
      if (record.written.get(prop) === current) continue;
      const scaled = dividePx(current, factor);
      if (scaled !== null) writeProp(el, record, prop, scaled);
    }
  }
  function isFullscreen(el) {
    const style = getComputedStyle(el);
    return style.top === "0px" && style.left === "0px" && style.right === "0px" && style.bottom === "0px";
  }
  function fitRoot(el) {
    if (!el.hasAttribute(PORTAL_FIT_ATTR)) el.setAttribute(PORTAL_FIT_ATTR, "");
    const record = recordOf(el);
    fitOffsets(el);
    if (isFullscreen(el)) {
      const width = `${Math.round(window.innerWidth / factor)}px`;
      const height = `${Math.round(window.innerHeight / factor)}px`;
      writeProp(el, record, "width", width);
      writeProp(el, record, "height", height);
    }
    const zoom = String(factor);
    if (el.style.getPropertyValue("zoom") !== zoom) el.style.setProperty("zoom", zoom);
    record.zoomApplied = true;
  }
  function unfit(el) {
    const record = records.get(el);
    if (record === void 0) return;
    if (record.zoomApplied === true) el.style.removeProperty("zoom");
    for (const [prop, value] of record.original) {
      if (value === "") el.style.removeProperty(prop);
      else el.style.setProperty(prop, value);
    }
    el.removeAttribute(PORTAL_FIT_ATTR);
    records.delete(el);
  }
  function collectRoots() {
    const roots = [];
    const walk = (el, depth) => {
      if (isSkipped(el)) return;
      const position = getComputedStyle(el).position;
      if (position === "fixed" || position === "absolute") {
        roots.push(el);
        return;
      }
      if (depth >= 3) return;
      for (const child of el.children) walk(child, depth + 1);
    };
    for (const child of document.body.children) walk(child, 0);
    return roots;
  }
  function refresh() {
    if (factor === 1) return;
    const wanted = /* @__PURE__ */ new Set();
    for (const root of collectRoots()) {
      wanted.add(root);
      fitRoot(root);
      for (const el of root.querySelectorAll("[style]")) {
        if (isSkipped(el)) continue;
        wanted.add(el);
        fitOffsets(el);
      }
    }
    for (const el of [...records.keys()]) {
      if (wanted.has(el) && el.isConnected) continue;
      unfit(el);
    }
  }
  function schedule() {
    if (frame !== 0) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      refresh();
    });
  }
  return {
    /** 应用倍率：1 表示还原。 */
    apply(value) {
      const next = Number(value);
      const normalized = Number.isFinite(next) && next > 0 ? Math.round(next * 100) / 100 : 1;
      if (normalized === factor) {
        if (normalized !== 1) schedule();
        return;
      }
      for (const el of [...records.keys()]) unfit(el);
      factor = normalized;
      if (factor !== 1) schedule();
    },
    /** 视口变化：满屏浮层尺寸要重算（偏移由宿主自己重写，下一帧会被我们重新折算）。 */
    handleResize() {
      if (factor === 1) return;
      schedule();
    },
    /** 开始监听：弹层是后插入 body 的，必须有人盯住。 */
    start() {
      if (observer !== null) return;
      observer = new MutationObserver(() => schedule());
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style"]
      });
    },
    /** 停止监听并全部还原。 */
    restore() {
      if (observer !== null) {
        observer.disconnect();
        observer = null;
      }
      if (frame !== 0) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      for (const el of [...records.keys()]) unfit(el);
      factor = 1;
    },
    /** 卸载：还原并停止。 */
    dispose() {
      this.restore();
    }
  };
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
function findSidebarBox(sidebar) {
  const root = sidebar ?? findSidebar();
  if (root === null) return null;
  const box = root.firstElementChild;
  if (box === null) return root;
  return box.getBoundingClientRect().width > 0 ? box : root;
}
function sidebarWidth(sidebar) {
  const box = findSidebarBox(sidebar);
  return box === null ? 0 : box.getBoundingClientRect().width;
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
var BRAND_SLOT_SELECTOR = '[data-slot^="sidebar.brand"]';
function findTopBar(sidebar) {
  const root = sidebar ?? findSidebar();
  if (root === null) return null;
  const toggle = findToggle(root);
  const brandAnchor = root.querySelector(BRAND_SLOT_SELECTOR)?.parentElement ?? root.querySelector('button[class*="brand"]')?.parentElement ?? null;
  const row = toggle?.parentElement ?? brandAnchor;
  if (row === null) return null;
  const inRow = toggle !== null && toggle.parentElement === row;
  return {
    row,
    toggle: inRow ? toggle : null,
    // 只含折叠按钮一个孩子的行：动作区跟在它后面，别插到前面。
    lonely: inRow && row.children.length <= 1
  };
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
var SEARCH_BUTTON_LABELS = ["search sessions", "\u641C\u7D22\u4F1A\u8BDD", "\u641C\u7D22"];
function findWorkspaceBar(sidebar) {
  const root = sidebar ?? findSidebar();
  if (root === null) return null;
  const headerRows = [...root.querySelectorAll("div")].filter(
    (node) => typeof node.className === "string" && node.className.includes("sectionHeader")
  );
  for (const row of headerRows) {
    const group = [...row.children].find(
      (child) => typeof child.className === "string" && child.className.includes("headerActions")
    );
    if (group !== void 0) return { row, slot: group };
    const slot = [...row.children].find(
      (child) => typeof child.className === "string" && child.className.includes("searchSlot")
    );
    if (slot !== void 0) return { row, slot };
  }
  const wanted = SEARCH_BUTTON_LABELS;
  const searchButton = [...root.querySelectorAll("button")].find(
    (button) => button.getAttribute("data-codex-sidebar-owned") === null && wanted.includes((button.getAttribute("aria-label") ?? "").toLowerCase())
  );
  if (searchButton?.parentElement) return { row: searchButton.parentElement, slot: searchButton.parentElement };
  return null;
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
var PREVIEW_CLASS = "codex-sidebar-preview";
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
  const previews = /* @__PURE__ */ new Set();
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
  function dressPreview(row, text) {
    if (row === null) return;
    const existing = row.querySelector(":scope > ." + PREVIEW_CLASS);
    if (text === "") {
      if (existing !== null) {
        previews.delete(existing);
        existing.remove();
      }
      return;
    }
    if (existing !== null) {
      if (existing.textContent !== text) existing.textContent = text;
      return;
    }
    const preview = document.createElement("span");
    preview.className = PREVIEW_CLASS;
    preview.setAttribute(OWN_ATTR, "");
    preview.textContent = text;
    row.appendChild(preview);
    previews.add(preview);
  }
  function stripPreviews() {
    for (const preview of previews) preview.remove();
    previews.clear();
  }
  function titleNodeOf(row) {
    const explicit = row.querySelector('[class*="_title"]');
    if (explicit !== null) return explicit;
    for (const child of row.children) {
      const className = typeof child.className === "string" ? child.className : "";
      if (className === CHIP_CLASS) continue;
      if (className.includes("_time") || className.includes("_slot") || className.endsWith("_rowActions")) continue;
      return child;
    }
    return null;
  }
  function startMarquee(row) {
    const title = titleNodeOf(row);
    if (title === null) return;
    const overflow = title.scrollWidth - title.clientWidth;
    if (overflow <= 4) return;
    title.style.setProperty("--codex-sidebar-marquee-shift", "-" + overflow + "px");
    title.classList.add("codex-sidebar-marquee");
  }
  function stopMarquee(row) {
    const title = titleNodeOf(row);
    if (title === null) return;
    title.classList.remove("codex-sidebar-marquee");
    title.style.removeProperty("--codex-sidebar-marquee-shift");
  }
  function onPointerOver(event) {
    if (!active || !(event.target instanceof Element)) return;
    const row = event.target.closest('[data-row-key^="session:"]');
    if (row === null) return;
    startMarquee(row);
  }
  function onPointerOut(event) {
    if (!(event.target instanceof Element)) return;
    const row = event.target.closest('[data-row-key^="session:"]');
    if (row === null) return;
    stopMarquee(row);
  }
  document.addEventListener("mouseover", onPointerOver, true);
  document.addEventListener("mouseout", onPointerOut, true);
  function dispose() {
    document.removeEventListener("mouseover", onPointerOver, true);
    document.removeEventListener("mouseout", onPointerOut, true);
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
      const titles = hostData.workspaceTitleBySession();
      const sessions = hostData.sessionSnapshot();
      const now = Date.now();
      const visible = [];
      const nextHidden = /* @__PURE__ */ new Set();
      for (const seat of collectSeats(container)) {
        const row = rowOfSeat(seat);
        const sessionId = sessionIdOfRow(row);
        const workspace = titles.get(sessionId) ?? copy.ungrouped;
        if (sessionId === "") {
          nextHidden.add(seat);
          continue;
        }
        const state = sessions.byId?.[sessionId];
        const updatedAt = state?.updatedAt;
        const time = typeof updatedAt === "number" ? updatedAt : 0;
        const running = state?.running === true;
        const bucket = running ? { text: copy.today, rank: 0 } : bucketOf(time, now, copy);
        if (seat.style.display !== "") seat.style.display = "";
        visible.push({ seat, row, sessionId, time, running, bucket, workspace });
      }
      for (const seat of hiddenSeats) {
        if (!nextHidden.has(seat) && seat.style.display !== "") seat.style.display = "";
      }
      for (const seat of nextHidden) {
        if (seat.style.display !== "none") seat.style.display = "none";
      }
      hiddenSeats.clear();
      for (const seat of nextHidden) hiddenSeats.add(seat);
      visible.sort((left, right) => left.bucket.rank - right.bucket.rank || Number(right.running) - Number(left.running) || right.time - left.time);
      const previewTexts = hostData.previewBySession();
      for (const item of visible) {
        dressRow(item.row, item.workspace);
        dressPreview(item.row, previewTexts.get(item.sessionId) ?? "");
      }
      const spareHeaders = /* @__PURE__ */ new Map();
      for (const header of headers) {
        const text = header.textContent ?? "";
        if (!spareHeaders.has(text)) spareHeaders.set(text, header);
      }
      const nodes = [];
      let lastText = null;
      for (const item of visible) {
        if (item.bucket.text !== lastText) {
          const header = spareHeaders.get(item.bucket.text) ?? createHeader(item.bucket.text);
          nodes.push(header);
          lastText = item.bucket.text;
        }
        nodes.push(item.seat);
      }
      const wanted = new Set(nodes);
      const present = [...container.children].filter((child) => wanted.has(child));
      const inOrder = present.length === nodes.length && present.every((child, index) => child === nodes[index]);
      headers.clear();
      for (const node of nodes) {
        if (node.getAttribute?.(OWN_ATTR) !== null) headers.add(node);
      }
      if (inOrder) return;
      for (const node of nodes) container.appendChild(node);
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
    document.body.setAttribute(DATE_MODE_ATTR, "");
    if (!viewStore.flatten()) {
      document.body.removeAttribute(DATE_MODE_ATTR);
      afterDisable?.();
      return;
    }
    active = true;
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
    stripPreviews();
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
  return { isActive, enable, disable, toggle, schedule, arrange, dispose };
}

// src/topbar.js
var MIN_SIDEBAR_WIDTH = 140;
var BELL_SVG = `<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.9 6.6a4.1 4.1 0 0 1 8.2 0c0 2 .5 3.2 1.1 4 .3.4 0 .9-.5.9H3.3c-.5 0-.8-.5-.5-.9.6-.8 1.1-2 1.1-4Z"/><path d="M6.4 13.2a1.8 1.8 0 0 0 3.2 0"/></svg>`;
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
function createTopbar({
  dateView,
  hostData,
  onToggle,
  onBellClick,
  bellPressed,
  getLabels,
  showBell = true
}) {
  let actions = null;
  let bell = null;
  let dot = null;
  let bellWanted = showBell;
  function refreshBell() {
    if (bell === null) return;
    const active = typeof bellPressed === "function" ? bellPressed() === true : dateView.isActive();
    bell.setAttribute("aria-pressed", active ? "true" : "false");
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
      if (typeof onBellClick === "function" && onBellClick() === true) {
        refreshBell();
        return;
      }
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
    if (sidebarWidth(sidebar) < MIN_SIDEBAR_WIDTH) {
      unmount();
      return false;
    }
    const workspaceBar = findWorkspaceBar(sidebar);
    const bar = workspaceBar === null ? findTopBar(sidebar) : null;
    const host = workspaceBar?.slot ?? bar?.row ?? null;
    if (host === null) return false;
    if (host.closest("[" + OWN_ATTR + "]") !== null) return false;
    if (actions !== null && actions.parentElement === host) return true;
    for (const stale of document.querySelectorAll(".codex-sidebar-actions")) {
      if (stale !== actions) stale.remove();
    }
    if (actions === null) {
      actions = document.createElement("div");
      actions.className = "codex-sidebar-actions";
      actions.setAttribute(OWN_ATTR, "");
    }
    actions.classList.toggle("codex-sidebar-actions-top", workspaceBar === null);
    actions.replaceChildren();
    if (workspaceBar !== null) {
      host.insertBefore(actions, host.firstElementChild);
    } else if (bar.lonely || bar.toggle === null) {
      host.appendChild(actions);
    } else {
      host.insertBefore(actions, bar.toggle);
    }
    bell = null;
    dot = null;
    applyBellVisibility();
    refreshBell();
    document.body.setAttribute(BELL_ATTR, "");
    return true;
  }
  function refreshLabels() {
    const next = getLabels();
    if (bell !== null) {
      bell.setAttribute("aria-label", next.toggleDateView);
      bell.setAttribute("title", next.toggleDateView);
    }
  }
  function unmount() {
    actions?.remove();
    document.body.removeAttribute(BELL_ATTR);
    actions = null;
    bell = null;
    dot = null;
  }
  return { mount, unmount, refreshBell, refreshLabels, setShowBell };
}

// src/styles.js
var CSS = `
/*
 * \u6574\u9875\u7F29\u653E\uFF08\u8BF4\u660E\u89C1 constants.js \u7684 ZOOM_* \u6CE8\u91CA\uFF09\u3002
 *
 * \u7F29\u653E\u5BF9\u8C61\u662F #root \u800C\u4E0D\u662F body\uFF0C\u624B\u6BB5\u662F transform \u800C\u4E0D\u662F CSS zoom \u2014\u2014 \u8FD9\u4E00\u6761\u662F\u5B9E\u6D4B\u7ED3\u8BBA\uFF1A
 * \u5BBF\u4E3B\u628A\u5F39\u5C42\uFF08\u8D26\u53F7\u83DC\u5355\u3001\u8BBE\u7F6E\u9875\uFF09portal \u5230 body \u4E0A\u7528 position:fixed + getBoundingClientRect
 * \u5B9A\u4F4D\uFF0C\u800C body \u4E0A\u7684 CSS zoom \u4F1A\u8BA9\u5E03\u5C40\u50CF\u7D20\u4E0E\u89C6\u53E3\u50CF\u7D20\u4E0D\u540C\u6E90\uFF0C\u7F29\u653E\u5230 125% \u65F6\u83DC\u5355\u88AB\u7B97\u5230
 * \u89C6\u53E3\u4E0B\u65B9\uFF08y=898\uFF0C\u83DC\u5355\u9879 903\uFF0C100% \u65F6\u662F y=732\uFF09\uFF0C\u4E8E\u662F\u300C\u8C03\u6574\u7F29\u653E\u540E\u8BBE\u7F6E\u6253\u4E0D\u5F00\u300D\u3002
 * transform \u4E0B getBoundingClientRect \u7ED9\u7684\u662F\u89C6\u89C9\u5750\u6807\uFF0C\u5BBF\u4E3B\u7684\u7B97\u6CD5\u4ECD\u7136\u6B63\u786E\u3002
 *
 * width/height \u6309\u300C\u7A97\u53E3\u5C3A\u5BF8 / \u500D\u7387\u300D\u5199\u6B7B\uFF08\u7531 JS \u7B97\u51FA\uFF09\uFF0C\u8FD9\u6837\u7F29\u653E\u540E\u6B63\u597D\u94FA\u6EE1\u7A97\u53E3\uFF1B
 * \u53EA\u6302\u5728\u672C\u63D2\u4EF6\u81EA\u5DF1\u7684\u6807\u8BB0\u4E0A\uFF1A\u6709\u4E3B\u9898\u65F6\u6211\u4EEC\u4E0D\u5199 data-codex-sidebar-page-zoom\uFF0C\u4E0D\u4E0E\u4E3B\u9898\u7684
 * pageZoom \u53E0\u52A0\u3002
 */
body[data-codex-sidebar][data-codex-sidebar-page-zoom] #root {
  transform: scale(var(--codex-sidebar-page-zoom-factor, 1));
  transform-origin: 0 0;
  width: var(--codex-sidebar-page-width, 100vw);
  height: var(--codex-sidebar-page-height, 100vh);
}

body[data-codex-sidebar][data-codex-sidebar-page-zoom] {
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
}

/* \u6302\u5728\u9876\u884C\u65F6\u9760\u53F3\u63A8\uFF08\u90A3\u4E00\u884C\u5DE6\u8FB9\u662F\u54C1\u724C\u6309\u94AE\uFF09\uFF1B\u6302\u5728\u5DE5\u4F5C\u533A\u884C\u65F6\u4E0D\u7528\uFF0C\u90A3\u4E2A\u56FE\u6807\u7EC4\u672C\u6765\u5C31\u9760\u53F3\u3002 */
.codex-sidebar-actions-top {
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
  padding: 12px 4px 6px;
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
 * \u6D88\u606F\u89C6\u56FE\u7684\u4E24\u884C\u5F0F\u4F1A\u8BDD\u884C\uFF08Codex \u90A3\u79CD\u804A\u5929\u5217\u8868\uFF09\u3002
 *
 * \u5BBF\u4E3B\u884C\u672C\u6765\u662F\u5355\u884C flex\uFF1A\u56FE\u6807\u69FD + \u6807\u9898 + \u65F6\u95F4 + \u6211\u4EEC\u7684\u6807\u7B7E + \u64CD\u4F5C\u7EC4\u3002
 * \u6539\u6210\u53EF\u6362\u884C\u540E\uFF0C\u628A\u300C\u6700\u65B0\u6D88\u606F\u9884\u89C8\u300D\u4F5C\u4E3A\u884C\u5C3E\u7684 flex-basis:100% \u8282\u70B9\u653E\u5230\u7B2C\u4E8C\u884C\uFF0C
 * \u884C\u9AD8\u6539\u4E3A\u81EA\u9002\u5E94\uFF1B\u65F6\u95F4\u5728\u6D88\u606F\u89C6\u56FE\u91CC\u5DF2\u7ECF\u88AB\u9690\u85CF\uFF0C\u7B2C\u4E00\u884C\u53EA\u5269\u56FE\u6807 + \u6807\u9898 + \u6807\u7B7E\u3002
 */
[data-codex-sidebar-date-view] [data-row-key^="session:"] {
  flex-wrap: wrap;
  height: auto;
  min-height: 32px;
  row-gap: 1px;
  padding-top: 6px;
  padding-bottom: 6px;
}

/*
 * \u88C5\u4E86 dsh-claude-style \u65F6\u5B83\u7ED9\u4F1A\u8BDD\u884C\u5199\u4E86\u56FA\u5B9A\u9AD8\u5EA6\uFF08\u5B9E\u6D4B 28px\uFF09\uFF0C\u4F18\u5148\u7EA7\u9AD8\u4E8E\u4E0A\u9762\u90A3\u6761\u89C4\u5219\uFF0C
 * \u7ED3\u679C\u7B2C\u4E8C\u884C\u9884\u89C8\u6EA2\u51FA\u5230\u4E0B\u4E00\u884C\u6807\u9898\u4E0A\u3001\u5B57\u53E0\u5B57\u3002\u8FD9\u91CC\u7528\u540C\u4E00\u5C5E\u6027\u3001\u4E09\u4E2A\u5C5E\u6027\u9009\u62E9\u5668\u7684\u5199\u6CD5\u52A0
 * !important\uFF1A\u53EA\u6709\u300C\u5BBF\u4E3B + \u4E3B\u9898\u300D\u540C\u65F6\u547D\u4E2D\u65F6\u624D\u6709\u989D\u5916\u6743\u91CD\uFF0Csolo \u73AF\u5883\u4E0D\u53D7\u5F71\u54CD\u3002
 */
[data-codex-sidebar-date-view] [data-slot="sidebar"] [data-row-key^="session:"] {
  height: auto !important;
  min-height: 32px !important;
  flex-wrap: wrap !important;
}

/*
 * \u7B2C\u4E8C\u884C\uFF1A\u8FD9\u6BB5\u5BF9\u8BDD\u6700\u540E\u8BF4\u7684\u8BDD\u3002
 * \u4E0E\u6807\u9898\u6587\u5B57\u5DE6\u5BF9\u9F50\uFF08\u56FE\u6807\u69FD 16px + \u95F4\u9699 8px\uFF09\uFF0C\u6700\u591A\u4E24\u884C\uFF0C\u8D85\u51FA\u7701\u7565\uFF1B
 * pointer-events: none \u8BA9\u5B83\u4E0D\u62A2\u8D70\u6574\u884C\u7684\u70B9\u51FB\u4E0E\u60AC\u505C\u3002
 */
.codex-sidebar-preview {
  flex: 0 0 100%;
  min-width: 0;
  padding-left: 20px;
  font-size: 12px;
  line-height: 1.45;
  letter-spacing: 0;
  color: var(--dsw-alias-label-primary, inherit);
  opacity: 0.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
  user-select: none;
  pointer-events: none;
}

/*
 * \u60AC\u505C\uFF1A\u5DE5\u4F5C\u533A\u5C0F\u5B57\u9000\u573A\uFF0C\u6807\u9898\u62FF\u5230\u6574\u884C\u5BBD\u5EA6\u3002
 * Codex \u7684\u4F1A\u8BDD\u5217\u8868\u4E5F\u662F\u8FD9\u4E48\u505A\u7684\u2014\u2014\u60AC\u505C\u65F6\u628A\u6CE8\u610F\u529B\u6536\u56DE\u5230\u4F1A\u8BDD\u672C\u8EAB\u3002
 */
[data-codex-sidebar-date-view] [data-row-key^="session:"]:hover .codex-sidebar-chip {
  display: none;
}

/*
 * \u6807\u9898\u8FC7\u957F\u65F6\u60AC\u505C\u6A2A\u5411\u6ED1\u52A8\uFF0C\u6ED1\u4E00\u6B21\u505C\u5728\u5C3E\u5DF4\u4E0A\uFF0C\u79FB\u5F00\u5C31\u590D\u4F4D\u3002
 *
 * \u53EA\u8D70\u4E00\u8D9F\u4E0D\u518D\u6765\u56DE\uFF1A\u6765\u56DE\u6446\u4F1A\u628A\u5F00\u5934\u7684\u5B57\u53CD\u590D\u7529\u51FA\u53EF\u89C6\u533A\uFF0C\u5C3E\u5DF4\u53CD\u800C\u4E00\u76F4\u8BFB\u4E0D\u5B8C\u6574\u3002
 * \u4E24\u7AEF\u7528\u906E\u7F69\u6DE1\u51FA\uFF0C\u6ED1\u5230\u5C3E\u90E8\u65F6\u6700\u540E\u4E00\u4E24\u4E2A\u5B57\u662F\u6E10\u9690\u7684\uFF0C\u4E0D\u662F\u88AB\u786C\u5207\u4E00\u5200\u3002
 * \u4F4D\u79FB\u7531 date-view.js \u73B0\u91CF\u540E\u5199\u8FDB --codex-sidebar-marquee-shift\uFF1A
 * \u6807\u9898\u5BBD\u5EA6\u968F\u7A97\u53E3\u4E0E\u7F29\u653E\u53D8\u5316\uFF0C\u5199\u6B7B\u8DDD\u79BB\u4F1A\u6ED1\u591A\u6216\u6ED1\u4E0D\u5230\u3002
 */
.codex-sidebar-marquee {
  overflow: hidden !important;
  text-overflow: clip !important;
  padding-right: 10px;
  mask-image: linear-gradient(90deg, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%);
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%);
  animation: codex-sidebar-marquee 1.15s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  will-change: transform;
}

@keyframes codex-sidebar-marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(var(--codex-sidebar-marquee-shift, 0px));
  }
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
 * \u6211\u4EEC\u7684\u94C3\u94DB\u5728\u573A\u65F6\uFF0C\u85CF\u6389 dsh-claude-style \u81EA\u5DF1\u90A3\u9897\u65E5\u671F\u94C3\u94DB\uFF1A\u4FA7\u680F\u4E0A\u53EA\u7559\u4E00\u9897\u94C3\u94DB\uFF0C
 * \u4F4D\u5B50\u56FA\u5B9A\u3001\u4E00\u5B9A\u70B9\u5F97\u52A8\uFF08\u70B9\u51FB\u4F1A\u8F6C\u4EA4\u7ED9\u4E3B\u9898\u7684\u94C3\u94DB\uFF0C\u529F\u80FD\u4E0D\u4E22\uFF09\u3002
 * \u53EA\u85CF\u5B83\u90A3\u4E00\u4E2A trigger\uFF08\u641C\u7D22\u6309\u94AE\u4E0E\u5176\u5B83\u52A8\u4F5C\u4E0D\u52A8\uFF09\uFF1B\u6211\u4EEC\u5378\u8F7D\u540E\u6807\u8BB0\u6D88\u5931\uFF0C\u4E3B\u9898\u90A3\u9897\u81EA\u52A8\u56DE\u6765\u3002
 */
[data-codex-sidebar-bell] .dsh-claude-active-shelf-actions button[class*="active-shelf-trigger"] {
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
var inject = [];
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
  try {
    if (window.localStorage.getItem("dsh-codex-sidebar.debug") === "1") {
      window.__codexSidebarDebug = { ctx, readSettings, writeSettings };
    }
  } catch {
  }
  const hostData = createHostData(ctx);
  const viewStore = createViewStore(ctx);
  const zoom = createZoom();
  const portalFit = createPortalFit();
  let topbar = null;
  let mode = null;
  const dateView = createDateView({
    hostData,
    viewStore,
    // 传函数：每次重排都重新问当前语言，切换语言后标题文字立即跟上。
    locale: () => localeState.language(),
    refreshBell: () => topbar?.refreshBell()
  });
  topbar = createTopbar({
    dateView,
    hostData,
    getLabels: () => localeState.get(),
    onToggle: (active) => writeSettings({ dateViewEnabled: active }),
    // 有主题时，铃铛点的是主题自己的日期视图：功能是同一件事，让它管，避免两套实现搬同一批行。
    // 这样我们的铃铛在任何组合下都「有东西可点」，不会出现装上去却按下去没反应的情况。
    onBellClick: () => {
      const trigger = themeDateTrigger();
      if (trigger === null) return false;
      trigger.click();
      return true;
    },
    // 按下态：委派给主题时读主题铃铛自己的 aria-pressed，否则读我们的日期视图状态。
    bellPressed: () => {
      const trigger = themeDateTrigger();
      if (trigger === null) return dateView.isActive();
      return trigger.getAttribute("aria-pressed") === "true";
    }
  });
  function applyZoomFromSettings() {
    zoom.reset();
    portalFit.apply(1);
  }
  function applyPortalFit(factor, enabled) {
    portalFit.apply(enabled === true ? factor : 1);
  }
  let reconciling = false;
  function setMode(next) {
    if (mode === next) return;
    mode = next;
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
      const next = themeHasDateView() ? "dormant" : "solo";
      setMode(next);
      applyZoomFromSettings();
      if (next === "dormant") {
        if (dateView.isActive()) dateView.disable();
        dateView.dispose();
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
  function isOurMutation(record) {
    const target = record.target;
    return target instanceof Element && target.closest("[" + OWN_ATTR + "]") !== null;
  }
  const observer = new MutationObserver((records) => {
    if (records.every(isOurMutation)) return;
    schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  const onResize = () => {
    zoom.handleResize();
    portalFit.handleResize();
  };
  window.addEventListener("resize", onResize);
  disposers.push(() => window.removeEventListener("resize", onResize));
  disposers.push(hostData.subscribe(() => {
    topbar?.refreshBell();
    dateView.schedule();
  }));
  disposers.push(subscribeSettings(() => {
    reconcile();
    applyZoomFromSettings();
    dateView.schedule();
  }));
  const boot = window.setInterval(() => {
    if (findSidebar() === null) return;
    window.clearInterval(boot);
    if (!themeHasDateView()) healLeftoverFlat();
    reconcile();
    topbar.mount();
    schedule();
    portalFit.start();
  }, 200);
  ctx.effect(() => () => {
    window.clearInterval(boot);
    observer.disconnect();
    if (frameHandle !== 0) window.cancelAnimationFrame(frameHandle);
    dateView.disable();
    topbar.unmount();
    zoom.reset();
    zoom.dispose();
    portalFit.dispose();
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
