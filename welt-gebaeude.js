// GEBÄUDE · Einzelne Böden und Wandkanten mit Fenstern/Türen im vorhandenen Baumenu. Gemeinsame Sprite-Bilder, freie Grundrisse.
'use strict';
(()=>{if(!window.AT2)return;const M=MG,W=WeltKarte,H=WeltHook,B=M.weltBau,box=document.getElementById('wBau');
const floors=new Map(),edges=new Map(),sprites=new Map();let tool='boden',material='holz',active=false,drag=false,last='',hover=null;
const row=document.createElement('div');row.className='bau-wz';row.hidden=true;row.innerHTML='<button class="w-btn" data-part="boden">Boden</button><button class="w-btn" data-part="wand">Wand</button><button class="w-btn" data-part="fenster">Fenster</button><button class="w-btn" data-part="tuer">Einfache Tür</button><button class="w-btn" data-part="doppel">Doppeltür</button><button class="w-btn" data-material="holz">Holz</button><button class="w-btn" data-material="stein">Stein</button>';
const btn=document.createElement('button');btn.className='w-btn';btn.textContent='Gebäude';box.querySelector('.bau-wz').insertBefore(btn,box.querySelector('[data-done]'));box.insertBefore(row,box.querySelector('span'));
function refresh(){row.hidden=!active;btn.classList.toggle('on',active);for(const b of row.querySelectorAll('button'))b.classList.toggle('on',b.dataset.part===tool||b.dataset.material===material);if(active)box.querySelector('span').textContent=tool==='boden'?'Boden feldweise malen.': 'An einer Feldkante ziehen: '+({wand:'Wand',fenster:'Fenster',tuer:'einfache Tür',doppel:'Doppeltür'})[tool]+'.';}
btn.onclick=e=>{e.stopPropagation();active=true;B.setMode('platz');box.querySelector('.bau-str').hidden=true;for(const b of box.querySelectorAll('[data-wz]'))b.classList.remove('on');refresh();};row.onclick=e=>{e.stopPropagation();const b=e.target.closest('button');if(!b)return;if(b.dataset.part)tool=b.dataset.part;if(b.dataset.material)material=b.dataset.material;refresh();};
box.addEventListener('click',e=>{if(e.target.closest('[data-wz],[data-done]')){active=false;drag=false;refresh();}});document.getElementById('wBauBtn').addEventListener('click',()=>{active=false;drag=false;refresh();});addEventListener('keydown',e=>{if(e.key==='Escape'){active=false;drag=false;refresh();}});
const id=(x,y)=>x+','+y;
W.gebaeudeAt=(x,y)=>floors.has(id(x,y))||[id(x,y)+',x',id(x,y)+',y',id(x+1,y)+',y',id(x,y+1)+',x'].some(k=>edges.has(k));
function target(p){const t=W.tileAt(p.x,p.y),x=Math.floor(t.tx),y=Math.floor(t.ty),fx=t.tx-x,fy=t.ty-y;const near=[{d:fy,x,y,axis:'x'},{d:1-fy,x,y:y+1,axis:'x'},{d:fx,x,y,axis:'y'},{d:1-fx,x:x+1,y,axis:'y'}].sort((a,b)=>a.d-b.d)[0];return tool==='boden'?{x,y}:near;}
function free(x,y){return W.inMap(x,y)&&[W.T.WIESE,W.T.LUDUS].includes(W.feld[W.ix(x,y)]);}
function put(t,erase=false){if(!t.axis){if(!free(t.x,t.y))return false;erase?floors.delete(id(t.x,t.y)):floors.set(id(t.x,t.y),{...t,material});return true;}
const dx=t.axis==='x'?1:0,dy=1-dx;if(!W.inMap(t.x,t.y)||(!free(t.x,t.y)&&!free(t.x-dy,t.y-dx)))return false;
const k=id(t.x,t.y)+','+t.axis;if(erase)edges.delete(k);else edges.set(k,{x:t.x,y:t.y,axis:t.axis,material,tool});return true;}
function paint(p){const t=target(p),k=id(t.x,t.y)+','+(t.axis||'');hover=t;if(last!==k){put(t);last=k;}}
const old=H.pointer;H.pointer=(phase,p)=>{if(!active||!B.mode)return old?.(phase,p)||false;if(phase==='down'){drag=true;last='';paint(p);}else if(phase==='move'&&drag)paint(p);else if(phase==='up'){if(drag)paint(p);drag=false;last='';}else if(phase==='cancel'){drag=false;last='';}return true;};
// Reuse existing erase tool for the new parts as well.
let erasing=false;const erasePointer=H.pointer;H.pointer=(phase,p)=>{if(phase==='down')erasing=!active&&B.mode==='weg';if(erasing&&B.mode==='weg'&&(phase==='down'||phase==='move'||phase==='up')){const t=W.tileAt(p.x,p.y),x=Math.floor(t.tx),y=Math.floor(t.ty);floors.delete(id(x,y));for(const k of [id(x,y)+',x',id(x,y)+',y',id(x+1,y)+',y',id(x,y+1)+',x'])edges.delete(k);}if(phase==='up'||phase==='cancel')erasing=false;return erasePointer(phase,p);};
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
M.weltGebaeude={floors,edges,put,sprites};
})();
