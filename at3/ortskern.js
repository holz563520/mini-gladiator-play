// WAS DIE DATEI TUT: Ortskern von Arena Theory 3.0 (Schritt N7a2a, Thomas 24.11.2026). Eigener Hintergrundkern, der die Ortspläne der echten Orte rechnet
// (ortsbild.js wahl/planen/lage → stadtbild.js plan), damit ein langer Plan (Großstadt bis 2,7 s) den Bildkern nie aufhält. Der Bildkern fragt über einen
// MessageChannel („plan“ mit Ortsnummer), der Ortskern antwortet mit Plan, Lage in Weltfeldern und der Höhe am Ortspunkt (eine Stufe für die ganze Ortsfläche).
// Gibt es keinen zweiten Hintergrundkern, lädt der Bildkern diese Datei selbst (importScripts, eingebettet) und plant in seinen Pausen (Regel 13: geht auch mit
// nur einem Hintergrundkern). Kein Spielzufall, kein Tick, nichts gespeichert: gleicher Seed + gleicher Ort = gleicher Plan auf jedem Gerät.
// Kosten: einmal je Ort, der in das Fenster des Bildkerns kommt; nie abhängig von der Weltgröße (Regel 14). Wiederverwendet: ortsbild.js (N7a1/N7a1b),
// stadtbild.js, stadtliste.js, landwirtschaft.js, orte.js, aussenposten.js, Höhe des Ortspunkts aus weltgen.js (ein Kartenstück).
(function(){
'use strict';
var Q=self.location.search, eingebettet=!!self.AT3_ORTSKERN_EINGEBETTET;
importScripts('at3-64.js'+Q,'baubild.js'+Q,'baukasten.js'+Q,'weltgen.js'+Q,'ortsnamen.js'+Q,'orte.js'+Q,'aussenposten.js'+Q,'ortsbild.js'+Q,
 'stadtliste.js'+Q,'landwirtschaft.js'+Q,'natur.js'+Q,'begehbar.js'+Q,'stadtbild.js'+Q);
var G=self.AT3WG, SB=self.AT3_STADTBILD, OB=self.AT3ORTSBILD, O=self.AT3ORTE, AP=self.AT3POSTEN, ON=self.AT3ORTSNAMEN, SL=self.AT3_STADTLISTE, LW=self.AT3LANDW;
var D=null, laden=null, A=null, seed=0, gen=-1, puffer=null, port=null, schlange=[], laeuft=false;
function json(f){return fetch('daten/'+f+'.json'+Q).then(function(r){if(!r.ok)throw new Error(f+' '+r.status);return r.json()})}
function daten(){if(laden)return laden;
 laden=Promise.all(['gebaeude','rezepte','kulturen','religionen','landwirtschaft','waren'].map(json)).then(function(r){
  SB.setzeDaten(r[0]);SB.setzeLandw(LW.daten(r[4],r[0],r[5],r[1]));
  D={O:O,DD:O.daten(r[0],r[1],r[2]),SL:SL,SLD:SL.daten(r[0]),REL:r[3].religionen,KK:r[2].kulturkreise};return D});return laden}
// Rohe Höhe am Ortspunkt (Weltfeld x, y): das Kartenstück dort einmal rechnen
function hoehe(x,y){puffer=puffer||new Uint8Array(G.GEL_BYTES);var cx=x>>6,cy=y>>6,b=G.ausschnitt(A,cx,cy,puffer);G.gelaende({seed:seed,cx:cx,cy:cy,daten:b});
 return new Uint16Array(b.buffer,b.byteOffset,G.FELDER)[((y&63)<<6)|(x&63)]}
// Ein Ort: Wahl, Plan (mit Ausweich-Seeds und Ersatz), Lage, Höhe. Fehler → {fehler} (der Bildkern lässt den Ort dann einfach weg)
function planen(k){var t=performance.now(),w=OB.wahl(seed,A,k,D,ON),r=OB.planen(SB,w.opt),L=OB.lage(G,seed,A,k,r.P);
 return{k:k,g:w.roh.g,name:w.name,P:r.P,lage:L,h0:hoehe(L.punkt[0],L.punkt[1]),ersatz:r.ersatz||null,ausweich:r.ausweich||0,ms:performance.now()-t}}
function antwort(m){if(port)port.postMessage(m);else if(self.AT3_ORTSKERN_ANTWORT)self.AT3_ORTSKERN_ANTWORT(m)}
// Eine Anfrage nach der anderen; zwischen zwei Plänen kommen neue Nachrichten (Vergessen, neue Welt) dran
function weiter(){if(laeuft||!schlange.length)return;laeuft=true;setTimeout(function(){laeuft=false;var a=schlange.shift();if(!a)return;
 if(a.gen!==gen||!A){weiter();return}
 daten().then(function(){var m;try{m=planen(a.k)}catch(e){m={k:a.k,fehler:String(e&&e.message||e)}}m.art='plan';m.gen=a.gen;antwort(m);weiter()},
  function(e){antwort({art:'plan',gen:a.gen,k:a.k,fehler:'daten: '+(e&&e.message||e)});weiter()})},0)}
function nachricht(d){
 if(d.art==='welt'){gen=d.gen;seed=d.seed>>>0;A=G.ansicht(d.buf.buffer);schlange.length=0;daten()}
 else if(d.art==='plan'){if(d.gen!==gen)return;for(var i=0;i<schlange.length;i++)if(schlange[i].k===d.k)return;schlange.push({k:d.k,gen:d.gen});weiter()}
 else if(d.art==='vergiss'){var s=new Set(d.liste||[]);schlange=schlange.filter(function(a){return !s.has(a.k)})}
 else if(d.art==='port'){port=d.port;port.onmessage=function(e){nachricht(e.data)}}}
self.AT3ORTSKERN={nachricht:nachricht,planen:planen,daten:daten};
if(!eingebettet)self.onmessage=function(e){nachricht(e.data)};
})();
