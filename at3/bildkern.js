// WAS DIE DATEI TUT: Bildkern von Arena Theory 3.0 (Schritt G4a). Ein eigener Hintergrundkern nur für die Kartenansicht: bekommt vom Hauptkern einmal das
// Erdraster (vom Weltkern), rechnet die Kartenstücke, die er zum Zeichnen braucht, selbst aus Seed und Erde (weltgen.js; reine Ansicht, gehört nicht zum Spielzustand,
// darum geht die Karte auch in der Pause), und macht daraus auf Anfrage Bodenbilder (bodenbild.js), die er als fertiges Bild zurückgibt (ImageBitmap; wo der Browser
// das im Hintergrund nicht kann, als Zahlenfeld). Hält höchstens die 7 × 7 Stücke um den Blick (Puffer werden wiederverwendet), nächste zuerst, eins nach dem anderen.
// Dazu: „welches Feld liegt unter dem Finger“ und der automatische Startplatz (erstes Dorf von der Weltmitte aus; nur noch für ?nosave und Tests).
// G4c: Startplatz-Wahl (startplatz.js): Erdbild, Regionsbild, trockenes Feld mit nächstem Ort, zufälliger Platz an Land; Antwort mit der Fragenummer.
// G4b: backt die Natur aus dem Startset (natur.js) mit ins Bodenbild und findet beim Antippen das vorderste Naturobjekt unter dem Finger.
// W1c Runde Welt: Das Fenster der Stücke läuft in x über die Naht (hole rechnet die Stückspalte um), in y endet es am Pol.
// G4d: Fernbilder der Stufen ⅟16 bis ⅟4096 (fernbild.js, nur aus dem Erdraster, ohne Kartenstücke) und der Globus (Frage „globus“, aus dem Erdbild der Startplatz-Wahl).
// FP1: Frage „fp“: Ausschnitt der echten Welt für die First-Person-Ansicht (fpausschnitt.js).
// G5b: Gebäude (baubild.js). Der Hauptkern reicht die geänderten Bau-Kartenstücke vom Weltkern weiter (Nachricht „bau“, dünn: nur wo gebaut ist) und die Bilder
// aus dem Startset („bauBilder“). Bodenbilder bekommen Boden, Wände und Dach mit; auf Gebautem und Gerodetem keine Natur (auch nicht in First Person).
// Anfrage „bild“ mit „offen“ (Räume ohne Dach, nur Stufe 1×). Antippen findet das vorderste Bauteil oder die Natur davor und meldet das Gebäudefeld.
// Kerne: läuft nur als Hintergrundkern (Worker), gestartet von weltkarte.js, nie auf dem Hauptkern (Regel 13). Kein Zufall, kein Tick, keine Wirkung aufs Spiel.
'use strict';
importScripts('bodenbild.js'+self.location.search,'weltgen.js'+self.location.search,'natur.js'+self.location.search,'startplatz.js'+self.location.search,'fernbild.js'+self.location.search,'baubild.js'+self.location.search);
var BAUB=self.AT3BAUBILD, BAU=new Map(), BBILD=null, SP=self.AT3STARTPLATZ, FB=self.AT3FERN, ON=null, PBUF=null, TEX=null, TEXD=null, UEB=null;
var BB=self.AT3BB, G=self.AT3WG, NAT=self.AT3NATUR, NBILD=null, F=null, st=new Map(), lager=[], gen=-1, HALB=3, A=null, seed=0, kx=-1, ky=-1, laeuft=false;
var BMP=typeof createImageBitmap==='function'&&typeof ImageData!=='undefined', stUs=0, stN=0;
var ORDNUNG=(function(){var L=[];for(var y=-HALB;y<=HALB;y++)for(var x=-HALB;x<=HALB;x++)L.push([x,y,x*x+y*y]);L.sort(function(a,b){return a[2]-b[2]||a[1]-b[1]||a[0]-b[0]});return L})();
var SX=G.SEITE_X, SY=G.SEITE_Y;
function um(cx){cx%=SX;return cx<0?cx+SX:cx}                                    // W1c: Stückspalte über die Naht
function ab(a,b){var d=Math.abs(a-b);return d>SX-d?SX-d:d}
function hole(cx,cy){return st.get(um(cx)*8192+cy)||null}
function holeBau(cx,cy){return BAU.size?BAU.get(um(cx)*8192+cy)||null:null}
function bauFrei(X,Y){return BAUB.frei(holeBau,X,Y)}
function BA(offen){return BBILD?{M:BAUB,hole:holeBau,BILD:BBILD,offen:offen&&offen.length?new Set(offen):null}:null}
// Nächstes fehlendes Stück im Fenster rechnen, dann dem Hauptkern die Kurzauskunft schicken. Immer nur eins je Durchlauf (Bildanfragen kommen dazwischen dran).
function arbeit(){laeuft=false;if(!A||kx<0)return;
 for(var i=0;i<ORDNUNG.length;i++){var cx=um(kx+ORDNUNG[i][0]),cy=ky+ORDNUNG[i][1];if(cy<0||cy>=SY)continue;var k=cx*8192+cy;if(st.has(k))continue;
  var t=performance.now(),b=G.ausschnitt(A,cx,cy,lager.pop()||new Uint8Array(G.GEL_BYTES));G.gelaende({seed:seed,cx:cx,cy:cy,daten:b});b._s=null;st.set(k,b);stUs+=(performance.now()-t)*1000;stN++;
  var q=BB.kunde(b);self.postMessage({art:'kunde',gen:gen,cx:cx,cy:cy,mm:q.mm,hg:q.hg,stUs:stUs/stN},[q.mm.buffer,q.hg.buffer]);weiter();return}}
function weiter(){if(!laeuft){laeuft=true;setTimeout(arbeit,0)}}
// Übersichtsbiome (Globus, Fernstufen ab ⅟1024): einmal je Welt, beim ersten Bedarf
function ueb(){if(!UEB)UEB=FB.uebersicht(G,A,seed);return UEB}
function dunkelste(p){var b=0,bl=1e9;for(var i=0;i<p.length;i++){var c=p[i],l=(c&255)*3+((c>>8)&255)*6+((c>>16)&255);if(l<bl){bl=l;b=i}}return b}
// G4c: Fragen der Startplatz-Wahl. Bilder gehen als Zahlenfeld zurück (klein, einmalig), der Hauptkern malt sie nur.
function wahl(d){var m={art:'antwort',id:d.id},tr=[];if(!A||!F||d.gen!==gen){m.fehlt=true;self.postMessage(m);return}var t=performance.now();
 if(d.frage==='fp'){fp(d,m,t);return}
 if(d.frage==='globus'){if(!TEX){TEX=SP.erdBild(A,F,ueb(),FB.UFARBE);TEXD=FB.dunkler(TEX,F)}var gl=FB.globus(TEX,TEXD,d.W,d.H,d.R,d.lon,d.lat,d.s,F.pal[F.dunkel]);m.w=gl.w;m.h=gl.h;m.buf=gl.px;tr.push(gl.px.buffer)}
 else if(d.frage==='erdbild'){var e=SP.erdBild(A,F);m.w=SP.GW;m.h=SP.GH;m.buf=e;tr.push(e.buffer)}
 else if(d.frage==='region'){var rx=SP.eckeX(d.zx),ry=SP.eckeY(d.zy),r=SP.regionBild(G,seed,A,rx,ry,F);m.rx=rx;m.ry=ry;m.w=m.h=SP.RP;m.rs=SP.RS;m.buf=r;tr.push(r.buffer)}
 else if(d.frage==='platz'||d.frage==='zufall'){if(!ON){try{importScripts('ortsnamen.js'+self.location.search);ON=self.AT3ORTSNAMEN}catch(x){ON=null}}
  var x=d.x,y=d.y;if(d.frage==='zufall'){var z=SP.zufall(G,seed,A,d.r1,d.r2);if(!z){m.platz={ok:false};self.postMessage(m);return}x=z.x;y=z.y}
  PBUF=PBUF||new Uint8Array(G.GEL_BYTES);m.platz=SP.platz(G,ON,seed,A,x,y,PBUF)}
 m.us=(performance.now()-t)*1000;self.postMessage(m,tr)}
// FP1: Ausschnitt 96 × 96 Felder um den Gladiator (fpausschnitt.js, erst beim ersten Mal geladen). Das Fenster der Stücke rückt zum Ausschnitt,
// fehlende Stücke werden sofort gerechnet (höchstens 9), dann geht der Ausschnitt ohne Kopie an den Hauptkern.
var FPA=null;
function fp(d,m,t){if(!FPA){importScripts('fpausschnitt.js'+self.location.search);FPA=self.AT3FPA}
 var L=FPA.stuecke(BB,d.ox,d.oy),mx=L[0][0]+((L[L.length-1][0]-L[0][0]+SX)%SX>>1),my=(L[0][1]+L[L.length-1][1])>>1,neu=0;kx=um(mx);ky=my;
 st.forEach(function(b,k){if(ab((k/8192)|0,kx)>HALB||Math.abs(k%8192-ky)>HALB){st.delete(k);if(lager.length<8)lager.push(b)}});
 L.forEach(function(c){var k=um(c[0])*8192+c[1];if(st.has(k))return;var b=G.ausschnitt(A,c[0],c[1],lager.pop()||new Uint8Array(G.GEL_BYTES));G.gelaende({seed:seed,cx:c[0],cy:c[1],daten:b});b._s=null;st.set(k,b);neu++});
 var sp=new Uint8Array(NAT.ARTEN.length);(d.sperr||[]).forEach(function(id){var i=NAT.ARTEN.indexOf(id);if(i>=0)sp[i]=1});
 var w=FPA.bauen(BB,NAT,hole,seed,d.ox,d.oy,sp,F,BAU.size?bauFrei:null);m.welt=w;m.arten=NAT.ARTEN;m.neu=neu;m.us=(performance.now()-t)*1000;self.postMessage(m,FPA.puffer(w));weiter()}
function startplatz(){var MX=G.GW>>1,MY=G.GH>>1,land=-1;
 for(var r=0;r<MY;r++)for(var dy=-r;dy<=r;dy++)for(var dx=-r;dx<=r;dx+=(Math.abs(dy)===r?1:2*r||1)){var x=MX+dx,y=MY+dy,i=y*G.GW+x;
  if(A.ort[i]&15){var p=G.ortPunkt(seed,A,x,y);return{x:p[0],y:p[1],ort:A.ort[i]&15}}
  if(land<0&&A.bio[i]>1&&A.bio[i]<10)land=i}
 return land<0?{x:BB.WX>>1,y:BB.WY>>1,ort:0}:{x:(land%G.GW)*G.ZF+(G.ZF>>1),y:((land/G.GW)|0)*G.ZF+(G.ZF>>1),ort:0}}
self.onmessage=function(e){var d=e.data;
 if(d.art==='init'){F={pal:d.pal,du:d.du,he:d.he,dunkel:dunkelste(d.pal)};self.postMessage({art:'arten',liste:NAT.ARTEN,bau:BAUB.ARTEN})}
 else if(d.art==='welt'){gen=d.gen;seed=d.seed>>>0;A=G.ansicht(d.buf.buffer);TEX=TEXD=UEB=null;st.forEach(function(b){if(lager.length<8)lager.push(b)});st.clear();weiter()}
 else if(d.art==='blick'){kx=d.kx;ky=d.ky;st.forEach(function(b,k){if(ab((k/8192)|0,kx)>HALB||Math.abs(k%8192-ky)>HALB){st.delete(k);if(lager.length<8)lager.push(b)}});weiter()}
 else if(d.art==='natur'){NBILD=NAT.vorbereiten(d.liste,d.grau,d.rand);if(d.bau)BBILD=BAUB.vorbereiten(d.bau,d.grau,d.rand)}   // G4b: Bilder der Naturobjekte (nur übernommene, Rest grau); G5b: Bauteile
 else if(d.art==='bau'){if(d.leer)BAU.clear();(d.stuecke||[]).forEach(function(e){if(e[1])BAU.set(e[0],e[1]);else BAU.delete(e[0])})}           // G5b: Bau-Kartenstücke (dünn)
 else if(d.art==='bild'){var t=performance.now(),r=d.gen!==gen||!F?null:d.lod>=BB.STUFEN?(A?FB.kachel(G,A,seed,d.x0,d.y0,d.lod,F,d.lod>=FB.U_AB?ueb():null):null):BB.bild(hole,d.x0,d.y0,d.lod,F,NBILD?{N:NAT,seed:seed,BILD:NBILD}:null,BA(d.offen)),m={art:'bild',gen:d.gen,nv:d.nv,key:d.key,x0:d.x0,y0:d.y0,lod:d.lod};
  if(!r){m.fehlt=true;self.postMessage(m);return}
  m.w=r.w;m.h=r.h;m.ox=r.ox;m.oy=r.oy;m.natur=r.natur;m.bau=r.bau||0;m.us=(performance.now()-t)*1000;
  if(BMP)createImageBitmap(new ImageData(new Uint8ClampedArray(r.px.buffer),r.w,r.h)).then(function(b){m.bmp=b;self.postMessage(m,[b])},function(){BMP=false;m.buf=r.px;self.postMessage(m,[r.px.buffer])});
  else{m.buf=r.px;self.postMessage(m,[r.px.buffer])}}
 else if(d.art==='feld'){var fd=BB.feld(hole,d.px,d.py),ob=NBILD&&A?NAT.treffer(hole,d.px,d.py,seed,NBILD,BB.sicht,fd&&fd.xu,fd&&fd.y,BAU.size?bauFrei:null):null;
  if(BAU.size&&BBILD&&A){var bt=BAUB.treffer(holeBau,hole,BB.sicht,d.px,d.py,BBILD,d.offen&&d.offen.length?new Set(d.offen):null,fd&&fd.xu,fd&&fd.y);   // G5b: Bauteil vor oder hinter der Natur?
   if(bt&&(!ob||bt.tief>=(ob.x+ob.y)*4+1))ob=bt;var bf=fd&&fd.x!=null?BAUB.feld(holeBau,fd.x,fd.y):null;if(bf){fd.bau=bf}else if(bt&&bt.raum&&fd)fd.bau=BAUB.feld(holeBau,bt.x,bt.y)||{raum:bt.raum,art:0,zustand:bt.zustand}}
  if(fd&&ob)fd.obj=ob;else if(ob)fd={obj:ob};
  self.postMessage({art:'feld',id:d.id,feld:fd})}
 else if(d.art==='wahl')wahl(d);
 else if(d.art==='start'){self.postMessage({art:'start',gen:gen,platz:A?startplatz():null})}};
