(() => {
'use strict';
/* Street Sprint : La Ruée d'Haba – jeu Canvas, sans bibliothèque, jouable hors ligne */
const W = 360, H = 640, CX = 180, HOR = 215, BOT = 590;
const LANE = 84, ROAD = 135, SIDE = 178, ZMIN = 0.4, ZFAR = 16;
const FOG = [233, 183, 138];
const CAR_COLS = ['#c0392b', '#2e86c1', '#f1c40f', '#ecf0f1', '#27ae60', '#8e44ad', '#34495e'];
const BLD_COLS = [[176,120,98],[120,140,170],[150,150,160],[196,160,120],[110,120,140],[170,110,110]];

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const s = Math.min(innerWidth / W, innerHeight / H);
  cv.style.width = Math.floor(W * s) + 'px';
  cv.style.height = Math.floor(H * s) + 'px';
  cv.width = Math.round(W * s * dpr);
  cv.height = Math.round(H * s * dpr);
  ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
}
addEventListener('resize', resize); resize();

const img = { haba: new Image(), thief: new Image() };
img.haba.src = 'haba_run.png'; img.thief.src = 'thief_run.png';
const ok = i => i.complete && i.naturalWidth > 0;

/* ---------- état ---------- */
let state = 'menu', t = 0, zs = 0, dist = 0, coins = 0, lives = 3, level = 1, bonus = 0;
let gap = 1, px = 1, target = 1, speed = 3, hurt = 0, flash = 0, shake = 0, rowTimer = 2, lastDouble = false;
let thiefX = 1, thiefTarget = 1, thiefTimer = 2, overAt = 0, best = 0, muted = false;
let things = [], toasts = [];
try { best = +localStorage.getItem('habaBest') || 0; } catch (e) {}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mod = (a, m) => ((a % m) + m) % m;
const rnd = a => a[Math.floor(Math.random() * a.length)];
const hash = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
const yOf = p => HOR + (BOT - HOR) * p;
const mix = (c, f) => `rgb(${c.map((v, i) => Math.round(v + (FOG[i] - v) * f)).join(',')})`;
const fogOf = p => Math.pow(clamp(1 - p, 0, 1), 1.5) * 0.85;

/* ---------- sons ---------- */
let ac = null;
function tone(f, d, type = 'square', v = 0.05, slide = 0) {
  if (muted) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const o = ac.createOscillator(), g = ac.createGain(), n = ac.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, n);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), n + d);
    g.gain.setValueAtTime(v, n); g.gain.exponentialRampToValueAtTime(0.0001, n + d);
    o.connect(g); g.connect(ac.destination); o.start(n); o.stop(n + d);
  } catch (e) {}
}

/* ---------- logique ---------- */
function startGame() {
  things = []; toasts = []; dist = 0; coins = 0; lives = 3; level = 1; bonus = 0; gap = 1;
  px = target = 1; hurt = 0; flash = 0; shake = 0; rowTimer = 2; lastDouble = false;
  thiefX = thiefTarget = 1; state = 'play'; tone(520, .12, 'triangle', .06, 300);
}
function spawnRow() {
  const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
  const dbl = !lastDouble && level > 1 && Math.random() < 0.35;
  const n = dbl ? 2 : 1; lastDouble = dbl;
  for (let i = 0; i < n; i++) things.push({ lane: lanes[i], z: ZFAR, type: rnd(['car', 'car', 'barrier', 'bin']), col: rnd(CAR_COLS) });
  if (Math.random() < 0.65) for (let k = 0; k < 3; k++) things.push({ lane: lanes[n], z: ZFAR + k * 0.7, type: 'coin' });
}
function update(dt) {
  t += dt;
  speed = Math.min(7, 3 + (level - 1) * 0.45 + dist / 4000);
  zs += speed * dt; dist += speed * dt * 6;
  rowTimer -= speed * dt;
  if (rowTimer <= 0) { spawnRow(); rowTimer = Math.max(1.9, 3.4 - level * 0.25); }
  px += (target - px) * Math.min(1, 14 * dt);
  hurt = Math.max(0, hurt - dt); flash = Math.max(0, flash - dt * 2); shake = Math.max(0, shake - dt);

  for (const o of things) {
    o.z -= speed * dt;
    if (o.done || o.z > 1.12 || o.z < 0.78 || Math.abs(o.lane - px) > 0.62) continue;
    if (o.type === 'coin') { o.done = true; coins++; gap = Math.max(0, gap - 0.08); tone(880, .12, 'square', .05, 400); }
    else if (hurt <= 0) {
      o.done = true; lives--; gap = Math.min(1, gap + 0.15); hurt = 1.4; flash = 1; shake = 0.35; tone(130, .35, 'sawtooth', .1, -70);
      if (lives <= 0) return gameOver();
    }
  }
  things = things.filter(o => o.z > ZMIN && !(o.done && o.type === 'coin'));

  thiefTimer -= dt;
  if (thiefTimer <= 0) { thiefTarget = rnd([0, 1, 2]); thiefTimer = 1.2 + Math.random() * 1.8; }
  thiefX += (thiefTarget - thiefX) * Math.min(1, 5 * dt);
  gap = clamp(gap - dt * Math.max(0.012, 0.03 - level * 0.002), 0, 1);
  if (gap <= 0) {
    bonus += 500; level++; gap = 1; toasts.push({ text: 'VOLEUR ATTRAPÉ !  +500', life: 2.2 });
    toasts.push({ text: 'Niveau ' + level, life: 2.2, d: 1 });
    [660, 830, 990, 1320].forEach((f, i) => setTimeout(() => tone(f, .15, 'triangle', .06), i * 110));
  }
  toasts.forEach(x => x.life -= dt); toasts = toasts.filter(x => x.life > 0);
}
const score = () => Math.floor(dist) + coins * 10 + bonus;
function gameOver() {
  state = 'over'; overAt = performance.now();
  if (score() > best) { best = score(); try { localStorage.setItem('habaBest', best); } catch (e) {} }
}
function move(d) {
  if (state !== 'play') return;
  const n = clamp(target + d, 0, 2);
  if (n !== target) { target = n; tone(300, .05, 'triangle', .04); }
}
function primary() {
  if (state === 'menu') startGame();
  else if (state === 'over' && performance.now() - overAt > 600) startGame();
  else if (state === 'pause') state = 'play';
}

/* ---------- commandes ---------- */
addEventListener('keydown', e => {
  const k = e.key;
  if (['ArrowLeft', 'ArrowRight', ' ', 'ArrowUp', 'ArrowDown'].includes(k)) e.preventDefault();
  if (k === 'ArrowLeft' || k === 'a' || k === 'A' || k === 'q' || k === 'Q') move(-1);
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') move(1);
  else if (k === ' ' || k === 'Enter') primary();
  else if (k === 'p' || k === 'P') { if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play'; }
  else if (k === 'm' || k === 'M') muted = !muted;
});
let sx = 0, sy = 0;
const logical = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
cv.addEventListener('pointerdown', e => { [sx, sy] = logical(e); });
cv.addEventListener('pointerup', e => {
  const [x, y] = logical(e), dx = x - sx, dy = y - sy;
  if (x > 318 && y > 600) { muted = !muted; return; }
  if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
  else if (state === 'play') move(x < W / 2 ? -1 : 1);
  else primary();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') state = 'pause'; });

/* ---------- dessin ---------- */
const poly = (pts, fill) => { ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
const rr = (x, y, w, h, r, fill) => { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
const shadow = (x, y, w, a = 0.35) => { ctx.beginPath(); ctx.ellipse(x, y, w / 2, w / 9, 0, 0, 7); ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fill(); };
const skyline = Array.from({ length: 24 }, (_, i) => ({ x: i * 16 - 6, w: 12 + hash(i) * 16, h: 18 + hash(i + 50) * 55 }));

function drawScene() {
  let g = ctx.createLinearGradient(0, 0, 0, HOR);
  g.addColorStop(0, '#1a2b52'); g.addColorStop(.55, '#5b6aa8'); g.addColorStop(.9, '#f4a672'); g.addColorStop(1, '#ffd9a8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, HOR + 1);
  g = ctx.createRadialGradient(CX, HOR - 4, 4, CX, HOR - 4, 90);
  g.addColorStop(0, 'rgba(255,244,205,.95)'); g.addColorStop(1, 'rgba(255,200,140,0)');
  ctx.fillStyle = g; ctx.fillRect(0, HOR - 100, W, 100);
  skyline.forEach(b => { ctx.fillStyle = 'rgba(70,62,100,.55)'; ctx.fillRect(b.x, HOR - b.h, b.w, b.h); });
  ctx.fillStyle = '#2a2f3a'; ctx.fillRect(0, HOR, W, H - HOR);

  const pb = 1.25, yb = yOf(pb);
  poly([[CX, HOR], [CX - ROAD * pb, yb], [CX - SIDE * pb, yb]], '#9a9ca6');
  poly([[CX, HOR], [CX + ROAD * pb, yb], [CX + SIDE * pb, yb]], '#9a9ca6');
  g = ctx.createLinearGradient(0, HOR, 0, H);
  g.addColorStop(0, '#565b69'); g.addColorStop(1, '#2b2f38');
  poly([[CX, HOR], [CX - ROAD * pb, yb], [CX + ROAD * pb, yb]], g);
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
  [-1, 1].forEach(s => { ctx.beginPath(); ctx.moveTo(CX, HOR); ctx.lineTo(CX + s * ROAD * pb, yb); ctx.stroke(); });
  for (let k = 0; k < 14; k++) {
    const za = ZMIN + mod(k * 1.2 - zs, 16.8), zb = za + 0.5, pa = 1 / za, pc = 1 / zb;
    [-LANE / 2, LANE / 2].forEach(off => poly([[CX + off * pa - 1.6 * pa, yOf(pa)], [CX + off * pa + 1.6 * pa, yOf(pa)], [CX + off * pc + 1.6 * pc, yOf(pc)], [CX + off * pc - 1.6 * pc, yOf(pc)]], 'rgba(255,255,255,.85)'));
  }
  g = ctx.createLinearGradient(0, HOR, 0, HOR + 130);
  g.addColorStop(0, 'rgba(240,190,140,.7)'); g.addColorStop(1, 'rgba(240,190,140,0)');
  ctx.fillStyle = g; ctx.fillRect(0, HOR, W, 130);

  const walls = [];
  for (let k = 0; k < 10; k++) [-1, 1].forEach(s => walls.push({ k, s, z: ZMIN + mod(k * 1.75 - zs + (s > 0 ? .8 : 0), 17.5) }));
  walls.sort((a, b) => b.z - a.z).forEach(w => wall(w.s, w.z, w.z + 1.4, 170 + hash(w.k * 3 + w.s) * 170, BLD_COLS[Math.floor(hash(w.k + w.s * 9) * BLD_COLS.length)], w.k * 5 + w.s));
  for (let k = 0; k < 7; k++) [-1, 1].forEach(s => lamp(s, ZMIN + 0.2 + mod(k * 2.4 - zs + (s > 0 ? 1.2 : 0), 16.8)));
}
function wall(side, zN, zF, BH, base, seed) {
  const P = (z, v) => { const p = 1 / z; return [CX + side * SIDE * p, yOf(p) - v * BH * p]; };
  const pN = 1 / zN, shade = base.map(v => v * (side < 0 ? 0.92 : 0.8));
  poly([P(zN, 0), P(zF, 0), P(zF, 1), P(zN, 1)], mix(shade, fogOf(pN)));
  if (pN < 0.13) return;
  const rows = Math.max(3, Math.floor(BH / 45));
  for (let r = 0; r < rows; r++) for (let c = 0; c < 3; c++) {
    const u0 = zN + (zF - zN) * (c + .2) / 3, u1 = zN + (zF - zN) * (c + .8) / 3;
    const v0 = (r + .3) / (rows + .6), v1 = (r + .75) / (rows + .6);
    poly([P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], hash(seed * 7 + r * 3 + c) > 0.55 ? 'rgba(255,214,120,.9)' : 'rgba(35,45,65,.55)');
  }
}
function lamp(side, z) {
  const p = 1 / z, x = CX + side * (ROAD + 16) * p, y = yOf(p), h = 120 * p, bx = x - side * 16 * p;
  ctx.strokeStyle = '#20242c'; ctx.lineWidth = Math.max(1, 3 * p);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.lineTo(bx, y - h); ctx.stroke();
  const g = ctx.createRadialGradient(bx, y - h, 0, bx, y - h, 18 * p + 2);
  g.addColorStop(0, 'rgba(255,230,150,.95)'); g.addColorStop(1, 'rgba(255,200,100,0)');
  ctx.fillStyle = g; ctx.fillRect(bx - 20 * p - 3, y - h - 20 * p - 3, 40 * p + 6, 40 * p + 6);
}
function drawThing(o) {
  const p = 1 / o.z, x = CX + (o.lane - 1) * LANE * p, y = yOf(p);
  if (o.type === 'coin') {
    const rx = 11 * p * Math.abs(Math.cos(t * 5 + o.z)) + 1, ry = 11 * p, cy = y - 34 * p;
    ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, 7); ctx.fillStyle = '#f5c518'; ctx.fill();
    ctx.lineWidth = Math.max(1, 2 * p); ctx.strokeStyle = '#b8860b'; ctx.stroke(); return;
  }
  const dim = o.done ? 0.35 : 1; ctx.globalAlpha = dim;
  if (o.type === 'car') {
    const w = 74 * p, h = 58 * p; shadow(x, y, w * 1.1);
    rr(x - w * .46, y - h * .22, w * .14, h * .22, 2 * p, '#111'); rr(x + w * .32, y - h * .22, w * .14, h * .22, 2 * p, '#111');
    rr(x - w / 2, y - h * .66, w, h * .48, 6 * p, o.col);
    rr(x - w * .36, y - h, w * .72, h * .42, 7 * p, o.col);
    rr(x - w * .3, y - h * .94, w * .6, h * .3, 4 * p, '#1b2a3a');
    rr(x - w * .47, y - h * .5, w * .2, h * .1, 2 * p, '#ff3b30'); rr(x + w * .27, y - h * .5, w * .2, h * .1, 2 * p, '#ff3b30');
    rr(x - w * .14, y - h * .42, w * .28, h * .12, 1, '#f1f1f1'); rr(x - w * .5, y - h * .22, w, h * .08, 2 * p, 'rgba(0,0,0,.45)');
  } else if (o.type === 'barrier') {
    const w = 72 * p, h = 36 * p; shadow(x, y, w);
    rr(x - w * .4, y - h, w * .07, h, 1, '#444'); rr(x + w * .33, y - h, w * .07, h, 1, '#444');
    for (let i = 0; i < 6; i++) rr(x - w / 2 + i * w / 6, y - h * .95, w / 6, h * .4, 1, i % 2 ? '#fff' : '#e63946');
  } else {
    const w = 58 * p, h = 48 * p; shadow(x, y, w);
    rr(x - w / 2, y - h, w, h * .86, 3 * p, '#2d7a3e'); rr(x - w * .54, y - h * 1.08, w * 1.08, h * .2, 3 * p, '#1f5a2c');
    rr(x - w * .4, y - h * .12, w * .14, h * .14, 2, '#111'); rr(x + w * .26, y - h * .12, w * .14, h * .14, 2, '#111');
  }
  ctx.globalAlpha = 1;
}
function drawHaba() {
  const x = CX + (px - 1) * LANE, bob = Math.abs(Math.sin(t * 11)) * 7, lean = (target - px) * 0.18;
  shadow(x, BOT + 6, 74, .4);
  if (hurt > 0 && Math.floor(t * 18) % 2) ctx.globalAlpha = 0.35;
  ctx.save(); ctx.translate(x, BOT + 8 - bob); ctx.rotate(lean + Math.sin(t * 11) * 0.03);
  if (ok(img.haba)) ctx.drawImage(img.haba, -90, -190, 180, 180); else { rr(-25, -120, 50, 120, 12, '#334155'); }
  ctx.restore(); ctx.globalAlpha = 1;
}
const thiefZ = () => 1.25 + gap * 2.2;
function drawThief() {
  const zt = thiefZ(), p = 1 / zt, x = CX + (thiefX - 1) * LANE * p, y = yOf(p), bob = Math.abs(Math.sin(t * 13)) * 6 * p;
  shadow(x, y, 70 * p, .4);
  const h = 190 * p, w = h * 0.7;
  if (ok(img.thief)) ctx.drawImage(img.thief, x - w / 2, y - h - bob + 6 * p, w, h); else rr(x - 14 * p, y - 100 * p, 28 * p, 100 * p, 4, '#b91c1c');
  const ay = y - h - 14 + Math.sin(t * 6) * 3;
  ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(x, ay + 9); ctx.lineTo(x - 8, ay - 3); ctx.lineTo(x + 8, ay - 3); ctx.fill();
}
const font = (s, w = 700) => `${w} ${s}px "Segoe UI",Roboto,Arial,sans-serif`;
function text(s, x, y, size, color = '#fff', align = 'center', w = 700) {
  ctx.font = font(size, w); ctx.textAlign = align; ctx.lineWidth = Math.max(2, size / 7); ctx.strokeStyle = 'rgba(0,0,0,.65)';
  ctx.strokeText(s, x, y); ctx.fillStyle = color; ctx.fillText(s, x, y);
}
function hud() {
  ctx.fillStyle = 'rgba(8,14,28,.55)'; ctx.fillRect(0, 0, W, 54);
  text('SCORE', 14, 20, 11, '#9fb3c8', 'left'); text(String(score()), 14, 44, 24, '#fff', 'left');
  for (let i = 0; i < 3; i++) text('♥', 150 + i * 22, 34, 22, i < lives ? '#ef4444' : '#475569');
  ctx.beginPath(); ctx.arc(298, 29, 9, 0, 7); ctx.fillStyle = '#f5c518'; ctx.fill();
  text(String(coins), 346, 36, 20, '#fff', 'right');
  text('VOLEUR', 14, 76, 11, '#9fb3c8', 'left'); text('Niveau ' + level, W - 14, 76, 11, '#9fb3c8', 'right');
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(70, 68, 220, 8);
  ctx.fillStyle = gap < .35 ? '#22c55e' : gap < .7 ? '#f59e0b' : '#ef4444'; ctx.fillRect(70, 68, 220 * gap, 8);
  text(muted ? '♪̸ OFF' : '♪ ON', W - 8, 632, 11, '#cbd5e1', 'right');
  toasts.forEach((x, i) => { ctx.globalAlpha = Math.min(1, x.life); text(x.text, CX, 190 + (x.d ? 40 : 0), x.d ? 18 : 26, x.d ? '#93c5fd' : '#fde047'); ctx.globalAlpha = 1; });
}
function overlay(title, lines, hint) {
  ctx.fillStyle = 'rgba(6,10,22,.62)'; ctx.fillRect(0, 0, W, H);
  text(title, CX, 205, title.length > 12 ? 34 : 44, '#fff');
  lines.forEach((l, i) => text(l, CX, 262 + i * 30, 17, i === 0 ? '#93c5fd' : '#e2e8f0', 'center', 600));
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4); text(hint, CX, 540, 17, '#fde047'); ctx.globalAlpha = 1;
}
function render() {
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - .5) * 12 * shake, (Math.random() - .5) * 12 * shake);
  drawScene();
  const list = things.map(o => ({ z: o.z, f: () => drawThing(o) }));
  list.push({ z: thiefZ(), f: drawThief });
  list.sort((a, b) => b.z - a.z).forEach(o => o.f());
  drawHaba();
  ctx.restore();
  const v = ctx.createRadialGradient(CX, 340, 200, CX, 340, 430);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  if (flash > 0) { ctx.fillStyle = `rgba(239,68,68,${flash * .35})`; ctx.fillRect(0, 0, W, H); }
  if (state !== 'menu') hud();
  if (state === 'menu') overlay('STREET SPRINT', ['La Ruée d\'Haba', 'Rattrapez le voleur !', '← → ou glissez pour changer de voie', 'Évitez les obstacles, prenez les pièces', best ? 'Meilleur score : ' + best : ''], 'Touchez ou appuyez sur ESPACE');
  else if (state === 'pause') overlay('PAUSE', ['Appuyez sur P ou touchez l\'écran'], 'Continuer');
  else if (state === 'over') overlay('PERDU !', ['Score : ' + score(), 'Meilleur : ' + best, 'Niveau atteint : ' + level], 'Touchez pour rejouer');
}

let last = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
  if (state === 'play') update(dt); else { t += dt; if (state === 'menu') zs += dt * 1.2; }
  render(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__game = { start: startGame, get gap() { return gap; }, set gap(v) { gap = v; }, get level() { return level; }, get state() { return state; }, set px(v) { px = target = v; } };
})();
