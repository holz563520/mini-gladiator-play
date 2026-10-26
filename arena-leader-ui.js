// Anführer in der Arena (ab 5 eigenen Kämpfern): Aufstellung beim Einzug, Lagebesprechung vor dem Gong, Rufe mit Namen
// als Sprechblasen über dem Arenabild, Zeitlupen-Nahaufnahmen (Ellbogen, Anführerduell, Held) und das Publikum feiert Helden.
// Die Kampflogik steckt in outside-leader.js (L.attachArena / arenaThink); hier nur Ablauf und Darstellung.
(()=>{const M=window.MG,S=M.s,L=window.DebtLeader;if(!M||!L)return;
const $=id=>document.getElementById(id),esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const first=g=>String(g?.name||'').split(' ')[0],clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),fit=a=>a&&!a.down&&!a.g.dead&&!a.surrendered;
const readMs=t=>Math.max(2600,1600+String(t).length*55);
const A={b:null,lay:null,raf:0,brief:null,form:null,ui:null};
// ---------- Überlagerung über dem Arenabild ----------
function layer(){const c=$('arenaCanvas');if(!c)return null;const host=c.parentElement;if(!A.lay||!A.lay.isConnected){A.lay=document.createElement('div');A.lay.id='alLayer';A.lay.innerHTML='<div id="alBubbles"></div><div id="alBanner" hidden></div><div id="alBar" hidden></div>';
  if(getComputedStyle(host).position==='static')host.style.position='relative';host.appendChild(A.lay);
  A.lay.addEventListener('click',e=>{const t=e.target.closest('[data-al]');if(!t)return;e.stopPropagation();if(t.dataset.al==='skip')skipBrief();if(t.dataset.al==='swap')swapLeader();});}
 const s=A.lay.style;s.left=c.offsetLeft+'px';s.top=c.offsetTop+'px';s.width=c.clientWidth+'px';s.height=c.clientHeight+'px';return A.lay;}
function toScreen(x,y){const v=M.arenaView,c=$('arenaCanvas');if(!v||!c)return {x:-999,y:-999,cw:0,ch:0};const k=c.clientWidth/(v.width||c.width||1);
 return {x:(v.width/2+(x-v.cx)*v.scale)*k,y:(v.height/2+(y-v.cy)*v.scale)*k,cw:c.clientWidth,ch:c.clientHeight};}
const LAYER=()=>layer()?.querySelector('#alBubbles');
// Immer nur eine Sprechblase zugleich, damit sie lesbar bleibt (vorher konnten mehrere übereinander liegen und abgeschnitten werden).
// Wichtige (Anführer, Boss, laut) lösen die laufende ab; normale warten kurz (höchstens zwei in der Schlange); kleine Zurufe entfallen, solange eine Blase steht.
// Jede gezeigte Blase wird leise vorgelesen (M.speakLine soft: nur wenn gerade kein Gespräch läuft).
const BQ={until:0,prio:0,queue:[],timer:0};
function bubble(a,text,o={}){if(!a||!text)return;const prio=o.lead||o.boss||o.loud?2:o.small?0:1,now=performance.now();
 if(prio<2&&M.fieldTalk&&!M.fieldTalk.ok()&&now>=BQ.until)return;
 if(now<BQ.until){if(prio===0)return;if(prio===2&&BQ.prio<2){bubbleShow(a,text,o,prio);return;}BQ.queue.push([a,text,o,prio]);if(BQ.queue.length>2)BQ.queue.splice(0,BQ.queue.length-2);bubbleNext();return;}
 bubbleShow(a,text,o,prio);}
function bubbleShow(a,text,o,prio){const lay=LAYER();if(lay)for(const old of [...lay.children]){if(old.classList.contains('out'))continue;old.classList.add('out');setTimeout(()=>old.remove(),300);old._a=null;}
 const ms=Math.max(o.ms||0,readMs(text));BQ.until=performance.now()+ms;M.fieldTalk?.mark(ms);BQ.prio=prio;bubbleNow(a,text,{...o,ms,small:false});M.speakLine?.(text,null,a.g||null,{name:o.name,soft:true});bubbleNext();}
function bubbleNext(){clearTimeout(BQ.timer);if(!BQ.queue.length)return;BQ.timer=setTimeout(()=>{const n=BQ.queue.shift();if(n&&!n[0].g?.dead&&!n[0].down)bubbleShow(...n);else bubbleNext();},Math.max(60,BQ.until-performance.now()+180));}
function bubbleNow(a,text,o={}){const l=layer()?.querySelector('#alBubbles');if(!l||!a)return;if(o.small&&[...l.children].filter(e=>!e.classList.contains('out')).length>=3)return;
 for(const old of l.children)if(old._a===a){old.classList.add('out');setTimeout(()=>old.remove(),300);old._a=null;}
 const el=document.createElement('div');el._a=a;el.className='ow-bubble'+(a.team?' foe':'')+(o.lead?' lead':'')+(o.small?' small':'')+(o.loud||/!$/.test(text)&&text===text.toUpperCase()?' loud':'');
 el.innerHTML=(o.small?'':'<b>'+esc(a.g?.name||'')+'</b>')+'<span>'+esc(text)+'</span>';l.appendChild(el);el._w=el.offsetWidth;el._h=el.offsetHeight;
 el._upd=()=>{const p=toScreen(a.x,a.y-(a.down?36:88)),bw=el._w/2;el.style.left=clamp(p.x,bw+4,p.cw-bw-4)+'px';el.style.top=clamp(p.y,el._h+4,p.ch-30)+'px';};el._upd();
 setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),400);},o.ms||readMs(text));}
// Rufe aus dem Publikum (oben am Rand, ohne Sprecher)
function chant(text,o={}){const l=layer()?.querySelector('#alBubbles');if(!l)return;const el=document.createElement('div');el.className='al-chant'+(o.boo?' boo':'');el.textContent=text;
 el.style.left=(8+Math.random()*84)+'%';el.style.top=(4+Math.random()*12)+'%';l.appendChild(el);setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),500);},o.ms||1800);}
function banner(html,ms=2600){const e=layer()?.querySelector('#alBanner');if(!e)return;e.innerHTML=html;e.hidden=false;e.classList.remove('out');clearTimeout(e._t);e._t=setTimeout(()=>{e.classList.add('out');setTimeout(()=>{e.hidden=true;},450);},ms);}
function bar(html){const e=layer()?.querySelector('#alBar');if(!e)return;if(!html){e.hidden=true;e.innerHTML='';return;}e.innerHTML=html;e.hidden=false;}
function updBubbles(){const l=A.lay?.querySelector('#alBubbles');if(!l)return;const placed=[];for(const el of l.children){if(!el._upd||el.classList.contains('out'))continue;el._upd();
  let x=parseFloat(el.style.left)||0,y=parseFloat(el.style.top)||0;const w=el._w||0,h=el._h||0;
  for(let k=0;k<6;k++){const hit=placed.find(r=>Math.abs(r.x-x)<(r.w+w)/2+4&&y>r.y-r.h-4&&y-h<r.y+4);if(!hit)break;y=hit.y-hit.h-6;}if(y-h<2)y=h+2;el.style.top=y+'px';placed.push({x,y,w,h});}}
function loop(){A.raf=0;const b=S.battle;if(!b||b!==A.b||b.result||b.done){teardown();return;}layer();updBubbles();drain(b);A.raf=requestAnimationFrame(loop);}
function teardown(){if(A.raf)cancelAnimationFrame(A.raf);A.raf=0;A.b=null;A.brief=null;A.form=null;if(A.lay){A.lay.remove();A.lay=null;}}
// ---------- Ereignisse aus der Kampflogik ----------
const HERO={leader:n=>['Ihr Anführer liegt im Sand! Die Menge tobt für '+n+'!','Der Kopf der Bande ist erledigt. '+n+' badet im Jubel.'],
 rescue:(n,s)=>['In letzter Sekunde! '+n+' holt '+s+' da raus. Die Ränge stehen!',n+' rettet '+s+'. Das Publikum liebt Helden, die nicht zu spät kommen.'],
 double:n=>['Zwei! '+n+' räumt auf, die Menge skandiert seinen Namen!',n+' legt den Zweiten hin. Rom hat einen neuen Liebling.']};
function hero(b,e){const a=e.actor,n=first(a.g),why=e.why,s=e.saved?first(e.saved.g):'';const p=HERO[why]||HERO.double,txt=p(n,s)[Math.random()*2|0];
 if(!b.cinematic&&!b.finale)b.cinematic={x:a.x,y:a.y-20,left:1.7,duration:1.7,kind:'HELD · '+n.toUpperCase()};
 M.cheer=Math.max(M.cheer||0,1);M.sound?.('crowd');a.warCry=Math.max(a.warCry||0,1.6);
 banner('<small>DAS PUBLIKUM FEIERT</small><b>'+esc(a.g.name)+'</b><span>'+esc(txt)+'</span>',3200);
 for(let i=0;i<4;i++)setTimeout(()=>chant(n.toUpperCase()+'! '+n.toUpperCase()+'!'),250+i*420);
 setTimeout(()=>{if(fit(a))bubble(a,['Für euch!','Noch einer?','Habt ihr das gesehen?!','Das war für '+(s||'Rom')+'!'][Math.random()*4|0],{small:true});},900);
 a.g.fame=(a.g.fame||0)+(why==='leader'?6:3);mlog('<b>'+esc(a.g.name)+'</b> wird vom Publikum gefeiert.');}
function mlog(t){try{M.battleLog?.(t.replace(/<[^>]+>/g,''));}catch(e){}}
function drain(b){const ev=b.events;if(!ev?.length)return;const keep=[];
 for(const e of ev.splice(0)){const a=e.actor;
  if(e.type==='lead'){if(!a||(!fit(a)&&!e.leader))continue;bubble(a,e.text,{lead:e.leader,small:e.kind==='ack'||e.kind==='ignore',loud:e.urgent});}
  else if(e.type==='gripWarn'){}
  else if(e.type==='elbow'){M.sound?.('hit');setTimeout(()=>{if(fit(e.foe))bubble(e.foe,['Meine Nase!','Aaargh!','Mmpf!'][Math.random()*3|0],{small:true});},400);}
  else if(e.type==='duel'){if(!b.cinematic)b.cinematic={x:(a.x+e.foe.x)/2,y:a.y-30,left:1.5,duration:1.5,kind:'DUELL DER ANFÜHRER'};banner('<small>DUELL DER ANFÜHRER</small><b>'+esc(a.g.name)+' gegen '+esc(e.foe.g.name)+'</b>',2400);M.cheer=1;M.sound?.('crowd');}
  else if(e.type==='hero')hero(b,e);
  else if(e.type==='crowd'){const n=first(a.g).toUpperCase();if(e.ok){M.cheer=1;M.sound?.('crowd');for(let i=0;i<3;i++)setTimeout(()=>chant(['ROM! ROM!',n+'! '+n+'!','BLUT! BLUT!'][i]),200+i*380);}
   else{for(let i=0;i<2;i++)setTimeout(()=>chant(['Buuuh!','Kämpf lieber!'][i],{boo:true}),200+i*450);setTimeout(()=>{if(fit(a))bubble(a,'Undankbares Pack.',{small:true});},1300);}}
  else keep.push(e);}
 ev.push(...keep);}
// ---------- Einzug: Aufstellung und Lagebesprechung ----------
function startForm(b){const f=L.arenaFormation(b),me=b.actors.find(a=>a.g.id===b.lead.leaderId),pts=[];
 for(const [a,p] of f.pts){p.y=clamp(p.y,190,590);p.x=clamp(p.x,60,980);pts.push([a,p]);}
 A.form={pts,t0:performance.now(),said:false};
 const sold=f.line.filter(a=>a.g.role==='Soldat'),txt=[sold.length?(sold.length>1?'Schilde nach vorn! '+sold.slice(0,3).map(a=>first(a.g)).join(', ')+', ihr seid die Mauer!':first(sold[0].g)+', du bist vorn. Du bist die Mauer.'):'Linie bilden! Schulter an Schulter!',
  f.arch.length?f.arch.map(a=>first(a.g)).join(' und ')+': hinter die Linie, freies Schussfeld!':'',
  f.assa.length?f.assa.map(a=>first(a.g)).join(' und ')+': an die Flügel. Ihr wartet, bis sie an der Mauer kleben.':''].filter(Boolean);
 txt.forEach((t,i)=>setTimeout(()=>{if(A.b===b&&me)bubble(me,t,{lead:true,ms:2600});},i*1500));
 bar('<span>Anführer: <b>'+esc(me?.g.name||'?')+'</b></span><button class="btn" data-al="swap">Wechseln</button><button class="btn primary" data-al="skip">Weiter ▶</button>');}
function stepForm(b,dt){let done=true;for(const [a,p] of A.form.pts){if(!fit(a))continue;const x=a.x,y=a.y,d=Math.hypot(p.x-x,p.y-y);if(d<4){a.state='idle';a.moveSpeed=0;continue;}done=false;
  const k=Math.min(d,95*dt);a.x+=(p.x-x)/d*k;a.y+=(p.y-y)/d*k;a.a=Math.atan2(p.y-y,p.x-x);a.state='move';M.updateLocomotion?.(a,x,y,a.phase||0,dt);}
 // am Ende zu den Gegnern drehen
 if(done||performance.now()-A.form.t0>5200){const fs=b.actors.filter(a=>a.team===1&&fit(a));for(const [a] of A.form.pts){const f=fs.sort((x,y)=>Math.hypot(x.x-a.x,x.y-a.y)-Math.hypot(y.x-a.x,y.y-a.y))[0];if(f)a.a=Math.atan2(f.y-a.y,f.x-a.x);a.state='idle';a.moveSpeed=0;}
  if(performance.now()-A.form.t0>Math.max(2600,(A.form.pts.length?3000:0)))startBrief(b);}}
function startBrief(b){A.form=null;b.lead.phase='brief';const lines=L.arenaBrief(b);A.brief={lines,i:-1,next:0};bar('<span>Lagebesprechung</span><button class="btn primary" data-al="skip">Gong ▶</button>');}
function stepBrief(b){const B=A.brief,now=performance.now();if(now<B.next)return;B.i++;if(B.i>=B.lines.length){gong(b);return;}const l=B.lines[B.i];if(fit(l.who))bubble(l.who,l.text,{lead:!l.foe,ms:readMs(l.text)});B.next=now+readMs(l.text)*.72;}
function gong(b){A.brief=null;A.form=null;bar('');L.arenaStart(b);M.sound?.('gong');M.cheer=Math.max(M.cheer||0,.7);}
function skipBrief(){const b=A.b;if(!b?.lead)return;if(b.lead.phase==='form'){const f=A.form;if(f)for(const [a,p] of f.pts)if(fit(a)){a.x=p.x;a.y=p.y;}startBrief(b);}else if(b.lead.phase==='brief')gong(b);}
function swapLeader(){const b=A.b,ld=b?.lead;if(!ld||ld.phase==='fight')return;const c=b.actors.filter(a=>a.team===0&&fit(a)).map(a=>a.g).sort((x,y)=>L.leaderScore(y)-L.leaderScore(x));if(c.length<2)return;
 const i=c.findIndex(g=>g.id===ld.leaderId),g=c[(i+1)%c.length];ld.leaderId=g.id;ld.q=L.quality(g);b.leaders[0]=g.id;S.arenaLeaderId=g.id;
 const me=b.actors.find(a=>a.g.id===g.id),q=ld.q;bubble(me,['Ich führe. Wer meckert, kämpft vorne.','Hört auf mich, dann lebt ihr länger.','Na gut. Dann eben ich.'][Math.random()*3|0],{lead:true});
 bar('<span>Anführer: <b>'+esc(g.name)+'</b> <small>Führung '+Math.round(q.lead)+'</small></span><button class="btn" data-al="swap">Wechseln</button><button class="btn primary" data-al="skip">Weiter ▶</button>');try{M.persist?.();}catch(e){}}
// ---------- Haken ----------
const prevStep=M.fixedStep;
M.fixedStep=function(dt){const b=S.battle,ld=b?.lead;if(!ld?.arena||ld.phase==='fight'||b.paused||b.result)return prevStep.apply(this,arguments);
 if(b!==A.b)attachView(b);
 if(M.modIntro?.())return;// Moderator stellt noch vor
 if(ld.phase==='intro'){ld.phase='form';startForm(b);}
 if(ld.phase==='form'&&A.form)stepForm(b,dt);else if(ld.phase==='form')startBrief(b);
 if(ld.phase==='brief'&&A.brief)stepBrief(b);else if(ld.phase==='brief')gong(b);};
function attachView(b){teardown();A.b=b;layer();if(!A.raf)A.raf=requestAnimationFrame(loop);}
const prevStart=M.onBattleStart;
M.onBattleStart=function(){const r=prevStart?.apply(this,arguments);try{const b=S.battle;if(b&&!b.lead&&M.leaderArena!==false&&L.arenaEligible(b)){L.attachArena(b,{leaderId:S.arenaLeaderId});if(b.lead)attachView(b);}}catch(e){console.warn(e);}return r;};
// Nach Neuladen eines laufenden Kampfes: Logik reparieren und Blasen wieder anzeigen
setInterval(()=>{const b=S.battle;if(b?.lead?.arena&&b!==A.b&&!b.result){if(!(b.lead.unaware instanceof Set))L.repairArena(b);if(b.lead.phase!=='fight')b.lead.phase='intro';attachView(b);}},1000);
window.ArenaLeaderUI={A,bubble,toScreen,skipBrief,swapLeader,teardown};
})();
