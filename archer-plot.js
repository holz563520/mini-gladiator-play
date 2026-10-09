'use strict';
// PFEIL IM HINTERKOPF: einmaliges Ereignis. Fünf Tage nachdem der erste Fernkämpfer mit Bogen oder Armbrust im Kader steht,
// planen ein paar Gladiatoren den Sturz des Schmieds. Lehnt der Spieler ab, geht alles normal weiter.
// Stimmt er zu, folgt eine gescriptete Szene; der Schütze stirbt dauerhaft (vorhandenes M.kill), der Schmied überlebt immer.
// Ergebnis wird vor der Szene gespeichert; Laden spielt nichts erneut ab.
(()=>{
const M=window.MG,S=M.s,$=id=>typeof document==='undefined'?null:document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DELAY=5,P=()=>S.archerPlot??={seen:0,state:'',asked:0},W=()=>M.workshop?.state,smithName=()=>W()?.master?.name||'Der Schmied';
const ranged=g=>!g.dead&&!g.smithDuty&&g.role==='Fernkämpfer'&&['bow','crossbow'].includes(M.gear(g,'weapon')?.def);
const archer=()=>S.roster.find(ranged),others=a=>S.roster.filter(g=>g!==a&&!g.dead&&!g.smithDuty).sort((x,y)=>(y.role==='Soldat')-(x.role==='Soldat'));
// ---------- Gespräch ----------
// ---------- Gespräch auf dem Trainingshof: drei Gladiatoren, Sprechblasen, kein Wegklicken ----------
const fit=g=>!g.dead&&!g.smithDuty&&(M.army?.ready?.(g,true)??true);
function crew(){const a=S.roster.find(g=>ranged(g)&&fit(g));if(!a)return null;const o=S.roster.filter(g=>g!==a&&fit(g)).sort((x,y)=>(y.role==='Soldat')-(x.role==='Soldat'));return o.length>=2?{a,b:o[0],c:o[1]}:null;}
function script(c){const N=smithName(),cross=M.gear(c.a,'weapon')?.def==='crossbow',W=cross?'eine Armbrust':'einen Bogen',F=S.fallen.find(f=>f.name)?.name.split(' ')[0];
 return [['b','Psst. Hierher. Und guckt nicht so auffällig, verdammt.'],['c','Ich gucke nicht auffällig. Ich stehe nur hier.'],['b','Genau so stehen Leute, die gleich etwas sehr Dummes vorhaben.'],['a','Also? Worum geht’s?'],['b','Um '+N+'. Um wen denn sonst.'],
  ['c',F?'Gestern hat er '+F+' nur angeschaut. Nur angeschaut. Heute liegt '+F+' in der Grube.':'Gestern hat er den Neuen nur angeschaut. Der Neue redet seitdem nicht mehr. Mit niemandem.'],
  ['b','Zig Freunde hat er uns schon genommen. Wer zu langsam schmiedet, wird kürzer gemacht. Wer zu schnell schmiedet, auch.'],['c','Und der Hund kotzt jedes Mal, wenn er ihn sieht. Der Hund! Der frisst sonst alles!'],
  ['a','Und was soll ich da machen?'],['b','Du hast '+W+'. Er hat einen Hinterkopf. Und den dreht er uns den ganzen Tag zu, wenn er hämmert.'],['c','Ein Schuss. Zack. Und keiner muss mehr zittern, wenn er die Esse anheizt.'],
  ['b','Dann holt der Lanista einen neuen Schmied. Einen netten. Einen, der nicht beißt.'],['c','Vielleicht sogar einen besseren. Stell dir vor: Klingen, die nicht nach Kollegen riechen.'],
  ['a','… und wenn ich danebenschieße?'],['b','Dann … äh … hattest du ein sehr kurzes, sehr interessantes Leben.'],['c','Du schießt nicht daneben. Die Strohpuppe triffst du doch auch. Meistens.'],['b','Also. Bist du dabei?']];}
const YES=[['a','Klar. Ich mach mit.'],['b','Ich wusste es! Morgen ist er Geschichte.'],['c','Ich hol schon mal den guten Wein. Für danach.']];
const NO=[['a','Ich glaube, das ist keine gute Idee.'],['b','Feigling.'],['c','Nein. Klug. Ich hab ihn mal einen Pfeil fangen sehen. Mit den Zähnen.'],['b','… Das hast du dir ausgedacht.'],['c','Willst du es ausprobieren?']];
let tk=null;
const SPOTS={b:[420,388],a:[453,381],c:[487,389]};
function ask(){const c=crew();if(!c||tk||sc)return;P().asked=S.day;M.persist();
 const mk=(g,k)=>({id:'talk-'+k,g:JSON.parse(JSON.stringify(g)),team:0,x:SPOTS[k][0],y:SPOTS[k][1],a:k==='b'?0:Math.PI,phase:0,state:'idle',energy:100,ammo:1,moveSpeed:0,bloodMarks:{},key:k});
 tk={c,who:{a:mk(c.a,'a'),b:mk(c.b,'b'),c:mk(c.c,'c')},lines:script(c),i:0,t:0,phase:'talk',clock:0};
 tk.view=document.createElement('div');tk.view.id='plotTalk';tk.view.className='smith-ceremony smith-intro plot-talk-scene no-smith-song';tk.view.setAttribute?.('role','dialog');tk.view.setAttribute?.('aria-modal','true');tk.view.setAttribute?.('aria-label','Verschwörung auf dem Trainingshof');
 tk.view.innerHTML='<div><div class="scene-bubble-slot"><div class="scene-bubble" id="plotTalkBubble" hidden></div></div><canvas id="plotTalkCanvas" width="660" height="420" data-action="plot:next" aria-label="Tippen für den nächsten Satz"></canvas><p id="plotTalkText" aria-live="polite"></p><div id="plotTalkChoices" class="plot-choices" hidden><button class="btn primary" data-action="plot:yes">„Klar, ich mach mit.“<small>Vielleicht gibt es danach einen besseren Schmied – mit noch besseren Waffen.</small></button><button class="btn" data-action="plot:no">„Ich glaube, das ist keine gute Idee.“</button></div><p class="plot-hint" id="plotTalkHint">Tippen ▸ nächster Satz</p></div>';
 document.body.appendChild(tk.view);M.ui.close();}
// Lesezeit je Sprechblase: lieber zu lang als zu kurz. Tippen springt weiter.
const need=text=>Math.max(2.6,1.2+text.length*.072);
function next(){if(!tk)return;if(tk.phase==='choose')return;tk.t=0;tk.i++;if(tk.i>=tk.lines.length){if(tk.phase==='talk'){tk.phase='choose';tk.i=tk.lines.length-1;const ch=$('plotTalkChoices'),h=$('plotTalkHint');if(ch)ch.hidden=false;if(h)h.hidden=true;}else finishTalk();}}
function choose(yes){if(!tk||tk.phase!=='choose')return;const p=P();if(!yes){p.state='declined';M.persist();}tk.phase=yes?'yes':'no';tk.lines=yes?YES:NO;tk.i=0;tk.t=0;const ch=$('plotTalkChoices'),h=$('plotTalkHint');if(ch)ch.hidden=true;if(h)h.hidden=false;}
function finishTalk(){const yes=tk.phase==='yes',shooter=tk.c.a,mates=[tk.c.b,tk.c.c];tk.view?.remove?.();tk=null;M.ui.render();if(yes)start(shooter,mates);}
function stepTalk(dt){const t=tk;t.t+=dt;const [k,text]=t.lines[Math.min(t.i,t.lines.length-1)];
 if(t.phase!=='choose'&&t.t>=need(text)+.6){next();if(!tk)return;}
 for(const key of ['a','b','c']){const f=t.who[key];f.state='idle';f.traderPose=null;f.gest=t.t;f.phase+=dt*3;f.facePain=0;f.retreat=0;}
 const sp=t.who[k];if(sp&&t.phase!=='choose'){sp.traderPose=/[!?]/.test(text)&&text.length<70?'rant':'point';if(text.startsWith('…'))sp.traderPose=null;}
 // Blickrichtung: alle schauen zum Sprecher, der Sprecher zu den anderen
 for(const key of ['a','b','c']){const f=t.who[key];if(key===k)f.a=key==='b'?0:key==='c'?Math.PI:(t.who.b.x<f.x&&t.i%2?Math.PI:0);else f.a=sp.x>=f.x?0:Math.PI;}
 if(t.phase==='no'&&k==='b'&&t.i===1)t.who.b.state='charge';
 if(t.phase==='yes'&&t.i>=1)t.who.b.state=t.who.c.state='celebrate';
 if(k==='a'&&/danebenschieße/.test(text))t.who.a.facePain=.6;
 paintTalk();}
function paintTalk(){const c=$('plotTalkCanvas');if(!c?.getContext)return;const g=c.getContext('2d'),VW=170,VH=VW*420/660,k=c.width/VW,cx=453,cy=346,ox=cx-VW/2,oy=cy-VH/2;
 tk.bg??=M.ludus.background();g.imageSmoothingEnabled=false;g.setTransform?.(1,0,0,1,0,0);g.clearRect(0,0,c.width,c.height);g.save();g.scale(k,k);g.translate(-ox,-oy);g.drawImage(tk.bg,0,0);
 M.renderForgeActors(g,Object.values(tk.who).sort((p,q)=>p.y-q.y));g.restore();
 const [key,text]=tk.lines[Math.min(tk.i,tk.lines.length-1)],sp=tk.who[key],h=headPoint(sp),hx=(h.x-ox)*k,hy=(h.y-oy)*k,name=sp.g.name.split(' ')[0];
 htmlBubble('plotTalkBubble',name,text,hx/c.width,key==='a',tk.phase!=='choose');}
// Lesbar: große Schrift, Blase mittig über dem Sprecher, immer ganz im Bild, Zeiger auf den Kopf.
// Sprechblase außerhalb des Bildes (über dem Video), Zeiger zeigt auf den Sprecher – das Geschehen bleibt frei sichtbar.
function hipOff(a,t){/* liegend wird der Körper in Kriechrichtung versetzt gezeichnet: Hüfte ≈ 55 Einheiten vor a.x */return a.down&&t<CATCH?CRAWL*55:0;}
function htmlBubble(id,name,text,xFrac,loud,waiting){const el=$(id);if(!el)return;if(!text){if(!el.hidden)el.hidden=true;return;}const key=name+'|'+text+'|'+!!loud;if(el._key!==key){el._key=key;el.innerHTML='<b>'+esc(name)+'</b><span>'+esc(text)+'</span><i aria-hidden="true">▼</i>';el.classList?.toggle('loud',!!loud);}if(el.hidden)el.hidden=false;const tx=Math.max(5,Math.min(95,xFrac*100)).toFixed(0)+'%';if(el._tx!==tx){el._tx=tx;el.style?.setProperty?.('--tail',tx);}if(el._w!==!!waiting){el._w=!!waiting;el.classList?.toggle('waiting',!!waiting);}}
function talkBubble(g,name,text,x,y,archerSpeaks,blink){g.font="bold 25px 'Courier Prime',monospace";g.textBaseline='middle';const maxW=480,words=text.split(' '),rows=[''];for(const w of words){const tryRow=(rows[rows.length-1]+' '+w).trim();if(g.measureText(tryRow).width>maxW&&rows[rows.length-1])rows.push(w);else rows[rows.length-1]=tryRow;}
 const lh=31,w=Math.min(640,Math.max(...rows.map(r=>g.measureText(r).width),g.measureText(name).width)+32),h=rows.length*lh+50,bx=Math.round(Math.max(10,Math.min(650-w,x-w/2))),by=Math.round(Math.max(8,Math.min(y-36-h,420-h-8)));
 g.fillStyle='#17201c';g.fillRect(bx-3,by-3,w+6,h+6);g.fillStyle=archerSpeaks?'#f4e3b0':'#efe0b3';g.fillRect(bx,by,w,h);const tx=Math.max(bx+14,Math.min(bx+w-24,x-6));g.fillStyle='#17201c';g.fillRect(tx-2,by+h,16,4);g.fillStyle=archerSpeaks?'#f4e3b0':'#efe0b3';g.fillRect(tx,by+h-1,12,4);g.fillRect(tx+3,by+h+3,6,4);g.fillStyle='#17201c';g.fillRect(tx+1,by+h+7,4,3);
 g.textAlign='left';g.font="bold 16px 'Courier Prime',monospace";g.fillStyle=archerSpeaks?'#8a3a1f':'#5a4a2a';g.fillText(name.toUpperCase(),bx+16,by+16);g.font="bold 25px 'Courier Prime',monospace";g.fillStyle='#17201c';rows.forEach((r,i)=>g.fillText(r,bx+16,by+40+i*lh));if(blink!==undefined){g.fillStyle=blink?'#8a3a1f':'#17201c';g.beginPath();g.moveTo(bx+w-26,by+h-14);g.lineTo(bx+w-12,by+h-14);g.lineTo(bx+w-19,by+h-6);g.fill();}}
// ---------- Szene ----------
let sc=null,clock=0;
const lerp=(a,b,k)=>a+(b-a)*Math.max(0,Math.min(1,k)),between=(t,a,b)=>t>=a&&t<b;
function smithActor(){const p=W().master,rng=S.rng,g=M.makeGladiator(0);Object.assign(g,{id:'plot-smith',name:p.name,height:p.height,weight:p.weight,muscle:58,fame:0,scars:[]});g.appearance={...p.appearance};g.equipment={weapon:null,secondary:null,shield:null,armor:{}};const items={hammer:M.makeItem('weapon','hammer',1),dagger:M.makeItem('weapon','dagger',1),sword:M.makeItem('weapon','gladius',1)};g.enemyGear={weapon:null,secondary:items.hammer,shield:null,armor:{}};S.rng=rng;return {id:g.id,g,items,team:0,x:712,y:262,a:Math.PI,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,forgeWorker:true,bloodMarks:{}};}
// Szenenzeit; Zeitlupe über die Abspielrate.
const SLOW=[[6,6.3,.25],[6.3,7.6,.3],[7.6,9.2,.5],[28.6,29.6,.3]],rate=t=>SLOW.find(([a,b])=>t>=a&&t<b)?.[2]??1;
const GRAB=28.6,HIT=6.3,DROP=9,OVEN=[31.2,35.6],RUN={c:[758,300],r:27,k:.33,w:2,t0:38.3},STRIKE1=41.9,CRAWL0=STRIKE1+.9,FR=STRIKE1+8.6,CATCH=STRIKE1+17,CUT=CATCH+1.8,CRAWL_V=8,PULL=.6;
// Wege um Werkbank, Trog und Schleifstein herum (nicht hindurch)
const nav=pts=>M.sceneNav?.route?M.sceneNav.route(pts):pts;
function along(pts,k){const L=[0];for(let i=1;i<pts.length;i++)L.push(L[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));const d=Math.max(0,Math.min(1,k))*L[L.length-1];for(let i=1;i<pts.length;i++)if(d<=L[i]||i===pts.length-1){const u=(d-L[i-1])/((L[i]-L[i-1])||1);return {x:pts[i-1][0]+(pts[i][0]-pts[i-1][0])*u,y:pts[i-1][1]+(pts[i][1]-pts[i-1][1])*u};}return {x:pts[0][0],y:pts[0][1]};}
// Kriechspur zwischen Schleifstein und Bank: ein Stück nach oben, damit der Körper nicht über der Bank liegt
const LANE=297;function crawlY(t){return t<=CRAWL0?P1.y:P1.y+(LANE-P1.y)*Math.min(1,(t-CRAWL0)/3);}
function runAt(t){const th=Math.PI*.15+RUN.w*(t-RUN.t0);return {x:RUN.c[0]+Math.cos(th)*RUN.r,y:RUN.c[1]+Math.sin(th)*RUN.r*RUN.k,dx:-Math.sin(th)};}
const P1=runAt(STRIKE1),SPOT={x:P1.x-15*Math.sign(P1.dx||1),y:P1.y},ARCHER_WAY=[[840,298],[857,291],[854,268],[822,262]],SMITH_WAY=[[792,262],[764,265],[766,298],[P1.x-15*Math.sign(P1.dx||1),P1.y]],CRAWL=Math.sign(P1.dx||1),BACK=CUT+3.5,DOOR_T=BACK+Math.hypot(748-(P1.x+CRAWL*((CATCH-CRAWL0)*CRAWL_V-14)),240-P1.y)/45,END=DOOR_T+.9;
function lines(){return [
 [0.3,3.3,'cap',smithName()+' hämmert. '+sc.name+' schleicht sich an.'],
 [9.4,11.8,'s','Soso … Du wolltest deinen hübschen kleinen Bogen also einmal an mir ausprobieren?'],
 [11.85,12.35,'s','Wie überaus reizend. Das war echt ein guter Schuss.'],
 [12.4,15.2,'s','Wir hätten doch einfach drüber reden können, wenn dich etwas stört.'],
 [15.5,18,'a','Es tut mir so leid … es tut mir so leid … bitte verschone mich!'],
 [18.2,20.4,'s','Mach dir keinen Kopf. Ich wollte doch nur mit dir darüber sprechen.'],
 [20.4,22.6,'s','Unter Freunden räumt man so etwas aus dem Weg. Komm doch einfach mal her.'],
 [24.9,27.1,'s','Komm, gib mir mal deine Hand. Wir bringen das jetzt in Ordnung.'],
 [27.1,28.6,'s','Dann kommen wir besser miteinander aus.'],
 [31.4,33.4,'a','AAAAAAAAAAH!'],[33.6,35.4,'a','AAAAAAAAAAAAAH!'],
 [36.2,38.3,'s','Ich finde gut, dass wir miteinander gesprochen haben.'],
 [38.4,39.8,'a','AAAH! AAAAAH!'],[STRIKE1+.9,STRIKE1+2.4,'a','MEINE BEINE! AAAAH!'],[STRIKE1+2.8,STRIKE1+5.4,'s','Nicht so schnell, mein Freund. Ich bin nicht so schnell.'],[STRIKE1+5.9,STRIKE1+8.2,'s','Vorsicht! Der Boden hinter dir ist ja ganz rutschig.'],[FR,FR+2.2,'a','Helft mir! Helft mir, meine Freunde! Rettet mich!'],[FR+3.4,FR+5.4,'b','Äh … den kennen wir gar nicht.'],[FR+5.6,FR+6.9,'c','Nie gesehen.'],[CATCH+.3,CUT-.2,'a','NEIN! NEIN! BITTE NICHT!'],
 [CUT+1.9,CUT+3.4,'cap',smithName()+' steckt das Schwert ein und bricht den Pfeil ab.']];}
function start(chosen,mates){const a=chosen&&S.roster.includes(chosen)?chosen:archer();if(!a||sc||S.battle)return false;const pals=(mates&&mates.length>=2?mates:S.roster.filter(g=>g!==a&&!g.dead&&!g.smithDuty).slice(0,2)).map((g,i)=>({id:'plot-friend-'+i,g:JSON.parse(JSON.stringify(g)),team:0,x:-50,y:0,a:0,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,bloodMarks:{}}));const clone=JSON.parse(JSON.stringify(a)),name=a.name.split(' ')[0],cross=M.gear(a,'weapon')?.def==='crossbow';
 // Ergebnis zuerst: der Schütze stirbt dauerhaft.
 P().state='done';M.kill(a,'Wollte '+smithName()+' von hinten erschießen. Kopf in die Esse, Beine ab, geköpft.',smithName());M.persist();
 clone.dead=false;sc={t:0,name,cross,a:{id:'plot-archer',g:clone,team:0,x:880,y:300,a:Math.PI,phase:0,state:'idle',energy:100,ammo:1,moveSpeed:0,bloodMarks:{}},s:smithActor(),limbs:[],fx:[],done:{},arrow:null,stuck:0,flip:0,trail:[],bow:null,ack:{},waiting:false,cam:{x:780,y:270,vw:300},charred:false,soiled:false,fr:{b:pals[0],c:pals[1]}};
 sc.view=document.createElement('div');sc.view.id='archerPlot';sc.view.className='smith-ceremony smith-intro smith-wrath no-smith-song';sc.view.setAttribute?.('role','dialog');sc.view.setAttribute?.('aria-modal','true');sc.view.setAttribute?.('aria-label','Pfeil im Hinterkopf');
 sc.view.innerHTML='<div><div class="scene-bubble-slot"><div class="scene-bubble" id="archerPlotBubble" hidden></div></div><canvas id="archerPlotCanvas" width="660" height="420" data-action="plot:tap" aria-label="Tippen für den nächsten Satz"></canvas><p id="archerPlotText" aria-live="polite"></p><p class="plot-hint" id="archerPlotHint" hidden>Tippen ▸ weiter</p><button class="btn" data-action="plot:skip">ÜBERSPRINGEN →</button></div>';document.body.appendChild(sc.view);M.ui.close();M.ui.render();return true;}
function end(){if(!sc)return;sc.view?.remove?.();sc=null;M.ui.render();M.ui.notify('Der Ludus hat einen Fernkämpfer weniger. '+smithName()+' hämmert weiter.');}
function once(k,fn){if(sc.done[k])return;sc.done[k]=true;fn();}
function burst(x,y,n,colors,spread=40,up=30){for(let i=0;i<n;i++)sc.fx.push({x:x+Math.random()*6-3,y,z:Math.random()*6,vx:(Math.random()-.5)*spread,vy:(Math.random()-.5)*6,vz:up*(.5+Math.random()),life:.5+Math.random()*.6,size:2,color:colors[i%colors.length]});}
function sever(v,part,dir,extra={}){const g=v.g;for(const k of M.branches[part]||[part])if(g.body[k])g.body[k].missing=true;sc.limbs.push({x:v.x+dir*4,y:v.y,z:part==='head'?52:38,angle:0,part,skin:extra.skin||g.appearance.skin,hair:extra.hair||g.appearance.hair,g,vx:dir*(extra.vx||30),vy:4,vz:extra.vz||34,spin:dir*8});burst(v.x,v.y-30,14,['#aa3c36','#87352e'],50,25);M.sound?.('sever');}
function pose(t){const s=sc.s,a=sc.a;
 for(const p of [s,a]){p.state='idle';p.moveSpeed=0;p.wind=0;p.swing=0;p.technique=null;p.forgePose='';p.traderPose=null;p.stagger=0;p.facePain=0;p.retreat=0;p.phase=t*4;p.gest=t;}
 // ---- Schmied ----
 s.hidden=t>=DOOR_T+.3;
 if(t<HIT){s.x=712;s.y=262;s.a=Math.PI;const k=t%0.9;s.technique='overhead';s.windMax=.35;s.wind=k<.35?.35-k:0;s.swingKind='slash';s.swingMax=.2;s.swing=k>=.35&&k<.55?.55-k:0;if(k>=.5&&k<.55&&t<HIT-.1)once('clank'+Math.floor(t/.9),()=>M.sound?.('block'));}
 // Nach dem Treffer: völlige Starre, keine Regung, kein Laut; nur Blut aus der Wunde.
 // Hammer sinkt nicht ans Ohr: er bleibt einfach stehen und schließt die Augen
 if(between(t,HIT,8.6)){s.x=712;s.y=262;s.a=Math.PI;s.technique=null;s.wind=0;s.swing=0;s.eyesClosed=true;}else s.eyesClosed=false;
 if(between(t,8.6,9.4)){s.a=t<9?Math.PI:0;s.x=712;s.y=262;}
 if(t>=9)s.a=0;
 if(t>=9.4)s.g.enemyGear.secondary=null;
 if(between(t,18.4,20.2)){const k=(t-18.4)/1.8;s.x=lerp(712,790,k);s.state='move';s.moveSpeed=10;s.phase=t*6;s.a=0;}else if(between(t,20.2,30.4)){s.x=790;s.y=262;s.a=0;}
 if(between(t,28,GRAB+1.4))s.traderPose='point';
 // Esse: hinter ihm, Hand im Nacken, Kopf hineingedrückt
 if(between(t,30.4,OVEN[1])){const k=Math.min(1,(t-30.4)/.8);s.x=lerp(790,817,k);s.y=lerp(262,254,k);s.a=Math.PI;s.state=k<1?'move':'idle';s.moveSpeed=k<1?10:0;s.phase=t*6;s.traderPose='point';s.g.enemyGear.secondary=null;if(k>=1)s.x+=Math.sin(t*9)*.6;}
 if(between(t,OVEN[1],OVEN[1]+.6)){const k=(t-OVEN[1])/.6;s.x=lerp(817,792,k);s.y=lerp(254,262,k);s.state='move';s.moveSpeed=10;s.a=0;}
 if(between(t,OVEN[1]+.6,38.4)){s.x=792;s.y=262;s.a=0;}
 if(t>=38.2&&t<CUT+1.4)s.g.enemyGear.secondary=s.items.sword;
 if(between(t,38.4,39.7)){const k=(t-38.4)/1.3;{const q=along(SMITH_WAY,k);s.x=q.x;s.y=q.y;}s.state='move';s.moveSpeed=10;s.phase=t*6;s.a=SPOT.x>=792?0:Math.PI;}
 if(between(t,39.7,STRIKE1+1.6)){s.x=SPOT.x;s.y=SPOT.y;const p=runAt(Math.min(t,STRIKE1));s.a=p.x>=s.x?0:Math.PI;}
 if(between(t,STRIKE1-.3,STRIKE1)){s.technique='overhead';s.windMax=.3;s.wind=STRIKE1-t;}
 if(between(t,STRIKE1,STRIKE1+.25)){s.swingKind='slash';s.swingMax=.25;s.swing=STRIKE1+.25-t;}
 if(between(t,STRIKE1+.4,STRIKE1+1.2))s.state='celebrate';
 const crawlX=t2=>{const tau=Math.max(0,Math.min(t2,CATCH)-CRAWL0),n=Math.floor(tau/PULL),u=(tau%PULL)/PULL,k=u<.45?0:Math.min(1,(u-.45)/.35),e=k*k*(3-2*k);return P1.x+CRAWL*(n+e)*PULL*CRAWL_V;};
 if(between(t,STRIKE1+1.6,CUT)){const gap=lerp(40,34,(t-STRIKE1-1.6)/(CATCH-STRIKE1-2.4))+(t>CATCH-.8?lerp(0,-45,(t-CATCH+.8)/.8):0),goal=crawlX(t)-CRAWL*gap,k=Math.min(1,(t-STRIKE1-1.6)/1.2);s.x=lerp(SPOT.x,goal,k);s.y=lerp(SPOT.y,crawlY(t),k)-(t>CATCH-.8?5*Math.min(1,(t-CATCH+.8)/.8):0);s.a=CRAWL>0?0:Math.PI;if(t<CATCH){s.state='move';s.moveSpeed=6;s.phase=t*3;}}
 if(between(t,CUT-.35,CUT)){s.technique='overhead';s.windMax=.35;s.wind=CUT-t;}
 if(between(t,CUT,CUT+.25)){s.swingKind='slash';s.swingMax=.25;s.swing=CUT+.25-t;}
 /* Am Boden köpfen: hinter dem Liegenden stehen, Klinge trifft den Hals (Hals ≈ 31 vor den Füßen, Klingenende ≈ 20 vor dem Schmied) */const stand={x:crawlX(CUT)+CRAWL*11,y:LANE-5};
 if(between(t,CUT+.25,BACK)){s.x=stand.x;s.y=stand.y;s.a=CRAWL>0?0:Math.PI;}
 if(between(t,CUT+.6,CUT+1.3))s.forgePose='inspect';
 if(between(t,CUT+1.9,CUT+2.8))s.forgePose='sip';
 if(between(t,CUT+2.9,CUT+3.4))s.state='celebrate';
 if(between(t,BACK,DOOR_T+.3)){const k=(t-BACK)/(DOOR_T-BACK);{const q=along(sc.home??=nav([[stand.x,stand.y],[748,246],[748,240]]),k);s.x=q.x;s.y=q.y;}s.state='move';s.moveSpeed=10;s.phase=t*6;s.a=748>=stand.x?0:Math.PI;}
 // ---- Schütze ----
 a.charred=sc.charred;
 // Handschlag, Griff und Esse: gewollter Körperkontakt, das Ausweichen bleibt hier aus
 a.noNav=s.noNav=between(t,GRAB-.5,RUN.t0+.1);
 if(t<3.4){const k=(t-.3)/3.1;a.x=lerp(880,840,k);a.y=lerp(300,298,k);if(t>.3){a.state='move';a.moveSpeed=6;a.phase=t*4;}a.a=Math.PI;}
 else if(t<22.6){a.x=840;a.y=298;a.a=Math.PI;}
 if(between(t,3.4,HIT)){a.swingKind='shoot';a.windMax=1.1;if(!sc.cross)a.wind=Math.max(.01,1.1-(t-3.4)*.42);if(t>=6)a.wind=0;a.x+=Math.sin(t*20)*.3;}
 if(between(t,6,6.3)){a.swingKind='shoot';a.swingMax=.3;a.swing=6.3-t;}
 if(t>=DROP)a.retreat=1;
 if(between(t,DROP,DROP+.5)){a.traderPose='rant';a.facePain=1;}
 if(between(t,15.4,GRAB)){a.x+=Math.sin(t*38)*1.1;a.facePain=.5;a.retreat=1;}
 if(between(t,22.6,24.8)){const k=(t-22.6)/2.2;{const q=along(ARCHER_WAY,k);a.x=q.x+Math.sin(t*38);a.y=q.y;}a.state='move';a.moveSpeed=5;a.phase=t*3;a.a=Math.PI;}else if(between(t,24.8,30.4)){a.x=822+(t<GRAB?Math.sin(t*38)*.9:0);a.y=262;a.a=Math.PI;}
 if(between(t,27.4,GRAB+1.4))a.traderPose='point';
 if(between(t,29.6,30.4)){a.x=lerp(822,812,(t-29.6)/.3);a.stagger=.5;a.facePain=1;}
 if(between(t,30.4,OVEN[1])){const k=Math.min(1,(t-30.4)/.8);a.x=lerp(812,800,k);a.y=lerp(262,247,k);a.a=Math.PI;a.facePain=1;if(k<1){a.state='move';a.moveSpeed=8;a.phase=t*8;}else{a.traderPose='rant';a.stagger=.4;a.x+=Math.sin(t*31)*1.2;a.phase=t*14;}}
 if(between(t,OVEN[1],OVEN[1]+.6)){const k=(t-OVEN[1])/.6;a.x=lerp(800,812,k);a.y=lerp(247,262,k);a.stagger=.6;a.facePain=1;}
 if(between(t,OVEN[1]+.6,RUN.t0)){a.x=812;a.y=262;a.a=Math.PI;a.facePain=1;a.x+=Math.sin(t*30)*.6;}
 if(between(t,RUN.t0,STRIKE1+.1)){const p=runAt(t),q=runAt(t+.05);a.x=p.x;a.y=p.y;a.a=q.x>=p.x?0:Math.PI;a.state='move';a.moveSpeed=16;a.phase=t*11;a.retreat=1;a.facePain=1;}
 if(t>=STRIKE1+.1){a.x=crawlX(t);a.y=crawlY(t);a.down=true;a.fallSide=1;a.a=CRAWL>0?0:Math.PI;a.facePain=1;if(t<CRAWL0){a.fallTimer=2.1-(t-STRIKE1-.1);a.fallDuration=2.1;a.down=false;}else a.fallTimer=0;
  // Zieht sich mit den Armen vorwärts: Ruck nach vorn, Arm greift nach vorn
  if(between(t,CRAWL0,CATCH)&&!a.g.dead){const n=Math.floor((t-CRAWL0)/PULL);a.traderPose=n%2?'pat':'point';a.gest=t*3;}
  // Umdrehen, Hände abwehrend dem Schmied entgegen
  if(t>=CATCH&&!a.g.dead){a.a=CRAWL>0?Math.PI:0;a.fallSide=-1;a.traderPose='rant';}}
 // ---- Die beiden Mitverschwörer ----
 const endX=P1.x+CRAWL*(CATCH-CRAWL0)*CRAWL_V,spots=[endX+CRAWL*108,endX+CRAWL*128];
 for(const [i,f] of [sc.fr.b,sc.fr.c].entries()){if(!f)continue;f.state='idle';f.moveSpeed=0;f.traderPose=null;f.facePain=0;f.retreat=0;const sx=spots[i],from=sx+CRAWL*90,fy=LANE+(i?6:-4);
  if(t<STRIKE1+2.6){f.x=-99;f.y=-99;continue;}
  if(t<STRIKE1+5.4){const k=(t-STRIKE1-2.6)/2.8;f.x=lerp(from,sx,k);f.y=fy;f.state='move';f.a=CRAWL>0?Math.PI:0;}
  else if(t<FR+2.4){f.x=sx;f.y=fy;f.a=CRAWL>0?Math.PI:0;}
  else if(t<FR+6.9){f.x=sx;f.y=fy;f.a=i?(CRAWL>0?Math.PI:0):(CRAWL>0?0:Math.PI);if(t<FR+3.4){f.a=i?(CRAWL>0?0:Math.PI):(CRAWL>0?Math.PI:0);f.facePain=.3;}if(between(t,FR+2.4,FR+3.4))f.traderPose='inspect';}
  else{const k=(t-FR-6.9)/2.2;f.x=lerp(sx,sx+CRAWL*160,k);f.y=fy;f.state='move';f.a=CRAWL>0?0:Math.PI;f.retreat=1;}}
 // Die beiden Freunde warten: einer scheißt sich ein, der andere kotzt auf den Boden
 {const b=sc.fr.b,c=sc.fr.c,SOIL=STRIKE1+6,PUKE=[STRIKE1+6.7,STRIKE1+8.5];
  if(b&&t>=SOIL&&b.x>0)once('frsoil',()=>{sc.frSoil={x:b.x,y:b.y,t};});
  if(b&&sc.frSoil&&b.state==='move'&&Math.floor(t*5)!==sc.frDrip){sc.frDrip=Math.floor(t*5);(sc.frDrips??=[]).push({x:b.x+(Math.cos(b.a)>=0?-3:3),y:b.y});}
  if(c&&c.x>0&&between(t,PUKE[0],PUKE[1])){/* dreht sich weg vom Freund, sinkt auf die Knie und kotzt auf den Boden */c.a=CRAWL>0?0:Math.PI;c.facePain=1;c.state='idle';c.kneeDuration=PUKE[1]-PUKE[0];c.kneeTimer=PUKE[1]-t;c.kneeRise=.4;const face=Math.cos(c.a)>=0?1:-1,h=headPoint(c),u=(t-PUKE[0])/(PUKE[1]-PUKE[0]);h.y+=Math.min(1,(t-PUKE[0])/.4)*11;
   if(u<.85&&Math.floor(t*30)%2===0)for(let n=0;n<2;n++)sc.fx.push({x:h.x+face*5,y:c.y+.5,z:Math.max(6,c.y-h.y-6),vx:face*(10+Math.random()*14),vy:Math.random()*4-2,vz:-4+Math.random()*8,life:.8,size:2,color:['#b9b25a','#8f9a3e','#d6cf7a'][(n+Math.floor(t*7))%3]});
   once('puke',()=>{sc.puke={x:c.x+face*13,y:c.y+1,t};});}else if(c)c.kneeTimer=0;}
 // ---- Ereignisse ----
 if(t>=6)once('shot',()=>{sc.arrow={t0:6,x0:a.x-12,y0:a.y-36};M.sound?.('stick');});
 if(t>=HIT)once('hit',()=>{sc.arrow=null;sc.stuck=14;});
 if(t>=DROP)once('drop',()=>{sc.bow={x:a.x-9,y:a.y+1,def:M.gear(a.g,'weapon')?.def||'bow'};a.g.equipment.weapon=null;M.sound?.('land');});
 if(t>=15.8)once('soil',()=>{sc.soiled=true;});
 if(t>=GRAB)once('grab',()=>{sc.view?.classList?.remove('no-smith-song');M.sound?.('heavy');});
 if(t>=OVEN[0])once('fire',()=>{M.sound?.('heavy');burst(800,212,26,['#f4d37a','#e2ab5c','#c8642e'],50,60);});
 if(between(t,OVEN[0],OVEN[1])&&Math.floor(t*10)!==sc.lastFire){sc.lastFire=Math.floor(t*10);burst(800,210,3,['#e2ab5c','#c8642e','#7a7468'],30,45);}
 if(t>=OVEN[1])once('char',()=>{sc.charred=true;});
 if(t>=STRIKE1+.1)once('legs',()=>{sever(a,'lt',CRAWL,{vx:40,vz:30});sever(a,'rt',-CRAWL,{vx:30,vz:36});M.sound?.('die');});
 if(between(t,STRIKE1+.4,CUT)&&Math.floor(t*6)!==sc.lastDrop){sc.lastDrop=Math.floor(t*6);sc.trail.push({x:a.x+hipOff(a,t)+(Math.random()*4-2),y:a.y+(Math.random()*3-1),w:2+Math.floor(Math.random()*3)});}
 if(t>=CUT+.1)once('cut',()=>{const g=a.g;for(const k of M.branches.head)g.body[k].missing=true;const burnt={...g,appearance:{...g.appearance,skin:'#3b2c24',shade:'#2e231d',hair:'#17110e'}};const h=CRAWL;sc.limbs.push({x:a.x+h*44,y:a.y,z:8,angle:0,part:'head',skin:'#3b2c24',hair:'#17110e',g:burnt,vx:h*26,vy:3,vz:42,spin:h*7});burst(a.x+h*31,a.y-4,22,['#aa3c36','#87352e','#c24a3c'],60,24);g.dead=true;a.down=true;a.traderPose=null;M.sound?.('sever');});
 if(between(t,HIT,12)&&Math.floor(t*5)!==sc.lastSpurt){sc.lastSpurt=Math.floor(t*5);const h=headPoint(s),dir=Math.cos(s.a)>=0?-1:1;for(let n=0;n<3;n++)sc.fx.push({x:h.x+dir*3,y:s.y,z:s.y-h.y+Math.random()*2,vx:dir*(14+Math.random()*16),vy:Math.random()*4-2,vz:12+Math.random()*16,life:.7,size:2,color:n%2?'#aa3c36':'#87352e'});}
 if(t>=HIT)once('silence',()=>sc.view?.classList?.add('scene-silence'));if(t>=9.4)once('sound-back',()=>sc.view?.classList?.remove('scene-silence'));
 if(t>=CUT+1.4)once('sheath',()=>{s.g.enemyGear.secondary=null;M.sound?.('block');});
 if(t>=CUT+2.4)once('snap',()=>{sc.stuck=3;const dir=Math.cos(s.a)>=0?-1:1;sc.fx.push({x:s.x+dir*8,y:s.y,z:58,vx:dir*20,vy:2,vz:10,life:1.4,size:2,color:'#a88c60'},{x:s.x+dir*11,y:s.y,z:58,vx:dir*22,vy:2,vz:12,life:1.4,size:2,color:'#a88c60'});M.sound?.('stick');});}
// Schrittbild wie im Kampf: Beinphase folgt der zurückgelegten Strecke, Schrittweite dem Tempo (Ludus-Maßstab 0,6).
function gait(list,ds){sc.odo??={};for(const p of list){const o=sc.odo[p.id]??={x:p.x,y:p.y,d:0};const dx=p.x-o.x,d=Math.hypot(dx,p.y-o.y);o.x=p.x;o.y=p.y;if(p.state==='move'&&d>.05&&d<40){o.d+=d;p.phase=o.d*.267;p.moveSpeed=Math.max(8,d/Math.max(ds,1e-3)/.6);const side=Math.abs(dx)/d;o.side=(o.side??side)*.8+side*.2;p.gaitSpeed=p.moveSpeed*(.28+.72*o.side);}else p.gaitSpeed=undefined;}}
function step(dt){const t0=sc.t,L=lines().find(([a1,b1,who])=>who!=='cap'&&t0>=a1&&t0<b1);
 if(L&&sc.cur?.key!==L[0]+L[3])sc.cur={key:L[0]+L[3],b:L[1],who:L[2],text:L[3],shown:0};if(sc.cur)sc.cur.shown+=dt;
 // Ruhige Dialogstellen warten, bis die Blase gelesen ist (oder getippt wurde); Schreie in der Bewegung halten nichts auf, bleiben aber lesbar stehen.
 let next=t0+dt*rate(t0);sc.waiting=false;if(L&&sc.cur&&!/AAA/.test(L[3])&&next>=L[1]&&sc.cur.shown<need(L[3])&&!sc.cur.ack){next=L[1]-1e-4;sc.waiting=true;}
 if(sc.cur&&!L&&(sc.cur.shown>=need(sc.cur.text)||sc.cur.ack))sc.cur=null;sc.t=next;const hint=$('archerPlotHint');if(hint&&hint.hidden===sc.waiting)hint.hidden=!sc.waiting;const t=sc.t,s=sc.s,a=sc.a;pose(t);gait([s,a,sc.fr.b,sc.fr.c].filter(Boolean),next-t0);
 for(const l of sc.limbs){if(l.z<=0&&Math.abs(l.vz)<4){l.z=0;continue;}l.x+=l.vx*dt;l.y+=l.vy*dt;l.vz-=200*dt;l.z=Math.max(0,l.z+l.vz*dt);l.angle+=l.spin*dt;if(!l.z&&l.vz<0){l.vz=-l.vz*.35;l.vx*=.5;l.vy*=.5;l.spin*=.5;}}
 for(const f of sc.fx){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vz-=(f.color==='#7a7468'||f.smoke?-20:150)*dt;f.z=Math.max(0,f.z+f.vz*dt);f.life-=dt;}
 // Rauch vom verbrannten Kopf, sparsam
 if(sc.charred&&sc.fx.length<60&&Math.random()<(a.g.dead?.2:.5))sc.fx.push({x:a.x+(a.down?a.fallSide*14:0)+Math.random()*4-2,y:a.y,z:(a.down?6:62)+Math.random()*4,vx:Math.random()*6-3,vy:0,vz:14,life:.9,size:3,color:'#9a958a',smoke:true});
 sc.fx=sc.fx.filter(f=>f.life>0);
 // Kamera: weit, dann Zoom auf den Hinterkopf, dann zurück auf beide
 const head={x:s.x,y:s.y-40},mid={x:(s.x+a.x)/2,y:(s.y+a.y)/2-20};let goal;
 if(t<3.4)goal={x:780,y:265,vw:300};else if(t<6)goal={x:mid.x,y:mid.y,vw:230};else if(t<9.2)goal={x:head.x,y:head.y,vw:85};else if(t<15.6)goal={x:mid.x,y:mid.y-10,vw:235};else if(t<22.8)goal={x:mid.x+10,y:mid.y-10,vw:235};else if(t<GRAB)goal={x:mid.x,y:mid.y,vw:190};else if(t<29.6)goal={x:(s.x+a.x)/2,y:s.y-34,vw:110};else if(t<OVEN[1]+.6)goal={x:806,y:222,vw:170};else if(t<RUN.t0)goal={x:802,y:244,vw:200};else if(t<BACK)goal=between(t,STRIKE1+2.6,FR+8)?(()=>{const far=P1.x+CRAWL*((CATCH-CRAWL0)*CRAWL_V+140);return {x:(s.x+far)/2,y:P1.y-24,vw:Math.max(270,Math.min(380,Math.abs(s.x-far)+50))};})():{x:(s.x+a.x)/2,y:(s.y+a.y)/2-14,vw:t<STRIKE1+1?250:t<CATCH?230:180};else goal={x:s.x,y:s.y-20,vw:250};
 const k=Math.min(1,dt*(t>=HIT&&t<7.6?3.5:2.2));sc.cam.x+=(goal.x-sc.cam.x)*k;sc.cam.y+=(goal.y-sc.cam.y)*k;sc.cam.vw+=(goal.vw-sc.cam.vw)*k;
 sc.say=sc.cur?{who:sc.cur.who,text:sc.cur.text}:null;if(!sc.say)for(const [a1,b1,who,text] of lines())if(who==='cap'&&between(t,a1,b1))sc.say={who,text};
 paint();if(t>=END&&!sc.cur)end();}
function headPoint(p){const k=.6*p.g.height/180*1.14;return {x:p.x+(Math.cos(p.a)>=0?1:-1)*2*k,y:p.y-66*k};}
function paint(){const c=$('archerPlotCanvas');if(!c?.getContext)return;const g=c.getContext('2d'),VW=sc.cam.vw,VH=VW*420/660,k=c.width/VW,cx=Math.max(VW/2,Math.min(900-VW/2,sc.cam.x)),cy=Math.max(VH/2,Math.min(670-VH/2,sc.cam.y)),t=sc.t,s=sc.s,a=sc.a,r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),w,h);};
 sc.bg??=M.ludus.background();g.imageSmoothingEnabled=false;g.setTransform?.(1,0,0,1,0,0);g.clearRect(0,0,c.width,c.height);g.save();g.scale(k,k);g.translate(-(cx-VW/2),-(cy-VH/2));g.drawImage(sc.bg,0,0);
 r(788,205,7,10,t%1>.5?'#c88945':'#e2ab5c');r(803,210,5,7,t%1>.5?'#c88945':'#e2ab5c');
 if(sc.soiled){r(840-4,299,9,2,'#5a3d1e');if(!a.down&&t<OVEN[0]){const rear=Math.cos(a.a)>=0?-1:1;r(a.x+rear*2-3,a.y-20,6,6,'#4e3318');r(a.x+rear*3,a.y-14,1,10,'#5a3d1e');}}
 /* Blutspur aus einzelnen Tropfen; nur nahe Tropfen werden zu einer kurzen Schliere verbunden (kein langer Faden) */for(let i=0;i<sc.trail.length;i++){const d=sc.trail[i],e=sc.trail[i-1];if(e&&Math.hypot(d.x-e.x,d.y-e.y)<9)r(Math.min(d.x,e.x),Math.round((d.y+e.y)/2),Math.abs(d.x-e.x)+1,1,'#7c2e28');r(d.x-1,d.y,d.w||3,2,i%4?'#9b3530':'#87352e');}
 if(a.down&&!a.g.body.head.missing||sc.gutsOut){sc.gutsOut=true;const back=-CRAWL,len=Math.min(48,10+(t-STRIKE1)*4),x0=a.x+hipOff(a,t)+back,y0=a.y;for(let i=0;i<len;i+=1){const w=Math.sin(i*.38+t*1.3)*2.2+Math.sin(i*.9)*.8;r(x0+back*i,y0+w+1,3,2,'#5e1f22');r(x0+back*i,y0+w-1,3,3,i%6<3?'#e3a1a3':'#c06a74');}for(let j=0;j<3;j++){const i=Math.floor(len*(.3+j*.25));r(x0+back*i-1,y0+Math.sin(i*.38+t*1.3)*2.2-2,4,4,'#d98a90');}r(x0-2,y0-2,5,4,'#7c2e28');}
 if(sc.bow){const b=sc.bow;if(b.def==='crossbow'){r(b.x-6,b.y-1,13,2,'#6b4a2e');r(b.x+4,b.y-5,2,9,'#4a3324');r(b.x+5,b.y-5,1,9,'#c9c6ac');}else{for(let n=-7;n<=7;n++)r(b.x+n,b.y-Math.round(3-Math.abs(n)*.4),1,2,'#7a5232');r(b.x-7,b.y+1,15,1,'#d9d2bb');}}
 if(sc.puke){const q=sc.puke,k=Math.min(1,(t-q.t)/1.6);r(q.x-4-k*3,q.y,Math.round(6+k*8),2,'#9a9440');r(q.x-2,q.y-1,Math.round(3+k*5),1,'#c9c06a');r(q.x+2,q.y+1,2,1,'#7d7a33');}
 if(sc.frSoil){const q=sc.frSoil,k=Math.min(1,(t-q.t)/1.2);r(q.x-4,q.y+1,Math.round(5+k*5),2,'#5a3d1e');r(q.x-2,q.y,Math.round(2+k*3),1,'#6e4a24');for(const d of sc.frDrips||[])r(d.x-1,d.y,3,1,'#5a3d1e');}
 const list=[s,a,sc.fr.b,sc.fr.c].filter(p=>p&&!p.hidden&&p.x>-60).sort((p,q)=>p.y-q.y);M.renderForgeActors(g,list);
 // Fleck hinten an der Hose und Gestank beim Eingeschissenen
 if(sc.frSoil&&sc.fr.b&&sc.fr.b.x>0){const v=sc.fr.b,k=Math.min(1,(t-sc.frSoil.t)/1.2),rear=Math.cos(v.a)>=0?-1:1;r(v.x+rear*2-4,v.y-21,8,Math.round(4+k*3),'#3f2914');r(v.x+rear*2-3,v.y-20,6,Math.round(3+k*3),'#6b4520');if(k>.3){r(v.x+rear*3,v.y-14,2,Math.round(4+k*8),'#5a3d1e');r(v.x+rear*3-3,v.y-14,1,Math.round(3+k*6),'#5a3d1e');}
  if(t-sc.frSoil.t<10)for(let i=0;i<3;i++){const u=(t*.8+i/3)%1,x=v.x+rear*3+i*3-3+Math.sin(u*9+i)*2,y=v.y-24-u*22;g.globalAlpha=.7*(1-u);r(x,y,1,3,'#8fa35a');r(x+1,y-3,1,3,'#8fa35a');g.globalAlpha=1;}}
 // Kopf in der Esse: Flammen vor dem Kopf
 if(between(t,OVEN[0],OVEN[1])){const h=headPoint(a);for(let n=0;n<7;n++){const u=Math.sin(t*23+n*1.7);r(h.x-8+n*2.4,h.y-4-Math.abs(u)*7-(n%3)*2,3,6+Math.abs(u)*4,n%3===0?'#fff0c0':n%2?'#f4d37a':'#e2ab5c');}r(h.x-7,h.y+3,14,3,'#c8642e');g.globalAlpha=.5;r(h.x-9,h.y-14,18,6,'#7a7468');g.globalAlpha=1;}
 // Pfeil im Flug und im Hinterkopf
 const tip=headPoint(s);if(sc.arrow){const p=Math.min(1,(t-sc.arrow.t0)/(HIT-sc.arrow.t0)),x=lerp(sc.arrow.x0,tip.x+4,p),y=lerp(sc.arrow.y0,tip.y,p);g.fillStyle='#a88c60';g.fillRect(Math.round(x),Math.round(y),10,1);r(x+9,y-1,2,3,'#c9c6ac');r(x-1,y,2,1,'#d9dccb');}
 if(sc.stuck&&!s.hidden){const dir=Math.cos(s.a)>=0?-1:1,L=sc.stuck;g.fillStyle='#a88c60';for(let i=0;i<L;i++)g.fillRect(Math.round(tip.x+dir*(3+i)),Math.round(tip.y-1-i*.15),1,1);if(L>6)r(tip.x+dir*(3+L)-1,tip.y-3-L*.15,2,4,'#c9c6ac');}
 M.renderForgeEffects(g,sc.limbs,sc.fx);g.restore();
 const slow=rate(t)<1;if(slow){g.fillStyle='#00000055';g.fillRect(0,0,c.width,22);g.fillRect(0,c.height-22,c.width,22);}
 if(sc.say&&sc.say.who!=='cap'){const who=sc.say.who==='s'?s:sc.say.who==='a'?a:sc.fr[sc.say.who],h=headPoint(who);htmlBubble('archerPlotBubble',sc.say.who==='s'?smithName():sc.say.who==='a'?sc.name:sc.fr[sc.say.who].g.name.split(' ')[0],sc.say.text,(h.x-(cx-VW/2))*k/c.width,sc.say.who==='a'&&/AAA/.test(sc.say.text),sc.waiting);}else htmlBubble('archerPlotBubble','','',0);
 const el=$('archerPlotText'),line=sc.say?.who==='cap'?sc.say.text:'';if(el&&el.textContent!==line)el.textContent=line;}
function bubble(g,text,x,y,loud){g.font=`bold ${loud?24:19}px 'Courier Prime',monospace`;g.textAlign='center';g.textBaseline='middle';const words=text.split(' '),lines=[''];for(const w of words){if((lines[lines.length-1]+' '+w).trim().length>24)lines.push(w);else lines[lines.length-1]=(lines[lines.length-1]+' '+w).trim();}
 const lh=loud?28:23,width=Math.max(...lines.map(l=>g.measureText?g.measureText(l).width:l.length*12))+24,height=lines.length*lh+14,bx=Math.min(660-width-6,Math.max(6,x-width/2)),by=Math.min(420-height-30,Math.max(26,y-height));
 g.fillStyle='#17201c';g.fillRect(bx-3,by-3,width+6,height+6);g.fillStyle=loud?'#f4d37a':'#efe0b3';g.fillRect(bx,by,width,height);g.fillStyle='#17201c';lines.forEach((l,i)=>g.fillText(l,bx+width/2,by+7+lh/2+i*lh));}
// ---------- Takt, Klicks ----------
let settle=0;
const tick=M.ludusTick;M.ludusTick=dt=>{tick?.(dt);if(typeof document!=='undefined'&&document.hidden)return;
 if(sc){clock+=dt;if(clock>=1/30){const d=Math.min(clock,.1);clock=0;step(d);}return;}
 if(tk){tk.clock+=dt;if(tk.clock>=1/30){const d=Math.min(tk.clock,.1);tk.clock=0;stepTalk(d);}return;}
 const p=P();if(p.state)return;const a=archer();if(a&&!p.seen){p.seen=S.day;M.persist();}
 const busy=S.battle||M.intro?.active?.()||window.ArenaTheoryIntro?.active?.()||M.forgeIntro?.scene||M.smithWrath?.scene||M.trader?.tutorial||M.ui?.getPage?.()!=='home'||(typeof document!=='undefined'&&document.getElementById('modal')?.hidden===false)||(typeof document!=='undefined'&&!!document.querySelector?.('.smith-ceremony'));
 const ready=a&&p.seen&&S.day>=p.seen+DELAY&&p.asked!==S.day&&!!crew()&&W()?.master&&W().intro==='done';
 if(ready&&!busy){settle+=dt;if(settle>1.2){settle=0;ask();}}else settle=0;};
const click=M.schoolClick;M.schoolClick=action=>{
 if(action==='plot:next'){next();return true;}
 if(action==='plot:no'){if(!P().state)choose(false);return true;}
 if(action==='plot:yes'){if(!P().state)choose(true);return true;}
 if(action==='plot:skip'){end();return true;}
 if(action==='plot:tap'){if(sc?.cur)sc.cur.ack=true;return true;}
 return click(action);};
M.archerPlot={state:P,archer,ready:()=>{const p=P(),a=archer();return !!(a&&p.seen&&S.day>=p.seen+DELAY&&!p.state);},ask,start,end,step:d=>sc&&step(d),stepTalk:d=>tk&&stepTalk(d),next,crew,get talk(){return tk;},get scene(){return sc;},delay:DELAY};
})();
