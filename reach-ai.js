'use strict';
// =====================================================================================================
// REICHWEITEN-KI (Wunsch Thomas 5.11.2026): Jeder Gladiator hält den Abstand, der zu seiner Waffenklasse passt.
// · Wunschabstand je Waffe (Mitte zu Mitte): lange Waffen (Speer, Dreizack, Hellebarde, Zweihänder) einen Teil der
//   Reichweite (85 %), mittlere (Gladius, Langschwert, Axt, Streitkolben) die volle Reichweite, kurze 85 % – Körper berühren sich bei ~40.
// · Zu nah: zurückweichen (rückwärts langsamer als vorwärts). Zu weit: herangehen. Im Band: halten und leicht
//   seitlich kreisen – keine Schritte mehr in den Gegner hinein. Mit Nachlauf (Hysterese), damit niemand zappelt.
// · Kurze gegen lange Waffe: wartet knapp außerhalb der gegnerischen Reichweite, bis der Gegner zuschlägt oder sich
//   erholt, stürmt dann hinein und bleibt dicht dran. Lange gegen kurze: weicht zurück, solange sie nicht schlagbereit ist.
// · Nie ineinander: unter Körperabstand weichen beide.
// · sim.js ruft M.reachAI?.steer im Bewegungsteil auf (nur wenn nicht gerade geschlagen wird). Keine Würfel.
// =====================================================================================================
(()=>{
const M=window.MG;if(!M||M.reachAI)return;
const RA={active:true,backMul:.7,rushMul:1.5,band:.12,stats:{back:0,hold:0,fwd:0,rush:0,apart:0}};M.reachAI=RA;
const mode=new WeakMap();
// Wunschabstand Mitte zu Mitte; Körper berühren sich schon bei rund 40
// Untergrenze 44: so nah stehen auch Dolchkämpfer nur Brust an Brust, nicht ineinander
function ideal(w){const R=w.range||50;return Math.max(44,R>=75?R*.85:R<=48?R*.85:R);}
RA.ideal=ideal;
const S=M.s;
// ---------------------------------------------------------------- Schubsen / mit dem Schild umstoßen
// Wer zu dicht steht und Platz für seine Waffe braucht, stößt den Gegner mit beiden Händen oder dem Schild weg.
// Kraft entscheidet: Stärke, Körpergewicht und Schildgewicht gegen Stärke, Gleichgewicht und Gewicht des anderen.
// Stärkerer Stoß: Gegner fliegt zurück, taumelt oder fällt um. Schwächerer Stoß: prallt ab, der Schubser wankt.
const shoves=new Map();RA.shoves=shoves;RA.stats.shove=0;RA.stats.fall=0;RA.stats.stagger=0;RA.stats.bounce=0;
const SHOVE={wind:.12,hit:.2,end:.42};
function play(k,v){try{(M.blockContact?.play||M.audioEngine?.ksPlay)?.(k,v,1);}catch{}}
function power(x){const st=x.g.stats,sh=M.usableShield(x)&&!M.weapon(x).twoHand?M.itemStats(M.usableShield(x)):null;
 return{push:(st.strength||50)*1+(x.g.weight||80)*.3+(sh?(sh.weight||4)*3:0)+(x.energy||0)*.05,hold:(st.strength||50)*.55+(st.balance||50)*.35+(x.g.weight||80)*.3+(x.block?6:0),shield:!!sh};}
function tryShove(a,t,d,ef,dt=1/60){if(!RA.shove||a.hahn||a.lion||a.rex||a.dog||t.hahn||t.lion||t.rex||t.dog)return false;
 if(a.wind>0||a.swing>0||a.pendingStrike||a.stun>0||a.stagger>0||a.energy<16||(a.shoveCD||0)>S.battle.time||shoves.has(a.id)||shoves.has(t.id))return false;
 if(t.down||t.fallTimer>0||t.kneeTimer>0||t.g.dead)return false;
 // Wer gern nah kämpft (Dolch), schubst nur, wenn es wirklich eng ist
 // nur, wer deutlich enger steht, als seine Waffe es will (Dolchkämpfer also fast nie)
 // nicht sofort: rund zweimal je Sekunde eine Gelegenheit, dann 2,6 s Pause
 if(M.rng()>8*dt)return false;
 const p=power(a);shoves.set(a.id,{t:0,target:t.id,hit:false,shield:p.shield});a.shoveCD=S.battle.time+2.6;a.cool=Math.max(a.cool||0,.5);a.energy-=8;RA.stats.shove++;return true;}
RA.step=(a,dt)=>{let s=shoves.get(a.id);
 // Gelegenheit zum Schubsen in jedem Bild prüfen (auch mitten im Gefecht, nicht nur beim Gehen)
 if(!s&&RA.shove&&a.target&&a.g.role!=='Fernkämpfer'){const t=M.blockContact?.actor?.(a.target);if(t&&t.team!==a.team&&!t.down&&!a.down){const w=M.weapon(a);if(w&&!w.ammo){const d=Math.hypot(t.x-a.x,t.y-a.y);
   if(d<50&&d<ideal(w)-3&&tryShove(a,t,d,{w},dt)){s=shoves.get(a.id);}}}}
 if(!s)return false;const t=M.blockContact?.actor?.(s.target)||S.battle.actors.find(x=>x.id===s.target);
 if(!t||a.down||a.g.dead||a.stun>0||a.fallTimer>0){shoves.delete(a.id);return false;}
 s.t+=dt;a.moveSpeed=0;a.wind=0;a.state='guard';a.a=Math.atan2(t.y-a.y,t.x-a.x);a.kx=a.ky=0;
 if(!s.hit&&s.t>=SHOVE.hit){s.hit=true;const d=Math.hypot(t.x-a.x,t.y-a.y);
  if(d<(a.r||12)+(t.r||12)+22&&!t.down&&!t.g.dead){const P=power(a),H=power(t),q=P.push/Math.max(1,H.hold),ang=Math.atan2(t.y-a.y,t.x-a.x);
   play(s.shield?'tr_schildstoss':'tr_schubs',Math.min(1.1,.6+q*.3));
   if(q<.8){// prallt ab
    RA.stats.bounce++;M.combatResponses?.push?.(t,a,30,false);s.result='abgeprallt';}
   else{s.drive={id:t.id,left:.2,v:Math.min(95,45+60*(q-.8)),ang};t.cool=Math.max(t.cool||0,.35);
    if(q>1.05&&t.wind>0&&!t.pendingStrike){t.wind=0;}
    if(q>1.3&&M.rng()<Math.min(.8,(q-1.15)*1.1)){RA.stats.fall++;if(M.knockdown?.(t,s.shield?'Mit dem Schild umgestoßen':'Umgestoßen',1.4)!==false){/* fällt vom Schubser weg nach hinten */t.a=Math.atan2(a.y-t.y,a.x-t.x);t.fallSide=-1;s.faceBack=true;}s.result='umgestoßen';}
    else if(q>1.02){RA.stats.stagger++;try{M.stagger?.(t,6+Math.min(12,(q-1)*20),ang);}catch{}s.result='taumelt';}
    else s.result='weggeschoben';}
   try{RA.onEvent?.({kind:'shove',att:a,def:t,q,result:s.result,shield:s.shield});}catch{}}
  else s.result='ins Leere';}
 // Stoß wirkt einige Bilder lang (sonst nur ein paar Pixel): je nach Kraft 15–35 Schritte zurück
 if(s.drive&&s.drive.left>0){const t2=M.blockContact?.actor?.(s.drive.id);if(t2&&!t2.g.dead){t2.kx=Math.cos(s.drive.ang)*s.drive.v;t2.ky=Math.sin(s.drive.ang)*s.drive.v;if(s.faceBack){t2.a=s.drive.ang+Math.PI;t2.fallSide=-1;}}s.drive.left-=dt;}
 if(s.t>=SHOVE.end){shoves.delete(a.id);}
 return true;};
// Pose (arena.js über block-contact.js): beide Hände bzw. der Schild stoßen gegen die Brust des Gegners
RA.pose=(a,main,off,angle,c)=>{const s=shoves.get(a.id);if(!s)return null;const t=M.blockContact?.actor?.(s.target);if(!t)return null;
 let cp;try{cp=M.contactAnchor(t,'chest');}catch{return null;}const sx=c.sx,sy=c.sy,P={x:(cp.x-a.x)/sx,y:(cp.y-a.y)/sy-c.bob};
 const k=s.t<SHOVE.wind?-(s.t/SHOVE.wind)*.6:s.t<SHOVE.hit+.06?Math.min(1,(s.t-SHOVE.wind)/(SHOVE.hit-SHOVE.wind)):Math.max(0,1-(s.t-SHOVE.hit-.06)/(SHOVE.end-SHOVE.hit-.06));
 const home={x:9,y:-50},T={x:P.x-4,y:P.y},lerp=(p,q,u)=>({x:p.x+(q.x-p.x)*u,y:p.y+(q.y-p.y)*u}),u=Math.max(0,k),pull=Math.max(0,-k);
 const base={x:home.x-pull*6,y:home.y};
 if(s.shield)return{main:{x:6-pull*3,y:-42},off:lerp(base,{x:T.x,y:T.y},u),angle:-1.2};
 return{main:lerp(base,{x:T.x,y:T.y-3},u),off:lerp({x:base.x-2,y:base.y+5},{x:T.x,y:T.y+4},u),angle:-1.25};};
RA.lungeFor=a=>{const s=shoves.get(a.id);if(!s)return null;const k=s.t<SHOVE.wind?0:s.t<SHOVE.hit+.06?Math.min(1,(s.t-SHOVE.wind)/(SHOVE.hit-SHOVE.wind)):Math.max(0,1-(s.t-SHOVE.hit-.06)/(SHOVE.end-SHOVE.hit-.06));return{front:7*k,back:3*k,drop:2.5*k,lift:0};};

// ---------------------------------------------------------------- Amputationsschlag gegen Kniende und Gestürzte
// Wer einen Gegner in der Hocke oder am Boden (gestürzt, nicht kampfunfähig) vor sich hat, holt manchmal weit zu einem
// gezielten Schlag auf Arm oder Bein aus (längeres Ausholen, sichtbar). Gelingt der Treffer, trennt er leichter ab.
// Kniende können noch (schwächer) blocken, Liegende nicht. Nur Klingen und Äxte, keine Stichwaffen.
const AMP_W=new Set(['short','gladius','long','greatsword','axe','doubleaxe','halberd']);
RA.amp={chance:.25,wind:1.35,hp:14,bonus:.25,dmg:1.2,kneel:.4};RA.stats.amp=0;RA.stats.ampCut=0;
RA.kneelBlock=()=>RA.active?RA.amp.kneel:0;
RA.amputate=(a,b,followup)=>{a.amputate=null;if(!RA.active||followup||!b||b.down||a.hahn||a.lion||a.rex||b.hahn||b.lion||b.rex)return;
 if(!(b.kneeTimer>0||b.fallTimer>0))return;const w=M.weapon(a);if(!w||w.ammo||!AMP_W.has(w.id)||['kick','shieldBash','spin','thrust'].includes(a.technique))return;
 if(M.rng()>RA.amp.chance)return;
 const legs=b.fallTimer>0?.6:.4,pool=M.rng()<legs?['lt','rt','lsh','rsh']:['lua','rua','lfa','rfa'],free=pool.filter(id=>!b.g.body[id]?.missing);if(!free.length)return;
 const part=free[Math.floor(M.rng()*free.length)];a.technique=['axe','doubleaxe','halberd','greatsword'].includes(w.id)?'overhead':'slash';
 a.windMax=(M.meleeTiming?M.meleeTiming(a.g,w,a.technique).wind:a.windMax)*RA.amp.wind;a.amputate={target:b.id,part};RA.stats.amp++;
 try{RA.onEvent?.({kind:'ampStart',att:a,def:b,part,kneel:b.kneeTimer>0});}catch{}};
RA.onStrike=(a,b,ef)=>{const am=a.amputate;if(!am||am.target!==b.id||b.g.body[am.part]?.missing)return;ef.partId=am.part;ef.amputate=true;ef.damage*=RA.amp.dmg;try{a.contactPoint=M.contactAnchor(b,am.part);}catch{}};
// Gezielter Schlag: auch ein noch nicht zerstörtes Glied kann abgetrennt werden – je mehr Wucht und je verletzter, desto eher.
// Gesamtchance (ohne Arena-Risiko, Kritisch, tiefen Schnitt) etwa 10–35 %; das Spiel rechnet sein Grundrisiko (13 %) mit ein.
RA.amputeBonus=(a,b,id,w,dmg)=>{const am=a.amputate;if(!RA.active||!am||am.target!==b.id||am.part!==id)return null;const p=b.g.body[id];
 const want=Math.max(.04,Math.min(.35,.05+(dmg-12)*.01+(1-Math.max(0,p.hp)/100)*.25));return{hp:999,chance:want-.13};};
RA.shove=true;

RA.steer=(a,t,ef,d,keep,pressure,ranged)=>{
 if(!RA.active||ranged||!t||ef.w.ammo||a.retreat>0||a.flankTimer>0||a.g.role==='Assassine')return null;
 const tw=M.weapon(t);if(!tw||tw.ammo||t.down||t.g.dead)return null;
 const R=ef.range,TR=tw.range||50,an=Math.atan2(t.y-a.y,t.x-a.x),fw={x:Math.cos(an),y:Math.sin(an)},side={x:Math.cos(an+Math.PI/2)*a.side,y:Math.sin(an+Math.PI/2)*a.side};
 const mv=(fx,sx,mul,st,k)=>{RA.stats[k]++;return{vx:fw.x*fx+side.x*sx,vy:fw.y*fx+side.y*sx,mul,state:st};};
 // zu nah: wegschubsen (Kraft entscheidet), sonst zurückweichen
 const body=Math.max(40,(a.r||12)+(t.r||12)+4);
 if(d<body){mode.set(a,'back');return mv(-1,.25,.8,'retreat','apart');}
 const tired=a.energy<14,want=ideal(ef.w),band=want*RA.band;let m=mode.get(a)||'hold';
 // kurze gegen deutlich längere Waffe: erst außerhalb warten, bei Öffnung hineinstürmen
 if(R<=TR-22){
  const inside=d<R+(t.r||12),threat=t.wind>0||(t.cool<=.15&&!(t.swing>0)),opening=t.cool>.35||t.swing>0||t.stagger>0||t.stun>0,wait=TR+(t.r||12)+6;
  if(inside){mode.set(a,'hold');return d>want+band?mv(.8,.15,1,'move','fwd'):d<want-band?mv(-.6,.3,RA.backMul,'retreat','back'):a.cool<=.3?mv(.12,0,.35,'guard','hold'):mv(0,.4,.45,'circle','hold');}
  if(opening&&!tired){mode.set(a,'fwd');RA.stats.rush++;a.energy=Math.max(0,a.energy-.03);return{vx:fw.x,vy:fw.y,mul:RA.rushMul,state:'move'};}
  if(threat&&d<wait){mode.set(a,'back');return mv(-.6,.6,.75,'circle','back');}
  if(d<wait+20){mode.set(a,'hold');return mv(0,.7,.55,'circle','hold');}
  return null;}
 // Hysterese: zurück unter want-band (raus erst über want-band*.3), vor über want+band (raus unter want+band*.3)
 const e=d-want;
 if(m==='back'&&e>-band*.3)m='hold';else if(m==='fwd'&&e<band*.3)m='hold';
 if(m==='hold'){if(e<-band)m='back';else if(e>band)m='fwd';}
 // lange Waffe gegen kürzere: nur zurückweichen, solange nicht schlagbereit (sonst zustechen lassen)
 // Zurückweichen nur, wenn die eigene Waffe deutlich länger ist (und gerade nicht schlagbereit) oder es viel zu eng wird –
 // sonst jagen sich zwei ähnlich lange Waffen gegenseitig über das Feld
 if(m==="back"&&!(R>=TR+22&&a.cool>.2)&&e>-band*2.5)m="hold";
 if(m==='back'&&(tired||pressure)&&e>-band*2)m='hold';
 mode.set(a,m);
 if(m==='back')return mv(-.9,.3,RA.backMul,'retreat','back');
 if(m==='fwd'){if(d>want+60)return null;// weit weg: normale Annäherung (inkl. Sprint) des Spiels
  // nach einem Rückstoß zügig wieder auf Abstand kommen, im letzten Stück vorsichtig
  return mv(1,.1,e>band*2.5?1.2:pressure?1.1:.95,'move','fwd');}
 // schlagbereit: zum Gegner ausrichten (sonst kein Angriff aus dem Kreisen heraus), sonst leicht seitlich kreisen
 if(a.cool<=.3)return mv(.12,0,.35,'guard','hold');
 return mv(0,.4,.45,'circle','hold');};
})();
