'use strict';
// =====================================================================================================
// REICHWEITEN-KI (Wunsch Thomas 5.11.2026): Gladiatoren suchen den Abstand, der zu ihrer Waffe passt.
// · Lange Waffen (Speer, Dreizack, Hellebarde, Zweihänder) gegen kürzere: halten den Gegner auf 68–90 % ihrer
//   Reichweite, weichen zurück, wenn er zu nah kommt, und stechen, sobald er hineinläuft.
// · Kurze Waffen (Dolch, Kurzschwert, Keule) gegen längere: warten knapp außerhalb der gegnerischen Reichweite,
//   bis der Gegner zuschlägt oder sich erholt, dann schließen sie schnell die Distanz und bleiben dicht dran.
// · Nur aktiv mit M.reachAI.active = true (heute nur im Block-Editor); sim.js ruft den Haken über
//   M.reachAI?.steer auf. Keine Würfel, nur Richtung und Tempo der Bewegung. Spielregel-Änderung: nicht freigegeben.
// =====================================================================================================
(()=>{
const M=window.MG;if(!M||M.reachAI)return;
const RA={active:true,holdBand:false,backMul:.68,rushMul:1.55,stats:{back:0,hold:0,rush:0,stick:0}};M.reachAI=RA;
const away=(a,t)=>{const an=Math.atan2(a.y-t.y,a.x-t.x);return{x:Math.cos(an),y:Math.sin(an)};};
RA.steer=(a,t,ef,d,keep,pressure,ranged)=>{
 if(!RA.active||ranged||!t||ef.w.ammo||a.retreat>0||a.flankTimer>0||a.g.role==='Assassine')return null;
 const tw=M.weapon(t);if(!tw||tw.ammo||t.down)return null;
 const R=ef.range,TR=tw.range||50,an=Math.atan2(t.y-a.y,t.x-a.x),fw={x:Math.cos(an),y:Math.sin(an)},bk={x:-fw.x,y:-fw.y},side={x:Math.cos(an+Math.PI/2)*a.side,y:Math.sin(an+Math.PI/2)*a.side};
 const tired=a.energy<14;
 // lange Waffe gegen kürzere
 if(R>=TR+15){
  // Rückwärts ist langsamer als vorwärts: der Kurze kann aufholen, wenn er im richtigen Moment kommt
  if(d<R*.62&&!pressure&&!tired&&a.cool>.2){RA.stats.back++;return{vx:bk.x*.9+side.x*.3,vy:bk.y*.9+side.y*.3,mul:RA.backMul,state:'retreat'};}
  if(RA.holdBand&&d<=R*.9&&d>=R*.62){RA.stats.hold++;return{vx:side.x*.35+fw.x*.05,vy:side.y*.35+fw.y*.05,mul:.6,state:'guard'};}
  return null;}
 // kurze Waffe gegen längere
 if(R<=TR-15){
  const inside=d<R*.95,threat=t.wind>0||(t.cool<=.15&&!(t.swing>0));
  if(inside){RA.stats.stick++;return{vx:fw.x*.7+side.x*.2,vy:fw.y*.7+side.y*.2,mul:1,state:'move'};}
  if(d<TR+t.r+4&&threat&&!(a.wind>0)){RA.stats.back++;return{vx:bk.x*.6+side.x*.6,vy:bk.y*.6+side.y*.6,mul:.75,state:'circle'};}
  const opening=t.cool>.35||t.swing>0||t.stagger>0||t.stun>0;
  if(opening&&!tired&&d<TR+60){RA.stats.rush++;a.energy=Math.max(0,a.energy-.03);return{vx:fw.x,vy:fw.y,mul:RA.rushMul,state:'move'};}
  if(d<TR+26){RA.stats.hold++;return{vx:side.x*.7,vy:side.y*.7,mul:.55,state:'circle'};}
  return null;}
 return null;};
})();
