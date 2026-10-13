'use strict';
/* =====================================================================================================
   GRUFT DER TIERE: In der Hall of the Fallen führt eine Treppe hinab. Unten liegen alle eigenen gefallenen Tiere
   (Hähne, Löwen …), sortiert nach Kampfwert und als Tiere gezeichnet, nicht als kleine Menschen.
   · Tiere aus der neuen Arena liefen als „Hilfsgladiatoren“ (id hahn-… / lion-…) über kill() in S.fallen und standen
     dann als winzige Menschen (Alter 1) in der Halle. Solche Einträge wandern jetzt in S.beastCrypt (nichts geht verloren).
   · Hähne werden mit ihrem echten Aussehen gezeichnet (Daten aus S.huehner.roosters, dort bleiben tote Hähne erhalten).
   · Neuer Speicherwert: S.beastCrypt = [{id, kind, rid, name, kw, day, cause, killer, fight}].
   ===================================================================================================== */
(()=>{
const M=window.MG;if(!M)return;const S=M.s,ART=window.ArenaArt,CF=window.CF||window.CockFight||null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const crypt=()=>(S.beastCrypt??=[]);
const animalId=id=>typeof id==='string'&&/^(hahn|lion)-/.test(id);
const kindOf=id=>id.startsWith('lion-')?'lion':'rooster';
const ridOf=id=>{const s=id.slice(id.indexOf('-')+1),j=s.lastIndexOf('-');return j>0?s.slice(0,j):s;};
const roosters=()=>S.huehner?.roosters||[];
const findR=(rid,name)=>roosters().find(R=>String(R.id)===String(rid))||roosters().find(R=>R.dead&&R.name===name)||null;
function kwOf(kind,R,L){try{const CH=window.Challenges;if(kind==='rooster'&&R)return CH.kw({kind:'rooster',R});if(kind==='lion'&&L)return CH.kw({kind:'lion',L});}catch{}return null;}
// Einträge aus S.fallen in die Gruft verschieben (auch alte Spielstände)
function migrate(){const F=S.fallen;if(!Array.isArray(F)||!F.some(e=>animalId(e?.id)))return false;const C=crypt();
 for(const e of F.filter(e=>animalId(e?.id))){const kind=kindOf(e.id),rid=ridOf(e.id),R=kind==='rooster'?findR(rid,e.name):null;
  if(!C.some(x=>x.id===e.id))C.push({id:e.id,kind,rid,name:e.name,kw:e.kw??kwOf(kind,R,null),day:e.day,cause:e.cause,killer:e.killer,fight:e.fight||''});}
 S.fallen=F.filter(e=>!animalId(e?.id));try{M.persist();}catch{}return true;}
// Halle nur für eigene Gladiatoren: wer beim Tod nicht im eigenen Kader stand (Gegner, Figuren aus Szenen …), kommt
// in S.foreignFallen (bleibt gespeichert, wird nicht gezeigt). Alte Einträge: bekannte Szenen-Kennungen oder in
// gespeicherten Kampfberichten nur auf der Gegnerseite.
const SCENE_ID=/^(les-|hs-|rex-|medic-|mr-|hall-|spr-|plot-|talk-|crowd-|lion-smith)/;
function foreign(e){if(!e)return false;if(e.owned===false)return true;if(e.owned===true)return false;const id=String(e.id||'');if(SCENE_ID.test(id))return true;
 let enemy=false,own=false;for(const r of S.records||[]){for(const a of r.attackSummary||[])if(a.id===id){if(a.team===0)own=true;else enemy=true;}for(const a of r.actors||[])if(a.id===id)own=true;}return enemy&&!own;}
function sweep(){const F=S.fallen;if(!Array.isArray(F)||!F.some(foreign))return false;const out=S.foreignFallen??=[];for(const e of F.filter(foreign))if(!out.some(x=>x.id===e.id))out.push(e);S.fallen=F.filter(e=>!foreign(e));try{M.persist();}catch{}return true;}
const baseFallen=M.onFallen;
M.onFallen=function(g,e){if(e&&g&&!animalId(g.id))e.owned=S.roster.some(x=>x.id===g.id);if(e?.owned===false)setTimeout(()=>{sweep();if(M.ui.getPage?.()==='fallen')M.ui.render();},0);const r=baseFallen?.apply(this,arguments);if(animalId(g?.id)){const kind=kindOf(g.id),rid=ridOf(g.id),R=kind==='rooster'?findR(rid,g.name):null;e.kw=kwOf(kind,R,null);setTimeout(()=>{migrate();if(M.ui.getPage?.()==='fallen')M.ui.render();},0);}return r;};
// Alle toten Tiere: Gruft + tote Hähne der Hühnerschule (+ deren Kampfliste), ohne Doppelte
function list(){const out=[],seen=new Set(),fl=S.huehner?.fallen||[];
 const add=x=>{const key=(x.kind||'rooster')+':'+(x.rid??x.name);if(seen.has(key))return;seen.add(key);out.push(x);};
 for(const e of crypt()){const R=e.kind==='rooster'?findR(e.rid,e.name):null;add({...e,R,kw:e.kw??kwOf(e.kind,R,null)});}
 for(const R of roosters().filter(R=>R.dead)){const f=fl.find(x=>x.name===R.name)||{};add({id:'r-'+R.id,kind:'rooster',rid:R.id,name:R.name,R,kw:kwOf('rooster',R,null),day:f.day??R.deathDay,cause:R.cause||f.cause,killer:R.killer||f.killer,fight:f.fight||''});}
 for(const f of fl)add({id:'f-'+f.name+f.day,kind:f.kind||'rooster',name:f.name,R:null,kw:null,day:f.day,cause:f.cause,killer:f.killer,fight:f.fight||''});
 return out.sort((a,b)=>(b.kw??-1)-(a.kw??-1)||(b.day||0)-(a.day||0));}
// ---------- Seiten ----------
const KIND={rooster:'Hahn',lion:'Löwe'};
function cryptPage(){const L=list();requestAnimationFrame(start);
 return `<section class="bc-page"><div class="pagehead"><p class="eyebrow">${esc(S.schoolName||'Ludus')} · UNTER DER HALLE</p><h1>Gruft der Tiere</h1><p>Federn, Mähnen, Krallen. Sie kämpften für dein Gold und fragten nie warum.</p></div>
 <div class="bc-vault"><canvas class="bc-head px" width="320" height="96" aria-hidden="true"></canvas></div>
 <div class="buttons bc-up"><button class="btn" data-action="nav:fallen">▲ TREPPE HINAUF · Hall of the Fallen</button></div>
 ${L.length?`<ol class="bc-grid">${L.map((e,i)=>`<li class="bc-niche"><canvas width="150" height="110" data-bc="${i}" class="px"></canvas><span class="bc-rank">${i+1}</span><b>${esc(e.name)}</b><small>${KIND[e.kind]||'Tier'} · KW ${e.kw??'?'}</small><small>Tag ${e.day??'?'}${e.fight?' · '+esc(e.fight):''}</small><small class="bc-cause">${esc(e.cause||'Gefallen')}${e.killer?' · durch '+esc(e.killer):''}</small></li>`).join('')}</ol>`:'<p class="bc-empty">Die Nischen sind leer. Noch hat kein Tier für dich sein Leben gelassen.</p>'}
 </section>`;}
let loop=0,cache=null;
function fallbackR(name){if(!CF?.createRooster)return null;let h=7;for(const ch of String(name))h=(h*31+ch.charCodeAt(0))%100000;try{return CF.createRooster({seed:h,minQuality:2,maxQuality:6});}catch{return null;}}
function start(){if(loop)return;cache=list();const tick=now=>{const head=document.querySelector('.bc-head');if(!head||!head.isConnected){loop=0;return;}loop=requestAnimationFrame(tick);const t=now/1000;paintHead(head,t);
 document.querySelectorAll('.bc-grid canvas[data-bc]').forEach(c=>{const e=cache[+c.dataset.bc];if(e)paintNiche(c,e,t+ +c.dataset.bc*.7);});};loop=requestAnimationFrame(tick);}
function paintHead(c,t){const g=c.getContext('2d'),W=c.width,H=c.height,R=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};g.imageSmoothingEnabled=false;
 R(0,0,W,H,'#120f0c');for(let y=0;y<H;y+=8)for(let x=(y/8%2)*10;x<W;x+=20)R(x,y,19,7,(x*7+y*3)%5?'#211b15':'#27201a');
 // Gewölbebogen
 g.fillStyle='#0a0806';g.beginPath();g.moveTo(96,H);g.lineTo(96,40);g.quadraticCurveTo(160,-6,224,40);g.lineTo(224,H);g.fill();
 // Treppe nach unten ins Dunkel
 for(let i=0;i<7;i++){const y=44+i*8,w=118-i*12;R(160-w/2,y,w,8,`rgb(${70-i*8},${58-i*7},${44-i*6})`);R(160-w/2,y,w,1,`rgb(${110-i*12},${92-i*10},${66-i*8})`);}
 // Fackeln
 for(const x of [70,250]){R(x-2,40,5,18,'#3b2a18');const f=Math.sin(t*9+x)*1.5;R(x-3,30+f,7,10,'#e07a24');R(x-2,27+f,5,7,'#f4c050');R(x-1,25+f,3,4,'#fff0b0');const gl=g.createRadialGradient(x,34,2,x,34,40);gl.addColorStop(0,'rgba(244,160,60,.28)');gl.addColorStop(1,'rgba(244,160,60,0)');g.fillStyle=gl;g.fillRect(x-40,0,80,80);}
 // Federn, die herabsinken
 for(let i=0;i<4;i++){const y=((t*10+i*27)%(H+10))-5,x=120+i*24+Math.sin(t*2+i)*6;R(x,y,3,1,'#d8cfbf');R(x+1,y+1,2,1,'#a89c88');}}
function paintNiche(c,e,t){const g=c.getContext('2d'),W=c.width,H=c.height;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);g.imageSmoothingEnabled=false;
 const bg=g.createRadialGradient(W/2,H*.62,6,W/2,H*.62,W*.6);bg.addColorStop(0,'#2e2720');bg.addColorStop(1,'#0e0b09');g.fillStyle=bg;g.fillRect(0,0,W,H);
 g.fillStyle='#3a3026';g.fillRect(14,H-12,W-28,6);g.fillStyle='#4e4134';g.fillRect(14,H-12,W-28,1);
 const bob=Math.sin(t*1.6)*2;g.save();g.filter='grayscale(.55) brightness(.9) sepia(.25)';g.globalAlpha=.92;
 try{if(e.kind==='lion'){ART.lion(g,e.L||{name:e.name,stats:{kraft:60,tempo:60,zaeh:50,wild:60},condition:{health:100,blood:100,rear:100,hunger:0}},{t:0,mood:'idle',x:W/2,y:H-12+bob,scale:.55,face:1});}
  else{const R=e.R||(e._fb??=fallbackR(e.name));if(R)ART.rooster(g,R,{t:0,mood:'idle',w:W,h:H,size:58,x:W/2,y:H-12+bob,seed:(R.seed||1)%7,shadow:false});}}catch{}
 g.restore();
 // Heiligenschein
 const hy=18+bob;g.strokeStyle='rgba(244,211,122,'+(.55+.25*Math.sin(t*2))+')';g.lineWidth=2;g.beginPath();g.ellipse(W/2+6,hy,14,4,0,0,7);g.stroke();}
// Treppe in der Halle
const basePage=M.schoolPage;
M.schoolPage=function(p){if(p==='crypt'){migrate();return cryptPage();}
 if(p==='fallen'){migrate();sweep();}let html=basePage?.apply(this,arguments);
 if(p==='fallen'&&typeof html==='string'){const n=list().length,stairs=`<div class="bc-stairs"><button class="btn" data-action="nav:crypt"><span class="bc-steps" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span><b>▼ TREPPE HINAB</b><small>Gruft der Tiere · ${n} ${n===1?'Tier':'Tiere'}</small></span></button></div>`;
  html=html.includes('<div class="hall-stage">')?html.replace('<div class="hall-stage">',stairs+'<div class="hall-stage">'):html+stairs;}
 return html;};
setTimeout(()=>{const a=migrate(),b=sweep();if((a||b)&&M.ui.getPage?.()==='fallen')M.ui.render();},0);
M.beastCrypt={list,migrate};
window.BEAST_CRYPT_READY=true;
})();
