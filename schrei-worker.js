'use strict';
// Rechnet die Schreie (schreie.js) für den Kampf im Hintergrund. Nachricht {id,sid,fig,intensity,seed} → {id,data,sr}.
self.window=self;
importScripts('stimme.js','schreie.js');
self.onmessage=e=>{const m=e.data||{};try{const R=self.Schrei.render(m.sid,{figure:m.fig,intensity:m.intensity,seed:m.seed,room:m.room??.06,roomSize:.7});let e=R.data.length;while(e>1&&Math.abs(R.data[e-1])<.004)e--;const data=R.data.slice(0,Math.min(R.data.length,e+400));self.postMessage({id:m.id,data,sr:R.sr},[data.buffer]);}catch(err){self.postMessage({id:m.id,error:String(err)});}};
