// Scramjet service worker.
// Loads the controller, which intercepts and routes proxied requests.
// This file MUST be served from your site root so its scope covers the whole app.
importScripts("/controller/controller.sw.js", "/adblock.js");

// Drop ad/tracker destinations before the controller opens a tunnel stream.
// controller.sw.js exposes route as a getter-only property, so patching the
// property silently fails; wrap the controller object itself instead.
const hazeController = $scramjetController;
const hazeRoute = hazeController.route.bind(hazeController);
$scramjetController = {
  shouldRoute: hazeController.shouldRoute.bind(hazeController),
  route: (event) => {
    if (self.HazeAdblock && self.HazeAdblock.shouldBlock(event.request)) {
      return self.HazeAdblock.respond(event.request);
    }
    return hazeRoute(event);
  },
};

self.addEventListener("install", () => self.skipWaiting());

addEventListener("fetch", (e) => {
  if ($scramjetController.shouldRoute(e)) {
    e.respondWith($scramjetController.route(e));
  }
});
