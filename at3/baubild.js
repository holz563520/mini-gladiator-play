// WAS DIE DATEI TUT: Gebäude der Kartenansicht von Arena Theory 3.0 (Schritt G5b). Reine Rechnung ohne Bildschirm: zeichnet, was der Weltkern gebaut hat (bau.js,
// keine zweite Wahrheit), ins Bodenbild: Boden der Gebäudefelder, Wand, Tür, Tor auf den Feldkanten und das Dach je Feld, alles aus dem Startset (wand-stein,
// wand-tuer, wand-tor, dach-ziegel) als vorgezeichnete Bilder über den Höhenstufen, in einer Reihenfolge mit der Natur (hinten zuerst).
// Baustelle: geplant = nur Punktmuster (Umriss aus Luft und guten Absichten), in Arbeit = untere Hälfte steht, oben Punktmuster, fertig = ganz. Das Dach kommt erst,
// wenn das Feld fertig ist. Offenes Dach (wie 2.0, welt-gebaeude.js): Räume in „offen“ ohne Dach, ihre vorderen Wände nur kniehoch.
// Antippen: treffer() findet das vorderste Bauteil unter dem Finger (genauer Bildpunkt).
// Kerne: läuft im Bildkern (bildkern.js, Hintergrundkern), nie auf dem Hauptkern (Regel 13). Ein Bild sieht nur das eine Kartenstück, in dem es liegt (dazu für die
// vorderen Wände die Raumnummern der Nachbarn), Kosten je Bild fest und nur wo gebaut ist; unabhängig von Ort und Weltgröße (Regel 14).
// Wiederverwendet: Verkleinern je Zoomstufe und Treffer-Suche aus natur.js, Dach-auf-Regel und kniehohe Vorderwände aus 2.0 welt-gebaeude.js, Feldmaß aus bodenbild.js.
(function(root){
'use strict';
var ARTEN=['wand-stein','wand-tuer','wand-tor','dach-ziegel'], DACH=3;
var ST=64, F=ST*ST, WX=ST*9600, WY=ST*4800, MEER=2048, LS=6;
var F_DACH=1, F_ROD=2, Z_PLAN=1, Z_ARBEIT=2, Z_FERTIG=3;
var LIFT=25, KNIE=10;                      // Dach so hoch, dass die Traufe auf der Wandkrone sitzt (Bildpunkte bei 1×); offene Vorderwand kniehoch
var BODEN=[0,46,9,23], PUNKT=61;           // Boden je Art (Lager Sand, Werkstatt Erde, Unterkunft Holz), Punktmuster der Baustelle (Ocker)
function stufe(h){h=(h-MEER)>>LS;return h<0?0:h}

// Bilder je Art und Zoomstufe (wie natur.vorbereiten), Wände zusätzlich gespiegelt (Nordkante). unten[x]: unterste deckende Zeile je Spalte (für halbe und kniehohe Wände).
function klein(s,q){if(q===1)return s;var w=Math.max(1,Math.ceil(s.w/q)),h=Math.max(1,Math.ceil(s.h/q)),px=new Uint8Array(w*h);
 for(var y=0;y<h;y++)for(var x=0;x<w;x++){var sy=y*q,sx=x*q,c=s.px[Math.min(s.h-1,sy+(q>>1))*s.w+Math.min(s.w-1,sx+(q>>1))];
  if(c===255)for(var j=sy;j<sy+q&&j<s.h&&c===255;j++)for(var k=sx;k<sx+q&&k<s.w;k++){var v=s.px[j*s.w+k];if(v!==255){c=v;break}}
  px[y*w+x]=c}
 return{w:w,h:h,ax:Math.round(s.ax/q),ay:Math.round(s.ay/q),px:px}}
function spiegel(s){var px=new Uint8Array(s.w*s.h);for(var y=0;y<s.h;y++)for(var x=0;x<s.w;x++)px[y*s.w+x]=s.px[y*s.w+s.w-1-x];return{w:s.w,h:s.h,ax:s.w-s.ax,ay:s.ay,px:px}}
function unten(s){var u=new Int16Array(s.w).fill(-1);for(var x=0;x<s.w;x++)for(var y=s.h-1;y>=0;y--)if(s.px[y*s.w+x]!==255){u[x]=y;break}s.unten=u;return s}
function ersatz(i,grau,rand){var w=i===DACH?63:32,h=i===DACH?46:56,px=new Uint8Array(w*h).fill(255),x,y;
 if(i===DACH){for(y=0;y<32;y++)for(x=0;x<w;x++)if(Math.abs(x-31)/32+Math.abs(y-29)/16<=1)px[(y+13)*w+x]=Math.abs(x-31)/32+Math.abs(y-29)/16>.9?rand:grau;return{w:w,h:h,ax:31,ay:45,px:px}}
 for(x=0;x<w;x++){var b=55-(x>>1);for(y=b-34;y<=b;y++)px[y*w+x]=(y===b-34||x===0||x===w-1)?rand:grau}return{w:w,h:h,ax:0,ay:55,px:px}}
function vorbereiten(liste,grau,rand){return ARTEN.map(function(id,i){var s=liste&&liste[i],ers=!s;if(ers)s=ersatz(i,grau,rand);
 var L=[],M=[];for(var lod=0;lod<4;lod++){var k=unten(klein(s,1<<lod));L.push(k);if(i!==DACH)M.push(unten(spiegel(k)))}
 return{id:id,ersatz:ers,L:L,M:M}})}

// Raumnummer eines Felds aus einem gepackten Kartenstück (bau.js stueck: art, kn, kw, flag, dann raum als Uint32)
function raumIn(a,q){return a?(a[F*4+q*4]|a[F*4+q*4+1]<<8|a[F*4+q*4+2]<<16|a[F*4+q*4+3]<<24)>>>0:0}
function umX(X){return X<0?X+WX:X>=WX?X-WX:X}

// Bauteile eines Bodenbilds (Felder x0..x0+n−1, y0.., ein Bild liegt immer in einem Kartenstück). BA = {hole(cx,cy) → Puffer, BILD, offen: Set der Räume ohne Dach}.
// Füllt aus (Einträge wie natur.sammeln: tief, i, x/y = Ankerpunkt; dazu o = Reihenfolge im Feld, sp = Bild, m = 0 ganz, 1 Punktmuster, 2 halb, 3 kniehoch)
// und BOD (je Feld 0 oder Modus << 6 | Farbe für den Boden). Gibt die Zahl der Bauteile oder −1, wenn im Stück nichts gebaut ist.
function sammeln(BA,x0,y0,n,lod,ECK,aus,BOD){var a=BA.hole(x0>>6,y0>>6);if(!a)return -1;
 var m=n+1,hw=32>>lod,hh=16>>lod,st=8>>lod,B=BA.BILD,off=BA.offen,lift=Math.round(LIFT/(1<<lod)),nN=null,nW=null,z=0;
 if(off&&off.size){if(!(y0&63)&&y0>0)nN=BA.hole(x0>>6,(y0>>6)-1);if(!(x0&63))nW=BA.hole(umX(x0-1)>>6,y0>>6)}
 for(var j=0;j<n;j++)for(var i=0;i<n;i++){var X=x0+i,Y=y0+j,q=((Y&63)<<6)|(X&63),art=a[q],kn=a[F+q],kw=a[2*F+q],fl=a[3*F+q],e=j*m+i;
  BOD[j*n+i]=art?(((fl>>4)&3)<<6)|BODEN[art]:0;
  if(kn&3){var typ=(kn&3)-1,zN=(kn>>4)&3,kN=off&&off.size&&off.has(Y&63?raumIn(a,q-64):raumIn(nN,q+63*64))?3:0,sp=B[typ].M[lod];
   aus.push({tief:i+j,i:i,o:0,sp:sp,x:(i+1-j)*hw,y:(i+j+1)*hh-ECK[e+1]*st,m:kN||(zN===Z_FERTIG?0:zN===Z_ARBEIT?2:1),id:B[typ].id,ersatz:B[typ].ersatz});z++}
  if(kw&3){var typ2=(kw&3)-1,zW=(kw>>4)&3,kW=off&&off.size&&off.has(X&63?raumIn(a,q-1):raumIn(nW,q+63))?3:0,sp2=B[typ2].L[lod];
   aus.push({tief:i+j,i:i,o:0,sp:sp2,x:(i-j-1)*hw,y:(i+j+1)*hh-ECK[e+m]*st,m:kW||(zW===Z_FERTIG?0:zW===Z_ARBEIT?2:1),id:B[typ2].id,ersatz:B[typ2].ersatz});z++}
  if(art&&(fl&F_DACH)&&((fl>>4)&3)===Z_FERTIG&&!(off&&off.has(raumIn(a,q)))){
   aus.push({tief:i+j,i:i,o:2,sp:B[DACH].L[lod],x:(i-j)*hw,y:(i+j+2)*hh-ECK[e+m+1]*st-lift,m:0,id:B[DACH].id,ersatz:B[DACH].ersatz});z++}}
 return z}
// Ist auf diesem Feld Natur erlaubt? (gerodet oder bebaut: nein)
function frei(hole,X,Y){var a=hole(X>>6,Y>>6);if(!a)return true;var q=((Y&63)<<6)|(X&63);return !a[q]&&!(a[3*F+q]&F_ROD)}

// Boden der Gebäudefelder (eben, darum dieselbe Rasterung wie das Bodenbild): fertig = Boden mit Körnung, in Arbeit = halb, geplant = Punkte.
function boden(px,w,h,ox,oy,n,lod,ECK,BOD,pal,he,du){var m=n+1,hw=32>>lod,hh=16>>lod,st=8>>lod,d2=2*hw;
 for(var j=0;j<n;j++)for(var i=0;i<n;i++){var v=BOD[j*n+i];if(!v)continue;var md=v>>6,c=v&63,xc=ox+(i-j)*hw,yN=oy+(i+j)*hh-ECK[j*m+i]*st,yW=yN+hh,yS=yN+2*hh;
  var cP=pal[PUNKT],cF=pal[c],cL=pal[he[c]],cD=pal[du[c]];
  for(var k=0;k<hw;k++){var f=2*k+1;
   for(var s=0;s<2;s++){var x,t,u;                                               // dieselben Formeln wie bodenbild.bild (ebenes Feld), darum ohne Naht
    if(!s){x=xc-hw+k;t=yW+Math.floor(-hh*f/d2);u=yW+Math.floor(hh*f/d2)+1}else{x=xc+k;t=yN+Math.floor(hh*f/d2);u=yS+Math.floor(-hh*f/d2)+1}
    if(u>=h)u=h-1;if(t<0)t=0;var o=t*w+x;
    for(;t<=u;t++,o+=w){
     if(md===Z_FERTIG)px[o]=((x*7+t*13)&15)===0?cL:((x*5+t*11)&31)===1?cD:cF;
     else if(md===Z_ARBEIT){if((x+t)&1)px[o]=cF}
     else if(!(x&1)&&!(t&1)&&((x+t)&3)===0)px[o]=cP}}}}}

// Ein Bauteil (oder Naturbild) ins Bild: m 0 ganz, 1 Punktmuster, 2 untere Hälfte ganz und oben Punktmuster, 3 nur kniehoch.
function malen(px,w,ox,oy,pal,it,lod){var sp=it.sp,sx=ox+it.x-sp.ax,sy=oy+it.y-sp.ay,s=sp.px,sw=sp.w,md=it.m|0,U=sp.unten,grenze=md===2?17>>lod:md===3?Math.max(1,KNIE>>lod):0;
 for(var j=0;j<sp.h;j++){var zo=(sy+j)*w+sx,zs=j*sw;
  for(var k=0;k<sw;k++){var c=s[zs+k];if(c===255)continue;
   if(md){var ueber=U[k]-j>=grenze;if(md===3&&ueber)continue;if((md===1||(md===2&&ueber))&&((k+j)&1))continue}
   px[zo+k]=pal[c]}}}

// Vorderstes Bauteil unter dem Finger. PX,PY wie bodenbild.feld; holeB → Bau-Puffer, holeG/sicht → Kartenstück (Höhen). Gibt {id, ersatz, x, y, tief, teil, raum, art, zustand} oder null.
function treffer(holeB,holeG,sicht,PX,PY,BILD,offen,fx,fy){var u=fx!=null?fx:Math.floor((PX/32+PY/16)/2),v=fy!=null?fy:Math.floor((PY/16-PX/32)/2),best=null,bt=-1e9;
 function H(X,Y){X=umX(X);var p=holeG(X>>6,Y>>6);return p?stufe(sicht(p).H[((Y&63)<<6)|(X&63)]):null}
 function pruef(sp,ax,ay,tief,info){var lx=Math.floor(PX-ax+sp.ax),ly=Math.floor(PY-ay+sp.ay);if(lx<0||ly<0||lx>=sp.w||ly>=sp.h||sp.px[ly*sp.w+lx]===255)return;
  if(info.m===3&&sp.unten[lx]-ly>=KNIE)return;if(tief>bt){bt=tief;best=info}}
 for(var dy=-2;dy<=6;dy++)for(var dx=-2;dx<=6;dx++){var XU=u+dx,Y=v+dy,X=umX(((XU%WX)+WX)%WX);if(Y<0||Y>=WY-1)continue;var a=holeB(X>>6,Y>>6);if(!a)continue;
  var q=((Y&63)<<6)|(X&63),art=a[q],kn=a[F+q],kw=a[2*F+q],fl=a[3*F+q],r=raumIn(a,q),hN=H(X,Y),hE,hW,hS;if(hN==null)continue;
  if(kn&3){hE=H(X+1,Y);var rn=Y>0?raumIn(holeB(X>>6,(Y-1)>>6),(((Y-1)&63)<<6)|(X&63)):0;
   pruef(BILD[(kn&3)-1].M[0],(XU+1-Y)*32,(XU+Y+1)*16-(hE==null?hN:hE)*8,(XU+Y)*4,{id:BILD[(kn&3)-1].id,ersatz:BILD[(kn&3)-1].ersatz,x:X,y:Y,teil:'wand',seite:0,raum:r||rn,zustand:(kn>>4)&3,m:offen&&offen.has(rn)?3:0})}
  if(kw&3){hW=H(X,Y+1);var rw=raumIn(holeB(umX(X-1)>>6,Y>>6),((Y&63)<<6)|(umX(X-1)&63));
   pruef(BILD[(kw&3)-1].L[0],(XU-Y-1)*32,(XU+Y+1)*16-(hW==null?hN:hW)*8,(XU+Y)*4,{id:BILD[(kw&3)-1].id,ersatz:BILD[(kw&3)-1].ersatz,x:X,y:Y,teil:'wand',seite:1,raum:r||rw,zustand:(kw>>4)&3,m:offen&&offen.has(rw)?3:0})}
  if(art&&(fl&F_DACH)&&((fl>>4)&3)===Z_FERTIG&&!(offen&&offen.has(r))){hS=H(X+1,Y+1);
   pruef(BILD[DACH].L[0],(XU-Y)*32,(XU+Y+2)*16-(hS==null?hN:hS)*8-LIFT,(XU+Y)*4+3,{id:BILD[DACH].id,ersatz:BILD[DACH].ersatz,x:X,y:Y,teil:'dach',raum:r,art:art,zustand:Z_FERTIG,m:0})}}
 if(best){delete best.m;best.tief=bt}
 return best}
// Gebäudefeld unter dem Finger (Boden), für die Auskunft: {raum, art, zustand, dach} oder null
function feld(holeB,X,Y){var a=holeB(X>>6,Y>>6);if(!a)return null;var q=((Y&63)<<6)|(X&63);if(!a[q])return null;var fl=a[3*F+q];return{raum:raumIn(a,q),art:a[q],zustand:(fl>>4)&3,dach:!!(fl&F_DACH)}}

var BB_={ARTEN:ARTEN,LIFT:LIFT,KNIE:KNIE,BODEN:BODEN,vorbereiten:vorbereiten,sammeln:sammeln,frei:frei,boden:boden,malen:malen,treffer:treffer,feld:feld,raumIn:raumIn};
if(typeof module!=='undefined'&&module.exports)module.exports=BB_;else root.AT3BAUBILD=BB_;
})(typeof self!=='undefined'?self:this);
