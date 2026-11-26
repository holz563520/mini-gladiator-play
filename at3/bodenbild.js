// WAS DIE DATEI TUT: Bodenbild der Kartenansicht von Arena Theory 3.0 (Schritt G4a). Reine Rechnung ohne Bildschirm, nur ganze Zahlen: macht aus Kartenstücken
// des Weltgenerators (weltgen.js: Höhe, Biom, Weg je Feld) fertige Bodenbilder mit Höhenstufen wie bei RollerCoaster Tycoon: Jede Feldecke liegt auf einer Stufe
// (8 Bildpunkte), Felder dazwischen sind flach oder schräg, Hänge nach Lichtseite heller oder dunkler. Farben nur aus der AT3-Palette.
// Ein Bild = TEIL × TEIL Felder in der Zoomstufe 0 (Feld 64 × 32), je Stufe weiter draußen doppelt so viele Felder im selben Bild (½, ¼, ⅛): immer 512 Bildpunkte breit.
// Kerne: läuft im Bildkern (bildkern.js, Hintergrundkern), nie auf dem Hauptkern (Regel 13). Kosten je Bild fest, unabhängig vom Ort und von der Weltgröße (Regel 14).
// W1c Runde Welt: In x läuft die Welt um (Feld WX liegt neben Feld 0): Nachbarfelder und Nachbarstücke hinter der Naht werden umgerechnet; in y endet sie am Pol.
// Wiederverwendet: Biom- und Wegfarben aus der Weltansicht (menue/weltansicht.js), Stückformat und Meeresspiegel aus weltgen.js, Feldmaß und Höhenstufe aus at3-64.js.
(function(root){
'use strict';
var ST=64, FELDER=ST*ST, SX=9600, SY=4800, WX=ST*SX, WY=ST*SY, MEER=2048, TEIL=8, STUFEN=4, LS=6;   // LS: Höhe → Stufe (64 Höheneinheiten je Stufe; Vorschlagswert: so sind Nachbarfelder meist gleich hoch oder eine Stufe versetzt)
var BFARBE=[39,40,46,62,19,15,8,11,23,5,42,41,6,18,61,45,14,16], WFARBE=[0,47,48,31,43,12,47,6];   // wie Weltansicht: Biome 0..17 (N2c: 13 Grasland, 14 Savanne, 15 Mittelmeer, 16 Regenwald, 17 Mangroven), Wegschicht 1..7 (Ortsplatz hier in Straßenfarbe statt Rot)
// G6a gebaute Wege (bau.js, Schicht ab Byte 8 × 4.096 im Bau-Puffer): Trampelpfad, Kiesweg, Pflaster, Steinstraße; Fugen bei Pflaster und Stein. Baustelle:
// geplant = Boden mit Punktmuster, in Arbeit = Weg mit Bodenkörnern, fertig = Weg. Weit draußen (¼, ⅛) nur die Farbe.
var GFARBE=[0,46,5,45,4,5], GFUGE=[0,45,4,44,3,4], GKORN=[0,47,6,46,5,6], GPUNKT=61;      // AR1b: 5 Queue Path vorerst wie Kiesweg (eigenes Bild mit AR1c)
function mix(a){a=a>>>0;a^=a>>>16;a=Math.imul(a,0x7feb352d);a^=a>>>15;a=Math.imul(a,0x846ca68b);a^=a>>>16;return a>>>0}
function sicht(p){return p._s||(p._s={H:new Uint16Array(p.buffer,p.byteOffset,FELDER),B:new Uint8Array(p.buffer,p.byteOffset+FELDER*2,FELDER),W:new Uint8Array(p.buffer,p.byteOffset+FELDER*3,FELDER)})}
function stufe(h){h=(h-MEER)>>LS;return h<0?0:h}
var ECK=new Int16Array(65*65), NLISTE=[], RH=new Uint16Array(66*66), RB=new Uint8Array(66*66);
// N7a5a0: Wasser immer waagrecht (ufer.js). Ohne ufer.js (Notausschalter oder nicht ladbar) Ecke = Feld wie vorher.
function UFm(){if(root.AT3UFER)return root.AT3UFER;try{if(typeof module!=='undefined'&&module.exports)return require('./ufer.js');if(typeof importScripts==='function'){importScripts('ufer.js'+((root.location&&root.location.search)||''));return root.AT3UFER||null}}catch(e){}return null}
var UF=UFm();
// N7a5b1: Punktmuster des Übergangs Weltweg → Ortsweg (gleich wie ortsanschluss.js ortPunkt, UE = 4 Felder): Stufe k = 1 am Bildrand meist Ortsweg, k = 4 meist Weltweg
var B4=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];function uePunkt(k,x,y){return B4[((y&3)<<2)|(x&3)]<Math.round((5-k)*16/5)}

// Stufen der Feldecken (n+1) × (n+1) ab Feld x0,y0. Ecke = Höhe des Feldes dort (N7a5a0: am Wasser der Wasserspiegel, ufer.js). false, wenn ein Nachbarstück noch fehlt
// (seit N7a5a0 auch links und oben: die Kacheln dort entscheiden mit, ob eine Ecke am Wasser liegt).
function ecken(hole,x0,y0,n){var m=n+1,p=null,pk=-1,H=null,Bq=null,an=UF&&UF.an();
 if(!an){for(var j=0;j<m;j++){var Y=y0+j;if(Y>=WY)Y=WY-1;
  for(var i=0;i<m;i++){var X=x0+i;if(X>=WX)X-=WX;var k=(X>>6)*8192+(Y>>6);
   if(k!==pk){p=hole(X>>6,Y>>6);if(!p)return false;pk=k;H=sicht(p).H}
   ECK[j*m+i]=stufe(H[((Y&63)<<6)|(X&63)])}}
  return true}
 var L=m+1;
 for(j=0;j<L;j++){Y=y0+j-1;if(Y>=WY)Y=WY-1;var oben=Y<0;if(oben)Y=0;
  for(i=0;i<L;i++){X=x0+i-1;if(X<0)X+=WX;if(X>=WX)X-=WX;k=(X>>6)*8192+(Y>>6);
   if(k!==pk){p=hole(X>>6,Y>>6);if(!p)return false;pk=k;var sv=sicht(p);H=sv.H;Bq=sv.B}
   var q=((Y&63)<<6)|(X&63),e=j*L+i;RH[e]=H[q];RB[e]=oben?5:Bq[q]}}
 for(j=0;j<m;j++)for(i=0;i<m;i++)ECK[j*m+i]=stufe(UF.eckRaster(RH,RB,L,(j+1)*L+i+1));
 return true}

// Ein Bodenbild. F = {pal: Uint32Array(64) ABGR, du: dunkler, he: heller (Farbnummer → Farbnummer)}. Gibt {w,h,ox,oy,px} oder null (Nachbar fehlt).
// NT (G4b, frei): {N: natur.js, seed, BILD: N.vorbereiten(…)} → Natur wird mit ins Bild gebacken; das Bild wird dann um ihre Überstände größer (sonst immer 512 breit).
// BA (G5b, frei): {M: baubild.js, hole(cx,cy) → Bau-Puffer, BILD, offen} → Gebäude (Boden, Wände, Dach) mit der Natur in einer Reihenfolge; Natur nicht auf Gebautem/Gerodetem.
// ox,oy = Bildpunkt der Ecke x0,y0 auf Stufe 0.
// OT (N7a2a, frei): Ortsfläche aus ortsflaeche.js fuerBild → Boden je Planfeld in Ersatzfarbe, keine Natur auf der Fläche, Gebäude als Klötze (Ersatzbild bis N7a2b).
var BOD=new Int16Array(64*64), GW=FELDER*8;
// Ein Bildpunkt eines gebauten Wegs (nur Stufe 1× und ½). gm: 1 geplant, 2 in Arbeit, 3 fertig. Muster im Bildraum (x, t), Fugen in Reihen versetzt.
function gPx(gm,ga,x,t,lod,r,k,col,cL,cD,gP,gF,gK,gB){var v=Math.imul(r^Math.imul(k*61+t,0x9e3779b1),0x85ebca6b)>>>28;
 if(gm===1)return((x+t)&3)===0&&(t&1)===0?gP:col;
 if(gm===2&&v<5)return gB;
 if(ga>=3){var s=lod?1:0,ry=t>>(ga===3?2-s:3-s),bw=ga===3?8>>s:16>>s;if((t&((ga===3?4:8)>>s)-1)===0||((x+ry*(bw>>1))&(bw-1))===0)return gF}
 return v===0?gK:v===1?cD:col}
function bild(hole,x0,y0,lod,F,NT,BA,OT){var n=TEIL<<lod,hw=32>>lod,hh=16>>lod,st=8>>lod,m=n+1,i,j,y;
 if(!ecken(hole,x0,y0,n))return null;
 var top=1e9,bot=-1e9;for(j=0;j<m;j++)for(i=0;i<m;i++){y=(i+j)*hh-ECK[j*m+i]*st;if(y<top)top=y;if(y>bot)bot=y}
 var w=2*n*hw,h=bot-top+2,ox=n*hw,oy=-top,s=sicht(hole(x0>>6,y0>>6)),B=s.B,W=s.W,pal=F.pal,du=F.du,he=F.he,d2=2*hw,o2,sp;
 // Natur (G4b): erst sammeln, dann das Bild um ihre Überstände vergrößern (oben Baumkronen, seitlich wenige Bildpunkte)
 var gb=BA?BA.hole(x0>>6,y0>>6):null;if(gb&&gb.length<=GW)gb=null;
 var ob=0,bz=-1,ab=BA&&BA.hole(x0>>6,y0>>6)?function(X,Y){return BA.M.frei(BA.hole,X,Y)}:null,oz=-1,nk=0;
 if(OT){var ab0=ab;ab=ab0?function(X,Y){return OT.frei(X,Y)&&ab0(X,Y)}:OT.frei}
 var WM=OT&&OT.weg?OT.weg(W):null;if(WM)W=WM.W;                                              // N7a5b1: Weltwege im Hangring an die Ausgänge (ortsanschluss.js), auch für die Natur
 var NL=NT?NT.N.sammeln(NT.seed,x0,y0,n,lod,ECK,B,W,NLISTE,ab):null;
 if(NL)for(i=0;i<NL.length;i++){NL[i].sp=NT.BILD[NL[i].t].L[lod];NL[i].o=1;NL[i].m=0}
 if(BA){if(!NL){NLISTE.length=0;NL=NLISTE}bz=BA.M.sammeln(BA,x0,y0,n,lod,ECK,NL,BOD);if(bz>0)NL.sort(function(p,q2){return p.tief-q2.tief||p.i-q2.i||p.o-q2.o})}
 if(OT){if(!NL){NLISTE.length=0;NL=NLISTE}nk=OT.kloetze(NL);if(nk&&NL.length>nk)NL.sort(function(p,q2){return p.tief-q2.tief||p.i-q2.i||p.o-q2.o})}   // N7a2a: Klötze mit Natur und Bau in einer Reihenfolge
 if(NL&&NL.length){var l0=0,r0=w,t0=0,b0=h;for(i=0;i<NL.length;i++){o2=NL[i];sp=o2.sp;var X1=ox+o2.x-sp.ax,Y1=oy+o2.y-sp.ay;
   if(X1<l0)l0=X1;if(X1+sp.w>r0)r0=X1+sp.w;if(Y1<t0)t0=Y1;if(Y1+sp.h>b0)b0=Y1+sp.h}
  ox-=l0;oy-=t0;w=r0-l0;h=b0-t0}
 var px=new Uint32Array(w*h);
 for(j=0;j<n;j++)for(i=0;i<n;i++){var X=x0+i,Y=y0+j,q=((Y&63)<<6)|(X&63),b=B[q],wv=W[q],e=j*m+i,lN=ECK[e],lE=ECK[e+1],lW=ECK[e+m],lS=ECK[e+m+1];
  var c=BFARBE[b],wasser=b<2||b===10||b===11,r=mix(Math.imul(X,73856093)^Math.imul(Y,19349663)),gw=gb?gb[GW+q]:0,ga=gw&7,gz=(gw>>4)&3;
  if(OT&&(oz=OT.zelle(X,Y))>=0){if(oz||wasser){c=OT.farbe[oz];wasser=!!OT.wasser[oz]}wv=0;if(oz||!OT.weltB||!OT.weltB(X,Y)){ga=0;gz=0}}   // N7a5e1: freie Wiese fern der Häuser behält auch das Bodenmuster der Welt   // N7a2a: Ortsfläche (Wiese g behält die Farbe des Bioms, außer auf Wasser)
  else if(ga&&gz>1){c=GFARBE[ga];wasser=false;wv=-1}
  else if(wv===7){if((X+Y)&1)c=WFARBE[7]}else if(wv){c=WFARBE[wv];wasser=false}
  var ue=WM&&wv>0&&oz<0?WM.ue[q]:0,c2=0;                                                     // N7a5b1: Übergang Weltweg → Ortsweg (Punktmuster)
  if(!wasser){var d=lE-lW,sh=d>1?2:d>0?1:d<-1?-2:d<0?-1:0;if(lS-lN>1)sh--;                // Licht von links: Hang nach Westen heller, nach Osten dunkler
   if(ue){c2=WM.c[q];var s2=sh;while(s2>0){c2=he[c2];s2--}while(s2<0){c2=du[c2];s2++}}
   if(!wv&&lod>1){var r4=r&15;if(r4===0)sh++;else if(r4===1)sh--}                           // weit draußen: Körnung je Feld; nah: je Bildpunkt (unten)
   while(sh>0){c=he[c];sh--}while(sh<0){c=du[c];sh++}}
  else if(!wv&&UF&&UF.an()&&(lN!==lE||lN!==lW||lN!==lS)){if((X+Y)&1)c=he[c]}                     // N7a5a0: Stufe im Fluss (Stromschnelle), Punktmuster aus Palettenfarben
  else if(!wv&&(r&31)===0)c=he[c];                                                          // vereinzelte Wellen
  var korn=!wasser&&!wv&&lod<2,cL=pal[he[c]],cD=pal[du[c]],v,gm=ga&&lod<2?(gz===1?1:gz===2?2:3):0;
  if(gm){korn=false;var gP=pal[GPUNKT],gF=pal[GFUGE[ga]],gK=pal[GKORN[ga]],gB=pal[BFARBE[b]]}
  var col2=ue?pal[c2]:0;
  var col=pal[c],xc=ox+(i-j)*hw,yb=oy+(i+j)*hh,yN=yb-lN*st,yE=yb+hh-lE*st,yW=yb+hh-lW*st,yS=yb+2*hh-lS*st,a1=yN-yW,a2=yS-yW,b1=yE-yN,b2=yE-yS;
  for(var k=0;k<hw;k++){var f=2*k+1,t=yW+Math.floor(a1*f/d2),u=yW+Math.floor(a2*f/d2)+1,x=xc-hw+k,o;
   if(u>=h)u=h-1;if(t<0)t=0;o=t*w+x;
   if(gm)for(;t<=u;t++,o+=w)px[o]=gPx(gm,ga,x,t,lod,r,k,col,cL,cD,gP,gF,gK,gB);
   else if(ue)for(;t<=u;t++,o+=w)px[o]=uePunkt(ue,x,t)?col2:col;
   else if(korn)for(;t<=u;t++,o+=w){v=Math.imul(r^Math.imul(k*61+t-yW,0x9e3779b1),0x85ebca6b)>>>28;px[o]=v===0?cL:v===1?cD:col}else for(;t<=u;t++,o+=w)px[o]=col;
   t=yN+Math.floor(b1*f/d2);u=yS+Math.floor(b2*f/d2)+1;x=xc+k;
   if(u>=h)u=h-1;if(t<0)t=0;o=t*w+x;
   if(gm)for(;t<=u;t++,o+=w)px[o]=gPx(gm,ga,x,t,lod,r,k+977,col,cL,cD,gP,gF,gK,gB);
   else if(ue)for(;t<=u;t++,o+=w)px[o]=uePunkt(ue,x,t)?col2:col;
   else if(korn)for(;t<=u;t++,o+=w){v=Math.imul(r^Math.imul(k*67+977+t-yN,0x9e3779b1),0x85ebca6b)>>>28;px[o]=v===0?cL:v===1?cD:col}else for(;t<=u;t++,o+=w)px[o]=col}}
 if(OT&&OT.boden)ob=ortBoden(OT,px,w,h,ox,oy,x0,y0,n,hw,hh,st,pal);                       // N7a2b1: echte Böden der Orte (nur 1×) über der Ersatzfarbe
 if(bz>=0)BA.M.boden(px,w,h,ox,oy,n,lod,ECK,BOD,pal,he,du);                                 // G5b: Boden der Gebäudefelder (unter allen Bildern)
 if(NL)for(i=0;i<NL.length;i++){o2=NL[i];sp=o2.sp;if(o2.m||o2.o!==1){BA.M.malen(px,w,ox,oy,pal,o2,lod);continue}var sx=ox+o2.x-sp.ax,sy=oy+o2.y-sp.ay,spx=sp.px,sw=sp.w;   // hinten zuerst, Bildpunkt für Bildpunkt
  for(j=0;j<sp.h;j++){var zo=(sy+j)*w+sx,zs=j*sw;for(var k2=0;k2<sw;k2++){var c2=spx[zs+k2];if(c2!==255)px[zo+k2]=pal[c2]}}}
 return{w:w,h:h,ox:ox,oy:oy,px:px,natur:NL?NL.length-(bz>0?bz:0)-nk:0,bau:bz>0?bz:0,ort:nk,ortBoden:ob}}
// N7a2b1: Boden der Planfelder aus den Kartei-Bildern (Boden, dann Säume), hinten zuerst wie im Stadtbild; Anker = Feldmitte (obere Ecke + 16) wie stadtbild.js elemente.
// Flache Felder (alle vier Ecken gleich) wie gehabt. N7a5e2 (26.11.2026): Randfelder am Hang (Böschung, Rand der Planfläche) bekommen denselben echten Boden, Spalte für
// Spalte auf das schräge Feld gezogen (flache Raute → schräge Raute, nur innerhalb der Raute, Säume über den Rand fallen dort weg); vorher Ersatzfarbe. Notausschalter ?n7a5e2=0.
var N7A5E2B=!(typeof self!=='undefined'&&self.location&&/[?&]n7a5e2?=0/.test(self.location.search||''));
function ortBoden(OT,px,w,h,ox,oy,x0,y0,n,hw,hh,st,pal){var m=n+1,z=0,d2=2*hw;
 for(var s=0;s<=2*(n-1);s++)for(var i=Math.max(0,s-n+1);i<=Math.min(n-1,s);i++){var j=s-i,X=x0+i,Y=y0+j;if(X>=WX)X-=WX;if(OT.zelle(X,Y)<0)continue;
  var e=j*m+i,l=ECK[e],lE=ECK[e+1],lW=ECK[e+m],lS=ECK[e+m+1],flach=lE===l&&lW===l&&lS===l;if(!flach&&!N7A5E2B)continue;if(OT.weltB&&OT.weltB(X,Y))continue;var L=OT.boden(X,Y);if(!L)continue;z++;   // N7a5e1: Weltboden statt Kartei-Wiese
  var xc=ox+(i-j)*hw,yc=oy+(i+j)*hh-l*st+hh;   // N7a3a: Feldmitte auch in ½ (1×: +16 wie vorher)
  if(!flach){hangBoden(L,px,w,h,xc,oy+(i+j)*hh,l,lE,lW,lS,hw,hh,st,d2,pal);continue}
  for(var q=0;q<L.length;q++){var sp=L[q],sx=xc-sp.ax,sy=yc-sp.ay,spx=sp.px,sw=sp.w,k0=sx<0?-sx:0,k1=sx+sw>w?w-sx:sw;
   for(var y=sy<0?-sy:0;y<sp.h&&sy+y<h;y++){var zo=(sy+y)*w+sx,zs=y*sw;for(var k=k0;k<k1;k++){var c=spx[zs+k];if(c!==255)px[zo+k]=pal[c]}}}}
 return z}
// N7a5e2: Boden eines schrägen Felds. yb = obere Ecke bei Höhe 0; je Bildspalte die Strecke der schrägen Raute (wie bild()) auf die Strecke der flachen Raute abbilden.
function hangBoden(L,px,w,h,xc,yb,lN,lE,lW,lS,hw,hh,st,d2,pal){var yN=yb-lN*st,yE=yb+hh-lE*st,yW=yb+hh-lW*st,yS=yb+2*hh-lS*st,fN=yb,fW=yb+hh,fS=yb+2*hh,yc=yb+hh;
 for(var hf=0;hf<2;hf++)for(var k=0;k<hw;k++){var f=2*k+1,x,T,U,T0,U0;
  if(!hf){x=xc-hw+k;T=yW+Math.floor((yN-yW)*f/d2);U=yW+Math.floor((yS-yW)*f/d2)+1;T0=fW+Math.floor((fN-fW)*f/d2);U0=fW+Math.floor((fS-fW)*f/d2)+1}
  else{x=xc+k;T=yN+Math.floor((yE-yN)*f/d2);U=yS+Math.floor((yE-yS)*f/d2)+1;T0=fN+Math.floor((fW-fN)*f/d2);U0=fS+Math.floor((fW-fS)*f/d2)+1}
  if(x<0||x>=w)continue;var dT=U-T||1;
  for(var t=T<0?0:T;t<=U&&t<h;t++){var tf=T0+Math.round((t-T)*(U0-T0)/dT),c=255;
   for(var q=0;q<L.length;q++){var sp=L[q],sx=x-(xc-sp.ax),sy=tf-(yc-sp.ay);if(sx<0||sy<0||sx>=sp.w||sy>=sp.h)continue;var v=sp.px[sy*sp.w+sx];if(v!==255)c=v}
   if(c!==255)px[t*w+x]=pal[c]}}}

// Kurzauskunft je Kartenstück für den Hauptkern: kleinste und größte Stufe je Block 8 × 8 Felder (für „was ist im Bild“) und ein Höhenraster 9 × 9 (Kamerahöhe).
function kunde(p){var H=sicht(p).H,mm=new Int16Array(128),hg=new Int16Array(81),bx,by,x,y;
 for(by=0;by<8;by++)for(bx=0;bx<8;bx++){var mn=32767,mx=0;
  for(y=by*8;y<=by*8+8;y++)for(x=bx*8;x<=bx*8+8;x++){var v=stufe(H[((y>63?63:y)<<6)|(x>63?63:x)]);if(v<mn)mn=v;if(v>mx)mx=v}
  mm[(by*8+bx)*2]=mn;mm[(by*8+bx)*2+1]=mx}
 for(y=0;y<9;y++)for(x=0;x<9;x++)hg[y*9+x]=stufe(H[((y*8>63?63:y*8)<<6)|(x*8>63?63:x*8)]);
 return{mm:mm,hg:hg}}

// Welches Feld liegt unter einem Bildpunkt? PX,PY = Bildpunkte der Zoomstufe 0 ab Weltursprung (x−y)·32, (x+y)·16 − Stufe·8. Vorderstes Feld gewinnt.
// x = Feld auf der Welt (0..WX−1), xu = dasselbe Feld in der Lage der Kamera (kann über die Naht hinausreichen; für die Natur darüber).
function feld(hole,PX,PY){var u=(PX/32+PY/16)/2,v=(PY/16-PX/32)/2;
 for(var t=48;t>=0;t-=.25){var xu=Math.floor(u+t),y=Math.floor(v+t),x=((xu%WX)+WX)%WX;if(y<0||y>=WY)continue;var p=hole(x>>6,y>>6);if(!p)continue;
  var s=sicht(p),q=((y&63)<<6)|(x&63),l=stufe(s.H[q]);if(l>=4*t)return{x:x,xu:xu,y:y,bio:s.B[q],weg:s.W[q],hoehe:s.H[q]-MEER}}
 return null}

var BB={sicht:sicht,ECK:ECK,TEIL:TEIL,STUFEN:STUFEN,LS:LS,ST:ST,SX:SX,SY:SY,WX:WX,WY:WY,MEER:MEER,BFARBE:BFARBE,WFARBE:WFARBE,bild:bild,kunde:kunde,feld:feld,stufe:stufe,hangBoden:hangBoden};
if(typeof module!=='undefined'&&module.exports)module.exports=BB;else root.AT3BB=BB;
})(typeof self!=='undefined'?self:this);
