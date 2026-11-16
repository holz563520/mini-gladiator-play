// WAS DIE DATEI TUT: Natur der Kartenansicht von Arena Theory 3.0 (Schritt G4b). Reine Rechnung ohne Bildschirm: welches Naturobjekt aus dem Startset
// (Bäume, Büsche, Blumen, Fels) auf welchem Feld steht – aus Seed, Feld und Biom, nichts gespeichert –, die Bilder dazu je Zoomstufe (verkleinert) und
// „welches Objekt liegt unter dem Finger“. Gezeichnet wird die Natur vom Bildkern direkt ins Bodenbild (bodenbild.js), einmal je Bild; danach kostet sie
// beim Zeichnen und Zoomen nichts mehr (Regel 20; Entscheidung Thomas 16.11.2026: auf der Karte zählt die Backzeit im Bildkern).
// Kerne: läuft im Bildkern (bildkern.js, Hintergrundkern), nie auf dem Hauptkern (Regel 13). Kosten je Feld fest, unabhängig von Ort und Weltgröße (Regel 14).
// Dichte je Biom: Vorschlag, von Thomas am 16.11.2026 so freigegeben (Wald etwa jedes 3. Feld ein Baum, Wüste nur Disteln und Fels, Strand und Schnee fast leer).
// Wiederverwendet: Objekte und Bilder aus der Objektkartei (Startset M9), Mischfunktion und Feldmaß aus bodenbild.js, Idee „Hohes als vorgezeichnete Bilder“ aus 2.0.
(function(root){
'use strict';
var ARTEN=['baum-eiche-skizze','baum-buche','baum-birke','baum-tanne','baum-pappel','baum-apfel','busch-gruen','busch-hasel','busch-bluete','blume-wiese','blume-distel','blume-schilf','fels-block'];
var EI=0,BU=1,BI=2,TA=3,PA=4,AP=5,BG=6,BH=7,BB_=8,WI=9,DI=10,SC=11,FE=12;
// Biome (weltgen.js): 0 tiefes Meer, 1 Meer, 2 Strand, 3 Wüste, 4 Steppe, 5 Wald, 6 Sumpf, 7 Tundra, 8 Fels, 9 Schnee, 10 Fluss, 11 See. Werte: Promille der Felder.
var DICHTE=[null,null,
 [[FE,4],[DI,6]],
 [[DI,25],[FE,15]],
 [[WI,50],[BG,25],[BH,15],[BB_,15],[AP,6],[EI,6],[PA,6]],
 [[BU,110],[EI,90],[BI,50],[TA,50],[PA,30],[BG,40],[BH,40],[WI,20]],
 [[SC,200],[BI,50],[BG,20]],
 [[TA,40],[FE,20],[BG,10]],
 [[FE,120],[BG,10],[TA,10]],
 [[FE,5]],null,null];
var TAB=DICHTE.map(function(L){if(!L)return null;var a=new Int16Array(1000).fill(-1),p=0;L.forEach(function(e){for(var k=0;k<e[1];k++)a[p++]=e[0]});return a});
var MEER=2048, LS=6, WX=614400, WY=307200, RAND_OBEN=112, RAND_SEITE=16;    // RAND_*: größte Überstände eines Naturbilds über sein Feld (Stufe 1×), für „was ist im Bild“
function mix(a){a=a>>>0;a^=a>>>16;a=Math.imul(a,0x7feb352d);a^=a>>>15;a=Math.imul(a,0x846ca68b);a^=a>>>16;return a>>>0}
function stufe(h){h=(h-MEER)>>LS;return h<0?0:h}
function zufall(seed,X,Y){return mix((seed^0x5bd1e995)^Math.imul(X,0x27d4eb2d)^Math.imul(Y,0x165667b1))}
// Art auf einem Feld: −1 = nichts. b Biom, w Wegschicht, steil = größte minus kleinste Eckstufe. Nichts auf Wasser, Wegen, Plätzen und Hängen über eine Stufe.
function art(seed,X,Y,b,w,steil){if(w||steil>1)return -1;var t=TAB[b];if(!t)return -1;return t[zufall(seed,X,Y)%1000]}
// Kleine Verschiebung im Feld (Stufe 1×, Bildpunkte), damit nichts im Raster steht.
function versatz(seed,X,Y){var r=zufall(seed,X,Y);return[((r>>>12)&15)-8,((r>>>16)&7)-4]}

// Bilder: liste[i] = {w,h,ax,ay,px: Uint8Array (Farbnummer, 255 = durchsichtig)} oder null (nicht übernommen → graues Ersatzbild). grau/rand = Farbnummern.
// Ergebnis: je Art und Zoomstufe ein Bild, nur einmal je Welt gerechnet.
function vorbereiten(liste,grau,rand){var aus=[];
 for(var i=0;i<ARTEN.length;i++){var s=liste&&liste[i],ersatz=false;
  if(!s){ersatz=true;s={w:16,h:22,ax:8,ay:21,px:new Uint8Array(16*22)};for(var y=0;y<22;y++)for(var x=0;x<16;x++)s.px[y*16+x]=(x===0||x===15||y===0)?rand:grau}
  var L=[];for(var lod=0;lod<4;lod++){var q=1<<lod;if(!lod){L.push(s);continue}
   var w=Math.max(1,Math.ceil(s.w/q)),h=Math.max(1,Math.ceil(s.h/q)),px=new Uint8Array(w*h);
   for(var y2=0;y2<h;y2++)for(var x2=0;x2<w;x2++){var c=255,sy=y2*q,sx=x2*q;                                        // Mitte des Blocks zuerst, sonst irgendein Bildpunkt
    var my=Math.min(s.h-1,sy+(q>>1)),mx=Math.min(s.w-1,sx+(q>>1));c=s.px[my*s.w+mx];
    if(c===255)for(var j=sy;j<sy+q&&j<s.h&&c===255;j++)for(var k=sx;k<sx+q&&k<s.w;k++){var v=s.px[j*s.w+k];if(v!==255){c=v;break}}
    px[y2*w+x2]=c}
   L.push({w:w,h:h,ax:Math.round(s.ax/q),ay:Math.round(s.ay/q),px:px})}
  aus.push({id:ARTEN[i],ersatz:ersatz,L:L})}
 return aus}

// Liste der Naturobjekte eines Bodenbilds (Felder x0..x0+n−1, y0..), schon in Zeichenreihenfolge (hinten zuerst). ECK = Eckstufen (n+1)², B/W Biom und Weg.
// Je Eintrag: Art, Feld i/j, Ankerpunkt relativ zur oberen Ecke des Feldes 0/0 auf Stufe 0 (Bildpunkte der Zoomstufe).
// G5b: ok(X,Y) (frei) = false auf bebauten und gerodeten Feldern (baubild.frei) → dort keine Natur.
function sammeln(seed,x0,y0,n,lod,ECK,B,W,aus,ok){var m=n+1,hw=32>>lod,hh=16>>lod,st=8>>lod;aus.length=0;
 for(var j=0;j<n;j++)for(var i=0;i<n;i++){var X=x0+i,Y=y0+j,q=((Y&63)<<6)|(X&63),e=j*m+i,a=ECK[e],b=ECK[e+1],c=ECK[e+m],d=ECK[e+m+1];
  var mn=Math.min(a,b,c,d),mx=Math.max(a,b,c,d),t=art(seed,X,Y,B[q],W[q],mx-mn);if(t<0||(ok&&!ok(X,Y)))continue;
  var v=versatz(seed,X,Y);aus.push({t:t,tief:i+j,i:i,x:(i-j)*hw+(v[0]>>lod),y:(i+j)*hh+hh+(v[1]>>lod)-(((a+b+c+d)*st+2)>>2)})}
 aus.sort(function(p,q2){return p.tief-q2.tief||p.i-q2.i});return aus}

// Objekt unter dem Finger. PX,PY wie bodenbild.feld (Stufe 1×); gesucht wird ab dem Feld unter dem Finger nach vorn (Bäume ragen über Felder dahinter). hole(cx,cy) → Kartenstück. Vorderstes deckendes Bild gewinnt (genauer Bildpunkt, nicht Rahmen).
// W1c: fx darf über die Naht hinausreichen (Lage der Kamera); gerechnet wird die Lage mit XU, das Feld selbst (Art, Versatz, Kartenstück) mit X auf der Welt.
// G5b: ok(X,Y) wie bei sammeln (keine Natur auf Gebautem/Gerodetem).
function treffer(hole,PX,PY,seed,BILD,sicht,fx,fy,frei){var u=fx!=null?fx:Math.floor((PX/32+PY/16)/2),v=fy!=null?fy:Math.floor((PY/16-PX/32)/2),best=null,bt=-1e9;   // fx,fy: Feld unter dem Finger (bodenbild.feld), sonst ohne Höhe geschätzt
 for(var dy=-3;dy<=8;dy++)for(var dx=-3;dx<=8;dx++){var XU=u+dx,Y=v+dy,X=((XU%WX)+WX)%WX;if(Y<0||Y>=WY-1)continue;
  var H=[0,0,0,0],ok=true;for(var k=0;k<4&&ok;k++){var x=X+(k&1),y=Y+(k>>1);if(x>=WX)x-=WX;var p=hole(x>>6,y>>6);if(!p){ok=false;break}H[k]=stufe(sicht(p).H[((y&63)<<6)|(x&63)])}
  if(!ok)continue;var p0=sicht(hole(X>>6,Y>>6)),q=((Y&63)<<6)|(X&63),mn=Math.min(H[0],H[1],H[2],H[3]),mx=Math.max(H[0],H[1],H[2],H[3]);
  var t=art(seed,X,Y,p0.B[q],p0.W[q],mx-mn);if(t<0||XU+Y<=bt||(frei&&!frei(X,Y)))continue;
  var vs=versatz(seed,X,Y),s=BILD[t].L[0],ax=(XU-Y)*32+vs[0],ay=(XU+Y)*16+16+vs[1]-(((H[0]+H[1]+H[2]+H[3])*8+2)>>2),lx=Math.floor(PX-ax+s.ax),ly=Math.floor(PY-ay+s.ay);
  if(lx<0||ly<0||lx>=s.w||ly>=s.h||s.px[ly*s.w+lx]===255)continue;bt=XU+Y;best={id:BILD[t].id,ersatz:BILD[t].ersatz,x:X,y:Y}}
 return best}

var N={ARTEN:ARTEN,DICHTE:DICHTE,RAND_OBEN:RAND_OBEN,RAND_SEITE:RAND_SEITE,art:art,versatz:versatz,vorbereiten:vorbereiten,sammeln:sammeln,treffer:treffer};
if(typeof module!=='undefined'&&module.exports)module.exports=N;else root.AT3NATUR=N;
})(typeof self!=='undefined'?self:this);
