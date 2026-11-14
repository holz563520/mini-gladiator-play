'use strict';
// =====================================================================================================================
// VORPLATZ (welt-vorplatz.js) · Arena Theory 2.0, Schritt B0b (Thomas 13.11.2026, AT2_FAHRPLAN.md). Fester Vorplatz der Herausforderer.
// · Liegt fest im Westen vor dem Kämpfertor (W.ANORD.vorplatz in welt-raster.js, Felder T.LUDUS und fest: Gladiatoren dürfen drauf, Besucher nicht,
//   weil dort kein Weg ist). Vom Vorplatz führt der umzäunte Kämpfergang zur Arena; seine Länge hängt von der Ausbaustufe ab (welt-arena.js, felder()).
// · Gepflastert mit Steinrand, alles im Bodenbild der Karte (WeltHook.bodenFeld, B0b-Nacharbeit: keine Zäune), Schilder „Vorplatz“ und „Kämpfergang“.
// · 3 feste Testgruppen (bis B1, dann zufällige Teams mit Kampfwert und Analyse): echte Figuren wie die NPCs (M.renderForgeActors),
//   dazu 3 Käfige mit echten Tieren aus 1.0: Löwe Rex Vetus (M.drawRex, lion.js), Kampfhund (DOG), Kampfhahn (CF, wie im Beastrium).
//   Käfigtüren sind Fallgitter wie das Arenator (M.weltVorplatz.kaefig(i, auf) für B4), bleiben bis dahin zu.
// · Antippen (Gruppe oder Käfig) öffnet ein kleines Fenster im Stil Rattenpergament (ws-papier, ✕ und Esc). Kein Weg in Menüs von 1.0.
// · Leistung: gezeichnet wird nur, was im Ausschnitt liegt; Tiere als kleine Bilder, etwa achtmal je Sekunde neu gemalt.
// · Nicht im Spielstand (alles fest). Notausschalter: 'welt-vorplatz' aus WELT_EXTRA in arena-theory-2.html nehmen.
// · Nur Arena Theory 2.0. 1.0 bleibt unberührt.
// =====================================================================================================================
(()=>{
const M=window.MG,W=window.WeltKarte,H=window.WeltHook,L=window.AT2Sprache,A=M?.weltArena;if(!window.AT2||!M||!W||!H||!A||!W.ANORD?.vorplatz)return;
const S=M.s,O=W.O,TAU=Math.PI*2,t=(k,v)=>L?L.t(k,v):k,pick=a=>a[(Math.random()*a.length)|0];
const VP=W.ANORD.vorplatz,[VX,VY,VW,VH]=VP;
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));const g=c.getContext('2d');g.imageSmoothingEnabled=false;return [c,g];};
const px=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h);};
const hz=(tx,ty)=>W.hz?W.hz(tx,ty):0;
const sicht=(o,v)=>o.x1>v.x0&&o.x0<v.x1&&o.y1>v.y0&&o.y0<v.y1;

// ---------- Pflaster mit Steinrand: liegt im Bodenbild der Karte (B0b-Nacharbeit, Thomas 14.11.2026: keine einzeln gezeichneten Zäune) ----------
// Die Felder von Vorplatz und Kämpfergang werden in W.deko markiert; WeltHook.bodenFeld malt jedes Feld einmal beim Backen der Kachel. Kosten je Bild: 0.
const istVP=k=>{const x=k%W.N-O,y=((k/W.N)|0)-O;return x>=VX&&x<VX+VW&&y>=VY&&y<VY+VH;};
let FELDER=new Set();
function felder(){const T=W.T,F=new Set();for(let y=VY;y<VY+VH;y++)for(let x=VX;x<VX+VW;x++)F.add((y+O)*W.N+x+O);
 for(const [k,ty] of A.felder())if(ty===T.LUDUS&&k%W.N-O>=VX+VW)F.add(k);
 const D=W.deko,alt=FELDER;if(D){for(const k of alt)if(!F.has(k))D[k]=0;for(const k of F)D[k]=1;}FELDER=F;return [...alt,...F];}
const rnd=(k,i)=>{let h=(k*2654435761+i*40503)>>>0;h^=h>>>15;h=Math.imul(h,2246822507)>>>0;return (h>>>8)/16777216;};
const bf0=H.bodenFeld;H.bodenFeld=(g,tx,ty,lod)=>{const k=ty*W.N+tx;if(!FELDER.has(k)||W.feld[k]!==W.T.LUDUS)return bf0?.(g,tx,ty,lod);
 const z=hz(tx+.5,ty+.5),e=[W.iso(tx,ty),W.iso(tx+1,ty),W.iso(tx+1,ty+1),W.iso(tx,ty+1)].map(p=>({x:p.x,y:p.y-z}));
 g.save();g.beginPath();e.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.closePath();g.fillStyle=(tx+ty)%2?'#8c7c62':'#857559';g.fill();g.clip();
 const cx=(e[0].x+e[2].x)/2,cy=(e[0].y+e[2].y)/2;
 for(let i=0;i<7;i++){const x=Math.round(cx+(rnd(k,i)-.5)*44),y=Math.round(cy+(rnd(k,i+9)-.5)*20);g.fillStyle=['#9a8a6c','#7a6a50','#a39276'][(rnd(k,i+20)*3)|0];g.fillRect(x,y,5+((rnd(k,i+30)*5)|0),3);g.fillStyle='#5a4c38';g.fillRect(x,y+3,6,1);}// Steine mit Fuge
 if(rnd(k,50)<.12){g.fillStyle='#6e2418';g.beginPath();g.ellipse(cx+(rnd(k,51)-.5)*20,cy+(rnd(k,52)-.5)*8,4+rnd(k,53)*5,2+rnd(k,54)*2,0,0,TAU);g.fill();}// Blut, das keiner wegwischt
 // Steinrand an Seiten ohne Nachbarn aus Pflaster: Kante e[i]→e[i+1]; oben rechts (ty−1), unten rechts (tx+1), unten links (ty+1), oben links (tx−1)
 const nb=[k-W.N,k+1,k+W.N,k-1];g.lineWidth=3;
 for(let i=0;i<4;i++){if(FELDER.has(nb[i])&&W.feld[nb[i]]===W.T.LUDUS)continue;const a=e[i],b=e[(i+1)%4];g.strokeStyle='#5a4a36';g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
  g.strokeStyle='#b0a084';g.lineWidth=1;g.beginPath();g.moveTo(a.x,a.y-1);g.lineTo(b.x,b.y-1);g.stroke();g.lineWidth=3;}
 g.restore();};
felder();let erst=true;
A.beiStufe(()=>W.neuMalen?.(felder()));
// ---------- Schilder ----------
const SCHILD_VP=A.schild?.(VX+5.6+O,VY+VH+.35+O,()=>[t('vor.name'),t('vor.zeile')]);
const GANG_SCHILD=A.schild?.(VX+VW+.6+O,13.35+O,()=>[t('vor.gang'),t('vor.gangZeile')]);
const SCHILD_KF=A.schild?.(VX+.9+O,VY+2.6+O,()=>[t('vor.schildKaefig'),'']);

// ---------- Testgruppen (bis B1) ----------
const leer={weapon:null,secondary:null,shield:null,armor:{}};
function figur(id,name,h,w){const rng=S.rng,g=M.makeGladiator(0);S.rng=rng;Object.assign(g,{id,name,height:h,weight:w,fame:0,scars:[]});g.equipment={...leer,armor:{}};g.enemyGear={...leer,armor:{}};return g;}
const forge=(c,g,x,y,tt,a)=>{try{M.renderForgeActors(c,[{team:0,a,phase:tt*2,state:'idle',energy:100,ammo:0,moveSpeed:0,bloodMarks:{},noNav:true,forgePose:'',id:g.id,g,x,y}]);}catch(e){}};
// Requisiten neben der Hand (Pixel): Keule mit Nägeln, stumpfe Klinge mit Scharte, Mistgabel
const REQ={keule(c,x,y){px(c,x+11,y-30,3,24,'#5a3a20');px(c,x+10,y-36,5,8,'#7a4a24');px(c,x+9,y-34,1,1,'#c0c0b8');px(c,x+15,y-32,1,1,'#c0c0b8');px(c,x+11,y-37,2,1,'#6e2418');},
 klinge(c,x,y){px(c,x+12,y-38,2,22,'#a8aca8');px(c,x+12,y-30,1,2,'#3a3a3a');px(c,x+10,y-17,6,2,'#8a6418');px(c,x+12,y-15,2,5,'#5a3a20');},
 gabel(c,x,y){px(c,x+12,y-44,2,40,'#7a5a30');px(c,x+9,y-46,8,2,'#8c9296');for(const d of [9,12,15])px(c,x+d,y-52,1,6,'#8c9296');px(c,x+15,y-52,1,2,'#6e2418');}};
const GRUPPEN=[
 {id:'g1',req:'keule',namen:['Brutus Schienbein','Decimus Kiefer','Otho Knackser'],pos:[[39.4,8.3],[40.4,9.0],[38.7,9.5]],gross:[[186,112],[178,98],[182,104]],a:0},
 {id:'g2',req:'klinge',namen:['Aelia','Aemilia'],pos:[[41.3,14.4],[42.2,15.0]],gross:[[166,62],[168,64]],a:Math.PI},
 {id:'g3',req:'gabel',namen:['Gaius'],pos:[[39.6,18.6]],gross:[[172,80]],a:0}];
const FIG=[];for(const G of GRUPPEN)G.pos.forEach(([x,y],i)=>FIG.push({G,i,tx:x+O,ty:y+O,ph:Math.random()*9,g:null}));
// Wie die NPCs (welt-npc.js): 4 Bilder je Figur im Ludus-Maßstab vorgezeichnet, verkleinert auf den Kartenmaßstab (W.KW), dann nur noch Bilder zeichnen
const KW=W.KW,NB=4,TAKT=.5,SW=80,SH=100,AX=40,AY=92;
function bilder(f){if(f.L)return f.L;if(f.fehler>3)return null;try{return bilder_(f);}catch(e){f.fehler=(f.fehler||0)+1;console.warn('Vorplatz-Figur',e);return null;}}
function bilder_(f){const G=f.G;f.g??=figur('welt-vor-'+G.id+'-'+f.i,G.namen[f.i],...G.gross[f.i]);const L=[];
 for(let i=0;i<NB;i++){const [c,g]=mk(SW,SH);g.fillStyle='rgba(15,20,10,.3)';g.fillRect(AX-9,AY-1,18,3);forge(g,f.g,AX,AY,i*TAKT+.3+f.ph,G.a);try{REQ[G.req](g,G.a?AX-24:AX,AY);}catch(e){}
  const w=Math.max(1,Math.round(SW*KW)),h=Math.max(1,Math.round(SH*KW)),k=document.createElement('canvas');k.width=w;k.height=h;const kg=k.getContext('2d',{willReadFrequently:true});kg.imageSmoothingEnabled=true;kg.imageSmoothingQuality='high';kg.drawImage(c,0,0,w,h);
  const im=kg.getImageData(0,0,w,h),d=im.data;for(let j=3;j<d.length;j+=4)d[j]=d[j]>96?255:0;kg.putImageData(im,0,0);const k2=document.createElement('canvas');k2.width=w;k2.height=h;k2.getContext('2d').drawImage(k,0,0);L.push({c,k:k2});}
 return f.L=L;}
const figItems=FIG.map(f=>{const q=W.iso(f.tx,f.ty),z=hz(f.tx,f.ty);return {f,y:q.y,x0:q.x-AX*KW,x1:q.x+(SW-AX)*KW,y0:q.y-z-AY*KW,y1:q.y-z+8*KW,draw(ctx){
 const L=bilder(f);if(!L)return;const b=L[((Math.floor(((W.clock||performance.now()/1000)+f.ph)/TAKT)%NB)+NB)%NB],x=Math.round(q.x),y=Math.round(q.y-z);
 if(W.detail){ctx.imageSmoothingEnabled=true;ctx.drawImage(b.c,x-AX*KW,y-AY*KW,SW*KW,SH*KW);ctx.imageSmoothingEnabled=false;}else ctx.drawImage(b.k,Math.round(x-AX*KW),Math.round(y-AY*KW));}};});

// ---------- Käfige mit echten Tieren aus 1.0 ----------
const KAEFIG=[{art:'loewe',tx:VX+1.5+O,ty:VY+1.2+O},{art:'hund',tx:VX+3.9+O,ty:VY+1.2+O},{art:'hahn',tx:VX+6.3+O,ty:VY+1.2+O}].map(k=>({...k,auf:0,soll:0,ph:Math.random()*9}));
let TIERE=null;
function tiere(){if(TIERE)return TIERE;TIERE={};
 try{const rng=S.rng,g=M.makeGladiator(0,true);S.rng=rng;g.name='Rex Vetus';g.id='welt-vor-rex';g.role='Soldat';g.traits=[];g.enemyGear={...leer,armor:{}};
  const l=M.createCombatActor(g,1,0);Object.assign(l,{rex:true,x:0,y:0,r:30,tissue:{head:160,chest:290,belly:140,front:120,rear:100},wounds:[],blood:100,bleeding:0,trauma:0,velocity:0,heading:Math.PI/2,turn:0,
   evadeUntil:0,scarSeed:0,mode:'stalk',clock:0,cool:1.8,energy:100,pounceCD:1,hitCount:0,bites:0,interruptDamage:0,z:0,deathAt:0,paw:1,grabs:0,interruptions:0,gripKills:0,gripAborts:0,rescuedRisen:0,displayCycle:0,
   a:Math.PI,cute:1,noShadow:true,moveSpeed:0,phase:0});TIERE.loewe=l;}catch(e){console.warn(e);}
 try{TIERE.hahn=window.CF?.createRooster?.({seed:9127,minQuality:2,maxQuality:2});}catch(e){console.warn(e);}
 try{TIERE.hund=window.DOG?.create?.('mastiff',7717);if(TIERE.hund)TIERE.hund.name=t('vor.k.hund');}catch(e){console.warn(e);}return TIERE;}
// Löwe: in ein kleines Bild gemalt, etwa achtmal je Sekunde neu
const BILD={};
function loeweBild(tt){let b=BILD.loewe;if(!b){const [c,g]=mk(180,120);b=BILD.loewe={c,g,last:-1};}
 if(tt-b.last>.12){b.last=tt;const l=tiere().loewe;if(!l)return null;b.g.clearRect(0,0,180,120);const rc=M.rexClock;M.rexClock=tt;const bt=S.battle;
  try{if(bt&&bt.time!=null){const tm=bt.time;bt.time=tt;l.x=90;l.y=100;M.drawRex(b.g,l);bt.time=tm;}else{l.x=90;l.y=100;M.drawRex(b.g,l);}}catch(e){}M.rexClock=rc;}
 return b.c;}
// Hahn wie in welt-gebaeude.js (CF.drawRoosterSide in ein kleines Pixelbild)
function hahnMalen(ctx,R,x,y,face,tt){const CU=window.RoosterCloseup,CF=window.CF;if(!CU?.Sprite||!CF?.drawRoosterSide||!R)return;let b=BILD.hahn;if(!b){b=BILD.hahn={sp:new CU.Sprite(80,70),last:-1};}
 if(tt-b.last>.12){b.last=tt;try{const P=b.sp.begin();P.setT(40,60,1,face,0,0,-14);CF.drawRoosterSide(P,R,{bob:Math.sin(tt*6)*.3,blink:tt%3.4<.12,peck:(tt*.5)%5<.6?1:0},tt*1000);b.sp.commit();}catch(e){}}
 const k=21/(CF.WORLD?.roosterModelUnits||60);ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.imageSmoothingEnabled=false;ctx.scale(k,k);ctx.drawImage(b.sp.cv,-40,-60);ctx.restore();}
// Käfig: Boden aus Brettern, hinten Gitter, Tier, vorne Fallgitter (hebt sich mit auf), Dach. Breite 1,8 × Tiefe 1 Feld.
const KW_=1.8,KT=1,KH=30;
function gitter(ctx,a,b,z,h,lift,col){const n=8;ctx.fillStyle=col;for(let i=0;i<=n;i++){const u=i/n,x=Math.round(a.x+(b.x-a.x)*u),y=Math.round(a.y+(b.y-a.y)*u-z);ctx.fillRect(x,y-h,1,h-lift);}}
// B0b-Nacharbeit: je Käfig 3 vorgezeichnete Bilder (hinten: Boden und Gitter; Tier: alle 0,25 s neu; vorne: Gitter und Dach). Je Bild nur 3 drawImage.
const kaefigItems=KAEFIG.map((K,i)=>{const z=hz(K.tx,K.ty),E=[W.iso(K.tx,K.ty),W.iso(K.tx+KW_,K.ty),W.iso(K.tx+KW_,K.ty+KT),W.iso(K.tx,K.ty+KT)].map(e=>({x:e.x,y:e.y-z}));
 const xs=E.map(e=>e.x),ys=E.map(e=>e.y),bx=Math.floor(Math.min(...xs))-4,by=Math.floor(Math.min(...ys))-KH-8,bw=Math.ceil(Math.max(...xs))+4-bx,bh=Math.ceil(Math.max(...ys))+2-by;
 const [a,b,c,d]=E,m={x:(a.x+c.x)/2,y:(a.y+c.y)/2+2};
 const ebene=f=>{const [cv,g]=mk(bw,bh);g.translate(-bx,-by);f(g);return cv;};
 const hinten=ebene(ctx=>{ctx.fillStyle='#4a3826';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.fill();// Boden
  ctx.fillStyle='#5e4632';for(let j=1;j<4;j++){const u=j/4;ctx.fillRect(Math.round(a.x+(d.x-a.x)*u),Math.round(a.y+(d.y-a.y)*u),Math.round((b.x-a.x)),1);}
  gitter(ctx,a,b,0,KH,0,'#3a3a36');gitter(ctx,a,d,0,KH,0,'#3a3a36');
  if(K.art==='loewe'){px(ctx,m.x+8,m.y-2,6,2,'#e8dcc0');px(ctx,m.x+7,m.y-3,2,1,'#e8dcc0');px(ctx,m.x+13,m.y-3,2,1,'#e8dcc0');}});// abgenagter Knochen
 const vorne=lift=>{const f=ctx=>{gitter(ctx,d,c,0,KH,lift,'#6a6a62');gitter(ctx,b,c,0,KH,0,'#55554f');// vorne: Fallgitter, rechts fest
  ctx.fillStyle='#8a7a5a';for(const [p,q] of [[d,c],[b,c]]){ctx.fillRect(Math.round(Math.min(p.x,q.x)),Math.round(Math.min(p.y,q.y)-KH),Math.round(Math.abs(q.x-p.x))+1,1);}
  ctx.fillStyle='#6b4a2c';ctx.beginPath();ctx.moveTo(a.x,a.y-KH-2);ctx.lineTo(b.x,b.y-KH-2);ctx.lineTo(c.x,c.y-KH-2);ctx.lineTo(d.x,d.y-KH-2);ctx.closePath();ctx.fill();// Dach
  ctx.fillStyle='#4a3020';ctx.fillRect(Math.round(d.x),Math.round(d.y-KH-2),Math.round(c.x-d.x),2);
  if(K.art==='loewe'){ctx.fillStyle='#6e2418';ctx.fillRect(Math.round(c.x-12),Math.round(c.y-6),2,6);}};return f;};// Blut am Gitter
 const VZ=ebene(vorne(0)),[TC,TG]=mk(bw,bh);TG.translate(-bx,-by);let tLast=-9;
 const tier=tt=>{if(tt-tLast<.25&&tt>=tLast)return;tLast=tt;TG.clearRect(bx,by,bw,bh);const T_=tiere();
  try{if(K.art==='loewe'){const bc=loeweBild(tt);if(bc){TG.imageSmoothingEnabled=false;TG.drawImage(bc,Math.round(m.x-27),Math.round(m.y-32),54,36);}}
   else if(K.art==='hund'&&T_.hund)window.DOG?.portrait?.(TG,T_.hund,{x:m.x,y:m.y,w:24+(T_.hund.height||70)*.1,mood:['focus','idle','proud','focus'][Math.floor(tt/4)%4],face:-1,t:tt});
   else if(K.art==='hahn')hahnMalen(TG,T_.hahn,m.x,m.y,Math.floor(tt/4)%4===3?1:-1,tt);}catch(e){}};
 return {K,i,y:Math.max(...ys)+z+.02,x0:bx,x1:bx+bw,y0:by,y1:by+bh,E,draw(ctx){const tt=(W.clock||performance.now()/1000)+K.ph;tier(tt);
  ctx.drawImage(hinten,bx,by);ctx.drawImage(TC,bx,by);if(K.auf>0)vorne(Math.round(K.auf*(KH-3)))(ctx);else ctx.drawImage(VZ,bx,by);}};});

// ---------- Zeichnen ----------
// Zeichnen: nur Figuren, Käfige und Schilder (Pflaster und Rand liegen im Bodenbild)
const items0=H.items;H.items=(items,view)=>{items0?.(items,view);if(W.mini)return;
 for(const s of [SCHILD_VP,GANG_SCHILD,SCHILD_KF])if(s&&sicht(s,view))items.push(s);
 for(const f of figItems)if(sicht(f,view))items.push(f);for(const k of kaefigItems)if(sicht(k,view))items.push(k);};
const tick0=H.tick;H.tick=dt=>{tick0?.(dt);if(erst){erst=false;W.neuMalen?.([...FELDER]);}if(!(dt>0))return;for(const K of KAEFIG)if(K.auf!==K.soll)K.auf=K.soll>K.auf?Math.min(1,K.auf+dt/1.8):Math.max(0,K.auf-dt/1.8);};

// ---------- Fenster „Herausforderer“ (Rattenpergament) ----------
const st=document.createElement('style');st.textContent=
 '#wVorplatz{position:fixed;right:10px;top:64px;z-index:58;width:min(320px,calc(100% - 20px));padding:14px 16px 12px;font-size:16px}#wVorplatz[hidden]{display:none}'+
 '#wVorplatz header{display:flex;align-items:center;gap:8px}#wVorplatz header h3{flex:1;margin:0;font-size:23px;line-height:1.05}'+
 '#wVorplatz .vp-art{margin:8px 0 4px;font-size:17px}#wVorplatz .vp-wer{margin:0 0 8px;font-size:16px;line-height:1.25}'+
 '#wVorplatz .vp-spruch{margin:6px 0 8px;font-size:17px;line-height:1.25}#wVorplatz .vp-bald{margin:6px 0 0;font-size:15px;line-height:1.25}';
document.head.appendChild(st);
const el=document.createElement('div');el.id='wVorplatz';el.className='ws-papier';el.hidden=true;el.setAttribute('role','dialog');
el.innerHTML='<header><i class="ws-i" data-i="herausforderer"></i><h3></h3><button class="w-x" data-x>✕</button></header><div class="vp-art"></div><div class="vp-wer"></div><div class="vp-spruch"></div><div class="vp-bald"></div>';
document.body.appendChild(el);
let offen=null;
const ikon=(i,n)=>{i.dataset.i=n;if(window.AT2_IKON)i.style.backgroundImage=AT2_IKON.bild(n);};
function fuellen(){if(!offen)return;const o=offen,ik=el.querySelector('header .ws-i');el.querySelector('header .w-x').setAttribute('aria-label',t('vor.schliessen'));
 if(o.G){const G=o.G,n=G.namen.length;ikon(ik,'herausforderer');el.querySelector('h3').textContent=t('vor.'+G.id);el.querySelector('.vp-art').textContent=t('vor.'+G.id+'art');
  el.querySelector('.vp-wer').textContent=(n===1?t('vor.einer'):t('vor.mitglieder',{n}))+': '+t('vor.'+G.id+'.n');el.querySelector('.vp-spruch').textContent='„'+t('vor.'+G.id+'.'+o.s)+'“';}
 else{const K=o.K;ikon(ik,'kaefig');el.querySelector('h3').textContent=t('vor.k.'+K.art);el.querySelector('.vp-art').textContent=t('vor.k.'+K.art+'Art');
  el.querySelector('.vp-wer').textContent=t('vor.tierArt');el.querySelector('.vp-spruch').textContent='„'+t('vor.k.'+K.art+'.'+o.s)+'“';}
 el.setAttribute('aria-label',el.querySelector('h3').textContent);el.querySelector('.vp-bald').textContent=t('vor.bald');}
function auf(o){offen={...o,s:1+((Math.random()*2)|0)};el.hidden=false;fuellen();window.AT2_STIL?.neuMalen?.(el);}
function zu(){if(el.hidden)return;el.hidden=true;offen=null;}
el.addEventListener('click',e=>{if(e.target.closest('[data-x]'))zu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!el.hidden)zu();});
L?.beiWechsel?.(()=>fuellen());
// Antippen: Figuren (wie die NPCs) und Käfige
const tap0=H.tap;H.tap=(p,w)=>{if(w||M.weltBau?.mode||W.mini)return tap0?tap0(p,w):false;const k=Math.max(1,1.4/W.cam.s);
 for(const f of figItems){const q=W.iso(f.f.tx,f.f.ty),oz=hz(f.f.tx,f.f.ty),ex=Math.abs(q.x-p.x),ey=q.y-oz-p.y;if(ex<7*k&&ey>-2*k&&ey<26*k){auf({G:f.f.G});return true;}}
 for(const K of kaefigItems)if(p.x>K.x0&&p.x<K.x1&&p.y>K.y0&&p.y<K.y1){auf({K:K.K});return true;}
 return tap0?tap0(p,w):false;};

M.weltVorplatz={gruppen:()=>GRUPPEN,kaefige:()=>KAEFIG,kaefig:(i,auf)=>{const K=KAEFIG[i];if(K)K.soll=auf?1:0;},oeffnen:auf,schliessen:zu,offen:()=>!el.hidden,inhalt:()=>offen,
 figuren:()=>FIG,felder:()=>FELDER,lage:VP};
})();
