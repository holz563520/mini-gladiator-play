// WAS DIE DATEI TUT: Menü „Kampf“ des AT3-Master-Editors (wird erst beim Öffnen geladen). M8: vorhandene Kampf-Editoren und -Labore aus 1.0, unverändert verlinkt. Anschluss kommt mit G9.
AT3ED.menue('kampf',function(el){
 el.innerHTML='<p>Die Kampfmechanik aus Arena Theory 1.0 zieht hier ein. Blut wird mitgeliefert.</p>'+
  '<p class="leise">Alte Labore aus 1.0, unverändert. Öffnen sich in einem neuen Tab, der Editor bleibt offen.</p>';
 AT3ED.liste(el,[
  {titel:'Bewegung und Treffer',seiten:[
   ['block-editor.html','Block-Editor','Blocken und Paraden im echten 1-gegen-1-Kampf'],
   ['gang-editor.html','Gang-Editor','Gangarten mit echten Figuren'],
   ['sturz-editor.html','Sturz-Editor','Stürze und Umfallen'],
   ['todes-editor.html','Todes-Editor','Wie gestorben wird, im echten Arenakampf'],
   ['netz-editor.html','Wurfnetz-Editor','Netzwerfer gegen Mensch, Hund oder Löwe']]},
  {titel:'Schädelbruch',seiten:[
   ['schaedelbruch-test.html','Schädelbruch-Testeditor','Animation je Waffe'],
   ['schaedelbruch-kampf-test.html','Schädelbruch-Kampftest','2 gegen 1'],
   ['schaedelbruch-varianten.html','Schädelbruch-Varianten','Entwürfe je Waffe']]},
  {titel:'Kino, Labor und Messung',seiten:[
   ['kino-editor.html','Kino-Editor','Kamerafahrten und Szenen'],
   ['kampf-labor.html','Kampf-Labor','Teams gegeneinander, Kampfparameter, Verteilungen'],
   ['grafik-benchmark.html','Grafik-Benchmark','Hängt der Kampf an der Grafik oder an der Rechnung?']]}
 ]);
 el.insertAdjacentHTML('beforeend','<ul><li>Kampfmechanik über den AT3-Anschluss <span class="leise">(G9)</span></li></ul>');
});
