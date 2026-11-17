// WAS DIE DATEI TUT: Menü „Tätigkeiten“ des AT3-Master-Editors (G8, Regel 19). Zeigt jede Tätigkeit jedes Gebäudes und jeder Rolle aus daten/taetigkeiten.json:
// (1) genutzte Fähigkeiten mit Faktor (welcher Teil des Ergebnisses davon abhängt, zusammen 100 %), (2) trainierte Fähigkeiten und Körperwerte mit Intensität
// (1 wenig, 2 mittel, 3 viel; immer mehrere). Werte sind hier änderbar; „Als Datei speichern“ gibt die geänderte Tabelle fürs Repository aus
// (dist/at3/daten/taetigkeiten.json ersetzen). Das Spiel liest nur diese Tabelle. Nichts wird im Browser dauerhaft gespeichert.
AT3ED.menue('taetigkeiten',function(el){
 el.innerHTML='<p class="leise">Wird geholt … der Vorarbeiter sucht noch seine Liste.</p>';
 AT3ED.lade('taetigkeiten','daten/taetigkeiten.json').then(function(d0){var d=JSON.parse(JSON.stringify(d0)),geaendert=false;
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function wname(k){var w=d.werte[k];return w?w.de+(w.von==='1.0'?' <span class="leise">(1.0)</span>':w.von==='neu'?' <span class="leise">(neu)</span>':''):esc(k)}
  function wahl(k){return '<select>'+Object.keys(d.werte).map(function(x){return '<option value="'+x+'"'+(x===k?' selected':'')+'>'+esc(d.werte[x].de)+'</option>'}).join('')+'</select>'}
  function zeichne(){var h='<p>Jede Tätigkeit nutzt mehrere Fähigkeiten (<b>Faktor</b>: Anteil am Ergebnis, zusammen 100 %) und trainiert mehrere Werte (<b>Intensität</b> 1 wenig · 2 mittel · 3 viel). '+
    'Ab G8 gezählt, wirksam mit den Gladiatorenwerten aus 1.0 (G9). Wer nichts tut, trainiert nur das Nichtstun.</p>';
   d.taetigkeiten.forEach(function(t,ti){var sum=t.nutzt.reduce(function(a,n){return a+n[1]},0);
    h+='<h3>'+esc(t.de)+' <span class="leise">· '+esc(t.wo)+'</span></h3><table data-t="'+ti+'"><tr><th>Genutzt</th><th>Faktor %</th><th>wofür</th></tr>';
    t.nutzt.forEach(function(n,i){h+='<tr data-n="'+i+'"><td>'+wahl(n[0])+'</td><td><input type="number" min="0" max="100" step="5" value="'+n[1]+'" style="width:4.5em"></td><td>'+esc(n[2]||'')+'</td></tr>'});
    h+='<tr><td colspan="3" class="'+(sum===100?'leise':'schlecht')+'">Summe '+sum+' %'+(sum===100?'':' – sollte 100 sein')+'</td></tr>';
    h+='<tr><th>Trainiert</th><th>Intensität</th><th></th></tr>';
    t.trainiert.forEach(function(n,i){h+='<tr data-r="'+i+'"><td>'+wahl(n[0])+'</td><td><select>'+[1,2,3].map(function(v){return '<option value="'+v+'"'+(v===n[1]?' selected':'')+'>'+v+' '+d.intensitaet[v]+'</option>'}).join('')+'</select></td><td><button class="knopf klein" data-weg>✕</button></td></tr>'});
    h+='<tr><td colspan="3"><button class="knopf klein" data-dazu>+ Wert trainieren</button>'+(t.trainiert.length<2?' <span class="schlecht">Immer mehrere Werte trainieren.</span>':'')+'</td></tr></table>'});
   h+='<p><button class="knopf" id="tSpeichern">Als Datei speichern<small>taetigkeiten.json fürs Repository'+(geaendert?' · geändert':'')+'</small></button> <button class="knopf" id="tZurueck">Zurücksetzen</button></p>';
   h+='<h3>Werte</h3><p class="leise">'+Object.keys(d.werte).map(function(k){return wname(k)}).join(' · ')+'</p>';
   el.innerHTML=h;
   [].forEach.call(el.querySelectorAll('table[data-t]'),function(tb){var t=d.taetigkeiten[+tb.dataset.t];
    [].forEach.call(tb.querySelectorAll('tr[data-n]'),function(tr){var n=t.nutzt[+tr.dataset.n];tr.querySelector('select').onchange=function(e){n[0]=e.target.value;geaendert=true;zeichne()};
     tr.querySelector('input').onchange=function(e){var v=Math.max(0,Math.min(100,Math.round(+e.target.value||0)));n[1]=v;geaendert=true;zeichne()}});
    [].forEach.call(tb.querySelectorAll('tr[data-r]'),function(tr){var i=+tr.dataset.r,n=t.trainiert[i],s=tr.querySelectorAll('select');s[0].onchange=function(e){n[0]=e.target.value;geaendert=true;zeichne()};
     s[1].onchange=function(e){n[1]=+e.target.value;geaendert=true;zeichne()};tr.querySelector('[data-weg]').onclick=function(){t.trainiert.splice(i,1);geaendert=true;zeichne()}});
    tb.querySelector('[data-dazu]').onclick=function(){t.trainiert.push(['stamina',1]);geaendert=true;zeichne()}});
   el.querySelector('#tSpeichern').onclick=function(){var b=new Blob([JSON.stringify(d,null,1)+'\n'],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='taetigkeiten.json';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000)};
   el.querySelector('#tZurueck').onclick=function(){d=JSON.parse(JSON.stringify(d0));geaendert=false;zeichne()}}
  zeichne()}).catch(function(e){el.innerHTML='<p class="witz">Tabelle nicht lesbar: '+String(e.message).replace(/</g,'&lt;')+'</p>'})});
