// WAS DIE DATEI TUT: Menü „Welt & Bau“ des AT3-Master-Editors (wird erst beim Öffnen geladen). M1: nur Gliederung, Inhalt kommt mit G4, G5.
// W1a: Knopf „Weltansicht“ lädt kernstart.js, at3-64.js und menue/weltansicht.js erst beim Antippen (Welt aus Seed: Erde, Region, Kartenstücke, seit W1b mit Orten, Straßen, Häfen und Seewegen, Messung).
AT3ED.menue('welt',function(el){
 el.innerHTML='<p>Noch keine Stadt. Aber schon eine ganze Erde, auf der man eine hinstellen und wieder abbrennen kann.</p>'+
  '<p><button class="knopf" id="wAnsicht">Weltansicht<small>Welt aus Seed · Erde, Region, Kartenstücke · Biome, Höhe, Flüsse · Orte, Straßen, Häfen, Seewege · Messung</small></button></p>'+
  '<ul><li>Geländeprobe <span class="leise">(G4)</span></li><li>Bauvorschau, Raumhülle, Kollision <span class="leise">(G5)</span></li></ul>'+
  '<div id="wInhalt"></div>';
 el.querySelector('#wAnsicht').onclick=function(){var z=el.querySelector('#wInhalt');z.innerHTML='<p class="leise">Die Erde wird geknetet … der Ton ist noch feucht.</p>';
  AT3ED.lade('welt','kernstart.js').then(function(){return AT3ED.lade('welt','at3-64.js')}).then(function(){return AT3ED.lade('welt','menue/weltansicht.js')})
   .then(function(){return AT3_WELTANSICHT.aufbauen(z)}).catch(function(e){z.innerHTML='<p class="witz">Welt verlegt: '+String(e.message).replace(/</g,'&lt;')+'</p>'})};
});
