/* Haze account: Freebuff sign-in (Google/GitHub/Apple) + per-user saved data. */
(() => {
  const $ = (id) => document.getElementById(id);
  const ACCOUNT_API = "/api/account/me";
  const DATA_API = "/api/account/data";
  const TRACKED_KEYS = ["haze-settings", "haze-widget-notes", "haze-widget-todos", "haze-widget-quicklinks", "haze-focus-mode-v1"];
  const nativeSetItem = Storage.prototype.setItem;
  let applyingRemote = false;

  // Keep a local change stamp so an account sync does not clobber newer local
  // edits with an older server copy.
  Storage.prototype.setItem = function (key, value) {
    const result = nativeSetItem.call(this, key, value);
    if (!applyingRemote && TRACKED_KEYS.includes(key)) {
      try { nativeSetItem.call(this, "haze-local-data-at", String(Date.now())); } catch {}
    }
    return result;
  };

  const accountBtn = $("hzb-account");
  const accountAvatar = $("hzb-account-avatar");
  const backdrop = $("hz-account-backdrop");
  const closeBtn = $("hz-account-close");
  const signedOut = $("hz-account-signed-out");
  const signedIn = $("hz-account-signed-in");
  const signin = $("hz-account-signin");
  const signinHref = signin?.getAttribute("href") || "";
  const signinNote = document.querySelector(".hz-account-note");
  const signinNoteText = signinNote?.textContent || "";
  const signoutForm = $("hz-account-signout-form");
  const pic = $("hz-account-pic");
  const initial = $("hz-account-initial");
  const nameEl = $("hz-account-name");
  const emailEl = $("hz-account-email");
  const saveBtn = $("hz-account-save");
  const statusEl = $("hz-account-status");
  if (!accountBtn || !backdrop) return;

  const state = {
    user: null,
    updatedAt: 0,
    storage: false,
    busy: false,
    unavailable: false,
    lastSaved: "",
    open: false,
  };

  function readSettings() {
    try {
      const value = JSON.parse(localStorage.getItem("haze-settings") || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  }

  function readTodos() {
    try {
      const value = JSON.parse(localStorage.getItem("haze-widget-todos") || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function readQuicklinks() {
    try {
      const value = JSON.parse(localStorage.getItem("haze-widget-quicklinks") || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function snapshot() {
    return {
      settings: readSettings(),
      notes: localStorage.getItem("haze-widget-notes") || "",
      todos: readTodos(),
      quicklinks: readQuicklinks(),
      focusMode: localStorage.getItem("haze-focus-mode-v1") === "1",
    };
  }

  function localDataAt() {
    return Number(localStorage.getItem("haze-local-data-at") || 0) || 0;
  }

  function setStatus(text, kind = "") {
    if (!statusEl) return;
    statusEl.textContent = text || "";
    statusEl.className = "hz-account-status" + (kind ? " is-" + kind : "");
  }

  function initialOf(user) {
    const source = String(user?.name || user?.email || "h").trim();
    return source ? source.charAt(0).toUpperCase() : "H";
  }

  function pictureUrl(user) {
    try {
      const value = new URL(String(user?.picture || ""));
      return value.protocol === "https:" ? value.href : "";
    } catch {
      return "";
    }
  }

  function render() {
    const user = state.user;
    const signed = !!user;
    accountBtn.classList.toggle("is-user", signed);
    accountBtn.title = signed
      ? "Account: " + (user.name || user.email || "signed in")
      : state.unavailable
        ? "Account sign-in unavailable"
        : "Sign in to save your Haze";
    accountBtn.setAttribute("aria-label", accountBtn.title);
    accountAvatar.textContent = signed ? initialOf(user) : "?";
    if (signin) {
      signin.hidden = !signed && state.unavailable;
      if (signinHref) signin.setAttribute("href", signinHref);
    }
    if (signinNote) {
      signinNote.textContent = !signed && state.unavailable
        ? "Accounts are not configured on this deployment. Haze still works locally."
        : signinNoteText;
    }

    signedOut.hidden = signed;
    signedIn.hidden = !signed;
    if (!signed) return;

    nameEl.textContent = user.name || user.email || "Haze account";
    emailEl.textContent = user.email || "Signed in";
    const url = pictureUrl(user);
    pic.hidden = !url;
    initial.hidden = !!url;
    initial.textContent = initialOf(user);
    if (url) {
      pic.src = url;
      pic.alt = user.name ? user.name + " profile photo" : "Profile photo";
    } else {
      pic.removeAttribute("src");
      pic.alt = "";
    }
  }

  function openPanel() {
    state.open = true;
    backdrop.hidden = false;
    accountBtn.setAttribute("aria-expanded", "true");
    closeBtn?.focus();
  }

  function closePanel() {
    state.open = false;
    backdrop.hidden = true;
    accountBtn.setAttribute("aria-expanded", "false");
    accountBtn.focus();
  }

  async function save(force = false) {
    if (!state.user || state.busy) return;
    const payload = JSON.stringify(snapshot());
    if (!force && payload === state.lastSaved) return;
    state.busy = true;
    setStatus("Saving to your account…");
    try {
      const res = await fetch(DATA_API, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: JSON.parse(payload) }),
      });
      if (res.status === 401) {
        state.user = null;
        render();
        setStatus("Your session ended. Sign in again to sync.", "bad");
        return;
      }
      if (!res.ok) {
        let message = "Could not save right now.";
        try { message = (await res.json()).error || message; } catch {}
        setStatus(message, "bad");
        return;
      }
      const result = await res.json();
      state.lastSaved = payload;
      state.updatedAt = Number(result.updatedAt) || Date.now();
      nativeSetItem.call(localStorage, "haze-local-data-at", String(state.updatedAt));
      nativeSetItem.call(localStorage, "haze-account-user", state.user.sub);
      setStatus("Saved just now", "ok");
    } catch {
      setStatus("Could not reach account storage.", "bad");
    } finally {
      state.busy = false;
    }
  }

  async function reconcile(remote, updatedAt) {
    const localAt = localDataAt();
    const remoteAt = Number(updatedAt) || 0;
    if (remote && (!localAt || remoteAt > localAt)) {
      applyingRemote = true;
      try {
        if (remote.settings && typeof remote.settings === "object" && !Array.isArray(remote.settings)) {
          nativeSetItem.call(localStorage, "haze-settings", JSON.stringify(remote.settings));
        }
        if (typeof remote.notes === "string") {
          nativeSetItem.call(localStorage, "haze-widget-notes", remote.notes);
        }
        if (Array.isArray(remote.todos)) {
          nativeSetItem.call(localStorage, "haze-widget-todos", JSON.stringify(remote.todos));
        }
        if (Array.isArray(remote.quicklinks)) {
          nativeSetItem.call(localStorage, "haze-widget-quicklinks", JSON.stringify(remote.quicklinks));
        }
        if (typeof remote.focusMode === "boolean") {
          nativeSetItem.call(localStorage, "haze-focus-mode-v1", remote.focusMode ? "1" : "0");
        }
        nativeSetItem.call(localStorage, "haze-local-data-at", String(remoteAt || Date.now()));
        nativeSetItem.call(localStorage, "haze-account-user", state.user.sub);
      } finally {
        applyingRemote = false;
      }
      setStatus("Restored from your account. Reloading…", "ok");
      setTimeout(() => location.reload(), 180);
      return;
    }

    await save(true);

    if (!state.storage) {
      setStatus("Signed in, but account storage is not ready yet.", "bad");
    }
  }

  async function loadAccount() {
    let res;
    try {
      res = await fetch(ACCOUNT_API, { cache: "no-store", credentials: "same-origin" });
    } catch {
      state.unavailable = true;
      render();
      return;
    }
    if (res.status === 401) {
      state.user = null;
      state.unavailable = false;
      render();
      return;
    }
    if (!res.ok) {
      state.unavailable = true;
      render();
      return;
    }
    let data;
    try {
      data = await res.json();
    } catch {
      state.unavailable = true;
      render();
      return;
    }
    if (!data.user) {
      state.user = null;
      render();
      return;
    }
    state.user = data.user;
    state.updatedAt = Number(data.updatedAt) || 0;
    state.storage = !!data.storage;
    state.unavailable = false;
    render();
    await reconcile(data.data, state.updatedAt);
  }

  signin?.addEventListener("click", () => {
    const returnTo = location.pathname + location.search;
    signin.href = "/auth/freebuff/signin?returnTo=" + encodeURIComponent(returnTo || "/");
  });

  accountBtn.addEventListener("click", () => {
    if (state.open) closePanel();
    else openPanel();
  });
  closeBtn?.addEventListener("click", closePanel);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closePanel();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.open) closePanel();
  });

  saveBtn?.addEventListener("click", () => save(true));

  signoutForm?.addEventListener("submit", () => {
    try {
      localStorage.removeItem("haze-account-user");
    } catch {}
  });

  pic?.addEventListener("error", () => {
    pic.hidden = true;
    initial.hidden = false;
  });

  setInterval(() => {
    if (state.user && !state.busy) save(false);
  }, 5000);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.user) save(false);
  });

  loadAccount();
})();
