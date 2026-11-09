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
 pierce:1,pierceForce:0,pierceDmg:1.25,pierceHold:.9,
 // Speer/Dreizack zweihändig: Anteil Stiche, Abklingzeit nach dem Stich
 spearThrust:.85,spearCool:.5,spearWind:.65,spearJabEnergy:.5,spearSwing:.65
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
 const t=o.target,w=M.weapon(a);if(!P.runAttack||!t||t.down||t.fallTimer>0||t.g.dead||t.surrendered||o.isRanged||w.ammo||o.flank||a.block||a.retreat>0||a.cool>0||a.energy<18||a.state!=='move'||a.netTimer>0)return false;
 if((a.gv||0)<base*.6||Math.abs(ad(Math.atan2(t.y-a.y,t.x-a.x),a.a))>.6)return false;
 const reach=o.ef.range+t.r,wind=(M.meleeTiming?.(a.g,w,'slash')?.wind||.3)*1.1,lead=a.gv*wind*.85;
 if(!(o.d>reach-2&&o.d<reach+lead+6))return false;
 M.beginAttack(a,t);if(!(a.wind>0)||['kick','shieldBash','groundFinish'].includes(a.technique))return true;
 const k=cl((a.gv/base-.6)/.85,0,1);a.runAttack={v:a.gv,base,target:t.id};a.chargeBoost=Math.max(a.chargeBoost||0,1+P.runHit*k);
 if(a.gv>base*1.15)a.rushHit={t:M.s.battle.time,v:a.gv,base,kind:'run'};ev('runAttack',a,{v:a.gv,boost:a.chargeBoost,tech:a.technique});return true;}
G.windMove=(a,dt,ef)=>{
 /* Speer/Dreizack: kurzer Stoß aus dem Stand (schnelles Ausholen) */if(a.technique==='thrust'&&!a.jab&&LONGPOINT.has(M.weapon(a).id)&&!a.gaitOff){a.jab=true;a.wind*=P.spearWind;a.windMax*=P.spearWind;}if(a.wind<=dt)a.jab=false;
 if(a.technique==='groundFinish')finStart(a);const r=a.runAttack;if(!r)return;const t=M.s.battle.actors.find(x=>x.id===r.target);if(!t||t.g.dead||t.down){a.runAttack=null;return;}
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
const PIERCE_BASE={spear:.4,trident:.34,javelin:.4,rapier:.3,dagger:.24,gladius:.24,short:.24,long:.15,greatsword:.12,halberd:.18};
G.thrust=(a,b,dmg,w,id)=>{
 if(!G.active||!P.pierce||!b?.g||b.g.dead||a.pierceContact||a.swingKind!=='thrust'||!w||w.ammo)return;const base=PIERCE_BASE[w.id];if(!base)return;const part=b.g.body[id];if(!part||part.missing)return;
 const armor=M.armorProtection?.(b.g,id)||0,chance=P.pierceForce?1:cl(base+(dmg-10)*.01-armor*.012,.03,.65);if(M.rng()>chance)return;
 const extra=dmg*(P.pierceDmg-1);part.hp=Math.max(0,part.hp-extra);a.damage+=extra;b.taken+=extra;part.bleed+=2.5;part.deepStabs=(part.deepStabs||0)+1;if(id==='chest'||id==='belly')part.internal=true;
 M.recordWound?.(b.g,id,'Durchstochen',a.g.name,w.name,dmg+extra);
 const TH=G.throughOf(w.id);a.pierceContact={target:b.id,part:id,left:P.pierceHold,len:P.pierceHold,weaponId:w.item?.id,through:true,exit:TH.exit,depthMul:TH.depth,t:0};if(w.item)w.item.blood=Math.max(w.item.blood||0,.85);a.swing=0;a.pendingStrike=null;a.wind=0;a.state='piercing';
 b.stun=Math.max(b.stun||0,P.pierceHold*.9);b.hit=.4;M.shake=Math.max(M.shake||0,6);
 M.floater?.(b.x,b.y-58,'DURCHSTOCHEN!','#ff5a4a');M.voice?.('pain',M.voicePitch?.(b.g)??1,true);M.sound?.('stick');
 (b.g.gaitMarks||(b.g.gaitMarks=[])).push({m:'stab',part:id},...(TH.exit?[{m:'stabBack',part:id}]:[]));
 ev('pierce',a,{b,part:id,weapon:w.id,dmg:dmg+extra,down:false});};
// während der Durchstich hält: kleiner Ausfallschritt hinein, Angreifer hinter dem Getroffenen gezeichnet (Klinge verschwindet im Körper,
// die Spitze kommt hinten heraus), Blut tritt vorn und hinten aus
G.pierceStep=(a,dt)=>{const f=a.pierceContact;if(!f?.through)return;const b=M.s.battle.actors.find(x=>x.id===f.target);if(!b)return;f.t=(f.t||0)+dt;const k=f.t/(f.len||.9);
 const dir=Math.atan2(b.y-a.y,b.x-a.x);G.pierceLunge(a,b,f,dt);
 G.pierceBlood(a,b,f,k,dt,dir);};
// Blut beim Durchstich: Eintritt vorn, Austritt an der echten Waffenspitze (a.weaponTipX/Y aus arena.js), Tropfen von der Spitze, Schwall beim Herausreißen
G.pierceBlood=(a,b,f,k,dt,dir)=>{const cp=M.contactAnchor(b,f.part),tip=a.weaponTipX!=null?{x:a.weaponTipX,y:a.weaponTipY}:{x:cp.x+Math.cos(dir)*12,y:cp.y};
 if(!f.spray&&k>.22){f.spray=true;M.emit?.(cp.x-Math.cos(dir)*3,cp.y,8,'#9d2f2a',45);if(f.exit){M.emit?.(tip.x,tip.y,22,'#aa3c36',120);}M.shake=Math.max(M.shake||0,4);}
 if(k>.3&&k<.85&&M.rng()<dt*(f.exit?14:6)){const p=f.exit?tip:cp;M.emit?.(p.x,p.y+1,1,'#8f2a24',18);}
 if(f.left<=dt*1.5&&!f.out){f.out=true;M.emit?.(cp.x,cp.y,16,'#aa3c36',90);if(f.exit)M.emit?.(cp.x+Math.cos(dir)*10,cp.y,10,'#9d2f2a',70);M.sound?.('stick');}};
// Durchstich auf der kleinen Figur: keine eigene Spitze – die echte Waffe des Angreifers wird tief genug hineingestoßen und
// der Angreifer hinter dem Getroffenen gezeichnet; so verschwindet die Klinge im Körper und tritt hinten im selben Winkel aus.
// Wie tief, hängt von der Waffe ab: Speer, Wurfspeer, Dreizack und Schwerter gehen durch, der Dolch steckt bis zum Heft,
// die Hellebarde nur mit dem Stoßdorn (das Blatt bleibt außen).
// near: Abstand, auf den der Angreifer nachstößt (Hand nah am Körper, damit die Klinge durchgeht)
// Speer und Dreizack (Vorschlag): zweihändig geführt (gang-editor.js setzt twoHand), stechen meist und in schneller Folge –
// halten den Gegner mit vielen Stichen auf Abstand (Abstand selbst regelt reach-ai.js wie bisher)
const LONGPOINT=new Set(['spear','trident']);
G.tech=(a,b)=>{if(!G.active||a.gaitOff)return;const w=M.weapon(a);if(!LONGPOINT.has(w.id)||['kick','shieldBash','groundFinish'].includes(a.technique))return;if(M.rng()<P.spearThrust)a.technique='thrust';};
G.cool=(a,w)=>{if(!G.active||a.gaitOff||!LONGPOINT.has(w?.id)||a.technique!=='thrust')return;a.cool*=P.spearCool;a.swingMax*=P.spearSwing;a.swing=a.swingMax;/* kurzer Stoß kostet weniger Kraft */a.energy+=(M.T.atkEnergy+(w.weight||3)*M.T.atkEnergyWeight)*P.spearJabEnergy;};
const THROUGH={spear:{exit:true,depth:4.8,near:46},javelin:{exit:true,depth:4.6,near:42},trident:{exit:false,depth:2.3,near:46},gladius:{exit:true,depth:3,near:30},short:{exit:true,depth:2.8,near:28},long:{exit:true,depth:3.2,near:36},greatsword:{exit:true,depth:3.4,near:40},rapier:{exit:true,depth:3.2,near:34},dagger:{exit:false,depth:1.7,near:24},halberd:{exit:false,depth:.72,near:48}};
G.throughOf=id=>THROUGH[id]||{exit:false,depth:1.4,near:34};
// Nachstoßen: in den ersten 35 % der Haltezeit rasch auf den Waffenabstand heran
G.pierceLunge=(a,b,f,dt)=>{const k=(f.t||0)/(f.len||.9),d=Math.hypot(b.x-a.x,b.y-a.y),near=G.throughOf(M.weapon(a).id).near;if(k<.35&&Math.abs(d-near)>1){/* auf Stoßdistanz der Waffe: heran oder (zu nah für die lange Waffe) einen Schritt zurück */const dir=Math.atan2(b.y-a.y,b.x-a.x),st=Math.sign(d-near)*Math.min(Math.abs(d-near),160*dt);a.x+=Math.cos(dir)*st;a.y+=Math.sin(dir)*st;}a.y=Math.min(a.y,b.y-.6);};
// ---------------------------------------------------------------- Verletzungen auf der kleinen Figur (bleiben bestehen)
// Echter Körperzustand, den das Spiel schon zeigt und speichert (Bruch → Arm hängt/Humpeln, tiefe Stichwunde → Wundgriff,
// Schädelbruch → Wunde im Kopf, abgetrennt → Glied fehlt), dazu eigene Bilder für die neuen Verletzungen (g.gaitMarks).
const MARK_OF={through:['stab','stabBack'],heart:['stab','bloodChest'],lung:['bruiseChest','mouthBlood'],ribs:['bruiseChest'],ribseries:['bruiseChest','dent'],sternum:['bruiseChest','dent'],
 liver:['bruiseBelly','stab'],spleen:['bruiseBelly'],kidney:['stabBack'],gutted:['guts'],pelvis:['bruiseHip'],neckbreak:['bruiseNeck'],larynx:['bruiseNeck','mouthBlood'],collarbone:['bruiseShoulder'],deepcut:['cut'],cut:['cut'],stab:['stab'],deepstab:['stab'],pierce:['stab','stabBack'],gut:['guts'],bruise:['bruise'],contusion:['bruise'],crush:['bruise'],concussion:['bruiseHead']};
const NEW_NAME={ribs:'Rippenbruch',ribseries:'Rippenserienfraktur',sternum:'Brustbeinbruch',lung:'Lungendurchstich',heart:'Herzstich',liver:'Leberriss',spleen:'Milzriss',kidney:'Nierenverletzung',gutted:'Ausgeweidet',pelvis:'Beckenbruch',neckbreak:'Genickbruch',larynx:'Kehlkopfbruch',collarbone:'Schlüsselbeinbruch',through:'Durchstochen'};
// returns: 'sever' (nach der Nahaufnahme abtrennen), 'death' (danach tot), 'down' (bricht zusammen) oder null
G.applyInjury=(att,vic,kind,part,wid,name)=>{const g=vic.g,B=g.body,p=B[part]||B.chest;if(!p)return null;const fr=(id,days,severe)=>{const q=B[id];if(q&&!q.missing){q.fracture={days,total:days,severe:!!severe};q.hp=Math.min(q.hp,severe?20:38);q.pain=Math.max(q.pain||0,70);}};
 const wound=(id,type,bl)=>{const q=B[id];if(!q||q.missing)return;q.bleed=(q.bleed||0)+bl;q.hp=Math.max(1,q.hp-18);try{M.recordWound(g,id,type,att?.g?.name||'',M.weapon(att)?.name||wid,20);}catch{}};
 const marks=g.gaitMarks||(g.gaitMarks=[]);const side=(part||'').startsWith('r')?'r':(part||'').startsWith('l')&&part.length>2?'l':((marks.length%2)?'l':'r');
 for(const m of MARK_OF[kind]||[]){if(m==='stabBack'&&(kind==='through'||kind==='pierce')&&!G.throughOf(wid).exit)continue;marks.push({m,part,side,t:M.s.battle?.time||0});}if(marks.length>24)marks.splice(0,marks.length-24);
 let out=null;
 switch(kind){
  case 'through':case 'pierce':wound(part,'Durchstochen',2.5);p.deepStabs=(p.deepStabs||0)+1;if(part==='chest'||part==='belly')p.internal=true;break;
  case 'heart':wound('chest','Herzstich',8);B.chest.deepStabs=(B.chest.deepStabs||0)+1;B.chest.internal=true;out='death';break;
  case 'lung':wound('chest','Lungendurchstich',3);B.chest.internal=true;B.chest.deepStabs=(B.chest.deepStabs||0)+1;break;
  case 'ribs':fr('chest',21);break;case 'ribseries':fr('chest',35,true);break;case 'sternum':fr('chest',28);break;
  case 'liver':case 'spleen':case 'kidney':wound('belly',NEW_NAME[kind],4);B.belly.internal=true;B.belly.deepStabs=(B.belly.deepStabs||0)+1;break;
  case 'gutted':wound('belly','Ausgeweidet',6);B.belly.internal=true;B.belly.deepStabs=(B.belly.deepStabs||0)+2;out='down';break;
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
  case 'gut':wound('belly','Tiefe Bauchwunde',4);B.belly.internal=true;break;
  case 'arrow':wound(part,'Pfeil steckt',2);break;
  default:if(p){p.hp=Math.max(1,p.hp-12);p.pain=Math.max(p.pain||0,40);}}
 g.blood=Math.max(30,(g.blood??100)-(out==='death'?20:6));return out;};
const PARTPOS={chest:P=>({x:P.chest.x+4,y:P.chest.y+4}),belly:P=>({x:P.chest.x*.5+3,y:-36}),neck:P=>({x:P.head.x+1,y:-57}),head:P=>({x:P.head.x+2,y:P.head.y}),ls:P=>({x:P.shoulders.l.x,y:P.shoulders.l.y+2}),rs:P=>({x:P.shoulders.r.x,y:P.shoulders.r.y+2})};
function drawMarks(a,P){const L=a.g.gaitMarks;if(!L?.length)return;const R=(x,y,w,h,c)=>{P.ctx.fillStyle=c;P.ctx.fillRect(Math.round(x),Math.round(y),w,h);},t=P.time||0;
 const at=(m,def)=>(PARTPOS[m.part]||PARTPOS[def])(P);
 for(const k of L){const m=k.m;
  if(m==='stab'||m==='stabBack'){const p=at(k,'chest'),x=m==='stabBack'?p.x-11:p.x;R(x-1.5,p.y-1.5,4,4,'#a8372f');R(x,p.y,1,1,'#2a0505');const len=4+((Math.sin(t*2+x)+1)*2|0);R(x,p.y+2,1,len,'#8f1d16');}
  else if(m==='bloodChest'){const p=at(k,'chest');for(let i=0;i<4;i++)R(p.x-1+i,p.y+1,1,8+i*2,'#8f1d16');}
  else if(m==='bruiseChest'||m==='bruiseBelly'||m==='bruiseHip'||m==='bruise'){const p=m==='bruiseHip'?{x:2,y:-31}:at(k,m==='bruiseBelly'?'belly':'chest');P.ctx.globalAlpha=.75;R(p.x-3,p.y-2,6,5,'#6b3a66');R(p.x-2,p.y-1,4,3,'#8a5a78');P.ctx.globalAlpha=1;}
  else if(m==='dent'){const p=at(k,'chest');R(p.x-3,p.y+1,6,1,'#3a1f3a');}
  else if(m==='bruiseNeck'){const p=at(k,'neck');P.ctx.globalAlpha=.8;R(p.x-2,p.y-1,5,3,'#6b3a66');P.ctx.globalAlpha=1;}
  else if(m==='bruiseHead'){P.ctx.globalAlpha=.7;R(P.head.x+3,P.head.y-6,4,3,'#6b3a66');P.ctx.globalAlpha=1;}
  else if(m==='bruiseShoulder'){const p=at(k,k.side==='r'?'rs':'ls');P.ctx.globalAlpha=.8;R(p.x-2,p.y-2,5,4,'#6b3a66');P.ctx.globalAlpha=1;R(p.x-1,p.y-1,3,1,'#3a1f3a');}
  else if(m==='mouthBlood'){const x=P.head.x+5,y=P.head.y+5;R(x,y,1,3+((Math.sin(t*3)+1)*1.5|0),'#8f1d16');R(x-1,y,2,1,'#a8372f');}
  else if(m==='cut'){const p=at(k,'chest');R(p.x-3,p.y,7,1,'#a8372f');R(p.x-2,p.y+1,5,1,'#5a0c09');R(p.x,p.y+2,1,6,'#8f1d16');}
  else if(m==='guts'){const p=at(k,'belly');R(p.x-3,p.y-1,6,3,'#3a0a08');for(let i=0;i<9;i++){const sw=Math.sin(t*2.2+i*.9)*(1+i*.15),x=p.x-1+i*.4+sw,y=p.y+2+i*2.3;R(x-1.5,y-1.5,4,3,i%2?'#e0a0a0':'#c97a7a');R(x-.5,y-1.5,1,1,'#fbe0e0');}R(p.x+3,p.y+20,1,5,'#8f1d16');R(p.x-2,p.y+3,1,7,'#8f1d16');}}}
{const prev=M.figureDecor;M.figureDecor=function(a,P){prev?.call(this,a,P);if(G.active&&P.layer==='front'&&!P.portrait&&a?.g)drawMarks(a,P);};}
// geblockter Ansturm: mit voller Wucht in die Deckung – kann trotzdem umwerfen (60 % der Chance), sonst zurückgestoßen
G.blocked=ev=>{if(ev?.kind==='block'&&ev.att?.rushHit?.kind==='charge')G.ram(ev.att,ev.def,0,.6);};
{const R=M.combatResponses;if(R?.impact&&!R.__gait){const orig=R.impact;R.impact=(a,b,d,p,w,part)=>{const out=orig.call(R,a,b,d,p,w,part);if(G.active&&!p){G.ram(a,b,d);G.thrust(a,b,d,w,part);}return out;};R.__gait=true;}}

// --------------------------------------------------------------- Initiative und Abstechen
const CRIES=['STIRB!','JETZT!','FÜR DIE EHRE!','HAAA!','BLEIB LIEGEN!'];
const cryText=a=>CRIES[((a.seed||0)+(a.finCount||0))%CRIES.length];
const CHOP=new Set(['axe','doubleaxe','halberd','greatsword','long']),PIERCE=new Set(['spear','trident','javelin','dagger','gladius','short','rapier']);
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
 if(a.target!==best.t.id||a.seizeOn!==best.t.id+best.k){a.target=best.t.id;a.seizeOn=best.t.id+best.k;a.cool=Math.min(a.cool||0,.1);a.retreat=0;a.flankTimer=0;
  if(best.d>70){a.shoutTimer=.8;a.cried=true;M.voice?.('battlecry',pitch(a),true);M.floater?.(a.x,a.y-62,cryText(a),'#ffcf6a');}ev('seize',a,{b:best.t,why:best.k});}
 return best;}
// Abstechen: weit ausholen (mit Schrei), dann die Waffe mit voller Wucht hineinrammen
G.finPart=(a,b)=>{const w=M.weapon(a),B=b.g.body,r=M.rng();if(!w.bladed&&!['spear','trident','javelin'].includes(w.id)&&!B.head.missing&&r<.85)return 'head';/* Keule, Streitkolben, Hammer: auf den Kopf */if(CHOP.has(w.id)){if(r<.45&&!B.neck.missing)return 'neck';const limbs=['lua','rua','lt','rt'].filter(id=>!B[id].missing);if(r<.8&&limbs.length)return limbs[Math.floor(M.rng()*limbs.length)];}
 if(r<.6&&!B.head.missing)return 'head';return B.chest.missing?null:(M.rng()<.6?'chest':'belly');};
function finStart(a){if(a.finisher||a.technique!=='groundFinish')return;a.finCount=(a.finCount||0)+1;a.finisher={target:a.target};a.wind*=P.finWind;a.windMax*=P.finWind;a.shoutTimer=Math.max(a.shoutTimer||0,1);M.voice?.('battlecry',pitch(a),true);M.floater?.(a.x,a.y-66,cryText(a),'#ff8a5a');ev('finStart',a,{});}
// Haltung beim Abstechen (arena.js): beide Hände hoch über den Kopf, zurücklehnen – dann mit Ausfallschritt und tief gebeugt hinein, kurz halten, herausreißen
const ease=t=>t<0?0:t>1?1:t*t*(3-2*t);
G.finPose=(a,sc)=>{if(!G.active||!a.finisher&&!(a.wind>0))return null;const w=M.weapon(a),chop=CHOP.has(w.id)||!w.bladed,shield=!!M.usableShield?.(a)&&!w.twoHand;
 let u,low;if(a.wind>0){u=ease(1-a.wind/Math.max(.01,a.windMax||.5));low=0;}else{const s=1-a.swing/Math.max(.01,a.swingMax||.4);u=1;low=s<.5?ease(s/.5):1-ease((s-.5)/.5)*.65;}
 const t=M.s.battle?.actors.find(x=>x.id===(a.finisher?.target||a.target)),face=Math.cos(a.a||0)>=0?1:-1;let tx=26;if(t&&sc)tx=cl((t.x-a.x)*face/sc,16,34);
 const top={x:2,y:-86},deep=chop?{x:tx-2,y:-30}:{x:tx-4,y:-34},raise={x:14+(top.x-14)*u,y:-50+(top.y+50)*u};
 const m={x:raise.x+(deep.x-raise.x)*low,y:raise.y+(deep.y-raise.y)*low};
 const angUp=chop?-2.45:1.5,angDown=chop?.95:1.42,an=(chop?(-1.1+(angUp+1.1)*u):1.5)+(angDown-(chop?angUp:1.5))*low;
 return {lean:-5*u*(1-low)+13*low,drop:11*low+1.5*u,main:m,off:shield?{x:-5+3*low,y:-42+6*low}:{x:m.x-3,y:m.y+5},angle:an};};
G.hold=(a,dt)=>{if(!(a.finHold>0))return;a.finHold-=dt;a.swing=Math.max(a.swing||0,(a.swingMax||.4)*.5);a.moveSpeed=0;const t=M.s.battle.actors.find(x=>x.id===a.finisher?.target);if(t&&a.contactPoint&&M.rng()<dt*8)M.emit?.(a.contactPoint.x,a.contactPoint.y,2,'#9d2f2a',30);if(a.finHold<=0){a.finisher=null;if(t&&a.contactPoint)M.emit?.(a.contactPoint.x,a.contactPoint.y,12,'#aa3c36',90);M.sound?.('stick');}};
function finImpact(a,b,dmg,w,id){
 const fin=a.finisher;if(!fin||!b?.g)return;const part=b.g.body[id];if(!part)return;const B=b.g.body;let what;
 // Wucht: mehr Schaden
 const extra=dmg*(P.finDmg-1);part.hp=Math.max(0,part.hp-extra);a.damage+=extra;b.taken+=extra;
 if(CHOP.has(w.id)&&['neck','lua','rua','lt','rt'].includes(id)&&M.rng()<P.finSever+dmg*.004){what=id==='neck'?'beheaded':'severed';M.sever(a,b,id);}
 else if(!BLUNT_LIKE(w)&&(PIERCE.has(w.id)||w.bladed)&&!['lua','rua','lt','rt'].includes(id)){what='pierced';part.bleed+=3;part.deepStabs=(part.deepStabs||0)+1;if(id==='chest'||id==='belly')part.internal=true;M.recordWound?.(b.g,id,'Durchbohrt',a.g.name,w.name,dmg);a.finHold=P.finHold;M.pixelBloodJet?.(b,id,false);}
 else{what=w.bladed?'hacked':'crushed';part.bleed+=w.bladed?2:.5;}
 M.shake=Math.max(M.shake||0,7);const cp=a.contactPoint||{x:b.x,y:b.y-10};M.emit?.(cp.x,cp.y,26,'#aa3c36',120);
 const label={beheaded:'KOPF AB!',severed:M.partName?.(id)?.toUpperCase()+' AB!',pierced:'DURCHBOHRT!',hacked:'HINEINGEHACKT!',crushed:'ZERSCHMETTERT!'}[what];M.floater?.(b.x,b.y-48,label,'#ff5a4a');
 if(!M.s.battle.cinematic)M.s.battle.cinematic={x:b.x,y:b.y-18,left:1.6,duration:1.6};
 if(what==='crushed'&&id==='head'){part.hp=Math.min(part.hp,4);part.bleed+=2;part.fracture={days:60,total:60,severe:true,skull:true};part.skullFracture=true;part.skullBy=w.id;}
 if(what==='pierced')(b.g.gaitMarks||(b.g.gaitMarks=[])).push({m:'stab',part:id});
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
 /* hold: der Editor steuert die Figur selbst (Nahaufnahmen-Studio) */if(a.puppet.hold)return;
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
