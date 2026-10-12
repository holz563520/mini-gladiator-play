'use strict';
// =====================================================================================================
// NEUE ARENA IM SPIEL · Anschluss an den echten Spielstand (nur im Hauptspiel geladen, nicht in der Testversion)
// · Beim Betreten der Arena öffnet sich die neue Arena (arena-ui.js) über dem Spiel. Die klassische Arena mit Ligen,
//   Turnieren, Qualifikation und offenen Arenen bleibt über einen Knopf erreichbar und läuft unverändert.
// · Kämpfer: die eigenen Gladiatoren (S.roster), einsatzbereit nach den Regeln der Kaserne (M.army.eligibility).
//   Tiere besitzt man noch nicht (Tierhändler kommt später) – BEAST zeigt Hahn und Löwe, aber noch ohne eigene Tiere.
// · Gold: Siegprämie bzw. Antrittsgeld der Herausforderung statt der Ligaprämie. Alles andere (Ruhm, Siege, Lernen,
//   Verletzungen, Tod, Bericht) bucht das Spiel wie bei jedem Arenakampf.
// · Neuer Speicherwert: S.arenaNeu = {fights, wins} (nur Statistik).
// Entfernen: die Namen arena-* und hahn-* aus der Skriptliste in boot.js streichen.
// =====================================================================================================
(()=>{
const M=window.MG,S=M.s;if(!M||window.ARENA_NEU_TEST)return;
const st=()=>(S.arenaNeu??={fights:0,wins:0});
let pending=null,classic=false;const CLASSIC_ARENA=false;
const C={startHidden:true,roosters:[],lions:[],
 get gold(){return S.gold;},get fights(){return st().fights;},get wins(){return st().wins;},get fallen(){return S.fallen||[];},
 fit:g=>{try{return M.army?.eligibility?M.army.eligibility(g).ok:!g.dead;}catch{return !g.dead;}},
 settle(pay){pending={pay,gold:S.gold,earned:S.stats?.earned||0};},
 record(won){const s=st();s.fights++;if(won)s.wins++;try{M.persist();}catch{}},
 nextDay(){try{M.ui.click('rest');}catch(e){console.warn(e);}},
 close(){window.ArenaUI?.close();try{M.ui.click('nav:home');}catch{}},
 // Klassische Arena (Straßenarena, Ligen, Turniere) vorerst ausgeblendet; zum Wiedereinschalten CLASSIC_ARENA auf true setzen
 classic:CLASSIC_ARENA?function(){classic=true;window.ArenaUI?.close();try{M.ui.render();}catch{}}:null};
window.ArenaCareer=C;
// Spionage: eigener Worker, der dieselben Spieldateien lädt (gleiche Version wie das Spiel)
window.ARENA_WORKER_URL='arena-spy-worker.js?v='+encodeURIComponent(typeof BUILD!=='undefined'?BUILD:'');
// Gold nach dem Kampf: das Spiel bucht die Ligaprämie – hier gilt stattdessen die Prämie der Herausforderung
const baseFinish=M.onFinish;
M.onFinish=function(report){
 if(pending){const p=pending;pending=null;const ligaGold=S.gold-p.gold;S.gold=p.gold+p.pay;if(S.stats)S.stats.earned=p.earned+p.pay;if(report)report.gold=p.pay;if(S.lastReport)S.lastReport.gold=p.pay;try{M.persist();}catch{}
}
 return baseFinish?.apply(this,arguments);};
// Öffnen beim Betreten der Arena (nicht während der Tutorials, Turniere oder eines Kampfes)
function allowed(){const lion=S.lion?.stage;return !S.battle&&!S.tournament&&(!lion||lion==='done'||lion==='skip')&&!['medic','s12'].includes(S.medic?.stage||'')&&!document.querySelector('.lion-guide:not(.lesson-guide),.medic-start');}
const page=M.schoolPage;
M.schoolPage=function(p){const html=page?.apply(this,arguments);
 if(['arena','league','openarenas'].includes(p)){if(!classic&&allowed())setTimeout(()=>{if(M.ui.getPage()===p&&!S.battle&&!window.ArenaUI?.isOpen())window.ArenaUI?.open();},0);}
 else classic=false;
 return html;};
window.ARENA_GAME_READY=true;
})();
