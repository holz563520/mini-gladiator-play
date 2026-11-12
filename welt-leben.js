'use strict';
// =====================================================================================================================
// LEBEN AUF DER KARTE (welt-leben.js) · Gladiatoren antippen (Nahaufnahme mit Satz) und mit der Pinzette versetzen.
// Nur auf tageslauf-editor.html geladen, nicht im Spiel. Wunsch Thomas 11.11.2026 (wie RollerCoaster Tycoon Classic).
//
// · Antippen einer Figur öffnet die Nahaufnahme: echtes Gesicht (face-shots.js), ein zufälliger Satz (welt-saetze.js),
//   gesprochen mit der Stimme des Spiels, wenn sie geladen ist. Knöpfe: noch ein Satz, hochnehmen, Tätigkeit, Profil.
// · Pinzette: greift die Figur am Genick, hebt sie an, sie baumelt und strampelt. Mit der Maus folgt sie dem Zeiger,
//   am Handy hängt sie fest im Bild, während man die Karte darunter verschiebt. Antippen der Karte setzt sie dort ab.
//   Dort bleibt sie nach kurzem Staunen und schlendert von da aus weiter. Sonst geschieht nichts.
// · Leistung: eine getragene Figur, ein Zeiger über der gewählten Figur; die Nahaufnahme zeichnet nur, solange sie offen
//   ist, höchstens 30-mal je Sekunde. Keine Spielwirkung, kein Speicherwert.
// =====================================================================================================================
(()=>{
const M=window.MG,W=window.WeltKarte,H=window.WeltHook,Z=window.WeltSaetze;if(!M||!W||!H||!Z)return;const S=M.s,$=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>v<a?a:v>b?b:v,ease=u=>1-Math.pow(1-clamp(u,0,1),3);
const workerOf=g=>W.workers().find(w=>w.g.id===g.id);
const roleOf=g=>g.role||'Soldat';

// ---------- Nahaufnahme ----------
const nah=document.createElement('div');nah.id='wNah';nah.hidden=true;
nah.innerHTML=`<canvas width="220" height="170" aria-label="Nahaufnahme"></canvas><div class="nah-t"><header><b></b><small></small><button class="w-x" data-x aria-label="Schließen">✕</button></header><p class="nah-say"></p>
<div class="nah-btn"><button class="w-btn" data-more>💬 Und sonst?</button><button class="w-btn nah-zange" data-zange><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 1v4M8 5L4 15M8 5l4 10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg> Hochnehmen</button><button class="w-btn" data-profil>Profil</button></div></div>`;
document.getElementById('weltUi').appendChild(nah);
const fc=nah.querySelector('canvas'),fg=fc.getContext('2d');let sel=null,raf=0,lastPaint=0;
function ctxOf(g){return {stunde:M.weltTag?.stunde??12,partName:M.partName,andere:S.roster.filter(x=>!x.dead).slice(0,40).map(x=>x.name)};}
function say(line){if(!sel)return;sel.line=line;sel.t0=performance.now();sel.done=false;try{M.speakLine?.(line.t,null,sel.g,{});}catch(e){}}
function open(g){W.closeInfo();sel={g,line:null,t0:0};nah.hidden=false;nah.classList.remove('klein');nah.querySelector('header b').textContent=g.name;say(Z.satz(g,ctxOf(g)));head();if(!raf)raf=requestAnimationFrame(loop);}
function head(){if(!sel)return;const w=workerOf(sel.g),ps=w?W.pose(w):null;nah.querySelector('header small').textContent=roleOf(sel.g)+(ps?.state?' · '+ps.state:'');}
function close(){sel=null;nah.hidden=true;try{M.speakStop?.();}catch(e){}}
function loop(now){raf=0;if(!sel)return;raf=requestAnimationFrame(loop);if(now-lastPaint<33||document.hidden)return;lastPaint=now;
 const t=now/1000,L=sel.line,n=L?Math.floor((now-sel.t0)/28):0,p=nah.querySelector('.nah-say');
 if(L&&!sel.done){p.textContent='„'+L.t.slice(0,n)+(n<L.t.length?'':'“');if(n>=L.t.length)sel.done=true;}
 let talk=0;try{talk=M.talkMouth?.(sel.g)||0;}catch(e){}if(!talk&&L&&!sel.done)talk=Math.abs(Math.sin(t*13))*.55;
 try{fg.clearRect(0,0,fc.width,fc.height);M.faceShot.paint(fg,fc.width,fc.height,{g:sel.g,team:0,mood:L?.mood||'calm',yaw:Math.sin(t*.7)*.18,zoom:1.04,talk},t);}catch(e){if(!loop.warned){loop.warned=true;console.warn('Nahaufnahme',e);}}
 if(((now/500)|0)!==loop.h){loop.h=(now/500)|0;head();}}
nah.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!sel)return;const g=sel.g;
 if(b.dataset.x!=null)close();else if(b.dataset.more!=null)say(Z.satz(g,ctxOf(g)));else if(b.dataset.zange!=null)grab(g);
 else if(b.dataset.profil!=null){close();M.ui.click('detail:'+g.id);}});

// ---------- Pinzette ----------
const LIFT=16,NECK=13;let hand=null;const placed=new Map(),dust=[];
const hint=document.createElement('div');hint.id='wZange';hint.hidden=true;hint.innerHTML='<span></span><button class="w-btn" data-back>Zurückstellen</button>';document.getElementById('weltUi').appendChild(hint);
hint.querySelector('[data-back]').onclick=()=>{if(hand&&hand.state==='trag')drop({x:hand.ox,y:hand.oy},true);};
let hintT=0;function showHint(text,btn,ms){hint.hidden=false;hint.querySelector('span').textContent=text;hint.querySelector('button').hidden=!btn;clearTimeout(hintT);if(ms)hintT=setTimeout(()=>{if(!hand)hint.hidden=true;},ms);}
const toScreen=(x,y)=>({sx:(x-W.cam.x)*W.cam.s+W.vw/2,sy:(y-W.cam.y)*W.cam.s+W.vh/2});
function grab(g){if(hand)return;const w=workerOf(g),ps=w&&W.pose(w);if(!ps||ps.x==null){showHint(g.name+' ist gerade nicht auf der Karte zu sehen.',false,2600);return;}
 placed.delete(g.id);const s=toScreen(ps.x,ps.y-LIFT-5);hand={g,state:'greif',t:0,x:ps.x,y:ps.y,h:0,ox:ps.x,oy:ps.y,sx:s.sx,sy:s.sy,sw:0,dir:(ps.dx??1)<0?1:0,open:9,off:-220};
 nah.classList.add('klein');if(sel?.g===g)say(Z.hoch(g));showHint(g.name.split(' ')[0]+' hängt an der Pinzette. Tippe auf die Karte, um ihn abzusetzen.',true);try{M.sound?.('step');}catch(e){}}
function drop(p,back){if(!hand||hand.state!=='trag')return;hand.state='senk';hand.t=0;hand.fx=hand.x;hand.fy=hand.y;hand.fh=hand.h;hand.tx=clamp(p.x,20,W.WW-20);hand.ty=clamp(p.y,20,W.WH-20);hand.back=!!back;}
function landed(){const g=hand.g,p={x:hand.tx,y:hand.ty},n=g.name.split(' ')[0];W.place(g,p.x,p.y);
 placed.set(g.id,{x:p.x,y:p.y,stun:hand.back?.5:1.6,last:null,dir:hand.dir});
 for(let i=0;i<8;i++)dust.push({x:p.x+(Math.random()-.5)*8,y:p.y-1,vx:(Math.random()-.5)*26,vy:-6-Math.random()*12,t:0});
 try{M.sound?.('land');}catch(e){}if(sel?.g===g){say(Z.runter(g));nah.classList.remove('klein');}
 showHint(hand.back?n+' steht wieder an seinem Platz.':n+' abgesetzt.',false,2600);}
// Maus: die Figur folgt dem Zeiger. Finger: sie bleibt an ihrer Stelle im Bild, die Karte wandert darunter.
W.canvas.addEventListener('pointermove',e=>{if(!hand||e.pointerType!=='mouse')return;const r=W.canvas.getBoundingClientRect();hand.sx=e.clientX-r.left;hand.sy=e.clientY-r.top;});
addEventListener('keydown',e=>{if(e.key==='Escape'&&hand?.state==='trag')drop({x:hand.ox,y:hand.oy},true);});

const tap0=H.tap;H.tap=(p,w)=>{if(hand){if(hand.state==='trag')drop(p);return true;}if(w){open(w.g);return true;}if(sel){close();}return tap0?tap0(p,w):false;};
// Figur an der Pinzette ist aus der normalen Zeichnung genommen; abgesetzte Figuren stehen kurz und laufen dann zurück
const pose0=H.pose;H.pose=(w,ps,t)=>{if(pose0)ps=pose0(w,ps,t);if(hand&&hand.g.id===w.g.id&&hand.state!=='los')return {x:null,y:null,state:'hängt an der Pinzette',work:false};
 const p=placed.get(w.g.id);if(!p)return ps;const dt=p.last==null?0:clamp(t-p.last,0,.2);p.last=t;
 if(p.stun>0){p.stun-=dt;return {x:p.x,y:p.y,dx:p.dir?-1:1,dy:0,state:'schaut sich verdutzt um',work:false,top:true};}
 placed.delete(w.g.id);return ps;};

function tweezers(ctx,x,y,open,k,tilt){ctx.save();ctx.translate(x,y);ctx.rotate(tilt);ctx.scale(k,k);ctx.lineCap='round';ctx.lineJoin='round';
 for(const [col,lw] of [['#20262a',5.5],['#aeb9bf',3],['#e6edf0',1.2]]){ctx.strokeStyle=col;ctx.lineWidth=lw;for(const s of [-1,1]){ctx.beginPath();ctx.moveTo(s*open,2);ctx.lineTo(s*(open+2.5),-10);ctx.lineTo(s*3,-58);if(lw<2){ctx.moveTo(s*(open+1.5),-12);ctx.lineTo(s*2.4,-54);}ctx.stroke();}}
 ctx.fillStyle='#20262a';ctx.fillRect(-6,-74,12,20);ctx.fillStyle='#7f8a90';ctx.fillRect(-4,-72,8,16);ctx.fillStyle='#d7b24a';ctx.fillRect(-4,-66,8,3);ctx.restore();}
function figure(ctx,g,x,y,h,sw,dir,air,t){ctx.save();ctx.translate(x,y-h-NECK);ctx.rotate(sw);W.drawFig(ctx,g,0,NECK,air?Math.floor(t*11)%W.WALK:W.WALK,dir);ctx.restore();}
const world0=H.world;H.world=(ctx,view,dt)=>{world0?.(ctx,view,dt);const t=performance.now()/1000;
 // Staub beim Aufsetzen
 for(let i=dust.length-1;i>=0;i--){const d=dust[i];d.t+=dt;if(d.t>.5){dust.splice(i,1);continue;}d.x+=d.vx*dt;d.y+=d.vy*dt;d.vy+=60*dt;ctx.globalAlpha=1-d.t/.5;ctx.fillStyle='#d8c9a0';ctx.fillRect(Math.round(d.x),Math.round(d.y),2,2);}ctx.globalAlpha=1;
 // Zeiger über der gewählten Figur
 if(sel&&!(hand&&hand.g===sel.g)){const w=workerOf(sel.g),ps=w&&W.pose(w);if(ps&&ps.x!=null){const k=clamp(.7/W.cam.s,.45,3.5),y=ps.y-(W.mini?12:21)-Math.abs(Math.sin(t*4))*3*k;ctx.fillStyle='#20140c';ctx.beginPath();ctx.moveTo(ps.x-7*k,y-9*k);ctx.lineTo(ps.x+7*k,y-9*k);ctx.lineTo(ps.x,y+2*k);ctx.fill();ctx.fillStyle='#f4d37a';ctx.beginPath();ctx.moveTo(ps.x-4.5*k,y-7.5*k);ctx.lineTo(ps.x+4.5*k,y-7.5*k);ctx.lineTo(ps.x,y-.5*k);ctx.fill();}}
 if(!hand)return;const a=hand,k=clamp(.9/W.cam.s,.45,3)*.75;a.t+=dt;
 if(a.state==='greif'){const u=ease(a.t/.38);a.off=-220*(1-u);a.open=9-5*clamp((a.t-.3)/.08,0,1);if(a.t>=.42){a.state='heb';a.t=0;try{M.sound?.('stick');}catch(e){}}}
 else if(a.state==='heb'){a.h=LIFT*ease(a.t/.32);a.sw=Math.sin(a.t*18)*.12;if(a.t>=.32){a.state='trag';a.t=0;}}
 else if(a.state==='trag'){const p=W.toWorld(a.sx,a.sy),tx=p.x,ty=p.y+a.h+5,px=a.x;a.x+=(tx-a.x)*Math.min(1,dt*11);a.y+=(ty-a.y)*Math.min(1,dt*11);const v=dt>0?(a.x-px)/dt:0;if(Math.abs(v)>8)a.dir=v<0?1:0;
  const want=clamp(-v*.0035,-.7,.7)+Math.sin(t*3.1)*.07;a.sw+=(want-a.sw)*Math.min(1,dt*7);}
 else if(a.state==='senk'){const u=ease(a.t/.4);a.x=a.fx+(a.tx-a.fx)*u;a.y=a.fy+(a.ty-a.fy)*u;a.h=a.fh*(1-u*u);a.sw*=.85;if(a.t>=.4){a.h=0;a.sw=0;a.state='los';a.t=0;landed();}}
 else if(a.state==='los'){a.open=4+7*clamp(a.t/.1,0,1);a.off=-240*ease((a.t-.1)/.4);if(a.t>=.5){hand=null;return;}}
 const gx=Math.round(a.x),gy=Math.round(a.y),sh=1-a.h/LIFT*.45;ctx.fillStyle='rgba(15,20,10,.3)';ctx.fillRect(Math.round(gx-4*sh),gy,Math.round(8*sh),1);
 if(a.state!=='los')figure(ctx,a.g,gx,gy,a.h,a.sw,a.dir,a.h>4,t);
 tweezers(ctx,gx,gy-a.h-NECK+a.off,a.open,k,a.sw*.35);};

M.weltLeben={open,close,grab,drop:p=>drop(p),get sel(){return sel?.g||null;},get hand(){return hand;},placed};
})();
