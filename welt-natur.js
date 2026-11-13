'use strict';
// =====================================================================================================================
// NATUR (welt-natur.js) · Biome und Naturobjekte der Rasterkarte. Wunsch Thomas 12.11.2026: Karte fünfmal so groß mit
// Wald, Wüste, Dschungel und Sumpf. Nur auf den Rasterkarten-Seiten geladen (vor welt-raster.js, über WELT_VOR).
//
// · Jedes Objekt ist eine eigene Art (ARTEN) wie ein Bauteil: Name, Biom, Bild, Fußpunkt. Die Karte legt je Feld höchstens
//   ein Objekt ab (welt-raster.js, obj[]); entfernen = obj auf 0 setzen. Bauen von Objekten gibt es noch nicht, die Arten
//   sind aber schon so angelegt (Name, Biom, flach/stehend), dass ein Baumenü sie später nur noch anbieten muss.
// · Bilder werden einmal je Art und Variante gemalt (3 Varianten, je gespiegelt = 6), erst wenn sie gebraucht werden.
//   Licht kommt von links oben wie bei den Gebäuden. „flach“ = liegt am Boden und wird mit in den Boden gemalt.
// · waehle(biom, boden, tx, ty, dichte) entscheidet, was auf einem Feld wächst oder liegt.
// =====================================================================================================================
(()=>{
const TAU=Math.PI*2;
function hash(n){n=Math.imul(n^0x9e3779b9,0x85ebca6b);n^=n>>>13;n=Math.imul(n,0xc2b2ae35);n^=n>>>16;return (n>>>0)/4294967296;}
const h2=(x,y,s=0)=>hash(x*374761393+y*668265263+s*1442695);
const BIOM={KERN:0,WALD:1,WUESTE:2,DSCHUNGEL:3,SUMPF:4,GEBIRGE:5},BIOM_NAME=['Wiese','Wald','Wüste','Dschungel','Sumpf','Gebirge'];// GEBIRGE: T3

// ---------- Pixelwerkzeuge ----------
function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.imageSmoothingEnabled=false;return [c,g];}
const P=(g,x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),w,h);};
// Kugel aus Laub/Stein: Licht von links oben, ausgefranster Rand, Körnung
function kugel(g,cx,cy,rx,ry,cols,seed,frans=.62){for(let y=-ry;y<=ry;y++)for(let x=-rx;x<=rx;x++){const nx=x/rx,ny=y/ry,d=nx*nx+ny*ny;if(d>1)continue;if(d>.7&&h2(cx*3+x,cy*5+y,seed)>frans)continue;
 const l=-nx*.5-ny*.62+Math.sqrt(1-d)*.6+(h2(cx+x*7,cy+y*3,seed+1)-.5)*.55;g.fillStyle=cols[l<-.05?0:l<.38?1:l<.74?2:3];g.fillRect(Math.round(cx+x),Math.round(cy+y),1,1);}}
function stamm(g,x,y0,y1,w,cols,seed){for(let y=Math.round(y0);y<y1;y++)for(let i=0;i<w;i++){const c=i<w*.32?cols[2]:i>=w*.7?cols[0]:cols[1];g.fillStyle=h2(i,y>>1,seed)>.86?cols[0]:c;g.fillRect(Math.round(x)+i,y,1,1);}}
function schatten(g,cx,cy,rx,ry){g.fillStyle='rgba(12,18,8,.32)';g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,TAU);g.fill();}
function linie(g,x0,y0,x1,y1,col,w=1){const n=Math.max(1,Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));g.fillStyle=col;for(let i=0;i<=n;i++)g.fillRect(Math.round(x0+(x1-x0)*i/n),Math.round(y0+(y1-y0)*i/n),w,w);}
// Wedel (Farn, Palme): Mittelrippe mit Fiedern, hängt zum Ende hin durch
function wedel(g,x,y,a,L,droop,cols,seed,fieder=3){let px=x,py=y;for(let i=0;i<=L;i++){const t=i/L,nx=x+Math.cos(a)*i,ny=y+Math.sin(a)*i*.55+t*t*droop;P(g,nx,ny,1,1,cols[1]);
  if(i>2&&i%2===0){const f=Math.max(1,Math.round(fieder*(1-t*.6)));for(let k=1;k<=f;k++){P(g,nx-Math.sin(a)*k*.6,ny+k*.7,1,1,cols[h2(i,k,seed)>.5?2:1]);P(g,nx+Math.sin(a)*k*.6,ny-k*.5+1,1,1,cols[h2(k,i,seed)>.5?0:1]);}}px=nx;py=ny;}return [px,py];}

// ---------- Farben ----------
const LAUB=['#24421f','#355f2c','#4f7f39','#73a24b'],NADEL=['#18321f','#244a30','#33623e','#4f7e52'],BIRKE=['#3f6c2a','#5d8e37','#80b04e','#a9d070'],
 DSCH=['#0f2e18','#1a4624','#2a6430','#468c3c'],PALM=['#28501f','#43762a','#629a36','#8cc04a'],WEIDE=['#34522a','#4d7034','#698e44','#8fb25e'],
 TROCKEN=['#5e4f2c','#7e6c3a','#a08c4c','#c4b068'],KAKTUS=['#264e2c','#376a3a','#4f8848','#74a85c'],STEIN=['#56514a','#746d64','#938b7e','#b4ab9c'],
 SANDST=['#83603c','#a27850','#bf9262','#d8ae7a'],RINDE=['#33231a','#523a25','#6e5133'],GRAU=['#3e3a34','#5e584e','#837a6e'],BAMBUS=['#56722a','#78963a','#9cb84e'];

// ---------- Arten ----------
// w,h: Bildgröße; ax,ay: Fußpunkt im Bild (steht auf der Feldmitte); flach: liegt am Boden
const ARTEN=[null];
const art=(name,biom,w,h,ax,ay,mal,flach=false)=>{ARTEN.push({id:ARTEN.length,name,biom,w,h,ax,ay,mal,flach});};
// --- Wald ---
art('Eiche',BIOM.WALD,66,88,33,84,(g,s,S)=>{schatten(g,33,84,22,6);stamm(g,29,48,84,8,RINDE,s);P(g,26,80,4,3,RINDE[1]);P(g,36,80,4,3,RINDE[0]);linie(g,32,58,19,42,RINDE[1],2);linie(g,34,54,47,40,RINDE[0],2);
 for(const [x,y,rx,ry] of [[33,16,11,9],[22,24,12,9],[45,24,12,9],[16,38,12,10],[50,38,12,10],[33,32,19,16],[27,44,11,8],[40,44,11,8]])kugel(g,x+(S(x,1)-.5)*4,y+(S(y,2)-.5)*3,rx,ry,LAUB,s*13+x);
 if(s===2)for(let i=0;i<7;i++)P(g,14+S(i,3)*38,24+S(i,4)*24,2,2,'#c8a040');});// Variante mit ersten gelben Blättern
art('Tanne',BIOM.WALD,46,98,23,94,(g,s,S)=>{schatten(g,23,94,14,4);stamm(g,21,74,94,4,RINDE,s);const st=5+(s%2);
 for(let k=0;k<st;k++){const base=80-k*12,hw=20-k*3.2,hh=17;for(let r=0;r<hh;r++){let ww=Math.round(hw*(r+2)/(hh+2)+(S(k*20+r,5)-.5)*2.4);for(let x=-ww;x<=ww;x++){const c=r>hh-3?NADEL[0]:x<-ww*.35?NADEL[2]:x>ww*.4?NADEL[0]:NADEL[1];P(g,23+x,base-hh+r,1,1,S(x+k*9,r)>.93?NADEL[3]:c);}}}
 P(g,22,80-(st-1)*12-19,2,3,NADEL[2]);});
art('Birke',BIOM.WALD,42,88,21,84,(g,s,S)=>{schatten(g,21,84,12,4);const W=['#8e8a7e','#e2ded2','#faf7ee'];stamm(g,19,30,84,5,W,s);for(let y=34;y<82;y+=3+((S(y,6)*4)|0))P(g,19+S(y,7)*3,y,2+(S(y,8)>.5?1:0),1,'#26221e');
 linie(g,21,44,12,32,W[0]);linie(g,22,40,31,30,W[0]);for(const [x,y,rx,ry] of [[21,12,8,7],[13,20,7,6],[29,20,7,6],[21,26,10,9],[11,32,7,6],[31,32,7,6],[21,38,8,6]])kugel(g,x,y,rx,ry,BIRKE,s*7+y,.5);});
art('Busch',BIOM.KERN,32,26,16,23,(g,s,S)=>{schatten(g,16,23,12,3);for(const [x,y,r] of [[10,16,7],[22,16,7],[16,11,8]])kugel(g,x,y,r,r-1,LAUB,s*5+x);if(s===1)for(let i=0;i<7;i++)P(g,7+S(i,1)*18,7+S(i,2)*12,2,2,'#b8302a');if(s===2)for(let i=0;i<6;i++)P(g,7+S(i,3)*18,7+S(i,4)*12,1,1,'#f4f0e0');});
art('Farn',BIOM.WALD,32,20,16,17,(g,s)=>{for(let i=0;i<7;i++)wedel(g,16,17,-Math.PI+.35+i*.4+(h2(i,s,3)-.5)*.2,10+h2(i,s,4)*4,6,['#2a4a22','#447a30','#6a9e44'],s+i,2);});
art('Pilze',BIOM.WALD,22,14,11,10,(g,s,S)=>{for(const [x,y,r] of [[6,9,3],[13,10,4],[17,7,2]].slice(0,2+s%2)){P(g,x-1,y-2,2,3,'#ece4d0');P(g,x-r,y-3-Math.ceil(r/2),r*2,Math.ceil(r/2)+1,'#b8302a');P(g,x-r+1,y-4-Math.ceil(r/2),r*2-2,1,'#d84a3a');P(g,x-1,y-3-Math.ceil(r/2),1,1,'#f4f0e0');P(g,x+1,y-2-Math.ceil(r/2),1,1,'#f4f0e0');}},true);
art('Baumstumpf',BIOM.WALD,28,22,14,18,(g,s)=>{schatten(g,14,18,11,3);stamm(g,7,9,17,14,RINDE,s);P(g,4,16,4,2,RINDE[1]);P(g,20,16,4,2,RINDE[0]);g.fillStyle='#c49a64';g.beginPath();g.ellipse(14,9,7,3,0,0,TAU);g.fill();g.strokeStyle='#8e6840';g.lineWidth=1;g.beginPath();g.ellipse(14,9,4,1.6,0,0,TAU);g.stroke();if(s>0)P(g,9,6,3,2,'#4f7f39');});
art('Moosfels',BIOM.WALD,38,26,19,21,(g,s,S)=>{schatten(g,19,21,15,4);kugel(g,19,15,14,8,STEIN,s*3,.8);for(let y=7;y<15;y++)for(let x=7;x<32;x++)if(S(x,y)>.45&&(x-19)*(x-19)/196+(y-15)*(y-15)/64<.9&&y<12+S(x,9)*3)P(g,x,y,1,1,S(y,x)>.5?'#4f7f39':'#355f2c');});
art('Totholz',BIOM.WALD,52,26,26,18,(g,s)=>{schatten(g,26,19,20,4);for(let i=0;i<=32;i++){const x=9+i,y=10+i*.45;for(let r=-3;r<=3;r++)P(g,x,y+r,1,1,r<-1?RINDE[2]:r>1?RINDE[0]:RINDE[1]);}g.fillStyle='#b48a58';g.beginPath();g.ellipse(41,24.5,2.4,3.4,0,0,TAU);g.fill();for(let i=0;i<6;i++)P(g,12+h2(i,s,7)*26,8+h2(i,s,8)*10,2,1,'#4f7f39');linie(g,22,13,18,4,RINDE[1]);});
// --- Wüste ---
art('Saguaro',BIOM.WUESTE,32,54,16,50,(g,s,S)=>{schatten(g,16,50,8,2);const col=(x0,y0,y1,w)=>{for(let y=y0;y<y1;y++){const sh=y<y0+3?y0+3-y:0;for(let i=sh;i<w-sh;i++)P(g,x0+i,y,1,1,i===sh?KAKTUS[1]:i===w-sh-1?KAKTUS[0]:i%3===0?KAKTUS[0]:i<w/2?KAKTUS[2]:KAKTUS[1]);}};
 col(12,8,50,9);if(s!==1){col(4,18,28,6);P(g,4,27,9,5,KAKTUS[1]);P(g,5,28,8,3,KAKTUS[2]);}if(s!==2){col(22,12,26,6);P(g,19,25,9,5,KAKTUS[1]);P(g,19,26,8,3,KAKTUS[0]);}if(s===0){P(g,14,6,2,2,'#e070a0');P(g,17,7,2,2,'#f0a0c0');}for(let i=0;i<12;i++)P(g,12+S(i,1)*9,10+S(i,2)*38,1,1,'#e8e0b8');});
art('Feigenkaktus',BIOM.WUESTE,32,28,16,25,(g,s,S)=>{schatten(g,16,25,11,3);for(const [x,y,rx,ry] of [[16,19,6,7],[9,13,5,6],[23,12,5,6],[16,6,4,5]].slice(0,3+(s>0?1:0)))kugel(g,x,y,rx,ry,KAKTUS,s+x,.9);for(let i=0;i<14;i++)P(g,5+S(i,1)*22,3+S(i,2)*20,1,1,'#ece4b8');for(let i=0;i<3+s;i++)P(g,6+S(i,3)*20,2+S(i,4)*6,2,2,'#c0406a');});
art('Dattelpalme',BIOM.WUESTE,62,90,31,86,(g,s,S)=>{schatten(g,31,86,16,4);const bend=(s-1)*7,tx=y=>31+bend*Math.pow((86-y)/56,2);for(let y=86;y>30;y--){const x=tx(y);for(let i=-2;i<=2;i++)P(g,x+i,y,1,1,(86-y)%4===0?'#4a3a24':i<0?'#9a7c52':i>0?'#5e4a30':'#7a6040');}
 const cx=tx(30),cy=30;for(let i=0;i<9;i++){const a=i/9*TAU+s*.3;wedel(g,cx,cy,a,17+S(i,5)*7,10+S(i,6)*6,PALM,s*9+i,3);}for(let i=0;i<9;i++)P(g,cx-4+S(i,7)*8,cy+2+S(i,8)*6,2,2,i%2?'#a8582a':'#c87a3a');});
art('Dürrbusch',BIOM.WUESTE,28,20,14,17,(g,s,S)=>{schatten(g,14,17,10,2);for(let i=0;i<26;i++){const a=S(i,1)*TAU,r=3+S(i,2)*8;linie(g,14,12,14+Math.cos(a)*r,12+Math.sin(a)*r*.6,TROCKEN[(S(i,3)*4)|0]);}});
art('Sandsteinfels',BIOM.WUESTE,48,38,24,32,(g,s,S)=>{schatten(g,24,32,20,5);for(let y=4;y<32;y++){const t=(y-20)/16,hw=Math.round((19+S(y>>2,1)*4)*Math.sqrt(Math.max(0,1-t*t*(t<0?1.6:.4)))/2)*2;for(let x=-hw;x<=hw;x++){const band=((y+((S(x+24>>3,2)*3)|0))>>2)%3,top=y<6+Math.abs(x)*.2+S(x,3)*2;
  P(g,24+x,y,1,1,top?SANDST[3]:x<-hw*.3?SANDST[band===1?3:2]:x>hw*.45?SANDST[0]:SANDST[band===0?1:2]);}}linie(g,20,12,23,24,SANDST[0]);if(s===2)linie(g,30,8,28,18,SANDST[0]);});
art('Gerippe',BIOM.WUESTE,36,18,18,11,(g,s)=>{const K='#ece6d4',D='#c8c0aa';g.fillStyle=K;g.beginPath();g.ellipse(7,8,3.4,3,0,0,TAU);g.fill();P(g,5,7,1,2,'#20140c');P(g,8,7,1,2,'#20140c');P(g,6,10,3,1,D);linie(g,10,9,26,12,K);for(let i=0;i<4;i++){const x=13+i*3;linie(g,x,7+i*.6,x+1,14+i*.6,D);}
 linie(g,26,12,30,8,K);linie(g,26,12,32,14,K);linie(g,14,10,11,15,D);if(s>0){linie(g,17,4,31,2,'#8a6a52',1);P(g,15,3,3,3,'#6a4a30');}},true);// Gerippe eines Reisenden, mal mit rostigem Schwert
art('Säulenstumpf',BIOM.WUESTE,26,48,13,44,(g,s,S)=>{schatten(g,13,44,10,3);P(g,3,39,20,5,'#cfc6b4');P(g,3,39,20,1,'#e8e2d2');const top=14+s*4;for(let y=top;y<39;y++)for(let x=5;x<21;x++){const f=(x-5)%3;P(g,x,y,1,1,f===0?'#a8a090':x<11?'#ece6d8':x>16?'#b8b0a0':'#d6cebe');}
 for(let x=5;x<21;x++){const j=Math.round(S(x,4)*4);for(let y=top-3;y<top+j-1;y++)P(g,x,y,1,1,'#e2dccc');}for(let x=0;x<26;x++){const hh=Math.max(0,4-Math.abs(x-13)*.25);P(g,x,44-hh,1,hh,'#d8b880');}});
// --- Dschungel ---
art('Urwaldriese',BIOM.DSCHUNGEL,86,128,43,122,(g,s,S)=>{schatten(g,43,122,30,8);const R=['#2e2618','#4e4230','#6e5e44'];stamm(g,36,56,122,14,R,s);for(let y=100;y<122;y++){const f=(y-100)/22*10;P(g,36-f,y,f,1,R[2]);P(g,50,y,f,1,R[0]);}
 for(const [x,y,rx,ry] of [[43,14,15,10],[28,24,17,12],[60,24,17,12],[16,40,15,11],[70,40,15,11],[43,34,24,18],[34,50,14,9],[54,50,14,9]])kugel(g,x+(S(x,1)-.5)*4,y,rx,ry,DSCH,s*17+x);
 for(const x of [22,31,57,66])for(let y=46;y<86+S(x,2)*18;y++)P(g,x+Math.sin(y*.3+x)*1.2,y,1,1,y%5?'#2a6430':'#468c3c');for(let i=0;i<6;i++)P(g,18+S(i,3)*50,20+S(i,4)*30,2,2,'#e04a6a');});
art('Kokospalme',BIOM.DSCHUNGEL,60,88,20,84,(g,s,S)=>{schatten(g,22,84,12,3);const tx=y=>20+(14+s*4)*Math.pow((84-y)/56,1.6);for(let y=84;y>28;y--){const x=tx(y);for(let i=-2;i<=1;i++)P(g,x+i,y,1,1,(84-y)%5===0?'#5a4630':i<0?'#a08460':'#7a6448');}
 const cx=tx(28),cy=28;for(let i=0;i<10;i++){const a=i/10*TAU+s;wedel(g,cx,cy,a,19+S(i,5)*8,13+S(i,6)*6,PALM,s*11+i,3);}for(const [dx,dy] of [[-2,3],[2,3],[0,5]])kugel(g,cx+dx,cy+dy,2,2,['#3a2a18','#5a4228','#7a5a36','#8a6a44'],dx+s,.95);});
art('Bananenstaude',BIOM.DSCHUNGEL,42,48,21,44,(g,s,S)=>{schatten(g,21,44,10,3);stamm(g,18,24,44,5,['#4a5a2a','#6a7a36','#8a9a48'],s);
 for(let i=0;i<6;i++){const a=-Math.PI/2+(i-2.5)*.55+(S(i,1)-.5)*.2,L=14+S(i,2)*6;for(let t=0;t<=L;t++){const u=t/L,x=21+Math.cos(a)*t,y=24+Math.sin(a)*t*.8+u*u*10,w=Math.round(4*Math.sin(Math.PI*Math.min(1,u*1.2)));for(let k=-w;k<=w;k++)P(g,x-Math.sin(a)*k*.5,y+k*.5,1,1,k===0?'#4a7a2a':S(t,k+i)>.9?'#3a6a22':k<0?'#8cc050':'#6aa040');}}
 for(let i=0;i<5;i++)P(g,17+i*2,28+((i%2)?1:0),2,4,'#c8c040');});
art('Riesenfarn',BIOM.DSCHUNGEL,44,32,22,28,(g,s)=>{for(let i=0;i<9;i++)wedel(g,22,28,-Math.PI+.25+i*.33+(h2(i,s,3)-.5)*.2,15+h2(i,s,4)*6,9,['#1a4624','#2e6e34','#4c9440'],s+i,3);});
art('Bambus',BIOM.DSCHUNGEL,34,82,17,78,(g,s,S)=>{schatten(g,17,78,12,3);for(let i=0;i<7;i++){const x=5+i*3.6+S(i,1)*2,h=48+S(i,2)*26,lean=(S(i,3)-.5)*6;for(let y=78;y>78-h;y--){const xx=x+lean*(78-y)/h;P(g,xx,y,2,1,(78-y)%9===0?BAMBUS[0]:BAMBUS[i%2?1:2]);if((78-y)%9===0&&y<64){linie(g,xx+1,y,xx+5,y-3,'#4a8a34');linie(g,xx,y,xx-4,y-2,'#3a7a2a');}}}});
art('Blütenbusch',BIOM.DSCHUNGEL,32,26,16,23,(g,s,S)=>{schatten(g,16,23,12,3);for(const [x,y,r] of [[10,16,7],[22,16,7],[16,10,8]])kugel(g,x,y,r,r-1,DSCH,s*5+x);const F=[['#d83a3a','#f06a5a'],['#f0902a','#f8c050'],['#c84aa0','#e88ac8']][s];for(let i=0;i<12;i++){const x=6+S(i,1)*20,y=5+S(i,2)*14;P(g,x,y,2,2,F[0]);P(g,x,y,1,1,F[1]);}});
// --- Sumpf ---
art('Trauerweide',BIOM.SUMPF,70,88,35,84,(g,s,S)=>{schatten(g,35,84,24,6);stamm(g,31,44,84,9,['#2e2a20','#4a4434','#6a6048'],s);linie(g,35,52,24,40,'#4a4434',2);linie(g,36,50,47,38,'#2e2a20',2);
 for(const [x,y,rx,ry] of [[35,22,20,14],[20,30,12,10],[50,30,12,10]])kugel(g,x,y,rx,ry,WEIDE,s*9+x);for(let x=10;x<60;x+=2){const top=26-Math.sqrt(Math.max(0,1-((x-35)/26)**2))*12,len=26+S(x,5)*22;for(let y=top;y<top+len;y++)P(g,x+Math.sin(y*.2+x)*.6,y,1,1,WEIDE[(x+y)%3+(y>top+len-4?0:1)]);}});
art('Toter Baum',BIOM.SUMPF,52,82,26,78,(g,s,S)=>{schatten(g,26,78,12,3);stamm(g,23,40,78,6,GRAU,s);const ast=(x,y,a,L,d)=>{const x1=x+Math.cos(a)*L,y1=y+Math.sin(a)*L;linie(g,x,y,x1,y1,GRAU[d>2?1:2],d>2?2:1);if(d>0){ast(x1,y1,a-.45-S(d,x|0)*.3,L*.68,d-1);ast(x1,y1,a+.4+S(x|0,d)*.3,L*.66,d-1);}};
 ast(26,42,-Math.PI/2-.1,16,4);if(s===1){P(g,15,18,4,3,'#141414');P(g,18,17,2,2,'#141414');P(g,19,18,2,1,'#c8a040');}if(s===2){linie(g,36,24,36,40,'#8a7a5a');P(g,34,40,5,4,'#8a7a5a');}});// mal mit Krähe, mal mit leerer Schlinge
art('Mangrove',BIOM.SUMPF,60,74,30,68,(g,s,S)=>{schatten(g,30,68,22,5);for(let i=0;i<7;i++){const ex=8+i*7.5+S(i,1)*3,c=[30+(ex-30)*.35,50];for(let t=0;t<=1;t+=.04){const x=(1-t)*(1-t)*30+2*(1-t)*t*c[0]+t*t*ex,y=(1-t)*(1-t)*48+2*(1-t)*t*(44-S(i,2)*6)+t*t*(66+S(i,3)*3);P(g,x,y,2,1,t<.5?GRAU[2]:GRAU[1]);}}
 stamm(g,27,30,52,6,['#3a3226','#5a4e3a','#7a6a50'],s);for(const [x,y,rx,ry] of [[30,18,20,13],[15,26,12,9],[45,26,12,9]])kugel(g,x,y,rx,ry,['#16301c','#22442a','#325a36','#4c7848'],s*7+x);});
art('Schilf',BIOM.SUMPF,28,32,14,28,(g,s,S)=>{for(let i=0;i<11;i++){const x=3+i*2.2+S(i,1)*2,h=14+S(i,2)*12,c=(S(i,3)-.5)*5;for(let y=0;y<h;y++)P(g,x+c*(y/h)**2,28-y,1,1,i%2?'#5a7a34':'#7a9a44');if(S(i,4)>.55)P(g,x+c-.5,28-h-1,2,5,'#6a4428');}});
art('Seerosen',BIOM.SUMPF,30,16,15,9,(g,s,S)=>{for(const [x,y,r] of [[8,9,5],[19,7,6],[22,12,4]]){g.fillStyle='#3a6a30';g.beginPath();g.ellipse(x,y,r,r*.5,0,0,TAU);g.fill();g.fillStyle='#5a8a40';g.beginPath();g.ellipse(x-1,y-.5,r-1.5,r*.5-1,0,0,TAU);g.fill();P(g,x,y-1,r,1,'#2a4a24');}
 if(s<2){P(g,17,4,4,2,s?'#fff4f0':'#f0a0c0');P(g,18,3,2,1,s?'#fff':'#f8c8dc');P(g,18,5,2,1,'#f0d040');}},true);
art('Moorhand',BIOM.SUMPF,18,20,9,16,(g,s)=>{g.fillStyle='#2e2a1c';g.beginPath();g.ellipse(9,16,7,2.4,0,0,TAU);g.fill();const H='#9aa088',D='#7a8068';P(g,7,8,4,8,H);P(g,10,9,1,7,D);for(const [x,h] of [[6,4],[8,5],[10,5],[12,4]])P(g,x-(x>9?0:0),8-h,1,h,x<9?H:D);P(g,4,9,2,1,H);P(g,3,8,1,1,H);if(s===1)P(g,8,5,1,1,'#d8b040');});// ein Ring, den keiner mehr abholt
// --- Wiese ---
art('Blumen',BIOM.KERN,26,14,13,7,(g,s,S)=>{const F=['#f4f0e0','#f0d040','#a070d0','#e04a4a','#f0a0c0'];for(let i=0;i<9;i++){const x=2+S(i,1)*22,y=2+S(i,2)*10;P(g,x,y+1,1,2,'#3a6a2a');P(g,x,y,1,1,F[(S(i,3)*F.length)|0]);}},true);
art('Feldstein',BIOM.KERN,24,16,12,12,(g,s)=>{schatten(g,12,12,9,2.4);kugel(g,12,9,8,5,STEIN,s*3,.85);});
art('Grasbüschel',BIOM.KERN,18,12,9,10,(g,s,S)=>{for(let i=0;i<9;i++){const x=3+i*1.4,h=4+S(i,1)*5,c=(S(i,2)-.5)*4;linie(g,x,10,x+c,10-h,i%2?'#5a8a3c':'#79a74c');}},true);

// =====================================================================================================================
// T3 (Thomas 13.11.2026): Biome dicht und abwechslungsreich. Je Biom rund 20 Arten, 6 Varianten statt 3 (je gespiegelt = 12).
// Groß = steht (höchstens eins je Feld, obj[] in welt-raster.js, Roden kostet). Klein = liegt am Boden (Kleinzeug, bis zu 6 je
// Feld, wird nicht gespeichert, sondern beim Zeichnen aus Feld und Startzahl berechnet; Roden kostenlos). Neue Arten bekommen
// die volle Variante s (0…5), die alten wie bisher s%3. Schwarzer Humor sparsam: Bärenfalle mit Sandale, Geier auf dem Kaktus,
// Helm im Schlamm, Holzkreuz eines Pilzsammlers, Ratte am Fliegenpilz, Pfeil im Stamm, Ziegenschädel auf dem Pfahl …
// =====================================================================================================================
const neu=(name,biom,w,h,ax,ay,mal,flach=false)=>{art(name,biom,w,h,ax,ay,mal,flach);ARTEN[ARTEN.length-1].neu=true;};
const kl=(name,biom,w,h,mal)=>{art(name,biom,w,h,w>>1,h-2,mal,true);const a=ARTEN[ARTEN.length-1];a.neu=true;a.klein=true;};
const BUCHE=['#2c4a22','#466e2e','#62903e','#86b052'],AHORN=['#3a4a1e','#5a7428','#7c9a36','#a4bc4c'],HERBST=['#6a2a14','#9a4218','#c8662a','#e89a48'],
 APFEL=['#2a4a20','#40682c','#5a8a3a','#7aaa4e'],PAPPEL=['#2e4c26','#456a32','#5e8a40','#80a858'],ERLE=['#243a20','#36522c','#4a6c38','#66884a'],
 DSCH2=['#0c2814','#163e20','#245a2c','#3c8034'],BERGK=['#1a3420','#28482c','#3a6038','#52784a'],AKAZ=['#4a5a24','#647a30','#80983e','#a4b452'],
 SCHN=['#c8d0dc','#dce2ea','#eef2f6','#ffffff'],FELS2=['#4a4640','#66605a','#857d74','#a8a094'],ROT=['#6a2a1e','#8a3a26','#a85232','#c87048'],KNOCH='#e6dfcc',KN2='#bcb39c';
// gemeinsame Formen
function krone(g,S,s,cx,cy,rx,ry,cols,n=7,frans=.62){kugel(g,cx,cy,rx,ry,cols,s*13+7,frans);for(let i=0;i<n;i++){const a=S(i,11)*TAU,r=.55+S(i,12)*.3;kugel(g,cx+Math.cos(a)*rx*r,cy+Math.sin(a)*ry*r*.8,Math.max(3,rx*.42),Math.max(3,ry*.42),cols,s*17+i,frans);}}
function baum(g,S,s,w,h,o){const cx=w>>1,fy=h-4;schatten(g,cx,fy,o.sch||w*.3,o.sch2||4);stamm(g,cx-(o.sw>>1),fy-o.sh,fy,o.sw,o.rinde||RINDE,s);
 if(o.aeste)for(let i=0;i<o.aeste;i++){const d=i%2?1:-1;linie(g,cx,fy-o.sh*.55-i*3,cx+d*(o.krx*.6),fy-o.sh-i*2,(o.rinde||RINDE)[1],1);}
 krone(g,S,s,cx+(S(1,9)-.5)*4,o.ky,o.krx*(.9+S(2,9)*.2),o.kry*(.9+S(3,9)*.2),o.cols,o.n||7,o.frans??.62);}
function busch2(g,S,s,w,h,cols,n=4,beere){const cx=w>>1,fy=h-3;schatten(g,cx,fy,w*.38,3);for(let i=0;i<n;i++){const x=cx+(S(i,1)-.5)*w*.5,y=fy-5-S(i,2)*(h*.35);kugel(g,x,y,w*.2+S(i,3)*3,h*.22+S(i,4)*2,cols,s*5+i);}
 if(beere)for(let i=0;i<6+s;i++)P(g,cx-w*.3+S(i,5)*w*.6,fy-h*.75+S(i,6)*h*.5,1+(S(i,7)>.6?1:0),1,beere);}
function fels(g,S,s,w,h,cols,sp=.85){const cx=w>>1,fy=h-3;schatten(g,cx,fy,w*.42,3);kugel(g,cx,fy-h*.38,w*.42,h*.36,cols,s*3+1,sp);if(s%2)kugel(g,cx+w*.24,fy-h*.2,w*.18,h*.18,cols,s*7,sp);}
function streu(g,S,n,w,h,f){for(let i=0;i<n;i++)f(2+S(i,21)*(w-4),2+S(i,22)*(h-4),i);}
function halm(g,x,y,hh,c,col){linie(g,x,y,x+c,y-hh,col);}
// ---------- Wiese (Kern) ----------
neu('Apfelbaum',BIOM.KERN,52,64,26,60,(g,s,S)=>{baum(g,S,s,52,64,{sw:5,sh:22,ky:24,krx:18,kry:15,cols:APFEL});for(let i=0;i<8+s;i++)P(g,12+S(i,5)*28,14+S(i,6)*20,2,2,s===5?'#c8b030':'#c02a22');if(s===4)P(g,14,58,2,2,'#c02a22');});
neu('Pappel',BIOM.KERN,30,88,15,84,(g,s,S)=>{baum(g,S,s,30,88,{sw:4,sh:20,ky:40,krx:9,kry:34,cols:PAPPEL,n:5,sch:8});});
neu('Haselstrauch',BIOM.KERN,36,30,18,27,(g,s,S)=>busch2(g,S,s,36,30,LAUB,5,s>3?'#8a6030':null));
neu('Holunder',BIOM.KERN,38,34,19,31,(g,s,S)=>busch2(g,S,s,38,34,BIRKE,5,s%2?'#2a1830':'#f4f0dc'));
neu('Distelbusch',BIOM.KERN,24,22,12,19,(g,s,S)=>{for(let i=0;i<7;i++){const x=5+S(i,1)*14,h=8+S(i,2)*8;linie(g,12,19,x,19-h,'#5a7a44');P(g,x-1,19-h-2,3,3,S(i,3)>.3?'#a058b8':'#6a8a50');}});
neu('Vogelscheuche',BIOM.KERN,26,44,13,41,(g,s,S)=>{schatten(g,13,41,8,2);P(g,12,10,2,31,'#6a4a2c');P(g,3,16,20,2,'#6a4a2c');P(g,8,16,10,14,s%2?'#8a3a2a':'#7a6a40');P(g,9,5,8,7,'#d8c48a');P(g,10,7,2,1,'#20140c');P(g,14,7,2,1,'#20140c');
 if(s<3){P(g,7,2,12,3,'#9a9488');P(g,8,1,10,2,'#b8b0a2');P(g,12,0,2,1,'#b02a22');}else{P(g,8,3,10,2,'#c8a050');}for(let i=0;i<4;i++)P(g,3+i*5,18,1,3,'#c8b070');if(s===5){P(g,20,13,3,2,'#141414');}});// mit altem Legionärshelm, mal mit Krähe
neu('Grenzstein',BIOM.KERN,16,22,8,19,(g,s)=>{schatten(g,8,19,6,2);P(g,3,5,10,14,'#8e877c');P(g,4,4,8,1,'#a8a092');P(g,3,5,2,14,'#a8a092');P(g,11,5,2,14,'#6a645a');for(const [x,y] of [[5,8],[8,8],[6,11],[9,11],[5,14]])P(g,x,y,2,1,'#5a544a');});// verwitterte Inschrift
neu('Heuhaufen',BIOM.KERN,34,26,17,23,(g,s,S)=>{schatten(g,17,23,14,3);kugel(g,17,15,14,9,['#8a6a2a','#b08a3a','#d0aa4e','#e8c868'],s,.75);for(let i=0;i<14;i++)linie(g,6+S(i,1)*22,9+S(i,2)*10,8+S(i,3)*22,11+S(i,4)*10,'#a07a30');if(s===3)P(g,24,8,3,2,'#6a6058');});// mal mit Mistgabel… mal nur mit Maus
neu('Wegkreuz',BIOM.KERN,18,32,9,29,(g,s)=>{schatten(g,9,29,6,2);P(g,8,4,3,25,'#5a3e24');P(g,3,9,13,3,'#5a3e24');P(g,8,4,1,25,'#7a5a38');P(g,4,24,11,5,'#7a7468');if(s>2)P(g,6,22,2,2,'#c03028');});// Opferstelle, Kerze schon abgebrannt
kl('Klee',BIOM.KERN,14,8,(g,s,S)=>streu(g,S,5+s,14,8,(x,y,i)=>{P(g,x,y,2,1,'#4e8a3a');P(g,x,y-1,1,1,'#6aa84e');if(i===0&&s>3)P(g,x+1,y-2,1,1,'#e8e0f0');}));
kl('Mohn',BIOM.KERN,14,10,(g,s,S)=>streu(g,S,3+(s>>1),14,10,(x,y)=>{P(g,x,y,1,3,'#3a6a2a');P(g,x-1,y-1,3,2,'#c8241e');P(g,x,y-1,1,1,'#2a1410');}));
kl('Gänseblümchen',BIOM.KERN,14,8,(g,s,S)=>streu(g,S,4+s,14,8,(x,y)=>{P(g,x,y,1,1,'#f4f0e4');P(g,x+1,y,1,1,'#f0d040');}));
kl('Löwenzahn',BIOM.KERN,12,10,(g,s,S)=>streu(g,S,2+(s>>1),12,10,(x,y,i)=>{P(g,x,y,1,3,'#3a6a2a');P(g,x-1,y-1,3,2,s%2&&i===0?'#e8e4dc':'#f0c020');}));
kl('Kiesel',BIOM.KERN,14,8,(g,s,S)=>streu(g,S,3+s,14,8,(x,y,i)=>{P(g,x,y,2,1,STEIN[1+(i%3)]);P(g,x,y+1,2,1,STEIN[0]);}));
kl('Maulwurfshügel',BIOM.KERN,14,8,(g,s)=>{g.fillStyle='#5a4028';g.beginPath();g.ellipse(7,5,5,2.6,0,0,TAU);g.fill();P(g,5,3,4,1,'#7a5836');P(g,3,6,2,1,'#4a3020');});
kl('Grashalme',BIOM.KERN,14,10,(g,s,S)=>{for(let i=0;i<6+s;i++)halm(g,2+S(i,1)*10,9,3+S(i,2)*5,(S(i,3)-.5)*3,i%2?'#5a8a3c':'#86b054');});
kl('Verlorene Sandale',BIOM.KERN,12,6,(g,s)=>{P(g,2,2,7,3,'#7a5030');P(g,3,2,5,1,'#9a6a40');P(g,4,1,1,2,'#5a3820');P(g,7,1,1,2,'#5a3820');if(s>3)P(g,9,3,2,1,'#c8a050');});// Besitzer unbekannt (vermutlich glücklicher ohne)
kl('Hufeisen',BIOM.KERN,10,6,(g,s)=>{P(g,2,1,6,1,'#6a645c');P(g,2,1,1,4,'#6a645c');P(g,7,1,1,4,'#6a645c');P(g,3,2,1,2,'#8a847a');});
// ---------- Wald ----------
neu('Buche',BIOM.WALD,62,86,31,82,(g,s,S)=>{baum(g,S,s,62,86,{sw:7,sh:34,ky:30,krx:24,kry:20,cols:s===5?HERBST:BUCHE,rinde:['#4a4a44','#6a6a62','#8a8a80'],aeste:2});});
neu('Kiefer',BIOM.WALD,44,92,22,88,(g,s,S)=>{schatten(g,22,88,12,3);stamm(g,20,30,88,4,['#5a2e1a','#8a4a26','#a8643a'],s);for(const [x,y,rx,ry] of [[22,16,12,6],[14,24,9,5],[30,22,9,5],[22,28,11,5]])kugel(g,x+(S(x,1)-.5)*4,y+(S(y,2)-.5)*3,rx,ry,BERGK,s*9+x,.5);});
neu('Junge Fichte',BIOM.WALD,26,46,13,42,(g,s,S)=>{schatten(g,13,42,7,2);P(g,12,36,2,6,RINDE[1]);for(let k=0;k<4;k++){const b=38-k*8,hw=10-k*2;for(let r=0;r<9;r++){const ww=Math.round(hw*(r+1)/10);for(let x=-ww;x<=ww;x++)P(g,13+x,b-9+r,1,1,x<-ww*.3?NADEL[2]:x>ww*.4?NADEL[0]:NADEL[1]);}}});
neu('Ahorn',BIOM.WALD,60,80,30,76,(g,s,S)=>{baum(g,S,s,60,80,{sw:6,sh:30,ky:28,krx:22,kry:18,cols:s===5?HERBST:AHORN,aeste:3});});
neu('Dornbusch',BIOM.WALD,34,26,17,23,(g,s,S)=>{busch2(g,S,s,34,26,NADEL,4,s%2?'#5a1828':null);for(let i=0;i<10;i++)P(g,4+S(i,8)*26,6+S(i,9)*14,1,1,'#c8c0a0');});
neu('Ameisenhaufen',BIOM.WALD,26,18,13,15,(g,s,S)=>{schatten(g,13,15,11,2);kugel(g,13,10,11,6,['#3a2a1a','#5a4228','#7a5a36','#9a7a4a'],s,.9);for(let i=0;i<8;i++)P(g,3+S(i,1)*20,6+S(i,2)*9,1,1,'#1a1008');});
neu('Bärenfalle',BIOM.WALD,22,12,11,9,(g,s)=>{const E='#5a5850',L='#8a8678';g.strokeStyle=E;g.lineWidth=1;g.beginPath();g.ellipse(11,7,8,3,0,0,TAU);g.stroke();for(let i=0;i<7;i++){P(g,4+i*2,3,1,2,L);P(g,4+i*2,10,1,1,L);}
 if(s<3){P(g,8,5,7,3,'#7a5030');P(g,9,5,5,1,'#9a6a40');P(g,10,4,1,1,'#5a3820');}else P(g,9,6,4,1,'#8a2a20');},true);// mit Sandale – vom Besitzer fehlt jede Spur
neu('Stumpf mit Pfeil',BIOM.WALD,28,26,14,22,(g,s)=>{schatten(g,14,22,11,3);stamm(g,7,12,21,14,RINDE,s);g.fillStyle='#c49a64';g.beginPath();g.ellipse(14,12,7,3,0,0,TAU);g.fill();linie(g,16,15,26,9,'#6a4a2c');P(g,25,7,2,2,'#e8e0d0');P(g,26,9,2,2,'#b02a22');if(s>2)linie(g,10,17,1,13,'#6a4a2c');});// der Waldhüter hat danebengeschossen
neu('Pilzsammlerkreuz',BIOM.WALD,18,30,9,27,(g,s)=>{schatten(g,9,27,6,2);P(g,8,5,2,22,'#6a4a2c');P(g,3,10,12,2,'#6a4a2c');P(g,8,5,1,22,'#8a6a40');P(g,4,22,4,3,'#b8302a');P(g,5,21,2,1,'#ece4d0');if(s%2)P(g,11,24,3,2,'#b8302a');});// „Er wollte nur Pilze“
neu('Hirschgeweih',BIOM.WALD,22,12,11,9,(g,s)=>{const K='#d8ccb0';linie(g,4,9,10,5,K);linie(g,18,9,12,5,K);linie(g,6,7,4,3,K);linie(g,16,7,18,3,K);linie(g,8,6,8,2,K);P(g,10,5,3,3,'#b8a888');},true);
kl('Laub',BIOM.WALD,16,8,(g,s,S)=>streu(g,S,6+s,16,8,(x,y,i)=>P(g,x,y,2,1,s>3?HERBST[1+(i%3)]:['#6a5a2a','#8a6a2a','#5a6a2a','#7a4a22'][i%4])));
kl('Zapfen',BIOM.WALD,12,6,(g,s,S)=>streu(g,S,2+(s>>1),12,6,(x,y)=>{P(g,x,y,2,2,'#6a4224');P(g,x,y,1,1,'#8a5a32');}));
kl('Moospolster',BIOM.WALD,16,8,(g,s)=>{g.fillStyle='#3e6e2c';g.beginPath();g.ellipse(8,5,6,2.5,0,0,TAU);g.fill();P(g,5,4,4,1,'#5a8e3a');if(s>3)P(g,9,3,1,1,'#c8d040');});
kl('Fliegenpilz mit Ratte',BIOM.WALD,16,12,(g,s)=>{P(g,4,7,2,4,'#ece4d0');P(g,2,5,6,2,'#c8241e');P(g,3,4,4,1,'#e03a2a');P(g,3,5,1,1,'#fff');P(g,6,5,1,1,'#fff');P(g,9,8,5,3,'#5a5450');P(g,13,8,2,2,'#5a5450');P(g,14,8,1,1,'#e0a0a0');linie(g,9,10,6,11,'#8a7a70');if(s>2)P(g,10,11,3,1,'#2a2420');});// sie hat gekostet
kl('Eicheln',BIOM.WALD,12,6,(g,s,S)=>streu(g,S,3+(s>>1),12,6,(x,y)=>{P(g,x,y,2,2,'#8a6030');P(g,x,y-1,2,1,'#5a4024');}));
kl('Buschwindröschen',BIOM.WALD,14,8,(g,s,S)=>streu(g,S,4+s,14,8,(x,y)=>{P(g,x,y+1,1,1,'#3a6a2a');P(g,x,y,1,1,'#f4f0f6');}));
kl('Zweige',BIOM.WALD,16,8,(g,s,S)=>{for(let i=0;i<3+(s>>1);i++){const x=2+S(i,1)*10,y=2+S(i,2)*4;linie(g,x,y,x+4+S(i,3)*4,y+S(i,4)*3,RINDE[1+(i%2)]);}});
kl('Farnkeimling',BIOM.WALD,12,8,(g,s,S)=>{for(let i=0;i<4;i++)wedel(g,6,7,-Math.PI+.6+i*.6,4+S(i,1)*2,2,['#2a4a22','#447a30','#6a9e44'],s+i,1);});
// ---------- Wüste ----------
neu('Geier auf Kaktus',BIOM.WUESTE,32,54,16,50,(g,s,S)=>{ARTEN[A['Saguaro']].mal(g,1,S);P(g,13,0,7,6,'#2a2420');P(g,12,2,9,3,'#3a3430');P(g,18,0,3,2,'#c8a090');P(g,20,1,2,1,'#e8c040');if(s>2)P(g,10,3,3,2,'#2a2420');});// wartet geduldig
neu('Agave',BIOM.WUESTE,32,22,16,19,(g,s,S)=>{for(let i=0;i<9;i++){const a=-Math.PI+.2+i*.34,L=8+S(i,1)*7;for(let t=0;t<L;t++){const x=16+Math.cos(a)*t,y=19+Math.sin(a)*t*.7;P(g,x,y,2,1,t<2?'#4a6a5a':i%2?'#6a9a80':'#88b49a');}}if(s===5)linie(g,16,19,16,0,'#7a6a3a');});
neu('Tamariske',BIOM.WUESTE,40,40,20,37,(g,s,S)=>{baum(g,S,s,40,40,{sw:3,sh:14,ky:16,krx:15,kry:10,cols:['#6a6a4a','#8a8a5a','#a8a06a','#c8b888'],n:6,frans:.45,rinde:['#4a3a2a','#6a5a40','#8a7a58']});for(let i=0;i<6;i++)P(g,8+S(i,4)*24,8+S(i,5)*12,1,1,'#d8a0b0');});
neu('Akazie',BIOM.WUESTE,64,58,32,54,(g,s,S)=>{schatten(g,32,54,22,4);stamm(g,30,28,54,4,RINDE,s);linie(g,32,30,18,18,RINDE[1],2);linie(g,32,30,46,18,RINDE[0],2);kugel(g,32,14,28,7,AKAZ,s*5,.5);kugel(g,22,16,10,4,AKAZ,s*6,.5);});
neu('Termitenhügel',BIOM.WUESTE,24,40,12,37,(g,s,S)=>{schatten(g,12,37,9,2);for(let y=4;y<37;y++){const w=Math.round(3+(y-4)/33*7+(S(y>>2,1)-.5)*2);for(let x=-w;x<=w;x++)P(g,12+x,y,1,1,x<-w*.3?'#c89a62':x>w*.4?'#8a6638':'#a87e4c');}P(g,7,14,3,6,'#b88c56');});
neu('Zerbrochene Amphore',BIOM.WUESTE,22,16,11,13,(g,s)=>{schatten(g,11,13,8,2);kugel(g,10,9,7,4,ROT,s,.95);P(g,15,6,4,4,'#a85232');P(g,3,8,2,3,'#6a2a1e');P(g,16,11,3,2,'#c87048');if(s>2)P(g,6,7,2,1,'#e6dfcc');},true);// leer, natürlich
neu('Felsnadel',BIOM.WUESTE,22,54,11,50,(g,s,S)=>{schatten(g,11,50,8,2);for(let y=2;y<50;y++){const w=Math.round(2+y/50*6+(S(y>>3,1)-.5)*2);for(let x=-w;x<=w;x++){const b=((y+(x>0?2:0))>>2)%3;P(g,11+x,y,1,1,x<-w*.3?SANDST[3]:x>w*.4?SANDST[0]:SANDST[1+(b>0?1:0)]);}}});
neu('Kamelschädel',BIOM.WUESTE,22,12,11,9,(g,s)=>{g.fillStyle=KNOCH;g.beginPath();g.ellipse(9,7,6,3,0,0,TAU);g.fill();P(g,14,6,6,2,KNOCH);P(g,6,6,2,2,'#20140c');P(g,15,8,4,1,KN2);if(s%2)linie(g,3,9,0,11,KN2);},true);
kl('Wüstenkiesel',BIOM.WUESTE,14,8,(g,s,S)=>streu(g,S,4+s,14,8,(x,y,i)=>{P(g,x,y,2,1,SANDST[i%3]);P(g,x,y+1,2,1,SANDST[0]);}));
kl('Sandgras',BIOM.WUESTE,12,10,(g,s,S)=>{for(let i=0;i<5+s;i++)halm(g,2+S(i,1)*8,9,3+S(i,2)*5,(S(i,3)-.5)*4,i%2?'#a8a060':'#c8bc78');});
kl('Schlangenhaut',BIOM.WUESTE,16,6,(g,s)=>{for(let i=0;i<12;i++)P(g,2+i,3+Math.round(Math.sin(i*.8+s)*1.5),1,1,i%2?'#d8ccaa':'#b8ac88');});
kl('Wüstenblume',BIOM.WUESTE,10,8,(g,s)=>{P(g,4,4,1,3,'#5a7a3a');P(g,3,2,3,2,['#e04a8a','#f0c030','#f07040'][s%3]);});
kl('Rippenknochen',BIOM.WUESTE,14,8,(g,s,S)=>{for(let i=0;i<3+(s>>1);i++){const x=2+i*3;linie(g,x,6,x+2,2,KNOCH);}});
kl('Tonscherben',BIOM.WUESTE,12,6,(g,s,S)=>streu(g,S,3+(s>>1),12,6,(x,y,i)=>P(g,x,y,2,1,ROT[1+(i%3)])));
kl('Spur im Sand',BIOM.WUESTE,16,8,(g,s)=>{for(let i=0;i<4;i++)P(g,2+i*3,2+(i%2)*2,2,1,'#a8885c');});// führt nirgendwohin
// ---------- Dschungel ----------
neu('Würgefeige',BIOM.DSCHUNGEL,70,110,35,106,(g,s,S)=>{schatten(g,35,106,24,6);for(let i=0;i<5;i++){const x=28+i*3.5;for(let y=50;y<106;y++)P(g,x+Math.sin(y*.15+i)*2,y,2,1,i%2?'#4e4230':'#6e5e44');}krone(g,S,s,35,30,28,22,DSCH2,8);});
neu('Baumfarn',BIOM.DSCHUNGEL,46,58,23,54,(g,s,S)=>{schatten(g,23,54,10,3);stamm(g,21,22,54,4,['#3a2a1a','#5a4228','#6a5232'],s);for(let i=0;i<9;i++)wedel(g,23,22,i/9*TAU+s*.3,14+S(i,1)*5,8,['#1a4624','#2e6e34','#4c9440'],s+i,3);});
neu('Helikonie',BIOM.DSCHUNGEL,30,40,15,37,(g,s,S)=>{for(let i=0;i<5;i++){const x=6+i*4.5;linie(g,x,37,x+(S(i,1)-.5)*4,12+S(i,2)*8,'#2e6e34',2);}for(let i=0;i<4;i++){const y=14+i*5;P(g,9+i*3,y,4,2,i%2?'#e8b020':'#d83a2a');}});
neu('Lianenbaum',BIOM.DSCHUNGEL,56,96,28,92,(g,s,S)=>{baum(g,S,s,56,96,{sw:8,sh:44,ky:30,krx:22,kry:18,cols:DSCH,rinde:['#2e2618','#4e4230','#6e5e44']});for(const x of [12,20,36,44])for(let y=36;y<70+S(x,3)*20;y++)P(g,x+Math.sin(y*.25+x)*1.5,y,1,1,'#3a7a3a');});
neu('Elefantenohr',BIOM.DSCHUNGEL,38,30,19,27,(g,s,S)=>{for(let i=0;i<5;i++){const a=-Math.PI/2+(i-2)*.6,cx=19+Math.cos(a)*9,cy=20+Math.sin(a)*8;g.fillStyle=i%2?'#2a6430':'#3c8034';g.beginPath();g.ellipse(cx,cy,6,4,a,0,TAU);g.fill();linie(g,19,27,cx,cy,'#1a4624');}});
neu('Steinkopf',BIOM.DSCHUNGEL,30,30,15,27,(g,s,S)=>{schatten(g,15,27,12,3);kugel(g,15,15,11,12,FELS2,s,.95);P(g,9,11,4,2,'#2a2620');P(g,17,11,4,2,'#2a2620');P(g,13,15,4,3,'#4a4640');P(g,10,20,10,2,'#2a2620');for(let i=0;i<10;i++)P(g,4+S(i,1)*22,3+S(i,2)*14,2,1,'#3c8034');if(s>3)P(g,10,13,2,4,'#7a1a14');});// halb versunkener Götze, sieht zufrieden aus
neu('Orchideenbusch',BIOM.DSCHUNGEL,30,24,15,21,(g,s,S)=>busch2(g,S,s,30,24,DSCH,4,['#e8a0e0','#f4f0f8','#d060c0'][s%3]));
neu('Ameisenstraße',BIOM.DSCHUNGEL,24,8,12,5,(g,s)=>{for(let i=0;i<10;i++)P(g,2+i*2,3+Math.round(Math.sin(i*.7+s)*1.5),1,1,'#2a1408');for(let i=0;i<3;i++)P(g,4+i*6,2+Math.round(Math.sin(i*4.2+s)*1.5),2,1,'#4a8a3a');},true);
kl('Dschungellaub',BIOM.DSCHUNGEL,16,8,(g,s,S)=>streu(g,S,5+s,16,8,(x,y,i)=>P(g,x,y,2,1,['#2a4a1a','#4a5a22','#6a5a2a','#1a3a18'][i%4])));
kl('Blütenblätter',BIOM.DSCHUNGEL,14,8,(g,s,S)=>streu(g,S,4+s,14,8,(x,y)=>P(g,x,y,1,1,['#e04a6a','#f0a030','#e888d0'][s%3])));
kl('Pilzring',BIOM.DSCHUNGEL,16,8,(g,s)=>{for(let i=0;i<7;i++){const a=i/7*TAU,x=8+Math.cos(a)*5,y=4+Math.sin(a)*2;P(g,x,y,1,2,'#ece4d0');P(g,x-1,y-1,3,1,s%2?'#f0e0a0':'#d8a040');}});
kl('Wurzeln',BIOM.DSCHUNGEL,18,8,(g,s,S)=>{for(let i=0;i<3;i++){let x=2+S(i,1)*4,y=2+i*2;for(let t=0;t<10;t++){P(g,x,y,1,1,'#4e4230');x+=1.2;y+=(S(i,t)-.5);}}});
kl('Käfer',BIOM.DSCHUNGEL,8,6,(g,s)=>{P(g,2,2,3,2,['#2a6a8a','#6a2a8a','#2a8a4a'][s%3]);P(g,5,2,1,1,'#141414');});
kl('Frosch',BIOM.DSCHUNGEL,8,6,(g,s)=>{P(g,2,2,4,2,s%2?'#e04020':'#3a9a2a');P(g,2,1,1,1,'#141414');P(g,5,1,1,1,'#141414');});// nicht ablecken
kl('Moos am Boden',BIOM.DSCHUNGEL,14,6,(g,s)=>{g.fillStyle='#2a6430';g.beginPath();g.ellipse(7,3,5,2,0,0,TAU);g.fill();});
// ---------- Sumpf ----------
neu('Erle',BIOM.SUMPF,48,70,24,66,(g,s,S)=>baum(g,S,s,48,70,{sw:5,sh:26,ky:26,krx:17,kry:15,cols:ERLE,rinde:['#2e2a20','#4a4434','#6a6048']}));
neu('Sumpfzypresse',BIOM.SUMPF,40,86,20,82,(g,s,S)=>{schatten(g,20,82,12,3);for(let y=60;y<82;y++){const f=(y-60)/22*6;P(g,20-4-f,y,8+f*2,1,y%3?'#4a4434':'#6a6048');}stamm(g,17,30,62,6,['#2e2a20','#4a4434','#6a6048'],s);kugel(g,20,22,12,16,ERLE,s,.55);for(let i=0;i<8;i++)for(let y=0;y<10;y++)P(g,10+i*3,30+y+S(i,1)*6,1,1,'#7a8a5a');});
neu('Rohrkolben',BIOM.SUMPF,22,34,11,31,(g,s,S)=>{for(let i=0;i<6;i++){const x=3+i*3,h=16+S(i,1)*12;linie(g,x,31,x+(S(i,2)-.5)*3,31-h,'#5a7a34');if(i%2===0){P(g,x-1+(S(i,2)-.5)*3,31-h-6,3,7,'#5a3418');}}});
neu('Helm im Schlamm',BIOM.SUMPF,20,12,10,9,(g,s)=>{g.fillStyle='#3a3424';g.beginPath();g.ellipse(10,9,8,2.4,0,0,TAU);g.fill();kugel(g,10,6,6,4,['#5a5448','#7a7468','#9a9488','#b8b2a6'],s,.95);P(g,3,7,14,1,'#6a6458');if(s<3)P(g,9,1,2,3,'#9a2a22');else linie(g,15,4,19,0,'#8a7a5a');},true);// der Rest liegt tiefer
neu('Versunkener Karren',BIOM.SUMPF,40,24,20,20,(g,s)=>{schatten(g,20,20,16,3);for(let i=0;i<5;i++)P(g,6+i*6,10+i,5,6,i%2?'#4a3420':'#5e4229');g.strokeStyle='#3a2818';g.lineWidth=2;g.beginPath();g.ellipse(30,14,6,7,0,0,TAU);g.stroke();linie(g,30,8,30,20,'#3a2818');linie(g,24,14,36,14,'#3a2818');g.fillStyle='#3a3424';g.beginPath();g.ellipse(20,21,18,3,0,0,TAU);g.fill();});
neu('Krumme Birke',BIOM.SUMPF,40,70,20,66,(g,s,S)=>{schatten(g,20,66,10,3);const W=['#8e8a7e','#d2cec2','#e8e4d8'];for(let y=20;y<66;y++){const x=17+Math.sin(y/14+s)*5;for(let i=0;i<4;i++)P(g,x+i,y,1,1,W[i<1?0:i<3?1:2]);if(h2(y,s,3)>.8)P(g,x+1,y,2,1,'#26221e');}krone(g,S,s,20+Math.sin(20/14+s)*5,16,12,11,['#3a5a2a','#567a36','#729a46','#94b864'],6,.5);});
neu('Weidenbusch',BIOM.SUMPF,36,30,18,27,(g,s,S)=>{busch2(g,S,s,36,30,WEIDE,5,null);for(let x=6;x<30;x+=2)for(let y=10;y<18+S(x,4)*8;y++)P(g,x,y,1,1,WEIDE[2]);});
neu('Pfahl mit Laterne',BIOM.SUMPF,14,40,7,37,(g,s)=>{P(g,6,6,2,31,'#4a3a26');P(g,7,6,5,1,'#4a3a26');P(g,10,7,1,3,'#4a3a26');P(g,8,10,5,5,'#2a2a22');P(g,9,11,3,3,s<3?'#e8c050':'#3a3a2a');});// Irrlicht für Verirrte
kl('Torfbrocken',BIOM.SUMPF,14,8,(g,s,S)=>streu(g,S,3+(s>>1),14,8,(x,y)=>{P(g,x,y,3,2,'#3a2a1a');P(g,x,y,2,1,'#5a4228');}));
kl('Sumpfdotterblume',BIOM.SUMPF,12,8,(g,s,S)=>streu(g,S,3+(s>>1),12,8,(x,y)=>{P(g,x,y+1,2,1,'#3a6a2a');P(g,x,y,2,1,'#f0c820');}));
kl('Sumpfmoos',BIOM.SUMPF,16,6,(g,s)=>{g.fillStyle='#4a5a2a';g.beginPath();g.ellipse(8,3,6,2,0,0,TAU);g.fill();P(g,5,2,3,1,'#6a7a3a');});
kl('Moorknochen',BIOM.SUMPF,14,6,(g,s)=>{linie(g,2,4,10,2,KN2);P(g,1,3,2,2,KNOCH);P(g,10,1,2,2,KNOCH);if(s>2)P(g,12,4,2,1,KNOCH);});
kl('Blasen',BIOM.SUMPF,12,6,(g,s,S)=>streu(g,S,2+(s>>1),12,6,(x,y)=>{P(g,x,y,1,1,'#8aa070');P(g,x+1,y-1,1,1,'#a8b890');}));
kl('Sumpfgras',BIOM.SUMPF,12,10,(g,s,S)=>{for(let i=0;i<5+s;i++)halm(g,2+S(i,1)*8,9,4+S(i,2)*4,(S(i,3)-.5)*3,i%2?'#5a6a34':'#7a8a44');});
kl('Libelle',BIOM.SUMPF,8,4,(g,s)=>{P(g,1,2,6,1,s%2?'#3a8ac0':'#c04a3a');P(g,3,1,1,1,'#c8e0f0');P(g,4,3,1,1,'#c8e0f0');});
// ---------- Gebirge ----------
neu('Felsblock',BIOM.GEBIRGE,44,34,22,30,(g,s,S)=>fels(g,S,s,44,34,FELS2));
neu('Graue Felsnadel',BIOM.GEBIRGE,24,60,12,56,(g,s,S)=>{schatten(g,12,56,9,2);for(let y=2;y<56;y++){const w=Math.round(2+y/56*7+(S(y>>3,1)-.5)*2);for(let x=-w;x<=w;x++)P(g,12+x,y,1,1,x<-w*.3?FELS2[3]:x>w*.4?FELS2[0]:FELS2[1+((y>>3)%2)]);}if(s>3)for(let x=-2;x<=2;x++)P(g,12+x,2,1,2,SCHN[3]);});
neu('Bergkiefer',BIOM.GEBIRGE,40,56,20,52,(g,s,S)=>{schatten(g,20,52,10,3);const lean=(s%3-1)*5;for(let y=20;y<52;y++)for(let i=0;i<3;i++)P(g,19+i+lean*(52-y)/32,y,1,1,RINDE[i]);kugel(g,20+lean,14,15,8,BERGK,s,.5);kugel(g,12+lean,22,8,5,BERGK,s+3,.5);});
neu('Latschen',BIOM.GEBIRGE,36,22,18,19,(g,s,S)=>busch2(g,S,s,36,22,BERGK,5,null));
neu('Steinmann',BIOM.GEBIRGE,16,26,8,23,(g,s)=>{schatten(g,8,23,6,2);for(const [y,w] of [[19,12],[14,10],[10,8],[6,6],[3,4]])P(g,8-w/2,y,w,4,y%2?FELS2[2]:FELS2[1]);if(s>3)P(g,7,0,2,3,'#d8ccb0');});
neu('Ziegenschädel',BIOM.GEBIRGE,20,40,10,37,(g,s)=>{P(g,9,10,2,27,'#5a4028');P(g,6,4,8,7,KNOCH);P(g,7,7,2,2,'#20140c');P(g,11,7,2,2,'#20140c');linie(g,6,5,2,0,KN2);linie(g,13,5,17,0,KN2);if(s>2){P(g,4,12,1,6,'#8a2a20');}});// Warnung an Wanderer, ziemlich deutlich
neu('Geröllhaufen',BIOM.GEBIRGE,32,18,16,15,(g,s,S)=>{schatten(g,16,15,13,2);for(let i=0;i<9;i++)kugel(g,6+S(i,1)*20,8+S(i,2)*6,3+S(i,3)*2,2+S(i,4)*1.5,FELS2,s*5+i,.95);});
neu('Verschneite Tanne',BIOM.GEBIRGE,46,98,23,94,(g,s,S)=>{ARTEN[A['Tanne']].mal(g,s%3,S);const im=g.getImageData(0,0,46,98),d=im.data;// Schnee auf den Oberkanten der Äste
 for(let k=0;k<6;k++){const top=63-k*12;for(let y=top;y<top+4;y++)for(let x=0;x<46;x++){const o=(y*46+x)*4;if(d[o+3]&&d[o+1]>d[o]&&(y-top<2||S(x,y)>.45)){const c=S(y,x)>.3?255:226;d[o]=c;d[o+1]=c;d[o+2]=Math.min(255,c+6);}}}
 for(let i=0;i<30;i++){const x=(S(i,31)*46)|0,y=(4+S(i,32)*86)|0,o=(y*46+x)*4;if(d[o+3]){d[o]=d[o+1]=d[o+2]=244;}}g.putImageData(im,0,0);});
neu('Eisfels',BIOM.GEBIRGE,40,30,20,26,(g,s,S)=>{fels(g,S,s,40,30,FELS2);kugel(g,20,8,14,4,SCHN,s,.6);});
neu('Altar mit Knochen',BIOM.GEBIRGE,28,24,14,21,(g,s)=>{schatten(g,14,21,12,3);P(g,4,10,20,10,FELS2[1]);P(g,4,10,20,2,FELS2[3]);P(g,4,10,2,10,FELS2[2]);P(g,8,8,8,2,KNOCH);P(g,9,7,3,3,KNOCH);P(g,10,8,1,1,'#20140c');if(s>2)P(g,16,12,4,6,'#6a1a14');});// die Götter mögen es frisch
kl('Geröll',BIOM.GEBIRGE,16,8,(g,s,S)=>streu(g,S,4+s,16,8,(x,y,i)=>{P(g,x,y,2,2,FELS2[1+(i%3)]);P(g,x,y+1,2,1,FELS2[0]);}));
kl('Edelweiß',BIOM.GEBIRGE,10,8,(g,s)=>{P(g,4,5,1,2,'#5a6a4a');P(g,3,3,3,2,'#e8e8e0');P(g,4,3,1,1,'#d8c040');});
kl('Enzian',BIOM.GEBIRGE,10,8,(g,s,S)=>streu(g,S,2+(s>>1),10,8,(x,y)=>{P(g,x,y+1,1,1,'#3a5a2a');P(g,x,y,2,1,'#2a4ac0');}));
kl('Flechten',BIOM.GEBIRGE,14,6,(g,s,S)=>streu(g,S,4+s,14,6,(x,y,i)=>P(g,x,y,2,1,i%2?'#a8a050':'#8a9a6a')));
kl('Schneehaufen',BIOM.GEBIRGE,16,6,(g,s,S)=>{for(let x=1;x<15;x++){const h=Math.max(0,Math.round(2.2*Math.sin(x/14*Math.PI)+(S(x,1)-.5)*1.4));if(h)P(g,x,5-h,1,h,x<6?SCHN[3]:SCHN[2]);}});
kl('Steinsplitter',BIOM.GEBIRGE,12,6,(g,s,S)=>streu(g,S,3+(s>>1),12,6,(x,y,i)=>linie(g,x,y,x+2,y-1,FELS2[2+(i%2)])));
kl('Murmeltierknochen',BIOM.GEBIRGE,12,6,(g,s)=>{linie(g,2,4,8,2,KNOCH);P(g,8,1,3,3,KNOCH);P(g,9,2,1,1,'#20140c');});
kl('Bergkristall',BIOM.GEBIRGE,10,8,(g,s)=>{P(g,4,2,2,4,'#c8e0f0');P(g,4,2,1,1,'#ffffff');P(g,6,4,1,2,'#a8c8e0');});
kl('Gämshorn',BIOM.GEBIRGE,10,8,(g,s)=>{linie(g,3,6,5,1,'#2a2420');P(g,5,1,2,1,'#2a2420');});
const nr=n=>ARTEN.findIndex(a=>a&&a.name===n),A={};for(const a of ARTEN)if(a)A[a.name]=a.id;
// ---------- Bilder (bei Bedarf, T3: 6 Varianten × gespiegelt = 12) ----------
const VARN=6,bilder=new Map();
function bild(id,v){const key=id*16+v;let b=bilder.get(key);if(b)return b;const a=ARTEN[id],s=v%VARN;
 if(v>=VARN){const o=bild(id,s),[c,g]=mk(a.w,a.h);g.translate(a.w,0);g.scale(-1,1);g.drawImage(o.img,0,0);b={img:c,ax:a.w-a.ax,ay:a.ay,flach:a.flach};}
 else{const [c,g]=mk(a.w,a.h),S=(x,y)=>h2(x|0,y|0,id*31+s*7+3);a.mal(g,a.neu?s:s%3,S,s);b={img:c,ax:a.ax,ay:a.ay,flach:a.flach};}
 bilder.set(key,b);return b;}
const variante=(tx,ty)=>(h2(tx,ty,13)*VARN*2)|0;

// ---------- Was wächst wo ----------
// Listen [Name, Anteil]; Anteile zählen gegen eine Zufallszahl, der Rest bleibt leer. dichte 0…1 aus großflächigem Rauschen
// (dichte Haine, lichte Stellen). licht: Lichtung (T3) – dort wächst nur Kleinzeug, selten ein einzelner Baum.
function wahl(r,liste){let s=0;for(const [n,p] of liste){s+=p;if(r<s)return A[n];}return 0;}
const L={
 waldBaum:[['Eiche',.2],['Tanne',.15],['Birke',.1],['Buche',.2],['Ahorn',.13],['Kiefer',.08],['Junge Fichte',.14]],
 waldUnter:[['Busch',.1],['Farn',.17],['Pilze',.07],['Baumstumpf',.06],['Moosfels',.08],['Totholz',.07],['Dornbusch',.08],['Ameisenhaufen',.03],['Stumpf mit Pfeil',.012],['Bärenfalle',.01],['Pilzsammlerkreuz',.006],['Hirschgeweih',.01],['Grasbüschel',.1]],
 nadelBaum:[['Tanne',.45],['Kiefer',.3],['Junge Fichte',.25]],nadelUnter:[['Farn',.2],['Moosfels',.15],['Baumstumpf',.1],['Totholz',.1],['Pilze',.1],['Ameisenhaufen',.04]],
 walderde:[['Totholz',.08],['Baumstumpf',.08],['Moosfels',.06],['Dornbusch',.08],['Junge Fichte',.06],['Buche',.05],['Bärenfalle',.006]],
 waldwiese:[['Blumen',.07],['Busch',.04],['Birke',.03],['Grasbüschel',.05],['Haselstrauch',.03],['Holunder',.02],['Pilzsammlerkreuz',.002]],
 sand:[['Saguaro',.03],['Feigenkaktus',.03],['Dürrbusch',.05],['Sandsteinfels',.015],['Säulenstumpf',.005],['Gerippe',.005],['Agave',.03],['Geier auf Kaktus',.004],['Termitenhügel',.01],['Zerbrochene Amphore',.006],['Felsnadel',.006],['Kamelschädel',.006],['Tamariske',.01],['Akazie',.008]],
 wkies:[['Dürrbusch',.06],['Agave',.04],['Sandsteinfels',.02],['Feigenkaktus',.02],['Kamelschädel',.004]],wgeroell:[['Sandsteinfels',.06],['Felsnadel',.02],['Dürrbusch',.04],['Gerippe',.004]],
 wtrocken:[['Akazie',.04],['Tamariske',.04],['Dürrbusch',.08],['Agave',.03],['Termitenhügel',.015]],oase:[['Dattelpalme',.32],['Busch',.08],['Grasbüschel',.12],['Tamariske',.05]],
 dschBaum:[['Urwaldriese',.12],['Kokospalme',.1],['Bananenstaude',.1],['Bambus',.08],['Riesenfarn',.13],['Blütenbusch',.1],['Würgefeige',.07],['Baumfarn',.1],['Lianenbaum',.08],['Helikonie',.06],['Elefantenohr',.06]],
 dschUnter:[['Riesenfarn',.2],['Elefantenohr',.15],['Orchideenbusch',.12],['Helikonie',.1],['Ameisenstraße',.04],['Steinkopf',.01]],
 dschlamm:[['Elefantenohr',.1],['Riesenfarn',.08],['Baumfarn',.05]],dsererde:[['Bananenstaude',.06],['Bambus',.08],['Orchideenbusch',.06],['Steinkopf',.006]],
 sumpf:[['Trauerweide',.06],['Toter Baum',.06],['Mangrove',.06],['Schilf',.2],['Pilze',.03],['Moorhand',.004],['Grasbüschel',.05],['Erle',.06],['Sumpfzypresse',.04],['Rohrkolben',.1],['Krumme Birke',.04],['Weidenbusch',.05],['Helm im Schlamm',.006],['Versunkener Karren',.003],['Pfahl mit Laterne',.003]],
 sschlamm:[['Rohrkolben',.12],['Schilf',.1],['Toter Baum',.04],['Helm im Schlamm',.008],['Moorhand',.004]],smoor:[['Seerosen',.15],['Schilf',.1],['Mangrove',.04],['Moorhand',.003],['Rohrkolben',.06]],
 fels:[['Felsblock',.05],['Graue Felsnadel',.02],['Bergkiefer',.04],['Latschen',.06],['Steinmann',.006],['Ziegenschädel',.003],['Geröllhaufen',.04],['Altar mit Knochen',.002]],
 geroell:[['Geröllhaufen',.08],['Felsblock',.04],['Latschen',.05],['Bergkiefer',.02]],schnee:[['Verschneite Tanne',.04],['Eisfels',.04],['Steinmann',.004],['Felsblock',.02]],
 wiese:[['Blumen',.03],['Grasbüschel',.025],['Busch',.015],['Feldstein',.008],['Apfelbaum',.006],['Pappel',.006],['Haselstrauch',.01],['Holunder',.008],['Distelbusch',.01],['Vogelscheuche',.001],['Grenzstein',.001],['Heuhaufen',.002],['Wegkreuz',.001],['Eiche',.004],['Birke',.004]],
 trocken:[['Distelbusch',.03],['Grasbüschel',.03],['Dürrbusch',.01],['Feldstein',.01]],erde:[['Feldstein',.02],['Distelbusch',.02],['Maulwurfshügel',0]],kies:[['Feldstein',.03]]};
const EINZEL={[BIOM.KERN]:['Eiche','Birke'],[BIOM.WALD]:['Buche','Eiche'],[BIOM.WUESTE]:['Akazie','Dattelpalme'],[BIOM.DSCHUNGEL]:['Kokospalme','Urwaldriese'],[BIOM.SUMPF]:['Trauerweide','Erle'],[BIOM.GEBIRGE]:['Bergkiefer','Felsblock']};
function waehle(biom,boden,tx,ty,dichte,licht){const r=h2(tx,ty,9),q=h2(tx,ty,10);
 if(boden==='fels')return wahl(r,L.fels);if(boden==='geroell')return wahl(r,L.geroell);if(boden==='schnee')return wahl(r,L.schnee);
 if(licht&&boden!=='moor'&&boden!=='wasser'){const e=EINZEL[biom]||EINZEL[0];return r<.012?A[e[q<.5?0:1]]:0;}
 if(biom===BIOM.WALD||boden==='wald'||boden==='nadel'){
  if(boden==='wald'){if(r<.2+dichte*.5)return wahl(q,L.waldBaum);if(r<.8)return wahl(q,L.waldUnter);return 0;}
  if(boden==='nadel'){if(r<.25+dichte*.45)return wahl(q,L.nadelBaum);if(r<.62)return wahl(q,L.nadelUnter);return 0;}
  if(boden==='erde')return wahl(r,L.walderde);if(boden==='wiese')return wahl(r,L.waldwiese);return 0;}
 if(biom===BIOM.WUESTE){if(boden==='sand')return wahl(r,L.sand);if(boden==='kies')return wahl(r,L.wkies);if(boden==='trocken')return wahl(r,L.wtrocken);if(boden==='wiese')return wahl(r,L.oase);return 0;}
 if(biom===BIOM.DSCHUNGEL){if(boden==='dsch'){if(r<.24+dichte*.48)return wahl(q,L.dschBaum);if(r<.55)return wahl(q,L.dschUnter);return 0;}
  if(boden==='schlamm')return wahl(r,L.dschlamm);if(boden==='erde')return wahl(r,L.dsererde);if(boden==='moor'||boden==='wasser')return r<.16?A['Seerosen']:0;return 0;}
 if(biom===BIOM.SUMPF){if(boden==='sumpf')return wahl(r,L.sumpf);if(boden==='schlamm')return wahl(r,L.sschlamm);if(boden==='moor'||boden==='wasser')return wahl(r,L.smoor);return 0;}
 if(boden==='wiese')return wahl(r,L.wiese);if(boden==='trocken')return wahl(r,L.trocken);if(boden==='erde')return wahl(r,L.erde);if(boden==='kies')return wahl(r,L.kies);return 0;}
// Vor T3 (nur Tageslauf-Editor, kleine Karte): alte Auswahl und alte Varianten, damit der Editor gleich aussieht
function waehleAlt(biom,boden,tx,ty,dichte){const r=h2(tx,ty,9),q=h2(tx,ty,10);
 if(biom===BIOM.WALD||boden==='wald'){if(boden==='wald'){if(r<.18+dichte*.5)return wahl(q,[['Eiche',.42],['Tanne',.4],['Birke',.18]]);if(r<.78)return wahl(q,[['Busch',.22],['Farn',.24],['Pilze',.12],['Baumstumpf',.1],['Moosfels',.12],['Totholz',.1],['Grasbüschel',.1]]);return 0;}
  if(boden==='wiese')return wahl(r,[['Blumen',.07],['Busch',.03],['Birke',.02],['Grasbüschel',.05]]);return 0;}
 if(biom===BIOM.WUESTE){if(boden==='sand')return wahl(r,[['Saguaro',.022],['Feigenkaktus',.02],['Dürrbusch',.03],['Sandsteinfels',.012],['Säulenstumpf',.004],['Gerippe',.004]]);
  if(boden==='wiese')return wahl(r,[['Dattelpalme',.32],['Busch',.08],['Grasbüschel',.12]]);return 0;}
 if(biom===BIOM.DSCHUNGEL){if(boden==='dsch'){if(r<.22+dichte*.48)return wahl(q,[['Urwaldriese',.18],['Kokospalme',.16],['Bananenstaude',.15],['Bambus',.12],['Riesenfarn',.21],['Blütenbusch',.18]]);return 0;}
  if(boden==='moor'||boden==='wasser')return r<.16?A['Seerosen']:0;return 0;}
 if(biom===BIOM.SUMPF){if(boden==='sumpf')return wahl(r,[['Trauerweide',.06],['Toter Baum',.06],['Mangrove',.07],['Schilf',.22],['Pilze',.04],['Moorhand',.004],['Grasbüschel',.06]]);
  if(boden==='moor'||boden==='wasser')return wahl(r,[['Seerosen',.15],['Schilf',.1],['Mangrove',.04],['Moorhand',.003]]);return 0;}
 if(boden==='wiese')return wahl(r,[['Blumen',.035],['Grasbüschel',.03],['Busch',.008],['Feldstein',.006]]);return 0;}
const varianteAlt=(tx,ty)=>{const v=(h2(tx,ty,13)*6)|0;return v%3+(v>=3?VARN:0);};
// ---------- Kleinzeug (T3) ----------
// Je Biom und Boden eine Liste kleiner Arten. kleinArt(biom, boden, r) wählt eine; wie viele auf einem Feld liegen, entscheidet
// die Karte (welt-raster.js, kz/kleinMalen). Wasser bekommt nichts, Moor nur Sumpfiges.
const K=(...n)=>n.map(x=>A[x]);
const KL={[BIOM.KERN]:K('Grashalme','Klee','Grashalme','Gänseblümchen','Löwenzahn','Grashalme','Kiesel','Klee','Mohn','Maulwurfshügel','Verlorene Sandale','Hufeisen'),
 [BIOM.WALD]:K('Laub','Laub','Zapfen','Moospolster','Eicheln','Buschwindröschen','Zweige','Farnkeimling','Fliegenpilz mit Ratte','Grashalme'),
 [BIOM.WUESTE]:K('Wüstenkiesel','Wüstenkiesel','Sandgras','Schlangenhaut','Wüstenblume','Rippenknochen','Tonscherben','Spur im Sand'),
 [BIOM.DSCHUNGEL]:K('Dschungellaub','Dschungellaub','Blütenblätter','Pilzring','Wurzeln','Käfer','Frosch','Moos am Boden'),
 [BIOM.SUMPF]:K('Torfbrocken','Sumpfdotterblume','Sumpfmoos','Sumpfmoos','Moorknochen','Blasen','Sumpfgras','Sumpfgras','Libelle'),
 [BIOM.GEBIRGE]:K('Geröll','Geröll','Edelweiß','Enzian','Flechten','Schneehaufen','Steinsplitter','Murmeltierknochen','Bergkristall','Gämshorn')};
// Seltenes (Humor) nur jedes zehnte Mal, sonst das Gewöhnliche vorn in der Liste
const SELTEN=new Set(K('Mohn','Maulwurfshügel','Verlorene Sandale','Hufeisen','Fliegenpilz mit Ratte','Schlangenhaut','Rippenknochen','Spur im Sand','Frosch','Moorknochen','Murmeltierknochen','Bergkristall','Gämshorn'));
const KB={wiese:BIOM.KERN,trocken:BIOM.KERN,erde:BIOM.KERN,kies:BIOM.KERN,wald:BIOM.WALD,nadel:BIOM.WALD,sand:BIOM.WUESTE,dsch:BIOM.DSCHUNGEL,schlamm:BIOM.SUMPF,sumpf:BIOM.SUMPF,fels:BIOM.GEBIRGE,geroell:BIOM.GEBIRGE,schnee:BIOM.GEBIRGE};
const MOOR_K=K('Blasen','Sumpfmoos','Sumpfgras','Libelle');
function kleinArt(biom,boden,r,r2){if(boden==='wasser')return 0;if(boden==='moor')return MOOR_K[(r*MOOR_K.length)|0];let b=biom;if(boden==='fels'||boden==='geroell'||boden==='schnee')b=BIOM.GEBIRGE;else if(b===BIOM.KERN&&KB[boden]!=null)b=KB[boden];
 if(boden==='schnee')return r<.5?A['Schneehaufen']:r<.75?A['Geröll']:A['Steinsplitter'];
 const l=KL[b]||KL[0];let a=l[(r*l.length)|0];if(SELTEN.has(a)&&r2>.1)a=l[(r2*3)|0];return a;}
const KLEIN_ARTEN=ARTEN.filter(a=>a&&a.klein).map(a=>a.id),GROSS_ARTEN=ARTEN.filter(a=>a&&!a.klein).map(a=>a.id);
window.WeltNatur={ARTEN,BIOM,BIOM_NAME,nr,bild,variante,varianteAlt,waehle,waehleAlt,kleinArt,KLEIN_ARTEN,GROSS_ARTEN,VARN,h2};
})();
