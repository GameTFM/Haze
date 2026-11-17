/* haze ad + tracker blocking for proxied pages.
 *
 * Runs inside the root service worker. Scramjet gives us every request a
 * proxied page makes, so we can drop ad/tracker hosts before the request is
 * tunnelled. Host suffix matching only — no broad keyword rules that would
 * break sign-in, video, or site scripts.
 */
(function () {
  "use strict";

  var BLOCK = [
    "doubleclick.net",
    "googlesyndication.com",
    "googleadservices.com",
    "googletagservices.com",
    "adservice.google.com",
    "amazon-adsystem.com",
    "adsrvr.org",
    "adnxs.com",
    "rubiconproject.com",
    "pubmatic.com",
    "openx.net",
    "criteo.com",
    "criteo.net",
    "taboola.com",
    "outbrain.com",
    "scorecardresearch.com",
    "quantserve.com",
    "moatads.com",
    "adform.net",
    "smartadserver.com",
    "casalemedia.com",
    "33across.com",
    "bidswitch.net",
    "sharethrough.com",
    "spotxchange.com",
    "teads.tv",
    "3lift.com",
    "krxd.net",
    "demdex.net",
    "omtrdc.net",
    "everesttech.net",
    "bluekai.com",
    "exelator.com",
    "rlcdn.com",
    "agkn.com",
    "mathtag.com",
    "turn.com",
    "tapad.com",
    "adsafeprotected.com",
    "doubleverify.com",
    "yieldmo.com",
    "gumgum.com",
    "sovrn.com",
    "lijit.com",
    "indexww.com",
    "zemanta.com",
    "contextweb.com",
    "tremorhub.com",
    "undertone.com",
    "yieldlab.net",
    "stickyadstv.com",
    "innovid.com",
    "serving-sys.com",
    "flashtalking.com",
    "sizmek.com",
    "adcolony.com",
    "applovin.com",
    "unityads.unity3d.com",
    "chartboost.com",
    "vungle.com",
    "ironsrc.com",
  ];

  var enabled = true;
  var total = 0;
  var announceTimer = null;

  function hostBlocked(host) {
    var h = String(host || "").toLowerCase().replace(/\.$/, "");
    if (!h) return false;
    for (var i = 0; i < BLOCK.length; i++) {
      var s = BLOCK[i];
      if (h === s || h.slice(-(s.length + 1)) === "." + s) return true;
    }
    return false;
  }

  /* Decode the real destination from a Scramjet or Ultraviolet URL. */
  function targetOf(raw) {
    var u;
    try {
      u = new URL(raw);
    } catch (e) {
      return null;
    }
    var p = u.pathname;
    var encoded = "";
    if (p.indexOf("/~/sj/") === 0) {
      var parts = p.split("/").filter(Boolean); // ~ sj client frame <encoded>
      if (parts.length < 5) return null;
      encoded = parts.slice(4).join("/");
    } else if (p.indexOf("/uv/service/") === 0) {
      encoded = p.slice("/uv/service/".length);
    } else {
      return null;
    }
    try {
      return new URL(decodeURIComponent(encoded));
    } catch (e) {
      return null;
    }
  }

  function shouldBlock(request) {
    if (!enabled) return false;
    var target = targetOf(request.url);
    if (!target) return false;
    if (!/^https?:$/.test(target.protocol)) return false;
    return hostBlocked(target.hostname);
  }

  function announce() {
    if (announceTimer) return;
    announceTimer = setTimeout(function () {
      announceTimer = null;
      try {
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clients) {
          for (var i = 0; i < clients.length; i++) {
            clients[i].postMessage({ type: "haze-adblock-count", count: total, enabled: enabled });
          }
        });
      } catch (e) {}
    }, 150);
  }

  function blockedResponse(request) {
    total++;
    announce();
    if (request.destination === "script") {
      return new Response("/* blocked by haze */", {
        status: 200,
        headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" },
      });
    }
    if (request.destination === "image") {
      var gif = "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
      var bytes = Uint8Array.from(atob(gif), function (c) { return c.charCodeAt(0); });
      return new Response(bytes, {
        status: 200,
        headers: { "content-type": "image/gif", "cache-control": "no-store" },
      });
    }
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  }

  self.HazeAdblock = {
    shouldBlock: shouldBlock,
    respond: blockedResponse,
    setEnabled: function (on) {
      enabled = !!on;
      announce();
    },
    get enabled() {
      return enabled;
    },
    get count() {
      return total;
    },
    resetCount: function () {
      total = 0;
      announce();
    },
  };

  self.addEventListener("message", function (event) {
    var data = event.data || {};
    if (data.type === "haze-adblock") self.HazeAdblock.setEnabled(data.enabled);
    if (data.type === "haze-adblock-reset") self.HazeAdblock.resetCount();
  });
})();
