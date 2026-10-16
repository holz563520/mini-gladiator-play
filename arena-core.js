'use strict';
// =====================================================================================================
// ARENA-NEU · KERN (läuft im Spiel der Testversion UND headless im Spionage-Worker – dieselbe Kampflogik)
// · Kampf aus einer Aufstellung bauen (Menschen, Hähne, Löwen; erste/zweite Reihe)
// · Simulationsschritt aus den Bausteinen des Spiels (M.resolveStrike, M.updateActor, M.updateLocomotion,
//   M.collisionPairs, M.stepProjectiles), Hähne über die Hahnen-Brücke, Löwen über Beasts
// · Ende über das Urteil der Menge des Spiels (M.startFinale/finaleStep), Abschluss über M.worldFinish
// Keine Spieldatei wird verändert; alles hängt an den vorhandenen Anschlüssen.
// =====================================================================================================
(()=>{
const M=window.MG,S=M.s,H=window.HahnArena,BZ=window.Beasts,CF=window.CF,cl=M.clamp;
const AN={TMAX:240,HOLD:2.5,listeners:[]};window.AN=AN;

// ---------- Einheiten ----------
// Eine Einheit: {kind:'human'|'rooster'|'lion', key, row:'front'|'back', g | R | L}
const animal=u=>u.kind!=='human';
const unitName=u=>u.kind==='human'?u.g.name:u.kind==='rooster'?u.R.name:u.L.name;
const ranged=g=>{try{const w=M.gear(g,'weapon');return !!(w&&M.definition(w).ammo);}catch{return false;}};
AN.unitName=unitName;AN.isRanged=ranged;

// ---------- Kampf bauen ----------
function place(units,team){
 const front=units.filter(u=>u.row!=='back'),back=units.filter(u=>u.row==='back'),out=[];
 const dir=team?-1:1,cx=team?780:260;
 [[front,55],[back,-75]].forEach(([list,off])=>{
  const sp=list.map(u=>u.kind==='lion'?120:u.kind==='rooster'?58:80),raw=sp.reduce((a,b)=>a+b,0),spacing=Math.min(1,440/raw),tot=raw*spacing;for(let i=0;i<sp.length;i++)sp[i]*=spacing;let y=390-tot/2;
  list.forEach((u,i)=>{y+=sp[i]/2;let a;
   if(u.kind==='human'){a=M.createCombatActor(u.g,team,out.length,80);a.x=cx+dir*(off+(u.g.role==='Fernkämpfer'?-35:u.g.role==='Soldat'?10:0));}
   else if(u.kind==='rooster'){a=H.roosterActor(u.R,team,out.length);a.x=cx+dir*(off+40);}
   else{a=BZ.makeLion(u.L,team,cx+dir*(off+20),y);}
   a.y=cl(y,170,610);a.a=team?Math.PI:0;a.row=u.row||'front';a.unitKey=u.key;a.unit=u;out.push(a);y+=sp[i]/2;});});
 return out;}
AN.build=function(spec){
 const actors=[...place(spec.blue,0),...place(spec.red,1)];
 // Löwen zuerst: das Spiel sucht für Greif-Darstellung „den“ Löwen per find
 actors.sort((a,b)=>(b.lion?1:0)-(a.lion?1:0));
 const b={id:'arena-neu-'+Date.now()+'-'+Math.floor(Math.random()*1e6),neu:true,trainingLocked:false,actors,opponent:spec.title||'Herausforderung',time:3.2,startTime:3.2,type:'arena-neu',league:0,log:[],paused:false,result:null,
  obstacles:[{x:170,y:215,r:17,type:'barrel',hp:60},{x:870,y:555,r:17,type:'barrel',hp:60}],width:1040,height:720,moralePressure:[0,0],moraleBonus:[0,0],lastSave:0,groundWeapons:[],dropped:[],fee:0,spec};
 for(const a of actors)if(a.g&&!animal(a.unit))for(const slot of ['weapon','secondary']){try{const it=M.gear(a.g,slot);if(it)it.blood=0;}catch{}}
 return b;};

// ---------- Erste/zweite Reihe: die zweite Reihe wartet, bis es ernst wird ----------
function holding(a,b){
 if(a.row!=='back'||a.released)return false;
 if(a.unit.kind==='human'&&(a.g.role==='Fernkämpfer'||ranged(a.g)))return false; // Fernkämpfer behalten ihre Mechanik
 const t=b.time-b.startTime;
 const foes=b.actors.filter(x=>x.team!==a.team&&!x.g.dead&&!x.down&&!x.surrendered);
 const near=foes.some(x=>Math.hypot(x.x-a.x,x.y-a.y)<(a.lion?220:165));
 const frontUp=b.actors.some(x=>x.team===a.team&&x.row!=='back'&&!x.g.dead&&!x.down&&!x.surrendered);
 const engaged=b.actors.some(x=>x.team===a.team&&x.row!=='back'&&(x.engagedUntil>b.time||x.hit>0||x.taken>0));
 if(t>AN.HOLD+(engaged?0:2)||near||!frontUp||(engaged&&t>3.6)){a.released=true;return false;}
 return true;}
function idle(a,b){const foes=b.actors.filter(x=>x.team!==a.team&&!x.g.dead);const n=foes.sort((p,q)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(q.x-a.x,q.y-a.y))[0];
 if(n)a.a=Math.atan2(n.y-a.y,n.x-a.x);a.moveSpeed=0;
 if(a.lion){a.mode=a.clock%3<1.2?'threaten':'stalk';a.clock=(a.clock||0)+1/60;a.velocity=0;return;}
 if(a.hahn){a.state='idle';a.hpose={hackle:.8,lean:.2,headX:Math.sin(b.time*5)*.6};return;}
 a.state='idle';a.wind=0;a.pendingStrike=null;a.energy=Math.min(a.energy+.05,a.maxEnergy||100);}

// ---------- Simulationsschritt ----------
const live=(b,t)=>b.actors.filter(a=>a.team===t&&!a.down&&!a.surrendered&&!a.g.dead);
function points(b,t){return live(b,t).reduce((n,a)=>n+(a.lion?BZ.health(a)*190:a.hahn?CF.health(a.hahn)*a.hahn.weight:M.health(a.g)*(a.g.weight||80)),0);}
function step(dt){
 const b=S.battle;if(!b||b.paused||b.result)return;
 if(H.shots?.active)return; // Nahaufnahme eines Hahns hält den Kampf an (wie im Spiel)
 M.groundPools(dt);b.time+=dt;
 H.setSim(true);
 try{
  for(const a of b.actors){
   if(a.lion){if(holding(a,b))idle(a,b);else BZ.step(a,dt);continue;}
   const x=a.x,y=a.y,p=a.phase||0;
   if(a.draggedBy&&!a.g.dead&&b.actors.some(l=>l.id===a.draggedBy&&l.lion&&!l.g.dead)){a.state='fallen';a.moveSpeed=0;}
   else if(holding(a,b))idle(a,b);
   else{M.resolveStrike(a,dt*1.12);M.updateActor(a,dt*1.12);}
   M.updateLocomotion(a,x,y,p,dt*1.12);}
  M.collisionPairs({actors:b.actors.filter(a=>!(a.lion&&(a.mode==='leap'||a.g.dead)))});
  M.stepProjectiles(dt);
  for(const a of b.actors)if(a.g.dead&&!a.death)a.death=true;
 }finally{H.setSim(false);}
 H.post(b,dt);
 const L=[live(b,0).length,live(b,1).length];
 b.moralePressure=[Math.min(6,Math.max(0,L[1]-L[0])*2),Math.min(6,Math.max(0,L[0]-L[1])*2)];
 if(L[0]&&L[1]&&b.time-b.startTime<AN.TMAX)return;
 const winner=L[0]&&L[1]?(points(b,0)===points(b,1)?-1:points(b,0)>points(b,1)?0:1):L[0]?0:L[1]?1:-1;
 b.endAt??=b.time;if(b.time-b.endAt<1.1)return;
 b.timeout=!!(L[0]&&L[1]);
 startEnd(b,winner);}
// Urteil der Menge (aus dem Spiel). Tiere werden nicht gerichtet und richten nicht; ohne Menschen auf der
// Siegerseite überlassen die Ränge die Verurteilten den Tieren – dieselbe Drittel-Regel wie im Spiel.
function startEnd(b,winner){
 M.startFinale(winner,b.timeout?'Zeit abgelaufen · Wertung nach Gesundheit und Masse':'');judge(b,winner);}
function judge(b,winner){
 const f=b.finale;if(!f||f._judged)return;f._judged=true;
 const human=id=>{const a=b.actors.find(x=>x.id===id);return a&&!a.lion&&!a.hahn;};
 f.judgments=f.judgments.filter(j=>human(j.id));
 const execs=b.actors.filter(a=>a.team===winner&&!a.lion&&!a.hahn&&!a.g.dead&&!a.down&&!a.surrendered);
 if(!execs.length&&f.judgments.length){const beast=b.actors.find(a=>a.team===winner&&!a.g.dead);
  for(const j of f.judgments){const v=b.actors.find(a=>a.id===j.id);if(j.execute&&v&&!v.g.dead){H.setSim(true);try{M.death(v,'Den Bestien überlassen',beast||null);}finally{H.setSim(false);}}}
  f.judgments=[];}
 // Ohne Bildschirm (Spionage): dasselbe Urteil, nur ohne die Inszenierung – die Verurteilten sterben sofort
 if(AN.headless){H.setSim(true);try{for(const j of f.judgments){const v=b.actors.find(a=>a.id===j.id);if(j.execute&&v&&!v.g.dead)M.death(v,j.method||'Urteil der Menge',null);}}finally{H.setSim(false);}f.judgments=[];M.finish(winner,f.reason);}}
// Während des Urteils: Tiere der Siegerseite treten nicht als Vollstrecker an
function finaleStep(inner,ctx,args){const b=S.battle,f=b.finale;judge(b,f.winner);const hidden=b.actors.filter(a=>(a.lion||a.hahn)&&a.team===f.winner&&!a.surrendered);
 for(const a of hidden)a.surrendered=true;try{return inner.apply(ctx,args);}finally{for(const a of hidden)a.surrendered=false;}}
// Aufgeben im Kampf (Knopf des Spiels): danach dasselbe Urteil wie oben
const baseSurrender=M.surrender;M.surrender=function(){const b=S.battle;const r=baseSurrender.apply(this,arguments);if(b?.neu&&b.finale)judge(b,1);return r;};
const inner=M.fixedStep;
M.fixedStep=function(dt){const b=S.battle;if(!b?.neu)return inner.apply(this,arguments);if(b.result)return;if(b.finale)return finaleStep(inner,this,arguments);return step(dt);};
AN.step=step;

// ---------- Abschluss: Ergebnis je Einheit ----------
function unitOut(a){const u=a.unit,o={key:a.unitKey,kind:u.kind,name:unitName(u),team:a.team,row:a.row,kills:a.kills||0};
 if(u.kind==='lion'){const h=BZ.health(a);Object.assign(o,{dead:!!a.g.dead,down:!!a.g.dead,health:Math.round(h),injured:h<92,severe:a.g.dead||h<55,kills:a.kills||0});}
 else if(u.kind==='rooster'){const R=a.hahn,h=CF.health(R),gr=Math.max(...Object.values(R.body).map(p=>p.grade||0));Object.assign(o,{dead:!!(R.dead||a.g.dead),down:!!a.down,health:Math.round(h),injured:gr>=1||h<90,severe:gr>=3||!!a.down,kills:a.kills||0});}
 else{const g=a.g,parts=Object.values(g.body),gr=Math.max(...parts.map(p=>p.missing?4:p.grade||0));Object.assign(o,{dead:!!g.dead,down:!!a.down,health:Math.round(M.health(g)),injured:gr>=1||parts.some(p=>p.hp<85),severe:gr>=3||!!a.down||parts.some(p=>p.missing),kills:a.kills||0,
  injuries:Object.entries(g.body).filter(([,p])=>p.missing||p.grade>=2).map(([id,p])=>(M.partName?M.partName(id):id)+': '+(p.missing?'abgetrennt':p.injury||'verletzt')).slice(0,4)});}
 if(o.dead){o.severe=true;o.injured=true;o.cause=u.kind==='rooster'?a.hahn.cause||a.g.cause:a.g.cause||'';o.killer=a.g.killer||'';}
 // Anteil der zerstörten Kampfkraft (für das Antrittsgeld)
 o.loss=o.dead?1:o.down?.85:cl(1-o.health/100,0,1)*.8;return o;}
AN.outcome=function(b,winner){
 for(const a of b.actors){if(a.hahn&&!AN.headless)H.syncBack(a,true);if(a.lion)BZ.writeBack(a);}
 return {id:b.id,winner,timeout:!!b.timeout,time:Math.round((b.time-b.startTime)*10)/10,units:b.actors.map(unitOut)};};
const wf=M.worldFinish;
M.worldFinish=function(b,winner){if(b?.neu){const out=AN.outcome(b,winner);AN.last=out;b.neuOutcome=out;for(const fn of AN.listeners.splice(0))try{fn(out,b);}catch(e){console.error(e);}return;}return wf?.apply(this,arguments);};

// ---------- Headless: n Kämpfe derselben Aufstellung (im Worker) ----------
AN.headlessRun=function(spec,maxSeconds=AN.TMAX+60){
 const copy=JSON.parse(JSON.stringify(spec));
 S.battle=AN.build(copy);M.stains=[];M.limbs=[];M.swings=[];M.floaters=[];M.shake=0;
 let out=null;AN.listeners.push(o=>{out=o;});
 const dt=1/60,limit=Math.ceil(maxSeconds/dt)+60*90;let n=0;
 while(S.battle&&!out&&n<limit){M.fixedStep(dt);n++;}
 if(!out){const b=S.battle;out=AN.outcome(b,-1);out.stuck=true;}
 S.battle=null;S.records=[];S.inventory=[];return out;};
window.ARENA_CORE_LOADED=true;
})();

