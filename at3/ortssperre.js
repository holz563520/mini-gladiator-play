// WAS DIE DATEI TUT: Sperrkarte der Orte und Außenposten für die Wegsuche (AT3 Schritt N7a4a1, Thomas 24.11.2026). Aus einem fertigen Stadt- oder Postenplan
// (stadtbild.js plan/postenPlan) wird je Planfeld ein Byte: unten 4 Bit Feldklasse (Tempo zu Fuß und mit Karren), oben 4 Bit geschlossene Kanten
// (Bit 4 Nord, 5 West, 6 Süd, 7 Ost, Reihenfolge wie begehbar.js). Entscheidungen Thomas: innen wie im Bild (Gassen, Plätze, Wiese, Strand, Kai, Felder mit dem
// Tempo der Feldart; Häuser, Mauer außer Tor, Wasser, Fels gesperrt; Karren nur Gassen, Plätze, Kai, Tore), **Häuser betretbar durch ihre Tür** (Anwohner und
// Arbeiter müssen hinein: Hausfelder sind Innenraum, ringsum Wand, nur die Türkante offen), hohe Dinge sperren wie in der Kartei (kartei/kollision.json),
// flache nicht, Pferchzäune sperren außer am Gatter, Außenposten auf demselben Weg (Grundlage ihre Begehbarkeit posten.begeh).
// lupe() macht aus den Karten der Orte im Fenster die Abfrage für begehbar.js (holeB.ort): Klasse und Kanten am Weltfeld, −1 außerhalb.
// Reine Rechnung ohne Bildschirm, nur ganze Zahlen. Läuft im Ortskern (Karte bauen, N7a4a2) und auf Weltkern und Helfern (Abfrage). Kosten: Bauen einmal je Plan
// (Großstadt 204 × 204 unter 20 ms), Abfrage fest je Feld (Orte im Fenster sind wenige), Speicher W² Byte je Ort, nichts hängt an der Weltgröße.
// Hangring um den Ort (N7a4b1, Thomas 24.11.2026): Karten mit h0 und R → lupe().hoch ebnet für die Wegsuche wie der Bildkern ein (begehbar.js). Park gewinnt: ein Kartenstück mit Gebautem des Spielers
// gehört nicht zum Ort (begehbar.js fragt die Sperrkarte dort nicht).
(function(root){
'use strict';
function SBm(){return root.AT3_STADTBILD||(typeof module!=='undefined'&&module.exports?require('./stadtbild.js'):null)}
var WX=64*9600;
// N7a5d (26.11.2026): natürlicher Rand der eingeebneten Fläche. Statt des quadratischen Rings (Abstand = größere Achse, Hang 1 Stufe je Feld ab der Planfläche)
// zählt der echte Abstand zur Planfläche (abgerundete Ecken), davon geht ein gewellter Saum ab, der noch flach bleibt (R/8 … R/4 Felder, aus dem Ortspunkt,
// Stützwerte alle 16 Felder rund um die Fläche, weich verbunden), danach Hang höchstens 1 Stufe je Feld wie vorher, dem Gelände folgend (Klemmen an die Welt).
// Nur ganze Zahlen und Math.sqrt (überall gleich). Gleiche Rechnung in ortsflaeche.js und ortssperre.js (randE). Notausschalter ?n7a5d=0.
var N7A7=!(typeof self!=='undefined'&&self.location&&/[?&]n7a7=0/.test(self.location.search||''));   // N7a7
var N7A5D=!(typeof self!=='undefined'&&self.location&&/[?&]n7a5d=0/.test(self.location.search||''));
function randHs(x,y,a){var h=Math.imul(x^0x5bd1e995,0x27d4eb2d)^Math.imul(y+0x165667b1,0x9e3779b1)^Math.imul(a+1,0x85ebca6b);h^=h>>>15;h=Math.imul(h,0xc2b2ae35);h^=h>>>13;return h&255}
function randE(x0,y0,i,j,R,W,S){if(S==null)S=R;var dx=i<R?R-i:i>=R+W?i-R-W+1:0,dy=j<R?R-j:j>=R+W?j-R-W+1:0;if(!N7A5D)return(dx>dy?dx:dy)*64;
 var W1=W-1,px=i-R,py=j-R;px=px<0?0:px>W1?W1:px;py=py<0?0:py>W1?W1:py;var t=py===0?px:px===W1?W1+py:py===W1?3*W1-px:4*W1-py,P=4*W1,n=P>>4;if(n<4)n=4;
 var u=Math.floor(t*n*256/P),a=(u>>8)%n,f=u&255,b=(a+1)%n;x0=((x0%WX)+WX)%WX;var v=(randHs(x0,y0,a)*(256-f)+randHs(x0,y0,b)*f)>>8,w=S*8+((v*S*8)>>8),
 e=Math.floor(Math.sqrt(dx*dx+dy*dy)*64)-w;return e<0?0:e}
// N7a5e2 (26.11.2026): Natur der Welt auf freien Ortsfeldern. Weltboden-Felder (N7a5e1, gleiche Rechnung wie ortsflaeche.js weltBoden, hier aus dem Plan)
// ohne Ding des Orts (Lagerplatz u. Ä.) bekommen Bäume, Büsche und Fels aus natur.js wie draußen; die Natur-Dinge des Plans (Bäume, Büsche, Blumen,
// Felsblock) fallen dort weg, im Bild (ortsflaeche.js) wie in der Sperrkarte (Klasse K_WELT: begehbar.js rechnet das Feld wie draußen). Notausschalter ?n7a5e2=0
// (auch mit ?n7a5e=0). Einmal je Plan, W² Byte.
var N7A5E2=!(typeof self!=='undefined'&&self.location&&/[?&]n7a5e2?=0/.test(self.location.search||''));
var CODES_P='gsomfwepxqyuh',WELT_P={n:1,v:1,r:1,y:1},NATUR_ID=/^(baum|busch|blume)-|^fels-block$/;
function naturDing(id){return NATUR_ID.test(id||'')}
function wbHs(x,y){var h=Math.imul(x,0x27d4eb2d)^Math.imul(y,0x165667b1)^0x5e1a;h^=h>>>15;h=Math.imul(h,0x85ebca6b);h^=h>>>13;return h>>>0}
function wbGrenze(X,Y){var gx=Math.floor(X/6),gy=Math.floor(Y/6),fx=X-gx*6,fy=Y-gy*6,a=wbHs(gx,gy)%3,b=wbHs(gx+1,gy)%3,c=wbHs(gx,gy+1)%3,d=wbHs(gx+1,gy+1)%3,
 v=((a*(6-fx)+b*fx)*(6-fy)+(c*(6-fx)+d*fx)*fy+18)/36|0;return 2+v+((wbHs(X+977,Y+331)>>>7)&1)}
// Weltboden-Karte aus dem Plan (1 = Wiese fern von Bebautem, Gärten, Flur), x0/y0 = Weltfeld der Planecke. Ergebnis gleich ortsflaeche.js weltBoden.
function weltBodenP(P,x0,y0){if(!N7A5E2||x0==null||!P||!P.zellen)return null;var W=P.W,N=W*W,ww=!!P.weltwasser,Zs=P.zellen,D=new Uint8Array(N),Q=new Int32Array(N),qa=0,qe=0,k,i,j,z=0;D.fill(255);
 for(k=0;k<N;k++){var ch=Zs.charAt(k);if(ch!=='g'&&!(ww&&WELT_P[ch])&&CODES_P.indexOf(ch)>0){D[k]=0;Q[qe++]=k}}
 (P.bauten||[]).forEach(function(e){if(!(e.w>0&&e.h>0))return;for(var y=e.j;y<e.j+e.h&&y<W;y++)for(var x=e.i;x<e.i+e.w&&x<W;x++){if(x<0||y<0)continue;var q=y*W+x;if(D[q]){D[q]=0;Q[qe++]=q}}});
 if(!qe)return null;
 while(qa<qe){k=Q[qa++];var dk=D[k];if(dk>=7)continue;i=k%W;j=(k-i)/W;for(var yy=j-1;yy<=j+1;yy++){if(yy<0||yy>=W)continue;for(var xx=i-1;xx<=i+1;xx++){if(xx<0||xx>=W)continue;var q2=yy*W+xx;if(D[q2]>dk+1){D[q2]=dk+1;Q[qe++]=q2}}}}
 var WB=new Uint8Array(N),X0=((x0%WX)+WX)%WX;for(k=0;k<N;k++){if(!D[k])continue;var c2=Zs.charAt(k);if(ww&&WELT_P[c2])continue;if(c2!=='g'&&CODES_P.indexOf(c2)>0)continue;i=k%W;j=(k-i)/W;if(D[k]>wbGrenze(X0+i,y0+j)){WB[k]=1;z++}}
 return z?WB:null}
// Natur-Karte: Weltboden ohne Felder mit einem Ding des Orts, das keine Natur ist (1 = Natur der Welt wächst hier).
function weltNatur(P,WB){if(!N7A5E2||!WB)return null;var W=P.W,WN=new Uint8Array(WB),L=P.dinge||[];
 for(var n=0;n<L.length;n++){var d=L[n];if(naturDing(d.id)||d.i<0||d.j<0||d.i>=W||d.j>=W)continue;WN[d.j*W+d.i]=0}return WN}
// Feldklassen: [zu Fuß, Karren] Tempo × 100 (wie begehbar.js: Gebäudeboden 85, Pflaster 110, Trampelpfad 95, Wiese/Sand 0,85)
var K_GESPERRT=0,K_GASSE=1,K_PLATZ=2,K_KAI=3,K_TOR=4,K_FELDWEG=5,K_STEG=6,K_HAUS=7,K_WIESE=8,K_FELD70=9,K_FELD55=10,K_FELD40=11,K_WALD=12,K_WELT=13;   // N7a5e2: K_WELT = Feld rechnet wie draußen (begehbar.js), sonst wie Wiese
var TEMPO=[[0,0],[100,100],[110,100],[100,100],[100,100],[95,0],[100,0],[85,0],[85,0],[70,0],[55,0],[40,0],[75,0],[85,0],[0,0],[0,0]];
var ZELLE={s:K_GASSE,o:K_PLATZ,m:K_PLATZ,q:K_KAI,h:K_FELDWEG,y:K_STEG,g:K_WIESE,u:K_WIESE,e:K_WIESE,p:K_WIESE,v:K_WIESE,r:K_GASSE};   // w Wasser, x Fels, n Weltwasser: gesperrt; N7a5a2 v Weltufer, r Holzbrücke
var DS=[[0,-1],[-1,0],[0,1],[1,0]];   // Seiten 0 Nord, 1 West, 2 Süd, 3 Ost (begehbar.js)
function feldKlasse(t){return t>=80?K_WIESE:t>=60?K_FELD70:t>=45?K_FELD55:t>0?K_FELD40:K_GESPERRT}
function seiteVon(di,dj){return dj<0?0:di<0?1:dj>0?2:3}

// Sperrkarte eines Plans. KOL = kartei/kollision.json (objekte: Kennung → [w, h, Feldzeichen]), opt = Planwahl (für die Feldarten, landwirtschaft.js).
function maske(P,KOL,opt,x0,y0){var W=P.W,WW=W*W,M=new Uint8Array(WW),Z=P.zellen,SB=SBm(),k,i,j,b,c,x,y,WB=weltBodenP(P,x0,y0),WN=weltNatur(P,WB);   // N7a5e2: x0, y0 = Weltfeld der Planecke (ohne: wie vorher)
 var O=KOL&&KOL.objekte||{},po=P.posten&&P.posten.begeh;
 // 1) Boden: Zellen bzw. Begehbarkeit des Postens
 for(k=0;k<WW;k++){i=k%W;j=(k/W)|0;
  if(po){c=po.charAt(k);M[k]=c==='x'?K_GESPERRT:Z.charAt(k)==='h'||Z.charAt(k)==='y'?ZELLE[Z.charAt(k)]:c==='p'?K_WALD:K_WIESE;continue}
  c=Z.charAt(k);
  if(c==='f'||(P.flur&&c==='g'&&SB&&SB.flurArt(P,i,j))){var t=SB?SB.flurTempo(P,i,j,'mensch',opt):null;M[k]=t==null?K_WIESE:feldKlasse(t)}
  else M[k]=ZELLE[c]||K_GESPERRT}
 // 2) Hohe Dinge sperren (Feldzeichen x), „nur zu Fuß“ (p) nimmt dem Karren das Feld. Das Ding steht auf seinem vordersten Feld (i, j), die Fläche reicht nach hinten.
 if(WN)for(k=0;k<WW;k++)if(WN[k])M[k]=K_WELT;   // N7a5e2: Weltnatur entscheidet wie draußen
 if(!po)for(var n=0;n<P.dinge.length;n++){var d=P.dinge[n],e=O[d.id];if(!e||d.rolle==='bruecke')continue;if(WB&&WB[d.j*W+d.i]&&naturDing(d.id))continue;   // N7a5e2: Plan-Natur auf Weltboden fällt weg
  for(y=0;y<e[1];y++)for(x=0;x<e[0];x++){var ch=e[2].charAt(y*e[0]+x),fi=d.i-e[0]+1+x,fj=d.j-e[1]+1+y;if(fi<0||fj<0||fi>=W||fj>=W)continue;k=fj*W+fi;
   if(ch==='x')M[k]=K_GESPERRT;else if(ch==='p'&&TEMPO[M[k]&15][1])M[k]=K_WIESE}}
 // 3) Pferchzäune: geschlossene Kanten (Gatter offen)
 var zu=P.flur&&P.flur.zaun;if(zu&&zu.k)for(n=0;n<zu.k.length;n++){k=zu.k[n];if(M[k])M[k]|=(parseInt(zu.m.charAt(n),16)&15)<<4}   // wie stadtbild.js flurKante
 // 4) Häuser: Innenraum, ringsum Wand, Türkante offen; ohne Tür (Mauerstücke u. Ä.) gesperrt
 for(n=0;n<P.bauten.length;n++){b=P.bauten[n];var bi=b.rund?b.i-1:b.i,bj=b.rund?b.j-1:b.j,bw=b.w|0,bh=b.h|0,tu=b.tuer;
  for(y=bj;y<bj+bh;y++)for(x=bi;x<bi+bw;x++){if(x<0||y<0||x>=W||y>=W)continue;k=y*W+x;
   if(!tu||b.rolle==='mauer'){M[k]=K_GESPERRT;continue}
   var r=K_HAUS;if(y===bj)r|=16;if(x===bi)r|=32;if(y===bj+bh-1)r|=64;if(x===bi+bw-1)r|=128;M[k]=r}
  if(tu&&b.rolle!=='mauer'&&tu[0]>=0&&tu[1]>=0&&tu[0]<W&&tu[1]<W){k=tu[1]*W+tu[0];if((M[k]&15)===K_HAUS)M[k]&=~(16<<seiteVon(tu[2],tu[3]))}}
 // 5) Mauerring: Mauer, Türme, Treppen, Halbfelder gesperrt, Tor frei (zu Fuß und Karren)
 var Wh=P.wehr;if(Wh&&Wh.k)for(n=0;n<Wh.k.length;n++){k=Wh.k[n];M[k]=Wh.f.charAt(n*4)==='t'?K_TOR:K_GESPERRT}
 // 6) Kanten an gesperrten Feldern zählen nicht; Kante an einem Haus von außen ist schon im Haus geschlossen (beide Seiten werden geprüft)
 return M}

// Abfrage für begehbar.js über die Orte im Fenster: L = [{x0, y0, W, m}] (x0 Weltfeld der Bildecke, über die Naht). Ergebnis Byte am Weltfeld oder −1.
function lupe(L){if(!L||!L.length)return null;
 var f=function(X,Y){for(var n=0;n<L.length;n++){var o=L[n],dx=X-o.x0;if(dx<0)dx+=WX;else if(dx>=WX)dx-=WX;var dy=Y-o.y0;
  if(dx<o.W&&dy>=0&&dy<o.W)return o.m[dy*o.W+dx]}return -1};f.L=L;
 for(var n=0;n<L.length;n++)if(L[n].h0!=null){f.hoch=function(X,Y,h,b){return hoch(L,X,Y,h,b)};break}   // N7a4b1: nur mit Höhe und Hangring
 // N7a5b1: Weltweg im Hangring nach dem Anschluss (ortsanschluss.js, Karte.an): Wegart 0–5 oder −1 (Welt unverändert)
 var LA=L.filter(function(o){return o.an&&o.an.liste&&o.an.liste.length});
 if(LA.length)f.weg=function(X,Y){for(var n=0;n<LA.length;n++){var a=LA[n].an,dx=X-a.x0;if(dx<0)dx+=WX;else if(dx>=WX)dx-=WX;var dy=Y-a.y0;
   if(dx<a.n&&dy>=0&&dy<a.n){if(!a._m){var m=new Map(),l=a.liste;for(var i=0;i<l.length;i+=2)m.set(l[i],l[i+1]);a._m=m}var v=a._m.get(dy*a.n+dx);if(v!==undefined)return v&7}}return -1};
 return f}
// N7a4b1: eingeebnete Höhe (Rohwert wie weltgen, 64 = eine Stufe) am Weltfeld X, Y, rechnet genau wie ortsflaeche.js flachen(): auf der Fläche die Höhe des Ortspunkts,
// im Hangring (Abstand d = 1 … R) höchstens d Stufen davon entfernt; Meer (Biom 0, 1), Fluss (10) und See (11) bleiben, wie sie sind. Mehrere Orte nacheinander.
// N7a5a2: Karten mit ww (Ort mit Weltwasser) lassen Wasser in Ruhe, sk = Senke je Planfeld (Böschung zum tieferen Wasser), genau wie ortsflaeche.js flachen().
function hoch(L,X,Y,h,b){for(var n=0;n<L.length;n++){var o=L[n];if(o.h0==null)continue;var R=o.R,N=o.W+2*R,i=X-(o.x0-R);i%=WX;if(i<0)i+=WX;var j=Y-(o.y0-R);
  if(i>=N||j<0||j>=N)continue;var d=Math.max(i<R?R-i:i>=R+o.W?i-R-o.W+1:0,j<R?R-j:j>=R+o.W?j-R-o.W+1:0);
  if(d===0){if(!(o.ww&&(b<2||b===10||b===11))){h=o.sk?o.h0-(o.sk.charCodeAt((j-R)*o.W+i-R)-48)*64:o.h0;if(h<0)h=0}continue}if(b<2||b===10||b===11)continue;var e=randE(o.x0,o.y0,i,j,R,o.W,o.RS),hb=o.h0;if(o.sk&&N7A7){var pi=i-R,pj=j-R,W=o.W;pi=pi<0?0:pi>=W?W-1:pi;pj=pj<0?0:pj>=W?W-1:pj;hb-=(o.sk.charCodeAt(pj*W+pi)-48)*64;if(hb<0)hb=0}var lo=hb-e,hi=hb+e;h=h<lo?lo:h>hi?hi:h;if(h<0)h=0}   // N7a7: wie ortsflaeche.js flachen
 return h}
// Tempo × 100 einer Feldklasse für Profil p (0 zu Fuß, 1 Karren)
function tempo(v,p){return TEMPO[v&15][p]}
// Darf man von Feld a über Seite s ins Nachbarfeld b? (a, b = Byte oder −1 außerhalb)
function kante(a,b,s){if(a>=0&&(a>>(4+s))&1)return false;if(b>=0&&(b>>(4+((s+2)&3)))&1)return false;return true}
var OS={K_GESPERRT:K_GESPERRT,K_GASSE:K_GASSE,K_PLATZ:K_PLATZ,K_KAI:K_KAI,K_TOR:K_TOR,K_FELDWEG:K_FELDWEG,K_STEG:K_STEG,K_HAUS:K_HAUS,K_WIESE:K_WIESE,K_WALD:K_WALD,K_WELT:K_WELT,weltBodenP:weltBodenP,weltNatur:weltNatur,naturDing:naturDing,wbGrenze:wbGrenze,
 TEMPO:TEMPO,DS:DS,maske:maske,lupe:lupe,hoch:hoch,tempo:tempo,kante:kante,seiteVon:seiteVon,randE:randE};
if(typeof module!=='undefined'&&module.exports)module.exports=OS;else root.AT3ORTSSPERRE=OS;
})(typeof self!=='undefined'?self:this);
