/* =====================================================================
   HAHN-NAHAUFNAHMEN BEI VERLETZUNGEN – im Stil von injury-shots.js des Hauptspiels:
   kleines Pixelbild (160 × 100), vergrößert; Zoom auf die getroffene Stelle, der Angreifer
   kommt ins Bild, im Trefferzeitpunkt Blitz, Blut, Federn; unten die Infotafel.
   Tod und Zusammenbruch: Großaufnahme von vorn, Augen schließen sich, der Kopf sinkt.
   Reine Darstellung: liest nur, ändert keinen Zustand.
   ===================================================================== */
(function (root) {
'use strict';
const CF = root.CF; if (!CF) return;
const FW = 160, FH = 100, HIT = 0.55, LEN = 2.3;
const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), ease = v => { v = cl(v); return v * v * (3 - 2 * v); };
const rnd = (a, b) => a + Math.random() * (b - a);
const ZOOM = { head: 5.2, comb: 5.6, neck: 4.4, breast: 3.6, body: 3.4, wing: 3.5, legs: 3.8 };
const GRADE = ['Kratzer', 'Leicht', 'Mittel', 'Schwer', 'Kritisch', 'Verloren'];

function sprite(w, h) {
  const grid = new CF.PixGrid(w, h), painter = new CF.Painter(grid), cv = document.createElement('canvas');
  cv.width = w; cv.height = h; const c = cv.getContext('2d');
  return { grid, painter, cv, c, img: c.createImageData(w, h), view: new Uint8ClampedArray(grid.d.buffer), commit() { this.img.data.set(this.view); this.c.putImageData(this.img, 0, 0); return this.cv; } };
}
const _probe = { g: null, p: null };
function framesOf(R, pose) { // Teilrahmen in Modelleinheiten (unabhängig von Lage und Maßstab)
  if (!_probe.g) { _probe.g = new CF.PixGrid(2, 2); _probe.p = new CF.Painter(_probe.g); }
  _probe.g.clear(); _probe.p.setT(-9999, -9999, 1, 1);
  return CF.drawRoosterSide(_probe.p, R, pose || {}, 0);
}
// Hahn ohne die gerade entstehende Wunde zeichnen (sie erscheint erst im Trefferzeitpunkt)
function withoutMark(R, mark, fn) {
  if (!mark) return fn();
  const list = R.body[mark.part]?.marks, i = list ? list.indexOf(mark) : -1;
  if (i < 0) return fn();
  list.splice(i, 1); try { return fn(); } finally { list.splice(i, 0, mark); }
}
const portraits = new WeakMap();
function portrait(R) {
  let c = portraits.get(R); if (c) return c;
  const s = sprite(72, 90); s.painter.setT(36, 182, 4.6 * Math.min(1.25, 58 / R.height + 0.2), 1);
  CF.drawRoosterFront(s.painter, R, { yaw: 0.28, hackle: R.quality.tier >= 6 ? 0.5 : 0 }, 0);
  c = document.createElement('canvas'); c.width = 72; c.height = 90; const g = c.getContext('2d');
  g.fillStyle = '#3b3024'; g.fillRect(0, 0, 72, 90); g.drawImage(s.commit(), 0, 0);
  portraits.set(R, c); return c;
}

/**
 * o: { R, part, mark, kind: 'peck'|'claw'|'blade'|'blunt'|'paw'|'bite'|'death'|'collapse',
 *      attacker (Hahn-Objekt, falls Hahn), attackerName, title, line1, line3, color, scene: 'arena'|'dorf', dramatic }
 */
function create(o) {
  const shot = {
    o: Object.assign({}, o), t: o.from != null ? o.from : 0.25, done: false, hit: false, parts: [], seed: Math.random() * 100,
    len: o.len || (o.kind === 'death' ? (o.dramatic ? 4.2 : 3.2) : LEN),
    step(dt) { this.t += dt; if (!this.hit && this.t >= HIT) { this.hit = true; burst(this); } stepParts(this, dt); if (this.t >= this.len) this.done = true; return !this.done; },
    skip() { if (this.t < HIT) this.t = HIT; else this.done = true; },
    paint(g, w, h) { paint(g, w, h, this); }
  };
  shot.buf = document.createElement('canvas'); shot.buf.width = FW; shot.buf.height = FH; shot.q = shot.buf.getContext('2d');
  shot.sp = sprite(FW, FH); shot.ap = sprite(FW, FH);
  return shot;
}

/* ---------- Partikel im Bild: Blut, Federn, Tropfen am Boden ---------- */
function burst(s) {
  const o = s.o, C = o.R.appearance.colors, cols = [C.hackle, C.body, C.breast, C.wing, C.tail];
  const wx = s.wx ?? FW / 2, wy = s.wy ?? FH / 2, dir = -1; // Blut spritzt vom Angreifer (rechts) weg
  if (o.kind === 'death' || o.kind === 'collapse') { for (let i = 0; i < 10; i++) s.parts.push({ k: 'f', x: rnd(30, 130), y: rnd(-10, 20), vx: rnd(-6, 6), vy: rnd(6, 16), c: cols[i % cols.length], a: rnd(0, 6), life: 9 }); return; }
  const sev = o.mark?.severity || 2, n = 10 + sev * 9 + (o.kind === 'blade' || o.kind === 'bite' ? 10 : 0);
  for (let i = 0; i < n; i++) { const a = Math.PI + rnd(-0.9, 0.9) + (dir < 0 ? 0 : Math.PI), v = rnd(25, 90); s.parts.push({ k: 'b', x: wx, y: wy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - rnd(10, 40), life: 3, big: Math.random() < 0.3 }); }
  const nf = o.kind === 'claw' || o.kind === 'paw' || o.kind === 'bite' ? 10 : o.kind === 'blade' ? 8 : 5;
  for (let i = 0; i < nf; i++) { const a = rnd(0, Math.PI * 2), v = rnd(15, 55); s.parts.push({ k: 'f', x: wx, y: wy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, c: cols[i % cols.length], a: rnd(0, 6), life: 9 }); }
  s.flash = 1; s.shake = 1;
}
function stepParts(s, dt) {
  for (const p of s.parts) {
    p.life -= dt;
    if (p.k === 'b') { if (!p.land) { p.vy += 220 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y >= FH - 6 + (p.x % 3)) { p.land = true; p.y = FH - 6 + (p.x % 3); } } }
    else { if (!p.land) { p.vy = Math.min(p.vy + 40 * dt, 12); p.vx *= 0.97; p.x += (p.vx + Math.sin(p.a + s.t * 5) * 8) * dt; p.y += p.vy * dt; p.a += dt * 3; if (p.y >= FH - 5) { p.land = true; p.y = FH - 5; } } }
  }
  if (s.flash) s.flash = Math.max(0, s.flash - dt * 9);
  if (s.shake) s.shake = Math.max(0, s.shake - dt * 3);
}
function drawParts(q, s) {
  for (const p of s.parts) {
    if (p.k === 'b') { q.fillStyle = p.land ? '#6e0c10' : '#b8141c'; q.fillRect(Math.round(p.x), Math.round(p.y), p.big || p.land ? 2 : 1, p.land ? 1 : p.big ? 2 : 1); }
    else { const x = Math.round(p.x), y = Math.round(p.y), t = Math.sin(p.a) > 0; q.fillStyle = p.c; q.fillRect(x, y, 4, 1); q.fillRect(x + (t ? 3 : 0), y - 1, 1, 1); q.fillStyle = 'rgba(255,255,255,.35)'; q.fillRect(x + 1, y, 2, 1); }
  }
}

/* ---------- Hintergrund ---------- */
function backdrop(q, s) {
  const arena = s.o.scene !== 'dorf';
  const rows = arena ? ['#8f7148', '#9a7b4f', '#a78657', '#b08f5e', '#b8976a'] : ['#6a5b48', '#7a6a52', '#8c7a5c', '#a08a62', '#b0976a'];
  for (let y = 0; y < FH; y++) { q.fillStyle = rows[Math.min(rows.length - 1, Math.floor(y / FH * rows.length))]; q.fillRect(0, y, FW, 1); }
  q.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 70; i++) { const x = (i * 37 + 11) % FW, y = (i * 53 + 7) % FH; q.fillRect(x, y, 2, 1); }
  q.fillStyle = 'rgba(0,0,0,.22)'; q.fillRect(0, FH - 7, FW, 7);
}

/* ---------- Angreifer im Bild ---------- */
function attacker(q, s, k, wx, wy) {
  const o = s.o, kind = o.kind, t = s.t;
  const strike = ease(k < 0 ? (t - (HIT - 0.32)) / 0.32 : 1 - k / 0.5), // fährt hinein, nach dem Treffer zurück
    off = (1 - strike);
  if (kind === 'peck' && o.attacker) { // Kopf des Angreifers mit Schnabel, von rechts, gleiche Vergrößerung
    const A = o.attacker, z = s.z, ap = s.ap; ap.grid.clear();
    const fr = framesOf(A, { lean: 0.5, headX: 5, headY: 2, beakOpen: 1, hackle: 1.2 });
    const beakX = fr.head.cx + 6.2, beakY = fr.head.cy + 0.5; // Schnabelspitze in Modelleinheiten
    ap.painter.setT(0, 0, z, -1);
    const tip = ap.painter.fwd(beakX, beakY);
    const tx = wx + 2 + off * 70, ty = wy;
    ap.painter.setT(Math.round(tx - tip[0]), Math.round(ty - tip[1]), z, -1);
    CF.drawRoosterSide(ap.painter, A, { lean: 0.5, headX: 5, headY: 2, beakOpen: k < 0 ? 0.6 : 1, hackle: 1.2 }, 0);
    q.drawImage(ap.commit(), 0, 0);
    return;
  }
  const lc = o.attacker?.appearance?.colors?.leg || '#d9b545';
  q.save(); q.translate(wx, wy);
  if (kind === 'claw' || (kind === 'peck' && !o.attacker)) { // Lauf mit Zehen und Sporn fegt schräg durchs Bild
    const ang = -0.6 + off * 0.5, dx = 18 + off * 70, dy = -16 - off * 30;
    q.rotate(ang); q.translate(dx * Math.cos(-ang) - dy * Math.sin(-ang), dy * Math.cos(-ang) + dx * Math.sin(-ang));
    q.fillStyle = '#1a110c'; q.fillRect(-1, -3, 34, 8); q.fillStyle = lc; q.fillRect(0, -2, 32, 6);
    q.fillStyle = '#efe6cc'; q.fillRect(10, 3, 3, 7); q.fillRect(11, 9, 1, 3); // Sporn
    for (const [x, y, l] of [[-2, -4, 12], [-2, 0, 14], [-2, 4, 11]]) { q.fillStyle = '#1a110c'; q.fillRect(x - l - 1, y - 1, l + 1, 3); q.fillStyle = lc; q.fillRect(x - l, y, l, 1); q.fillStyle = '#2a2420'; q.fillRect(x - l - 2, y, 2, 1); }
    if (k >= 0 && k < 0.18) { q.fillStyle = 'rgba(255,255,255,.7)'; q.fillRect(-30, 8, 60, 1); q.fillRect(-26, 12, 52, 1); }
  } else if (kind === 'blade') { // Klinge schneidet diagonal durch
    const p = cl((t - (HIT - 0.25)) / 0.35), x = -70 + p * 140, y = -45 + p * 90;
    q.fillStyle = 'rgba(255,255,255,' + (0.55 * (1 - Math.abs(p - 0.5) * 2)) + ')'; q.beginPath(); q.moveTo(-80, -50); q.lineTo(x, y); q.lineTo(x + 6, y - 6); q.fill();
    q.save(); q.translate(x, y); q.rotate(Math.atan2(90, 140)); q.fillStyle = '#1a1a1e'; q.fillRect(-46, -3, 46, 6); q.fillStyle = '#c8ccd2'; q.fillRect(-45, -2, 44, 4); q.fillStyle = '#eef1f4'; q.fillRect(-45, -2, 44, 1); if (s.hit) { q.fillStyle = '#a8141c'; q.fillRect(-14, -2, 12, 4); } q.fillStyle = '#5a3a22'; q.fillRect(-60, -3, 14, 6); q.restore();
  } else if (kind === 'blunt') { // Faust, Fuß oder Keule stößt hinein
    const x = 8 + off * 80; q.fillStyle = '#1a110c'; q.fillRect(x - 1, -13, 46, 26); q.fillStyle = o.skin || '#c49070'; q.fillRect(x, -12, 44, 24); q.fillStyle = 'rgba(0,0,0,.18)'; q.fillRect(x, 4, 44, 8);
    for (let i = 0; i < 3; i++) { q.fillStyle = 'rgba(0,0,0,.25)'; q.fillRect(x + 2, -10 + i * 8, 6, 1); }
    if (k >= 0 && k < 0.25) { q.strokeStyle = 'rgba(255,240,200,' + (0.8 - k * 3) + ')'; q.lineWidth = 1; for (let r = 6; r < 22; r += 7) { q.beginPath(); q.arc(0, 0, r + k * 40, 0, 7); q.stroke(); } }
  } else if (kind === 'paw') { // Löwenpranke mit Krallen
    const x = 14 + off * 80, y = -8 - off * 20; q.fillStyle = '#1a110c'; q.fillRect(x - 2, y - 15, 60, 32); q.fillStyle = '#b38c54'; q.fillRect(x, y - 13, 58, 28); q.fillStyle = '#9a7442'; q.fillRect(x, y + 6, 58, 9);
    for (let i = 0; i < 4; i++) { q.fillStyle = '#f0e8d8'; q.fillRect(x - 6, y - 11 + i * 7, 7, 2); q.fillRect(x - 8, y - 10 + i * 7, 2, 2); }
  } else if (kind === 'bite') { // Kiefer schließen sich
    const open = cl(1 - (t - (HIT - 0.3)) / 0.3), gap = 6 + open * 22, x = 6 + off * 60;
    q.fillStyle = '#b38c54'; q.fillRect(x, -gap - 20, 90, 20); q.fillRect(x, gap, 90, 20); q.fillStyle = '#3a1210'; q.fillRect(x, -gap, 90, gap * 2);
    q.fillStyle = '#f2ead8'; for (let i = 0; i < 6; i++) { q.fillRect(x + 4 + i * 12, -gap, 4, 6 + (i % 2) * 3); q.fillRect(x + 8 + i * 12, gap - 6 - (i % 2) * 3, 4, 6 + (i % 2) * 3); }
  }
  q.restore();
}

/* ---------- Bildaufbau ---------- */
function paint(g, w, h, s) {
  const o = s.o, R = o.R, k = s.t - HIT, q = s.q;
  q.setTransform(1, 0, 0, 1, 0, 0); q.imageSmoothingEnabled = false; q.clearRect(0, 0, FW, FH);
  backdrop(q, s);
  const sh = s.shake ? Math.round(rnd(-3, 3) * s.shake) : 0, shy = s.shake ? Math.round(rnd(-2, 2) * s.shake) : 0;
  q.save(); q.translate(sh, shy);
  if (o.kind === 'death' || o.kind === 'collapse') {
    const dead = o.kind === 'death', slow = o.dramatic ? 1.6 : 1, p = ease((k - 0.25 * slow) / (1.4 * slow));
    const z = 2.35 * Math.min(1.3, 58 / R.height + 0.3) * (1 + 0.1 * cl(k / 2));
    const pose = { yaw: 0.22, hackle: k < 0 ? 0.9 : 0.9 * (1 - p), crouch: p * (dead ? 1.2 : 0.8), headY: p * (dead ? 4 : 2.5), headX: p * (dead ? 1.5 : 0.8), blink: k > 0.15, dead: dead && k > 0.6, beakOpen: k > 0 && k < 0.5 ? 0.6 : 0, wing: p * 0.35 };
    const sp = s.sp; sp.grid.clear(); sp.painter.setT(FW / 2, Math.round(24 + 34 * z), z, 1, 0, 0, -14);
    CF.drawRoosterFront(sp.painter, R, pose, performance.now());
    q.drawImage(sp.commit(), 0, 0);
    const dark = dead ? cl((k - 1.2) / 1.6) * (o.dramatic ? 0.6 : 0.42) : 0;
    if (dark) { q.fillStyle = 'rgba(0,0,0,' + dark.toFixed(3) + ')'; q.fillRect(-4, -4, FW + 8, FH + 8); }
    if (k >= 0 && k < 0.09) { q.globalAlpha = 0.7 * (1 - k / 0.09); q.fillStyle = '#fff6dc'; q.fillRect(-4, -4, FW + 8, FH + 8); q.globalAlpha = 1; }
    drawParts(q, s);
    if (o.dramatic) { q.fillStyle = 'rgba(120,8,6,' + (0.18 + 0.08 * Math.sin(s.t * 5)).toFixed(3) + ')'; q.fillRect(-4, -4, FW + 8, FH + 8); }
  } else {
    const part = o.part, z0 = ZOOM[part] || 6, z = z0 * (1 + 0.08 * cl((s.t) / LEN)) * Math.min(1.2, Math.max(0.75, 58 / R.height));
    const flinch = k >= 0 ? Math.max(0, 1 - k / 0.45) : 0;
    const pose = { hackle: 0.8, lean: -0.35 * flinch, headX: -1.6 * flinch, wing: 0.45 * flinch, flap: s.t * 30, blink: k >= 0 && k < 0.3, beakOpen: k >= 0 && k < 0.4 ? 0.8 : 0 };
    const fr = framesOf(R, pose), f = fr[part] || fr.breast;
    const target = o.mark ? (() => { const c = Math.cos(f.rot), sn = Math.sin(f.rot); return { x: f.cx + o.mark.u * f.rx * c - o.mark.v * f.ry * sn, y: f.cy + o.mark.u * f.rx * sn + o.mark.v * f.ry * c }; })() : { x: f.cx, y: f.cy };
    const sp = s.sp; sp.grid.clear();
    const ox = Math.round(FW * 0.46 - target.x * z), oy = Math.round(FH * 0.5 - target.y * z);
    sp.painter.setT(ox, oy, z, 1); s.z = z;
    const draw = () => CF.drawRoosterSide(sp.painter, R, pose, performance.now());
    if (k < 0) withoutMark(R, o.mark, draw); else draw();
    q.drawImage(sp.commit(), 0, 0);
    s.wx = ox + target.x * z; s.wy = oy + target.y * z;
    attacker(q, s, k, s.wx, s.wy);
    if (s.flash) { q.globalAlpha = 0.75 * s.flash; q.fillStyle = '#fff6dc'; q.fillRect(-4, -4, FW + 8, FH + 8); q.globalAlpha = 1; }
    drawParts(q, s);
  }
  q.restore();
  // Rand verdunkeln
  const v = q.createRadialGradient(FW / 2, FH / 2, 30, FW / 2, FH / 2, 100); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); q.fillStyle = v; q.fillRect(0, 0, FW, FH);
  // vergrößert in die Zielfläche (ganzzahlig, deckend)
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.fillStyle = '#0d0a08'; g.fillRect(0, 0, w, h);
  const sc = Math.max(1, Math.ceil(Math.max(w / FW, h / FH))), dw = FW * sc, dh = FH * sc;
  g.drawImage(s.buf, Math.round((w - dw) / 2), Math.round((h - dh) / 2), dw, dh);
  caption(g, w, h, s, k);
  g.restore();
}

/* ---------- Infotafel wie im Spiel (Name, Körperstelle, Balken mit drei Zeilen) ---------- */
function caption(g, w, h, s, k) {
  const o = s.o, R = o.R, u = Math.min(w / 660, h / 420) * (o.textScale || 1);
  const pw = Math.round(72 * u), ph = Math.round(90 * u), px = Math.round(10 * u), py = Math.round(10 * u);
  g.fillStyle = '#17201c'; g.fillRect(px - 3, py - 3, pw + 6, ph + 6); g.fillStyle = '#e0b565'; g.fillRect(px - 2, py - 2, pw + 4, ph + 4);
  g.imageSmoothingEnabled = false; g.drawImage(portrait(R), px, py, pw, ph);
  g.textAlign = 'left'; g.textBaseline = 'top'; g.font = `bold ${Math.round(25 * u)}px 'Courier Prime',ui-monospace,monospace`;
  const name = String(R.name).toUpperCase(); g.fillStyle = '#17201c'; g.fillText(name, px + pw + 12 * u + 2, py + 2); g.fillStyle = '#efe0b3'; g.fillText(name, px + pw + 12 * u, py);
  const where = o.kind === 'death' ? 'Hahn' : o.kind === 'collapse' ? 'Hahn' : CF.partName(o.part);
  g.font = `bold ${Math.round(19 * u)}px 'Courier Prime',ui-monospace,monospace`; g.fillStyle = '#17201c'; g.fillText(where, px + pw + 12 * u + 2, py + 31 * u + 2); g.fillStyle = '#e0b565'; g.fillText(where, px + pw + 12 * u, py + 31 * u);
  if (k < 0) return;
  const a = cl(k / 0.18), bh = Math.round(124 * u), by = h - bh;
  g.globalAlpha = a * 0.86; g.fillStyle = '#0d0a08'; g.fillRect(0, by, w, bh); g.globalAlpha = a; g.fillStyle = '#a3231d'; g.fillRect(0, by, w, Math.max(2, Math.round(3 * u)));
  g.textAlign = 'center';
  const fit = (txt, size, bold) => { let z = Math.round(size * u); do { g.font = `${bold ? 'bold ' : ''}${z}px 'Courier Prime',ui-monospace,monospace`; } while (g.measureText(txt).width > w - 40 * u && --z > 8); return z; };
  const l1 = o.line1 || ''; fit(l1, 21); g.fillStyle = '#d9cfb0'; g.fillText(l1, w / 2, by + 11 * u);
  const big = String(o.title || '').toUpperCase(), size = fit(big, 44, true), pop = 1 + 0.25 * (1 - cl(k / 0.22));
  g.font = `bold ${Math.round(size * pop)}px 'Courier Prime',ui-monospace,monospace`; g.fillStyle = '#17201c'; g.fillText(big, w / 2 + 2, by + 38 * u + 2); g.fillStyle = o.color || '#f4d37a'; g.fillText(big, w / 2, by + 38 * u);
  fit(o.line3 || '', 20); g.fillStyle = '#efe0b3'; g.fillText(o.line3 || '', w / 2, by + 90 * u);
  g.globalAlpha = 1;
}

/** Hilfen zum Befüllen einer Nahaufnahme aus einem Treffer */
function describeHit(R, part, extra) {
  const p = R.body[part], gr = CF.injuryGrade(p);
  return Object.assign({ line3: 'Grad ' + gr + ' (' + GRADE[gr] + ') · Blut ' + Math.round(R.blood) + ' %' + (p.chronic > 0 ? ' · Dauerschaden' : p.bleed > 0.5 ? ' · blutet weiter' : ''), color: gr >= 3 ? '#f29b83' : '#f4d37a' }, extra || {});
}
CF.RoosterShot = { create, describeHit, HIT, LEN, FW, FH };
})(typeof window !== 'undefined' ? window : globalThis);
