// WAS DIE DATEI TUT: Begehbarkeit von Arena Theory 3.0 (Schritt G6a): für jedes Feld und jedes Bewegungsprofil (zu Fuß, Karren), ob und wie schnell man
// dort vorankommt, und ob man über eine Feldkante darf (Wand, Tür, Tor). Reine Rechnung ohne Bildschirm, nur ganze Zahlen (Tempo × 100, 0 = gesperrt).
// Liest nur, was schon da ist: Kartenstück des Weltgenerators (Höhe, Biom, Weltstraße) und Bau-Kartenstück aus bau.js (Gebäudefelder, Kanten, gebaute Wege,
// Rodung). Keine zweite Wahrheit: Natur kommt wie auf der Karte aus natur.js (Seed, Biom, Hang), Wände und Wege aus bau.js.
// Kerne: Weltkern und Helferkerne (Wegsuche in G6b), nie der Hauptkern (Regel 13). Kosten je Feld fest, eine Karte je Kartenstück (64 × 64) auf Abruf,
// nichts hängt von der Weltgröße ab (Regel 14).
// Wiederverwendet aus 2.0 welt-begehbar.js (Thomas 13.11.2026, als Kopie angepasst): Tempo je Boden (Steinstraße 1,15 · Pflaster 1,1 · Kies/Straße/Brücke 1,0 ·
// Trampelpfad 0,95 · Wiese, Erde, Sand 0,85 · Wald, Nadelstreu 0,75 · Fels, Schnee 0,6 · Sumpf 0,45 · Wasser gesperrt), Karren nur auf Kiesweg und besser
// (dazu Weltstraße, Ortsplatz, Brücke und Lagerboden für Ladestellen), große Bäume und Fels sperren, Türen nur zu Fuß, Tore für alle.
// G8: ein gefällter Baum (Stumpf, Feld-Merker Bit 3 aus bau.js) sperrt nicht mehr.
// Vorschlagswerte (G6a, noch nicht von Thomas bestätigt): Hang mit einer Stufe zu Fuß ×0,9, Karren ×0,85; Hang mit zwei und mehr Stufen zu Fuß ×0,7, Karren gesperrt;
// Furt zu Fuß 0,6, Karren gesperrt; Fähre vorerst gesperrt; Gebäudeboden zu Fuß 0,85; geplante Wände sperren nicht, begonnene und fertige schon (wie FP2a).
(function(root){
'use strict';
function NAT(){return root.AT3NATUR||(typeof module!=='undefined'&&module.exports?require('./natur.js'):null)}
var ST=64, F=ST*ST, WX=ST*9600, WY=ST*4800, MEER=2048, LS=6, GW=F*8, F_ROD=2, Z_PLAN=1, Z_FERTIG=3;
var FUSS=0, KARREN=1, PROFIL=['fuss','karren'];
// Tempo je Biom (0 tiefes Meer, 1 Meer, 2 Strand, 3 Wüste, 4 Steppe, 5 Wald, 6 Sumpf, 7 Tundra, 8 Fels, 9 Schnee, 10 Fluss, 11 See)
var BIOM=[0,0,85,85,85,75,45,75,60,60,0,0];
// Weltstraße (weltgen W1b: 1 Pfad, 2 Straße, 3 Brücke, 4 Furt, 5 Steg, 6 Ortsplatz, 7 Fähre) je Profil
var WELT=[[0,95,100,100,60,100,100,0],[0,0,100,100,0,0,100,0]];
// Gebauter Weg (bau.js: 1 Trampelpfad, 2 Kiesweg, 3 Pflaster, 4 Steinstraße) je Profil, nur wenn fertig
var GEBAUT=[[0,95,100,110,115],[0,0,100,110,115]];
var DX=[0,-1,0,1], DY=[-1,0,1,0];
function um(X){return X<0?X+WX:X>=WX?X-WX:X}
function stufe(h){h=(h-MEER)>>LS;return h<0?0:h}
function sicht(p){return p._s||(p._s={H:new Uint16Array(p.buffer,p.byteOffset,F),B:new Uint8Array(p.buffer,p.byteOffset+F*2,F),W:new Uint8Array(p.buffer,p.byteOffset+F*3,F)})}
function hoehe(hole,X,Y){if(Y>=WY)Y=WY-1;var p=hole(X>>6,Y>>6);return p?stufe(sicht(p).H[((Y&63)<<6)|(X&63)]):-1}

// Tempo eines Felds. hole(cx,cy) → Kartenstück des Weltgenerators, holeB(cx,cy) → Bau-Puffer (bau.stueck) oder null. −1 = Kartenstück fehlt.
function tempo(hole,holeB,seed,X,Y,p){if(Y<0||Y>=WY)return 0;X=um(X);
 var w=hole(X>>6,Y>>6);if(!w)return -1;var s=sicht(w),q=((Y&63)<<6)|(X&63),a=holeB?holeB(X>>6,Y>>6):null;
 var h0=stufe(s.H[q]),mn=h0,mx=h0;for(var k=1;k<4;k++){var h=hoehe(hole,um(X+(k&1)),Y+(k>>1));if(h<0)return -1;if(h<mn)mn=h;if(h>mx)mx=h}
 var steil=mx-mn,b=s.B[q],wv=s.W[q],t;
 if(a&&a[q]){t=p===FUSS?85:a[q]===1?100:0}                                                    // Gebäudeboden; Karren nur ins Lager (Ladestelle)
 else{var g=a&&a.length>GW?a[GW+q]:0;
  if(g&&((g>>4)&3)===Z_FERTIG)t=GEBAUT[p][g&7];
  else if(wv)t=WELT[p][wv];
  else{t=p===FUSS?BIOM[b]:0;
   if(t&&!(a&&(a[3*F+q]&(F_ROD|8)))){var n=NAT().art(seed,X,Y,b,0,steil);if(n>=0&&(n<=5||n===12))t=0}}}   // natur.js 0–5 Bäume, 12 Fels
 if(!t)return 0;
 if(steil>=2){if(p===KARREN)return 0;t=(t*70/100)|0}else if(steil===1)t=(t*(p===KARREN?85:90)/100)|0;
 return t}

// Darf man über die Kante an Seite s (0 Nord, 1 West, 2 Süd, 3 Ost) des Felds X,Y? Wand sperrt alle, Tür nur Karren, Tor niemanden; geplant sperrt nicht.
function kante(holeB,X,Y,s,p){if(!holeB)return true;X=um(X);var t,kx=X,ky=Y,arr;
 if(s===0){arr=1}else if(s===1){arr=2}else if(s===2){ky=Y+1;arr=1;if(ky>=WY)return false}else{kx=um(X+1);arr=2}
 var a=holeB(kx>>6,ky>>6);if(!a)return true;var v=a[arr*F+(((ky&63)<<6)|(kx&63))];t=v&3;if(!t||((v>>4)&3)===Z_PLAN)return true;
 return t===3||(t===2&&p===FUSS)}

// Schritt von X,Y nach Seite s: Tempo des Zielfelds oder 0 (gesperrt), −1 (Kartenstück fehlt).
function schritt(hole,holeB,seed,X,Y,s,p){if(!kante(holeB,X,Y,s,p))return 0;var ny=Y+DY[s];if(ny<0||ny>=WY)return 0;return tempo(hole,holeB,seed,X+DX[s],ny,p)}

// Karte eines Kartenstücks für ein Profil: je Feld ein Byte Tempo (0 gesperrt) und ein Byte Ausgänge (Bit s = Kante s offen). Für die Wegsuche (G6b).
// aus = {t: Uint8Array(4096), k: Uint8Array(4096)} (wird gefüllt). false, wenn ein nötiges Kartenstück fehlt.
function karte(hole,holeB,seed,cx,cy,p,aus){var x0=cx*ST,y0=cy*ST,i,j,X,Y,v;
 for(j=0;j<ST;j++)for(i=0;i<ST;i++){X=x0+i;Y=y0+j;v=tempo(hole,holeB,seed,X,Y,p);if(v<0)return false;aus.t[(j<<6)|i]=v}
 for(j=0;j<ST;j++)for(i=0;i<ST;i++){var o=0;X=x0+i;Y=y0+j;if(aus.t[(j<<6)|i])for(var s=0;s<4;s++)if(kante(holeB,X,Y,s,p))o|=1<<s;aus.k[(j<<6)|i]=o}
 return true}

var BG={FUSS:FUSS,KARREN:KARREN,PROFIL:PROFIL,BIOM:BIOM,WELT:WELT,GEBAUT:GEBAUT,tempo:tempo,kante:kante,schritt:schritt,karte:karte};
if(typeof module!=='undefined'&&module.exports)module.exports=BG;else root.AT3BEGEH=BG;
})(typeof self!=='undefined'?self:this);
