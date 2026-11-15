// WAS DIE DATEI TUT: Menü „Ton & Sprache“ des AT3-Master-Editors (wird erst beim Öffnen geladen). M1: nur Gliederung, Inhalt kommt mit M8, V1.
AT3ED.menue('ton',function(el){
 el.innerHTML='<p>Das Spiel spricht Englisch. Die Sterbenden auch.</p>'+
  '<ul><li>Voice Lab English (Sprachgenerator) <span class="leise">(M8, im Spiel ab V1)</span></li>'+
  '<li>Kampfgeräusche und Schreie <span class="leise">(M8)</span></li>'+
  '<li>Deutsches Stimmlabor und Sprech-Editor, nur als Altbestand für 1.0/2.0 <span class="leise">(M8)</span></li></ul>';
});
