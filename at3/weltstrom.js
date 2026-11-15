// WAS DIE DATEI TUT: Anschluss des Weltgenerators (weltgen.js, Schritt W1a) an den Spielkern. Hängt sich in kern.js ein: Befehle weltseed (Welt aus Seed
// anlegen) und blick (Kamera auf ein Kartenstück), Auftragsarten erde (8 Teilaufträge nacheinander) und gelaende (ein Kartenstück).
// Kerne: Vergeben und Übernehmen an festen Ticks im Weltkern, Rechnen in den Helferkernen (weltgen.js), nichts auf dem Hauptkern (Regel 13).
// Riesenwelt (Regel 14): Erdraster einmal je Welt (630 KB), Kartenstücke nur im Fenster 7 × 7 um den Blick, höchstens 2 neue je Tick, nächste zuerst,
// Puffer werden wiederverwendet. Unberührtes Land = nur Seed. Es wird nichts gespeichert (Spielstände kommen in G3).
// Wird nur geladen, wenn ein solcher Befehl kommt: das Spiel lädt diese Datei noch nicht (G4). Ohne Befehl bleibt z.wg leer und der Fingerabdruck wie in G2.
// Wiederverwendet: Fenster, Reihenfolge „nächste zuerst“ und Pufferumlauf aus riesenwelt.js (MK1); Verteiler und Tickübernahme aus kern.js (G2).
(function(root){
'use strict';
function WG(){return root.AT3WG||(typeof module!=='undefined'&&module.exports?require('./weltgen.js'):null)}
var FENSTER=7, HALB=3, ST_JE_TICK=2, FRIST=4, SEITE=4800, LAGER=8;
function mix(a){a=a>>>0;a^=a>>>16;a=Math.imul(a,0x7feb352d);a^=a>>>15;a=Math.imul(a,0x846ca68b);a^=a>>>16;return a>>>0}
var ORDNUNG=(function(){var L=[];for(var y=-HALB;y<=HALB;y++)for(var x=-HALB;x<=HALB;x++)L.push([x,y,x*x+y*y]);L.sort(function(a,b){return a[2]-b[2]||a[1]-b[1]||a[0]-b[0]});return L})();

function neu(){return{an:false,seed:0,gen:1,teil:0,erde:null,ans:null,unterwegs:false,kx:SEITE>>1,ky:SEITE>>1,stuecke:new Map(),bestellt:new Map(),lager:[],suche:false,
 fertig:0,summe:0,erdSumme:0,frisch:[]}}
function raeumen(w){w.stuecke.forEach(function(b,k){var cx=(k/8192)|0,cy=k%8192;
 if(Math.abs(cx-w.kx)>HALB||Math.abs(cy-w.ky)>HALB){w.stuecke.delete(k);if(w.lager.length<LAGER)w.lager.push(b)}});w.suche=true}

function befehl(z,art,wert){var w=z.wg||(z.wg=neu());
 if(art==='weltseed'){var G=WG();w.an=true;w.seed=wert>>>0;w.gen++;w.teil=0;w.ans=null;w.unterwegs=false;w.erde=new Uint8Array(G.ERD_BYTES);
  w.stuecke.forEach(function(b){if(w.lager.length<LAGER)w.lager.push(b)});w.stuecke=new Map();w.bestellt=new Map();w.fertig=0;w.summe=0;w.erdSumme=0;w.frisch=[];w.suche=true}
 else{w.kx=(wert/8192)|0;w.ky=wert%8192;raeumen(w)}}
var ARTEN={
 weltseed:function(w){return typeof w==='number'&&w>=0&&w<=4294967295&&w===Math.floor(w)},
 blick:function(w){return w===(w|0)&&w>=0&&((w/8192)|0)<SEITE&&w%8192<SEITE}};

// ── Vergeben (Weltkern, einmal je Tick): erst die Erde Teil für Teil, danach höchstens zwei neue Kartenstücke ──
function ausgeben(z,neuL){var w=z.wg,o=z.offen,G=WG(),nr;if(!w.an)return;
 if(w.teil<G.TEILE){if(w.unterwegs)return;nr=z.auftragNr++;o.push({nr:nr,art:'erde',gen:w.gen,faellig:z.tick+FRIST});
  neuL.push({nr:nr,version:z.version,vorrang:2,art:'erde',seed:w.seed,teil:w.teil,daten:w.erde,faellig:z.tick+FRIST});w.erde=null;w.unterwegs=true;return}
 if(!w.suche)return;var gab=0,fehlt=false;
 for(var i=0;i<ORDNUNG.length&&gab<ST_JE_TICK;i++){var cx=w.kx+ORDNUNG[i][0],cy=w.ky+ORDNUNG[i][1];if(cx<0||cy<0||cx>=SEITE||cy>=SEITE)continue;
  var key=cx*8192+cy;if(w.stuecke.has(key))continue;fehlt=true;if(w.bestellt.has(key))continue;
  nr=z.auftragNr++;w.bestellt.set(key,nr);o.push({nr:nr,art:'gelaende',key:key,gen:w.gen,faellig:z.tick+FRIST});
  neuL.push({nr:nr,version:z.version,vorrang:1,art:'gelaende',seed:w.seed,cx:cx,cy:cy,daten:G.ausschnitt(w.ans,cx,cy,w.lager.pop()||new Uint8Array(G.GEL_BYTES)),faellig:z.tick+FRIST});gab++}
 if(!fehlt)w.suche=false}

// ── Übernehmen (Weltkern, am festen Tick, in Reihenfolge der Auftragsnummer) ──
function uebernehmen(z,o,d){var w=z.wg,G=WG(),s,i;if(!w||!d||o.gen!==w.gen)return;
 if(o.art==='erde'){w.unterwegs=false;w.teil++;
  if(w.teil<G.TEILE){w.erde=d;return}
  w.erde=new Uint8Array(d.buffer.slice(0,G.ERD_FEST));w.ans=G.ansicht(w.erde.buffer);                 // nur der bleibende Teil (630 KB)
  s=0x811c9dc5;for(i=0;i<G.ERD_FEST;i+=5)s=Math.imul(s^w.erde[i],0x01000193);w.erdSumme=s>>>0;return}
 if(w.bestellt.get(o.key)!==o.nr)return;w.bestellt.delete(o.key);
 s=0x811c9dc5;for(i=0;i<G.ST_BYTES;i+=7)s=Math.imul(s^d[i],0x01000193);w.summe=mix(w.summe^s^o.key);w.fertig++;
 var cx=(o.key/8192)|0,cy=o.key%8192;
 if(Math.abs(cx-w.kx)<=HALB&&Math.abs(cy-w.ky)<=HALB){w.stuecke.set(o.key,d);if(w.frisch.length<FENSTER*FENSTER)w.frisch.push(o.key)}
 else if(w.lager.length<LAGER)w.lager.push(d)}

function abdruck(w,f){f(w.an?1:0);f(w.seed);f(w.teil);f(w.kx);f(w.ky);f(w.fertig);f(w.summe);f(w.erdSumme)}
function bytes(w){var G=WG();return(w.erde?w.erde.byteLength:w.unterwegs?G.ERD_BYTES:0)+(w.stuecke.size+w.lager.length)*G.GEL_BYTES}

var WS={FENSTER:FENSTER,HALB:HALB,ST_JE_TICK:ST_JE_TICK,SEITE:SEITE,ARTEN:ARTEN,befehl:befehl,ausgeben:ausgeben,uebernehmen:uebernehmen,abdruck:abdruck,bytes:bytes};
if(typeof module!=='undefined'&&module.exports)module.exports=WS;else root.AT3WS=WS;
})(typeof self!=='undefined'?self:this);
