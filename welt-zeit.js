'use strict';
// =====================================================================================================================
// TAGESLAUF (welt-zeit.js) · Uhr, Tageszeiten, Licht, Sonnenuhr und automatischer Tageswechsel der großen Karte.
// Nur auf tageslauf-editor.html geladen (über WELT_EXTRA in weltkarte-boot.js), nicht im Spiel. Wunsch Thomas 11.11.2026.
//
// · Ein Tag dauert 4 Minuten echte Zeit (LEN), in Arena Theory 2.0 12 Minuten (B0), und läuft von 6 Uhr bis 6 Uhr. Bei Sonnenaufgang wechselt der Tag von selbst.
// · Es gibt nur einen Tageswechsel: Die Uhr ruft den Tageswechsel des Spiels auf (M.ui.click('rest') → M.advanceDay),
//   genau einen Tag. Der Knopf „NÄCHSTER TAG“ ist hier gesperrt, Tage lassen sich nicht überspringen.
// · Die Uhr steht im Kampf, bei offener Verwaltungsseite (die Karte zeichnet dann nicht) und solange eine Filmszene läuft.
// · Licht: eine einzige Farbfläche über der Karte (multiply) plus ein paar Lichtkreise bei Nacht. Kostet fast nichts.
// · Reine Rechnung (Stunde, Phase, Lichtfarbe, römische Zahl) steht oben und ist in Node prüfbar (tests/welt-zeit.cjs).
// Kein Speicherwert. Schalter für das Spiel: M.weltTag.aktiv, M.dawnQuiet (day-gold.js zeigt dann seine Animation nicht).
// =====================================================================================================================
(()=>{
// ---------- reine Rechnung ----------
const LEN=240,START=6;
const hourOf=f=>(START+((f%1)+1)%1*24)%24;
const PHASES=[[5,'Morgengrauen'],[7,'Morgen'],[10,'Vormittag'],[12,'Mittag'],[14,'Nachmittag'],[18,'Abend'],[21,'Nacht']];
function phase(h){let n='Nacht';for(const [from,name] of PHASES)if(h>=from)n=name;return n;}
// Lichtfarbe je Stunde: [Stunde, r, g, b, Leuchten 0..1]. Die Karte wird mit dieser Farbe multipliziert.
const KEYS=[[0,54,64,112,1],[4.6,54,64,112,1],[5.5,128,108,140,.8],[6.3,255,200,156,.25],[7.5,255,236,212,0],[9,255,255,255,0],[16.5,255,255,255,0],
 [18,255,226,184,0],[19.2,250,172,124,.2],[20.2,158,116,146,.7],[21.3,70,78,128,1],[24,54,64,112,1]];
function licht(h){h=((h%24)+24)%24;for(let i=1;i<KEYS.length;i++){const a=KEYS[i-1],b=KEYS[i];if(h<=b[0]){const u=(h-a[0])/(b[0]-a[0]||1);return [1,2,3,4].map(k=>a[k]+(b[k]-a[k])*u);}}return KEYS[0].slice(1);}
function roman(n){n=Math.max(1,Math.floor(n));if(n>3999)return String(n);let s='';for(const [v,r] of [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']])while(n>=v){s+=r;n-=v;}return s;}
const zeitText=h=>String(Math.floor(h)).padStart(2,'0')+':'+String(Math.floor(h%1*6)*10).padStart(2,'0');
const core={LEN,START,hourOf,phase,licht,roman,zeitText};
if(typeof window==='undefined'){module.exports=core;return;}
window.WeltZeit=core;

// ---------- Anschluss an die Karte ----------
const M=window.MG,W=window.WeltKarte,H=window.WeltHook;if(!M||!W||!H)return;const S=M.s,$=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// B0 (Thomas 13.11.2026): In Arena Theory 2.0 dauert ein Tag 12 Minuten (eine Spielstunde 30 s), damit Wege zur Arena in Spielstunden passen. Editor: 4 Minuten.
const st={f:1/24,len:window.AT2?720:LEN,tempo:1,pause:false,eile:false,licht:true,block:'',retry:0};
const hour=()=>hourOf(st.f);
M.dawnQuiet=true;
const STORY='.medic-night,.medic-film,.lesson-film,.lion-film,.smith-ceremony,.lesson-start,.medic-start,.lesson-end,.medic-end,.hs-present,.mg-dawn';
const story=()=>!!document.querySelector(STORY);
let inner=false;
// „NÄCHSTER TAG“ gesperrt: Tage vergehen von selbst. Mehrtägige Ruhe (Familie, Doktor) bleibt wie im Spiel.
const baseClick=M.schoolClick;
M.schoolClick=function(a){if((a==='rest'||a==='rest3')&&!inner&&M.weltTag.aktiv){M.ui.notify?.('Die Tage vergehen jetzt von selbst. Schau auf die Sonnenuhr.');return true;}return baseClick?.apply(this,arguments);};

const LINES=['Der nächste Tag.','Der nächste Tag. Alle leben noch. Fast alle.','Der nächste Tag. Das Bier ist warm, die Klingen kalt.','Der nächste Tag. Die Sonne geht auf. Leider auch über dir.','Der nächste Tag. Neue Narben, neue Chancen.','Die Hähne schreien. Die Verletzten auch.','Ein neuer Morgen. Zählt durch, wer noch da ist.'];
function wechsel(){const d0=S.day;inner=true;try{M.ui.click('rest');}catch(e){console.error(e);}finally{inner=false;}
 // Tagesbericht („Tag n“) des Spiels schließen: später ersetzt ihn der Tagesbericht der Karte
 const md=$('modal');if(md&&!md.hidden&&/^\s*Tag \d+/.test(md.querySelector('h2,h1,header')?.textContent||md.textContent.slice(0,12)))try{M.ui.close();}catch(e){}
 const n=$('notice');
 if(S.day===d0){if(story()){st.f=0;st.eile=false;return;}// eine Szene hat den Tageswechsel übernommen (z. B. Medicus-Kapitel)
  st.block=n?.textContent||'Der Tag kann gerade nicht enden.';st.f=.99999;st.retry=4;paintDial(true);return;}
 if(n){n.textContent='';n.style.opacity=0;n.classList?.remove('show');}
 st.block='';st.f=st.f%1;st.eile=false;feier(d0,S.day);paintDial(true);for(const fn of listeners)try{fn(S.day);}catch(e){console.error(e);}}
const listeners=[];
H.tick=dt=>{if(!M.weltTag.aktiv||st.pause||S.battle||story())return;
 if(st.retry>0){st.retry-=dt;if(st.retry<=0)wechsel();return;}
 st.f+=dt*(st.eile?12:1)/st.len;if(st.f>=1)wechsel();paintDial();};// dt ist schon mit dem Spieltempo (W.tempo) vervielfacht

// ---------- Licht ----------
let glow=null;
function glowSprite(){if(glow)return glow;const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),r=g.createRadialGradient(64,64,2,64,64,64);r.addColorStop(0,'rgba(255,196,110,.85)');r.addColorStop(.35,'rgba(255,150,70,.32)');r.addColorStop(1,'rgba(255,120,40,0)');g.fillStyle=r;g.fillRect(0,0,128,128);return glow=c;}
const LAMPS=[];
function lamps(){if(W.lamps)return W.lamps;if(LAMPS.length)return LAMPS;const Hf=W.HOF;for(const s of W.SITES){if(s.hof||s.post||s.id==='friedhof')continue;LAMPS.push({x:s.x+s.w/2,y:s.y+s.h*.7,r:s.id==='dorf'||s.id==='arena'?240:150});}
 for(const [x,y] of [[Hf.x+40,Hf.y+40],[Hf.x+Hf.w-40,Hf.y+40],[Hf.x+40,Hf.y+Hf.h-40],[Hf.x+Hf.w-40,Hf.y+Hf.h-40],[Hf.x+Hf.w*.68,Hf.y+Hf.h-6],[Hf.x+Hf.w/2,Hf.y+Hf.h/2]])LAMPS.push({x,y,r:x===Hf.x+Hf.w/2?260:130});return LAMPS;}
let L=[255,255,255,0];
H.light=(ctx,VW,VH)=>{L=st.licht?licht(hour()):[255,255,255,0];if(L[0]>253&&L[1]>253&&L[2]>253)return;
 ctx.globalCompositeOperation='multiply';ctx.fillStyle=`rgb(${L[0]|0},${L[1]|0},${L[2]|0})`;ctx.fillRect(0,0,VW,VH);ctx.globalCompositeOperation='source-over';};
const worldHooks=[];
H.world=(ctx,view,dt)=>{if(L[3]>.02){const sp=glowSprite(),t=performance.now()/1000;ctx.globalCompositeOperation='lighter';let i=0;
  for(const l of lamps()){i++;if(l.x+l.r<view.x0||l.x-l.r>view.x1||l.y+l.r<view.y0||l.y-l.r>view.y1)continue;ctx.globalAlpha=L[3]*(.5+.08*Math.sin(t*7+i*1.7)+.05*Math.sin(t*13+i));ctx.drawImage(sp,l.x-l.r,l.y-l.r,l.r*2,l.r*2);}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';}
 for(const fn of worldHooks)fn(ctx,view,dt);};

// ---------- Sonnenuhr oben in der Leiste ----------
const bar=document.querySelector('#weltUi .w-bar'),uhr=document.createElement('div');uhr.className='w-uhr';uhr.id='wUhr';
uhr.innerHTML='<canvas width="144" height="144" aria-label="Sonnenuhr"></canvas><div><b id="wTag"></b><small id="wPhase"></small></div>';bar.insertBefore(uhr,bar.firstChild);
// Spieltempo (A2): ⏸ 1× 2× 3× für alles auf der Karte (Uhr, Gladiatoren, Besucher). Ein Wert: W.tempo, 0 = Pause.
const tp=document.createElement('div');tp.className='w-tempo';tp.setAttribute('role','group');tp.setAttribute('aria-label','Spieltempo');
tp.innerHTML=[[0,'⏸','Pause'],[1,'1×','Normal'],[2,'2×','Schneller'],[3,'3×','Am schnellsten. Die Toten verwesen auch schneller.']].map(([v,t,h])=>'<button data-tp="'+v+'" title="'+h+'">'+t+'</button>').join('');uhr.appendChild(tp);
tp.addEventListener('click',e=>{const b=e.target.closest('[data-tp]');if(!b)return;const v=+b.dataset.tp;if(v===0)M.weltTag.pause(true);else{st.pause=false;M.weltTag.tempo(v);paintDial(true);}});
function wirk(){W.tempo=st.pause?0:st.tempo;for(const b of tp.querySelectorAll('[data-tp]'))b.classList.toggle('on',st.pause?b.dataset.tp==='0':+b.dataset.tp===st.tempo);}
const dc=uhr.querySelector('canvas'),dg=dc.getContext('2d');let dialKey=-1;
function paintDial(force){const h=hour(),key=Math.floor(h*12)+S.day*1000+(st.block?.5:0);if(!force&&key===dialKey)return;dialKey=key;
 const g=dg,R=72,c=72;g.clearRect(0,0,144,144);
 if(window.AT2_IKON)AT2_IKON.uhr(g,h,h>=6&&h<18,st.block);  // Pixeluhr im 2.0-Stil (welt-ikonen.js)
 else{
 // Steinring
 g.fillStyle='#2a2019';g.beginPath();g.arc(c,c,R,0,7);g.fill();g.fillStyle='#9b8f7e';g.beginPath();g.arc(c,c,R-3,0,7);g.fill();g.fillStyle='#b8ad9a';g.beginPath();g.arc(c,c-2,R-6,0,7);g.fill();
 // Himmel oben (Tag), unten (Nacht)
 const r=R-22;g.save();g.beginPath();g.arc(c,c,r,0,7);g.clip();const sky=g.createLinearGradient(0,c-r,0,c);sky.addColorStop(0,'#6fb2d8');sky.addColorStop(1,'#f1d6a0');g.fillStyle=sky;g.fillRect(0,0,144,c);g.fillStyle='#161d3a';g.fillRect(0,c,144,c);
 g.fillStyle='#f4ecd0';for(let i=0;i<14;i++)g.fillRect(c-r+((i*37)%(2*r)),c+6+((i*23)%(r-10)),2,2);g.fillStyle='#5e4229';g.fillRect(0,c-1,144,3);g.restore();
 // Stunden: römische Zahlen der 24-Stunden-Uhr, Mittag oben, Mitternacht unten
 g.fillStyle='#2a2019';g.textAlign='center';g.textBaseline='middle';
 for(let k=0;k<24;k++){const a=Math.PI+(k-6)/24*Math.PI*2,x=c+Math.cos(a)*(R-13),y=c+Math.sin(a)*(R-13);if(k%3===0){g.font='bold '+(k===0?11:13)+'px Georgia,serif';g.fillText(roman(k===0?24:k),x,y+1);}else{g.fillRect(Math.round(c+Math.cos(a)*(R-11))-1,Math.round(c+Math.sin(a)*(R-11))-1,3,3);}}
 // Stundenzeiger mit Sonne (Tag) oder Mond (Nacht)
 const a=Math.PI+(h-6)/24*Math.PI*2,tx=c+Math.cos(a)*(r-10),ty=c+Math.sin(a)*(r-10),day=h>=6&&h<18;
 g.strokeStyle='#2a2019';g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(c,c);g.lineTo(tx,ty);g.stroke();g.strokeStyle='#d7b24a';g.lineWidth=3.5;g.beginPath();g.moveTo(c,c);g.lineTo(tx,ty);g.stroke();
 if(day){g.fillStyle='#2a2019';g.beginPath();g.arc(tx,ty,12,0,7);g.fill();g.fillStyle='#ffd65a';g.beginPath();g.arc(tx,ty,10,0,7);g.fill();g.fillStyle='#fff2b0';g.beginPath();g.arc(tx-2,ty-2,5,0,7);g.fill();}
 else{g.fillStyle='#0c1024';g.beginPath();g.arc(tx,ty,12,0,7);g.fill();g.fillStyle='#e9e4cf';g.beginPath();g.arc(tx,ty,10,0,7);g.fill();g.fillStyle='#161d3a';g.beginPath();g.arc(tx+5,ty-3,8,0,7);g.fill();}
 g.fillStyle='#2a2019';g.beginPath();g.arc(c,c,7,0,7);g.fill();g.fillStyle='#d7b24a';g.beginPath();g.arc(c,c,4,0,7);g.fill();}
 $('wTag').textContent='TAG '+S.day;$('wPhase').textContent=st.block?'⏳ '+st.block:phase(h)+' · '+zeitText(h)+(st.pause?' · Pause':st.eile?' · die Zeit eilt':'');uhr.classList.toggle('block',!!st.block);}

// ---------- Tageswechsel: Sonnenaufgang über der Karte, ohne das Spiel anzuhalten ----------
function feier(from,to){document.getElementById('wTagwechsel')?.remove();const v=document.createElement('div');v.id='wTagwechsel';const line=LINES[Math.floor(Math.random()*LINES.length)];
 const who=M.workshop?.state?.master?.name||'Der Schmied';
 v.innerHTML=`<i class="tw-schein"></i><i class="tw-strahl"></i><div class="tw-karte"><span class="tw-sonne"><em></em><u></u></span><span class="tw-horizont"></span><div class="tw-zahl"><b class="alt">TAG ${esc(from)}</b><b class="neu">TAG ${esc(to)}</b></div><small class="tw-dies">DIES ${roman(to)}</small><small class="tw-say"><i>${esc(who)}</i> „${esc(line)}“</small></div>`;
 document.getElementById('welt').appendChild(v);try{M.sound?.('rise');}catch(e){}uhr.classList.add('neu');setTimeout(()=>uhr.classList.remove('neu'),2600);setTimeout(()=>v.remove(),5200);}

M.weltTag={aktiv:true,st,get stunde(){return hour();},get phase(){return phase(hour());},
 eile(on){st.eile=!!on;paintDial(true);},
 setze(h){st.f=(((h-START)/24)%1+1)%1;st.retry=0;st.block='';paintDial(true);},
 tempo(x){st.tempo=x;wirk();},pause(on){st.pause=!!on;wirk();paintDial(true);},laenge(s){st.len=s;},lichtAn(on){st.licht=!!on;},
 feier,beiWechsel(fn){listeners.push(fn);},welt(fn){worldHooks.push(fn);}};
wirk();paintDial(true);
})();
