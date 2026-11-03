/* ==========================================================================
   haze desktop — start menu, quick actions, lock screen
   Adds a real desktop surface without moving the existing views around.
   ========================================================================== */

(() => {
  "use strict";

  if (window.hazeDesktop) return;

  const $ = (id) => document.getElementById(id);
  const STORE_KEY = "haze-desktop-recent-v1";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const GD = "https://raw.githack.com";

  const ICONS = {
    home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.6v-6H9.6v6H5a1 1 0 0 1-1-1z"/>',
    game: '<path d="M6 12h4m-2-2v4"/><path d="M15.5 11h.01M18 13h.01"/><path d="M17.3 5H6.7a4.7 4.7 0 0 0-4.6 5.6l1 5.2A3 3 0 0 0 8 17.5l1.5-1.5h5L16 17.5a3 3 0 0 0 4.9-1.7l1-5.2A4.7 4.7 0 0 0 17.3 5Z"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    spark: '<path d="M12 3.5l1.8 4.8 4.7 1.8-4.7 1.8L12 16.7l-1.8-4.8L5.5 10l4.7-1.8z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    cloud: '<path d="M17.5 19a4.5 4.5 0 0 0 .42-8.98 6.5 6.5 0 0 0-12.6 1.74A4 4 0 0 0 6 19h11.5Z"/><path d="M8 15v3m4-4v5m4-6v6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
    term: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 9.5l3 2.5-3 2.5"/><path d="M12.5 15h4.5"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><path d="M12 14.5v2.5"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M15.8 15.8L20.5 20.5"/>',
    arrow: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
    apps: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.4 3.6 5.3 3.6 8.5S14.4 18.1 12 20.5C9.6 18.1 8.4 15.2 8.4 12S9.6 5.9 12 3.5Z"/>',
    palette: '<circle cx="12" cy="12" r="8.5"/><circle cx="8.5" cy="10" r="1"/><circle cx="12" cy="7.8" r="1"/><circle cx="15.5" cy="10" r="1"/><path d="M12 20.5c-1.2 0-1.8-.8-1.8-1.8 0-1.4 1.3-1.6 1.3-2.9 0-1.1-.9-1.8-2-1.8"/>',
    power: '<path d="M12 3v8"/><path d="M6.6 6.6a8 8 0 1 0 10.8 0"/>',
  };

  const svg = (name) =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (ICONS[name] || ICONS.grid) +
    "</svg>";

  /* ------------------------------------------------------------------------
     apps
     ------------------------------------------------------------------------ */

  const go = (view) => {
    close();
    if (window.hazeOSBridge?.go) window.hazeOSBridge.go(view);
    else window.hazeGo?.(view);
  };

  const APPS = [
    { id: "home", name: "Home", desc: "Clock, search and widgets", icon: "home", run: () => go("home") },
    { id: "arcade", name: "Arcade", desc: "Snake and Breakout, fully offline", icon: "game", run: () => { close(); window.hazeArcade?.open(); } },
    { id: "apps", name: "App library", desc: "Built-in, GitHub and web apps", icon: "apps", run: () => go("apps") },
    { id: "games", name: "Games", desc: "Browser game zones", icon: "game", run: () => go("games") },
    { id: "music", name: "Music", desc: "Search, playlists and queue", icon: "music", run: () => go("music") },
    { id: "ai", name: "AI", desc: "18+ models, streaming answers", icon: "spark", run: () => go("ai") },
    { id: "chat", name: "Chat", desc: "On-device rooms with reactions", icon: "chat", run: () => go("chat") },
    { id: "cloud", name: "Cloud gaming", desc: "Stream through your own backend", icon: "cloud", run: () => go("cloud") },
    { id: "settings", name: "Settings", desc: "Theme, proxy, cloak and privacy", icon: "gear", run: () => go("settings") },
    { id: "theme", name: "Next theme", desc: "Cycle every palette", icon: "moon", run: () => { close(); window.hazeOS?.nextTheme?.(); } },
    { id: "palette", name: "Command palette", desc: "Every shell command in one list", icon: "search", run: () => { close(); window.hazeOS?.palette?.(); } },
    { id: "lock", name: "Lock screen", desc: "Hide the desktop instantly", icon: "lock", run: () => lock() },
    { id: "terminal", name: "Terminal", desc: "Shell and virtual disk", icon: "term", run: () => { close(); window.hazeOS?.terminal?.(); } },
  ];

  const GITHUB = [
    { id: "g-nautilus", name: "NautilusOS", by: "nautilus-os", desc: "Windows, app store, three browsers", url: GD + "/nautilus-os/NautilusOS/main/NautilusOS-OneFile/index.html" },
    { id: "g-flux", name: "Flux OS", by: "blockfreeubg", desc: "JSON app launcher with proxy windows", url: GD + "/blockfreeubg/flux-os/main/index.html" },
    { id: "g-nebuli", name: "NebuliOS", by: "Nebuli-OS", desc: "Tabs, address bar, resizable windows", url: GD + "/Nebuli-OS/NebuliOS-v1/main/main.html" },
    { id: "g-anura", name: "AnuraOS", by: "MercuryWorkshop", desc: "Full desktop with marketplace", url: GD + "/MercuryWorkshop/anuraOS/main/public/index.html" },
    { id: "g-secrecy", name: "Secrecy", by: "frozenfinale", desc: "SVG-cloaked launcher vault", url: GD + "/frozenfinale/secrecy/main/index.html" },
    { id: "g-synapse", name: "Synapse Lite", by: "blockfreeubg", desc: "Single-file proxy shell", url: GD + "/blockfreeubg/synapse-lite/main/index.html" },
  ];

  const githubApps = () =>
    GITHUB.map((g) => ({
      ...g,
      icon: "globe",
      run: () => { close(); window.hazeLaunch?.(g.url); },
    }));

  const allApps = () => APPS.concat(githubApps());

  /* ------------------------------------------------------------------------
     recent apps
     ------------------------------------------------------------------------ */

  function readRecent() {
    try {
      const list = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      return Array.isArray(list) ? list.filter((id) => typeof id === "string").slice(0, 5) : [];
    } catch {
      return [];
    }
  }

  function remember(id) {
    const list = readRecent().filter((x) => x !== id);
    list.unshift(id);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, 5)));
    } catch {}
  }

  /* ------------------------------------------------------------------------
     clock + greeting
     ------------------------------------------------------------------------ */

  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return "still up";
    if (h < 12) return "good morning";
    if (h < 18) return "good afternoon";
    if (h < 22) return "good evening";
    return "good night";
  }

  function timeText() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function dateText() {
    return new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  }

  function paintClock() {
    const t = timeText();
    const d = dateText();
    const lnTime = $("hz-ln-time");
    const lnDate = $("hz-ln-date");
    if (lnTime) lnTime.textContent = t;
    if (lnDate) lnDate.textContent = d;
    const lt = $("hz-lock-time");
    const ld = $("hz-lock-date");
    if (lt) lt.textContent = t;
    if (ld) ld.textContent = d;
  }

  /* ------------------------------------------------------------------------
     DOM
     ------------------------------------------------------------------------ */

  const wrap = document.createElement("div");
  wrap.className = "hz-ln-wrap";
  wrap.id = "hz-ln-wrap";
  wrap.hidden = true;
  wrap.innerHTML = `
    <div class="hz-ln" role="dialog" aria-modal="true" aria-label="Start menu">
      <header class="hz-ln-head">
        <div class="hz-ln-id">
          <span class="hz-ln-avatar" aria-hidden="true">h</span>
          <span><b>haze</b><small id="hz-ln-session">local session</small></span>
        </div>
        <div class="hz-ln-clock"><b id="hz-ln-time">--:--</b><small id="hz-ln-date"></small></div>
        <button class="hz-ln-close" id="hz-ln-close" type="button">esc</button>
      </header>
      <label class="hz-ln-search">
        ${svg("search")}
        <input id="hz-ln-input" type="text" placeholder="Search apps, games and actions" autocomplete="off" spellcheck="false" />
        <kbd>↵</kbd>
      </label>
      <div class="hz-ln-quick" id="hz-ln-quick"></div>
      <div class="hz-ln-scroll" id="hz-ln-scroll">
        <section class="hz-ln-sec" id="hz-ln-recent-sec" hidden>
          <div class="hz-ln-sec-head"><h4>Recent</h4></div>
          <div class="hz-ln-grid hz-ln-recent" id="hz-ln-recent"></div>
        </section>
        <section class="hz-ln-sec">
          <div class="hz-ln-sec-head"><h4>Apps</h4><span id="hz-ln-count"></span></div>
          <div class="hz-ln-grid" id="hz-ln-apps"></div>
        </section>
        <section class="hz-ln-sec" id="hz-ln-gh-sec">
          <div class="hz-ln-sec-head"><h4>GitHub picks</h4><button id="hz-ln-all" type="button">All apps →</button></div>
          <div class="hz-ln-grid hz-ln-gh-grid" id="hz-ln-gh"></div>
        </section>
      </div>
      <footer class="hz-ln-foot">
        <span>Ctrl Space start · ⌘K palette · Esc close</span>
        <button id="hz-ln-settings" type="button">Settings</button>
      </footer>
    </div>`;
  document.body.appendChild(wrap);

  const panel = wrap.querySelector(".hz-ln");
  const input = $("hz-ln-input");
  const appsGrid = $("hz-ln-apps");
  const recentGrid = $("hz-ln-recent");
  const recentSec = $("hz-ln-recent-sec");
  const ghGrid = $("hz-ln-gh");
  const ghSec = $("hz-ln-gh-sec");
  const countEl = $("hz-ln-count");

  const lockEl = document.createElement("div");
  lockEl.className = "hz-lock";
  lockEl.id = "hz-lock";
  lockEl.hidden = true;
  lockEl.innerHTML = `
    <div class="hz-lock-card">
      <div class="hz-lock-brand"><b>haze</b><span>os · local session</span></div>
      <div class="hz-lock-time" id="hz-lock-time">--:--</div>
      <div class="hz-lock-date" id="hz-lock-date"></div>
      <p class="hz-lock-note">This session stays on this device. Nothing is uploaded.</p>
      <button class="hz-lock-btn" id="hz-lock-btn" type="button">${svg("lock")} Click or press any key</button>
    </div>`;
  document.body.appendChild(lockEl);

  const lockBtn = $("hz-lock-btn");

  /* ------------------------------------------------------------------------
     quick actions
     ------------------------------------------------------------------------ */

  const QUICK = [
    { label: "Arcade", icon: "game", run: () => { close(); window.hazeArcade?.open(); } },
    { label: "App library", icon: "apps", run: () => go("apps") },
    { label: "Palette", icon: "search", run: () => { close(); window.hazeOS?.palette?.(); } },
    { label: "Theme", icon: "moon", run: () => { close(); window.hazeOS?.nextTheme?.(); } },
    { label: "Lock", icon: "lock", run: () => lock() },
    { label: "Terminal", icon: "term", run: () => { close(); window.hazeOS?.terminal?.(); } },
  ];

  const quickEl = $("hz-ln-quick");
  for (const action of QUICK) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "hz-ln-chip";
    chip.innerHTML = svg(action.icon);
    const label = document.createElement("span");
    label.textContent = action.label;
    chip.appendChild(label);
    chip.addEventListener("click", action.run);
    quickEl.appendChild(chip);
  }

  /* ------------------------------------------------------------------------
     tiles + search
     ------------------------------------------------------------------------ */

  function tile(app) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hz-ln-app";
    btn.dataset.id = app.id;

    const ico = document.createElement("span");
    ico.className = "hz-ln-ico";
    ico.innerHTML = svg(app.icon);

    const meta = document.createElement("span");
    meta.className = "hz-ln-meta";
    const name = document.createElement("b");
    name.textContent = app.name;
    const desc = document.createElement("small");
    desc.textContent = app.desc || "";
    meta.append(name, desc);

    btn.append(ico, meta);
    if (app.by) {
      const by = document.createElement("span");
      by.className = "hz-ln-by";
      by.textContent = "@" + app.by;
      btn.appendChild(by);
    }

    btn.addEventListener("click", () => run(app));
    return btn;
  }

  function fill(grid, list) {
    grid.innerHTML = "";
    for (const app of list) grid.appendChild(tile(app));
  }

  const visibleTiles = () =>
    [...panel.querySelectorAll(".hz-ln-app")].filter((el) => el.offsetParent !== null);

  function markFirst() {
    const first = visibleTiles()[0];
    first?.classList.add("on");
  }

  let results = [];

  function render() {
    const q = input.value.trim().toLowerCase();
    const apps = allApps();

    if (q) {
      results = apps.filter((app) =>
        (app.name + " " + (app.desc || "") + " " + (app.by || "")).toLowerCase().includes(q)
      );
      recentSec.hidden = true;
      ghSec.hidden = true;
      recentGrid.innerHTML = "";
      ghGrid.innerHTML = "";
      appsGrid.innerHTML = "";
      countEl.textContent = results.length + (results.length === 1 ? " result" : " results");
      if (results.length) {
        for (const app of results) appsGrid.appendChild(tile(app));
      } else {
        const empty = document.createElement("p");
        empty.className = "hz-ln-empty";
        empty.innerHTML = 'No matches. Try <b>arcade</b>, <b>apps</b> or <b>lock</b>.';
        appsGrid.appendChild(empty);
      }
    } else {
      results = apps;
      const recent = readRecent()
        .map((id) => apps.find((app) => app.id === id))
        .filter(Boolean);
      recentSec.hidden = !recent.length;
      fill(recentGrid, recent);
      fill(appsGrid, APPS);
      fill(ghGrid, githubApps());
      ghSec.hidden = false;
      countEl.textContent = apps.length + " apps · " + GITHUB.length + " GitHub picks";
    }

    markFirst();
    const scroller = $("hz-ln-scroll");
    if (scroller) scroller.scrollTop = 0;
  }

  function run(app) {
    if (!app) return;
    remember(app.id);
    app.run();
  }

  /* ------------------------------------------------------------------------
     start menu open/close
     ------------------------------------------------------------------------ */

  let clockTimer = 0;
  let lockTimer = 0;
  let sel = 0;

  function arcadeOpen() {
    const arcade = $("hz-arcade");
    return Boolean(arcade && !arcade.hidden);
  }

  function open() {
    if (!lockEl.hidden || arcadeOpen()) return;
    window.hazeOSBridge?.closePalette?.();
    const sheet = $("hz-sheet");
    if (sheet) sheet.hidden = true;
    wrap.hidden = false;
    document.body.classList.add("hz-ln-open");
    input.value = "";
    paintClock();
    const theme = document.documentElement.dataset.theme || "haze";
    const session = $("hz-ln-session");
    if (session) session.textContent = greeting() + " · " + (navigator.onLine ? "online" : "offline") + " · " + theme;
    render();
    clearInterval(clockTimer);
    clockTimer = setInterval(paintClock, 20000);
    setTimeout(() => input.focus(), 30);
  }

  function close() {
    if (wrap.hidden) return;
    wrap.hidden = true;
    document.body.classList.remove("hz-ln-open");
    clearInterval(clockTimer);
  }

  /* ------------------------------------------------------------------------
     lock screen
     ------------------------------------------------------------------------ */

  function lock() {
    if (!lockEl.hidden) return;
    close();
    window.hazeOSBridge?.closePalette?.();
    const sheet = $("hz-sheet");
    if (sheet) sheet.hidden = true;
    if (arcadeOpen()) window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    paintClock();
    lockEl.hidden = false;
    document.body.classList.add("hz-locked");
    clearInterval(lockTimer);
    lockTimer = setInterval(paintClock, 1000);
    setTimeout(() => lockBtn.focus(), 60);
  }

  function unlock() {
    if (lockEl.hidden) return;
    lockEl.hidden = true;
    document.body.classList.remove("hz-locked");
    clearInterval(lockTimer);
  }

  /* ------------------------------------------------------------------------
     events
     ------------------------------------------------------------------------ */

  $("hz-ln-close")?.addEventListener("click", close);
  $("hz-ln-settings")?.addEventListener("click", () => go("settings"));
  $("hz-ln-all")?.addEventListener("click", () => go("apps"));
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) close();
  });
  panel.addEventListener("click", (e) => {
    const target = e.target.closest(".hz-ln-app");
    if (!target) return;
    const all = visibleTiles();
    sel = all.indexOf(target);
  });

  input?.addEventListener("input", render);
  input?.addEventListener("keydown", (e) => {
    const all = visibleTiles();
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!all.length) return;
      sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length;
      all.forEach((el, i) => el.classList.toggle("on", i === sel));
      all[sel].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = all[sel] || all[0];
      chosen?.click();
    }
  });

  lockEl.addEventListener("click", unlock);
  lockBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    unlock();
  });

  /* locked keys are captured before games, the palette or the terminal */
  window.addEventListener(
    "keydown",
    (e) => {
      if (lockEl.hidden) return;
      if (e.key === "F5" || e.key === "F12") return;
      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      unlock();
    },
    true
  );

  window.addEventListener(
    "keydown",
    (e) => {
      if ((e.ctrlKey || e.metaKey) && e.code === "Space") {
        e.preventDefault();
        if (!lockEl.hidden) return;
        if (wrap.hidden) open();
        else close();
        return;
      }
      if (!wrap.hidden && e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        close();
      }
    },
    true
  );

  /* dock and home entry points */
  $("hz-dock-start")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    open();
  });

  $("home-arcade")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.hazeArcade?.open();
  });

  /* ------------------------------------------------------------------------
     shell integration
     ------------------------------------------------------------------------ */

  if (window.hazeOS?.registerCommands) {
    window.hazeOS.registerCommands([
      ["start", "open the start menu"],
      ["lock", "lock the screen"],
    ]);
    window.hazeOS.onLine?.((line) => {
      const cmd = String(line || "").trim().split(/\s+/)[0].toLowerCase();
      if (cmd === "start") {
        open();
        return true;
      }
      if (cmd === "lock") {
        lock();
        return true;
      }
      return false;
    });
  }

  window.hazeDesktop = {
    open,
    close,
    lock,
    unlock,
    isOpen: () => !wrap.hidden,
    isLocked: () => !lockEl.hidden,
  };

  /* keep the start clock honest after a theme change or tab wake */
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      paintClock();
      if (!wrap.hidden) render();
    }
  });

  if (reduceMotion) {
    wrap.style.transition = "none";
  }
})();
