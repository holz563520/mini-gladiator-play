'use strict';
// =====================================================================================================================
// ARENA (welt-arena.js) · Arena Theory 2.0, Schritt B0 (Thomas 13.11.2026, AT2_FAHRPLAN.md). Die feste Arena im Arena-Park, Stufe 1 „Sandgrube“.
// · Steht fest in der Mitte der freien Fläche für die große Arena (W.ANORD.sandgrube in welt-raster.js; die Felder sind dort T.ARENA_BAU,
//   gesperrt für alle Figuren). Rund wie die Arena im Kampf (arena.js, runde Arena): Sand mit Blut, Mauerring (Podium), 3 Ränge aus Holz mit Treppen,
//   oben ein Umgang mit Geländer, im Westen das Kämpfertor im Podium, im Süden Eingang, im Südosten Ausgang. Farben wie die Sandgrube im Kampf.
// · 120 Plätze (bestätigt): 107 gewöhnliche, 12 Adelsplätze mit Kissen und Sonnensegel, 1 Loge für den Lanista (Baldachin, Sessel, rotes Tuch).
// · Gezeichnet: Jeder Rang ist in Keile geteilt (ein Keil je Platz, Treppe oder Lücke), jeder Keil wird einmal vorgezeichnet und als eigenes
//   Bildteil nach Tiefe einsortiert (H.items). Zuschauer bekommen den Schlüssel ihres Keils, so sitzen sie richtig vor und hinter den Bänken.
//   Weit herausgezoomt ein einziges Gesamtbild. Gezeichnet wird nur, was im Ausschnitt liegt.
// · Termin (bestätigt): Die Arena füllt sich nur vor einem Kampf. M.weltArena.termin(stunden) legt ihn an (B2 nutzt das später);
//   bis dahin der Testknopf „Probekampf in 8 Std.“ in der Leiste (VOR VERÖFFENTLICHUNG ENTFERNEN, B2). 60–90 % der Besucher gehen hin.
// · Ablauf wie bei RollerCoaster Tycoon: Gäste stellen sich in der Warteschlange an (Zickzack mit Seilen), der Einlasser Pupius Zahnlos lässt
//   einen nach dem anderen hinein (ohne Geld, Eintritt kommt mit C3), drinnen geht es die Treppe hoch, über den Umgang und hinunter zum Platz.
//   Edelleute stehen in derselben Schlange und setzen sich auf die Adelsplätze; sind die voll, murren sie beim Volk. Zum Termin passiert
//   im Sand noch nichts (Kämpfe ab B4); nach 1 Spielstunde gehen alle nach und nach durch den Ausgang. Der Lanista sitzt in seiner Loge (welt-npc.js).
// · Besucher bleiben Besucher (welt-besucher.js): Antippen zeigt wie immer Name und Stand. Die Arena steuert sie nur, solange sie anstehen oder drin sind.
// · Nicht im Spielstand (Termin, Schlange, Plätze sind flüchtig). Notausschalter: 'welt-arena' aus WELT_EXTRA in arena-theory-2.html nehmen.
// · B0b (Thomas 13.11.2026): Ausbaustufen am selben Ort (STUFEN unten): 1 Sandgrube (120 Plätze), 2 Knochenmühle (~330), 3 Blutrund (~700).
//   Alle Maße, Plätze, Keile, Schlange, Wege und Schilder werden aus der aktuellen Stufe berechnet (bauen()). Beim Wechsel (stufe(n)) werden die
//   Felder der Arena, der Schlange, der Wege und des Kämpfergangs neu gesetzt (W.rebake: Begehbarkeit und Spielstand folgen). Stufe im Spielstand
//   (welt-spielstand.js, arenaStufe). Bis R1 Testknopf „Ausbau (Test)“. Kämpfertor mit Fallgitter wie im Start-Intro (intro.js): zum Kampfbeginn
//   Gong, das Gitter hebt sich in 1,8 s, nach 20 s geht es wieder zu (M.weltArena.tor(auf) für B3/B4).
// · Nur Arena Theory 2.0. 1.0 bleibt unberührt.
// =====================================================================================================================
(()=>{
const M=window.MG,W=window.WeltKarte,H=window.WeltHook,L=window.AT2Sprache;if(!window.AT2||!M||!W||!H||!W.ANORD?.sandgrube)return;
const S=M.s,N=W.N,O=W.O,TAU=Math.PI*2,DEG=Math.PI/180,t=(k,v)=>L?L.t(k,v):k,rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[(Math.random()*a.length)|0];
const SG=W.ANORD.sandgrube,CX=SG.c[0]+O,CY=SG.c[1]+O,Z0=W.hz?W.hz(CX,CY):0,C0=W.iso(CX,CY);
// ---------- Ausbaustufen (B0b, bestätigt 13.11.2026) ----------
// r: Halbmesser der Felder unter der Arena; rs: Sand; nr: Ränge; sp: Abstand der Plätze (Felder); adelR/adelD: Ränge und halbe Breite des Adelsblocks;
// stein: so viele Ränge von unten aus Stein; dy: so weit rückt die Schlange nach Süden; pfade: Kieswege der Stufe (Schlange → Hauptweg, Ausgang → Hauptweg)
const STUFEN=[
 {r:8.4,rs:4.6,nr:3,sp:.81,adelR:2,adelD:4,treppen:[0,40,90,145,275,330],morsch:[300],stein:0,name:'arena.name'},
 {r:12,rs:6.2,nr:5,sp:.75,adelR:2,adelD:7,treppen:[0,40,90,145,275,330],morsch:[300],stein:2,name:'arena.name2',fahne:true,knochen:true},
 {r:16,rs:8.2,nr:7,sp:.68,adelR:4,adelD:6,treppen:[0,40,90,120,145,275,305,330],morsch:[300,160],stein:7,name:'arena.name3',boegen:true,statue:true,knochen:true}];
// ---------- Maße der aktuellen Stufe (Felder bzw. Bildpunkte), gesetzt von masse() ----------
const BW=1,LOGE=225*DEG,TOR_A=180*DEG,GEIER_A=255*DEG,SEKT=24;// B0b: 24 Kreisausschnitte zu je 15°
let EIN_A=90*DEG,AUS_A=40*DEG;// Eingang und Ausgang: Richtung vom Mittelpunkt, versetzbar (Werkzeug in welt-bau.js), im Spielstand
let STUFE=1,SD=STUFEN[0],RS,NR,R_AUS,RP,HOCH,HL,NSL,TREPPEN,MORSCH;// Sand, Ränge, Außenmauer, Umgang, Höhe der Ränge, Loge, Plätze je Rang
function masse(n){STUFE=n;SD=STUFEN[n-1];RS=SD.rs;NR=SD.nr;R_AUS=SD.r-.1;RP=R_AUS-.35;HOCH=Array.from({length:NR},(_,k)=>16+9*k);HL=HOCH[1]+2;
 NSL=Array.from({length:NR},(_,k)=>n===1?[40,48,56][k]:Math.round(TAU*(RS+k*BW+.55)/SD.sp/8)*8);TREPPEN=SD.treppen.map(d=>d*DEG);MORSCH=SD.morsch.map(d=>d*DEG);}
masse(1);
const rIn=k=>RS+k*BW,rOut=k=>k<NR-1?RS+(k+1)*BW:R_AUS,rSitz=k=>RS+k*BW+.55,rangBei=r=>{let k=0;while(k<NR-1&&r>=rIn(k+1))k++;return k;};
const ST={seat:['#5d4d37','#66553c'],riser:'#463827',edge:'#9a7d52',stair:'#7a6440',pod:'#6b5238',podTop:'#b3935f',face:'#5a4430',joint:'#3a2e22',
 sand:'#a18455',hell:'#b49865',dunkel:'#665846',blut:'#6e2418',blut2:'#8a3324',bank:'#7f6845',bankD:'#4a3a28',kissen:['#6a2a6a','#a32f2a','#3f4f8a'],gold:'#d8a830',rot:'#8e1f18'};
// Stein (Stufe 2 unten, Stufe 3 ganz): grauer Kalkstein mit dunklen Fugen
const STEIN={seat:['#8a8272','#938b7a'],riser:'#5e584d',edge:'#bdb39a',stair:'#7d766a',pod:'#6a6358',podTop:'#aea58e',face:'#746c5e',joint:'#4a453c',bank:'#a39a85',bankD:'#5c564b'};
const pal=k=>k<SD.stein?STEIN:ST;
// Bildschirmpunkt zu (Halbmesser r, Winkel a, Höhe h); gy: Boden-y ohne Höhe (Sortierschlüssel wie bei allen Figuren)
const P=(r,a,h=0)=>({x:C0.x+r*32*(Math.cos(a)-Math.sin(a)),y:C0.y+r*16*(Math.cos(a)+Math.sin(a))-Z0-h});
const gy=(r,a)=>C0.y+r*16*(Math.cos(a)+Math.sin(a)),fern=a=>Math.cos(a)+Math.sin(a)<0;
const kachel=(r,a)=>({tx:CX+r*Math.cos(a),ty:CY+r*Math.sin(a)});
const winkel=(k,j)=>LOGE+j*TAU/NSL[k],slot=(k,a)=>{const n=NSL[k];const j=Math.round((a-LOGE)/TAU*n);return ((j%n)+n)%n;};
const adiff=(a,b)=>{let d=(b-a)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;};
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));const g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=false;return [c,g];};
const font=px=>window.AT2_STIL?AT2_STIL.font(px):'bold '+Math.round(px)+'px ui-monospace,Menlo,Consolas,monospace';

// ---------- Plätze: je Rang Steckplätze im gleichen Abstand, von der Loge aus gezählt (bauen() setzt alles für die aktuelle Stufe) ----------
let DEKO=[],ART,KEY,PKEY,SITZE,frei,LOGE_SITZ,SEKTOREN,SAND,OBEN,GESAMT=null,TOR_K=null;
// B0b: Reihenfolge beim Zeichnen. Jeder Platz gehört zu einem Ausschnitt; KEY ist der Schlüssel seines Ausschnitts (hinten: Innenkante, vorn: Außenkante),
// so stehen Leute im Sand, auf den Rängen und draußen richtig davor oder dahinter. PKEY ist die alte Reihenfolge innerhalb eines Ausschnitts.
const sektor=a=>Math.floor((((a%TAU)+TAU)%TAU)/(TAU/SEKT))%SEKT,sektA=s=>(s+.5)*TAU/SEKT,sektKey=s=>{const a=sektA(s);return fern(a)?gy(RS,a):gy(R_AUS,a);};
const keyAt=(r,a)=>{const k=rangBei(r);return KEY[k][slot(k,a)]+.0005+(gy(r,a)-C0.y)*1e-6;};
const nimm=l=>{if(!l.length)return null;const i=(Math.random()*l.length)|0,s=l[i];l[i]=l[l.length-1];l.pop();return s;};
const gib=s=>{if(!s||!s.v)return;s.v=null;(s.adel?frei.a:frei.n).push(s);};
function plaetze(){
 ART=NSL.map(n=>new Array(n).fill('sitz'));
 for(let k=0;k<SD.adelR;k++)for(let d=-SD.adelD;d<=SD.adelD;d++)ART[k][((d%NSL[k])+NSL[k])%NSL[k]]=k<2&&Math.abs(d)<=1?'loge':'adel';
 for(const a of TREPPEN)for(let k=0;k<NR;k++){const j=slot(k,a);if(ART[k][j]==='sitz')ART[k][j]='treppe';}
 for(const m of MORSCH){const j=slot(NR-1,m);if(ART[NR-1][j]==='sitz')ART[NR-1][j]='morsch';}
 PKEY=NSL.map((n,k)=>Array.from({length:n},(_,j)=>gy(rOut(k),winkel(k,j))));KEY=NSL.map((n,k)=>Array.from({length:n},(_,j)=>sektKey(sektor(winkel(k,j)))+k*1e-4));
 SITZE=[];
 for(let k=0;k<NR;k++)for(let j=0;j<NSL[k];j++){const art=ART[k][j];if(art!=='sitz'&&art!=='adel')continue;const a=winkel(k,j),p=P(rSitz(k),a,HOCH[k]);
  SITZE.push({k,j,a,adel:art==='adel',x:Math.round(p.x),y:Math.round(p.y),key:KEY[k][j]+.001,dir:p.x>C0.x?1:0,v:null});}
 frei={n:SITZE.filter(s=>!s.adel),a:SITZE.filter(s=>s.adel)};
 LOGE_SITZ=(()=>{const p=P(RS+1.1,LOGE,HL),q=kachel(RS+1.1,LOGE);return {x:q.tx,y:q.ty,sx:p.x,sy:p.y,key:KEY[0][0]+.002,oz:Z0+HL-6,tapOz:Z0+HL,loge:true,innen:false};})();}

// ---------- Keile zeichnen ----------
// Bogen in den Pfad: n Punkte von a0 bis a1 (rückwärts mit rev)
function bogen(g,r,a0,a1,h,ox,oy,rev,erst,n=6){for(let i=0;i<=n;i++){const a=rev?a1-(a1-a0)*i/n:a0+(a1-a0)*i/n,p=P(r,a,h);if(erst&&i===0)g.moveTo(p.x-ox,p.y-oy);else g.lineTo(p.x-ox,p.y-oy);}}
function flaeche(g,r0,r1,a0,a1,h,ox,oy,col){g.beginPath();bogen(g,r0,a0,a1,h,ox,oy,false,true);bogen(g,r1,a0,a1,h,ox,oy,true,false);g.closePath();g.fillStyle=col;g.fill();}
function wand(g,r,a0,a1,z0,z1,ox,oy,col){g.beginPath();bogen(g,r,a0,a1,z0,ox,oy,false,true);bogen(g,r,a0,a1,z1,ox,oy,true,false);g.closePath();g.fillStyle=col;g.fill();}
function strich(g,r,a0,a1,h,ox,oy,col,w=1){g.beginPath();bogen(g,r,a0,a1,h,ox,oy,false,true,4);g.strokeStyle=col;g.lineWidth=w;g.stroke();}
const px=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h);};
// Kanten hart machen (Pixelstil, keine halbdurchsichtigen Ränder)
function hart(c,g){const im=g.getImageData(0,0,c.width,c.height),d=im.data;for(let i=3;i<d.length;i+=4)d[i]=d[i]>110?255:0;g.putImageData(im,0,0);}
function keilBox(k,j){const dA=TAU/NSL[k],a=winkel(k,j),a0=a-dA/2-.008,a1=a+dA/2+.008,h=ART[k][j]==='loge'?HL:HOCH[k],oben=k===NR-1;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
 for(const r of [rIn(k),rOut(k)])for(let i=0;i<=6;i++){const aa=a0+(a1-a0)*i/6;for(const z of [0,h+(oben&&SD.fahne?36:k===1&&j===0?30:10)]){const p=P(r,aa,z);x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);}}return {x0,y0,x1,y1};}
function keil(k,j,g,ox,oy){const n=NSL[k],dA=TAU/n,a=winkel(k,j),art=ART[k][j],a0=a-dA/2-.008,a1=a+dA/2+.008,r0=rIn(k),r1=rOut(k),h=art==='loge'?HL:HOCH[k],f=fern(a),C=pal(k),oben=k===NR-1;
 const seed=(k*97+j*31)%17,tuer=oben&&(j===slot(k,EIN_A)||j===slot(k,AUS_A)),fahne=oben&&SD.fahne&&!tuer&&j%6===3,tor=k===0&&j===slot(0,TOR_A);
 const Q=(r,aa,z)=>{const p=P(r,aa,z);return {x:p.x-ox,y:p.y-oy};};
 // senkrechte Fläche, die man sieht: hinten die Innenseite (Podium bzw. Stufe), vorn die Außenseite (Fassade)
 if(f){wand(g,r0,a0,a1,0,h,ox,oy,k===0?(art==='loge'?ST.rot:C.pod):C.riser);if(k>0)strich(g,r0,a0,a1,h-1,ox,oy,C===STEIN?C.edge:'#7a6440');
  if(k===0){if(art==='loge'){strich(g,r0,a0,a1,h-1,ox,oy,ST.gold);strich(g,r0,a0,a1,3,ox,oy,ST.gold);for(let i=0;i<5;i++){const q=Q(r0,a0+(a1-a0)*(i+.5)/5,4);px(g,q.x,q.y,1,2,ST.gold);}}
   else{strich(g,r0,a0,a1,h-1,ox,oy,C.podTop,2);strich(g,r0,a0,a1,6,ox,oy,C.joint);strich(g,r0,a0,a1,11,ox,oy,C.joint);
    if(tor){// Kämpfertor: dunkle Öffnung im Podium, Rahmen, darüber ein Schädel; das Fallgitter zeichnet TOR_K (hebt sich zum Kampf)
     wand(g,r0-.01,a-dA*.42,a+dA*.42,0,h-3,ox,oy,'#141110');strich(g,r0-.02,a-dA*.46,a+dA*.46,h-3,ox,oy,'#4a3a28',2);
     const s=Q(r0-.02,a,h-2);px(g,s.x-2,s.y-1,4,3,'#e8dcc0');px(g,s.x-1,s.y,1,1,'#1a0e06');px(g,s.x+1,s.y,1,1,'#1a0e06');
     if(SD.knochen){for(const d of [-1,1]){const b=Q(r0-.02,a+d*dA*.3,h-1);px(g,b.x-3,b.y,7,1,'#e8dcc0');px(g,b.x-4,b.y-1,2,3,'#e8dcc0');px(g,b.x+3,b.y-1,2,3,'#e8dcc0');}}}// gekreuzte Knochen als Zierde
    else if(seed%3===0){const q=Q(r0-.01,a,h*.5);g.fillStyle='#2f251b';g.beginPath();g.arc(q.x,q.y,3.5,0,TAU);g.fill();g.fillStyle=['#8a4a34','#56684a','#7a6a3c','#4d5d6a'][seed%4];g.beginPath();g.arc(q.x,q.y,2.6,0,TAU);g.fill();px(g,q.x,q.y,1,1,'#c9b27a');}
    if(seed===5||seed===11){const q=Q(r0-.01,a+dA*.2,7);px(g,q.x,q.y,2,5,ST.blut);px(g,q.x+1,q.y+5,1,2,ST.blut);}}}}// Blut läuft das Podium hinunter
 else{wand(g,r1,a0,a1,0,h,ox,oy,oben?C.face:C.riser);
  if(oben&&C===STEIN){// Fassade aus Stein: Quaderfugen, Bögen (Stufe 3), Gesims
   for(const z of [h*.3,h*.62])strich(g,r1,a0,a1,z,ox,oy,C.joint);strich(g,r1,a0,a1,h-2,ox,oy,C.edge,2);strich(g,r1,a0,a1,3,ox,oy,'#3a352e',2);
   if(tuer){wand(g,r1+.01,a-dA*.32,a+dA*.32,0,19,ox,oy,'#120d0a');strich(g,r1+.01,a-dA*.36,a+dA*.36,20,ox,oy,C.edge,2);}
   else if(SD.boegen){wand(g,r1+.01,a-dA*.26,a+dA*.26,h*.34,h*.56,ox,oy,'#2a2520');strich(g,r1+.01,a-dA*.2,a+dA*.2,h*.58,ox,oy,'#2a2520',2);strich(g,r1+.01,a-dA*.3,a+dA*.3,h*.33,ox,oy,C.edge);
    if(seed===4||seed===13){const q=Q(r1+.01,a,h*.4);px(g,q.x-1,q.y,2,6,ST.blut);}}}// manchmal tropft es aus dem Bogen
  else if(oben){// Fassade aus Brettern: Fugen, Querbalken, Pfosten an den Kanten
   for(let i=1;i<4;i++){const q0=Q(r1,a0+(a1-a0)*i/4,0),q1=Q(r1,a0+(a1-a0)*i/4,h);g.strokeStyle=i===2?'#4c3a28':ST.joint;g.lineWidth=1;g.beginPath();g.moveTo(q0.x,q0.y);g.lineTo(q1.x,q1.y);g.stroke();}
   strich(g,r1,a0,a1,h*.55,ox,oy,ST.joint,2);strich(g,r1,a0,a1,3,ox,oy,'#3a2e22',2);
   if(tuer){wand(g,r1+.01,a-dA*.3,a+dA*.3,0,17,ox,oy,'#120d0a');strich(g,r1+.01,a-dA*.34,a+dA*.34,18,ox,oy,'#7a5a39',2);
    for(const s of [-1,1]){const q0=Q(r1+.01,a+s*dA*.33,0),q1=Q(r1+.01,a+s*dA*.33,18);g.strokeStyle='#7a5a39';g.lineWidth=2;g.beginPath();g.moveTo(q0.x,q0.y);g.lineTo(q1.x,q1.y);g.stroke();}}
   else if(seed===3||seed===9){const q=Q(r1,a,h*.35);px(g,q.x-2,q.y,4,2,ST.blut2);px(g,q.x-1,q.y+2,2,4,ST.blut);}// verschmiert
   else if(seed===7){const q=Q(r1,a,h*.75);px(g,q.x-3,q.y-1,6,3,'#c9b27a');px(g,q.x-2,q.y,4,1,'#5a3a20');}}}// angenageltes Brett (Flicken)
 // Oberseite
 flaeche(g,r0,r1,a0,a1,h,ox,oy,art==='loge'?'#7a5636':art==='treppe'?C.stair:C.seat[j%2]);
 strich(g,r0+.03,a0,a1,h,ox,oy,art==='loge'?ST.gold:C.edge);
 if(art==='loge'){if(k===0&&j===0)flaeche(g,r0+.12,r1,a-dA*.28,a+dA*.28,h,ox,oy,ST.rot);for(let i=0;i<5;i++){const q=Q(r0+.5,a0+(a1-a0)*(i+.5)/5,h);px(g,q.x,q.y,1,1,'#4a3020');}}// polierte Bretter, roter Läufer zum Sessel
 if(art==='sitz'||art==='adel'){flaeche(g,rSitz(k)-.07,rSitz(k)+.13,a0+.01,a1-.01,h,ox,oy,art==='adel'?'#8a6f4a':C.bank);strich(g,rSitz(k)+.15,a0,a1,h,ox,oy,C.bankD);
  if(art==='adel'){const q=Q(rSitz(k)+.03,a,h);px(g,q.x-4,q.y-2,8,3,ST.kissen[j%3]);px(g,q.x-4,q.y-2,8,1,'#e8c86a');strich(g,r0+.08,a0,a1,h,ox,oy,ST.gold);}}
 if(art==='treppe')for(const u of [.25,.5,.75])strich(g,r0+u*(r1-r0)*(oben?.6:1),a-dA*.3,a+dA*.3,h,ox,oy,C.riser);
 if(art==='morsch'){const q=Q(rSitz(k),a,h);px(g,q.x-4,q.y-2,9,3,'#1a120c');px(g,q.x-5,q.y-3,2,1,C.bank);px(g,q.x+4,q.y+1,2,1,C.bank);px(g,q.x+1,q.y-4,1,2,'#c9483e');}// durchgebrochen
 if(art==='loge'&&k===1&&j===0){const q=Q(rIn(1)+.3,a,h);px(g,q.x-7,q.y-21,14,21,'#3a0c08');px(g,q.x-6,q.y-20,12,18,ST.rot);px(g,q.x-7,q.y-23,14,3,ST.gold);px(g,q.x-8,q.y-25,2,4,ST.gold);px(g,q.x+6,q.y-25,2,4,ST.gold);
  px(g,q.x-2,q.y-17,4,4,'#e8dcc0');px(g,q.x-1,q.y-16,1,1,'#1a0e06');px(g,q.x+1,q.y-16,1,1,'#1a0e06');px(g,q.x-1,q.y-13,3,1,'#e8dcc0');px(g,q.x-8,q.y-3,16,3,ST.gold);}// Sessel des Lanista, Totenkopf in der Lehne
 if(oben){// Umgang mit Geländer, Luken an Ein- und Ausgang, Geier, Fahnen (Stufe 2)
  flaeche(g,RP-.35,R_AUS,a0,a1,h,ox,oy,C===STEIN?'#857d6c':'#6f5a3c');strich(g,RP,a0,a1,h,ox,oy,C===STEIN?C.joint:'#5a4630');
  if(j===slot(k,EIN_A)||j===slot(k,AUS_A)){flaeche(g,RP-.15,RP+.2,a-dA*.28,a+dA*.28,h,ox,oy,'#120d0a');strich(g,RP+.02,a-dA*.2,a+dA*.2,h,ox,oy,'#7a5a39');}
  strich(g,R_AUS-.03,a0,a1,h+5,ox,oy,C===STEIN?'#5c564b':'#4a3826');const q0=Q(R_AUS-.03,a0+.008,h),q1=Q(R_AUS-.03,a0+.008,h+6);g.strokeStyle=C===STEIN?'#4a453c':'#3a2a1c';g.lineWidth=1;g.beginPath();g.moveTo(q0.x,q0.y);g.lineTo(q1.x,q1.y);g.stroke();
  if(j===slot(k,GEIER_A)){const q=Q(R_AUS-.03,a,h+6);px(g,q.x-2,q.y-6,5,5,'#2a221c');px(g,q.x-3,q.y-4,1,3,'#2a221c');px(g,q.x+3,q.y-4,1,3,'#2a221c');px(g,q.x-1,q.y-9,3,3,'#c9a090');px(g,q.x-2,q.y-8,1,1,'#e8c86a');px(g,q.x,q.y-1,1,2,'#c9a020');px(g,q.x+2,q.y-1,1,2,'#c9a020');}
  if(fahne){const q=Q(R_AUS-.05,a,h+5);px(g,q.x,q.y-28,1,28,'#4a3826');px(g,q.x+1,q.y-28,8,6,'#8e1f18');px(g,q.x+2,q.y-22,6,1,'#6a1410');px(g,q.x+3,q.y-27,3,3,'#e8dcc0');px(g,q.x+3,q.y-26,1,1,'#1a0e06');px(g,q.x+5,q.y-26,1,1,'#1a0e06');}}// Fahne mit Totenkopf
 }
// Ein Ausschnitt: alle Plätze aller Ränge in seinen 15°, in der alten Reihenfolge in EIN Bild gemalt, Kanten hart. Ohne willReadFrequently danach (bleibt auf der Grafikkarte).
function sektorBild(s){const L=[];for(let k=0;k<NR;k++)for(let j=0;j<NSL[k];j++)if(sektor(winkel(k,j))===s)L.push([k,j]);L.sort((p,q)=>PKEY[p[0]][p[1]]-PKEY[q[0]][q[1]]);
 let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const [k,j] of L){const b=keilBox(k,j);x0=Math.min(x0,b.x0);y0=Math.min(y0,b.y0);x1=Math.max(x1,b.x1);y1=Math.max(y1,b.y1);}
 const ox0=Math.floor(x0)-3,oy0=Math.floor(y0)-3,[c,g]=mk(x1-ox0+4,y1-oy0+4);for(const [k,j] of L)keil(k,j,g,ox0,oy0);hart(c,g);
 // auf den sichtbaren Teil zuschneiden (weniger Bildpunkte je Bild)
 const im=g.getImageData(0,0,c.width,c.height).data;let bx0=c.width,by0=c.height,bx1=0,by1=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(im[(y*c.width+x)*4+3]){if(x<bx0)bx0=x;if(x>bx1)bx1=x;if(y<by0)by0=y;if(y>by1)by1=y;}
 const w=Math.max(1,bx1-bx0+1),h=Math.max(1,by1-by0+1),d=document.createElement('canvas');d.width=w;d.height=h;d.getContext('2d').drawImage(c,-bx0,-by0);const ox=ox0+bx0,oy=oy0+by0,key=sektKey(s);
 return {s,c:d,x:ox,y:oy,key,x0:ox,x1:ox+w,y0:oy,y1:oy+h,item:{y:key,draw:ctx=>ctx.drawImage(d,ox,oy)}};}

// Sand (liegt flach, wird mit dem Boden gezeichnet): Spuren vom Harken, Blutflecken, Schleifspuren, eine verlorene Sandale
function sand(){const rx=RS*45.26+4,ry=RS*22.63+4,ox=Math.floor(C0.x-rx),oy=Math.floor(C0.y-Z0-ry),[c,g]=mk(rx*2,ry*2),cx=C0.x-ox,cy=C0.y-Z0-oy,R=RS+.12;
 g.beginPath();for(let i=0;i<=48;i++){const p=P(R,i/48*TAU);i?g.lineTo(p.x-ox,p.y-oy):g.moveTo(p.x-ox,p.y-oy);}g.closePath();g.fillStyle=ST.sand;g.fill();g.save();g.clip();
 let s=7;const z=()=>{s=(s*16807)%2147483647;return s/2147483647;};
 for(let i=0,n=Math.round(900*(RS/4.6)**2);i<n;i++){const x=z()*c.width,y=z()*c.height;px(g,x,y,i%5===0?3:1,1,i%3?ST.hell:ST.dunkel);}
 g.strokeStyle='rgba(212,186,138,.55)';for(const f of [.32,.62,.86]){g.beginPath();g.ellipse(cx,cy,rx*f,ry*f,0,0,TAU);g.setLineDash([6,4]);g.stroke();}g.setLineDash([]);
 for(const [u,v,w] of [[.18,.1,9],[-.3,.22,6],[.36,-.28,7],[-.12,-.35,5],[.05,.4,4]]){const x=cx+u*rx*1.4,y=cy+v*ry*1.4;g.fillStyle=ST.blut;g.beginPath();g.ellipse(x,y,w*1.4,w*.6,0,0,TAU);g.fill();g.fillStyle=ST.blut2;g.beginPath();g.ellipse(x-w*.3,y-1,w*.6,w*.25,0,0,TAU);g.fill();}
 g.strokeStyle='rgba(110,36,24,.7)';g.lineWidth=2;g.beginPath();g.moveTo(cx+.18*rx*1.4,cy+.1*ry*1.4);g.quadraticCurveTo(cx+.3*rx,cy+.32*ry,cx+.55*rx,cy+.42*ry);g.stroke();// Schleifspur zum Tor? Nein, zum Ausgang. Ordnung muss sein.
 px(g,cx-.42*rx,cy+.08*ry,5,2,'#5a3a20');px(g,cx-.42*rx+1,cy+.08*ry-1,2,1,'#7a5030');// Sandale
 px(g,cx+.1*rx,cy-.12*ry,2,1,'#efe6d2');px(g,cx+.1*rx+3,cy-.12*ry+1,1,1,'#efe6d2');// Zähne
 g.restore();hart(c,g);return {c,x:ox,y:oy,x1:ox+c.width,y1:oy+c.height};}

// Loge: Baldachin über dem Sessel; Adel: Sonnensegel auf Pfosten hinter dem Adelsblock (über den Köpfen der Reihe dahinter)
function ueber(art){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;const pts=[];const add=(r,a,z)=>{const p=P(r,a,z);pts.push(p);x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);return p;};
 const RB0=RS+.45,RB1=RS+1.6,kS=SD.adelR-1,RSG=rIn(SD.adelR)-.05,HS=HOCH[kS],sA=s=>LOGE+s*TAU/NSL[kS]*1.5,sB=s=>LOGE+s*TAU/NSL[kS]*(SD.adelD+.5);
 if(art==='baldachin'){const d=TAU/NSL[0]*1.05,zr=HL+30;for(const r of [RB0,RB1])for(const s of [-1,1]){add(r,LOGE+s*d,HL);add(r,LOGE+s*d,zr+4);}}
 else{const s=art==='segelL'?-1:1,a0=sA(s),a1=sB(s),zr=HS+34;for(let i=0;i<=8;i++){add(RSG,a0+(a1-a0)*i/8,zr+6);add(RSG,a0+(a1-a0)*i/8,HS);}}
 const ox=Math.floor(x0)-3,oy=Math.floor(y0)-3,[c,g]=mk(x1-ox+4,y1-oy+4),Q=(r,a,z)=>{const p=P(r,a,z);return {x:p.x-ox,y:p.y-oy};};
 if(art==='baldachin'){const d=TAU/NSL[0]*1.05,zr=HL+30;
  for(const r of [RB1,RB0])for(const s of [-1,1]){const q0=Q(r,LOGE+s*d,HL),q1=Q(r,LOGE+s*d,zr);px(g,q0.x,q1.y,2,q0.y-q1.y,'#c9a040');}
  g.beginPath();const ec=[Q(RB0,LOGE-d,zr),Q(RB0,LOGE+d,zr),Q(RB1,LOGE+d,zr),Q(RB1,LOGE-d,zr)];g.moveTo(ec[0].x,ec[0].y-3);for(const e of ec)g.lineTo(e.x,e.y-3);g.closePath();g.fillStyle='#6a1410';g.fill();
  g.beginPath();g.moveTo(ec[0].x,ec[0].y);g.lineTo(ec[1].x,ec[1].y);g.lineTo(ec[1].x,ec[1].y-3);g.lineTo(ec[0].x,ec[0].y-3);g.closePath();g.fillStyle=ST.rot;g.fill();
  for(let i=0;i<=10;i++){const x=ec[0].x+(ec[1].x-ec[0].x)*i/10,y=ec[0].y+(ec[1].y-ec[0].y)*i/10;px(g,x,y,1,i%2?2:3,ST.gold);}
  const m=Q(RS+1,LOGE,zr+2);px(g,m.x-2,m.y-5,4,4,'#e8dcc0');px(g,m.x-1,m.y-4,1,1,'#1a0e06');px(g,m.x+1,m.y-4,1,1,'#1a0e06');px(g,m.x-1,m.y-1,3,1,ST.gold);}// Totenkopf mit Goldkrone obenauf
 else{const s=art==='segelL'?-1:1,a0=sA(s),a1=sB(s),zr=HS+34,np=SD.adelD>5?4:3,nb=SD.adelD>5?20:12;
  for(let i=0;i<np;i++){const a=a0+(a1-a0)*i/(np-1),q0=Q(RSG,a,HS),q1=Q(RSG,a,zr+5);px(g,q0.x,q1.y,1,q0.y-q1.y,'#6b4a2c');}
  for(let i=0;i<nb;i++){const u0=a0+(a1-a0)*i/nb,u1=a0+(a1-a0)*(i+1)/nb;wand(g,RSG,u0,u1,zr,zr+5,ox,oy,i%2?'#e8dcc0':'#a32f2a');}
  strich(g,RSG,a0,a1,zr,ox,oy,'#5a1410');for(let i=0;i<=nb;i++){const q=Q(RSG,a0+(a1-a0)*i/nb,zr);px(g,q.x,q.y,1,2,i%2?'#a32f2a':'#e8dcc0');}}
 hart(c,g);const key=art==='baldachin'?KEY[0][0]+.003:Math.max(...Array.from({length:SD.adelD-1},(_,i)=>i+2).map(d=>KEY[0][(((art==='segelL'?-d:d)%NSL[0])+NSL[0])%NSL[0]]))+.003;
 return {c,x:ox,y:oy,key,x0:ox,x1:ox+c.width,y0:oy,y1:oy+c.height,item:{y:key,draw:ctx=>ctx.drawImage(c,ox,oy)}};}

// Weit herausgezoomt: alles in einem Bild (erst beim ersten Bedarf; ohne willReadFrequently, damit es auf der Grafikkarte bleibt)
function gesamt(){if(GESAMT)return GESAMT;const all=[...SEKTOREN,...OBEN];let x0=SAND.x,y0=SAND.y,x1=SAND.x1,y1=SAND.y1;for(const k of all){x0=Math.min(x0,k.x0);y0=Math.min(y0,k.y0);x1=Math.max(x1,k.x1);y1=Math.max(y1,k.y1);}
 // B0b: halbe Auflösung (Miniaturansicht zeigt höchstens 0,6×), so bleibt das Bild auch bei Stufe 3 klein
 const F=.5,c=document.createElement('canvas');c.width=Math.ceil((x1-x0)*F);c.height=Math.ceil((y1-y0)*F);const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.scale(F,F);
 g.drawImage(SAND.c,SAND.x-x0,SAND.y-y0);for(const k of all.slice().sort((p,q)=>p.key-q.key))g.drawImage(k.c,k.x-x0,k.y-y0);const key=gy(R_AUS,LOGE),w=x1-x0,h=y1-y0;
 return GESAMT={c,x:x0,y:y0,x1,y1,item:{y:key,draw:ctx=>ctx.drawImage(c,x0,y0,w,h)}};}

// Kämpfertor: Fallgitter im Podium (wie das Arenator im Start-Intro, intro.js): auf = 0 … 1, gezeichnet über dem Keil des Tors
const TOR={auf:0,soll:0,offen:0,gong:0};
function torItem(){const k=0,j=slot(0,TOR_A),dA=TAU/NSL[0],a=winkel(0,j),r=rIn(0)-.02,h=HOCH[0];const A=P(r,a-dA*.5,0),B=P(r,a+dA*.5,h);
 return {y:KEY[0][j]+.0002,x0:Math.min(A.x,B.x)-30,x1:Math.max(A.x,B.x)+30,y0:Math.min(A.y,B.y)-30,y1:Math.max(A.y,B.y)+10,draw(ctx){
  const lift=TOR.auf*(h-4);ctx.strokeStyle='#8a7a5a';ctx.lineWidth=1;
  for(let i=0;i<=6;i++){const aa=a-dA*.42+dA*.84*i/6,p0=P(r,aa,lift),p1=P(r,aa,h-4);ctx.beginPath();ctx.moveTo(Math.round(p0.x)+.5,Math.round(p0.y));ctx.lineTo(Math.round(p1.x)+.5,Math.round(p1.y));ctx.stroke();
   if(lift<h-5){ctx.fillStyle='#b0a080';ctx.fillRect(Math.round(p0.x),Math.round(p0.y),1,2);}}// Spitzen unten
  ctx.beginPath();bogen(ctx,r,a-dA*.42,a+dA*.42,Math.min(h-4,5+lift),0,0,false,true,4);ctx.stroke();ctx.beginPath();bogen(ctx,r,a-dA*.42,a+dA*.42,Math.min(h-4,10+lift),0,0,false,true,4);ctx.stroke();}};}

// ---------- Wartestraße, Eingang und Ausgang (B0b-Nacharbeit, wie bei RollerCoaster Tycoon) ----------
// Die Schlange ist die Kette von Wartestraßen-Feldern (T.WARTE), die am Feld vor dem Eingang beginnt. Ihr Ende ist das Feld, das an einen normalen Weg
// grenzt (bei Abzweigungen die längste Kette). Dort steigen die Besucher ein und laufen Feld für Feld bis zum Eingang. Der Ausgang muss an einem Weg liegen.
// Ohne Anschluss bleibt die Arena zu (Schild „Kein Anschluss“, der Berater meldet es). Nichts davon kostet beim Zeichnen etwas: die Wartestraße liegt im Bodenbild.
let QP=[[0,0],[0,0]],QL=[0,0],QLEN=0,T_EIN,T_AUS_IN,T_AUS,T_TREPPE,ZIEL_Q=null,ZIEL_SCHAU,SCHILDER=[],EINL_P,STATUE=null,X_EIN=-1,X_AUS=-1,ENDE=-1,OFFEN=false,GRUND='',SCHL_N=0;
const QA=.42;
function qpunkt(d){d=Math.max(0,Math.min(QLEN,d));let i=1;while(i<QL.length-1&&QL[i]<d)i++;const u=(d-QL[i-1])/((QL[i]-QL[i-1])||1),a=QP[i-1],b=QP[i];return W.iso(a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u);}
const istWeg=k=>{const t=W.feld[k],T=W.T;return (t===T.WEG||t===T.BRUECKE||(t>=T.STR1&&t<=T.STR5))&&W.ber?.[k]!==W.BER?.DORF&&W.ber?.[k]!==W.BER?.PLATZ;};
const nb4=k=>[k+1,k-1,k+W.N,k-W.N],mitteF=k=>({tx:k%W.N+.5,ty:((k/W.N)|0)+.5}),feldBei=(tx,ty)=>Math.floor(ty)*W.N+Math.floor(tx);
// Feld direkt außen vor der Tür in Richtung a (erstes Feld außerhalb der Arena)
function aussenFeld(a,will){let k0=-1;for(let r=R_AUS-.8;r<R_AUS+3;r+=.2){const q=kachel(r,a),k=feldBei(q.tx,q.ty);if(W.feld[k]!==W.T.ARENA_BAU){k0=k;break;}}if(k0<0||!will)return k0;
 for(let r=R_AUS-.8;r<R_AUS+1.6;r+=.2){const q=kachel(r,a),k=feldBei(q.tx,q.ty);for(const n of [k,...nb4(k)]){if(W.feld[n]===W.T.ARENA_BAU)continue;const m=mitteF(n);if(Math.hypot(m.tx-CX,m.ty-CY)<R_AUS+1.8&&Math.abs(adiff(Math.atan2(m.ty-CY,m.tx-CX),a))<.25&&will(n))return n;}}return k0;}// passendes Nachbarfeld bevorzugen (Wartestraße bzw. Weg)
// Liegt k direkt außen am Rand (Nachbar eines Arenafelds, selbst keins)? Dann die Richtung dorthin
function randRichtung(k){if(k<0||W.feld[k]===W.T.ARENA_BAU||!nb4(k).some(n=>W.feld[n]===W.T.ARENA_BAU))return null;const m=mitteF(k);if(Math.hypot(m.tx-CX,m.ty-CY)>R_AUS+2.2)return null;return Math.atan2(m.ty-CY,m.tx-CX);}
const arenaNachbar=k=>{let b=-1,bd=1e9;for(const n of nb4(k))if(W.feld[n]===W.T.ARENA_BAU){const m=mitteF(n),d=Math.hypot(m.tx-CX,m.ty-CY);if(d<bd){bd=d;b=n;}}return b;};
function tueren(){T_EIN=kachel(R_AUS+.05,EIN_A);T_AUS_IN=kachel(R_AUS+.05,AUS_A);T_TREPPE=kachel(R_AUS+1,LOGE);X_EIN=aussenFeld(EIN_A,k=>W.feld[k]===W.T.WARTE);X_AUS=aussenFeld(AUS_A,istWeg);T_AUS=X_AUS>=0?mitteF(X_AUS):kachel(R_AUS+.95,AUS_A);
 const q=X_EIN>=0?mitteF(X_EIN):kachel(R_AUS+.95,EIN_A),px_=-Math.sin(EIN_A),py_=Math.cos(EIN_A);EINL_P={x:q.tx+px_*.75,y:q.ty+py_*.75,innen:false};
 STATUE=SD.statue?statue(...(()=>{const p=kachel(R_AUS+1.7,EIN_A-.28);return [p.tx,p.ty];})()):null;schlangeRechnen(true);}
let wiederMelden=false;
function schlangeRechnen(still){const T=W.T,F=W.feld,alt=ENDE,altOffen=OFFEN;let ende=-1,ziel=-1,best=-1;const d=new Map(),par=new Map(),q=[];
 if(X_EIN>=0&&F[X_EIN]===T.WARTE){d.set(X_EIN,0);q.push(X_EIN);for(let i=0;i<q.length;i++){const k=q[i];for(const n of nb4(k))if(F[n]===T.WARTE&&!d.has(n)){d.set(n,d.get(k)+1);par.set(n,k);q.push(n);}}
  for(const k of q){const w=nb4(k).find(istWeg);if(w!=null&&d.get(k)>best){best=d.get(k);ende=k;ziel=w;}}}
 ENDE=ende;SCHL_N=q.length;const qok=ende>=0,aok=X_AUS>=0&&istWeg(X_AUS);OFFEN=qok&&aok;GRUND=!qok?'schlange':!aok?'ausgang':'';
 if(qok){const kette=[];for(let k=ende;k!=null;k=par.get(k))kette.push(k);kette.reverse();// vom Eingang zum Ende
  QP=kette.map(k=>{const m=mitteF(k);return [m.tx,m.ty];});const z=mitteF(ziel);QP.push([z.tx,z.ty]);ZIEL_Q={tx:z.tx,ty:z.ty};ZIEL_SCHAU=ZIEL_Q;}
 else{const m=X_EIN>=0?mitteF(X_EIN):kachel(R_AUS+1,EIN_A);QP=[[m.tx,m.ty],[m.tx,m.ty]];ZIEL_Q=null;ZIEL_SCHAU=aok?mitteF(X_AUS):{tx:61.5+O,ty:38.5+O};}
 QL=[0];for(let i=1;i<QP.length;i++)QL.push(QL[i-1]+Math.hypot(QP[i][0]-QP[i-1][0],QP[i][1]-QP[i-1][1]));QLEN=QL[QL.length-1];
 schilder_();
 if(alt!==ENDE){const ks=[];for(const k of [alt,ENDE])if(k>=0)ks.push(k,...nb4(k));W.neuMalen?.(ks);}// Anschluss am Ende neu malen (Bodenbild)
 if(!still&&altOffen!==OFFEN){try{M.ui?.notify?.(t(OFFEN?'arena.wieder':'arena.zu.'+GRUND));}catch(e){}}}
function schilder_(){const m=ZIEL_Q||(X_EIN>=0?mitteF(X_EIN):kachel(R_AUS+1,EIN_A)),e=X_EIN>=0?mitteF(X_EIN):kachel(R_AUS+1,EIN_A),px_=-Math.sin(EIN_A),py_=Math.cos(EIN_A),qa=-Math.sin(AUS_A),qb=Math.cos(AUS_A);
 SCHILDER=[schildItem(m.tx-.9,m.ty-.3,()=>[t(SD.name)+' · '+t('arena.plaetze',{n:SITZE.length+1}),schildText()]),
];HUETTEN=[X_EIN>=0?huette(X_EIN,'ein'):null,X_AUS>=0?huette(X_AUS,'aus'):null].filter(Boolean);}
// Eingangs- und Ausgangshäuschen wie bei RollerCoaster Tycoon (Wunsch Thomas 14.11.2026): je ein Feld direkt am Gebäude, ein vorgezeichnetes Bild.
// Eingang: Holzhäuschen mit rotem Dach, Goldkante und Totenkopf (später Ticketschalter, C3). Ausgang: verwitterte graue Bretter, Eimer daneben.
// Die Wartestraße endet am Eingangshäuschen, das Ausgangshäuschen steht auf dem Weg. Wer durchgeht, verschwindet kurz dahinter.
let HUETTEN=[];const huettenBild=new Map();
function huette(k,art){const tx=k%W.N,ty=(k/W.N)|0,z=W.hz?W.hz(tx+.5,ty+.5):0,i=.12,P_=(x,y)=>{const q=W.iso(x,y);return {x:q.x,y:q.y-z};};
 const A=P_(tx+i,ty+i),B=P_(tx+1-i,ty+i),C=P_(tx+1-i,ty+1-i),D=P_(tx+i,ty+1-i),H_=22,R=13,text=t(art==='ein'?'arena.eingang':'arena.ausgang'),key=k+'|'+art+'|'+text;
 let b=huettenBild.get(key);if(!b){const x0=Math.floor(D.x)-6,y0=Math.floor(A.y)-H_-R-12,w=Math.ceil(B.x)+16-x0,h=Math.ceil(C.y)+4-y0,[c,g]=mk(w,h),Q=p=>({x:p.x-x0,y:p.y-y0}),U=(p,dz)=>({x:p.x-x0,y:p.y-y0-dz});
  const ein=art==='ein',wand=ein?['#7a5a39','#5e4429']:['#7a766c','#5c5850'],dach=ein?['#a32f2a','#7e1f18']:['#4a3826','#3a2c1e'],fuge=ein?'#3a2a1c':'#3e3a34';
  const poly=(pts,col)=>{g.beginPath();pts.forEach((p,j)=>j?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.closePath();g.fillStyle=col;g.fill();};
  // Wände: links (D→C) und rechts (C→B), mit Brettfugen und Durchgang
  poly([U(D,0),U(C,0),U(C,H_),U(D,H_)],wand[0]);poly([U(C,0),U(B,0),U(B,H_),U(C,H_)],wand[1]);
  for(const [p,q] of [[D,C],[C,B]])for(let j=1;j<4;j++){const u=j/4,a=U({x:p.x+(q.x-p.x)*u,y:p.y+(q.y-p.y)*u},0),e=U({x:p.x+(q.x-p.x)*u,y:p.y+(q.y-p.y)*u},H_);g.fillStyle=fuge;g.fillRect(Math.round(a.x),Math.round(e.y),1,Math.round(a.y-e.y));}
  for(const [p,q] of [[D,C],[C,B]]){const m0={x:p.x+(q.x-p.x)*.3,y:p.y+(q.y-p.y)*.3},m1={x:p.x+(q.x-p.x)*.7,y:p.y+(q.y-p.y)*.7};poly([U(m0,0),U(m1,0),U(m1,15),U(m0,15)],'#140e0a');}// Durchgang
  // Dach: Pyramide, vorne zwei Flächen sichtbar, Goldkante beim Eingang
  const S=U({x:(A.x+C.x)/2,y:(A.y+C.y)/2},H_+R);poly([U(A,H_),U(B,H_),S],dach[1]);poly([U(A,H_),U(D,H_),S],dach[1]);poly([U(D,H_),U(C,H_),S],dach[0]);poly([U(C,H_),U(B,H_),S],dach[1]);
  g.strokeStyle=ein?'#c9a040':'#2a2018';g.lineWidth=1;g.beginPath();g.moveTo(U(D,H_).x,U(D,H_).y);g.lineTo(U(C,H_).x,U(C,H_).y);g.lineTo(U(B,H_).x,U(B,H_).y);g.stroke();
  if(ein){px(g,S.x-2,S.y-4,4,3,'#e8dcc0');px(g,S.x-1,S.y-3,1,1,'#1a0e06');px(g,S.x+1,S.y-3,1,1,'#1a0e06');}// Totenkopf auf der Spitze
  else{const e=U(B,0);px(g,e.x+2,e.y-7,7,7,'#4a3826');px(g,e.x+2,e.y-8,7,1,'#6a5438');px(g,e.x+3,e.y-7,5,2,'#7a5a20');}// Eimer für Zartbesaitete
  // Schild über dem linken Durchgang
  g.font=font(7);const tw=Math.ceil(g.measureText(text).width)+6,m=U({x:(D.x+C.x)/2,y:(D.y+C.y)/2},H_-1);px(g,m.x-tw/2,m.y-5,tw,9,'#3a2617');px(g,m.x-tw/2+1,m.y-4,tw-2,7,'#c9b27a');
  g.fillStyle=ein?'#7e140a':'#2a1a0e';g.textAlign='center';g.textBaseline='middle';g.fillText(text,Math.round(m.x),Math.round(m.y));
  hart(c,g);b={c,x0,y0};huettenBild.set(key,b);if(huettenBild.size>12)huettenBild.delete(huettenBild.keys().next().value);}
 return {art,k,y:C.y+z+.03,x0:b.x0,x1:b.x0+b.c.width,y0:b.y0,y1:b.y0+b.c.height,draw(ctx){ctx.drawImage(b.c,b.x0,b.y0);}};}
// Anschluss für die Wege-Bilder (welt-raster.js): Wartestraße und Ausgang öffnen sich zur Tür, normale Wege zur Wartestraße nur am Ende der Schlange
W.anschluss=(k,n)=>{const T=W.T,a=W.feld[k],b=W.feld[n];
 if(b===T.ARENA_BAU)return (k===X_EIN&&a===T.WARTE&&n===arenaNachbar(k))||(k===X_AUS&&a!==T.WARTE&&n===arenaNachbar(k));
 if(a===T.WARTE&&b===T.WARTE)return true;if(a===T.WARTE)return k===ENDE&&istWeg(n);if(b===T.WARTE)return n===ENDE&&istWeg(k);return undefined;};
// Felder ändern sich (Bauen, Abreißen, Laden): Schlange und Anschluss neu (gesammelt, höchstens einmal je Bild)
let neuNoetig=false;{const rb=W.rebake;W.rebake=function(ks){const r=rb.apply(this,arguments);neuNoetig=true;return r;};}
// Eingang/Ausgang versetzen (Werkzeug in welt-bau.js)
function tuerMoeglich(k){return randRichtung(k)!=null;}
function setzeTuer(art,k){const a=randRichtung(k);if(a==null)return false;const alt=[X_EIN,X_AUS];if(art==='ein')EIN_A=a;else AUS_A=a;
 if(Math.abs(adiff(EIN_A,AUS_A))<TAU/NSL[NR-1]*1.5){if(art==='ein')AUS_A=EIN_A+TAU/NSL[NR-1]*2;else EIN_A=AUS_A-TAU/NSL[NR-1]*2;}// nicht in dieselbe Lücke
 neuTuer();tueren();const ks=[];for(const x of [...alt,X_EIN,X_AUS])if(x>=0)ks.push(x,...nb4(x));W.neuMalen?.(ks);schlangeRechnen();return true;}
// Stufenwechsel: Wartestraße bzw. Kiesweg vom neuen Rand nach außen verlängern, bis die alte Schlange bzw. ein Weg erreicht ist (höchstens 20 Felder)
function verlaengern(){const T=W.T,neu=[];
 // kürzester Weg (Breitensuche über freie Naturfelder) vom Feld vor der Tür bis zum nächsten passenden Feld, höchstens 25 Felder
 const lege=(a,typ,ziel)=>{const k0=aussenFeld(a,ziel);if(k0<0||ziel(k0))return;const frei=k=>W.feld[k]===W.grund[k]&&W.feld[k]!==T.FLUSS&&(!W.fest[k]||W.arenaPlatz?.[k])&&!(W.gebaeudeAt?.(k%W.N,(k/W.N)|0));
  if(!frei(k0))return;const par=new Map([[k0,-1]]),d=new Map([[k0,0]]),q=[k0];let gef=-1;
  for(let i=0;i<q.length&&gef<0;i++){const k=q[i];if(d.get(k)>=25)continue;for(const n of nb4(k)){if(par.has(n))continue;if(ziel(n)){gef=k;break;}if(!frei(n))continue;par.set(n,k);d.set(n,d.get(k)+1);q.push(n);}}
  if(gef<0)return;for(let k=gef;k>=0;k=par.get(k)){W.feld[k]=typ;if(W.obj)W.obj[k]=0;if(W.klein)W.klein[k]=0;neu.push(k);}};
 lege(EIN_A,T.WARTE,k=>W.feld[k]===T.WARTE);lege(AUS_A,T.STR2,istWeg);
 if(neu.length)W.rebake(neu);return neu.length;}
// Felder einer Stufe, die die Arena selbst setzt: Arena (gesperrt) und Kämpfergang. Stufe 1 gleicht genau der Karte aus welt-raster.js.
function felderVon(n){const S0=STUFEN[n-1],m=new Map(),r=S0.r,[cx,cy]=SG.c,T=W.T,set=(x,y,t)=>{if(W.inMap(x+O,y+O))m.set(W.ix(x+O,y+O),t);};
 const inArena=(x,y)=>Math.hypot(x+.5-cx,y+.5-cy)<r;
 const G0=W.ANORD.gang;if(G0)for(let y=G0[1];y<G0[1]+G0[3];y++)for(let x=G0[0];!inArena(x,y)&&x<cx;x++)set(x,y,T.LUDUS);
 for(let y=Math.floor(cy-r);y<=Math.ceil(cy+r);y++)for(let x=Math.floor(cx-r);x<=Math.ceil(cx+r);x++)if(inArena(x,y))set(x,y,T.ARENA_BAU);
 return m;}
// Siegerstatue (Stufe 3) am Eingang: Sieger mit erhobenem Schwert auf dem Sockel, frisch „gestrichen“
function statue(tx,ty){const q=W.iso(tx,ty),z=W.hz?W.hz(tx,ty):0,[c,g]=mk(30,62),X=15,Y=60;
 px(g,X-11,Y-10,22,10,'#7d766a');px(g,X-11,Y-10,22,2,'#aea58e');px(g,X-9,Y-6,18,1,'#5e584d');
 px(g,X-3,Y-34,6,24,'#b5ad98');px(g,X-4,Y-24,8,3,'#8a8272');px(g,X-2,Y-40,4,6,'#b5ad98');px(g,X-1,Y-38,1,1,'#3a352e');
 px(g,X+3,Y-36,2,10,'#b5ad98');px(g,X+4,Y-52,2,16,'#d8d2c0');px(g,X+2,Y-37,6,2,'#8a8272');// erhobener Arm und Schwert
 px(g,X-5,Y-33,2,9,'#b5ad98');px(g,X-8,Y-30,4,8,'#9a9080');// Schild am anderen Arm
 for(const [u,v,w,h] of [[4,-50,2,6],[-2,-30,3,2],[-1,-28,1,5],[-6,-24,2,3],[-10,-9,3,4],[6,-9,2,6]])px(g,X+u,Y+v,w,h,ST.blut);
 const o={y:q.y,x0:q.x-16,x1:q.x+16,y0:q.y-z-64,y1:q.y-z+2,draw(ctx){ctx.drawImage(c,Math.round(q.x-X),Math.round(q.y-z-Y));}};return o;}
function setzeFelder(){const T=W.T,alle=new Map();for(let n=1;n<=STUFEN.length;n++)for(const k of felderVon(n).keys())alle.set(k,1);
 const soll=felderVon(STUFE),unsere=new Set([T.ARENA_BAU,T.KIES,T.LUDUS,T.WARTE,T.STR1,T.STR2,T.STR3,T.STR4,T.STR5]),neu=[];
 for(const k of alle.keys()){const ziel=soll.get(k)??W.grund[k],ist=W.feld[k];if(ist===ziel)continue;if(!unsere.has(ist)&&ist!==W.grund[k])continue;// fremdes Gebäude: stehen lassen
  W.feld[k]=ziel;if(soll.has(k)){if(W.obj)W.obj[k]=0;if(W.klein)W.klein[k]=0;}if(ziel===T.ARENA_BAU||ziel===T.LUDUS)W.fest[k]=1;else if(!W.arenaPlatz?.[k])W.fest[k]=0;neu.push(k);}
 if(neu.length)W.rebake(neu);return neu.length;}
function bauen(){masse(STUFE);plaetze();SEKTOREN=Array.from({length:SEKT},(_,s)=>sektorBild(s));SAND=sand();OBEN=['baldachin','segelL','segelR'].map(ueber);GESAMT=null;TOR_K=torItem();tueren();}
// Tür versetzt: nur die betroffenen Ausschnitte neu malen
function neuTuer(){const S=new Set();for(const a of [EIN_A,AUS_A,...ALT_T])S.add(sektor(winkel(NR-1,slot(NR-1,a))));for(const s of S)SEKTOREN[s]=sektorBild(s);GESAMT=null;ALT_T=[EIN_A,AUS_A];}
let ALT_T=[];

// ---------- Schilder (eigene Schrift, Rattenpergament-Farben) ----------
const schilder=new Map();
function schild(titel,zeile){const key=titel+'|'+zeile;let b=schilder.get(key);if(b)return b;const [,m]=mk(4,4);m.font=font(9);const w1=m.measureText(titel).width;m.font=font(7);const w2=zeile?m.measureText(zeile).width:0;
 const w=Math.ceil(Math.max(w1,w2))+10,h=zeile?20:12,[c,g]=mk(w,h);g.fillStyle='#3a2617';g.fillRect(0,0,w,h);g.fillStyle='#c9b27a';g.fillRect(1,1,w-2,h-2);g.fillStyle='#6b1d17';g.fillRect(w-6,2,3,3);g.fillRect(w-5,5,1,2);
 g.textAlign='center';g.textBaseline='top';g.fillStyle='#7e140a';g.font=font(9);g.fillText(titel,w/2,1);if(zeile){g.font=font(7);g.fillStyle='#2a1a0e';g.fillText(zeile,w/2,11);}
 b={c,w,h};schilder.set(key,b);if(schilder.size>40)schilder.delete(schilder.keys().next().value);return b;}
const zeitText=h=>window.WeltZeit?WeltZeit.zeitText(h):String(Math.floor(h));
function schildText(){const ph=phase();if(ph==='zu')return t('arena.schild.zu');if(ph==='einlass')return t('arena.schild.einlass',{zeit:zeitText(((AR.termin%24)+6)%24)});if(ph==='laeuft')return t('arena.schild.laeuft');return t('arena.schild.aus');}
function schildItem(tx,ty,fn){const q=W.iso(tx,ty),z=W.hz?W.hz(tx,ty):0,o={y:q.y,x0:q.x-90,x1:q.x+90,y0:q.y-z-60,y1:q.y-z+2,draw(ctx){const [ti,ze]=fn(),s=schild(ti,ze),x=Math.round(q.x),y=Math.round(q.y-z);
 ctx.fillStyle='#5e4229';ctx.fillRect(x-1,y-14,2,14);ctx.drawImage(s.c,Math.round(x-s.w/2),y-14-s.h);o.extra?.(ctx,x,y);}};return o;}
bauen();sandDeko0();L?.beiWechsel?.(()=>schilder_());// Häuschen tragen die Aufschrift in der gewählten Sprache
function tueren2(){schlangeRechnen(false);}
function sandDeko0(){const D=W.deko;if(!D)return;const r=RS+.9;for(let y=Math.floor(CY-r);y<=Math.ceil(CY+r);y++)for(let x=Math.floor(CX-r);x<=Math.ceil(CX+r);x++)if(Math.hypot(x+.5-CX,y+.5-CY)<r){const k=W.ix(x,y);D[k]=1;DEKO.push(k);}}
let dekoErst=true;
// ---------- Termin und Ablauf ----------
const AR={termin:null,id:0,quote:.75,aus:false,schlange:[],drin:new Set(),einT:0,blasen:[],blT:2};
const EIN_DT=1.1,KACHEL=Math.hypot(32,16);// KACHEL: Bildpunkte je Feld entlang eines Weges (Tempo der Besucher ist in Bildpunkten)// Sekunden Spielzeit zwischen zwei Gästen am Einlass
const jetzt=()=>{const h=M.weltTag?.stunde;if(h==null)return null;return (S.day||1)*24+((h-6+24)%24);};
function phase(){if(AR.termin==null)return 'zu';const n=jetzt();if(n==null)return 'zu';if(n<AR.termin)return 'einlass';if(n<AR.termin+1)return 'laeuft';return 'aus';}
function einlass(){const ph=phase();return OFFEN&&(ph==='einlass'||ph==='laeuft');}// Einlass bis zum Ende der Wartestunde
function termin(stunden=4){if(phase()!=='zu')return false;const n=jetzt();if(n==null)return false;AR.termin=n+stunden;AR.id++;AR.quote=rnd(.6,.9);AR.aus=false;
 try{M.ui?.notify?.(t('arena.termin',{zeit:zeitText(((AR.termin%24)+6)%24)}));}catch(e){}M.weltBesucher?.aufruf?.();return true;}
// Kämpfertor: zum Kampfbeginn Gong, dann hebt sich das Fallgitter in 1,8 s (wie im Start-Intro); nach 20 s geht es wieder zu (bis B4, dann steuert der Kampf)
let phAlt='zu';
function tor(auf){TOR.soll=auf?1:0;if(auf){TOR.gong=1.2;try{M.sound?.('gong');}catch(e){}}else TOR.offen=0;}
function torTick(dt,ph){if(ph==='laeuft'&&phAlt==='einlass'){tor(true);TOR.offen=20;}phAlt=ph;
 if(TOR.gong>0){TOR.gong-=dt;if(TOR.gong<=0)try{M.sound?.('rise');}catch(e){}return;}
 if(TOR.soll&&TOR.offen>0&&TOR.auf>=1){TOR.offen-=dt;if(TOR.offen<=0)TOR.soll=0;}
 const z=TOR.soll;if(TOR.auf!==z)TOR.auf=z>TOR.auf?Math.min(1,TOR.auf+dt/1.8):Math.max(0,TOR.auf-dt/1.8);}
const edel=v=>(v.stand||v.g?.stand)==='Edelmann';
function anstellen(v){if(!einlass())return false;v.st='arena';v.ar={modus:'schlange',qd:QLEN};v.innen=false;v.sitzt=false;AR.schlange.push(v);return true;}
function blase(v,text,dauer=4){if(AR.blasen.length>5)AR.blasen.shift();AR.blasen.push({v,text,t:dauer});}
function abweisen(v,schl){v.ar=null;v.innen=false;v.sitzt=false;v.unsichtbar=false;if(schl)blase(v,t(schl));M.weltBesucher?.gehen?.(v);}
function vergiss(v){const i=AR.schlange.indexOf(v);if(i>=0)AR.schlange.splice(i,1);if(AR.drin.has(v)){gib(v.ar?.s);AR.drin.delete(v);}v.ar=null;}
function rein(v,s){s.v=v;v.ar={modus:'tuer',s,t:0,r:RP,a:EIN_A,ziel:W.iso(T_EIN.tx,T_EIN.ty)};AR.drin.add(v);}
// ein Schritt am Boden (Weltpunkte); true, wenn angekommen
function gehBoden(v,q,dt){const ex=q.x-v.x,ey=q.y-v.y,d=Math.hypot(ex,ey),st=v.sp*dt;if(Math.abs(ex)>.5)v.dir=ex<0?1:0;
 if(d<=st){v.x=q.x;v.y=q.y;v.dist+=d;}else{v.x+=ex/d*st;v.y+=ey/d*st;v.dist+=st;}v.dx=v.x;v.dy=v.y;v.f=W.gehBild(v.dist);return d<=st;}
// drinnen: Lage aus Halbmesser und Winkel, Höhe nach Rang
function setzeInnen(v){const r=v.ar,h=r.r>R_AUS-.4?HOCH[NR-1]:HOCH[rangBei(r.r)],p=P(r.r,r.a,h),ex=p.x-v.dx;if(Math.abs(ex)>.3)v.dir=ex<0?1:0;v.dist+=Math.hypot(ex,p.y-v.dy);v.dx=p.x;v.dy=p.y;v.x=p.x;v.y=keyAt(r.r,r.a);v.f=W.gehBild(v.dist);v.oz=0;}
function innen(v,dt){const r=v.ar,s=r.s,tiles=v.sp/KACHEL*dt;
 switch(r.modus){
  case 'tuer':if(AR.aus){gib(s);AR.drin.delete(v);abweisen(v,null);return;}if(gehBoden(v,r.ziel,dt)){r.modus='treppe';r.t=1.6;v.unsichtbar=true;}return;
  case 'treppe':r.t-=dt;if(r.t<=0){v.unsichtbar=false;v.innen=true;r.modus='umgang';r.r=RP;r.a=EIN_A;setzeInnen(v);}return;
  case 'umgang':{const d=adiff(r.a,s.a),st=tiles/RP;if(Math.abs(d)<=st){r.a=s.a;r.modus='runter';}else r.a+=Math.sign(d)*st;setzeInnen(v);return;}
  case 'runter':{const z=rSitz(s.k),d=z-r.r;if(Math.abs(d)<=tiles){r.r=z;r.modus='sitzt';v.sitzt=true;v.dx=s.x;v.dy=s.y;v.x=s.x;v.y=s.key;v.dir=s.dir;v.f=W.WALK;r.warte=0;
    if(r.murrt)blase(v,t('arena.adelMurrt'),5);if(AR.aus)r.warte=rnd(0,4);return;}r.r+=Math.sign(d)*tiles;setzeInnen(v);return;}
  case 'sitzt':v.dx=s.x;v.dy=s.y;v.y=s.key;v.dir=s.dir;if(AR.aus){r.warte-=dt;if(r.warte<=0){v.sitzt=false;gib(s);r.modus='hoch';}}return;
  case 'hoch':{const d=RP-r.r;if(Math.abs(d)<=tiles){r.r=RP;r.modus='umgangRaus';}else r.r+=Math.sign(d)*tiles;setzeInnen(v);return;}
  case 'umgangRaus':{const d=adiff(r.a,AUS_A),st=tiles/RP;if(Math.abs(d)<=st){r.a=AUS_A;r.modus='treppeRaus';r.t=1.6;v.unsichtbar=true;}else r.a+=Math.sign(d)*st;setzeInnen(v);return;}
  case 'treppeRaus':r.t-=dt;if(r.t<=0){const q=W.iso(T_AUS_IN.tx,T_AUS_IN.ty);v.x=q.x;v.y=q.y;v.dx=q.x;v.dy=q.y;v.innen=false;v.unsichtbar=false;r.modus='draussen';r.ziel=W.iso(T_AUS.tx,T_AUS.ty);}return;
  case 'draussen':if(gehBoden(v,r.ziel,dt)){AR.drin.delete(v);v.ar=null;M.weltBesucher?.gehen?.(v);}return;}}
function platzFuer(v){if(edel(v)){const s=nimm(frei.a);if(s)return {s,murrt:false};const n=nimm(frei.n);return n?{s:n,murrt:true}:null;}const n=nimm(frei.n);return n?{s:n,murrt:false}:null;}
function schlange(dt){const Q=AR.schlange;
 for(let i=0;i<Q.length;i++){const v=Q[i],r=v.ar,ziel=Math.max(i*QA,i?Q[i-1].ar.qd+QA:0),st=v.sp/KACHEL*dt;let geht=false;if(r.qd>ziel+.01){r.qd=Math.max(ziel,r.qd-st);geht=true;}
  const q=qpunkt(r.qd),ex=q.x-v.x;if(Math.abs(ex)>.3)v.dir=ex<0?1:0;v.dist+=Math.hypot(ex,q.y-v.y);v.x=q.x;v.y=q.y;v.dx=q.x;v.dy=q.y;v.f=geht?W.gehBild(v.dist):W.WALK;}
 AR.einT-=dt;const k=Q[0];if(!k)return;
 if(!einlass()){for(const v of Q.splice(0))abweisen(v,'arena.zuSpaet');return;}
 if(k.ar.qd<=.05&&AR.einT<=0){AR.einT=EIN_DT;Q.shift();const p=platzFuer(k);if(!p){abweisen(k,'arena.voll');return;}rein(k,p.s);k.ar.murrt=p.murrt;}}
function murren(dt){for(let i=AR.blasen.length-1;i>=0;i--){const b=AR.blasen[i];b.t-=dt;if(b.t<=0||b.v.st==='fort'||(!b.v.ar&&b.v.st==='arena'))AR.blasen.splice(i,1);}
 if(phase()!=='laeuft')return;AR.blT-=dt;if(AR.blT>0||AR.blasen.length>=3)return;AR.blT=rnd(2.2,4.2);const sitzen=[...AR.drin].filter(v=>v.ar?.modus==='sitzt');if(!sitzen.length)return;
 blase(pick(sitzen),t('arena.murren.'+(1+((Math.random()*8)|0))));}
let npcDa=false;
const tick0=H.tick;H.tick=dt=>{tick0?.(dt);if(!npcDa&&M.weltNpc){npcDa=true;try{M.weltNpc.dazu(EINL);M.weltNpc.dazu(RECHEN);}catch(e){console.warn(e);}}
 if(dekoErst){dekoErst=false;const ks=[...DEKO];for(const x of [X_EIN,X_AUS,ENDE])if(x>=0)ks.push(x,...nb4(x));W.neuMalen?.(ks);}if(neuNoetig){neuNoetig=false;tueren2();}
 if(!(dt>0))return;const ph=phase();torTick(dt,ph);
 if(ph==='aus'&&!AR.aus){AR.aus=true;for(const v of AR.drin)if(v.ar?.modus==='sitzt')v.ar.warte=rnd(0,30);}
 schlange(dt);for(const v of AR.drin){try{innen(v,dt);}catch(e){console.warn(e);AR.drin.delete(v);abweisen(v,null);}}murren(dt);
 if(AR.aus&&!AR.schlange.length&&!AR.drin.size){AR.termin=null;AR.aus=false;}};

// ---------- NPCs: Einlasser und Rechenknecht (welt-npc.js zeichnet und zeigt sie beim Antippen) ----------
const leer={weapon:null,secondary:null,shield:null,armor:{}};
function figur(id,name,h,w){const rng=S.rng,g=M.makeGladiator(0);S.rng=rng;Object.assign(g,{id,name,height:h,weight:w,fame:0,scars:[]});g.equipment={...leer,armor:{}};g.enemyGear={...leer,armor:{}};return g;}
const forge=(c,g,x,y,tt,extra)=>{try{M.renderForgeActors(c,[{team:0,a:0,phase:tt*2,state:'idle',energy:100,ammo:0,moveSpeed:0,bloodMarks:{},noNav:true,forgePose:'',id:g.id,g,x,y,...extra}]);}catch(e){}};
const EINL={id:'einlasser',name:()=>t('arena.einlasser'),rolle:()=>t('arena.einlasserRolle'),ort:null,
 platz(){return {...EINL_P};},
 mal(c,x,y,tt,o){o.g??=figur('welt-einlasser','Pupius Zahnlos',168,104);forge(c,o.g,x,y,tt,{a:Math.PI});c.fillStyle='#5a3a20';c.fillRect(x+12,y-34,3,34);c.fillStyle='#8a5a30';c.fillRect(x+11,y-38,5,6);},// Knüppel
 spruch:()=>t('arena.einl.'+(1+((Math.random()*5)|0)))};
const RK=kachel(2.3,300*DEG);
const RECHEN={id:'rechenknecht',name:()=>t('arena.rechen'),rolle:()=>t('arena.rechenRolle'),ort:null,
 platz(){return {x:RK.tx,y:RK.ty,innen:false};},
 mal(c,x,y,tt,o){o.g??=figur('welt-rechen','Fulvius Harke',160,58);forge(c,o.g,x,y,tt,{a:0});const sw=Math.sin(tt*3)*4;
  c.strokeStyle='#7a5a30';c.lineWidth=3;c.beginPath();c.moveTo(x+6,y-36);c.lineTo(x+26+sw,y);c.stroke();c.fillStyle='#4a3a28';c.fillRect(x+18+sw,y-2,18,3);for(let i=0;i<6;i++)c.fillRect(x+18+sw+i*3,y+1,1,4);
  c.fillStyle='#4a3826';c.fillRect(x-30,y-14,14,14);c.fillStyle='#6a5438';c.fillRect(x-31,y-15,16,2);c.fillStyle=ST.blut2;c.fillRect(x-28,y-13,10,3);},// Harke und Eimer mit Rotem
 spruch:()=>t('arena.rechen.'+(1+((Math.random()*4)|0)))};

// ---------- Zeichnen ----------
const sicht=(o,v)=>o.x1>v.x0&&o.x0<v.x1&&o.y1>v.y0&&o.y0<v.y1;
// B0b-Nacharbeit: der Sand liegt im Bodenbild der Karte (einmal gebacken, kostet beim Zeichnen nichts)
function sandDeko(){const D=W.deko;if(!D)return;const alt=DEKO;for(const k of alt)D[k]=0;DEKO=[];const r=RS+.9;
 for(let y=Math.floor(CY-r);y<=Math.ceil(CY+r);y++)for(let x=Math.floor(CX-r);x<=Math.ceil(CX+r);x++)if(Math.hypot(x+.5-CX,y+.5-CY)<r){const k=W.ix(x,y);D[k]=1;DEKO.push(k);}
 W.neuMalen?.([...alt,...DEKO]);}
const bf0=H.bodenFeld;H.bodenFeld=(g,tx,ty,lod)=>{if(Math.hypot(tx+.5-CX,ty+.5-CY)>=RS+.9)return bf0?.(g,tx,ty,lod);
 const z=W.hz?W.hz(tx+.5,ty+.5):0,e=[W.iso(tx,ty),W.iso(tx+1,ty),W.iso(tx+1,ty+1),W.iso(tx,ty+1)];g.save();g.beginPath();e.forEach((p,i)=>i?g.lineTo(p.x,p.y-z):g.moveTo(p.x,p.y-z));g.closePath();g.clip();g.drawImage(SAND.c,SAND.x,SAND.y);g.restore();};
const items0=H.items;H.items=(items,view)=>{items0?.(items,view);
 if(W.mini){const G=gesamt();if(sicht({x0:G.x,x1:G.x1,y0:G.y,y1:G.y1},view))items.push(G.item);return;}
 for(const k of SEKTOREN)if(sicht(k,view))items.push(k.item);for(const o of OBEN)if(sicht(o,view))items.push(o.item);if(TOR.auf<1&&sicht(TOR_K,view))items.push(TOR_K);if(STATUE&&sicht(STATUE,view))items.push(STATUE);
 for(const h of HUETTEN)if(sicht(h,view))items.push(h);for(const s of SCHILDER)if(sicht(s,view))items.push(s);};
const world0=H.world;H.world=(ctx,view,dt)=>{world0?.(ctx,view,dt);if(!AR.blasen.length||W.mini)return;const z=Math.min(3,Math.max(.4,.8/W.cam.s));ctx.font=font(10*z);ctx.textAlign='center';ctx.textBaseline='middle';
 for(const b of AR.blasen){const v=b.v;if(v.unsichtbar)continue;const x=v.dx,y=v.dy-(v.sitzt?14:W.HOEHE)-8*z-(v.oz||0);if(x<view.x0-200||x>view.x1+200||y<view.y0-30||y>view.y1+30)continue;const w=ctx.measureText(b.text).width+8*z;
  ctx.globalAlpha=Math.min(1,b.t*2);ctx.fillStyle='rgba(18,12,9,.86)';ctx.fillRect(Math.round(x-w/2),Math.round(y-7*z),Math.round(w),Math.round(14*z));ctx.fillStyle='#f0e2c0';ctx.fillText(b.text,Math.round(x),Math.round(y)+1);}ctx.globalAlpha=1;};

// ---------- Testknopf (bis B2, VOR VERÖFFENTLICHUNG ENTFERNEN) ----------
const bar=document.querySelector('#weltUi .w-bar');
if(bar){const b=document.createElement('button');b.id='wProbekampf';b.className='w-btn';
 const txt=()=>{b.replaceChildren(...(window.AT2_IKON?[AT2_IKON.element('sanduhr'),' ']:[]),t('arena.test'));b.title=t('arena.testTitel');};txt();L?.beiWechsel(txt);
 b.onclick=()=>{if(!termin(8))try{M.ui?.notify?.(t('arena.schonTermin'));}catch(e){}};bar.appendChild(b);}

// ---------- Ausbaustufen wechseln (bis R1 per Testknopf, MIT DER FORSCHUNG ENTFERNEN) ----------
const beiStufe=[];
function stufe(n,laden){n=Math.max(1,Math.min(STUFEN.length,n|0));if(!laden&&phase()!=='zu')return false;if(n===STUFE&&(!laden||n===1))return true;
 const alt=STUFE;STUFE=n;const t0=performance.now();bauen();setzeFelder();tueren();if(!laden)verlaengern();tueren();sandDeko();AR.ms=performance.now()-t0;TOR.auf=0;TOR.soll=0;
 for(const f of beiStufe)try{f(n,alt);}catch(e){console.warn(e);}return true;}
if(bar){const b=document.createElement('button');b.id='wAusbau';b.className='w-btn';
 const txt=()=>{b.replaceChildren(...(window.AT2_IKON?[AT2_IKON.element('bauen'),' ']:[]),t('arena.ausbau'));b.title=t('arena.ausbauTitel');};txt();L?.beiWechsel(txt);
 b.onclick=()=>{const n=STUFE%STUFEN.length+1;if(!stufe(n)){try{M.ui?.notify?.(t('arena.ausbauNein'));}catch(e){}return;}
  try{M.ui?.notify?.(t(n>1?'arena.ausbauFertig':'arena.ausbauZurueck',{name:t(SD.name),n:SITZE.length+1}));}catch(e){}};bar.appendChild(b);}

M.weltArena={termin,phase,einlass,anstellen,vergiss,tuerMoeglich,setzeTuer,huetten:()=>HUETTEN,get offen(){return OFFEN;},get grund(){return GRUND;},get eingangFeld(){return X_EIN;},get ausgangFeld(){return X_AUS;},get schlangeLaenge(){return QP.length-1;},
 tueren:()=>({ein:Math.round(EIN_A/DEG*10)/10,aus:Math.round(AUS_A/DEG*10)/10}),tuerenLaden(o){if(!o)return;EIN_A=o.ein*DEG;AUS_A=o.aus*DEG;neuTuer();tueren();},schild:schildItem,setzeStufe:n=>stufe(n),stufeLaden:n=>stufe(n,true),beiStufe:f=>beiStufe.push(f),stufen:STUFEN.length,
 tor,get torAuf(){return TOR.auf;},get stufe(){return STUFE;},felder:n=>felderVon(n||STUFE),get umbauMs(){return AR.ms;},torPunkt:()=>({...kachel(R_AUS+.6,TOR_A)}),
 get id(){return AR.id;},get quote(){return AR.quote;},get terminStunde(){return AR.termin;},
 ziel:()=>({...ZIEL_Q}),schauZiel:()=>({...ZIEL_SCHAU}),
 lanistaSoll:()=>{const ph=phase();return ph==='einlass'||ph==='laeuft';},lanistaEile:()=>phase()==='laeuft',lanistaPlatz:()=>({...LOGE_SITZ}),treppe:()=>({...T_TREPPE}),
 sitze:()=>SITZE,freie:()=>({n:frei.n.length,a:frei.a.length}),schlange:()=>AR.schlange,drin:()=>AR.drin,blasen:()=>AR.blasen,
 sektoren:()=>SEKTOREN,gesamtBild:()=>gesamt().c,arten:()=>ART,mitte:{tx:CX,ty:CY},get R_AUS(){return R_AUS;},jetzt,get sand(){return SAND;}};
})();
