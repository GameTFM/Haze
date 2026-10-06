# haze

Black & white web proxy with a **choice of engine** — **Scramjet v2** (default) or **Ultraviolet**, switchable in Settings → Proxy engine. All files are vendored statically (Scramjet per the [x8rr/scramjet-templates](https://github.com/x8rr/scramjet-templates) layout, Ultraviolet per [titaniumnetwork-dev/Ultraviolet-Static](https://github.com/titaniumnetwork-dev/Ultraviolet-Static)); traffic rides a same-port wisp websocket via the epoxy transport for both engines.

## Run it

```
haze.bat          # one-click (reuses bundled Node, installs deps if missing)
```

or manually:

```
node server.js    # needs Node 18+
```

Opens at **http://localhost:8000**

## Stack

| Piece | Version | Role |
| ----- | ------- | ---- |
| Scramjet (static) | 2.0.67-alpha.1 | Rewriting engine + SW runtime (default engine) |
| Ultraviolet (static) | 3.2.10-headers | Rewriting engine + SW (alt engine) |
| bare-mux | 2.1.9 | Shared-worker transport mux for Ultraviolet |
| epoxy-transport | 3.0.1 (static) | wisp transport client (both engines) |
| `@mercuryworkshop/wisp-js` | 0.4.1 | The websocket server that carries proxied traffic |

## What's inside

| Path | Purpose |
| ---- | ------- |
| `server.js` | Express static server + wisp websocket endpoint |
| `public/` | The haze UI (sidebar, themes, games, music, chat, widgets) |
| `public/games.html` | haze games — searchable library UI (836 games) |
| `/games/zones.json` | Catalog passthrough for the gn-math `zones.json` (836 games) |
| `/games/play/:file` | Game wrapper passthrough — fixes jsDelivr's `text/plain` content-type, filenames validated against the catalog |
| `/music/search` | Real song search, keyless merge of iTunes Search API + Deezer public catalog |
| `/music/yt` | Full-song resolver — maps "artist — title" to an embeddable YouTube video (24h cache) |
| `/chat/*` | Chat accounts + global room — scrypt password hashing, HMAC-signed 7-day tokens, JSON-file storage, typing indicators |
| `/scramjet/` | Scramjet v2 runtime (`scramjet.js`, `scramjet.wasm`) |
| `/controller/` | Controller API + service worker shim (`controller.api.js`, `controller.sw.js`) |
| `/epoxy/` | epoxy transport client (UMD classic script + ESM for bare-mux; patched to accept both header shapes) |
| `/uv/` | Ultraviolet scripts + `sw.js` + `uv.config.js` |
| `/baremux/` | bare-mux client + SharedWorker (`worker.js`) |
| `/wisp/` | The websocket endpoint proxied traffic flows through |

## Features

### Browsing & proxy

- **Dual proxy engines** — Scramjet v2 (default) and Ultraviolet, switchable in Settings; switching marks an intentional switch and reloads haze without a worker-claim loop.
- **Address bar** doubles as a search box; 5 search engines (Brave default, Google, DuckDuckGo, Bing, Startpage) with engine-aware placeholders.
- **Quick jump** dropdown (Settings → Browsing): YouTube, Discord, Spotify, TikTok, Twitch, Reddit, X, Instagram, Roblox — one click launches it through the proxy.
- **Sidebar jump list** — the sidebar grows a "jump" section with the big sites (toggleable).
- **Open searches in a real new tab** (toggle), **custom new-tab page** (home / blank / any URL) with fresh-tab detection.
- **Local history** (opt-in) with viewer modal, one-click relaunch, and clear; **custom pinned shortcuts** on the home screen with shuffle + "Surprise me" random pin.

### Music

- **15 curated official Spotify playlists** in 5 categories (Trending, Genres, Decades, Chill, Workout) — all verified live against Spotify's oembed at build time — played through Spotify's official embed player. Star any playlist into a **Favorites** tab.
- **Real song search** — keyless merge of iTunes Search API + Deezer (`/music/search`): title, artist, album, hi-res cover, duration, Spotify deep link. Searches as you type (3+ chars, debounced).
- **Full-song playback** through YouTube's official keyless embed player: `/music/yt` resolves "artist — title" server-side (skips embed-blocking VEVO uploads, caches a day); the 30s preview starts instantly and hands off to the full song the moment it's rolling, and falls back to the preview if embedding refuses.
- **Queue controls** — shuffle, repeat (off / all / one), auto-advance on song end, **recently played chips** (replay any of the last 8 with one click).
- **Speed** (0.75×–2×) and **sleep timer** with a gentle last-10-seconds fade (the widget glows while armed).
- **Volume, everywhere** — a slider in the music toolbar **and** on the Now-playing widget, kept in sync, persisted across visits; a mute button on the widget; **M** mutes/unmutes anywhere.
- **Liked songs** — tap the heart on the widget (or press **L**) to like the current song; a modal lists and replays everything you've liked.
- **Now playing widget** — appears on the home screen automatically while anything plays: cover art, animated equalizer, seek bar (click to scrub), prev / play-pause / next / stop. It **always wears the liquid-glass style**, in every theme, with or without glass mode.

### Apps

- **25,000+ app tiles** (from the bundled `apps.json` catalog — 25,010 unique domains, porn/ad domains pre-filtered): phone home-screen-style wall of squircle icons with the app name always printed under each icon — floating pill nav (logo · favorites-only · reset · search · sort), favorites ★ on hover, floating bottom **page-dot pill** (iOS-style dots with ‹ › arrows, 120 per page, current page persisted).
- Launching an app opens it **through the haze proxy** (games-style pane with exit button); favorites (★ per tile, favorites-only mode) and **recently opened** (14 chips) are tracked locally. Search filters the whole catalog live; the accent mirrors your haze Settings accent. Also in the command palette, with a "Open a random app" command.

### Games

- **836 games** from the gn-math catalog in a **cover-wall layout**: floating pill nav (logo · random · favorites-only · reset · search · sort), rounded cover cards with lowercase name pills overlapping each cover's bottom edge, and a floating bottom **page-picker pill** (36 games per page, 24 pages, current page persisted). Recents + favorites strips, play-count and "last played" badges, favorites-only filter, slide-up player with fullscreen and Esc-to-close. The accent color mirrors your haze Settings accent.

### Chat

- One global room for everyone on the server: accounts (name 3–16 chars, password 4+, scrypt-hashed, HMAC 7-day tokens) or ephemeral **guest** join (`Guest-####`, registered names outrank guests, `guest` badge).
- Live **online counter** (15s presence), **typing indicators** ("X is typing…"), message **filter box**, `/shrug` easter egg, and **/me actions** — `/me dances` sends an italic `* dances`.
- Messages persist server-side (`chat-data.json`, capped 2000), 2s polling, 300-message client log, network-hiccup text restore.

### Appearance

- **7 themes** (haze, Liquid Glass, galaxy, midnight, cream, rose, matrix) + 7 **accent colors**.
- **Liquid glass mode**, **floating particle background**, **icons-only sidebar**, **compact layout**, and **real 3D tilt** — pointer-driven perspective tilt on cards and widgets (disabled on touch devices and under reduced-motion).
- **Reduce transparency** — solid panels everywhere, on or off glass.
- **Wallpapers** — upload your own image (size-safe: too-big images apply for the session), 6 gradient presets, blur toggle.
- Custom wallpaper CSS presets persist until replaced; uploaded images clear them.

### Home screen

- Hero clock, date, greeting, and a **quote slideshow** (rotates every 8s; click to skip, hover pauses).
- **17 widgets** (all off by default): clock, notes, to-do, quick links, calendar, stopwatch, battery, focus timer (Pomodoro with chimes), weather (Open-Meteo, geolocation with fallback), currency (20 currencies), countdown (with 🎉 arrival toast), **password generator** (crypto-random, click to copy, ambiguity-free alphabet), habits (with 🔥 streaks), dice (d4–d100 with roll animation), world clock, timer (with title-bar countdown), connection (IP + network), daily quote.
- **Now playing** music widget (above) shows itself only while something plays.
- Widgets have inline **✕ hide buttons**; the rows themselves hide when empty.

### Power features

- **Command palette** (Ctrl/Alt+K or the `1–5` view jumps) with **fuzzy matching** — `lqd gls` finds "Toggle liquid glass" — plus commands for navigation, glass/particles/compact toggles, music transport, volume up/down, mute, liked songs, proxy-engine switch, bookmarks, history, export, and panic.
- **Tab cloak** — 14 presets (Classroom, Docs, Drive, Slides, Sheets, Gmail, Canvas, Khan, Desmos, Clever, Quizlet, IXL, DeltaMath, Wikipedia) + custom title/icon; **Open in about:blank** relaunches haze in a borderless window carrying the cloak; **panic key** (any key you pick, default `` ` ``) instantly redirects to Google Classroom, history-safe and typing-guarded.
- **Keyboard shortcuts** — `/` focus address, `m` mute, `g` games, `c` chat, `l` like, `←`/`→` seek ±10s, Ctrl/Alt+K palette.
- **Click-lock** — 1.5s hold to click anything (no accidental clicks).
- **Alarm** (HH:MM, toggleable, chime), **timer** + Pomodoro chimes, Konami-code **confetti**, tab-title pulse while music plays.
- **Data tools** — export/import all local settings as JSON, wipe everything, download notes as `.txt`.

## How it works

1. Browser loads `index.html` — the haze home screen (sidebar: Home, haze games, Music, Chat, Settings).
2. **haze games** embeds `games.html` — a searchable library of **836 games from the gn-math `zones.json` catalog** (covers stream straight from the gn-math cover CDN; wrappers load through `/games/play/:file`, which fixes the content-type jsDelivr breaks). Games run in a slide-up player with fullscreen and Esc-to-close.
3. **Music** plays real Spotify audio through Spotify's official embed player (no account, keys, or proxy). Songs play complete — not 30-second clips — through **YouTube's official keyless embed player**: `/music/yt` resolves each "artist — title" to an embeddable video server-side, and the 30s Apple/Deezer preview starts instantly then hands off the moment the full song is rolling. Every result also carries a Spotify deep link. Note: Spotify's catalog is DRM-protected, so this is embed/preview playback — the only client-side way to play real Spotify songs without a paid API integration.
4. **Chat** is one global room for everyone on the server. Passwords are scrypt-hashed with per-user salts, sessions are HMAC-signed tokens (7-day expiry, kept in `localStorage`), messages persist in `chat-data.json` and refresh by 2s polling. History loads on join; log out any time. Note: this is a small-server room, not E2E-encrypted — anyone with server access can read it.
5. **Tab cloak** (Settings) disguises the tab as an educational site — 14 presets swap the title + favicon (custom title/icon supported; bare domains auto-route through Google's favicon service). The optional **panic key** instantly redirects to a safe-looking site from anywhere; `location.replace` keeps haze out of back-history, and it's disabled while typing in a text field.
6. Settings persist locally (`haze-settings`, plus separate keys for wallpaper, bookmarks, history, music favorites/recent/liked) — nothing leaves your device except chat and the API calls listed above.
7. **Scramjet path:** `index.js` registers root `sw.js` (a thin shim importing `controller.sw.js`), builds the epoxy transport, and constructs the page-side `Controller` (RPC handshake + wasm preload). Navigation goes through `/~/sj/<controller-id>/<frame-id>/…`.
8. **Ultraviolet path:** `index.js` registers `/uv/sw.js` scoped to `/uv/service/`, points bare-mux's SharedWorker at the epoxy ESM transport (`/epoxy/index.mjs`) with the same wisp URL, and navigates a plain iframe to `/uv/service/<encoded-url>` (xor codec).

## How it works (Scramjet details)

The page-side `Controller` performs an RPC handshake with the service worker (registering its frame prefix), preloads `scramjet.wasm` itself, and wires the epoxy transport directly (`new EpoxyTransport({ wisp })` → `await transport.init()`). The service worker may idle out and lose the controller registration; the SW broadcasts a revive message and the controller re-registers automatically.

Note: v2 preloads the wasm up front, so the v1 cold-start workaround (prewarm + retry-on-first-navigation) is gone.

## Config

- `PORT` env var (default `8000`)
- DNS servers + other wisp options at top of `server.js`
