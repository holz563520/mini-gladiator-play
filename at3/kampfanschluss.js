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
// G9c1: Kandidaten des Sklavenmarkts im Kampfkern würfeln (1.0 unverändert, wie trader.js stock). wunsch {seed, n}
KA.wuerfle=function(wunsch,basis,v){return frage('wuerfle','wunsch',wunsch,basis,v);};
// G9c2: Kandidatenkarten (1.0 barracks info/analysis, buy-odds, Porträt). wunsch {lot:[g|null …]} → {karten, bilder}
KA.karten=function(wunsch,basis,v){return frage('karten','wunsch',wunsch,basis,v);};
// G9d3: Arenakampf „nur Ergebnis“ ohne Fenster (kampfkern.js KK.arena, wie der angesehene Kampf) und tägliche Heilung wie 1.0 (KK.heile)
KA.arena=function(wunsch,basis,v){return frage('arena','wunsch',wunsch,basis,v);};
KA.heile=function(wunsch,basis,v){return frage('heile','wunsch',wunsch,basis,v);};
// K0: Medicus wie 1.0 (kampfkern.js KK.behandle: Kosten je Stufe oder eine Behandlung)
KA.behandle=function(wunsch,basis,v){return frage('behandle','wunsch',wunsch,basis,v);};
// F1a: Kartenfiguren wie 2.0 (Posenblätter, voll und AT3-64) im Kampfkern zeichnen lassen. wunsch {seed, n, besucher, palette}
KA.figuren=function(wunsch,basis,v){return frage('figuren','wunsch',wunsch,basis,v);};
// F1b: Kartenblätter der Personen fürs Spiel (AT3-64) im Kampfkern zeichnen lassen. wunsch {gs:[{pid,g}], lasten, palette}
KA.kfiguren=function(wunsch,basis,v){return frage('kfiguren','wunsch',wunsch,basis,v);};
// F1c: Nahblätter (volle 1.0-Figur, AT3-64) für die Zoomstufe 2×. wunsch wie kfiguren
KA.knah=function(wunsch,basis,v){return frage('knah','wunsch',wunsch,basis,v);};
// G9b: Fingerabdruck eines Ergebnisses für die Gleichheitsprobe (Sieger, Zeit, je Kämpfer Zustand, Verletzungen und Daten nach dem Kampf)
KA.abdruck=function(e){var s=JSON.stringify([e.sieger,e.zeit,e.einheiten.map(function(u){return [u.key,u.tot,u.unten,u.leben,u.kills,u.verletzungen,u.ursache,u.g];})]),h=0x811c9dc5;
 for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193);}return ('0000000'+(h>>>0).toString(16)).slice(-8);};
KA.beende=function(){if(KA.kern){KA.kern.w.terminate();KA.kern=null;}for(var n in KA.warte){KA.warte[n].nein(new Error('Kampfkern beendet'));}KA.warte={};};

// ---------- G9d1: Kampf ansehen im Kampffenster (unverändertes 1.0 im abgeschotteten Rahmen) ----------
// Öffnet kampffenster.html als Vollbild-Rahmen über der Seite, schickt den Auftrag, zeigt den Kampf 1:1 wie 1.0 und liefert das Ergebnis
// im Format von KA.rechne (dazu angesehen:true, dauerMs). Der Rahmen wird danach entladen (Entscheidung Thomas 17.11.2026: Speicher am Handy).
// opt: {basis:'' (Pfad zu dist/at3/), v, pause(), weiter()} – pause/weiter halten die Weltuhr an (Entscheidung Thomas: Uhr steht während des Kampfs).
// G9d2: Auftrag mit modus 'wahl' (Aufstellung, Ergebnis {termin}) oder 'kampf' (Termin ansehen, Ergebnis mit arena:1, praemie, gewonnen, auf).
// Ein Auftrag zur Zeit. Das Versprechen erfüllt sich genau einmal; zurückgeschrieben wird weiter nur über KA.zurueckschreiben (Buch).
KA.fenster=function(auftrag,opt){
 opt=opt||{};var D=G.document;
 if(!D)return Promise.reject(new Error('Kampffenster braucht einen Browser'));
 if(KA.offen)return Promise.reject(new Error('Es läuft schon ein Kampf'));
 if(!auftrag||!auftrag.id||(!auftrag.spec&&!auftrag.modus))return Promise.reject(new Error('Kampffenster ohne gültigen Auftrag'));
 return new Promise(function(ok,nein){
  var huelle=D.createElement('div'),rahmen=D.createElement('iframe'),zu=false,laeuft=false;
  huelle.id='at3Kampffenster';huelle.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#120c09';
  rahmen.title='Arena';rahmen.allow='autoplay';rahmen.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:0;display:block';
  rahmen.src=(opt.basis||'')+'kampffenster.html?v='+encodeURIComponent(opt.v||'')+'&preload=off';
  var ab=D.createElement('button');ab.type='button';ab.textContent='✕';ab.title='Cancel';ab.setAttribute('aria-label','Cancel');
  ab.style.cssText='position:absolute;top:max(8px,env(safe-area-inset-top));right:8px;z-index:2;font:bold 18px monospace;padding:6px 12px;border:2px solid #6b5537;background:#2a1d14;color:#e8d9b5';
  function ende(f,wert){if(zu)return;zu=true;G.removeEventListener('message',hoer);try{rahmen.src='about:blank';}catch(e){}huelle.remove();KA.offen=null;
   try{opt.weiter&&opt.weiter();}catch(e){}f(wert);}
  ab.onclick=function(){if(!laeuft)ende(nein,new Error('abgebrochen'));};
  function hoer(e){if(e.source!==rahmen.contentWindow)return;var d=e.data||{};if(!d.kf)return;
   if(d.art==='bereit')rahmen.contentWindow.postMessage({kf:1,art:'auftrag',auftrag:auftrag},G.location.origin);
   else if(d.art==='laeuft'){laeuft=true;ab.remove();}
   else if(d.art==='ergebnis'){if(!d.ergebnis||d.ergebnis.auftrag!==auftrag.id)return;ende(ok,d.ergebnis);}
   else if(d.art==='termin'){if(!laeuft&&d.termin)ende(ok,{termin:d.termin});}      // G9d2: Aufstellung gewählt → Termin (kein Kampf)
   else if(d.art==='abbruch')ende(nein,new Error(d.text||'abgebrochen'));
   else if(d.art==='fehler'&&!laeuft){/* Rahmen zeigt die Meldung mit Zurück-Knopf; ✕ bleibt */}}
  G.addEventListener('message',hoer);
  try{opt.pause&&opt.pause();}catch(e){}
  huelle.appendChild(rahmen);if(!auftrag.modus)huelle.appendChild(ab);/* G9d2: die Arena hat den ◀-Knopf der 1.0-Aufstellung, kein ✕ darüber */D.body.appendChild(huelle);KA.offen={auftrag:auftrag.id,rahmen:rahmen};});};

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
