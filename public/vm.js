/* ==========================================================================
   haze vm — a real, local virtual filesystem + shell + in-terminal apps
   Persisted in localStorage. No network, ever.
   ========================================================================== */

const shell = window.hazeOS;
const STORE_KEY = "haze-vm-vfs-v1";
const HOME = "/home/haze";
const MAX_FILE = 64 * 1024;
const MAX_BYTES = 420 * 1024;
const MAX_ENTRIES = 480;
const QUOTA_KB = 512;

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const print = (text) => shell.term.write(String(text ?? ""));
const printErr = (text) => shell.term.write(String(text ?? ""), "hz-term-err");
const fail = (msg) => ({ err: msg });
const ok = (outText = "") => ({ out: outText });

/* --------------------------------------------------------------------------
   seed
   -------------------------------------------------------------------------- */

function seed() {
  const now = Date.now();
  const dir = () => ({ t: "d", m: now });
  const file = (c) => ({ t: "f", c, m: now });

  const tree = {
    "/": dir(),
    "/home": dir(),
    "/home/haze": dir(),
    "/tmp": dir(),
    "/home/haze/readme.md": file(
      `# haze vm

A real filesystem, in your browser. Everything you write is saved to
localStorage, so it survives a reload. No server, no network.

  ls -la                what is here
  cd documents          walk around
  cat welcome.txt       read a file
  edit notes.txt        open the editor
  tree                  see the whole shape
  df                    disk usage

The editor: type lines to append, then
  :w    save          :q    quit          :wq   save & quit
  :q!   discard       :d N  delete line   :p    redraw the buffer

format wipes this disk and restores the seed.
`),
    "/home/haze/notes.txt": file(
      `notes — scratchpad
--------------------
- ship the vm before lunch
- one file, one idea
- keep the seed small; grow it from the shell
`),
    "/home/haze/documents/welcome.txt": file(
      `Welcome to haze.

The address bar still browses the web. This disk is for the things you
want to keep: notes, snippets, tiny scripts, the lot.

Try: echo "hello" > hello.txt
`),
    "/home/haze/documents/todo.md": file(
      `# todo

- [x] mount a filesystem
- [ ] write something worth keeping
- [ ] avoid formatting by accident
`),
    "/home/haze/scripts/hello.sh": file(`#!/bin/sh
# runs nowhere — but it reads nicely
echo "hello from the haze vm"
`),
    "/home/haze/.profile": file(`export PS1="haze@os \\w $ "
export EDITOR=edit
`),
  };
  for (const p of ["/home/haze/documents", "/home/haze/scripts"]) tree[p] = dir();
  return tree;
}

/* --------------------------------------------------------------------------
   storage
   -------------------------------------------------------------------------- */

let fsMap = {};
let cwd = HOME;
let mountNote = "";
let degraded = "";

function stats() {
  let bytes = 0;
  let files = 0;
  let dirs = 0;
  for (const p of Object.keys(fsMap)) {
    const node = fsMap[p];
    if (node.t === "d") dirs++;
    else {
      files++;
      bytes += (node.c || "").length;
    }
  }
  return { bytes, files, dirs, entries: files + dirs };
}

function persist() {
  const s = stats();
  if (s.bytes > MAX_BYTES) return { ok: false, err: `write: no space left on device (quota ${fmtBytes(MAX_BYTES)})` };
  if (s.entries > MAX_ENTRIES) return { ok: false, err: "write: too many files (inode limit)" };
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, map: fsMap }));
    degraded = "";
    return { ok: true };
  } catch {
    degraded = "localStorage rejected the write";
    return { ok: false, err: "write: no space left on device (localStorage is full)" };
  }
}

function loadFs() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORE_KEY);
  } catch {
    mountNote = "vm: storage is unavailable — the disk is read-only this session";
    degraded = "storage unavailable";
    fsMap = seed();
    return;
  }
  if (!raw) {
    fsMap = seed();
    persist();
    mountNote = "vm: new disk formatted at ~ — type ls";
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== 1 || !parsed.map || typeof parsed.map !== "object") throw new Error("shape");
    if (!parsed.map["/"] || parsed.map["/"].t !== "d") throw new Error("root");
    fsMap = parsed.map;
    for (const p of ["/", "/home", HOME, "/tmp"]) {
      if (!fsMap[p] || fsMap[p].t !== "d") fsMap[p] = { t: "d", m: Date.now() };
    }
  } catch {
    try {
      localStorage.setItem(STORE_KEY + "-corrupt", raw);
    } catch {}
    fsMap = seed();
    persist();
    mountNote = "vm: the saved disk was unreadable — reseeded (old copy kept aside)";
    degraded = "corrupt image";
  }
}

/* --------------------------------------------------------------------------
   paths
   -------------------------------------------------------------------------- */

function normalize(path) {
  const parts = [];
  for (const seg of String(path).split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return "/" + parts.join("/");
}

function resolve(input) {
  let p = String(input ?? "");
  if (!p) return cwd;
  if (p === "~") return HOME;
  if (p.startsWith("~/")) p = HOME + p.slice(1);
  if (!p.startsWith("/")) p = (cwd === "/" ? "" : cwd) + "/" + p;
  return normalize(p);
}

const baseName = (p) => (p === "/" ? "/" : p.split("/").pop());
const dirName = (p) => (p.lastIndexOf("/") <= 0 ? "/" : p.slice(0, p.lastIndexOf("/")));
const pretty = (p) => (p === HOME ? "~" : p.startsWith(HOME + "/") ? "~" + p.slice(HOME.length) : p);
const cwdLabel = () => pretty(cwd);

function childrenOf(path) {
  const prefix = path === "/" ? "/" : path + "/";
  const out = new Map();
  for (const key of Object.keys(fsMap)) {
    if (key === path || !key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    if (!rest || rest.includes("/")) continue;
    out.set(rest, fsMap[key]);
  }
  return out;
}

function keysUnder(path) {
  const prefix = path === "/" ? "/" : path + "/";
  return Object.keys(fsMap)
    .filter((k) => k === path || k.startsWith(prefix))
    .sort((a, b) => a.length - b.length);
}

function isWithin(child, parent) {
  return child === parent || child.startsWith(parent === "/" ? "/" : parent + "/");
}

/* --------------------------------------------------------------------------
   formatting
   -------------------------------------------------------------------------- */

function fmtBytes(n) {
  if (n < 1024) return n + "B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + "K";
  return (n / 1048576).toFixed(1) + "M";
}

function fmtDate(ms) {
  const d = new Date(ms || Date.now());
  return (
    d.toLocaleDateString([], { month: "short", day: "2-digit" }) +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

const pad = (s, n) => String(s).padStart(n, " ");

/* --------------------------------------------------------------------------
   writes
   -------------------------------------------------------------------------- */

function writeText(path, text) {
  const parent = fsMap[dirName(path)];
  if (!parent || parent.t !== "d") return fail(`write: ${pretty(path)}: no such file or directory`);
  if (String(text).length > MAX_FILE) return fail(`write: ${baseName(path)}: file too large (max ${fmtBytes(MAX_FILE)})`);
  const prev = fsMap[path];
  fsMap[path] = { t: "f", c: String(text), m: Date.now() };
  const saved = persist();
  if (!saved.ok) {
    if (prev) fsMap[path] = prev;
    else delete fsMap[path];
    return fail(saved.err);
  }
  return ok();
}

/* --------------------------------------------------------------------------
   shell commands
   -------------------------------------------------------------------------- */

const commands = {};

commands.echo = (args) => ok(args.join(" "));

commands.pwd = () => ok(cwd);

commands.cd = (args) => {
  const target = args[0] || "~";
  const p = resolve(target);
  const node = fsMap[p];
  if (!node) return fail(`cd: ${target}: no such file or directory`);
  if (node.t !== "d") return fail(`cd: ${target}: not a directory`);
  cwd = p;
  shell.term.setPrompt(cwdLabel());
  return ok();
};

commands.ls = (args) => {
  let all = false;
  let long = false;
  const rest = [];
  for (const a of args) {
    if (a.startsWith("-") && a.length > 1 && !a.startsWith("--")) {
      for (const ch of a.slice(1)) {
        if (ch === "a") all = true;
        else if (ch === "l") long = true;
        else if (ch === "h") continue;
        else return fail(`ls: invalid option -- '${ch}'`);
      }
    } else rest.push(a);
  }
  const target = rest[0] ? resolve(rest[0]) : cwd;
  const node = fsMap[target];
  if (!node) return fail(`ls: ${rest[0] || pretty(target)}: no such file or directory`);
  if (node.t === "f") return ok(baseName(target));

  const entries = [...childrenOf(target).entries()]
    .filter(([name]) => all || !name.startsWith("."))
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (!entries.length) return ok("");
  if (!long) return ok(entries.map(([name, ino]) => (ino.t === "d" ? name + "/" : name)).join("  "));

  const rows = entries.map(([name, ino]) => {
    const size = ino.t === "d" ? 4096 : (ino.c || "").length;
    return `${ino.t === "d" ? "d" : "-"}rw-r--r--  ${pad(size, 6)}  ${fmtDate(ino.m)}  ${name}${ino.t === "d" ? "/" : ""}`;
  });
  return ok(["total " + entries.length, ...rows].join("\n"));
};

commands.cat = (args) => {
  if (!args.length) return fail("cat: missing operand");
  const parts = [];
  for (const a of args) {
    const p = resolve(a);
    const node = fsMap[p];
    if (!node) return fail(`cat: ${a}: no such file or directory`);
    if (node.t === "d") return fail(`cat: ${a}: is a directory`);
    parts.push(node.c || "");
  }
  return ok(parts.join("\n").replace(/\n+$/, ""));
};

commands.mkdir = (args) => {
  let parents = false;
  const rest = [];
  for (const a of args) {
    if (a === "-p") parents = true;
    else if (a.startsWith("-")) return fail(`mkdir: invalid option -- '${a.slice(1)}'`);
    else rest.push(a);
  }
  if (!rest.length) return fail("mkdir: missing operand");
  const snap = JSON.stringify(fsMap);
  for (const arg of rest) {
    const p = resolve(arg);
    if (fsMap[p]) {
      if (parents && fsMap[p].t === "d") continue;
      fsMap = JSON.parse(snap);
      return fail(`mkdir: ${arg}: File exists`);
    }
    if (!parents && (!fsMap[dirName(p)] || fsMap[dirName(p)].t !== "d")) {
      fsMap = JSON.parse(snap);
      return fail(`mkdir: ${arg}: no such file or directory`);
    }
    const parts = p.split("/").filter(Boolean);
    let walk = "";
    for (const seg of parts) {
      walk += "/" + seg;
      if (!fsMap[walk]) fsMap[walk] = { t: "d", m: Date.now() };
      else if (fsMap[walk].t !== "d") {
        fsMap = JSON.parse(snap);
        return fail(`mkdir: ${arg}: not a directory`);
      }
    }
  }
  const saved = persist();
  if (!saved.ok) {
    fsMap = JSON.parse(snap);
    return fail(saved.err);
  }
  return ok();
};

commands.touch = (args) => {
  if (!args.length) return fail("touch: missing file operand");
  const snap = JSON.stringify(fsMap);
  for (const a of args) {
    const p = resolve(a);
    if (fsMap[p]) fsMap[p].m = Date.now();
    else {
      if (!fsMap[dirName(p)] || fsMap[dirName(p)].t !== "d") {
        fsMap = JSON.parse(snap);
        return fail(`touch: ${a}: no such file or directory`);
      }
      fsMap[p] = { t: "f", c: "", m: Date.now() };
    }
  }
  const saved = persist();
  if (!saved.ok) {
    fsMap = JSON.parse(snap);
    return fail(saved.err);
  }
  return ok();
};

commands.rm = (args) => {
  let recursive = false;
  let force = false;
  const rest = [];
  for (const a of args) {
    if (a === "--") continue;
    if (a.startsWith("-")) {
      for (const ch of a.slice(1)) {
        if (ch === "r" || ch === "R") recursive = true;
        else if (ch === "f") force = true;
        else return fail(`rm: invalid option -- '${ch}'`);
      }
    } else rest.push(a);
  }
  if (!rest.length) return fail("rm: missing operand");
  const snap = JSON.stringify(fsMap);
  for (const a of rest) {
    const p = resolve(a);
    const node = fsMap[p];
    if (!node) {
      if (force) continue;
      fsMap = JSON.parse(snap);
      return fail(`rm: cannot remove '${a}': No such file or directory`);
    }
    if (p === "/" || p === "/home" || p === HOME) {
      fsMap = JSON.parse(snap);
      return fail(`rm: refusing to remove '${pretty(p)}'`);
    }
    if (node.t === "d" && !recursive) {
      fsMap = JSON.parse(snap);
      return fail(`rm: cannot remove '${a}': Is a directory`);
    }
    for (const key of keysUnder(p).reverse()) delete fsMap[key];
  }
  const saved = persist();
  if (!saved.ok) {
    fsMap = JSON.parse(snap);
    return fail(saved.err);
  }
  return ok();
};

commands.mv = (args) => {
  if (args.length < 2) return fail("mv: missing file operand");
  const [src, dst] = args;
  const s = resolve(src);
  let d = resolve(dst);
  const sNode = fsMap[s];
  if (!sNode) return fail(`mv: cannot stat '${src}': No such file or directory`);
  const dNode = fsMap[d];
  if (dNode && dNode.t === "d") d = (d === "/" ? "" : d) + "/" + baseName(s);
  if (s === d) return fail(`mv: '${src}' and '${dst}' are the same file`);
  if (sNode.t === "d" && isWithin(d, s)) return fail(`mv: cannot move '${src}' to a subdirectory of itself, '${dst}'`);
  const parent = fsMap[dirName(d)];
  if (!parent || parent.t !== "d") return fail(`mv: cannot move '${src}' to '${dst}': No such file or directory`);
  if (fsMap[d] && fsMap[d].t === "d" && sNode.t === "d") return fail(`mv: cannot overwrite directory '${dst}'`);

  const snap = JSON.stringify(fsMap);
  const moving = keysUnder(s);
  for (const key of moving) {
    fsMap[d + key.slice(s.length)] = fsMap[key];
    delete fsMap[key];
  }
  const saved = persist();
  if (!saved.ok) {
    fsMap = JSON.parse(snap);
    return fail(saved.err);
  }
  return ok();
};

commands.cp = (args) => {
  let recursive = false;
  const rest = [];
  for (const a of args) {
    if (a === "-r" || a === "-R" || a === "-a") recursive = true;
    else if (a.startsWith("-")) return fail(`cp: invalid option -- '${a.slice(1)}'`);
    else rest.push(a);
  }
  if (rest.length < 2) return fail("cp: missing file operand");
  const [src, dst] = rest;
  const s = resolve(src);
  let d = resolve(dst);
  const sNode = fsMap[s];
  if (!sNode) return fail(`cp: cannot stat '${src}': No such file or directory`);
  if (sNode.t === "d" && !recursive) return fail(`cp: -r not specified; omitting directory '${src}'`);
  const dNode = fsMap[d];
  if (dNode && dNode.t === "d") d = (d === "/" ? "" : d) + "/" + baseName(s);
  if (sNode.t === "d" && isWithin(d, s)) return fail(`cp: cannot copy a directory, '${src}', into itself, '${dst}'`);
  if (!fsMap[dirName(d)] || fsMap[dirName(d)].t !== "d") return fail(`cp: target '${dst}': No such file or directory`);

  const snap = JSON.stringify(fsMap);
  for (const key of keysUnder(s)) {
    fsMap[d + key.slice(s.length)] = { ...fsMap[key], m: Date.now() };
  }
  const saved = persist();
  if (!saved.ok) {
    fsMap = JSON.parse(snap);
    return fail(saved.err);
  }
  return ok();
};

commands.tree = (args) => {
  const target = args.find((a) => !a.startsWith("-")) ? resolve(args.find((a) => !a.startsWith("-"))) : cwd;
  const node = fsMap[target];
  if (!node) return fail(`tree: ${args[0]}: No such file or directory`);
  if (node.t !== "d") return ok(pretty(target));

  const lines = [pretty(target)];
  const acc = { dirs: 0, files: 0 };
  const walk = (path, prefix, depth) => {
    if (depth > 6) return;
    const kids = [...childrenOf(path).entries()]
      .filter(([n]) => !n.startsWith("."))
      .sort((a, b) => (b[1].t === "d") - (a[1].t === "d") || a[0].localeCompare(b[0]));
    kids.forEach(([name, ino], i) => {
      const last = i === kids.length - 1;
      lines.push(prefix + (last ? "└── " : "├── ") + name + (ino.t === "d" ? "/" : ""));
      if (ino.t === "d") {
        acc.dirs++;
        walk(path === "/" ? "/" + name : path + "/" + name, prefix + (last ? "    " : "│   "), depth + 1);
      } else acc.files++;
    });
  };
  walk(target, "", 0);
  lines.push("", `${acc.dirs} directories, ${acc.files} files`);
  return ok(lines.join("\n"));
};

function globToRegex(glob) {
  return new RegExp("^" + glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
}

commands.find = (args) => {
  let targetArg = null;
  let nameGlob = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-name" && args[i + 1]) nameGlob = args[++i];
    else if (!args[i].startsWith("-")) targetArg = args[i];
  }
  const target = targetArg ? resolve(targetArg) : cwd;
  if (!fsMap[target]) return fail(`find: '${targetArg || pretty(target)}': No such file or directory`);
  const regex = nameGlob ? globToRegex(nameGlob) : null;
  const hits = [];
  const walk = (path) => {
    if (!regex || regex.test(baseName(path))) hits.push(pretty(path));
    if (fsMap[path] && fsMap[path].t === "d") {
      for (const [name] of childrenOf(path)) walk(path === "/" ? "/" + name : path + "/" + name);
    }
  };
  walk(target);
  return ok(hits.join("\n"));
};

commands.wc = (args) => {
  let mode = "all";
  const files = [];
  for (const a of args) {
    if (a === "-l") mode = "lines";
    else if (a === "-w") mode = "words";
    else if (a === "-c") mode = "bytes";
    else if (a.startsWith("-")) return fail(`wc: invalid option -- '${a.slice(1)}'`);
    else files.push(a);
  }
  if (!files.length) return fail("wc: missing file operand");
  const rows = [];
  const totals = { l: 0, w: 0, c: 0 };
  for (const f of files) {
    const p = resolve(f);
    const node = fsMap[p];
    if (!node) return fail(`wc: ${f}: No such file or directory`);
    if (node.t === "d") return fail(`wc: ${f}: Is a directory`);
    const c = node.c || "";
    const l = c ? c.split("\n").length - (c.endsWith("\n") ? 1 : 0) : 0;
    const w = c.trim() ? c.trim().split(/\s+/).length : 0;
    totals.l += l;
    totals.w += w;
    totals.c += c.length;
    rows.push(
      mode === "lines"
        ? `${pad(l, 5)} ${f}`
        : mode === "words"
          ? `${pad(w, 5)} ${f}`
          : mode === "bytes"
            ? `${pad(c.length, 5)} ${f}`
            : `${pad(l, 5)} ${pad(w, 6)} ${pad(c.length, 6)} ${f}`
    );
  }
  if (files.length > 1) rows.push(`${pad(totals.l, 5)} ${pad(totals.w, 6)} ${pad(totals.c, 6)} total`);
  return ok(rows.join("\n"));
};

commands.df = () => {
  const s = stats();
  const used = Math.max(1, Math.ceil(s.bytes / 1024));
  const avail = Math.max(0, QUOTA_KB - used);
  const pct = Math.min(100, Math.round((used / QUOTA_KB) * 100));
  return ok(
    ["Filesystem   Size  Used  Avail  Use%", `haze-vm      ${QUOTA_KB}K  ${used}K  ${avail}K  ${pct}%`].join("\n")
  );
};

commands.du = (args) => {
  const target = args.find((a) => !a.startsWith("-")) ? resolve(args.find((a) => !a.startsWith("-"))) : cwd;
  const node = fsMap[target];
  if (!node) return fail(`du: ${args[0]}: No such file or directory`);
  const sizeOf = (p) => keysUnder(p).reduce((n, k) => n + (fsMap[k].t === "f" ? (fsMap[k].c || "").length : 0), 0);
  if (node.t === "f") return ok(`${fmtBytes((node.c || "").length)}  ${pretty(target)}`);
  const rows = [...childrenOf(target).entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, ino]) => {
      const p = target === "/" ? "/" + name : target + "/" + name;
      return `${fmtBytes(ino.t === "d" ? sizeOf(p) : (ino.c || "").length)}  ${pretty(p)}`;
    });
  rows.push(`${fmtBytes(sizeOf(target))}  ${pretty(target)}`);
  return ok(rows.join("\n"));
};

commands.grep = (args) => {
  let insensitive = false;
  let numbered = false;
  const rest = [];
  for (const a of args) {
    if (a === "-i") insensitive = true;
    else if (a === "-n") numbered = true;
    else if (a.startsWith("-")) return fail(`grep: invalid option -- '${a.slice(1)}'`);
    else rest.push(a);
  }
  if (rest.length < 2) return fail("grep: usage: grep [-i] [-n] pattern file...");
  const pattern = rest[0];
  let re;
  try {
    re = new RegExp(pattern, insensitive ? "i" : "");
  } catch {
    return fail("grep: invalid regular expression");
  }
  const rows = [];
  for (const f of rest.slice(1)) {
    const p = resolve(f);
    const node = fsMap[p];
    if (!node) return fail(`grep: ${f}: No such file or directory`);
    if (node.t === "d") return fail(`grep: ${f}: Is a directory`);
    (node.c || "").split("\n").forEach((line, i) => {
      if (re.test(line)) rows.push((rest.length > 2 ? f + ":" : "") + (numbered ? i + 1 + ":" : "") + line);
    });
  }
  return ok(rows.join("\n"));
};

function headTail(args, fromEnd) {
  let n = 10;
  const files = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-n" && args[i + 1]) n = Math.max(0, parseInt(args[++i], 10) || 0);
    else if (args[i].startsWith("-")) return fail(`unknown option -- '${args[i].slice(1)}'`);
    else files.push(args[i]);
  }
  if (!files.length) return fail("missing file operand");
  const p = resolve(files[0]);
  const node = fsMap[p];
  if (!node) return fail(`${files[0]}: No such file or directory`);
  if (node.t === "d") return fail(`${files[0]}: Is a directory`);
  const lines = (node.c || "").split("\n");
  return ok((fromEnd ? lines.slice(-n) : lines.slice(0, n)).join("\n"));
}
commands.head = (args) => headTail(args, false);
commands.tail = (args) => headTail(args, true);

commands.stat = (args) => {
  if (!args.length) return fail("stat: missing operand");
  const p = resolve(args[0]);
  const node = fsMap[p];
  if (!node) return fail(`stat: cannot stat '${args[0]}': No such file or directory`);
  return ok(
    [
      `  File: ${pretty(p)}`,
      `  Type: ${node.t === "d" ? "directory" : "regular file"}`,
      `  Size: ${node.t === "d" ? 4096 : (node.c || "").length} bytes`,
      `Modified: ${new Date(node.m || Date.now()).toLocaleString()}`,
    ].join("\n")
  );
};

commands.hexdump = (args) => {
  if (!args.length) return fail("hexdump: missing file operand");
  const p = resolve(args[0]);
  const node = fsMap[p];
  if (!node) return fail(`hexdump: ${args[0]}: No such file or directory`);
  if (node.t === "d") return fail(`hexdump: ${args[0]}: Is a directory`);
  const bytes = new TextEncoder().encode(node.c || "");
  const rows = [];
  for (let off = 0; off < bytes.length; off += 16) {
    const slice = bytes.slice(off, off + 16);
    const hex = [...slice].map((b) => b.toString(16).padStart(2, "0")).join(" ").padEnd(47, " ");
    const ascii = [...slice].map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : ".")).join("");
    rows.push(off.toString(16).padStart(8, "0") + "  " + hex + "  |" + ascii + "|");
  }
  return ok(rows.join("\n"));
};

function calcEval(input) {
  const s = String(input).replace(/\s+/g, "");
  if (!s) throw new Error("empty expression");
  if (!/^[0-9+\-*/%^().]+$/.test(s)) throw new Error("only numbers and + - * / % ^ ( )");
  let i = 0;
  const peek = () => s[i];
  function expr() {
    let v = term();
    while (peek() === "+" || peek() === "-") {
      const op = s[i++];
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  function term() {
    let v = power();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = s[i++];
      const r = power();
      v = op === "*" ? v * r : op === "/" ? v / r : v % r;
    }
    return v;
  }
  function power() {
    let v = atom();
    while (peek() === "^") {
      i++;
      v = Math.pow(v, atom());
    }
    return v;
  }
  function atom() {
    if (peek() === "(") {
      i++;
      const v = expr();
      if (peek() !== ")") throw new Error("unbalanced parentheses");
      i++;
      return v;
    }
    if (peek() === "-") {
      i++;
      return -atom();
    }
    if (peek() === "+") {
      i++;
      return atom();
    }
    const start = i;
    while (i < s.length && /[0-9.]/.test(s[i])) i++;
    if (start === i) throw new Error("expected a number");
    const v = Number(s.slice(start, i));
    if (!Number.isFinite(v)) throw new Error("bad number");
    return v;
  }
  const value = expr();
  if (i !== s.length) throw new Error(`unexpected '${s[i]}'`);
  if (!Number.isFinite(value)) throw new Error("result is not finite");
  return value;
}

commands.calc = (args) => {
  if (!args.length) return fail("calc: usage: calc 2 + 2 * 10");
  try {
    return ok(String(calcEval(args.join(" "))));
  } catch (e) {
    return fail("calc: " + (e && e.message ? e.message : "bad expression"));
  }
};

/* --------------------------------------------------------------------------
   app: text editor
   -------------------------------------------------------------------------- */

let editor = null;

function editorBuffer() {
  const numbered = editor.lines.map((l, i) => pad(i + 1, 4) + "  " + l).join("\n");
  shell.term.html('<pre class="hz-term-pre">' + esc(numbered || "(empty buffer)") + "</pre>");
}

function editorHeader() {
  shell.term.write(
    "editing " + pretty(editor.path) + " · " + editor.lines.length + " lines · type to append",
    "hz-term-mut"
  );
  shell.term.write(":w save · :q quit · :q! discard · :wq save+quit · :d N delete line · :p redraw", "hz-term-mut");
}

function editorSave() {
  const text = editor.lines.join("\n");
  const res = writeText(editor.path, text);
  if (res.err) {
    printErr(res.err);
    return false;
  }
  editor.dirty = false;
  shell.term.write(`"${baseName(editor.path)}" ${editor.lines.length}L, ${text.length}B written`, "hz-term-ok");
  return true;
}

function editorQuit() {
  editor = null;
  shell.term.setPrompt(cwdLabel());
  shell.term.write("editor closed", "hz-term-mut");
}

function editorLine(line) {
  if (!editor) return true;
  const trimmed = line.trim();
  if (trimmed.startsWith(":")) {
    const [verb, ...rest] = trimmed.slice(1).split(/\s+/);
    if (verb === "w") editorSave();
    else if (verb === "q") {
      if (editor.dirty) shell.term.write("unsaved changes — use :w, or :q! to discard", "hz-term-err");
      else editorQuit();
    } else if (verb === "q!") editorQuit();
    else if (verb === "wq") {
      if (editorSave()) editorQuit();
    } else if (verb === "d") {
      const n = parseInt(rest[0], 10);
      if (!n || n < 1 || n > editor.lines.length) shell.term.write("no such line", "hz-term-err");
      else {
        editor.lines.splice(n - 1, 1);
        editor.dirty = true;
        shell.term.write("deleted line " + n, "hz-term-mut");
      }
    } else if (verb === "p") editorBuffer();
    else shell.term.write("unknown editor command :" + verb, "hz-term-err");
    return true;
  }
  editor.lines.push(line);
  editor.dirty = true;
  shell.term.write("+" + pad(editor.lines.length, 4) + "  " + line, "hz-term-mut");
  return true;
}

commands.edit = (args) => {
  if (!args.length) return fail("edit: usage: edit <file>");
  const target = args[0];
  const p = resolve(target);
  const node = fsMap[p];
  if (node && node.t === "d") return fail(`edit: ${target}: is a directory`);
  if (!node) {
    const created = writeText(p, "");
    if (created.err) return fail(created.err);
  }
  const raw = fsMap[p] ? fsMap[p].c || "" : "";
  editor = { path: p, lines: raw ? raw.replace(/\n$/, "").split("\n") : [], dirty: false };
  shell.term.setPrompt("edit:" + baseName(p));
  editorHeader();
  editorBuffer();
  return null;
};

/* --------------------------------------------------------------------------
   app: todo
   -------------------------------------------------------------------------- */

const TODO_PATH = HOME + "/.todo";

function readTodo() {
  const node = fsMap[TODO_PATH];
  if (!node) return [];
  return (node.c || "").split("\n").filter((l) => l.trim());
}

function writeTodo(lines) {
  return writeText(TODO_PATH, lines.join("\n") + (lines.length ? "\n" : ""));
}

function todoRender() {
  const lines = readTodo();
  if (!lines.length) {
    shell.term.write("todo — nothing yet. add one: todo add buy milk", "hz-term-mut");
    return;
  }
  const done = lines.filter((l) => /^\[x\]/i.test(l)).length;
  shell.term.write(`todo — ${done}/${lines.length} done`, "hz-term-mut");
  const rows = lines.map((l, i) => {
    const mark = /^\[x\]/i.test(l) ? "[x]" : "[ ]";
    return pad(i + 1, 3) + ". " + mark + " " + l.replace(/^\[[ x]\]\s*/i, "");
  });
  shell.term.html('<pre class="hz-term-pre">' + esc(rows.join("\n")) + "</pre>");
}

commands.todo = (args) => {
  const sub = (args[0] || "").toLowerCase();
  const text = args.slice(1).join(" ");
  if (!sub) {
    todoRender();
    return null;
  }
  const lines = readTodo();
  if (sub === "add" || sub === "a") {
    if (!text) return fail("todo: usage: todo add <text>");
    lines.push("[ ] " + text);
    const res = writeTodo(lines);
    if (res.err) return res;
    shell.term.write("added: " + text, "hz-term-ok");
    return null;
  }
  if (sub === "done" || sub === "d") {
    const n = parseInt(args[1], 10);
    if (!n || n < 1 || n > lines.length) return fail("todo: no such item");
    lines[n - 1] = /^\[x\]/i.test(lines[n - 1]) ? lines[n - 1].replace(/^\[x\]/i, "[ ]") : lines[n - 1].replace(/^\[ \]/i, "[x]");
    const res = writeTodo(lines);
    if (res.err) return res;
    todoRender();
    return null;
  }
  if (sub === "rm" || sub === "remove") {
    const n = parseInt(args[1], 10);
    if (!n || n < 1 || n > lines.length) return fail("todo: no such item");
    const [gone] = lines.splice(n - 1, 1);
    const res = writeTodo(lines);
    if (res.err) return res;
    shell.term.write("removed: " + gone.replace(/^\[[ x]\]\s*/i, ""), "hz-term-mut");
    return null;
  }
  if (sub === "clear") {
    const res = writeTodo([]);
    if (res.err) return res;
    shell.term.write("todo cleared", "hz-term-mut");
    return null;
  }
  return fail("todo: usage: todo [add <text> | done <n> | rm <n> | clear]");
};

/* --------------------------------------------------------------------------
   disk commands
   -------------------------------------------------------------------------- */

commands.vm = () => {
  const s = stats();
  return ok(
    [
      "haze-vm · mounted at ~",
      "store    localStorage:" + STORE_KEY,
      `files    ${s.files} · dirs ${s.dirs} · entries ${s.entries}/${MAX_ENTRIES}`,
      `used     ${fmtBytes(s.bytes)} of ${QUOTA_KB}K`,
      "state    " + (degraded ? "degraded — " + degraded : "writable"),
    ].join("\n")
  );
};

function formatDisk() {
  const snap = JSON.stringify(fsMap);
  fsMap = seed();
  cwd = HOME;
  editor = null;
  const saved = persist();
  if (!saved.ok) {
    fsMap = JSON.parse(snap);
    return fail(saved.err);
  }
  shell.term.setPrompt(cwdLabel());
  shell.term.write("filesystem formatted — seed restored at ~", "hz-term-ok");
  return null;
}

commands.format = () => formatDisk();
commands.reset = () => formatDisk();

/* --------------------------------------------------------------------------
   dispatch: tokenizing, redirection, editor interception
   -------------------------------------------------------------------------- */

function tokenize(line) {
  const out = [];
  let cur = "";
  let quote = null;
  let wasQuoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === "\\" && quote === '"' && i + 1 < line.length) cur += line[++i];
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      wasQuoted = true;
    } else if (ch === "\\") {
      cur += line[++i] ?? "";
    } else if (/\s/.test(ch)) {
      if (cur || wasQuoted) {
        out.push({ v: cur, q: wasQuoted });
        cur = "";
        wasQuoted = false;
      }
    } else cur += ch;
  }
  if (cur || wasQuoted) out.push({ v: cur, q: wasQuoted });
  return out;
}

function handleLine(raw) {
  if (editor) {
    editorLine(raw);
    return true;
  }
  const tokens = tokenize(raw);
  if (!tokens.length) return false;
  const name = tokens[0].v;
  if (!Object.prototype.hasOwnProperty.call(commands, name)) return false;

  const args = [];
  let redirect = null;
  for (let i = 1; i < tokens.length; i++) {
    const tk = tokens[i];
    if (!tk.q && (tk.v === ">" || tk.v === ">>")) {
      const target = tokens[i + 1];
      if (!target) {
        printErr("sh: syntax error near unexpected token 'newline'");
        return true;
      }
      redirect = { mode: tk.v, target: target.v };
      i++;
      continue;
    }
    args.push(tk.v);
  }

  const res = commands[name](args);
  if (res === null) return true;
  if (res && res.err) {
    printErr(res.err);
    return true;
  }

  if (redirect) {
    const path = resolve(redirect.target);
    const existing = fsMap[path];
    if (existing && existing.t === "d") {
      printErr("sh: " + redirect.target + ": is a directory");
      return true;
    }
    let addition = String(res.out ?? "");
    if (!addition.endsWith("\n")) addition += "\n";
    let text = addition;
    if (redirect.mode === ">>" && existing) {
      const prev = existing.c || "";
      text = prev + (prev && !prev.endsWith("\n") ? "\n" : "") + addition;
    }
    const written = writeText(path, text);
    if (written.err) printErr(written.err);
    return true;
  }

  print(res.out ?? "");
  return true;
}

/* --------------------------------------------------------------------------
   wire into the shell
   -------------------------------------------------------------------------- */

loadFs();

shell.registerCommands([
  ["pwd", "print the working directory"],
  ["cd [dir]", "walk the tree (~ · .. · absolute · relative)"],
  ["ls [-la] [dir]", "list files, dotfiles with -a"],
  ["cat <file…>", "print files"],
  ["mkdir [-p] <dir>", "make directories"],
  ["touch <file>", "create or update a file"],
  ["rm [-rf] <path>", "remove files and trees"],
  ["mv <src> <dst>", "move or rename"],
  ["cp [-r] <src> <dst>", "copy files and trees"],
  ["tree [dir]", "draw the tree"],
  ["find [dir] [-name g]", "find paths by name"],
  ["wc [-lwc] <file>", "lines, words, bytes"],
  ["grep [-in] <re> <file>", "search file contents"],
  ["head / tail [-n] f", "first or last lines"],
  ["stat <file>", "file details"],
  ["hexdump <file>", "bytes + ascii view"],
  ["calc <expr>", "arithmetic, no eval"],
  ["df / du [dir]", "disk and directory usage"],
  ["edit <file>", "text editor ( :w · :q · :wq )"],
  ["todo [add|done|rm]", "persistent todo app"],
  ["vm", "filesystem status"],
  ["format / reset", "wipe ~ and restore the seed"],
]);

shell.onLine(handleLine);
shell.term.setPrompt(cwdLabel());

if (mountNote) shell.term.write(mountNote, "hz-term-mut");

/* --------------------------------------------------------------------------
   palette-facing api
   -------------------------------------------------------------------------- */

function runInTerminal(cmd) {
  const view = document.querySelector('[data-view-section="terminal"]');
  if (!view || !view.classList.contains("active")) shell.terminal();
  setTimeout(() => {
    shell.term.focus();
    shell.term.run(cmd);
  }, 150);
}

window.hazeOS.vm = {
  editor: (path = "notes.txt") => runInTerminal("edit " + path),
  todo: () => runInTerminal("todo"),
  df: () => runInTerminal("df"),
  info: () => runInTerminal("vm"),
  format: () => runInTerminal("format"),
  run: (cmd) => runInTerminal(cmd),
};
