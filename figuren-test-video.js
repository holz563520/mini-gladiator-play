'use strict';
// Isolated editor: offline VP8 encoding with explicit timestamps, then a complete WebM file.
(()=>{
const bytes=(...v)=>new Uint8Array(v),utf=s=>new TextEncoder().encode(s);
function uint(n){const out=[];do{out.unshift(n%256);n=Math.floor(n/256);}while(n);return new Uint8Array(out);}
function size(n){for(let len=1;len<=8;len++){if(n<2**(7*len)-1){const a=new Uint8Array(len);let v=n;for(let j=len-1;j>=0;j--){a[j]=v%256;v=Math.floor(v/256);}a[0]|=1<<(8-len);return a;}}throw Error('Video zu groß.');}
const join=parts=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.byteLength,0));let at=0;for(const p of parts){out.set(p,at);at+=p.byteLength;}return out;};
const element=(id,data)=>join([uint(id),size(data.byteLength),data]),number=(id,n)=>element(id,uint(n));
function webm(chunks,{width,height,fps,duration}){
 if(!chunks.length||!chunks[0].key)throw Error('Kein gültiger Videoanfang.');
 const ebml=element(0x1a45dfa3,join([number(0x4286,1),number(0x42f7,1),number(0x42f2,4),number(0x42f3,8),element(0x4282,utf('webm')),number(0x4287,4),number(0x4285,2)]));
 const d=new Uint8Array(8);new DataView(d.buffer).setFloat64(0,duration*1000);
 const info=element(0x1549a966,join([number(0x2ad7b1,1000000),element(0x4489,d),element(0x4d80,utf('Arena Figure Lab')),element(0x5741,utf('Arena Figure Lab'))]));
 const tracks=element(0x1654ae6b,element(0xae,join([number(0xd7,1),number(0x73c5,1),number(0x83,1),number(0x9c,0),element(0x86,utf('V_VP8')),number(0x23e383,Math.round(1e9/fps)),element(0xe0,join([number(0xb0,width),number(0xba,height)]))])));
 const parts=[info,tracks],cues=[];let position=info.length+tracks.length,group=[],base=0,previous=-1;
 const flush=()=>{if(!group.length)return;const payload=[number(0xe7,base),...group],length=payload.reduce((n,p)=>n+p.byteLength,0),head=join([uint(0x1f43b675),size(length)]);parts.push(head,...payload);cues.push(element(0xbb,join([number(0xb3,base),element(0xb7,join([number(0xf7,1),number(0xf1,position)]))])));position+=head.length+length;group=[];};
 for(const c of chunks){const t=Math.round(c.timestamp/1000);if(t<previous)throw Error('Ungültige Videoreihenfolge.');previous=t;if(group.length&&c.key){flush();base=t;}if(!group.length)base=t;if(t-base>32767)throw Error('Video-Keyframes fehlen.');const block=bytes(0x81,((t-base)>>8)&255,(t-base)&255,c.key?0x80:0);group.push(join([uint(0xa3),size(block.length+c.data.length),block]),c.data);}
 flush();parts.push(element(0x1c53bb6b,join(cues)));const total=parts.reduce((n,p)=>n+p.byteLength,0);return new Blob([ebml,uint(0x18538067),size(total),...parts],{type:'video/webm'});
}
async function supported(width,height,fps){if(!globalThis.VideoEncoder||!globalThis.VideoFrame)throw Error('Dieser Browser unterstützt die Video-Vorbereitung nicht. Bitte einen aktuellen Chrome oder Edge verwenden.');const config={codec:'vp8',width,height,framerate:fps,bitrate:8000000,latencyMode:'realtime'};const s=await VideoEncoder.isConfigSupported(config);if(!s.supported)throw Error('Der Browser bietet keinen passenden VP8-Encoder. Bitte aktuellen Chrome oder Edge verwenden.');return config;}
async function encode({canvas,duration,fps=30,render,cancelled=()=>false,progress=()=>{},budget=192*1048576}){
 const config=await supported(canvas.width,canvas.height,fps);const chunks=[];let failure=null,encodedBytes=0,encoder;
 const check=()=>{if(cancelled())throw Error('Video-Vorbereitung abgebrochen. Kein Teilvideo freigegeben.');if(failure)throw failure;};
 const yieldUI=()=>new Promise(r=>setTimeout(r,0));const count=Math.ceil(duration*fps)+1,begun=performance.now();
 try{
 encoder=new VideoEncoder({output:chunk=>{if(failure)return;if(encodedBytes+chunk.byteLength>budget){failure=Error('Video-Speicherbudget (192 MiB) erreicht. Kein Teilvideo freigegeben.');return;}const data=new Uint8Array(chunk.byteLength);chunk.copyTo(data);chunks.push({data,timestamp:chunk.timestamp,key:chunk.type==='key'});encodedBytes+=data.length;},error:e=>{failure=e;}});encoder.configure(config);
 for(let i=0;i<count;i++){
 check();render(Math.min(duration,i/fps));const frame=new VideoFrame(canvas,{timestamp:Math.round(i*1e6/fps),duration:Math.round(1e6/fps)});try{encoder.encode(frame,{keyFrame:i%(fps*2)===0});}finally{frame.close();}
 const waitStart=performance.now();do{await yieldUI();check();if(performance.now()-waitStart>30000)throw Error('Video-Encoder antwortet nicht. Kein Teilvideo freigegeben.');}while(encoder.encodeQueueSize>2);
 progress({frames:i+1,total:count,bytes:encodedBytes,seconds:(performance.now()-begun)/1000});
 }
 let flushed=false;encoder.flush().then(()=>flushed=true,e=>{failure=e;});const flushStart=performance.now();while(!flushed){await yieldUI();check();if(performance.now()-flushStart>30000)throw Error('Video-Abschluss dauert zu lange. Kein Teilvideo freigegeben.');}check();if(chunks.length!==count)throw Error('Videobilder fehlen. Kein Teilvideo freigegeben.');
 const blob=webm(chunks,{width:canvas.width,height:canvas.height,fps,duration:count/fps});return{blob,report:{frames:count,fps,width:canvas.width,height:canvas.height,bytes:blob.size,renderAndEncodeSeconds:(performance.now()-begun)/1000,combatDuration:duration,videoDuration:count/fps,codec:'VP8 / WebM',complete:true}};
 }finally{if(encoder&&encoder.state!=='closed')encoder.close();}
}
window.FigureVideo={encode,supported,webm};
})();
