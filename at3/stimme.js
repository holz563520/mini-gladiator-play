// WAS DIE DATEI TUT: Englische Stimme in Arena Theory 3.0 (Schritt V1, window.AT3STIMME). Kleiner Anschluss an den vorhandenen Sprachgenerator:
// startet ../sprech-worker-en.js (lädt ../stimme-en-lex.js + ../stimme-en.js) erst beim ersten Satz, schickt den Text hin und spielt das fertige Tonstück ab.
// Wird selbst erst beim Einschalten der Stimme geladen (spiel.js), die Startlast des Spiels bleibt gleich. stimme-en.js wird nie auf dem Hauptkern geladen.
// Kerne: Rechnen komplett im Hintergrundkern, Hauptkern nur Abspielen (Regel 13). Ohne Worker bleibt die Stimme stumm, statt den Hauptkern zu belasten.
// Zufall: der Seed kommt aus Text und Stimme (gleicher Satz = gleicher Ton), kein Spielzufall, kein Math.random.
// Voice Lab: Stimmen, Aussprache-Wörterbuch und Akzent werden aus dessen Speicher nur GELESEN (mg-voice-en-*), nie geschrieben. Standardakzent: amerikanisch.
// Zwischenspeicher: höchstens 12 Sätze und 6 MB Ton, ältester fliegt zuerst raus.
(function(){
'use strict';
var V='360f51fd', ERZAEHLER='erzaehler';
var worker=null, tot=false, seq=0, wartet={}, ctx=null, quelle=null, an=false, wunsch=0;
var cache=[], CACHE_N=12, CACHE_B=6*1048576;
var Z={geladen:false, ladeMs:null, saetze:0, gesprochen:0, ausCache:0, rechenMs:null, dauerS:null, letzter:'', akzent:'us', fehler:null, spricht:false, hintergrund:true};
var hoerer=[];
function melde(){for(var i=0;i<hoerer.length;i++)try{hoerer[i](Z)}catch(e){}}

function lies(k){try{return localStorage.getItem(k)}catch(e){return null}}
function akzent(){var a=lies('mg-voice-en-accent');return a==='uk'?'uk':'us'}
function lexikon(){try{var o=JSON.parse(lies('mg-voice-en-lex-v1')||'null');return o&&typeof o==='object'&&Object.keys(o).length?o:null}catch(e){return null}}
// Stimme aus dem Voice Lab: nur wenn dort ein vollständiger Satz Werte liegt. Felder, die der Erzähler nicht hat, ausdrücklich leer setzen,
// sonst ergänzt die Engine sie aus der Ansager-Stimme (voiceOf mischt Objekte über „moderator“).
var KANN_FEHLEN=['style','presence','comp','air','fx','growl','nasal','wild','tvar','accent'];
function stimmeVon(key){try{var o=JSON.parse(lies('mg-voice-en-voices-v1')||'null'),u=o&&o[key];
  if(!u||typeof u!=='object')return key;var v={},k;
  for(k in u){var w=u[k];if(typeof w==='number'&&isFinite(w))v[k]=w;else if(k==='style'&&typeof w==='string')v[k]=w;else if(k==='accent'&&(w==='us'||w==='uk'))v[k]=w;
   else if(k==='fx'&&Array.isArray(w)&&w.length===3&&w.every(function(x){return typeof x==='number'&&isFinite(x)}))v[k]=w.slice()}
  if(!(v.pitch>0&&v.range>0&&v.speed>0&&v.size>0))return key;
  KANN_FEHLEN.forEach(function(f){if(!(f in v))v[f]=undefined});return v}catch(e){return key}}
function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}

function starte(){if(worker||tot)return worker;
 if(typeof Worker==='undefined'){tot=true;Z.fehler='no background core';return null}
 try{worker=new Worker('../sprech-worker-en.js?v='+V);
  worker.onmessage=function(e){var d=e.data||{},w=wartet[d.id];if(!w)return;delete wartet[d.id];if(d.error)w.nein(new Error(d.error));else w.ja(d)};
  worker.onerror=function(e){tot=true;Z.fehler='voice worker: '+(e&&e.message||'failed');try{worker.terminate()}catch(x){}worker=null;
   for(var id in wartet){wartet[id].nein(new Error(Z.fehler));delete wartet[id]}melde()};
 }catch(e){tot=true;Z.fehler=String(e&&e.message||e);worker=null}
 return worker}

function ausCache(k){for(var i=0;i<cache.length;i++)if(cache[i].k===k){var c=cache.splice(i,1)[0];cache.push(c);return c}return null}
function inCache(k,R){cache.push({k:k,R:R});var b=0,i;for(i=0;i<cache.length;i++)b+=cache[i].R.data.byteLength;
 while(cache.length>1&&(cache.length>CACHE_N||b>CACHE_B)){b-=cache[0].R.data.byteLength;cache.shift()}}

// Rechnet einen Satz im Hintergrundkern. o.frisch = Zwischenspeicher umgehen (nur für Tests und Messung).
function rechne(text,o){o=o||{};var key=o.stimme||ERZAEHLER,ak=akzent(),voice=stimmeVon(key),lex=lexikon();
 var k=ak+'|'+key+'|'+(typeof voice==='string'?'':JSON.stringify(voice))+'|'+text,c=o.frisch?null:ausCache(k);Z.akzent=ak;
 if(c){Z.ausCache++;return Promise.resolve(c.R)}
 var W=starte();if(!W)return Promise.reject(new Error(Z.fehler||'voice unavailable'));
 var id=++seq,t0=performance.now();
 return new Promise(function(ja,nein){wartet[id]={ja:ja,nein:nein};W.postMessage({id:id,text:text,voice:voice,seed:hash(key+'|'+text),opt:{},lex:lex,accent:ak})})
 .then(function(d){var ms=performance.now()-t0,R={data:d.data,dur:d.dur,sr:d.sr,mouth:d.mouth};
  if(!Z.geladen){Z.geladen=true;Z.ladeMs=ms}else Z.rechenMs=ms;   // der erste Satz enthält das Laden der Stimme
  Z.saetze++;Z.dauerS=d.dur;if(!o.frisch)inCache(k,R);return R})}

function still(){if(quelle){try{quelle.onended=null;quelle.stop()}catch(e){}try{quelle.disconnect()}catch(e){}quelle=null}if(Z.spricht){Z.spricht=false;melde()}}
function spiele(R){if(!ctx)return;still();var b=ctx.createBuffer(1,R.data.length,R.sr),s=ctx.createBufferSource();b.getChannelData(0).set(R.data);s.buffer=b;s.connect(ctx.destination);
 s.onended=function(){if(quelle===s){try{s.disconnect()}catch(e){}quelle=null;Z.spricht=false;melde()}};quelle=s;s.start(ctx.currentTime+.02);Z.spricht=true;Z.gesprochen++;melde()}

// Spricht einen Satz. Der zuletzt gewünschte gewinnt: kommt ein neuer, bevor der alte fertig gerechnet ist, wird der alte nicht mehr abgespielt.
function sag(text,o){text=String(text||'').replace(/\s+/g,' ').trim();if(!an||!text)return Promise.resolve(false);var meiner=++wunsch;Z.letzter=text;
 return rechne(text,o).then(function(R){if(!an||meiner!==wunsch)return false;spiele(R);return true},function(e){Z.fehler=String(e&&e.message||e);melde();return false})}

// Einschalten: Tonausgang muss von spiel.js direkt im Antippen erzeugt und hier übergeben werden (Handy erlaubt Ton nur nach einem Tippen).
function ein(tonCtx){if(tonCtx)ctx=tonCtx;if(!ctx){Z.fehler='no audio output';return false}if(ctx.state==='suspended'&&ctx.resume)ctx.resume();an=true;Z.fehler=tot?Z.fehler:null;melde();return true}
function aus(){an=false;wunsch++;still();melde()}
document.addEventListener('visibilitychange',function(){if(document.hidden)still()});

window.AT3STIMME={ein:ein,aus:aus,sag:sag,rechne:rechne,still:still,istAn:function(){return an},zustand:function(){return Z},
 beiAenderung:function(f){hoerer.push(f)},pruefsumme:function(R){var h=2166136261,d=new Uint8Array(R.data.buffer,R.data.byteOffset,R.data.byteLength);
  for(var i=0;i<d.length;i++){h^=d[i];h=Math.imul(h,16777619)}return(h>>>0)+':'+R.data.length}};
})();
