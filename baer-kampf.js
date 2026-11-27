'use strict';
// WAS DIE DATEI TUT: ARENA THEORY · BÄREN-KAMPF (B3a, B3b1; eigenständige Testversion; wird nur vom Bären-Kampf-Editor dist/baer-kampf.html geladen)
// =====================================================================================================
// · Bär als Kämpfer nach dem Muster der Hunde (dist/hund.js): Menschen treffen den Bären über M.rexReceive, der Bär trifft Menschen über M.hit,
//   Hunde über DOG.hurt, andere Bären direkt; gezeichnet über M.drawRex mit BAER.draw (Skelett aus dist/baer.js).
// · Gewebe je Körperstelle (kopf, hals, brust, bauch, vl, hl), Blut, Wunden an der getroffenen Stelle, Mut, Flucht.
// · Angriffe (Texte Englisch): Drohen, Scheinangriff, Anrennen, Prankenhieb, Hieb von oben, Biss mit Schütteln, Niederdrücken,
//   Ablassen (Braunbär), Flucht, Gliedmaße abreißen, Kopfbiss. Seit B3b1: Packen und Ringen (hält den Stehenden über den vorhandenen
//   Griff des Spiels fest: grabbedBy/rearFinish aus sim.js), Wegschleudern, Wegzerren, Lahmen bei verletzten Läufen, Abreißen am Gepackten
//   und (ab ☠4) am Stehenden.
// · Eigener Simulationsschritt für Kämpfe mit Bären (K.build, M.fixedStep nur für battle.baer), aus denselben Bausteinen wie arena-core.js.
// Keine Spieldatei wird geändert; die Werte sind vorläufig (Einmessen in B28). Schalter: K.OPT.
// =====================================================================================================
(()=>{
const M=window.MG,B=window.BAER,AN=window.AN;if(!M||!B||!AN)return;
const S=M.s,H=window.HahnArena,DG=()=>window.DOG,cl=M.clamp,TAU=Math.PI*2;
const rnd=(a,b)=>a+Math.random()*(b-a),sm=u=>{u=u<0?0:u>1?1:u;return u*u*(3-2*u);},dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const K={SCALE:1.08,TMAX:180,OPT:{tear:1,head:1,schaden:1,haerte:1,ringen:1},force:null};B.K=K;

// ---------------------------------------------------------------- Angriffe (Name im Spiel Englisch, Bedienung Deutsch)
K.ATTACKS=[['threat','Threat display','Drohen','Richtet sich auf, brüllt, zeigt die Zähne.'],['bluff','Bluff charge','Scheinangriff','Stürmt heran und bricht kurz vorher ab.'],
 ['charge','Charge','Anrennen','Galoppiert in den Gegner und rennt ihn um.'],['swipe','Paw swipe','Prankenhieb','Hieb von der Seite, die Krallen reißen Furchen.'],
 ['slam','Overhead slam','Hieb von oben','Richtet sich auf und lässt sich mit beiden Pranken auf den Gegner fallen.'],['bite','Bite and shake','Biss mit Schütteln','Beißt zu und schüttelt.'],
 ['grapple','Grab and wrestle','Packen und Ringen','Richtet sich auf, klammert den Stehenden mit beiden Vorderpranken fest, beißt und ringt ihn zu Boden.'],
 ['fling','Throw aside','Wegschleudern','Packt den Gegner mit dem Maul und schleudert ihn mit einem Ruck von Kopf und Nacken weg.'],
 ['pin','Pin down','Niederdrücken','Steht über dem Liegenden, beißt und reißt.'],['drag','Drag away','Wegzerren','Zerrt den Liegenden im Maul von den anderen Gegnern weg.'],['tear','Tear off limb','Gliedmaße abreißen','Verbeißt sich in Arm oder Bein und reißt es ab (am Liegenden, wenn das Glied schon schwer verletzt ist).'],
 ['crush','Head bite','Kopfbiss','Zerdrückt den Kopf des Liegenden zwischen den Zähnen. Tödlich.'],['leave','Lose interest','Ablassen','Braunbären lassen von einem reglosen Opfer ab.'],['flee','Flee','Flucht','Hat genug.']];
const NAME=Object.fromEntries(K.ATTACKS.map(a=>[a[0],a[1]]));
const HOLD=['pin','tear','crush','grapple','drag'];// der Bär hat ein Opfer fest

// ---------------------------------------------------------------- Kampfparameter aus den Istwerten (vorläufig, B28 misst ein)
const PART_MAX={kopf:30,hals:26,brust:44,bauch:40,vl:24,hl:24},PARTS=Object.keys(PART_MAX);K.PARTS=PARTS;
K.PART_DE={kopf:'Kopf',hals:'Hals',brust:'Brust',bauch:'Flanke',vl:'Vorderpranke',hl:'Hinterlauf'};
const PART_EN={kopf:'head',hals:'neck',brust:'chest',bauch:'flank',vl:'forepaw',hl:'hind leg'};
function params(D){const s=D.stats,f=v=>v/50,wf=Math.pow(D.weight/250,.6),Br=B.breed(D.breed);
 const swipe=100*(.5+.5*f(s.pranke))*(.7+.3*f(s.kraft))*wf,bite=85*(.5+.5*f(s.biss))*(.8+.2*f(s.kraft))*wf;
 return {swipe,slam:swipe*1.5,bite,shake:bite*.4,ram:30*(.5+.5*f(s.kraft))*wf*wf,res:32*(.6+.4*f(s.zaeh))*wf,mass:D.weight*(.6+.4*f(s.kraft)),
  pace:cl(.7+.3*f(s.tempo),.6,1.25),stam:.7+.3*f(s.ausdauer),wild:cl(s.wild/100,0,1),mut:cl(s.mut/100,0,1),interrupt:26*(.7+.3*f(s.zaeh))*wf,
  sz:B.params(D).sz,bauart:Br.bauart||Br.type||'G',skulls:B.skullsOf(Br)};}
K.params=params;

// ---------------------------------------------------------------- Bär als Kämpfer
K.makeFighter=function(D,team,x,y){
 const rng=S.rng,g=M.makeGladiator(0,team===1);S.rng=rng;
 g.name=D.name;g.id='baer-'+D.id+'-'+Math.floor(Math.random()*1e6).toString(36);g.role='Soldat';g.traits=[];g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};g.equipment={weapon:null,secondary:null,shield:null,armor:{}};
 for(const k in g.stats)g.stats[k]=48;Object.assign(g.stats,{will:100,morale:100,agility:cl(D.stats.tempo,15,95),reflex:cl(D.stats.tempo,15,95),strength:cl(D.stats.kraft,15,99),toughness:cl(D.stats.zaeh,15,99)});g.weight=D.weight;g.height=D.height;
 const P=params(D),a=M.createCombatActor(g,team,0),fig=B.actor(D,'stand'),tissue={},max={};for(const p of PARTS){max[p]=PART_MAX[p];tissue[p]=max[p];}
 fig.rate=2.6;fig.facing=team?-1:1;fig.wounds=[];
 Object.assign(a,{rex:true,bear:D,fig,P,x,y,r:20*P.sz,tissue,max,wounds:fig.wounds,blood:100,bleed:{},morale:100,energy:100,spray:[],pool:null,velocity:0,a:team?Math.PI:0,
  mode:'approach',clock:0,duration:0,cool:rnd(.3,1),z:0,hit:0,dirx:0,diry:0,victim:null,kills:0,hits:0,attacks:{},taken:0,threatDone:false,bluffs:0,grapples:0,flung:0,dragged:0});
 return a;};
const out=a=>a.bear?a.g.dead||a.fled:a.dog?DG().out(a):a.down||a.surrendered||a.g.dead;K.out=out;
K.health=b=>cl(Math.min(...['kopf','hals','brust'].map(p=>b.tissue[p]/b.max[p]),(b.tissue.bauch+b.tissue.vl+b.tissue.hl)/(b.max.bauch+b.max.vl+b.max.hl))*100*Math.min(1,b.blood/70),0,100);
function log(t){const b=S.battle;if(!b)return;b.log.unshift({time:Math.floor(b.time),text:t});b.log.length=Math.min(60,b.log.length);K.onLog?.(t);}
function state(b,mode,dur=0){b.mode=mode;b.clock=0;b.duration=dur;b.struck=false;b.ticks=0;if(NAME[mode])b.attacks[mode]=(b.attacks[mode]||0)+1;}

// ---------------------------------------------------------------- Blut (wie beim Hund)
function spray(b,x,y,z,n,dir=null){for(let i=0;i<n;i++){const an=dir==null?rnd(0,TAU):dir+rnd(-.7,.7),v=rnd(15,75);b.spray.push({x,y,z,vx:Math.cos(an)*v,vy:Math.sin(an)*v*.55,vz:rnd(10,70),s:Math.random()<.3?2:1});}
 if(b.spray.length>240)b.spray.splice(0,b.spray.length-240);}
function stain(x,y,r){M.stains.push({x:x+rnd(-3,3),y:y+rnd(-2,2),r});if(M.stains.length>420)M.stains.shift();}
function stepSpray(b,dt){for(let i=b.spray.length-1;i>=0;i--){const p=b.spray[i];p.vz-=170*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.z<=0){b.spray.splice(i,1);if(Math.random()<.55)stain(p.x,p.y,p.s+Math.random()*1.4);}}}
// Stelle am Bären in Arenakoordinaten (für Blut)
function partWorld(b,part){const R=b.fig._R,f=B.facing(b.fig),s=b.P.sz*K.SCALE;if(!R)return {x:b.x,y:b.y,z:20*s};const [ax,ay]=B.anchor(R,part);return {x:b.x+f*ax*s,y:b.y,z:-ay*s};}

// ---------------------------------------------------------------- Schaden am Bären. kind: bite | claw | cut | stab | blunt
const WOUND_AT={kopf:[[-3,4],[-3,3]],hals:[[-4,4],[-4,4]],brust:[[-5,5],[-6,5]],bauch:[[-10,10],[-5,5]],vl:[[-2,2],[-5,5]],hl:[[-2,3],[-5,5]]};
function hurt(b,part,dmg,kind,att){if(b.g.dead||!(dmg>0))return 0;const P=b.P;
 // dickes Fell und Speck: Schnitte und stumpfe Schläge kommen schlechter durch als Stiche
 const wd=dmg*({cut:.85,blunt:.7,stab:1,bite:.9,claw:.95}[kind]??1)/(P.res*K.OPT.haerte);
 b.tissue[part]=Math.max(0,b.tissue[part]-wd);b.taken+=wd;b.hit=.3;
 const bk={bite:.03,claw:.045,cut:.04,stab:.04,blunt:.006}[kind]??.02,pk={hals:1.7,kopf:1,brust:1,bauch:1.2,vl:.8,hl:.8}[part];
 b.bleed[part]=(b.bleed[part]||0)+wd*bk*pk;b.blood=Math.max(0,b.blood-wd*({bite:.07,claw:.1,cut:.1,stab:.09,blunt:.02}[kind]??.05)*pk);
 b.morale-=wd*1.3*(1-P.mut)*(part==='kopf'?1.2:1)*(1.1-P.wild*.5);
 const [u,v]=WOUND_AT[part];b.wounds.push({part,u:rnd(u[0],u[1]),v:rnd(v[0],v[1]),size:cl(wd/3.5,1,6),kind,seed:Math.random()*1e4});if(b.wounds.length>48)b.wounds.shift();
 const w=partWorld(b,part);spray(b,w.x,w.y,w.z,Math.min(26,3+wd*1.4),att?Math.atan2(b.y-att.y,b.x-att.x):null);if(wd>5)stain(w.x,w.y,2+wd*.15);
 if(att){b.lastAttacker=att.id;att.damage=(att.damage||0)+wd;if(wd>5&&!HOLD.includes(b.mode))b.grudge=att.id;}
 if(wd>3&&(S.battle?.time||0)-(b.lastRoar||-9)>1.2){b.lastRoar=S.battle?.time||0;B.sound?.('pain',b);}
 if(b.tissue.hals<=0||b.tissue.kopf<=0||b.tissue.brust<=0)die(b,att,{hals:'Throat opened',kopf:'Skull broken',brust:'Chest caved in'}[b.tissue.hals<=0?'hals':b.tissue.kopf<=0?'kopf':'brust']);
 return wd;}
K.hurt=hurt;
function die(b,a,cause){if(b.g.dead)return;releaseVictim(b);b.g.dead=true;b.down=true;b.death=true;b.g.cause=cause||'Bled out';b.g.killer=a?a.g.name:'';if(a)a.kills=(a.kills||0)+1;state(b,'dead',99);
 B.go(b.fig,null);b.fig.rate=1.2;B.pose(b.fig,'lie');log(a?a.g.name+' kills '+b.g.name+'. ('+b.g.cause+')':b.g.name+' bleeds out in the sand.');}

// ---------------------------------------------------------------- Treffer am Bären (Mensch, Hund, Löwe) über M.rexReceive
const HPART={head:'kopf',neck:'hals',chest:'brust',belly:'bauch',ls:'brust',rs:'brust',lua:'vl',rua:'vl',lfa:'vl',rfa:'vl',lh:'vl',rh:'vl',lt:'hl',rt:'hl',lsh:'hl',rsh:'hl',lf:'hl',rf:'hl'};
function receive(a,d,projectile,snapshot){if(d.g.dead)return;const ef=snapshot||M.effective(a),w=ef.w||{};
 if(a.dog||a.lion||a.rex){// Tier beißt den Bären: der Schaden steht schon im Paket
  const part=HPART[ef.partId]||(Math.random()<.4?'hl':Math.random()<.5?'bauch':'hals'),wd=hurt(d,part,(ef.damage||w.damage||10)*rnd(.85,1.15),'bite',a);d.taken+=0;afterHit(d,a,wd);return;}
 if(!projectile&&dist(a,d)>ef.range+d.r+18)return;
 if(projectile&&w.id==='net'){M.floater?.(d.x,d.y-60,'TEARS THE NET','#e9d1a2');log(d.g.name+' tears through the net.');return;}
 const ag=a.g.stats,fast=d.mode==='charge'||d.mode==='bluff'?.25:0,acc=cl(.2+(projectile?ag.precision:ag.dexterity||48)*.014+(ag.experience||0)*.01-fast+(HOLD.includes(d.mode)?.2:0),.25,.97);
 if(Math.random()>acc)return;
 let dmg=ef.damage*rnd(.8,1.2)*(projectile?1:M.spacingFactor?M.spacingFactor(w,dist(a,d)-d.r*.5,ef.range):1)*(a.energy<15?.6:1);if(w.id==='fist')dmg*=.3;else if(w.bladed)dmg*=1.1;
 const rel=Math.abs(M.angleDiff(M.angle(d,a),d.a)),r=Math.random();
 const part=rel<.9?(r<.3?'kopf':r<.45?'hals':r<.75?'brust':'vl'):rel<2.2?(r<.08?'hals':r<.3?'brust':r<.72?'bauch':r<.85?'vl':'hl'):(r<.5?'hl':r<.92?'bauch':'hals');
 const kind=w.bladed?(w.attack==='thrust'||/spear|trident|dagger|javelin/.test(w.id||'')?'stab':'cut'):projectile?'stab':'blunt';
 const wd=hurt(d,part,dmg,kind,a);M.recordDamage?.(a,ef.attackKey||a.lastAttackKey||'slash',dmg);a.contactPoint={x:d.x,y:d.y-30*d.P.sz};if(w.item)w.item.blood=Math.min(1,(w.item.blood||0)+dmg/55);
 if(wd>5)log(a.g.name+' hits '+d.g.name+' in the '+PART_EN[part]+'.');afterHit(d,a,wd);}
function afterHit(d,a,wd){if(d.g.dead)return;
 if(HOLD.includes(d.mode)){d.interrupt=(d.interrupt||0)+wd;if(d.interrupt>=d.P.interrupt*.3){releaseVictim(d);d.grudge=a.id;state(d,'approach');d.cool=.3;log(a.g.name+' drives '+d.g.name+' off its victim.');}}}
const baseReceive=M.rexReceive;M.rexReceive=function(a,d){if(d?.bear)return receive.apply(this,arguments);return baseReceive?.apply(this,arguments);};

// ---------------------------------------------------------------- Der Bär trifft
const pick=L=>{let x=Math.random()*L.reduce((n,e)=>n+e[1],0);for(const e of L){x-=e[1];if(x<=0)return e[0];}return L[0][0];};
const SWIPE_AT=[['head',.2],['chest',.3],['belly',.12],['lua',.09],['rua',.09],['lfa',.06],['rfa',.06],['ls',.04],['rs',.04]];
const BITE_AT=[['head',.13],['neck',.13],['ls',.12],['rs',.12],['lua',.1],['rua',.1],['lfa',.06],['rfa',.06],['lt',.09],['rt',.09]];
const PIN_AT=[['head',.16],['neck',.14],['chest',.15],['belly',.11],['ls',.04],['rs',.04],['lua',.06],['rua',.06],['lfa',.05],['rfa',.05],['lh',.02],['rh',.02],['lt',.03],['rt',.03],['lsh',.03],['rsh',.03],['lf',.01],['rf',.01]];
// Abreißen und Kopfbiss: Startwerte aus BAER_FAHRPLAN.md (Thomas, 27.11.2026), Ausgleich in B28. K.OPT.tear / K.OPT.head sind Vielfache (0 = aus;
// Notausschalter auch über die Adresse: ?baerAbriss=0, ?baerKopfbiss=0; ?baerRingen=0 schaltet Packen, Schleudern und Zerren ab).
const CHAIN={lua:['lua','lfa','lh'],lfa:['lfa','lh'],lh:['lh'],rua:['rua','rfa','rh'],rfa:['rfa','rh'],rh:['rh'],ls:['lua','lfa','lh'],rs:['rua','rfa','rh'],
 lt:['lt','lsh','lf'],lsh:['lsh','lf'],lf:['lf'],rt:['rt','rsh','rf'],rsh:['rsh','rf'],rf:['rf']};
const LIMB_MIN={lh:1,rh:1,lf:1,rf:1,lfa:2,rfa:2,lsh:2,rsh:2,lua:3,rua:3,lt:4,rt:4};// ab welcher Klasse (Gefahrenköpfe) welches Glied abreißt
const TEAR_P=[0,.02,.04,.06,.09,.12];
const LIMB_EN={lh:'left hand',rh:'right hand',lfa:'left forearm',rfa:'right forearm',lua:'left arm',rua:'right arm',lf:'left foot',rf:'right foot',lsh:'left leg below the knee',rsh:'right leg below the knee',lt:'left leg',rt:'right leg'};
// Welches Glied reißt bei einem Biss in diese Stelle ab (null = keins)? Das größte Glied, das die Klasse des Bären schafft.
function limbFor(b,V,part){const L=CHAIN[part];if(!L)return null;for(const id of L)if(LIMB_MIN[id]<=b.P.skulls&&!V.g.body[id]?.missing)return id;return null;}
function tearChance(b,V,part){if(V.tornOnce||!limbFor(b,V,part))return 0;const hp=V.g.body[part]?.hp??100;if(hp>50)return 0;// nur wenn das Glied schon schwer verletzt ist; höchstens ein Abriss je Opfer
 return TEAR_P[cl(b.P.skulls,1,5)]*cl(b.bear.stats.biss/70,0,1.3)*(DG()?.armorMat?.(V,part)?.5:1)*K.OPT.tear;}
function headChance(b,V){if(b.P.skulls<3||b.bear.stats.biss<70||V.g.body.head?.missing)return 0;if((V.g.body.head?.hp??100)>40&&!V.down)return 0;
 const helm=DG()?.armorMat?.(V,'head');if(helm&&helm.m==='metal'&&b.P.skulls===3)return 0;// geschlossener Helm hält bei ☠3 stand
 return (b.P.bauart==='H'?.2:.15)*(helm?.5:1)*K.OPT.head;}
K.tearChance=tearChance;K.headChance=headChance;
try{const q=new URLSearchParams(location.search);if(q.get('baerAbriss')==='0')K.OPT.tear=0;if(q.get('baerKopfbiss')==='0')K.OPT.head=0;if(q.get('baerRingen')==='0')K.OPT.ringen=0;}catch{}
const DOG_AT=[['kopf',.15],['hals',.15],['brust',.25],['bauch',.25],['vl',.1],['hl',.1]];
function humanPart(b,t,kind){const A=b.P.bauart;let L=kind==='pin'?PIN_AT:kind==='bite'?BITE_AT:SWIPE_AT;
 if(kind==='swipe'&&A==='B')L=[['head',.6],...L.slice(1)];// Lippenbär: Sichelkrallen ins Gesicht
 if(kind==='bite'&&A==='H')L=[['head',.5],...L.slice(1)];// Eisbär: beißt in den Kopf
 let p=pick(L);if(t.g.body[p]?.missing)p='chest';return p;}
// Rüstung: Zähne wie beim Hund (DOG.biteFactor), Krallen und Wucht kommen besser durch
function armorF(t,part,kind){const bf=DG()?.biteFactor?.(t,part,kind==='ram'?'leap':'bite')?.f??1;return kind==='bite'||kind==='pin'?Math.min(1,bf*1.35):kind==='ram'||kind==='slam'?.6+.4*bf:.4+.6*bf;}
function hurtHuman(b,t,kind,partId,dmg){const old=t.taken,wasDead=t.g.dead,f=armorF(t,partId,kind);dmg*=f*K.OPT.schaden;
 const ef={...M.effective(b),damage:dmg,range:70,attackKey:'bear-'+kind,partId,w:{id:'bear-'+kind,name:NAME[kind]||'Mauling',damage:dmg,range:70,weight:kind==='ram'?14:kind==='slam'?12:kind==='swipe'?8:4,pen:.3,crit:1.2,bladed:false,ammo:0,block:0}};
 M.hit(b,t,false,ef);const landed=t.taken>old;
 if(landed){b.hits++;if(kind!=='ram')b.fig.mouthBlood=Math.min(1,(b.fig.mouthBlood||0)+(kind==='swipe'||kind==='slam'?.03:.2));const p=t.g.body[partId];if(p&&kind!=='ram')p.bleed=(p.bleed||0)+(.6+dmg*.025)*f;
  try{const pt=M.contactAnchor(t,partId||'chest');spray(b,pt.x,pt.y+8,Math.max(4,t.y-pt.y),8+dmg*.35,b.a);}catch{}
  if(!wasDead&&t.g.dead){b.kills++;}}
 return landed;}
function strike(b,t,kind,dmg,at){if(!t||t.g.dead)return false;
 if(t.bear){const part=pick(DOG_AT),wd=hurt(t,part,dmg*K.OPT.schaden,kind==='bite'||kind==='pin'?'bite':kind==='ram'?'blunt':'claw',b);b.hits++;if(kind==='bite')b.fig.mouthBlood=Math.min(1,(b.fig.mouthBlood||0)+.15);if(t.g.dead)b.kills++;afterHit(t,b,wd);return true;}
 if(t.dog){const D=DG(),dodge=!t.down&&t.mode!=='grip'&&Math.random()<(t.P.evade||.2)*(kind==='ram'?.6:.9);if(dodge){D.state?.(t,'evade',.35);t.escapeAngle=M.angle(b,t);return false;}
  const dead0=t.g.dead;D.hurt(t,pick(DOG_AT),dmg*2.2*K.OPT.schaden,kind==='bite'||kind==='pin'?'bite':kind==='ram'?'crush':'tear',b);b.hits++;if(t.mode==='grip'&&t.victim===b.id)D.release?.(t);if(!dead0&&t.g.dead)b.kills++;return true;}
 const part=at||humanPart(b,t,kind);return hurtHuman(b,t,kind,part,dmg);}
function fell(b,t,why,dur,push){if(t.bear||t.dog||t.g.dead)return;M.knockdown(t,why,dur);t.kx=(t.kx||0)+Math.cos(b.a)*push;t.ky=(t.ky||0)+Math.sin(b.a)*push*.3;}
function releaseVictim(b){const t=S.battle?.actors.find(a=>a.id===b.victim);if(t){if(t.pinnedBy===b.id)delete t.pinnedBy;if(t.grabbedBy===b.id)delete t.grabbedBy;}delete b.rearFinish;b.held=false;b.victim=null;b.interrupt=0;}
// Packen (B3b1): Der Stehende wird über den vorhandenen Griff des Spiels gehalten (sim.js: grabbedBy am Opfer, rearFinish am Halter).
// Solange das gilt, handelt das Opfer nicht; lässt der Bär los oder stirbt er, löst sim.js den Griff von selbst.
function hold(b,V){V.grabbedBy=b.id;V.state='grabbed';V.wind=0;V.pendingStrike=null;V.swing=0;V.kx=V.ky=0;b.rearFinish={target:V.id,left:.85,bear:true};b.held=true;}
function unhold(b,V){if(V&&V.grabbedBy===b.id)delete V.grabbedBy;delete b.rearFinish;b.held=false;}
const human=t=>t&&!t.bear&&!t.dog,mouthAt=b=>Math.abs(partWorld(b,'kopf').x-b.x);// Abstand des Mauls von der Mitte des Bären
// Wie viel schwerer als das Opfer der Bär sein muss: Packen ab 0,9-fach, Schleudern ab 1,5-fach (ein Malaienbär schleudert keinen Mann)
const heavier=(b,t,f)=>b.P.mass>=(t.g.weight||80)*f;
// Schlussangriff am Stehenden oder Gepackten: Der Bär reißt das Opfer erst zu Boden, dann läuft derselbe Abriss oder Kopfbiss wie am Liegenden.
function finisher(b,V,kind,limb){unhold(b,V);if(!fallen(V))fell(b,V,'Pulled down by '+b.g.name,2.6,10);b.victim=V.id;b.interrupt=0;V.pinnedBy=b.id;b.swat=false;b.phase=0;
 if(kind==='tear'){b.limb=limb;V.tornOnce=true;state(b,'tear',1.9);log(b.g.name+' wrenches '+V.g.name+' to the ground by the '+LIMB_EN[limb]+'.');}
 else{state(b,'crush',2.2);log(b.g.name+' drags '+V.g.name+' down and closes its jaws around his head.');}}
// Lahmen (B3b1): ab 40 % Verlust an Vorderpranke oder Hinterlauf, 0 gesund … 1 Lauf unbrauchbar. Langsamer, kein Galopp mehr ab 0,45.
const lameOf=(b,p)=>cl((.6-b.tissue[p]/b.max[p])/.6,0,1);
K.lame=b=>Math.max(lameOf(b,'vl'),lameOf(b,'hl'));

// ---------------------------------------------------------------- Bewegung: der Körper kommt nur so weit voran, wie die Beine laufen (BAER.step)
const BX=[110,930],BY=[190,605];
function brake(fig){const v=fig.v||0,hs=Math.sqrt(cl(fig.bear.weight/400,.3,2));return v*v/(2*(30+.6*v)/hs*1.3);}
function head(b,tx,ty,gait){const fig=b.fig,dx=tx-b.x,dy=ty-b.y,d=Math.hypot(dx,dy)||1,want=dx>=0?1:-1;
 if(Math.abs(dx)>12&&want!==B.facing(fig)&&!fig.turn&&!fig.turnWant)B.turn(fig);
 if(fig.turn||fig.turnWant||fig.mode!=='stand'&&!fig.go){B.go(fig,null);if(fig.mode!=='stand'&&!fig.want)B.pose(fig,'stand');}
 else if(d<=brake(fig)*b.P.sz+2)B.go(fig,null);
 else{const lame=K.lame(b);if(lame>.45&&gait==='run')gait='walk';B.go(fig,gait);fig.pace=(gait==='run'?b.P.pace:1.9*b.P.pace)*(1-.5*lame)*(b.mode==='drag'?.55:1);}
 b.dirx=dx/d;b.diry=dy/d;return d;}
function halt(b){B.go(b.fig,null);}
function faceTo(b,t){const fig=b.fig,want=t.x>=b.x?1:-1;if(want!==B.facing(fig)&&!fig.turn&&!fig.turnWant){B.turn(fig);return false;}return !fig.turn&&!fig.turnWant;}
// Platz vor dem Gegner: der Bär steht seitlich daneben, Kopf und Pranken reichen hin
const reachOf=b=>40*b.P.sz*K.SCALE;
const inReach=(b,t)=>(t.x-b.x)*B.facing(b.fig)>10&&Math.abs(t.x-b.x)<reachOf(b)+(t.r||14)+8&&Math.abs(t.y-b.y)<22&&!b.fig.turn;
function spot(b,t){const side=b.x<=t.x?-1:1;return {x:t.x+side*(reachOf(b)+(t.r||14)*.5),y:t.y+1};}

// ---------------------------------------------------------------- Überlagerte Bewegung je Angriff (Zahlen für BAER.over)
function over(b,t){const m=b.mode,u=b.duration?cl(b.clock/b.duration,0,1):0,O={},hr=b.hit>0?b.hit/.3:0;
 if(m==='swipe'){const w=sm(u/.36),s=sm((u-.36)/.12),r=sm((u-.58)/.42),k=1-r;O.nx=(-7*w+26*s)*k;O.ny=(-13*w-5*s)*k;O.na=-.9*w*k+.7*s*k;O.p=.05*s*k;O.hx=3.5*s*k;O.ne=.16*w*k;O.he=.1*s*k;O.lip=.9*k;O.mouth=.35*s*k;O.ear=-.8*k;}
 else if(m==='bite'){const l=sm(u/.3),r=sm((u-.82)/.18),k=1-r,held=b.struck&&b.landed&&u>.36;O.hx=4*l*k;O.ne=.32*l*k;O.he=.22*l*k+(held?.2*Math.sin(t*44)*k:0);O.p=(held?.03*Math.sin(t*44+1):0);
  O.mouth=u<.33?.95*sm(u/.22):.25*k;O.lip=k;O.ear=-.9*k;}
 else if(m==='slam'&&b.phase===1){const s=sm(u/.55),r=sm((u-.6)/.4);O.nx=9*s*(1-r);O.fx=9*s*(1-r);O.ny=-5*(1-s);O.fy=-5*(1-s);O.mouth=.6*(1-r);O.lip=1-r;O.ear=-.8;}
 else if(m==='slam'||m==='threat'){const e=sm(b.clock/.5);O.lip=e;O.mouth=m==='threat'?.85*e*(.8+.2*Math.sin(t*23)):.3*e;O.ear=-.8*e;if(m==='threat'){O.nx=3*Math.sin(t*5)*e;O.he=.12*e;}}
 else if(m==='pin'){const e=sm(b.clock/.5),bob=Math.sin(t*9);O.ne=-.22*e;O.he=(-.42+.1*bob)*e;O.mouth=(.45+.4*bob)*e;O.lip=e;O.nx=5*e;O.ny=0;O.hy=1.2*e;O.ear=-.7*e;}
 else if(m==='tear'){const g=sm(u/.25),y=sm((u-.45)/.3),r=sm((u-.85)/.15),k=1-r;O.ne=(-.2*g+.6*y)*k;O.he=(-.4*g+.5*y)*k+(u>.72?.22*Math.sin(t*40)*k:0);O.hx=(2*g-7*y)*k;O.mouth=u<.2?.9*sm(u/.15):.3;O.lip=1;O.ear=-1;O.nx=5*g*k;}
 else if(m==='crush'){const g=sm(u/.2),r=sm((u-.9)/.1),k=1-r;O.ne=-.2*g*k;O.he=(-.42*g+(u>.7?.2*Math.sin(t*38):.04*Math.sin(t*60)))*k;O.mouth=u<.2?sm(u/.15):cl(.95-(u-.2)*1.25,.08,1);O.lip=1;O.ear=-1;O.nx=5*g*k;O.hy=1.2*g*k;}
 else if(m==='grapple'&&b.phase===1){// klammert: beide Pranken nach vorn um den Gegner, Kopf senkt sich auf Kopf und Schulter, nach jedem Biss ein Schütteln
  const e=sm(b.clock/.35),tk=(b.clock%.7)/.7,bit=b.clock>.7&&tk<.4?1-tk/.4:0;O.nx=7*e;O.fx=7*e;O.ny=2.5*e;O.fy=2.5*e;O.ne=-.28*e;O.he=-.3*e+.16*bit*Math.sin(t*42);
  O.p=.02*bit*Math.sin(t*42+1);O.mouth=(.3+.6*sm(1-Math.abs(tk-.92)/.08))*e;O.lip=e;O.ear=-.9*e;}
 else if(m==='grapple'){const e=sm(b.clock/.5);O.lip=e;O.mouth=.35*e;O.ear=-.8*e;}
 else if(m==='fling'){// zubeißen, Kopf senken, dann Ruck mit Kopf und Nacken nach oben und zur Seite
  const l=sm(u/.26),w=sm((u-.5)/.14),r=sm((u-.74)/.26),k=1-r,lo=b.held?0:1;O.hx=(4*l*lo-3*w)*k;O.ne=(.3*l*lo-.45*sm((u-.3)/.15)*(1-w)+.8*w)*k;O.he=(.2*l*lo+.55*w)*k;O.p=.07*w*k;
  O.mouth=u<.28&&lo?.95*sm(u/.2):u<.56?.22:.5*k;O.lip=k;O.ear=-.9*k;if(b.held){O.nx=7*(1-w);O.fx=7*(1-w);O.ny=2.5*(1-w);O.fy=2.5*(1-w);}}
 else if(m==='drag'){const e=sm(b.clock/.4);O.ne=-.3*e;O.he=-.4*e+.05*Math.sin(t*7)*e;O.mouth=.22*e;O.lip=e;O.ear=-.8*e;O.hy=.8*e;}
 else if(m==='bluff'||m==='charge'){O.lip=.7;O.mouth=.25;O.ear=-.8;}
 else if(m==='dead'){const e=sm(b.clock/1.2);O.he=-.3*e;O.ne=-.15*e;O.mouth=.25*e;}
 if(hr>0){O.he=(O.he||0)+.14*hr;O.hx=(O.hx||0)-1.5*hr;O.ear=(O.ear||0)-.5*hr;}
 // Lahmen: Tritt die kranke Pranke auf, geht der Kopf hoch (der Bär nimmt Last von ihr); lahmt er hinten, sackt die Kruppe weg.
 // Im Stand hält er die kranke Vorderpranke angehoben. Die Füße bleiben dabei stehen (nur Rumpf, Hals und Kopf bewegen sich).
 const lv=lameOf(b,'vl'),lh=lameOf(b,'hl'),fg=b.fig;if((lv>0||lh>0)&&!b.g.dead&&fg.mode==='stand'&&!fg.turn){const gs=fg.gs||0,c=fg.cyc||0,sv=Math.max(0,Math.sin(TAU*(c-.5))),sh=Math.max(0,Math.sin(TAU*(c-.6)));
  O.ne=(O.ne||0)+.24*lv*gs*sv;O.he=(O.he||0)-.1*lv*gs*sv;O.p=(O.p||0)+.05*lv*gs*sv-.06*lh*gs*sh;O.hy=(O.hy||0)+1.8*lh*gs*sh;
  if(lv>.5&&gs<.2&&(m==='approach'||m==='threat'))O.ny=(O.ny||0)-5*(lv-.5)*(1-gs*5);}
 b.fig.over=O;}

// ---------------------------------------------------------------- Ein Schritt des Bären
function foes(b){return S.battle.actors.filter(a=>a.team!==b.team&&!a.g.dead&&!a.surrendered&&!(a.dog&&DG().out(a))&&!(a.bear&&a.fled));}
function chooseTarget(b){const L=foes(b);if(!L.length)return null;
 const dog=L.find(a=>a.dog&&a.mode==='grip'&&a.victim===b.id);if(dog)return dog;// der Hund, der an ihm hängt, zuerst
 const g=b.grudge&&L.find(a=>a.id===b.grudge);if(g&&dist(g,b)<260)return g;
 const up=L.filter(a=>a.bear||a.dog||!(a.down&&M.health(a.g)<25));
 return (up.length?up:L).sort((p,q)=>dist(p,b)-dist(q,b))[0];}
const fallen=t=>!t.bear&&!t.dog&&((t.fallTimer||0)>0||t.down||t.state==='fallen');
function chooseAttack(b,t){const f=K.force;if(f&&b.team===0){K.force=null;if(['tear','crush','pin'].includes(f)&&!t.bear&&!t.dog){if(!fallen(t))fell(b,t,'Pulled down by '+b.g.name,2.6,10);b.wantSpecial=f==='pin'?null:f;return 'pin';}if(f==='drag'&&human(t)){if(!fallen(t))fell(b,t,'Pulled down by '+b.g.name,2.6,10);b.wantSpecial='drag';return 'pin';}
  if((f==='grapple'||f==='fling')&&human(t)&&!fallen(t))return f;if(['swipe','slam','bite','charge','threat','bluff'].includes(f))return f;}
 if(fallen(t))return 'pin';
 const A=b.P.bauart,w={swipe:A==='D'?.25:A==='B'?.75:.5,bite:A==='D'?.65:A==='H'||A==='A'?.4:.28,slam:t.dog?.05:.2};
 // Packen und Schleudern nur gegen Menschen, die der Bär vom Gewicht her halten kann; Schleudern eher, wenn mehrere Gegner nah sind (schafft Platz)
 if(human(t)&&K.OPT.ringen){if(heavier(b,t,.9))w.grapple=A==='D'?.08:A==='H'?.14:.2;if(heavier(b,t,1.5))w.fling=foes(b).filter(a=>a!==t&&dist(a,b)<130).length?.2:.08;}
 if(b.tissue.vl/b.max.vl<.35){w.swipe*=.3;w.slam*=.3;if(w.grapple)w.grapple*=.2;}return pick(Object.entries(w));}
function stepBear(b,dt){const bt=S.battle,fig=b.fig,P=b.P,t=bt.time;b.clock+=dt;b.cool=Math.max(0,b.cool-dt);b.hit=Math.max(0,b.hit-dt);stepSpray(b,dt);
 // Geschleuderter fliegt aus: schnell los, läuft aus (sim.js bremst Stöße zu früh für einen Wurf)
 if(b.toss){const q=b.toss,V=bt.actors.find(a=>a.id===q.id);if(V&&q.left>0){const v=q.left/q.T;V.x=cl(V.x+q.vx*v*dt,BX[0],BX[1]);V.y=cl(V.y+q.vy*v*dt,BY[0],BY[1]);q.left-=dt;}else b.toss=null;}
 if(!b.g.dead){let bl=0;for(const p of PARTS){const v=b.bleed[p]||0;if(v>0){bl+=v;b.bleed[p]=v*Math.exp(-dt*.1);/* Wunden schließen sich langsam */}}b.blood=Math.max(0,b.blood-bl*dt);
  if(bl>.25&&Math.random()<dt*6){const w=partWorld(b,PARTS[Math.floor(Math.random()*6)]);stain(w.x,w.y,1+Math.random()*2);}
  b.energy=Math.min(100,b.energy+dt*5*P.stam);if(b.blood<=16)die(b,bt.actors.find(a=>a.id===b.lastAttacker)||null,'Bled out');}
 if(b.g.dead){b.pool=b.pool||{r:0};b.pool.r=Math.min(26*P.sz,b.pool.r+dt*5);b.dirx=b.diry=0;animate(b,dt,t);return;}
 let T=bt.actors.find(a=>a.id===b.victim);if(T&&T.g.dead&&(HOLD.includes(b.mode)||b.mode==='fling')){
  if(T.g.dead&&b.mode==='crush'&&!b.struck){T.headCrushed=true;T.g.cause='Head crushed in the jaws of '+b.g.name;b.crushed=(b.crushed||0)+1;const h=T.g.body.head;if(h){h.hp=0;h.grade=5;h.injury='Crushed';}log(b.g.name+' bites down until nothing in '+T.g.name+"'s head holds together.");}
  if(T.g.dead)log(b.g.name+' lets go of what is left of '+T.g.name+'.');releaseVictim(b);state(b,'approach');b.cool=.8;T=null;}
 if(b.morale<=0&&b.mode!=='flee'&&!['tear','crush'].includes(b.mode)){releaseVictim(b);state(b,'flee',5);log(b.g.name+' has had enough and runs.');}
 const m=b.mode;
 if(m==='flee'){const L=foes(b),n=L.sort((p,q)=>dist(p,b)-dist(q,b))[0];const ax=n?b.x-n.x:(b.team?1:-1),ay=n?b.y-n.y:0,l=Math.hypot(ax,ay)||1;head(b,cl(b.x+ax/l*200,BX[0],BX[1]),cl(b.y+ay/l*200,BY[0],BY[1]),'run');
  if(b.clock>b.duration||!n){b.fled=true;b.surrendered=true;halt(b);}}
 else if(m==='swipe'||m==='bite'){halt(b);const tg=bt.actors.find(a=>a.id===b.aim),hitAt=m==='swipe'?.46:.34;
  if(!b.struck&&b.clock>=b.duration*hitAt){b.struck=true;const ok=tg&&!tg.g.dead&&(b.swat&&tg.mode==='grip'&&tg.victim===b.id||Math.abs(tg.x-b.x)<reachOf(b)+(tg.r||14)+16&&Math.abs(tg.y-b.y)<26);
   // Abreißen am Stehenden (Startwerte: erst ab ☠4): entschieden vor dem Biss, am schon schwer verletzten Glied
   const at=ok&&m==='bite'&&human(tg)?humanPart(b,tg,'bite'):null,rip=at&&!fallen(tg)&&P.skulls>=4&&Math.random()<tearChance(b,tg,at)?limbFor(b,tg,at):null;
   b.landed=ok&&strike(b,tg,m,m==='swipe'?P.swipe*rnd(.85,1.15):P.bite*rnd(.85,1.15),at);
   if(b.landed&&b.swat&&tg.dog){tg.kbx=(tg.kbx||0)+(tg.x>=b.x?1:-1)*70;log(b.g.name+' swats '+tg.g.name+' off.');}
   if(b.landed&&m==='swipe'&&!tg.bear&&!tg.dog&&Math.random()<cl(P.mass/(tg.g.weight||80)/9,.1,.75)){fell(b,tg,'Swatted down by '+b.g.name,2.2,60);log(b.g.name+' swats '+tg.g.name+' off his feet.');}
   if(!b.landed&&m==='bite')b.duration=Math.min(b.duration,b.clock+.35);
   if(rip&&b.landed&&!tg.g.dead&&!tg.g.body[rip]?.missing){finisher(b,tg,'tear',rip);animate(b,dt,t);return;}}// der Bär reißt den Mann am Glied zu Boden
  if(m==='bite'&&b.landed&&b.struck&&tg&&!tg.g.dead){const n=Math.floor((b.clock-b.duration*.34)/.22);if(n>b.ticks&&b.ticks<3&&b.clock<b.duration*.82){b.ticks=n;strike(b,tg,'bite',P.shake*rnd(.8,1.2));if(!tg.bear&&!tg.dog){tg.kx=(tg.kx||0)+(Math.random()<.5?-1:1)*18;}}}
  if(b.clock>=b.duration){b.swat=false;state(b,'approach');b.cool=rnd(.3,.75)*(b.energy<25?1.6:1)*(1.3-P.wild*.5);}}
 else if(m==='slam'){halt(b);const tg=bt.actors.find(a=>a.id===b.aim);
  if(b.phase===0){if(fig.mode!=='rear'&&!fig.want)B.pose(fig,'rear');if(fig.mode==='rear'&&!B.moving(fig)&&b.clock>.5||b.clock>3.2){b.phase=1;b.clock=0;b.duration=(1.5+.45*cl(b.bear.weight/400,.3,2))/fig.rate;B.pose(fig,'stand');}}
  else{if(!b.struck&&b.clock>=b.duration*.62){b.struck=true;const ok=tg&&!tg.g.dead&&Math.abs(tg.x-b.x)<reachOf(b)+(tg.r||14)+20&&Math.abs(tg.y-b.y)<28;
    if(ok&&strike(b,tg,'slam',P.slam*rnd(.85,1.15))){if(!tg.bear&&!tg.dog&&Math.random()<cl(P.mass/(tg.g.weight||80)/5,.3,.95)){fell(b,tg,'Crushed under '+b.g.name,2.6,25);log(b.g.name+' drops on '+tg.g.name+' with both paws.');}}}
   if(b.clock>=b.duration+.15){b.phase=0;state(b,'approach');b.cool=rnd(.6,1.2);}}}
 else if(m==='grapple'){halt(b);const V=bt.actors.find(a=>a.id===b.victim),near=V&&Math.abs(V.x-b.x)<reachOf(b)+(V.r||14)+18&&Math.abs(V.y-b.y)<28;
  if(!V||V.g.dead||b.phase===0&&fallen(V)){releaseVictim(b);state(b,'approach');b.cool=.4;}
  else if(b.phase===0){// aufrichten; bis die Pranken zugreifen, kann der Gegner noch weg
   if(fig.mode!=='rear'&&!fig.want)B.pose(fig,'rear');
   if(fig.mode==='rear'&&!B.moving(fig)&&b.clock>.4||b.clock>3.2){const duck=cl(.1+((V.g.stats.agility||50)-50)*.004,.04,.3);
    if(!near||Math.random()<duck){log(V.g.name+(near?' ducks out of ':' steps back from ')+b.g.name+"'s reach.");releaseVictim(b);state(b,'approach');b.cool=.7;}
    else{b.phase=1;b.clock=0;b.ticks=0;b.duration=2.9;hold(b,V);b.grapples++;b.hx=V.x;log(b.g.name+' clamps both paws around '+V.g.name+'.');}}}
  else if(fallen(V)||!V.grabbedBy){// liegt schon (Blutverlust, Treffer): weiter am Boden
   unhold(b,V);state(b,'pin');b.ticks=0;}
  else{if(fig.mode!=='rear'&&!fig.want)B.pose(fig,'rear');
   // der Gepackte steht an der Brust des Bären (ein Stück dahinter gezeichnet, die Pranken liegen über ihm)
   const hx=b.x+B.facing(fig)*(15*P.sz*K.SCALE+(V.r||14)*.5),k=Math.min(1,dt*9);V.x+=(hx-V.x)*k;V.y+=(b.y-1-V.y)*k;V.kx=V.ky=0;V.state='grabbed';
   const n=Math.floor(b.clock/.7);if(n>b.ticks){b.ticks=n;const part=pick(P.bauart==='H'?[['head',.5],['neck',.2],['ls',.15],['rs',.15]]:[['head',.22],['neck',.2],['ls',.2],['rs',.2],['lua',.09],['rua',.09]]),pid=V.g.body[part]?.missing?'chest':part;
    const limb=Math.random()<tearChance(b,V,pid)?limbFor(b,V,pid):null,kopf=!limb&&pid==='head'&&Math.random()<headChance(b,V);// Schlussangriffe: entschieden vor dem Biss
    hurtHuman(b,V,'bite',pid,P.bite*.55*rnd(.8,1.2));
    if(!V.g.dead){
     if(limb&&!V.g.body[limb]?.missing){finisher(b,V,'tear',limb);}
     else if(kopf){finisher(b,V,'crush');}
     else if(Math.random()<.1*((V.g.stats.strength||50)/50)*(M.health(V.g)/100)*Math.sqrt(cl((V.g.weight||80)/P.mass,.05,1))){log(V.g.name+' twists out of '+b.g.name+"'s grip.");releaseVictim(b);state(b,'approach');b.cool=1;}}}
   if(b.mode==='grapple'&&b.clock>=b.duration){// Ende des Ringens: wegschleudern oder zu Boden ringen
    if(heavier(b,V,1.5)&&Math.random()<(foes(b).length>1?.45:.25)){state(b,'fling',.85);b.struck=true;b.landed=true;b.held=true;}
    else{unhold(b,V);fell(b,V,'Wrestled down by '+b.g.name,2.8,8);log(b.g.name+' wrestles '+V.g.name+' to the ground.');state(b,'pin');b.ticks=0;b.interrupt=0;}}}}
 else if(m==='fling'){halt(b);const V=bt.actors.find(a=>a.id===b.victim);
  if(b.held&&fig.mode!=='rear'&&!fig.want&&b.ticks<1)B.pose(fig,'rear');
  if(!b.struck&&b.clock>=b.duration*.28){b.struck=true;const ok=V&&!V.g.dead&&!fallen(V)&&Math.abs(V.x-b.x)<reachOf(b)+(V.r||14)+16&&Math.abs(V.y-b.y)<26;
   b.landed=ok&&hurtHuman(b,V,'bite',pick([['ls',.3],['rs',.3],['lua',.15],['rua',.15],['chest',.1]]),P.bite*.7*rnd(.85,1.15));
   if(b.landed&&!V.g.dead&&!fallen(V))hold(b,V),b.held=false;else if(!b.landed)b.duration=Math.min(b.duration,b.clock+.35);}
  if(b.landed&&V&&V.grabbedBy===b.id&&b.ticks<1){const hx=b.x+B.facing(fig)*(b.rearFinish&&fig.mode==='rear'?15*P.sz*K.SCALE+(V.r||14)*.5:Math.max(reachOf(b),mouthAt(b)-2)),k=Math.min(1,dt*9);V.x+=(hx-V.x)*k;V.kx=V.ky=0;V.state='grabbed';}
  if(b.landed&&b.ticks<1&&b.clock>=b.duration*.6){b.ticks=1;if(V&&!V.g.dead){unhold(b,V);
    // der Wurf: weit in Blickrichtung, etwas zur Seite; der Aufprall zählt als Wucht (Rüstung hilft kaum)
    const far=cl(45+40*Math.sqrt(P.mass/(V.g.weight||80)),70,150),T=.5;M.knockdown(V,'Thrown aside by '+b.g.name,2.9);V.kx=V.ky=0;b.toss={id:V.id,vx:B.facing(fig)*far*2/T,vy:rnd(-1,1)*far*.5/T,left:T,T};
    hurtHuman(b,V,'ram',pick([['chest',.4],['belly',.2],['head',.15],['ls',.12],['rs',.13]]),P.ram*1.1*rnd(.85,1.15));b.flung++;b.shun=null;log(b.g.name+' throws '+V.g.name+' aside like a wet sack.');}}
  if(b.clock>=b.duration){releaseVictim(b);state(b,'approach');b.cool=rnd(.5,.9);}}
 else if(m==='drag'){const V=bt.actors.find(a=>a.id===b.victim);if(!V){state(b,'approach');}
  else{V.pinnedBy=b.id;if(!(V.fallTimer>0)&&!V.down)M.knockdown(V,'Dragged by '+b.g.name,2.6);
   if(!fig.turn)b.dragOff=Math.max(reachOf(b)-8*P.sz,mouthAt(b)-8);// das gepackte Bein am Maul, der Körper schleift neben dem Bären nach
   const d=head(b,b.dragTo.x,b.dragTo.y,'walk'),Y=B.yaw(fig,t),off=b.dragOff||reachOf(b)-8*P.sz,ox=V.x,oy=V.y;
   // das Opfer hängt im Maul: liegt vor den Vorderpranken unter dem Kopf und schwenkt beim Wenden mit dem Kopf herum
   V.x=cl(b.x+(Y?Y.F*Math.cos(Y.h):B.facing(fig))*off,BX[0],BX[1]);V.y=cl(b.y+2+(Y?4*Math.sin(Y.h):0),BY[0],BY[1]);V.kx=V.ky=0;b.dragLen=(b.dragLen||0)+Math.hypot(V.x-ox,V.y-oy);
   V.fallSide=-(Y?(Math.cos(Y.h)>=0?Y.F:-Y.F):B.facing(fig))*(Math.cos(V.a)>=0?1:-1);// der Liegende zeigt mit dem Kopf nach hinten (Lage der Figur wie in arena.js)
   if(Math.random()<dt*9&&(fig.v||0)>4)stain(V.x,V.y,1.2+Math.random()*1.6);
   const n=Math.floor(b.clock/.8);if(n>b.ticks){b.ticks=n;hurtHuman(b,V,'pin',b.dragPart,P.bite*.22*rnd(.8,1.2));}
   if(d<14&&!fig.turn||b.clock>=b.duration){b.dragUntil=bt.time+7;state(b,'pin');b.ticks=0;}}}
 else if(m==='threat'){halt(b);if(fig.mode!=='rear'&&!fig.want&&b.clock<1)B.pose(fig,'rear');if(b.clock>.9&&!b.roared){b.roared=true;B.sound?.('roar',b);}
  if(b.clock>=b.duration){B.pose(fig,'stand');state(b,'approach');b.cool=.4;}}
 else if(m==='bluff'||m==='charge'){T=bt.actors.find(a=>a.id===b.aim);if(!T||T.g.dead||out(T)){state(b,'approach');}
  else{const d=dist(b,T),stopAt=m==='bluff'?95:0;
   if(m==='bluff'&&d<stopAt+brake(fig)*P.sz){halt(b);if((fig.v||0)<8){log(b.g.name+' charges and stops short. Just checking.');state(b,'approach');b.cool=rnd(.4,.9);}}
   else{head(b,T.x,T.y,'run');
    if(m==='charge'&&d<(26*P.sz*K.SCALE+(T.r||14))&&(fig.v||0)>110){const v=fig.v;if(strike(b,T,'ram',P.ram*(v/250)*rnd(.85,1.15))){if(!T.bear&&!T.dog){fell(b,T,'Run down by '+b.g.name,2.6,95);log(b.g.name+' runs '+T.g.name+' down.');}else if(T.dog){T.kbx=(T.kbx||0)+Math.cos(b.a)*90;}}state(b,'approach');b.cool=.5;b.energy-=12;}
    else if(b.clock>6)state(b,'approach');}}}
 else if(m==='pin'||m==='tear'||m==='crush'){const V=bt.actors.find(a=>a.id===b.victim);if(!V){state(b,'approach');}
  else{const sp={x:V.x+(b.x<=V.x?-1:1)*(reachOf(b)-6*P.sz),y:V.y-2},d=Math.hypot(sp.x-b.x,sp.y-b.y);if(d>10&&m==='pin')head(b,sp.x,sp.y,'walk');else{halt(b);if(fig.mode==='rear'&&!fig.want)B.pose(fig,'stand');faceTo(b,V);}
   V.pinnedBy=b.id;if(!(V.fallTimer>0)&&!V.down)M.knockdown(V,'Held down by '+b.g.name,2.6);
   if(m==='pin'&&d<=14){const n=Math.floor(b.clock/.75);if(n>b.ticks){b.ticks=n;let sp0=b.wantSpecial;b.wantSpecial=null;if(!sp0&&b.team===0&&(K.force==='tear'||K.force==='crush'||K.force==='drag')){sp0=K.force;K.force=null;}
     // Wegzerren: Stören andere Gegner in der Nähe, zerrt der Bär seine Beute von ihnen weg (höchstens alle 7 s)
     const stoer=foes(b).filter(a=>a!==V&&!fallen(a)&&dist(a,b)<150).sort((p,q)=>dist(p,b)-dist(q,b))[0];
     if(sp0==='drag'||!sp0&&K.OPT.ringen&&stoer&&heavier(b,V,1.2)&&t>(b.dragUntil||0)&&Math.random()<.22){const ax=stoer?b.x-stoer.x:B.facing(fig),ay=stoer?b.y-stoer.y:0,l=Math.hypot(ax,ay)||1;
      b.dragTo={x:cl(b.x+ax/l*130,BX[0]+30,BX[1]-30),y:cl(b.y+ay/l*90,BY[0]+10,BY[1]-10)};b.dragPart=(Math.random()<.5?['lt','rt']:['rt','lt']).find(id=>!V.g.body[id]?.missing)||'belly';
      b.dragged++;state(b,'drag',3.4);log(b.g.name+' drags '+V.g.name+' away by the '+(b.dragPart==='belly'?'belt':'leg')+'.');animate(b,dt,t);return;}
     // Biss am Liegenden: erst die Stelle wählen, dann entscheidet sich, ob daraus ein Abriss oder ein Kopfbiss wird (Schlussangriffe)
     const part=humanPart(b,V,'pin'),forced=sp0==='tear'?(['lfa','rfa','lua','rua','lsh','rsh','lh','rh','lf','rf'].map(x=>limbFor(b,V,x)).find(Boolean)||null):null;
     const limb=sp0==='tear'?forced:!sp0&&Math.random()<tearChance(b,V,part)?limbFor(b,V,part):null;
     if(limb){b.limb=limb;V.tornOnce=true;state(b,'tear',1.9);log(b.g.name+' sinks its teeth into '+V.g.name+"'s "+LIMB_EN[b.limb]+'.');}
     else if(sp0==='crush'||!sp0&&part==='head'&&Math.random()<headChance(b,V)){state(b,'crush',2.2);log(b.g.name+' closes its jaws around '+V.g.name+"'s head.");}
     else{hurtHuman(b,V,'pin',part,P.bite*.6*rnd(.8,1.2));
      // Ablassen: Braunbären (und Höhlenbären) verlieren das Interesse an einem reglosen Opfer, wenn es noch andere Gegner gibt
      if(!V.g.dead&&['G','I','C'].includes(P.bauart)&&M.health(V.g)<38&&b.ticks>=3&&foes(b).length>1&&Math.random()<.3){log(b.g.name+' loses interest in '+V.g.name+'. Playing dead works. Mostly.');state(b,'leave');releaseVictim(b);b.shun=V.id;state(b,'approach');b.cool=.6;}
      else if(!V.g.dead&&Math.random()<.05*((V.g.stats.strength||50)/50)*(M.health(V.g)/100)){log(V.g.name+' rolls out from under '+b.g.name+'.');releaseVictim(b);state(b,'approach');b.cool=1;}}}}
   else if(m==='tear'){if(!b.struck&&b.clock>=b.duration*.2){b.struck=true;hurtHuman(b,V,'bite',b.limb,P.bite*rnd(.9,1.1));}
    if(b.ticks<1&&b.clock>=b.duration*.72){b.ticks=1;if(!V.g.body[b.limb]?.missing){M.sever?.(b,V,b.limb);}if(V.g.body[b.limb]?.missing&&!b.tornNow){b.tornNow=true;fig.mouthBlood=1;spray(b,V.x,V.y,14,26,b.a+Math.PI);b.torn=(b.torn||0)+1;log(b.g.name+' tears off '+V.g.name+"'s "+LIMB_EN[b.limb]+' and shakes it.');}}
    if(b.clock>=b.duration){b.tornNow=false;state(b,'pin');b.ticks=0;}}
   else if(m==='crush'){if(b.ticks<3&&b.clock>=b.duration*(.3+.2*b.ticks)){b.ticks++;hurtHuman(b,V,'bite','head',P.bite*.5);fig.mouthBlood=1;}
    if(!b.struck&&b.clock>=b.duration*.88){b.struck=true;if(!V.g.dead){const h=V.g.body.head;if(h){h.hp=0;h.grade=5;h.injury='Crushed';}V.headCrushed=true;M.death(V,'Head crushed in the jaws of '+b.g.name,b);b.kills++;b.crushed=(b.crushed||0)+1;}spray(b,V.x,V.y,12,30,null);log(b.g.name+' bites down until nothing in '+V.g.name+"'s head holds together.");}
    if(b.clock>=b.duration){releaseVictim(b);state(b,'approach');b.cool=1;}}}}
 else{// approach: Ziel wählen, hingehen, angreifen
  T=chooseTarget(b);
  // steht schon ein Gegner vorn in Reichweite, bekommt der den Hieb (der Bär dreht sich nicht erst zu einem anderen um)
  if(T&&b.cool<=0&&!inReach(b,T)){const nah=foes(b).filter(a=>inReach(b,a)&&a.id!==b.shun).sort((p,q)=>dist(p,b)-dist(q,b))[0];if(nah)T=nah;}
  if(T&&T.id===b.shun&&foes(b).length>1)T=foes(b).filter(a=>a.id!==b.shun).sort((p,q)=>dist(p,b)-dist(q,b))[0]||T;
  if(!T){halt(b);if(fig.mode!=='stand'&&!fig.want)B.pose(fig,'stand');if(!fig.expr&&Math.random()<dt*.3)B.express(fig,'sniff',t);}
  else{const d=dist(b,T),sp=spot(b,T),ds=Math.hypot(sp.x-b.x,sp.y-b.y),f=K.force&&b.team===0?K.force:null;
   // Hängt ein Hund am Bären, schlägt er ihn sofort weg (dafür muss er sich nicht erst hindrehen)
   const hang=b.cool<=0&&bt.actors.find(a=>a.dog&&!a.g.dead&&a.mode==='grip'&&a.victim===b.id);
   if(hang){b.aim=hang.id;state(b,'swipe',.7);b.swat=true;b.energy-=4;animate(b,dt,t);return;}
   if(!b.threatDone&&(f==='threat'||!f&&d>150)){b.threatDone=true;if(f==='threat'||Math.random()<.35+.4*P.wild){if(f)K.force=null;b.roared=false;state(b,'threat',2.3);log(b.g.name+' rises on its hind legs and roars.');animate(b,dt,t);return;}}
   if(b.cool<=0&&(f==='charge'||f==='bluff'||!f&&d>170&&b.energy>30&&!fallen(T)&&K.lame(b)<=.45)){const bl=f==='bluff'||!f&&b.bluffs<1&&Math.random()<.3*(1.1-P.wild);if(f)K.force=null;if(bl)b.bluffs++;b.aim=T.id;state(b,bl?'bluff':'charge');animate(b,dt,t);return;}
   if(fallen(T)&&d<70*P.sz+20){b.victim=T.id;b.interrupt=0;state(b,'pin');if(b.stoodOver!==T.id){b.stoodOver=T.id;log(b.g.name+' stands over '+T.g.name+'.');}}
   else if(ds>12&&!(b.cool<=0&&inReach(b,T)))head(b,sp.x,sp.y,ds>70?'run':'walk');
   else{halt(b);if(faceTo(b,T)&&b.cool<=0&&(fig.v||0)<45&&!B.moving(fig)){const k=chooseAttack(b,T);b.aim=T.id;b.energy-=k==='slam'?10:6;
     if(k==='pin'){b.victim=T.id;b.interrupt=0;state(b,'pin');}else if(k==='slam'){state(b,'slam');b.phase=0;}
     else if(k==='grapple'){b.victim=T.id;b.interrupt=0;state(b,'grapple');b.phase=0;}else if(k==='fling'){b.victim=T.id;b.interrupt=0;b.held=false;state(b,'fling',1.2);}else if(k==='charge'||k==='bluff'||k==='threat')state(b,k,k==='threat'?2.3:0);
     else state(b,k,k==='swipe'?.95+.25*cl(b.bear.weight/400,.3,2):1.25);}}}}
 animate(b,dt,t);}
function animate(b,dt,t){const fig=b.fig,P=b.P;over(b,t);B.step(fig,dt,t);fig._R=B.rig(fig,t);// rechnet auch ohne Bild die Haltung weiter (Reihenrechnung)
 const v=(fig.v||0)*P.sz*K.SCALE;b.velocity=v;b.moveSpeed=v;if(v>.5){b.x=cl(b.x+b.dirx*v*dt,BX[0],BX[1]);b.y=cl(b.y+b.diry*v*dt*.8,BY[0],BY[1]);}
 b.a=B.facing(fig)>0?0:Math.PI;b.face=B.facing(fig);fig.mouthBlood=Math.max(0,(fig.mouthBlood||0)-dt*.004);}
K.stepBear=stepBear;

// ---------------------------------------------------------------- Zeichnen in der Arena (über M.drawRex)
const baseDraw=M.drawRex;
M.drawRex=function(ctx,a){if(!a?.bear)return baseDraw?.apply(this,arguments);const px=Math.round(a.x),py=Math.round(a.y),t=S.battle?.time||0;
 if(a.pool&&a.pool.r>1){ctx.fillStyle='#4c0f0b';ctx.beginPath();ctx.ellipse(px,py+2,a.pool.r*1.3,a.pool.r*.32,0,0,TAU);ctx.fill();}
 const t0=performance.now();a.fig._R=B.draw(ctx,a.fig,px,py,K.SCALE,1,{time:t});K.drawMs=(K.drawMs||0)*.95+(performance.now()-t0)*.05;
 if(a.spray.length)for(const p of a.spray){ctx.fillStyle='#8d1c13';ctx.fillRect(Math.round(p.x),Math.round(p.y-p.z),p.s,p.s);}
 if(a.fled&&!a.g.dead){ctx.fillStyle='#e9d6a2';ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillText('flees',a.x,a.y-62*a.P.sz);}};

// ---------------------------------------------------------------- Kampf bauen und rechnen (Bausteine wie arena-core.js, dazu der Zweig für Bären)
// Einheit: {kind:'bear',D,key} oder wie in AN.build ({kind:'human',g,key} · {kind:'dog',D,key})
K.build=function(spec){const nb=u=>u.kind!=='bear';
 const b=AN.build({blue:spec.blue.filter(nb),red:spec.red.filter(nb),title:spec.title||'Bear pit',small:true});b.baer=true;b.editor=true;
 [spec.blue,spec.red].forEach((list,team)=>{const L=list.filter(u=>!nb(u)),others=list.length-L.length;L.forEach((u,i)=>{
   const a=K.makeFighter(u.D,team,team?800-(others?70:0):240+(others?70:0),cl(395+(i-(L.length-1)/2)*120,220,580));a.unit={kind:'bear',key:u.key,L:{name:u.D.name},row:'front'};a.unitKey=u.key;a.row='front';b.actors.push(a);});});
 b.hasDogs=b.actors.some(a=>a.dog);return b;};
const live=(b,t)=>b.actors.filter(a=>a.team===t&&!out(a));
function fixed(dt){const b=S.battle;if(!b||b.paused)return;if(b.ende&&b.time-b.ende.at>4)return;if(H?.shots?.active)return;if(DG()?.paused?.())return;
 M.groundPools?.(dt);b.time+=dt;H?.setSim?.(true);
 try{for(const a of b.actors){
   if(a.bear){stepBear(a,dt);continue;}
   if(a.dog){DG().step(a,dt);a._px=a.x;a._py=a.y;continue;}
   const x=a.x,y=a.y,p=a.phase||0,pin=a.pinnedBy&&b.actors.find(l=>l.id===a.pinnedBy&&!l.g.dead&&l.victim===a.id);
   if(pin&&!a.g.dead){// liegt unter dem Bären: fällt zu Ende, steht aber nicht auf und schlägt nicht
    a.wind=0;a.pendingStrike=null;M.updateActor(a,dt*1.12);if(!a.g.dead&&!a.down)a.fallTimer=Math.max(a.fallTimer||0,(a.riseDuration||1)+.45);a.wind=0;a.pendingStrike=null;}
   else{if(a.pinnedBy)delete a.pinnedBy;const held=b.hasDogs&&DG().humanPre(a);if(!held)M.resolveStrike(a,dt*1.12);M.updateActor(a,dt*1.12);if(held){a.wind=0;a.pendingStrike=null;}}
   M.updateLocomotion(a,x,y,p,dt*1.12);}
  if(b.hasDogs)for(const d of b.actors)if(d.dog&&d.mode==='grip'&&d.victim){const v=b.actors.find(a=>a.id===d.victim);if(v)DG().holdOn(d,v,dt);}
  M.collisionPairs({actors:b.actors.filter(a=>!a.dog&&!a.bear&&!a.grabbedBy?.startsWith?.('hund-'))});
  // Menschen stehen nicht im Bären: der Schwerere bleibt, der Leichtere weicht
  for(const br of b.actors)if(br.bear&&!br.g.dead)for(const a of b.actors)if(!a.bear&&!a.dog&&!a.g.dead&&!a.pinnedBy&&!a.grabbedBy&&!(a.fallTimer>0)){const dx=a.x-br.x,dy=a.y-br.y,d=Math.hypot(dx,dy*1.6)||1,min=(br.r+(a.r||14))*.8;if(d<min){a.x+=dx/d*(min-d)*.5;a.y+=dy/d*(min-d)*.3;}}
  M.stepProjectiles(dt);
  if(b.hasDogs)for(const a of b.actors)if(a.dog&&a._px!=null&&a.mode!=='leap'){const jx=a.x-a._px,jy=a.y-a._py,jl=Math.hypot(jx,jy);if(jl>4){a.x=a._px+jx/jl*4;a.y=a._py+jy/jl*4;}}
  for(const a of b.actors)if(a.g.dead&&!a.death)a.death=true;
 }finally{H?.setSim?.(false);}
 H?.post?.(b,dt);
 if(b.ende)return;const L=[live(b,0).length,live(b,1).length],late=b.time-b.startTime>=K.TMAX;if(L[0]&&L[1]&&!late)return;
 b.endAt??=b.time;if(b.time-b.endAt<1)return;
 b.ende={winner:L[0]&&L[1]?-1:L[0]?0:L[1]?1:-1,at:b.time,timeout:late&&!!(L[0]&&L[1])};K.onEnd?.(b);}
K.fixed=fixed;
const inner=M.fixedStep;M.fixedStep=function(dt){const b=S.battle;if(!b?.baer)return inner.apply(this,arguments);return fixed(dt);};

// Viele Kämpfe derselben Aufstellung ohne Bild rechnen (make: liefert je Kampf eine frische Aufstellung)
K.series=function(make,n=20,maxSeconds=K.TMAX+5){const old=S.battle,R={n,wins:[0,0],draw:0,time:0,torn:0,crushed:0,grapples:0,flung:0,dragged:0,deadBears:0,fled:0,ms:0},t0=performance.now();
 for(let i=0;i<n;i++){const b=K.build(make());b.time=b.startTime=0;S.battle=b;M.stains.length=0;let k=0;while(!b.ende&&k++<maxSeconds*60)fixed(1/60);
  const w=b.ende?b.ende.winner:-1;if(w<0)R.draw++;else R.wins[w]++;R.time+=b.time;for(const a of b.actors)if(a.bear){R.torn+=a.torn||0;R.crushed+=a.crushed||0;R.grapples+=a.grapples||0;R.flung+=a.flung||0;R.dragged+=a.dragged||0;if(a.g.dead)R.deadBears++;if(a.fled)R.fled++;}}
 R.time/=n;R.ms=performance.now()-t0;S.battle=old;return R;};
})();
