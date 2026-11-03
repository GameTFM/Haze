/* ==========================================================================
   haze arcade — two offline canvas games on the monochrome stage
   Snake + Breakout. Theme colours only. No network, no VM writes.
   ========================================================================== */

const shell = window.hazeOS;
const el = (id) => document.getElementById(id);

const overlay = el("hz-arcade");
const stage = el("hz-arcade-stage");
const canvas = el("hz-arcade-canvas");
const ctx = canvas?.getContext("2d");
const menu = el("hz-arcade-menu");
const menuGrid = el("hz-arcade-menu-grid");
const message = el("hz-arcade-msg");
const msgTitle = el("hz-arcade-msg-title");
const msgHint = el("hz-arcade-msg-hint");
const nameEl = el("hz-arcade-name");
const subEl = el("hz-arcade-sub");
const scoreEl = el("hz-arcade-score");
const bestEl = el("hz-arcade-best");
const stateEl = el("hz-arcade-state");
const helpEl = el("hz-arcade-help");
const touchPad = el("hz-touch");
const fireBtn = el("hz-touch-fire");

const BEST_KEY = "haze-arcade-best-v1";
const GAMES = {
  snake: { title: "snake", sub: "eat · grow · do not fold", help: "arrows / wasd · space pause · r restart · esc exit" },
  breakout: { title: "breakout", sub: "clear the wall", help: "move paddle: mouse / touch / ← → · space pause · r restart · esc exit" },
};

let theme = readTheme();
let active = null;
let rafId = 0;
let viewW = 0;
let viewH = 0;
let lastFrame = 0;
let loopRunning = false;
let returnView = "home";
let best = {};
let storageOk = true;

try {
  const raw = localStorage.getItem(BEST_KEY);
  best = raw ? JSON.parse(raw) || {} : {};
} catch {
  best = {};
  storageOk = false;
}

function readTheme() {
  const cs = getComputedStyle(document.documentElement);
  const get = (name, fallback) => (cs.getPropertyValue(name) || "").trim() || fallback;
  return {
    bg: get("--bg", "#050505"),
    panel: get("--bg-elev", "#0d0d0d"),
    text: get("--text", "#f5f5f5"),
    accent: get("--accent", "#ffffff"),
    muted: get("--muted", "#9a9a9a"),
    border: get("--border", "#232323"),
  };
}

function saveBest(name, score) {
  if (!Number.isFinite(score) || score <= (best[name] || 0)) return;
  best[name] = score;
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    storageOk = false;
  }
}

function setStatus(text, live) {
  if (!stateEl) return;
  stateEl.textContent = text;
  stateEl.classList.toggle("on", Boolean(live));
}

function paintScore() {
  if (!active) return;
  const name = active.name;
  scoreEl.textContent = String(active.state().score || 0);
  bestEl.textContent = String(best[name] || 0);
}

function showMessage(title, hint) {
  if (!message) return;
  msgTitle.textContent = title;
  msgHint.textContent = hint;
  message.hidden = false;
}
function hideMessage() {
  if (message) message.hidden = true;
}

function hideMenu() {
  if (menu) menu.hidden = true;
  stage?.classList.remove("no-game");
}
function showMenu() {
  if (menu) menu.hidden = false;
  stage?.classList.add("no-game");
}

/* --------------------------------------------------------------------------
   canvas sizing + shared loop
   -------------------------------------------------------------------------- */

function fitCanvas() {
  if (!canvas || !stage) return;
  const rect = stage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  viewW = rect.width;
  viewH = rect.height;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  active?.resize?.(rect.width, rect.height);
  active?.render?.(ctx, rect.width, rect.height, theme);
}

if (typeof ResizeObserver !== "undefined" && stage) {
  new ResizeObserver(() => fitCanvas()).observe(stage);
}

function frame(now) {
  if (!loopRunning) return;
  rafId = requestAnimationFrame(frame);
  const dt = Math.min(50, now - lastFrame || 16);
  lastFrame = now;
  if (!active) return;
  const s = active.state();
  if (!s.paused && !s.over) active.update(dt);
  active.render(ctx, viewW, viewH, theme);
}

function startLoop() {
  if (loopRunning) return;
  loopRunning = true;
  lastFrame = 0;
  rafId = requestAnimationFrame(frame);
}
function stopLoop() {
  loopRunning = false;
  cancelAnimationFrame(rafId);
  rafId = 0;
}

/* --------------------------------------------------------------------------
   snake
   -------------------------------------------------------------------------- */

function makeSnake() {
  const COLS = 26;
  const ROWS = 18;
  const name = "snake";
  let snake = [];
  let dir = { x: 1, y: 0 };
  let queue = [];
  let food = { x: 9, y: 9 };
  let score = 0;
  let tick = 0;
  let stepMs = 130;
  let paused = false;
  let over = false;

  function spawn() {
    const free = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
      }
    }
    food = free[Math.floor(Math.random() * free.length)] || { x: 0, y: 0 };
  }

  function reset() {
    snake = [
      { x: 6, y: 9 },
      { x: 5, y: 9 },
      { x: 4, y: 9 },
    ];
    dir = { x: 1, y: 0 };
    queue = [];
    score = 0;
    tick = 0;
    stepMs = 130;
    paused = false;
    over = false;
    food = { x: 9, y: 9 };
    hideMessage();
    setStatus("playing", true);
    paintScore();
  }

  function die() {
    over = true;
    paused = false;
    setStatus("over", false);
    showMessage("game over", "score " + score + " · space to restart");
    paintScore();
  }

  function turn(nx, ny) {
    if (over) {
      reset();
      return;
    }
    const last = queue.length ? queue[queue.length - 1] : dir;
    if ((last.x === -nx && last.y === -ny) || (last.x === nx && last.y === ny)) return;
    if (queue.length < 2) queue.push({ x: nx, y: ny });
  }

  function update(dt) {
    if (paused || over) return;
    tick += dt;
    while (tick >= stepMs) {
      tick -= stepMs;
      if (queue.length) dir = queue.shift();
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      const hitSelf = snake.some((s, i) => i < snake.length - 1 && s.x === head.x && s.y === head.y);
      if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS || hitSelf) {
        die();
        return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score++;
        if (score % 4 === 0) stepMs = Math.max(72, stepMs - 8);
        saveBest(name, score);
        spawn();
        paintScore();
      } else {
        snake.pop();
      }
    }
  }

  function render(c, w, h, th) {
    if (!w || !h) return;
    c.fillStyle = th.bg;
    c.fillRect(0, 0, w, h);
    const cell = Math.min(w / COLS, h / ROWS);
    const ox = (w - cell * COLS) / 2;
    const oy = (h - cell * ROWS) / 2;

    c.fillStyle = th.border;
    c.globalAlpha = 0.5;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        c.fillRect(ox + x * cell + cell / 2 - 0.5, oy + y * cell + cell / 2 - 0.5, 1, 1);
      }
    }
    c.globalAlpha = 1;

    if (food) {
      const fx = ox + food.x * cell + cell / 2;
      const fy = oy + food.y * cell + cell / 2;
      const pulse = 0.75 + Math.sin(performance.now() / 260) * 0.18;
      c.strokeStyle = th.accent;
      c.lineWidth = 1.6;
      c.beginPath();
      c.arc(fx, fy, cell * 0.3 * pulse, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = th.accent;
      c.beginPath();
      c.arc(fx, fy, cell * 0.11, 0, Math.PI * 2);
      c.fill();
    }

    const node = (s, isHead, idx) => {
      const pad = cell * 0.13;
      const x = ox + s.x * cell + pad;
      const y = oy + s.y * cell + pad;
      const size = cell - pad * 2;
      c.globalAlpha = isHead ? 1 : Math.max(0.28, 0.82 - idx * 0.035);
      c.fillStyle = isHead ? th.accent : th.text;
      const r = Math.min(6, size * 0.3);
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + size, y, x + size, y + size, r);
      c.arcTo(x + size, y + size, x, y + size, r);
      c.arcTo(x, y + size, x, y, r);
      c.arcTo(x, y, x + size, y, r);
      c.fill();
    };

    for (let i = snake.length - 1; i >= 0; i--) node(snake[i], i === 0, i);
    c.globalAlpha = 1;
  }

  function pointer(x, y, phase) {
    if (phase !== "down") return;
    swipe = { x, y };
  }
  let swipe = null;
  function pointerUp(x, y) {
    if (!swipe) return;
    const dx = x - swipe.x;
    const dy = y - swipe.y;
    swipe = null;
    if (Math.abs(dx) < 14 && Math.abs(dy) < 14) return;
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0);
    else turn(0, dy > 0 ? 1 : -1);
  }

  function key(k) {
    if (k === "arrowup" || k === "w") turn(0, -1);
    else if (k === "arrowdown" || k === "s") turn(0, 1);
    else if (k === "arrowleft" || k === "a") turn(-1, 0);
    else if (k === "arrowright" || k === "d") turn(1, 0);
    else if (k === " " || k === "enter") {
      if (over) reset();
    }
  }

  return {
    name,
    reset,
    update,
    render,
    pointer,
    pointerUp,
    key,
    state() {
      return {
        game: name,
        score,
        paused,
        over,
        head: snake[0] ? { ...snake[0] } : null,
        food: { ...food },
        dir: { ...dir },
        length: snake.length,
        stepMs,
      };
    },
    setPaused(value) {
      paused = value;
    },
    resize() {},
    destroy() {},
  };
}

/* --------------------------------------------------------------------------
   breakout
   -------------------------------------------------------------------------- */

function makeBreakout() {
  const name = "breakout";
  const VW = 800;
  const VH = 560;
  const COLS = 8;
  const ROWS = 4;
  const BRICK_TOP = 74;
  const BRICK_H = 22;
  const PADDLE_W = 128;
  const PADDLE_H = 12;
  const BALL_R = 7;

  let bricks = [];
  let paddleX = VW / 2 - PADDLE_W / 2;
  let targetX = paddleX;
  let ball = { x: VW / 2, y: VH - 90, vx: 210, vy: -250 };
  let score = 0;
  let lives = 3;
  let paused = false;
  let over = false;
  let won = false;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function buildWall() {
    bricks = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        bricks.push({
          x: 40 + c * ((VW - 80) / COLS),
          y: BRICK_TOP + r * (BRICK_H + 9),
          w: (VW - 80) / COLS - 9,
          h: BRICK_H,
          alive: true,
          row: r,
        });
      }
    }
  }

  function reset() {
    buildWall();
    paddleX = VW / 2 - PADDLE_W / 2;
    targetX = paddleX;
    ball = { x: VW / 2, y: VH - 96, vx: 210, vy: -250 };
    score = 0;
    lives = 3;
    paused = false;
    over = false;
    won = false;
    hideMessage();
    setStatus("playing", true);
    paintScore();
  }

  function end(win) {
    over = true;
    won = win;
    paused = false;
    setStatus(win ? "cleared" : "over", false);
    showMessage(win ? "wall cleared" : "game over", win ? "score " + score : "score " + score + " · space to restart");
    paintScore();
  }

  function update(dt) {
    if (paused || over) return;
    const s = dt / 1000;

    paddleX += (targetX - paddleX) * Math.min(1, 12 * s);
    paddleX = Math.max(0, Math.min(VW - PADDLE_W, paddleX));

    ball.x += ball.vx * s;
    ball.y += ball.vy * s;

    if (ball.x < BALL_R) {
      ball.x = BALL_R;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x > VW - BALL_R) {
      ball.x = VW - BALL_R;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y < BALL_R) {
      ball.y = BALL_R;
      ball.vy = Math.abs(ball.vy);
    }

    for (const b of bricks) {
      if (!b.alive) continue;
      if (ball.x + BALL_R > b.x && ball.x - BALL_R < b.x + b.w && ball.y + BALL_R > b.y && ball.y - BALL_R < b.y + b.h) {
        b.alive = false;
        score += 10;
        saveBest(name, score);
        paintScore();
        const overlapX = Math.min(ball.x + BALL_R - b.x, b.x + b.w - (ball.x - BALL_R));
        const overlapY = Math.min(ball.y + BALL_R - b.y, b.y + b.h - (ball.y - BALL_R));
        if (overlapY < overlapX) ball.vy = -ball.vy;
        else ball.vx = -ball.vx;
        if (bricks.every((br) => !br.alive)) end(true);
        break;
      }
    }

    const py = VH - 46;
    if (ball.y + BALL_R >= py && ball.y - BALL_R <= py + PADDLE_H) {
      if (ball.x >= paddleX - BALL_R && ball.x <= paddleX + PADDLE_W + BALL_R) {
        ball.y = py - BALL_R;
        ball.vy = -Math.abs(ball.vy) * 1.015;
        const hit = (ball.x - (paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);
        ball.vx = Math.max(-360, Math.min(360, hit * 260));
      }
    }

    if (ball.y > VH + BALL_R * 3) {
      lives--;
      if (lives <= 0) {
        end(false);
      } else {
        ball = { x: VW / 2, y: VH - 96, vx: 210, vy: -250 };
        targetX = VW / 2 - PADDLE_W / 2;
        setStatus("life " + lives, true);
      }
    }
  }

  function render(c, w, h, th) {
    if (!w || !h) return;
    c.fillStyle = th.bg;
    c.fillRect(0, 0, w, h);
    scale = Math.min(w / VW, h / VH);
    offsetX = (w - VW * scale) / 2;
    offsetY = (h - VH * scale) / 2;

    c.save();
    c.translate(offsetX, offsetY);
    c.scale(scale, scale);

    for (const b of bricks) {
      if (!b.alive) continue;
      c.globalAlpha = 0.1 + (ROWS - b.row) * 0.07;
      c.fillStyle = th.text;
      c.fillRect(b.x, b.y, b.w, b.h);
      c.globalAlpha = 0.5;
      c.strokeStyle = th.border;
      c.lineWidth = 1;
      c.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    }

    c.globalAlpha = 1;
    c.fillStyle = th.accent;
    c.fillRect(paddleX, VH - 46, PADDLE_W, PADDLE_H);

    c.beginPath();
    c.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    c.fill();

    c.globalAlpha = 0.55;
    c.fillStyle = th.text;
    c.font = "13px ui-monospace, monospace";
    c.fillText("LIVES " + lives, 40, 30);
    c.textAlign = "right";
    c.fillText("SCORE " + score, VW - 40, 30);
    c.textAlign = "left";
    c.globalAlpha = 1;

    c.restore();
  }

  function pointer(x, y, phase) {
    const logicalX = (x - offsetX) / (scale || 1);
    if (phase === "down" || phase === "move") targetX = logicalX - PADDLE_W / 2;
  }
  function pointerUp() {}

  function key(k) {
    if (k === "arrowleft" || k === "a") targetX -= 46;
    else if (k === "arrowright" || k === "d") targetX += 46;
    else if (k === " " || k === "enter") {
      if (over) reset();
    }
    targetX = Math.max(0, Math.min(VW - PADDLE_W, targetX));
  }

  return {
    name,
    reset,
    update,
    render,
    pointer,
    pointerUp,
    key,
    state() {
      return {
        game: name,
        score,
        paused,
        over,
        won,
        lives,
        ball: { x: Math.round(ball.x), y: Math.round(ball.y) },
        paddle: Math.round(paddleX),
        bricks: bricks.filter((b) => b.alive).length,
      };
    },
    setPaused(value) {
      paused = value;
    },
    resize() {},
    destroy() {},
  };
}

/* --------------------------------------------------------------------------
   overlay plumbing
   -------------------------------------------------------------------------- */

function currentView() {
  return document.querySelector(".view.active")?.dataset.viewSection || "home";
}

function goTo(view) {
  document.querySelector('.nav-item[data-view="' + view + '"]')?.click();
}

function pauseGame() {
  if (!active) return;
  const s = active.state();
  if (s.over || s.paused) return;
  active.setPaused?.(true);
  setStatus("paused", false);
  stopLoop();
}

function resumeGame() {
  if (!active) return;
  const s = active.state();
  if (s.over) return;
  active.setPaused?.(false);
  setStatus("playing", true);
  startLoop();
}

function togglePause() {
  if (!active) return;
  const s = active.state();
  if (s.over) return;
  if (s.paused) resumeGame();
  else pauseGame();
}

function buildMenu() {
  if (!menuGrid) return;
  menuGrid.innerHTML = "";
  for (const [id, meta] of Object.entries(GAMES)) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "hz-arcade-card";
    card.innerHTML =
      "<b>" + meta.title + "</b><span>" + meta.sub + "</span><em>best " + (best[id] || 0) + "</em>";
    card.addEventListener("click", () => play(id));
    menuGrid.appendChild(card);
  }
}

function open() {
  if (!overlay) return;
  returnView = currentView();
  active?.destroy?.();
  active = null;
  stopLoop();
  overlay.hidden = false;
  document.body.classList.add("hz-arcade-open");
  hideMessage();
  nameEl.textContent = "cabinet";
  subEl.textContent = "choose a game";
  scoreEl.textContent = "0";
  bestEl.textContent = String(Math.max(best.snake || 0, best.breakout || 0));
  setStatus("ready", false);
  buildMenu();
  showMenu();
  fitCanvas();
}

function play(id) {
  if (!GAMES[id] || !overlay) return;
  returnView = currentView();
  overlay.hidden = false;
  document.body.classList.add("hz-arcade-open");
  hideMenu();
  hideMessage();

  active?.destroy?.();
  stopLoop();
  active = id === "snake" ? makeSnake() : makeBreakout();
  active.reset();
  nameEl.textContent = GAMES[id].title;
  subEl.textContent = GAMES[id].sub;
  helpEl.textContent = GAMES[id].help;
  bestEl.textContent = String(best[id] || 0);
  scoreEl.textContent = "0";
  setStatus("playing", true);
  fireBtn.textContent = id === "snake" ? "turn" : "launch";
  fitCanvas();
  startLoop();
}

function close() {
  if (!overlay || overlay.hidden) return;
  stopLoop();
  active?.destroy?.();
  active = null;
  overlay.hidden = true;
  document.body.classList.remove("hz-arcade-open");
  hideMessage();
  if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  goTo(returnView);
}

function restart() {
  if (!active) return;
  active.reset();
  hideMessage();
  setStatus("playing", true);
  if (!loopRunning) startLoop();
}

/* --------------------------------------------------------------------------
   events (bound once — no per-launch duplication)
   -------------------------------------------------------------------------- */

function overlayOpen() {
  return overlay && !overlay.hidden;
}

window.addEventListener(
  "keydown",
  (e) => {
    if (!overlayOpen()) return;
    if (!el("palette-overlay")?.hidden || !el("hz-sheet")?.hidden) return;
    if ((e.ctrlKey || e.metaKey) && e.key === "`") {
      close();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = (e.key || "").toLowerCase();
    if (e.repeat && (k === "p" || k === "r" || k === " " || k === "escape")) return;
    const gameKeys = [
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
      " ",
      "enter",
      "escape",
      "r",
      "p",
      "w",
      "a",
      "s",
      "d",
      "g",
      "c",
      "m",
      "/",
    ];
    if (gameKeys.includes(k)) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (k === " ") {
      if (active && active.state().over) restart();
      else togglePause();
      return;
    }
    if (k === "escape") {
      close();
      return;
    }
    if (k === "r") {
      restart();
      return;
    }
    if (k === "p") {
      togglePause();
      return;
    }
    active?.key?.(k);
  },
  true
);

let swipeStart = null;
canvas?.addEventListener("pointermove", (e) => {
  if (!active || !overlayOpen()) return;
  const rect = canvas.getBoundingClientRect();
  active.pointer?.(e.clientX - rect.left, e.clientY - rect.top, "move");
});
canvas?.addEventListener("pointerdown", (e) => {
  if (!active || !overlayOpen()) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  swipeStart = { x, y };
  active.pointer?.(x, y, "down");
  if (active.name === "breakout" && active.state().over) restart();
});
canvas?.addEventListener("pointerup", (e) => {
  if (!active || !overlayOpen()) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (swipeStart) active.pointerUp?.(x, y);
  swipeStart = null;
});
canvas?.addEventListener("pointerleave", () => {
  swipeStart = null;
});

touchPad?.addEventListener("pointerdown", (e) => {
  const button = e.target.closest("button[data-dir]");
  if (!button || !active) return;
  e.preventDefault();
  const dir = button.dataset.dir;
  const map = { up: "arrowup", down: "arrowdown", left: "arrowleft", right: "arrowright" };
  active.key?.(map[dir]);
});

fireBtn?.addEventListener("click", () => {
  if (!active) return;
  const s = active.state();
  if (s.over) restart();
  else togglePause();
});

el("hz-arcade-pause")?.addEventListener("click", togglePause);
el("hz-arcade-restart")?.addEventListener("click", restart);
el("hz-arcade-exit")?.addEventListener("click", close);

document.addEventListener("visibilitychange", () => {
  if (document.hidden && active && !active.state().paused && !active.state().over) pauseGame();
});

for (const id of ["palette-overlay", "hz-sheet"]) {
  const node = el(id);
  if (!node) continue;
  new MutationObserver(() => {
    if (!node.hidden && active && !active.state().paused && !active.state().over) pauseGame();
  }).observe(node, { attributes: true, attributeFilter: ["hidden"] });
}

new MutationObserver(() => {
  theme = readTheme();
}).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

/* --------------------------------------------------------------------------
   terminal + palette integration
   -------------------------------------------------------------------------- */

shell.registerCommands([
  ["arcade", "open the games cabinet"],
  ["snake", "play snake"],
  ["breakout", "play breakout"],
]);

shell.onLine((line) => {
  const cmd = line.trim().split(/\s+/)[0];
  if (cmd === "snake" || cmd === "breakout") {
    play(cmd);
    return true;
  }
  if (cmd === "arcade") {
    open();
    return true;
  }
  return false;
});

window.hazeArcade = {
  play,
  open,
  close,
  best: (name) => best[name] || 0,
  storageOk: () => storageOk,
  state: () => {
    if (!active) return { game: null, running: false, raf: loopRunning, view: returnView, storageOk };
    return { ...active.state(), running: true, raf: loopRunning, listeners: 0, view: returnView, storageOk };
  },
};
