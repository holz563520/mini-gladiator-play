'use strict';
// =====================================================================================================================
// RASTERKARTE (welt-raster.js) · Große Karte in schrägen Quadraten wie bei RollerCoaster Tycoon. Wunsch Thomas 11.11.2026.
// Nur auf tageslauf-editor.html geladen (WELT_KARTE in weltkarte-boot.js), nicht im Spiel. Nichts wird gespeichert.
//
// · Karte: N × N Felder, jedes Feld eine Raute 64 × 32. feld[ty*N+tx] sagt, was dort liegt (Wiese, Wald, Weg, Fluss,
//   Brücke, Ludus-Boden, Gebäude, Übungsplatz). Darauf wird später gebaut.
// · Inhalt jetzt, mehr nicht: Wald links, ein Fluss, ein Weg über die ganze Karte, in der Mitte der Ludus mit den für
//   die Einführungen wichtigen Gebäuden als Skizze (Kästen mit Namen): Kaserne, Trainingshof, Schmiede, Medicus,
//   Sklavenmarkt, Arena-Tor, Hall of the Fallen, Beastrium.
// · Einführungen: Die Gebäude liegen wie im alten Ludus (900 × 760), ein Feld = 50 alte Bildpunkte. vonLudus(x,y)
//   rechnet jede alte Ludus-Koordinate auf die Karte um; damit lassen sich die Intros später hierher verlegen.
// · Gladiatoren schlendern nur im Ludus herum (noch kein Tagesablauf). Uhr, Licht, Antippen und Pinzette hängen über
//   window.WeltHook an (welt-zeit.js, welt-leben.js).
// · Leistung: Felder sind fertige Bildchen; weit herausgezoomt wird eine einmal gezeichnete Übersicht kopiert und die
//   Figuren werden zu Miniaturen aus zwei Rechtecken.
// =====================================================================================================================
(()=>{
const H=window.WeltHook=window.WeltHook||{};
const M=window.MG,S=M.s,$=id=>document.getElementById(id);
// Test-Ludus: alle Einführungen gelten als gesehen
S.started=true;S.schoolName='Ludus Probatus';
S.lanista={name:'Lanista',height:180,weight:85,veteran:true,appearance:{skin:'#d9ac82',shade:'#9c7353',hair:'#443025',style:1,beard:2,cloth:'#435e6a'}};
try{const W=M.workshop;if(!W.state.master)W.hireMaster(W.sketch());W.state.intro='done';}catch(e){}
try{M.trader.state.intro='done';}catch(e){}
if(S.hall)S.hall.tut='done';else S.hall={tut:'done',recruit:null,tag:{}};
S.lion={stage:'done',recruits:[],base:[]};S.medic=Object.assign(S.medic||{},{stage:'skip'});S.archerPlot={seen:0,asked:true,state:'declined'};
S.wanderers={version:1,next:(S.day||1)+99999,group:null,known:[]};

// ---------- Raster ----------
const N=96,TW=64,TH=32,OX=N*TW/2,OY=140,WW=N*TW,WH=N*TH+OY+60,TAU=Math.PI*2,clamp=(v,a,b)=>v<a?a:v>b?b:v;
const iso=(tx,ty)=>({x:(tx-ty)*TW/2+OX,y:(tx+ty)*TH/2+OY});// obere Ecke des Feldes; Mitte: iso(tx+.5,ty+.5)
const tileAt=(x,y)=>{const a=(x-OX)/(TW/2),b=(y-OY)/(TH/2);return {tx:(a+b)/2,ty:(b-a)/2};};
function hash(n){n=Math.imul(n^0x9e3779b9,0x85ebca6b);n^=n>>>13;n=Math.imul(n,0xc2b2ae35);n^=n>>>16;return (n>>>0)/4294967296;}
const h2=(x,y,s=0)=>hash(x*374761393+y*668265263+s*1442695);
const T={WIESE:0,WALD:1,WEG:2,FLUSS:3,BRUECKE:4,LUDUS:5,BAU:6,PLATZ:7},NAMEN=['Wiese','Wald','Weg','Fluss','Brücke','Ludus','Gebäude','Übungsplatz'];
const feld=new Uint8Array(N*N),bauAuf=new Int8Array(N*N).fill(-1),ix=(tx,ty)=>ty*N+tx,inMap=(tx,ty)=>tx>=0&&ty>=0&&tx<N&&ty<N;
// Ludus in der Mitte: 18 × 16 Felder, ein Feld = 50 Bildpunkte des alten Ludus (900 × 760)
const LUD={tx:39,ty:40,w:18,h:16,px:50};
const vonLudus=(x,y)=>iso(LUD.tx+x/LUD.px,LUD.ty+y/LUD.px);
// Gebäude der Einführungen, Lage aus dem alten Ludus (ludus.js places, hs-art.js BEASTRIUM), auf ganze Felder gelegt
const BAU=[
 {id:'kaserne',name:'KASERNE',l:[45,50,235,133],hoch:44,wand:'#b9a27c',dach:'#a5553c'},
 {id:'hall',name:'HALL',l:[50,206,112,70],hoch:36,wand:'#8d8a80',dach:'#5d5a54'},
 {id:'markt',name:'SKLAVENMARKT',l:[45,280,230,118],hoch:26,wand:'#a98458',dach:'#c9b27a'},
 {id:'medicus',name:'MEDICUS',l:[34,447,250,163],hoch:40,wand:'#d2cbb8',dach:'#7e8a8c'},
 {id:'arena',name:'ARENA-TOR',l:[351,51,226,120],hoch:54,wand:'#c2b08a',dach:'#8d7a58'},
 {id:'platz',name:'TRAININGSHOF',l:[310,247,275,343],hoch:0,wand:'#7a5a39',dach:'#d9c391',flach:true},
 {id:'schmiede',name:'SCHMIEDE',l:[638,86,215,150],hoch:42,wand:'#7d7468',dach:'#4b4640'},
 {id:'beastrium',name:'BEASTRIUM',l:[652,298,196,126],hoch:40,wand:'#96795a',dach:'#6b4a2c'}
];
for(const [i,b] of BAU.entries()){b.tx=LUD.tx+Math.round(b.l[0]/LUD.px);b.ty=LUD.ty+Math.round(b.l[1]/LUD.px);b.w=Math.max(1,Math.round(b.l[2]/LUD.px));b.h=Math.max(1,Math.round(b.l[3]/LUD.px));b.i=i;}
// Gelände: Wald links (linke Ecke der Raute), Fluss rechts vom Ludus, ein Weg über die ganze Karte vor dem Ludus
const flussX=ty=>72+Math.round(3*Math.sin(ty/9)+2*Math.sin(ty/4.3)),WEG_TY=58;
for(let ty=0;ty<N;ty++)for(let tx=0;tx<N;tx++){let t=T.WIESE;
 if(ty-tx>30+h2(tx>>2,ty>>2,5)*9)t=T.WALD;
 if(Math.abs(tx-flussX(ty))<=1)t=T.FLUSS;
 if(ty===WEG_TY||ty===WEG_TY+1)t=t===T.FLUSS?T.BRUECKE:T.WEG;
 if(tx>=LUD.tx&&tx<LUD.tx+LUD.w&&ty>=LUD.ty&&ty<LUD.ty+LUD.h)t=T.LUDUS;
 feld[ix(tx,ty)]=t;}
for(const b of BAU)for(let y=b.ty;y<b.ty+b.h;y++)for(let x=b.tx;x<b.tx+b.w;x++){feld[ix(x,y)]=b.flach?T.PLATZ:T.BAU;bauAuf[ix(x,y)]=b.i;}
// Bäume: im Wald, nicht direkt am Weg
const baum=new Int8Array(N*N).fill(-1);
for(let ty=0;ty<N;ty++)for(let tx=0;tx<N;tx++)if(feld[ix(tx,ty)]===T.WALD&&Math.abs(ty-WEG_TY-.5)>1.6&&h2(tx,ty,9)<.72)baum[ix(tx,ty)]=Math.floor(h2(tx,ty,11)*3);

// ---------- Bildchen: Felder und Bäume ----------
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.imageSmoothingEnabled=false;return [c,g];}
const PAL=[
 [[86,114,60],[94,122,66],[78,104,55],[101,128,70]],// Wiese
 [[58,82,46],[64,90,50],[52,74,42],[70,96,54]],// Waldboden
 [[176,150,104],[188,162,114],[164,138,94],[198,174,128]],// Weg
 [[52,104,150],[60,116,162],[46,94,138],[86,142,182]],// Fluss
 [[122,90,57],[108,78,48],[134,100,64],[96,70,43]],// Brücke
 [[160,136,100],[168,144,106],[152,128,94],[174,150,112]],// Ludus-Boden
 [[112,106,96],[120,114,104],[104,98,90],[126,120,110]],// Gebäudefläche
 [[214,194,146],[222,202,154],[206,186,138],[226,208,162]]// Übungsplatz
];
const VAR=3,sprites=[[],[]];// [ohne Raster, mit Raster][typ*VAR+v]
function tileSprite(t,v,grid){const [c,g]=mkCanvas(TW,TH+1),img=g.createImageData(TW,TH+1),d=img.data,P=PAL[t];
 for(let y=0;y<=TH;y++)for(let x=0;x<TW;x++){const e=Math.abs(x-31.5)/32+Math.abs(y-16)/16;if(e>1.001)continue;let n=h2(x>>1,y,t*17+v*5),col=P[n<.5?0:n<.72?1:n<.9?2:3];
  if(t===T.BRUECKE&&((x+y*2)>>2)%3===0)col=P[3];if(t===T.FLUSS&&((x+y*3+v*7)%23)<3&&n>.4)col=P[3];
  let k=1;if(grid&&e>.93)k=y>16?.8:.9;const o=(y*TW+x)*4;d[o]=col[0]*k;d[o+1]=col[1]*k;d[o+2]=col[2]*k;d[o+3]=255;}
 g.putImageData(img,0,0);return c;}
for(let gr=0;gr<2;gr++)for(let t=0;t<PAL.length;t++)for(let v=0;v<VAR;v++)sprites[gr][t*VAR+v]=tileSprite(t,v,!!gr);
const TREE=[];
for(let v=0;v<3;v++){const [c,g]=mkCanvas(44,70),R=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
 g.fillStyle='rgba(15,20,10,.28)';g.beginPath();g.ellipse(22,64,15,5,0,0,TAU);g.fill();R(20,48,4,17,'#5a4027');R(22,48,2,17,'#6e5133');
 if(v<2){const cols=v?['#2f5a36','#3c6e40','#4c8249']:['#27503a','#33623f','#42764a'];for(let k=0;k<4;k++){const w=34-k*7,y=40-k*11;for(let r=0;r<13;r++){const ww=Math.max(2,Math.round(w*(r+2)/14));R(22-(ww>>1),y+r,ww,1,cols[r>9?0:r>4?1:2]);}}}
 else{const cols=['#3f6b34','#4e8040','#62984c'];for(const [x,y,r] of [[22,30,15],[13,38,10],[31,37,11],[22,20,10]])for(let yy=-r;yy<=r;yy++){const ww=Math.round(Math.sqrt(r*r-yy*yy));R(x-ww,y+yy,ww*2,1,cols[yy>r*.4?0:yy>-r*.3?1:2]);}}
 TREE.push(c);}

// ---------- Übersicht (einmal gezeichnet, für die weite Ansicht) ----------
const OV=2;let overview=null,raster=true;
function bake(){const [c,g]=mkCanvas(Math.ceil(WW/OV),Math.ceil(WH/OV));g.imageSmoothingEnabled=true;g.fillStyle='#1c2416';g.fillRect(0,0,c.width,c.height);g.scale(1/OV,1/OV);const sp=sprites[raster?1:0];
 for(let ty=0;ty<N;ty++)for(let tx=0;tx<N;tx++){const p=iso(tx,ty);g.drawImage(sp[feld[ix(tx,ty)]*VAR+Math.floor(h2(tx,ty,3)*VAR)],p.x-TW/2,p.y);}
 for(let v=0;v<2*N;v++)for(let tx=Math.max(0,v-N+1);tx<=Math.min(N-1,v);tx++){const ty=v-tx,b=baum[ix(tx,ty)];if(b>=0){const p=iso(tx+.5,ty+.5);g.drawImage(TREE[b],p.x-22,p.y-64);}}
 overview=c;}

// ---------- Gebäude als Skizze ----------
function shade(hex,k){const n=parseInt(hex.slice(1),16);return 'rgb('+[n>>16,(n>>8)&255,n&255].map(v=>Math.round(clamp(v*k,0,255))).join(',')+')';}
function poly(g,pts,fill){g.beginPath();g.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);g.closePath();g.fillStyle=fill;g.fill();g.stroke();}
function drawBau(g,b){const A=iso(b.tx,b.ty),B=iso(b.tx+b.w,b.ty),C=iso(b.tx+b.w,b.ty+b.h),D=iso(b.tx,b.ty+b.h),up=p=>({x:p.x,y:p.y-b.hoch}),mid={x:(A.x+C.x)/2,y:(A.y+C.y)/2-b.hoch};
 g.lineWidth=1.5;g.strokeStyle='#20140c';g.lineJoin='round';
 if(b.flach){g.setLineDash([6,4]);g.strokeStyle=b.wand;g.lineWidth=2.5;g.beginPath();g.moveTo(A.x,A.y);g.lineTo(B.x,B.y);g.lineTo(C.x,C.y);g.lineTo(D.x,D.y);g.closePath();g.stroke();g.setLineDash([]);}
 else{poly(g,[D,C,up(C),up(D)],shade(b.wand,.72));poly(g,[C,B,up(B),up(C)],b.wand);poly(g,[up(A),up(B),up(C),up(D)],b.dach);}
 g.font='bold 12px ui-monospace,Menlo,Consolas,monospace';g.textAlign='center';g.textBaseline='middle';const w=g.measureText(b.name).width+10;
 g.fillStyle='rgba(18,12,9,.8)';g.fillRect(Math.round(mid.x-w/2),Math.round(mid.y-9),Math.round(w),18);g.fillStyle='#f4d37a';g.fillText(b.name,Math.round(mid.x),Math.round(mid.y)+1);}
for(const b of BAU){const C=iso(b.tx+b.w,b.ty+b.h);b.key=b.flach?iso(b.tx,b.ty).y:C.y;}
// Reihenfolge der Gebäude untereinander: Wer ganz hinter einem anderen liegt, wird vor ihm gezeichnet
for(let pass=0;pass<BAU.length;pass++)for(const b of BAU)for(const a of BAU)if(a!==b&&!a.flach&&!b.flach&&(a.tx+a.w<=b.tx||a.ty+a.h<=b.ty)&&!(b.tx+b.w<=a.tx||b.ty+b.h<=a.ty)&&b.key<=a.key)b.key=a.key+.02;

// ---------- Gladiatoren: schlendern im Ludus ----------
const SPEED=34,FW=56,FH=72,FX=28,FY=62,WALK=6,figs=new Map();let spriteBudget=0,workers=[];
function spriteOf(g){let s=figs.get(g.id);if(s)return s;if(spriteBudget<=0)return null;spriteBudget--;
 const [c,ctx]=mkCanvas(FW*(WALK+2),FH*2);const base={g,team:0,ammo:0,a:0,energy:100,index:0,baseX:0,baseY:0};
 try{for(let dir=0;dir<2;dir++){for(let f=0;f<WALK;f++){ctx.save();ctx.translate(f*FW,dir*FH);M.renderLudusActors(ctx,[{...base,x:FX,y:FY,a:dir?Math.PI:0,state:'move',moveSpeed:40,phase:f/WALK*TAU}]);ctx.restore();}
  for(let f=0;f<2;f++){ctx.save();ctx.translate((WALK+f)*FW,dir*FH);M.renderLudusActors(ctx,[{...base,x:FX,y:FY,a:dir?Math.PI:0,state:'idle',moveSpeed:0,phase:f*1.3}]);ctx.restore();}}}catch(e){console.warn(e);}
 s={c};figs.set(g.id,s);return s;}
const frei=(tx,ty)=>{tx=Math.floor(tx);ty=Math.floor(ty);if(!inMap(tx,ty))return false;const t=feld[ix(tx,ty)];return t!==T.BAU&&t!==T.FLUSS;};
const imLudus=(tx,ty)=>tx>=LUD.tx&&tx<LUD.tx+LUD.w&&ty>=LUD.ty&&ty<LUD.ty+LUD.h;
function makeRoster(n){const keep=S.roster.filter(g=>!g.dead);let list=keep.slice(0,n);const rng=S.rng;while(list.length<n){const g=M.makeGladiator(0);g.fatigue=0;list.push(g);}S.rng=rng;
 S.roster=list;try{M.army?.autoClasses?.(list);}catch(e){}figs.clear();
 workers=list.map((g,i)=>{let tx,ty,k=0;do{tx=LUD.tx+h2(i,k,21)*LUD.w;ty=LUD.ty+h2(i,k,22)*LUD.h;k++;}while(!frei(tx,ty)&&k<40);const p=iso(tx,ty);return {g,x:p.x,y:p.y,seed:h2(i,7,23)*1000,wait:h2(i,3,24)*8,goal:null,dir:0,walk:false};});}
function wander(w,dt){if(w.wait>0){w.wait-=dt;w.walk=false;return;}
 if(!w.goal){const c=tileAt(w.x,w.y),home=imLudus(c.tx,c.ty);for(let k=0;k<6&&!w.goal;k++){const tx=c.tx+(Math.random()-.5)*9,ty=c.ty+(Math.random()-.5)*9;if(!frei(tx,ty)||(home&&!imLudus(tx,ty)))continue;
   let ok=true;for(let s=1;s<8&&ok;s++)ok=frei(c.tx+(tx-c.tx)*s/8,c.ty+(ty-c.ty)*s/8);if(ok)w.goal=iso(tx,ty);}
  if(!w.goal){w.wait=1;return;}}
 const dx=w.goal.x-w.x,dy=w.goal.y-w.y,d=Math.hypot(dx,dy),step=SPEED*dt;w.walk=true;if(Math.abs(dx)>1)w.dir=dx<0?1:0;
 if(d<=step){w.x=w.goal.x;w.y=w.goal.y;w.goal=null;w.wait=2+Math.random()*9;w.walk=false;return;}w.x+=dx/d*step;w.y+=dy/d*step;}
function pose0(w){return {x:w.x,y:w.y,dx:w.dir?-1:1,dy:0,state:w.walk?'schlendert durch den Ludus':'steht herum',work:false,top:!w.walk};}
function pose(w){const ps=pose0(w);return H.pose?H.pose(w,ps,clock):ps;}
function place(g,x,y){const w=workers.find(w=>w.g.id===g.id);if(!w)return;w.x=x;w.y=y;w.goal=null;w.wait=2.5;w.walk=false;}

// ---------- Ansicht, Kamera, Bedienung ----------
const cv=$('weltCanvas'),ctx=cv.getContext('2d');let VW=1,VH=1,DPR=1;
const L0=iso(LUD.tx+LUD.w/2,LUD.ty+LUD.h/2),cam={x:L0.x,y:L0.y,s:1};
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);VW=cv.clientWidth||innerWidth;VH=cv.clientHeight||innerHeight;cv.width=Math.round(VW*DPR);cv.height=Math.round(VH*DPR);clampCam();}
const minScale=()=>Math.min(VW/WW,VH/WH)*.95,maxScale=()=>3.2;
function clampCam(){cam.s=clamp(cam.s,minScale(),maxScale());cam.x=clamp(cam.x,0,WW);cam.y=clamp(cam.y,0,WH);}
const toWorld=(sx,sy)=>({x:cam.x+(sx-VW/2)/cam.s,y:cam.y+(sy-VH/2)/cam.s});
function zoomAt(sx,sy,f){const a=toWorld(sx,sy);cam.s=clamp(cam.s*f,minScale(),maxScale());const b=toWorld(sx,sy);cam.x+=a.x-b.x;cam.y+=a.y-b.y;clampCam();}
let fly=null;function flyTo(x,y,s){fly={x0:cam.x,y0:cam.y,s0:cam.s,x,y,s:s??Math.max(cam.s,1.2),t:0};}
const ptrs=new Map();let dragMoved=0,pinch=null,lastTap=0;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});dragMoved=0;fly=null;if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),s:cam.s};}});
cv.addEventListener('pointermove',e=>{const p=ptrs.get(e.pointerId);if(!p)return;const r=cv.getBoundingClientRect();
 if(ptrs.size===2&&pinch){p.x=e.clientX;p.y=e.clientY;const [a,b]=[...ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y),mx=(a.x+b.x)/2-r.left,my=(a.y+b.y)/2-r.top;zoomAt(mx,my,(pinch.s*d/pinch.d)/cam.s);dragMoved=99;return;}
 const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;dragMoved+=Math.abs(dx)+Math.abs(dy);cam.x-=dx/cam.s;cam.y-=dy/cam.s;clampCam();});
const up=e=>{const was=ptrs.has(e.pointerId);ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;if(was&&ptrs.size===0&&dragMoved<8&&e.type==='pointerup'){const r=cv.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top,now=performance.now();
 if(now-lastTap<300){zoomAt(sx,sy,1.6);lastTap=0;return;}lastTap=now;tap(toWorld(sx,sy));}};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('wheel',e=>{e.preventDefault();const r=cv.getBoundingClientRect();zoomAt(e.clientX-r.left,e.clientY-r.top,Math.exp(-e.deltaY*.0016));},{passive:false});
addEventListener('resize',resize);
let shown=[];
function tap(p){const k=miniV?2:1,hit=[...shown].reverse().find(s=>p.x>s.x-12*k&&p.x<s.x+12*k&&p.y>s.y-40&&p.y<s.y+6*k);H.tap?.(p,hit?.w);}

// ---------- Leiste ----------
const ui=document.createElement('div');ui.id='weltUi';ui.innerHTML=`
<header class="w-bar"><div class="w-title"><b>RASTERKARTE</b><small>Testversion · nichts wird gespeichert</small></div>
<div class="w-chips"><span class="w-chip" id="wCount"></span><span class="w-chip" id="wClock"></span></div>
<div class="w-perf" title="Bildzeit"><i id="wPerfBar"></i><span id="wPerf"></span></div>
<label class="w-sel w-kader"><span class="w-lab">Testkader</span><select id="wKader" title="Größe des Testkaders">${[12,60,200,500].map(n=>`<option value="${n}"${n===60?' selected':''}>${n} Gladiatoren</option>`).join('')}</select></label></header>
<button id="wBack" class="w-btn w-back" hidden>◀ Zur Karte</button>`;
$('welt').appendChild(ui);document.body.appendChild($('wBack'));
$('wKader').onchange=e=>makeRoster(+e.target.value);
$('wBack').onclick=()=>{try{M.ui.close?.();}catch(e){}M.ui.click('nav:home');};
setInterval(()=>{const page=M.ui.getPage?.(),modal=$('modal')&&!$('modal').hidden,admin=(page&&page!=='home')||modal||!!S.battle;document.body.classList.toggle('w-admin',!!admin);$('wBack').hidden=!admin||modal;},200);

// ---------- Zeichnen ----------
const MINI=.5,FERN=.6;let clock=0,last=performance.now(),perfAvg=4,perfWin=[],hudT=0,miniV=false;
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.1,(now-last)/1000);last=now;if(document.hidden||document.body.classList.contains('w-admin'))return;
 const t0=performance.now();clock+=dt;H.tick?.(dt);for(const w of workers)wander(w,dt);
 if(fly){fly.t=Math.min(1,fly.t+dt*2.2);const e=1-Math.pow(1-fly.t,3);cam.x=fly.x0+(fly.x-fly.x0)*e;cam.y=fly.y0+(fly.y-fly.y0)*e;cam.s=fly.s0+(fly.s-fly.s0)*e;clampCam();if(fly.t>=1)fly=null;}
 ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#1c2416';ctx.fillRect(0,0,VW,VH);
 const view={x0:cam.x-VW/2/cam.s,y0:cam.y-VH/2/cam.s,x1:cam.x+VW/2/cam.s,y1:cam.y+VH/2/cam.s};
 ctx.setTransform(DPR*cam.s,0,0,DPR*cam.s,DPR*(VW/2-cam.x*cam.s),DPR*(VH/2-cam.y*cam.s));
 const items=[];miniV=cam.s<MINI;
 if(cam.s<FERN){ctx.imageSmoothingEnabled=true;ctx.drawImage(overview,0,0,overview.width*OV,overview.height*OV);ctx.imageSmoothingEnabled=false;}
 else{// sichtbare Felder: u = tx − ty (waagerecht), v = tx + ty (senkrecht)
  const sp=sprites[raster?1:0],u0=Math.floor((view.x0-OX)/(TW/2))-1,u1=Math.ceil((view.x1-OX)/(TW/2))+1,v0=Math.max(0,Math.floor((view.y0-OY)/(TH/2))-2),v1=Math.min(2*N-2,Math.ceil((view.y1-OY)/(TH/2))+5);
  for(let v=v0;v<=v1;v++)for(let u=u0+((u0+v)&1);u<=u1;u+=2){const tx=(u+v)>>1,ty=(v-u)>>1;if(tx<0||ty<0||tx>=N||ty>=N)continue;const i=ix(tx,ty),x=(tx-ty)*TW/2+OX,y=v*TH/2+OY;
   ctx.drawImage(sp[feld[i]*VAR+Math.floor(h2(tx,ty,3)*VAR)],x-TW/2,y);if(baum[i]>=0)items.push({y:y+TH/2,tree:baum[i],x});}}
 for(const b of BAU)items.push({y:b.key,bau:b});
 // Figuren; wer vor einem Gebäude steht, wird nach ihm gezeichnet
 shown=[];spriteBudget=Math.max(2,Math.round(12-perfAvg));
 for(const w of workers){const ps=pose(w);if(ps.x==null||ps.x<view.x0-40||ps.x>view.x1+40||ps.y<view.y0-20||ps.y>view.y1+80)continue;let y=ps.y;const c=tileAt(ps.x,ps.y);
  for(const b of BAU)if(!b.flach&&y<=b.key&&(c.tx>=b.tx+b.w||c.ty>=b.ty+b.h)&&c.tx>b.tx-2&&c.ty>b.ty-2)y=b.key+.01;items.push({y,w,ps});}
 items.sort((a,b)=>a.y-b.y);
 for(const it of items){if(it.tree!=null){ctx.drawImage(TREE[it.tree],it.x-22,it.y-64);continue;}if(it.bau){drawBau(ctx,it.bau);continue;}
  const {w,ps}=it,x=Math.round(ps.x),y=Math.round(ps.y);
  if(miniV){const a=w.g.appearance||{},b=w.walk&&((clock*4+w.seed)|0)%2?2:0;ctx.fillStyle='rgba(15,20,10,.35)';ctx.fillRect(x-5,y-1,10,3);ctx.fillStyle=a.cloth||'#7a6448';ctx.fillRect(x-4,y-13-b,8,12);ctx.fillStyle=a.skin||'#d9ac82';ctx.fillRect(x-3,y-19-b,6,6);shown.push({w,x,y});continue;}
  const sp=spriteOf(w.g),dir=(ps.dx??1)<0?1:0;ctx.fillStyle='rgba(15,20,10,.3)';ctx.fillRect(x-8,y-1,16,3);
  if(sp){const f=!ps.top?Math.floor((clock*SPEED/7+w.seed)%WALK):WALK;ctx.drawImage(sp.c,f*FW,dir*FH,FW,FH,x-FX,y-FY,FW,FH);}else{ctx.fillStyle='#7a6448';ctx.fillRect(x-4,y-26,8,22);ctx.fillStyle='#d9ac82';ctx.fillRect(x-3,y-32,6,6);}
  shown.push({w,x,y});}
 if(H.light){ctx.setTransform(DPR,0,0,DPR,0,0);H.light(ctx,VW,VH);ctx.setTransform(DPR*cam.s,0,0,DPR*cam.s,DPR*(VW/2-cam.x*cam.s),DPR*(VH/2-cam.y*cam.s));}
 H.world?.(ctx,view,dt);
 ctx.setTransform(1,0,0,1,0,0);
 const ms=performance.now()-t0;perfWin.push(ms);if(perfWin.length>30)perfWin.shift();perfAvg=perfWin.reduce((a,b)=>a+b,0)/perfWin.length;
 hudT+=dt;if(hudT>1){hudT=0;$('wCount').textContent=`${workers.length} Leute · ${shown.length} im Bild`;$('wClock').textContent=`Zoom ${cam.s.toFixed(2)}×${miniV?' · Miniaturansicht':''}`;
  const bar=$('wPerfBar');bar.style.width=Math.round(clamp(perfAvg/16.7,0,1)*100)+'%';bar.style.background=perfAvg<8?'#6fae5a':perfAvg<13?'#d7b24a':'#c9483e';$('wPerf').textContent=perfAvg.toFixed(1)+' ms je Bild';}}

// ---------- Start ----------
try{window.ArenaUI?.close?.();}catch(e){}M.ui.click('nav:home');
bake();makeRoster(60);resize();cam.s=clamp(Math.min(VW/1500,VH/1000)*1.1,minScale(),maxScale());clampCam();
$('weltBoot')?.remove();last=performance.now();requestAnimationFrame(frame);
const lamps=BAU.filter(b=>!b.flach).map(b=>{const p=iso(b.tx+b.w/2,b.ty+b.h+.3);return {x:p.x,y:p.y,r:120};});
window.WeltKarte={cam,sprites:figs,workers:()=>workers,shown:()=>shown,flyTo,pose,pose0,place,toWorld,spriteOf,FW,FH,FX,FY,WALK,SPEED,WW,WH,canvas:cv,lamps,
 N,TW,TH,T,NAMEN,feld,bauAuf,BAU,LUD,iso,tileAt,vonLudus,makeRoster,closeInfo(){},
 raster(on){raster=!!on;bake();},get vw(){return VW;},get vh(){return VH;},get mini(){return miniV;},get clock(){return clock;},get perf(){return perfAvg;}};
window.WELT_READY=true;
})();
