'use strict';
// =====================================================================================================
// EINORDNUNG DER GLADIATOREN (Wunsch Thomas 4.11.2026): Beim Medicus lässt sich jeder eigene Gladiator einordnen –
// Müll, Talent oder Supertalent (oder gar nicht). In der Aufstellung kann man den Kader danach anzeigen lassen.
// Gespeichert wird nur g.sortTag ('muell'|'talent'|'super'); keine Spielwirkung, reine Ordnung für den Lanista.
// Icons als kleine Pixel-SVGs (schwarzer Humor): Mülltonne mit Knochen und Fliege, Rohdiamant mit Riss, goldener Lorbeer mit Krone.
// =====================================================================================================
(()=>{
const M=window.MG;if(!M||M.sortTag)return;
// Pixel-Icons 16×16: [x,y,w,h,Farbe]
const PX={
 muell:[[3,4,10,2,'#5d6766'],[2,5,12,1,'#8b9796'],[6,3,4,1,'#5d6766'],[7,2,2,1,'#3d4544'],[3,6,10,9,'#4a5453'],[4,6,1,9,'#6f7b7a'],[7,7,1,7,'#38403f'],[10,7,1,7,'#38403f'],[3,14,10,1,'#2b3130'],
  /* Knochen ragt unter dem Deckel heraus */[11,1,1,4,'#e6dcc0'],[10,0,3,1,'#f6efd8'],[10,4,3,1,'#d8ccaa'],
  /* Fliege */[1,1,1,1,'#6a6a6a'],[0,0,1,1,'#d6e6f0'],[2,0,1,1,'#d6e6f0'],
  /* Brühe läuft heraus */[12,9,1,4,'#6f8a3a'],[12,13,1,1,'#8aa84a']],
 talent:[[6,2,4,1,'#cfe9ff'],[4,3,8,1,'#8fc7f0'],[3,4,10,1,'#5aa4dc'],[3,5,10,3,'#3f88c4'],[4,8,8,2,'#2f6fa8'],[5,10,6,2,'#24578a'],[7,12,2,2,'#1b4370'],[5,4,2,1,'#e8f6ff'],[4,5,1,2,'#bfe2ff'],
  /* Riss: noch nicht fertig geschliffen */[9,5,1,1,'#16304d'],[10,6,1,1,'#16304d'],[9,7,1,2,'#16304d'],[8,9,1,1,'#16304d'],
  /* Funkeln */[13,1,1,1,'#ffffff'],[12,2,3,1,'#cfe9ff'],[13,3,1,1,'#ffffff']],
 super:[/* Krone */[4,3,1,2,'#f0c46a'],[7,2,2,3,'#f0c46a'],[11,3,1,2,'#f0c46a'],[4,5,8,3,'#dfb66d'],[4,7,8,1,'#a8783a'],[7,5,2,1,'#c83a3a'],[5,6,1,1,'#fff0bc'],[10,6,1,1,'#fff0bc'],
  /* Lorbeer links und rechts */[1,6,2,1,'#6fa04a'],[1,8,2,1,'#5c8a3c'],[2,10,2,1,'#6fa04a'],[3,12,2,1,'#5c8a3c'],[13,6,2,1,'#6fa04a'],[13,8,2,1,'#5c8a3c'],[12,10,2,1,'#6fa04a'],[11,12,2,1,'#5c8a3c'],
  [2,7,1,5,'#3f6a2c'],[13,7,1,5,'#3f6a2c'],[5,13,6,1,'#3f6a2c'],
  /* Schein */[0,2,1,1,'#fff0bc'],[15,2,1,1,'#fff0bc'],[7,0,2,1,'#fff6d6']]};
const KINDS={
 muell:{label:'Müll',short:'Müll',tip:'Kanonenfutter. Für den Löwen, für die Vorrunde, für den Notfall.',color:'#8b9796'},
 talent:{label:'Talent',short:'Talent',tip:'Rohdiamant. Könnte was werden – wenn er überlebt.',color:'#5aa4dc'},
 super:{label:'Supertalent',short:'Super',tip:'Nicht sterben lassen! Nicht verkaufen! Nicht ansehen, sonst verrutscht die Frisur.',color:'#f0c46a'}};
const ORDER=['super','talent','muell'];
function icon(kind,size=16){const p=PX[kind];if(!p)return '';return `<svg class="sort-ico sort-${kind}" width="${size}" height="${size}" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${p.map(([x,y,w,h,c])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`).join('')}</svg>`;}
const get=g=>KINDS[g?.sortTag]?g.sortTag:null;
function set(g,kind){if(!g)return;if(KINDS[kind])g.sortTag=kind;else delete g.sortTag;try{M.persist?.();}catch(e){}}
// Was der Medicus dazu sagt
const LINES={
 muell:['Müll. Gut. Ich hab hinten noch Platz neben den Eimern.','Notiert: Kanonenfutter. Er kann trotzdem stolz sein. Kurz.','Den nehm ich für Übungen. Ich meine: an ihm.','Müll ist ein hartes Wort. „Biomasse mit Schwert“ ist netter.'],
 talent:['Ein Talent! Ich zeichne ein kleines Herz neben den Namen. Mit Blut. Ist gerade da.','Rohdiamant. Schleifen müssen ihn andere. Ich flicke nur.','Talent, notiert. Wir tun so, als hätten wir es immer gewusst.'],
 super:['SUPERTALENT! Schwester, den Schrank mit den guten Verbänden!','Der stirbt mir nicht. Jedenfalls nicht billig.','Ein Wunder der Natur. Ich hätte ihn fast seziert.'],
 none:['Keine Meinung. Wie bei den meisten Dingen, die keine Leber sind.','Gestrichen. Er ist wieder ein ganz normaler Fleischsack.']};
const line=k=>{const L=LINES[k]||LINES.none;return L[Math.floor(Math.random()*L.length)];};
if(typeof document!=='undefined'){const st=document.createElement('style');st.textContent=`
.sort-ico{display:inline-block;vertical-align:-3px;image-rendering:pixelated}
.dok-sort{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 12px}
.dok-sort>b{flex-basis:100%;font:700 12px/1.3 'Courier Prime',monospace;letter-spacing:.08em;color:#dfb66d}
.dok-sort button{display:flex;align-items:center;gap:6px;padding:6px 10px;border:2px solid #4b4036;background:#1d1714;color:#efe0b3;font:700 13px 'Courier Prime',monospace;cursor:pointer}
.dok-sort button.sel{border-color:var(--sc,#dfb66d);background:#2b2118;box-shadow:inset 0 0 0 1px var(--sc,#dfb66d)}
.dok-sort small{flex-basis:100%;color:#b8ab8e;font-size:12px}
.a-sortbar{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 8px}
.a-sortbar button{display:flex;align-items:center;gap:5px;padding:4px 8px;border:1px solid #3c4a48;background:#141c1d;color:#c9d2c8;font:700 11px 'Courier Prime',monospace;cursor:pointer}
.a-sortbar button.a-on{border-color:#dfb66d;color:#f4d37a;background:#22201a}
.a-sortbar button small{color:#8a9a96;font-weight:400}
.a-card{position:relative}.a-card .sort-ico{position:absolute;right:3px;bottom:3px}`;document.head?.appendChild(st);}
M.sortTag={KINDS,ORDER,icon,get,set,line};
})();
