// WAS DIE DATEI TUT: „Riesenwelt-Probe“ im AT3-Master-Editor (Menü Prüfen & Kosten, Schritt MK1; wird erst beim Antippen geladen, zusammen mit kernstart.js).
// Misst auf diesem Gerät, wie groß Welt und Nationenzahl sein dürfen: 1. Laststufen 10 bis 10.000 Platzhalter-Nationen (100.000 als Anschlag),
// 2. Weltgröße 9.600² gegen 307.200² Felder, 3. Helferkerne 0/1/2/4/6 (Gleichheit und Durchsatz), 4. Dauerlauf bis 30 Minuten mit Wärme-Urteil.
// Noch ohne Inhalt: Nationen und Gelände sind Platzhalter (riesenwelt.js). Thomas legt nach den Zahlen die Zielgröße fest.
// Kerne: Nationen und Kartenstücke rechnen in den Helferkernen, Übernahme im Weltkern; der Hauptkern zeichnet hier nur ein 56 × 56 Bild und misst sein Bildintervall.
// Wiederverwendet: kernstart.js (derselbe Anschluss wie im Spiel), Messart, Ampel und Kopierknopf aus der Kernprobe (G2).
(function(){
'use strict';
var SEED=563520, BIS=300, SOLL='ca5f4b07';   // SOLL = Fingerabdruck aus tests/at3-riesenwelt.cjs; muss auf jedem Gerät gleich herauskommen
var SKRIPT=[{tick:0,art:'welt',wert:4800},{tick:0,art:'reise',wert:2},{tick:0,art:'nationen',wert:1000},{tick:30,art:'anteil',wert:256},{tick:60,art:'last',wert:500},
 {tick:90,art:'nationen',wert:300},{tick:120,art:'welt',wert:150},{tick:150,art:'anteil',wert:1024},{tick:200,art:'tempo',wert:3},{tick:240,art:'nationen',wert:10}];
var VOLL=[{tick:0,art:'welt',wert:4800},{tick:0,art:'reise',wert:2},{tick:0,art:'anteil',wert:4096},{tick:0,art:'nationen',wert:100000},{tick:0,art:'last',wert:10000}], VOLL_BIS=600;
var STUFEN=[10,100,1000,10000,100000], MIB=1048576;
var FARBE=[[38,58,92],[58,92,128],[200,180,120],[214,190,110],[150,150,80],[66,110,50],[70,90,70],[170,180,170],[120,112,104],[236,236,230]];
var E={stufen:null,welt:null,helfer:null,dauer:null}, el=null, aktiv=null, beschaeftigt=false, abbruch=false, bilder=null, sperrSchirm=null;
function q(s){return el.querySelector(s)}
function kom(v,n){return v==null||isNaN(v)?'-':v.toFixed(n==null?1:n).replace('.',',')}
function tsd(v){return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g,'.')}
function mb(b){return b>=MIB/10?kom(b/MIB,b>=10*MIB?0:1)+' MB':kom(b/1024,0)+' KB'}
function p(L,x){if(!L.length)return null;var s=L.slice().sort(function(a,b){return a-b});return s[Math.min(s.length-1,Math.floor(x*s.length))]}
function warte(ms){return new Promise(function(r){setTimeout(r,ms)})}
function amp(f){return '<i class="amp '+f+'"></i>'}
function kerne(){return navigator.hardwareConcurrency||1}
function helferListe(){var L=[0,1,2,4];if(kerne()>=8)L.push(6);return L}
function dauerText(s){return s<90?kom(s,s<10?1:0)+' s':s<5400?kom(s/60,1)+' min':kom(s/3600,1)+' h'}
function start(opt){return new Promise(function(ok,nein){opt.beiBereit=function(){ok(H)};opt.beiAusfall=function(g){nein(new Error(g))};var H=AT3KERNE.starten(opt)})}
function ende(){if(aktiv){aktiv.ende();aktiv=null}bilder=null}

// Bild des Hauptkerns: Fenster der Probekamera (7 × 7 Kartenstücke, je 8 × 8 Punkte). Grau = Stück noch nicht da (Ersatz statt Lücke).
function zeige(d){var cv=q('#rwCv');if(!cv)return;
 if(d.bild){var c=cv.getContext('2d'),im=zeige.im||(zeige.im=c.createImageData(56,56)),px=im.data;
  for(var i=0;i<3136;i++){var f=FARBE[d.bild[i]]||[92,86,80];px[4*i]=f[0];px[4*i+1]=f[1];px[4*i+2]=f[2];px[4*i+3]=255}c.putImageData(im,0,0)}
 q('#rwLive').textContent=tsd(d.zahl)+' Nationen · '+tsd(d.schritte)+' Schritte gerechnet'+(d.seite?' · Kamera bei Stück '+d.kx+'/'+d.ky+' von '+tsd(d.seite)+'² · '+tsd(d.stFertig)+' Stücke erzeugt, '+d.stImSpeicher+' im Speicher':'')+' · Speicher '+mb(d.bytes)}
function bildSchleife(){var letzt=null;function b(ts){if(!aktiv||!el.isConnected){if(!el.isConnected)ende();return}if(letzt!=null&&bilder)bilder.push(ts-letzt);letzt=ts;requestAnimationFrame(b)}requestAnimationFrame(b)}

// ── Eine Messung: Welt läuft im Takt, gemessen über ms ──
function messe(o){var rw=null,H;
 function stand(){var Z=H.zustand;return{t:performance.now(),gesamt:Z.gesamt,verloren:Z.verloren,rw:rw||{schritte:0,stFertig:0,nUs:0,nJobs:0,sUs:0,sJobs:0,warteMs:0,warteMal:0,bytes:0,setzMs:0}}}
 return start({seed:1,helfer:o.helfer,beiRw:function(d){zeige(d);var k={};for(var n in d)if(n!=='bild')k[n]=d[n];rw=k}}).then(function(h){H=aktiv=h;bildSchleife();
  H.befehl('welt',o.seite);H.befehl('reise',o.seite?2:0);H.befehl('anteil',o.anteil);H.befehl('nationen',o.n);if(o.last)H.befehl('last',o.last);H.befehl('tempo',o.tempo);
  return warte(o.vor||1500)}).then(function(){var a=stand(),teile=[],T=[];bilder=[];
  function teil(){var b=stand(),B=bilder,Z=H.zustand,dt=(b.t-a.t)/1000;bilder=[];
   var r={helfer:Z.helfer,n:o.n,anteil:o.anteil,seite:o.seite,tempo:o.tempo,sek:dt,ticksIst:(b.gesamt-a.gesamt)/dt,ticksSoll:20*o.tempo,verloren:b.verloren-a.verloren,weltP95:Z.p95Us/1000,weltMittel:Z.mittelUs/1000,
    bildP95:p(B,.95),bildP99:p(B,.99),bildN:B.length,schritteJeS:(b.rw.schritte-a.rw.schritte)/dt,stJeS:(b.rw.stFertig-a.rw.stFertig)/dt,
    stMs:b.rw.sJobs>a.rw.sJobs?(b.rw.sUs-a.rw.sUs)/(b.rw.sJobs-a.rw.sJobs)/1000:null,nMs:b.rw.nJobs>a.rw.nJobs?(b.rw.nUs-a.rw.nUs)/(b.rw.nJobs-a.rw.nJobs)/1000:null,
    wartet:(b.rw.warteMs-a.rw.warteMs)/(dt*10),bytes:b.rw.bytes,setzMs:b.rw.setzMs};
   r.runde=r.schritteJeS>0?o.n/r.schritteJeS:null;a=b;return r}
  if(!o.jeTeil)return warte(o.ms).then(function(){return teil()});
  var n=Math.round(o.ms/o.jeTeil),k=0;
  return (function weiter(){if(k>=n||abbruch||!el.isConnected)return T;return warte(o.jeTeil).then(function(){var r=teil();k++;T.push(r);if(o.beiTeil)o.beiTeil(r,k,n);return weiter()})})()})
 .then(function(r){if(!aktiv)return r;return H.rwStand().then(function(s){ende();if(s&&!o.jeTeil){r.stand=s.stand;r.standMs=s.ms}else if(s)r.stand=s;return r})},function(e){ende();throw e})}
function urteil(r){return{bild:r.bildP95!=null&&r.bildP95<=33.3,welt:r.weltP95<=10,uhr:r.ticksIst>=r.ticksSoll*.94&&r.wartet<5,
 stand:!r.stand||r.stand.roh<=5*MIB,speicher:r.bytes<=128*MIB}}
function farbe(u){return u.bild&&u.welt&&u.uhr?(u.stand&&u.speicher?'gruen':'gelb'):'rot'}

// ── 1. Laststufen ──
function stufen(ms){var z=q('#rwStufenErg'),R=[],L=STUFEN.filter(function(n){return n<100000||q('#rwAnschlag').checked});abbruch=false;
 function zeigen(laeuft){var h='<table class="tabelle"><tr><th></th><th>Nationen</th><th>Welt-Tick p95</th><th>Bild p95</th><th>Runde</th><th>Speicher</th><th>Spielstand</th></tr>';
  R.forEach(function(r){var u=urteil(r);h+='<tr><td>'+amp(farbe(u))+'</td><td>'+tsd(r.n)+(r.n>=100000?'*':'')+'</td><td>'+kom(r.weltP95,2)+' ms</td><td>'+kom(r.bildP95)+' ms</td><td>'+(r.runde==null?'-':dauerText(r.runde*r.tempo))+'</td><td>'+mb(r.bytes)+'</td><td>'+mb(r.stand.roh)+'</td></tr>'});
  z.innerHTML=h+'</table>'+(laeuft?'<p class="leise">'+laeuft+'</p>':'<p class="leise">Runde = Spielzeit, bis jede Nation einmal gerechnet wurde (bei 1×). Mehr Nationen kosten nicht mehr Rechenzeit je Tick, sie warten nur länger. * = Anschlag, über dem Plan. Spielstand = alle Nationen roh, es wird nichts gespeichert.</p>'+
   '<p id="rwStufenUrteil">'+amp(R.every(function(r){return farbe(urteil(r))!=='rot'})?'gruen':'rot')+'Welt-Tick bei '+tsd(R[0].n)+' und '+tsd(R[R.length-1].n)+' Nationen: '+kom(R[0].weltP95,2)+' / '+kom(R[R.length-1].weltP95,2)+' ms (Budget 10 ms). '+
   'Gelb heißt: läuft, aber Spielstand über 5 MiB oder Speicher über 128 MiB.</p>')}
 return L.reduce(function(k,n){return k.then(function(){if(abbruch)return;zeigen(tsd(n)+' Nationen werden gezählt … die meisten davon mehrfach besteuert.');
  return messe({n:n,anteil:1024,seite:4800,tempo:3,ms:ms}).then(function(r){R.push(r)})})},Promise.resolve())
 .then(function(){E.stufen=R;if(R.length)zeigen()}).catch(function(e){E.stufen={fehler:e.message};z.innerHTML='<p class="witz">Die Welt ist untergegangen, bevor jemand zählen konnte: '+e.message+'</p>'})}

// ── 2. Weltgröße: 2.0 gegen AT3 ──
function weltgroesse(ms){var z=q('#rwWeltErg'),R=[];abbruch=false;z.innerHTML='<p class="leise">Zwei Welten, eine 1.024-mal so groß. Der Vermesser bekommt denselben Lohn.</p>';
 return [150,4800].reduce(function(k,s){return k.then(function(){return messe({n:1000,anteil:1024,seite:s,tempo:3,ms:ms}).then(function(r){R.push(r)})})},Promise.resolve())
 .then(function(){var a=R[0],b=R[1],ok=b.bytes<=a.bytes*1.25+65536&&b.weltP95<=Math.max(a.weltP95*1.5,a.weltP95+1);E.welt={ok:ok,klein:a,gross:b};
  var h='<table class="tabelle"><tr><th>Welt</th><th>Stück rechnen</th><th>Stücke/s</th><th>Welt-Tick p95</th><th>Speicher</th></tr>';
  R.forEach(function(r){h+='<tr><td>'+tsd(r.seite*64)+'²</td><td>'+kom(r.stMs,2)+' ms</td><td>'+kom(r.stJeS)+'</td><td>'+kom(r.weltP95,2)+' ms</td><td>'+mb(r.bytes)+'</td></tr>'});
  z.innerHTML=h+'</table><p id="rwWeltUrteil">'+amp(ok?'gruen':'rot')+(ok?'Die große Welt kostet dasselbe wie die kleine: im Speicher liegen nie mehr als 49 Kartenstücke, der Rest ist nur der Seed.':'Die große Welt ist teurer als die kleine. Das darf nicht sein.')+
   ' <span class="leise">Platzhalter-Gelände; der echte Weltgenerator (W1) wird je Stück mehr rechnen.</span></p>'})
 .catch(function(e){E.welt={ok:false,fehler:e.message};z.innerHTML='<p class="witz">Der Vermesser ist von der Karte gefallen: '+e.message+'</p>'})}

// ── 3. Helferkerne: derselbe Ablauf so schnell wie möglich, mit 0, 1, 2, 4 (und 6) Helfern ──
function helfer(){var z=q('#rwHelferErg'),R=[];z.innerHTML='<p class="leise">Die Knechte treten einzeln an, dann zu zweit, dann im Rudel.</p>';
 return helferListe().reduce(function(k,h){return k.then(function(){return start({helfer:h,seed:1}).then(function(H){aktiv=H;bildSchleife();
  return H.lauf(SEED,SKRIPT,BIS).then(function(g){bilder=[];return H.lauf(SEED,VOLL,VOLL_BIS).then(function(v){var B=bilder;ende();
   R.push({helfer:h,abdruck:g.abdruck,voll:v.abdruck,ms:v.ms,ticksJeS:VOLL_BIS*1000/v.ms,bildP95:p(B,.95),fremd:v.fremd,selbst:v.selbst})})})})})},Promise.resolve())
 .then(function(){var gleich=R.every(function(r){return r.abdruck===R[0].abdruck&&r.voll===R[0].voll}),soll=R[0].abdruck===SOLL,best=R.slice().sort(function(a,b){return b.ticksJeS-a.ticksJeS})[0];
  var spiel=AT3KERNE.helferZahl(kerne()),knapp=R.filter(function(r){return r.ticksJeS>=best.ticksJeS*.9})[0];
  E.helfer={ok:gleich&&soll,gleich:gleich,soll:soll,laeufe:R,beste:best.helfer,genug:knapp.helfer,spiel:spiel};
  var h='<table class="tabelle"><tr><th>Helfer</th><th>Fingerabdruck</th><th>Ticks/s möglich</th><th>Bild p95</th></tr>';
  R.forEach(function(r){h+='<tr><td>'+r.helfer+(r.helfer===spiel?' (Spiel)':'')+'</td><td>'+r.abdruck+'</td><td>'+tsd(r.ticksJeS)+'</td><td>'+kom(r.bildP95)+' ms</td></tr>'});
  z.innerHTML=h+'</table><p id="rwHelferUrteil">'+amp(E.helfer.ok?'gruen':'rot')+(gleich?'Alle Läufe gleich':'UNGLEICH')+' · '+(soll?'Sollwert '+SOLL+' stimmt':'weicht vom Sollwert '+SOLL+' ab')+
   ' · schnellster Lauf mit '+best.helfer+' Helfern, ab '+knapp.helfer+' Helfern sind 90 % davon erreicht.</p>'+
   '<p class="leise">Durchsatz = 100.000 Nationen, 4.096 je Tick, 10.000 Einheiten, wandernde Kamera, ohne Bremse. Das Spiel braucht 20 bis 60 Ticks/s. Mehr Helfer sind nicht automatisch schneller: jeder Auftrag kostet Botenlohn.</p>'})
 .catch(function(e){ende();E.helfer={ok:false,fehler:e.message};z.innerHTML='<p class="witz">Ein Knecht ist mit der Kasse durchgebrannt: '+e.message+'</p>'})}

// ── 4. Dauerlauf mit Wärme-Urteil ──
function akku(){return navigator.getBattery?navigator.getBattery().then(function(b){return{stand:Math.round(b.level*100),laedt:b.charging}},function(){return null}):Promise.resolve(null)}
function wach(an){try{if(an&&navigator.wakeLock)navigator.wakeLock.request('screen').then(function(s){sperrSchirm=s},function(){});else if(!an&&sperrSchirm){sperrSchirm.release();sperrSchirm=null}}catch(e){}}
function dauerlauf(ms,jeTeil){var z=q('#rwDauerErg'),n=+q('#rwDauerN').value,weg=0,a0=null;abbruch=false;
 function sicht(){if(document.visibilityState==='hidden')weg++;else wach(true)}
 document.addEventListener('visibilitychange',sicht);wach(true);
 z.innerHTML='<p class="leise" id="rwDauerLauf">Der Ofen wird angeheizt …</p>';
 return akku().then(function(a){a0=a;return messe({n:n,anteil:1024,seite:4800,tempo:3,last:10000,ms:ms,jeTeil:jeTeil,vor:2000,beiTeil:function(r,k,von){var t=q('#rwDauerLauf');
   if(t)t.textContent='Abschnitt '+k+' von '+von+' · Welt-Tick p95 '+kom(r.weltP95,2)+' ms · Bild p95 '+kom(r.bildP95)+' ms · '+kom(r.ticksIst)+' von '+r.ticksSoll+' Ticks/s'}})})
 .then(function(T){return akku().then(function(a1){var st=T.stand;
  if(!T.length){E.dauer={fehler:'abgebrochen'};z.innerHTML='<p class="witz">Abgebrochen, bevor es warm wurde.</p>';return}
  var k=Math.max(1,Math.min(2,T.length>>1)),A=T.slice(0,k),B=T.slice(-k),mit=function(L,f){return L.reduce(function(s,r){return s+r[f]},0)/L.length};
  var d={n:n,sek:T.reduce(function(s,r){return s+r.sek},0),teile:T.length,jeTeil:jeTeil,ticksA:mit(A,'ticksIst'),ticksB:mit(B,'ticksIst'),weltA:mit(A,'weltP95'),weltB:mit(B,'weltP95'),bildA:mit(A,'bildP95'),bildB:mit(B,'bildP95'),
   bildMax:Math.max.apply(null,T.map(function(r){return r.bildP99||0})),verloren:T.reduce(function(s,r){return s+r.verloren},0),soll:T[0].ticksSoll,helfer:T[0].helfer,bytes:T[T.length-1].bytes,stand:st&&st.stand,
   akkuA:a0,akkuB:a1,weg:weg,abgebrochen:abbruch,urteil:null};
  d.abfall=d.weltA>0?(d.weltB/d.weltA-1)*100:0;d.ok=d.bildB<=33.3&&d.weltB<=10&&d.ticksB>=d.soll*.94;E.dauer=d;
  z.innerHTML='<table class="tabelle"><tr><th></th><th>Anfang</th><th>Ende</th></tr><tr><td>Welt-Tick p95</td><td>'+kom(d.weltA,2)+' ms</td><td>'+kom(d.weltB,2)+' ms</td></tr>'+
   '<tr><td>Bild p95</td><td>'+kom(d.bildA)+' ms</td><td>'+kom(d.bildB)+' ms</td></tr><tr><td>Ticks/s (Soll '+d.soll+')</td><td>'+kom(d.ticksA)+'</td><td>'+kom(d.ticksB)+'</td></tr>'+
   (a0&&a1?'<tr><td>Akku</td><td>'+a0.stand+' %</td><td>'+a1.stand+' %'+(a1.laedt?' (lädt)':'')+'</td></tr>':'')+'</table>'+
   '<p id="rwDauerUrteil">'+amp(d.ok?(d.abfall>25?'gelb':'gruen'):'rot')+dauerText(d.sek)+' mit '+tsd(n)+' Nationen, 10.000 Einheiten, Tempo 3×, '+d.helfer+' Helfern. Welt-Tick am Ende '+(d.abfall>=0?'+':'')+kom(d.abfall,0)+' % gegenüber dem Anfang'+
   (d.abfall>25?' (das Gerät bremst, vermutlich wegen Wärme)':'')+'. Verlorene Ticks '+d.verloren+'.'+(weg?' <span class="witz">'+weg+'× war die Seite im Hintergrund, dann steht die Welt: Messung ungenau.</span>':'')+(abbruch?' Vorzeitig beendet.':'')+'</p>'+
   '<p>Wie fühlt sich das Gerät an? <span class="leise">Das kann nur deine Hand messen.</span></p><p><button class="knopf klein" data-warm="kühl">kühl</button> <button class="knopf klein" data-warm="warm">warm</button> <button class="knopf klein" data-warm="heiß">heiß</button> <span id="rwWarm" class="leise"></span></p>';
  [].forEach.call(z.querySelectorAll('[data-warm]'),function(b){b.onclick=function(){d.urteil=b.dataset.warm;q('#rwWarm').textContent='Notiert: '+d.urteil+'.'+(d.urteil==='heiß'?' Der Sklave am Blasebalg bittet um Ablösung.':'')}})})})
 .catch(function(e){E.dauer={fehler:e.message};z.innerHTML='<p class="witz">Der Dauerläufer ist umgefallen: '+e.message+'</p>'})
 .then(function(){document.removeEventListener('visibilitychange',sicht);wach(false)})}

function text(){var L=['AT3 Riesenwelt-Probe (MK1) · '+navigator.userAgent,'Kerne gemeldet '+kerne()+' · Helfer im Spiel '+AT3KERNE.helferZahl(kerne())+(navigator.deviceMemory?' · Gerätespeicher '+navigator.deviceMemory+' GB':'')];
 if(E.stufen)L.push('Stufen (1024/Tick, 3x, Welt 307200²): '+(E.stufen.fehler||E.stufen.map(function(r){return '\n '+r.n+' Nat: Tick p95 '+kom(r.weltP95,2)+' Mittel '+kom(r.weltMittel,2)+' ms, Bild p95 '+kom(r.bildP95)+' p99 '+kom(r.bildP99)+' ms, Ticks '+kom(r.ticksIst)+'/'+r.ticksSoll+
  ', wartet '+kom(r.wartet)+' %, Runde '+(r.runde==null?'-':dauerText(r.runde*r.tempo))+', Auftrag '+kom(r.nMs,3)+' ms, Stueck '+kom(r.stMs,2)+' ms, Speicher '+mb(r.bytes)+', Stand roh '+mb(r.stand.roh)+' gepackt '+mb(r.stand.gepackt)+' ('+kom(r.standMs)+' ms), Setzen '+kom(r.setzMs)+' ms'}).join('')));
 if(E.welt)L.push('Weltgroesse: '+(E.welt.fehler||((E.welt.ok?'ok':'FEHLER')+' '+[E.welt.klein,E.welt.gross].map(function(r){return (r.seite*64)+'²: Stueck '+kom(r.stMs,2)+' ms, '+kom(r.stJeS)+'/s, Tick p95 '+kom(r.weltP95,2)+' ms, '+mb(r.bytes)}).join(' | '))));
 if(E.helfer)L.push('Helfer: '+(E.helfer.fehler||((E.helfer.ok?'ok':'FEHLER')+' soll '+SOLL+' '+E.helfer.laeufe.map(function(r){return r.helfer+'H='+r.abdruck+' '+Math.round(r.ticksJeS)+' Ticks/s Bild p95 '+kom(r.bildP95)}).join(', ')+' · beste '+E.helfer.beste+', genug '+E.helfer.genug)));
 if(E.dauer){var d=E.dauer;L.push('Dauerlauf: '+(d.fehler||(dauerText(d.sek)+' '+d.n+' Nat + 10000 Einheiten 3x '+d.helfer+'H · Tick p95 '+kom(d.weltA,2)+' -> '+kom(d.weltB,2)+' ms ('+kom(d.abfall,0)+' %) · Bild p95 '+kom(d.bildA)+' -> '+kom(d.bildB)+' ms, max p99 '+kom(d.bildMax)+
  ' · Ticks '+kom(d.ticksA)+' -> '+kom(d.ticksB)+'/'+d.soll+' · verloren '+d.verloren+' · Akku '+(d.akkuA&&d.akkuB?d.akkuA.stand+' -> '+d.akkuB.stand+' %'+(d.akkuB.laedt?' (laedt)':''):'unbekannt')+' · Hintergrund '+d.weg+'x · Waerme: '+(d.urteil||'nicht angegeben')+(d.abgebrochen?' · vorzeitig beendet':''))))}
 return L.join('\n')}
function kopieren(){var x=text(),k=q('#rwKopie'),ok=function(){k.firstChild.nodeValue='Kopiert. In den Chat einfügen.'};
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(x).then(ok,alt);else alt();
 function alt(){var a=document.createElement('textarea');a.value=x;document.body.appendChild(a);a.select();try{document.execCommand('copy');ok()}catch(e){}a.remove()}}
function sperre(f){return function(){if(beschaeftigt)return;beschaeftigt=true;[].forEach.call(el.querySelectorAll('button[data-lauf]'),function(b){b.disabled=true});
 var fertig=function(){beschaeftigt=false;if(el)[].forEach.call(el.querySelectorAll('button[data-lauf]'),function(b){b.disabled=false})};
 return Promise.resolve().then(f).then(fertig,fertig)}}

function aufbauen(ziel){el=ziel;ende();var k=kerne(),h=AT3KERNE.helferZahl(k);
 el.innerHTML='<p>Hier wird ausprobiert, wie viel Welt in ein Handy passt, bevor es anfängt zu rauchen. Noch ohne Inhalt: Die Nationen sind Strohpuppen, das Land ist Kulisse.</p>'+
  '<p class="leise" id="rwGeraet">Dieses Gerät meldet '+k+' Kerne. Das Spiel nimmt: 1 Hauptkern (Bild), 1 Weltkern, '+h+' Helfer. Welt: 307.200 × 307.200 Felder (4.800 × 4.800 Kartenstücke), davon liegen nie mehr als 49 im Speicher.</p>'+
  '<p><button class="knopf haupt" id="rwAlles" data-lauf>Alles auf diesem Gerät messen<small>Laststufen, Weltgröße, Helferkerne · rund 2 Minuten · danach den Dauerlauf starten</small></button></p>'+
  '<canvas id="rwCv" class="pixel" width="56" height="56" style="display:block;width:224px;height:224px;background:#5c5650;border:3px solid var(--rand)"></canvas>'+
  '<p class="leise" id="rwLive">Noch ist die Welt wüst und leer.</p>'+
  '<h3 class="aTitel">1. Laststufen: 10 bis 10.000 Nationen</h3><p class="leise">Jede Nation ist ein Datensatz von 256 Byte. Je Tick wird ein fester Anteil gerechnet (1.024), verteilt auf die Helfer. Tempo 3×, dazu wandert und springt eine Probekamera durch die große Welt.</p>'+
  '<p><label><input type="checkbox" id="rwAnschlag" checked> auch 100.000 Nationen als Anschlag (26 MB)</label></p>'+
  '<p><button class="knopf klein" id="rwStufen" data-lauf>Laststufen messen</button></p><div id="rwStufenErg"></div>'+
  '<h3 class="aTitel">2. Weltgröße</h3><p class="leise">Dieselbe Last auf der Karte von 2.0 (9.600²) und auf der Karte von 3.0 (307.200², 1.024-fache Fläche). Beides muss gleich viel kosten.</p>'+
  '<p><button class="knopf klein" id="rwWelt" data-lauf>Weltgröße vergleichen</button></p><div id="rwWeltErg"></div>'+
  '<h3 class="aTitel">3. Helferkerne</h3><p class="leise">Derselbe Ablauf mit '+helferListe().join(', ')+' Helfern'+(k>=8?'':' (6 erst ab 8 gemeldeten Kernen)')+'. Der Fingerabdruck muss gleich bleiben; gemessen wird, wie viele Ticks je Sekunde möglich wären.</p>'+
  '<p><button class="knopf klein" id="rwHelfer" data-lauf>Helferkerne vergleichen</button></p><div id="rwHelferErg"></div>'+
  '<h3 class="aTitel">4. Dauerlauf und Wärme</h3><p class="leise">Volle Last über lange Zeit: Nationen, 10.000 Einheiten, Tempo 3×. Handy nicht laden, Bildschirm anlassen (die Seite hält ihn wach), Seite vorn lassen. Am Ende fragt die Seite, wie warm das Gerät ist.</p>'+
  '<div class="wZeile"><select id="rwDauerN" aria-label="Nationen"><option value="1000">1.000 Nationen</option><option value="10000" selected>10.000 Nationen</option><option value="100000">100.000 Nationen (Anschlag)</option></select>'+
  '<select id="rwDauerMin" aria-label="Dauer"><option value="1">1 Minute (Probe)</option><option value="5">5 Minuten</option><option value="30" selected>30 Minuten</option></select></div>'+
  '<p><button class="knopf klein" id="rwDauer" data-lauf>Dauerlauf starten</button> <button class="knopf klein" id="rwHalt">Anhalten</button></p><div id="rwDauerErg"></div>'+
  '<p><button class="knopf" id="rwKopie">Werte für den Chat kopieren<small>alle Messungen dieser Seite als kurzer Text</small></button></p>';
 q('#rwStufen').onclick=sperre(function(){return stufen(6000)});q('#rwWelt').onclick=sperre(function(){return weltgroesse(8000)});q('#rwHelfer').onclick=sperre(helfer);
 q('#rwDauer').onclick=sperre(function(){var m=+q('#rwDauerMin').value;return dauerlauf(m*60000,m===1?10000:60000)});
 q('#rwHalt').onclick=function(){abbruch=true};
 q('#rwAlles').onclick=sperre(function(){return stufen(6000).then(function(){return weltgroesse(8000)}).then(helfer).then(function(){window.AT3_RIESEN_FERTIG=true})});
 q('#rwKopie').onclick=kopieren;
 return Promise.resolve()}

window.AT3_RIESEN={aufbauen:aufbauen,ergebnis:E,text:text,stufen:function(ms){return stufen(ms)},weltgroesse:function(ms){return weltgroesse(ms)},helfer:function(){return helfer()},
 dauerlauf:function(ms,je){return dauerlauf(ms,je)},messe:messe,ende:ende,SOLL:SOLL};
})();
