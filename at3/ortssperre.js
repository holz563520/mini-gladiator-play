// WAS DIE DATEI TUT: Sperrkarte der Orte und Außenposten für die Wegsuche (AT3 Schritt N7a4a1, Thomas 24.11.2026). Aus einem fertigen Stadt- oder Postenplan
// (stadtbild.js plan/postenPlan) wird je Planfeld ein Byte: unten 4 Bit Feldklasse (Tempo zu Fuß und mit Karren), oben 4 Bit geschlossene Kanten
// (Bit 4 Nord, 5 West, 6 Süd, 7 Ost, Reihenfolge wie begehbar.js). Entscheidungen Thomas: innen wie im Bild (Gassen, Plätze, Wiese, Strand, Kai, Felder mit dem
// Tempo der Feldart; Häuser, Mauer außer Tor, Wasser, Fels gesperrt; Karren nur Gassen, Plätze, Kai, Tore), **Häuser betretbar durch ihre Tür** (Anwohner und
// Arbeiter müssen hinein: Hausfelder sind Innenraum, ringsum Wand, nur die Türkante offen), hohe Dinge sperren wie in der Kartei (kartei/kollision.json),
// flache nicht, Pferchzäune sperren außer am Gatter, Außenposten auf demselben Weg (Grundlage ihre Begehbarkeit posten.begeh).
// lupe() macht aus den Karten der Orte im Fenster die Abfrage für begehbar.js (holeB.ort): Klasse und Kanten am Weltfeld, −1 außerhalb.
// Reine Rechnung ohne Bildschirm, nur ganze Zahlen. Läuft im Ortskern (Karte bauen, N7a4a2) und auf Weltkern und Helfern (Abfrage). Kosten: Bauen einmal je Plan
// (Großstadt 204 × 204 unter 20 ms), Abfrage fest je Feld (Orte im Fenster sind wenige), Speicher W² Byte je Ort, nichts hängt an der Weltgröße.
// Hangring um den Ort: die Wegsuche sieht bis N7a4b noch das ungeebnete Gelände (Entscheidung Thomas). Park gewinnt: ein Kartenstück mit Gebautem des Spielers
// gehört nicht zum Ort (begehbar.js fragt die Sperrkarte dort nicht).
(function(root){
'use strict';
function SBm(){return root.AT3_STADTBILD||(typeof module!=='undefined'&&module.exports?require('./stadtbild.js'):null)}
var WX=64*9600;
// Feldklassen: [zu Fuß, Karren] Tempo × 100 (wie begehbar.js: Gebäudeboden 85, Pflaster 110, Trampelpfad 95, Wiese/Sand 0,85)
var K_GESPERRT=0,K_GASSE=1,K_PLATZ=2,K_KAI=3,K_TOR=4,K_FELDWEG=5,K_STEG=6,K_HAUS=7,K_WIESE=8,K_FELD70=9,K_FELD55=10,K_FELD40=11,K_WALD=12;
var TEMPO=[[0,0],[100,100],[110,100],[100,100],[100,100],[95,0],[100,0],[85,0],[85,0],[70,0],[55,0],[40,0],[75,0],[0,0],[0,0],[0,0]];
var ZELLE={s:K_GASSE,o:K_PLATZ,m:K_PLATZ,q:K_KAI,h:K_FELDWEG,y:K_STEG,g:K_WIESE,u:K_WIESE,e:K_WIESE,p:K_WIESE};   // w Wasser, x Fels: gesperrt
var DS=[[0,-1],[-1,0],[0,1],[1,0]];   // Seiten 0 Nord, 1 West, 2 Süd, 3 Ost (begehbar.js)
function feldKlasse(t){return t>=80?K_WIESE:t>=60?K_FELD70:t>=45?K_FELD55:t>0?K_FELD40:K_GESPERRT}
function seiteVon(di,dj){return dj<0?0:di<0?1:dj>0?2:3}

// Sperrkarte eines Plans. KOL = kartei/kollision.json (objekte: Kennung → [w, h, Feldzeichen]), opt = Planwahl (für die Feldarten, landwirtschaft.js).
function maske(P,KOL,opt){var W=P.W,WW=W*W,M=new Uint8Array(WW),Z=P.zellen,SB=SBm(),k,i,j,b,c,x,y;
 var O=KOL&&KOL.objekte||{},po=P.posten&&P.posten.begeh;
 // 1) Boden: Zellen bzw. Begehbarkeit des Postens
 for(k=0;k<WW;k++){i=k%W;j=(k/W)|0;
  if(po){c=po.charAt(k);M[k]=c==='x'?K_GESPERRT:Z.charAt(k)==='h'||Z.charAt(k)==='y'?ZELLE[Z.charAt(k)]:c==='p'?K_WALD:K_WIESE;continue}
  c=Z.charAt(k);
  if(c==='f'||(P.flur&&c==='g'&&SB&&SB.flurArt(P,i,j))){var t=SB?SB.flurTempo(P,i,j,'mensch',opt):null;M[k]=t==null?K_WIESE:feldKlasse(t)}
  else M[k]=ZELLE[c]||K_GESPERRT}
 // 2) Hohe Dinge sperren (Feldzeichen x), „nur zu Fuß“ (p) nimmt dem Karren das Feld. Das Ding steht auf seinem vordersten Feld (i, j), die Fläche reicht nach hinten.
 if(!po)for(var n=0;n<P.dinge.length;n++){var d=P.dinge[n],e=O[d.id];if(!e)continue;
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
  if(dx<o.W&&dy>=0&&dy<o.W)return o.m[dy*o.W+dx]}return -1};f.L=L;return f}
// Tempo × 100 einer Feldklasse für Profil p (0 zu Fuß, 1 Karren)
function tempo(v,p){return TEMPO[v&15][p]}
// Darf man von Feld a über Seite s ins Nachbarfeld b? (a, b = Byte oder −1 außerhalb)
function kante(a,b,s){if(a>=0&&(a>>(4+s))&1)return false;if(b>=0&&(b>>(4+((s+2)&3)))&1)return false;return true}
var OS={K_GESPERRT:K_GESPERRT,K_GASSE:K_GASSE,K_PLATZ:K_PLATZ,K_KAI:K_KAI,K_TOR:K_TOR,K_FELDWEG:K_FELDWEG,K_STEG:K_STEG,K_HAUS:K_HAUS,K_WIESE:K_WIESE,K_WALD:K_WALD,
 TEMPO:TEMPO,DS:DS,maske:maske,lupe:lupe,tempo:tempo,kante:kante,seiteVon:seiteVon};
if(typeof module!=='undefined'&&module.exports)module.exports=OS;else root.AT3ORTSSPERRE=OS;
})(typeof self!=='undefined'?self:this);
