'use strict';
// Rechnet Sprechstimmen im Hintergrund, damit Filme und Kämpfe beim Sprechen nicht ruckeln.
// Seit 2.11.2026 mit der neuen Sprachausgabe stimme.js (Betonung, Satzmelodie); {engine:'alt'} rechnet noch mit sprechsound.js.
self.window=self;
const V=self.location.search||'';// Build-Kennung der Worker-Adresse auch für die geladenen Dateien (sonst bleibt eine alte stimme.js im Zwischenspeicher)
importScripts('sprechsound.js'+V,'stimme.js'+V);
let lexKey='';// eigenes Aussprache-Wörterbuch aus dem Stimmlabor kommt mit jeder Anfrage mit (Worker haben kein localStorage)
self.onmessage=e=>{const {id,text,voice,seed,engine,opt,lex}=e.data||{};try{if(lex&&self.Stimme){const k=JSON.stringify(lex);if(k!==lexKey){lexKey=k;self.Stimme.setLexicon(lex);}}const R=engine==='alt'?self.Sprech.render(text,voice,{seed}):self.Stimme.render(text,voice,{...(opt||{}),seed});self.postMessage({id,data:R.data,dur:R.dur,mouth:R.mouth,sr:R.sr},[R.data.buffer]);}catch(err){self.postMessage({id,error:String(err)});}};
