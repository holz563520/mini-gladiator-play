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
 runAttack:1,runHit:.3,chargeDmg:1.5,ramCharge:.32,ramRun:.15,cryDist:260,
 // Initiative nutzen und Abstechen am Boden (Vorschlag, nicht freigegeben)
 seize:1,seizeRange:320,finWind:1.4,finDmg:1.3,finSever:.45,finHold:.7,
 // Durchstich im Stehen (Stich-Angriff)
 pierce:1,pierceForce:0,pierceDmg:1.25,pierceHold:.9,pierceRate:1.1,pierceArmor:8,pierceBack:3,specials:1,specialRate:1,specialForce:0,
 backRun:1,backDmg:1.6,backGrab:.6,grabTime:1.7,backKnock:.45,
 // Speer/Dreizack: Anteil Stiche, Abklingzeit nach dem Stich
 spearThrust:.85,spearCool:.5,spearWind:.65,spearJabEnergy:.5,spearSwing:.65
};
const P={...DEF};
const G=M.gait={P,DEF,MODES,NAME,COLOR};
/* Einschalten: im Spiel über die Einstellung „Natürliche Kampfbewegungen“ (S.options.gaitRules, Standard an; Thomas 09.11.: ins Spiel einbinden).
   Gang-Editor und Tests setzen M.gait.active ausdrücklich (true/false), das hat Vorrang. Ohne geladenes Modul bleibt alles wie vorher. */
{let forced=null;Object.defineProperty(G,'active',{get:()=>forced!=null?forced:(typeof document!=='undefined'&&M.s?.options?.gaitRules!==false),set:v=>{forced=v==null?null:!!v;},enumerable:true});}

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
 const t=o.target,w=M.weapon(a);if(!P.runAttack||!t||t.down||t.fallTimer>0||t.g.dead||t.surrendered||o.isRanged||w.ammo||o.flank||a.block||a.retreat>0||a.cool>0||a.energy<18||a.state!=='move'||a.netTimer>0)return false;
 if((a.gv||0)<base*.6||Math.abs(ad(Math.atan2(t.y-a.y,t.x-a.x),a.a))>.6)return false;
 const reach=o.ef.range+t.r,wind=(M.meleeTiming?.(a.g,w,'slash')?.wind||.3)*1.1,lead=a.gv*wind*.85;
 if(!(o.d>reach-2&&o.d<reach+lead+6))return false;
 M.beginAttack(a,t);if(!(a.wind>0)||['kick','shieldBash','groundFinish'].includes(a.technique))return true;
 const k=cl((a.gv/base-.6)/.85,0,1);a.runAttack={v:a.gv,base,target:t.id};a.chargeBoost=Math.max(a.chargeBoost||0,1+P.runHit*k);
 if(a.gv>base*1.15)a.rushHit={t:M.s.battle.time,v:a.gv,base,kind:'run'};ev('runAttack',a,{v:a.gv,boost:a.chargeBoost,tech:a.technique});return true;}
G.windMove=(a,dt,ef)=>{
 /* Speer/Dreizack: kurzer Stoß aus dem Stand (schnelles Ausholen) */if(a.technique==='thrust'&&!a.jab&&LONGPOINT.has(M.weapon(a).id)&&!a.gaitOff){a.jab=true;a.wind*=P.spearWind;a.windMax*=P.spearWind;}if(a.wind<=dt)a.jab=false;
 if(a.technique==='groundFinish'){finStart(a);G.finStep(a,dt);}const r=a.runAttack;if(!r)return;const t=M.s.battle.actors.find(x=>x.id===r.target);if(!t||t.g.dead||t.down){a.runAttack=null;return;}
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
// Durchstich im Stehen: ein Stich kann ganz durch den Körper gehen (je nach Waffe, Wucht und Rüstung) – Klinge tritt hinten aus,
// der Getroffene hängt kurz auf der Waffe, dann wird sie herausgerissen
// Durchstich-Chance je Waffe (ungerüstete Stelle, Stich mit üblicher Wucht). Rüstung der getroffenen Stelle wirkt stark (je 8 Schutzpunkte rund ×0,37):
// Leder/Metall einfacher Güte halbiert bis drittelt die Chance, gutes Metall macht einen Durchstich selten, legendäres fast unmöglich.
const PIERCE_BASE={spear:.12,trident:.09,javelin:.12,rapier:.09,dagger:.07,gladius:.07,short:.07,long:.05,greatsword:.045,halberd:.05};
G.PIERCE_BASE=PIERCE_BASE;G.pierceChance=(a,b,w,id,dmg,opt={})=>{const base=PIERCE_BASE[w?.id];if(!base||!b?.g)return 0;const sk=G.skillF(a,'pierce');const armor=M.armorProtection?.(b.g,id)||0,
 dmgF=cl((dmg||0)/15,.5,1.6),armF=G.armorF(armor,P.pierceArmor,dmg),thin=['lua','rua','lfa','rfa','lh','rh','lsh','rsh','lf','rf','neck'].includes(id)?1.25:1;
 return cl(base*P.pierceRate*sk*dmgF*armF*thin*(opt.back?P.pierceBack:1),.001,.5);};
G.thrust=(a,b,dmg,w,id,opt={})=>{
 if(!G.active||!P.pierce||!b?.g||b.g.dead||a.pierceContact||a.swingKind!=='thrust'&&!opt.force||!w||w.ammo)return;const base=PIERCE_BASE[w.id];if(!base)return;const part=b.g.body[id];if(!part||part.missing)return;
 const chance=P.pierceForce||opt.force?1:G.pierceChance(a,b,w,id,dmg,opt);M.learn?.(a,'moves','pierce',.006);if(G.trace){G.trace.elig.pierce=(G.trace.elig.pierce||0)+1;G.trace.exp.pierce=(G.trace.exp.pierce||0)+chance;}if(M.rng()>chance)return;M.recordAttack?.(a,'pierce');M.learn?.(a,'moves','pierce',.05);
 const extra=dmg*(P.pierceDmg-1);part.hp=Math.max(0,part.hp-extra);a.damage+=extra;b.taken+=extra;part.bleed+=2.5;part.deepStabs=(part.deepStabs||0)+1;if(id==='chest'||id==='belly')part.internal??={days:35,severe:true};/* wie sim.js: mit Heiltagen, sonst stürzt das Krankenhaus ab (Thomas 10.11.) */
 M.recordWound?.(b.g,id,'Durchstochen',a.g.name,w.name,dmg+extra);
 const TH=G.throughOf(w.id);a.pierceContact={target:b.id,part:id,left:P.pierceHold,len:P.pierceHold,weaponId:w.item?.id,through:true,exit:TH.exit,depthMul:TH.depth,t:0};if(w.item)w.item.blood=Math.max(w.item.blood||0,.85);a.swing=0;a.pendingStrike=null;a.wind=0;a.state='piercing';
 b.stun=Math.max(b.stun||0,P.pierceHold*.9);b.hit=.4;M.shake=Math.max(M.shake||0,6);
 M.floater?.(b.x,b.y-58,opt.back?'VON HINTEN DURCHBOHRT!':'DURCHSTOCHEN!','#ff5a4a');M.voice?.('pain',M.voicePitch?.(b.g)??1,true);M.sound?.('stick');
 {const L=b.g.gaitMarks||(b.g.gaitMarks=[]),has=m=>L.some(k=>k.m===m&&k.part===id&&k.lx==null);if(!has('stab'))L.push({m:'stab',part:id,battle:M.s.battle?.id});if(TH.exit&&!has('stabBack'))L.push({m:'stabBack',part:id,battle:M.s.battle?.id});}
 ev('pierce',a,{b,part:id,weapon:w.id,dmg:dmg+extra,down:false,back:!!opt.back});return true;};
// während der Durchstich hält: kleiner Ausfallschritt hinein, Angreifer hinter dem Getroffenen gezeichnet (Klinge verschwindet im Körper,
// die Spitze kommt hinten heraus), Blut tritt vorn und hinten aus
G.pierceStep=(a,dt)=>{const f=a.pierceContact;if(f?.grab){const b=M.s.battle.actors.find(x=>x.id===f.target);if(b)G.grabStep(a,b,f,dt);return;}if(!f?.through)return;const b=M.s.battle.actors.find(x=>x.id===f.target);if(!b)return;f.t=(f.t||0)+dt;const k=f.t/(f.len||.9);
 const dir=Math.atan2(b.y-a.y,b.x-a.x);G.pierceLunge(a,b,f,dt);
 G.pierceBlood(a,b,f,k,dt,dir);};
// Blut beim Durchstich: Eintritt vorn, Austritt an der echten Waffenspitze (a.weaponTipX/Y aus arena.js), Tropfen von der Spitze, Schwall beim Herausreißen
G.pierceBlood=(a,b,f,k,dt,dir)=>{const cp=M.contactAnchor(b,f.part),tip=a.weaponTipX!=null?{x:a.weaponTipX,y:a.weaponTipY}:{x:cp.x+Math.cos(dir)*12,y:cp.y};
 if(!f.spray&&k>.22){f.spray=true;M.emit?.(cp.x-Math.cos(dir)*3,cp.y,8,'#9d2f2a',45);if(f.exit){M.emit?.(tip.x,tip.y,22,'#aa3c36',120);}M.shake=Math.max(M.shake||0,4);}
 if(k>.3&&k<.85&&M.rng()<dt*(f.exit?14:6)){const p=f.exit?tip:cp;M.emit?.(p.x,p.y+1,1,'#8f2a24',18);}
 if(f.left<=dt*1.5&&!f.out)G.pierceOut(a,b,f,cp,dir);};
// Herausreißen: Wunden bleiben fest an der Stelle, Blutschwall. Auch wenn der Durchstich vorzeitig endet (Getroffener stürzt, kniet, stirbt)
G.pierceOut=(a,b,f,cp,dir)=>{if(!f||f.out||!b?.g)return;f.out=true;for(const m of b.g.gaitMarks||[])if(m.lx!=null)m.fixed=true;cp=cp||M.contactAnchor?.(b,f.part);if(dir==null)dir=Math.atan2(b.y-a.y,b.x-a.x);if(cp){M.emit?.(cp.x,cp.y,16,'#aa3c36',90);if(f.exit)M.emit?.(cp.x+Math.cos(dir)*10,cp.y,10,'#9d2f2a',70);}M.sound?.('stick');};
// Durchstich auf der kleinen Figur: keine eigene Spitze – die echte Waffe des Angreifers wird tief genug hineingestoßen und
// der Angreifer hinter dem Getroffenen gezeichnet; so verschwindet die Klinge im Körper und tritt hinten im selben Winkel aus.
// Wie tief, hängt von der Waffe ab: Speer, Wurfspeer, Dreizack und Schwerter gehen durch, der Dolch steckt bis zum Heft,
// die Hellebarde nur mit dem Stoßdorn (das Blatt bleibt außen).
// near: Abstand, auf den der Angreifer nachstößt (Hand nah am Körper, damit die Klinge durchgeht)
// Speer und Dreizack: einhändig geführt (wie im Spiel), stechen meist und in schneller Folge –
// halten den Gegner mit vielen Stichen auf Abstand (Abstand selbst regelt reach-ai.js wie bisher)
const LONGPOINT=new Set(['spear','trident']);
G.tech=(a,b)=>{if(!G.active||a.gaitOff)return;const w=M.weapon(a);if(!LONGPOINT.has(w.id)||['kick','shieldBash','groundFinish'].includes(a.technique))return;if(M.rng()<P.spearThrust)a.technique='thrust';};
G.cool=(a,w)=>{if(!G.active||a.gaitOff||!LONGPOINT.has(w?.id)||a.technique!=='thrust')return;a.cool*=P.spearCool;a.swingMax*=P.spearSwing;a.swing=a.swingMax;/* kurzer Stoß kostet weniger Kraft */a.energy+=(M.T.atkEnergy+(w.weight||3)*M.T.atkEnergyWeight)*P.spearJabEnergy;};
const THROUGH={spear:{exit:true,depth:4.8,near:46},javelin:{exit:true,depth:4.6,near:42},trident:{exit:false,depth:2.3,near:46},gladius:{exit:true,depth:3,near:30},short:{exit:true,depth:2.8,near:28},long:{exit:true,depth:3.2,near:36},greatsword:{exit:true,depth:3.4,near:40},rapier:{exit:true,depth:3.2,near:34},dagger:{exit:false,depth:1.7,near:24},halberd:{exit:false,depth:.72,near:48}};
G.throughOf=id=>THROUGH[id]||{exit:false,depth:1.4,near:34};
// Nachstoßen: in den ersten 35 % der Haltezeit rasch auf den Waffenabstand heran
G.pierceLunge=(a,b,f,dt)=>{const k=(f.t||0)/(f.len||.9),d=Math.hypot(b.x-a.x,b.y-a.y),dir=Math.atan2(b.y-a.y,b.x-a.x);
 /* Abstand so, dass die Hand bequem erreichbar bleibt (arena.js misst Schulter→Hand, Ziel 22 Figureneinheiten); sonst Waffen-Richtwert */
 if(k<.55){let st=0;if(a._pReach!=null){const sc=a.g.height/180*1.14*cl(.85+a.g.weight/420,.98,1.18);st=cl((a._pReach-22)*sc,-90*dt,90*dt);}else{const near=G.throughOf(M.weapon(a).id).near;if(Math.abs(d-near)>1)st=Math.sign(d-near)*Math.min(Math.abs(d-near),160*dt);}
  /* nie in den Getroffenen hinein (tiefe Stellen, Kniende): Mindestabstand Körper an Körper */const dmin=(30+(b.kneeTimer>0||b.state==='kneeling'?8:0))*a.g.height/180*1.14;if(st>0)st=Math.min(st,Math.max(0,d-dmin));
  if(Math.abs(st)>.01){a.x+=Math.cos(dir)*st;a.y+=Math.sin(dir)*st;}}
 a.y=Math.max(a.y,b.y+.6);/* Angreifer vor dem Getroffenen gezeichnet: Waffe bis zum Eintrittsloch sichtbar, Stück im Körper wird in arena.js ausgespart */};
// ---------------------------------------------------------------- Verletzungen auf der kleinen Figur (bleiben bestehen)
// Echter Körperzustand, den das Spiel schon zeigt und speichert (Bruch → Arm hängt/Humpeln, tiefe Stichwunde → Wundgriff,
// Schädelbruch → Wunde im Kopf, abgetrennt → Glied fehlt), dazu eigene Bilder für die neuen Verletzungen (g.gaitMarks).
const MARK_OF={through:['stab','stabBack'],heart:['stab','bloodChest'],lung:['bruiseChest','mouthBlood'],ribs:['bruiseChest'],ribseries:['bruiseChest','dent'],sternum:['bruiseChest','dent'],
 liver:['bruiseBelly','stab'],spleen:['bruiseBelly'],kidney:['stabBack'],gutted:['guts'],pelvis:['bruiseHip'],neckbreak:['bruiseNeck'],larynx:['bruiseNeck','mouthBlood'],collarbone:['bruiseShoulder'],deepcut:['cut'],cut:['cut'],stab:['stab'],deepstab:['stab'],pierce:['stab','stabBack'],gut:['guts'],bruise:['bruise'],contusion:['bruise'],crush:['bruise'],concussion:['bruiseHead']};
const NEW_NAME={ribs:'Rippenbruch',ribseries:'Rippenserienfraktur',sternum:'Brustbeinbruch',lung:'Lungendurchstich',heart:'Herzstich',liver:'Leberriss',spleen:'Milzriss',kidney:'Nierenverletzung',gutted:'Ausgeweidet',pelvis:'Beckenbruch',neckbreak:'Genickbruch',larynx:'Kehlkopfbruch',collarbone:'Schlüsselbeinbruch',through:'Durchstochen'};
// returns: 'sever' (nach der Nahaufnahme abtrennen), 'death' (danach tot), 'down' (bricht zusammen) oder null
// Wunde genau an einen Feldpunkt setzen: über die Zeichenmatrix des Getroffenen (letztes Bild) in seine Figurenkoordinaten
// Spitze der Waffe, wie sie gerade gezeichnet ist (Feld), wenn frisch und nahe an der Stelle – dort sitzt die Wunde
G.tipAt=(a,b,id)=>{const t=a?._tipW,W=G.anchor(b,id);if(!t||!W||(M.s.battle?.time||0)-t.t>.25)return null;return Math.hypot(t.x-W.x,t.y-W.y)<16?{x:t.x,y:t.y}:null;};
G.markAt=(v,m,w)=>{if(!v?._vK||!w||!m)return;try{const q0=new DOMMatrix().translate(v.x,v.y).multiply(v._vK).inverse().transformPoint(new DOMPoint(w.x,w.y)),q=G.onPart(v,m.part,{x:q0.x,y:q0.y})||q0;m.lx=q.x;m.ly=q.y;const sp=SEG[m.part]&&segParam(v._anch,m.part,q);if(sp)m.ls=sp;m.fixed=true;}catch(e){}};
G.applyInjury=(att,vic,kind,part,wid,name,opt={})=>{const g=vic.g,B=g.body,p=B[part]||B.chest;if(!p)return null;const fr=(id,days,severe)=>{const q=B[id];if(q&&!q.missing){q.fracture={days,total:days,severe:!!severe};q.hp=Math.min(q.hp,severe?20:38);q.pain=Math.max(q.pain||0,70);}};
 const wound=(id,type,bl)=>{const q=B[id];if(!q||q.missing)return;q.bleed=(q.bleed||0)+bl;q.hp=Math.max(1,q.hp-18);try{M.recordWound(g,id,type,att?.g?.name||'',M.weapon(att)?.name||wid,20);}catch{}};
 const marks=g.gaitMarks||(g.gaitMarks=[]);const side=(part||'').startsWith('r')?'r':(part||'').startsWith('l')&&part.length>2?'l':((marks.length%2)?'l':'r');
 const lying=onGroundA(vic)||vic.fallTimer>0;for(const m of MARK_OF[kind]||[]){if(m==='stabBack'&&((kind==='through'||kind==='pierce')&&!G.throughOf(wid).exit||lying))continue;const mk={m,part,side,t:M.s.battle?.time||0};marks.push(mk);/* liegend: Einstich genau an der Stelle, an der die Waffe sitzt */if(lying&&(m==='stab'||m==='cut'))G.markAt(vic,mk,G.tipAt(att,vic,part)||G.anchor(vic,part));}if(marks.length>24)marks.splice(0,marks.length-24);
 let out=null;
 /* Geschoss bleibt stecken: Pfeil, Bolzen, Wurfspeer, Wurfaxt */const PT={bow:'arrow',crossbow:'bolt',javelin:'javelin',throwaxe:'throwaxe'}[wid];if(PT&&opt.thrown!==false&&!['skullfracture','sever','bruise','contusion','concussion','scar','collapse'].includes(kind))marks.push({m:'shaft',type:PT,part,side,back:!!opt.back,t:M.s.battle?.time||0});
 switch(kind){
  case 'through':case 'pierce':wound(part,'Durchstochen',2.5);p.deepStabs=(p.deepStabs||0)+1;if(part==='chest'||part==='belly')p.internal??={days:35,severe:true};break;
  case 'heart':wound('chest','Herzstich',8);B.chest.deepStabs=(B.chest.deepStabs||0)+1;B.chest.internal??={days:35,severe:true};out='death';break;
  case 'lung':wound('chest','Lungendurchstich',3);B.chest.internal??={days:35,severe:true};B.chest.deepStabs=(B.chest.deepStabs||0)+1;break;
  case 'ribs':fr('chest',21);break;case 'ribseries':fr('chest',35,true);break;case 'sternum':fr('chest',28);break;
  case 'liver':case 'spleen':case 'kidney':wound('belly',NEW_NAME[kind],4);B.belly.internal??={days:35,severe:true};B.belly.deepStabs=(B.belly.deepStabs||0)+1;break;
  case 'gutted':wound('belly','Ausgeweidet',6);B.belly.internal??={days:35,severe:true};B.belly.deepStabs=(B.belly.deepStabs||0)+2;out='down';break;
  case 'pelvis':fr('belly',60,true);B.lt.hp=Math.min(B.lt.hp,30);B.rt.hp=Math.min(B.rt.hp,30);out='down';break;
  case 'neckbreak':fr('neck',60,true);out='death';break;
  case 'larynx':fr('neck',30);wound('neck','Kehlkopfbruch',1);break;
  case 'collarbone':fr(part==='rs'?'rs':'ls',28);break;
  case 'skullfracture':if(!B.head.missing){B.head.fracture={days:60,total:60,severe:true,skull:true};B.head.skullFracture=true;B.head.skullBy=wid;B.head.hp=Math.min(B.head.hp,20);}break;
  case 'fracture':case 'badfracture':case 'shatter':case 'pulp':fr(part,kind==='fracture'?21:42,kind!=='fracture');if(kind==='pulp'||kind==='shatter')p.fracture.crushed=true;break;
  case 'sever':out='sever';break;
  case 'deepcut':wound(part,'Tiefe Schnittwunde',part==='neck'?7:3);if(part==='neck')out='death';break;
  case 'cut':case 'scrape':wound(part,kind==='cut'?'Schnittwunde':'Schürfwunde',1);break;
  case 'stab':case 'deepstab':wound(part,kind==='stab'?'Stichverletzung':'Tiefe Stichverletzung',kind==='stab'?1:3);if(kind==='deepstab')p.deepStabs=(p.deepStabs||0)+1;break;
  case 'sinew':wound(part,'Sehnenverletzung',2);p.grade=Math.max(p.grade||0,3);break;
  case 'gut':wound('belly','Tiefe Bauchwunde',4);B.belly.internal??={days:35,severe:true};break;
  case 'arrow':wound(part,'Pfeil steckt',2);break;
  default:if(p){p.hp=Math.max(1,p.hp-12);p.pain=Math.max(p.pain||0,40);}}
 g.blood=Math.max(30,(g.blood??100)-(out==='death'?20:6));return out;};
const LIMB_Y={lua:-44,rua:-44,lfa:-36,rfa:-36,lh:-30,rh:-30,lt:-22,rt:-22,lsh:-11,rsh:-11,lf:-3,rf:-3};
const PARTPOS={chest:P=>({x:P.chest.x+4,y:P.chest.y+4}),belly:P=>({x:P.chest.x*.5+3,y:-36}),neck:P=>({x:P.head.x+1,y:-57}),head:P=>({x:P.head.x+2,y:P.head.y}),ls:P=>({x:P.shoulders.l.x,y:P.shoulders.l.y+2}),rs:P=>({x:P.shoulders.r.x,y:P.shoulders.r.y+2})};
// Heilung der Wundbilder (nur Darstellung): frisch am Kampftag (blutet), dann Schorf (dunkel, blutet nicht), nach den Heiltagen Narbe
// (schmale helle Linie) oder ganz verschwunden. Steckende Geschosse nur im Kampf, in dem sie trafen. Abgetrennte Stellen zeigen nichts.
const HEAL_DAYS={stab:7,stabBack:7,cut:5,backCut:8,throat:8,guts:14,dent:12,bloodChest:1,mouthBlood:1,bruise:4,bruiseChest:4,bruiseBelly:4,bruiseHip:4,shaft:0},SCARS=new Set(['stab','stabBack','cut','backCut','throat','guts']);
G.markStage=(g,k)=>{if(k.day==null){k.day=M.s.day??0;k.battle=M.s.battle?.id??null;}/* Tag und Kampf beim ersten Zeigen festhalten */if(g.body?.[k.part]?.missing)return 'gone';if(k.m==='shaft')return M.s.battle&&k.battle===M.s.battle.id?'fresh':'gone';const d=(M.s.day??0)-(k.day??M.s.day??0);if(d<=0)return 'fresh';if(d<(HEAL_DAYS[k.m]??5))return 'scab';return SCARS.has(k.m)?'scar':'gone';};
// Aufräumen beim Kampfbeginn: Verschwundenes weg, höchstens 16 Bilder je Gladiator (Narben zuerst zusammengelegt)
G.pruneMarks=g=>{const L=g?.gaitMarks;if(!L?.length)return;const keep=L.filter(k=>G.markStage(g,k)!=='gone');g.gaitMarks=keep.length>16?[...keep.filter(k=>G.markStage(g,k)!=='scar').slice(-12),...keep.filter(k=>G.markStage(g,k)==='scar').slice(-4)].slice(-16):keep;};
// Glieder als Abschnitte zwischen Gelenken (arena.js legt Ellbogen, Knie, Hüfte ab): Wunden und Löcher an Gliedern wandern mit dem Glied
const SEG={lua:['ls','l_el'],lfa:['l_el','lh'],lh:['l_el','lh'],rua:['rs','r_el'],rfa:['r_el','rh'],rh:['r_el','rh'],lt:['l_hp','l_kn'],lsh:['l_kn','lf'],lf:['l_kn','lf'],rt:['r_hp','r_kn'],rsh:['r_kn','rf'],rf:['r_kn','rf']},
 SEGT={lh:1,rh:1,lf:1,rf:1},LIMBR={lua:3.3,rua:3.3,lfa:2.9,rfa:2.9,lh:2.4,rh:2.4,lt:4.4,rt:4.4,lsh:3.4,rsh:3.4,lf:2.8,rf:2.8};
const segOf=(A,id)=>{const q=SEG[id];return q&&A?.[q[0]]&&A[q[1]]?[A[q[0]],A[q[1]]]:null;};
const segPoint=(A,id,h)=>{const s=segOf(A,id);if(!s||!h)return null;const [p,q]=s,vx=q.x-p.x,vy=q.y-p.y,l=Math.hypot(vx,vy)||1;return {x:p.x+vx*h.t-vy/l*h.n,y:p.y+vy*h.t+vx/l*h.n};};
const segParam=(A,id,pt)=>{const s=segOf(A,id);if(!s||!pt)return null;const [p,q]=s,vx=q.x-p.x,vy=q.y-p.y,l2=vx*vx+vy*vy||1,l=Math.sqrt(l2),dx=pt.x-p.x,dy=pt.y-p.y;return {t:(dx*vx+dy*vy)/l2,n:(-dx*vy+dy*vx)/l};};
const markLayer=k=>{const id=k.part||'';if(['lt','rt','lsh','rsh','lf','rf'].includes(id))return 'legs';if(['lua','lfa','lh'].includes(id)||id==='ls'&&k.m==='bruiseShoulder')return 'armL';if(['rua','rfa','rh'].includes(id)||id==='rs'&&k.m==='bruiseShoulder')return 'armR';return 'body';};
// Rumpf, Kopf, Hals: Mitte und halbe Ausdehnung der gezeichneten Fläche (Figurenkoordinaten, wie arena.js drawTorso/Kopf zeichnet)
const torsoX=(P,y)=>{const pv=P.pelvis||{x:0,y:-30},c=P.chest;return pv.x+(c.x-pv.x)*cl((-30-y)/(-30-c.y),0,1.3);};
const BOX={chest:P=>({c:{x:torsoX(P,P.chest.y+6),y:P.chest.y+6},hx:10.2,hy:9}),belly:P=>({c:{x:torsoX(P,-36),y:-36},hx:8,hy:5}),head:P=>({c:{x:P.head.x+.5,y:P.head.y+1.5},hx:8,hy:9}),
 neck:P=>({c:{x:(P.chest.x+P.head.x)/2,y:-57.5},hx:3.2,hy:3}),ls:P=>({c:{x:P.shoulders.l.x,y:P.shoulders.l.y+1},hx:4.5,hy:4.5}),rs:P=>({c:{x:P.shoulders.r.x,y:P.shoulders.r.y+1},hx:4.5,hy:4.5})};
// Punkt auf die Körperstelle holen (nie in der Luft): Rumpf/Kopf in die Fläche, Glieder auf das Glied
G.onPart=(b,id,pt)=>{const P=b?._P;if(!P||!pt)return pt;const A=b._anch,s=segOf(A,id);
 if(s){const h=segParam(A,id,pt),r=(LIMBR[id]||3)*.7;h.t=cl(h.t,SEGT[id]?.8:.1,SEGT[id]?1.05:.9);h.n=cl(h.n,-r,r);return segPoint(A,id,h);}
 const B=BOX[id]?.(P);if(!B)return pt;return {x:cl(pt.x,B.c.x-B.hx*.85,B.c.x+B.hx*.85),y:cl(pt.y,B.c.y-B.hy*.85,B.c.y+B.hy*.85)};};
// Ein- und Austrittsloch eines Durchstichs: Waffenlinie (Feldrichtung dw) durch die Mitte der Stelle, beide Löcher genau am Rand der gezeichneten Fläche
// (Figurenkoordinaten des Getroffenen; an Gliedern zusätzlich als Lage entlang des Glieds, damit sie mitwandern)
G.holes=(b,id,dw)=>{if(!b?._vK||!b._P||!dw)return null;try{const VI=new DOMMatrix().translate(b.x,b.y).multiply(b._vK).inverse(),o=VI.transformPoint(new DOMPoint(0,0)),q=VI.transformPoint(new DOMPoint(dw.x,dw.y));
 let ux=q.x-o.x,uy=q.y-o.y;const ul=Math.hypot(ux,uy);if(!(ul>1e-6))return null;ux/=ul;uy/=ul;const A=b._anch,sg=segOf(A,id);let C,s;
 if(sg){const [p,q2]=sg,t=SEGT[id]??.5,vx=q2.x-p.x,vy=q2.y-p.y,vl=Math.hypot(vx,vy)||1,r=LIMBR[id]||3,cr=Math.abs(ux*vy-uy*vx)/vl;C={x:p.x+vx*t,y:p.y+vy*t};s=Math.min(r/Math.max(cr,.25),r*2.4);}
 else{const B=(BOX[id]||BOX.chest)(b._P);C=B.c;s=Math.min(B.hx/Math.max(Math.abs(ux),1e-3),B.hy/Math.max(Math.abs(uy),1e-3));}
 s*=.86;const E={x:C.x-ux*s,y:C.y-uy*s},X={x:C.x+ux*s,y:C.y+uy*s},out={E,X};if(sg){out.sE=segParam(A,id,E);out.sX=segParam(A,id,X);}return out;}catch(e){return null;}};
// aktuelle Lage eines Lochs (wandert mit dem Glied)
G.holePt=(b,id,h,k)=>h?.['s'+k]&&segPoint(b?._anch,id,h['s'+k])||h?.[k];
G.markHole=(b,m,h,k)=>{if(!m||!h?.[k])return;m.lx=h[k].x;m.ly=h[k].y;if(h['s'+k])m.ls=h['s'+k];m.fixed=true;};
function drawMarks(a,P,layer){if(a.g.gaitMarks?.length&&a.g._gaitPruned!==(M.s.battle?.id??-1)){Object.defineProperty(a.g,'_gaitPruned',{value:M.s.battle?.id??-1,writable:true,configurable:true,enumerable:false});G.pruneMarks(a.g);}const L=a.g.gaitMarks;if(!L?.length)return;const R=(x,y,w,h,c)=>{P.ctx.fillStyle=c;P.ctx.fillRect(Math.round(x),Math.round(y),w,h);},T0=P.time||0;
 const AN=P.anchors||a._anch||{},at=(m,def)=>LIMB_Y[m.part]!=null?(AN[m.part]?{x:AN[m.part].x,y:AN[m.part].y}:{x:P.chest.x*.4+(m.part[0]==='r'?2:-1),y:LIMB_Y[m.part]}):(PARTPOS[m.part]||PARTPOS[def])(P),
  /* Ein-/Austritt: an Gliedern mitgeführt (Lage entlang des Glieds), am Rumpf fest in Figurenkoordinaten */stabAt=k=>{const back=k.m==='stabBack',B=BOX[k.part]?.(P);if(B)return {x:B.c.x+(back?-1:1)*B.hx*(back?.75:.55),y:B.c.y};const q=AN[k.part];if(q&&LIMBR[k.part])return {x:q.x+(back?-1:1)*LIMBR[k.part]*.5,y:q.y};return null;},
  fix=k=>k.ls&&SEG[k.part]?segPoint(AN,k.part,k.ls)||(k.lx!=null?{x:k.lx,y:k.ly}:null):k.lx!=null?{x:k.lx,y:k.ly}:null;
 for(const k of L){P.ctx.globalAlpha=1;const m=k.m,st=G.markStage(a.g,k);if(st==='gone')continue;if(layer&&markLayer(k)!==layer)continue;
  if(st==='scar'){const sp=(m==='stab'||m==='stabBack')&&!fix(k)?stabAt(k):null,p=fix(k)||sp||at(k,m==='guts'?'belly':m==='throat'?'neck':'chest'),x=m==='stabBack'&&k.lx==null&&!sp?p.x-11:m==='backCut'?-7:p.x,y=m==='backCut'?-42:p.y;P.ctx.globalAlpha=.55;if(m==='stab'||m==='stabBack')R(x-1,y,3,1,'#e6b8a8');else if(m==='backCut')for(let i=0;i<6;i++)R(x-2+i*.6,y-4+i*1.4,1,1,'#e6b8a8');else R(x-3,y+1,6,1,'#e6b8a8');P.ctx.globalAlpha=1;continue;}
  const t=st==='fresh'?T0:0;if(st==='scab')P.ctx.globalAlpha=.8;
  if(m==='stab'||m==='stabBack'){const fx=fix(k),sp=fx?null:stabAt(k),p=fx||sp||at(k,'chest'),x=fx||sp?p.x:m==='stabBack'?p.x-11:p.x;R(x-1.5,p.y-1.5,4,4,'#a8372f');R(x,p.y,1,1,'#2a0505');const len=4+((Math.sin(t*2+x)+1)*2|0);R(x,p.y+2,1,len,'#8f1d16');}
  else if(m==='bloodChest'){const p=at(k,'chest');for(let i=0;i<4;i++)R(p.x-1+i,p.y+1,1,8+i*2,'#8f1d16');}
  else if(m==='bruiseChest'||m==='bruiseBelly'||m==='bruiseHip'||m==='bruise'){const p=m==='bruiseHip'?{x:2,y:-31}:at(k,m==='bruiseBelly'?'belly':'chest');P.ctx.globalAlpha=.75;R(p.x-3,p.y-2,6,5,'#6b3a66');R(p.x-2,p.y-1,4,3,'#8a5a78');P.ctx.globalAlpha=1;}
  else if(m==='dent'){const p=at(k,'chest');R(p.x-3,p.y+1,6,1,'#3a1f3a');}
  else if(m==='bruiseNeck'){const p=at(k,'neck');P.ctx.globalAlpha=.8;R(p.x-2,p.y-1,5,3,'#6b3a66');P.ctx.globalAlpha=1;}
  else if(m==='bruiseHead'){P.ctx.globalAlpha=.7;R(P.head.x+3,P.head.y-6,4,3,'#6b3a66');P.ctx.globalAlpha=1;}
  else if(m==='bruiseShoulder'){const p=at(k,k.side==='r'?'rs':'ls');P.ctx.globalAlpha=.8;R(p.x-2,p.y-2,5,4,'#6b3a66');P.ctx.globalAlpha=1;R(p.x-1,p.y-1,3,1,'#3a1f3a');}
  else if(m==='mouthBlood'){const x=P.head.x+5,y=P.head.y+5;R(x,y,1,3+((Math.sin(t*3)+1)*1.5|0),'#8f1d16');R(x-1,y,2,1,'#a8372f');}
  else if(m==='cut'){const p=at(k,'chest');R(p.x-3,p.y,7,1,'#a8372f');R(p.x-2,p.y+1,5,1,'#5a0c09');R(p.x,p.y+2,1,6,'#8f1d16');}
  else if(m==='backCut'){for(let i=0;i<9;i++){R(-9+i*.6,-48+i*1.4,2,1,i%2?'#a8372f':'#5a0c09');}R(-8,-38,1,5+((Math.sin(t*2)+1)*1.5|0),'#8f1d16');R(-5,-41,1,4,'#8f1d16');}
  else if(m==='throat'){const p=at(k,'neck');R(p.x-3,p.y+1,7,1,'#5a0c09');R(p.x-3,p.y+2,7,1,'#a8372f');for(let i=0;i<3;i++)R(p.x-2+i*2,p.y+3,1,4+((Math.sin(t*2.5+i)+1)*2|0),'#8f1d16');}
  else if(m==='shaft'){const p=at(k,'chest'),dir=k.back?-1:1,ty=k.type,L={arrow:11,bolt:7,javelin:18,throwaxe:5}[ty]||9,up=ty==='javelin'?-.35:-.22;
   R(p.x-1,p.y-1,3,3,'#8f1d16');R(p.x,p.y+1,1,4,'#8f1d16');
   if(ty==='throwaxe'){R(p.x-1+dir*1,p.y-3,3,5,'#9aa39b');R(p.x+dir*2,p.y-2,1,3,'#dfe4d2');for(let i=1;i<=L;i++)R(p.x+dir*(2+i),p.y-1+up*i*2,1,1,'#6e5230');}
   else{const c=ty==='javelin'?'#7a5232':'#8a6a3c';for(let i=1;i<=L;i++)R(p.x+dir*i,p.y+up*i,1,1,c);const ex=p.x+dir*L,ey=p.y+up*L;if(ty==='arrow'||ty==='bolt'){R(ex-dir*2,ey-1,2,1,'#f0ead8');R(ex-dir*2,ey+1,2,1,ty==='bolt'?'#4a3a2a':'#b8423a');}}}
  else if(m==='guts'){const p=at(k,'belly');R(p.x-3,p.y-1,6,3,'#3a0a08');for(let i=0;i<9;i++){const sw=Math.sin(t*2.2+i*.9)*(1+i*.15),x=p.x-1+i*.4+sw,y=p.y+2+i*2.3;R(x-1.5,y-1.5,4,3,i%2?'#e0a0a0':'#c97a7a');R(x-.5,y-1.5,1,1,'#fbe0e0');}R(p.x+3,p.y+20,1,5,'#8f1d16');R(p.x-2,p.y+3,1,7,'#8f1d16');}}}
// Zeichenmatrizen kamera- und ortsunabhängig ablegen (nach jeder Figur, Kamera = aktuelle Matrix): Figurenkoordinaten → Feld minus Figurenort.
// arena.js rechnet damit Ein-/Austrittsloch (Getroffener, dieses Bild) und Waffenhand (Angreifer, letztes Bild) exakt ineinander um.
{const prevA=M.afterActor;M.afterActor=(ctx,a)=>{prevA?.(ctx,a);if(!G.active||!a)return;/* Leistung: in großen Schlachten nur für Beteiligte (Stich, Abstechen, Griff, frisch getroffen) */const B=M.s.battle;if(B&&B.actors.length>24&&!(a.pierceContact||a.finisher||a.grabbedBy||a.technique==='groundFinish'||a._lastHit&&(B.time||0)-a._lastHit.t<3||B.actors.some(x=>x.pierceContact?.target===a.id)))return;try{const BI=ctx.getTransform().inverse(),T=new DOMMatrix().translate(-a.x,-a.y).multiply(BI);if(a._decorM)a._vK=T.multiply(a._decorM);if(a._wpM){a._aK=T.multiply(a._wpM);if(a._tipLocal){const q=BI.multiply(a._wpM).transformPoint(new DOMPoint(a._tipLocal.x,a._tipLocal.y));a._tipW={x:q.x,y:q.y,t:M.s.battle?.time||0};}}}catch(e){}};}
{const prev=M.figureDecor;M.figureDecor=function(a,P){prev?.call(this,a,P);if(G.active&&P.layer==='front'&&!P.portrait&&a?.g){a._decorM=P.ctx.getTransform();a._P={head:{...P.head},chest:{...P.chest},pelvis:P.pelvis?{...P.pelvis}:{x:0,y:-30},shoulders:{l:{...P.shoulders.l},r:{...P.shoulders.r}}};if(P.anchors){const A={};for(const k in P.anchors){const q=P.anchors[k];if(q&&q.x!=null)A[k]={x:q.x,y:q.y};}a._anch=A;}if(P.shoulders&&P.mainHand&&P.offHand){const L=(p,q,t)=>({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t}),S=P.shoulders;a._limbL={lua:L(S.l,P.offHand,.3),lfa:L(S.l,P.offHand,.72),lh:{...P.offHand},rua:L(S.r,P.mainHand,.3),rfa:L(S.r,P.mainHand,.72),rh:{...P.mainHand},ls:{...S.l},rs:{...S.r}};if(a._anch)for(const id of ['lua','lfa','lh','rua','rfa','rh','ls','rs'])if(a._anch[id])a._limbL[id]=a._anch[id];}/* Zeichenmatrix: arena.js legt damit Ein- und Austrittsloch exakt fest */if(!P.anchors)drawMarks(a,P,null);G.grabDecor(a,P);}};}
/* Wunden in der Zeichenfolge des Körpers (arena.js): Beine nach den Beinen, Arme nach dem jeweiligen Arm, Rumpf/Kopf nach Rumpf und Kopf –
   so verdecken vorderer Arm, Schild und Waffe eine Wunde dahinter, und jede Wunde sitzt am aktuell gezeichneten Glied */
G.bodyLayer=(a,P)=>{if(G.active&&!P.portrait&&a?.g)drawMarks(a,P,'body');};G.limbLayer=(a,P)=>{if(G.active&&!P.portrait&&a?.g)drawMarks(a,P,P.layer);};
// geblockter Ansturm: mit voller Wucht in die Deckung – kann trotzdem umwerfen (60 % der Chance), sonst zurückgestoßen
G.blocked=ev=>{if(ev?.kind==='block'&&ev.att?.rushHit?.kind==='charge')G.ram(ev.att,ev.def,0,.6);};
{const R=M.combatResponses;if(R?.impact&&!R.__gait){const orig=R.impact;R.impact=(a,b,d,p,w,part)=>{/* für die Nahaufnahme: von welcher Seite, womit, wie getroffen (nur Darstellung) */if(G.active&&a&&b&&!p)b._lastHit={ax:a.x,bx:b.x,tech:a.swingKind||a.technique,wid:w?.id,part,t:M.s.battle?.time||0,back:G.isBack(a,b)};const out=orig.call(R,a,b,d,p,w,part);if(G.trace&&!p)G.trace.hits++;if(G.active&&!p){let pierced=false;if(!G.backRun(a,b,d,w,part)&&!(pierced=!!G.thrust(a,b,d,w,part)))G.special(a,b,d,w,part);/* wer gerade durchbohrt wird, hängt auf der Waffe – kein Umrennen im selben Treffer */if(!pierced)G.ram(a,b,d);}return out;};R.__gait=true;}}


// --------------------------------------------------------------- Erlernbare Sonderattacken (Wunsch Thomas 10.11.)
// Die neuen Verletzungen des Editors kommen im Kampf vor: jede gehört zu einer eigenen Attacke (Kampfmanöver in data.js, Ist/Soll wie alle
// Manöver, wächst nur durch Nutzung). Sie wird nicht gewählt, sondern ergibt sich aus einem passenden Treffer (Waffe, Technik, Stelle);
// Chance je solchem Treffer = Grundwert × Fertigkeit × Wucht × Rüstung der Stelle. Rüstung wirkt bei Stichen/Schnitten stark (e^(−Schutz/8)),
// bei Brüchen durch Wucht schwächer (e^(−Schutz/16)). Jede Verletzung höchstens einmal je Stelle (gebrochen ist gebrochen).
const SP_POINT=['spear','trident','javelin','dagger','gladius','short','rapier','long','greatsword','halberd'],SP_BLUNT=['club','mace','hammer'];
const SPECIALS=G.SPECIALS={
 heartStab:{name:'Herzstich',tech:'thrust',techs:['thrust'],parts:['chest'],ws:['spear','trident','javelin','dagger','gladius','short','rapier','long'],base:.01,arm:8,txt:'HERZSTICH!'},
 lungStab:{name:'Lungenstich',tech:'thrust',techs:['thrust'],parts:['chest'],ws:SP_POINT,base:.044,arm:8,txt:'LUNGE DURCHSTOCHEN!'},
 organStab:{name:'Leber- und Milzstich',tech:'thrust',techs:['thrust'],parts:['belly'],ws:SP_POINT,base:.043,arm:8,txt:null},
 gutting:{name:'Ausweiden',tech:'slash',techs:['slash','spin'],parts:['belly'],ws:['axe','doubleaxe','long','greatsword','gladius','short','halberd'],base:.07,arm:8,txt:'AUSGEWEIDET!'},
 ribBreaker:{name:'Rippenbrecher',tech:'overhead',techs:['slash','overhead','spin','charge'],parts:['chest'],ws:SP_BLUNT,base:.066,arm:16,txt:null},
 pelvisBreaker:{name:'Beckenbrecher',tech:'overhead',techs:['overhead','slash','spin'],parts:['belly'],ws:['hammer','mace'],base:.045,arm:16,txt:'BECKEN GEBROCHEN!'},
 throatBlow:{name:'Kehlschlag',tech:'slash',techs:['slash','overhead','spin','thrust'],parts:['neck'],ws:SP_BLUNT,base:.1,arm:12,txt:'KEHLKOPF ZERTRÜMMERT!'},
 collarBreaker:{name:'Schlüsselbeinbrecher',tech:'overhead',techs:['overhead'],parts:['ls','rs'],ws:[...SP_BLUNT,'axe','doubleaxe'],base:.15,arm:14,txt:'SCHLÜSSELBEIN GEBROCHEN!'},
 neckBreaker:{name:'Genickbrecher',tech:'overhead',techs:['overhead','slash'],parts:['neck'],ws:SP_BLUNT,base:.12,arm:12,rear:true,txt:'GENICK GEBROCHEN!'}};
// Fertigkeit (Kampfmanöver Ist 0–100): 0 → ×0,3, 50 → ×1, 100 → ×1,7; fehlt der Wert (alter Spielstand), zählt die verwandte Grundtechnik halb
const SP_FROM={pierce:'thrust',heartStab:'thrust',lungStab:'thrust',organStab:'thrust',gutting:'slash',ribBreaker:'overhead',pelvisBreaker:'overhead',throatBlow:'slash',collarBreaker:'overhead',neckBreaker:'overhead'};
G.skillOf=(a,key)=>{const m=a?.g?.moves||{};return m[key]??(m[SP_FROM[key]]??20)*.5;};
G.skillF=(a,key)=>.3+1.4*cl(G.skillOf(a,key)/100,0,1);
// welche Sonderattacke ein Treffer auslösen kann (für Testreihe und Anzeige)
G.specialFits=(a,b,w,id,tech)=>{const out=[];if(!w||w.ammo||!b?.g)return out;for(const [key,S] of Object.entries(SPECIALS)){if(!S.ws.includes(w.id)||!S.parts.includes(id)||!S.techs.includes(tech))continue;if(S.rear&&!G.isBack(a,b))continue;out.push(key);}return out;};
// Rüstung der Stelle: e^(−Schutz/k), k wächst mit der Wucht (wuchtige Treffer kommen eher durch): Stich/Schnitt k=8·(1+Schaden/30), Wucht k=16·(1+Schaden/30)
G.armorF=(armor,k,dmg)=>Math.exp(-(armor||0)/(k*(1+cl(dmg||0,0,60)/30)));
G.specialChance=(a,b,w,id,dmg,key)=>{const S=SPECIALS[key];if(!S)return 0;const armor=M.armorProtection?.(b.g,id)||0;return cl(S.base*P.specialRate*G.skillF(a,key)*cl((dmg||0)/15,.5,1.6)*G.armorF(armor,S.arm,dmg),0,.35);};
const spDone=(B,key,id)=>{const q=B[id]||{};switch(key){case 'ribBreaker':return !!B.chest.fracture;case 'pelvisBreaker':return !!B.belly.fracture;case 'collarBreaker':return !!q.fracture;case 'throatBlow':case 'neckBreaker':return !!B.neck.fracture;case 'gutting':return !!B.belly.gutted;case 'lungStab':return !!B.chest.lungHit;case 'organStab':return !!B.belly.organHit;default:return false;}};
G.special=(a,b,dmg,w,id)=>{
 if(!G.active||!P.specials||!b?.g||b.g.dead||!a?.g||a.pierceContact||!w||w.ammo||b.down)return false;const part=b.g.body[id];if(!part||part.missing)return false;
 const tech=a.swingKind==='charge'||a.rushHit?.kind==='charge'?'charge':a.swingKind||a.technique;const fits=G.specialFits(a,b,w,id,tech);if(!fits.length)return false;
 for(const key of fits){if(spDone(b.g.body,key,id))continue;M.learn?.(a,'moves',key,.008);if(G.trace)G.trace.elig[key]=(G.trace.elig[key]||0)+1;const ch=P.specialForce===key||P.specialForce===1?1:G.specialChance(a,b,w,id,dmg,key);if(G.trace)G.trace.exp[key]=(G.trace.exp[key]||0)+ch;if(M.rng()>ch)continue;
  const S=SPECIALS[key];let kind=key==='heartStab'?'heart':key==='lungStab'?'lung':key==='organStab'?(M.rng()<.5?'liver':'spleen'):key==='gutting'?'gutted':key==='pelvisBreaker'?'pelvis':key==='throatBlow'?'larynx':key==='collarBreaker'?'collarbone':key==='neckBreaker'?'neckbreak':'ribs';
  if(key==='ribBreaker'){const r=M.rng();kind=(w.id==='hammer'||w.id==='mace')&&dmg>=18&&r<.4?'ribseries':tech==='overhead'&&r>.75?'sternum':'ribs';}
  if(key==='lungStab')b.g.body.chest.lungHit=true;if(key==='organStab')b.g.body.belly.organHit=true;if(key==='gutting')b.g.body.belly.gutted=true;
  M.recordAttack?.(a,key);M.learn?.(a,'moves',key,.06);a.specials=(a.specials||0)+1;
  const name=NEW_NAME[kind],res=G.applyInjury(a,b,kind,id,w.id,name);try{M.noteInjury?.(b.g,id,name);}catch(e){}
  b.hit=.4;M.shake=Math.max(M.shake||0,5);M.sound?.(SP_BLUNT.includes(w.id)?'heavy':'stick');M.voice?.('pain',M.voicePitch?.(b.g)??1,true);M.floater?.(b.x,b.y-60,S.txt||name.toUpperCase()+'!','#ff5a4a');
  if(w.item&&!SP_BLUNT.includes(w.id))w.item.blood=Math.max(w.item.blood||0,.8);
  if(res==='death')M.death?.(b,name,a);else if(res==='down')M.knockdown?.(b,name,key==='gutting'?6:4);else if(kind==='ribseries'||kind==='larynx')b.stun=Math.max(b.stun||0,.6);
  ev('special',a,{b,key,inj:kind,part:id,weapon:w.id,dmg,result:res||null});return true;}
 return false;};

// --------------------------------------------------------------- Angriffe von hinten im Lauf (Vorschlag, nur Gang-Editor)
// Wer im Lauf (Sprint, Ansturm, Ausholen im Lauf) einen Gegner von hinten trifft, der ihm den Rücken zudreht, macht mehr Schaden
// (×backDmg) und bekommt eine Sonderattacke je Waffe:
//  Stichwaffen: Durchstich von hinten (dreifache Durchstich-Chance, Rüstung der Stelle zählt; geht so weit durch, wie die Waffe reicht)
//  Dolch, Kurzschwert, Gladius: Griff von hinten – Arm um den Hals, dann Kehle durchschneiden oder Stiche in die Niere
//  starke Kämpfer: Würgegriff mit Genickbruch
//  Keule, Streitkolben, Hammer: Schlag auf den Hinterkopf (Schädelbruch, oft umgeworfen)
//  Äxte, Langschwert, Zweihänder, Hellebarde (Hieb): Hieb in den Rücken, Rücken aufgehackt, oft umgeworfen
const GRAB_W=new Set(['dagger','short','gladius']),BACK_CHOP=new Set(['axe','doubleaxe','long','greatsword','halberd','throwaxe']);
G.isBack=(a,b)=>Math.abs(ad(Math.atan2(a.y-b.y,a.x-b.x),b.a||0))>2.1;
const runningHit=a=>{const r=a.rushHit,T=M.s.battle.time;return !!(r&&T-r.t<1.6)||a.backRush!=null&&T-a.backRush<2.5||!!a.runAttack||(a.gaitSpeed||a.gv||0)>(a.gaitBase||80)*.85;};
G.backMode=(a,b,w,tech)=>{const st=a.g.stats?.strength||50,armNeck=(M.armorProtection?.(b.g,'neck')||0)>6;
 if(tech==='thrust'&&PIERCE_BASE[w.id])return 'through';
 if(GRAB_W.has(w.id)&&M.rng()<P.backGrab)return M.rng()<(w.id==='dagger'?.6:.4)&&!armNeck?'throat':'kidney';
 if(!w.twoHand&&st>62&&M.rng()<.25)return 'neck';
 if(!w.bladed)return 'skull';if(BACK_CHOP.has(w.id))return 'chop';if(PIERCE_BASE[w.id])return 'through';return 'chop';};
G.backRun=(a,b,dmg,w,id,force)=>{if(!G.active||!P.backRun||!b?.g||b.g.dead||b.down||a.pierceContact||!w||w.ammo)return false;
 if(!force&&(!G.isBack(a,b)||!runningHit(a)))return false;const mode=force||G.backMode(a,b,w,a.swingKind);
 const part=b.g.body[id]||b.g.body.chest,extra=dmg*(P.backDmg-1);part.hp=Math.max(0,part.hp-extra);a.damage+=extra;b.taken+=extra;M.shake=Math.max(M.shake||0,6);
 ev('backRun',a,{b,mode,part:id,weapon:w.id,dmg:dmg+extra});
 if(mode==='through'){const pid=['chest','belly'].includes(id)?id:(M.rng()<.6?'chest':'belly');return !!G.thrust(a,b,dmg,w,pid,{back:true});}
 if(mode==='throat'||mode==='kidney'||mode==='neck'){G.grab(a,b,mode);return true;}
 if(mode==='skull'){M.floater?.(b.x,b.y-62,'HINTERKOPF!','#ff5a4a');if(M.rng()<.55)G.applyInjury(a,b,'skullfracture','head',w.id);if(M.rng()<P.backKnock+.1)M.knockdown?.(b,'Schlag auf den Hinterkopf',2.8);return true;}
 if(mode==='chop'){M.floater?.(b.x,b.y-60,'RÜCKEN AUFGEHACKT!','#ff5a4a');G.applyInjury(a,b,'deepcut','chest',w.id);(b.g.gaitMarks||(b.g.gaitMarks=[])).push({m:'backCut',part:'chest'});if(M.rng()<P.backKnock)M.knockdown?.(b,'Hieb in den Rücken',2.4);return true;}
 return false;};
// Griff von hinten: Arm um den Hals, der Gepackte wird vor dem Körper gehalten (kann sich nicht wehren), dann der Stich oder Schnitt
const GRAB_TXT={throat:'KEHLE DURCHGESCHNITTEN!',kidney:'IN DIE NIERE!',neck:'GENICK GEBROCHEN!'};
G.grab=(a,b,mode)=>{const w=M.weapon(a);a.pierceContact={target:b.id,part:mode==='kidney'?'belly':'neck',left:P.grabTime,len:P.grabTime,weaponId:w.item?.id,grab:mode,t:0,stabs:0};a.swing=0;a.pendingStrike=null;a.wind=0;a.state='piercing';
 b.stun=Math.max(b.stun||0,P.grabTime+.3);b.grabbedBy=a.id;b.wind=0;b.swing=0;b.block=false;b.hit=.4;b.facePain=1.6;M.voice?.('pain',M.voicePitch?.(b.g)??1,true);M.floater?.(b.x,b.y-64,'GEPACKT!','#ffcf6a');M.sound?.('grab');ev('grab',a,{b,mode});};
G.grabStep=(a,b,f,dt)=>{f.t=(f.t||0)+dt;const k=f.t/(f.len||1.7),face=Math.cos(a.a||0)>=0?1:-1,sc=a.g.height/180*1.14,w=M.weapon(a);
 // der Gepackte steht dicht vor dem Angreifer, mit dem Rücken zu ihm
 const tx=a.x+face*19*sc,ty=a.y+1.2,r=Math.min(1,dt*14);b.x+=(tx-b.x)*r;b.y+=(ty-b.y)*r;b.a=a.a;b.stun=Math.max(b.stun||0,.2);if(b.hit>0)b.hit=Math.max(0,b.hit-dt*1.5);/* Trefferaufhellung klingt ab (gesteuerte Figuren tun das sonst nicht) */b.facePain=Math.max(b.facePain||0,1);b.moveSpeed=0;
 const cp=G.anchor(b,f.part);a.contactPoint=cp;
 if(f.grab==='kidney'){const at=[.32,.5,.68];while(f.stabs<at.length&&k>=at[f.stabs]){f.stabs++;b.hit=.35;M.sound?.('stick');M.emit?.(cp.x-face*4,cp.y,8,'#aa3c36',70);M.voice?.('pain',M.voicePitch?.(b.g)??1,true);if(f.stabs===1){f.result=G.applyInjury(a,b,'kidney','belly',w.id,'Nierenverletzung');f.cut=true;M.floater?.(b.x,b.y-58,GRAB_TXT.kidney,'#ff5a4a');ev('backFinish',a,{b,mode:'kidney',part:'belly',kind:'kidney',weapon:w.id});}}}
 else if(!f.cut&&k>=.45){f.cut=true;b.hit=.45;M.shake=Math.max(M.shake||0,5);
  if(f.grab==='throat'){f.result=G.applyInjury(a,b,'deepcut','neck',w.id,'Kehle durchgeschnitten');M.emit?.(cp.x+face*6,cp.y,30,'#aa3c36',140);M.pixelBloodJet?.(b,'neck',true);if(w.item)w.item.blood=Math.max(w.item.blood||0,.9);(b.g.gaitMarks||(b.g.gaitMarks=[])).push({m:'throat',part:'neck'});}
  else{f.result=G.applyInjury(a,b,'neckbreak','neck',w.id,'Genickbruch');M.sound?.('heavy');}
  M.floater?.(b.x,b.y-58,GRAB_TXT[f.grab],'#ff5a4a');ev('backFinish',a,{b,mode:f.grab,part:'neck',kind:f.grab==='throat'?'deepcut':'neckbreak',weapon:w.id});}
 if(f.grab==='throat'&&f.cut&&k<.95&&M.rng()<dt*16)M.emit?.(cp.x+face*5,cp.y+2,2,'#9d2f2a',50);
 if(f.left<=dt*1.5&&!f.out){f.out=true;b.grabbedBy=null;if(!f.studio){if(f.result==='death')M.death?.(b,f.grab==='throat'?'Kehle durchgeschnitten':'Genickbruch',a);else M.knockdown?.(b,'Von hinten gepackt',2.2);}}};
// Bild: der Unterarm des Angreifers liegt quer über dem Hals des Gepackten, die Klinge an der Kehle bzw. in der Niere
G.grabDecor=(v,P)=>{if(!v.grabbedBy)return;const a=M.s.battle?.actors.find(x=>x.id===v.grabbedBy),f=a?.pierceContact;if(!f?.grab)return;
 const R=(x,y,w,h,c)=>{P.ctx.fillStyle=c;P.ctx.fillRect(Math.round(x),Math.round(y),w,h);},k=f.t/(f.len||1.7),skin=a.g.appearance?.skin||'#b89066',dk=mixC(skin,'#000',.3),nx=P.head.x,ny=-56;
 // Unterarm von hinten über den Hals, Hand am Kinn bzw. am Kopf
 const squeeze=f.grab==='neck'&&k>.4?Math.sin(Math.min(1,(k-.4)/.1)*Math.PI/2):0;
 R(nx-10,ny-1.5,15,4,dk);R(nx-10,ny-1,15,3,skin);R(nx+4,ny-3-squeeze*3,4,4,skin);R(nx+4,ny-3-squeeze*3,1,4,dk);
 if(f.grab==='neck'){R(nx-4,P.head.y-7,6,4,skin);R(nx-4,P.head.y-7,6,1,dk);}
 const w=M.weapon(a),L=w.id==='dagger'?7:w.id==='short'?9:10,met='#c9d0c4',edge='#eef2e2';
 if(f.grab==='throat'){const s=k<.35?0:k<.55?(k-.35)/.2:1,x=nx+6-s*12,y=ny+3;if(k>.25&&k<.9){R(x,y,L,2,met);R(x,y,L,1,edge);R(x+L,y,3,3,'#6e5230');}
  if(s>0){R(nx+6-s*12,ny+2,s*12,1,'#5a0c09');if(s>=1)for(let i=0;i<5;i++)R(nx-5+i*2.4,ny+3,1,2+((Math.sin((P.time||0)*6+i)+1)*2|0),'#8f1d16');}}
 if(f.grab==='kidney'){const j=Math.max(0,Math.sin(k*Math.PI*5.5)),x=-9+j*4;if(k>.2&&k<.85){R(x-4,-34,4,3,skin);if(j<.6)R(x,-33,3-j*2,2,met);}R(-6,-33,2,2,'#a8372f');}};
const mixC=(a,b,t)=>{const p=c=>{c=c.replace('#','');if(c.length===3)c=[...c].map(x=>x+x).join('');return [0,2,4].map(i=>parseInt(c.slice(i,i+2),16));},A=p(a),B=p(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');};
// --------------------------------------------------------------- Initiative und Abstechen
const CRIES=['STIRB!','JETZT!','FÜR DIE EHRE!','HAAA!','BLEIB LIEGEN!'];
const cryText=a=>CRIES[((a.seed||0)+(a.finCount||0))%CRIES.length];
const AXES=new Set(['axe','doubleaxe','throwaxe']),/* Äxte hacken, sie stechen nie */CHOP=new Set(['axe','doubleaxe','halberd','greatsword','long']),PIERCE=new Set(['spear','trident','javelin','dagger','gladius','short','rapier']);
const BLUNT_LIKE=w=>!w.bladed;
function onGroundA(t){return !(t.kneeTimer>0)&&(t.down||t.fallTimer>(t.riseDuration||1.25)&&(t.fallDuration-t.fallTimer)>=.35);}
function weakness(a,t){if(!t||t.g.dead||t.surrendered||t.rex)return null;if(onGroundA(t)||t.fallTimer>0)return 'ground';if(t.kneeTimer>0)return 'knee';if(t.stagger>0)return 'stagger';
 const back=Math.abs(ad(Math.atan2(a.y-t.y,a.x-t.x),t.a||0))>2.1,busy=t.target&&t.target!==a.id;return back&&busy?'back':null;}
const WEAK={ground:'am Boden',knee:'auf den Knien',stagger:'taumelt',back:'dreht den Rücken zu'};
// Wer eine Schwäche sieht (am Boden, kniet, taumelt, Rücken), stürzt sofort mit Schrei darauf zu und ist schlagbereit
function seize(a,o){
 if(!P.seize||o.isRanged||M.weapon(a).ammo||a.energy<16)return null;const b=M.s.battle;let best=null,bd=P.seizeRange;
 for(const t of b.actors){if(t.team===a.team)continue;const k=weakness(a,t);if(!k)continue;if(k==='ground'&&t.down&&b.actors.some(x=>x.team===t.team&&!x.down&&!x.g.dead&&!x.surrendered))continue;const d=Math.hypot(t.x-a.x,t.y-a.y);if(d<bd){bd=d;best={t,k,d};}}
 if(!best)return null;
 // nicht, wenn ihn gerade jemand anderes angreift und gleich trifft
 if(b.actors.some(x=>x.team!==a.team&&x!==best.t&&!x.down&&!x.g.dead&&x.target===a.id&&(x.wind>0||x.swing>0)&&Math.hypot(x.x-a.x,x.y-a.y)<90))return null;
 if(a.target!==best.t.id||a.seizeOn!==best.t.id+best.k){a.target=best.t.id;a.seizeOn=best.t.id+best.k;if(best.k==='back')a.backRush=M.s.battle.time;a.cool=Math.min(a.cool||0,.1);a.retreat=0;a.flankTimer=0;
  if(best.d>70){a.shoutTimer=.8;a.cried=true;M.voice?.('battlecry',pitch(a),true);M.floater?.(a.x,a.y-62,cryText(a),'#ffcf6a');}ev('seize',a,{b:best.t,why:best.k});}
 return best;}
// Abstechen: weit ausholen (mit Schrei), dann die Waffe mit voller Wucht hineinrammen
// Abstechen: Stelle am Boden zuerst wählen (beim Ausholen), dann stellt sich der Angreifer genau daneben hin und haut senkrecht von oben hinein
const pickPart=(a,b)=>{const w=M.weapon(a),B=b.g.body,r=M.rng();if(!w.bladed&&!['spear','trident','javelin'].includes(w.id)&&!B.head.missing&&r<.85)return 'head';/* Keule, Streitkolben, Hammer: auf den Kopf */if(CHOP.has(w.id)){if(r<.45&&!B.neck.missing)return 'neck';const limbs=['lua','rua','lt','rt'].filter(id=>!B[id].missing);if(r<.8&&limbs.length)return limbs[Math.floor(M.rng()*limbs.length)];}
 if(r<.6&&!B.head.missing)return 'head';return B.chest.missing?null:(M.rng()<.6?'chest':'belly');};
G.finPart=(a,b)=>a.finisher?.part&&a.finisher.target===b.id&&!b.g.body[a.finisher.part]?.missing?a.finisher.part:pickPart(a,b);
// Lage der Körperstellen am liegenden Körper (wie contactAnchor im Spiel, dazu Arme, Beine, Füße)
const LIE={head:[0,-62],neck:[0,-56],chest:[2,-41],belly:[0,-35],ls:[-4,-49],rs:[4,-49],lua:[-5,-43],rua:[5,-43],lfa:[-5,-34],rfa:[5,-34],lh:[-5,-27],rh:[5,-27],lt:[-3,-22],rt:[3,-22],lsh:[-3,-11],rsh:[3,-11],lf:[-3,-2],rf:[3,-2]};
G.partLocal=(b,id)=>{const P=b._P;if(!P)return null;return PARTPOS[id]?.(P)||b._limbL?.[id]||(LIMB_Y[id]!=null?{x:P.chest.x*.4+(id[0]==='r'?2:-1),y:LIMB_Y[id]}:PARTPOS.chest(P));};
G.anchor=(b,id)=>{if(!b)return null;/* genau dort, wo die Stelle im letzten Bild gezeichnet wurde (stehend, kniend, liegend – über die Zeichenmatrix) */
 const l=b._vK&&G.partLocal(b,id);if(l){try{const q=new DOMMatrix().translate(b.x,b.y).multiply(b._vK).transformPoint(new DOMPoint(l.x,l.y));return {x:q.x,y:q.y};}catch(e){}}
 if(!onGroundA(b)&&!(b.fallTimer>0))return M.contactAnchor?.(b,id)||{x:b.x,y:b.y-30};
 const sc=b.g.height/180*1.14,wide=cl(.85+b.g.weight/420,.98,1.18)*(b.g.statureWide||1),face=Math.cos(b.a||0)>=0?1:-1,rot=(b.fallSide||-1)*1.35,[x,y]=LIE[id]||LIE.chest;
 return {x:b.x+(12+Math.cos(rot)*x-Math.sin(rot)*y)*sc*wide*face,y:b.y+(5+Math.sin(rot)*x+Math.cos(rot)*y)*sc};};
// Waffenlänge Hand→Spitze in Figureneinheiten (Zeichnung: Klingenmaß × 0,8 / 1,14)
const TIPL={dagger:17,short:36,gladius:40,long:48,greatsword:56,spear:55,javelin:45,trident:55,halberd:41,axe:37,doubleaxe:29,throwaxe:22,club:30,mace:27,hammer:30,fist:4};
// gemessene Feinkorrektur der Hand je Waffe (Griffversatz bei Zweihandwaffen, Kopfmitte bei Keulen), Figureneinheiten
const FCORR={trident:[15,-5],spear:[4.5,-6],javelin:[4.5,-6],long:[-5.3,-2],greatsword:[-8.7,-11],axe:[11,9],halberd:[-11,-16],doubleaxe:[6,-2],mace:[-6,-3.6],hammer:[-6,-4.4],club:[0,4.7]};
const finGeo=a=>{const w=M.weapon(a),chop=CHOP.has(w.id)||!w.bladed;return {chop,an:chop?1.22:Math.PI/2,tipL:(TIPL[w.id]||30)*.7,pen:chop?1:1,reachX:chop?14:20};/* Stich: Hände weiter vorn, damit der Oberkörper die Stelle nicht verdeckt */};
// Standplatz: neben der Stelle (zwischen Stelle und Körpermitte, nie hinter dem Kopf hinaus), etwas VOR dem Liegenden (zur Kamera hin):
// so wird der Angreifer über dem Liegenden gezeichnet, die ganze Waffe ist bis zur Wunde sichtbar und endet genau dort (der Rest steckt im Körper)
G.finSpot=(a,t,part)=>{const W=G.anchor(t,part||'chest');if(!W)return null;const o=finGeo(a),sc=a.g.height/180*1.14*cl(.85+a.g.weight/420,.98,1.18)*(a.g.statureWide||1);
 let face=Math.abs(W.x-t.x)<10?(a.x<=W.x?1:-1):(W.x>=t.x?1:-1);const px=o.reachX+(o.chop?Math.cos(o.an)*(o.tipL-o.pen):0);
 /* Thomas 10.11.: mit nur 4 vor dem Liegenden standen die Füße auf dessen Körper, die Figur schien zu schweben – jetzt klar davor auf dem Boden */
 return {x:W.x-face*px*sc,y:t.y+G.FIN_DY,face,W};};
G.FIN_DY=14;
function finStart(a){if(a.finisher&&a.finisher.started||a.technique!=='groundFinish')return;const t=M.s.battle.actors.find(x=>x.id===a.target);a.finCount=(a.finCount||0)+1;a.finisher={target:a.target,started:true,part:a.finisher?.part||(t?pickPart(a,t):null)};
 const sp=t&&G.finSpot(a,t,a.finisher.part),d=sp?Math.hypot(sp.x-a.x,sp.y-a.y):0;a.wind*=P.finWind;a.windMax*=P.finWind;if(d>6){const add=Math.min(1.2,d/150);a.wind+=add;a.windMax+=add;}
 a.shoutTimer=Math.max(a.shoutTimer||0,1);M.voice?.('battlecry',pitch(a),true);M.floater?.(a.x,a.y-66,cryText(a),'#ff8a5a');ev('finStart',a,{part:a.finisher.part});}
// beim Ausholen zur Stelle gehen (Kampfschritt), dann stehen bleiben und zur Stelle drehen
G.finStep=(a,dt)=>{const f=a.finisher;if(!f?.part)return;const t=M.s.battle.actors.find(x=>x.id===f.target);if(!t)return;const sp=G.finSpot(a,t,f.part);if(!sp)return;f.spot=sp;
 const dx=sp.x-a.x,dy=sp.y-a.y,d=Math.hypot(dx,dy);a.a=sp.face>0?0:Math.PI;if(a.puppet?.hold){a.puppet.drive={x:sp.x,y:sp.y,v:a.wind>0?120:0,face:a.a};a.state=d>.5&&a.wind>0?'move':a.state;return;}if(d>.5&&a.wind>0){const st=Math.min(d,150*dt);a.x+=dx/d*st;a.y+=dy/d*st;a.moveSpeed=st/dt;a.phase=(a.phase||0)+dt*a.moveSpeed*.16;}else a.moveSpeed=0;};
// Haltung beim Abstechen (arena.js): beide Hände hoch über den Kopf, zurücklehnen – dann mit Ausfallschritt und tief gebeugt
// senkrecht hinein, genau auf die Stelle; Waffenlänge je Waffe (TIPL)
const ease=t=>t<0?0:t>1?1:t*t*(3-2*t);
// Haltung im Griff von hinten: freie Hand um den Hals, Waffenhand an Kehle bzw. Niere (Klinge zielt in den Körper, kommt vorn nicht heraus)
function grabPose(a,sc,scY){const f=a.pierceContact,b=M.s.battle?.actors.find(x=>x.id===f.target);if(!b||!sc)return null;const face=Math.cos(a.a||0)>=0?1:-1,sy=scY||sc,drop=2,L=v=>({x:(v.x-a.x)*face/sc,y:(v.y-a.y)/sy-drop}),k=(f.t||0)/(f.len||1.7);
 const neck=L(G.anchor(b,'neck')),belly=L(G.anchor(b,'belly')),tipL=(TIPL[M.weapon(a).id]||30)*.7,off={x:neck.x+4,y:neck.y+1};let main,angle;
 if(f.grab==='kidney'){const j=Math.max(0,Math.sin(k*Math.PI*5.5)),an=1.0,T={x:belly.x-6,y:belly.y+2},dep=k>.2&&k<.85?2+j*9:-4;main={x:T.x-Math.cos(an)*(tipL-dep),y:T.y-Math.sin(an)*(tipL-dep)};angle=an;}
 else if(f.grab==='throat'){const s=k<.35?0:k<.55?(k-.35)/.2:1;angle=-.08;main={x:neck.x-2+s*2-Math.cos(angle)*tipL,y:neck.y+3-Math.sin(angle)*tipL};/* Hand hinter dem Kopf des Gepackten, Spitze genau an der Kehle (Schnitt zeichnet grabDecor vorn) */}
 else{const head=L(G.anchor(b,'head'));main={x:head.x+2,y:head.y+2};angle=-1.2;}
 return {lean:4,drop,main,off,angle};}
G.finPose=(a,sc,scY)=>{if(G.active&&a.pierceContact?.grab)return grabPose(a,sc,scY);if(!G.active||!a.finisher&&!(a.wind>0))return null;const w=M.weapon(a),o=finGeo(a),chop=o.chop,shield=!!M.usableShield?.(a)&&!w.twoHand;
 let u,low;if(a.wind>0){u=ease(1-a.wind/Math.max(.01,a.windMax||.5));low=0;}else{const s=1-a.swing/Math.max(.01,a.swingMax||.4);u=1;low=s<.45?ease(s/.45):a.finHold>0||s<.72?1:1-ease((s-.72)/.28)*.65;}/* unten kurz stehen lassen: die Waffe sitzt */
 const f=a.finisher,t=M.s.battle?.actors.find(x=>x.id===(f?.target||a.target)),face=Math.cos(a.a||0)>=0?1:-1,bend=chop?1:o.tipL>30?.3:.7,drop=11*low*bend+1.5*u;
 let deep;const W=t&&f?.part?G.anchor(t,f.part):null;
 if(W&&sc){const sy=scY||sc,pt={x:(W.x-a.x)*face/sc,y:(W.y-a.y)/sy-(11*low+1.5*u)}/* gemessen: Hand folgt der vollen Beuge, auch wenn der Körper weniger tief geht */;const c=FCORR[w.id]||[0,0];deep={x:pt.x-Math.cos(o.an)*(o.tipL-o.pen)+c[0],y:pt.y-Math.sin(o.an)*(o.tipL-o.pen)+c[1]};}

 else{let tx=26;if(t&&sc)tx=cl((t.x-a.x)*face/sc,16,34);deep=chop?{x:tx-2,y:-30}:{x:tx-4,y:-34};}
 const top={x:2,y:-86},raise={x:14+(top.x-14)*u,y:-50+(top.y+50)*u};
 const m={x:raise.x+(deep.x-raise.x)*low,y:raise.y+(deep.y-raise.y)*low};
 const up=chop?-1.1+(-2.45+1.1)*u:1.5,an=up+(o.an-up)*low;/* Hieb: über den Kopf zurück, Stich: Spitze nach unten über dem Kopf */
 return {lean:-5*u*(1-low)+13*low*bend,drop,main:m,off:shield?{x:-5+3*low,y:-42+6*low}:{x:m.x-3,y:m.y+5},angle:an};};
G.hold=(a,dt)=>{if(!(a.finHold>0))return;a.finHold-=dt;a.swing=Math.max(a.swing||0,(a.swingMax||.4)*.5);a.moveSpeed=0;const t=M.s.battle.actors.find(x=>x.id===a.finisher?.target);if(t&&a.contactPoint&&M.rng()<dt*8)M.emit?.(a.contactPoint.x,a.contactPoint.y,2,'#9d2f2a',30);if(a.finHold<=0){a.finisher=null;if(t&&a.contactPoint)M.emit?.(a.contactPoint.x,a.contactPoint.y,12,'#aa3c36',90);M.sound?.('stick');}};
function finImpact(a,b,dmg,w,id){
 const fin=a.finisher;if(!fin||!b?.g)return;const tipW=G.tipAt(a,b,id);a.contactPoint=tipW||G.anchor(b,id)||a.contactPoint;const part=b.g.body[id];if(!part)return;const B=b.g.body;let what;
 // Wucht: mehr Schaden
 const extra=dmg*(P.finDmg-1);part.hp=Math.max(0,part.hp-extra);a.damage+=extra;b.taken+=extra;
 if(CHOP.has(w.id)&&['neck','lua','rua','lt','rt'].includes(id)&&M.rng()<P.finSever+dmg*.004){what=id==='neck'?'beheaded':'severed';M.sever(a,b,id);}
 else if(!BLUNT_LIKE(w)&&(PIERCE.has(w.id)||w.bladed&&!AXES.has(w.id))&&!['lua','rua','lt','rt'].includes(id)){what='pierced';part.bleed+=3;part.deepStabs=(part.deepStabs||0)+1;if(id==='chest'||id==='belly')part.internal??={days:35,severe:true};/* wie sim.js: mit Heiltagen, sonst stürzt das Krankenhaus ab (Thomas 10.11.) */M.recordWound?.(b.g,id,'Durchbohrt',a.g.name,w.name,dmg);a.finHold=P.finHold;M.pixelBloodJet?.(b,id,false);}
 else{what=w.bladed?'hacked':'crushed';part.bleed+=w.bladed?2:.5;}
 M.shake=Math.max(M.shake||0,7);const cp=a.contactPoint||{x:b.x,y:b.y-10};M.emit?.(cp.x,cp.y,26,'#aa3c36',120);
 const label={beheaded:'KOPF AB!',severed:M.partName?.(id)?.toUpperCase()+' AB!',pierced:'DURCHBOHRT!',hacked:'HINEINGEHACKT!',crushed:'ZERSCHMETTERT!'}[what];M.floater?.(b.x,b.y-48,label,'#ff5a4a');
 if(!M.s.battle.cinematic)M.s.battle.cinematic={x:b.x,y:b.y-18,left:1.6,duration:1.6};
 if(what==='crushed'&&id==='head'){part.hp=Math.min(part.hp,4);part.bleed+=2;part.fracture={days:60,total:60,severe:true,skull:true};part.skullFracture=true;part.skullBy=w.id;}
 if(what==='pierced'){const mk={m:'stab',part:id};(b.g.gaitMarks||(b.g.gaitMarks=[])).push(mk);G.markAt(b,mk,tipW||G.anchor(b,id));}
 ev('finisher',a,{b,what,part:id,dmg:dmg+extra,weapon:w.id,down:true});if(what!=='pierced')a.finisher=null;}
{const R=M.combatResponses;if(R?.groundImpact&&!R.__gaitG){const orig=R.groundImpact;R.groundImpact=(a,b,d,w,id)=>{const out=orig.call(R,a,b,d,w,id);if(G.active)finImpact(a,b,d,w,id);return out;};R.__gaitG=true;}}

// --------------------------------------------------------------- KI-Haken (sim.js updateActor)
G.drive=(a,o)=>{
 if(!G.active||a.gaitOff)return null;
 const T=M.T,b=M.s.battle,t=b?.time||0,dt=o.dt;
 if(a.gaitT==null||t-a.gaitT>.15){a.gv=0;a.gdir=undefined;}// nach Schlag/Taumeln/Ausweichen: aus dem Stand
 a.gaitT=t;
 a.runAttack=null;const base=o.speed/(a.sprinting?T.sprintMult:1),l=Math.hypot(o.vx,o.vy),gap=o.d-o.keep;
 const sz=seize(a,o);
 let mode;
 if(sz&&sz.t===o.target&&o.d>40)mode=sz.d>110?'sprint':'jog';
 else if(l<.05)mode='stand';
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
 const v=physics(a,mode,sz&&sz.t===o.target&&o.d>40?Math.atan2(sz.t.y-a.y,sz.t.x-a.x):l>=.05?Math.atan2(o.vy,o.vx):null,base,o.ef,dt,cap);
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
 /* Trefferaufhellung klingt auch bei gesteuerten Figuren ab (sonst bleibt der Rumpf hell wie durchsichtig) */if(a.hit>0)a.hit=Math.max(0,a.hit-dt);
 /* hold: der Editor steuert die Figur selbst (Nahaufnahmen-Studio); Wege (drive) laufen hier im Simulationsschritt,
    damit Schrittlänge, Beine und Tempo wie bei echter Bewegung entstehen (sonst gleitet die Figur) */
 if(a.puppet.hold){const D=a.puppet.drive;if(D){const dx=D.x-a.x,dy=D.y-a.y,d=Math.hypot(dx,dy),st=Math.min(d,(D.v??1e9)*dt);if(d>.01){a.x+=dx/d*st;a.y+=dy/d*st;}if(D.face!=null)a.a=D.face;if(d-st<.01&&D.once)a.puppet.drive=null;}return;}
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
// Einstellung im Spiel (neben „Nahaufnahmen bei Verletzungen“): Natürliche Kampfbewegungen an/aus
{const opts=M.injuryOptions;if(typeof opts==='function'&&!opts.__gait){M.injuryOptions=(...x)=>opts(...x)+`<div class="list-row"><span>Natürliche Kampfbewegungen<br><small>Gehen, Laufen, Sprinten, Ansturm mit Kampfschrei, Durchstich, Abstechen am Boden, Angriffe von hinten, Wunden auf den Figuren mit Heilung.</small></span><select class="select" id="gaitRules"><option value="on"${M.s.options?.gaitRules!==false?' selected':''}>An</option><option value="off"${M.s.options?.gaitRules===false?' selected':''}>Aus</option></select></div>`;M.injuryOptions.__gait=true;}
 const change=M.schoolChange;M.schoolChange=ev=>{if(ev?.target?.id==='gaitRules'){M.s.options.gaitRules=ev.target.value!=='off';M.persist?.();return true;}return change?.(ev);};}

// Wunden aus dem echten Kampf auf die Figur (Thomas 09.11.: ins Spiel einbinden): jede vom Spiel verbuchte Wunde (recordWound,
// noteInjury) bekommt ihr Bild an der Stelle – wenn die Waffe gerade dort sitzt, genau an der Spitze. Pfeile stecken bis Kampfende.
// Gleiche Art an gleicher Stelle im selben Kampf nur einmal; Heilung und Narben über G.markStage.
{const add=(g,part,injury,attName,weapon)=>{if(!G.active||!g?.body?.[part]||!injury)return;const B=M.s.battle;if(!B)return;const kind=M.injuryShots?.kindOf?.(injury);if(!kind)return;
  const vic=B.actors.find(x=>x.g===g);if(!vic)return;const att=(attName&&B.actors.find(x=>x.g!==g&&x.g.name===attName))||null,wid=(att&&M.weapon(att).id)||null;
  let L=g.gaitMarks||(g.gaitMarks=[]);const types=kind==='arrow'?['shaft']:MARK_OF[kind]||[];
  for(const m of types){if(L.some(k=>k.m===m&&k.part===part&&(k.battle===B.id||k.battle==null)))continue;if(m==='stabBack'&&!(wid&&G.throughOf(wid).exit&&(kind==='pierce'||kind==='through')&&/durchst|durchbohr/i.test(injury)))continue;
   const mk={m,part,side:part[0]==='r'?1:-1,day:M.s.day??0,battle:B.id};if(m==='shaft')mk.type=/bolzen/i.test(injury)?'bolt':'arrow';
   if(m==='stab'||m==='cut'){const tip=att&&G.tipAt(att,vic,part);if(tip)G.markAt(vic,mk,tip);mk.fixed=mk.lx!=null;}L.push(mk);}};
 const wrapW=n=>{const base=M[n];if(typeof base!=='function'||base.__gaitMarks)return;M[n]=function(g,id,injury,attacker,weapon){const r=base.apply(this,arguments);try{add(g,id,injury,attacker,weapon);}catch(e){}return r;};M[n].__gaitMarks=true;};
 wrapW('recordWound');}
})();

