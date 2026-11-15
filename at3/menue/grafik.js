// WAS DIE DATEI TUT: Menü „Grafik“ des AT3-Master-Editors (wird erst beim Öffnen geladen). M1: nur Gliederung, Inhalt kommt mit M2, M3, M9.
AT3ED.menue('grafik',function(el,c){
 var n=c.kartei&&c.kartei.objekte?c.kartei.objekte.length:0;
 el.innerHTML='<p>Hier entsteht jede Grafik, die ins Spiel darf. Am Editor vorbei kommt nichts hinein, nicht einmal eine Ratte.</p>'+
  '<p class="leise">Objekte in der Kartei: '+n+'.</p>'+
  '<ul><li>Grafikstandard AT3-32, Palette und Musterblatt <span class="leise">(M2)</span></li>'+
  '<li>Skizzen zeichnen, Objektkartei, Export <span class="leise">(M3)</span></li>'+
  '<li>Boden, Natur, Gebäude und Wände, Einrichtung, Waren, Figuren, Tiere, Fahrzeuge, Zeichen <span class="leise">(Startset M9, danach jeder Inhaltsschritt)</span></li></ul>';
});
