// WAS DIE DATEI TUT: Menü „Prüfen & Kosten“ des AT3-Master-Editors (wird erst beim Öffnen geladen). M1: Startlast dieses Editors.
// M6: Knopf öffnet den Prüfstand (pruefstand.js mit at3-64.js und karte.js, erst beim Antippen geladen): Ampel, Status, Lastszene, Messung, Übernahme.
AT3ED.menue('pruefen',function(el){
 var L=AT3ED.last(),s=L.start;
 el.innerHTML='<p>Was zu teuer ist, kommt nicht ins Spiel. Hier wird gewogen, nicht verhandelt.</p>'+
  (s?'<p class="leise">Startlast dieses Editors: '+s.n+' Dateien, '+(s.b/1024).toFixed(1).replace('.',',')+' KB übertragen, bereit nach '+Math.round(s.ms)+' ms, Fremddateien: '+s.fremd.length+'. Ziel: höchstens 1 MiB.</p>':'')+
  '<p><button class="knopf" id="pAuf">Prüfstand<small>Ampel · Status · Lastszene · Messung · Übernahme</small></button></p>'+
  '<div id="pInhalt"></div>'+
  '<ul><li>Riesenwelt-Probe mit 10 bis 10.000 Nationen <span class="leise">(MK1)</span></li></ul>';
 el.querySelector('#pAuf').onclick=function(){var z=el.querySelector('#pInhalt');z.innerHTML='<p class="leise">Die Waage wird geeicht … mit einer toten Ratte als Gegengewicht.</p>';
  AT3ED.lade('pruefen','at3-64.js').then(function(){return AT3ED.lade('pruefen','karte.js')}).then(function(){return AT3ED.lade('pruefen','pruefstand.js')})
   .then(function(){return AT3_PRUEF.aufbauen(z)}).catch(function(e){z.innerHTML='<p class="witz">Waage kaputt: '+String(e.message).replace(/</g,'&lt;')+'</p>'})};
});
