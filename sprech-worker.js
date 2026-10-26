'use strict';
// Rechnet Sprechstimmen (sprechsound.js) im Hintergrund, damit Filme und Kämpfe beim Sprechen nicht ruckeln.
importScripts('sprechsound.js');
self.onmessage=e=>{const {id,text,voice,seed}=e.data||{};try{const R=self.Sprech.render(text,voice,{seed});self.postMessage({id,data:R.data,dur:R.dur,mouth:R.mouth},[R.data.buffer]);}catch(err){self.postMessage({id,error:String(err)});}};
