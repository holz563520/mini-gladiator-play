'use strict';
// Rechnet Sprechstimmen im Hintergrund, damit Filme und Kämpfe beim Sprechen nicht ruckeln.
// Seit 2.11.2026 mit der neuen Sprachausgabe stimme.js (Betonung, Satzmelodie); {engine:'alt'} rechnet noch mit sprechsound.js.
self.window=self;
importScripts('sprechsound.js','stimme.js');
self.onmessage=e=>{const {id,text,voice,seed,engine,opt}=e.data||{};try{const R=engine==='alt'?self.Sprech.render(text,voice,{seed}):self.Stimme.render(text,voice,{...(opt||{}),seed});self.postMessage({id,data:R.data,dur:R.dur,mouth:R.mouth,sr:R.sr},[R.data.buffer]);}catch(err){self.postMessage({id,error:String(err)});}};
