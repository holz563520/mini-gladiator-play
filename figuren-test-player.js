'use strict';
(()=>{
 const wait=()=>new Promise(r=>setTimeout(r,0));
 const encode=canvas=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Der Browser konnte das Bild nicht speichern.')),'image/jpeg',.9));
 async function decode(blob){if(typeof createImageBitmap==='function'){try{return await createImageBitmap(blob);}catch(_){}}
  return new Promise((resolve,reject)=>{const url=URL.createObjectURL(blob),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Ein Aufnahmebild konnte nicht geladen werden.'));};img.src=url;});
 }
 async function record({canvas,duration,fps=30,render,metadata,cancelled=()=>false,progress=()=>{},budget=384*1048576,extraBytes=0,encodeFrame=encode}){
  const frames=[],marks=[],markInfo=[],markIds=new Map(),count=Math.ceil(duration*fps)+1,begun=performance.now();let bytes=extraBytes;
  for(let i=0;i<count;i++){if(cancelled())throw Error('Aufnahme abgebrochen. Keine Teilaufnahme freigegeben.');const t=Math.min(duration,i/fps);render(t);const info=metadata(),positions=new Float32Array(info.length*2),ids=new Uint32Array(info.length);for(let n=0;n<info.length;n++){const {x,y,...detail}=info[n],key=JSON.stringify(detail);let id=markIds.get(key);if(id===undefined){id=markInfo.length;markIds.set(key,id);markInfo.push(detail);bytes+=key.length*2+128;}positions[n*2]=x;positions[n*2+1]=y;ids[n]=id;}const blob=await encodeFrame(canvas);bytes+=blob.size+positions.byteLength+ids.byteLength+64;if(bytes>budget)throw Error('Aufnahmebudget erreicht. Weniger Figuren, 15 FPS oder die kleinere Auflösung wählen. Keine Teilaufnahme freigegeben.');frames.push(blob);marks.push({positions,ids});progress({index:i+1,count,bytes,seconds:(performance.now()-begun)/1000});await wait();}
  if(cancelled())throw Error('Aufnahme abgebrochen. Keine Teilaufnahme freigegeben.');
  return{version:1,complete:true,frames,marks,markInfo,fps,width:canvas.width,height:canvas.height,duration:count/fps,combatDuration:duration,bytes,preparationSeconds:(performance.now()-begun)/1000};
 }
 class FrameCache{
  constructor(recording,decodeFrame=decode){this.recording=recording;this.decode=decodeFrame;this.capacity=Math.max(2,Math.min(12,Math.floor(48*1048576/(recording.width*recording.height*4))));this.images=new Map();this.pending=new Map();this.queue=[];this.active=0;this.closed=false;}
  peek(i){const image=this.images.get(i);if(image){this.images.delete(i);this.images.set(i,image);}return image;}
  get(i,priority=false){if(this.closed||i<0||i>=this.recording.frames.length)return Promise.resolve(null);const image=this.peek(i);if(image)return Promise.resolve(image);if(this.pending.has(i))return this.pending.get(i).promise;
   let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});this.pending.set(i,{promise,resolve,reject});priority?this.queue.unshift(i):this.queue.push(i);this.pump();return promise;
  }
  pump(){while(!this.closed&&this.active<2&&this.queue.length){const i=this.queue.shift(),job=this.pending.get(i);this.active++;this.decode(this.recording.frames[i]).then(image=>{if(this.closed){image.close?.();job.resolve(null);return;}this.images.set(i,image);while(this.images.size>this.capacity){const key=this.images.keys().next().value;this.images.get(key).close?.();this.images.delete(key);}job.resolve(image);},job.reject).finally(()=>{this.pending.delete(i);this.active--;this.pump();});}}
  warm(i){return Promise.all(Array.from({length:Math.min(this.capacity-1,this.recording.frames.length-i)},(_,n)=>this.get(i+n,n===0)));}
  close(){this.closed=true;for(const image of this.images.values())image.close?.();this.images.clear();for(const i of this.queue){this.pending.get(i)?.resolve(null);this.pending.delete(i);}this.queue=[];}
 }
 class Player{
  constructor(canvas,recording,{decodeFrame=decode,onUpdate=()=>{}}={}){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.recording=recording;this.cache=new FrameCache(recording,decodeFrame);this.onUpdate=onUpdate;this.time=0;this.index=0;this.playing=false;this.last=0;this.scale=1;this.x=0;this.y=0;this.injuries=true;this.selected=null;this.buffering=false;this.stalls=0;this.closed=false;this.ticket=0;this.error=null;this.drawCount=0;this.drawTotalMs=0;this.lastDrawMs=0;}
  async seek(time){const ticket=++this.ticket;this.last=0;this.time=Math.max(0,Math.min(this.recording.duration,time));this.index=Math.min(this.recording.frames.length-1,Math.floor(this.time*this.recording.fps));this.buffering=true;this.onUpdate(this);try{await this.cache.warm(this.index);if(this.closed||ticket!==this.ticket)return;this.buffering=false;this.draw();this.onUpdate(this);}catch(e){if(!this.closed){this.error=e.message;this.playing=false;this.buffering=false;this.onUpdate(this);}}}
  tick(now){if(this.closed)return;if(!this.playing||this.buffering){this.last=0;return;}const dt=this.last?Math.max(0,(now-this.last)/1000):0;this.last=now;const t=Math.min(this.recording.duration,this.time+dt),i=Math.min(this.recording.frames.length-1,Math.floor(t*this.recording.fps));
   if(!this.cache.peek(i)){this.stalls++;this.seek(this.time);return;}this.time=t;const changed=this.index!==i;this.index=i;if(changed)this.draw();this.cache.warm(i).catch(e=>{if(!this.closed){this.error=e.message;this.playing=false;this.onUpdate(this);}});if(t>=this.recording.duration)this.playing=false;this.onUpdate(this);
  }
  zoom(value,cx=this.canvas.width/2,cy=this.canvas.height/2){const next=Math.max(1,Math.min(4,value)),ratio=next/this.scale;this.x=cx-this.canvas.width/2-(cx-this.canvas.width/2-this.x)*ratio;this.y=cy-this.canvas.height/2-(cy-this.canvas.height/2-this.y)*ratio;this.scale=next;this.clamp();this.draw();}
  pan(dx,dy){this.x+=dx;this.y+=dy;this.clamp();this.draw();}
  clamp(){this.x=Math.max(-this.canvas.width*(this.scale-1)/2,Math.min(this.canvas.width*(this.scale-1)/2,this.x));this.y=Math.max(-this.canvas.height*(this.scale-1)/2,Math.min(this.canvas.height*(this.scale-1)/2,this.y));}
  screen(x,y){return{x:this.canvas.width/2+this.x+(x*this.canvas.width-this.canvas.width/2)*this.scale,y:this.canvas.height/2+this.y+(y*this.canvas.height-this.canvas.height/2)*this.scale};}
  eachMark(callback){const marks=this.recording.marks[this.index];for(let i=0;i<marks.ids.length;i++)callback(this.recording.markInfo[marks.ids[i]],marks.positions[i*2],marks.positions[i*2+1]);}
  hit(x,y){let found=null,best=25;this.eachMark((mark,mx,my)=>{const p=this.screen(mx,my),d=Math.hypot(x-p.x,y-p.y);if(d<best){best=d;found={...mark,x:mx,y:my};}});this.selected=found;return found;}
  draw(){const image=this.cache.peek(this.index);if(!image||this.closed)return;const begun=performance.now(),c=this.ctx,w=this.canvas.width,h=this.canvas.height;c.setTransform(1,0,0,1,0,0);c.fillStyle='#10191d';c.fillRect(0,0,w,h);c.imageSmoothingEnabled=false;const closeup=this.recording.broadcast&&FigureBroadcast.sample(this.recording.broadcast,this.index/this.recording.fps).segment.type==='closeup',scale=closeup?1:this.scale,x=closeup?0:this.x,y=closeup?0:this.y;c.drawImage(image,w/2+x-w*scale/2,h/2+y-h*scale/2,w*scale,h*scale);
   if(this.injuries){this.eachMark((mark,x,y)=>{const p=this.screen(x,y);if(p.x<0||p.y<0||p.x>w||p.y>h)return;c.beginPath();c.arc(p.x,p.y,6,0,Math.PI*2);c.fillStyle=mark.dead?'#bbb':mark.bleeding?'#ff594f':'#ffc85b';c.fill();c.lineWidth=2;c.strokeStyle='#10191d';c.stroke();});}this.lastDrawMs=performance.now()-begun;this.drawTotalMs+=this.lastDrawMs;this.drawCount++;
  }
  close(){this.closed=true;this.playing=false;this.ticket++;this.cache.close();}
 }
 window.FigurePlayer={record,FrameCache,Player};
})();
