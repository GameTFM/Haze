# haze — run doc

Static UI + Scramjet proxy, served by one Node process. No build step and no
bundler: the browser loads Scramjet, BareMux and Epoxy straight out of
`node_modules` through a few static mounts in `server.js`.

## Layout

```
standalone/
  server.js              static file server + Wisp websocket (/wisp/)
  package.json           deps: scramjet, bare-mux, epoxy-transport, wisp-server-node
  public/index.html      shell (sidebar, topbar, home, collection views)
  public/style.css       dark/light theme
  public/app.js          proxy wiring, tabs, navigation, clock, shortcuts
  public/config.js       Scramjet config shared by the page and the worker
  public/transport.js    BareTransport adapter over epoxy-transport
  public/sw.js           Scramjet service worker (registered by app.js)
  public/apps.js         app catalog + default shortcut tiles
```

## Install

System Node 26 works (`node -v` → v26.x). From `haze/`:

```
npm install
```

`@mercuryworkshop/scramjet` declares an `only-allow pnpm` preinstall; npm 11
skips it with a warning, which is fine — no postinstall step is needed.

## Run

```
node server.js
```

- Default port **8000**, override with `PORT`.
- Mounts: `/` (UI), `/scramlib/` (scramjet dist), `/baremux/`,
  `/epoxy-transport/`, `/wisp/` (websocket —
  a plain GET returns 404; check with a 101 upgrade).
- Verify: `curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/` → 200.

## How the proxy is wired

`public/app.js`:

1. `public/transport.js` wraps `@mercuryworkshop/epoxy-transport`: BareMux sends
   `BareHeaders` objects while Epoxy wants a real `Headers` instance.
2. `BareMuxConnection("/baremux/worker.js")` →
   `setRemoteTransport(new HazeTransport({ wisp: ws(s)://<host>/wisp/ }))`.
   This must be the *remote* transport: BareMux's worker is a `SharedWorker`,
   and dynamic `import()` is unavailable there, so `setTransport(path)` fails
   with “Failed to fetch dynamically imported module”.
3. Scramjet 1.x does not register its own worker: `public/sw.js` does
   `importScripts("/scramlib/scramjet.all.js", "/config.js")` and routes
   matching fetches through `$scramjetLoadWorker()`. It ignores everything
   outside `/scramjet/`, so the shell and library assets are untouched
   (intercepting them deadlocks boot while `init()` is still running), and it
   must not `clients.claim()` for the same reason. The worker takes its real
   config from the `config` record in the `$scramjet` database, written by the
   page's `init()`; `/config.js` only supplies the prefix it filters on.
4. `new ScramjetController(HAZE_CONFIG)` from `/config.js` (prefix + files),
   then `await scramjet.init()`. The prefix is the proxy namespace
   (`/scramjet/<encoded-url>`); the library files themselves are served from
   `/scramlib/` so the worker does not try to decode requests for its own
   bundle. `init()` runs **before** `registerServiceWorker()`, because it is
   what creates the object stores it then saves the config into. A worker that
   opens `$scramjet` first creates the database without those stores, so
   `initScramjet()` catches that `NotFoundError`, deletes the database and
   retries once.
5. Each tab owns a `ScramjetFrame`; `frame.go(url)` navigates, `urlchange`
   events keep the address bar and tab titles in sync.

If the banner says the engine didn't start, check the browser console — it is
almost always a missing static mount or a `wasm` MIME problem. A proxied frame
that shows `Cannot read properties of undefined (reading 'prefix')` means the
worker fetched before any config existed; reload once so `init()` can save it
(and see the stale-state note below if it persists).

Changing the proxy prefix or the `files` paths invalidates stored state: the
worker keeps its config in the `$scramjet` IndexedDB database and will keep
proxying to the old paths (the injected client then throws
`$scramjetLoadClient is not defined`). After such a change, unregister the
worker in DevTools → Application → Service workers, delete the `$scramjet`
database, and reload.

## UI notes

- Sidebar: shortcut tiles, tab list, category nav, Collapse.
- Home: wordmark, spotlight search, category chips, clock pill.
- Collections: clicking a category (sidebar or chip) opens a grid of apps.
- Shortcuts persist in `localStorage` (`haze.shortcuts`), tabs in
  `haze.tabs`, theme in `haze.theme`.
- Keyboard: `Ctrl/Cmd+T` new tab, `Ctrl/Cmd+W` close tab, `Ctrl/Cmd+L`
  address bar, `Ctrl/Cmd+K` search.
