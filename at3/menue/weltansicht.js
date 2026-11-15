// WAS DIE DATEI TUT: „Weltansicht“ im AT3-Master-Editor (Menü Welt & Bau, Schritt W1a; wird erst beim Antippen geladen, zusammen mit kernstart.js und at3-64.js).
// Zeigt die Welt aus dem Weltgenerator (weltgen.js): Seed eingeben, Zoom in vier festen Stufen (Erde → Region → 7 × 7 Kartenstücke → ein Stück),
// Einfärbung nach Biom oder Höhe, Flüsse sichtbar, Antippen zeigt Biom und Höhe und verschiebt den Blick. W1a+: Die Erde zeigt je Zelle das vom
// Klima begünstigte Biom; jede Gegend mischt alle Land-Biome, Antippen einer Zelle zeigt die Anteile. Dazu Messung auf diesem Gerät.
// Kerne: Erde und Kartenstücke rechnen in den Helferkernen, Übernahme im Weltkern (kernstart.js, derselbe Anschluss wie im Spiel). Der Hauptkern rechnet
// keine Welt: Er färbt das Erdbild einmal ein (300 × 300 Punkte) und je Bild höchstens ein neu angekommenes Kartenstück (64 × 64 Punkte).
// Zeichenarbeit (Regel 20): Zoomen skaliert nur fertige Bilder; fehlt ein Stück, steht dort der Ausschnitt des Erdbilds als Ersatz; gezeichnet wird nur bei Änderung.
// W1b: Einfärbung „Straßen & Seewege“ (Erde: ein Punkt je Zelle; Region: die echten Straßenläufe als Linien, Orte als Punkte, Seewege und Fähren
// gestrichelt; Kartenstücke: die Wegschicht je Feld), Ortsdichte dünn/mittel/dicht neben dem Seed, Antippen zeigt Ort mit Namen, Straße, Pass, Fähre
// oder Seeweg. Die Linien der Region rechnet der Hauptkern nur beim Neuzeichnen (höchstens 900 Zellen, rund 2 ms), nie je Bild.
// Das Spiel lädt diese Datei und den Generator nicht (G4).
// Wiederverwendet: kernstart.js (G2), Messart, Ampel und Kopierknopf aus der Kernprobe und der Riesenwelt-Probe, Palette aus at3-64.js (M2).
(function(){
'use strict';
var SEED=563520, BIS=300, SOLL='22fdd152';   // SOLL = Fingerabdruck aus tests/at3-weltgen.cjs; muss auf jedem Gerät gleich herauskommen
function B(cx,cy){return cx*8192+cy}
var SKRIPT=[{tick:0,art:'weltseed',wert:563520},{tick:0,art:'blick',wert:B(2400,2400)},{tick:70,art:'blick',wert:B(2403,2398)},{tick:100,art:'blick',wert:B(0,0)},
 {tick:130,art:'last',wert:300},{tick:150,art:'blick',wert:B(4799,4799)},{tick:170,art:'weltseed',wert:77},{tick:171,art:'weltseed',wert:4242},{tick:172,art:'weltdichte',wert:2},{tick:230,art:'blick',wert:B(1144,256)},
 {tick:260,art:'tempo',wert:3},{tick:270,art:'blick',wert:B(1146,256)}];
var GE=300, N=GE*GE, ST=64, FELDER=ST*ST, SEITE=4800, ZP=16, MEER=2048, HALB=3, S=448, MIB=1048576;   // Maße wie in weltgen.js (läuft nur in Hintergrundkernen)
var BIOM=['tiefes Meer','Meer','Strand','Wüste','Steppe','Wald','Sumpf','Tundra','Fels','Schnee','Fluss','See'];
var BFARBE=[39,40,46,62,19,15,8,11,23,5,42,41];                                // Farbnummern der AT3-Palette (Mitte); dunkler = −1, heller = +1 in derselben Reihe
var RAMPE=[14,15,16,17,18,60,61,62,24,23,22,3,4,5,6], TIEFE=[38,39,40,41];    // Höhenfarben Land (tief → hoch) und Wasser (tief → flach)
var ZOOM=['Erde','Region','Kartenstücke','Stück'], REGION=30, ZF=1024;
var ORTN=['','Dorf','Stadt','Hafendorf','Hafenstadt'], WEGN=['','Pfad','Straße','Brücke','Furt','Steg','Ortsplatz','Fähre'], DICHTEN=['dünn','mittel','dicht'];
var WFARBE=[0,47,48,31,43,12,36,6], OFARBE=[0,53,37,48,32], F_PFAD=12, F_STRASSE=47, F_SEE=43, F_FAEHRE=48;   // Farbnummern der AT3-Palette für Wegschicht, Orte und Netz
var netzCv=null, dichte=1, hilfe=null, WGh=null, ONh=null;
var E={erde:null,stueck:null,bild:null,speicher:null,gleich:null,geraet:null}, el=null, H=null, pal=null, erd=null, erdCv=null, erdGen=0, kacheln=new Map(), warte=[], lager=[];
var zoom=0, farbe=0, kx=SEITE>>1, ky=SEITE>>1, neuZeichnen=true, ws=null, laeuft=false, beschaeftigt=false, bilder=null, letztBild=0, cv=null, cx2=null, tmpBild=null, tmp32=null;

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
 if(farbe===1){if(bio<2||bio===11||h<0){var t=h<-1200?0:h<-500?1:h<-120?2:3;return pal[TIEFE[t]]}if(bio===10)return pal[42];
  var r=h<60?0:h<160?1:h<320?2:h<560?3:h<900?4:h<1400?5:h<2000?6:h<2800?7:h<3800?8:h<4800?9:h<5800?10:h<6800?11:h<7800?12:h<8800?13:14;return pal[RAMPE[r]]}
 var c=BFARBE[bio];if(bio>1&&bio<10)c+=dh>0?1:dh<0?-1:0;return pal[c]}
function erdBild(){if(!erd)return;var g=erdCv.getContext('2d'),im=g.createImageData(GE,GE),d=new Uint32Array(im.data.buffer),Eh=erd.E,bio=erd.bio,flu=erd.flu;
 for(var i=0;i<N;i++){var b=flu[i]>1?10:bio[i],j=i>GE?i-GE-1:i,dh=Eh[i]-Eh[j];d[i]=farbeVon(b,Eh[i],dh>120?1:dh<-120?-1:0)}
 g.putImageData(im,0,0);netzBild();neuZeichnen=true}
// W1b: Netz der Erde als eigenes durchsichtiges Bild (ein Punkt je Zelle), einmal je Welt; liegt in der Erdansicht über dem Erdbild
function netzBild(){if(!erd||!erd.ort)return;var g=netzCv.getContext('2d'),im=g.createImageData(GE,GE),d=new Uint32Array(im.data.buffer),ort=erd.ort,weg=erd.weg,bio=erd.bio;
 for(var i=0;i<N;i++){var o=ort[i]&15,w=weg[i];
  if(o)d[i]=pal[OFARBE[o]];else if(w&15)d[i]=pal[w&64?F_FAEHRE:(w>>4&3)>1?F_STRASSE:F_PFAD];else if(ort[i]>>4&&bio[i]<2&&((i%GE+((i/GE)|0))&1))d[i]=pal[F_SEE]}
 g.putImageData(im,0,0)}
function kachelBild(k){var Hh=new Uint16Array(k.buf.buffer,0,FELDER),Bb=new Uint8Array(k.buf.buffer,FELDER*2,FELDER),Ww=new Uint8Array(k.buf.buffer,FELDER*3,FELDER),d=tmp32;
 for(var i=0;i<FELDER;i++){if(farbe===2&&Ww[i]){d[i]=pal[WFARBE[Ww[i]]];continue}var x=i&63,y=i>>6,j=(x?i-1:i+1)+(y?-ST:ST),dh=x&&y?Hh[i]-Hh[j]:x||y?0:Hh[j]-Hh[i];if(!x&&y)dh=Hh[i+1-ST]-Hh[i+1];else if(x&&!y)dh=Hh[i+ST]-Hh[i+ST-1];d[i]=farbeVon(Bb[i],Hh[i]-MEER,farbe===2?-1:dh>10?1:dh<-10?-1:0)}   // Netzansicht: Land flach und dunkler, damit die Wege hervortreten
 k.cv.getContext('2d').putImageData(tmpBild,0,0);k.fertig=true;neuZeichnen=true}

function kachelWeg(key){var k=kacheln.get(key);if(!k)return;kacheln.delete(key);if(H)H.wsZurueck(k.buf);if(lager.length<49)lager.push(k.cv)}
function fensterRaeumen(){kacheln.forEach(function(k,key){if(Math.abs(k.cx-kx)>HALB||Math.abs(k.cy-ky)>HALB)kachelWeg(key)});warte=warte.filter(function(key){return kacheln.has(key)})}
function allesWeg(){kacheln.forEach(function(k,key){kachelWeg(key)});warte=[]}

function beiWs(d){
 if(d.art==='ws'){ws=d;live();return}
 if(d.art==='wsErde'){var b=d.buf.buffer;erd={E:new Int16Array(b,0,N),bio:new Uint8Array(b,2*N,N),flu:new Uint8Array(b,3*N,N),dir:new Uint8Array(b,4*N,N),feu:new Uint8Array(b,5*N,N),tmp:new Uint8Array(b,6*N,N),
   ort:new Uint8Array(b,7*N,N),weg:new Uint8Array(b,8*N,N),kopf:new Uint32Array(b,9*N,4),seed:d.seed};
  erdGen=d.gen;allesWeg();erdBild();return}
 if(d.art==='wsStueck'){if(d.gen!==erdGen||Math.abs(d.cx-kx)>HALB||Math.abs(d.cy-ky)>HALB){if(H)H.wsZurueck(d.buf);return}
  var key=B(d.cx,d.cy);kachelWeg(key);var c=lager.pop();if(!c){c=document.createElement('canvas');c.width=c.height=ST}
  kacheln.set(key,{cx:d.cx,cy:d.cy,buf:d.buf,cv:c,fertig:false});warte.push(key)}}

// ── Zeichnen: nur bei Änderung, je Bild höchstens ein neues Kartenstück einfärben ──
function regionEcke(){var zx=kx>>4,zy=ky>>4,h=REGION>>1;return[Math.max(0,Math.min(GE-REGION,zx-h)),Math.max(0,Math.min(GE-REGION,zy-h))]}
function bild(t){if(!laeuft)return;if(!el.isConnected){ende();return}
 if(bilder&&letztBild)bilder.push(t-letztBild);letztBild=t;
 if(warte.length){var k=kacheln.get(warte.shift());if(k)kachelBild(k)}
 if(neuZeichnen){neuZeichnen=false;var g=cx2,i,j;g.imageSmoothingEnabled=false;
  if(!erd){g.fillStyle='#5c5650';g.fillRect(0,0,S,S)}
  else if(zoom===0){g.drawImage(erdCv,0,0,GE,GE,0,0,S,S);if(farbe===2)g.drawImage(netzCv,0,0,GE,GE,0,0,S,S);marke(g,(kx>>4)*S/GE,(ky>>4)*S/GE,Math.max(4,S/GE))}
  else if(zoom===1){var r=regionEcke(),f=S/REGION;g.drawImage(erdCv,r[0],r[1],REGION,REGION,0,0,S,S);if(farbe===2)netzRegion(g,r[0],r[1],f);marke(g,(kx/ZP-r[0])*f-f*7/32,(ky/ZP-r[1])*f-f*7/32,f*7/16)}
  else{var n=zoom===2?7:1,gr=S/n,a=zoom===2?HALB:0;
   for(j=-a;j<=a;j++)for(i=-a;i<=a;i++){var cxx=kx+i,cyy=ky+j,x=(i+a)*gr,y=(j+a)*gr,ka=kacheln.get(B(cxx,cyy));
    if(cxx<0||cyy<0||cxx>=SEITE||cyy>=SEITE){g.fillStyle='#0e0c0b';g.fillRect(x,y,gr,gr)}
    else if(ka&&ka.fertig)g.drawImage(ka.cv,0,0,ST,ST,x,y,gr,gr);
    else g.drawImage(erdCv,cxx/ZP,cyy/ZP,1/ZP,1/ZP,x,y,gr,gr)}                                        // Ersatzbild: Ausschnitt der Erde, bis das Stück da ist
   if(zoom===2)marke(g,a*gr,a*gr,gr)}}
 requestAnimationFrame(bild)}
// W1b: Netz der Region als Linien (echter Lauf jeder Straße aus dem Generator, 13 Punkte je Ausgang). Nur beim Neuzeichnen; solange der Generator
// auf dem Hauptkern noch lädt, steht dort das grobe Netzbild als Ersatz.
function helfer(){return hilfe||(hilfe=window.AT3ED.lade('welt','weltgen.js').then(function(){return window.AT3ED.lade('welt','ortsnamen.js')}).then(function(){WGh=window.AT3WG;ONh=window.AT3ORTSNAMEN;neuZeichnen=true}))}
function netzRegion(g,rx,ry,f){if(!erd.ort)return;if(!WGh){g.drawImage(netzCv,rx,ry,REGION,REGION,0,0,S,S);helfer().catch(function(){});return}
 var fx=f/ZF,x,y,i,k,L,l,o,r,F=window.AT3_64.PALETTEN.A.farben;g.lineJoin='round';
 for(y=ry;y<ry+REGION;y++)for(x=rx;x<rx+REGION;x++){i=y*GE+x;o=erd.ort[i];
  if(erd.bio[i]<2){if(o>>4){g.strokeStyle=F[F_SEE];g.lineWidth=1.5;g.setLineDash([3,4]);g.beginPath();var mx=(x-rx+.5)*f,my=(y-ry+.5)*f;
    var aus=[];for(r=0;r<4;r++)if(o>>4>>r&1)aus.push(mx+(r===0?f/2:r===2?-f/2:0),my+(r===1?f/2:r===3?-f/2:0));
    if(aus.length===4){g.moveTo(aus[0],aus[1]);g.quadraticCurveTo(mx,my,aus[2],aus[3])}else for(r=0;r<aus.length;r+=2){g.moveTo(mx,my);g.lineTo(aus[r],aus[r+1])}   // zwei Ausgänge: weicher Bogen statt Ecke
    g.stroke();g.setLineDash([])}continue}
  if(!(erd.weg[i]&15)&&!(o&15))continue;L=WGh.wegLinien(erd.seed,erd,x,y);
  for(k=0;k<L.length;k++){l=L[k];g.strokeStyle=F[l.see?F_SEE:l.faehre?F_FAEHRE:l.kl>1?F_STRASSE:F_PFAD];g.lineWidth=l.kl>1&&!l.see?2.5:1.5;if(l.see||l.faehre)g.setLineDash([3,4]);
   g.beginPath();g.moveTo((l.x[0]-rx*ZF)*fx,(l.y[0]-ry*ZF)*fx);for(var q2=1;q2<13;q2++)g.lineTo((l.x[q2]-rx*ZF)*fx,(l.y[q2]-ry*ZF)*fx);g.stroke();g.setLineDash([])}}
 for(y=ry;y<ry+REGION;y++)for(x=rx;x<rx+REGION;x++){o=erd.ort[y*GE+x]&15;if(!o)continue;var P=WGh.ortPunkt(erd.seed,erd,x,y),gr=o===2||o===4?7:5,px=(P[0]-rx*ZF)*fx,py=(P[1]-ry*ZF)*fx;
  g.fillStyle='#0e0c0b';g.fillRect(Math.round(px-gr/2)-1,Math.round(py-gr/2)-1,gr+2,gr+2);g.fillStyle=F[OFARBE[o]];g.fillRect(Math.round(px-gr/2),Math.round(py-gr/2),gr,gr)}}
function marke(g,x,y,w){g.strokeStyle='#f4c8a0';g.lineWidth=2;g.strokeRect(Math.round(x)+1,Math.round(y)+1,Math.round(w)-2,Math.round(w)-2);g.strokeStyle='#2a0604';g.lineWidth=1;g.strokeRect(Math.round(x)-.5,Math.round(y)-.5,Math.round(w)+1,Math.round(w)+1)}

// ── Bedienung ──
function blick(nx,ny){nx=Math.max(0,Math.min(SEITE-1,nx|0));ny=Math.max(0,Math.min(SEITE-1,ny|0));if(nx===kx&&ny===ky)return;kx=nx;ky=ny;fensterRaeumen();if(H)H.befehl('blick',B(kx,ky));neuZeichnen=true;ort()}
function ort(){var o=q('#waOrt');if(o)o.textContent='Blick: Kartenstück '+tsd(kx)+' / '+tsd(ky)+' von '+tsd(SEITE)+' · Zelle '+(kx>>4)+' / '+(ky>>4)}
function hoehe(h){return h<0?'Tiefe '+kom(-h/16,1)+' Felder (rund '+Math.round(-h*3/16)+' m)':'Höhe '+kom(h/16,1)+' Felder (rund '+Math.round(h*3/16)+' m)'}
function zelleText(i){var b=erd.flu[i]?BIOM[erd.bio[i]]+' mit Fluss (Breite '+erd.flu[i]+' von 5)':BIOM[erd.bio[i]];return netzText(i)+b+' · '+hoehe(erd.E[i])+' · Wärme '+erd.tmp[i]+' · Feuchte '+erd.feu[i]}
// W1b: Ort (Name, sobald die Namensliste geladen ist), Straße, Pass, Fähre, Seeweg einer Zelle
function netzText(i){if(!erd.ort)return '';var o=erd.ort[i]&15,w=erd.weg[i],t='';
 if(o)t+=(ONh?ONh.name(erd.seed,i,o):'…')+' ('+ORTN[o]+') · ';
 if(w&15)t+=(w&64?'Fähre':((w>>4&3)>1?'Straße':'Pfad')+(erd.bio[i]===8||erd.bio[i]===9?' über einen Pass':''))+' · ';
 if(erd.ort[i]>>4&&erd.bio[i]<2)t+='Seeweg · ';return t}
function tipp(e){if(!erd)return;var r=cv.getBoundingClientRect(),fx=Math.max(0,Math.min(.9999,(e.clientX-r.left)/r.width)),fy=Math.max(0,Math.min(.9999,(e.clientY-r.top)/r.height)),info=q('#waInfo'),zx,zy;
 if(zoom<2){if(zoom===0){zx=(fx*GE)|0;zy=(fy*GE)|0}else{var ec=regionEcke();zx=ec[0]+((fx*REGION)|0);zy=ec[1]+((fy*REGION)|0)}
  info.textContent='Zelle '+zx+' / '+zy+': '+zelleText(zy*GE+zx);anteileZeigen(zx,zy);blick(zx*ZP+8,zy*ZP+8);return}
 var n=zoom===2?7:1,a=zoom===2?HALB:0,px=fx*n,py=fy*n,cxx=kx+(px|0)-a,cyy=ky+(py|0)-a,ka=kacheln.get(B(cxx,cyy)),x=((px%1)*ST)|0,y=((py%1)*ST)|0;
 if(ka){var Hh=new Uint16Array(ka.buf.buffer,0,FELDER),Bb=new Uint8Array(ka.buf.buffer,FELDER*2,FELDER),i=y*ST+x;
  var wf=ka.buf[FELDER*3+i];info.textContent='Feld '+tsd(cxx*ST+x)+' / '+tsd(cyy*ST+y)+': '+(wf?WEGN[wf]+' · ':'')+BIOM[Bb[i]]+' · '+hoehe(Hh[i]-MEER)}
 else info.textContent='Dieses Stück wird noch aus dem Seed gekratzt.';
 if(zoom===2)blick(cxx,cyy)}
// W1a+: Anteile der Biome in der angetippten Zelle (Stichprobe 24 × 24 mit derselben Regel wie die Kartenstücke). Der Generator wird dafür beim
// ersten Antippen einmal auf den Hauptkern geladen; eine Stichprobe kostet rund 1 ms, nur auf Antippen, nie je Bild.
function anteileZeigen(zx,zy){var info=q('#waInfo'),seed=erd?erd.seed:0,i=zy*GE+zx,vorher=info.textContent;if(!erd)return;
 helfer().then(function(){
  if(info.textContent!==vorher)return;if(erd.ort&&erd.ort[i]&15)vorher=info.textContent='Zelle '+zx+' / '+zy+': '+zelleText(i);                       // jetzt mit Namen
  if(erd.bio[i]<2||erd.bio[i]===11)return;var A={E:erd.E,bio:erd.bio,tmp:erd.tmp,feu:erd.feu},Z=WGh.anteile(seed,A,zx,zy),n=0,L=[];
  for(var k=0;k<12;k++)n+=Z[k];
  for(k=3;k<12;k++)if(Z[k]&&k!==10)L.push([k,Z[k]]);L.sort(function(a,b){return b[1]-a[1]});
  info.textContent=vorher+' · Anteile: '+L.map(function(e){return BIOM[e[0]]+' '+Math.round(e[1]*100/n)+' %'}).join(', ')},function(){})}
function schritt(dx,dy){var s=zoom===0?ZP*20:zoom===1?ZP*5:zoom===2?3:1;blick(kx+dx*s,ky+dy*s)}
function setZoom(z){zoom=z;[].forEach.call(el.querySelectorAll('[data-zoom]'),function(b){b.classList.toggle('an',+b.dataset.zoom===z)});neuZeichnen=true}
function setFarbe(f){farbe=f;if(f===2)helfer().catch(function(){});[].forEach.call(el.querySelectorAll('[data-farbe]'),function(b){b.classList.toggle('an',+b.dataset.farbe===f)});erdBild();kacheln.forEach(function(k,key){if(warte.indexOf(key)<0)warte.push(key)})}
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

function ende(){laeuft=false;if(H){H.ende();H=null}kacheln=new Map();warte=[];erd=null;ws=null}
function aufbauen(ziel){ende();el=ziel;pal=palette();erdCv=document.createElement('canvas');erdCv.width=erdCv.height=GE;netzCv=document.createElement('canvas');netzCv.width=netzCv.height=GE;dichte=1;
 var tc=document.createElement('canvas');tc.width=tc.height=ST;tmpBild=tc.getContext('2d').createImageData(ST,ST);tmp32=new Uint32Array(tmpBild.data.buffer);
 var k=kerne(),h=window.AT3KERNE.helferZahl(k);
 el.innerHTML='<p>Eine Welt aus einer einzigen Zahl. Wer mit ihr unzufrieden ist, würfelt neu. So einfach hatten es die Götter nie.</p>'+
  '<p class="leise">307.200 × 307.200 Felder (4.800 × 4.800 Kartenstücke). Gerechnet wird nur, was zu sehen ist: ein grobes Erdraster (300 × 300 Zellen, mit allen Orten, Straßen und Seewegen) und höchstens 49 Kartenstücke. Dieses Gerät meldet '+k+' Kerne: 1 Hauptkern (Bild), 1 Weltkern, '+h+' Helfer.</p>'+
  '<div class="wZeile"><label for="waSeed">Seed</label><input id="waSeed" type="number" min="0" max="4294967295" value="'+SEED+'" style="font:inherit;font-size:17px;min-height:42px;width:150px"> '+
  '<button class="knopf klein" id="waNeu">Welt erzeugen</button> <button class="knopf klein" id="waWuerfel">Würfeln</button></div>'+
  '<div class="wZeile"><label for="waDichte">Orte</label><select id="waDichte" style="font:inherit;font-size:17px;min-height:42px">'+DICHTEN.map(function(n,i){return '<option value="'+i+'"'+(i===1?' selected':'')+'>'+n+'</option>'}).join('')+'</select> '+
  '<span class="leise">Dichte der Besiedlung. Gehört zur Welt wie der Seed.</span></div>'+
  '<div class="wZeile">'+ZOOM.map(function(n,i){return '<button class="knopf klein'+(i===0?' an':'')+'" data-zoom="'+i+'">'+n+'</button>'}).join('')+'</div>'+
  '<div class="wZeile"><button class="knopf klein an" data-farbe="0">Biome</button><button class="knopf klein" data-farbe="1">Höhe</button><button class="knopf klein" data-farbe="2">Straßen &amp; Seewege</button></div><div class="wZeile">'+
  '<button class="knopf klein" data-geh="-1,0" aria-label="nach Westen">◀</button><button class="knopf klein" data-geh="0,-1" aria-label="nach Norden">▲</button>'+
  '<button class="knopf klein" data-geh="0,1" aria-label="nach Süden">▼</button><button class="knopf klein" data-geh="1,0" aria-label="nach Osten">▶</button></div>'+
  '<canvas id="waCv" class="pixel" width="'+S+'" height="'+S+'" style="display:block;width:100%;max-width:'+S+'px;aspect-ratio:1;background:#5c5650;border:3px solid var(--rand);touch-action:manipulation"></canvas>'+
  '<p class="leise" id="waOrt"></p><p id="waInfo">Antippen zeigt, was dort liegt (auf der Erde mit den Anteilen der Biome), und verschiebt den Blick.</p>'+
  '<p class="leise">Farben: '+BIOM.map(function(n,i){return '<i class="amp" style="background:'+window.AT3_64.PALETTEN.A.farben[BFARBE[i]]+'"></i>'+n}).join(' ')+'</p>'+
  '<p class="leise">Netz: '+[[OFARBE[1],'Dorf'],[OFARBE[2],'Stadt'],[OFARBE[3],'Hafendorf'],[OFARBE[4],'Hafenstadt'],[F_PFAD,'Pfad'],[F_STRASSE,'Straße'],[WFARBE[3],'Brücke'],[WFARBE[4],'Furt'],[WFARBE[6],'Ortsplatz'],[F_SEE,'Seeweg'],[F_FAEHRE,'Fähre']].map(function(e){return '<i class="amp" style="background:'+window.AT3_64.PALETTEN.A.farben[e[0]]+'"></i>'+e[1]}).join(' ')+'</p>'+
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
 q('#waMessen').onclick=function(){if(beschaeftigt)return;beschaeftigt=true;var b=q('#waMessen');b.disabled=true;q('#waErg').innerHTML='<p class="leise">Es wird gewogen. Die Welt hält kurz die Luft an.</p>';
  messe().catch(function(e){q('#waErg').innerHTML='<p class="witz">Messung gescheitert: '+String(e&&e.message||e).replace(/</g,'&lt;')+'</p>'}).then(function(){beschaeftigt=false;b.disabled=false})};
 zoom=0;farbe=0;kx=ky=SEITE>>1;ort();
 return new Promise(function(ok,nein){
  H=window.AT3KERNE.starten({seed:1,beiWs:beiWs,beiAusfall:function(g){laeuft=false;var o=q('#waLive');if(o)o.innerHTML='<span class="witz">Kerne ausgefallen ('+g+'). Die Welt bleibt heute flach.</span>'},
   beiBereit:function(){H.wsAn(true);H.befehl('tempo',3);neueWelt(SEED);ok()}});
  laeuft=true;neuZeichnen=true;requestAnimationFrame(bild)})}

window.AT3_WELTANSICHT={aufbauen:aufbauen,ergebnis:E,text:text,messe:messe,ende:ende,SOLL:SOLL,
 zustand:function(){return{zoom:zoom,farbe:farbe,kx:kx,ky:ky,dichte:dichte,orte:erd&&erd.kopf?erd.kopf[0]:0,verbindungen:erd&&erd.kopf?erd.kopf[1]:0,generator:!!WGh,erde:!!erd,kacheln:kacheln.size,fertig:Array.from(kacheln.values()).filter(function(k){return k.fertig}).length,ws:ws}},
 setZoom:setZoom,setFarbe:setFarbe,blick:blick,neueWelt:neueWelt,
 // für Tests: Lage eines Orts im Regionsbild als Anteil der Bildbreite und -höhe
 ortInRegion:function(){if(!erd||!erd.ort)return null;var r=regionEcke();for(var y=r[1]+2;y<r[1]+REGION-2;y++)for(var x=r[0]+2;x<r[0]+REGION-2;x++)if(erd.ort[y*GE+x]&15)return[(x-r[0]+.5)/REGION,(y-r[1]+.5)/REGION];return null}};
})();
