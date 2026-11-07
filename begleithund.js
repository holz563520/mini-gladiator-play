'use strict';
// =====================================================================================================
// BEGLEITHUND (Wunsch Thomas 7.11.): Ein Hund aus dem Zwinger (S.hundefang.dogs) kann in der Aufstellung mitgenommen werden,
// in der Arena (Aufstellung → Arenakampf, arena-neu) und bei Abenteuern (Plünderung, Hauptauftrag; Außenwelt-Engine).
// · Eigener Platz, zählt nicht zur Gruppengröße. Wunden und Tod sind dauerhaft (DOG.writeBack, wie Tierkämpfe), der Hund lernt.
// · Mit Anführer: Hält der Anführer Assassinen versteckt, wird der Hund in etwa der Hälfte der Kämpfe mit ihnen von hinten
//   losgelassen. Sonst läuft er mit der Gruppe. Gegner bekommen keine Hunde.
// Diese Datei lädt direkt nach sim.js: Ihr Kampfschritt liegt innen um den Grundschritt der Engine (nur bei Außenwelt-Kämpfen mit
// Begleithund). Alles andere hängt sie erst bei Bedarf an (prepare), wenn die übrigen Module geladen sind.
// Entfernen: 'begleithund' aus boot.js, den Hundekasten in aufstellung-ui.js und den Filter in outside.js (partyActors).
// =====================================================================================================
(()=>{
const M=window.MG,S=M.s;if(!M)return;
const DG=()=>window.DOG,isComp=a=>!!(a&&a.dog&&a.companion);
const BH={SIC_CHANCE:.5,SIC_MAX:12};window.Begleithund=BH;

// ---------- Zwinger ----------
BH.kennel=()=>(S.hundefang?.dogs||[]).filter(D=>D&&!D.dead);
BH.fit=D=>{try{return !!D&&!D.dead&&(DG()?.fit?DG().fit(D):true);}catch{return false;}};
BH.chosen=()=>{const id=S.aufstellung?.dog;if(!id)return null;const D=BH.kennel().find(x=>x.id===id);return D&&BH.fit(D)?D:null;};
function makeDog(D,x,y){const a=DG().makeFighter(D,0,x,y);a.companion=true;a.g.role='Hund';a.a=0;a.heading=0;a.unit={kind:'dog',key:'dog-'+D.id,row:'front',D};a.unitKey=a.unit.key;a.row='front';return a;}

// ---------- Außenwelt: Kampfschritt mit Hund (innen um den Grundschritt) ----------
// Der Grundschritt behandelt jeden Kämpfer als Mensch. Er soll den Hund nicht bewegen, die Menschen sollen ihn aber als Ziel sehen:
// Für die Dauer des Grundschritts überspringt der Durchlauf (for … of) den Hund; filter/find (Zielwahl) sehen ihn weiter.
function* skipDogs(){for(let i=0;i<this.length;i++){const a=this[i];if(!isComp(a))yield a;}}
const base=M.fixedStep;
M.fixedStep=function(dt){const b=S.battle,D=DG();
 if(!b||!b.companionDogs||!D||b.neu||b.hundefang||b.paused||b.result||b.finale)return base.apply(this,arguments);
 if(D.paused?.())return;
 const arr=b.actors,dogs=arr.filter(isComp);
 for(const d of dogs){d.surrendered=!d.g.dead&&!!D.out(d);d._px=d.x;d._py=d.y;if(!d.g.dead&&!d.surrendered)try{D.step(d,dt);}catch(e){console.warn(e);}}
 const held=[];for(const a of arr)if(!a.dog&&a.grabbedBy&&D.humanPre(a))held.push(a);
 Object.defineProperty(arr,Symbol.iterator,{configurable:true,writable:true,value:skipDogs});
 let r;try{r=base.apply(this,arguments);}finally{delete arr[Symbol.iterator];}
 for(const a of held){a.wind=0;a.pendingStrike=null;}
 for(const d of dogs){if(d.mode==='grip'&&d.victim){const v=b.actors.find(a=>a.id===d.victim);if(v)D.holdOn(d,v,dt);}
  if(d._px!=null&&d.mode!=='leap'){const jx=d.x-d._px,jy=d.y-d._py,jl=Math.hypot(jx,jy);if(jl>4){d.x=d._px+jx/jl*4;d.y=d._py+jy/jl*4;}}
  if(d.g.dead&&!d.death)d.death=true;}
 return r;};

// Wird der Hund von außen bewegt (Marsch, Formation, Flucht), läuft er mit seinem eigenen Gang statt als Mensch.
const loco0=M.updateLocomotion;
if(loco0)M.updateLocomotion=function(a,x,y,phase,dt){if(!isComp(a))return loco0.apply(this,arguments);const D=DG();if(!D)return;
 const dx=a.x-x,dy=a.y-y,st=Math.hypot(dx,dy);a.moveSpeed=st/Math.max(dt||1/60,1e-4);a.velocity=a.moveSpeed;const g=D.gaitOf(a.moveSpeed);if(g)a.cyc=(a.cyc||0)+(st/(a.P?.sz||1))/D.cycLen(g);
 if(st>.05){a.heading=Math.atan2(dy,dx);a.a=Math.abs(dx)>.3?(dx>0?0:Math.PI):a.a;}if(!['grip','leap','held','down','submit','flee'].includes(a.mode))a.mode=st>.05?'approach':'circle';a.state='idle';};

// ---------- Außenwelt: Mission, Abschnitte, Begegnungen ----------
let hooked=false;
BH.prepare=function(){if(hooked)return;const Dx=window.Debt,L=window.DebtLeader;if(!Dx||!DG())return;hooked=true;
 // Mission: gewählter Hund geht mit (nur wenn einsatzbereit)
 const nm=Dx.newMission;Dx.newMission=function(){const m=nm.apply(this,arguments);try{const D=BH.chosen();if(D&&m){m.dog=D;}}catch(e){console.warn(e);}return m;};
 // Abschnitt: Hund hinter die Gruppe stellen (über die Abschnitte bleibt es derselbe Hund mit seinen Wunden)
 const ss=Dx.startSection;Dx.startSection=function(m,si,o={}){const b=ss.apply(this,arguments);try{if(m?.dog&&!m.dogGone&&b){
  let d=m.dogActor;if(!d){d=m.dogActor=makeDog(m.dog,0,0);}
  if(d.g.dead||DG().out(d)){m.dogGone=true;return b;}
  const party=b.actors.filter(a=>a.team===0),x=Math.min(...party.map(a=>a.x))-40,y=party.reduce((t,a)=>t+a.y,0)/Math.max(1,party.length);
  Object.assign(d,{x:o.headless?x+40:x,y,mode:'circle',velocity:0,moveSpeed:0,target:null,victim:null,heldBy:null,clock:0,cool:.8,leadHide:null,leadCover:null,to:null,path:[],kneeTimer:0,kneeDuration:0,surrendered:false,released:true});
  b.actors.push(d);b.companionDogs=true;b.hasDogs=true;}}catch(e){console.warn(e);}return b;};
 // Begegnung: Kampfbericht und Auswertung nur für Menschen; danach den Hund versorgen, am Ende in den Zwinger zurückschreiben
 const strip=(b,fn)=>{const dogs=b?.actors?.filter(isComp)||[];if(!dogs.length)return fn();b.actors=b.actors.filter(a=>!isComp(a));try{return fn();}finally{for(const d of dogs)if(!b.actors.includes(d))b.actors.push(d);}};
 const col=Dx.collect;Dx.collect=function(m,b){return strip(b,()=>col.apply(this,arguments));};
 const ee=Dx.endEncounter;Dx.endEncounter=function(m,b,o={}){const out=strip(b,()=>ee.apply(this,arguments));try{const d=m?.dogActor;if(d){
  if(d.g.dead||DG().out(d)){m.dogGone=true;if(!d.g.dead)b.actors=b.actors.filter(a=>a!==d);}
  else{Object.assign(d,{mode:'circle',velocity:0,target:null,victim:null,clock:0,surrendered:false,leadHide:null,sicWith:null,kneeTimer:0,kneeDuration:0,to:null,path:[]});DG().release?.(d);}
  sync(d);if(m.state&&m.state!=='ready')finish(m);}}catch(e){console.warn(e);}return out;};
 // Anführer: Plan ohne Hund (er gehört nicht in die Schildlinie); hält der Anführer Assassinen versteckt, kommt der Hund manchmal mit
 if(L?.plan){const pl=L.plan;L.plan=function(b){const res=strip(b,()=>pl.apply(this,arguments));try{const d=b.actors.find(isComp),m=b.mission;
  if(d&&!d.g.dead&&!DG().out(d)){const hide=b.actors.filter(a=>a.team===0&&a.leadHide&&!a.dog);
   if(hide.length&&Math.random()<BH.SIC_CHANCE){const h=hide[0].leadHide,x=h.x-26,y=h.y+(h.side||1)*18;d.leadHide={x,y,side:h.side,dog:true};res?.pts?.set?.(d,{x,y,face:0,job:'hide'});d.sicWith=hide[0].id;}}}catch(e){console.warn(e);}return res;};}
 // Marsch: Der Hund folgt der Gruppe am Ende (ohne eigene Marschordnung)
 follow();};
function sync(d){try{const D=d.dog?._src||d.dog;if(!D)return;const c=DG().cond(D);c.blood=Math.round(Math.max(0,Math.min(100,d.blood)));for(const p in d.tissue)c.t[p]=Math.round(Math.max(0,Math.min(1,d.tissue[p]/d.max[p]))*100)/100;}catch(e){console.warn(e);}}
function finish(m){if(!m||m._dogWritten||!m.dogActor)return;m._dogWritten=true;try{DG().writeBack(m.dogActor,m.state==='won');M.persist?.();}catch(e){console.warn(e);}}
let followOn=false,lastM=null;
function follow(){if(followOn)return;followOn=true;const tick=()=>{try{const b=S.battle,m=b?.mission;
  if(lastM&&lastM!==m){if(lastM.dogActor&&!lastM._dogWritten){sync(lastM.dogActor);if(lastM.state&&lastM.state!=='ready')finish(lastM);else{lastM._dogWritten=true;try{M.persist?.();}catch{}}}lastM=null;}
  if(m?.dogActor){lastM=m;const d=m.dogActor;
   if(b.paused&&!b.started&&!d.g.dead&&b.actors.includes(d)&&!d.leadHide&&!(d.to&&d.to.goal)){const P=b.actors.filter(a=>a.team===0&&!a.dog&&!a.down&&!a.g.dead);
    if(P.length){const rx=Math.min(...P.map(a=>a.x))-34,ry=P.reduce((t,a)=>t+a.y,0)/P.length+((d.id.length%2)?14:-14),dd=Math.hypot(rx-d.x,ry-d.y);
     if(dd>46&&!d.to){d.to=[rx,ry,dd>160?110:70];d.path=[];}else if(dd<20&&d.to){d.to=null;d.moveSpeed=0;d.velocity=0;}}}}}catch(e){console.warn(e);}setTimeout(tick,250);};tick();}

// ---------- Arena (Aufstellung → arena-neu) ----------
// Der Hund kommt nach dem Anführer aufs Feld (die Anführer-Logik schließt Kämpfe mit Tieren sonst aus) und kämpft über arena-core.
// Mit Anführer und Assassine: in etwa der Hälfte der Kämpfe wartet er hinter der Linie und wird losgelassen, sobald der Assassine
// seinen Gegner erreicht (spätestens nach 12 s Kampf), auf genau diesen Gegner – von hinten.
let armed=false;
BH.arena=function(b,D){if(!b||!D||!BH.fit(D)||!DG())return null;const own=b.actors.filter(a=>a.team===0);if(!own.length)return null;
 const back=Math.min(...own.map(a=>a.x)),cy=own.reduce((t,a)=>t+a.y,0)/own.length,front=Math.max(...own.map(a=>a.x));
 const assa=own.filter(a=>a.g.role==='Assassine');const sic=!!(b.lead?.on&&assa.length&&Math.random()<BH.SIC_CHANCE);
 const d=makeDog(D,sic?back-60:front+10,sic?Math.max(190,Math.min(590,cy+(assa[0].y>cy?60:-60))):cy);d.companion=false;// in der Arena führt arena-core den Hund
 b.actors.push(d);b.hasDogs=true;
 if(sic){d.row='back';d.released=false;b.dogSic={dog:d,assa:assa[0].id,done:false};armArena();}
 return d;};
function armArena(){if(armed)return;armed=true;const prev=M.fixedStep;
 M.fixedStep=function(dt){const b=S.battle,s=b?.dogSic;if(!s||s.done||b.paused||b.result||!b.neu)return prev.apply(this,arguments);
  const d=s.dog;if(!b.actors.includes(d)||d.g.dead){s.done=true;return prev.apply(this,arguments);}
  if(b.finale){s.done=true;d.released=true;return prev.apply(this,arguments);}
  const fight=!b.lead||b.lead.phase==='fight'||!b.lead.on,t0=b.lead?.fightAt||b.startTime||0,assa=b.actors.find(a=>a.id===s.assa);
  const tg=assa&&b.actors.find(a=>a.id===assa.target);
  const go=fight&&(b.time-t0>BH.SIC_MAX||!assa||assa.g.dead||assa.down||(tg&&Math.hypot(tg.x-assa.x,tg.y-assa.y)<80)||assa.hit>0);
  if(go){s.done=true;release(b,d,tg&&!tg.g.dead&&!tg.down?tg:null);return prev.apply(this,arguments);}
  // wartet hinter der Linie: im Schritt nicht auf dem Feld (niemand greift ihn an, er rührt sich nicht), sichtbar bleibt er
  const i=b.actors.indexOf(d);b.actors.splice(i,1);d.mode='threat';d.velocity=0;d.moveSpeed=0;
  try{return prev.apply(this,arguments);}finally{if(!b.actors.includes(d))b.actors.splice(Math.min(i,b.actors.length),0,d);}};}
function release(b,d,tg){d.released=true;d.row='front';const foes=b.actors.filter(a=>a.team===1&&!a.g.dead&&!a.down&&!a.surrendered);
 const t=tg||foes.sort((p,q)=>Math.hypot(p.x-d.x,p.y-d.y)-Math.hypot(q.x-d.x,q.y-d.y))[0];if(t){d.target=t.id;d.mode='approach';d.clock=0;}
 const me=b.actors.find(a=>a.g?.id===b.lead?.leaderId&&!a.g.dead&&!a.down);
 const name=String(d.g.name||'Hund').split(' ')[0],line=[`JETZT! ${name}, faß! Von hinten!`,`${name}! Los! In den Rücken!`,`Lasst den Hund los! ${name}, FASS!`][Math.floor(Math.random()*3)];
 if(me)(b.events??=[]).push({type:'lead',actor:me,text:line,kind:'release',leader:true,urgent:true});
 try{M.battleLog?.(name+' wird losgelassen und stürzt sich von hinten auf '+(t?t.g.name:'die Gegner')+'.');}catch{}}
})();
