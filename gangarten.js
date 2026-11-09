'use strict';
// =====================================================================================================
// GANGARTEN (gangarten.js) · M.gait · Testmodul für den Gang-Editor (gang-editor.html)
// Gehen, Kampfschritt, Laufen, Sprinten, Seitschritt, Rückwärts – jede Gangart mit eigenem Tempo,
// eigener Schrittfrequenz, Körperhaltung und Armhaltung. Tempo baut sich auf (Anlauf) und ab (Abbremsen),
// scharfe Richtungswechsel kosten Tempo. Humpeln und Erschöpfung begrenzen die Gangart.
//
// Im Spiel NICHT geladen. Haken in sim.js (updateActor, updateLocomotion) und arena.js (gaitArms,
// drawGladiatorBody) prüfen M.gait?.active bzw. a.gaitW und sind ohne dieses Modul wirkungslos.
// Nur der Gang-Editor setzt M.gait.active = true. Keine Zufallszahlen, kein Speichern.
// =====================================================================================================
(()=>{
const M=window.MG,TAU=Math.PI*2,cl=(x,a,b)=>Math.max(a,Math.min(b,x)),ad=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const MODES=['stand','walk','guard','jog','sprint','side','back'];
const NAME={charge:'Ansturm',stand:'Stehen',walk:'Gehen',guard:'Kampfschritt',jog:'Laufen',sprint:'Sprinten',side:'Seitschritt',back:'Rückwärts'};
const COLOR={charge:'#ff4a3a',stand:'#8a8f86',walk:'#7fb3d5',guard:'#9fd08a',jog:'#dfb66d',sprint:'#e0703f',side:'#b48ad8',back:'#5fc4b8'};
// Stellgrößen (im Editor verstellbar). Tempo als Anteil des bisherigen Lauftempos des Kämpfers.
const DEF={
 walk:.42,guard:.58,jog:1,sprint:1.45,side:.5,back:.62,backFar:.85,
 acc:165,accSprint:.55,dec:2.2,turnSlow:11,turnFast:3,reverseBrake:1.4,
 sprintGap:200,jogGap:70,hold:.35,
 tiredNoSprint:.3,tiredWalk:.12,legsNoSprint:.72,legsWalk:.45,
 // Schrittfrequenz (Doppelschritte je Sekunde) je Gangart
 cWalk:.95,cGuard:1.1,cJog:1.5,cSprint:1.95,cSide:1.25,cBack:1.15,
 // Ansturm und Angriff im Lauf (Vorschlag, nicht freigegeben)
 runAttack:1,runHit:.3,chargeDmg:1.5,ramCharge:.32,ramRun:.15,cryDist:260
};
const P={...DEF};
const G=M.gait={active:false,P,DEF,MODES,NAME,COLOR};

function weightsOf(a){return a.gaitW||(a.gaitW={stand:1,walk:0,guard:0,jog:0,sprint:0,side:0,back:0});}
function blendTo(a,mode,dt,rate=7){const W=weightsOf(a),k=1-Math.exp(-rate*dt);let sum=0;for(const m of MODES){W[m]+=((m===mode?1:0)-W[m])*k;sum+=W[m];}for(const m of MODES)W[m]/=sum||1;}
function factor(mode,far){return mode==='stand'?0:mode==='back'?(far?P.backFar:P.back):P[mode];}
function accelOf(a,ef){const g=a.g,legs=cl(ef?.legs??1,0,1),metal=(M.armorItems?.(g)||[]).some(i=>i.material==='metal');return P.acc*(.55+.45*legs)*(.82+.0035*(g.stats?.agility??50))*(metal?.86:1);}
// Grenzen durch Zustand: erschöpft → kein Sprint, ganz erschöpft oder Beine kaputt → nur noch Gehen
function capMode(a,mode,ef){const tired=(a.energy??100)/Math.max(1,ef?.maxEnergy??100),ls=M.limbState?.(a.g),hurt=Math.max(M.legImpairment?.(a.g,'l')||0,M.legImpairment?.(a.g,'r')||0),legs=ls&&(ls.fracturedLeg||ls.lostLeg||ls.lostFoot)?0:Math.min(ef?.legs??1,1-hurt*.65);
 if(mode==='sprint'&&(tired<P.tiredNoSprint||legs<P.legsNoSprint||a.block))mode='jog';
 if((mode==='jog'||mode==='sprint')&&(tired<P.tiredWalk||legs<P.legsWalk))mode='walk';
 return mode;}
// Gemeinsame Bewegungsphysik: Tempo v gleitet zum Wunschtempo, Richtung dreht je nach Tempo träge
function physics(a,mode,dirWanted,base,ef,dt,cap=Infinity){
 a.gv=a.gv||0;const A=accelOf(a,ef),want=Math.min(cap,base*factor(mode,a.gaitFar));
 if(dirWanted!=null){a.gdir??=dirWanted;const diff=ad(dirWanted,a.gdir),fast=cl(a.gv/Math.max(1,base*1.3),0,1),tr=(P.turnSlow+(P.turnFast-P.turnSlow)*fast)*dt;
  if(Math.abs(diff)>1.9&&a.gv>base*.35){a.gv=Math.max(0,a.gv-A*P.dec*P.reverseBrake*dt);if(a.gv<base*.35)a.gdir=dirWanted;}// Umkehren: erst abbremsen, dann umdrehen
  else a.gdir+=cl(diff,-tr,tr);
  const turnCost=cl((Math.abs(diff)-.5)/1.5,0,1)*.45;// enger Bogen kostet Tempo
  const wantNow=want*(1-turnCost*fast);
  if(a.gv<wantNow)a.gv=Math.min(wantNow,a.gv+A*(a.gv>base*1.02?P.accSprint:1)*dt);else a.gv=Math.max(wantNow,a.gv-A*P.dec*dt);}
 else a.gv=Math.max(0,a.gv-A*P.dec*dt);
 a.gaitAcc=A;return a.gv;}
function nearestFoe(a){const b=M.s.battle;let best=Infinity;if(!b)return best;for(const o of b.actors)if(o.team!==a.team&&!o.down&&!o.g.dead){const d=Math.hypot(o.x-a.x,o.y-a.y);if(d<best)best=d;}return best;}
function combatNear(a,dt){const d=nearestFoe(a),c=d<230?1:d>380?0:1-(d-230)/150;a.gaitC=(a.gaitC??c)+(c-(a.gaitC??c))*(1-Math.exp(-4*dt));}

const ev=(kind,a,extra)=>{try{G.onEvent?.({kind,a,...extra});}catch{}};
const pitch=a=>M.voicePitch?.(a.g)??1;
// Kampfschrei: wer mit der Waffe auf seinen Gegner zusprintet, hebt die Waffe und schreit (einmal je Ansturm)
function rushCry(a,o,mode,dt){
 const w=M.weapon(a),melee=!o.isRanged&&!w.ammo,running=(mode==='sprint'||mode==='jog'&&(a.cried||a.gaitW?.sprint>.3))&&(a.gv||0)>(a.gaitBase||80)*.85,want=(running&&melee&&o.target&&!o.target.down&&o.d-o.keep<P.cryDist)?1:0;
 a.gaitRush=(a.gaitRush||0)+(want-(a.gaitRush||0))*(1-Math.exp(-(want?5:3)*dt));
 if(want&&a.gaitRush>.5&&!a.cried){a.cried=true;a.shoutTimer=.8;M.voice?.('battlecry',pitch(a),true);M.floater?.(a.x,a.y-62,w.id==='fist'?'HAAA!':'KAMPFSCHREI!','#f1cb7c');ev('cry',a);}
 if(!o.target||o.d-o.keep>P.cryDist+160)a.cried=false;}
// Ausholen im Lauf: rechtzeitig vor der Schlagdistanz ausholen, im Lauf weiter heran, der Schlag landet bei der Ankunft
function runAttack(a,o,base){
 const t=o.target,w=M.weapon(a);if(!P.runAttack||!t||t.down||t.g.dead||t.surrendered||o.isRanged||w.ammo||o.flank||a.block||a.retreat>0||a.cool>0||a.energy<18||a.state!=='move'||a.netTimer>0)return false;
 if((a.gv||0)<base*.6||Math.abs(ad(Math.atan2(t.y-a.y,t.x-a.x),a.a))>.6)return false;
 const reach=o.ef.range+t.r,wind=(M.meleeTiming?.(a.g,w,'slash')?.wind||.3)*1.1,lead=a.gv*wind*.85;
 if(!(o.d>reach-2&&o.d<reach+lead+6))return false;
 M.beginAttack(a,t);if(!(a.wind>0)||['kick','shieldBash','groundFinish'].includes(a.technique))return true;
 const k=cl((a.gv/base-.6)/.85,0,1);a.runAttack={v:a.gv,base,target:t.id};a.chargeBoost=Math.max(a.chargeBoost||0,1+P.runHit*k);
 if(a.gv>base*1.15)a.rushHit={t:M.s.battle.time,v:a.gv,base,kind:'run'};ev('runAttack',a,{v:a.gv,boost:a.chargeBoost,tech:a.technique});return true;}
G.windMove=(a,dt,ef)=>{
 const r=a.runAttack;if(!r)return;const t=M.s.battle.actors.find(x=>x.id===r.target);if(!t||t.g.dead||t.down){a.runAttack=null;return;}
 const d=Math.hypot(t.x-a.x,t.y-a.y),contact=ef.range+t.r-3,dir=Math.atan2(t.y-a.y,t.x-a.x),A=accelOf(a,ef);
 a.gv=Math.max(r.base*P.guard,(a.gv||r.v)-A*P.dec*.5*dt);const step=Math.min(a.gv*dt,Math.max(0,d-contact));
 if(step>0){a.x+=Math.cos(dir)*step;a.y+=Math.sin(dir)*step;if(M.roundField?.())M.fieldPt?.(a,a.r||14);}
 a.a+=cl(ad(dir,a.a),-6*dt,6*dt);if(a.wind<=dt)a.runAttack=null;};
// Ansturm (Soldaten): deutlich mehr Wucht, kann umrennen
G.rush=(a,t)=>{a.chargeBoost=P.chargeDmg+(a.g.moves?.charge||0)*.003;a.rushHit={t:M.s.battle.time,v:a.gv||0,base:a.gaitBase||M.effective(a).speed,kind:'charge'};a.cried=true;ev('charge',a,{boost:a.chargeBoost});};
// Umrennen: nur bei echtem Treffer (nicht geblockt) kurz nach Ansturm/Sprint-Angriff
G.ram=(a,b,dmg,mult=1)=>{
 const r=a.rushHit;if(!G.active||!r||!b||b.g.dead)return;a.rushHit=null;if(M.s.battle.time-r.t>1.6)return;
 const sk=cl(r.v/Math.max(1,r.base),0,2.2),ga=a.g,gb=b.g,shield=!!M.usableShield?.(b);
 const chance=cl((r.kind==='charge'?P.ramCharge:P.ramRun)+((ga.weight||80)-(gb.weight||80))*.006+((ga.stats.strength||50)-(gb.stats.strength||50))*.004+(sk-1)*.12-((gb.stats.balance??50)-50)*.004-(shield?.08:0),.04,.85)*mult;
 const ang=Math.atan2(b.y-a.y,b.x-a.x),roll=M.rng();
 b.kx=(b.kx||0)+Math.cos(ang)*(roll<chance?170:95);b.ky=(b.ky||0)+Math.sin(ang)*(roll<chance?170:95);
 if(roll<chance&&M.knockdown(b,'Umgerannt',2.6)){M.floater?.(b.x,b.y-62,'UMGERANNT!','#ff8a5a');M.shake=Math.max(M.shake||0,5);M.sound?.('fall');ev('ram',a,{b,chance});}
 else ev('shove',a,{b,chance});};
// geblockter Ansturm: mit voller Wucht in die Deckung – kann trotzdem umwerfen (60 % der Chance), sonst zurückgestoßen
G.blocked=ev=>{if(ev?.kind==='block'&&ev.att?.rushHit?.kind==='charge')G.ram(ev.att,ev.def,0,.6);};
{const R=M.combatResponses;if(R?.impact&&!R.__gait){const orig=R.impact;R.impact=(a,b,d,p,w,part)=>{const out=orig.call(R,a,b,d,p,w,part);if(G.active&&!p)G.ram(a,b,d);return out;};R.__gait=true;}}

// --------------------------------------------------------------- KI-Haken (sim.js updateActor)
G.drive=(a,o)=>{
 if(!G.active||a.gaitOff)return null;
 const T=M.T,b=M.s.battle,t=b?.time||0,dt=o.dt;
 if(a.gaitT==null||t-a.gaitT>.15){a.gv=0;a.gdir=undefined;}// nach Schlag/Taumeln/Ausweichen: aus dem Stand
 a.gaitT=t;
 a.runAttack=null;const base=o.speed/(a.sprinting?T.sprintMult:1),l=Math.hypot(o.vx,o.vy),gap=o.d-o.keep;
 let mode;
 if(l<.05)mode='stand';
 else if(a.state==='circle')mode='side';
 else if(a.state==='retreat'){mode='back';a.gaitFar=o.d>o.keep+90;}
 else if(a.state==='flank')mode=gap>P.sprintGap+60?'sprint':'jog';
 else if(o.hunt)mode=gap>140?'sprint':'jog';
 else if(a.state==='move'){mode=gap>P.sprintGap?'sprint':gap>P.jogGap?'jog':'guard';/* wer im Lauf zuschlagen kann, läuft durch bis zum Ausholen */if(mode==='guard'&&P.runAttack&&!(a.cool>0)&&a.energy>=18&&!o.flank&&!o.isRanged&&(a.gv||0)>base*.6&&o.target&&!o.target.down)mode=a.gaitMode==='sprint'?'sprint':'jog';}
 else mode='jog';
 mode=capMode(a,mode,o.ef);
 // kurze Haltezeit gegen Flackern zwischen Gangarten (Stehen/Umschalten in langsamere Gangart sofort)
 const order={stand:0,walk:1,guard:1,side:1,back:1,jog:2,sprint:3};
 if(a.gaitMode&&mode!==a.gaitMode&&order[mode]>order[a.gaitMode]&&t-(a.gaitSince||0)<P.hold)mode=a.gaitMode;
 if(mode!==a.gaitMode){a.gaitMode=mode;a.gaitSince=t;}
 // vorausschauend abbremsen: höchstens so schnell, dass man bis zur Schlagdistanz auf Kampfschritt herunterkommt
 const swingReady=P.runAttack&&!(a.cool>0)&&a.energy>=18&&!o.flank;// wer zuschlagen kann, bremst nicht ab, sondern holt im Lauf aus
 const cap=a.state==='move'&&!o.hunt&&!o.isRanged&&!swingReady?base*P.guard+Math.sqrt(2*accelOf(a,o.ef)*P.dec*Math.max(0,gap)):Infinity;
 const v=physics(a,mode,l>=.05?Math.atan2(o.vy,o.vx):null,base,o.ef,dt,cap);
 // Sprint kostet Ausdauer nur, wenn wirklich gesprintet wird (Spiel: dt*3)
 const mySprint=mode==='sprint'&&v>base*1.05;if(a.sprinting&&!mySprint)a.energy+=dt*3;else if(!a.sprinting&&mySprint)a.energy=Math.max(0,a.energy-dt*3);a.sprinting=mySprint;
 a.gaitBase=base;combatNear(a,dt);rushCry(a,o,mode,dt);
 if(runAttack(a,o,base))return {speed:0,vx:0,vy:0};blendTo(a,v<3&&mode==='stand'?'stand':mode==='stand'?(a.gaitW?.sprint>.4?'jog':'walk'):mode,dt);
 if(v<.5)return {speed:0,vx:0,vy:0};
 if(l<.05&&!['move','circle','retreat','flank'].includes(a.state))a.state='move';// Auslaufen
 return {speed:v,vx:Math.cos(a.gdir),vy:Math.sin(a.gdir)};
};

// Ansturm (sim.js, Spiel-eigene Bewegung): kein Sprung auf volles Tempo, sondern explosiver Antritt aus dem aktuellen Lauf
G.charge=(a,speed,ef,dt)=>{
 if(!G.active||a.gaitOff)return speed;const t=M.s.battle?.time||0;if(a.gaitT==null||t-a.gaitT>.15)a.gv=0;a.gaitT=t;
 a.gv=Math.min(speed,(a.gv||0)+accelOf(a,ef)*1.35*dt);a.gaitMode='sprint';a.gaitRush=Math.min(1,(a.gaitRush||0)+dt*6);a.sprinting=true;blendTo(a,'sprint',dt);a.gdir=a.a;return a.gv;
};
// --------------------------------------------------------------- Schrittlänge (sim.js updateLocomotion)
G.stride=(a,speed,renderScale=1)=>{
 if(!G.active||a.gaitOff||!a.gaitW)return 0;const W=a.gaitW,g=a.g,size=g.height/180*renderScale,legs=Math.min(M.limb(g,['lt','lsh','lf']),M.limb(g,['rt','rsh','rf']));
 const mv=1-W.stand||1,cad=(W.walk*P.cWalk+W.guard*P.cGuard+W.jog*P.cJog+W.sprint*P.cSprint+W.side*P.cSide+W.back*P.cBack+W.stand*P.cWalk)/(mv+W.stand||1);
 const limp=1-legs;// Humpeln: kürzere, etwas schnellere Schritte
 return cl(speed/(cad*(1+limp*.35)),4*size,60*size*(.65+.35*legs));
};

// --------------------------------------------------------------- Körper (arena.js drawGladiatorBody)
const GAIT_STATES=['move','circle','flank','retreat','charge'];
const RUSH={stand:0,walk:0,guard:0,jog:0,sprint:1,side:0,back:0};
// Ansturm (Spiel-eigene Bewegung) wird wie Sprinten gezeichnet; Taumeln, Ausweichen usw. bleiben wie bisher
function shownWeights(a){if(!G.active||a.gaitOff||!a.gaitW||!(GAIT_STATES.includes(a.state)||a.runAttack&&a.wind>0))return null;return a.state==='charge'?RUSH:a.gaitW;}
G.style=a=>{
 const W=shownWeights(a);if(!W)return null;const v=Math.max(0,a.gaitSpeed??a.moveSpeed??0)/Math.max(.3,a.renderScale||1),base=a.gaitBase||80,fw=a.gaitForward??1;
 const run=cl(W.jog*.42*cl(v/(base*.8),0,1)+W.sprint*cl(v/(base*1.25),.3,1),0,1);
 const lean=fw*(W.walk*1.2+W.jog*3.2+W.sprint*(4+6*cl(v/(base*1.3),0,1)))-W.back*3+W.guard*1.5+W.side*.5;
 return {run,lean,bob:W.walk*.7+W.guard*.55+W.side*.45+W.back*.6+W.jog*1+W.sprint*1.2+W.stand*.7,
  offset:Math.PI*(1-.55*W.side),stance:W.guard*2.5+W.side*5+W.back*3,drop:W.guard*1.6+W.side*2.2+W.back*1.4};
};

// --------------------------------------------------------------- Arme (arena.js gaitArms)
function mixP(acc,p,k){acc.mx+=p.m.x*k;acc.my+=p.m.y*k;acc.ox+=p.o.x*k;acc.oy+=p.o.y*k;acc.an+=p.an*k;acc.k+=k;}
G.arms=(R,a,w,roots,shield)=>{
 if(w.ammo)return;const W=shownWeights(a);if(!W||W.stand>.98)return;
 const r=roots.r,l=roots.l,ph=a.phase||0,fw=a.gaitForward??1,s=Math.sin(ph)*fw,c2=Math.cos(ph*2),fist=w.id==='fist',two=!!w.twoHand,poke=[1,5].includes(w.sprite),C=a.gaitC??1;
 const nat={m:{x:R.main.x,y:R.main.y},o:{x:R.off.x,y:R.off.y},an:R.angle};
 const free=(p,n)=>{if(fist)p.m={x:n.m.x,y:n.m.y};if(!shield&&!two)p.o={x:n.o.x,y:n.o.y};return p;};
 // Deckung: Waffe vor der Brust, Spitze zum Gegner; Schild vorn; freie Hand als Faust vorn
 const guard=(ext=0)=>({m:fist?{x:r.x+14+ext,y:r.y+2+c2*.6}:{x:r.x+12+ext,y:r.y+(two?9:7)+c2*.7},o:shield?{x:l.x+24+ext*.6,y:l.y+3+c2*.5}:{x:l.x+19,y:l.y+5+c2*.5},an:poke?-.22:two?-.95:-1.05});
 const relaxed=free({m:{x:r.x+4+s*5,y:r.y+22},o:shield?{x:l.x+5-s*3,y:l.y+18}:nat.o,an:poke?.25:two?-.45:.55},nat);
 const jog=free({m:{x:r.x+5+s*4,y:r.y+16-Math.abs(s)},o:shield?{x:l.x+12-s*3,y:l.y+11}:nat.o,an:(poke?-.35:two?-.85:-.7)+s*.12},nat);
 const sprint=free({m:{x:r.x+4+s*6,y:r.y+15-s*4},o:shield?{x:l.x+9-s*4,y:l.y+11+s*1.5}:nat.o,an:(poke?-.3:two?-1:-.85)+s*.25},nat);
 const gd=guard(0),back=guard(3);
 const walk={m:{x:relaxed.m.x+(gd.m.x-relaxed.m.x)*C,y:relaxed.m.y+(gd.m.y-relaxed.m.y)*C},o:{x:relaxed.o.x+(gd.o.x-relaxed.o.x)*C,y:relaxed.o.y+(gd.o.y-relaxed.o.y)*C},an:relaxed.an+(gd.an-relaxed.an)*C};
 const acc={mx:0,my:0,ox:0,oy:0,an:0,k:0};
 mixP(acc,nat,W.stand);mixP(acc,walk,W.walk);mixP(acc,gd,W.guard+W.side);mixP(acc,back,W.back);mixP(acc,jog,W.jog);mixP(acc,sprint,W.sprint);
 const k=acc.k||1;R.main.x=acc.mx/k;R.main.y=acc.my/k;R.off.x=acc.ox/k;R.off.y=acc.oy/k;R.angle=acc.an/k;
 // Ansturm/Sprint auf den Gegner: Waffe hoch (Speer eingelegt nach vorn), Schild vorn
 const rush=(a.gaitRush||0)*cl(W.sprint+W.jog,0,1);if(rush>.01&&!fist){const bob=Math.sin(ph*2)*1.2;
  const up=poke?{m:{x:r.x+11,y:r.y+6+bob},an:-.08}:two?{m:{x:r.x-1,y:r.y-15+bob},an:-2.35}:{m:{x:r.x+2,y:r.y-21+bob},an:-2.05};
  R.main.x+=(up.m.x-R.main.x)*rush;R.main.y+=(up.m.y-R.main.y)*rush;R.angle+=(up.an-R.angle)*rush;
  if(shield){R.off.x+=(l.x+18-R.off.x)*rush;R.off.y+=(l.y+3-R.off.y)*rush;}}
};

// --------------------------------------------------------------- Vorführfigur (Gang-Editor)
// a.puppet={mode, lane:{x0,x1,y,dy}, dir, combat, old}; old = bisheriges Spiel (sofort volles Tempo, keine Gangarten)
const OLD={stand:0,walk:1,guard:.63,jog:1,sprint:1.45,side:.5,back:1};
G.puppet=(a,dt)=>{
 const p=a.puppet,ef=M.effective(a),base=ef.speed,L=p.lane;a.cool=1;a.wind=0;a.swing=0;a.block=false;
 if(p.energy!=null)a.energy=p.energy;
 let mode=p.mode,face=p.face??(p.dir>0?0:Math.PI),dir=null;
 if(!p.old)mode=capMode(a,mode,ef);
 if(mode==='side'){p.sy??=1;const ty=L.y+p.sy*L.dy;if(Math.abs(a.y-ty)<6)p.sy=-p.sy;dir=Math.atan2(L.y+p.sy*L.dy-a.y,0);face=p.faceSide??0;}
 else if(mode==='back'){p.bdir??=-1;if(p.bdir<0&&a.x<L.x0+20)p.bdir=1;if(p.bdir>0&&a.x>L.x1-20)p.bdir=-1;dir=p.bdir<0?Math.PI:0;face=0;if(p.bdir>0)mode='guard';}
 else if(mode!=='stand'){// hin und her: vor dem Ende rechtzeitig bremsen, dann umdrehen
  const end=p.dir>0?L.x1:L.x0,rest=(end-a.x)*p.dir,A=accelOf(a,ef)*P.dec,brake=p.old?0:(a.gv||0)**2/(2*A)+6;
  if(rest<=Math.max(4,brake)){if(p.old||(a.gv||0)<4){p.dir=-p.dir;}else mode='stand';}
  dir=p.dir>0?0:Math.PI;face=p.dir>0?0:Math.PI;
  if(Math.abs(a.y-L.y)>3)dir=Math.atan2(L.y-a.y,(p.dir||1)*40);}
 if(mode==='stand'&&p.mode==='stand')dir=null;
 let v;
 if(p.old){v=dir==null?0:base*OLD[mode];a.gdir=dir??a.gdir;a.sprinting=mode==='sprint';}
 else{a.gaitMode=mode;a.gaitFar=mode==='back'&&!p.combat;v=physics(a,mode,dir,base,ef,dt);a.gaitBase=base;a.sprinting=mode==='sprint'&&v>base*1.05;
  a.gaitC=(a.gaitC??(p.combat?1:0))+((p.combat?1:0)-(a.gaitC??0))*(1-Math.exp(-4*dt));
  blendTo(a,v<3&&dir==null?'stand':mode==='stand'?(a.gaitW?.sprint>.4?'jog':'walk'):mode,dt);}
 // Blickrichtung weich drehen (Umdrehen am Bahnende)
 a.a+=cl(ad(face,a.a),-9*dt,9*dt);
 if(v>.5&&a.gdir!=null){const ox=a.x,oy=a.y;a.x+=Math.cos(a.gdir)*v*dt;a.y+=Math.sin(a.gdir)*v*dt;if(M.roundField?.())M.fieldPt?.(a,a.r||14);
  a.state=mode==='side'?'circle':mode==='back'?'retreat':'move';}
 else a.state='idle';
 a.gaitShown=p.old?(dir==null?'stand':mode):(v<3&&dir==null?'stand':mode);a.gaitV=v;
};
G.name=m=>NAME[m]||m;G.color=m=>COLOR[m]||'#ccc';
G.current=a=>{if(a.gaitShown)return a.gaitShown;if(!a.gaitW)return 'stand';let best='stand',bw=0;for(const m of MODES)if(a.gaitW[m]>bw){bw=a.gaitW[m];best=m;}return best;};
G.reset=()=>Object.assign(P,DEF);
})();
