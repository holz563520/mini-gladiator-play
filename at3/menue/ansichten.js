// WAS DIE DATEI TUT: Menü „Ansichten“ des AT3-Master-Editors (wird erst beim Öffnen geladen). M1: nur Gliederung, Inhalt kommt mit M5, M7.
AT3ED.menue('ansichten',function(el){
 el.innerHTML='<p>Jedes Objekt braucht zwei Gesichter: eins für die Karte, eins für die Augenhöhe. Wie ein guter Lanista.</p>'+
  '<ul><li>Kartenansicht <span class="leise">(M5)</span></li><li>First-Person-Ansicht, nah und fern <span class="leise">(M5)</span></li>'+
  '<li>Beide nebeneinander <span class="leise">(M5)</span></li><li>Begehbare First-Person-Probe <span class="leise">(M7)</span></li></ul>';
});
