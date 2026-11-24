// WAS DIE DATEI TUT: Ortskern von Arena Theory 3.0 (Schritt N7a2a, Thomas 24.11.2026). Eigener Hintergrundkern, der die Ortspläne der echten Orte rechnet
// (ortsbild.js wahl/planen/lage → stadtbild.js plan), damit ein langer Plan (Großstadt bis 2,7 s) den Bildkern nie aufhält. Der Bildkern fragt über einen
// MessageChannel („plan“ mit Ortsnummer), der Ortskern antwortet mit Plan, Lage in Weltfeldern und der Höhe am Ortspunkt (eine Stufe für die ganze Ortsfläche).
// Gibt es keinen zweiten Hintergrundkern, lädt der Bildkern diese Datei selbst (importScripts, eingebettet) und plant in seinen Pausen (Regel 13: geht auch mit
// nur einem Hintergrundkern). Kein Spielzufall, kein Tick, nichts gespeichert: gleicher Seed + gleicher Ort = gleicher Plan auf jedem Gerät.
// Kosten: einmal je Ort, der in das Fenster des Bildkerns kommt; nie abhängig von der Weltgröße (Regel 14). Wiederverwendet: ortsbild.js (N7a1/N7a1b),
// stadtbild.js, stadtliste.js, landwirtschaft.js, orte.js, aussenposten.js, Höhe des Ortspunkts aus weltgen.js (ein Kartenstück).
// N7a2c (Thomas 24.11.2026): Anfrage „posten“ mit Ortsnummer → alle Außenposten und Gehöfte des Orts auf einmal (ortsbild.js posten/postenLage,
// stadtbild.js postenPlan, je Posten die Höhe am Postenpunkt). Klein: höchstens 8 Posten je Ort, Plan höchstens 18 × 18 Felder, im Mittel 0,2 ms.
// N7a4a2 (Thomas 24.11.2026): Anfrage „sperre“ des Weltkerns (eigener Kanal portWelt, im Weltkern eingebettet ohne eigenen Ortskern): Sperrkarten
// (ortssperre.js) aller Orte und Posten im Fenster einer Wegsuche, höchstens 2 MB gemerkt. Sperre-Anfragen kommen vor alle anderen (die Welt wartet darauf).
(function(){
'use strict';
var Q=self.location.search, eingebettet=!!self.AT3_ORTSKERN_EINGEBETTET;
// N7a4a2: im Weltkern eingebettet (AT3_ORTSKERN_SCHONEN) nur laden, was dort noch fehlt (Weltgenerator, Begehbarkeit und Natur des Weltkerns bleiben dieselben)
var DATEIEN=[['at3-64.js','AT3_64'],['baubild.js','AT3BAUBILD'],['baukasten.js','AT3_BAUKASTEN'],['weltgen.js','AT3WG'],['ortsnamen.js','AT3ORTSNAMEN'],['orte.js','AT3ORTE'],
 ['aussenposten.js','AT3POSTEN'],['ortsbild.js','AT3ORTSBILD'],['stadtliste.js','AT3_STADTLISTE'],['landwirtschaft.js','AT3LANDW'],['natur.js','AT3NATUR'],['begehbar.js','AT3BEGEH'],
 ['stadtbild.js','AT3_STADTBILD'],['ortssperre.js','AT3ORTSSPERRE']];
importScripts.apply(self,DATEIEN.filter(function(d){return !(self.AT3_ORTSKERN_SCHONEN&&self[d[1]])}).map(function(d){return d[0]+Q}));
var G=self.AT3WG, SB=self.AT3_STADTBILD, OB=self.AT3ORTSBILD, O=self.AT3ORTE, AP=self.AT3POSTEN, ON=self.AT3ORTSNAMEN, SL=self.AT3_STADTLISTE, LW=self.AT3LANDW, OS=self.AT3ORTSSPERRE;
var D=null, laden=null, A=null, seed=0, gen=-1, puffer=null, port=null, portW=null, schlange=[], laeuft=false, spaeter=[];
function json(f){return fetch('daten/'+f+'.json'+Q).then(function(r){if(!r.ok)throw new Error(f+' '+r.status);return r.json()})}
function daten(){if(laden)return laden;
 laden=Promise.all(['gebaeude','rezepte','kulturen','religionen','landwirtschaft','waren'].map(json)).then(function(r){
  SB.setzeDaten(r[0]);SB.setzeLandw(LW.daten(r[4],r[0],r[5],r[1]));
  D={O:O,DD:O.daten(r[0],r[1],r[2]),SL:SL,SLD:SL.daten(r[0]),REL:r[3].religionen,KK:r[2].kulturkreise};return D});return laden}
// N7a4a2: Kollisionstabelle der Kartei (hohe Dinge sperren) erst mit der ersten Sperrkarte
var kolL=null;function kol(){return kolL||(kolL=fetch('kartei/kollision.json'+Q).then(function(r){if(!r.ok)throw new Error('kollision '+r.status);return r.json()}))}
// Rohe Höhe am Ortspunkt (Weltfeld x, y): das Kartenstück dort einmal rechnen
function hoehe(x,y){puffer=puffer||new Uint8Array(G.GEL_BYTES);var cx=x>>6,cy=y>>6,b=G.ausschnitt(A,cx,cy,puffer);G.gelaende({seed:seed,cx:cx,cy:cy,daten:b});
 return new Uint16Array(b.buffer,b.byteOffset,G.FELDER)[((y&63)<<6)|(x&63)]}
// Ein Ort: Wahl, Plan (mit Ausweich-Seeds und Ersatz), Lage, Höhe. Fehler → {fehler} (der Bildkern lässt den Ort dann einfach weg)
// N7a4a2: die letzten Pläne kurz gemerkt (höchstens PLM), damit Bild und Sperrkarte desselben Orts nur einmal geplant werden
var PLM=4, PLAN=new Map();
// N7a5a1 (Thomas 24.11.2026): Wassermaske aus der Welt je Ort (ortsbild.js wasserMaske) in opt.welt, vor dem Plan; der Plan nutzt sie ab N7a5a2. Notausschalter ?n7a5a1=0.
var N7A5A1=!/[?&]n7a5a1=0/.test(Q), MST={n:0,ms:0,maxMs:0,stuecke:0,bytes:0};
function maske(k,w){var p=OB.punkt(G,seed,A,k),M=OB.wasserMaske(G,seed,A,k,w.roh.g,hoehe(p[0],p[1]),puffer);MST.n++;MST.ms=M.ms;if(M.ms>MST.maxMs)MST.maxMs=M.ms;MST.stuecke=M.stuecke;MST.bytes=M.m.length;return M}
function planRoh(k){var p=PLAN.get(k);if(p){PLAN.delete(k);PLAN.set(k,p);return p}var w=OB.wahl(seed,A,k,D,ON);if(N7A5A1)w.opt.welt=maske(k,w);var r=OB.planen(SB,w.opt);p={w:w,r:r,L:OB.lage(G,seed,A,k,r.P)};
 PLAN.set(k,p);while(PLAN.size>PLM)PLAN.delete(PLAN.keys().next().value);return p}
function planen(k){var t=performance.now(),q=planRoh(k),w=q.w,r=q.r,L=q.L;
 return{k:k,g:w.roh.g,name:w.name,P:r.P,lage:L,h0:hoehe(L.punkt[0],L.punkt[1]),ersatz:r.ersatz||null,ausweich:r.ausweich||0,ms:performance.now()-t}}
// N7a2c: Außenposten und Gehöfte des Orts k; Kennung je Posten = PK + k * 16 + n (getrennt von den Ortsnummern), scheitert ein Posten, fällt nur er weg
var PK=1048576;
function postenPlanen(k){var t=performance.now(),w=OB.wahl(seed,A,k,D,ON),L=OB.posten(G,seed,A,k,D,AP,w),r=[];
 L.forEach(function(q,n){try{var P=SB.postenPlan(q.opt),La=OB.postenLage(G,q.p,P);r.push({k:PK+k*16+n,ort:k,art:q.opt.art,P:P,lage:La,h0:hoehe(La.punkt[0],La.punkt[1])})}catch(x){}});
 return{k:k,liste:r,ms:performance.now()-t}}
function antwort(m){if(m.art==='sperre'){if(portW)portW.postMessage(m);else if(self.AT3_ORTSKERN_ANTWORT)self.AT3_ORTSKERN_ANTWORT(m);return}   // N7a4a2: Sperrkarten an den Weltkern
 if(port)port.postMessage(m);else if(self.AT3_ORTSKERN_ANTWORT)self.AT3_ORTSKERN_ANTWORT(m)}

// ── N7a4a2 (Thomas 24.11.2026): Sperrkarten für die Wegsuche des Weltkerns ──
// Anfrage „sperre“ mit Fenster (Kartenstück cx0, cy0 links oben, FEN × FEN Stücke wie wegsuche.js). Antwort: alle Sperrkarten (ortssperre.js maske) der Orte und
// Außenposten, die das Fenster samt Hangring berühren, [{k, x0, y0, W, m, h0, R}] (N7a4b1: h0 Höhe des Ortspunkts, R Hangring), leer erlaubt. Gemerkt höchstens SP_MAX Byte (älteste fallen heraus), Postenpunkte je Ort (klein).
// Nur aus Seed und Ortsnummer: gleiche Karte auf jedem Gerät, darum gleiches Wegergebnis, egal wann sie ankommt.
var FEN=5, ST=64, WX=64*9600, SP_MAX=2*1048576, PWEIT=2600, SP=new Map(), SPB=0, PPT=new Map(), PPT_MAX=48, SPST={karten:0,ms:0,maxMs:0,anfragen:0};
function ab(d){d%=WX;if(d>WX/2)d-=WX;else if(d<-WX/2)d+=WX;return d}
function beruehrt(x0,y0,W,fx0,fy0,fn){var dx=ab(x0-fx0);return dx<fn&&dx+W>0&&y0<fy0+fn&&y0+W>fy0}
function merke(e){SP.set(e.k,e);SPB+=e.m.length;while(SPB>SP_MAX&&SP.size>1){var a=SP.keys().next().value;SPB-=SP.get(a).m.length;SP.delete(a)}return e}
function karte(k,bau){var e=SP.get(k);if(e){SP.delete(k);SP.set(k,e);return e}var t=performance.now();e=bau();e.k=k;var d=performance.now()-t;SPST.karten++;SPST.ms=d;if(d>SPST.maxMs)SPST.maxMs=d;return merke(e)}
// Postenpunkte eines Orts ohne Plan (Plan erst, wenn der Posten das Fenster berührt)
function postenVon(k){var L=PPT.get(k);if(L){PPT.delete(k);PPT.set(k,L);return L}var w=OB.wahl(seed,A,k,D,ON);L=OB.posten(G,seed,A,k,D,AP,w);PPT.set(k,L);
 while(PPT.size>PPT_MAX)PPT.delete(PPT.keys().next().value);return L}
var PMAX=9;   // halbe Fläche des größten Postenplans (18 × 18, ortsflaeche.js PMAX)
var RAMPE=24, RAMPE_P=8;   // N7a4b1: Hangring wie ortsflaeche.js RAMPE/RAMPE_P (Orte 24, Posten 8 Felder), damit die Wegsuche das eingeebnete Gelände sieht
function sperre(cx0,cy0,KOL){var fx0=cx0*ST,fy0=cy0*ST,fn=FEN*ST,mx=fx0+(fn>>1),my=fy0+(fn>>1),R=[],zx,zy,zx0,zx1,zy0,zy1;SPST.anfragen++;
 // Orte: Grenze aussenposten.halb (jedes Ortsbild passt seit N7a1b hinein), dann genau mit der Planbreite
 zx0=Math.floor((fx0-600)/G.ZF);zx1=Math.floor((fx0+fn+600)/G.ZF);zy0=Math.max(0,Math.floor((fy0-600)/G.ZF));zy1=Math.min(G.GH-1,Math.floor((fy0+fn+600)/G.ZF));
 for(zy=zy0;zy<=zy1;zy++)for(zx=zx0;zx<=zx1;zx++){var X=((zx%G.GW)+G.GW)%G.GW,z=zy*G.GW+X;if(!(A.ort[z]&15))continue;var k=O.ortNr(A,z);if(k==null)continue;
  var p=G.ortPunkt(seed,A,X,zy),h=AP.halb(O.groesse(seed,A,k))+2+RAMPE,dx=ab(p[0]-mx),dy=p[1]-my;if(Math.abs(dx)>h+(fn>>1)||Math.abs(dy)>h+(fn>>1))continue;
  var e=karte(k,function(){var q=planRoh(k);return{x0:q.L.x0,y0:q.L.y0,W:q.r.P.W,m:OS.maske(q.r.P,KOL,q.w.opt),h0:hoehe(q.L.punkt[0],q.L.punkt[1]),R:RAMPE}});   // N7a4b1: Höhe des Ortspunkts und Hang
  if(beruehrt(e.x0-e.R,e.y0-e.R,e.W+2*e.R,fx0,fy0,fn))R.push(e)}
 // Außenposten und Gehöfte: Orte im Umkreis PWEIT, Postenpunkt nahe genug → Plan und Karte
 zx0=Math.floor((fx0-PWEIT)/G.ZF);zx1=Math.floor((fx0+fn+PWEIT)/G.ZF);zy0=Math.max(0,Math.floor((fy0-PWEIT)/G.ZF));zy1=Math.min(G.GH-1,Math.floor((fy0+fn+PWEIT)/G.ZF));
 for(zy=zy0;zy<=zy1;zy++)for(zx=zx0;zx<=zx1;zx++){var X2=((zx%G.GW)+G.GW)%G.GW,z2=zy*G.GW+X2;if(!(A.ort[z2]&15))continue;var k2=O.ortNr(A,z2);if(k2==null)continue;
  var p2=G.ortPunkt(seed,A,X2,zy);if(Math.abs(ab(p2[0]-mx))>PWEIT+(fn>>1)||Math.abs(p2[1]-my)>PWEIT+(fn>>1))continue;
  postenVon(k2).forEach(function(q,n){if(Math.abs(ab(q.p.x-mx))>PMAX+2+RAMPE_P+(fn>>1)||Math.abs(q.p.y-my)>PMAX+2+RAMPE_P+(fn>>1))return;
   var e2;try{e2=karte(PK+k2*16+n,function(){var P=SB.postenPlan(q.opt),La=OB.postenLage(G,q.p,P);return{x0:La.x0,y0:La.y0,W:P.W,m:OS.maske(P,KOL,q.opt),h0:hoehe(La.punkt[0],La.punkt[1]),R:RAMPE_P}})}catch(x){return}   // scheitert ein Posten, fällt nur er weg (wie postenPlanen)
   if(beruehrt(e2.x0-e2.R,e2.y0-e2.R,e2.W+2*e2.R,fx0,fy0,fn))R.push(e2)})}
 R.sort(function(a,b){return a.k-b.k});return R}
// Eine Anfrage nach der anderen; zwischen zwei Plänen kommen neue Nachrichten (Vergessen, neue Welt) dran
function weiter(){if(laeuft||!schlange.length)return;laeuft=true;setTimeout(function(){laeuft=false;var a=schlange.shift();if(!a)return;
 if(a.gen!==gen||!A){weiter();return}
 if(a.s){Promise.all([daten(),kol()]).then(function(r){var m;try{var t=performance.now(),L=sperre(a.cx0,a.cy0,r[1]);m={art:'sperre',gen:a.gen,id:a.id,liste:L,ms:performance.now()-t}}
   catch(e){m={art:'sperre',gen:a.gen,id:a.id,fehler:String(e&&e.message||e)}}antwort(m);weiter()},
  function(e){antwort({art:'sperre',gen:a.gen,id:a.id,fehler:'daten: '+(e&&e.message||e)});weiter()});return}   // N7a4a2
 var p=a.k<0,k=p?-a.k-1:a.k;   // N7a2c: negative Nummer = Posten des Orts
 daten().then(function(){var m;try{m=p?postenPlanen(k):planen(k)}catch(e){m={k:k,fehler:String(e&&e.message||e)}}m.art=p?'posten':'plan';m.gen=a.gen;antwort(m);weiter()},
  function(e){antwort({art:p?'posten':'plan',gen:a.gen,k:k,fehler:'daten: '+(e&&e.message||e)});weiter()})},0)}
function nachricht(d){
 if(d.art==='welt'){if(d.gen===gen&&A&&(d.seed>>>0)===seed)return;   // N7a4a2: dieselbe Welt von Karte und Weltkern nur einmal
  gen=d.gen;seed=d.seed>>>0;A=d.ans||G.ansicht(d.buf.buffer);schlange.length=0;PLAN.clear();SP.clear();SPB=0;PPT.clear();daten();
  var sp=spaeter;spaeter=[];sp.forEach(function(q){if(q.gen===gen)nachricht(q)})}
 else if(d.art==='sperre'){if(d.gen!==gen||!A){if(d.gen>gen||!A){spaeter.push(d);if(spaeter.length>64)spaeter.shift()}return}   // N7a4a2: Welt noch nicht da → warten
  for(var s0=0;s0<schlange.length;s0++)if(schlange[s0].s&&schlange[s0].id===d.id)return;
  var n0=0;while(n0<schlange.length&&schlange[n0].s)n0++;schlange.splice(n0,0,{s:true,id:d.id,cx0:d.cx0,cy0:d.cy0,gen:d.gen});weiter()}   // vor Posten und Ortspläne: die Welt wartet darauf
 else if(d.art==='portWelt'){portW=d.port;if(portW)portW.onmessage=function(e){nachricht(e.data)}}
 else if(d.art==='plan'||d.art==='posten'){if(d.gen!==gen)return;var q=d.art==='posten'?-d.k-1:d.k;for(var i=0;i<schlange.length;i++)if(schlange[i].k===q)return;if(q<0)schlange.unshift({k:q,gen:d.gen});else schlange.push({k:q,gen:d.gen});weiter()}   // N7a2c: Posten (winzig) vor die Ortspläne
 else if(d.art==='vergiss'){var s=new Set(d.liste||[]);schlange=schlange.filter(function(a){return !s.has(a.k)})}
 else if(d.art==='port'){port=d.port;port.onmessage=function(e){nachricht(e.data)}}}
self.AT3ORTSKERN={nachricht:nachricht,planRoh:planRoh,planen:planen,postenPlanen:postenPlanen,PK:PK,daten:daten,sperre:sperre,kol:kol,stand:function(){return{karten:SP.size,bytes:SPB,ms:SPST.ms,maxMs:SPST.maxMs,gebaut:SPST.karten,anfragen:SPST.anfragen,masken:MST.n,maskeMs:MST.ms,maskeMaxMs:MST.maxMs,maskeStuecke:MST.stuecke,maskeBytes:MST.bytes}}};
if(!eingebettet)self.onmessage=function(e){nachricht(e.data)};
})();
