/* ==========================================================================
   haze control center + desktop
   A real settings surface for the shell: themes, atmosphere toggles, session
   actions and live window management, plus desktop icons and a context menu.
   ========================================================================== */

(() => {
  "use strict";

  if (window.hazeControl) return;

  const $ = (id) => document.getElementById(id);
  const FOCUS_KEY = "haze-focus-mode-v1";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let focusMode = false;
  try {
    focusMode = localStorage.getItem(FOCUS_KEY) === "1";
  } catch {}
  document.body.classList.toggle("hz-focus", focusMode);

  const ICONS = {
    sliders:
      '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    apps: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    game: '<path d="M6 12h4m-2-2v4"/><path d="M15.5 11h.01M18 13h.01"/><path d="M17.3 5H6.7a4.7 4.7 0 0 0-4.6 5.6l1 5.2A3 3 0 0 0 8 17.5l1.5-1.5h5L16 17.5a3 3 0 0 0 4.9-1.7l1-5.2A4.7 4.7 0 0 0 17.3 5Z"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
    term: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 9.5l3 2.5-3 2.5"/><path d="M12.5 15h4.5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M15.8 15.8L20.5 20.5"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><path d="M12 14.5v2.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    arrow: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  };

  const svg = (name) =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (ICONS[name] || ICONS.grid) +
    "</svg>";

  const escapeText = (value) =>
    String(value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function toast(message) {
    try {
      (window.hazeOSBridge?.toast || window.hazeOS?.toast)?.(message);
    } catch {}
  }

  function go(view) {
    if (!view) return;
    if (window.hazeWindows?.enabled?.()) {
      window.hazeWindows.open(view);
      return;
    }
    (window.hazeOSBridge?.go || window.hazeGo)?.(view);
  }

  /* ------------------------------------------------------------------------
     control center button
     ------------------------------------------------------------------------ */

  const ccBtn = document.createElement("button");
  ccBtn.type = "button";
  ccBtn.id = "hz-cc-btn";
  ccBtn.className = "bar-btn hz-cc-btn";
  ccBtn.title = "Control center · Alt C";
  ccBtn.setAttribute("aria-label", "Open control center");
  ccBtn.setAttribute("aria-expanded", "false");
  ccBtn.setAttribute("aria-controls", "hz-cc");
  ccBtn.innerHTML = svg("sliders");
  const shellRight = document.querySelector(".shell-right");
  const syncBtn = $("shell-sync");
  if (shellRight) shellRight.insertBefore(ccBtn, syncBtn || null);
  else document.body.appendChild(ccBtn);

  /* ------------------------------------------------------------------------
     control center shell
     ------------------------------------------------------------------------ */

  const root = document.createElement("div");
  root.id = "hz-cc";
  root.className = "hz-cc";
  root.hidden = true;
  root.innerHTML = `
    <div class="hz-cc-scrim" data-cc-close></div>
    <aside class="hz-cc-panel" role="dialog" aria-modal="true" aria-labelledby="hz-cc-title" tabindex="-1">
      <header class="hz-cc-head">
        <div>
          <span class="hz-cc-kicker">haze os · local session</span>
          <h2 id="hz-cc-title">Control center</h2>
        </div>
        <button class="hz-cc-x" type="button" data-cc-close aria-label="Close control center">${svg("close")}</button>
      </header>
      <div class="hz-cc-hero">
        <div class="hz-cc-clock"><b id="hz-cc-time">--:--</b><span id="hz-cc-date"></span></div>
        <div class="hz-cc-chips">
          <span class="hz-cc-chip" id="hz-cc-net"><i></i> online</span>
          <span class="hz-cc-chip"><b id="hz-cc-win-count">0</b> windows</span>
        </div>
      </div>

      <section class="hz-cc-sec">
        <div class="hz-cc-sec-head"><h3>Appearance</h3><span id="hz-cc-theme-label">haze</span></div>
        <div class="hz-cc-themes" id="hz-cc-themes"></div>
      </section>

      <section class="hz-cc-sec">
        <div class="hz-cc-sec-head"><h3>Desktop</h3><span>live</span></div>
        <div class="hz-cc-toggles" id="hz-cc-toggles"></div>
      </section>

      <section class="hz-cc-sec">
        <div class="hz-cc-sec-head">
          <h3>Open windows</h3>
          <button class="hz-cc-minall" id="hz-cc-minall" type="button">minimize all</button>
        </div>
        <div class="hz-cc-wins" id="hz-cc-wins"></div>
      </section>

      <section class="hz-cc-sec">
        <div class="hz-cc-sec-head"><h3>Quick actions</h3><span>one tap</span></div>
        <div class="hz-cc-actions" id="hz-cc-actions"></div>
      </section>

      <footer class="hz-cc-foot">
        <span>haze os 4.0</span>
        <span id="hz-cc-up">up 0:00</span>
        <span id="hz-cc-size">—</span>
      </footer>
    </aside>`;
  document.body.appendChild(root);

  const panel = root.querySelector(".hz-cc-panel");
  const themesHost = $("hz-cc-themes");
  const togglesHost = $("hz-cc-toggles");
  const winsHost = $("hz-cc-wins");
  const actionsHost = $("hz-cc-actions");

  /* ------------------------------------------------------------------------
     appearance themes
     ------------------------------------------------------------------------ */

  function buildThemes() {
    const source = [...document.querySelectorAll("#theme-grid .theme-swatch")];
    themesHost.innerHTML = "";
    for (const swatch of source) {
      const name = swatch.dataset.theme || "haze";
      const label = swatch.querySelector("span:last-child")?.textContent?.trim() || name;
      const chip = swatch.querySelector(".swatch");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hz-cc-theme";
      btn.dataset.theme = name;
      btn.title = "Use " + label;
      btn.innerHTML =
        '<i style="' + (chip?.getAttribute("style") || "") + '"></i><span>' +
        escapeText(label) +
        "</span>";
      btn.addEventListener("click", () => {
        swatch.click();
        paintThemes();
      });
      themesHost.appendChild(btn);
    }
    paintThemes();
  }

  function paintThemes() {
    const current = document.documentElement.dataset.theme || "haze";
    themesHost.querySelectorAll(".hz-cc-theme").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.theme === current);
    });
    const currentBtn = themesHost.querySelector('.hz-cc-theme[data-theme="' + current + '"]');
    const label = currentBtn?.querySelector("span")?.textContent || current;
    const target = $("hz-cc-theme-label");
    if (target) target.textContent = label;
  }

  /* ------------------------------------------------------------------------
     toggles
     ------------------------------------------------------------------------ */

  const CHECKBOX_TOGGLES = {
    glass: "glass-toggle",
    particles: "particles-toggle",
    opaque: "opaque-toggle",
  };

  const TOGGLES = [
    {
      id: "windows",
      label: "Floating windows",
      desc: "Drag, resize and stack apps",
      read: () => !!window.hazeWindows?.enabled?.(),
      set: (next) => window.hazeWindows?.setEnabled?.(next),
    },
    {
      id: "glass",
      label: "Liquid glass",
      desc: "Frosted panels and blur",
      read: () => !!$(CHECKBOX_TOGGLES.glass)?.checked,
      set: () => $(CHECKBOX_TOGGLES.glass)?.click(),
    },
    {
      id: "particles",
      label: "Particles",
      desc: "Ambient motes behind the desktop",
      read: () => !!$(CHECKBOX_TOGGLES.particles)?.checked,
      set: () => $(CHECKBOX_TOGGLES.particles)?.click(),
    },
    {
      id: "opaque",
      label: "Solid panels",
      desc: "Reduce transparency",
      read: () => !!$(CHECKBOX_TOGGLES.opaque)?.checked,
      set: () => $(CHECKBOX_TOGGLES.opaque)?.click(),
    },
    {
      id: "focus",
      label: "Focus mode",
      desc: "Quiet the home stage",
      read: () => focusMode,
      set: (next) => setFocusMode(next),
    },
  ];

  function setFocusMode(next) {
    focusMode = !!next;
    document.body.classList.toggle("hz-focus", focusMode);
    try {
      localStorage.setItem(FOCUS_KEY, focusMode ? "1" : "0");
    } catch {}
    toast(focusMode ? "Focus mode on" : "Focus mode off");
    paintToggles();
  }

  function buildToggles() {
    togglesHost.innerHTML = "";
    for (const item of TOGGLES) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hz-cc-toggle";
      btn.dataset.toggle = item.id;
      btn.setAttribute("role", "switch");
      btn.innerHTML =
        '<span class="hz-cc-toggle-copy"><b>' +
        escapeText(item.label) +
        "</b><small>" +
        escapeText(item.desc) +
        '</small></span><i aria-hidden="true"></i>';
      btn.addEventListener("click", () => {
        const next = !item.read();
        item.set(next);
        paintToggles();
      });
      togglesHost.appendChild(btn);
    }
    paintToggles();
  }

  function paintToggles() {
    for (const item of TOGGLES) {
      const btn = togglesHost.querySelector('.hz-cc-toggle[data-toggle="' + item.id + '"]');
      if (!btn) continue;
      const on = !!item.read();
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-checked", String(on));
    }
  }

  /* ------------------------------------------------------------------------
     window list
     ------------------------------------------------------------------------ */

  function renderWindows() {
    const list = window.hazeWindows?.list?.() || [];
    winsHost.innerHTML = "";
    const count = $("hz-cc-win-count");
    if (count) count.textContent = String(list.length);
    const minAll = $("hz-cc-minall");
    if (minAll) minAll.disabled = !list.length;

    if (!list.length) {
      const p = document.createElement("p");
      p.className = "hz-cc-empty";
      p.textContent = "No windows open. Launch an app from the dock or Start menu.";
      winsHost.appendChild(p);
      return;
    }

    for (const win of list) {
      const row = document.createElement("div");
      row.className = "hz-cc-win" + (win.focused ? " on" : "");
      row.innerHTML =
        '<span class="hz-cc-win-ico">' +
        svg(win.view === "settings" ? "gear" : win.view === "terminal" ? "term" : win.view === "chat" ? "chat" : "apps") +
        '</span><span class="hz-cc-win-meta"><b>' +
        escapeText(win.label) +
        "</b><small>" +
        (win.minimized ? "minimized" : win.maximized ? "maximized" : "open") +
        '</small></span><button type="button" class="hz-cc-win-btn" data-win-focus="' +
        escapeText(win.view) +
        '" title="Focus window">' +
        svg("arrow") +
        '</button><button type="button" class="hz-cc-win-btn danger" data-win-close="' +
        escapeText(win.view) +
        '" title="Close window">' +
        svg("close") +
        "</button>";
      winsHost.appendChild(row);
    }
  }

  winsHost.addEventListener("click", (e) => {
    const focusBtn = e.target.closest("[data-win-focus]");
    if (focusBtn) {
      window.hazeWindows?.open?.(focusBtn.dataset.winFocus);
      return;
    }
    const closeBtn = e.target.closest("[data-win-close]");
    if (closeBtn) window.hazeWindows?.close?.(closeBtn.dataset.winClose);
  });

  $("hz-cc-minall")?.addEventListener("click", () => {
    window.hazeWindows?.minimizeAll?.();
    renderWindows();
  });

  /* ------------------------------------------------------------------------
     quick actions
     ------------------------------------------------------------------------ */

  function closeThen(fn) {
    close();
    setTimeout(fn, 80);
  }

  const ACTIONS = [
    { label: "Start", icon: "grid", run: () => closeThen(() => window.hazeDesktop?.open?.()) },
    { label: "Apps", icon: "apps", run: () => closeThen(() => go("apps")) },
    { label: "Arcade", icon: "game", run: () => closeThen(() => window.hazeArcade?.open?.()) },
    { label: "Terminal", icon: "term", run: () => closeThen(() => window.hazeOS?.terminal?.()) },
    { label: "Palette", icon: "search", run: () => closeThen(() => window.hazeOS?.palette?.()) },
    { label: "Lock", icon: "lock", run: () => closeThen(() => window.hazeDesktop?.lock?.()) },
  ];

  function buildActions() {
    actionsHost.innerHTML = "";
    for (const action of ACTIONS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hz-cc-action";
      btn.innerHTML = svg(action.icon) + "<span>" + escapeText(action.label) + "</span>";
      btn.addEventListener("click", action.run);
      actionsHost.appendChild(btn);
    }
  }

  /* ------------------------------------------------------------------------
     live status
     ------------------------------------------------------------------------ */

  function tick() {
    if (root.hidden) return;
    const now = new Date();
    const time = $("hz-cc-time");
    const date = $("hz-cc-date");
    if (time) time.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (date) date.textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
    const net = $("hz-cc-net");
    if (net) {
      net.classList.toggle("off", !navigator.onLine);
      net.innerHTML = "<i></i> " + (navigator.onLine ? "online" : "offline");
    }
    const uptime = $("hz-cc-up");
    if (uptime) {
      const secs = Math.floor(performance.now() / 1000);
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      uptime.textContent = "up " + (h ? h + ":" + String(m).padStart(2, "0") : m + ":" + String(secs % 60).padStart(2, "0"));
    }
    const size = $("hz-cc-size");
    if (size) size.textContent = innerWidth + " × " + innerHeight;
  }

  function refresh() {
    paintThemes();
    paintToggles();
    renderWindows();
    tick();
  }

  /* ------------------------------------------------------------------------
     open / close
     ------------------------------------------------------------------------ */

  let lastFocus = null;

  function open() {
    if (!root.hidden) return;
    if (window.hazeDesktop?.isLocked?.()) return;
    if ($("hz-boot") && !$("hz-boot").hidden) return;
    try {
      window.hazeDesktop?.close?.();
      window.hazeOSBridge?.closePalette?.();
    } catch {}
    lastFocus = document.activeElement;
    root.hidden = false;
    root.classList.add("on");
    ccBtn.classList.add("active");
    ccBtn.setAttribute("aria-expanded", "true");
    refresh();
    setTimeout(() => panel.focus({ preventScroll: true }), 40);
  }

  function close() {
    if (root.hidden) return;
    root.classList.remove("on");
    root.hidden = true;
    ccBtn.classList.remove("active");
    ccBtn.setAttribute("aria-expanded", "false");
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus({ preventScroll: true });
  }

  function toggle() {
    if (root.hidden) open();
    else close();
  }

  ccBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  });

  root.querySelectorAll("[data-cc-close]").forEach((el) => el.addEventListener("click", close));

  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape" && !root.hidden) {
        e.preventDefault();
        close();
        return;
      }
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyC") {
        e.preventDefault();
        if (window.hazeDesktop?.isLocked?.()) return;
        toggle();
      }
    },
    true
  );

  document.addEventListener("haze:windows", () => {
    if (!root.hidden) refresh();
    else paintToggles();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !root.hidden) refresh();
  });

  new MutationObserver(() => {
    if (!root.hidden) paintThemes();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  window.addEventListener("online", tick);
  window.addEventListener("offline", tick);

  /* ------------------------------------------------------------------------
     desktop icons
     ------------------------------------------------------------------------ */

  const DESK = [
    { label: "Apps", view: "apps", icon: "apps" },
    { label: "Arcade", arcade: true, icon: "game" },
    { label: "Chat", view: "chat", icon: "chat" },
    { label: "Terminal", view: "terminal", icon: "term" },
    { label: "Settings", view: "settings", icon: "gear" },
    { label: "Control", control: true, icon: "sliders" },
  ];

  const deskHost = document.querySelector(".view-home");
  if (deskHost) {
    const wrap = document.createElement("nav");
    wrap.className = "hz-desk-icons";
    wrap.setAttribute("aria-label", "Desktop icons");
    for (const item of DESK) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hz-desk-icon";
      btn.title = item.label;
      btn.setAttribute("aria-label", item.label);
      btn.innerHTML = '<span class="hz-desk-tile">' + svg(item.icon) + "</span><span>" + escapeText(item.label) + "</span>";
      btn.addEventListener("click", () => {
        if (item.arcade) window.hazeArcade?.open?.();
        else if (item.control) open();
        else go(item.view);
      });
      wrap.appendChild(btn);
    }
    deskHost.appendChild(wrap);
  }

  /* ------------------------------------------------------------------------
     desktop context menu
     ------------------------------------------------------------------------ */

  const menu = document.createElement("div");
  menu.id = "hz-desk-menu";
  menu.className = "hz-desk-menu";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  document.body.appendChild(menu);

  function menuItems() {
    return [
      { label: "Open Start menu", icon: "grid", run: () => window.hazeDesktop?.open?.() },
      { label: "Open Control Center", icon: "sliders", run: open },
      { sep: true },
      { label: "Next theme", icon: "grid", run: () => window.hazeOS?.nextTheme?.() },
      {
        label: "Floating windows: " + (window.hazeWindows?.enabled?.() ? "on" : "off"),
        icon: "apps",
        run: () => window.hazeWindows?.toggle?.(),
      },
      { sep: true },
      { label: "Lock screen", icon: "lock", run: () => window.hazeDesktop?.lock?.() },
      { label: "Open terminal", icon: "term", run: () => window.hazeOS?.terminal?.() },
      { label: "Reload haze", icon: "arrow", run: () => location.reload() },
    ];
  }

  function buildMenu() {
    menu.innerHTML = "";
    for (const item of menuItems()) {
      if (item.sep) {
        const sep = document.createElement("div");
        sep.className = "hz-desk-menu-sep";
        menu.appendChild(sep);
        continue;
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hz-desk-menu-item";
      btn.setAttribute("role", "menuitem");
      btn.innerHTML = svg(item.icon) + "<span>" + escapeText(item.label) + "</span>";
      btn.addEventListener("click", () => {
        closeMenu();
        item.run();
      });
      menu.appendChild(btn);
    }
  }

  function openMenu(x, y) {
    buildMenu();
    menu.hidden = false;
    const rect = menu.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(x, innerWidth - rect.width - 8)) + "px";
    menu.style.top = Math.max(8, Math.min(y, innerHeight - rect.height - 8)) + "px";
  }

  function closeMenu() {
    menu.hidden = true;
  }

  if (deskHost) {
    deskHost.addEventListener("contextmenu", (e) => {
      if (e.target.closest("input, textarea, select, iframe")) return;
      e.preventDefault();
      openMenu(e.clientX, e.clientY);
    });
  }

  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!menu.hidden && !menu.contains(e.target)) closeMenu();
    },
    true
  );
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) closeMenu();
  });
  window.addEventListener("blur", closeMenu);
  window.addEventListener("resize", closeMenu);

  /* ------------------------------------------------------------------------
     terminal + init
     ------------------------------------------------------------------------ */

  if (window.hazeOS?.registerCommands) {
    window.hazeOS.registerCommands([
      ["control", "open the control center"],
      ["focus", "toggle focus mode"],
    ]);
    window.hazeOS.onLine?.((line) => {
      const cmd = String(line || "").trim().split(/\s+/)[0].toLowerCase();
      if (cmd === "control") {
        open();
        return true;
      }
      if (cmd === "focus") {
        setFocusMode(!focusMode);
        return true;
      }
      return false;
    });
  }

  buildThemes();
  buildToggles();
  buildActions();
  tick();
  setInterval(tick, 1000);

  if (!reduceMotion) {
    /* re-read a theme changed by a settings iframe or a terminal command */
    setInterval(() => {
      if (!root.hidden) paintThemes();
    }, 2000);
  }

  window.hazeControl = {
    open,
    close,
    toggle,
    isOpen: () => !root.hidden,
    focusMode: () => focusMode,
    setFocusMode,
  };
})();
