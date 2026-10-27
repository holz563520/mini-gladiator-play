'use strict';
// Rechnet Kampfgeräusche (kampfsound.js) im Hintergrund. Vor allem Publikum, Jubel und Schreie brauchen viel Rechenzeit;
// auf langsamen Handys stand das Spiel dabei sekundenlang still (Bericht 27.10.: Ruckeln, „Absturz“ in der Schmiede).
// Nachrichten: {init:saved} übernimmt die im Editor geänderten Vorlagen, {id,k,pitch} liefert {id,data} (Float32Array).
self.window=self;
self.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
importScripts('kampfsound.js');
self.onmessage=e=>{const m=e.data||{};
 if(m.init){try{self.KampfSound.load(m.init);}catch{}return;}
 try{const p=self.KampfSound.get(m.k);if(!p){self.postMessage({id:m.id,error:'unbekannt'});return;}const data=self.KampfSound.render(p,{pitch:m.pitch});self.postMessage({id:m.id,data},[data.buffer]);}
 catch(err){self.postMessage({id:m.id,error:String(err)});}};
