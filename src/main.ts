// SKYSTRIKE — 60-Second Aim Arena
// A booth-ready event mini game: mouse-only aim trainer with combos,
// golden bonus orbs, bombs to avoid, and a fully local leaderboard.

import { loadScores, qualifies, saveScore, type ScoreEntry } from "./storage";
import { sfx, setMuted, isMuted } from "./audio";

const W = 960;
const H = 600;
const ROUND_SECONDS = (() => {
  const t = Number(new URLSearchParams(location.search).get("t"));
  return Number.isFinite(t) && t >= 5 && t <= 600 ? t : 60;
})();

type TargetKind = "orb" | "gold" | "bomb";
interface Target {
  x: number; y: number; r: number;
  kind: TargetKind;
  bornAt: number; lifeMs: number;
  vx: number; vy: number;
}
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }
interface FloatText { x: number; y: number; text: string; life: number; color: string }
interface Cloud { x: number; y: number; s: number; speed: number }

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const $ = (id: string) => document.getElementById(id)!;
const hud = $("hud"), hudTime = $("hud-time"), hudScore = $("hud-score"),
  hudCombo = $("hud-combo"), hudAcc = $("hud-acc");
const attractEl = $("attract"), scoreEl = $("score");

let state: "attract" | "playing" | "score" = "attract";
let targets: Target[] = [];
let particles: Particle[] = [];
let floats: FloatText[] = [];
const clouds: Cloud[] = Array.from({ length: 7 }, () => ({
  x: Math.random() * W, y: 30 + Math.random() * (H - 120),
  s: 0.5 + Math.random() * 1.1, speed: 4 + Math.random() * 9,
}));

let score = 0, combo = 0, bestCombo = 0, hits = 0, shots = 0;
let reactionSum = 0, reactionCount = 0;
let roundEndsAt = 0, lastSpawnAt = 0, raf = 0, lastFrameAt = 0;
let resetTimer: number | undefined, resetCountTimer: number | undefined;

// Difficulty ramps across the round: spawns get faster, targets live
// shorter and drift more as the clock runs down.
function difficulty(now: number): { spawnMs: number; lifeMs: number; drift: number } {
  const elapsed = 1 - Math.max(0, (roundEndsAt - now) / (ROUND_SECONDS * 1000)); // 0 → 1
  return {
    spawnMs: 880 - 430 * elapsed,
    lifeMs: 1450 - 620 * elapsed,
    drift: 14 + 42 * elapsed,
  };
}

function spawnTarget(now: number): void {
  const d = difficulty(now);
  const roll = Math.random();
  const kind: TargetKind = roll < 0.07 ? "gold" : roll < 0.19 ? "bomb" : "orb";
  const r = kind === "gold" ? 20 + Math.random() * 6 : 22 + Math.random() * 20;
  const drift = d.drift * (kind === "gold" ? 1.7 : 1);
  targets.push({
    x: r + Math.random() * (W - 2 * r),
    y: r + Math.random() * (H - 2 * r),
    r, kind,
    bornAt: now,
    lifeMs: d.lifeMs * (kind === "gold" ? 0.72 : 1),
    vx: (Math.random() - 0.5) * drift,
    vy: (Math.random() - 0.5) * drift,
  });
}

function burst(x: number, y: number, color: string, n = 12): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 150;
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.55, color, size: 2 + Math.random() * 3 });
  }
}

function addFloat(x: number, y: number, text: string, color: string): void {
  floats.push({ x, y, text, life: 0.9, color });
}

function pointsFor(t: Target, reactionMs: number): number {
  const sizeBonus = Math.round(120 * (26 / t.r)); // smaller target → more points
  const speedBonus = reactionMs < 350 ? 40 : reactionMs < 600 ? 20 : 0;
  return 60 + sizeBonus + speedBonus;
}

function handleClick(mx: number, my: number, now: number): void {
  if (state !== "playing") return;
  shots++;
  // Topmost (latest spawned) target wins the click.
  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i];
    const dx = mx - t.x, dy = my - t.y;
    if (dx * dx + dy * dy <= t.r * t.r) {
      targets.splice(i, 1);
      const reaction = now - t.bornAt;
      if (t.kind === "bomb") {
        score = Math.max(0, score - 150);
        combo = 0;
        burst(t.x, t.y, "#ff5470", 18);
        addFloat(t.x, t.y, "-150 BOMB!", "#ff5470");
        sfx.bomb();
      } else {
        combo++;
        bestCombo = Math.max(bestCombo, combo);
        hits++;
        reactionSum += reaction; reactionCount++;
        const mult = Math.min(5, 1 + Math.floor(combo / 5));
        const pts = pointsFor(t, reaction) * mult * (t.kind === "gold" ? 3 : 1);
        score += pts;
        burst(t.x, t.y, t.kind === "gold" ? "#ffc93c" : "#57d7ff", t.kind === "gold" ? 20 : 12);
        addFloat(t.x, t.y, `+${pts}`, t.kind === "gold" ? "#ffc93c" : "#aee9ff");
        if (t.kind === "gold") sfx.gold(); else sfx.pop();
      }
      updateHud();
      return;
    }
  }
  combo = 0; // a clean miss breaks the combo
  sfx.miss();
  updateHud();
}

function updateHud(): void {
  hudScore.textContent = String(score);
  const mult = Math.min(5, 1 + Math.floor(combo / 5));
  hudCombo.textContent = `×${mult}${combo >= 3 ? ` (${combo})` : ""}`;
  hudCombo.classList.toggle("hot", mult >= 3);
  hudAcc.textContent = shots ? `${Math.round((hits / shots) * 100)}%` : "—";
}

function drawTarget(t: Target, now: number): void {
  const age = (now - t.bornAt) / t.lifeMs; // 0 → 1
  const remain = 1 - age;
  const pulse = 1 + Math.sin(now / 130) * 0.04;
  ctx.save();
  ctx.translate(t.x, t.y);
  // shrinking lifetime ring
  ctx.beginPath();
  ctx.arc(0, 0, t.r + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remain);
  ctx.strokeStyle = t.kind === "bomb" ? "rgba(255,84,112,.75)" : t.kind === "gold" ? "rgba(255,201,60,.9)" : "rgba(87,215,255,.65)";
  ctx.lineWidth = 3;
  ctx.stroke();
  const body = ctx.createRadialGradient(-t.r * 0.3, -t.r * 0.3, t.r * 0.15, 0, 0, t.r * pulse);
  if (t.kind === "bomb") {
    body.addColorStop(0, "#5a2432"); body.addColorStop(1, "#2a0f18");
  } else if (t.kind === "gold") {
    body.addColorStop(0, "#fff3c4"); body.addColorStop(1, "#f5a623");
  } else {
    body.addColorStop(0, "#d8f6ff"); body.addColorStop(1, "#00a9e0");
  }
  ctx.beginPath();
  ctx.arc(0, 0, t.r * pulse, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.shadowColor = t.kind === "bomb" ? "#ff5470" : t.kind === "gold" ? "#ffc93c" : "#00a9e0";
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = t.kind === "bomb" ? "#ff8fa3" : "rgba(255,255,255,.92)";
  ctx.font = `700 ${Math.round(t.r * 0.9)}px "Segoe UI", sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(t.kind === "bomb" ? "✸" : t.kind === "gold" ? "★" : "◎", 0, 1);
  ctx.restore();
}

function drawCloud(c: Cloud): void {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(c.s, c.s);
  ctx.fillStyle = "rgba(160, 210, 240, 0.10)";
  for (const [x, y, r] of [[0, 0, 34], [30, 6, 26], [-32, 8, 24], [4, 12, 30]] as const) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function frame(now: number): void {
  const dt = Math.min(0.05, (now - lastFrameAt) / 1000 || 0);
  lastFrameAt = now;
  ctx.clearRect(0, 0, W, H);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#0d2c4c"); sky.addColorStop(1, "#06182e");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  for (const c of clouds) {
    c.x += c.speed * dt;
    if (c.x - 70 * c.s > W) { c.x = -80; c.y = 30 + Math.random() * (H - 120); }
    drawCloud(c);
  }
  if (state === "playing") {
    const d = difficulty(now);
    if (now - lastSpawnAt >= d.spawnMs && targets.length < 6) {
      spawnTarget(now); lastSpawnAt = now;
    }
    targets = targets.filter((t) => now - t.bornAt < t.lifeMs);
    for (const t of targets) {
      t.x += t.vx * dt; t.y += t.vy * dt;
      if (t.x < t.r || t.x > W - t.r) t.vx *= -1;
      if (t.y < t.r || t.y > H - t.r) t.vy *= -1;
      drawTarget(t, now);
    }
    const remainMs = roundEndsAt - now;
    hudTime.textContent = (Math.max(0, remainMs) / 1000).toFixed(1);
    if (remainMs <= 0) { endRound(); }
  }
  particles = particles.filter((p) => (p.life -= dt) > 0);
  for (const p of particles) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    ctx.globalAlpha = Math.max(0, p.life / 0.55);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  floats = floats.filter((f) => (f.life -= dt) > 0);
  for (const f of floats) {
    f.y -= 42 * dt;
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life / 0.5));
    ctx.fillStyle = f.color;
    ctx.font = "800 21px \"Segoe UI\", sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  raf = requestAnimationFrame(frame);
}

function startRound(): void {
  score = 0; combo = 0; bestCombo = 0; hits = 0; shots = 0;
  reactionSum = 0; reactionCount = 0;
  targets = []; particles = []; floats = [];
  state = "playing";
  const now = performance.now();
  roundEndsAt = now + ROUND_SECONDS * 1000;
  lastSpawnAt = 0;
  attractEl.classList.add("hidden");
  scoreEl.classList.add("hidden");
  hud.classList.remove("hidden");
  clearTimeout(resetTimer); clearInterval(resetCountTimer);
  updateHud();
  hudTime.textContent = ROUND_SECONDS.toFixed(1);
  sfx.start();
}

function gradeFor(s: number, acc: number): string {
  if (s >= 5200 && acc >= 0.75) return "SKY CHAMPION";
  if (s >= 4200) return "ACE PILOT";
  if (s >= 3200) return "SHARPSHOOTER";
  if (s >= 2200) return "CADET";
  if (s >= 1200) return "ROOKIE";
  return "TRAINEE";
}

function renderBoard(el: HTMLElement, scores: ScoreEntry[]): void {
  el.innerHTML = "";
  if (!scores.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No scores yet — be the first pilot on the board!";
    el.appendChild(li);
    return;
  }
  for (const e of scores) {
    const li = document.createElement("li");
    li.textContent = `${e.name} · ${Math.round(e.accuracy * 100)}% acc`;
    const b = document.createElement("b");
    b.textContent = e.score.toLocaleString("en-US");
    li.appendChild(b);
    el.appendChild(li);
  }
}

function endRound(): void {
  state = "score";
  targets = [];
  sfx.end();
  const acc = shots ? hits / shots : 0;
  $("grade").textContent = gradeFor(score, acc);
  $("final-score").textContent = score.toLocaleString("en-US");
  $("stat-acc").textContent = `${Math.round(acc * 100)}%`;
  $("stat-reaction").textContent = reactionCount ? `${Math.round(reactionSum / reactionCount)} ms` : "—";
  $("stat-combo").textContent = `×${Math.min(5, 1 + Math.floor(bestCombo / 5))} (${bestCombo})`;
  $("stat-hits").textContent = String(hits);
  const saveRow = $("save-row");
  if (qualifies(score)) {
    saveRow.classList.remove("hidden");
    ($("initials") as HTMLInputElement).focus();
  } else {
    saveRow.classList.add("hidden");
  }
  renderBoard($("score-board"), loadScores());
  hud.classList.add("hidden");
  scoreEl.classList.remove("hidden");
  // Booth behavior: drift back to the attract screen so the next fan in
  // line gets a clean start without staff touching the machine.
  let count = 15;
  $("reset-count").textContent = String(count);
  clearInterval(resetCountTimer);
  resetCountTimer = window.setInterval(() => {
    count--;
    $("reset-count").textContent = String(Math.max(0, count));
  }, 1000);
  clearTimeout(resetTimer);
  resetTimer = window.setTimeout(showAttract, 15000);
}

function showAttract(): void {
  state = "attract";
  clearTimeout(resetTimer); clearInterval(resetCountTimer);
  renderBoard($("attract-board"), loadScores());
  scoreEl.classList.add("hidden");
  hud.classList.add("hidden");
  attractEl.classList.remove("hidden");
}

canvas.addEventListener("pointerdown", (ev) => {
  const rect = canvas.getBoundingClientRect();
  const mx = (ev.clientX - rect.left) * (W / rect.width);
  const my = (ev.clientY - rect.top) * (H / rect.height);
  handleClick(mx, my, performance.now());
});
$("btn-play").addEventListener("click", startRound);
$("btn-again").addEventListener("click", startRound);
$("btn-save").addEventListener("click", () => {
  const name = ($("initials") as HTMLInputElement).value.trim() || "ACE";
  const acc = shots ? hits / shots : 0;
  renderBoard($("score-board"), saveScore(name, score, acc));
  $("save-row").classList.add("hidden");
});
$("btn-sound").addEventListener("click", (ev) => {
  setMuted(!isMuted());
  (ev.currentTarget as HTMLButtonElement).textContent = isMuted() ? "🔇" : "🔊";
});

renderBoard($("attract-board"), loadScores());
raf = requestAnimationFrame(frame);
void raf;

// Debug/testing hook (only with ?debug=1): exposes live target positions so
// automated tests can click a real target instead of guessing coordinates.
if (new URLSearchParams(location.search).get("debug")) {
  (window as unknown as { __skystrike: unknown }).__skystrike = {
    get targets() { return targets.map((t) => ({ x: t.x, y: t.y, r: t.r, kind: t.kind })); },
    get state() { return state; },
    get score() { return score; },
    get hits() { return hits; },
  };
}
