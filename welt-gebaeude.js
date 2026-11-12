// GEBÄUDE · Boden setzen erzeugt automatisch Außenwände; Türen danach einsetzen. Lokale Randberechnung, gemeinsame Bauteilbilder.
'use strict';
(()=>{if(!window.AT2)return;const M=MG,W=WeltKarte,H=WeltHook,B=M.weltBau,box=document.getElementById('wBau');
const floors=new Map(),edges=new Map(),sprites=new Map();let tool='boden',material='holz',active=false,anchor=null;
const row=document.createElement('div');row.className='bau-wz';row.hidden=true;row.innerHTML='<button class="w-btn" data-part="boden">Boden</button><button class="w-btn" data-part="tuer">Einfache Tür</button><button class="w-btn" data-part="doppel">Doppeltür</button><button class="w-btn" data-material="holz">Holz</button><button class="w-btn" data-material="stein">Stein</button>';
const btn=document.createElement('button');btn.className='w-btn';btn.textContent='Gebäude';box.querySelector('.bau-wz').insertBefore(btn,box.querySelector('[data-done]'));box.insertBefore(row,box.querySelector('span'));
function candidate(){return anchor;}
function allowed(t){return !!t&&(tool==='boden'?free(t.x,t.y):edges.has(id(t.x,t.y)+','+t.axis));}
function refresh(){row.hidden=!active;btn.classList.toggle('on',active);for(const b of row.querySelectorAll('button'))b.classList.toggle('on',b.dataset.part===tool||b.dataset.material===material);if(active)box.querySelector('span').textContent=tool==='boden'?'Boden antippen: Außenwände entstehen automatisch. Ziehen bewegt die Karte.':'Eine Außenwand antippen, um die Tür einzusetzen. Ziehen bewegt die Karte.';}

btn.onclick=e=>{e.stopPropagation();active=true;B.setMode('platz');box.querySelector('.bau-str').hidden=true;for(const b of box.querySelectorAll('[data-wz]'))b.classList.remove('on');refresh();};row.onclick=e=>{e.stopPropagation();const b=e.target.closest('button');if(!b)return;if(b.dataset.part){tool=b.dataset.part;anchor=null;}if(b.dataset.material)material=b.dataset.material;refresh();};
box.addEventListener('click',e=>{if(e.target.closest('[data-wz],[data-done]')){active=false;anchor=null;refresh();}});document.getElementById('wBauBtn').addEventListener('click',()=>{active=false;anchor=null;refresh();});addEventListener('keydown',e=>{if(e.key==='Escape'){active=false;anchor=null;refresh();}});
const id=(x,y)=>x+','+y;
W.gebaeudeAt=(x,y)=>floors.has(id(x,y))||[id(x,y)+',x',id(x,y)+',y',id(x+1,y)+',y',id(x,y+1)+',x'].some(k=>edges.has(k));
function target(p){const t=W.tileAt(p.x,p.y),x=Math.floor(t.tx),y=Math.floor(t.ty),fx=t.tx-x,fy=t.ty-y;const near=[{d:fy,x,y,axis:'x'},{d:1-fy,x,y:y+1,axis:'x'},{d:fx,x,y,axis:'y'},{d:1-fx,x:x+1,y,axis:'y'}].sort((a,b)=>a.d-b.d)[0];return tool==='boden'?{x,y}:near;}
function free(x,y){return W.inMap(x,y)&&[W.T.WIESE,W.T.LUDUS].includes(W.feld[W.ix(x,y)]);}
function boundary(x,y,axis){const a=floors.get(id(x,y)),b=floors.get(id(x-(axis==='y'?1:0),y-(axis==='x'?1:0))),k=id(x,y)+','+axis;if(!!a===!!b){edges.delete(k);return;}const owner=a||b,old=edges.get(k);edges.set(k,{x,y,axis,material:owner.material,tool:old?.tool||'wand'});}
function rebuild(x,y){boundary(x,y,'x');boundary(x,y,'y');boundary(x+1,y,'y');boundary(x,y+1,'x');}
function put(t,erase=false){if(!t)return false;if(!t.axis){if(!free(t.x,t.y))return false;if(erase)floors.delete(id(t.x,t.y));else floors.set(id(t.x,t.y),{x:t.x,y:t.y,material});rebuild(t.x,t.y);return true;}const edge=edges.get(id(t.x,t.y)+','+t.axis);if(!edge||!['tuer','doppel'].includes(tool))return false;edge.tool=erase?'wand':tool;return true;}
// Select the visible wall face, including its height, rather than an invisible ground edge.
function pick(p){if(tool==='boden'){const t=W.tileAt(p.x,p.y);return {x:Math.floor(t.tx),y:Math.floor(t.ty)};}let result=null,depth=-Infinity;for(const b of edges.values()){const a=W.iso(b.x,b.y),sign=b.axis==='x'?1:-1,u=(p.x-a.x)/(32*sign),z=a.y+u*16-p.y;if(u>=0&&u<=1&&z>=-3&&z<=44&&a.y>depth){result={x:b.x,y:b.y,axis:b.axis};depth=a.y;}}return result;}
// Let the map handle drags and pinch gestures. A tap only positions the preview.
const singleTap0=H.singleTap;H.singleTap=()=>active&&!!B.mode||singleTap0?.();
const old=H.pointer;H.pointer=(phase,p)=>active&&B.mode?false:old?.(phase,p)||false;
const tap0=H.tap;H.tap=(p,w)=>{if(active&&B.mode){anchor=pick(p);if(allowed(anchor))put(anchor);refresh();return true;}return tap0?.(p,w);};
W.canvas.addEventListener('pointermove',e=>{if(!active||!B.mode)return;const r=W.canvas.getBoundingClientRect();anchor=pick(W.toWorld(e.clientX-r.left,e.clientY-r.top));});W.canvas.addEventListener('pointerleave',()=>anchor=null);
// Reuse existing erase tool for the new parts as well.
let erasing=false;const erasePointer=H.pointer;H.pointer=(phase,p)=>{if(phase==='down')erasing=!active&&B.mode==='weg';if(erasing&&B.mode==='weg'&&(phase==='down'||phase==='move'||phase==='up')){const t=W.tileAt(p.x,p.y),x=Math.floor(t.tx),y=Math.floor(t.ty);put({x,y},true);}if(phase==='up'||phase==='cancel')erasing=false;return erasePointer(phase,p);};
function sprite(mat,kind,axis){const key=mat+kind+axis;if(sprites.has(key))return sprites.get(key);const c=document.createElement('canvas');c.width=76;c.height=86;const g=c.getContext('2d'),wood=mat==='holz',sign=axis==='y'?-1:1;
const P=(u,z)=>[38+sign*u*32,65+u*16-z];
function poly(ps,col){g.beginPath();ps.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fillStyle=col;g.fill();}
function rect(a,b,lo,hi,col){poly([P(a,lo),P(b,lo),P(b,hi),P(a,hi)],col);}
function line(a,b,col,w=1){g.beginPath();g.moveTo(...a);g.lineTo(...b);g.strokeStyle=col;g.lineWidth=w;g.stroke();}
if(kind==='boden'){poly([[38,49],[70,65],[38,81],[6,65]],wood?'#aa7a45':'#c3b18e');g.strokeStyle=wood?'#6e492b':'#8d795b';for(let i=0;i<=4;i++){line([38-i*8,49+i*4],[70-i*8,65+i*4],wood?'#705031':'#948063');if(!wood)line([38+i*8,49+i*4],[6+i*8,65+i*4],'#948063');else line([38-i*8,50+i*4],[70-i*8,66+i*4],'#cf9f62');}}
else{rect(0,1,-3,44,wood?'#916132':'#c7b28b');
if(wood){for(let z=0;z<44;z+=5){rect(.05,.95,z,z+1,'#54371f');rect(.05,.95,z+1,z+2,'#bb8b4e');line(P(.2,z+3),P(.7,z+3),'#81532c');}}else for(let z=0;z<44;z+=7){for(let u=-(z/7%2)*.5;u<1;u+=.5){const a=Math.max(0,u),b=Math.min(1,u+.5);rect(a+.015,b-.015,z+.5,z+6.5,z%2?'#bba47c':'#d2be96');line(P(a+.02,z+6),P(b-.02,z+6),'#ead7b0');}}
rect(0,.08,0,44,wood?'#4a2c19':'#e4d1a7');rect(.92,1,0,44,wood?'#4a2c19':'#e4d1a7');rect(0,1,0,4,'#796348');rect(0,1,40,44,wood?'#c59a5e':'#f0dcb0');
if(kind==='wand'&&wood){line(P(.1,5),P(.9,39),'#50301c',3);line(P(.12,5),P(.92,39),'#bd8c50');}
if(kind!=='wand'){const win=kind==='fenster',lo=win?15:4,hi=35,a=win?.2:.12,b=win?.8:.88;rect(a-.05,b+.05,lo-2,hi+3,wood?'#c39a5c':'#ead7b0');rect(a,b,lo,hi,'#292a22');if(win){for(let u=a+.12;u<b;u+=.16)line(P(u,lo+1),P(u,hi-1),'#b89c64');line(P(a,lo+8),P(b,lo+8),'#b89c64');rect(a-.1,b+.1,lo-3,lo,'#e0bd7d');}else{rect(a+.03,b-.03,lo+1,hi-1,'#785032');for(let u=a+.1;u<b;u+=.12)line(P(u,lo+1),P(u,hi-1),'#432e20');for(const z of [11,28])line(P(a,z),P(b,z),'#292822',2);if(kind==='doppel')line(P(.5,lo),P(.5,hi),'#211a14',2);const p=P(kind==='doppel'?.44:.72,18);g.fillStyle='#e8bf65';g.fillRect(p[0],p[1],2,3);}}
poly([P(0,44),P(1,44),[P(1,44)[0]+4,P(1,44)[1]-2],[42,19]],wood?'#e0b57a':'#f4e3bf');}
sprites.set(key,c);return c;}
const items0=H.items;H.items=(items,view)=>{items0?.(items,view);for(const b of edges.values()){const p=W.iso(b.x,b.y);if(p.x<view.x0-70||p.x>view.x1+70||p.y<view.y0-25||p.y>view.y1+55)continue;items.push({y:p.y+8,draw(ctx){ctx.drawImage(sprite(b.material,b.tool,b.axis),Math.round(p.x-38),Math.round(p.y-65));}});}};
// Floor tiles must be painted before actors and walls, through the existing terrain pass.
const base0=H.ground;H.ground=(ctx,view)=>{base0?.(ctx,view);for(const b of floors.values()){const p=W.iso(b.x,b.y);if(p.x<view.x0-70||p.x>view.x1+70||p.y<view.y0-40||p.y>view.y1+40)continue;ctx.drawImage(sprite(b.material,'boden','x'),Math.round(p.x-38),Math.round(p.y-49));}};
const world0=H.world;H.world=(ctx,view,dt)=>{world0?.(ctx,view,dt);if(!active||!B.mode||!anchor)return;const t=anchor,p=W.iso(t.x,t.y);ctx.save();ctx.globalAlpha=.55;ctx.drawImage(sprite(t.axis?(edges.get(id(t.x,t.y)+','+t.axis)?.material||material):material,tool,t.axis||'x'),Math.round(p.x-38),Math.round(p.y-(t.axis?65:49)));ctx.restore();};
M.weltGebaeude={floors,edges,put,sprites,candidate,rebuild};
})();
