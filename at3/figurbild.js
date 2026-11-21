// WAS DIE DATEI TUT: F1a Kartenfiguren wie in Arena Theory 2.0 (Thomas 17./18.11.2026, E10). Zeichnet je Gladiator ein Posenblatt aus der „einfachen Figur“ von 1.0
// (arena.js renderSimpleFigure, unverändert), genau wie 2.0 (welt-raster.js simpleOf): groß gemalt 48 × 84, weich auf 14 × 24 verkleinert, jeder Bildpunkt ganz deckend oder leer.
// Posen (Thomas 18.11.2026 „wie 2.0 plus Arbeiten“): 8 Gehbilder, 1 Standbild, 8 Gehbilder mit Last (Holzbündel auf der Schulter), 4 Arbeitsbilder (Schlag von oben, mit Axt);
// je nach rechts und nach links. Zwei Fassungen: „voll“ (Farben wie 2.0, mit Schatten wie 2.0) und „p64“ (AT3-64, Palette A, Schatten weg, weil der Standard keine Halbtransparenz kennt).
// Besucher: die 60 Typen aus 2.0 (welt-besucher.js STAND, dort unverändert), hier mit eigenem Zufall aus dem Seed, damit das Musterblatt wiederholbar ist.
// Kern: läuft im Kampfkern (Hintergrundkern, 1.0 ist dort schon geladen); der Hauptkern bekommt nur fertige Bildpunkte. Braucht OffscreenCanvas.
'use strict';
(function(G){
var NW=48,NH=84,NAX=24,NAY=78,PW=14,PH=24,PAX=7,PAY=22,WALK=8,TAU=Math.PI*2;
var POSEN=[{id:'gehen',n:8},{id:'stehen',n:1},{id:'tragen',n:8},{id:'arbeiten',n:4}];
var N=0;POSEN.forEach(function(p){p.ab=N;N+=p.n});
// Stände der Besucher aus 2.0 (welt-besucher.js, Thomas 12.11.2026): Kleiderfarben und Statur
var STAND=[
 {name:'Bauer',en:'Peasant',n:5,tuch:['#8a6f4a','#7a7446','#6f5a3c','#93805a','#5f6a44'],h:[160,182],w:[62,92]},
 {name:'Bauerntölpel',en:'Village Oaf',n:3,tuch:['#9a7d4f','#6d6a3a','#84603e'],h:[156,176],w:[95,128]},
 {name:'Tagelöhner',en:'Day Labourer',n:2,tuch:['#77705f','#665a4a','#8a8370'],h:[162,186],w:[58,78]},
 {name:'Handwerker',en:'Craftsman',n:3,tuch:['#7d8a8c','#a08a52','#6a7f5e','#8c6f5a'],h:[164,188],w:[70,100]},
 {name:'Händler',en:'Merchant',n:2,tuch:['#3f6f8f','#c27a2e','#4f8a6a','#b0553a'],h:[162,186],w:[78,118]},
 {name:'Bürger',en:'Citizen',n:2,tuch:['#c9b99a','#b8a27c','#d8cdb4','#a9b0a0'],h:[164,190],w:[66,96]},
 {name:'Edelmann',en:'Noble',n:3,tuch:['#f1ead8','#7a3f8c','#a32f2a','#e8dcc0','#5a3a8a'],h:[172,196],w:[66,94]}
],TYPEN=60;
function zufall(seed){var s=seed>>>0||1;return function(){s=(s+0x6D2B79F5)>>>0;var t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
// Besuchertypen wie 2.0 typenBauen: Gladiator aus 1.0 erzeugen, dann Stand, Größe, Gewicht, Alter und Kleiderfarbe setzen
function besucher(M,seed){var r=zufall(seed),rnd=function(a,b){return a+r()*(b-a)},bag=[],aus=[];STAND.forEach(function(st){for(var i=0;i<st.n;i++)bag.push(st)});
 for(var i=0;i<TYPEN;i++){var st=bag[i%bag.length],g=M.makeGladiator(0);g.zuschauer=true;g.stand=st.en;g.height=Math.round(rnd(st.h[0],st.h[1]));g.weight=Math.round(rnd(st.w[0],st.w[1]));g.age=Math.round(rnd(16,70));
  kennung(M,g,'f1b-'+seed+'-'+i)
  g.appearance=Object.assign({},g.appearance||{skin:'#d9ac82',shade:'#9c7353',hair:'#443025',style:1,beard:0},{cloth:st.tuch[(r()*st.tuch.length)|0]});aus.push(g)}
 return aus}
// Musterblatt wiederholbar: 1.0 leitet das Aussehen aus der Kennung ab (data.js ensureIdentity); die laufende Nummer des Kerns würde es sonst je Auftrag ändern
function kennung(M,g,id){g.id=id;delete g.appearance;try{M.ensureIdentity&&M.ensureIdentity(g)}catch(e){}}
// Arbeitspose: Schlag von oben mit Axt (1.0 swingKind 'overhead'); die Axt kommt nur in die Zeichenkopie, nie in den Gladiator selbst
function mitAxt(M,g){var k=JSON.parse(JSON.stringify(g)),rng=M.s.rng;try{k.enemyGear=Object.assign({},k.enemyGear||{},{weapon:M.makeItem('weapon','axe',1)})}finally{M.s.rng=rng}return k}
function akteur(g,dir,pose,f){var a={g:g,team:0,ownCloth:true,x:NAX,y:NAY,z:0,a:dir?Math.PI:0,energy:100,ammo:0,index:0,baseX:0,baseY:0,state:'idle',moveSpeed:0,phase:0};
 if(pose==='gehen'||pose==='tragen'){a.state='move';a.moveSpeed=60;a.phase=f/WALK*TAU}
 else if(pose==='arbeiten'){a.state='attack';a.swingKind='overhead';a.swingMax=.44;a.swing=.44*(1-f/4)+.01}
 return a}
// Holzbündel auf der Schulter: drei Stämme über dem obersten Bildpunkt der Figur, etwas zum Rücken hin
function last(c,x,dir){var d=c.getImageData(0,0,NW,NH).data,top=NH;for(var y=0;y<NH&&top===NH;y++)for(var i=0;i<NW;i++)if(d[(y*NW+i)*4+3]>96){top=y;break}
 if(top>=NH)return;var y0=top+9,x0=x+(dir?3:-3)-12;
 [['#5a3d22',0],['#7a5530',3],['#93683b',6]].forEach(function(s){c.fillStyle=s[0];c.fillRect(x0,y0-s[1]-3,24,3)});c.fillStyle='#c79a5e';c.fillRect(dir?x0+21:x0,y0-9,3,9)}
// Ein Blatt: Spalten = Posenbilder (N), Zeilen = Richtung (0 rechts, 1 links). Ergebnis: RGBA mit Schatten (voll) und Paletten-Nummern (p64, 255 = leer).
function blatt(M,g,c,k,pal,nah){var W=PW*N,H=PH*2,voll=new Uint8ClampedArray(W*H*4),p64=new Uint8Array(W*H).fill(255),axt=null;
 for(var dir=0;dir<2;dir++)POSEN.forEach(function(p){for(var f=0;f<p.n;f++){
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,NW,NH);var ga=g;if(p.id==='arbeiten'){if(!axt)axt=mitAxt(M,g);ga=axt}
  try{M.renderSimpleFigure(c,akteur(ga,dir,p.id,f))}catch(e){if(!blatt.warn){blatt.warn=1;console.warn('einfache Figur',e)}}
  if(p.id==='tragen')last(c,NAX,dir);
  k.clearRect(0,0,PW,PH);k.imageSmoothingEnabled=true;k.imageSmoothingQuality='high';k.drawImage(c.canvas,0,0,NW,NH,0,0,PW,PH);
  var d=k.getImageData(0,0,PW,PH).data,ox=(p.ab+f)*PW,oy=dir*PH;
  for(var y=0;y<PH;y++)for(var x=0;x<PW;x++){var i=(y*PW+x)*4,o=((oy+y)*W+ox+x)*4,o1=(oy+y)*W+ox+x;if(d[i+3]<=96)continue;
   voll[o]=d[i];voll[o+1]=d[i+1];voll[o+2]=d[i+2];voll[o+3]=255;var key=(d[i]<<16)|(d[i+1]<<8)|d[i+2],n=nah[key];if(n===undefined)n=nah[key]=pal(d[i],d[i+1],d[i+2]);p64[o1]=n}
  for(var px=PAX-4;px<PAX+4;px++){var o2=((oy+PAY)*W+ox+px)*4;if(!voll[o2+3]){voll[o2]=15;voll[o2+1]=20;voll[o2+2]=10;voll[o2+3]=77}}}});
 return {w:W,h:H,voll:voll,p64:p64}}
// Auftrag {seed, n: Gladiatoren (Sklavenmarkt wie 1.0), besucher: true|false, palette:'A'} → {fw,fh,ax,ay,posen,figuren:[{name,art,stand,w,h,voll,p64,ms}],ms}
function figuren(M,S64,w){if(typeof G.OffscreenCanvas!=='function')throw new Error('OffscreenCanvas fehlt');if(!M.renderSimpleFigure)throw new Error('renderSimpleFigure fehlt (arena.js)');
 var t0=G.performance.now(),rng=M.s.rng,seed=(w.seed>>>0)||1,liste=[],nah={},palName=w.palette||S64.PALETTE,pal=function(r,g,b){return S64.naechste(r,g,b,palName)};
 try{M.s.rng=seed;var n=Math.max(0,Math.min(64,w.n|0));for(var i=0;i<n;i++){var gl=M.makeGladiator(0);kennung(M,gl,'f1g-'+seed+'-'+i);liste.push({g:gl,art:'gladiator'})}
  if(w.besucher)besucher(M,seed^0x5bd1e995).forEach(function(g){liste.push({g:g,art:'besucher'})})}finally{M.s.rng=rng}
 var c=new G.OffscreenCanvas(NW,NH).getContext('2d',{willReadFrequently:true}),k=new G.OffscreenCanvas(PW,PH).getContext('2d',{willReadFrequently:true}),aus=[];
 liste.forEach(function(e){var t=G.performance.now(),b=blatt(M,e.g,c,k,pal,nah),a=e.g.appearance||{};
  aus.push({name:e.g.name,art:e.art,stand:e.g.stand||'',groesse:e.g.height|0,haut:a.skin||'',tuch:a.cloth||'',w:b.w,h:b.h,voll:b.voll,p64:b.p64,ms:G.performance.now()-t})});
 return {fw:PW,fh:PH,ax:PAX,ay:PAY,posen:POSEN.map(function(p){return {id:p.id,ab:p.ab,n:p.n}}),n:N,palette:palName,figuren:aus,farben:Object.keys(nah).length,ms:G.performance.now()-t0}}
// ── F1b (Thomas 18.11.2026): Kartenblätter für das Spiel. Fassung AT3-64 (Entscheidung am Musterblatt), je Person nur Gehen 8, Stehen 1, Arbeiten 4 (Axt-Schlag bei
// jeder Arbeit, passende Posen je Tätigkeit später). Lasten je Ware einmal für alle (Thomas: „je Ware eigene Last“), werden beim Zeichnen über die Figur gelegt;
// dy je Bild schiebt die Last mit dem Kopf auf und ab. Spart je Person 8 Tragebilder je Ware (Speicher und Zeichenzeit im Kern).
var KPOSEN=[{id:'gehen',n:8},{id:'stehen',n:1},{id:'arbeiten',n:4}],KN=0;KPOSEN.forEach(function(p){p.ab=KN;KN+=p.n});
var WAREN=['boards','stone','water','meal','log','meat'],REF=20;
// Last je Ware, groß gemalt (Maß der großen Figur), y0 = Schulterhöhe. Holzbündel (log) wie im Musterblatt.
function lastWare(c,ware,x,y0,dir){var x0=x+(dir?3:-3)-12,r=function(f,a,b,w,h){c.fillStyle=f;c.fillRect(a,b,w,h)};
 if(ware==='log'){[['#5a3d22',0],['#7a5530',3],['#93683b',6]].forEach(function(s){r(s[0],x0,y0-s[1]-3,24,3)});r('#c79a5e',dir?x0+21:x0,y0-9,3,9);return}
 if(ware==='boards'){[['#b5874d',0],['#d0a466',3],['#e2bd84',6]].forEach(function(s,i){r(s[0],x0-2+i,y0-s[1]-3,28,2)});r('#8a6233',dir?x0+20:x0+4,y0-9,2,9);return}
 if(ware==='stone'){r('#6f6c66',x0+5,y0-11,14,11);r('#9a968e',x0+7,y0-10,9,5);r('#4f4c48',x0+5,y0-2,14,2);return}
 if(ware==='water'){r('#8a5a34',x0+7,y0-14,10,14);r('#b07a48',x0+8,y0-13,4,11);r('#5a3a22',x0+6,y0-15,12,2);r('#4f86b8',x0+8,y0-17,8,2);return}
 if(ware==='meal'){r('#7a5a30',x0+3,y0-7,18,7);r('#a07a44',x0+4,y0-6,16,2);r('#d9a55a',x0+5,y0-11,6,4);r('#c48a44',x0+12,y0-12,7,5);return}
 if(ware==='meat'){r('#8e2a22',x0+4,y0-10,14,10);r('#b8463a',x0+6,y0-9,8,5);r('#e8dcc0',dir?x0+17:x0+1,y0-8,5,3);return}}
function kleinP64(k,c,pal,nah,W,ox,oy,ziel){k.clearRect(0,0,PW,PH);k.imageSmoothingEnabled=true;k.imageSmoothingQuality='high';k.drawImage(c.canvas,0,0,NW,NH,0,0,PW,PH);
 var d=k.getImageData(0,0,PW,PH).data;for(var y=0;y<PH;y++)for(var x=0;x<PW;x++){var i=(y*PW+x)*4;if(d[i+3]<=96)continue;
  var key=(d[i]<<16)|(d[i+1]<<8)|d[i+2],n=nah[key];if(n===undefined)n=nah[key]=pal(d[i],d[i+1],d[i+2]);ziel[(oy+y)*W+ox+x]=n}}
// ── AR2c1 (Thomas 21.11.2026): Zuschauer von vorn und von hinten für First Person. Die Kartenblätter haben nur Seitenansichten (wie 2.0); hier kommen je Typ
// 8 kleine Bilder dazu, gezeichnet wie die Zuschauer auf den Rängen von 1.0 (arena.js personSprite, dort unverändert, hier als Kopie): 
// von hinten Haare statt Gesicht; Maße schlank wie die Seitenansicht (Thomas sah sonst beim Umdrehen eine breitere Figur). Farben aus dem Aussehen des Besuchertyps (Haut, Haar, Kleid wie auf der Karte), Kopfbedeckung
// nach Stand. Bilder: 0 vorn stehen, 1–2 vorn gehen (Bein abwechselnd angehoben), 3 vorn sitzen, 4–7 dasselbe von hinten. Je Bild PW × PH, Fuß bzw. Sitz bei PAX, PAY.
var VH=8,VH_DUNKEL=['#4a3f33','#3b4447','#5a4a3a','#2f3330'];
function vhStil(g,i){var a=g.appearance||{},st=g.stand||'';if(st==='Noble')return i%2?3:5;if((a.beard|0)>=6)return 4;return[0,1,2,5][(a.style|0)%4]}
// Maße schlank wie die Seitenansicht (Rumpf 7, Kopf 5 breit, Fuß bis Scheitel 22), sonst wie 1.0: Schatten rechts und am Gürtel, Kopfbedeckung nach Stil
function vhBild(c,T,hinten,art,fuss){var Q=function(x,y,w,h,f){c.fillStyle=f;c.fillRect(x,y,w,h)},steh=art!=='sitz',dark='rgba(0,0,0,.25)',o=steh?-3:0;
 c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,PW,PH);c.translate(PAX,PAY);
 if(steh){Q(-3,-5+(fuss===1?-1:0),2,5+(fuss===1?0:0),T.cloth2);Q(1,-5+(fuss===2?-1:0),2,5,T.cloth2)}else Q(-3,-2,7,2,T.cloth2);      // Beine bzw. Oberschenkel auf der Bank
 Q(-3,-11+o,7,9,T.cloth);Q(3,-11+o,1,9,dark);Q(-3,-4+o,7,1,dark);
 var arme=function(){if(steh){Q(-4,-10+o,1,6,T.cloth);Q(4,-10+o,1,6,T.cloth);Q(-4,-4+o,1,2,T.skin);Q(4,-4+o,1,2,T.skin)}
  else{Q(-4,-10,1,5,T.cloth);Q(4,-10,1,5,T.cloth);Q(-3,-4,2,1,T.skin);Q(2,-4,2,1,T.skin)}};
 var hy=-17+o;arme();
 if(hinten){Q(-2,hy,5,6,T.style===4?T.skin:T.hair);Q(-1,hy+5,3,1,T.skin);if(T.style===2)Q(-3,hy-1,7,4,T.cloth2);if(T.style===3)Q(-3,hy,7,1,'#6f8a44');if(T.style===5)Q(-3,hy-1,7,2,'#7a6a52')}
 else{Q(-2,hy,5,6,T.skin);if(T.style!==4)Q(-2,hy-1,5,2,T.hair);if(T.style===1){Q(-3,hy,1,5,T.hair);Q(3,hy,1,5,T.hair)}if(T.style===2){Q(-3,hy-1,7,2,T.cloth2);Q(-3,hy,1,5,T.cloth2);Q(3,hy,1,5,T.cloth2)}
  if(T.style===3)Q(-3,hy,7,1,'#6f8a44');if(T.style===4)Q(-1,hy+4,3,2,T.hair);if(T.style===5)Q(-3,hy-1,7,2,'#7a6a52');
  Q(-1,hy+2,1,1,'#2a211b');Q(1,hy+2,1,1,'#2a211b');if(T.style!==4)Q(0,hy+4,1,1,'#6e3b30')}
 c.setTransform(1,0,0,1,0,0)}
// Ein Typ → {w: PW × VH, h: PH, p64}; jeder Bildpunkt ganz deckend oder leer (Halbdeckendes über Leerem fällt weg, wie kleinP64)
function vornHinten(g,i,c,pal,nah){var a=g.appearance||{},T={skin:a.skin||'#d9ac82',hair:a.hair||'#443025',cloth:a.cloth||'#8a6f4a',cloth2:VH_DUNKEL[i%4],style:vhStil(g,i)},
  W=PW*VH,p64=new Uint8Array(W*PH).fill(255),ARTEN=[['steh',0],['steh',1],['steh',2],['sitz',0]];
 for(var b=0;b<VH;b++){var A=ARTEN[b&3];vhBild(c,T,b>=4,A[0],A[1]);var d=c.getImageData(0,0,PW,PH).data;
  for(var y=0;y<PH;y++)for(var x=0;x<PW;x++){var q=(y*PW+x)*4;if(d[q+3]<=96)continue;var key=(d[q]<<16)|(d[q+1]<<8)|d[q+2],n=nah[key];if(n===undefined)n=nah[key]=pal(d[q],d[q+1],d[q+2]);p64[y*W+b*PW+x]=n}}
 return{w:W,h:PH,p64:p64}}
function oben(c){var d=c.getImageData(0,0,NW,NH).data;for(var y=0;y<NH;y++)for(var i=0;i<NW;i++)if(d[(y*NW+i)*4+3]>96)return y;return NH}
// Auftrag {gs:[{pid, g}] oder btypen:[Typ 0–59], bseed (AR2b Zuschauer, pid = Typ), ohneArbeit, vh (AR2c1: dazu vorn/hinten, blaetter[i].vh {w,h,p64}), lasten:true|false, palette:'A'} → {fw,fh,ax,ay,posen,n,blaetter:[{pid,w,h,p64,dy(Int8, je Bild und Richtung),ms}],lasten:{w,h,p64}|null,ms}
function karte(M,S64,w){if(typeof G.OffscreenCanvas!=='function')throw new Error('OffscreenCanvas fehlt');if(!M.renderSimpleFigure)throw new Error('renderSimpleFigure fehlt (arena.js)');
 var t0=G.performance.now(),rng=M.s.rng,nah={},palName=w.palette||S64.PALETTE,pal=function(r,g,b){return S64.naechste(r,g,b,palName)},aus=[],L=null,
  c=new G.OffscreenCanvas(NW,NH).getContext('2d',{willReadFrequently:true}),k=new G.OffscreenCanvas(PW,PH).getContext('2d',{willReadFrequently:true});
 try{if(w.btypen){var T=karte.bt&&karte.bt.seed===(w.bseed>>>0)?karte.bt.g:null;if(!T){T=besucher(M,w.bseed>>>0);karte.bt={seed:w.bseed>>>0,g:T}}      // AR2b: Zuschauer = die 60 Besuchertypen (einmal je Seed gebaut)
   w.gs=w.btypen.filter(function(i){return i>=0&&i<TYPEN}).map(function(i){return{pid:i,g:T[i]}})}
  (w.gs||[]).forEach(function(e){var t=G.performance.now(),g=e.g,W=PW*KN,H=PH*2,p64=new Uint8Array(W*H).fill(255),dy=new Int8Array(KN*2),axt=null;
   if(!g.appearance)try{M.ensureIdentity&&M.ensureIdentity(g)}catch(x){}
   for(var dir=0;dir<2;dir++)KPOSEN.forEach(function(p){if(w.ohneArbeit&&p.id==='arbeiten')return;for(var f=0;f<p.n;f++){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,NW,NH);var ga=g;if(p.id==='arbeiten'){if(!axt)axt=mitAxt(M,g);ga=axt}      // AR2b: ohneArbeit (Zuschauer arbeiten nicht, Bilder bleiben leer)
    try{M.renderSimpleFigure(c,akteur(ga,dir,p.id,f))}catch(x){if(!karte.warn){karte.warn=1;console.warn('einfache Figur',x)}}
    var tp=oben(c);dy[dir*KN+p.ab+f]=tp>=NH?0:Math.round((tp-REF)*PH/NH);kleinP64(k,c,pal,nah,W,(p.ab+f)*PW,dir*PH,p64)}});
   var vh=w.vh?vornHinten(g,e.pid|0,k,pal,nah):null;      // AR2c1: von vorn und hinten (First Person)
   aus.push({pid:e.pid,w:W,h:H,p64:p64,dy:dy,vh:vh,ms:G.performance.now()-t})})
  if(w.lasten){var LW=PW*WAREN.length,LH=PH*2,lp=new Uint8Array(LW*LH).fill(255);
   for(var dir=0;dir<2;dir++)WAREN.forEach(function(wa,i){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,NW,NH);lastWare(c,wa,NAX,REF+9,dir);kleinP64(k,c,pal,nah,LW,i*PW,dir*PH,lp)});
   L={w:LW,h:LH,p64:lp,waren:WAREN}}}finally{M.s.rng=rng}
 return {fw:PW,fh:PH,ax:PAX,ay:PAY,vhN:VH,posen:KPOSEN.map(function(p){return {id:p.id,ab:p.ab,n:p.n}}),n:KN,palette:palName,blaetter:aus,lasten:L,ms:G.performance.now()-t0}}
// ── F1c Nahansicht (Thomas 18.11.2026): beim Heranzoomen auf 2× die volle Figur von 1.0 wie in 2.0 (welt-raster.js spriteOf: M.renderLudusActors, 56 × 72 je Pose,
// gezeigt mit 0,8 = KW .40 × Zoom 2). Hier einmal auf 45 × 58 verkleinert und auf AT3-64 umgerechnet (Thomas: AT3-64), Posen wie auf der Karte (Gehen 8, Stehen 1,
// Arbeiten 4 mit Axt, Lasten je Ware darüber). Ein Blatt-Bildpunkt = ein Bildschirmpunkt bei 2×. Kern: Kampfkern; Auftrag klein halten (nur Figuren im Bild).
var FW=56,FH=72,FX=28,FY=62,NK=.8,QW=Math.round(FW*NK),QH=Math.round(FH*NK),QAX=Math.round(FX*NK),QAY=Math.round(FY*NK),LK=(PH/NH*2)/NK,REFN=16;
function nahAkteur(g,dir,pose,f){var a={g:g,team:0,ammo:0,energy:100,index:0,baseX:0,baseY:0,x:FX,y:FY,a:dir?Math.PI:0,state:'idle',moveSpeed:0,phase:0};
 if(pose==='gehen'){a.state='move';a.moveSpeed=40;a.phase=f/WALK*TAU}
 else if(pose==='arbeiten'){a.state='attack';a.swingKind='overhead';a.swingMax=.44;a.swing=.44*(1-f/4)+.01}
 return a}
function kleinQ(k,c,pal,nah,W,ox,oy,ziel){k.clearRect(0,0,QW,QH);k.imageSmoothingEnabled=true;k.imageSmoothingQuality='high';k.drawImage(c.canvas,0,0,FW,FH,0,0,QW,QH);
 var d=k.getImageData(0,0,QW,QH).data;for(var y=0;y<QH;y++)for(var x=0;x<QW;x++){var i=(y*QW+x)*4;if(d[i+3]<=96)continue;
  var key=(d[i]<<16)|(d[i+1]<<8)|d[i+2],n=nah[key];if(n===undefined)n=nah[key]=pal(d[i],d[i+1],d[i+2]);ziel[(oy+y)*W+ox+x]=n}}
function obenF(c){var d=c.getImageData(0,0,FW,FH).data;for(var y=0;y<FH;y++)for(var i=0;i<FW;i++)if(d[(y*FW+i)*4+3]>96)return y;return FH}
// Auftrag {gs:[{pid, g}], lasten:true|false, palette:'A'} → {nah:true,fw,fh,ax,ay,posen,n,blaetter:[{pid,w,h,p64,dy}],lasten:{w,h,p64}|null,ms}
function nahKarte(M,S64,w){if(typeof G.OffscreenCanvas!=='function')throw new Error('OffscreenCanvas fehlt');if(!M.renderLudusActors)throw new Error('renderLudusActors fehlt (1.0)');
 var t0=G.performance.now(),rng=M.s.rng,nah={},palName=w.palette||S64.PALETTE,pal=function(r,g,b){return S64.naechste(r,g,b,palName)},aus=[],L=null,
  c=new G.OffscreenCanvas(FW,FH).getContext('2d',{willReadFrequently:true}),k=new G.OffscreenCanvas(QW,QH).getContext('2d',{willReadFrequently:true});
 try{(w.gs||[]).forEach(function(e){var t=G.performance.now(),g=e.g,W=QW*KN,H=QH*2,p64=new Uint8Array(W*H).fill(255),dy=new Int8Array(KN*2),axt=null;
   if(!g.appearance)try{M.ensureIdentity&&M.ensureIdentity(g)}catch(x){}
   for(var dir=0;dir<2;dir++)KPOSEN.forEach(function(p){for(var f=0;f<p.n;f++){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,FW,FH);var ga=g;if(p.id==='arbeiten'){if(!axt)axt=mitAxt(M,g);ga=axt}
    try{M.renderLudusActors(c,[nahAkteur(ga,dir,p.id,f)])}catch(x){if(!nahKarte.warn){nahKarte.warn=1;console.warn('volle Figur',x)}}
    c.setTransform(1,0,0,1,0,0);var tp=obenF(c);dy[dir*KN+p.ab+f]=tp>=FH?0:Math.round((tp-REFN)*NK);kleinQ(k,c,pal,nah,W,(p.ab+f)*QW,dir*QH,p64)}});
   aus.push({pid:e.pid,w:W,h:H,p64:p64,dy:dy,ms:G.performance.now()-t})});
  // Lasten in der Größe der Karte (×2), Schulter auf der Bezugslinie REFN der großen Figur; dy schiebt sie je Bild mit dem Kopf
  if(w.lasten){var LW=QW*WAREN.length,LH=QH*2,lp=new Uint8Array(LW*LH).fill(255);
   for(var dir=0;dir<2;dir++)WAREN.forEach(function(wa,i){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,FW,FH);c.setTransform(LK,0,0,LK,FX-NAX*LK,REFN-REF*LK);lastWare(c,wa,NAX,REF+9,dir);
    c.setTransform(1,0,0,1,0,0);kleinQ(k,c,pal,nah,LW,i*QW,dir*QH,lp)});
   L={w:LW,h:LH,p64:lp,waren:WAREN}}}finally{M.s.rng=rng}
 return {nah:true,fw:QW,fh:QH,ax:QAX,ay:QAY,posen:KPOSEN.map(function(p){return {id:p.id,ab:p.ab,n:p.n}}),n:KN,palette:palName,blaetter:aus,lasten:L,ms:G.performance.now()-t0}}
var FB={NW:NW,NH:NH,PW:PW,PH:PH,PAX:PAX,PAY:PAY,POSEN:POSEN,N:N,STAND:STAND,TYPEN:TYPEN,figuren:figuren,besucher:besucher,karte:karte,nahKarte:nahKarte,KPOSEN:KPOSEN,KN:KN,WAREN:WAREN,QW:QW,QH:QH,VH:VH,vornHinten:vornHinten};
if(typeof module!=='undefined'&&module.exports)module.exports=FB;else G.AT3Figurbild=FB;
})(typeof self!=='undefined'?self:globalThis);
