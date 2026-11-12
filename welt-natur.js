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
const BIOM={KERN:0,WALD:1,WUESTE:2,DSCHUNGEL:3,SUMPF:4},BIOM_NAME=['Wiese','Wald','Wüste','Dschungel','Sumpf'];

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

const nr=n=>ARTEN.findIndex(a=>a&&a.name===n),A={};for(const a of ARTEN)if(a)A[a.name]=a.id;
// ---------- Bilder (bei Bedarf, 3 Varianten × gespiegelt) ----------
const bilder=new Map();
function bild(id,v){const key=id*8+v;let b=bilder.get(key);if(b)return b;const a=ARTEN[id],s=v%3;
 if(v>=3){const o=bild(id,s),[c,g]=mk(a.w,a.h);g.translate(a.w,0);g.scale(-1,1);g.drawImage(o.img,0,0);b={img:c,ax:a.w-a.ax,ay:a.ay,flach:a.flach};}
 else{const [c,g]=mk(a.w,a.h),S=(x,y)=>h2(x|0,y|0,id*31+s*7+3);a.mal(g,s,S);b={img:c,ax:a.ax,ay:a.ay,flach:a.flach};}
 bilder.set(key,b);return b;}
const variante=(tx,ty)=>(h2(tx,ty,13)*6)|0;

// ---------- Was wächst wo ----------
// dichte 0…1 kommt aus großflächigem Rauschen (dichte Haine, lichte Stellen)
function wahl(r,liste){let s=0;for(const [n,p] of liste){s+=p;if(r<s)return A[n];}return 0;}
function waehle(biom,boden,tx,ty,dichte){const r=h2(tx,ty,9),q=h2(tx,ty,10);
 if(biom===BIOM.WALD||boden==='wald'){if(boden==='wald'){if(r<.18+dichte*.5)return wahl(q,[['Eiche',.42],['Tanne',.4],['Birke',.18]]);if(r<.78)return wahl(q,[['Busch',.22],['Farn',.24],['Pilze',.12],['Baumstumpf',.1],['Moosfels',.12],['Totholz',.1],['Grasbüschel',.1]]);return 0;}
  if(boden==='wiese')return wahl(r,[['Blumen',.07],['Busch',.03],['Birke',.02],['Grasbüschel',.05]]);return 0;}
 if(biom===BIOM.WUESTE){if(boden==='sand')return wahl(r,[['Saguaro',.022],['Feigenkaktus',.02],['Dürrbusch',.03],['Sandsteinfels',.012],['Säulenstumpf',.004],['Gerippe',.004]]);
  if(boden==='wiese')return wahl(r,[['Dattelpalme',.32],['Busch',.08],['Grasbüschel',.12]]);return 0;}
 if(biom===BIOM.DSCHUNGEL){if(boden==='dsch'){if(r<.22+dichte*.48)return wahl(q,[['Urwaldriese',.18],['Kokospalme',.16],['Bananenstaude',.15],['Bambus',.12],['Riesenfarn',.21],['Blütenbusch',.18]]);return 0;}
  if(boden==='moor'||boden==='wasser')return r<.16?A['Seerosen']:0;return 0;}
 if(biom===BIOM.SUMPF){if(boden==='sumpf')return wahl(r,[['Trauerweide',.06],['Toter Baum',.06],['Mangrove',.07],['Schilf',.22],['Pilze',.04],['Moorhand',.004],['Grasbüschel',.06]]);
  if(boden==='moor'||boden==='wasser')return wahl(r,[['Seerosen',.15],['Schilf',.1],['Mangrove',.04],['Moorhand',.003]]);return 0;}
 if(boden==='wiese')return wahl(r,[['Blumen',.035],['Grasbüschel',.03],['Busch',.008],['Feldstein',.006]]);return 0;}

window.WeltNatur={ARTEN,BIOM,BIOM_NAME,nr,bild,variante,waehle,h2};
})();
