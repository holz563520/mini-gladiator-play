// WAS DIE DATEI TUT: Gebäudebaukasten im Menü Grafik des AT3-Master-Editors (Schritt W2a2, Thomas 18.11.2026). Gebäude aus Teilen (baukasten.js):
// · Musterbeispiele: 9 Grundformen × 3 Bauklassen = 27, Kartenansicht und First Person nebeneinander (um das Gebäude herumgehen, 8 Seiten), Messung je Muster.
// · Werkzeug: Form, Größe (Grenzen aus daten/masse.json), Bauklasse, Kultur-Schalter (Dachform, Dach- und Wandfarbe, Kürzel). „Teile in die Kartei legen“
//   gibt die Teile einer Kultur als Datei fürs Repository aus (node tools/at3-baukasten.cjs --aus <datei>); die Grundkultur liegt schon in der Kartei.
// · Teile der Bauklasse mit Status aus der Kartei (gemessen und übernommen wird im Prüfstand, Menü Prüfen & Kosten).
// Alles auf Knopfdruck auf dem Hauptkern (ein Gebäude setzt sich in wenigen ms zusammen); nichts davon lädt das Spiel.
var AT3_BAUKASTEN_MENUE=(function(){
'use strict';
var S,BK,FP,E={wahl:{form:'werkstatt',klasse:'brick'},seite:1,kult:null,stufe:1};
var esc=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')};
var FORM_DE={winzig:'winzig',klein:'klein',werkstatt:'Werkstatt',halle:'Halle',hof:'Hof mit Feldern',lang:'lang',gross:'groß',rund:'rund',bahn:'Bahn'};
var DINGE=['figur-arbeiter','boden-gras','boden-sand','werk-bank','lager-platz','markt-stand','ware-bretter','ware-stamm','ware-fleisch'];
function lade(f){return AT3ED.lade('grafik',f)}
// Reiter (N6a, 21.11.2026): „Gebäude“ (alles wie bisher) und „Stadtbilder“ (menue/stadtbilder.js, erst beim ersten Antippen geladen)
function aufbauen(el){
 el.innerHTML='<div class="bkKnoepfe" id="bkReiter"><button class="knopf klein an" data-reiter="geb">Gebäude</button><button class="knopf klein" data-reiter="stadt">Stadtbilder (N6a)<small>Orte aus Bauplan und Teilen</small></button></div>'+
  '<div id="bkReiterGeb"></div><div id="bkReiterStadt" hidden></div>';
 var geb=el.querySelector('#bkReiterGeb'),st=el.querySelector('#bkReiterStadt'),offen=false;
 [].forEach.call(el.querySelectorAll('[data-reiter]'),function(b){b.onclick=function(){var s=b.dataset.reiter==='stadt';
  [].forEach.call(el.querySelectorAll('[data-reiter]'),function(x){x.classList.toggle('an',x===b)});geb.hidden=s;st.hidden=!s;
  if(s&&!offen){offen=true;st.innerHTML='<p class="leise">Die Stadtväter werden aus dem Bett geklopft …</p>';
   lade('menue/stadtbilder.js').then(function(){return AT3_STADTBILDER_MENUE.aufbauen(st)}).catch(function(e){offen=false;st.innerHTML='<p class="witz">Stadt abgebrannt: '+esc(e.message)+'</p>'})}}});
 return gebaeude(geb)}
function gebaeude(el){
 el.innerHTML='<p class="leise">Ziegel werden gebrannt …</p>';
 return Promise.all(['at3-64.js','baubild.js','fp.js'].map(lade)).then(function(){return lade('baukasten.js')}).then(function(){
  S=window.AT3_64;BK=window.AT3_BAUKASTEN;FP=window.AT3_FP;
  var ids=DINGE.concat(['bk-feld']);BK.KLASSEN.forEach(function(k){BK.TEILE.forEach(function(t){ids.push(BK.kennung(k.id,t,''))})});
  return Promise.all([lade('daten/masse.json'),lade('kartei/budgets.json')].concat(ids.map(function(id){return lade('kartei/obj/'+id+'.json').catch(function(){return null})})))
   .then(function(r){E.masse=r[0];E.budgets=r[1];E.obj={};r.slice(2).forEach(function(o,i){if(o)E.obj[ids[i]]=o});zeigen(el)})})
  .catch(function(e){el.innerHTML='<p class="witz">Baukasten eingestürzt: '+esc(e.message)+'</p>'})}
function zeigen(el){
 var h='<style>.bkKnoepfe{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0}.bkAnsichten{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start}.bkKarte{flex:1 1 360px;min-width:0;overflow-x:auto}'+
  '.bkFp canvas{width:320px;max-width:100%}.bkForm{display:flex;flex-wrap:wrap;gap:6px 12px}.bkForm label{display:flex;flex-direction:column;font-size:.9em}.bkForm input{width:6em}'+
  '.bkTeile{display:flex;flex-wrap:wrap;gap:8px}.bkTeil{display:flex;flex-direction:column;align-items:center;max-width:140px}.bkTeil small{font-size:.75em;word-break:break-all;text-align:center}</style>'+
  '<p>Gebäude entstehen aus wenigen Teilen je Bauklasse (Wand, Tür, Giebel, Dachplatten, Boden, Ränge, Schild). Jedes Teil ist ein eigenes Objekt der Kartei mit beiden Ansichten; ein Gebäude jeder Größe wird daraus ins Bodenbild gesetzt. Kein Palast braucht ein eigenes Riesenbild, nur sehr viele Sklaven.</p>';
 h+='<h3>Musterbeispiele <span class="leise">(je Grundform und Bauklasse eins)</span></h3><div class="bkKnoepfe" id="bkFormen">'+BK.MUSTER.map(function(m){return '<button class="knopf klein" data-form="'+m.form+'">'+FORM_DE[m.form]+'<small>'+m.w+' × '+m.h+'</small></button>'}).join('')+'</div>';
 h+='<div class="bkKnoepfe" id="bkKlassen">'+BK.KLASSEN.map(function(k){return '<button class="knopf klein" data-klasse="'+k.id+'">'+k.de+'</button>'}).join('')+'</div>';
 h+='<p id="bkInfo" class="leise"></p><div class="bkAnsichten"><div class="bkKarte" id="bkKarte"></div><div class="bkFp"><canvas id="bkFp" width="'+FP.W+'" height="'+FP.H+'" class="pixel"></canvas>'+
  '<p><button class="knopf klein" id="bkLinks">◀</button> <span id="bkSeite"></span> <button class="knopf klein" id="bkRechts">▶</button></p>'+
  '<p>Abstand: <button class="knopf klein" data-stufe="0">nah 1×</button> <button class="knopf klein" data-stufe="1">½</button> <button class="knopf klein" data-stufe="2">weit ¼</button></p>'+
  '<p class="leise">Gebäude und Arbeiter im selben Maßstab: Eine Hütte bleibt klein, eine Rennbahn sprengt das Bild. Noch nicht begehbar.</p></div></div>';
 h+='<p><button class="knopf" id="bkAlle">Alle 27 Muster messen<small>Zusammensetzen ins Bodenbild, gedrosselt ×'+E.budgets.drossel+'</small></button></p><div id="bkTabelle"></div>';
 h+='<h3>Werkzeug</h3><div class="bkForm">'+
  '<label>Grundform <select id="wfForm">'+E.masse.formen.filter(function(f){return FORM_DE[f.id]}).map(function(f){return '<option value="'+f.id+'">'+FORM_DE[f.id]+'</option>'}).join('')+'</select></label>'+
  '<label>Breite <input id="wfW" type="number" min="1" max="96" value="6"></label><label>Tiefe <input id="wfH" type="number" min="1" max="96" value="6"></label>'+
  '<label>Bauklasse <select id="wfKl">'+BK.KLASSEN.map(function(k){return '<option value="'+k.id+'">'+k.de+'</option>'}).join('')+'</select></label>'+
  '<label>Dachform <select id="wfDach"><option value="">wie die Grundform</option>'+BK.DACHFORMEN.map(function(d){return '<option value="'+d.id+'">'+d.de+'</option>'}).join('')+'</select></label>'+
  '<label>Dachfarbe <select id="wfDF">'+reihen()+'</select></label><label>Wandfarbe <select id="wfWF">'+reihen()+'</select></label>'+
  '<label>Kultur-Kürzel <input id="wfKu" maxlength="6" placeholder="leer = Grundkultur"></label></div>'+
  '<p id="wfGrenze" class="leise"></p><p><button class="knopf" id="wfZeig">Vorschau</button> <button class="knopf" id="wfKartei">Teile in die Kartei legen<small>Datei fürs Repository</small></button></p><p id="wfMeld"></p>';
 h+='<h3>Teile der Bauklasse</h3><div id="bkTeile"></div>';
 el.innerHTML=h;E.el=el;
 [].forEach.call(el.querySelectorAll('[data-form]'),function(b){b.onclick=function(){E.wahl={form:b.dataset.form,klasse:E.wahl.klasse};E.kult=null;muster()}});
 [].forEach.call(el.querySelectorAll('[data-klasse]'),function(b){b.onclick=function(){E.wahl.klasse=b.dataset.klasse;if(!E.wahl.form)E.wahl.form='werkstatt';E.kult=null;muster()}});
 $('#bkLinks').onclick=function(){E.seite=(E.seite+7)%8;fp()};$('#bkRechts').onclick=function(){E.seite=(E.seite+1)%8;fp()};
 [].forEach.call(el.querySelectorAll('[data-stufe]'),function(b){b.onclick=function(){E.stufe=+b.dataset.stufe;fpBau()}});
 $('#bkAlle').onclick=alleMessen;$('#wfForm').onchange=grenze;$('#wfZeig').onclick=werkzeug;$('#wfKartei').onclick=inKartei;
 grenze();muster()}
function $(q){return E.el.querySelector(q)}
function reihen(){return '<option value="">wie die Bauklasse</option>'+S.REIHEN.map(function(r,i){return '<option value="'+i+'">'+r.name+'</option>'}).join('')}
function formDef(id){return E.masse.formen.filter(function(f){return f.id===id})[0]}
function grenze(){var f=formDef($('#wfForm').value),t;
 if(f.rund){t='Durchmesser '+f.rund[0]+'–'+f.rund[1]+' (Breite zählt)';$('#wfW').value=f.rund[0];$('#wfH').value=f.rund[0]}
 else{t='kurze Seite '+f.kurz[0]+'–'+f.kurz[1]+', lange Seite '+f.lang[0]+'–'+f.lang[1];$('#wfW').value=f.lang[0];$('#wfH').value=f.kurz[0]}
 $('#wfGrenze').textContent='Maßtabelle: '+t+' Felder. '+(f.bsp||'')}
function passt(f,w,h){if(f.rund)return w>=f.rund[0]&&w<=f.rund[1];var a=Math.min(w,h),b=Math.max(w,h);return a>=f.kurz[0]&&a<=f.kurz[1]&&b>=f.lang[0]&&b<=f.lang[1]}
function hole(id){return(E.kult&&E.kult.obj[id])||E.obj[id]||null}
// Ein Gebäude setzen: Grundform, Drehung (0–3), Dachform. Zeit = gedrosselt (×drossel wiederholt).
function setze(form,w,h,klasse,dreh,dach){var L=BK.bilde(form,w,h,klasse);if(E.kult)L.kultur=E.kult.kuerzel;for(var i=0;i<dreh;i++)L=BK.drehe(L);
 var n=E.budgets.drossel||4,t=performance.now(),r;for(var k=0;k<n;k++)r=BK.setzen(L,hole,dach);r.ms=performance.now()-t;return r}
function leinwand(r){var c=document.createElement('canvas');c.width=r.w;c.height=r.h;var x=c.getContext('2d'),d=x.createImageData(r.w,r.h),P=S.PALETTEN[S.PALETTE].farben.map(S.farbe);
 for(var i=0;i<r.px.length;i++){var n=r.px[i];if(n===255)continue;var c3=P[n],o=i*4;d.data[o]=c3[0];d.data[o+1]=c3[1];d.data[o+2]=c3[2];d.data[o+3]=255}x.putImageData(d,0,0);c.className='pixel';return c}
// Ampel wie die Budgetgruppe „Bauteile“: 500 Teile in 8 ms (gedrosselt). Gemessen wird je Teil, damit große Gebäude nicht anders zählen als kleine.
function ampel(r){var g=E.budgets.gruppen.bau.karte,je=r.ms/r.teile*g.stufen[1];return{je:je,farbe:je<=g.ms?'gruen':je<=2*g.ms?'gelb':'rot'}}
var AMPEL={gruen:'🟢',gelb:'🟡',rot:'🔴'};
function zeigeGebaeude(form,w,h,klasse,dach){
 var r=setze(form,w,h,klasse,0,dach),a=ampel(r),K=BK.klasse(klasse);E.akt={form:form,w:w,h:h,klasse:klasse,dach:dach};
 $('#bkInfo').innerHTML='<b>'+FORM_DE[form]+' '+w+' × '+h+' · '+K.de+'</b>'+(E.kult?' · Kultur „'+esc(E.kult.kuerzel)+'“':'')+' · Bild '+r.w+' × '+r.h+' · '+r.teile+' Teile · '+r.ms.toFixed(1)+' ms gedrosselt'+
  ' · '+AMPEL[a.farbe]+' '+a.je.toFixed(1)+' ms je 500 Teile'+(r.fehlt.length?' · <span class="witz">fehlt: '+esc(r.fehlt.join(', '))+'</span>':'');
 var z=$('#bkKarte');z.innerHTML='';var cv=leinwand(r);z.appendChild(cv);var box=z.clientWidth||360;cv.style.width=Math.min(r.w,box)+'px';
 cv.title='Antippen: Originalgröße';cv.onclick=function(){cv.style.width=cv.style.width===r.w+'px'?Math.min(r.w,box)+'px':r.w+'px';z.style.overflowX='auto'};
 // First Person: vier Kartenrichtungen (gedrehte Grundform, ohne Wiese) in echtem Maßstab zum Arbeiter; Abstand verkleinert beide gleich (½, ¼)
 E.fpRoh=[0,1,2,3].map(function(d){var L=BK.bilde(form,w,h,klasse);if(E.kult)L.kultur=E.kult.kuerzel;for(var i=0;i<d;i++)L=BK.drehe(L);return BK.zuBild(BK.setzen(L,hole,dach,true))});fpBau()}
function klein(b,n){for(var i=0;i<n;i++)b=S.halbBild(b);return b}
function fpBau(){if(!E.fpRoh)return;var n=E.stufe,bilder=E.fpRoh.map(function(b){return klein(b,n)}),fig=E.obj['figur-arbeiter'];
 [].forEach.call(E.el.querySelectorAll('[data-stufe]'),function(b){b.classList.toggle('an',+b.dataset.stufe===n)});
 E.fpObj={id:'bk-vorschau',kat:'einrichtung',bild:bilder[0],richtungen:bilder.slice(1)};S.ansichtenErgaenzen(E.fpObj);
 E.fpFig=fig?{id:'bk-vorschau-figur',kat:'einrichtung',bild:Object.assign(klein(fig.bild,n),{kat:'einrichtung'})}:null;if(E.fpFig)S.ansichtenErgaenzen(E.fpFig);fp()}
function fp(){if(!E.fpObj)return;var x=$('#bkFp').getContext('2d');var sz=[{o:E.fpObj,r:E.seite,x:FP.W>>1,y:FP.H-24}];if(E.fpFig)sz.push({o:E.fpFig,r:0,x:(FP.W>>1)-Math.min(120,(E.fpObj.bild.w>>1)+12),y:FP.H-22});FP.zeichne(x,sz);
 $('#bkSeite').textContent='Seite '+(E.seite+1)+' von 8'}
function muster(){var m=BK.MUSTER.filter(function(x){return x.form===E.wahl.form})[0];
 [].forEach.call(E.el.querySelectorAll('[data-form]'),function(b){b.classList.toggle('an',b.dataset.form===m.form)});
 [].forEach.call(E.el.querySelectorAll('[data-klasse]'),function(b){b.classList.toggle('an',b.dataset.klasse===E.wahl.klasse)});
 zeigeGebaeude(m.form,m.w,m.h,E.wahl.klasse,'');teile(E.wahl.klasse)}
function alleMessen(){var l=BK.muster(),zeilen=[],alt=E.kult;E.kult=null;
 l.forEach(function(m){var r=setze(m.form,m.w,m.h,m.klasse,0,''),a=ampel(r);zeilen.push({id:m.id,form:m.form,klasse:m.klasse,w:m.w,h:m.h,bild:r.w+' × '+r.h,teile:r.teile,ms:r.ms,je:a.je,farbe:a.farbe,fehlt:r.fehlt.length})});
 E.kult=alt;E.messung=zeilen;
 $('#bkTabelle').innerHTML='<table class="tabelle"><tr><th>Muster</th><th>Felder</th><th>Bild</th><th>Teile</th><th>ms ×'+E.budgets.drossel+'</th><th>je 500</th></tr>'+zeilen.map(function(z){
  return '<tr><td>'+FORM_DE[z.form]+' · '+BK.klasse(z.klasse).de+'</td><td>'+z.w+' × '+z.h+'</td><td>'+z.bild+'</td><td>'+z.teile+'</td><td>'+z.ms.toFixed(1)+'</td><td>'+AMPEL[z.farbe]+' '+z.je.toFixed(1)+'</td></tr>'}).join('')+'</table>'+
  '<p class="leise">Gemessen wird das einmalige Zusammensetzen ins Bodenbild (Regel 20). Im Spiel geschieht das ab W2c im Bildkern, Kartenstück für Kartenstück; danach wird nur noch kopiert.</p>'}
function tauschWahl(){var d=$('#wfDF').value,w=$('#wfWF').value;return d===''&&w===''?null:{dach:d===''?null:+d,wand:w===''?null:+w}}
function kuerzel(){return($('#wfKu').value||'').trim().toLowerCase()}
// Kultur: Teile mit Farbtausch im Speicher erzeugen (nur für Vorschau und Export, nicht in die Kartei des Browsers)
function kultur(klasse){var ku=kuerzel(),ta=tauschWahl();if(!ku&&!ta)return null;if(!/^[a-z0-9]{1,6}$/.test(ku))throw new Error('Für Farbtausch ein Kultur-Kürzel angeben (a–z, 0–9, höchstens 6 Zeichen).');if(/^(?:[a-f]|[rk]?[sn]|[rk])$/.test(ku))throw new Error('Dieses Kultur-Kürzel ist für Lage-Varianten und Randteile reserviert (a–f, r, k, s, n, rs, rn, ks, kn), bitte ein anderes wählen.');
 var o={};BK.teile(klasse,ku,ta).forEach(function(t){var x={format:'at3-objekt',id:t.id,version:1,typ:1,kat:t.kat,name:t.name,status:'skizze',herkunft:'baukasten',karte:t.karte,bild:t.bild};S.ansichtenErgaenzen(x);o[t.id]=x;o[t.id]._roh=t});
 return{kuerzel:ku,tausch:ta,obj:o}}
function meld(t,f){$('#wfMeld').innerHTML=f?'<span class="witz">'+esc(t)+'</span>':esc(t)}
function werkzeug(){var f=formDef($('#wfForm').value),w=+$('#wfW').value,h=f.rund?w:+$('#wfH').value,kl=$('#wfKl').value;
 if(!passt(f,w,h))return meld('Diese Größe passt nicht in die Maßtabelle der Form „'+FORM_DE[f.id]+'“. Der Prüfer im Reiter Wirtschaft würde dasselbe sagen, nur unfreundlicher.',1);
 try{E.kult=kultur(kl)}catch(e){return meld(e.message,1)}
 zeigeGebaeude(f.id,w,h,kl,$('#wfDach').value);teile(kl);meld(E.kult?'Vorschau mit Kultur „'+E.kult.kuerzel+'“ (Teile nur im Speicher).':'Vorschau in der Grundkultur.')}
function inKartei(){var kl=$('#wfKl').value,k;try{k=kultur(kl)}catch(e){return meld(e.message,1)}
 if(!k)return meld('Die Teile der Grundkultur liegen schon in der Kartei (bk-'+BK.klasse(kl).kurz+'-…). Für eine Kultur Kürzel und Farben wählen.');
 var fehler=[],teile=Object.keys(k.obj).map(function(id){var o=k.obj[id],f=S.pruefeObjekt(o);if(f.length)fehler.push(id+': '+f.join(', '));var r=o._roh;return{id:r.id,kat:r.kat,name:r.name,info:r.info,hinweis:r.hinweis,bild:r.bild,karte:r.karte}});
 if(fehler.length)return meld('Prüfer lehnt ab: '+fehler.join('; '),1);
 var name='baukasten-'+BK.klasse(kl).kurz+'-'+k.kuerzel+'.json',text=JSON.stringify({format:'at3-baukasten-teile',klasse:kl,kultur:k.kuerzel,tausch:k.tausch,teile:teile});
 var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500);
 E.export={name:name,n:teile.length};meld(teile.length+' Teile als „'+name+'“ ausgegeben. Ins Repository: node tools/at3-baukasten.cjs --aus '+name+' · danach im Prüfstand messen und übernehmen.')}
function teile(klasse){var K=BK.klasse(klasse),ST={skizze:'Skizze',geprueft:'geprüft',uebernommen:'übernommen'},h='<div class="bkTeile">';
 BK.TEILE.map(function(t){return BK.kennung(K.id,t,E.kult?E.kult.kuerzel:'')}).concat(['bk-feld']).forEach(function(id){var o=hole(id);if(!o)return h+='<div class="bkTeil witz">'+id+' fehlt</div>';
  h+='<div class="bkTeil" data-teil="'+id+'"><canvas></canvas><small>'+esc(id)+'<br>'+o.bild.w+' × '+o.bild.h+' · '+(E.kult&&E.kult.obj[id]?'nur Vorschau':ST[o.status]||o.status)+'</small></div>'});
 $('#bkTeile').innerHTML=h+'</div>';
 [].forEach.call(E.el.querySelectorAll('[data-teil]'),function(d){var o=hole(d.dataset.teil),c=S.zuCanvas(o.bild,S.PALETTE),cv=d.querySelector('canvas');cv.width=c.width;cv.height=c.height;cv.getContext('2d').drawImage(c,0,0);cv.className='pixel';cv.style.width=c.width*2+'px'})}
return{aufbauen:aufbauen,E:E};
})();
