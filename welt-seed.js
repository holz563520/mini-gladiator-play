'use strict';
// WELT-SEED: neue Welten zufällig, V5-Bestandsstände mit Seed 0 unverändert, unbekannte Generatorstände ablehnen.
((root)=>{
 const integer=n=>Number.isInteger(n)&&n>=0&&n<=0xffffffff;
 function valid(w){return !!w&&(w.seed===undefined? w.grossVersion===undefined : integer(w.seed)&&w.grossVersion===1);}
 function forSave(record,rng){if(record){if(!valid(record.welt))throw Error('Unsupported world generator');return record.welt.seed??0;}return rng.getRandomValues(new Uint32Array(1))[0];}
 const api={valid,forSave};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AT2WeltSeed=api;
})(typeof window!=='undefined'?window:globalThis);
