'use strict';
// Isolated experiment: no simulation hooks, persistent state or production entry points.
(()=>{
const SIZE=2048,W=512,H=256,COLS=4,ROWS=8,PER=32,MAX=16;
let canvas,gl,program,buffer,loc={},pages=[],entries=new Map(),scratch,failed='',frame=0;
let stats={uploads:0,hits:0,batches:0,fallbacks:0,textureMiB:0};
function init(){if(gl)return true;if(failed)return false;try{
 canvas=document.createElement('canvas');gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL nicht verfügbar');
 const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
 program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 p;attribute vec2 uv;varying vec2 v;void main(){gl_Position=vec4(p,0.,1.);v=uv;}'));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 v;uniform sampler2D tex;void main(){gl_FragColor=texture2D(tex,v);}'));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 buffer=gl.createBuffer();loc.p=gl.getAttribLocation(program,'p');loc.uv=gl.getAttribLocation(program,'uv');scratch=document.createElement('canvas');scratch.width=W;scratch.height=H;
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();failed='WebGL-Kontext verloren – Originaldarstellung aktiv';gl=null;pages=[];entries.clear();});return true;
 }catch(e){failed=e.message;gl=null;return false;}}
function reset(){if(gl)for(const p of pages)gl.deleteTexture(p);pages=[];entries.clear();frame=0;stats={uploads:0,hits:0,batches:0,fallbacks:0,textureMiB:0};}
function texture(n){while(pages.length<=n){const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,SIZE,SIZE,0,gl.RGBA,gl.UNSIGNED_BYTE,null);pages.push(tex);}stats.textureMiB=pages.length*16;return pages[n];}
function key(a,t,fps){return JSON.stringify([fps?Math.floor(t*fps):frame,a.a,a.state,a.down,a.g,a.bloodMarks,a.dressings,a.stowed,a.unarmored,a.hit,a.swingKind]);}
function draw(ctx,actors,t,original,{fps=30,sync=false}={}){
 if(!init()){for(const a of actors)original(ctx,a);return;}
 frame++;stats.uploads=stats.hits=stats.batches=stats.fallbacks=0;
 if(canvas.width!==ctx.canvas.width||canvas.height!==ctx.canvas.height){canvas.width=ctx.canvas.width;canvas.height=ctx.canvas.height;}
 gl.viewport(0,0,canvas.width,canvas.height);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(loc.p);gl.enableVertexAttribArray(loc.uv);gl.vertexAttribPointer(loc.p,2,gl.FLOAT,false,16,0);gl.vertexAttribPointer(loc.uv,2,gl.FLOAT,false,16,8);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
 const m=ctx.getTransform();let verts=[],page=-1,dirty=false;
 const flush=()=>{if(!verts.length)return;gl.bindTexture(gl.TEXTURE_2D,pages[page]);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STREAM_DRAW);gl.drawArrays(gl.TRIANGLES,0,verts.length/4);stats.batches++;verts=[];dirty=true;};
 const composite=()=>{flush();if(!dirty)return;ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(canvas,0,0);ctx.restore();gl.clear(gl.COLOR_BUFFER_BIT);dirty=false;};
 const fallback=a=>{composite();original(ctx,a);stats.fallbacks++;};
 for(const a of actors){
  // World-space interactions and unusual bodies retain the complete original path.
  if(a.rex||a.draggedBy||a.g.bisected||a.splitPiece||a.pierceContact||a.contactPoint||a.swingKind==='groundFinish'){fallback(a);continue;}
  let entry=entries.get(a);if(!entry){if(entries.size>=PER*MAX){fallback(a);continue;}const slot=entries.size;entry={slot,key:null};entries.set(a,entry);}
  const k=key(a,t,fps),pn=Math.floor(entry.slot/PER),sx=entry.slot%COLS*W,sy=Math.floor(entry.slot%PER/COLS)*H;
  if(k!==entry.key){flush();const q=scratch.getContext('2d');q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,W,H);q.translate(W/2-a.x,192-a.y);original(q,a);
   // Never silently clip long weapons, unusual poses, or remote interaction graphics.
   const edges=[q.getImageData(0,0,W,1).data,q.getImageData(0,H-1,W,1).data,q.getImageData(0,0,1,H).data,q.getImageData(W-1,0,1,H).data];
   if(edges.some(data=>data.some((v,i)=>i%4===3&&v))){entry.key=null;fallback(a);continue;}
   gl.bindTexture(gl.TEXTURE_2D,texture(pn));gl.texSubImage2D(gl.TEXTURE_2D,0,sx,sy,gl.RGBA,gl.UNSIGNED_BYTE,scratch);entry.key=k;stats.uploads++;
  }else stats.hits++;
  if(page!==pn){flush();page=pn;}
  const x=a.x-W/2,y=a.y-192;
  for(const [dx,dy]of [[0,0],[W,0],[0,H],[0,H],[W,0],[W,H]]){const px=x+dx,py=y+dy;verts.push((m.a*px+m.c*py+m.e)/canvas.width*2-1,1-(m.b*px+m.d*py+m.f)/canvas.height*2,(sx+dx)/SIZE,(sy+dy)/SIZE);}
 }
 flush();if(sync)gl.finish();composite();
}
window.FigureSprites={draw,clear:reset,stats:()=>({...stats,error:failed}),supported:init};
})();
