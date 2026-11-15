'use strict';
// Rechnet die ENGLISCHEN Sprechstimmen im Hintergrund (Gegenstück zu sprech-worker.js, mit stimme-en.js + stimme-en-lex.js).
// Seit 15.11.2026 vorbereitet, noch nicht eingebunden: die englische Fassung startet später diesen Worker statt sprech-worker.js.
// Nachricht wie dort: {id,text,voice,seed,opt,lex} und zusätzlich accent ('us' | 'uk'); Antwort {id,data,dur,mouth,sr}.
self.window=self;
const V=self.location.search||'';// Build-Kennung der Worker-Adresse auch für die geladenen Dateien
importScripts('stimme-en-lex.js'+V,'stimme-en.js'+V);
let lexKey='';// eigenes Aussprache-Wörterbuch aus dem Voice Lab kommt mit jeder Anfrage mit (Worker haben kein localStorage)
self.onmessage=e=>{const {id,text,voice,seed,opt,lex,accent}=e.data||{};try{const S=self.StimmeEN;if(lex){const k=JSON.stringify(lex);if(k!==lexKey){lexKey=k;S.setLexicon(lex);}}if(accent)S.setAccent(accent);
 const R=S.render(text,voice,{...(opt||{}),seed});self.postMessage({id,data:R.data,dur:R.dur,mouth:R.mouth,sr:R.sr},[R.data.buffer]);}catch(err){self.postMessage({id,error:String(err)});}};
