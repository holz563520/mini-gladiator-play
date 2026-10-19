'use strict';
// =====================================================================================================
// FAUSTKAMPF (Nahkampf, 1 gegen 1) · Modell, KI und Verletzungen · window.BX
// Eigenständig: liest nur den Gladiator (g.stats, g.height, g.arm, g.appearance) und die Boxwerte g.boxing.
// Schreibt nichts ins Spiel. applyAftermath() ist nur für den Generator gedacht (Goldzähne, Trainingsvorschau).
// Techniken: Gerade, Schwinger, Uppercut (selten), Block, Ausweichen – jede mit eigenem Fertigkeitswert 1–100.
// Kampf: höchstens 30 s, dann Punktentscheidung. Verletzungen meist Prellungen; Zähne können ausgeschlagen werden;
// Schädelbruch nur bei großem Kraftunterschied und sehr selten, Tod nur in seltenen Ausnahmen davon.
// =====================================================================================================
(()=>{
const BX={};
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,k)=>a+(b-a)*k;
function rng(seed){let s=(seed>>>0)||1;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
BX.rng=rng;
// Gerade, Schwinger, Uppercut sind neue Boxwerte (g.boxing). Blocken, Ausweichen und Rückwärtssprung sind die vorhandenen
// Spielwerte (g.stats.block, g.moves.dodge, g.moves.backstep) und werden im Faustkampf mit trainiert.
const SKILLS=[['gerade','Gerade','boxing','gerade'],['schwinger','Schwinger','boxing','schwinger'],['uppercut','Uppercut','boxing','uppercut'],['block','Blocken','stats','block'],['ausweichen','Ausweichen','moves','dodge'],['rueck','Rückwärtssprung','moves','backstep']];
const BOX_KEYS=['gerade','schwinger','uppercut'];
const skillValue=(g,key)=>{const d=SKILLS.find(x=>x[0]===key);return d?(g[d[2]]?.[d[3]]??20):20;};BX.skillValue=skillValue;
BX.SKILLS=SKILLS;
const TECH={
 gerade:   {label:'Gerade',   wind:.11,strike:.06,recover:.12,reach:124,cost:2.6,power:1.0, head:.72,stamina:1},
 schwinger:{label:'Schwinger',wind:.20,strike:.08,recover:.22,reach:108,cost:5.2,power:1.75,head:.66,stamina:1},
 uppercut: {label:'Uppercut', wind:.23,strike:.08,recover:.28,reach:98,cost:6.0,power:2.1, head:.88,stamina:1}};
BX.TECH=TECH;
// 15 Schwierigkeitsgrade: Stärke des Gegners als Vielfaches der eigenen (wie die Arena-Herausforderungen, feiner gestuft)
BX.LEVELS=[.30,.40,.50,.60,.70,.80,.90,1.00,1.10,1.25,1.40,1.60,1.85,2.20,2.70].map((ratio,i)=>({n:i+1,ratio,
 label:['Prügelknabe','Sehr leicht','Leicht','Leicht','Machbar','Machbar','Knapp unterlegen','Ausgeglichen','Knapp überlegen','Fordernd','Schwer','Schwer','Sehr schwer','Brutal','Mörderisch'][i],
 color:['#7fb49b','#86b896','#93bd8b','#a9c27a','#bcc373','#cfc26d','#dfb66d','#e3ab61','#e09c58','#d98a52','#d6794c','#d36646','#d05640','#c8433b','#b52f33'][i]}));
const TEETH=8;BX.TEETH=TEETH;
function ensureBoxing(g,mean=20,r=Math.random){
 const bern=m=>{let k=0;for(let i=0;i<64;i++)if(r()<clamp(m,1,98)/99)k++;return clamp(Math.round(k/64*99),1,100);};
 if(!g.boxing){g.boxing={};for(const k of BOX_KEYS)g.boxing[k]=bern(mean);}for(const k of Object.keys(g.boxing))if(!BOX_KEYS.includes(k))delete g.boxing[k];
 g.caps??={};g.caps.boxing??={};for(const k of BOX_KEYS)g.caps.boxing[k]??=clamp(Math.round(g.boxing[k]*2+bern(30)),g.boxing[k],100);
 g.moves??={};g.moves.dodge??=bern(mean);g.moves.backstep??=bern(mean);
 if(!g.teeth)g.teeth={missing:[],gold:[]};return g;}
BX.ensureBoxing=ensureBoxing;
// Kampfwert für Schwierigkeitsgrade und Wettquoten
function rating(g){const s=g.stats,v=k=>skillValue(g,k);return (s.dexterity*1.2+s.strength*1.2+s.stamina*1.0+s.reflex*.8+s.agility*.6+s.toughness*.8+v('gerade')*.9+v('schwinger')*.7+v('uppercut')*.4+v('block')*1.0+v('ausweichen')*.8+v('rueck')*.4)/9.8;}
BX.rating=rating;
// Gegner zu einem Grad: alle relevanten Werte um eigenen Wert × Faktor, Bernoulli gestreut wie im Spiel
BX.makeOpponent=function(own,level,seed,makeGladiator){
 const r=rng(seed),L=BX.LEVELS[clamp(level,1,15)-1],g=makeGladiator();const target=rating(own)*L.ratio;
 const bern=m=>{m=clamp(m,1,98);let k=0;for(let i=0;i<64;i++)if(r()<m/99)k++;return clamp(Math.round(k/64*99),1,100);};
 for(const k of ['dexterity','strength','stamina','reflex','agility','toughness','block','pain','will','balance','condition'])g.stats[k]=bern((own.stats[k]||20)*L.ratio);
 g.boxing={};for(const k of BOX_KEYS)g.boxing[k]=bern(skillValue(own,k)*L.ratio);g.moves.dodge=bern(skillValue(own,'ausweichen')*L.ratio);g.moves.backstep=bern(skillValue(own,'rueck')*L.ratio);g.teeth={missing:[],gold:[]};g.wins=L.n>=8?12:0;g.fights=L.n>=8?15:0;ensureBoxing(g);
 // Feinabgleich auf den Zielwert
 for(let n=0;n<6;n++){const f=target/Math.max(1,rating(g));if(Math.abs(f-1)<.04)break;for(const k of ['dexterity','strength','stamina','reflex','toughness'])g.stats[k]=clamp(Math.round(g.stats[k]*f),1,100);for(const k of BOX_KEYS)g.boxing[k]=clamp(Math.round(g.boxing[k]*f),1,100);for(const k of ['dodge','backstep'])g.moves[k]=clamp(Math.round(g.moves[k]*f),1,100);}
 return g;};

function makeBoxer(g,side){
 const s=k=>clamp((g.stats[k]??20)/100,0,1),b=k=>clamp(skillValue(g,k)/100,0,1);
 const tough=s('toughness');
 return {g,side,x:side?95:-95,vx:0,dir:side?-1:1,
  dex:s('dexterity'),str:s('strength'),sta:s('stamina'),ref:s('reflex'),agi:s('agility'),tough,pain:s('pain'),will:s('will'),blk:s('block'),bal:s('balance'),
  sk:{gerade:b('gerade'),schwinger:b('schwinger'),uppercut:b('uppercut'),block:b('block'),ausweichen:b('ausweichen'),rueck:b('rueck')},
  consMax:46+44*tough,cons:46+44*tough,energyMax:100,energy:100,
  state:'idle',stT:0,act:null,think:.3,guard:0,guardT:0,dodgeT:0,dodgeDir:0,stagger:0,down:0,downs:0,count:0,
  hitFlash:0,headSnap:0,bodySnap:0,lastHit:null,
  face:{eyeL:0,eyeR:0,cheek:0,nose:0,lip:0,cut:0,blood:0,ribs:0},
  teethLost:[],injuries:[],
  st:{thrown:{gerade:0,schwinger:0,uppercut:0},landed:{gerade:0,schwinger:0,uppercut:0},dmg:{gerade:0,schwinger:0,uppercut:0},blocks:0,dodges:0,backsteps:0,evaded:0,blocked:0,dodged:0,missed:0,headHits:0,bodyHits:0,knockdowns:0,points:0}};}

BX.createFight=function(gA,gB,seed=1,opts={}){
 const f={t:0,limit:opts.limit??30,r:rng(seed),seed,b:[makeBoxer(gA,0),makeBoxer(gB,1)],events:[],over:false,result:null,cheer:.2,slow:0};
 f.b[0].opp=f.b[1];f.b[1].opp=f.b[0];return f;};
const ev=(f,type,o={})=>{f.events.push({t:f.t,type,...o});};
const dist=f=>Math.abs(f.b[1].x-f.b[0].x);

function speedK(a){const e=a.energy/a.energyMax;return (.78+.42*a.dex+.12*a.sk.ausweichen)*(.62+.38*e)*(a.cons<a.consMax*.35?.82:1);}
function startAttack(f,a,kind){
 const T=TECH[kind],sp=speedK(a)*(.9+.3*a.sk[kind]);a.state='wind';a.act={kind,hand:kind==='gerade'?(f.r()<.68?'lead':'rear'):kind==='schwinger'?(f.r()<.5?'lead':'rear'):(f.r()<.7?'rear':'lead'),wind:T.wind/sp,strike:T.strike/sp,recover:T.recover/(sp*.9+.1),hit:false};a.stT=0;
 a.energy=Math.max(0,a.energy-T.cost*(1.15-.5*a.sta));a.st.thrown[kind]++;ev(f,'throw',{who:a.side,kind});
 // Gegner sieht den Schlag kommen: rechtzeitig Deckung hoch oder ausweichen (Reflex + Fertigkeit)
 const d=a.opp;if(d.state==='idle'||d.state==='step'||d.state==='recover'&&f.r()<.6){const see=(.40+.5*d.ref+.22*d.sk.block+.18*d.sk.ausweichen-.18*a.dex-(kind==='uppercut'?.08:0))*(.55+.45*d.energy/d.energyMax);
  if(f.r()<see){const wb=.32+d.sk.block*1.3,wd=.34+d.sk.ausweichen*1.3+d.agi*.5,wr=.2+d.sk.rueck*1.1+d.agi*.3,x=f.r()*(wb+wd+wr);
   if(x<wb){d.state='block';d.stT=0;d.guardT=.32+.3*f.r();}
   else if(x<wb+wd){d.state='dodge';d.stT=0;d.dodgeT=.36;d.st.dodgeTries=(d.st.dodgeTries||0)+1;d.dodgeDir=kind==='schwinger'?(f.r()<.8?-1:1):kind==='uppercut'?1:(f.r()<.6?1:-1);ev(f,'evadeStart',{who:d.side,how:d.dodgeDir<0?'duck':'slip'});}
   else startBackstep(f,d);}}
}
function startBackstep(f,d){d.state='backstep';d.stT=0;d.vx=-d.dir*(230+170*d.sk.rueck+60*d.agi)*speedK(d);d.st.backsteps++;d.energy=Math.max(0,d.energy-1.5);ev(f,'backstep',{who:d.side});}
function think(f,a){
 const d=a.opp,D=dist(f),e=a.energy/a.energyMax,r=f.r;
 a.think=(.20-.09*a.dex-.04*a.ref)*(1.25-.35*e)+r()*.12;
 const want=a.cons<a.consMax*.3&&e<.3?130:112;
 if(D>TECH.gerade.reach+8){a.state='step';a.vx=a.dir*(150+110*a.agi)*speedK(a);a.queued=f.r()<.55?'gerade':null;a.stT=0;return;}
 if(d.down)return;
 // erschöpft: zurückweichen, Deckung
 if(e<.18&&r()<.55){if(r()<.5){a.state='block';a.stT=0;a.guardT=.45;}else{a.state='step';a.vx=-a.dir*(70+60*a.agi);a.stT=0;}return;}
 // Gegner taumelt → nachsetzen
 const press=d.stagger>0||d.state==='recover';
 const attackP=clamp(.66+.25*(a.g.stats.aggression||25)/100+(press?.3:0)-(d.state==='block'?.15:0),.2,.95);
 if(r()<attackP){
  const close=D<102,mid=D<116;
  let w={gerade:(mid&&!close?1.9:1.0)*(.6+a.sk.gerade),schwinger:(mid?1.0:.25)*(.45+a.sk.schwinger)*(close?1.2:1),uppercut:(close?.42:mid?.08:0)*(.3+a.sk.uppercut)};
  if(press){w.schwinger*=1.4;w.uppercut*=1.6;}
  const need={gerade:TECH.gerade.reach,schwinger:TECH.schwinger.reach,uppercut:TECH.uppercut.reach};
  const sum=w.gerade+w.schwinger+w.uppercut;let x=r()*sum,kind='gerade';for(const k of ['gerade','schwinger','uppercut']){if((x-=w[k])<=0){kind=k;break;}}
  if(D>need[kind]+4){a.state='step';a.vx=a.dir*(150+100*a.agi)*speedK(a);a.stT=0;a.queued=kind;return;}
  startAttack(f,a,kind);return;}
 // sonst: Abstand regeln oder Deckung halten
 if(D<want-18&&r()<.6){if(r()<.25+.5*a.sk.rueck)startBackstep(f,a);else{a.state='step';a.vx=-a.dir*(60+60*a.agi);a.stT=0;}}
 else if(r()<.25+.25*a.sk.block){a.state='block';a.stT=0;a.guardT=.25+.25*r();}
 else{a.state='step';a.vx=a.dir*(40+50*a.agi)*(r()<.5?1:-1);a.stT=0;}
}
function power(a,kind){const T=TECH[kind],e=a.energy/a.energyMax;return 5.4*(.55+1.5*a.str)*T.power*(.62+.38*e)*(.8+.4*a.sk[kind])*(a.cons<a.consMax*.3?.8:1);}
function addInjury(f,d,type,part,sev,extra={}){const i={type,part,sev:Math.round(sev*10)/10,t:Math.round(f.t*10)/10,...extra};d.injuries.push(i);ev(f,'injury',{who:d.side,...i});}
function impact(f,a){
 const d=a.opp,kind=a.act.kind,T=TECH[kind],r=f.r;a.act.hit=true;
 if(dist(f)>T.reach+10||d.down){a.st.missed++;if(!d.down&&(d.state==='backstep'||d.lastBack>f.t-.5)){d.st.evaded++;ev(f,'evade',{who:d.side,kind});f.cheer=Math.min(1,f.cheer+.06);}else ev(f,'miss',{who:a.side,kind});a.energy=Math.max(0,a.energy-1.5);return;}
 // Ausweichen (aktiv)
 if(d.state==='dodge'){const p=clamp(.30+.5*d.sk.ausweichen+.25*d.ref+.15*d.agi-.25*a.dex-.12*a.sk[kind]+(kind==='schwinger'&&d.dodgeDir<0?.12:0)+(kind==='gerade'&&d.dodgeDir>0?.08:0),.08,.9);
  if(r()<p){d.st.dodges++;a.st.dodged++;ev(f,'dodge',{who:d.side,kind,how:d.dodgeDir<0?'duck':'slip'});f.cheer=Math.min(1,f.cheer+.08);return;}}
 // Block
 let blocked=false;if(d.state==='block'||d.state==='idle'&&r()<.22+.3*d.sk.block){
  const p=clamp(.34+.45*d.sk.block+.2*d.blk+.12*d.ref-(kind==='uppercut'?.22:kind==='schwinger'?.08:0)-.18*a.str*T.power/1.5,.06,.9)*(.55+.45*d.energy/d.energyMax);
  if(r()<p)blocked=true;}
 let P=power(a,kind);
 if(blocked){d.st.blocks++;a.st.blocked++;d.energy=Math.max(0,d.energy-P*.9);d.cons-=P*.08;d.bodySnap=.12;ev(f,'block',{who:d.side,kind,power:P});return;}
 // Treffergenauigkeit
 const acc=clamp(.58+.3*a.sk[kind]+.18*a.dex-.14*d.agi-.1*d.sk.ausweichen-(d.state==='step'?.05:0)+(d.stagger>0?.25:0),.22,.97);
 if(r()>acc){a.st.missed++;a.energy=Math.max(0,a.energy-1.2);
  // Daneben: steht der Verteidiger frei, ist das sichtbar sein Ausweichen (Wegducken unter Schwingern, Kopf aus der Linie bei Geraden)
  if(['idle','step','recover'].includes(d.state)&&r()<.55+.4*d.sk.ausweichen){d.state='dodge';d.stT=.08;d.dodgeT=.32;d.dodgeDir=kind==='schwinger'?-1:kind==='uppercut'?1:(r()<.65?1:-1);d.st.dodges++;a.st.dodged++;ev(f,'dodge',{who:d.side,kind,how:d.dodgeDir<0?'duck':'slip'});f.cheer=Math.min(1,f.cheer+.05);}
  else ev(f,'miss',{who:a.side,kind});return;}
 const head=r()<T.head,crit=r()<.06+.12*a.sk[kind]+(kind==='uppercut'?.08:0);if(crit)P*=1.55;
 a.st.landed[kind]++;a.st.dmg[kind]+=P;a.st.points+=P;
 if(head){a.st.headHits++;const k=P*(1.15-.55*d.tough);d.cons-=k*(kind==='uppercut'?1.25:1);d.headSnap=kind==='uppercut'?-1:1;
  // Prellungen im Gesicht
  const side=a.side?'eyeL':'eyeR';const fz=d.face;
  if(kind==='gerade'){fz.nose+=P*.05;fz[side]+=P*.03;}else if(kind==='schwinger'){fz.cheek+=P*.05;fz[side]+=P*.05;}else{fz.lip+=P*.05;fz.cheek+=P*.02;}
  for(const k of Object.keys(fz))fz[k]=Math.min(1.6,fz[k]);
  if(P>5&&r()<.2*(P/8)){fz.cut=Math.min(1.5,fz.cut+.6);fz.blood+=.5;addInjury(f,d,'Platzwunde','Augenbraue',P/6);}
  if(kind==='gerade'&&P>7&&r()<.025*(P/8)){addInjury(f,d,'Nasenbruch','Nase',P/6);fz.nose=1.6;fz.blood+=1;}
  // Zahn ausgeschlagen: harte Treffer auf den Mund (Schwinger, Uppercut)
  if(P>(kind==='gerade'?6.5:4.8)&&r()<(kind==='gerade'?.06:.15)*Math.pow(P/7,2)){const left=[...Array(TEETH).keys()].filter(i=>!d.teethLost.includes(i)&&!(d.g.teeth?.missing||[]).includes(i)&&!(d.g.teeth?.gold||[]).includes(i));if(left.length){const front=left.filter(i=>i>=2&&i<=5),pool=front.length&&r()<.75?front:left,i=pool[Math.floor(r()*pool.length)];d.teethLost.push(i);fz.lip=Math.min(1.6,fz.lip+.5);fz.blood+=.6;addInjury(f,d,'Zahn ausgeschlagen','Mund',1,{tooth:i});ev(f,'tooth',{who:d.side,tooth:i});}}
  // Schädelbruch: nur wenn der Schläger viel stärker ist als der Getroffene zäh ist, und nur bei schweren Treffern
  // Kraftverhältnis Schläger : Widerstand des Getroffenen (Härte und Kraft). Etwa gleich stark: so gut wie nie; deutlich stärker: sehr wahrscheinlich.
  const resist=.5*d.tough+.5*d.str,q=(a.str+.04)/(resist+.04),prS=q>1.35?Math.min(.9,Math.pow((q-1.35)/1.0,1.3)*.5):.0003*q;
  if(kind!=='gerade'&&P>7&&r()<prS*(P/10)){addInjury(f,d,'Schädelbruch','Kopf',3);d.cons=Math.min(d.cons,0);d.skull=true;
   if(r()<.01+.015*Math.max(0,q-2))d.dead=true;}
  if(P>5)addInjury(f,d,'Prellung',kind==='uppercut'?'Kinn':kind==='schwinger'?'Wange':'Gesicht',P/6);
 }else{a.st.bodyHits++;d.energy=Math.max(0,d.energy-P*1.7);d.cons-=P*.28;d.bodySnap=.25;d.face.ribs=Math.min(1.6,d.face.ribs+P*.04);
  if(P>6&&r()<.04*(P/8))addInjury(f,d,'Rippenprellung','Rippen',P/6);else if(P>4)addInjury(f,d,'Prellung','Rumpf',P/8);}
 d.hitFlash=.18;d.lastHit={kind,head,crit,P};const ko=d.cons<=0||(head&&d.cons<d.consMax*.28&&P>6&&r()<.30+P*.025);ev(f,'hit',{who:a.side,kind,head,crit,power:P,ko,skull:!!d.skull&&!d.skullEv});if(d.skull)d.skullEv=true;
 f.cheer=Math.min(1,f.cheer+(P>7?.35:.14));
 if(d.state==='wind'&&r()<.5+P*.04){d.state='stagger';d.stagger=.18;ev(f,'interrupt',{who:d.side});}
 // Taumeln und Niederschlag
 if(P>7.5&&head&&r()<.35+P*.03){d.stagger=.45+P*.03;d.state='stagger';d.stT=0;}
 if(ko){knockDown(f,d);}
}
function knockDown(f,d){d.state='down';d.down=1;d.stT=0;d.downs++;d.opp.st.knockdowns++;d.opp.st.points+=12;d.count=0;d.stagger=0;f.cheer=1;f.slow=.6;ev(f,'down',{who:d.side});
 // Wer am Boden liegt, hat verloren: kein Aufstehen, der Kampf ist aus.
 d.willRise=false;d.downDur=2.6;}
function end(f,winner,how){if(f.over)return;f.over=true;const [A,B]=f.b;f.result={winner,how,time:Math.round(f.t*10)/10,
 points:[Math.round(A.st.points),Math.round(B.st.points)],stats:f.b.map(b=>b.st),injuries:f.b.map(b=>b.injuries),teeth:f.b.map(b=>[...b.teethLost]),skull:f.b.map(b=>!!b.skull),dead:f.b.map(b=>!!b.dead)};
 ev(f,'end',{winner,how});f.cheer=1;}
BX.step=function(f,dt){
 if(f.over){f.t+=dt;f.cheer=Math.max(.35,f.cheer-dt*.2);for(const a of f.b)tickVisual(a,dt);return;}
 f.t+=dt;f.cheer=Math.max(.15,f.cheer-dt*.25);f.slow=Math.max(0,f.slow-dt);
 for(const a of f.b){
  const T=a.act&&TECH[a.act.kind];a.stT+=dt;tickVisual(a,dt);
  a.energy=Math.min(a.energyMax,a.energy+dt*(4.5+7*a.sta)*(a.state==='block'||a.state==='step'?.8:1));
  if(a.cons<a.consMax&&!a.down)a.cons=Math.min(a.consMax,a.cons+dt*(.2+.6*a.tough));
  if(a.state==='down'){if(a.stT>=(a.skull?5.4:a.downDur)){if(a.willRise){a.state='idle';a.down=0;a.cons=Math.max(a.cons,a.consMax*.32);a.energy=Math.max(a.energy,40);ev(f,'rise',{who:a.side});a.think=.5;}else{end(f,a.opp.side,a.dead?'Tod':a.skull?'Schädelbruch':'K.O.');return;}}continue;}
  if(a.stagger>0){a.stagger-=dt;a.vx=-a.dir*35;if(a.stagger<=0){a.state='idle';a.think=.08;}}
  if(a.state==='wind'&&a.stT>=a.act.wind){a.state='strike';a.stT=0;}
  else if(a.state==='strike'){if(!a.act.hit&&a.stT>=a.act.strike*.5)impact(f,a);if(f.over)return;if(a.state==='strike'&&a.stT>=a.act.strike){a.state='recover';a.stT=0;}}
  else if(a.state==='recover'&&a.stT>=a.act.recover){a.state='idle';a.act=null;a.think=Math.min(a.think,.12);}
  else if(a.state==='block'&&a.stT>=a.guardT){a.state='idle';}
  else if(a.state==='dodge'&&a.stT>=a.dodgeT){a.state='idle';}
  else if(a.state==='backstep'&&a.stT>=.2){a.state='idle';a.vx=0;a.lastBack=f.t;a.think=Math.min(a.think,.1);}
  else if(a.state==='step'&&a.stT>=.22){a.state='idle';a.vx=0;if(a.queued&&dist(f)<=TECH[a.queued].reach+4){startAttack(f,a,a.queued);}a.queued=null;}
  if(a.state==='idle'){a.vx*=.8;a.think-=dt;if(a.think<=0)think(f,a);}
  // Bewegung
  a.x+=a.vx*dt;if(a.state==='strike'&&T)a.x+=a.dir*dt*(a.act.kind==='gerade'?90:50);
 }
 // Abstand halten: nicht durcheinander laufen, Ring begrenzen
 const [A,B]=f.b;const minD=92;if(B.x-A.x<minD){const m=(A.x+B.x)/2;A.x=m-minD/2;B.x=m+minD/2;}
 for(const a of f.b)a.x=clamp(a.x,-230,230);
 if(f.t>=f.limit&&!f.b.some(b=>b.down)){const [p0,p1]=[A.st.points,B.st.points];end(f,Math.abs(p0-p1)<4?-1:p0>p1?0:1,Math.abs(p0-p1)<4?'Unentschieden':'Punktsieg');}
};
function tickVisual(a,dt){a.hitFlash=Math.max(0,a.hitFlash-dt);a.headSnap*=Math.pow(.02,dt);a.bodySnap=Math.max(0,a.bodySnap-dt);for(const k of ['blood'])a.face[k]=Math.max(0,a.face[k]-dt*.05);}
BX.simulate=function(gA,gB,seed,opts){const f=BX.createFight(gA,gB,seed,opts);let n=0;while(!f.over&&n<60*120){BX.step(f,1/60);n++;}return f;};
// Nach dem Kampf: ausgeschlagene Zähne werden durch Goldzähne ersetzt; Trainingswirkung als Vorschlag
// Nach dem Kampf: ausgeschlagene Zähne werden durch Goldzähne ersetzt; Training durch die tatsächlichen Aktionen.
// learn(g,gruppe,schlüssel,menge) → tatsächlicher Zuwachs (im Generator M.addLearning: hält die persönliche Obergrenze g.caps ein).
// Lernrate wie im Spiel (data.js learn): 2 × (0,7 + Potenzial/150), abnehmend je näher an der Obergrenze.
BX.TRAIN_KEYS=[['stats','dexterity','Geschick'],['stats','agility','Schnelligkeit'],['stats','toughness','Zähigkeit'],['stats','strength','Kraft'],['stats','stamina','Ausdauer'],['stats','reflex','Reflex'],['boxing','gerade','Gerade'],['boxing','schwinger','Schwinger'],['boxing','uppercut','Uppercut'],['stats','block','Blocken'],['moves','dodge','Ausweichen'],['moves','backstep','Rückwärtssprung']];
// Veteran: erfahrener Kämpfer (Maßstab wie die Ruhmeshalle: ab 10 Siegen, 6 Tötungen oder 15 Kämpfen). Veteranen bekommen für ausgeschlagene Zähne Goldzähne, alle anderen behalten Lücken.
const GOLD_DAYS=10;BX.GOLD_DAYS=GOLD_DAYS;
// Zeit vergeht: bei Veteranen werden nach 10 Tagen die Lücken durch Goldzähne ersetzt (vorher bleibt die Lücke sichtbar).
BX.advanceDays=function(g,days){const T=g.teeth;if(!T?.pending?.length)return 0;let n=0;const keep=[];for(const p of T.pending){p.days-=days;if(p.days<=0){T.missing=(T.missing||[]).filter(i=>i!==p.i);T.gold=[...new Set([...(T.gold||[]),p.i])];n++;}else keep.push(p);}T.pending=keep;return n;};
BX.isVeteran=g=>(g.wins||0)>=10||(g.kills||0)>=6||(g.fights||0)>=15;
BX.applyAftermath=function(f,{apply=true,learn=null,potentialRate=true}={}){
 const out=[];for(const b of f.b){const g=b.g;g.teeth??={missing:[],gold:[]};const vet=BX.isVeteran(g);let miss=[...new Set([...(g.teeth.missing||[]),...b.teethLost])],gold=[...(g.teeth.gold||[])],pend=[...(g.teeth.pending||[])];if(vet)for(const i of miss)if(!pend.some(p=>p.i===i))pend.push({i,days:GOLD_DAYS});
  const used=b.st.thrown,tot=used.gerade+used.schwinger+used.uppercut,secs=Math.min(30,f.t)/30;
  const op=f.b[b===f.b[0]?1:0].st,got=(op.headHits||0)+(op.bodyHits||0);
  const amount={'stats:toughness':.03*secs+.035*got,'stats:agility':.07*secs+.02*(b.st.dodges+b.st.evaded)+.005*tot,'stats:dexterity':.10*secs+.006*tot,'stats:strength':.06*secs+.02*(b.st.landed.schwinger+b.st.landed.uppercut),'stats:stamina':.16*secs+.004*tot,'stats:reflex':.02*(b.st.blocks+b.st.dodges+b.st.evaded),
   'boxing:gerade':.035*used.gerade,'boxing:schwinger':.05*used.schwinger,'boxing:uppercut':.07*used.uppercut,'stats:block':.05*b.st.blocks+.01*b.st.blocked,'moves:dodge':.06*b.st.dodges+.02*Math.max(0,b.st.dodgeTries||0),'moves:backstep':.05*b.st.backsteps+.04*b.st.evaded};
  const gain={};
  for(const [path,a] of Object.entries(amount)){if(!(a>0))continue;const [grp,key]=path.split(':'),cap=g.caps?.[grp]?.[key]??100,v=g[grp]?.[key]??0;
   const rate=2*(.7+(g.potential??50)/150)*(.08+.92*Math.pow(Math.max(0,(cap-v)/Math.max(1,cap)),.65));let real=a*rate;
   if(apply){if(learn)real=learn(g,grp,key,real);else{const nv=Math.min(cap,v+real);real=Math.max(0,nv-v);if(g[grp])g[grp][key]=nv;}}
   gain[path]=Math.round(real*100)/100;}
  if(apply){g.teeth={missing:miss,gold,pending:pend};}out.push({gold:b.teethLost.length,vet,gain});}
 return out;};
window.BX=BX;
})();
