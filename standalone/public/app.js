import { ScramjetController } from "/scramlib/scramjet.bundle.js";
import { BareMuxConnection } from "/baremux/index.mjs";
import { APPS, CATEGORIES, DEFAULT_SHORTCUTS } from "./apps.js";

const HAZE_CONFIG = globalThis.HAZE_CONFIG;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const STORE = { theme: "haze.theme", tabs: "haze.tabs", shortcuts: "haze.shortcuts" };
const SEARCH_URL = "https://www.google.com/search?q=";

const state = {
	theme: readRaw(STORE.theme) || "dark",
	shortcuts: readJSON(STORE.shortcuts, DEFAULT_SHORTCUTS),
	tabs: [],
	activeId: null,
	view: "home",
	category: null,
	proxyReady: false,
};

let scramjet = null;
let connection = null;

/* ---------------- storage helpers ---------------- */

function readRaw(key) {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function readJSON(key, fallback) {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : fallback;
	} catch {
		return fallback;
	}
}

function writeJSON(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		/* storage full or blocked — the session still works */
	}
}

/* ---------------- urls ---------------- */

function resolveInput(raw) {
	const value = (raw || "").trim();
	if (!value) return null;
	if (/^(https?|wss?):\/\//i.test(value)) return value;
	if (/^localhost(:\d+)?(\/.*)?$/i.test(value)) return `http://${value}`;
	if (/^[\w-]+(\.[\w-]+)+([/:?#].*)?$/.test(value)) return `https://${value}`;
	return SEARCH_URL + encodeURIComponent(value);
}

function hostLabel(url) {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return "Tab";
	}
}

function decode(url) {
	if (!url) return "";
	try {
		return scramjet ? scramjet.decodeUrl(url) : url;
	} catch {
		return url;
	}
}

function wispUrl() {
	const scheme = location.protocol === "https:" ? "wss" : "ws";
	return `${scheme}://${location.host}/wisp/`;
}

/* ---------------- brand marks ---------------- */

const GLYPHS = {
	youtube: `<svg viewBox="0 0 24 24"><rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill="#ff0033"/><path d="M10.3 9.1l5.2 2.9-5.2 2.9z" fill="#fff"/></svg>`,
	spotify: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="#1ed760"/><path d="M7 9.2c3.5-1 7-.7 9.8.9M7.6 12.5c2.8-.8 5.6-.5 8 .8M8.2 15.6c2.2-.6 4.4-.4 6.2.6" stroke="#04140a" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>`,
	instagram: `<svg viewBox="0 0 24 24"><defs><linearGradient id="ig-grad" x1="2" y1="22" x2="22" y2="2"><stop stop-color="#f9ce34"/><stop offset=".5" stop-color="#ee2a7b"/><stop offset="1" stop-color="#6228d7"/></linearGradient></defs><rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="url(#ig-grad)"/><rect x="6.4" y="6.4" width="11.2" height="11.2" rx="3.6" fill="none" stroke="#fff" stroke-width="1.7"/><circle cx="12" cy="12" r="2.9" fill="none" stroke="#fff" stroke-width="1.7"/><circle cx="16.5" cy="7.7" r="1.05" fill="#fff"/></svg>`,
	discord: `<svg viewBox="0 0 24 24"><rect x="1.5" y="2.5" width="21" height="19" rx="6" fill="#5865f2"/><path d="M8.3 8.6c2.4-.9 5-.9 7.4 0 1 1.6 1.5 3.7 1.5 5.6-1.2.7-2.3 1.2-3.4 1.5l-.5-1c.4-.1.9-.3 1.3-.5-2.3 1.1-4.9 1.1-7.2 0 .4.2.8.4 1.3.5l-.5 1c-1.1-.3-2.2-.8-3.4-1.5 0-1.9.5-4 1.5-5.6z" fill="#fff"/><circle cx="9.6" cy="12.2" r=".95" fill="#5865f2"/><circle cx="14.4" cy="12.2" r=".95" fill="#5865f2"/></svg>`,
	google: `<svg viewBox="0 0 24 24"><rect x="0.5" y="0.5" width="23" height="23" rx="7" fill="#fff"/><path d="M21.3 12.2c0-.7-.06-1.2-.18-1.8H12v3.4h5.3c-.1.9-.7 2.2-1.9 3.1l2.9 2.3c1.7-1.7 2.9-4.2 2.9-7z" fill="#4285f4"/><path d="M12 21.8c2.5 0 4.7-.9 6.3-2.4l-3-2.3c-.8.6-1.9 1-3.3 1a5.8 5.8 0 0 1-5.5-4.1H3.4a9.9 9.9 0 0 0 8.6 7.8z" fill="#34a853"/><path d="M6.5 14a6 6 0 0 1 0-4.2V9.7H3.4a9.8 9.8 0 0 0 0 8.8z" fill="#fbbc05"/><path d="M12 6.1c1.8 0 3 .8 3.7 1.4l2.6-2.6A9.4 9.4 0 0 0 12 2.2 9.9 9.9 0 0 0 3.4 7.1l3.1 2.4A5.8 5.8 0 0 1 12 6.1z" fill="#ea4335"/></svg>`,
};

function mark(entry, size = "tile") {
	if (GLYPHS[entry.glyph]) return `<span class="brand">${GLYPHS[entry.glyph]}</span>`;
	const letters = (entry.glyph || entry.name || "?").slice(0, 3);
	const background = entry.color || "#6b7280";
	if (size === "tile") return `<span class="brand" style="background:${background};color:${readableOn(background)}"></span>`;
	return `<span class="mark" style="background:${background};color:${readableOn(background)}">${escapeHtml(letters)}</span>`;
}

function readableOn(hex) {
	const m = /^#?([\da-f]{6})$/i.exec(hex || "");
	if (!m) return "#fff";
	const n = parseInt(m[1], 16);
	const luma = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
	return luma > 0.68 ? "#12131a" : "#fff";
}

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/* ---------------- tabs ---------------- */

const getTab = (id) => state.tabs.find((t) => t.id === id) || null;
const activeTab = () => getTab(state.activeId);

function makeTab({ url = "", title = "Home" } = {}) {
	return { id: crypto.randomUUID(), title, url, frame: null, surface: null };
}

function ensureFrame(tab) {
	if (tab.frame) return tab.frame;
	const sf = scramjet.createFrame();
	sf.frame.className = "surface";
	sf.frame.setAttribute(
		"allow",
		"fullscreen; autoplay; clipboard-read; clipboard-write; encrypted-media; gamepad; microphone; camera; display-capture; picture-in-picture",
	);
	$("#frames").appendChild(sf.frame);
	sf.addEventListener("urlchange", (event) => {
		tab.url = event.url;
		tab.title = hostLabel(event.url);
		if (tab.id === state.activeId) {
			syncAddress();
			updateNavButtons();
		}
		renderTabs();
		saveTabs();
	});
	tab.frame = sf;
	tab.surface = sf.frame;
	return sf;
}

function navigate(input, { tab = activeTab() } = {}) {
	const url = resolveInput(input);
	if (!url || !tab) return;
	if (!state.proxyReady) {
		toast("The proxy engine is still starting — one moment.");
		return;
	}
	try {
		ensureFrame(tab).go(url);
		tab.url = url;
		tab.title = hostLabel(url);
		showSurface(tab);
		renderTabs();
		syncAddress();
		updateNavButtons();
		saveTabs();
	} catch (err) {
		console.error("navigation failed", err);
		toast("Couldn't open that page.");
	}
}

function activateTab(id) {
	const tab = getTab(id);
	if (!tab) return;
	state.activeId = id;
	if (tab.url && state.proxyReady) {
		try {
			if (!tab.frame) ensureFrame(tab).go(tab.url);
			showSurface(tab);
		} catch (err) {
			console.error(err);
			showHome();
		}
	} else {
		showHome();
	}
	renderTabs();
	syncAddress();
	updateNavButtons();
	saveTabs();
}

function closeTab(id) {
	const index = state.tabs.findIndex((t) => t.id === id);
	if (index === -1) return;
	const [tab] = state.tabs.splice(index, 1);
	if (tab.surface) tab.surface.remove();
	if (state.tabs.length === 0) state.tabs.push(makeTab());
	const next = state.tabs[Math.min(index, state.tabs.length - 1)];
	if (!state.tabs.some((t) => t.id === state.activeId) || state.activeId === id) {
		state.activeId = next.id;
	}
	activateTab(state.activeId);
	saveTabs();
}

function goHome({ tab = activeTab() } = {}) {
	if (!tab) return;
	tab.url = "";
	tab.title = "Home";
	showHome();
	renderTabs();
	syncAddress();
	updateNavButtons();
	saveTabs();
}

function saveTabs() {
	writeJSON(STORE.tabs, {
		activeIndex: Math.max(0, state.tabs.findIndex((t) => t.id === state.activeId)),
		tabs: state.tabs.map((t) => ({ url: t.url, title: t.title })),
	});
}

function restoreTabs() {
	const saved = readJSON(STORE.tabs, null);
	if (!saved || !Array.isArray(saved.tabs) || saved.tabs.length === 0) {
		state.tabs = [makeTab()];
		state.activeId = state.tabs[0].id;
		return;
	}
	state.tabs = saved.tabs.map((t) => makeTab({ url: typeof t.url === "string" ? t.url : "", title: t.title || "Home" }));
	const index = Math.min(Math.max(saved.activeIndex | 0, 0), state.tabs.length - 1);
	state.activeId = state.tabs[index].id;
}

/* ---------------- rendering ---------------- */

function renderTabs() {
	const list = $("#tab-list");
	list.innerHTML = "";
	for (const tab of state.tabs) {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "tab" + (tab.id === state.activeId ? " active" : "");
		button.dataset.id = tab.id;
		button.setAttribute("role", "tab");
		button.setAttribute("aria-selected", String(tab.id === state.activeId));
		button.innerHTML = `<span class="tab-title">${escapeHtml(tab.title)}</span><span class="close" data-close="${tab.id}" aria-label="Close tab"><svg class="ico"><use href="#i-x"/></svg></span>`;
		list.appendChild(button);
	}
}

function renderShortcuts() {
	const grid = $("#shortcut-tiles");
	grid.innerHTML = state.shortcuts
		.map(
			(entry, i) =>
				`<button class="tile" type="button" data-shortcut="${i}" title="${escapeHtml(entry.name)}" aria-label="${escapeHtml(entry.name)}">${mark(entry)}</button>`,
		)
		.join("");
	grid.insertAdjacentHTML(
		"beforeend",
		`<button class="tile add" type="button" id="add-shortcut" title="Add shortcut" aria-label="Add shortcut"><svg class="ico"><use href="#i-plus"/></svg></button>`,
	);
}

function renderChips() {
	$("#home-chips").innerHTML = CATEGORIES.map(
		(c) => `<button class="chip" type="button" data-category="${c.id}"><svg class="ico"><use href="#${c.icon}"/></svg>${escapeHtml(c.label)}</button>`,
	).join("");
}

function renderNav() {
	$("#nav").innerHTML = CATEGORIES.map(
		(c) =>
			`<button class="nav-item${state.category === c.id ? " active" : ""}" type="button" data-category="${c.id}"><svg class="ico"><use href="#${c.icon}"/></svg>${escapeHtml(c.label)}</button>`,
	).join("");
}

function renderCollection(id) {
	const category = CATEGORIES.find((c) => c.id === id);
	if (!category) return;
	const apps = APPS[id] || [];
	$("#collection-title").textContent = category.label;
	$("#collection-count").textContent = `${apps.length} apps`;
	$("#app-grid").innerHTML = apps
		.map(
			(app) =>
				`<button class="app-card" type="button" data-url="${escapeHtml(app.url)}"><span class="mark" style="background:${app.color || "#6b7280"};color:${readableOn(app.color)}">${escapeHtml((app.glyph || app.name).slice(0, 3))}</span><span class="meta"><strong>${escapeHtml(app.name)}</strong><span>${escapeHtml(hostLabel(app.url))}</span></span></button>`,
		)
		.join("");
}

/* ---------------- views ---------------- */

function hideSurfaces() {
	$$(".surface", $("#frames")).forEach((node) => node.classList.remove("active"));
}

function showHome() {
	state.view = "home";
	hideSurfaces();
	$("#home").hidden = false;
	$("#collection").hidden = true;
}

function showCollection(id) {
	state.view = "collection";
	state.category = id;
	hideSurfaces();
	$("#home").hidden = true;
	$("#collection").hidden = false;
	renderCollection(id);
	renderNav();
}

function showSurface(tab) {
	state.view = "frame";
	hideSurfaces();
	$("#home").hidden = true;
	$("#collection").hidden = true;
	if (tab.surface) tab.surface.classList.add("active");
}

function syncAddress() {
	const input = $("#address");
	const tab = activeTab();
	const url = tab && state.view === "frame" ? decode(tab.url) || tab.url : "";
	input.value = url;
	$("#address-form").classList.toggle("secure", Boolean(url && /^https:/i.test(url)));
}

function updateNavButtons() {
	const frame = activeTab()?.frame;
	const usable = state.view === "frame" && Boolean(frame);
	$("#back-btn").disabled = !usable;
	$("#forward-btn").disabled = !usable;
	$("#reload-btn").disabled = !usable;
}

/* ---------------- chrome ---------------- */

function applyTheme() {
	document.documentElement.dataset.theme = state.theme;
	$("#theme-icon").innerHTML = `<use href="#${state.theme === "dark" ? "i-sun" : "i-moon"}"/>`;
}

function tick() {
	const now = new Date();
	const hours = String(now.getHours() % 12 || 12).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");
	$("#clock-time").textContent = `${hours}:${minutes} ${now.getHours() >= 12 ? "PM" : "AM"}`;
	$("#clock-date").textContent = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

let toastTimer = null;
function toast(message) {
	const node = $("#toast");
	node.textContent = message;
	node.classList.add("show");
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => node.classList.remove("show"), 2600);
}

function banner(message) {
	$("#banner-text").textContent = message;
	$("#banner").hidden = false;
}

/* ---------------- events ---------------- */

function wireEvents() {
	$("#new-tab").addEventListener("click", () => {
		const tab = makeTab();
		state.tabs.push(tab);
		activateTab(tab.id);
		$("#home-search").focus();
	});

	$("#tab-list").addEventListener("click", (event) => {
		const close = event.target.closest("[data-close]");
		if (close) {
			closeTab(close.dataset.close);
			return;
		}
		const tab = event.target.closest(".tab");
		if (tab) activateTab(tab.dataset.id);
	});

	$("#shortcut-tiles").addEventListener("click", (event) => {
		if (event.target.closest("#add-shortcut")) {
			$("#shortcut-dialog").showModal();
			$("#shortcut-name").focus();
			return;
		}
		const tile = event.target.closest("[data-shortcut]");
		if (!tile) return;
		const entry = state.shortcuts[Number(tile.dataset.shortcut)];
		if (entry) navigate(entry.url);
	});

	$("#shortcut-form").addEventListener("submit", (event) => {
		const name = $("#shortcut-name").value.trim();
		const raw = $("#shortcut-url").value.trim();
		if (event.submitter?.value !== "save" || !name || !raw) return;
		const url = resolveInput(raw);
		const colors = ["#8b7bff", "#3b82f6", "#f97316", "#22d3ee", "#f43f5e", "#22c55e"];
		state.shortcuts.push({
			name,
			url,
			glyph: name.slice(0, 2).toUpperCase(),
			color: colors[state.shortcuts.length % colors.length],
		});
		writeJSON(STORE.shortcuts, state.shortcuts);
		renderShortcuts();
		$("#shortcut-form").reset();
	});

	$("#nav").addEventListener("click", (event) => {
		const item = event.target.closest("[data-category]");
		if (item) showCollection(item.dataset.category);
	});

	$("#home-chips").addEventListener("click", (event) => {
		const chip = event.target.closest("[data-category]");
		if (chip) showCollection(chip.dataset.category);
	});

	$("#app-grid").addEventListener("click", (event) => {
		const card = event.target.closest("[data-url]");
		if (!card) return;
		navigate(card.dataset.url);
	});

	$("#collection-back").addEventListener("click", () => showHome());

	$("#home-form").addEventListener("submit", (event) => {
		event.preventDefault();
		navigate($("#home-search").value);
		$("#home-search").value = "";
	});

	$("#address-form").addEventListener("submit", (event) => {
		event.preventDefault();
		navigate($("#address").value);
		$("#address").blur();
	});

	$("#back-btn").addEventListener("click", () => activeTab()?.frame?.back());
	$("#forward-btn").addEventListener("click", () => activeTab()?.frame?.forward());
	$("#reload-btn").addEventListener("click", () => activeTab()?.frame?.reload());
	$("#home-btn").addEventListener("click", () => goHome());

	$("#panel-btn").addEventListener("click", () => document.body.classList.toggle("sidebar-hidden"));
	$("#collapse-btn").addEventListener("click", () => document.body.classList.add("sidebar-hidden"));

	$("#theme-btn").addEventListener("click", () => {
		state.theme = state.theme === "dark" ? "light" : "dark";
		localStorage.setItem(STORE.theme, state.theme);
		applyTheme();
	});

	$("#sync-btn").addEventListener("click", () => toast("Accounts aren't wired up in this build — everything stays on this device."));
	$("#settings-btn").addEventListener("click", () => toast("Settings aren't built yet."));
	$("#discord-btn").addEventListener("click", () => {
		const tab = makeTab({ url: "https://discord.com/app", title: "discord.com" });
		state.tabs.push(tab);
		activateTab(tab.id);
	});

	document.addEventListener("keydown", (event) => {
		const mod = event.ctrlKey || event.metaKey;
		if (!mod) return;
		const key = event.key.toLowerCase();
		if (key === "t") {
			event.preventDefault();
			const tab = makeTab();
			state.tabs.push(tab);
			activateTab(tab.id);
		} else if (key === "w") {
			event.preventDefault();
			closeTab(state.activeId);
		} else if (key === "l") {
			event.preventDefault();
			$("#address").focus();
			$("#address").select();
		} else if (key === "k") {
			event.preventDefault();
			state.view === "home" ? $("#home-search").focus() : $("#address").focus();
		}
	});
}

/* ---------------- boot ---------------- */

async function registerServiceWorker() {
	if (!("serviceWorker" in navigator)) return;
	try {
		await navigator.serviceWorker.register("/sw.js", { scope: "/" });
		await navigator.serviceWorker.ready;
	} catch (err) {
		console.warn("service worker registration failed", err);
	}
}

async function initScramjet() {
	const open = () =>
		Promise.race([
			scramjet.init(),
			// A database left half-deleted by an earlier session blocks new opens
			// instead of failing, which would keep the engine "starting" forever.
			new Promise((_, reject) => setTimeout(() => reject(new Error("timed out opening $scramjet")), 8000)),
		]);

	try {
		await open();
	} catch (err) {
		if (err?.name !== "NotFoundError" && !/timed out/.test(err?.message || "")) throw err;
		console.warn("haze: resetting the $scramjet database", err);
		await new Promise((resolve) => {
			const request = indexedDB.deleteDatabase("$scramjet");
			request.onsuccess = request.onerror = request.onblocked = () => resolve();
		});
		await open();
	}
}

async function initProxy() {
	try {
		const { default: HazeTransport } = await import("./transport.js");
		connection = new BareMuxConnection("/baremux/worker.js");
		// BareMux's worker is a SharedWorker, where dynamic import() does not
		// work, so the Epoxy transport runs here and is handed over the port.
		await connection.setRemoteTransport(new HazeTransport({ wisp: wispUrl() }));

		scramjet = new ScramjetController(HAZE_CONFIG);
		// init() first: it creates the $scramjet object stores the worker reads.
		await initScramjet();
		state.proxyReady = true;
		await registerServiceWorker();
	} catch (err) {
		console.error("proxy failed to start", err);
		banner("The proxy engine didn't start — pages won't load until it does. Check the console for details.");
	}
}

async function boot() {
	applyTheme();
	renderShortcuts();
	renderChips();
	renderNav();
	tick();
	setInterval(tick, 1000);

	restoreTabs();
	renderTabs();

	wireEvents();
	await initProxy();
	activateTab(state.activeId);
}

boot();
