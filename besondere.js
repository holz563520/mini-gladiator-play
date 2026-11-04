'use strict';
// =====================================================================================================
// BESONDERE GLADIATOREN (Wunsch Thomas 4.11.2026): Beim Sklavenhändler ist ab und zu jemand mit Kleinwuchs oder Riesenwuchs dabei.
// · Je Kandidat 1 : 150 Kleinwuchs und 1 : 150 Riesenwuchs (bei fünf Kandidaten am Tag etwa alle 15 Tage einer).
// · Kleinwuchs: etwa 50 cm kleiner (Mittel 129 cm statt 179 cm), kurze Arme und Beine, stämmig gezeichnet;
//   Stärke +20 (normalverteilt). (Die zuerst eingebaute eigene Doppelaxt hat Thomas am 4.11. wieder gestrichen.)
// · Stimme (audio.js): Kleinwuchs sehr hoch, Riesenwuchs tief.
// · Riesenwuchs: groß (Mittel 222 cm); Stärke +40 (normalverteilt, darf über 100 steigen), Beweglichkeit (Laufgeschwindigkeit) −10,
//   Zweihandwaffen (Doppelaxt, Hammer, Hellebarde, Zweihandschwert) +30.
//   Die Zuschläge gelten für IST und SOLL (Potenzial), damit sie bleiben und weiter wachsen können.
// · Publikumslieblinge: Ist einer von ihnen bei einem Arenakampf oder Boxkampf dabei, gibt es doppeltes Preisgeld (sim.js finish,
//   box-game.js), der Sprecher stellt sie eigens vor (moderator.js) und die Menge feuert sie während des Kampfes mit Sprechchören an.
// · Sumo (Wunsch Thomas 4.11., je Kandidat 1 : 40): sehr schwer (~150 kg, viel Fett, Figur deutlich breiter), Zähigkeit +30 (darf über 100),
//   Stärke +20, Beweglichkeit (Laufgeschwindigkeit) −30, Ausdauer −20, alles normalverteilt auf IST und SOLL. Schweres Gewicht macht ihn im
//   Gedränge breiter (Körperradius aus dem Gewicht), viel Fett erholt sich langsamer (bestehende Regeln). Kein doppeltes Preisgeld (zu häufig),
//   aber Vorstellung und Anfeuern wie bei den anderen.
// Gespeichert wird nur g.stature ('dwarf'|'giant') und g.statureWide (Breite der Figur); alte Spielstände bleiben unverändert.
// =====================================================================================================
(()=>{
const M=window.MG;if(!M||M.special)return;const S=M.s;
const CHANCE=1/150,CHANCE_SUMO=1/40,TWO=['doubleaxe','hammer','halberd','greatsword'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Normalverteilung mit eigenem Zufall (Math.random), damit der Kampf-Zufall (S.rng) unberührt bleibt
const normal=(mean,sd)=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return mean+sd*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
const NAME={dwarf:'Kleinwuchs',giant:'Riesenwuchs',sumo:'Sumo'},DOUBLE=new Set(['dwarf','giant']),BADGE={dwarf:'▼ KLEINWUCHS',giant:'▲ RIESENWUCHS',sumo:'● SUMO'};
// IST und SOLL um denselben Betrag verschieben; SOLL bleibt mindestens so hoch wie IST
function shiftStat(g,k,d,max=Infinity){const v=Math.round(clamp(g.stats[k]+d,1,max));g.stats[k]=v;if(g.caps?.stats)g.caps.stats[k]=Math.max(v,Math.round(clamp((g.caps.stats[k]??v)+d,1,max)));}
function shiftWeapon(g,id,d){const v=Math.round(clamp((g.mastery[id]||10)+d,1,Infinity));g.mastery[id]=v;if(g.caps?.weapons)g.caps.weapons[id]=Math.max(v,Math.round((g.caps.weapons[id]??v)+d));}
function body(g,h,armK,legK){g.height=h;g.arm=Math.round(h*armK+normal(0,2));g.leg=Math.round(h*legK+normal(0,2));g.weight=Math.round((h-100)*.62+g.muscle*.58+g.fat*.6);g.build=g.weight>95?'Kräftig':h<171?'Kompakt':g.fat<13?'Sehnig':'Athletisch';}
// Aus einem fertig erzeugten Kandidaten einen besonderen machen
function make(g,kind){if(!g||g.stature||!NAME[kind])return g;M.ensureCareer?.(g);g.stature=kind;
 if(kind==='dwarf'){body(g,Math.round(clamp(normal(129,5),116,142)),.38,.41);g.statureWide=1.3;shiftStat(g,'strength',normal(20,4));}
 else if(kind==='sumo'){const h=Math.round(clamp(normal(180,7),165,198));g.fat=Math.round(clamp(normal(40,4),32,50));body(g,h,.43,.47);g.weight=Math.round(clamp(normal(150,12),125,185));g.build='Massig';g.statureWide=1.38;shiftStat(g,'toughness',normal(30,5));shiftStat(g,'strength',normal(20,4));shiftStat(g,'agility',-normal(30,4),100);shiftStat(g,'stamina',-normal(20,4),100);}
 else{body(g,Math.round(clamp(normal(222,6),208,238)),.43,.49);g.statureWide=1.06;shiftStat(g,'strength',normal(40,6));shiftStat(g,'agility',-normal(10,2),100);for(const id of TWO)shiftWeapon(g,id,normal(30,4));}
 if(g.genes&&typeof g.genes==='object'){g.genes.height=g.height;}return g;}
// Würfeln beim Erzeugen der Tagesware
function roll(g){const r=Math.random();return r<CHANCE?make(g,'dwarf'):r<2*CHANCE?make(g,'giant'):r<2*CHANCE+CHANCE_SUMO?make(g,'sumo'):g;}
// Nach dem Kauf: nichts Besonderes mehr (Altlast aus der ersten Fassung: mitgebrachte Doppelaxt entfällt)
function arrive(g){if(g)delete g.ownWeapon;}
const fans=gs=>gs.filter(g=>g&&g.stature);
// ---------- Sprüche ----------
const L={
 traderDwarf:['Klein, ich weiß. Aber schau dir die Arme an! Der stemmt mehr als du.','Das Publikum wird ihn lieben. Klein und wütend – mehr Spektakel gibt es für hundert Gold nirgends.','Unterschätz ihn nicht. Das haben schon viele. Die liegen jetzt unter der Erde, er steht noch.','Er reicht dir bis zum Gürtel und hebt dich trotzdem hoch.','In Ostia haben sie für ihn doppelten Eintritt bezahlt. Doppelt, Lanista!'],
 traderGiant:['Ein Riese! Kein Witz, schau nach oben. Weiter. Noch weiter.','Den habe ich mit drei Ketten bringen müssen. Eine hat er unterwegs zerrissen.','Langsam ist er, ja. Aber wenn er trifft, steht keiner mehr auf. Gib ihm was Zweihändiges.','Die Menge wird toben. Bei einem Riesen tobt die Menge immer. Doppeltes Preisgeld, wenn du mich fragst.','Er isst für drei. Er kämpft auch für drei.'],
 chantDwarf:['Die Menge skandiert: „{N}! {N}!“ – der Kleine ist ihr Liebling.','Das Publikum steht auf für {N}. Klein, aber der Sand bebt.','„Hau sie um, Kleiner!“ – die Ränge feuern {N} an.','Jubel auf allen Rängen: {N} wirbelt durch den Sand.','Die Leute stampfen im Takt für {N}. Sie lieben ihn.'],
 chantGiant:['Die Menge skandiert: „RIESE! RIESE!“ – {N} ist der Liebling der Ränge.','Das Publikum tobt, sobald {N} sich bewegt. Der Boden zittert mit.','„Zerdrück sie, {N}!“ – die Ränge sind außer sich.','Jeder Schritt von {N} bekommt Applaus. Das hat die Arena lange nicht gesehen.','Die Leute recken die Fäuste für {N}. Ein Riese im Sand – dafür kommen sie.'],
 hitDwarf:['{N} schlägt zu – die Menge brüllt vor Begeisterung!','Der Kleine hat ihn erwischt! Die Ränge explodieren.'],

 traderSumo:['Ja, der ist schwer. Sehr schwer. Mein Wagen hat zwei Achsen verloren. Aber umwerfen? Den wirft keiner um.','Der frisst dir die Vorräte leer, ich warne dich. Dafür prallen Schwerter an ihm ab wie an einem Weinfass.','Schnell ist er nicht. Er muss auch nicht schnell sein. Er muss nur dastehen.','Ein Fels in Menschengestalt. Wer gegen ihn rennt, rennt gegen eine Mauer.','Die Leute lachen, wenn er hereinkommt. Wenn er wieder geht, lacht keiner mehr.'],
 chantSumo:['Die Menge stampft im Takt: „{N}! {N}!“ – der Koloss ist im Sand.','Das Publikum johlt, wenn {N} sich in Bewegung setzt. Langsam, aber unaufhaltsam.','„Platt machen, {N}!“ – die Ränge sind auf seiner Seite.','Jeder Treffer prallt an {N} ab, und die Menge jubelt bei jedem einzelnen.'],
 hitSumo:['{N} walzt ihn nieder – die Ränge kochen!','Unter {N} ist er begraben! Das Publikum tobt.'],
 hitGiant:['{N} fegt ihn um – die Ränge kochen!','Ein Schlag wie ein Baumstamm! Das Publikum feiert {N}.']};
L.hit={dwarf:L.hitDwarf,giant:L.hitGiant,sumo:L.hitSumo};L.chant={dwarf:L.chantDwarf,giant:L.chantGiant,sumo:L.chantSumo};L.trader={dwarf:L.traderDwarf,giant:L.traderGiant,sumo:L.traderSumo};
const pickL=a=>a[Math.floor(Math.random()*a.length)],fill=(t,g)=>t.replace(/\{N\}/g,g.name);
// ---------- Anfeuern im Kampf (reine Darstellung, keine Spielwirkung) ----------
let track=null;
function watch(){const b=S.battle;if(!b||b.benchmark||b.finale||b.paused||typeof document==='undefined'||!document.body?.classList.contains('bhud')||M.modIntro?.())return;
 if(!track||track.id!==b.id)track={id:b.id,next:3+Math.random()*3,down:new Set(b.actors.filter(a=>a.down||a.g?.dead).map(a=>a.id))};
 const live=b.actors.filter(a=>a.g?.stature&&!a.g.dead&&!a.down&&!a.surrendered&&!a.dog&&!a.rex);
 // Wer von einem Publikumsliebling niedergestreckt wird, bringt die Ränge zum Kochen
 for(const v of b.actors){if(!(v.down||v.g?.dead)){track.down.delete(v.id);continue;}if(track.down.has(v.id))continue;track.down.add(v.id);const a=b.actors.find(x=>x.id===v.lastAttackerId);if(a?.g?.stature&&a.team!==v.team)setTimeout(()=>{M.moderator?.say?.(fill(pickL(L.hit[a.g.stature]),a.g),3);M.crowdCheer?.(.8);},2200);}
 if(!live.length||b.time<track.next)return;track.next=b.time+16+Math.random()*10;
 const a=pickL(live);M.moderator?.say?.(fill(pickL(L.chant[a.g.stature]),a.g),2);M.crowdChant?.(a.g,{team:a.team});M.crowdCheer?.(.7);}
if(typeof setInterval==='function'&&typeof document!=='undefined')setInterval(()=>{try{watch();}catch(e){console.error(e);}},400);
// ---------- Anzeige ----------
const badge=g=>g?.stature?`<b class="sp-badge sp-${g.stature}" title="Publikumsliebling${DOUBLE.has(g.stature)?': doppeltes Preisgeld bei Kämpfen':''}">${BADGE[g.stature]||''}</b>`:'';
if(typeof document!=='undefined'){const st=document.createElement('style');st.textContent=`.sp-badge{display:inline-block;margin:3px 0 0;padding:1px 5px;border:1px solid #dfb66d;color:#f0c46a;font:700 10px/14px 'Courier Prime',ui-monospace,monospace;letter-spacing:.06em;background:#2a1f10}.sp-badge.sp-sumo{border-color:#9fbf8a;color:#bfe0a4;background:#18231a}.sp-badge.sp-giant{border-color:#d98b5f;color:#f2a477;background:#2b1712}`;document.head?.appendChild(st);}
M.special={CHANCE,CHANCE_SUMO,TWO,NAME,BADGE,make,roll,arrive,fans,badge,traderLines:g=>L.trader[g?.stature]||[],lines:L,
 // Preisgeld: doppelt, sobald einer der Kämpfer ein Publikumsliebling ist (nicht mehrfach)
 purseFactor:gs=>(gs||[]).some(g=>g&&DOUBLE.has(g.stature))?2:1};
})();
