// WAS DIE DATEI TUT: Menü „Prüfen & Kosten“ des AT3-Master-Editors (wird erst beim Öffnen geladen). M1: Gliederung und Startlast dieses Editors.
AT3ED.menue('pruefen',function(el){
 var L=AT3ED.last(),s=L.start;
 el.innerHTML='<p>Was zu teuer ist, kommt nicht ins Spiel. Hier wird gewogen, nicht verhandelt.</p>'+
  (s?'<p>Startlast dieses Editors: '+s.n+' Dateien, '+(s.b/1024).toFixed(1).replace('.',',')+' KB übertragen, bereit nach '+Math.round(s.ms)+' ms, Fremddateien: '+s.fremd.length+'. Ziel: höchstens 1 MiB.</p>':'')+
  '<ul><li>Prüfer: Palette, Maße, Beschreibung, beide Ansichten <span class="leise">(M2–M5)</span></li>'+
  '<li>Lastszene, Messung gedrosselt und auf diesem Gerät, Budgets, Ampel, Übernahme <span class="leise">(M6)</span></li>'+
  '<li>Riesenwelt-Probe mit 10 bis 10.000 Nationen <span class="leise">(MK1)</span></li></ul>';
});
