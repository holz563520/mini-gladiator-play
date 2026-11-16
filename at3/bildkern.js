// WAS DIE DATEI TUT: Bildkern von Arena Theory 3.0 (Schritt G4a). Ein eigener Hintergrundkern nur für die Kartenansicht: bekommt vom Hauptkern einmal das
// Erdraster (vom Weltkern), rechnet die Kartenstücke, die er zum Zeichnen braucht, selbst aus Seed und Erde (weltgen.js; reine Ansicht, gehört nicht zum Spielzustand,
// darum geht die Karte auch in der Pause), und macht daraus auf Anfrage Bodenbilder (bodenbild.js), die er als fertiges Bild zurückgibt (ImageBitmap; wo der Browser
// das im Hintergrund nicht kann, als Zahlenfeld). Hält höchstens die 7 × 7 Stücke um den Blick (Puffer werden wiederverwendet), nächste zuerst, eins nach dem anderen.
// Dazu: „welches Feld liegt unter dem Finger“ und der vorläufige Startplatz bis G4c (erstes Dorf von der Weltmitte aus).
// Kerne: läuft nur als Hintergrundkern (Worker), gestartet von weltkarte.js, nie auf dem Hauptkern (Regel 13). Kein Zufall, kein Tick, keine Wirkung aufs Spiel.
'use strict';
importScripts('bodenbild.js'+self.location.search,'weltgen.js'+self.location.search);
var BB=self.AT3BB, G=self.AT3WG, F=null, st=new Map(), lager=[], gen=-1, HALB=3, A=null, seed=0, kx=-1, ky=-1, laeuft=false;
var BMP=typeof createImageBitmap==='function'&&typeof ImageData!=='undefined', stUs=0, stN=0;
var ORDNUNG=(function(){var L=[];for(var y=-HALB;y<=HALB;y++)for(var x=-HALB;x<=HALB;x++)L.push([x,y,x*x+y*y]);L.sort(function(a,b){return a[2]-b[2]||a[1]-b[1]||a[0]-b[0]});return L})();
function hole(cx,cy){return st.get(cx*8192+cy)||null}
// Nächstes fehlendes Stück im Fenster rechnen, dann dem Hauptkern die Kurzauskunft schicken. Immer nur eins je Durchlauf (Bildanfragen kommen dazwischen dran).
function arbeit(){laeuft=false;if(!A||kx<0)return;
 for(var i=0;i<ORDNUNG.length;i++){var cx=kx+ORDNUNG[i][0],cy=ky+ORDNUNG[i][1];if(cx<0||cy<0||cx>=G.SEITE||cy>=G.SEITE)continue;var k=cx*8192+cy;if(st.has(k))continue;
  var t=performance.now(),b=G.ausschnitt(A,cx,cy,lager.pop()||new Uint8Array(G.GEL_BYTES));G.gelaende({seed:seed,cx:cx,cy:cy,daten:b});b._s=null;st.set(k,b);stUs+=(performance.now()-t)*1000;stN++;
  var q=BB.kunde(b);self.postMessage({art:'kunde',gen:gen,cx:cx,cy:cy,mm:q.mm,hg:q.hg,stUs:stUs/stN},[q.mm.buffer,q.hg.buffer]);weiter();return}}
function weiter(){if(!laeuft){laeuft=true;setTimeout(arbeit,0)}}
function startplatz(){var M=G.GE>>1,land=-1;
 for(var r=0;r<M;r++)for(var dy=-r;dy<=r;dy++)for(var dx=-r;dx<=r;dx+=(Math.abs(dy)===r?1:2*r||1)){var x=M+dx,y=M+dy,i=y*G.GE+x;
  if(A.ort[i]&15){var p=G.ortPunkt(seed,A,x,y);return{x:p[0],y:p[1],ort:A.ort[i]&15}}
  if(land<0&&A.bio[i]>1&&A.bio[i]<10)land=i}
 return land<0?{x:BB.WELT>>1,y:BB.WELT>>1,ort:0}:{x:(land%G.GE)*G.ZF+(G.ZF>>1),y:((land/G.GE)|0)*G.ZF+(G.ZF>>1),ort:0}}
self.onmessage=function(e){var d=e.data;
 if(d.art==='init'){F={pal:d.pal,du:d.du,he:d.he}}
 else if(d.art==='welt'){gen=d.gen;seed=d.seed>>>0;A=G.ansicht(d.buf.buffer);st.forEach(function(b){if(lager.length<8)lager.push(b)});st.clear();weiter()}
 else if(d.art==='blick'){kx=d.kx;ky=d.ky;st.forEach(function(b,k){if(Math.abs(((k/8192)|0)-kx)>HALB||Math.abs(k%8192-ky)>HALB){st.delete(k);if(lager.length<8)lager.push(b)}});weiter()}
 else if(d.art==='bild'){var t=performance.now(),r=d.gen===gen&&F?BB.bild(hole,d.x0,d.y0,d.lod,F):null,m={art:'bild',gen:d.gen,key:d.key,x0:d.x0,y0:d.y0,lod:d.lod};
  if(!r){m.fehlt=true;self.postMessage(m);return}
  m.w=r.w;m.h=r.h;m.ox=r.ox;m.oy=r.oy;m.us=(performance.now()-t)*1000;
  if(BMP)createImageBitmap(new ImageData(new Uint8ClampedArray(r.px.buffer),r.w,r.h)).then(function(b){m.bmp=b;self.postMessage(m,[b])},function(){BMP=false;m.buf=r.px;self.postMessage(m,[r.px.buffer])});
  else{m.buf=r.px;self.postMessage(m,[r.px.buffer])}}
 else if(d.art==='feld'){self.postMessage({art:'feld',id:d.id,feld:BB.feld(hole,d.px,d.py)})}
 else if(d.art==='start'){self.postMessage({art:'start',gen:gen,platz:A?startplatz():null})}};
