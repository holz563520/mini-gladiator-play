// WAS DIE DATEI TUT: Menü „Ton & Sprache“ des AT3-Master-Editors (wird erst beim Öffnen geladen). M8: vorhandene Ton- und Stimmlabore, unverändert verlinkt. Stimme im Spiel kommt mit V1.
AT3ED.menue('ton',function(el){
 el.innerHTML='<p>Das Spiel spricht Englisch. Die Sterbenden auch.</p>'+
  '<p class="leise">Öffnen sich in einem neuen Tab, der Editor bleibt offen. Im Spiel ab V1.</p>';
 AT3ED.liste(el,[
  {titel:'Für Arena Theory 3.0',seiten:[
   ['stimmen-labor-en.html','Voice Lab English','Englischer Sprachgenerator, wird in V1 die Stimme des Spiels'],
   ['kampfsound-editor.html','Kampfgeräusche','Schläge, Treffer und Schreie']]},
  {titel:'Altbestand (nur 1.0/2.0, deutsch)',seiten:[
   ['stimmen-labor.html','Deutsches Stimmlabor','Stimmen für 1.0/2.0'],
   ['sprech-editor.html','Sprech-Editor','Sprechstimmen für 1.0/2.0']]}
 ]);
});
