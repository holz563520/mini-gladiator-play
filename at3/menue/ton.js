// WAS DIE DATEI TUT: Menü „Ton & Sprache“ des AT3-Master-Editors (wird erst beim Öffnen geladen). M8: vorhandene Ton- und Stimmlabore, unverändert verlinkt. Seit V1 spricht das Spiel mit dem englischen Sprachgenerator (at3/stimme.js); was im Voice Lab eingestellt wird, gilt auch im Spiel.
AT3ED.menue('ton',function(el){
 el.innerHTML='<p>Das Spiel spricht Englisch. Die Sterbenden auch.</p>'+
  '<p class="leise">Öffnen sich in einem neuen Tab, der Editor bleibt offen. Die englische Stimme läuft seit V1 im Spiel (Knopf „Voice“): Stimmen, Aussprache und Akzent aus dem Voice Lab gelten dort mit.</p>';
 AT3ED.liste(el,[
  {titel:'Für Arena Theory 3.0',seiten:[
   ['stimmen-labor-en.html','Voice Lab English','Englischer Sprachgenerator, die Stimme des Spiels (Erzähler = Narrator)'],
   ['kampfsound-editor.html','Kampfgeräusche','Schläge, Treffer und Schreie']]},
  {titel:'Altbestand (nur 1.0/2.0, deutsch)',seiten:[
   ['stimmen-labor.html','Deutsches Stimmlabor','Stimmen für 1.0/2.0'],
   ['sprech-editor.html','Sprech-Editor','Sprechstimmen für 1.0/2.0']]}
 ]);
});
