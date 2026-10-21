'use strict';
// =====================================================================================================
// ARENA-NEU · OBERFLÄCHE (nur Testversion)
// Arena → HUMAN/BEAST → Gruppe (Auto/Manuell) + vier Herausforderungen je Stufe → Gegnerpräsentation → Spionage/Aufstellung → Kampf → Ergebnis
// Wenige Klicks im Automatikmodus; alles lässt sich auf Wunsch von Hand festlegen.
// =====================================================================================================
(()=>{
const M=window.MG,S=M.s,CH=window.Challenges,AN=window.AN,CF=window.CF,BZ=window.Beasts,H=window.HahnArena,ART=window.ArenaArt,C=window.ArenaCareer,cl=M.clamp;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pct=v=>Math.round(v*100)+' %';
const U={screen:'home',mode:null,species:null,size:3,auto:true,picked:[],rowsAuto:true,rows:{},chall:null,sig:'',more:false,sel:null,pres:null,result:null,tools:false};
window.ArenaUI=U;
const root=document.createElement('div');root.id='an';document.body.appendChild(root);
root.innerHTML='<div class="an-bg"><canvas width="320" height="180"></canvas></div><header class="an-top"><button class="an-back" data-a="back" aria-label="Zurück">◂</button><div class="an-title"><small>ARENA THEORY · TESTVERSION</small><b id="anTitle">ARENA</b></div><div class="an-purse"><span class="an-coin"></span><b id="anGold">0</b></div></header><main id="anView"></main><div id="anLayer"></div>';
const view=root.querySelector('#anView'),layer=root.querySelector('#anLayer');

// ---------- Animation: alle sichtbaren Bildflächen ----------
const live=new Map();let t0=performance.now(),lastPaint=0;
function anim(cv,fn){live.set(cv,fn);return cv;}
function frame(now){requestAnimationFrame(frame);for(const cv of live.keys())if(!cv.isConnected)live.delete(cv);if(root.hidden||now-lastPaint<33)return;lastPaint=now;const t=(now-t0)/1000;
 for(const [cv,fn] of live){const r=cv.getBoundingClientRect();if(r.bottom<-40||r.top>innerHeight+40)continue;const ctx=cv.getContext('2d');try{fn(ctx,t,cv);}catch(e){console.error(e);live.delete(cv);}}}
requestAnimationFrame(frame);
anim(root.querySelector('.an-bg canvas'),(ctx,t)=>ART.arena(ctx,320,180,t,{cheer:U.screen==='result'&&U.result?.won,blood:U.screen==='result'}));

// ---------- Eigene Kämpfer ----------
const keyOf=u=>u.kind==='human'?'g:'+u.g.id:u.kind==='rooster'?'r:'+u.R.id:'l:'+u.L.id;
function pool(){if(U.mode==='human')return S.roster.filter(g=>!g.dead&&!g.retired&&!(g.age<18)).map(g=>({kind:'human',g}));if(U.species==='loewe')return C.lions.filter(L=>!L.dead).map(L=>({kind:'lion',L}));return C.roosters.filter(R=>!R.dead).map(R=>({kind:'rooster',R}));}
const withKey=u=>(u.key=keyOf(u),u);
function hp(u){return u.kind==='human'?M.health(u.g)*Math.min(1,u.g.blood/80):u.kind==='rooster'?CF.health(u.R):BZ.health(BZ.makeLionProbe?.(u.L)||{tissue:{head:1},max:{head:1},blood:100})||u.L.condition.health;}
function health(u){if(u.kind==='lion'){const c=u.L.condition;return Math.round(Math.min(c.health,c.blood)*(.7+.3*c.rear/100));}return Math.round(hp(u));}
function fit(u){if(u.kind==='human'&&C.fit)return C.fit(u.g);if(u.kind==='human'){const g=u.g;return !g.dead&&M.health(g)>=55&&g.blood>=55&&!['head','neck','chest','belly'].some(p=>g.body[p].missing)&&!['lt','rt'].every(p=>g.body[p].missing);}if(u.kind==='rooster')return !u.R.dead&&CF.fitForFight(u.R);return !u.L.dead&&u.L.condition.health>=40&&u.L.condition.blood>=45;}
const name=u=>u.kind==='human'?u.g.name:u.kind==='rooster'?u.R.name:u.L.name;
const roleOf=u=>u.kind==='human'?u.g.role:u.kind==='rooster'?u.R.quality.title:u.L.epithet;
function autoRows(units){const rows={};if(units.length<=2){for(const u of units)rows[u.key]='front';return rows;}
 const score=u=>u.kind==='human'?((u.g.role==='Soldat'?2:u.g.role==='Assassine'?1:-3)+CH.kw(u)/100+health(u)/200+(M.gear(u.g,'shield')?.5:0)):CH.kw(u)/100+health(u)/300;
 const sorted=[...units].sort((a,b)=>score(b)-score(a)),nf=Math.ceil(units.length/2);sorted.forEach((u,i)=>rows[u.key]=i<nf&&!(u.kind==='human'&&(u.g.role==='Fernkämpfer'||AN.isRanged(u.g)))?'front':'back');
 if(!Object.values(rows).includes('front'))rows[sorted[0].key]='front';return rows;}
function team(){const all=pool().map(withKey),ok=all.filter(fit);let pick;
 if(U.auto)pick=[...ok].sort((a,b)=>CH.kw(b)-CH.kw(a)).slice(0,U.size);
 else{U.picked=U.picked.filter(k=>ok.some(u=>u.key===k)).slice(0,U.size);pick=U.picked.map(k=>ok.find(u=>u.key===k));}
 const rows=U.rowsAuto?autoRows(pick):Object.fromEntries(pick.map(u=>[u.key,U.rows[u.key]||'front']));for(const u of pick)u.row=rows[u.key];return pick;}
// Gastgeber-Haken (ArenaCareer): Gruppengrößen, gesperrte Bereiche, Sonderherausforderungen, eigene Vorstellung, Ergebnis
const SIZES=()=>C.sizes?.(U)||(U.mode==='human'?[1,2,3,5,10]:[1,2,3,5]);const lockMsg=k=>C.locked?.(k)||'';
const sizes=()=>SIZES().filter(n=>n<=Math.max(1,pool().filter(fit).length));

// ---------- Kleine Bilder ----------
const thumbs=new Map();
function unitThumb(u,w=64,h=72,mood){const cv=ART.mk(w,h);cv.className='px';
 if(u.kind==='human'){const p=ART.portrait(u.g);cv.getContext('2d').drawImage(p,0,0,80,100,0,0,w,h*100/90);if(mood)cv.classList.add('m-'+mood);return cv;}
 anim(cv,(ctx,t)=>{ctx.clearRect(0,0,w,h);ctx.fillStyle='#202d2f';ctx.fillRect(0,0,w,h);if(u.kind==='rooster')ART.rooster(ctx,u.R,{t,mood:mood||'idle',w,h,size:h*.62,x:w/2,y:h*.93,seed:u.R.seed%7});else ART.lion(ctx,u.L,{t,mood:mood||'idle',x:w*.52,y:h*.94,scale:Math.min(w/150,h/95),seed:3});});return cv;}
function groupArt(units,w,h){const cv=ART.mk(w,h);cv.className='px';const shown=units.length>5?units.slice(0,3):units,humans=shown.filter(u=>u.kind==='human'),figs=humans.map(u=>ART.figure(u.g,false));let last=-Infinity;
 anim(cv,(ctx,t)=>{if(t-last<.1)return;last=t;ctx.imageSmoothingEnabled=false;ART.arena(ctx,w,h,t,{});const n=shown.length,step=Math.min(w/(n+.4),90),x0=w/2-step*(n-1)/2;
  shown.forEach((u,i)=>{const x=x0+i*step,y=h-4-(i%2)*6;
   if(u.kind==='human'){const f=figs[humans.indexOf(u)],k=Math.min(.5,h/360);ctx.drawImage(f,0,0,240,300,Math.round(x-60*k*2),Math.round(y-300*k),Math.round(240*k),Math.round(300*k));}
   else if(u.kind==='rooster')ART.rooster(ctx,u.R,{t,mood:'focus',w,h,size:h*.22,x,y,seed:i,face:-1});
   else ART.lion(ctx,u.L,{t,mood:'focus',x,y,scale:h/190,face:-1,seed:i});});});return cv;}

// ---------- Rahmen ----------
function setTitle(t,back=true){root.querySelector('#anTitle').textContent=t;root.querySelector('.an-back').style.visibility=back?'visible':'hidden';root.querySelector('#anGold').textContent=C.gold.toLocaleString('de-DE');}
function go(screen,dir=1){U.screen=screen;view.classList.remove('in-l','in-r');void view.offsetWidth;view.classList.add(dir>0?'in-r':'in-l');render();window.scrollTo(0,0);view.scrollTop=0;}
U.api={root,view,layer,setTitle,go,anim,esc,render,ART,thumb:(...a)=>unitThumb(...a)};
function render(){({home,beast,hub,kinds,result,...(U.screens||{})}[U.screen]||home)();}
// Gastgeber-Zugang für zusätzliche Bildschirme (z. B. Boxkämpfe in box-game.js): eigene Bildschirme über U.screens eintragen
U.screens={};

// ---------- 1 · Arena: HUMAN oder BEAST ----------
function home(){setTitle('DIE ARENA',!!C.close);
 view.innerHTML=`<section class="an-hero"><p class="eyebrow">Wähle die Art des Kampfes</p></section>
 <div class="an-modes"><button class="an-mode human${lockMsg('human')?' locked':''}" data-a="${lockMsg('human')?'lockedmsg:human':'mode:human'}"><canvas width="300" height="170" class="px"></canvas><span class="an-mlabel"><b>HUMAN</b><small>${lockMsg('human')?'🔒 gesperrt':'Gladiatorenkämpfe'}</small></span></button>
 <button class="an-mode beast" data-a="mode:beast"><canvas width="300" height="170" class="px"></canvas><span class="an-mlabel"><b>BEAST</b><small>Tierkämpfe</small></span></button></div>
 <div class="an-stats"><span>Kämpfe <b>${C.fights}</b></span><span>Siege <b>${C.wins}</b></span><span>Gefallene <b>${C.fallen.length}</b></span><span>Tag <b>${S.day}</b></span></div>
 ${C.classic?'<div class="an-classic"><button data-a="classic">Klassische Arena · Ligen, Turniere, offene Arenen ▸</button></div>':''}
 ${C.test?`<details class="an-tools"><summary>Testwerkzeuge</summary><div><button data-a="day">Nächster Tag (Heilung)</button><button data-a="day7">7 Tage</button><button data-a="gold">+500 Gold</button><button data-a="refill">Kader auffüllen</button></div><p>Isolierte Testversion · Spielstände bleiben unberührt · Gegnerische Schulen sind hier abgeschaltet.</p></details>`:''}`;
 const [h,b]=view.querySelectorAll('.an-mode canvas'),glads=S.roster.filter(g=>!g.dead).sort((a,b)=>M.power(b)-M.power(a)).slice(0,3),figs=glads.map((g,i)=>ART.figure(g,i===0));
 anim(h,(ctx,t)=>{ART.arena(ctx,300,170,t,{cheer:1});ctx.imageSmoothingEnabled=false;const pos=[[150,166,.62],[86,160,.5],[214,160,.5]];
  [1,2,0].forEach(i=>{const f=figs[i];if(!f)return;const [x,y,k]=pos[i],bob=Math.round(Math.sin(t*2.2+i)*1.5);ctx.drawImage(f,Math.round(x-120*k),Math.round(y-300*k+bob),Math.round(240*k),Math.round(300*k));});
  ctx.fillStyle='rgba(20,10,6,.35)';ctx.fillRect(0,0,300,170);});
 const L=C.lions.find(l=>!l.dead)||CH.lion(Math.random,{}),R=C.roosters.find(r=>!r.dead);
 anim(b,(ctx,t)=>{ART.arena(ctx,300,170,t,{night:1});ART.lion(ctx,L,{t,mood:'proud',x:150,y:163,scale:.92,face:1});if(R)ART.rooster(ctx,R,{t,mood:'proud',w:300,h:170,size:56,x:262,y:164,seed:2,face:-1});ctx.fillStyle='rgba(20,6,6,.3)';ctx.fillRect(0,0,300,170);});}

// ---------- 1b · HUMAN: Art des Kampfes (nur wenn der Gastgeber weitere Kampfarten anbietet, z. B. Boxkämpfe) ----------
function kinds(){setTitle('HUMAN · ART DES KAMPFES');const bx=C.boxMenu?.()||{ok:false};
 view.innerHTML=`<section class="an-hero"><p class="eyebrow">Wie sollen deine Gladiatoren kämpfen?</p></section>
 <div class="an-modes an-kinds"><button class="an-mode human" data-a="kind:arena"><canvas width="300" height="170" class="px"></canvas><span class="an-mlabel"><b>ARENAKÄMPFE</b><small>Gruppen · Schwert, Schild, Rüstung · Tod möglich</small></span></button>
 <button class="an-mode box${bx.ok?'':' locked'}" data-a="${bx.ok?'kind:box':'kindlock'}"><canvas width="300" height="170" class="px"></canvas><span class="an-mlabel"><b>BOXKÄMPFE</b><small>${bx.ok?'1 gegen 1 · nackte Fäuste · Training mit 15 Gegnern':'🔒 '+esc(bx.msg||'noch gesperrt')}</small></span></button></div>
 <p class="an-note">Boxkämpfe sind ideal zum Trainieren: Kraft, Ausdauer und Geschick wachsen, ohne dass gleich der Schädel unter dem Schwert fällt.</p>`;
 const [a,b]=view.querySelectorAll('.an-mode canvas'),glads=S.roster.filter(g=>!g.dead).sort((x,y)=>M.power(y)-M.power(x)).slice(0,3),figs=glads.map((g,i)=>ART.figure(g,i===0));
 anim(a,(ctx,t)=>{ART.arena(ctx,300,170,t,{cheer:1});ctx.imageSmoothingEnabled=false;const pos=[[150,166,.62],[86,160,.5],[214,160,.5]];
  [1,2,0].forEach(i=>{const f=figs[i];if(!f)return;const [x,y,k]=pos[i],bob=Math.round(Math.sin(t*2.2+i)*1.5);ctx.drawImage(f,Math.round(x-120*k),Math.round(y-300*k+bob),Math.round(240*k),Math.round(300*k));});ctx.fillStyle='rgba(20,10,6,.35)';ctx.fillRect(0,0,300,170);});
 anim(b,(ctx,t)=>{ctx.imageSmoothingEnabled=false;if(!C.boxCard?.(ctx,t,300,170)){ART.arena(ctx,300,170,t,{night:1});}if(!bx.ok){ctx.fillStyle='rgba(10,6,4,.55)';ctx.fillRect(0,0,300,170);}});}

// ---------- 2 · BEAST: Tierklassen ----------
const SPECIES=[{key:'hahn',label:'Hahn',ok:true,txt:'Federn, Sporen, schlechte Laune'},{key:'hund',label:'Hund',ok:false,txt:'Molosser aus Epirus'},{key:'baer',label:'Bär',ok:false,txt:'Braunbär aus Dakien'},{key:'loewe',label:'Löwe',ok:true,txt:'Der König des Sandes'},{key:'tiger',label:'Tiger',ok:false,txt:'Gestreifter Tod aus Hyrkanien'}];
function beast(){setTitle('BEAST · TIERKÄMPFE');
 view.innerHTML=`<section class="an-hero"><p class="eyebrow">Mit welchen Tieren trittst du an?</p></section><div class="an-species">${SPECIES.map(s=>{const lk=s.ok&&lockMsg(s.key);return `<button class="an-sp${s.ok&&!lk?'':' locked'}" data-a="${lk?'lockedmsg:'+s.key:s.ok?'species:'+s.key:'locked:'+s.key}"><canvas width="150" height="104" class="px"></canvas><b>${s.label}</b><small>${lk?'gesperrt':s.ok?s.txt:'BALD · noch nicht spielbar'}</small>${s.ok&&!lk?'':'<i class="an-lock">🔒</i>'}</button>`;}).join('')}</div>
 <p class="an-note">Gegner können aus jeder Art stammen: Deine Tiere treffen auch auf Gladiatoren, Löwen oder Hähne.</p>`;
 const cvs=view.querySelectorAll('.an-sp canvas'),L=C.lions.find(l=>!l.dead)||CH.lion(Math.random,{}),R=C.roosters.find(r=>!r.dead)||CH.rooster(Math.random,{});
 SPECIES.forEach((s,i)=>anim(cvs[i],(ctx,t)=>{ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,150,104);const g=ctx.createRadialGradient(75,70,6,75,70,80);g.addColorStop(0,s.ok?'#5a3d26':'#2a2522');g.addColorStop(1,'#1a120d');ctx.fillStyle=g;ctx.fillRect(0,0,150,104);ctx.fillStyle=s.ok?'#b08a5a':'#3a332c';ctx.fillRect(0,92,150,12);
  if(s.key==='hahn')ART.rooster(ctx,R,{t,mood:'proud',w:150,h:104,size:58,x:75,y:96});
  else if(s.key==='loewe')ART.lion(ctx,L,{t,mood:'proud',x:82,y:98,scale:.66,face:-1});
  else if(s.key==='tiger'){ART.tiger(ctx,t,80,98,.62);}
  else if(s.key==='baer')ART.bear(ctx,t,66,96,1);else ART.dog(ctx,t,70,96,1.1);
  if(!s.ok||lockMsg(s.key))ART.locked(ctx);}));}

// ---------- 3 · Gruppe und Herausforderungen ----------
function signature(units){return U.mode+'|'+U.species+'|'+CH.signature(units);}
function ensureChallenges(units,force){const sig=signature(units);if(!force&&U.chall&&U.sig===sig)return;challengeJob++;U.sig=sig;U.chall=[];ART.clearFigures();stopSpy();}
let challengeJob=0;
const shownLevels=()=>U.more?CH.LEVELS.slice(3):CH.LEVELS.slice(0,3);
function fillChallenges(units){const job=++challengeJob;if(!units.length)return;const levels=CH.LEVELS,missing=[];
 for(const level of levels)for(let i=(U.chall||[]).filter(c=>c.level.key===level.key).length;i<4;i++)missing.push({level,variant:i});
 const hint=view.querySelector('.an-generating');if(hint){hint.textContent=missing.length?'Gegner werden vorbereitet …':'';hint.hidden=!missing.length;}
 function step(){if(job!==challengeJob||root.hidden||U.screen!=='hub'||U.sig!==signature(units))return;const slot=missing.shift();if(!slot)return;const {level,variant}=slot;
  const cross=CH.CROSS;if(C.cross!=null)CH.CROSS=C.cross;let c;try{c=CH.make(units,U.mode,Math.floor(Math.random()*1e9),[level],{variant,previous:U.chall.filter(c=>CH.LEVELS.indexOf(c.level)*4+(c.variant??0)<CH.LEVELS.indexOf(level)*4+variant).sort((a,b)=>b.ratio-a.ratio)[0]})[0];}finally{CH.CROSS=cross;}
  if(c){U.chall.push(c);U.chall.sort((a,b)=>a.ratio-b.ratio);const cards=view.querySelector('.an-cards');if(cards){cards.insertAdjacentHTML('beforeend',card(c,U.chall.length-1));const el=cards.lastElementChild;if(el?.dataset.id===c.id)el.querySelector('.art').appendChild(groupArt(c.enemy,300,120));}}
  const status=view.querySelector('.an-generating');if(status){status.textContent=missing.length?'Gegner werden vorbereitet …':'';status.hidden=!missing.length;}if(missing.length)requestAnimationFrame(step);}
 if(missing.length)requestAnimationFrame(step);}
const allChall=()=>[...(U.extra||[]),...(U.chall||[])];
function hub(){const units=team(),all=pool().map(withKey);ensureChallenges(units);U.extra=units.length?C.extraChallenges?.(units)||[]:[];
 setTitle(U.mode==='human'?'HUMAN · GLADIATOREN':U.species==='loewe'?'BEAST · LÖWEN':'BEAST · HÄHNE');
 const okN=all.filter(fit).length,kw=CH.teamKW(units);
 view.innerHTML=`<section class="an-panel an-group"><header><p class="eyebrow">Deine Gruppe</p><div class="an-toggle" role="group" aria-label="Gruppenauswahl"><button class="${U.auto?'on':''}" data-a="auto:1">AUTO</button><button class="${U.auto?'':'on'}" data-a="auto:0">MANUELL</button></div></header>
  <div class="an-sizes">${SIZES().map(n=>`<button class="${U.size===n?'on':''}" data-a="size:${n}" ${n>Math.max(1,okN)?'disabled':''}>${n}</button>`).join('')}<span class="an-kw">KW <b>${kw}</b></span></div>
  <div class="an-team">${units.map(u=>`<div class="an-chip" data-key="${u.key}"><span class="th"></span><b>${esc(name(u))}</b><small>${esc(roleOf(u))} · KW ${CH.kw(u)}</small><i class="an-hpbar"><i style="width:${health(u)}%"></i></i><em class="row ${u.row}">${u.row==='front'?'1. Reihe':'2. Reihe'}</em></div>`).join('')||'<p class="an-empty">Niemand einsatzbereit. Lass einen Tag vergehen.</p>'}</div>
  ${U.auto?`<p class="an-hint">Das Spiel stellt die stärksten einsatzbereiten ${U.mode==='human'?'Gladiatoren':'Tiere'} auf. Für eigene Wahl: MANUELL.</p>`:`<div class="an-roster">${all.map(u=>{const on=units.some(x=>x.key===u.key),f=fit(u);return `<button class="an-card${on?' on':''}${f?'':' unfit'}" data-a="${f?'pick:'+u.key:'unfit'}" data-key="${u.key}"><span class="th"></span><b>${esc(name(u))}</b><small>${esc(roleOf(u))}</small><span class="kw">KW ${CH.kw(u)}</span><i class="an-hpbar"><i style="width:${health(u)}%"></i></i>${f?'':'<em>verletzt</em>'}</button>`;}).join('')}</div><p class="an-hint">${units.length}/${U.size} gewählt · Antippen wählt aus oder ab.</p>`}
 </section>
 <section class="an-chall"><header><p class="eyebrow">Herausforderungen · von einfach nach schwer</p><button class="an-link" data-a="reroll">↻ andere Gegner</button></header>
   <div class="an-cards">${(U.chall||[]).map((c,i)=>card(c,i)).join('')}</div><p class="an-hint an-generating" role="status"></p>
  <div class="an-switch"><button data-a="more" class="${U.more?'on':''}">${U.more?'◂ Extrem einfach · Leicht · Ausgeglichen':'Schwer · Extrem schwer ▸'}</button></div></section>
 ${U.extra.length?`<section class="an-chall an-special"><header><p class="eyebrow">Besondere Herausforderung</p></header><div class="an-cards">${U.extra.map(c=>card(c,-1)).join('')}</div></section>`:''}`;
 view.querySelectorAll('.an-chip,.an-card').forEach(el=>{const u=all.find(x=>x.key===el.dataset.key);if(u)el.querySelector('.th').appendChild(unitThumb(u,40,46));});
 view.querySelectorAll('.an-ccard').forEach(el=>{const c=allChall().find(x=>x.id===el.dataset.id);el.querySelector('.art').appendChild(groupArt(c.enemy,300,120));});fillChallenges(units);}
function card(c,i){const show=i<0||shownLevels().includes(c.level);if(!show)return '';const L=c.level,rec=C.recommend?.(c)||'',special=i<0;
 const comp=summary(c.enemy);
 // Sonderherausforderungen: Karte selbst nicht antippbar (kein versehentlicher Start beim Scrollen), nur der Knopf nimmt sie an
 return `<${special?'div':'button'} class="an-ccard lv${CH.LEVELS.indexOf(L)}${special?' an-spec':''}" ${special?'':`data-a="chall:${c.id}"`} data-id="${c.id}" style="--lv:${L.color}"><div class="art"></div><div class="body"><p class="tag"><span class="lvl">${L.label.toUpperCase()}</span>${rec?`<span class="an-rec">${esc(rec)}</span>`:''}<span class="sk">${'☠'.repeat(L.skulls)||'·'}</span></p>
  <h3>${esc(c.name)}</h3><p class="comp">${esc(comp)}</p><p class="desc">${esc(c.desc)}</p>
  <div class="meter" title="Kampfwert"><span>Ihr ${c.ownKW}</span><i><i style="width:${cl(50*c.enemyKW/Math.max(1,c.ownKW),4,100)}%"></i></i><span>Gegner ${c.enemyKW}</span></div>
  <div class="gold"><span class="win"><small>SIEG</small><b>${c.gold.win}</b></span><span class="loss"><small>NIEDERLAGE bis</small><b>${c.gold.lossMax}</b></span></div>${special?`<button class="an-accept" data-a="chall:${c.id}">⚔ HERAUSFORDERUNG ANNEHMEN</button>`:''}</div></${special?'div':'button'}>`;}
function summary(enemy){const n={human:0,rooster:0,lion:0};for(const u of enemy)n[u.kind]++;const p=[];if(n.human)p.push(n.human+(n.human===1?' Gladiator':' Gladiatoren'));if(n.lion)p.push(n.lion+(n.lion===1?' Löwe':' Löwen'));if(n.rooster)p.push(n.rooster+(n.rooster===1?' Hahn':' Hähne'));return p.join(' · ');}

// ---------- 4 · Gegnerpräsentation ----------
function present(c){U.sel=c;stopSpy();if(C.present?.(c,()=>{root.hidden=false;prep(c);})){layer.innerHTML='';root.hidden=true;return;}const ownE=CH.teamE(team());const list=c.enemy.slice(0,8);let i=-1,timer=0;
 layer.innerHTML=`<div class="an-pres" role="dialog" aria-label="Gegnerpräsentation"><div class="an-pstage"><canvas width="320" height="200" class="px"></canvas><div class="an-pcap"></div></div><div class="an-pdots">${list.map(()=>'<i></i>').join('')}</div><div class="an-pbtns"><button data-a="pskip">Überspringen</button><button class="gold" data-a="pnext">Weiter ▸</button></div></div>`;
 const cv=layer.querySelector('canvas'),cap=layer.querySelector('.an-pcap'),dots=layer.querySelectorAll('.an-pdots i');let t0=0,cur=null,fig=null;
 const next=()=>{i++;clearTimeout(timer);if(i>=list.length){U.pres=null;layer.innerHTML='';prep(c);return;}cur=list[i];t0=performance.now()/1000;fig=cur.kind==='human'?ART.figure(cur.g,true):null;dots.forEach((d,k)=>d.className=k<i?'done':k===i?'on':'');
  const u=cur,info=u.kind==='human'?humanInfo(u.g):u.kind==='rooster'?roosterInfo(u.R):lionInfo(u.L);
  cap.innerHTML=`<p class="eyebrow">${i===0?'IN DER ROTEN ECKE':'UND AN SEINER SEITE'}</p><h2>${esc(name(u))}</h2><p class="cls">${esc(info.cls)} · KW ${CH.kw(u)}</p>${u.kind==='lion'?'':(window.MG?.buyOdds?.mini(u.kind,u.kind==='human'?u.g:u.R)||'')}<ul>${info.rows.map(r=>`<li><span>${esc(r[0])}</span><b>${esc(r[1])}</b></li>`).join('')}</ul><p class="threat">„${esc(CH.threat(u,ownE))}“</p>`;cap.classList.remove('in');void cap.offsetWidth;cap.classList.add('in');
  timer=setTimeout(()=>{if(U.pres)next();},5200);};
 U.pres={next,skip:()=>{clearTimeout(timer);U.pres=null;layer.innerHTML='';prep(c);}};
 anim(cv,(ctx,t)=>{if(!cur)return;const k=t-(t0-(performance.now()/1000-t))||0,lt=performance.now()/1000-t0;ctx.imageSmoothingEnabled=false;
  if(cur.kind==='human'){ART.face(ctx,cur.g,{t:lt,mood:CH.strength(cur)/Math.max(.05,ownE/Math.max(1,team().length))>1.15?'grin':CH.kw(cur)<26?'dumb':'determined',team:1});
   // Figur fährt von rechts ins Bild
   const inx=Math.min(1,lt/.6),x=330-inx*80;ctx.drawImage(fig,0,0,240,300,Math.round(x-60),70,120,150);}
  else{ART.arena(ctx,320,200,t,{night:1,cheer:1});ctx.fillStyle='rgba(10,6,4,.45)';ctx.fillRect(0,0,320,200);
   // Gitter hebt sich (wie beim Löwenkampf)
   const gate=Math.min(1,lt/1.1);
   if(cur.kind==='lion'){const zoom=1.25+Math.min(.5,lt*.12);ART.lion(ctx,cur.L,{t,mood:lt>1.2?'proud':'focus',x:170,y:196,scale:zoom,face:-1});}
   else ART.rooster(ctx,cur.R,{t,mood:lt>.9?'proud':'focus',w:320,h:200,size:150,x:160,y:196,view:lt<2.4?'front':'side',face:-1});
   ctx.fillStyle='#1d140e';for(let gx=0;gx<320;gx+=16){ctx.fillRect(gx,-200*gate,4,200);}ctx.fillRect(0,-200*gate+190,320,6);}
  ctx.fillStyle='rgba(0,0,0,.0)';});
 next();}
function gearList(g){const out=[];for(const s of ['weapon','secondary','shield']){try{const it=M.gear(g,s);if(it)out.push(M.itemName(it));}catch{}}try{const a=M.armorItems(g);if(a.length)out.push(a.length>=6?'Volle Rüstung':a.map(i=>M.itemName(i)).join(', '));}catch{}return out.join(' · ')||'Nackte Fäuste';}
function humanInfo(g){const top=Object.entries(g.stats).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k])=>({strength:'Stärke',stamina:'Ausdauer',condition:'Kondition',agility:'Beweglichkeit',dexterity:'Geschick',reflex:'Reflexe',precision:'Präzision',block:'Blocken',balance:'Gleichgewicht',toughness:'Härte',pain:'Schmerz',will:'Wille',aggression:'Aggression',tactics:'Taktik',teamwork:'Teamarbeit',experience:'Erfahrung',morale:'Moral'})[k]||k);
 return {cls:g.role+' · '+g.age+' Jahre · '+g.height+' cm',rows:[['Ausrüstung',gearList(g)],['Auffällig',[...(g.traits||[]),...top].slice(0,3).join(', ')||'–'],['Bilanz',(g.wins||0)+' Siege · '+(g.kills||0)+' Tote']]};}
function roosterInfo(R){const best=Object.entries(R.stats).sort((a,b)=>b[1]-a[1])[0][0];return {cls:'Kampfhahn · '+R.quality.title,rows:[['Körper',R.height+' cm · '+R.weight.toFixed(1).replace('.',',')+' kg'],['Stärkste Seite',({groesse:'Größe',kraft:'Kraft',schnabelkraft:'Schnabelkraft',klauenstaerke:'Klauenstärke',geschwindigkeit:'Geschwindigkeit',zaehigkeit:'Zähigkeit'})[best]],['Angriffe','Picken '+R.moves.peck+' · Krallen '+R.moves.claw]]};}
function lionInfo(L){const c=L.condition,s=L.stats;return {cls:'Löwe · '+L.epithet,rows:[['Zustand',(c.health<70?'verletzt':c.hunger>60?'ausgehungert':'kräftig')+' · Gesundheit '+c.health+' %'+(c.rear<70?' · lahmt':'')],['Werte','Kraft '+s.kraft+' · Tempo '+s.tempo+' · Zähigkeit '+s.zaeh],['Ruf',(L.kills||0)+' Menschen getötet · '+L.ageYears+' Jahre']]};}

// ---------- 5 · Kampfvorbereitung (eine Seite: Gegner, Gruppe, Spionage, Start) ----------
function prep(c){U.sel=c;const units=team();
 layer.innerHTML=`<div class="an-sheet" role="dialog" aria-label="Kampfvorbereitung"><div class="an-sheetbox"><header><button class="an-x" data-a="close" aria-label="Schließen">✕</button><p class="eyebrow" style="color:${c.level.color}">${c.level.label.toUpperCase()} ${'☠'.repeat(c.level.skulls)}</p><h2>${esc(c.name)}</h2><p class="desc">${esc(c.desc)}</p></header>
  <div class="an-vs"><div class="side"><p>IHR · KW ${c.ownKW}</p><div class="row">${units.map(u=>`<span data-k="${u.key}"></span>`).join('')}</div></div><b>VS</b><div class="side red"><p>GEGNER · KW ${c.enemyKW}</p><div class="row">${c.enemy.map(u=>`<span data-e="${u.key}"></span>`).join('')}</div></div></div>
  <div class="an-gold2"><span><small>Siegprämie</small><b>${c.gold.win} Gold</b></span><span><small>Antrittsgeld bei Niederlage</small><b>bis ${c.gold.lossMax} Gold</b></span></div>
   <button class="an-spybtn" data-a="spy"><span class="eye">👁</span><span><b>SPIONAGE</b><small id="anSpyLine">Antippen startet die Probekämpfe</small></span><i class="bar"><i id="anSpyBar"></i></i></button>
  <div class="an-actions"><button data-a="equipbest">⚙ AUTOMATISCH AUSRÜSTEN</button><button data-a="present">Vorstellung ansehen</button><button class="primary" data-a="fight">⚔ KAMPF BEGINNEN</button></div></div></div>`;
 layer.querySelectorAll('[data-k]').forEach(el=>{const u=units.find(x=>x.key===el.dataset.k);el.appendChild(unitThumb(u,48,56));});
 layer.querySelectorAll('[data-e]').forEach(el=>{const u=c.enemy.find(x=>x.key===el.dataset.e);el.appendChild(unitThumb(u,48,56));});
 spyLine();}

// ---------- 6 · Spionage: 100 Probekämpfe in Workern, mit dem Kampfsystem der Arena ----------
const SPY={workers:[],ready:0,job:0,res:null,want:100,failed:''};
function workerSource(){const env=document.getElementById('w-env')?.textContent||'',main=document.getElementById('w-main')?.textContent||'';const parts=[...document.querySelectorAll('script[data-w]')].map(s=>s.textContent);return env+'\n;\n'+parts.join('\n;\n')+'\n;\n'+main;}
function pool0(){if(SPY.workers.length||SPY.failed)return;try{const url=window.ARENA_WORKER_URL||URL.createObjectURL(new Blob([workerSource()],{type:'text/javascript'}));const n=1;
 setTimeout(()=>{if(!SPY.failed&&SPY.workers.length&&!SPY.ready){SPY.failed='Die Spione melden sich nicht (Web Worker blockiert?). Bitte die Seite über einen Webserver öffnen.';spyLine();}},45000);for(let i=0;i<n;i++){const w=new Worker(url);w.onmessage=e=>onWorker(w,e.data);w.onerror=e=>{console.error('Spionage-Worker',e.message);SPY.failed='Spionage konnte nicht starten ('+(e.message||'Worker')+').';spyLine();};SPY.workers.push(w);}}catch(e){SPY.failed='Spionage braucht Web Worker: '+e.message;}}
function onWorker(w,d){if(d.ready){w.ready=true;SPY.ready++;const r=SPY.res;if(r&&!r.done&&r.job)send(w,r.job);spyLine();return;}
 const r=SPY.res;if(!r||d.id!==r.id)return;if(d.error){console.error(d.error);SPY.failed='Fehler in einem Probekampf.';return;}
 if(d.out){if(r.n>=SPY.want)return;r.n++;const o=d.out;if(o.w===0)r.win++;if(o.w===-1)r.draw++;r.time+=o.t;for(const u of o.u){const a=r.u[u.k]??={n:0,d:0,s:0,i:0,h:0};a.n++;a.d+=u.d;a.s+=u.s;a.i+=u.i;a.h+=u.h;}if(r.n>=SPY.want){for(const w of SPY.workers)w.postMessage({cmd:'stop'});r.done=true;}throttle();}}
let thr=0;function throttle(){if(thr)return;thr=setTimeout(()=>{thr=0;spyLine();if(layer.querySelector('.an-spy'))spyPaint();},250);}
// Für die Spione: Ausrüstung aus dem Lager direkt an die Kopie hängen (der Worker kennt das Lager nicht)
function gearCopy(g){const j=x=>x==null?null:JSON.parse(JSON.stringify(x));const c=j(g);if(!g.enemyGear){let a=[];try{a=M.armorItems(g);}catch{}c.enemyGear={weapon:j(M.gear(g,'weapon')),secondary:j(M.gear(g,'secondary')),shield:j(M.gear(g,'shield')),armor:Object.fromEntries(a.map(i=>[i.def,j(i)]))};}return c;}
function specFor(c,copy){const j=x=>copy?JSON.parse(JSON.stringify(x)):x;const m=u=>({kind:u.kind,key:u.key,row:u.row||'front',...(u.kind==='human'?{g:copy?gearCopy(u.g):u.g}:u.kind==='rooster'?{R:j(u.R)}:{L:j(u.L)})});return {title:c.name,blue:team().map(m),red:c.enemy.map(m)};}
function startSpy(c){SPY.want=team().length>=10?10:100;pool0();const spec=specFor(c,true),key=c.id+'|'+spec.blue.map(u=>u.key+u.row).join(',');if(SPY.res?.key===key)return;stopSpy();
 SPY.res={id:++SPY.job,key,c,n:0,win:0,draw:0,time:0,u:{},rows:Object.fromEntries(spec.blue.map(u=>[u.key,u.row])),started:performance.now()};
 const job={id:SPY.res.id,spec};SPY.res.job=job;if(SPY.failed)return;for(const w of SPY.workers)if(w.ready)send(w,job);}
// Jeder bereite Spion rechnet mit; wer später fertig geladen ist, steigt in den laufenden Auftrag ein
function send(w,job){w.postMessage({cmd:'run',id:job.id,spec:job.spec,n:SPY.want});}
function stopSpy(){for(const w of SPY.workers)w.postMessage({cmd:'stop'});SPY.res=null;}
function spyLine(){const el=document.getElementById('anSpyLine'),bar=document.getElementById('anSpyBar');if(!el)return;const r=SPY.res;
 if(SPY.failed){el.textContent=SPY.failed;return;}if(!r){el.textContent='Antippen startet die Probekämpfe';return;}if(!SPY.ready){el.textContent='Die Spione werden vorbereitet …';return;}bar.style.width=(r.n/SPY.want*100)+'%';
 el.textContent=r.n<8?'Die Spione beobachten Probekämpfe … '+r.n+'/'+SPY.want:(r.done?'':'Vorläufig · ')+'Siegchance '+pct(r.win/r.n)+' · '+r.n+'/'+SPY.want+' Kämpfe';}
function moodOf(surv){return surv<.5?'fear':surv<.82?'focus':'proud';}
function faceMood(surv){return surv<.3?'terror':surv<.5?'scared':surv<.65?'nervous':surv<.82?'determined':surv<.93?'confident':'roar';}
function spy(){const c=U.sel;if(!c)return;startSpy(c);
 layer.insertAdjacentHTML('beforeend',`<div class="an-spy" role="dialog" aria-label="Spionage"><div class="an-spybox"><header><button class="an-x" data-a="spyclose" aria-label="Zurück">◂</button><div><p class="eyebrow">SPIONAGE · ${esc(c.name)}</p><h2 id="anWin">…</h2><p id="anDanger" class="danger"></p></div></header>
  <div class="an-prog"><i id="anProg"></i><span id="anProgT"></span></div>
  <section class="an-form"><header><p class="eyebrow">Aufstellung</p><div class="an-toggle"><button data-a="rows:auto" class="${U.rowsAuto?'on':''}">AUTO</button><button data-a="rows:hand" class="${U.rowsAuto?'':'on'}">VON HAND</button></div></header>
   <div class="an-field"><div class="lane front"><small>1. REIHE · vorne, kämpft zuerst</small><div class="slots" data-row="front"></div></div><div class="lane back"><small>2. REIHE · greift später ein</small><div class="slots" data-row="back"></div></div><div class="foe">GEGNER ▸</div></div>
   <p class="an-hint">Antippen wechselt die Reihe. Danach rechnen die Spione sofort 100 neue Kämpfe.</p></section>
  <div class="an-fighters"></div>
  <details class="an-enemyodds"><summary>Gegner im Probekampf</summary><div class="list"></div></details>
  <div class="an-actions"><button data-a="spyclose">Zurück</button><button data-a="equipbest">⚙ AUTOMATISCH AUSRÜSTEN</button><button class="primary" data-a="fight">⚔ KAMPF BEGINNEN</button></div></div></div>`);
 spyBuild();}
function spyBuild(){const box=layer.querySelector('.an-spy');if(!box)return;const units=team(),r=SPY.res;
 for(const row of ['front','back']){const el=box.querySelector(`.slots[data-row="${row}"]`);el.innerHTML='';for(const u of units.filter(u=>u.row===row)){const b=document.createElement('button');b.className='tok';b.dataset.a='row:'+u.key;b.title=name(u);b.appendChild(unitThumb(u,40,46));const s=document.createElement('span');s.textContent=name(u).split(' ')[0];b.appendChild(s);el.appendChild(b);}}
 const fl=box.querySelector('.an-fighters');fl.innerHTML='';
 for(const u of units){const d=document.createElement('div');d.className='an-fcard';d.dataset.key=u.key;d.innerHTML=`<div class="pic"><canvas class="px" width="${u.kind==='human'?160:150}" height="${u.kind==='human'?104:100}"></canvas><span class="state"></span></div><div class="txt"><b>${esc(name(u))}</b><small>${esc(roleOf(u))} · ${u.row==='front'?'1. Reihe':'2. Reihe'}</small>
  <div class="odds"><span class="surv"><small>Überleben</small><b>–</b></span><span class="inj"><small>Verletzung</small><b>–</b></span><span class="sev"><small>Schwer verletzt</small><b>–</b></span></div><button class="rowbtn" data-a="row:${u.key}">${u.row==='front'?'→ in die 2. Reihe':'→ in die 1. Reihe'}</button></div>`;fl.appendChild(d);
  const cv=d.querySelector('canvas'),fig=u.kind==='human'?ART.figure(u.g,true):null;
  anim(cv,(ctx,t)=>{const a=SPY.res?.u[u.key],surv=a&&a.n>=5?1-a.d/a.n:null,m=surv==null?'focus':moodOf(surv);d.dataset.mood=surv==null?'':m;
   if(u.kind==='human'){ART.face(ctx,u.g,{t,mood:surv==null?'calm':faceMood(surv),team:0,yaw:Math.sin(t*.5)*.6+(m==='fear'?Math.sin(t*7)*.15:0)});}
   else{ctx.imageSmoothingEnabled=false;ART.arena(ctx,150,100,t,{});ctx.fillStyle='rgba(10,6,4,.35)';ctx.fillRect(0,0,150,100);if(u.kind==='rooster')ART.rooster(ctx,u.R,{t,mood:m,w:150,h:100,size:62,x:75,y:96,seed:3});else ART.lion(ctx,u.L,{t,mood:m,x:80,y:98,scale:.66,face:-1});}});}
 spyPaint();}
function spyPaint(){const box=layer.querySelector('.an-spy');if(!box)return;const r=SPY.res,c=U.sel;
 const prog=box.querySelector('#anProg'),pt=box.querySelector('#anProgT');if(r){prog.style.width=(r.n/SPY.want*100)+'%';pt.textContent=r.done?r.n+' Probekämpfe ausgewertet · Ø '+Math.round(r.time/Math.max(1,r.n))+' s Kampfdauer':'Probekampf '+r.n+' von '+SPY.want+' …';}
 const win=box.querySelector('#anWin'),dg=box.querySelector('#anDanger');
 if(!r||r.n<5){win.textContent='Die Spione beobachten …';dg.textContent='';}else{const p=r.win/r.n;win.innerHTML=`Siegchance <b style="color:${p>.7?'#88baa6':p>.4?'#dfb66d':'#d57668'}">${pct(p)}</b>`;
  const units=team(),dr=units.reduce((n,u)=>n+(r.u[u.key]?r.u[u.key].d/r.u[u.key].n:0),0)/Math.max(1,units.length);dg.textContent='Gefährlichkeit: '+(dr<.03?'gering':dr<.1?'spürbar':dr<.25?'hoch':'tödlich')+' · erwartete Tote: '+(dr*units.length).toFixed(1).replace('.',',')+' von '+units.length;dg.className='danger d'+(dr<.03?0:dr<.1?1:dr<.25?2:3);}
 box.querySelectorAll('.an-fcard').forEach(d=>{const a=r?.u[d.dataset.key];if(!a||a.n<5)return;const s=1-a.d/a.n;d.querySelector('.surv b').textContent=pct(s);d.querySelector('.inj b').textContent=pct(a.i/a.n);d.querySelector('.sev b').textContent=pct(a.s/a.n);d.querySelector('.state').textContent=s<.5?'hat Angst':s<.82?'konzentriert':'siegessicher';d.classList.toggle('low',s<.5);d.classList.toggle('high',s>=.82);});
 const el=box.querySelector('.an-enemyodds .list');if(el&&r&&r.n>=5)el.innerHTML=c.enemy.map(u=>{const a=r.u[u.key];return a?`<p><b>${esc(name(u))}</b> überlebt ${pct(1-a.d/a.n)} · schwer verletzt ${pct(a.s/a.n)}</p>`:'';}).join('');}
let reTimer=0;function rowsChanged(){spyBuild();clearTimeout(reTimer);reTimer=setTimeout(()=>{if(U.sel)startSpy(U.sel);spyBuild();},350);}

// ---------- 7 · Echter Kampf in der Kampfansicht des Spiels ----------
function fight(){const c=U.sel;if(!c)return;const units=team();if(!units.length){M.ui.notify?.('Niemand einsatzbereit.');return;}stopSpy();
 const before={};for(const u of units)if(u.kind==='rooster')before[u.key]={stats:{...u.R.stats},moves:{...u.R.moves}};
 const spec={title:c.name,blue:units.map(u=>({...u})),red:c.enemy};layer.innerHTML='';root.hidden=true;document.body.classList.add('an-fighting');
 // Gastgeber kann den Kampf selbst austragen (z. B. Hahn gegen Hahn auf dem Dorfplatz); Ergebnis im Format von AN.outcome
 if(C.runFight?.(spec,c,out=>{const pay=CH.payout(c,out);try{C.settle?.(pay,out,c,true);}catch(e){console.error(e);}setTimeout(()=>finishFight(c,out,units,pay,before),300);}))return;
 S.battle=null;try{M.ui.click('nav:home');}catch(e){console.warn(e);}
 H.resetScene();M.stains=[];M.limbs=[];M.swings=[];M.floaters=[];M.shake=0;for(const p of [...(M.fx||[]),...(M.shots||[])])p.active=false;
 spec.league=S.fightLeague??S.league??0;const b=AN.build(spec);b.challenge=c.id;b.league=Math.max(0,Math.min(6,spec.league|0));S.battle=b;
 AN.listeners.push((out)=>{const pay=CH.payout(c,out);try{C.settle?.(pay,out,c);}catch(e){console.error(e);}setTimeout(()=>finishFight(c,out,units,pay,before),900);});
 M.ui.render();}
// Fortschritt der Hähne: welche Werte der Kampf tatsächlich verbessert hat (Lernen nach dem Abstand IST → SOLL)
const GAIN_LABEL={groesse:'Größe',kraft:'Kraft',schnabelkraft:'Schnabelkraft',klauenstaerke:'Klauenstärke',geschwindigkeit:'Geschwindigkeit',zaehigkeit:'Zähigkeit',peck:'Picken',claw:'Krallen'};
function gainsOf(units,before){const out=[];for(const u of units){const b=before?.[u.key];if(!b||u.R.dead)continue;const list=[];for(const grp of ['stats','moves'])for(const k in b[grp]){const from=b[grp][k],to=u.R[grp][k];if(to-from>=.05)list.push({grp,key:k,label:(C.gainLabels||GAIN_LABEL)[k]||k,from,to,cap:u.R.caps[grp][k]});}list.sort((a,b)=>(b.to-b.from)-(a.to-a.from));out.push({key:u.key,R:u.R,name:u.R.name,list});}return out;}
const f1=v=>(Math.round(v*10)/10).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1});
function finishFight(c,out,units,gold,before){const won=out.winner===0;C.record?.(won);
 const mine=out.units.filter(u=>u.team===0),foes=out.units.filter(u=>u.team===1);for(const u of mine)if(u.dead)C.addFallen?.({name:u.name,kind:u.kind,cause:u.cause,killer:u.killer,day:S.day,fight:c.name});
 U.result={c,out,won,gold,mine,foes,units,gains:gainsOf(units,before)};U.chall=null;ART.clearFigures();
 setTimeout(()=>{S.battle=null;try{M.ui.render();}catch{}document.body.classList.remove('an-fighting');root.hidden=false;go('result');},300);}
// Hauptmenü-Knopf im Kampf: als Aufgeben werten (kein Verlassen mitten im Kampf)
document.addEventListener('click',e=>{const el=e.target.closest?.('[data-action]');if(!el||!S.battle?.neu)return;if(el.dataset.action==='profilemenu'){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(!S.battle.finale)M.surrender();}},true);

// ---------- 8 · Ergebnis ----------
function result(){const R=U.result;if(!R){go('home');return;}setTitle(R.won?'SIEG':'NIEDERLAGE',true);
 const row=u=>`<li class="${u.dead?'dead':u.severe?'sev':''}"><span class="th" data-k="${u.key}"></span><div><b>${esc(u.name)}</b><small>${u.dead?'✝ '+esc(u.cause||'gefallen')+(u.killer?' · durch '+esc(u.killer):''):u.down?'am Boden · Gesundheit '+u.health+' %':'Gesundheit '+u.health+' %'}${u.injuries?.length?' · '+esc(u.injuries.join(', ')):''}</small></div></li>`;
 const alive=R.mine.filter(u=>!u.dead),dead=R.mine.filter(u=>u.dead);
 view.innerHTML=`<section class="an-res ${R.won?'won':'lost'}"><p class="eyebrow">${esc(R.c.name)} · ${R.c.level.label}${R.out.timeout?' · nach Zeit gewertet':''}</p><h1>${R.won?'SIEG':'NIEDERLAGE'}</h1>
  <div class="an-pay"><small>${R.won?'Siegprämie':'Antrittsgeld'}</small><b data-count="${R.gold}">0</b><span>Gold</span></div>
  <div class="an-cols"><div><h3>Überlebende (${alive.length})</h3><ul>${alive.map(row).join('')||'<li class="none">Niemand.</li>'}</ul></div><div><h3>Gefallen (${dead.length})</h3><ul>${dead.map(row).join('')||'<li class="none">Alle leben. Die Totengräber sind enttäuscht.</li>'}</ul></div></div>
  ${R.gains.length?`<div class="an-gains"><h3>Fortschritt durch den Kampf</h3>${R.gains.map(g=>`<div class="an-gain"><b>${esc(g.name)}</b>${g.list.length?`<ul>${g.list.slice(0,5).map(x=>`<li><span>${esc(x.label)}</span><b>${f1(x.from)} → ${f1(x.to)}</b><small>SOLL ${Math.round(x.cap)}</small></li>`).join('')}</ul>`:'<p>Keine messbare Verbesserung in diesem Kampf.</p>'}</div>`).join('')}</div>`:''}
  <p class="an-foes">Gegner: ${R.foes.filter(u=>u.dead).length} tot · ${R.foes.filter(u=>!u.dead&&u.down).length} am Boden · ${R.foes.filter(u=>!u.dead&&!u.down).length} stehend · Dauer ${Math.round(R.out.time)} s</p>
  <div class="an-actions"><button data-a="nextday">Nächster Tag (Heilung)</button><button class="primary" data-a="again">NEUE HERAUSFORDERUNGEN ▸</button></div>${C.close?'<div class="an-actions"><button data-a="leave">◂ Arena verlassen</button></div>':''}</section>`;
 const units=pool().map(withKey);view.querySelectorAll('.th[data-k]').forEach(el=>{const u=R.units.find(x=>x.key===el.dataset.k)||units.find(x=>x.key===el.dataset.k);if(u)el.appendChild(unitThumb(u,40,46));});
 const n=view.querySelector('[data-count]'),goal=+n.dataset.count,st=performance.now();(function tick(){const k=Math.min(1,(performance.now()-st)/900);n.textContent=Math.round(goal*k*(2-k));if(k<1)requestAnimationFrame(tick);})();
 try{C.onResult?.(R);}catch(e){console.error(e);}}

// ---------- Eingaben ----------
root.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(!el)return;const [a,v]=el.dataset.a.split(/:(.*)/s);
 switch(a){
  case 'back':if(layer.innerHTML){stopSpy();layer.innerHTML='';U.pres=null;return;}if(U.screen==='home'){C.close?.();break;}if(U.screen==='hub')go(U.mode==='beast'?'beast':C.boxMenu?'kinds':'home',-1);else if(U.screens[U.screen]?.back){U.screens[U.screen].back(go);}else go(U.screen==='kinds'||!U.screens[U.screen]?'home':'kinds',-1);break;
  case 'mode':U.mode=v;if(v==='human'){U.species=null;U.size=3;U.picked=[];U.chall=null;if(C.boxMenu)go('kinds');else go('hub');}else go('beast');break;
  case 'kind':if(v==='box'){U.mode='human';go('box');}else{U.mode='human';U.species=null;U.size=3;U.picked=[];U.chall=null;go('hub');}break;
  case 'kindlock':M.ui?.notify?.(C.boxMenu?.()?.msg||'Boxkämpfe sind noch gesperrt.');break;
  case 'classic':C.classic?.();break;
  case 'species':if(!(v==='loewe'?C.lions:C.roosters).some(x=>!x.dead)){el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');M.ui?.notify?.(v==='loewe'?'Du besitzt noch keinen Löwen. Der Tierhändler kommt später.':'Du besitzt noch keine Hähne. Der Tierhändler kommt später.');break;}U.mode='beast';U.species=v;U.size=v==='loewe'?1:3;U.picked=[];U.chall=null;go('hub');break;
  case 'locked':el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');break;
  case 'lockedmsg':el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');M.ui?.notify?.(lockMsg(v));break;
  case 'auto':{const cur=team().map(u=>u.key);U.auto=v==='1';if(!U.auto&&!U.picked.length)U.picked=cur;render();break;}
  case 'size':U.size=+v;render();break;
  case 'pick':{const i=U.picked.indexOf(v);if(i>=0)U.picked.splice(i,1);else{U.picked.push(v);if(U.picked.length>U.size)U.picked.shift();}render();break;}
  case 'unfit':M.ui?.notify?.('Zu schwer verletzt. Ein paar Tage Ruhe helfen.');break;
  case 'reroll':ensureChallenges(team(),true);render();break;
  case 'more':U.more=!U.more;render();break;
  case 'chall':{const c=allChall().find(x=>x.id===v);if(c)present(c);break;}
  case 'pnext':U.pres?.next();break;
  case 'pskip':U.pres?.skip();break;
  case 'close':stopSpy();layer.innerHTML='';break;
  case 'present':present(U.sel);break;
  case 'equipbest':{const gs=team().filter(u=>u.kind==='human').map(u=>u.g);if(!gs.length){M.ui?.notify?.('Keine Gladiatoren in der Gruppe, die Ausrüstung brauchen.');break;}M.ui?.notify?.(M.army.autoEquip(gs,'soll'));if(layer.querySelector('.an-spy')){spyBuild?.();}else prep(U.sel);break;}
  case 'spy':spy();break;
   case 'spyclose':stopSpy();layer.querySelector('.an-spy')?.remove();prep(U.sel);break;
  case 'rows':U.rowsAuto=v==='auto';if(!U.rowsAuto){for(const u of team())U.rows[u.key]=u.row;}rowsChanged();break;
  case 'row':{const units=team(),u=units.find(x=>x.key===v);if(!u)break;if(U.rowsAuto){U.rowsAuto=false;for(const x of units)U.rows[x.key]=x.row;}U.rows[v]=u.row==='front'?'back':'front';
   if(!units.some(x=>U.rows[x.key]==='front')){U.rows[v]='front';M.ui?.notify?.('Einer muss vorne stehen.');}
   layer.querySelectorAll('.an-toggle button').forEach(b=>b.classList.toggle('on',b.dataset.a==='rows:hand'));rowsChanged();break;}
  case 'fight':fight();break;
  case 'again':U.result=null;go('hub');break;
  case 'leave':U.result=null;U.screen='home';C.close?.();break;
  case 'nextday':C.nextDay(1);U.result=null;go('hub');break;
  case 'day':C.nextDay(1);render();break;
  case 'day7':C.nextDay(7);render();break;
  case 'gold':C.settle?.(500);render();break;
  case 'refill':C.refill();ART.clearFigures();render();break;}});
layer.addEventListener('click',e=>{if(e.target.closest('.an-pstage')&&U.pres)U.pres.next();});
root.addEventListener('click',e=>{if(e.target.closest('#anLayer [data-a]')){/* über root behandelt */}});
// „Held des Kampfes“ des Moderators kennt nur Menschen (Gesicht, Trophäe) – in Kämpfen mit Tieren auslassen
{const base=M.fixedStep;M.fixedStep=function(){const b=S.battle,f=b?.finale;if(!b?.neu||!f||!b.actors.some(a=>a.lion||a.hahn))return base.apply(this,arguments);const had=document.body.classList.contains('bhud');document.body.classList.remove('bhud');try{return base.apply(this,arguments);}finally{if(had)document.body.classList.add('bhud');}};}
if(C.startHidden)root.hidden=true;
U.prep=c=>{root.hidden=false;prep(c);};U.render=()=>render();U.go=go;
U.open=()=>{root.hidden=false;if(U.screen==='result'&&!U.result)U.screen='home';render();};U.close=()=>{root.hidden=true;stopSpy();for(const w of SPY.workers)w.terminate();SPY.workers=[];SPY.ready=0;ART.clearFigures();layer.innerHTML='';};U.isOpen=()=>!root.hidden;
render();
window.ARENA_UI_READY=true;
})();

