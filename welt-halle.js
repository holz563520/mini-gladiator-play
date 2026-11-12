'use strict';
// =====================================================================================================================
// GRÄBERPLATZ VOR DER HALLE DER TOTEN (welt-halle.js) · Wunsch Thomas 12.11.2026: Halle der Toten etwas abseits; davor kann man
// 10 Gräber bzw. Statuen der Helden nach außen stellen lassen; die Besucher bewundern die Helden.
//
// · Halle und Gräberplatz liegen westlich vom Ludus (W.HALLE, welt-raster.js); die Halle selbst zeichnet welt-gebaeude.js.
// · 10 Grabstellen auf dem Gräberplatz (2 Reihen × 5). Gezeichnet mit den Gräbern der Halle im Spiel (M.hall.tomb: Grabstufe 1
//   schiefer Stein … 5 Legende mit Statue und Funken), leer: offene Grabstelle (M.hall.plot). Einmal vorgezeichnet je Grab.
// · Wer draußen steht: zu Beginn die zehn Mächtigsten (Reihenfolge der Halle); Antippen einer Grabstelle öffnet die Auswahl
//   (anderen Helden hinstellen, leer lassen, Grab ansehen). Gemerkt in S.hall.welt (2.0 speichert noch nichts).
// · Gibt es noch keine Gefallenen (2.0 hat keinen eigenen Spielstand), stehen sieben Helden nur zur Ansicht da (Zufall unberührt).
// · Besucher: ein Teil macht auf dem Weg zur Arena einen Abstecher, steht eine Weile vor einem Grab und geht weiter
//   (welt-besucher.js fragt M.weltHalle.besuch()).
// =====================================================================================================================
(()=>{
const M=window.MG,W=window.WeltKarte,H=window.WeltHook;if(!M||!W||!H||!W.HALLE)return;const S=M.s,HA=W.HALLE,KW=W.KW,ZAHL=10;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STUFE=['','Namenloser','Kämpfer','Veteran','Champion','Legende'];

// ---------- Helden ----------
let ansicht=null;
function ansichtListe(){if(ansicht)return ansicht;ansicht=[];const rng=S.rng,daten=[[5,34,40,5],[4,17,26,4],[4,15,22,3],[3,8,12,2],[3,6,10,2],[2,2,4,1],[1,0,0,0]];
 try{for(const [i,[tomb,kills,wins,highest]] of daten.entries()){const g=M.makeGladiator(0);ansicht.push(M.hall.view({id:'ansicht-'+i,name:g.name,kills,wins,highest,tomb,cvPeak:400-i*45,ansicht:true,
  look:{appearance:{...g.appearance},height:g.height,weight:g.weight,muscle:g.muscle,fat:g.fat,missing:[],gear:{weapon:null,shield:null,armor:{}}}}));}}catch(e){}
 S.rng=rng;return ansicht;}
function liste(){const L=M.hall?.entries?.()||[];return L.length?L:ansichtListe();}
const st=()=>{const h=M.hall?.state?.()||(S.hall??={});return h;};
function aussen(){const L=liste(),ids=new Set(L.map(e=>String(e.id))),h=st();let a=h.welt;
 if(!Array.isArray(a)||a.length!==ZAHL||a.some(id=>id!=null&&!ids.has(String(id)))){a=L.slice(0,ZAHL).map(e=>e.id);while(a.length<ZAHL)a.push(null);h.welt=a;}
 const by=new Map(L.map(e=>[String(e.id),e]));return a.map(id=>id==null?null:by.get(String(id))||null);}
function innen(){const drau=new Set(aussen().filter(Boolean).map(e=>String(e.id)));return liste().filter(e=>!drau.has(String(e.id)));}

// ---------- Grabstellen ----------
const slot=i=>({x:HA.tx+(i%5)+.5,y:HA.ty+HA.h+((i/5)|0)+.42});
const BILD=new Map();
function bild(e){const key=e?String(e.id):'leer';let b=BILD.get(key);if(b)return b;const SW=100,SH=130,AX=50,AY=112,c=document.createElement('canvas');c.width=SW;c.height=SH;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
 try{if(e)M.hall.tomb(g,e,AX,AY,0);else M.hall.plot(g,AX,AY);}catch(err){}
 const w=Math.round(SW*KW),h=Math.round(SH*KW),k=document.createElement('canvas');k.width=w;k.height=h;const kg=k.getContext('2d');kg.imageSmoothingEnabled=true;kg.imageSmoothingQuality='high';kg.drawImage(c,0,0,w,h);
 const im=kg.getImageData(0,0,w,h),d=im.data;for(let j=3;j<d.length;j+=4)d[j]=d[j]>96?255:0;kg.putImageData(im,0,0);b={c,k,SW,SH,AX,AY};BILD.set(key,b);if(BILD.size>200)BILD.clear();return b;}
function grabZeichnen(ctx){const e=this.e,b=bild(e),q=W.iso(this.x,this.y),x=Math.round(q.x),y=Math.round(q.y);
 if(W.mini){ctx.fillStyle=e?'#77796f':'#1a1d1e';ctx.fillRect(x-4,y-(e?6:2),8,e?6:3);return;}
 if(W.detail){ctx.imageSmoothingEnabled=true;ctx.drawImage(b.c,x-b.AX*KW,y-b.AY*KW,b.SW*KW,b.SH*KW);ctx.imageSmoothingEnabled=false;}else ctx.drawImage(b.k,Math.round(x-b.AX*KW),Math.round(y-b.AY*KW));
 if(e?.tomb===5){const t=performance.now()/1000;for(let i=0;i<4;i++){const k=(t*.5+i/4)%1;ctx.globalAlpha=.8*(1-k);ctx.fillStyle='#f4d37a';ctx.fillRect(Math.round(x+(-14+i*9+Math.sin(t+i)*2)*KW),Math.round(y-(30+k*40)*KW),1,1);}ctx.globalAlpha=1;}}// Funken über der Legende
const graeber=[...Array(ZAHL)].map((_,i)=>({...slot(i),i,e:null,draw:grabZeichnen}));
let neuT=0;
const items0=H.items;H.items=(items,view)=>{items0?.(items,view);const now=performance.now();if(now-neuT>1000){neuT=now;const A=aussen();graeber.forEach((g,i)=>g.e=A[i]);}
 for(const g of graeber){const q=W.iso(g.x,g.y);if(q.x<view.x0-40||q.x>view.x1+40||q.y<view.y0-10||q.y>view.y1+60)continue;g.y_=q.y;g.oz=W.hz?W.hz(g.x,g.y):0;items.push({y:q.y,oz:g.oz,draw:grabZeichnen.bind(g)});}};

// ---------- Auswahl: wer steht draußen ----------
function zu(){document.getElementById('weltHalleWahl')?.remove();}
if(!document.getElementById('weltHalleCss')){const c=document.createElement('style');c.id='weltHalleCss';c.textContent='#weltHalleWahl .w-hz{display:block;width:100%;text-align:left;background:#1d2224;color:#d8d0b8;border:1px solid #3b403d;padding:6px 9px;font:inherit;font-size:12px;cursor:pointer}#weltHalleWahl .w-hz:hover,#weltHalleWahl .w-hz:focus-visible{background:#2b3133;border-color:#c9a85a;color:#f4d37a}#weltHalleWahl .w-hz b{color:#e2c27d}#weltHalleWahl .w-hz span{color:#a99e84}';document.head.appendChild(c);}
function waehlen(i){zu();const L=liste(),A=aussen(),jetzt=A[i],h=st(),v=document.createElement('div');v.id='weltHalleWahl';v.className='hs-detail';
 const zeile=e=>{const wo=A.findIndex(x=>x&&String(x.id)===String(e.id));return `<button class="w-hz" data-held="${esc(e.id)}"><b>${'✝'.repeat(Math.max(1,e.tomb))} ${esc(e.name)}</b> <span>${esc(STUFE[e.tomb]||'')} · ${esc(e.title||'')}${e.kills?' · '+e.kills+' getötet':''}${wo>=0?' · steht draußen ('+(wo+1)+')':''}</span></button>`;};
 v.innerHTML=`<div class="hs-dbox" role="dialog" aria-label="Grabstelle ${i+1}"><header><button class="hs-x" data-hz="zu" aria-label="Schließen">✕</button><p class="eyebrow">HALL OF THE FALLEN · GRABSTELLE ${i+1} VON ${ZAHL}</p><h2>${jetzt?esc(jetzt.name):'Leere Grabstelle'}</h2>
 <p class="hs-qual">${jetzt?esc(jetzt.epitaph||''):'Hier könnte ein Held liegen. Oder du. Später.'}</p></header>
 <p class="hs-legend">Wer soll hier draußen stehen? Die Besucher bleiben davor stehen und bewundern ihn.${L[0]?.ansicht?' (Noch keine echten Gefallenen: Helden nur zur Ansicht.)':''}</p>
 <div style="display:flex;flex-direction:column;gap:4px;max-height:46vh;overflow:auto">${L.map(zeile).join('')}<button class="w-hz" data-held="">⊘ leer lassen</button></div>
 ${jetzt&&!jetzt.ansicht?`<p style="margin-top:8px"><button class="w-hz" data-hz="sehen">Grab ansehen</button></p>`:''}</div>`;
 document.body.appendChild(v);
 v.addEventListener('click',ev=>{const b=ev.target.closest('[data-held],[data-hz]');if(ev.target===v||b?.dataset.hz==='zu'){zu();return;}if(!b)return;
  if(b.dataset.hz==='sehen'){zu();M.hall?.openDetail?.(jetzt.id);return;}
  const id=b.dataset.held||null,a=(h.welt||[]).slice(),alt=a.findIndex(x=>x!=null&&String(x)===String(id));if(id&&alt>=0)a[alt]=a[i];a[i]=id?L.find(e=>String(e.id)===id)?.id??null:null;h.welt=a;neuT=0;zu();M.weltGebaeude?.frisch?.('halle');});}
document.addEventListener('keydown',e=>{if(e.key==='Escape')zu();});
const tap0=H.tap;H.tap=(p,w)=>{if(!w){const k=Math.max(1,1.4/W.cam.s);for(const g of graeber){const q=W.iso(g.x,g.y),oz=W.hz?W.hz(g.x,g.y):0,ex=Math.abs(q.x-p.x),ey=q.y-oz-p.y;if(ex<12*k&&ey>-6*k&&ey<(g.e?.tomb===5?44:18)*k){waehlen(g.i);return true;}}}return tap0?tap0(p,w):false;};

// ---------- Besucher ----------
// Ein Platz vor einem besetzten Grab (Bildschirm), dazu der Pfad vom Weg herauf und wieder hinunter
function besuch(){const A=aussen(),voll=A.map((e,i)=>e?i:-1).filter(i=>i>=0);if(!voll.length)return null;const i=voll[(Math.random()*voll.length)|0],s=slot(i),
 ziel=W.iso(s.x+(Math.random()-.5)*.5,s.y+.42+Math.random()*.12),oben=W.iso(HA.pfadX+.5,HA.ty+HA.h+HA.hofH+.3),unten=W.iso(HA.pfadX+.5,(W.wegY?W.wegY(HA.pfadX):W.WEG_TY)+.5);
 return {hin:[unten,oben,ziel],zurueck:[oben,unten],blick:ziel.x<W.iso(s.x,s.y).x?0:1,grab:i};}
M.weltHalle={liste,aussen,innen,besuch,waehlen,zu,graeber:()=>graeber.map(g=>({i:g.i,x:g.x,y:g.y,id:g.e?.id??null,name:g.e?.name??null,stufe:g.e?.tomb??0})),ZAHL};
M.weltGebaeude?.frisch?.('halle');// jetzt sind die Gräber drinnen bekannt
})();
