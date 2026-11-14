'use strict';
// GROSSWELT-TEST: Sprachwahl nur im Arbeitsspeicher, keine Datenbankzugriffe.
// SPRACHKERN ARENA THEORY 2.0 (welt-sprache.js) · Texte auf Deutsch und Englisch, Sprache wählbar und gemerkt. Wunsch Thomas 13.11.2026 (AT2_FAHRPLAN.md, S1).
// Nur auf arena-theory-2.html geladen (weltkarte-boot.js lädt es vor dem Startbild). Nichts davon kommt in 1.0.
//
// · Texte stehen in den Sprachdateien welt-text-de.js und welt-text-en.js (AT2Sprache.dazu(sprache,{schluessel:'Text'})).
//   Ab S1 kommt jeder neue Text für 2.0 dorthin, nicht in den Code (Regel 10). Englischer schwarzer Humor wird neu geschrieben.
// · AT2Sprache.t('schluessel',{n:2}) gibt den Text der gewählten Sprache; {n} wird ersetzt. Fehlt er auf Englisch, kommt Deutsch,
//   fehlt er ganz, der Schlüssel selbst (fällt im Test auf).
// · Gemerkt wird die Wahl in der eigenen 2.0-Datenbank „arena-theory-2“ (Eintrag „sprache“), für alle 3 Plätze gleich.
//   Der localStorage von 1.0 wird nicht berührt.
// · Umschalten ohne Neuladen: AT2Sprache.setze('en') ruft alle mit beiWechsel(fn) angemeldeten Stellen auf, die ihre Texte neu setzen.
// · Leistung: t() ist ein Nachschlagen in einem Objekt (< 1 µs), nichts läuft pro Bild.
// =====================================================================================================================
(()=>{
const DB='arena-theory-2',ABL='plaetze',KEY='sprache',SPRACHEN=['de','en'];
const texte={de:{},en:{}},hoerer=[];
let sprache='de';
const offen=()=>new Promise((ok,no)=>{let r;try{r=indexedDB.open(DB,1);}catch(e){no(e);return;}
 r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(ABL))d.createObjectStore(ABL);};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);r.onblocked=()=>no(Error('blockiert'));});
const mitDb=(mode,fn)=>offen().then(d=>new Promise((ok,no)=>{const t=d.transaction(ABL,mode),s=t.objectStore(ABL);let out;fn(s,v=>{out=v;});t.oncomplete=()=>{d.close();ok(out);};t.onerror=t.onabort=()=>{d.close();no(t.error);};}));
function t(k,v){let s=texte[sprache][k];if(s==null)s=texte.de[k];if(s==null)return k;
 return v?s.replace(/\{(\w+)\}/g,(m,n)=>v[n]!=null?v[n]:m):s;}
function setze(l){if(!SPRACHEN.includes(l)||l===sprache)return;sprache=l;document.documentElement.lang=l;
 for(const f of hoerer)try{f(l);}catch(e){console.error(e);}}
// gemerkte Sprache holen (vor dem Startbild); ohne Datenbank bleibt Deutsch
function laden(){return Promise.resolve(sprache);}
window.AT2Sprache={t,setze,laden,SPRACHEN,
 get sprache(){return sprache;},
 dazu(l,o){Object.assign(texte[l]||(texte[l]={}),o);},
 beiWechsel(f){hoerer.push(f);},
 locale:()=>sprache==='en'?'en-GB':'de-DE',
 _texte:texte};
})();
