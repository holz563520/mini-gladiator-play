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
var FB={NW:NW,NH:NH,PW:PW,PH:PH,PAX:PAX,PAY:PAY,POSEN:POSEN,N:N,STAND:STAND,TYPEN:TYPEN,figuren:figuren,besucher:besucher};
if(typeof module!=='undefined'&&module.exports)module.exports=FB;else G.AT3Figurbild=FB;
})(typeof self!=='undefined'?self:globalThis);
