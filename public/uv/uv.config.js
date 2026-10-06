// haze's Ultraviolet config — script paths point at the vendored /uv/ files.
self.__uv$config = {
  prefix: "/uv/service/",
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: "/uv/uv.handler.js",
  client: "/uv/uv.client.js",
  bundle: "/uv/uv.bundle.js",
  config: "/uv/uv.config.js",
  sw: "/uv/uv.sw.js",
  transport: "/epoxy/index.mjs",
  wsTransportUrl: (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/",
};
