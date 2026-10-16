/* =====================================================================
   ARENA THEORY – Hahnenkampf-Testlabor (ISOLIERT, nicht ans Hauptspiel angebunden)
   engine.js: Datenmodell, Generator, Händler-/Trainings-Schnittstellen,
              Pixel-Renderer (Profil + Vorderansicht), Wunden, Kampflogik.
   Läuft ohne DOM (auch in Node testbar).
   ===================================================================== */
(function (root) {
'use strict';
const CF = {};
root.CF = CF;

/* ---------------- Zufall ---------------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function makeRng(seed) {
  const r = mulberry32(seed >>> 0);
  return {
    next: r,
    range: (a, b) => a + (b - a) * r(),
    int: (a, b) => a + Math.floor(r() * (b - a + 1)),
    pick: arr => arr[Math.floor(r() * arr.length)],
    chance: p => r() < p,
    bernoulli: p => (r() < p ? 1 : 0),
    // Summe von n Bernoulli-Versuchen = Binomialverteilung
    binomial: (n, p) => { let k = 0; for (let i = 0; i < n; i++) if (r() < p) k++; return k; },
    weighted: (items, wf) => {
      let tot = 0; for (const it of items) tot += Math.max(0, wf(it));
      let x = r() * tot;
      for (const it of items) { x -= Math.max(0, wf(it)); if (x <= 0) return it; }
      return items[items.length - 1];
    }
  };
}
function newSeed() {
  try { const a = new Uint32Array(1); root.crypto.getRandomValues(a); return a[0]; }
  catch (e) { return (Math.random() * 4294967296) >>> 0; }
}
function hash3(x, y, z) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------------- Farben ---------------- */
function hexToRgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function rgbToHex(r, g, b) { return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); }
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
function adjust(hex, o) {
  const [r, g, b] = hexToRgb(hex); let [H, S, L] = rgbToHsl(r, g, b);
  H = (H + (o.h || 0) / 360 + 1) % 1; S = clamp(S + (o.s || 0), 0, 1); L = clamp(L + (o.l || 0), 0, 1);
  const c = hslToRgb(H, S, L); return rgbToHex(c[0], c[1], c[2]);
}
function mix(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); }
const _pxCache = new Map();
function px(hex) {
  let v = _pxCache.get(hex);
  if (v === undefined) { const [r, g, b] = hexToRgb(hex); v = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; _pxCache.set(hex, v); }
  return v;
}
function tone(hex) {
  return { b: px(hex), d: px(adjust(hex, { l: -0.12 })), l: px(adjust(hex, { l: 0.09 })), o: px(adjust(hex, { l: -0.26 })), hex };
}

/* =====================================================================
   KONFIGURATION
   ===================================================================== */
const STAT_DEFS = [
  { key: 'groesse', label: 'Größe', short: 'GRÖ' },
  { key: 'kraft', label: 'Kraft', short: 'KRA' },
  { key: 'schnabelkraft', label: 'Schnabelkraft', short: 'SCH' },
  { key: 'klauenstaerke', label: 'Klauenstärke', short: 'KLA' },
  { key: 'geschwindigkeit', label: 'Geschwindigkeit', short: 'GES' },
  { key: 'zaehigkeit', label: 'Zähigkeit', short: 'ZÄH' }
];
const MOVE_DEFS = [
  { key: 'peck', label: 'Schnabelstoß', alt: 'Picken', power: 'schnabelkraft', wound: 'peck' },
  { key: 'claw', label: 'Klauenhieb', alt: 'Klauenschlag', power: 'klauenstaerke', wound: 'cut' }
];
// Werte-Generierung wie im Hauptspiel (data.js): bernoulliValue für IST, Talent und personalCap für SOLL.
const GEN = {
  istMean: 20, istTrials: 64,            // IST ≈ 20 (64 Bernoulli-Würfe, Skala 1–100)
  talentMean: 62, talentTrials: 32,      // Talent wie bei Gladiatoren
  capTrials: 32, capBase: 0.34, capPerTalent: 0.0026   // SOLL ≈ 50 (Gladiatoren: Grundquote 0,52 → ≈ 68)
};
/* ---------------- Qualitätsstufen (9) ----------------
   Seltenheit über z-Wert des Qualitäts-Scores (Ist + Potenzial aller 8 Werte):
   1 von 1000 | 1 von 100 | 10 % | 20 % | 40 % | 20 % | 10 % | 1 von 100 | 1 von 1000 */
const QUALITY = [
  { tier: 1, key: 'katastrophal', label: 'Katastrophal', rarity: '1 von 1000', title: 'Jammerhahn', color: '#8a8580' },
  { tier: 2, key: 'miserabel', label: 'Miserabel', rarity: '1 von 100', title: 'Pechvogel', color: '#968f84' },
  { tier: 3, key: 'sehr_schlecht', label: 'Sehr schlecht', rarity: 'häufig', title: 'Kümmerling', color: '#a8a296' },
  { tier: 4, key: 'schlecht', label: 'Schlecht', rarity: 'häufig', title: 'Hinterhofhahn', color: '#b39466' },
  { tier: 5, key: 'mittel', label: 'Mittel', rarity: 'sehr häufig', title: 'Kampfhahn', color: '#d0a648' },
  { tier: 6, key: 'gut', label: 'Gut', rarity: 'häufig', title: 'Raufbold', color: '#ec7a2a' },
  { tier: 7, key: 'sehr_hoch', label: 'Sehr hoch', rarity: 'selten', title: 'Bluthahn', color: '#e0262e' },
  { tier: 8, key: 'elite', label: 'Elite', rarity: '1 von 100', title: 'Schlächter', color: '#c656f0' },
  { tier: 9, key: 'legende', label: 'Legende', rarity: '1 von 1000', title: 'Teufelshahn', color: '#ffc933' }
];
const TIER_COUNT = QUALITY.length;
// Grenzen für die Seltenheit, empirisch aus 2 Mio. erzeugten Hähnen bestimmt (Rohwert = 0,45·⌀IST + 0,55·⌀SOLL)
const QUALITY_CUTS = [30.006, 31.669, 34.025, 35.731, 38.075, 39.744, 42.025, 43.638];
const QUALITY_NORM = { mu: 36.893, sd: 2.231 };
const MARK_CUTS = { p01: 29, p10: 38, p90: 63, p99: 72 }   // SOLL-Verteilung: unterstes/oberstes Hundertstel bzw. Zehntel;
// Für alte 5er-Tabellen: Stufe → Index 0..4
const VI = [0, 0, 0, 1, 2, 3, 4, 4, 4];

/* ---------------- Weltmaßstab (gemeinsam mit Menschen & anderen Tieren) ----------------
   Alle Kreaturen werden über ihre echte Größe in cm skaliert. Damit passen Hähne,
   Menschen und spätere Tiere im selben Bild zusammen. */
const WORLD = {
  cmPerPx: 1.5,                 // Arena-Kamera bei Tiefe 1,0
  roosterModelUnits: 34,        // Modellhöhe Boden → Kammspitze (Seitenansicht, Einheiten)
  roosterBaseCm: 58,            // Standhöhe eines mittleren Kampfhahns
  human: { adultCm: [152, 192], childCm: [104, 136], modelUnits: 100 },
  fenceCm: 30,
  scaleFor(heightCm, modelUnits, cmPerPx, depth) { return heightCm / modelUnits / cmPerPx * (depth || 1); }
};

const PLUMAGES = [
  { key: 'rotbraun', name: 'Rotbraun', w: [2, 2, 3, 3, 3], body: '#7b2f1b', hackle: '#cf7a2c', wing: '#8f3b1d', bar: '#25344f', tail: '#1d2531', sheen: '#2f6152', breast: '#2b1f1b', beak: '#c9a25a', pattern: 'solid' },
  { key: 'goldhals', name: 'Goldhals', w: [1, 2, 3, 3, 3], body: '#2c2622', hackle: '#e3ac3c', wing: '#b9662b', bar: '#1f2b3c', tail: '#1b2029', sheen: '#2c5b55', breast: '#26201b', beak: '#cfa75c', pattern: 'solid' },
  { key: 'silberhals', name: 'Silberhals', w: [1, 2, 2, 3, 2], body: '#2b2b30', hackle: '#e7e6df', wing: '#c9c8c0', bar: '#1f2b42', tail: '#17191f', sheen: '#33505e', breast: '#27272b', beak: '#b9b4a4', pattern: 'solid' },
  { key: 'weiss', name: 'Weiß', w: [4, 3, 2, 1, 0.4], body: '#ece5d6', hackle: '#f6f1e6', wing: '#e3dbca', bar: '#d6cdba', tail: '#f1ece2', sheen: '#ffffff', breast: '#eae2d3', beak: '#e0c060', pattern: 'solid' },
  { key: 'schwarz', name: 'Schwarz mit Grünglanz', w: [1, 1, 2, 3, 4], body: '#22252c', hackle: '#2e423b', wing: '#262c34', bar: '#2f4d46', tail: '#161a20', sheen: '#327060', breast: '#1d1f25', beak: '#4a4448', pattern: 'solid' },
  { key: 'kuckuck', name: 'Kuckucksperber', w: [3, 3, 2, 1, 0.3], body: '#a3a09b', hackle: '#bdbab4', wing: '#9b9893', bar: '#75726d', tail: '#83807b', sheen: '#aeaba6', breast: '#a8a5a0', beak: '#d8c070', pattern: 'barred', patternCol: '#55534f' },
  { key: 'weizen', name: 'Weizenfarbig', w: [3, 3, 2, 1, 0.3], body: '#d1a868', hackle: '#e5a547', wing: '#c47e33', bar: '#a8692c', tail: '#2b2721', sheen: '#3c4a3a', breast: '#dcbd88', beak: '#d8b860', pattern: 'solid' },
  { key: 'blau', name: 'Blau gesäumt', w: [2, 2, 2, 2, 1], body: '#5b6a80', hackle: '#465268', wing: '#56667c', bar: '#3a4558', tail: '#2c3444', sheen: '#56708c', breast: '#62718a', beak: '#9a9488', pattern: 'speckled', patternCol: '#2f3848' },
  { key: 'feuer', name: 'Feuerrot', w: [1, 1, 2, 3, 3], body: '#b5331f', hackle: '#ff7d2c', wing: '#a32b18', bar: '#3a1a12', tail: '#2a1510', sheen: '#5a2a1a', breast: '#8c2617', beak: '#d6a04c', pattern: 'solid' },
  { key: 'porzellan', name: 'Porzellanfarbig', w: [3, 2, 1, 0.5, 0], body: '#c99a62', hackle: '#d9a96a', wing: '#c08a55', bar: '#8e6a48', tail: '#3a3a40', sheen: '#6a7a8a', breast: '#cf9f68', beak: '#d8b866', pattern: 'speckled', patternCol: '#f4efe2' },
  { key: 'schatten', name: 'Schattenrot', w: [0, 0, 0.3, 1, 4], w9: [0, 0, 0, 0, 0.3, 1, 4, 3, 1], body: '#1a171c', hackle: '#9a1e20', wing: '#2c1518', bar: '#621118', tail: '#100d12', sheen: '#6a1426', breast: '#141115', beak: '#3a3437', pattern: 'solid', face: '#6a1426', comb: '#7a1020' },
  { key: 'aschfahl', name: 'Aschfahl, kahle Stellen', w9: [6, 4, 0.6, 0, 0, 0, 0, 0, 0], body: '#b9b3a9', hackle: '#cfc9bf', wing: '#aaa49a', bar: '#9a948a', tail: '#8a847a', sheen: '#a8a298', breast: '#c4beb4', beak: '#c8b890', pattern: 'speckled', patternCol: '#e2b6ae' },
  { key: 'nachtgold', name: 'Nachtgold', w9: [0, 0, 0, 0, 0, 0, 0.2, 2, 6], body: '#131017', hackle: '#e8b030', wing: '#1d1921', bar: '#9a1a1a', tail: '#0c0a0e', sheen: '#c08a20', breast: '#0f0c11', beak: '#2a2420', pattern: 'solid', face: '#5a0c18', comb: '#6a0a14' }
];
const plumageWeight = (p, tier) => (p.w9 ? p.w9[tier - 1] : p.w ? p.w[VI[tier - 1]] : 0);
const LEGS = [
  { key: 'gelb', name: 'gelb', hex: '#d9b545', w: [3, 3, 3, 2, 1] },
  { key: 'schiefer', name: 'schiefergrau', hex: '#6c7684', w: [1, 2, 2, 3, 3] },
  { key: 'weide', name: 'weidengrün', hex: '#8b9a5b', w: [1, 1, 2, 2, 2] },
  { key: 'weiss', name: 'hell', hex: '#ddd5bd', w: [2, 2, 1, 1, 0.5] },
  { key: 'dunkel', name: 'dunkel', hex: '#3e3c44', w: [0, 0.5, 1, 2, 3] }
];
const COMB_BY_TIER = ['#d6b2aa', '#e0a69e', '#e69c94', '#d8625a', '#cc2b2b', '#c01c22', '#94101a', '#7a0a14', '#5c0610'];
const EYE_BY_TIER = ['goofy', 'goofy', 'goofy', 'dull', 'normal', 'fierce', 'evil', 'evil', 'demon'];
const IRIS_BY_STYLE = { goofy: '#2a2420', dull: '#b8a060', normal: '#d89a20', fierce: '#ea6a10', evil: '#ff2a1a', demon: '#ffc933' };

/* ---------------- Englischer Namensgenerator ---------------- */
const NAMES = {
  1: { first: ['Lumpy', 'Squeak', 'Mopey', 'Gristle', 'Wheezy', 'Soggy', 'Crumbs', 'Bald Barry', 'Patches', 'Drizzle', 'Wishbone', 'Sniffles'],
       pre: ['Poor', 'Sad', 'Little', 'Wee', 'Old'],
       post: ['the Featherless', 'the Doomed', 'of the Stewpot', 'Halfwing', 'the Unlucky', 'No-Spurs', 'the Lame'] },
  2: { first: ['Nibbles', 'Gumdrop', 'Puddles', 'Dozey', 'Scruff', 'Bumbles', 'Tufty', 'Plonk', 'Dimple', 'Haggis'],
       pre: ['Little', 'Poor', 'Sir', 'Tiny'],
       post: ['the Clumsy', 'Flopcomb', 'the Hapless', 'Mudfoot', 'the Bewildered', 'Wobblewing'] },
  3: { first: ['Nugget', 'Pudding', 'Waddles', 'Biscuit', 'Pip', 'Dumpling', 'Noodle', 'Bumble', 'Muffin', 'Sprout', 'Tater', 'Crumpet', 'Giblet', 'Turnip', 'Doodle', 'Wobbles', 'Peanut', 'Custard', 'Fluff', 'Pickles', 'Dandelion', 'Bean'],
       pre: ['Little', 'Tiny', 'Lil’', 'Sir', 'Baby', 'Old', 'Lord', 'Wee'],
       post: ['the Unready', 'the Wobbly', 'Featherbottom', 'McFlap', 'of the Compost Heap', 'the Confused', 'Two-Feathers', 'the Lesser', 'Puddlefoot', 'the Hiccup', 'Soupbone'] },
  4: { first: ['Barnaby', 'Chester', 'Ned', 'Clyde', 'Rusty', 'Buckley', 'Henry', 'Wilbur', 'Gus', 'Otis', 'Percy', 'Rupert', 'Archie', 'Benny', 'Jasper', 'Fergus', 'Cornelius'],
       pre: ['Old', 'Farmer’s', 'Plain', 'Young'],
       post: ['Strutter', 'of the Barnyard', 'Scratchley', 'Haybeak', 'the Hopeful', 'Dustwing', 'Mudspur', 'Cornwell', 'the Plucky'] },
  5: { first: ['Rufus', 'Hector', 'Copper', 'Bruno', 'Gideon', 'Maverick', 'Ranger', 'Duke', 'Colby', 'Red', 'Ajax', 'Jericho', 'Rocco', 'Baxter', 'Flint', 'Tucker', 'Brock'],
       pre: ['Sergeant', 'Captain', 'Big'],
       post: ['the Bold', 'Spurwell', 'Ironfoot', 'Beakman', 'of Millbrook', 'the Brave', 'Hawthorne', 'Quickclaw', 'Redcomb', 'the Steady'] },
  6: { first: ['Brutus', 'Goliath', 'Vandal', 'Ravager', 'Scarbeak', 'Crusher', 'Talon', 'Havoc', 'Ironcomb', 'Razor', 'Bruiser', 'Hammer', 'Viper', 'Gravel', 'Rook'],
       pre: ['Mad', 'Iron', 'Bloody', 'Big', 'Black'],
       post: ['the Brawler', 'Bonebreaker', 'the Relentless', 'Skullpecker', 'of the Pit', 'Spurlord', 'the Savage', 'Gutscratch'] },
  7: { first: ['Bloodspur', 'Grimbeak', 'Mordecai', 'Doomcrow', 'Hellfeather', 'Kingslayer', 'Nightcrow', 'Bonepicker', 'Warlock', 'Carrion', 'Malice', 'Ashfang', 'Vesper'],
       pre: ['The Dread', 'The Black', 'Lord', 'The Red'],
       post: ['the Butcher', 'the Unbroken', 'Widowmaker', 'of the Red Pit', 'the Merciless', 'the Dread', 'Pit King', 'Eye-Taker', 'Deathspur'] },
  8: { first: ['Gorewing', 'Ravenhook', 'Blackspur', 'Morgrave', 'Skullcrow', 'Ironwrath', 'Grimhallow', 'Bloodhook', 'Ruinclaw'],
       pre: ['The Iron', 'The Crimson', 'Warlord', 'Baron'],
       post: ['the Slaughterer', 'Champion of the Pit', 'the Undefeated', 'Bonecrusher', 'the Reaper'] },
  9: { first: ['Vorgath', 'Bloodcrown', 'Ashen King', 'Hellspur', 'The Red Reaper', 'Caedmon', 'Nightfall', 'Gravewing', 'Old Scratch'],
       pre: ['The Eternal', 'The Infernal', 'Dread Lord'],
       post: ['the Devil’s Rooster', 'Who Cannot Die', 'of the Thousand Pits', 'the Unholy', 'Kingbreaker'] }
};
const _recentNames = [];
function generateName(rng, tier) {
  for (let tries = 0; tries < 30; tries++) {
    let t = tier;
    if (tier >= 3 && tier <= 7 && rng.chance(0.15)) t = clamp(tier + (rng.chance(0.5) ? -1 : 1), 3, 7);
    const L = NAMES[t];
    const x = rng.next();
    let name;
    if (x < 0.38) name = rng.pick(L.first);
    else if (x < 0.66) name = rng.pick(L.pre) + ' ' + rng.pick(L.first);
    else name = rng.pick(L.first) + ' ' + rng.pick(L.post);
    if (!_recentNames.includes(name)) { _recentNames.push(name); if (_recentNames.length > 40) _recentNames.shift(); return name; }
  }
  return rng.pick(NAMES[tier].first) + ' ' + rng.int(2, 9);
}

/* =====================================================================
   GENERATOR – dieselben Bausteine wie data.js des Hauptspiels
   ===================================================================== */
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
const mapObj = (o, f) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(k, v)]));
// bernoulliValue(mean, n): n Bernoulli-Würfe, auf 1..100 skaliert (identisch zu data.js)
function bernoulliValue(rng, mean, n) {
  n = n || 64; let hits = 0; const p = clamp((mean - 1) / 99, 0.01, 0.98);
  for (let i = 0; i < n; i++) if (rng.next() < p) hits++;
  return Math.round(1 + 99 * hits / n);
}
// stableRoll: an die ID gebundener, reproduzierbarer Zufall (identisch zu data.js)
function stableRoll(id, key) {
  let h = 2166136261; for (const c of id + ':' + key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b); h ^= h >>> 16; return (h >>> 0) / 4294967296;
}
// personalCap: SOLL je Wert aus 32 stabilen Bernoulli-Würfen; das Talent verschiebt die Trefferquote (wie data.js,
// nur mit Grundquote 0,34 statt 0,52 → SOLL ≈ 50 statt ≈ 68)
function personalCap(R, key, value) {
  let hits = 0; const p = GEN.capBase + R.potential * GEN.capPerTalent;
  for (let i = 0; i < GEN.capTrials; i++) if (stableRoll(R.id, key + ':trial:' + i) < p) hits++;
  return Math.max(Math.ceil(value || 0), Math.round(1 + 99 * hits / GEN.capTrials));
}
function computeQuality(R) {
  const mC = avg([...Object.values(R.initial.stats), ...Object.values(R.initial.moves)]);
  const mP = avg([...Object.values(R.caps.stats), ...Object.values(R.caps.moves)]);
  const raw = 0.45 * mC + 0.55 * mP;
  let tier = 1; for (const c of QUALITY_CUTS) if (raw >= c) tier++;
  const Q = QUALITY[tier - 1];
  return { tier, key: Q.key, label: Q.label, title: Q.title, rarity: Q.rarity, color: Q.color, score: Math.round((raw - QUALITY_NORM.mu) / QUALITY_NORM.sd * 100) / 100, raw: Math.round(raw * 100) / 100, meanCurrent: Math.round(mC * 10) / 10, meanPotential: Math.round(mP * 10) / 10 };
}
// Auffälligkeiten wie in der Kaserne: SOLL im obersten/untersten Zehntel (doppelt im äußersten Hundertstel)
const markOf = v => (v >= MARK_CUTS.p99 ? 2 : v >= MARK_CUTS.p90 ? 1 : v <= MARK_CUTS.p01 ? -2 : v <= MARK_CUTS.p10 ? -1 : 0);
const MARK_WORDS = {
  groesse: ['wird gewaltig groß', 'wächst kräftig', 'bleibt klein', 'bleibt winzig'],
  kraft: ['außergewöhnlich kräftig', 'kräftig', 'schwach', 'sehr schwach'],
  schnabelkraft: ['mörderischer Schnabel', 'harter Schnabel', 'weicher Schnabel', 'kaum Schnabelkraft'],
  klauenstaerke: ['messerscharfe Klauen', 'starke Klauen', 'stumpfe Klauen', 'sehr stumpfe Klauen'],
  geschwindigkeit: ['blitzschnell', 'flink', 'träge', 'sehr träge'],
  zaehigkeit: ['außergewöhnlich zäh', 'zäh', 'empfindlich', 'sehr empfindlich'],
  peck: ['Schnabelstoß-Naturtalent', 'gutes Schnabelgefühl', 'pickt unbeholfen', 'pickt ins Leere'],
  claw: ['Klauenhieb-Naturtalent', 'gute Sprungtritte', 'tritt unbeholfen', 'tritt ins Leere']
};
function analysis(R) {
  const out = [];
  for (const [g, defs] of [['stats', STAT_DEFS], ['moves', MOVE_DEFS]]) for (const d of defs) {
    const v = R.caps[g][d.key], m = markOf(v);
    if (m) out.push({ key: d.key, m, v, text: MARK_WORDS[d.key][m === 2 ? 0 : m === 1 ? 1 : m === -1 ? 2 : 3] });
  }
  return out.sort((a, b) => b.m - a.m);
}

/* ---------------- Körper (wie Gladiatoren: Teile mit 0–100, Grad, Blutung, chronisch) ---------------- */
// [id, Name, Gewicht für Gesamtgesundheit (Kopf/Hals/Brust ×3 wie Kopf/Hals/Brust/Bauch im Spiel)]
const BODY_PARTS = [['head', 'Kopf', 3], ['comb', 'Kamm', 1], ['neck', 'Hals', 3], ['breast', 'Brust', 3], ['body', 'Rücken', 1], ['wing', 'Flügel', 1], ['legs', 'Beine', 1]];
const partName = id => (BODY_PARTS.find(p => p[0] === id) || [id, id])[1];
const CLOCK = { day: 1 };
function makeBody() { return Object.fromEntries(BODY_PARTS.map(([id]) => [id, { hp: 100, max: 100, pain: 0, bleed: 0, grade: 0, chronic: 0, missing: false, injury: '', wounds: [], marks: [] }])); }
function injuryGrade(p) { return p.missing ? 5 : p.hp < 20 ? 4 : p.hp < 40 ? 3 : p.hp < 65 ? 2 : p.hp < 90 ? 1 : 0; }
function health(R) { let n = 0, w = 0; for (const [id, , k] of BODY_PARTS) { n += (R.body[id].missing ? 0 : R.body[id].hp) * k; w += k; } return n / w; }
function power(R) { return Math.round((avg(Object.values(R.stats)) * 0.75 + avg(Object.values(R.moves)) * 0.25) * (0.5 + health(R) / 200) * (0.6 + R.blood / 250)); }
function addScar(R, part, reason) { if (!R.scars.some(x => x.part === part && x.reason === reason)) R.scars.push({ part, day: CLOCK.day, reason }); }
function recordWound(R, part, type, attacker, damage, fight) {
  const p = R.body[part], last = p.wounds[0];
  if (last && last.fight === fight && last.attacker === attacker && last.type === type) { last.hits++; last.damage += damage; last.day = CLOCK.day; }
  else { p.wounds.unshift({ day: CLOCK.day, fight, type, attacker: attacker || 'Unbekannt', hits: 1, damage }); p.wounds = p.wounds.slice(0, 24); }
}
function noteInjury(R, part, text) {
  const p = R.body[part]; p.injury = text; p.grade = injuryGrade(p);
  R.history.unshift({ day: CLOCK.day, text: partName(part) + ': ' + text }); R.history = R.history.slice(0, 100);
}
function kill(R, cause, killer) {
  if (R.dead) return; R.dead = true; R.cause = cause; R.killer = killer || 'Unbekannt';
  R.history.unshift({ day: CLOCK.day, text: 'Gestorben: ' + cause });
}
function status(R) {
  if (R.dead) return 'tot';
  const h = health(R);
  if (R.down) return 'kampfunfähig';
  if (h >= 99 && R.blood >= 100 && !Object.values(R.body).some(p => p.grade)) return 'gesund';
  if (h < 45 || R.blood < 50) return 'schwer verletzt';
  return 'verletzt';
}
function fitForFight(R) { return !R.dead && health(R) >= 45 && R.blood >= 50 && R.body.head.hp > 15 && R.body.neck.hp > 15; }

function computeHeight(R) {
  const base = WORLD.roosterBaseCm * R.appearance.sizeFactor;
  const grown = (R.stats.groesse - R.initial.stats.groesse) * 0.006;
  R.height = Math.round(base * (1 + grown));
  const sf = R.height / WORLD.roosterBaseCm;
  R.weight = Math.round(2.6 * sf * sf * sf * 10) / 10;
}

const TIER_TEXT = [
  'Ein Häufchen Elend. Kahle Stellen, wackelige Beine – ein Wunder, dass er überhaupt steht.',
  'Ein Pechvogel durch und durch. Stolpert über die eigenen Zehen.',
  'Ein schmächtiger, tollpatschiger Hahn. Eher Suppenhuhn als Kämpfer.',
  'Ein gewöhnlicher Hofhahn mit etwas Biss – bedrohlich ist er nicht.',
  'Ein solider Kampfhahn mit wachem Blick und sicherem Stand.',
  'Groß, kräftig und streitlustig – dieser Hahn sucht den Kampf.',
  'Ein Albtraum mit Federn: kalter Blick, gewaltige Sporen, pure Mordlust.',
  'Ein vernarbter Schlächter. Wer ihm in die Augen sieht, weicht zurück.',
  'Eine Legende der Gruben. Man erzählt sich, er habe nie verloren.'
];
// Kommentar des Tierhändlers nach dem Kauf (wie beim Sklavenhändler: passend zur Stufe)
const TRADER_LINES = [
  ['Den? Den wollte nicht mal der Fuchs.', 'Ich hätte dir Geld zahlen sollen, dass du ihn mitnimmst.'],
  ['Na ja … er hat zwei Beine. Meistens.', 'Der stolpert sogar über seinen eigenen Schatten.'],
  ['Gibt eine ordentliche Suppe, mehr nicht.', 'Klein, aber er gibt sich Mühe.'],
  ['Ein Hofhahn wie tausend andere.', 'Kräht laut, kämpft leise.'],
  ['Solide Ware. Damit kannst du arbeiten.', 'Der hat schon einen Nachbarshahn vertrieben.'],
  ['Pass auf deine Finger auf, der beißt.', 'Ein Raufbold – genau was die Grube braucht.'],
  ['Den hätte ich selbst behalten sollen …', 'Bei dem schläft man mit offenen Augen.'],
  ['Sag niemandem, dass du den von mir hast.', 'Der hat drei Hähne in einer Woche erledigt.'],
  ['Das … das ist er. Der Teufelshahn. Ich wusste nicht, dass er im Korb war.', 'Behalte ihn. Bitte. Ich will ihn nie wiedersehen.']
];
function describe(R) {
  const rows = STAT_DEFS.map(d => ({ key: d.key, label: d.label, v: R.stats[d.key], p: R.caps.stats[d.key] }));
  const sorted = [...rows].sort((a, b) => b.v - a.v || b.p - a.p);
  const strengths = sorted.slice(0, 2).map(r => r.label);
  const weakness = sorted[sorted.length - 1].label;
  const favoriteMove = R.moves.peck + R.stats.schnabelkraft >= R.moves.claw + R.stats.klauenstaerke ? 'peck' : 'claw';
  let potentialNote = 'durchschnittliches Talent';
  if (R.quality.meanPotential >= 54) potentialNote = 'großes Talent';
  else if (R.quality.meanPotential <= 46) potentialNote = 'wenig Talent';
  return {
    summary: TIER_TEXT[R.quality.tier - 1],
    strengths, weakness, favoriteMove,
    favoriteMoveLabel: MOVE_DEFS.find(m => m.key === favoriteMove).label,
    potentialNote, marks: analysis(R),
    looks: R.appearance.plumageName + ', Läufe ' + R.appearance.legName
  };
}

/**
 * Erzeugt einen zufälligen Hahn – genau so, wie ihn später der Tierhändler verkauft.
 * opts: { seed, minQuality, maxQuality, source, vendorId }
 */
function createRooster(opts) {
  opts = opts || {};
  const minQ = opts.minQuality || 1, maxQ = opts.maxQuality || TIER_COUNT;
  const seed0 = opts.seed != null ? opts.seed >>> 0 : newSeed();
  const maxTries = (minQ >= 8 || maxQ <= 2) ? 40000 : 3000;
  let tries = 0, R, rng;
  do {
    const seed = (seed0 + tries * 7919) >>> 0; rng = makeRng(seed);
    R = { id: 'hahn-' + seed.toString(36), seed, potential: bernoulliValue(rng, GEN.talentMean, GEN.talentTrials), stats: {}, moves: {} };
    for (const d of STAT_DEFS) R.stats[d.key] = bernoulliValue(rng, GEN.istMean, GEN.istTrials);
    for (const m of MOVE_DEFS) R.moves[m.key] = bernoulliValue(rng, GEN.istMean, GEN.istTrials);
    R.initial = { stats: { ...R.stats }, moves: { ...R.moves } };
    R.caps = { stats: mapObj(R.stats, (k, v) => personalCap(R, 'stat:' + k, v)), moves: mapObj(R.moves, (k, v) => personalCap(R, 'move:' + k, v)) };
    R.quality = computeQuality(R);
    tries++;
  } while ((R.quality.tier < minQ || R.quality.tier > maxQ) && tries < maxTries);
  const appearance = generateAppearance(rng, R.quality.tier, R.stats);
  const out = {
    schema: 'arena-theory.animal/0.3',
    id: R.id, animalClass: 'gefluegel', species: 'hahn', seed: R.seed,
    name: generateName(rng, R.quality.tier),
    ageMonths: rng.int(8, 30), ageDays: 0,
    height: 0, weight: 0,
    quality: R.quality, potential: R.potential,
    stats: R.stats, moves: R.moves, caps: R.caps, initial: R.initial,   // IST, SOLL, IST beim Kauf
    body: makeBody(), blood: 100, fatigue: 0, healing: null,
    scars: [], history: [],
    wins: 0, losses: 0, kills: 0, fights: 0, fame: 0,
    dead: false, cause: null, killer: null, down: false,
    appearance, learning: [],
    market: { price: 0, value: 0, source: opts.source || 'testgenerator', vendorId: opts.vendorId || null, ownerId: null, acquiredAt: null, paid: null },
    profile: null, traderLine: rng.pick(TRADER_LINES[R.quality.tier - 1]),
    created: CLOCK.day, createdAt: new Date().toISOString()
  };
  for (const s of appearance.scarMarks) addScar(out, s.part, 'Alte Narbe');
  computeHeight(out);
  out.market.price = Market.PRICE; out.market.value = Market.valueOf(out);
  out.profile = describe(out);
  return out;
}

/* ---------------- Tierhändler (wie der Sklavenhändler: fester Preis, täglich fünf, vor dem Kauf nur Sichtbares) ---------------- */
const TIER_VALUE = [4, 8, 14, 22, 30, 55, 110, 400, 2000];
const Market = {
  PRICE: 30, LOT: 5,
  valueOf(R) { return Math.round(TIER_VALUE[R.quality.tier - 1] * (0.9 + power(R) / 100 * 0.3) * (1 + Math.min(0.8, R.fights * 0.02)) * health(R) / 100); },
  /** Was man vor dem Kauf sieht – Werte, Talent und Qualität bleiben verborgen („?“). */
  visible(R) { return { id: R.id, name: R.name, ageMonths: R.ageMonths, height: R.height, weight: R.weight, plumage: R.appearance.plumageName, legs: R.appearance.legName, comb: R.appearance.combType }; },
  /** Tagesangebot: einmal pro Tag genau LOT Hähne, im Spielstand zu halten; nicht Gekaufte verschwinden am nächsten Tag. */
  dailyLot(state, vendor) {
    state = state || {}; vendor = vendor || {};
    if (state.day !== CLOCK.day) { state.day = CLOCK.day; state.lot = Array.from({ length: this.LOT }, () => createRooster({ source: 'haendler', vendorId: vendor.id || null })); }
    return state.lot;
  },
  generateOffer(vendor) { vendor = vendor || {}; const R = createRooster({ minQuality: vendor.minQuality, maxQuality: vendor.maxQuality, source: 'haendler', vendorId: vendor.id || null }); return { rooster: R, price: this.PRICE, visible: this.visible(R), vendorId: vendor.id || null }; },
  purchase(offer, buyer) { const R = offer.rooster; R.market.ownerId = (buyer && buyer.id) || 'spieler'; R.market.acquiredAt = CLOCK.day; R.market.paid = offer.price; return { rooster: R, line: R.traderLine }; }
};

/* ---------------- Lernen durch Kampf (Formel aus data.js: learn()/addLearning()) ----------------
   Keine manuelle Punktevergabe. Jede tatsächliche Aktion im Kampf bringt einen kleinen Zuwachs,
   gedämpft je näher der IST-Wert am persönlichen SOLL liegt. Alte Hähne (> 36 Monate) lernen langsamer. */
function learnValue(R, group, key, amount) {
  if (R.dead || amount <= 0) return 0;
  const cap = R.caps[group][key], v = R[group][key];
  if (!cap) return 0;
  const rate = (0.7 + R.potential / 150) * (R.ageMonths > 36 ? 0.75 : 1);
  const scaled = amount * rate * (0.08 + 0.92 * Math.pow(Math.max(0, (cap - v) / Math.max(1, cap)), 0.65));
  const gain = Math.max(0, Math.min(cap, v + scaled) - v);
  R[group][key] = v + gain;
  return gain;
}

/* ---------------- Tageswechsel & Krankenhaus (Formeln aus data.js: advanceDay(), treat(), medicalCost()) ---------------- */
const TREAT_TIERS = [{ name: 'Natürliche Heilung' }, { name: 'Einfache Pflege' }, { name: 'Tierheiler' }, { name: 'Bester Tierheiler' }];
function medicalCost(R, tier, hospital) { return Math.round((15 + (100 - health(R)) * 1.8 + R.scars.length * 3) * [0, 1, 3, 7][tier] * Math.max(0.5, 1 - (hospital || 0) * 0.05) * 0.4); }
function treat(R, tier) {
  if (R.dead) return 'Tot.';
  R.healing = tier ? { tier, days: 4 } : null;
  for (const p of Object.values(R.body)) {
    p.bleed = 0; if (p.missing) continue;
    p.hp = Math.min(100 - p.chronic, p.hp + [0, 8, 20, 35][tier]);
    p.pain = Math.max(0, p.pain - tier * 10);
    if (tier > 0 && p.chronic > 0) p.chronic = Math.min(p.chronic, Math.max(1, Math.round(p.chronic * (1 - [0, 0.03, 0.08, 0.18][tier]) * 100) / 100));
    p.grade = injuryGrade(p);
  }
  R.blood = Math.min(100, R.blood + tier * 15);
  return tier ? 'Behandlung begonnen. Zusätzliche Heilung an den nächsten vier Tagen.' : 'Natürliche Heilung gewählt.';
}
const HEAL_SPEED = 6; // Hühner heilen doppelt so schnell wie im bisherigen Stand (3 → 6).
function dayFor(R, hospital) {
  hospital = hospital || 0;
  if (R.dead) return;
  R.fatigue = Math.max(0, R.fatigue - 14 - hospital);
  R.blood = Math.min(100, R.blood + 12 * HEAL_SPEED);
  const tr = R.healing;
  for (const p of Object.values(R.body)) {
    if (p.missing) continue;
    const before = p.hp;
    const heal = (3 + hospital + (tr ? [0, 7, 16, 26][tr.tier] : 0)) * HEAL_SPEED;
    p.hp = Math.min(100 - p.chronic, p.hp + heal);
    p.pain = Math.max(0, p.pain - heal * 0.7); p.bleed = Math.max(0, p.bleed - 4 * HEAL_SPEED); p.grade = injuryGrade(p);
    if (p.hp >= 90 - p.chronic) p.injury = p.chronic ? 'Dauerhafte Einschränkung' : '';
    // sichtbare Wunden verheilen mit dem Körperteil
    const gained = p.hp - before;
    for (const m of p.marks) { m.heal = Math.min(1, (m.heal || 0) + gained / Math.max(8, m.severity * 14)); m.time = null; }
    p.marks = p.marks.filter(m => m.heal < 1 && p.hp < 100 - p.chronic);
  }
  if (tr) { tr.days--; if (tr.days <= 0) R.healing = null; }
  R.ageDays = (R.ageDays || 0) + 1; if (R.ageDays % 30 === 0) R.ageMonths++;
  if (R.ageMonths < 18) learnValue(R, 'stats', 'groesse', 0.08); // Jungtiere wachsen noch
  computeHeight(R);
  if (R.down && fitForFight(R)) R.down = false;
}
/** Zentraler Tageswechsel: genau ein Tag für alle übergebenen Tiere. */
function advanceDay(list, hospital) { CLOCK.day++; for (const R of list) if (R) dayFor(R, hospital); return CLOCK.day; }
const Healing = {
  advanceDay, treat, medicalCost, TREAT_TIERS,
  /** Nur zum Testen: sofort vollständig geheilt (Narben und chronische Schäden bleiben) */
  fullHeal(R) {
    if (R.dead) return;
    for (const p of Object.values(R.body)) { p.hp = 100 - p.chronic; p.bleed = 0; p.pain = 0; p.grade = injuryGrade(p); p.marks = []; p.injury = p.chronic ? 'Dauerhafte Einschränkung' : ''; }
    R.blood = 100; R.fatigue = 0; R.down = false; R.healing = null;
  },
  daysToFull(R) {
    let worst = 0;
    for (const p of Object.values(R.body)) worst = Math.max(worst, (100 - p.chronic) - p.hp);
    const perDay = (3 + (R.healing ? [0, 7, 16, 26][R.healing.tier] : 0)) * HEAL_SPEED;
    return Math.max(Math.ceil(worst / perDay), Math.ceil((100 - R.blood) / (12 * HEAL_SPEED)));
  }
};
// Kompatibilitäts-Alias
const Training = { learn: learnValue, note: 'Hähne lernen wie Gladiatoren nur durch tatsächliche Aktionen im Kampf. Es gibt keine manuelle Punktevergabe.' };

function generateAppearance(rng, tier, stats) {
  const i = tier - 1;
  const pl = rng.weighted(PLUMAGES, p => plumageWeight(p, tier));
  const tune = [{ s: -0.5, l: 0.08 }, { s: -0.44, l: 0.07 }, { s: -0.36, l: 0.05 }, { s: -0.17, l: 0.02 }, { s: 0, l: 0 }, { s: 0.06, l: -0.01 }, { s: 0.1, l: -0.03 }, { s: 0.12, l: -0.04 }, { s: 0.14, l: -0.05 }][i];
  const hj = rng.range(-6, 6), lj = rng.range(-0.025, 0.025);
  const tc = h => adjust(h, { h: hj, s: tune.s, l: tune.l + lj });
  const leg = rng.weighted(LEGS, l => l.w[VI[i]]);
  const eyeStyle = EYE_BY_TIER[i];
  let combType;
  if (tier <= 2) combType = rng.chance(0.95) ? 'floppy' : 'single';
  else if (tier === 3) combType = rng.chance(0.75) ? 'floppy' : 'single';
  else combType = rng.weighted([['single', 5], ['pea', 2], ['rose', 2.5]], x => x[1])[0];
  const comb = pl.comb || adjust(COMB_BY_TIER[i], { h: rng.range(-4, 4) });
  const sizeFactor = [0.64, 0.71, 0.78, 0.88, 1.0, 1.1, 1.22, 1.3, 1.38][i] * (1 + (stats.groesse - 20) * 0.008);
  // Alte Narben bei Veteranen (Elite / Legende)
  const scarMarks = [];
  const nScars = tier === 9 ? rng.int(2, 4) : tier === 8 ? rng.int(1, 2) : 0;
  const scarParts = ['head', 'comb', 'neck', 'breast'];
  for (let k = 0; k < nScars; k++) scarMarks.push({ part: rng.pick(scarParts), type: 'cut', u: rng.range(-0.5, 0.5), v: rng.range(-0.5, 0.5), ang: rng.range(-1.2, -0.3), rake: rng.int(1, 3), severity: 2, origin: 'alt' });
  return {
    plumageKey: pl.key, plumageName: pl.name, pattern: pl.pattern,
    legKey: leg.key, legName: leg.name,
    colors: {
      body: tc(pl.body), hackle: tc(pl.hackle), wing: tc(pl.wing), bar: tc(pl.bar), tail: tc(pl.tail), sheen: tc(pl.sheen),
      breast: tc(pl.breast), pattern: pl.patternCol ? tc(pl.patternCol) : null, beak: pl.beak,
      comb, face: pl.face || mix(comb, '#b8343a', 0.25), leg: leg.hex, iris: IRIS_BY_STYLE[eyeStyle]
    },
    sizeFactor: Math.round(sizeFactor * 1000) / 1000,
    combType, combSize: [0.7, 0.75, 0.8, 0.9, 1.0, 1.06, 1.12, 1.15, 1.2][i] * rng.range(0.9, 1.1), combSpikes: rng.int(4, 6),
    tailLen: [0.42, 0.48, 0.55, 0.75, 0.95, 1.15, 1.32, 1.4, 1.5][i] * rng.range(0.92, 1.08),
    tailFeathers: [2, 3, 3, 4, 4, 5, 6, 6, 7][i],
    spurLen: [0, 0.1, 0.2, 0.6, 1.0, 1.5, 2.1, 2.5, 2.9][i],
    posture: [0.36, 0.31, 0.26, 0.12, 0, -0.08, -0.15, -0.18, -0.2][i],
    hackleLen: [0.8, 0.82, 0.85, 0.92, 1, 1.08, 1.15, 1.18, 1.22][i],
    eyeStyle, scruffy: [0.85, 0.7, 0.55, 0.2, 0, 0, 0, 0, 0][i],
    aura: tier >= 8,
    scarMarks,
    markSeed: rng.int(1, 1e9)
  };
}


/* =====================================================================
   PIXEL-RENDERER
   Formen werden in lokalen Einheiten definiert und mit EINEM gleichmäßigen
   Skalierungsfaktor gerastert → keine Verzerrung, gleiche Proportionen überall.
   ===================================================================== */
class PixGrid {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); this.mask = new Uint8Array(w * h); }
  clear() { this.d.fill(0); this.mask.fill(0); }
}
class Painter {
  constructor(g) { this.g = g; this.setT(0, 0, 1); this._t = [0, 0]; }
  setT(ox, oy, s, f, roll, px_, py_) {
    this.ox = ox; this.oy = oy; this.s = s; this.f = f || 1; this.px = px_ || 0; this.py = py_ || 0;
    this.c = Math.cos(roll || 0); this.sn = Math.sin(roll || 0);
  }
  fwd(x, y) {
    const qx = this.f * (x - this.px), qy = y - this.py;
    const rx = qx * this.c - qy * this.sn, ry = qx * this.sn + qy * this.c;
    return [this.ox + this.s * (rx + this.f * this.px), this.oy + this.s * (ry + this.py)];
  }
  inv(gx, gy) {
    const rx = (gx - this.ox) / this.s - this.f * this.px, ry = (gy - this.oy) / this.s - this.py;
    const qx = rx * this.c + ry * this.sn, qy = -rx * this.sn + ry * this.c;
    this._t[0] = qx * this.f + this.px; this._t[1] = qy + this.py; return this._t;
  }
  bbox(x0, y0, x1, y1) {
    let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
    const P = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]];
    for (const p of P) { const q = this.fwd(p[0], p[1]); if (q[0] < a) a = q[0]; if (q[1] < b) b = q[1]; if (q[0] > c) c = q[0]; if (q[1] > d) d = q[1]; }
    return [Math.max(0, Math.floor(a)), Math.max(0, Math.floor(b)), Math.min(this.g.w - 1, Math.ceil(c)), Math.min(this.g.h - 1, Math.ceil(d))];
  }
  ellipse(cx, cy, rx, ry, rot, fill) {
    const R = Math.max(rx, ry), bb = this.bbox(cx - R, cy - R, cx + R, cy + R);
    const cr = Math.cos(rot), sr = Math.sin(rot), g = this.g, isN = typeof fill === 'number';
    for (let y = bb[1]; y <= bb[3]; y++) for (let x = bb[0]; x <= bb[2]; x++) {
      const l = this.inv(x + 0.5, y + 0.5); const dx = l[0] - cx, dy = l[1] - cy;
      const u = (dx * cr + dy * sr) / rx, v = (-dx * sr + dy * cr) / ry;
      if (u * u + v * v <= 1) { const col = isN ? fill : fill(u, v, l[0], l[1]); if (col) g.d[y * g.w + x] = col; }
    }
  }
  capsule(x1, y1, x2, y2, r1, r2, fill) {
    const R = Math.max(r1, r2), bb = this.bbox(Math.min(x1, x2) - R, Math.min(y1, y2) - R, Math.max(x1, x2) + R, Math.max(y1, y2) + R);
    const vx = x2 - x1, vy = y2 - y1, L2 = vx * vx + vy * vy || 1e-6, g = this.g, isN = typeof fill === 'number';
    for (let y = bb[1]; y <= bb[3]; y++) for (let x = bb[0]; x <= bb[2]; x++) {
      const l = this.inv(x + 0.5, y + 0.5);
      let t = ((l[0] - x1) * vx + (l[1] - y1) * vy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = x1 + vx * t - l[0], qy = y1 + vy * t - l[1], r = r1 + (r2 - r1) * t;
      const d2 = qx * qx + qy * qy;
      if (d2 <= r * r) { const col = isN ? fill : fill(t, Math.sqrt(d2) / r, l[0], l[1]); if (col) g.d[y * g.w + x] = col; }
    }
  }
  poly(pts, fill) {
    let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
    for (const p of pts) { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); }
    const bb = this.bbox(a, b, c, d), g = this.g, n = pts.length, isN = typeof fill === 'number';
    for (let y = bb[1]; y <= bb[3]; y++) for (let x = bb[0]; x <= bb[2]; x++) {
      const l = this.inv(x + 0.5, y + 0.5); const X = l[0], Y = l[1]; let ins = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
        if (((yi > Y) !== (yj > Y)) && (X < (xj - xi) * (Y - yi) / (yj - yi) + xi)) ins = !ins;
      }
      if (ins) { const col = isN ? fill : fill(X, Y); if (col) g.d[y * g.w + x] = col; }
    }
  }
  dot(x, y, col, r) { // lokaler Punkt, garantiert mind. 1 Pixel
    const q = this.fwd(x, y), g = this.g; const rr = Math.max(0, (r || 0) * this.s);
    const X = Math.floor(q[0]), Y = Math.floor(q[1]);
    if (rr < 0.8) { if (X >= 0 && Y >= 0 && X < g.w && Y < g.h) g.d[Y * g.w + X] = col; return; }
    for (let yy = Math.floor(q[1] - rr); yy <= q[1] + rr; yy++) for (let xx = Math.floor(q[0] - rr); xx <= q[0] + rr; xx++) {
      if (xx < 0 || yy < 0 || xx >= g.w || yy >= g.h) continue;
      const dx = xx + 0.5 - q[0], dy = yy + 0.5 - q[1]; if (dx * dx + dy * dy <= rr * rr) g.d[yy * g.w + xx] = col;
    }
  }
  snapshotMask() { const g = this.g; for (let i = 0; i < g.d.length; i++) g.mask[i] = g.d[i] ? 1 : 0; }
  outline(col) {
    const g = this.g, w = g.w, h = g.h, d = g.d, m = g.mask;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (m[i]) continue;
      if ((x > 0 && m[i - 1]) || (x < w - 1 && m[i + 1]) || (y > 0 && m[i - w]) || (y < h - 1 && m[i + w])) d[i] = col;
    }
  }
}

/* Füllfunktionen mit Pixel-Schattierung (Licht von oben vorne) */
function shadeFill(T, opt) {
  opt = opt || {};
  const pat = opt.pat || 'solid', PT = opt.pt, seed = opt.seed || 0, edge = opt.edge !== false;
  return (u, v, x, y) => {
    const d = u * u + v * v; let k;
    if (edge && d > 0.86 && v > -0.45) k = 'o';
    else if (v > 0.42 || (d > 0.68 && v > 0.05)) k = 'd';
    else if (v < -0.22 && u > -0.4 && u < 0.6 && d < 0.5) k = 'l';
    else k = 'b';
    if (PT && k !== 'o') {
      if (pat === 'barred') { if ((Math.floor(y * 0.95 + x * 0.3) & 1) === 1) return k === 'l' ? PT.b : PT.d; }
      else if (pat === 'speckled') { if (hash3(Math.floor(x * 1.25), Math.floor(y * 1.25), seed) < 0.12) return PT.b; }
    }
    return T[k];
  };
}

const _colorCache = new WeakMap();
function colorsOf(R) {
  let c = _colorCache.get(R);
  if (!c) {
    const C = R.appearance.colors;
    c = {
      body: tone(C.body), hackle: tone(C.hackle), head: tone(adjust(C.hackle, { l: 0.03 })), wing: tone(C.wing), bar: tone(C.bar),
      tail: tone(C.tail), sheen: tone(C.sheen), breast: tone(C.breast), pat: C.pattern ? tone(C.pattern) : null,
      beak: tone(C.beak), comb: tone(C.comb), face: tone(C.face), leg: tone(C.leg), spur: tone(mix(C.leg, '#efe6cc', 0.45)),
      legFar: tone(adjust(C.leg, { l: -0.12 })), iris: px(C.iris), irisHi: px(adjust(C.iris, { l: 0.2 })),
      pupil: px('#120c0a'), white: px('#f4f0e6'), brow: px(adjust(C.hackle, { l: -0.35 })), mouth: px('#5a1418'),
      outline: px('#1a110c'), glow: px('#ff6a4a')
    };
    _colorCache.set(R, c);
  }
  return c;
}

/* ---------- Gemeinsame Teile ---------- */
function drawTailFeathers(P, C, A, root, dirAng, bendSign, L0, count, scale, seed) {
  for (let i = count - 1; i >= 0; i--) {
    let ang = dirAng + i * 0.17 * bendSign * -1;
    let L = (11 + i * 1.6) * A.tailLen * scale;
    if (A.scruffy && hash3(i, 7, seed) < A.scruffy) L *= 0.55; // zerrupfte Federn
    let x = root.x, y = root.y + i * 0.5;
    const steps = 7, T = (i % 2 === 0) ? C.tail : C.sheen;
    for (let s = 0; s < steps; s++) {
      const nx = x + Math.cos(ang) * L / steps, ny = y + Math.sin(ang) * L / steps;
      const r0 = 1.9 - 1.25 * (s / steps), r1 = 1.9 - 1.25 * ((s + 1) / steps);
      P.capsule(x, y, nx, ny, r0, r1, (t, dd) => (dd > 0.72 ? T.o : dd > 0.35 ? T.b : T.l));
      x = nx; y = ny; ang += bendSign * 0.21;
    }
  }
}

function drawCombSide(P, C, A, H) {
  const cs = A.combSize, frames = {};
  const fill = shadeFill(C.comb, { edge: false });
  if (A.combType === 'pea') {
    for (let i = 0; i < 3; i++) P.ellipse(H.x - 1.4 + i * 1.4, H.y - 3.2 - (i === 1 ? 0.4 : 0), 1.2 * cs, 1.0 * cs, 0, fill);
    frames.comb = { cx: H.x, cy: H.y - 3.4, rx: 2.4, ry: 1.2, rot: 0 };
  } else if (A.combType === 'rose') {
    P.ellipse(H.x + 0.2, H.y - 3.5, 3.0 * cs, 1.5 * cs, 0, fill);
    P.capsule(H.x - 2.4, H.y - 3.9, H.x - 4.8 * cs, H.y - 4.6, 0.8, 0.3, C.comb.b);
    frames.comb = { cx: H.x, cy: H.y - 3.6, rx: 2.8, ry: 1.4, rot: 0 };
  } else {
    const n = A.combSpikes, floppy = A.combType === 'floppy';
    P.ellipse(H.x + 0.2, H.y - 3.0, 3.2 * Math.sqrt(cs), 1.4, 0, fill);
    for (let i = 0; i < n; i++) {
      const x = H.x - 2.6 + i * 5.2 / (n - 1);
      const hgt = (2.0 + (i === Math.floor(n / 2) ? 0.7 : 0) - Math.abs(i - (n - 1) / 2) * 0.25) * cs;
      const ex = floppy ? x + 1.6 + i * 0.35 : x - 0.3, ey = floppy ? H.y - 2.4 - hgt * 0.35 : H.y - 3.0 - hgt;
      P.capsule(x, H.y - 3.0, ex, ey, 1.0 * Math.sqrt(cs), 0.62, fill);
    }
    frames.comb = { cx: H.x + (floppy ? 0.8 : 0), cy: H.y - 4.2, rx: 3.0, ry: 1.7, rot: 0 };
  }
  return frames.comb;
}

/* =====================================================================
   SEITENANSICHT (Profil / Kampf) – Blickrichtung rechts (f=-1 spiegelt)
   pose: lean, crouch, bob, headX, headY, beakOpen, hackle, wing, flap,
         legN, legF, stepN, stepF, kick, tailSwish, blink, dead
   ===================================================================== */
function drawRoosterSide(P, R, pose, now) {
  pose = pose || {};
  const A = R.appearance, C = colorsOf(R), fr = {};
  const lean = (pose.lean || 0) + A.posture;
  const bodyY = (pose.crouch || 0) * 1.8 + (pose.bob || 0);
  const hip = { x: 0, y: -10 }, cl = Math.cos(lean), sl = Math.sin(lean);
  const U = (x, y) => { const dx = x - hip.x, dy = y - hip.y; return { x: hip.x + dx * cl - dy * sl, y: hip.y + dx * sl + dy * cl + bodyY }; };
  const pat = { pat: A.pattern, pt: C.pat, seed: A.markSeed };

  // --- Beine (Hilfsfunktion)
  const drawLeg = (near) => {
    const T = near ? C.leg : C.legFar;
    const thigh = U(near ? 1.4 : -0.8, -10.2);
    const hock = { x: thigh.x + (near ? 0.6 : 0.2), y: thigh.y + 3.4 };
    const step = near ? (pose.stepN || 0) : (pose.stepF || 0);
    const kick = clamp(pose.kick || 0, 0, 1);
    const swing = near ? (pose.legN || 0) : (pose.legF || 0);
    // stehend: Fuß am Boden; Tritt: Fuß nach vorne/oben gestreckt
    let foot = { x: hock.x + step + swing * 3, y: Math.min(0, hock.y + 7.5) };
    if (hock.y > -2) foot.y = hock.y + 2;
    const ka = 1.15 + (near ? 0 : -0.25);
    const kf = { x: hock.x + Math.sin(ka) * 7, y: hock.y + Math.cos(ka) * 7 };
    foot = { x: lerp(foot.x, kf.x, kick), y: lerp(foot.y, kf.y, kick) };
    P.capsule(hock.x, hock.y, foot.x, foot.y, 1.05, 0.85, shadeFill(T, { edge: false }));
    // Sporn
    const dx = foot.x - hock.x, dy = foot.y - hock.y, dl = Math.hypot(dx, dy) || 1;
    const nx = dx / dl, ny = dy / dl;
    const sp = { x: foot.x - nx * dl * 0.3, y: foot.y - ny * dl * 0.3 };
    if (A.spurLen > 0.3) P.capsule(sp.x, sp.y, sp.x - 1.4 * A.spurLen * (1 - kick * 0.3), sp.y - 0.4 * A.spurLen, 0.6, 0.25, C.spur.b);
    // Zehen
    const ta = kick * -0.9;
    P.capsule(foot.x, foot.y, foot.x + Math.cos(ta + 0.08) * 3.4, foot.y + Math.sin(ta + 0.08) * 3.4 * 0.35, 0.7, 0.45, T.b);
    P.capsule(foot.x, foot.y, foot.x + Math.cos(ta + 0.45) * 2.6, foot.y + Math.sin(ta + 0.45) * 2.6 * 0.5, 0.6, 0.4, T.d);
    P.capsule(foot.x, foot.y, foot.x - 1.7, foot.y + 0.2 - kick * 0.8, 0.55, 0.35, T.d);
    if (near) fr.legs = { cx: (thigh.x + hock.x) / 2, cy: (thigh.y + hock.y) / 2 + 1, rx: 2.6, ry: 3.2, rot: 0 };
  };

  // --- Flügel
  const drawWing = (near) => {
    const w = clamp(pose.wing || 0, 0, 1.3), flap = pose.flap || 0;
    const S = U(2.6, -18.2);
    const th = w * 0.85 + Math.sin(flap) * 0.4 * w + (near ? 0 : 0.18);
    const off = near ? { x: 0, y: 0 } : { x: -1.2, y: -0.8 };
    const ox = -4.6, oy = 2.4; // Mittelpunkt relativ zur Schulter (gefaltet)
    const c = Math.cos(th + lean), s = Math.sin(th + lean);
    const cx = S.x + off.x + ox * c - oy * s, cy = S.y + off.y + ox * s + oy * c;
    const rx = 7.6 + w * 2.4, ry = 4.3 + w * 1.4, rot = lean - 0.12 + th * 0.6;
    const WT = near ? C.wing : { b: C.wing.d, d: C.wing.o, l: C.wing.b, o: C.wing.o };
    // Schwungfedern bei gespreiztem Flügel
    if (w > 0.25) {
      for (let k = 0; k < 5; k++) {
        const a = rot + Math.PI + (k - 1) * 0.22; // nach hinten auffächern
        const bxp = cx + Math.cos(rot + Math.PI) * rx * 0.55, byp = cy + Math.sin(rot + Math.PI) * rx * 0.55;
        const L = (4.5 + k * 0.6) * Math.min(1, w);
        P.capsule(bxp, byp + k * 0.9, bxp + Math.cos(a) * L, byp + k * 0.9 + Math.sin(a) * L, 1.2, 0.5, near ? C.tail.b : C.tail.o);
      }
    }
    P.ellipse(cx, cy, rx, ry, rot, (u, v, x, y) => {
      if (u < -0.62) return near ? C.tail.b : C.tail.o;           // Handschwingen dunkel
      if (v > 0.05 && v < 0.42 && u > -0.5) return near ? C.bar.b : C.bar.d; // Flügelbinde
      return shadeFill(WT, pat)(u, v, x, y);
    });
    if (near) fr.wing = { cx, cy, rx, ry, rot };
  };

  const wingUp = (pose.wing || 0) > 0.2;

  // 1) ferner Lauf, Schwanz, ferner Flügel
  drawLeg(false);
  drawTailFeathers(P, C, A, U(-8.6, -17.2), -1.98 + lean, -1, 0, A.tailFeathers, 1, A.markSeed);
  P.ellipse(U(-9, -17.5).x, U(-9, -17.5).y, 3.6, 3.0, lean, shadeFill(C.tail, { edge: false }));
  if (wingUp) drawWing(false);

  // 2) Rumpf, Sattel, Brust
  const B = U(0, -15);
  P.ellipse(B.x, B.y, 10, 7.2, lean - 0.18, shadeFill(C.body, pat));
  fr.body = { cx: B.x - 2, cy: B.y - 1, rx: 6, ry: 4.5, rot: lean - 0.18 };
  const Sd = U(-5.6, -18.2);
  P.ellipse(Sd.x, Sd.y, 5.2, 3.6, lean - 0.4, shadeFill(C.hackle, { edge: false }));
  const Br = U(5, -14.4);
  P.ellipse(Br.x, Br.y, 5.6, 5.9, lean, shadeFill(C.breast, pat));
  fr.breast = { cx: Br.x, cy: Br.y, rx: 4.6, ry: 5, rot: lean };

  // 3) naher Schenkel + Lauf
  const Th = U(1.4, -10.2);
  P.ellipse(Th.x, Th.y, 3.8, 3.5, lean, shadeFill(C.body, { pat: A.pattern, pt: C.pat, seed: A.markSeed + 1 }));
  drawLeg(true);

  // 4) naher Flügel
  drawWing(true);

  // 5) Hals mit Behang
  const base = U(5.4, -19.4);
  const H0 = U(8.6, -27.6);
  const H = { x: H0.x + (pose.headX || 0), y: H0.y + (pose.headY || 0) };
  P.capsule(base.x, base.y, H.x - 1.1, H.y + 1.3, 3.6, 2.6, shadeFill(C.hackle, { edge: false }));
  const nx = H.x - base.x, ny = H.y - base.y, nl = Math.hypot(nx, ny) || 1;
  const nAng = Math.atan2(ny, nx);
  const mid = { x: lerp(base.x, H.x, 0.45) - 0.9, y: lerp(base.y, H.y, 0.45) + 0.6 };
  const flare = clamp(pose.hackle || 0, 0, 1.4);
  if (flare > 0.15) {
    const back = Math.atan2(-nx / nl, ny / nl); // senkrecht nach hinten
    for (let k = 0; k < 6; k++) {
      const a = back + (k - 1) * 0.42;
      const L = (4.2 + flare * 2.6) * A.hackleLen;
      P.capsule(mid.x, mid.y, mid.x + Math.cos(a) * L, mid.y + Math.sin(a) * L, 1.5, 0.35, k % 2 ? C.hackle.b : C.hackle.d);
    }
  }
  P.ellipse(mid.x, mid.y, (3.9 + flare * 1.3) * Math.sqrt(A.hackleLen), 6.1 * A.hackleLen, nAng + Math.PI / 2, shadeFill(C.hackle, { edge: false }));
  fr.neck = { cx: mid.x, cy: mid.y, rx: 3, ry: 4.6, rot: nAng + Math.PI / 2 };

  // 6) Kopf
  P.ellipse(H.x, H.y, 3.7, 3.5, 0, shadeFill(C.head, { edge: false }));
  fr.head = { cx: H.x + 0.3, cy: H.y, rx: 3.1, ry: 3.0, rot: 0 };
  fr.comb = drawCombSide(P, C, A, H);
  P.ellipse(H.x + 1.4, H.y + 0.5, 2.0, 1.9, 0, C.face.b);                // Gesichtshaut
  P.ellipse(H.x + 1.3, H.y + 3.4, 1.0, 1.7 * A.combSize, 0.1, C.comb.d);  // Kehllappen hinten
  P.ellipse(H.x + 2.1, H.y + 3.5, 1.2, 1.9 * A.combSize, -0.05, shadeFill(C.comb, { edge: false }));
  // Schnabel
  const open = clamp(pose.beakOpen || 0, 0, 1);
  if (open > 0.05) {
    P.poly([[H.x + 2.6, H.y + 0.3], [H.x + 5.0, H.y + 0.9 + open * 1.8], [H.x + 2.6, H.y + 1.6]], C.mouth);
    P.poly([[H.x + 2.6, H.y + 0.6], [H.x + 5.2, H.y + 1.2 + open * 2.0], [H.x + 2.6, H.y + 1.5]], C.beak.d);
  }
  P.poly([[H.x + 2.4, H.y - 1.5], [H.x + 4.6, H.y - 0.8], [H.x + 6.4, H.y + 0.5], [H.x + 5.6, H.y + 1.0], [H.x + 2.4, H.y + 0.6]], (x, y) => (y > H.y + 0.2 ? C.beak.d : C.beak.b));
  // Auge
  const E = { x: H.x + 1.5, y: H.y - 0.7 };
  fr.eyes = [E];
  drawEye(P, C, A, E, pose, 1);

  // Umriss
  P.snapshotMask();
  P.outline(C.outline);
  if (pose.glow) P.dot(E.x, E.y, C.glow, 0.5);
  paintWounds(P, R, fr, now);
  return fr;
}

function drawEye(P, C, A, E, pose, dir) {
  const st = A.eyeStyle;
  if (pose.blink || pose.dead) {
    P.capsule(E.x - 0.9, E.y, E.x + 0.9, E.y + (pose.dead ? 0 : 0.2), 0.32, 0.32, C.brow);
    if (pose.dead) P.capsule(E.x - 0.7, E.y - 0.7, E.x + 0.7, E.y + 0.7, 0.28, 0.28, C.brow);
    return;
  }
  if (st === 'goofy') {
    P.ellipse(E.x, E.y, 1.25, 1.3, 0, C.white);
    P.dot(E.x + 0.45 * dir + (pose.eyeX || 0), E.y + 0.35, C.pupil, 0.42);
  } else {
    P.ellipse(E.x, E.y, 0.95, 0.9, 0, C.iris);
    P.dot(E.x + 0.15 * dir, E.y, C.pupil, (st === 'evil' || st === 'demon') ? 0.3 : 0.4);
    if (P.s >= 2) P.dot(E.x - 0.35 * dir, E.y - 0.35, C.irisHi, 0.18);
  }
  if (st === 'fierce') P.capsule(E.x - 1.4 * dir, E.y - 1.45, E.x + 1.3 * dir, E.y - 0.85, 0.38, 0.3, C.brow);
  if (st === 'evil' || st === 'demon') P.capsule(E.x - 1.7 * dir, E.y - 1.9, E.x + 1.5 * dir, E.y - 0.55, 0.52, 0.38, C.brow);
  if (st === 'dull') P.capsule(E.x - 1.0 * dir, E.y - 0.95, E.x + 1.0 * dir, E.y - 0.95, 0.3, 0.3, C.face.d);
}

/* =====================================================================
   VORDERANSICHT (Nahansicht / Vorstellung) – leicht gedreht (yaw) für 3D-Wirkung
   pose: yaw, crouch, bob, headX, headY, hackle, wing, flap, beakOpen, blink, glow, stance
   ===================================================================== */
function drawRoosterFront(P, R, pose, now) {
  pose = pose || {};
  const A = R.appearance, C = colorsOf(R), fr = {};
  const yaw = pose.yaw == null ? 0.3 : clamp(pose.yaw, -0.9, 0.9);
  const up = -(pose.crouch || 0) * 1.6 + (pose.bob || 0);
  const flare = clamp(pose.hackle || 0, 0, 1.4), w = clamp(pose.wing || 0, 0, 1.3), flap = pose.flap || 0;
  const pat = { pat: A.pattern, pt: C.pat, seed: A.markSeed };
  const side = yaw >= 0 ? -1 : 1; // Schwanz erscheint auf der abgewandten Seite

  // Schwanz (hinter dem Körper)
  drawTailFeathers(P, C, A, { x: side * 3.2 - yaw * 2, y: -19.5 + up }, -Math.PI / 2 + side * 0.42, side, 0, A.tailFeathers, 0.92, A.markSeed);
  {
    const n2 = Math.max(2, A.tailFeathers - 2);
    for (let i = 0; i < n2; i++) {
      let ang = -Math.PI / 2 - side * (0.5 + i * 0.2), x = -side * 3 - yaw * 2, y = -19 + up;
      const L = (7 + i * 1.2) * A.tailLen * 0.7;
      for (let s = 0; s < 6; s++) {
        const nx = x + Math.cos(ang) * L / 6, ny = y + Math.sin(ang) * L / 6;
        P.capsule(x, y, nx, ny, 1.7 - s * 0.2, 1.5 - s * 0.2, i % 2 ? C.sheen.d : C.tail.d);
        x = nx; y = ny; ang -= side * 0.2;
      }
    }
  }

  // Flügel-Hilfsfunktion
  const wing = (sd) => {
    const S = { x: sd * 6.4 + yaw * 1.0, y: -20.5 + up };
    const th = w * 1.85 + Math.sin(flap) * 0.4 * w;
    const phi = -sd * th;
    const dx = -Math.sin(phi), dy = Math.cos(phi);
    const len = 7.2 + w * 3.2;
    const cx = S.x + dx * len * 0.78 + sd * 2.2 * (1 - w * 0.6), cy = S.y + dy * len * 0.78;
    const near = sd === (yaw >= 0 ? 1 : -1);
    const WT = near ? C.wing : { b: C.wing.d, d: C.wing.o, l: C.wing.b, o: C.wing.o };
    if (w > 0.3) {
      for (let k = 0; k < 5; k++) {
        const t = 0.35 + k * 0.17;
        const bxp = S.x + dx * len * 1.45 * t, byp = S.y + dy * len * 1.45 * t;
        const a = Math.atan2(dy, dx) + sd * (Math.PI / 2) * -1 * -1 + sd * 0.15 * k;
        const L = (3.5 + k * 0.9) * Math.min(1, w);
        // Schwungfedern zeigen vom Flügelrand nach unten/außen
        const ax = Math.cos(Math.PI / 2 - sd * 0.25 - sd * k * 0.08), ay = Math.sin(Math.PI / 2 - sd * 0.25 - sd * k * 0.08);
        P.capsule(bxp, byp, bxp + ax * L + sd * 0.6, byp + ay * L, 1.2, 0.45, near ? C.tail.b : C.tail.o);
        void a;
      }
    }
    const folded = w <= 0.3;
    const ecx = folded ? sd * 8.2 + yaw * 0.8 : cx, ecy = folded ? -14.2 + up : cy;
    const erx = folded ? 2.5 : 3.6 + w * 0.6, ery = folded ? 6.4 : len, erot = folded ? -sd * 0.12 : phi + sd * 0.1;
    if (near && folded) fr.wing = { cx: ecx, cy: ecy, rx: 1.8, ry: 4.5, rot: erot };
    P.ellipse(ecx, ecy, erx, ery, erot, (u, v, x, y) => {
      if (v > 0.66) return near ? C.tail.b : C.tail.o;
      if (v > 0.12 && v < 0.38) return near ? C.bar.b : C.bar.d;
      return shadeFill(WT, pat)(u, v, x, y);
    });
    if (near && !folded) fr.wing = { cx, cy, rx: 2.8, ry: len * 0.7, rot: phi };
  };

  wing(-1); wing(1); // gespreizt oder angelegt: immer hinter dem Rumpf

  // Beine
  for (const sd of [-1, 1]) {
    const T = sd === (yaw >= 0 ? 1 : -1) ? C.leg : C.legFar;
    const hx = sd * 3.6 + yaw * 0.5, hy = -6.6 + up * 0.4;
    const fx = sd * (3.9 + (pose.stance || 0)) + yaw * 0.8, fy = 0;
    P.capsule(hx, hy, fx, fy, 1.05, 0.9, shadeFill(T, { edge: false }));
    if (A.spurLen > 0.3) P.capsule(fx, -2.2, fx - sd * 0.3 - yaw * 1.2 * A.spurLen, -2.6 - 0.2 * A.spurLen, 0.55, 0.25, C.spur.b);
    P.capsule(fx, fy, fx - 1.6, 1.2, 0.6, 0.45, T.d);
    P.capsule(fx, fy, fx + yaw * 0.6, 1.7, 0.65, 0.45, T.b);
    P.capsule(fx, fy, fx + 1.6, 1.2, 0.6, 0.45, T.d);
  }
  for (const sd of [-1, 1]) P.ellipse(sd * 3.4 + yaw * 0.5, -8.8 + up * 0.6, 3.0, 3.4, 0, shadeFill(C.body, pat));
  fr.legs = { cx: 3.6 + yaw * 0.5, cy: -6, rx: 1.8, ry: 3.5, rot: 0 };

  // Rumpf + Brust
  P.ellipse(yaw * 0.8, -15.6 + up, 9.6, 9.0, 0, shadeFill(C.body, pat));
  fr.body = { cx: yaw * 0.8 - 5, cy: -17 + up, rx: 3, ry: 4, rot: 0 };
  P.ellipse(yaw * 1.8, -14.4 + up, 6.6, 7.4, 0, shadeFill(C.breast, pat));
  fr.breast = { cx: yaw * 1.8, cy: -14.4 + up, rx: 5.6, ry: 6.4, rot: 0 };


  // Hals + Behang
  const NX = yaw * 2.2, NY = -23.6 + up;
  if (flare > 0.15) {
    for (let k = 0; k < 9; k++) {
      const a = Math.PI / 2 + (k - 4) * 0.36;
      const L = (5.2 + flare * 3) * A.hackleLen;
      P.capsule(NX, NY + 1, NX + Math.cos(a) * L * 1.15, NY + 1 + Math.sin(a) * L * 0.85, 1.6, 0.4, k % 2 ? C.hackle.b : C.hackle.d);
    }
  }
  P.ellipse(NX, NY, (5.4 + flare * 1.6) * Math.sqrt(A.hackleLen), 6.6 * A.hackleLen, 0, shadeFill(C.hackle, { edge: false }));
  fr.neck = { cx: NX, cy: NY + 1, rx: 4, ry: 4.5, rot: 0 };

  // Kopf
  const H = { x: yaw * 3.2 + (pose.headX || 0), y: -31.6 + up + (pose.headY || 0) };
  // Kamm (von vorne schmal, mit Drehung breiter)
  const cw = 0.32 + Math.abs(yaw) * 0.85, cs = A.combSize;
  const cfill = shadeFill(C.comb, { edge: false });
  if (A.combType === 'pea') {
    for (let i = -1; i <= 1; i++) P.ellipse(H.x + i * 1.2 * cw + yaw, H.y - 3.6 - (i === 0 ? 0.6 : 0), 1.1, 1.1, 0, cfill);
    fr.comb = { cx: H.x + yaw, cy: H.y - 4, rx: 1.8, ry: 1.2, rot: 0 };
  } else if (A.combType === 'rose') {
    P.ellipse(H.x + yaw * 0.8, H.y - 3.8, 2.4 * cw + 1.0, 1.5, 0, cfill);
    fr.comb = { cx: H.x + yaw * 0.8, cy: H.y - 3.9, rx: 1.8, ry: 1.2, rot: 0 };
  } else {
    const n = A.combSpikes, floppy = A.combType === 'floppy';
    P.ellipse(H.x + yaw * 0.5, H.y - 3.4, 1.6 + 1.6 * cw, 1.6, 0, cfill);
    for (let i = 0; i < n; i++) {
      const x = H.x + yaw * 0.5 + (i - (n - 1) / 2) * 1.1 * cw * 2;
      const hgt = (2.4 + (i === Math.floor(n / 2) ? 0.8 : 0) - Math.abs(i - (n - 1) / 2) * 0.35) * cs;
      const ex = floppy ? x + 2.4 + i * 0.3 : x - yaw * 0.4, ey = floppy ? H.y - 3.2 - hgt * 0.3 : H.y - 3.6 - hgt;
      P.capsule(x, H.y - 3.6, ex, ey, 1.1, 0.65, cfill);
    }
    fr.comb = { cx: H.x + yaw * 0.5, cy: H.y - 5, rx: 2.0, ry: 1.6, rot: 0 };
  }
  P.ellipse(H.x, H.y, 4.3, 4.1, 0, shadeFill(C.head, { edge: false }));
  fr.head = { cx: H.x, cy: H.y - 0.5, rx: 3.6, ry: 3.4, rot: 0 };
  const eyeOff = 2.15, eyes = [];
  for (const sd of [-1, 1]) {
    if ((sd === -1 && yaw > 0.6) || (sd === 1 && yaw < -0.6)) continue;
    const ex = H.x + sd * eyeOff * (1 - Math.abs(yaw) * 0.25) + yaw * 0.9, ey = H.y - 0.5;
    P.ellipse(ex, ey + 0.25, 1.35, 1.3, 0, C.face.b);
    eyes.push({ x: ex, y: ey, sd });
  }
  // Kehllappen + Schnabel
  const Bx = H.x + yaw * 2.0, By = H.y + 0.9;
  P.ellipse(Bx - 1.05, By + 3.0, 1.05, 1.9 * cs, 0.08, shadeFill(C.comb, { edge: false }));
  P.ellipse(Bx + 1.05, By + 3.0, 1.05, 1.9 * cs, -0.08, shadeFill(C.comb, { edge: false }));
  const open = clamp(pose.beakOpen || 0, 0, 1);
  if (open > 0.05) {
    P.ellipse(Bx + yaw * 0.6, By + 1.0 + open * 0.7, 1.0, 0.8 + open * 0.8, 0, C.mouth);
    P.poly([[Bx - 1.0, By + 0.6], [Bx + 1.0, By + 0.6], [Bx + yaw * 0.6, By + 1.9 + open * 1.8]], C.beak.d);
  }
  P.poly([[Bx - 1.35, By - 1.1], [Bx + 1.35, By - 1.1], [Bx + 0.6 + yaw * 0.8, By + 1.2], [Bx + yaw * 0.8, By + 2.2], [Bx - 0.6 + yaw * 0.8, By + 1.2]], (x) => (x > Bx + yaw * 0.8 ? C.beak.d : C.beak.b));
  for (const e of eyes) drawEye(P, C, A, e, pose, e.sd * -1);
  fr.eyes = eyes;

  P.snapshotMask();
  P.outline(C.outline);
  paintWounds(P, R, fr, now);
  return fr;
}

/* ---------- Wunden ---------- */
const BLOOD = { dark: px('#4a0306'), red: px('#ac1018'), bright: px('#e0262a'), clot: px('#6e070c') };
const SCAB = { dark: px('#3a1a10'), mid: px('#6a2c1c'), light: px('#8a4a30') };
const SCAR = { a: px('#d6aaa0'), b: px('#b88a80') };
function paintWounds(P, R, fr, now) {
  const g = P.g, ws = Math.max(1, Math.round(P.s * 0.55));
  const on = (x, y, col) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= g.w || y >= g.h) return; const i = y * g.w + x; if (g.mask[i]) g.d[i] = col; };
  const locate = (w) => {
    const f = fr[w.part]; if (!f) return null;
    const c = Math.cos(f.rot), s = Math.sin(f.rot);
    const lx = f.cx + (w.u * f.rx) * c - (w.v * f.ry) * s, ly = f.cy + (w.u * f.rx) * s + (w.v * f.ry) * c;
    return P.fwd(lx, ly);
  };
  const line = (X, Y, w, len, colA, colB, thick) => {
    const n = w.rake || 1, a = w.ang * P.f, ca = Math.cos(a), sa = Math.sin(a);
    for (let k = 0; k < n; k++) {
      const off = (k - (n - 1) / 2) * 2.2 * ws;
      for (let t = -len / 2; t <= len / 2; t += 0.5) {
        const x = X + ca * t - sa * off, y = Y + sa * t + ca * off;
        for (let th = 0; th < thick; th++) on(x - sa * th, y + ca * th, th === 0 ? colA : colB);
        if (colB) on(x - sa * thick, y + ca * thick, colB);
      }
    }
  };
  // Narben (dauerhaft, blass)
  for (const sc of (R.appearance.scarMarks || [])) {
    const q = locate(sc); if (!q) continue;
    if (sc.type === 'peck') { on(q[0], q[1], SCAR.a); if (ws > 1) on(q[0] + 1, q[1], SCAR.b); }
    else line(q[0], q[1], sc, (1.8 + sc.severity * 1.3) * ws, SCAR.a, ws > 1 ? SCAR.b : 0, Math.max(1, ws - 1));
  }
  const marks = []; for (const [part, bp] of Object.entries(R.body)) for (const m of bp.marks) { m.part = part; marks.push(m); }
  for (const w of marks) {
    const q = locate(w); if (!q) continue;
    const X = q[0], Y = q[1], heal = w.heal || 0;
    const fresh = heal <= 0, scab = heal >= 0.5;
    const dark = fresh ? BLOOD.dark : scab ? SCAB.dark : BLOOD.dark;
    const red = fresh ? BLOOD.red : scab ? SCAB.mid : BLOOD.clot;
    const shrink = scab ? 0.6 : heal > 0 ? 0.85 : 1;
    if (w.type === 'peck') {
      const r = (w.severity >= 3 ? 1.7 : w.severity >= 2 ? 1.15 : 0.7) * ws * shrink;
      for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        const d = Math.hypot(dx, dy); if (d <= r) on(X + dx, Y + dy, d < r * 0.45 ? dark : red);
      }
      on(X, Y, dark);
    } else {
      line(X, Y, w, (2.2 + w.severity * 1.5) * ws * shrink, dark, red, scab ? Math.max(1, ws - 1) : ws);
    }
    if (scab) continue;
    // Blut läuft nach unten (frisch: wächst mit der Zeit; heilend: eingetrocknet)
    const age = heal > 0 ? 0.5 : (now != null && w.time != null ? clamp((now - w.time) / 2200, 0, 1) : 1);
    const dl = Math.round((w.severity * 1.6 + 1) * ws * age);
    const runC = heal > 0 ? BLOOD.clot : BLOOD.red, tipC = heal > 0 ? BLOOD.dark : BLOOD.bright;
    for (let i = 1; i <= dl; i++) on(X + (i > dl * 0.6 ? Math.sign(w.u || 1) * (ws > 1 ? 1 : 0) : 0), Y + Math.max(1, ws) + i, i === dl ? tipC : runC);
    if (w.severity >= 2) for (let i = 1; i <= Math.round(dl * 0.6); i++) on(X + ws + 1, Y + ws + i, BLOOD.clot);
  }
}

/* =====================================================================
   KAMPFLOGIK – Schadensmodell wie bei Gladiatoren: Treffer auf Körperteile (0–100),
   Schmerz, Grad, Blutung und Blutverlust, Narben ab Grad 3, dauerhafte Einschränkung
   bei schweren Verletzungen, K.O., Flucht und dauerhafter Tod. Lernen durch Aktionen.
   ===================================================================== */
const PARTS = [
  { key: 'head', label: 'Kopf', w: { peck: 30, claw: 11 }, k: 1.9, bleed: 1.0 },
  { key: 'comb', label: 'Kamm', w: { peck: 16, claw: 5 }, k: 2.4, bleed: 1.8 },
  { key: 'neck', label: 'Hals', w: { peck: 18, claw: 20 }, k: 1.7, bleed: 1.4 },
  { key: 'breast', label: 'Brust', w: { peck: 12, claw: 24 }, k: 1.25, bleed: 1.0 },
  { key: 'body', label: 'Rücken', w: { peck: 8, claw: 13 }, k: 1.25, bleed: 0.9 },
  { key: 'wing', label: 'Flügel', w: { peck: 9, claw: 14 }, k: 1.5, bleed: 0.8 },
  { key: 'legs', label: 'Beine', w: { peck: 7, claw: 12 }, k: 1.5, bleed: 0.8 }
];
const VARIANTS = {
  peck: [
    { key: 'stoss', label: 'Schnabelstoß', zone: {}, acc: 0.03, dmg: 1.0 },
    { key: 'hack', label: 'Hackender Schnabelstoß', zone: { head: 2, comb: 2.2 }, acc: -0.04, dmg: 1.1 },
    { key: 'doppel', label: 'Doppelter Schnabelstoß', zone: {}, acc: 0.0, dmg: 0.7, hits: 2 }
  ],
  claw: [
    { key: 'sprung', label: 'Sprung-Klauenhieb', zone: { neck: 1.5, breast: 1.4, head: 1.4 }, acc: -0.05, dmg: 1.2 },
    { key: 'flatter', label: 'Flatternder Klauenhieb', zone: { wing: 1.7, legs: 1.6, body: 1.5 }, acc: 0.04, dmg: 0.9 },
    { key: 'sporn', label: 'Spornhieb', zone: { breast: 1.4, body: 1.3 }, acc: 0.0, dmg: 1.05 }
  ]
};
const GRADE_LABEL = ['unverletzt', 'leicht', 'mittel', 'schwer', 'kritisch', 'verloren'];
const SEV_WORD = { peck: ['leichte Pickwunde', 'tiefe Pickwunde', 'klaffende Pickwunde'], cut: ['leichte Kratzwunde', 'tiefe Schnittwunde', 'klaffende Schnittwunde'] };

class FightEngine {
  constructor(RA, RB, seed) {
    this.rng = makeRng(seed != null ? seed : newSeed());
    this.id = 'hahnenkampf-' + CLOCK.day + '-' + Math.floor(this.rng.next() * 1e6).toString(36);
    this.F = [RA, RB].map((R, i) => ({ R, side: i, lastMoves: [], streak: 0, stunned: 0, fled: false, learning: {} }));
    for (const f of this.F) { f.R.down = false; }
    this.exchange = 0; this.over = false; this.winner = null; this.reason = null; this.lastAtt = -1; this.started = false;
    this.maxExchanges = 26;
  }
  st(f, k) { return f.R.stats[k]; }
  mods(f) {
    const B = f.R.body, q = id => clamp(B[id].hp / 100, 0, 1);
    return {
      speed: 0.55 + 0.45 * q('legs'),
      evade: 0.6 + 0.4 * q('wing'),
      jump: 0.6 + 0.4 * q('wing'),
      acc: -0.15 * (1 - q('head')) - (f.R.blood < 50 ? 0.06 : 0) - f.R.fatigue * 0.001,
      power: clamp(f.R.blood / 100, 0.45, 1) * (0.65 + 0.35 * health(f.R) / 100)
    };
  }
  learn(f, group, key, amount) { const g = learnValue(f.R, group, key, amount * 3); if (g > 0) { const p = group + ':' + key; f.learning[p] = (f.learning[p] || 0) + g; } return g; }
  partInfo(f) { return PARTS.map(p => { const b = f.R.body[p.key]; return { key: p.key, label: p.label, hp: b.hp, grade: b.grade, statusLabel: GRADE_LABEL[b.grade] }; }); }
  chooseAttacker() {
    const [a, b] = this.F;
    if (a.stunned) { a.stunned--; return 1; }
    if (b.stunned) { b.stunned--; return 0; }
    const sa = this.st(a, 'geschwindigkeit') * this.mods(a).speed + 6, sb = this.st(b, 'geschwindigkeit') * this.mods(b).speed + 6;
    let pA = sa / (sa + sb);
    if (this.lastAtt === 0 && a.streak >= 2) pA *= 0.35;
    if (this.lastAtt === 1 && b.streak >= 2) pA = 1 - (1 - pA) * 0.35;
    return this.rng.chance(pA) ? 0 : 1;
  }
  chooseMove(f) {
    const R = f.R, peck = R.moves.peck + R.stats.schnabelkraft, claw = R.moves.claw + R.stats.klauenstaerke;
    let wp = clamp(1 + (peck - claw) / 25, 0.35, 2), wc = clamp(1 + (claw - peck) / 25, 0.35, 2);
    const lm = f.lastMoves;
    if (lm.length >= 1 && lm[lm.length - 1] === 'peck') wp *= 0.6;
    if (lm.length >= 1 && lm[lm.length - 1] === 'claw') wc *= 0.6;
    if (lm.length >= 2 && lm[lm.length - 1] === lm[lm.length - 2]) { if (lm[lm.length - 1] === 'peck') wp *= 0.3; else wc *= 0.3; }
    return this.rng.chance(wp / (wp + wc)) ? 'peck' : 'claw';
  }
  chooseVariant(f, move) {
    const spd = this.st(f, 'geschwindigkeit');
    return this.rng.weighted(VARIANTS[move], v => {
      let w = 1;
      if (v.key === 'doppel') w = spd >= 21 ? 0.9 : 0.4;
      if (v.key === 'sprung') w = 1.2 * this.mods(f).jump;
      if (f.lastVariant === v.key) w *= 0.35;
      return w;
    });
  }
  resolveStrike(att, def, move, variant, strikeIdx) {
    const rng = this.rng, A = att.R, D = def.R;
    const mA = this.mods(att), mD = this.mods(def);
    const skill = A.moves[move];
    const powerKey = move === 'peck' ? 'schnabelkraft' : 'klauenstaerke', power = this.st(att, powerKey);
    const spdA = this.st(att, 'geschwindigkeit') * mA.speed, spdD = this.st(def, 'geschwindigkeit') * mD.speed * mD.evade;
    let hitP = 0.64 + (skill - 20) * 0.013 + (spdA - spdD) * 0.011 + variant.acc + mA.acc + (move === 'claw' ? -0.04 : 0) - (strikeIdx ? 0.08 : 0);
    hitP = clamp(hitP, 0.22, 0.93);
    this.learn(att, 'moves', move, 0.03); this.learn(att, 'stats', powerKey, 0.008);
    if (move === 'claw' && variant.key === 'sprung') this.learn(att, 'stats', 'kraft', 0.006);
    const ev = { move, variant: variant.key, variantLabel: variant.label, hit: rng.chance(hitP), hitP };
    if (!ev.hit) {
      ev.dodge = rng.chance(0.6) ? 'ausweichen' : 'verfehlt';
      if (ev.dodge === 'ausweichen') this.learn(def, 'stats', 'geschwindigkeit', 0.02);
      return ev;
    }
    this.learn(att, 'moves', move, 0.015);
    const part = rng.weighted(PARTS, p => p.w[move] * (variant.zone[p.key] || 1) * (p.key === 'head' && move === 'peck' ? (1 + (this.st(att, 'groesse') - this.st(def, 'groesse')) * 0.03) : 1));
    const base = power * 0.55 + skill * 0.35 + this.st(att, 'kraft') * 0.22 + (move === 'claw' ? this.st(att, 'groesse') * 0.1 + A.appearance.spurLen * 1.5 : 0);
    let dmg = base * 0.85 * variant.dmg * mA.power * rng.range(0.75, 1.25);
    ev.crit = rng.chance(clamp(0.06 + (skill - 20) * 0.004, 0.02, 0.2));
    if (ev.crit) dmg *= 1.6;
    const P = D.body[part.key];
    // Körpermasse zählt (wichtig für spätere Kämpfe gegen Menschen/andere Tiere): (Gewicht A / Gewicht D)^0,35
    const mass = clamp(Math.pow((A.weight || 2.6) / (D.weight || 2.6), 0.35), 0.4, 2.2);
    const loss = Math.max(1, dmg * part.k * mass * (1 - this.st(def, 'zaehigkeit') * 0.006));
    const before = P.hp;
    P.hp = Math.max(0, P.hp - loss); P.pain = Math.min(100, P.pain + loss * 0.6); P.grade = injuryGrade(P);
    const severity = clamp(Math.round(loss / 14), 1, 3), type = MOVE_DEFS.find(m => m.key === move).wound;
    P.bleed += severity * (move === 'claw' ? 1.4 : 0.9) * part.bleed;
    const woundText = SEV_WORD[type][severity - 1];
    recordWound(D, part.key, woundText, A.name, Math.round(loss), this.id);
    if (P.grade >= 2) noteInjury(D, part.key, woundText);
    // Narbe ab Grad 3 (wie im Spiel); schwere Verletzung → dauerhafte Einschränkung
    if (P.grade >= 3 && before >= 40) { addScar(D, part.key, woundText); ev.scar = true; }
    if (P.hp < 20 && before >= 20) { P.chronic = Math.min(30, P.chronic + rng.int(2, 6)); ev.chronic = true; }
    this.learn(def, 'stats', 'zaehigkeit', 0.006);
    const ang = move === 'claw' ? rng.range(-1.1, -0.35) : rng.range(0, 3.14);
    const rr = Math.sqrt(rng.next()) * 0.7, ra = rng.range(0, Math.PI * 2);
    ev.part = part.key; ev.partLabel = part.label; ev.dmg = Math.round(loss); ev.severity = severity; ev.woundText = woundText;
    ev.mark = { id: 'w' + Math.floor(rng.next() * 1e9).toString(36), part: part.key, type, severity, u: Math.cos(ra) * rr, v: Math.sin(ra) * rr, ang, rake: type === 'cut' ? (severity >= 2 ? 3 : 2) : 1, heal: 0, time: null, day: CLOCK.day };
    if (part.key === 'head' && (ev.crit || severity >= 3) && rng.chance(0.45)) { ev.stun = true; def.stunned = 1; }
    if ((part.key === 'head' || part.key === 'neck') && P.hp <= 0) { kill(D, 'Tödlicher ' + variant.label + ' an ' + (part.key === 'head' ? 'den Kopf' : 'den Hals'), A.name); ev.killed = true; }
    ev.after = { health: health(D), blood: D.blood, partHp: P.hp, grade: P.grade };
    return ev;
  }
  /** Liefert den nächsten Kampfabschnitt ("Beat") inkl. bereits berechneter Ergebnisse. */
  nextBeat() {
    if (this.over) return null;
    if (!this.started) { this.started = true; return { type: 'approach' }; }
    const [a, b] = this.F;
    for (const f of this.F) if (f.R.dead) return this.finish(1 - f.side, f.side, 'tot');
    for (const f of this.F) {
      const R = f.R;
      if (health(R) < 52 || R.blood < 38 || R.body.head.hp < 15 || R.body.neck.hp < 15 || R.body.legs.hp < 12) { R.down = true; return this.finish(1 - f.side, f.side, 'ko'); }
    }
    for (const f of this.F) if (health(f.R) < 62 && this.rng.chance(0.08 * (1 - this.st(f, 'zaehigkeit') / 45))) { f.fled = true; return this.finish(1 - f.side, f.side, 'flucht'); }
    if (this.exchange >= this.maxExchanges) { const w = health(a.R) >= health(b.R) ? 0 : 1; return this.finish(w, 1 - w, 'punkte'); }
    this.exchange++;
    let beat;
    if (this.exchange > 1 && this.rng.chance(0.13) && !a.stunned && !b.stunned) {
      const v = VARIANTS.claw[0];
      const e1 = this.resolveStrike(a, b, 'claw', v, 0);
      const e2 = !b.R.dead ? this.resolveStrike(b, a, 'claw', v, 0) : { move: 'claw', hit: false, dodge: 'verfehlt' };
      beat = { type: 'aerial', events: [{ att: 0, ev: e1 }, { att: 1, ev: e2 }] };
      a.lastMoves.push('claw'); b.lastMoves.push('claw');
    } else {
      const ai = this.chooseAttacker(), att = this.F[ai], def = this.F[1 - ai];
      att.streak = this.lastAtt === ai ? att.streak + 1 : 1; def.streak = 0; this.lastAtt = ai;
      const move = this.chooseMove(att), variant = this.chooseVariant(att, move);
      const events = [this.resolveStrike(att, def, move, variant, 0)];
      if (variant.hits === 2 && !def.R.dead) events.push(this.resolveStrike(att, def, move, variant, 1));
      att.lastMoves.push(move); if (att.lastMoves.length > 4) att.lastMoves.shift();
      att.lastVariant = variant.key;
      beat = { type: 'attack', att: ai, move, variant: variant.key, variantLabel: variant.label, events: events.map(ev => ({ att: ai, ev })) };
    }
    // Blutverlust am Ende des Schlagabtauschs; Wunden schließen sich langsam
    beat.bleed = this.F.map(f => {
      const R = f.R; if (R.dead) return 0;
      let sum = 0; for (const p of Object.values(R.body)) { sum += p.bleed; p.bleed *= 0.88; }
      const loss = sum * 0.7; R.blood = Math.max(0, R.blood - loss);
      if (R.blood <= 8) kill(R, 'Verblutet', this.F[1 - f.side].R.name);
      return Math.round(loss * 10) / 10;
    });
    beat.after = this.F.map(f => ({ health: health(f.R), blood: f.R.blood }));
    return beat;
  }
  /** Erste Hilfe nach dem Kampf: jede Blutung wird verbunden (wie fieldAid() im Spiel). */
  firstAid() { for (const f of this.F) if (!f.R.dead) for (const p of Object.values(f.R.body)) p.bleed = 0; }
  writeBack() {
    if (this._written) return; this._written = true;
    this.firstAid();
    for (const f of this.F) { f.R.fatigue = Math.min(100, f.R.fatigue + 35); f.R.learning.unshift({ fight: this.id, day: CLOCK.day, gains: f.learning }); f.R.learning = f.R.learning.slice(0, 20); }
  }
  finish(w, l, reason) {
    this.over = true; this.winner = w; this.loser = l; this.reason = reason;
    const W = this.F[w].R, L = this.F[l].R;
    W.fights++; W.wins++; L.fights++; L.losses++; W.fame += L.quality.tier;
    if (L.dead) W.kills++;
    const why = { tot: 'getötet', ko: 'K.O.', flucht: 'geflohen', punkte: 'nach Punkten' }[reason];
    W.history.unshift({ day: CLOCK.day, text: 'Sieg gegen ' + L.name + ' (' + why + ')' });
    L.history.unshift({ day: CLOCK.day, text: 'Niederlage gegen ' + W.name + ' (' + why + ')' });
    this.writeBack();
    return { type: 'end', winner: w, loser: l, reason };
  }
}

/* ---------------- Export ---------------- */
Object.assign(CF, {
  makeRng, newSeed, hash3, clamp, lerp, adjust, mix, px, tone,
  STAT_DEFS, MOVE_DEFS, GEN, QUALITY, QUALITY_CUTS, QUALITY_NORM, MARK_CUTS, TIER_COUNT, WORLD, PLUMAGES, PARTS, BODY_PARTS, VARIANTS, GRADE_LABEL, CLOCK,
  bernoulliValue, stableRoll, personalCap, createRooster, computeQuality, describe, analysis, generateName,
  health, power, status, fitForFight, injuryGrade, partName, learnValue,
  Market, Training, Healing,
  PixGrid, Painter, drawRoosterSide, drawRoosterFront, paintWounds, colorsOf,
  FightEngine
});
})(typeof window !== 'undefined' ? window : globalThis);

