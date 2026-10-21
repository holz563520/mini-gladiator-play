'use strict';
try{document.fonts&&['400','700'].forEach(w=>document.fonts.load(w+" 16px 'Courier Prime'"));}catch(e){}
// =====================================================================================================
// ORONTES PFEILKOPF · der Bogenhändler (im Spiel über boot.js geladen; fernkampf-tutorial-test.html nutzt dieselbe Datei)
// Nach dem Boxkampf-Tutorial (S.box.intro): Der Schmied zeigt nur kurz auf den Neuen und verschwindet. Orontes erklärt Bogen und
// Armbrust, leiht dem Lanista Gold für einen Rekruten, kommentiert dessen Talent, schenkt den Dolch, lässt Bogen/Armbrust kaufen, erklärt Stärken und
// Schwächen der Fernkämpfer und öffnet in der Arena den Apfelschuss. Danach steht sein Karren im Trainingshof: Bögen und Armbrüste
// gibt es nur bei ihm – der Schmied hatte sie nie im Sortiment.
// Speicherwert: S.bowyer = {stage:''|'film'|'buy'|'role'|'equip'|'arena'|'apple'|'done', recruit, loan, given, owner, appleDay}
// Apfelschuss: apfelschuss.html im Rahmen (eigene Spielkopie im Arbeitsspeicher); Ergebnis wird in den echten Spielstand übernommen, 1× pro Tag.
// Figuren, Gesichter, Waffen, Arena und Ludus kommen aus dem Spiel (M.renderLudusActors, M.faceShot, M.weaponArt, ArenaArt, Ludus-Bild).
// =====================================================================================================
(()=>{
const until=(test,ms=80)=>new Promise(res=>{const id=setInterval(()=>{try{if(test()){clearInterval(id);res();}}catch(e){}},ms);});
until(()=>window.MG?.ui&&window.MG.trader&&window.MG.ludus&&window.ArenaArt&&window.MG.faceShot&&window.MG.weaponArt&&window.ArenaUI&&window.MG.boxGame).then(init);
function init(){
const M=window.MG,S=()=>M.s,ART=window.ArenaArt,$=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cl=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,k)=>a+(b-a)*cl(k,0,1),ease=k=>{k=cl(k,0,1);return k*k*(3-2*k);},hr=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const NAME='Orontes Pfeilkopf',SHORT='Orontes',LOAN=150;
const ST=()=>S().bowyer??={stage:'',recruit:'',loan:0,given:'',owner:0};
const smithName=()=>M.workshop?.state?.master?.name||S().forgeWorkshop?.master?.name||'Der Schmied';
const lanName=()=>S().lanista?.name||'Chef';

// ---------- Figuren ----------
let ORO=null,SMITH=null;
function makeG(seed,f){const s=S(),old=s.rng;s.rng=seed;let g;try{g=M.makeGladiator(0);}finally{s.rng=old;}g.equipment={weapon:null,secondary:null,shield:null,armor:{}};g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};g.scars=[];g.fame=0;f(g);return g;}
function oroG(){return ORO??=makeG(70707,g=>{Object.assign(g,{id:'bowyer',name:NAME,height:167,weight:60,age:63,muscle:22});g.appearance={...g.appearance,skin:'#c08a5c',shade:'#83553a',hair:'#d5d0ba',style:5,beard:2,cloth:'#6b2f73',voice:1};});}
function smithG(){if(SMITH)return SMITH;const p=M.workshop?.state?.master||S().forgeWorkshop?.master;return SMITH=makeG(1312,g=>{Object.assign(g,{id:'bow-smith',name:p?.name||'Schmied',height:p?.height||186,weight:p?.weight||104,muscle:58});if(p?.appearance)g.appearance={...p.appearance};});}
const actor=(g,o={})=>({id:g.id,g,team:0,x:0,y:0,a:0,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,forgeWorker:true,bloodMarks:{},noNav:true,...o});
function drawOro(ctx,x,y,K,o={}){const dir=Math.cos(o.a??0)>=0?1:-1,u=K*.6,P=(fx,fy)=>({x:x+dir*fx*u,y:y+fy*u}),q=Math.max(1,Math.round(u));
 // Köcher hinter dem Rücken, schräg über der linken Schulter, mit Federn
 {const a=P(-19,-44),b=P(-13,-78);const n=Math.round(Math.hypot(b.x-a.x,b.y-a.y)/q);for(let i=0;i<=n;i++){const k=i/n,X=a.x+(b.x-a.x)*k,Y=a.y+(b.y-a.y)*k;px(ctx,X-2.6*q,Y-q,5.2*q,2*q,'#22150c');px(ctx,X-1.8*q,Y-q,3.6*q,2*q,i%4?'#7a4a2a':'#5b3a20');}
  for(let i=0;i<5;i++){const f=P(-16.5+i*1.5,-81-(i%2)*2.5);px(ctx,f.x-q,f.y-2*q,q*2,q*4,i%2?'#e8e0c8':'#b8382e');px(ctx,f.x-q*.5,f.y+2*q,q,q*3,'#cfae72');}}
 drawActor(ctx,actor(oroG(),{forgeWorker:false,...o}),x,y,K);
 // Gurt über der Brust und Kette aus Pfeilspitzen
 {const a=P(-8,-53),b=P(7,-31);const n=Math.round(Math.hypot(b.x-a.x,b.y-a.y)/q);for(let i=0;i<=n;i++){const k=i/n;px(ctx,a.x+(b.x-a.x)*k-q,a.y+(b.y-a.y)*k-q,q*2.2,q*2.2,'#3a2414');px(ctx,a.x+(b.x-a.x)*k-q*.4,a.y+(b.y-a.y)*k-q*.4,q*1.2,q*1.2,'#8a5e34');}}
 for(let i=-2;i<=2;i++){const p=P(i*2.2,-52+Math.abs(i)*.6);px(ctx,p.x-q,p.y,q*2,q,'#22150c');px(ctx,p.x-q*.5,p.y+q,q,q*1.6,'#a2a8b0');}
 const h=P(1.5,-75.5);headArrow(ctx,h.x,h.y,8.8*u,dir,q);}
function drawActor(ctx,a,x,y,k){ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(k,k);try{M.renderLudusActors(ctx,[{...a,x:0,y:0}]);}catch(e){}ctx.restore();}
// Pfeil im Kopf (Ganzkörper): hinten die Federn, vorn die Spitze. hx/hy = Kopfmitte, r = halbe Kopfbreite, dir = Blickrichtung
function px(ctx,x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));}
function pixArrow(ctx,x0,y0,x1,y1,q,o={}){const L=Math.hypot(x1-x0,y1-y0),n=Math.max(2,Math.round(L/q)),ux=(x1-x0)/L,uy=(y1-y0)/L,nx=-uy,ny=ux;
 for(let i=0;i<=n;i++){const x=x0+ux*i*q,y=y0+uy*i*q;px(ctx,x-q,y-q,q*3,q*3,'#22150c');}
 for(let i=0;i<=n;i++){const x=x0+ux*i*q,y=y0+uy*i*q;px(ctx,x,y,q,q,o.shaft||'#cfae72');px(ctx,x,y+q*.5,q,q*.5,'#9a7a48');}
 if(o.fletch){const F=6.5,hOf=k=>Math.max(0,Math.min(3.1,(F-k)*.7+.35)),vane=(side,pass)=>{for(let k=.5;k<=F;k+=.5){const h=hOf(k);for(let j=.5;j<=h+(pass?0:.7);j+=.5){const back=j*.6,x=x0+ux*(k+1.2-back)*q+nx*j*q*side,y=y0+uy*(k+1.2-back)*q+ny*j*q*side;
   if(!pass)px(ctx,x-q*.3,y-q*.3,q*1.6,q*1.6,'#22150c');else px(ctx,x,y,q,q,side>0?(j>h-.8?'#e0604c':k<1.5?'#8a2a22':'#b8382e'):(j>h-.8?'#fffaf0':k<1.5?'#bdb39a':'#e8e0c8'));}}};
  vane(1,0);vane(-1,0);vane(1,1);vane(-1,1);
  for(let k=0;k<=F+1.2;k+=.5)px(ctx,x0+ux*k*q,y0+uy*k*q,q,q,k<1.2?'#3a2414':'#cfae72');
  px(ctx,x0-ux*q*.6-nx*q*.6,y0-uy*q*.6-ny*q*.6,q,q,'#22150c');px(ctx,x0-ux*q*.6+nx*q*.6,y0-uy*q*.6+ny*q*.6,q,q,'#22150c');}
 if(o.tip){for(let k=0;k<4;k++){const w=(4-k)*.6,x=x1+ux*k*q,y=y1+uy*k*q;for(let j=-Math.ceil(w);j<=Math.ceil(w);j++)px(ctx,x+nx*j*q*.7,y+ny*j*q*.7,q,q,Math.abs(j)>=Math.ceil(w)?'#1c1c20':k<2?'#6b7078':'#a2a8b0');}}
 if(o.crust){for(const [cx,cy] of o.crust){px(ctx,cx-q,cy-q,q*2,q*2,'#5a1410');px(ctx,cx,cy+q,q,q*2,'#7a1a14');}}}
// Kopf: Pfeil quer durch den Schädel, links Federn, rechts Spitze (gespiegelt bei Blick nach links)
function headArrow(ctx,hx,hy,r,dir,q){const s=dir>=0?1:-1;
 pixArrow(ctx,hx-s*(r+r*1.6),hy-r*.55,hx-s*(r*.82),hy-r*.32,q,{fletch:true,crust:[[hx-s*r*.86,hy-r*.34]]});
 pixArrow(ctx,hx+s*(r*.84),hy-r*.22,hx+s*(r+r*.9),hy-r*.08,q,{tip:true,crust:[[hx+s*r*.86,hy-r*.22]]});}

// ---------- Karren mit Bögen und Armbrüsten ----------
const FONT3={A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',G:'011100101101011',H:'101101111101101',I:'111010010010111',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'111101101101101',O:'010101101101010',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',W:'101101111111101',Ö:'101010101101010',Ü:'101000101101111',' ':'000000000000000','·':'000000010000000','!':'010010010000010'};
function pixText(ctx,txt,x,y,q,col,shadow){[...txt].forEach((ch,i)=>{const f=FONT3[ch];if(!f)return;for(let r=0;r<5;r++)for(let c=0;c<3;c++)if(f[r*3+c]==='1'){if(shadow)px(ctx,x+(i*4+c)*q+q,y+r*q+q,q,q,shadow);px(ctx,x+(i*4+c)*q,y+r*q,q,q,col);}});}
const WARES=[['bow',0],['bow',1],['crossbow',1],['bow',2],['crossbow',2],['bow',3]];
const item=(def,q)=>({kind:'weapon',def,q,id:'show-'+def+q});
// x,y: Mitte der Radachse am Boden; q: Pixelgröße
function cart(ctx,x,y,q,t){const R=(dx,dy,w,h,c)=>px(ctx,x+dx*q,y+dy*q,w*q,h*q,c);
 // Schatten
 ctx.fillStyle='rgba(30,18,8,.35)';ctx.fillRect(Math.round(x-40*q),Math.round(y-1*q),Math.round(84*q),Math.round(3*q));
 // Rückwand mit Ware
 R(-34,-58,64,40,'#3a2414');R(-33,-57,62,38,'#5b3a20');for(let i=0;i<8;i++)R(-33,-57+i*5,62,1,'#4a2e18');
 R(-36,-62,68,6,'#2a1a10');R(-35,-61,66,4,'#7a5230');
 pixText(ctx,'ORONTES',x-16*q,y-60.5*q,q*.6,'#f1d48a','#2a1a10');
 // Haken und Ware
 for(let i=0;i<WARES.length;i++){const [d,qq]=WARES[i],hx=-27+i*11,sw=Math.sin(t*1.7+i)*.03;R(hx,-55,1,2,'#c9c6ac');
  try{M.weaponArt.draw(ctx,item(d,qq),{x:Math.round(x+hx*q),y:Math.round(y+(d==='bow'?-41:-44)*q),angle:Math.PI/2+sw,scale:q*(d==='bow'?.62:.5),blood:0,drips:false});}catch(e){}}
 // Ladefläche
 R(-40,-18,80,8,'#2a1a10');R(-39,-17,78,6,'#8a5e34');R(-39,-17,78,1,'#b07a44');for(let i=0;i<5;i++)R(-36+i*16,-17,1,6,'#5b3a20');
 // Köcherfass mit Pfeilen
 R(24,-34,12,16,'#2a1a10');R(25,-33,10,15,'#6b4a2a');R(25,-29,10,1,'#3a2414');R(25,-23,10,1,'#3a2414');
 for(let i=0;i<7;i++){const ax=26+i*1.3,ay=-40-(i%3);R(ax,ay,.8,7,'#cfae72');R(ax-.5,ay-1,1.8,2,i%2?'#b8382e':'#e8e0c8');}
 // Schädel mit Pfeil im Auge (Werbung)
 R(-38,-25,8,7,'#2a1a10');R(-37,-24,6,5,'#e8e0c8');R(-36,-23,2,2,'#2a1a10');R(-33,-23,2,2,'#2a1a10');R(-35,-20,3,1,'#9a917a');
 pixArrow(ctx,x-44*q,y-27*q,x-35*q,y-22.5*q,q*.5,{fletch:true});
 // Deichsel
 R(40,-14,22,2,'#2a1a10');R(40,-13,22,1,'#8a5e34');
 // Räder
 for(const wx of [-24,22]){const cx=x+wx*q,cy=y-9*q,rr=9*q,sp=t*0;ctx.fillStyle='#2a1a10';for(let a=0;a<64;a++){const an=a/64*6.283;ctx.fillRect(Math.round(cx+Math.cos(an)*rr-q),Math.round(cy+Math.sin(an)*rr-q),Math.ceil(q*2),Math.ceil(q*2));}
  ctx.fillStyle='#7a5230';for(let a=0;a<64;a++){const an=a/64*6.283;ctx.fillRect(Math.round(cx+Math.cos(an)*(rr-q)),Math.round(cy+Math.sin(an)*(rr-q)),Math.ceil(q),Math.ceil(q));}
  for(let s=0;s<6;s++){const an=s/6*6.283+(cart.spin||0);for(let k=1;k<9;k++)px(ctx,cx+Math.cos(an)*k*q,cy+Math.sin(an)*k*q,q,q,'#5b3a20');}px(ctx,cx-q*1.5,cy-q*1.5,q*3,q*3,'#2a1a10');}}

// ---------- Gesicht in Großaufnahme ----------
let FACEC=null;
function faceMapFor(Wc,Hc,o){const FW=M.faceShot.FW||160,FH=M.faceShot.FH||104,z=(o.zoom||1)*1.12*1.07,s=Math.max(Wc/FW,Hc/FH)*z,dw=Math.round(FW*s),dh=Math.round(FH*s),ox=Math.round(Wc/2-dw/2),oy=Math.round(Math.min(0,(Hc-dh)*.42)),ya=Math.round((o.yaw||0)*4);
 return{s,to:(rx,ry)=>({x:ox+(80+rx+ya)*s,y:oy+(70+ry)*s})};}
function oroFace(ctx,Wc,Hc,t,o={}){if(!FACEC||FACEC.width!==Wc||FACEC.height!==Hc){FACEC=document.createElement('canvas');FACEC.width=Wc;FACEC.height=Hc;}
 const opt={g:oroG(),team:0,mood:o.mood||'grin',yaw:o.yaw??-.3,zoom:o.zoom||1.05,crossEyes:true,lines:0,...o};
 try{M.faceShot.paint(FACEC.getContext('2d'),Wc,Hc,opt,60+t);}catch(e){}ctx.drawImage(FACEC,0,0);
 const fm=faceMapFor(Wc,Hc,opt),q=Math.max(2,Math.round(fm.s*.95)),A=fm.to(-20,-44),B=fm.to(-37,-50),C=fm.to(24,-42),D=fm.to(37,-40);
 // Pfeil durch den Schädel: Federn links hinten, Spitze rechts vorn, Krusten an den Löchern
 pixArrow(ctx,B.x,B.y,A.x,A.y,q,{fletch:true,crust:[[A.x,A.y]]});pixArrow(ctx,C.x,C.y,D.x,D.y,q,{tip:true,crust:[[C.x,C.y]]});}

// ---------- Film: Bild oben, Sprechblase unten (wie die Boxkampf-Erklärung) ----------
const FW=960,FH=540;let film=null,LUDUSCROP=null;
function grabLudus(){let c=null;try{c=M.ludus.background();}catch(e){}if(!c)c=$('ludusCanvas');if(!c||!c.width)return null;const x0=318,y0=452,w=240,h=135,o=document.createElement('canvas');o.width=FW;o.height=FH;const g=o.getContext('2d');g.imageSmoothingEnabled=false;try{g.drawImage(c,x0*c.width/900,y0*c.height/670,w*c.width/900,h*c.height/670,0,0,FW,FH);}catch(e){return null;}return o;}
function playFilm(kind,beats,done){if(film)return;const v=document.createElement('div');v.id='bowIntro';v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');v.setAttribute('aria-label',kind==='arena'?'Orontes erklärt den Apfelschuss':'Der Bogenhändler kommt');
 v.innerHTML=`<div class="bwi-box"><div class="bwi-top"><span>${kind==='arena'?'NEU · ARENA · APFELSCHUSS':'NEU · FERNKAMPF'}</span><button type="button" data-bwi="skip">SZENE ÜBERSPRINGEN ›</button></div><canvas width="${FW}" height="${FH}"></canvas><div class="bwi-bubble"><b></b><p></p><button type="button" data-bwi="next">WEITER ▸</button></div></div>`;
 document.body.appendChild(v);if(kind!=='arena')LUDUSCROP=grabLudus();
 film={v,kind,beats,i:-1,t:0,bt:0,typed:0,last:0,raf:0,done,w:{smithX:250,smithTX:250,cartX:1250,cartTX:1250,oroX:1420,oroTX:1420,smithA:0,oroA:Math.PI,gold:0,coins:[]},plate:false};
 const cv=v.querySelector('canvas'),g=cv.getContext('2d');
 const end=(skipped)=>{if(!film)return;cancelAnimationFrame(film.raf);for(let k=film.i+1;k<beats.length;k++)beats[k].enter?.(film.w,true);v.remove();const d=film.done;film=null;d?.(skipped);};
 const next=()=>{const f=film;f.i++;f.bt=0;f.typed=0;const b=beats[f.i];if(!b){end(false);return;}b.enter?.(f.w,false);f.beat=b;v.querySelector('.bwi-bubble b').textContent=b.who==='smith'?smithName():b.who==='oro'?NAME:b.who||'';v.querySelector('.bwi-bubble p').textContent='';v.querySelector('[data-bwi="next"]').textContent=f.i===beats.length-1?(kind==='arena'?'VERSTANDEN ▸':'LOS GEHT’S ▸'):'WEITER ▸';};
 const tap=()=>{const f=film;if(!f)return;const txt=f.beat?.say||'';if(f.typed<txt.length){f.typed=txt.length;v.querySelector('.bwi-bubble p').textContent=txt;}else next();};
 v.addEventListener('click',e=>{const b=e.target.closest('[data-bwi]');if(!b){if(e.target.closest('canvas,.bwi-bubble')&&film)tap();return;}e.stopPropagation();if(b.dataset.bwi==='skip')end(true);else tap();},true);
 const frame=now=>{if(!film)return;const dt=Math.min(.05,film.last?(now-film.last)/1000:0);film.last=now;film.t+=dt;film.bt+=dt;const b=film.beat;
  if(b){const txt=b.say,n=Math.min(txt.length,Math.floor(film.bt*44));if(n!==film.typed&&film.typed<txt.length){film.typed=n;v.querySelector('.bwi-bubble p').textContent=txt.slice(0,n);}}
  try{render(g,film,dt);}catch(e){console.error(e);}
  film.raf=requestAnimationFrame(frame);};
 next();film.raf=requestAnimationFrame(frame);}
M.bowyerFilm={get active(){return !!film;},get state(){return film;},tap:()=>film&&film.v.querySelector('[data-bwi="next"]').click()};

// ---------- Bilder ----------
function render(g,f,dt){const b=f.beat||{},w=f.w,t=f.t,bt=f.bt,talking=f.typed<(b.say||'').length;g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;g.fillStyle='#0d0907';g.fillRect(0,0,FW,FH);
 // Bewegung der Figuren im Hof
 const step=(k,tk,sp)=>{const d=w[tk]-w[k];if(Math.abs(d)<1){w[k]=w[tk];return 0;}const m=Math.sign(d)*Math.min(Math.abs(d),sp*dt);w[k]+=m;return Math.sign(d);};
 const sm=step('smithX','smithTX',150),cm=step('cartX','cartTX',170),om=step('oroX','oroTX',170);cart.spin=(cart.spin||0)+cm*dt*3.2;
 const shot=b.shot||'wide';
 if(shot==='face'){oroFace(g,FW,FH,t,{mood:talking&&Math.floor(t*7)%2?'roar':(b.mood||'grin'),yaw:b.yaw??-.28,zoom:1.04+.05*ease(bt/4)});grain(g,t);vignette(g);if(b.plate)plate(g,bt,NAME,'Bogenhändler aus Syrien · Pfeil im Kopf seit vierzehn Jahren','#e6b42a');}
 else if(shot==='item'){itemShot(g,b,t,bt,talking);}
 else if(shot==='arena'||shot==='rules'){arenaShot(g,b,t,bt,talking);}
 else{// Totale im Trainingshof
  const cz=b.zoom||1,cxm=b.cx||FW/2,cym=b.cy||FH/2;g.save();g.translate(FW/2,FH/2);g.scale(cz,cz);g.translate(-cxm,-cym);
  if(LUDUSCROP){g.drawImage(LUDUSCROP,0,0);}else{g.fillStyle='#c9a86a';g.fillRect(0,0,FW,FH);}
  g.fillStyle='rgba(8,4,2,.22)';g.fillRect(0,0,FW,FH);
  const GY=478,K=4.2;
  const list=[{y:GY,draw:()=>cart(g,w.cartX,GY,4,t)},
   {y:GY+2,draw:()=>{const walk=Math.abs(w.oroTX-w.oroX)>1;drawOro(g,w.oroX,GY+2,K,{a:w.oroA,state:walk?'move':'idle',moveSpeed:walk?40:0,phase:t*6,traderPose:walk?null:(b.who==='oro'?(b.gesture||(talking?'rant':null)):null),gest:t*3});}},
   {y:GY+1,draw:()=>{if(w.smithX<-120)return;const walk=Math.abs(w.smithTX-w.smithX)>1;drawActor(g,actor(smithG(),{a:w.smithA,state:walk?'move':'idle',moveSpeed:walk?40:0,phase:t*6,forgeHold:'beer',forgePose:walk?'':(b.pose||''),traderPose:walk?null:(b.who==='smith'?(b.gesture||(talking?'point':null)):null),gest:t*3}),w.smithX,GY+1,K);}}];
  list.sort((a,c)=>a.y-c.y);for(const it of list)it.draw();
  // Münzen
  for(const c of w.coins){const u=t-c.t0;if(u<0||u>2.2)continue;const x=c.x+c.vx*u,y=Math.min(GY-4,c.y+c.vy*u+600*u*u);px(g,x-4,y-4,10,10,'#7a5510');px(g,x-2,y-2,7,7,'#e6b42a');px(g,x-2,y-2,2,2,'#fff0a0');}
  g.restore();grain(g,t);vignette(g);
  if(w.gold>0){const k=ease((t-w.goldT)/.4);g.save();g.globalAlpha=cl((t-w.goldT)*3,0,1);g.textAlign='center';g.textBaseline='middle';g.font='900 '+Math.round(54+20*(1-k))+'px "Courier Prime",monospace';g.fillStyle='#000';g.fillText('+'+w.gold+' GOLD',FW/2+3,96+3);g.fillStyle='#ffd25a';g.fillText('+'+w.gold+' GOLD',FW/2,96);
   g.font='700 18px "Courier Prime",monospace';g.fillStyle='#f3e2b0';g.fillText('Geliehen von Orontes · Zinsen: „ein kleiner Finger“',FW/2,140);g.restore();}}
 if(bt<.08){g.fillStyle='rgba(255,248,230,'+((1-bt/.08)*.3).toFixed(2)+')';g.fillRect(0,0,FW,FH);}}
function grain(g,t){for(let i=0;i<90;i++){const x=hr(i*3.1+Math.floor(t*24)*.37)*FW,y=hr(i*7.7+Math.floor(t*24)*.91)*FH;g.fillStyle=i%2?'rgba(255,240,210,.05)':'rgba(0,0,0,.1)';g.fillRect(Math.round(x),Math.round(y),3,3);}}
function vignette(g){const v=g.createRadialGradient(FW/2,FH*.45,FH*.32,FW/2,FH/2,FW*.68);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.5)');g.fillStyle=v;g.fillRect(0,0,FW,FH);}
function plate(g,bt,name,sub,col){const a=1-Math.pow(1-cl((bt-.2)/.4,0,1),3),x=28-(1-a)*420,y=FH-118;g.save();g.globalAlpha=cl(a,0,1);g.font='900 40px "Courier Prime",monospace';const nw=Math.max(g.measureText(name).width,(g.font='700 16px "Courier Prime",monospace',g.measureText(sub).width))+40;
 g.fillStyle='rgba(10,6,4,.84)';g.fillRect(x,y,nw,86);g.fillStyle=col;g.fillRect(x,y,6,86);g.textAlign='left';g.textBaseline='middle';g.font='900 40px "Courier Prime",monospace';g.fillStyle='#000';g.fillText(name,x+23,y+33);g.fillStyle=col;g.fillText(name,x+20,y+31);g.font='700 16px "Courier Prime",monospace';g.fillStyle='#f3e2b0';g.fillText(sub,x+20,y+66);g.restore();}
// Ware in Großaufnahme: die Waffe des Spiels, groß auf dunklem Tuch, daneben die echten Werte
function itemShot(g,b,t,bt,talking){const d=b.def,wd=M.weaponDefs.find(x=>x.id===d);
 const bg=g.createLinearGradient(0,0,0,FH);bg.addColorStop(0,'#3a0f14');bg.addColorStop(1,'#1a0608');g.fillStyle=bg;g.fillRect(0,0,FW,FH);for(let y=0;y<FH;y+=6)for(let x=(y/6)%2*6;x<FW;x+=12){g.fillStyle='rgba(0,0,0,.08)';g.fillRect(x,y,6,6);}
 const sw=Math.sin(t*1.3)*.04,k=ease(bt/.5);try{M.weaponArt.draw(g,item(d,2),{x:330,y:FH/2+10,angle:(d==='bow'?-Math.PI/2:-Math.PI/2)+sw,scale:lerp(5,d==='bow'?8.5:7,k),blood:0,drips:false});}catch(e){}
 // kleines Gesicht von Orontes oben rechts
 const pc=document.createElement('canvas');pc.width=240;pc.height=150;oroFace(pc.getContext('2d'),240,150,t,{mood:talking&&Math.floor(t*7)%2?'roar':'grin',zoom:1.0});g.fillStyle='#2a1a10';g.fillRect(FW-268,22,248,158);g.drawImage(pc,FW-264,26);
 // Werte
 const rows=[['SCHADEN',wd.damage],['SCHUSSFOLGE','alle '+String(wd.delay).replace('.',',')+' s'],['MUNITION',wd.ammo+(d==='bow'?' Pfeile':' Bolzen')],['DURCHSCHLAG',Math.round(wd.pen*100)+' %'],['REICHWEITE',wd.range],['ZUGSTÄRKE',(d==='bow'?'30–100':'100–400')+' Pfd.']];
 const x0=FW-430,y0=212;g.fillStyle='rgba(10,6,4,.82)';g.fillRect(x0,y0,410,48+rows.length*40);g.strokeStyle='#e6b42a';g.lineWidth=2;g.strokeRect(x0,y0,410,48+rows.length*40);
 g.textBaseline='middle';g.textAlign='left';g.font='900 26px "Courier Prime",monospace';g.fillStyle='#ffd25a';g.fillText(wd.name.toUpperCase(),x0+18,y0+26);
 rows.forEach((r,i)=>{const a=cl((bt-.3-i*.25)/.25,0,1);g.globalAlpha=a;const y=y0+70+i*40;g.font='800 14px "Courier Prime",monospace';g.fillStyle='#c9b48a';g.fillText(r[0],x0+18,y);g.textAlign='right';g.font='700 22px "Courier Prime",monospace';g.fillStyle='#f3e2b0';g.fillText(String(r[1]),x0+392,y);g.textAlign='left';g.globalAlpha=1;});
 grain(g,t);vignette(g);}
// Arena: Orontes, dein neuer Fernkämpfer und ein Rekrut mit Apfel – oder die Regeltafel
let ARENAC=null;
function arenaShot(g,b,t,bt,talking){if(!ARENAC){ARENAC=document.createElement('canvas');ARENAC.width=FW;ARENAC.height=FH;}const q=ARENAC.getContext('2d');try{ART.arena(q,FW,FH,t,{cheer:1});}catch(e){q.fillStyle='#5a3a24';q.fillRect(0,0,FW,FH);}g.drawImage(ARENAC,0,0);
 const GY=FH-40,st=ST(),rec=S().roster.find(x=>x.id===st.recruit)||S().roster.find(x=>x.role==='Fernkämpfer');
 if(rec){const aim=b.aim?1:0;drawActor(g,{...actor(rec),forgeWorker:false,a:-.08*aim,wind:aim?.02:0,windMax:1,ammo:aim?1:0,fullDraw:true},430,GY,4.0);}
 // Ziel ganz hinten: ein Rekrut am Pfahl mit Apfel
 const tx=840,ty=GY-26;px(g,tx+6,ty-120,10,124,'#3a2414');px(g,tx+8,ty-120,4,124,'#6b4628');
 drawActor(g,{...actor(TARGET()),forgeWorker:false,a:Math.PI,shackled:true},tx,ty,2.2);{const ax=tx-1,ay=ty-122;for(const [dx,dy,w,h,c] of [[-8,-6,16,14,'#2a0c08'],[-7,-5,14,12,'#c8321f'],[-5,-6,10,14,'#c8321f'],[-5,-3,4,3,'#ff8a6a'],[-1,-11,2,6,'#3a2414'],[1,-11,5,3,'#4a7a2a']])px(g,ax+dx,ay+dy,w,h,c);}
 drawOro(g,190,GY,4.2,{a:0,traderPose:b.who==='oro'?(b.gesture||(talking?'rant':null)):null,gest:t*3,phase:t*3});
 if(b.shot==='rules'){const R=b.rules||[];g.fillStyle='rgba(8,5,3,.86)';g.fillRect(250,40,FW-290,60+R.length*50);g.strokeStyle='#e6b42a';g.lineWidth=2;g.strokeRect(250,40,FW-290,60+R.length*50);
  g.textAlign='left';g.textBaseline='middle';g.font='900 28px "Courier Prime",monospace';g.fillStyle='#ffd25a';g.fillText(b.title||'APFELSCHUSS',272,72);
  R.forEach((r,i)=>{const a=cl((bt-.2-i*.35)/.3,0,1);g.globalAlpha=a;const y=118+i*50;g.font='22px "Courier Prime",monospace';g.fillText(r[0],272,y);g.font='800 15px "Courier Prime",monospace';g.fillStyle='#e6b42a';g.fillText(r[1],316,y-10);g.font='600 17px "Courier Prime",monospace';g.fillStyle='#f3e2b0';g.fillText(r[2],316,y+12);g.globalAlpha=1;});}
 grain(g,t);vignette(g);}
let TGT=null;const TARGET=()=>TGT??=makeG(5150,g=>{Object.assign(g,{id:'apple-target',name:'Apfelträger',height:174});});

// ---------- Drehbuch 1: Der Schmied zeigt auf den Neuen, Orontes erklärt Bogen und Armbrust und leiht Gold ----------
function beats1(){return [
 {who:'smith',say:`${lanName()}. Du willst Fernkämpfer? Dann vergiss mich. Ich bin Schmied, kein Holzschnitzer. Bögen und Armbrüste fasse ich nicht an. Nie gemacht, mach ich nicht.`,gesture:'point',enter:w=>{w.smithTX=250;}},
 {who:'smith',say:'Für den Kram gibt es einen Spezialisten. Da kommt er schon. Ich hab ihn nicht eingeladen. Er kommt trotzdem jedes Mal. Wie Durchfall.',gesture:'rant',enter:w=>{w.cartTX=640;w.oroTX=810;}},
 {who:'smith',say:'Das ist Orontes. Er verkauft Bögen. Er ist verrückt. Ich bin raus. Prost.',pose:'sip',enter:(w,skip)=>{w.cartX=w.cartTX=640;w.oroX=w.oroTX=810;}},
 {who:'oro',shot:'wide',say:'Ist er weg? Gut. Der Mann schmiedet Schwerter wie ein Ochse, der Liebesbriefe schreibt.',gesture:'rant',enter:w=>{w.smithTX=-260;w.smithA=Math.PI;w.oroTX=470;}},
 {who:'oro',shot:'face',plate:1,say:'Orontes Pfeilkopf! Bögen, Armbrüste, Pfeile, Bolzen – und Ratschläge, die keiner hören will!',mood:'grin',enter:w=>{w.smithX=w.smithTX=-260;w.oroX=w.oroTX=470;}},
 {who:'oro',shot:'face',say:'Ja, ihr starrt auf den Pfeil. Alle starren auf den Pfeil. Belagerung von Dura, vor vierzehn Jahren. Der Medicus sagte: Ziehst du ihn raus, stirbst du.',mood:'calm'},
 {who:'oro',shot:'face',say:'Der Medicus ist inzwischen tot. Der Pfeil ist noch da. Seitdem treffe ich besser. Und ich höre Farben.',mood:'dumb'},
 {who:'oro',shot:'wide',zoom:1.55,cx:640,cy:330,say:'Bögen und Armbrüste gibt es nur bei mir. Der Schmied rührt kein Holz an – zu fein für seine Wurstfinger. Mein Karren steht ab jetzt hier im Trainingshof.',gesture:'point'},
 {who:'oro',shot:'item',def:'bow',say:'Der Bogen. Leicht, schnell, achtzehn Pfeile im Köcher, ein Schuss alle zwei Sekunden. Zugstärke 30 bis 100 Pfund. Braucht Präzision, Geschick und Arme, die nicht nach Haferbrei aussehen.'},
 {who:'oro',shot:'item',def:'crossbow',say:'Die Armbrust. Doppelter Schaden, geht durch fast jede Rüstung. 100 bis 400 Pfund – gespannt mit der Winde, nicht mit dem Arm. Darum zielt auch ein Schwächling damit gerade. Aber das Spannen dauert ewig, und es sind nur zwölf Bolzen.'},
 {who:'oro',shot:'face',mood:'determined',say:'Das Pfund ist die Zugstärke. Mehr Pfund, mehr Schaden – ein bisschen. Eine bessere Waffe bleibt trotzdem besser, auch bei gleichem Pfund. Dafür dauert Spannen und Nachladen länger. Starke Männer laden schneller, aber nie mehr als anderthalbmal so lang wie leichte Waffen.'},
 {who:'oro',shot:'face',mood:'grin',say:'Beim Bogen gilt: Wer einen zu schweren Bogen zieht, zittert und trifft daneben. Ab etwa sechzig Stärke hält man selbst hundert Pfund ruhig. Die Armbrust ist die Waffe für schwache Anfänger. Der Bogen ist die Waffe für Meister – geübt und kräftig schießt er am Ende schneller und gefährlicher als jede Armbrust.'},
 {who:'oro',shot:'face',say:'Fernkämpfer brauchst du trotzdem erst mal. Und die wachsen nicht auf Bäumen. Die stehen beim Sklavenhändler und riechen nach Angst.',mood:'confident'},
 {who:'oro',shot:'wide',say:`Darum leihe ich dir ${LOAN} Gold. Weil ich ein Herz habe. Ich habe es in einem Glas, zu Hause. Zinsen? Nur ein kleiner Finger. Von ihm, nicht von dir.`,gesture:'shout',enter:(w,skip)=>{giveLoan(w);}},
 {who:'oro',shot:'face',say:'Kauf dir einen Rekruten auf dem Sklavenmarkt. Dann sag ich dir, ob er zum Schießen taugt – oder nur zum Danebenstehen.',mood:'grin'}];}
function giveLoan(w){const st=ST();if(!st.loan){st.loan=LOAN;S().gold+=LOAN;try{M.persist();}catch{}}if(w){w.gold=LOAN;w.goldT=film?film.t:0;const t0=film?film.t:0;w.coins=Array.from({length:26},(_,i)=>({t0:t0+i*.05,x:420+hr(i)*120,y:120,vx:(hr(i*3)-.5)*220,vy:-120-hr(i*5)*160}));}}

// ---------- Drehbuch 2: In der Arena – der Apfelschuss ----------
function beats2(){const rec=S().roster.find(x=>x.id===ST().recruit),n=rec?rec.name.split(' ')[0]:'dein Schütze';return [
 {who:'oro',shot:'arena',say:`Willkommen in meinem Lieblingsspiel! ${n} schießt. Einer deiner Rekruten trägt einen Apfel auf dem Kopf. Ganz einfach. Für den Schützen.`,gesture:'rant',aim:1},
 {who:'oro',shot:'rules',title:'APFELSCHUSS · SO GEHT’S',rules:[['🏹','SCHÜTZE','Ein Fernkämpfer mit Bogen oder Armbrust'],['🍎','APFELTRÄGER','Ein Rekrut deiner Wahl – je wertvoller, desto mehr Gold'],['📏','ENTFERNUNG','10 bis 400 Meter – weiter heißt schwerer und teurer'],['🔟','PFEILE','1 bis 10 hintereinander – Treffer in Folge +25 %']],say:'Du wählst den Schützen, den Apfelträger, die Entfernung und bis zu zehn Pfeile. Je schwerer der Schuss, desto mehr zahlt das Publikum.'},
 {who:'oro',shot:'arena',say:'Bevor es ernst wird, schießt dein Mann auf meine Strohpuppe. Probeschießen. Da siehst du selbst, wie oft er den Apfel trifft – und wie oft das Gesicht.',gesture:'point'},
 {who:'oro',shot:'arena',say:'Trifft er den Apfel: Gold und Jubel. Trifft er daneben: Pfeil weg, zwei Sesterzen. Trifft er den Rekruten: Blut, Medicus, manchmal Beerdigung. Das Publikum liebt alle drei.',gesture:'shout'},
 {who:'oro',shot:'face',say:'Bogen oder Armbrust? Beides geht. Die Armbrust verzeiht zittrige Hände, der Bogen nicht. Dafür ist der Bogen schneller wieder gespannt.',mood:'confident'},
 {who:'oro',shot:'arena',say:'Und jeder Schuss trainiert: Präzision, Bogenfertigkeit, Nerven. Wer überlebt, wird besser. Wer nicht überlebt, hat es hinter sich.',aim:1},
 {who:'oro',shot:'face',say:'So. Ab heute hast du Fernkämpfer. Mögen deine Pfeile treffen. Und deine Rekruten klein sein.',mood:'roar'}];}

// ---------- Geführte Schritte im Ludus ----------
let bar=null,tipBox=null,tips=[],snap=null;
function showBar(html){if(!bar){bar=document.createElement('div');bar.className='smith-intro-bar bow-bar';bar.setAttribute('role','status');document.body.appendChild(bar);}if(bar._h!==html){bar.innerHTML=html;bar._h=html;}}
function hideBar(){bar?.remove();bar=null;}
function tip(text,mood='grin',after){tips.push({text,mood,after});if(!tipBox)nextTip();else{const b=tipBox.querySelector('button');if(b)b.textContent='WEITER ▸';}}
function nextTip(){const tp=tips.shift();if(!tp){tipBox?.remove();tipBox=null;return;}if(!tipBox){tipBox=document.createElement('div');tipBox.id='bowTip';tipBox.setAttribute('role','dialog');tipBox.innerHTML='<div class="bwt-in"><canvas width="240" height="150"></canvas><div><b>'+esc(NAME)+'</b><p></p><button type="button">WEITER ▸</button></div></div>';document.body.appendChild(tipBox);
  tipBox.querySelector('button').onclick=()=>{const f=tipBox._cur?.after;nextTip();f?.();};const cv=tipBox.querySelector('canvas');let t0=performance.now();const loop=now=>{if(!tipBox)return;const t=(now-t0)/1000,typing=tipBox._typed<(tipBox._cur?.text.length||0);oroFace(cv.getContext('2d'),240,150,t,{mood:typing&&Math.floor(t*7)%2?'roar':tipBox._cur?.mood||'grin',zoom:1});
   if(typing){tipBox._typed=Math.min(tipBox._cur.text.length,Math.floor((now-tipBox._t0)/1000*46));tipBox.querySelector('p').textContent=tipBox._cur.text.slice(0,tipBox._typed);}requestAnimationFrame(loop);};requestAnimationFrame(loop);}
 tipBox._cur=tp;tipBox._t0=performance.now();tipBox._typed=0;tipBox.querySelector('p').textContent='';tipBox.querySelector('button').textContent=tips.length?'WEITER ▸':'OK ▸';}
const tipping=()=>!!tipBox;
// Talent für den Fernkampf, ehrlich und gemein
function talentLines(g){const sc=r=>{try{return M.scoutScore(g,r,true).score;}catch(e){return 50;}},fk=sc('Fernkämpfer'),best=['Soldat','Fernkämpfer','Assassine'].map(r=>[r,sc(r)]).sort((a,b)=>b[1]-a[1])[0],nm=g.name.split(' ')[0],L=[];
 const tier=fk>=best[1]-2&&fk>=55?'top':fk>=best[1]-8?'ok':'bad';
 if(tier==='top')L.push(`${nm}? Augen wie ein Habicht, Finger wie ein Taschendieb. Der ist zum Schießen geboren. Und zum Bezahlen meiner Ware.`);
 else if(tier==='ok')L.push(`${nm}. Mittelmaß. Er trifft ein Scheunentor. Von innen. Aber mit Übung wird das was – oder er wird Teil des Scheunentors.`);
 else L.push(`${nm}? Der trifft nicht mal den Boden, wenn er hinfällt. Eigentlich wäre er ein besserer ${best[0]}. Aber Talent wird überschätzt. Pfeile nicht.`);
 L.push(`Ob einer zum Fernkämpfer taugt, siehst du in der Kaserne: Klick ihn an, dann zeigen die Klassen, wie weit er es als Fernkämpfer bringen kann. ${tier==='bad'?'Bei ihm: nicht sehr weit. Aber weit genug für einen Apfel.':'Bei ihm sieht das gar nicht schlecht aus.'}`);
 L.push(`Jetzt in die Kaserne mit ihm und auf Fernkämpfer stellen. Das kleine 🏹. Ich warte. Ich habe Zeit. Der Pfeil in meinem Kopf auch.`);return {L,tier};}
function strengths(g){return [
 'Sieht doch gut aus. Die Stärken: Fernkämpfer stehen hinten. Hinten ist schön. Hinten stirbt man später. Sie schießen, bevor der Feind überhaupt da ist.',
 'Die Schwächen: Im Nahkampf nur ein Dolch, kein Schild. Steht der Feind erst mal vor ihm, ist es schnell vorbei. Aus der Nähe zittern sie und treffen schlechter. Und irgendwann ist der Köcher leer.'];}
const INVITE='Genug Schule. Ich habe dir in der Arena etwas vorbereitet. Mit Obst. Komm zum Arena-Tor.';
// Geschenk: nur der Dolch – Bogen oder Armbrust muss der Spieler an Orontes' Karren kaufen; anlegen muss er beides selbst
const hiPlace={buy:'market',role:'gladiators',equip:'gladiators',arena:'arena'};
function giveKit(g){const st=ST();if(st.given===g.id)return;const inv=S().inventory,free=d=>inv.find(i=>i.def===d&&!M.equippedBy?.(i.id));
 const d=M.gear(g,'secondary');if(!(d&&d.def==='dagger')&&!free('dagger'))inv.push(M.makeItem('weapon','dagger',1));
 st.given=g.id;try{M.persist();}catch{}}
const ownsRanged=g=>['bow','crossbow'].includes(M.gear(g,'weapon')?.def)||S().inventory.some(i=>['bow','crossbow'].includes(i.def)&&!M.equippedBy?.(i.id)&&(i.durability??1)>0);
const cheapRanged=()=>lbPrice('bow',0,30);
const kitOk=g=>({ranged:['bow','crossbow'].includes(M.gear(g,'weapon')?.def),melee:M.gear(g,'secondary')?.def==='dagger'});
function shopLines(g){const nm=g.name.split(' ')[0];return [
 `Da! Ein Fernkämpfer! Den Dolch schenke ich ${nm} – liegt schon in deinem Lager. Der Vorbesitzer braucht ihn nicht mehr. Lange Geschichte. Kurzes Ende.`,
 'Den Bogen schenke ich dir nicht. Ich bin Händler, kein Priester. Bögen und Armbrüste gibt es an meinem Karren im Trainingshof. Bogen: schnell und billig. Armbrust: langsam, teuer und gemein.',
 'Klick auf meinen Karren und such dir was aus. Für den Anfang reicht ein einfacher Bogen. Wenn du reich bist, nimm die Armbrust – dann bist du nicht mehr lange reich.',
 `Und achte auf die Pfund! ${nm} hat Stärke ${Math.round(g.stats.strength)} – einen Bogen bis ${M.drawComfort?M.drawComfort(g):60} Pfund hält er ruhig. Alles darüber macht mehr Schaden, aber er zittert und trifft schlechter. Bei der Armbrust ist das egal, da dauert nur das Nachladen länger.`];}
function kitLines(g){const nm=g.name.split(' ')[0],w=M.gear(g,'weapon')?.def==='crossbow'||S().inventory.some(i=>i.def==='crossbow'&&!M.equippedBy?.(i.id))?'die Armbrust':'den Bogen';return [
 `Gekauft ist gekauft. Keine Rückgabe, auch nicht als Leiche. Jetzt anlegen: Ein Fernkämpfer trägt immer BEIDES – ${w} als Fernwaffe und den Dolch für den Nahkampf. Ohne Fernwaffe ist er ein Mann mit Dolch. Ohne Dolch ist er ein Mann, der gleich einen Speer im Bauch hat.`,
 `Ohne beides lässt ihn die Arena gar nicht erst rein. Kaserne → bei ${nm} auf AUSRÜSTEN → „Aus der Waffenkammer ausrüsten“. Oder unter „Volle Waffenkammer“ selbst: ${w} als Fernwaffe, Dolch für den Nahkampf. Einen Schild gibt es nicht – Bogen und Armbrust brauchen beide Hände. Meine Geduld auch.`];}
function statLines(g){return [
 'Und jetzt Schule. Was zählt beim Schießen? Erstens: PRÄZISION. Das Wichtigste überhaupt. Wer keine hat, schießt Löcher in den Himmel – und manchmal in den Lanista.',
 'Zweitens: GESCHICK – ruhige Finger, sauberes Loslassen. Drittens: die WAFFENFERTIGKEIT. Bogen und Armbrust lernt man getrennt, beide wachsen mit jedem Schuss. Und mit jedem Toten. Meistens mit dem Schuss.',
 'Dann TAKTIK, damit er weiß, auf wen er zielt. BEWEGLICHKEIT und REFLEXE, damit er weg ist, bevor der Feind da ist. Kraft? Überschätzt. Ein Fernkämpfer muss nicht stark sein. Nur weit weg.',
 'Bogen oder Armbrust? Der Bogen schießt schnell, alle zwei Sekunden, achtzehn Pfeile im Köcher – aber jeder beißt nur ein bisschen. Die Armbrust spannt ewig und hat nur zwölf Bolzen. Dafür bleibt liegen, was sie trifft. Rüstung? Lacht sie aus.',
 'Und die STÄRKE? Die zählt bei uns über die Pfund. Mehr Pfund, mehr Schaden – aber Spannen und Nachladen dauern länger, höchstens anderthalbmal so lang. Ein starker Schütze lädt schneller. Und beim Bogen: Ist er schwerer, als die Arme können, wackelt der Schuss.',
 'Darum die Armbrust für Anfänger: Sie zielt immer gleich gut, egal wie dünn die Arme sind. Der Bogen ist die Waffe für Meister. Gut trainiert und stark genug, schießt er am Ende schneller und tödlicher als jede Armbrust. Aber bis dahin trifft dein Bogenschütze vor allem Tauben.'];}
// Den nächsten Knopf in der Kaserne sanft pulsieren lassen
function markBtn(act){document.querySelectorAll('.bow-hl').forEach(e=>{if(e.dataset.action!==act)e.classList.remove('bow-hl');});const b=document.querySelector(`[data-action="${act}"]`);if(b&&!b.classList.contains('bow-hl'))b.classList.add('bow-hl');}
function step(dt){const st=ST(),s=S();if(!s||!s.lanista)return;
 if(document.querySelector('.bow-shop')){hideBar();return;}
 // Offene Fenster (Kauf, Kaserne) haben Vorrang: keine Leiste, Tipps warten – der Ablauf läuft aber weiter
 const mo=document.getElementById('modal'),open=!!(mo&&mo.hidden===false);if(open){hideBar();if(tipBox)tipBox.style.display='none';}else if(tipBox&&tipBox.style.display==='none')tipBox.style.display='';
 const bar=h=>{if(!open)showBar(h);};
 if(['buy','role','shopbow','equip','arena','apple'].includes(st.stage)&&!film&&!tipping()&&!s.battle){
  if(st.stage==='buy'){const fresh=s.roster.find(g=>!g.dead&&!snap?.has(g.id)&&!g.smithDuty);if(fresh){st.recruit=fresh.id;st.stage='role';hideBar();const {L}=talentLines(fresh);L.forEach((x,i)=>tip(x,i===0?'grin':'confident'));try{M.persist();}catch{}return;}
   bar(`<p><b>${esc(SHORT)}</b> hat dir ${LOAN} Gold geliehen.</p><p class="hint">Kauf einen Rekruten auf dem Sklavenmarkt.</p>`);}
  else if(st.stage==='shopbow'){const g=s.roster.find(x=>x.id===st.recruit&&!x.dead);if(!g){st.stage='buy';snap=new Set(s.roster.map(x=>x.id));return;}
   if(ownsRanged(g)){st.stage='equip';hideBar();kitLines(g).forEach((x,i)=>tip(x,['grin','confident'][i]));try{M.persist();}catch{}return;}
   markBtn('-');bar(`<p>Kauf an <b>${esc(SHORT)}' Karren</b> einen Bogen oder eine Armbrust.</p><p class="hint">${M.ui.getPage()==='home'?'Der Karren steht im Trainingshof – anklicken.':'Zurück in den Ludus → Karren im Trainingshof anklicken.'} · Dein Gold: ${s.gold}</p>`);}
  else if(st.stage==='role'||st.stage==='equip'){const g=s.roster.find(x=>x.id===st.recruit&&!x.dead);if(!g){st.stage='buy';snap=new Set(s.roster.map(x=>x.id));return;}
   if(st.stage==='role'){if(g.role==='Fernkämpfer'){giveKit(g);hideBar();if(ownsRanged(g)){st.stage='equip';const k=kitOk(g);if(!(k.ranged&&k.melee))kitLines(g).forEach((x,i)=>tip(x,['grin','confident'][i]));}else{st.stage='shopbow';shopLines(g).forEach((x,i)=>tip(x,['grin','roar','confident'][i]));
     const need=cheapRanged();if(s.gold<need){const add=need-s.gold+5;s.gold+=add;st.loan=(st.loan||0)+add;tip(`Kein Geld für einen Bogen? Ich leihe dir noch ${add} Gold dazu. Auf die gleichen Zinsen. Du hast ja noch neun Finger.`,'grin');}}try{M.persist();}catch{}return;}
    bar(`<p>Stell <b>${esc(g.name)}</b> auf <b>Fernkämpfer 🏹</b>.</p><p class="hint">Kaserne → ${esc(g.name.split(' ')[0])} anklicken → Klasse „Fernkämpfer“.</p>`);}
   else{if(g.role!=='Fernkämpfer'){st.stage='role';return;}const k=kitOk(g);
    if(k.ranged&&k.melee){st.stage='arena';hideBar();[...strengths(g),...statLines(g),INVITE].forEach((x,i)=>tip(x,['grin','calm','confident','grin','calm','determined','roar'][i%7]));try{M.persist();}catch{}return;}
    bar(`<p>Leg <b>${esc(g.name)}</b> Bogen <i>und</i> Dolch an.</p><p class="hint">${k.ranged?'✅':'⬜'} Fernwaffe: Bogen/Armbrust · ${k.melee?'✅':'⬜'} Nahkampf: Dolch — Kaserne → ${esc(g.name.split(' ')[0])} → AUSRÜSTEN</p>`);}
   {const au=document.querySelector(`[data-action="eq:auto:${g.id}"]:not([disabled])`);markBtn(st.stage==='role'?`barracks:class:${g.id}:Fernkämpfer`:au?`eq:auto:${g.id}`:`barracks:fold:${g.id}:equip`);if(au&&st.stage==='equip'&&au._bowSeen!==1){au._bowSeen=1;try{au.scrollIntoView({block:'center',behavior:'smooth'});}catch{}}}}
  else if(st.stage==='arena'){markBtn('-');bar(`<p>${esc(SHORT)} wartet in der Arena.</p><p class="hint">Arena-Tor → HUMAN → <b>APFELSCHUSS</b></p>`);}
  else hideBar();}
 else if(!['buy','role','shopbow','equip','arena'].includes(st.stage))hideBar();}
function startTutorial(){const st=ST();if(film)return;st.stage='film';snap=new Set(S().roster.map(g=>g.id));
 M.ui.close?.();playFilm('ludus',beats1(),()=>{giveLoan(null);st.stage='buy';snap=new Set(S().roster.map(g=>g.id));try{M.persist();}catch{}});}
function startArenaFilm(){const st=ST();if(film)return;playFilm('arena',beats2(),()=>{st.stage='done';try{M.persist();}catch{}hideBar();
 tip('Fortan gilt: Bögen und Armbrüste gibt es bei mir am Karren im Trainingshof. Der Apfelschuss wartet in der Arena unter HUMAN – einmal am Tag. Und wenn dir ein Rekrut wegstirbt – ich kenne einen Bestatter. Er nimmt auch Pfeile.','grin',()=>{try{openApple();}catch(e){console.error(e);}});});}

// ---------- Ludus: Karren und Orontes im Trainingshof, Markierung des nächsten Ziels ----------
const CART={x:372,y:522};
const overlay=M.ludusOverlay;M.ludusOverlay=(g,t)=>{overlay?.(g,t);const st=ST();
 if(['buy','role','shopbow','equip','arena','apple','done'].includes(st.stage)){cart(g,CART.x,CART.y,.55,t);drawOro(g,CART.x+34,CART.y+2,1,{a:Math.PI,traderPose:Math.floor(t/6)%3===0?'point':null,gest:t*3,phase:t*3});
  // Sprechblase ab und zu
  const k=Math.floor(t/9)%BARKS.length,u=t%9;if(u<3.4){g.save();g.font="700 9px 'Courier Prime',monospace";const txt=BARKS[k],tw=g.measureText(txt).width+10,bx=Math.round(CART.x+34-tw/2),by=CART.y-70;g.fillStyle='rgba(20,30,28,.92)';g.fillRect(bx,by,tw,15);g.strokeStyle='#bca77b';g.strokeRect(bx+.5,by+.5,tw-1,14);g.fillStyle='#f0e3c4';g.textBaseline='middle';g.fillText(txt,bx+5,by+8);g.restore();}}
 if(st.stage==='shopbow'&&!film&&!tipping()){const pulse=(Math.sin(t*5)+1)/2;g.save();g.strokeStyle='#f4d37a';g.globalAlpha=.55+pulse*.45;g.lineWidth=3+pulse*2;g.strokeRect(CART.x-34-pulse*3,CART.y-56-pulse*3,96+pulse*6,66+pulse*6);g.fillStyle='#f4d37a';for(let n=0;n<3;n++)g.fillRect(CART.x+6+n*2,CART.y-82-pulse*6+n*4,14-n*4,4);g.restore();}
 const pr=hiPlace[st.stage];if(pr&&!film&&!tipping()){const p=M.ludus.places.find(p=>p.route===pr);if(p){const pulse=(Math.sin(t*5)+1)/2;g.save();g.strokeStyle='#f4d37a';g.globalAlpha=.55+pulse*.45;g.lineWidth=3+pulse*2;g.strokeRect(p.x-6-pulse*3,p.y-8-pulse*3,p.w+12+pulse*6,p.h+16+pulse*6);g.fillStyle='#f4d37a';for(let n=0;n<3;n++)g.fillRect(p.x+p.w/2-7+n*2,p.y-30-pulse*6+n*4,14-n*4,4);g.restore();}}};
const BARKS=['Bögen! Armbrüste! Keine Rückgabe!','Frische Pfeile! Fast nicht benutzt!','Der Pfeil im Kopf? Deko.','Armbrust kaufen, Arzt sparen!','Wer zittert, zahlt doppelt.'];
// Karren anklicken: Laden (eigener Klick auf das Ludus-Bild; die Gebäudeliste des Ludus bleibt unverändert)
document.addEventListener('click',e=>{const c=e.target;if(!c||c.id!=='ludusCanvas'||!['buy','role','shopbow','equip','arena','apple','done'].includes(ST().stage))return;const r=c.getBoundingClientRect(),x=(e.clientX-r.left)*900/r.width,y=(e.clientY-r.top)*670/r.height;
 if(x>=CART.x-26&&x<=CART.x+44&&y>=CART.y-46&&y<=CART.y+4){e.stopImmediatePropagation();e.preventDefault();shop();}},true);
// Laden: Bogen und Armbrust in fünf Klassen, Zugstärke (Pfund) frei wählbar – mehr Pfund kostet etwas mehr
const lbOpts=d=>{const D=M.DRAW?.[d]||{min:d==='bow'?30:100,max:d==='bow'?100:400};const st=d==='bow'?10:50,o=[];for(let v=D.min;v<=D.max;v+=st)o.push(v);return o;};
const lbPrice=(d,q,lb)=>{const D=M.DRAW?.[d];const k=D?(lb-D.min)/(D.max-D.min):.5;return Math.round(M.itemPrice('weapon',d,q)*1.15*(.9+.3*k));};
function shopFor(){const st=ST(),s=S();return s.roster.find(x=>x.id===st.recruit&&!x.dead&&x.role==='Fernkämpfer')||s.roster.find(x=>!x.dead&&x.role==='Fernkämpfer')||null;}
let shopSel={};
function shop(){const s=S(),g=shopFor(),comf=g&&M.drawComfort?M.drawComfort(g):60,rows=[];
 for(const d of ['bow','crossbow'])for(let q=0;q<=4;q++){const key=d+q,opts=lbOpts(d);let lb=shopSel[key];if(!opts.includes(lb))lb=d==='bow'?opts.filter(v=>v<=comf).pop()||opts[0]:150;rows.push({d,q,lb,opts,p:lbPrice(d,q,lb)});}
 const qn=i=>(M.gearQuality?.[i]?.name)||M.gearQuality?.[i]||['Einfach','Solide','Gut','Meisterlich','Legendär'][i];
 const tip=g?`<p class="hint bow-shop-tip">Für <b>${esc(g.name)}</b> (Stärke ${Math.round(g.stats.strength)}): Bogen bis <b>${comf} Pfd.</b> ohne Zitterhand. Schwerer = mehr Schaden, aber er zielt schlechter. Armbrust: Pfund egal fürs Zielen, nur das Nachladen dauert länger.</p>`:`<p class="hint bow-shop-tip">Mehr Pfund = mehr Schaden, längeres Spannen. Beim Bogen braucht es Kraft (ab etwa 60 Stärke sitzen 100 Pfd.), sonst leidet das Zielen. Die Armbrust zielt unabhängig von der Kraft.</p>`;
 M.ui.modal('Orontes Pfeilkopf · Bögen & Armbrüste',`<div class="bow-shop"><p class="hint">„Alles getestet. Meistens an Menschen.“ · Dein Gold: <b>${s.gold}</b></p>${tip}${rows.map(r=>`<div class="bow-row"><canvas data-bowicon="${r.d}:${r.q}" width="120" height="60"></canvas><div><b>${r.d==='bow'?'Bogen':'Armbrust'}</b><small>${esc(typeof qn(r.q)==='string'?qn(r.q):'Stufe '+r.q)}</small><label class="bow-lb">Zugstärke <select data-bowlb="${r.d}:${r.q}">${r.opts.map(v=>`<option value="${v}"${v===r.lb?' selected':''}>${v} Pfd.${r.d==='bow'&&g&&v>comf?' ⚠':''}</option>`).join('')}</select></label></div><button class="btn${s.gold>=r.p?' primary':''}" data-action="bowyer:buy:${r.d}:${r.q}:${r.lb}" ${s.gold>=r.p?'':'disabled'}>${r.p} Gold</button></div>`).join('')}</div>`);
 setTimeout(()=>{for(const c of document.querySelectorAll('[data-bowicon]')){const [d,q]=c.dataset.bowicon.split(':'),x=c.getContext('2d');x.imageSmoothingEnabled=false;x.fillStyle='#1d282b';x.fillRect(0,0,120,60);try{M.weaponArt.draw(x,item(d,+q),{x:60,y:30,angle:d==='bow'?-Math.PI/2:0,scale:d==='bow'?2.2:1.9,blood:0,drips:false});}catch(e){}}
  for(const sel of document.querySelectorAll('[data-bowlb]'))sel.addEventListener('change',()=>{const [d,q]=sel.dataset.bowlb.split(':');shopSel[d+q]=+sel.value;const sc=document.querySelector('.bow-shop')?.closest('#modal')?.scrollTop;shop();const m=document.getElementById('modal');if(m&&sc!=null)m.scrollTop=sc;});},30);}
const click=M.schoolClick;M.schoolClick=action=>{if(/^barracks:class:.*:Fernkämpfer$/.test(action)&&!rangedOpen()){M.ui.notify?.('Gesperrt: Fernkämpfer gibt es erst, wenn der Bogenhändler in deinen Ludus kommt.');return true;}
 if(action.startsWith('bowyer:buy:')){const [, , d,q,lb0]=action.split(':'),lb=+lb0||(d==='bow'?50:150),p=lbPrice(d,+q,lb);if(S().gold>=p){S().gold-=p;S().inventory.push(M.makeItem('weapon',d,+q,'metal',lb));try{M.persist();}catch{}M.ui.notify?.('Gekauft: '+(d==='bow'?'Bogen':'Armbrust')+' mit '+lb+' Pfd. · „Keine Rückgabe. Auch nicht als Leiche.“');}shop();return true;}
 return click(action);};
// Der Schmied verkauft keine Bögen und Armbrüste mehr
const RANGED=['bow','crossbow'],isRanged=d=>RANGED.includes(d);
function noSmithBows(){const F=M.workshop?.state;if(!F)return;if(Array.isArray(F.offers))F.offers=F.offers.filter(i=>!isRanged(i?.def));if(Array.isArray(F.queue))F.queue=F.queue.filter(i=>!isRanged(i?.def||i?.item?.def));if(Array.isArray(F.recipes))F.recipes=F.recipes.filter(id=>!/^weapon\/(bow|crossbow)\//.test(String(id)));}
// Die Schmiede hat Bögen und Armbrüste nie im Sortiment: aus den Kategorien der Schmiede entfernen (Rezepte, Bestellungen, Anzeige)
for(const list of [M.forgeCategories,M.workshop?.categories])if(Array.isArray(list))for(let i=list.length-1;i>=0;i--)if(list[i]?.kind==='weapon'&&isRanged(list[i].def))list.splice(i,1);
if(Array.isArray(M.workshop?.recipes))for(let i=M.workshop.recipes.length-1;i>=0;i--)if(isRanged(M.workshop.recipes[i]?.def))M.workshop.recipes.splice(i,1);
// Fernkämpfer gibt es erst, wenn Orontes da ist: vorher ist die Klasse in der Kaserne gesperrt
const rangedOpen=()=>['role','shopbow','equip','arena','apple','done'].includes(ST().stage);
// Bestehende Fernkämpfer aus älteren Spielständen bleiben, wie sie sind – gesperrt ist nur das neue Umstellen
function lockRanged(){if(rangedOpen())return;
 for(const b of document.querySelectorAll('[data-action^="barracks:class:"][data-action$=":Fernkämpfer"]')){if(b.classList.contains('bow-locked'))continue;b.classList.add('bow-locked');b.setAttribute('aria-disabled','true');b.title='Gesperrt: Fernkämpfer gibt es erst, wenn der Bogenhändler kommt.';const tag=document.createElement('span');tag.className='bow-lock';tag.textContent='🔒 erst mit Bogenhändler';b.appendChild(tag);}}
function unlockMarks(){for(const b of document.querySelectorAll('.bow-locked')){b.classList.remove('bow-locked');b.removeAttribute('aria-disabled');b.title='';b.querySelector('.bow-lock')?.remove();}}

// ---------- Arena: Karte „APFELSCHUSS“ neben Arena- und Boxkämpfen ----------
function injectCard(){const box=document.querySelector('.an-kinds');if(!box||box.querySelector('.bow-apple'))return;const st=ST(),open=['arena','apple','done'].includes(st.stage),used=st.stage==='done'&&st.appleDay===S().day;
 const b=document.createElement('button');b.className='an-mode bow-apple'+(open?'':' locked');b.dataset.a=open?'kind:apple':'kindlock';b.innerHTML=`<canvas width="300" height="170" class="px"></canvas><span class="an-mlabel"><b>APFELSCHUSS</b><small>${!open?'🔒 Erst Orontes kennenlernen':used?'Heute schon geschossen · morgen wieder':(st.stage==='arena'?'NEU · ':'')+'Fernkämpfer · Apfel · Rekrut · 1× pro Tag'}</small></span>`;
 box.appendChild(b);const cv=b.querySelector('canvas'),c=cv.getContext('2d'),rec=S().roster.find(x=>x.id===st.recruit)||S().roster.find(x=>x.role==='Fernkämpfer');let t0=performance.now();
 const loop=now=>{if(!b.isConnected)return;const t=(now-t0)/1000;try{ART.arena(c,300,170,t,{cheer:1});}catch(e){}c.imageSmoothingEnabled=false;
  if(rec)drawActor(c,{...actor(rec),forgeWorker:false,a:-.06,wind:.02,windMax:1,ammo:1,fullDraw:true},80,164,1.35);drawActor(c,{...actor(TARGET()),forgeWorker:false,a:Math.PI,shackled:true},236,160,1.0);px(c,233,107,6,5,'#c8321f');px(c,235,105,1,2,'#3a5a1a');
  if(!open||used){c.fillStyle='rgba(10,6,4,.55)';c.fillRect(0,0,300,170);}requestAnimationFrame(loop);};requestAnimationFrame(loop);
 b.addEventListener('click',e=>{e.stopPropagation();e.preventDefault();if(!open){M.ui.notify?.('Noch gesperrt: erst Orontes kennenlernen.');return;}if(st.stage==='arena'){st.stage='apple';startArenaFilm();}else if(st.appleDay===S().day){M.ui.notify?.('Den Apfelschuss gibt es nur einmal am Tag. Morgen wieder.');}else openApple();},true);}
new MutationObserver(()=>{try{injectCard();if(rangedOpen())unlockMarks();else lockRanged();}catch(e){}}).observe(document.body,{childList:true,subtree:true});

// ---------- Takt ----------
let wait=0;
const tick=M.ludusTick;M.ludusTick=dt=>{tick?.(dt);if(document.hidden)return;try{noSmithBows();if(!rangedOpen())lockRanged();step(dt);}catch(e){console.error(e);}
 const st=ST();if(st.stage===''&&S().box?.intro&&(M.boxGame?.tutorialDone?M.boxGame.tutorialDone():true)&&!document.querySelector('.bx-end')&&!film&&!S().battle&&M.ui.getPage()==='home'&&!M.boxGame?.introActive&&!M.sceneLoader?.active&&!document.querySelector('.smith-loading,#modal:not([hidden])')&&window.BOWYER_TEST?.auto!==false){wait+=dt;if(wait>2.5){wait=0;startTutorial();}}else wait=0;};
M.bowyer={drawOro,start:startTutorial,arena:startArenaFilm,state:ST,shop,talentLines,oroG,cart,oroFace,headArrow,drawActor,actor,reset(){const s=S();s.bowyer={stage:'',recruit:'',loan:0,given:'',owner:0};hideBar();tips=[];tipBox?.remove();tipBox=null;}};
function openApple(){if($('bowApple'))return;const v=document.createElement('div');v.id='bowApple';v.setAttribute('role','dialog');v.setAttribute('aria-label','Apfelschuss');
 v.innerHTML='<div class="bwa-top"><span>ARENA · APFELSCHUSS · mit deinen Kämpfern</span><button type="button">✕ ZURÜCK ZUR ARENA</button></div><iframe title="Apfelschuss"></iframe>';document.body.appendChild(v);
 const f=v.querySelector('iframe'),src=window.BOWYER_TEST?.appleSrc;if(window.BOWYER_TEST?.appleDoc)f.srcdoc=window.BOWYER_TEST.appleDoc;else f.src=src||('apfelschuss.html?v='+encodeURIComponent(window.BUILD||''));
 v.querySelector('button').onclick=()=>{v.remove();try{M.persist();}catch{}try{M.ui.render?.();}catch{}document.querySelector('.bow-apple')?.remove();try{injectCard();}catch{}};}
M.bowyer.openApple=openApple;if(window.BOWYER_TEST){window.BOWYER_TEST.openApple=openApple;window.BOWYER_TEST.onDone=openApple;}
window.BOWYER_TEST?.ready?.();
}})();
