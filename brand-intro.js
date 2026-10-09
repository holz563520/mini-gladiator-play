// ARENA THEORY – Start-Intro (Farbwelt Eis). Reine Inszenierung: liest und schreibt keine Spielstände, greift nicht in Kampf, Welt oder Zufall ein.
// Ablauf: Ladebalken → Kampfsimulation (300 Figuren bilden das Porträt) → THE ARCHITECT → PRESENTS → ARENA THEORY.
// Ein Tipp springt zur nächsten Sequenz (kein Überspringen-Knopf; Esc beendet das Intro).
'use strict';
(()=>{
const GRID=["11111111111111111111111111111111", "11111111111111111111111111111111", "11111111111111111111111111111111", "11111111113131111111111111111111", "11111111300001002111111111111111", "11111130000000000011111111111111", "11111000000000000000111111111111", "11110000000000000000011111111111", "11130000000000001200003111111111", "11130000000001333110000111111111", "11100001333333333331000011111111", "11100033333333333333100011111111", "11000133333333333333110001111111", "11000333333333333333311001111111", "13000333333333333333331203111111", "13000331131133331111333101111111", "11002111111111333333313120111111", "11001111111133333333333120111111", "11001111113333333311133122211111", "11001111133311111222211112011111", "11202111312221112222221331211111", "11102111122222111000022132211111", "11222111120002111222211331211111", "11212111200022111222211331211111", "11121111212221111111113331211111", "11122111111111111111113331211111", "11121111131111113111111131211111", "11112111131111113311122112111111", "11112111111211111111122112111111", "11112221112211222221122112111111", "11111112112211122221222112111111", "11111112112222222222221112111111", "11111111211220111122211121111111", "11111111211111222222111121111111", "11111111211111122222111211111111", "11111111102211112221111211111111", "11111111102221111111112111111111", "11111111110021133311201111111111", "11111111111100211120011111111111", "11111111111110000001111111111111", "11111111111111111111111111111111", "11111111111111111111111111111111"];
const GW=GRID[0].length, GH=GRID.length, C=8;
const T_IMP=2.6, FREEZE=.1, T_CHAOS=3.4, T_FORM=5.2, T_TITLE=5.6;
const B0=3.6, A0=B0+T_TITLE, D0=A0+2.4, P0=D0+3.4, M0=P0+1.4, END=M0+2.8;
const SEQ=[["Ladebalken",0],["Kampfsimulation",B0],["The Architect",A0],["Supreme Directorate",D0],["Presents",P0],["Arena Theory",M0]];
const seqAt=v=>{let i=0;for(let j=0;j<SEQ.length;j++)if(v>=SEQ[j][1])i=j;return i};
const nextStart=v=>{const i=seqAt(v);return i>=SEQ.length-1?END:SEQ[i+1][1]};
const api=window.ArenaTheoryIntro={SEQ,END,seqAt,nextStart,grid:GRID,active:()=>false,finish(){}};
if(typeof document==='undefined'||!document.body||!document.createElement('canvas').getContext)return;

const BOOT=["Reality Kernel","Quantum Causality","Ludus Geometry","Gladiator Genomes","Legendary Weapons","Forge Thermodynamics","Tactical Instinct","Rivalry Protocols","Scar Memory","Medicus Systems","Talent Prediction","Crowd Consciousness","Autonomous Worlds","Universe Integrity"];
const PARAMS=["COMBAT VECTOR","IMPACT FORCE","SURVIVAL","REACTION","ARMOR","TRAUMA","MORALE","VELOCITY","TARGET","DAMAGE","BLEEDING","FATIGUE","FORMATION","AGGRESSION","THREAT","DISTANCE","KILL PROBABILITY","SURVIVAL PROBABILITY"];
const NPAR=1000;
const P={out:"#04080d",t1:"#0a141d",t2:"#070f17",wall:"#5aa6d0",floor:"#2f5873",sd:"rgba(0,8,16,.26)",sl:"rgba(190,230,255,.09)",pool:"#02060a",dust:"#6fb4d8",drop:"#ff4a3a",flash:"rgba(225,242,255,.8)",
  bg:"#03060a",grid:"rgba(127,212,255,.06)",scrim:"rgba(2,6,10,.36)",hud:"#eaf6ff",hi:"#ff6a4a",frame:"rgba(234,246,255,.5)"};
const COL=[{a:"#eaf6ff",d:"#b4cfe0",c:"#ff4a3a",s:"#d9c2b0",w:"#ffffff",h:"#c8dcea"},{a:"#0a1622",d:"#060d15",c:"#ff4a3a",s:"#14222e",w:"#7c8d9a",h:"#0e1c29"}];
const SPR={
 run1:["..c...",".ca..w",".ss..w","haaaw.","haad..",".aa...",".d.a..","d...a."],
 run2:["..c...",".ca.w.",".ss.w.","haaw..","haad..",".aa...","..ad..","..ad.."],
 hit: ["..c...",".ca...",".ss...","haaaww","haad..",".aa...",".a.d..",".a..d."],
 down:["........",".aaaaaa.","saaaaadw","saaaaadw",".aaadaa.",".aaaaaa.",".d.aa.d.","........"]};
const lerp=(a,b,p)=>a+(b-a)*p, clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v;
const ease=p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
function h(a,b=0){let n=(a*374761393+b*668265263)|0;n=Math.imul(n^(n>>>15),2246822519);n=Math.imul(n^(n>>>13),3266489917);return((n^(n>>>16))>>>0)/4294967296}
const FONT="'Courier Prime','Courier New',monospace";

/* ---------- Aufbau ---------- */
const root=document.createElement('div');root.id='brandIntro';root.setAttribute('role','dialog');root.setAttribute('aria-label','ARENA THEORY Intro. Tippen springt zur nächsten Sequenz.');
root.innerHTML='<canvas class="bi-scene"></canvas><canvas class="bi-hud"></canvas>'
 +'<div class="bi-layer bi-boot" hidden><h2>Simulate the World_</h2><div class="bi-rows"></div><p>[ Compiling impossible amounts of reality ]</p></div>'
 +'<div class="bi-layer bi-arch" hidden><b>The Architect</b><em>Thomas Holz</em></div>'
 +'<div class="bi-layer bi-dir" hidden><b>THOLZ</b><strong>Supreme Directorate</strong><p>For Computational Reality,<br>Synthetic Civilization &amp;<br>Autonomous World Engineering</p><small>Advanced Simulation Division<br>Experimental Program 001</small></div>'
 +'<div class="bi-layer bi-pres" hidden><small>Presents</small><b>Arena Theory</b><i>Death is permanent</i></div>'
 +'<div class="bi-fx"></div>'
 +'<div class="bi-layer bi-gate"><b>Arena Theory</b><span>▶ Simulation starten</span></div>'
 +'<div class="bi-status" hidden><span></span><span></span><div class="bi-seg"><i></i></div></div>'
 +'<div class="bi-hint" hidden>Tippen = Weiter</div>'
 ;
document.body.appendChild(root);
const q=s=>root.querySelector(s);
const scene=q('.bi-scene'),hudC=q('.bi-hud'),g=scene.getContext('2d'),hg=hudC.getContext('2d');
const elBoot=q('.bi-boot'),elArch=q('.bi-arch'),elDir=q('.bi-dir'),elDirParts=[...q('.bi-dir').children],elPres=q('.bi-pres'),elGate=q('.bi-gate'),elStatus=q('.bi-status'),elHint=q('.bi-hint');
const elName=elArch.querySelector('em'),elTitle=elPres.querySelector('b'),elTag=elPres.querySelector('i'),elComp=elBoot.querySelector('p');
const [elLab,elPct]=elStatus.querySelectorAll('span'),elBar=elStatus.querySelector('i');
const tmpA=document.createElement('canvas'),tile=document.createElement('canvas');tile.width=tile.height=64;
let W=640,H=360,F=1,CAM={z0:1,z1:2,zc:2.3,zf:.5,fy:52},field=null;

/* ---------- Einheiten ---------- */
const S=[];
for(let side=0;side<2;side++){
  const dir=side?-1:1, list=[];
  for(let i=0;i<150;i++){
    const k=side*1000+i, dep=h(k,1)*210, ys=(h(k,2)-.5)*220;
    list.push({side,dir,k,sx:-dir*(300+dep),sy:ys,mx:-dir*(4+dep*.3),my:ys*.75,
      rec:dep<60?(10+h(k,3)*14):3,f1:9+h(k,4)*9,f2:7+h(k,5)*9,ph:h(k,6)*6.28,
      t0:T_CHAOS+h(k,7)*.5,dur:1+h(k,8)*.25,anim:h(k,9)});
  }
  const cells=[];
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++)if(GRID[y][x]===(side?"2":"3"))cells.push({x,y});
  list.sort((p,q)=>p.my-q.my);
  for(let i=0;i<150;i+=10){
    const a=list.slice(i,i+10).sort((p,q)=>p.mx-q.mx), b=cells.slice(i,i+10).sort((p,q)=>p.x-q.x);
    a.forEach((s,j)=>{s.cx=(b[j].x-GW/2)*C;s.cy=(b[j].y-GH/2)*C;s.tx=s.cx+C/2;s.ty=s.cy+C});
  }
  S.push(...list);
}
const POOLS=[];
for(let y=0;y<GH;y++)for(let x=0;x<GW;x++)if(GRID[y][x]==="0"){
  const wx=(x-GW/2)*C, wy=(y-GH/2)*C;
  POOLS.push({wx,wy,t:3.6+clamp(Math.hypot(wx,wy)/190)*1.0+h(x,y)*.3});
}
function chaosPos(s,t){const τ=Math.max(0,t-T_IMP-FREEZE);const r=Math.exp(-τ*5)*s.rec;
  return[s.mx-s.dir*(s.rec-r)*.5+Math.sin(τ*s.f1+s.ph)*2.5, s.my+Math.cos(τ*s.f2+s.ph)*2]}
function place(s,t){
  if(t<=T_IMP){const p=Math.pow(t/T_IMP,1.2);s.x=lerp(s.sx,s.mx,p);s.y=lerp(s.sy,s.my,p);s.st=0;return}
  if(t<s.t0){[s.x,s.y]=chaosPos(s,t);s.st=1;return}
  const p=clamp((t-s.t0)/s.dur), e=ease(p), f=chaosPos(s,s.t0);
  s.x=lerp(f[0],s.tx,e);s.y=lerp(f[1],s.ty,e);s.st=p>=.8?3:2;
}
/* ---------- Kamera ---------- */
function camera(t){
  let z,cy=0,amp=0;const K=CAM;
  if(t<T_IMP){const p=t/T_IMP;z=K.z0+(K.z1-K.z0)*p*p;amp=2.4*p*p}
  else if(t<T_IMP+FREEZE){z=K.zc}
  else if(t<T_CHAOS){z=K.zc;amp=11*Math.exp(-(t-T_IMP-FREEZE)*5)}
  else if(t<4.7){const e=ease((t-T_CHAOS)/1.3);z=K.zc*Math.pow(K.zf/K.zc,e);cy=K.fy*e;amp=11*Math.exp(-(t-T_IMP-FREEZE)*5)}
  else{z=K.zf;cy=K.fy}
  if(amp<.35)amp=0;
  const f=Math.floor(t*60);
  return{z,cy:Math.round(cy),ox:Math.round((h(f,11)-.5)*2*amp),oy:Math.round((h(f,12)-.5)*2*amp)};
}
/* ---------- Szene ---------- */
function buildTile(){const c=tile.getContext('2d');c.fillStyle=P.floor;c.fillRect(0,0,64,64);
 for(let i=0;i<240;i++){c.fillStyle=h(i,20)<.5?P.sd:P.sl;c.fillRect(Math.floor(h(i,21)*64),Math.floor(h(i,22)*64),h(i,23)<.2?2:1,1)}
 field=g.createPattern(tile,'repeat')}
const DROPS=[];for(let i=0;i<130;i++){const a=h(i,30)*6.28,v=30+h(i,31)*150;DROPS.push({x:(h(i,32)-.5)*18,y:(h(i,33)-.5)*170,vx:Math.cos(a)*v,vy:Math.sin(a)*v*.6,sz:h(i,34)<.3?2:1})}
const sprCache=new Map();
function sprite(name,side,sx,sy,z,flip){const key=name+side+(flip?'f':'');let c=sprCache.get(key);
  if(!c){const rows=SPR[name],col=COL[side],w=rows[0].length;c=document.createElement('canvas');c.width=w;c.height=rows.length;const x=c.getContext('2d');
    for(let r=0;r<rows.length;r++)for(let k=0;k<w;k++){const ch=rows[r][k];if(ch==='.')continue;x.fillStyle=col[ch];x.fillRect(flip?w-1-k:k,r,1,1);}sprCache.set(key,c);}
  g.drawImage(c,Math.round(sx),Math.round(sy),Math.max(1,Math.round(c.width*z)),Math.max(1,Math.round(c.height*z)));}
let blankDone=false;
function blank(){if(blankDone)return;blankDone=true;g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.fillStyle=P.bg;g.fillRect(0,0,W,H);
  g.fillStyle=P.grid;for(let x=Math.round(W/2)%40;x<W;x+=40)g.fillRect(x,0,1,H);for(let y=Math.round(H/2)%40;y<H;y+=40)g.fillRect(0,y,W,1);
  hg.setTransform(1,0,0,1,0,0);hg.clearRect(0,0,hudC.width,hudC.height)}
function drawScene(t,cam){blankDone=false;
  const z=cam.z, tx=Math.round(W/2)+cam.ox, ty=Math.round(H/2)-cam.cy+cam.oy;
  g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.imageSmoothingEnabled=false;
  g.fillStyle=P.bg;g.fillRect(0,0,W,H);
  g.setTransform(z,0,0,z,tx,ty);
  g.fillStyle=P.out;g.fillRect(-2400,-2400,4800,4800);
  for(let i=3;i>=1;i--){g.fillStyle=i%2?P.t1:P.t2;g.beginPath();g.ellipse(0,40,560+i*34,330+i*26,0,0,7);g.fill()}
  g.fillStyle=P.wall;g.beginPath();g.ellipse(0,40,566,336,0,0,7);g.fill();
  g.fillStyle=field;g.beginPath();g.ellipse(0,40,560,330,0,0,7);g.fill();
  g.fillStyle=P.pool;
  for(const p of POOLS){const k=clamp((t-p.t)/.35);if(k<=0)continue;const r=C*k;g.fillRect(p.wx+(C-r)/2,p.wy+(C-r)/2,r,r)}
  g.setTransform(1,0,0,1,0,0);
  const X=wx=>wx*z+tx, Y=wy=>wy*z+ty, blocky=z<=CAM.zf*1.5;
  if(t<T_IMP+.3){g.fillStyle=P.dust;
    for(const s of S){if(s.k%2)continue;const f=(t*5+s.anim)%1;g.globalAlpha=.55*(1-f)*clamp(1-(t-T_IMP)/.3);
      const r=Math.max(1,Math.round((1+f*3)*z));g.fillRect(Math.round(X(s.x-s.dir*(5+f*14))),Math.round(Y(s.y-1-f*3)),r,r)}
    g.globalAlpha=1}
  if(t>T_IMP&&t<4.7){const τ=Math.max(0,t-T_IMP-FREEZE)+.02,k=(1-Math.exp(-5*τ))/5;
    g.globalAlpha=clamp((4.7-t)/.9);g.fillStyle=P.drop;
    for(const d of DROPS){const r=Math.max(1,Math.round(d.sz*z));g.fillRect(Math.round(X(d.x+d.vx*k)),Math.round(Y(d.y+d.vy*k)),r,r)}
    g.globalAlpha=1}
  S.sort((a,b)=>a.y-b.y);
  for(const s of S){
    const col=COL[s.side];
    if(s.st===3){
      if(blocky){const x0=Math.round(X(s.x-C/2)),y0=Math.round(Y(s.y-C));g.fillStyle=col.a;g.fillRect(x0,y0,Math.round(X(s.x+C/2))-x0,Math.round(Y(s.y))-y0)}
      else sprite('down',s.side,X(s.x-4),Y(s.y-8),z,s.dir<0);
      continue}
    g.fillStyle='rgba(0,0,0,.42)';g.fillRect(Math.round(X(s.x-3)),Math.round(Y(s.y-1)),Math.max(1,Math.round(6*z)),Math.max(1,Math.round(z)));
    let rows;
    if(s.st===0)rows=((t*11+s.anim*2)%2)<1?'run1':'run2';
    else if(s.st===1)rows=((t*14+s.anim*3)%3)<1?'hit':'run2';
    else rows=((t*8+s.anim*2)%2)<1?'run1':'run2';
    const face=s.st===2?(s.tx<s.x?-1:1):s.dir;
    sprite(rows,s.side,X(s.x-3),Y(s.y-8),z,face<0);
  }
  if(t>=T_IMP&&t<T_IMP+FREEZE){
    const a=tmpA.getContext('2d'),k=(t-T_IMP)/FREEZE,off=k<.6?8:3;
    a.globalCompositeOperation='copy';a.drawImage(scene,0,0);
    g.fillStyle='#000';g.fillRect(0,0,W,H);g.globalCompositeOperation='lighter';
    g.globalAlpha=.62;g.drawImage(tmpA,-off,0);g.drawImage(tmpA,off,0);
    g.globalAlpha=1;g.globalCompositeOperation='source-over';
    for(let i=0;i<6;i++){const y=Math.floor(h(i,40)*H),hh=4+Math.floor(h(i,41)*14),dx=Math.round((h(i,42)-.5)*46);g.drawImage(tmpA,0,y,W,hh,dx,y,W,hh)}
    if(k<.25){g.fillStyle=P.flash;g.fillRect(0,0,W,H)}
  }
  return{X,Y,z};
}
/* ---------- Parameter-Overlay ---------- */
function val(k,tick){const r=h(k,tick),m=k%5;
  return m===0?r.toFixed(4):m===1?(r*100).toFixed(1)+"%":m===2?(r*9e4|0).toString(16).toUpperCase().padStart(5,"0"):m===3?(r*40-20).toFixed(2):(r*999|0)+"."+(r*97|0)}
const MICRO_FRAMES=6;let microFrames=[],microSize='',microJob=null;
// Die sechs Lagen entstehen in kleinen Portionen (wenige Millisekunden je Schritt), bevorzugt schon auf dem Startbildschirm, damit weder Ladebalken noch Ansturm stocken.
function microStep(budget){const size=W+'x'+H+'x'+F;if(microSize!==size){microFrames=[];microSize=size;microJob=null;}if(microFrames.length>=MICRO_FRAMES)return false;
  if(!microJob){const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.textBaseline='middle';x.textAlign='left';x.font='400 '+(5*F).toFixed(1)+'px '+FONT;microJob={c,x,i:0,f:microFrames.length};}
  const j=microJob,f=j.f,set=Math.floor(f/3),x=j.x,end=performance.now()+budget;
  do{for(let n=0;n<20&&j.i<NPAR;n++,j.i++){const i=j.i;x.globalAlpha=.2+h(i,f*13+3)*.55;x.fillStyle=i%11===0?P.hi:P.hud;x.fillText(i%5===0?PARAMS[i%PARAMS.length]+' '+val(i,f*17+5):val(i,f*17+5),h(i,set*7+1)*(W+20)-20,30+h(i+5000,set*7+2)*(H-30-H*.12));}}while(j.i<NPAR&&performance.now()<end);
  if(j.i>=NPAR){microFrames.push(j.c);microJob=null;}return true;}
let microTimer=0;function microIdle(){microTimer=0;if(done)return;if(microStep(started?2:6))microTimer=setTimeout(microIdle,started?40:12);}
function microStart(){if(!microTimer)microTimer=setTimeout(microIdle,30);}
function drawHud(t,cam,map){
  const k=hudC.width/W;hg.setTransform(k,0,0,k,0,0);hg.clearRect(0,0,W,H);
  if(t>=T_FORM)return;
  const tt=(t>=T_IMP&&t<T_IMP+FREEZE)?T_IMP:t, pre=clamp(t/T_IMP);
  const I=t<T_CHAOS?1:Math.max(.3,1-(t-T_CHAOS)/1.5);
  hg.fillStyle=P.scrim;hg.fillRect(0,0,W,H);
  hg.translate(cam.ox,cam.oy);hg.textBaseline='middle';
  const ph=P.hud,hot=P.hi;
  const n=Math.round(NPAR*I);while(!microFrames.length)microStep(40);
  {const set=Math.floor(tt/.5)%2,f=microFrames[(set*3+Math.floor(tt/.06)%3)%microFrames.length],band=110*map.z+6,top=Math.max(0,Math.round(H/2-band)),bot=Math.min(H,Math.round(H/2+band));
   hg.globalAlpha=I;if(top>0)hg.drawImage(f,0,0,W,top,0,0,W,top);if(bot<H)hg.drawImage(f,0,bot,W,H-bot,0,bot,W,H-bot);hg.globalAlpha=I*.42;if(bot>top)hg.drawImage(f,0,top,W,bot-top,0,top,W,bot-top);hg.globalAlpha=1;}
  hg.font='700 '+(7*F).toFixed(1)+'px '+FONT;hg.fillStyle=ph;hg.globalAlpha=.9;hg.textAlign='left';
  const top=Math.max(40,H*.075);
  hg.fillText('ARENA THEORY // COMBAT SIM  T+'+tt.toFixed(3),14,top);
  hg.fillText('PARAMETERS '+String(n).padStart(4,'0')+' ACTIVE',14,top+10*F);
  const iv=lerp(.32,.07,pre), m=Math.round((W<560?12:18)*I);
  hg.font='700 '+(7.5*F).toFixed(1)+'px '+FONT;hg.lineWidth=.6;
  for(let i=0;i<m;i++){const tick=Math.floor(tt/iv+h(i,70)*4), s=S[Math.floor(h(i+900,Math.floor(tt/(iv*3)+h(i,71)))*300)];
    const sx=map.X(s.x), sy=map.Y(s.y-4);if(sx<0||sx>W||sy<0||sy>H)continue;
    const dx=(h(i,72)<.5?-1:1)*(26+h(i,73)*44), dy=-(16+h(i,74)*46), lx=clamp(sx+dx,14,W-14), ly=clamp(sy+dy,top+56*F,H*.86);
    const c=i%4===0?hot:ph;hg.strokeStyle=c;hg.fillStyle=c;hg.globalAlpha=.8;
    hg.strokeRect(sx-5,sy-6,10,12);hg.beginPath();hg.moveTo(sx+(dx<0?-5:5),sy-6);hg.lineTo(lx,ly);hg.stroke();
    hg.textAlign=dx<0?'right':'left';hg.globalAlpha=1;
    hg.fillText(PARAMS[Math.floor(h(i,tick+7)*PARAMS.length)]+' '+val(i+3,tick),lx+(dx<0?-3:3),ly)}
  for(let i=0;i<4;i++){const d=lerp(.34,.11,pre)*(1+h(i,80)), tick=Math.floor(tt/d+h(i,81));
    if(h(i+40,tick)>.3+.4*I)continue;
    const size=((W<560?11:14)+h(i,tick+1)*(W<560?13:20))*F, side=h(i,tick+2)<.5?-1:1, x=W/2+side*(W*.47-6), y=top+70*F+h(i,tick+3)*(H*.86-top-110*F);
    hg.font='700 '+size.toFixed(0)+'px '+FONT;hg.textAlign=side<0?'left':'right';
    hg.globalAlpha=.3+h(i,tick+4)*.55;hg.fillStyle=h(i,tick+5)<.25?hot:ph;
    hg.fillText(PARAMS[Math.floor(h(i,tick+6)*PARAMS.length)],x,y);
    hg.font='700 '+(size*.5).toFixed(0)+'px '+FONT;hg.fillText(val(i,Math.floor(tt/.05)),x,y+size*.85)}
  hg.textAlign='center';hg.globalAlpha=1;
  let lab,num,c=ph;
  if(t<T_IMP){lab='DISTANCE';num=((Math.abs(lerp(300,4,Math.pow(pre,1.2)))-4)*.2).toFixed(2)+' m'}
  else if(t<T_CHAOS){lab='IMPACT FORCE';num=t<T_IMP+FREEZE?'0.00 m':(9.2e5+h(Math.floor(tt*40),90)*6e4|0).toLocaleString('en-US')+' N';c=hot}
  else{lab='CASUALTIES';num=String(S.reduce((a,s)=>a+(s.st===3),0)).padStart(3,'0')+' / 300';c=hot}
  hg.fillStyle=ph;hg.font='700 '+(7*F).toFixed(1)+'px '+FONT;hg.fillText(lab,W/2,top+26*F);
  hg.fillStyle=c;hg.font='700 '+(22*F).toFixed(0)+'px '+FONT;hg.fillText(num,W/2,top+42*F);
}
/* ---------- Ton (rein synthetisch, keine Datei) ---------- */
let ac=null,master=null,comp=null,bus=null,nb=null;
function initAudio(){
  if(ac)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  try{ac=new AC();comp=ac.createDynamicsCompressor();comp.threshold.value=-10;comp.ratio.value=8;
  master=ac.createGain();master.gain.value=.85;comp.connect(master).connect(ac.destination);
  nb=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);const nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;}catch(e){ac=null}
}
function cut(){if(bus&&ac){const b=bus;bus=null;try{b.gain.setTargetAtTime(0,ac.currentTime,.012);setTimeout(()=>{try{b.disconnect()}catch(e){}},300)}catch(e){}}}
function cue(i){
  if(!ac)return;cut();if(ac.state==="suspended")ac.resume();
  bus=ac.createGain();bus.connect(comp);const out=bus;
  const T=ac.currentTime+.04, at=s=>T+s;
  const boom=(s,f0,f1,dt,peak,dec,type="sine")=>{const o=ac.createOscillator(),gn=ac.createGain();o.type=type;o.frequency.setValueAtTime(f0,at(s));o.frequency.exponentialRampToValueAtTime(f1,at(s+dt));
    gn.gain.setValueAtTime(peak,at(s));gn.gain.exponentialRampToValueAtTime(.0001,at(s+dec));o.connect(gn).connect(out);o.start(at(s));o.stop(at(s+dec+.05))};
  const blip=(s,f,len,vol)=>{const o=ac.createOscillator(),gn=ac.createGain();o.type="square";o.frequency.value=f;gn.gain.setValueAtTime(0,at(s));gn.gain.setValueAtTime(vol,at(s+.001));gn.gain.setValueAtTime(0,at(s+len));o.connect(gn).connect(out);o.start(at(s));o.stop(at(s+len+.02))};
  if(i===0){
    const o=ac.createOscillator(),gn=ac.createGain();o.frequency.setValueAtTime(48,at(0));o.frequency.linearRampToValueAtTime(62,at(B0));
    gn.gain.setValueAtTime(.0001,at(0));gn.gain.linearRampToValueAtTime(.3,at(B0-.2));gn.gain.setValueAtTime(0,at(B0));o.connect(gn).connect(out);o.start(at(0));o.stop(at(B0+.05));
    // Ein einziger Oszillator für alle Datenticks: Tonhöhe und Lautstärke werden nur geplant, statt je Tick zwei Knoten anzulegen.
    {const tick=ac.createOscillator(),tg=ac.createGain();tick.type='square';tg.gain.setValueAtTime(0,at(0));let s=.05;while(s<3.2){tick.frequency.setValueAtTime(900+Math.random()*1800,at(s));tg.gain.setValueAtTime(.035,at(s+.001));tg.gain.setValueAtTime(0,at(s+.014));s+=lerp(.16,.03,s/3.2)*(.6+Math.random()*.8)}
     tick.frequency.setValueAtTime(1320,at(3.3));tg.gain.setValueAtTime(.07,at(3.301));tg.gain.setValueAtTime(0,at(3.36));tick.frequency.setValueAtTime(1760,at(3.38));tg.gain.setValueAtTime(.07,at(3.381));tg.gain.setValueAtTime(0,at(3.48));tick.connect(tg).connect(out);tick.start(at(0));tick.stop(at(3.55));}
  }else if(i===1){
    const shaper=ac.createWaveShaper(),cv=new Float32Array(1024);for(let j=0;j<1024;j++)cv[j]=Math.tanh((j/512-1)*6);shaper.curve=cv;
    const build=ac.createGain();build.gain.setValueAtTime(1,at(0));build.gain.setValueAtTime(0,at(T_IMP));
    const dry=ac.createGain(),wet=ac.createGain();
    dry.gain.setValueAtTime(1,at(0));dry.gain.linearRampToValueAtTime(.5,at(T_IMP));
    wet.gain.setValueAtTime(0,at(0));wet.gain.setValueAtTime(0,at(1.2));wet.gain.linearRampToValueAtTime(.45,at(T_IMP));
    build.connect(dry).connect(out);build.connect(shaper).connect(wet).connect(out);
    const trem=ac.createGain();trem.gain.value=1;trem.connect(build);
    const lfo=ac.createOscillator(),ld=ac.createGain();lfo.frequency.setValueAtTime(7,at(0));lfo.frequency.exponentialRampToValueAtTime(30,at(T_IMP));
    ld.gain.setValueAtTime(0,at(0));ld.gain.linearRampToValueAtTime(.4,at(T_IMP));lfo.connect(ld).connect(trem.gain);lfo.start(at(0));lfo.stop(at(T_IMP));
    const ramp=(p,pow,peak)=>{p.setValueAtTime(.0001,at(0));const N=24;for(let j=1;j<=N;j++)p.linearRampToValueAtTime(peak*Math.pow(j/N,pow)+.0001,at(T_IMP*j/N))};
    const osc=(type,f0,f1,peak,pow)=>{const o=ac.createOscillator(),gn=ac.createGain();o.type=type;o.frequency.setValueAtTime(f0,at(0));o.frequency.exponentialRampToValueAtTime(f1,at(T_IMP));ramp(gn.gain,pow,peak);o.connect(gn).connect(trem);o.start(at(0));o.stop(at(T_IMP+.02))};
    osc("sine",35,55,.9,1.6);osc("triangle",70,110,.35,2);
    {const o=ac.createOscillator(),f=ac.createBiquadFilter(),gn=ac.createGain();o.type="sawtooth";o.frequency.setValueAtTime(70,at(0));o.frequency.exponentialRampToValueAtTime(110,at(T_IMP));
     f.type="lowpass";f.frequency.setValueAtTime(120,at(0));f.frequency.exponentialRampToValueAtTime(900,at(T_IMP));ramp(gn.gain,2.4,.22);o.connect(f).connect(gn).connect(trem);o.start(at(0));o.stop(at(T_IMP+.02))}
    {const n=ac.createBufferSource(),f=ac.createBiquadFilter(),gn=ac.createGain();n.buffer=nb;n.loop=true;f.type="lowpass";f.Q.value=1.2;
     f.frequency.setValueAtTime(110,at(0));f.frequency.exponentialRampToValueAtTime(7000,at(T_IMP));ramp(gn.gain,2.2,.4);n.connect(f).connect(gn).connect(trem);n.start(at(0));n.stop(at(T_IMP+.02))}
    for(let j=0;j<7;j++)blip(2.18+j*.058,180+Math.random()*2400,.028,.07+j*.012);
    boom(T_IMP,120,30,.15,1.3,.75);boom(T_IMP,240,60,.12,.5,.35,"triangle");
    {const n=ac.createBufferSource(),f=ac.createBiquadFilter(),gn=ac.createGain();n.buffer=nb;f.type="lowpass";f.frequency.value=1400;
     gn.gain.setValueAtTime(.9,at(T_IMP));gn.gain.exponentialRampToValueAtTime(.0001,at(T_IMP+.11));n.connect(f).connect(gn).connect(out);n.start(at(T_IMP));n.stop(at(T_IMP+.2))}
    {const n=ac.createBufferSource(),f=ac.createBiquadFilter(),gn=ac.createGain();n.buffer=nb;n.loop=true;f.type="lowpass";f.frequency.value=160;
     gn.gain.setValueAtTime(.0001,at(T_IMP));gn.gain.linearRampToValueAtTime(.3,at(T_IMP+.15));gn.gain.exponentialRampToValueAtTime(.02,at(T_CHAOS));gn.gain.linearRampToValueAtTime(.008,at(T_FORM-.05));gn.gain.setValueAtTime(0,at(T_FORM));
     n.connect(f).connect(gn).connect(out);n.start(at(T_IMP));n.stop(at(T_FORM+.05))}
  }else if(i===2){boom(0,72,36,.5,1.1,1.4);boom(0,144,72,.4,.35,.6,"triangle")}
  else if(i===3){boom(0,64,40,.4,.8,1.1);blip(.4,990,.04,.04);blip(.95,1320,.04,.04);blip(1.9,1760,.06,.04)}
  else if(i===4){boom(0,60,44,.3,.5,.7);blip(0,1320,.05,.05)}
  else{boom(0,90,32,.45,1.2,1.6);boom(0,180,64,.35,.4,.7,"triangle");blip(.6,1760,.05,.05);blip(.68,2640,.09,.05)}
}
/* ---------- Ablauf ---------- */
const rowsEl=q('.bi-rows'),rowEls=BOOT.map((n,i)=>{const a=document.createElement('span'),b=document.createElement('div'),f=document.createElement('i'),c=document.createElement('span');
  a.textContent=n;b.className='bi-seg';b.appendChild(f);rowsEl.append(a,b,c);
  return{a,f,c,d:i?h(i,101)*.5:0,len:i?1.4+h(i,102)*1.3:.9}});
let t=0,playing=false,started=false,done=false,last=0,curSeq=-1,raf=0,lateFrames=0;
function fit(){
  const cw=Math.max(200,root.clientWidth),ch=Math.max(200,root.clientHeight);
  const sc=Math.max(1,Math.floor(Math.min(cw/400,ch/360)));
  W=Math.ceil(cw/sc);H=Math.ceil(ch/sc);root.classList.toggle('tall',ch>cw*1.05);
  F=clamp(Math.min(W/400,H/360),1,1.5);
  let zf=.375;for(const z of [.5,.75,1,1.25,1.5,2])if(GH*C*z<=H*.36&&GW*C*z<=W*.66)zf=z;
  const z1=Math.min(2*W/640,H/180);
  CAM={z0:z1/2,z1,zc:z1*1.15,zf,fy:Math.round(H*.14)};
  scene.width=tmpA.width=W;scene.height=tmpA.height=H;buildTile();
  // Die Parameter-Ebene läuft in halber Geräteauflösung (höchstens 1,5-fach, höchstens 900 Pixel breit): Auf dem Handy ist das die teuerste Fläche je Bild.
  const d=Math.min(window.devicePixelRatio||1,1.5),hw=Math.min(900,Math.round(W*sc*d));
  hudC.width=hw;hudC.height=Math.round(hw*H/W);
  for(const c of [scene,hudC]){c.style.width=W*sc+'px';c.style.height=H*sc+'px'}
  blankDone=false;microStart();
}
const pct=v=>String(Math.round(clamp(v)*100)).padStart(3,'0')+'%';
function render(){
  const si=t>=END?SEQ.length-1:seqAt(t);
  const show=(el,hide)=>{if(el.hidden!==hide)el.hidden=hide;};show(elBoot,si!==0);show(elArch,si!==2);show(elDir,si!==3);if(si===3)[0,.4,.95,1.9].forEach((at,n)=>show(elDirParts[n],t<D0+at));show(elPres,si<4);show(elName,t<A0+.45);show(elTitle,t<M0);show(elTag,t<M0+.7);
  let lab,p=1;
  if(si===0){
    for(const r of rowEls){const k=clamp((t-r.d)/r.len),v=Math.floor((1-Math.pow(1-k,1.35))*32)/32;if(v===r.v)continue;r.v=v;r.f.style.clipPath='inset(0 '+(100-v*100)+'% 0 0)';r.c.textContent=pct(v);r.a.className=r.c.className=v>=1?'done':'';}
    {const txt=t>3.3?'[ Reality compiled ]':'[ Compiling impossible amounts of reality ]';if(elComp.textContent!==txt)elComp.textContent=txt;}
    blank();lab='Booting reality / Overdrive';p=t/3.3;
  }else if(si===1||si===2){
    const tb=t-B0;for(const s of S)place(s,tb);
    const cam=camera(tb),map=drawScene(tb,cam);drawHud(tb,cam,map);
    if(si===1){lab='Combat simulation / Live';p=tb/T_FORM}else lab='Experimental program 001';
  }else{blank();lab=t>=M0?'Simulation ready':'Experimental program 001'}
  {const pc=pct(p),bw=Math.floor(clamp(p)*36)/36;if(elLab.textContent!==lab)elLab.textContent=lab;if(elPct.textContent!==pc)elPct.textContent=pc;if(elBar._w!==bw){elBar._w=bw;elBar.style.clipPath='inset(0 '+(100-bw*100)+'% 0 0)';}}
  show(elHint,si===SEQ.length-1);
  return si;
}
function frame(now){
  raf=0;if(!playing||done)return;
  const dt=Math.min(.05,(now-last)/1000);last=now;t+=dt;
  if(t>=END){finish();return}
  const si=render();if(si!==curSeq){curSeq=si;cue(si)}
  raf=requestAnimationFrame(frame);
}
function go(from){t=from;playing=true;curSeq=-1;last=performance.now();if(ac&&ac.state==='suspended')ac.resume();if(!raf)raf=requestAnimationFrame(frame)}
function begin(){started=true;elGate.hidden=true;elStatus.hidden=false;initAudio();
  go(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches?M0:0)}
function advance(){if(done)return;if(!started){begin();return}const n=nextStart(t);if(n>=END)finish();else go(n)}
function finish(){
  if(done)return;done=true;playing=false;if(raf)cancelAnimationFrame(raf);cut();
  window.removeEventListener('keydown',onKey,true);window.removeEventListener('resize',onResize);
  root.classList.add('bi-out');
  setTimeout(()=>{root.remove();if(ac){try{ac.close()}catch(e){}ac=null}try{window.dispatchEvent(new Event('arenatheory:intro-done'))}catch(e){}},460);
}
function onKey(e){if(done)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish()}else if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();advance()}}
function onResize(){if(done)return;fit();if(started)render();else blank()}
root.addEventListener('click',e=>{e.stopPropagation();if(e.target.closest('.bi-skip'))finish();else advance()});
window.addEventListener('keydown',onKey,true);window.addEventListener('resize',onResize);
document.addEventListener('visibilitychange',()=>{if(done||!started)return;if(document.hidden){playing=false;if(ac)ac.suspend()}else{playing=true;last=performance.now();if(ac)ac.resume();if(!raf)raf=requestAnimationFrame(frame)}});
api.active=()=>!done;api.finish=finish;
fit();blank();
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{if(!started){microFrames=[];microJob=null;microStart();}});
})();
