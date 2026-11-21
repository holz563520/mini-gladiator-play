// WAS DIE DATEI TUT: Reiter „Stadtbilder“ im Gebäudebaukasten des AT3-Master-Editors (Schritt N6a, Thomas 21.11.2026). Ortsbilder aus Bauplan und Teilen (stadtbild.js):
// · Wahl: Siedlungsart (Fläche wie 5.2), Biom (13), Baustil der Kultur (12 oder „nach Biom“), Seed (Würfeln), Zusatzteile (Standard der Art, änderbar).
// · Kartenansicht in Schritten gebaut (Zeitanteil 4 ms je Bild, Regel 20), wahlweise als Nachbarschaftsbild mit dem Biom ringsum; vier Varianten nebeneinander.
// · First Person: der Ort als Kulisse von vier Seiten (Plan gedreht), mit Arbeiter als Maßstab, Abstand ½, ¼, ⅛.
// · Messung aller Siedlungsarten eines Bioms: Zusammensetzen gedrosselt, größter Einzelschritt, Bildspeicher, Kacheln, Größe des Plans; Ampel nach Budgetgruppe „Große Anlagen“.
// Nichts davon lädt das Spiel. Bis N6b sind alle Teile Skizzen aus dem Baukasten (Bauklassen-Teile mit Farbtausch nach Biom und Baustil).
var AT3_STADTBILDER_MENUE=(function(){
'use strict';
var S,BK,SB,FP,E={obj:{},seite:0,stufe:2,umland:false,lauf:0};
var esc=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')};
var ART_DE={homestead:'Gehöft',hamlet:'Weiler',village:'Dorf','market-town':'Marktflecken',city:'Stadt','great-city':'Großstadt',slum:'Elendssiedlung'};
var ZUS_DE={wall:'Mauer',gate:'Tor',harbour:'Hafen',temple:'Tempel','market-square':'Marktplatz',arena:'Arena',theatre:'Theater',palace:'Palast',forum:'Forum',bath:'Bad',
 granary:'Kornspeicher',barracks:'Kaserne',cemetery:'Friedhof','slum-quarter':'Elendsviertel',fields:'Felder',pastures:'Weiden',vineyards:'Weinberge','olive-grove':'Olivenhain',ruins:'Ruinen'};
var AMPEL={gruen:'🟢',gelb:'🟡',rot:'🔴'};
function lade(f){return AT3ED.lade('grafik',f)}
function $(q){return E.el.querySelector(q)}
function hole(id){return E.obj[id]||null}
function aufbauen(el){E.el=el;el.innerHTML='<p class="leise">Die Stadtväter werden aus dem Bett geklopft …</p>';
 return Promise.all(['at3-64.js','baubild.js','fp.js'].map(lade)).then(function(){return lade('baukasten.js')}).then(function(){return lade('stadtbild.js')}).then(function(){
  S=window.AT3_64;BK=window.AT3_BAUKASTEN;SB=window.AT3_STADTBILD;FP=window.AT3_FP;
  return Promise.all([lade('daten/ortsbilder.json'),lade('kartei/objekte.json'),lade('kartei/budgets.json')])}).then(function(r){E.orte=r[0];E.budgets=r[2];
  // Nur, was Stadtbilder brauchen: alle Baukasten-Teile (mit Varianten und Randteilen), Böden, Pflanzen und Dinge aller Biome, Arbeiter als Maßstab
  var brauch={'figur-arbeiter':1};Object.keys(SB.BIOME).forEach(function(b){SB.kennungen(SB.plan({art:'great-city',biom:b,seed:1})).forEach(function(i){brauch[i]=1});
   SB.BIOME[b].baeume.forEach(function(i){brauch[i]=1})});['markt-stand','lager-platz','ware-water','ware-stamm','fels-block','leiche','tier-reh','busch-gruen','baum-olive'].forEach(function(i){brauch[i]=1});
  var ids=(r[1].objekte||[]).filter(function(o){return o.id.indexOf('bk-')===0||brauch[o.id]}).map(function(o){return o.id});
  // nacheinander statt alle gleichzeitig: die Ladeanzeige des Editors zählt sonst jede Datei in jedem offenen Ladefenster mit
  return ids.reduce(function(k,id){return k.then(function(){return lade('kartei/obj/'+id+'.json').then(function(o){E.obj[id]=o},function(){})})},Promise.resolve())}).then(zeigen)
  .catch(function(e){el.innerHTML='<p class="witz">Stadt abgebrannt: '+esc(e.message)+'</p>'})}
function zeigen(){var el=E.el,O=E.orte,biome=O.biome||[],stile=O.baustile||[];
 var h='<style>.sbForm{display:flex;flex-wrap:wrap;gap:6px 12px}.sbForm label{display:flex;flex-direction:column;font-size:.9em}.sbForm input{width:7em}.sbZus{display:flex;flex-wrap:wrap;gap:2px 10px;font-size:.85em}'+
  '.sbZus label{display:flex;gap:3px;align-items:center}.sbKarte{overflow-x:auto;max-width:100%}.sbVar{display:flex;flex-wrap:wrap;gap:6px}.sbVar figure{margin:0;max-width:48%}.sbVar canvas{max-width:100%}'+
  '.sbFp canvas{width:320px;max-width:100%}</style>'+
  '<p>Ein Ort ist auf der Karte ein großes Bild. Es entsteht aus einem <b>Bauplan</b> (Seed, Siedlungsart, Biom, Baustil, Zusatzteile) und den <b>Teilen</b> des Baukastens. Gespeichert wird nur der Plan, gebaut wird das Bild im Bildkern, wenn der Ort ins Bild kommt. So kostet ein Weiler weniger als eine Hauptstadt und keine Stadt mehr als ihr Abriss.</p>'+
  '<p class="leise">Bis N6b sind alle Teile Skizzen: Bauklassen-Teile mit Farbtausch je Biom und Baustil. Die schöne Bauweise je Biom kommt mit N6b und N6c, die Baustile mit N6d, weitere Zusatzteile mit N6e.</p>';
 h+='<div class="sbForm">'+
  '<label>Siedlungsart <select id="sbArt">'+Object.keys(SB.ARTEN).map(function(a){return '<option value="'+a+'"'+(a==='village'?' selected':'')+'>'+ART_DE[a]+' · '+SB.ARTEN[a].W+' × '+SB.ARTEN[a].W+'</option>'}).join('')+'</select></label>'+
  '<label>Biom <select id="sbBiom">'+biome.map(function(b){return '<option value="'+b.id+'">'+esc(b.de)+(b.nurAussenposten?' (nur Außenposten)':'')+'</option>'}).join('')+'</select></label>'+
  '<label>Baustil <select id="sbStil"><option value="">nach Biom</option>'+stile.map(function(s){return '<option value="'+s.id+'">'+esc(s.en)+'</option>'}).join('')+'</select></label>'+
  '<label>Seed <input id="sbSeed" type="number" min="0" max="4294967295" value="7"></label>'+
  '<label>&nbsp;<button class="knopf klein" id="sbWuerfel">🎲 Würfeln</button></label></div>'+
  '<p class="leise" id="sbBauweise"></p>'+
  '<p><b>Zusatzteile</b> <button class="knopf klein" id="sbStd">Standard der Art</button></p><div class="sbZus" id="sbZus">'+
  SB.ZUSATZ.map(function(z){return '<label><input type="checkbox" data-zus="'+z+'">'+ZUS_DE[z]+'</label>'}).join('')+
  (O.zusatzteile||[]).filter(function(z){return SB.ZUSATZ.indexOf(z.id)<0}).map(function(z){return '<label class="leise" title="kommt mit N6e"><input type="checkbox" disabled>'+esc(z.de)+'</label>'}).join('')+'</div>'+
  '<p><label><input type="checkbox" id="sbUmland"> Nachbarschaftsbild (4 Felder Biom ringsum)</label></p>'+
  '<p id="sbInfo" class="leise"></p><div class="sbKarte" id="sbKarte"></div>'+
  '<h3>Varianten <span class="leise">(gleiche Wahl, vier Seeds)</span></h3><p><button class="knopf" id="sbVarKnopf">Vier Varianten zeigen</button></p><div class="sbVar" id="sbVar"></div>'+
  '<h3>First Person <span class="leise">(der Ort als Kulisse)</span></h3><div class="sbFp"><canvas id="sbFp" width="'+FP.W+'" height="'+FP.H+'" class="pixel"></canvas>'+
  '<p><button class="knopf klein" id="sbLinks">◀</button> <span id="sbSeite"></span> <button class="knopf klein" id="sbRechts">▶</button></p>'+
  '<p>Abstand: <button class="knopf klein" data-sbstufe="1">½</button> <button class="knopf klein" data-sbstufe="2">¼</button> <button class="knopf klein" data-sbstufe="3">⅛</button></p></div>'+
  '<h3>Messung</h3><p><button class="knopf" id="sbMessen">Alle Siedlungsarten dieses Bioms messen<small>Zusammensetzen gedrosselt ×'+E.budgets.drossel+' · größter Einzelschritt · Bildspeicher · Kacheln</small></button></p><div id="sbTabelle"></div>';
 el.innerHTML=h;
 $('#sbArt').onchange=function(){standard();neu()};['#sbBiom','#sbStil','#sbSeed'].forEach(function(q){$(q).onchange=neu});$('#sbUmland').onchange=function(){E.umland=$('#sbUmland').checked;neu()};
 $('#sbWuerfel').onclick=function(){$('#sbSeed').value=Math.floor(Math.random()*1e6);neu()};$('#sbStd').onclick=function(){standard();neu()};
 [].forEach.call(el.querySelectorAll('[data-zus]'),function(c){c.onchange=neu});
 $('#sbVarKnopf').onclick=varianten;$('#sbMessen').onclick=messen;
 $('#sbLinks').onclick=function(){E.seite=(E.seite+7)%8;fp()};$('#sbRechts').onclick=function(){E.seite=(E.seite+1)%8;fp()};
 [].forEach.call(el.querySelectorAll('[data-sbstufe]'),function(b){b.onclick=function(){E.stufe=+b.dataset.sbstufe;fpBau()}});
 standard();neu()}
function standard(){var std=SB.ARTEN[$('#sbArt').value].std;[].forEach.call(E.el.querySelectorAll('[data-zus]'),function(c){c.checked=std.indexOf(c.dataset.zus)>=0})}
function wahl(seed){var z=[];[].forEach.call(E.el.querySelectorAll('[data-zus]'),function(c){if(c.checked)z.push(c.dataset.zus)});
 return{art:$('#sbArt').value,biom:$('#sbBiom').value,stil:$('#sbStil').value,seed:seed==null?(+$('#sbSeed').value>>>0):seed,zusatz:z}}
function leinwand(r){var c=document.createElement('canvas');c.width=Math.max(1,r.w);c.height=Math.max(1,r.h);if(!r.w)return c;var x=c.getContext('2d'),d=x.createImageData(r.w,r.h),P=S.PALETTEN[S.PALETTE].farben.map(S.farbe);
 for(var i=0;i<r.px.length;i++){var n=r.px[i];if(n===255)continue;var c3=P[n],o=i*4;d.data[o]=c3[0];d.data[o+1]=c3[1];d.data[o+2]=c3[2];d.data[o+3]=255}x.putImageData(d,0,0);c.className='pixel';return c}
// In Schritten bauen: je Bild höchstens 4 ms (Regel 20); ein neuer Auftrag bricht den alten ab
function bauen(P,umland){var lauf=++E.lauf,b=SB.bauer(P,hole,{umland:umland?4:0}),t0=performance.now();
 return new Promise(function(ok,nein){(function tick(){if(lauf!==E.lauf)return nein(new Error('abgebrochen'));if(b.schritt(4)){var r=b.bild();r.gesamt=performance.now()-t0;return ok(r)}requestAnimationFrame(tick)})()})}
function neu(){var w;try{w=wahl();E.plan=SB.plan(w)}catch(e){$('#sbInfo').innerHTML='<span class="witz">'+esc(e.message)+'</span>';return}
 var B=(E.orte.biome||[]).filter(function(b){return b.id===w.biom})[0],st=(E.orte.baustile||[]).filter(function(s){return s.id===w.stil})[0];
 $('#sbBauweise').innerHTML='Bauweise im Biom: '+esc(B?B.bauweise:'')+(st?' · Baustil: '+esc(st.de)+(st.kulturen?' ('+esc(st.kulturen.join(', '))+')':''):'')+(B&&B.nurAussenposten?' · <span class="witz">Hier wohnen nur Außenposten. Und die nicht gern.</span>':'');
 $('#sbInfo').textContent='Wird gebaut …';
 bauen(E.plan,E.umland).then(function(r){E.bild=r;var n=SB.zaehle(E.plan),P=E.plan,kb=(JSON.stringify(P).length/1024);
  $('#sbInfo').innerHTML='<b>'+ART_DE[P.art]+' '+P.W+' × '+P.W+' Felder</b> · Bild '+r.w+' × '+r.h+' · '+n.haeuser+' Häuser, '+n.besondere+' besondere Bauten, '+n.mauer+' Mauerstücke, '+n.dinge+' Dinge · '+r.teile+' Teile'+
   ' · gebaut in '+r.schritte+' Schritten ('+r.ms.toFixed(1)+' ms Rechnung, größter '+r.maxMs.toFixed(1)+' ms)'+(P.gespiegelt?' · gespiegelt':'')+' · Plan '+kb.toFixed(1)+' KB im Speicher (gespeichert wird nur das Rezept: Art, Biom, Stil, Seed, Zusatzteile)'+
   (r.fehlt.length?' · <span class="witz">fehlt: '+esc(r.fehlt.join(', '))+'</span>':'');
  var z=$('#sbKarte');z.innerHTML='';var cv=leinwand(r),box=z.clientWidth||360;z.appendChild(cv);cv.style.width=Math.min(r.w,box)+'px';cv.title='Antippen: Originalgröße';
  cv.onclick=function(){cv.style.width=cv.style.width===r.w+'px'?Math.min(r.w,box)+'px':r.w+'px'};
  E.fpRoh=null;fpBau()}).catch(function(e){if(e.message!=='abgebrochen')$('#sbInfo').innerHTML='<span class="witz">'+esc(e.message)+'</span>'})}
function varianten(){var w=wahl(),z=$('#sbVar');z.innerHTML='';
 [0,1,2,3].forEach(function(k){var P=SB.plan(Object.assign({},w,{seed:(w.seed+k*7919)>>>0})),r=SB.malen(P,hole,{}),f=document.createElement('figure'),cv=leinwand(r);
  f.appendChild(cv);var c=document.createElement('figcaption');c.className='leise';c.textContent='Seed '+P.seed+(P.gespiegelt?' · gespiegelt':'');f.appendChild(c);z.appendChild(f)})}
// First Person: der Plan von vier Seiten (gedreht), verkleinert auf den Abstand; schräge Seiten nimmt fp.js von der Nachbarrichtung
function klein(r,n){var f=1<<n,w=Math.max(1,Math.ceil(r.w/f)),h=Math.max(1,Math.ceil(r.h/f)),px=new Uint8Array(w*h).fill(255);
 for(var y=0;y<h;y++)for(var x=0;x<w;x++){var best=255;for(var dy=0;dy<f&&best===255;dy++)for(var dx=0;dx<f;dx++){var sy=y*f+dy,sx=x*f+dx;if(sy<r.h&&sx<r.w){var v=r.px[sy*r.w+sx];if(v!==255){best=v;break}}}px[y*w+x]=best}
 return{w:w,h:h,px:px}}
function fpBau(){if(!E.plan)return;[].forEach.call(E.el.querySelectorAll('[data-sbstufe]'),function(b){b.classList.toggle('an',+b.dataset.sbstufe===E.stufe)});
 if(!E.fpRoh){var P=E.plan;E.fpRoh=[];for(var d=0;d<4;d++){E.fpRoh.push(SB.malen(P,hole,{}));P=SB.drehen(P)}}
 var bilder=E.fpRoh.map(function(r){return BK.zuBild(klein(r,E.stufe))}),fig=hole('figur-arbeiter'),f=1<<E.stufe;
 E.fpObj={id:'sb-vorschau',kat:'einrichtung',bild:bilder[0],richtungen:bilder.slice(1)};S.ansichtenErgaenzen(E.fpObj);
 E.fpFig=null;if(fig){var fb=klein({w:fig.bild.w,h:fig.bild.h,px:(function(){var px=new Uint8Array(fig.bild.w*fig.bild.h).fill(255);fig.bild.z.forEach(function(z,y){for(var x=0;x<z.length;x++)if(z[x]!=='.')px[y*fig.bild.w+x]=S.ZEICHEN.indexOf(z[x])});return px})()},Math.max(0,E.stufe-1));
  E.fpFig={id:'sb-figur',kat:'einrichtung',bild:BK.zuBild(fb)};S.ansichtenErgaenzen(E.fpFig)}
 fp()}
function fp(){if(!E.fpObj)return;var x=$('#sbFp').getContext('2d'),sz=[{o:E.fpObj,r:E.seite,x:FP.W>>1,y:FP.H-14}];
 if(E.fpFig)sz.push({o:E.fpFig,r:0,x:(FP.W>>1)-Math.min(140,(E.fpObj.bild.w>>1)+10),y:FP.H-8});FP.zeichne(x,sz);
 $('#sbSeite').textContent='Seite '+(E.seite+1)+' von 8 · Abstand 1/'+(1<<E.stufe)}
// Messung: alle Siedlungsarten mit der aktuellen Wahl von Biom, Baustil, Seed (Standard-Zusatzteile je Art). Gedrosselt = jedes Bild n-mal gebaut;
// größter Einzelschritt mit Zeitanteil 4 ms / Drossel gebaut und ×Drossel gerechnet (so lang dauert er auf einem 4× langsameren Handy).
function messen(){var w=wahl(),n=E.budgets.drossel||4,g=E.budgets.gruppen.anlagen||{karte:{ms:8},bildspeicher:4194304},zeilen=[];
 Object.keys(SB.ARTEN).forEach(function(a){var P=SB.plan({art:a,biom:w.biom,stil:w.stil,seed:w.seed}),t=performance.now(),r;for(var k=0;k<n;k++)r=SB.malen(P,hole,{});var ms=performance.now()-t;
  var b=SB.bauer(P,hole,{});while(!b.schritt(4/n));var s=b.bild(),gross=s.maxMs*n,kach=SB.kacheln(r).length,mem=r.w*r.h,kb=JSON.stringify(P).length/1024;
  var farbe=gross<=g.karte.ms&&mem<=g.bildspeicher?'gruen':gross<=2*g.karte.ms&&mem<=g.bildspeicher?'gelb':'rot';
  zeilen.push({art:a,W:P.W,bild:r.w+' × '+r.h,teile:r.teile,ms:ms,gross:gross,mem:mem,kach:kach,kb:kb,farbe:farbe,fehlt:r.fehlt.length})});
 E.messung=zeilen;
 $('#sbTabelle').innerHTML='<table class="tabelle"><tr><th>Art</th><th>Felder</th><th>Bild</th><th>Teile</th><th>ms ×'+n+'</th><th>größter Schritt</th><th>Bildspeicher</th><th>Kacheln</th><th>Plan</th></tr>'+zeilen.map(function(z){
  return '<tr><td>'+AMPEL[z.farbe]+' '+ART_DE[z.art]+'</td><td>'+z.W+' × '+z.W+'</td><td>'+z.bild+'</td><td>'+z.teile+'</td><td>'+z.ms.toFixed(1)+'</td><td>'+z.gross.toFixed(1)+' ms</td><td>'+(z.mem/1024).toFixed(0)+' KB</td><td>'+z.kach+'</td><td>'+z.kb.toFixed(1)+' KB</td></tr>'}).join('')+'</table>'+
  '<p class="leise">Budget „Große Anlagen“: Schritt ≤ '+g.karte.ms+' ms gedrosselt, Bildspeicher ≤ '+(g.bildspeicher/1048576).toFixed(0)+' MB je Bild (1 Byte je Bildpunkt). Gebaut wird einmal je Ort, der ins Bild kommt, im Bildkern (ab N7a), danach nur Kopieren der Kacheln.</p>'}
return{aufbauen:aufbauen,E:E};
})();
