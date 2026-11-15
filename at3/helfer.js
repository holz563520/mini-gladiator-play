// WAS DIE DATEI TUT: Helferkern von Arena Theory 3.0 (Schritt G2). Rechnet Aufträge des Weltkerns und liefert das Ergebnis zurück.
// In G2 gibt es nur den Probeauftrag; Wege, Kartenstücke und ferne Regionen hängen sich später hier ein.
// Kerne: läuft nur als Hintergrundkern (Worker), gestartet von kernstart.js, spricht über eine direkte Leitung (MessageChannel) mit dem Weltkern,
// nicht über den Hauptkern. Lädt nur kern.js. Immer nur ein Auftrag zur Zeit, die Warteschlange liegt beim Verteiler im Weltkern.
'use strict';
importScripts('kern.js'+self.location.search);
self.onmessage=function(e){var d=e.data;
 if(d.art==='port'){var p=d.port;p.onmessage=function(v){var a=v.data;p.postMessage({nr:a.nr,version:a.version,wert:self.AT3KERN.auftragRechnen(a)})}}
 else if(d.art==='testAusfall'){throw new Error('Probe-Ausfall im Helfer')}};
