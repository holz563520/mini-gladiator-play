'use strict';
// WAS DIE DATEI TUT: ARENA THEORY · KATZEN-KAMPF (KA3a; eigenständige Testversion; wird nur vom Katzen-Kampf-Editor dist/katze-kampf.html geladen)
// =====================================================================================================
// · Katze als Kämpfer nach dem Muster von Bär (dist/baer-kampf.js) und Hund: Menschen treffen die Katze über M.rexReceive, die Katze trifft
//   Menschen über M.hit; gezeichnet über M.drawRex mit KATZE.draw (Skelett aus dist/katze.js). Ausgangspunkt der Angriffe ist der Löwe aus 1.0
//   (Pranke, Sprung, Biss, Niederhalten; Regel 11 im Katzenfahrplan).
// · Gewebe je Körperstelle (kopf, hals, brust, bauch, vl, hl), Blut, Wunden an der getroffenen Stelle, Mut, Flucht. Die Mähne schützt den Hals.
// · Angriffe in KA3a (Texte Englisch): Drohen, Ansprung (ducken, Hinterteil wackelt, Sprung auf den Gegner, reißt ihn um), Prankenhieb,
//   Prankenfolge links und rechts, Biss, Niederhalten mit Würgebiss in die Kehle, Flucht.
// · KA3b: Anschleichen und Umkreisen (lauert geduckt, solange der Gegner hinsieht, springt von hinten an), Scheinangriff, aufgerichtet boxen,
//   Festkrallen und Heranziehen, Nackenbiss, Aufschlitzen mit den Hinterläufen, Wegzerren von den Helfern (rückwärts, wie Rex Vetus und Bär B3c3),
//   Ausweichen (Sprung zurück), sichtbares Zucken an der getroffenen Stelle, Zurückgeworfen, Gegenangriff, sichtbares Lahmen, Tod auf der Seite.
//   Schalter K.OPT.reakt (Adresse ?katzeReakt=0). Abreißen und Skalpieren folgen in KA3c.
// · Zielen von Anfang an (Lehre aus Bär B3c1): Die Trefferstelle steht vor dem Ausholen fest; Rumpf, Pranke und Maul greifen genau dorthin
//   (Abschnitt „Zielen“), am Liegenden liegt eine Pranke auf der Brust und das Maul an der Kehle. Prüfwert: K.contacts.
// · Eigener Simulationsschritt für Kämpfe mit Katzen (K.build, M.fixedStep nur für battle.katze), aus denselben Bausteinen wie arena-core.js.
// Keine Spieldatei wird geändert; die Werte sind vorläufig (Einmessen in KA25). Schalter: K.OPT, Adresse ?katzeSprung=0, ?katzeMaehne=0.
// =====================================================================================================
(()=>{
const M=window.MG,C=window.KATZE,AN=window.AN;if(!M||!C||!AN)return;
const S=M.s,H=window.HahnArena,DG=()=>window.DOG,cl=M.clamp,TAU=Math.PI*2,MC=4.2;
const rnd=(a,b)=>a+Math.random()*(b-a),sm=u=>{u=u<0?0:u>1?1:u;return u*u*(3-2*u);},lerp=(a,b,t)=>a+(b-a)*t,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const K={SCALE:1.08,TMAX:180,OPT:{schaden:1,haerte:1,maehne:1,sprung:1,reakt:1,wucht:1.9},force:null};C.K=K;
try{const q=new URLSearchParams(location.search);if(q.get('katzeSprung')==='0')K.OPT.sprung=0;if(q.get('katzeMaehne')==='0')K.OPT.maehne=0;if(q.get('katzeReakt')==='0')K.OPT.reakt=0;}catch{}

// ---------------------------------------------------------------- Angriffe (Name im Spiel Englisch, Bedienung Deutsch)
K.ATTACKS=[['threat','Threat display','Drohen','Bleibt stehen, legt die Ohren an, brüllt, der Schwanz peitscht, Scheinhieb mit der Pranke.'],
 ['stalk','Stalk and circle','Anschleichen und Umkreisen','Schleicht tief am Boden im Bogen um den Gegner. Sieht er her, duckt sie sich und lauert; zeigt er den Rücken, springt sie an.'],
 ['feint','Mock charge','Scheinangriff','Kurzer Sprint auf den Gegner, bricht knapp vor ihm ab, faucht und weicht zurück.'],
 ['pounce','Pounce','Ansprung','Duckt sich, das Hinterteil wackelt, springt aus den Hinterbeinen auf den Gegner und reißt ihn mit dem ganzen Gewicht um.'],
 ['swipe','Paw swipe','Prankenhieb','Hieb mit ausgefahrenen Krallen, vier Furchen.'],['flurry','Paw flurry','Prankenfolge','Drei schnelle Hiebe, abwechselnd mit beiden Pranken.'],
 ['box','Rear up and box','Aufgerichtet boxen','Steht kurz auf den Hinterbeinen und schlägt mit beiden Pranken von oben nach Kopf und Schultern.'],
 ['grab','Grab and pull','Festkrallen und Heranziehen','Schlägt beide Vorderpranken in die Schultern, zieht den Gegner heran und reißt ihn zu Boden.'],
 ['bite','Bite','Biss','Schnappt nach Arm, Schulter oder Bein und reißt.'],['pin','Throat hold','Niederhalten und Würgebiss','Steht über dem Liegenden, eine Pranke auf der Brust, und hält die Kehle zu, bis er sich nicht mehr rührt.'],
 ['nape','Nape bite','Nackenbiss','Beide Pranken auf dem Rücken des Liegenden, die Eckzähne im Nacken zwischen den Wirbeln.'],
 ['rake','Hind-leg rake','Aufschlitzen mit den Hinterläufen','Hält den Liegenden fest und tritt mit beiden Hinterpfoten gegen Bauch und Beine.'],
 ['drag','Drag away','Wegzerren','Zerrt den Liegenden am Hals rückwärts von seinen Helfern weg, wie Rex Vetus.'],
 ['dodge','Dodge','Ausweichen','Springt vor dem Schlag zurück, dann Gegenangriff. Knopf: dem nächsten Schlag weicht sie sicher aus.'],
 ['recoil','Knocked back','Zurückgeworfen','Ein schwerer Treffer wirft sie einen Schritt zurück. Knopf: der nächste Treffer wirft sie zurück.'],
 ['flee','Flee','Flucht','Hat genug.']];
const HOLD=['pin','nape','rake','drag'];K.HOLD=HOLD;// die Katze hat ein Opfer fest
const NAME=Object.fromEntries(K.ATTACKS.map(a=>[a[0],a[1]]));

// ---------------------------------------------------------------- Kampfparameter aus den Istwerten (vorläufig, KA25 misst ein)
const PART_MAX={kopf:28,hals:24,brust:40,bauch:36,vl:22,hl:22},PARTS=Object.keys(PART_MAX);K.PARTS=PARTS;
K.PART_DE={kopf:'Kopf',hals:'Hals',brust:'Brust',bauch:'Flanke',vl:'Vorderpranke',hl:'Hinterlauf'};
const PART_EN={kopf:'head',hals:'neck',brust:'chest',bauch:'flank',vl:'forepaw',hl:'hind leg'};
function params(D){const s=D.stats,f=v=>v/50,wf=Math.pow(D.weight/250,.6),Br=C.breed(D.breed),SH=C.shapeOf(D),sz=C.szOf(D,SH);
 const swipe=95*(.5+.5*f(s.pranke))*(.7+.3*f(s.kraft))*wf,bite=90*(.5+.5*f(s.biss))*(.8+.2*f(s.kraft))*wf;
 return {swipe,bite,choke:bite*.34,ram:34*(.5+.5*f(s.kraft))*wf*wf,res:27*(.6+.4*f(s.zaeh))*wf,mass:D.weight*(.6+.4*f(s.kraft)),pace:cl(.7+.3*f(s.tempo),.6,1.3),stam:.7+.3*f(s.ausdauer),
  wild:cl(s.wild/100,0,1),mut:cl(s.mut/100,0,1),interrupt:22*(.7+.3*f(s.zaeh))*wf,sz,SH,mane:cl((SH.mane||0)*(D.appearance?.mane||1),0,1.3),bauart:Br.bauart,skulls:C.skullsOf(Br),leap:C.leapRange(D),
  // KA3b (vorläufig, KA25): Ausweichen aus Schnelligkeit, schwere Katzen weichen seltener aus; Vorlieben je Bauart (Tiger boxt und beißt in den Nacken, Leopard krallt sich fest und schlitzt)
  evade:cl(.34*(.4+.6*f(s.tempo))/Math.sqrt(Math.max(.3,D.weight/200)),.05,.5),boxP:{B:.3,K:.2,I:.04}[Br.bauart]??.1,grabP:{C:.3,D:.22,I:.3}[Br.bauart]??.13,
  napeP:{A:.3,J:.3}[Br.bauart]??.7,rakeP:{C:.9,H:.9,D:.6}[Br.bauart]??.35};}
K.params=params;

// ---------------------------------------------------------------- Katze als Kämpfer
K.makeFighter=function(D,team,x,y){
 const rng=S.rng,g=M.makeGladiator(0,team===1);S.rng=rng;
 g.name=D.name;g.id='katze-'+D.id+'-'+Math.floor(Math.random()*1e6).toString(36);g.role='Soldat';g.traits=[];g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};g.equipment={weapon:null,secondary:null,shield:null,armor:{}};
 for(const k in g.stats)g.stats[k]=48;Object.assign(g.stats,{will:100,morale:100,agility:cl(D.stats.tempo,15,95),reflex:cl(D.stats.tempo,15,95),strength:cl(D.stats.kraft,15,99),toughness:cl(D.stats.zaeh,15,99)});g.weight=D.weight;g.height=D.height;
 const P=params(D),a=M.createCombatActor(g,team,0),fig=C.actor(D,'stand'),tissue={},max={};for(const p of PARTS){max[p]=PART_MAX[p];tissue[p]=max[p];}
 fig.rate=2.2;fig.facing=team?-1:1;fig.wounds=[];fig.dist=0;
 Object.assign(a,{rex:true,katze:D,fig,P,x,y,r:17*P.sz,tissue,max,wounds:fig.wounds,blood:100,bleed:{},morale:100,energy:100,spray:[],pool:null,velocity:0,a:team?Math.PI:0,
  mode:'approach',clock:0,duration:0,cool:rnd(.3,1),leapCool:0,z:0,hit:0,dirx:team?-1:1,diry:0,victim:null,kills:0,hits:0,attacks:{},taken:0,threatDone:false,pounces:0,landed:0,pins:0,lastDist:0,phase:0,
  stalks:0,lurks:0,feints:0,boxes:0,grabs:0,napes:0,rakes:0,dragged:0,dodges:0,recoils:0,retorts:0,planned:false});
 return a;};
const out=a=>a.katze?a.g.dead||a.fled:a.down||a.surrendered||a.g.dead;K.out=out;
K.health=b=>cl(Math.min(...['kopf','hals','brust'].map(p=>b.tissue[p]/b.max[p]),(b.tissue.bauch+b.tissue.vl+b.tissue.hl)/(b.max.bauch+b.max.vl+b.max.hl))*100*Math.min(1,b.blood/70),0,100);
// Ein verwundeter Löwe oder Tiger wird gefährlicher (Fahrplan, Angriff 13): schwere Großkatzen schlagen unter 55 % Gesundheit härter und schneller zu
const fury=b=>b.P.skulls>=4&&K.health(b)<55;K.fury=fury;
function log(t){const b=S.battle;if(!b)return;b.log.unshift({time:Math.floor(b.time),text:t});b.log.length=Math.min(60,b.log.length);K.onLog?.(t);}
function state(b,mode,dur=0){b.Oprev=b.Ocur||null;if(mode==='approach'&&b.mode!=='approach')b.planned=false;b.mode=mode;b.clock=0;b.duration=dur;b.struck=false;b.ticks=0;b.phase=0;b.aimPt=null;b.aimPts=null;if(NAME[mode])b.attacks[mode]=(b.attacks[mode]||0)+1;}

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
 if(att){b.lastAttacker=att.id;att.damage=(att.damage||0)+wd;if(wd>4&&!HOLD.includes(b.mode))b.grudge=att.id;
  // Zucken an der getroffenen Stelle (KA3b, wie Bär B3c3): Kopf reißt hoch, Hals duckt weg, Brust weicht zurück, Pranke hebt sich, Flanke krümmt sich, Kruppe sackt weg
  if(K.OPT.reakt&&wd>.2)b.fl={t:S.battle?.time||0,part,w:cl(wd/1.6,.35,1),front:(att.x-b.x)*C.facing(b.fig)>0,roar:wd>1.4};}
 if(wd>3)C.sound?.('pain',b);
 if(b.tissue.hals<=0||b.tissue.kopf<=0||b.tissue.brust<=0)die(b,att,{hals:'Throat opened',kopf:'Skull broken',brust:'Heart found'}[b.tissue.hals<=0?'hals':b.tissue.kopf<=0?'kopf':'brust']);
 return wd;}
K.hurt=hurt;
function die(b,a,cause){if(b.g.dead)return;releaseVictim(b);b.g.dead=true;b.down=true;b.death=true;b.g.cause=cause||'Bled out';b.g.killer=a?a.g.name:'';if(a)a.kills=(a.kills||0)+1;state(b,'dead',99);
 const fig=b.fig;if(fig.jump){fig.jump=null;fig.mode='stand';fig.pose=null;}C.go(fig,null);fig.back=0;C.pose(fig,'side');log(a?a.g.name+' kills '+b.g.name+'. ('+b.g.cause+') The crowd wanted it the other way round.':b.g.name+' bleeds out in the sand.');}

// ---------------------------------------------------------------- Treffer an der Katze (Mensch, Hund, Löwe) über M.rexReceive
const HPART={head:'kopf',neck:'hals',chest:'brust',belly:'bauch',ls:'brust',rs:'brust',lua:'vl',rua:'vl',lfa:'vl',rfa:'vl',lh:'vl',rh:'vl',lt:'hl',rt:'hl',lsh:'hl',rsh:'hl',lf:'hl',rf:'hl'};
function receive(a,d,projectile,snapshot){if(d.g.dead)return;const ef=snapshot||M.effective(a),w=ef.w||{};
 if(a.dog||a.lion||a.rex){const part=HPART[ef.partId]||(Math.random()<.4?'hl':Math.random()<.5?'bauch':'hals'),wd=hurt(d,part,(ef.damage||w.damage||10)*rnd(.85,1.15),'bite',a);afterHit(d,a,wd);return;}
 if(!projectile&&dist(a,d)>ef.range+d.r+18)return;
 if(projectile&&w.id==='net'){M.floater?.(d.x,d.y-60,'TEARS THE NET','#e9d1a2');log(d.g.name+' tears through the net.');return;}
 // Die Katze ist schwerer zu treffen als der Bär: im Sprung und im Lauf kaum, über dem Opfer leicht
 if(!projectile&&K.OPT.reakt&&dodge(d,a))return;
 const ag=a.g.stats,fast=d.fig.jump?.45:(d.fig.v||0)>120?.25:0,acc=cl(.2+(projectile?ag.precision:ag.dexterity||48)*.014+(ag.experience||0)*.01-fast+(HOLD.includes(d.mode)?.2:0),.2,.97);
 if(Math.random()>acc)return;
 let dmg=ef.damage*rnd(.8,1.2)*(projectile?1:M.spacingFactor?M.spacingFactor(w,dist(a,d)-d.r*.5,ef.range):1)*(a.energy<15?.6:1);if(w.id==='fist')dmg*=.3;else if(w.bladed)dmg*=1.1;
 const rel=Math.abs(M.angleDiff(M.angle(d,a),d.a)),r=Math.random();
 const part=rel<.9?(r<.3?'kopf':r<.48?'hals':r<.76?'brust':'vl'):rel<2.2?(r<.1?'hals':r<.3?'brust':r<.72?'bauch':r<.85?'vl':'hl'):(r<.5?'hl':r<.92?'bauch':'hals');
 const kind=w.bladed?(w.attack==='thrust'||/spear|trident|dagger|javelin/.test(w.id||'')?'stab':'cut'):projectile?'stab':'blunt';
 const wd=hurt(d,part,dmg,kind,a);M.recordDamage?.(a,ef.attackKey||a.lastAttackKey||'slash',dmg);a.contactPoint={x:d.x,y:d.y-28*d.P.sz};if(w.item)w.item.blood=Math.min(1,(w.item.blood||0)+dmg/55);
 if(wd>5)log(a.g.name+' hits '+d.g.name+' in the '+PART_EN[part]+'.');afterHit(d,a,wd);}
// Ausweichen (KA3b, nach Bär B3c3): nur wenn die Katze den Schlag von vorn kommen sieht und nicht selbst angreift, springt oder wendet. Sie springt zurück
// (alle Pfoten in der Luft, nichts rutscht), der Schlag geht vorbei, dann greift sie sofort an. Chance: P.evade mal Zustand, kurz nacheinander seltener.
function dodge(d,a){if(d.mode==='dodge'&&(a.x-d.x)*C.facing(d.fig)>0)return true;// mitten im Sprung zurück geht auch der Nachschlag vorbei
 if(d.g.dead||!['approach','stalk','feint'].includes(d.mode)||d.fig.jump||d.fig.turn||d.fig.turnWant||(d.fig.v||0)>60||(a.x-d.x)*C.facing(d.fig)<=0)return false;const t=S.battle?.time||0;
 const p=d.dodgeNext?1:d.P.evade*(.4+.6*K.health(d)/100)*(1-.6*K.lame(d))*(d.energy<20?.5:1)*(t-(d.dodgeAt||-9)<1.5?.4:1);if(Math.random()>=p)return false;
 d.dodgeNext=false;d.dodgeAt=t;d.dodges++;d.energy-=3;d.from=a.id;releaseVictim(d);state(d,'dodge',.6);d.retort=a.id;d.retortUntil=t+1.8;d.grudge=a.id;C.express(d.fig,'snarl',t);
 log(d.g.name+' springs back. '+a.g.name+"'s blow cuts nothing but the smell of cat.");return true;}
function afterHit(d,a,wd){if(d.g.dead)return;const t=S.battle?.time||0;
 if(K.OPT.reakt&&!HOLD.includes(d.mode)&&!d.fig.jump&&a){
  // schwerer Treffer: wirft sie einen Schritt zurück (nicht mitten im eigenen Angriff, nicht im Lauf), danach Gegenangriff
  if((d.recoilNext||wd>=K.OPT.wucht)&&t-(d.recoilAt||-9)>2&&(d.fig.v||0)<60&&['approach','stalk','feint','dodge'].includes(d.mode)){d.recoilNext=false;d.recoilAt=t;d.recoils++;d.from=a.id;state(d,'recoil',.6);d.retort=a.id;d.retortUntil=t+1.8;d.grudge=a.id;
   log('The blow throws '+d.g.name+' back a step. It snarls and comes straight back.');}
  // sonst: der Kopf schnellt zum Angreifer, sie schlägt oder beißt zurück, sobald er in Reichweite ist
  else if(wd>.5&&['approach','stalk','feint'].includes(d.mode)&&Math.random()<.45+.4*d.P.wild){d.retort=a.id;d.retortUntil=t+1.3;d.grudge=a.id;if(d.mode!=='approach')state(d,'approach');}}
 if(HOLD.includes(d.mode)){d.interrupt=(d.interrupt||0)+wd;if(d.interrupt>=d.P.interrupt*.3){releaseVictim(d);d.grudge=a.id;state(d,'approach');d.cool=.3;log(a.g.name+' drives '+d.g.name+' off its victim.');}}}
const baseReceive=M.rexReceive;M.rexReceive=function(a,d){if(d?.katze)return receive.apply(this,arguments);return baseReceive?.apply(this,arguments);};

// ---------------------------------------------------------------- Die Katze trifft
const pick=L=>{let x=Math.random()*L.reduce((n,e)=>n+e[1],0);for(const e of L){x-=e[1];if(x<=0)return e[0];}return L[0][0];};
const SWIPE_AT=[['head',.24],['chest',.26],['belly',.1],['lua',.09],['rua',.09],['lfa',.06],['rfa',.06],['ls',.05],['rs',.05]];
const BITE_AT=[['ls',.14],['rs',.14],['lua',.14],['rua',.14],['lfa',.1],['rfa',.1],['lt',.12],['rt',.12]];
const CAT_AT=[['kopf',.15],['hals',.15],['brust',.25],['bauch',.25],['vl',.1],['hl',.1]];
const human=t=>t&&!t.katze&&!t.bear&&!t.dog,fallen=t=>human(t)&&((t.fallTimer||0)>0||t.down||t.state==='fallen');
function humanPart(t,kind){let p=pick(kind==='bite'?BITE_AT:SWIPE_AT);if(t.g.body[p]?.missing)p='chest';return p;}
// Rüstung: Zähne wie beim Hund (DOG.biteFactor), Krallen und Wucht kommen besser durch
function armorF(t,part,kind){const bf=DG()?.biteFactor?.(t,part,kind==='ram'?'leap':'bite')?.f??1;return kind==='bite'||kind==='choke'||kind==='nape'?Math.min(1,bf*1.3):kind==='ram'?.6+.4*bf:.4+.6*bf;}
function hurtHuman(b,t,kind,partId,dmg){const old=t.taken,wasDead=t.g.dead,f=armorF(t,partId,kind);dmg*=f*K.OPT.schaden*(fury(b)?1.15:1);
 const rg=Math.max(70,dist(b,t)+20);
 const ef={...M.effective(b),damage:dmg,range:rg,attackKey:'cat-'+kind,partId,w:{id:'cat-'+kind,name:NAME[kind==='choke'?'pin':kind==='ram'?'pounce':kind]||'Mauling',damage:dmg,range:rg,weight:kind==='ram'?12:kind==='swipe'?7:4,pen:.3,crit:1.2,bladed:false,ammo:0,block:0}};
 M.hit(b,t,false,ef);const landed=t.taken>old;
 if(landed){b.hits++;if(kind==='bite'||kind==='choke'||kind==='nape')b.fig.mouthBlood=Math.min(1,(b.fig.mouthBlood||0)+.2);const p=t.g.body[partId];if(p&&kind!=='ram')p.bleed=(p.bleed||0)+(.6+dmg*.025)*f;
  try{const pt=M.contactAnchor(t,partId||'chest');spray(b,pt.x,pt.y+8,Math.max(4,t.y-pt.y),8+dmg*.35,b.a);}catch{}
  if(!wasDead&&t.g.dead)b.kills++;}
 return landed;}
function strike(b,t,kind,dmg,at){if(!t||t.g.dead)return false;
 if(t.katze){const wd=hurt(t,kind==='nape'?'hals':pick(CAT_AT),dmg*K.OPT.schaden,kind==='swipe'?'claw':kind==='ram'?'blunt':'bite',b);b.hits++;if(t.g.dead)b.kills++;afterHit(t,b,wd);return true;}
 if(!human(t))return false;return hurtHuman(b,t,kind,at||humanPart(t,kind),dmg);}
function fell(b,t,why,dur,push){if(!human(t)||t.g.dead)return;M.knockdown(t,why,dur);t.kx=(t.kx||0)+Math.cos(b.a)*push;t.ky=(t.ky||0)+Math.sin(b.a)*push*.3;}
function releaseVictim(b){const t=S.battle?.actors.find(a=>a.id===b.victim);if(t&&t.pinnedBy===b.id)delete t.pinnedBy;b.victim=null;b.interrupt=0;
 const g=b.grabbed&&S.battle?.actors.find(a=>a.id===b.grabbed);if(g&&g.katzeGrip===b.id)delete g.katzeGrip;b.grabbed=null;}
const act=id=>S.battle?.actors.find(a=>a.id===id);
// Der Liegende fällt so, dass sein Kopf von der Katze weg zeigt (wie nach dem Ansprung)
function bestSide(b,T){const f=C.facing(b.fig);let best=-1,bx=-1e9;for(const fs of [-1,1]){T.fallSide=fs;const x=(groundPoint(T,'head').x-T.x)*f;if(x>bx){bx=x;best=fs;}}T.fallSide=best;}
// Helfer: andere Gegner, die stehen und nah an der Katze sind
const helpers=(b,V)=>foes(b).filter(a=>a!==V&&!fallen(a)&&!a.down&&dist(a,b)<175);
const lameOf=(b,p)=>cl((.6-b.tissue[p]/b.max[p])/.6,0,1);
K.lame=b=>Math.max(lameOf(b,'vl'),lameOf(b,'hl'));

// ---------------------------------------------------------------- Bewegung: der Körper kommt nur so weit voran, wie die Beine laufen (KATZE.step, fig.dist)
const BX=[110,930],BY=[190,605];
function brake(b){const v=b.fig.v||0,hs=Math.sqrt(cl(b.katze.weight/200,.3,2));return v*v/(2*(60+1.2*v)/hs*1.4)*scaleOf(b);}
function head(b,tx,ty,gait,durch){const fig=b.fig,dx=tx-b.x,dy=ty-b.y,d=Math.hypot(dx,dy)||1,want=dx>=0?1:-1;
 fig.back=0;if((fig.bdir||1)<0&&(fig.v||0)>1){C.go(fig,null);return d;}// kommt sie aus dem Rückwärtsgang, hält sie erst an
 if(Math.abs(dx)>12&&want!==C.facing(fig)&&!fig.turn&&!fig.turnWant)C.turn(fig);
 if(fig.turn||fig.turnWant||fig.mode!=='stand'&&!fig.go){C.go(fig,null);if(fig.mode!=='stand'&&!fig.jump)C.pose(fig,'stand');}
 else if(!durch&&d<=brake(b)+2)C.go(fig,null);
 else{const lame=K.lame(b);if(lame>.45&&gait==='gallop')gait='trot';C.go(fig,gait);fig.pace=b.P.pace*(1-.5*lame)*(b.energy<15?.8:1);}
 b.dirx=dx/d;b.diry=dy/d;return d;}
// Rückwärts gehen (KA3b, wie Bär B3c3): Blick bleibt, wo er ist; der Körper geht nach hinten (KATZE a.back). Läuft sie noch vorwärts, hält sie erst an.
function backTo(b,tx,ty,pf=1){const fig=b.fig,dx=tx-b.x,dy=ty-b.y,d=Math.hypot(dx,dy)||1;
 if(fig.turn||fig.turnWant||fig.mode!=='stand'||fig.jump){C.go(fig,null);if(fig.mode!=='stand'&&!fig.jump&&!fig.turn)C.pose(fig,'stand');return d;}
 if((fig.bdir||1)>0&&(fig.v||0)>1){C.go(fig,null);return d;}
 fig.back=1;C.go(fig,'walk');fig.pace=1.4*b.P.pace*pf*(1-.5*K.lame(b));b.dirx=dx/d;b.diry=dy/d;return d;}
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
// Aufgerichtet boxen (KA3b): Beide Pranken stehen vor der Brust in Deckung (G), holen nach oben aus (W), schlagen zum Punkt, ziehen die Krallen nach unten durch (F)
// und kehren in die Deckung zurück. v 0…1 je Schlag, Treffer bei .5; e: wie weit die Katze aufgerichtet ist.
const BOXV=[.12,.36],BOXHIT=BOXV.map(v=>v+.25);K.BOXHIT=BOXHIT;
function boxPaw(O,Cc,SH,T,v,far,LN,e){const L=SH.L,ph=Cc.p+LN.p,sx=Cc.hx+LN.hx+L*Math.cos(ph),sy=Cc.hy-L*Math.sin(ph),wx=Cc.wx-(far?3:0),wy=Cc.wy;
 const G=[sx+6-wx,sy+11-wy],W=[G[0]-3,G[1]-9],Hh=[T.x-MC*.96-wx,T.y-MC*.28-wy],F=[Hh[0]-2,Hh[1]+9];let a,c,k;
 if(v<=0||v>=1){a=G;c=G;k=0;}else if(v<.3){a=G;c=W;k=sm(v/.3);}else if(v<.5){a=W;c=Hh;k=((v-.3)/.2)**2;}else if(v<.7){a=Hh;c=F;k=sm((v-.5)/.2);}else{a=F;c=G;k=sm((v-.7)/.3);}
 const x=lerp(a[0],c[0],k)*e,y=lerp(a[1],c[1],k)*e,an=(v>.3&&v<.7?1.05:.7)*e;if(far){O.fx=x;O.fy=y;O.fa=an;}else{O.nx=x;O.ny=y;O.na=an;}}
// ---------------------------------------------------------------- Überlagerte Bewegung je Angriff (Zahlen für KATZE a.over)
const OKEYS=['hx','hy','p','bend','ne','he','ta','tc','nx','ny','na','fx','fy','fa','mouth','lip','tongue','claws','lash','ear','sc','tdx','tdy','ax','ay','z'];
const SEG=[[0,.36],[.32,.68],[.64,1]];K.FLURRY=SEG.map(s=>s[0]+HITV*(s[1]-s[0]));
function over(b,t){const fig=b.fig,SH=b.P.SH,m=b.mode,u=b.duration?cl(b.clock/b.duration,0,1):0,O={},hr=b.hit>0?b.hit/.3:0;
 if(fig.jump||fig.turn){/* Sprung und Wenden gehören dem Skelett */}
 else if(b.g.dead){const e=sm(b.clock/1.3);O.mouth=.25*e;O.tongue=.3*e;O.ear=-.5*e;}// liegt auf der Seite (Haltung side), Maul halb offen
 else if(m==='threat'){const e=sm(u/.15)*sm((1-u)/.15),sw=sm((u-.52)/.08)*sm((.8-u)/.14);O.hy=2.4*e;O.ne=-.14*e;O.hx=-2*e;O.lash=e;O.ear=-.9*e;O.lip=.7*e;O.sc=.6*e;O.nx=10*sw;O.ny=-12*sw;O.na=.95*sw;O.claws=sw;}
 else if((m==='swipe'||m==='flurry')&&b.aimPt){const Cc=curOf(fig);
  if(m==='swipe'){const T=b.aimPt,LN=lean(Cc,SH,T,27*SH.leg),w=stay(u);O.p=LN.p*w;O.hx=LN.hx*w;pawStroke(O,Cc,SH,T,u,false,{p:O.p,hx:O.hx});O.ear=-.8*w;O.lip=.6*w;O.mouth=.3*w;O.lash=.7*w;refine(b,O,t,sm((u-.3)/.1)*sm((.47-u)/.04),null,T);}
  else{const A=b.aimPts||[b.aimPt,b.aimPt,b.aimPt],TL={x:(A[0].x+A[1].x+A[2].x)/3,y:Math.min(A[0].y,A[1].y,A[2].y)},LN=lean(Cc,SH,TL,27*SH.leg),w=sm(u/.14)*sm((1-u)/.2);O.p=LN.p*w;O.hx=LN.hx*w;
   SEG.forEach((s,i)=>pawStroke(O,Cc,SH,A[i],(u-s[0])/(s[1]-s[0]),i===1,{p:O.p,hx:O.hx}));O.ear=-.9*w;O.lip=.8*w;O.mouth=.4*w;O.lash=w;}}
 else if(m==='bite'&&b.aimPt){const Cc=curOf(fig),T=b.aimPt,LN=lean(Cc,SH,T,SH.neck+10),w=stay(u),snap=sm((u-.3)/.15)*sm((.62-u)/.14);O.p=LN.p*w;O.hx=LN.hx*w+3*snap;mouthTo(O,Cc,SH,T,LN,w);
  O.mouth=u<.45?.85*sm(u/.3):.16+.1*Math.max(0,1-(u-.45)/.1);O.lip=.7*w;O.ear=-.8*w;{const rw=sm((u-.3)/.13)*sm((.7-u)/.15);refine(b,O,t,rw,T,null);refine(b,O,t,rw,T,null);}if(b.struck&&u<.85)O.he+=.1*Math.sin(t*34)*sm((.85-u)/.15);}
 else if((m==='pin'&&b.phase===1||m==='nape'||m==='rake')&&b.aimPt){const Cc=curOf(fig),w=sm(b.clock/.4),T=b.aimPt,Tc=b.aimPts?.[0]||T,LN=lean(Cc,SH,T,SH.neck+10);O.p=LN.p*w;O.hx=LN.hx*w;mouthTo(O,Cc,SH,T,LN,w);
  O.nx=(Tc.x-1-Cc.wx)*w;O.ny=(Tc.y-MC-Cc.wy)*w;O.na=.2*w;O.claws=w;O.mouth=.28*w;O.lip=.5*w;O.ear=-.7*w;O.lash=.5*w;refine(b,O,t,w,T,Tc);refine(b,O,t,w,T,Tc);const tk=cl(1-(b.clock-(b.tickAt||0))/.3,0,1);O.he+=.07*Math.sin(t*30)*tk*w;O.hx+=1.2*tk*w;
  if(m!=='pin'){const Tf=b.aimPts?.[1]||Tc;O.fx=(Tf.x-4-Cc.wx)*w;O.fy=(Tf.y-MC-Cc.wy)*w;O.fa=.2*w;O.he+=-.06*w;}// Nackenbiss: beide Pranken auf dem Rücken
  if(m==='rake'){const k=sm(u/.15)*sm((1-u)/.15),kick=(Math.sin(TAU*2*cl((u-.1)/.8,0,1)-Math.PI/2)*.5+.5)*k;// zwei Tritte mit beiden Hinterpfoten, Höhepunkt bei u = .3 und .7
   O.hy+=7*k;O.p-=.08*k;O.bend=(O.bend||0)+2*k;O.tdx=(4+16*kick)*k;O.tdy=-(2.5+6*kick)*k;O.ax=(6+12*kick)*k;O.ay=3*k;O.lash=1;O.claws=1;}}
 else if(m==='box'&&b.aimPts){const Cc=curOf(fig),A=b.aimPts,TH={x:(A[0].x+A[1].x)/2,y:Math.min(A[0].y,A[1].y)},LN=lean(Cc,SH,TH,27*SH.leg),e=sm(u/.22)*sm((1-u)/.2);
  O.p=Math.max(LN.p,.78-cl((TH.x-40)/40,0,.4))*e;O.hx=LN.hx*e;// weit entfernte Ziele: weniger steil, damit die Pranken hinreichen
  O.hy=4*e;O.bend=-e;O.ta=.5*e;const L2={p:O.p,hx:O.hx};BOXV.forEach((v0,i)=>boxPaw(O,Cc,SH,A[i],(u-v0)/.5,i===1,L2,e));
  O.claws=e;O.ear=-.9*e;O.lip=.9*e;O.mouth=.45*e;O.ne=.2*e;O.lash=e;{const rw=sm((u-BOXHIT[0]+.07)/.05)*sm((BOXHIT[0]+.07-u)/.05);refine(b,O,t,rw,null,A[0]);refine(b,O,t,rw,null,A[0]);}}
 else if(m==='grab'&&b.aimPts){const Cc=curOf(fig),A=b.aimPts,TH={x:(A[0].x+A[1].x)/2,y:Math.min(A[0].y,A[1].y)},LN=lean(Cc,SH,TH,27*SH.leg),e=sm(u/.28)*sm((1-u)/.18),pull=sm((u-.38)/.3)*sm((1-u)/.2);
  O.p=Math.max(LN.p,.45)*e-.12*pull;O.hx=LN.hx*e-4*pull;O.hy=2*e+3*pull;
  A.forEach((T,i)=>{const far=i===1,wx=Cc.wx-(far?3:0),x=(T.x-MC*.96-wx)*e,y=(T.y-MC*.28-Cc.wy)*e;if(far){O.fx=x;O.fy=y;O.fa=.9*e;}else{O.nx=x;O.ny=y;O.na=.9*e;}});
  O.claws=sm((u-.15)/.1);O.ear=-.9*e;O.lip=.9*e;O.mouth=.5*e;O.ne=-.1*pull;O.lash=e;{const rw=sm((u-.2)/.1)*sm((.85-u)/.1);refine(b,O,t,rw,null,A[0]);refine(b,O,t,rw,null,A[0]);}}
 else if(m==='drag'&&b.aimPt){const Cc=curOf(fig),T=b.aimPt,L0=lean(Cc,SH,T,SH.neck+10),LN={p:L0.p*.8,hx:L0.hx*.6},w=sm(b.clock/.35);O.p=LN.p*w;O.hx=LN.hx*w;mouthTo(O,Cc,SH,T,LN,w);refine(b,O,t,w,T,null);
  O.mouth=.3*w;O.lip=.8*w;O.ear=-.8*w;O.hy=1.5*w;O.he+=.05*Math.sin(t*7)*w;O.lash=.6*w;}
 else if(m==='stalk'){const e=sm(b.clock/.5);O.ne=-.12*e;O.he=.06*e;O.ear=-.35*e;O.ta=.25*e;O.tc=.3*e;if(b.phase===1)O.lash=.25+.25*Math.sin(t*2.2);}// tief, Kopf flach voraus, nur die Schwanzspitze zuckt
 else if(m==='feint'&&b.phase>=1){const q=b.clock-b.pc,e=b.phase===1?sm(q/.15):1-sm(q/.4),sl=b.phase===1?sm((q-.15)/.1)*sm((.55-q)/.12):0;
  O.hx=-2.5*e;O.hy=1.5*e;O.ear=-e;O.lip=.95*e;O.mouth=.5*e;O.lash=e;O.ne=-.08*e;O.ny=-9*sl;O.nx=6*sl;O.na=.8*sl;O.claws=sl;}// bremst, faucht, schlägt in die Luft
 else if(m==='dodge'){const e=sm(u/.12)*sm((1-u)/.35),hop=u>.1&&u<.6?Math.sin(Math.PI*(u-.1)/.5):0;O.hx=-5*e;O.p=.1*e;O.ne=.14*e;O.he=.1*e;O.ear=-1;O.lip=e;O.mouth=.6*e;O.z=7*hop*SH.leg;O.lash=e;}
 else if(m==='recoil'){const e=sm(u/.2)*(1-sm((u-.45)/.55));O.hx=-4*e;O.p=.06*e;O.ne=.16*e;O.ear=-1;O.lip=e;O.mouth=.75*e;}// zurückgeworfen, Schmerzlaut
 else if(m==='pounce'&&b.phase===0){O.ear=.3;}
 // Treffer (KA3b, wie Bär B3c3): zuckt an der getroffenen Stelle (e), dann schnellt der Kopf zum Angreifer (s); bei schweren Treffern Schmerzlaut
 const fl=K.OPT.reakt&&b.fl&&!b.g.dead&&!fig.jump?b.fl:null,ad=(k,v)=>{O[k]=(O[k]||0)+v;};
 if(fl){const q=(t-fl.t)/.55;if(q>=1||q<0)b.fl=null;else{const free=['approach','stalk','feint','recoil','dodge','flee'].includes(m),kl=free?1:HOLD.includes(m)?.15:.35;// mitten im eigenen Angriff nur ein kleines Zucken: Pranke und Maul bleiben am Ziel
   const e=Math.sin(Math.PI*.5*Math.min(1,q/.3))*(1-sm((q-.3)/.7))*fl.w*kl,s=fl.front&&free?sm((q-.2)/.25)*(1-sm((q-.65)/.35))*fl.w:0,g=Math.max(e,s),p=fl.part;
   if(p==='kopf'){ad('he',.3*e);ad('ne',.12*e);ad('hx',-2.5*e);}else if(p==='hals'){ad('ne',-.22*e);ad('he',.18*e);ad('hx',-2*e);}
   else if(p==='brust'){ad('hx',-3*e);ad('p',.07*e);ad('bend',1.2*e);}else if(p==='vl'){ad('hx',-1.5*e);ad('p',.04*e);if(!(fig.v>2)&&free){ad('ny',-5*e);ad('nx',-3*e);}}
   else if(p==='bauch'){ad('bend',2.4*e);ad('hy',-1.2*e);}else{ad('hy',2.6*e);ad('p',.07*e);}
   O.ear=Math.max(-1,(O.ear||0)-.9*g);if(fl.roar){O.mouth=Math.max(O.mouth||0,.7*g);O.lip=Math.max(O.lip||0,g);}if(s>0){ad('ne',.1*s);ad('he',-.12*s);ad('hx',2*s);}}}
 else if(hr>0&&!b.g.dead&&!fig.jump&&!K.OPT.reakt){O.hy=(O.hy||0)+1.1*hr;O.ear=(O.ear||0)-hr;O.lip=Math.max(O.lip||0,.7*hr);O.mouth=Math.max(O.mouth||0,.25*hr);}
 // Lahmen (KA3b, wie Bär B3c3): Tritt die kranke Vorderpranke auf, geht der Kopf hoch (die Katze nimmt Last von ihr); lahmt sie hinten, sackt die Kruppe weg.
 // Im Stand hält sie die kranke Vorderpranke angehoben. Die Pfoten bleiben dabei stehen (nur Rumpf, Hals und Kopf bewegen sich).
 const lv=lameOf(b,'vl'),lh=lameOf(b,'hl');if((lv>0||lh>0)&&!b.g.dead&&fig.mode==='stand'&&!fig.turn&&!fig.jump){const G=C.GAITS.walk,c=fig.cyc||0,gs=fig.gs||0,st=i=>{const v=((c+G.off[i])%1+1)%1;return v<G.duty?Math.sin(Math.PI*v/G.duty):0;},sv=st(3),sh=st(2);
  ad('ne',.24*lv*gs*sv);ad('he',-.1*lv*gs*sv);ad('p',.05*lv*gs*sv-.06*lh*gs*sh);ad('hy',1.8*lh*gs*sh);
  if(lv>.5&&gs<.2&&['approach','threat','stalk','feint'].includes(m)&&!(O.ny<0))ad('ny',-5*(lv-.5)*(1-gs*5));}
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
// Plan vor dem Angriff (KA3b): Anschleichen und Umkreisen aus der Ferne, Scheinangriff aus mittlerer Entfernung; selten, vorläufig (KA25)
function planOf(b,T,d){const w=b.wantPlan;b.wantPlan=null;if(w)return w;if(b.energy<40||K.lame(b)>.3)return null;
 if(K.OPT.sprung&&d>240&&b.stalks<1&&Math.random()<.35)return 'stalk';if(d>120&&d<560&&b.feints<2&&Math.random()<.25)return 'feint';return null;}
const safePart=(T,p)=>T.g.body[p]?.missing?'chest':p;
function startAttack(b,T,kind){b.energy-=kind==='flurry'||kind==='box'||kind==='grab'?9:5;
 if(kind==='box'){b.parts=[pick([['head',.5],['ls',.25],['rs',.25]]),pick([['head',.35],['chest',.25],['ls',.2],['rs',.2]])].map(p=>safePart(T,p));state(b,'box',1.5);b.aimPts=b.parts.map(p=>aimPoint(b,T,p));b.aimPt=b.aimPts[0];b.boxes++;}
 else if(kind==='grab'){b.parts=['ls','rs'].map(p=>safePart(T,p));state(b,'grab',1.6);b.aimPts=b.parts.map(p=>aimPoint(b,T,p));b.aimPt=b.aimPts[0];b.grabs++;b.grabbed=null;b.pulled=false;}
 else if(kind==='flurry'){b.parts=[humanPart(T,'swipe'),humanPart(T,'swipe'),humanPart(T,'swipe')];state(b,'flurry',1.25);b.aimPts=b.parts.map(p=>aimPoint(b,T,human(T)?p:null));b.aimPt=b.aimPts[0];}
 else{b.part=human(T)?humanPart(T,kind):null;state(b,kind,kind==='bite'?.85:.78);b.aimPt=aimPoint(b,T,b.part);}b.targetId=T.id;}
function stepCat(b,dt){const bt=S.battle,fig=b.fig,P=b.P,t=bt.time;b.clock+=dt;b.cool=Math.max(0,b.cool-dt);b.leapCool=Math.max(0,b.leapCool-dt);b.hit=Math.max(0,b.hit-dt);stepSpray(b,dt);
 if(!b.g.dead){let bl=0;for(const p of PARTS){const v=b.bleed[p]||0;if(v>0){bl+=v;b.bleed[p]=v*Math.exp(-dt*.1);}}b.blood=Math.max(0,b.blood-bl*dt);
  if(bl>.25&&Math.random()<dt*6){const w=partWorld(b,PARTS[Math.floor(Math.random()*6)]);stain(w.x,w.y,1+Math.random()*2);}
  b.energy=Math.min(100,b.energy+dt*4*P.stam);if(b.blood<=16)die(b,bt.actors.find(a=>a.id===b.lastAttacker)||null,'Bled out');}
 if(b.g.dead){b.pool=b.pool||{r:0};b.pool.r=Math.min(22*P.sz,b.pool.r+dt*5);animate(b,dt,t);return;}
 let V=b.victim&&bt.actors.find(a=>a.id===b.victim);
 if(V&&V.g.dead&&HOLD.includes(b.mode)){log(b.g.name+' holds on a little longer, to be sure. '+V.g.name+' has stopped arguing.');releaseVictim(b);state(b,'approach');b.cool=.9;V=null;}
 if(b.morale<=0&&b.mode!=='flee'&&b.mode!=='gone'&&!fig.jump){releaseVictim(b);state(b,'flee',7);log(b.g.name+' has had enough and runs. Nobody asks for a refund to its face.');}
 if(K.OPT.reakt&&b.team===0&&(K.force==='dodge'||K.force==='recoil')){b[K.force+'Next']=true;K.force=null;}
 const m=b.mode;
 if(m==='flee'){const d=head(b,b.x<520?BX[0]:BX[1],b.y,'gallop',true);if(b.clock>b.duration||d<16){b.fled=true;b.surrendered=true;state(b,'gone',99);}animate(b,dt,t);return;}
 if(m==='gone'){halt(b);animate(b,dt,t);return;}
 // ---- Ansprung läuft (Sprung des Skeletts): Landung prüfen, danach niederhalten
 if(m==='pounce'&&b.phase===2){const J=fig.jump,T=bt.actors.find(a=>a.id===b.targetId);
  if(J&&!b.struck&&t-J.t0>=J.t2){b.struck=true;const s=scaleOf(b),f=C.facing(fig),px=b.x+f*(WXof(b)+J.dB)*s,gap=T?Math.hypot(T.x-px,(T.y-b.y)*1.2):1e9;K.lastLanding={gap,t};
   if(T&&!T.g.dead&&gap<34){const ok=strike(b,T,'ram',P.ram*rnd(.85,1.15),'chest');
    if(ok&&human(T)){b.landed++;if(!T.g.dead){M.knockdown(T,'Pulled down by '+b.g.name,3);bestSide(b,T);T.kx=(T.kx||0)+f*26;b.victim=T.id;b.afterLand=true;
      log(b.g.name+' lands on '+T.g.name+' with everything it weighs. He goes down under it.');}else log(b.g.name+' lands on '+T.g.name+'. The landing was the whole fight.');}
    else if(human(T))log(T.g.name+' twists aside. '+b.g.name+' lands on sand and takes it personally.');}
   else if(T)log(b.g.name+' springs and finds only sand where '+T.g.name+' was standing.');}
  if(!J){b.leapCool=rnd(3.5,6);const Vv=b.afterLand&&bt.actors.find(a=>a.id===b.victim);b.afterLand=false;if(Vv&&!Vv.g.dead&&fallen(Vv)){state(b,'pin');if(b.fromBehind)b.wantHold='nape';}else{releaseVictim(b);state(b,'approach');b.cool=.4;}b.fromBehind=false;}
  animate(b,dt,t);return;}
 const T=HOLD.includes(m)&&V?V:chooseTarget(b);
 if(!T){halt(b);if(m!=='approach')state(b,'approach');animate(b,dt,t);return;}
 if(T.id!==b.tvId){b.tvId=T.id;b.tvx=b.tvy=0;}else if(dt>0){b.tvx=lerp(b.tvx,(T.x-b.tpx)/dt,.15);b.tvy=lerp(b.tvy,(T.y-b.tpy)/dt,.15);}b.tpx=T.x;b.tpy=T.y;
 const d=dist(b,T);
 if(m==='approach'){let f=K.force&&b.team===0?K.force:null;if(f){K.force=null;
   if(['pin','nape','rake','drag'].includes(f)){if(human(T)){if(!fallen(T))fell(b,T,'Pulled down by '+b.g.name,3,8);b.wantHold=f==='nape'?'nape':f==='pin'?'pin':null;b.wantNext=f==='rake'||f==='drag'?f:null;}f=null;}
   else if(f==='threat')b.threatDone=false;else if(f==='pounce'){b.leapCool=0;b.wantLeap=true;b.forcedLeap=true;b.energy=Math.max(b.energy,40);}else if(f==='flee'){b.morale=0;f=null;}
   else if(f==='dodge'||f==='recoil'){b[f+'Next']=true;f=null;}else if(f==='stalk'||f==='feint'){b.wantPlan=f;b.planned=false;b.energy=Math.max(b.energy,45);f=null;}}
  // Gegenangriff (KA3b): nach einem Treffer oder Ausweichen greift sie den Angreifer an, sobald er in Reichweite ist
  const rt=b.retort&&t<b.retortUntil?act(b.retort):null;if(b.retort&&(!rt||rt.g.dead))b.retort=null;
  if(fallen(T)&&!T.pinnedBy){b.victim=T.id;state(b,'pin');}
  else if(!b.threatDone&&(d>260&&closing(b,T)<40&&b.clock>.6||f==='threat')){b.threatDone=true;state(b,'threat',2.4);C.express(fig,'roar',t);log(b.g.name+' roars. The front rows remember an appointment.');}
  else if((!b.planned||t>(b.planAt||0)+4&&d>120)&&!rt&&human(T)&&!fallen(T)&&!f){b.planned=true;b.planAt=t;const pl=planOf(b,T,d);
   if(pl==='stalk'){state(b,'stalk',12);b.targetId=T.id;b.stalks++;log(b.g.name+' drops low and starts to circle '+T.g.name+'. It is in no hurry. He is.');}
   else if(pl==='feint'){state(b,'feint',5);b.targetId=T.id;b.feints++;}}
  else if(!rt&&K.OPT.sprung&&!fallen(T)&&(b.wantLeap||b.leapCool<=0&&b.energy>30&&d>leapMin(b)+30&&K.lame(b)<.45)){b.wantLeap=false;state(b,'pounce',7);b.targetId=T.id;}
  else{const sp=spot(b,T),dd=head(b,sp.x,sp.y,d>280?'gallop':d>130?'trot':'walk');if(dd<10)faceTo(b,T);
   if(['swipe','flurry','bite','box','grab'].includes(f)&&!inReach(b,T))K.force=f;// Knopf gedrückt: erst hingehen
   if(inReach(b,T)&&(b.cool<=0||rt===T)&&(fig.v||0)<30&&!fig.turn&&!fig.turnWant&&fig.mode==='stand'){halt(b);let k=f&&f!=='threat'?f:null;
    if(!k&&rt===T){k=Math.random()<.6?'swipe':'bite';b.retorts++;b.retort=null;}
    if(!k)k=pick([['swipe',.42],['flurry',b.energy>25?.25:.05],['bite',.2],['box',human(T)&&b.energy>25?P.boxP:0],['grab',human(T)&&b.energy>30?P.grabP:0]]);
    if((k==='box'||k==='grab')&&!human(T))k='swipe';startAttack(b,T,k);}}}
 else if(m==='threat'){halt(b);faceTo(b,T);if(b.clock>b.duration||d<115&&b.clock>.5){state(b,'approach');b.cool=.2;}}
 else if(m==='pounce'){const mx=leapMax(b),mn=leapMin(b);
  if(fallen(T)||T.g.dead||b.clock>b.duration||b.phase===0&&d<mn&&!b.forcedLeap){if(b.phase===1)C.pose(fig,'stand');state(b,'approach');b.leapCool=1.5;}
  else if(b.phase===0){
   if(d<mn){const ax=cl(b.x+(b.x<T.x?-1:1)*(mn+40-d+30),BX[0],BX[1]);if(Math.abs(ax-b.x)<12){state(b,'approach');b.leapCool=2.5;}else head(b,ax,b.y,'trot',true);}// zu nah: nimmt erst Abstand
   else if(d>mx*.72+closing(b,T)*PREP+brake(b))head(b,T.x,T.y,d>mx+320?'gallop':d>mx+120?'trot':'walk',true);// kommt der Gegner entgegen, bleibt sie stehen und lauert: sie duckt sich so früh, dass er beim Absprung im Sprungfenster ist
   else{halt(b);if(faceTo(b,T)&&(fig.v||0)<1&&(fig.mode==='stand'||fig.mode==='crouch')&&!C.moving(fig)){b.phase=1;C.leap(fig);}}}
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
 else if(HOLD.includes(m)){
  if(!fallen(T)||T.pinnedBy&&T.pinnedBy!==b.id){releaseVictim(b);state(b,'approach');b.cool=.3;}
  else if(m==='pin'&&b.phase===0){// neben den Hals des Liegenden treten: so, dass das Maul die Kehle erreicht
   const gp=groundPoint(T,'neck'),f=b.x<=gp.x?1:-1,s=scaleOf(b),mr=(P.SH.L*.5+P.SH.neck*.7+7)*s,x=cl(gp.x-f*mr,BX[0],BX[1]),y=cl(T.y+3,BY[0],BY[1]),dd=head(b,x,y,'walk');T.pinnedBy=b.id;
   if(dd<8){halt(b);if((f===C.facing(fig)||faceTo(b,gp))&&f===C.facing(fig)&&!fig.turn&&(fig.v||0)<2&&fig.mode==='stand'){b.phase=1;b.clock=0;b.tickAt=-9;b.interrupt=0;b.pins++;const hold=b.wantHold||(Math.random()<P.napeP*.5?'nape':'pin');b.wantHold=null;
     if(hold==='nape'){b.mode='nape';b.napes++;b.attacks.nape=(b.attacks.nape||0)+1;log(b.g.name+' plants both paws on '+T.g.name+"'s back and drives its fangs into his neck, between the bones.");}
     else log(b.g.name+' stands over '+T.g.name+', one paw on his chest, and takes him by the throat.');aimHold(b,T);}}
   if(b.clock>5){releaseVictim(b);state(b,'approach');b.cool=.3;}}
  else if(m==='drag'){// Wegzerren (KA3b, wie Rex Vetus und Bär B3c3): rückwärts von den Helfern weg, das Opfer am Hals vor sich; es schleift nach, springt nie
   T.pinnedBy=b.id;b.aimPt=aimPoint(b,T,'neck');const dd=backTo(b,b.dragTo.x,b.dragTo.y,.8),ox=T.x,oy=T.y,lim=(200+(fig.v||0)*scaleOf(b))*dt;
   T.x=ox+cl(cl(b.x+b.dragOff,BX[0],BX[1])-ox,-lim,lim);T.y=oy+cl(cl(b.y+b.dragDy,BY[0],BY[1])-oy,-lim,lim);T.kx=T.ky=0;b.dragLen=(b.dragLen||0)+Math.hypot(T.x-ox,T.y-oy);
   if(b.tickAt==null||b.clock-b.tickAt>=.7){b.tickAt=b.clock;strike(b,T,'choke',P.choke*.6*rnd(.85,1.15),'neck');}
   if(b.clock>b.duration||dd<12||b.clock>.8&&(fig.v||0)<1&&Math.abs(b.x-b.dragTo.x)>20&&(b.x<=BX[0]+2||b.x>=BX[1]-2)){halt(b);const hm=b.hold;state(b,'pin');b.wantHold=hm==='nape'?'nape':'pin';}}
  else{halt(b);aimHold(b,T);
   if(m==='rake'){const u=b.clock/b.duration;// zwei Tritte mit beiden Hinterpfoten gegen Bauch und Oberschenkel
    if(b.ticks<2&&u>=[.3,.7][b.ticks]){b.ticks++;if(strike(b,T,'swipe',P.swipe*.55*rnd(.85,1.15),safePart(T,pick([['belly',.5],['lt',.25],['rt',.25]])))&&b.ticks===1)log(b.g.name+' holds on and rakes '+T.g.name+"'s belly with both hind feet. The crowd looks away, then back.");}
    if(u>=1){const hm=b.hold||'pin';state(b,hm);b.phase=1;b.clock=.5;b.tickAt=.5;aimHold(b,T);}}
   else{const nape=m==='nape';
    if(b.clock-(b.tickAt<0?-.2:b.tickAt)>=.5){b.tickAt=b.clock;b.energy-=1;b.chk={kind:'pin',T:b.aimPt};strike(b,T,nape?'nape':'choke',(nape?P.bite*.42:P.choke)*rnd(.85,1.15),'neck');}
    const H=helpers(b,T),f=C.facing(fig),hx=H.length?H.reduce((n,a)=>n+a.x,0)/H.length:null,room=Math.abs(cl(b.x-f*120,BX[0],BX[1])-b.x)>50;
    if(T.g.dead){}
    else if(b.wantNext==='rake'||b.clock>1.2&&b.energy>20&&Math.random()<dt*.5*P.rakeP){b.wantNext=null;b.hold=m;state(b,'rake',1.5);b.rakes++;aimHold(b,T);}
    else if(room&&(b.wantNext==='drag'||H.length&&(hx-b.x)*f>0&&b.clock>.5&&b.dragged<2&&Math.random()<dt*3)){b.wantNext=null;const cy=H.length?H.reduce((n,a)=>n+a.y,0)/H.length:b.y;
     b.hold=m;b.dragTo={x:cl(b.x-f*120,BX[0],BX[1]),y:cl(b.y+(b.y>=cy?1:-1)*40,BY[0],BY[1])};b.dragOff=T.x-b.x;b.dragDy=T.y-b.y;state(b,'drag',2.8);b.aimPt=aimPoint(b,T,'neck');b.tickAt=null;b.dragged++;b.dragLen=0;
     log(b.g.name+' drags '+T.g.name+' away by the throat. His friends are welcome to follow.');}}}}
 else if(m==='stalk'){// Anschleichen und Umkreisen (KA3b): tief am Boden im Bogen nach hinten; sieht der Gegner her, duckt sie sich und lauert
  // Ablauf: im Bogen schleichen (rund 2–3 s), dann geduckt lauern (1,5–2 s), wieder schleichen; zeigt der Gegner den Rücken oder hat sie zweimal gelauert, springt sie an
  const Tt=act(b.targetId)||T,rel=Math.abs(M.angleDiff(M.angle(Tt,b),Tt.a||0)),dd=dist(b,Tt),mx=leapMax(b),mn=leapMin(b),can=K.OPT.sprung&&dd<mx*.9&&dd>mn,crouched=fig.mode==='crouch';// springt auch, wenn sie sich noch duckt (der Sprung wartet, bis sie unten ist)
  if(fallen(Tt)||Tt.g.dead||b.clock>b.duration||dd<mn*.8){if(fig.mode==='crouch')C.pose(fig,'stand');state(b,'approach');b.cool=.2;}
  else if(rel>2.1&&can&&dd>mn+10&&(fig.v||0)<40){b.fromBehind=true;state(b,'pounce',7);b.targetId=Tt.id;log(b.g.name+' has crept round behind '+Tt.g.name+'. He never sees it leave the ground.');}
  else if(b.phase===1){halt(b);if(faceTo(b,Tt)&&(fig.v||0)<1&&fig.mode!=='crouch'&&!fig.want&&!C.moving(fig))C.pose(fig,'crouch');
   if(crouched&&can&&(closing(b,Tt)>70||b.clock>b.lurkEnd&&b.lurks>=2)){state(b,'pounce',7);b.targetId=Tt.id;}// kommt er auf sie zu oder hat sie lange genug gelauert: Ansprung
   else if(b.clock>b.lurkEnd){if(b.lurks>=2){C.pose(fig,'stand');state(b,'approach');b.cool=.2;}else{b.phase=0;b.circleEnd=b.clock+rnd(2,3.2);C.pose(fig,'stand');}}}
  else{if(b.clock>(b.circleEnd||rnd(1.6,2.4))&&dd<380){b.phase=1;b.lurkEnd=b.clock+rnd(1.4,2.2);b.lurks++;halt(b);}
   else{const cur=M.angle(Tt,b),na=cur+cl(M.angleDiff((Tt.a||0)+Math.PI,cur),-1,1),R=cl(dd,mn+40,Math.max(mn+60,mx*.85));
    const g=dd>170?'walk':'stalk';head(b,cl(Tt.x+Math.cos(na)*R,BX[0],BX[1]),cl(Tt.y+Math.sin(na)*R*.8,BY[0],BY[1]),g,true);fig.pace=b.P.pace*(g==='walk'?1.3:3)*(1-.5*K.lame(b));}}}// weit weg im tiefen Schritt, nah im Schleichen
 else if(m==='feint'){// Scheinangriff (KA3b): Sprint, bricht knapp vor dem Gegner ab, faucht, weicht rückwärts zurück
  const Tt=act(b.targetId)||T,dd=dist(b,Tt);
  if(Tt.g.dead||fallen(Tt)||b.clock>b.duration){state(b,'approach');b.cool=.4;}
  else if(b.phase===0){if(dd<reachOf(b)+60+brake(b)||b.clock>2){b.phase=1;b.pc=b.clock;halt(b);C.express(fig,'snarl',t);log(b.g.name+' charges '+Tt.g.name+', stops a stride short and spits at him. He will need a moment.');}
   else head(b,Tt.x,Tt.y,dd>260?'gallop':'trot',true);}
  else if(b.phase===1){halt(b);faceTo(b,Tt);if(b.clock-b.pc>.7&&(fig.v||0)<5){b.phase=2;b.pc=b.clock;}}
  else{const l=dd||1,d2=backTo(b,cl(b.x-(Tt.x-b.x)/l*70,BX[0],BX[1]),cl(b.y-(Tt.y-b.y)/l*20,BY[0],BY[1]));if(b.clock-b.pc>1.2||d2<10){halt(b);state(b,'approach');b.cool=rnd(.6,1.2);}}}
 else if(m==='box'){halt(b);const u=b.clock/b.duration,Tt=act(b.targetId);
  if(Tt&&!Tt.g.dead)for(let k=b.ticks;k<2;k++)b.aimPts[k]=aimPoint(b,Tt,b.parts[k]);
  if(b.ticks<2&&u>=BOXHIT[b.ticks]){const i=b.ticks++;if(Tt&&!Tt.g.dead&&dist(b,Tt)<reachOf(b)+40){if(i===0)b.chk={kind:'box',T:b.aimPts[0]};const ok=strike(b,Tt,'swipe',P.swipe*.75*rnd(.85,1.15),b.parts[i]);
    if(ok&&i===1&&human(Tt)&&!Tt.g.dead&&!fallen(Tt)&&Math.random()<cl(.18+.12*P.mass/(Tt.g.weight||80),0,.6)){fell(b,Tt,'Boxed down by '+b.g.name,2.6,12);log(b.g.name+' rears up and boxes '+Tt.g.name+' into the sand with both paws.');}
    else if(ok&&i===1)log(b.g.name+' rears up and rains both paws down on '+Tt.g.name+'.');}}
  if(u>=1){state(b,'approach');b.cool=rnd(.5,1)*(b.energy<15?2:1)*(fury(b)?.75:1);}}
 else if(m==='grab'){halt(b);const u=b.clock/b.duration,Tt=act(b.targetId);
  if(Tt&&!Tt.g.dead)b.aimPts=b.parts.map(p=>aimPoint(b,Tt,p));
  if(!b.struck&&u>=.3){b.struck=true;if(Tt&&!Tt.g.dead&&human(Tt)&&!fallen(Tt)&&dist(b,Tt)<reachOf(b)+40){b.chk={kind:'grab',T:b.aimPts[0]};const ok=strike(b,Tt,'swipe',P.swipe*.4*rnd(.85,1.15),b.parts[0]);strike(b,Tt,'swipe',P.swipe*.4*rnd(.85,1.15),b.parts[1]);
    if(ok&&!Tt.g.dead){b.grabbed=Tt.id;Tt.katzeGrip=b.id;log(b.g.name+' sinks both forepaws into '+Tt.g.name+"'s shoulders and hauls him in.");}}}
  const V2=b.grabbed&&act(b.grabbed);
  if(V2&&!b.pulled){if(V2.g.dead||fallen(V2)){delete V2.katzeGrip;b.grabbed=null;}
   else{const want=b.x+C.facing(fig)*reachOf(b)*.7,k=Math.min(1,dt*5);V2.x+=(want-V2.x)*k;V2.y+=(b.y+1-V2.y)*k;V2.kx=V2.ky=0;V2.wind=0;V2.pendingStrike=null;// er wird herangezogen und kommt nicht zum Schlag
    if(u>=.72){b.pulled=true;delete V2.katzeGrip;b.grabbed=null;fell(b,V2,'Pulled down by '+b.g.name,3,0);bestSide(b,V2);b.victim=V2.id;}}}
  if(u>=1){const W=b.victim&&act(b.victim);if(W&&fallen(W)&&!W.g.dead)state(b,'pin');else{releaseVictim(b);state(b,'approach');b.cool=rnd(.4,.8);}}}
 else if(m==='dodge'||m==='recoil'){const A=act(b.from),u=b.clock/b.duration;if(fig.mode!=='stand'&&!fig.want&&!fig.jump)C.pose(fig,'stand');
  // Ausweichen: ein Sprung zurück (in der Luft wandert der Körper, die Pfoten rutschen nicht); zurückgeworfen: ein Schritt vom Angreifer weg
  if(m==='dodge'){halt(b);if(A&&u>.1&&u<.6){const away=A.x>=b.x?-1:1,l=dist(A,b)||1;b.x=cl(b.x+away*55*dt,BX[0],BX[1]);b.y=cl(b.y-(A.y-b.y)/l*12*dt,BY[0],BY[1]);}}
  else if(A&&b.clock<b.duration*.65){const away=A.x>=b.x?-1:1,tx=cl(b.x+away*40,BX[0],BX[1]);if(away===-C.facing(fig))backTo(b,tx,b.y,1.6);else head(b,tx,b.y,'walk');}else halt(b);
  if(b.clock>=b.duration){halt(b);state(b,'approach');b.cool=m==='dodge'?0:.2;}}
 animate(b,dt,t);}
function animate(b,dt,t){const fig=b.fig;over(b,t);C.step(fig,dt,t);fig._R=C.rig(fig,t);if(b.chk)contactCheck(b);// rechnet auch ohne Bild die Haltung weiter (Reihenrechnung)
 const way=Math.abs((fig.dist||0)-b.lastDist)*scaleOf(b);b.lastDist=fig.dist||0;
 if(way>0&&!b.g.dead){b.x=cl(b.x+b.dirx*way,BX[0],BX[1]);b.y=cl(b.y+b.diry*way,BY[0],BY[1]);}
 b.velocity=b.moveSpeed=dt>0?way/dt:0;b.a=C.facing(fig)>0?0:Math.PI;b.face=C.facing(fig);fig.mouthBlood=Math.max(0,(fig.mouthBlood||0)-dt*.004);}
// Prüfwert: Abstand von Pranke bzw. Maul zur Trefferstelle im Bild des Treffers, in Einheiten des Skeletts (K.contacts, für den Test)
K.contacts=[];
function contactCheck(b){const q=b.chk,R=b.fig._R;b.chk=null;if(!R||!q.T)return;const SH=b.P.SH,l=R.legs[3],paw=q.kind==='swipe'||q.kind==='box'||q.kind==='grab';
 const hs=SH.headS,ch=Math.cos(R.he),sh=Math.sin(R.he),x=paw?l.fx+MC*Math.cos(l.ang):R.hcx+(MX*ch+MY*sh)*hs,y=paw?l.fy-MC*Math.sin(l.ang):R.hcy+(-MX*sh+MY*ch)*hs;
 K.contacts.push({kind:q.kind,d:Math.hypot(x-q.T.x,y-q.T.y),tx:q.T.x,ty:q.T.y,x,y});if(K.contacts.length>200)K.contacts.shift();}
// Zielpunkte beim Halten: Würgebiss an der Kehle, eine Pranke auf der Brust; Nackenbiss etwas höher am Hals, beide Pranken auf Schulter und Rücken
function aimHold(b,T){b.aimPt=aimPoint(b,T,'neck');if(b.mode==='nape'||b.hold==='nape'&&b.mode==='rake'){b.aimPt.y-=2.5;b.aimPts=[aimPoint(b,T,'ls'),aimPoint(b,T,'chest')];}else b.aimPts=[aimPoint(b,T,'chest')];}
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
K.series=function(make,n=20,maxSeconds=K.TMAX+5){const CNT=['stalks','lurks','feints','boxes','grabs','napes','rakes','dragged','dodges','recoils','retorts'],old=S.battle,R={n,wins:[0,0],draw:0,time:0,pounces:0,landed:0,pins:0,deadCats:0,fled:0,ms:0,...Object.fromEntries(CNT.map(k=>[k,0]))},t0=performance.now();
 for(let i=0;i<n;i++){const b=K.build(make());b.time=b.startTime=0;S.battle=b;M.stains.length=0;let k=0;while(!b.ende&&k++<maxSeconds*60)fixed(1/60);
  const w=b.ende?b.ende.winner:-1;if(w<0)R.draw++;else R.wins[w]++;R.time+=b.time;for(const a of b.actors)if(a.katze){R.pounces+=a.pounces;R.landed+=a.landed;R.pins+=a.pins;for(const k of CNT)R[k]+=a[k]||0;if(a.g.dead)R.deadCats++;if(a.fled)R.fled++;}}
 R.time/=n;R.ms=performance.now()-t0;S.battle=old;return R;};
})();
