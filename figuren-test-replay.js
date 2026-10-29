'use strict';
// Test-only delta recording. Every simulation tick is retained; playback never calls the simulation.
(()=>{
const clone=v=>v===undefined?undefined:structuredClone(v),object=v=>v!==null&&typeof v==='object';
class Tape{
 constructor(initial,budget=256*1048576){this.initial=clone(initial);this.shadow=clone(initial);this.frames=[];this.paths=[];this.pathIds=new Map();this.bytes=JSON.stringify(initial).length*4;this.budget=budget;this.complete=false;this.checkBudget();}
 checkBudget(){if(this.bytes>this.budget)throw Error('Speicherbudget erreicht. Keine vollständige Wiedergabe verfügbar. Weniger Figuren oder ein größeres Speicherbudget wählen.');}
 pathId(path){const key=JSON.stringify(path);let id=this.pathIds.get(key);if(id===undefined){id=this.paths.length;this.pathIds.set(key,id);this.paths.push(path);this.bytes+=key.length*4+128;}return id;}
 capture(current,time){const ids=[],nums=[],other=[],deleted=[];
 const change=(path,value)=>{const id=this.pathId(path);if(typeof value==='number'){ids.push(id);nums.push(value);}else other.push(id,clone(value));};
 const walk=(before,after,path)=>{
  for(const key of Object.keys(before))if(!Object.hasOwn(after,key)){deleted.push(this.pathId(path.concat(key)));delete before[key];}
  for(const key of Object.keys(after)){const old=before[key],value=after[key];if(Object.hasOwn(before,key)&&Object.is(old,value))continue;
   if(object(old)&&object(value)&&Array.isArray(old)===Array.isArray(value))walk(old,value,path.concat(key));
   else{change(path.concat(key),value);before[key]=clone(value);}
  }
  if(Array.isArray(after)&&before.length!==after.length){change(path.concat('length'),after.length);before.length=after.length;}
 };
 walk(this.shadow,current,[]);
 const frame={time,ids:new Uint32Array(ids),numbers:new Float64Array(nums),deleted:new Uint32Array(deleted),other};
 this.bytes+=frame.ids.byteLength+frame.numbers.byteLength+frame.deleted.byteLength+JSON.stringify(other).length*4+other.length*32+128;this.checkBudget();this.frames.push(frame);
 }
 seal(result){this.complete=true;this.result=clone(result);this.duration=this.frames.at(-1)?.time||0;this.shadow=null;this.pathIds=null;}
 player(){if(!this.complete)throw Error('Kampf noch nicht vollständig berechnet.');const tape=this;return{state:clone(tape.initial),index:0,time:0,seekForward(time){const put=(id,value,remove=false)=>{const path=tape.paths[id];let obj=this.state;for(let i=0;i<path.length-1;i++)obj=obj[path[i]];const key=path.at(-1);if(remove)delete obj[key];else obj[key]=object(value)?clone(value):value;};while(this.index<tape.frames.length&&tape.frames[this.index].time<=time+1e-8){const f=tape.frames[this.index++];
 // Structural/object changes must precede numeric paths added under those containers.
 for(const id of f.deleted)put(id,undefined,true);for(let i=0;i<f.other.length;i+=2)put(f.other[i],f.other[i+1]);for(let i=0;i<f.ids.length;i++)put(f.ids[i],f.numbers[i]);
 }this.time=Math.min(time,tape.duration);return this.state;}};}
}
window.FigureReplay={Tape};
})();
