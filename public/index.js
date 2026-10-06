"use strict";

/**
 * @type {HTMLFormElement}
 */
const form = document.getElementById("sj-form");
/**
 * @type {HTMLInputElement}
 */
const address = document.getElementById("sj-address");
/**
 * @type {HTMLInputElement}
 */
const searchEngine = document.getElementById("sj-search-engine");
/**
 * @type {HTMLParagraphElement}
 */
const error = document.getElementById("sj-error");
/**
 * @type {HTMLPreElement}
 */
const errorCode = document.getElementById("sj-error-code");
/**
 * @type {HTMLButtonElement}
 */
const frameExit = document.getElementById("frame-exit");

// classic-script bundles expose their APIs as globals (template wiring):
//   /scramjet/scramjet.js      -> $scramjet (runtime + defaultConfig)
//   /controller/controller.api.js -> $scramjetController (Controller class)
//   /epoxy/index.js            -> EpoxyTransport (scramjet wisp transport)
//   /baremux/index.js          -> BareMux (ultraviolet transport mux)
//   /uv/uv.bundle.js + uv.config.js -> Ultraviolet codec + __uv$config
const { Controller } = $scramjetController;
const { defaultConfig } = $scramjet;
const SJTransport = self.EpoxyTransport.default;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let controller = null;
/** @type {any} */
let activeFrame = null;

/* ================================================================
   sidebar navigation
   ================================================================ */

const navItems = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");

navItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;
    navItems.forEach((b) => b.classList.toggle("active", b === btn));
    views.forEach((v) => v.classList.toggle("active", v.dataset.viewSection === view));
  });
});

/* ================================================================
   haze games fullscreen
   ================================================================ */

const gamesFullscreenBtn = document.getElementById("games-fullscreen");
const gamesWrap = document.querySelector(".games-wrap");

gamesFullscreenBtn.addEventListener("click", () => {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else {
    gamesWrap.requestFullscreen().catch(() => {});
  }
});

document.addEventListener("fullscreenchange", () => {
  gamesFullscreenBtn.innerHTML = document.fullscreenElement
    ? "&#9974;&nbsp; Exit fullscreen"
    : "&#9974;&nbsp; Fullscreen";
});

/* ================================================================
   haze apps fullscreen (same pattern as the games pane)
   ================================================================ */

const appsFullscreenBtn = document.getElementById("apps-fullscreen");
const appsWrap = document.querySelector(".apps-wrap");

appsFullscreenBtn?.addEventListener("click", () => {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else {
    appsWrap.requestFullscreen().catch(() => {});
  }
});

document.addEventListener("fullscreenchange", () => {
  if (!appsFullscreenBtn) return;
  const onGames = gamesWrap.contains(document.fullscreenElement);
  const onApps = appsWrap?.contains(document.fullscreenElement);
  if (!onGames && !onApps) return; // each pane updates its own label via the shared listener above
  appsFullscreenBtn.innerHTML = document.fullscreenElement
    ? "&#9974;&nbsp; Exit fullscreen"
    : "&#9974;&nbsp; Fullscreen";
});

/* ================================================================
   settings: themes / wallpaper / search engine (persisted locally)
   ================================================================ */

const STORE_KEY = "haze-settings";

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch };
  localStorage.setItem(STORE_KEY, JSON.stringify(next));
}

/* ---- themes ---- */

const THEMES = [
  { id: "haze", label: "haze", from: "#050505", to: "#1a1a1a" },
  { id: "glass", label: "Liquid Glass", from: "#f5f7fb", to: "#c3cfe6" },
  { id: "galaxy", label: "Galaxy", from: "#07020f", to: "#3b2470" },
  { id: "midnight", label: "Midnight", from: "#04070d", to: "#12315e" },
  { id: "cream", label: "Cream", from: "#faf8f2", to: "#e6ddc8" },
  { id: "rose", label: "Rose", from: "#0c0507", to: "#6e2440" },
  { id: "matrix", label: "Matrix", from: "#010602", to: "#0c4d26" },
];

const themeGrid = document.getElementById("theme-grid");

for (const t of THEMES) {
  const swatch = document.createElement("button");
  swatch.type = "button";
  swatch.className = "theme-swatch";
  swatch.dataset.theme = t.id;
  swatch.innerHTML = `<span class="swatch" style="background:linear-gradient(135deg, ${t.from}, ${t.to})"></span><span>${t.label}</span>`;
  swatch.addEventListener("click", () => applyTheme(t.id));
  themeGrid.appendChild(swatch);
}

function applyTheme(id) {
  if (!THEMES.some((t) => t.id === id)) id = "haze";
  document.documentElement.dataset.theme = id;
  saveSettings({ theme: id });
  themeGrid.querySelectorAll(".theme-swatch").forEach((el) => {
    el.classList.toggle("active", el.dataset.theme === id);
  });
}

/* ---- wallpaper ---- */

const wallpaperInput = document.getElementById("wallpaper-input");
const wallpaperClear = document.getElementById("wallpaper-clear");
const wallpaperPreview = document.getElementById("wallpaper-preview");
const wallpaperLayer = document.getElementById("wallpaper");

function applyWallpaper(dataUrl) {
  if (dataUrl) {
    wallpaperLayer.style.backgroundImage = `url(${dataUrl})`;
    wallpaperLayer.classList.add("visible");
    wallpaperPreview.style.backgroundImage = `url(${dataUrl})`;
    wallpaperPreview.hidden = false;
    wallpaperClear.hidden = false;
  } else {
    wallpaperLayer.style.backgroundImage = "";
    wallpaperLayer.classList.remove("visible");
    wallpaperPreview.hidden = true;
    wallpaperClear.hidden = true;
  }
}

wallpaperInput.addEventListener("change", () => {
  const file = wallpaperInput.files && wallpaperInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      localStorage.setItem("haze-wallpaper", String(reader.result));
      applyWallpaper(String(reader.result));
    } catch {
      // image too large for localStorage (~5MB) - apply for this session only
      applyWallpaper(String(reader.result));
      wallpaperClear.hidden = false;
      error.textContent = "Image too large to save permanently — applied for this session.";
      setTimeout(() => (error.textContent = ""), 4000);
    }
  };
  reader.readAsDataURL(file);
});

wallpaperClear.addEventListener("click", () => {
  localStorage.removeItem("haze-wallpaper");
  applyWallpaper(null);
});

/* ---- search engine ---- */

const engineSelect = document.getElementById("engine-select");
const ENGINES = {
  brave: "https://search.brave.com/search?q=%s",
  google: "https://www.google.com/search?q=%s",
  duckduckgo: "https://duckduckgo.com/?q=%s",
  bing: "https://www.bing.com/search?q=%s",
  startpage: "https://www.startpage.com/sp/search?query=%s",
};
const ENGINE_PLACEHOLDERS = {
  brave: "Search Brave or type a URL",
  google: "Search Google or type a URL",
  duckduckgo: "Search DuckDuckGo or type a URL",
  bing: "Search Bing or type a URL",
  startpage: "Search Startpage or type a URL",
};

function applyEngine(id) {
  const template = ENGINES[id] || ENGINES.brave;
  searchEngine.value = template;
  address.placeholder = ENGINE_PLACEHOLDERS[id] || ENGINE_PLACEHOLDERS.brave;
  engineSelect.value = ENGINES[id] ? id : "brave";
}

engineSelect.addEventListener("change", () => {
  saveSettings({ engine: engineSelect.value });
  applyEngine(engineSelect.value);
});

/* ---- proxy engine (scramjet | ultraviolet) ---- */

const proxyEngineSelect = document.getElementById("proxy-engine-select");
const engineFoot = document.getElementById("engine-foot");
const PROXY_ENGINES = {
  scramjet: { label: "scramjet v2", foot: "scramjet v2" },
  ultraviolet: { label: "Ultraviolet", foot: "ultraviolet" },
};

function applyProxyEngine(id) {
  const engine = PROXY_ENGINES[id] ? id : "scramjet";
  proxyEngineSelect.value = engine;
  address.placeholder =
    (ENGINE_PLACEHOLDERS[loadSettings().engine] || ENGINE_PLACEHOLDERS.brave) +
    " · " +
    PROXY_ENGINES[engine].label;
  engineFoot.textContent = PROXY_ENGINES[engine].foot;
}

/* ---- hero clock (top of home) ---- */

const heroClockTime = document.getElementById("hero-clock-time");
const heroClockDate = document.getElementById("hero-clock-date");

function tickHeroClock() {
  const now = new Date();
  heroClockTime.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  heroClockDate.textContent = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
tickHeroClock();
setInterval(tickHeroClock, 1000);

/* ---- quote of the day (rotates daily, cycles with visits) ---- */

const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Stay hungry, stay foolish.", author: "Stewart Brand" },
  { text: "The best way to predict the future is to invent it.", author: "Alan Kay" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "Everything you can imagine is real.", author: "Pablo Picasso" },
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
  { text: "Your love makes me strong. Your hate makes me unstoppable.", author: "Cristiano Ronaldo" },
  { text: "Talent without working hard is nothing.", author: "Cristiano Ronaldo" },
  { text: "I am not a perfectionist, but I like to feel that things are done well.", author: "Cristiano Ronaldo" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { text: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
];

(function initQuoteSlideshow() {
  const textEl = document.getElementById("hero-quote-text");
  const authorEl = document.getElementById("hero-quote-author");
  const QUOTE_INTERVAL = 8000; // ms per quote

  // start from the daily quote, then slide forward through the list
  let index = Math.floor(Date.now() / 86400000) % QUOTES.length;
  let paused = false;

  function render() {
    const q = QUOTES[index];
    textEl.textContent = "\u201C" + q.text + "\u201D";
    authorEl.textContent = "\u2014 " + q.author;
  }

  function slideTo(nextIndex) {
    index = (nextIndex + QUOTES.length) % QUOTES.length;
    const quote = document.getElementById("hero-quote");
    quote.classList.add("fading");
    setTimeout(() => {
      render();
      quote.classList.remove("fading");
    }, 350); // matches the CSS fade duration
  }

  setInterval(() => {
    if (!paused && !document.hidden) slideTo(index + 1);
  }, QUOTE_INTERVAL);

  // click = next quote, hover = pause so you can finish reading
  const quote = document.getElementById("hero-quote");
  quote.style.cursor = "pointer";
  quote.title = "Click for the next quote";
  quote.addEventListener("click", () => slideTo(index + 1));
  quote.addEventListener("mouseenter", () => (paused = true));
  quote.addEventListener("mouseleave", () => (paused = false));

  render();
})();

/* ---- widgets (toggled in settings, all off by default) ---- */

const WIDGET_KEYS = ["clock", "notes", "todo", "quicklinks", "calendar", "stopwatch", "battery", "pomodoro", "weather", "currency", "countdown", "passgen", "habits", "dice", "worldclock", "timer", "ip", "quote"];
const widgetsRow = document.getElementById("widgets");
const widgetClock = document.getElementById("widget-clock");
const widgetNotes = document.getElementById("widget-notes");
const widgetTodo = document.getElementById("widget-todo");
const widgetQuicklinks = document.getElementById("widget-quicklinks");
const widgetCalendar = document.getElementById("widget-calendar");
const widgetStopwatch = document.getElementById("widget-stopwatch");
const widgetBattery = document.getElementById("widget-battery");
const widgetPassgen = document.getElementById("widget-passgen");
const widgetMusic = document.getElementById("widget-music");
// { title, cover, kind: "spotify" | "preview" } - single source of truth for the music widget.
// declared here (not in the music section) because applyWidgets runs at load time
let nowPlaying = null;
const widgetToggles = Object.fromEntries(
  WIDGET_KEYS.map((k) => [k, document.getElementById("widget-toggle-" + k)])
);

function applyWidgets(prefs) {
  // prefs is the raw settings object - widget prefs are stored as widget_<name>
  const on = (k) => !!prefs["widget_" + k];
  widgetClock.hidden = !on("clock");
  widgetNotes.hidden = !on("notes");
  widgetTodo.hidden = !on("todo");
  widgetQuicklinks.hidden = !on("quicklinks");
  widgetCalendar.hidden = !on("calendar");
  widgetStopwatch.hidden = !on("stopwatch");
  widgetBattery.hidden = !on("battery");
  widgetPassgen.hidden = !on("passgen");
  // music widget isn't a toggle - it shows automatically whenever something is playing
  widgetMusic.hidden = !nowPlaying;
  widgetsRow.hidden = !WIDGET_KEYS.some(on);
  for (const k of WIDGET_KEYS) widgetToggles[k].checked = on(k);
  updateMusicWidget();
}

for (const k of WIDGET_KEYS) {
  widgetToggles[k].addEventListener("change", () => {
    saveSettings({ ["widget_" + k]: widgetToggles[k].checked });
    applyWidgets(loadSettings());
  });
}

// music widget stop button - unmounts the Spotify player and kills any preview
(function initMusicWidget() {
  const stopBtn = document.getElementById("widget-music-stop");
  if (!stopBtn) return;
  stopBtn.addEventListener("click", () => {
    stopMusicPreview();
    stopFullSong();
    stopSpotifyPlayer();
  });
})();

// clock
const clockTime = document.getElementById("widget-clock-time");
const clockDate = document.getElementById("widget-clock-date");
function tickClock() {
  const now = new Date();
  clockTime.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  clockDate.textContent = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
tickClock();
setInterval(tickClock, 1000);

// notes
const notesArea = document.getElementById("widget-notes-area");
let notesTimer = null;
notesArea.value = localStorage.getItem("haze-widget-notes") || "";
notesArea.addEventListener("input", () => {
  clearTimeout(notesTimer);
  notesTimer = setTimeout(() => {
    try {
      localStorage.setItem("haze-widget-notes", notesArea.value);
    } catch {}
  }, 300);
});

// todo
const todoInput = document.getElementById("widget-todo-input");
const todoAdd = document.getElementById("widget-todo-add");
const todoList = document.getElementById("widget-todo-list");
let todos = [];
try {
  todos = JSON.parse(localStorage.getItem("haze-widget-todos") || "[]");
} catch {}

function saveTodos() {
  try {
    localStorage.setItem("haze-widget-todos", JSON.stringify(todos));
  } catch {}
}

function renderTodos() {
  todoList.innerHTML = "";
  for (const [i, t] of todos.entries()) {
    const li = document.createElement("li");
    if (t.done) li.className = "done";
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = t.done;
    check.addEventListener("change", () => {
      todos[i].done = check.checked;
      saveTodos();
      renderTodos();
    });
    const label = document.createElement("span");
    label.textContent = t.text;
    const del = document.createElement("button");
    del.type = "button";
    del.innerHTML = "&#10005;";
    del.title = "Remove";
    del.addEventListener("click", () => {
      todos.splice(i, 1);
      saveTodos();
      renderTodos();
    });
    li.append(check, label, del);
    todoList.appendChild(li);
  }
}

function addTodo() {
  const text = todoInput.value.trim();
  if (!text) return;
  todos.push({ text, done: false });
  todoInput.value = "";
  saveTodos();
  renderTodos();
}

todoAdd.addEventListener("click", addTodo);
todoInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTodo();
});
renderTodos();

// quick links
const qlInput = document.getElementById("widget-quicklinks-url");
const qlAdd = document.getElementById("widget-quicklinks-add");
const qlList = document.getElementById("widget-quicklinks-list");
let quicklinks = [];
try {
  quicklinks = JSON.parse(localStorage.getItem("haze-widget-quicklinks") || "[]");
} catch {}

function saveQuicklinks() {
  try {
    localStorage.setItem("haze-widget-quicklinks", JSON.stringify(quicklinks));
  } catch {}
}

function renderQuicklinks() {
  qlList.innerHTML = "";
  for (const [i, q] of quicklinks.entries()) {
    const li = document.createElement("li");
    const open = document.createElement("button");
    open.type = "button";
    open.textContent = q.label;
    open.title = q.url;
    open.addEventListener("click", () => {
      address.value = q.url;
      launch(q.url).catch((err) => {
        console.error(err);
        error.textContent = "Navigation failed.";
      });
    });
    const del = document.createElement("button");
    del.type = "button";
    del.className = "ql-del";
    del.innerHTML = "&#10005;";
    del.title = "Remove";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      quicklinks.splice(i, 1);
      saveQuicklinks();
      renderQuicklinks();
    });
    li.append(open, del);
    qlList.appendChild(li);
  }
}

qlAdd.addEventListener("click", () => {
  let raw = qlInput.value.trim();
  if (!raw) return;
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
  let label = raw;
  try {
    label = new URL(raw).hostname.replace(/^www\./, "");
  } catch {}
  quicklinks.push({ url: raw, label });
  qlInput.value = "";
  saveQuicklinks();
  renderQuicklinks();
});
qlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") qlAdd.click();
});
renderQuicklinks();

// calendar
const calLabel = document.getElementById("widget-calendar-label");
const calGrid = document.getElementById("widget-calendar-grid");
let calView = new Date();
calView.setDate(1);

function renderCalendar() {
  calLabel.textContent = calView.toLocaleDateString([], { month: "long", year: "numeric" });
  calGrid.innerHTML = "";
  for (const dow of ["S", "M", "T", "W", "T", "F", "S"]) {
    const el = document.createElement("div");
    el.className = "cal-dow";
    el.textContent = dow;
    calGrid.appendChild(el);
  }
  const y = calView.getFullYear();
  const m = calView.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysPrev = new Date(y, m, 0).getDate();
  const today = new Date();
  for (let i = 0; i < 42; i++) {
    const el = document.createElement("div");
    el.className = "cal-day";
    if (i < firstDow) {
      el.textContent = daysPrev - firstDow + 1 + i;
      el.classList.add("dim");
    } else if (i - firstDow + 1 > daysInMonth) {
      el.textContent = i - firstDow + 1 - daysInMonth;
      el.classList.add("dim");
    } else {
      const day = i - firstDow + 1;
      el.textContent = day;
      if (
        day === today.getDate() &&
        m === today.getMonth() &&
        y === today.getFullYear()
      )
        el.classList.add("today");
    }
    calGrid.appendChild(el);
  }
}

document.getElementById("widget-calendar-prev").addEventListener("click", () => {
  calView.setMonth(calView.getMonth() - 1);
  renderCalendar();
});
document.getElementById("widget-calendar-next").addEventListener("click", () => {
  calView.setMonth(calView.getMonth() + 1);
  renderCalendar();
});
renderCalendar();

// stopwatch
const swTime = document.getElementById("widget-stopwatch-time");
const swStart = document.getElementById("widget-stopwatch-start");
const swReset = document.getElementById("widget-stopwatch-reset");
let swRunning = false;
let swElapsed = 0;
let swStartedAt = 0;

function swFormat(ms) {
  const total = Math.floor(ms / 100);
  const tenths = total % 10;
  const secs = Math.floor(total / 10) % 60;
  const mins = Math.floor(total / 600);
  const pad = (n) => String(n).padStart(2, "0");
  return pad(mins) + ":" + pad(secs) + "." + tenths;
}

function swRender() {
  swTime.textContent = swFormat(swElapsed);
  swStart.textContent = swRunning ? "Pause" : swElapsed ? "Resume" : "Start";
}
setInterval(() => {
  if (swRunning) {
    swElapsed = Date.now() - swStartedAt;
    swRender();
  }
}, 100);

swStart.addEventListener("click", () => {
  if (swRunning) {
    swRunning = false;
  } else {
    swStartedAt = Date.now() - swElapsed;
    swRunning = true;
  }
  swRender();
});
swReset.addEventListener("click", () => {
  swRunning = false;
  swElapsed = 0;
  swRender();
});
swRender();

// battery
const batLevel = document.getElementById("widget-battery-level");
const batStatus = document.getElementById("widget-battery-status");
const batFill = document.getElementById("widget-battery-fill");

async function initBattery() {
  if (!navigator.getBattery) {
    batLevel.textContent = "N/A";
    batStatus.textContent = "Battery API unavailable";
    batFill.style.width = "0%";
    return;
  }
  try {
    const bat = await navigator.getBattery();
    const render = () => {
      const pct = Math.round(bat.level * 100);
      batLevel.textContent = pct + "%";
      batStatus.textContent = bat.charging ? "Charging" : "On battery";
      batFill.style.width = pct + "%";
    };
    render();
    bat.addEventListener("levelchange", render);
    bat.addEventListener("chargingchange", render);
  } catch {
    batLevel.textContent = "N/A";
    batStatus.textContent = "Battery API unavailable";
  }
}
initBattery();

proxyEngineSelect.addEventListener("change", () => {
  saveSettings({ proxyEngine: proxyEngineSelect.value });
  // mark the intentional switch so the controllerchange guard doesn't
  // reload-loop when the other engine's service worker takes over
  sessionStorage.setItem("haze-engine-switch", String(Date.now()));
  location.reload();
});

/* ---- restore saved settings ---- */

(function restoreSettings() {
  const s = loadSettings();
  applyTheme(s.theme || "haze");
  applyEngine(s.engine || "brave");
  applyProxyEngine(s.proxyEngine || "scramjet");
  applyWidgets(s);
  const wp = localStorage.getItem("haze-wallpaper");
  if (wp) applyWallpaper(wp);
})();

/* ================================================================
   tab cloak - disguise the tab as an educational site + about:blank
   ================================================================ */

(function initCloak() {
  const CLOAKS = {
    classroom: { title: "Classes", icon: "https://www.google.com/s2/favicons?domain=classroom.google.com&sz=64" },
    docs: { title: "Google Docs", icon: "https://www.google.com/s2/favicons?domain=docs.google.com&sz=64" },
    drive: { title: "My Drive - Google Drive", icon: "https://www.google.com/s2/favicons?domain=drive.google.com&sz=64" },
    canvas: { title: "Dashboard", icon: "https://www.google.com/s2/favicons?domain=instructure.com&sz=64" },
    khan: { title: "Khan Academy | Free Online Courses, Lessons & Practice", icon: "https://www.google.com/s2/favicons?domain=khanacademy.org&sz=64" },
    desmos: { title: "Desmos | Graphing Calculator", icon: "https://www.google.com/s2/favicons?domain=desmos.com&sz=64" },
    clever: { title: "Clever | Portal", icon: "https://www.google.com/s2/favicons?domain=clever.com&sz=64" },
    wikipedia: { title: "Wikipedia, the free encyclopedia", icon: "https://www.google.com/s2/favicons?domain=en.wikipedia.org&sz=64" },
    slides: { title: "Google Slides", icon: "https://www.gstatic.com/images/branding/product/1x/slides_2020q4_48dp.png" },
    sheets: { title: "Google Sheets", icon: "https://www.gstatic.com/images/branding/product/1x/sheets_2020q4_48dp.png" },
    gmail: { title: "Inbox (1) - Gmail", icon: "https://www.gstatic.com/images/branding/product/1x/gmail_2020q4_48dp.png" },
    quizlet: { title: "Quizlet explanations", icon: "https://www.google.com/s2/favicons?domain=quizlet.com&sz=64" },
    ixl: { title: "IXL | Personalized learning", icon: "https://www.google.com/s2/favicons?domain=ixl.com&sz=64" },
    deltamath: { title: "DeltaMath", icon: "https://www.google.com/s2/favicons?domain=deltamath.com&sz=64" },
  };

  const DEFAULT_TITLE = document.title; // "haze"
  const DEFAULT_ICON = document.querySelector('link[rel="icon"]')?.href || "";
  const faviconLink = document.querySelector('link[rel="icon"]');
  const cloakSelect = document.getElementById("cloak-select");
  const titleInput = document.getElementById("cloak-custom-title");
  const iconInput = document.getElementById("cloak-custom-icon");
  const customApply = document.getElementById("cloak-custom-apply");
  const aboutBtn = document.getElementById("cloak-about-blank");

  let cloakState = loadSettings().cloak || { preset: "off" };

  function setFavicon(href) {
    if (!href) return;
    if (faviconLink) faviconLink.href = href;
  }

  function applyCloak(state) {
    cloakState = state && state.preset ? state : { preset: "off" };
    if (cloakState.preset === "off") {
      document.title = DEFAULT_TITLE;
      setFavicon(DEFAULT_ICON);
    } else if (cloakState.preset === "custom") {
      document.title = cloakState.title || DEFAULT_TITLE;
      setFavicon(cloakState.icon || DEFAULT_ICON);
    } else {
      const c = CLOAKS[cloakState.preset];
      if (c) {
        document.title = c.title;
        setFavicon(c.icon);
      }
    }
    saveSettings({ cloak: cloakState });
  }

  cloakSelect.addEventListener("change", () => {
    applyCloak({ preset: cloakSelect.value });
  });

  customApply.addEventListener("click", () => {
    const title = titleInput.value.trim();
    let icon = iconInput.value.trim();
    if (!title && !icon) return; // nothing entered - keep current cloak
    if (icon) {
      if (!/^https?:\/\//i.test(icon)) icon = `https://${icon}`;
      // bare domains (desmos.com) aren't images - route them through
      // google's favicon service so the icon actually resolves
      try {
        const u = new URL(icon);
        const looksLikeImage = /\.(png|jpe?g|gif|svg|ico|webp)(\?|#|$)/i.test(u.pathname);
        if (!looksLikeImage) {
          icon = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
        }
      } catch {}
    }
    applyCloak({
      preset: "custom",
      title: title || cloakState.title,
      icon: icon || cloakState.icon,
    });
  });

  // relaunch haze inside about:blank - no address bar, tab inherits the
  // current (cloaked) title + favicon, original tab is closed
  aboutBtn.addEventListener("click", () => {
    const win = window.open("about:blank", "_blank");
    if (!win) {
      aboutBtn.textContent = "Popup blocked \u2014 allow popups and retry";
      setTimeout(() => (aboutBtn.textContent = "Open in about:blank"), 2500);
      return;
    }
    const doc = win.document;
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    const title = esc(document.title);
    const icon = esc(document.querySelector('link[rel="icon"]')?.href || "");
    doc.open();
    doc.write(
      `<!doctype html><html><head><title>${title}</title>` +
      (icon ? `<link rel="icon" href="${icon}">` : "") +
      `<style>html,body{margin:0;padding:0;height:100%;background:#050505;overflow:hidden}` +
      `iframe{border:0;width:100%;height:100%;display:block}</style></head>` +
      `<body><iframe src="${location.origin}" allow="autoplay; fullscreen" allowfullscreen></iframe></body></html>`
    );
    doc.close();
    // close the original tab; browsers only allow script-close on tabs they
    // opened, so fall back to blanking it out
    window.close();
    setTimeout(() => {
      if (!window.closed) window.location.replace("about:blank");
    }, 150);
  });

  // panic key: press your chosen key anywhere (outside a text field) ->
  // instantly bail to a safe-looking site. location.replace keeps haze out
  // of back-history. the key itself is user-selectable (default `).
  const panicToggle = document.getElementById("cloak-panic-toggle");
  const panicKeyBtn = document.getElementById("cloak-panic-key");
  const panicCurrent = document.getElementById("cloak-panic-current");
  const PANIC_URL = "https://classroom.google.com/";
  const PANIC_FLAG = "haze-panic";
  const PANIC_KEY_FLAG = "haze-panic-key";

  function panicKeyLabel(key) {
    if (key === " ") return "Space";
    if (key === "Escape") return "Esc";
    if (key === "ArrowUp") return "\u2191";
    if (key === "ArrowDown") return "\u2193";
    if (key === "ArrowLeft") return "\u2190";
    if (key === "ArrowRight") return "\u2192";
    return key;
  }

  function renderPanicKey() {
    const key = localStorage.getItem(PANIC_KEY_FLAG) || "`";
    panicCurrent.textContent = `current: ${panicKeyLabel(key)}`;
  }

  panicToggle.checked = localStorage.getItem(PANIC_FLAG) === "1";
  panicToggle.addEventListener("change", () => {
    localStorage.setItem(PANIC_FLAG, panicToggle.checked ? "1" : "0");
  });
  renderPanicKey();

  // "set panic key" -> capture the next physical key pressed
  panicKeyBtn.addEventListener("click", () => {
    panicKeyBtn.textContent = "Press any key\u2026";
    panicKeyBtn.disabled = true;
    const capture = (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.removeEventListener("keydown", capture, true);
      if (event.key === "Escape") {
        // Esc cancels capture
        panicKeyBtn.textContent = "Set panic key";
        panicKeyBtn.disabled = false;
        return;
      }
      localStorage.setItem(PANIC_KEY_FLAG, event.key);
      renderPanicKey();
      panicKeyBtn.textContent = "Set panic key";
      panicKeyBtn.disabled = false;
    };
    window.addEventListener("keydown", capture, true);
  });

  window.addEventListener("keydown", (event) => {
    if (!panicToggle.checked) return;
    const tag = (event.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || event.target.isContentEditable;
    const chosen = localStorage.getItem(PANIC_KEY_FLAG) || "`";
    if (event.key === chosen && !typing) {
      event.preventDefault();
      window.location.replace(PANIC_URL);
    }
  });

  // reflect + apply whatever was saved
  cloakSelect.value = cloakState.preset || "off";
  applyCloak(cloakState);
})();

/* ================================================================
   music - real Spotify playback via the official embed player
   ================================================================ */

// every playlist below was verified against Spotify's public oembed
// endpoint at build time - these are official Spotify editorial lists,
// kept fresh by Spotify, so they cover the songs people actually look for.
// anything not here can still be played by pasting its link below.
const MUSIC_PLAYLISTS = [
  { cat: "Trending", items: [
    { id: "37i9dQZF1DXcBWIGoYBM5M", title: "Today\u2019s Top Hits", type: "playlist", img: "https://i.scdn.co/image/ab67706f0000000209dec89719704eea4f218966" },
    { id: "37i9dQZF1DX0XUsuxWHRQd", title: "RapCaviar", type: "playlist", img: "https://i.scdn.co/image/ab67706f000000026f25a0d402c37b865b89b807" },
    { id: "37i9dQZF1DXcF6B6QPhFDv", title: "MARROW", type: "playlist", img: "https://i.scdn.co/image/ab67706f000000023487d5e9d273db96ca011f4d" },
    { id: "37i9dQZF1DX10zKzsJ2jva", title: "Viva Latino", type: "playlist", img: "https://i.scdn.co/image/ab67706f00000002e094e442df52f234985c01b1" },
  ]},
  { cat: "Genres", items: [
    { id: "37i9dQZF1DWXRqgorJj26U", title: "Rock Classics", type: "playlist", img: "https://i.scdn.co/image/ab67706f00000002694bf33281695f3b7542a09a" },
    { id: "37i9dQZF1DX1lVhptIYRda", title: "Hot Country", type: "playlist", img: "https://i.scdn.co/image/ab67706f000000025e9a6f2f99379f013752c76b" },
    { id: "37i9dQZF1DX9tPFwDMOaN1", title: "K-Pop ON! (\uc628)", type: "playlist", img: "https://i.scdn.co/image/ab67706f0000000217652c782684018b9271a3b9" },
    { id: "37i9dQZF1DX4dyzvuaRJ0n", title: "mint", type: "playlist", img: "https://i.scdn.co/image/ab67706f00000002ecbd6b2ffda265fead96551c" },
    { id: "37i9dQZF1DX4SBhb3fqCJd", title: "RNB X", type: "playlist", img: "https://i.scdn.co/image/ab67706f0000000277af9ebd0f89df08ffc72f49" },
  ]},
  { cat: "Decades", items: [
    { id: "37i9dQZF1DX4o1oenSJRJd", title: "All Out 2000s", type: "playlist", img: "https://i.scdn.co/image/ab67706f00000002043bfef44142136749fc2917" },
    { id: "37i9dQZF1DX5Ejj0EkURtP", title: "All Out 2010s", type: "playlist", img: "https://i.scdn.co/image/ab67706f00000002ddeb90231491c14812b062ff" },
  ]},
  { cat: "Chill", items: [
    { id: "37i9dQZF1DX4sWSpwq3LiO", title: "Peaceful Piano", type: "playlist", img: "https://i.scdn.co/image/ab67706f0000000270e1fb7db7b45809d6a80377" },
    { id: "37i9dQZF1DWWQRwui0ExPn", title: "lofi beats", type: "playlist", img: "https://i.scdn.co/image/ab67706f00000002266beb50b0032b0f140a749e" },
    { id: "37i9dQZF1DWSqmBTGDYngZ", title: "Songs to Sing in the Shower", type: "playlist", img: "https://i.scdn.co/image/ab67706f00000002b4fc8034217025210cc630c1" },
  ]},
  { cat: "Workout", items: [
    { id: "37i9dQZF1DX76Wlfdnj7AP", title: "Beast Mode", type: "playlist", img: "https://i.scdn.co/image/ab67706f00000002f367481f06b565250cc7b139" },
  ]},
];

function musicEmbedSrc(type, id) {
  return `https://open.spotify.com/embed/${type}/${id}?utm_source=haze&theme=0`;
}

/* ---- now playing: feeds the home-screen music widget ---- */

function setNowPlaying(title, cover, kind) {
  nowPlaying = title ? { title, cover, kind } : null;
  updateMusicWidget();
}

/* ---- transport helpers shared by the widget buttons ---- */

function setMusicKind(kind) {
  if (nowPlaying) {
    nowPlaying.kind = kind;
    updateMusicWidget();
  }
}

function currentTrackKey() {
  return nowPlaying ? nowPlaying.title : null;
}

function addToRecent(title, cover) {
  if (!title) return;
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    const next = [{ title, cover: cover || "" }, ...list.filter((x) => x.title !== title)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    renderRecent();
  } catch {}
}

function renderRecent() {
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {}
  const wrap = document.getElementById("music-recent");
  const chips = document.getElementById("music-recent-chips");
  if (!wrap || !chips) return;
  wrap.hidden = !list.length;
  chips.innerHTML = "";
  for (const item of list) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.textContent = item.title.length > 34 ? item.title.slice(0, 33) + "\u2026" : item.title;
    chip.title = item.title;
    chip.addEventListener("click", () => {
      // "artist — title" labels re-search cleanly through /music/yt
      const nav = document.querySelector('.nav-item[data-view="music"]');
      if (nav) nav.click();
      playFromLabel(item.title, item.cover);
    });
    chips.appendChild(chip);
  }
}

// replay from a stored "artist — title" label without re-running /music/search
async function playFromLabel(label, cover) {
  const idx = label.indexOf(" \u2014 ");
  const artist = idx > 0 ? label.slice(0, idx) : "";
  const title = idx > 0 ? label.slice(idx + 3) : label;
  stopMusicPreview();
  stopFullSong();
  await playFullSong(title, artist, cover || "", "", null);
}

function updateMusicWidgetButtons() {
  const pp = document.getElementById("widget-music-playpause");
  if (!pp) return;
  const kind = nowPlaying?.kind || "";
  const paused = kind.endsWith("paused");
  pp.innerHTML = paused ? "&#9654;" : "&#9208;";
  pp.disabled = kind.startsWith("spotify"); // Spotify embed manages its own transport
  const seek = document.querySelector(".widget-music-seek");
  if (seek) seek.style.display = kind.startsWith("song") ? "" : "none";
}

function initMusicWidgetTransport() {
  const pp = document.getElementById("widget-music-playpause");
  const prev = document.getElementById("widget-music-prev");
  const next = document.getElementById("widget-music-next");
  const seek = document.querySelector(".widget-music-seek");
  if (pp) {
    pp.addEventListener("click", () => {
      if (!nowPlaying) return;
      // toggle on intent (the widget's own state) - reading the YT player's
      // state here races its async events on rapid clicks
      if (nowPlaying.kind.startsWith("song") && ytPlayer && ytPlayerReady) {
        if (nowPlaying.kind.endsWith("paused")) {
          ytPlayer.playVideo();
          setMusicKind("song");
        } else {
          ytPlayer.pauseVideo();
          setMusicKind("songpaused");
        }
      } else if (nowPlaying.kind.startsWith("preview") && musicAudio) {
        if (musicAudio.paused) {
          musicAudio.play().catch(() => {});
          setMusicKind("preview");
        } else {
          musicAudio.pause();
          setMusicKind("previewpaused");
        }
      }
    });
  }
  if (prev) prev.addEventListener("click", () => musicQueueStep(-1));
  if (next) next.addEventListener("click", () => musicQueueStep(1));
  if (seek) {
    seek.addEventListener("click", (e) => {
      if (!ytPlayer || !ytPlayerReady || !ytCurrent) return;
      const rect = seek.getBoundingClientRect();
      const frac = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
      try {
        ytPlayer.seekTo(ytPlayer.getDuration() * frac, true);
      } catch {}
    });
  }
}

function tickMusicWidgetSeek() {
  const fill = document.getElementById("widget-music-seek-fill");
  if (!fill) return;
  try {
    if (ytPlayer && ytPlayerReady && ytPlayer.getPlayerState?.() === 1) {
      const dur = ytPlayer.getDuration();
      const cur = ytPlayer.getCurrentTime();
      if (dur > 0) fill.style.width = `${(cur / dur) * 100}%`;
      return;
    }
  } catch {}
  try {
    if (musicAudio && !musicAudio.paused && Number.isFinite(musicAudio.duration)) {
      fill.style.width = `${(musicAudio.currentTime / musicAudio.duration) * 100}%`;
      return;
    }
  } catch {}
}
setInterval(tickMusicWidgetSeek, 500);

function updateMusicWidget() {
  if (typeof document === "undefined") return;
  const card = document.getElementById("widget-music");
  if (!card) return;
  const playing = Boolean(nowPlaying);
  card.hidden = !playing;
  // the widget row itself only shows when at least one widget is on OR music is playing
  widgetsRow.hidden = !(WIDGET_KEYS.some((k) => widgetToggles[k] && widgetToggles[k].checked) || playing);
  if (!playing) return;
  const coverImg = card.querySelector(".widget-music-cover img");
  const coverGlyph = card.querySelector(".widget-music-cover .widget-music-glyph");
  const titleEl = card.querySelector("#widget-music-title");
  const subEl = card.querySelector("#widget-music-sub");
  if (coverImg) {
    if (nowPlaying.cover) {
      coverImg.src = nowPlaying.cover;
      coverImg.style.display = "";
      if (coverGlyph) coverGlyph.style.display = "none";
    } else {
      coverImg.removeAttribute("src");
      coverImg.style.display = "none";
      if (coverGlyph) coverGlyph.style.display = "";
    }
  }
  if (titleEl) titleEl.textContent = nowPlaying.title;
  if (subEl) {
    const subs = { preview: "30s preview \u00b7 playing", song: "Full song \u00b7 playing", spotify: "Spotify \u00b7 playing", songpaused: "Full song \u00b7 paused", previewpaused: "Preview \u00b7 paused", spotifypaused: "Spotify \u00b7 paused" };
    subEl.textContent = subs[nowPlaying.kind] || "playing";
  }
  updateMusicWidgetButtons();
}

function stopSpotifyPlayer() {
  const frame = document.getElementById("music-player-frame");
  const hint = document.getElementById("music-player-hint");
  frame.innerHTML = "";
  frame.hidden = true;
  hint.hidden = false;
  setNowPlaying(null);
}

function mountMusicPlayer(src, label, coverUrl) {
  const frame = document.getElementById("music-player-frame");
  const hint = document.getElementById("music-player-hint");
  stopFullSong(); // never let a full-song player and the Spotify embed run at once
  stopMusicPreview();
  frame.innerHTML = "";
  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.height = "352";
  iframe.loading = "lazy";
  iframe.allowFullscreen = true;
  iframe.title = label || "Spotify player";
  iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
  frame.appendChild(iframe);
  frame.hidden = false;
  hint.hidden = true;
  setNowPlaying(label || "Spotify", coverUrl, "spotify");
}

const MUSIC_FAVS_KEY = "haze-music-favs";
const RECENT_KEY = "haze-music-recent";

function loadMusicFavs() {
  try {
    return JSON.parse(localStorage.getItem(MUSIC_FAVS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveMusicFavs(ids) {
  localStorage.setItem(MUSIC_FAVS_KEY, JSON.stringify(ids.slice(0, 20)));
}

// re-render the grid without losing the tab you're on
function renderMusicCatSafe() {
  renderMusicGrid(document.getElementById("music-grid").dataset.cat);
}

function renderMusicGrid(preserveCat) {
  const grid = document.getElementById("music-grid");
  const catsBar = document.getElementById("music-cats");
  const currentCat = preserveCat || grid.dataset.cat || null;
  grid.innerHTML = "";
  catsBar.innerHTML = "";

  // favorites category first - only present when something is starred.
  // works on a local copy; the constant itself must stay pristine so
  // re-renders never stack duplicate Favorites groups
  const favIds = loadMusicFavs();
  const groups = MUSIC_PLAYLISTS.map((g) => ({ ...g }));
  if (favIds.length) {
    const favs = favIds
      .map((id) => MUSIC_PLAYLISTS.flatMap((g) => g.items).find((p) => p.id === id))
      .filter(Boolean);
    if (favs.length) {
      groups.unshift({ cat: "\u2605 Favorites", items: favs, virtual: true });
    }
  }

  for (const group of groups) {
    const catBtn = document.createElement("button");
    catBtn.type = "button";
    catBtn.className = "music-cat";
    catBtn.setAttribute("role", "tab");
    catBtn.textContent = group.cat;
    catBtn.dataset.cat = group.cat;
    catBtn.addEventListener("click", () => {
      catsBar
        .querySelectorAll(".music-cat")
        .forEach((b) => b.classList.toggle("active", b === catBtn));
      applyMusicCat(group.cat);
    });
    catsBar.appendChild(catBtn);

    for (const pl of group.items) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "music-card";
      card.dataset.cat = group.cat;
      card.innerHTML = `
        <span class="music-card-cover">
          <span class="music-card-glyph">\u266b</span>
          <img src="${pl.img}" alt="" loading="lazy" onerror="this.style.display='none'" />
        </span>
        <span class="music-card-title">${pl.title}</span>
        <span class="music-card-sub">Spotify \u00b7 ${group.virtual ? "Favorites" : group.cat}</span>
        <span class="music-card-note">click to play \u25b6</span>`;
      if (!group.virtual) {
        const star = document.createElement("button");
        star.type = "button";
        star.className = "music-star" + (favIds.includes(pl.id) ? " active" : "");
        star.title = favIds.includes(pl.id) ? "Remove from favorites" : "Add to favorites";
        star.textContent = "\u2605";
        star.addEventListener("click", (e) => {
          e.stopPropagation();
          const cur = loadMusicFavs();
          const next = cur.includes(pl.id) ? cur.filter((x) => x !== pl.id) : [...cur, pl.id];
          saveMusicFavs(next);
          renderMusicCatSafe();
        });
        card.appendChild(star);
      }
      card.addEventListener("click", () => {
        mountMusicPlayer(musicEmbedSrc(pl.type, pl.id), pl.title, pl.img);
      });
      grid.appendChild(card);
    }
  }

  // restore the category you were on (falls back to the first tab)
  const target = currentCat ? catsBar.querySelector(`[data-cat="${currentCat.replace(/"/g, "\\\\\"")}"]`) : null;
  const chosen = target || catsBar.querySelector(".music-cat");
  if (chosen) {
    chosen.classList.add("active");
    applyMusicCat(chosen.dataset.cat);
  }
}

// show only the active category's cards
function applyMusicCat(cat) {
  const grid = document.getElementById("music-grid");
  grid.dataset.cat = cat;
  for (const card of grid.querySelectorAll(".music-card")) {
    card.hidden = card.dataset.cat !== cat;
  }
}

(function initMusic() {
  const addForm = document.getElementById("music-add-form");
  const addInput = document.getElementById("music-add-input");
  const hint = document.getElementById("music-player-hint");

  renderMusicGrid();

  addForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const raw = addInput.value.trim();
    if (!raw) return;
    await runMusicSearch(raw, hint);
  });

  // search as you type (3+ chars, small debounce)
  let searchTimer = null;
  addInput.addEventListener("input", () => {
    const raw = addInput.value.trim();
    clearTimeout(searchTimer);
    if (raw.length < 3) return;
    searchTimer = setTimeout(() => runMusicSearch(raw, hint), 350);
  });
})();

/* ---------------- song search (real catalog results) ---------------- */

let musicSearchAbort = null;
let musicResultsBox = null;

async function runMusicSearch(raw, hint) {
  if (musicSearchAbort) musicSearchAbort.abort();
  musicSearchAbort = new AbortController();

  if (!musicResultsBox) musicResultsBox = document.getElementById("music-results");
  hint.hidden = false;
  hint.textContent = `Searching \u201c${raw}\u201d\u2026`;
  try {
    const res = await fetch(`/music/search?q=${encodeURIComponent(raw)}`, {
      signal: musicSearchAbort.signal,
    });
    if (!res.ok) {
      let msg = "Search failed \u2014 try again.";
      try {
        const data = await res.json();
        if (data.error) msg = data.error;
      } catch {}
      throw new Error(msg);
    }
    const data = await res.json();
    renderMusicResults(data.results || [], raw);
    hint.hidden = true;
  } catch (err) {
    if (err.name === "AbortError") return;
    hint.textContent = String(err.message || err);
  }
}

function escMusic(s) {
  return String(s).replace(/</g, "&lt;");
}

function renderMusicResults(results, query) {
  const box = musicResultsBox;
  if (!results.length) {
    box.innerHTML = `<p class="music-results-empty">No songs found for \u201c${escMusic(query)}\u201d.</p>`;
    box.hidden = false;
    return;
  }
  box.innerHTML = results
    .map(
      (t) => `
      <div class="music-track">
        <img src="${t.cover}" alt="" loading="lazy" onerror="this.style.visibility='hidden'" />
        <div class="music-track-meta">
          <span class="music-track-title">${escMusic(t.title)}</span>
          <span class="music-track-sub" data-artist="${escMusic(t.artist)}">${escMusic(t.artist)}${t.album ? ` \u00b7 ${escMusic(t.album)}` : ""}</span>
        </div>
        <span class="music-track-time">${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, "0")}</span>
        <a class="music-track-spotify" href="${t.spotify}" target="_blank" rel="noopener noreferrer" title="Open on Spotify">Spotify \u2197</a>
        <button class="music-track-play" type="button" data-preview="${t.preview || ""}" title="Play full song">\u25b6</button>
      </div>`
    )
    .join("");
  box.hidden = false;

  for (const row of box.querySelectorAll(".music-track")) {
    const playBtn = row.querySelector(".music-track-play");
    if (playBtn) {
      playBtn.addEventListener("click", () => {
        const wasPlaying = playBtn.classList.contains("playing");
        stopMusicPreview();
        stopFullSong();
        if (!wasPlaying) {
          playBtn.classList.add("playing");
          playBtn.textContent = "\u23f8";
          playFullSong(
            row.querySelector(".music-track-title").textContent,
            row.querySelector(".music-track-sub").dataset.artist || "",
            row.querySelector("img")?.src || "",
            playBtn.dataset.preview || "",
            playBtn
          );
        }
      });
    }
    row.querySelector(".music-track-spotify").addEventListener("click", (e) => e.stopPropagation());
  }
}

let musicAudio = null;
let musicPlayBtn = null;

function resetMusicPlayBtn() {
  if (musicPlayBtn) {
    musicPlayBtn.classList.remove("playing");
    musicPlayBtn.textContent = "\u25b6";
    musicPlayBtn = null;
  }
}

function playPreview(url, title, btn) {
  if (musicAudio) {
    musicAudio.pause();
    musicAudio.src = "";
  }
  musicAudio = new Audio(url);
  musicAudio.volume = ytVolume;
  musicAudio.playbackRate = musicSpeed;
  if (title) addToRecent(title, null);
  // let the element's own events drive the widget's play/pause state
  musicAudio.addEventListener("pause", () => {
    if (nowPlaying?.kind?.startsWith("preview")) setMusicKind("previewpaused");
  });
  musicAudio.addEventListener("playing", () => {
    if (nowPlaying?.kind?.startsWith("preview")) setMusicKind("preview");
  });
  musicPlayBtn = btn;
  musicAudio.addEventListener("ended", () => {
    document.getElementById("music-preview-bar").hidden = true;
    resetMusicPlayBtn();
    setNowPlaying(null);
    musicQueueStep(1); // shuffle/repeat move the queue forward
  });
  musicAudio.addEventListener("error", () => {
    document.getElementById("music-preview-bar").hidden = true;
    const hint = document.getElementById("music-player-hint");
    hint.hidden = false;
    hint.textContent = "Preview failed to load.";
  });
  musicAudio.play().catch(() => {
    const hint = document.getElementById("music-player-hint");
    hint.hidden = false;
    hint.textContent = "Browser blocked autoplay \u2014 click play again.";
  });
  document.getElementById("music-preview-title").textContent = title;
  document.getElementById("music-preview-bar").hidden = false;
  setNowPlaying(title || "Preview", null, "preview");
}

function stopMusicPreview() {
  if (musicAudio) {
    musicAudio.pause();
    musicAudio.src = "";
    musicAudio = null;
  }
  document.getElementById("music-preview-bar").hidden = true;
  resetMusicPlayBtn();
  setNowPlaying(null);
}

/* ---- queue: shuffle / repeat / auto-advance over the visible search rows ---- */

let musicSpeed = 1;
let ytVolume = 0.9;
let repeatMode = "off"; // off | one | all
let shuffleOn = false;

function visibleTrackRows() {
  return [...document.querySelectorAll("#music-results .music-track")];
}

function rowKeyOf(row) {
  const t = row?.querySelector(".music-track-title")?.textContent || "";
  const a = row?.querySelector(".music-track-sub")?.dataset.artist || "";
  return `${a} \u2014 ${t}`;
}

function musicQueueStep(dir) {
  const rows = visibleTrackRows();
  if (!rows.length) return;
  const keys = rows.map(rowKeyOf);
  if (repeatMode === "one" && dir === 1) {
    replayCurrent();
    return;
  }
  let idx = keys.indexOf(currentTrackKey());
  if (shuffleOn) {
    let pick;
    do {
      pick = rows[Math.floor(Math.random() * rows.length)];
    } while (rows.length > 1 && keys[idx] === rowKeyOf(pick));
    clickRowPlay(pick);
    return;
  }
  let nextIdx = idx + dir;
  if (nextIdx >= rows.length) {
    if (repeatMode === "all") nextIdx = 0;
    else {
      setNowPlaying(null);
      return;
    }
  }
  if (nextIdx < 0) nextIdx = rows.length - 1;
  clickRowPlay(rows[nextIdx]);
}

function replayCurrent() {
  const row = visibleTrackRows().find((r) => rowKeyOf(r) === currentTrackKey());
  if (row) clickRowPlay(row);
}

function clickRowPlay(row) {
  const btn = row?.querySelector(".music-track-play");
  if (btn) btn.click();
}

function setRepeatMode(mode) {
  repeatMode = mode;
  const btn = document.getElementById("music-repeat");
  if (btn) {
    btn.classList.toggle("on", mode !== "off");
    btn.textContent = mode === "one" ? " Repeat: one" : mode === "all" ? " Repeat: all" : " Repeat: off";
  }
}

function setShuffle(on) {
  shuffleOn = on;
  const btn = document.getElementById("music-shuffle");
  if (btn) btn.classList.toggle("on", on);
}

function applyMusicSpeed(rate) {
  musicSpeed = rate;
  try {
    if (musicAudio) musicAudio.playbackRate = rate;
  } catch {}
  try {
    if (ytPlayer && ytPlayerReady && ytPlayer.setPlaybackRate) ytPlayer.setPlaybackRate(rate);
  } catch {}
}

function startSleepTimer(minutes) {
  document.getElementById("widget-music")?.classList.add("sleep-armed");
  const stop = () => {
    document.getElementById("widget-music")?.classList.remove("sleep-armed");
    stopMusicPreview();
    stopFullSong();
    stopSpotifyPlayer();
    hazeToast("Sleep timer \u2014 music stopped");
  };
  // gentle fade in the last 10 seconds, then stop
  setTimeout(() => {
    let v = ytVolume;
    const fade = setInterval(() => {
      v -= 0.1;
      try {
        if (ytPlayer && ytPlayerReady) ytPlayer.setVolume(Math.max(v, 0) * 100);
        if (musicAudio) musicAudio.volume = Math.max(v, 0);
      } catch {}
      if (v <= 0) {
        clearInterval(fade);
        stop();
      }
    }, 1000);
  }, Math.max(minutes * 60 - 10, 5) * 1000);
}

(function initMusicControlsRow() {
  const shuffleBtn = document.getElementById("music-shuffle");
  const repeatBtn = document.getElementById("music-repeat");
  const sleepBtn = document.getElementById("music-sleep");
  const speedSel = document.getElementById("music-speed");
  const volSlider = document.getElementById("music-volume");
  shuffleBtn?.addEventListener("click", () => setShuffle(!shuffleOn));
  repeatBtn?.addEventListener("click", () => {
    setRepeatMode(repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off");
  });
  sleepBtn?.addEventListener("click", () => {
    const raw = prompt("Stop music after how many minutes?", "30");
    const mins = parseFloat(raw || "");
    if (Number.isFinite(mins) && mins > 0) startSleepTimer(mins);
  });
  speedSel?.addEventListener("change", () => applyMusicSpeed(parseFloat(speedSel.value) || 1));
  volSlider?.addEventListener("input", () => setMusicVolume(parseInt(volSlider.value, 10) / 100));
})();

/* ---- volume + mute (both sliders, the widget mute button, M key) ---- */

let musicMuted = false;
let musicVolumeBeforeMute = 0.9;

function setMusicVolume(v, opts) {
  const fromMute = opts?.fromMute;
  ytVolume = Math.min(Math.max(v, 0), 1);
  if (!fromMute) musicMuted = ytVolume === 0;
  try {
    if (ytPlayer && ytPlayerReady) ytPlayer.setVolume(musicMuted ? 0 : ytVolume * 100);
  } catch {}
  try {
    if (musicAudio) musicAudio.volume = musicMuted ? 0 : ytVolume;
  } catch {}
  saveSettings({ volume: Math.round(ytVolume * 100) });
  paintMusicVolume();
}

function paintMusicVolume() {
  const pct = Math.round((musicMuted ? 0 : ytVolume) * 100);
  for (const id of ["music-volume", "widget-music-vol"]) {
    const el = document.getElementById(id);
    if (el) el.value = String(pct);
  }
  const muteBtn = document.getElementById("widget-music-mute");
  if (muteBtn) {
    muteBtn.innerHTML = musicMuted || ytVolume === 0 ? "&#128263;" : ytVolume > 0.5 ? "&#128266;" : "&#128265;";
    muteBtn.classList.toggle("muted", musicMuted || ytVolume === 0);
  }
  const card = document.getElementById("widget-music");
  if (card) card.classList.toggle("vol-muted", musicMuted || ytVolume === 0);
}

function toggleMusicMute() {
  if (musicMuted || ytVolume === 0) {
    musicMuted = false;
    setMusicVolume(musicVolumeBeforeMute || 0.9, { fromMute: true });
  } else {
    musicVolumeBeforeMute = ytVolume;
    musicMuted = true;
    setMusicVolume(ytVolume, { fromMute: true });
    hazeToast("Muted \u2014 press M to unmute");
  }
}

(function initWidgetMusicVolume() {
  const slider = document.getElementById("widget-music-vol");
  const muteBtn = document.getElementById("widget-music-mute");
  const saved = loadSettings().volume;
  if (typeof saved === "number" && saved >= 0 && saved <= 100) ytVolume = saved / 100;
  slider?.addEventListener("input", () => setMusicVolume(parseInt(slider.value, 10) / 100));
  muteBtn?.addEventListener("click", toggleMusicMute);
  paintMusicVolume();
})();

/* ---- liked songs (the little heart on the widget + music view) ---- */

const MUSIC_LIKED_KEY = "haze-music-liked";
let likedPanel = null;

function loadLikedSongs() {
  try {
    return JSON.parse(localStorage.getItem(MUSIC_LIKED_KEY) || "[]");
  } catch {
    return [];
  }
}

function isSongLiked(label) {
  return loadLikedSongs().some((s) => s.label === label);
}

function toggleLikedSong(label, cover) {
  if (!label) return;
  const list = loadLikedSongs();
  const i = list.findIndex((s) => s.label === label);
  if (i >= 0) {
    list.splice(i, 1);
    hazeToast("Removed from liked songs");
  } else {
    list.unshift({ label, cover: cover || "", t: Date.now() });
    hazeToast("\u2764 Liked \u2014 " + label);
  }
  localStorage.setItem(MUSIC_LIKED_KEY, JSON.stringify(list.slice(0, 100)));
  paintLikeButtons();
}

function paintLikeButtons() {
  const likeBtn = document.getElementById("widget-music-like");
  if (likeBtn && nowPlaying) {
    const liked = isSongLiked(nowPlaying.title);
    likeBtn.innerHTML = liked ? "\u2665" : "\u2661";
    likeBtn.classList.toggle("active", liked);
  }
}

function openLikedSongsPanel() {
  if (likedPanel) likedPanel.remove();
  likedPanel = document.createElement("div");
  likedPanel.className = "haze-modal-overlay";
  const box = document.createElement("div");
  box.className = "haze-modal";
  const h = document.createElement("h3");
  h.textContent = "\u2665 Liked songs";
  box.appendChild(h);
  const list = loadLikedSongs();
  if (!list.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Nothing liked yet \u2014 tap the heart on the music widget.";
    box.appendChild(p);
  } else {
    const ul = document.createElement("ul");
    for (const [i, song] of list.entries()) {
      const li = document.createElement("li");
      const play = document.createElement("button");
      play.className = "ghost-btn";
      play.textContent = song.label.length > 40 ? song.label.slice(0, 39) + "\u2026" : song.label;
      play.addEventListener("click", () => {
        likedPanel.remove();
        likedPanel = null;
        playFromLabel(song.label, song.cover);
      });
      const del = document.createElement("button");
      del.textContent = "\u2715";
      del.title = "Unlike";
      del.addEventListener("click", () => {
        const cur = loadLikedSongs();
        cur.splice(i, 1);
        localStorage.setItem(MUSIC_LIKED_KEY, JSON.stringify(cur));
        openLikedSongsPanel(); // re-render in place
        paintLikeButtons();
      });
      li.append(play, del);
      ul.appendChild(li);
    }
    box.appendChild(ul);
  }
  const close = document.createElement("button");
  close.className = "ghost-btn modal-close";
  close.textContent = "Close";
  close.addEventListener("click", () => {
    likedPanel.remove();
    likedPanel = null;
  });
  box.appendChild(close);
  likedPanel.appendChild(box);
  document.body.appendChild(likedPanel);
  likedPanel.addEventListener("click", (e) => {
    if (e.target === likedPanel) {
      likedPanel.remove();
      likedPanel = null;
    }
  });
}

(function initMusicLikeButton() {
  const likeBtn = document.getElementById("widget-music-like");
  likeBtn?.addEventListener("click", () => toggleLikedSong(nowPlaying?.title, nowPlaying?.cover));
  // keyboard: L likes the current song (guarded against typing elsewhere)
  window.addEventListener("keydown", (event) => {
    const tag = (event.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || event.target.isContentEditable;
    if (typing || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.key === "l" || event.key === "L") {
      if (nowPlaying) toggleLikedSong(nowPlaying.title, nowPlaying.cover);
    } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      if (ytPlayer && ytPlayerReady && nowPlaying?.kind?.startsWith("song")) {
        try {
          ytPlayer.seekTo(Math.max(ytPlayer.getCurrentTime() + (event.key === "ArrowRight" ? 10 : -10), 0), true);
        } catch {}
      }
    }
  });
})();

(function initMusicPreviewBar() {
  document
    .getElementById("music-preview-stop")
    .addEventListener("click", stopMusicPreview);
})();

initMusicWidgetTransport();
renderRecent();

/* ---------------- full songs via YouTube's official embed ----------------
   The 30s previews are Apple/Deezer clips - short by design. Whole songs
   play through YouTube's keyless, login-free embed player instead: the
   30s preview starts instantly for feedback, then hands off to the full
   track as soon as the embed is ready. Songs whose videos refuse embedding
   just keep the preview. */

let ytPlayer = null;
let ytPlayerReady = false;
let ytPending = null; // { videoId } waiting for the player to finish mounting
let ytFailTimer = null;
let ytApiPromise = null;
let ytCurrent = null; // { title, cover, fallbackUrl, btn }

function ytLoadApi() {
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) {
        resolve();
        return;
      }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === "function") prev();
        resolve();
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.onerror = () => reject(new Error("api-load-failed"));
      document.head.appendChild(s);
      setTimeout(() => reject(new Error("api-timeout")), 10000);
    });
  }
  return ytApiPromise;
}

function teardownYtPlayer() {
  clearTimeout(ytFailTimer);
  ytFailTimer = null;
  try {
    ytPlayer?.destroy();
  } catch {}
  ytPlayer = null;
  ytPlayerReady = false;
  ytPending = null;
}

function stopFullSong() {
  ytCurrent = null;
  teardownYtPlayer();
}

function hideFullSongPlayer() {
  const frame = document.getElementById("music-player-frame");
  frame.innerHTML = "";
  frame.hidden = true;
  document.getElementById("music-player-hint").hidden = false;
}

// embed refused / never started - keep the 30s preview if it is already
// rolling, otherwise start it
function ytKeepOrRestartPreview(message) {
  const hint = document.getElementById("music-player-hint");
  hint.hidden = false;
  hint.textContent = message;
  const cur = ytCurrent;
  if (cur?.fallbackUrl && musicAudio && !musicAudio.paused) return; // preview already playing
  if (cur?.fallbackUrl) {
    playPreview(cur.fallbackUrl, cur.title, cur.btn);
  } else {
    setNowPlaying(null);
    hint.textContent = "Couldn't play this song.";
  }
}

function ytFallbackToPreview() {
  const fb = ytCurrent?.fallbackUrl;
  teardownYtPlayer();
  hideFullSongPlayer();
  if (fb) {
    ytKeepOrRestartPreview("Full song unavailable for this one \u2014 playing the 30s preview.");
  } else {
    setNowPlaying(null);
    document.getElementById("music-player-hint").textContent =
      "This song can't be played full-length and has no preview.";
  }
}

function armYtFailureTimer() {
  clearTimeout(ytFailTimer);
  // embed refusals surface within seconds; 8s also covers slow starts
  ytFailTimer = setTimeout(() => {
    const state = ytPlayer?.getPlayerState?.();
    if (state !== 1 && state !== 3) ytFallbackToPreview();
  }, 8000);
}

function ensureYtPlayer() {
  const frame = document.getElementById("music-player-frame");
  frame.innerHTML = "";
  const mount = document.createElement("div");
  mount.id = "yt-mount";
  frame.appendChild(mount);
  frame.hidden = false;
  document.getElementById("music-player-hint").hidden = true;
  ytPlayerReady = false;
  ytPlayer = new window.YT.Player("yt-mount", {
    width: "100%",
    height: "352",
    playerVars: {
      autoplay: 1,
      playsinline: 1,
      origin: location.origin,
      enablejsapi: 1,
    },
    events: {
      onReady: (e) => {
        ytPlayerReady = true;
        try {
          e.target.getIframe().allow = "autoplay; encrypted-media";
          e.target.getIframe().title = "Full song player";
        } catch {}
        const pending = ytPending;
        ytPending = null;
        if (pending?.videoId) {
          e.target.loadVideoById(pending.videoId);
          e.target.playVideo();
          armYtFailureTimer();
        }
      },
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.PLAYING) {
          clearTimeout(ytFailTimer);
          // hand off from the 30s preview that started on click
          if (musicAudio) stopMusicPreview();
          setNowPlaying(ytCurrent?.title || "YouTube", ytCurrent?.cover, "song");
          if (ytCurrent?.title) addToRecent(ytCurrent.title, ytCurrent.cover);
          try {
            ytPlayer.setVolume(musicMuted ? 0 : ytVolume * 100);
            ytPlayer.setPlaybackRate(musicSpeed);
          } catch {}
          paintMusicVolume();
          paintLikeButtons();
        }
        if (e.data === YT.PlayerState.PAUSED) {
          setMusicKind("songpaused");
        }
        if (e.data === YT.PlayerState.ENDED) {
          const wasRepeatOne = repeatMode === "one";
          setNowPlaying(null);
          setTimeout(() => {
            stopFullSong();
            hideFullSongPlayer();
            if (wasRepeatOne) replayCurrent();
            else musicQueueStep(1);
          }, 0);
        }
      },
      onError: () => ytFallbackToPreview(),
    },
  });
}

async function playFullSong(title, artist, cover, fallbackUrl, btn) {
  teardownYtPlayer();
  stopSpotifyPlayer(); // the playlist embed never plays alongside a song
  const label = artist ? `${artist} \u2014 ${title}` : String(title);
  ytCurrent = { title: label, cover, fallbackUrl, btn: btn || null };
  setNowPlaying(label, cover, "song");
  const hint = document.getElementById("music-player-hint");
  hint.hidden = false;
  hint.textContent = `Loading the full song for \u201c${title}\u201d\u2026`;
  let videoId = null;
  try {
    const r = await fetch(`/music/yt?q=${encodeURIComponent(`${artist} ${title}`.trim())}`);
    if (r.ok) videoId = (await r.json()).videoId || null;
  } catch {}
  if (ytCurrent?.title !== label) return; // another song or stop landed meanwhile
  if (!videoId) {
    ytKeepOrRestartPreview("No full song found \u2014 playing the 30s preview.");
    return;
  }
  try {
    await ytLoadApi();
  } catch {
    ytApiPromise = null; // allow a retry on the next click
    ytKeepOrRestartPreview("Couldn't reach YouTube \u2014 staying on the 30s preview.");
    return;
  }
  if (ytCurrent?.title !== label) return;
  if (ytPlayer && ytPlayerReady) {
    ytPlayer.loadVideoById(videoId);
    ytPlayer.playVideo();
    armYtFailureTimer();
  } else {
    ytPending = { videoId };
    ensureYtPlayer();
  }
}

/* ================================================================
   chat - one global room hosted by the haze server
   ================================================================ */

(function initChat() {
  const $ = (id) => document.getElementById(id);
  const authCard = $("chat-auth");
  const authForm = $("chat-auth-form");
  const nameInput = $("chat-name");
  const passInput = $("chat-password");
  const authError = $("chat-auth-error");
  const authSubmit = $("chat-auth-submit");
  const guestBtn = $("chat-guest-btn");
  const room = $("chat-room");
  const youName = $("chat-you-name");
  const logoutBtn = $("chat-logout");
  const log = $("chat-log");
  const form = $("chat-form");
  const input = $("chat-input");

  const TOKEN_KEY = "haze-chat-token";
  const NAME_KEY = "haze-chat-name";

  let token = localStorage.getItem(TOKEN_KEY) || "";
  let pollTimer = null;
  let lastStamp = 0;
  let lastOnlineCount = null;
  const knownIds = new Set();

  function escChat(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showAuth() {
    authCard.hidden = false;
    room.hidden = true;
    stopPolling();
  }

  function showRoom(name) {
    authCard.hidden = true;
    room.hidden = false;
    youName.textContent = name;
  }

  function renderMessages(messages) {
    for (const m of messages) {
      if (knownIds.has(m.id)) continue;
      knownIds.add(m.id);
      const row = document.createElement("div");
      row.className = "chat-msg";
      const time = new Date(m.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      row.innerHTML = `<span class="chat-msg-head"><strong class="chat-msg-user">${escChat(m.u)}</strong>${m.g ? '<span class="chat-msg-guest">guest</span>' : ""}<time>${time}</time></span>`;
      const text = document.createElement("span");
      text.className = "chat-msg-text";
      text.textContent = m.text; // text node - never interpreted as HTML
      row.appendChild(text);
      log.appendChild(row);
    }
    while (log.children.length > 300) log.removeChild(log.firstChild);
    if (messages.length) {
      const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 160;
      if (nearBottom || lastStamp === 0) log.scrollTop = log.scrollHeight;
    }
  }

  async function pollOnce() {
    try {
      const res = await fetch(`/chat/messages?since=${lastStamp}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      const onlineChip = document.getElementById("chat-online");
      if (onlineChip) {
        const n = (data.online || []).length;
        if (n !== lastOnlineCount) {
          onlineChip.textContent = n === 1 ? "1 online" : `${n} online`;
          onlineChip.classList.toggle("active", n > 1);
          lastOnlineCount = n;
        }
      }
      if (data.messages?.length) {
        renderMessages(data.messages);
        lastStamp = Math.max(lastStamp, ...data.messages.map((m) => m.t));
      }
      window._hazeSetTypers?.(data.typers || []);
    } catch {}
  }

  function startPolling() {
    stopPolling();
    pollOnce();
    pollTimer = setInterval(() => {
      if (!document.hidden) pollOnce();
    }, 2000);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function logout() {
    token = "";
    localStorage.removeItem(TOKEN_KEY);
    stopPolling();
    log.innerHTML = "";
    knownIds.clear();
    lastStamp = 0;
    lastOnlineCount = null;
    showAuth();
  }

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    authError.textContent = "";
    authSubmit.disabled = true;
    try {
      const res = await fetch("/chat/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.value.trim(), password: passInput.value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't join \u2014 try again.");
      adoptSession(data);
    } catch (err) {
      authError.textContent = String(err.message || err);
    } finally {
      authSubmit.disabled = false;
    }
  });

  // guest join: no password needed. a name typed above is claimed if free,
  // otherwise the server hands out Guest-####. guests are ephemeral - their
  // name frees up when the session expires, and an account registering the
  // same name always outranks the guest.
  guestBtn.addEventListener("click", async () => {
    authError.textContent = "";
    guestBtn.disabled = true;
    try {
      const res = await fetch("/chat/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.value.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't join \u2014 try again.");
      adoptSession(data);
    } catch (err) {
      authError.textContent = String(err.message || err);
    } finally {
      guestBtn.disabled = false;
    }
  });

  function adoptSession(data) {
    token = data.token;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(NAME_KEY, data.user.name);
    passInput.value = "";
    showRoom(data.user.name);
    startPolling();
    input.focus();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    let text = input.value.trim();
    if (!text || !token) return;
    input.value = "";
    if (text === "/shrug") text = "\u00af\\_(\u30c4)_/\u00af"; // shell folk know
    try {
      const res = await fetch("/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      if (res.status === 401) {
        logout();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.message) {
        renderMessages([data.message]);
        lastStamp = Math.max(lastStamp, data.message.t);
      }
    } catch {
      input.value = text; // network hiccup - give the text back
    }
  });

  logoutBtn.addEventListener("click", logout);

  // resume an existing session silently
  if (token) {
    const savedName = localStorage.getItem(NAME_KEY) || "";
    if (savedName) {
      showRoom(savedName);
      startPolling(); // a bad token logs itself out on the first poll
    } else {
      token = "";
      localStorage.removeItem(TOKEN_KEY);
    }
  }
})();

/* ================================================================
   proxied frame
   ================================================================ */

// which proxy backend navigations go through - "scramjet" (Frame objects)
// or "ultraviolet" (plain iframe + /uv/service/ prefix)
const proxyEngine = PROXY_ENGINES[loadSettings().proxyEngine]
  ? loadSettings().proxyEngine
  : "scramjet";
let proxyReady = false;

function ensureFrame() {
  if (activeFrame) return;
  const frameEl = document.createElement("iframe");
  frameEl.id = "sj-frame";
  frameEl.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;border:none;background:var(--bg);z-index:2000;";
  document.body.appendChild(frameEl);
  activeFrame =
    proxyEngine === "ultraviolet" ? frameEl : controller.createFrame(frameEl);
  frameExit.hidden = false;
}

function launch(url) {
  if (!proxyReady) {
    error.textContent = "Still initializing — try again in a moment.";
    return;
  }
  error.textContent = "";
  errorCode.textContent = "";
  ensureFrame();
  if (proxyEngine === "ultraviolet") {
    activeFrame.src =
      window.__uv$config.prefix + window.__uv$config.encodeUrl(url);
  } else {
    activeFrame.go(url);
  }
}

// exposed for embedded panes (apps.html) to launch through the proxy
window.hazeLaunch = launch;

frameExit.addEventListener("click", () => {
  if (activeFrame) {
    try {
      activeFrame.destroy?.();
    } catch {}
    const el = document.getElementById("sj-frame");
    if (el) el.remove();
    activeFrame = null;
  }
  frameExit.hidden = true;
});

/* ================================================================
   service worker + controller init (scramjet v2)
   ================================================================ */

// if this page loaded under an older service worker and a new one just took
// over, reload once so the page boots with scripts served by the new worker -
// except right after an intentional engine switch, where the new worker is
// expected (reloading again would loop)
const hadControllerAtLoad = !!navigator.serviceWorker.controller;
navigator.serviceWorker.addEventListener("controllerchange", () => {
  const switched = Number(sessionStorage.getItem("haze-engine-switch") || 0);
  if (switched && Date.now() - switched < 15000) {
    sessionStorage.removeItem("haze-engine-switch");
    return;
  }
  if (hadControllerAtLoad) location.reload();
});

// wait until the service worker actually controls this page (or time out)
async function waitForControl(timeoutMs = 10000) {
  if (navigator.serviceWorker.controller) return;
  const ready = navigator.serviceWorker.ready.then(() => {});
  const changed = new Promise((resolve) => {
    const onChange = () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
      resolve();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onChange, {
      once: true,
    });
  });
  await Promise.race([ready, changed, sleep(timeoutMs)]);
}

async function init() {
  error.textContent = "starting proxy engine...";
  errorCode.textContent = "";

  const engine = PROXY_ENGINES[loadSettings().proxyEngine]
    ? loadSettings().proxyEngine
    : "scramjet";
  const registration = await navigator.serviceWorker.register(
    engine === "ultraviolet" ? "/uv/sw.js" : "./sw.js",
    engine === "ultraviolet" ? { scope: window.__uv$config.prefix } : undefined
  );
  if (engine === "ultraviolet") {
    // uv's worker only claims /uv/service/ so it never controls this page -
    // wait for the registration itself to activate (instant on repeat visits)
    if (!registration.active) {
      const w = registration.installing || registration.waiting;
      if (w) {
        await new Promise((resolve) => {
          w.addEventListener("statechange", () => {
            if (w.state === "activated") resolve();
          });
          setTimeout(resolve, 15000);
        });
      }
    }

    // bare-mux hosts the transport inside a shared worker; the epoxy wisp
    // transport (module) is imported into it. uv.config carries the transport
    // path + wisp url. getTransport() returns the transport *name* (empty on a
    // fresh worker), so compare against the configured path.
    const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
    let current = "";
    try {
      current = await connection.getTransport();
    } catch {}
    if (current !== window.__uv$config.transport) {
      await connection.setTransport(window.__uv$config.transport, [
        { wisp: window.__uv$config.wsTransportUrl },
      ]);
    }
  } else {
    await waitForControl();
    const sw = navigator.serviceWorker.controller ?? registration.active;
    if (!sw) throw new Error("No service worker available for the proxy");

    const wispUrl =
      (location.protocol === "https:" ? "wss" : "ws") +
      "://" +
      location.host +
      "/wisp/";

    // template wiring: transport first, then the controller with the runtime's
    // own defaultConfig - and controller.wait() gates on wasm + RPC readiness.
    // epoxy's init() awaits its own embedded wasm before constructing the
    // client, so there is no cold-start race to work around.
    const transport = new SJTransport({ wisp: wispUrl });
    await transport.init();

    controller = new Controller({
      serviceworker: sw,
      transport,
      scramjetConfig: defaultConfig,
    });

    // gates on RPC setup + scramjet wasm preload
    await Promise.race([controller.wait(), sleep(20000)]);
  }

  proxyReady = true;
  window.$haze = { controller, ready: true, initError: null, engine };
  error.textContent = "";
}

init().catch((err) => {
  console.error("haze: controller init failed", err);
  window.$haze = { controller: null, ready: false, initError: String(err) };
  error.textContent = "Failed to initialize the proxy.";
  errorCode.textContent = String(err);
});

/* ================================================================
   home form + shortcuts
   ================================================================ */

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!address.value.trim()) return;
  const url = window.search(address.value, searchEngine.value);
  recordHistory(url);
  if (loadSettings().openInNew) {
    window.open(url, "_blank", "noopener");
    return;
  }
  launch(url).catch((err) => {
    console.error(err);
    error.textContent = "Navigation failed.";
    errorCode.textContent = String(err);
  });
});

document.querySelectorAll(".shortcuts button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const url = btn.dataset.url;
    address.value = url;
    launch(url).catch((err) => {
      console.error(err);
      error.textContent = "Navigation failed.";
      errorCode.textContent = String(err);
    });
  });
});

/* ================================================================
   shared ui helpers: toast, modal, prompt
   ================================================================ */

const $haze = (id) => document.getElementById(id);

function hazeToast(message, ms = 2600) {
  const el = document.createElement("div");
  el.className = "haze-toast";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

// shared two-note chime for timers and alarms
function alarmChime(times = 2) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = i % 2 ? 660 : 880;
      g.gain.value = 0.07;
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.3);
      o.stop(ctx.currentTime + i * 0.3 + 0.2);
    }
    setTimeout(() => ctx.close(), times * 350 + 400);
  } catch {}
}

function hazeConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "haze-modal-overlay";
    const box = document.createElement("div");
    box.className = "haze-modal";
    const p = document.createElement("p");
    p.textContent = message;
    const row = document.createElement("div");
    row.className = "cloak-custom-row";
    const yes = document.createElement("button");
    yes.className = "ghost-btn";
    yes.textContent = "Confirm";
    const no = document.createElement("button");
    no.className = "ghost-btn";
    no.textContent = "Cancel";
    yes.addEventListener("click", () => { overlay.remove(); resolve(true); });
    no.addEventListener("click", () => { overlay.remove(); resolve(false); });
    row.append(yes, no);
    box.append(p, row);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) { overlay.remove(); resolve(false); }
    });
  });
}

function hazePromptModal(message, initial) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "haze-modal-overlay";
    const box = document.createElement("div");
    box.className = "haze-modal";
    const p = document.createElement("p");
    p.textContent = message;
    const input = document.createElement("input");
    input.type = "text";
    input.value = initial || "";
    const row = document.createElement("div");
    row.className = "cloak-custom-row";
    const ok = document.createElement("button");
    ok.className = "ghost-btn";
    ok.textContent = "OK";
    const cancel = document.createElement("button");
    cancel.className = "ghost-btn";
    cancel.textContent = "Cancel";
    ok.addEventListener("click", () => { overlay.remove(); resolve(input.value.trim() || null); });
    cancel.addEventListener("click", () => { overlay.remove(); resolve(null); });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") ok.click(); });
    row.append(ok, cancel);
    box.append(p, input, row);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    input.focus();
  });
}

/* ================================================================
   greeting under the logo
   ================================================================ */
(function initGreeting() {
  const el = $haze("greeting");
  if (!el) return;
  const h = new Date().getHours();
  const word = h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const spice = ["you've got this", "stay sharp", "make it count", "one tab at a time", "browse safe"];
  el.textContent = word + " \u2014 " + spice[new Date().getDate() % spice.length];
  el.hidden = false;
})();

/* ================================================================
   new widgets
   ================================================================ */

// pomodoro: 25/5 cycles with a soft chime at each switch
(function initPomodoroWidget() {
  const timeEl = $haze("widget-pomodoro-time");
  const phaseEl = $haze("widget-pomodoro-phase");
  const startBtn = $haze("widget-pomodoro-start");
  const resetBtn = $haze("widget-pomodoro-reset");
  if (!timeEl) return;
  let phase = "focus";
  let remain = 25 * 60;
  let running = false;
  let iv = null;
  const chime = (up) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = up ? 880 : 660;
      g.gain.value = 0.06;
      o.connect(g).connect(ctx.destination);
      o.start();
      setTimeout(() => { o.stop(); ctx.close(); }, 220);
    } catch {}
  };
  const paint = () => {
    timeEl.textContent = String(Math.floor(remain / 60)).padStart(2, "0") + ":" + String(remain % 60).padStart(2, "0");
    phaseEl.textContent = (phase === "focus" ? "Focus" : "Break") + (running ? "" : " \u00b7 paused");
  };
  const tick = () => {
    remain--;
    if (remain <= 0) {
      phase = phase === "focus" ? "break" : "focus";
      remain = (phase === "focus" ? 25 : 5) * 60;
      chime(phase === "focus");
      hazeToast(phase === "focus" ? "Break over \u2014 back to focus" : "Focus done \u2014 take 5");
    }
    paint();
  };
  startBtn.addEventListener("click", () => {
    running = !running;
    startBtn.textContent = running ? "Pause" : "Start";
    if (running) iv = setInterval(tick, 1000);
    else clearInterval(iv);
    paint();
  });
  resetBtn.addEventListener("click", () => {
    clearInterval(iv);
    running = false;
    phase = "focus";
    remain = 25 * 60;
    startBtn.textContent = "Start";
    paint();
  });
  paint();
})();

// weather: open-meteo, geolocation with a New York fallback
(function initWeatherWidget() {
  const tempEl = $haze("widget-weather-temp");
  const descEl = $haze("widget-weather-desc");
  if (!tempEl) return;
  const CODES = { 0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Icy fog", 51: "Drizzle", 53: "Drizzle", 55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Showers", 81: "Showers", 82: "Heavy showers", 95: "Storm", 96: "Storm + hail", 99: "Storm + hail" };
  async function load(lat, lon, label) {
    try {
      const r = await fetch("https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon + "&current=temperature_2m,weather_code");
      const d = await r.json();
      tempEl.textContent = Math.round(d.current.temperature_2m) + "\u00b0C";
      descEl.textContent = (CODES[d.current.weather_code] || "\u2014") + " \u00b7 " + label;
    } catch {
      descEl.textContent = "Weather unavailable";
    }
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => load(pos.coords.latitude.toFixed(3), pos.coords.longitude.toFixed(3), "your area"),
      () => load(40.71, -74.01, "New York"),
      { timeout: 6000 }
    );
  } else {
    load(40.71, -74.01, "New York");
  }
})();

// currency converter: exchangerate.host, no key
(function initCurrencyWidget() {
  const from = $haze("widget-currency-from");
  const to = $haze("widget-currency-to");
  const amount = $haze("widget-currency-amount");
  const result = $haze("widget-currency-result");
  const rateEl = $haze("widget-currency-rate");
  if (!from) return;
  const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "INR", "CNY", "BRL", "MXN", "KRW", "CHF", "SEK", "NOK", "DKK", "PLN", "TRY", "ZAR", "NZD", "SGD"];
  for (const c of CURRENCIES) {
    for (const sel of [from, to]) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    }
  }
  from.value = "USD";
  to.value = "EUR";
  let rates = null;
  async function convert() {
    const amt = parseFloat(amount.value);
    if (!Number.isFinite(amt)) return;
    try {
      if (!rates) {
        const r = await fetch("https://api.exchangerate.host/latest?base=" + from.value);
        rates = (await r.json()).rates || {};
      }
      const out = amt * (rates[to.value] || 0);
      result.textContent = out.toLocaleString(undefined, { maximumFractionDigits: 2 }) + " " + to.value;
      rateEl.textContent = "1 " + from.value + " = " + (rates[to.value] || 0).toFixed(4) + " " + to.value;
    } catch {
      result.textContent = "\u2014";
      rateEl.textContent = "Rates unavailable";
    }
  }
  for (const el of [from, to, amount]) el.addEventListener("change", () => { rates = null; convert(); });
  convert();
})();

// countdown to any date, persisted
(function initCountdownWidget() {
  const timeEl = $haze("widget-countdown-time");
  const dateEl = $haze("widget-countdown-date");
  const labelEl = $haze("widget-countdown-label");
  if (!timeEl) return;
  try {
    const saved = JSON.parse(localStorage.getItem("haze-widget-countdown") || "{}");
    if (saved.date) dateEl.value = saved.date;
    if (saved.label) labelEl.value = saved.label;
  } catch {}
  let doneShown = false;
  function save() {
    try {
      localStorage.setItem("haze-widget-countdown", JSON.stringify({ date: dateEl.value, label: labelEl.value }));
    } catch {}
  }
  function tick() {
    if (!dateEl.value) {
      timeEl.textContent = "set a date";
      return;
    }
    const target = new Date(dateEl.value).getTime();
    const diff = target - Date.now();
    if (diff <= 0) {
      timeEl.textContent = "\ud83c\udf89 arrived";
      if (!doneShown) {
        doneShown = true;
        hazeToast("Countdown reached: " + (labelEl.value || "your date"));
      }
      return;
    }
    doneShown = false;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    timeEl.textContent = d ? d + "d " + h + "h " + m + "m" : h + "h " + m + "m " + s + "s";
  }
  dateEl.addEventListener("change", () => { save(); tick(); });
  labelEl.addEventListener("input", save);
  tick();
  setInterval(tick, 1000);
})();

// habit tracker with streaks
(function initHabitsWidget() {
  const list = $haze("widget-habits-list");
  const summary = $haze("widget-habits-summary");
  const input = $haze("widget-habits-input");
  const addBtn = $haze("widget-habits-add");
  if (!list) return;
  let habits = [];
  try {
    habits = JSON.parse(localStorage.getItem("haze-widget-habits") || "[]");
  } catch {}
  const today = () => new Date().toISOString().slice(0, 10);
  const save = () => {
    try { localStorage.setItem("haze-widget-habits", JSON.stringify(habits)); } catch {}
  };
  function render() {
    list.innerHTML = "";
    let done = 0;
    for (const [i, habit] of habits.entries()) {
      const li = document.createElement("li");
      if (habit.last === today()) {
        li.className = "done";
        done++;
      }
      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = habit.last === today();
      check.addEventListener("change", () => {
        if (check.checked) {
          const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          habit.streak = habit.last === yest ? (habit.streak || 0) + 1 : 1;
          habit.last = today();
        } else {
          habit.last = "";
          habit.streak = 0;
        }
        save();
        render();
      });
      const name = document.createElement("span");
      name.textContent = habit.name;
      const streak = document.createElement("span");
      streak.className = "habit-streak";
      streak.textContent = (habit.streak || 0) + "\ud83d\udd25";
      const del = document.createElement("button");
      del.className = "habit-del";
      del.textContent = "\u2715";
      del.title = "Remove habit";
      del.addEventListener("click", () => {
        habits.splice(i, 1);
        save();
        render();
      });
      li.append(check, name, streak, del);
      list.appendChild(li);
    }
    summary.textContent = habits.length ? done + "/" + habits.length + " done today" : "No habits yet";
  }
  function addHabit() {
    const name = input.value.trim();
    if (!name || habits.length >= 8) return;
    habits.push({ name, last: "", streak: 0 });
    input.value = "";
    save();
    render();
  }
  addBtn.addEventListener("click", addHabit);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") addHabit(); });
  render();
})();

// dice roller
(function initDiceWidget() {
  const face = $haze("widget-dice-face");
  const rollBtn = $haze("widget-dice-roll");
  const sides = $haze("widget-dice-sides");
  if (!face) return;
  rollBtn.addEventListener("click", () => {
    const n = parseInt(sides.value) || 6;
    let spins = 0;
    const iv = setInterval(() => {
      face.textContent = String(1 + Math.floor(Math.random() * n));
      if (++spins > 8) {
        clearInterval(iv);
        face.textContent = String(1 + Math.floor(Math.random() * n));
      }
    }, 60);
  });
})();

// world clock
(function initWorldClockWidget() {
  const localEl = $haze("widget-worldclock-local");
  if (!localEl) return;
  const zones = [
    ["widget-worldclock-ny", "America/New_York"],
    ["widget-worldclock-lon", "Europe/London"],
    ["widget-worldclock-tok", "Asia/Tokyo"],
  ];
  function tick() {
    const now = new Date();
    localEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    for (const [id, tz] of zones) {
      const el = $haze(id);
      if (el) el.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: tz });
    }
  }
  tick();
  setInterval(tick, 15000);
})();

// quick timer with title-bar countdown + chime
(function initTimerWidget() {
  const timeEl = $haze("widget-timer-time");
  const minEl = $haze("widget-timer-min");
  const secEl = $haze("widget-timer-sec");
  const goBtn = $haze("widget-timer-start");
  if (!timeEl) return;
  let remain = 0;
  let iv = null;
  let baseTitle = null;
  function paint() {
    timeEl.textContent = String(Math.floor(remain / 60)).padStart(2, "0") + ":" + String(remain % 60).padStart(2, "0");
  }
  function finish() {
    clearInterval(iv);
    iv = null;
    if (baseTitle) {
      document.title = baseTitle;
      baseTitle = null;
    }
    hazeToast("\u23f0 Timer done!");
    alarmChime(3);
    paint();
  }
  goBtn.addEventListener("click", () => {
    if (iv) {
      clearInterval(iv);
      iv = null;
      if (baseTitle) {
        document.title = baseTitle;
        baseTitle = null;
      }
      goBtn.textContent = "Go";
      return;
    }
    remain = (parseInt(minEl.value) || 0) * 60 + (parseInt(secEl.value) || 0);
    if (remain <= 0) return;
    baseTitle = document.title;
    goBtn.textContent = "Stop";
    paint();
    iv = setInterval(() => {
      remain--;
      paint();
      document.title = timeEl.textContent + " \u2014 haze";
      if (remain <= 0) {
        goBtn.textContent = "Go";
        finish();
      }
    }, 1000);
  });
})();

// connection info
(function initIpWidget() {
  const addr = $haze("widget-ip-addr");
  const net = $haze("widget-ip-net");
  if (!addr) return;
  fetch("https://api.ipify.org?format=json")
    .then((r) => r.json())
    .then((d) => {
      addr.textContent = "IP: " + d.ip;
    })
    .catch(() => {
      addr.textContent = "IP unavailable";
    });
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (net) {
    net.textContent = conn ? (conn.effectiveType || "?").toUpperCase() + " \u00b7 " + (conn.downlink || "?") + " Mb/s" : navigator.onLine ? "Online" : "Offline";
  }
})();

// daily quote (rotates by date)
(function initQuoteWidget() {
  const el = $haze("widget-quote-text");
  if (!el) return;
  const QUOTES = [
    ["Simplicity is the ultimate sophistication.", "Leonardo da Vinci"],
    ["The best way out is always through.", "Robert Frost"],
    ["Stay hungry, stay foolish.", "Steve Jobs"],
    ["What we know is a drop, what we don't know is an ocean.", "Isaac Newton"],
    ["Music is the shorthand of emotion.", "Leo Tolstoy"],
    ["Action is the foundational key to all success.", "Pablo Picasso"],
    ["Turn your wounds into wisdom.", "Oprah Winfrey"],
  ];
  const pick = QUOTES[new Date().getDate() % QUOTES.length];
  el.textContent = "\u201c" + pick[0] + "\u201d \u2014 " + pick[1];
})();

// password generator: crypto-random, click to copy
(function initPassgenWidget() {
  const out = $haze("widget-passgen-out");
  const btn = $haze("widget-passgen-new");
  const len = $haze("widget-passgen-len");
  if (!out) return;
  // unambiguous set - no 0/O, 1/l/I lookalikes
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?";
  function gen() {
    const n = parseInt(len?.value, 10) || 16;
    const buf = new Uint32Array(n);
    crypto.getRandomValues(buf);
    out.textContent = [...buf].map((v) => chars[v % chars.length]).join("");
  }
  out.style.cursor = "pointer";
  out.title = "Click to copy";
  out.addEventListener("click", () => {
    navigator.clipboard?.writeText(out.textContent).then(
      () => hazeToast("Password copied"),
      () => hazeToast("Couldn't copy \u2014 select it manually")
    );
  });
  btn?.addEventListener("click", gen);
  len?.addEventListener("change", gen);
  gen();
})();

/* ================================================================
   appearance: accent color, glass, particles, sidebar, density
   ================================================================ */

(function initAppearance() {
  const ACCENTS = ["#ffffff", "#b79bff", "#6ea8ff", "#7dffb2", "#ffd166", "#ff7d9c", "#ff9d5c"];
  const row = $haze("accent-row");
  const s = loadSettings();
  if (row) {
    for (const color of ACCENTS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.style.background = color;
      btn.title = color;
      btn.classList.toggle("active", (s.accent || "#ffffff") === color);
      btn.addEventListener("click", () => {
        document.documentElement.style.setProperty("--accent", color);
        row.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
        saveSettings({ accent: color });
      });
      row.appendChild(btn);
    }
    if (s.accent && ACCENTS.includes(s.accent)) {
      document.documentElement.style.setProperty("--accent", s.accent);
    }
  }

  const glassToggle = $haze("glass-toggle");
  const applyGlass = (on) => document.documentElement.classList.toggle("glass-mode", on);
  glassToggle.checked = !!s.glassMode;
  applyGlass(!!s.glassMode);
  glassToggle.addEventListener("change", () => {
    saveSettings({ glassMode: glassToggle.checked });
    applyGlass(glassToggle.checked);
  });

  const particlesToggle = $haze("particles-toggle");
  particlesToggle.checked = !!s.particles;
  particlesToggle.addEventListener("change", () => {
    saveSettings({ particles: particlesToggle.checked });
    document.documentElement.classList.toggle("particles-on", particlesToggle.checked);
    if (particlesToggle.checked) initParticles();
  });
  if (s.particles) {
    document.documentElement.classList.add("particles-on");
    initParticles();
  }

  const sidebarToggle = $haze("sidebar-icon-toggle");
  sidebarToggle.checked = !!s.iconsSidebar;
  sidebarToggle.addEventListener("change", () => {
    saveSettings({ iconsSidebar: sidebarToggle.checked });
    document.documentElement.classList.toggle("icons-sidebar", sidebarToggle.checked);
  });
  if (s.iconsSidebar) document.documentElement.classList.add("icons-sidebar");

  const compactToggle = $haze("compact-toggle");
  compactToggle.checked = !!s.compact;
  compactToggle.addEventListener("change", () => {
    saveSettings({ compact: compactToggle.checked });
    document.documentElement.classList.toggle("compact", compactToggle.checked);
  });
  if (s.compact) document.documentElement.classList.add("compact");

  const webglToggle = $haze("webgl-toggle");
  webglToggle.checked = !!s.webglTilt;
  webglToggle.addEventListener("change", () => {
    saveSettings({ webglTilt: webglToggle.checked });
    document.documentElement.classList.toggle("webgl-tilt", webglToggle.checked);
  });
  if (s.webglTilt) document.documentElement.classList.add("webgl-tilt");

  // reduce transparency: solid panels everywhere (works with or without glass)
  const opaqueToggle = $haze("opaque-toggle");
  opaqueToggle.checked = !!s.opaqueMode;
  opaqueToggle.addEventListener("change", () => {
    saveSettings({ opaqueMode: opaqueToggle.checked });
    document.documentElement.classList.toggle("opaque-mode", opaqueToggle.checked);
  });
  if (s.opaqueMode) document.documentElement.classList.add("opaque-mode");

  // sidebar doubles as a site jump list (YouTube, Discord, ...)
  const JUMP_SITES = [
    ["YouTube", "https://www.youtube.com"],
    ["Discord", "https://discord.com"],
    ["Spotify", "https://open.spotify.com"],
    ["TikTok", "https://www.tiktok.com"],
    ["Twitch", "https://www.twitch.tv"],
    ["Reddit", "https://reddit.com"],
  ];
  const jumpToggle = $haze("jump-sidebar-toggle");
  const jumpNav = document.createElement("nav");
  jumpNav.className = "side-jump";
  jumpNav.hidden = true;
  for (const [label, url] of JUMP_SITES) {
    const a = document.createElement("button");
    a.type = "button";
    a.className = "side-jump-item";
    a.textContent = label;
    a.title = "Open " + label + " through the proxy";
    a.addEventListener("click", () => {
      address.value = url;
      launch(url).catch(() => {});
    });
    jumpNav.appendChild(a);
  }
  const sidebarFoot = document.querySelector(".sidebar-foot");
  if (sidebarFoot) sidebarFoot.parentElement.insertBefore(jumpNav, sidebarFoot);
  const applyJumpSidebar = (on) => {
    jumpNav.hidden = !on;
    document.documentElement.classList.toggle("jump-sidebar", on);
  };
  jumpToggle.checked = !!s.jumpSidebar;
  applyJumpSidebar(!!s.jumpSidebar);
  jumpToggle.addEventListener("change", () => {
    saveSettings({ jumpSidebar: jumpToggle.checked });
    applyJumpSidebar(jumpToggle.checked);
  });
})();

// quick jump dropdown in Settings -> Browsing
(function initQuickJump() {
  const sel = $haze("quick-jump-select");
  const go = $haze("quick-jump-go");
  go?.addEventListener("click", () => {
    const url = sel?.value;
    if (!url) {
      hazeToast("Pick a site first");
      return;
    }
    sel.value = "";
    launch(url).catch(() => {});
  });
})();

// real 3D tilt on cards + widgets (pointer-driven, cheap rAF batching)
(function initTilt() {
  const fine = window.matchMedia("(pointer: fine)").matches;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine || calm) return;
  // entrance animations (rise-in, fill-mode both) keep overriding inline
  // transforms forever - once they've played out, drop them so tilt wins
  const clearEntrance = () => {
    if (!document.documentElement.classList.contains("webgl-tilt")) return;
    for (const el of document.querySelectorAll(".settings-card, .widget")) {
      el.style.animation = "none";
    }
  };
  setTimeout(clearEntrance, 1500);
  let raf = 0;
  let px = 0, py = 0;
  const applyTilt = () => {
    raf = 0;
    for (const el of document.querySelectorAll(".settings-card, .widget")) {
      const r = el.getBoundingClientRect();
      if (px < r.left - 40 || px > r.right + 40 || py < r.top - 40 || py > r.bottom + 40) {
        el.style.transform = "";
        continue;
      }
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (px - cx) / (r.width / 2);
      const dy = (py - cy) / (r.height / 2);
      el.style.transform = `perspective(900px) rotateX(${(-dy * 4).toFixed(2)}deg) rotateY(${(dx * 4).toFixed(2)}deg) translateZ(0)`;
    }
  };
  window.addEventListener("pointermove", (e) => {
    px = e.clientX;
    py = e.clientY;
    if (!document.documentElement.classList.contains("webgl-tilt")) return;
    if (!raf) raf = requestAnimationFrame(applyTilt);
  }, { passive: true });
  // clear transforms when the toggle flips off; clear entrance fills when on
  new MutationObserver(() => {
    const on = document.documentElement.classList.contains("webgl-tilt");
    if (on) clearEntrance();
    else {
      for (const el of document.querySelectorAll(".settings-card, .widget")) el.style.transform = "";
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
})();

// floating particle background (2d canvas - cheap and everywhere)
let particlesStarted = false;
function initParticles() {
  if (particlesStarted) return;
  particlesStarted = true;
  const canvas = document.createElement("canvas");
  canvas.id = "particles-canvas";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  let w, h, dots;
  function resize() {
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
  }
  resize();
  addEventListener("resize", resize);
  dots = Array.from({ length: 46 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: 1 + Math.random() * 2.2,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    a: 0.15 + Math.random() * 0.4,
  }));
  (function frame() {
    ctx.clearRect(0, 0, w, h);
    for (const d of dots) {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 0 || d.x > w) d.vx *= -1;
      if (d.y < 0 || d.y > h) d.vy *= -1;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${d.a})`;
      ctx.fill();
    }
    requestAnimationFrame(frame);
  })();
}

/* ================================================================
   wallpaper extras: presets + blur
   ================================================================ */

(function initWallpaperExtras() {
  const PRESETS = [
    ["midnight gradient", "linear-gradient(135deg,#0f2027,#203a43,#2c5364)"],
    ["dusk", "linear-gradient(135deg,#355c7d,#6c5b7b,#c06c84)"],
    ["ember", "linear-gradient(135deg,#200122,#6f0000)"],
    ["mint", "linear-gradient(135deg,#0ba360,#3cba92)"],
    ["deep sea", "linear-gradient(135deg,#2b5876,#4e4376)"],
    ["cotton", "linear-gradient(135deg,#a8c0ff,#3f2b96)"],
  ];
  const wrap = $haze("wallpaper-presets");
  if (wrap) {
    for (const [name, css] of PRESETS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.title = name;
      btn.style.background = css;
      btn.addEventListener("click", () => {
        try {
          localStorage.setItem("haze-wallpaper-css", css);
          localStorage.removeItem("haze-wallpaper");
        } catch {}
        applyWallpaperCss(css);
        hazeToast("Wallpaper: " + name);
      });
      wrap.appendChild(btn);
    }
  }
  const savedCss = localStorage.getItem("haze-wallpaper-css");
  if (savedCss && !localStorage.getItem("haze-wallpaper")) applyWallpaperCss(savedCss);

  const blurToggle = $haze("wallpaper-blur-toggle");
  blurToggle.checked = !!loadSettings().wallpaperBlur;
  blurToggle.addEventListener("change", () => {
    saveSettings({ wallpaperBlur: blurToggle.checked });
    document.documentElement.classList.toggle("wallpaper-blur", blurToggle.checked);
  });
  if (loadSettings().wallpaperBlur) document.documentElement.classList.add("wallpaper-blur");
})();

function applyWallpaperCss(css) {
  const layer = $haze("wallpaper");
  if (!layer) return;
  layer.style.backgroundImage = css;
  layer.classList.add("visible");
}

// keep the old applyWallpaper honest: a CSS preset survives until replaced
const _applyWallpaperImage = applyWallpaper;
applyWallpaper = function (dataUrl) {
  _applyWallpaperImage(dataUrl);
  if (dataUrl) {
    try { localStorage.removeItem("haze-wallpaper-css"); } catch {}
    const layer = $haze("wallpaper");
    if (layer) layer.style.backgroundImage = "url(" + dataUrl + ")";
  } else {
    const savedCss = localStorage.getItem("haze-wallpaper-css");
    if (savedCss) applyWallpaperCss(savedCss);
  }
};

/* ================================================================
   command palette (ctrl/alt+k) + shortcut hints
   ================================================================ */

const paletteOverlay = $haze("palette-overlay");
const paletteInput = $haze("palette-input");
const paletteList = $haze("palette-list");
let paletteItems = [];
let paletteIndex = 0;

function paletteOpen() {
  paletteOverlay.hidden = false;
  paletteInput.value = "";
  paletteRender("");
  paletteInput.focus();
}

function paletteClose() {
  paletteOverlay.hidden = true;
}

function paletteCommands() {
  const cmds = [
    { label: "Go: Home", run: () => clickNav("home"), key: "1" },
    { label: "Go: haze games", run: () => clickNav("games"), key: "2" },
    { label: "Go: Apps", run: () => clickNav("apps") },
    { label: "Go: Music", run: () => clickNav("music"), key: "3" },
    { label: "Go: Chat", run: () => clickNav("chat"), key: "4" },
    { label: "Go: Settings", run: () => clickNav("settings"), key: "5" },
    { label: "Open a random app", run: () => { const w = document.getElementById("apps-frame"); clickNav("apps"); w?.contentWindow?.hazeRandomApp?.(); } },
    { label: "Toggle liquid glass", run: () => $haze("glass-toggle").click() },
    { label: "Toggle particles", run: () => $haze("particles-toggle").click() },
    { label: "Toggle icons-only sidebar", run: () => $haze("sidebar-icon-toggle").click() },
    { label: "Toggle compact layout", run: () => $haze("compact-toggle").click() },
    { label: "Shuffle music results", run: () => setShuffle(!shuffleOn) },
    { label: "Cycle repeat mode", run: () => setRepeatMode(repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off") },
    { label: "Stop all music", run: () => { stopMusicPreview(); stopFullSong(); stopSpotifyPlayer(); } },
    { label: "Mute / unmute music", run: () => toggleMusicMute() },
    { label: "Volume up", run: () => setMusicVolume(ytVolume + 0.1) },
    { label: "Volume down", run: () => setMusicVolume(ytVolume - 0.1) },
    { label: "Liked songs", run: () => openLikedSongsPanel() },
    { label: "Generate a password", run: () => { saveSettings({ widget_passgen: true }); applyWidgets(loadSettings()); clickNav("home"); } },
    { label: "Surprise me (random shortcut)", run: () => $haze("shortcut-random").click() },
    { label: "View local history", run: () => $haze("history-view-btn").click() },
    { label: "Download notes as .txt", run: () => $haze("notes-export-btn").click() },
    { label: "Export settings", run: () => $haze("export-data-btn").click() },
    { label: "Panic (cloaked redirect)", run: () => window.location.replace("https://classroom.google.com/") },
  ];
  const s = loadSettings();
  if (s.proxyEngine === "ultraviolet") {
    cmds.push({ label: "Switch to Scramjet v2", run: () => { $haze("proxy-engine-select").value = "scramjet"; $haze("proxy-engine-select").dispatchEvent(new Event("change")); } });
  } else {
    cmds.push({ label: "Switch to Ultraviolet", run: () => { $haze("proxy-engine-select").value = "ultraviolet"; $haze("proxy-engine-select").dispatchEvent(new Event("change")); } });
  }
  for (const bm of loadBookmarks().slice(0, 6)) {
    cmds.push({ label: "Open: " + bm.label, run: () => launch(bm.url).catch(() => {}) });
  }
  return cmds;
}

function clickNav(view) {
  navItems.forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  views.forEach((v) => v.classList.toggle("active", v.dataset.viewSection === view));
}

function paletteRender(q) {
  // fuzzy subsequence match with streak scoring - "lqd gls" finds "Toggle liquid glass"
  function fuzzyScore(label, query) {
    if (!query) return 1;
    let i = 0, score = 0, streak = 0;
    for (const ch of label.toLowerCase()) {
      if (ch === query[i]) {
        i++;
        streak++;
        score += 2 + streak;
        if (i === query.length) return score;
      } else {
        streak = 0;
      }
    }
    return 0;
  }
  paletteItems = paletteCommands()
    .map((c) => ({ c, s: fuzzyScore(c.label, q.toLowerCase()) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.c);
  if (q.startsWith("http") || (q.includes(".") && !q.includes(" "))) {
    paletteItems.unshift({ label: "Open \u201c" + q + "\u201d through the proxy", run: () => launch(window.search(q, searchEngine.value)).catch(() => {}) });
  }
  paletteIndex = 0;
  paletteList.innerHTML = "";
  if (!paletteItems.length) {
    const p = document.createElement("div");
    p.className = "palette-empty";
    p.textContent = "Nothing matches \u2014 try a URL.";
    paletteList.appendChild(p);
    return;
  }
  paletteItems.forEach((item, i) => {
    const div = document.createElement("div");
    div.className = "palette-item" + (i === 0 ? " active" : "");
    const span = document.createElement("span");
    span.textContent = item.label;
    div.appendChild(span);
    if (item.key) {
      const k = document.createElement("span");
      k.className = "palette-key";
      k.textContent = item.key;
      div.appendChild(k);
    }
    div.addEventListener("click", () => {
      paletteClose();
      item.run();
    });
    paletteList.appendChild(div);
  });
}

paletteInput?.addEventListener("input", () => paletteRender(paletteInput.value.trim()));
paletteInput?.addEventListener("keydown", (e) => {
  const items = paletteList.querySelectorAll(".palette-item");
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    paletteIndex = (paletteIndex + (e.key === "ArrowDown" ? 1 : items.length - 1)) % Math.max(items.length, 1);
    items.forEach((el, i) => el.classList.toggle("active", i === paletteIndex));
    items[paletteIndex]?.scrollIntoView({ block: "nearest" });
  } else if (e.key === "Enter") {
    e.preventDefault();
    const item = paletteItems[paletteIndex];
    if (item) {
      paletteClose();
      item.run();
    }
  }
});
paletteOverlay?.addEventListener("click", (e) => {
  if (e.target === paletteOverlay) paletteClose();
});

window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.altKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (paletteOverlay.hidden) paletteOpen();
    else paletteClose();
  }
  if (event.key === "Escape" && !paletteOverlay.hidden) paletteClose();
  if (!paletteOverlay.hidden && /^[1-5]$/.test(event.key)) {
    const map = { 1: "home", 2: "games", 3: "music", 4: "chat", 5: "settings" };
    paletteClose();
    clickNav(map[event.key]);
  }
});

// global keyboard shortcuts (ignored while typing)
window.addEventListener("keydown", (event) => {
  const tag = (event.target.tagName || "").toLowerCase();
  const typing = tag === "input" || tag === "textarea" || event.target.isContentEditable;
  if (typing || event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.key === "/") {
    event.preventDefault();
    address.focus();
    address.select();
  } else if (event.key === "m") {
    toggleMusicMute();
  } else if (event.key === "g") {
    clickNav("games");
  } else if (event.key === "c") {
    clickNav("chat");
  }
});

/* ================================================================
   chat upgrades: typing indicator + message filter
   ================================================================ */

(function initChatExtras() {
  const input = $haze("chat-input");
  const compose = $haze("chat-form");
  const log = $haze("chat-log");
  if (!input || !log) return;

  // typing indicator pings while the composer has text
  let lastTypingSent = 0;
  input.addEventListener("input", () => {
    if (Date.now() - lastTypingSent < 1500) return;
    lastTypingSent = Date.now();
    const token = localStorage.getItem("haze-chat-token");
    if (!token) return;
    fetch("/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ typing: true, text: "" }),
    }).catch(() => {});
  });

  // "who's typing" line above the composer
  const typingLine = document.createElement("div");
  typingLine.className = "chat-typing";
  compose.parentElement.insertBefore(typingLine, compose);
  window._hazeSetTypers = (names) => {
    typingLine.textContent = !names.length ? "" : names.length === 1 ? names[0] + " is typing\u2026" : names.slice(0, 3).join(", ") + " are typing\u2026";
  };

  // type-to-filter the message log
  const searchBox = document.createElement("input");
  searchBox.type = "text";
  searchBox.placeholder = "Filter messages\u2026";
  searchBox.style.cssText = "width:100%;margin:6px 0;padding:7px 10px;border-radius:9px;background:var(--bg-elev);border:1px solid var(--border);color:var(--text);font-family:inherit;font-size:0.82rem;";
  log.parentElement.insertBefore(searchBox, log);
  searchBox.addEventListener("input", () => {
    const q = searchBox.value.toLowerCase();
    for (const row of log.querySelectorAll(".chat-msg")) {
      row.hidden = Boolean(q) && !row.textContent.toLowerCase().includes(q);
    }
  });

  // /me actions: "/me dances" sends "* dances", rendered italic.
  // capture phase so the text is rewritten before the normal send runs.
  compose.addEventListener(
    "submit",
    () => {
      const val = input.value.trim();
      if (val.toLowerCase().startsWith("/me ")) {
        input.value = "* " + val.slice(4);
      }
    },
    true
  );
  // italicize action rows as they appear (server stores plain text)
  new MutationObserver(() => {
    for (const row of log.querySelectorAll(".chat-msg")) {
      const text = row.querySelector(".chat-msg-text");
      if (text && text.textContent.startsWith("* ")) row.classList.add("chat-action");
    }
  }).observe(log, { childList: true });
})();

/* ================================================================
   settings helpers: data export/import, wipe, notes export
   ================================================================ */

$haze("export-data-btn")?.addEventListener("click", () => {
  const dump = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    dump[k] = localStorage.getItem(k);
  }
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "haze-settings.json";
  a.click();
  URL.revokeObjectURL(a.href);
  hazeToast("Settings exported");
});

$haze("import-data-btn")?.addEventListener("click", () => $haze("import-data-file").click());
$haze("import-data-file")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const dump = JSON.parse(String(reader.result));
      if (!await hazeConfirm("Import these settings? This overwrites current ones.")) return;
      for (const [k, v] of Object.entries(dump)) {
        if (k === "haze-chat-token") continue; // never import someone's session
        localStorage.setItem(k, v);
      }
      hazeToast("Imported \u2014 reloading");
      setTimeout(() => location.reload(), 700);
    } catch {
      hazeToast("That file isn't a haze export");
    }
  };
  reader.readAsText(file);
});

$haze("wipe-btn")?.addEventListener("click", async () => {
  if (!await hazeConfirm("Wipe ALL local haze data (themes, widgets, favorites, history)? Chat accounts stay on the server.")) return;
  if (!await hazeConfirm("Really wipe everything?")) return;
  localStorage.clear();
  sessionStorage.clear();
  location.reload();
});

$haze("notes-export-btn")?.addEventListener("click", () => {
  const text = $haze("widget-notes-area")?.value || "";
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "haze-notes.txt";
  a.click();
  URL.revokeObjectURL(a.href);
  hazeToast("Notes downloaded");
});

/* ================================================================
   alarm (settings) - fires once when the clock hits the time
   ================================================================ */

(function initAlarm() {
  const input = $haze("timer-alarm-input");
  const toggle = $haze("alarm-toggle");
  const setBtn = $haze("timer-alarm-btn");
  if (!input) return;
  let firedFor = null;
  const s = loadSettings();
  if (s.alarmTime) input.value = s.alarmTime;
  toggle.checked = !!s.alarmOn;
  setBtn.addEventListener("click", () => {
    saveSettings({ alarmTime: input.value });
    hazeToast("Alarm set for " + (input.value || "\u2014 set a time first"));
  });
  toggle.addEventListener("change", () => saveSettings({ alarmOn: toggle.checked }));
  setInterval(() => {
    const s2 = loadSettings();
    if (!s2.alarmOn || !s2.alarmTime) return;
    const now = new Date().toTimeString().slice(0, 5);
    if (now === s2.alarmTime && firedFor !== now) {
      firedFor = now;
      hazeToast("\u23f0 Alarm \u2014 it's " + now);
      alarmChime(6);
    }
  }, 5000);
})();

/* ================================================================
   fun: click-lock mode, title effects, konami
   ================================================================ */

// click-lock: every click needs a 1.5s hold - no accidental clicks
(function initClickLock() {
  const toggle = $haze("clicklock-toggle");
  if (!toggle) return;
  toggle.checked = !!loadSettings().clickLock;
  let armed = false;
  let timer = null;
  const LOCKED = "haze-click-locked";
  toggle.addEventListener("change", () => {
    saveSettings({ clickLock: toggle.checked });
    if (!toggle.checked) document.removeEventListener("click", guard, true);
    else document.addEventListener("click", guard, true);
    hazeToast(toggle.checked ? "Click-lock on \u2014 hold 1.5s to click" : "Click-lock off");
  });
  function guard(e) {
    if (armed) {
      armed = false;
      return; // let this one through
    }
    e.preventDefault();
    e.stopPropagation();
    clearTimeout(timer);
    timer = setTimeout(() => {
      armed = true;
      e.target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      setTimeout(() => { armed = false; }, 50);
    }, 1500);
  }
})();

// title fun: the tab title pulses while music plays
(function initTitleFx() {
  const frames = ["\u25b6", "\u25b6\u25b8", "\u25b6\u25b8\u25b8", "\u25b8"];
  let i = 0;
  setInterval(() => {
    if (nowPlaying && !document.hidden && !document.title.startsWith("\u23f0") && !document.title.includes("\u2014 haze timer")) {
      document.title = frames[i++ % frames.length] + " " + (nowPlaying.title.length > 26 ? nowPlaying.title.slice(0, 25) + "\u2026" : nowPlaying.title);
    }
  }, 900);
})();

// konami code \u2192 confetti burst
(function initKonami() {
  const SEQ = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let pos = 0;
  function confettiBurst() {
    const colors = ["#fff", "#b79bff", "#6ea8ff", "#7dffb2", "#ffd166", "#ff7d9c"];
    for (let i = 0; i < 80; i++) {
      const p = document.createElement("div");
      p.style.cssText =
        "position:fixed;z-index:6000;pointer-events:none;width:8px;height:8px;border-radius:2px;left:" +
        innerWidth / 2 + "px;top:" + innerHeight / 3 + "px;background:" +
        colors[i % colors.length] + ";opacity:1;transition:transform 1.4s cubic-bezier(.2,.7,.3,1),opacity 1.4s;";
      document.body.appendChild(p);
      const ang = Math.random() * Math.PI * 2;
      const dist = 120 + Math.random() * 340;
      requestAnimationFrame(() => {
        p.style.transform = `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist + 220}px) rotate(${Math.random() * 720}deg)`;
        p.style.opacity = "0";
      });
      setTimeout(() => p.remove(), 1500);
    }
  }
  window.hazeConfetti = confettiBurst;
  window.addEventListener("keydown", (e) => {
    pos = e.key === SEQ[pos] ? pos + 1 : e.key === SEQ[0] ? 1 : 0;
    if (pos === SEQ.length) {
      pos = 0;
      hazeToast("\ud83c\udf89 Konami! You found it.");
      confettiBurst();
    }
  });
})();

// widget delete button: adds an \u2715 to each toggleable widget's header
(function initWidgetDelete() {
  document.querySelectorAll("#widgets .widget h4").forEach((h4) => {
    const card = h4.closest(".widget");
    if (!card || card.id === "widget-music") return;
    const key = card.id.replace("widget-", "");
    if (!WIDGET_KEYS.includes(key)) return;
    const del = document.createElement("button");
    del.type = "button";
    del.className = "habit-del";
    del.innerHTML = "&#10005;";
    del.title = "Hide this widget";
    del.addEventListener("click", () => {
      saveSettings({ ["widget_" + key]: false });
      applyWidgets(loadSettings());
      hazeToast("Widget hidden \u2014 re-enable it in Settings");
    });
    h4.appendChild(del);
  });
})();

/* ================================================================
   shortcuts: surprise me, shuffle, custom pins
   ================================================================ */

const BOOKMARKS_KEY = "haze-bookmarks";

function loadBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]");
  } catch {
    return [];
  }
}

function renderCustomShortcuts() {
  const nav = $haze("shortcuts");
  if (!nav) return;
  nav.querySelectorAll("[data-custom]").forEach((el) => el.remove());
  for (const bm of loadBookmarks()) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.url = bm.url;
    btn.dataset.custom = "1";
    btn.textContent = bm.label;
    btn.title = bm.url;
    btn.addEventListener("click", () => {
      address.value = bm.url;
      launch(bm.url).catch(() => {});
    });
    nav.appendChild(btn);
  }
}
renderCustomShortcuts();

$haze("shortcut-random")?.addEventListener("click", () => {
  const pins = [...document.querySelectorAll("#shortcuts button[data-url]")];
  if (!pins.length) return;
  const pick = pins[Math.floor(Math.random() * pins.length)];
  address.value = pick.dataset.url;
  launch(pick.dataset.url).catch(() => {});
});

$haze("shortcut-shuffle")?.addEventListener("click", () => {
  const nav = $haze("shortcuts");
  const pins = [...nav.querySelectorAll("button")];
  for (let i = pins.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    nav.appendChild(pins[j]);
    [pins[i], pins[j]] = [pins[j], pins[i]];
  }
  hazeToast("Shortcuts shuffled");
});

$haze("shortcut-edit")?.addEventListener("click", () => {
  navItems.forEach((b) => b.classList.toggle("active", b.dataset.view === "settings"));
  views.forEach((v) => v.classList.toggle("active", v.dataset.viewSection === "settings"));
  $haze("bookmark-add-input")?.focus();
});

$haze("bookmark-add-btn")?.addEventListener("click", () => {
  const input = $haze("bookmark-add-input");
  let raw = (input?.value || "").trim();
  if (!raw) return;
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
  let label = raw;
  try {
    label = new URL(raw).hostname.replace(/^www\./, "");
  } catch {}
  const pins = loadBookmarks();
  if (pins.some((p) => p.url === raw)) {
    hazeToast("Already pinned");
    return;
  }
  pins.push({ url: raw, label });
  try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(pins.slice(-10))); } catch {}
  input.value = "";
  renderCustomShortcuts();
  hazeToast("Pinned " + label);
});

/* ================================================================
   browsing: open-in-new-tab, local history, new-tab page
   ================================================================ */

const HISTORY_KEY = "haze-history";
const newtabSelect = $haze("newtab-select");
const newtabUrl = $haze("newtab-url");

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function recordHistory(url) {
  if (!loadSettings().recordHistory) return;
  try {
    const list = loadHistory().filter((h) => h.url !== url);
    list.unshift({ url, t: Date.now() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 100)));
  } catch {}
}

function applyNewtab() {
  const mode = newtabSelect?.value || "home";
  if (newtabUrl) newtabUrl.hidden = mode !== "url";
}

newtabSelect?.addEventListener("change", () => {
  saveSettings({ newtab: newtabSelect.value });
  applyNewtab();
});
newtabUrl?.addEventListener("change", () => {
  saveSettings({ newtabUrl: newtabUrl.value.trim() });
  hazeToast("New-tab page saved");
});

// record proxied shortcut launches too
document.querySelectorAll(".shortcuts").forEach((nav) => {
  nav.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-url]");
    if (btn) recordHistory(btn.dataset.url);
  });
});

$haze("history-view-btn")?.addEventListener("click", () => {
  const list = loadHistory();
  const overlay = document.createElement("div");
  overlay.className = "haze-modal-overlay";
  const box = document.createElement("div");
  box.className = "haze-modal";
  const h = document.createElement("h3");
  h.textContent = "Local history";
  box.appendChild(h);
  if (!list.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Nothing recorded yet.";
    box.appendChild(p);
  } else {
    const ul = document.createElement("ul");
    for (const item of list.slice(0, 40)) {
      const li = document.createElement("li");
      const time = document.createElement("time");
      time.textContent = new Date(item.t).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      const a = document.createElement("a");
      a.href = item.url;
      a.textContent = item.url.length > 46 ? item.url.slice(0, 45) + "\u2026" : item.url;
      a.style.color = "var(--text)";
      a.addEventListener("click", (e) => {
        e.preventDefault();
        overlay.remove();
        launch(item.url).catch(() => {});
      });
      li.append(time, a);
      ul.appendChild(li);
    }
    box.appendChild(ul);
  }
  const close = document.createElement("button");
  close.className = "ghost-btn modal-close";
  close.textContent = "Close";
  close.addEventListener("click", () => overlay.remove());
  box.appendChild(close);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
});

$haze("history-clear-btn")?.addEventListener("click", async () => {
  if (await hazeConfirm("Clear all local history?")) {
    localStorage.removeItem(HISTORY_KEY);
    hazeToast("History cleared");
  }
});

// detect a fresh blank tab and turn it into the chosen new-tab page
(function initNewtabDetection() {
  if (window.location.search || window.location.hash) return;
  if (performance.navigation && performance.navigation.type === 1) return; // reload
  if (history.length > 2) return; // not a fresh tab
  const s = loadSettings();
  if (!s.newtab || s.newtab === "home") return;
  let dest = null;
  if (s.newtab === "url" && s.newtabUrl) dest = s.newtabUrl;
  if (dest) {
    if (!/^https?:\/\//i.test(dest)) dest = "https://" + dest;
    window.location.replace(dest);
  }
})();
