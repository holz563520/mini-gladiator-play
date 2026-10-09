'use strict';
// Gescriptete Vorgeschichte des Lanista. Verwendet nur vorhandene Figuren, Ausrüstung, Arena, Mäntel und Animationen.
// Läuft ohne S.battle: keine Kampfmechanik, kein Karriere-Zufall, kein Inventar. Gespeichert wird am Ende nur der Lanista.
(()=>{const M=window.MG,S=M.s,TAU=Math.PI*2,clamp=M.clamp,ABORT={},$=id=>document.getElementById(id);
const rand=(a,b)=>a+Math.random()*(b-a);
let run=null;

// ---------- Besetzung: normaler Charaktergenerator, vorhandene Gegenstände ----------
function dress(g,spec){g.enemyGear={weapon:spec.weapon?M.makeItem('weapon',spec.weapon[0],spec.weapon[1]):null,secondary:null,shield:spec.shield?M.makeItem('shield',spec.shield[0],spec.shield[1]):null,armor:Object.fromEntries((spec.armor||[]).map(([id,q,material])=>[id,M.makeItem('armor',id,q,material||'metal')]))};return g;}
function actor(g,x,y,team){return {id:g.id,g,team,x,y,a:team?Math.PI:0,state:'idle',phase:rand(0,TAU),energy:150,ammo:0,wind:0,windMax:.3,swing:0,swingMax:.3,hit:0,stagger:0,dodgeTimer:0,jumpTimer:0,kneeTimer:0,fallTimer:0,fallDuration:0,facePain:0,shoutTimer:0,blockFlash:0,shieldBashTimer:0,moveSpeed:0,seed:rand(0,100),bloodMarks:{},down:false,block:false,blockTime:0};}
function cast(owner){const keep=S.rng,all='helm chestplate leftarm rightarm leftleg rightleg leftshoulder rightshoulder'.split(' ');
 const hero=M.makeGladiator(4);hero.name=owner.name;hero.height=owner.height;hero.weight=owner.weight;hero.age=34;hero.appearance={...hero.appearance,...owner.appearance};hero.scars=[];hero.fame=M.mantles[M.mantles.length-1].fame;hero.stats.morale=90;hero.stats.stamina=90;
 dress(hero,{weapon:['gladius',6],armor:all.map(id=>[id,6])});
 const foes=[{weapon:['axe',3],armor:[['chestplate',2,'leather'],['leftleg',2,'leather'],['rightleg',2,'leather']]},
  {weapon:['spear',3],armor:[['helm',3],['chestplate',2,'medium']]},
  {weapon:['greatsword',4],armor:[['helm',3],['chestplate',3],['leftshoulder',3],['rightshoulder',3]]},
  {weapon:['mace',3],shield:['roundshield',3],armor:[['helm',2],['chestplate',3,'medium']]},
  {weapon:['trident',3],armor:[['leftarm',2],['leftshoulder',3],['leftleg',2,'leather']]},
  {weapon:['short',3],armor:[['helm',2],['chestplate',2,'leather'],['rightarm',2,'leather']]}].map(spec=>dress(M.makeGladiator(2,true),spec));
 const last=dress(M.makeGladiator(5,true),{weapon:['long',6],shield:['scutum',5],armor:all.map(id=>[id,5])});last.champion=true;last.fame=M.mantles[29].fame;
 S.rng=keep;return {hero,foes,last};}

// ---------- kleine Regie-Werkzeuge ----------
function until(cond){return new Promise((res,rej)=>{if(!run||run.aborted)return rej(ABORT);run.waiters.push({cond,res,rej});});}
function wait(seconds){let left=seconds;return until(()=>(left-=run.dt)<=0||run.tap);}
const face=(a,b)=>{a.a=Math.atan2(b.y-a.y,b.x-a.x);};
function walk(a,x,y,speed,opt={}){const m={x,y,speed,state:opt.state||'move',keep:!!opt.keep};a.move=m;return until(()=>a.move!==m);}
function slide(a,dx,dy,time=.2){a.slide={dx,dy,left:time,time};}
function cheer(level){if(run)run.cheer=Math.max(run.cheer,level);if(level>=1)M.sound?.('crowd');}
function camera(x,y,vw,rate=2.2){Object.assign(run.camTo,{x,y,vw,rate});}
function text(value){run.caption=value||'';}
function blood(x,y,z,power){const sc=run.sc;for(let n=0;n<8+power*20;n++)sc.fx.push({x:x+rand(-2,2),y:y+rand(-2,2),z:Math.max(4,z),vx:rand(-55,55),vy:rand(-22,22),vz:rand(25,95),life:rand(.5,1.3),color:n%3?'#aa3c36':'#87352e',size:Math.random()<.25?3:2,ground:true});}
function dust(x,y){for(let n=0;n<13;n++)run.sc.fx.push({x,y,z:rand(1,8),vx:rand(-70,70),vy:rand(-30,30),vz:rand(20,70),life:rand(.25,.7),color:'#bda579',size:2});}
function sparks(x,y){for(let n=0;n<9;n++)run.sc.fx.push({x,y:y+2,z:rand(34,46),vx:rand(-80,80),vy:rand(-25,25),vz:rand(10,70),life:rand(.12,.32),color:n%2?'#fff0bc':'#e8c67c',size:2});}
function wound(v,part,power,by){v.hit=.23;v.facePain=1;const p=M.contactAnchor(v,part),limb=v.g.body[part];blood(p.x,v.y,v.y-p.y,power);v.bloodMarks[part]=Math.min(1,(v.bloodMarks[part]||0)+power);limb.hp=Math.max(30,limb.hp-power*55);if(!limb.wounds?.length)limb.wounds=[{day:1,type:'Intro',attacker:'',weapon:'',hits:1,damage:0}];const blade=by?.g.enemyGear.weapon;if(blade)blade.blood=Math.min(1,(blade.blood||0)+power*.45);M.sound?.('hit');M.voice?.('pain',v.g.appearance.voice||1,power>.55);}
function sever(v,branch,by,vx,vy){const sc=run.sc,at=branch==='rua'?'rs':branch,p=M.contactAnchor(v,at);for(const k of M.branches[branch]){const l=v.g.body[k];l.missing=true;l.hp=0;}v.g.stump='blood';sc.limbs.push({x:p.x,y:v.y+3,z:v.y-p.y,vz:65,vx,vy,part:branch,team:v.team,t:0,angle:rand(0,TAU),armored:false,skin:v.g.appearance.skin,hair:v.g.appearance.hair});blood(p.x,v.y,v.y-p.y,1.1);v.bloodMarks[at]=1;v.hit=.23;v.facePain=3;const blade=by.g.enemyGear.weapon;if(blade)blade.blood=Math.min(1,(blade.blood||0)+.5);sc.shake=5;M.sound?.('sever');M.voice?.('pain',v.g.appearance.voice||1,true);}
// Am Boden: jeder liegt anders, hält seine Wunde, windet sich und verblutet nach einigen Sekunden.
function agonize(v,part,pose,lie,seconds,alt){v.agony={part,alt,pose,lie,rate:rand(2.2,3.6),live:1};v.facePain=99;v.pool={x:v.x+(v.fallSide||-1)*-8,y:v.y-2,r:0};v.bleed={left:seconds,total:seconds,wait:0};}
function parry(v,by){v.block=true;v.blockTime=.34;v.blockFlash=.2;sparks((v.x+by.x)/2,(v.y+by.y)/2);M.sound?.('block');}
async function strike(a,v,o={}){face(a,v);a.attackA=a.a;a.technique=o.tech||'slash';a.attackVariant=o.variant||0;a.windMax=o.wind??.28;a.wind=a.windMax;a.state='attack';await wait(a.windMax);a.wind=0;a.swingMax=o.swing??.3;a.swing=a.swingMax;a.swingKind=a.technique;if(o.part)a.contactPoint=M.contactAnchor(v,o.part);run.sc.swings.push({x:a.x,y:a.y-10,a:a.a,r:o.reach||50,life:.16,color:a.team?'#d58669':'#e9d4a4'});M.sound?.(o.heavy?'heavy':'slash');await wait(a.swingMax*.5);o.land?.();await wait(a.swingMax*.5);a.swing=0;a.contactPoint=null;a.state='idle';}
async function knockOut(v){v.watch=null;v.move=null;v.wind=v.swing=v.stagger=0;v.block=false;v.fallSide=Math.cos(v.a)>=0?-1:1;v.fallDuration=v.fallTimer=3;v.riseDuration=1.25;v.state='fallen';dust(v.x,v.y);M.sound?.('fall');cheer(1.8);await wait(.42);v.down=true;v.fallTimer=0;v.state='down';}
function kneel(a,hold){a.kneeRise=1.05;a.kneeDuration=a.kneeTimer=.4+hold+a.kneeRise;a.state='kneeling';a.wind=a.swing=a.stagger=0;}
function dodge(a,dx,dy){a.dodgeTimer=.24;a.jumpTimer=.26;slide(a,dx,dy,.2);M.sound?.('rush');}

// ---------- Simulation der reinen Darstellung ----------
function stepActor(a,dt,sc){const ox=a.x,oy=a.y;for(const k of ['wind','swing','hit','stagger','dodgeTimer','jumpTimer','kneeTimer','facePain','shoutTimer','blockFlash','shieldBashTimer'])if(a[k]>0)a[k]=Math.max(0,a[k]-dt);
 if(a.blockTime>0){a.blockTime-=dt;if(a.blockTime<=0)a.block=false;}if(a.fallTimer>0&&!a.down)a.fallTimer=Math.max(.01,a.fallTimer-dt);
 if(a.state==='kneeling'&&a.kneeTimer<=0)a.state='idle';
 if(a.slide){const s=a.slide,part=Math.min(dt,s.left)/s.time;a.x+=s.dx*part;a.y+=s.dy*part;s.left-=dt;if(s.left<=0)a.slide=null;}
 if(a.move){const m=a.move,dx=m.x-a.x,dy=m.y-a.y,d=Math.hypot(dx,dy),len=m.speed*dt;a.state=m.state;if(!m.keep)a.a=Math.atan2(dy,dx);if(d<=len){a.x=m.x;a.y=m.y;a.move=null;a.state='idle';}else{a.x+=dx/d*len;a.y+=dy/d*len;}}
 else if(a.watch&&!a.down&&!a.g.dead&&!(a.wind>0)&&!(a.swing>0)&&!(a.fallTimer>0))face(a,a.watch);
 if(a.gateClip&&a.y>172)a.gateClip=false;
 M.updateLocomotion(a,ox,oy,a.phase||0,dt);
 if(a.g.bisected&&a.splitProgress<1)a.splitProgress=Math.min(1,a.splitProgress+dt*2.4);
 if(a.bleed){const b=a.bleed;b.left-=dt;a.agony.live=clamp(b.left/(b.total*.6),.3,1);b.spurt=(b.spurt??.2)-dt;if(sc&&b.spurt<=0){b.spurt=rand(.6,1.1);const A=a.agony,part=A.alt&&(b.n=(b.n||0)+1)%2?A.alt:A.part,[lx,ly]={belly:[2,-37],chest:[3,-48],leg:[6,-25],arm:[9,-52]}[part]||[2,-37],k=a.g.height/180*1.14,f=Math.cos(a.a||0)>=0?1:-1,rot=(a.fallSide||-1)*A.lie,X=a.x+(12+Math.cos(rot)*lx-Math.sin(rot)*ly)*k*f,Y=a.y+(5+Math.sin(rot)*lx+Math.cos(rot)*ly)*k,dir=Math.random()<.5?-1:1;for(let n=0;n<4+Math.round(6*A.live);n++)sc.fx.push({x:X+rand(-1,1),y:a.y+6,z:Math.max(3,a.y+6-Y),vx:dir*rand(12,55)*A.live,vy:rand(-10,10),vz:rand(35,85)*A.live+12,life:1.4,color:n%3?'#aa3c36':'#87352e',size:n%4?2:3,ground:true});}a.pool.r=Math.min(24,a.pool.r+dt*24/b.total);b.wait-=dt;if(sc&&b.wait<=0){b.wait=.35;sc.fx.push({x:a.pool.x+rand(-10,10),y:a.pool.y+rand(-4,4),z:rand(3,8),vx:rand(-10,10),vy:rand(-4,4),vz:rand(5,20),life:1.2,color:'#96352e',size:2,ground:true});}if(b.left<=0){a.bleed=null;a.g.dead=true;a.state='dead';a.facePain=0;}}
 if(a.hop&&a.move&&!(a.jumpTimer>0)){a.jumpTimer=.26;if(sc)dust(a.x,a.y);}
 if(a.g.dead&&a.pool)a.pool.r=Math.min(32,a.pool.r+dt*3.2);
 if(sc&&a.drip>0){a.drip-=dt;a.dripWait=(a.dripWait||0)-dt;if(a.dripWait<=0){a.dripWait=.16;const p=M.contactAnchor(a,'rs');sc.fx.push({x:p.x+rand(-2,2),y:a.y+rand(-2,3),z:Math.max(4,a.y-p.y-8),vx:rand(-8,8),vy:rand(-4,4),vz:0,life:1.6,color:'#96352e',size:2,ground:true});}}}
function stepScene(sc,dt){for(const a of sc.actors)stepActor(a,dt,sc);
 for(const p of sc.fx){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=160*dt;if(p.ground&&p.z<=0){sc.stains.push({x:p.x,y:p.y,r:p.size>2?2.6:1.5});p.life=0;}}sc.fx=sc.fx.filter(p=>p.life>0);if(sc.stains.length>420)sc.stains.splice(0,sc.stains.length-420);
 for(const p of sc.limbs){p.t+=dt;if(p.t<1.9){p.x+=p.vx*dt;p.y+=p.vy*dt;p.z=Math.max(0,p.z+p.vz*dt);p.vz-=240*dt;if(p.z===0&&p.vz<0)p.vz*=-.25;p.vx*=Math.exp(-4*dt);p.vy*=Math.exp(-4*dt);p.angle+=dt*5;}}
 for(const p of sc.ground)if(p.fly){const f=p.fly;f.t=Math.min(f.time,f.t+dt);const k=f.t/f.time;p.x=f.x0+(f.x1-f.x0)*k;p.y=f.y0+(f.y1-f.y0)*k;p.z=Math.sin(k*Math.PI)*f.height;p.angle+=dt*9;if(k>=1){p.fly=null;p.z=0;}}
 for(const s of sc.swings)s.life-=dt;sc.swings=sc.swings.filter(s=>s.life>0);sc.shake=Math.max(0,sc.shake-dt*25);}

// ---------- Drehbuch ----------
async function arenaStory(){const sc=run.sc,H=sc.hero,[E1,E2,E3,E4,E5,E6]=sc.foes,F=sc.last,blade=H.g.enemyGear.weapon;
 run.mode='black';run.shade=1;await wait(.5);text('Bevor du einen Ludus führtest, gehörtest du selbst der Arena.');await wait(3.8);text('');await wait(.8);
 run.mode='arena';run.shade=0;run.cheerBase=.9;cheer(2);camera(520,385,470);
 for(const e of sc.foes)e.watch=H;
 H.state='celebrate';await wait(1.7);H.state='idle';
 // Zwei Gegner fallen dem unversehrten Veteranen.
 face(H,E1);let s=walk(E1,466,398,175,{state:'charge'});walk(E2,604,388,120);await s;
 s=strike(E1,H,{tech:'overhead',wind:.34,heavy:true});await wait(.3);dodge(H,30,-8);await s;
 // Dem ersten nimmt er den Waffenarm, dann das Bein.
 await strike(H,E1,{variant:1,wind:.1,swing:.22,part:'rs',land:()=>{const axe=E1.g.enemyGear.weapon;sever(E1,'rua',H,-58,16);E1.g.enemyGear.weapon=null;sc.ground.push({sprite:0,item:axe,x:E1.x-10,y:E1.y-4,z:0,angle:.4,blood:0,fly:{x0:E1.x-10,y0:E1.y-4,x1:E1.x-52,y1:E1.y+30,t:0,time:.7,height:26}});E1.stagger=.7;}});
 await strike(H,E1,{variant:2,wind:.14,swing:.24,part:'rt',land:()=>sever(E1,'rt',H,-40,24)});await knockOut(E1);agonize(E1,'leg',2,1.5,13,'arm');
 face(H,E2);s=strike(E2,H,{tech:'thrust',wind:.3});await wait(.36);parry(H,E2);await s;
 await strike(H,E2,{tech:'spin',wind:.18,swing:.34,part:'belly',land:()=>wound(E2,'belly',.7,H)});await knockOut(E2);agonize(E2,'belly',0,1.2,20);cheer(2.4);
 // Ein weiterer greift an, verliert ein Bein, will weghüpfen – Griff von hinten, Kopf ab.
 camera(480,470,420);s=walk(H,502,472,95);walk(E6,446,476,170,{state:'charge'});await s;await until(()=>!E6.move);face(H,E6);
 s=strike(E6,H,{wind:.28});await wait(.34);parry(H,E6);await s;
 await strike(H,E6,{variant:2,wind:.12,swing:.24,part:'lt',land:()=>{sever(E6,'lt',H,-30,26);E6.stagger=.45;}});await wait(.35);
 E6.watch=null;E6.hop=true;E6.facePain=9;const flee=walk(E6,366,560,42);M.voice?.('pain',E6.g.appearance.voice||1,true);await wait(1.5);
 await walk(H,E6.x+34,E6.y+8,120);E6.move=null;E6.hop=false;await flee;await walk(H,E6.x+28,E6.y-3,120);
 H.a=E6.a=Math.PI;H.previewVictim=E6;H.rearFinish={left:.85};H.state='reargrab';E6.state='grabbed';M.sound?.('rush');camera(E6.x+8,E6.y-24,300,5);
 await until(()=>{H.rearFinish.left=Math.max(.3,H.rearFinish.left-run.dt);return H.rearFinish.left<=.3;});
 {const top=M.contactAnchor(E6,'head');for(const k of M.branches.neck){const p=E6.g.body[k];p.missing=true;p.hp=0;}
  sc.limbs.push({x:top.x,y:E6.y+5,z:E6.y-top.y,vz:60,vx:-72,vy:12,part:'head',team:1,t:0,angle:rand(0,TAU),armored:true,skin:E6.g.appearance.skin,hair:E6.g.appearance.hair,g:E6.g});
  for(let n=0;n<30;n++)sc.fx.push({x:top.x+rand(-3,3),y:E6.y,z:E6.y-top.y-8,vx:rand(-32,32),vy:rand(-15,15),vz:rand(65,125),life:2.4,color:n%3?'#a14337':'#87352e',size:n%5?2:3,ground:true});
  blade.blood=1;E6.g.dead=true;E6.fallSide=1;E6.fallDuration=E6.fallTimer=3;E6.riseDuration=1.25;E6.state='fallen';E6.pool={x:E6.x,y:E6.y,r:0};sc.shake=7;M.sound?.('sever');run.speed=.25;}
 await wait(.25);H.state='idle';H.rearFinish=null;H.previewVictim=null;E6.down=true;E6.fallTimer=0;E6.state='dead';M.sound?.('die');run.speed=1;cheer(2.6);await wait(.9);
 // Der dritte kommt von hinten.
 camera(520,420,440);s=walk(H,520,446,95);walk(E4,588,450,105);walk(E3,405,330,120);await s;face(H,E4);await until(()=>!E4.move);
 s=strike(H,E4,{wind:.16,swing:.26});await wait(.3);parry(E4,H);await s;
 walk(E3,464,446,150,{state:'charge'});s=strike(E4,H,{variant:1,wind:.26});await wait(.4);parry(H,E4);await s;await until(()=>!E3.move);
 H.wind=H.windMax=.6;H.technique='slash';H.state='attack';face(H,E4);
 await strike(E3,H,{tech:'overhead',wind:.55,swing:.34,heavy:true,part:'rs',land:()=>{
  const shoulder=M.contactAnchor(H,'rs');for(const k of M.branches.rua){const p=H.g.body[k];p.missing=true;p.hp=0;}H.g.stump='blood';H.drip=9;H.g.blood=58;H.g.enemyGear.weapon=null;
  sc.limbs.push({x:shoulder.x,y:H.y+3,z:H.y-shoulder.y,vz:70,vx:60,vy:26,part:'rua',team:0,t:0,angle:rand(0,TAU),armored:true,skin:H.g.appearance.skin,hair:H.g.appearance.hair});
  sc.ground.push({sprite:0,item:blade,x:H.x+18,y:H.y-4,z:0,angle:.4,blood:0,fly:{x0:H.x+18,y0:H.y-4,x1:562,y1:532,t:0,time:.9,height:34}});
  blood(shoulder.x,H.y,H.y-shoulder.y,1.4);H.bloodMarks.chest=.6;H.bloodMarks.rs=1;H.wind=H.swing=0;H.hit=.23;H.facePain=3;sc.shake=9;run.cheer=run.cheerBase=0;M.sound?.('sever');M.voice?.('pain',H.g.appearance.voice||1,true);run.speed=.22;camera(H.x+10,H.y-10,300,5);}});
 await wait(.3);run.speed=1;face(H,E3);H.stagger=1.5;E3.watch=E4.watch=E5.watch=H;walk(E3,436,420,40,{keep:true});walk(E5,392,452,90);
 await walk(H,544,522,52,{keep:true});kneel(H,2.5);camera(544,505,300);await wait(1.7);
 sc.ground=sc.ground.filter(p=>p.item!==blade);H.g.enemyGear.weapon=blade;M.sound?.('rise');await until(()=>H.kneeTimer<=0);
 H.shoutTimer=.6;M.voice?.('battlecry',H.g.appearance.voice||1);run.cheerBase=1;cheer(2.4);camera(540,490,440);await wait(.7);
 // Einarmig: ausweichen, Gegenstoß.
 face(H,E3);await walk(E3,494,518,150,{state:'charge'});s=strike(E3,H,{tech:'overhead',wind:.46,heavy:true});await wait(.42);dodge(H,24,-12);await s;
 // Rache: der Mann mit dem Zweihänder wird durchtrennt (vorhandene Darstellung der Durchtrennung).
 await strike(H,E3,{variant:1,wind:.32,swing:.3,heavy:true,part:'belly',land:()=>{const p=M.contactAnchor(E3,'belly');E3.g.bisected=true;E3.splitProgress=0;E3.g.body.belly.hp=0;E3.g.dead=true;E3.watch=null;E3.move=null;E3.wind=E3.swing=E3.stagger=0;E3.block=false;E3.bloodMarks.belly=1;E3.facePain=3;
  for(let n=0;n<30;n++)sc.fx.push({x:p.x+rand(-4,4),y:E3.y,z:E3.y-p.y,vx:rand(-60,60),vy:rand(-20,20),vz:rand(40,110),life:2.2,color:n%3?'#a14337':'#87352e',size:n%5?2:3,ground:true});
  blade.blood=1;E3.fallSide=-1;E3.fallDuration=E3.fallTimer=3;E3.riseDuration=1.25;E3.state='fallen';E3.pool={x:E3.x,y:E3.y,r:0};sc.shake=8;M.sound?.('sever');M.voice?.('pain',E3.g.appearance.voice||1,true);run.speed=.22;camera(E3.x+6,E3.y-18,300,5);}});
 await wait(.3);E3.down=true;E3.fallTimer=0;E3.state='dead';dust(E3.x,E3.y);M.sound?.('die');await wait(.2);run.speed=1;cheer(2.6);camera(540,490,440);await wait(.9);
 // Schlagabtausch, Treffer eingesteckt, Gegenangriff.
 await walk(E4,632,512,120);face(H,E4);s=strike(H,E4,{wind:.14,swing:.26});await wait(.27);parry(E4,H);await s;
 await strike(E4,H,{wind:.24,swing:.28,part:'chest',land:()=>{wound(H,'chest',.5,E4);H.stagger=.5;slide(H,-14,2,.2);}});await wait(.3);
 s=strike(E4,H,{tech:'overhead',wind:.36,heavy:true});await wait(.48);parry(H,E4);await s;
 await strike(H,E4,{tech:'thrust',wind:.2,swing:.24,part:'chest',land:()=>wound(E4,'chest',.8,H)});await knockOut(E4);agonize(E4,'chest',1,1.45,17);
 // Erschöpft: knapp ausgewichen, letzter Treffer.
 H.g.fatigue=88;H.energy=12;H.g.blood=42;face(H,E5);H.stagger=1.6;await walk(H,548,452,42,{keep:true});await wait(.5);
 face(H,E5);await walk(E5,H.x-56,H.y+4,200,{state:'charge'});s=strike(E5,H,{tech:'thrust',wind:.24,heavy:true});await wait(.3);dodge(H,8,-22);await s;
 await strike(H,E5,{variant:2,wind:.14,swing:.26,part:'lt',land:()=>wound(E5,'lt',.8,H)});await knockOut(E5);agonize(E5,'leg',0,1.25,24);cheer(2.6);H.stagger=.9;await wait(1.6);
 // Das Arenator öffnet sich.
 run.cheerBase=.4;M.sound?.('gong');walk(H,452,300,58);camera(520,205,440,1.6);await wait(1.2);M.sound?.('rise');let open=0;await until(()=>{open+=run.dt/1.8;sc.gate=clamp(open,0,1);return open>=1;});
 sc.actors.push(F);F.gateClip=true;F.watch=null;await walk(F,520,215,30);await until(()=>!H.move);F.watch=H;H.watch=F;camera(508,290,400,1.2);await walk(F,566,300,34);await wait(1.5);
 // Letzter Zweikampf: erst zurückgedrängt, dann der Fehler.
 await walk(F,512,300,85);s=strike(F,H,{wind:.26,swing:.28});await wait(.4);parry(H,F);slide(H,-20,0,.18);await s;slide(F,-20,0,.2);
 s=strike(F,H,{tech:'overhead',wind:.34,heavy:true});await wait(.46);parry(H,F);H.stagger=.4;slide(H,-24,0,.2);await s;slide(F,-22,0,.2);await wait(.2);
 F.shieldBashTimer=.44;await wait(.2);H.hit=.23;H.facePain=1;H.stagger=.55;slide(H,-30,0,.22);M.sound?.('block');await wait(.3);slide(F,-22,0,.2);camera(450,290,400,1.5);await wait(.25);
 s=strike(F,H,{tech:'thrust',wind:.3,heavy:true});await wait(.36);dodge(H,-2,-24);await s;slide(F,-14,0,.2);F.stagger=.8;
 H.watch=null;await strike(H,F,{tech:'thrust',variant:2,wind:.06,swing:.16,part:'belly',land:()=>wound(F,'belly',.5,H)});
 await strike(H,F,{variant:1,wind:.06,swing:.18,part:'chest',land:()=>wound(F,'chest',.5,H)});
 await strike(H,F,{variant:2,wind:.06,swing:.18,part:'ls',land:()=>{wound(F,'ls',.6,H);slide(F,14,0,.25);}});F.stagger=1.6;F.watch=null;cheer(1.5);await wait(.3);
 // Enthauptung mit der vorhandenen Darstellung für abgetrennte Köpfe.
 await strike(H,F,{wind:.75,swing:.34,heavy:true,part:'neck',land:()=>{const top=M.contactAnchor(F,'head');for(const k of M.branches.neck){const p=F.g.body[k];p.missing=true;p.hp=0;}
  sc.limbs.push({x:top.x,y:F.y+5,z:F.y-top.y,vz:55,vx:78,vy:10,part:'head',team:1,t:0,angle:rand(0,TAU),armored:true,skin:F.g.appearance.skin,hair:F.g.appearance.hair,g:F.g});
  for(let n=0;n<34;n++)sc.fx.push({x:top.x+rand(-3,3),y:F.y,z:F.y-top.y-8,vx:rand(-32,32),vy:rand(-15,15),vz:rand(65,125),life:2.7,color:n%3?'#a14337':'#87352e',size:n%5?2:3,ground:true});
  blade.blood=1;F.g.dead=true;F.stagger=0;F.fallSide=-1;F.fallDuration=F.fallTimer=3;F.riseDuration=1.25;F.state='fallen';F.pool={x:F.x,y:F.y,r:0};sc.shake=8;run.cheer=run.cheerBase=0;M.sound?.('sever');run.speed=.2;camera(F.x,F.y-24,290,5);}});
 await wait(.3);F.down=true;F.fallTimer=0;F.state='dead';M.sound?.('die');await wait(.2);run.speed=1;await wait(1.6);
 if(run.take===2){await take2();return;}
 // Freiheit (früheres Ende, Take 1).
 run.cheerBase=3;cheer(3);M.sound?.('win');camera(H.x+30,H.y-6,430,1.4);H.state='celebrate';H.shoutTimer=.6;await wait(1.6);
 text('Viele kämpften für Gold.');await wait(2.6);text('');await wait(.6);cheer(3);text('Andere für Ruhm.');await wait(2.6);text('');await wait(1.4);cheer(3);
 text('Du kämpftest für deine Freiheit.');await wait(3.2);text('');await wait(.5);run.title='FREI';cheer(3);M.sound?.('win');await wait(3);run.shade=1;await wait(1.1);run.title='';}
async function ludusStory(){const L=run.lud,a=L.actor;run.mode='ludus';run.cheerBase=run.cheer=0;Object.assign(run.cam,{x:610,y:430,vw:380});camera(610,430,380);await wait(.3);run.shade=0;
 const follow=()=>camera(a.x,a.y-30,380,3);walk(a,610,600,44);await until(()=>{follow();return !a.move;});await wait(.6);
 M.sound?.('rise');let open=0;await until(()=>{open+=run.dt/1.5;L.closed=1-clamp(open,0,1);return open>=1;});await wait(.5);
 text('Die Arena gab dir deine Freiheit.');await wait(3);text('');await wait(1.2);text('Jetzt baust du deine eigene.');await wait(3);text('');
 camera(450,360,900,1.1);await walk(a,574,608,48);await wait(.5);}

// ---------- Ende des Intros: FREEDOM → PROFIT (Take 2; das frühere Ende bleibt mit start(owner,{take:1}) abrufbar) ----------
// Nach dem letzten Sieg: Innenhof des alten Besitzers, Freilassungsurkunde, FREEDOM wird durchgestrichen, PROFIT, das Grinsen.
const CW=480,CH=300;
const TOP=130,BOT=130;
function courtBg(){if(run.courtBg)return run.courtBg;const c=document.createElement('canvas');c.width=CW;c.height=CH+TOP+BOT;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
 {const r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  // Kassettendecke aus dunklem Holz mit Gold, hängende Öllampen, Bannerstangen
  r(0,0,CW,TOP+12,'#2a1d14');for(let y=8;y<TOP;y+=30)for(let x=4;x<CW;x+=40){r(x,y,34,24,'#3a2a1c');r(x+3,y+3,28,18,'#2f2217');r(x+13,y+9,8,6,'#8a6a3a');}for(let x=0;x<CW;x+=40)r(x,0,4,TOP,'#1e150e');r(0,TOP-6,CW,6,'#5a4128');r(0,TOP-2,CW,2,'#d6b45a');
  for(const x of [96,240,384]){r(x,0,1,TOP-44,'#6a5030');r(x-8,TOP-46,16,5,'#8a6a3a');r(x-6,TOP-41,12,3,'#b08848');}
  // Boden geht weiter: Marmor, Läufer
  for(let y=CH+TOP;y<CH+TOP+BOT;y+=12)for(let x=((y/12)%2)*20-20;x<CW;x+=40){r(x,y,40,12,(x/40+y/12)%2?'#c3baa3':'#ada38a');r(x,y,40,1,'#d8d0bb');}r(214,CH+TOP,52,BOT,'#7a2420');r(218,CH+TOP,44,BOT,'#93302a');r(214,CH+TOP,4,BOT,'#d6b45a');r(262,CH+TOP,4,BOT,'#d6b45a');
  const vg=g.createLinearGradient(0,CH+TOP,0,CH+TOP+BOT);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.7)');g.fillStyle=vg;g.fillRect(0,CH+TOP,CW,BOT);}
 g.translate(0,TOP);
 const r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 // Rückwand aus warmem Sandstein mit Fugen
 r(0,0,CW,CH,'#1b1512');r(0,0,CW,178,'#7d6a4c');for(let y=4;y<178;y+=10)for(let x=(y/10%2)*16-16;x<CW;x+=32){r(x,y,31,9,(x*3+y)%5?'#86724f':'#776546');r(x,y,31,1,'#9a8560');}
 r(0,0,CW,10,'#4d3f2c');r(0,9,CW,3,'#b39a6c');for(let x=6;x<CW;x+=14)r(x,12,8,4,'#5d4c34');
 // Erhöhte Treppe in der Mitte mit Tor und Vorhängen
 r(176,40,128,82,'#3a2c20');r(184,48,112,74,'#120d0b');r(180,40,120,6,'#c9b37a');
 for(const [x,dir] of [[184,1],[262,-1]]){for(let i=0;i<34;i+=2)r(x+i,48,2,74-Math.abs(dir>0?i:34-i)*.6,i%4?'#8a2a24':'#a3352c');}
 r(226,52,28,20,'#d6b45a');r(230,56,20,12,'#8a2a24');r(238,58,4,8,'#d6b45a');
 for(let i=0;i<7;i++){const y=122+i*8,w=150+i*22;r(240-w/2,y,w,8,i%2?'#cfc7b4':'#ddd6c4');r(240-w/2,y,w,1,'#f1ece0');r(240-w/2,y+7,w,1,'#a59d8a');}
 // Marmorboden mit rotem Läufer
 for(let y=178;y<CH;y+=12)for(let x=((y/12)%2)*20-20;x<CW;x+=40){r(x,y,40,Math.min(12,CH-y),(x/40+y/12)%2?'#c8bfa9':'#b3a990');r(x,y,40,1,'#ddd5c1');}
 r(214,178,52,CH-178,'#7a2420');r(218,178,44,CH-178,'#93302a');for(let y=182;y<CH;y+=10){r(218,y,44,1,'#a63a31');}r(214,178,4,CH-178,'#d6b45a');r(262,178,4,CH-178,'#d6b45a');
 // Säulen (Marmor) mit Bannern dazwischen
 const column=x=>{r(x-11,30,22,154,'#ddd8cb');r(x-11,30,5,154,'#f2efe6');r(x+5,30,6,154,'#b4ad9b');for(let i=-6;i<=6;i+=4)r(x+i,36,1,144,'#c3bcaa');r(x-16,22,32,10,'#e8e3d7');r(x-16,22,32,2,'#fffaf0');r(x-14,32,28,3,'#bdb6a4');r(x-15,182,30,8,'#e2ddd0');r(x-17,188,34,5,'#bdb6a4');};
 const banner=(x,w)=>{r(x,16,w,4,'#5a4128');r(x+2,20,w-4,96,'#8a2a24');r(x+2,20,3,96,'#a3352c');r(x+w-5,20,3,96,'#6e201b');for(let i=0;i<w-4;i+=4)r(x+2+i,116,4,6-(i%8?3:0),'#8a2a24');r(x+2,24,w-4,2,'#d6b45a');r(x+2,106,w-4,2,'#d6b45a');const cx=x+w/2;r(cx-7,48,14,14,'#d6b45a');r(cx-5,50,10,10,'#8a2a24');r(cx-2,44,4,26,'#d6b45a');r(cx-9,53,18,4,'#d6b45a');};
 banner(70,30);banner(380,30);banner(140,22);banner(318,22);
 for(const x of [44,126,354,436])column(x);
 // Fackelhalter an den Säulen
 for(const x of [44,126,354,436]){r(x-2,84,4,12,'#3b3226');r(x-4,80,8,5,'#6a5030');}
 // Bronzebecken mit Feuer, Pflanzen in Kübeln, goldene Schalen
 for(const x of [160,320]){r(x-12,206,24,6,'#8a6a3a');r(x-10,204,20,3,'#b08848');r(x-2,212,4,18,'#6a5030');r(x-8,228,16,4,'#6a5030');}
 for(const x of [18,462]){r(x-9,214,18,16,'#9e6b49');r(x-7,212,14,3,'#b48356');for(let i=0;i<9;i++)r(x-10+(i*7)%20,186+(i*5)%26,4,4,i%2?'#55694a':'#6f8459');}
 r(300,160,10,4,'#d6b45a');r(170,160,10,4,'#d6b45a');
 const vg=g.createLinearGradient(0,0,0,CH);vg.addColorStop(0,'rgba(0,0,0,.35)');vg.addColorStop(.45,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=vg;g.fillRect(0,0,CW,CH);
 run.courtBg=c;return c;}
function courtFx(g,t){/* Öllampen an der Decke */for(const [i,x] of [96,240,384].entries()){const f=Math.floor(t*7+i*2)%3;g.globalAlpha=.2;g.fillStyle='#f0a050';g.beginPath();g.ellipse(x,-40,20,14,0,0,Math.PI*2);g.fill();g.globalAlpha=1;g.fillStyle='#e2ab5c';g.fillRect(x-2,-44+f,4,4);g.fillStyle='#fff0c0';g.fillRect(x-1,-46+(f===2?1:0),2,2);}
const r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),w,h);};
 for(const [i,x] of [44,126,354,436].entries()){const f=Math.floor(t*8+i*3)%3;g.globalAlpha=.2;g.fillStyle='#f0a050';g.beginPath();g.ellipse(x,72,24,20,0,0,Math.PI*2);g.fill();g.globalAlpha=1;r(x-3,72+(f===1?1:0),6,8-f,'#c8642e');r(x-2,70+f,4,5,'#e2ab5c');r(x-1,67+(f===2?2:0),2,4,'#fff0c0');}
 for(const [i,x] of [160,320].entries()){const f=Math.floor(t*9+i*5)%3;g.globalAlpha=.22;g.fillStyle='#f0a050';g.beginPath();g.ellipse(x,198,20,14,0,0,Math.PI*2);g.fill();g.globalAlpha=1;r(x-8,198+(f?1:0),16,6,'#c8642e');r(x-6,194+f,12,5,'#e2ab5c');r(x-2,190+f,4,4,'#fff0c0');}}
// Rolle: in der Hand (zu) oder geöffnet; k = 0 zu … 1 offen
function scrollSprite(g,x,y,open=0){const r=(a,b,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(a),Math.round(b),w,h);};if(open<=0){r(x-6,y-2,12,4,'#efe2bd');r(x-6,y-2,12,1,'#fff6dc');r(x-7,y-2,2,4,'#c9b37a');r(x+5,y-2,2,4,'#c9b37a');r(x-1,y-2,2,4,'#a3352c');return;}
 const w=Math.round(6+open*10);r(x-1,y-w,4,w*2,'#efe2bd');r(x-2,y-w-1,6,2,'#c9b37a');r(x-2,y+w-1,6,2,'#c9b37a');r(x,y-w+2,2,w*2-4,'#d9c48e');}
function hand(a){const f=Math.cos(a.a||0)>=0?1:-1,k=(a.g.height||180)/180;return {x:a.x+f*16*k,y:a.y-36*k};}
function courtPaint(g,w,h,t){const C=run.court,cam=run.cam,scale=Math.max(w/cam.vw,h/(CH+TOP+BOT)),hw=w/scale/2,hh=h/scale/2,cx=clamp(cam.x,hw,Math.max(hw,CW-hw)),cy=clamp(cam.y,hh-TOP,Math.max(hh-TOP,CH+BOT-hh));
 g.imageSmoothingEnabled=false;g.fillStyle='#120e0c';g.fillRect(0,0,w,h);g.save();g.translate(Math.round(w/2-cx*scale),Math.round(h/2-cy*scale));g.scale(scale,scale);g.drawImage(courtBg(),0,-TOP);courtFx(g,t);
 const list=[...C.actors].sort((a,b)=>a.y-b.y);(M.renderForgeActors||M.renderLudusActors)?.(g,list);
 if(C.scroll){const s=C.scroll;let p;if(s.at==='owner')p=hand(C.owner);else if(s.at==='hero')p=hand(C.hero);else p={x:s.x,y:s.y};scrollSprite(g,p.x,p.y,s.open||0);}
 g.restore();}
// Nahaufnahme der Urkunde
function scrollPaint(g,w,h,t){const S2=run.scrollShot,k=Math.min(1,S2.unroll);g.fillStyle='#120e0c';g.fillRect(0,0,w,h);
 const glow=g.createRadialGradient(w/2,h*.45,10,w/2,h*.45,Math.max(w,h)*.7);glow.addColorStop(0,'rgba(240,160,80,.25)');glow.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=glow;g.fillRect(0,0,w,h);
 const pw=Math.min(w*.86,h*1.25),ph=pw*.62*k,x0=(w-pw)/2,y0=h*.46-ph/2;if(ph<2)return;const u=pw/100;
 g.fillStyle='#e9dbb2';g.fillRect(x0,y0,pw,ph);g.fillStyle='#d8c690';for(let i=0;i<14;i++)g.fillRect(x0+((i*37)%97)*u,y0+((i*53)%60)/60*ph,u*(2+i%3),u*.6);
 g.fillStyle='#c4ad74';g.fillRect(x0,y0,pw,u*1.4);g.fillRect(x0,y0+ph-u*1.4,pw,u*1.4);
 for(const yy of [y0-u*2.4,y0+ph-u*.6]){g.fillStyle='#b8a067';g.fillRect(x0-u*2,yy,pw+u*4,u*3);g.fillStyle='#8a6a3a';g.fillRect(x0-u*3.5,yy-u*.4,u*2,u*3.8);g.fillRect(x0+pw+u*1.5,yy-u*.4,u*2,u*3.8);}
 // Daumen der verbliebenen Hand am linken Rand
 g.fillStyle=run.hero?.g.appearance.skin||'#b8875f';g.fillRect(x0-u*3,y0+ph*.42,u*7,u*9);g.fillStyle=run.hero?.g.appearance.shade||'#8d6446';g.fillRect(x0-u*3,y0+ph*.42+u*7,u*7,u*2);
 if(k<1)return;
 g.textAlign='center';g.textBaseline='middle';const fs=Math.round(u*15);g.font=`bold ${fs}px 'Courier Prime',monospace`;
 // FREEDOM in Gold, mit Schimmer
 const fy=y0+ph*.36,sh=S2.free;g.globalAlpha=Math.min(1,sh);g.fillStyle='#6a4a1c';g.fillText('FREEDOM',w/2+u*.6,fy+u*.8);g.fillStyle='#d6a83a';g.fillText('FREEDOM',w/2,fy);g.globalAlpha=Math.min(1,sh)*(.35+.25*Math.sin(t*5));g.fillStyle='#fff3c0';g.fillText('FREEDOM',w/2,fy-u*.3);g.globalAlpha=1;
 // dicker roter Strich, von links nach rechts
 if(S2.strike>0){const tw=g.measureText('FREEDOM').width*1.08,sx=w/2-tw/2,len=tw*Math.min(1,S2.strike);g.save();g.translate(sx,fy+u*.6);g.rotate(-.045);g.fillStyle='#8f1d18';g.fillRect(0,-u*1.6,len,u*3.2);g.fillStyle='#b8261f';g.fillRect(0,-u*1.6,len,u*1.2);for(let i=0;i<len;i+=u*5)g.fillRect(i,u*1.4,u*1.2,u*(1+((i/u)%3)));g.restore();}
 // PROFIT darunter, wie gestempelt
 if(S2.profit>0){const p=Math.min(1,S2.profit),sc=1.35-.35*p;g.save();g.translate(w/2,y0+ph*.72);g.scale(sc,sc);g.globalAlpha=p;g.font=`bold ${Math.round(u*17)}px 'Courier Prime',monospace`;g.fillStyle='#3a1210';g.fillText('PROFIT',u*.7,u*.9);g.fillStyle='#a3231d';g.fillText('PROFIT',0,0);g.restore();g.globalAlpha=1;}}
// Große Nahaufnahme: Gesicht des Gladiators, vom ernsten Blick zum gierigen Grinsen (Pixelbild 120 × 120, ganzzahlig vergrößert)
function facePaint(g,w,h,t){const F=run.faceShot,FW=120,FH=120,b=run.faceBuf||(run.faceBuf=document.createElement('canvas'));if(b.width!==FW||b.height!==FH){b.width=FW;b.height=FH;}const q=b.getContext('2d');q.clearRect(0,0,FW,FH);q.imageSmoothingEnabled=false;
 const r=(x,y,ww,hh,col)=>{q.fillStyle=col;q.fillRect(Math.round(x),Math.round(y),Math.round(ww),Math.round(hh));},A=run.hero.g.appearance,skin=A.skin||'#b8875f',shade=A.shade||'#8d6446',hair=A.hair||'#3b2a1e';
 const mix=(a,c,k)=>{const p=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));const x=p(a),y=p(c);return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*k).toString(16).padStart(2,'0')).join('');};
 const light=mix(skin,'#ffe6c8',.22),dark=mix(shade,'#2a160e',.3),lip=mix(shade,'#8a2a24',.45);
 const ease=v=>v*v*(3-2*v),k=ease(Math.max(0,Math.min(1,F.grin))),narrow=ease(Math.max(0,Math.min(1,(F.grin-.2)/.8))),look=Math.max(0,1-F.lift),bob=Math.round(Math.sin(t*1.7)*.5);
 // Hintergrund: Marmorsäule, rotes Banner, Fackelschein
 r(0,0,FW,FH,'#2a2016');const bg=q.createRadialGradient(100,24,2,100,24,60);bg.addColorStop(0,'rgba(240,160,80,.6)');bg.addColorStop(1,'rgba(0,0,0,0)');q.fillStyle=bg;q.fillRect(0,0,FW,FH);
 r(4,0,14,FH,'#b4ad9b');r(4,0,4,FH,'#ddd8cb');r(15,0,3,FH,'#8f8878');r(102,0,14,FH,'#6e201b');r(104,0,10,FH,'#8a2a24');r(104,30,10,2,'#d6b45a');
 const oy=12+bob+Math.round(look*4),cx=60;
 // Rüstung: linke Schulterplatte, rechts der verbundene Stumpf; Blut auf dem Metall
 r(22,100,76,20,'#3f433e');r(68,94,40,26,'#7d7f77');r(68,94,40,3,'#a7a99b');r(70,98,36,2,'#5d5f57');for(let i=0;i<4;i++)r(72+i*9,104,2,2,'#c9c6ac');r(84,100,10,6,'#7c2e28');r(76,110,6,3,'#7c2e28');
 r(14,98,32,22,'#e3d4ad');for(let i=0;i<5;i++)r(14,100+i*4,32,1,'#c4ad74');r(20,104,20,5,'#a3352c');r(26,109,12,8,'#7c2e28');r(18,114,6,4,'#8f2a24');
 r(44,96,26,24,'#5d5f57');r(44,96,26,2,'#8d8f84');r(50,106,8,3,'#7c2e28');
 // Hals
 r(50,64+oy,20,34,shade);r(52,64+oy,15,32,skin);r(52,92+oy,15,2,dark);
 // Kopf als ovale Form, rechts im Schatten, links Licht auf Wange und Stirn
 const hy=8+oy,W=y=>{const u=(y-28)/38;let hw=23*Math.sqrt(Math.max(0,1-u*u));if(y>46)hw-=(y-46)*.25;return Math.round(Math.max(0,hw));};
 for(let y=0;y<62;y++){const hw=W(y);if(hw<=0)continue;r(cx-hw,hy+y,hw*2,1,skin);r(cx+Math.round(hw*.45),hy+y,Math.ceil(hw*.55),1,shade);r(cx-hw,hy+y,2,1,dark);}
 for(let y=8;y<26;y++)r(cx-16,hy+y,3,1,light);for(let y=36;y<44;y++)r(cx-15,hy+y,4,1,light);
 // Ohren
 r(cx-26,hy+24,4,13,skin);r(cx-25,hy+27,2,6,dark);r(cx+22,hy+24,4,13,shade);r(cx+23,hy+27,2,6,dark);
 // Haare
 const style=(A.style??0)%4;for(let y=-4;y<8;y++){const hw=W(Math.max(0,y))+(y<0?-2+y:1);r(cx-hw,hy+y,hw*2,1,hair);}r(cx-12,hy-3,10,1,mix(hair,'#ffffff',.25));
 if(style!==2){r(cx-24,hy+4,5,16,hair);r(cx+19,hy+4,5,16,hair);}if(style===1){r(cx-25,hy+4,5,26,hair);r(cx+20,hy+4,5,26,hair);}if(style===3)r(cx-5,hy-9,10,6,hair);
 // Narbe über der linken Braue, getrocknetes Blut an Stirn und Wange
 r(cx-12,hy+11,1,14,'#e7b0ae');r(cx-11,hy+13,1,5,'#e7b0ae');r(cx+8,hy+6,7,3,'#7c2e28');r(cx+11,hy+9,2,7,'#7c2e28');r(cx-19,hy+40,5,2,'#7c2e28');
 // Brauen: ernst gerade; beim Grinsen innen tief, außen hoch
 const by=hy+18;for(const [x0,dir] of [[cx-17,1],[cx+4,-1]])for(let i=0;i<13;i++){const inner=dir>0?i/12:1-i/12,y=by+Math.round(inner*narrow*2.5-(1-inner)*narrow*1.5);r(x0+i,y,1,2,hair);}
 // Augen: zuerst nach unten auf die Urkunde, dann verengt und berechnend
 const ey=hy+23,open=Math.max(1,Math.round(5-narrow*3.4));for(const ex of [cx-16,cx+4]){r(ex,ey-1,12,1,dark);r(ex,ey,12,5,dark);r(ex+1,ey+(5-open),10,open,'#efe6d6');const ix=ex+4+Math.round(narrow*2),iy=ey+(5-open)+Math.round(look*2);r(ix,Math.min(ey+4,iy),4,Math.min(open,4),'#3a2416');r(ix,Math.min(ey+4,iy),2,Math.min(open,2),'#140b07');if(open>2)r(ix+2,Math.min(ey+4,iy),1,1,'#ffffff');r(ex,ey+(5-open)-1,12,1,shade);r(ex+1,ey+5,10,1,shade);if(narrow>.3)r(ex+2,ey+6,8,1,dark);}
 // Nase
 r(cx-2,hy+26,4,14,shade);r(cx-3,hy+38,8,3,shade);r(cx-4,hy+40,3,1,dark);r(cx+2,hy+40,3,1,dark);r(cx-2,hy+27,1,10,light);
 // Wangen heben sich, Lachfalten
 if(k>.15){r(cx-17,hy+37-Math.round(k*2),8,2,light);r(cx+9,hy+37-Math.round(k*2),8,2,shade);for(let i=0;i<7;i++){r(cx-11-Math.round(i*.3),hy+41+i-Math.round(k*2),1,1,dark);r(cx+10+Math.round(i*.3),hy+41+i-Math.round(k*2),1,1,dark);}}
 // Bart
 const beard=(A.beard??0)%4;if(beard===1)for(let i=0;i<40;i++)r(cx-15+(i*7)%30,hy+46+(i*5)%14,1,1,mix(hair,skin,.3));if(beard===2){for(let y=44;y<62;y++){const hw=W(y)-1;if(hw>0)r(cx-hw,hy+y,hw*2,1,hair);}r(cx-12,hy+43,24,3,hair);}if(beard===3){r(cx-6,hy+52,12,8,hair);r(cx-10,hy+43,20,2,hair);}
 // Mund: Linie → Mundwinkel hoch → breites, gieriges Grinsen mit Zähnen
 const my=hy+48,half=Math.round(8+k*6),lift=Math.round(k*5);
 const mouthY=i=>{const e=Math.abs(i)/half;return my-Math.round(e*e*lift);};
 if(k<.4){for(let i=-half;i<=half;i++)r(cx+i,mouthY(i),1,2,lip);r(cx-half+2,my+2,half*2-4,1,mix(lip,skin,.5));}
 else{const op=Math.round(1+(k-.4)/.6*4);for(let i=-half;i<=half;i++){const y=mouthY(i),depth=Math.max(1,Math.round(op*(1-Math.pow(Math.abs(i)/half,2))));r(cx+i,y-1,1,1,lip);r(cx+i,y,1,depth+1,'#2a0f0e');if(Math.abs(i)<half-1){r(cx+i,y,1,Math.min(depth,2),'#f2ead8');if((i+half)%3===0)r(cx+i,y,1,Math.min(depth,2),'#cfc6b2');}r(cx+i,y+depth+1,1,1,lip);}}
 if(beard===2)r(cx-11,my+5,22,2,hair);
 // Vordergrund: Rand der Urkunde mit PROFIT
 const pf=F.profit;g.imageSmoothingEnabled=false;g.fillStyle='#2a2016';g.fillRect(0,0,w,h);
 const s=Math.max(1,Math.floor(Math.min(Math.max(w/FW,h/FH),w/(FW*.78))*F.zoom*4)/4),dw=FW*s,dh=FH*s,dx=Math.round(w/2-dw/2),dy=Math.round(Math.min(h-dh,h/2-dh/2-h*.06));g.drawImage(b,dx,dy,dw,dh);
 if(dy+dh<h){g.fillStyle='#3f433e';g.fillRect(0,dy+dh,w,h-dy-dh);}
 if(pf>0){const bh=Math.round(s*16),y0=h-bh;g.fillStyle='#e9dbb2';g.fillRect(0,y0,w,bh);g.fillStyle='#c4ad74';g.fillRect(0,y0,w,Math.max(2,s));g.globalAlpha=Math.min(1,pf);g.font=`bold ${Math.round(s*11)}px 'Courier Prime',monospace`;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#3a1210';g.fillText('PROFIT',w/2+s*.6,y0+bh/2+s*.8);g.fillStyle='#a3231d';g.fillText('PROFIT',w/2,y0+bh/2);g.globalAlpha=1;}}
function titlePaint(g,w,h,t){g.fillStyle='#070b0d';g.fillRect(0,0,w,h);const k=Math.min(1,run.titleK||0);g.globalAlpha=k;g.textAlign='center';g.textBaseline='middle';
 let fs=Math.min(w*.13,h*.16);g.font=`bold ${Math.round(fs)}px 'Courier Prime',monospace`;while(g.measureText('ARENA THEORY').width>w*.9&&fs>12){fs-=2;g.font=`bold ${Math.round(fs)}px 'Courier Prime',monospace`;}
 g.fillStyle='#5a3d1c';g.fillText('ARENA THEORY',w/2,h*.45+fs*.07);g.fillStyle='#f4d37a';g.fillText('ARENA THEORY',w/2,h*.45);
 g.font=`bold ${Math.round(fs*.32)}px 'Courier Prime',monospace`;g.fillStyle='#c9c6b4';g.fillText('DEATH IS PERMANENT',w/2,h*.45+fs*.85);g.globalAlpha=1;}
const read=s=>Math.max(2.2,1.2+s.length*.055);
async function say(s){text(s);await wait(read(s));text('');await wait(.35);}
function prepareEnd(){const sc=run.sc,H=sc.hero,blade=H.g.enemyGear.weapon;for(const k of M.branches.rua){const p=H.g.body[k];p.missing=true;p.hp=0;}H.g.stump='blood';H.bloodMarks={chest:.7,rs:1,belly:.4,ls:.3};blade.blood=1;H.g.blood=42;H.g.fatigue=88;for(const [part,p] of [['chest',.5],['belly',.3]])H.g.body[part].hp=Math.max(30,H.g.body[part].hp-p*55);}
async function take2(){const sc=run.sc,H=sc.hero;run.hero=H;
 // kurzer Siegesmoment in der Arena, dann Schwarzblende
 if(run.mode==='arena'){run.cheerBase=3;cheer(3);M.sound?.('win');camera(H.x+30,H.y-6,430,1.4);H.state='celebrate';H.shoutTimer=.6;await wait(2.2);H.state='idle';run.shade=1;await wait(1.1);}
 // ---- Szene 1: Die Freilassung
 const ownerSpec={...M.ludus.randomOwner(),name:'Gnaeus Varro'};Object.assign(ownerSpec,{height:171,weight:108});ownerSpec.appearance={...ownerSpec.appearance,hair:'#b9b4a6',beard:0,cloth:'#5c2a58'};
 const O={...actor(M.ludus.ownerFigure(ownerSpec),300,206,0),lanista:true,energy:100};O.a=Math.PI;
 H.g.enemyGear.weapon=null;Object.assign(H,{x:150,y:232,a:0,state:'idle',move:null,watch:null,facePain:0,stagger:0,hit:0,wind:0,swing:0,drip:0,kneeTimer:0,dodgeTimer:0,jumpTimer:0,shoutTimer:0,traderPose:null});
 run.court={actors:[H,O],hero:H,owner:O,scroll:{at:'owner'}};run.mode='court';run.cheerBase=run.cheer=0;Object.assign(run.cam,{x:240,y:170,vw:440});camera(240,170,440,1);await wait(.3);run.shade=0;await wait(.8);
 await walk(H,262,214,32);H.a=0;O.a=Math.PI;await wait(.6);
 O.traderPose='point';O.gest=0;M.sound?.('rise');await wait(1.4);
 // Übergabe: die Rolle wandert in die verbliebene (linke) Hand
 const from=hand(O),to=hand(H);run.court.scroll={at:'air',x:from.x,y:from.y};H.traderPose='pull';H.poseK=0;let f=0;await until(()=>{f=Math.min(1,f+run.dt/.9);run.court.scroll.x=from.x+(to.x-from.x)*f;run.court.scroll.y=from.y+(to.y-from.y)*f-Math.sin(f*Math.PI)*4;return f>=1;});
 run.court.scroll={at:'hero'};O.traderPose=null;await wait(.6);
 // Die Kamera fährt langsam heran
 camera(262,190,160,.35);
 await say('Du hast geblutet.');await say('Du hast Freunde sterben sehen.');await say('Du hast einen Arm verloren.');
 await say('Doch endlich hältst du in deinen Händen, wofür du all die Jahre gekämpft hast …');
 // ---- Szene 2: FREEDOM
 run.scrollShot={unroll:0,free:0,strike:0,profit:0};run.mode='scroll';M.sound?.('rise');await until(()=>{run.scrollShot.unroll+=run.dt/.8;return run.scrollShot.unroll>=1;});
 M.sound?.('win');await until(()=>{run.scrollShot.free+=run.dt/.5;return run.scrollShot.free>=1;});await wait(2.2);
 M.sound?.('slash');await until(()=>{run.scrollShot.strike+=run.dt/.45;return run.scrollShot.strike>=1;});M.sound?.('heavy');await wait(.9);
 // ---- Szene 3: Das Grinsen (PROFIT erscheint im Vordergrund, die Mundwinkel ziehen sich hoch)
 run.faceShot={grin:0,profit:0,lift:0,zoom:1,dy:0};run.mode='face';await wait(1.1);
 await until(()=>{const F=run.faceShot;F.profit=Math.min(1,F.profit+run.dt/.7);F.grin=Math.min(1,F.grin+run.dt/3.2);F.lift=Math.min(1,F.lift+run.dt/2.4);F.zoom=1+F.grin*.06;return F.grin>=1;});
 M.sound?.('coins');await wait(1.8);
 // ---- Szene 4: Die bittere Wahrheit (vor den Säulen; der alte Besitzer geht die Treppe hinauf)
 run.mode='court';run.court.scroll={at:'hero',open:1};Object.assign(run.cam,{x:252,y:180,vw:230});camera(252,180,230,.6);H.traderPose='pull';walk(O,240,150,22).then(()=>walk(O,240,118,18)).then(()=>{O.hidden=true;run.court.actors=run.court.actors.filter(a=>a!==O);});
 for(const s of ['Du hast deine Freiheit nicht erkämpft, um ein besserer Mensch zu werden.','Du hast sie erkämpft, um endlich auf der richtigen Seite der Peitsche zu stehen.','Dein Ziel ist einfach: Werde steinreich.','Kaufe Gladiatoren. Schicke sie in die Arena. Kassiere das Gold.','Und wenn dafür hundert, tausend oder zehntausend arme Schweine elendig verrecken müssen …','Nun ja.','Du weißt schließlich selbst, wie sich das anfühlt.','Aber diesmal bist du derjenige, der Eintritt verlangt.'])await say(s);
 // ---- Szene 5: Finale – die Urkunde wird zusammengerollt, selbstzufrieden
 camera(262,198,170,.8);await wait(.8);M.sound?.('rise');await until(()=>{run.court.scroll.open=Math.max(0,run.court.scroll.open-run.dt/1.1);return run.court.scroll.open<=0;});await wait(.5);H.traderPose=null;await wait(1.4);run.shade=1;await wait(1.2);
 run.mode='title';run.titleK=0;run.shade=0;M.sound?.('gong');await until(()=>{run.titleK+=run.dt/1.2;return run.titleK>=1;});await wait(3.6);run.shade=1;await wait(1);}

// ---------- Rahmen, Zeichnen, Abschluss ----------
function build(){const v=document.createElement('div');v.id='introView';v.innerHTML='<canvas id="introCanvas" aria-label="Die Vorgeschichte deines Lanista"></canvas><div id="introShade"></div><p id="introText" role="status" aria-live="polite"></p><p id="introTitle" aria-hidden="true"></p>';document.body.appendChild(v);/* Kein Überspringen-Knopf: ein Klick auf das Bild springt zur nächsten Einstellung */v.addEventListener?.('click',()=>{if(run&&!run.done)run.tap=true;});return v;}
function paint(){const c=run.canvas;if(!c?.getContext)return;const cw=c.clientWidth||1040,ch=c.clientHeight||720,k=Math.min(1,1040/Math.max(cw,ch)),w=Math.max(1,Math.round(cw*k)),h=Math.max(1,Math.round(ch*k));if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
 const cam=run.cam,g=c.getContext('2d');if(run.mode==='arena'){run.sc.cam={x:cam.x,y:cam.y,vw:cam.vw,vh:cam.vw*.75};M.renderStory(c,run.sc);}
 else if(run.mode==='ludus'){const L=run.lud,scale=Math.max(Math.min(w/cam.vw,h/(cam.vw*.75)),Math.min(w/900,h/670)),hw=w/scale/2,hh=h/scale/2,cx=hw*2>=900?450:clamp(cam.x,hw,900-hw),cy=hh*2>=670?335:clamp(cam.y,hh,670-hh);g.imageSmoothingEnabled=false;g.fillStyle='#101b20';g.fillRect(0,0,w,h);g.save();g.translate(Math.round(w/2-cx*scale),Math.round(h/2-cy*scale));g.scale(scale,scale);g.drawImage(L.bg,0,0);if(L.closed>0)M.ludus.drawGate(g,L.closed);M.renderLudusActors(g,[L.actor]);g.restore();}
 else if(run.mode==='court')courtPaint(g,w,h,performance.now()/1000);else if(run.mode==='scroll')scrollPaint(g,w,h,performance.now()/1000);else if(run.mode==='face')facePaint(g,w,h,performance.now()/1000);else if(run.mode==='title')titlePaint(g,w,h,performance.now()/1000);
 else{g.fillStyle='#070b0d';g.fillRect(0,0,w,h);}}
function sync(){const set=(id,key,value)=>{const el=$(id);if(el&&el[key]!==value)el[key]=value;},style=(id,key,value)=>{const el=$(id);if(el?.style&&el.style[key]!==value)el.style[key]=value;};
 if(run.caption)set('introText','textContent',run.caption);style('introText','opacity',run.caption?'1':'0');if(run.title)set('introTitle','textContent',run.title);style('introTitle','opacity',run.title?'1':'0');style('introTitle','transform',run.title?'scale(1)':'scale(.8)');style('introShade','opacity',String(run.shade));const high=run.mode==='ludus';style('introText','top',high?'20%':'');style('introText','bottom',high?'auto':'');}
function tick(real){if(!run||run.done)return;const base=Math.min(.05,Math.max(0,real));run.dt=base*run.speed;
 if(run.mode==='arena')stepScene(run.sc,run.dt);else if(run.mode==='ludus')stepActor(run.lud.actor,run.dt,null);else if(run.mode==='court')for(const a of run.court.actors)stepActor(a,run.dt,null);
 run.cheer=Math.max(run.cheerBase,run.cheer-base*.7);M.cheer=run.mode==='arena'?run.cheer:0;
 const to=run.camTo,mix=1-Math.exp(-base*to.rate);for(const k of ['x','y','vw'])run.cam[k]+=(to[k]-run.cam[k])*mix;
 const waiting=run.waiters;run.waiters=[];for(const w of waiting){let ok=false;try{ok=w.cond();}catch(e){w.rej(e);continue;}if(ok)w.res();else run.waiters.push(w);}run.tap=false;
 paint();sync();}
function loop(t){if(!run||run.done)return;const dt=(t-(run.last??t))/1000;run.last=t;if(!document.hidden)tick(dt);requestAnimationFrame(loop);}
function finish(){if(!run||run.done)return;const r=run;r.done=true;M.cheer=0;S.lanista=JSON.parse(JSON.stringify(r.owner));M.persist();M.ui.close();M.ui.click('nav:home');const v=r.view;run=null;if(v?.style)v.style.opacity='0';const drop=()=>v?.remove?.();if(typeof setTimeout==='function')setTimeout(drop,650);else drop();}
function start(owner,opt={}){if(run)return;M.audioStart?.();const players=cast(owner),keeper={...owner,lostArm:'r',veteran:true};
 const sc={arena:4,level:6,gate:0,shake:0,stains:[],fx:[],limbs:[],ground:[],swings:[],cam:null,hero:actor(players.hero,520,400,0),foes:[[300,385],[790,410],[330,250],[720,560],[590,222],[236,566]].map(([x,y],i)=>actor(players.foes[i],x,y,1)),last:actor(players.last,520,104,1)};sc.actors=[sc.hero,...sc.foes];
 const walker=M.ludus.ownerFigure(keeper),lud={bg:M.ludus.background(),closed:1,actor:{...actor(walker,610,330,0),lanista:true,energy:100}};
 run={owner:keeper,sc,lud,view:build(),canvas:null,mode:'black',shade:1,caption:'',title:'',cheer:0,cheerBase:0,speed:1,dt:0,waiters:[],aborted:false,done:false,cam:{x:520,y:385,vw:470},camTo:{x:520,y:385,vw:470,rate:2.2}};run.take=opt.take||2;run.endOnly=!!opt.endOnly;run.canvas=$('introCanvas');sync();
 (async()=>{if(run.endOnly){prepareEnd();await take2();}else await arenaStory();if(run.take!==2)await ludusStory();})().catch(e=>{if(e!==ABORT)console.error('Intro abgebrochen:',e);}).then(finish);
 requestAnimationFrame(loop);}
function skip(){if(!run||run.done)return;run.aborted=true;const waiting=run.waiters;run.waiters=[];for(const w of waiting)w.rej(ABORT);}
M.intro={start,skip,tick,active:()=>!!run&&!run.done};
})();
