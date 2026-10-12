'use strict';
(function(){
// Aus prototypes/hahnenkampf/src/labor/ui.js übernommen (prototypes/lanister-lektion/to-dist.py, nicht von Hand ändern): Nahansicht und Dorfplatz-Kampfszene
const CF=window.CF;const clamp=CF.clamp,lerp=CF.lerp;const seg=(t,a,b)=>clamp((t-a)/(b-a),0,1);const ease=t=>t*t*(3-2*t);const easeOut=t=>1-(1-t)*(1-t);const rnd=(a,b)=>a+Math.random()*(b-a);const now=()=>performance.now();
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));const tierBadge=t=>t===1?'✖✖':t===2?'✖':t<=7?'★'.repeat(t-2)+'☆'.repeat(7-t):t===8?'★★★★★✦':'★★★★★✦✦';
let VROOT=null;const $=q=>(VROOT||document).querySelector(q);
let bubbleFn=null;function setBubble(text,tier){if(bubbleFn)bubbleFn(text,tier);}
/* ---------- Pixel-Grid → Canvas ---------- */
class Sprite {
  constructor(w, h) {
    this.grid = new CF.PixGrid(w, h); this.painter = new CF.Painter(this.grid);
    this.cv = document.createElement('canvas'); this.cv.width = w; this.cv.height = h;
    this.ctx = this.cv.getContext('2d'); this.img = this.ctx.createImageData(w, h);
    this.view = new Uint8ClampedArray(this.grid.d.buffer);
  }
  begin() { this.grid.clear(); return this.painter; }
  commit() { this.img.data.set(this.view); this.ctx.putImageData(this.img, 0, 0); return this.cv; }
}

/* ---------- globaler Ticker ---------- */
const ticker = new Set();
let lastFrame = now();
function frame(t) {
  const dt = Math.min(0.05, (t - lastFrame) / 1000); lastFrame = t;
  for (const f of ticker) f(dt, t / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 9 Stufen → 5 Grundanimationen (+ Zusätze für die seltenen Stufen 1, 2, 8, 9)
const ANIM_KIND = [1, 1, 1, 2, 3, 4, 5, 5, 5];
const TIER_DUR = [4.2, 3.7, 3.4, 3.2, 3.2, 3.6, 5.0, 5.2, 5.8];
const TIER_REVEAL = [1.0, 1.0, 0.9, 1.0, 0.9, 0.5, 2.25, 2.25, 2.4];
const CLOSE_CM_PX = 0.72; // Nahansicht: gleicher Maßstab für alle Hähne → Größenunterschiede bleiben sichtbar
const BACKDROP = [
  ['#262826', '#3a3d38', '#474a44'], ['#2a2c2c', '#40443f', '#50544e'], ['#2e3236', '#4a4f53', '#5b6064'],
  ['#3a2f22', '#5a4a34', '#6e5c40'], ['#3d2614', '#7a4c20', '#b07a34'], ['#3a0e06', '#8a2c10', '#d0601e'],
  ['#050203', '#220508', '#4a0a10'], ['#060208', '#1c0624', '#38084a'], ['#070400', '#2a0a02', '#5a2a04']
];
const RAY_COL = { 7: '200,20,30', 8: '170,50,230', 9: '255,180,40' };

class CloseupScene {
  constructor(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.W = canvas.width; this.H = canvas.height;
    this.sp = new Sprite(this.W, this.H); this.parts = []; this.fn = (dt, t) => this.update(dt, t);
  }
  play(R, onReveal) {
    this.R = R; this.t = 0; this.prevT = 0; this.parts = []; this.onReveal = onReveal; this.revealed = false;
    this.tier = R.quality.tier; this.dur = TIER_DUR[this.tier - 1]; this.bubble = null; this.done = false;
    ticker.add(this.fn);
    return new Promise(res => { this.resolve = res; });
  }
  skip() { if (this.t < this.dur) { this.t = this.dur; this.prevT = this.dur; this.parts = []; if (!this.revealed) { this.revealed = true; this.onReveal && this.onReveal(); } } }
  stop() { ticker.delete(this.fn); setBubble(null); }
  crossed(T) { return this.prevT < T && this.t >= T; }
  burst(kind, n, x, y, opt) {
    opt = opt || {};
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2), sp = rnd(opt.min || 20, opt.max || 80);
      this.parts.push({ kind, x: x + rnd(-6, 6), y: y + rnd(-3, 3), vx: Math.cos(a) * sp, vy: kind === 'ember' ? -rnd(15, 45) : Math.sin(a) * sp * 0.5 - (opt.up || 0), life: rnd(0.6, 1.4) * (opt.life || 1), age: 0, col: opt.col || '#c8b08a', r: rnd(1, opt.r || 3) });
    }
  }
  anim(t) {
    // liefert Pose + Effekte für die aktuelle Stufe
    const R = this.R, st = { x: 0, y: 0, sMul: 1, pose: { yaw: 0.3 }, shake: 0, dark: 0, flash: 0, rays: 0 };
    const P = st.pose; P.blink = (t * 1000 % 2600) < 110; P.tailSwish = Math.sin(t * 2) * 0.15; P.bob = Math.sin(t * 3) * 0.25;
    const X = this.W / 2, G = this.H - 9;
    const tier = this.tier;
    switch (ANIM_KIND[tier - 1]) {
      case 1: { // klein, trottelig, lächerlich (Stufe 1–3)
        const f = seg(t, 0, 0.55);
        st.y = -170 * (1 - f * f);
        if (t > 0.55 && t < 1.3) st.y = -Math.abs(Math.sin((t - 0.55) * 9)) * 10 * (1 - seg(t, 0.55, 1.3));
        if (this.crossed(0.55)) this.burst('dust', 10, X, G, { col: '#8a8478', max: 50 });
        P.yaw = 0.3 + (t > 1.1 ? Math.sin(t * 6.5) * 0.35 : 0);
        P.headX = Math.sin(t * 3.2) * 0.8; P.crouch = 0.15;
        if (t > 1.4 && t < 2.0) { P.wing = 0.4 + Math.abs(Math.sin(t * 18)) * 0.3; P.flap = t * 25; }
        if (this.crossed(1.6)) this.burst('feather', 3, X + 12, G - 50, { col: R.appearance.colors.body, max: 25, life: 2 });
        if (t > 2.0 && t < 3.0) { P.beakOpen = 0.35; this.say('kikeri…?'); } else if (t >= 3.0) this.say(null);
        P.eyeX = Math.sin(t * 4) * 0.5;
        if (tier === 2) { // Pechvogel: Schluckauf und Stolpern
          if (t > 2.0 && t < 3.0) this.say('kikeri… *hicks*');
          if (t > 2.3 && t < 2.55) st.y = -Math.sin(seg(t, 2.3, 2.55) * Math.PI) * 9;
          if (t > 3.0 && t < 3.4) { st.roll = Math.sin(seg(t, 3.0, 3.4) * Math.PI) * 0.45; }
        }
        if (tier === 1) { // Jammerhahn: kippt um, bleibt liegen, rappelt sich auf
          P.wing = 0;
          const fall = ease(seg(t, 1.5, 1.8)), up = ease(seg(t, 3.0, 3.6));
          st.roll = 1.35 * fall * (1 - up);
          if (this.crossed(1.8)) { this.burst('dust', 12, X + 20, G, { col: '#77756c', max: 45 }); this.burst('feather', 4, X + 15, G - 20, { col: R.appearance.colors.body, max: 30, life: 2.2 }); }
          if (t > 1.6 && t < 3.0) { P.blink = true; P.beakOpen = 0.2; }
          if (t > 2.0 && t < 3.0) this.say('…piep.'); else if (t >= 3.0 && t < 3.9) this.say('kikeri…?');
          else if (t >= 3.9) this.say(null);
        }
        break;
      }
      case 2: { // läuft herein, plustert sich halbherzig
        const w = seg(t, 0, 1.2);
        st.x = -150 * (1 - easeOut(w)); st.y = -Math.abs(Math.sin(t * 12)) * 3 * (1 - w);
        P.yaw = lerp(0.85, 0.3, ease(w));
        if (t > 1.4) { const k = seg(t, 1.4, 1.8) * (1 - seg(t, 2.6, 3.0)); P.hackle = 0.5 * k; P.wing = 0.25 * k; P.crouch = -0.2 * k; }
        if (t > 1.8 && t < 2.8) { P.beakOpen = 0.5; this.say('Kikeriki.'); } else if (t >= 2.8) this.say(null);
        break;
      }
      case 3: { // solider Kampfhahn: Sprung, Flügelschlag, Krähen
        const j = seg(t, 0, 0.7);
        st.x = 130 * (1 - j); st.y = -Math.sin(j * Math.PI) * 40;
        P.wing = t < 0.7 ? 0.6 : 0; P.flap = t * 22;
        if (this.crossed(0.7)) this.burst('dust', 14, X, G, { col: '#b08a5a', max: 60 });
        if (t > 1.0 && t < 1.7) { const k = Math.sin(seg(t, 1.0, 1.7) * Math.PI); P.wing = 0.9 * k; P.flap = t * 14; }
        if (t > 1.6 && t < 2.7) { P.beakOpen = 1; P.headY = -1.5; P.crouch = -0.25; P.hackle = 0.6; this.say('KIKERIKI!'); } else if (t >= 2.7) this.say(null);
        if (t > 2.7) P.hackle = 0.3;
        break;
      }
      case 4: { // groß, aggressiv: Einschlag, Flügel, Kreischen
        const d = seg(t, 0, 0.35);
        st.y = -200 * (1 - d * d);
        if (this.crossed(0.35)) { this.burst('dust', 28, X, G, { col: '#c07a40', max: 120, up: 20 }); this.burst('debris', 10, X, G, { col: '#5a2a10', max: 90, up: 60 }); this.shakeT = 0.5; }
        st.shake = Math.max(0, this.shakeT || 0) * 12;
        P.crouch = t < 0.6 ? 0.6 * (1 - seg(t, 0.35, 0.6)) : 0.25;
        if (t > 0.6) { const k = seg(t, 0.6, 1.0); P.wing = 1.05 * k; P.flap = t * 20; P.hackle = 1.1 * k; P.yaw = 0.18; }
        if (t > 1.0 && t < 2.1) { P.beakOpen = 1; P.headY = 1; this.say('KRAAAH!'); if (this.crossed(1.05)) this.burst('feather', 6, X, G - 70, { col: R.appearance.colors.hackle, max: 70, life: 2 }); }
        else if (t >= 2.1) this.say(null);
        if (t > 2.6) { const k = seg(t, 2.6, 3.4); P.wing = 1.05 * (1 - k) + 0.1; P.hackle = 1.1 - 0.4 * k; }
        st.sMul = 1 + 0.05 * seg(t, 0.6, 2.4);
        break;
      }
      case 5: { // Bluthahn: Dunkelheit, glühende Augen, Blitz, gewaltige Präsenz
        P.glow = 1; st.rays = seg(t, 1.0, 2.0);
        st.dark = t < 1.0 ? 0.96 : lerp(0.96, 0.0, ease(seg(t, 1.0, 1.9)));
        if (this.crossed(1.0)) { st.flash = 1; this.flashT = 0.35; this.shakeT = 0.3; }
        st.flash = Math.max(0, this.flashT || 0) / 0.35;
        P.crouch = t < 1.8 ? 0.7 : 0.7 * (1 - ease(seg(t, 1.8, 2.25)));
        P.yaw = 0.12;
        if (t > 2.15) { const k = ease(seg(t, 2.15, 2.4)); P.wing = 1.2 * k; P.hackle = 1.35 * k; P.flap = t * 9; }
        if (this.crossed(2.25)) { this.shakeT = 0.7; this.burst('dust', 26, X, G, { col: '#3a0a0a', max: 110, up: 15 }); this.burst('feather', 8, X, G - 80, { col: R.appearance.colors.hackle, max: 90, life: 2.5 }); }
        st.shake = Math.max(0, this.shakeT || 0) * 14;
        if (t > 2.3 && t < 3.3) { P.beakOpen = 0.9; P.headY = 1; this.say('…'); } else if (t >= 3.3) this.say(null);
        if (t > 3.6) { const k = seg(t, 3.6, 4.6); P.wing = 1.2 - 0.9 * k; P.hackle = 1.35 - 0.35 * k; }
        st.sMul = 0.94 + 0.08 * ease(seg(t, 1.8, 2.4));
        if (Math.random() < 0.35) this.burst('ember', 1, X + rnd(-90, 90), this.H, { col: Math.random() < 0.5 ? '#ff6a2a' : '#ffb040' });
        P.blink = false;
        if (tier === 8) { st.sMul *= 1.02; if (this.crossed(2.3)) this.burst('ember', 30, X, G - 40, { col: '#c656f0', max: 90 }); }
        if (tier === 9) { // Legende: doppelter Blitz, goldene Glut, Beben
          if (this.crossed(2.25)) { this.flashT = 0.45; }
          st.flash = Math.max(0, this.flashT || 0) / 0.4;
          if (Math.random() < 0.5) this.burst('ember', 1, X + rnd(-100, 100), this.H, { col: Math.random() < 0.6 ? '#ffc933' : '#ff6a2a' });
          if (this.crossed(2.3)) this.burst('ember', 40, X, G - 50, { col: '#ffd860', max: 120 });
          if (t > 2.3 && t < 3.3) this.say('KRRRAAAH!');
          st.shake = Math.max(st.shake, t > 2.25 && t < 3.6 ? 3 : 0);
        }
        break;
      }
    }
    if (t >= this.dur) { P.bob = Math.sin(t * 3) * 0.3; }
    return st;
  }
  say(text) { if (this.bubble !== text) { this.bubble = text; setBubble(text, this.tier); } }
  update(dt, T) {
    this.prevT = this.t; this.t += dt;
    if (this.shakeT) this.shakeT = Math.max(0, this.shakeT - dt);
    if (this.flashT) this.flashT = Math.max(0, this.flashT - dt);
    const t = this.t, st = this.anim(t), R = this.R, ctx = this.ctx, W = this.W, H = this.H, tier = this.tier;
    if (!this.revealed && t >= TIER_REVEAL[tier - 1]) { this.revealed = true; this.onReveal && this.onReveal(); }
    if (!this.done && t >= this.dur) { this.done = true; this.resolve && this.resolve(); }
    ctx.save();
    if (st.shake > 0.5) ctx.translate(Math.round(rnd(-st.shake, st.shake)), Math.round(rnd(-st.shake, st.shake)));
    // Hintergrund
    const B = BACKDROP[tier - 1];
    for (let y = 0; y < H; y += 3) {
      const k = y / H; const c = k < 0.5 ? B[0] : k < 0.8 ? B[1] : B[2];
      ctx.fillStyle = c; ctx.fillRect(-20, y, W + 40, 3);
      if ((y / 3) % 2 === 0 && k > 0.45 && k < 0.55) { ctx.fillStyle = B[1]; for (let x = 0; x < W; x += 4) ctx.fillRect(x, y, 2, 3); }
    }
    const kind = ANIM_KIND[tier - 1];
    if (kind === 3 || kind === 4) { ctx.fillStyle = kind === 3 ? 'rgba(255,210,120,.12)' : 'rgba(255,140,60,.16)'; ctx.beginPath(); ctx.arc(W / 2, H * 0.48, 62, 0, 7); ctx.fill(); }
    if (kind === 4) { ctx.fillStyle = 'rgba(255,190,120,.18)'; for (let i = 0; i < 9; i++) { const yy = (i * 23 + t * 220) % H; ctx.fillRect(0, Math.round(yy), W, 1); } }
    if (st.rays > 0) {
      ctx.save(); ctx.translate(W / 2, H * 0.45); ctx.rotate(t * 0.25);
      ctx.fillStyle = 'rgba(' + (RAY_COL[tier] || RAY_COL[7]) + ',' + (0.22 * st.rays) + ')';
      for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(160, -14); ctx.lineTo(160, 14); ctx.fill(); }
      ctx.restore();
    }
    // Boden
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-20, H - 22, W + 40, 22);
    const s = CF.WORLD.scaleFor(R.height, CF.WORLD.roosterModelUnits, CLOSE_CM_PX) * st.sMul;
    const ox = Math.round(W / 2 + st.x), oy = Math.round(H - 9 + st.y + (st.roll ? 4 * s * Math.abs(st.roll) / 1.35 : 0));
    const shw = Math.round(22 * s * clamp(1 + st.y / 200, 0.3, 1));
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(Math.round(W / 2 + st.x - shw / 2), H - 10, shw, 3);
    // Hahn
    const P = this.sp.begin(); P.setT(ox, oy, s, 1, st.roll || 0, 0, -14);
    const fr = CF.drawRoosterFront(P, R, st.pose, now());
    ctx.drawImage(this.sp.commit(), 0, 0);
    // Partikel
    for (const p of this.parts) {
      p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'feather') { p.vy = 18 + Math.sin(p.age * 5) * 8; p.vx *= 0.96; }
      else if (p.kind === 'ember') { p.vx = Math.sin(p.age * 3 + p.x) * 10; }
      else { p.vy += 140 * dt; p.vx *= 0.93; }
      const a = clamp(1 - p.age / p.life, 0, 1);
      ctx.globalAlpha = a; ctx.fillStyle = p.col;
      if (p.kind === 'dust') { const r = Math.round(p.r + p.age * 6); ctx.fillRect(Math.round(p.x - r), Math.round(p.y - r / 2), r * 2, r); }
      else if (p.kind === 'feather') { ctx.fillRect(Math.round(p.x), Math.round(p.y), 3, 1); ctx.fillRect(Math.round(p.x) + 1, Math.round(p.y) - 1, 1, 1); }
      else ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    }
    ctx.globalAlpha = 1;
    this.parts = this.parts.filter(p => p.age < p.life);
    // Dunkelheit + glühende Augen (Stufe 5)
    if (st.dark > 0.01) {
      ctx.fillStyle = 'rgba(0,0,0,' + st.dark + ')'; ctx.fillRect(-20, -20, W + 40, H + 40);
      for (const e of fr.eyes) {
        const q = P.fwd(e.x, e.y); const ex = Math.round(q[0]), ey = Math.round(q[1]);
        ctx.fillStyle = 'rgba(255,40,20,.35)'; ctx.fillRect(ex - 4, ey - 2, 9, 5);
        ctx.fillStyle = tier === 9 ? '#ffc933' : tier === 8 ? '#d070ff' : '#ff3a1a'; ctx.fillRect(ex - 2, ey - 1, 5, 3); ctx.fillStyle = '#ffd0a0'; ctx.fillRect(ex, ey, 1, 1);
      }
    }
    if (tier >= 7) { // Vignette
      const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 140); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,0,0,.55)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (st.flash > 0) { ctx.fillStyle = 'rgba(255,240,230,' + st.flash + ')'; ctx.fillRect(-20, -20, W + 40, H + 40); }
    ctx.restore();
  }
}

/* =====================================================================
   KAMPFSZENE – mittelalterlicher Dorfplatz
   ===================================================================== */
/* ---------- Weltmaßstab & Perspektive ----------
   Alle Figuren (Hähne, Menschen, später andere Tiere) werden über ihre echte
   Körpergröße in cm skaliert: px = cm / cmPerPx × Tiefenfaktor(y). */
const W = 320, H = 200, RING = { cx: 160, cy: 140, rx: 126, ry: 38 };
const CM_PX = CF.WORLD.cmPerPx;
const DEPTH = y => 0.55 + (y - 60) * 0.0045;

function pxLine(ctx, x0, y0, x1, y1, col) {
  ctx.fillStyle = col; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(lerp(x0, x1, i / n)), Math.round(lerp(y0, y1, i / n)), 1, 1);
}
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function buildBackground() {
  const rng = CF.makeRng(424242);
  const bg = makeCanvas(W, H), ctx = bg.getContext('2d');
  const sky = ['#8fa9b8', '#a3b8c2', '#b8c6c6', '#cdd0c2'];
  for (let y = 0; y < 40; y++) { ctx.fillStyle = sky[Math.min(3, Math.floor(y / 10))]; ctx.fillRect(0, y, W, 1); }
  ctx.fillStyle = '#e8e6da';
  for (const [cx, cy, w] of [[40, 6, 26], [150, 4, 34], [262, 8, 22]]) { ctx.fillRect(cx, cy, w, 3); ctx.fillRect(cx + 4, cy - 2, w - 10, 2); }
  ctx.fillStyle = '#5f574b'; ctx.fillRect(0, 62, W, H - 62);
  const stones = ['#867b6a', '#7c7262', '#91866f', '#746a5b'];
  for (let y = 62, r = 0; y < H; y += 4, r++) for (let x = -(r % 2) * 3; x < W; x += 6) { ctx.fillStyle = stones[rng.int(0, 3)]; ctx.fillRect(x + 1, y + 1, 4 + rng.int(0, 1), 2 + (y > 140 ? 1 : 0)); }
  // Kirchturm
  ctx.fillStyle = '#8c8a84'; ctx.fillRect(146, 4, 26, 62);
  ctx.fillStyle = '#7a7872'; for (let y = 6; y < 66; y += 5) ctx.fillRect(146, y, 26, 1);
  ctx.fillStyle = '#4a3a34'; for (let r = 0; r < 18; r++) ctx.fillRect(159 - Math.floor(r * 0.8) - 1, -10 + r, Math.floor(r * 1.6) + 2, 1);
  ctx.fillStyle = '#2a2220'; ctx.fillRect(156, 16, 6, 9);
  // Fachwerkhäuser
  const walls = ['#d9c8a4', '#cdb88f', '#c8b496', '#dccfb2', '#bfa98a'], roofs = ['#7a3420', '#5e3a2c', '#8a4a2a', '#6a2a1c'];
  let x = -8;
  while (x < W + 4) {
    const w = rng.int(32, 48), h = rng.int(34, 46), base = 68;
    if (x + w > 140 && x < 178) { x = 178; continue; }
    const top = base - h, wall = rng.pick(walls), roof = rng.pick(roofs), gable = rng.chance(0.5);
    ctx.fillStyle = wall; ctx.fillRect(x, top, w, h);
    ctx.fillStyle = '#4a3221';
    ctx.fillRect(x, top, w, 2); ctx.fillRect(x, base - 2, w, 2); ctx.fillRect(x, top + Math.floor(h / 2), w, 2);
    for (let px = x; px <= x + w; px += 9) ctx.fillRect(Math.min(px, x + w - 2), top, 2, h);
    for (let px = x; px + 9 <= x + w; px += 18) pxLine(ctx, px + 1, top + Math.floor(h / 2) - 1, px + 8, top + 2, '#4a3221');
    for (let px = x + 3; px + 5 < x + w; px += 9) if (rng.chance(0.6)) { ctx.fillStyle = '#2a2424'; ctx.fillRect(px + 1, top + 5, 4, 6); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(px, top + 5, 1, 6); ctx.fillRect(px + 5, top + 5, 1, 6); }
    if (gable) { const rh = Math.ceil(w / 2); for (let r = 0; r < rh; r++) { ctx.fillStyle = r % 3 === 0 ? CF.adjust(roof, { l: -0.08 }) : roof; ctx.fillRect(x + w / 2 - r - 1, top - rh + r, r * 2 + 2, 1); } }
    else { const rh = 12; for (let r = 0; r < rh; r++) { ctx.fillStyle = r % 3 === 0 ? CF.adjust(roof, { l: -0.08 }) : roof; ctx.fillRect(x - 2 + Math.floor((rh - r) * 0.4), top - rh + r, w + 4 - Math.floor((rh - r) * 0.8), 1); } }
    x += w + rng.int(0, 3);
  }
  for (let i = 0; i < 2; i++) {
    const x0 = i ? 180 : 20, x1 = i ? 300 : 140;
    for (let xx = x0; xx < x1; xx++) { const t = (xx - x0) / (x1 - x0), yy = Math.round(26 + Math.sin(t * Math.PI) * 7); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(xx, yy, 1, 1);
      if ((xx - x0) % 8 === 2) { ctx.fillStyle = ['#a8261e', '#d8b040', '#2a4a7a'][((xx - x0) / 8 | 0) % 3]; ctx.fillRect(xx, yy + 1, 4, 2); ctx.fillRect(xx + 1, yy + 3, 2, 2); } }
  }
  // Grubenboden
  const floor = ['#a88a5a', '#9c7f50', '#b0915e'];
  for (let y = RING.cy - RING.ry; y <= RING.cy + RING.ry; y++) {
    const dy = (y - RING.cy) / RING.ry, half = Math.floor(Math.sqrt(Math.max(0, 1 - dy * dy)) * (RING.rx - 3));
    for (let xx = RING.cx - half; xx < RING.cx + half; xx += 2) { ctx.fillStyle = floor[(CF.hash3(xx, y, 3) * 3) | 0]; ctx.fillRect(xx, y, 2, 1); }
  }
  for (let i = 0; i < 160; i++) { const a = rng.range(0, 6.28), r = Math.sqrt(rng.next()) * 0.92; const sx = Math.round(RING.cx + Math.cos(a) * RING.rx * r), sy = Math.round(RING.cy + Math.sin(a) * RING.ry * r); ctx.fillStyle = rng.chance(0.5) ? '#d8c07a' : '#8a6a3e'; ctx.fillRect(sx, sy, rng.int(2, 3), 1); }
  // Flechtzaun – Höhe maßstabsgetreu (30 cm)
  const back = makeCanvas(W, H), front = makeCanvas(W, H);
  const weave = ['#7a5530', '#94693a', '#5e4024', '#86602f'];
  for (let xx = RING.cx - RING.rx; xx <= RING.cx + RING.rx; xx++) {
    const dx = (xx - RING.cx) / RING.rx, dy = Math.sqrt(Math.max(0, 1 - dx * dx)) * RING.ry;
    for (const sgn of [-1, 1]) {
      const c = (sgn < 0 ? back : front).getContext('2d');
      const by = Math.round(RING.cy + sgn * dy), fh = Math.round(CF.WORLD.fenceCm / CM_PX * DEPTH(by));
      for (let k = 0; k < fh; k++) { c.fillStyle = weave[((xx >> 1) + (k >> 1) + (k > fh / 2 ? 1 : 0)) % 4]; c.fillRect(xx, by - fh + k, 1, 1); }
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(xx, by, 1, 1);
    }
  }
  for (let a = 0; a < Math.PI * 2; a += 0.15) {
    const px = Math.round(RING.cx + Math.cos(a) * RING.rx), py = Math.round(RING.cy + Math.sin(a) * RING.ry);
    const fh = Math.round(CF.WORLD.fenceCm / CM_PX * DEPTH(py)) + 3;
    const c = (Math.sin(a) < 0 ? back : front).getContext('2d');
    c.fillStyle = '#4a2e18'; c.fillRect(px - 1, py - fh, 2, fh + 1); c.fillStyle = '#6e4a2a'; c.fillRect(px - 1, py - fh, 2, 1);
  }
  return { bg, back, front };
}

/* ---------- Zuschauer (maßstabsgetreu: Erwachsene 152–192 cm, Kinder 104–136 cm) ---------- */
const SKIN = ['#e8c09a', '#d8a880', '#c49070', '#a87458', '#8a5a40', '#f0d0b0'];
const HAIR = ['#2a1a10', '#4a2e18', '#7a4a20', '#b88a40', '#d8c8a0', '#3a3a3a', '#8a3a1a', '#9a9a94'];
const CLOTH = ['#6a3a2a', '#3a4a6a', '#5a6a3a', '#7a6a4a', '#8a2a20', '#4a3a5a', '#9a8a6a', '#3a5a5a', '#6a5030', '#7a5a7a'];
const LEGS_C = ['#4a3a2a', '#3a3a44', '#5a4a3a', '#2e2a26', '#6a5a44'];
const HATS = ['#5a3a20', '#3a2a1a', '#7a6a50', '#8a2020', '#2a3a2a'];
const pickA = a => a[(Math.random() * a.length) | 0];
function makePerson(x, footY, front) {
  const kid = Math.random() < 0.12, female = Math.random() < 0.45;
  const [lo, hi] = kid ? CF.WORLD.human.childCm : CF.WORLD.human.adultCm;
  const cm = female ? rnd(lo, hi - 12) : rnd(lo + 8, hi);
  const cloth = pickA(CLOTH);
  return {
    x: Math.round(x), footY: Math.round(footY), cm: Math.round(cm), kid, female, front: !!front, back: !!front,
    skin: pickA(SKIN), hair: pickA(HAIR), cloth, cloth2: CF.adjust(cloth, { l: -0.08 }), legs: pickA(LEGS_C),
    hat: Math.random() < 0.22 ? pickA(HATS) : null, hood: Math.random() < 0.12, beard: !female && !kid && Math.random() < 0.4,
    dress: female && Math.random() < 0.75, apron: !kid && Math.random() < 0.18, phase: Math.random() * 10, fan: Math.random()
  };
}
function makeCrowd() {
  const people = [];
  for (let row = 1; row >= 0; row--) {
    const rx = RING.rx + 10 + row * 14, ry = RING.ry + 5 + row * 8;
    for (let a = Math.PI * 1.04 + row * 0.08; a < Math.PI * 1.96; a += (row ? 0.24 : 0.15) + Math.random() * 0.06) people.push(makePerson(RING.cx + Math.cos(a) * rx + rnd(-3, 3), RING.cy + Math.sin(a) * ry, false));
  }
  for (const side of [-1, 1]) for (let k = 0; k < 3; k++) people.push(makePerson(side < 0 ? rnd(-6, 20) : rnd(300, 326), 128 + k * 13 + rnd(-3, 3), false));
  people.sort((a, b) => a.footY - b.footY);
  const frontRow = [];
  const kF = DEPTH(H);
  for (let x = 4; x < W + 8; x += rnd(26, 40)) { const p = makePerson(x, 0, true); for (const k of ['skin', 'hair', 'cloth', 'cloth2', 'legs']) p[k] = CF.mix(p[k], '#1a120c', 0.55); if (p.hat) p.hat = CF.mix(p.hat, '#1a120c', 0.55); const h = p.cm / CM_PX * kF; p.footY = Math.round(H - 26 + h + rnd(-3, 5)); frontRow.push(p); }
  return { people, frontRow, excite: 0, cheerFor: -1 };
}
function drawHuman(ctx, p, t, ex) {
  const k = p.front ? DEPTH(H) : DEPTH(p.footY);
  const h = p.cm / CM_PX * k, u = h / 100;
  const excited = ex * (0.4 + p.fan);
  const jump = excited > 1.0 ? Math.abs(Math.sin(t * 9 + p.phase)) * 2.5 * u : 0;
  const x0 = p.x + Math.sin(t * 1.2 + p.phase) * 0.8 * u, fy = p.footY - jump, top = fy - h;
  const R = (x, y, w, hh, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(hh))); };
  const shoe = '#2a1c12';
  if (!p.dress) { R(x0 - 8 * u, top + 58 * u, 7 * u, 40 * u, p.legs); R(x0 + 1 * u, top + 58 * u, 7 * u, 40 * u, p.legs); R(x0 - 9 * u, fy - 3 * u, 9 * u, 3 * u, shoe); R(x0, fy - 3 * u, 9 * u, 3 * u, shoe); }
  if (p.dress) { for (let i = 0; i < 10; i++) { const ww = (22 + i * 1.7) * u; R(x0 - ww / 2, top + 17 * u + i * 8 * u, ww, 8.6 * u, p.cloth); } R(x0 - 7 * u, fy - 3 * u, 14 * u, 3 * u, shoe); }
  else R(x0 - 11 * u, top + 17 * u, 22 * u, 45 * u, p.cloth);
  R(x0 + 5 * u, top + 17 * u, 6 * u, (p.dress ? 78 : 45) * u, 'rgba(0,0,0,.16)');
  R(x0 - 11 * u, top + 40 * u, 22 * u, 3 * u, '#3a2616');
  if (p.apron && !p.back) R(x0 - 7 * u, top + 43 * u, 14 * u, 30 * u, '#d8ccb0');
  const up = excited > 1.15;
  if (up) {
    const w1 = Math.sin(t * 12 + p.phase) > 0 ? 3 * u : 0, w2 = Math.sin(t * 12 + p.phase + 1.3) > 0 ? 3 * u : 0;
    R(x0 - 17 * u, top - 6 * u - w1, 6 * u, 26 * u, p.cloth2); R(x0 - 17 * u, top - 11 * u - w1, 6 * u, 6 * u, p.skin);
    R(x0 + 11 * u, top - 6 * u - w2, 6 * u, 26 * u, p.cloth2); R(x0 + 11 * u, top - 11 * u - w2, 6 * u, 6 * u, p.skin);
  } else {
    R(x0 - 17 * u, top + 18 * u, 6 * u, 30 * u, p.cloth2); R(x0 - 17 * u, top + 47 * u, 6 * u, 6 * u, p.skin);
    R(x0 + 11 * u, top + 18 * u, 6 * u, 30 * u, p.cloth2); R(x0 + 11 * u, top + 47 * u, 6 * u, 6 * u, p.skin);
  }
  R(x0 - 3 * u, top + 13 * u, 6 * u, 5 * u, p.skin);
  if (p.hood) { R(x0 - 8 * u, top - 1 * u, 16 * u, 18 * u, p.cloth2); if (!p.back) R(x0 - 5 * u, top + 3 * u, 10 * u, 11 * u, p.skin); }
  else {
    const hc = p.back ? p.hair : p.skin;
    R(x0 - 6.5 * u, top + 2 * u, 13 * u, 11 * u, hc); R(x0 - 5 * u, top + 0.5 * u, 10 * u, 14 * u, hc);
    if (!p.back) {
      R(x0 - 6.5 * u, top + 0.5 * u, 13 * u, 4 * u, p.hair);
      if (p.female) { R(x0 - 7.5 * u, top + 2 * u, 3 * u, 15 * u, p.hair); R(x0 + 4.5 * u, top + 2 * u, 3 * u, 15 * u, p.hair); }
      const e = Math.max(1, 1.8 * u); R(x0 - 3.5 * u, top + 7 * u, e, e, '#1a110c'); R(x0 + 1.7 * u, top + 7 * u, e, e, '#1a110c');
      if (p.beard) R(x0 - 5 * u, top + 10 * u, 10 * u, 4.5 * u, p.hair);
      if (excited > 0.6) R(x0 - 1.5 * u, top + 11 * u, 3 * u, 2.5 * u, '#4a1414');
    } else if (p.female) R(x0 - 6.5 * u, top + 2 * u, 13 * u, 18 * u, p.hair);
  }
  if (p.hat) { R(x0 - 9 * u, top + 1 * u, 18 * u, 2.5 * u, p.hat); R(x0 - 6 * u, top - 4 * u, 12 * u, 5.5 * u, p.hat); }
}
/* ---------- Kampfszene ---------- */
const BEAT_DUR = { approach: 1.15, stoss: 0.78, hack: 0.85, doppel: 1.0, sprung: 0.98, flatter: 0.85, sporn: 0.78, aerial: 1.05 };
const IMPACT = { stoss: [0.5], hack: [0.56], doppel: [0.44, 0.68], sprung: [0.56], flatter: [0.52], sporn: [0.52], aerial: [0.54] };

class FightScene {
  constructor(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.layers = buildBackground();
    this.blood = makeCanvas(W, H); this.bctx = this.blood.getContext('2d');
    this.speed = 1; this.fn = (dt, t) => this.update(dt, t);
  }
  start(RA, RB) {
    this.engine = new CF.FightEngine(RA, RB);
    this.bctx.clearRect(0, 0, W, H);
    this.crowd = makeCrowd();
    this.parts = []; this.time = 0; this.shake = 0; this.beat = null; this.ended = false; this.cx = 160; this.cy = 140;
    this.endShot(); this.shotQueue = []; this.shotGap = 1.5; if (this.closeups == null) this.closeups = true;
    this.F = [RA, RB].map((R, i) => ({
      R, side: i, s: 1, sp: new Sprite(170, 140), x: i ? 280 : 40, y: 140, z: 0, f: i ? -1 : 1,
      pose: {}, react: null, shown: { health: CF.health(R), blood: R.blood },
      vp: Object.fromEntries(CF.PARTS.map(p => [p.key, { hp: R.body[p.key].hp, grade: R.body[p.key].grade }])),
      phase: Math.random() * 6, dead: 0, fleeing: false, roll: 0, frames: null, drawX: 0, drawY: 0
    }));
    $('#log').innerHTML = ''; $('#floaters').innerHTML = ''; $('#result').hidden = true;
    $('#nmL').innerHTML = esc(RA.name) + ' <span style="color:' + RA.quality.color + '">' + tierBadge(RA.quality.tier) + '</span>';
    $('#nmR').innerHTML = '<span style="color:' + RB.quality.color + '">' + tierBadge(RB.quality.tier) + '</span> ' + esc(RB.name);
    this.log('Tag ' + CF.CLOCK.day + ': ' + RA.name + ' (' + RA.height + ' cm) gegen ' + RB.name + ' (' + RB.height + ' cm).');
    for (const R of [RA, RB]) if (CF.health(R) < 99 || R.blood < 100) this.log(R.name + ' geht angeschlagen in den Kampf (Gesundheit ' + Math.round(CF.health(R)) + ' %, Blut ' + Math.round(R.blood) + ' %)' + (CF.fitForFight(R) ? '.' : ' – eigentlich nicht kampffähig!'), 'hit');
    this.hud();
    ticker.add(this.fn);
    return new Promise(res => { this.resolve = res; });
  }
  stop() { ticker.delete(this.fn); }
  log(text, cls) { const li = document.createElement('li'); li.textContent = text; if (cls) li.className = cls; const L = $('#log'); L.insertBefore(li, L.firstChild); while (L.children.length > 12) L.removeChild(L.lastChild); }
  floater() { /* Wie im Hauptspiel: Rückmeldung nur über Animation und Bericht, keine schwebenden Texte über dem Kampf */ }
  floaterOld(x, y, text, cls) { const d = document.createElement('div'); d.className = 'fl ' + (cls || ''); d.textContent = text; d.style.left = (x / W * 100) + '%'; d.style.top = (y / H * 100) + '%'; $('#floaters').appendChild(d); setTimeout(() => d.remove(), 1500); }
  hud() {
    for (const F of this.F) {
      const L = F.side === 0 ? 'L' : 'R', pct = clamp(F.shown.health, 0, 100);
      $('#hp' + L).style.width = pct + '%'; $('#hp' + L + 'i').style.width = pct + '%';
      const bleeding = Object.values(F.R.body).reduce((a, p) => a + p.bleed, 0) > 1.2 && !F.R.dead;
      const nW = Object.values(F.R.body).reduce((a, p) => a + p.marks.length, 0);
      $('#st' + L).innerHTML = (F.R.dead && this.ended ? '✝ tot' : 'Gesundheit ' + Math.round(F.shown.health) + ' % · Blut ' + Math.round(F.shown.blood) + ' %') + (nW ? ' · ' + nW + ' Wunden' : '') + (bleeding ? ' · <span class="bl">blutet</span>' : '');
      $('#parts' + L).innerHTML = CF.PARTS.map(p => {
        const v = F.vp[p.key], s = Math.min(3, v.grade >= 4 ? 3 : v.grade >= 3 ? 3 : v.grade >= 2 ? 2 : v.grade);
        const ws = F.R.body[p.key].marks.length;
        return '<span class="pc s' + s + '" title="' + CF.GRADE_LABEL[v.grade] + '">' + p.label + (v.grade ? ' · ' + CF.GRADE_LABEL[v.grade] : '') + '</span>';
      }).join('');
    }
  }
  readyPositions() {
    const sL = this.F[0].s, sR = this.F[1].s, gap = 36 * (sL + sR) / 2 + 14;
    return [this.cx - gap / 2, this.cx + gap / 2];
  }
  nextBeat() {
    let b = this.engine.nextBeat();
    if (!b) return null;
    if (b.type === 'attack') b.dur = BEAT_DUR[b.variant];
    else if (b.type === 'aerial') b.dur = BEAT_DUR.aerial;
    else if (b.type === 'approach') b.dur = BEAT_DUR.approach;
    else if (b.type === 'end') { b.dur = 0.01; b.endDur = b.reason === 'ko' ? 2.8 : b.reason === 'flucht' ? 2.4 : 2.2; }
    b.t = 0; b.fired = 0;
    b.start = this.F.map(F => ({ x: F.x, y: F.y }));
    if (b.type !== 'end') { this.cx = clamp(this.cx + rnd(-26, 26), 105, 215); this.cy = clamp(this.cy + rnd(-6, 6), 128, 150); }
    b.ready = this.readyPositions(); b.readyY = this.cy;
    b.impacts = b.type === 'attack' ? IMPACT[b.variant] : b.type === 'aerial' ? IMPACT.aerial : [];
    return b;
  }
  update(dt, T) {
    if (!this.cv.isConnected || $('#arena').hidden) return;
    // Nahaufnahme: der Kampf steht, bis sie vorbei ist (wie im Hauptspiel)
    if (this.shot) { if (!this.shot.step(dt)) this.endShot(); else { this.shot.paint(this.shotCtx, this.shotCv.width, this.shotCv.height); return; } }
    this.shotGap = Math.max(0, (this.shotGap || 0) - dt);
    if (!this.shot && this.shotQueue && this.shotQueue.length && (this.shotGap <= 0 || this.shotQueue.some(q => q.o.kind === 'death' || q.o.kind === 'collapse'))) this.startShot();
    if (this.shot) return;
    dt *= this.speed; this.time += dt;
    for (const f of this.F) f.s = CF.WORLD.scaleFor(f.R.height, CF.WORLD.roosterModelUnits, CM_PX, DEPTH(f.y));
    if (!this.beat) {
      this.beat = this.pauseNext ? { type: 'pause', dur: rnd(0.22, 0.42) / Math.max(1, this.speed * 0.6), t: 0, start: this.F.map(F => ({ x: F.x, y: F.y })), ready: this.readyPositions(), readyY: this.cy } : this.nextBeat();
      this.pauseNext = false;
    }
    const b = this.beat;
    if (b && !this.ended) {
      b.t += dt / b.dur; const t = Math.min(1, b.t);
      this.animate(b, t);
      while (b.impacts && b.fired < b.impacts.length && t >= b.impacts[b.fired]) { this.impact(b, b.fired); b.fired++; }
      if (b.t >= 1) this.finishBeat(b);
    } else if (this.ended) this.animateEnd(this.ended, dt);
    this.crowd.excite = Math.max(0, this.crowd.excite - dt * 0.9);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.5);
    this.bleedDrips(dt);
    this.render(dt);
  }
  basePose(F) {
    const t = this.time + F.phase;
    return { lean: 0.2, hackle: 0.75, crouch: 0.15, bob: Math.sin(t * 7) * 0.35, tailSwish: Math.sin(t * 2.2) * 0.2, blink: ((t * 1000) % 2900) < 100, glow: F.R.quality.tier >= 7 };
  }
  stepLegs(P, k) { P.stepN = Math.sin(k) * 2; P.stepF = -Math.sin(k) * 2; }
  animate(b, t) {
    const F = this.F;
    for (const f of F) { f.pose = this.basePose(f); f.z = 0; f.offX = 0; f.offY = 0; }
    if (b.type === 'approach') {
      const k = ease(t);
      for (const f of F) { f.x = lerp(b.start[f.side].x, b.ready[f.side], k); f.y = lerp(b.start[f.side].y, b.readyY, k); f.z = Math.abs(Math.sin(t * 14)) * 2 * (1 - k); this.stepLegs(f.pose, t * 26); f.pose.hackle = 0.4 + t; f.pose.lean = 0.35 * k; f.pose.headY = 1.5 * k; }
      if (t > 0.75) for (const f of F) { f.pose.headX = Math.sin((t - 0.75) * 30) * 1.2; }
    } else if (b.type === 'pause') {
      const k = ease(t);
      for (const f of F) { f.x = lerp(b.start[f.side].x, b.ready[f.side], k); f.y = lerp(b.start[f.side].y, b.readyY + (f.side ? 1 : -1), k); this.stepLegs(f.pose, t * 18); f.pose.lean = 0.3; f.pose.headY = 1.4; f.pose.headX = Math.sin(this.time * 9 + f.side) * 0.8; }
    } else if (b.type === 'attack') this.animAttack(b, t);
    else if (b.type === 'aerial') this.animAerial(b, t);
    else if (b.type === 'end') this.animEndBeat(b, t);
    for (const f of F) this.applyReact(f);
  }
  animAttack(b, t) {
    const a = this.F[b.att], d = this.F[1 - b.att], fa = a.f;
    const ready = b.ready, sa = a.s, sd = d.s;
    // Verteidiger: hält Stellung, gleitet zur Ruheposition
    d.x = lerp(b.start[d.side].x, ready[d.side], ease(t)); d.y = lerp(b.start[d.side].y, b.readyY, ease(t));
    d.pose.lean = 0.25; d.pose.hackle = 1;
    const P = a.pose; a.y = lerp(b.start[a.side].y, b.readyY, ease(t));
    const v = b.variant;
    const strikeTo = (reach) => d.x - fa * reach;
    if (v === 'stoss' || v === 'hack' || v === 'doppel') {
      const reach = 15 * sa + 6 * sd, sx = strikeTo(reach);
      const appEnd = v === 'doppel' ? 0.32 : 0.36;
      const p1 = seg(t, 0, appEnd);
      if (t < appEnd) { a.x = lerp(b.start[a.side].x, sx, ease(p1)); this.stepLegs(P, p1 * 18); a.z = Math.abs(Math.sin(p1 * Math.PI * 2)) * 1.5; P.lean = 0.25 - 0.3 * p1; P.headX = -2 * p1; }
      else if (t < 0.76) {
        a.x = sx;
        const strikes = v === 'doppel' ? [[0.36, 0.44, 0.52], [0.58, 0.66, 0.74]] : v === 'hack' ? [[0.38, 0.56, 0.66]] : [[0.38, 0.5, 0.62]];
        P.lean = -0.05; P.headX = -2; P.hackle = 1.2;
        if (v === 'hack') { const up = seg(t, 0.36, 0.48); P.lean = -0.35 * up; P.headY = -3 * up; P.crouch = -0.3 * up; }
        for (const [s0, s1, s2] of strikes) {
          if (t >= s0 && t < s2) {
            const k = t < s1 ? ease(seg(t, s0, s1)) : 1 - ease(seg(t, s1, s2)) * 0.7;
            if (v === 'hack') { P.lean = lerp(-0.35, 0.8, k); P.headX = lerp(-1, 4.5, k); P.headY = lerp(-3, 6, k); }
            else { P.lean = lerp(-0.05, 0.55, k); P.headX = lerp(-2, 6, k); P.headY = lerp(0, 2.5, k); }
            P.beakOpen = k * 0.9;
          }
        }
      } else {
        const k = ease(seg(t, 0.76, 1)); a.x = lerp(sx, ready[a.side], k); this.stepLegs(P, k * 12); P.lean = 0.2;
      }
    } else if (v === 'sprung') {
      const reach = 9 * sa + 7 * sd, sx = strikeTo(reach);
      if (t < 0.3) { const k = ease(seg(t, 0, 0.3)); a.x = lerp(b.start[a.side].x, sx - fa * 6, k); this.stepLegs(P, k * 14); }
      else if (t < 0.4) { a.x = sx - fa * 6; P.crouch = 0.7; P.wing = 0.35; P.hackle = 1.2; }
      else if (t < 0.76) {
        const k = seg(t, 0.4, 0.76); a.x = lerp(sx - fa * 6, sx, ease(k)); a.z = Math.sin(k * Math.PI) * 17 * sa * this.engine.mods(this.engine.F[a.side]).jump;
        P.wing = 1.1; P.flap = this.time * 34; P.lean = -0.3; P.kick = Math.sin(seg(t, 0.44, 0.7) * Math.PI); P.hackle = 1.3;
      } else { const k = ease(seg(t, 0.76, 1)); a.x = lerp(sx, ready[a.side], k); P.crouch = 0.4 * (1 - k); P.wing = 0.3 * (1 - k); if (b._landed !== true) { b._landed = true; this.dust(a.x, a.y, 6); } }
    } else if (v === 'flatter') {
      const reach = 10 * sa + 7 * sd, sx = strikeTo(reach);
      if (t < 0.32) { const k = ease(seg(t, 0, 0.32)); a.x = lerp(b.start[a.side].x, sx, k); this.stepLegs(P, k * 16); P.wing = 0.4 * k; P.flap = this.time * 30; }
      else if (t < 0.72) { const k = seg(t, 0.32, 0.72); a.x = sx + fa * Math.sin(k * Math.PI) * 2; a.z = Math.sin(k * Math.PI) * 6; P.wing = 0.8; P.flap = this.time * 40; P.kick = Math.abs(Math.sin(k * Math.PI * 3)); P.lean = -0.1; P.hackle = 1.2; }
      else { const k = ease(seg(t, 0.72, 1)); a.x = lerp(sx, ready[a.side], k); P.wing = 0.5 * (1 - k); P.flap = this.time * 25; }
    } else if (v === 'sporn') {
      const reach = 10 * sa + 6 * sd, sx = strikeTo(reach), side = a.side ? 1 : -1;
      if (t < 0.4) { const k = ease(seg(t, 0, 0.4)); a.x = lerp(b.start[a.side].x, sx, k); a.y += side * 6 * Math.sin(k * Math.PI); this.stepLegs(P, k * 16); }
      else if (t < 0.68) { const k = seg(t, 0.4, 0.68); a.x = sx; a.z = Math.sin(k * Math.PI) * 6; P.kick = Math.sin(k * Math.PI); P.wing = 0.5; P.flap = this.time * 26; P.lean = -0.15; }
      else { const k = ease(seg(t, 0.68, 1)); a.x = lerp(sx, ready[a.side], k); this.stepLegs(P, k * 10); }
    }
  }
  animAerial(b, t) {
    const [L, Rr] = this.F, mid = (b.start[0].x + b.start[1].x) / 2;
    for (const f of this.F) {
      const P = f.pose, dir = f.side ? 1 : -1;
      f.y = lerp(b.start[f.side].y, b.readyY, ease(t));
      if (t < 0.3) { const k = ease(seg(t, 0, 0.3)); f.x = lerp(b.start[f.side].x, mid + dir * 16 * f.s, k); P.crouch = 0.6 * k; P.wing = 0.3 * k; }
      else if (t < 0.8) {
        const k = seg(t, 0.3, 0.8); f.x = mid + dir * lerp(16, 7, Math.sin(k * Math.PI)) * f.s; f.z = Math.sin(k * Math.PI) * 20 * f.s;
        P.wing = 1.15; P.flap = this.time * 36 + f.side; P.kick = Math.sin(seg(t, 0.38, 0.72) * Math.PI); P.lean = -0.3; P.hackle = 1.3;
      } else { const k = ease(seg(t, 0.8, 1)); f.x = lerp(mid + dir * 16 * f.s, b.ready[f.side], k); P.wing = 0.4 * (1 - k); if (!b['_l' + f.side]) { b['_l' + f.side] = 1; this.dust(f.x, f.y, 7); } }
    }
    void L; void Rr;
  }
  applyReact(f) {
    const r = f.react; if (!r) return;
    const k = (this.time - r.t0) / 0.4;
    if (k >= 1) { f.react = null; return; }
    const s = Math.sin(k * Math.PI), away = -f.f;
    if (r.hit) {
      f.offX = away * (r.crit ? 7 : 4) * s; f.pose.lean = -0.45 * s; f.pose.headX = -2 * s; f.pose.wing = Math.max(f.pose.wing || 0, 0.55 * s); f.pose.flap = this.time * 30; f.pose.blink = true;
      if (r.stun) f.pose.headY = 2 * s;
    } else {
      f.offX = away * 7 * s; f.z = Math.max(f.z, 5 * s); f.offY = r.dir * 4 * s; f.pose.lean = -0.25 * s; f.pose.wing = Math.max(f.pose.wing || 0, 0.4 * s); f.pose.flap = this.time * 30;
    }
  }
  worldOfPart(F, part, u, v) {
    const fr = F.frames && F.frames[part]; if (!fr) return { x: F.x, y: F.y - 15 * F.s };
    const c = Math.cos(fr.rot), s = Math.sin(fr.rot);
    const lx = fr.cx + u * fr.rx * c - v * fr.ry * s, ly = fr.cy + u * fr.rx * s + v * fr.ry * c;
    const q = F.sp.painter.fwd(lx, ly); return { x: F.drawX + q[0], y: F.drawY + q[1] };
  }
  impact(b, idx) {
    const list = b.type === 'aerial' ? b.events : [b.events[idx]];
    for (const { att, ev } of list) {
      if (!ev) continue;
      const A = this.F[att], D = this.F[1 - att], mvLabel = ev.variantLabel || (ev.move === 'peck' ? 'Schnabelstoß' : 'Klauenhieb');
      if (!ev.hit) {
        D.react = { t0: this.time, hit: false, dir: Math.random() < 0.5 ? -1 : 1 };
        this.floater(D.x, D.y - 34 * D.s, ev.dodge === 'ausweichen' ? 'Ausgewichen!' : 'Daneben!', 'miss');
        this.log(A.R.name + ': ' + mvLabel + ' – ' + (ev.dodge === 'ausweichen' ? D.R.name + ' weicht aus.' : 'verfehlt.'));
        this.crowd.excite += 0.2; this.dust(D.x, D.y, 3);
        continue;
      }
      const mk = Object.assign({}, ev.mark, { time: now() }); D.R.body[ev.part].marks.push(mk);
      if (ev.severity >= 2 || ev.crit || ev.killed) this.queueShot(Object.assign({ R: D.R, part: ev.part, mark: mk, kind: ev.move === 'peck' ? 'peck' : 'claw', attacker: A.R, line1: A.R.name + ' (' + mvLabel + ') fügt ' + D.R.name + ' zu:', title: ev.woundText }, CF.RoosterShot.describeHit(D.R, ev.part)), ev.dmg + (ev.crit ? 8 : 0));
      if (ev.scar) D.R.appearance.scarMarks.push({ part: ev.part, type: ev.mark.type, u: ev.mark.u, v: ev.mark.v, ang: ev.mark.ang, rake: ev.mark.rake, severity: ev.severity, origin: 'kampf' });
      D.shown = { health: ev.after.health, blood: ev.after.blood }; D.vp[ev.part] = { hp: ev.after.partHp, grade: ev.after.grade };
      D.react = { t0: this.time, hit: true, crit: ev.crit, stun: ev.stun };
      const p = this.worldOfPart(D, ev.part, ev.mark.u, ev.mark.v);
      this.spray(p.x, p.y, A.f, ev.severity + (ev.crit ? 2 : 0), D);
      this.feathers(p.x, p.y, D, 1 + ev.severity + (ev.move === 'claw' ? 2 : 0));
      this.parts.push({ kind: 'flash', x: p.x, y: p.y, age: 0, life: 0.12 });
      this.floater(p.x, p.y - 8, '-' + ev.dmg, ev.crit ? 'crit' : 'dmg');
      if (ev.crit) { this.floater(p.x, p.y - 20, 'VOLLTREFFER!', 'crit'); this.shake = Math.max(this.shake, 1); }
      else if (ev.move === 'claw') this.shake = Math.max(this.shake, 0.45);
      this.log(A.R.name + ': ' + mvLabel + ' trifft ' + ev.partLabel + ': ' + ev.woundText + (ev.crit ? ' – Volltreffer!' : '') + (ev.scar ? ' – wird eine Narbe hinterlassen' : '') + (ev.chronic ? ' – dauerhafte Einschränkung' : '') + (ev.stun ? ' ' + D.R.name + ' taumelt!' : ''), ev.crit ? 'crit' : 'hit');
      if (ev.killed) { this.log(D.R.name + ' ist tot.', 'crit'); this.shake = 1.2; this.spray(p.x, p.y, A.f, 7, D); }
      this.crowd.excite += ev.crit ? 1.2 : 0.6; this.crowd.cheerFor = att;
    }
    this.hud();
  }
  finishBeat(b) {
    if (b.type === 'end') { this.beginEnd(b); this.beat = null; return; }
    if (b.bleed) b.bleed.forEach((d, i) => { if (d >= 2) { const F = this.F[i]; this.floater(F.x, F.y - 30 * F.s, '−' + Math.round(d) + ' Blut', 'dmg'); } });
    if (b.after) b.after.forEach((a, i) => { this.F[i].shown = a; });
    if (b.type === 'approach') this.log('Die Hähne umkreisen sich mit gesträubtem Halsgefieder …');
    this.hud();
    this.beat = null; this.pauseNext = b.type !== 'approach' && b.type !== 'pause';
  }
  animEndBeat() { /* Endsequenz läuft in animateEnd */ }
  beginEnd(b) {
    const W_ = this.F[b.winner], L_ = this.F[b.loser];
    this.ended = { b, t: 0, W: W_, L: L_ };
    const why = b.reason === 'tot' ? L_.R.name + ' ist tot. ' + (L_.R.cause || '') : b.reason === 'ko' ? L_.R.name + ' bricht zusammen – K.O.!' : b.reason === 'flucht' ? L_.R.name + ' ergreift die Flucht!' : 'Zeit! Entscheidung nach Punkten.';
    this.log(why, 'crit');
    this.crowd.excite += 2.5; this.crowd.cheerFor = b.winner;
    if (b.reason === 'tot') this.queueShot({ R: L_.R, kind: 'death', part: 'head', dramatic: L_.R.quality.tier >= 7, line1: W_.R.name + ' tötet ' + L_.R.name, title: '† ' + L_.R.name + ' fällt', line3: L_.R.cause || '', color: '#f29b83', attacker: W_.R }, 99);
    else if (b.reason === 'ko') this.queueShot({ R: L_.R, kind: 'collapse', part: 'breast', line1: W_.R.name + ' streckt ' + L_.R.name + ' nieder', title: 'Kampfunfähig', line3: 'Gesundheit ' + Math.round(CF.health(L_.R)) + ' % · Blut ' + Math.round(L_.R.blood) + ' %', color: '#f29b83' }, 50);
  }
  queueShot(o, prio) { if (!this.closeups || !CF.RoosterShot) return; (this.shotQueue ??= []).push({ o, prio }); if (this.shotQueue.length > 6) this.shotQueue.shift(); }
  startShot() {
    const best = this.shotQueue.sort((a, b) => b.prio - a.prio)[0]; this.shotQueue = []; if (!best) return;
    const wrap = document.createElement('div'); wrap.className = 'shotwrap'; wrap.innerHTML = '<canvas width="660" height="420"></canvas><span>Antippen überspringt</span>';
    $('.stage').appendChild(wrap); wrap.onclick = () => this.shot && this.shot.skip();
    this.shotCv = wrap.firstChild; this.shotCtx = this.shotCv.getContext('2d'); this.shotWrap = wrap;
    this.shot = CF.RoosterShot.create(Object.assign({ scene: 'dorf', textScale: 1.25 }, best.o));
    this.shotGap = best.o.kind === 'death' ? 1 : 4;
  }
  endShot() { this.shotWrap?.remove(); this.shot = null; this.shotWrap = null; }
  animateEnd(E, dt) {
    E.t += dt; const t = E.t, { W: Wn, L: Ls, b } = E;
    for (const f of this.F) { f.pose = this.basePose(f); f.offX = 0; f.offY = 0; f.z = 0; }
    if (b.reason === 'ko' || b.reason === 'tot') {
      const k = ease(seg(t, 0, 0.45));
      Ls.roll = Ls.f * 1.45 * k; Ls.pose.dead = k > 0.6; Ls.pose.blink = true; Ls.pose.crouch = 0.6 * k; Ls.pose.hackle = 0; Ls.pose.wing = 0.25 * k;
      if (t > 0.45 && t < 2.6) { const r = 3 + seg(t, 0.45, 2.6) * 9; const bc = this.bctx; bc.fillStyle = '#6a080c'; bc.beginPath(); bc.ellipse(Math.round(Ls.x + Ls.f * 4), Math.round(Ls.y + 1), r, r * 0.38, 0, 0, 7); bc.fill(); }
    } else if (b.reason === 'flucht') {
      Ls.f = Ls.side === 0 ? -1 : 1;
      Ls.x += (Ls.side === 0 ? -1 : 1) * dt * 110 * (t > 0.2 ? 1 : 0); Ls.z = Math.abs(Math.sin(t * 16)) * 3; Ls.pose.wing = 0.7; Ls.pose.flap = this.time * 40; Ls.pose.lean = 0.3; this.stepLegs(Ls.pose, t * 30);
    } else { Ls.pose.lean = 0.5; Ls.pose.hackle = 0; Ls.pose.crouch = 0.4; }
    // Sieger kräht
    if (t > 0.6 && t < 2.2) { const k = Math.sin(seg(t, 0.6, 2.2) * Math.PI); Wn.pose.lean = -0.45 * k; Wn.pose.headY = -2.5 * k; Wn.pose.beakOpen = k; Wn.pose.wing = 0.9 * k; Wn.pose.flap = this.time * 18; Wn.pose.hackle = 1.2; }
    if (!E.crowed && t > 0.9) { E.crowed = true; this.floater(Wn.x, Wn.y - 46 * Wn.s, 'KIKERIKI!', 'crow'); }
    if (t > b.endDur && !E.shown) { E.shown = true; this.showResult(b); }
  }
  showResult(b) {
    const W_ = this.F[b.winner].R, L_ = this.F[b.loser].R;
    const reason = b.reason === 'tot' ? '– ' + esc(L_.name) + ' ist tot ✝' : b.reason === 'ko' ? 'durch K.O.' : b.reason === 'flucht' ? '– der Gegner ist geflohen' : 'nach Punkten';
    const r = $('#result'); r.hidden = false;
    const learn = this.engine.F.map(f => '<div class="lrn"><b>' + esc(f.R.name) + '</b> lernt: ' + esc(learnText(f.learning)) + '</div>').join('');
    r.innerHTML = '<div class="rbox"><h2>' + esc(W_.name) + ' siegt</h2><p>' + reason + ' · ' + this.engine.exchange + ' Schlagabtausche<br>' +
      'Gesundheit: ' + esc(W_.name) + ' ' + Math.round(CF.health(W_)) + ' % · ' + esc(L_.name) + ' ' + (L_.dead ? '✝' : Math.round(CF.health(L_)) + ' %') + '<br>Erste Hilfe: alle Blutungen verbunden.</p>' + learn +
      '<div class="rb"><button id="rbLab" class="gold">Zurück ins Labor (Zustand &amp; Heilung)</button>' + (W_.dead || L_.dead ? '' : '<button id="rbRematch">Revanche (verletzt)</button>') + '<button id="rbNew" class="primary">Neue Hähne & Kampf</button></div></div>';
    if ($('#rbRematch')) $('#rbRematch').onclick = () => { const old = this.resolve; this.stop(); this.start(this.F[0].R, this.F[1].R).then(old); };
    $('#rbNew').onclick = async () => { this.stop(); $('#arena').hidden = true; $('#lab').hidden = false; state.slots = [CF.createRooster(), CF.createRooster()]; renderSlot(0); renderSlot(1); const res = this.resolve; await runFightFlow(true); res && res(); };
    $('#rbLab').onclick = () => { this.backToLab(); };
  }
  backToLab() { this.endShot(); this.engine && this.engine.writeBack(); this.stop(); $('#arena').hidden = true; $('#lab').hidden = false; renderSlot(0); renderSlot(1); this.resolve && this.resolve(); }
  /* ---------- Partikel ---------- */
  spray(x, y, dir, sev, D) {
    const n = 4 + sev * 4;
    for (let i = 0; i < n; i++) this.parts.push({ kind: 'blood', x, y, z: 0, vx: dir * rnd(15, 70) + rnd(-15, 15), vy: rnd(-70, -10), ground: D.y + rnd(-4, 5), age: 0, life: 3, big: Math.random() < 0.3 });
  }
  feathers(x, y, D, n) {
    const C = D.R.appearance.colors, cols = [C.hackle, C.body, C.breast, C.wing];
    for (let i = 0; i < n; i++) this.parts.push({ kind: 'feather', x: x + rnd(-3, 3), y: y + rnd(-3, 3), vx: rnd(-25, 25), vy: rnd(-40, -10), ground: D.y + rnd(-5, 5), col: cols[(Math.random() * 4) | 0], age: 0, life: 6, ph: Math.random() * 6 });
  }
  dust(x, y, n) { for (let i = 0; i < n; i++) this.parts.push({ kind: 'dust', x: x + rnd(-5, 5), y: y + rnd(-1, 1), vx: rnd(-18, 18), vy: rnd(-6, -1), age: 0, life: rnd(0.4, 0.8), r: rnd(1, 2.5) }); }
  bleedDrips(dt) {
    for (const F of this.F) {
      const marks = Object.values(F.R.body).flatMap(p => p.marks), b = Object.values(F.R.body).reduce((a, p) => a + p.bleed, 0) * 0.5;
      if (b < 0.5 || marks.length === 0 || F.R.dead && !this.ended) continue;
      if (Math.random() < b * dt * 1.6) {
        const w = marks[(Math.random() * marks.length) | 0];
        const p = this.worldOfPart(F, w.part, w.u, w.v);
        this.parts.push({ kind: 'blood', x: p.x, y: p.y, vx: rnd(-6, 6), vy: 0, ground: F.y + rnd(-2, 3), age: 0, life: 3 });
      }
    }
  }
  /* ---------- Rendern ---------- */
  render(dt) {
    const ctx = this.ctx, t = this.time;
    ctx.save();
    if (this.shake > 0.05) ctx.translate(Math.round(rnd(-3, 3) * this.shake), Math.round(rnd(-2, 2) * this.shake));
    ctx.drawImage(this.layers.bg, 0, 0);
    ctx.drawImage(this.blood, 0, 0);
    const ex = clamp(this.crowd.excite, 0, 2);
    for (const p of this.crowd.people) if (p.footY < RING.cy) drawHuman(ctx, p, t, ex);
    ctx.drawImage(this.layers.back, 0, 0);
    // Hähne (nach Tiefe sortiert)
    const order = [...this.F].sort((a, b) => a.y - b.y);
    for (const F of order) {
      const x = F.x + (F.offX || 0), y = F.y + (F.offY || 0), z = F.z || 0;
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      const sw = Math.round(20 * F.s * clamp(1 - z / 40, 0.5, 1)); ctx.fillRect(Math.round(x - sw / 2), Math.round(y - 1), sw, 2); ctx.fillRect(Math.round(x - sw / 2 + 2), Math.round(y), sw - 4, 1);
      const P = F.sp.begin();
      const dead = this.ended && (this.ended.b.reason === 'ko' || this.ended.b.reason === 'tot') && this.ended.L === F;
      P.setT(85, 125 + (dead ? Math.round(6 * F.s * Math.abs(F.roll) / 1.45) : 0), F.s, F.f, F.roll || 0, 0, -14);
      F.frames = CF.drawRoosterSide(P, F.R, F.pose, now());
      F.drawX = Math.round(x) - 85; F.drawY = Math.round(y - z) - 125;
      ctx.drawImage(F.sp.commit(), F.drawX, F.drawY);
    }
    // Partikel
    const bc = this.bctx;
    for (const p of this.parts) {
      p.age += dt;
      if (p.kind === 'blood') {
        if (!p.landed) { p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y >= p.ground && p.vy > 0) { p.landed = true; bc.fillStyle = Math.random() < 0.5 ? '#7a0a0e' : '#9a1016'; bc.fillRect(Math.round(p.x), Math.round(p.ground), p.big ? 2 : 1, 1); p.age = p.life; } }
        ctx.fillStyle = '#c0161e'; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.big ? 2 : 1, p.big ? 2 : 1);
      } else if (p.kind === 'feather') {
        if (!p.landed) { p.vy = Math.min(p.vy + 60 * dt, 14); p.vx = p.vx * 0.97 + Math.sin(p.age * 5 + p.ph) * 0.8; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y >= p.ground) { p.landed = true; const fx = Math.round(p.x), fy = Math.round(p.ground), kk = (fx + fy) % 3; bc.fillStyle = 'rgba(0,0,0,.25)'; bc.fillRect(fx, fy + 1, 4, 1); bc.fillStyle = p.col; if (kk === 0) { bc.fillRect(fx, fy, 4, 1); bc.fillRect(fx + 3, fy - 1, 1, 1); } else if (kk === 1) { bc.fillRect(fx, fy - 1, 2, 1); bc.fillRect(fx + 1, fy, 3, 1); } else { bc.fillRect(fx, fy, 3, 1); bc.fillRect(fx + 1, fy - 1, 2, 1); } bc.fillStyle = 'rgba(255,255,255,.35)'; bc.fillRect(fx + 1, fy, 1, 1); p.age = p.life; } }
        ctx.fillStyle = p.col; const tilt = Math.sin(p.age * 6 + p.ph) > 0;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 3, 1); ctx.fillRect(Math.round(p.x) + (tilt ? 2 : 0), Math.round(p.y) - 1, 1, 1);
      } else if (p.kind === 'dust') {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; const a = 1 - p.age / p.life; ctx.fillStyle = 'rgba(200,180,140,' + (0.6 * a) + ')'; const r = Math.round(p.r + p.age * 5); ctx.fillRect(Math.round(p.x - r), Math.round(p.y - r / 2), r * 2, r);
      } else if (p.kind === 'flash') {
        ctx.fillStyle = '#fff6e0'; const X = Math.round(p.x), Y = Math.round(p.y); ctx.fillRect(X - 3, Y, 7, 1); ctx.fillRect(X, Y - 3, 1, 7); ctx.fillRect(X - 1, Y - 1, 3, 3);
      }
    }
    this.parts = this.parts.filter(p => p.age < p.life);
    ctx.drawImage(this.layers.front, 0, 0);
    for (const p of this.crowd.people) if (p.footY >= RING.cy) drawHuman(ctx, p, t, ex);
    for (const p of this.crowd.frontRow) drawHuman(ctx, p, t, ex * 0.8);
    ctx.restore();
  }
}


window.RoosterCloseup={Sprite,CloseupScene,ANIM_KIND,FightScene,setRoot:r=>{VROOT=r;},setBubble:f=>{bubbleFn=f;}};
})();
