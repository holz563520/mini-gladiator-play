'use strict';
// GROSSWELT-TEST: deterministische, zustandslose Landschaft für 9600 × 9600 Felder; keine Weltarrays oder Spielstände.
((root)=>{
 const BASE=960,SIZE=BASE*10,MIN=-(SIZE-BASE)/2,MAX=MIN+SIZE;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function create(seed){
  seed=seed>>>0;
  function hash(x,y,s=0){let n=(Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(s,1442695)+seed)|0;n=Math.imul(n^0x9e3779b9,0x85ebca6b);n^=n>>>13;n=Math.imul(n,0xc2b2ae35);return ((n^(n>>>16))>>>0)/4294967296;}
  function noise(x,y,s){const a=Math.floor(x),b=Math.floor(y);let u=x-a,v=y-b;u=u*u*(3-2*u);v=v*v*(3-2*v);const A=hash(a,b,s),B=hash(a+1,b,s),C=hash(a,b+1,s),D=hash(a+1,b+1,s);return A+(B-A)*u+(C-A)*v+(A-B-C+D)*u*v;}
  function height(x,y){return (noise(x/410,y/410,12)-.43)*34+(noise(x/83,y/83,13)-.5)*7;}
  function sample(x,y){const h=height(x+.5,y+.5),wet=noise(x/210,y/210,18),heat=noise(x/260,y/260,16);let type=0,biome=0,ground='wiese';
   if(h<-.6){type=3;ground='wasser';}
   else if(h>14){type=26;biome=5;ground='schnee';}
   else if(h>10){type=25;biome=5;ground='fels';}
   else if(heat>.58&&wet<.5){type=21;biome=2;ground='sand';}
   else if(heat>.55&&wet>.55){type=22;biome=3;ground='dsch';}
   else if(wet>.62&&h<4){type=23;biome=4;ground='sumpf';}
   else if(wet>.46){type=1;biome=1;ground='wald';}
   else if(heat>.6){type=42;ground='trocken';}
   return {type,biome,ground,h:Math.max(-.6,h),density:wet};
  }
  return {seed,hash,noise,height,sample};
 }
 // LRU nach tatsächlicher Bildfläche begrenzen, nicht nach der gesamten Weltgröße.
 class ImageCache{
  constructor(limit=24*1024*1024){this.limit=limit;this.bytes=0;this.map=new Map();}
  get(key){const v=this.map.get(key);if(v){this.map.delete(key);this.map.set(key,v);}return v?.image;}
  put(key,image){const bytes=image.width*image.height*4;this.drop(key);if(bytes>this.limit)return;this.map.set(key,{image,bytes});this.bytes+=bytes;while(this.bytes>this.limit)this.drop(this.map.keys().next().value);}
  drop(key){const v=this.map.get(key);if(!v)return;this.bytes-=v.bytes;this.map.delete(key);if(v.image.close)v.image.close();else{v.image.width=1;v.image.height=1;}}
 }
 const api={BASE,SIZE,MIN,MAX,clamp,create,ImageCache};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WeltGrossCore=api;
})(typeof window!=='undefined'?window:globalThis);
