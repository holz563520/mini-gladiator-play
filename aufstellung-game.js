'use strict';
// =====================================================================================================
// AUFSTELLUNG IM SPIEL · Anschluss an die Arena (Wunsch Thomas 2.11.)
// Arena → HUMAN → ARENAKÄMPFE öffnet die neue Aufstellung (aufstellung-ui.js) statt der bisherigen Herausforderungen.
// Die bisherigen Herausforderungen bleiben über „Bisherige Herausforderungen ▸“ erreichbar. Tierkämpfe, Boxkämpfe,
// Hunderennen und alle Tutorials laufen unverändert: Die Aufstellung öffnet nur aus der Arena-Oberfläche heraus, und
// die öffnet das Spiel während der Tutorials ohnehin nicht (arena-game.js).
// Entfernen: 'aufstellung-core','aufstellung-ui','aufstellung-game' aus boot.js und aufstellung.css aus index.html streichen.
// =====================================================================================================
(()=>{
const M=window.MG,U=window.ArenaUI;
if(!M||!U||window.ARENA_NEU_TEST||!window.AufstellungUI||!window.Aufstellung)return;
const UI=window.AufstellungUI;
// Solange die Aufstellung offen ist, gilt die Arena als offen: Tutorials und Szenen warten (sie prüfen ArenaUI.isOpen)
const isOpen=U.isOpen;U.isOpen=()=>!!(isOpen?.()||UI.isOpen());
document.addEventListener('click',e=>{const el=e.target.closest?.('#an [data-a]');if(!el)return;const a=el.dataset.a,C=window.ArenaCareer||{};
 if(a!=='kind:arena'&&!(a==='mode:human'&&!C.boxMenu))return;
 if(window.AUF_CLASSIC){window.AUF_CLASSIC=false;return;}       // bisherige Herausforderungen ausdrücklich gewählt
 e.preventDefault();e.stopPropagation();
 try{U.mode='human';U.close();UI.open();}catch(err){console.error(err);try{UI.close();U.open();}catch{}}
},true);
window.AUFSTELLUNG_GAME_READY=true;
})();
