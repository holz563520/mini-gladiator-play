// WAS DIE DATEI TUT: Anschluss des Hauptkerns an den Spielkern von Arena Theory 3.0 (Schritt G2). Startet den Weltkern (weltkern.js) und die
// Helferkerne (helfer.js), verbindet beide über direkte Leitungen und reicht danach nur noch Befehle hin und Zahlenfelder zurück.
// G5a: Bau-Befehle gehen wie alle Befehle über H.befehl; opt.beiBau meldet Bau-Zähler, Gold und Ergebnisse (nur bei Änderung).
// G3: opt.stand startet die Welt aus einem Spielstand, H.stand() holt den Zustand zum Speichern.
// Kerne: Der Hauptkern rechnet hier nichts. Ohne Hintergrundkerne oder bei Ausfall eines Kerns hält das Spiel kontrolliert an (beiAusfall),
// es wird nichts auf den Hauptkern verlagert. Benutzt vom Spiel (spiel.js, erst nach dem ersten Bild geladen) und von der Kernprobe im Master-Editor.
(function(){
'use strict';
var V='0d32903a', BASIS=(document.currentScript&&document.currentScript.src||'').replace(/[^/]*$/,''), KOPF=16;
// Zahl der Helferkerne: gemeldete Kerne minus Hauptkern und Weltkern, höchstens 4 (Startwert, MK1 misst nach), bei 2 oder weniger Kernen keiner.
function helferZahl(kerne){kerne=kerne|0;return kerne<=2?0:Math.min(4,kerne-2)}

function starten(opt){opt=opt||{};
 var Z={laeuft:false,fehler:null,helfer:0,tick:0,tempo:1,einheiten:0,verloren:0,wartet:false,version:0,offen:0,gesamt:0,ueber:false,selbst:0,fremd:0,
  tickUs:0,p95Us:0,mittelUs:0,bilder:0,abgelehnt:0,bauZaehler:0,gold:0,baustellen:0}, welt=null, hs=[], nr=0, frage=0, wartend={}, tot=false;
 function ausfall(g){if(tot)return;tot=true;Z.laeuft=false;Z.fehler=g;aufraeumen();if(opt.beiAusfall)opt.beiAusfall(g)}
 function aufraeumen(){document.removeEventListener('visibilitychange',sicht);try{welt&&welt.terminate()}catch(e){}hs.forEach(function(h){try{h.terminate()}catch(e){}});welt=null;hs=[]}
 function sicht(){if(welt)welt.postMessage({art:'sichtbar',an:document.visibilityState!=='hidden'})}
 var H={zustand:Z,
  befehl:function(art,wert){if(!welt)return -1;welt.postMessage({art:'befehl',nr:nr,befehl:art,wert:wert});return nr++},
  // G3: Zustand für den Spielstand an einer Tickgrenze holen ({stand, tick, abdruck, ms})
  stand:function(){return new Promise(function(ok){if(!welt)return ok(null);var id=++frage;wartend[id]=ok;welt.postMessage({art:'stand',id:id})})},
  abdruck:function(){return new Promise(function(ok){if(!welt)return ok(null);var id=++frage;wartend[id]=ok;welt.postMessage({art:'abdruck',id:id})})},
  lauf:function(seed,befehle,bis){return new Promise(function(ok){if(!welt)return ok(null);var id=++frage;wartend[id]=ok;welt.postMessage({art:'lauf',id:id,seed:seed,befehle:befehle,bis:bis})})},
  // Riesenwelt-Probe (MK1): Spielstandgröße und Speicher beim Weltkern erfragen
  rwStand:function(){return new Promise(function(ok){if(!welt)return ok(null);var id=++frage;wartend[id]=ok;welt.postMessage({art:'rwStand',id:id})})},
  // Weltgenerator (W1a): Bilddaten für die Weltansicht im Master-Editor an- und abschalten, Stückpuffer nach dem Zeichnen zurückgeben
  wsAn:function(an,nurErde){if(welt)welt.postMessage({art:'wsAn',an:!!an,nurErde:!!nurErde})},   // G4a: nurErde für die Spielkarte
  wsZurueck:function(buf){if(welt&&buf&&buf.buffer.byteLength)welt.postMessage({art:'wsPuffer',buf:buf},[buf.buffer])},
  // G5b: Bauvorschau (bau.js pruefen im Weltkern, ändert nichts): {ok, grund, kosten, felder, …}
  glaDaten:function(wo){return new Promise(function(ok){if(!welt)return ok(null);var id=++frage;wartend[id]=function(d){ok(d.daten)};welt.postMessage({art:'glaDaten',id:id,wo:wo})})},      // G9c1
  bauPruefen:function(w){return new Promise(function(ok){if(!welt)return ok(null);var id=++frage;wartend[id]=function(d){ok(d.erg)};welt.postMessage({art:'bauPruefen',id:id,wert:w})})},
  testAusfall:function(wo){var w=wo==='helfer'?hs[0]:welt;if(w)w.postMessage({art:'testAusfall'})},
  ende:function(){tot=true;Z.laeuft=false;aufraeumen()}};
 if(typeof Worker==='undefined'||typeof MessageChannel==='undefined'){setTimeout(function(){ausfall('no background cores')},0);return H}
 try{
  var n=opt.helfer==null?helferZahl(navigator.hardwareConcurrency||1):opt.helfer, ports=[];
  welt=new Worker(BASIS+'weltkern.js?v='+V+(location.search.match(/[?&]((n2[bcd]|n4b|ar1b)=0)/g)||[]).join('').replace(/\?/g,'&'));   // Notausschalter ?n2b=0, ?n2c=0, ?n2d=0, ?n4b=0 an die Kerne (N2d: vorher nur n2b)
  welt.onerror=function(e){if(e&&e.preventDefault)e.preventDefault();ausfall('world core failed')};
  for(var i=0;i<n;i++){var h=new Worker(BASIS+'helfer.js?v='+V+(location.search.match(/[?&](n2[bcd]|n4b)=0/g)||[]).join('').replace(/\?/g,'&')),k=new MessageChannel();
   h.onerror=function(e){if(e&&e.preventDefault)e.preventDefault();ausfall('helper core failed')};
   h.postMessage({art:'port',port:k.port2},[k.port2]);ports.push(k.port1);hs.push(h)}
  welt.onmessage=function(e){var d=e.data;
   if(d.art==='bild'){var b=d.buf;Z.tick=b[0];Z.tempo=b[1];Z.tickUs=b[2];Z.einheiten=b[3];Z.helfer=b[4];Z.verloren=b[5];Z.wartet=!!b[6];Z.version=b[7];Z.offen=b[9];
    Z.gesamt=b[10];Z.ueber=!!b[11];Z.selbst=b[12];Z.fremd=b[13];Z.p95Us=b[14];Z.mittelUs=b[15];Z.bilder++;
    if(opt.beiBild)try{opt.beiBild(Z,b,KOPF,b[8])}catch(x){}
    if(welt)welt.postMessage({art:'puffer',buf:b},[b.buffer])}
   else if(d.art==='bereit'){Z.laeuft=true;Z.helfer=d.helfer;if(opt.beiBereit)opt.beiBereit(Z)}
   else if(d.art==='abgelehnt'){Z.abgelehnt++;if(opt.beiAbgelehnt)try{opt.beiAbgelehnt(d)}catch(x){}}
   else if(d.art==='karren'){if(opt.beiKarren)try{opt.beiKarren(d)}catch(x){}}   // G6c: Karren nach jedem Takt (solange es welche gibt)
   else if(d.art==='personen'){if(opt.beiPersonen)try{opt.beiPersonen(d)}catch(x){}}   // G7: Arbeiter nach jedem Takt
   else if(d.art==='besucher'){if(opt.beiBesucher)try{opt.beiBesucher(d)}catch(x){}}   // AR2b: Zuschauer der großen Arena nach jedem Takt (solange es welche gibt)
   else if(d.art==='tiere'){if(opt.beiTiere)try{opt.beiTiere(d)}catch(x){}}   // G8: Rehe nach jedem Takt (solange es welche gibt)
   else if(d.art==='waren'){if(opt.beiWaren)try{opt.beiWaren(d)}catch(x){}}   // G7: Bestände und Aufträge, nur bei Änderung
   else if(d.art==='gladiatoren'){if(opt.beiGladiatoren)try{opt.beiGladiatoren(d)}catch(x){}}   // G9c1: Gladiatoren und Sklavenmarkt, nur bei Änderung
   else if(d.art==='weg'){if(opt.beiWeg)try{opt.beiWeg(d)}catch(x){}}   // G6b: Ergebnisse der Wegsuche (Feldliste, Orte, Rechenzeit)
   else if(d.art==='bau'){Z.bauZaehler=d.zaehler;Z.gold=d.gold;Z.baustellen=d.baustellen;if(opt.beiBau)try{opt.beiBau(d)}catch(x){}}   // G5a: nur bei Änderung, mit den Ergebnissen der Bau-Befehle (meld)
   else if(d.art==='rw'){if(opt.beiRw)try{opt.beiRw(d)}catch(x){}if(d.bild&&welt)welt.postMessage({art:'rwBild',buf:d.bild},[d.bild.buffer])}
   else if(d.art==='ws'||d.art==='wsErde'||d.art==='wsStueck'){if(opt.beiWs)try{opt.beiWs(d)}catch(x){}}
   else if(d.art==='standFehler'){ausfall('save not readable: '+d.grund)}
   else if(d.art==='abdruck'||d.art==='laufFertig'||d.art==='rwStand'||d.art==='stand'||d.art==='bauPruefen'||d.art==='glaDaten'){var ok=wartend[d.id];delete wartend[d.id];if(ok)ok(d)}};
  welt.postMessage({art:'start',seed:(opt.seed==null?1:opt.seed)>>>0,stand:opt.stand||null,ports:ports},ports);
  document.addEventListener('visibilitychange',sicht);sicht();
 }catch(e){setTimeout(function(){ausfall('no background cores')},0)}
 return H}

window.AT3KERNE={starten:starten,helferZahl:helferZahl,TICKS:20};
})();
