'use strict';
// Reuse the home-map overlay within each frame. No save fields or gameplay changes.
(()=>{
 const M=window.MG;if(!M)return;
 const mode=new URLSearchParams(location.search).get('ludusRender'),showPanel=['original','optimized'].includes(mode);
 let enabled=mode!=='original';
 let layer=null,buffer=null,facade=null,source=null,frameReady=false,frameHook=null;
 let sampleStart=0,frames=0,totalMs=0,overlayMs=0,overlayCalls=0,lastStats=null,error='';
 const props=['fillStyle','strokeStyle','globalAlpha','globalCompositeOperation','lineWidth','lineCap','lineJoin','miterLimit','lineDashOffset','shadowBlur','shadowColor','shadowOffsetX','shadowOffsetY','font','textAlign','textBaseline','direction','imageSmoothingEnabled','imageSmoothingQuality','filter','fontKerning','fontStretch','fontVariantCaps','letterSpacing','wordSpacing','textRendering'];
 function copyState(from,to){for(const k of props)if(k in from)to[k]=from[k];to.setLineDash(from.getLineDash());}
 function release(){if(layer){layer.width=layer.height=0;}layer=buffer=facade=source=null;frameReady=false;}
 function prepare(g){
  if(!layer||source!==g.canvas){release();source=g.canvas;layer=document.createElement('canvas');layer.width=source.width;layer.height=source.height;buffer=layer.getContext('2d');
   // Existing hooks bind pointer listeners to the real visible canvas.
   const canvasProperty=Object.getOwnPropertyDescriptor(buffer,'canvas');
   if(canvasProperty?.writable)buffer.canvas=source;
   else Object.defineProperty(buffer,'canvas',{get:()=>source,configurable:true});
   facade=buffer;
  }
  if(layer.width!==source.width||layer.height!==source.height){layer.width=source.width;layer.height=source.height;}
  buffer.resetTransform();buffer.clearRect(0,0,layer.width,layer.height);copyState(g,buffer);buffer.setTransform(g.getTransform());buffer.beginPath();
 }
 function blit(g){g.save();g.resetTransform();g.globalAlpha=1;g.globalCompositeOperation='source-over';g.shadowBlur=0;g.shadowColor='transparent';g.shadowOffsetX=g.shadowOffsetY=0;g.filter='none';g.drawImage(layer,0,0);g.restore();copyState(buffer,g);}
 function direct(g,t){const start=performance.now();M.ludusOverlay?.(g,t);overlayMs+=performance.now()-start;overlayCalls++;}
 function pass(g,t,phase){
  if(phase==='back'){frameReady=false;frameHook=M.ludusOverlay;}
  if(!enabled||!M.ludusOverlay||g.globalCompositeOperation!=='source-over'){direct(g,t);return;}
  if(phase==='front'&&frameReady&&frameHook===M.ludusOverlay){blit(g);return;}
  if(phase==='front'){direct(g,t);return;}
  try{prepare(g);const start=performance.now();M.ludusOverlay(facade,t);overlayMs+=performance.now()-start;overlayCalls++;frameReady=true;blit(g);}
  catch(e){enabled=false;error='Bisherige Darstellung aktiv.';release();console.warn('Ludus overlay reuse disabled',e);direct(g,t);}
 }
 function reset(){frames=0;totalMs=overlayMs=overlayCalls=0;lastStats=null;}
 const api=M.ludusRenderTest={pass,begin(){sampleStart=performance.now();},end(){totalMs+=performance.now()-sampleStart;frames++;},setEnabled(value){enabled=!!value;error='';release();reset();update();},get enabled(){return enabled;},stats(){return {enabled,frames,mapMs:frames?totalMs/frames:0,overlayMs:frames?overlayMs/frames:0,overlayCalls,bytes:layer?layer.width*layer.height*4:0,error};},reset,release};
 let panel,button,label;
 if(showPanel){panel=document.createElement('aside');panel.id='ludusRenderTest';panel.setAttribute('aria-label','Grafikvergleich');panel.style.cssText='position:fixed;left:8px;bottom:max(8px,env(safe-area-inset-bottom));z-index:9998;max-width:calc(100vw - 16px);padding:8px;background:#111d20ee;border:1px solid #c5a36a;color:#f0e3c4;font:12px monospace;border-radius:6px;box-sizing:border-box';
 panel.innerHTML='<strong>Grafikvergleich</strong> <button type="button" style="padding:8px;min-height:40px;cursor:pointer"></button><div style="margin-top:4px"></div>';
 button=panel.querySelector('button');label=panel.querySelector('div');button.onclick=e=>{e.preventDefault();e.stopPropagation();api.setEnabled(!enabled);};document.body.appendChild(panel);}
 function update(){const hidden=M.ui?.getPage?.()!=='home'||!!M.s.battle;if(hidden)release();if(!panel){reset();return;}panel.hidden=hidden;button.textContent=enabled?'Optimierung EIN · ausschalten':'Optimierung AUS · einschalten';button.setAttribute('aria-pressed',String(enabled));
  if(frames>=15){lastStats=api.stats();frames=0;totalMs=overlayMs=overlayCalls=0;}
  const s=lastStats;label.textContent=error||(s?`Karte: ${s.mapMs.toFixed(1)} ms/Bild · Zusatzgrafik: ${s.overlayMs.toFixed(1)} ms · ${enabled?'1':'2'} Berechnung(en)`:'Messung läuft …');
 }
 update();setInterval(update,1000);document.addEventListener('visibilitychange',()=>{if(document.hidden){release();reset();}});
})();
