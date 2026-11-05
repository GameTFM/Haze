// Scramjet configuration shared by the page (loaded before app.js) and by the
// service worker (importScripts). Classic script on purpose: importScripts()
// cannot load ES modules.
//
// The worker must own this: it used to depend on the page posting its config,
// which failed whenever a proxied request arrived before that message (or after
// the worker was respawned), leaving it with no config at all.
self.HAZE_CONFIG = {
	prefix: "/scramjet/",
	files: {
		wasm: "/scramlib/scramjet.wasm.wasm",
		all: "/scramlib/scramjet.all.js",
		sync: "/scramlib/scramjet.sync.js",
	},
	globals: {
		wrapfn: "$scramjet$wrap",
		wrappropertybase: "$scramjet__",
		wrappropertyfn: "$scramjet$prop",
		cleanrestfn: "$scramjet$clean",
		importfn: "$scramjet$import",
		rewritefn: "$scramjet$rewrite",
		metafn: "$scramjet$meta",
		setrealmfn: "$scramjet$setrealm",
		pushsourcemapfn: "$scramjet$pushsourcemap",
		trysetfn: "$scramjet$tryset",
		templocid: "$scramjet$temploc",
		tempunusedid: "$scramjet$tempunused",
	},
	flags: {
		serviceworkers: false,
		syncxhr: false,
		strictRewrites: true,
		rewriterLogs: false,
		captureErrors: true,
		cleanErrors: false,
		scramitize: false,
		sourcemaps: true,
		destructureRewrites: false,
		interceptDownloads: false,
		allowInvalidJs: true,
		allowFailedIntercepts: true,
	},
	siteFlags: {},
	codec: {
		encode: (url) => (url ? encodeURIComponent(url) : url),
		decode: (url) => (url ? decodeURIComponent(url) : url),
	},
};
