// WAS DIE DATEI TUT: Menü „Altbestand“ des AT3-Master-Editors (wird erst beim Öffnen geladen). M8: alle übrigen Seiten aus 1.0/2.0 (Spiele, Figurenlabore, Galerien, Testseiten), unverändert verlinkt.
AT3ED.menue('alt',function(el){
 el.innerHTML='<p>Alles Alte bleibt, wie es ist. Hier wird nichts gelöscht, nur ordentlich aufgebahrt.</p>'+
  '<p class="leise">Öffnen sich in einem neuen Tab, der Editor bleibt offen. Spielstände von 1.0/2.0 bleiben getrennt.</p>';
 AT3ED.liste(el,[
  {titel:'Spiele',seiten:[
   ['index.html','Arena Theory 1.0','Das Hauptspiel'],
   ['arena-theory-2.html','Arena Theory 2.0','Pausiert'],
   ['arena-theory-2-gross-test.html','2.0 Großwelt-Test','Karte mit 100-facher Fläche'],
   ['arena-neu.html','Neue Arena (Testversion)','Einzeldatei',1]]},
  {titel:'Figurenlabore und Generatoren',seiten:[
   ['figure-editor-v4.html','Figurenlabor V4','IST / SOLL',1],
   ['figure-editor-pixel2.html','Figurenlabor Pixel 2','IST / SOLL',1],
   ['figure-test.html','Grafiktest V4','Figuren im Test'],
   ['figuren-performance-test.html','Figuren-Testlabor','Leistung vieler Figuren'],
   ['box-generator.html','Faustkampf-Generator','Faustkämpfer erzeugen'],
   ['boss-editor.html','Berüchtigte','Anführer und Trophäen ansehen'],
   ['tageslauf-editor.html','Tageslauf-Editor','Uhr, Licht, Tageswechsel']]},
  {titel:'Galerien',seiten:[
   ['schild-galerie.html','Schild-Galerie','Alle Schilde'],
   ['kriegshammer-galerie.html','Kriegshämmer','Alle Kriegshämmer'],
   ['preview.html','Szenen-Vorschau','Einzelne Szenen ansehen']]},
  {titel:'Testmissionen und Testseiten',seiten:[
   ['anfuehrer-test.html','Anführer','Testmission'],
   ['aussenwelt-test.html','Der Schuldeneintreiber','Testmission Außenwelt'],
   ['apfelschuss.html','Apfelschuss','Minispiel'],
   ['apfelschuss-einzeldatei.html','Apfelschuss (Einzeldatei)','Alles in einer Datei',1],
   ['fernkampf-tutorial-test.html','Fernkampf-Tutorial','Test'],
   ['fernkampf-tutorial-einzeldatei.html','Fernkampf-Tutorial (Einzeldatei)','Alles in einer Datei',1],
   ['aufstellung-test.html','Aufstellung','Testversion'],
   ['lanista-test.html','Lanista-Gier','Testversion'],
   ['spielfeld.html','Spielfeld-Ansicht','Test'],
   ['weltkarte-test.html','Weltkarte','Testversion'],
   ['tritt-test.html','Hund wegtreten','Test'],
   ['vergleich-grosse-kaempfe.html','Vergleich große Kämpfe','Leistung großer Schlachten'],
   ['zwei-kerne-test.html','Zwei-Kerne-Test','Zeichnen auf einem zweiten Kern']]}
 ]);
});
