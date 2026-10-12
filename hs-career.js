'use strict';
// =====================================================================================================
// KAPITEL 2 · „DIE HÜHNERSCHULE DES GRAUENS“ – Zustand und Anschluss der neuen Arena
// · S.huehner hält alles, was dieses Kapitel braucht: Stand der Geschichte, Schild, Beastrium, eigene Hähne, Gefallene,
//   Tagesangebot der Hühnerhändlerin, Statistik und den Dorftrottel. Wird mit dem Spielstand gespeichert.
// · Im Spiel gibt es schon window.ArenaCareer (dist/arena-game.js: Gladiatoren, Gold, Statistik). Dieses Objekt wird nur
//   ergänzt: eigene Hähne, Gruppengröße 1–3 bei Hähnen, gesperrte Bereiche während des Kapitels, Sonderherausforderung,
//   eigene Vorstellung, Dorfplatz für Hahn gegen Hahn. In der Testversion (ohne Spieladapter) entsteht ein eigenes Objekt.
// · Tageswechsel des Spiels heilt auch die Hähne (Heilungsmodell der Hähne) und bringt der Händlerin neue Ware.
// =====================================================================================================
(()=>{
const M=window.MG,S=M.s,CF=window.CF;
const HS=window.HS={};
HS.st=()=>(S.huehner??={stage:'',sign:false,beastrium:false,roosters:[],fallen:[],offer:null,fights:0,wins:0,idiot:null,first:null,lastGains:null});
HS.alive=()=>HS.st().roosters.filter(R=>!R.dead);
const base=window.ArenaCareer;let pending=null;
const C=base||{startHidden:true,lions:[],fallen:[],
 get gold(){return S.gold;},get fights(){return HS.st().fights;},get wins(){return HS.st().wins;},
 settle(pay){pending={pay,gold:S.gold};},
 record(){},
 nextDay(n=1){for(let i=0;i<n;i++){try{M.ui.click('rest');}catch(e){console.warn(e);}}},
 close(){window.ArenaUI?.close();try{M.ui.click('nav:home');}catch{}}};
Object.defineProperty(C,'roosters',{configurable:true,get:()=>HS.st().roosters});
// Gold: Dorfplatz-Kämpfe laufen ohne Kampfansicht des Spiels → Prämie direkt buchen; sonst wie der Adapter es vorsieht
{const s0=C.settle;C.settle=function(pay,out,c,direct){if(direct){S.gold+=pay;return;}return s0?.call(this,pay,out,c);};}
{const r0=C.record;C.record=function(won){if(window.ArenaUI?.mode==='beast'){const s=HS.st();s.fights++;if(won)s.wins++;}return r0?.call(this,won);};}
{const a0=C.addFallen;C.addFallen=function(f){if(f?.kind==='rooster'){HS.st().fallen.push(f);return;}return a0?.call(this,f);};}
{const c0=C.close;C.close=function(){const r=c0?.apply(this,arguments);HS.onArenaClosed?.();return r;};}
Object.assign(C,{
 // Hähne kämpfen zu eins, zwei oder drei
 sizes:U=>U.mode==='beast'&&U.species==='hahn'?[1,2,3]:[1,2,3,5],
 locked:key=>HS.lockMsg?.(key)||'',
 extraChallenges:units=>HS.extraChallenges?.(units)||[],
 recommend:c=>HS.recommend?.(c)||'',
 present:(c,done)=>HS.present?.(c,done)||false,
 onResult:R=>HS.onResult?.(R),
 runFight:(spec,c,done)=>HS.runFight?.(spec,c,done)||false});
Object.defineProperty(C,'cross',{configurable:true,get:()=>HS.st().stage==='fight1'?0:null});
window.ArenaCareer=C;HS.career=C;
// Dorfplatz-Kämpfe (Hahn gegen Hahn, FightEngine des Hahnenkampf-Prototyps) haben nur rund 13 Schlagabtausche. Ohne Ausgleich
// lernen Hähne dort etwa ein Zehntel dessen, was ein Arenakampf bringt; Faktor 4 bringt beide in dieselbe Größenordnung.
{const P=CF.FightEngine?.prototype;if(P?.learn&&!P.learn.hs){const b=P.learn;P.learn=function(f,group,key,amount){return b.call(this,f,group,key,amount*(globalThis.HAHN_VILLAGE_LEARN||4));};P.learn.hs=true;}}
// Testversion ohne Spieladapter: Prämie der Herausforderung statt der Ligaprämie des Spiels
if(!base){const baseFinish=M.onFinish;M.onFinish=function(report){if(pending){const p=pending;pending=null;S.gold=p.gold+p.pay;if(report)report.gold=p.pay;if(S.lastReport)S.lastReport.gold=p.pay;}return baseFinish?.apply(this,arguments);};}
// Tageswechsel: am Spieltag (S.day) erkannt statt über M.advanceDay, weil das Spiel diese Funktion zur Laufzeit neu verdrahtet
let seenDay=null;
HS.syncDay=()=>{if(seenDay==null){seenDay=S.day;return;}const n=S.day-seenDay;seenDay=S.day;if(n<=0)return;try{if(HS.alive().length)for(let i=0;i<Math.min(n,365);i++)CF.Healing.advanceDay(HS.alive(),0);HS.onDay?.();}catch(e){console.warn(e);}};
HS.resetDay=()=>{seenDay=S.day;};
setInterval(HS.syncDay,250);
})();
