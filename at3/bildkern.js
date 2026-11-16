// WAS DIE DATEI TUT: Bildkern von Arena Theory 3.0 (Schritt G4a). Ein eigener Hintergrundkern nur für die Kartenansicht: bekommt vom Hauptkern einmal das
// Erdraster (vom Weltkern), rechnet die Kartenstücke, die er zum Zeichnen braucht, selbst aus Seed und Erde (weltgen.js; reine Ansicht, gehört nicht zum Spielzustand,
// darum geht die Karte auch in der Pause), und macht daraus auf Anfrage Bodenbilder (bodenbild.js), die er als fertiges Bild zurückgibt (ImageBitmap; wo der Browser
// das im Hintergrund nicht kann, als Zahlenfeld). Hält höchstens die 7 × 7 Stücke um den Blick (Puffer werden wiederverwendet), nächste zuerst, eins nach dem anderen.
// Dazu: „welches Feld liegt unter dem Finger“ und der automatische Startplatz (erstes Dorf von der Weltmitte aus; nur noch für ?nosave und Tests).
// G4c: Startplatz-Wahl (startplatz.js): Erdbild, Regionsbild, trockenes Feld mit nächstem Ort, zufälliger Platz an Land; Antwort mit der Fragenummer.
// G4b: backt die Natur aus dem Startset (natur.js) mit ins Bodenbild und findet beim Antippen das vorderste Naturobjekt unter dem Finger.
// W1c Runde Welt: Das Fenster der Stücke läuft in x über die Naht (hole rechnet die Stückspalte um), in y endet es am Pol.
// Kerne: läuft nur als Hintergrundkern (Worker), gestartet von weltkarte.js, nie auf dem Hauptkern (Regel 13). Kein Zufall, kein Tick, keine Wirkung aufs Spiel.
'use strict';
importScripts('bodenbild.js'+self.location.search,'weltgen.js'+self.location.search,'natur.js'+self.location.search,'startplatz.js'+self.location.search);
var SP=self.AT3STARTPLATZ, ON=null, PBUF=null;
var BB=self.AT3BB, G=self.AT3WG, NAT=self.AT3NATUR, NBILD=null, F=null, st=new Map(), lager=[], gen=-1, HALB=3, A=null, seed=0, kx=-1, ky=-1, laeuft=false;
var BMP=typeof createImageBitmap==='function'&&typeof ImageData!=='undefined', stUs=0, stN=0;
var ORDNUNG=(function(){var L=[];for(var y=-HALB;y<=HALB;y++)for(var x=-HALB;x<=HALB;x++)L.push([x,y,x*x+y*y]);L.sort(function(a,b){return a[2]-b[2]||a[1]-b[1]||a[0]-b[0]});return L})();
var SX=G.SEITE_X, SY=G.SEITE_Y;
function um(cx){cx%=SX;return cx<0?cx+SX:cx}                                    // W1c: Stückspalte über die Naht
function ab(a,b){var d=Math.abs(a-b);return d>SX-d?SX-d:d}
function hole(cx,cy){return st.get(um(cx)*8192+cy)||null}
// Nächstes fehlendes Stück im Fenster rechnen, dann dem Hauptkern die Kurzauskunft schicken. Immer nur eins je Durchlauf (Bildanfragen kommen dazwischen dran).
function arbeit(){laeuft=false;if(!A||kx<0)return;
 for(var i=0;i<ORDNUNG.length;i++){var cx=um(kx+ORDNUNG[i][0]),cy=ky+ORDNUNG[i][1];if(cy<0||cy>=SY)continue;var k=cx*8192+cy;if(st.has(k))continue;
  var t=performance.now(),b=G.ausschnitt(A,cx,cy,lager.pop()||new Uint8Array(G.GEL_BYTES));G.gelaende({seed:seed,cx:cx,cy:cy,daten:b});b._s=null;st.set(k,b);stUs+=(performance.now()-t)*1000;stN++;
  var q=BB.kunde(b);self.postMessage({art:'kunde',gen:gen,cx:cx,cy:cy,mm:q.mm,hg:q.hg,stUs:stUs/stN},[q.mm.buffer,q.hg.buffer]);weiter();return}}
function weiter(){if(!laeuft){laeuft=true;setTimeout(arbeit,0)}}
function dunkelste(p){var b=0,bl=1e9;for(var i=0;i<p.length;i++){var c=p[i],l=(c&255)*3+((c>>8)&255)*6+((c>>16)&255);if(l<bl){bl=l;b=i}}return b}
// G4c: Fragen der Startplatz-Wahl. Bilder gehen als Zahlenfeld zurück (klein, einmalig), der Hauptkern malt sie nur.
function wahl(d){var m={art:'antwort',id:d.id},tr=[];if(!A||!F||d.gen!==gen){m.fehlt=true;self.postMessage(m);return}var t=performance.now();
 if(d.frage==='erdbild'){var e=SP.erdBild(A,F);m.w=SP.GW;m.h=SP.GH;m.buf=e;tr.push(e.buffer)}
 else if(d.frage==='region'){var rx=SP.eckeX(d.zx),ry=SP.eckeY(d.zy),r=SP.regionBild(G,seed,A,rx,ry,F);m.rx=rx;m.ry=ry;m.w=m.h=SP.RP;m.rs=SP.RS;m.buf=r;tr.push(r.buffer)}
 else if(d.frage==='platz'||d.frage==='zufall'){if(!ON){try{importScripts('ortsnamen.js'+self.location.search);ON=self.AT3ORTSNAMEN}catch(x){ON=null}}
  var x=d.x,y=d.y;if(d.frage==='zufall'){var z=SP.zufall(G,seed,A,d.r1,d.r2);if(!z){m.platz={ok:false};self.postMessage(m);return}x=z.x;y=z.y}
  PBUF=PBUF||new Uint8Array(G.GEL_BYTES);m.platz=SP.platz(G,ON,seed,A,x,y,PBUF)}
 m.us=(performance.now()-t)*1000;self.postMessage(m,tr)}
function startplatz(){var MX=G.GW>>1,MY=G.GH>>1,land=-1;
 for(var r=0;r<MY;r++)for(var dy=-r;dy<=r;dy++)for(var dx=-r;dx<=r;dx+=(Math.abs(dy)===r?1:2*r||1)){var x=MX+dx,y=MY+dy,i=y*G.GW+x;
  if(A.ort[i]&15){var p=G.ortPunkt(seed,A,x,y);return{x:p[0],y:p[1],ort:A.ort[i]&15}}
  if(land<0&&A.bio[i]>1&&A.bio[i]<10)land=i}
 return land<0?{x:BB.WX>>1,y:BB.WY>>1,ort:0}:{x:(land%G.GW)*G.ZF+(G.ZF>>1),y:((land/G.GW)|0)*G.ZF+(G.ZF>>1),ort:0}}
self.onmessage=function(e){var d=e.data;
 if(d.art==='init'){F={pal:d.pal,du:d.du,he:d.he,dunkel:dunkelste(d.pal)};self.postMessage({art:'arten',liste:NAT.ARTEN})}
 else if(d.art==='welt'){gen=d.gen;seed=d.seed>>>0;A=G.ansicht(d.buf.buffer);st.forEach(function(b){if(lager.length<8)lager.push(b)});st.clear();weiter()}
 else if(d.art==='blick'){kx=d.kx;ky=d.ky;st.forEach(function(b,k){if(ab((k/8192)|0,kx)>HALB||Math.abs(k%8192-ky)>HALB){st.delete(k);if(lager.length<8)lager.push(b)}});weiter()}
 else if(d.art==='natur'){NBILD=NAT.vorbereiten(d.liste,d.grau,d.rand)}                       // G4b: Bilder der Naturobjekte (nur übernommene, Rest grau)
 else if(d.art==='bild'){var t=performance.now(),r=d.gen===gen&&F?BB.bild(hole,d.x0,d.y0,d.lod,F,NBILD?{N:NAT,seed:seed,BILD:NBILD}:null):null,m={art:'bild',gen:d.gen,nv:d.nv,key:d.key,x0:d.x0,y0:d.y0,lod:d.lod};
  if(!r){m.fehlt=true;self.postMessage(m);return}
  m.w=r.w;m.h=r.h;m.ox=r.ox;m.oy=r.oy;m.natur=r.natur;m.us=(performance.now()-t)*1000;
  if(BMP)createImageBitmap(new ImageData(new Uint8ClampedArray(r.px.buffer),r.w,r.h)).then(function(b){m.bmp=b;self.postMessage(m,[b])},function(){BMP=false;m.buf=r.px;self.postMessage(m,[r.px.buffer])});
  else{m.buf=r.px;self.postMessage(m,[r.px.buffer])}}
 else if(d.art==='feld'){var fd=BB.feld(hole,d.px,d.py),ob=NBILD&&A?NAT.treffer(hole,d.px,d.py,seed,NBILD,BB.sicht,fd&&fd.xu,fd&&fd.y):null;if(fd&&ob)fd.obj=ob;else if(ob)fd={obj:ob};
  self.postMessage({art:'feld',id:d.id,feld:fd})}
 else if(d.art==='wahl')wahl(d);
 else if(d.art==='start'){self.postMessage({art:'start',gen:gen,platz:A?startplatz():null})}};
