// WAS DIE DATEI TUT: Grafik-Arbeitsliste im Menü Grafik des AT3-Master-Editors (Schritt W2a3, AT3_WIRTSCHAFT.md 13.7). Liest kartei/arbeitsliste.json
// (erzeugt von tools/at3-arbeitsliste.cjs, Rechnung in arbeitsliste.js): Liste mit Filtern (Stand, Gruppe, Etappe, Wichtigkeit, Suche), Karte je Eintrag
// mit Stand je Ansicht, Grundbild, Varianten, Teilen, Maßen, Messung und Budget, Zeichenhinweis; Stand, Etappe, Wichtigkeit und Hinweis änderbar.
// „Nächstes Objekt“ öffnet das wichtigste noch nicht fertige mit Karte und First Person nebeneinander und auf Wunsch in der Skizzen-Werkstatt.
// Export: Datei fürs Repository (node tools/at3-arbeitsliste.cjs --aus <datei>) und Text für Zeichner. Objektdateien werden erst beim Öffnen einer Karte geholt.
var AT3_ARBEITSLISTE_MENUE=(function(){
'use strict';
var AL,S,E={L:[],f:{},zeig:60,geaendert:{},ohne:{}};
var esc=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')};
var AMPEL={gruen:'🟢',gelb:'🟡',rot:'🔴',keine:'⚪',veraltet:'⚪'};
function lade(f){return AT3ED.lade('grafik',f)}
function $(q){return E.el.querySelector(q)}
function aufbauen(el){E.el=el;el.innerHTML='<p class="leise">Die Liste wird aufgerollt …</p>';var t0=performance.now();
 return Promise.all(['at3-64.js','arbeitsliste.js'].map(lade)).then(function(){return lade('kartei/arbeitsliste.json')}).then(function(d){
  AL=window.AT3_ARBEITSLISTE;S=window.AT3_64;if(!d||d.format!=='at3-arbeitsliste')throw new Error('Format');E.d=d;E.L=d.eintraege;E.ms=performance.now()-t0;zeigen()})
  .catch(function(e){el.innerHTML='<p class="witz">Liste zerrissen: '+esc(e.message)+'</p>'})}
function opt(L,leer,wert){return '<option value="">'+leer+'</option>'+L.map(function(x){var v=x.push?x[0]:x,t=x.push?x[1]:x;return '<option value="'+esc(v)+'"'+(v===wert?' selected':'')+'>'+esc(t)+'</option>'}).join('')}
function zaehle(k){var n={};E.L.forEach(function(e){var v=k(e);n[v]=(n[v]||0)+1});return n}
function zeigen(){
 var st=zaehle(function(e){return e.stand});
 var h='<style>.alFilter{display:flex;flex-wrap:wrap;gap:6px 10px}.alFilter label{display:flex;flex-direction:column;font-size:.9em}.alZeile{cursor:pointer}.alZeile:hover{text-decoration:underline}'+
  '.alBilder{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}.alBilder figure{margin:0;text-align:center}.alBilder figcaption{font-size:.8em}.alKarte textarea{width:100%;min-height:5em;box-sizing:border-box}'+
  '.alKarte select{max-width:100%}.alAns{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:.9em}.alAns label{display:flex;gap:4px;align-items:center}</style>'+
  '<p>Jedes Bild, das es gibt oder geben soll, als Liste zum Abarbeiten: zuerst verbessern, was man am häufigsten sieht. Eine neue Fassung ersetzt die alte unter derselben Kennung und muss im Prüfstand neu gemessen werden. '+
  'Gebäude aus Teilen werden über ihre Teile besser. Gebäude, die nur in Städten stehen, brauchen kein Bild (Neuausrichtung N1); Ortsbilder warten auf den Reiter „Stadtbilder“ (N6a).</p>'+
  '<p class="leise">'+E.L.length+' Einträge · '+AL.STAND.map(function(s){return AL.STAND_DE[s]+' '+(st[s]||0)}).join(' · ')+' · geladen in '+Math.round(E.ms)+' ms</p>'+
  '<p><button class="knopf" id="alNext">Nächstes Objekt<small>das wichtigste noch nicht fertige, Karte und First Person nebeneinander</small></button></p><div id="alDetail"></div><div id="alWerk"></div>'+
  '<div class="alFilter"><label>Stand<select id="alStand">'+opt(AL.STAND.map(function(s){return[s,AL.STAND_DE[s]]}),'alle')+'</select></label>'+
  '<label>Gruppe<select id="alGruppe">'+opt(AL.GRUPPEN,'alle')+'</select></label><label>Etappe<select id="alEtappe">'+opt(AL.ETAPPEN,'alle')+'</select></label>'+
  '<label>Wichtigkeit<select id="alWichtig">'+opt([['5','nur 5'],['4','ab 4'],['3','ab 3'],['2','ab 2']],'alle')+'</select></label><label>Suche<input id="alText" placeholder="Kennung oder Name"></label></div>'+
  '<div id="alListe"></div>'+
  '<p><button class="knopf" id="alExport">Liste exportieren<small>Datei fürs Repository · node tools/at3-arbeitsliste.cjs --aus &lt;datei&gt;</small></button> '+
  '<button class="knopf" id="alText2">Als Text für Zeichner<small>wichtigstes zuerst, mit allen Angaben</small></button></p><p id="alMeld" class="leise"></p>';
 E.el.innerHTML=h;
 ['#alStand','#alGruppe','#alEtappe','#alWichtig'].forEach(function(q){$(q).onchange=liste});$('#alText').oninput=liste;
 $('#alNext').onclick=naechstes;$('#alExport').onclick=exportieren;$('#alText2').onclick=alsText;liste()}
function liste(){E.f={stand:$('#alStand').value,gruppe:$('#alGruppe').value,etappe:$('#alEtappe').value,wichtig:+$('#alWichtig').value||0,text:$('#alText').value.trim()};E.zeig=60;tabelle()}
function tabelle(){var L=AL.filtern(E.L,E.f).sort(function(a,b){return(AL.wichtig(b)-AL.wichtig(a))||(a.id<b.id?-1:1)}),T=L.slice(0,E.zeig);
 var h='<p class="leise">'+L.length+' passend'+(L.length>T.length?', gezeigt '+T.length:'')+'.</p><table class="tabelle"><tr><th>W</th><th>Objekt</th><th>Gruppe</th><th>Stand</th><th>Etappe</th><th>Messung</th></tr>'+
  T.map(function(e){var m=e.info&&e.info.messung;return '<tr class="alZeile" data-id="'+esc(e.id)+'"><td>'+AL.wichtig(e)+(e.wichtigHand?'✎':'')+'</td><td>'+esc(e.info.name)+'<br><small>'+esc(e.id)+'</small></td><td>'+esc(e.gruppe)+
   '</td><td>'+AL.STAND_DE[e.stand]+(E.geaendert[e.id]?' ✎':'')+'</td><td>'+esc(AL.etappe(e))+'</td><td>'+(m?AMPEL[m.ampel]||'':'')+'</td></tr>'}).join('')+'</table>'+
  (L.length>T.length?'<p><button class="knopf klein" id="alMehr">mehr zeigen</button></p>':'');
 $('#alListe').innerHTML=h;[].forEach.call(E.el.querySelectorAll('.alZeile'),function(r){r.onclick=function(){karte(r.dataset.id);$('#alDetail').scrollIntoView()}});
 if($('#alMehr'))$('#alMehr').onclick=function(){E.zeig+=100;tabelle()}}
function finde(id){for(var i=0;i<E.L.length;i++)if(E.L[i].id===id)return E.L[i];return null}
function naechstes(){var e=AL.naechstes(E.L,E.ohne);if(!e){$('#alDetail').innerHTML='<p class="witz">Alles fertig. Die Maler dürfen nach Hause. Oder in die Arena.</p>';return}karte(e.id,true)}
// Karte eines Eintrags: Angaben, Bearbeiten, Bilder (nur Kartei-Objekte, Datei erst jetzt geholt)
function karte(id,ausNaechstem){var e=finde(id),i=e.info||{},m=i.messung,ap=AL.vorschlag(e);E.akt=e;
 var h='<div class="alKarte"><h3>'+esc(i.name)+' <small class="leise">'+esc(e.id)+'</small></h3>';
 if(ausNaechstem)h+='<p class="leise">Wichtigstes noch nicht fertiges Objekt. <button class="knopf klein" id="alUeber">überspringen</button></p>';
 h+='<div class="alBilder" id="alBilder">'+(e.quelle==='kartei'||e.grundbild?'<span class="leise">Bilder werden geholt …</span>':'<span class="leise">Noch kein Bild'+(e.stand==='teile'?' (entsteht aus Teilen)':'')+'.</span>')+'</div>';
 h+='<p>Gruppe '+esc(e.gruppe)+' · Quelle '+({kartei:'Kartei',gebaeude:'geplantes Gebäude',ware:'geplante Ware',ort:'Welt außerhalb des Arena-Geländes (daten/ortsbilder.json)'})[e.quelle]+(e.wartet?' · <b>wartet auf '+esc(e.wartet)+'</b> (Werkzeug fehlt noch)':'')+(i.kat?' · Art '+esc(i.kat):'')+(i.status?' · Kartei-Status '+esc(i.status)+', Version '+i.version:'')+'</p>';
 if(i.w)h+='<p>Maße '+i.w+' × '+i.h+' Bildpunkte · Anker '+i.anker.join(', ')+(i.flaeche?' · Fläche '+i.flaeche.join(' × ')+' Felder':'')+' · '+esc(i.kollision)+'</p>';
 if(i.groesse)h+='<p>Größe '+esc(i.groesse)+' · Grundform '+esc(i.form)+(i.stufe?' · Stufe '+i.stufe:'')+(i.plan?' · '+esc(i.plan):'')+'</p>';
 if(i.genutzt)h+='<p class="leise">In '+i.genutzt+' geplanten Gebäuden verbaut.</p>';
 if(m)h+='<p>Letzte Messung: '+(AMPEL[m.ampel]||'')+' '+esc(m.ampel)+(m.datum?' ('+esc(m.datum)+')':'')+(m.datei?' · Datei '+m.datei+' B':'')+(m.karte?' · Karte '+m.karte.n+' Stück '+m.karte.ms+' ms':'')+(m.fp?' · First Person '+m.fp.n+' Stück '+m.fp.ms+' ms':'')+
  (m.soll?' · Budget „'+esc(m.budget)+'“: Datei '+m.soll.datei+' B'+(m.soll.karte?', Karte '+m.soll.karte+' ms':'')+(m.soll.fp?', First Person '+m.soll.fp+' ms':''):'')+'</p>';
 if(i.text)h+='<p><i>'+esc(i.text)+'</i></p>';
 if(e.grundbild)h+='<p>Grundbild: <a href="#" data-geh="'+esc(e.grundbild)+'">'+esc(e.grundbild)+'</a></p>';
 if(e.varianten)h+='<p>Varianten: '+e.varianten.map(function(v){return '<a href="#" data-geh="'+esc(v)+'">'+esc(v)+'</a>'}).join(', ')+'</p>';
 if(e.teile)h+='<p>Teile: '+e.teile.map(function(t){var k=t.replace('bk-*-','bk-lehm-');return '<a href="#" data-geh="'+esc(k)+'">'+esc(t)+'</a>'}).join(', ')+'</p>';
 h+='<div class="alFilter"><label>Stand<select id="alS">'+AL.STAND.map(function(s){return '<option value="'+s+'"'+(s===e.stand?' selected':'')+(s==='fehlt'||s==='teile'||s==='keinbild'?' disabled':'')+'>'+AL.STAND_DE[s]+'</option>'}).join('')+'</select></label>'+
  '<label>Etappe<select id="alE">'+AL.ETAPPEN.map(function(s){return '<option'+(s===AL.etappe(e)?' selected':'')+'>'+s+'</option>'}).join('')+'</select></label>'+
  '<label>Wichtigkeit<select id="alW"><option value="">geschätzt: '+e.wichtigAuto+'</option>'+[1,2,3,4,5].map(function(n){return '<option value="'+n+'"'+(n===e.wichtigHand?' selected':'')+'>'+n+' (von Hand)</option>'}).join('')+'</select></label></div>';
 if(e.ansichten)h+='<p>Ansichten:</p><div class="alAns">'+Object.keys(e.ansichten).map(function(k){return '<label>'+esc(AL.ansichtName(k))+' <select data-ans="'+k+'">'+AL.ANSICHT_STAND.map(function(s){return '<option value="'+s+'"'+(s===e.ansichten[k]?' selected':'')+'>'+({auto:'automatisch',skizze:'Skizze',ueberarbeitet:'überarbeitet',fertig:'fertig'})[s]+'</option>'}).join('')+'</select></label>'}).join('')+'</div>';
 h+='<p>Zeichenhinweis'+(e.hinweis?'':' <span class="leise">(Vorschlag, einfach überschreiben)</span>')+':</p><textarea id="alH" placeholder="'+esc(ap)+'">'+esc(e.hinweis||ap)+'</textarea>';
 if(e.stand!=='teile'||e.grundbild)h+='<p><button class="knopf" id="alWerkst">In der Skizzen-Werkstatt öffnen<small>'+(e.quelle==='kartei'||e.grundbild?'vorhandenes Bild':'neues Blatt mit Kennung und Name')+'</small></button></p>';
 h+='</div>';$('#alDetail').innerHTML=h;
 [].forEach.call(E.el.querySelectorAll('[data-geh]'),function(a){a.onclick=function(ev){ev.preventDefault();if(finde(a.dataset.geh))karte(a.dataset.geh)}});
 if($('#alUeber'))$('#alUeber').onclick=function(){E.ohne[e.id]=1;naechstes()};
 $('#alS').onchange=function(){e.stand=this.value;mark(e)};$('#alE').onchange=function(){if(this.value===e.etappe)delete e.etappeHand;else e.etappeHand=this.value;mark(e)};
 $('#alW').onchange=function(){if(this.value)e.wichtigHand=+this.value;else delete e.wichtigHand;mark(e)};
 [].forEach.call(E.el.querySelectorAll('[data-ans]'),function(s){s.onchange=function(){e.ansichten[s.dataset.ans]=s.value;mark(e)}});
 $('#alH').onchange=function(){var v=this.value.trim();if(!v||v===ap)delete e.hinweis;else e.hinweis=v;mark(e)};
 if($('#alWerkst'))$('#alWerkst').onclick=function(){werkstatt(e)};
 bilder(e)}
function mark(e){E.geaendert[e.id]=1;var n=Object.keys(E.geaendert).length;$('#alMeld').textContent=n+' Eintr'+(n===1?'ag':'äge')+' geändert. „Liste exportieren“ und ins Repository legen, sonst ist es nach dem Neuladen weg wie ein Rekrut nach dem ersten Kampf.';tabelle()}
function bildCanvas(b,k){var cv=S.zuCanvas(b,S.PALETTE),w=document.createElement('canvas');w.width=cv.width;w.height=cv.height;w.getContext('2d').drawImage(cv,0,0);w.className='pixel';
 w.style.width=(cv.width*k)+'px';w.style.height=(cv.height*k)+'px';return w}
function bilder(e){var id=e.quelle==='kartei'?e.id:e.grundbild,z=$('#alBilder');if(!id)return;var k=(AT3ED.kartei()&&AT3ED.kartei().objekte||[]).filter(function(x){return x.id===id})[0];
 if(!k){z.innerHTML='<span class="witz">„'+esc(id)+'“ nicht in der Kartei.</span>';return}
 lade('kartei/'+k.datei).then(function(o){if(E.akt!==e)return;z.innerHTML='';var f=o.kat==='boden'?3:o.bild.h>120?1:2;
  var fig=function(b,t){var x=document.createElement('figure');x.appendChild(bildCanvas(b,f));var c=document.createElement('figcaption');c.textContent=t;x.appendChild(c);z.appendChild(x)};
  fig(o.bild,'Karte');var n=o.kat==='boden'?null:S.fpBild(o,'nah');if(n)fig(n,'First Person nah'+(o.fp.nah.z?'':' (= Karte)'));
  else if(o.kat==='boden')z.insertAdjacentHTML('beforeend','<figure><div style="width:96px;height:64px;background:'+S.PALETTEN[S.PALETTE].farben[o.fp&&o.fp.farbe||0]+'"></div><figcaption>First Person (Farbfläche)</figcaption></figure>')},
  function(er){z.innerHTML='<span class="witz">Bild nicht geladen: '+esc(er.message)+'</span>'})}
function werkstatt(e){var z=$('#alWerk');z.innerHTML='<p class="leise">Die Werkstatt wird aufgeschlossen …</p>';
 lade('menue/werkstatt.js').then(function(){window.AT3_WERKSTATT.aufbauen(z);var W=window.AT3_WERKSTATT,id=e.quelle==='kartei'?e.id:e.grundbild;
  if(id)W.oeffne(id);else W.neuMit(e.id,e.info.name,e.quelle==='ware'?'ware':null);z.scrollIntoView()},function(er){z.innerHTML='<p class="witz">Werkstatt klemmt: '+esc(er.message)+'</p>'})}
function herunter(text,name,typ){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:typ}));a.download=name;document.body.appendChild(a);a.click();
 setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)}
function exportieren(){herunter(AL.alsText(AL.datei(E.L,E.d.stand)),'arbeitsliste.json','application/json');
 $('#alMeld').textContent='Datei „arbeitsliste.json“ ausgegeben. Im Repository: node tools/at3-arbeitsliste.cjs --aus <datei>, oder in den Chat geben.'}
function alsText(){herunter(AL.alsMarkdown(E.L),'grafik-arbeitsliste.md','text/markdown');$('#alMeld').textContent='Text „grafik-arbeitsliste.md“ ausgegeben, wichtigstes zuerst.'}
return{aufbauen:aufbauen,E:E};
})();
