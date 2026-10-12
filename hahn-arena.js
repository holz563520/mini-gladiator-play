'use strict';
// =====================================================================================================
// HAHNENKAMPF-ARENA · Brücke zwischen dem Hahnen-Modell (hahn-engine.js, window.CF) und dem UNVERÄNDERTEN Spiel.
// Nur in der eigenständigen Testversion geladen. Ändert keine Spieldatei; hängt sich wie das Löwen-Kapitel
// über die vorhandenen Haken ein:
//   · Zeichnen, HUD, Porträt: ein Hahn-Kämpfer meldet außerhalb des Simulationsschritts „rex“ → M.drawRex (hier umhüllt)
//   · Simulation: im Schritt ist er ein gewöhnlicher Kämpfer → Menschen zielen auf ihn, hit() trifft seinen Körper
//   · Steuerung: M.updateActor/M.resolveStrike/M.updateLocomotion leiten Hahn-Kämpfer an die Hahn-KI um
//   · Kämpfe mit Löwe laufen über den Original-Löwentakt (rexTut), alle anderen über einen eigenen Takt aus Spielbausteinen.
// Maßstab: Menschen sind im Spiel 81 Einheiten pro 180 cm groß (contactAnchor: Kopf −62 · 1,14) → 2,22 cm je Einheit.
// =====================================================================================================
(()=>{
const M=window.MG,S=M.s,CF=window.CF,cl=M.clamp||((v,a,b)=>v<a?a:v>b?b:v);
if(!M||!CF){console.error('Hahnen-Arena: Spiel oder Hahnen-Modell fehlt.');return;}
const CM_PER_UNIT=180/81, MODEL_UNITS=CF.WORLD.roosterModelUnits, HUMAN_KG=80;
const H={inSim:false,onEnd:null,last:null,headless:false};window.HahnArena=H;
// Hahnen-Kämpfe: eigene Testkämpfe (b.hahn) und Kämpfe anderer Testversionen, die Hähne mitbringen (b.neu, z. B. prototypes/arena-neu)
const isH=b=>!!(b&&(b.hahn||b.neu));

// ---------- Körperabbildung Hahn ↔ Spielkörper ----------
const MAP={head:['head'],neck:['neck'],breast:['chest'],body:['belly'],wing:['ls','rs','lua','rua','lfa','rfa','lh','rh'],legs:['lt','rt','lsh','rsh','lf','rf']};
const INV={};for(const [k,v] of Object.entries(MAP))for(const p of v)INV[p]=k;
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];

function dummyG(R,team){
 const g=M.makeGladiator(0,team===1);
 g.id='hahn-'+R.id+'-'+Math.floor(Math.random()*1e6).toString(36);
 g.name=R.name;g.height=R.height;g.weight=R.weight;g.age=1;g.role='Soldat';g.traits=[];g.scars=[];g.history=[];
 g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};g.equipment={weapon:null,secondary:null,shield:null,armor:{}};
 const s=R.stats,st=g.stats;for(const k in st)st[k]=20;
 Object.assign(st,{agility:cl(s.geschwindigkeit*1.6,1,100),reflex:cl(s.geschwindigkeit*1.5,1,100),dexterity:cl(R.moves.peck,1,100),precision:cl(R.moves.peck,1,100),strength:cl(s.kraft,1,100),toughness:cl(s.zaehigkeit,1,100),pain:cl(s.zaehigkeit*1.3,1,100),balance:cl((s.kraft+s.groesse)/2,1,100),will:70,morale:85,aggression:90,stamina:cl(s.zaehigkeit,1,100),condition:cl(s.zaehigkeit,1,100)});
 if(g.moves)g.moves.dodge=cl(s.geschwindigkeit*1.5,1,100);
 g.fatigue=R.fatigue||0;g.blood=R.blood;
 for(const [hp,gl] of Object.entries(MAP))for(const id of gl){const p=g.body[id],q=R.body[hp];p.hp=q.hp;p.chronic=q.chronic;p.pain=q.pain;p.bleed=0;p.grade=M.injuryGrade(p);p.strength=s.kraft;p.agility=s.geschwindigkeit;}
 return g;
}
function snapshot(a){const s=a._snap||(a._snap={}),b=a.g.body;for(const k in b)s[k]=b[k].hp;}
// Spielkörper → Hahnen-Körper (für HUD, Wundmarken und am Ende dauerhaft)
function syncBack(a,final){
 const R=a.hahn,g=a.g;
 for(const [hp,gl] of Object.entries(MAP)){const v=gl.map(id=>g.body[id].missing?0:g.body[id].hp),min=Math.min(...v),avg=v.reduce((x,y)=>x+y,0)/v.length,q=R.body[hp];
  q.hp=cl(gl.length>1?.6*min+.4*avg:min,0,100);q.pain=Math.max(...gl.map(id=>g.body[id].pain||0));q.bleed=gl.reduce((n,id)=>n+(g.body[id].bleed||0),0);q.chronic=Math.max(q.chronic,...gl.map(id=>g.body[id].chronic||0));q.grade=CF.injuryGrade(q);}
 R.body.comb.hp=Math.min(R.body.comb.hp,100-(100-R.body.head.hp)*.6);R.body.comb.grade=CF.injuryGrade(R.body.comb);
 R.blood=cl(g.blood,0,100);
 a.tissue={v:Math.max(0,CF.health(R))};a.blood=R.blood;
 if(final){
  for(const [id,p] of Object.entries(g.body))for(const w of (p.wounds||[]).slice().reverse())if(!w._h){w._h=1;const hp=INV[id];R.body[hp].wounds.unshift({day:CF.CLOCK.day,fight:S.battle?.id,type:w.type,attacker:w.attacker,hits:w.hits,damage:Math.round(w.damage||0)});R.body[hp].wounds=R.body[hp].wounds.slice(0,24);}
  for(const sc of g.scars||[])if(!R.scars.some(x=>x.reason===sc.reason&&x.part===INV[sc.part]))R.scars.push({part:INV[sc.part]||'body',day:CF.CLOCK.day,reason:sc.reason});
  if(g.dead&&!R.dead){R.dead=true;R.cause=g.cause||'In der Arena gefallen';R.killer=g.killer||'Unbekannt';R.history.unshift({day:CF.CLOCK.day,text:'Gestorben: '+R.cause+' (durch '+R.killer+')'});}
  R.down=!R.dead&&(a.down||!CF.fitForFight(R));
  for(const p of Object.values(R.body))p.bleed=0; // Erste Hilfe nach dem Kampf
  R.fatigue=Math.min(100,(R.fatigue||0)+35);
 }
}
// Treffer am Hahn (von Menschen/Löwe über das Spiel): Größenverhältnis verstärkt den Schaden, Wundmarke am Hahn
function amplify(a){
 const R=a.hahn,g=a.g,amp=cl(Math.pow(HUMAN_KG/Math.max(.3,R.weight),.5),1,6);
 for(const [id,p] of Object.entries(g.body)){const before=a._snap?.[id];if(before==null||p.missing)continue;const loss=before-p.hp;if(loss>.5){
  const extra=loss*(amp-1);p.hp=Math.max(0,p.hp-extra);p.bleed=(p.bleed||0)*1;p.grade=M.injuryGrade(p);
  const w=(p.wounds||[])[0],txt=String(w?.type||''),type=/Schnitt|Hieb|Klaff|Riss|Kratz|Prank|Kral/.test(txt)?'cut':'peck';
  const total=loss+extra,sev=cl(Math.round(total/14),1,3),hp=INV[id],rr=Math.sqrt(Math.random())*.7,ra=rnd(0,6.28);
  R.body[hp].marks.push({id:'g'+Math.floor(Math.random()*1e9).toString(36),part:hp,type,severity:sev,u:Math.cos(ra)*rr,v:Math.sin(ra)*rr,ang:rnd(-1.1,-.35),rake:type==='cut'?2:1,heal:0,time:performance.now(),day:CF.CLOCK.day});
  if(sev>=3&&!R.appearance.scarMarks.some(s=>s.part===hp&&Math.abs(s.u-Math.cos(ra)*rr)<.05))R.appearance.scarMarks.push({part:hp,type,u:Math.cos(ra)*rr,v:Math.sin(ra)*rr,ang:-.7,rake:2,severity:sev,origin:'arena'});
  const mk=R.body[hp].marks[R.body[hp].marks.length-1],att=attackerOf(a),ak=attackKind(att,txt);
  react(a,att,total);feathers(a,4+sev*3+(ak==='blade'||ak==='paw'||ak==='bite'?6:0));
  if(total>=10||M.injuryGrade(p)>=3){syncBack(a,false);queueShot(Object.assign({R,part:hp,mark:mk,kind:ak,attacker:att?.hahn||null,skin:att?.g?.appearance?.skin,line1:(w?.attacker||att?.g?.name||'Ein Gegner')+(w?.weapon?' ('+w.weapon+')':'')+' fügt '+R.name+' zu:',title:txt||'Wunde'},CF.RoosterShot?CF.RoosterShot.describeHit(R,hp):{}),total);}
  if(['head','neck','chest'].includes(id)&&p.hp<=0&&!g.dead)M.death(a,txt?txt+' (tödlich)':'Tödlicher Treffer',att);
 }}
 snapshot(a);
}

// ---------- Wer hat getroffen, womit? ----------
function attackerOf(a){const b=S.battle;if(!b)return null;return b.actors.find(x=>x.id===a.lastAttackerId)||b.actors.find(x=>x.id===a.lastAttacker)||b.actors.find(x=>x.g?.name===a.lastAttacker)||null;}
function attackKind(att,txt){
 if(att?.rex&&!att.hahn)return /Biss|biss/.test(txt)?'bite':'paw';
 if(att?.hahn)return /Pick|Stich/.test(txt)?'peck':'claw';
 let w=null;try{w=att?M.weapon(att):null;}catch{}
 if(/Prellung|Quetsch|Bruch|Schlag|Tritt|stumpf/i.test(txt))return 'blunt';
 if(w&&(w.bladed||w.attack==='thrust'||/gladius|spear|sword|dagger|axe|trident|javelin/.test(w.id||'')))return 'blade';
 return /Schnitt|Stich|Hieb|Klaff/.test(txt)?'blade':'blunt';
}
// ---------- Trefferreaktion: zurückzucken, bei schweren Treffern umkippen ----------
function react(a,att,loss){const ang=att?Math.atan2(a.y-att.y,a.x-att.x):(a.a||0)+Math.PI;a.react={t:0,heavy:loss>=16,ang,loss};}
// ---------- Federn: fliegen, landen, bleiben liegen ----------
const FEATHERS=[],FLYING=[];H.feathers=FEATHERS;
function feathers(a,n){const C=a.hahn.appearance.colors,cols=[C.hackle,C.body,C.breast,C.wing,C.tail,C.sheen],h=a.hahn.height/CM_PER_UNIT;
 for(let i=0;i<n;i++){const ang=rnd(0,6.28),v=rnd(10,45);FLYING.push({x:a.x+rnd(-3,3),y:a.y+rnd(-2,2),z:h*rnd(.35,.8),vx:Math.cos(ang)*v,vy:Math.sin(ang)*v*.5,vz:rnd(5,30),c:cols[i%cols.length],ph:rnd(0,6),k:Math.floor(rnd(0,3))});}}
function stepFeathers(dt){for(let i=FLYING.length-1;i>=0;i--){const f=FLYING[i];f.vz-=40*dt;if(f.vz<-9)f.vz=-9;f.vx*=.97;f.vy*=.97;f.x+=(f.vx+Math.sin(f.ph+=dt*4)*6)*dt;f.y+=f.vy*dt;f.z+=f.vz*dt;if(f.z<=0){FLYING.splice(i,1);FEATHERS.push({x:f.x,y:f.y,c:f.c,k:f.k});if(FEATHERS.length>500)FEATHERS.shift();}}}
function featherShape(c,f,x,y,col){ // kleine Pixelfeder in Welteinheiten (≈ 8 cm)
 c.fillStyle=col;if(f.k===0){c.fillRect(x-1.8,y-.5,3.6,1);c.fillRect(x+1.2,y-1,.8,.6);}else if(f.k===1){c.fillRect(x-1.2,y-1.3,1,2.6);c.fillRect(x-.2,y-1.6,1,1.6);}else{c.fillRect(x-1.6,y-1,2.4,1);c.fillRect(x-.2,y-.2,2,1);}
 c.fillStyle='rgba(255,255,255,.35)';c.fillRect(x-1,y-.2,1.4,.4);}
function drawGroundFeathers(c){if(!isH(S.battle)||!FEATHERS.length)return;c.save();for(const f of FEATHERS){c.fillStyle='rgba(0,0,0,.18)';c.fillRect(f.x-1.4,f.y+.3,3,.6);featherShape(c,f,f.x,f.y,f.c);}c.restore();}
let featherFrame=-1;
function drawFlyingFeathers(c){const fr=Math.floor(performance.now()/8);if(fr===featherFrame)return;featherFrame=fr;for(const f of FLYING){c.fillStyle='rgba(0,0,0,.15)';c.fillRect(f.x-1.2,f.y,2.4,.6);featherShape(c,f,f.x,f.y-f.z,f.c);}}
// Bodenschicht: Das Spiel legt seine Blutflecken als fertige Fläche ab (drawStains). Direkt danach liegen die Federn,
// also unter allen Figuren und auf Dauer sichtbar.
let groundHooked=false;
function hookGround(){if(groundHooked)return;const cv=document.getElementById('arenaCanvas');const c=cv?.getContext?.('2d');if(!c)return;groundHooked=true;const di=c.drawImage;
 c.drawImage=function(img){const r=di.apply(this,arguments);try{if(isH(S.battle)&&arguments.length===3&&arguments[1]===0&&arguments[2]===0&&img&&img!==cv&&M.arenaSize){const f=M.arenaSize();if(img.width===f.width&&img.height===f.height)drawGroundFeathers(this);}}catch{}return r;};}
// ---------- Blutlachen (wie groundPools im Spiel): wachsen unter Liegenden und Gefallenen ----------
function stepPools(b,dt){for(const a of b.actors){if(a.rex&&!a.hahn)continue;const bleed=Object.values(a.g.body).reduce((n,p)=>n+(p.bleed||0),0);
 if(!(a.down||a.g.dead||a.fallTimer>0))continue;if(!a.g.dead&&bleed<=0)continue;
 const max=a.hahn?3+a.hahn.weight*1.4:14+(a.g.weight||80)*.05;a.pool??={x:a.x-5,y:a.y,r:.3};a.pool.r=Math.min(max,a.pool.r+dt*(.07+Math.min(40,bleed)*.015)*(a.g.dead?1.6:1));}}

// ---------- Nahaufnahmen über die Bildfläche des Kampf-HUD (wie injury-shots.js) ----------
const SH={active:null,queue:[],gap:0,canvas:null,overlay:null};H.shots=SH;
function queueShot(o,prio){if(H.headless||!CF.RoosterShot||!isH(S.battle))return;if(o.kind!=='death'&&o.kind!=='collapse'&&SH.gap>0&&!SH.active)return;SH.queue.push({o,prio});if(SH.queue.length>8)SH.queue.shift();}
function hostCanvas(){try{return M.injuryShots?.config?.host?.()||null;}catch{return null;}}
function startShot(){const best=SH.queue.sort((x,y)=>y.prio-x.prio)[0];SH.queue=[];if(!best)return;
 const o=Object.assign({scene:'arena',textScale:M.injuryShots?.config?.textScale||1},best.o);o.g={name:o.R.name,id:'hahn-shot'}; // Moderator kommentiert mit o.g.name
 const shot=CF.RoosterShot.create(o),host=hostCanvas();
 if(host){try{M.injuryShots.config.onShot?.(true,o,false);}catch{}SH.canvas=host;SH.overlay=null;}
 else{const v=document.createElement('div');v.className='injury-shot injury-shot-arena';v.innerHTML='<canvas width="660" height="420"></canvas>';document.body.appendChild(v);v.addEventListener('click',()=>shot.skip());SH.overlay=v;SH.canvas=v.firstChild;}
 SH.active=shot;SH.gap=o.kind==='death'?2:5;}
function endShot(){SH.overlay?.remove();if(SH.active&&!SH.overlay){try{M.injuryShots.config.onShot?.(false);}catch{}}SH.active=null;SH.canvas=null;SH.overlay=null;}
document.addEventListener('click',e=>{if(SH.active&&SH.canvas&&e.target===SH.canvas){SH.active.skip();}},true);

// ---------- Hahn-Kämpfer ----------
function roosterActor(R,team,i){
 const g=dummyG(R,team),a=M.createCombatActor(g,team,i,60);
 a.hahn=R;a.r=Math.max(5,R.height/CM_PER_UNIT*.22);
 Object.defineProperty(a,'rex',{get:()=>!H.inSim,set(){},configurable:true,enumerable:false});
 a.tissue={v:CF.health(R)};a.blood=R.blood;a.mode='threaten';a.hs={phase:'approach',t:0,cd:rnd(.2,.8),dodgeCD:0,learning:{},hits:0,dmg:0};a.hpose={};a.z=0;
 snapshot(a);return a;
}
function humanActor(kind,team,i,q){
 const g=M.makeGladiator(q||1,team===1);g.role='Soldat';g.traits=g.traits.filter(t=>t!=='Feige');
 const W={mensch:null,gladiator:'gladius',speer:'spear',keule:'club'}[kind];
 g.enemyGear={weapon:W?M.makeItem('weapon',W,q||1):null,secondary:null,shield:kind==='gladiator'?M.makeItem('shield','smallshield',q||1):null,armor:{}};
 if(team===0){g.equipment=g.enemyGear;}
 if(kind==='mensch'){g.name=g.name.split(' ')[0]+' (unbewaffnet)';}
 const a=M.createCombatActor(g,team,i,72);return a;
}
function lionActor(x,y){
 const g=M.makeGladiator(0,true);g.name='Rex Vetus';g.id='rex';g.role='Soldat';g.traits=[];g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};for(const k in g.stats)g.stats[k]=48;g.stats.will=100;g.stats.morale=100;
 const l=M.createCombatActor(g,1,0);
 Object.assign(l,{rex:true,x,y,r:30,tissue:{head:160,chest:290,belly:140,front:120,rear:100},wounds:[],blood:100,bleeding:0,trauma:0,velocity:0,heading:Math.PI,turn:0,evadeUntil:0,scarSeed:0,mode:'stalk',clock:0,cool:1.8,energy:100,pounceCD:1,hitCount:0,bites:0,interruptDamage:0,z:0,deathAt:0,paw:1,grabs:0,interruptions:0,gripKills:0,gripAborts:0,rescuedRisen:0,displayCycle:0});
 return l;
}

// ---------- Hahn-KI ----------
const alive=t=>t&&!t.g.dead&&!t.down&&!t.surrendered;
function learn(a,group,key,amount){const g=CF.learnValue(a.hahn,group,key,amount);if(g>0){const p=group+':'+key;a.hs.learning[p]=(a.hs.learning[p]||0)+g;}}
function partsFor(t,jump,big){
 if(t.rex)return jump?[['front',3],['belly',2],['head',big?1:0]]:[['front',5],['rear',1]];
 if(t.hahn){return [['head',30],['neck',19],['breast',18],['body',10],['wing',11],['legs',9]];}
 const low=t.down||t.fallTimer>0||t.kneeTimer>0;
 if(low)return [['head',4],['neck',3],['chest',3],['belly',2],['lh',1],['rh',1],['lua',1],['rua',1]];
 const L=[['lf',3],['rf',3],['lsh',4],['rsh',4]];if(jump)L.push(['lt',2],['rt',2],['lh',1],['rh',1]);if(jump&&big)L.push(['belly',1]);return L;
}
function weighted(list){let s=0;for(const [,w] of list)s+=w;let x=Math.random()*s;for(const [k,w] of list){x-=w;if(x<=0)return k;}return list[0][0];}
function strike(a,t,move,variant){
 const R=a.hahn,s=R.stats,b=S.battle,skill=R.moves[move],power=move==='peck'?s.schnabelkraft:s.klauenstaerke;
 learn(a,'moves',move,.03);learn(a,'stats',move==='peck'?'schnabelkraft':'klauenstaerke',.008);if(variant==='sprung')learn(a,'stats','kraft',.006);
 const tSpeed=t.hahn?t.hahn.stats.geschwindigkeit:t.rex?45:(t.g.stats.agility+t.g.stats.reflex)/2;
 let hitP=cl(.64+(skill-20)*.013+(s.geschwindigkeit-tSpeed)*.008-(move==='claw'?.04:0)-(t.block&&!t.rex&&!t.hahn?.15:0)-(t.dodgeTimer>0?.25:0)+(t.down?.25:0),.15,.95);
 if(Math.random()>hitP){if(t.hahn)learn(t,'stats','geschwindigkeit',.02);a.mode='recoil';return false;}
 learn(a,'moves',move,.015);
 const jump=move==='claw'&&variant!=='flatter',tw=t.hahn?t.hahn.weight:t.rex?190:(t.g.weight||80);
 const zone=weighted(partsFor(t,jump,R.height>65));
 const mass=cl(Math.pow(R.weight/tw,.35),.2,2.2);
 let dmg=(power*.55+skill*.35+s.kraft*.22+(move==='claw'?s.groesse*.1+R.appearance.spurLen*1.5:0))*.85*rnd(.75,1.25)*cl(R.blood/100,.45,1);
 const crit=Math.random()<cl(.06+(skill-20)*.004,.02,.2);if(crit)dmg*=1.6;
 // Gegen Menschen/Löwe: ein Hahn reicht nur an Füße und Schienbeine, Treffer bleiben oberflächlich (Faktor 0,35)
 const loss=Math.max(.5,dmg*1.3*mass*(t.hahn?(1-t.hahn.stats.zaehigkeit*.006):.35));
 const type=move==='peck'?'peck':'cut',word=move==='peck'?(loss>14?'Tiefe Pickwunde':'Pickwunde'):(loss>14?'Tiefe Spornwunde':'Kratzwunde');
 a.hs.hits++;a.hs.dmg+=loss;M.recordDamage(a,move==='peck'?'Schnabelstoß':'Klauenhieb',loss);a.damage+=loss;
 let px=t.x,py=t.y-6;
 if(t.rex){t.tissue[zone]=Math.max(0,(t.tissue[zone]||0)-loss);t.blood=Math.max(0,(t.blood||100)-loss*.05);t.bleeding=(t.bleeding||0)+loss*.02;t.hitCount=(t.hitCount||0)+1;py=t.y-(zone==='front'?10:24);}
 else{
  const gid=t.hahn?pick(MAP[zone]):zone,p=t.g.body[gid];if(p.missing)return true;
  p.hp=Math.max(0,p.hp-loss);p.pain=Math.min(100,(p.pain||0)+loss*.6);p.bleed=(p.bleed||0)+(type==='cut'?1.1:.6)*cl(loss/10,.3,2.5);p.grade=M.injuryGrade(p);
  t.g.blood=Math.max(0,t.g.blood-loss*.08);t.taken=(t.taken||0)+loss;t.lastAttacker=a.id;t.lastAttackerId=a.id;t.hit=.18;if(!t.hahn&&loss>=8)t.stagger=Math.max(t.stagger||0,.22);
  M.recordWound(t.g,gid,word,R.name,'',loss);if(p.grade>=2)M.noteInjury(t.g,gid,word);
  if(p.grade>=3&&M.addScar)M.addScar(t.g,gid,word);
  try{const pt=M.contactAnchor(t,gid);px=pt.x;py=pt.y;}catch{}
  if(t.hahn){const R2=t.hahn,hp=zone,rr=Math.sqrt(Math.random())*.7,ra=rnd(0,6.28),sev=cl(Math.round(loss/14),1,3);
   R2.body[hp].marks.push({id:'r'+Math.floor(Math.random()*1e9).toString(36),part:hp,type,severity:sev,u:Math.cos(ra)*rr,v:Math.sin(ra)*rr,ang:rnd(-1.1,-.35),rake:type==='cut'?(sev>=2?3:2):1,heal:0,time:performance.now(),day:CF.CLOCK.day});
   learn(t,'stats','zaehigkeit',.006);snapshot(t);react(t,a,loss);feathers(t,3+sev*3+(move==='claw'?4:0));
   if(loss>=10||crit||p.grade>=3){syncBack(t,false);queueShot(Object.assign({R:R2,part:hp,mark:R2.body[hp].marks[R2.body[hp].marks.length-1],kind:move==='peck'?'peck':'claw',attacker:R,line1:R.name+' ('+(move==='peck'?'Schnabelstoß':'Klauenhieb')+') fügt '+R2.name+' zu:',title:word},CF.RoosterShot?CF.RoosterShot.describeHit(R2,hp):{}),loss+(crit?8:0));}}
  if(!t.g.dead){if(['head','neck','chest'].includes(gid)&&p.hp<=0)M.death(t,(move==='peck'?'Vom Schnabel':'Vom Sporn')+' getötet ('+R.name+')',a);else if(t.g.blood<=0)M.death(t,'Verblutet',a);}
 }
 M.emit(px,py,4+Math.round(loss/4),'#a2392e',70);M.stains.push({x:px+rnd(-6,6),y:t.y+rnd(-3,3),r:rnd(1.5,3.5)});if(M.stains.length>300)M.stains.shift();
 M.shake=Math.max(M.shake||0,crit?3:1);
 const b2=S.battle;if(b2)b2.log.unshift({time:Math.floor(b2.time),text:R.name+': '+(move==='peck'?'Schnabelstoß':'Klauenhieb')+' trifft '+(t.rex?'den Löwen':t.g.name)+' ('+(t.rex?({front:'Vorderlauf',rear:'Hinterlauf',belly:'Bauch',head:'Kopf',chest:'Brust'}[zone]||zone):t.hahn?CF.partName(zone):(M.partName?M.partName(zone):zone))+')'+(crit?' – Volltreffer!':'')});
 return true;
}
function chooseMove(R,last){const peck=R.moves.peck+R.stats.schnabelkraft,claw=R.moves.claw+R.stats.klauenstaerke;let wp=cl(1+(peck-claw)/25,.35,2),wc=cl(1+(claw-peck)/25,.35,2);if(last==='peck')wp*=.5;if(last==='claw')wc*=.5;return Math.random()<wp/(wp+wc)?'peck':'claw';}
function roosterUpdate(a,dt){
 const R=a.hahn,g=a.g,b=S.battle,hs=a.hs,P=a.hpose={};
 for(const k of ['fallTimer','netTimer','blindTimer','stun','stagger','hit','dodgeTimer','jumpTimer','kneeTimer','sandKick','dodgeCD','kickTimer','wipeTimer'])if(typeof a[k]==='number'&&a[k]>0)a[k]=Math.max(0,a[k]-dt);
 a.wind=0;a.swing=0;a.pendingStrike=null;
 if(g.dead){a.state='dead';a.mode='recover';a.z=0;return;}
 // Blutung wie im Spiel (Blutverlust aus offenen Wunden)
 const bleed=Object.values(g.body).reduce((n,p)=>n+(p.bleed||0),0);if(bleed>0){g.blood=Math.max(0,g.blood-bleed*.036*dt*1.6);for(const p of Object.values(g.body))if(p.bleed>0)p.bleed=Math.max(0,p.bleed-dt*.08);if(g.blood<=0){M.death(a,'Verblutet',b.actors.find(x=>x.id===a.lastAttacker)||null);return;}if(Math.random()<bleed*dt*.4)M.stains.push({x:a.x+rnd(-3,3),y:a.y+rnd(-2,2),r:rnd(.8,1.8)});}
 syncBack(a,false);
 if(!a.down&&(CF.health(R)<45||R.blood<35||R.body.legs.hp<10||R.body.head.hp<12||R.body.neck.hp<12)){a.down=true;a.state='fallen';a.reason='kampfunfähig';b.log.unshift({time:Math.floor(b.time),text:R.name+' bricht zusammen.'});}
 if(a.down){a.state='fallen';a.mode='recover';a.z=0;P.crouch=.7;P.lean=.4;P.blink=true;return;}
 if(a.react){const r=a.react;r.t+=dt;const k=r.t/(r.heavy?.75:.4),s1=Math.sin(Math.min(1,k)*Math.PI);
  if(k<1){P.lean=-.45*s1;P.headX=-2*s1;P.headY=r.heavy?1.5*s1:0;P.wing=.65*s1;P.flap=b.time*34;P.blink=true;P.beakOpen=.6*s1;
   if(r.t<.18){const v=(r.heavy?70:38)*(1-r.t/.18);a.x+=Math.cos(r.ang)*v*dt;a.y+=Math.sin(r.ang)*v*dt*.6;}
   a.z=r.heavy?Math.sin(Math.min(1,k*1.4)*Math.PI)*6:0;a.state='hit';a.mode='recoil';return;}
  a.react=null;a.z=0;}
 if(a.grabbedBy||a.draggedBy){a.state='fallen';P.wing=.8;P.flap=b.time*40;return;}
 if(a.netTimer>0){a.state='idle';P.wing=.4;P.flap=b.time*30;P.crouch=.3;return;}
 if(a.fallTimer>0){a.state='fallen';P.crouch=.6;P.lean=.3;return;}
 const foes=b.actors.filter(t=>t.team!==a.team&&alive(t));
 let t=foes.find(x=>x.id===a.target&&alive(x));
 if(!t){t=foes.sort((p,q)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(q.x-a.x,q.y-a.y))[0];a.target=t?.id||null;}
 if(!t){a.state='celebrate';a.mode='threaten';P.lean=-.4;P.beakOpen=Math.sin(b.time*3)>0?1:0;P.wing=.6;P.flap=b.time*12;return;}
 const dx=t.x-a.x,dy=t.y-a.y,d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d;
 a.a=Math.atan2(dy,dx);
 const legs=.55+.45*R.body.legs.hp/100,spd=(38+R.stats.geschwindigkeit*1.4)*legs*(a.blindTimer>0?.6:1);
 const reach=a.r+(t.r||10)+(t.rex?14:6);
 const move=(vx,vy,v)=>{a.x+=vx*v*dt;a.y+=vy*v*dt;const W=b.width||1040,Hh=b.height||720;a.x=cl(a.x,60,W-60);a.y=cl(a.y,120,Hh-60);a.moveSpeed=v;};
 hs.t+=dt;hs.cd=Math.max(0,hs.cd-dt);hs.dodgeCD=Math.max(0,hs.dodgeCD-dt);
 // Ausweichen: holt ein Mensch zum Schlag aus, springt der Hahn zur Seite (Geschwindigkeit)
 const threat=b.actors.find(x=>x.team!==a.team&&!x.hahn&&!x.rex&&x.target===a.id&&(x.wind>0||x.pendingStrike)&&Math.hypot(x.x-a.x,x.y-a.y)<120);
 if(threat&&hs.dodgeCD<=0&&hs.phase!=='strike'&&Math.random()<cl(.12+R.stats.geschwindigkeit*.005,.1,.4)){hs.phase='dodge';hs.t=0;hs.dodgeCD=1.1;hs.side=Math.random()<.5?-1:1;a.dodgeTimer=.35;a.mode='evade';}
 const fleeing=CF.health(R)<52&&Math.random()<.002;if(fleeing){hs.phase='flee';hs.t=0;}
 switch(hs.phase){
  case 'dodge':{const k=hs.t/.35;move(-uy*hs.side*.8-ux*.6,ux*hs.side*.8-uy*.6,spd*1.8);a.z=Math.sin(Math.min(1,k)*Math.PI)*10;P.wing=1;P.flap=b.time*40;P.lean=-.2;if(hs.t>.35){hs.phase='approach';hs.t=0;a.z=0;}a.state='move';break;}
  case 'flee':{move(-ux,-uy,spd*1.2);P.wing=.7;P.flap=b.time*36;a.mode='sprint';a.state='retreat';if(hs.t>1.2){hs.phase='approach';hs.t=0;}break;}
  case 'approach':{
   if(d>reach){const circ=Math.sin(b.time*1.7+a.seed)*.35;move(ux-uy*circ,uy+ux*circ,spd);P.stepN=Math.sin(b.time*18)*2;P.stepF=-P.stepN;P.hackle=1;P.lean=.3;a.mode='sprint';a.state='move';}
   else{a.moveSpeed=0;a.state='idle';P.hackle=1;P.lean=.3;P.headY=1.5;P.headX=Math.sin(b.time*9)*.8;a.mode='threaten';if(hs.cd<=0){hs.move=chooseMove(R,hs.last);hs.variant=hs.move==='claw'?pick(['sprung','sprung','flatter','sporn']):pick(['stoss','hack','stoss']);hs.phase='wind';hs.t=0;}}
   break;}
  case 'wind':{P.hackle=1.2;if(hs.move==='peck'){P.lean=-.1;P.headX=-2;}else{P.crouch=.6;P.wing=.35;}if(hs.t>.18){hs.phase='strike';hs.t=0;hs.done=false;}break;}
  case 'strike':{const dur=hs.move==='claw'?.42:.2,k=Math.min(1,hs.t/dur);
   if(hs.move==='peck'){P.lean=.6*Math.sin(k*Math.PI);P.headX=6*Math.sin(k*Math.PI);P.headY=(hs.variant==='hack'?5:2.5)*Math.sin(k*Math.PI);P.beakOpen=1;if(d>reach*.7)move(ux,uy,spd*.8);}
   else{a.z=Math.sin(k*Math.PI)*(hs.variant==='flatter'?8:hs.variant==='sporn'?6:16+R.stats.kraft*.3)*(R.height/58);P.wing=1.1;P.flap=b.time*36;P.kick=Math.sin(k*Math.PI);P.lean=-.3;move(ux,uy,spd*.6);}
   if(!hs.done&&k>=.55){hs.done=true;if(d<=reach*1.25)strike(a,t,hs.move,hs.variant);else a.mode='recoil';}
   if(hs.t>=dur){hs.phase='recover';hs.t=0;hs.last=hs.move;a.z=0;}
   a.state='attack';a.mode='threaten';break;}
  case 'recover':{move(-ux,-uy,spd*.7);P.lean=.15;P.wing=.25;P.flap=b.time*20;a.mode='recover';if(hs.t>.3){hs.phase='approach';hs.t=0;hs.cd=cl(1.05-R.stats.geschwindigkeit*.012,.35,1);}break;}
 }
 a.energy=Math.min(a.energy||100,100);
}

// ---------- Umhüllen der Spielhaken ----------
const baseUpdate=M.updateActor,baseResolve=M.resolveStrike,baseLoco=M.updateLocomotion;
M.updateActor=function(a,dt){if(a?.hahn)return roosterUpdate(a,dt);return baseUpdate.apply(this,arguments);};
M.resolveStrike=function(a,dt){if(a?.hahn)return;return baseResolve.apply(this,arguments);};
M.updateLocomotion=function(a){if(a?.hahn){a.phase=(a.phase||0)+.1;return;}return baseLoco.apply(this,arguments);};
const baseDraw=M.drawRex;
M.drawRex=function(ctx,l){if(!l?.hahn)return baseDraw?.apply(this,arguments);drawRooster(ctx,l);};
function hahnStep(dt){
 const b=S.battle;if(!b||b.paused||b.result)return;b.time+=dt;
 for(const a of b.actors){const x=a.x,y=a.y,p=a.phase||0;M.resolveStrike(a,dt*1.12);M.updateActor(a,dt*1.12);M.updateLocomotion(a,x,y,p,dt*1.12);}
 M.collisionPairs(b);M.stepProjectiles(dt);
 for(const a of b.actors)if(a.g.dead&&!a.death)a.death=true;
}
const baseFixed=M.fixedStep;
M.fixedStep=function(dt){
 const b=S.battle;if(!b?.hahn)return baseFixed.apply(this,arguments);
 if(b.result)return;
 if(SH.active)return; // während der Nahaufnahme steht der Kampf (wie im Spiel)
 hookGround();
 H.inSim=true;
 try{if(b.rexTut)baseFixed.call(this,dt);else hahnStep(dt);}
 finally{H.inSim=false;}
 H.post(b,dt);
 checkEnd(b);
};
// Nach jedem Simulationsschritt: Größenverstärkung, Rückschrieb in den Hahn, Nahaufnahmen, Blut, Federn
H.post=function(b,dt){
 for(const a of b.actors)if(a.hahn){amplify(a);syncBack(a,false);
  const R=a.hahn;
  if(a.g.dead&&!a._deathShot){a._deathShot=true;feathers(a,14);const att=attackerOf(a);queueShot({R,kind:'death',part:'head',dramatic:R.quality.tier>=7,line1:(a.g.killer&&a.g.killer!=='Unbekannt'?a.g.killer+' tötet '+R.name:R.name+' stirbt'),title:'† '+R.name+' fällt',line3:a.g.cause||'',color:'#f29b83',attacker:att?.hahn||null},99);}
  else if(a.down&&!a.g.dead&&!a._downShot){a._downShot=true;queueShot({R,kind:'collapse',part:'breast',line1:R.name+' geht zu Boden',title:'Kampfunfähig',line3:'Gesundheit '+Math.round(CF.health(R))+' % · Blut '+Math.round(R.blood)+' %',color:'#f29b83'},50);}}
 stepPools(b,dt);stepFeathers(dt);
 // Wund-Nahaufnahmen zeigen Menschenkörper – für Hähne nicht vormerken
 const pd=M.injuryShots?.pending;if(pd)for(let i=pd.length-1;i>=0;i--)if(String(pd[i].g?.id||'').startsWith('hahn-'))pd.splice(i,1);
};
const basePres=M.presentationStep;
M.presentationStep=function(dt){
 const b=S.battle;
 if(SH.active){if(!isH(b)||SH.active.done||!SH.active.step(dt))endShot();else{const c=SH.canvas;if(c){try{SH.active.paint(c.getContext('2d'),c.width,c.height);}catch(e){console.error(e);endShot();}}}if(SH.active)return;}
 const r=basePres?.apply(this,arguments);
 if(isH(b)){SH.gap=Math.max(0,SH.gap-dt);if(!b.result&&!SH.active&&SH.queue.length&&!M.injuryShots?.arena&&!b.paused)startShot();}
 return r;};
function teamAlive(b,t){return b.actors.filter(a=>a.team===t&&!a.g.dead&&!a.down&&!a.surrendered).length;}
function checkEnd(b){
 if(b.result)return;
 const l=teamAlive(b,0),r=teamAlive(b,1);
 if(l&&r&&b.time<120)return;
 const winner=l&&r?(sum(b,0)>=sum(b,1)?0:1):l?0:1;
 b.endAt??=b.time;
 if(b.time-b.endAt<2.2)return; // kurz ausklingen lassen (Sieger kräht)
 b.result={winner:winner?b.opponent:S.schoolName,hahnWinner:winner};b.paused=false;
 finish(b,winner);
}
// Punktwertung bei Zeitablauf: Gesundheit × Körpermasse (ein Hahn wiegt 1–8 kg, ein Mensch ~80 kg, der Löwe ~190 kg)
function sum(b,t){return b.actors.filter(a=>a.team===t&&!a.g.dead&&!a.down).reduce((n,a)=>n+(a.hahn?CF.health(a.hahn)*a.hahn.weight:a.rex?Math.max(0,a.tissue?Object.values(a.tissue).reduce((x,y)=>x+y,0)/810*100:100)*190:M.health(a.g)*(a.g.weight||80)),0);}
function finish(b,winner,aborted){
 const out={winner,aborted:!!aborted,reason:'',roosters:[],others:[]};
 for(const a of b.actors){
  if(a.hahn){const R=a.hahn;syncBack(a,true);if(!aborted){R.fights++;if(a.team===winner)R.wins++;else R.losses++;}R.kills+=a.kills||0;
   const foes=b.actors.filter(x=>x.team!==a.team).map(x=>x.rex?'Rex Vetus':x.hahn?x.hahn.name:x.g.name).join(', ');
   R.history.unshift({day:CF.CLOCK.day,text:(aborted?'Abgebrochen':a.team===winner?'Sieg':'Niederlage')+' in der Spielarena gegen '+foes});
   R.learning.unshift({fight:b.id,day:CF.CLOCK.day,gains:a.hs.learning});R.learning=R.learning.slice(0,20);
   out.roosters.push({id:R.id,name:R.name,team:a.team,dead:R.dead,cause:R.cause,health:Math.round(CF.health(R)),hits:a.hs.hits,dmg:Math.round(a.hs.dmg),learning:a.hs.learning});}
  else out.others.push({name:a.rex?'Rex Vetus':a.g.name,team:a.team,dead:a.g.dead,down:a.down,health:a.rex?null:Math.round(M.health(a.g)),blood:Math.round(a.rex?(a.blood??100):a.g.blood)});
 }
 H.last=out;
 setTimeout(()=>showResult(out),300);
}

// ---------- Zeichnen: Hahnen-Sprite maßstabsgetreu in der Spielwelt ----------
function spriteFor(a,w,h){let sp=a._sprite;if(!sp||sp.w!==w||sp.h!==h){const grid=new CF.PixGrid(w,h),painter=new CF.Painter(grid),cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d');sp=a._sprite={w,h,grid,painter,cv,c,img:c.createImageData(w,h),view:new Uint8ClampedArray(grid.d.buffer)};}return sp;}
function drawRooster(ctx,a){
 const R=a.hahn,T=ctx.getTransform(),zoom=Math.hypot(T.a,T.b)||1,portrait=ctx.canvas.width<=200;
 const sw=R.height/MODEL_UNITS/CM_PER_UNIT*(portrait?2.6*Math.max(1,58/R.height)**.5:1);   // Welteinheiten je Modelleinheit
 const ps=cl(sw*zoom/2,.5,4);                                   // Sprite-Pixel je Modelleinheit (doppelt so grob wie der Bildschirm → Pixelstil)
 const w=Math.ceil(80*ps),h=Math.ceil(70*ps),ox=Math.round(w/2),oy=Math.round(h*.86);
 const sp=spriteFor(a,w,h);sp.grid.clear();
 const dead=a.g.dead||a.state==='dead',down=a.down||a.state==='fallen'&&a.fallTimer>0;
 const pose=Object.assign({},a.hpose||{});pose.glow=R.quality.tier>=7&&!dead;pose.blink=pose.blink||dead||((performance.now()/1000+(a.seed||0))%3)<.1;if(dead){pose.dead=true;pose.wing=.25;pose.crouch=.6;}
 if(!pose.stepN&&!dead)pose.bob=Math.sin(performance.now()/160+(a.seed||0))*.3;
 const face=Math.cos(a.a||0)>=0?1:-1,rk=a.react&&a.react.heavy?Math.sin(Math.min(1,a.react.t/.75)*Math.PI):0,roll=dead?1.45*face:down?.5*face:-.9*rk*face;
 sp.painter.setT(ox,oy+(dead?Math.round(6*ps):0),ps,face,roll,0,-14);
 CF.drawRoosterSide(sp.painter,R,pose,performance.now());
 sp.img.data.set(sp.view);sp.c.putImageData(sp.img,0,0);
 ctx.save();
 if(!portrait){ctx.translate(Math.round(a.x),Math.round(a.y));ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(0,1,R.height/CM_PER_UNIT*.36*cl(1-(a.z||0)/60,.4,1),R.height/CM_PER_UNIT*.09,0,0,7);ctx.fill();ctx.translate(0,-(a.z||0));}
 const k=sw/ps;ctx.imageSmoothingEnabled=false;ctx.scale(k,k);ctx.drawImage(sp.cv,-ox,-oy);
 ctx.restore();
 if(!portrait&&FLYING.length)drawFlyingFeathers(ctx);
}

// ---------- Kampf starten ----------
/** cfg: { blue: [{type:'hahn', rooster}|{type:'mensch'|'gladiator'|'speer'}], red: [...gleich... | {type:'loewe'}], arena }  */
H.start=function(cfg,onEnd){
 H.onEnd=onEnd;
 const actors=[],lion=cfg.red.find(x=>x.type==='loewe')||cfg.blue.find(x=>x.type==='loewe');
 if(lion){const l=lionActor(760,330);l.a=Math.PI;actors.push(l);} // Löwe zuerst (das Spiel sucht „den“ Löwen per find)
 const place=(list,team)=>{let i=0;for(const e of list){if(e.type==='loewe')continue;const a=e.type==='hahn'?roosterActor(e.rooster,team,i):humanActor(e.type,team,i,e.q);const n=list.filter(x=>x.type!=='loewe').length;a.x=(team?700:340)+(e.type==='hahn'?(team?-40:40):0);a.y=400+(i-(n-1)/2)*(e.type==='hahn'?55:80);a.a=team?Math.PI:0;actors.push(a);i++;}};
 place(cfg.blue,0);place(cfg.red,1);
 const opp=cfg.red.map(e=>e.type==='hahn'?e.rooster.name:e.type==='loewe'?'Rex Vetus':{mensch:'Mensch',gladiator:'Gladiator',speer:'Speerkämpfer',keule:'Keulenträger'}[e.type]).join(' & ');
 const battle={id:'hahn-arena-'+Date.now(),hahn:true,rexTut:!!lion,trainingLocked:true,actors,opponent:opp,time:3.2,type:'hahn-test',league:cfg.league||0,log:[],paused:false,result:null,obstacles:[],width:1040,height:720,moralePressure:[0,0],moraleBonus:[0,0],lastSave:0,groundWeapons:[],dropped:[]};
 FEATHERS.length=0;FLYING.length=0;endShot();SH.queue=[];SH.gap=1.5;
 S.battle=null;try{M.ui.click('nav:home');}catch(e){console.warn(e);}
 S.battle=battle;
 M.stains=[];M.limbs=[];M.swings=[];M.floaters=[];M.shake=0;for(const p of [...(M.fx||[]),...(M.shots||[])])p.active=false;
 hideResult();
 M.ui.render();
};
/** Hauptmenü/Aufgeben während eines Hahnenkampfs: Ergebnis wird übernommen, dann zurück ins Labor. */
H.abort=function(surrender){const b=S.battle;if(!b?.hahn)return;if(b.result){document.getElementById('hahnBack')?.click();return;}b.result={winner:surrender?b.opponent:'',hahnWinner:surrender?1:-1};finish(b,surrender?1:-1,!surrender);};
document.addEventListener('click',e=>{const el=e.target.closest?.('[data-action]');if(!el||!S.battle?.hahn)return;const act=el.dataset.action;if(['profilemenu','surrender','surrenderconfirm'].includes(act)){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();H.abort(act!=='profilemenu');}},true);
H.leave=function(){endShot();S.battle=null;hideResult();M.ui.render();document.body.classList.remove('bhud');};

// ---------- Ergebnis über der Spielarena ----------
function hideResult(){document.getElementById('hahnResult')?.remove();}
function showResult(out){
 hideResult();const v=document.createElement('div');v.id='hahnResult';
 const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const win=out.aborted?'KAMPF ABGEBROCHEN':out.winner===0?'TEAM BLAU SIEGT':'TEAM ROT SIEGT';
 const row=r=>'<li><b>'+esc(r.name)+'</b> · '+(r.dead?'✝ '+esc(r.cause||'gefallen'):'Gesundheit '+r.health+' %')+' · '+r.hits+' Treffer</li>';
 const orow=r=>'<li>'+esc(r.name)+' · '+(r.dead?'✝ gefallen':r.down?'am Boden':r.health!=null?'Gesundheit '+r.health+' %':'')+(r.blood!=null?' · Blut '+r.blood+' %':'')+'</li>';
 v.innerHTML='<div class="hr-box"><p class="hr-eye">HAHNENKAMPF · SPIELARENA</p><h2>'+win+'</h2><ul>'+out.roosters.map(row).join('')+out.others.map(orow).join('')+'</ul><p class="hr-note">Wunden, Blutverlust, Narben, Lernzuwachs und Tod sind in die Hähne übernommen. Erste Hilfe: Blutungen verbunden.</p><button class="btn primary" id="hahnBack">ZURÜCK INS HAHNEN-LABOR</button></div>';
 document.body.appendChild(v);
 v.querySelector('#hahnBack').onclick=()=>{H.leave();H.onEnd?.(out);};
}
Object.assign(H,{roosterActor,syncBack,snapshot,drawRooster,feathers,isH,resetScene(){FEATHERS.length=0;FLYING.length=0;endShot();SH.queue=[];SH.gap=1.5;},setSim(v){H.inSim=!!v;}});
window.HAHN_ARENA_LOADED=true;
})();
