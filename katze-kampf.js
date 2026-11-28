'use strict';
// WAS DIE DATEI TUT: ARENA THEORY · KATZEN-KAMPF (KA3a; eigenständige Testversion; wird nur vom Katzen-Kampf-Editor dist/katze-kampf.html geladen)
// =====================================================================================================
// · Katze als Kämpfer nach dem Muster von Bär (dist/baer-kampf.js) und Hund: Menschen treffen die Katze über M.rexReceive, die Katze trifft
//   Menschen über M.hit; gezeichnet über M.drawRex mit KATZE.draw (Skelett aus dist/katze.js). Ausgangspunkt der Angriffe ist der Löwe aus 1.0
//   (Pranke, Sprung, Biss, Niederhalten; Regel 11 im Katzenfahrplan).
// · Gewebe je Körperstelle (kopf, hals, brust, bauch, vl, hl), Blut, Wunden an der getroffenen Stelle, Mut, Flucht. Die Mähne schützt den Hals.
// · Angriffe in KA3a (Texte Englisch): Drohen, Ansprung (ducken, Hinterteil wackelt, Sprung auf den Gegner, reißt ihn um), Prankenhieb,
//   Prankenfolge links und rechts, Biss, Niederhalten mit Würgebiss in die Kehle, Flucht. Die übrigen Angriffe der Liste folgen in KA3b und KA3c.
// · Zielen von Anfang an (Lehre aus Bär B3c1): Die Trefferstelle steht vor dem Ausholen fest; Rumpf, Pranke und Maul greifen genau dorthin
//   (Abschnitt „Zielen“), am Liegenden liegt eine Pranke auf der Brust und das Maul an der Kehle. Prüfwert: K.contacts.
// · Eigener Simulationsschritt für Kämpfe mit Katzen (K.build, M.fixedStep nur für battle.katze), aus denselben Bausteinen wie arena-core.js.
// Keine Spieldatei wird geändert; die Werte sind vorläufig (Einmessen in KA25). Schalter: K.OPT, Adresse ?katzeSprung=0, ?katzeMaehne=0.
// =====================================================================================================
(()=>{
const M=window.MG,C=window.KATZE,AN=window.AN;if(!M||!C||!AN)return;
const S=M.s,H=window.HahnArena,DG=()=>window.DOG,cl=M.clamp,TAU=Math.PI*2,MC=4.2;
const rnd=(a,b)=>a+Math.random()*(b-a),sm=u=>{u=u<0?0:u>1?1:u;return u*u*(3-2*u);},lerp=(a,b,t)=>a+(b-a)*t,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const K={SCALE:1.08,TMAX:180,OPT:{schaden:1,haerte:1,maehne:1,sprung:1},force:null};C.K=K;
try{const q=new URLSearchParams(location.search);if(q.get('katzeSprung')==='0')K.OPT.sprung=0;if(q.get('katzeMaehne')==='0')K.OPT.maehne=0;}catch{}

// ---------------------------------------------------------------- Angriffe (Name im Spiel Englisch, Bedienung Deutsch)
K.ATTACKS=[['threat','Threat display','Drohen','Bleibt stehen, legt die Ohren an, brüllt, der Schwanz peitscht, Scheinhieb mit der Pranke.'],
 ['pounce','Pounce','Ansprung','Duckt sich, das Hinterteil wackelt, springt aus den Hinterbeinen auf den Gegner und reißt ihn mit dem ganzen Gewicht um.'],
 ['swipe','Paw swipe','Prankenhieb','Hieb mit ausgefahrenen Krallen, vier Furchen.'],['flurry','Paw flurry','Prankenfolge','Drei schnelle Hiebe, abwechselnd mit beiden Pranken.'],
 ['bite','Bite','Biss','Schnappt nach Arm, Schulter oder Bein und reißt.'],['pin','Throat hold','Niederhalten und Würgebiss','Steht über dem Liegenden, eine Pranke auf der Brust, und hält die Kehle zu, bis er sich nicht mehr rührt.'],
 ['flee','Flee','Flucht','Hat genug.']];
const NAME=Object.fromEntries(K.ATTACKS.map(a=>[a[0],a[1]]));

// ---------------------------------------------------------------- Kampfparameter aus den Istwerten (vorläufig, KA25 misst ein)
const PART_MAX={kopf:28,hals:24,brust:40,bauch:36,vl:22,hl:22},PARTS=Object.keys(PART_MAX);K.PARTS=PARTS;
K.PART_DE={kopf:'Kopf',hals:'Hals',brust:'Brust',bauch:'Flanke',vl:'Vorderpranke',hl:'Hinterlauf'};
const PART_EN={kopf:'head',hals:'neck',brust:'chest',bauch:'flank',vl:'forepaw',hl:'hind leg'};
function params(D){const s=D.stats,f=v=>v/50,wf=Math.pow(D.weight/250,.6),Br=C.breed(D.breed),SH=C.shapeOf(D),sz=C.szOf(D,SH);
 const swipe=95*(.5+.5*f(s.pranke))*(.7+.3*f(s.kraft))*wf,bite=90*(.5+.5*f(s.biss))*(.8+.2*f(s.kraft))*wf;
 return {swipe,bite,choke:bite*.34,ram:34*(.5+.5*f(s.kraft))*wf*wf,res:27*(.6+.4*f(s.zaeh))*wf,mass:D.weight*(.6+.4*f(s.kraft)),pace:cl(.7+.3*f(s.tempo),.6,1.3),stam:.7+.3*f(s.ausdauer),
  wild:cl(s.wild/100,0,1),mut:cl(s.mut/100,0,1),interrupt:22*(.7+.3*f(s.zaeh))*wf,sz,SH,mane:cl((SH.mane||0)*(D.appearance?.mane||1),0,1.3),bauart:Br.bauart,skulls:C.skullsOf(Br),leap:C.leapRange(D)};}
K.params=params;

// ---------------------------------------------------------------- Katze als Kämpfer
K.makeFighter=function(D,team,x,y){
 const rng=S.rng,g=M.makeGladiator(0,team===1);S.rng=rng;
 g.name=D.name;g.id='katze-'+D.id+'-'+Math.floor(Math.random()*1e6).toString(36);g.role='Soldat';g.traits=[];g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};g.equipment={weapon:null,secondary:null,shield:null,armor:{}};
 for(const k in g.stats)g.stats[k]=48;Object.assign(g.stats,{will:100,morale:100,agility:cl(D.stats.tempo,15,95),reflex:cl(D.stats.tempo,15,95),strength:cl(D.stats.kraft,15,99),toughness:cl(D.stats.zaeh,15,99)});g.weight=D.weight;g.height=D.height;
 const P=params(D),a=M.createCombatActor(g,team,0),fig=C.actor(D,'stand'),tissue={},max={};for(const p of PARTS){max[p]=PART_MAX[p];tissue[p]=max[p];}
 fig.rate=2.2;fig.facing=team?-1:1;fig.wounds=[];fig.dist=0;
 Object.assign(a,{rex:true,katze:D,fig,P,x,y,r:17*P.sz,tissue,max,wounds:fig.wounds,blood:100,bleed:{},morale:100,energy:100,spray:[],pool:null,velocity:0,a:team?Math.PI:0,
  mode:'approach',clock:0,duration:0,cool:rnd(.3,1),leapCool:0,z:0,hit:0,dirx:team?-1:1,diry:0,victim:null,kills:0,hits:0,attacks:{},taken:0,threatDone:false,pounces:0,landed:0,pins:0,lastDist:0,phase:0});
 return a;};
const out=a=>a.katze?a.g.dead||a.fled:a.down||a.surrendered||a.g.dead;K.out=out;
K.health=b=>cl(Math.min(...['kopf','hals','brust'].map(p=>b.tissue[p]/b.max[p]),(b.tissue.bauch+b.tissue.vl+b.tissue.hl)/(b.max.bauch+b.max.vl+b.max.hl))*100*Math.min(1,b.blood/70),0,100);
// Ein verwundeter Löwe oder Tiger wird gefährlicher (Fahrplan, Angriff 13): schwere Großkatzen schlagen unter 55 % Gesundheit härter und schneller zu
const fury=b=>b.P.skulls>=4&&K.health(b)<55;K.fury=fury;
function log(t){const b=S.battle;if(!b)return;b.log.unshift({time:Math.floor(b.time),text:t});b.log.length=Math.min(60,b.log.length);K.onLog?.(t);}
function state(b,mode,dur=0){b.Oprev=b.Ocur||null;b.mode=mode;b.clock=0;b.duration=dur;b.struck=false;b.ticks=0;b.phase=0;b.aimPt=null;b.aimPts=null;if(NAME[mode])b.attacks[mode]=(b.attacks[mode]||0)+1;}

// ---------------------------------------------------------------- Blut (wie bei Hund und Bär)
function spray(b,x,y,z,n,dir=null){for(let i=0;i<n;i++){const an=dir==null?rnd(0,TAU):dir+rnd(-.7,.7),v=rnd(15,75);b.spray.push({x,y,z,vx:Math.cos(an)*v,vy:Math.sin(an)*v*.55,vz:rnd(10,70),s:Math.random()<.3?2:1});}
 if(b.spray.length>240)b.spray.splice(0,b.spray.length-240);}
function stain(x,y,r){M.stains.push({x:x+rnd(-3,3),y:y+rnd(-2,2),r});if(M.stains.length>420)M.stains.shift();}
function stepSpray(b,dt){for(let i=b.spray.length-1;i>=0;i--){const p=b.spray[i];p.vz-=170*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.z<=0){b.spray.splice(i,1);if(Math.random()<.55)stain(p.x,p.y,p.s+Math.random()*1.4);}}}
const scaleOf=b=>b.P.sz*K.SCALE;
function partWorld(b,part){const R=b.fig._R,f=C.facing(b.fig),s=scaleOf(b);if(!R)return {x:b.x,y:b.y,z:20*s};const [ax,ay]=C.anchor(R,part);return {x:b.x+f*ax*s,y:b.y,z:-ay*s};}

// ---------------------------------------------------------------- Schaden an der Katze. kind: bite | claw | cut | stab | blunt
const WOUND_AT={kopf:[[-3,3],[-3,3]],hals:[[-3,3],[-3,3]],brust:[[-4,4],[-5,4]],bauch:[[-9,9],[-4,4]],vl:[[-1.5,1.5],[-4,4]],hl:[[-2,2],[-4,4]]};
function hurt(b,part,dmg,kind,att){if(b.g.dead||!(dmg>0))return 0;const P=b.P;
 // Mähne (Fahrplan: schützt Hals und Nacken): Hiebe und Bisse bleiben in den Haaren hängen, Stiche kommen besser durch
 let mf=1;if(part==='hals'&&P.mane>.05&&K.OPT.maehne){mf=1-cl(P.mane,0,1)*(kind==='stab'?.25:.5)*K.OPT.maehne;mf=cl(mf,.2,1);if(mf<.8&&att&&!att.katze&&Math.random()<.35)log(att.g.name+"'s blow is lost in "+b.g.name+"'s mane.");}
 const wd=dmg*mf*({cut:.95,blunt:.8,stab:1,bite:.95,claw:1}[kind]??1)/(P.res*K.OPT.haerte);
 b.tissue[part]=Math.max(0,b.tissue[part]-wd);b.taken+=wd;b.hit=.3;
 const bk={bite:.03,claw:.045,cut:.045,stab:.045,blunt:.006}[kind]??.02,pk={hals:1.7,kopf:1,brust:1,bauch:1.2,vl:.8,hl:.8}[part];
 b.bleed[part]=(b.bleed[part]||0)+wd*bk*pk;b.blood=Math.max(0,b.blood-wd*({bite:.07,claw:.1,cut:.1,stab:.09,blunt:.02}[kind]??.05)*pk);
 b.morale-=wd*1.3*(1-P.mut)*(part==='kopf'?1.2:1)*(1.1-P.wild*.5);
 const [u,v]=WOUND_AT[part];b.wounds.push({part,u:rnd(u[0],u[1]),v:rnd(v[0],v[1]),size:cl(wd/3.5,1,6),kind,seed:Math.random()*1e4});if(b.wounds.length>20)b.wounds.shift();// Zeichenarbeit: höchstens 20 Wunden je Katze
 const w=partWorld(b,part);spray(b,w.x,w.y,w.z,Math.min(26,3+wd*1.4),att?Math.atan2(b.y-att.y,b.x-att.x):null);if(wd>5)stain(w.x,w.y,2+wd*.15);
 if(att){b.lastAttacker=att.id;att.damage=(att.damage||0)+wd;if(wd>4&&b.mode!=='pin')b.grudge=att.id;}
 if(wd>3)C.sound?.('pain',b);
 if(b.tissue.hals<=0||b.tissue.kopf<=0||b.tissue.brust<=0)die(b,att,{hals:'Throat opened',kopf:'Skull broken',brust:'Heart found'}[b.tissue.hals<=0?'hals':b.tissue.kopf<=0?'kopf':'brust']);
 return wd;}
K.hurt=hurt;
function die(b,a,cause){if(b.g.dead)return;releaseVictim(b);b.g.dead=true;b.down=true;b.death=true;b.g.cause=cause||'Bled out';b.g.killer=a?a.g.name:'';if(a)a.kills=(a.kills||0)+1;state(b,'dead',99);
 const fig=b.fig;if(fig.jump){fig.jump=null;fig.mode='stand';fig.pose=null;}C.go(fig,null);C.pose(fig,'lie');log(a?a.g.name+' kills '+b.g.name+'. ('+b.g.cause+') The crowd wanted it the other way round.':b.g.name+' bleeds out in the sand.');}

// ---------------------------------------------------------------- Treffer an der Katze (Mensch, Hund, Löwe) über M.rexReceive
const HPART={head:'kopf',neck:'hals',chest:'brust',belly:'bauch',ls:'brust',rs:'brust',lua:'vl',rua:'vl',lfa:'vl',rfa:'vl',lh:'vl',rh:'vl',lt:'hl',rt:'hl',lsh:'hl',rsh:'hl',lf:'hl',rf:'hl'};
function receive(a,d,projectile,snapshot){if(d.g.dead)return;const ef=snapshot||M.effective(a),w=ef.w||{};
 if(a.dog||a.lion||a.rex){const part=HPART[ef.partId]||(Math.random()<.4?'hl':Math.random()<.5?'bauch':'hals'),wd=hurt(d,part,(ef.damage||w.damage||10)*rnd(.85,1.15),'bite',a);afterHit(d,a,wd);return;}
 if(!projectile&&dist(a,d)>ef.range+d.r+18)return;
 if(projectile&&w.id==='net'){M.floater?.(d.x,d.y-60,'TEARS THE NET','#e9d1a2');log(d.g.name+' tears through the net.');return;}
 // Die Katze ist schwerer zu treffen als der Bär: im Sprung und im Lauf kaum, über dem Opfer leicht
 const ag=a.g.stats,fast=d.fig.jump?.45:(d.fig.v||0)>120?.25:0,acc=cl(.2+(projectile?ag.precision:ag.dexterity||48)*.014+(ag.experience||0)*.01-fast+(d.mode==='pin'?.2:0),.2,.97);
 if(Math.random()>acc)return;
 let dmg=ef.damage*rnd(.8,1.2)*(projectile?1:M.spacingFactor?M.spacingFactor(w,dist(a,d)-d.r*.5,ef.range):1)*(a.energy<15?.6:1);if(w.id==='fist')dmg*=.3;else if(w.bladed)dmg*=1.1;
 const rel=Math.abs(M.angleDiff(M.angle(d,a),d.a)),r=Math.random();
 const part=rel<.9?(r<.3?'kopf':r<.48?'hals':r<.76?'brust':'vl'):rel<2.2?(r<.1?'hals':r<.3?'brust':r<.72?'bauch':r<.85?'vl':'hl'):(r<.5?'hl':r<.92?'bauch':'hals');
 const kind=w.bladed?(w.attack==='thrust'||/spear|trident|dagger|javelin/.test(w.id||'')?'stab':'cut'):projectile?'stab':'blunt';
 const wd=hurt(d,part,dmg,kind,a);M.recordDamage?.(a,ef.attackKey||a.lastAttackKey||'slash',dmg);a.contactPoint={x:d.x,y:d.y-28*d.P.sz};if(w.item)w.item.blood=Math.min(1,(w.item.blood||0)+dmg/55);
 if(wd>5)log(a.g.name+' hits '+d.g.name+' in the '+PART_EN[part]+'.');afterHit(d,a,wd);}
function afterHit(d,a,wd){if(d.g.dead)return;
 if(d.mode==='pin'){d.interrupt=(d.interrupt||0)+wd;if(d.interrupt>=d.P.interrupt*.3){releaseVictim(d);d.grudge=a.id;state(d,'approach');d.cool=.3;log(a.g.name+' drives '+d.g.name+' off its victim.');}}}
const baseReceive=M.rexReceive;M.rexReceive=function(a,d){if(d?.katze)return receive.apply(this,arguments);return baseReceive?.apply(this,arguments);};

// ---------------------------------------------------------------- Die Katze trifft
const pick=L=>{let x=Math.random()*L.reduce((n,e)=>n+e[1],0);for(const e of L){x-=e[1];if(x<=0)return e[0];}return L[0][0];};
const SWIPE_AT=[['head',.24],['chest',.26],['belly',.1],['lua',.09],['rua',.09],['lfa',.06],['rfa',.06],['ls',.05],['rs',.05]];
const BITE_AT=[['ls',.14],['rs',.14],['lua',.14],['rua',.14],['lfa',.1],['rfa',.1],['lt',.12],['rt',.12]];
const CAT_AT=[['kopf',.15],['hals',.15],['brust',.25],['bauch',.25],['vl',.1],['hl',.1]];
const human=t=>t&&!t.katze&&!t.bear&&!t.dog,fallen=t=>human(t)&&((t.fallTimer||0)>0||t.down||t.state==='fallen');
function humanPart(t,kind){let p=pick(kind==='bite'?BITE_AT:SWIPE_AT);if(t.g.body[p]?.missing)p='chest';return p;}
// Rüstung: Zähne wie beim Hund (DOG.biteFactor), Krallen und Wucht kommen besser durch
function armorF(t,part,kind){const bf=DG()?.biteFactor?.(t,part,kind==='ram'?'leap':'bite')?.f??1;return kind==='bite'||kind==='choke'?Math.min(1,bf*1.3):kind==='ram'?.6+.4*bf:.4+.6*bf;}
function hurtHuman(b,t,kind,partId,dmg){const old=t.taken,wasDead=t.g.dead,f=armorF(t,partId,kind);dmg*=f*K.OPT.schaden*(fury(b)?1.15:1);
 const rg=Math.max(70,dist(b,t)+20);
 const ef={...M.effective(b),damage:dmg,range:rg,attackKey:'cat-'+kind,partId,w:{id:'cat-'+kind,name:NAME[kind==='choke'?'pin':kind==='ram'?'pounce':kind]||'Mauling',damage:dmg,range:rg,weight:kind==='ram'?12:kind==='swipe'?7:4,pen:.3,crit:1.2,bladed:false,ammo:0,block:0}};
 M.hit(b,t,false,ef);const landed=t.taken>old;
 if(landed){b.hits++;if(kind==='bite'||kind==='choke')b.fig.mouthBlood=Math.min(1,(b.fig.mouthBlood||0)+.2);const p=t.g.body[partId];if(p&&kind!=='ram')p.bleed=(p.bleed||0)+(.6+dmg*.025)*f;
  try{const pt=M.contactAnchor(t,partId||'chest');spray(b,pt.x,pt.y+8,Math.max(4,t.y-pt.y),8+dmg*.35,b.a);}catch{}
  if(!wasDead&&t.g.dead)b.kills++;}
 return landed;}
function strike(b,t,kind,dmg,at){if(!t||t.g.dead)return false;
 if(t.katze){const wd=hurt(t,pick(CAT_AT),dmg*K.OPT.schaden,kind==='swipe'?'claw':kind==='ram'?'blunt':'bite',b);b.hits++;if(t.g.dead)b.kills++;afterHit(t,b,wd);return true;}
 if(!human(t))return false;return hurtHuman(b,t,kind,at||humanPart(t,kind),dmg);}
function fell(b,t,why,dur,push){if(!human(t)||t.g.dead)return;M.knockdown(t,why,dur);t.kx=(t.kx||0)+Math.cos(b.a)*push;t.ky=(t.ky||0)+Math.sin(b.a)*push*.3;}
function releaseVictim(b){const t=S.battle?.actors.find(a=>a.id===b.victim);if(t&&t.pinnedBy===b.id)delete t.pinnedBy;b.victim=null;b.interrupt=0;}
const lameOf=(b,p)=>cl((.6-b.tissue[p]/b.max[p])/.6,0,1);
K.lame=b=>Math.max(lameOf(b,'vl'),lameOf(b,'hl'));

// ---------------------------------------------------------------- Bewegung: der Körper kommt nur so weit voran, wie die Beine laufen (KATZE.step, fig.dist)
const BX=[110,930],BY=[190,605];
function brake(b){const v=b.fig.v||0,hs=Math.sqrt(cl(b.katze.weight/200,.3,2));return v*v/(2*(60+1.2*v)/hs*1.4)*scaleOf(b);}
function head(b,tx,ty,gait,durch){const fig=b.fig,dx=tx-b.x,dy=ty-b.y,d=Math.hypot(dx,dy)||1,want=dx>=0?1:-1;
 if(Math.abs(dx)>12&&want!==C.facing(fig)&&!fig.turn&&!fig.turnWant)C.turn(fig);
 if(fig.turn||fig.turnWant||fig.mode!=='stand'&&!fig.go){C.go(fig,null);if(fig.mode!=='stand'&&!fig.jump)C.pose(fig,'stand');}
 else if(!durch&&d<=brake(b)+2)C.go(fig,null);
 else{const lame=K.lame(b);if(lame>.45&&gait==='gallop')gait='trot';C.go(fig,gait);fig.pace=b.P.pace*(1-.5*lame)*(b.energy<15?.8:1);}
 b.dirx=dx/d;b.diry=dy/d;return d;}
function halt(b){const fig=b.fig;C.go(fig,null);if(fig.mode!=='stand'&&!fig.jump&&!fig.turn)C.pose(fig,'stand');}
function faceTo(b,t){const fig=b.fig,want=t.x>=b.x?1:-1;if(want!==C.facing(fig)&&!fig.turn&&!fig.turnWant){C.turn(fig);return false;}return !fig.turn&&!fig.turnWant;}
// Platz vor dem Gegner: die Katze steht seitlich daneben, Pranke und Maul reichen hin
const reachOf=b=>(b.P.SH.L*.5+23)*scaleOf(b);
const inReach=(b,t)=>(t.x-b.x)*C.facing(b.fig)>10&&Math.abs(t.x-b.x)<reachOf(b)+(t.r||14)*.5+8&&Math.abs(t.y-b.y)<22&&!b.fig.turn;
function spot(b,t){const side=b.x<=t.x?-1:1;return {x:cl(t.x+side*(reachOf(b)+(t.r||14)*.2),BX[0],BX[1]),y:t.y+1};}

// ---------------------------------------------------------------- Zielen: Pranke und Maul treffen die Stelle (von Anfang an, wie Bär B3c1)
// Die Trefferstelle am Gegner wird ins Maß des Katzenskeletts umgerechnet (x nach vorn, y nach oben negativ). Der Rumpf lehnt sich so weit,
// dass Vorderpranke bzw. Hals und Kopf hinreichen (hoch: Vorderkörper hebt sich, die Katze steht kurz auf den Hinterbeinen), dann greifen Pranke und Maul den Punkt.
const HY={head:-62,neck:-56,chest:-47,belly:-35,ls:-49,rs:-49,lua:-43,rua:-43,lfa:-35,rfa:-35,lh:-35,rh:-35,lt:-23,rt:-23,lsh:-11,rsh:-11,lf:-2,rf:-2};
// Stelle am Liegenden in Arenakoordinaten: dieselbe Lage wie contactAnchor in sim.js, aber für jedes Körperteil
function groundPoint(V,part){const sc=(V.g.height||180)/180*1.14,face=Math.cos(V.a||0)>=0?1:-1,rot=(V.fallSide||-1)*1.35,xs=part[0]==='l'?-8:part[0]==='r'?8:0,ys=HY[part]??-45;
 return {x:V.x+(12+Math.cos(rot)*xs-Math.sin(rot)*ys)*sc*face,y:V.y+(5+Math.sin(rot)*xs+Math.cos(rot)*ys)*sc};}
function worldPoint(V,part){if(V.katze)return {x:V.x,y:V.y-30*scaleOf(V)};part=part||'chest';if(fallen(V))return groundPoint(V,part);try{return M.contactAnchor(V,part);}catch{return {x:V.x,y:V.y-50};}}
function aimPoint(b,V,part){const w=worldPoint(V,part),s=scaleOf(b);return {x:cl((w.x-b.x)*C.facing(b.fig)/s,6,84),y:cl((w.y-b.y)/s,-96,-2)};}
K.aimPoint=aimPoint;K.groundPoint=groundPoint;
const curOf=fig=>fig.pose?.cur||C.poseSet(fig.mode,fig.SH||C.shapeOf(fig.cat));
// Rumpf lehnen: zusätzliche Neigung (p) und Vorschub (hx), damit die Schulter bis auf r an den Punkt T herankommt
function lean(Cc,SH,T,r){const L=SH.L,sy0=Cc.hy-L*Math.sin(Cc.p),up=(sy0-r*.72)-T.y;let p=0;
 if(up>0)p=Math.asin(cl(up/L,0,.66));else if(T.y>sy0+r*.8)p=-.1;
 const sx=Cc.hx+L*Math.cos(Cc.p+p);return {p,hx:cl(T.x-sx-r*.78,-6,13)};}
// Ein Prankenhieb: v 0…1 (Treffer bei .42). Ausholen neben die Schulter, Hieb zum Punkt, die Krallen ziehen nach unten durch, zurück auf den Boden.
const HITV=.42;
function pawStroke(O,Cc,SH,T,v,far,LN){if(v<=0||v>=1)return;const L=SH.L,sx=Cc.hx+LN.hx+L*Math.cos(Cc.p+LN.p),sy=Cc.hy-L*Math.sin(Cc.p+LN.p),wx=Cc.wx-(far?3:0),wy=Cc.wy;
 const W=[sx+6-wx,sy+3-wy,.5],Hh=[T.x-MC*.96-wx,T.y-MC*.28-wy,1.02],F=[Hh[0]-4,Hh[1]+8,.6];let a,c,e;
 if(v<.26){a=[0,0,0];c=W;e=sm(v/.26);}else if(v<HITV){a=W;c=Hh;e=(v-.26)/(HITV-.26);e*=e;}else if(v<.6){a=Hh;c=F;e=sm((v-HITV)/(.6-HITV));}else{a=F;c=[0,0,0];e=sm((v-.6)/.4);}
 const kx=far?'fx':'nx',ky=far?'fy':'ny',ka=far?'fa':'na';O[kx]=lerp(a[0],c[0],e);O[ky]=lerp(a[1],c[1],e);O[ka]=lerp(a[2],c[2],e);if(!far)O.claws=Math.max(O.claws||0,sm((v-.12)/.1)*sm((.75-v)/.1));}
const stay=v=>v<.6?sm(v/.3):sm((1-v)/.4);// wie lange sich der Rumpf lehnt
// Maul zum Punkt: Hals und Kopf zeigen gemeinsam auf T. Die vordere Zahnreihe liegt im Kopf bei (MX,MY) mal Kopfgröße; Hals und Kopf bilden
// zusammen einen starren Arm bis dorthin (Länge reach, um dl nach unten geknickt). Ist der Punkt näher oder weiter, schiebt sich der Rumpf.
const MX=10.5,MY=3.2;
function mouthTo(O,Cc,SH,T,LN,w){const L=SH.L,p=Cc.p+LN.p*w,nbx=Cc.hx+LN.hx*w+L*Math.cos(p)+3*Math.cos(p)-2*Math.sin(p),nby=Cc.hy-L*Math.sin(p)-3*Math.sin(p)-2*Math.cos(p);
 const ax=SH.neck+MX*SH.headS,ay=MY*SH.headS,reach=Math.hypot(ax,ay),dl=Math.atan2(ay,ax),d=Math.hypot(T.x-nbx,T.y-nby),a=cl(Math.atan2(-(T.y-nby),T.x-nbx)+dl,-1.3,1.3);
 O.ne=(O.ne||0)+(a-Cc.ne)*w;O.he=(O.he||0)+(a-Cc.he)*w;O.hx=(O.hx||0)+cl(d-reach,-9,6)*Math.cos(a-dl)*w;}

// Nachführen: einmal das Skelett mit der Überlagerung rechnen (kein Zeichnen) und den Rest des Abstands ausgleichen. So sitzen Maul und Pranke
// auch dann auf der Stelle, wenn Becken oder Bein im Skelett nachgeben. Kostet eine Skelettrechnung je Bild, nur während Biss, Hieb und Würgebiss.
function mouthOf(R,SH){const hs=SH.headS,ch=Math.cos(R.he),sh=Math.sin(R.he);return [R.hcx+(MX*ch+MY*sh)*hs,R.hcy+(-MX*sh+MY*ch)*hs];}
function pawOf(R){const l=R.legs[3];return [l.fx+MC*Math.cos(l.ang),l.fy-MC*Math.sin(l.ang)];}
function refine(b,O,t,w,Tm,Tp){if(w<=.02)return;const fig=b.fig,SH=b.P.SH;fig.over=O;const R=C.rig(fig,t);
 if(Tm){const [x,y]=mouthOf(R,SH),ex=Tm.x-x,ey=Tm.y-y,r=SH.neck+MX*SH.headS,da=cl(-ey/r,-.35,.35)*w;O.hx=(O.hx||0)+cl(ex,-7,7)*w;O.ne=(O.ne||0)+da;O.he=(O.he||0)+da*.5;}
 if(Tp){const [x,y]=pawOf(R);O.nx=(O.nx||0)+cl(Tp.x-x,-8,8)*w;O.ny=(O.ny||0)+cl(Tp.y-y,-8,8)*w;}}
// ---------------------------------------------------------------- Überlagerte Bewegung je Angriff (Zahlen für KATZE a.over)
const OKEYS=['hx','hy','p','bend','ne','he','ta','tc','nx','ny','na','fx','fy','fa','mouth','lip','tongue','claws','lash','ear','sc'];
const SEG=[[0,.36],[.32,.68],[.64,1]];K.FLURRY=SEG.map(s=>s[0]+HITV*(s[1]-s[0]));
function over(b,t){const fig=b.fig,SH=b.P.SH,m=b.mode,u=b.duration?cl(b.clock/b.duration,0,1):0,O={},hr=b.hit>0?b.hit/.3:0;
 if(fig.jump||fig.turn){/* Sprung und Wenden gehören dem Skelett */}
 else if(b.g.dead){const e=sm(b.clock/1.3);O.ne=-.78*e;O.he=-.3*e;O.mouth=.2*e;O.tc=-.8*e;O.ear=-.4*e;}
 else if(m==='threat'){const e=sm(u/.15)*sm((1-u)/.15),sw=sm((u-.52)/.08)*sm((.8-u)/.14);O.hy=2.4*e;O.ne=-.14*e;O.hx=-2*e;O.lash=e;O.ear=-.9*e;O.lip=.7*e;O.sc=.6*e;O.nx=10*sw;O.ny=-12*sw;O.na=.95*sw;O.claws=sw;}
 else if((m==='swipe'||m==='flurry')&&b.aimPt){const Cc=curOf(fig);
  if(m==='swipe'){const T=b.aimPt,LN=lean(Cc,SH,T,27*SH.leg),w=stay(u);O.p=LN.p*w;O.hx=LN.hx*w;pawStroke(O,Cc,SH,T,u,false,{p:O.p,hx:O.hx});O.ear=-.8*w;O.lip=.6*w;O.mouth=.3*w;O.lash=.7*w;refine(b,O,t,sm((u-.3)/.1)*sm((.47-u)/.04),null,T);}
  else{const A=b.aimPts||[b.aimPt,b.aimPt,b.aimPt],TL={x:(A[0].x+A[1].x+A[2].x)/3,y:Math.min(A[0].y,A[1].y,A[2].y)},LN=lean(Cc,SH,TL,27*SH.leg),w=sm(u/.14)*sm((1-u)/.2);O.p=LN.p*w;O.hx=LN.hx*w;
   SEG.forEach((s,i)=>pawStroke(O,Cc,SH,A[i],(u-s[0])/(s[1]-s[0]),i===1,{p:O.p,hx:O.hx}));O.ear=-.9*w;O.lip=.8*w;O.mouth=.4*w;O.lash=w;}}
 else if(m==='bite'&&b.aimPt){const Cc=curOf(fig),T=b.aimPt,LN=lean(Cc,SH,T,SH.neck+10),w=stay(u),snap=sm((u-.3)/.15)*sm((.62-u)/.14);O.p=LN.p*w;O.hx=LN.hx*w+3*snap;mouthTo(O,Cc,SH,T,LN,w);
  O.mouth=u<.45?.85*sm(u/.3):.16+.1*Math.max(0,1-(u-.45)/.1);O.lip=.7*w;O.ear=-.8*w;{const rw=sm((u-.3)/.13)*sm((.7-u)/.15);refine(b,O,t,rw,T,null);refine(b,O,t,rw,T,null);}if(b.struck&&u<.85)O.he+=.1*Math.sin(t*34)*sm((.85-u)/.15);}
 else if(m==='pin'&&b.phase===1&&b.aimPt){const Cc=curOf(fig),w=sm(b.clock/.4),T=b.aimPt,Tc=b.aimPts?.[0]||T,LN=lean(Cc,SH,T,SH.neck+10);O.p=LN.p*w;O.hx=LN.hx*w;mouthTo(O,Cc,SH,T,LN,w);
  O.nx=(Tc.x-1-Cc.wx)*w;O.ny=(Tc.y-MC-Cc.wy)*w;O.na=.2*w;O.claws=w;O.mouth=.28*w;O.lip=.5*w;O.ear=-.7*w;O.lash=.5*w;refine(b,O,t,w,T,Tc);refine(b,O,t,w,T,Tc);const tk=cl(1-(b.clock-(b.tickAt||0))/.3,0,1);O.he+=.07*Math.sin(t*30)*tk*w;O.hx+=1.2*tk*w;}
 else if(m==='pounce'&&b.phase===0){O.ear=.3;}
 if(hr>0&&!b.g.dead&&!fig.jump){O.hy=(O.hy||0)+1.1*hr;O.ear=(O.ear||0)-hr;O.lip=Math.max(O.lip||0,.7*hr);O.mouth=Math.max(O.mouth||0,.25*hr);}
 const pv=b.Oprev,w=pv?sm(b.clock/.18):1;if(w<1)for(const k of OKEYS){const a=pv[k]||0,c=O[k]||0;if(a||c)O[k]=a+(c-a)*w;}
 b.Ocur=O;fig.over=O;}

// ---------------------------------------------------------------- Ein Schritt der Katze
function foes(b){return S.battle.actors.filter(a=>a.team!==b.team&&!a.g.dead&&!a.surrendered&&!(a.katze&&a.fled));}
function chooseTarget(b){const L=foes(b);if(!L.length)return null;
 const g=b.grudge&&L.find(a=>a.id===b.grudge);if(g&&dist(g,b)<260)return g;
 const up=L.filter(a=>a.katze||!(a.down&&M.health(a.g)<25));
 return (up.length?up:L).sort((p,q)=>dist(p,b)-dist(q,b))[0];}
// Sprungfenster in Bildpunkten: von der kürzesten Sprungweite bis zur vollen (KATZE.leapRange); die Vorderpfoten landen WX vor der Körpermitte
const WXof=b=>b.P.SH.L*.5+1.2,leapMax=b=>(b.P.leap/b.P.sz-2+WXof(b))*scaleOf(b),leapMin=b=>(34+WXof(b))*scaleOf(b);
K.leapMax=leapMax;K.leapMin=leapMin;
// Wie schnell der Gegner auf die Katze zukommt (Bildpunkte je Sekunde) und wie lange Ducken und Wackeln bis zum Absprung dauern
const closing=(b,T)=>{const dx=T.x-b.x,dy=T.y-b.y,d=Math.hypot(dx,dy)||1;return cl(-((b.tvx||0)*dx+(b.tvy||0)*dy)/d,0,220);},PREP=2,FLY=1.15;
function startAttack(b,T,kind){b.energy-=kind==='flurry'?9:5;if(kind==='flurry'){b.parts=[humanPart(T,'swipe'),humanPart(T,'swipe'),humanPart(T,'swipe')];state(b,'flurry',1.25);b.aimPts=b.parts.map(p=>aimPoint(b,T,human(T)?p:null));b.aimPt=b.aimPts[0];}
 else{b.part=human(T)?humanPart(T,kind):null;state(b,kind,kind==='bite'?.85:.78);b.aimPt=aimPoint(b,T,b.part);}b.targetId=T.id;}
function stepCat(b,dt){const bt=S.battle,fig=b.fig,P=b.P,t=bt.time;b.clock+=dt;b.cool=Math.max(0,b.cool-dt);b.leapCool=Math.max(0,b.leapCool-dt);b.hit=Math.max(0,b.hit-dt);stepSpray(b,dt);
 if(!b.g.dead){let bl=0;for(const p of PARTS){const v=b.bleed[p]||0;if(v>0){bl+=v;b.bleed[p]=v*Math.exp(-dt*.1);}}b.blood=Math.max(0,b.blood-bl*dt);
  if(bl>.25&&Math.random()<dt*6){const w=partWorld(b,PARTS[Math.floor(Math.random()*6)]);stain(w.x,w.y,1+Math.random()*2);}
  b.energy=Math.min(100,b.energy+dt*4*P.stam);if(b.blood<=16)die(b,bt.actors.find(a=>a.id===b.lastAttacker)||null,'Bled out');}
 if(b.g.dead){b.pool=b.pool||{r:0};b.pool.r=Math.min(22*P.sz,b.pool.r+dt*5);animate(b,dt,t);return;}
 let V=b.victim&&bt.actors.find(a=>a.id===b.victim);
 if(V&&V.g.dead&&b.mode==='pin'){log(b.g.name+' holds on a little longer, to be sure. '+V.g.name+' has stopped arguing.');releaseVictim(b);state(b,'approach');b.cool=.9;V=null;}
 if(b.morale<=0&&b.mode!=='flee'&&b.mode!=='gone'&&!fig.jump){releaseVictim(b);state(b,'flee',7);log(b.g.name+' has had enough and runs. Nobody asks for a refund to its face.');}
 const m=b.mode;
 if(m==='flee'){const d=head(b,b.x<520?BX[0]:BX[1],b.y,'gallop',true);if(b.clock>b.duration||d<16){b.fled=true;b.surrendered=true;state(b,'gone',99);}animate(b,dt,t);return;}
 if(m==='gone'){halt(b);animate(b,dt,t);return;}
 // ---- Ansprung läuft (Sprung des Skeletts): Landung prüfen, danach niederhalten
 if(m==='pounce'&&b.phase===2){const J=fig.jump,T=bt.actors.find(a=>a.id===b.targetId);
  if(J&&!b.struck&&t-J.t0>=J.t2){b.struck=true;const s=scaleOf(b),f=C.facing(fig),px=b.x+f*(WXof(b)+J.dB)*s,gap=T?Math.hypot(T.x-px,(T.y-b.y)*1.2):1e9;K.lastLanding={gap,t};
   if(T&&!T.g.dead&&gap<34){const ok=strike(b,T,'ram',P.ram*rnd(.85,1.15),'chest');
    if(ok&&human(T)){b.landed++;if(!T.g.dead){M.knockdown(T,'Pulled down by '+b.g.name,3);let best=null,bx=-1e9;for(const fs of [-1,1]){T.fallSide=fs;const x=(groundPoint(T,'head').x-T.x)*f;if(x>bx){bx=x;best=fs;}}T.fallSide=best;T.kx=(T.kx||0)+f*26;b.victim=T.id;b.afterLand=true;
      log(b.g.name+' lands on '+T.g.name+' with everything it weighs. He goes down under it.');}else log(b.g.name+' lands on '+T.g.name+'. The landing was the whole fight.');}
    else if(human(T))log(T.g.name+' twists aside. '+b.g.name+' lands on sand and takes it personally.');}
   else if(T)log(b.g.name+' springs and finds only sand where '+T.g.name+' was standing.');}
  if(!J){b.leapCool=rnd(3.5,6);const Vv=b.afterLand&&bt.actors.find(a=>a.id===b.victim);b.afterLand=false;if(Vv&&!Vv.g.dead&&fallen(Vv)){state(b,'pin');}else{releaseVictim(b);state(b,'approach');b.cool=.4;}}
  animate(b,dt,t);return;}
 const T=m==='pin'&&V?V:chooseTarget(b);
 if(!T){halt(b);if(m!=='approach')state(b,'approach');animate(b,dt,t);return;}
 if(T.id!==b.tvId){b.tvId=T.id;b.tvx=b.tvy=0;}else if(dt>0){b.tvx=lerp(b.tvx,(T.x-b.tpx)/dt,.15);b.tvy=lerp(b.tvy,(T.y-b.tpy)/dt,.15);}b.tpx=T.x;b.tpy=T.y;
 const d=dist(b,T);
 if(m==='approach'){let f=K.force&&b.team===0?K.force:null;if(f){K.force=null;if(f==='pin'&&human(T)){if(!fallen(T))fell(b,T,'Pulled down by '+b.g.name,3,8);f=null;}else if(f==='threat')b.threatDone=false;else if(f==='pounce'){b.leapCool=0;b.wantLeap=true;b.forcedLeap=true;b.energy=Math.max(b.energy,40);}else if(f==='flee'){b.morale=0;f=null;}}
  if(fallen(T)&&!T.pinnedBy){b.victim=T.id;state(b,'pin');}
  else if(!b.threatDone&&(d>260&&closing(b,T)<40&&b.clock>.6||f==='threat')){b.threatDone=true;state(b,'threat',2.4);C.express(fig,'roar',t);log(b.g.name+' roars. The front rows remember an appointment.');}
  else if(K.OPT.sprung&&!fallen(T)&&(b.wantLeap||b.leapCool<=0&&b.energy>30&&d>leapMin(b)+30&&K.lame(b)<.45)){b.wantLeap=false;state(b,'pounce',7);b.targetId=T.id;}
  else{const sp=spot(b,T),dd=head(b,sp.x,sp.y,d>280?'gallop':d>130?'trot':'walk');if(dd<10)faceTo(b,T);
   if((f==='swipe'||f==='flurry'||f==='bite')&&!inReach(b,T))K.force=f;// Knopf gedrückt: erst hingehen
   if(inReach(b,T)&&b.cool<=0&&(fig.v||0)<30&&!fig.turn&&!fig.turnWant&&fig.mode==='stand'){halt(b);startAttack(b,T,f&&f!=='threat'?f:pick([['swipe',.5],['flurry',b.energy>25?.27:.05],['bite',.23]]));}}}
 else if(m==='threat'){halt(b);faceTo(b,T);if(b.clock>b.duration||d<115&&b.clock>.5){state(b,'approach');b.cool=.2;}}
 else if(m==='pounce'){const mx=leapMax(b),mn=leapMin(b);
  if(fallen(T)||T.g.dead||b.clock>b.duration||b.phase===0&&d<mn&&!b.forcedLeap){if(b.phase===1)C.pose(fig,'stand');state(b,'approach');b.leapCool=1.5;}
  else if(b.phase===0){
   if(d<mn){const ax=cl(b.x+(b.x<T.x?-1:1)*(mn+40-d+30),BX[0],BX[1]);if(Math.abs(ax-b.x)<12){state(b,'approach');b.leapCool=2.5;}else head(b,ax,b.y,'trot',true);}// zu nah: nimmt erst Abstand
   else if(d>mx*.72+closing(b,T)*PREP+brake(b))head(b,T.x,T.y,d>mx+320?'gallop':d>mx+120?'trot':'walk',true);// kommt der Gegner entgegen, bleibt sie stehen und lauert: sie duckt sich so früh, dass er beim Absprung im Sprungfenster ist
   else{halt(b);if(faceTo(b,T)&&(fig.v||0)<1&&fig.mode==='stand'&&!C.moving(fig)){b.phase=1;C.leap(fig);}}}
  else if(b.phase===1){// duckt sich; bis zum Absprung folgt die Sprungweite dem Gegner (mit Vorhalt)
   if(fig.jump){b.phase=2;b.forcedLeap=false;b.pounces++;b.energy-=18;C.sound?.('roar',b);}
   else{// Vorhalt: Zeit bis zur Landung (Rest des Duckens, Wackeln, Absprung, Flug). Der Gegner läuft höchstens bis auf Schlagweite heran, nicht durch die Katze hindurch.
    const P0=fig.pose,rest=P0&&P0.to?Math.max(0,P0.t0+P0.dur-t):0,lead=FLY+rest,ux=(T.x-b.x)/(d||1),uy=(T.y-b.y)/(d||1),cv=closing(b,T),dl=Math.max(mn*.95,d-cv*lead),s=scaleOf(b),sw=cl(b.tvx*uy-b.tvy*ux,-60,60)*lead*.5;
    const dx=ux*dl+uy*sw,dy=uy*dl-ux*sw;
    if((T.x>=b.x?1:-1)!==C.facing(fig)){C.pose(fig,'stand');state(b,'approach');b.leapCool=1.5;}
    else{const dn=Math.hypot(dx,dy)||1;fig.leapDist=cl((dn/s-WXof(b)+2)*P.sz,34*P.sz,P.leap);b.dirx=dx/dn;b.diry=dy/dn;}}}}
 else if(m==='swipe'||m==='bite'){halt(b);const u=b.clock/b.duration,Tt=bt.actors.find(a=>a.id===b.targetId);
  if(!b.struck&&Tt&&!Tt.g.dead)b.aimPt=aimPoint(b,Tt,b.part);
  if(!b.struck&&u>=(m==='bite'?.45:HITV)){b.struck=true;if(Tt&&!Tt.g.dead&&dist(b,Tt)<reachOf(b)+40){b.chk={kind:m,T:b.aimPt};const ok=strike(b,Tt,m,(m==='bite'?P.bite*.8:P.swipe)*rnd(.85,1.15),b.part);
    if(ok&&m==='swipe'&&human(Tt)&&!Tt.g.dead&&!fallen(Tt)&&Math.random()<cl(.12+.1*P.mass/(Tt.g.weight||80),0,.5)){fell(b,Tt,'Swatted off his feet by '+b.g.name,2.6,14);log(b.g.name+' swats '+Tt.g.name+' off his feet with one paw.');}
    else if(ok&&m==='bite'&&human(Tt)&&!Tt.g.dead)log(b.g.name+' closes its teeth on '+Tt.g.name+' and pulls.');}}
  if(u>=1){state(b,'approach');b.cool=rnd(.35,.8)*(b.energy<15?2:1)*(fury(b)?.75:1);}}
 else if(m==='flurry'){halt(b);const u=b.clock/b.duration,Tt=bt.actors.find(a=>a.id===b.targetId),i=b.ticks;
  if(Tt&&!Tt.g.dead)for(let k=i;k<3;k++)b.aimPts[k]=aimPoint(b,Tt,b.parts[k]);
  if(i<3&&u>=K.FLURRY[i]){b.ticks++;if(Tt&&!Tt.g.dead&&dist(b,Tt)<reachOf(b)+40){if(i!==1)b.chk={kind:'swipe',T:b.aimPts[i]};strike(b,Tt,'swipe',P.swipe*.55*rnd(.85,1.15),b.parts[i]);}}
  if(u>=1){state(b,'approach');b.cool=rnd(.6,1.1)*(b.energy<15?2:1)*(fury(b)?.75:1);}}
 else if(m==='pin'){
  if(!fallen(T)||T.pinnedBy&&T.pinnedBy!==b.id){releaseVictim(b);state(b,'approach');b.cool=.3;}
  else if(b.phase===0){// neben den Hals des Liegenden treten: so, dass das Maul die Kehle erreicht
   const gp=groundPoint(T,'neck'),f=b.x<=gp.x?1:-1,s=scaleOf(b),mr=(P.SH.L*.5+P.SH.neck*.7+7)*s,x=cl(gp.x-f*mr,BX[0],BX[1]),y=cl(T.y+3,BY[0],BY[1]),dd=head(b,x,y,'walk');T.pinnedBy=b.id;
   if(dd<8){halt(b);if((f===C.facing(fig)||faceTo(b,gp))&&f===C.facing(fig)&&!fig.turn&&(fig.v||0)<2&&fig.mode==='stand'){b.phase=1;b.clock=0;b.tickAt=-9;b.interrupt=0;b.pins++;b.aimPt=aimPoint(b,T,'neck');b.aimPts=[aimPoint(b,T,'chest')];log(b.g.name+' stands over '+T.g.name+', one paw on his chest, and takes him by the throat.');}}
   if(b.clock>5){releaseVictim(b);state(b,'approach');b.cool=.3;}}
  else{halt(b);b.aimPt=aimPoint(b,T,'neck');b.aimPts=[aimPoint(b,T,'chest')];
   if(b.clock-(b.tickAt<0?-.2:b.tickAt)>=.5){b.tickAt=b.clock;b.energy-=1;b.chk={kind:'pin',T:b.aimPt};strike(b,T,'choke',P.choke*rnd(.85,1.15),'neck');}}}
 animate(b,dt,t);}
function animate(b,dt,t){const fig=b.fig;over(b,t);C.step(fig,dt,t);fig._R=C.rig(fig,t);if(b.chk)contactCheck(b);// rechnet auch ohne Bild die Haltung weiter (Reihenrechnung)
 const way=Math.abs((fig.dist||0)-b.lastDist)*scaleOf(b);b.lastDist=fig.dist||0;
 if(way>0&&!b.g.dead){b.x=cl(b.x+b.dirx*way,BX[0],BX[1]);b.y=cl(b.y+b.diry*way,BY[0],BY[1]);}
 b.velocity=b.moveSpeed=dt>0?way/dt:0;b.a=C.facing(fig)>0?0:Math.PI;b.face=C.facing(fig);fig.mouthBlood=Math.max(0,(fig.mouthBlood||0)-dt*.004);}
// Prüfwert: Abstand von Pranke bzw. Maul zur Trefferstelle im Bild des Treffers, in Einheiten des Skeletts (K.contacts, für den Test)
K.contacts=[];
function contactCheck(b){const q=b.chk,R=b.fig._R;b.chk=null;if(!R||!q.T)return;const SH=b.P.SH,l=R.legs[3],paw=q.kind==='swipe';
 const hs=SH.headS,ch=Math.cos(R.he),sh=Math.sin(R.he),x=paw?l.fx+MC*Math.cos(l.ang):R.hcx+(MX*ch+MY*sh)*hs,y=paw?l.fy-MC*Math.sin(l.ang):R.hcy+(-MX*sh+MY*ch)*hs;
 K.contacts.push({kind:q.kind,d:Math.hypot(x-q.T.x,y-q.T.y),tx:q.T.x,ty:q.T.y,x,y});if(K.contacts.length>200)K.contacts.shift();}
K.stepCat=stepCat;

// ---------------------------------------------------------------- Zeichnen in der Arena (über M.drawRex)
const baseDraw=M.drawRex;
M.drawRex=function(ctx,a){if(!a?.katze)return baseDraw?.apply(this,arguments);const px=Math.round(a.x),py=Math.round(a.y),t=S.battle?.time||0;
 if(a.pool&&a.pool.r>1){ctx.fillStyle='#4c0f0b';ctx.beginPath();ctx.ellipse(px,py+2,a.pool.r*1.3,a.pool.r*.32,0,0,TAU);ctx.fill();}
 const t0=performance.now();a.fig._R=C.draw(ctx,a.fig,px,py,K.SCALE,1,{time:t});K.drawMs=(K.drawMs||0)*.95+(performance.now()-t0)*.05;
 if(a.spray.length)for(const p of a.spray){ctx.fillStyle='#8d1c13';ctx.fillRect(Math.round(p.x),Math.round(p.y-p.z),p.s,p.s);}
 if(a.fled&&!a.g.dead){ctx.fillStyle='#e9d6a2';ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillText('flees',a.x,a.y-58*a.P.sz);}};

// ---------------------------------------------------------------- Kampf bauen und rechnen (Bausteine wie arena-core.js, dazu der Zweig für Katzen)
// Einheit: {kind:'cat',D,key} oder wie in AN.build ({kind:'human',g,key})
K.build=function(spec){const nc=u=>u.kind!=='cat';
 const b=AN.build({blue:spec.blue.filter(nc),red:spec.red.filter(nc),title:spec.title||'Cat pit',small:true});b.katze=true;b.editor=true;
 [spec.blue,spec.red].forEach((list,team)=>{const L=list.filter(u=>!nc(u)),others=list.length-L.length;L.forEach((u,i)=>{
   const a=K.makeFighter(u.D,team,team?800-(others?70:0):240+(others?70:0),cl(395+(i-(L.length-1)/2)*120,220,580));a.unit={kind:'cat',key:u.key,L:{name:u.D.name},row:'front'};a.unitKey=u.key;a.row='front';b.actors.push(a);});});
 return b;};
const live=(b,t)=>b.actors.filter(a=>a.team===t&&!out(a));
function fixed(dt){const b=S.battle;if(!b||b.paused)return;if(b.ende&&b.time-b.ende.at>4)return;if(H?.shots?.active)return;
 M.groundPools?.(dt);b.time+=dt;H?.setSim?.(true);
 try{for(const a of b.actors){
   if(a.katze){stepCat(a,dt);continue;}
   const x=a.x,y=a.y,p=a.phase||0,pin=a.pinnedBy&&b.actors.find(l=>l.id===a.pinnedBy&&!l.g.dead&&l.victim===a.id);
   if(pin&&!a.g.dead){// liegt unter der Katze: fällt zu Ende, steht aber nicht auf und schlägt nicht
    a.wind=0;a.pendingStrike=null;M.updateActor(a,dt*1.12);if(!a.g.dead&&!a.down)a.fallTimer=Math.max(a.fallTimer||0,(a.riseDuration||1)+.45);a.wind=0;a.pendingStrike=null;}
   else{if(a.pinnedBy)delete a.pinnedBy;M.resolveStrike(a,dt*1.12);M.updateActor(a,dt*1.12);}
   M.updateLocomotion(a,x,y,p,dt*1.12);}
  M.collisionPairs({actors:b.actors.filter(a=>!a.katze)});
  // Menschen stehen nicht in der Katze: der Schwerere bleibt, der Leichtere weicht (nicht im Sprung, sonst könnte sie nie landen)
  for(const c of b.actors)if(c.katze&&!c.g.dead&&!c.fig.jump)for(const a of b.actors)if(!a.katze&&!a.g.dead&&!a.pinnedBy&&!(a.fallTimer>0)){const dx=a.x-c.x,dy=a.y-c.y,d=Math.hypot(dx,dy*1.6)||1,min=(c.r+(a.r||14))*.8;if(d<min){a.x+=dx/d*(min-d)*.5;a.y+=dy/d*(min-d)*.3;}}
  M.stepProjectiles(dt);
  for(const a of b.actors)if(a.g.dead&&!a.death)a.death=true;
 }finally{H?.setSim?.(false);}
 H?.post?.(b,dt);
 if(b.ende)return;const L=[live(b,0).length,live(b,1).length],late=b.time-b.startTime>=K.TMAX;if(L[0]&&L[1]&&!late)return;
 b.endAt??=b.time;if(b.time-b.endAt<1)return;
 b.ende={winner:L[0]&&L[1]?-1:L[0]?0:L[1]?1:-1,at:b.time,timeout:late&&!!(L[0]&&L[1])};K.onEnd?.(b);}
K.fixed=fixed;
const inner=M.fixedStep;M.fixedStep=function(dt){const b=S.battle;if(!b?.katze)return inner.apply(this,arguments);return fixed(dt);};

// Viele Kämpfe derselben Aufstellung ohne Bild rechnen (make: liefert je Kampf eine frische Aufstellung)
K.series=function(make,n=20,maxSeconds=K.TMAX+5){const old=S.battle,R={n,wins:[0,0],draw:0,time:0,pounces:0,landed:0,pins:0,deadCats:0,fled:0,ms:0},t0=performance.now();
 for(let i=0;i<n;i++){const b=K.build(make());b.time=b.startTime=0;S.battle=b;M.stains.length=0;let k=0;while(!b.ende&&k++<maxSeconds*60)fixed(1/60);
  const w=b.ende?b.ende.winner:-1;if(w<0)R.draw++;else R.wins[w]++;R.time+=b.time;for(const a of b.actors)if(a.katze){R.pounces+=a.pounces;R.landed+=a.landed;R.pins+=a.pins;if(a.g.dead)R.deadCats++;if(a.fled)R.fled++;}}
 R.time/=n;R.ms=performance.now()-t0;S.battle=old;return R;};
})();
