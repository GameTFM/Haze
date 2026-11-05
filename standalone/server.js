import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import wisp from "wisp-server-node";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, "public");
const requestedPort = Number.parseInt(process.env.PORT || "", 10);
const PORT = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 8000;

// Library builds served straight out of node_modules, no bundler needed.
const MOUNTS = [
// Library builds live under /scramlib/ rather than /scramjet/: the latter is
	// the proxy URL namespace handled by the service worker, which would
	// otherwise intercept (and fail to decode) requests for its own assets.
	["/scramlib/", path.join(ROOT, "node_modules/@mercuryworkshop/scramjet/dist")],
	["/baremux/", path.join(ROOT, "node_modules/@mercuryworkshop/bare-mux/dist")],
	["/epoxy-transport/", path.join(ROOT, "node_modules/@mercuryworkshop/epoxy-transport/dist")],
];

const MIME = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".cjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".map": "application/json; charset=utf-8",
	".wasm": "application/wasm",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".ico": "image/x-icon",
	".woff2": "font/woff2",
	".txt": "text/plain; charset=utf-8",
};

function send(res, status, body, headers = {}) {
	res.writeHead(status, { "content-type": "text/plain; charset=utf-8", ...headers });
	res.end(body);
}

async function serveFile(req, res, filePath, cacheControl = "no-cache") {
	let stat;
	try {
		stat = await fs.promises.stat(filePath);
	} catch {
		return false;
	}
	if (!stat.isFile()) return false;

	const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
	res.writeHead(200, {
		"content-type": type,
		"content-length": stat.size,
		"cache-control": cacheControl,
	});
	if (req.method === "HEAD") {
		res.end();
		return true;
	}
	fs.createReadStream(filePath).pipe(res);
	return true;
}

const server = http.createServer(async (req, res) => {
	let pathname;
	try {
		pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
	} catch {
		return send(res, 400, "bad request");
	}

	if (pathname === "/wisp" || pathname.startsWith("/wisp/")) {
		return send(res, 404, "wisp is websocket only — connect with a ws upgrade");
	}
	if (req.method !== "GET" && req.method !== "HEAD") {
		return send(res, 405, "method not allowed", { allow: "GET, HEAD" });
	}

	for (const [prefix, dir] of MOUNTS) {
		if (!pathname.startsWith(prefix)) continue;
		const target = path.join(dir, pathname.slice(prefix.length));
		if (!target.startsWith(dir)) return send(res, 403, "forbidden");
		if (await serveFile(req, res, target)) return;
		return send(res, 404, "not found");
	}

	const rel = pathname === "/" ? "index.html" : pathname.slice(1);
	const target = path.join(PUBLIC_DIR, rel);
	if (target.startsWith(PUBLIC_DIR) && (await serveFile(req, res, target, "no-store"))) return;

	// Client routes fall back to the shell.
	if (!path.extname(rel) && (await serveFile(req, res, path.join(PUBLIC_DIR, "index.html"), "no-store"))) return;
	return send(res, 404, "not found");
});

server.on("upgrade", (req, socket, head) => {
	if (req.url === "/wisp/" || req.url.startsWith("/wisp/")) {
		wisp.routeRequest(req, socket, head);
		return;
	}
	socket.destroy();
});

server.on("error", (err) => {
	if (err.code === "EADDRINUSE") {
		console.error(`port ${PORT} is already in use — set PORT to something else`);
		process.exit(1);
	}
	throw err;
});

server.listen(PORT, () => {
	console.log(`
  haze is up (scramjet v2, static vendored)
  local   -> http://localhost:${PORT}
  network -> http://${os.hostname()}:${PORT}

  wisp endpoint: /wisp/
`);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
	process.on(sig, () => {
		server.close(() => process.exit(0));
	});
}
