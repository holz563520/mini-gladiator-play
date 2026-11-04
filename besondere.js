'use strict';
// =====================================================================================================
// BESONDERE GLADIATOREN (Wunsch Thomas 4.11.2026): Beim Sklavenhändler ist ab und zu jemand mit Kleinwuchs oder Riesenwuchs dabei.
// · Je Kandidat 1 : 150 Kleinwuchs und 1 : 150 Riesenwuchs (bei fünf Kandidaten am Tag etwa alle 15 Tage einer).
// · Kleinwuchs: etwa 50 cm kleiner (Mittel 129 cm statt 179 cm), kurze Arme und Beine, stämmig gezeichnet;
//   Stärke +20 (normalverteilt), bringt seine eigene Doppelaxt mit (Güte „Solide“, wird beim Kauf ausgerüstet).
// · Riesenwuchs: groß (Mittel 222 cm); Stärke +40 (normalverteilt, darf über 100 steigen), Beweglichkeit (Laufgeschwindigkeit) −10,
//   Zweihandwaffen (Doppelaxt, Hammer, Hellebarde, Zweihandschwert) +30.
//   Die Zuschläge gelten für IST und SOLL (Potenzial), damit sie bleiben und weiter wachsen können.
// · Publikumslieblinge: Ist einer von ihnen bei einem Arenakampf oder Boxkampf dabei, gibt es doppeltes Preisgeld (sim.js finish,
//   box-game.js), der Sprecher stellt sie eigens vor (moderator.js) und die Menge feuert sie während des Kampfes mit Sprechchören an.
// Gespeichert wird nur g.stature ('dwarf'|'giant') und g.statureWide (Breite der Figur); alte Spielstände bleiben unverändert.
// =====================================================================================================
(()=>{
const M=window.MG;if(!M||M.special)return;const S=M.s;
const CHANCE=1/150,TWO=['doubleaxe','hammer','halberd','greatsword'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Normalverteilung mit eigenem Zufall (Math.random), damit der Kampf-Zufall (S.rng) unberührt bleibt
const normal=(mean,sd)=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return mean+sd*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
const NAME={dwarf:'Kleinwuchs',giant:'Riesenwuchs'};
// IST und SOLL um denselben Betrag verschieben; SOLL bleibt mindestens so hoch wie IST
function shiftStat(g,k,d,max=Infinity){const v=Math.round(clamp(g.stats[k]+d,1,max));g.stats[k]=v;if(g.caps?.stats)g.caps.stats[k]=Math.max(v,Math.round(clamp((g.caps.stats[k]??v)+d,1,max)));}
function shiftWeapon(g,id,d){const v=Math.round(clamp((g.mastery[id]||10)+d,1,Infinity));g.mastery[id]=v;if(g.caps?.weapons)g.caps.weapons[id]=Math.max(v,Math.round((g.caps.weapons[id]??v)+d));}
function body(g,h,armK,legK){g.height=h;g.arm=Math.round(h*armK+normal(0,2));g.leg=Math.round(h*legK+normal(0,2));g.weight=Math.round((h-100)*.62+g.muscle*.58+g.fat*.6);g.build=g.weight>95?'Kräftig':h<171?'Kompakt':g.fat<13?'Sehnig':'Athletisch';}
// Aus einem fertig erzeugten Kandidaten einen besonderen machen
function make(g,kind){if(!g||g.stature||!NAME[kind])return g;M.ensureCareer?.(g);g.stature=kind;
 if(kind==='dwarf'){body(g,Math.round(clamp(normal(129,5),116,142)),.38,.41);g.statureWide=1.3;shiftStat(g,'strength',normal(20,4));g.ownWeapon={def:'doubleaxe',q:2};}
 else{body(g,Math.round(clamp(normal(222,6),208,238)),.43,.49);g.statureWide=1.06;shiftStat(g,'strength',normal(40,6));shiftStat(g,'agility',-normal(10,2),100);for(const id of TWO)shiftWeapon(g,id,normal(30,4));}
 if(g.genes&&typeof g.genes==='object'){g.genes.height=g.height;}return g;}
// Würfeln beim Erzeugen der Tagesware
function roll(g){const r=Math.random();return r<CHANCE?make(g,'dwarf'):r<2*CHANCE?make(g,'giant'):g;}
// Nach dem Kauf: eigene Doppelaxt ins Lager und anlegen (Doppelaxt braucht die Klasse Soldat)
function arrive(g){if(!g?.ownWeapon)return;const w=g.ownWeapon;delete g.ownWeapon;try{const it=M.makeItem('weapon',w.def,w.q);it.source=g.name+' brachte sie mit';S.inventory.push(it);if(g.stature==='dwarf'&&g.role!=='Soldat'&&!M.allowedMelee(g,it))g.role='Soldat';let r=M.equip(g.id,it.id,true);if(r!=='Ausrüstung zugewiesen.')r=M.equip(g.id,it.id,false);M.persist?.();}catch(e){console.warn(e);}}
const fans=gs=>gs.filter(g=>g&&g.stature);
// ---------- Sprüche ----------
const L={
 traderDwarf:['Klein, ich weiß. Aber schau dir die Arme an! Und die Doppelaxt gehört ihm. Geht nicht ohne.','Das Publikum wird ihn lieben. Klein, wütend und mit Doppelaxt – mehr Spektakel gibt es für hundert Gold nirgends.','Unterschätz ihn nicht. Das haben schon viele. Die liegen jetzt unter der Erde, er steht noch.','Er reicht dir bis zum Gürtel und hebt dich trotzdem hoch. Die Axt bringt er selbst mit.','In Ostia haben sie für ihn doppelten Eintritt bezahlt. Doppelt, Lanista!'],
 traderGiant:['Ein Riese! Kein Witz, schau nach oben. Weiter. Noch weiter.','Den habe ich mit drei Ketten bringen müssen. Eine hat er unterwegs zerrissen.','Langsam ist er, ja. Aber wenn er trifft, steht keiner mehr auf. Gib ihm was Zweihändiges.','Die Menge wird toben. Bei einem Riesen tobt die Menge immer. Doppeltes Preisgeld, wenn du mich fragst.','Er isst für drei. Er kämpft auch für drei.'],
 chantDwarf:['Die Menge skandiert: „{N}! {N}!“ – der Kleine ist ihr Liebling.','Das Publikum steht auf für {N}. Klein, aber der Sand bebt.','„Hau sie um, Kleiner!“ – die Ränge feuern {N} an.','Jubel auf allen Rängen: {N} schwingt die Doppelaxt.','Die Leute stampfen im Takt für {N}. Sie lieben ihn.'],
 chantGiant:['Die Menge skandiert: „RIESE! RIESE!“ – {N} ist der Liebling der Ränge.','Das Publikum tobt, sobald {N} sich bewegt. Der Boden zittert mit.','„Zerdrück sie, {N}!“ – die Ränge sind außer sich.','Jeder Schritt von {N} bekommt Applaus. Das hat die Arena lange nicht gesehen.','Die Leute recken die Fäuste für {N}. Ein Riese im Sand – dafür kommen sie.'],
 hitDwarf:['{N} schlägt zu – die Menge brüllt vor Begeisterung!','Der Kleine hat ihn erwischt! Die Ränge explodieren.'],
 hitGiant:['{N} fegt ihn um – die Ränge kochen!','Ein Schlag wie ein Baumstamm! Das Publikum feiert {N}.']};
const pickL=a=>a[Math.floor(Math.random()*a.length)],fill=(t,g)=>t.replace(/\{N\}/g,g.name);
// ---------- Anfeuern im Kampf (reine Darstellung, keine Spielwirkung) ----------
let track=null;
function watch(){const b=S.battle;if(!b||b.benchmark||b.finale||b.paused||typeof document==='undefined'||!document.body?.classList.contains('bhud')||M.modIntro?.())return;
 if(!track||track.id!==b.id)track={id:b.id,next:3+Math.random()*3,down:new Set(b.actors.filter(a=>a.down||a.g?.dead).map(a=>a.id))};
 const live=b.actors.filter(a=>a.g?.stature&&!a.g.dead&&!a.down&&!a.surrendered&&!a.dog&&!a.rex);
 // Wer von einem Publikumsliebling niedergestreckt wird, bringt die Ränge zum Kochen
 for(const v of b.actors){if(!(v.down||v.g?.dead)){track.down.delete(v.id);continue;}if(track.down.has(v.id))continue;track.down.add(v.id);const a=b.actors.find(x=>x.id===v.lastAttackerId);if(a?.g?.stature&&a.team!==v.team)setTimeout(()=>{M.moderator?.say?.(fill(pickL(a.g.stature==='dwarf'?L.hitDwarf:L.hitGiant),a.g),3);M.crowdCheer?.(.8);},2200);}
 if(!live.length||b.time<track.next)return;track.next=b.time+16+Math.random()*10;
 const a=pickL(live);M.moderator?.say?.(fill(pickL(a.g.stature==='dwarf'?L.chantDwarf:L.chantGiant),a.g),2);M.crowdChant?.(a.g,{team:a.team});M.crowdCheer?.(.7);}
if(typeof setInterval==='function'&&typeof document!=='undefined')setInterval(()=>{try{watch();}catch(e){console.error(e);}},400);
// ---------- Anzeige ----------
const badge=g=>g?.stature?`<b class="sp-badge sp-${g.stature}" title="Publikumsliebling: doppeltes Preisgeld bei Kämpfen">${g.stature==='dwarf'?'▼ KLEINWUCHS':'▲ RIESENWUCHS'}</b>`:'';
if(typeof document!=='undefined'){const st=document.createElement('style');st.textContent=`.sp-badge{display:inline-block;margin:3px 0 0;padding:1px 5px;border:1px solid #dfb66d;color:#f0c46a;font:700 10px/14px 'Courier Prime',ui-monospace,monospace;letter-spacing:.06em;background:#2a1f10}.sp-badge.sp-giant{border-color:#d98b5f;color:#f2a477;background:#2b1712}`;document.head?.appendChild(st);}
M.special={CHANCE,TWO,NAME,make,roll,arrive,fans,badge,traderLines:g=>g?.stature==='dwarf'?L.traderDwarf:g?.stature==='giant'?L.traderGiant:[],lines:L,
 // Preisgeld: doppelt, sobald einer der Kämpfer ein Publikumsliebling ist (nicht mehrfach)
 purseFactor:gs=>fans(gs||[]).length?2:1};
})();
