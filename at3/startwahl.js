// WAS DIE DATEI TUT: Startplatz-Wahl von Arena Theory 3.0 (Schritt G4c, seit G4d in der echten Kartenansicht). Nach „New world“ (oder bei einem Spielstand ohne
// Kameraort) beginnt die Karte beim ganzen Globus; man zoomt frei mit zwei Fingern (oder − / +) vom Globus über alle Fernstufen bis zur Stufe 1× und zurück, wischt,
// dreht den Globus. Antippen setzt das Kreuz (auf jeder Stufe, auch auf dem Globus): der Bildkern sucht im echten Kartenstück das nächste trockene Feld, die Auskunft
// nennt Biom und den nächsten Ort mit Namen. „Surprise me“ wählt einen zufälligen Platz an Land (Zahl aus crypto, kein Spielzufall) und schaut dorthin.
// „Start here“ gibt {x, y} zurück; Speichern macht spiel.js. Unten nur eine schmale Leiste (Rattenpergament), die Karte bleibt frei.
// Kerne: alles Rechnen im Bildkern (weltkarte.frage → bildkern.js → startplatz.js); hier nur Text und Knöpfe, das Kreuz malt die Karte (weltkarte.marke).
// W1c Runde Welt: Platz und Kreuz laufen über die Naht; Eis: Absage. Englisch (Regel 10). Wiederverwendet: Platzsuche und Texte aus G4c, Karte und Globus aus G4a/G4d.
(function(){
'use strict';
function zahl(){try{return crypto.getRandomValues(new Uint32Array(1))[0]}catch(e){return(Math.random()*4294967296)>>>0}}

// o = {t, karte, name}. Ergebnis: Promise {x, y, bio, ort}
function zeigen(o){var T=o.t, K=o.karte;
 return new Promise(function(fertig){
  var el=document.createElement('div');el.id='at3Wahl';el.setAttribute('role','region');document.body.appendChild(el);
  el.innerHTML='<div class="papier w-leiste"><b>'+T('wahl.titel')+'</b> <span class="leise" id="wUnter"></span><p class="leise w-laedt" id="wLaedt"></p>'+
   '<p id="wInfo" class="w-info" aria-live="polite"></p><div class="w-knoepfe"><button class="knopf" id="wLos" disabled></button><button class="knopf klein weg" id="wZufall"></button></div></div>';
  var $=function(id){return el.querySelector('#'+id)};
  $('wUnter').textContent=T('wahl.unterErde');$('wLos').textContent=T('wahl.los');$('wZufall').textContent=T('wahl.zufall');
  var wahl=null, beschaeftigt=false, nr=0;
  window.AT3WAHL={wahl:function(){return wahl},tippe:platzHolen,stufe:function(){var k=K.kamera();return k.globus?-1:k.lod}};
  function laedt(x){$('wLaedt').textContent=x||'';$('wLaedt').hidden=!x}
  function info(x,schlecht){var e=$('wInfo');e.textContent=x;e.className='w-info'+(schlecht?' schlecht':'')}
  function platzText(p){var b=T('welt.bio.'+p.bio),q=p.ort;return q?T('wahl.platz',{b:b,n:q.name,a:T('wahl.art.'+q.art),d:q.weit}):T('wahl.platzLeer',{b:b})}
  function platzNehmen(p,schauen){if(!p||!p.ok){wahl=null;K.marke(null);info(T(p&&p.eis?'wahl.eis':'wahl.nass'),true);$('wLos').disabled=true;return}
   wahl=p;K.marke(p.x,p.y);if(schauen)K.zeigeAuf(p.x+.5,p.y+.5);info(platzText(p)+(p.weit>48?' '+T('wahl.verschoben'):''),false);$('wLos').disabled=false}
  // Antippen der Karte (x, y = Feld der Welt): nur die letzte Anfrage zählt
  function platzHolen(x,y){var n=++nr;beschaeftigt=true;info(T('wahl.sucht'));
   return K.frage('platz',{x:x,y:y}).then(function(a){if(n!==nr)return;beschaeftigt=false;if(a.fehlt){info(T('wahl.fehlt'),true);return}platzNehmen(a.platz,false)})}
  laedt(T('wahl.malt'));
  K.wahlStart(platzHolen,function(){laedt('')});
  $('wZufall').onclick=function(){var n=++nr;beschaeftigt=true;info(T('wahl.sucht'));
   K.frage('zufall',{r1:zahl(),r2:zahl()}).then(function(a){if(n!==nr)return;beschaeftigt=false;var p=a.platz;if(a.fehlt||!p||!p.ok){info(T('wahl.keinLand'),true);return}platzNehmen(p,true)})};
  $('wLos').onclick=function(){if(!wahl)return;var w=wahl;delete window.AT3WAHL;K.wahlEnde();el.remove();fertig({x:w.x,y:w.y,bio:w.bio,ort:w.ort?w.ort.name:''})}})}

window.AT3STARTWAHL={zeigen:zeigen};
})();
