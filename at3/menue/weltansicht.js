// WAS DIE DATEI TUT: „Weltansicht“ im AT3-Master-Editor (Menü Welt & Bau, Schritt W1a; wird erst beim Antippen geladen, zusammen mit kernstart.js und at3-64.js).
// Zeigt die Welt aus dem Weltgenerator (weltgen.js): Seed eingeben, Zoom in vier festen Stufen (Erde → Region → 7 × 7 Kartenstücke → ein Stück),
// Einfärbung nach Biom oder Höhe, Flüsse sichtbar, Antippen zeigt Biom und Höhe und verschiebt den Blick. W1a+: Die Erde zeigt je Zelle das vom
// Klima begünstigte Biom; jede Gegend mischt alle Land-Biome, Antippen einer Zelle zeigt die Anteile. Dazu Messung auf diesem Gerät.
// Kerne: Erde und Kartenstücke rechnen in den Helferkernen, Übernahme im Weltkern (kernstart.js, derselbe Anschluss wie im Spiel). Der Hauptkern rechnet
// keine Welt: Er färbt das Erdbild einmal ein (600 × 300 Punkte) und je Bild höchstens ein neu angekommenes Kartenstück (64 × 64 Punkte).
// Zeichenarbeit (Regel 20): Zoomen skaliert nur fertige Bilder; fehlt ein Stück, steht dort der Ausschnitt des Erdbilds als Ersatz; gezeichnet wird nur bei Änderung.
// W1b: Einfärbung „Straßen & Seewege“ (Erde: ein Punkt je Zelle; Region: die echten Straßenläufe als Linien, Orte als Punkte, Seewege und Fähren
// gestrichelt; Kartenstücke: die Wegschicht je Feld), Ortsdichte dünn/mittel/dicht neben dem Seed, Antippen zeigt Ort mit Namen, Straße, Pass, Fähre
// oder Seeweg. Die Linien der Region rechnet der Hauptkern nur beim Neuzeichnen (höchstens 900 Zellen, rund 2 ms), nie je Bild.
// N2a: Einfärbung „Klimazonen“ (14 Zonen aus Wärme, Regen mit dem Wind und Regenschatten) mit Reglern. Der Hauptkern rechnet die Zonen mit den
// Reglerwerten selbst nach, aber nur in Scheiben von höchstens 4 ms je Bild (Regel 13); ohne Änderung zeigt er die Schicht aus dem Weltkern.
// N4b: Einfärbungen „Kulturen“ und „Religionen“ (Völker aus dem Erdteil „Völker“, Grenzen dunkel, Orte eine Stufe dunkler, Kernland hell), Antippen
// zeigt Volk, Kultur, Religion und die Glaubensanteile des Orts, darunter eine Liste mit Orten je Kultur und je Religion. Namen aus daten/kulturen.json
// und daten/religionen.json (erst beim ersten Umschalten geladen). Einfärben einmal je Welt und Umschalten (600 × 300 Punkte), nie je Bild.
// N4c1: Einfärbung „Herrschaften“ (Reiche in ihrer Farbe, Vasallen heller, Reichsgrenzen schwarz, Grenzen der Stufen darunter eine Stufe dunkler, Sitze der Reiche
// hell), Antippen zeigt die Kette „Answers to“ mit Titeln, darunter die Liste der Reiche. Namen aus herrschaften.js, ortsnamen.js und sprache/en.json
// (erst beim ersten Umschalten geladen). Einfärben einmal je Welt und Umschalten, nie je Bild.
// Das Spiel lädt diese Datei und den Generator nicht (G4).
// Wiederverwendet: kernstart.js (G2), Messart, Ampel und Kopierknopf aus der Kernprobe und der Riesenwelt-Probe, Palette aus at3-64.js (M2).
(function(){
'use strict';
var SEED=563520, BIS=300, SOLL='6c836d2f';   // SOLL = Fingerabdruck aus tests/at3-weltgen.cjs; muss auf jedem Gerät gleich herauskommen
function B(cx,cy){return cx*8192+cy}
var SKRIPT=[{tick:0,art:'weltseed',wert:563520},{tick:0,art:'blick',wert:B(2400,2400)},{tick:70,art:'blick',wert:B(2403,2398)},{tick:100,art:'blick',wert:B(0,0)},{tick:115,art:'blick',wert:B(9599,2400)},
 {tick:130,art:'last',wert:300},{tick:150,art:'blick',wert:B(4799,4799)},{tick:170,art:'weltseed',wert:77},{tick:171,art:'weltseed',wert:4242},{tick:172,art:'weltdichte',wert:2},{tick:230,art:'blick',wert:B(9598,256)},
 {tick:260,art:'tempo',wert:3},{tick:270,art:'blick',wert:B(1,257)}];
var GW=600, GH=300, GE=GW, N=GW*GH, ST=64, FELDER=ST*ST, SX=9600, SY=4800, ZP=16, MEER=2048, HALB=3, S=448, MIB=1048576;   // Maße wie in weltgen.js (läuft nur in Hintergrundkernen); GE = Zellen je Zeile
// W1c Runde Welt: Erde 600 × 300 (im quadratischen Bild als Band in der Mitte), Region und Kartenstücke laufen in x über die Naht, in y enden sie am Pol.
function umZ(z){z%=GW;return z<0?z+GW:z}
function umS(c){c%=SX;return c<0?c+SX:c}
function abS(a,b){var d=Math.abs(a-b);return d>SX-d?SX-d:d}
var BIOM=['tiefes Meer','Meer','Strand','Wüste','Steppe','Wald','Sumpf','Tundra','Fels','Schnee','Fluss','See','Eis (Polkappe, gesperrt)'];
var BFARBE=[39,40,46,62,19,15,8,11,23,5,42,41,6,18,61,45,14,16];                               // Farbnummern der AT3-Palette (Mitte); dunkler = −1, heller = +1 in derselben Reihe
var RAMPE=[14,15,16,17,18,60,61,62,24,23,22,3,4,5,6], TIEFE=[38,39,40,41];    // Höhenfarben Land (tief → hoch) und Wasser (tief → flach)
var ZOOM=['Erde','Region','Kartenstücke','Stück'], REGION=30, ZF=1024;
var ORTN=['','Dorf','Stadt','Hafendorf','Hafenstadt'], WEGN=['','Pfad','Straße','Brücke','Furt','Steg','Ortsplatz','Fähre'], DICHTEN=['dünn','mittel','dicht'];
var WFARBE=[0,47,48,31,43,12,36,6], OFARBE=[0,53,37,48,32], F_PFAD=12, F_STRASSE=47, F_SEE=43, F_FAEHRE=48;   // Farbnummern der AT3-Palette für Wegschicht, Orte und Netz
var ZONEN=['Wasser','Eis','Schnee','Tundra','Nadelwald','Laubwald','Grasland','Steppe','Mittelmeer-Buschland','Wüste','Savanne','Regenwald','Sumpf','Mangroven','Gebirge'];   // wie weltgen.js ZONE
var ZFARBE=[40,6,5,11,14,17,19,61,30,63,52,15,8,42,4];                        // Farbnummern der AT3-Palette je Klimazone
var KFARBE=[57,20,6,53,30,62,25,36,19,47,16,9,50,35,31,5,51,60,14,58,45,37,3,55];   // N4b: Farbnummer je Kultur (Nummer 1–24 wie kulturen.json)
var RFARBE=[56,62,37,53,25,11,17,58,3,47,45,6];                                 // N4b: Farbnummer je Religion (Reihenfolge wie religionen.json)
var HD=null, hdLaden=null;                                                     // N4c1: {H: herrschaften.js, ON: ortsnamen.js, TX: Texte der Sprachdatei}
var VD=null, vdLaden=null;                                                     // N4b: {K: Kulturen, R: Religionen, kr: Religion je Kultur (Nummer ab 1)}
var ZREG=[['T_AEQ','Wärme am Äquator (Zehntel Grad)',150,350,5],['T_POL','Kälter zum Pol hin (Zehntel Grad)',300,800,10],['T_HOEHE','Abkühlung mit der Höhe',0,60,1],
 ['REGEN','Regen insgesamt (256 = normal)',64,512,8],['R_LAND','Regen fällt früh (kleiner = reicht weiter ins Land)',6,96,2],['R_BERG','Regenschatten hinter Gebirgen',0,768,16],
 ['TROCKEN','Wüste unter dieser Feuchte',0,200,5],['STEPPE','Steppe unter dieser Feuchte',0,300,5],['WALD','Wald ab dieser Feuchte',50,400,5],['REGENWALD','Regenwald ab dieser Feuchte',100,600,10],
 ['G_FELS','Gebirge ab Höhe',1500,9000,100],['G_SCHNEE','Schnee ab Höhe',2000,9600,100]];
var zK=null, zZ=null, zR=null, zW=null, zJob=null, zBereit=false, zAnteil=null, zGleich=null;   // N2a: Reglerwerte, eigene Zonen, Regen, Westanteil, laufende Scheibenrechnung
var netzCv=null, dichte=1, hilfe=null, WGh=null, ONh=null;
var E={erde:null,stueck:null,bild:null,speicher:null,gleich:null,geraet:null}, el=null, H=null, pal=null, erd=null, erdCv=null, erdGen=0, kacheln=new Map(), warte=[], lager=[];
var zoom=0, farbe=0, kx=SX>>1, ky=SY>>1, neuZeichnen=true, ws=null, laeuft=false, beschaeftigt=false, bilder=null, letztBild=0, cv=null, cx2=null, tmpBild=null, tmp32=null;

function q(s){return el.querySelector(s)}
function kom(v,n){return v==null||isNaN(v)?'-':v.toFixed(n==null?1:n).replace('.',',')}
function tsd(v){return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g,'.')}
function mb(b){return b>=MIB/10?kom(b/MIB,1)+' MB':kom(b/1024,0)+' KB'}
function p(L,x){if(!L.length)return null;var s=L.slice().sort(function(a,b){return a-b});return s[Math.min(s.length-1,Math.floor(x*s.length))]}
function schlaf(ms){return new Promise(function(r){setTimeout(r,ms)})}
function amp(f){return '<i class="amp '+f+'"></i>'}
function kerne(){return navigator.hardwareConcurrency||1}
function palette(){var f=window.AT3_64.PALETTEN.A.farben,t=new Uint32Array(64);for(var i=0;i<64;i++){var h=f[i];t[i]=(255<<24)|(parseInt(h.substr(5,2),16)<<16)|(parseInt(h.substr(3,2),16)<<8)|parseInt(h.substr(1,2),16)}return t}

// ── Einfärben (Hauptkern, kleine feste Arbeit) ──
function farbeVon(bio,h,dh){                                                   // h relativ zum Meeresspiegel in 1/16 Feld, dh = Gefälle für die Schattierung
 if(bio===12)return pal[BFARBE[12]];
 if(farbe===1){if(bio<2||bio===11||h<0){var t=h<-1200?0:h<-500?1:h<-120?2:3;return pal[TIEFE[t]]}if(bio===10)return pal[42];
  var r=h<60?0:h<160?1:h<320?2:h<560?3:h<900?4:h<1400?5:h<2000?6:h<2800?7:h<3800?8:h<4800?9:h<5800?10:h<6800?11:h<7800?12:h<8800?13:14;return pal[RAMPE[r]]}
 var c=BFARBE[bio];if(bio>1&&bio<10||bio>=13)c+=dh>0?1:dh<0?-1:0;return pal[c]}
function erdBild(){if(!erd)return;var g=erdCv.getContext('2d'),im=g.createImageData(GW,GH),d=new Uint32Array(im.data.buffer),Eh=erd.E,bio=erd.bio,flu=erd.flu;
 if((farbe===4||farbe===5)&&erd.vk&&VD){voelkerBild(d);g.putImageData(im,0,0);netzBild();neuZeichnen=true;return}
 if(farbe===6&&erd.hs&&HD){herrschaftBild(d);g.putImageData(im,0,0);netzBild();neuZeichnen=true;return}
 if(farbe===3){var Z=zBereit?zZ:erd.zon;for(var i=0;i<N;i++){var z=Z[i],c=ZFARBE[z],j=i>=GW?i-GW-(i%GW?1:1-GW):i,dh=Eh[i]-Eh[j];if(z>1&&dh>120)c++;else if(z>1&&dh<-120)c--;d[i]=pal[c]}   // N2a: Klimazonen, Hänge schattiert
  g.putImageData(im,0,0);netzBild();neuZeichnen=true;return}
 for(var i=0;i<N;i++){var b=flu[i]>1&&bio[i]!==12?10:bio[i],j=i>=GW?i-GW-(i%GW?1:1-GW):i,dh=Eh[i]-Eh[j];d[i]=farbeVon(b,Eh[i],dh>120?1:dh<-120?-1:0)}
 g.putImageData(im,0,0);netzBild();neuZeichnen=true}
// N4b: Kulturen (farbe 4) oder Religion der Kultur (farbe 5) je Landzelle; Grenze zwischen Völkern dunkel, Orte eine Stufe dunkler, Kernland hell
// N4c1: Reiche je Landzelle (Vasallen eine Stufe heller), Reichsgrenze schwarz, Grenze der untersten Einheiten eine Stufe dunkler, Reichssitze hell
function herrschaftBild(d){var hs=erd.hs,Z=hs.zel,bio=erd.bio,i,u,x;if(!erd.hsR)erd.hsR=HD.H.tafel(hs);var R=erd.hsR;
 function rv(u){return u?R[u-1]:0}
 for(i=0;i<N;i++){u=Z[i];if(!u){var b=erd.flu[i]>1&&bio[i]!==12?10:bio[i];d[i]=farbeVon(b,erd.E[i],0);continue}x=i%GW;var r=rv(u),w=Z[x+1<GW?i+1:i+1-GW],un=i+GW<N?Z[i+GW]:u;
  var c=HD.H.FARBE[hs.tab[((r&16383)-1)*4+3]>>4&15]+(r&16384?1:0);
  if((w&&(rv(w)&16383)!==(r&16383))||(un&&(rv(un)&16383)!==(r&16383)))d[i]=pal[1];else if((w&&w!==u)||(un&&un!==u))d[i]=pal[c-1];else d[i]=pal[c]}
 for(u=0;u<hs.zahl[0];u++)if(!(hs.tab[u*4+2]&3))d[erd.orte[hs.tab[u*4+1]]&0xffffff]=pal[48]}
function voelkerFarbe(v){var c=erd.vk.tab[v-1]>>>24;return farbe===4?KFARBE[c-1]:RFARBE[VD.kr[c-1]-1]}
function voelkerBild(d){var vk=erd.vk,vol=vk.vol,bio=erd.bio,ort=erd.ort,i,v,w,x;
 for(i=0;i<N;i++){v=vol[i];if(!v){var b=erd.flu[i]>1&&bio[i]!==12?10:bio[i];d[i]=farbeVon(b,erd.E[i],0);continue}x=i%GW;
  w=vol[x+1<GW?i+1:i+1-GW];var u=i+GW<N?vol[i+GW]:v;
  d[i]=(w&&w!==v)||(u&&u!==v)?pal[1]:pal[voelkerFarbe(v)-(ort[i]&15?1:0)]}
 for(v=0;v<vk.zahl;v++)d[vk.tab[v]&0xffffff]=pal[48]}
// W1b: Netz der Erde als eigenes durchsichtiges Bild (ein Punkt je Zelle), einmal je Welt; liegt in der Erdansicht über dem Erdbild
function netzBild(){if(!erd||!erd.ort)return;var g=netzCv.getContext('2d'),im=g.createImageData(GW,GH),d=new Uint32Array(im.data.buffer),ort=erd.ort,weg=erd.weg,bio=erd.bio;
 for(var i=0;i<N;i++){var o=ort[i]&15,w=weg[i];
  if(o)d[i]=pal[OFARBE[o]];else if(w&15)d[i]=pal[w&64?F_FAEHRE:(w>>4&3)>1?F_STRASSE:F_PFAD];else if(ort[i]>>4&&bio[i]<2&&((i%GE+((i/GE)|0))&1))d[i]=pal[F_SEE]}
 g.putImageData(im,0,0)}
function kachelBild(k){var Hh=new Uint16Array(k.buf.buffer,0,FELDER),Bb=new Uint8Array(k.buf.buffer,FELDER*2,FELDER),Ww=new Uint8Array(k.buf.buffer,FELDER*3,FELDER),d=tmp32;
 for(var i=0;i<FELDER;i++){if(farbe===2&&Ww[i]){d[i]=pal[WFARBE[Ww[i]]];continue}var x=i&63,y=i>>6,j=(x?i-1:i+1)+(y?-ST:ST),dh=x&&y?Hh[i]-Hh[j]:x||y?0:Hh[j]-Hh[i];if(!x&&y)dh=Hh[i+1-ST]-Hh[i+1];else if(x&&!y)dh=Hh[i+ST]-Hh[i+ST-1];d[i]=farbeVon(Bb[i],Hh[i]-MEER,farbe===2?-1:dh>10?1:dh<-10?-1:0)}   // Netzansicht: Land flach und dunkler, damit die Wege hervortreten
 k.cv.getContext('2d').putImageData(tmpBild,0,0);k.fertig=true;neuZeichnen=true}

function kachelWeg(key){var k=kacheln.get(key);if(!k)return;kacheln.delete(key);if(H)H.wsZurueck(k.buf);if(lager.length<49)lager.push(k.cv)}
function fensterRaeumen(){kacheln.forEach(function(k,key){if(abS(k.cx,kx)>HALB||Math.abs(k.cy-ky)>HALB)kachelWeg(key)});warte=warte.filter(function(key){return kacheln.has(key)})}
function allesWeg(){kacheln.forEach(function(k,key){kachelWeg(key)});warte=[]}

function beiWs(d){
 if(d.art==='ws'){ws=d;live();return}
 if(d.art==='wsErde'){var b=d.buf.buffer;erd={E:new Int16Array(b,0,N),bio:new Uint8Array(b,2*N,N),flu:new Uint8Array(b,3*N,N),dir:new Uint8Array(b,4*N,N),feu:new Uint8Array(b,5*N,N),tmp:new Uint8Array(b,6*N,N),
   ort:new Uint8Array(b,7*N,N),weg:new Uint8Array(b,8*N,N),zon:new Uint8Array(b,9*N,N),kopf:new Uint32Array(b,10*N,4),seed:d.seed};   // N2a: 10 Byte je Zelle
  var nO=erd.kopf[0],nK=erd.kopf[1],o=10*N+16+nO*4+nK*8;erd.orte=new Uint32Array(b,10*N+16,nO);
  if(b.byteLength>=o+260+N+nO*6)erd.vk={zahl:new Uint32Array(b,o,1)[0],tab:new Uint32Array(b,o+4,64),vol:new Uint8Array(b,o+260,N),rel:new Uint8Array(b,o+260+N,nO*6),ortNr:null};   // N4b: wie weltgen.js vkSicht
  var o2=o+260+N+nO*6;if(erd.vk&&b.byteLength>=o2+4){var nH=new Uint16Array(b,o2,1)[0];if(b.byteLength>=o2+4+nH*8+N*2+nO*2)erd.hs={zahl:new Uint16Array(b,o2,2),tab:new Uint16Array(b,o2+4,nH*4),zel:new Uint16Array(b,o2+4+nH*8,N),ort:new Uint16Array(b,o2+4+nH*8+N*2,nO)}}   // N4c1: wie weltgen.js hsSicht
  erdGen=d.gen;allesWeg();zBereit=false;zJob=null;erdBild();if(farbe===3)zonenRechnen();vListe();return}
 if(d.art==='wsStueck'){if(d.gen!==erdGen||abS(d.cx,kx)>HALB||Math.abs(d.cy-ky)>HALB){if(H)H.wsZurueck(d.buf);return}
  var key=B(d.cx,d.cy);kachelWeg(key);var c=lager.pop();if(!c){c=document.createElement('canvas');c.width=c.height=ST}
  kacheln.set(key,{cx:d.cx,cy:d.cy,buf:d.buf,cv:c,fertig:false});warte.push(key)}}

// ── Zeichnen: nur bei Änderung, je Bild höchstens ein neues Kartenstück einfärben ──
function regionEcke(){var zx=kx>>4,zy=ky>>4,h=REGION>>1;return[zx-h,Math.max(0,Math.min(GH-REGION,zy-h))]}                 // x darf über die Naht reichen
// Ausschnitt 30 × 30 Zellen aus einem Erdbild aufs ganze Bild, über die Naht in zwei Teilen
function regionMalen(g,bildQ,rx,ry){var x0=umZ(rx),w1=Math.min(REGION,GW-x0),f=S/REGION;g.drawImage(bildQ,x0,ry,w1,REGION,0,0,w1*f,S);if(w1<REGION)g.drawImage(bildQ,0,ry,REGION-w1,REGION,w1*f,0,(REGION-w1)*f,S)}
function bild(t){if(!laeuft)return;if(!el.isConnected){ende();return}
 if(bilder&&letztBild)bilder.push(t-letztBild);letztBild=t;
 if(warte.length){var k=kacheln.get(warte.shift());if(k)kachelBild(k)}
 if(zJob)zonenScheibe();
 if(neuZeichnen){neuZeichnen=false;var g=cx2,i,j;g.imageSmoothingEnabled=false;
  if(!erd){g.fillStyle='#5c5650';g.fillRect(0,0,S,S)}
  else if(zoom===0){g.fillStyle='#0e0c0b';g.fillRect(0,0,S,S);g.drawImage(erdCv,0,0,GW,GH,0,S/4,S,S/2);if(farbe===2)g.drawImage(netzCv,0,0,GW,GH,0,S/4,S,S/2);marke(g,(kx>>4)*S/GW-2,S/4+(ky>>4)*S/GW-2,5)}
  else if(zoom===1){var r=regionEcke(),f=S/REGION;regionMalen(g,erdCv,r[0],r[1]);if(farbe===2)netzRegion(g,r[0],r[1],f);marke(g,(kx/ZP-umZ(r[0])+GW)%GW*f-f*7/32,(ky/ZP-r[1])*f-f*7/32,f*7/16)}
  else{var n=zoom===2?7:1,gr=S/n,a=zoom===2?HALB:0;
   for(j=-a;j<=a;j++)for(i=-a;i<=a;i++){var cxx=umS(kx+i),cyy=ky+j,x=(i+a)*gr,y=(j+a)*gr,ka=kacheln.get(B(cxx,cyy));
    if(cyy<0||cyy>=SY){g.fillStyle='#0e0c0b';g.fillRect(x,y,gr,gr)}
    else if(ka&&ka.fertig)g.drawImage(ka.cv,0,0,ST,ST,x,y,gr,gr);
    else g.drawImage(erdCv,cxx/ZP,cyy/ZP,1/ZP,1/ZP,x,y,gr,gr)}                                        // Ersatzbild: Ausschnitt der Erde, bis das Stück da ist
   if(zoom===2)marke(g,a*gr,a*gr,gr)}}
 requestAnimationFrame(bild)}
// W1b: Netz der Region als Linien (echter Lauf jeder Straße aus dem Generator, 13 Punkte je Ausgang). Nur beim Neuzeichnen; solange der Generator
// auf dem Hauptkern noch lädt, steht dort das grobe Netzbild als Ersatz.
function helfer(){return hilfe||(hilfe=window.AT3ED.lade('welt','weltgen.js').then(function(){return window.AT3ED.lade('welt','ortsnamen.js')}).then(function(){WGh=window.AT3WG;ONh=window.AT3ORTSNAMEN;neuZeichnen=true}))}
function netzRegion(g,rx,ry,f){if(!erd.ort)return;if(!WGh){regionMalen(g,netzCv,rx,ry);helfer().catch(function(){});return}
 var fx=f/ZF,x,y,i,k,L,l,o,r,F=window.AT3_64.PALETTEN.A.farben;g.lineJoin='round';
 for(y=ry;y<ry+REGION;y++)for(x=rx;x<rx+REGION;x++){i=y*GE+umZ(x);o=erd.ort[i];var v0=(x-umZ(x)-rx)*ZF;                     // Weltfelder der Zelle in die Lage der Region
  if(erd.bio[i]<2){if(o>>4){g.strokeStyle=F[F_SEE];g.lineWidth=1.5;g.setLineDash([3,4]);g.beginPath();var mx=(x-rx+.5)*f,my=(y-ry+.5)*f;
    var aus=[];for(r=0;r<4;r++)if(o>>4>>r&1)aus.push(mx+(r===0?f/2:r===2?-f/2:0),my+(r===1?f/2:r===3?-f/2:0));
    if(aus.length===4){g.moveTo(aus[0],aus[1]);g.quadraticCurveTo(mx,my,aus[2],aus[3])}else for(r=0;r<aus.length;r+=2){g.moveTo(mx,my);g.lineTo(aus[r],aus[r+1])}   // zwei Ausgänge: weicher Bogen statt Ecke
    g.stroke();g.setLineDash([])}continue}
  if(!(erd.weg[i]&15)&&!(o&15))continue;L=WGh.wegLinien(erd.seed,erd,umZ(x),y);
  for(k=0;k<L.length;k++){l=L[k];g.strokeStyle=F[l.see?F_SEE:l.faehre?F_FAEHRE:l.kl>1?F_STRASSE:F_PFAD];g.lineWidth=l.kl>1&&!l.see?2.5:1.5;if(l.see||l.faehre)g.setLineDash([3,4]);
   g.beginPath();g.moveTo((l.x[0]+v0)*fx,(l.y[0]-ry*ZF)*fx);for(var q2=1;q2<13;q2++)g.lineTo((l.x[q2]+v0)*fx,(l.y[q2]-ry*ZF)*fx);g.stroke();g.setLineDash([])}}
 for(y=ry;y<ry+REGION;y++)for(x=rx;x<rx+REGION;x++){o=erd.ort[y*GE+umZ(x)]&15;if(!o)continue;var P=WGh.ortPunkt(erd.seed,erd,umZ(x),y),gr=o===2||o===4?7:5,px=(P[0]+(x-umZ(x)-rx)*ZF)*fx,py=(P[1]-ry*ZF)*fx;
  g.fillStyle='#0e0c0b';g.fillRect(Math.round(px-gr/2)-1,Math.round(py-gr/2)-1,gr+2,gr+2);g.fillStyle=F[OFARBE[o]];g.fillRect(Math.round(px-gr/2),Math.round(py-gr/2),gr,gr)}}
function marke(g,x,y,w){g.strokeStyle='#f4c8a0';g.lineWidth=2;g.strokeRect(Math.round(x)+1,Math.round(y)+1,Math.round(w)-2,Math.round(w)-2);g.strokeStyle='#2a0604';g.lineWidth=1;g.strokeRect(Math.round(x)-.5,Math.round(y)-.5,Math.round(w)+1,Math.round(w)+1)}

// ── Bedienung ──
function blick(nx,ny){nx=umS(nx|0);ny=Math.max(0,Math.min(SY-1,ny|0));if(nx===kx&&ny===ky)return;kx=nx;ky=ny;fensterRaeumen();if(H)H.befehl('blick',B(kx,ky));neuZeichnen=true;ort()}
function ort(){var o=q('#waOrt');if(o)o.textContent='Blick: Kartenstück '+tsd(kx)+' / '+tsd(ky)+' von '+tsd(SX)+' × '+tsd(SY)+' · Zelle '+(kx>>4)+' / '+(ky>>4)}
function hoehe(h){return h<0?'Tiefe '+kom(-h/16,1)+' Felder (rund '+Math.round(-h*3/16)+' m)':'Höhe '+kom(h/16,1)+' Felder (rund '+Math.round(h*3/16)+' m)'}
function zelleText(i){if(farbe===3)return zoneText(i)+'Grobes Biom (Orte und Straßen): '+zelleText0(i);if(farbe===4||farbe===5)return volkText(i)+zelleText0(i);if(farbe===6)return reichText(i)+zelleText0(i);return zelleText0(i)}
// N4b: Volk, Kultur, Religion der Zelle und Glaubensanteile des Orts
function ortNr(i){var vk=erd.vk;if(!vk.ortNr){vk.ortNr=new Map();for(var k=0;k<erd.orte.length;k++)vk.ortNr.set(erd.orte[k]&0xffffff,k)}return vk.ortNr.get(i)}
function volkText(i){var vk=erd&&erd.vk;if(!vk)return 'Diese Welt hat keine Völker (Notausschalter ?n4b=0). · ';if(!VD)return '';var v=vk.vol[i];if(!v)return 'Niemandsland · ';
 var c=vk.tab[v-1]>>>24,K=VD.K[c-1],R=VD.R[VD.kr[c-1]-1],kz=vk.tab[v-1]&0xffffff,n=0,t;for(var j=0;j<v;j++)if(vk.tab[j]>>>24===c)n++;
 t='Volk '+v+' von '+vk.zahl+': '+K.en+(n>1?' (Ableger '+(n-1)+')':'')+', Kernland bei Zelle '+(kz%GW)+' / '+((kz/GW)|0)+' · Religion der Kultur: '+R.en+' · ';
 var k=ortNr(i);if(k!=null){var r=vk.rel,L=[],s=0;for(var q2=0;q2<3;q2++)if(r[k*6+q2*2]){L.push(VD.R[r[k*6+q2*2]-1].en+' '+r[k*6+q2*2+1]+' %');s+=r[k*6+q2*2+1]}
  t+='Glaube im Ort: '+L.join(', ')+(s<100?', verstreute Sekten '+(100-s)+' %':'')+' · '}
 return t}
// N4c1: Kette „Answers to“ der Zelle mit Titeln, Sitz und System
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}
function tx(k,w){var s=HD.TX[k];if(s==null)return k;for(var x in w||{})s=s.split('{'+x+'}').join(w[x]);return s}
function reichText(i){var hs=erd&&erd.hs;if(!hs)return 'Diese Welt hat keine Herrschaften (Notausschalter ?n4c=0). · ';if(!HD)return '';var u=hs.zel[i];if(!u)return tx('reich.niemand')+' · ';
 var L=HD.H.info(hs,erd.vk,erd.orte,u-1,erd.seed>>>0,HD.ON);
 return 'Answers to: '+L.map(function(e){return HD.H.name(e,tx)+' ('+HD.H.titel(e,tx)+(e.vasall?', Vasall':'')+')'}).join(' › ')+' · System '+HD.H.SYS[L[L.length-1].sys]+' · '+personText(i,L)}
// N4c2: Herrscher jeder Stufe der Kette und Vorsteher des Orts (aus Seed und Nummer, herrscher.js)
function personText(i,L){var P=HD.P;if(!P)return '';var sd=erd.seed>>>0,t='Herrscher: '+L.map(function(e){return P.steckbrief(P.herrscher(sd,e),tx)}).join(' › ')+' · ',o=erd.ort[i]&15,k;
 if(o&&(k=ortNr(i))!=null&&erd.hs.ort[k]){var e=HD.H.einheit(erd.hs,erd.vk,erd.hs.ort[k]-1),p=P.vorsteher(sd,k,o,e);if(p)t+='Vorsteher: '+P.steckbrief(p,tx)+' („'+P.arenaSatz(p,tx)+'“) · '}
 return t}
function herrschaftLaden(){return hdLaden||(hdLaden=Promise.all([window.AT3ED.lade('welt','herrschaften.js'),helfer(),window.AT3ED.lade('welt','sprache/en.json'),window.AT3ED.lade('welt','herrscher.js')]).then(function(r){
  HD={H:window.AT3HERRSCHAFT,ON:window.AT3ORTSNAMEN,TX:r[2].texte,P:window.AT3HERRSCHER&&!window.AT3HERRSCHER.AUS?window.AT3HERRSCHER:null};vListe();erdBild()}))}   // N4c2: herrscher.js (Notausschalter ?n4c2=0)
// N4c1: Liste der Reiche (Farbe, Name, System, Orte, Vasallen) und Zahl der Einheiten je Stufe
function rListe(o){var hs=erd&&erd.hs,F=window.AT3_64.PALETTEN.A.farben;
 if(!hs){o.innerHTML='<p class="leise">'+(erd?'Diese Welt hat keine Herrschaften (Notausschalter ?n4c=0).':'Noch keine Welt.')+'</p>';return}if(!HD){o.innerHTML='<p class="leise">Die Herrscher werden gekrönt …</p>';return}
 var nH=hs.zahl[0],st=[0,0,0],oR=new Int32Array(nH),va=new Int32Array(nH),R=erd.hsR||(erd.hsR=HD.H.tafel(hs)),u,k,L=[];
 for(u=0;u<nH;u++){st[hs.tab[u*4+2]&3]++;if(!(hs.tab[u*4+2]&3)&&hs.tab[u*4+3]&256)va[hs.tab[u*4]-1]++}
 for(k=0;k<erd.orte.length;k++){u=hs.ort[k];if(u)oR[(R[u-1]&16383)-1]++}
 for(u=0;u<nH;u++)if(!(hs.tab[u*4+2]&3))L.push(u);L.sort(function(a,b){return oR[b]-oR[a]||a-b});
 var h='<p><b>'+st[0]+' Reiche</b>, darunter '+tsd(st[1])+' Einheiten der zweiten und '+tsd(st[2])+' der dritten Stufe. Schwarze Linien: Reichsgrenzen, dunklere Linien: unterste Einheiten, helle Punkte: Sitze der Reiche, hellere Fläche: Vasallen.</p><p class="leise">';
 var P=HD.P,sd=erd.seed>>>0;   // N4c2: je Reich aufklappbar Herrscher und Vorgeschichte
 h+='</p>'+L.map(function(u){var e=HD.H.info(hs,erd.vk,erd.orte,u,sd,HD.ON),k='<i class="amp" style="background:'+F[HD.H.FARBE[e[0].farbe]+(e[0].vasall?1:0)]+'"></i>'+esc(HD.H.ketteText(e,tx))+' ('+HD.H.SYS[e[0].sys]+', '+tsd(oR[u])+' Orte'+(va[u]?', '+va[u]+' Vasallen':'')+')';
  if(!P)return '<p class="leise">'+k+'</p>';var p=P.herrscher(sd,e[0]);
  return '<details class="leise"><summary>'+k+'</summary><p>'+esc(P.steckbrief(p,tx))+' – „'+esc(P.arenaSatz(p,tx))+'“</p><p>'+esc(P.chronik(sd,e,tx,HD.H.name))+'</p></details>'}).join('');
 o.innerHTML=h+'<p class="leise">Jede Grenze wurde mit Blut gezogen. Die meisten mit fremdem.</p>'}
function voelkerLaden(){return vdLaden||(vdLaden=Promise.all([window.AT3ED.lade('welt','daten/kulturen.json'),window.AT3ED.lade('welt','daten/religionen.json')]).then(function(r){
  var K=r[0].kulturkreise,R=r[1].religionen,ids=R.map(function(x){return x.id});VD={K:K,R:R,kr:K.map(function(k){return ids.indexOf(k.religion)+1})};vListe();erdBild()}))}
// N4b: Liste unter der Karte: Orte je Kultur (mit Zahl der Völker) oder je Hauptreligion (mit Anteil an allen Gläubigen)
function vListe(){var o=q('#waVoelker');if(!o)return;o.hidden=farbe!==4&&farbe!==5&&farbe!==6;if(o.hidden)return;if(farbe===6){rListe(o);return}var vk=erd&&erd.vk,F=window.AT3_64.PALETTEN.A.farben;
 if(!vk){o.innerHTML='<p class="leise">'+(erd?'Diese Welt hat keine Völker (Notausschalter ?n4b=0).':'Noch keine Welt.')+'</p>';return}if(!VD){o.innerHTML='<p class="leise">Die Völker werden gezählt …</p>';return}
 var inst=new Array(25).fill(0),oK=new Array(25).fill(0),oR=new Array(13).fill(0),pR=new Array(13).fill(0),nO=erd.orte.length,k,v;
 for(v=0;v<vk.zahl;v++)inst[vk.tab[v]>>>24]++;
 for(k=0;k<nO;k++){v=vk.vol[erd.orte[k]&0xffffff];if(v)oK[vk.tab[v-1]>>>24]++;oR[vk.rel[k*6]]++;for(var q2=0;q2<3;q2++)pR[vk.rel[k*6+q2*2]]+=vk.rel[k*6+q2*2+1]}
 var h='<p><b>'+vk.zahl+' Völker</b> aus '+inst.filter(function(n,c){return c&&n}).length+' von 24 Kulturen ('+(vk.zahl-inst.filter(function(n,c){return c&&n}).length)+' Ableger). Helle Punkte: Kernländer, dunkle Linien: Grenzen, dunklere Punkte: Orte.</p><p class="leise">';
 if(farbe===4)h+=VD.K.map(function(K,c){return '<i class="amp" style="background:'+F[KFARBE[c]]+'"></i>'+K.en+' '+tsd(oK[c+1])+' Orte'+(inst[c+1]>1?' ('+inst[c+1]+' Völker)':'')}).join(' · ');
 else h+=VD.R.map(function(R,r){return '<i class="amp" style="background:'+F[RFARBE[r]]+'"></i>'+R.en+': Hauptglaube in '+tsd(oR[r+1])+' Orten, '+kom(pR[r+1]/Math.max(1,nO),1)+' % aller Gläubigen'}).join(' · ');
 o.innerHTML=h+'</p><p class="leise">'+(farbe===4?'Jedes Volk hält sein Land für das Zentrum der Welt. Auf einer runden Welt haben alle recht.':'Jeder Ort glaubt, die anderen glauben falsch. Statistisch stimmt das fast immer.')+'</p>'}
function zelleText0(i){var b=erd.flu[i]?BIOM[erd.bio[i]]+' mit Fluss (Breite '+erd.flu[i]+' von 5)':BIOM[erd.bio[i]];return netzText(i)+b+' · '+hoehe(erd.E[i])+' · Wärme '+erd.tmp[i]+' · Feuchte '+erd.feu[i]}
// W1b: Ort (Name, sobald die Namensliste geladen ist), Straße, Pass, Fähre, Seeweg einer Zelle
function netzText(i){if(!erd.ort)return '';var o=erd.ort[i]&15,w=erd.weg[i],t='';
 if(o)t+=(ONh?ONh.name(erd.seed,i,o):'…')+' ('+ORTN[o]+') · ';
 if(w&15)t+=(w&64?'Fähre':((w>>4&3)>1?'Straße':'Pfad')+(erd.bio[i]===8||erd.bio[i]===9?' über einen Pass':''))+' · ';
 if(erd.ort[i]>>4&&erd.bio[i]<2)t+='Seeweg · ';return t}
// ── N2a Klimazonen: Rechnung mit den Reglerwerten in Scheiben (je Bild höchstens rund 4 ms), Anteile, Werte zum Übernehmen ──
function zonenRechnen(){if(!erd)return;var gen=erdGen;helfer().then(function(){if(gen!==erdGen||!erd)return;if(!zK)zK=Object.assign({},WGh.ZK);
  if(!zZ){zZ=new Uint8Array(N);zR=new Uint16Array(N);zW=new Uint8Array(N)}zJob={phase:0,y:0,t:performance.now(),ms:0};zBereit=false;kInfo('Das Wetter wird neu verteilt …')},function(){})}
function zonenScheibe(){var j=zJob,t0=performance.now(),A={E:erd.E,bio:erd.bio,flu:erd.flu};
 while(performance.now()-t0<4&&j.phase<2){var y1=Math.min(GH,j.y+10);if(j.phase===0)WGh.zonenRegen(A,erd.seed>>>0,zK,j.y,y1,zR,zW);else WGh.zonenKlasse(A,erd.seed>>>0,zK,j.y,y1,zR,zW,zZ);j.y=y1;if(j.y>=GH){j.phase++;j.y=0}}
 j.ms+=performance.now()-t0;if(j.phase<2)return;zJob=null;zBereit=true;
 var Z=new Int32Array(ZONEN.length),land=0,gl=true;for(var i=0;i<N;i++){Z[zZ[i]]++;if(zZ[i]!==erd.zon[i])gl=false}for(var k=2;k<Z.length;k++)land+=Z[k];zAnteil={Z:Z,land:land};
 zGleich=gl;erdBild();kInfo('Gerechnet in '+kom(j.ms,0)+' ms Rechenzeit, verteilt auf mehrere Bilder (Wartezeit '+kom((performance.now()-j.t)/1000,1)+' s).'+(gl?' Gleich der Schicht im Weltkern.':' Weicht von der gespeicherten Schicht ab (andere Regler).'));kWerte()}
function kInfo(t){var o=q('#waKInfo');if(o)o.textContent=t}
function zkText(){return 'var ZK={'+ZREG.map(function(r){return r[0]+':'+zK[r[0]]}).join(', ')+'};'}
function kWerte(){var o=q('#waKAnt');if(o&&zAnteil)o.innerHTML='Anteile am Land: '+ZONEN.map(function(n,k){return k<2||!zAnteil.Z[k]?'':'<i class="amp" style="background:'+window.AT3_64.PALETTEN.A.farben[ZFARBE[k]]+'"></i>'+n+' '+kom(zAnteil.Z[k]*100/zAnteil.land,1)+' %'}).filter(Boolean).join(' ');
 var w=q('#waKZk');if(w&&zK)w.textContent=zkText()}
function kRegler(){var o=q('#waKRegler');if(!o||!zK)return;o.innerHTML=ZREG.map(function(r){return '<div class="wZeile"><label for="waK_'+r[0]+'" style="min-width:15em">'+r[1]+'</label><input type="range" id="waK_'+r[0]+'" data-k="'+r[0]+'" min="'+r[2]+'" max="'+r[3]+'" step="'+r[4]+'" value="'+zK[r[0]]+'" style="min-height:42px;flex:1"> <b id="waKw_'+r[0]+'">'+zK[r[0]]+'</b></div>'}).join('');
 [].forEach.call(o.querySelectorAll('input'),function(i){i.oninput=function(){q('#waKw_'+i.dataset.k).textContent=i.value};i.onchange=function(){zK[i.dataset.k]=+i.value;kWerte();zonenRechnen()}})}
function setRegler(werte){if(!WGh)return;zK=Object.assign({},WGh.ZK,werte||{});kRegler();kWerte();zonenRechnen()}
function klimaPanel(){var o=q('#waKlima');if(!o)return;o.hidden=farbe!==3;if(farbe!==3)return;helfer().then(function(){if(!zK){zK=Object.assign({},WGh.ZK)}kRegler();kWerte()},function(){})}
function zoneText(i){if(!erd||!erd.zon)return '';var x=i%GE,y=(i/GE)|0,z=zBereit?zZ[i]:erd.zon[i],t=ZONEN[z];
 if(z>1&&WGh&&zK){t+=' · Wärme '+kom(WGh.waerme(zK,y,erd.E[i]>0?erd.E[i]:0,x,erd.seed>>>0)/10,1)+' °C';if(zBereit)t+=' · Regen '+zR[i]+' ('+Math.round(zW[i]*100/255)+' % mit Westwind)'}return 'Klimazone '+t+' · '}
function tipp(e){if(!erd)return;var r=cv.getBoundingClientRect(),fx=Math.max(0,Math.min(.9999,(e.clientX-r.left)/r.width)),fy=Math.max(0,Math.min(.9999,(e.clientY-r.top)/r.height)),info=q('#waInfo'),zx,zy;
 if(zoom<2){if(zoom===0){if(fy<.25||fy>=.75)return;zx=(fx*GW)|0;zy=((fy-.25)*2*GH)|0}else{var ec=regionEcke();zx=umZ(ec[0]+((fx*REGION)|0));zy=ec[1]+((fy*REGION)|0)}
  info.textContent='Zelle '+zx+' / '+zy+': '+zelleText(zy*GE+zx);anteileZeigen(zx,zy);blick(zx*ZP+8,zy*ZP+8);return}
 var n=zoom===2?7:1,a=zoom===2?HALB:0,px=fx*n,py=fy*n,cxx=umS(kx+(px|0)-a),cyy=ky+(py|0)-a,ka=kacheln.get(B(cxx,cyy)),x=((px%1)*ST)|0,y=((py%1)*ST)|0;
 if(ka){var Hh=new Uint16Array(ka.buf.buffer,0,FELDER),Bb=new Uint8Array(ka.buf.buffer,FELDER*2,FELDER),i=y*ST+x;
  var wf=ka.buf[FELDER*3+i];info.textContent='Feld '+tsd(cxx*ST+x)+' / '+tsd(cyy*ST+y)+': '+(wf?WEGN[wf]+' · ':'')+BIOM[Bb[i]]+' · '+hoehe(Hh[i]-MEER)}
 else info.textContent='Dieses Stück wird noch aus dem Seed gekratzt.';
 if(zoom===2)blick(cxx,cyy)}
// W1a+: Anteile der Biome in der angetippten Zelle (Stichprobe 24 × 24 mit derselben Regel wie die Kartenstücke). Der Generator wird dafür beim
// ersten Antippen einmal auf den Hauptkern geladen; eine Stichprobe kostet rund 1 ms, nur auf Antippen, nie je Bild.
function anteileZeigen(zx,zy){var info=q('#waInfo'),seed=erd?erd.seed:0,i=zy*GE+zx,vorher=info.textContent;if(!erd)return;
 helfer().then(function(){
  if(info.textContent!==vorher)return;if(erd.ort&&erd.ort[i]&15)vorher=info.textContent='Zelle '+zx+' / '+zy+': '+zelleText(i);                       // jetzt mit Namen
  if(erd.bio[i]<2||erd.bio[i]===11||erd.bio[i]===12)return;var A={E:erd.E,bio:erd.bio,tmp:erd.tmp,feu:erd.feu,zon:erd.zon},Z=WGh.anteile(seed,A,zx,zy),n=0,L=[];
  for(var k=0;k<Z.length;k++)n+=Z[k];
  for(k=3;k<Z.length;k++)if(Z[k]&&k!==10&&k!==12)L.push([k,Z[k]]);L.sort(function(a,b){return b[1]-a[1]});
  info.textContent=vorher+' · Anteile: '+L.map(function(e){return BIOM[e[0]]+' '+Math.round(e[1]*100/n)+' %'}).join(', ')},function(){})}
function schritt(dx,dy){var s=zoom===0?ZP*20:zoom===1?ZP*5:zoom===2?3:1;blick(kx+dx*s,ky+dy*s)}
function setZoom(z){zoom=z;[].forEach.call(el.querySelectorAll('[data-zoom]'),function(b){b.classList.toggle('an',+b.dataset.zoom===z)});neuZeichnen=true}
function setFarbe(f){farbe=f;if(f===2)helfer().catch(function(){});klimaPanel();vListe();if((f===4||f===5)&&!VD)voelkerLaden().catch(function(){var o=q('#waVoelker');if(o)o.innerHTML='<p class="witz">Die Völker sind nicht zum Zählen erschienen (Daten fehlen).</p>'});if(f===6&&!HD)herrschaftLaden().catch(function(){var o=q('#waVoelker');if(o)o.innerHTML='<p class="witz">Die Herrscher sind nicht zur Krönung erschienen (Daten fehlen).</p>'});if(f===3&&!zBereit&&!zJob)zonenRechnen();[].forEach.call(el.querySelectorAll('[data-farbe]'),function(b){b.classList.toggle('an',+b.dataset.farbe===f)});erdBild();kacheln.forEach(function(k,key){if(warte.indexOf(key)<0)warte.push(key)})}
function neueWelt(seed,d){seed=Math.max(0,Math.min(4294967295,Math.floor(+seed||0)));q('#waSeed').value=seed;if(d!=null){dichte=d===0||d===2?d:1;q('#waDichte').value=dichte}
 erd=null;ws=null;allesWeg();neuZeichnen=true;
 H.befehl('weltdichte',dichte);H.befehl('weltseed',seed);H.befehl('blick',B(kx,ky));q('#waInfo').textContent='Die Erde wird geknetet. Sieben Tage wären übertrieben.';return seed}
function live(){var o=q('#waLive');if(!o||!ws)return;var eu=ws.erdUs.filter(function(v){return v!=null}),em=eu.length?Math.max.apply(null,eu)/1000:null,es=eu.reduce(function(a,b){return a+b},0)/1000;
 o.textContent=(ws.teil<ws.teile?'Erde: Teil '+ws.teil+' von '+ws.teile+' …':'Erde: '+ws.teile+' Teile, zusammen '+kom(es,1)+' ms, längster '+kom(em,1)+' ms')+
  (erd&&erd.kopf?' · '+tsd(erd.kopf[0])+' Orte, '+tsd(erd.kopf[1])+' Verbindungen ('+DICHTEN[dichte]+')':'')+' · Kartenstück p95 '+kom(ws.gelP95/1000,2)+' ms ('+tsd(ws.gelJobs)+' gerechnet) · '+ws.imSpeicher+' von 49 im Speicher · '+mb(ws.bytes)+' · '+ws.helfer+' Helfer'}

// ── Messung ──
function bisWann(test,ms){var t0=performance.now();return new Promise(function(ok){(function w(){if(test()||performance.now()-t0>ms)ok(test());else setTimeout(w,50)})()})}
function gleichheit(){var L=[0,1,2,4].filter(function(h,i){return i<2||kerne()>h}),out=[],i=0;
 function eins(){if(i>=L.length)return Promise.resolve();var h=L[i++],K=window.AT3KERNE.starten({seed:1,helfer:h});
  return bisWann(function(){return K.zustand.laeuft||K.zustand.fehler},8000).then(function(){return K.lauf(1,SKRIPT,BIS)}).then(function(r){K.ende();out.push({helfer:h,abdruck:r?r.abdruck:null,ms:r?r.ms:null});return eins()})}
 return eins().then(function(){var a=out[0].abdruck;E.gleich={laeufe:out,gleich:out.every(function(r){return r.abdruck&&r.abdruck===a}),soll:a===SOLL}})}
function reise(seed){var ziele=[[2400,2400],[0,0],[4799,4799],[4799,0],[1234,3456],[3000,700],[2403,2400],[2406,2400],[600,4100],[2400,2400]],i=0,maxB=0;
 bilder=[];letztBild=0;setZoom(2);neueWelt(seed);
 return bisWann(function(){return ws&&ws.teil===ws.teile&&erd},20000).then(function(fertig){
  E.erde=ws?{fertig:!!fertig,us:ws.erdUs.slice(),summe:ws.erdSumme}:null;
  function eins(){if(i>=ziele.length)return Promise.resolve();var z=ziele[i++];blick(z[0],z[1]);
   return schlaf(150).then(function(){return bisWann(function(){return ws&&ws.kx===kx&&ws.ky===ky&&ws.imSpeicher>0&&!ws.sucht&&!ws.offen&&!warte.length},8000)}).then(function(){if(ws&&ws.bytes>maxB)maxB=ws.bytes;return eins()})}
  return eins()}).then(function(){var b=bilder;bilder=null;
  E.stueck=ws?{p95:ws.gelP95/1000,mittel:ws.gelMittel/1000,max:ws.gelMax/1000,jobs:ws.gelJobs}:null;E.speicher={bytes:maxB,stuecke:ws?ws.imSpeicher:0};
  E.bild={p95:p(b,.95),p99:p(b,.99),n:b.length}})}
function messe(){E.geraet={kerne:kerne(),helfer:window.AT3KERNE.helferZahl(kerne()),ua:navigator.userAgent};
 return gleichheit().then(function(){return reise(+q('#waSeed').value||SEED)}).then(function(){zeigen();window.AT3_WELTANSICHT_FERTIG=true})}
function urteil(wert,gruen,gelb){return wert==null?'alt':wert<=gruen?'gruen':wert<=gelb?'gelb':'rot'}
function zeigen(){var o=q('#waErg');if(!o)return;var h='<table class="tabelle">',em=E.erde&&E.erde.us.length?Math.max.apply(null,E.erde.us)/1000:null;
 if(E.gleich)h+='<tr><td>'+amp(E.gleich.gleich&&E.gleich.soll?'gruen':'rot')+'Gleiche Welt</td><td>'+E.gleich.laeufe.map(function(r){return r.helfer+' Helfer: '+r.abdruck}).join(' · ')+(E.gleich.soll?' = Sollwert':' ≠ Sollwert '+SOLL)+'</td></tr>';
 if(E.erde)h+='<tr><td>'+amp(urteil(em,16.7,50))+'Erde, längster Teil</td><td>'+kom(em,1)+' ms (Teile: '+E.erde.us.map(function(v){return kom(v/1000,1)}).join(' · ')+') · Ziel höchstens 50 ms</td></tr>';
 if(E.stueck)h+='<tr><td>'+amp(urteil(E.stueck.p95,4,10))+'Kartenstück</td><td>p95 '+kom(E.stueck.p95,2)+' ms · Mittel '+kom(E.stueck.mittel,2)+' ms · längstes '+kom(E.stueck.max,2)+' ms · '+tsd(E.stueck.jobs)+' gerechnet (Mitte, Ecken, Sprünge) · Ziel p95 höchstens 4 ms</td></tr>';
 if(E.speicher)h+='<tr><td>'+amp(urteil(E.speicher.bytes,4*MIB,8*MIB))+'Speicher der Welt</td><td>höchstens '+mb(E.speicher.bytes)+' (Erdraster + 49 Stücke + Puffer), egal wo auf 307.200² Feldern</td></tr>';
 if(E.bild)h+='<tr><td>'+amp(urteil(E.bild.p95,33.4,50))+'Bild beim Reisen</td><td>p95 '+kom(E.bild.p95,1)+' ms · p99 '+kom(E.bild.p99,1)+' ms ('+E.bild.n+' Bilder)</td></tr>';
 o.innerHTML=h+'</table><p class="leise">Gilt für dieses Gerät. Für das Handy zählt nur die Messung auf dem Handy.</p>'}
function text(){var L=['AT3 W1b Weltansicht · '+new Date().toISOString().slice(0,16).replace('T',' '),'Gerät: '+(E.geraet?E.geraet.kerne+' Kerne, '+E.geraet.helfer+' Helfer · '+E.geraet.ua:navigator.userAgent)];
 if(E.gleich)L.push('Gleiche Welt: '+E.gleich.laeufe.map(function(r){return r.helfer+'H '+r.abdruck}).join(', ')+' · Soll '+SOLL+(E.gleich.soll&&E.gleich.gleich?' ok':' FALSCH'));
 if(erd&&erd.kopf)L.push('Netz: '+erd.kopf[0]+' Orte, '+erd.kopf[1]+' Verbindungen, '+erd.kopf[2]+' Landmassen, Dichte '+DICHTEN[dichte]);
 if(E.erde)L.push('Erde Teile ms: '+E.erde.us.map(function(v){return kom(v/1000,1)}).join(' / '));
 if(E.stueck)L.push('Kartenstück ms: p95 '+kom(E.stueck.p95,2)+', Mittel '+kom(E.stueck.mittel,2)+', max '+kom(E.stueck.max,2)+', n '+E.stueck.jobs);
 if(E.speicher)L.push('Speicher Welt: '+mb(E.speicher.bytes));
 if(E.bild)L.push('Bild ms: p95 '+kom(E.bild.p95,1)+', p99 '+kom(E.bild.p99,1)+', n '+E.bild.n);
 return L.join('\n')}
function kopieren(){var t=text(),b=q('#waKopie');function ok(){b.firstChild.textContent='Kopiert. In den Chat einfügen.'}
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,function(){window.prompt('Text kopieren:',t)});else window.prompt('Text kopieren:',t)}

function ende(){laeuft=false;if(H){H.ende();H=null}kacheln=new Map();warte=[];erd=null;ws=null;zJob=null;zBereit=false;zAnteil=null}
function aufbauen(ziel){ende();el=ziel;pal=palette();erdCv=document.createElement('canvas');erdCv.width=GW;erdCv.height=GH;netzCv=document.createElement('canvas');netzCv.width=GW;netzCv.height=GH;dichte=1;
 var tc=document.createElement('canvas');tc.width=tc.height=ST;tmpBild=tc.getContext('2d').createImageData(ST,ST);tmp32=new Uint32Array(tmpBild.data.buffer);
 var k=kerne(),h=window.AT3KERNE.helferZahl(k);
 el.innerHTML='<p>Eine Welt aus einer einzigen Zahl. Wer mit ihr unzufrieden ist, würfelt neu. So einfach hatten es die Götter nie.</p>'+
  '<p class="leise">614.400 × 307.200 Felder (9.600 × 4.800 Kartenstücke). Die Welt ist rund: Ost- und Westkante sind zusammengenäht, oben und unten liegt Eis. Gerechnet wird nur, was zu sehen ist: ein grobes Erdraster (600 × 300 Zellen, mit allen Orten, Straßen und Seewegen) und höchstens 49 Kartenstücke. Dieses Gerät meldet '+k+' Kerne: 1 Hauptkern (Bild), 1 Weltkern, '+h+' Helfer.</p>'+
  '<div class="wZeile"><label for="waSeed">Seed</label><input id="waSeed" type="number" min="0" max="4294967295" value="'+SEED+'" style="font:inherit;font-size:17px;min-height:42px;width:150px"> '+
  '<button class="knopf klein" id="waNeu">Welt erzeugen</button> <button class="knopf klein" id="waWuerfel">Würfeln</button></div>'+
  '<div class="wZeile"><label for="waDichte">Orte</label><select id="waDichte" style="font:inherit;font-size:17px;min-height:42px">'+DICHTEN.map(function(n,i){return '<option value="'+i+'"'+(i===1?' selected':'')+'>'+n+'</option>'}).join('')+'</select> '+
  '<span class="leise">Dichte der Besiedlung. Gehört zur Welt wie der Seed.</span></div>'+
  '<div class="wZeile">'+ZOOM.map(function(n,i){return '<button class="knopf klein'+(i===0?' an':'')+'" data-zoom="'+i+'">'+n+'</button>'}).join('')+'</div>'+
  '<div class="wZeile"><button class="knopf klein an" data-farbe="0">Biome</button><button class="knopf klein" data-farbe="1">Höhe</button><button class="knopf klein" data-farbe="2">Straßen &amp; Seewege</button><button class="knopf klein" data-farbe="3">Klimazonen</button><button class="knopf klein" data-farbe="4">Kulturen</button><button class="knopf klein" data-farbe="5">Religionen</button><button class="knopf klein" data-farbe="6">Herrschaften</button></div><div class="wZeile">'+
  '<button class="knopf klein" data-geh="-1,0" aria-label="nach Westen">◀</button><button class="knopf klein" data-geh="0,-1" aria-label="nach Norden">▲</button>'+
  '<button class="knopf klein" data-geh="0,1" aria-label="nach Süden">▼</button><button class="knopf klein" data-geh="1,0" aria-label="nach Osten">▶</button></div>'+
  '<canvas id="waCv" class="pixel" width="'+S+'" height="'+S+'" style="display:block;width:100%;max-width:'+S+'px;aspect-ratio:1;background:#5c5650;border:3px solid var(--rand);touch-action:manipulation"></canvas>'+
  '<p class="leise" id="waOrt"></p><p id="waInfo">Antippen zeigt, was dort liegt (auf der Erde mit den Anteilen der Biome), und verschiebt den Blick.</p>'+
  '<p class="leise">Farben: '+BIOM.map(function(n,i){return '<i class="amp" style="background:'+window.AT3_64.PALETTEN.A.farben[BFARBE[i]]+'"></i>'+n}).join(' ')+'</p>'+
  '<p class="leise">Netz: '+[[OFARBE[1],'Dorf'],[OFARBE[2],'Stadt'],[OFARBE[3],'Hafendorf'],[OFARBE[4],'Hafenstadt'],[F_PFAD,'Pfad'],[F_STRASSE,'Straße'],[WFARBE[3],'Brücke'],[WFARBE[4],'Furt'],[WFARBE[6],'Ortsplatz'],[F_SEE,'Seeweg'],[F_FAEHRE,'Fähre']].map(function(e){return '<i class="amp" style="background:'+window.AT3_64.PALETTEN.A.farben[e[0]]+'"></i>'+e[1]}).join(' ')+'</p>'+
  '<div id="waKlima" hidden><p><b>Klimazonen (N2a)</b> Wärme nach Breite und Höhe, Regen kommt mit dem Wind vom Meer (Passat von Osten, Westwind in den mittleren Breiten) und bleibt am Gebirge hängen. Dahinter wird es trocken. Die Kartenstücke folgen den Zonen erst ab N2b.</p>'+
  '<p class="leise">Zonen: '+ZONEN.map(function(n,i){return '<i class="amp" style="background:'+window.AT3_64.PALETTEN.A.farben[ZFARBE[i]]+'"></i>'+n}).join(' ')+'</p>'+
  '<div id="waKRegler"></div><p class="leise" id="waKInfo"></p><p class="leise" id="waKAnt"></p>'+
  '<p><button class="knopf klein" id="waKZurueck">Vorschlagswerte</button> <button class="knopf klein" id="waKKopie">Werte für den Chat kopieren</button></p><pre class="leise" id="waKZk" style="white-space:pre-wrap"></pre>'+
  '<p class="leise">Mehr Regen macht die Wüste nicht freundlicher, nur matschiger.</p></div>'+
  '<div id="waVoelker" hidden></div>'+
  '<p class="leise" id="waLive">Noch keine Welt.</p>'+
  '<p><button class="knopf haupt" id="waMessen">Auf diesem Gerät messen<small>gleiche Welt bei 0, 1, 2, 4 Helfern · Erde mit Orten, Straßen, Seewegen · Kartenstücke in Mitte und Ecken · Speicher · Bild · rund 20 Sekunden</small></button></p><div id="waErg"></div>'+
  '<p><button class="knopf" id="waKopie">Werte für den Chat kopieren<small>die Messung dieser Seite als kurzer Text</small></button></p>'+
  '<p class="leise">Alle Wege führen irgendwohin. Ob man dort ankommen möchte, steht auf einem anderen Blatt. Gebäude und Bewohner der Orte kommen in späteren Schritten.</p>';
 cv=q('#waCv');cx2=cv.getContext('2d');cv.addEventListener('click',tipp);
 [].forEach.call(el.querySelectorAll('[data-zoom]'),function(b){b.onclick=function(){setZoom(+b.dataset.zoom)}});
 [].forEach.call(el.querySelectorAll('[data-farbe]'),function(b){b.onclick=function(){setFarbe(+b.dataset.farbe)}});
 [].forEach.call(el.querySelectorAll('[data-geh]'),function(b){b.onclick=function(){var d=b.dataset.geh.split(',');schritt(+d[0],+d[1])}});
 q('#waNeu').onclick=function(){neueWelt(q('#waSeed').value)};
 q('#waDichte').onchange=function(){neueWelt(q('#waSeed').value,+q('#waDichte').value)};
 q('#waWuerfel').onclick=function(){neueWelt((Math.random()*4294967296)>>>0)};
 q('#waKopie').onclick=kopieren;
 q('#waKZurueck').onclick=function(){setRegler(null)};
 q('#waKKopie').onclick=function(){var t=zK?zkText():'';if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(function(){kInfo('Kopiert. In den Chat einfügen.')},function(){window.prompt('Text kopieren:',t)});else window.prompt('Text kopieren:',t)};
 q('#waMessen').onclick=function(){if(beschaeftigt)return;beschaeftigt=true;var b=q('#waMessen');b.disabled=true;q('#waErg').innerHTML='<p class="leise">Es wird gewogen. Die Welt hält kurz die Luft an.</p>';
  messe().catch(function(e){q('#waErg').innerHTML='<p class="witz">Messung gescheitert: '+String(e&&e.message||e).replace(/</g,'&lt;')+'</p>'}).then(function(){beschaeftigt=false;b.disabled=false})};
 zoom=0;farbe=0;kx=SX>>1;ky=SY>>1;ort();
 return new Promise(function(ok,nein){
  H=window.AT3KERNE.starten({seed:1,beiWs:beiWs,beiAusfall:function(g){laeuft=false;var o=q('#waLive');if(o)o.innerHTML='<span class="witz">Kerne ausgefallen ('+g+'). Die Welt bleibt heute flach.</span>'},
   beiBereit:function(){H.wsAn(true);H.befehl('tempo',3);neueWelt(SEED);ok()}});
  laeuft=true;neuZeichnen=true;requestAnimationFrame(bild)})}

window.AT3_WELTANSICHT={aufbauen:aufbauen,ergebnis:E,text:text,messe:messe,ende:ende,SOLL:SOLL,
 zustand:function(){return{zoom:zoom,farbe:farbe,kx:kx,ky:ky,dichte:dichte,orte:erd&&erd.kopf?erd.kopf[0]:0,verbindungen:erd&&erd.kopf?erd.kopf[1]:0,generator:!!WGh,erde:!!erd,kacheln:kacheln.size,fertig:Array.from(kacheln.values()).filter(function(k){return k.fertig}).length,ws:ws}},
 // N4b: für Tests: Völker der Welt und Text einer Zelle
 voelker:function(){var vk=erd&&erd.vk;return vk?{zahl:vk.zahl,daten:!!VD,tab:Array.from(vk.tab.subarray(0,vk.zahl)),orte:erd.orte.length}:null},zelle:function(i){return erd?zelleText(i):''},
 // N4c1: für Tests: Herrschaften der Welt
 herrschaften:function(){var hs=erd&&erd.hs;return hs?{zahl:hs.zahl[0],daten:!!HD,tab:Array.from(hs.tab),zel:Array.from(hs.zel.subarray(0,2000))}:null},
 bildPunkt:function(i){if(!erdCv)return null;var d=erdCv.getContext('2d').getImageData(i%GW,(i/GW)|0,1,1).data;return[d[0],d[1],d[2]]},
 setZoom:setZoom,setFarbe:setFarbe,blick:blick,neueWelt:neueWelt,setRegler:setRegler,ZONEN:ZONEN,
 klima:function(){return{bereit:zBereit,laeuft:!!zJob,gleich:zGleich,anteil:zAnteil?Array.from(zAnteil.Z):null,land:zAnteil?zAnteil.land:0,werte:zK?Object.assign({},zK):null,text:zK?zkText():''}},
 // für Tests: Lage eines Orts im Regionsbild als Anteil der Bildbreite und -höhe
 ortInRegion:function(){if(!erd||!erd.ort)return null;var r=regionEcke();for(var y=r[1]+2;y<r[1]+REGION-2;y++)for(var x=r[0]+2;x<r[0]+REGION-2;x++)if(erd.ort[y*GE+umZ(x)]&15)return[(x-r[0]+.5)/REGION,(y-r[1]+.5)/REGION];return null}};
})();
