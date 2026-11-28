// WAS DIE DATEI TUT: Ortskern von Arena Theory 3.0 (Schritt N7a2a, Thomas 24.11.2026). Eigener Hintergrundkern, der die Ortspläne der echten Orte rechnet
// (ortsbild.js wahl/planen/lage → stadtbild.js plan), damit ein langer Plan (Großstadt bis 2,7 s) den Bildkern nie aufhält. Der Bildkern fragt über einen
// MessageChannel („plan“ mit Ortsnummer), der Ortskern antwortet mit Plan, Lage in Weltfeldern und der Höhe am Ortspunkt (eine Stufe für die ganze Ortsfläche).
// Gibt es keinen zweiten Hintergrundkern, lädt der Bildkern diese Datei selbst (importScripts, eingebettet) und plant in seinen Pausen (Regel 13: geht auch mit
// nur einem Hintergrundkern). Kein Spielzufall, kein Tick, nichts gespeichert: gleicher Seed + gleicher Ort = gleicher Plan auf jedem Gerät.
// Kosten: einmal je Ort, der in das Fenster des Bildkerns kommt; nie abhängig von der Weltgröße (Regel 14). Wiederverwendet: ortsbild.js (N7a1/N7a1b),
// stadtbild.js, stadtliste.js, landwirtschaft.js, orte.js, aussenposten.js, Höhe des Ortspunkts aus weltgen.js (ein Kartenstück).
// N7a2c (Thomas 24.11.2026): Anfrage „posten“ mit Ortsnummer → alle Außenposten und Gehöfte des Orts auf einmal (ortsbild.js posten/postenLage,
// stadtbild.js postenPlan, je Posten die Höhe am Postenpunkt). Klein: höchstens 8 Posten je Ort, Plan höchstens 18 × 18 Felder, im Mittel 0,2 ms.
// N7a3c1 (Thomas 25.11.2026): Mini-Plan für die Fernstufen (ortsbild.js mini) in jeder Planantwort, Anfrage „mini“ für ferne Orte ganz hinten; ?n7a3c1=0 aus.
// N7a4a2 (Thomas 24.11.2026): Anfrage „sperre“ des Weltkerns (eigener Kanal portWelt, im Weltkern eingebettet ohne eigenen Ortskern): Sperrkarten
// (ortssperre.js) aller Orte und Posten im Fenster einer Wegsuche, höchstens 2 MB gemerkt. Sperre-Anfragen kommen vor alle anderen (die Welt wartet darauf).
(function(){
'use strict';
var Q=self.location.search, eingebettet=!!self.AT3_ORTSKERN_EINGEBETTET;
// N7a4a2: im Weltkern eingebettet (AT3_ORTSKERN_SCHONEN) nur laden, was dort noch fehlt (Weltgenerator, Begehbarkeit und Natur des Weltkerns bleiben dieselben)
var DATEIEN=[['at3-64.js','AT3_64'],['baubild.js','AT3BAUBILD'],['baukasten.js','AT3_BAUKASTEN'],['weltgen.js','AT3WG'],['ortsnamen.js','AT3ORTSNAMEN'],['orte.js','AT3ORTE'],
 ['aussenposten.js','AT3POSTEN'],['ortsbild.js','AT3ORTSBILD'],['stadtliste.js','AT3_STADTLISTE'],['landwirtschaft.js','AT3LANDW'],['natur.js','AT3NATUR'],['begehbar.js','AT3BEGEH'],
 ['stadtbild.js','AT3_STADTBILD'],['ortssperre.js','AT3ORTSSPERRE'],['ortsanschluss.js','AT3ORTSANSCHLUSS']];
importScripts.apply(self,DATEIEN.filter(function(d){return !(self.AT3_ORTSKERN_SCHONEN&&self[d[1]])}).map(function(d){return d[0]+Q}));
var G=self.AT3WG, OA=self.AT3ORTSANSCHLUSS, SB=self.AT3_STADTBILD, OB=self.AT3ORTSBILD, O=self.AT3ORTE, AP=self.AT3POSTEN, ON=self.AT3ORTSNAMEN, SL=self.AT3_STADTLISTE, LW=self.AT3LANDW, OS=self.AT3ORTSSPERRE;
var D=null, laden=null, A=null, seed=0, gen=-1, puffer=null, port=null, portW=null, schlange=[], laeuft=false, spaeter=[];
function json(f){return fetch('daten/'+f+'.json'+Q).then(function(r){if(!r.ok)throw new Error(f+' '+r.status);return r.json()})}
function daten(){if(laden)return laden;
 laden=Promise.all(['gebaeude','rezepte','kulturen','religionen','landwirtschaft','waren'].map(json)).then(function(r){
  SB.setzeDaten(r[0]);SB.setzeLandw(LW.daten(r[4],r[0],r[5],r[1]));
  D={O:O,DD:O.daten(r[0],r[1],r[2]),SL:SL,SLD:SL.daten(r[0]),REL:r[3].religionen,KK:r[2].kulturkreise,WG:wg(r[5])};return D});return laden}
function wg(w){var m={};((w&&w.waren)||[]).forEach(function(x){if(x.gruppe)m[x.id]=x.gruppe});return m}   // N7f1: Ware → Warengruppe für die Marktstände
// N7a4a2: Kollisionstabelle der Kartei (hohe Dinge sperren) erst mit der ersten Sperrkarte
var kolL=null;function kol(){return kolL||(kolL=fetch('kartei/kollision.json'+Q).then(function(r){if(!r.ok)throw new Error('kollision '+r.status);return r.json()}))}
// Rohe Höhe am Ortspunkt (Weltfeld x, y): das Kartenstück dort einmal rechnen
function hoehe(x,y){puffer=puffer||new Uint8Array(G.GEL_BYTES);var cx=x>>6,cy=y>>6,b=G.ausschnitt(A,cx,cy,puffer);G.gelaende({seed:seed,cx:cx,cy:cy,daten:b});
 return new Uint16Array(b.buffer,b.byteOffset,G.FELDER)[((y&63)<<6)|(x&63)]}
// Ein Ort: Wahl, Plan (mit Ausweich-Seeds und Ersatz), Lage, Höhe. Fehler → {fehler} (der Bildkern lässt den Ort dann einfach weg)
// N7a4a2: die letzten Pläne kurz gemerkt (höchstens PLM), damit Bild und Sperrkarte desselben Orts nur einmal geplant werden
var PLM=4, PLAN=new Map();
// N7a5a1 (Thomas 24.11.2026): Wassermaske aus der Welt je Ort (ortsbild.js wasserMaske) in opt.welt, vor dem Plan; der Plan nutzt sie ab N7a5a2. Notausschalter ?n7a5a1=0.
var N7A5A1=!/[?&]n7a5a1=0/.test(Q),N7A5A2=!/[?&]n7a5a2=0/.test(Q),N7A5A3A=!/[?&]n7a5a3a=0/.test(Q),N7A5A3B=!/[?&]n7a5a3b=0/.test(Q),N7A5A3B2=!/[?&]n7a5a3b2=0/.test(Q),N7A5A3C1=!/[?&]n7a5a3c1=0/.test(Q),N7A5A3C2=!/[?&]n7a5a3c2=0/.test(Q), MST={n:0,ms:0,maxMs:0,stuecke:0,bytes:0};
// N7a5b1 (Thomas 25.11.2026): Maske mit Weltwegen (Schicht w), daraus je Ort einmal der Anschluss der Weltstraßen an die Ausgänge (ortsanschluss.js, p.an);
// deckt die Maske Plan + Hangring nicht, wird sie einmal größer geholt. Notausschalter ?n7a5b1=0 (kein Anschluss, Weltwege wie vorher).
var N7A5B2=!/[?&]n7a5b2=0/.test(Q);var N7A5B2B=!/[?&]n7a5b2b=0/.test(Q);var N7A5B3=!/[?&]n7a5b3=0/.test(Q);var N7A5C=!/[?&]n7a5c=0/.test(Q);   // N7a5c: Höfe und Flur natürlich (stadtbild.js opt.flurNatur)
   // N7a5b3: Stichwege zu Feldern, leere Feldwege gekappt (stadtbild.js opt.feldAnschluss)
   // N7a5b2b: geschwungene Ausfallstraßen vor dem Ort und im Flurgürtel (stadtbild.js opt.schwungAussen)
   // N7a5b2a: geschwungene Wege in Weilern und Dörfern (stadtbild.js opt.schwung)
var N7A5B1=!/[?&]n7a5b1=0/.test(Q)&&!!OA, AST={n:0,ms:0,maxMs:0,eintraege:0,fehler:0};
function anschluss(p,k,w){if(!N7A5B1||!w.opt.welt)return;var t=performance.now();
 var RH=p.H?p.H.R:RAMPE;if(p.r.P.W+2*RH>w.opt.welt.N)w.opt.welt=maske(k,w,p.r.P.W+2*RH+32);
 try{var a=OA.rechnen(w.opt.welt,p.L,p.r.P,RH,G.GW*G.ZF);if(a.fehler){AST.fehler++;return}p.an={x0:a.x0,y0:a.y0,n:a.n,liste:a.liste};p.anSt=a.st;AST.eintraege=a.liste.length>>1}catch(e){AST.fehler++;return}
 var d=performance.now()-t;AST.n++;AST.ms=d;if(d>AST.maxMs)AST.maxMs=d}
function maske(k,w,nMin){var p=OB.punkt(G,seed,A,k),M=OB.wasserMaske(G,seed,A,k,w.roh.g,hoehe(p[0],p[1]),puffer,nMin,N7A5B1);MST.n++;MST.ms=M.ms;if(M.ms>MST.maxMs)MST.maxMs=M.ms;MST.stuecke=M.stuecke;MST.bytes=M.m.length;return M}
function planRoh(k){var p=PLAN.get(k);if(p){PLAN.delete(k);PLAN.set(k,p);return p}var w=OB.wahl(seed,A,k,D,ON);if(N7A5A1)w.opt.welt=maske(k,w);if(!N7A5A2)w.opt.weltwasser=false;if(!N7A5A3A)w.opt.stadtwasser=false;if(!N7A5A3B)w.opt.meerstadt=false;if(!N7A5A3B2)w.opt.meerhafen=false;if(!N7A5A3C1)w.opt.bergWasser=false;if(!N7A5A3C2)w.opt.anpassen=false;if(!N7A5B2)w.opt.schwung=false;if(!N7A5B2B)w.opt.schwungAussen=false;if(!N7A5B3)w.opt.feldAnschluss=false;if(!N7A5C)w.opt.flurNatur=false;var r=OB.planen(SB,w.opt);
 // N7a5a2: um das Wasser gewachsener Plan größer als die Maske (Plan + Hangring): Maske passend neu holen und neu planen (höchstens 2-mal, dann deckt sie)
 for(var mz=0;mz<2&&r.P.weltwasser&&w.opt.welt.wasser>0&&r.P.W+2*OB.MASKE_R>w.opt.welt.N;mz++){w.opt.welt=maske(k,w,r.P.W+2*OB.MASKE_R+32);r=OB.planen(SB,w.opt);MST.neu=(MST.neu|0)+1}p={w:w,r:r,L:OB.lage(G,seed,A,k,r.P)};p.h0=hoehe(p.L.punkt[0],p.L.punkt[1]);p.H=hangR(p.L.x0,p.L.y0,r.P.W,p.h0,RAMPE);anschluss(p,k,w);   // N7a7: Hangbreite vor dem Anschluss
 PLAN.set(k,p);while(PLAN.size>PLM)PLAN.delete(PLAN.keys().next().value);return p}
function planen(k){var t=performance.now(),q=planRoh(k),w=q.w,r=q.r,L=q.L;
 var m={k:k,g:w.roh.g,name:w.name,P:r.P,lage:L,h0:q.h0,R:q.H.R,RS:q.H.RS,FS:q.H.FS,ersatz:r.ersatz||null,ausweich:r.ausweich||0,an:q.an||null,ms:performance.now()-t};if(N7A3C1)m.mini=miniAus(q);return m}
// N7a3c1 (Thomas 25.11.2026): Mini-Plan der Fernstufen (ortsbild.js mini, W² Byte) aus dem Plan; jede Planantwort bringt ihn mit, ferne Orte fragen mit „mini“
// (Warteschlange hinter Sperre, Posten und Plan; gemerkter Plan PLAN, sonst planen). Notausschalter ?n7a3c1=0.
var N7A3C1=!/[?&]n7a3c1=0/.test(Q);
function miniAus(q){var P=q.r.P;return{x0:q.L.x0,y0:q.L.y0,W:P.W,m:OB.mini(P,self.AT3_BAUKASTEN,self.AT3_64,OS&&OS.weltBodenP?OS.weltBodenP(P,q.L.x0,q.L.y0):null)}}
function miniPlanen(k){var t=performance.now(),q=planRoh(k),o=miniAus(q);o.k=k;o.ms=performance.now()-t;return o}
// N7a2c: Außenposten und Gehöfte des Orts k; Kennung je Posten = PK + k * 16 + n (getrennt von den Ortsnummern), scheitert ein Posten, fällt nur er weg
var PK=1048576;
// N7a5a2b (Thomas 25.11.2026): Wassermaske je Posten (Seite POSTEN_N um den Postenpunkt, deckt Plan 18 + Hangring 8 je Seite), nasse Posten mit der Wasserseite aus
// der Maske bzw. der Suche bis rund ±96 Felder (ortsbild.js wasserSuche). Kartenstücke dafür kurz gemerkt (höchstens STM), Höhe am Postenpunkt aus demselben Merker.
// Notausschalter ?n7a5a2b=0 (Posten wie vorher). Gleiches Ergebnis für Bild und Sperrkarte (beide über postenOpt).
var N7A5A2B=!/[?&]n7a5a2b=0/.test(Q)&&N7A5A2, POSTEN_N=40, STM=12, STK=new Map(), PNASS={fisher:1,'sea-fishery':1,'reed-cutter':1,'peat-cut':1,'salt-pan':1,'gold-wash':1},
 PMST={n:0,ms:0,maxMs:0,suchen:0,stuecke:0};
function stueck(cx,cy){var key=cx*8192+cy,b=STK.get(key);if(b){STK.delete(key);STK.set(key,b);return b}b=G.ausschnitt(A,cx,cy,new Uint8Array(G.GEL_BYTES));G.gelaende({seed:seed,cx:cx,cy:cy,daten:b});
 PMST.stuecke++;STK.set(key,b);while(STK.size>STM)STK.delete(STK.keys().next().value);return b}
function hoeheS(x,y){var b=stueck(x>>6,y>>6);return new Uint16Array(b.buffer,b.byteOffset,G.FELDER)[((y&63)<<6)|(x&63)]}
// N7a7 (Thomas 26.11.2026): Hang wächst mit dem Gelände. Hangbreite R je Ort bzw. Posten einmal aus der Welt: größter Höhenunterschied zu h0 auf dem Ring im
// Abstand R um die Planfläche (jedes 2. Feld, Wasser zählt nicht), daraus R = Stufen + Saum (R0/4) + 1, mindestens R0 (24 bzw. 8), höchstens RMAX, bis es passt
// (höchstens 12 Runden). Bleibt am Ende mehr als RMAX nötig, FS = Felsstufe (Bild: Fels-Boden statt glatter Wand). Kartenstücke einmal je Rechnung (eigener kurzer Merker).
// Notausschalter ?n7a7=0 (feste 24 bzw. 8 Felder wie vorher). Gleicher Wert für Bild, Sperrkarte und Straßenanschluss.
var N7A7=!/[?&]n7a7=0/.test(Q), HST={n:0,ms:0,maxMs:0,gewachsen:0,fels:0,maxR:0};
function ringMax(x0,y0,W,d,h0,C){var WXf=G.GW*G.ZF,WYf=G.GH*G.ZF,m=0,a=x0-d,b=x0+W-1+d,c=y0-d,e=y0+W-1+d;
 function f(x,y){if(y<0||y>=WYf)return;x%=WXf;if(x<0)x+=WXf;var ck=(x>>6)*8192+(y>>6),s=C.get(ck);if(!s){s=G.ausschnitt(A,x>>6,y>>6,new Uint8Array(G.GEL_BYTES));G.gelaende({seed:seed,cx:x>>6,cy:y>>6,daten:s});C.set(ck,s)}var q=((y&63)<<6)|(x&63),bi=s[G.FELDER*2+q];if(bi<2||bi===10||bi===11)return;
  var h=new Uint16Array(s.buffer,s.byteOffset,G.FELDER)[q],u=h>h0?h-h0:h0-h;if(u>m)m=u}
 for(var x=a;x<=b;x+=2){f(x,c);f(x,e)}for(var y=c;y<=e;y+=2){f(a,y);f(b,y)}return m}
function hangR(x0,y0,W,h0,R0){if(!N7A7)return{R:R0,RS:R0,FS:false};var t=performance.now(),R=R0,FS=false,s=Math.ceil(R0/4)+1,C=new Map();   // C: Kartenstücke nur für diese Rechnung (jedes höchstens einmal)
 for(var n=0;n<12;n++){var need=Math.ceil(ringMax(x0,y0,W,R,h0,C)/64)+s;if(need<=R)break;if(need>RMAX){if(R===RMAX){FS=true;break}R=RMAX;continue}R=need}
 if(R===RMAX&&!FS&&Math.ceil(ringMax(x0,y0,W,R,h0,C)/64)+s>R)FS=true;
 var d=performance.now()-t;HST.n++;HST.ms=d;if(d>HST.maxMs)HST.maxMs=d;if(R>R0)HST.gewachsen++;if(FS)HST.fels++;if(R>HST.maxR)HST.maxR=R;return{R:R,RS:R0,FS:FS}}
function postenOpt(q){if(!N7A5A2B)return q.opt;var t=performance.now(),x=q.p.x,y=q.p.y,M=OB.wasserMaskeAm(G,seed,A,x,y,POSTEN_N,hoeheS(x,y),null,stueck),o=Object.assign({},q.opt,{welt:M});
 if(PNASS[q.opt.art]){var se=M.wasser?OB.maskeWasserSeite(M):null;if(!se){var su=OB.wasserSuche(G,A,x,y,stueck);PMST.suchen++;se=su.seite}if(se)o.wasser=se}
 var d=performance.now()-t;PMST.n++;PMST.ms=d;if(d>PMST.maxMs)PMST.maxMs=d;return o}
function postenPlanen(k){var t=performance.now(),w=OB.wahl(seed,A,k,D,ON),L=OB.posten(G,seed,A,k,D,AP,w,stueck),r=[];
 L.forEach(function(q,n){try{var P=SB.postenPlan(postenOpt(q)),La=OB.postenLage(G,q.p,P);var h0=hoehe(La.punkt[0],La.punkt[1]),H=hangR(La.x0,La.y0,P.W,h0,RAMPE_P);r.push({k:PK+k*16+n,ort:k,art:q.opt.art,P:P,lage:La,h0:h0,R:H.R,RS:H.RS,FS:H.FS})}catch(x){}});
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
function gr(e){return e.m.length+(e.an?e.an.liste.byteLength:0)}
function merke(e){SP.set(e.k,e);SPB+=gr(e);while(SPB>SP_MAX&&SP.size>1){var a=SP.keys().next().value;SPB-=gr(SP.get(a));SP.delete(a)}return e}
function karte(k,bau){var e=SP.get(k);if(e){SP.delete(k);SP.set(k,e);return e}var t=performance.now();e=bau();e.k=k;var d=performance.now()-t;SPST.karten++;SPST.ms=d;if(d>SPST.maxMs)SPST.maxMs=d;return merke(e)}
// Postenpunkte eines Orts ohne Plan (Plan erst, wenn der Posten das Fenster berührt)
function postenVon(k){var L=PPT.get(k);if(L){PPT.delete(k);PPT.set(k,L);return L}var w=OB.wahl(seed,A,k,D,ON);L=OB.posten(G,seed,A,k,D,AP,w,stueck);PPT.set(k,L);
 while(PPT.size>PPT_MAX)PPT.delete(PPT.keys().next().value);return L}
var PMAX=9;   // halbe Fläche des größten Postenplans (18 × 18, ortsflaeche.js PMAX)
var RAMPE=24, RAMPE_P=8, RMAX=128;   // N7a7: RMAX größte Hangbreite (Vorschlag Regel 11)   // N7a4b1: Hangring wie ortsflaeche.js RAMPE/RAMPE_P (Orte 24, Posten 8 Felder), damit die Wegsuche das eingeebnete Gelände sieht
function sperre(cx0,cy0,KOL){var fx0=cx0*ST,fy0=cy0*ST,fn=FEN*ST,mx=fx0+(fn>>1),my=fy0+(fn>>1),R=[],zx,zy,zx0,zx1,zy0,zy1;SPST.anfragen++;
 // Orte: Grenze aussenposten.halb (jedes Ortsbild passt seit N7a1b hinein), dann genau mit der Planbreite
 zx0=Math.floor((fx0-600)/G.ZF);zx1=Math.floor((fx0+fn+600)/G.ZF);zy0=Math.max(0,Math.floor((fy0-600)/G.ZF));zy1=Math.min(G.GH-1,Math.floor((fy0+fn+600)/G.ZF));
 for(zy=zy0;zy<=zy1;zy++)for(zx=zx0;zx<=zx1;zx++){var X=((zx%G.GW)+G.GW)%G.GW,z=zy*G.GW+X;if(!(A.ort[z]&15))continue;var k=O.ortNr(A,z);if(k==null)continue;
  var p=G.ortPunkt(seed,A,X,zy),h=AP.halb(O.groesse(seed,A,k))+2+RMAX,dx=ab(p[0]-mx),dy=p[1]-my;if(Math.abs(dx)>h+(fn>>1)||Math.abs(dy)>h+(fn>>1))continue;
  var e=karte(k,function(){var q=planRoh(k);return{x0:q.L.x0,y0:q.L.y0,W:q.r.P.W,m:OS.maske(q.r.P,KOL,q.w.opt,q.L.x0,q.L.y0),h0:q.h0,R:q.H.R,RS:q.H.RS,ww:q.r.P.weltwasser?1:0,sk:q.r.P.senke||null,an:q.an||null}});   // N7a4b1: Höhe des Ortspunkts und Hang
  if(beruehrt(e.x0-e.R,e.y0-e.R,e.W+2*e.R,fx0,fy0,fn))R.push(e)}
 // Außenposten und Gehöfte: Orte im Umkreis PWEIT, Postenpunkt nahe genug → Plan und Karte
 zx0=Math.floor((fx0-PWEIT)/G.ZF);zx1=Math.floor((fx0+fn+PWEIT)/G.ZF);zy0=Math.max(0,Math.floor((fy0-PWEIT)/G.ZF));zy1=Math.min(G.GH-1,Math.floor((fy0+fn+PWEIT)/G.ZF));
 for(zy=zy0;zy<=zy1;zy++)for(zx=zx0;zx<=zx1;zx++){var X2=((zx%G.GW)+G.GW)%G.GW,z2=zy*G.GW+X2;if(!(A.ort[z2]&15))continue;var k2=O.ortNr(A,z2);if(k2==null)continue;
  var p2=G.ortPunkt(seed,A,X2,zy);if(Math.abs(ab(p2[0]-mx))>PWEIT+(fn>>1)||Math.abs(p2[1]-my)>PWEIT+(fn>>1))continue;
  postenVon(k2).forEach(function(q,n){if(Math.abs(ab(q.p.x-mx))>PMAX+2+RMAX+(fn>>1)||Math.abs(q.p.y-my)>PMAX+2+RMAX+(fn>>1))return;
   var e2;try{e2=karte(PK+k2*16+n,function(){var o=postenOpt(q),P=SB.postenPlan(o),La=OB.postenLage(G,q.p,P);var h0=hoehe(La.punkt[0],La.punkt[1]),H=hangR(La.x0,La.y0,P.W,h0,RAMPE_P);return{x0:La.x0,y0:La.y0,W:P.W,m:OS.maske(P,KOL,o,La.x0,La.y0),h0:h0,R:H.R,RS:H.RS,ww:P.weltwasser?1:0,sk:P.senke||null}})}catch(x){return}   // scheitert ein Posten, fällt nur er weg (wie postenPlanen)
   if(beruehrt(e2.x0-e2.R,e2.y0-e2.R,e2.W+2*e2.R,fx0,fy0,fn))R.push(e2)})}
 R.sort(function(a,b){return a.k-b.k});return R}
// Eine Anfrage nach der anderen; zwischen zwei Plänen kommen neue Nachrichten (Vergessen, neue Welt) dran
function weiter(){if(laeuft||!schlange.length)return;laeuft=true;setTimeout(function(){laeuft=false;var a=schlange.shift();if(!a)return;
 if(a.gen!==gen||!A){weiter();return}
 if(a.s){Promise.all([daten(),kol()]).then(function(r){var m;try{var t=performance.now(),L=sperre(a.cx0,a.cy0,r[1]);m={art:'sperre',gen:a.gen,id:a.id,liste:L,ms:performance.now()-t}}
   catch(e){m={art:'sperre',gen:a.gen,id:a.id,fehler:String(e&&e.message||e)}}antwort(m);weiter()},
  function(e){antwort({art:'sperre',gen:a.gen,id:a.id,fehler:'daten: '+(e&&e.message||e)});weiter()});return}   // N7a4a2
 if(a.mini){daten().then(function(){var m;try{m=miniPlanen(a.k)}catch(e){m={k:a.k,fehler:String(e&&e.message||e)}}m.art='mini';m.gen=a.gen;antwort(m);weiter()},
  function(e){antwort({art:'mini',gen:a.gen,k:a.k,fehler:'daten: '+(e&&e.message||e)});weiter()});return}   // N7a3c1
 var p=a.k<0,k=p?-a.k-1:a.k;   // N7a2c: negative Nummer = Posten des Orts
 daten().then(function(){var m;try{m=p?postenPlanen(k):planen(k)}catch(e){m={k:k,fehler:String(e&&e.message||e)}}m.art=p?'posten':'plan';m.gen=a.gen;antwort(m);weiter()},
  function(e){antwort({art:p?'posten':'plan',gen:a.gen,k:k,fehler:'daten: '+(e&&e.message||e)});weiter()})},0)}
function nachricht(d){
 if(d.art==='welt'){if(d.gen===gen&&A&&(d.seed>>>0)===seed)return;   // N7a4a2: dieselbe Welt von Karte und Weltkern nur einmal
  gen=d.gen;seed=d.seed>>>0;A=d.ans||G.ansicht(d.buf.buffer);schlange.length=0;PLAN.clear();SP.clear();SPB=0;PPT.clear();STK.clear();daten();
  var sp=spaeter;spaeter=[];sp.forEach(function(q){if(q.gen===gen)nachricht(q)})}
 else if(d.art==='sperre'){if(d.gen!==gen||!A){if(d.gen>gen||!A){spaeter.push(d);if(spaeter.length>64)spaeter.shift()}return}   // N7a4a2: Welt noch nicht da → warten
  for(var s0=0;s0<schlange.length;s0++)if(schlange[s0].s&&schlange[s0].id===d.id)return;
  var n0=0;while(n0<schlange.length&&schlange[n0].s)n0++;schlange.splice(n0,0,{s:true,id:d.id,cx0:d.cx0,cy0:d.cy0,gen:d.gen});weiter()}   // vor Posten und Ortspläne: die Welt wartet darauf
 else if(d.art==='portWelt'){portW=d.port;if(portW)portW.onmessage=function(e){nachricht(e.data)}}
 else if(d.art==='plan'||d.art==='posten'){if(d.gen!==gen)return;var q=d.art==='posten'?-d.k-1:d.k;for(var i=0;i<schlange.length;i++)if(schlange[i].k===q)return;if(q<0)schlange.unshift({k:q,gen:d.gen});else{var n1=0;while(n1<schlange.length&&!schlange[n1].mini)n1++;schlange.splice(n1,0,{k:q,gen:d.gen})}weiter()}   // N7a2c: Posten (winzig) vor die Ortspläne
 else if(d.art==='mini'){if(d.gen!==gen||!N7A3C1)return;for(var i2=0;i2<schlange.length;i2++)if(schlange[i2].mini&&schlange[i2].k===d.k)return;schlange.push({k:d.k,gen:d.gen,mini:true});weiter()}   // N7a3c1: ganz hinten
 else if(d.art==='vergiss'){var s=new Set(d.liste||[]);schlange=schlange.filter(function(a){return a.mini||!s.has(a.k)})}
 else if(d.art==='port'){port=d.port;port.onmessage=function(e){nachricht(e.data)}}}
self.AT3ORTSKERN={nachricht:nachricht,planRoh:planRoh,planen:planen,miniPlanen:miniPlanen,postenPlanen:postenPlanen,postenOpt:postenOpt,PK:PK,daten:daten,sperre:sperre,kol:kol,stand:function(){return{karten:SP.size,bytes:SPB,ms:SPST.ms,maxMs:SPST.maxMs,gebaut:SPST.karten,anfragen:SPST.anfragen,masken:MST.n,maskeMs:MST.ms,maskeMaxMs:MST.maxMs,maskeStuecke:MST.stuecke,maskeBytes:MST.bytes,anschluss:AST.n,anschlussMs:AST.ms,anschlussMaxMs:AST.maxMs,anschlussFehler:AST.fehler,postenMasken:PMST.n,postenMaskeMs:PMST.ms,postenMaskeMaxMs:PMST.maxMs,postenSuchen:PMST.suchen,postenStuecke:PMST.stuecke,hang:HST.n,hangMs:HST.ms,hangMaxMs:HST.maxMs,hangGewachsen:HST.gewachsen,hangFels:HST.fels,hangMaxR:HST.maxR}},hangR:hangR,RMAX:RMAX};
if(!eingebettet)self.onmessage=function(e){nachricht(e.data)};
})();
