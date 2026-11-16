// WAS DIE DATEI TUT: Anschluss des Weltgenerators (weltgen.js, Schritte W1a und W1b) an den Spielkern. Hängt sich in kern.js ein: Befehle weltseed (Welt aus
// Seed anlegen), weltdichte (Ortsdichte 0 dünn, 1 mittel, 2 dicht; gehört zur Welt wie der Seed) und blick (Kamera auf ein Kartenstück), Auftragsarten
// erde (11 Teilaufträge nacheinander, die letzten drei: Orte und Häfen, Straßen, Seewege) und gelaende (ein Kartenstück).
// Kerne: Vergeben und Übernehmen an festen Ticks im Weltkern, Rechnen in den Helferkernen (weltgen.js), nichts auf dem Hauptkern (Regel 13).
// W1c Runde Welt: Das Fenster läuft in x über die Naht (Stückspalte 9.599 liegt neben 0), in y endet es am Pol.
// Riesenwelt (Regel 14): Erdraster mit Netz einmal je Welt (rund 1,7 MB), Kartenstücke nur im Fenster 7 × 7 um den Blick, höchstens 2 neue je Tick, nächste zuerst,
// Puffer werden wiederverwendet. Unberührtes Land = nur Seed. Es wird nichts gespeichert (Spielstände kommen in G3).
// G4a: Das Spiel nutzt den Generator (Karte). Spielstand: stand() sichert Seed, Dichte, Blick, die Zählwerte des Fingerabdrucks, die vorhandenen Stücke und die
// offenen Stückaufträge. ausStand() rechnet beim Laden Erde und Stücke einmal direkt im Weltkern neu (Ladezeit, nicht im Spiel) und vergibt offene Aufträge mit
// derselben Nummer neu: der Fingerabdruck ist nach dem Laden exakt gleich und läuft gleich weiter. Nur während die Erde entsteht (erste Sekunden) ist der Stand nicht exakt.
// Wird nur geladen, wenn ein solcher Befehl kommt oder ein Spielstand eine Welt enthält. Ohne Befehl bleibt z.wg leer und der Fingerabdruck wie in G2.
// Wiederverwendet: Fenster, Reihenfolge „nächste zuerst“ und Pufferumlauf aus riesenwelt.js (MK1); Verteiler und Tickübernahme aus kern.js (G2).
(function(root){
'use strict';
function WG(){return root.AT3WG||(typeof module!=='undefined'&&module.exports?require('./weltgen.js'):null)}
var FENSTER=7, HALB=3, ST_JE_TICK=2, FRIST=4, SX=9600, SY=4800, LAGER=8;   // W1c: Welt 9.600 × 4.800 Stücke, in x läuft sie um (Naht)
function ab(cx,kx){var d=Math.abs(cx-kx);return d>SX-d?SX-d:d}                // Abstand zweier Stückspalten über die Naht
function mix(a){a=a>>>0;a^=a>>>16;a=Math.imul(a,0x7feb352d);a^=a>>>15;a=Math.imul(a,0x846ca68b);a^=a>>>16;return a>>>0}
var ORDNUNG=(function(){var L=[];for(var y=-HALB;y<=HALB;y++)for(var x=-HALB;x<=HALB;x++)L.push([x,y,x*x+y*y]);L.sort(function(a,b){return a[2]-b[2]||a[1]-b[1]||a[0]-b[0]});return L})();

function neu(){return{an:false,seed:0,dichte:1,gen:1,teil:0,erde:null,ans:null,unterwegs:false,kx:SX>>1,ky:SY>>1,stuecke:new Map(),bestellt:new Map(),lager:[],suche:false,
 fertig:0,summe:0,erdSumme:0,frisch:[]}}
function raeumen(w){w.stuecke.forEach(function(b,k){var cx=(k/8192)|0,cy=k%8192;
 if(ab(cx,w.kx)>HALB||Math.abs(cy-w.ky)>HALB){w.stuecke.delete(k);if(w.lager.length<LAGER)w.lager.push(b)}});w.suche=true}

function beginn(w){var G=WG();w.an=true;w.gen++;w.teil=0;w.ans=null;w.unterwegs=false;w.erde=new Uint8Array(G.ERD_BYTES);
 w.stuecke.forEach(function(b){if(w.lager.length<LAGER)w.lager.push(b)});w.stuecke=new Map();w.bestellt=new Map();w.fertig=0;w.summe=0;w.erdSumme=0;w.frisch=[];w.suche=true}
function befehl(z,art,wert){var w=z.wg||(z.wg=neu());
 if(art==='weltseed'){w.seed=wert>>>0;beginn(w)}
 else if(art==='weltdichte'){if(w.dichte!==wert){w.dichte=wert;if(w.an)beginn(w)}}                    // andere Dichte = andere Welt: neu erzeugen
 else{w.kx=(wert/8192)|0;w.ky=wert%8192;raeumen(w)}}
var ARTEN={
 weltseed:function(w){return typeof w==='number'&&w>=0&&w<=4294967295&&w===Math.floor(w)},
 weltdichte:function(w){return w===0||w===1||w===2},
 blick:function(w){return w===(w|0)&&w>=0&&((w/8192)|0)<SX&&w%8192<SY}};

// ── Vergeben (Weltkern, einmal je Tick): erst die Erde Teil für Teil, danach höchstens zwei neue Kartenstücke ──
function ausgeben(z,neuL){var w=z.wg,o=z.offen,G=WG(),nr;if(!w.an)return;
 if(w.teil<G.TEILE){if(w.unterwegs)return;nr=z.auftragNr++;o.push({nr:nr,art:'erde',gen:w.gen,faellig:z.tick+FRIST});
  neuL.push({nr:nr,version:z.version,vorrang:2,art:'erde',seed:w.seed,dichte:w.dichte,teil:w.teil,daten:w.erde,faellig:z.tick+FRIST});w.erde=null;w.unterwegs=true;return}
 if(!w.suche)return;var gab=0,fehlt=false;
 for(var i=0;i<ORDNUNG.length&&gab<ST_JE_TICK;i++){var cx=(w.kx+ORDNUNG[i][0]+SX)%SX,cy=w.ky+ORDNUNG[i][1];if(cy<0||cy>=SY)continue;
  var key=cx*8192+cy;if(w.stuecke.has(key))continue;fehlt=true;if(w.bestellt.has(key))continue;
  nr=z.auftragNr++;w.bestellt.set(key,nr);o.push({nr:nr,art:'gelaende',key:key,gen:w.gen,faellig:z.tick+FRIST});
  neuL.push({nr:nr,version:z.version,vorrang:1,art:'gelaende',seed:w.seed,cx:cx,cy:cy,daten:G.ausschnitt(w.ans,cx,cy,w.lager.pop()||new Uint8Array(G.GEL_BYTES)),faellig:z.tick+FRIST});gab++}
 if(!fehlt)w.suche=false}

// ── Übernehmen (Weltkern, am festen Tick, in Reihenfolge der Auftragsnummer) ──
function uebernehmen(z,o,d){var w=z.wg,G=WG(),s,i;if(!w||!d||o.gen!==w.gen)return;
 if(o.art==='erde'){w.unterwegs=false;w.teil++;
  if(w.teil<G.TEILE){w.erde=d;return}
  w.erde=G.fest(d);w.ans=G.ansicht(w.erde.buffer);                                                    // nur der bleibende Teil: 9 Byte je Zelle und das belegte Netz
  s=0x811c9dc5;for(i=0;i<w.erde.length;i+=5)s=Math.imul(s^w.erde[i],0x01000193);w.erdSumme=s>>>0;return}
 if(w.bestellt.get(o.key)!==o.nr)return;w.bestellt.delete(o.key);
 s=0x811c9dc5;for(i=0;i<G.ST_BYTES;i+=7)s=Math.imul(s^d[i],0x01000193);w.summe=mix(w.summe^s^o.key);w.fertig++;
 var cx=(o.key/8192)|0,cy=o.key%8192;
 if(ab(cx,w.kx)<=HALB&&Math.abs(cy-w.ky)<=HALB){w.stuecke.set(o.key,d);if(w.frisch.length<FENSTER*FENSTER)w.frisch.push(o.key)}
 else if(w.lager.length<LAGER)w.lager.push(d)}

function abdruck(w,f){f(w.an?1:0);f(w.seed);f(w.dichte);f(w.teil);f(w.kx);f(w.ky);f(w.fertig);f(w.summe);f(w.erdSumme)}
function bytes(w){var G=WG();return(w.erde?w.erde.byteLength:w.unterwegs?G.ERD_BYTES:0)+(w.stuecke.size+w.lager.length)*G.GEL_BYTES}

// ── Spielstand (G4a) ──
function exakt(w){return !w.an||(w.teil>=WG().TEILE&&!w.unterwegs)}
function stand(w,z){var da=[],auf=[];w.stuecke.forEach(function(b,k){da.push(k)});da.sort(function(a,b){return a-b});
 for(var i=0;i<z.offen.length;i++){var o=z.offen[i];if(o.art==='gelaende'&&o.gen===w.gen&&w.bestellt.get(o.key)===o.nr)auf.push([o.nr,o.key,o.faellig])}
 return{an:w.an?1:0,seed:w.seed>>>0,dichte:w.dichte,kx:w.kx,ky:w.ky,teil:w.teil,fertig:w.fertig,summe:w.summe>>>0,erdSumme:w.erdSumme>>>0,suche:w.suche?1:0,da:da,auf:auf}}
// d = gesicherte Welt, z = geladener Kernzustand. Gibt die neu zu vergebenden Aufträge zurück (null = Stand ungültig).
function ausStand(d,z){var G=WG(),U=function(v,max){return typeof v==='number'&&v===Math.floor(v)&&v>=0&&v<=max},i;
 if(!d||!U(d.seed,4294967295)||!ARTEN.weltdichte(d.dichte)||!U(d.kx,SX-1)||!U(d.ky,SY-1))return null;
 var w=neu();w.seed=d.seed;w.dichte=d.dichte;w.kx=d.kx;w.ky=d.ky;z.wg=w;if(!d.an)return[];
 if(!U(d.teil,G.TEILE)||!U(d.fertig,2147483647)||!U(d.summe,4294967295)||!U(d.erdSumme,4294967295)||!Array.isArray(d.da)||d.da.length>FENSTER*FENSTER||!Array.isArray(d.auf)||d.auf.length>FENSTER*FENSTER)return null;
 for(i=0;i<d.da.length;i++)if(!ARTEN.blick(d.da[i]))return null;
 for(i=0;i<d.auf.length;i++){var a=d.auf[i];if(!Array.isArray(a)||a.length!==3||!U(a[0],z.auftragNr-1)||!ARTEN.blick(a[1])||!U(a[2],2147483647))return null}
 beginn(w);if(d.teil<G.TEILE)return[];                                            // Erde war noch im Bau: neu anfangen (Stand war als nicht exakt gemeldet)
 w.erde=G.fest(G.erde(w.seed,w.dichte));w.ans=G.ansicht(w.erde.buffer);w.teil=G.TEILE;w.fertig=d.fertig;w.summe=d.summe;w.erdSumme=d.erdSumme;w.suche=!!d.suche;
 for(i=0;i<d.da.length;i++){var k=d.da[i],cx=(k/8192)|0,cy=k%8192,b=G.ausschnitt(w.ans,cx,cy,new Uint8Array(G.GEL_BYTES));G.gelaende({seed:w.seed,cx:cx,cy:cy,daten:b});w.stuecke.set(k,b)}
 var neuL=[];for(i=0;i<d.auf.length;i++){var q=d.auf[i],x=(q[1]/8192)|0,y=q[1]%8192;w.bestellt.set(q[1],q[0]);
  z.offen.push({nr:q[0],art:'gelaende',key:q[1],gen:w.gen,faellig:q[2]});
  neuL.push({nr:q[0],version:z.version,vorrang:1,art:'gelaende',seed:w.seed,cx:x,cy:y,daten:G.ausschnitt(w.ans,x,y,new Uint8Array(G.GEL_BYTES)),faellig:q[2]})}
 z.offen.sort(function(a,b){return a.nr-b.nr});return neuL}
var WS={exakt:exakt,stand:stand,ausStand:ausStand,FENSTER:FENSTER,HALB:HALB,ST_JE_TICK:ST_JE_TICK,SX:SX,SY:SY,ab:ab,ARTEN:ARTEN,befehl:befehl,ausgeben:ausgeben,uebernehmen:uebernehmen,abdruck:abdruck,bytes:bytes};
if(typeof module!=='undefined'&&module.exports)module.exports=WS;else root.AT3WS=WS;
})(typeof self!=='undefined'?self:this);
