'use strict';
// =====================================================================================================================
// TORE, SCHILDER, TEST-GOLD (welt-anordnung.js) · Arena Theory 2.0, Schritt A3 (Thomas 13.11.2026, AT2_FAHRPLAN.md).
// Die Anordnung selbst (Dorf, zentraler Platz, Arena-Park, Zaun, Palisade, Kieswege) steht in welt-raster.js (W.ANORD).
// Diese Datei zeichnet nur, was darauf steht:
// · Parktor (einziger Eingang der Besucher), Dorftor und Kämpfertor (Platz → Park, für Kämpfer und Karren) mit Schild, Bauplatz der Verwaltung mit Pflöcken und Schild (A4 baut dort),
//   A3b: ebenso der Bauplatz der großen Arena (B0).
//   Texte aus der Sprachdatei (Regel 10); die Schilder werden je Sprache einmal gemalt und beim Umschalten neu gemalt.
// · Knopf „+1000 Gold (Test)“ in der Leiste. Ersetzt die Regler der Testleiste (Wunsch Thomas). VOR VERÖFFENTLICHUNG ENTFERNEN (O1).
// · Leistung: drei Dinge, nur im Bild gezeichnet, Schilder vorgemalt; pro Bild ein paar Rechtecke.
// =====================================================================================================================
(()=>{
const M=window.MG,W=window.WeltKarte,H=window.WeltHook,L=window.AT2Sprache;if(!M||!W||!H||!W.ANORD)return;const S=M.s,A=W.ANORD,O=W.O,t=(k,v)=>L?L.t(k,v):k;
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.imageSmoothingEnabled=false;return [c,g];};
// ---------- Schilder ----------
const schilder=new Map();
function schild(titel,zeile,art){const key=art+'|'+titel+'|'+zeile;let b=schilder.get(key);if(b)return b;
 const f1='bold 8px ui-monospace,Menlo,Consolas,monospace',f2='6px ui-monospace,Menlo,Consolas,monospace',[,m]=mk(4,4);
 m.font=f1;const w1=m.measureText(titel).width;m.font=f2;const w2=zeile?m.measureText(zeile).width:0,w=Math.ceil(Math.max(w1,w2))+10,h=zeile?22:13,[c,g]=mk(w,h);
 const holz=art==='dorf'?['#4a3420','#7a5a39']:art==='bau'?['#5e4229','#c9b27a']:['#3a2617','#8a2f24'];
 g.fillStyle=holz[0];g.fillRect(0,0,w,h);g.fillStyle=holz[1];g.fillRect(1,1,w-2,h-2);
 g.fillStyle='#f4e6c0';g.textAlign='center';g.textBaseline='top';g.font=f1;g.fillText(titel,w/2,2);if(zeile){g.font=f2;g.fillStyle=art==='bau'?'#3a2617':'#f4d37a';g.fillText(zeile,w/2,13);}
 if(art==='park'){g.fillStyle='#d9c391';g.fillRect(2,h-3,w-4,1);g.fillStyle='#6b1d17';g.fillRect(w-7,2,3,3);}// Blutfleck in der Ecke: Gebrauchsspuren
 b={c,w,h};schilder.set(key,b);return b;}
L?.beiWechsel(()=>schilder.clear());
// ---------- Tore und Bauplatz ----------
const R=(g,x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function pfosten(g,x,y,h,art){if(art==='dorf'){R(g,x-3,y-h,6,h,'#4a3420');R(g,x-2,y-h,4,h-1,'#8a6a42');R(g,x-1,y-h-3,2,3,'#a07e52');}
 else{R(g,x-2,y-h,5,h,'#5e4229');R(g,x-2,y-h,4,h-1,'#e8dcc0');R(g,x-3,y-h-2,7,2,'#8a2f24');}}
const dinge=[];
// Tore: Parktor (Besucher), Dorftor, Kämpfertor vom Platz in den Park (dir 1: Kante entlang ty)
for(const tor of W.TORE||[]){const e=(u)=>tor.dir?W.iso(tor.tx,tor.ty+u):W.iso(tor.tx+u,tor.ty),a=e(0),b=e(tor.w),m=e(tor.w/2),hoch=tor.art==='park'?38:32;
 dinge.push({art:tor.art,x:m.x,y:m.y,x0:Math.min(a.x,b.x)-10,x1:Math.max(a.x,b.x)+10,y0:m.y-hoch-30,
  draw(g){const z=W.hz?W.hz(tor.tx,tor.ty):0,o=tor.art==='park';g.save();g.translate(0,-z);pfosten(g,a.x,a.y,hoch,tor.art);pfosten(g,b.x,b.y,hoch,tor.art);
   // Querbalken, daran das Schild
   for(let u=0;u<=1;u+=1/40){const x=a.x+(b.x-a.x)*u,y=a.y+(b.y-a.y)*u-hoch+2;R(g,x,y,2,3,o?'#6b4a2c':'#4a3420');}
   const s=o?schild(t('karte.parktor'),t('karte.parktorZeile'),'park'):tor.art==='kaempfer'?schild(t('karte.kaempfertor'),t('karte.kaempfertorZeile'),'dorf'):schild(t('karte.dorftor'),t('karte.dorftorZeile'),'dorf');
   R(g,m.x-s.w/2+3,m.y-hoch+4,1,4,'#2a1c12');R(g,m.x+s.w/2-4,m.y-hoch+4,1,4,'#2a1c12');g.drawImage(s.c,Math.round(m.x-s.w/2),Math.round(m.y-hoch+7));
   if(o){R(g,a.x-1,a.y-hoch-9,3,7,'#7a3f8c');R(g,b.x-1,b.y-hoch-9,3,7,'#7a3f8c');}// Wimpel
   g.restore();}});}
// Bauplätze: Verwaltung (A4) und große Arena (A3b, für B0): Pflöcke an den Ecken, Seil, Schild vorn in der Mitte.
// Das Seil ist je Seite in Stücke geteilt, damit beim großen Bauplatz nur die sichtbaren Seiten gezeichnet werden.
function bauplatz([vx,vy,vw,vh],titel,zeile){const ecken=[[0,0],[vw,0],[vw,vh],[0,vh]].map(([x,y])=>W.iso(vx+O+x,vy+O+y)),m=W.iso(vx+O+vw/2,vy+O+vh),schritte=Math.max(24,Math.round((vw+vh)*3));
 for(let i=0;i<4;i++){const p=ecken[i],q=ecken[(i+1)%4];
  dinge.push({art:'bau',x:(p.x+q.x)/2,y:Math.max(p.y,q.y),x0:Math.min(p.x,q.x)-4,x1:Math.max(p.x,q.x)+4,y0:Math.min(p.y,q.y)-12,
   draw(g){for(let u=0;u<=1;u+=1/schritte)R(g,p.x+(q.x-p.x)*u,p.y+(q.y-p.y)*u-5,1,1,'#c9b27a');R(g,p.x-1,p.y-7,2,8,'#6b4a2c');R(g,p.x-1,p.y-8,2,1,'#c9483e');}});}
 dinge.push({art:'bau',x:m.x,y:m.y+.5,x0:m.x-60,x1:m.x+60,y0:m.y-50,
  draw(g){const s=schild(t(titel),t(zeile),'bau');R(g,m.x-1,m.y-14,2,14,'#5e4229');g.drawImage(s.c,Math.round(m.x-s.w/2),Math.round(m.y-14-s.h));}});}
bauplatz(A.verwaltung,'karte.verwaltung','karte.verwaltungZeile');
if(A.arenaPlatz)bauplatz(A.arenaPlatz,'karte.arenaPlatz','karte.arenaPlatzZeile');
const items0=H.items;H.items=(items,view)=>{items0?.(items,view);for(const d of dinge)if(d.x1>view.x0&&d.x0<view.x1&&d.y>view.y0-10&&d.y0<view.y1)items.push(d);};
// ---------- Test-Gold (vorläufig, statt der Regler; vor Veröffentlichung entfernen, Fahrplan O1) ----------
const bar=document.querySelector('#weltUi .w-bar');
if(bar){const b=document.createElement('button');b.id='wTestGold';b.className='w-btn';const txt=()=>{b.textContent=t('leiste.testGold');b.title=t('leiste.testGoldTitel');};txt();L?.beiWechsel(txt);
 b.onclick=()=>{S.gold=(S.gold||0)+1000;try{M.ui?.notify?.(t('leiste.testGoldMeldung'));}catch(e){}};bar.appendChild(b);}
M.weltAnordnung={dinge,schild};
})();
