// WAS DIE DATEI TUT: AT3 Master-Editor, Menü „Prüfen & Kosten“ (Schritt M6): Prüfstand und Übernahme. Objektliste mit Ampel und Status (Skizze → geprüft → übernommen),
// Prüfer (Bild, beide Ansichten, Karte, englische Texte), Lastszene mit vielen Stück in Kartenansicht und First Person, Messung 4× gedrosselt (jedes Bild 4× gerechnet)
// und „auf diesem Gerät messen“ (ungedrosselt, dazu Kerne und echte Leistung eines Hintergrundkerns), Budgets aus kartei/budgets.json, Übernahme nur bei gültiger Messung,
// Export als Objekt- und Kartei-Datei. Jedes Messbild läuft in einem eigenen requestAnimationFrame, die Seite blockiert nie länger als ein Messbild.
// Wiederverwendet: Prüfer aus at3-64.js (M2–M5) und karte.js (M4), Entwürfe aus der Werkstatt (localStorage at3-werkstatt-v1), Hintergrundkern als Blob-Worker wie im Zwei-Kerne-Test (1.0, nur als Vorbild kopiert).
var AT3_PRUEF=(function(){
'use strict';
var OBJ='at3-werkstatt-v1',TXT='at3-texte-v1',KW=640,KH=360,FW=320,FH=180,HORIZONT=96,BILDER=36,WARM=6;
var P={el:null,repo:{},texte:{},B:null,o:null,laeuft:false,letzte:null};
function S(){return window.AT3_64}
function K(){return window.AT3_KARTE}
function $(s){return P.el.querySelector(s)}
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function meld(t,schlecht){var m=$('#pMeld');m.textContent=t;m.className=schlecht?'witz':'leise'}
function lies(k){try{return JSON.parse(localStorage.getItem(k))||{}}catch(e){return{}}}
function schreib(k,d){try{localStorage.setItem(k,JSON.stringify(d));return true}catch(e){return false}}
function kopie(o){return JSON.parse(JSON.stringify(o))}
function entwuerfe(){return lies(OBJ).objekte||{}}
function alleTexte(){var t={},a=P.texte,b=lies(TXT).texte||{};Object.keys(a).forEach(function(k){t[k]=a[k]});Object.keys(b).forEach(function(k){t[k]=b[k]});return t}
function objekt(id){var d=entwuerfe();return d[id]?kopie(d[id]):P.repo[id]?kopie(P.repo[id]):null}
function ids(){var m={};Object.keys(P.repo).forEach(function(i){m[i]=1});Object.keys(entwuerfe()).forEach(function(i){m[i]=1});return Object.keys(m).sort()}
var STATUSNAME={skizze:'Skizze',geprueft:'geprüft',uebernommen:'übernommen'},AMPELNAME={gruen:'grün',gelb:'gelb',rot:'rot',keine:'nicht gemessen',alt:'veraltet'};
// Ampel eines Objekts: gedrosselte Messung zählt, eine rote Gerätemessung macht rot. Veraltete Messung (Bild geändert) = grau.
function ampel(o){var s=S(),sig=s.signatur(o);if(!o.messung)return{ampel:'keine',gruende:['noch nicht gemessen']};
 if(o.messung.sig!==sig)return{ampel:'alt',gruende:['Bild geändert, neu messen']};
 var b=s.bewerte(o.messung,P.B,o.kat);
 if(o.geraet&&o.geraet.sig===sig){var g=s.bewerte(o.geraet,P.B,o.kat);if(g.ampel==='rot')return{ampel:'rot',gruende:b.gruende.concat(g.gruende.map(function(x){return'Gerät: '+x}))}}
 return b}

function aufbauen(el){
 P.el=el;
 el.innerHTML='<h2>Prüfstand</h2><p class="leise">Erst wiegen, dann einlassen. Was über dem Budget liegt, bleibt draußen, egal wie hübsch es ist.</p>'+
  '<div class="wZeile"><button class="knopf klein haupt" id="pAlle">Alle messen &amp; übernehmen</button><button class="knopf klein" id="pAlleKop">Alle Messungen für den Chat kopieren</button></div>'+
  '<p id="pAlleMeld" class="leise"></p><textarea id="pAlleText" hidden readonly rows="4" style="width:100%"></textarea>'+
  '<div id="pListe" class="pListe"></div>'+
  '<div id="pObj" hidden><h3 id="pName"></h3><p id="pInfo" class="leise"></p>'+
  '<div class="wZeile"><button class="knopf klein" id="pPruef">Prüfen</button><button class="knopf klein" id="pMess">Messen (4× gedrosselt)</button>'+
  '<button class="knopf klein" id="pGer">Auf diesem Gerät messen</button><button class="knopf klein haupt" id="pUeb">Übernehmen</button></div>'+
  '<p id="pMeld" class="leise"></p>'+
  '<div class="kSzene"><canvas id="pCv" class="pixel" width="'+KW+'" height="'+KH+'"></canvas></div>'+
  '<div id="pBericht"></div>'+
  '<div class="wZeile"><button class="knopf klein" id="pExpO">Objekt-Datei</button><button class="knopf klein" id="pExpK">Kartei-Datei</button><button class="knopf klein" id="pKop">Für den Chat kopieren</button></div></div>'+
  '<details class="pBudget"><summary>Budgetliste</summary><div id="pBudget"></div></details>';
 $('#pPruef').onclick=pruefen;$('#pMess').onclick=function(){messen(false)};$('#pGer').onclick=function(){messen(true)};$('#pUeb').onclick=uebernehmen;
 $('#pAlle').onclick=alle;$('#pAlleKop').onclick=alleKopieren;
 $('#pExpO').onclick=function(){exportiere('objekt')};$('#pExpK').onclick=function(){exportiere('kartei')};$('#pKop').onclick=kopieren;
 var k=AT3ED.kartei()||{objekte:[]};
 return Promise.all([AT3ED.lade('pruefen','kartei/budgets.json'),AT3ED.lade('pruefen','kartei/text-en.json')].concat((k.objekte||[]).map(function(e){
  return AT3ED.lade('pruefen','kartei/'+e.datei).then(function(o){P.repo[o.id]=o},function(){})}))).then(function(r){
  P.B=r[0];P.texte=(r[1]&&r[1].texte)||{};budgetZeigen();liste()})}

function budgetZeigen(){var B=P.B,h='<table class="tabelle"><tr><th>Gruppe</th><th>Datei</th><th>Karte</th><th>First Person</th></tr>';
 Object.keys(B.gruppen).forEach(function(k){var g=B.gruppen[k],st=function(x){return x?x.stufen.join(' / ')+' Stück ≤ '+x.ms+' ms':'–'};
  h+='<tr><td>'+esc(g.name)+'<br><span class="leise">'+g.kats.join(', ')+'</span></td><td>'+(g.datei/1024)+' KB</td><td>'+st(g.karte)+'</td><td>'+st(g.fp)+'</td></tr>'});
 $('#pBudget').innerHTML=h+'</table><p class="leise">Gemessen wird die größte Stufe, p95 der Bildzeit, '+B.drossel+'× gedrosselt (jedes Bild '+B.drossel+'× gerechnet). Vorbereiteter Bildspeicher je Objekt höchstens '+(B.bildspeicher/1024)+' KB. Gelb ab 75 %. '+esc(B.stand)+'</p>'}

function liste(){var h=ids().map(function(id){var o=objekt(id),a=ampel(o);
  return '<button class="knopf pZeile'+(P.o&&P.o.id===id?' an':'')+'" data-id="'+esc(id)+'"><i class="amp '+a.ampel+'" title="'+AMPELNAME[a.ampel]+'"></i>'+esc(o.name||id)+
   '<small>'+esc(id)+' · '+esc(o.kat)+' · '+(STATUSNAME[o.status]||o.status)+' · Ampel '+AMPELNAME[a.ampel]+'</small></button>'}).join('');
 $('#pListe').innerHTML=h||'<p class="leise">Keine Objekte. Leerer Prüfstand, leere Arena.</p>';
 [].forEach.call(P.el.querySelectorAll('.pZeile'),function(b){b.onclick=function(){waehlen(b.dataset.id)}})}

function waehlen(id){if(P.laeuft)return;P.o=objekt(id);if(!P.o)return;$('#pObj').hidden=false;liste();zeigen();meld('');
 vorschau()}
function zeigen(){var s=S(),o=P.o,a=ampel(o),g=s.budgetGruppe(P.B,o.kat);
 $('#pName').innerHTML='<i class="amp '+a.ampel+'"></i>'+esc(o.name||o.id);
 $('#pInfo').textContent=o.id+' · Version '+o.version+' · Art '+o.kat+' · Gruppe '+(g?g.name:'keine')+' · Status '+(STATUSNAME[o.status]||o.status)+' · Datei '+s.dateiBytes(o)+' B'+(g?' von '+g.datei+' B':'');
 $('#pUeb').disabled=o.status==='uebernommen';bericht()}
function zeile(m,a){var g=S().budgetGruppe(P.B,P.o.kat),b=g&&g[a];if(!m||!m[a]||!b)return a==='fp'&&!b?'<tr><td>First Person</td><td colspan="2" class="leise">kein Budget (Boden, Ware)</td></tr>':'';
 return m[a].map(function(x){return'<tr><td>'+(a==='karte'?'Karte':'First Person')+' '+x.n+' Stück</td><td class="'+(x.n===b.stufen[b.stufen.length-1]?(x.p95>b.ms?'witz':''):'leise')+'">p95 '+x.p95.toFixed(2)+' ms · max '+x.max.toFixed(2)+' ms</td><td class="leise">Budget '+b.ms+' ms</td></tr>'}).join('')}
function bericht(){var o=P.o,s=S(),sig=s.signatur(o),h='',a=ampel(o);
 [['messung','Gedrosselt ('+(o.messung&&o.messung.drossel||P.B.drossel)+'×)'],['geraet','Auf dem Gerät']].forEach(function(w){var m=o[w[0]];if(!m)return;
  var alt=m.sig!==sig,b=alt?{ampel:'alt',gruende:['Bild geändert']}:s.bewerte(m,P.B,o.kat);
  h+='<h3><i class="amp '+b.ampel+'"></i>'+w[1]+'</h3><p class="leise">'+esc(m.datum)+(m.geraet?' · '+esc(m.geraet):'')+(alt?' · veraltet':'')+'</p><table class="tabelle">'+zeile(m,'karte')+zeile(m,'fp')+
   '<tr><td>Vorbereitung</td><td>'+m.vorbereitungMs.toFixed(1)+' ms</td><td class="leise">einmal je Objekt</td></tr><tr><td>Bildspeicher</td><td>'+(m.bildspeicher/1024).toFixed(1)+' KB</td><td class="leise">Budget '+(P.B.bildspeicher/1024)+' KB</td></tr></table>'+
   (m.kerne?'<p>Kerne laut Gerät: '+m.kerne.gemeldet+'. Ein Hintergrundkern schafft '+Math.round(m.kerne.einer*100)+' % des Hauptkerns; '+m.kerne.parallel+' Hintergrundkerne zusammen '+m.kerne.zusammen.toFixed(1).replace('.',',')+'× den Hauptkern.</p>':'')+
   (b.gruende.length?'<p class="'+(b.ampel==='rot'?'witz':'leise')+'">'+esc(b.gruende.join('; '))+'.</p>':'')});
 $('#pBericht').innerHTML=h||'<p class="leise">Noch nicht gemessen. '+(a.ampel==='keine'?'Die Waage wartet.':'')+'</p>'}

// ---------- Prüfer ----------
function pruefer(o){var s=S(),f=s.pruefeObjekt(o).concat(K().pruefeKarte(o,alleTexte()));if(!s.budgetGruppe(P.B,o.kat))f.push('keine Budgetgruppe');return f}
function pruefen(){var o=P.o,f=pruefer(o);
 if(f.length){if(o.status!=='skizze'){o.status='skizze';speichern()}zeigen();liste();return meld('Prüfer: '+f.join('; ')+'. Bleibt Skizze.',1)}
 if(o.status==='skizze'){o.status='geprueft';speichern()}zeigen();liste();meld(o.status==='uebernommen'?'Prüfer: alles in Ordnung, bleibt übernommen.':'Geprüft: Bild, beide Ansichten, Karte und Texte in Ordnung. Jetzt messen.')}
function uebernehmen(){var o=P.o,s=S(),f=pruefer(o);
 if(f.length)return meld('Nicht übernommen. Prüfer: '+f.join('; ')+'.',1);
 if(o.status==='skizze')return meld('Erst „Prüfen“, dann übernehmen.',1);
 var sig=s.signatur(o);if(!o.messung||o.messung.sig!==sig)return meld('Nicht übernommen: erst messen (4× gedrosselt).',1);
 var a=ampel(o);if(a.ampel==='rot')return meld('Nicht übernommen, über Budget: '+a.gruende.join('; ')+'.',1);
 o.status='uebernommen';var rest=s.ladbar(o,P.B);if(rest.length){o.status='geprueft';return meld('Nicht übernommen: '+rest.join('; ')+'.',1)}
 speichern();zeigen();liste();meld('Übernommen. Das Spiel darf es laden, sobald Objekt- und Kartei-Datei im Repository liegen.'+(o.geraet&&o.geraet.sig===sig?'':' Tipp: einmal auf dem Handy messen.'))}

// ---------- Lastszene ----------
function zufall(seed){var x=seed>>>0||1;return function(){x^=x<<13;x>>>=0;x^=x>>>17;x^=x<<5;x>>>=0;return x/4294967296}}
// Alle Bilder eines Objekts frisch vorbereiten (eigene Kopien, kein Cache) und Zeit sowie Speicher zählen. Verweise ohne Spiegeln kosten nichts.
function vorbereiten(o){var s=S(),R=s.RICHTUNGEN[o.kat]||1,t=performance.now(),gesehen=[],cv=[],byte=0,karte=[],fp=null;
 function cvon(b){var i=gesehen.indexOf(b);if(i>=0)return cv[i];var c=s.zuCanvas(kopie(b),s.PALETTE);gesehen.push(b);cv.push(c);byte+=b.w*b.h*4;return c}
 for(var r=0;r<R;r++){var b=s.richtungsBild(o,r);if(b)karte.push({c:cvon(b),b:b})}
 if(o.kat!=='boden'&&o.fp){var n=s.fpBild(o,'nah'),f=s.fpBild(o,'fern');if(n&&f)fp={nah:{c:cvon(n),b:n},fern:{c:cvon(f),b:f}}}
 return{karte:karte,fp:fp,ms:performance.now()-t,bytes:byte}}
function szeneKarte(V,n,seed){var z=zufall(seed),L=[],fw=S().FELD.w,fh=S().FELD.h,boden=P.o.kat==='boden';
 if(boden){var sp=Math.ceil(Math.sqrt(n)),k=V.karte[0];for(var i=0;i<n;i++){var gx=i%sp,gy=Math.floor(i/sp);L.push({c:k.c,x:Math.round(KW/2+(gx-gy)*KW/(2*sp)-k.b.ax),y:Math.round(16+(gx+gy)*(KH-32)/(2*sp)-k.b.ay)})}}
 else for(var j=0;j<n;j++){var q=V.karte[j%V.karte.length],x=z()*KW,y=24+z()*(KH-24);L.push({c:q.c,x:Math.round(x-q.b.ax),y:Math.round(y-q.b.ay),s:y})}
 if(!boden)L.sort(function(a,b){return a.s-b.s});return L}
function szeneFp(V,n,seed){var z=zufall(seed),L=[];
 for(var i=0;i<n;i++){var d=1+z()*19,ab=(z()-.5)*2*d*0.9,s=2/d,nah=d<6,q=nah?V.fp.nah:V.fp.fern,k=nah?s:s*2,w=Math.max(1,Math.round(q.b.w*k)),h=Math.max(1,Math.round(q.b.h*k)),
  fx=FW/2+ab/d*FW*0.5,fy=HORIZONT+(FH-HORIZONT)*(1.2/d);L.push({c:q.c,x:Math.round(fx-w/2),y:Math.round(fy-h),w:w,h:h,d:d})}
 L.sort(function(a,b){return b.d-a.d});return L}
function malKarte(c,L){var x=c.getContext('2d');x.fillStyle=S().PALETTEN[S().PALETTE].farben[14];x.fillRect(0,0,KW,KH);for(var i=0;i<L.length;i++)x.drawImage(L[i].c,L[i].x,L[i].y)}
function malFp(c,L){var x=c.getContext('2d'),f=S().PALETTEN[S().PALETTE].farben;x.imageSmoothingEnabled=false;x.fillStyle=f[61];x.fillRect(0,0,FW,HORIZONT);x.fillStyle=f[16];x.fillRect(0,HORIZONT,FW,FH-HORIZONT);
 for(var i=0;i<L.length;i++){var e=L[i];x.drawImage(e.c,e.x,e.y,e.w,e.h)}}
function bild(){return new Promise(function(ok){requestAnimationFrame(function(){ok()})})}
function p95(a){var b=a.slice().sort(function(x,y){return x-y});return b[Math.min(b.length-1,Math.floor(b.length*.95))]}
// Eine Stufe messen: BILDER Messbilder, je eines pro requestAnimationFrame, jedes Bild faktor× gerechnet. getImageData zwingt den Browser, wirklich fertig zu zeichnen.
function stufe(cv,mal,L,faktor){var t=[],i=0,x=cv.getContext('2d');
 function eins(){var a=performance.now();for(var k=0;k<faktor;k++)mal(cv,L);x.getImageData(0,0,1,1);var d=performance.now()-a;if(i++>=WARM)t.push(d)}
 function weiter(){if(i>=BILDER+WARM)return Promise.resolve({n:L.length,p95:p95(t),max:Math.max.apply(null,t)});return bild().then(function(){eins();return weiter()})}
 return weiter()}
function vorschau(){var V=vorbereiten(P.o),g=S().budgetGruppe(P.B,P.o.kat),cv=$('#pCv');if(!g||!V.karte.length)return;cv.width=KW;cv.height=KH;malKarte(cv,szeneKarte(V,g.karte.stufen[0],7))}

// ---------- Kerne (nur „auf diesem Gerät“) ----------
var ARBEIT='function arbeit(ms){var t=performance.now(),n=0,x=1;while(performance.now()-t<ms){for(var i=0;i<20000;i++)x=(x*1103515245+12345)|0;n++}return n+(x===7?1:0)}';
function hauptRate(){var n=0,ms=0,i=0,arbeit=new Function(ARBEIT+';return arbeit')();
 function weiter(){if(i++>=12)return Promise.resolve(n/ms);return bild().then(function(){var a=performance.now();n+=arbeit(6);ms+=performance.now()-a;return weiter()})}return weiter()}
function worker(ms){return new Promise(function(ok){var w;try{w=new Worker(URL.createObjectURL(new Blob([ARBEIT+';onmessage=function(e){var a=performance.now(),n=arbeit(e.data);postMessage(n/(performance.now()-a))}'],{type:'text/javascript'})))}catch(e){return ok(null)}
 var zu=setTimeout(function(){w.terminate();ok(null)},ms+3000);w.onmessage=function(e){clearTimeout(zu);w.terminate();ok(e.data)};w.onerror=function(){clearTimeout(zu);w.terminate();ok(null)};w.postMessage(ms)})}
function kerne(){var g=navigator.hardwareConcurrency||1,p=Math.max(1,Math.min(8,g-1));
 return hauptRate().then(function(h){return worker(250).then(function(e){
  var L=[];for(var i=0;i<p;i++)L.push(worker(400));return Promise.all(L).then(function(a){var sum=0,ok=0;a.forEach(function(x){if(x){sum+=x;ok++}});
   return{gemeldet:g,einer:e&&h?e/h:0,parallel:ok,zusammen:h?sum/h:0}})})})}

function messen(geraet){if(P.laeuft)return;var o=P.o,s=S(),g=s.budgetGruppe(P.B,o.kat);
 if(!g)return meld('Keine Budgetgruppe für Art „'+o.kat+'“.',1);
 var f=s.pruefeObjekt(o);if(f.length)return meld('Erst die Prüferfehler beheben: '+f.join('; ')+'.',1);
 var faktor=geraet?1:P.B.drossel,V=vorbereiten(o),cv=$('#pCv'),erg={sig:s.signatur(o),datum:new Date().toISOString().slice(0,16).replace('T',' '),drossel:faktor,
  datei:s.dateiBytes(o),bildspeicher:V.bytes,vorbereitungMs:V.ms,karte:[],fp:[]},plan=[];
 g.karte.stufen.forEach(function(n,i){plan.push(['karte',n,i])});if(g.fp&&V.fp)g.fp.stufen.forEach(function(n,i){plan.push(['fp',n,i])});
 if(geraet)erg.geraet=(navigator.userAgent.match(/\(([^)]*)\)/)||['',''])[1].slice(0,60);
 P.laeuft=true;[].forEach.call(P.el.querySelectorAll('#pObj button'),function(b){b.disabled=true});var t0=performance.now();
 var kette=Promise.resolve();plan.forEach(function(p){kette=kette.then(function(){
  meld((geraet?'Miss auf diesem Gerät: ':'Miss gedrosselt: ')+(p[0]==='karte'?'Karte':'First Person')+' mit '+p[1]+' Stück …');
  var fpS=p[0]==='fp';cv.width=fpS?FW:KW;cv.height=fpS?FH:KH;cv.classList.toggle('fp',fpS);
  return stufe(cv,fpS?malFp:malKarte,fpS?szeneFp(V,p[1],11+p[2]):szeneKarte(V,p[1],7+p[2]),faktor).then(function(r){erg[p[0]].push(r)})})});
 if(geraet)kette=kette.then(function(){meld('Zähle die Kerne und lasse einen Hintergrundkern schwitzen …');return kerne().then(function(k){erg.kerne=k})});
 return kette.then(function(){P.laeuft=false;var b=s.bewerte(erg,P.B,o.kat);erg.ampel=b.ampel;
  if(geraet)o.geraet=erg;else o.messung=erg;speichern();
  if(geraet&&b.ampel==='rot'&&o.status==='uebernommen'){o.status='geprueft';speichern()}
  zeigen();liste();meld((b.ampel==='rot'?'Über Budget. ':b.ampel==='gelb'?'Knapp im Budget. ':'Im Budget. ')+'Gemessen in '+((performance.now()-t0)/1000).toFixed(1).replace('.',',')+' s.'+
   (b.ampel==='rot'?' '+b.gruende.join('; ')+'.':''),b.ampel==='rot')}).catch(function(e){P.laeuft=false;zeigen();meld('Messung abgebrochen: '+e.message,1)}).then(function(){
  [].forEach.call(P.el.querySelectorAll('#pObj button'),function(b){b.disabled=false});if(P.o)$('#pUeb').disabled=P.o.status==='uebernommen'})}

// ---------- Alle auf einmal (M9, für das Messen am Handy) ----------
// Geht alle noch nicht übernommenen Objekte der Reihe nach durch, genau wie von Hand: Prüfen → Messen (4× gedrosselt) → Übernehmen, wenn nicht rot.
// Jede Messung läuft wie bisher Bild für Bild (kein Dauerblock). Noch einmal antippen bricht nach dem laufenden Objekt ab.
function alle(){if(P.alle){P.alle=2;return}if(P.laeuft)return;var L=ids().filter(function(id){return objekt(id).status!=='uebernommen'}),n=0,ok=0,rot=0,m=$('#pAlleMeld');
 if(!L.length){m.textContent='Alles schon übernommen. Nichts zu tun, ein seltener Zustand.';return}
 P.alle=1;$('#pAlle').textContent='Abbrechen';
 function ende(t){P.alle=0;$('#pAlle').textContent='Alle messen & übernehmen';liste();m.textContent=t+' Übernommen: '+ok+', über Budget: '+rot+', von '+L.length+'. Jetzt „Alle Messungen für den Chat kopieren“.'}
 function naechstes(){if(P.alle===2)return ende('Abgebrochen.');if(n>=L.length)return ende('Fertig.');var id=L[n++];m.textContent='Objekt '+n+' von '+L.length+': '+id+' …';
  waehlen(id);pruefen();if(P.o.status==='skizze')return naechstes();
  var w=messen(false);if(!w||!w.then)return naechstes();
  w.then(function(){if(ampel(P.o).ampel==='rot')rot++;else{uebernehmen();if(P.o.status==='uebernommen')ok++}setTimeout(naechstes,30)})}
 naechstes()}
// Status und Messungen aller Objekte (ohne Bilder) als kurzer Text für den Chat. Die Bildsignatur stellt sicher, dass die Messung zum Bild im Repository gehört.
function alleKopieren(){var s=S(),aus={format:'at3-messungen',objekte:ids().map(function(id){var o=objekt(id),e={id:id,sig:s.signatur(o),status:o.status};if(o.messung)e.messung=o.messung;if(o.geraet)e.geraet=o.geraet;return e})},
  t=JSON.stringify(aus),m=$('#pAlleMeld'),ta=$('#pAlleText');
 (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){ta.hidden=true;m.textContent='Messungen von '+aus.objekte.length+' Objekten kopiert. In den Chat einfügen, Claude trägt sie ins Repository ein.'},
  function(){ta.hidden=false;ta.value=t;ta.focus();ta.select();m.textContent='Kopieren nicht erlaubt. Den Text im Feld von Hand kopieren und in den Chat einfügen.'})}

// ---------- Speichern, Export ----------
function speichern(){var d=lies(OBJ);d.objekte=d.objekte||{};P.o=S().ordne(P.o);d.objekte[P.o.id]=P.o;if(!schreib(OBJ,d)){meld('Browser lässt nicht speichern (privates Fenster?). Gleich exportieren.',1);return false}return true}
function kartei(){var k=AT3ED.kartei()||{format:'at3-kartei',version:1,objekte:[]},m={},d=entwuerfe(),tm=k.typMax|0;
 (k.objekte||[]).forEach(function(o){m[o.id]=o});Object.keys(d).forEach(function(id){var o=d[id];m[id]={id:id,version:o.version,typ:o.typ,kat:o.kat,name:o.name,status:o.status,datei:'obj/'+id+'.json'};if(!o.typ)delete m[id].typ});
 Object.keys(m).forEach(function(id){if(m[id].typ>tm)tm=m[id].typ});
 return{format:'at3-kartei',version:1,palette:S().PALETTE,typMax:tm,objekte:Object.keys(m).sort().map(function(id){return m[id]})}}
function datei(name,text){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();
 setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000)}
function exportiere(was){if(!speichern())return;
 if(was==='objekt'){datei(P.o.id+'.json',JSON.stringify(P.o)+'\n');meld('Objekt-Datei „'+P.o.id+'.json“ erzeugt. Gehört nach dist/at3/kartei/obj/.')}
 else{datei('objekte.json',JSON.stringify(kartei(),null,1)+'\n');meld('Kartei-Datei „objekte.json“ erzeugt. Ersetzt dist/at3/kartei/objekte.json.')}}
function kopieren(){if(!speichern())return;var t=JSON.stringify(P.o);
 (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){meld('Objekt „'+P.o.id+'“ mit Status und Messung kopiert. In den Chat einfügen, dann legt Claude es ins Repository.')},function(){meld('Kopieren nicht erlaubt. Bitte „Objekt-Datei“ nehmen.',1)})}

return{aufbauen:aufbauen,zustand:function(){return P},waehlen:waehlen,messen:messen,kartei:kartei,ampel:ampel,alle:alle};
})();
