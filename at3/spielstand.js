// WAS DIE DATEI TUT: Spielstände von Arena Theory 3.0 (Schritt G3). Drei eigene Plätze in der eigenen IndexedDB „arena-theory-3“, Startbild mit
// Continue / New world / Delete, Anlegen einer neuen Welt mit Name, Ortsdichte (thin / medium / dense, Befehl weltdichte ab G4) und Seed (Zufall oder Eingabe).
// Sicher: je Platz zwei Fassungen (a/b). Neue Fassung und Umschalten des Kopfes stehen in EINER Datenbank-Handlung (ganz oder gar nicht); der Kopf trägt
// Prüfsumme und Größe jeder Fassung, beim Laden wird geprüft, eine kaputte Fassung verworfen und die vorige genommen. Fremde (neuere) Version: weder laden
// noch überschreiben, nur Löschen auf Nachfrage. Zweiter Tab: ein Platz ist gesperrt, solange er in einem anderen Tab läuft (Web Locks, sonst BroadcastChannel).
// Speicher voll oder Schreibfehler: sichtbare Meldung, kein vorgetäuschter Erfolg, vorhandene Daten bleiben.
// Kein Speichern oder Laden von Hand (Thomas 16.11.2026, wie AT2): automatisch höchstens alle 10 s im Leerlauf, beim Wegschalten und Verlassen der Seite
// (dort ohne Erfolgsgarantie) und mit „Save & quit“ (zurück zum Startbild).
// Kerne: Den Zustand liefert der Weltkern an einer Tickgrenze (kernstart.js stand); hier nur Text bauen, Prüfsumme und Schreiben (wenige ms, gemessen).
// 1.0 und 2.0: deren Datenbanken und Schlüssel werden weder gelesen noch beschrieben. ?nosave = ohne Spielstand (Seed 1, für Tests und Messungen).
// Wiederverwendet aus welt-spielstand.js (AT2): drei Plätze, Startbild mit Nachfrage, Leerlauf-Speichern, Speichern beim Verlassen, Versionsschutz.
(function(){
'use strict';
var DB='arena-theory-3', ABL='plaetze', SCHEMA=3;   // Schema 2 seit W1c (runde Welt): Stände mit Schema 1 stammen aus der flachen Welt, sie werden nicht geladen (nur löschen)
// N2e (Thomas 20.11.2026: nur neue Welten): Schema 3 = Klimazonen-Welt (N2a–N2d, Weltfassung 2 in welt.fassung). Stände mit Schema 2 liegen auf der Welt von vor N2
// (andere Biome, Orte, Straßen): nicht laden, nur löschen, eigene Meldung. WELT steigt, wenn derselbe Seed wieder eine andere Welt ergibt.
var WELT=2;
var PLAETZE=[1,2,3], ABSTAND=10000, ROEM=['I','II','III'], DICHTEN=['thin','medium','dense'];
var V='3f9ee22a', T=function(k,w){return k}, esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};

// ── Prüfsumme (FNV-1a über den gespeicherten Text) ──
function pruefsumme(s){var h=0x811c9dc5;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)}return('0000000'+(h>>>0).toString(16)).slice(-8)}
// Seed aus der Eingabe: Ziffern = die Zahl, sonst Text zu Zahl (gleiches Wort = gleiche Welt), leer = Zufall
function seedAus(text){text=String(text||'').trim();if(!text)return zufallsSeed();if(/^\d{1,10}$/.test(text)&&+text<=4294967295)return +text;return parseInt(pruefsumme(text.toLowerCase()),16)}
function zufallsSeed(){try{return crypto.getRandomValues(new Uint32Array(1))[0]}catch(e){return(Math.random()*4294967296)>>>0}}

// ── IndexedDB ──
var dbP=null;
function db(){return dbP||(dbP=new Promise(function(ok,no){var r;try{r=indexedDB.open(DB,1)}catch(e){no(e);return}
 r.onupgradeneeded=function(){var d=r.result;if(!d.objectStoreNames.contains(ABL))d.createObjectStore(ABL)};
 r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)};r.onblocked=function(){no(new Error('storage blocked'))}}))}
function tx(mode,fn){return db().then(function(d){return new Promise(function(ok,no){var t=d.transaction(ABL,mode),s=t.objectStore(ABL),out={};fn(s,out,t);
 t.oncomplete=function(){ok(out)};t.onerror=function(){no(t.error)};t.onabort=function(){no(t.error||out.grund||new Error('aborted'))}})})}
function lies(keys){return tx('readonly',function(s,out){keys.forEach(function(k){var r=s.get(k);r.onsuccess=function(){out[k]=r.result}})})}
function koepfe(){return lies(PLAETZE.map(function(n){return'k'+n})).then(function(o){return PLAETZE.map(function(n){return o['k'+n]||null})})}
function loeschen(n){return tx('readwrite',function(s){s.delete('k'+n);s.delete('d'+n+'a');s.delete('d'+n+'b')})}

// Schreiben: in EINER Handlung Kopf lesen, Version prüfen, freie Fassung schreiben, Kopf umschalten. Bricht etwas ab, bleibt alles wie vorher.
function schreiben(n,kopfNeu,text){var fehler=null;
 return tx('readwrite',function(s,out,t){var r=s.get('k'+n);r.onsuccess=function(){var alt=r.result;
  if(alt&&alt.schema>SCHEMA){fehler='newer';t.abort();return}
  var gen=alt&&alt.akt&&alt.akt.gen==='a'?'b':'a';
  kopfNeu.akt={gen:gen,pruef:pruefsumme(text),bytes:text.length};kopfNeu.alt=alt&&alt.akt?alt.akt:null;
  s.put(text,'d'+n+gen);s.put(kopfNeu,'k'+n)}}).catch(function(e){throw fehler?new Error(fehler):e})}

// Laden: Kopf prüfen, aktuelle Fassung prüfen, sonst die vorige. Ergebnis {daten, kopf, wieder} oder {fehler}
function laden(n){return lies(['k'+n,'d'+n+'a','d'+n+'b']).then(function(o){var k=o['k'+n];if(!k)return{fehler:'empty'};if(k.schema>SCHEMA)return{fehler:'newer'};if(!(k.schema>=SCHEMA))return{fehler:'older',schema:k.schema};
 function probe(f){if(!f)return null;var s=o['d'+n+f.gen];if(typeof s!=='string'||s.length!==f.bytes||pruefsumme(s)!==f.pruef)return null;
  try{var d=JSON.parse(s);return d&&d.schema===SCHEMA&&d.kern&&d.welt?d:null}catch(e){return null}}
 var d=probe(k.akt);if(d)return{daten:d,kopf:k,wieder:false};d=probe(k.alt);if(d)return{daten:d,kopf:k,wieder:true};return{fehler:'broken'}})}

// ── Zweiter Tab: Sperre je Platz ──
var LOCKS=!!(navigator.locks&&navigator.locks.request), KANAL=null, meine={};
try{KANAL=new BroadcastChannel('at3-plaetze');KANAL.onmessage=function(e){var d=e.data;if(d&&d.frage)for(var n in meine)KANAL.postMessage({belegt:+n})}}catch(e){}
function belegte(){if(LOCKS&&navigator.locks.query)return navigator.locks.query().then(function(q){var b={};(q.held||[]).forEach(function(l){var m=/^at3-platz-(\d)$/.exec(l.name);if(m)b[m[1]]=1});return b}).catch(function(){return{}});
 return new Promise(function(ok){var b={};if(!KANAL)return ok(b);var h=function(e){if(e.data&&e.data.belegt)b[e.data.belegt]=1};KANAL.addEventListener('message',h);KANAL.postMessage({frage:1});setTimeout(function(){KANAL.removeEventListener('message',h);ok(b)},150)})}
function sperren(n){if(meine[n])return Promise.resolve(true);if(LOCKS)return new Promise(function(ok){navigator.locks.request('at3-platz-'+n,{ifAvailable:true},function(l){if(!l){ok(false);return}meine[n]=1;ok(true);return new Promise(function(){})})});
 return belegte().then(function(b){if(b[n])return false;meine[n]=1;return true})}

// ── Startbild ──
function altText(schema){return schema===2?'start.altKlima':'start.alt'}   // N2e: Schema 2 = runde Welt ohne Klimazonen, darunter flache Welt
function zeitText(sek){var h=Math.floor(sek/3600),m=Math.floor(sek/60)%60;return h+'h '+(m<10?'0':'')+m+'m'}
function datum(ms){try{return new Date(ms).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}catch(e){return''}}
function start(opt){T=opt.t||T;
 if(/[?&]nosave\b/.test(location.search))return Promise.resolve({platz:0,seed:1,dichte:1,name:'',daten:null});
 return new Promise(function(fertig){
  var el=document.createElement('div');el.id='at3Start';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');document.body.appendChild(el);
  var k=[null,null,null], frei={}, ohne=false, frage=null, neu=null, meldung={}, bereit=false;
  function zeige(){var h='<div class="papier s-box"><h1>'+esc(T('spiel.titel'))+'</h1><p class="unter">'+esc(T('start.unter'))+'</p>';
   if(ohne)h+='<p class="schlecht">'+esc(T('start.keinSpeicher'))+'</p><button class="knopf" data-ohne>'+esc(T('start.ohne'))+'</button>';
   else if(!bereit)h+='<p class="leise">'+esc(T('start.liest'))+'</p>';
   else PLAETZE.forEach(function(n,i){var x=k[i],info,kn='';
    if(x&&x.schema!==SCHEMA){info='<b>'+esc(x.name||T('start.ludus'))+'</b><small class="schlecht">'+esc(T(x.schema>SCHEMA?'start.neuer':altText(x.schema)))+'</small>';kn='<button class="knopf klein weg" data-loesch="'+n+'">'+esc(T('start.loeschen'))+'</button>'}
    else if(x&&frei[n]){info='<b>'+esc(x.name||T('start.ludus'))+'</b><small class="schlecht">'+esc(T('start.andererTab'))+'</small>'}
    else if(x){info='<b>'+esc(x.name||T('start.ludus'))+'</b><small>'+esc(T('start.info',{t:zeitText(Math.floor((x.tick||0)/20)),d:T('dichte.'+DICHTEN[x.dichte]),s:x.seed,z:datum(x.zeit)}))+'</small>';
     kn='<button class="knopf klein" data-weiter="'+n+'">'+esc(T('start.weiter'))+'</button><button class="knopf klein weg" data-neu="'+n+'">'+esc(T('start.neu'))+'</button><button class="knopf klein weg" data-loesch="'+n+'">'+esc(T('start.loeschen'))+'</button>'}
    else{info='<b>'+esc(T('start.platz',{n:ROEM[i]}))+'</b><small>'+esc(T('start.leer'))+'</small>';kn=frei[n]?'':'<button class="knopf klein" data-neu="'+n+'">'+esc(T('start.neu'))+'</button>'}
    if(meldung[n])info+='<small class="schlecht">'+esc(meldung[n])+'</small>';
    if(frage&&frage.n===n)info+='<div class="s-frage">'+esc(T(frage.art==='loesch'?'start.frageLoeschen':'start.frageNeu'))+'<div><button class="knopf klein" data-ja="'+n+'">'+esc(T(frage.art==='loesch'?'start.jaLoeschen':'start.jaNeu'))+'</button><button class="knopf klein weg" data-nein>'+esc(T('start.nein'))+'</button></div></div>';
    if(neu&&neu.n===n)info+=formular(n,i);
    h+='<div class="s-platz"><span class="s-nr">'+ROEM[i]+'</span><div class="s-info">'+info+'</div>'+(neu&&neu.n===n?'':'<div class="s-knoepfe">'+kn+'</div>')+'</div>'});
   el.innerHTML=h+'</div>';var f=el.querySelector('#sName');if(f&&neu&&!neu.fokus){neu.fokus=1;f.focus()}}
  function formular(n,i){return'<div class="s-neu"><label>'+esc(T('neu.name'))+'<input id="sName" maxlength="24" value="'+esc(neu.name)+'" autocomplete="off"></label>'+
   '<div class="s-wahl" role="radiogroup" aria-label="'+esc(T('neu.dichte'))+'"><span>'+esc(T('neu.dichte'))+'</span>'+DICHTEN.map(function(d,j){return'<button class="knopf klein" role="radio" data-dichte="'+j+'" aria-checked="'+(neu.dichte===j)+'">'+esc(T('dichte.'+d))+'</button>'}).join('')+'</div>'+
   '<p class="leise">'+esc(T('neu.dichteInfo.'+DICHTEN[neu.dichte]))+'</p>'+
   '<label>'+esc(T('neu.seed'))+'<input id="sSeed" inputmode="text" maxlength="40" placeholder="'+esc(T('neu.seedLeer'))+'" value="'+esc(neu.seed)+'" autocomplete="off"></label>'+
   '<p class="leise">'+esc(T('neu.seedInfo'))+'</p><div class="s-knoepfe quer"><button class="knopf" data-los="'+n+'">'+esc(T('neu.los'))+'</button><button class="knopf klein weg" data-nein>'+esc(T('start.nein'))+'</button></div></div>'}
  function merken(){var a=el.querySelector('#sName'),b=el.querySelector('#sSeed');if(neu){if(a)neu.name=a.value;if(b)neu.seed=b.value}}
  function los(n,erg){el.remove();fertig(erg)}
  el.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var d=b.dataset;merken();
   if(d.ohne!=null){los(0,{platz:0,seed:zufallsSeed(),dichte:1,name:'',daten:null,ohne:true});return}
   if(d.nein!=null){frage=null;neu=null;zeige();return}
   if(d.dichte!=null){neu.dichte=+d.dichte;zeige();return}
   if(d.loesch){frage={n:+d.loesch,art:'loesch'};neu=null;zeige();return}
   if(d.neu){var n=+d.neu;if(k[n-1]&&!(frage&&frage.n===n&&frage.art==='neu')){frage={n:n,art:'neu'};neu=null;zeige();return}
    frage=null;neu={n:n,name:T('start.platzName',{n:ROEM[n-1]}),dichte:1,seed:''};zeige();return}
   if(d.ja){var m=+d.ja,art=frage&&frage.art;frage=null;
    if(art==='neu'){neu={n:m,name:(k[m-1]&&k[m-1].name)||T('start.platzName',{n:ROEM[m-1]}),dichte:1,seed:''};zeige();return}
    loeschen(m).then(function(){k[m-1]=null;meldung[m]='';zeige()},function(x){meldung[m]=T('start.fehler',{e:x.message});zeige()});return}
   if(d.los){var p=+d.los;b.disabled=true;sperren(p).then(function(ok){if(!ok){frei[p]=1;neu=null;meldung[p]=T('start.andererTab');zeige();return}
     // ersetzte Welt erst jetzt löschen (Thomas hat nachgefragt bestätigt), damit keine alte Fassung als Rückfall zur neuen Welt gilt
     return(k[p-1]?loeschen(p):Promise.resolve()).then(function(){los(p,{platz:p,seed:seedAus(neu.seed),dichte:neu.dichte,name:String(neu.name||'').trim().slice(0,24)||T('start.platzName',{n:ROEM[p-1]}),daten:null,ersetzt:!!k[p-1]})})}).catch(function(x){meldung[p]=T('start.fehler',{e:x.message});neu=null;zeige()});return}
   if(d.weiter){var q=+d.weiter;b.disabled=true;
    // Ton darf das Handy nur direkt im Antippen starten: Wunsch weiterreichen, spiel.js schaltet die Stimme im selben Antippen ein
    if(opt.imAntippen)opt.imAntippen(k[q-1]);
    sperren(q).then(function(ok){if(!ok){frei[q]=1;meldung[q]='';zeige();return}return laden(q).then(function(r){
     if(r.fehler){meldung[q]=T(r.fehler==='newer'?'start.neuer':r.fehler==='older'?altText(r.schema):'start.kaputt');zeige();return}
     los(q,{platz:q,seed:r.daten.welt.seed,dichte:r.daten.welt.dichte,name:r.kopf.name,daten:r.daten,wieder:r.wieder})})}).catch(function(x){meldung[q]=T('start.fehler',{e:x.message});zeige()});return}});
  el.addEventListener('keydown',function(e){if(e.key==='Enter'&&neu&&e.target.tagName==='INPUT'){var b=el.querySelector('[data-los]');if(b)b.click()}});
  zeige();
  Promise.all([koepfe(),belegte()]).then(function(r){k=r[0];frei=r[1];bereit=true;zeige()},function(){ohne=true;zeige()})})}

// ── Im Spiel: automatisch speichern ──
// a = {platz, seed, dichte, name}, kern = Griff aus kernstart.js, extra() = {stimme}, anzeigen(text, schlecht)
function anschliessen(a,kern,extra,anzeigen){
 var S={platz:a.platz,mal:0,ms:0,kernMs:0,bytes:0,fehler:'',zuletzt:0,tick:-1,laeuft:null,ganz:true,speichern:speichern};
 if(!a.platz){anzeigen(T(a.ohne?'speicher.ohne':'speicher.test'),!!a.ohne);return S}
 var gesichertTick=-1, extraAlt='', versuch=Date.now();
 function speichern(){if(S.laeuft)return S.laeuft.then(speichern);versuch=Date.now();
  S.laeuft=kern.stand().then(function(r){if(!r)throw new Error('world core not running');
   var t0=performance.now(),ex=extra(),d={schema:SCHEMA,build:V,platz:a.platz,zeit:Date.now(),welt:{seed:a.seed>>>0,dichte:a.dichte,fassung:WELT},kern:r.stand,spiel:ex},
    text=JSON.stringify(d),kopf={schema:SCHEMA,build:V,platz:a.platz,name:a.name,seed:a.seed>>>0,dichte:a.dichte,fassung:WELT,tick:r.tick,zeit:d.zeit,stimme:!!ex.stimme};
   S.ms=performance.now()-t0;S.kernMs=r.ms;S.bytes=text.length;S.ganz=r.stand.ganz;
   return schreiben(a.platz,kopf,text).then(function(){gesichertTick=r.tick;extraAlt=JSON.stringify(ex);S.mal++;S.zuletzt=Date.now();S.tick=r.tick;S.fehler='';
    anzeigen(T('speicher.ok',{b:(S.bytes/1024).toFixed(1)}),false)})})
  .catch(function(e){var m=e&&e.message==='newer'?T('speicher.neuer'):e&&e.name==='QuotaExceededError'?T('speicher.voll'):T('speicher.fehler',{e:e&&e.message||e});S.fehler=m;anzeigen(m,true)})
  .then(function(){S.laeuft=null});return S.laeuft}
 function noetig(){return kern.zustand.laeuft&&(kern.zustand.tick!==gesichertTick||JSON.stringify(extra())!==extraAlt)}
 var leer=window.requestIdleCallback?function(f){requestIdleCallback(f,{timeout:2000})}:function(f){setTimeout(f,0)}, wartet=false;
 setInterval(function(){if(!wartet&&!S.laeuft&&noetig()&&Date.now()-versuch>=ABSTAND){wartet=true;leer(function(){wartet=false;speichern()})}},1000);
 function weg(){if(noetig())speichern()}
 addEventListener('pagehide',weg);document.addEventListener('visibilitychange',function(){if(document.hidden)weg()});
 S.beenden=function(){return(noetig()||!S.mal?speichern():Promise.resolve()).then(function(){if(S.fehler)return false;location.href=location.pathname;return true})};
 return S}

window.AT3SPIELSTAND={start:start,anschliessen:anschliessen,laden:laden,schreiben:schreiben,loeschen:loeschen,koepfe:koepfe,belegte:belegte,seedAus:seedAus,pruefsumme:pruefsumme,SCHEMA:SCHEMA,WELT:WELT,DB:DB};
})();
