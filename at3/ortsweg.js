// WAS DIE DATEI TUT: Sperrkarten der Orte und Außenposten für die Wegsuche im Weltkern von Arena Theory 3.0 (Schritt N7a4a2, Thomas 24.11.2026).
// Wegaufträge (weg, kweg, pweg) werden im Tick wie bisher vergeben; erst beim Verteilen an einen Helfer bzw. beim eigenen Rechnen hängt der Weltkern die
// Sperrkarten (ortssperre.js maske) aller Orte und Posten im Fenster an (a.orte). Fehlt eine, bleibt der Auftrag in der Schlange und die Karte wird beim
// Ortskern bestellt; ist das Ergebnis am Fälligkeitstick nicht da, wartet die Welt wie bei einem langsamen Helfer. Die Karten hängen nur an Seed und
// Ortsnummer, darum ist das Ergebnis gleich bei 0–6 Helfern und nach Speichern und Laden. Nichts davon geht in den Spielstand oder den Fingerabdruck.
// Ortskern: eigener Hintergrundkern der Karte über einen eigenen Kanal (portWelt); ohne ihn (Kernprobe, ?n7a2k=0, Ausfall) lädt der Weltkern ortskern.js
// eingebettet und rechnet in seinen Pausen (Regel 13). Speicher: höchstens MAX Byte Karten (je Ort W² Byte), älteste fallen heraus (Entscheidung Thomas: 2 MB).
// Vorab (Entscheidung Thomas): 3 × 3 Fenster um die Parkmitte (z.war sx, sy), dazu das Fenster jedes neuen Wegauftrags sofort beim Vergeben.
// Notausschalter ?n7a4a2=0: keine Karten, alles wie vorher. Kerne: nur Weltkern. Kosten nur je Ort im Fenster, nie abhängig von der Weltgröße (Regel 14).
(function(root){
'use strict';
var ST=64, SX=9600, FEN=5, HALB=2, MAX=2*1048576, WARTE_PORT=8000;
var ARTEN={weg:1,kweg:1,pweg:1};
function neu(opt){opt=opt||{};var MAXB=opt.max||MAX;   // opt.max nur für Tests
 var aus=!!opt.aus, modus=opt.port?'warte':'keiner', port=null, ok=null, gen=-1, seed=0, ans=null;
 var F=new Map(), K=new Map(), bytes=0, bestellt=new Map(), schlange=[], vorabSchl='', warteSeit=0, st={angehaengt:0,bestellt:0,antworten:0,fehler:0,maxAntwortMs:0,warteMs:0,warteMal:0,ortskern:''};
 var wach=opt.wach||function(){}, wartAb=0;
 function um(c){return c<0?c+SX:c>=SX?c-SX:c}
 function schl(cx0,cy0){return um(cx0)*8192+(cy0+16)}
 function senden(m){if(modus==='port'&&port){port.postMessage(m);return}
  if(modus==='warte'){schlange.push(m);if(!warteSeit)warteSeit=Date.now();return}
  einbetten();if(ok)ok.nachricht(m)}
 function einbetten(){if(modus==='eingebettet'&&ok)return;modus='eingebettet';st.ortskern='embedded';
  if(!ok){var s=root;s.AT3_ORTSKERN_EINGEBETTET=true;s.AT3_ORTSKERN_SCHONEN=true;var alt=s.AT3_ORTSKERN_ANTWORT;s.AT3_ORTSKERN_ANTWORT=function(m){if(m.art==='sperre')aufnehmen(m);else if(alt)alt(m)};
   s.importScripts('ortskern.js'+(s.location?s.location.search:''));ok=s.AT3ORTSKERN}
  if(ok&&ans)ok.nachricht({art:'welt',gen:gen,seed:seed,ans:ans})}
 // Welt des Weltkerns (gen, seed, Ansicht der Erde); neue Welt: alles vergessen
 function welt(w){if(!w||!w.ans)return false;if(w.gen===gen)return true;gen=w.gen;seed=w.seed>>>0;ans=w.ans;F.clear();K.clear();bytes=0;bestellt.clear();schlange=schlange.filter(function(m){return m.gen===gen});vorabSchl='';
  if(modus==='eingebettet'&&ok)ok.nachricht({art:'welt',gen:gen,seed:seed,ans:ans});return true}
 function bestellen(cx0,cy0){var k=schl(cx0,cy0);if(F.has(k)||bestellt.has(k))return;bestellt.set(k,Date.now());st.bestellt++;senden({art:'sperre',gen:gen,id:k,cx0:um(cx0),cy0:cy0})}
 // Fensterliste gültig, wenn alle ihre Karten noch da sind
 function liste(k){var L=F.get(k);if(!L)return null;for(var i=0;i<L.length;i++)if(!K.has(L[i])){F.delete(k);return null}return L}
 function brauchtKarten(a){return !aus&&a&&ARTEN[a.art]&&a.gen===gen&&a.cx0!=null}
 // Darf der Auftrag jetzt gerechnet werden? Fehlt seine Fensterliste oder eine Karte: bestellen, nein.
 function bereit(z,a){if(aus||!a||!ARTEN[a.art])return true;if(!z||!welt(z.wg)||a.gen!==gen||a.cx0==null)return true;
  if(liste(schl(a.cx0,a.cy0)))return true;bestellen(a.cx0,a.cy0);return false}
 function anhaengen(a){if(!brauchtKarten(a))return a;var L=liste(schl(a.cx0,a.cy0));if(!L)return a;var o=[];
  for(var i=0;i<L.length;i++){var e=K.get(L[i]);K.delete(L[i]);K.set(L[i],e);o.push({x0:e.x0,y0:e.y0,W:e.W,m:e.m})}
  if(o.length){a.orte=o;st.angehaengt++}return a}
 // Antwort des Ortskerns: Karten merken (höchstens MAX Byte), Fensterliste merken
 function aufnehmen(m){if(m.gen!==gen)return;var t=bestellt.get(m.id);bestellt.delete(m.id);st.antworten++;if(t){var d=Date.now()-t;if(d>st.maxAntwortMs)st.maxAntwortMs=d}
  var L=[];if(m.fehler){st.fehler++}else for(var i=0;i<m.liste.length;i++){var e=m.liste[i];L.push(e.k);if(K.has(e.k)){var a=K.get(e.k);K.delete(e.k);K.set(e.k,a);continue}K.set(e.k,{x0:e.x0,y0:e.y0,W:e.W,m:e.m});bytes+=e.m.length}
  F.set(m.id,L);while(F.size>256)F.delete(F.keys().next().value);
  // Grenze: älteste Karten fallen heraus, nie die gerade gelieferten
  var neuS=new Set(L);if(bytes>MAXB){var it=K.keys(),q;while(bytes>MAXB&&!(q=it.next()).done){if(neuS.has(q.value))continue;bytes-=K.get(q.value).m.length;K.delete(q.value)}}
  wach()}
 // Neuer Wegauftrag (beim Vergeben): Fenster schon bestellen, damit die Karte möglichst da ist, bevor der Auftrag verteilt wird
 function vormerken(z,a){if(aus||!a||!ARTEN[a.art]||!z||!welt(z.wg)||a.gen!==gen)return;if(!liste(schl(a.cx0,a.cy0)))bestellen(a.cx0,a.cy0)}
 // Vorab 3 × 3 Fenster um die Parkmitte (einmal je Welt und Parkmitte)
 function vorab(z){if(aus||!z||!z.war||!welt(z.wg))return;var sx=z.war.sx,sy=z.war.sy,k=gen+':'+sx+':'+sy;if(k===vorabSchl)return;vorabSchl=k;
  var c0=(sx>>6)-HALB,r0=(sy>>6)-HALB;for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){var cy=r0+dy*FEN;if(cy+FEN<=0||cy>=4800)continue;if(!liste(schl(c0+dx*FEN,cy)))bestellen(c0+dx*FEN,cy)}}
 // Kanal zum Ortskern der Karte (port) oder null = eingebettet; Ortskern ausgefallen: eingebettet und alles Offene neu bestellen
 function kanal(p){var war=modus;if(p){port=p;modus='port';st.ortskern='own';port.onmessage=function(e){var d=e.data;if(d&&d.art==='sperre')aufnehmen(d)}}else{port=null;einbetten()}
  var q=schlange;schlange=[];warteSeit=0;q.forEach(senden);
  if(war==='port'||war==='eingebettet'){var L=[];bestellt.forEach(function(t,k){L.push(k)});bestellt.clear();L.forEach(function(k){var cx=(k/8192)|0,cy=(k%8192)-16;bestellen(cx,cy)})}}
 // Wartet die Welt nur auf die Karte der Karte (Kanal kommt nicht)? Nach WARTE_PORT ms eingebettet weiter.
 function pruefen(){if(modus==='warte'&&warteSeit&&Date.now()-warteSeit>WARTE_PORT)kanal(null)}
 function warte(an){if(an){if(!wartAb){wartAb=Date.now();st.warteMal++}}else if(wartAb){st.warteMs+=Date.now()-wartAb;wartAb=0}}
 function stand(){var o={karten:K.size,bytes:bytes,fenster:F.size,offen:bestellt.size,modus:modus,an:!aus};for(var k in st)o[k]=st[k];return o}
 return{bereit:bereit,anhaengen:anhaengen,aufnehmen:aufnehmen,vormerken:vormerken,vorab:vorab,kanal:kanal,pruefen:pruefen,warte:warte,welt:welt,stand:stand,
  get aus(){return aus},braucht:function(a){return !aus&&!!a&&!!ARTEN[a.art]}}}
var OW={neu:neu,ARTEN:ARTEN,MAX:MAX};
if(typeof module!=='undefined'&&module.exports)module.exports=OW;else root.AT3ORTSWEG=OW;
})(typeof self!=='undefined'?self:this);
