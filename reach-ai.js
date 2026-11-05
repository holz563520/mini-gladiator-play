'use strict';
// =====================================================================================================
// REICHWEITEN-KI (Wunsch Thomas 5.11.2026): Jeder Gladiator hält den Abstand, der zu seiner Waffenklasse passt.
// · Wunschabstand je Waffe (Mitte zu Mitte): lange Waffen (Speer, Dreizack, Hellebarde, Zweihänder) 80 % der
//   Reichweite, mittlere (Gladius, Langschwert, Axt, Streitkolben) 88 %, kurze (Dolch, Kurzschwert, Keule) 78 %.
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
function ideal(w){const R=w.range||50;return R>=75?R*.8:R<=48?R*.78:R*.88;}
RA.ideal=ideal;
RA.steer=(a,t,ef,d,keep,pressure,ranged)=>{
 if(!RA.active||ranged||!t||ef.w.ammo||a.retreat>0||a.flankTimer>0||a.g.role==='Assassine')return null;
 const tw=M.weapon(t);if(!tw||tw.ammo||t.down||t.g.dead)return null;
 const R=ef.range,TR=tw.range||50,an=Math.atan2(t.y-a.y,t.x-a.x),fw={x:Math.cos(an),y:Math.sin(an)},side={x:Math.cos(an+Math.PI/2)*a.side,y:Math.sin(an+Math.PI/2)*a.side};
 const mv=(fx,sx,mul,st,k)=>{RA.stats[k]++;return{vx:fw.x*fx+side.x*sx,vy:fw.y*fx+side.y*sx,mul,state:st};};
 // nie ineinanderlaufen
 const body=(a.r||12)+(t.r||12)+4;if(d<body){mode.set(a,'back');return mv(-1,.25,.8,'retreat','apart');}
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
