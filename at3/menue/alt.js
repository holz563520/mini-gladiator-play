// WAS DIE DATEI TUT: Menü „Altbestand“ des AT3-Master-Editors (wird erst beim Öffnen geladen). M1: nur Gliederung, Einbindung kommt mit M8.
AT3ED.menue('alt',function(el){
 el.innerHTML='<p>Alles Alte bleibt, wie es ist. Hier wird nichts gelöscht, nur ordentlich aufgebahrt.</p>'+
  '<ul><li>Figurenlabore, Galerien und übrige Testseiten, unverändert <span class="leise">(M8)</span></li></ul>';
});
