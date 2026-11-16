// WAS DIE DATEI TUT: Kampf-Labor im AT3-Master-Editor (Menü Kampf, Schritt G9b; wird erst beim Antippen geladen, zusammen mit kampfanschluss.js).
// Zwei Teams (Mensch, Hund oder Löwe; Anzahl 1–10; Stufe 0–6 = so stark wie ein Mensch dieser Stufe), Erzeugungs-Seed und Kampf-Seed, „Kampf rechnen“,
// Ergebnis mit Rechenzeit, „Nochmal gleich“ (selber Kern und frischer Kern, Fingerabdruck), Ladezeit des Kampfkerns, Bildzeit des Hauptkerns.
// Kerne: Kämpfer erzeugen und Kampf rechnen im Kampfkern (kampfkern.js, Hintergrund, unveränderte 1.0-Logik). Der Hauptkern lädt nichts aus 1.0,
// baut nur den Auftrag und zeigt das Ergebnis. Wiederverwendet: Kampfanschluss (G9a), Aufbau und Kopierknopf der Kernprobe, Erzeugung der 1.0-Herausforderungen.
(function(){
'use strict';
var KA=window.AT3Kampf, el=null, beschaeftigt=false;
var V=((document.currentScript&&document.currentScript.src||'').match(/[?&]v=([^&]*)/)||[])[1]||'';
var E={laden:[],kampf:null,gleich:null,bild:null,auftrag:null,teams:null};
var ARTEN=[['human','Mensch'],['dog','Hund'],['lion','Löwe']];
var STUFEN=['0 · Gewöhnlich','1 · Erfahren','2 · Talentiert','3 · Elite','4 · Champion','5 · Ausnahmetalent','6 · Legende'];
function q(s){return el.querySelector(s)}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}
function kom(v,n){return v==null?'-':(+v).toFixed(n==null?1:n).replace('.',',')}
function kb(b){return kom((b||0)/1024)+' KB'}
function amp(f){return '<i class="amp '+f+'"></i>'}
function wurf(){var a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%1000000}
function p95(L){if(!L.length)return null;var s=L.slice().sort(function(a,b){return a-b});return s[Math.min(s.length-1,Math.floor(.95*s.length))]}
function wahl(id,opt,soll){return '<select id="'+id+'" aria-label="'+id+'">'+opt.map(function(o){return '<option value="'+o[0]+'"'+(String(o[0])===String(soll)?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select>'}
function zahlen(a,b){var L=[];for(var i=a;i<=b;i++)L.push([i,i+(i===1?' Kämpfer':' Kämpfer')]);return L}

// ── Bildzeit des Hauptkerns messen, solange der Kampfkern arbeitet ──
function bildMessung(){var L=[],letzt=null,an=true;
 function f(ts){if(!an)return;if(letzt!=null)L.push(ts-letzt);letzt=ts;requestAnimationFrame(f)}requestAnimationFrame(f);
 return function(){an=false;return {p95:p95(L),max:L.length?Math.max.apply(null,L):null,bilder:L.length}}}

// ── Kampfkern starten und Ladezeit festhalten ──
function kern(){var neu=!KA.kern,k=KA.starteKern('',V);return k.bereit.then(function(l){if(neu){E.laden.push(l);ladenZeigen()}return k})}
function ladenZeigen(){var z=q('#klLaden');if(!z)return;if(!E.laden.length){z.innerHTML='<p class="leise">Der Kampfkern schläft noch. Er wird erst geweckt, wenn jemand bluten soll.</p>';return}
 var h='<table class="tabelle"><tr><th>Start</th><th>bis bereit</th><th>davon im Kern</th><th>Dateien</th><th>übertragen</th><th>entpackt</th></tr>';
 E.laden.forEach(function(l,i){h+='<tr><td>'+(i?'Neustart '+i:'Erster Start')+'</td><td>'+l.ms+' ms</td><td>'+(l.kernMs!=null?Math.round(l.kernMs)+' ms':'-')+'</td><td>'+l.dateien+'</td><td>'+kb(l.bytes)+'</td><td>'+kb(l.entpackt)+'</td></tr>'});
 z.innerHTML=h+'</table><p class="leise">Beim ersten Start kommen die 1.0-Dateien aus dem Netz, danach meist aus dem Browser-Speicher (übertragen fast 0). Laden blockiert den Hauptkern nicht.</p>'}

// ── Teams aus den Feldern ──
function wunsch(){return {seed:+q('#klErz').value>>>0,teams:{blau:{art:q('#klBArt').value,n:+q('#klBN').value,stufe:+q('#klBS').value},rot:{art:q('#klRArt').value,n:+q('#klRN').value,stufe:+q('#klRS').value}}}}
function artName(a){for(var i=0;i<ARTEN.length;i++)if(ARTEN[i][0]===a)return ARTEN[i][1];return a}

function spruch(e,teams){var blau=e.einheiten.filter(function(u){return u.team===0}),rot=e.einheiten.filter(function(u){return u.team===1}),
 tote=e.einheiten.filter(function(u){return u.tot}).length;
 if(e.sieger<0)return e.zeitAus?'Zeit abgelaufen. Beide Seiten haben sich lieber angestarrt. Das Publikum verlangt sein Geld zurück.':'Kein Sieger. Auch das ist eine Form von Frieden, nur langweiliger.';
 var s=e.sieger===0?'Blau':'Rot';
 if(!tote)return s+' gewinnt, und alle leben noch. Die Totengräber gehen hungrig nach Hause.';
 if(tote===e.einheiten.length-1)return s+' gewinnt. Ein Überlebender, viel Arbeit für den Sandrechen.';
 return s+' gewinnt. '+tote+(tote===1?' Toter':' Tote')+', die Arena ist zufrieden.'}

function ergebnisZeigen(e,wall,bild){var z=q('#klErg');var namen={};E.teams.blau.concat(E.teams.rot).forEach(function(t){namen[t.kaempfer.id]=t.kaempfer});
 var zeile=function(u){var k=namen[u.key]||{},z=u.tot?'tot':u.unten?'unten':'steht';
  return '<tr><td>'+(u.team?'Rot':'Blau')+'</td><td>'+esc(u.name||k.name)+'<br><small class="leise">'+esc(artName(u.art))+(k.rolle?' · '+esc(k.rolle):'')+' · KW '+kom(k.kw,0)+'</small></td><td>'+
   (u.tot?'<span class="witz">tot</span>':z)+'</td><td>'+(u.leben!=null?Math.round(u.leben):'-')+'</td><td>'+(u.verletzungen&&u.verletzungen.length?esc(u.verletzungen.slice(0,4).join(', '))+(u.verletzungen.length>4?' …':''):'-')+'</td><td>'+u.kills+'</td><td>'+esc(u.ursache||'')+'</td></tr>'};
 z.innerHTML='<p id="klUrteil"><b>'+esc(spruch(e))+'</b></p>'+
  '<p>'+amp(e.haengt?'rot':'gruen')+'Kampfdauer '+kom(e.zeit)+' s'+(e.zeitAus?' (Zeitgrenze)':'')+' · Rechenzeit im Kampfkern '+Math.round(e.rechenMs)+' ms · mit Hin und Zurück '+Math.round(wall)+' ms'+
  ' · '+(e.zeit*1000/Math.max(1,e.rechenMs)).toFixed(1).replace('.',',')+'× schneller als Echtzeit</p>'+
  '<p>'+amp(bild.p95!=null&&bild.p95<=33.3?'gruen':'rot')+'Bild des Hauptkerns währenddessen: p95 '+kom(bild.p95)+' ms, max '+kom(bild.max)+' ms über '+bild.bilder+' Bilder (Budget Handy 33,3 ms)</p>'+
  '<p class="leise">Fingerabdruck <span id="klAbdruck">'+KA.abdruck(e)+'</span> · Kampf-Seed '+e.seed+' · Erzeugungs-Seed '+E.auftrag.erzSeed+'</p>'+
  '<div style="overflow-x:auto"><table class="tabelle"><tr><th>Team</th><th>Kämpfer</th><th>Zustand</th><th>Leben</th><th>Verletzungen</th><th>Kills</th><th>Ursache</th></tr>'+
  e.einheiten.slice().sort(function(a,b){return a.team-b.team}).map(zeile).join('')+'</table></div>';
 q('#klNochmal').disabled=false}

function rechnen(){var z=q('#klErg'),w=wunsch(),seed=+q('#klSeed').value>>>0;q('#klNochmal').disabled=true;E.gleich=null;q('#klGleich').innerHTML='';
 z.innerHTML='<p class="leise">Die Käfige werden geöffnet … wer zuerst rauskommt, verliert meistens.</p>';
 var t0,stop;
 return kern().then(function(){return KA.erzeuge(w,'',V)}).then(function(teams){E.teams=teams;
  var a=KA.auftrag('labor-'+w.seed+'-'+seed+'-'+Date.now().toString(36),seed,teams,'Kampf-Labor');a.erzSeed=w.seed;E.auftrag=a;
  stop=bildMessung();t0=performance.now();return KA.rechne(a,'',V)})
 .then(function(e){var wall=performance.now()-t0,bild=stop();E.kampf={e:e,wall:wall,wunsch:w};E.bild=bild;ergebnisZeigen(e,wall,bild);window.AT3_KAMPFLABOR_ERGEBNIS=e})
 .catch(function(e){if(stop)stop();E.kampf={fehler:e.message};z.innerHTML='<p class="witz">Der Kampf ist im Kern stecken geblieben: '+esc(e.message)+'</p>'})}

// ── Nochmal gleich: derselbe Auftrag im selben Kern und in einem frisch gestarteten Kern ──
function nochmal(){var z=q('#klGleich');if(!E.kampf||!E.kampf.e)return Promise.resolve();var soll=KA.abdruck(E.kampf.e),R=[];
 z.innerHTML='<p class="leise">Derselbe Kampf noch zweimal. Die Toten sind einverstanden.</p>';
 return KA.rechne(E.auftrag,'',V).then(function(e){R.push({wo:'selber Kern',abdruck:KA.abdruck(e),ms:e.rechenMs});KA.beende();return kern()})
 .then(function(){return KA.rechne(E.auftrag,'',V)}).then(function(e){R.push({wo:'frischer Kern',abdruck:KA.abdruck(e),ms:e.rechenMs});
  var ok=R.every(function(r){return r.abdruck===soll});E.gleich={ok:ok,soll:soll,laeufe:R};
  z.innerHTML='<table class="tabelle"><tr><th>Lauf</th><th>Fingerabdruck</th><th>Rechenzeit</th><th></th></tr><tr><td>erster Lauf</td><td>'+soll+'</td><td>'+Math.round(E.kampf.e.rechenMs)+' ms</td><td></td></tr>'+
   R.map(function(r){return '<tr><td>'+r.wo+'</td><td>'+r.abdruck+'</td><td>'+Math.round(r.ms)+' ms</td><td>'+amp(r.abdruck===soll?'gruen':'rot')+'</td></tr>'}).join('')+'</table>'+
   '<p id="klGleichUrteil">'+amp(ok?'gruen':'rot')+(ok?'Dreimal derselbe Kampf. Das Schicksal ist zuverlässig.':'UNGLEICH: derselbe Auftrag hat einen anderen Kampf ergeben.')+'</p>';ladenZeigen()})
 .catch(function(e){E.gleich={ok:false,fehler:e.message};z.innerHTML='<p class="witz">Gleichheitsprobe abgebrochen: '+esc(e.message)+'</p>'})}

function neustart(){KA.beende();ladenZeigen();var z=q('#klLaden');z.insertAdjacentHTML('afterbegin','<p class="leise">Kampfkern wird neu geweckt …</p>');return kern().catch(function(e){z.innerHTML='<p class="witz">Kampfkern startet nicht: '+esc(e.message)+'</p>'})}

function text(){var L=['AT3 Kampf-Labor · '+navigator.userAgent,'Kerne gemeldet '+(navigator.hardwareConcurrency||1)];
 E.laden.forEach(function(l,i){L.push((i?'Neustart '+i:'Erster Start')+': bereit '+l.ms+' ms (im Kern '+Math.round(l.kernMs||0)+' ms), '+l.dateien+' Dateien, '+kb(l.bytes)+' übertragen, '+kb(l.entpackt)+' entpackt')});
 if(E.kampf){if(E.kampf.fehler)L.push('Kampf: Fehler '+E.kampf.fehler);else{var e=E.kampf.e,w=E.kampf.wunsch,t=w.teams;
  L.push('Kampf: Blau '+t.blau.n+'× '+artName(t.blau.art)+' Stufe '+t.blau.stufe+' gegen Rot '+t.rot.n+'× '+artName(t.rot.art)+' Stufe '+t.rot.stufe+' · Erzeugung '+w.seed+' · Seed '+e.seed);
  L.push('Ergebnis: Sieger '+(e.sieger<0?'keiner':e.sieger?'Rot':'Blau')+' · Dauer '+kom(e.zeit)+' s · Rechenzeit '+Math.round(e.rechenMs)+' ms · gesamt '+Math.round(E.kampf.wall)+' ms · Abdruck '+KA.abdruck(e));
  L.push('Hauptkern-Bild: p95 '+kom(E.bild.p95)+' ms, max '+kom(E.bild.max)+' ms ('+E.bild.bilder+' Bilder)')}}
 if(E.gleich)L.push('Nochmal gleich: '+(E.gleich.fehler||((E.gleich.ok?'ok':'UNGLEICH')+' '+E.gleich.laeufe.map(function(r){return r.wo+'='+r.abdruck}).join(', ')+' soll '+E.gleich.soll)));
 return L.join('\n')}
function kopieren(){var x=text(),k=q('#klKopie'),ok=function(){k.firstChild.nodeValue='Kopiert. In den Chat einfügen.'};
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(x).then(ok,alt);else alt();
 function alt(){var a=document.createElement('textarea');a.value=x;document.body.appendChild(a);a.select();try{document.execCommand('copy');ok()}catch(e){}a.remove()}}
function sperre(f){return function(){if(beschaeftigt)return Promise.resolve();beschaeftigt=true;var B=el.querySelectorAll('button[data-lauf]'),zu=[].map.call(B,function(b){return b.disabled});
 [].forEach.call(B,function(b){b.disabled=true});
 var fertig=function(){beschaeftigt=false;[].forEach.call(B,function(b,i){b.disabled=b.id==='klNochmal'?!(E.kampf&&E.kampf.e):false})};
 return Promise.resolve().then(f).then(fertig,fertig)}}

function aufbauen(ziel){el=ziel;
 var team=function(s,name,art,n,st){return '<h3 class="aTitel">Team '+name+'</h3><div class="wZeile">'+wahl('kl'+s+'Art',ARTEN,art)+wahl('kl'+s+'N',zahlen(1,10),n)+
  wahl('kl'+s+'S',STUFEN.map(function(t,i){return [i,'Stufe '+t]}),st)+'</div>'};
 el.innerHTML='<p>Zwei Teams rein, einer raus. Gerechnet wird mit der echten Kampfmechanik aus Arena Theory 1.0, im eigenen Kampfkern.</p>'+
  '<p class="leise">Alle Kämpfer hier sind Testkämpfer („labor“) ohne Herkunft in der Welt. Stufe heißt bei allen Arten: so stark wie ein Mensch dieser Stufe (Kampfwert 33 + 14 × Stufe). Ein Löwe gegen einen Menschen derselben Stufe ist also fair. Sagt die Rechnung.</p>'+
  team('B','Blau','human',3,2)+team('R','Rot','human',3,2)+
  '<div class="wZeile"><label>Erzeugung <input id="klErz" type="number" inputmode="numeric" min="0" value="'+wurf()+'" style="font:inherit;width:9em"></label>'+
  '<label>Kampf-Seed <input id="klSeed" type="number" inputmode="numeric" min="0" value="'+wurf()+'" style="font:inherit;width:9em"></label>'+
  '<button class="knopf klein" id="klWurf">Würfeln</button></div>'+
  '<p><button class="knopf haupt" id="klRechnen" data-lauf>Kampf rechnen<small>Kämpfer erzeugen und den Kampf im Kampfkern rechnen</small></button></p>'+
  '<div id="klErg"></div>'+
  '<p><button class="knopf klein" id="klNochmal" data-lauf disabled>Nochmal gleich</button> <span class="leise">gleicher Auftrag im selben und in einem frischen Kern</span></p><div id="klGleich"></div>'+
  '<h3 class="aTitel">Ladezeit des Kampfkerns</h3><div id="klLaden"></div>'+
  '<p><button class="knopf klein" id="klNeu" data-lauf>Kern neu starten</button></p>'+
  '<p><button class="knopf" id="klKopie">Werte für den Chat kopieren<small>Ladezeit, Kampf, Gleichheit, Bildzeit</small></button></p>';
 ladenZeigen();
 q('#klWurf').onclick=function(){q('#klErz').value=wurf();q('#klSeed').value=wurf()};
 q('#klRechnen').onclick=sperre(rechnen);q('#klNochmal').onclick=sperre(nochmal);q('#klNeu').onclick=sperre(neustart);q('#klKopie').onclick=kopieren;
 return Promise.resolve()}

window.AT3_KAMPFLABOR={aufbauen:aufbauen,ergebnis:E,text:text,rechnen:function(){return rechnen()},nochmal:function(){return nochmal()},neustart:function(){return neustart()}};
})();
