// WAS DIE DATEI TUT: Menü „Prüfen & Kosten“ des AT3-Master-Editors (wird erst beim Öffnen geladen). M1: Startlast dieses Editors.
// G2: Knopf „Kernprobe“ lädt kernstart.js und menue/kernprobe.js erst beim Antippen (Gleichheit bei 0/1/2/4 Helferkernen, Uhr, Volllast).
// MK1: Knopf „Riesenwelt-Probe“ lädt kernstart.js und menue/riesenwelt.js erst beim Antippen (Laststufen 10 bis 10.000 Nationen, Weltgröße, Helferkerne, Dauerlauf).
// G6b: Link „Wegprobe“ öffnet das Spiel ohne Spielstand (Werkzeug Path in der Bauleiste).
// FP2b: Links „Bauprobe First Person“ öffnen das Spiel mit ?nosave&bauprobe=50/200 im neuen Tab (Messung Bauteile First Person mit vielen Häusern).
// M6: Knopf öffnet den Prüfstand (pruefstand.js mit at3-64.js und karte.js, erst beim Antippen geladen): Ampel, Status, Lastszene, Messung, Übernahme.
AT3ED.menue('pruefen',function(el){
 var L=AT3ED.last(),s=L.start;
 el.innerHTML='<p>Was zu teuer ist, kommt nicht ins Spiel. Hier wird gewogen, nicht verhandelt.</p>'+
  (s?'<p class="leise">Startlast dieses Editors: '+s.n+' Dateien, '+(s.b/1024).toFixed(1).replace('.',',')+' KB übertragen, bereit nach '+Math.round(s.ms)+' ms, Fremddateien: '+s.fremd.length+'. Ziel: höchstens 1 MiB.</p>':'')+
  '<p><button class="knopf" id="pAuf">Prüfstand<small>Ampel · Status · Lastszene · Messung · Übernahme</small></button></p>'+
  '<p><button class="knopf" id="pKern">Kernprobe<small>Gleichheit bei 1, 2, 4 Kernen · Uhr · Volllast</small></button></p>'+
  '<p><button class="knopf" id="pRiesen">Riesenwelt-Probe<small>10 bis 10.000 Nationen · Welt 307.200² · Helferkerne · 30 Minuten Dauerlauf</small></button></p>'+
  '<p><a class="knopf" href="index.html?nosave&amp;bauprobe=50" target="_blank" rel="noopener">Bauprobe First Person · 50 Häuser<small>Spiel ohne Spielstand, Teststadt um den Startort · dann First person und „Load &amp; budgets“</small></a> '+
  '<a class="knopf" href="index.html?nosave&amp;bauprobe=200" target="_blank" rel="noopener">Bauprobe · 200 Häuser<small>dasselbe mit voller Stadt · Budget: Bild p95 ≤ 33,3 ms</small></a></p>'+
  '<p><a class="knopf" href="index.html?nosave&amp;warenprobe" target="_blank" rel="noopener">Warenprobe (G7)<small>Spiel ohne Spielstand · 5 Arbeiter bauen ein Lager, dann Werkstatt und zweites Lager mit Material aus dem Startvorrat · Goods öffnen, Arbeiter antippen</small></a></p>'+
  '<p><a class="knopf" href="index.html?nosave&amp;karrenprobe" target="_blank" rel="noopener">Karrenprobe (G6c2)<small>Spiel ohne Spielstand · baut an der nächsten Weltstraße eine 1 Feld breite Gasse, einen Platz und 4 Lager mit Tor · Gegenverkehr, Warten vor Engstellen, Ausweichen · Karren antippen zeigt Zustand und Grund</small></a></p>'+
  '<p><a class="knopf" href="index.html?nosave" target="_blank" rel="noopener">Wegprobe (G6b)<small>Spiel ohne Spielstand · Build → Tools → Path (feet) oder Path (cart): Start und Ziel antippen · zeigt Weg, Rechenzeit, Felder und Helferkerne</small></a></p>'+
  '<div id="pInhalt"></div>';
 el.querySelector('#pAuf').onclick=function(){var z=el.querySelector('#pInhalt');z.innerHTML='<p class="leise">Die Waage wird geeicht … mit einer toten Ratte als Gegengewicht.</p>';
  AT3ED.lade('pruefen','at3-64.js').then(function(){return AT3ED.lade('pruefen','karte.js')}).then(function(){return AT3ED.lade('pruefen','pruefstand.js')})
   .then(function(){return AT3_PRUEF.aufbauen(z)}).catch(function(e){z.innerHTML='<p class="witz">Waage kaputt: '+String(e.message).replace(/</g,'&lt;')+'</p>'})};
 el.querySelector('#pKern').onclick=function(){var z=el.querySelector('#pInhalt');z.innerHTML='<p class="leise">Die Knechte werden durchgezählt … einer fehlt immer.</p>';
  AT3ED.lade('pruefen','kernstart.js').then(function(){return AT3ED.lade('pruefen','menue/kernprobe.js')})
   .then(function(){return AT3_KERNPROBE.aufbauen(z)}).catch(function(e){z.innerHTML='<p class="witz">Kerne verloren: '+String(e.message).replace(/</g,'&lt;')+'</p>'})};
 el.querySelector('#pRiesen').onclick=function(){var z=el.querySelector('#pInhalt');z.innerHTML='<p class="leise">Die Erde wird ausgerollt … bitte nicht auf den Rand treten.</p>';
  AT3ED.lade('pruefen','kernstart.js').then(function(){return AT3ED.lade('pruefen','menue/riesenwelt.js')})
   .then(function(){return AT3_RIESEN.aufbauen(z)}).catch(function(e){z.innerHTML='<p class="witz">Welt verlegt: '+String(e.message).replace(/</g,'&lt;')+'</p>'})};
});
