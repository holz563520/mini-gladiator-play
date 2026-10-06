'use strict';
(()=>{
const M=window.MG,S=M.s,C=M.clamp,categories=M.forgeCategories;
const key=i=>i.kind+'/'+i.def;
const recipeId=i=>key(i)+'/'+i.q+(i.kind==='armor'?'/'+(i.material||'metal'):'');
const recipes=categories.flatMap(c=>M.gearQuality.flatMap((_,q)=>(c.kind==='armor'?['leather','medium','metal']:['']).map(material=>({kind:c.kind,def:c.def,q,...(material?{material}:{}),key:c.key,id:recipeId({...c,q,material})}))));
// Legacy workshop records and existing items remain untouched, but no longer run the forge.
S.forgeWorkshop??={version:1,master:null,apprentice:null,recipes:[],refinements:[],offers:[],craftedDay:S.day,craftedToday:0};
const F=S.forgeWorkshop;
F.recipes??=[];F.refinements??=[];F.offers??=[];
for(const r of recipes)if(r.q===0&&!F.recipes.includes(r.id))F.recipes.push(r.id);
const names=['Fabrius','Acer','Ferrus','Vulcanus','Titus','Varro','Cassius','Silvanus','Rufus','Decimus','Aster','Gaius'];
const surnames=['Ferrarius','Scaeva','Nerva','Corvus','Fortis','Macer','Aelius','Varrus'];
let saving=false,sceneReady=false,error='';
function person(master){const skin=M.pick(M.skinPalette),p={id:M.uid(),name:M.pick(names)+' '+M.pick(surnames),appearance:{skin:skin[0],shade:skin[1],hair:M.pick(M.hairPalette),style:Math.floor(M.rng()*6),beard:Math.floor(M.rng()*4),cloth:M.pick(['#43595a','#62634e','#655253']),voice:.85+M.rng()*.3},height:Math.round(M.rnd(176,193)),weight:Math.round(M.rnd(master?95:73,master?112:94)),hiredDay:S.day,potentials:Object.fromEntries(categories.map(c=>[c.key,M.smithPotential()]))};if(master){p.current=Object.fromEntries(categories.map(c=>[c.key,0]));p.crafted=0;}else p.endsDay=S.day+10;return p;}
function blocked(){return S.battle?'Während eines Kampfes nicht möglich.':saving?'Die Schmiede speichert gerade.':F.apprentice?.phase?'Die Abschlusszeremonie läuft.':'';}
// Vorstellung des Hauptschmieds: Entwurf für Name und Aussehen ohne Karriere-Zufall; der Ablaufstand liegt im vorhandenen Schmiede-Speicherstand.
function randomName(){const any=list=>list[Math.floor(Math.random()*list.length)];return any(names)+' '+any(surnames);}
function sketch(){const any=list=>list[Math.floor(Math.random()*list.length)],skin=any(M.skinPalette);return {name:randomName(),appearance:{skin:skin[0],shade:skin[1],hair:any(M.hairPalette),style:Math.floor(Math.random()*6),beard:Math.floor(Math.random()*4),cloth:any(['#43595a','#62634e','#655253']),voice:.85+Math.random()*.3},height:Math.round(176+Math.random()*17),weight:Math.round(95+Math.random()*17)};}
function setIntro(stage){if(!['pending','scene','tutorial','done'].includes(stage)||F.intro===stage||F.intro==='done')return;F.intro=stage;M.persist();}
function hireMaster(preset){const b=blocked();if(b)return b;if(F.master)return 'Dein Hauptschmied bleibt dauerhaft im Ludus.';if(S.gold<250)return 'Nicht genug Gold.';F.master=person(true);const chosen=String(preset?.name??'').trim().slice(0,32);if(chosen)F.master.name=chosen;if(preset?.appearance){F.master.appearance={...F.master.appearance,...preset.appearance};if(preset.height)F.master.height=preset.height;if(preset.weight)F.master.weight=preset.weight;}S.gold-=250;S.stats.spent+=250;M.persist();return F.master.name+' ist dein Hauptschmied.';}
function knowledge(k){return {current:F.master?.current[k]||0,potential:F.master?.potentials[k]||0,lead:F.master};}
function progress(i){const k=key(i),p=knowledge(k);if(!p.lead)return 0;const next=Math.min(p.potential,p.current<50?Math.min(50,p.current+1):p.current+.5),gain=Math.max(0,next-p.current);F.master.current[k]=p.current+gain;F.master.crafted++;return gain;}
// A weighted discrete distribution keeps every outcome possible at every skill level.
function quality(skill){const mean=-9+18*C(skill,0,100)/100,weights=Array.from({length:21},(_,n)=>.012+Math.exp(-.5*Math.pow((n-10-mean)/3,2)));let roll=M.rng()*weights.reduce((a,b)=>a+b,0);for(let n=0;n<weights.length;n++){roll-=weights[n];if(roll<=0)return (n-10)/100;}return .1;}
function offerPrice(i){return Math.max(1,Math.round(M.itemPrice(i.kind,i.def,i.q)*.9*(1+(i.forgeQuality||0))));}
function craft(group){const b=blocked();if(b)return b;if(!F.master)return 'Stelle zuerst deinen Hauptschmied ein.';if(!['weapon','armor'].includes(group))return 'Wähle Waffe oder Rüstung.';const pool=recipes.filter(r=>F.recipes.includes(r.id)&&(group==='weapon'?r.kind==='weapon':r.kind!=='weapon'));const r=M.pick(pool);if(!r)return 'Kein passendes Rezept bekannt.';const p=knowledge(r.key),i=M.makeItem(r.kind,r.def,r.q,r.material);i.forgeQuality=quality(p.current);i.maker=F.master.name;i.forgedDay=S.day;i.forgeSkill={current:p.current,potential:p.potential};F.offers.push({item:i,price:offerPrice(i)});progress(i);if(F.craftedDay!==S.day){F.craftedDay=S.day;F.craftedToday=0;}F.craftedToday++;M.persist();return M.itemName(i)+' liegt als Angebot bereit.';}
function buy(id){const b=blocked();if(b)return b;const n=F.offers.findIndex(o=>o.item.id===id);if(n<0)return 'Angebot nicht mehr vorhanden.';const o=F.offers[n];if(S.gold<o.price)return 'Nicht genug Gold.';if(S.inventory.length>=M.storageCapacity())return 'Lager ist voll.';if(S.inventory.some(i=>i.id===id))return 'Dieses Stück wurde bereits gekauft.';F.offers.splice(n,1);S.gold-=o.price;S.stats.spent+=o.price;S.inventory.push(o.item);M.persist();return 'Gekauft: '+M.itemName(o.item);}
const rejection=[
 'Dann schmelz ich es eben wieder ein.','War sowieso nicht mein bestes Stück.','Pah. Banausen.','Dann schmiede ich etwas Besseres.','Das hätte dir gestanden.','Zurück ins Feuer damit.','Stahl hat mehr Geschmack als du.','Der Amboss hätte es genommen.','Dein Gold bleibt kalt.','Eine Klinge braucht keine Bewunderer.','Gut. Dann behalte ich meinen Stolz.','Vulcanus hat deinen Geschmack gesehen.','Das Feuer stellt weniger Fragen.','Für dich also wieder der Holzstock.','Ich mache Eisen. Keine Komplimente.','Dem Schmelztiegel gefällt es.','Ein Nein. Wie originell.','Deine Feinde atmen auf.','Das Metall ist unschuldig.','Dann eben noch ein Hammerschlag.','Die Schneide war zu höflich.','Du und Qualität. Schwierige Ehe.','Nicht jedes Meisterwerk findet einen Käufer.','Mein Hammer widerspricht dir.','Wenigstens bezahlst du nicht mit Ratschlägen.'
];
function reject(id){const b=blocked();if(b)return b;const n=F.offers.findIndex(o=>o.item.id===id);if(n<0)return 'Angebot nicht mehr vorhanden.';F.offers.splice(n,1);F.comment=M.pick(rejection);M.persist();return F.comment;}
function hireApprentice(){const b=blocked();if(b)return b;if(!F.master)return 'Stelle zuerst deinen Hauptschmied ein.';if(F.apprentice)return 'Ein Lehrling arbeitet bereits hier.';F.apprentice=person(false);M.persist();return F.apprentice.name+' bleibt zehn Spieltage.';}
const sayings=[
 'Zehn Tage. Und DAS nennst du eine Klinge?',
 'Deine Ausbildung ist beendet. Sehr beendet.',
 'Der Amboss bleibt. Du nicht.',
 'Du hast Talent. Nicht fürs Schmieden.',
 'Ich brauche Platz für den nächsten.',
 'Das Eisen war härter als du.',
 'Die gute Nachricht: Morgen hast du frei.',
 'Ich sagte: Stahl köpfen. Ach, vergiss es.',
 'Deine Probezeit endet heute.',
 'Ich habe deine Leistung bewertet.',
 'Diese Klinge hat wenigstens einen Zweck.',
 'Vulcanus nimmt keine Beschwerden an.',
 'Du wolltest einen bleibenden Eindruck.',
 'Die letzte Lektion ist kurz.',
 'Jetzt zeigen wir dem Stahl die Richtung.',
 'Zehn Tage Lärm. Endlich Ruhe.',
 'Dein Werk hat mich kalt erwischt.',
 'Der Stahl hat mehr Rückgrat.',
 'Meine Geduld ist ausgeschmiedet.',
 'Ein gerader Schnitt. Sieh genau hin.',
 'Du hast das Feuer beleidigt.',
 'Dein Zeugnis wird scharf formuliert.',
 'Heute prüfe ich die Schneide.',
 'Keine Sorge. Kein weiterer Arbeitstag.',
 'Du gehst mir nicht mehr auf den Amboss.',
 'Selbst Schlacke hat ihren Nutzen.',
 'Das war kein Gladius. Das war ein Löffel.',
 'Rom wurde nicht mit solchen Nägeln gebaut.',
 'Du wolltest höher hinaus. Unpraktisch.',
 'Ich habe deine Zukunft gekürzt.',
 'Der Schmelztiegel ist schon voll.',
 'Mein Hammer braucht bessere Gesellschaft.',
 'Dein Stahl ist weich. Mein Urteil nicht.',
 'Die Götter mögen schlechte Handwerker.',
 'Ich schicke dich zur höheren Prüfung.',
 'Morgen arbeiten wir mit weniger Köpfen.',
 'Der Griff war gut. Der Rest war deiner.',
 'Das ist keine Kündigung. Ein Schnitt.',
 'Deine Schicht endet vorzeitig.',
 'Die Arena wäre milder gewesen.',
 'Ich habe genug von deinen Kanten.',
 'Sogar der Blasebalg seufzt über dich.',
 'Du hast mein Eisen müde gemacht.',
 'Kein Meisterbrief. Ein Meisterhieb.',
 'Nimm Haltung an. Ein letztes Mal.',
 'Die Schneide kennt keine Ausreden.',
 'Der Stahl lernt schneller als du.',
 'Ich härte Eisen, nicht meine Geduld.',
 'Dein letzter Fehler war pünktlich.',
 'Wir kürzen heute die Personaldecke.',
 'Ein sauberer Abschluss gehört dazu.',
 'Du bist dem Handwerk nicht gewachsen.',
 'Ich habe deine Arbeit überschlafen. Nein.',
 'Deine Klinge fürchtet sogar Butter.',
 'Mars hat das Stück zurückgeschickt.',
 'Selbst Pluto verlangt bessere Qualität.',
 'Du hast jetzt einen Termin bei Charon.',
 'Die Münze für die Überfahrt ist dein Lohn.',
 'Keine Überstunden mehr für dich.',
 'Ich beende diese Fehlprägung.',
 'Das Eisen wurde rot vor Scham.',
 'Deine Zange hat mehr Fingerspitzengefühl.',
 'Hörst du das? Dein Feierabend.',
 'Dein Vertrag hat eine scharfe Klausel.',
 'Ich mache es kurz. Beruflich bedingt.',
 'Die letzte Kontrolle übernimmt das Schwert.',
 'Ein Meister muss sich trennen können.',
 'Deine Laufbahn braucht einen Abschluss.',
 'So. Jetzt wird ordentlich gearbeitet.',
 'Du hast alles gegeben. Leider das.',
 'Der Hammer beantragt deine Ablösung.',
 'Dein Werkstück hat um Gnade gebeten.',
 'Zehn Tage sind neun zu viel gewesen.',
 'Ich hatte weniger Hoffnung als Kohle.',
 'Du bist entlassen. Gründlich.',
 'Dein Nachfolger darf die Zange behalten.',
 'Das Handwerk verlangt Opfer. Heute dich.',
 'Ich poliere jetzt meinen Ruf.',
 'Deine Ausrede hat keine Schneide.',
 'Stillhalten. Präzision ist wichtig.',
 'Die Abschlussnote ist messerscharf.',
 'Mein Urteil ist bereits gehärtet.',
 'Mit dir wird kein Eisen warm.',
 'Du bringst selbst Erz zum Weinen.',
 'Dein Helm schützt vor allem vor Lob.',
 'Den Brustpanzer kauft nicht mal ein Geist.',
 'Ich hatte einen Schmied bestellt.',
 'Du warst eine teure Pause.',
 'Dein Werk ist krumm. Mein Schwert nicht.',
 'Heute zeige ich dir echte Trennarbeit.',
 'Für schlechte Nieten fehlt mir die Zeit.',
 'Du brauchst morgen keine Schürze mehr.',
 'Ein letzter Funke Berufsberatung.',
 'Ich dulde keine stumpfen Abschlüsse.',
 'Die Werkbank verlangt Abstand von dir.',
 'Genug geübt. Jetzt demonstriere ich.',
 'Du gehst. Dein Wissen bleibt hier.',
 'Das war deine letzte kalte Lötstelle.',
 'Der nächste bringt hoffentlich Hände mit.',
 'Ein Meisterstück fehlt noch. Meins.'
];
// The durable applied phase is the checkpoint. Reload replays only the cosmetic scene.
function day(){if(F.craftedDay!==S.day){F.craftedDay=S.day;F.craftedToday=0;}const a=F.apprentice;if(!a||a.phase||S.day<a.endsDay)return;for(const c of categories)F.master.potentials[c.key]=Math.max(F.master.potentials[c.key],a.potentials[c.key]);a.phase='applied';a.line=M.pick(sayings);a.appliedDay=S.day;sceneReady=false;}
async function prepareScene(){if(!F.apprentice?.phase||saving||M.batchSaving||S.battle||M.benchmarkActive)return false;if(sceneReady)return true;saving=true;error='';try{if(!M.persist())throw Error('Speichern fehlgeschlagen.');await window.MGSave?.flush?.();sceneReady=true;return true;}catch(e){error=e.message;return false;}finally{saving=false;}}
async function finishScene(id){const a=F.apprentice;if(!sceneReady||saving||!a||a.id!==id)return false;saving=true;error='';F.apprentice=null;try{if(!M.persist())throw Error('Speichern fehlgeschlagen.');await window.MGSave?.flush?.();sceneReady=false;return true;}catch(e){F.apprentice=a;error=e.message;return false;}finally{saving=false;}}
function refineCost(i){return Math.round(30+M.itemPrice(i.kind,i.def,i.q)*.04);}
function refine(id){const b=blocked();if(b)return b;if(!F.master)return 'Stelle zuerst deinen Hauptschmied ein.';const i=M.inventoryItem(id);if(!i)return 'Gegenstand nicht gefunden.';if(!F.refinements.includes(key(i)))return 'Dieses Verfeinerungsrezept ist unbekannt.';if(i.refinement)return 'Dieses Stück ist bereits verfeinert.';const cost=refineCost(i);if(S.gold<cost)return 'Nicht genug Gold.';i.refinement={recipe:key(i),bonus:.1,day:S.day};S.gold-=cost;S.stats.spent+=cost;M.persist();return 'Einmalig verfeinert: +10 % des Basiswerts.';}
// Stable per-item sampling never rerolls an old enemy item and does not consume combat RNG.
function sample(id,salt){let h=2166136261;for(const c of id+salt)h=Math.imul(h^c.charCodeAt(0),16777619);h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return (h>>>0)/4294967296;}
function enemyItem(i){if(!i||i.forgeInspected)return;i.forgeInspected=true;if(M.definition(i)&&(i.kind!=='weapon'||M.definition(i).damage>0)&&sample(i.id,'refine')<.1)i.refinement??={recipe:key(i),bonus:.1};}
function encounter(b){if(!b||b.benchmark||M.benchmarkActive||b.forgeObserved)return;b.forgeObserved=true;for(const a of b.actors.filter(a=>a.team===1)){for(const i of [M.gear(a.g,'weapon'),M.gear(a.g,'secondary'),M.gear(a.g,'shield'),...M.armorItems(a.g)].filter(Boolean)){enemyItem(i);const r=recipeId(i);if(!F.recipes.includes(r)&&recipes.some(x=>x.id===r)&&sample(i.id,b.id+'recipe')<.25){F.recipes.push(r);M.log('Schmiederezept entdeckt: '+M.itemName(i));}const k=key(i);if(i.refinement&&!F.refinements.includes(k)&&sample(i.id,b.id+'refinement')<.3){F.refinements.push(k);M.log('Verfeinerungsrezept entdeckt: '+M.definition(i).name);}}}}
const oldDay=M.army.nextDay;M.army.nextDay=(...args)=>{const result=oldDay(...args);if(!S.battle){day();M.persist();}return result;};M.advanceDay=M.army.nextDay;
const oldStart=M.worldStart;M.worldStart=b=>{encounter(b);oldStart?.(b);};
M.hireSmith=hireMaster;M.smithHireCost=()=>250;M.selectSmith=()=>F.master;M.forgeStaff=()=>F.master?[F.master]:[];M.forgeKnowledge=knowledge;M.progressForge=progress;M.craft=craft;M.trainSmith=()=> 'Nur tatsächliches Schmieden verbessert die Istwerte.';
M.army.hireWorkshop=hireMaster;M.army.forgeInfo=knowledge;M.army.workshopImprove=refine;
M.workshop={sketch,randomName,setIntro,state:F,categories,recipes,recipeId,key,knowledge,quality,progress,hireMaster,hireApprentice,craft,buy,reject,refine,refineCost,offerPrice,day,prepareScene,finishScene,encounter,enemyItem,sayings,rejection,get saving(){return saving;},get sceneReady(){return sceneReady;},get error(){return error;}};
day();M.persist();
})();
