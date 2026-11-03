/* ==========================================================================
   haze windows — floating app windows
   Reparents existing views into a real window layer so every app keeps its
   state, event listeners and iframes. Drag the bar, resize the corner,
   double-click to maximize, and minimize to the dock.
   ========================================================================== */

(() => {
  "use strict";

  if (window.hazeWindows) return;

  const $ = (id) => document.getElementById(id);
  const MODE_KEY = "haze-window-mode-v1";
  const GEOM_KEY = "haze-window-geom-v1";
  const TIP_KEY = "haze-window-tip-v1";
  const LABELS = {
    games: "haze games",
    music: "haze music",
    ai: "haze ai",
    chat: "haze chat",
    apps: "haze apps",
    cloud: "cloud gaming",
    settings: "settings",
    terminal: "terminal",
  };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = () => window.matchMedia("(max-width: 720px)").matches;

  const viewEls = new Map(
    [...document.querySelectorAll(".view[data-view-section]")].map((v) => [v.dataset.viewSection, v])
  );
  const markers = new Map();
  const records = new Map();
  let enabled = readMode();
  let suppress = false;
  let focused = null;
  let zCounter = 20;

  function readMode() {
    try {
      return localStorage.getItem(MODE_KEY) !== "0";
    } catch {
      return true;
    }
  }

  function saveMode() {
    try {
      localStorage.setItem(MODE_KEY, enabled ? "1" : "0");
    } catch {}
  }

  function readGeom() {
    try {
      const raw = JSON.parse(localStorage.getItem(GEOM_KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch {
      return {};
    }
  }

  function saveGeom(view, geom) {
    try {
      const all = readGeom();
      all[view] = geom;
      localStorage.setItem(GEOM_KEY, JSON.stringify(all));
    } catch {}
  }

  function toast(message) {
    try {
      (window.hazeOSBridge?.toast || window.hazeOS?.toast)?.(message);
    } catch {}
  }

  function announce() {
    document.dispatchEvent(
      new CustomEvent("haze:windows", {
        detail: {
          enabled,
          count: records.size,
          focused: focused?.view || null,
        },
      })
    );
  }

  /* ------------------------------------------------------------------------
     layer + markers
     ------------------------------------------------------------------------ */

  const layer = document.createElement("div");
  layer.id = "hz-wm-layer";
  layer.className = "hz-wm-layer";
  layer.setAttribute("aria-hidden", "false");
  document.body.appendChild(layer);

  for (const [view, el] of viewEls) {
    if (view === "home") continue;
    const marker = document.createComment("hz-wm:" + view);
    el.after(marker);
    markers.set(view, marker);
  }

  /* ------------------------------------------------------------------------
     geometry
     ------------------------------------------------------------------------ */

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function defaultGeom(index) {
    if (isMobile()) {
      return { left: 6, top: 6, width: innerWidth - 12, height: innerHeight - 12 };
    }
    const width = clamp(Math.round(innerWidth * 0.64), 520, 980);
    const height = clamp(Math.round(innerHeight * 0.7), 380, 700);
    const maxLeft = Math.max(12, innerWidth - width - 24);
    const maxTop = Math.max(12, innerHeight - height - 24);
    return {
      left: clamp(280 + (index % 4) * 28, 12, maxLeft),
      top: clamp(86 + (index % 5) * 24, 12, maxTop),
      width,
      height,
    };
  }

  function applyGeom(record, geom) {
    record.geom = { ...geom };
    record.el.style.left = geom.left + "px";
    record.el.style.top = geom.top + "px";
    record.el.style.width = geom.width + "px";
    record.el.style.height = geom.height + "px";
  }

  function clampGeom(record) {
    if (record.maximized || isMobile()) return;
    const maxW = Math.max(360, innerWidth - 20);
    const maxH = Math.max(260, innerHeight - 20);
    const width = clamp(record.geom.width, 360, maxW);
    const height = clamp(record.geom.height, 260, maxH);
    const left = clamp(record.geom.left, 0, Math.max(0, innerWidth - width));
    const top = clamp(record.geom.top, 0, Math.max(0, innerHeight - 48));
    applyGeom(record, { left, top, width, height });
  }

  /* ------------------------------------------------------------------------
     window construction
     ------------------------------------------------------------------------ */

  function navButton(view) {
    return document.querySelector('.nav-item[data-view="' + view + '"]');
  }

  function labelFor(view) {
    const nav = navButton(view);
    return (
      LABELS[view] ||
      nav?.querySelector("span")?.textContent?.trim() ||
      nav?.getAttribute("data-label") ||
      view
    );
  }

  function makeLight(kind, label, glyph) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "hz-win-light hz-win-light-" + kind;
    b.title = label;
    b.setAttribute("aria-label", label);
    const s = document.createElement("span");
    s.textContent = glyph;
    b.appendChild(s);
    return b;
  }

  function makeWindow(view) {
    const el = document.createElement("div");
    el.className = "hz-win" + (isMobile() ? " is-mobile" : "");
    el.dataset.view = view;
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", labelFor(view));

    const bar = document.createElement("div");
    bar.className = "hz-win-bar";

    const lights = document.createElement("div");
    lights.className = "hz-win-lights";
    const closeBtn = makeLight("close", "Close window", "×");
    const minBtn = makeLight("min", "Minimize window", "–");
    const maxBtn = makeLight("max", "Maximize window", "+");
    lights.append(closeBtn, minBtn, maxBtn);

    const title = document.createElement("div");
    title.className = "hz-win-title";
    const ico = document.createElement("span");
    ico.className = "hz-win-ico";
    const sourceSvg = navButton(view)?.querySelector("svg");
    if (sourceSvg) ico.appendChild(sourceSvg.cloneNode(true));
    else ico.textContent = "•";
    const titleText = document.createElement("span");
    titleText.textContent = labelFor(view);
    title.append(ico, titleText);

    const faint = document.createElement("span");
    faint.className = "hz-win-faint";
    faint.textContent = "haze";

    bar.append(lights, title, faint);

    const body = document.createElement("div");
    body.className = "hz-win-body";

    const grip = document.createElement("div");
    grip.className = "hz-win-resize";
    grip.title = "Resize window";
    grip.setAttribute("aria-hidden", "true");

    el.append(bar, body, grip);
    return { el, bar, body, grip, closeBtn, minBtn, maxBtn };
  }

  function bindControls(record) {
    record.closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      close(record);
    });
    record.minBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      minimize(record);
    });
    record.maxBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMax(record);
    });
    record.bar.addEventListener("dblclick", (e) => {
      if (e.target.closest("button")) return;
      toggleMax(record);
    });
    record.el.addEventListener("pointerdown", () => focus(record));
    record.bar.addEventListener("pointerdown", (e) => beginDrag(record, e));
    record.grip.addEventListener("pointerdown", (e) => beginResize(record, e));
  }

  /* ------------------------------------------------------------------------
     drag + resize
     ------------------------------------------------------------------------ */

  function beginDrag(record, e) {
    if (e.button !== 0 || e.target.closest("button") || record.maximized || isMobile()) return;
    e.preventDefault();
    focus(record);
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = record.geom.left;
    const startTop = record.geom.top;
    const bar = record.bar;
    document.body.classList.add("hz-win-dragging");

    const move = (ev) => {
      const left = clamp(startLeft + ev.clientX - startX, 0, Math.max(0, innerWidth - record.geom.width));
      const top = clamp(startTop + ev.clientY - startY, 0, Math.max(0, innerHeight - 48));
      applyGeom(record, { ...record.geom, left, top });
    };
    const end = () => {
      document.body.classList.remove("hz-win-dragging");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      saveGeom(record.view, record.geom);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", end, { once: true });
    window.addEventListener("pointercancel", end, { once: true });
    try {
      bar.setPointerCapture(e.pointerId);
    } catch {}
  }

  function beginResize(record, e) {
    if (e.button !== 0 || record.maximized || isMobile()) return;
    e.preventDefault();
    e.stopPropagation();
    focus(record);
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = record.geom.width;
    const startH = record.geom.height;
    const startL = record.geom.left;
    const startT = record.geom.top;
    document.body.classList.add("hz-win-resizing");

    const move = (ev) => {
      const width = clamp(startW + ev.clientX - startX, 360, Math.max(360, innerWidth - startL - 8));
      const height = clamp(startH + ev.clientY - startY, 260, Math.max(260, innerHeight - startT - 8));
      applyGeom(record, { ...record.geom, width, height });
    };
    const end = () => {
      document.body.classList.remove("hz-win-resizing");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      saveGeom(record.view, record.geom);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", end, { once: true });
    window.addEventListener("pointercancel", end, { once: true });
  }

  /* ------------------------------------------------------------------------
     open / focus / minimize / close
     ------------------------------------------------------------------------ */

  function open(view) {
    if (!enabled || !view || view === "home") return false;
    const viewEl = viewEls.get(view);
    const marker = markers.get(view);
    if (!viewEl || !marker) return false;

    let record = records.get(view);
    if (record) {
      if (record.minimized) {
        record.minimized = false;
        record.el.classList.remove("is-min");
      }
      focus(record);
      return true;
    }

    /* park the shell on home underneath the windows, but don't recurse
       through toggleView's window hook */
    if (!suppress && !records.size && !document.querySelector(".view-home.active")) {
      suppress = true;
      try {
        window.hazeOSBridge?.go?.("home");
        window.hazeOSBridge?.closePalette?.();
      } catch {}
      suppress = false;
    }

    const parts = makeWindow(view);
    record = {
      view,
      el: parts.el,
      body: parts.body,
      bar: parts.bar,
      grip: parts.grip,
      closeBtn: parts.closeBtn,
      minBtn: parts.minBtn,
      maxBtn: parts.maxBtn,
      marker,
      minimized: false,
      maximized: false,
      geom: null,
      preMax: null,
    };

    /* move the live section - listeners, iframe state and audio survive */
    viewEl.classList.add("active");
    parts.body.appendChild(viewEl);
    layer.appendChild(parts.el);

    const stored = readGeom()[view];
    const geom =
      stored && !isMobile() && Number.isFinite(stored.left)
        ? {
            left: clamp(stored.left, 0, Math.max(0, innerWidth - 360)),
            top: clamp(stored.top, 0, Math.max(0, innerHeight - 260)),
            width: clamp(stored.width || 760, 360, Math.max(360, innerWidth - 20)),
            height: clamp(stored.height || 560, 260, Math.max(260, innerHeight - 20)),
          }
        : defaultGeom(records.size);
    applyGeom(record, geom);

    bindControls(record);
    records.set(view, record);
    document.body.classList.add("hz-win-open");
    focus(record);
    syncNav();
    announce();

    if (!reduceMotion) {
      parts.el.classList.add("is-opening");
      setTimeout(() => parts.el.classList.remove("is-opening"), 360);
    }

    try {
      if (!localStorage.getItem(TIP_KEY)) {
        localStorage.setItem(TIP_KEY, "1");
        setTimeout(
          () =>
            toast(
              "Floating windows are on — drag the title bar, double-click to maximize, or turn them off in Control Center."
            ),
          700
        );
      }
    } catch {}
    return true;
  }

  function focus(record) {
    if (!record || !records.has(record.view)) return;
    const viewEl = viewEls.get(record.view);
    if (viewEl) viewEl.classList.add("active");
    if (record.minimized) {
      record.minimized = false;
      record.el.classList.remove("is-min");
    }
    focused = record;
    record.el.style.zIndex = String(++zCounter);
    for (const other of records.values()) other.el.classList.toggle("is-focused", other === record);
    syncNav();
    announce();
  }

  function minimize(record) {
    if (!record) return;
    record.minimized = true;
    record.el.classList.add("is-min");
    if (focused === record) {
      focused = null;
      const next = [...records.values()].find((r) => !r.minimized);
      if (next) focus(next);
    }
    syncNav();
    announce();
  }

  function minimizeAll() {
    for (const record of records.values()) {
      record.minimized = true;
      record.el.classList.add("is-min");
    }
    focused = null;
    syncNav();
    announce();
  }

  function close(recordOrView) {
    const record =
      typeof recordOrView === "string" ? records.get(recordOrView) : recordOrView;
    if (!record || !records.has(record.view)) return;

    const { view, marker, el } = record;
    const viewEl = viewEls.get(view);
    if (viewEl) {
      viewEl.classList.remove("active");
      if (marker?.parentNode) marker.parentNode.insertBefore(viewEl, marker.nextSibling);
    }
    el.remove();
    records.delete(view);
    if (focused === record) focused = null;

    if (records.size) {
      const next = [...records.values()].find((r) => !r.minimized) || [...records.values()][0];
      if (next) focus(next);
    } else {
      document.body.classList.remove("hz-win-open");
      syncNav();
    }
    announce();
  }

  function closeAll() {
    const list = [...records.values()];
    for (const record of list) {
      const viewEl = viewEls.get(record.view);
      if (viewEl) {
        viewEl.classList.remove("active");
        if (record.marker?.parentNode) {
          record.marker.parentNode.insertBefore(viewEl, record.marker.nextSibling);
        }
      }
      record.el.remove();
      records.delete(record.view);
    }
    focused = null;
    document.body.classList.remove("hz-win-open");
    syncNav();
    announce();
  }

  function toggleMax(record) {
    if (!record) return;
    record.maximized = !record.maximized;
    if (record.maximized) {
      record.preMax = { ...record.geom };
      record.el.classList.add("is-max");
    } else {
      record.el.classList.remove("is-max");
      if (record.preMax) applyGeom(record, record.preMax);
      clampGeom(record);
      saveGeom(record.view, record.geom);
    }
    focus(record);
  }

  /* ------------------------------------------------------------------------
     nav + mode
     ------------------------------------------------------------------------ */

  function syncNav() {
    const activeView = focused?.view || (records.size ? null : "home");
    document.querySelectorAll(".nav-item[data-view]").forEach((btn) => {
      const view = btn.dataset.view;
      const record = records.get(view);
      btn.classList.toggle("wm-open", !!record);
      btn.classList.toggle("wm-min", !!record?.minimized);
      btn.classList.toggle("active", view === activeView);
    });
  }

  function intercept(view) {
    if (!enabled || suppress) return false;
    if (view === "home") {
      if (records.size) minimizeAll();
      return false;
    }
    if (!viewEls.has(view) || view === "home") return false;
    return open(view);
  }

  function setEnabled(next) {
    const value = !!next;
    if (enabled === value) return;
    enabled = value;
    saveMode();
    if (!enabled) closeAll();
    syncNav();
    announce();
    toast(
      enabled
        ? "Floating windows on — apps now open in windows"
        : "Floating windows off — apps open full screen"
    );
  }

  function toggle() {
    setEnabled(!enabled);
  }

  function list() {
    return [...records.values()].map((record) => ({
      view: record.view,
      label: labelFor(record.view),
      minimized: record.minimized,
      maximized: record.maximized,
      focused: focused === record,
    }));
  }

  /* ------------------------------------------------------------------------
     global wiring
     ------------------------------------------------------------------------ */

  window.addEventListener("resize", () => {
    for (const record of records.values()) {
      if (record.maximized) continue;
      if (isMobile()) {
        record.el.classList.add("is-mobile");
      } else {
        record.el.classList.remove("is-mobile");
        clampGeom(record);
      }
    }
  });

  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Escape" || !focused) return;
      const blocked = ["hz-ln-wrap", "palette-overlay", "hz-lock", "hz-cc", "hz-sheet"].some(
        (id) => {
          const el = $(id);
          return el && !el.hidden;
        }
      );
      if (blocked) return;
      close(focused);
    },
    true
  );

  if (!reduceMotion) syncNav();
  syncNav();
  announce();

  window.hazeWindows = {
    open,
    close,
    closeAll,
    minimize,
    minimizeAll,
    focus: (view) => {
      const record = typeof view === "string" ? records.get(view) : view;
      if (record) focus(record);
    },
    toggleMax,
    setEnabled,
    toggle,
    enabled: () => enabled,
    intercept,
    list,
  };

  if (window.hazeOS?.registerCommands) {
    window.hazeOS.registerCommands([["windows", "toggle floating app windows"]]);
    window.hazeOS.onLine?.((line) => {
      const cmd = String(line || "").trim().split(/\s+/)[0].toLowerCase();
      if (cmd !== "windows" && cmd !== "wm") return false;
      toggle();
      return true;
    });
  }
})();
