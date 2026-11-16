// WAS DIE DATEI TUT: Kartenansicht von Arena Theory 3.0 (Schritt G4a): Kamera, Wischen, Zoom in vier festen Stufen (1×, ½, ¼, ⅛) und das Zeichnen der fertigen
// Bodenbilder. Die Bilder rechnet der Bildkern (bildkern.js + bodenbild.js) aus Kartenstücken, die er aus Seed und Erde selbst erzeugt; der Hauptkern reicht nur
// das Erdraster weiter, fragt Bilder an und kopiert sie ins Bild (Regel 13). Gezeichnet wird nur, wenn sich etwas geändert hat.
// Zeichenregeln (Regel 20): höchstens ANFRAGEN Bilder zugleich in Arbeit, Sichtbares zuerst (Mitte vor Rand); was fehlt, zeigt ein Ersatzbild (Bild der Nachbarstufe
// vergrößert oder verkleinert, sonst eine graue Raute), nie eine Lücke; beim Zoomen wird nichts Neues angefangen (erst wenn die Hand ruht); in Ruhe wird die
// Nachbarstufe vorbereitet. Bildspeicher nach echten Bytes begrenzt (SPEICHER), am längsten Ungenutztes fliegt zuerst.
// Riesenwelt (Regel 14): Kosten hängen nur vom Bildausschnitt ab; bekannt sind immer nur die 7 × 7 Kartenstücke um den Blick (Befehl blick an den Weltkern für
// die Spielwelt, an den Bildkern für die Ansicht).
// Höhe: Die Kamera folgt weich der Geländehöhe unter der Bildmitte; „was ist im Bild“ rechnet mit kleinster und größter Stufe je Block (Auskunft des Bildkerns).
// G4b: Natur steckt schon in den Bodenbildern (vom Bildkern gebacken); hier nur die größeren Bildränder beim „was ist im Bild“ und das Weiterreichen der Bilder.
// FP1: Solange First Person läuft (Karte versteckt), wird nichts gezeichnet und nichts angefragt; frage('fp') holt den Ausschnitt beim Bildkern.
// G4c: neue Welt ohne Kameraort → statt automatischem Start ruft die Karte o.beiErde() (Startplatz-Wahl, startwahl.js); frage() reicht deren Fragen an den Bildkern.
// W1c Runde Welt: Die Kamera läuft in x um (cam.x immer 0..WX−1). Gezeichnet wird jedes Kartenstück in der Lage relativ zur Kamera (Stückspalte um ganze
// Weltbreiten verschoben), darum springt beim Wischen über die Naht nichts. Bildschlüssel und Anfragen bleiben auf die Welt bezogen (ein Bild je Ort, nichts
// doppelt im Bildspeicher). In y hält die Kamera POL Felder vor dem Polrand an: man sieht nie über den Weltrand hinaus.
// G4d Zoom bis zum Globus: nach ⅛ weitere Fernstufen ⅟16 … ⅟4096 (lod 4 bis MAXL = 12), gemalt vom Bildkern nur aus dem Erdraster (fernbild.js, nie aus
// Kartenstücken), gleiche Bildschlüssel, gleicher Bildspeicher, gleiches Ersatzbild aus der Nachbarstufe. In den Fernstufen ruht das Fenster der Kartenstücke
// (kein blick an Welt- und Bildkern, die Kamera sinkt weich auf Meereshöhe); zurück in ⅛ zeigt das Fernbild ⅟16 als Untergrund, bis die Stücke da sind.
// Nach ⅟4096 der Globus (Norden oben): Stufen mit halbem Halbmesser bis die ganze Kugel passt; Wischen dreht, Kneifen/Knöpfe zoomen zurück in die Karte (⅟4096 an
// der Mitte der Kugel), Antippen springt in ⅛ an die Stelle. Der Globus wird im Bildkern gerechnet (halbe Auflösung), hier nur das letzte Bild kopiert.
// G4d Startplatz-Wahl (Wunsch Thomas): wahlStart() beginnt beim ganzen Globus, voller Zoom wie im Spiel; Antippen meldet auf jeder Stufe (auch auf dem Globus) das Feld
// der Welt an die Wahl (statt zu springen), marke() malt das Kreuz auf Karte und Globus, zeigeAuf() schaut auf einen Platz. Während der Wahl gibt kam() null (nichts gespeichert).
// Wiederverwendet: Vorgehen von welt-raster.js/welt-gross.js aus 2.0 (Bodenkacheln mit Zeitanteil, Nachbarstufe, begrenzter Bildcache), Palette aus at3-64.js.
(function(){
'use strict';
var V='0c014b94', BASIS=(document.currentScript&&document.currentScript.src||'').replace(/[^/]*$/,'');
var ST=64, SX=9600, SY=4800, WX=ST*SX, WY=ST*SY, POL=4*ST, HALB=3, TEIL=8, STUFEN=4, MAXL=12, ANFRAGEN=4, SPEICHER=48*1048576, MAXB=1300, MAXH=900, RUHE_MS=220, FEHLT_MS=800;
var ERSATZ='#3e3934', NACHT='#0e0c0b';
var GW_ZELLEN=600, RO=112, RS=16, RG0=GW_ZELLEN*8/(2*Math.PI), ZP=2*Math.PI;   // G4d: Globus-Halbmesser der ersten Stufe (eine Erdzelle = 8 Bildpunkte am Äquator)   // G4b: größte Überstände der Naturbilder über ihr Feld (Stufe 1×, wie RAND_OBEN/RAND_SEITE in natur.js), damit Baumkronen am Bildrand nicht fehlen

function starten(o){
 var cv=o.cv, g=cv.getContext('2d'), S=o.S, kern=o.kern, bk=null, tot=false;
 function umX(x){x%=WX;return x<0?x+WX:x}
 function halteY(y){return Math.max(POL,Math.min(WY-POL-.01,y))}
 function ab(a,b){var d=Math.abs(a-b);return d>SX-d?SX-d:d}                     // Abstand zweier Stückspalten über die Naht
 function modu(a,m){a%=m;return a<0?a+m:a}
 var glob=null, gimg=null, gimgKey='', globOffen=false, wahl=null, marke=null;   // G4d: Globus {g Stufe, lon, lat} (null = Karte), letztes Bild
 var cam={x:WX/2,y:WY/2,z:0,lod:0}, hatKam=false, zFest=false, gen=-1, seed=0, blickK=-1;
 var fragen={}, frageNr=0, NV=0, bekannt=new Map(), bilder=new Map(), offen=new Map(), fehlt=new Map(), bytes=0, bildNr=0, geplant=false, zoomZeit=0, feldNr=0, feldOk={};
 var M={globus:-1,globusUs:0,globusN:0,bilder:0,bytes:0,maxBytes:0,gerechnet:0,rechenUs:0,maxRechenUs:0,zeichnen:0,zeichenMs:0,maxZeichenMs:0,sichtbar:0,ersatz:0,fertig:false,stuecke:0,anfragen:0,verdraengt:0,bmp:null,natur:0,rechenL:[],rechenN:0,naturArten:0,naturErsatz:0};
 if(o.kam&&o.kam.length===3&&o.kam[0]>=0&&o.kam[0]<WX&&o.kam[1]>=0&&o.kam[1]<WY){cam.x=o.kam[0];cam.y=halteY(o.kam[1]);cam.lod=Math.max(0,Math.min(MAXL,o.kam[2]|0));hatKam=true}

 function ende(g2){if(tot)return;tot=true;try{bk&&bk.terminate()}catch(e){}bk=null;if(o.beiAusfall)o.beiAusfall(g2)}
 try{bk=new Worker(BASIS+'bildkern.js?v='+V)}catch(e){setTimeout(function(){ende('no picture core')},0)}
 if(bk){bk.onerror=function(e){if(e&&e.preventDefault)e.preventDefault();ende('picture core failed')};bk.onmessage=vomBildkern;
  var F=S.PALETTEN[S.PALETTE].farben,pal=new Uint32Array(64),du=new Uint8Array(64),he=new Uint8Array(64);
  for(var i=0;i<64;i++){var c=S.farbe(F[i]);pal[i]=(255<<24|c[2]<<16|c[1]<<8|c[0])>>>0;du[i]=S.dunkler(i);he[i]=i}
  for(var r=0;r<S.REIHEN.length;r++)for(var k=0;k<S.REIHEN[r].n-1;k++)he[S.START[r]+k]=S.START[r]+k+1;
  bk.postMessage({art:'init',pal:pal,du:du,he:he})}

 // ── Vom Weltkern (über kernstart.js beiWs): Erde und Kartenstücke weiterreichen ──
 function beiWs(d){if(tot||!bk)return;
  if(d.art==='wsErde'){gen=d.gen;seed=d.seed;bekannt.clear();bilderWeg();fehlt.clear();offen.clear();blickK=-1;M.stuecke=0;
   bk.postMessage({art:'welt',gen:gen,seed:seed,buf:d.buf},[d.buf.buffer]);if(hatKam)blick();else if(o.waehlen){if(o.beiErde)o.beiErde()}else bk.postMessage({art:'start'});plan()}
  else if(d.art==='wsStueck')kern.wsZurueck(d.buf)}
 function bilderWeg(){bilder.forEach(function(b){if(b.bmp&&b.bmp.close)b.bmp.close()});bilder.clear();bytes=0}

 function vomBildkern(e){var d=e.data;
  if(d.art==='arten'){NARTEN=d.liste;naturSenden();return}
  if(d.art==='antwort'){var a=fragen[d.id];delete fragen[d.id];if(a)a(d);return}
  if(d.art==='feld'){var f=feldOk[d.id];delete feldOk[d.id];if(f)f(d.feld);return}
  if(d.gen!==gen){if(d.bmp&&d.bmp.close)d.bmp.close();return}
  if(d.art==='kunde'){var mn=32767,mx=0;for(var i=0;i<128;i+=2){if(d.mm[i]<mn)mn=d.mm[i];if(d.mm[i+1]>mx)mx=d.mm[i+1]}
   if(ab(d.cx,cam.x>>6)>HALB||Math.abs(d.cy-(cam.y>>6))>HALB)return;
   bekannt.set(d.cx*8192+d.cy,{cx:d.cx,cy:d.cy,mm:d.mm,hg:d.hg,mn:mn,mx:mx});M.stuecke=bekannt.size;M.stueckUs=d.stUs;fehlt.clear();plan()}
  else if(d.art==='start'){if(d.platz&&!hatKam){cam.x=umX(d.platz.x+.5);cam.y=halteY(d.platz.y+.5);hatKam=true;M.startOrt=d.platz.ort;blick();plan()}}
  else if(d.art==='bild'){offen.delete(d.key);if(d.nv!==NV){if(d.bmp&&d.bmp.close)d.bmp.close();plan();return}
   if(d.fehlt){fehlt.set(d.key,performance.now());plan();setTimeout(plan,FEHLT_MS+50);return}   // G4d: „fehlt“ verfällt nach FEHLT_MS (Bildkern hatte das Stück gerade verworfen; sonst hinge das Ersatzbild)
   var b={bmp:d.bmp||null,w:d.w,h:d.h,ox:d.ox,oy:d.oy,lod:d.lod,x0:d.x0,y0:d.y0,nr:bildNr,bytes:d.w*d.h*4};
   if(!b.bmp){var c=document.createElement('canvas');c.width=d.w;c.height=d.h;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(d.buf.buffer),d.w,d.h),0,0);b.bmp=c}
   M.bmp=!!d.bmp;M.natur+=d.natur||0;M.rechenL[M.rechenN++%200]=d.us;var alt=bilder.get(d.key);if(alt){bytes-=alt.bytes;if(alt.bmp.close)alt.bmp.close()}
   bilder.set(d.key,b);bytes+=b.bytes;M.gerechnet++;M.rechenUs+=d.us;if(d.us>M.maxRechenUs)M.maxRechenUs=d.us;verdraengen();plan()}}
 function verdraengen(){if(bytes<=SPEICHER)return;var L=[];bilder.forEach(function(b,k){if(b.nr<bildNr-1)L.push([b.nr,k])});L.sort(function(a,b){return a[0]-b[0]});
  for(var i=0;i<L.length&&bytes>SPEICHER*.8;i++){var b=bilder.get(L[i][1]);bytes-=b.bytes;if(b.bmp.close)b.bmp.close();bilder.delete(L[i][1]);M.verdraengt++}}

 // ── Blick: mittleres Kartenstück an den Weltkern, Stücke außerhalb des Fensters vergessen ──
 function blick(){if(glob||cam.lod>=STUFEN)return;var kx=cam.x>>6,ky=cam.y>>6,k=kx*8192+ky;if(k===blickK||gen<0)return;blickK=k;kern.befehl('blick',k);if(bk)bk.postMessage({art:'blick',kx:kx,ky:ky});
  bekannt.forEach(function(p,q){if(ab(p.cx,kx)>HALB||Math.abs(p.cy-ky)>HALB)bekannt.delete(q)});M.stuecke=bekannt.size;fehlt.clear()}
 function hoeheUnter(){var p=bekannt.get((cam.x>>6)*8192+(cam.y>>6));if(!p)return null;var u=(cam.x%ST)/8,v=(cam.y%ST)/8,i=Math.min(7,u|0),j=Math.min(7,v|0),a=u-i,b=v-j,h=p.hg;
  return(h[j*9+i]*(1-a)+h[j*9+i+1]*a)*(1-b)+(h[j*9+9+i]*(1-a)+h[j*9+10+i]*a)*b}

 // ── Was ist im Bild? Bodenbilder der Stufe lod, deren Rahmen (mit kleinster/größter Stufe) den Ausschnitt schneidet ──
 function sicht(lod,CX,CY,hb,hh,aus){var n=TEIL<<lod,q=1<<lod;aus.length=0;
  var kx=cam.x>>6;
  bekannt.forEach(function(p){var cu=p.cx+Math.round((kx-p.cx)/SX)*SX,X=(cu-p.cy)*ST*32,Y=(cu+p.cy)*ST*16;            // cu: Stückspalte in der Lage der Kamera (über die Naht)
   if(X+ST*32+RS<CX-hb||X-ST*32-RS>CX+hb||Y+ST*32-p.mn*8<CY-hh||Y-p.mx*8-RO>CY+hh)return;
   for(var by=0;by<8;by+=q)for(var bx=0;bx<8;bx+=q){var mn=32767,mx=0,m=p.mm;
    for(var j=by;j<by+q;j++)for(var i=bx;i<bx+q;i++){var e=(j*8+i)*2;if(m[e]<mn)mn=m[e];if(m[e+1]>mx)mx=m[e+1]}
    var x0=p.cx*ST+bx*8,xu=cu*ST+bx*8,y0=p.cy*ST+by*8,x=(xu-y0)*32,y=(xu+y0)*16;
    if(x+n*32+RS<CX-hb||x-n*32-RS>CX+hb||y+n*32-mn*8<CY-hh||y-mx*8-RO>CY+hh)continue;
    var rr=bx+q>=8,ru=by+q>=8,nx=modu(p.cx+1,SX),rand=(rr&&!bekannt.has(nx*8192+p.cy))||(ru&&!bekannt.has(p.cx*8192+p.cy+1))||(rr&&ru&&!bekannt.has(nx*8192+p.cy+1));   // G4d: braucht ein Nachbarstück jenseits des Fensters
    aus.push({x0:x0,xu:xu,y0:y0,X:x,Y:y,key:lod+':'+x0+':'+y0,mn:mn,rand:rand,ab:Math.abs(x-CX)+2*Math.abs(y+n*16-((mn+mx)*4)-CY)})}});return aus}
 // G4d: Fernbilder der Stufe lod (≥ STUFEN), die den Ausschnitt schneiden: Raster aus (8 << lod)² Feldern in der Lage der Kamera, Schlüssel mit der Weltspalte
 function sichtFern(lod,CX,CY,hb,hh,aus){var n=TEIL<<lod;aus.length=0;
  var uA=Math.floor(((CX-hb)/64+(CY-hh)/32)/n)-1,uE=Math.floor(((CX+hb)/64+(CY+hh)/32)/n)+1,vA=Math.floor(((CY-hh)/32-(CX+hb)/64)/n)-1,vE=Math.floor(((CY+hh)/32-(CX-hb)/64)/n)+1;
  for(var tv=vA;tv<=vE;tv++){var y0=tv*n;if(y0<0||y0>=WY)continue;
   for(var tu=uA;tu<=uE;tu++){var xu=tu*n,X=(xu-y0)*32,Y=(xu+y0)*16;if(X+n*32<CX-hb||X-n*32>CX+hb||Y+n*32<CY-hh||Y>CY+hh)continue;var x0=umX(xu);
    aus.push({x0:x0,xu:xu,y0:y0,X:X,Y:Y,key:lod+':'+x0+':'+y0,mn:0,ab:Math.abs(X-CX)+2*Math.abs(Y+n*16-CY)})}}return aus}
 function sichtX(lod,CX,CY,hb,hh,aus){return lod>=STUFEN?sichtFern(lod,CX,CY,hb,hh,aus):sicht(lod,CX,CY,hb,hh,aus)}
 function anfragen(L,lod,max){L.sort(function(a,b){return a.ab-b.ab});for(var i=0;i<L.length&&offen.size<max;i++){var c=L[i];if(c.rand||bilder.has(c.key)||offen.has(c.key)||(fehlt.has(c.key)&&performance.now()-fehlt.get(c.key)<FEHLT_MS))continue;
   offen.set(c.key,1);M.anfragen++;bk.postMessage({art:'bild',gen:gen,nv:NV,key:c.key,x0:c.x0,y0:c.y0,lod:lod})}}

 var LISTE=[],NEBEN=[],GRUND=[],gemalt=new Set();
 function mal(b,xu,CX,CY,Z,W,H){var s=b.lod===cam.lod?1:Math.pow(2,b.lod-cam.lod),x=((xu-b.y0)*32-CX)/Z+W/2-b.ox*s,y=((xu+b.y0)*16-CY)/Z+H/2-b.oy*s;   // xu: linke Ecke des Bildes in der Lage der Kamera
  g.drawImage(b.bmp,Math.round(x),Math.round(y),b.w*s,b.h*s);b.nr=bildNr}
 function zeichnen(){geplant=false;if(tot||cv.hidden)return;     // FP1: während First Person ist die Karte versteckt und zeichnet nichts
var t0=performance.now();
  var cw=cv.clientWidth||320,ch=cv.clientHeight||240,f=Math.max(1,Math.ceil(Math.max(cw/MAXB,ch/MAXH))),W=Math.round(cw/f),H=Math.round(ch/f);
  if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}
  g.imageSmoothingEnabled=false;g.fillStyle=NACHT;g.fillRect(0,0,W,H);bildNr++;
  if(glob){globusZeichnen(W,H,t0);return}
  var ziel=cam.lod>=STUFEN?0:hoeheUnter(),weiter=false;if(ziel!=null){if(!zFest){cam.z=ziel;zFest=true}else{var dz=ziel-cam.z;if(Math.abs(dz)<.05)cam.z=ziel;else{cam.z+=dz*.25;weiter=true}}}
  var lod=cam.lod,Z=1<<lod,CX=(cam.x-cam.y)*32,CY=(cam.x+cam.y)*16-cam.z*8,hb=W/2*Z,hh=H/2*Z,n=TEIL<<lod,i,c,b,ersatz=0;
  // G4d: in den Kartenstufen das Fernbild ⅟16 als Untergrund, solange Kartenstücke oder Bilder fehlen (nach einem Sprung vom Globus, nach dem Hereinzoomen)
  var grund=false;if(lod<STUFEN&&(bekannt.size<49||M.ersatz)){sichtFern(STUFEN,CX,CY,hb,hh,GRUND);for(i=0;i<GRUND.length;i++){c=GRUND[i];b=bilder.get(c.key);if(b){mal(b,c.xu,CX,CY,Z,W,H);grund=true}}}
  sichtX(lod,CX,CY,hb,hh,LISTE).sort(function(a,b2){return(a.x0+a.y0)-(b2.x0+b2.y0)||a.x0-b2.x0});gemalt.clear();
  var randN=0;for(i=0;i<LISTE.length;i++){c=LISTE[i];b=bilder.get(c.key);if(b){mal(b,c.xu,CX,CY,Z,W,H);continue}if(c.rand)randN++;else ersatz++;   // Randbild (Nachbarstück jenseits des Fensters): gröbere Stufe zeigen, nicht anfragen, nicht als fehlend zählen
   // Ersatzbild: gröbere Stufe vergrößert, sonst feinere verkleinert, sonst graue Raute
   var da=false,L,m,k;
   for(L=lod+1;L<=MAXL&&!da;L++){m=TEIL<<L;var xs=c.xu-modu(c.xu,m);k=L+':'+umX(xs)+':'+(c.y0-c.y0%m);b=bilder.get(k);if(b){da=true;if(!gemalt.has(k)){gemalt.add(k);mal(b,xs,CX,CY,Z,W,H)}}}
   if(!da&&lod>0){m=n>>1;for(k=0;k<4;k++){b=bilder.get((lod-1)+':'+umX(c.xu+(k&1)*m)+':'+(c.y0+(k>>1)*m));if(b){mal(b,c.xu+(k&1)*m,CX,CY,Z,W,H);da=true}}}
   if(!da&&!grund){var x=(c.X-CX)/Z+W/2,y=(c.Y-c.mn*8-CY)/Z+H/2,r=n*32/Z;g.fillStyle=ERSATZ;g.beginPath();g.moveTo(x,y);g.lineTo(x+r,y+r/2);g.lineTo(x,y+r);g.lineTo(x-r,y+r/2);g.closePath();g.fill()}}
  // Anfragen: nur wenn die Hand ruht. Erst Sichtbares, danach die Nachbarstufen (gröber, dann feiner um die Mitte) auf Vorrat.
  var ruht=performance.now()-zoomZeit>RUHE_MS&&zeiger.size<2;
  if(bk&&gen>=0&&ruht){if(ersatz)anfragen(LISTE,lod,ANFRAGEN);
   else if(!offen.size&&bytes<SPEICHER*.6){if(lod<MAXL)anfragen(sichtX(lod+1,CX,CY,hb,hh,NEBEN),lod+1,2);if(lod>0&&!offen.size)anfragen(sichtX(lod-1,CX,CY,hb/2,hh/2,NEBEN),lod-1,2)}}
  else if(ersatz&&!ruht){setTimeout(plan,RUHE_MS)}
  if(marke){var mx=marke.x+Math.round((cam.x-marke.x)/WX)*WX,mh=lod<STUFEN?hoeheBei(marke.x,marke.y):0;kreuz(((mx-marke.y)*32-CX)/Z+W/2,((mx+marke.y)*16-(mh==null?cam.z:mh)*8-CY)/Z+H/2)}
  M.sichtbar=LISTE.length;M.ersatz=ersatz;M.rand=randN;M.bilder=bilder.size;M.bytes=bytes;if(bytes>M.maxBytes)M.maxBytes=bytes;M.fertig=gen>=0&&hatKam&&LISTE.length>0&&!ersatz&&!weiter;
  var ms=performance.now()-t0;M.zeichnen++;M.zeichenMs+=ms;if(ms>M.maxZeichenMs)M.maxZeichenMs=ms;
  if(weiter)plan()}
 // ── G4d Globus: Stufen (Halbmesser halbiert bis die Kugel passt), Bild aus dem Bildkern, das letzte Bild bleibt stehen, bis das neue da ist ──
 function globStufen(W,H){var R=RG0,fit=.45*Math.min(W,H),L=[];while(R>fit*1.05){L.push(R);R/=2}L.push(fit);return L}
 function globR(){var L=globStufen(cv.width,cv.height);return L[Math.min(glob.g,L.length-1)]}
 function globusZeichnen(W,H,t0){var L=globStufen(W,H);if(glob.g>=L.length)glob.g=L.length-1;var R=L[glob.g],s=Math.max(2,Math.ceil(Math.sqrt(W*H/200000)));
  if(gimg){var k=R/gimg.R,w=gimg.w*gimg.s*k,h=gimg.h*gimg.s*k;g.drawImage(gimg.c,Math.round(W/2-w/2),Math.round(H/2-h/2),Math.round(w),Math.round(h))}
  var key=W+','+H+','+R.toFixed(2)+','+glob.lon.toFixed(5)+','+glob.lat.toFixed(5);
  if(key!==gimgKey&&!globOffen&&bk&&gen>=0){globOffen=true;frage('globus',{W:W,H:H,R:R,lon:glob.lon,lat:glob.lat,s:s}).then(function(a){globOffen=false;
    if(!a.fehlt&&glob){var c=document.createElement('canvas');c.width=a.w;c.height=a.h;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(a.buf.buffer),a.w,a.h),0,0);
     gimg={c:c,w:a.w,h:a.h,s:s,R:R};gimgKey=key;M.globusUs=a.us;M.globusN++}plan()})}
  if(marke){var lo=marke.x/WX*ZP-glob.lon,la=(.5-marke.y/WY)*Math.PI,cl=Math.cos(glob.lat),sl=Math.sin(glob.lat),cla=Math.cos(la),sla=Math.sin(la);
   if(sl*sla+cl*cla*Math.cos(lo)>0)kreuz(W/2+R*cla*Math.sin(lo),H/2-R*(cl*sla-sl*cla*Math.cos(lo)))}
  if(wahl&&wahl.bereit&&key===gimgKey){var bb=wahl.bereit;wahl.bereit=null;bb()}
  M.globus=glob.g;M.sichtbar=1;M.ersatz=key===gimgKey?0:1;M.fertig=gen>=0&&key===gimgKey;
  var ms=performance.now()-t0;M.zeichnen++;M.zeichenMs+=ms;if(ms>M.maxZeichenMs)M.maxZeichenMs=ms}
 function kreuz(x,y){x=Math.round(x);y=Math.round(y);g.fillStyle='#2a0604';g.fillRect(x-6,y-2,13,5);g.fillRect(x-2,y-6,5,13);g.fillStyle='#f4c8a0';g.fillRect(x-5,y-1,11,3);g.fillRect(x-1,y-5,3,11)}
 function hoeheBei(x,y){var p=bekannt.get((x>>6)*8192+(y>>6));if(!p)return null;var i=Math.min(8,Math.round((x&63)/8)),j=Math.min(8,Math.round((y&63)/8));return p.hg[j*9+i]}
 // Bildschirmpunkt → Feld der Welt ohne Bildkern (Globus: Kugel umkehren; Karte: flach auf Kamerahöhe). null außerhalb der Kugel.
 function weltBei(cx,cy){var r=cv.getBoundingClientRect(),f=cv.width/(r.width||1),sx=(cx-r.left)*f-cv.width/2,sy=(cy-r.top)*f-cv.height/2;
  if(glob){var R=globR(),x=sx/R,y=-sy/R,q=x*x+y*y;if(q>=1)return null;var z=Math.sqrt(1-q),cl=Math.cos(glob.lat),sl=Math.sin(glob.lat),la=Math.asin(y*cl+z*sl),lo=glob.lon+Math.atan2(x,z*cl-y*sl);
   return{x:Math.floor(modu(lo/ZP,1)*WX),y:Math.max(0,Math.min(WY-1,Math.floor((.5-la/Math.PI)*WY)))}}
  var Z=1<<cam.lod,PX=(cam.x-cam.y)*32+sx*Z,PY=(cam.x+cam.y)*16+sy*Z,u=(PX/32+PY/16)/2,v=(PY/16-PX/32)/2;
  return{x:Math.floor(umX(u)),y:Math.max(0,Math.min(WY-1,Math.floor(v)))}}
 function zText(l){return l===0?'1×':l<STUFEN?['','½','¼','⅛'][l]:'1/'+(1<<l)}
 function melden(){M.globus=glob?glob.g:-1;if(o.beiZoom)o.beiZoom(glob?-1:cam.lod,glob?'globe':zText(cam.lod))}
 function zurKarte(x,y,lod){glob=null;gimg=null;gimgKey='';cam.x=umX(x);cam.y=halteY(y);cam.lod=lod;zFest=false;blickK=-1;blick();zoomZeit=performance.now();plan();setTimeout(plan,RUHE_MS+20);melden()}
 function globNach(){return{x:modu(glob.lon/ZP,1)*WX,y:(.5-glob.lat/Math.PI)*WY}}
 function plan(){if(!geplant&&!tot){geplant=true;requestAnimationFrame(zeichnen)}}

 // ── Eingabe: Wischen, Zwei-Finger-Zoom, Mausrad, Antippen ──
 var zeiger=new Map(), zieht=false, kneifAb=0;
 function schieben(dx,dy){if(glob){var fg=cv.width/(cv.clientWidth||1),R=globR();glob.lon=modu(glob.lon-dx*fg/R,ZP);glob.lat=Math.max(-1.35,Math.min(1.35,glob.lat+dy*fg/R));plan();return}
  var f=cv.width/(cv.clientWidth||1)*(1<<cam.lod),X=-dx*f/32,Y=-dy*f/16;cam.x=umX(cam.x+(X+Y)/2);cam.y=halteY(cam.y+(Y-X)/2);blick();plan()}
 function zoom(d){
  if(glob){var n=globStufen(cv.width,cv.height).length;if(glob.g>=n)glob.g=n-1;var g2=glob.g+d;if(g2<0){var p=globNach();zurKarte(p.x,p.y,MAXL);return}if(g2>=n)return;glob.g=g2;plan();melden();return}
  var l=cam.lod+d;if(l>MAXL){if(!hatKam||gen<0)return;glob={g:0,lon:cam.x/WX*ZP,lat:(.5-cam.y/WY)*Math.PI};plan();melden();return}
  l=Math.max(0,l);if(l===cam.lod)return;var war=cam.lod;cam.lod=l;zoomZeit=performance.now();if(war>=STUFEN&&l<STUFEN){blickK=-1;zFest=false;blick()}plan();setTimeout(plan,RUHE_MS+20);melden()}
 function abstand(){var p=Array.from(zeiger.values());return Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}
 cv.addEventListener('pointerdown',function(e){zeiger.set(e.pointerId,{x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY});try{cv.setPointerCapture(e.pointerId)}catch(x){}
  if(zeiger.size===1)zieht=false;else if(zeiger.size===2){kneifAb=abstand();zieht=true}});
 cv.addEventListener('pointermove',function(e){var p=zeiger.get(e.pointerId);if(!p)return;var dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(zeiger.size===1){if(!zieht&&Math.abs(p.x-p.x0)+Math.abs(p.y-p.y0)<8){p.x-=dx;p.y-=dy;return}zieht=true;schieben(dx,dy)}
  else if(zeiger.size===2&&kneifAb>0){var a=abstand();if(a>kneifAb*1.45){zoom(-1);kneifAb=a}else if(a<kneifAb/1.45){zoom(1);kneifAb=a}zoomZeit=performance.now()}});
 function los(e){var p=zeiger.get(e.pointerId);if(!p)return;zeiger.delete(e.pointerId);if(e.type==='pointerup'&&!zieht&&!zeiger.size)tipp(e.clientX,e.clientY);if(!zeiger.size)plan()}
 cv.addEventListener('pointerup',los);cv.addEventListener('pointercancel',los);
 var radZeit=0;cv.addEventListener('wheel',function(e){e.preventDefault();var t=performance.now();if(t-radZeit<160)return;radZeit=t;zoom(e.deltaY>0?1:-1)},{passive:false});
 function feldBei(cx,cy){return new Promise(function(ok){if(!bk)return ok(null);var r=cv.getBoundingClientRect(),Z=1<<cam.lod,f=cv.width/(r.width||1),id=++feldNr;feldOk[id]=ok;
  bk.postMessage({art:'feld',id:id,px:(cam.x-cam.y)*32+((cx-r.left)*f-cv.width/2)*Z,py:(cam.x+cam.y)*16-cam.z*8+((cy-r.top)*f-cv.height/2)*Z})})}
 function tipp(cx,cy){if(wahl){if(cam.lod<STUFEN&&!glob)feldBei(cx,cy).then(function(fd){var w=fd&&fd.x!=null?fd:weltBei(cx,cy);if(w&&wahl)wahl.beiTipp(w.x,w.y)});else{var w=weltBei(cx,cy);if(w)wahl.beiTipp(w.x,w.y)}return}
  if(glob){var r=cv.getBoundingClientRect(),f=cv.width/(r.width||1),R=globR(),x=((cx-r.left)*f-cv.width/2)/R,y=-((cy-r.top)*f-cv.height/2)/R,q=x*x+y*y;if(q>=1)return;
   var z=Math.sqrt(1-q),cl=Math.cos(glob.lat),sl=Math.sin(glob.lat),la=Math.asin(y*cl+z*sl),lo=glob.lon+Math.atan2(x,z*cl-y*sl);zurKarte(modu(lo/ZP,1)*WX,(.5-la/Math.PI)*WY,3);return}
  if(cam.lod>=STUFEN){if(o.beiFeld)o.beiFeld(null);return}
  feldBei(cx,cy).then(function(fd){if(o.beiFeld)o.beiFeld(fd)})}
 if(window.ResizeObserver)new ResizeObserver(plan).observe(cv);else addEventListener('resize',plan);
 plan();
 // ── Natur (G4b): Bilder der übernommenen Naturobjekte einmal an den Bildkern; danach alle Bodenbilder neu (mit Natur). Rest = graues Ersatzbild. ──
 var NOBJ=null, NARTEN=null;
 function natur(objekte){NOBJ=objekte||{};naturSenden()}
 function naturSenden(){if(!bk||!NOBJ||!NARTEN)return;var objekte=NOBJ,arten=NARTEN,liste=[],tr=[],ers=0;NOBJ=null;
  arten.forEach(function(id){var ob=objekte&&objekte[id];if(!ob||!ob.bild){liste.push(null);ers++;return}var b=ob.bild,px=new Uint8Array(b.w*b.h).fill(255);
   for(var y=0;y<b.h;y++){var r=b.z[y];for(var x=0;x<b.w;x++){var c=S.ZEICHEN.indexOf(r[x]);if(c>=0)px[y*b.w+x]=c}}
   liste.push({w:b.w,h:b.h,ax:b.ax,ay:b.ay,px:px});tr.push(px.buffer)});
  var grau=S.naechste(132,128,122,S.PALETTE);bk.postMessage({art:'natur',liste:liste,grau:grau,rand:S.dunkler(grau)},tr);
  M.naturArten=arten.length-ers;M.naturErsatz=ers;NV++;bilderWeg();fehlt.clear();M.natur=0;plan()}   // Bilder, die noch ohne Natur unterwegs sind, kommen mit alter NV und fliegen weg
 function frage(f,w){return new Promise(function(ok){if(!bk||gen<0)return ok({fehlt:true});var id=++frageNr,m={art:'wahl',frage:f,id:id,gen:gen};for(var k in w)m[k]=w[k];fragen[id]=ok;bk.postMessage(m)})}
 return{beiWs:beiWs,mess:M,frage:frage,zoom:zoom,plan:plan,feldBei:feldBei,natur:natur,
  kam:function(){return hatKam&&!wahl?[Math.floor(cam.x),Math.floor(cam.y),cam.lod]:null},
  kamera:function(){return{x:cam.x,y:cam.y,z:cam.z,lod:cam.lod,gesetzt:hatKam,globus:glob?{g:glob.g,lon:glob.lon,lat:glob.lat,n:globStufen(cv.width,cv.height).length}:null}},
  geh:function(x,y,lod){glob=null;cam.x=umX(x);cam.y=halteY(y);if(lod!=null)cam.lod=lod;hatKam=true;zFest=false;blickK=-1;blick();plan()},
  schieben:schieben,ende:function(){ende(null)},
  // G4d: Startplatz-Wahl in der Karte
  wahlStart:function(beiTipp,beiBereit){wahl={beiTipp:beiTipp,bereit:beiBereit||null};marke=null;hatKam=true;glob={g:99,lon:Math.PI,lat:.3};plan();melden()},
  wahlEnde:function(){wahl=null;marke=null;plan()},
  marke:function(x,y){marke=x==null?null:{x:x+.5,y:y+.5};plan()},
  zeigeAuf:function(x,y){if(glob){glob.lon=modu(x/WX*ZP,ZP);glob.lat=Math.max(-1.35,Math.min(1.35,(.5-y/WY)*Math.PI))}else{cam.x=umX(x);cam.y=halteY(y);zFest=false;blick()}plan()}}}

window.AT3KARTE={starten:starten,STUFEN:STUFEN,MAXL:MAXL,SPEICHER:SPEICHER,WX:WX,WY:WY,POL:POL};
})();
