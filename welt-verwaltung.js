'use strict';
// =====================================================================================================================
// VERWALTUNG (welt-verwaltung.js) · Arena Theory 2.0, Schritt A4 (Thomas 13.11.2026, AT2_FAHRPLAN.md).
// Festes, kleines Verwaltungsgebäude am zentralen Platz (Regel 12, Haus und Feldtyp in welt-raster.js, Hausrahmen in welt-gebaeude.js).
// · Einrichtung (in das vorgezeichnete Hausbild gemalt): Thron auf Podest an der Rückwand, zwei Statuen des Lanista (eine ohne Nase),
//   Pult mit blutbeflecktem Schuldbuch, Spucknapf für Bittsteller, roter Teppich von der Tür zum Thron, Bilder des Lanista mit Sprüchen.
// · Berater Mortimer Graves (eigene Pixelfigur, steht am Pult, nur bei offenem Dach zu sehen; Antippen: Name, Rolle, Spruch).
//   Ratte Tiberius auf der Schulter. Ab Etappe I ist er auch der Manager (Fahrplan, Entscheidungen).
// · Antippen des Hauses: Dach auf (wie bei allen Häusern) und das Pergamentfenster „Verwaltung“ mit dem Reiter „Übersicht“:
//   Gold (S.gold), Ruhm (S.fame), Tag (S.day). Eine Zeile antippen: Kommentar des Beraters. Weitere Reiter kommen mit ihren Systemen.
//   Ehre gibt es nicht (Entscheidung Thomas). Schließen per ✕ und Esc. Die Uhr läuft weiter.
// · Der Lanista sitzt ab und zu auf dem Thron (welt-npc.js fragt thron(h)).
// · Texte aus der Sprachdatei (Regel 10), Stil Rattenpergament (Regel 19), Symbole aus welt-ikonen.js.
// · Leistung: Einrichtung nur beim Vorzeichnen des Hauses, Berater 4 vorgezeichnete Bilder (welt-npc.js), Fenster rechnet nur offen (4× je s).
// · Notausschalter: 'welt-verwaltung' aus WELT_EXTRA in arena-theory-2.html nehmen (das Haus steht dann leer, ohne Fenster).
// =====================================================================================================================
(()=>{
const M=window.MG,W=window.WeltKarte,H=window.WeltHook,G=M?.weltGebaeude,L=window.AT2Sprache;if(!M||!W||!H||!G||W.T.VERWALTUNG==null)return;
const S=M.s,N=W.N,TAU=Math.PI*2,t=(k,v)=>L?L.t(k,v):k;

// ---------- Zeichenhilfen (wie in welt-gebaeude.js) ----------
const sh=(c,k)=>'rgb('+c.map(v=>Math.round(Math.max(0,Math.min(255,v*k)))).join(',')+')';
const pt=(x,y,z=0)=>{const p=W.iso(x,y);return [p.x,p.y-z];};
function quad(g,P,fill){g.beginPath();g.moveTo(P[0][0],P[0][1]);for(let i=1;i<P.length;i++)g.lineTo(P[i][0],P[i][1]);g.closePath();g.fillStyle=fill;g.fill();}
function kiste(g,x0,y0,x1,y1,z0,z1,c,k=1){quad(g,[pt(x0,y1,z0),pt(x1,y1,z0),pt(x1,y1,z1),pt(x0,y1,z1)],sh(c,.72*k));quad(g,[pt(x1,y1,z0),pt(x1,y0,z0),pt(x1,y0,z1),pt(x1,y1,z1)],sh(c,.88*k));quad(g,[pt(x0,y0,z1),pt(x1,y0,z1),pt(x1,y1,z1),pt(x0,y1,z1)],sh(c,1.08*k));}
function oval(g,x,y,z,rx,ry,col){const p=pt(x,y,z);g.fillStyle=col;g.beginPath();g.ellipse(p[0],p[1],rx,ry,0,0,TAU);g.fill();}
const MARMOR=[232,228,218],GOLD=[218,176,74],ROT=[150,40,38],HOLZ=[110,72,40],BRONZE=[150,108,52],BLUT='#6a0c06';

// ---------- Rollen der Felder: a quer zur Tür (0…1), b von hinten (0) nach vorn zur Tür (1) ----------
function rollen(h){if(h.vwR)return h.vwR;const sy=h.door.side==='y',bx0=h.bx0,by0=h.by0,Wq=sy?h.bx1-bx0+1:h.by1-by0+1,D=sy?h.by1-by0+1:h.bx1-bx0+1;
 const dx=h.door.k%N,dy=(h.door.k/N)|0,mid=sy?dx-bx0:dy-by0,feld=(i,j)=>sy?(by0+j)*N+bx0+i:(by0+i)*N+bx0+j,R=new Map();
 const setz=(i,j,r)=>{if(i<0||j<0||i>=Wq||j>=D)return;const k=feld(i,j);if(h.set.has(k)&&k!==h.door.k&&!R.has(k))R.set(k,r);};
 setz(mid,0,'thron');if(Wq>=3){setz(0,0,'statue');setz(Wq-1,0,'statueKaputt');}
 if(D>=3){setz(mid+1,1,'pult');setz(mid-1,1,'napf');}
 for(let j=1;j<D;j++)setz(mid,j,'teppich');
 const thron=[...R].find(([,r])=>r==='thron')?.[0],pult=[...R].find(([,r])=>r==='pult')?.[0];
 return h.vwR={R,sy,thron,pult};}
// Weltpunkt im Feld k aus (a quer, b Tiefe)
function P(h,k,a,b){const x=k%N,y=(k/N)|0;return h.vwR.sy?[x+a,y+b]:[x+b,y+a];}
function box(g,h,k,a0,b0,a1,b1,z0,z1,c,f=1){const p=P(h,k,a0,b0),q=P(h,k,a1,b1);kiste(g,Math.min(p[0],q[0]),Math.min(p[1],q[1]),Math.max(p[0],q[0]),Math.max(p[1],q[1]),z0,z1,c,f);}
function ov(g,h,k,a,b,z,rx,ry,col){const p=P(h,k,a,b);oval(g,p[0],p[1],z,rx,ry,col);}
function flaeche(g,h,k,a0,b0,a1,b1,z,col){quad(g,[P(h,k,a0,b0),P(h,k,a1,b0),P(h,k,a1,b1),P(h,k,a0,b1)].map(([x,y])=>pt(x,y,z)),col);}

function thron(g,h,k){box(g,h,k,.08,.1,.92,.9,0,4,MARMOR);box(g,h,k,.12,.14,.88,.86,4,6,ROT);// Podest mit rotem Belag
 box(g,h,k,.24,.14,.76,.3,6,34,GOLD);box(g,h,k,.3,.16,.7,.28,20,32,ROT);// Lehne, rotes Polster
 box(g,h,k,.24,.3,.76,.74,6,13,GOLD);box(g,h,k,.27,.32,.73,.72,13,15,ROT);// Sitz
 box(g,h,k,.18,.3,.27,.74,6,20,GOLD,.9);box(g,h,k,.73,.3,.82,.74,6,20,GOLD,.9);// Armlehnen
 ov(g,h,k,.5,.15,37,4,3,sh(GOLD,1.15));// Krone obenauf
 flaeche(g,h,k,.36,.78,.52,.9,6.2,BLUT);flaeche(g,h,k,.55,.82,.6,.88,6.2,BLUT);}// alter Fleck vor dem Thron (Bittsteller)
function statue(g,h,k,kaputt){box(g,h,k,.28,.28,.72,.72,0,9,[176,170,160]);box(g,h,k,.32,.32,.68,.68,9,11,[150,144,136]);// Sockel
 box(g,h,k,.38,.4,.62,.6,11,30,MARMOR);box(g,h,k,.34,.42,.4,.58,22,30,MARMOR,.95);box(g,h,k,.6,.42,.66,.58,20,31,MARMOR,.95);// Toga, Arme
 box(g,h,k,.62,.46,.66,.54,31,37,MARMOR);// erhobene Faust
 ov(g,h,k,.5,.5,35,4,4.5,sh(MARMOR,1.02));ov(g,h,k,.5,.5,38,3.5,2,sh([200,196,186],1));// Kopf, Lorbeer
 const n=pt(...P(h,k,.5,.62),34);
 if(!kaputt){g.fillStyle=sh(MARMOR,.85);g.fillRect(Math.round(n[0])-1,Math.round(n[1])-1,2,3);}
 else{g.fillStyle='#4a4640';g.fillRect(Math.round(n[0])-1,Math.round(n[1]),2,1);const r=pt(...P(h,k,.3,.86),0);g.fillStyle=sh(MARMOR,.9);g.fillRect(Math.round(r[0]),Math.round(r[1])-1,2,2);// Nase liegt am Boden
  g.fillStyle='#5a5650';const c=pt(...P(h,k,.45,.5),26);for(let i=0;i<5;i++)g.fillRect(Math.round(c[0]+(i&1)),Math.round(c[1]+i*2),1,2);}}// Riss
function pult(g,h,k){box(g,h,k,.22,.3,.78,.7,0,14,HOLZ);box(g,h,k,.2,.28,.8,.72,14,16,HOLZ,1.15);
 box(g,h,k,.3,.36,.7,.64,16,17.5,[232,218,180]);flaeche(g,h,k,.49,.36,.51,.64,17.6,'#8a7a5a');// offenes Schuldbuch
 for(const [a,b] of [[.36,.44],[.6,.52],[.42,.58],[.64,.4]])flaeche(g,h,k,a,b,a+.05,b+.05,17.6,BLUT);// Blutflecken
 box(g,h,k,.72,.3,.77,.35,16,22,[238,230,206]);ov(g,h,k,.745,.325,23.5,1.2,2,'#f8c840');}// Kerze
function napf(g,h,k){ov(g,h,k,.5,.5,1,7,3.5,sh(BRONZE,.7));ov(g,h,k,.5,.5,4,7,3.5,sh(BRONZE,1.1));ov(g,h,k,.5,.5,4.2,5,2.4,'#3a2a14');ov(g,h,k,.53,.5,4.3,2,1,'#6a5a2a');
 flaeche(g,h,k,.2,.72,.3,.8,.2,'rgba(90,80,40,.6)');}// daneben vorbei
function teppich(g,h,k){flaeche(g,h,k,.26,0,.74,1,.3,sh(GOLD,.85));flaeche(g,h,k,.3,0,.7,1,.4,sh(ROT,1));
 const s=W.h2(k%N,(k/N)|0,117);if(s<.5)flaeche(g,h,k,.4,.3+s*.4,.5,.38+s*.4,.5,BLUT);if(s>.8)flaeche(g,h,k,.55,.6,.6,.66,.5,'#3a2a14');}// Fußspuren, Flecken
const MAL={thron,statue:(g,h,k)=>statue(g,h,k,false),statueKaputt:(g,h,k)=>statue(g,h,k,true),pult,napf,teppich};

// ---------- Texte ----------
const PLAKATE=8,LAGE=3;
const plakate=()=>Array.from({length:PLAKATE},(_,i)=>t('verw.p'+(i+1)));
function lage(){const gold=S.gold||0,ruhm=S.fame||0,L0=[];if(gold<200)L0.push(t('verw.l.wenigGold'));else if(gold>=5000)L0.push(t('verw.l.vielGold'));
 if(ruhm<100)L0.push(t('verw.l.wenigRuhm'));else if(ruhm>=1000)L0.push(t('verw.l.vielRuhm'));L0.push(t('verw.l.tag',{tag:S.day||1}));
 for(let i=1;i<=LAGE;i++)L0.push(t('verw.l.'+i));return L0[(Math.random()*L0.length)|0];}

// ---------- Hausart eintragen ----------
const E={titel:()=>t('verw.schild'),zahl:()=>1,wort:()=>[t('verw.thron1'),t('verw.thronN')],plakate,
 male(g,x,y,k,h){const r=rollen(h).R.get(k);if(!r)return false;MAL[r](g,h,k);return r!=='teppich';}};
G.einrichtung('verwaltung',E);
const haus=()=>G.haeuser().find(h=>h.art==='verwaltung')||null;
function thronPlatz(h){const R=rollen(h);if(R.thron==null)return null;const [x,y]=P(h,R.thron,.5,.56);return {x,y};}
L?.beiWechsel(()=>{for(const h of G.haeuser())if(h.art==='verwaltung'){h.titel=E.titel();h.wort=E.wort();for(const p of h.poster)p.text='';}fuellen();});

// ---------- Berater Mortimer Graves (Pixelfigur im Ludus-Maßstab, welt-npc.js verkleinert sie) ----------
function mortimer(c,x,y,tt){const R=(a,b,w,hh,col)=>{c.fillStyle=col;c.fillRect(Math.round(x+a),Math.round(y+b),w,hh);};const f=Math.round(tt*2)%4;
 R(-9,-1,7,2,'#4a2a14');R(3,-1,7,2,'#4a2a14');// Sandalen
 for(let i=0;i<40;i++){const w=Math.round(13+i*.22);R(-w/2+1+(i>30?(i-30)*.3:0),-2-i,w,1,i%9===4?'#2a2630':'#1c181c');}// schwarze Toga, oben nach vorn gebeugt
 R(-4,-30,3,3,'#24285a');R(2,-14,4,2,'#24285a');R(-3,-8,2,3,'#24285a');// Tintenflecken
 R(5,-40,10,4,'#1c181c');R(12,-40,4,9,'#d8b89a');// Arm nach vorn, Hand
 R(13,-46,11,8,'#7a4a24');R(14,-45,9,6,'#2a1a10');for(let i=0;i<5+f;i++)R(15+(i%5)*1.6,-44+((i/5)|0)*3,1,2,'#d8c8a0');R(14,-43,8,1,'#d8c8a0');// Wachstafel mit Strichliste (Tote), jedes Bild einer mehr
 R(14,-45,1,1,'#d8c8a0');R(-8,-38,3,8,'#1c181c');R(-9,-30,3,3,'#d8b89a');// zweiter Arm
 R(0,-54,13,13,'#d8b89a');R(1,-55,11,2,'#e6c8aa');// kahler Kopf, vorgeschoben
 R(-1,-50,3,6,'#9a9a96');R(10,-50,3,5,'#9a9a96');R(0,-45,2,2,'#9a9a96');// grauer Haarkranz
 R(12,-49,4,3,'#c89878');R(15,-47,1,1,'#b07a60');// lange Nase
 R(7,-50,3,2,'#3a2418');R(8,-50,1,1,'#f0e0c0');// Auge unter schwerem Lid
 R(7,-44,4,1,'#6a3424');R(10,-45,1,1,'#6a3424');// schmales Lächeln
 R(-2,-60,1,4,'#101018');R(-3,-63,1,4,'#101018');R(-4,-66,1,4,'#2a3a6a');R(-1,-56,2,2,'#101018');// Rabenfeder hinterm Ohr
 R(-7,-44,8,4,'#6a6460');R(-1,-46,3,3,'#6a6460');R(1,-45,1,1,'#c4281a');R(2,-46,1,1,'#e8b0b0');// Ratte Tiberius auf der Schulter
 const sw=[0,1,2,1][f];R(-10,-43+sw,3,1,'#c88a8a');R(-12,-42+sw*1.4,2,1,'#c88a8a');}
M.weltNpc?.dazu?.({id:'berater',name:()=>t('verw.berater'),rolle:()=>t('verw.rolle'),ort:'verwaltung',spruch:lage,
 platz(h){const R=rollen(h);if(R.pult==null)return null;const [x,y]=P(h,R.pult,.1,.95);return {x,y,innen:true};},mal:mortimer});

// ---------- Fenster „Verwaltung“ ----------
const st=document.createElement('style');st.textContent=
 '#wVerw{position:fixed;right:10px;top:64px;z-index:58;width:min(330px,calc(100% - 20px));padding:14px 16px 12px;font-size:16px}#wVerw[hidden]{display:none}'+
 '#wVerw header{display:flex;align-items:center;gap:8px}#wVerw header h3{flex:1;margin:0;font-size:24px}#wVerw .vw-reiter{display:flex;gap:6px;margin:8px 0}'+
 '#wVerw .vw-reiter button{min-height:36px;padding:0 12px;font-size:17px}#wVerw .vw-rat{margin:6px 0 10px;line-height:1.3}#wVerw .vw-rat small{display:block;font-size:15px}'+
 '#wVerw .vw-zeile{display:flex;align-items:center;gap:8px;width:100%;min-height:40px;padding:2px 8px;margin:4px 0;font-size:18px;text-align:left}'+
 '#wVerw .vw-zeile span{flex:1}#wVerw .vw-zeile b{font-size:20px}#wVerw .vw-mehr{margin:0 4px 6px;font-size:15px;line-height:1.3}#wVerw .vw-mehr[hidden]{display:none}';
document.head.appendChild(st);
const el=document.createElement('div');el.id='wVerw';el.className='ws-papier';el.hidden=true;el.setAttribute('role','dialog');
const ZEILEN=[['gold','gold',()=>Math.floor(S.gold||0)+' G'],['ruhm','ruhm',()=>String(Math.floor(S.fame||0))],['tag','tag',()=>String(S.day||1)]];
el.innerHTML='<header><i class="ws-i" data-i="verwaltung"></i><h3></h3><button class="w-x" data-x>✕</button></header><div class="vw-reiter"><button class="w-btn on" data-r="uebersicht"></button></div>'+
 '<div class="vw-rat"><b></b><small></small></div>'+ZEILEN.map(([id,ik])=>`<button class="w-btn vw-zeile" data-z="${id}"><i class="ws-i" data-i="${ik}"></i><span></span><b></b></button><div class="vw-mehr" data-m="${id}" hidden></div>`).join('');
document.body.appendChild(el);
let spruch='',offenH=null,timer=0;const wert={};
function fuellen(){if(el.hidden)return;el.setAttribute('aria-label',t('verw.titel'));el.querySelector('h3').textContent=t('verw.titel');el.querySelector('header .w-x').setAttribute('aria-label',t('verw.zu'));
 el.querySelector('[data-r]').textContent=t('verw.uebersicht');el.querySelector('.vw-rat b').textContent=t('verw.berater');el.querySelector('.vw-rat small').textContent='„'+spruch+'“';
 for(const [id] of ZEILEN){el.querySelector(`[data-z="${id}"] span`).textContent=t('verw.'+id);const m=el.querySelector(`[data-m="${id}"]`);if(!m.hidden)m.textContent=t('verw.d.'+id);}werte(true);}
function werte(immer){for(const [id,,f] of ZEILEN){const v=f();if(immer||wert[id]!==v){wert[id]=v;el.querySelector(`[data-z="${id}"] b`).textContent=v;}}}
function auf(h){offenH=h||haus();spruch=lage();for(const m of el.querySelectorAll('.vw-mehr'))m.hidden=true;el.hidden=false;fuellen();clearInterval(timer);timer=setInterval(()=>werte(false),250);}
function zu(){if(el.hidden)return;el.hidden=true;clearInterval(timer);timer=0;if(offenH)G.dachAuf(offenH,false);offenH=null;}
el.addEventListener('click',e=>{if(e.target.closest('[data-x]')){zu();return;}const z=e.target.closest('[data-z]');if(z){const m=el.querySelector(`[data-m="${z.dataset.z}"]`);m.hidden=!m.hidden;if(!m.hidden)m.textContent=t('verw.d.'+z.dataset.z);window.AT2_STIL?.neuMalen?.(el);}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!el.hidden)zu();});
// Antippen: welt-gebaeude.js schaltet das Dach; folgt das Dach dem Tipp, folgt das Fenster ihm (NPCs und Bilder lassen das Dach, wie es ist)
const tap0=H.tap;H.tap=(p,w)=>{if(w||M.weltBau?.mode||!W.bodenPunkt)return tap0?tap0(p,w):false;const b=W.bodenPunkt(p.x,p.y),h0=G.hausAt(Math.floor(b.tx),Math.floor(b.ty))||G.hausAt(Math.floor(b.tx+.6),Math.floor(b.ty+.6));
 const h=h0?.art==='verwaltung'?h0:null,vor=h?G.dachFest(h):null,r=tap0?tap0(p,w):false;if(h){const nach=G.dachFest(h);if(nach!==vor){if(nach)auf(h);else zu();}}return r;};
M.weltVerwaltung={thron:thronPlatz,rollen,oeffnen:auf,schliessen:zu,offen:()=>!el.hidden,haus,spruch:lage,PLAKATE,LAGE};
})();
