// WAS DIE DATEI TUT: Kampfanschluss von Arena Theory 3.0 (Schritt G9a; G9b: Laborkämpfer erzeugen, Ladezeit, Fingerabdruck). Baut Kampfaufträge (Kennung, Seed, zwei Teams), schickt sie an den
// Kampfkern (kampfkern.js, eigener Hintergrundkern mit der unveränderten Kampflogik aus 1.0) und schreibt das Ergebnis GENAU EINMAL zurück.
// Herkunft ist Pflicht (Thomas 16.11.2026): Jeder Kämpfer kommt aus einem benannten Ort der Welt (Schule, Dorf, Stadt …) und hat einen
// Geburtsort auf der Karte. Nur Testkämpfer des Kampf-Labors dürfen ohne Ort sein und sind dann ausdrücklich als „labor“ markiert.
// Kerne: Hier wird nichts gerechnet. Der Hauptkern baut nur den Auftrag und nimmt das Ergebnis an; gerechnet wird im Kampfkern.
// Läuft im Browser (Master-Editor, später Spiel) und in Node-Tests (ohne Worker, dann über KA.lokal).
(function(G){
'use strict';
var KA={VERSION:1,kern:null,warte:{},nr:0};
var HERKUNFT_ARTEN=['schule','dorf','stadt','burg','hafen','wildnis','labor'];

// ---------- Kämpfer und Herkunft ----------
// Kämpfer: {id, name, art:'human'|'dog'|'lion'|'rooster', herkunft:{art, ortId, name}, geburtsort:{ortId, name, x, y}, g:<Kämpferdaten aus 1.0>}
function pruefeKaempfer(k){
 if(!k||typeof k.id!=='string'||!k.id)return 'Kämpfer ohne Kennung';
 if(!k.g||typeof k.g!=='object')return k.id+': keine Kämpferdaten';
 var h=k.herkunft;
 if(!h||HERKUNFT_ARTEN.indexOf(h.art)<0||!h.name)return k.id+': Herkunft fehlt (Schule, Dorf, Stadt … mit Namen)';
 if(h.art==='labor')return '';
 if(h.ortId==null)return k.id+': Herkunft ohne Ort auf der Karte';
 var b=k.geburtsort;
 if(!b||b.ortId==null||!b.name)return k.id+': Geburtsort fehlt';
 return '';}
KA.pruefeKaempfer=pruefeKaempfer;
KA.laborHerkunft=function(){return {art:'labor',ortId:null,name:'Kampf-Labor (Testkämpfer)'};};

// ---------- Auftrag ----------
// teams: {blau:[{kaempfer, reihe:'front'|'back'}], rot:[…]}. Seed: ganze Zahl. Die Kennung macht das Zurückschreiben einmalig.
KA.auftrag=function(id,seed,teams,titel){
 if(!id)throw new Error('Kampfauftrag ohne Kennung');
 var fehler=[];
 ['blau','rot'].forEach(function(s){var t=teams&&teams[s];if(!t||!t.length)fehler.push('Team '+s+' ist leer');
  else t.forEach(function(e){var f=pruefeKaempfer(e&&e.kaempfer);if(f)fehler.push(f);});});
 if(fehler.length)throw new Error('Kampfauftrag ungültig: '+fehler.join('; '));
 // Daten liegen beim AT3-Kämpfer immer in g; 1.0 erwartet sie bei Hund und Löwe unter D bzw. L (G9b)
 var einheit=function(e){var k=e.kaempfer,art=k.art||'human',u={kind:art,key:k.id,row:e.reihe==='back'?'back':'front'};u[art==='dog'?'D':art==='lion'?'L':art==='rooster'?'R':'g']=k.g;return u;};
 return {id:String(id),seed:seed>>>0,titel:titel||'',
  spec:JSON.parse(JSON.stringify({title:titel||'',blue:teams.blau.map(einheit),red:teams.rot.map(einheit)})),
  herkunft:[].concat(teams.blau,teams.rot).map(function(e){return {id:e.kaempfer.id,herkunft:e.kaempfer.herkunft,geburtsort:e.kaempfer.geburtsort||null};})};};

// ---------- Rechnen: im Kampfkern (Browser) ----------
// kern.laden (G9b): {ms: vom Start bis bereit auf dem Hauptkern gemessen, kernMs, dateien, bytes, entpackt: vom Kampfkern selbst gemeldet}
KA.starteKern=function(basis,v){
 if(KA.kern)return KA.kern;
 var t0=(G.performance||Date).now(),w=new Worker((basis||'')+'kampfkern.js?v='+(v||'')),k={w:w,laden:null};
 k.bereit=new Promise(function(ok,nein){w.onerror=function(e){nein(new Error('Kampfkern ausgefallen: '+(e.message||e)));};
  w.onmessage=function(e){var d=e.data;if(d.bereit){k.laden={ms:Math.round((G.performance||Date).now()-t0),kernMs:d.ladeMs,dateien:d.dateien,bytes:d.bytes,entpackt:d.entpackt};ok(k.laden);return;}
   var p=KA.warte[d.nr];if(!p)return;delete KA.warte[d.nr];d.fehler?p.nein(new Error(d.fehler)):p.ok(d.ergebnis);};});
 KA.kern=k;return k;};
function frage(art,feld,wert,basis,v){
 var k=KA.starteKern(basis,v),nr=++KA.nr;
 return k.bereit.then(function(){return new Promise(function(ok,nein){KA.warte[nr]={ok:ok,nein:nein};var m={art:art,nr:nr};m[feld]=wert;k.w.postMessage(m);});});}
KA.rechne=function(auftrag,basis,v){return frage('kampf','auftrag',auftrag,basis,v);};
// G9b: Laborkämpfer im Kampfkern erzeugen lassen (1.0-Erzeugung, Hauptkern lädt nichts aus 1.0). wunsch siehe kampfkern.js KK.erzeuge
KA.erzeuge=function(wunsch,basis,v){return frage('erzeuge','wunsch',wunsch,basis,v);};
// G9b: Fingerabdruck eines Ergebnisses für die Gleichheitsprobe (Sieger, Zeit, je Kämpfer Zustand, Verletzungen und Daten nach dem Kampf)
KA.abdruck=function(e){var s=JSON.stringify([e.sieger,e.zeit,e.einheiten.map(function(u){return [u.key,u.tot,u.unten,u.leben,u.kills,u.verletzungen,u.ursache,u.g];})]),h=0x811c9dc5;
 for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193);}return ('0000000'+(h>>>0).toString(16)).slice(-8);};
KA.beende=function(){if(KA.kern){KA.kern.w.terminate();KA.kern=null;}for(var n in KA.warte){KA.warte[n].nein(new Error('Kampfkern beendet'));}KA.warte={};};

// ---------- Zurückschreiben: genau einmal ----------
// buch: {erledigt:{auftragId:…}} – liegt später im Spielstand. kaempfer: {id: Kämpfer}. Gibt true zurück, wenn geschrieben wurde.
// Übernommen werden die kompletten Kämpferdaten so, wie 1.0 sie nach dem Kampf hinterlässt (Körper, Blut, Erschöpfung, Narben, Tod,
// Lernfortschritt im Kampf, Siege, Ruhm, Kampfgeschichte). Herkunft, Geburtsort, Name und Kennung des AT3-Kämpfers bleiben unberührt.
KA.zurueckschreiben=function(buch,auftrag,ergebnis,kaempfer){
 if(!buch||!auftrag||!ergebnis)throw new Error('Zurückschreiben braucht Buch, Auftrag und Ergebnis');
 if(ergebnis.auftrag!==auftrag.id)throw new Error('Ergebnis gehört zu einem anderen Auftrag');
 buch.erledigt=buch.erledigt||{};
 if(buch.erledigt[auftrag.id])return false;
 ergebnis.einheiten.forEach(function(e){var k=kaempfer[e.key];if(!k||!e.g)return;
  k.g=JSON.parse(JSON.stringify(e.g));
  k.zustand={tot:e.tot,unten:e.unten,leben:e.leben,verletzt:e.verletzt,schwer:e.schwer,verletzungen:e.verletzungen,ursache:e.ursache||'',kampf:auftrag.id};});
 buch.erledigt[auftrag.id]={sieger:ergebnis.sieger,zeit:ergebnis.zeit};
 return true;};

G.AT3Kampf=KA;
if(typeof module!=='undefined'&&module.exports)module.exports=KA;
})(typeof self!=='undefined'?self:globalThis);
