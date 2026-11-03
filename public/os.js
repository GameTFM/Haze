/* ==========================================================================
   haze os — boot, dock, hud, terminal, shortcut sheet, matrix
   Loaded after index.js (module order) and talks to it through hazeOSBridge.
   ========================================================================== */

const $ = (id) => document.getElementById(id);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const bridge = () => window.hazeOSBridge || {};
const toast = (msg) => {
  try {
    bridge().toast?.(msg);
  } catch {}
};

document.body.classList.add("hz-os");

/* --------------------------------------------------------------------------
   helpers
   -------------------------------------------------------------------------- */

function nav(view) {
  const btn = document.querySelector('.nav-item[data-view="' + view + '"]');
  if (btn) btn.click();
  return Boolean(btn);
}

function currentView() {
  return document.querySelector(".view.active")?.dataset.viewSection || "home";
}

function openPalette() {
  const b = bridge();
  if (b.openPalette) {
    b.openPalette();
    return;
  }
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
}

/* --------------------------------------------------------------------------
   boot sequence
   -------------------------------------------------------------------------- */

const BOOT_KEY = "haze-boot-seen";
const bootEl = $("hz-boot");
const bootLog = $("hz-boot-log");
const bootFill = $("hz-boot-fill");
const bootState = $("hz-boot-state");
let bootDone = true;
let bootRunning = false;

function bootLines() {
  const theme = document.documentElement.dataset.theme || "haze";
  const widgets = [...document.querySelectorAll(".widget")].filter((w) => !w.hidden).length;
  return [
    ["kernel", "haze os 3.0"],
    ["transport", "scramjet v2 · epoxy"],
    ["surface", "theme " + theme],
    ["widgets", widgets + " active"],
    ["shell", "start · dock · arcade"],
    ["disk", "haze-vm · local"],
    ["network", navigator.onLine ? "online" : "offline"],
  ];
}

function endBoot(skipped) {
  if (!bootEl || bootDone) return;
  bootDone = true;
  bootRunning = false;
  if (bootFill) bootFill.style.width = "100%";
  if (bootState) bootState.textContent = skipped ? "skipped" : "ready";
  bootEl.classList.add("gone");
  try {
    sessionStorage.setItem(BOOT_KEY, "1");
  } catch {}
  setTimeout(() => bootEl.setAttribute("hidden", ""), 520);
  scrambleLogo();
}

async function runBoot(force) {
  if (!bootEl) return;
  let seen = false;
  try {
    seen = sessionStorage.getItem(BOOT_KEY) === "1";
  } catch {}
  if (seen && !force) {
    bootEl.setAttribute("hidden", "");
    scrambleLogo();
    return;
  }
  if (bootRunning) return;
  bootRunning = true;
  bootDone = false;
  bootEl.removeAttribute("hidden");
  bootEl.classList.remove("gone");
  bootLog.innerHTML = "";
  if (bootFill) bootFill.style.width = "0%";
  const lines = bootLines();
  for (let i = 0; i < lines.length; i++) {
    if (bootDone) return;
    const [key, val] = lines[i];
    const row = document.createElement("div");
    row.className = "hz-boot-line";
    const k = document.createElement("span");
    k.className = "hz-boot-key";
    k.textContent = key;
    const v = document.createElement("span");
    v.className = "hz-boot-val";
    v.textContent = val;
    const ok = document.createElement("span");
    ok.className = "hz-boot-ok";
    ok.textContent = "ok";
    row.append(k, v, ok);
    bootLog.appendChild(row);
    if (bootFill) bootFill.style.width = Math.round(((i + 1) / lines.length) * 100) + "%";
    if (bootState) bootState.textContent = "initialising " + (i + 1) + "/" + lines.length;
    await sleep(reduceMotion ? 45 : 170);
  }
  if (bootDone) return;
  await sleep(reduceMotion ? 140 : 430);
  endBoot(false);
}

bootEl?.addEventListener("pointerdown", () => endBoot(true));
window.addEventListener(
  "keydown",
  () => {
    if (bootRunning) endBoot(true);
  },
  true
);

/* wordmark scramble, played once the boot screen clears */
function scrambleLogo() {
  const el = document.querySelector(".view-home .home-logo");
  if (!el || reduceMotion) return;
  const final = "haze";
  const glyphs = "▚▞░▒▓/\\|=+*#@%$&";
  let frame = 0;
  const timer = setInterval(() => {
    frame++;
    let out = "";
    for (let i = 0; i < final.length; i++) {
      out += frame > 7 + i * 2 ? final[i] : glyphs[Math.floor(Math.random() * glyphs.length)];
    }
    el.textContent = out;
    if (frame > 16) {
      clearInterval(timer);
      el.textContent = final;
    }
  }, 55);
}

/* --------------------------------------------------------------------------
   hud telemetry + day progress
   -------------------------------------------------------------------------- */

const hudFps = $("hz-hud-fps");
const hudMem = $("hz-hud-mem");
const hudUp = $("hz-hud-up");
const hudNet = $("hz-hud-net");
const hudDot = $("hz-hud-dot");
const dayFill = $("hero-clock-day-fill");

(function hudLoop() {
  if (!hudFps) return;
  const started = performance.now();
  let frames = 0;
  let fps = 60;

  const tickFrames = () => {
    frames++;
    requestAnimationFrame(tickFrames);
  };
  requestAnimationFrame(tickFrames);

  const pad = (n) => String(n).padStart(2, "0");
  const paint = () => {
    fps = frames;
    frames = 0;
    hudFps.textContent = Math.min(240, fps);

    const mem = performance.memory?.usedJSHeapSize;
    hudMem.textContent = mem ? Math.round(mem / 1048576) + "mb" : "—";

    const secs = Math.floor((performance.now() - started) / 1000);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    hudUp.textContent = h ? h + ":" + pad(m) + ":" + pad(secs % 60) : pad(m) + ":" + pad(secs % 60);

    const online = navigator.onLine;
    hudNet.textContent = online ? "online" : "offline";
    hudDot?.classList.toggle("off", !online);
  };
  paint();
  setInterval(paint, 1000);

  const paintDay = () => {
    if (!dayFill) return;
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    dayFill.style.width = (((now - start) / 86400000) * 100).toFixed(1) + "%";
  };
  paintDay();
  setInterval(paintDay, 60000);
})();

/* --------------------------------------------------------------------------
   dock wiring
   -------------------------------------------------------------------------- */

$("hz-dock-palette")?.addEventListener("click", openPalette);
$("hz-dock-help")?.addEventListener("click", () => openSheet());
$("hz-dock-theme")?.addEventListener("click", () => nextTheme());

function nextTheme() {
  const swatches = [...document.querySelectorAll("#theme-grid .theme-swatch")];
  if (!swatches.length) return;
  const current = document.documentElement.dataset.theme;
  const at = swatches.findIndex((s) => s.dataset.theme === current);
  const next = swatches[(at + 1) % swatches.length];
  next.click();
  toast("theme — " + (next.dataset.theme || "haze"));
}

/* --------------------------------------------------------------------------
   terminal
   -------------------------------------------------------------------------- */

const termBody = $("hz-term-body");
const termLog = $("hz-term-log");
const termForm = $("hz-term-form");
const termInput = $("hz-term-input");
const termHistory = [];
let termAt = 0;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function termWrite(html, cls) {
  if (!termLog) return;
  const row = document.createElement("div");
  row.className = "hz-term-row" + (cls ? " " + cls : "");
  row.innerHTML = html;
  termLog.appendChild(row);
  if (termBody) termBody.scrollTop = termBody.scrollHeight;
}

const viewNames = () => [...document.querySelectorAll(".view[data-view-section]")].map((v) => v.dataset.viewSection);
const themeNames = () => [...document.querySelectorAll("#theme-grid .theme-swatch")].map((s) => s.dataset.theme);

/* commands registered by add-ons (vm.js) appear in help + Tab completion */
const commandHelp = [];
const shellHooks = [];

function registerCommands(list) {
  for (const [name, desc] of list) {
    if (!Object.prototype.hasOwnProperty.call(commands, name)) commands[name] = () => {};
    commandHelp.push([name, desc || ""]);
  }
}

const commands = {
  help() {
    const base = [
      ["help", "this list"],
      ["neofetch", "system card"],
      ["theme [name]", "switch theme — no name lists them"],
      ["open [view]", "home · games · apps · cloud · music · ai · chat · settings · terminal"],
      ["matrix", "white rain for a few seconds"],
      ["shortcuts", "keyboard sheet"],
      ["boot", "replay the boot sequence"],
      ["time / date", "clock helpers"],
      ["uptime / fps", "live telemetry"],
      ["whoami", "identity crisis"],
      ["echo …", "say it back"],
      ["clear", "wipe the scrollback"],
      ["reload", "reload haze"],
      ["exit", "back to the stage"],
    ];
    const grid = (rows) =>
      '<div class="hz-term-grid">' +
      rows.map(([c, d]) => "<span>" + escapeHtml(c) + "</span><span>" + escapeHtml(d) + "</span>").join("") +
      "</div>";
    termWrite('<div class="hz-term-mut">shell</div>' + grid(base));
    if (commandHelp.length) termWrite('<div class="hz-term-mut">vm — virtual filesystem at ~</div>' + grid(commandHelp));
  },

  neofetch() {
    const art = [
      " _  _  ____  ____  ____",
      "( \\/ )(  _ \\(_  _)(  __)",
      " \\  /  ) _ (  )(   ) _)",
      "  \\/  (____/ (__) (____)",
    ].join("\n");
    const theme = document.documentElement.dataset.theme || "haze";
    const engine = $("shell-proxy-tx")?.textContent || "scramjet";
    const info = [
      "<b>haze</b>@os",
      "─────────────",
      "os      haze os 3.0",
      "shell   haze-term",
      "theme   " + theme,
      "engine  " + engine,
      "view    " + currentView(),
      "screen  " + window.innerWidth + "×" + window.innerHeight,
      "net     " + (navigator.onLine ? "online" : "offline"),
    ].join("\n");
    termWrite(
      '<pre class="hz-term-pre">' + escapeHtml(art) + "\n\n" + info.replace(/<b>|<\/b>/g, "") + "</pre>"
    );
  },

  theme(name) {
    const names = themeNames();
    if (!name) {
      termWrite("themes: " + names.join(" · "), "hz-term-mut");
      return;
    }
    if (!names.includes(name)) {
      termWrite("no theme “" + escapeHtml(name) + "” — try: " + names.join(", "), "hz-term-err");
      return;
    }
    document.querySelector('#theme-grid [data-theme="' + name + '"]')?.click();
    termWrite("theme → " + name, "hz-term-ok");
    toast("theme — " + name);
  },

  themes() {
    termWrite("themes: " + themeNames().join(" · "), "hz-term-mut");
  },

  open(view) {
    const target = view || "home";
    if (!viewNames().includes(target)) {
      termWrite("no view “" + escapeHtml(target) + "” — " + viewNames().join(", "), "hz-term-err");
      return;
    }
    nav(target);
    termWrite("→ " + target, "hz-term-ok");
  },

  go(view) {
    commands.open(view);
  },

  matrix() {
    termWrite("wake up…", "hz-term-mut");
    runMatrix();
  },

  shortcuts() {
    openSheet();
  },

  boot() {
    runBoot(true);
  },

  time() {
    termWrite(new Date().toLocaleTimeString());
  },

  date() {
    termWrite(new Date().toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
  },

  uptime() {
    termWrite("up " + (hudUp?.textContent || "—") + " · " + (hudFps?.textContent || "—") + " fps");
  },

  fps() {
    termWrite((hudFps?.textContent || "—") + " fps · heap " + (hudMem?.textContent || "—"));
  },

  whoami() {
    termWrite("guest@haze — no account, no trackers, all local.", "hz-term-mut");
  },

  echo(...args) {
    termWrite(escapeHtml(args.join(" ")));
  },

  clear() {
    if (termLog) termLog.innerHTML = "";
  },

  reload() {
    termWrite("reloading…", "hz-term-mut");
    setTimeout(() => window.location.reload(), 260);
  },

  exit() {
    nav("home");
  },

  sudo() {
    termWrite("nice try. this terminal is decorative.", "hz-term-err");
  },

  coffee() {
    termWrite("☕ brewing… done. (it is always done)", "hz-term-mut");
  },
};

function runCommand(raw) {
  const line = raw.trim();
  if (!line) return;
  termWrite('<span class="hz-term-echo">haze@os ~ $</span> ' + escapeHtml(line));
  for (const hook of shellHooks) {
    if (hook(line)) return;
  }
  const [name, ...rest] = line.split(/\s+/);
  const cmd = commands[name.toLowerCase()];
  if (cmd) {
    try {
      cmd(rest.join(" "));
    } catch {
      termWrite("command failed — that one is broken.", "hz-term-err");
    }
  } else {
    const near = Object.keys(commands).filter((c) => c.startsWith(name[0].toLowerCase())).slice(0, 4);
    termWrite("command not found: " + escapeHtml(name) + (near.length ? " — did you mean " + near.join(", ") + "?" : ""), "hz-term-err");
  }
}

termForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = termInput.value;
  termInput.value = "";
  if (value.trim()) {
    termHistory.push(value.trim());
    if (termHistory.length > 60) termHistory.shift();
  }
  termAt = termHistory.length;
  runCommand(value);
});

termInput?.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") {
    e.preventDefault();
    if (!termHistory.length) return;
    termAt = Math.max(0, termAt - 1);
    termInput.value = termHistory[termAt] || "";
    termInput.setSelectionRange(termInput.value.length, termInput.value.length);
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    termAt = Math.min(termHistory.length, termAt + 1);
    termInput.value = termHistory[termAt] || "";
  } else if (e.key === "Tab") {
    const partial = termInput.value.trim();
    if (!partial || partial.includes(" ")) return;
    e.preventDefault();
    const hit = Object.keys(commands).filter((c) => c.startsWith(partial.toLowerCase()));
    if (hit.length === 1) termInput.value = hit[0] + " ";
    else if (hit.length > 1) termWrite(hit.join("  "), "hz-term-mut");
  } else if (e.key === "l" && e.ctrlKey) {
    e.preventDefault();
    if (termLog) termLog.innerHTML = "";
  }
});

termBody?.addEventListener("click", () => {
  if (window.getSelection()?.toString()) return;
  termInput?.focus();
});

function openTerminal() {
  if (currentView() === "terminal") {
    nav("home");
    return;
  }
  nav("terminal");
  setTimeout(() => termInput?.focus(), 80);
}

/* greet once per session, focus when the view opens */
let termGreeted = false;
const termWatcher = new MutationObserver(() => {
  const active = currentView() === "terminal";
  if (active && !termGreeted) {
    termGreeted = true;
    termWrite('<span class="hz-term-hi">haze os</span> <span class="hz-term-mut">3.0 · terminal ready</span>');
    termWrite('type <span class="hz-term-hi">help</span> to see what this thing can do.', "hz-term-mut");
    termWrite('a real virtual disk is mounted at <span class="hz-term-hi">~</span> — <span class="hz-term-hi">ls</span> to look around.', "hz-term-mut");
    termWrite("", "hz-term-mut");
  }
  if (active) setTimeout(() => termInput?.focus(), 60);
});
document.querySelectorAll(".view[data-view-section]").forEach((v) => termWatcher.observe(v, { attributes: true, attributeFilter: ["class"] }));

/* --------------------------------------------------------------------------
   shortcut sheet
   -------------------------------------------------------------------------- */

const sheet = $("hz-sheet");
const sheetGrid = $("hz-sheet-grid");

const SHORTCUTS = [
  ["⌘K / Ctrl K", "Command palette"],
  ["Ctrl Space", "Start menu"],
  ["/", "Focus the search field"],
  ["?", "This shortcut sheet"],
  ["Ctrl `", "Terminal on / off"],
  ["g", "Games"],
  ["c", "Chat"],
  ["m", "Mute music"],
  ["Esc", "Close any overlay"],
  ["↑ ↓", "Move through palette results"],
  ["Enter", "Run the selected command"],
  ["1 – 5", "Jump between views in the palette"],
  ["Tab", "Complete a terminal command"],
];

if (sheetGrid) {
  for (const [keys, label] of SHORTCUTS) {
    const row = document.createElement("div");
    row.className = "hz-sheet-row";
    const text = document.createElement("span");
    text.textContent = label;
    const kb = document.createElement("span");
    kb.className = "hz-sheet-keys";
    for (const part of keys.split(" ")) {
      const kbd = document.createElement("kbd");
      kbd.textContent = part;
      kb.appendChild(kbd);
    }
    row.append(text, kb);
    sheetGrid.appendChild(row);
  }
}

function openSheet() {
  if (!sheet) return;
  sheet.hidden = false;
}
function closeSheet() {
  if (sheet) sheet.hidden = true;
}
$("hz-sheet-close")?.addEventListener("click", closeSheet);
sheet?.addEventListener("click", (e) => {
  if (e.target === sheet) closeSheet();
});

/* --------------------------------------------------------------------------
   matrix rain
   -------------------------------------------------------------------------- */

const matrixWrap = $("hz-matrix");
const matrixCanvas = $("hz-matrix-canvas");
let matrixRaf = 0;
let matrixTimer = 0;

function runMatrix(ms = 9000) {
  if (!matrixWrap || !matrixCanvas) return;
  const ctx = matrixCanvas.getContext("2d");
  if (!ctx) return;
  matrixWrap.hidden = false;
  matrixWrap.classList.remove("gone");

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = 16;
  const resize = () => {
    matrixCanvas.width = Math.floor(window.innerWidth * dpr);
    matrixCanvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();

  const cols = Math.ceil(window.innerWidth / size);
  const drops = Array.from({ length: cols }, () => Math.random() * -60);
  const glyphs = "01ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉHAZE▚▞";
  let last = 0;

  const frame = (t) => {
    matrixRaf = requestAnimationFrame(frame);
    if (t - last < 38) return;
    last = t;
    ctx.fillStyle = "rgba(4, 4, 7, 0.13)";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.font = size + "px " + "ui-monospace, monospace";
    for (let i = 0; i < drops.length; i++) {
      const ch = glyphs[Math.floor(Math.random() * glyphs.length)];
      ctx.fillStyle = Math.random() > 0.986 ? "rgba(255,255,255,0.95)" : "rgba(180,255,215,0.5)";
      ctx.fillText(ch, i * size, drops[i] * size);
      if (drops[i] * size > window.innerHeight && Math.random() > 0.975) drops[i] = 0;
      drops[i] += 1;
    }
  };
  cancelAnimationFrame(matrixRaf);
  matrixRaf = requestAnimationFrame(frame);

  clearTimeout(matrixTimer);
  matrixTimer = setTimeout(() => {
    matrixWrap.classList.add("gone");
    setTimeout(() => {
      cancelAnimationFrame(matrixRaf);
      matrixWrap.hidden = true;
    }, 520);
  }, ms);
}

/* --------------------------------------------------------------------------
   global keys + konami
   -------------------------------------------------------------------------- */

const isTyping = (el) =>
  el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

window.addEventListener("keydown", (e) => {
  if (isTyping(e.target)) return;

  if (e.ctrlKey && e.key === "`") {
    e.preventDefault();
    openTerminal();
    return;
  }
  if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    if (sheet?.hidden) openSheet();
    else closeSheet();
    return;
  }
  if (e.key === "Escape") {
    closeSheet();
  }
});

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
let konamiAt = 0;
window.addEventListener("keydown", (e) => {
  if (isTyping(e.target)) return;
  if (e.key.toLowerCase() === KONAMI[konamiAt].toLowerCase()) {
    konamiAt++;
    if (konamiAt === KONAMI.length) {
      konamiAt = 0;
      runMatrix(7000);
      toast("↑↑↓↓←→←→BA — haze unlocked");
    }
  } else {
    konamiAt = e.key === KONAMI[0] ? 1 : 0;
  }
});

/* --------------------------------------------------------------------------
   public api (used by the palette commands in index.js)
   -------------------------------------------------------------------------- */

window.hazeOS = {
  terminal: openTerminal,
  shortcuts: openSheet,
  boot: (force = true) => runBoot(force),
  matrix: runMatrix,
  nextTheme,
  palette: openPalette,
  toast,
  registerCommands,
  onLine: (fn) => shellHooks.push(fn),
  term: {
    write: (text, cls) => termWrite(escapeHtml(String(text ?? "")), cls),
    html: (markup, cls) => termWrite(markup, cls),
    clear: () => { if (termLog) termLog.innerHTML = ""; },
    run: runCommand,
    focus: () => termInput?.focus(),
    setPrompt: (label) => {
      const el = document.querySelector(".hz-term-prompt em");
      if (el) el.textContent = label || "~";
    },
  },
};

runBoot(false);
