/* Stage 2 game rasteriser. Pure presentation; no saves, RNG or simulation changes. */
(()=>{'use strict';
const density=.62,side=192,ox=96,oy=133.12,source=document.createElement('canvas'),low=document.createElement('canvas');
source.width=source.height=side*10;low.width=low.height=side;
const high=source.getContext('2d'),q=low.getContext('2d',{willReadFrequently:true});
const cache=new Map(),ids=new WeakMap();let next=0,bytes=0,depth=0,hits=0,misses=0;
function identity(o){if(!o||typeof o!=='object')return String(o);if(!ids.has(o))ids.set(o,++next);return ids.get(o);}
function snapshot(value,seen=new WeakSet(),depth=0){if(value===null||typeof value!=='object')return typeof value==='function'?undefined:value;if(seen.has(value)||depth>4)return {id:value.id};seen.add(value);const out=Array.isArray(value)?[]:{};for(const k of Object.keys(value)){if(['target','grabbedBy','draggedBy','rearVictim','rearAttacker'].includes(k)){const v=value[k];out[k]=v&&typeof v==='object'?{id:v.id,x:v.x,y:v.y,state:v.state}:v;}else out[k]=snapshot(value[k],seen,depth+1);}return out;}
function key(a,portrait,compact,t){const discrete={};for(const [k,v] of Object.entries(a)){if(k==='g'||k==='x'||k==='y'||k==='phase')continue;if(typeof v!=='number'||['a','team','ammo','shieldSpears','shieldAxes'].includes(k))discrete[k]=snapshot(v);}
return {id:identity(a.g||a)+'|'+portrait+'|'+compact,stamp:Math.floor((t||0)*16)+'|'+JSON.stringify([discrete,snapshot(a.g),window.MG?.gear?.(a.g,'weapon'),window.MG?.gear?.(a.g,'shield'),window.MG?.armorItems?.(a.g)])};}
function paint(out,x,y,fn,token){if(depth){fn();return;}const found=token&&cache.get(token.id);if(found&&found.stamp===token.stamp){hits++;out.save();out.imageSmoothingEnabled=false;out.drawImage(found.canvas,x-ox/density,y-oy/density,side/density,side/density);out.restore();return;}misses++;
high.setTransform(1,0,0,1,0,0);high.clearRect(0,0,source.width,source.height);high.save();high.translate(ox*10,oy*10);high.scale(density*10,density*10);high.translate(-x,-y);depth++;
try{fn();}finally{depth--;high.restore();}
q.clearRect(0,0,side,side);q.imageSmoothingEnabled=false;q.drawImage(source,0,0,side,side);const data=q.getImageData(0,0,side,side),d=data.data;
for(let i=0;i<d.length;i+=4){if(d[i+3]<110){d[i+3]=0;continue;}d[i+3]=255;for(let j=0;j<3;j++)d[i+j]=Math.min(255,Math.round(d[i+j]/36)*36);}q.putImageData(data,0,0);
out.save();out.imageSmoothingEnabled=false;out.drawImage(low,x-ox/density,y-oy/density,side/density,side/density);out.restore();
if(token){if(cache.has(token.id)){cache.delete(token.id);bytes-=side*side*4;}while(cache.size&&(bytes+side*side*4>16*1048576||cache.size>=96)){cache.delete(cache.keys().next().value);bytes-=side*side*4;}const cv=document.createElement('canvas');cv.width=cv.height=side;cv.getContext('2d').drawImage(low,0,0);cache.set(token.id,{canvas:cv,stamp:token.stamp});bytes+=side*side*4;}}
window.PixelLive={version:'pixel2-live-20261015',context:high,paint,key,stats:()=>({hits,misses,entries:cache.size,bytes}),clear(){cache.clear();bytes=0;}};
})();
