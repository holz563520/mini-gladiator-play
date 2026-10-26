'use strict';
/* =====================================================================================================
   PLÜNDERUNGEN · ANFÜHRER-DARSTELLUNG (Fernrohr, Nahaufnahmen, Ansturm, Plündern, Deckung) für Spiel und Testseite.
   Übernommen von der Testseite „Anführer“ (anfuehrer-test.html). outside.js ruft DebtLeaderUI.install(ctx) auf und gibt die
   Hilfen der Mission mit (Blasen, Bericht, Kamera-Zustand, Laufen). Keine Spielregeln hier, nur Darstellung und Ablauf nach dem Kampf.
   ===================================================================================================== */
(()=>{
const M=window.MG,S=M.s,A=window.DebtArt,$=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>v<a?a:v>b?b:v,sleep=ms=>new Promise(r=>setTimeout(r,ms)),pick=l=>l[Math.floor(Math.random()*l.length)];
const first=g=>String(g?.name||'').split(' ')[0];
let C=null;// Kontext aus outside.js
const R={get b(){return S.battle;},get cam(){return C.cam();}};
const bubble=(...a)=>C.bubble(...a),mlog=(...a)=>C.mlog(...a),toScreen=(...a)=>C.toScreen(...a),spd=()=>Math.max(1,S.options?.speed||1),live=b=>C.live(b),setState=t=>C.state?.(t);
const partyActors=b=>b.actors.filter(a=>a.team===0&&!a.down&&!a.g.dead);
const leaderA=b=>b?.lead?b.actors.find(a=>a.id===b.lead.leaderId):null;
function lname(a){return '★ '+first(a.g)+' · Anführer';}
function routeTo(b,a,tx,ty,sp){const path=D().findPath(b,a.x,a.y,tx,ty);const pts=(path&&path.length?path:[{x:tx,y:ty}]).map(p=>[p.x,p.y,sp]);a.to=pts.shift();a.path=pts;a.goal=[tx,ty,sp];}
const D=()=>window.Debt;
function walkSome(b,list,limit=9000){const t0=performance.now();return new Promise(res=>{const chk=()=>{if(!live(b))return res(false);if(list.every(a=>!a.to||a.down||a.g.dead)||performance.now()-t0>limit/Math.min(2,spd())){for(const a of list){a.to=null;a.path=[];a.state='idle';a.moveSpeed=0;}return res(true);}setTimeout(chk,80);};chk();});}
// Gebüsch vor versteckten Assassinen (Tiefen-Sprite ohne Kollision) und Markierung unter dem Anführer
const BUSH={wald:['#1f3a1e','#2f5527','#467a33','#5f9a3d'],dorf:['#2b3f1d','#41612a','#5b8236','#79a243'],stadt:['#3a2f22','#5a4630','#7b6040','#9a7a52']};
// Deckung der Assassinen: Zweige vor dem knienden Körper (Stadt: Kisten). Nach dem Losstürmen liegen die Zweige am Boden.
function drawCover(ctx,o){const b=S.battle,c=BUSH[b?.L?.biome]||BUSH.wald,x=Math.round(o.x),y=Math.round(o.y),t=performance.now()/1000,city=b?.L?.biome==='stadt';ctx.save();
 if(city){ctx.fillStyle='#00000033';ctx.fillRect(x-24,y-2,48,6);ctx.fillStyle=c[0];ctx.fillRect(x-22,y-40,44,40);ctx.fillStyle=c[2];ctx.fillRect(x-20,y-38,19,36);ctx.fillRect(x+1,y-38,19,36);ctx.fillStyle=c[3];ctx.fillRect(x-20,y-38,19,3);ctx.fillRect(x+1,y-38,19,3);ctx.fillStyle=c[1];ctx.fillRect(x-12,y-34,2,30);ctx.fillRect(x+9,y-34,2,30);ctx.restore();return;}
 if(o.dropped!==undefined){// Zweige liegen
  for(let k=0;k<3;k++){const ox=x+(k-1)*12,oy=y+2+k*3;ctx.fillStyle='#4a3520';ctx.fillRect(ox-14,oy,30,2);for(let n=0;n<5;n++){ctx.fillStyle=c[1+(n+k)%3];ctx.fillRect(ox-12+n*6,oy-2-(n%2)*2,5,3);}}ctx.restore();return;}
 const sprays=[[-9,58,-.18],[1,70,.05],[10,54,.22]];
 for(const [dx,h,lean] of sprays){const sw=Math.sin(t*1.6+o.seed+dx)*1.4,bx=x+dx,by=y-4,tx=bx+lean*h+sw,ty=by-h;
  ctx.strokeStyle='#4a3520';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(tx,ty);ctx.stroke();
  for(let n=0;n<9;n++){const k=n/8,lx=bx+(tx-bx)*k,ly=by+(ty-by)*k,side=n%2?1:-1,len=7-k*2;ctx.fillStyle=c[(n+2)%4]||c[1];
   ctx.beginPath();ctx.ellipse(lx+side*len*.8,ly+1,len,3.2,side*.6+lean,0,Math.PI*2);ctx.fill();}}
 ctx.restore();}
function hookDraw(){if(M.drawSprite?.__lead)return;M.drawSprite=(ctx,o)=>{if(o.leadCover){drawCover(ctx,o);return;}A.drawSprite(ctx,o);};M.drawSprite.__lead=1;
 const prevU=M.battleUnderlay;M.battleUnderlay=(ctx,b)=>{prevU?.(ctx,b);const a=leaderA(b);if(!a||a.down||a.g.dead)return;ctx.save();ctx.strokeStyle='#f4d37a';ctx.lineWidth=2;ctx.setLineDash([6,4]);ctx.beginPath();ctx.ellipse(a.x,a.y+5,24,10,0,0,Math.PI*2);ctx.stroke();ctx.restore();};}

// ---------- Fernglas ----------
// ---------- Nahaufnahme: Griff von hinten und Ellbogen ----------
// Bei der Warnung des Anführers: Zeitlupe, Kamera ganz nah an beide, Kinobalken. Rechts ein Comic-Bild in Nahaufnahme:
// erst der Angreifer mit der Klinge am Hals, dann der Ellbogen ins Gesicht („KRACK!“), Zähne und Blut fliegen.
const CLOSE={on:false,v:null,a:null,t0:0,hit:0,speed:1,timer:0,fa:null,fv:null};
function closeStart(v,a){if(CLOSE.on)return;Object.assign(CLOSE,{on:true,group:null,v,a,t0:performance.now(),hit:0,speed:S.options.speed||1});S.options.speed=.28;$('cine').hidden=false;
 $('closeTitle').textContent='GRIFF VON HINTEN!';$('closeText').textContent=`${first(a.g)} packt ${first(v.g)} von hinten …`;
 CLOSE.fa=document.createElement('canvas');CLOSE.fa.width=160;CLOSE.fa.height=104;CLOSE.fv=document.createElement('canvas');CLOSE.fv.width=160;CLOSE.fv.height=104;
 clearTimeout(CLOSE.timer);CLOSE.timer=setTimeout(closeEnd,4200);requestAnimationFrame(closeFrame);}
function closeHit(v,a){if(!CLOSE.on||CLOSE.v!==v)closeStart(v,a);CLOSE.hit=performance.now();$('closeTitle').textContent='ELLBOGEN! KRACK!';$('closeText').textContent=`${first(v.g)} schlägt ${first(a.g)} den Ellbogen ins Gesicht.`;
 clearTimeout(CLOSE.timer);CLOSE.timer=setTimeout(closeEnd,1900);}
// Ansturm der Assassinen aus der Deckung: Zeitlupe, Kamera folgt ihnen, Kinobalken, Kriegsschrei
function chargeCine(list){if(CLOSE.on||!list?.length)return;Object.assign(CLOSE,{on:true,v:null,a:null,group:list,hit:0,speed:S.options.speed||1});S.options.speed=.35;$('cine').hidden=false;$('closeCv').hidden=true;
 $('closeTitle').textContent='AUS DEM HINTERHALT!';$('closeText').textContent=list.map(a=>first(a.g)).join(' und ')+' brechen aus der Deckung.';
 for(const a of list)bubble(a,pick(['FÜR DEN LUDUS!','ÜBERRASCHUNG, IHR SÄUE!','HALLO, HINTERN!','JETZT SEID IHR DRAN!','AAAAAH!']),{name:first(a.g),loud:true,ms:2200});
 clearTimeout(CLOSE.timer);CLOSE.timer=setTimeout(closeEnd,1900);}
function closeEnd(){if(!CLOSE.on)return;CLOSE.on=false;CLOSE.group=null;$('closeCv').hidden=false;S.options.speed=CLOSE.speed;$('cine').hidden=true;}
function face(cv,g,mood,yaw,t){const c=cv.getContext('2d');c.imageSmoothingEnabled=false;try{M.faceShot.paint(c,cv.width,cv.height,{g,team:g.enemy?1:0,mood,yaw,zoom:1.1,lines:0,clear:true},t);}catch(e){}return cv;}
function closeFrame(now){if(!CLOSE.on)return;const cv=$('closeCv'),g=cv.getContext('2d'),W=cv.width,H=cv.height,v=CLOSE.v,a=CLOSE.a,hit=CLOSE.hit?Math.min(1,(now-CLOSE.hit)/700):0,pre=!CLOSE.hit;g.imageSmoothingEnabled=false;
 const shake=CLOSE.hit&&now-CLOSE.hit<260?(Math.random()-.5)*10:0;g.save();g.translate(shake,shake*.6);
 // Hintergrund: Strahlen
 g.fillStyle=pre?'#3a2418':'#7a1f14';g.fillRect(-10,-10,W+20,H+20);const cx=W*.62,cy=H*.42;
 for(let i=0;i<18;i++){const a0=i/18*Math.PI*2+now/2400;g.fillStyle=i%2?(pre?'#4a2e1c':'#c7462a'):(pre?'#2f1d13':'#e6a03c');g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(a0)*400,cy+Math.sin(a0)*400);g.lineTo(cx+Math.cos(a0+.2)*400,cy+Math.sin(a0+.2)*400);g.fill();}
 // Angreifer (rechts): erst grinsend mit Klinge, nach dem Treffer Schmerz, fliegt nach hinten
 const fa=face(CLOSE.fa,a.g,pre?'grin':hit<.5?'shock':'pain',-.35,60+now/90),rec=pre?0:Math.min(1,hit*2.2);
 g.save();g.translate(W*.66+rec*26,H*.44-rec*6);g.rotate(rec*.32);g.drawImage(fa,-88,-58,176,114);g.restore();
 // Gewarnter (links, schaut nach hinten)
 const fv=face(CLOSE.fv,v.g,pre?'shock':'roar',.45,60+now/90);g.drawImage(fv,-6,H*.34,150,98);
 // Klinge am Hals (vor dem Treffer)
 if(pre){const wob=Math.sin(now/90)*2;g.strokeStyle='#d8d8d0';g.lineWidth=5;g.beginPath();g.moveTo(W*.5,H*.86+wob);g.lineTo(W*.2,H*.78+wob);g.stroke();g.strokeStyle='#5a3a1c';g.lineWidth=7;g.beginPath();g.moveTo(W*.5,H*.86+wob);g.lineTo(W*.6,H*.9+wob);g.stroke();}
 // Ellbogen: vom Gewarnten nach hinten-oben ins Gesicht des Angreifers
 const sk=v.g.appearance?.skin||'#c99a74',cl=v.g.appearance?.cloth||'#6b4a2a',reach=pre?0:Math.min(1,hit*4),ex=W*.3+reach*W*.28,ey=H*.98-reach*H*.5;
 // angewinkelter Arm: Oberarm (Ärmel) von der Schulter zum Ellbogen, Unterarm zurück zur Brust gefaltet, Ellbogenspitze voraus
 const sx=W*.2,sy=H*1.04,hx=ex-34-reach*10,hy=ey+30;g.lineCap='round';g.lineJoin='round';
 g.strokeStyle='#17201c';g.lineWidth=31;g.beginPath();g.moveTo(sx,sy);g.lineTo(ex,ey);g.lineTo(hx,hy);g.stroke();
 g.strokeStyle=sk;g.lineWidth=23;g.beginPath();g.moveTo(ex,ey);g.lineTo(hx,hy);g.stroke();g.fillStyle=sk;g.beginPath();g.arc(hx,hy,11,0,Math.PI*2);g.fill();
 g.strokeStyle=cl;g.lineWidth=25;g.beginPath();g.moveTo(sx,sy);g.lineTo(sx+(ex-sx)*.8,sy+(ey-sy)*.8);g.stroke();
 g.strokeStyle=sk;g.lineWidth=23;g.beginPath();g.moveTo(sx+(ex-sx)*.8,sy+(ey-sy)*.8);g.lineTo(ex,ey);g.stroke();
 g.fillStyle='#00000038';g.beginPath();g.arc(ex+3,ey-2,8,0,Math.PI*2);g.fill();g.fillStyle='#ffffff30';g.fillRect(ex-6,ey-12,8,3);
 if(!pre&&reach>=1){// Aufprall
  const k=Math.min(1,(now-CLOSE.hit)/350);g.fillStyle='#fff3c4';g.strokeStyle='#17201c';g.lineWidth=3;g.beginPath();for(let i=0;i<16;i++){const r=(i%2?14:34)*(.6+k*.6),an=i/16*Math.PI*2;g.lineTo(ex+8+Math.cos(an)*r,ey-6+Math.sin(an)*r);}g.closePath();g.fill();g.stroke();
  g.fillStyle='#8a1f14';g.font='bold 22px "Courier Prime",monospace';g.textAlign='center';g.fillText('KRACK!',ex+10,ey);
  for(let i=0;i<6;i++){const t=(now-CLOSE.hit)/600,px=ex+20+i*9+t*60*(1+i*.2),py=ey-10+i*5+t*t*120-t*40;g.fillStyle=i%3?'#a12a22':'#f2efe0';g.fillRect(px,py,i%3?4:5,i%3?4:5);}}
 g.restore();requestAnimationFrame(closeFrame);}
// ---------- Nach dem Kampf: Überlebende flehen um Gnade (es gibt keine), Gefallene werden geplündert ----------
// Gesichter wie bei der Urteilsszene der Arena (M.faceShot: flehen, Grinsen, Gnadenstoß mit Blut), aber ohne Gnadenskala.
const PLEAS=[['Gnade! Ich hab drei Kinder!','Dann haben drei Kinder ab heute frei.'],['Bitte! Ich putz euch auch die Latrinen!','Im Hades gibt es auch Latrinen. Viel Spaß.'],['Ich war nur der Koch! Ehrlich!','Dann weißt du ja, wie man Fleisch zerlegt. Halt still.'],
 ['Meine Mutter wartet auf mich!','Lange wartet sie nicht mehr. Ich schick ihr deine Ohren.'],['Nimm mein Gold! Meine Frau! Meinen Esel!','Den Esel nehm ich. Der Rest geht mit dir.'],['Ich hab mir in die Hose gemacht! Reicht das nicht?','Riecht nach Reue. Hilft trotzdem nicht.'],
 ['Ich schwöre, ich werde ein besserer Mensch!','Wirst du. Ein stiller.'],['Bitte … nicht ins Gesicht …','Keine Sorge. Ich nehm den Hals.'],['Ich ergebe mich! Ich ergebe mich!','Angenommen. Und abgelehnt.'],['Wir können doch reden!','Reden ist Silber. Stechen ist Gold.'],
 ['Ich bin noch so jung!','Und du bleibst es. Für immer.'],['Lass mich leben, ich verrat dir, wo das Gold ist!','Steht schon auf deinem Gürtel. Danke.']];
const LOOT=['Drei Kupferstücke und ein Zahn. Der Zahn war seiner.','Ein Liebesbrief: „Komm heil zurück.“ Tja. Zurück kommt er. In Teilen.','Die Stiefel stinken nach Tod. Passen aber.','Ein Glücksbringer. Offensichtlich eine Fälschung.','Ein halbes Brot. Die andere Hälfte hat er noch im Hals.',
 'Gezinkte Würfel. Das Glück hat er trotzdem verloren.','Nichts. Nicht mal Würde. Die hat er beim Betteln liegen lassen.','Ein Ring. Der Finger kommt mit, der Ring geht nicht ab.','Eine Locke. Von seiner Frau oder seinem Hund. Egal, die kriegt jetzt der Ofen.','Ein Schuldschein. Er schuldet jetzt niemandem mehr was. Wir auch nicht.'];
const AF={on:false,o:null,t0:0,skip:false};
function afShow(label,count,who,text){$('after').hidden=false;$('afLabel').textContent=label;$('afCount').textContent=count||'';$('afWho').textContent=who;$('afSay').textContent=text;}
function afFrame(now){if(!AF.on)return;const cv=$('afCv'),g=cv.getContext('2d'),t=(now-AF.t0)/1000;g.imageSmoothingEnabled=false;const o=typeof AF.o==='function'?AF.o(t):AF.o;try{M.faceShot.paint(g,cv.width,cv.height,o,t+3);}catch(e){}
 if(AF.flash&&t>=AF.flash&&t<AF.flash+.12){g.globalAlpha=.8*(1-(t-AF.flash)/.12);g.fillStyle='#fff6dc';g.fillRect(0,0,cv.width,cv.height);g.globalAlpha=1;}requestAnimationFrame(afFrame);}
function afPaint(o,flash=0){AF.o=o;AF.t0=performance.now();AF.flash=flash;if(!AF.on){AF.on=true;requestAnimationFrame(afFrame);}}
function afHide(){AF.on=false;$('after').hidden=true;}
const afWait=ms=>new Promise(res=>{const t0=performance.now(),lim=Math.max(ms*.6,ms/spd());AF.skip=false;const chk=()=>{if(AF.skip||performance.now()-t0>=lim)return res();setTimeout(chk,50);};chk();});
function nearestParty(b,e){return partyActors(b).reduce((m,a)=>!m||Math.hypot(a.x-e.x,a.y-e.y)<Math.hypot(m.x-e.x,m.y-e.y)?a:m,null);}
function walkTo(b,a,x,y,sp=95){routeTo(b,a,x,y,sp);return walkSome(b,[a],7000);}
async function aftermath(b){const alive=b.encEnemies.filter(e=>!e.g.dead&&(e.down||e.surrendered)),cl=v=>Math.max(0,Math.min(1,v));let n=0;
 for(const e of alive){if(!live(b))break;const k=nearestParty(b,e);if(!k)break;n++;const side=k.x<e.x?-1:1,[plea,reply]=pick(PLEAS),hurt=cl(1.15-M.health(e.g)/100);
  setState('Nach dem Kampf …');bubble(e,plea,{name:first(e.g)});await walkTo(b,k,e.x+side*28,e.y+4);if(!live(b))break;k.a=side<0?0:Math.PI;
  afShow('Fleht um Gnade',`${n} / ${alive.length}`,e.g.name,'„'+plea+'“');afPaint({g:e.g,team:1,hurt,zoom:.92,ground:true,mood:'plead',yaw:-.35});mlog(`<b class="foe">${esc(e.g.name)}</b> fleht: „${esc(plea)}“`);await afWait(2600);if(!live(b))break;
  afShow('Keine Gnade',`${n} / ${alive.length}`,k.g.name,'„'+reply+'“');afPaint({g:k.g,team:0,zoom:.95,mood:'grin',yaw:.35});bubble(k,reply,{name:first(k.g),ms:2400});mlog(`<b>${esc(k.g.name)}:</b> „${esc(reply)}“`);await afWait(2400);if(!live(b))break;
  afShow('Gnadenstoß',`${n} / ${alive.length}`,e.g.name,first(k.g)+' stößt zu.');
  afPaint(t=>{const q=t-1;return {g:e.g,team:1,hurt,zoom:.92,ground:true,mood:q<0?'terror':q<.5?'shock':q<.9?'pain':'out',pale:cl(q/1.5),blood:cl((q-.3)/1.2),tilt:q>.9?Math.min(.3,(q-.9)*.3):0,sink:q>.9?Math.min(16,(q-.9)*14):0,fx:{stab:t-.8},pool:cl(q/2),dark:cl((q-1.4)/1.2)*.6,yaw:-.35+.4*cl(t/3)};},1);
  setTimeout(()=>{if(!e.g.dead){try{M.death(e,'Gnadenstoß',k);}catch(err){e.g.dead=true;e.down=true;e.state='dead';}M.sound?.('stick');}},Math.max(600,1000/spd()));
  await afWait(2700);mlog(`<b>${esc(k.g.name)}</b> gibt <b class="foe">${esc(e.g.name)}</b> den Gnadenstoß.`);}
 const bodies=b.encEnemies.filter(e=>e.g.dead).slice(0,3);let i=0;
 for(const e of bodies){if(!live(b))break;const k=nearestParty(b,e);if(!k)break;i++;await walkTo(b,k,e.x+(k.x<e.x?-24:24),e.y+6);if(!live(b))break;k.a=k.x<e.x?0:Math.PI;
  const w=e.g.enemyGear?.weapon,line=pick(LOOT);afShow('Wird geplündert',`${i} / ${bodies.length}`,k.g.name+' durchsucht '+first(e.g),'„'+line+'“'+(w?' · Dazu: '+M.itemName(w)+'.':''));
  afPaint({g:k.g,team:0,zoom:.95,mood:pick(['grin','confident','dumb']),yaw:.3});bubble(k,line,{name:first(k.g),ms:2600});mlog(`<b>${esc(k.g.name)}</b> durchsucht ${esc(e.g.name)}: „${esc(line)}“`);await afWait(2600);}
 afHide();}
const SPY={on:false,focus:null,fx:0,fy:0};
// Fernrohr: Die Kamera zoomt wirklich auf den Gegner (M.battleCamera), darüber eine schwarze Maske mit einem runden Ausschnitt.
// Unten links die Nahansicht des Anführers, der das Fernrohr ans Auge hält.
function spyTarget(b){return SPY.focus&&!SPY.focus.g.dead?{x:SPY.focus.x,y:SPY.focus.y-40}:b?.group?{x:b.group.ex+20,y:b.group.ey-38}:{x:R.cam.x,y:R.cam.y};}
function spyFrame(t){if(!SPY.on)return;const b=R.b,tg=spyTarget(b);SPY.fx+=(tg.x-SPY.fx)*.07;SPY.fy+=(tg.y-SPY.fy)*.07;SPY.zoom+=((SPY.focus?3.1:2)-SPY.zoom)*.05;
 const cv=$('spyMask'),w=cv.clientWidth,h=cv.clientHeight;if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}const g=cv.getContext('2d'),cx=w/2,cy=h*.44,r=Math.min(w,h)*.4,sway=Math.sin(t/700)*3;
 g.clearRect(0,0,w,h);g.save();g.fillStyle='#050807';g.beginPath();g.rect(0,0,w,h);g.arc(cx+sway,cy,r,0,Math.PI*2,true);g.fill('evenodd');
 const vg=g.createRadialGradient(cx+sway,cy,r*.55,cx+sway,cy,r);vg.addColorStop(0,'#0000');vg.addColorStop(1,'#000d');g.fillStyle=vg;g.beginPath();g.arc(cx+sway,cy,r,0,Math.PI*2);g.fill();
 g.lineWidth=Math.max(6,r*.05);g.strokeStyle='#7a5a24';g.beginPath();g.arc(cx+sway,cy,r+g.lineWidth/2,0,Math.PI*2);g.stroke();g.lineWidth=2;g.strokeStyle='#d6b061';g.beginPath();g.arc(cx+sway,cy,r+1,0,Math.PI*2);g.stroke();
 g.fillStyle='#ffffff10';g.beginPath();g.ellipse(cx+sway-r*.35,cy-r*.42,r*.28,r*.1,-.6,0,Math.PI*2);g.fill();g.restore();
 paintSpyFace(t);requestAnimationFrame(spyFrame);}
function paintSpyFace(t){const me=leaderA(R.b);if(!me||!M.faceShot)return;const cv=$('spyFace'),g=cv.getContext('2d'),W=cv.width,H=cv.height;g.imageSmoothingEnabled=false;
 try{M.faceShot.paint(g,W,H,{g:me.g,team:0,mood:'determined',yaw:.35,zoom:1.15,lines:0,clear:true},60+t/80);}catch(e){}
 // Fernrohr am rechten Auge, nach rechts gerichtet (Messing, drei Auszüge), Hand darunter
 const ex=W*.6,ey=H*.5+Math.sin(t/700)*.8;const seg=[[ex-2,ey-6,22,12,'#6b4a1c','#b88a3c'],[ex+18,ey-7,26,14,'#7a5622','#d1a24c'],[ex+42,ey-8,W-ex-40,16,'#5f421a','#a97e36']];
 for(const [x,y,w,h,dk,lt] of seg){g.fillStyle=dk;g.fillRect(x,y,w,h);g.fillStyle=lt;g.fillRect(x,y+2,w,3);g.fillStyle='#2b1d0b';g.fillRect(x+w-2,y,2,h);}
 g.fillStyle='#1a1208';g.fillRect(ex-4,ey-5,3,10);const sk=me.g.appearance?.skin||'#c99a74';g.fillStyle=sk;g.fillRect(ex+22,ey+6,16,9);g.fillStyle='#00000040';g.fillRect(ex+22,ey+12,16,3);}
async function spyShow(b,lines){const me=leaderA(b);if(!me)return;SPY.on=true;SPY.skip=false;SPY.focus=null;SPY.zoom=1;SPY.fx=R.cam.x;SPY.fy=R.cam.y;$('spy').hidden=false;$('spyName').textContent=lname(me)+' · durchs Fernrohr';requestAnimationFrame(spyFrame);
 for(const l of lines){if(SPY.skip||!live(b))break;SPY.focus=l.focus;const el=$('spyText');el.textContent='';mlog(`<b class="ldr">★ ${esc(me.g.name)}</b> (Fernrohr): „${esc(l.text)}“`);
  for(let i=0;i<=l.text.length&&!SPY.skip;i+=2){el.textContent=l.text.slice(0,i);await sleep(16);}el.textContent=l.text;await waitSkip(Math.max(1700,900+l.text.length*42));}
 SPY.on=false;$('spy').hidden=true;}
function waitSkip(ms){return new Promise(res=>{const t0=performance.now(),lim=Math.max(ms*.6,ms/spd());const chk=()=>{if(SPY.skip||performance.now()-t0>=lim)return res();setTimeout(chk,50);};chk();});}
// Kamera während Fernrohr und Nahaufnahmen (sonst null)
function camera(b,width,height,W,H){const fit=Math.min(width/W,height/H),k=height/C.VH;
 if(CLOSE.on&&CLOSE.group){const l=CLOSE.group.filter(a=>!a.g.dead),lead=l[0]||CLOSE.group[0],tg=b.actors.find(x=>x.id===lead.target),cx=lead.x+(tg?Math.max(-80,Math.min(80,(tg.x-lead.x)*.35)):40),cy=lead.y-40+(tg?(tg.y-lead.y)*.25:0),Z=1.7,vw=width/(k*Z),vh=C.VH/Z;return {zoom:k/fit*Z,x:clamp(cx,vw/2,W-vw/2),y:clamp(cy,vh/2,H-vh/2)};}
 if(CLOSE.on&&CLOSE.v){const v=CLOSE.v,a=CLOSE.a,cx=(v.x+(a?a.x:v.x))/2,cy=(v.y+(a?a.y:v.y))/2-44,Z=2.3,vw=width/(k*Z),vh=C.VH/Z;return {zoom:k/fit*Z,x:clamp(cx,vw/2,W-vw/2),y:clamp(cy,vh/2,H-vh/2)};}
 if(SPY.on){const z=k/fit*SPY.zoom,vw=width/(k*SPY.zoom),vh=C.VH/SPY.zoom;return {zoom:z,x:clamp(SPY.fx,vw/2,W-vw/2),y:clamp(SPY.fy+vh*.06,vh/2,H-vh/2)};}
 return null;}
const MARKUP='<div id="after" hidden><div class="af-top"><span id="afLabel"></span><i id="afCount"></i></div><canvas id="afCv" width="480" height="250"></canvas><button class="btn" id="afterSkip" type="button">Weiter ▶</button><blockquote><b id="afWho"></b><span id="afSay"></span></blockquote></div>'
 +'<div id="cine" hidden><canvas id="closeCv" width="320" height="200"></canvas><div class="close-cap"><b id="closeTitle"></b><span id="closeText"></span></div></div>'
 +'<div id="spy" hidden><canvas id="spyMask"></canvas><canvas id="spyFace" width="160" height="104"></canvas><div class="spy-cap"><b id="spyName"></b><span id="spyText"></span></div><button class="btn" id="spySkip" type="button">Überspringen ▶▶</button></div>';
// Overlay-Elemente in den Kampfbild-Container einsetzen (einmal je Container)
function mount(host){if(!host||host.querySelector('#spy'))return;host.insertAdjacentHTML('beforeend',MARKUP);$('spySkip').onclick=()=>{SPY.skip=true;};$('afterSkip').onclick=()=>{AF.skip=true;};}
function stow(b,on){for(const a of b.actors)if(a.team===0)a.stowed=on;}
function drawWeapons(b,who){stow(b,false);const a=who||leaderA(b)||partyActors(b)[0];if(a)bubble(a,pick(['Waffen raus! Leise!','Klingen raus. Bögen runter vom Rücken.','Zieht blank. Und keiner hustet.']),{lead:!!b.lead,name:b.lead?lname(a):first(a.g),ms:1800});}
function leadSay(b,text,o={}){const a=leaderA(b);if(!a)return;M.speakLine?.(text,null,a.g,{vol:.8});bubble(a,text,{lead:true,name:lname(a),...o});mlog(`<b class="ldr">★ ${esc(a.g.name)}:</b> „${esc(text)}“`);}
function reset(){SPY.on=false;if(CLOSE.on)closeEnd();AF.on=false;for(const id of ['spy','cine','after']){const e=$(id);if(e)e.hidden=true;}}
window.DebtLeaderUI={install(ctx){C=ctx;hookDraw();},mount,camera,spyShow,closeStart,closeHit,closeEnd,chargeCine,aftermath,stow,drawWeapons,leadSay,lname,leaderA,walkSome,reset,SPY,CLOSE,AF};
})();
