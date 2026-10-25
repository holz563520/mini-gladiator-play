'use strict';
// =====================================================================================================
// HOUSE OF BEASTS · ZWINGER: Gewölbe mit Käfigen, die Hunde leben hinter Gittern.
// Jeder Hund wechselt selbst zwischen Verhaltensweisen (je nach Wildheit, Mut, Ausdauer):
// auf und ab laufen, sitzen, liegen, schlafen, kratzen, trinken, am Knochen nagen, am Gitter hochspringen,
// bellen, knurren, Fell schütteln, schnüffeln. Übergänge laufen weich (DOG.draw mit eigenem Schlüssel).
// Reine Darstellung, kein Spielzustand.
// =====================================================================================================
(()=>{
const DOG=window.DOG,$=id=>document.getElementById(id),TAU=Math.PI*2,cl=(v,a,b)=>v<a?a:v>b?b:v;
const Z={cages:[],t:0,last:0,visible:true};DOG.zwinger=Z;
const DUR={stretch:[2.8,2.8],scent:[2.5,4.5],roam:[5,9],sit:[3,6],rest:[4,8],sleep:[6,11],scratch:[1.6,2.6],drink:[2.5,4],gnaw:[5,9],bars:[2,3.5],bark:[2,3.5],growl:[2,3.2],shakeoff:[.9,1.3],sniff:[2,3.5],stand:[1.5,3]};
const NAME={stretch:'streckt sich',scent:'nimmt Witterung auf',roam:'streift umher',sit:'sitzt',rest:'liegt',sleep:'schläft',scratch:'kratzt sich',drink:'trinkt',gnaw:'nagt am Knochen',skull:'nagt an einem Schädel',bars:'springt ans Gitter',bark:'bellt',growl:'knurrt',shakeoff:'schüttelt sich',sniff:'schnüffelt',stand:'steht',walk:'geht',leave:'trottet hinaus',den:'im Hinterzimmer',come:'kommt herein'};
function weights(D,last){const s=D.stats,w=s.wild/100,a=s.ausdauer/100;const W={stretch:.5,scent:1.2,roam:1+w*1.6,sit:1.6,rest:1.6+(1-a),sleep:1+(1-w)*1.5,scratch:.7,drink:.9,gnaw:1.6,bars:.4+w*2.4,bark:.6+w*2.2,growl:.3+w*1.4,shakeoff:.6,sniff:1.1,stand:1};
 if(last)W[last]*=.15;if(last==='sleep'||last==='rest'){W.stretch+=4;W.shakeoff+=1;W.sit+=1;}if(['bark','bars','growl'].includes(last)){W.roam+=1;}return W;}
function pickW(W){let tot=0;for(const k in W)tot+=W[k];let r=Math.random()*tot;for(const k in W){r-=W[k];if(r<=0)return k;}return 'stand';}
function actor(D,i){return {dog:D,P:DOG.params(D),id:'zwinger-'+i,g:{dead:false,name:D.name},mode:'stand',clock:0,duration:1,cyc:Math.random(),moveSpeed:0,wounds:[],gore:{},bleed:{},mouthBlood:.15,energy:100,hit:0,z:0,spray:[],x:(Math.random()*2-1)*8,face:Math.random()<.5?1:-1,depth:0,act:'stand',actT:.5+Math.random()*2,last:null,chew:'bone'};}
Z.setDogs=function(list){Z.cages=list.slice(0,3).map((D,i)=>{const old=Z.cages[i];if(old&&old.a.dog===D)return old;return {a:actor(D,i),D,seed:i*7919+13};});};
// Kein sichtbares Umdrehen: will der Hund in die andere Richtung, geht er durch den Durchgang ins Hinterzimmer
// und kommt dort umgedreht wieder heraus. Ziele hinter ihm erreicht er nur über diesen Umweg.
function targetOf(k,half){return k==='drink'?{x:-half*.75,head:22}:k==='gnaw'?{x:half*.15,head:20}:null;}
function startAct(c,half){const a=c.a;let k=pickW(weights(a.dog,a.last));a.last=a.act;a.goal=null;a.barkLeft=0;a.growlT=0;a.forceSniff=0;
 const T=targetOf(k,half);if(T){const g=T.x-a.face*T.head,behind=(g-a.x)*a.face<-10;if(behind){a.next=k;k='leave';}else a.goal=g;}
 if(k==='gnaw')a.chew=Math.random()<.5?'skull':'bone';
 if(k==='roam'){a.goal=a.face*half;}
 if(k==='sniff')a.goal=cl(a.x+a.face*(8+Math.random()*16),-half,half);
 a.act=k;const [lo,hi]=DUR[k]||[3,5];a.actT=lo+Math.random()*(hi-lo);if(k==='leave')a.actT=99;}
function stepCage(c,dt,half){const a=c.a;a.clock+=dt;a.actT-=dt;a.growlT=Math.max(0,(a.growlT||0)-dt);a.turnStep=0;
 const walk=(gx,v)=>{const dx=gx-a.x;if(Math.abs(dx)<2.5){a.moveSpeed=0;return true;}const dir=Math.sign(dx);
  const back=dir!==a.face,st=Math.min(Math.abs(dx),v*(back?.35:1)*dt);a.x+=dir*st;a.moveSpeed=st/dt*a.P.sz;a.cyc+=(back?-1:1)*st/DOG.cycLen(back?1:DOG.gaitOf(a.moveSpeed));return false;};
 a.mode='stand';a.moveSpeed=0;
 if(a.act==='leave'){// in den Durchgang auf der Seite, in die er schaut
  const end=a.face*(half+18);walk(end,34);a.depth=cl((Math.abs(a.x)-half)/14,0,1);if(a.depth>=.99){a.act='den';a.actT=.8+Math.random()*1.8;a.face=-a.face;}return;}
 if(a.act==='den'){a.moveSpeed=0;if(Math.random()<dt*.08&&Z.visible)DOG.playSound?.('huff',a.dog);if(a.actT<=0){a.act='come';}return;}
 if(a.act==='come'){// kommt umgedreht aus dem Durchgang zurück
  const done=walk(-a.face*(half-8),34);a.depth=cl((Math.abs(a.x)-half)/14,0,1);
  if(done){const n=a.next;a.next=null;if(n){const T=targetOf(n,half);a.act=n;a.goal=T?T.x-a.face*T.head:null;const [lo,hi]=DUR[n];a.actT=lo+Math.random()*(hi-lo);if(n==='gnaw')a.chew=Math.random()<.5?'skull':'bone';}else startAct(c,half);}return;}
 a.depth=0;if(a.actT<=0)startAct(c,half);
 switch(a.act){
 case 'roam':{if(walk(a.goal,40+a.dog.stats.wild*.3)){a.act='leave';a.actT=99;}break;}
 case 'drink':{if(walk(a.goal,30))a.mode='drink';break;}
 case 'gnaw':{if(walk(a.goal,30))a.mode='gnaw';break;}
 case 'sniff':{if(walk(a.goal,14)){const g=a.x+a.face*(8+Math.random()*14);if(Math.abs(g)>half){if(Math.random()<.4){a.act='leave';a.actT=99;}else{a.act='stand';a.actT=1+Math.random()*2;}}else a.goal=g;}a.forceSniff=1;break;}
 case 'bark':{a.mode='threat';const rate=(DOG.BREEDS.find(b=>b.id===a.dog.breed)?.sound?.barkRate)??1;if(!a.barkLeft&&Math.random()<dt*.9*rate)a.barkLeft=1+Math.floor(Math.random()*2),a.barkNext=0;
  if(!a.barkLeft&&Math.random()<dt*.5){a.barkAt=Z.t-.12;if(Z.visible)DOG.playSound?.('huff',a.dog);}
  if(a.barkLeft>0){a.barkNext-=dt;if(a.barkNext<=0){a.barkAt=Z.t;a.barkLeft--;a.barkNext=.55+Math.random()*.3;if(Z.visible)DOG.playSound?.('bark',a.dog);}}break;}
 case 'growl':{a.mode='threat';a.growlT2=(a.growlT2||0)-dt;if(a.growlT2<=0){a.growlT2=2.5+Math.random()*2;a.growlT=1.4;if(Z.visible)DOG.playSound?.('growl',a.dog);}break;}
 case 'bars':{a.mode='bars';if(Math.random()<dt*.4){a.barkAt=Z.t;if(Z.visible)DOG.playSound?.(Math.random()<.5?'bark':'huff',a.dog);}break;}
 default:a.mode=a.act;}}
// ---------- Zeichnen ----------
function wall(c,W,H,t){c.fillStyle='#120d0a';c.fillRect(0,0,W,H);
 // Gewölbe aus Quadern
 for(let y=0;y<H*.78;y+=22)for(let x=-((y/22)%2)*24;x<W;x+=48){const v=((x*7+y*13)%17)/17;c.fillStyle=`rgb(${38+v*14},${30+v*10},${24+v*8})`;c.fillRect(x+1,y+1,46,20);}
 c.fillStyle='#0b0806';for(let x=0;x<W;x+=W/3){c.beginPath();c.moveTo(x,0);c.quadraticCurveTo(x+W/6,-40,x+W/3,0);c.lineTo(x+W/3,26);c.quadraticCurveTo(x+W/6,-10,x,26);c.fill();}
 // Boden: Stroh und Stein
 const fy=H*.78;c.fillStyle='#2a2018';c.fillRect(0,fy,W,H-fy);for(let i=0;i<220;i++){const x=(i*73.3)%W,y=fy+((i*37)%100)/100*(H-fy);c.fillStyle=i%3?'#a08a4a':'#7a6838';c.fillRect(Math.round(x),Math.round(y),5+(i%4),1);}
 c.fillStyle='#00000055';c.fillRect(0,fy,W,6);}
function torch(c,x,y,t){const f=Math.sin(t*17+x)*1.5+Math.sin(t*7.3+x*2)*1;c.fillStyle='#3a2a1a';c.fillRect(x-3,y,6,26);c.fillStyle='#6a4a2a';c.fillRect(x-6,y-2,12,5);c.fillStyle='#f0a032';c.beginPath();c.ellipse(x,y-9+f*.4,6,11+f,0,0,TAU);c.fill();c.fillStyle='#ffe28a';c.beginPath();c.ellipse(x,y-6,3,6,0,0,TAU);c.fill();}
function bowl(c,x,y,k){c.fillStyle='#5b4a3a';c.fillRect(Math.round(x-7*k),Math.round(y-3*k),Math.round(14*k),Math.round(3*k));c.fillStyle='#4e7d8a';c.fillRect(Math.round(x-6*k),Math.round(y-3*k),Math.round(12*k),Math.round(1*k));}
function boneOnGround(c,x,y,k){c.fillStyle='#e7dcc2';c.fillRect(Math.round(x-6*k),Math.round(y-1.6*k),Math.round(12*k),Math.round(1.6*k));c.beginPath();c.arc(x-6*k,y-1*k,1.4*k,0,TAU);c.arc(x+6*k,y-1*k,1.4*k,0,TAU);c.fill();}
// Schwarzer Humor: was von früheren Gegnern übrig ist
function skull(c,x,y,k,rot=0,blood=0){c.save();c.translate(x,y);c.rotate(rot);c.scale(k,k);
 c.fillStyle='#e3d8bf';c.beginPath();c.ellipse(0,-4.2,4.6,4,0,0,TAU);c.fill();c.fillRect(-3.2,-2,6.4,3.2);c.fillStyle='#c9bc9c';c.fillRect(-4.4,-3,1.2,3);
 c.fillStyle='#1a120d';c.fillRect(-2.8,-4.4,2,1.8);c.fillRect(.9,-4.4,2,1.8);c.fillRect(-.4,-2.2,.9,1.1);for(let i=0;i<5;i++)c.fillStyle='#d6cbb0',c.fillRect(-2.6+i*1.1,.9,.8,1);
 c.fillStyle='#8a7d64';c.fillRect(-1,-8,.6,2.4);c.fillRect(-.6,-6,.6,1.4);if(blood){c.fillStyle='#6d1a12';c.fillRect(1.6,-6.8,2,1.2);c.fillRect(-4,0,2.2,1);}c.restore();}
function femur(c,x,y,k,rot){c.save();c.translate(x,y);c.rotate(rot);c.scale(k,k);c.fillStyle='#ddd1b6';c.fillRect(-7,-.7,14,1.4);c.beginPath();c.arc(-7,-.6,1.3,0,TAU);c.arc(-7,.6,1.3,0,TAU);c.arc(7,-.6,1.3,0,TAU);c.arc(7,.6,1.3,0,TAU);c.fill();c.restore();}
function ribs(c,x,y,k){c.save();c.translate(x,y);c.scale(k,k);c.strokeStyle='#d9ccb0';c.lineWidth=.8;for(let i=0;i<5;i++){c.beginPath();c.arc(i*2.2,0,3.2,Math.PI*1.05,Math.PI*1.95);c.stroke();}c.fillStyle='#cbbd9e';c.fillRect(-1,-3.6,11,.9);c.restore();}
function helmet(c,x,y,k){c.save();c.translate(x,y);c.scale(k,k);c.fillStyle='#6d6a62';c.beginPath();c.ellipse(0,-2.5,4.4,3,0,Math.PI,0);c.fill();c.fillRect(-5,-2.6,10,1.2);c.fillStyle='#8f8b80';c.fillRect(-3,-5,3,.8);c.fillStyle='#3a3732';c.fillRect(1,-4.2,1.6,1.6);c.restore();}
function bars(c,x0,x1,y0,y1,t){c.fillStyle='#1d1a18';c.fillRect(x0,y0,x1-x0,8);c.fillRect(x0,y1-8,x1-x0,8);c.fillRect(x0,(y0+y1)/2-3,x1-x0,6);
 for(let x=x0+8;x<x1;x+=22){c.fillStyle='#2b2724';c.fillRect(x,y0,6,y1-y0);c.fillStyle='#4a4440';c.fillRect(x+1,y0,2,y1-y0);c.fillStyle='#14110f';c.fillRect(x+5,y0,1,y1-y0);}
 for(let x=x0+6;x<x1;x+=22){c.fillStyle='#5a524c';c.fillRect(x+3,y0+2,3,3);c.fillRect(x+3,y1-6,3,3);}
 c.fillStyle='#0d0b0a';c.fillRect(x0-4,y0-4,8,y1-y0+8);c.fillRect(x1-4,y0-4,8,y1-y0+8);}
Z.draw=function(cv){const c=cv.getContext('2d'),W=cv.width,H=cv.height,t=Z.t;c.imageSmoothingEnabled=false;wall(c,W,H,t);
 const n=Math.max(1,Z.cages.length),cw=W/3,fy=Math.round(H*.88),y0=Math.round(H*.2);
 for(let i=0;i<3;i++){const x0=i*cw+10,x1=(i+1)*cw-10,cage=Z.cages[i];
  // Käfiginneres dunkler
  c.fillStyle='#00000066';c.fillRect(x0,y0,x1-x0,fy-y0);
  if(cage){const a=cage.a,k=Math.min(2.25,(cw-40)/(130*a.P.sz)),cx=(x0+x1)/2,sk=k*a.P.sz,half=Math.max(8,(cw/2-14)/sk-46);a._half=half;
   // Durchgänge ins Hinterzimmer links und rechts
   for(const sd of [-1,1]){const ax=cx+sd*(half+20)*sk,aw=34,ah=74;c.fillStyle='#0a0705';c.beginPath();c.moveTo(ax-aw/2,fy);c.lineTo(ax-aw/2,fy-ah+aw/2);c.arc(ax,fy-ah+aw/2,aw/2,Math.PI,0);c.lineTo(ax+aw/2,fy);c.fill();
    c.fillStyle='#2a2018';c.fillRect(ax-aw/2-4,fy-ah-4,4,ah+4);c.fillRect(ax+aw/2,fy-ah-4,4,ah+4);
    if(a.act==='den'&&-a.face===sd){const bl=((Z.t*.7+i)%3)<.12;if(!bl){c.fillStyle='rgba(255,170,60,.85)';c.fillRect(Math.round(ax-5),fy-34,2,2);c.fillRect(Math.round(ax+2),fy-34,2,2);}}}
   // Reste früherer Gegner
   const r=n=>((Math.sin(cage.seed*12.9898+n*78.233)*43758.5453)%1+1)%1;
   c.fillStyle='rgba(80,14,10,.55)';c.beginPath();c.ellipse(cx+(r(1)-.5)*half*sk,fy-2,22+r(2)*14,3,0,0,TAU);c.fill();
   femur(c,cx+(r(3)-.3)*half*sk*1.2,fy-2,k*.85,(r(4)-.5)*.6);femur(c,cx-(r(5)*.8)*half*sk,fy-1,k*.75,(r(6)-.5)*.9);ribs(c,cx+(r(7)-.5)*half*sk*1.4,fy-1,k*.8);
   if(r(8)<.6)helmet(c,cx+(r(9)-.5)*half*sk*1.6,fy-1,k*.85);
   bowl(c,cx+(-half*.75)*sk,fy-1,k*.9);
   const chewing=a.mode==='gnaw',onSkull=chewing&&a.chew==='skull';
   if(!onSkull)skull(c,cx+(half*.15+(a.face>0?20:-20))*sk*(chewing?1:0)+(chewing?0:(half*.15)*sk),fy-1,k*.8,.15,1);
   if(chewing&&a.chew==='bone'){}else if(!chewing)boneOnGround(c,cx+(half*.45)*sk,fy-1,k*.8);
   // Hund: beim Gang ins Hinterzimmer wird er kleiner, rückt nach hinten und verschwindet im Dunkel
   if(a.act!=='den'){const dp=a.depth||0;c.save();c.globalAlpha=1-dp*.95;c.translate(Math.round(cx+a.x*sk),Math.round(fy-dp*14));c.scale(1-dp*.22,1-dp*.22);
    DOG.draw(c,a,0,0,k,a.face,{time:t,key:a.id});
    if(onSkull){const R=DOG.rig(a,t),m=R.mouth;skull(c,a.face*sk*(m.x+1),sk*(m.y+5),k*.75,Math.sin(t*8)*.12,1);}
    c.restore();}
   cage.label=[cage.D.name,a.mode==='gnaw'&&a.chew==='skull'?NAME.skull:NAME[a.act]||''];}  else{c.fillStyle='#6b5d45';c.font='12px system-ui';c.textAlign='center';c.fillText('leer',(x0+x1)/2,(y0+fy)/2);}
  bars(c,x0,x1,y0,fy+6,t);
  // Namensschild am Gitter
  const mx=(x0+x1)/2;c.fillStyle='#4a3a26';c.fillRect(mx-58,y0+10,116,36);c.strokeStyle='#8a6a3a';c.strokeRect(mx-58+.5,y0+10.5,115,35);
  if(cage?.label){c.fillStyle='#ead8a2';c.font='bold 14px Georgia,serif';c.textAlign='center';c.fillText(cage.label[0],mx,y0+26);c.fillStyle='#c5b385';c.font='11px system-ui';c.fillText(cage.label[1],mx,y0+40);}}
 // Fackeln und Licht
 for(const x of [cw,cw*2])torch(c,x,H*.3,t);
 const g=c.createRadialGradient(W/2,H*.4,40,W/2,H*.5,W*.7);g.addColorStop(0,'rgba(255,170,80,.06)');g.addColorStop(1,'rgba(0,0,0,.4)');c.fillStyle=g;c.fillRect(0,0,W,H);
 for(const x of [cw,cw*2]){const f=.12+Math.sin(t*13+x)*.02;const gg=c.createRadialGradient(x,H*.28,5,x,H*.35,170);gg.addColorStop(0,`rgba(255,160,60,${f})`);gg.addColorStop(1,'rgba(255,160,60,0)');c.fillStyle=gg;c.fillRect(x-170,0,340,H);}
 // Staub im Licht
 for(let i=0;i<30;i++){const x=(i*97+t*8*(1+i%3))%W,y=(i*53+Math.sin(t*.5+i)*20)%(H*.8);c.fillStyle='rgba(255,230,180,.25)';c.fillRect(Math.round(x),Math.round(y),1,1);}};
Z.frame=function(cv,now){const dt=Math.min(.05,(now-(Z.last||now))/1000);Z.last=now;Z.t+=dt;for(const c of Z.cages)stepCage(c,dt,c.a._half||40);Z.draw(cv);};
window.DOG_ZWINGER=true;
})();
