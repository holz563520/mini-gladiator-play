'use strict';
// =====================================================================================================
// ARENA-NEU · LÖWEN FÜR ALLE SEITEN (nur Testversion, ändert keine Spieldatei)
// Die Löwen-KI ist die von Rex Vetus aus dist/lion.js (Pranke, Sprung, Biss, Wegzerren, Ausweichen, Drohen),
// hier verallgemeinert: beliebig viele Löwen, auf jeder Seite, gegen Menschen, Hähne und andere Löwen.
// Jeder Löwe hat eigene Werte (Kraft, Schnelligkeit, Zähigkeit, Wildheit) und einen Zustand (verletzt, ausgehungert …).
// Gezeichnet wird mit M.drawRex aus dem Spiel. Getroffen wird ein Löwe über M.rexReceive (hier für eigene Löwen umhüllt).
// Im Tutorial-Kampf des Spiels (rexTut) ändert sich nichts.
// =====================================================================================================
(()=>{
const M=window.MG,S=M.s,cl=M.clamp,dist=M.dist;
const BZ={fx:true};window.Beasts=BZ;
const alive=a=>!a.g.dead&&!a.surrendered;
function log(t){const b=S.battle;if(!b)return;b.log.unshift({time:Math.floor(b.time),text:t});b.log.length=Math.min(40,b.log.length);}
function blood(x,y,n){M.emit(x,y-12,n,'#a2392e',85);M.stains.push({x:x+M.rnd(-8,8),y:y+M.rnd(-5,5),r:M.rnd(2,6)});if(M.stains.length>300)M.stains.shift();}

// ---------- Werte eines Löwen ----------
// L: {id,name,epithet,age,stats:{kraft,tempo,zaeh,wild},condition:{health,blood,rear,hunger},scars,wins,kills,fights,dead}
function params(L){const s=L.stats,f=v=>v/50;
 return {swipe:68*(.55+.45*f(s.kraft)),leap:80*(.55+.45*f(s.kraft)),bite:54*(.6+.4*f(s.kraft)),speed:.72+.28*f(s.tempo),resilience:2*(.62+.38*f(s.zaeh)),
  interrupt:34*(.7+.3*f(s.zaeh)),grip:2.2*(1.2-.2*f(s.wild)),drag:95*(.75+.25*f(s.tempo)),display:1.25-.25*f(s.wild),size:cl(.86+(s.kraft-40)*.0035,.82,1.12)};}
function makeLion(L,team,x,y){
 const rng=S.rng,g=M.makeGladiator(0,team===1);S.rng=rng;
 g.name=L.name;g.id='lion-'+L.id+'-'+Math.floor(Math.random()*1e6).toString(36);g.role='Soldat';g.traits=[];g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};g.equipment={weapon:null,secondary:null,shield:null,armor:{}};
 for(const k in g.stats)g.stats[k]=48;g.stats.will=100;g.stats.morale=100;g.stats.agility=cl(L.stats.tempo,20,95);g.stats.reflex=cl(L.stats.tempo,20,95);g.weight=Math.round(150+L.stats.kraft*.9);g.height=110;
 const P=params(L),c=L.condition,tf=c.health/100;P.canLeap=!L.crippled; // L.crippled: Hinterlauf zerschlagen – kein Ansprung mehr (nur wo ausdrücklich gesetzt, z. B. Rex in der Lanister-Lektion)
 const l=M.createCombatActor(g,team,0);
 Object.assign(l,{rex:true,lion:L,P,x,y,r:30*P.size,cute:P.size,
  tissue:{head:160*tf,chest:290*tf,belly:140*tf,front:120*tf,rear:100*(c.rear/100)},wounds:(L.wounds||[]).map(w=>({...w})),blood:c.blood,bleeding:0,trauma:(1-tf)*120,
  velocity:0,heading:team?Math.PI:0,turn:0,evadeUntil:0,scarSeed:0,mode:'stalk',clock:0,cool:1.4+Math.random()*.6,energy:100*(1-c.hunger/250),pounceCD:.8+Math.random()*.6,hitCount:0,bites:0,interruptDamage:0,z:0,deathAt:0,paw:1,grabs:0,interruptions:0,gripKills:0,gripAborts:0,rescuedRisen:0,displayCycle:0,side:Math.random()<.5?-1:1});
 l.max={head:160,chest:290,belly:140,front:120,rear:100};l.a=team?Math.PI:0;return l;}

// ---------- Treffer am Löwen (wie M.rexReceive, mit eigenen Werten und Namen) ----------
function release(l,rescued=false){const t=S.battle.actors.find(a=>a.id===l.victim);if(t){delete t.grabbedBy;delete t.draggedBy;t.kx=t.ky=0;if(rescued&&!t.g.dead){l.interruptions++;t.rescuedAt=S.battle.time;t.rescueCounted=false;const canRise=M.health(t.g)>37&&t.g.body.head.hp>12&&t.g.body.neck.hp>9&&t.g.body.chest.hp>10&&t.g.blood>=28;if(canRise&&!t.hahn){t.down=false;t.fallDuration=2.3;t.fallTimer=2.3;t.riseDuration=1.35;t.riseAttempted=false;t.riseHoldChecked=false;t.riseHold=0;t.state='fallen';}else t.fallTimer=Math.max(t.fallTimer||0,1.2);}else if(!t.g.dead)t.fallTimer=Math.max(t.fallTimer||0,1.2);}l.victim=null;l.interruptDamage=0;}
function state(l,mode,duration){l.mode=mode;l.clock=0;l.duration=mode==='evade'?duration*1.3:duration;if(['snarl','roar','threaten'].includes(mode)&&BZ.fx)BZ.sound?.(mode);}
function injury(l){return cl(l.trauma/600+(100-l.blood)/180,0,1);}
function dieLion(l,a){if(l.g.dead)return;release(l,!!l.victim);l.g.dead=true;l.down=true;l.death=true;l.z=0;l.deathAt=S.battle.time;l.g.cause=a?'Getötet von '+(a.hahn?a.hahn.name:a.g.name):'An den Wunden verendet';l.g.killer=a?(a.hahn?a.hahn.name:a.g.name):'';if(a)a.kills=(a.kills||0)+1;state(l,'dead',99);log(a?(a.hahn?a.hahn.name:a.g.name)+' streckt '+l.g.name+' nieder.':l.g.name+' bricht an seinen Wunden zusammen.');}
function checkDeath(l,a){if(!l.g.dead&&(l.tissue.head<=0||l.tissue.chest<=0||l.blood<=15||l.trauma>700))dieLion(l,a);}
function receive(a,l,projectile,snapshot){if(l.g.dead)return;const ef=snapshot||M.effective(a),w=ef.w;if(!projectile&&dist(a,l)>ef.range+l.r+12)return;const ag=a.g.stats,accuracy=cl(-.30+(ag.dexterity||48)*.024+(ag.experience||0)*.010-(l.mode==='leap'?.30:l.mode==='sprint'?.26:l.velocity>125?.25:.09),.12,.96);if(M.rng()>accuracy)return;
 let damage=ef.damage*M.rnd(.78,1.22)*M.spacingFactor(w,dist(a,l),ef.range)*(a.energy<15?.55:1)*1.10;if(w.id==='fist')damage*=.7;const rear=Math.abs(M.angleDiff(M.angle(l,a),l.a))>2.1;if(rear)damage*=1.15;
 const roll=M.rng(),part=rear?(roll<.58?'rear':'belly'):roll<.10?'head':roll<.45?'chest':roll<.76?'belly':'front';const wd=damage/l.P.resilience;l.tissue[part]=Math.max(0,l.tissue[part]-wd);l.trauma+=wd;l.blood=Math.max(0,l.blood-wd*(w.bladed?.13:.045));l.bleeding+=wd*(w.bladed?.006:.0015);
 const x={head:42,chest:22,belly:-8,front:28,rear:-31}[part],y={head:-49,chest:-40,belly:-33,front:-20,rear:-21}[part];l.wounds.push({part,x:x+M.rnd(-8,8),y:y+M.rnd(-7,7),size:cl(damage/9,2,8),cut:!!w.bladed,phase:M.rnd(0,6.28)});if(l.wounds.length>36)l.wounds.shift();
 if(damage>24)log(a.g.name+' trifft '+l.g.name+' '+({head:'am Kopf',chest:'an der Brust',belly:'in die Flanke',front:'am Vorderlauf',rear:'am Hinterlauf'})[part]+'.');l.taken+=damage;a.damage+=damage;M.recordDamage(a,ef.attackKey||a.lastAttackKey||'slash',damage);a.contactPoint={x:l.x,y:l.y-30};l.hit=.24;l.recoilAngle=M.angle(a,l);l.interruptDamage+=damage;l.lastAttacker=a.id;if(w.item)w.item.blood=Math.min(1,(w.item.blood||0)+damage/55);blood(l.x,l.y,Math.min(22,4+damage/3));
 checkDeath(l,a);if(l.g.dead)return;
 if(['drag','maul'].includes(l.mode)&&l.interruptDamage>=l.P.interrupt){release(l,true);l.escapeAngle=M.angle(a,l);state(l,'evade',.6);l.cool=.65;log(a.g.name+' zwingt '+l.g.name+', sein Opfer loszulassen!');}
 else if(damage>24&&!['leap','sprint','drag','maul'].includes(l.mode)&&S.battle.time>(l.recoilUntil||0)){l.recoilUntil=S.battle.time+1.4;l.escapeAngle=M.angle(a,l)+(M.rng()-.5)*1.1;state(l,'evade',.48);l.cool=.35;}}
const baseReceive=M.rexReceive;M.rexReceive=function(a,l){if(l?.lion)return receive.apply(this,arguments);return baseReceive?.apply(this,arguments);};

// ---------- Angriffe des Löwen ----------
const nameOf=t=>t.hahn?t.hahn.name:t.g.name;
function hurt(l,t,kind){if(!t||!alive(t))return false;const old=t.taken,wasDead=t.g.dead;const dmg=kind==='bite'?l.P.bite:kind==='leap'?l.P.leap:l.P.swipe;
 const ef={...M.effective(l),damage:dmg,range:kind==='leap'?100:78,attackKey:kind,partId:kind==='bite'?'neck':undefined,w:{id:'rex-'+kind,name:kind==='bite'?'Kehlbiss':'Pranken',damage:dmg,range:78,weight:kind==='leap'?8:3,pen:.2,crit:1.30,bladed:false,ammo:0,block:0}};
 l.a=M.angle(l,t);l.lastAttackKey=kind;
 if(t.lion){// Löwe gegen Löwe: Pranken und Bisse ins Gewebe
  const before=t.trauma;receive(l,t,false,ef);if(t.trauma>before){l.hitCount++;if(BZ.fx)M.shake=Math.max(M.shake||0,5);log(l.g.name+' '+(kind==='bite'?'verbeißt sich in ':'reißt ')+t.g.name+(kind==='bite'?'.':' mit der Pranke.'));return true;}return false;}
 M.hit(l,t,false,ef);if(t.taken>old){l.hitCount++;if(kind==='leap'&&!t.hahn){M.knockdown(t,'Von '+l.g.name+' angesprungen',2.3);t.kx+=Math.cos(l.a)*95;t.ky+=Math.sin(l.a)*95;}
  if(kind==='bite'&&t.g.body.neck.hp<9&&!t.g.dead)M.death(t,'Tödlicher Kehlbiss',l);if(!wasDead&&t.g.dead){l.kills=(l.kills||0)+1;if(kind==='bite')l.bites++;}
  if(BZ.fx)M.shake=Math.max(M.shake||0,kind==='swipe'?4:kind==='leap'?11:7);log(kind==='bite'?l.g.name+' beißt '+nameOf(t)+'.':kind==='leap'?l.g.name+' reißt '+nameOf(t)+' um!':l.g.name+' trifft '+nameOf(t)+' mit der Pranke.');}
 return t.taken>old;}
function beginGrip(l,t){l.gripFace=t.x>=l.x?1:-1;l.victim=t.id;l.grabs++;l.gripType=M.rng()<.65?'head':'body';l.interruptDamage=0;t.grabbedBy=l.id;t.draggedBy=l.id;t.wind=0;t.pendingStrike=null;t.swing=0;t.kx=t.ky=0;t.fallTimer=Math.max(2.3,t.fallTimer||0);t.fallDuration=Math.max(t.fallDuration||0,t.fallTimer);
 const part=t.g.body[l.gripType==='head'?'head':'chest'],damage=Math.min(12,Math.max(0,part.hp-20))*(l.P.bite/54);part.hp-=damage;part.pain=Math.min(100,part.pain+18);part.bleed+=.6;part.grade=M.injuryGrade(part);t.g.blood=Math.max(0,t.g.blood-2);t.taken+=damage;l.damage+=damage;M.recordDamage(l,'grip',damage);
 if(damage>0){try{const point=M.contactAnchor({...t,down:true},l.gripType==='head'?'head':'chest');blood(point.x,point.y+12,6);}catch{}t.hit=.23;t.bloodMarks=t.bloodMarks||{};t.bloodMarks[l.gripType==='head'?'head':'chest']=1;}
 state(l,'drag',l.P.grip);log(l.g.name+' packt '+nameOf(t)+' und zieht '+(t.hahn?'ihn':'ihn')+' weg!');}
function walk(l,tx,ty,v,dt,faceTarget=null){const dx=tx-l.x,dy=ty-l.y,d=Math.hypot(dx,dy),desired=Math.atan2(dy,dx);l.velocity+=(v-l.velocity)*Math.min(1,dt*9);const step=Math.min(d,l.velocity*dt),turn=M.angleDiff(desired,l.heading);l.heading+=cl(turn,-dt*5.5,dt*5.5);l.turn+=(turn-l.turn)*Math.min(1,dt*8);l.x=cl(l.x+Math.cos(l.heading)*step,95,945);l.y=cl(l.y+Math.sin(l.heading)*step,165,615);l.moveSpeed=step/dt;const facing=faceTarget?M.angle(l,faceTarget):l.heading;l.a+=cl(M.angleDiff(facing,l.a),-dt*7,dt*7);l.phase=(l.phase||0)+step*.08;}
function escape(l,targets,dt,speed){let dx=0,dy=0;for(const a of targets){const d=Math.max(20,dist(l,a));dx+=(l.x-a.x)/(d*d);dy+=(l.y-a.y)/(d*d);}const side=l.side||1;dx+=(520-l.x)*.000022+80*(1/Math.max(30,l.x-70)**2-1/Math.max(30,970-l.x)**2);dy+=(385-l.y)*.000035+65*(1/Math.max(30,l.y-140)**2-1/Math.max(30,640-l.y)**2);const an=Math.atan2(dy,dx)+side*.40;l.escapeAngle=an;walk(l,l.x+Math.cos(an)*160,l.y+Math.sin(an)*160,speed,dt,l.mode==='evade'?targets.reduce((a,b)=>dist(l,a)<dist(l,b)?a:b):null);}
function alignGrip(l,t,dt){const face=l.gripFace||(t.x>=l.x?1:-1);l.a=face>0?0:Math.PI;t.a=face>0?Math.PI:0;t.fallSide=1;t.kx=t.ky=0;let point,contact;try{point=M.contactAnchor({...t,down:true},l.gripType==='head'?'head':'chest');}catch{point={x:t.x,y:t.y};}const reach=62*l.P.size,dx=l.x+face*reach-point.x,dy=l.y-12-point.y,k=Math.min(1,dt*12,240*dt/Math.max(1,Math.hypot(dx,dy)));t.x=cl(t.x+dx*k,105,935);t.y=cl(t.y+dy*k,175,610);try{contact=M.contactAnchor({...t,down:true},l.gripType==='head'?'head':'chest');}catch{contact={x:t.x,y:t.y};}l.x=cl(l.x+(contact.x-face*reach-l.x)*Math.min(1,dt*8),95,945);l.y=cl(l.y+(contact.y+12-l.y)*Math.min(1,dt*8),165,615);}

// ---------- Ein Schritt der Löwen-KI (aus lion.js, mit Gegnern beider Seiten) ----------
function step(l,dt){const b=S.battle;l.hit=Math.max(0,(l.hit||0)-dt);l.clock+=dt;l.cool-=dt;l.pounceCD-=dt;l.energy=Math.min(100,l.energy+dt*8);if(l.g.dead)return;
 l.blood=Math.max(0,l.blood-l.bleeding*dt*.28);if(l.blood<=15){dieLion(l,b.actors.find(a=>a.id===l.lastAttacker));return;}
 if(l.bleeding>.3){l.drip=(l.drip||0)-dt;if(l.drip<=0){l.drip=.32+1/(l.bleeding+1);M.stains.push({x:l.x,y:l.y,r:Math.min(5,1+l.bleeding)});if(M.stains.length>300)M.stains.shift();}}
 let t=b.actors.find(a=>a.id===l.target);const targets=b.actors.filter(a=>a.team!==l.team&&alive(a));l.moveSpeed=0;if(!targets.length){if(l.mode!=='roar'&&l.mode!=='recover')state(l,'roar',2.4);return;}
 if(!t||!alive(t)||t.team===l.team||l.mode==='stalk'&&l.clock>1.8){t=targets.map(a=>({a,score:dist(l,a)+(a.lion?160:M.health(a.g)*1.15)+targets.filter(b=>b!==a&&dist(a,b)<115).length*70+(a.lion?0:M.usableShield(a)?30:0)-(a.hahn?40:0)})).sort((a,b)=>a.score-b.score)[0].a;l.target=t.id;if(l.mode==='stalk')l.clock=0;}
 const d=dist(l,t),nearest=Math.min(...targets.map(a=>dist(l,a))),hurtLeg=1-l.tissue.rear/100,condition=cl(1-injury(l)*.32-hurtLeg*.15,.48,1)*l.P.speed;
 if(l.mode==='leap'){const p=cl(l.clock/l.duration,0,1),q=p*p*(3-2*p);l.x=l.sx+(l.ex-l.sx)*q;l.y=l.sy+(l.ey-l.sy)*q;l.z=Math.sin(p*Math.PI)*43;l.phase=(l.phase||0)+dt*12;if(!l.leapHit&&p>.15&&dist(l,t)<67*l.P.size){l.leapHit=true;l.leapLanded=hurt(l,t,'leap');}if(p>=1){l.z=0;l.pounceCD=3.5*l.P.display;l.cool=.6;if(l.leapLanded&&alive(t)&&!t.lion&&t.fallTimer>0&&dist(l,t)<80){beginGrip(l,t);}else{state(l,'evade',.65);l.side*=-1;}}return;}
 if(l.mode==='sprint'){walk(l,t.x,t.y,385*condition,dt);l.energy=Math.max(0,l.energy-dt*22);if(d<137||l.clock>.9){l.sx=l.x;l.sy=l.y;const an=M.angle(l,t),len=Math.min(160,Math.max(15,dist(l,t)-28));l.ex=cl(l.x+Math.cos(an)*len,95,945);l.ey=cl(l.y+Math.sin(an)*len,165,615);l.leapHit=false;l.leapLanded=false;state(l,'leap',.26);}return;}
 if(l.mode==='crouch'){l.velocity*=Math.exp(-dt*12);l.a+=cl(M.angleDiff(M.angle(l,t),l.a),-dt*7,dt*7);if(l.clock>=l.duration)state(l,'sprint',1);return;}
 if(['drag','maul'].includes(l.mode)){t=b.actors.find(a=>a.id===l.victim);if(!t||!alive(t)){l.gripAborts++;release(l);state(l,'evade',.7);return;}const friends=targets.filter(a=>a!==t&&!a.down);t.fallTimer=Math.max(2.3,t.fallTimer||0);t.state='fallen';t.grabbedBy=l.id;t.draggedBy=l.id;t.moveSpeed=0;
  if(l.mode==='drag'){if(friends.length)escape(l,friends,dt,l.P.drag*condition);else{const a=l.heading;walk(l,l.x+Math.cos(a)*80,l.y+Math.sin(a)*80,l.P.drag*.7,dt);}alignGrip(l,t,dt);if(l.clock>=l.P.grip-.6)state(l,'maul',.6);}
  else{l.velocity*=Math.exp(-dt*10);alignGrip(l,t,dt);if(l.clock>=l.duration){t.hit=.23;M.death(t,l.gripType==='head'?'Tödlicher Biss':'Tödlicher Angriff am Boden',l);l.bites++;l.gripKills++;l.kills=(l.kills||0)+1;if(BZ.fx)M.shake=Math.max(M.shake||0,8);log('Die Hilfe kommt zu spät für '+nameOf(t)+'.');release(l);state(l,'evade',.7);l.pounceCD=2.4;}}
  return;}
 if(l.mode==='evade'||l.mode==='recoil'){escape(l,targets,dt,265*condition);if(l.clock>=l.duration){state(l,nearest>110&&l.energy>35?'threaten':'recover',.7+hurtLeg*.4);l.pounceCD=Math.max(l.pounceCD,1);}return;}
 if(l.mode==='recover'||l.mode==='roar'&&l.clock<l.duration){if(nearest<125)escape(l,targets,dt,90*condition);else{l.velocity*=Math.exp(-dt*8);l.a=M.angle(l,t);}if(l.clock>=l.duration)state(l,'stalk',0);return;}
 if(['snarl','roar','threaten'].includes(l.mode)){l.velocity*=Math.exp(-dt*8);l.a=M.angle(l,t);if(nearest<62){state(l,'evade',.4);return;}if(l.clock>=l.duration){if(l.P.canLeap)state(l,'crouch',.18);else{state(l,'stalk',0);l.pounceCD=2.5;}}return;}
 if(l.mode==='swipe'){if(!l.swiped&&l.clock>.16){hurt(l,t,'swipe');l.swiped=true;}if(l.clock>.34){state(l,'evade',.65);l.cool=.8;}return;}
 if(!t.lion&&(t.fallTimer>0||t.down)&&d<70*l.P.size&&l.cool<=0){beginGrip(l,t);return;}
 if(l.energy<22){state(l,'recover',1.1);return;}
 if(nearest<80*l.P.size&&l.cool<=0){state(l,'swipe',.34);l.swiped=false;l.paw*=-1;l.energy-=8;return;}
 if(nearest<145&&l.pounceCD>0){escape(l,targets,dt,200*condition);return;}
 if(l.pounceCD<=0&&d<400&&l.cool<=0){l.displayCycle++;state(l,['snarl','threaten','roar'][l.displayCycle%3],(l.displayCycle%3===2?.55:.38)*l.P.display);l.side=M.rng()<.5?-1:1;return;}
 if(!l.P.canLeap&&l.cool<=0&&l.energy>30){walk(l,t.x,t.y,120*condition,dt,t);return;} // lahmer Löwe: humpelt heran und schlägt mit der Pranke
 const an=M.angle(t,l)+(l.side||1)*.95,radius=210;walk(l,t.x+Math.cos(an)*radius,t.y+Math.sin(an)*radius,145*condition,dt,t);
 checkDeath(l,null);}

// ---------- Zustand nach dem Kampf zurück in den Löwen ----------
function writeBack(l){const L=l.lion,tf=Math.min(...['head','chest','belly','front'].map(k=>l.tissue[k]/l.max[k]));
 L.condition.health=Math.round(cl(tf*100,0,100));L.condition.rear=Math.round(cl(l.tissue.rear,0,100));L.condition.blood=Math.round(cl(l.blood,0,100));L.wounds=l.wounds.slice(-14).map(w=>({...w}));
 if(l.g.dead){L.dead=true;L.cause=l.g.cause||'In der Arena gefallen';L.killer=l.g.killer||'';}
 L.kills=(L.kills||0)+(l.kills||0);}
function health(l){const f=l.max;return cl(Math.min(l.tissue.head/f.head,l.tissue.chest/f.chest,(l.tissue.belly+l.tissue.front)/(f.belly+f.front))*100*Math.min(1,l.blood/80),0,100);}
Object.assign(BZ,{params,makeLion,step,writeBack,health,injury,dieLion});
window.BEASTS_LOADED=true;
})();
