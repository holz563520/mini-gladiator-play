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
// · Nur Arena Theory 2.0. 1.0 bleibt unberührt.
// =====================================================================================================================
(()=>{
const M=window.MG,W=window.WeltKarte,H=window.WeltHook,L=window.AT2Sprache;if(!window.AT2||!M||!W||!H||!W.ANORD?.sandgrube)return;
const S=M.s,N=W.N,O=W.O,TAU=Math.PI*2,DEG=Math.PI/180,t=(k,v)=>L?L.t(k,v):k,rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[(Math.random()*a.length)|0];
const SG=W.ANORD.sandgrube,CX=SG.c[0]+O,CY=SG.c[1]+O,Z0=W.hz?W.hz(CX,CY):0,C0=W.iso(CX,CY);
// ---------- Maße (Felder bzw. Bildpunkte) ----------
const RS=4.6,BW=1,R_AUS=8.3,RP=7.95,HOCH=[16,25,34],HL=HOCH[1]+2;// Sand, Breite eines Rangs, Außenmauer, Umgang, Höhe der Ränge, Loge
const rIn=k=>RS+k*BW,rOut=k=>k<2?RS+(k+1)*BW:R_AUS,rSitz=k=>RS+k*BW+.55,rangBei=r=>r>=rIn(2)?2:r>=rIn(1)?1:0;
const NSL=[40,48,56],LOGE=225*DEG,TREPPEN=[0,40,90,145,275,330].map(d=>d*DEG),MORSCH=300*DEG,TOR_A=180*DEG,EIN_A=90*DEG,AUS_A=40*DEG,GEIER_A=255*DEG;
const ST={seat:['#5d4d37','#66553c'],riser:'#463827',edge:'#9a7d52',stair:'#7a6440',pod:'#6b5238',podTop:'#b3935f',face:'#5a4430',joint:'#3a2e22',
 sand:'#a18455',hell:'#b49865',dunkel:'#665846',blut:'#6e2418',blut2:'#8a3324',bank:'#7f6845',bankD:'#4a3a28',kissen:['#6a2a6a','#a32f2a','#3f4f8a'],gold:'#d8a830',rot:'#8e1f18'};
// Bildschirmpunkt zu (Halbmesser r, Winkel a, Höhe h); gy: Boden-y ohne Höhe (Sortierschlüssel wie bei allen Figuren)
const P=(r,a,h=0)=>({x:C0.x+r*32*(Math.cos(a)-Math.sin(a)),y:C0.y+r*16*(Math.cos(a)+Math.sin(a))-Z0-h});
const gy=(r,a)=>C0.y+r*16*(Math.cos(a)+Math.sin(a)),fern=a=>Math.cos(a)+Math.sin(a)<0;
const kachel=(r,a)=>({tx:CX+r*Math.cos(a),ty:CY+r*Math.sin(a)});
const winkel=(k,j)=>LOGE+j*TAU/NSL[k],slot=(k,a)=>{const n=NSL[k];const j=Math.round((a-LOGE)/TAU*n);return ((j%n)+n)%n;};
const adiff=(a,b)=>{let d=(b-a)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;};
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));const g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=false;return [c,g];};
const font=px=>window.AT2_STIL?AT2_STIL.font(px):'bold '+Math.round(px)+'px ui-monospace,Menlo,Consolas,monospace';

// ---------- Plätze: je Rang Steckplätze im gleichen Abstand, von der Loge aus gezählt ----------
const ART=NSL.map(n=>new Array(n).fill('sitz'));
for(const k of [0,1])for(let d=-4;d<=4;d++)ART[k][((d%NSL[k])+NSL[k])%NSL[k]]=Math.abs(d)<=1?'loge':'adel';
for(const a of TREPPEN)for(let k=0;k<3;k++){const j=slot(k,a);if(ART[k][j]==='sitz')ART[k][j]='treppe';}
{const j=slot(2,MORSCH);if(ART[2][j]==='sitz')ART[2][j]='morsch';}
const KEY=NSL.map((n,k)=>Array.from({length:n},(_,j)=>gy(rOut(k),winkel(k,j))));
const keyAt=(r,a)=>{const k=rangBei(r);return KEY[k][slot(k,a)]+.0005+(gy(r,a)-C0.y)*1e-6;};
const SITZE=[];
for(let k=0;k<3;k++)for(let j=0;j<NSL[k];j++){const art=ART[k][j];if(art!=='sitz'&&art!=='adel')continue;const a=winkel(k,j),p=P(rSitz(k),a,HOCH[k]);
 SITZE.push({k,j,a,adel:art==='adel',x:Math.round(p.x),y:Math.round(p.y),key:KEY[k][j]+.001,dir:p.x>C0.x?1:0,v:null});}
const frei={n:SITZE.filter(s=>!s.adel),a:SITZE.filter(s=>s.adel)};
const nimm=l=>{if(!l.length)return null;const i=(Math.random()*l.length)|0,s=l[i];l[i]=l[l.length-1];l.pop();return s;};
const gib=s=>{if(!s||!s.v)return;s.v=null;(s.adel?frei.a:frei.n).push(s);};
const LOGE_SITZ=(()=>{const p=P(5.7,LOGE,HL),q=kachel(5.7,LOGE);return {x:q.tx,y:q.ty,sx:p.x,sy:p.y,key:KEY[0][0]+.002,oz:Z0+HL-6,tapOz:Z0+HL,loge:true,innen:false};})();

// ---------- Keile zeichnen ----------
// Bogen in den Pfad: n Punkte von a0 bis a1 (rückwärts mit rev)
function bogen(g,r,a0,a1,h,ox,oy,rev,erst,n=6){for(let i=0;i<=n;i++){const a=rev?a1-(a1-a0)*i/n:a0+(a1-a0)*i/n,p=P(r,a,h);if(erst&&i===0)g.moveTo(p.x-ox,p.y-oy);else g.lineTo(p.x-ox,p.y-oy);}}
function flaeche(g,r0,r1,a0,a1,h,ox,oy,col){g.beginPath();bogen(g,r0,a0,a1,h,ox,oy,false,true);bogen(g,r1,a0,a1,h,ox,oy,true,false);g.closePath();g.fillStyle=col;g.fill();}
function wand(g,r,a0,a1,z0,z1,ox,oy,col){g.beginPath();bogen(g,r,a0,a1,z0,ox,oy,false,true);bogen(g,r,a0,a1,z1,ox,oy,true,false);g.closePath();g.fillStyle=col;g.fill();}
function strich(g,r,a0,a1,h,ox,oy,col,w=1){g.beginPath();bogen(g,r,a0,a1,h,ox,oy,false,true,4);g.strokeStyle=col;g.lineWidth=w;g.stroke();}
const px=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h);};
// Kanten hart machen (Pixelstil, keine halbdurchsichtigen Ränder)
function hart(c,g){const im=g.getImageData(0,0,c.width,c.height),d=im.data;for(let i=3;i<d.length;i+=4)d[i]=d[i]>110?255:0;g.putImageData(im,0,0);}
const KEILE=[];
function keil(k,j){const n=NSL[k],dA=TAU/n,a=winkel(k,j),art=ART[k][j],a0=a-dA/2-.008,a1=a+dA/2+.008,r0=rIn(k),r1=rOut(k),h=art==='loge'?HL:HOCH[k],f=fern(a);
 let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const r of [r0,r1])for(let i=0;i<=6;i++){const aa=a0+(a1-a0)*i/6;for(const z of [0,h+10]){const p=P(r,aa,z);x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);}}
 const ox=Math.floor(x0)-3,oy=Math.floor(y0)-3,[c,g]=mk(x1-ox+4,y1-oy+4),Q=(r,aa,z)=>{const p=P(r,aa,z);return {x:p.x-ox,y:p.y-oy};},seed=(k*97+j*31)%17;
 // senkrechte Fläche, die man sieht: hinten die Innenseite (Podium bzw. Stufe), vorn die Außenseite (Fassade)
 if(f){wand(g,r0,a0,a1,0,h,ox,oy,k===0?(art==='loge'?ST.rot:ST.pod):ST.riser);if(k>0)strich(g,r0,a0,a1,h-1,ox,oy,'#7a6440');
  if(k===0){if(art==='loge'){strich(g,r0,a0,a1,h-1,ox,oy,ST.gold);strich(g,r0,a0,a1,3,ox,oy,ST.gold);for(let i=0;i<5;i++){const q=Q(r0,a0+(a1-a0)*(i+.5)/5,4);px(g,q.x,q.y,1,2,ST.gold);}}
   else{strich(g,r0,a0,a1,h-1,ox,oy,ST.podTop,2);strich(g,r0,a0,a1,6,ox,oy,ST.joint);strich(g,r0,a0,a1,11,ox,oy,ST.joint);
    if(j===slot(0,TOR_A)){// Kämpfertor: Fallgitter im Podium, darüber ein Schädel
     wand(g,r0-.01,a-dA*.42,a+dA*.42,0,h-3,ox,oy,'#141110');for(let i=0;i<=6;i++){const q0=Q(r0-.02,a-dA*.42+dA*.84*i/6,0),q1=Q(r0-.02,a-dA*.42+dA*.84*i/6,h-4);g.strokeStyle='#8a7a5a';g.lineWidth=1;g.beginPath();g.moveTo(q0.x,q0.y);g.lineTo(q1.x,q1.y);g.stroke();}
     strich(g,r0-.02,a-dA*.42,a+dA*.42,5,ox,oy,'#8a7a5a');strich(g,r0-.02,a-dA*.42,a+dA*.42,10,ox,oy,'#8a7a5a');const s=Q(r0-.02,a,h-2);px(g,s.x-2,s.y-1,4,3,'#e8dcc0');px(g,s.x-1,s.y,1,1,'#1a0e06');px(g,s.x+1,s.y,1,1,'#1a0e06');}
    else if(seed%3===0){const q=Q(r0-.01,a,h*.5);g.fillStyle='#2f251b';g.beginPath();g.arc(q.x,q.y,3.5,0,TAU);g.fill();g.fillStyle=['#8a4a34','#56684a','#7a6a3c','#4d5d6a'][seed%4];g.beginPath();g.arc(q.x,q.y,2.6,0,TAU);g.fill();px(g,q.x,q.y,1,1,'#c9b27a');}
    if(seed===5||seed===11){const q=Q(r0-.01,a+dA*.2,7);px(g,q.x,q.y,2,5,ST.blut);px(g,q.x+1,q.y+5,1,2,ST.blut);}}}}// Blut läuft das Podium hinunter
 else{wand(g,r1,a0,a1,0,h,ox,oy,k===2?ST.face:ST.riser);
  if(k===2){// Fassade aus Brettern: Fugen, Querbalken, Pfosten an den Kanten
   for(let i=1;i<4;i++){const q0=Q(r1,a0+(a1-a0)*i/4,0),q1=Q(r1,a0+(a1-a0)*i/4,h);g.strokeStyle=i===2?'#4c3a28':ST.joint;g.lineWidth=1;g.beginPath();g.moveTo(q0.x,q0.y);g.lineTo(q1.x,q1.y);g.stroke();}
   strich(g,r1,a0,a1,h*.55,ox,oy,ST.joint,2);strich(g,r1,a0,a1,3,ox,oy,'#3a2e22',2);
   const tuer=j===slot(2,EIN_A)||j===slot(2,AUS_A);
   if(tuer){wand(g,r1+.01,a-dA*.3,a+dA*.3,0,17,ox,oy,'#120d0a');strich(g,r1+.01,a-dA*.34,a+dA*.34,18,ox,oy,'#7a5a39',2);
    for(const s of [-1,1]){const q0=Q(r1+.01,a+s*dA*.33,0),q1=Q(r1+.01,a+s*dA*.33,18);g.strokeStyle='#7a5a39';g.lineWidth=2;g.beginPath();g.moveTo(q0.x,q0.y);g.lineTo(q1.x,q1.y);g.stroke();}}
   else if(seed===3||seed===9){const q=Q(r1,a,h*.35);px(g,q.x-2,q.y,4,2,ST.blut2);px(g,q.x-1,q.y+2,2,4,ST.blut);}// verschmiert
   else if(seed===7){const q=Q(r1,a,h*.75);px(g,q.x-3,q.y-1,6,3,'#c9b27a');px(g,q.x-2,q.y,4,1,'#5a3a20');}}}// angenageltes Brett (Flicken)
 // Oberseite
 flaeche(g,r0,r1,a0,a1,h,ox,oy,art==='loge'?'#7a5636':art==='treppe'?ST.stair:ST.seat[j%2]);
 strich(g,r0+.03,a0,a1,h,ox,oy,art==='loge'?ST.gold:ST.edge);
 if(art==='loge'){if(j===0)flaeche(g,r0+.12,r1,a-dA*.28,a+dA*.28,h,ox,oy,ST.rot);for(let i=0;i<5;i++){const q=Q(r0+.5,a0+(a1-a0)*(i+.5)/5,h);px(g,q.x,q.y,1,1,'#4a3020');}}// polierte Bretter, roter Läufer zum Sessel
 if(art==='sitz'||art==='adel'){flaeche(g,rSitz(k)-.07,rSitz(k)+.13,a0+.01,a1-.01,h,ox,oy,art==='adel'?'#8a6f4a':ST.bank);strich(g,rSitz(k)+.15,a0,a1,h,ox,oy,ST.bankD);
  if(art==='adel'){const q=Q(rSitz(k)+.03,a,h);px(g,q.x-4,q.y-2,8,3,ST.kissen[j%3]);px(g,q.x-4,q.y-2,8,1,'#e8c86a');strich(g,r0+.08,a0,a1,h,ox,oy,ST.gold);}}
 if(art==='treppe')for(const u of [.25,.5,.75])strich(g,r0+u*(r1-r0)*(k===2?.6:1),a-dA*.3,a+dA*.3,h,ox,oy,ST.riser);
 if(art==='morsch'){const q=Q(rSitz(k),a,h);px(g,q.x-4,q.y-2,9,3,'#1a120c');px(g,q.x-5,q.y-3,2,1,ST.bank);px(g,q.x+4,q.y+1,2,1,ST.bank);px(g,q.x+1,q.y-4,1,2,'#c9483e');}// durchgebrochen
 if(art==='loge'&&k===0&&j===0){}// Sessel steht im Keil dahinter
 if(art==='loge'&&k===1&&j===0){const q=Q(rIn(1)+.3,a,h);px(g,q.x-7,q.y-21,14,21,'#3a0c08');px(g,q.x-6,q.y-20,12,18,ST.rot);px(g,q.x-7,q.y-23,14,3,ST.gold);px(g,q.x-8,q.y-25,2,4,ST.gold);px(g,q.x+6,q.y-25,2,4,ST.gold);
  px(g,q.x-2,q.y-17,4,4,'#e8dcc0');px(g,q.x-1,q.y-16,1,1,'#1a0e06');px(g,q.x+1,q.y-16,1,1,'#1a0e06');px(g,q.x-1,q.y-13,3,1,'#e8dcc0');px(g,q.x-8,q.y-3,16,3,ST.gold);}// Sessel des Lanista, Totenkopf in der Lehne
 if(k===2){// Umgang mit Geländer, Luken an Ein- und Ausgang, Geier
  flaeche(g,RP-.35,R_AUS,a0,a1,h,ox,oy,'#6f5a3c');strich(g,RP,a0,a1,h,ox,oy,'#5a4630');
  if(j===slot(2,EIN_A)||j===slot(2,AUS_A)){flaeche(g,RP-.15,RP+.2,a-dA*.28,a+dA*.28,h,ox,oy,'#120d0a');strich(g,RP+.02,a-dA*.2,a+dA*.2,h,ox,oy,'#7a5a39');}
  strich(g,R_AUS-.03,a0,a1,h+5,ox,oy,'#4a3826');const q0=Q(R_AUS-.03,a0+.008,h),q1=Q(R_AUS-.03,a0+.008,h+6);g.strokeStyle='#3a2a1c';g.lineWidth=1;g.beginPath();g.moveTo(q0.x,q0.y);g.lineTo(q1.x,q1.y);g.stroke();
  if(j===slot(2,GEIER_A)){const q=Q(R_AUS-.03,a,h+6);px(g,q.x-2,q.y-6,5,5,'#2a221c');px(g,q.x-3,q.y-4,1,3,'#2a221c');px(g,q.x+3,q.y-4,1,3,'#2a221c');px(g,q.x-1,q.y-9,3,3,'#c9a090');px(g,q.x-2,q.y-8,1,1,'#e8c86a');px(g,q.x,q.y-1,1,2,'#c9a020');px(g,q.x+2,q.y-1,1,2,'#c9a020');}}
 hart(c,g);
 const K={k,j,a,art,c,x:ox,y:oy,key:KEY[k][j],x0:ox,x1:ox+c.width,y0:oy,y1:oy+c.height};K.item={y:K.key,draw:ctx=>ctx.drawImage(c,ox,oy)};return K;}
for(let k=0;k<3;k++)for(let j=0;j<NSL[k];j++)KEILE.push(keil(k,j));

// Sand (liegt flach, wird mit dem Boden gezeichnet): Spuren vom Harken, Blutflecken, Schleifspuren, eine verlorene Sandale
const SAND=(()=>{const rx=RS*45.26+4,ry=RS*22.63+4,ox=Math.floor(C0.x-rx),oy=Math.floor(C0.y-Z0-ry),[c,g]=mk(rx*2,ry*2),cx=C0.x-ox,cy=C0.y-Z0-oy,R=RS+.12;
 g.beginPath();for(let i=0;i<=48;i++){const p=P(R,i/48*TAU);i?g.lineTo(p.x-ox,p.y-oy):g.moveTo(p.x-ox,p.y-oy);}g.closePath();g.fillStyle=ST.sand;g.fill();g.save();g.clip();
 let s=7;const z=()=>{s=(s*16807)%2147483647;return s/2147483647;};
 for(let i=0;i<900;i++){const x=z()*c.width,y=z()*c.height;px(g,x,y,i%5===0?3:1,1,i%3?ST.hell:ST.dunkel);}
 g.strokeStyle='rgba(212,186,138,.55)';for(const f of [.32,.62,.86]){g.beginPath();g.ellipse(cx,cy,rx*f,ry*f,0,0,TAU);g.setLineDash([6,4]);g.stroke();}g.setLineDash([]);
 for(const [u,v,w] of [[.18,.1,9],[-.3,.22,6],[.36,-.28,7],[-.12,-.35,5],[.05,.4,4]]){const x=cx+u*rx*1.4,y=cy+v*ry*1.4;g.fillStyle=ST.blut;g.beginPath();g.ellipse(x,y,w*1.4,w*.6,0,0,TAU);g.fill();g.fillStyle=ST.blut2;g.beginPath();g.ellipse(x-w*.3,y-1,w*.6,w*.25,0,0,TAU);g.fill();}
 g.strokeStyle='rgba(110,36,24,.7)';g.lineWidth=2;g.beginPath();g.moveTo(cx+.18*rx*1.4,cy+.1*ry*1.4);g.quadraticCurveTo(cx+.3*rx,cy+.32*ry,cx+.55*rx,cy+.42*ry);g.stroke();// Schleifspur zum Tor? Nein, zum Ausgang. Ordnung muss sein.
 px(g,cx-.42*rx,cy+.08*ry,5,2,'#5a3a20');px(g,cx-.42*rx+1,cy+.08*ry-1,2,1,'#7a5030');// Sandale
 px(g,cx+.1*rx,cy-.12*ry,2,1,'#efe6d2');px(g,cx+.1*rx+3,cy-.12*ry+1,1,1,'#efe6d2');// Zähne
 g.restore();hart(c,g);return {c,x:ox,y:oy,x1:ox+c.width,y1:oy+c.height};})();

// Loge: Baldachin über dem Sessel; Adel: Sonnensegel auf Pfosten hinter der zweiten Reihe (über den Köpfen der Reihe dahinter)
function ueber(art){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;const pts=[];const add=(r,a,z)=>{const p=P(r,a,z);pts.push(p);x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);return p;};
 if(art==='baldachin'){const d=TAU/NSL[0]*1.05,zr=HL+30;for(const r of [5.05,6.2])for(const s of [-1,1]){add(r,LOGE+s*d,HL);add(r,LOGE+s*d,zr+4);}}
 else{const s=art==='segelL'?-1:1,a0=LOGE+s*TAU/NSL[1]*1.5,a1=LOGE+s*TAU/NSL[1]*4.5,zr=HOCH[1]+34;for(let i=0;i<=8;i++){add(6.55,a0+(a1-a0)*i/8,zr+6);add(6.55,a0+(a1-a0)*i/8,HOCH[1]);}}
 const ox=Math.floor(x0)-3,oy=Math.floor(y0)-3,[c,g]=mk(x1-ox+4,y1-oy+4),Q=(r,a,z)=>{const p=P(r,a,z);return {x:p.x-ox,y:p.y-oy};};
 if(art==='baldachin'){const d=TAU/NSL[0]*1.05,zr=HL+30;
  for(const r of [6.2,5.05])for(const s of [-1,1]){const q0=Q(r,LOGE+s*d,HL),q1=Q(r,LOGE+s*d,zr);px(g,q0.x,q1.y,2,q0.y-q1.y,'#c9a040');}
  g.beginPath();const ec=[Q(5.05,LOGE-d,zr),Q(5.05,LOGE+d,zr),Q(6.2,LOGE+d,zr),Q(6.2,LOGE-d,zr)];g.moveTo(ec[0].x,ec[0].y-3);for(const e of ec)g.lineTo(e.x,e.y-3);g.closePath();g.fillStyle='#6a1410';g.fill();
  g.beginPath();g.moveTo(ec[0].x,ec[0].y);g.lineTo(ec[1].x,ec[1].y);g.lineTo(ec[1].x,ec[1].y-3);g.lineTo(ec[0].x,ec[0].y-3);g.closePath();g.fillStyle=ST.rot;g.fill();
  for(let i=0;i<=10;i++){const x=ec[0].x+(ec[1].x-ec[0].x)*i/10,y=ec[0].y+(ec[1].y-ec[0].y)*i/10;px(g,x,y,1,i%2?2:3,ST.gold);}
  const m=Q(5.6,LOGE,zr+2);px(g,m.x-2,m.y-5,4,4,'#e8dcc0');px(g,m.x-1,m.y-4,1,1,'#1a0e06');px(g,m.x+1,m.y-4,1,1,'#1a0e06');px(g,m.x-1,m.y-1,3,1,ST.gold);}// Totenkopf mit Goldkrone obenauf
 else{const s=art==='segelL'?-1:1,a0=LOGE+s*TAU/NSL[1]*1.5,a1=LOGE+s*TAU/NSL[1]*4.5,zr=HOCH[1]+34;
  for(const a of [a0,(a0+a1)/2,a1]){const q0=Q(6.55,a,HOCH[1]),q1=Q(6.55,a,zr+5);px(g,q0.x,q1.y,1,q0.y-q1.y,'#6b4a2c');}
  for(let i=0;i<12;i++){const u0=a0+(a1-a0)*i/12,u1=a0+(a1-a0)*(i+1)/12;wand(g,6.55,u0,u1,zr,zr+5,ox,oy,i%2?'#e8dcc0':'#a32f2a');}
  strich(g,6.55,a0,a1,zr,ox,oy,'#5a1410');for(let i=0;i<=12;i++){const q=Q(6.55,a0+(a1-a0)*i/12,zr);px(g,q.x,q.y,1,2,i%2?'#a32f2a':'#e8dcc0');}}
 hart(c,g);const key=art==='baldachin'?KEY[0][0]+.003:Math.max(...[2,3,4].map(d=>KEY[0][(((art==='segelL'?-d:d)%NSL[0])+NSL[0])%NSL[0]]))+.003;
 return {c,x:ox,y:oy,key,x0:ox,x1:ox+c.width,y0:oy,y1:oy+c.height,item:{y:key,draw:ctx=>ctx.drawImage(c,ox,oy)}};}
const OBEN=['baldachin','segelL','segelR'].map(ueber);

// Weit herausgezoomt: alles in einem Bild (erst beim ersten Bedarf)
let GESAMT=null;function gesamt(){if(GESAMT)return GESAMT;const all=[...KEILE,...OBEN];let x0=SAND.x,y0=SAND.y,x1=SAND.x1,y1=SAND.y1;for(const k of all){x0=Math.min(x0,k.x0);y0=Math.min(y0,k.y0);x1=Math.max(x1,k.x1);y1=Math.max(y1,k.y1);}
 const [c,g]=mk(x1-x0,y1-y0);g.drawImage(SAND.c,SAND.x-x0,SAND.y-y0);for(const k of all.slice().sort((p,q)=>p.key-q.key))g.drawImage(k.c,k.x-x0,k.y-y0);const key=gy(R_AUS,LOGE);
 return GESAMT={c,x:x0,y:y0,x1,y1,item:{y:key,draw:ctx=>ctx.drawImage(c,x0,y0)}};}

// ---------- Warteschlange (Zickzack mit Seilen) und Wege ----------
const QP=[[61.5,20.6],[61.5,28.5],[62.5,28.5],[62.5,22.5],[63.5,22.5],[63.5,29.5],[61.5,29.5],[61.5,37.5]].map(([x,y])=>[x+O,y+O]);
const QL=[0];for(let i=1;i<QP.length;i++)QL.push(QL[i-1]+Math.hypot(QP[i][0]-QP[i-1][0],QP[i][1]-QP[i-1][1]));const QLEN=QL[QL.length-1],QA=.42;
function qpunkt(d){d=Math.max(0,Math.min(QLEN,d));let i=1;while(i<QL.length-1&&QL[i]<d)i++;const u=(d-QL[i-1])/((QL[i]-QL[i-1])||1),a=QP[i-1],b=QP[i];return W.iso(a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u);}
const SEILE=[];{const seil=(x0,y0,x1,y1)=>{const n=Math.max(1,Math.round(Math.hypot(x1-x0,y1-y0)));for(let i=0;i<n;i++)SEILE.push([x0+(x1-x0)*i/n+O,y0+(y1-y0)*i/n+O,x0+(x1-x0)*(i+1)/n+O,y0+(y1-y0)*(i+1)/n+O]);};
 seil(61,20.4,61,30);seil(62,20.4,62,28);seil(63,23,63,29);seil(64,22,64,30);seil(62,22,64,22);seil(61,29,63,29);seil(62,30,64,30);}
const SEIL_ITEMS=SEILE.map(([x0,y0,x1,y1])=>{const a=W.iso(x0,y0),b=W.iso(x1,y1),za=W.hz?W.hz(x0,y0):0,zb=W.hz?W.hz(x1,y1):0,ay=a.y-za,by=b.y-zb;
 return {y:Math.max(a.y,b.y)+.01,x0:Math.min(a.x,b.x)-3,x1:Math.max(a.x,b.x)+3,y0:Math.min(ay,by)-10,y1:Math.max(ay,by)+2,draw(ctx){
  const n=Math.max(4,Math.ceil(Math.abs(b.x-a.x)));for(let i=0;i<=n;i++){const u=i/n,s=Math.round(Math.sin(u*Math.PI)*1.5),x=Math.round(a.x+(b.x-a.x)*u),y=Math.round(ay+(by-ay)*u-6+s);ctx.fillStyle='#b0482c';ctx.fillRect(x,y,1,1);ctx.fillStyle='#5a1e12';ctx.fillRect(x,y+1,1,1);}
  for(const [x,y] of [[a.x,ay],[b.x,by]]){ctx.fillStyle='#3a2a1c';ctx.fillRect(Math.round(x)-1,Math.round(y)-8,2,8);ctx.fillStyle='#c9a040';ctx.fillRect(Math.round(x)-1,Math.round(y)-9,2,1);}}};});
const T_EIN=kachel(8.35,EIN_A),T_AUS_IN=kachel(8.35,AUS_A),T_AUS=kachel(9.25,AUS_A),T_TREPPE=kachel(9.3,LOGE);
const ZIEL_Q={tx:QP[QP.length-1][0],ty:QP[QP.length-1][1]},ZIEL_SCHAU={tx:61.5+O,ty:33.5+O};

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
const SCHILDER=[schildItem(60.2+O,32.2+O,()=>[t('arena.name')+' · '+t('arena.plaetze',{n:SITZE.length+1}),schildText()]),
 schildItem(60.4+O,20.8+O,()=>[t('arena.eingang'),t('arena.eingangZeile')]),
 Object.assign(schildItem(69.6+O,17.2+O,()=>[t('arena.ausgang'),t('arena.ausgangZeile')]),{extra(ctx,x,y){ctx.fillStyle='#4a3826';ctx.fillRect(x+10,y-7,7,7);ctx.fillStyle='#6a5438';ctx.fillRect(x+10,y-8,7,1);ctx.fillStyle='#7a5a20';ctx.fillRect(x+11,y-7,5,2);}})];// Eimer

// ---------- Termin und Ablauf ----------
const AR={termin:null,id:0,quote:.75,aus:false,schlange:[],drin:new Set(),einT:0,blasen:[],blT:2};
const EIN_DT=1.1,KACHEL=Math.hypot(32,16);// KACHEL: Bildpunkte je Feld entlang eines Weges (Tempo der Besucher ist in Bildpunkten)// Sekunden Spielzeit zwischen zwei Gästen am Einlass
const jetzt=()=>{const h=M.weltTag?.stunde;if(h==null)return null;return (S.day||1)*24+((h-6+24)%24);};
function phase(){if(AR.termin==null)return 'zu';const n=jetzt();if(n==null)return 'zu';if(n<AR.termin)return 'einlass';if(n<AR.termin+1)return 'laeuft';return 'aus';}
function einlass(){const ph=phase();return ph==='einlass'||ph==='laeuft';}// Einlass bis zum Ende der Wartestunde
function termin(stunden=4){if(phase()!=='zu')return false;const n=jetzt();if(n==null)return false;AR.termin=n+stunden;AR.id++;AR.quote=rnd(.6,.9);AR.aus=false;
 try{M.ui?.notify?.(t('arena.termin',{zeit:zeitText(((AR.termin%24)+6)%24)}));}catch(e){}M.weltBesucher?.aufruf?.();return true;}
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
function setzeInnen(v){const r=v.ar,h=r.r>R_AUS-.4?HOCH[2]:HOCH[rangBei(r.r)],p=P(r.r,r.a,h),ex=p.x-v.dx;if(Math.abs(ex)>.3)v.dir=ex<0?1:0;v.dist+=Math.hypot(ex,p.y-v.dy);v.dx=p.x;v.dy=p.y;v.x=p.x;v.y=keyAt(r.r,r.a);v.f=W.gehBild(v.dist);v.oz=0;}
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
 if(!(dt>0))return;const ph=phase();
 if(ph==='aus'&&!AR.aus){AR.aus=true;for(const v of AR.drin)if(v.ar?.modus==='sitzt')v.ar.warte=rnd(0,30);}
 schlange(dt);for(const v of AR.drin){try{innen(v,dt);}catch(e){console.warn(e);AR.drin.delete(v);abweisen(v,null);}}murren(dt);
 if(AR.aus&&!AR.schlange.length&&!AR.drin.size){AR.termin=null;AR.aus=false;}};

// ---------- NPCs: Einlasser und Rechenknecht (welt-npc.js zeichnet und zeigt sie beim Antippen) ----------
const leer={weapon:null,secondary:null,shield:null,armor:{}};
function figur(id,name,h,w){const rng=S.rng,g=M.makeGladiator(0);S.rng=rng;Object.assign(g,{id,name,height:h,weight:w,fame:0,scars:[]});g.equipment={...leer,armor:{}};g.enemyGear={...leer,armor:{}};return g;}
const forge=(c,g,x,y,tt,extra)=>{try{M.renderForgeActors(c,[{team:0,a:0,phase:tt*2,state:'idle',energy:100,ammo:0,moveSpeed:0,bloodMarks:{},noNav:true,forgePose:'',id:g.id,g,x,y,...extra}]);}catch(e){}};
const EINL={id:'einlasser',name:()=>t('arena.einlasser'),rolle:()=>t('arena.einlasserRolle'),ort:null,
 platz(){return {x:62.45+O,y:20.95+O,innen:false};},
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
const g0=H.ground;H.ground=(ctx,view)=>{g0?.(ctx,view);if(W.mini||!sicht({x0:SAND.x,x1:SAND.x1,y0:SAND.y,y1:SAND.y1},view))return;ctx.drawImage(SAND.c,SAND.x,SAND.y);};
const items0=H.items;H.items=(items,view)=>{items0?.(items,view);
 if(W.mini){const G=gesamt();if(sicht({x0:G.x,x1:G.x1,y0:G.y,y1:G.y1},view))items.push(G.item);return;}
 for(const k of KEILE)if(sicht(k,view))items.push(k.item);for(const o of OBEN)if(sicht(o,view))items.push(o.item);
 for(const s of SEIL_ITEMS)if(sicht(s,view))items.push(s);for(const s of SCHILDER)if(sicht(s,view))items.push(s);};
const world0=H.world;H.world=(ctx,view,dt)=>{world0?.(ctx,view,dt);if(!AR.blasen.length||W.mini)return;const z=Math.min(3,Math.max(.4,.8/W.cam.s));ctx.font=font(10*z);ctx.textAlign='center';ctx.textBaseline='middle';
 for(const b of AR.blasen){const v=b.v;if(v.unsichtbar)continue;const x=v.dx,y=v.dy-(v.sitzt?14:W.HOEHE)-8*z-(v.oz||0);if(x<view.x0-200||x>view.x1+200||y<view.y0-30||y>view.y1+30)continue;const w=ctx.measureText(b.text).width+8*z;
  ctx.globalAlpha=Math.min(1,b.t*2);ctx.fillStyle='rgba(18,12,9,.86)';ctx.fillRect(Math.round(x-w/2),Math.round(y-7*z),Math.round(w),Math.round(14*z));ctx.fillStyle='#f0e2c0';ctx.fillText(b.text,Math.round(x),Math.round(y)+1);}ctx.globalAlpha=1;};

// ---------- Testknopf (bis B2, VOR VERÖFFENTLICHUNG ENTFERNEN) ----------
const bar=document.querySelector('#weltUi .w-bar');
if(bar){const b=document.createElement('button');b.id='wProbekampf';b.className='w-btn';
 const txt=()=>{b.replaceChildren(...(window.AT2_IKON?[AT2_IKON.element('sanduhr'),' ']:[]),t('arena.test'));b.title=t('arena.testTitel');};txt();L?.beiWechsel(txt);
 b.onclick=()=>{if(!termin(8))try{M.ui?.notify?.(t('arena.schonTermin'));}catch(e){}};bar.appendChild(b);}

M.weltArena={termin,phase,einlass,anstellen,vergiss,
 get id(){return AR.id;},get quote(){return AR.quote;},get terminStunde(){return AR.termin;},
 ziel:()=>({...ZIEL_Q}),schauZiel:()=>({...ZIEL_SCHAU}),
 lanistaSoll:()=>{const ph=phase();return ph==='einlass'||ph==='laeuft';},lanistaEile:()=>phase()==='laeuft',lanistaPlatz:()=>({...LOGE_SITZ}),treppe:()=>({...T_TREPPE}),
 sitze:()=>SITZE,freie:()=>({n:frei.n.length,a:frei.a.length}),schlange:()=>AR.schlange,drin:()=>AR.drin,blasen:()=>AR.blasen,
 keile:()=>KEILE,arten:()=>ART,mitte:{tx:CX,ty:CY},R_AUS,jetzt,sand:SAND};
})();
