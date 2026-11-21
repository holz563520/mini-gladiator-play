// WAS DIE DATEI TUT: Reiter „Stadtbilder“ im Gebäudebaukasten des AT3-Master-Editors (Schritt N6a, Thomas 21.11.2026). Ortsbilder aus Bauplan und Teilen (stadtbild.js):
// · Wahl: Siedlungsart (Fläche wie 5.2), Biom (13), Baustil der Kultur (12 oder „nach Biom“), Seed (Würfeln), Zusatzteile (Standard der Art, änderbar).
// · Kartenansicht als Sichtfenster zum Wischen (N6b2-0): nur sichtbare Kacheln werden gebaut und gehalten (höchstens 32), bis dahin Ersatzbild (Bodenfarbe + Klötze),
//   Zähler gebaut/gehalten/KB/größter Schritt; wahlweise Nachbarschaftsbild mit dem Biom ringsum, Probestadt 200 × 200 zum Messen; vier Varianten nebeneinander.
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
  '.sbFp canvas{width:320px;max-width:100%}#sbFenster{touch-action:none;cursor:grab;max-width:100%;background:#1a1410;display:block}</style>'+
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
  '<p><label><input type="checkbox" id="sbUmland"> Nachbarschaftsbild (4 Felder Biom ringsum)</label> &nbsp; <label title="Großstadt künstlich auf 200 × 200 Felder vergrößert, nur zum Messen (echte Städte nach Einwohnern kommen mit N6b2c)"><input type="checkbox" id="sbProbe"> Probestadt 200 × 200</label></p>'+
  '<p id="sbInfo" class="leise"></p><div class="sbKarte" id="sbKarte"></div>'+
  '<h3>Varianten <span class="leise">(gleiche Wahl, vier Seeds)</span></h3><p><button class="knopf" id="sbVarKnopf">Vier Varianten zeigen</button></p><div class="sbVar" id="sbVar"></div>'+
  '<h3>First Person <span class="leise">(der Ort als Kulisse)</span></h3><div class="sbFp"><canvas id="sbFp" width="'+FP.W+'" height="'+FP.H+'" class="pixel"></canvas>'+
  '<p><button class="knopf klein" id="sbLinks">◀</button> <span id="sbSeite"></span> <button class="knopf klein" id="sbRechts">▶</button></p>'+
  '<p>Abstand: <button class="knopf klein" data-sbstufe="1">½</button> <button class="knopf klein" data-sbstufe="2">¼</button> <button class="knopf klein" data-sbstufe="3">⅛</button></p></div>'+
  '<h3>Messung</h3><p><button class="knopf" id="sbMessen">Alle Siedlungsarten dieses Bioms messen<small>Zusammensetzen gedrosselt ×'+E.budgets.drossel+' · größter Einzelschritt · Bildspeicher · Kacheln</small></button></p><div id="sbTabelle"></div>'+
  '<p><button class="knopf" id="sbFensterMessen">Sichtfenster der Probestadt messen<small>200 × 200 Felder · Handy-Sicht 360 × 640 · 40-mal wischen · gedrosselt ×'+E.budgets.drossel+'</small></button></p><div id="sbFensterTabelle"></div>';
 el.innerHTML=h;
 $('#sbArt').onchange=function(){standard();neu()};['#sbBiom','#sbStil','#sbSeed'].forEach(function(q){$(q).onchange=neu});$('#sbUmland').onchange=function(){E.umland=$('#sbUmland').checked;neu()};$('#sbProbe').onchange=function(){E.probe=$('#sbProbe').checked;neu()};
 $('#sbWuerfel').onclick=function(){$('#sbSeed').value=Math.floor(Math.random()*1e6);neu()};$('#sbStd').onclick=function(){standard();neu()};
 [].forEach.call(el.querySelectorAll('[data-zus]'),function(c){c.onchange=neu});
 $('#sbVarKnopf').onclick=varianten;$('#sbMessen').onclick=messen;$('#sbFensterMessen').onclick=fensterMessen;
 $('#sbLinks').onclick=function(){E.seite=(E.seite+7)%8;fp()};$('#sbRechts').onclick=function(){E.seite=(E.seite+1)%8;fp()};
 [].forEach.call(el.querySelectorAll('[data-sbstufe]'),function(b){b.onclick=function(){E.stufe=+b.dataset.sbstufe;fpBau()}});
 standard();neu()}
function standard(){var std=SB.ARTEN[$('#sbArt').value].std;[].forEach.call(E.el.querySelectorAll('[data-zus]'),function(c){c.checked=std.indexOf(c.dataset.zus)>=0})}
function wahl(seed){var z=[];[].forEach.call(E.el.querySelectorAll('[data-zus]'),function(c){if(c.checked)z.push(c.dataset.zus)});
 return{art:$('#sbArt').value,biom:$('#sbBiom').value,stil:$('#sbStil').value,seed:seed==null?(+$('#sbSeed').value>>>0):seed,zusatz:z}}
function leinwand(r){var c=document.createElement('canvas');c.width=Math.max(1,r.w);c.height=Math.max(1,r.h);if(!r.w)return c;var x=c.getContext('2d'),d=x.createImageData(r.w,r.h),P=S.PALETTEN[S.PALETTE].farben.map(S.farbe);
 for(var i=0;i<r.px.length;i++){var n=r.px[i];if(n===255)continue;var c3=P[n],o=i*4;d.data[o]=c3[0];d.data[o+1]=c3[1];d.data[o+2]=c3[2];d.data[o+3]=255}x.putImageData(d,0,0);c.className='pixel';return c}
function neu(){var w;try{w=wahl();if(E.probe){w.art='great-city';w.probeW=200}E.plan=SB.plan(w)}catch(e){$('#sbInfo').innerHTML='<span class="witz">'+esc(e.message)+'</span>';return}
 var B=(E.orte.biome||[]).filter(function(b){return b.id===w.biom})[0],st=(E.orte.baustile||[]).filter(function(s){return s.id===w.stil})[0];
 $('#sbBauweise').innerHTML='Bauweise im Biom: '+esc(B?B.bauweise:'')+(st?' · Baustil: '+esc(st.de)+(st.kulturen?' ('+esc(st.kulturen.join(', '))+')':''):'')+(B&&B.nurAussenposten?' · <span class="witz">Hier wohnen nur Außenposten. Und die nicht gern.</span>':'');
 var n=SB.zaehle(E.plan),P=E.plan,kb=(JSON.stringify(P).length/1024);
 $('#sbInfo').innerHTML='<b>'+(E.probe?'Probestadt (Großstadt) ':ART_DE[P.art]+' ')+P.W+' × '+P.W+' Felder</b> · Seed '+P.seed+(E.umland?' · mit Umland':'')+' · '+n.haeuser+' Häuser, '+n.besondere+' besondere Bauten, '+n.mauer+' Mauerstücke, '+n.dinge+' Dinge'+
  (P.gespiegelt?' · gespiegelt':'')+' · Plan '+kb.toFixed(1)+' KB im Speicher (gespeichert wird nur das Rezept: Art, Biom, Stil, Seed, Zusatzteile)';
 fenster(P,E.umland);E.fpRoh=null;
 if(E.probe){E.fpObj=null;$('#sbSeite').textContent='First Person nicht für die Probestadt (sie wäre am Stück 85 MB groß).';var c=$('#sbFp');c.getContext('2d').clearRect(0,0,c.width,c.height)}else fpBau()}
// Sichtfenster (N6b2-0): Wischen wie später im Spiel; je Bild ein Schritt mit 4 ms, gezeichnet werden fertige Kacheln, sonst das Ersatzbild aus dem Plan
function fenster(P,umland){var lauf=++E.lauf,kb=SB.kachelBauer(P,hole,{umland:umland?4:0}),z=$('#sbKarte'),PAL=S.PALETTEN[S.PALETTE].farben,bilder=new Map();E.kb=kb;
 z.innerHTML='<canvas id="sbFenster" class="pixel" title="Wischen zum Verschieben"></canvas><p class="leise" id="sbZaehler"></p>';
 var cv=$('#sbFenster'),cw=Math.max(240,Math.min(z.clientWidth||360,640)),ch=Math.min(480,Math.round(cw*4/3));cv.width=cw;cv.height=ch;var x=cv.getContext('2d');x.imageSmoothingEnabled=false;
 var U=umland?4:0,vx=kb.ax-cw/2,vy=kb.ay+(P.W/2+U)*16-ch/2,zieh=null,zeit=0;
 var setz=function(){vx=Math.round(Math.max(0,Math.min(kb.w-cw,vx)));vy=Math.round(Math.max(0,Math.min(kb.h-ch,vy)));kb.sicht(vx,vy,cw,ch)};setz();
 cv.onpointerdown=function(e){zieh={x:e.clientX,y:e.clientY};cv.setPointerCapture(e.pointerId);cv.style.cursor='grabbing'};
 cv.onpointermove=function(e){if(!zieh)return;var f=cv.width/(cv.getBoundingClientRect().width||cv.width);vx-=(e.clientX-zieh.x)*f;vy-=(e.clientY-zieh.y)*f;zieh={x:e.clientX,y:e.clientY};setz()};
 cv.onpointerup=cv.onpointercancel=function(){zieh=null;cv.style.cursor='grab'};
 var kachelBild=function(k){var b=bilder.get(k.t);if(b&&b.px===k.px)return b.cv;var c=leinwand({w:k.w,h:k.h,px:k.px});bilder.set(k.t,{px:k.px,cv:c});return c};
 var ersatz=function(offen){if(!offen.length)return;var u=kb.umrisse(vx,vy,cw,ch),F=u.farben,ox=-vx,oy=-vy;x.save();x.beginPath();offen.forEach(function(k){x.rect(k.x+ox,k.y+oy,k.w,k.h)});x.clip();
  x.fillStyle=PAL[F.boden];x.beginPath();u.flaeche.forEach(function(p,i){x[i?'lineTo':'moveTo'](p[0]+ox,p[1]+oy)});x.fill();
  u.bauten.forEach(function(b){var X=b.X+ox,Y=b.Y+oy,H=b.rolle==='mauer'?20:28,N=[X,Y],O=[X+b.fw*32,Y+b.fw*16],S2=[X+(b.fw-b.fh)*32,Y+(b.fw+b.fh)*16],Wp=[X-b.fh*32,Y+b.fh*16];
   x.fillStyle=PAL[F.wand];x.beginPath();x.moveTo(Wp[0],Wp[1]-H);x.lineTo(S2[0],S2[1]-H);x.lineTo(O[0],O[1]-H);x.lineTo(O[0],O[1]);x.lineTo(S2[0],S2[1]);x.lineTo(Wp[0],Wp[1]);x.fill();
   x.fillStyle=PAL[F.dach];x.beginPath();[N,O,S2,Wp].forEach(function(p,i){x[i?'lineTo':'moveTo'](p[0],p[1]-H)});x.fill()});x.restore()};
 (function tick(){if(lauf!==E.lauf)return;kb.schritt(4);x.clearRect(0,0,cw,ch);var vis=kb.sichtbare(),offen=[];
  vis.forEach(function(k){if(k.fertig){if(k.px)x.drawImage(kachelBild(k),k.x-vx,k.y-vy)}else offen.push(k)});ersatz(offen);
  bilder.forEach(function(b,t){var k=kb.kachel(t%kb.NX,(t/kb.NX)|0);if(!k||k.px!==b.px)bilder.delete(t)});
  var jetzt=performance.now();if(jetzt-zeit>250){zeit=jetzt;var s=kb.stand();$('#sbZaehler').innerHTML=(s.aufgebaut?'':'Fächer werden angelegt … · ')+'Im Bild '+s.imBild+' Kacheln, davon '+(vis.length-offen.length)+' fertig'+
   ' · gehalten '+s.gehalten+' / '+kb.grenze+' ('+(s.bytes/1024).toFixed(0)+' KB) · gebaut '+s.gebaut+' · verworfen '+s.verworfen+' · Gebäudebilder '+s.haeuser+' ('+(s.hausBytes/1024).toFixed(0)+' KB)'+
   ' · größter Schritt '+s.maxMs.toFixed(1)+' ms · Fächer '+s.aufbauMs.toFixed(0)+' ms in Schritten, Index '+(s.fachBytes/1024).toFixed(0)+' KB · Rohbild '+kb.w+' × '+kb.h+' ('+s.kacheln+' Kachelplätze)'+
   (s.fehlt.length?' · <span class="witz">fehlt: '+esc(s.fehlt.join(', '))+'</span>':'')+(s.ueber?' · <span class="witz">'+s.ueber+' Gebäude größer als geschätzt</span>':'')}
  requestAnimationFrame(tick)})()}
// Messung Sichtfenster: Probestadt 200 × 200, Handy-Sicht, 40-mal wischen; gedrosselt = Zeitanteil 4 ms / Drossel, größter Schritt ×Drossel
function fensterMessen(){var w=wahl(),n=E.budgets.drossel||4,g=E.budgets.gruppen.anlagen||{karte:{ms:8}},out=$('#sbFensterTabelle');out.textContent='Misst …';
 setTimeout(function(){var t0=performance.now(),P=SB.plan({art:'great-city',biom:w.biom,stil:w.stil,seed:w.seed,probeW:200}),tp=performance.now()-t0,kb=SB.kachelBauer(P,hole,{}),maxB=0,maxG=0,lang=0,sch=0,m=0;
  var cx=kb.ax-180,cy=kb.ay+3200-320,lauf=function(){var f;do{var a=performance.now();f=kb.schritt(4/n);var d=(performance.now()-a)*n;if(d>m)m=d;if(d>g.karte.ms)lang++;sch++;var s=kb.stand();if(s.bytes>maxB)maxB=s.bytes;if(s.gehalten>maxG)maxG=s.gehalten}while(!f)};
  kb.sicht(cx,cy,360,640);lauf();for(var k=1;k<=40;k++){kb.sicht(cx+((k*997)%8000)-4000,cy+((k*577)%4000)-2000,360,640);lauf()}var s=kb.stand(),farbe=maxG<=32&&maxB<=2097152&&lang*50<=sch?'gruen':maxG<=32?'gelb':'rot';
  E.fensterMessung={plan:tp,s:s,maxB:maxB,maxG:maxG,lang:lang,schritte:sch,gross:m,farbe:farbe};
  out.innerHTML='<p>'+AMPEL[farbe]+' <b>Probestadt 200 × 200</b> · Plan '+tp.toFixed(0)+' ms (einmal) · Fächer '+(s.aufbauMs*n).toFixed(0)+' ms gedrosselt in Schritten · Index '+(s.fachBytes/1024).toFixed(0)+' KB · höchstens '+maxG+' Kacheln gehalten = '+(maxB/1024).toFixed(0)+' KB'+
   ' · gebaut '+s.gebaut+', verworfen '+s.verworfen+' · größter Schritt '+m.toFixed(1)+' ms gedrosselt · Schritte über '+g.karte.ms+' ms: '+lang+' von '+sch+'</p><p class="leise">Ziel: höchstens 32 Kacheln (≈ 2 MB), unabhängig von der Stadtgröße. Lange Einzelschritte kommen vom ersten Umfärben der Teile je Bauklasse (Vorwärmen mit N7a) und von der Speicherbereinigung.</p>'},30)}
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
