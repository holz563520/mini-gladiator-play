// WAS DIE DATEI TUT: Helferkern von Arena Theory 3.0 (Schritt G2). Rechnet Aufträge des Weltkerns und liefert das Ergebnis zurück.
// In G2 gibt es nur den Probeauftrag; seit G6b die Wegsuche (wegsuche.js); seit MK1 Platzhalter-Nationen und -Kartenstücke (riesenwelt.js), seit W1a Erde und Gelände (weltgen.js).
// Kerne: läuft nur als Hintergrundkern (Worker), gestartet von kernstart.js, spricht über eine direkte Leitung (MessageChannel) mit dem Weltkern,
// nicht über den Hauptkern. Lädt nur kern.js. Immer nur ein Auftrag zur Zeit, die Warteschlange liegt beim Verteiler im Weltkern.
'use strict';
importScripts('kern.js'+self.location.search);
self.onmessage=function(e){var d=e.data;
 if(d.art==='port'){var p=d.port;p.onmessage=function(v){var a=v.data;
  if(self.AT3KERN.WG_AUFTRAG[a.art]){if(!self.AT3WG)importScripts('weltgen.js'+self.location.search)}
  else if(a.art==='weg'||a.art==='kweg'||a.art==='pweg'){var q=self.location.search;if(!self.AT3WEG){var L=[];if(!self.AT3WG)L.push('weltgen.js'+q);if(!self.AT3NATUR)L.push('natur.js'+q);L.push('begehbar.js'+q,'wegsuche.js'+q);importScripts.apply(self,L)}if(a.netz){self.AT3WEG.netzSetzen(a.netz);a.netz=null}if(a.orte&&!self.AT3ORTSSPERRE)importScripts('ortssperre.js'+q)}   // N7a4a2: Sperrkarten der Orte   // G6b: Wegsuche, Netz einmal je Welt       // Weltgenerator (W1a) erst beim ersten solchen Auftrag
  else if(a.art!=='probe'&&!self.AT3RW)importScripts('riesenwelt.js'+self.location.search);      // Riesenwelt-Teil (MK1) erst beim ersten solchen Auftrag
  var t=performance.now(),w=self.AT3KERN.auftragRechnen(a);
  p.postMessage({nr:a.nr,version:a.version,art:a.art,teil:a.teil,us:(performance.now()-t)*1000,wert:w},w&&w.buffer?[w.buffer]:[])}}
 else if(d.art==='testAusfall'){throw new Error('Probe-Ausfall im Helfer')}};
