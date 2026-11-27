// WAS DIE DATEI TUT: Menü „Kampf“ des AT3-Master-Editors (wird erst beim Öffnen geladen). M8: vorhandene Kampf-Editoren und -Labore aus 1.0, unverändert verlinkt.
// G9d1: Knopf „Probekampf ansehen“ lädt kampfanschluss.js und menue/kampfprobe.js erst beim Antippen; der Kampf läuft im Kampffenster (kampffenster.html, 1.0 abgeschottet).
// B3a (Bären): Gruppe „Tiere“ verlinkt Bären-Kampf-Editor und Bären-Editor (eigene Seiten, wie die alten Labore).
// G9b: Knopf „Kampf-Labor (AT3)“ lädt kampfanschluss.js und menue/kampflabor.js erst beim Antippen; gerechnet wird im Kampfkern (kampfkern.js).
AT3ED.menue('kampf',function(el){
 el.innerHTML='<p>Die Kampfmechanik aus Arena Theory 1.0 zieht hier ein. Blut wird mitgeliefert.</p>'+
  '<p><button class="knopf" id="kLabor">Kampf-Labor (AT3)<small>Mensch, Hund, Löwe · Seed · Kampf rechnen · Nochmal gleich · Ladezeit</small></button> '+
  '<button class="knopf" id="kProbe">Probekampf ansehen<small>Kampffenster · 1.0 unverändert · gewürfelt wie am Sklavenmarkt · 1–5 je Team</small></button></p><div id="kInhalt"></div>'+
  '<p class="leise">Alte Labore aus 1.0, unverändert. Öffnen sich in einem neuen Tab, der Editor bleibt offen.</p>';
 el.querySelector('#kLabor').onclick=function(){var z=el.querySelector('#kInhalt');z.innerHTML='<p class="leise">Der Sand wird geharkt … die Reste vom letzten Mal liegen noch drin.</p>';
  AT3ED.lade('kampf','kampfanschluss.js').then(function(){return AT3ED.lade('kampf','menue/kampflabor.js')})
   .then(function(){return AT3_KAMPFLABOR.aufbauen(z)}).catch(function(e){z.innerHTML='<p class="witz">Labor eingestürzt: '+String(e.message).replace(/</g,'&lt;')+'</p>'})};
 el.querySelector('#kProbe').onclick=function(){var z=el.querySelector('#kInhalt');z.innerHTML='<p class="leise">Der Sand wird geharkt …</p>';
  AT3ED.lade('kampf','kampfanschluss.js').then(function(){return AT3ED.lade('kampf','menue/kampfprobe.js')})
   .then(function(){return AT3_KAMPFPROBE.aufbauen(z)}).catch(function(e){z.innerHTML='<p class="witz">Probe eingestürzt: '+String(e.message).replace(/</g,'&lt;')+'</p>'})};
 AT3ED.liste(el,[
  {titel:'Bewegung und Treffer',seiten:[
   ['block-editor.html','Block-Editor','Blocken und Paraden im echten 1-gegen-1-Kampf'],
   ['gang-editor.html','Gang-Editor','Gangarten mit echten Figuren'],
   ['sturz-editor.html','Sturz-Editor','Stürze und Umfallen'],
   ['todes-editor.html','Todes-Editor','Wie gestorben wird, im echten Arenakampf'],
   ['netz-editor.html','Wurfnetz-Editor','Netzwerfer gegen Mensch, Hund oder Löwe']]},
  {titel:'Tiere',seiten:[
   ['baer-kampf.html','Bären-Kampf-Editor','Bären gegen Menschen, Hunde und andere Bären (Testversion B3a)'],
   ['baer-editor.html','Bären-Editor','Sorten, Körper, Bewegung, Messung']]},
  {titel:'Schädelbruch',seiten:[
   ['schaedelbruch-test.html','Schädelbruch-Testeditor','Animation je Waffe'],
   ['schaedelbruch-kampf-test.html','Schädelbruch-Kampftest','2 gegen 1'],
   ['schaedelbruch-varianten.html','Schädelbruch-Varianten','Entwürfe je Waffe']]},
  {titel:'Kino, Labor und Messung',seiten:[
   ['kino-editor.html','Kino-Editor','Kamerafahrten und Szenen'],
   ['kampf-labor.html','Kampf-Labor','Teams gegeneinander, Kampfparameter, Verteilungen'],
   ['grafik-benchmark.html','Grafik-Benchmark','Hängt der Kampf an der Grafik oder an der Rechnung?']]}
 ]);
 el.insertAdjacentHTML('beforeend','<ul><li>Arena im Spiel (Aufstellung, Gegner, Termin) <span class="leise">(G9d2)</span></li></ul>');
});
