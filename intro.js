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
  {weapon:['trident',3],armor:[['leftarm',2],['leftshoulder',3],['leftleg',2,'leather']]}].map(spec=>dress(M.makeGladiator(2,true),spec));
 const last=dress(M.makeGladiator(5,true),{weapon:['long',6],shield:['scutum',5],armor:all.map(id=>[id,5])});last.champion=true;last.fame=M.mantles[29].fame;
 S.rng=keep;return {hero,foes,last};}

// ---------- kleine Regie-Werkzeuge ----------
function until(cond){return new Promise((res,rej)=>{if(!run||run.aborted)return rej(ABORT);run.waiters.push({cond,res,rej});});}
function wait(seconds){let left=seconds;return until(()=>(left-=run.dt)<=0);}
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
 if(a.g.dead&&a.pool)a.pool.r=Math.min(32,a.pool.r+dt*3.2);
 if(sc&&a.drip>0){a.drip-=dt;a.dripWait=(a.dripWait||0)-dt;if(a.dripWait<=0){a.dripWait=.16;const p=M.contactAnchor(a,'rs');sc.fx.push({x:p.x+rand(-2,2),y:a.y+rand(-2,3),z:Math.max(4,a.y-p.y-8),vx:rand(-8,8),vy:rand(-4,4),vz:0,life:1.6,color:'#96352e',size:2,ground:true});}}}
function stepScene(sc,dt){for(const a of sc.actors)stepActor(a,dt,sc);
 for(const p of sc.fx){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=160*dt;if(p.ground&&p.z<=0){sc.stains.push({x:p.x,y:p.y,r:p.size>2?2.6:1.5});p.life=0;}}sc.fx=sc.fx.filter(p=>p.life>0);if(sc.stains.length>420)sc.stains.splice(0,sc.stains.length-420);
 for(const p of sc.limbs){p.t+=dt;if(p.t<1.9){p.x+=p.vx*dt;p.y+=p.vy*dt;p.z=Math.max(0,p.z+p.vz*dt);p.vz-=240*dt;if(p.z===0&&p.vz<0)p.vz*=-.25;p.vx*=Math.exp(-4*dt);p.vy*=Math.exp(-4*dt);p.angle+=dt*5;}}
 for(const p of sc.ground)if(p.fly){const f=p.fly;f.t=Math.min(f.time,f.t+dt);const k=f.t/f.time;p.x=f.x0+(f.x1-f.x0)*k;p.y=f.y0+(f.y1-f.y0)*k;p.z=Math.sin(k*Math.PI)*f.height;p.angle+=dt*9;if(k>=1){p.fly=null;p.z=0;}}
 for(const s of sc.swings)s.life-=dt;sc.swings=sc.swings.filter(s=>s.life>0);sc.shake=Math.max(0,sc.shake-dt*25);}

// ---------- Drehbuch ----------
async function arenaStory(){const sc=run.sc,H=sc.hero,[E1,E2,E3,E4,E5]=sc.foes,F=sc.last,blade=H.g.enemyGear.weapon;
 run.mode='black';run.shade=1;await wait(.5);text('Bevor du einen Ludus führtest, gehörtest du selbst der Arena.');await wait(3.8);text('');await wait(.8);
 run.mode='arena';run.shade=0;run.cheerBase=.9;cheer(2);camera(520,385,470);
 for(const e of sc.foes)e.watch=H;
 H.state='celebrate';await wait(1.7);H.state='idle';
 // Zwei Gegner fallen dem unversehrten Veteranen.
 face(H,E1);let s=walk(E1,466,398,175,{state:'charge'});walk(E2,604,388,120);await s;
 s=strike(E1,H,{tech:'overhead',wind:.34,heavy:true});await wait(.3);dodge(H,30,-8);await s;
 // Dem ersten nimmt er den Waffenarm, dann das Bein.
 await strike(H,E1,{variant:1,wind:.1,swing:.22,part:'rs',land:()=>{const axe=E1.g.enemyGear.weapon;sever(E1,'rua',H,-58,16);E1.g.enemyGear.weapon=null;sc.ground.push({sprite:0,item:axe,x:E1.x-10,y:E1.y-4,z:0,angle:.4,blood:0,fly:{x0:E1.x-10,y0:E1.y-4,x1:E1.x-52,y1:E1.y+30,t:0,time:.7,height:26}});E1.stagger=.7;}});
 await strike(H,E1,{variant:2,wind:.14,swing:.24,part:'rt',land:()=>sever(E1,'rt',H,-40,24)});await knockOut(E1);
 face(H,E2);s=strike(E2,H,{tech:'thrust',wind:.3});await wait(.36);parry(H,E2);await s;
 await strike(H,E2,{tech:'spin',wind:.18,swing:.34,part:'belly',land:()=>wound(E2,'belly',.7,H)});await knockOut(E2);cheer(2.4);
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
 await strike(H,E4,{tech:'thrust',wind:.2,swing:.24,part:'belly',land:()=>wound(E4,'belly',.8,H)});await knockOut(E4);
 // Erschöpft: knapp ausgewichen, letzter Treffer.
 H.g.fatigue=88;H.energy=12;H.g.blood=42;face(H,E5);H.stagger=1.6;await walk(H,548,452,42,{keep:true});await wait(.5);
 face(H,E5);await walk(E5,H.x-56,H.y+4,200,{state:'charge'});s=strike(E5,H,{tech:'thrust',wind:.24,heavy:true});await wait(.3);dodge(H,8,-22);await s;
 await strike(H,E5,{variant:2,wind:.14,swing:.26,part:'chest',land:()=>wound(E5,'chest',.8,H)});await knockOut(E5);cheer(2.6);H.stagger=.9;await wait(1.6);
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
 // Freiheit.
 run.cheerBase=3;cheer(3);M.sound?.('win');camera(H.x+30,H.y-6,430,1.4);H.state='celebrate';H.shoutTimer=.6;await wait(1.6);
 text('Viele kämpften für Gold.');await wait(2.6);text('');await wait(.6);cheer(3);text('Andere für Ruhm.');await wait(2.6);text('');await wait(1.4);cheer(3);
 text('Du kämpftest für deine Freiheit.');await wait(3.2);text('');await wait(.5);run.title='FREI';cheer(3);M.sound?.('win');await wait(3);run.shade=1;await wait(1.1);run.title='';}
async function ludusStory(){const L=run.lud,a=L.actor;run.mode='ludus';run.cheerBase=run.cheer=0;Object.assign(run.cam,{x:610,y:430,vw:380});camera(610,430,380);await wait(.3);run.shade=0;
 const follow=()=>camera(a.x,a.y-30,380,3);walk(a,610,600,44);await until(()=>{follow();return !a.move;});await wait(.6);
 M.sound?.('rise');let open=0;await until(()=>{open+=run.dt/1.5;L.closed=1-clamp(open,0,1);return open>=1;});await wait(.5);
 text('Die Arena gab dir deine Freiheit.');await wait(3);text('');await wait(1.2);text('Jetzt baust du deine eigene.');await wait(3);text('');
 camera(450,360,900,1.1);await walk(a,574,608,48);await wait(.5);}

// ---------- Rahmen, Zeichnen, Abschluss ----------
function build(){const v=document.createElement('div');v.id='introView';v.innerHTML='<canvas id="introCanvas" aria-label="Die Vorgeschichte deines Lanista"></canvas><div id="introShade"></div><p id="introText" role="status" aria-live="polite"></p><p id="introTitle" aria-hidden="true"></p><button id="introSkip" class="btn" type="button">ÜBERSPRINGEN →</button>';document.body.appendChild(v);const skip=$('introSkip');if(skip)skip.onclick=()=>M.intro.skip();return v;}
function paint(){const c=run.canvas;if(!c?.getContext)return;const cw=c.clientWidth||1040,ch=c.clientHeight||720,k=Math.min(1,1040/Math.max(cw,ch)),w=Math.max(1,Math.round(cw*k)),h=Math.max(1,Math.round(ch*k));if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
 const cam=run.cam,g=c.getContext('2d');if(run.mode==='arena'){run.sc.cam={x:cam.x,y:cam.y,vw:cam.vw,vh:cam.vw*.75};M.renderStory(c,run.sc);}
 else if(run.mode==='ludus'){const L=run.lud,scale=Math.max(Math.min(w/cam.vw,h/(cam.vw*.75)),Math.min(w/900,h/670)),hw=w/scale/2,hh=h/scale/2,cx=hw*2>=900?450:clamp(cam.x,hw,900-hw),cy=hh*2>=670?335:clamp(cam.y,hh,670-hh);g.imageSmoothingEnabled=false;g.fillStyle='#101b20';g.fillRect(0,0,w,h);g.save();g.translate(Math.round(w/2-cx*scale),Math.round(h/2-cy*scale));g.scale(scale,scale);g.drawImage(L.bg,0,0);if(L.closed>0)M.ludus.drawGate(g,L.closed);M.renderLudusActors(g,[L.actor]);g.restore();}
 else{g.fillStyle='#070b0d';g.fillRect(0,0,w,h);}}
function sync(){const set=(id,key,value)=>{const el=$(id);if(el&&el[key]!==value)el[key]=value;},style=(id,key,value)=>{const el=$(id);if(el?.style&&el.style[key]!==value)el.style[key]=value;};
 if(run.caption)set('introText','textContent',run.caption);style('introText','opacity',run.caption?'1':'0');if(run.title)set('introTitle','textContent',run.title);style('introTitle','opacity',run.title?'1':'0');style('introTitle','transform',run.title?'scale(1)':'scale(.8)');style('introShade','opacity',String(run.shade));const high=run.mode==='ludus';style('introText','top',high?'20%':'');style('introText','bottom',high?'auto':'');}
function tick(real){if(!run||run.done)return;const base=Math.min(.05,Math.max(0,real));run.dt=base*run.speed;
 if(run.mode==='arena')stepScene(run.sc,run.dt);else if(run.mode==='ludus')stepActor(run.lud.actor,run.dt,null);
 run.cheer=Math.max(run.cheerBase,run.cheer-base*.7);M.cheer=run.mode==='arena'?run.cheer:0;
 const to=run.camTo,mix=1-Math.exp(-base*to.rate);for(const k of ['x','y','vw'])run.cam[k]+=(to[k]-run.cam[k])*mix;
 const waiting=run.waiters;run.waiters=[];for(const w of waiting){let ok=false;try{ok=w.cond();}catch(e){w.rej(e);continue;}if(ok)w.res();else run.waiters.push(w);}
 paint();sync();}
function loop(t){if(!run||run.done)return;const dt=(t-(run.last??t))/1000;run.last=t;if(!document.hidden)tick(dt);requestAnimationFrame(loop);}
function finish(){if(!run||run.done)return;const r=run;r.done=true;M.cheer=0;S.lanista=JSON.parse(JSON.stringify(r.owner));M.persist();M.ui.close();M.ui.click('nav:home');const v=r.view;run=null;if(v?.style)v.style.opacity='0';const drop=()=>v?.remove?.();if(typeof setTimeout==='function')setTimeout(drop,650);else drop();}
function start(owner){if(run)return;M.audioStart?.();const players=cast(owner),keeper={...owner,lostArm:'r',veteran:true};
 const sc={arena:4,level:6,gate:0,shake:0,stains:[],fx:[],limbs:[],ground:[],swings:[],cam:null,hero:actor(players.hero,520,400,0),foes:[[300,385],[790,410],[330,250],[720,560],[590,222]].map(([x,y],i)=>actor(players.foes[i],x,y,1)),last:actor(players.last,520,104,1)};sc.actors=[sc.hero,...sc.foes];
 const walker=M.ludus.ownerFigure(keeper),lud={bg:M.ludus.background(),closed:1,actor:{...actor(walker,610,330,0),lanista:true,energy:100}};
 run={owner:keeper,sc,lud,view:build(),canvas:null,mode:'black',shade:1,caption:'',title:'',cheer:0,cheerBase:0,speed:1,dt:0,waiters:[],aborted:false,done:false,cam:{x:520,y:385,vw:470},camTo:{x:520,y:385,vw:470,rate:2.2}};run.canvas=$('introCanvas');sync();
 (async()=>{await arenaStory();await ludusStory();})().catch(e=>{if(e!==ABORT)console.error('Intro abgebrochen:',e);}).then(finish);
 requestAnimationFrame(loop);}
function skip(){if(!run||run.done)return;run.aborted=true;const waiting=run.waiters;run.waiters=[];for(const w of waiting)w.rej(ABORT);}
M.intro={start,skip,tick,active:()=>!!run&&!run.done};
})();
