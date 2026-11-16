// WAS DIE DATEI TUT: Karren im Weltkern von Arena Theory 3.0 (Schritt G6c1): Pendel-Automatik (jedes Lager mit fertigem Tor bekommt von selbst einen
// Ochsenkarren, der leer zur nächsten Weltstraße fährt, dort kurz hält und zurück zur Ladestelle fährt, immer wieder), Bewegung im Tick, ein Karren je Feld,
// Wegaufträge auf den Helferkernen, Wegversion, Spielstand, Fingerabdruck. Reine Rechnung ohne Bildschirm, nur ganze Zahlen.
// Entscheidungen Thomas (16.11.2026): G6c in G6c1/G6c2 geteilt; Ziel = nächste Weltstraße (Netzstraße aus W1b), gibt es keine im Fenster, das Ende des
// gebauten Wegs; Tempo 1 Feld/s × Bodentempo aus begehbar.js; Karren entstehen automatisch und kostenlos (Preise später).
// Ablauf je Karren: sucht (Wegauftrag „kweg“ an einen Helfer) → fährt (Feld für Feld, das nächste Feld wird vorher belegt) → hält (Ladestelle 3 s, Straße 1 s)
// → fährt den umgedrehten Weg zurück (spart eine Suche). Steht ein Weg nicht mehr (Bau geändert: Wegversion je Kartenstück, bau.js wt), wird der Rest des
// Wegs im jetzigen Zustand nachgeprüft; noch befahrbar gilt er, sonst eine neue Suche ab dem jetzigen Feld. Ohne Weg: stehen und erst nach 10 s wieder suchen
// (keine Dauersuche). Ladestelle seitlich: ein Lagerfeld neben dem Feld hinter dem Tor, nicht in der Durchfahrt. Gehalten wird nur auf Feldmitten, nie im Tor.
// G6c2 (16.11.2026, Entscheidungen Thomas: Ausweichen auf breiten Wegen, Vorrang nach 5 s Warten, kleines Zeichen über wartenden Karren):
// Engstelle = Wegfeld ohne befahrbares Nachbarfeld quer zur Fahrtrichtung; beide Felder an einem Tor zählen immer als Engstelle. Mehrere am Stück = Abschnitt.
// Vor dem ersten Feld reserviert der Karren den ganzen Abschnitt mit Einfahrtsrichtung je Feld (Code); gleiche Richtung darf dicht folgen, Gegenverkehr wartet
// auf dem letzten breiten Feld davor (gehalten wird nur auf Feldmitten, also nie im Tor). Endet der Weg im Abschnitt oder direkt dahinter (Sackgasse,
// Wendepunkt an der Straße oder an der Ladestelle), gehört das Ziel dazu und der Abschnitt gilt für einen Karren allein. Freigabe je Feld beim Verlassen. Vorrang: wer 5 s vor einem Abschnitt wartet, meldet Anspruch; Neue aus der Gegenrichtung fahren dann nicht mehr ein
// (älteres Warten zuerst, bei Gleichstand die kleinere Nummer); wer schon im Abschnitt steht, darf immer hinaus. Ausweichen: stehen sich zwei Karren
// gegenüber (jeder will auf das Feld des anderen), weicht einer quer aufs freie Nachbarfeld aus (Spurwechsel, sonst Platz machen und zurück).
// Reservierungen je Karren (rs) stehen im Spielstand, die Sammelkarte (res), Ansprüche (ans) und Engstellen je Weg (eng) werden abgeleitet.
// Zustand (z.kar, entsteht erst mit dem ersten Karren; ohne Lager mit Tor bleibt der Fingerabdruck wie bisher): nr (nächste Karren-Nummer), k (Karren nach Nummer),
// bel (Feld → Karren, abgeleitet, nicht im Spielstand), res (Feld → [Karren, Code …], abgeleitet aus rs), ans (Ansprüche, je Tick neu).
// Kerne: nur Weltkern (Regel 13), die Suchen auf den Helfern (wegsuche.js, Modus „Anschluss“). Kosten: je Karren und Tick fest, Abgleich der Lager nur, wenn
// sich in den letzten 20 Ticks etwas am Bau geändert hat; nichts hängt von der Weltgröße ab (Regel 14). Höchstens 64 Karren (Vorschlag).
// Wiederverwendet: Wegsuche und Fenster aus G6b (wegsuche.js, wegstrom.fenster/nah), Nachprüfen des Wegs wie wegstrom.gilt (Kopie), Begehbarkeit aus G6a,
// Räume und Tore aus G5 (bau.js feld/kante), Laufen entlang einer Feldliste wie die Besucher aus 2.0 welt-besucher.js (als Muster).
(function(root){
'use strict';
function SU(){return root.AT3WEG||(typeof module!=='undefined'&&module.exports?require('./wegsuche.js'):null)}
function WE(){return root.AT3WEGSTROM||(typeof module!=='undefined'&&module.exports?require('./wegstrom.js'):null)}
function BG(){return root.AT3BEGEH||(typeof module!=='undefined'&&module.exports?require('./begehbar.js'):null)}
function BAU(){return root.AT3BAU||(typeof module!=='undefined'&&module.exports?require('./bau.js'):null)}
var ST=64, SX=9600, SY=4800, WX=ST*SX, WY=ST*SY, STAND=2;
var MAX_K=64, JE_TICK=2, FRIST=20, PRUEF=20, HALT_LADE=60, HALT_STR=20, WIEDER=200, MAX_VERSUCH=4, WARTE_GRUND=60, ALT=100;   // Vorschlagswerte (Ticks: 20 = 1 s); ALT = Vorrang nach 5 s (Thomas)
var LEN_O=256000, LEN_D=362039, VF=128;      // Feldlänge gerade/schräg in 1/1000 von 1/256 Feld; je Tick Tempo × 128 → Tempo 100 = 1 Feld/s
var Z_SUCHT=0, Z_FAEHRT=1, Z_HAELT=2, Z_STEHT=3, ZUST=['seeks','drives','halts','stuck'];
// Gründe: 1–6 wie wegsuche.js (no_path, no_map, start_blocked, goal_blocked, no_road, no_town), 8 changed, 9 no_world, 10 waits_cart (Feld besetzt),
// 11 waits_narrow (Gegenverkehr in der Engstelle), 12 waits_gate (Gegenverkehr am Tor)
var GRUND=['','no_path','no_map','start_blocked','goal_blocked','no_road','no_town','busy','changed','no_world','waits_cart','waits_narrow','waits_gate'];
var DX=[0,-1,0,1], DY=[-1,0,1,0];
function umX(X){return X<0?X+WX:X>=WX?X-WX:X}
function umS(c){return c<0?c+SX:c>=SX?c-SX:c}
function fk(X,Y){return X*WY+Y}
function dx1(a,b){var d=b-a;return d>1?d-WX:d<-1?d+WX:d}
function neu(){return{nr:1,k:[],bel:new Map(),res:new Map(),ans:null}}

// ── Lager mit fertigem Tor: Einfahrt und Ladestelle (seitlich neben dem Feld hinter dem Tor, sonst dahinter, sonst das Feld selbst) ──
function imRaum(z,X,Y,id){var f=BAU().feld(z,umX(X),Y);return !!f&&f.raum===id}
function einfahrt(z,r){var B=BAU(),id=r.id,Q=[r.hx,r.hy],ges=new Set([fk(r.hx,r.hy)]),i,s;
 if(!imRaum(z,r.hx,r.hy,id))return null;
 for(i=0;i<Q.length;i+=2){var X=Q[i],Y=Q[i+1];
  for(s=0;s<4;s++){var nx=umX(X+DX[s]),ny=Y+DY[s];if(ny<0||ny>=WY)continue;
   if(imRaum(z,nx,ny,id)){var k=fk(nx,ny);if(!ges.has(k)&&ges.size<B.MAX_RAUM){ges.add(k);Q.push(nx,ny)}continue}
   var e=B.kante(z,X,Y,s);if(!e||e.typ!==B.K_TOR||e.zustand!==B.Z_FERTIG)continue;
   var sw=s===0||s===2?[1,3]:[0,2],L=[[X+DX[sw[0]],Y+DY[sw[0]]],[X+DX[sw[1]],Y+DY[sw[1]]],[X+DX[(s+2)&3],Y+DY[(s+2)&3]]];
   for(var j=0;j<L.length;j++)if(L[j][1]>=0&&L[j][1]<WY&&imRaum(z,L[j][0],L[j][1],id))return{raum:id,lx:umX(L[j][0]),ly:L[j][1]};
   return{raum:id,lx:X,ly:Y}}}
 return null}
function frisch(b,t){var ja=false;b.wt.forEach(function(v){if(v>=t-PRUEF-1)ja=true});return ja}
// Abgleich: Karren für neue Lager mit Tor, weg mit Karren, deren Lager oder Tor fehlt; Ladestelle nachführen.
function abgleich(z){var b=z.bau,L=[],g=z.kar,i;
 b.raeume.forEach(function(r){if(r.art===1){var e=einfahrt(z,r);if(e)L.push(e)}});
 if(!g&&!L.length)return;if(!g)g=z.kar=neu();
 var M=new Map();for(i=0;i<L.length;i++)M.set(L[i].raum,L[i]);
 for(i=g.k.length-1;i>=0;i--){var c=g.k[i],e=M.get(c.raum);if(!e){loesen(g,c);g.k.splice(i,1);continue}c.lx=e.lx;c.ly=e.ly;M.delete(c.raum)}
 for(i=0;i<L.length&&g.k.length<MAX_K;i++){var e2=L[i];if(!M.has(e2.raum))continue;var k=fk(e2.lx,e2.ly);if(g.bel.has(k))continue;
  var c2=karren(g.nr++,e2.raum,e2.lx,e2.ly);g.k.push(c2);g.bel.set(k,c2.id)}}
function karren(id,raum,lx,ly){return{id:id,raum:raum,lx:lx,ly:ly,x:lx,y:ly,nx:-1,ny:-1,sub:0,len:0,ziel:0,zust:Z_SUCHT,t:0,i:0,ab:0,job:-1,versuch:0,grund:0,warte:0,dir:0,
 voll:0,ende:0,sx:-1,sy:-1,pf:null,tp:null,keys:[],rs:[],alt:0,eng:null}}
function loesen(g,c){if(g.bel.get(fk(c.x,c.y))===c.id)g.bel.delete(fk(c.x,c.y));if(c.nx>=0&&g.bel.get(fk(c.nx,c.ny))===c.id)g.bel.delete(fk(c.nx,c.ny));frei(g,c,-1)}

// ── G6c2 Reservierungen: c.rs = [Feld, Code, …], g.res = Feld → [Karren, Code, …] ──
function resAdd(g,k,id,code){var a=g.res.get(k);if(!a){g.res.set(k,[id,code]);return}for(var i=0;i<a.length;i+=2)if(a[i]===id){a[i+1]=code;return}a.push(id,code)}
function resDel(g,k,id){var a=g.res.get(k);if(!a)return;for(var i=0;i<a.length;i+=2)if(a[i]===id){a.splice(i,2);break}if(!a.length)g.res.delete(k)}
function halte(g,c,k,code){for(var i=0;i<c.rs.length;i+=2)if(c.rs[i]===k){c.rs[i+1]=code;resAdd(g,k,c.id,code);return}c.rs.push(k,code);resAdd(g,k,c.id,code)}
function gib(g,c,k){for(var i=0;i<c.rs.length;i+=2)if(c.rs[i]===k){c.rs.splice(i,2);resDel(g,k,c.id);return}}
function haelt(c,k){for(var i=0;i<c.rs.length;i+=2)if(c.rs[i]===k)return true;return false}
// alles freigeben außer dem Feld behalt (−1 = alles); der Karren steht weiter auf seinem Feld und hält es, wenn es eine Engstelle war
function frei(g,c,behalt){for(var i=c.rs.length-2;i>=0;i-=2)if(c.rs[i]!==behalt){resDel(g,c.rs[i],c.id);c.rs.splice(i,2)}}
// Befahrbarkeit fürs Karrenprofil im jetzigen Zustand; fehlt ein Kartenstück, gilt das Feld als gesperrt (und das Ergebnis wird nicht gemerkt)
function pruefer(z){var w=z.wg,B=BG(),M=new Map(),seed=w.seed>>>0,P={fehlt:false};
 function hole(cx,cy){var p=w.stuecke.get(umS(cx)*8192+cy)||null;if(!p)P.fehlt=true;return p}
 function holeB(cx,cy){var k=umS(cx)*8192+cy;if(!M.has(k))M.set(k,BAU().stueck(z.bau,k));return M.get(k)}
 P.sch=function(X,Y,s){return B.schritt(hole,holeB,seed,umX(X),Y,s,1)>0};P.tempo=function(X,Y){return B.tempo(hole,holeB,seed,umX(X),Y,1)};return P}
function vc(dx,dy){return(dy+1)*3+dx+1}
// Engstellen je Wegfeld: 0 breit, 1 Engstelle, 2 am Tor (beide Felder einer Torkante); schräge Schritte sind nie eng
function engstellen(z,c){if(c.eng)return c.eng;var pf=c.pf,n=pf.length>>1,e=new Uint8Array(n),P=pruefer(z),Bu=BAU(),j;
 for(j=0;j<n;j++){var X=pf[j*2],Y=pf[j*2+1],dx,dy;
  if(j<n-1){dx=dx1(X,pf[j*2+2]);dy=pf[j*2+3]-Y}else if(j){dx=dx1(pf[j*2-2],X);dy=Y-pf[j*2-1]}else continue;
  if(j<n-1&&!(dx&&dy)){var s=dx?(dx<0?1:3):(dy<0?0:2),kk=Bu.kante(z,X,Y,s);if(kk&&kk.typ===Bu.K_TOR){e[j]=2;e[j+1]=2}}
  if(e[j]||(dx&&dy))continue;
  if(dx?(!P.sch(X,Y,0)&&!P.sch(X,Y,2)):(!P.sch(X,Y,1)&&!P.sch(X,Y,3)))e[j]=1}
 if(!P.fehlt)c.eng=e;return e}
// Gewünschter Abschnitt vor dem nächsten Schritt: von i (wenn das jetzige Feld eng ist) bzw. i+1 bis zum letzten engen Feld am Stück; liegt das Ziel direkt
// dahinter (Wendepunkt), gehört es dazu (dann allein)
function wunsch(z,c){if(!c.pf)return null;var n=c.pf.length>>1,i=c.i;if(i>=n-1)return null;var E=engstellen(z,c);if(!E[i+1])return null;
 var s=E[i]?i:i+1,e=i+1,tor=false;while(e+1<n&&E[e+1])e++;if(e===n-2)e=n-1;for(var j=s;j<=e;j++)if(E[j]===2)tor=true;return{s:s,e:e,excl:e===n-1,tor:tor}}
// Abschnitt fürs Warten: der gewünschte (Engstelle als Nächstes) oder einer, der hinter dem nächsten breiten Feld beginnt (vor = true). Wer den nicht
// bekommt, wartet schon vor der Einfahrt, damit das Feld davor für Ausfahrende frei bleibt (nicht, wer gerade aus einer Engstelle kommt oder vor einem Tor steht).
function abschnitt(z,c){var r=wunsch(z,c);if(r||!c.pf)return r;var n=c.pf.length>>1;if(c.i+2>=n)return null;var E=engstellen(z,c);if(!E[c.i+2]||E[c.i]||(z.kar&&haelt(c,fk(c.x,c.y)))||amTor(z,c.x,c.y))return null;   // wer aus einer Engstelle kommt, fährt erst hinaus; nie vor einem Tor parken
 c.i++;r=wunsch(z,c);c.i--;if(r)r.vor=true;return r}
function amTor(z,X,Y){var Bu=BAU();for(var s=0;s<4;s++){var k=Bu.kante(z,X,Y,s);if(k&&k.typ===Bu.K_TOR)return true}return false}
function code(c,r,j){if(r.excl)return 16+c.id;var pf=c.pf;if(j>0)return vc(dx1(pf[j*2-2],pf[j*2]),pf[j*2+1]-pf[j*2-1]);return vc(dx1(pf[0],pf[2]),pf[3]-pf[1])}
// Ansprüche (je Tick neu aus dem Zustand): Karren, die seit ALT vor einem Abschnitt warten (gleich aus welchem Grund; Wartealter alt zählt jedes Warten
// und geht erst beim Einfahren in einen Abschnitt, beim Halten oder bei neuer Suche auf 0, nicht beim Platztauschen); je Feld der mit dem ältesten Warten (dann kleinere Nummer)
function ansprueche(z,g){var A=null;for(var i=0;i<g.k.length;i++){var c=g.k[i];
  if(c.zust!==Z_FAEHRT||c.nx>=0||c.alt<ALT)continue;var r=abschnitt(z,c);if(!r)continue;
  for(var j=r.s;j<=r.e;j++){var k=fk(c.pf[j*2],c.pf[j*2+1]),q=A&&A.get(k);if(!A)A=new Map();
   if(!q||c.alt>q[2]||(c.alt===q[2]&&c.id<q[0]))A.set(k,[c.id,code(c,r,j),c.alt])}}
 g.ans=A}
// Darf c den Abschnitt r reservieren? Nein bei fremder Reservierung mit anderem Code, bei einem fremden Karren ohne eigene Reservierung auf einem Feld davor
// und (nur wer von außen kommt) bei einem Anspruch der Gegenrichtung mit Vorrang.
function moeglich(g,c,r){var drin=r.s===c.i||haelt(c,fk(c.x,c.y));   // wer auf einem reservierten Feld steht, darf immer hinaus
 for(var j=r.s;j<=r.e;j++){var k=fk(c.pf[j*2],c.pf[j*2+1]),cd=code(c,r,j),a=g.res.get(k),m,o=g.bel.get(k),mit=false;
  if(a)for(m=0;m<a.length;m+=2){if(a[m]===c.id)continue;if(a[m+1]!==cd)return false;if(a[m]===o)mit=true}
  if(o!==undefined&&o!==c.id&&j>c.i&&!mit)return false;
  if(!drin&&g.ans){var q=g.ans.get(k);if(q&&q[0]!==c.id&&q[1]!==cd&&(q[2]>c.alt||(q[2]===c.alt&&q[0]<c.id)))return false}}
 return true}
function reservieren(g,c,r){c.alt=0;for(var j=r.s;j<=r.e;j++)halte(g,c,fk(c.pf[j*2],c.pf[j*2+1]),code(c,r,j))}
// Vorbeifahren (letzter Ausweg, wenn Ausweichen nicht geht): zwei Karren, die sich 3 s auf breitem Weg gegenüberstehen, tauschen die Felder (2 Felder breit
// = Gegenverkehr frei); jedes Feld zeigt dabei auf den Karren, der hineinfährt.
function breit(z,c){var E=engstellen(z,c);return !E[c.i]&&!E[c.i+1]&&!haelt(c,fk(c.x,c.y))}
// Tauschen: c fährt auf das Feld von d und d auf das von c, beide im selben Tempo (kommen im selben Takt an; die Belegung lässt sich so aus dem Spielstand ableiten)
function tausch(g,c,d){var v=Math.min(c.tp[c.i+1],d.tp[d.i+1]),ka=fk(c.x,c.y),kb=fk(d.x,d.y);c.tp[c.i+1]=v;d.tp[d.i+1]=v;var X=d.x,Y=d.y;los(d,c.x,c.y);los(c,X,Y);g.bel.set(ka,d.id);g.bel.set(kb,c.id)}
function los(c,X,Y){var dx=dx1(c.x,X),dy=Y-c.y;c.nx=X;c.ny=Y;c.len=dx&&dy?LEN_D:LEN_O;c.sub=0;c.warte=0;c.grund=0;c.dir=richtung(dx,dy)}
function karre(g,id){for(var i=0;i<g.k.length;i++)if(g.k[i].id===id)return g.k[i];return null}
// Gegenüber: der Karren auf Feld (X,Y) will als Nächstes auf das Feld von c
function gegenueber(g,c,X,Y){var o=g.bel.get(fk(X,Y));if(o===undefined||o===c.id)return null;var d=karre(g,o);
 if(!d||d.zust!==Z_FAEHRT||d.nx>=0||!d.pf||d.i>=(d.pf.length>>1)-1)return null;return d.pf[d.i*2+2]===c.x&&d.pf[d.i*2+3]===c.y?d:null}
// ersetzt Feld i+1 des Wegs durch die Liste L (Tempo je neues Feld aus dem jetzigen Zustand)
function einfuegen(g,c,P,L){var n=c.pf.length>>1,i=c.i,m=L.length>>1,pf=new Int32Array((n+m-1)*2),tp=new Uint8Array(n+m-1),j,o=0;
 for(j=0;j<=i;j++){pf[o*2]=c.pf[j*2];pf[o*2+1]=c.pf[j*2+1];tp[o]=c.tp[j];o++}
 for(j=0;j<m;j++){pf[o*2]=L[j*2];pf[o*2+1]=L[j*2+1];var v=P.tempo(L[j*2],L[j*2+1]);tp[o]=v>255?255:v<1?1:v;o++}
 for(j=i+2;j<n;j++){pf[o*2]=c.pf[j*2];pf[o*2+1]=c.pf[j*2+1];tp[o]=c.tp[j];o++}
 c.pf=pf;c.tp=tp;c.keys=schluessel(c.pf);c.eng=null;frei(g,c,fk(c.x,c.y))}
function geht(P,x,y,x2,y2){var ex=dx1(x,x2),ey=y2-y;if(!ex&&!ey||ex<-1||ex>1||ey<-1||ey>1)return false;var sx=ex<0?1:3,sy=ey<0?0:2;
 if(ex&&ey)return P.sch(x,y,sx)&&P.sch(x,y,sy)&&P.sch(umX(x+ex),y,sy)&&P.sch(x,y+ey,sx);return P.sch(x,y,ex?sx:sy)}
// Vorlassen (Vorrang): c wartet vor einem Abschnitt auf einem breiten Feld, und ein Karren mit Vorrang (wartet länger, mindestens ALT) will genau auf dieses Feld:
// beide tauschen, c fährt danach auf sein Feld zurück. So verstopft niemand die Einfahrt vor einem, der länger wartet.
function vorlassen(z,g,c){var k0=fk(c.x,c.y);if(haelt(c,k0)||engstellen(z,c)[c.i])return false;
 for(var q=0;q<g.k.length;q++){var e=g.k[q];if(e===c||e.zust!==Z_FAEHRT||e.nx>=0||!e.pf||e.i>=(e.pf.length>>1)-1||e.alt<ALT)continue;
  if(e.pf[e.i*2+2]!==c.x||e.pf[e.i*2+3]!==c.y)continue;if(!(e.alt>c.alt||(e.alt===c.alt&&e.id<c.id)))continue;
  if(haelt(e,fk(e.x,e.y))||engstellen(z,e)[e.i]||veraltet(z,e))continue;var P=pruefer(z);if(!geht(P,c.x,c.y,e.x,e.y))continue;
  var X=c.pf[c.i*2+2],Y=c.pf[c.i*2+3];einfuegen(g,c,P,[e.x,e.y,c.x,c.y,X,Y]);tausch(g,c,e);return true}
 return false}
// Ausweichen quer zum Schritt c → (X,Y): erst Spurwechsel (s1 neben dem jetzigen, s2 neben dem nächsten Feld, dann zurück auf den Weg), sonst Platz machen
// (ein freies Nachbarfeld und zurück aufs jetzige Feld; bei schrägem Gegenüber nur das). s1/s2 frei, unreserviert und befahrbar. Gibt true zurück, wenn der Weg geändert wurde.
function ausweichen(z,g,c,X,Y,d){var dx=dx1(c.x,X),dy=Y-c.y,sch=dx&&dy,P=pruefer(z),s0=dx?(dx<0?1:3):(dy<0?0:2),Q=sch?[]:dx?[0,2]:[1,3],Q2=sch?[0,1,2,3]:Q.concat([(s0+2)&3]),n=c.pf.length>>1,i=c.i,q;
 function leer(x,y){var k=fk(x,y),f;if(g.bel.has(k)||g.res.has(k))return false;f=BAU().feld(z,x,y);return !(f&&f.raum)}   // nie in ein Gebäude (Lager) ausweichen
 function setz(L){einfuegen(g,c,P,L)}
 for(q=0;q<Q.length;q++){var a=Q[q],x1=umX(c.x+DX[a]),y1=c.y+DY[a],x2=umX(X+DX[a]),y2=Y+DY[a];
  if(i+2>=n||y1<0||y1>=WY||y2<0||y2>=WY||!leer(x1,y1)||!leer(x2,y2)||!P.sch(c.x,c.y,a)||!P.sch(x1,y1,s0)||!geht(P,x2,y2,c.pf[i*2+4],c.pf[i*2+5]))continue;
  setz([x1,y1,x2,y2]);return true}
 for(q=0;q<Q2.length;q++){var b=Q2[q],xa=umX(c.x+DX[b]),ya=c.y+DY[b];if(ya<0||ya>=WY||!leer(xa,ya)||!P.sch(c.x,c.y,b)||!P.sch(xa,ya,(b+2)&3))continue;
  if(d&&d.pf&&d.i+2<(d.pf.length>>1)&&d.pf[d.i*2+4]===xa&&d.pf[d.i*2+5]===ya)continue;
  setz([xa,ya,c.x,c.y,X,Y]);return true}
 return false}

// Kartenstücke, die ein Weg berührt (für die Wegversion): je Feld sein Stück, bei Schrägen auch die Stücke der zwei Nachbarfelder
function schluessel(pf){var S=new Set(),n=pf.length>>1;for(var i=0;i<n;i++){var X=pf[i*2],Y=pf[i*2+1];S.add((X>>6)*8192+(Y>>6));
  S.add((umX(X-1)>>6)*8192+(Y>>6));S.add((umX(X+1)>>6)*8192+(Y>>6));if(Y>0)S.add((X>>6)*8192+((Y-1)>>6));if(Y<WY-1)S.add((X>>6)*8192+((Y+1)>>6));   // G6c2: Nachbarn quer (Engstellen)
  if(i){var Xa=pf[i*2-2],Ya=pf[i*2-1];if(X!==Xa&&Y!==Ya){S.add((Xa>>6)*8192+(Y>>6));S.add((X>>6)*8192+(Ya>>6))}}}
 return Array.from(S)}
function veraltet(z,c){var wt=z.bau.wt;for(var i=0;i<c.keys.length;i++){var t=wt.get(c.keys[i]);if(t!==undefined&&t>c.ab)return true}return false}
// Rest des Wegs ab Feld i im jetzigen Zustand noch befahrbar? Wie wegstrom.gilt (Kopie für eine Feldliste). Fehlt ein Kartenstück: nein.
function gilt(z,pf,i0){var w=z.wg,B=BG(),M=new Map(),seed=w.seed>>>0,n=pf.length>>1,p=1;
 function hole(cx,cy){return w.stuecke.get(umS(cx)*8192+cy)||null}
 function holeB(cx,cy){var k=umS(cx)*8192+cy;if(!M.has(k))M.set(k,BAU().stueck(z.bau,k));return M.get(k)}
 function sch(X,Y,s){return B.schritt(hole,holeB,seed,X,Y,s,p)>0}
 for(var i=i0+1;i<n;i++){var X=pf[i*2-2],Y=pf[i*2-1],dx=dx1(X,pf[i*2]),dy=pf[i*2+1]-Y;
  var sx=dx<0?1:3,sy=dy<0?0:2,X2=umX(X+dx);
  if(dx&&dy){if(!(sch(X,Y,sx)&&sch(X,Y,sy)&&sch(X2,Y,sy)&&sch(X,Y+dy,sx)))return false}else if(!sch(X,Y,dx?sx:sy))return false}
 return true}

// Richtung fürs Bild (4 Kartenrichtungen, Startset karren-ochse): 0 = +x (rechts unten), 1 = +y (links unten), 2 = −y (rechts oben), 3 = −x (links oben); schräg nach x
function richtung(dx,dy){return dx>0?0:dx<0?3:dy>0?1:2}
function setzePfad(g,c,pf,tp,ab){c.pf=pf;c.tp=tp;c.i=0;c.ab=ab;c.keys=schluessel(pf);c.zust=Z_FAEHRT;c.nx=-1;c.sub=0;c.warte=0;c.grund=0;c.eng=null;frei(g,c,fk(c.x,c.y))}
// umgedrehter Weg ohne die Schleifen vom Ausweichen (A, B, A → A)
function umdrehen(g,c){var n=c.pf.length>>1,p=new Int32Array(n*2),t=new Uint8Array(n),m=0;for(var i=0;i<n;i++){var X=c.pf[(n-1-i)*2],Y=c.pf[(n-1-i)*2+1];
  if(m>=2&&p[(m-2)*2]===X&&p[(m-2)*2+1]===Y){m--;continue}p[m*2]=X;p[m*2+1]=Y;t[m]=c.tp[n-1-i];m++}
 c.pf=m===n?p:p.slice(0,m*2);c.tp=m===n?t:t.slice(0,m);c.keys=schluessel(c.pf);c.i=0;c.nx=-1;c.sub=0;c.zust=Z_FAEHRT;c.eng=null;frei(g,c,fk(c.x,c.y))}
function suchen(g,c){c.zust=Z_SUCHT;c.alt=0;c.job=-1;c.pf=null;c.tp=null;c.keys=[];c.i=0;c.versuch=0;c.eng=null;frei(g,c,fk(c.x,c.y))}
function stehen(z,c,grund){c.zust=Z_STEHT;c.alt=0;c.grund=grund;c.t=z.tick+WIEDER;c.pf=null;c.tp=null;c.keys=[];c.job=-1;c.eng=null;frei(z.kar,c,fk(c.x,c.y))}
function ankunft(z,c){c.zust=Z_HAELT;c.warte=0;c.alt=0;
 if(c.ziel===0){c.sx=c.x;c.sy=c.y;c.t=z.tick+HALT_STR}
 else c.t=z.tick+HALT_LADE}
function weiter(z,c){                     // nach dem Halten: umgedrehter Weg, wenn er Ladestelle und Straße verbindet; sonst neu suchen
 var g=z.kar,amZiel=c.ziel===1&&!(c.x===c.lx&&c.y===c.ly);
 if(amZiel){suchen(g,c);return}            // Ladestelle verlegt oder Halt woanders: erst zur Ladestelle
 c.ziel=c.ziel===0?1:0;
 if(c.ziel===0&&c.ende){suchen(g,c);return}   // Weg endete nur am Ende des gebauten Wegs: jede Runde neu suchen (vielleicht ist die Straße wieder erreichbar)
 if(c.voll&&c.pf&&c.pf.length>=4){var n=c.pf.length>>1,eX=c.pf[0],eY=c.pf[1];
  if(c.ziel===1&&eX===c.lx&&eY===c.ly){umdrehen(g,c);return}
  if(c.ziel===0&&eX===c.sx&&eY===c.sy){umdrehen(g,c);return}}
 suchen(g,c)}

// ── Je Tick: Abgleich (nur nach Bauänderungen), Bewegung, Wegaufträge ──
function schritt(z,neuL){var b=z.bau;if(!b)return;
 if(z.tick%PRUEF===0&&(frisch(b,z.tick)||(z.kar&&z.tick%(PRUEF*10)===0)))abgleich(z);
 var g=z.kar;if(!g)return;
 if(z.wg)ansprueche(z,g);
 for(var i=0;i<g.k.length;i++)bewegen(z,g,g.k[i]);
 ausgeben(z,g,neuL)}
function bewegen(z,g,c){
 if(c.zust===Z_HAELT){if(z.tick>=c.t)weiter(z,c);return}
 if(c.zust===Z_STEHT){if(z.tick>=c.t){c.zust=Z_SUCHT;c.versuch=0}return}
 if(c.zust!==Z_FAEHRT)return;
 if(c.nx<0){
  if(veraltet(z,c)){if(z.wg&&gilt(z,c.pf,c.i)){c.ab=z.tick;c.eng=null}else{suchen(g,c);return}}
  var n=c.pf.length>>1;if(c.i>=n-1){ankunft(z,c);return}
  var X=c.pf[c.i*2+2],Y=c.pf[c.i*2+3],k=fk(X,Y),o=g.bel.get(k),d;
  if(z.wg&&!haelt(c,k)){var r=abschnitt(z,c);                   // G6c2: Abschnitt vor einer Engstelle ganz reservieren oder davor warten
   if(r){if(!moeglich(g,c,r)){c.warte++;c.alt++;if(c.warte>=WARTE_GRUND)c.grund=r.tor?12:11;d=o!==undefined&&o!==c.id?gegenueber(g,c,X,Y):null;if(!(d&&ausweichen(z,g,c,X,Y,d)))vorlassen(z,g,c);return}
    if(!r.vor)reservieren(g,c,r)}}
  if(o!==undefined&&o!==c.id){c.warte++;c.alt++;if(c.warte>=WARTE_GRUND)c.grund=10;d=z.wg?gegenueber(g,c,X,Y):null;
   if(d&&!ausweichen(z,g,c,X,Y,d)&&c.warte>=WARTE_GRUND&&breit(z,c)&&breit(z,d)&&!veraltet(z,d))tausch(g,c,d);   // vorbeifahren
   return}
  g.bel.set(k,c.id);los(c,X,Y)}
 c.sub+=c.tp[c.i+1]*VF;
 if(c.sub>=c.len){if(g.bel.get(fk(c.x,c.y))===c.id)g.bel.delete(fk(c.x,c.y));gib(g,c,fk(c.x,c.y));c.x=c.nx;c.y=c.ny;c.nx=-1;c.ny=-1;c.sub=0;c.i++}}

// Wegauftrag: Fenster um das jetzige Feld, Ziel Straße (Anschluss) oder Ladestelle (naher Weg), Tempo je Feld zurück
function auftrag(z,c,nr,faellig,ab,versuch){var w=z.wg,b=z.bau,x1=c.ziel===0?c.x:c.lx,y1=c.ziel===0?c.y:c.ly,e={x0:c.x,y0:c.y,x1:x1,y1:y1},f=WE().fenster(e);
 var pk=SU().paket(f.cx0,f.cy0,function(k){return w.stuecke.get(k)||null},function(k){return BAU().stueck(b,k)},w.ans);
 var o={nr:nr,art:'kweg',kid:c.id,x0:c.x,y0:c.y,x1:x1,y1:y1,ziel:c.ziel,faellig:faellig,ab:ab,versuch:versuch,gen:w.gen,keys:f.keys};
 var a={nr:nr,version:z.version,vorrang:0,art:'kweg',faellig:faellig,p:1,x0:c.x,y0:c.y,x1:x1,y1:y1,cx0:f.cx0,cy0:f.cy0,seed:w.seed>>>0,gen:w.gen,fern:false,
  anschl:c.ziel===0,temp:true,startFrei:true,daten:pk.daten,tab:pk.tab};
 return{o:o,a:a}}
function ausgeben(z,g,neuL){var w=z.wg,n=0;if(!w||!w.ans)return;
 for(var i=0;i<g.k.length&&n<JE_TICK;i++){var c=g.k[i];if(c.zust!==Z_SUCHT||c.job>=0)continue;
  if(c.ziel===1&&!WE().nah({x0:c.x,y0:c.y,x1:c.lx,y1:c.ly})){stehen(z,c,2);continue}
  var j=auftrag(z,c,z.auftragNr++,z.tick+FRIST,z.tick,c.versuch);c.job=j.o.nr;z.offen.push(j.o);neuL.push(j.a);n++}}

// Übernahme an der Tickgrenze (kern.js, Reihenfolge der Auftragsnummer)
function uebernehmen(z,o,r){var g=z.kar;if(!g||!z.wg||o.gen!==z.wg.gen)return;var c=null;
 for(var i=0;i<g.k.length;i++)if(g.k[i].id===o.kid){c=g.k[i];break}
 if(!c||c.job!==o.nr)return;c.job=-1;
 if(c.x!==o.x0||c.y!==o.y0||c.ziel!==o.ziel){c.versuch=0;return}       // Lage oder Ziel änderte sich: neu suchen (Zustand bleibt „sucht“)
 if(!r||!r.length){stehen(z,c,2);return}
 if(r[0]!==0){stehen(z,c,r[0]);return}
 var KO=SU().KOPF,nF=r[2],nO=r[4],pf=r.slice(KO,KO+nF*2),tp=new Uint8Array(nF);for(i=0;i<nF;i++)tp[i]=r[KO+nF*2+nO+i];
 if(nF<1||pf[0]!==c.x||pf[1]!==c.y){stehen(z,c,2);return}
 var wt=z.bau.wt,alt=false;for(i=0;i<o.keys.length;i++){var t=wt.get(o.keys[i]);if(t!==undefined&&t>o.ab){alt=true;break}}
 if(alt&&!gilt(z,pf,0)){c.versuch++;if(c.versuch>MAX_VERSUCH)stehen(z,c,8);return}
 c.versuch=0;if(c.ziel===0)c.ende=r[7]===2?1:0;
 c.voll=c.ziel===0?(pf[0]===c.lx&&pf[1]===c.ly?1:0):(pf[0]===c.sx&&pf[1]===c.sy&&pf[nF*2-2]===c.lx&&pf[nF*2-1]===c.ly?1:0);
 if(c.ziel===1&&(pf[nF*2-2]!==c.lx||pf[nF*2-1]!==c.ly)){stehen(z,c,1);return}
 setzePfad(g,c,pf,tp,alt?z.tick:o.ab);if(nF===1)ankunft(z,c)}

// ── Fingerabdruck, Nachricht an den Hauptkern ──
function pruef(a){var h=0x811c9dc5;for(var i=0;i<a.length;i++){h=Math.imul(h^(a[i]&0xFFFF),0x01000193);h=Math.imul(h^(a[i]>>>16),0x01000193)}return h>>>0}
var FELDER=['id','raum','lx','ly','x','y','nx','ny','sub','len','ziel','zust','t','i','ab','job','versuch','grund','warte','dir','voll','ende','sx','sy'];
function abdruck(g,f){f(g.nr);f(g.k.length);for(var i=0;i<g.k.length;i++){var c=g.k[i];for(var j=0;j<FELDER.length;j++)f(c[FELDER[j]]);
 f(c.pf?c.pf.length:0);if(c.pf){f(pruef(c.pf));f(pruef(c.tp))}
 f(c.alt);if(c.rs.length){f(c.rs.length);for(j=0;j<c.rs.length;j+=2){f(Math.floor(c.rs[j]/WY));f(c.rs[j]%WY);f(c.rs[j+1])}}}}
// Je Karren 7 Zahlen: Nummer, Lage x und y in 1/256 Feld (Mitte des Felds = +128), Richtung, Zustand, Grund, Wartezeit in Ticks. Zwischenlage nach dem Fortschritt.
var MELD=7;
function meld(g){var n=g.k.length,a=new Int32Array(1+n*MELD);a[0]=n;
 for(var i=0;i<n;i++){var c=g.k[i],o=1+i*MELD,px=c.x*256+128,py=c.y*256+128;
  if(c.nx>=0&&c.len){var f=Math.floor(c.sub*256/c.len);if(f>256)f=256;px+=dx1(c.x,c.nx)*f;py+=(c.ny-c.y)*f;if(px<0)px+=WX*256;else if(px>=WX*256)px-=WX*256}
  a[o]=c.id;a[o+1]=px;a[o+2]=py;a[o+3]=c.dir;a[o+4]=c.zust;a[o+5]=c.grund;a[o+6]=c.zust===Z_FAEHRT&&c.nx<0?c.warte:0}
 return a}

// ── Spielstand: Karren mit Weg und laufende Wegaufträge (werden nach dem Laden mit gleicher Nummer und Fälligkeit neu gepackt); bel wird abgeleitet ──
function stand(g,z){var lauf=[];for(var i=0;i<z.offen.length;i++){var o=z.offen[i];if(o.art==='kweg'&&z.wg&&o.gen===z.wg.gen)lauf.push([o.nr,o.kid,o.faellig,o.ab,o.versuch])}
 return{format:STAND,nr:g.nr,k:g.k.map(function(c){var a=FELDER.map(function(f){return c[f]});a.push(c.pf?Array.from(c.pf):null,c.tp?Array.from(c.tp):null,c.rs.slice(),c.alt);return a}),lauf:lauf}}
function G(v,min,max){return typeof v==='number'&&v===Math.floor(v)&&v>=min&&v<=max}
// Nach dem Laden der Welt (weltstrom.ausStand) aufrufen. Gibt die neu zu vergebenden Aufträge zurück oder null (ungültig).
function ausStand(d,z){var M=2147483647,i,j;
 if(!d||(d.format!==STAND&&d.format!==1)||!G(d.nr,1,M)||!Array.isArray(d.k)||d.k.length>MAX_K||!Array.isArray(d.lauf)||d.lauf.length>MAX_K)return null;
 var g=neu(),N=FELDER.length;g.nr=d.nr;
 var GR={id:[1,d.nr-1],raum:[0,M],lx:[0,WX-1],ly:[0,WY-1],x:[0,WX-1],y:[0,WY-1],nx:[-1,WX-1],ny:[-1,WY-1],sub:[0,LEN_D+VF*255],len:[0,LEN_D],ziel:[0,1],zust:[0,3],t:[0,M],i:[0,1<<20],
  ab:[0,M],job:[-1,M],versuch:[0,MAX_VERSUCH+1],grund:[0,GRUND.length-1],warte:[0,M],dir:[0,3],voll:[0,1],ende:[0,1],sx:[-1,WX-1],sy:[-1,WY-1]};
 for(i=0;i<d.k.length;i++){var a=d.k[i];var v2=d.format===2;if(!Array.isArray(a)||a.length!==N+(v2?4:2))return null;var c={rs:[],alt:0,eng:null};
  for(j=0;j<N;j++){var gr=GR[FELDER[j]];if(!G(a[j],gr[0],gr[1]))return null;c[FELDER[j]]=a[j]}
  var pf=a[N],tp=a[N+1];
  if(pf===null){if(tp!==null||c.zust===Z_FAEHRT)return null;c.pf=null;c.tp=null;c.keys=[]}
  else{if(!Array.isArray(pf)||!Array.isArray(tp)||pf.length<2||pf.length!==tp.length*2||pf.length>(1<<20))return null;
   for(j=0;j<pf.length;j++)if(!G(pf[j],0,j&1?WY-1:WX-1))return null;for(j=0;j<tp.length;j++)if(!G(tp[j],0,255))return null;
   if(c.i>=tp.length)return null;c.pf=Int32Array.from(pf);c.tp=Uint8Array.from(tp);c.keys=schluessel(c.pf)}
  if(v2){var rs=a[N+2];if(!G(a[N+3],0,M))return null;c.alt=a[N+3];if(!Array.isArray(rs)||rs.length&1||rs.length>(1<<16))return null;
   for(j=0;j<rs.length;j+=2){if(!G(rs[j],0,WX*WY-1)||!G(rs[j+1],0,16+M))return null;c.rs.push(rs[j],rs[j+1]);resAdd(g,rs[j],c.id,rs[j+1])}}
  if(i&&c.id<=g.k[i-1].id)return null;g.k.push(c)}
 // Belegung ableiten: erst die alten Felder der Fahrenden, dann die Stehenden, dann die Zielfelder (beim Tauschen zeigt jedes Feld auf den, der hineinfährt)
 for(i=0;i<g.k.length;i++)if(g.k[i].nx>=0)g.bel.set(fk(g.k[i].x,g.k[i].y),g.k[i].id);
 for(i=0;i<g.k.length;i++)if(g.k[i].nx<0)g.bel.set(fk(g.k[i].x,g.k[i].y),g.k[i].id);
 for(i=0;i<g.k.length;i++)if(g.k[i].nx>=0)g.bel.set(fk(g.k[i].nx,g.k[i].ny),g.k[i].id);
 var neuL=[];
 for(i=0;i<d.lauf.length;i++){var l=d.lauf[i];if(!Array.isArray(l)||l.length!==5||!G(l[0],0,z.auftragNr-1)||!G(l[1],1,M)||!G(l[2],0,M)||!G(l[3],0,M)||!G(l[4],0,MAX_VERSUCH+1))return null;
  if(!z.wg||!z.wg.ans)return null;var ck=null;for(j=0;j<g.k.length;j++)if(g.k[j].id===l[1])ck=g.k[j];if(!ck||ck.job!==l[0])return null;
  var q=auftrag(z,ck,l[0],l[2],l[3],l[4]);z.offen.push(q.o);neuL.push(q.a)}
 for(i=0;i<g.k.length;i++)if(g.k[i].job>=0&&!neuL.some(function(a){return a.nr===g.k[i].job}))return null;
 z.kar=g;return neuL}

var KA={MAX_K:MAX_K,ALT:ALT,MELD:MELD,WARTE_GRUND:WARTE_GRUND,JE_TICK:JE_TICK,FRIST:FRIST,PRUEF:PRUEF,HALT_LADE:HALT_LADE,HALT_STR:HALT_STR,WIEDER:WIEDER,LEN_O:LEN_O,LEN_D:LEN_D,VF:VF,ZUST:ZUST,GRUND:GRUND,
 Z_SUCHT:Z_SUCHT,Z_FAEHRT:Z_FAEHRT,Z_HAELT:Z_HAELT,Z_STEHT:Z_STEHT,
 engstellen:engstellen,schritt:schritt,uebernehmen:uebernehmen,abdruck:abdruck,meld:meld,stand:stand,ausStand:ausStand,einfahrt:einfahrt,gilt:gilt};
if(typeof module!=='undefined'&&module.exports)module.exports=KA;else root.AT3KARREN=KA;
})(typeof self!=='undefined'?self:this);
