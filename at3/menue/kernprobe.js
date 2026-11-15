// WAS DIE DATEI TUT: „Kernprobe“ im AT3-Master-Editor (Menü Prüfen & Kosten, Schritt G2; wird erst beim Antippen geladen, zusammen mit kernstart.js).
// Prüft den Spielkern auf diesem Gerät: 1. Gleichheit (dieselbe Befehlsfolge mit 0, 1, 2 und 4 Helferkernen ergibt denselben Fingerabdruck),
// 2. Uhr (Pause, 1×, 2×, 3× gegen die echte Zeit), 3. Volllast (Welt rechnet am Anschlag, dabei wird das Bild des Hauptkerns gemessen).
// Kerne: Welt im Weltkern, Aufträge in den Helferkernen; der Hauptkern zeichnet hier nur 256 Punkte je Bild und misst sein Bildintervall.
// Wiederverwendet: kernstart.js (derselbe Anschluss wie im Spiel), Messart aus dem Prüfstand (p95), Kopierknopf wie in der begehbaren Probe.
(function(){
'use strict';
var SEED=563520, BIS=300, SOLL='545082ba';   // SOLL = Fingerabdruck aus tests/at3-kern.cjs; muss auf jedem Gerät gleich herauskommen
var SKRIPT=[{tick:0,art:'last',wert:2000},{tick:40,art:'last',wert:5000},{tick:80,art:'tempo',wert:3},{tick:120,art:'last',wert:500},{tick:160,art:'neu',wert:7},{tick:170,art:'last',wert:3000}];
var E={gleich:null,uhr:null,last:null}, el=null, live=null, beschaeftigt=false;
function q(s){return el.querySelector(s)}
function kom(v,n){return v==null?'-':v.toFixed(n==null?1:n).replace('.',',')}
function p(L,x){if(!L.length)return null;var s=L.slice().sort(function(a,b){return a-b});return s[Math.min(s.length-1,Math.floor(x*s.length))]}
function warte(ms){return new Promise(function(r){setTimeout(r,ms)})}
function amp(f){return '<i class="amp '+f+'"></i>'}
function kerne(){return navigator.hardwareConcurrency||1}
function start(opt){return new Promise(function(ok,nein){opt.beiBereit=function(){ok(H)};opt.beiAusfall=function(g){nein(new Error(g))};var H=AT3KERNE.starten(opt)})}

// ── 1. Gleichheit ──
function gleichheit(){var z=q('#kpGleichErg'),R=[];z.innerHTML='<p class="leise">Vier Welten werden gezählt … hoffentlich kommt viermal dasselbe heraus.</p>';
 return [0,1,2,4].reduce(function(k,h){return k.then(function(){return start({helfer:h,seed:1}).then(function(H){return H.lauf(SEED,SKRIPT,BIS).then(function(r){H.ende();R.push({helfer:h,abdruck:r.abdruck,ms:r.ms,ticks:r.ticks,selbst:r.selbst,fremd:r.fremd})})})})},Promise.resolve())
 .then(function(){var gleich=R.every(function(r){return r.abdruck===R[0].abdruck}),soll=R[0].abdruck===SOLL;E.gleich={ok:gleich&&soll,gleich:gleich,soll:soll,laeufe:R};
  var h='<table class="tabelle"><tr><th>Helfer</th><th>Fingerabdruck</th><th>Dauer</th><th>Aufträge Helfer / Weltkern</th></tr>';
  R.forEach(function(r){h+='<tr><td>'+r.helfer+'</td><td>'+r.abdruck+'</td><td>'+Math.round(r.ms)+' ms</td><td>'+r.fremd+' / '+r.selbst+'</td></tr>'});
  z.innerHTML=h+'</table><p id="kpGleichUrteil">'+amp(E.gleich.ok?'gruen':'rot')+(gleich?'Alle vier gleich':'UNGLEICH')+' · '+(soll?'stimmt mit dem Sollwert '+SOLL+' überein (jedes Gerät muss ihn liefern)':'weicht vom Sollwert '+SOLL+' ab')+
   ' · '+BIS+' Ticks, '+SKRIPT.length+' Befehle</p>'})
 .catch(function(e){E.gleich={ok:false,fehler:e.message};z.innerHTML='<p class="witz">Ein Kern hat sich verzählt und ist gegangen: '+e.message+'</p>'})}

// ── 2. Uhr ──
function uhr(){var z=q('#kpUhrErg'),R=[],H;z.innerHTML='<p class="leise">Die Uhr wird gestellt … rund 11 Sekunden.</p>';
 function phase(tempo,ms){H.befehl('tempo',tempo);return warte(400).then(function(){var g0=H.zustand.gesamt,t0=performance.now();return warte(ms).then(function(){
  var ist=(H.zustand.gesamt-g0)*1000/(performance.now()-t0),soll=20*tempo;R.push({tempo:tempo,ist:ist,soll:soll,ok:tempo?Math.abs(ist-soll)<=soll*.06:ist===0})})})}
 return start({seed:1}).then(function(h){H=h;H.befehl('last',1000);return phase(1,2400)}).then(function(){return phase(2,2400)}).then(function(){return phase(3,2400)}).then(function(){return phase(0,1200)})
 .then(function(){H.ende();E.uhr={ok:R.every(function(r){return r.ok}),phasen:R};
  var h='<table class="tabelle"><tr><th>Tempo</th><th>Soll Ticks/s</th><th>Ist</th><th></th></tr>';
  R.forEach(function(r){h+='<tr><td>'+(r.tempo?r.tempo+'×':'Pause')+'</td><td>'+r.soll+'</td><td>'+kom(r.ist)+'</td><td>'+amp(r.ok?'gruen':'rot')+'</td></tr>'});
  z.innerHTML=h+'</table><p id="kpUhrUrteil">'+amp(E.uhr.ok?'gruen':'rot')+(E.uhr.ok?'Uhr stimmt (Abweichung höchstens 6 %, Pause steht).':'Uhr weicht ab.')+'</p>'})
 .catch(function(e){if(H)H.ende();E.uhr={ok:false,fehler:e.message};z.innerHTML='<p class="witz">Die Uhr ist stehen geblieben: '+e.message+'</p>'})}

// ── 3. Volllast: Welt läuft, Hauptkern zeichnet 256 Punkte und misst sein Bildintervall ──
function liveEnde(){if(live){live.H.ende();live=null}}
function liveStart(){liveEnde();var cv=q('#kpCv'),c=cv.getContext('2d'),L={H:null,vor:new Int32Array(512),nun:new Int32Array(512),n:0,tNun:0,bilder:[],letzt:null,mess:null,tempo:1,tot:false};live=L;
 var hw=q('#kpHelfer').value;
 return start({seed:1,helfer:hw==='auto'?null:+hw,beiBild:function(Z,b,kopf,n){L.vor.set(L.nun);for(var i=0;i<2*n;i++)L.nun[i]=b[kopf+i];if(n!==L.n){L.vor.set(L.nun);L.n=n}L.tNun=performance.now();L.tempo=Z.tempo}})
 .then(function(H){L.H=H;if(live!==L){H.ende();return}H.befehl('last',+q('#kpLast').value);H.befehl('tempo',+q('#kpTempo').value);
  var s=cv.width/16384;
  function bild(ts){if(live!==L)return;if(!el.isConnected){liveEnde();return}
   if(L.letzt!=null&&L.mess)L.mess.push(ts-L.letzt);L.letzt=ts;
   var a=L.tempo?Math.min(1,(performance.now()-L.tNun)/(50/L.tempo)):1;
   c.fillStyle='#0e0c0b';c.fillRect(0,0,cv.width,cv.height);c.fillStyle='#d8c499';
   for(var i=0;i<L.n;i++){var x=L.vor[2*i]+(L.nun[2*i]-L.vor[2*i])*a,y=L.vor[2*i+1]+(L.nun[2*i+1]-L.vor[2*i+1])*a;c.fillRect((x*s)|0,(y*s)|0,2,2)}
   if(!(L.zaehl=(L.zaehl||0)+1&15)){var Z=H.zustand;q('#kpLive').innerHTML='Helfer '+Z.helfer+' · Einheiten '+Z.einheiten+' · Tempo '+(Z.tempo?Z.tempo+'×':'Pause')+' · Welt-Tick Mittel '+kom(Z.mittelUs/1000,2)+' ms, p95 '+kom(Z.p95Us/1000,2)+
    ' ms · verlorene Ticks '+Z.verloren+(Z.ueber?' · <span class="witz">Welt kommt nicht nach</span>':'')}
   requestAnimationFrame(bild)}
  requestAnimationFrame(bild);return L})}
function lastMessen(ms){var z=q('#kpLastErg');z.innerHTML='<p class="leise">Die Welt schwitzt, der Hauptkern schaut zu … '+Math.round(ms/1000)+' Sekunden.</p>';
 return liveStart().then(function(L){return warte(1500).then(function(){var H=L.H,g0=H.zustand.gesamt,v0=H.zustand.verloren,t0=performance.now();L.mess=[];
  return warte(ms).then(function(){var B=L.mess,Z=H.zustand,dt=performance.now()-t0;L.mess=null;
   var r={helfer:Z.helfer,einheiten:Z.einheiten,tempo:Z.tempo,bildP95:p(B,.95),bildP99:p(B,.99),bilder:B.length,weltMittel:Z.mittelUs/1000,weltP95:Z.p95Us/1000,
    ticksIst:(Z.gesamt-g0)*1000/dt,ticksSoll:20*Z.tempo,verloren:Z.verloren-v0};
   r.bildOk=r.bildP95!=null&&r.bildP95<=33.3;r.weltOk=r.weltP95<=10;E.last=r;
   z.innerHTML='<p id="kpLastUrteil">'+amp(r.bildOk?'gruen':'rot')+'<b>Bild des Hauptkerns:</b> p95 '+kom(r.bildP95)+' ms, p99 '+kom(r.bildP99)+' ms über '+r.bilder+' Bilder (Budget Handy 33,3 ms)</p>'+
    '<p>'+amp(r.weltOk?'gruen':'gelb')+'<b>Welt-Tick:</b> Mittel '+kom(r.weltMittel,2)+' ms, p95 '+kom(r.weltP95,2)+' ms (Budget 10 ms je Tick) · '+r.einheiten+' Einheiten, '+r.helfer+' Helfer, Tempo '+r.tempo+'×</p>'+
    '<p>'+amp(r.verloren?'gelb':'gruen')+'<b>Uhr unter Last:</b> '+kom(r.ticksIst)+' von '+r.ticksSoll+' Ticks/s, verlorene Ticks '+r.verloren+(r.verloren?' (Welt zu langsam für dieses Tempo: Uhr läuft langsamer, nichts wird übersprungen)':'')+'</p>'})})})
 .catch(function(e){E.last={fehler:e.message};z.innerHTML='<p class="witz">Unter der Last zusammengebrochen: '+e.message+'</p>'})}

function text(){var L=['AT3 Kernprobe · '+navigator.userAgent,'Kerne gemeldet '+kerne()+' · Helfer im Spiel '+AT3KERNE.helferZahl(kerne())];
 if(E.gleich)L.push('Gleichheit: '+(E.gleich.fehler||((E.gleich.ok?'ok':'FEHLER')+' '+E.gleich.laeufe.map(function(r){return r.helfer+'H='+r.abdruck+' '+Math.round(r.ms)+'ms'}).join(', ')+' soll '+SOLL)));
 if(E.uhr)L.push('Uhr: '+(E.uhr.fehler||((E.uhr.ok?'ok':'FEHLER')+' '+E.uhr.phasen.map(function(r){return r.tempo+'x='+kom(r.ist)+'/'+r.soll}).join(', '))));
 if(E.last)L.push('Volllast: '+(E.last.fehler||('Bild p95 '+kom(E.last.bildP95)+' p99 '+kom(E.last.bildP99)+' ms ('+E.last.bilder+' Bilder) · Welt-Tick Mittel '+kom(E.last.weltMittel,2)+' p95 '+kom(E.last.weltP95,2)+' ms · '+
  E.last.einheiten+' Einheiten, '+E.last.helfer+' Helfer, '+E.last.tempo+'x · Ticks '+kom(E.last.ticksIst)+'/'+E.last.ticksSoll+' · verloren '+E.last.verloren)));
 return L.join('\n')}
function kopieren(){var x=text(),k=q('#kpKopie'),ok=function(){k.firstChild.nodeValue='Kopiert. In den Chat einfügen.'};
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(x).then(ok,alt);else alt();
 function alt(){var a=document.createElement('textarea');a.value=x;document.body.appendChild(a);a.select();try{document.execCommand('copy');ok()}catch(e){}a.remove()}}
function sperre(f){return function(){if(beschaeftigt)return;beschaeftigt=true;[].forEach.call(el.querySelectorAll('button[data-lauf]'),function(b){b.disabled=true});
 var fertig=function(){beschaeftigt=false;if(el)[].forEach.call(el.querySelectorAll('button[data-lauf]'),function(b){b.disabled=false})};
 return Promise.resolve().then(f).then(fertig,fertig)}}

function aufbauen(ziel){el=ziel;liveEnde();var k=kerne(),h=AT3KERNE.helferZahl(k);
 el.innerHTML='<p>Hier wird geprüft, ob die Welt auch dann dieselbe bleibt, wenn mehrere Knechte gleichzeitig rechnen. Bei Menschen klappt das nie.</p>'+
  '<p class="leise" id="kpGeraet">Dieses Gerät meldet '+k+' Kerne. Das Spiel nimmt: 1 Hauptkern (Bild), 1 Weltkern, '+h+' Helfer'+(h?'':' (der Weltkern rechnet die Aufträge selbst in kleinen Scheiben)')+'.</p>'+
  '<p><button class="knopf haupt" id="kpAlles" data-lauf>Alles auf diesem Gerät messen<small>Gleichheit, Uhr, Volllast mit 100.000 Einheiten bei 3× · rund 30 Sekunden</small></button></p>'+
  '<h3 class="aTitel">1. Gleichheit</h3><p class="leise">Dieselbe Befehlsfolge mit 0, 1, 2 und 4 Helferkernen. Der Fingerabdruck muss viermal gleich sein.</p>'+
  '<p><button class="knopf klein" id="kpGleich" data-lauf>Gleichheit prüfen</button></p><div id="kpGleichErg"></div>'+
  '<h3 class="aTitel">2. Uhr</h3><p class="leise">1×, 2×, 3× und Pause gegen die echte Zeit. Soll: 20, 40, 60 und 0 Ticks je Sekunde.</p>'+
  '<p><button class="knopf klein" id="kpUhr" data-lauf>Uhr prüfen</button></p><div id="kpUhrErg"></div>'+
  '<h3 class="aTitel">3. Volllast</h3><p class="leise">Die Welt rechnet im Hintergrund, der Hauptkern zeichnet nur die ersten 256 Einheiten. Das Bild muss flüssig bleiben, auch wenn die Welt nicht mehr nachkommt.</p>'+
  '<div class="wZeile"><select id="kpLast" aria-label="Last"><option value="0">0 Einheiten</option><option value="1000">1.000 Einheiten</option><option value="10000">10.000 Einheiten</option><option value="100000" selected>100.000 Einheiten</option><option value="1000000">1.000.000 Einheiten (Anschlag, 20 MB)</option></select>'+
  '<select id="kpHelfer" aria-label="Helfer"><option value="auto" selected>Helfer wie im Spiel ('+h+')</option><option value="0">0 Helfer</option><option value="1">1 Helfer</option><option value="2">2 Helfer</option><option value="4">4 Helfer</option></select>'+
  '<select id="kpTempo" aria-label="Tempo"><option value="1">Tempo 1×</option><option value="2">Tempo 2×</option><option value="3" selected>Tempo 3×</option><option value="0">Pause</option></select></div>'+
  '<p><button class="knopf klein" id="kpZeigen" data-lauf>Ansehen</button> <button class="knopf klein" id="kpMessen" data-lauf>10 Sekunden messen</button> <button class="knopf klein" id="kpHalt">Anhalten</button></p>'+
  '<canvas id="kpCv" class="pixel" width="256" height="256" style="display:block;width:100%;max-width:384px;background:#0e0c0b;border:3px solid var(--rand)"></canvas>'+
  '<p class="leise" id="kpLive">Noch steht die Welt still.</p><div id="kpLastErg"></div>'+
  '<p><button class="knopf" id="kpKopie">Werte für den Chat kopieren<small>Gleichheit, Uhr und Volllast als kurzer Text</small></button></p>';
 q('#kpGleich').onclick=sperre(gleichheit);q('#kpUhr').onclick=sperre(uhr);
 q('#kpZeigen').onclick=sperre(function(){return liveStart().catch(function(e){q('#kpLive').innerHTML='<span class="witz">Kein Hintergrundkern: '+e.message+'</span>'})});
 q('#kpMessen').onclick=sperre(function(){return lastMessen(10000)});q('#kpHalt').onclick=function(){liveEnde();q('#kpLive').textContent='Angehalten. Die Welt hält die Luft an.'};
 q('#kpAlles').onclick=sperre(function(){q('#kpLast').value='100000';q('#kpTempo').value='3';q('#kpHelfer').value='auto';
  return gleichheit().then(uhr).then(function(){return lastMessen(10000)}).then(function(){liveEnde();window.AT3_KERNPROBE_FERTIG=true})});
 q('#kpKopie').onclick=kopieren;
 [].forEach.call(el.querySelectorAll('#kpLast,#kpTempo'),function(s){s.onchange=function(){if(live&&live.H)live.H.befehl(s.id==='kpLast'?'last':'tempo',+s.value)}});
 return Promise.resolve()}

window.AT3_KERNPROBE={aufbauen:aufbauen,ergebnis:E,text:text,gleichheit:function(){return gleichheit()},uhr:function(){return uhr()},lastMessen:function(ms){return lastMessen(ms)},ende:liveEnde,SOLL:SOLL};
})();
