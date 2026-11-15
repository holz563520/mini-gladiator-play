// WAS DIE DATEI TUT: M7 begehbare First-Person-Probe im Menü „Ansichten“ (erst beim Antippen geladen). Man schlüpft in einen Gladiator
// (Augenhöhe, Tempo, Begehbarkeit wie eine Figur, Thomas: wie Dungeon Keeper) und läuft durch echtes Gelände: Hof mit Wänden, Wald, Berge, See,
// Straße, Steg. Regler: Auflösung, Sichtweite, Bodenmuster, 4× gedrosselt. Messung live (Mittel und p95 je Bild, Ampel gegen das Budget 33,3 ms).
// Kerne: Welt wird im Hintergrundkern erzeugt (Worker aus fpwelt.js), der Hauptkern nimmt nur Eingaben an und zeichnet.
// Zeichnet nur, solange die Probe offen und sichtbar ist (Pause-Knopf, stoppt beim Schließen des Menüs).
var PROBE=(function(){
'use strict';
var AUGE=0.58,TEMPO=1.2,RENNEN=2.2,DREH=1.9;   // Gladiator (Vorschlag): Augen ≈ 1,75 m, Laufen ≈ 3,6 m/s, Rennen × 2,2
var P={el:null,w:null,cam:null,arten:null,texte:{},opt:{W:320,H:180,sicht:24,muster:true},drossel:false,pause:false,zeiten:[],
 tasten:{},stick:null,dreh:null,info:null,lauf:false,buf:null,img:null,P32:null,ts:0,letzt:null,weltMs:0,weltKern:''};
function S(){return window.AT3_64}
function $(s){return P.el.querySelector(s)}
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function kom(n){return n.toFixed(1).replace('.',',')}

function aufbauen(el,c,lade){
 P.el=el;
 el.innerHTML='<h2>Begehbare Probe</h2><p class="leise">Du steckst in einem Gladiator. Er sieht, was du siehst, und läuft, wohin du willst. Meistens.</p>'+
  '<div id="pRahmen" style="position:relative;touch-action:none;user-select:none;-webkit-user-select:none;background:#000">'+
   '<canvas id="pCv" style="display:block;width:100%;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none"></canvas>'+
   '<div id="pStick" hidden style="position:absolute;width:64px;height:64px;margin:-32px 0 0 -32px;border:2px solid rgba(240,220,170,.7);border-radius:50%;pointer-events:none"></div>'+
   '<div id="pKarte" hidden style="position:absolute;left:4%;right:4%;bottom:4%;padding:.5em .7em;background:rgba(30,20,12,.88);color:#f0e2c0;border:1px solid #9c6a20;font-size:.9em"></div>'+
  '</div>'+
  '<p class="leise" style="margin:.3em 0">Handy: links Daumen = laufen (weit schieben = rennen), rechts wischen = drehen, antippen = Objektkarte. PC: WASD/Pfeile, Q/E drehen, Maus ziehen, Umschalt = rennen.</p>'+
  '<div class="wZeile" style="display:flex;flex-wrap:wrap;gap:.4em;align-items:center">'+
   '<label>Auflösung <select id="pAufl"><option value="240x135">240 × 135</option><option value="320x180" selected>320 × 180</option><option value="400x225">400 × 225</option></select></label>'+
   '<label>Sichtweite <select id="pSicht"><option>12</option><option>16</option><option selected>24</option><option>32</option></select> Felder</label>'+
   '<label><input type="checkbox" id="pMuster" checked> Bodenmuster</label>'+
   '<label><input type="checkbox" id="pDross"> 4× gedrosselt</label>'+
   '<button class="knopf" id="pVoll">Vollbild</button><button class="knopf" id="pPause">Pause</button></div>'+
  '<p id="pMess" class="leise">Welt wird im Hintergrundkern aufgeschüttet …</p>'+
  '<p><button class="knopf" id="pKopie">Werte für die Freigabe kopieren<small>in den Chat einfügen, dann trage ich sie als Budget für FP1 ein</small></button></p>'+
  '<p id="pMeld" class="leise"></p>';
 var cv=$('#pCv');
 $('#pAufl').onchange=function(){var a=this.value.split('x');P.opt.W=+a[0];P.opt.H=+a[1];neuGroesse();P.zeiten=[]};
 $('#pSicht').onchange=function(){P.opt.sicht=+this.value;P.zeiten=[]};
 $('#pMuster').onchange=function(){P.opt.muster=this.checked;P.zeiten=[]};
 $('#pDross').onchange=function(){P.drossel=this.checked;P.zeiten=[]};
 $('#pPause').onclick=function(){P.pause=!P.pause;this.textContent=P.pause?'Weiter':'Pause';if(!P.pause)starten()};
 $('#pVoll').onclick=function(){var r=$('#pRahmen');if(document.fullscreenElement){document.exitFullscreen();return}
  if(r.requestFullscreen)r.requestFullscreen().then(function(){cv.style.height='100%';cv.style.objectFit='contain'}).catch(function(){meld('Vollbild verweigert. Der Browser hat Angst vor großen Gefühlen.')})};
 document.addEventListener('fullscreenchange',function(){if(!document.fullscreenElement){cv.style.height='';cv.style.objectFit=''}});
 $('#pKopie').onclick=kopieren;
 eingaben(cv);
 return lade().then(function(d){P.arten=d.arten;P.texte=d.texte||{};return weltHolen()}).then(function(w){
  P.w=w;P.cam={x:w.start.x,y:w.start.y,a:w.start.a,z:null};window.AT3_FPW.bewegen(w,P.cam,0,0,1,AUGE);neuGroesse();starten()})}

// Welt im Hintergrundkern erzeugen; geht das nicht (z. B. Datei-Aufruf), im Hauptkern.
function weltHolen(){var t=performance.now(),src=(window.AT3ED_PFAD||'')+'fpwelt.js';
 return new Promise(function(ok){var fertig=false;
  function haupt(grund){if(fertig)return;fertig=true;var w=window.AT3_FPW.welt(1);P.weltMs=performance.now()-t;P.weltKern='Hauptkern ('+grund+')';ok(w)}
  try{var wk=new Worker(document.querySelector('script[src*="fpwelt.js"]').src);
   wk.onmessage=function(e){if(fertig)return;fertig=true;wk.terminate();P.weltMs=performance.now()-t;P.weltKern='Hintergrundkern';ok(e.data)};
   wk.onerror=function(){wk.terminate();haupt('kein Worker')};wk.postMessage({seed:1});setTimeout(function(){haupt('Worker zu langsam')},8000)}
  catch(e){haupt('kein Worker')}})}

function neuGroesse(){var cv=$('#pCv'),W=P.opt.W,H=P.opt.H;cv.width=W;cv.height=H;var x=cv.getContext('2d');P.ctx=x;P.img=x.createImageData(W,H);P.buf=new Uint8Array(W*H);
 P.d32=new Uint32Array(P.img.data.buffer);var s=S(),pal=s.PALETTEN[s.PALETTE].farben.map(s.farbe);P.P32=new Uint32Array(64);
 for(var i=0;i<64;i++)P.P32[i]=(255<<24)|(pal[i][2]<<16)|(pal[i][1]<<8)|pal[i][0]}

// ---------- Eingaben ----------
function eingaben(cv){
 window.addEventListener('keydown',function(e){if(!P.el||!P.el.isConnected)return;var k=e.key.toLowerCase();if('wasdqe'.indexOf(k)>=0&&k.length===1||/^arrow/.test(k)||k==='shift'){P.tasten[k]=true;if(/^arrow/.test(k))e.preventDefault()}});
 window.addEventListener('keyup',function(e){P.tasten[e.key.toLowerCase()]=false});
 var zeiger={};
 cv.addEventListener('pointerdown',function(e){cv.setPointerCapture(e.pointerId);var r=cv.getBoundingClientRect(),links=e.clientX-r.left<r.width/2&&e.pointerType!=='mouse';
  zeiger[e.pointerId]={x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,t:performance.now(),links:links,weit:0};
  if(links){P.stick={id:e.pointerId,x0:e.clientX,y0:e.clientY,dx:0,dy:0};var st=$('#pStick'),rr=$('#pRahmen').getBoundingClientRect();st.style.left=(e.clientX-rr.left)+'px';st.style.top=(e.clientY-rr.top)+'px';st.hidden=false}
  e.preventDefault()});
 cv.addEventListener('pointermove',function(e){var z=zeiger[e.pointerId];if(!z)return;z.weit=Math.max(z.weit,Math.hypot(e.clientX-z.x0,e.clientY-z.y0));
  if(P.stick&&P.stick.id===e.pointerId){P.stick.dx=e.clientX-P.stick.x0;P.stick.dy=e.clientY-P.stick.y0}
  else{P.cam.a+=(e.clientX-z.x)*0.0065}z.x=e.clientX;z.y=e.clientY});
 function ende(e){var z=zeiger[e.pointerId];if(!z)return;delete zeiger[e.pointerId];
  if(P.stick&&P.stick.id===e.pointerId){P.stick=null;$('#pStick').hidden=true}
  if(z.weit<8&&performance.now()-z.t<400)antippen(e)}
 cv.addEventListener('pointerup',ende);cv.addEventListener('pointercancel',ende)}
function antippen(e){var cv=$('#pCv'),r=cv.getBoundingClientRect(),ka=$('#pKarte');
 if(!ka.hidden){ka.hidden=true;return}
 var sx=(e.clientX-r.left)/r.width*P.opt.W,sy=(e.clientY-r.top)/r.height*P.opt.H,best=null;
 (P.letzt&&P.letzt.treffer||[]).forEach(function(t){if(sx>=t.x0&&sx<t.x1&&sy>=t.y0&&sy<t.y1&&(!best||t.d<best.d))best=t});
 if(!best)return;var ob=P.arten[best.o.art],n=P.texte[ob.id+'.name'],i=P.texte[ob.id+'.info'];
 ka.innerHTML='<b>'+esc(n||ob.name||ob.id)+'</b><br>'+esc(i||'Sketch from the pattern sheet. No description yet; it is not shy, just unfinished.')+
  '<br><span style="opacity:.7;font-size:.85em">'+esc(ob.id)+' · '+kom(best.d*3)+' m entfernt · antippen schließt</span>';ka.hidden=false}

// ---------- Schleife ----------
function starten(){if(P.lauf||!P.w)return;P.lauf=true;P.ts=performance.now();requestAnimationFrame(bild)}
function bild(t){var cv=$('#pCv');if(!P.el||!P.el.isConnected||!cv||P.pause||document.hidden){P.lauf=false;return}
 var dt=Math.min(.1,(t-P.ts)/1000);P.ts=t;steuern(dt);
 var F=window.AT3_FP,W=window.AT3_FPW,s=S(),n=P.drossel?4:1,t0=performance.now(),r;
 for(var i=0;i<n;i++)r=W.zeichne(P.buf,P.w,P.cam,P.opt,P.arten,s,F);
 var b=P.buf,d=P.d32,pp=P.P32;for(var k=0;k<b.length;k++)d[k]=pp[b[k]];P.ctx.putImageData(P.img,0,0);
 var ms=performance.now()-t0;P.letzt=r;P.zeiten.push(ms);if(P.zeiten.length>120)P.zeiten.shift();
 if(P.zeiten.length%15===0||P.zeiten.length<3)messung(r);requestAnimationFrame(bild)}
function steuern(dt){var T=P.tasten,vor=0,seit=0,dreh=0,renn=T.shift;
 if(T.w||T.arrowup)vor+=1;if(T.s||T.arrowdown)vor-=1;if(T.a)seit-=1;if(T.d)seit+=1;if(T.q||T.arrowleft)dreh-=1;if(T.e||T.arrowright)dreh+=1;
 if(P.stick){var dx=P.stick.dx/40,dy=-P.stick.dy/40,l=Math.hypot(dx,dy);if(l>.15){var q=Math.min(1,l);vor+=dy/l*q;seit+=dx/l*q;if(l>1.6)renn=true}}
 P.cam.a+=dreh*DREH*dt;var v=TEMPO*(renn?RENNEN:1);window.AT3_FPW.bewegen(P.w,P.cam,vor*v,seit*v*.8,dt,AUGE)}
function p95(a){var s=a.slice().sort(function(x,y){return x-y});return s[Math.min(s.length-1,Math.floor(s.length*.95))]||0}
function messung(r){var z=P.zeiten,m=z.reduce(function(a,b){return a+b},0)/(z.length||1),p=p95(z),am=p<=16.7?'🟢':p<=33.3?'🟡':'🔴';
 $('#pMess').innerHTML=am+' Ein Bild: Mittel '+kom(m)+' ms, p95 '+kom(p)+' ms'+(P.drossel?' (4× gedrosselt)':'')+' · Budget 33,3 ms (🟢 bis 16,7 = 60 fps)<br>'+
  '<span class="leise">'+P.opt.W+' × '+P.opt.H+', Sicht '+P.opt.sicht+' Felder (≈ '+P.opt.sicht*3+' m), '+Math.round(r.schritte/P.opt.W)+' Schritte je Spalte, '+r.objekte+' Objekte gezeichnet (Obergrenze '+window.AT3_FPW.MAXOBJ+') · '+
  'Welt '+Math.round(P.weltMs)+' ms im '+P.weltKern+', Zeichnen im Hauptkern · Gerät meldet '+(navigator.hardwareConcurrency||'?')+' Kerne · Höhe '+kom((P.cam.z-AUGE)*3)+' m</span>'}
function werte(){var z=P.zeiten;return 'AT3 M7 Freigabe: '+P.opt.W+'x'+P.opt.H+', Sicht '+P.opt.sicht+', Muster '+(P.opt.muster?'an':'aus')+', '+(P.drossel?'4x gedrosselt, ':'')+
 'Mittel '+kom(z.reduce(function(a,b){return a+b},0)/(z.length||1))+' ms, p95 '+kom(p95(z))+' ms, Kerne '+(navigator.hardwareConcurrency||'?')+', '+(navigator.userAgent.match(/\(([^)]*)\)/)||['',''])[1]}
function kopieren(){var t=werte();(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){meld('Kopiert: '+t)},function(){meld(t)})}
function meld(t){$('#pMeld').textContent=t}
return{aufbauen:aufbauen,zustand:function(){return P},werte:werte};
})();
