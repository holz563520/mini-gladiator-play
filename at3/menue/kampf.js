// WAS DIE DATEI TUT: Menü „Kampf“ des AT3-Master-Editors (wird erst beim Öffnen geladen). M1: nur Gliederung, alte Labore kommen mit M8, Anschluss mit G9.
AT3ED.menue('kampf',function(el){
 el.innerHTML='<p>Die Kampfmechanik aus Arena Theory 1.0 zieht hier ein. Blut wird mitgeliefert.</p>'+
  '<ul><li>Vorhandene Labore: Block, Gang, Sturz, Tod, Kino, Netz, Schädelbruch, Kampf-Labor, Benchmark <span class="leise">(M8)</span></li>'+
  '<li>Kampfmechanik über den AT3-Anschluss <span class="leise">(G9)</span></li></ul>';
});
