'use strict';
// ERZÄHLSPERRE (welt-erzaehlung.js) · Videosequenzen und Tutorial aus 1.0 sind in Arena Theory 2.0 aus. Wunsch Thomas 13.11.2026.
// Nur auf arena-theory-2.html und tageslauf-editor.html (WELT_VOR, vor der Karte geladen), nicht im Spiel 1.0.
//
// · Die Kapitel aus 1.0 sollen erst in Schritt O2 (AT2_FAHRPLAN.md) Kapitel für Kapitel zum passenden Zeitpunkt in 2.0 kommen.
//   Bis dahin setzt diese Datei bei JEDEM Laden (neues Spiel und Fortsetzen) den Schalter, mit dem 1.0 ein Kapitel als erledigt
//   bzw. übersprungen führt. Andere Werte der Kapitel (z. B. Löwen-Rekruten) bleiben erhalten.
// · KAPITEL ist die Liste für O2: Ein Kapitel wieder einschalten heißt später, es hier herausnehmen und in 2.0 auslösen.
// · Startwerte eines neuen 2.0-Spiels (Name, Lanista, Schmied) nur beim ersten Start eines Platzes (Merker S.at2), nicht bei
//   jedem Laden; sonst würden gespeicherte Werte überschrieben. (Vorher stand das oben in welt-raster.js.)
// · Test: tests/welt-spielstand-browser.cjs (keine Sequenz über Tage und nach dem Fortsetzen).
// =====================================================================================================================
(()=>{
const M=window.MG;if(!M||!M.s)return;const S=M.s;
const KAPITEL=[
 ['schmied','Schmied-Einführung (forge-intro.js)',()=>{const W=M.workshop;if(!W.state.master)W.hireMaster(W.sketch());W.state.intro='done';}],
 ['haendler','Händler-Tutorial (trader.js)',()=>{M.trader.state.intro='done';}],
 ['halle','Halle der Toten, Einführung (hall.js)',()=>{if(S.hall)S.hall.tut='done';else S.hall={tut:'done',recruit:null,tag:{}};}],
 ['loewe','Löwen-Kapitel (lion.js)',()=>{S.lion=Object.assign({recruits:[],base:[]},S.lion||{},{stage:'done'});}],
 ['medicus','Medicus-Kapitel (medic.js)',()=>{S.medic=Object.assign(S.medic||{},{stage:'skip'});}],
 ['lektion','Lektion des Lanista nach dem Medicus (lesson.js; „end“ = abgeschlossen)',()=>{S.lesson=Object.assign(S.lesson||{},{stage:'end',live:false});}],
 ['huehner','Hühnerschule (huehnerschule.js; startet nach der Lektion)',()=>{S.huehner=Object.assign({stage:'',sign:false,beastrium:false,roosters:[],fallen:[],offer:null,fights:0,wins:0,idiot:null,first:null,lastGains:null},S.huehner||{},{stage:'end'});}],
 ['faustkampf','Faustkampf-Einführung (box-game.js; nach der Hühnerschule)',()=>{const b=S.box??={intro:false,fights:0,wins:0,lastDay:S.day,opts:{sound:true,intro:true,cuts:true}};b.intro=true;b.tutDone=true;}],
 ['bogner','Bogenhändler-Kapitel (bogner.js)',()=>{S.bowyer=Object.assign(S.bowyer||{},{stage:'done'});}],
 ['aussenwelt','Außenwelt/Abenteuer-Einführung (outside.js; nach allen Tutorials, kommt in 2.0 als Etappe P)',()=>{const o=S.outside??={stage:'',tries:0,wins:0,adventures:0,advWins:0,lastAdventure:0,quest:null,adv:null,history:[],run:null,seenBoard:false};if(!o.stage||o.stage==='intro')o.stage='done';}],
 ['hundefang','Hundsgraf Septimus Rabies, Vorstellung (hundefang.js; nach der Außenwelt)',()=>{const h=S.hundefang??={stage:'',day:0,jobs:[],jobDay:0,usedDay:0,dogs:[],tip:0};if(!h.stage)h.stage='done';}],
 ['doktor','Doktor Hirnhammer, Vorstellung (doktor.js)',()=>{S.doktor=Object.assign(S.doktor||{},{stage:'skip',armed:false});}],
 ['bogen','Bogen-Geschichte (archer-plot.js)',()=>{S.archerPlot=Object.assign({seen:0},S.archerPlot||{},{asked:true,state:'declined'});}],
 ['wanderer','Wanderer am Tor (wanderers.js)',()=>{S.wanderers=Object.assign({version:1,known:[]},S.wanderers||{},{next:(S.day||1)+10,group:null});}],
];
// Neues 2.0-Spiel: Startwerte nur einmal (vor den Kapiteln, der Schmied braucht den Lanista)
S.started=true;
if(!S.at2){S.at2={v:1};S.schoolName='Ludus Probatus';
 S.lanista={name:'Lanista',height:180,weight:85,veteran:true,appearance:{skin:'#d9ac82',shade:'#9c7353',hair:'#443025',style:1,beard:2,cloth:'#435e6a'}};}
for(const [id,,aus] of KAPITEL)try{aus();}catch(e){console.error('Erzählsperre '+id,e);}
// Wanderer: wanderer-scene.js holt einen „unsinnig weit entfernten“ Besuch (mehr als 12 Tage) auf übermorgen zurück. Deshalb
// den nächsten Besuch laufend 10 Tage vorausschieben; so kommt in 2.0 keiner, und 1.0 bleibt unberührt.
setInterval(()=>{const w=S.wanderers;if(w&&!w.group)w.next=(S.day||1)+10;},1000);
M.weltErzaehlung={kapitel:KAPITEL.map(([id,name])=>({id,name,in2:false}))};
})();
