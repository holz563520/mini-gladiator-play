// WAS DIE DATEI TUT: Menü „Völker & Glaube“ des AT3-Master-Editors (Schritt N4a). Zeigt die 24 Kulturkreise aus daten/kulturen.json und die 12 Religionen aus
// daten/religionen.json, den Vergleich nach Prüfliste 4.5 (Namen, Sprüche und Werte nebeneinander, Ausreißer markiert) und den Prüfer (voelker.js).
// Freigabe je Eintrag per Häkchen; „Als Datei speichern“ gibt die Tabellen fürs Repository aus. Nichts wird im Browser dauerhaft gespeichert.
// Später kommen hier die Herrschaften dazu (N4c).
AT3ED.menue('voelker',function(el){
 el.innerHTML='<p class="leise">Wird geholt … die Chronisten streiten noch, wer zuerst da war.</p>';
 var D={},Q=['kulturen','religionen','ortsbilder','waren','systeme'];
 Promise.all([AT3ED.lade('voelker','voelker.js'),AT3ED.lade('voelker','at3-64.js')].concat(Q.map(function(q){return AT3ED.lade('voelker','daten/'+q+'.json')}))).then(function(r){
  Q.forEach(function(q,i){D[q]=r[i+2]});
  var K=JSON.parse(JSON.stringify(D.kulturen)),R=JSON.parse(JSON.stringify(D.religionen)),geaendert={kulturen:false,religionen:false},ansicht='kulturen';
  var V=window.AT3VOELKER,PAL=AT3_64.PALETTEN[AT3_64.PALETTE].farben;
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function nach(L,id){for(var i=0;i<(L||[]).length;i++)if(L[i].id===id)return L[i];return null}
  function de(L,id){var x=nach(L,id);return x?esc(x.de||x.en||x.name):'<span class="witz">'+esc(id)+'?</span>'}
  function ctx(){return{waren:D.waren.waren.map(function(w){return w.id}),systeme:D.systeme.systeme.map(function(s){return s.id}),
   baustile:D.ortsbilder.baustile.map(function(b){return b.id}),hauptstaedte:D.ortsbilder.hauptstaedte.zahl,farben:PAL.length}}
  function ware(id){var w=nach(D.waren.waren,id);return w?esc(w.name||w.en||id):'<span class="witz">'+esc(id)+'?</span>'}
  function frei(x,art){return '<label style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox" data-frei="'+art+':'+esc(x.id)+'"'+(x.frei?' checked':'')+
   ' style="width:24px;height:24px"> freigegeben</label>'}
  function kultur(k){var B=nach(D.ortsbilder.baustile,k.baustil),Rl=nach(R.religionen,k.religion),kl=k.klang||{};
   var beispiel=[(kl.vorn||[])[0]+(kl.dorf||[])[0],(kl.vorn||[])[1]+(kl.stadt||[])[0],(kl.vorn||[])[2]+(kl.hafen||[])[0]].join(' · ');
   return '<div style="border-top:2px solid var(--rand);padding:6px 0"><h3 style="margin:0">'+k.nr+'. '+esc(k.en)+'</h3><p style="margin:2px 0"><i>'+esc(k.spruch)+'</i></p>'+
    '<p class="leise" style="margin:2px 0">'+esc(k.de)+'</p><table class="tabelle">'+
    '<tr><th>Heimat</th><td>'+(k.heimat||[]).map(function(z){return de(K.zonen,z)}).join(', ')+' · Lage: '+de(K.lagen,k.lage)+'</td></tr>'+
    '<tr><th>System</th><td>'+esc((nach(D.systeme.systeme,k.system)||{}).name||k.system)+(k.hauptstadt?' · mit Hauptstadt':' · ohne Hauptstadt')+'</td></tr>'+
    '<tr><th>Baustil</th><td>'+(B?esc(B.en)+' <span class="leise">('+esc(B.de)+')</span>':'<span class="witz">'+esc(k.baustil)+'?</span>')+'</td></tr>'+
    '<tr><th>Religion</th><td>'+(Rl?esc(Rl.en):'<span class="witz">'+esc(k.religion)+'?</span>')+'</td></tr>'+
    '<tr><th>Kleider</th><td>'+(k.kleider||[]).map(function(c){return '<i title="Farbe '+c+'" style="display:inline-block;width:28px;height:18px;border:1px solid var(--rand);background:'+esc(PAL[c]||'#f0f')+'"></i>'}).join(' ')+'</td></tr>'+
    '<tr><th>Namensklang</th><td>'+esc(beispiel)+' <span class="leise">(Beispiele, Namen kommen mit N5b)</span></td></tr>'+
    '<tr><th>Waren</th><td>'+(k.waren||[]).map(ware).join(', ')+'</td></tr>'+
    '<tr><th>Werte</th><td>'+V.WERTE.map(function(w){var x=nach(K.werte,w);return esc(x?x.de:w)+' '+((k.werte||{})[w]||'–')}).join(' · ')+'</td></tr>'+
    '<tr><th>Kämpfe</th><td>'+(k.kaempfe||[]).map(function(x){return de(K.kaempfe,x)}).join(', ')+'</td></tr></table>'+frei(k,'k')+'</div>'}
  function religion(r){var wer=K.kulturkreise.filter(function(k){return k.religion===r.id}).map(function(k){return esc(k.en)});
   return '<div style="border-top:2px solid var(--rand);padding:6px 0"><h3 style="margin:0">'+esc(r.en)+'</h3><p style="margin:2px 0"><i>'+esc(r.spruch)+'</i></p>'+
    '<p class="leise" style="margin:2px 0">'+esc(r.de)+' · Vorbild: '+esc(r.vorbild)+'</p><table class="tabelle">'+
    '<tr><th>Arena</th><td><i>'+esc(r.arena)+'</i></td></tr>'+
    '<tr><th>Götter</th><td>'+(r.goetter||[]).map(function(g){return esc(g.en)+' <span class="leise">('+esc(g.amt)+')</span>'}).join('<br>')+'</td></tr>'+
    '<tr><th>Priester</th><td>'+esc((r.priester||[]).join(', '))+'</td></tr>'+
    '<tr><th>Geschäfte</th><td>'+esc((r.geschaefte||[]).join(', '))+'</td></tr>'+
    '<tr><th>Feiertage</th><td>'+(r.feiertage||[]).map(function(f){return esc(f.en)+' <span class="leise">('+esc(f.wann)+')</span>'}).join('<br>')+'</td></tr>'+
    '<tr><th>Heimat</th><td>'+(r.heimat||[]).map(function(z){return de(K.zonen,z)}).join(', ')+'</td></tr>'+
    '<tr><th>Gläubige</th><td>'+(wer.length?wer.join(', '):'<span class="witz">niemand</span>')+'</td></tr></table>'+frei(r,'r')+'</div>'}
  function vergleich(){var vk=V.vergleich(K.kulturkreise),vr=V.vergleich(R.religionen);
   function zeile(x,v){return '<tr><td>'+esc(x.en)+'</td><td><i>'+esc(x.spruch)+(x.arena?' / '+esc(x.arena):'')+'</i></td><td>'+v.woerter+'</td>'+
    (v.werte!=null?'<td>'+v.werte+'</td>':'<td>–</td>')+'<td'+(v.auffaellig.length?' class="witz"':' class="leise"')+'>'+(v.auffaellig.length?esc(v.auffaellig.join('; ')):'ausgewogen')+'</td></tr>'}
   return '<p>Prüfliste 4.5: Spott trifft Ämter, Geschäfte, Klima, Bauwerke und Geschichte, nie Aussehen, Hautfarbe oder Abstammung. Kein Volk ist ein heutiges Volk. '+
    'Jede Kultur bekommt gleich viel Witz und gleich viel Würde. Im Zweifel umschreiben. Markiert wird, was deutlich von der Mitte abweicht.</p>'+
    '<h3>Kulturen</h3><table class="tabelle"><tr><th>Name</th><th>Spruch</th><th>Wörter</th><th>Werte</th><th>Vergleich</th></tr>'+K.kulturkreise.map(function(k,i){return zeile(k,vk[i])}).join('')+'</table>'+
    '<h3>Religionen</h3><table class="tabelle"><tr><th>Name</th><th>Spruch / Arena</th><th>Wörter</th><th>Werte</th><th>Vergleich</th></tr>'+R.religionen.map(function(r,i){return zeile(r,vr[i])}).join('')+'</table>'}
  function pruefer(){var t=performance.now(),P=V.pruefen(K,R,ctx()),ms=performance.now()-t;
   return '<p>'+P.zahlen.kulturen+' Kulturen · '+P.zahlen.religionen+' Religionen · '+P.zahlen.hauptstaedte+' Hauptstädte · geprüft in '+ms.toFixed(1).replace('.',',')+' ms</p>'+
    (P.fehler.length?'<p class="witz">'+P.fehler.length+' Fehler:</p><ul>'+P.fehler.map(function(x){return '<li>'+esc(x.id)+': '+esc(x.text)+'</li>'}).join('')+'</ul>':
     '<p style="color:var(--gut)">Keine Fehler. Jede Landzone hat ein Volk, jede Religion Gläubige, kein verbotenes Wort.</p>')+
    (P.hinweise.length?'<p>'+P.hinweise.length+' Hinweise:</p><ul>'+P.hinweise.map(function(x){return '<li>'+esc(x.id)+': '+esc(x.text)+'</li>'}).join('')+'</ul>':'')+
    '<p class="leise">Verbotene Wörter ('+K.verboten.length+'): '+esc(K.verboten.join(', '))+'</p>'}
  function speichern(name,d){var b=new Blob([V.alsText(d)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name+'.json';
   document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},0)}
  function zeichne(){var A=[['kulturen','Kulturen',K.kulturkreise.length],['religionen','Religionen',R.religionen.length],['vergleich','Vergleich 4.5'],['pruefer','Prüfer']];
   var h='<p>'+A.map(function(a){return '<button class="knopf klein'+(a[0]===ansicht?' an':'')+'" data-ansicht="'+a[0]+'">'+a[1]+(a[2]?' ('+a[2]+')':'')+'</button>'}).join(' ')+'</p>';
   h+=ansicht==='kulturen'?K.kulturkreise.map(kultur).join(''):ansicht==='religionen'?R.religionen.map(religion).join(''):ansicht==='vergleich'?vergleich():pruefer();
   h+='<p><button class="knopf" id="vKSpeichern">Kulturen als Datei speichern<small>kulturen.json fürs Repository'+(geaendert.kulturen?' · geändert':'')+'</small></button> '+
    '<button class="knopf" id="vRSpeichern">Religionen als Datei speichern<small>religionen.json fürs Repository'+(geaendert.religionen?' · geändert':'')+'</small></button> '+
    '<button class="knopf" id="vZurueck">Zurücksetzen</button></p>';
   el.innerHTML=h;
   [].forEach.call(el.querySelectorAll('[data-ansicht]'),function(b){b.onclick=function(){ansicht=b.dataset.ansicht;zeichne()}});
   [].forEach.call(el.querySelectorAll('[data-frei]'),function(c){c.onchange=function(){var p=c.dataset.frei.split(':'),L=p[0]==='k'?K.kulturkreise:R.religionen,x=nach(L,p[1]);
    if(x){x.frei=c.checked;geaendert[p[0]==='k'?'kulturen':'religionen']=true;zeichne()}}});
   el.querySelector('#vKSpeichern').onclick=function(){speichern('kulturen',K)};el.querySelector('#vRSpeichern').onclick=function(){speichern('religionen',R)};
   el.querySelector('#vZurueck').onclick=function(){K=JSON.parse(JSON.stringify(D.kulturen));R=JSON.parse(JSON.stringify(D.religionen));geaendert={kulturen:false,religionen:false};zeichne()}}
  zeichne();
 }).catch(function(e){el.innerHTML='<p class="witz">Völkertafel nicht lesbar: '+String(e.message).replace(/</g,'&lt;')+'</p>'})});
