'use strict';
// =====================================================================================================
// ARENA-NEU · BILDER (nur Testversion)
// Alles im Pixelstil des Spiels: Gladiatoren über die Zeichner des Spiels (M.renderPortrait, M.renderTeamFigure,
// M.faceShot), Löwen über M.drawRex, Hähne über das Hahnen-Modell (CF.drawRoosterSide/Front). Neu gezeichnet:
// Arenakulisse, Hund, Bär und Tiger (Tiger: Löwenkörper des Spiels, umgefärbt und gestreift – noch nicht spielbar).
// =====================================================================================================
(()=>{
const M=window.MG,CF=window.CF,BZ=window.Beasts,cl=M.clamp;
const ART={};window.ArenaArt=ART;
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
ART.mk=mk;
function hash(n){const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);}

// ---------- Arenakulisse (320 × 180), Zuschauer bewegen sich ----------
const crowdCache=new Map();
ART.arena=function(ctx,w,h,t,o={}){
 const night=o.night||0;ctx.imageSmoothingEnabled=false;
 // Himmel
 const sky=ctx.createLinearGradient(0,0,0,h*.45);sky.addColorStop(0,night?'#120d16':'#2c2433');sky.addColorStop(1,night?'#3a2124':'#7a4a35');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 // Velarium-Seile
 ctx.fillStyle='rgba(30,18,14,.55)';for(let i=0;i<9;i++){const x=i*w/8;ctx.fillRect(x,0,1,h*.2);}
 // Ränge: Bögen und Zuschauer
 const top=Math.round(h*.12),wallTop=Math.round(h*.5);
 ctx.fillStyle='#5b4535';ctx.fillRect(0,top,w,wallTop-top);
 const rows=8,rh=(wallTop-top)/rows;
 for(let r=0;r<rows;r++){const y=Math.round(top+r*rh),hgt=Math.ceil(rh);ctx.fillStyle=r%2?'#3e2e23':'#46352a';ctx.fillRect(0,y,w,hgt);ctx.fillStyle='#6b5642';ctx.fillRect(0,y+hgt-1,w,1);
  for(let x=1+(r%2)*2;x<w-2;x+=4){const n=hash(x*13+r*977);if(n<.16)continue;const skin=['#d9ac82','#b9875f','#8e5f45','#e2c39b','#a6744f'][Math.floor(n*53)%5],tun=['#8f2f2a','#d6c7a5','#3f5a68','#b78d3c','#6c3b52','#e6dccb','#5a6b3a'][Math.floor(n*97)%7];
   const bob=(o.cheer&&n>.45)||n>.88?Math.round(Math.sin(t*(4+n*5)+x)*1):0,yy=y+hgt-5+bob;ctx.fillStyle=tun;ctx.fillRect(x,yy+2,3,3);ctx.fillStyle=skin;ctx.fillRect(x+.5,yy,2,2);
   if(o.cheer&&n>.7&&Math.sin(t*6+x)>0){ctx.fillRect(x-1,yy-2+bob,1,2);ctx.fillRect(x+3,yy-2-bob,1,2);}}}
 // Banner
 const ban=['#8f2f2a','#b78d3c','#8f2f2a','#3f5a68'];for(let i=0;i<4;i++){const x=Math.round(w*(.12+i*.26)),sway=Math.round(Math.sin(t*1.6+i)*1.5);ctx.fillStyle='#2a1a12';ctx.fillRect(x-1,top-4,2,24);ctx.fillStyle=ban[i];ctx.fillRect(x+1,top-3,10+sway,14);ctx.fillStyle='rgba(255,230,170,.35)';ctx.fillRect(x+3,top,4,2);ctx.fillStyle=ban[i];for(let k=0;k<3;k++)ctx.fillRect(x+1+k*4,top+11,3,2+k%2);}
 // Mauer mit Toren
 ctx.fillStyle='#7d6a52';ctx.fillRect(0,wallTop,w,Math.round(h*.13));
 for(let x=0;x<w;x+=14)for(let y=wallTop;y<wallTop+h*.13;y+=6){ctx.fillStyle=hash(x*3+y)>.5?'#86725a':'#735f49';ctx.fillRect(x+((y/6)%2?7:0),y,13,5);}
 ctx.fillStyle='#2e231a';ctx.fillRect(0,wallTop,w,2);
 const gates=[w*.18,w*.5,w*.82];for(const gx of gates){const gw=Math.round(w*.09),gh=Math.round(h*.12);ctx.fillStyle='#1a120d';ctx.fillRect(Math.round(gx-gw/2),wallTop+h*.13-gh,gw,gh);ctx.beginPath();ctx.arc(gx,wallTop+h*.13-gh,gw/2,Math.PI,0);ctx.fill();ctx.fillStyle='#3b2c20';for(let i=0;i<5;i++)ctx.fillRect(Math.round(gx-gw/2+2+i*gw/5),wallTop+h*.13-gh-gw*.3,1,gh+gw*.3);}
 // Fackeln
 for(const fx of [w*.06,w*.34,w*.66,w*.94]){const fy=wallTop+4;ctx.fillStyle='#3a2a1c';ctx.fillRect(Math.round(fx),fy,2,7);const f=Math.sin(t*14+fx)*1.2;ctx.fillStyle='#f0a13c';ctx.fillRect(Math.round(fx-1),fy-4+f,4,4);ctx.fillStyle='#ffe28a';ctx.fillRect(Math.round(fx),fy-3+f,2,2);ctx.fillStyle='rgba(240,161,60,.12)';ctx.beginPath();ctx.arc(fx+1,fy,14,0,7);ctx.fill();}
 // Sand
 const sandTop=Math.round(wallTop+h*.13);const sg=ctx.createLinearGradient(0,sandTop,0,h);sg.addColorStop(0,'#b08a5a');sg.addColorStop(1,'#d2b07a');ctx.fillStyle=sg;ctx.fillRect(0,sandTop,w,h-sandTop);
 for(let i=0;i<260;i++){const x=Math.floor(hash(i*7.1)*w),y=sandTop+Math.floor(hash(i*3.3)*(h-sandTop));ctx.fillStyle=hash(i)>.5?'#c39d69':'#9e7a4c';ctx.fillRect(x,y,2,1);}
 if(o.blood)for(let i=0;i<7;i++){const x=hash(i*91)*w,y=sandTop+8+hash(i*17)*(h-sandTop-12);ctx.fillStyle='rgba(120,30,24,.55)';ctx.beginPath();ctx.ellipse(x,y,6+hash(i)*9,2+hash(i*5)*2,0,0,7);ctx.fill();}
 ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(0,sandTop,w,3);
 return sandTop;};

// ---------- Hahn ----------
const MODEL=CF.WORLD.roosterModelUnits;
const sprites=new WeakMap();
function sprite(cv,w,h){let s=sprites.get(cv);if(!s||s.w!==w||s.h!==h){const grid=new CF.PixGrid(w,h);s={w,h,grid,painter:new CF.Painter(grid),img:new ImageData(w,h),view:new Uint8ClampedArray(grid.d.buffer),cv:mk(w,h)};sprites.set(cv,s);}return s;}
// pose: Gefühl ('fear'|'focus'|'proud'|'idle'), view: 'side'|'front'
ART.roosterPose=function(mood,t,seed=0){const p={};
 if(mood==='fear'){p.crouch=.55;p.headY=2.4;p.headX=-1.5+Math.sin(t*9+seed)*.8;p.hackle=0;p.wing=.25+Math.abs(Math.sin(t*16))*.25;p.flap=t*30;p.blink=Math.sin(t*3+seed)>.6;p.lean=.35;p.eyeX=Math.sin(t*5)*1.2;}
 else if(mood==='focus'){p.crouch=.3;p.hackle=.9;p.lean=.25;p.headX=Math.sin(t*4+seed)*.7;p.headY=1;}
 else if(mood==='proud'){const crow=(t*.55+seed)%3<1;p.lean=-.45;p.hackle=1.2;p.wing=crow?1:.4+Math.abs(Math.sin(t*7))*.5;p.flap=t*(crow?20:12);p.beakOpen=crow?.9:0;p.headY=crow?-1.5:0;}
 else{p.bob=Math.sin(t*3+seed)*.4;p.hackle=.4;}
 return p;};
ART.rooster=function(ctx,R,o={}){const w=o.w||ctx.canvas.width,h=o.h||ctx.canvas.height,sp=sprite(ctx.canvas,w,h);sp.grid.clear();
 const s=(o.size||h*.62)/MODEL*Math.sqrt(R.height/58),pose=Object.assign({},o.pose||ART.roosterPose(o.mood||'idle',o.t||0,o.seed||0));if(R.quality?.tier>=7)pose.glow=true;
 sp.painter.setT(Math.round(o.x??w/2),Math.round(o.y??h*.92),s,o.face||1,o.roll||0,0,-14);
 if(o.view==='front')CF.drawRoosterFront(sp.painter,R,pose,(o.t||0)*1000);else CF.drawRoosterSide(sp.painter,R,pose,(o.t||0)*1000);
 sp.img.data.set(sp.view);const sc=sp.cv.getContext('2d');sc.putImageData(sp.img,0,0);
 if(o.shadow!==false){ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(o.x??w/2,(o.y??h*.92)+1,s*13,s*3,0,0,7);ctx.fill();}
 ctx.imageSmoothingEnabled=false;ctx.drawImage(sp.cv,0,0);};

// ---------- Löwe (M.drawRex) ----------
ART.lionActor=function(L){const c=L.condition||{health:100,blood:100,rear:100},tf=c.health/100,P=BZ.params(L);
 return {x:0,y:0,a:0,mode:'stalk',phase:0,g:{dead:!!L.dead,name:L.name},tissue:{head:160*tf,chest:290*tf,belly:140*tf,front:120*tf,rear:100*c.rear/100},max:{head:160,chest:290,belly:140,front:120,rear:100},blood:c.blood,trauma:(1-tf)*160+(100-c.rear)*1.2,wounds:(L.wounds||[]).slice(-10),z:0,hit:0,clock:0,moveSpeed:0,cute:P.size,velocity:0,team:0};};
// mood: 'fear' (geduckt, angeschlagen) · 'focus' (Drohen/Lauern) · 'proud' (Brüllen) · 'walk'
ART.lion=function(ctx,L,o={}){const t=o.t||0,a=o.actor||(o.actor=ART.lionActor(L));const mood=o.mood||'idle',cyc=(t+(o.seed||0))%4;
 a.mode=mood==='proud'?(cyc<2.2?'roar':'threaten'):mood==='focus'?(cyc<1.6?'threaten':cyc<2.2?'crouch':'snarl'):mood==='fear'?(cyc<2.6?'recover':'evade'):mood==='walk'?'stalk':'stalk';
 a.clock=cyc%1.2;a.moveSpeed=mood==='walk'?90:mood==='fear'&&a.mode==='evade'?40:0;a.phase=t*(mood==='walk'?7:2);a.hit=mood==='fear'&&Math.sin(t*2.3)>.92?.2:0;a.a=(o.face||1)>0?0:Math.PI;
 M.rexClock=t;ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(o.x??ctx.canvas.width/2,o.y??ctx.canvas.height*.9);const k=o.scale||1;ctx.scale(k,k);
 if(mood==='fear'){ctx.translate(Math.sin(t*23)*.6,0);}
 try{M.drawRex(ctx,a);}catch(e){}ctx.restore();};

// ---------- Gladiatoren ----------
const figCache=new Map();
ART.figure=function(g,hero=false){const key=g.id+(hero?'h':'i')+(g.dead?'d':'');let c=figCache.get(key);if(!c){c=mk(240,300);try{M.renderTeamFigure(c,g,hero,0);}catch(e){}figCache.set(key,c);}return c;};
ART.clearFigures=()=>figCache.clear();
ART.portrait=function(g){const c=mk(80,100);try{M.renderPortrait(c,g);}catch(e){}return c;};
// Großaufnahme mit Mimik (M.faceShot) – Gefühl nach Überlebenschance
ART.face=function(ctx,g,o={}){const w=ctx.canvas.width,h=ctx.canvas.height,mood=o.mood||'calm';try{M.faceShot.paint(ctx,w,h,{g,mood,team:o.team||0,lines:mood==='roar'?.6:0,cheer:o.cheer,yaw:o.yaw},o.t||0);}catch(e){ctx.fillStyle='#211a14';ctx.fillRect(0,0,w,h);}};

// ---------- Neu: Hund, Bär, Tiger (Platzhalter-Tierklassen, noch nicht spielbar) ----------
function pxEllipse(ctx,cx,cy,rx,ry,col,out){ctx.fillStyle=col;for(let y=-ry;y<=ry;y++){const k=Math.sqrt(Math.max(0,1-(y*y)/(ry*ry))),x=Math.round(rx*k);ctx.fillRect(Math.round(cx-x),Math.round(cy+y),x*2+1,1);}if(out){ctx.fillStyle=out;for(let y=-ry;y<=ry;y++){const k=Math.sqrt(Math.max(0,1-(y*y)/(ry*ry))),x=Math.round(rx*k);ctx.fillRect(Math.round(cx-x)-1,Math.round(cy+y),1,1);ctx.fillRect(Math.round(cx+x)+1,Math.round(cy+y),1,1);}}}
const R=(ctx,x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
ART.bear=function(ctx,t,x,y,k=1){ctx.save();ctx.translate(x,y);ctx.scale(k,k);const b=Math.sin(t*2)*.8,dk='#3b2416',md='#5d3a22',lt='#7c5132',sn='#a57a4f';
 ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(0,1,44,7,0,0,7);ctx.fill();
 for(const [lx,f] of [[-26,0],[-12,1],[14,0],[28,1]]){R(ctx,lx-6,-24,13,24,f?dk:md);R(ctx,lx-7,-4,15,5,dk);for(let i=0;i<3;i++)R(ctx,lx-6+i*4,0,2,2,'#e6dccb');}
 pxEllipse(ctx,0,-34+b,40,22,md,dk);pxEllipse(ctx,-4,-42+b,30,12,lt);R(ctx,-30,-28+b,60,4,dk);
 // Kopf
 pxEllipse(ctx,36,-44+b,15,13,md,dk);pxEllipse(ctx,28,-56+b,5,5,md,dk);pxEllipse(ctx,44,-57+b,5,5,md,dk);R(ctx,27,-58+b,3,3,dk);R(ctx,43,-59+b,3,3,dk);
 pxEllipse(ctx,48,-40+b,9,6,sn,dk);R(ctx,53,-43+b,5,4,'#1a0f0a');R(ctx,38,-48+b,3,3,'#120a06');R(ctx,39,-49+b,1,1,'#f0e0c0');
 const roar=Math.sin(t*1.3)>.6;if(roar){R(ctx,44,-36+b,12,5,'#3a0f0c');R(ctx,45,-36+b,2,2,'#efe6d0');R(ctx,52,-36+b,2,2,'#efe6d0');}
 ctx.restore();};
ART.dog=function(ctx,t,x,y,k=1){ctx.save();ctx.translate(x,y);ctx.scale(k,k);const run=Math.sin(t*9),dk='#2c2420',md='#6b5546',lt='#8f7663',bl='#cbb79b';
 ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(0,1,34,5,0,0,7);ctx.fill();
 for(const [lx,ph,f] of [[-20,0,1],[-12,Math.PI,0],[14,Math.PI,1],[22,0,0]]){const s=Math.sin(t*4+ph)*2;R(ctx,lx-3+s,-20,6,20,f?dk:md);R(ctx,lx-4+s,-2,8,3,dk);}
 pxEllipse(ctx,0,-26,27,10,md,dk);pxEllipse(ctx,4,-22,18,5,lt);
 // Schwanz
 for(let i=0;i<9;i++)R(ctx,-27-i*1.5,-30-i*1.2+Math.sin(t*6+i*.5)*i*.3,3,3,md);
 // Hals, Kopf, Halsband mit Dornen
 R(ctx,16,-40,10,14,md);pxEllipse(ctx,29,-42,11,9,md,dk);R(ctx,33,-41,13,8,lt);R(ctx,44,-41,3,3,'#120a06');R(ctx,36,-37,10,2,'#3a0f0c');R(ctx,38,-36,2,2,'#efe6d0');R(ctx,43,-36,2,2,'#efe6d0');
 R(ctx,22,-54,5,10,dk);R(ctx,24,-56,3,4,dk);R(ctx,31,-53,5,9,dk);R(ctx,33,-55,3,4,dk);R(ctx,30,-46,3,3,'#120a06');R(ctx,31,-47,1,1,'#f3c778');
 R(ctx,15,-33,13,4,'#4a3424');for(let i=0;i<4;i++)R(ctx,16+i*3.5,-36,2,3,bl);
 ctx.restore();};
// Tiger: Löwenkörper aus M.drawRex in Tigerfarben, mit Streifen
const tigerCv=mk(220,150);const MAP=[['#b18a50','#d9822b'],['#d0ac6c','#f0b768'],['#7c582f','#a3561c'],['#49341f','#24160d'],['#48301f','#8a4416'],['#78502c','#e08a35'],['#956538','#f2c99a'],['#5b3d25','#c4691f'],['#d5b478','#f6e2c2'],['#885039','#8a3c20']];
const hex=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));const MAPN=MAP.map(([a,b])=>[hex(a),hex(b)]);
ART.tiger=function(ctx,t,x,y,k=1,L){const c=tigerCv.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,220,150);
 ART.lion(c,L||{name:'Tiger',stats:{kraft:60,tempo:60,zaeh:50,wild:60},condition:{health:100,blood:100,rear:100,hunger:0}},{t,mood:Math.sin(t*.7)>.3?'proud':'focus',x:110,y:140,scale:1});
 const im=c.getImageData(0,0,220,150),d=im.data;for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const r=d[i],g=d[i+1],bb=d[i+2];let best=null,bd=1e9;for(const [a,b2] of MAPN){const dd=Math.abs(a[0]-r)+Math.abs(a[1]-g)+Math.abs(a[2]-bb);if(dd<bd){bd=dd;best=b2;}}
  if(bd<40){const px=(i/4)%220,py=Math.floor(i/4/220),stripe=((px*.8+py*.45+Math.sin(py*.4)*2)%11)<1.7&&best!==MAPN[1][1]&&best!==MAPN[6][1];d[i]=stripe?28:best[0];d[i+1]=stripe?18:best[1];d[i+2]=stripe?12:best[2];}}
 c.putImageData(im,0,0);ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(x,y);ctx.scale(k,k);ctx.drawImage(tigerCv,-110,-140);ctx.restore();};
// Gesperrte Tierklasse: dunkle Silhouette mit Glanzkante
ART.locked=function(ctx){const w=ctx.canvas.width,h=ctx.canvas.height,im=ctx.getImageData(0,0,w,h),d=im.data;for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const l=(d[i]*.3+d[i+1]*.59+d[i+2]*.11);const v=Math.round(18+l*.18);d[i]=v+6;d[i+1]=v+2;d[i+2]=v;}ctx.putImageData(im,0,0);};
window.ARENA_ART_LOADED=true;
})();
