// BareMux hands the transport BareHeaders objects, but EpoxyClient expects a
// real Headers instance. This adapter also lets the transport live on the main
// thread: BareMux's worker is a SharedWorker, where dynamic import() is not
// available, so `setTransport(path)` cannot load a module there.
import EpoxyTransport from "/epoxy-transport/index.mjs";

function toHeaders(input) {
	if (!input) return new Headers();
	if (input instanceof Headers) return input;
	if (Array.isArray(input)) return new Headers(input);
	const out = new Headers();
	for (const [key, value] of Object.entries(input)) {
		if (Array.isArray(value)) for (const item of value) out.append(key, item);
		else if (value != null) out.set(key, String(value));
	}
	return out;
}

export default class HazeTransport extends EpoxyTransport {
	request(remote, method, body, headers, signal) {
		return super.request(remote, method, body, toHeaders(headers), signal);
	}

	connect(url, protocols, requestHeaders, onopen, onmessage, onclose, onerror) {
		return super.connect(url, protocols, toHeaders(requestHeaders), onopen, onmessage, onclose, onerror);
	}
}
