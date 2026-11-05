// Scramjet 1.x expects the host app to register its own service worker.
// The worker reads its config from the `$scramjet` IndexedDB record that the
// page's `controller.init()` writes; "/config.js" only provides the prefix used
// to filter requests below.
importScripts("/scramlib/scramjet.all.js", "/config.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();
const PROXY_PREFIX = HAZE_CONFIG.prefix;

self.addEventListener("fetch", (event) => {
	const url = new URL(event.request.url);
	// Only proxied navigations belong to Scramjet. Anything else (the shell,
	// the library bundles, the Wisp websocket) passes straight through.
	if (url.origin !== self.location.origin || !url.pathname.startsWith(PROXY_PREFIX)) return;

	event.respondWith(
		(async () => {
			try {
				await scramjet.loadConfig();
				if (scramjet.route(event)) return await scramjet.fetch(event);
				return await fetch(event.request);
			} catch (err) {
				console.error("haze: proxy request failed", url.pathname, err);
				return new Response(`haze: proxy request failed\n\n${err?.stack || err}`, {
					status: 502,
					headers: { "content-type": "text/plain; charset=utf-8" },
				});
			}
		})(),
	);
});

// Activate new builds promptly, but never claim existing clients mid-boot.
self.addEventListener("install", () => self.skipWaiting());
