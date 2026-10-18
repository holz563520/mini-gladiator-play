'use strict';
// =====================================================================================================
// BOXKÄMPFE IM SPIEL · Anschluss von Faustkampf-Modell (box-engine.js), Kampfbild (box-art.js) und Ton (box-sfx.js) an das Hauptspiel
// · Menü: Arena → HUMAN → ARENAKÄMPFE | BOXKÄMPFE (Bildschirm „kinds“ in arena-ui.js, Boxbildschirme tragen sich über ArenaUI.screens ein).
// · 1 gegen 1, 15 Gegner von „Prügelknabe“ bis „Mörderisch“, Preisgeld nach Stärke des Gegners, danach Lernwerte (Boxwerte, Kraft, Ausdauer …).
// · Freigeschaltet nach dem Hühnerkampf; der Schmied erklärt die Boxkämpfe einmal in einer kleinen Szene (S.box.intro).
// · Neue Speicherwerte: S.box = {intro, fights, wins, lastDay, opts}; am Gladiator g.boxing, g.caps.boxing, g.teeth, g.boxRec.
//   Verletzungen aus dem Boxkampf (Prellungen, Platzwunde, Nasenbruch, Schädelbruch) werden in den echten Körper des Gladiators geschrieben
//   und heilen nach den üblichen Heilregeln. Ausgeschlagene Zähne bleiben als Lücke; Veteranen bekommen nach 10 Tagen einen Goldzahn.
// Entfernen: box-engine/box-art/box-sfx/box-game aus der Skriptliste in boot.js und box-game.css aus index.html streichen,
//   den Haken C.boxMenu in arena-ui.js (Bildschirm „kinds“) fällt dann von selbst weg.
// =====================================================================================================
(()=>{
const M=window.MG;if(!M||window.ARENA_NEU_TEST)return;
const BX=window.BX,BXA=window.BXA,BXS=window.BXS,U=window.ArenaUI,C=window.ArenaCareer;if(!BX||!BXA||!BXS||!U?.api||!C)return;
const A=U.api,esc=A.esc,cl=(v,a,b)=>v<a?a:v>b?b:v;
const S=()=>M.s;
const $=id=>document.getElementById(id);
const nf=(v,d=1)=>Number.isFinite(v)?v.toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d}):'–';
const BG=()=>S().box??={intro:false,fights:0,wins:0,lastDay:S().day,opts:{sound:true,intro:true,cuts:true}};
const opts=()=>BG().opts??={sound:true,intro:true,cuts:true};

// ---------- Freischaltung ----------
const chapterDone=()=>['end','free','won'].includes(S().huehner?.stage);
C.boxMenu=()=>BG().intro||chapterDone()?{ok:true}:{ok:false,msg:'Erst die Hühnerschule abschließen'};

// ---------- Gladiator für den Faustkampf vorbereiten (alte Spielstände: fehlende Werte ergänzen, nichts überschreiben) ----------
function prep(g){
 if(g.boxing&&g.caps?.boxing&&g.teeth&&g.boxRec&&g.moves?.backstep!=null&&g.caps?.moves?.backstep!=null)return g;
 const s=g.stats||{},m=Math.max(12,.6*((s.strength||20)+(s.dexterity||20)+(s.reflex||20))/3);
 BX.ensureBoxing(g,m);g.boxRec??={fights:0,wins:0};
 g.caps??={};g.caps.moves??={};g.caps.stats??={};
 const cap=v=>cl(Math.round(v*2+Math.random()*30),v,100);
 if(g.caps.moves.dodge==null)g.caps.moves.dodge=cap(g.moves.dodge||20);
 if(g.caps.moves.backstep==null)g.caps.moves.backstep=cap(g.moves.backstep||20);
 if(g.caps.stats.block==null)g.caps.stats.block=cap(s.block||20);
 return g;}
const fit=g=>{try{return M.army?.eligibility?M.army.eligibility(g):{ok:!g.dead,causes:[]};}catch{return {ok:!g.dead,causes:[]};}};
const roster=()=>S().roster.filter(g=>!g.dead&&!g.retired&&!(g.age<18));
// Gegner erzeugen, ohne den Zufallsstand des Spiels zu verändern
function mk(enemy=true){const s=S(),r=s.rng;try{s.rng=Math.floor(Math.random()*2147483646)+1;return M.makeGladiator(0,enemy);}finally{s.rng=r;}}

// ---------- Tage: Goldzähne der Veteranen ----------
function syncDays(){const b=BG(),d=S().day;if(b.lastDay==null)b.lastDay=d;if(d>b.lastDay){const n=d-b.lastDay;for(const g of S().roster)if(g.teeth?.pending?.length)BX.advanceDays(g,n);b.lastDay=d;try{M.persist();}catch{}}else if(d<b.lastDay)b.lastDay=d;}

// ---------- Preisgeld ----------
// Maßstab: ein frischer Rekrut. Preisgeld wächst mit der absoluten Stärke des Gegners und mit dem Risiko (Außenseiter bekommen mehr).
let REF=0;
function refRating(){if(REF)return REF;let t=0,n=40;for(let i=0;i<n;i++){const g=mk(false);prep(g);t+=BX.rating(g);}REF=Math.max(8,t/n);return REF;}
const G0=34;
function purse(own,opp,p){const Eo=Math.max(.12,BX.rating(opp)/refRating()),Ew=Math.max(.12,BX.rating(own)/refRating()),risk=.55+1.0*Math.pow(1-p,1.2);
 const win=Math.max(10,Math.round(G0*Math.pow(Eo,1.25)*risk/5)*5);
 const loss=Math.max(0,Math.round(Math.min(win*.2*(.6+.4*(1-p)),G0*Math.pow(Ew,1.1)*.3)/5)*5);
 return {win,loss};}

// ---------- Lernen ----------
// Jeder Kampf trainiert genau das, was getan wurde (BX.applyAftermath). Stärkere Gegner lehren mehr; ein Sieg zählt etwas mehr.
const learnMult=(ratio,won)=>cl(1.2+1.6*Math.min(ratio,2.2),1.5,4.6)*(won?1.15:1);

// ---------- Gegnerliste ----------
const B={sel:null,opps:null,key:'',rev:0,est:0,result:null,fight:null,pend:null};
function ownG(){const list=roster();let g=list.find(x=>x.id===B.sel);if(!g||!fit(g).ok){const ok=list.filter(x=>fit(x).ok);if(ok.length){g=[...ok].sort((a,b)=>BX.rating(prep(b))-BX.rating(prep(a)))[0];}else g=g&&list.includes(g)?g:list[0];B.sel=g?.id||null;}return g?prep(g):null;}
function buildOpps(own){const key=own.id+'|'+Math.round(BX.rating(own)*10)+'|'+B.rev;if(B.opps&&B.key===key)return B.opps;B.key=key;B.est++;
 B.opps=BX.LEVELS.map(L=>{const seed=Math.floor(Math.random()*1e9),g=BX.makeOpponent(own,L.n,seed,mk);g.enemy=true;return {L,g,seed,rating:BX.rating(g),win:null,skull:null,gold:null};});
 for(const o of B.opps){o.gold=purse(own,o.g,o.L.ratio<=1?Math.min(.97,.55+.45*(1-o.L.ratio)):Math.max(.03,.5-.38*(o.L.ratio-1)));}
 return B.opps;}
// Siegchance und Schädelbruch-Risiko aus Probekämpfen (ohne Nebenwirkungen), nach und nach, damit nichts ruckelt
function estimate(own,opps){const job=B.est,N=24;let i=0;
 function step(){if(job!==B.est||A.root.hidden||U.screen!=='box')return;const o=opps[i];if(!o)return;let w=0,sk=0,d=0;
  for(let k=0;k<N;k++){try{const f=BX.simulate(own,o.g,o.seed+k*7919+1);if(f.result.winner===0)w++;if(f.b[0].skull)sk++;if(f.b[0].dead)d++;}catch(e){}}
  o.win=w/N;o.skull=sk/N;o.dead=d/N;o.gold=purse(own,o.g,cl(o.win,.03,.97));paintCard(o,i);i++;if(i<opps.length)setTimeout(step,0);}
 setTimeout(step,30);}
const pc=v=>Math.round(v*100)+' %';
function riskText(o){if(o.win==null)return 'Probekämpfe laufen …';const r=[];r.push('Siegchance <b style="color:'+(o.win>.7?'#88baa6':o.win>.4?'#dfb66d':'#d57668')+'">'+pc(o.win)+'</b>');r.push(o.skull>=.02?'Schädelbruch '+pc(o.skull):'kaum Schädelbruchgefahr');return r.join(' · ');}

// ---------- Gesichter ----------
function face(cv,g,mood,team=0,w=160,h=104){cv.width=w;cv.height=h;const q=cv.getContext('2d');q.imageSmoothingEnabled=false;try{M.faceShot.paint(q,w,h,{g:withLost(g),mood,team,yaw:team?.25:-.25},0);}catch(e){q.fillStyle='#1d282b';q.fillRect(0,0,w,h);}}
function withLost(g){return g;}
const moodFor=L=>L.n<=3?'nervous':L.n<=6?'dumb':L.n<=9?'determined':L.n<=12?'grin':'roar';
let faceQ=[];function paintFaces(){const t=faceQ.splice(0,3);for(const f of t)f();if(faceQ.length)requestAnimationFrame(paintFaces);}

// ---------- Bildschirm: Boxkämpfe ----------
const SK=[['stats','dexterity','Geschick'],['stats','strength','Kraft'],['stats','stamina','Ausdauer'],['stats','reflex','Reflex'],['stats','toughness','Härte'],['boxing','gerade','Gerade'],['boxing','schwinger','Schwinger'],['boxing','uppercut','Uppercut'],['stats','block','Blocken'],['moves','dodge','Ausweichen']];
const val=(g,grp,k)=>g[grp]?.[k]??0;
function chipHtml(g){const ok=fit(g);return `<button class="an-card bx-fighter${B.sel===g.id?' on':''}${ok.ok?'':' unfit'}" data-a="${ok.ok?'bxpick:'+g.id:'bxunfit:'+g.id}"><span class="th"></span><b>${esc(g.name)}</b><small>${esc(g.role)} · KW ${nf(BX.rating(prep(g)),0)}</small>${ok.ok?'':'<em>'+esc((ok.causes||[]).slice(0,2).join(', ')||'nicht einsatzbereit')+'</em>'}</button>`;}
function boxScreen(){syncDays();A.setTitle('HUMAN · BOXKÄMPFE');const view=A.view,list=roster();
 if(!list.length){view.innerHTML='<section class="an-hero"><p class="eyebrow">Dein Kader ist leer</p></section>';return;}
 const own=ownG();if(!own){view.innerHTML='<section class="an-hero"><p class="eyebrow">Niemand ist einsatzbereit</p></section>';return;}
 const ok=fit(own).ok,opps=buildOpps(own),vet=BX.isVeteran(own),teeth=own.teeth||{missing:[],gold:[]};
 const bar=(g,grp,k,l)=>`<span>${l}</span><i class="bx-bar"><i style="width:${cl(val(g,grp,k),0,100)}%"></i></i><b>${nf(val(g,grp,k),0)}</b>`;
 view.innerHTML=`<section class="an-panel bx-me"><header><p class="eyebrow">Dein Boxer</p><button class="an-link" data-a="bxintro">▶ Erklärung vom Schmied</button></header>
  <div class="bx-mebox"><canvas class="bx-meface px"></canvas><div class="bx-meinfo"><h2>${esc(own.name)}</h2><p>${esc(own.role)} · ${own.age} Jahre · ${own.height} cm · ${own.weight} kg${vet?' · <b class="bx-vet">Veteran</b>':''}</p>
   <p class="bx-kw">Kampfwert <b>${nf(BX.rating(own),1)}</b> · Boxkämpfe ${own.boxRec?.fights||0} · Siege ${own.boxRec?.wins||0}</p>
   <p class="bx-teeth">Zähne ${teethHtml(teeth)}</p>${ok?'':'<p class="bx-warn">Nicht einsatzbereit: '+esc((fit(own).causes||[]).join(', '))+'</p>'}</div></div>
  <div class="bx-skills">${SK.map(([grp,k,l])=>bar(own,grp,k,l)).join('')}</div>
  <details class="bx-pick"><summary>Anderen Boxer wählen</summary><div class="an-roster">${list.map(chipHtml).join('')}</div></details></section>
  <section class="an-chall bx-chall"><header><p class="eyebrow">Gegner · 15 Stufen von total einfach bis extrem schwer</p><button class="an-link" data-a="bxreroll">↻ andere Gegner</button></header>
  <p class="an-hint">Immer 1 gegen 1, nackte Fäuste, höchstens 30 Sekunden. Je stärker der Gegner, desto höher das Preisgeld und desto mehr lernt dein Kämpfer.</p>
  <div class="bx-grid">${opps.map((o,i)=>cardHtml(o,i)).join('')}</div></section>`;
 face(view.querySelector('.bx-meface'),own,'determined',0,200,130);
 view.querySelectorAll('.bx-fighter .th').forEach(el=>{const g=list.find(x=>x.id===el.parentElement.dataset.a.split(':')[1]);if(g)el.appendChild(A.thumb({kind:'human',g},40,46));});
 faceQ=[];opps.forEach((o,i)=>faceQ.push(()=>{const cv=view.querySelector('[data-lv="'+i+'"] canvas');if(cv)face(cv,o.g,moodFor(o.L),1);}));paintFaces();
 estimate(own,opps);}
function teethHtml(T){let h='<span class="bx-tt">';for(let i=0;i<8;i++){const c=(T.missing||[]).includes(i)?'gap':(T.gold||[]).includes(i)?'gold':(T.pending||[]).some(p=>p.i===i)?'gap':'';h+=`<i class="${c}"></i>`;}return h+'</span>';}
function cardHtml(o,i){const L=o.L;return `<button class="an-ccard bx-card" data-lv="${i}" data-a="bxfight:${i}" style="--lv:${L.color}"><div class="art"><canvas class="px"></canvas></div><div class="body"><p class="tag"><span class="lvl">STUFE ${L.n}</span><span class="sk">${'☠'.repeat(Math.round(L.n/4))}</span></p><h3>${esc(L.label)}</h3><p class="comp">${esc(o.g.name)} · KW ${nf(o.rating,0)} · ${Math.round(L.ratio*100)} % deiner Stärke</p><p class="desc bx-risk">${riskText(o)}</p>
  <div class="gold"><span class="win"><small>SIEG</small><b>${o.gold.win}</b></span><span class="loss"><small>NIEDERLAGE bis</small><b>${o.gold.loss}</b></span></div></div></button>`;}
function paintCard(o,i){const el=A.view.querySelector('[data-lv="'+i+'"]');if(!el)return;el.querySelector('.bx-risk').innerHTML=riskText(o);el.querySelector('.win b').textContent=o.gold.win;el.querySelector('.loss b').textContent=o.gold.loss;}
A.root.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(!el)return;const [a,v]=el.dataset.a.split(/:(.*)/s);
 if(a==='bxpick'){B.sel=v;B.opps=null;B.rev++;A.render();}
 else if(a==='bxunfit'){M.ui?.notify?.('Dieser Kämpfer braucht erst Ruhe. Ein paar Tage helfen.');}
 else if(a==='bxreroll'){B.rev++;B.opps=null;A.render();}
 else if(a==='bxintro'){A.root.hidden=true;intro(()=>{A.root.hidden=false;});}
 else if(a==='bxfight'){sheet(+v);}
 else if(a==='bxclose'){A.layer.innerHTML='';}
 else if(a==='bxstart'){startFight();}
 else if(a==='bxagain'){B.opps=null;B.rev++;A.go('box',-1);}
 else if(a==='bxday'){C.nextDay(1);B.opps=null;B.rev++;A.go('box',-1);}
 else if(a==='bxleave'){B.result=null;U.screen='home';C.close?.();}
 else if(a==='bxopt'){const o=opts();o[v]=!o[v];if(B.pend)sheet(B.pend.i);try{M.persist();}catch{}}},true);
U.screens.box=boxScreen;boxScreen.back=go=>go('kinds',-1);

// ---------- Kampfvorbereitung ----------
function sheet(i){const own=ownG(),o=B.opps?.[i];if(!own||!o)return;if(!fit(own).ok){M.ui?.notify?.('Dieser Kämpfer ist nicht einsatzbereit.');return;}B.pend={i,o};const L=o.L,op=opts();
 const row=([grp,k,l])=>{const a=val(own,grp,k),b=val(o.g,grp,k);return `<div class="bx-cmp"><b class="${a>=b?'win':''}">${nf(a,0)}</b><i class="bx-bar l"><i style="width:${cl(a,0,100)}%"></i></i><span>${l}</span><i class="bx-bar r"><i style="width:${cl(b,0,100)}%"></i></i><b class="${b>a?'win':''}">${nf(b,0)}</b></div>`;};
 A.layer.innerHTML=`<div class="an-sheet" role="dialog" aria-label="Boxkampf vorbereiten"><div class="an-sheetbox"><header><button class="an-x" data-a="bxclose" aria-label="Schließen">✕</button><p class="eyebrow" style="color:${L.color}">STUFE ${L.n} · ${esc(L.label.toUpperCase())}</p><h2>Boxkampf gegen ${esc(o.g.name)}</h2><p class="desc">Nackte Fäuste, 1 gegen 1, höchstens 30 Sekunden. Wer am Boden liegt, hat verloren.</p></header>
  <div class="bx-vs"><div class="side"><canvas class="px" id="bxvA"></canvas><b>${esc(own.name)}</b><small>KW ${nf(BX.rating(own),1)}</small></div><b class="vs">VS</b><div class="side red"><canvas class="px" id="bxvB"></canvas><b>${esc(o.g.name)}</b><small>KW ${nf(o.rating,1)}</small></div></div>
  <div class="bx-cmps">${SK.map(row).join('')}</div>
  <div class="an-gold2"><span><small>Siegprämie</small><b>${o.gold.win} Gold</b></span><span><small>Antrittsgeld bei Niederlage</small><b>bis ${o.gold.loss} Gold</b></span></div>
  <p class="an-hint bx-risk2">${riskText(o)}</p>
  <div class="bx-opts"><button data-a="bxopt:intro" class="${op.intro?'on':''}">Drohgebärden ${op.intro?'an':'aus'}</button><button data-a="bxopt:cuts" class="${op.cuts?'on':''}">Nahaufnahmen ${op.cuts?'an':'aus'}</button><button data-a="bxopt:sound" class="${op.sound?'on':''}">Ton ${op.sound?'an':'aus'}</button></div>
  <div class="an-actions"><button data-a="bxclose">Zurück</button><button class="primary" data-a="bxstart">🥊 KAMPF BEGINNEN</button></div></div></div>`;
 face(A.layer.querySelector('#bxvA'),own,'determined',0,200,130);face(A.layer.querySelector('#bxvB'),o.g,moodFor(L),1,200,130);}

// ---------- Kampf im Vollbild ----------
let ov=null,scene=null,raf=0,fight=null,acc=0,lastT=0,speed=1,shown=false,overAt=0;
function startFight(){const own=ownG(),o=B.pend?.o;if(!own||!o)return;if(!fit(own).ok){M.ui?.notify?.('Dieser Kämpfer ist nicht einsatzbereit.');return;}
 A.layer.innerHTML='';A.root.hidden=true;document.body.classList.add('an-fighting');
 const before={};for(const [grp,k] of SK)before[grp+':'+k]=val(own,grp,k);
 B.fight={own,o,before,seed:Math.floor(Math.random()*1e9),i:B.pend.i};
 ov=document.createElement('div');ov.id='boxFight';ov.innerHTML='<canvas width="1280" height="720"></canvas><div class="bxf-ui"><button data-bxf="speed">⏩ 1×</button><button data-bxf="snd">'+(opts().sound?'🔊':'🔇')+'</button><button data-bxf="skip">Gesten überspringen ›</button></div><button class="bxf-next" data-bxf="next" hidden>ERGEBNIS ▸</button>';document.body.appendChild(ov);
 const cv=ov.querySelector('canvas');scene=new BXA.Scene(cv);fight=BX.createFight(own,o.g,B.fight.seed);scene.setFight(fight,[own.name,o.g.name]);
 scene.onIntroEnd=()=>{if(opts().sound)BXS.bell(1);};scene.showBars=false;scene.cutOff=!opts().cuts;if(!opts().intro)scene.intro=null;
 scene.arenaMini=[own,o.g].map(g=>{const c=document.createElement('canvas');try{M.renderTeamFigure(c,g,true);}catch(e){}return c;});
 const ra=BX.rating(own),rb=BX.rating(o.g),p=1/(1+Math.exp(-(ra-rb)/3.2)),q=x=>nf(Math.max(1.05,.92/x),2);scene.odds='Blau '+q(p)+' · Rot '+q(1-p);
 BXS.enable(false);if(opts().sound){try{if(BXS.unlock()){BXS.enable(true);}}catch(e){}}if(!scene.intro&&opts().sound)BXS.bell(1);
 acc=0;speed=1;shown=false;overAt=0;lastT=performance.now();
 ov.addEventListener('click',onOv);raf=requestAnimationFrame(loop);}
function onOv(e){const b=e.target.closest('[data-bxf]');if(!b)return;const a=b.dataset.bxf;
 if(a==='speed'){speed=speed===1?2:1;b.textContent='⏩ '+speed+'×';}
 else if(a==='snd'){const o=opts();o.sound=!o.sound;if(o.sound){try{if(BXS.unlock())BXS.enable(true);}catch{}}else BXS.enable(false);b.textContent=o.sound?'🔊':'🔇';}
 else if(a==='skip'){if(scene.intro){scene.intro=null;for(const x of fight.b)x.gest=null;scene.onIntroEnd?.();}}
 else if(a==='next'){finish();}}
function loop(t){if(!ov)return;const dt=Math.min(.05,(t-lastT)/1000);lastT=t;
 if(fight&&!document.hidden){acc+=scene.intro?0:dt*speed*(scene.cut?.12:fight.slow>0?.45:1);let n=0;while(acc>=1/60&&n<8){BX.step(fight,1/60);acc-=1/60;n++;}scene.consume(BXS);BXS.crowd(fight.cheer,!fight.over);
  if(fight.over&&!shown&&fight.t-fight.result.time>.8){shown=true;overAt=performance.now();ov.querySelector('.bxf-next').hidden=false;}
  if(shown&&performance.now()-overAt>(fight.b.some(b=>b.skull)?6500:4800))return finish();}
 scene.render(dt);raf=requestAnimationFrame(loop);}
function stopScene(){cancelAnimationFrame(raf);raf=0;try{BXS.crowd(0,false);BXS.enable(false);}catch{}ov?.remove();ov=null;scene=null;document.body.classList.remove('an-fighting');}

// ---------- Ende: Preisgeld, Lernen, Verletzungen, Zähne ----------
const BODY={Gesicht:'head',Kinn:'head',Wange:'head',Augenbraue:'head',Nase:'head',Kopf:'head',Mund:'head',Rumpf:'chest',Rippen:'chest'};
function hurt(p,hp,pain){p.hp=Math.max(4,p.hp-hp);p.pain=Math.max(p.pain||0,pain);p.grade=M.injuryGrade?.(p)??p.grade;}
function writeInjuries(g,b,foe){const out=[];
 for(const j of b.injuries){const id=BODY[j.part]||'head',p=g.body[id];if(!p||p.missing)continue;
  if(j.type==='Schädelbruch'){const u=45;p.fracture={days:u,total:u,severe:true,skull:true};p.skullFracture=true;p.hp=Math.min(p.hp,24);p.pain=Math.max(p.pain||0,90);p.bleed=Math.max(p.bleed||0,3);p.injury='Schädelbruch';p.grade=M.injuryGrade?.(p)??p.grade;try{M.noteInjury(g,'head','Schädelbruch',foe,'Faust');}catch{}out.push('Schädelbruch');}
  else if(j.type==='Nasenbruch'){hurt(p,7,45);p.injury='Nasenbruch';try{M.noteInjury(g,'head','Nasenbruch',foe,'Faust');}catch{}out.push('Nasenbruch');}
  else if(j.type==='Platzwunde'){hurt(p,3+j.sev*2,30);p.bleed=Math.max(p.bleed||0,1);try{M.noteInjury(g,'head','Platzwunde',foe,'Faust');}catch{}out.push('Platzwunde');}
  else if(j.type==='Rippenprellung'){hurt(p,4+j.sev*3,40);try{M.noteInjury(g,'chest','Rippenprellung',foe,'Faust');}catch{}out.push('Rippenprellung');}
  else if(j.type==='Prellung'){hurt(p,1.5+j.sev*1.8,12);out.push('Prellung');}}
 return out;}
function finish(){if(!ov||!B.fight)return;const F=B.fight,own=F.own,o=F.o,f=fight,R=f.result,won=R.winner===0;const dead=f.b[0].dead;
 stopScene();
 const mult=learnMult(o.L.ratio,won),b0=f.b[0],foe=o.g.name;
 const after=BX.applyAftermath(f,{apply:true,learn:(g,grp,key,amt)=>g===own?M.addLearning(g,grp,key,amt*mult):0});
 const gains=[];for(const [grp,k,l] of SK){const from=F.before[grp+':'+k],to=val(own,grp,k);if(to-from>=.005)gains.push({label:l,from,to});}
 // Verletzungen in den echten Körper
 const inj=writeInjuries(own,b0,foe);own.fatigue=Math.min(100,(own.fatigue||0)+14+Math.round(Math.min(30,f.t)/30*10));
 // Preisgeld
 const perf=R.points?cl(R.points[0]/Math.max(1,R.points[0]+R.points[1]),0,1):.5;
 const pay=won?o.gold.win:Math.round(o.gold.loss*(.35+.65*perf)/5)*5;
 const s=S();s.gold+=pay;if(s.stats)s.stats.earned=(s.stats.earned||0)+pay;
 own.boxRec??={fights:0,wins:0};own.boxRec.fights++;if(won)own.boxRec.wins++;const bg=BG();bg.fights++;if(won)bg.wins++;
 try{own.history.unshift({day:s.day,text:'Boxkampf gegen '+foe+' (Stufe '+o.L.n+'): '+(won?'Sieg':R.winner<0?'Unentschieden':'Niederlage')+' · '+R.how});own.history=own.history.slice(0,100);}catch{}
 let death=null;if(dead){death='Im Faustkampf gegen '+foe+' gestorben ('+(b0.skull?'Schädelbruch':'schwere Kopfverletzung')+')';try{M.kill(own,death,foe);}catch(e){console.warn(e);}}
 try{M.persist();}catch{}
 B.result={own,o,won,R,pay,gains,inj,teeth:b0.teethLost.length,vet:after[0]?.vet,dead,death,mult,time:f.t};B.fight=null;B.opps=null;B.rev++;fight=null;
 A.root.hidden=false;A.go('boxresult');}

// ---------- Bildschirm: Ergebnis ----------
function resultScreen(){const r=B.result;if(!r){A.go('box');return;}const g=r.own,L=r.o.L,R=r.R,head=r.won?'SIEG':R.winner<0?'UNENTSCHIEDEN':'NIEDERLAGE';A.setTitle('BOXKAMPF · '+head);
 const gain=r.gains.length?r.gains.map(x=>`<li><span>${esc(x.label)}</span><b>${nf(x.from,1)} → ${nf(x.to,1)}</b><small>+${nf(x.to-x.from,2)}</small></li>`).join(''):'<li class="none">Diesmal kein spürbarer Fortschritt (Obergrenze erreicht oder zu kurzer Kampf).</li>';
 A.view.innerHTML=`<section class="an-res bx-res ${r.won?'won':'lost'}"><p class="eyebrow">Stufe ${L.n} · ${esc(L.label)} · ${esc(r.o.g.name)}</p><h1>${head}</h1><p class="bx-how">${esc(R.how)} nach ${nf(R.time,0)} Sekunden · Punkte ${Math.round(R.points?.[0]||0)} : ${Math.round(R.points?.[1]||0)}</p>
  <div class="an-pay"><small>${r.won?'Siegprämie':'Antrittsgeld'}</small><b data-count="${r.pay}">0</b><span>Gold</span></div>
  <div class="bx-reshead"><canvas class="px" id="bxrA"></canvas><div><h2>${esc(g.name)}</h2>${r.dead?'<p class="bx-dead">✝ '+esc(r.death)+'</p>':''}<p>${r.inj.length?'Verletzungen: <b>'+esc([...new Set(r.inj)].join(', '))+'</b>':'Keine nennenswerten Verletzungen'}</p>
   <p>${r.teeth?'<b>'+r.teeth+' Zahn'+(r.teeth>1?'zähne':'')+' ausgeschlagen</b>'+(r.vet?' · als Veteran bekommt er nach '+BX.GOLD_DAYS+' Tagen einen Goldzahn':' · die Lücke bleibt'):'Alle Zähne noch da'}</p>${teethHtml(g.teeth||{})}</div></div>
  <div class="an-gains bx-gains"><h3>Fortschritt durch den Kampf <small>(Lernfaktor ×${nf(r.mult,2)} je nach Gegner)</small></h3><ul class="bx-gainlist">${gain}</ul></div>
  <div class="an-actions"><button data-a="bxday">Nächster Tag (Heilung)</button><button class="primary" data-a="bxagain">NEUER BOXKAMPF ▸</button></div><div class="an-actions"><button data-a="bxleave">◂ Arena verlassen</button></div></section>`;
 face(A.view.querySelector('#bxrA'),g,r.won?'relief':r.dead?'out':'pain',0,200,130);try{A.root.scrollTop=0;A.view.scrollTop=0;window.scrollTo(0,0);}catch{}
 const n=A.view.querySelector('[data-count]'),goal=+n.dataset.count,st=performance.now();(function tick(){const k=Math.min(1,(performance.now()-st)/900);n.textContent=Math.round(goal*k*(2-k));if(k<1)requestAnimationFrame(tick);})();}
U.screens.boxresult=resultScreen;resultScreen.back=go=>{go('box',-1);};

// ---------- Bild für den Menüpunkt (ein eingefrorener Moment aus einem echten Kampf) ----------
let cardImg=null,cardBusy=false;
function snapshot(w=640,h=360){const cv=document.createElement('canvas');cv.width=w;cv.height=h;const sc=new BXA.Scene(cv);
 const list=roster(),a=list.length?prep(list[0]):prep(mk()),b=BX.makeOpponent(a,8,12345,mk);const f=BX.createFight(a,b,4242);sc.setFight(f,[a.name,b.name]);sc.intro=null;sc.cutOff=true;sc.showBars=false;
 for(let i=0;i<60*5;i++)BX.step(f,1/60);for(let i=0;i<4;i++)sc.render(.016);return cv;}
C.boxCard=(ctx,t,w,h)=>{if(!cardImg&&!cardBusy){cardBusy=true;setTimeout(()=>{try{cardImg=snapshot();}catch(e){console.warn('Boxbild:',e);}cardBusy=false;},20);}
 if(!cardImg)return false;const k=Math.max(w/cardImg.width,h/cardImg.height)*(1.02+.02*Math.sin(t*.7)),dw=cardImg.width*k,dh=cardImg.height*k;ctx.drawImage(cardImg,(w-dw)/2,(h-dh)/2,dw,dh);ctx.fillStyle='rgba(20,8,4,.18)';ctx.fillRect(0,0,w,h);return true;};

// ---------- Kleine Szene: Der Schmied erklärt die Boxkämpfe ----------
const smithName=()=>S().forgeWorkshop?.master?.name||'Der Schmied';
function smithActor(){const p=S().forgeWorkshop?.master,s=S(),rng=s.rng;let g;try{g=M.makeGladiator(0);}finally{s.rng=rng;}
 Object.assign(g,{id:'box-smith',name:p?.name||'Schmied',height:p?.height||186,weight:p?.weight||104,muscle:58,fame:0,scars:[]});if(p?.appearance)g.appearance={...p.appearance};g.equipment={weapon:null,secondary:null,shield:null,armor:{}};g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};
 return {id:'box-smith',g,team:0,x:0,y:0,a:0,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,forgeWorker:true,forgeHold:'beer',bloodMarks:{},noNav:true};}
const BEATS=[
 {say:'So, Chef. Die Hühner sind erledigt. Jetzt zeige ich dir was, das nach noch mehr Blut und noch weniger Gold riecht.',pose:'sip'},
 {say:'Neben dem Arenakampf gibt es jetzt Boxkämpfe. Mann gegen Mann. Keine Waffen, keine Rüstung, nur nackte Fäuste.',gesture:'point'},
 {say:'Der Vorteil: Du kannst Ausdauer, Kraft und Geschick deiner Krieger auf die Probe stellen, bevor ihnen gleich der Schädel mit dem Schwert vom Hals gehauen wird.',gesture:'rant'},
 {say:'Das ist deine Gelegenheit, den einen oder anderen Kämpfer erst mal fit zu bekommen. Wer boxt, lernt. Hier wachsen die Werte.',gesture:'point'},
 {say:'Ein Kampf dauert höchstens 30 Sekunden. Meist gibt es nur Beulen und blaue Augen. Hin und wieder fliegt ein Zahn. Veteranen bekommen dafür nach zehn Tagen einen Goldzahn, alle anderen eine Lücke, die sie richtig trottelig aussehen lässt.',gesture:'shout'},
 {say:'Einen Schädelbruch gibt es nur, wenn einer sehr viel stärker ist als der andere. Bei gleich Starken fast nie. Such dir also lieber Gegner, die zu deinem Mann passen.',gesture:'point'},
 {say:'Du wählst aus fünfzehn Gegnern, vom Prügelknaben bis zum Mörder. Je stärker der Gegner, desto mehr Preisgeld und desto mehr lernt dein Kämpfer.',gesture:'rant'},
 {say:'Du findest alles in der Arena: HUMAN, dann BOXKÄMPFE. Und jetzt raus mit dir. Prost.',pose:'sip',gesture:'bow'}];
let film=null;
function intro(done){if(film)return;const bg=BG();const v=document.createElement('div');v.id='boxIntro';v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');v.setAttribute('aria-label','Der Schmied erklärt die Boxkämpfe');
 v.innerHTML='<div class="bxi-box"><div class="bxi-top"><span>NEU · BOXKÄMPFE</span><button type="button" data-bxi="skip">SZENE ÜBERSPRINGEN ›</button></div><canvas width="660" height="420"></canvas><div class="bxi-bubble"><b></b><p></p><button type="button" data-bxi="next">WEITER ▸</button></div></div>';document.body.appendChild(v);
 let ring=null;try{ring=snapshot(660,420);}catch(e){}
 const act=smithActor();film={v,i:-1,t:0,bt:0,shown:0,act,done,ring,raf:0,last:0,typed:0};M.boxGame.introActive=true;
 const end=()=>{cancelAnimationFrame(film.raf);const d=film.done;v.remove();film=null;M.boxGame.introActive=false;bg.intro=true;try{M.persist();}catch{}d?.();};
 const next=()=>{const f=film;f.i++;f.bt=0;f.typed=0;const b=BEATS[f.i];if(!b){end();return;}f.act.forgePose=b.pose||'';f.act.traderPose=b.gesture||null;f.beat=b;v.querySelector('.bxi-bubble b').textContent=smithName();v.querySelector('.bxi-bubble p').textContent='';v.querySelector('[data-bxi="next"]').textContent=f.i===BEATS.length-1?'LOS GEHT\'S ▸':'WEITER ▸';};
 v.addEventListener('click',e=>{const b=e.target.closest('[data-bxi]');if(!b){if(e.target.closest('canvas,.bxi-bubble')&&film)tap();return;}e.stopPropagation();if(b.dataset.bxi==='skip')end();else tap();},true);
 const tap=()=>{const f=film;if(!f)return;const txt=f.beat?.say||'';if(f.typed<txt.length){f.typed=txt.length;v.querySelector('.bxi-bubble p').textContent=txt;}else next();};
 const cv=v.querySelector('canvas'),g=cv.getContext('2d');
 const frame=now=>{if(!film)return;const dt=Math.min(.05,film.last?(now-film.last)/1000:0);film.last=now;film.t+=dt;film.bt+=dt;const b=film.beat;
  if(b){const txt=b.say,n=Math.min(txt.length,Math.floor(film.bt*46));if(n!==film.typed){film.typed=n;v.querySelector('.bxi-bubble p').textContent=txt.slice(0,n);}}
  const a=film.act;a.phase=film.t*3;a.gest=film.t*3;a.state='idle';
  g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;g.fillStyle='#0d0907';g.fillRect(0,0,660,420);
  if(film.ring){g.drawImage(film.ring,0,0,660,420);g.fillStyle='rgba(8,4,2,.5)';g.fillRect(0,0,660,420);}
  g.save();g.translate(66,412);g.scale(3.6,3.6);try{M.renderLudusActors(g,[{...a,x:0,y:0}]);}catch(e){}g.restore();
  film.raf=requestAnimationFrame(frame);};
 next();film.raf=requestAnimationFrame(frame);}

// ---------- Takt: Tageszähler für Goldzähne, Szene nach dem Hühnerkampf ----------
const busy=()=>!!S().battle||!!film||document.body.classList.contains('an-fighting')||!!M.medic?.film||!!M.medic?.guide||!!M.lionChapter?.film||!!M.lionChapter?.guide||!!M.smithWrath?.scene||!!M.archerPlot?.scene||!!M.hall?.film||!!M.doktor?.film||!!M.intro?.active?.()||!!window.ArenaTheoryIntro?.active?.()||!!M.trader?.tutorial||!!document.querySelector('.smith-ceremony,#introView,#brandIntro,.medic-night,.medic-end,.medic-start,.lesson-start,.lesson-end,.hs-end,.hs-film,.dok-card-end,.an-pres,#an:not([hidden])')||($('modal')&&!$('modal').hidden);
let wait=0;
const lt=M.ludusTick;M.ludusTick=dt=>{lt?.(dt);if(document.hidden||M.benchmarkActive)return;try{syncDays();}catch{}
 if(!BG().intro&&chapterDone()&&!busy()&&M.ui.getPage()==='home'){wait+=dt;if(wait>2.5){wait=0;intro(()=>{});}}else wait=0;};
M.boxGame={intro:(d)=>intro(d),introActive:false,prep,purse,learnMult,refRating,state:BG,get result(){return B.result;}};
window.BOX_GAME_READY=true;
})();
