'use strict';
// Ersatz-Umgebung ohne Bildschirm (wie in tests/*.cjs): Spionage-Worker und Node-Prüfungen laden damit das
// unveränderte Spiel und rechnen Kämpfe, ohne etwas zu zeichnen. Spielstände gibt es hier nicht.
(G=>{
 if(G.document&&G.document.createElement&&!G.HEADLESS)return;
 const canvasCtx=new Proxy({measureText:t=>({width:String(t).length*7}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),createPattern:()=>null,
  getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(Math.max(1,w*h*4)),width:w,height:h}),createImageData:(w,h)=>({data:new Uint8ClampedArray(Math.max(1,w*h*4)),width:w,height:h}),
  getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0,inverse:()=>({multiply:()=>({a:1,b:0,c:0,d:1,e:0,f:0})})})},{get:(o,k)=>k in o?o[k]:()=>{}});
 const els=new Map();
 function el(id=''){if(els.has(id))return els.get(id);const v={id,innerHTML:'',textContent:'',value:'',hidden:true,dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){},contains:()=>false},children:[],
  querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},removeEventListener(){},appendChild(){},removeChild(){},insertBefore(){},setAttribute(){},getAttribute:()=>null,focus(){},remove(){},closest:()=>null,
  getBoundingClientRect:()=>({left:0,top:0,width:390,height:300}),getContext:()=>canvasCtx,width:660,height:420};els.set(id,v);return v;}
 G.HEADLESS=true;G.window=G;
 // Ohne sichere Herkunft (Vorschau im Rahmen, Aufruf über die Netzwerkadresse im WLAN) fehlt crypto.randomUUID – das Spiel braucht es
 try{if(G.crypto&&!G.crypto.randomUUID)G.crypto.randomUUID=()=>([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^G.crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));}catch{}
 G.document={hidden:false,body:el('body'),documentElement:el('html'),getElementById:el,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},removeEventListener(){},createElement:()=>el('made'+els.size),createTextNode:()=>el('t'+els.size)};
 const store=new Map();
 try{Object.defineProperty(G,'localStorage',{configurable:true,value:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear(),key:i=>[...store.keys()][i]??null,get length(){return store.size;}}});}catch{}
 G.innerWidth=390;G.innerHeight=844;G.devicePixelRatio=1;G.scrollTo=()=>{};
 if(!G.addEventListener)G.addEventListener=()=>{};
 G.requestAnimationFrame=()=>0;G.cancelAnimationFrame=()=>{};
 if(!G.ResizeObserver)G.ResizeObserver=undefined;
 G.MGSave={get:()=>null,set(){},setMany(){},removeProfile(){},async flush(){},get error(){return '';}};
})(typeof globalThis!=='undefined'?globalThis:self);
