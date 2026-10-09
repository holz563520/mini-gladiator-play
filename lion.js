'use strict';
// Rex Vetus (Löwen-KI und Darstellung aus dem Prototyp v08) + Kapitel „Die Sache mit dem Löwen“ (Testfassung)
(()=>{
const M=window.MG,S=M.s;
const P={resilience:2,swipe:68,leap:80,bite:54,rest:.9,interrupt:34,gripDuration:2.2,dragSpeed:95};
let roster=[],seed=7919,active=false,paused=false,last=0,acc=0,speed=1,fx=true,report=null;
const alive=a=>!a.g.dead&&!a.surrendered,cl=M.clamp,dist=M.dist;
function log(t){S.battle.log.unshift({time:Math.floor(S.battle.time),text:t});S.battle.log.length=Math.min(40,S.battle.log.length);}
function fighter(i,training=1,gear=1){const g=M.makeGladiator(0,false);g.id='test-'+i;g.role='Soldat';g.traits=[];g.name=['Cassius','Varro','Drusus','Titus','Aquila'][i];const base=[20,30,53][training];for(const k in g.stats)g.stats[k]=cl(base+M.rnd(-6,6),1,100);for(const k in g.moves)g.moves[k]=cl(base+M.rnd(-5,5),1,100);for(const k in g.mastery)g.mastery[k]=cl(base+M.rnd(-5,5),1,100);for(const p of Object.values(g.body)){p.strength=base;p.agility=base;}g.fatigue=0;g.blood=100;g.training=training;g.loadout=gear;g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};
if(gear){const q=gear-1,w=['gladius','spear','club','spear','gladius'][i];g.enemyGear.weapon=M.makeItem('weapon',w,q);if(i%3===0)g.enemyGear.shield=M.makeItem('shield','smallshield',q);if(i%3===2||gear===2)g.enemyGear.armor.chestplate=M.makeItem('armor','chestplate',q,'leather');}return g;}
function generate(n=3,t=1,e=1,s=seed){S.rng=s>>>0;roster=Array.from({length:n},(_,i)=>fighter(i,t,e));return roster;}
function setup(s=seed,team=roster){S.rng=s>>>0;S.roster=M.copy(team);S.fallen=[];S.records=[];S.history=[];S.inventory=[];const actors=S.roster.map((g,i)=>{const a=M.createCombatActor(g,0,i,72);a.x=290-Math.abs(i-(team.length-1)/2)*22;a.y=390+(i-(team.length-1)/2)*67;a.openingRush=true;return a;});
const g=M.makeGladiator(0,true);g.name='Rex Vetus';g.id='rex';g.role='Soldat';g.traits=[];g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};for(const k in g.stats)g.stats[k]=48;g.stats.will=100;g.stats.morale=100;const l=M.createCombatActor(g,1,0);Object.assign(l,{rex:true,x:740,y:390,r:30,tissue:{head:160,chest:290,belly:140,front:120,rear:100},wounds:[],blood:100,bleeding:0,trauma:0,velocity:0,heading:Math.PI,turn:0,evadeUntil:0,scarSeed:0,mode:'stalk',clock:0,cool:1.8,energy:100,pounceCD:1,hitCount:0,bites:0,interruptDamage:0,z:0,deathAt:0,paw:1,grabs:0,interruptions:0,gripKills:0,gripAborts:0,rescuedRisen:0,displayCycle:0});actors.push(l);
S.battle={id:'rex-test',trainingLocked:team.length>0&&team.every(g=>g.training===0),actors,opponent:'Rex Vetus',time:0,type:'rex-test',league:0,log:[],paused:false,result:null,obstacles:[],width:1040,height:720,moralePressure:[0,0],lastSave:0,groundWeapons:[],dropped:[]};M.stains=[];M.limbs=[];M.swings=[];M.floaters=[];M.shake=0;for(const p of [...M.fx,...M.shots])p.active=false;report=null;return S.battle;}
function blood(x,y,n){M.emit(x,y-12,n,'#a2392e',85);M.stains.push({x:x+M.rnd(-8,8),y:y+M.rnd(-5,5),r:M.rnd(2,6)});if(M.stains.length>300)M.stains.shift();}
function release(l,rescued=false){const t=S.battle.actors.find(a=>a.id===l.victim);if(t){delete t.grabbedBy;delete t.draggedBy;t.kx=t.ky=0;if(rescued&&!t.g.dead){l.interruptions++;t.rescuedAt=S.battle.time;t.rescueCounted=false;const canRise=M.health(t.g)>37&&t.g.body.head.hp>12&&t.g.body.neck.hp>9&&t.g.body.chest.hp>10&&t.g.blood>=28;if(canRise){t.down=false;t.fallDuration=2.3;t.fallTimer=2.3;t.riseDuration=1.35;t.riseAttempted=false;t.riseHoldChecked=false;t.riseHold=0;t.state='fallen';}else t.fallTimer=Math.max(t.fallTimer,1.2);}else if(!t.g.dead)t.fallTimer=Math.max(t.fallTimer,1.2);}l.victim=null;l.interruptDamage=0;}
function beginGrip(l,t){l.gripFace=t.x>=l.x?1:-1;l.victim=t.id;l.grabs++;l.gripType=M.rng()<.65?'head':'body';l.interruptDamage=0;t.grabbedBy=l.id;t.draggedBy=l.id;t.wind=0;t.pendingStrike=null;t.swing=0;t.kx=t.ky=0;t.fallTimer=Math.max(2.3,t.fallTimer);t.fallDuration=Math.max(t.fallDuration,t.fallTimer);const part=t.g.body[l.gripType==='head'?'head':'chest'],damage=Math.min(12,Math.max(0,part.hp-20));part.hp-=damage;part.pain=Math.min(100,part.pain+18);part.bleed+=.6;part.grade=M.injuryGrade(part);t.g.blood=Math.max(0,t.g.blood-2);t.taken+=damage;l.damage+=damage;M.recordDamage(l,'grip',damage);if(damage>0){const point=M.contactAnchor({...t,down:true},l.gripType==='head'?'head':'chest');blood(point.x,point.y+12,6);t.hit=.23;t.bloodMarks=t.bloodMarks||{};t.bloodMarks[l.gripType==='head'?'head':'chest']=1;}state(l,'drag',P.gripDuration);log('Rex packt '+t.g.name+' und zieht ihn von der Gruppe weg!');}
function state(l,mode,duration){l.mode=mode;l.clock=0;l.duration=mode==='evade'?duration*1.3:duration;if(['snarl','roar','threaten'].includes(mode)&&fx)M.rexHiss?.(mode);}
function injury(l){return cl(l.trauma/600+(100-l.blood)/180,0,1);}
function dieLion(l,a){if(l.g.dead||S.battle.trainingLocked)return;release(l,!!l.victim);l.g.dead=true;l.down=true;l.death=true;l.z=0;l.deathAt=S.battle.time;state(l,'dead',99);log((a?a.g.name+' streckt Rex Vetus nieder.':'Rex bricht an seinen Verletzungen zusammen.'));}
M.rexReceive=(a,l,projectile,snapshot)=>{if(l.g.dead)return;const ef=snapshot||M.effective(a),w=ef.w;if(!projectile&&dist(a,l)>ef.range+l.r+12)return;const accuracy=cl(-.30+a.g.stats.dexterity*.024+a.g.stats.experience*.010-(l.mode==='leap'?.30:l.mode==='sprint'?.26:l.velocity>125?.25:.09),.12,.96);if(M.rng()>accuracy)return;
let damage=ef.damage*M.rnd(.78,1.22)*M.spacingFactor(w,dist(a,l),ef.range)*(a.energy<15?.55:1)*1.10;if(w.id==='fist')damage*=.7;const rear=Math.abs(M.angleDiff(M.angle(l,a),l.a))>2.1;if(rear)damage*=1.15;
const roll=M.rng(),part=rear?(roll<.58?'rear':'belly'):roll<.10?'head':roll<.45?'chest':roll<.76?'belly':'front';const woundDamage=damage/P.resilience;const locked=S.battle.trainingLocked;l.tissue[part]=Math.max(locked?1:0,l.tissue[part]-woundDamage);l.trauma=locked?Math.min(700,l.trauma+woundDamage):l.trauma+woundDamage;l.blood=Math.max(locked?16:0,l.blood-woundDamage*(w.bladed?.13:.045));l.bleeding+=woundDamage*(w.bladed?.006:.0015);
const x={head:42,chest:22,belly:-8,front:28,rear:-31}[part],y={head:-49,chest:-40,belly:-33,front:-20,rear:-21}[part];l.wounds.push({part,x:x+M.rnd(-8,8),y:y+M.rnd(-7,7),size:cl(damage/9,2,8),cut:!!w.bladed,phase:M.rnd(0,6.28)});if(l.wounds.length>36)l.wounds.shift();
if(damage>24)log(a.g.name+' trifft Rex '+({head:'am Kopf',chest:'an der Brust',belly:'in die Flanke',front:'am Vorderlauf',rear:'am verletzten Hinterlauf'})[part]+'.');l.taken+=damage;a.damage+=damage;M.recordDamage(a,ef.attackKey||a.lastAttackKey||'slash',damage);a.contactPoint={x:l.x,y:l.y-30};l.hit=.24;l.recoilAngle=M.angle(a,l);l.interruptDamage+=damage;if(w.item)w.item.blood=Math.min(1,(w.item.blood||0)+damage/55);blood(l.x,l.y,Math.min(22,4+damage/3));
if(l.tissue.head<=0||l.tissue.chest<=0||l.blood<=15||l.trauma>700){dieLion(l,a);return;}
if(['drag','maul'].includes(l.mode)&&l.interruptDamage>=P.interrupt){release(l,true);l.escapeAngle=M.angle(a,l);state(l,'evade',.6);l.cool=.65;log(a.g.name+' zwingt Rex, sein Opfer loszulassen!');}
else if(damage>24&&!['leap','sprint','drag','maul'].includes(l.mode)&&S.battle.time>(l.recoilUntil||0)){l.recoilUntil=S.battle.time+1.4;l.escapeAngle=M.angle(a,l)+(M.rng()-.5)*1.1;state(l,'evade',.48);l.cool=.35;}
};
function hurt(l,t,kind){if(!t||!alive(t))return;const old=t.taken,wasDead=t.g.dead;const dmg=kind==='bite'?P.bite:kind==='leap'?P.leap:P.swipe;const ef={...M.effective(l),damage:dmg,range:kind==='leap'?100:78,attackKey:kind,partId:kind==='bite'?'neck':undefined,w:{id:'rex-'+kind,name:kind==='bite'?'Kehlbiss':'Pranken',damage:dmg,range:78,weight:kind==='leap'?8:3,pen:.2,crit:1.30,bladed:false,ammo:0,block:0}};l.a=M.angle(l,t);l.lastAttackKey=kind;M.hit(l,t,false,ef);if(t.taken>old){l.hitCount++;if(kind==='leap'){M.knockdown(t,'Von Rex angesprungen',2.3);t.kx+=Math.cos(l.a)*95;t.ky+=Math.sin(l.a)*95;}if(kind==='bite'&&t.g.body.neck.hp<9&&!t.g.dead)M.death(t,'Tödlicher Kehlbiss',l);if(!wasDead&&t.g.dead&&kind==='bite')l.bites++;if(fx)M.shake=Math.max(M.shake,kind==='swipe'?4:kind==='leap'?11:7);log(kind==='bite'?l.g.name+' beißt '+t.g.name+'.':kind==='leap'?l.g.name+' reißt '+t.g.name+' um!':l.g.name+' trifft '+t.g.name+' mit der Pranke.');}return t.taken>old;}
function walk(l,tx,ty,v,dt,faceTarget=null){const dx=tx-l.x,dy=ty-l.y,d=Math.hypot(dx,dy),desired=Math.atan2(dy,dx);l.velocity+=(v-l.velocity)*Math.min(1,dt*9);const step=Math.min(d,l.velocity*dt),turn=M.angleDiff(desired,l.heading);l.heading+=cl(turn,-dt*5.5,dt*5.5);l.turn+=(turn-l.turn)*Math.min(1,dt*8);l.x=cl(l.x+Math.cos(l.heading)*step,95,945);l.y=cl(l.y+Math.sin(l.heading)*step,165,615);l.moveSpeed=step/dt;const facing=faceTarget?M.angle(l,faceTarget):l.heading;l.a+=cl(M.angleDiff(facing,l.a),-dt*7,dt*7);l.phase+=step*.08;}
function escape(l,targets,dt,speed){let dx=0,dy=0;for(const a of targets){const d=Math.max(20,dist(l,a));dx+=(l.x-a.x)/(d*d);dy+=(l.y-a.y)/(d*d);}const side=l.side||1;dx+=(520-l.x)*.000022+80*(1/Math.max(30,l.x-70)**2-1/Math.max(30,970-l.x)**2);dy+=(385-l.y)*.000035+65*(1/Math.max(30,l.y-140)**2-1/Math.max(30,640-l.y)**2);const an=Math.atan2(dy,dx)+side*.40;l.escapeAngle=an;walk(l,l.x+Math.cos(an)*160,l.y+Math.sin(an)*160,speed,dt,l.mode==='evade'?targets.reduce((a,b)=>dist(l,a)<dist(l,b)?a:b):null);}
function alignGrip(l,t,dt){const face=l.gripFace||(t.x>=l.x?1:-1);l.a=face>0?0:Math.PI;t.a=face>0?Math.PI:0;t.fallSide=1;t.kx=t.ky=0;const point=M.contactAnchor({...t,down:true},l.gripType==='head'?'head':'chest'),dx=l.x+face*62-point.x,dy=l.y-12-point.y,k=Math.min(1,dt*12,240*dt/Math.max(1,Math.hypot(dx,dy)));t.x=cl(t.x+dx*k,105,935);t.y=cl(t.y+dy*k,175,610);const contact=M.contactAnchor({...t,down:true},l.gripType==='head'?'head':'chest');l.x=cl(l.x+(contact.x-face*62-l.x)*Math.min(1,dt*8),95,945);l.y=cl(l.y+(contact.y+12-l.y)*Math.min(1,dt*8),165,615);}
function lionStep(l,dt){l.hit=Math.max(0,l.hit-dt);l.clock+=dt;l.cool-=dt;l.pounceCD-=dt;l.energy=Math.min(100,l.energy+dt*8);if(l.g.dead)return;l.blood=Math.max(S.battle.trainingLocked?16:0,l.blood-l.bleeding*dt*.28);if(l.blood<=15){dieLion(l);return;}if(l.bleeding>.3){l.drip=(l.drip||0)-dt;if(l.drip<=0){l.drip=.32+1/(l.bleeding+1);M.stains.push({x:l.x,y:l.y,r:Math.min(5,1+l.bleeding)});if(M.stains.length>300)M.stains.shift();}}
let t=S.battle.actors.find(a=>a.id===l.target);const targets=S.battle.actors.filter(a=>a.team===0&&alive(a));if(!targets.length)return;
if(!t||!alive(t)||l.mode==='stalk'&&l.clock>1.8){t=targets.map(a=>({a,score:dist(l,a)+M.health(a.g)*1.15+targets.filter(b=>b!==a&&dist(a,b)<115).length*70+(M.usableShield(a)?30:0)})).sort((a,b)=>a.score-b.score)[0].a;l.target=t.id;if(l.mode==='stalk')l.clock=0;}
const d=dist(l,t),nearest=Math.min(...targets.map(a=>dist(l,a))),hurtLeg=1-l.tissue.rear/100,condition=cl(1-injury(l)*.32-hurtLeg*.15,.48,1);l.moveSpeed=0;
if(l.mode==='leap'){const p=cl(l.clock/l.duration,0,1),q=p*p*(3-2*p);l.x=l.sx+(l.ex-l.sx)*q;l.y=l.sy+(l.ey-l.sy)*q;l.z=Math.sin(p*Math.PI)*43;l.phase+=dt*12;if(!l.leapHit&&p>.15&&dist(l,t)<67){l.leapHit=true;l.leapLanded=hurt(l,t,'leap');}if(p>=1){l.z=0;l.pounceCD=3.5;l.cool=.6;if(l.leapLanded&&alive(t)&&t.fallTimer>0&&dist(l,t)<80){beginGrip(l,t);}else{state(l,'evade',.65);l.side*=-1;}}return;}
if(l.mode==='sprint'){walk(l,t.x,t.y,385*condition,dt);l.energy=Math.max(0,l.energy-dt*22);if(d<137||l.clock>.9){l.sx=l.x;l.sy=l.y;const an=M.angle(l,t),len=Math.min(160,Math.max(15,dist(l,t)-28));l.ex=cl(l.x+Math.cos(an)*len,95,945);l.ey=cl(l.y+Math.sin(an)*len,165,615);l.leapHit=false;l.leapLanded=false;state(l,'leap',.26);}return;}
if(l.mode==='crouch'){l.velocity*=Math.exp(-dt*12);l.a+=cl(M.angleDiff(M.angle(l,t),l.a),-dt*7,dt*7);if(l.clock>=l.duration)state(l,'sprint',1);return;}
if(['drag','maul'].includes(l.mode)){t=S.battle.actors.find(a=>a.id===l.victim);if(!t||!alive(t)){l.gripAborts++;release(l);state(l,'evade',.7);return;}const friends=targets.filter(a=>a!==t&&!a.down);t.fallTimer=Math.max(2.3,t.fallTimer);t.state='fallen';t.grabbedBy=l.id;t.draggedBy=l.id;t.moveSpeed=0;
if(l.mode==='drag'){if(friends.length)escape(l,friends,dt,P.dragSpeed*condition);else{const a=l.heading;walk(l,l.x+Math.cos(a)*80,l.y+Math.sin(a)*80,P.dragSpeed*.7,dt);}alignGrip(l,t,dt);if(l.clock>=P.gripDuration-.6)state(l,'maul',.6);}
else{l.velocity*=Math.exp(-dt*10);alignGrip(l,t,dt);if(l.clock>=l.duration){t.hit=.23;M.death(t,l.gripType==='head'?'Tödlicher Biss':'Tödlicher Angriff am Boden',l);l.bites++;l.gripKills++;if(fx)M.shake=Math.max(M.shake,8);log('Die Hilfe kommt zu spät für '+t.g.name+'.');release(l);state(l,'evade',.7);l.pounceCD=2.4;}}
return;}
if(l.mode==='evade'||l.mode==='recoil'){escape(l,targets,dt,265*condition);if(l.clock>=l.duration){state(l,nearest>110&&l.energy>35?'threaten':'recover',.7+hurtLeg*.4);l.pounceCD=Math.max(l.pounceCD,1);}return;}
if(l.mode==='recover'){if(nearest<125)escape(l,targets,dt,90*condition);else{l.velocity*=Math.exp(-dt*8);l.a=M.angle(l,t);}if(l.clock>=l.duration)state(l,'stalk',0);return;}
if(['snarl','roar','threaten'].includes(l.mode)){l.velocity*=Math.exp(-dt*8);l.a=M.angle(l,t);if(nearest<62){state(l,'evade',.4);return;}if(l.clock>=l.duration)state(l,'crouch',.18);return;}
if(l.mode==='swipe'){if(!l.swiped&&l.clock>.16){hurt(l,t,'swipe');l.swiped=true;}if(l.clock>.34){state(l,'evade',.65);l.cool=.8;}return;}
if((t.fallTimer>0||t.down)&&d<70&&l.cool<=0){beginGrip(l,t);return;}
if(l.energy<22){state(l,'recover',1.1);return;}
if(nearest<80&&l.cool<=0){state(l,'swipe',.34);l.swiped=false;l.paw*=-1;l.energy-=8;return;}
if(nearest<145&&l.pounceCD>0){escape(l,targets,dt,200*condition);return;}
if(l.pounceCD<=0&&d<400&&l.cool<=0){l.displayCycle++;state(l,['snarl','threaten','roar'][l.displayCycle%3],l.displayCycle%3===2?.55:.38);l.side=M.rng()<.5?-1:1;return;}
const an=M.angle(t,l)+(l.side||1)*.95,radius=210;walk(l,t.x+Math.cos(an)*radius,t.y+Math.sin(an)*radius,145*condition,dt,t);
}
function result(){const b=S.battle,l=b.actors.at(-1),hum=b.actors.slice(0,-1),dead=hum.filter(a=>a.g.dead),surv=hum.filter(a=>!a.g.dead),severe=surv.filter(a=>a.down||Object.values(a.g.body).some(p=>p.grade>=3));return {winner:l.g.dead?'Gladiatoren':b.time>=180?'Zeitlimit':'Rex Vetus',time:b.time,dead:dead.length,severe:severe.length,survivors:surv.length,damage:hum.reduce((n,a)=>n+a.damage,0),lionDamage:l.damage,hits:l.hitCount,bites:l.bites,grabs:l.grabs,interruptions:l.interruptions,gripKills:l.gripKills,rescuedRisen:l.rescuedRisen};}
function step(dt){const b=S.battle;if(!b||b.result)return;b.time+=dt;const l=b.actors.at(-1);for(const a of b.actors.slice(0,-1)){const x=a.x,y=a.y,p=a.phase;if(a.draggedBy===l.id&&!a.g.dead){a.state='fallen';a.moveSpeed=0;}else if(a.openingRush&&!a.g.dead&&dist(a,l)>155&&b.time<2.2){const an=M.angle(a,l),v=M.effective(a).speed*1.7;a.a=an;a.x+=Math.cos(an)*v*dt;a.y+=Math.sin(an)*v*dt;a.state='charge';a.target=l.id;}else{a.openingRush=false;M.resolveStrike(a,dt*1.12);M.updateActor(a,dt*1.12);}M.updateLocomotion(a,x,y,p,dt*1.12);if(a.rescuedAt!==undefined&&!a.rescueCounted&&!a.g.dead&&!a.down&&a.fallTimer<=0){a.rescueCounted=true;l.rescuedRisen++;}}lionStep(l,dt);if(l.mode!=='leap')M.collisionPairs(b);M.stepProjectiles(dt);M.groundPools(dt);M.effectsStep(dt);M.presentationStep(dt);const standing=b.actors.slice(0,-1).filter(a=>alive(a)&&!a.down);if(l.g.dead||!b.actors.slice(0,-1).some(alive)||b.time>=180||!standing.length&&!b.actors.slice(0,-1).some(a=>alive(a)&&!a.surrendered)){b.result=report=result();active=false;release(l);}for(const a of b.actors)if(!Number.isFinite(a.x+a.y))throw Error('Ungültige Position');}
const scenarios=[[1,0,1],[2,0,1],[3,0,1],[3,1,1],[4,1,1],[5,2,2],[5,1,1],[5,0,1]];
function batch(n=100,offset=104729){const rows=[];fx=false;for(let j=0;j<scenarios.length;j++){const [count,train,gear]=scenarios[j];let wins=0,loss=0,time=0,timeout=0,grabs=0,interruptions=0;for(let i=0;i<n;i++){const s=offset+j*100003+i*7919;generate(count,train,gear,s);setup(s);while(!S.battle.result)step(1/60);wins+=report.winner==='Gladiatoren';loss+=report.dead;time+=report.time;timeout+=report.winner==='Zeitlimit';grabs+=report.grabs;interruptions+=report.interruptions;}rows.push({count,train,gear,n,wins,rate:wins/n,loss:loss/n,time:time/n,timeout,grabs,interruptions});}fx=true;return rows;}

// Own four-legged raster rig, consistent world scale in every state.
M.drawRex=(ctx,l)=>{const t=S.battle?.time??M.rexClock??0,dead=l.g.dead,death=dead?cl((t-l.deathAt)/.85,0,1):0,face=Math.cos(l.a)>=0?1:-1,p=l.phase||0,m=l.mode,leap=m==='leap',bite=['drag','maul'].includes(m),threat=m==='threaten',roar=m==='roar',crouch=m==='crouch',swipe=m==='swipe',run=['sprint','evade'].includes(m),moving=l.moveSpeed>8,damage=injury(l),strain=(1-l.tissue.rear/100),gait=moving?Math.min(1.5,l.moveSpeed/160):0,cycle=Math.sin(p),flex=dead?0:leap?-5:crouch?7:run?cycle*7:Math.sin(p*2)*gait*3,breath=dead?0:Math.sin(t*(3+damage*4))*(.7+damage*1.4);
const R=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));},poly=(pts,c)=>{ctx.fillStyle=c;ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(Math.round(x),Math.round(y)):ctx.moveTo(Math.round(x),Math.round(y)));ctx.closePath();ctx.fill();},bone=(x,y,xx,yy,w,c)=>{const n=Math.max(1,Math.ceil(Math.hypot(xx-x,yy-y)/2));for(let i=0;i<=n;i++)R(x+(xx-x)*i/n-w/2,y+(yy-y)*i/n-w/2,w,w,c);};
const skin='#b18a50',light='#d0ac6c',shade='#7c582f',dark='#49341f';
ctx.save();ctx.translate(Math.round(l.x),Math.round(l.y));if(l.cute)ctx.scale(l.cute,l.cute);ctx.fillStyle='#30271c55';ctx.beginPath();ctx.ellipse(0,3,64,12,0,0,Math.PI*2);ctx.fill();ctx.translate(0,-l.z+death*18);ctx.scale(face,1);ctx.rotate(death*-.28);const recoil=l.hit>0?Math.sin(l.hit/.24*Math.PI)*3:0;
// Three independently articulated torso stations: pelvis, flexible lumbar spine, shoulder.
const pelvis={x:-32+(run?cycle*3:0),y:-35+(crouch?8:0)+(run?-cycle*4:Math.sin(p)*gait*2)+strain*2},shoulder={x:27+(run?-cycle*3:0)-recoil,y:-40+(crouch?9:roar?-5:0)+(run?cycle*4:Math.sin(p+1)*gait*2)+breath},spine={x:-4,y:-38+flex+breath};
const spineY=x=>x<spine.x?pelvis.y+(spine.y-pelvis.y)*cl((x-pelvis.x)/(spine.x-pelvis.x),0,1):spine.y+(shoulder.y-spine.y)*cl((x-spine.x)/(shoulder.x-spine.x),0,1);
let tx=pelvis.x-7,ty=pelvis.y;for(let i=1;i<=11;i++){const nx=pelvis.x-7-i*3.8,ny=pelvis.y+Math.sin(t*4.5-i*.34+(run?p*.5:0))*9+i*.8;bone(tx,ty,nx,ny,3,shade);tx=nx;ty=ny;}R(tx-4,ty-2,8,7,dark);
function wound(part,ox=0,oy=0){for(const w of l.wounds){if(w.part!==part)continue;const x=w.x+ox,y=w.y+oy,n=w.size;R(x-n-2,y-n*.4,n*2+4,n+3,'#632c23');R(x-n,y+n*.5,n*1.4,n*.85,'#7b3025');R(x-n+1,y,n*2-2,Math.max(2,n*.5),'#a44432');if(w.cut){bone(x-n,y+2,x+n,y-n*.4,2,'#df8060');R(x-1,y+n*.3,2,n+2,'#8c2d23');}else R(x-n*.4,y-2,n,3,'#6a3e38');for(let j=0;j<3;j++)R(x+Math.sin(w.phase+j)*n*1.6,y+j*2,n*.65,2,'#853628');}}
function leg(front,far){const root=front?shoulder:pelvis,phase=p+(far?Math.PI:0)+(front?.5:2.0),swing=Math.sin(phase),lift=Math.max(0,Math.cos(phase))*gait*13,limp=!front&&!far;const stride=dead?20:leap?(front?25:-25):swing*(run?23:14)*Math.min(1,gait),foot={x:root.x+stride+(far?-4:0),y:dead?-5:leap?-16:-lift+(limp?-(3+strain*6):0)},knee={x:root.x+(front?-4:10)+stride*.42,y:root.y*.48+(limp?3:0)},ankle={x:foot.x+(front?-3:5),y:foot.y-7};bone(root.x,root.y,knee.x,knee.y,front?10:11,far?shade:skin);bone(knee.x,knee.y,ankle.x,ankle.y,6,far?shade:light);bone(ankle.x,ankle.y,foot.x,foot.y,5,far?shade:skin);R(foot.x-4,foot.y-3,12,5,far?shade:light);for(let j=0;j<3;j++)R(foot.x+5+j*2,foot.y,1,2,'#e4d3a4');if(!far){if(limp){R(knee.x-4,knee.y,7,3,'#794231');R(knee.x-1,knee.y-2,5,2,'#b56746');}wound(front?'front':'rear',root.x-(front?28:-31),knee.y+20);}}
leg(false,true);leg(true,true);
const top=[[pelvis.x-12,pelvis.y-2],[pelvis.x-6,pelvis.y-11],[spine.x,spine.y-7],[shoulder.x,shoulder.y-10],[shoulder.x+15,shoulder.y+2],[shoulder.x+7,shoulder.y+16],[spine.x,spine.y+11],[pelvis.x-8,pelvis.y+10]];poly(top,dark);poly(top.map(([x,y],i)=>[x+(i<2?2:i===4?-2:0),y+(i<4?3:-3)]),skin);bone(pelvis.x-4,pelvis.y-7,spine.x,spine.y-5,4,light);bone(spine.x,spine.y-5,shoulder.x-1,shoulder.y-7,4,light);for(let i=0;i<5;i++){const x=-19+i*7,y=spineY(x);bone(x,y-3,x-3,y+7,2,shade);R(x,y-4,2,2,light);}wound('belly',spine.x+4,spine.y+38);wound('chest',shoulder.x-27,shoulder.y+40);
leg(false,false);if(!swipe&&!threat)leg(true,false);else{const k=threat?.55+Math.sin(l.clock*12)*.22:Math.sin(cl(l.clock/.34,0,1)*Math.PI);bone(shoulder.x,shoulder.y,40+k*24,-28-k*12,10,skin);R(43+k*24,-31-k*12,15,8,light);for(let i=0;i<4;i++)R(54+k*24,-30-k*12+i*2,7,1,'#eadabb');}
// Neck follows shoulders with delayed counter-motion; head and jaw move independently.
const gripPoint=bite&&M.rexContact?.id===l.victim?M.rexContact:null,headAngle=bite?Math.sin(t*24)*.14:roar?-.28:m==='snarl'?-.14:crouch?.12:-Math.sin(p-.5)*gait*.07;const desiredNeckX=gripPoint?(gripPoint.x-l.x)*face-(Math.cos(headAngle)*26-Math.sin(headAngle)*8):shoulder.x+9+(run?Math.sin(p-.7)*3:0),desiredNeckY=gripPoint?gripPoint.y-l.y-(Math.sin(headAngle)*26+Math.cos(headAngle)*8):shoulder.y-2+(bite?22:roar?-11:threat?-3:crouch?5:leap?1:Math.sin(p-.8)*gait*2);const nx=desiredNeckX-shoulder.x,ny=desiredNeckY-shoulder.y,nk=Math.min(1,28/Math.max(1,Math.hypot(nx,ny))),neckX=shoulder.x+nx*nk,neckY=shoulder.y+ny*nk;M.rexNeckLength=Math.hypot(neckX-shoulder.x,neckY-shoulder.y);bone(shoulder.x,shoulder.y,neckX+6,neckY,20,skin);ctx.save();ctx.translate(neckX,neckY);ctx.rotate(headAngle);
poly([[-17,-12],[-8,-23],[6,-27],[20,-19],[27,-8],[26,9],[15,23],[0,27],[-14,16],[-22,2]],'#48301f');poly([[-13,-10],[-6,-20],[7,-23],[18,-16],[22,-5],[20,10],[11,20],[-2,22],[-13,11]],'#78502c');for(let i=0;i<13;i++){const a=i*.51,sway=Math.sin(t*6-i*.7)*1.5+Math.sin(p-1)*gait*2;R(Math.cos(a)*18-3+sway,Math.sin(a)*21-3,5,8,i%2?'#956538':'#5b3d25');}
R(5,-20,8,8,skin);R(7,-19,4,4,'#513520');R(5,-20,3,3,'#241c16');poly([[3,-12],[18,-12],[26,-4],[28,7],[18,13],[6,10],[-1,3]],light);R(19,-5,14,10,'#d5b478');R(29,-5,6,5,'#30261f');R(17,-9,8,3,'#453020');R(21,-8,3,2,'#db6545');R(23,-8,1,2,'#f3c778');R(7,-12,2,12,'#885039');R(9,-10,1,9,'#dec08a');wound('head',-42,49);
const jaw=dead?6:bite?4+(Math.sin(t*25)+1)*5:roar?15+Math.sin(t*22)*2:m==='snarl'?10+Math.sin(t*30)*2:run?5:2+Math.max(0,breath);R(19,4,14,jaw,'#2e211c');R(17,6+jaw,17,4,skin);R(23,4,3,6,'#f3e0ad');R(30,4,2,4,'#f3e0ad');R(25,6+jaw,3,-3,'#edc98e');if(l.bites||l.hitCount>1)R(19,8+jaw,12,3,'#8c3326');if(m==='snarl'){for(let j=0;j<3;j++)R(36+j*4,2+Math.sin(t*20+j)*3,2,1,'#d4b77999');}ctx.restore();ctx.restore();};

// ---------- KAPITEL „DIE SACHE MIT DEM LÖWEN“ (Testfassung) ----------
// Nach dem Sklavenhändler: Waffen kaufen, Kaserne, Arena, Motivationsrede, Lehrvideo des Schmieds, Löwenhelm-Fantasie,
// Teamaufstellung, Spionage (0 %), Gitter + Brüll-Nahaufnahme, echter Löwenkampf (geskriptete Niederlage), Bilanz, neue Aufgabe.
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const W=()=>M.workshop?.state,smithName=()=>W()?.master?.name||'Der Schmied';
const L=()=>{const s=S.lion??={stage:'',recruits:[],base:[]};return s;};
const setStage=st=>{L().stage=st;M.persist?.();};
const recruits=()=>L().recruits.map(id=>S.roster.find(g=>g.id===id)).filter(Boolean);
const first=g=>String(g?.name||'Rekrut').split(' ')[0];
// ---------- Tierlaute: eigenes Audio (kein Eingriff in die Spielmusik) ----------
let actx=null;document.addEventListener('pointerdown',()=>{if(!actx){const AC=window.AudioContext||window.webkitAudioContext;if(AC)actx=new AC();}actx?.resume?.();},{capture:true});
function beast(kind){if(!actx)return;const now=actx.currentTime,len={growl:2.2,roar:2.4,snarl:.7,demo:.5}[kind]||1,buf=actx.createBuffer(1,Math.ceil(actx.sampleRate*len),actx.sampleRate),d=buf.getChannelData(0);let r=719;for(let i=0;i<d.length;i++){r=(Math.imul(r,1664525)+1013904223)>>>0;d[i]=(r/2147483648-1)*.6;}
 const src=actx.createBufferSource(),f=actx.createBiquadFilter(),f2=actx.createBiquadFilter(),g=actx.createGain();src.buffer=buf;f.type='bandpass';f2.type='lowpass';f2.frequency.value=kind==='roar'?900:500;
 const hi={growl:160,roar:420,snarl:1500,demo:2400}[kind],lo={growl:70,roar:85,snarl:400,demo:1800}[kind];f.frequency.setValueAtTime(hi,now);f.frequency.exponentialRampToValueAtTime(lo,now+len);f.Q.value=kind==='roar'?.9:.6;
 const peak={growl:.5,roar:1,snarl:.35,demo:.15}[kind];g.gain.setValueAtTime(.001,now);g.gain.exponentialRampToValueAtTime(peak,now+(kind==='roar'?.25:.1));if(kind==='growl')for(let i=1;i<6;i++)g.gain.setValueAtTime(peak*(i%2?.45:1),now+i*.36);g.gain.exponentialRampToValueAtTime(.001,now+len);
 src.connect(f);f.connect(f2);f2.connect(g);g.connect(actx.destination);src.start(now);src.stop(now+len);}
M.rexHiss=mode=>{if(S.battle?.rexTut)beast(mode==='roar'?'roar':'snarl');};
// ---------- Kampf: echter Kampf mit der vorhandenen Löwen-KI ----------
function lionActor(x,y){const rng=S.rng,g=M.makeGladiator(0,true);S.rng=rng;g.name='Rex Vetus';g.id='rex-'+Date.now();g.role='Soldat';g.traits=[];g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};for(const k in g.stats)g.stats[k]=48;g.stats.will=100;g.stats.morale=100;
 const l=M.createCombatActor(g,1,0);Object.assign(l,{rex:true,x,y,r:30,tissue:{head:160,chest:290,belly:140,front:120,rear:100},wounds:[],blood:100,bleeding:0,trauma:0,velocity:0,heading:Math.PI/2,turn:0,evadeUntil:0,scarSeed:0,mode:'stalk',clock:0,cool:1.8,energy:100,pounceCD:1,hitCount:0,bites:0,interruptDamage:0,z:0,deathAt:0,paw:1,grabs:0,interruptions:0,gripKills:0,gripAborts:0,rescuedRisen:0,displayCycle:0});return l;}
function startFight(){const team=recruits();if(!team.length){afterFight();return;}
 const actors=team.map((g,i)=>{const a=M.createCombatActor(g,0,i,72);a.x=420+(i-(team.length-1)/2)*60;a.y=420+Math.abs(i-(team.length-1)/2)*18;a.a=-Math.PI/2;return a;});
 const l=lionActor(520,230);l.a=Math.PI/2;actors.push(l);
 S.battle={id:'rex-tut-'+Date.now(),rexTut:true,trainingLocked:true,actors,opponent:'Rex Vetus',time:0,type:'rex-tut',league:0,log:[],paused:false,result:null,obstacles:[],width:1040,height:720,moralePressure:[0,0],moraleBonus:[0,0],lastSave:0,groundWeapons:[],dropped:[]};
 M.stains=[];M.limbs=[];M.swings=[];M.floaters=[];M.shake=0;for(const p of [...(M.fx||[]),...(M.shots||[])])p.active=false;setStage('fight');M.ui.render();}
function fightStep(dt){const b=S.battle;if(!b?.rexTut||b.result)return;b.time+=dt;const l=b.actors.find(a=>a.rex),hum=b.actors.filter(a=>!a.rex);
 for(const a of hum){const x=a.x,y=a.y,p=a.phase;if(a.draggedBy===l.id&&!a.g.dead){a.state='fallen';a.moveSpeed=0;}else{M.resolveStrike(a,dt*1.12);M.updateActor(a,dt*1.12);}M.updateLocomotion(a,x,y,p,dt*1.12);}
 lionStep(l,dt);if(l.mode!=='leap')M.collisionPairs(b);M.stepProjectiles(dt);
 // Sicherheitsnetz: zieht es sich zu lange, erledigt der Löwe die Übrigen (geskriptete Niederlage)
 if(b.time>120){b.force=(b.force||0)-dt;if(b.force<=0){b.force=2.2;const t=hum.find(a=>alive(a));if(t)M.death(t,'Von Rex Vetus zerfleischt',l);}}
 if(!hum.some(a=>!a.g.dead)){if(!b.endAt){b.endAt=b.time;release(l);}if(b.time-b.endAt>1.6&&!b.roared){b.roared=true;state(l,'roar',2.6);beast('roar');M.shake=10;}if(b.time-b.endAt>4.6){b.result={winner:'Rex Vetus'};defeat();}}}
const fixed=M.fixedStep;M.fixedStep=dt=>S.battle?.rexTut?fightStep(dt):fixed(dt);
function defeat(){const n=L().recruits.length,v=document.createElement('div');v.className='lion-defeat';v.innerHTML=`<div><b>NIEDERLAGE</b><span>${n} GLADIATOREN GEFALLEN</span><span>ÜBERLEBENDE: 0</span><small>Tippen</small></div>`;document.body.appendChild(v);setStage('aftermath');
 v.addEventListener('click',()=>{v.remove();S.battle=null;M.stains=[];M.limbs=[];M.ui.click('nav:home');M.ui.render();setTimeout(()=>playAftermath(),400);});}
// ---------- Filmbühne ----------
let film=null,clock=0;
function play(o){stopFilm();const v=document.createElement('div');v.className='smith-ceremony smith-intro lion-film no-smith-song'+(o.silent?' scene-silence':'');v.innerHTML='<div><div class="scene-bubble-slot"><div class="scene-bubble" id="lionBubble" hidden></div></div><canvas id="lionCanvas" width="660" height="420"></canvas><p id="lionText" aria-live="polite"></p></div>';document.body.appendChild(v);
 v.addEventListener('click',()=>{if(!film)return;if(film.line)film.ack=true;else if(film.beats[film.i]?.tapSkip)film.skip=true;});
 film={...o,view:v,i:-1,t:0,bt:0,line:null,shown:0,cam:{...(o.cam||{x:450,y:335,vw:300})},camTo:null};next();}
function stopFilm(){film?.view?.remove();film=null;}
const need=t=>Math.max(2.3,1.1+t.length*.062);
function next(){const f=film;f.i++;f.bt=0;f.shown=0;f.ack=false;f.skip=false;const b=f.beats[f.i];if(!b){const done=f.done;stopFilm();done?.();return;}b.do?.(f);f.line=b.say?{who:b.who||'s',text:b.say}:null;if(b.cam)f.camTo={...b.cam};}
function stepFilm(dt){const f=film;f.t+=dt;f.bt+=dt;const b=f.beats[f.i];if(!b)return;b.each?.(f,dt,f.bt);f.tick?.(f,dt);if(f.camTo){const k=Math.min(1,dt*(f.camTo.rate||2));for(const key of ['x','y','vw'])if(f.camTo[key]!=null)f.cam[key]+=(f.camTo[key]-f.cam[key])*k;}
 if(f.line)f.shown+=dt;const read=!f.line||f.ack||f.shown>=need(f.line.text),busy=b.until?!b.until(f):false;if(read&&!busy&&(f.bt>=(b.dur||0)||f.skip))next();else paintFilm();}
function speaker(who){const f=film;if(who==='s')return {name:smithName(),a:f.smith};if(who&&who[0]==='r'){const i=+who.slice(1)-1,a=f.rec?.[i];return {name:first(a?.g)||'Rekrut',a};}if(who==='cap')return {name:''};return {name:who};}
function paintFilm(){const f=film;if(!f)return;const c=$('lionCanvas');if(!c?.getContext)return;const g=c.getContext('2d');g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;f.paint(g,c.width,c.height,f);
 const el=$('lionBubble');if(el){if(!f.line||f.line.who==='cap'){el.hidden=true;}else{const s=speaker(f.line.who),key=s.name+'|'+f.line.text;if(el._key!==key){el._key=key;el.innerHTML='<b>'+esc(s.name)+'</b><span>'+esc(f.line.text)+'</span><i aria-hidden="true">▼</i>';el.classList.toggle('loud',/!$/.test(f.line.text)&&f.line.text===f.line.text.toUpperCase());}el.hidden=false;el.style.setProperty('--tail',(f.tailX?.(s.a)??50)+'%');el.classList.toggle('waiting',f.shown>=need(f.line.text)*.6);}}
 const t=$('lionText'),s=f.line?speaker(f.line.who):null,txt=f.line?(f.line.who==='cap'?f.line.text:s.name+': „'+f.line.text+'“'):'';if(t&&t.textContent!==txt)t.textContent=txt;}
const tick=M.ludusTick;M.ludusTick=dt=>{tick?.(dt);if(film){clock+=dt;if(clock>=1/30){stepFilm(Math.min(clock,.1));clock=0;}return;}guideTick(dt);};
// Figuren
function smithActor(x,y){const p=W().master,rng=S.rng,g=M.makeGladiator(0);S.rng=rng;Object.assign(g,{id:'lion-smith',name:p.name,height:p.height,weight:p.weight,muscle:58,fame:0,scars:[]});g.appearance={...p.appearance};g.equipment={weapon:null,secondary:null,shield:null,armor:{}};const items={sword:M.makeItem('weapon','gladius',2),hammer:M.makeItem('weapon','hammer',1)};g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};return {id:'lion-smith',g,items,team:0,x,y,a:Math.PI,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,forgeWorker:true,forgeHold:'beer',bloodMarks:{}};}
const pose=(a,o)=>Object.assign(a,{state:'idle',moveSpeed:0,traderPose:null,forgePose:'',...o});
function walker(a,dt){if(!a.to)return false;const dx=a.to[0]-a.x,dy=a.to[1]-a.y,d=Math.hypot(dx,dy),s=(a.to[2]||40)*dt;if(d<=s){a.x=a.to[0];a.y=a.to[1];a.to=null;a.state='idle';a.moveSpeed=0;return false;}a.x+=dx/d*s;a.y+=dy/d*s;a.state='move';a.moveSpeed=10;a.odo=(a.odo||0)+s;a.phase=a.odo*.267;if(Math.abs(dx)>.5)a.a=dx>0?0:Math.PI;return true;}
// ---------- Dorf-Szenen (Kulisse des Ludus) ----------
const SPOT={x:654,y:410},ROW=[[702,406],[728,414],[754,418],[780,414],[806,408]];
function villageFilm(beats,o={}){const rs=recruits().map((g,i)=>({id:'lr'+i,g,team:0,x:ROW[i][0],y:ROW[i][1],a:Math.PI,phase:i,state:'idle',energy:100,ammo:0,moveSpeed:0,bloodMarks:{}}));const sm=smithActor(o.smithAt?.[0]??SPOT.x,o.smithAt?.[1]??SPOT.y);
 play({...o,smith:sm,rec:o.noRecruits?[]:rs,cam:o.cam||{x:732,y:392,vw:240},bg:M.ludus.background(),beats,
  tailX:a=>a?Math.max(5,Math.min(95,((a.x-film.cam.x)/film.cam.vw+.5)*100)):50,
  tick:(f,dt)=>{for(const a of [f.smith,...f.rec])walker(a,dt);M.beltPlan?.(f.smith,f.t,f.belt||[[-99,null]]);},
  paint:(g,w,h,f)=>{const VW=f.cam.vw,VH=VW*h/w,k=w/VW,cx=Math.max(VW/2,Math.min(900-VW/2,f.cam.x)),cy=Math.max(VH/2,Math.min(670-VH/2,f.cam.y));g.fillStyle='#101b20';g.fillRect(0,0,w,h);g.save();g.scale(k,k);g.translate(-(cx-VW/2),-(cy-VH/2));g.drawImage(f.bg,0,0);M.ludusOverlay?.(g,f.t);
   const list=[f.smith,...f.rec].filter(a=>!a.hidden).sort((a,b)=>a.y-b.y);M.renderForgeActors(g,list);g.restore();}});}
// ---------- Arena-Szenen (vorhandener Arena-Renderer) ----------
function arenaFilm(beats,o){play({...o,beats,tailX:a=>{if(!a)return 50;const f=film;return Math.max(5,Math.min(95,((a.x-f.cam.x)/f.cam.vw+.5)*100));},
 tick:(f,dt)=>{M.rexClock=f.t;for(const a of f.actors){if(a.rex){a.clock=(a.clock||0)+dt;a.hit=Math.max(0,(a.hit||0)-dt);}else{const x=a.x,y=a.y;walker(a,dt);}}o.tick?.(f,dt);for(const p of f.fx){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=160*dt;}f.fx=f.fx.filter(p=>p.life>0);f.shake=Math.max(0,(f.shake||0)-dt*20);},
 paint:(g,w,h,f)=>{const c=g.canvas;M.renderStory(c,{cam:{x:f.cam.x,y:f.cam.y,vw:f.cam.vw,vh:f.cam.vw*h/w},arena:f.arena??1,level:f.level??1,gate:f.gate||0,actors:f.actors.filter(a=>!a.hidden),stains:f.stains,ground:f.ground,limbs:[],swings:[],fx:f.fx,shake:f.shake||0});f.overlay?.(g,w,h,f);}});}
function worldToScreen(f,w,h,x,y){const cam=f.cam,vh=cam.vw*h/w,scale=Math.max(Math.min(w/cam.vw,h/vh),Math.min(w/1040,h/720)),hw=w/scale/2,hh=h/scale/2,cx=hw*2>=1040?520:Math.max(hw,Math.min(1040-hw,cam.x)),cy=hh*2>=720?360:Math.max(hh,Math.min(720-hh,cam.y));return {x:w/2+(x-cx)*scale,y:h/2+(y-cy)*scale,s:scale};}
function sceneBlood(f,x,y,z,n,dir=1){for(let i=0;i<n;i++)f.fx.push({x,y,z,vx:dir*(20+Math.random()*60),vy:Math.random()*20-10,vz:20+Math.random()*70,life:.6+Math.random()*.6,size:2,color:i%3?'#aa3c36':'#87352e'});}
// Löwe für Szenen: niedliche Erinnerung (kleiner, schreckhaft) oder der echte
function sceneLion(x,y,cute){const l=lionActor(x,y);l.cute=cute?.7:0;l.mode='stalk';l.a=Math.PI;return l;}
// Zweigeteilter Löwe im Lehrvideo: vorhandene Darstellung, an der Körpermitte getrennt
const draw0=M.drawRex;M.drawRex=(ctx,l)=>{if(!l.split)return draw0(ctx,l);const face=Math.cos(l.a)>=0?1:-1,k=l.split.k,s=l.cute||1;for(const part of [-1,1]){ctx.save();ctx.beginPath();const x0=l.x+(part<0?-260:0)*1,x1=part<0?l.x:l.x+260;ctx.rect(Math.min(x0,x1),l.y-200,Math.abs(x1-x0),260);ctx.clip();ctx.translate(part*face*k*18*s,part*k*3);if(part===-face){ctx.translate(l.x,l.y);ctx.rotate(-face*k*.35);ctx.translate(-l.x,-l.y);}draw0(ctx,{...l,split:null});ctx.restore();}
 if(k>0){ctx.fillStyle='#7c2e28';ctx.fillRect(Math.round(l.x-3),Math.round(l.y-36*s),6,30*s);ctx.fillStyle='#a33a2c';ctx.fillRect(Math.round(l.x-2),Math.round(l.y-30*s),4,22*s);}};
// ---------- Nahaufnahmen (Pixelbild, ganzzahlig vergrößert) ----------
function buffer(f,FW,FH){const b=f.buf||(f.buf=document.createElement('canvas'));if(b.width!==FW||b.height!==FH){b.width=FW;b.height=FH;}const q=b.getContext('2d');q.imageSmoothingEnabled=false;q.clearRect(0,0,FW,FH);return {b,q,r:(x,y,w,h,c)=>{q.fillStyle=c;q.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}};}
function blit(g,w,h,b,shake=0,zoom=1){g.fillStyle='#0b0807';g.fillRect(0,0,w,h);const s=Math.max(w/b.width,h/b.height)*zoom;g.drawImage(b,Math.round(w/2-b.width*s/2+(Math.random()-.5)*shake*s),Math.round(h/2-b.height*s/2+(Math.random()-.5)*shake*s),Math.round(b.width*s),Math.round(b.height*s));}
// Gitter im Dunkeln, glühende Augen, dann zwei gewaltige Vorderpfoten ins Licht
function gatePaint(g,w,h,f){const {b,q,r}=buffer(f,160,100),t=f.t,paws=Math.max(0,Math.min(1,(f.paw||0)));
 r(0,0,160,100,'#090706');for(let y=0;y<100;y+=8)for(let x=(y/8%2)*10;x<160;x+=20){r(x,y,19,7,'#1a1512');}r(30,6,100,90,'#030202');
 const blink=(t%3.2)<.12;if(!blink&&f.eyes){r(68,34,5,3,'#e2a23a');r(87,34,5,3,'#e2a23a');r(70,35,1,1,'#2a1406');r(89,35,1,1,'#2a1406');}
 // Lichtkegel unten
 const lg=q.createLinearGradient(0,60,0,100);lg.addColorStop(0,'rgba(220,170,100,0)');lg.addColorStop(1,'rgba(220,170,100,.35)');q.fillStyle=lg;q.fillRect(30,60,100,40);
 // Pfoten: rechts humpelt (hebt sich ungleichmäßig)
 if(paws>0){const y0=100-paws*26;for(const [px,lift] of [[58,0],[96,Math.max(0,Math.sin(t*2.4))*3]]){const y=y0-lift;r(px-10,y,22,30,'#a07a46');r(px-10,y,22,3,'#c49a5c');r(px-9,y+6,20,2,'#7c582f');for(let i=0;i<4;i++){r(px-8+i*5,y+24,3,6,'#efe2c0');r(px-7+i*5,y+28,2,3,'#d8c8a0');}r(px+6,y+10,4,6,'#6b2a22');}r(96-6,y0+14,5,2,'#5a2a22');}
 // Gitterstäbe vorn
 for(let x=34;x<130;x+=12){r(x,0,5,100,'#3d3a36');r(x,0,1,100,'#6b675f');r(x+4,0,1,100,'#211f1c');}for(const y of [18,58])r(30,y,100,5,'#46423c');r(30,0,100,4,'#2a2723');
 blit(g,w,h,b,f.shake||0);}
// Extreme Nahaufnahme: Lefzen ziehen sich zurück, Zähne, gewaltiges Brüllen
function roarPaint(g,w,h,f){const {b,q,r}=buffer(f,160,100),t=f.t,k=Math.max(0,Math.min(1,f.roar||0)),snarl=Math.max(0,Math.min(1,f.snarl||0)),cx=80,cy=54;
 r(0,0,160,100,'#1a120c');const bg=q.createRadialGradient(80,40,4,80,40,90);bg.addColorStop(0,'rgba(200,140,70,.35)');bg.addColorStop(1,'rgba(0,0,0,0)');q.fillStyle=bg;q.fillRect(0,0,160,100);
 // Mähne
 for(let i=0;i<46;i++){const a=i/46*Math.PI*2,rr=40+Math.sin(i*1.7)*5+Math.sin(t*6+i)*1.2*(1+k*2);r(cx+Math.cos(a)*rr-5,cy+Math.sin(a)*rr*.9-6,11,13,i%3?'#6b4524':i%2?'#8a5a2c':'#4e3018');}
 for(let i=0;i<30;i++){const a=i/30*Math.PI*2,rr=32;r(cx+Math.cos(a)*rr-4,cy+Math.sin(a)*rr*.9-4,8,9,i%2?'#956538':'#7a4d28');}
 // Gesicht
 for(let y=-26;y<30;y++){const hw=Math.round(26*Math.sqrt(Math.max(0,1-Math.pow(y/30,2)))-(y>12?(y-12)*.5:0));if(hw>0)r(cx-hw,cy+y,hw*2,1,y<-8?'#b18a50':'#c39a5e');}
 r(cx-26,cy-28,8,8,'#7c582f');r(cx+18,cy-28,8,8,'#7c582f');r(cx-24,cy-26,4,4,'#3a2414');r(cx+20,cy-26,4,4,'#3a2414');
 // Narben, alte Wunden
 r(cx-16,cy-18,1,14,'#e3a1a3');r(cx-15,cy-10,1,6,'#e3a1a3');r(cx+9,cy-22,7,1,'#8c3326');r(cx+12,cy+4,9,2,'#7c2e28');
 // Stirnfalten beim Knurren, Augen
 const ey=cy-10;if(snarl>0)for(let i=0;i<3;i++)r(cx-8+i*1,cy-24+i*3,16-i*2,1,'#7c582f');
 for(const sd of [-1,1]){const ex=cx+sd*12;r(ex-5,ey-1,10,5,'#2a1a0e');r(ex-4,ey,8,3,'#e2a23a');r(ex-1,ey,2,3,'#120a04');r(ex-5,ey-2-Math.round(snarl*2),10,2,'#7c582f');}
 // Schnauze, Nase
 r(cx-12,cy+2,24,14,'#d5b478');r(cx-6,cy-2,12,7,'#3a2a20');r(cx-4,cy-2,8,2,'#5a4232');for(let i=0;i<6;i++){r(cx-11+i*2,cy+8,1,1,'#7c582f');r(cx+3+i*2,cy+8,1,1,'#7c582f');}
 // Maul: zu → Lefzen hoch (Zähne) → weit offen
 const open=Math.round(k*22),mw=Math.round(16+k*8),my=cy+14;r(cx-mw/2-1,my-1,mw+2,2+Math.round(snarl*2),'#5a3a24');
 if(snarl>0){for(let i=0;i<mw;i+=3)r(cx-mw/2+i,my,2,2+Math.round(snarl*2),'#f2ead8');r(cx-mw/2+1,my,3,5+Math.round(snarl*3),'#f7f0dc');r(cx+mw/2-4,my,3,5+Math.round(snarl*3),'#f7f0dc');}
 if(open>0){r(cx-mw/2,my+3,mw,open,'#2a0806');r(cx-mw/2+3,my+3+open*.55,mw-6,open*.45,'#a33a4a');r(cx-mw/2+1,my+3,3,Math.min(9,open),'#f7f0dc');r(cx+mw/2-4,my+3,3,Math.min(9,open),'#f7f0dc');r(cx-mw/2+1,my+3+open-8,3,8,'#f7f0dc');r(cx+mw/2-4,my+3+open-8,3,8,'#f7f0dc');r(cx-mw/2,my+3+open,mw,3,'#c39a5e');
  for(let i=0;i<8;i++){const u=(t*1.6+i/8)%1;q.globalAlpha=.4*(1-u);r(cx-30+((i*17)%60),my+open+4+u*20,3,3,'#e8dcc0');q.globalAlpha=1;}}
 // Staub fällt von oben
 for(const d of f.dust||[])r(d.x,d.y,d.s,d.s,'#bda579');
 blit(g,w,h,b,f.shake||0,1+k*.08);}
// ---------- Führungsleiste: Schmied erklärt an der echten Oberfläche ----------
let guide=null;
function showGuide(o){hideGuide();const box=document.createElement('div');box.className='hall-guide lion-guide';box.setAttribute('role','status');document.body.appendChild(box);guide={...o,box,i:0,t:0};renderGuide();
 box.addEventListener('click',e=>{const act=e.target.closest?.('[data-lion]');if(act){e.stopPropagation();o.actions?.[act.dataset.lion]?.();return;}if(!guide)return;if(guide.i>=(guide.lines||[]).length&&guide.task&&!guide.taskDone)return;if(guide.t<.35)return;guide.i++;guide.t=0;renderGuide();});}
function hideGuide(){guide?.box?.remove();guide=null;}
function renderGuide(){const G=guide;if(!G)return;const lines=G.lines||[];if(G.i>=lines.length){if(G.task&&!G.taskDone){G.box.innerHTML=`<b>${esc(smithName())}</b><span>${esc(G.task.text)}</span><em class="lion-progress">${esc(G.task.progress?.()||'')}</em>${G.task.help?`<button class="btn" type="button" data-lion="help">${esc(G.task.help)}</button>`:''}`;return;}const done=G.done;hideGuide();done?.();return;}
 G.box.innerHTML=`<b>${esc(smithName())}</b><span>${esc(lines[G.i])}</span><small>Tippen für weiter</small>`;}
function guideTick(dt){if(!guide)return;guide.t+=dt;if(guide.i>=(guide.lines||[]).length&&guide.task&&!guide.taskDone){const p=guide.task.progress?.()||'',em=guide.box.querySelector('.lion-progress');if(em&&em.textContent!==p)em.textContent=p;if(guide.task.check()){guide.taskDone=true;const after=guide.task.after||[];guide.lines=[...(guide.lines||[]),...after];renderGuide();}}}
// ---------- Ablauf ----------
// Gibt der Schmied heute weniger als fünf Waffenarten her, zählen so viele verschiedene, wie er anbietet
const newWeapons=()=>S.inventory.filter(i=>i.kind==='weapon'&&!L().base.includes(i.id)).length,offerKinds=()=>{const own=new Set([...weaponDefs()]);for(const o of W()?.offers||[])if(o.item.kind==='weapon')own.add(o.item.def);return Math.max(1,own.size);};
const weaponDefs=()=>new Set(S.inventory.filter(i=>i.kind==='weapon'&&!L().base.includes(i.id)).map(i=>i.def));
// Hilfe des Schmieds: passende Klasse zur gekauften Waffe, dann anlegen; wer danach noch nichts hat, bekommt eine Leihwaffe (kein Festhängen)
function helpEquip(){const rs=recruits();M.army?.autoEquip?.(rs);const free=()=>S.inventory.filter(i=>i.kind==='weapon'&&!S.roster.some(g=>Object.values(g.equipment||{}).includes(i.id)));
 for(const g of rs){if(armed(g))continue;for(const it of free()){const ranged=['bow','crossbow'].includes(it.def),thrown=!!M.itemStats?.(it)?.ammo;if(ranged)g.role='Fernkämpfer';else if(g.role==='Fernkämpfer')g.role='Soldat';M.equip?.(g.id,it.id,!thrown);if(armed(g))break;}
  if(!armed(g)){if(g.role==='Fernkämpfer')g.role='Soldat';const it=M.makeItem('weapon','club',0);it.loan=true;S.inventory.push(it);M.equip?.(g.id,it.id,true);}}M.persist?.();}
// Nahkampfwaffen liegen im Platz „secondary“, Fern-/Wurfwaffen und Netze im Platz „weapon“
const armed=g=>!!(M.gear(g,'secondary')||M.gear(g,'weapon'));
function equippedAll(){return recruits().every(g=>g.role&&armed(g));}
function teamReady(){const ids=L().recruits;return (S.teams||[]).some(t=>ids.every(id=>t.includes(id)));}
function scene1(){setStage('smith1');villageFilm([
 {dur:.6,do:f=>{f.smith.x=SPOT.x-60;f.smith.y=SPOT.y-4;f.smith.to=[SPOT.x,SPOT.y,40];}},
 {until:f=>!f.smith.to},
 {say:'Fünf frische Männer! Hervorragend!',do:f=>pose(f.smith,{a:0})},{dur:.8},
 {say:'Zwei davon sehen sogar aus, als könnten sie ein Schwert am richtigen Ende halten.',do:f=>{f.smith.forgePose='inspect';}},
 {say:'Aber bevor wir diese hoffnungsvollen Vollidioten in die Arena schicken, sollten wir ihnen wenigstens etwas in die Hand drücken.'},
 {say:'Mit bloßen Händen kämpfen ist nämlich ausgesprochen unpraktisch. Besonders, wenn man hinterher keine mehr hat.',do:f=>{f.smith.forgePose='sip';}}
],{label:'Der Schmied und die fünf Idioten',done:()=>{setStage('buy');L().base=S.inventory.map(i=>i.id);M.ui.click('nav:forge');stepBuy();}});}
function stepBuy(){showGuide({lines:['Hier kaufen wir Waffen. Scharfe, stumpfe, lange, kurze. Hauptsache, irgendetwas davon zeigt in Richtung des Gegners.'],
 task:{text:'Kaufe fünf Waffen, möglichst verschiedene (Reiter „Waffen“, dann KAUFEN).',progress:()=>{const n=newWeapons(),d=weaponDefs().size;return n+' / 5 Waffen · '+d+' verschiedene';},check:()=>newWeapons()>=5&&weaponDefs().size>=Math.min(5,offerKinds()),after:['Ausgezeichnet! Fünf Waffen für fünf Männer.','Jetzt müssen wir nur noch verhindern, dass sie sich damit gegenseitig umbringen, bevor der Kampf überhaupt angefangen hat.']},
 done:()=>{setStage('barracks');M.ui.click('nav:gladiators');stepBarracks();}});}
function stepBarracks(){showGuide({lines:['Willkommen in der Kaserne. Hier machen wir aus gewöhnlichen Versagern professionelle Versager mit Ausrüstung.','Mit etwas Glück wird irgendwann sogar ein richtiger Gladiator daraus.',
  '1 · Tippe einen Gladiator an. Dann siehst du sein Profil.','2 · Die Balken sind seine Werte: Kraft, Geschick, Ausdauer und so weiter.','3 · Die Kampftalente zeigen, mit welchen Waffen er später richtig gut werden kann.','4 · Die Klasse bestimmt, wie er kämpft. Soldat: mittendrin. Assassine: schnell und von der Seite. Fernkämpfer: hinten, mit Bogen oder Armbrust.','5 · Gib jedem eine Waffe, die zu seiner Klasse passt – sonst wird es peinlich.','6 · Lege die Ausrüstung im Profil an und vergleiche den Kampfwert mit und ohne Waffe.'],
 task:{text:'Gib allen fünf Rekruten eine Klasse und eine passende Waffe.',progress:()=>recruits().filter(g=>g.role&&armed(g)).length+' / 5 ausgerüstet',check:equippedAll,help:'Schmied hilft beim Anlegen',after:['Seht ihr? Schon sehen sie aus wie richtige Kämpfer!','Wenn man die Augen zusammenkneift. Und ungefähr zwanzig Meter entfernt steht.']},
 actions:{help:()=>{helpEquip();M.ui.render();}},done:()=>{setStage('arenawalk');M.ui.click('nav:home');setTimeout(scene3,300);}});}
function scene3(){villageFilm([
 {dur:.3,do:f=>{f.smith.x=170;f.smith.y=196;f.smith.to=[300,214,46];}},{until:f=>!f.smith.to,each:f=>{f.camTo={x:f.smith.x,y:f.smith.y-20,vw:240,rate:3};}},
 {do:f=>{f.smith.to=[464,190,46];},until:f=>!f.smith.to,each:f=>{f.camTo={x:f.smith.x,y:f.smith.y-30,vw:240,rate:3};if(Math.random()<.02)M.sound?.('crowd');}},
 {dur:.8,do:f=>{pose(f.smith,{a:0});M.sound?.('crowd');f.camTo={x:464,y:140,vw:300,rate:1.5};}},
 {say:'Und jetzt kommen wir zum wichtigsten Gebäude unserer gesamten Anlage.',do:f=>pose(f.smith,{traderPose:'shout',gest:0})},{dur:.9},
 {say:'Nein, nicht zu meiner Schmiede, obwohl das eine verdammt gute Antwort gewesen wäre.'},
 {say:'DIE ARENA!',do:f=>{pose(f.smith,{traderPose:'point',gest:0,a:Math.PI});M.sound?.('crowd');M.sound?.('block');}},
 {say:'Hier wird Geschichte geschrieben! Hier werden Legenden geboren! Hier gibt es Ruhm, Ehre und vor allem …'},
 {say:'GOLD!',do:f=>pose(f.smith,{traderPose:'coins',gest:0})},{say:'Eine Menge Gold!'},
 {say:'Natürlich sterben dabei gelegentlich ein paar Männer. Aber hey – die sind ersetzbar. Gold nicht!'}
],{label:'Das wichtigste Gebäude',noRecruits:true,smithAt:[170,196],cam:{x:200,y:180,vw:240},done:()=>{setStage('arenainfo');M.ui.click('nav:arena');stepArena();}});}
function stepArena(){showGuide({lines:['Hier findest du verschiedene Kämpfe, Turniere und Herausforderungen.','Manche bringen dir Gold. Andere Ruhm. Die richtig guten bringen dir beides.','Und manche bringen dir eine sehr schöne Beerdigung.','Ein guter Ludus-Leiter weiß, welche Kämpfe er annehmen sollte.','Ein hervorragender Ludus-Leiter weiß, welche er besser anderen Idioten überlässt.','Aber genug davon. Schauen wir, was heute angeboten wird!'],
 done:()=>{setStage('challenge');M.ui.render();document.querySelector('.lion-card')?.scrollIntoView?.({block:'center',behavior:'smooth'});showGuide({lines:['Oho! Was haben wir denn hier?','Ein Löwe!','Schwer verletzt …','Abgemagert …','Aus der königlichen Arena aussortiert …','Meine Güte. Die armen Veranstalter müssen wirklich verzweifelt sein.','Das ist ja praktisch geschenktes Gold!','Perfekt für unsere fünf neuen Helden!'],done:()=>{setStage('speech');M.ui.click('nav:home');setTimeout(scene5,300);}});}});}
function scene5(){villageFilm([
 {dur:.4,do:f=>{f.smith.x=SPOT.x;f.smith.y=SPOT.y;}},
 {say:'Männer! Heute ist euer Glückstag!',do:f=>pose(f.smith,{traderPose:'shout',gest:0})},
 {say:'Ihr bekommt die Gelegenheit, euch gegen eines der edelsten Geschöpfe der Natur zu beweisen!'},
 {who:'r1',say:'Gegen was denn?'},{say:'Einen Löwen!',do:f=>pose(f.smith,{traderPose:'point',gest:0})},
 {dur:.9,do:f=>{for(const a of f.rec){a.facePain=.8;a.retreat=1;}f.rec[2].x+=2;}},
 {who:'r2',say:'EINEN LÖWEN?!'},{who:'r3',say:'Das sind riesige Bestien! Die reißen einem mit einem einzigen Biss den Kopf ab!'},{who:'r4',say:'Mein Cousin wurde von einem Löwen gefressen!'},
 {say:'Und? Hat er sich beschwert?'},{dur:1},{who:'r4',say:'Er war tot!'},{say:'Na also. Kein Grund, ein Drama daraus zu machen.',do:f=>{f.smith.forgePose='sip';}},
 {who:'r1',say:'Wir können doch nicht gegen einen Löwen kämpfen!'},{say:'Papperlapapp!',do:f=>{f.smith.forgePose='shake';}},
 {say:'Ein Löwe ist im Grunde nichts anderes als eine etwas größere Katze.'},{say:'Und ihr habt doch wohl keine Angst vor Katzen?'},
 {who:'r2',say:'Eine Katze wiegt aber keine zweihundert Kilo!'},{say:'Das ist eine Frage der Ernährung.'},{who:'r3',say:'Der beißt uns einfach in zwei Hälften!'},
 {say:'Hört zu, ihr Jammerlappen.',do:f=>pose(f.smith,{traderPose:'shout',gest:0})},{say:'Ich habe in meinem Leben gegen mehr Löwen gekämpft, als ihr zählen könnt.'},
 {say:'Und ich verrate euch jetzt das Geheimnis, wie man so ein Tier ganz einfach besiegt.'},
 {dur:.7,do:f=>{f.belt=[[-99,null],[f.t+.5,'sword']];}},{say:'PASST GUT AUF!',do:f=>pose(f.smith,{state:'charge'})}
],{label:'Die Motivationsrede',done:()=>{setStage('demo');scene6();}});}
function scene6(){const sm={...smithActor(380,420)};sm.g.enemyGear.weapon=M.makeItem('weapon','gladius',2);sm.forgeWorker=false;sm.forgeHold=null;const li=sceneLion(640,410,true);
 arenaFilm([
  {dur:1,cam:{x:520,y:380,vw:520}},
  {say:'Zunächst müsst ihr wissen: Löwen sind ausgesprochen scheue Tiere.',do:f=>{li.mode='evade';li.hit=.24;beast('demo');li.to=null;f.lionTo=[700,420,140];}},
  {dur:.8,do:f=>{sm.to=[450,420,50];}},{dur:.9,do:f=>{f.lionTo=[770,400,160];}},
  {say:'Die größte Schwierigkeit besteht darin, überhaupt einen zu erwischen!',do:f=>{sm.to=[620,410,120];f.lionTo=[860,470,200];}},
  // Verfolgungsjagd im Kreis
  {dur:4.5,each:(f,dt,bt)=>{const a=bt*1.4,cx=560,cy=430;f.lionTo=[cx+Math.cos(a)*230,cy+Math.sin(a)*120,230];sm.to=[cx+Math.cos(a-.55)*230,cy+Math.sin(a-.55)*120,230];f.camTo={x:(sm.x+li.x)/2,y:(sm.y+li.y)/2-20,vw:460,rate:2};}},
  {say:'Aber dafür gibt es einen uralten Gladiatorentrick.',do:f=>{f.lionTo=[700,420,130];sm.to=[600,420,130];}},
  {say:'Ihr packt die Bestie einfach am Schwanz!',until:f=>!f.lionTo&&!sm.to},
  {dur:.2,do:f=>{li.a=0;li.x=700;li.y=420;sm.x=622;sm.y=420;sm.a=0;f.tail=true;f.camTo={x:660,y:390,vw:300,rate:2};}},
  {say:'Seht ihr? Jetzt kann er nicht mehr weg!',do:f=>{sm.traderPose='pull';sm.gest=0;}},
  {say:'Und wenn ihr ihn erst einmal habt …',do:f=>{sm.traderPose=null;sm.technique='overhead';sm.windMax=.9;sm.wind=.9;sm.state='attack';}},{dur:1.2},
  {say:'… dann haut ihr ihn einfach in zwei Stücke!'},
  {dur:1.6,do:f=>{f.tail=false;sm.wind=0;sm.swingKind='overhead';sm.swingMax=.3;sm.swing=.3;li.split={k:0};li.g.dead=true;li.mode='dead';li.deathAt=f.t;M.sound?.('sever');sceneBlood(f,li.x,li.y,30,40);f.shake=6;},each:(f,dt)=>{li.split.k=Math.min(1,li.split.k+dt*2.2);}},
  {say:'Fertig!',do:f=>{sm.state='idle';sm.swing=0;sm.g.enemyGear.weapon=null;M.sound?.('rise');}},{say:'Ein Kinderspiel.'},
  {say:'Wobei ich Kindern natürlich ein etwas kleineres Schwert empfehlen würde.',do:f=>{sm.a=Math.PI;f.camTo={x:sm.x,y:sm.y-40,vw:200,rate:2};}}
 ],{label:'Das Lehrvideo des Schmieds',done:()=>{setStage('helmet');scene7();},arena:1,level:1,actors:[sm,li],smith:sm,fx:[],stains:[],ground:[],cam:{x:520,y:380,vw:520},
  tick:(f,dt)=>{if(f.lionTo){const [x,y,v]=f.lionTo,dx=x-li.x,dy=y-li.y,d=Math.hypot(dx,dy),s=v*dt;if(d<=s){li.x=x;li.y=y;f.lionTo=null;li.moveSpeed=0;li.mode=li.g.dead?'dead':'stalk';}else{li.x+=dx/d*s;li.y+=dy/d*s;li.moveSpeed=v;li.mode='evade';li.a=Math.atan2(dy,dx);li.heading=li.a;li.phase+=s*.08;}}
   if(f.tail&&!li.g.dead){li.moveSpeed=220;li.mode='sprint';li.phase+=dt*16;li.a=0;if(Math.random()<.3)f.fx.push({x:li.x-30+Math.random()*20,y:li.y,z:2,vx:-60-Math.random()*40,vy:Math.random()*10-5,vz:20,life:.4,size:2,color:'#c9b586'});}
   if(sm.swing>0)sm.swing=Math.max(0,sm.swing-dt);}});}
function scene7(){const hero=recruits()[0];const copy=JSON.parse(JSON.stringify(hero));copy.enemyGear={weapon:M.makeItem('weapon','gladius',0),secondary:null,shield:null,armor:{}};copy.equipment={weapon:null,secondary:null,shield:null,armor:{}};
 const me=M.createCombatActor(copy,0,0);Object.assign(me,{x:400,y:420,a:0});const elites=[0,1,2].map(i=>{const rng=S.rng,g=M.makeGladiator(5,true);S.rng=rng;g.enemyGear={weapon:M.makeItem('weapon',['long','greatsword','spear'][i],6),secondary:null,shield:i===0?M.makeItem('shield','scutum',6):null,armor:Object.fromEntries('helm chestplate leftarm rightarm leftleg rightleg leftshoulder rightshoulder'.split(' ').map(id=>[id,M.makeItem('armor',id,6,'metal')]))};const a=M.createCombatActor(g,1,i);Object.assign(a,{x:640+i*38,y:390+i*30,a:Math.PI});return a;});
 arenaFilm([
  {dur:.6,cam:{x:520,y:380,vw:420}},
  {say:'Aber das Beste kommt erst noch!'},{say:'Wer einen Löwen besiegt, darf sich aus seinem Fell einen prächtigen Löwenhelm machen!'},
  {dur:1,do:f=>{me.technique='overhead';me.wind=.4;me.windMax=.4;me.state='attack';}},
  {say:'Und sobald die anderen Gladiatoren diesen Helm sehen …',do:f=>{me.wind=0;me.state='idle';for(const e of elites){e.facePain=1;e.retreat=1;}}},
  {dur:.9,do:f=>{const e=elites[0];f.ground.push({sprite:0,item:e.g.enemyGear.weapon,x:e.x-8,y:e.y+2,z:0,angle:.4,blood:0});e.g.enemyGear.weapon=null;M.sound?.('block');}},
  {say:'… wissen sie sofort, dass sie einem wahrhaftigen Meister gegenüberstehen!',do:f=>{elites[1].to=[1100,elites[1].y+30,150];}},
  {dur:1.6,do:f=>{elites[0].to=[1120,430,170];elites[2].to=[1110,330,160];}},
  {say:'Niemand legt sich freiwillig mit einem Mann an, der eine Katze dieser Größe auf dem Kopf trägt!',do:f=>{me.state='celebrate';M.sound?.('win');M.sound?.('crowd');}},
  {dur:1.6}
 ],{label:'Der Helm des Siegers',done:()=>{setStage('heroes');scene8();},arena:5,level:6,actors:[me,...elites],fx:[],stains:[],ground:[],cam:{x:520,y:380,vw:420},
  overlay:(g,w,h,f)=>{const k=(me.g.height||180)/180*1.14,p=worldToScreen(f,w,h,me.x+(Math.cos(me.a)>=0?2:-2)*k,me.y-(me.state==='celebrate'?70:64)*k),u=p.s*1.5;const R=(x,y,ww,hh,c)=>{g.fillStyle=c;g.fillRect(Math.round(p.x+x*u),Math.round(p.y+y*u),Math.ceil(ww*u),Math.ceil(hh*u));};
   // übertrieben prächtiger Löwenhelm: Mähne rundherum, Löwenkopf obenauf
   for(let i=0;i<14;i++){const a=i/14*Math.PI*2,rr=8+Math.sin(f.t*5+i)*.6;R(Math.cos(a)*rr-3,Math.sin(a)*rr-4,6,7,i%2?'#8a5a2c':'#6b4524');}
   R(-7,-15,14,9,'#c39a5e');R(-5,-13,3,2,'#2a1a0e');R(2,-13,3,2,'#2a1a0e');R(-3,-9,6,3,'#d5b478');R(-2,-8,4,1,'#3a2a20');R(-8,-17,4,4,'#7c582f');R(4,-17,4,4,'#7c582f');R(-4,-7,1,3,'#f7f0dc');R(3,-7,1,3,'#f7f0dc');
   if(me.state==='celebrate'){g.fillStyle='rgba(244,211,122,'+(.15+.1*Math.sin(f.t*6))+')';g.beginPath();g.arc(p.x,p.y-6*u,26*u,0,Math.PI*2);g.fill();}}});}
function scene8(){villageFilm([
 {dur:.4},
 {who:'r1',say:'Moment mal … wir müssen ihn also nur am Schwanz packen?'},{say:'Exakt!'},{who:'r2',say:'Und dann einfach draufhauen?'},{say:'Ihr lernt erstaunlich schnell!'},
 {who:'r3',say:'Und wer ihn erledigt, bekommt diesen Löwenhelm?'},{say:'So ist es!'},{who:'r4',say:'Dann will ICH den Löwenhelm!'},{who:'r5',say:'Vergiss es! Der gehört mir!'},
 {who:'r1',say:'Ich werde ihn mit bloßen Händen erwürgen!'},{who:'r2',say:'Ich nehme seinen Schwanz als Gürtel!'},{who:'r3',say:'Heute werde ich zur Legende!',do:f=>{for(const a of f.rec){a.state='celebrate';a.facePain=0;a.retreat=0;}M.sound?.('crowd');}},
 {dur:1.8,each:f=>{for(const [i,a] of f.rec.entries()){a.traderPose=Math.floor(f.t*2+i)%2?'point':null;a.gest=f.t;}}},
 {say:'Seht ihr?',do:f=>{for(const a of f.rec)a.traderPose=null;f.smith.forgePose='sip';}},{say:'Man braucht keine guten Kämpfer.'},{say:'Man braucht nur Kämpfer, die glauben, sie wären gut.'},
 {say:'Und jetzt ab in die Arena mit diesen zukünftigen Legenden!',do:f=>pose(f.smith,{traderPose:'point',gest:0})}
],{label:'Die fünf Helden',done:()=>{setStage('team');M.ui.click('nav:team');stepTeam();}});}
function stepTeam(){showGuide({lines:['Hier stellst du deine Kämpfer zusammen.','Wer mitkämpfen soll, kommt ins Team.','Wer nicht mitkämpft, bleibt zu Hause und tut etwas Sinnvolles. Zum Beispiel meine Schmiede putzen.'],
 task:{text:'Wähle „5 gegen 5“, lege die Gruppe an und weise alle fünf Rekruten zu.',progress:()=>{const ids=L().recruits,best=Math.max(0,...(S.teams||[]).map(t=>ids.filter(id=>t.includes(id)).length));return best+' / 5 in einer Gruppe';},check:teamReady},
 done:()=>{setStage('spy');M.ui.click('nav:arena');stepSpy();}});}
function stepSpy(){setTimeout(()=>{document.querySelector('.lion-card')?.scrollIntoView?.({block:'center'});},120);showGuide({lines:['Ah! Unsere Spionageabteilung hat ihre Berechnungen abgeschlossen.','Null Prozent Siegchance.','Interessant.','Die scheinen den Löwen wohl noch nicht kennengelernt zu haben.','Diese Spionagefunktion ist übrigens ziemlich wichtig. Sie hilft dir dabei, einzuschätzen, ob deine Männer einen Kampf überleben könnten.','Wie du sie richtig benutzt, erkläre ich dir später.','Aber wir haben fünf bewaffnete Männer und eine halb verhungerte Katze.','Was soll da schon schiefgehen?'],
 task:{text:'Bestätige den Kampf: „KAMPF ANNEHMEN“ bei der Herausforderung.',progress:()=>'',check:()=>L().stage==='entrance'},done:()=>{}});}
function scene11(){hideGuide();setStage('entrance');
 const rs=recruits().map((g,i)=>{const a=M.createCombatActor(g,0,i,72);Object.assign(a,{x:200+i*10,y:420+(i-2)*40,a:0});a.to=[420+(i-2)*60,440+Math.abs(i-2)*16,90];return a;});const li=lionActor(520,92);li.gateClip=true;li.a=Math.PI/2;li.mode='recover';li.hidden=true;
 const arenaPart=(beats,done)=>arenaFilm(beats,{label:'Die Wahrheit über den Löwen',done,arena:3,level:4,actors:[...rs,li],fx:[],stains:[],ground:[],cam:{x:480,y:420,vw:520},
  tick:(f,dt)=>{if(f.lionTo){const [x,y,v]=f.lionTo,dx=x-li.x,dy=y-li.y,d=Math.hypot(dx,dy),s=v*dt;if(d<=s){li.x=x;li.y=y;f.lionTo=null;li.moveSpeed=0;}else{li.x+=dx/d*s;li.y+=dy/d*s;li.moveSpeed=v;li.heading=Math.atan2(dy,dx);li.a=li.heading;li.phase+=s*.08;}}if(li.y>172)li.gateClip=false;},
  overlay:(g,w,h,f)=>{g.fillStyle='rgba(8,6,10,.38)';g.fillRect(0,0,w,h);}});
 arenaPart([
  {dur:2.2,cam:{x:440,y:430,vw:440},do:f=>{M.sound?.('crowd');}},
  {dur:1.6,do:f=>{rs[0].state='celebrate';rs[1].traderPose='pull';rs[1].gest=0;M.sound?.('crowd');}}
 ],()=>gateShots(rs,li));}
function gateShots(rs,li){
 // Einstellung 1 + 2: Gitter, Dunkelheit, Knurren, Pfoten ins Licht (humpelnd)
 play({label:'Das Gitter',silent:false,beats:[{dur:1.6,do:f=>{beast('growl');f.eyes=false;}},{dur:1.6,do:f=>{f.eyes=true;}},{dur:3.2,each:(f,dt)=>{f.paw=Math.min(1,(f.paw||0)+dt*.4);}},{dur:.6}],paint:gatePaint,done:()=>{
  // Einstellung 3: Gitter fährt hoch, Löwe tritt hervor
  arenaFilm([
   {dur:.2,do:f=>{li.hidden=false;M.sound?.('heavy');}},
   {dur:2,each:(f,dt)=>{f.gate=Math.min(1,(f.gate||0)+dt/1.4);f.shake=Math.max(f.shake,2);}},
   {dur:2.4,do:f=>{f.lionTo=[520,236,46];li.mode='stalk';},until:f=>!f.lionTo,cam:{x:520,y:250,vw:300,rate:1.5}},
   {dur:1.2,do:f=>{li.mode='roar';li.clock=0;}}
  ],{label:'Der König',arena:3,level:4,actors:[...rs,li],fx:[],stains:[],ground:[],cam:{x:520,y:200,vw:340},gate:0,
   tick:(f,dt)=>{if(f.lionTo){const [x,y,v]=f.lionTo,dx=x-li.x,dy=y-li.y,d=Math.hypot(dx,dy),s=v*dt;if(d<=s){li.x=x;li.y=y;f.lionTo=null;li.moveSpeed=0;}else{li.x+=dx/d*s;li.y+=dy/d*s;li.moveSpeed=v;li.heading=Math.atan2(dy,dx);li.a=li.heading;li.phase+=s*.08;}}if(li.y>172)li.gateClip=false;},
   overlay:(g,w,h)=>{g.fillStyle='rgba(8,6,10,.3)';g.fillRect(0,0,w,h);},
   done:()=>{
    // Einstellung 4: Extreme Nahaufnahme, Brüllen, Musik verstummt, Staub, Erschütterung
    play({label:'Der Schrei',silent:true,dust:[],beats:[
     {dur:1.2,each:(f,dt)=>{f.snarl=Math.min(1,(f.snarl||0)+dt*1.2);}},
     {dur:2.6,do:f=>{beast('roar');f.shake=6;},each:(f,dt,bt)=>{f.roar=Math.min(1,bt*2.2);f.shake=Math.max(1.5,6-bt*1.5);if(Math.random()<.6)f.dust.push({x:Math.random()*160,y:-2,s:1+Math.random()*2,v:20+Math.random()*30});}},
     {dur:.8,each:(f,dt)=>{f.roar=Math.max(0,f.roar-dt*1.5);f.shake=0;}}],
     tick:(f,dt)=>{for(const d of f.dust)d.y+=d.v*dt;f.dust=f.dust.filter(d=>d.y<104);},paint:roarPaint,done:()=>{
      // Die fünf erstarren
      arenaFilm([
       {who:'r1',say:'… Das ist keine Katze.',do:f=>{for(const a of rs){a.state='idle';a.traderPose=null;a.facePain=1;a.retreat=1;}}},
       {who:'r2',say:'Wo ist sein verdammter Schwanz?!'},{who:'r3',say:'ICH WILL NACH HAUSE!'}
      ],{label:'Erstarrt',arena:3,level:4,actors:[...rs,li],fx:[],stains:[],ground:[],gate:1,rec:rs,cam:{x:480,y:320,vw:560},done:()=>startFight()});}});}});}});}
function playAftermath(){const fallen=(S.fallen||[]).filter(e=>L().recruits.includes(e.id)).length;
 villageFilm([
  {dur:.6,do:f=>{f.smith.x=748;f.smith.y=262;f.smith.to=[740,300,40];}},{until:f=>!f.smith.to},
  {say:'Tja.',do:f=>pose(f.smith,{traderPose:'shout',gest:0})},{dur:1.4},{say:'Das …'},{say:'… lief jetzt nicht ganz nach Plan.'},
  {say:'Ich muss allerdings sagen: Motiviert waren sie.',do:f=>{f.smith.a=Math.PI;}},{say:'Das muss man ihnen lassen.'},{say:'Besonders der eine, der versucht hat, den Löwen am Schwanz zu packen.'},{dur:.8},
  {say:'Ein Mann, der wirklich an seine Ausbildung geglaubt hat.'},{say:'Nun gut. '+fallen+' Tote. Kein Gold. Und die ganze Arena lacht über unsere Schule.',do:f=>{f.smith.forgePose='sip';}},
  {say:'Ein ausgesprochen beschissener erster Arbeitstag.'},
  {say:'Jetzt hör mir gut zu.',do:f=>pose(f.smith,{a:0})},{say:'Eine Waffe macht noch keinen Gladiator.'},{say:'Und fünf bewaffnete Idioten ergeben noch lange keine Armee.'},
  {say:'Deine Männer brauchen Erfahrung.'},{say:'Sie müssen trainieren, kämpfen, überleben und aus ihren Fehlern lernen.'},{say:'Jeder überstandene Kampf macht sie gefährlicher.'},
  {say:'Und die wirklich guten Kämpfer erkennst du nicht an ihrer glänzenden Rüstung.'},{say:'Sondern daran, dass sie schon ein Dutzend Mal hätten sterben sollen.'},
  {say:'Siehst du die hier?',do:f=>pose(f.smith,{traderPose:'shout',gest:0})},{say:'Ein Andenken an einen Mann, der mich unterschätzt hat.'},{dur:.8},{say:'Oder an einen betrunkenen Abend. So genau weiß ich das nicht mehr.'},
  {say:'Training verbessert die Fähigkeiten. Kampferfahrung ist entscheidend. Und jeder entwickelt sich anders.',do:f=>pose(f.smith,{})},
  {say:'Gute Talente können zu außergewöhnlichen Kämpfern werden. Verletzungen können dich aber ein Leben lang verfolgen.'},
  {say:'Narben sind keine Zauberei. Aber jede einzelne heißt: Der hier hat schon mal überlebt.'},
  {say:'Ein richtiger Veteran hätte mit dieser alten Katze vermutlich den Arenaboden gewischt.'},{say:'Unsere fünf Helden hingegen haben hauptsächlich den Arenaboden gefärbt.'},
  {say:'Und genau deshalb benutzen wir künftig diese verdammte Spionagefunktion!',do:f=>pose(f.smith,{traderPose:'point',gest:0})},{say:'Wenn da NULL PROZENT steht …'},
  {dur:.6},{say:'… dann bedeutet das meistens nicht, dass unsere Spione schlechte Laune haben.'},{say:'Sondern dass du gerade dabei bist, fünf Mann in sehr teures Löwenfutter zu verwandeln.'},
  {say:'Nicht jede Herausforderung muss man sofort annehmen.',do:f=>pose(f.smith,{})},
  {say:'Also gut.'},{say:'Morgen kommt der Sklavenhändler wieder.'},{say:'Dann kaufen wir uns fünf neue Männer.'},{say:'Diesmal trainieren wir sie ordentlich.'},{say:'Wir lassen sie Erfahrung sammeln.'},{say:'Wir rüsten sie vernünftig aus.'},
  {say:'Und vielleicht schaffen wir es dann sogar, dass einer von ihnen länger lebt als seine erste Gehaltsabrechnung.'},
  {dur:1.2,do:f=>{f.smith.to=[748,262,36];}},{say:'Ach, und noch etwas.',do:f=>{f.smith.to=null;pose(f.smith,{a:Math.PI});}},{dur:.8},
  {say:'Falls dich jemand fragt, was heute passiert ist …'},{say:'… wir hatten nie fünf Gladiatoren.',do:f=>{f.smith.a=0;}},
  {dur:.6,do:f=>{f.smith.to=[748,246,36];}},{until:f=>!f.smith.to},{say:'Und der Löwe hat geschummelt.',do:f=>pose(f.smith,{a:Math.PI})},
  {dur:.9,do:f=>{f.smith.hidden=true;M.sound?.('heavy');f.shake=3;}}
 ],{label:'Der Schmied zieht Bilanz',noRecruits:true,smithAt:[748,262],cam:{x:740,y:280,vw:220},done:finishChapter});}
function finishChapter(){setStage('done');
 // Kein Softlock: genug Gold für fünf neue Rekruten beim nächsten Händlerbesuch
 if(S.gold<500){L().aid=500-S.gold;S.gold=500;}M.persist?.();
 M.ui.modal('NEUE HAUPTAUFGABE','<div class="lion-task"><p class="eyebrow">AUS FEHLERN LERNEN</p><p><b>Baue deine Gladiatorenschule wieder auf.</b></p><ol><li>Warte auf den nächsten Besuch des Sklavenhändlers.</li><li>Rekrutiere neue Gladiatoren.</li><li>Weise ihnen geeignete Klassen zu.</li><li>Rüste sie aus.</li><li>Trainiere ihre Fähigkeiten.</li><li>Sammle Kampferfahrung in geeigneten Begegnungen.</li><li>Nutze die Spionage vor gefährlichen Herausforderungen.</li><li>Bereite dich auf eine erneute Begegnung mit dem ausgemusterten König vor.</li></ol><p class="lion-dip">DEATH IS PERMANENT.</p>'+(L().aid?`<p class="tiny">Damit es weitergeht, hat der Schmied ${L().aid} Gold „gefunden“.</p>`:'')+'</div>');}
function afterFight(){playAftermath();}
// ---------- Arena-Seite: Herausforderung „Der ausgemusterte König“ ----------
const page=M.schoolPage;M.schoolPage=p=>{const html=page(p);const st=L().stage;if(p!=='arena'||!['challenge','spy'].includes(st))return html;
 const spy=st==='spy';const card=`<section class="box lion-card${spy?' lion-spy':''}"><p class="eyebrow">HERAUSFORDERUNG</p><h2>DER AUSGEMUSTERTE KÖNIG</h2><p>Ein ehemaliger königlicher Arenalöwe wurde nach schweren Verletzungen ausgemustert. Das Tier ist abgemagert, humpelt und wurde seit längerer Zeit nicht ausreichend gefüttert. Der Veranstalter sucht mutige Gladiatoren für einen letzten Kampf gegen die ehemalige Bestie.</p>`+
  (spy?`<div class="lion-spycard"><small>SPIONAGE · TUTORIAL-ERGEBNIS</small><strong>SIEGCHANCE: 0 %</strong><span>Simuliert gegen ${recruits().length} Rekruten · Gegner: Rex Vetus</span></div><div class="buttons"><button class="btn primary" type="button" data-action="lion:fight">KAMPF ANNEHMEN</button></div>`:'')+`</section>`;
 return card+html;};
const click=M.schoolClick;M.schoolClick=a=>{if(a==='lion:fight'){hideGuide();scene11();return true;}return click(a);};
// ---------- Start, Fortsetzen ----------
function begin(){const h=L();if(h.stage)return;const rs=S.roster.filter(g=>!g.dead).slice(0,5);h.recruits=rs.map(g=>g.id);setStage('smith1');scene1();}
function resume(){const st=L().stage;if(!st||st==='done'||film||guide)return;({smith1:scene1,buy:()=>{M.ui.click('nav:forge');stepBuy();},barracks:()=>{M.ui.click('nav:gladiators');stepBarracks();},arenawalk:scene3,arenainfo:()=>{M.ui.click('nav:arena');stepArena();},challenge:()=>{M.ui.click('nav:arena');stepArena();},speech:scene5,demo:scene6,helmet:scene7,heroes:scene8,team:()=>{M.ui.click('nav:team');stepTeam();},spy:()=>{M.ui.click('nav:arena');stepSpy();},entrance:scene11,fight:()=>{if(!S.battle)scene11();},aftermath:playAftermath})[st]?.();}
// Start: direkt nach der Händler-Einführung (in dieser Sitzung abgeschlossen). Spielstände, in denen der Händler schon früher fertig war, überspringen das Kapitel.
{const T0=M.trader?.state;if(T0?.intro==='done'&&!L().stage)L().stage='skip';}
let wait=0,lastIntro=M.trader?.state?.intro;
const busy=()=>!!S.battle||!!film||!!M.smithWrath?.scene||!!M.archerPlot?.scene||!!M.hall?.film||!!M.intro?.active?.()||!!window.ArenaTheoryIntro?.active?.()||!!M.trader?.tutorial||!!document.querySelector('.smith-ceremony,#introView,#brandIntro')||($('modal')&&!$('modal').hidden);
const auto=M.ludusTick;M.ludusTick=dt=>{auto?.(dt);if(document.hidden||M.benchmarkActive)return;const st=L().stage,T=M.trader?.state,home=M.ui.getPage()==='home';
 if(st===''&&T){if(lastIntro!=='done'&&T.intro==='done')L().armed=true;lastIntro=T.intro;if(!L().armed)return;if(!home||busy()){wait=0;return;}wait+=dt;if(wait>3){wait=0;if(S.roster.filter(g=>!g.dead).length>=5)begin();else setStage('skip');}return;}
 if(!st||st==='done'||st==='skip'||guide||film)return;if(st==='fight'&&S.battle?.rexTut)return;if(!home&&!['buy','barracks','arenainfo','challenge','team','spy'].includes(st))return;if(busy()){wait=0;return;}wait+=dt;if(wait>1.2){wait=0;resume();}};
M.lionChapter={begin,resume,stop:()=>{stopFilm();hideGuide();},state:L,scenes:{scene1,stepBuy,stepBarracks,scene3,stepArena,scene5,scene6,scene7,scene8,stepTeam,stepSpy,scene11,startFight,playAftermath,finishChapter},get film(){return film;},stepFilm,get guide(){return guide;}};

})();
