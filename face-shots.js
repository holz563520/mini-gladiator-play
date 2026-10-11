'use strict';
// GROSSAUFNAHMEN DER KÄMPFER · TESTFASSUNG (nicht im Hauptspiel geladen)
// Großes Pixelbild von Kopf und Schultern im Stil der Nahaufnahmen aus Intro und Attentat: kleines Bild (160 × 104),
// ganzzahlig vergrößert. Haut, Schatten, Haar, Frisur und Bart kommen vom Gladiator (g.appearance); Helm, Brustpanzer
// und Schulterplatten von dem, was er wirklich trägt (M.armorItems, Farben aus M.itemLook je Material und Güte).
// Dazu Mimik je Stimmung und eine Kamera, die langsam um den Kopf fährt (yaw: Gesichtszüge, Ohren und Hintergrund
// verschieben sich gegeneinander). Reine Darstellung.
(()=>{
const M=window.MG;if(!M)return;
const FW=160,FH=104,cl=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=v=>{v=cl(v);return v*v*(3-2*v);};
const mix=(a,b,k)=>{const p=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)),x=p(a),y=p(b);return '#'+x.map((v,i)=>Math.max(0,Math.min(255,Math.round(v+(y[i]-v)*k))).toString(16).padStart(2,'0')).join('');};
const hex=c=>/^#[0-9a-f]{6}$/i.test(c||'')?c:null;
// Mimik: Augenöffnung, Pupillen, Brauen (inner/outer: + ist tiefer), Mund, Zugaben
const MOODS={
 calm:{open:1,brow:[0,0],mouth:'line'},
 confident:{open:.75,brow:[1,-1],lift:1,mouth:'smirk'},
 grin:{open:.45,brow:[-1,0],mouth:'grin'},
 determined:{open:.8,brow:[2,-1],mouth:'firm'},
 dumb:{open:1.25,brow:[-3,-3],uneven:2,cross:1,mouth:'gape'},
 nervous:{open:1.1,brow:[-2,1],dart:1,mouth:'wobble',sweat:1},
 scared:{open:1.35,brow:[-3,1],tiny:1,mouth:'o',sweat:2,pale:.35,tremble:1},
 plead:{open:1.3,brow:[-4,2],up:1,mouth:'wobble',tears:1,pale:.15},
 terror:{open:1.45,brow:[-4,1],tiny:1,mouth:'o',tears:2,sweat:2,pale:.45,tremble:1},
 relief:{open:.18,brow:[-3,1],mouth:'grin',tears:2},
 roar:{open:.5,brow:[3,-2],mouth:'roar'},
 shock:{open:1.4,brow:[-3,0],tiny:1,mouth:'o'},
 pain:{open:.15,brow:[2,-2],mouth:'teeth'},
 out:{open:0,brow:[0,0],mouth:'slack',pale:.5}};
function tools(q){const r=(x,y,w,h,c)=>{q.fillStyle=c;q.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};return {r};}
// ---------- Hintergrund: Arenamauer, Ränge, Banner in Mannschaftsfarbe, Fackelschein; verschiebt sich gegen die Kamera ----------
function backdrop(q,T,o,yaw,t){const sx=Math.round(-yaw*14),team=o.team===1?['#6e201b','#a3352c','#d6b45a']:o.team===0?['#1d4a6e','#2f7fb8','#d6b45a']:['#4a3f22','#7a6a3a','#d6b45a'];
 T.r(0,0,FW,FH,'#1c150e');for(let y=0;y<34;y+=2)for(let x=-20;x<FW+20;x+=3){const n=Math.sin(x*12.9+y*78.2)*43758.5,v=n-Math.floor(n);T.r(x+sx*.5+(y%4?1:0),y,2,2,v>.66?'#5a4632':v>.33?'#3f3122':'#2c2218');}
 T.r(0,34,FW,3,'#8a7550');T.r(0,37,FW,FH,'#3a2c1c');for(let x=-30;x<FW+30;x+=22){T.r(x+sx,40,20,30,'#4a3824');T.r(x+sx,40,20,1,'#6a5236');}
 for(const bx of [18,134]){T.r(bx+sx,0,12,46,team[0]);T.r(bx+2+sx,0,8,44,team[1]);T.r(bx+2+sx,22,8,2,team[2]);T.r(bx+4+sx,30,4,4,team[2]);}
 const gx=128+sx,gl=q.createRadialGradient(gx,18,2,gx,18,70);gl.addColorStop(0,'rgba(245,170,90,'+(.5+.06*Math.sin(t*9)).toFixed(3)+')');gl.addColorStop(1,'rgba(0,0,0,0)');q.fillStyle=gl;q.fillRect(0,0,FW,FH);
 for(let i=0;i<6;i++){const k=(t*.22+i/6)%1;T.r(10+i*27+sx*.3+Math.sin(t+i)*3,FH-4-k*70,1,1,'#e8c890');}}
// Am Boden: Sand der Arena von oben, mit Wellen, Steinchen und Blut
function sand(q,T,o,t){T.r(0,0,FW,FH+40,'#b38c54');for(let y=0;y<FH+40;y+=2)for(let x=0;x<FW;x+=2){const n=Math.sin(x*12.9898+y*78.233)*43758.5453,v=n-Math.floor(n);if(v>.8)T.r(x,y,2,1,'#c9a268');else if(v<.12)T.r(x,y,2,1,'#96733f');}
 for(let i=0;i<7;i++)for(let x=0;x<FW;x+=3)T.r(x,12+i*17+Math.round(Math.sin(x*.07+i*1.7)*3),3,1,'#a17c47');
 for(const [x,y,r] of [[30,70,9],[120,30,6],[136,84,11],[52,22,4]]){for(let j=-r;j<=r;j++){const hw=Math.sqrt(r*r-j*j)*1.5;T.r(x-hw,y+j*.5,hw*2,1,'#7b2f2a');}}
 if(o.pool>0){const r=10+o.pool*24;for(let j=-r;j<=r;j++){const hw=Math.sqrt(r*r-j*j)*1.6;T.r(80-hw,88+j*.45,hw*2,1,j>r*.3?'#5e1f1c':'#8f2f28');}}}
// ---------- Schultern und Rüstung ----------
function torso(q,T,C,o,yaw){const H=o.ground?FH+38:FH,sx=Math.round(yaw*3),A=o.armor||{},chest=A.chestplate,sk=C.skin,sh=C.shade,row=(y,hw,c0,c1,c2)=>{for(let x=-Math.ceil(hw);x<Math.ceil(hw);x++){const s=x/hw;T.r(80+sx+x,y,1,1,s>.5?c2:s<-.55?c0:c1);}};
 for(let y=80;y<H;y++){const hw=30+(y-80)*4.4;row(y,Math.min(80,hw),C.light,sk,sh);}
 // Trapezmuskel und Schlüsselbein
 T.r(80+sx-30,88,22,1,C.light);T.r(80+sx+10,88,22,1,sh);
 if(chest){const p=M.itemLook(chest),soft=chest.material==='leather',mid=chest.material==='medium',base=mid?p.leather:p.metal,q2=chest.q||0;
  for(let y=88;y<H;y++){const hw=Math.min(72,38+(y-88)*3.6);row(y,hw,mix(base,'#ffffff',.18),base,mix(base,'#000000',.3));}
  // Halsausschnitt
  for(let y=88;y<98;y++){const hw=17-(y-88)*1.5;if(hw>0)row(y,hw,C.light,sk,sh);}
  for(let x=-17;x<=17;x++)T.r(80+sx+x,88+Math.round(Math.max(0,10-Math.abs(x)*.6)),1,2,p.trim);
  if(soft){for(let x=-50;x<=50;x+=6)T.r(80+sx+x,101,2,1,p.edge);T.r(80+sx-1,100,2,FH,p.dark);if(q2>=3)for(const x of [-30,30])T.r(80+sx+x,97,3,3,p.stud);}
  else{T.r(80+sx-44,99,88,1,p.edge);T.r(80+sx-1,100,2,FH,mix(base,'#000000',.4));for(const x of [-36,-22,22,36])T.r(80+sx+x,102,2,2,p.stud||p.edge);if(mid)for(const x of [-28,28]){T.r(80+sx+x-3,94,6,FH,p.metal);T.r(80+sx+x-3,94,1,FH,p.edge);}}
  if(q2>=5)T.r(80+sx-3,96,6,6,p.gem||p.trim);}
 else{/* nackter Oberkörper mit Schultergurt */for(let i=0;i<34;i++){T.r(80+sx-44+i*2.2,FH-2-i*.75,5,2,'#5a4128');T.r(80+sx-44+i*2.2,FH-2-i*.75,5,1,'#7b5a38');}}
 // Schulterplatten: Bildseite links ist seine rechte Schulter
 for(const [id,side] of [['rightshoulder',-1],['leftshoulder',1]]){const it=A[id];if(!it)continue;const p=M.itemLook(it),base=it.material==='medium'?p.leather:p.metal,x0=80+sx+side*56,far=side*yaw>0?.82:1;
  for(let y=0;y<24;y++){const hw=(26-Math.abs(y-8)*.9)*far;for(let x=-Math.ceil(hw);x<Math.ceil(hw);x++)T.r(x0+x,79+y,1,1,y<2?mix(base,'#ffffff',.3):x*side>hw*.4?mix(base,'#000000',.3):base);}
  T.r(x0-22*far,92,44*far,2,p.trim);T.r(x0-2,84,4,4,p.stud||p.edge);if(it.material==='leather')for(let x=-16;x<=16;x+=5)T.r(x0+x*far,97,2,1,p.edge);else T.r(x0-20*far,96,40*far,1,mix(base,'#000000',.35));}}
// ---------- Kopf: eigene Fläche, damit er als Ganzes sinken und kippen kann ----------
function head(q,T,C,o,yaw,t,mood){const m=MOODS[mood]||MOODS.calm,R=31,top=10,cx=80+Math.round(yaw*3),fx=yaw*7,pale=Math.max(m.pale||0,o.pale||0),A=o.armor||{},helm=A.helm;
 const skin=mix(C.skin,'#c9c4b0',pale*.6),shade=mix(C.shade,'#8a8778',pale*.6),light=mix(C.light,'#e6e2d0',pale*.5),dark=mix(shade,'#2a160e',.4),lip=mix(shade,'#8a2a24',.45),hair=C.hair,hair2=mix(hair,'#000000',.3),st=C.style,beard=C.beard;
 const half=y=>{const u=(y-30)/(y<30?36:44);let hw=R*Math.sqrt(Math.max(0,1-u*u));if(y>46)hw-=(y-46)*.42;if(y>63)hw=0;return Math.max(0,hw);},Y=y=>top+y;
 // Hals
 T.r(cx-15,Y(54),30,34,shade);T.r(cx-15,Y(54),21,34,skin);T.r(cx-15,Y(54),4,34,light);T.r(cx-13,Y(64),26,2,dark);
 // langes Haar hinter dem Kopf
 if(st===3||st===4){T.r(cx-R-3-fx*.3,Y(8),7,52,hair);T.r(cx+R-4-fx*.3,Y(8),7,50,hair2);}
 // Ohren: das der Kamera abgewandte verschwindet
 for(const sd of [-1,1]){const vis=1-cl(sd*yaw*1.3,0,1);if(vis<.2)continue;const w=Math.round(4*vis);T.r(cx+sd*(half(27)+(sd>0?0:-w))+(sd>0?0:0),Y(23),w,13,sd<0?skin:shade);T.r(cx+sd*(half(27)+(sd>0?1:-w+1)),Y(26),Math.max(1,w-2),6,dark);}
 // Gesichtsfläche mit Haaransatz und Bart
 const line=st===0?-99:st===1?8:st===5?7:10;
 for(let y=-4;y<66;y++){const hw=half(y);if(hw<1)continue;for(let x=Math.floor(-hw);x<Math.ceil(hw);x++){const s=(x+.5)/hw,sf=s-yaw*.35;let c=skin;
   if(y<line+Math.abs(sf)*5)c=s>.35?hair2:hair;else if(s>.62-yaw*.25)c=shade;else if(s<-.72-yaw*.2)c=light;else if(y>58)c=mix(skin,shade,.5);
   if(beard===2&&y>43&&!(Math.abs(sf)<.3&&y<52))c=s>.35?hair2:hair;else if(beard===3&&Math.abs(sf)<.36&&y>50)c=hair;else if(beard===1&&y>46)c=mix(c,hair,.35);
   T.r(cx+x,Y(y),1,1,c);}}
 if(st===0){T.r(cx-R+1,Y(14),4,10,hair);T.r(cx+R-5,Y(14),4,10,hair2);}
 if(st===2){for(let i=0;i<6;i++)T.r(cx-18+i*7-fx*.4,Y(9),4,5+(i%2)*2,hair);}
 if(st===4||st===5){T.r(cx-5,Y(-12),10,10,hair);T.r(cx-3,Y(-15),6,4,hair);T.r(cx+2,Y(-12),3,10,hair2);}
 // Narbe für alle, die schon etwas hinter sich haben
 if(o.scar){for(let i=0;i<13;i++)T.r(cx-20+fx+i*.9,Y(30+i),2,1,'#e3b6a8');T.r(cx-21+fx,Y(34),1,1,dark);T.r(cx-14+fx,Y(38),1,1,dark);}
 // Augen
 const blink=(t%3.7)<.12&&m.open>.2?.1:1,open=m.open*blink,ex=13,ey=Y(26),near=s=>1-cl(s*yaw*.45,0,.4);
 for(const sd of [-1,1]){const ew=Math.round(11*near(sd)),x0=Math.round(cx+sd*ex+fx-ew/2),eh=Math.round(5*Math.min(1.4,open)),up=m.uneven&&sd>0?-m.uneven:0;
  if(open<.12){T.r(x0,ey+2,ew,1,dark);T.r(x0,ey+3,ew,1,shade);}
  else{T.r(x0-1,ey-1+up,ew+2,eh+2,dark);T.r(x0,ey+up,ew,eh,'#efe6d6');const ps=m.tiny?2:3,dx=m.cross?sd*-2:m.dart?Math.round(Math.sin(t*5.5)*2.5):Math.round(yaw*-2),dy=m.cross?(sd<0?-1:1):m.up?-2:0;T.r(x0+Math.round(ew/2)-1+dx,ey+up+Math.max(0,Math.round(eh/2)-1)+dy,ps,Math.min(ps,eh),'#2a1810');if(!m.tiny)T.r(x0+Math.round(ew/2)-1+dx,ey+up+Math.max(0,Math.round(eh/2)-1)+dy,1,1,'#ffffff');}
  // Braue
  const bi=m.brow[0],bo=m.brow[1],raise=(m.lift&&sd>0?-3:0)+up;for(let i=0;i<ew+4;i++){const inner=sd<0?i/(ew+3):1-i/(ew+3);T.r(x0-2+i,ey-6+raise+Math.round(bo+(bi-bo)*inner),1,2,helm?dark:hair);}
  if(open<.6&&open>.12)T.r(x0,ey+up+eh,ew,1,shade);
  if(m.tears){const ty=ey+up+Math.max(2,eh),tx=x0+(sd<0?1:ew-3);T.r(tx,ty,2,2,'#dff0fa');T.r(tx,ty,1,1,'#ffffff');if(m.tears>1){const run=((t*.9+(sd>0?.4:0))%1),len=6+Math.round(run*20);T.r(tx,ty+2,2,len,'#bcd9ea');T.r(tx,ty+2+len,2,2,'#dff0fa');}}}
 if(o.hurt>0){/* Platzwunde über der Braue, Blut läuft herab; blaues Auge */const hx=cx-16+fx,n=Math.round(o.hurt*34);T.r(hx-3,Y(13),8,2,'#6b2420');T.r(hx,Y(14),2,n,'#a8372f');T.r(hx+1,Y(14)+n,2,2,'#6b2420');if(o.hurt>.4){q.globalAlpha=.45;T.r(cx+ex+fx-8,ey-2,17,11,'#5a2a52');q.globalAlpha=1;T.r(cx+fx+3,Y(54),2,5,'#a8372f');}}
 // Nase
 const nx=cx+fx*1.5;T.r(nx-1,Y(30),3,13,shade);T.r(nx-4,Y(42),8,3,shade);T.r(nx-2,Y(31),1,10,light);T.r(nx-4,Y(44),2,1,dark);T.r(nx+2,Y(44),2,1,dark);
 // Mund
 const mw=18,mx=Math.round(cx+fx-mw/2),my=Y(51),mouth=m.mouth,bearded=beard===2;
 if(mouth==='line')T.r(mx+2,my+2,mw-4,2,lip);
 else if(mouth==='firm'){T.r(mx+1,my+2,mw-2,2,dark);T.r(mx,my+3,2,1,dark);T.r(mx+mw-2,my+3,2,1,dark);}
 else if(mouth==='smirk'){for(let i=0;i<mw;i++)T.r(mx+i,my+3-Math.round(Math.max(0,i-mw*.45)*.35),1,2,lip);T.r(mx+mw,my-1,1,3,shade);}
 else if(mouth==='grin'){const gw=mw+8,gx=mx-4;T.r(gx,my,gw,7,'#2a0806');T.r(gx+1,my+1,gw-2,3,'#f0e8d4');for(let i=3;i<gw-2;i+=4)T.r(gx+i,my+1,1,3,'#b8ad96');T.r(gx+2,my+5,gw-4,1,'#7a1c16');T.r(gx-1,my-2,2,3,shade);T.r(gx+gw-1,my-2,2,3,shade);T.r(gx-3,my-4,2,2,shade);T.r(gx+gw+1,my-4,2,2,shade);}
 else if(mouth==='gape'){T.r(mx+4,my,10,6,'#2a0806');T.r(mx+5,my,3,2,'#efe6d6');T.r(mx+5,my+4,8,2,'#8a3a34');}
 else if(mouth==='o'){T.r(mx+4,my-1,10,9,'#2a0806');T.r(mx+5,my-1,8,2,'#e6dcc6');T.r(mx+6,my+5,6,2,'#5a1410');}
 else if(mouth==='wobble'){for(let i=0;i<mw-2;i++)T.r(mx+1+i,my+2+Math.round(Math.sin(i*.9+t*9)*1.4),1,2,lip);}
 else if(mouth==='roar'){T.r(mx-4,my-5,mw+8,17,'#2a0806');T.r(mx-3,my-5,mw+6,3,'#f0e8d4');for(let i=1;i<mw+4;i+=4)T.r(mx-3+i,my-5,1,3,'#b8ad96');T.r(mx-2,my+9,mw+4,3,'#e0d6c0');T.r(mx+1,my+3,mw-2,5,'#8a3a34');T.r(mx-6,my-7,2,4,shade);T.r(mx+mw+4,my-7,2,4,shade);}
 else if(mouth==='teeth'){T.r(mx,my,mw,6,'#2a0806');T.r(mx+1,my,mw-2,2,'#e6dcc6');T.r(mx+1,my+4,mw-2,2,'#d6ccb6');}
 else if(mouth==='slack'){T.r(mx+3,my+2,mw-6,2,lip);T.r(mx+mw-6,my+4,2,4,'#d9e6f0');}
 if(bearded&&!['grin','o','gape','teeth'].includes(mouth))T.r(mx-1,my-3,mw+2,2,hair);
 if(o.blood>0){const n=Math.round(o.blood*10);T.r(mx+mw-5,my+4,2,n,'#a8372f');T.r(mx+mw-5,my+4+n,2,1,'#6b2420');}
 // Schweiß
 for(let i=0;i<(m.sweat||0);i++){const k=(t*.8+i*.5)%1;T.r(cx+(i?-R+5:R-7)-fx*.2,Y(14+k*30),2,3,'#cfe4f2');T.r(cx+(i?-R+5:R-7)-fx*.2,Y(13+k*30),1,1,'#ffffff');}
 // Helm über allem, was er verdeckt
 if(helm){const p=M.itemLook(helm),soft=helm.material==='leather',mid=helm.material==='medium',dome=mid?p.leather:p.metal,q2=helm.q||0,hi=mix(dome,'#ffffff',.28),lo=mix(dome,'#000000',.32);
  for(let y=-7;y<19;y++){const hw=half(Math.max(2,y))+3;for(let x=Math.floor(-hw);x<Math.ceil(hw);x++){const s=x/hw;T.r(cx+x,Y(y),1,1,s<-.5?hi:s>.45?lo:dome);}}
  T.r(cx-R-3,Y(17),R*2+6,4,soft&&q2<5?p.dark:p.trim);T.r(cx-R-3,Y(17),R*2+6,1,p.edge);
  if(q2>=1)for(const sd of [-1,1]){const w=Math.round(9*near(sd));T.r(cx+sd*(R-2)-(sd<0?0:w),Y(20),w,30,mid?p.metal:dome);T.r(cx+sd*(R-2)-(sd<0?0:w),Y(20),1,30,sd<0?hi:lo);T.r(cx+sd*(R-2)-(sd<0?0:w),Y(48),w,2,p.trim);}
  if(q2>=2)T.r(cx+fx*1.5-1,Y(20),3,14,p.trim);
  if(mid){T.r(cx-10,Y(-9),20,4,p.metal);T.r(cx-10,Y(-9),20,1,p.edge);}
  if(soft&&q2>=2)for(let x=-22;x<=22;x+=6)T.r(cx+x,Y(8),2,2,p.edge);
  if(q2>=3){for(let y=0;y<16;y++){const w=10-Math.abs(y-6)*.5;T.r(cx-w/2,Y(-22+y),w,1,y%4===0?mix(p.cloth,'#000000',.25):p.cloth);}T.r(cx-9,Y(-8),18,3,p.trim);}
  if(q2>=5)for(const sd of [-1,1]){T.r(cx+sd*(R-4)-3,Y(-10),6,9,p.trim);T.r(cx+sd*(R-4)-2,Y(-13),4,4,p.edge);}
  if(q2===6){T.r(cx-1,Y(-30),3,9,p.edge);T.r(cx-2,Y(12),5,5,p.gem||'#c06d45');}}}
const bufs=new WeakMap();
// o: {g, team, mood, yaw?, sink?, tilt?, dark?, pale?, blood?, zoom?}; t: Sekunden seit Beginn der Einstellung
function paint(g,w,h,o,t){let B=bufs.get(g.canvas);if(!B){B={a:document.createElement('canvas'),b:document.createElement('canvas'),c:document.createElement('canvas'),d:document.createElement('canvas')};B.a.width=B.b.width=B.c.width=B.d.width=FW;B.a.height=B.b.height=B.c.height=B.d.height=FH+40;bufs.set(g.canvas,B);}
 const colors=x=>{const A=x?.appearance||{},skin=hex(A.skin)||'#c19169',shade=hex(A.shade)||'#875e43';return {skin,shade,light:mix(skin,'#fff2dc',.22),hair:hex(A.hair)||'#443025',style:(A.style??1)%6,beard:(A.beard??0)%4};},gearOf=x=>{const r={};try{for(const it of M.armorItems(x)||[])r[it.def]=it;}catch{}return r;},C=colors(o.g),armor=gearOf(o.g);
 const opt={...o,armor,scar:o.scar??((o.g?.scars||[]).length>0||(o.g?.kills||0)>=5)},mood=o.mood||'calm',m=MOODS[mood]||MOODS.calm;
 // Kamerafahrt um den Kopf: langsamer Schwenk von einer Seite zur anderen
 const yaw=o.yaw??Math.sin(t*.55+(o.team===1?Math.PI:0))*.75;
 const bq=B.a.getContext('2d');bq.imageSmoothingEnabled=false;bq.setTransform(1,0,0,1,0,0);bq.clearRect(0,0,FW,FH+40);const BT=tools(bq);
 if(o.ground)sand(bq,BT,opt,t);else backdrop(bq,BT,opt,yaw,t);
 // Figur auf eigener Fläche, damit sie am Boden als Ganzes liegen kann
 const q=B.c.getContext('2d');q.imageSmoothingEnabled=false;q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,FW,FH+40);const T=tools(q);torso(q,T,C,opt,yaw);
 const hq=B.b.getContext('2d');hq.imageSmoothingEnabled=false;hq.setTransform(1,0,0,1,0,0);hq.clearRect(0,0,FW,FH+40);hq.translate(0,20);head(hq,tools(hq),C,opt,yaw,t,mood);hq.setTransform(1,0,0,1,0,0);
 const bob=Math.round(Math.sin(t*1.6)*.6)+(m.tremble?Math.round(Math.sin(t*38)*.8):0);q.save();q.translate(80,70+(o.sink||0)+bob);q.rotate(o.tilt||0);q.drawImage(B.b,-80,-90);q.restore();
 if(o.fist||o.trophy){const pump=Math.round(Math.sin(t*7)*3),arm=(x0,x1,y1)=>{for(let y=y1;y<FH;y++){const u=(y-y1)/(FH-y1),x=x1+(x0-x1)*u;T.r(x-7,y,14,1,C.skin);T.r(x-7,y,3,1,C.light);T.r(x+4,y,3,1,C.shade);}};
  arm(24,20,24+pump);T.r(11,10+pump,19,16,C.skin);T.r(11,10+pump,19,3,C.light);T.r(26,10+pump,4,16,C.shade);for(let i=0;i<4;i++)T.r(12+i*4.5,13+pump,1,10,C.shade);
  const ty=o.trophy?-pump:pump;arm(138,142,(o.trophy?20:24)+ty);
  if(o.trophy){/* der Kopf des Besiegten, an den Haaren hochgehalten */const dq=B.d.getContext('2d');dq.imageSmoothingEnabled=false;dq.setTransform(1,0,0,1,0,0);dq.clearRect(0,0,FW,FH+40);dq.translate(0,20);head(dq,tools(dq),colors(o.trophy),{armor:{},pale:.7,hurt:.8,scar:false},-.2,t,'out');dq.setTransform(1,0,0,1,0,0);
   const sw=74,sh=80,dw=46,dh=50,dx=119+Math.round(Math.sin(t*2.2)*2),dy=22+ty;q.save();q.translate(dx+dw/2,dy);q.rotate(Math.sin(t*2.2)*.12);q.drawImage(B.d,43,14,sw,sh,-dw/2,0,dw,dh);q.restore();T.r(dx+14,dy+dh-2,18,3,'#6b2420');for(let i=0;i<4;i++){const k=((t*1.1+i*.27)%1);T.r(dx+16+i*4,dy+dh+1,i%2?1:2,3+Math.round(k*16),'#a8372f');}
   T.r(dx+13,dy-4,20,12,C.skin);T.r(dx+13,dy-4,20,3,C.light);T.r(dx+29,dy-4,4,12,C.shade);for(let i=0;i<4;i++)T.r(dx+15+i*4.5,dy-2,1,8,C.shade);}
  else{T.r(132,8+ty,19,16,C.skin);T.r(132,8+ty,19,3,C.light);T.r(147,8+ty,4,16,C.shade);for(let i=0;i<4;i++)T.r(133+i*4.5,11+ty,1,10,C.shade);}}
 const X=o.fx||{};
 if(X.stump>0){/* Halsstumpf mit pulsierendem Blut */T.r(66,84,28,4,'#6b2420');T.r(69,83,22,3,'#a8372f');T.r(78,83,4,2,'#efe6d0');for(let i=0;i<26;i++){const u=((X.stump*1.3+i/26)%1),a=-1.57+(((i*29)%26)/26-.5)*1.1,d=u*56*(.7+.3*Math.sin(X.stump*8));T.r(80+Math.cos(a)*d,84+Math.sin(a)*d+u*u*40,i%3?1:2,i%3?1:2,i%2?'#a8372f':'#c9584a');}}
 if(X.gash>0){/* quer durch den Rumpf */const p=cl(X.gash/.2),wd=Math.round(150*p);T.r(80-wd/2,96,wd,3,'#3d0f0d');T.r(80-wd/2,95,wd,1,'#c9584a');for(let i=0;i<24;i++){const x=80-wd/2+i*wd/24,l=cl((X.gash-.15-(i%5)*.06)*14,0,FH);T.r(x,99,i%2?1:2,l,'#a8372f');}}
 if(X.stab>0){/* Spitze von oben ins Herz */const p=cl(X.stab/.22),tx=86,ty=97,ang=-1.05,len=120,d=(1-p)*70;for(let i=0;i<len;i++){const w=i<10?1+i*.4:i<70?5:4;T.r(tx+Math.cos(ang)*(i+d)-w/2,ty+Math.sin(ang)*(i+d)-w/2,w,w,i<70?(i%6?'#c2cbc0':'#f4f6ea'):'#6e5230');}if(p>=1){const g=cl((X.stab-.22)/1.2);T.r(tx-4-g*10,ty-1,8+g*20,3+g*6,'#a8372f');for(let i=0;i<6;i++)T.r(tx-8+i*4,ty+3,i%2?1:2,g*(8+i*2),'#a8372f');}}
 if(X.blade>0&&X.blade<1){/* heller Hieb quer durchs Bild */q.globalAlpha=1-Math.abs(X.blade-.5)*1.4;const bx=-40+X.blade*240;for(let i=0;i<70;i++)T.r(bx-i*1.6,(X.bladeY||84)-8+i*.22,3,2,i<10?'#ffffff':'#e8ecdc');q.globalAlpha=1;}
 if(o.wave){/* winkende Hand */const hx=128+Math.round(Math.sin(t*9)*5),hy=40+Math.round(Math.cos(t*9)*2);T.r(hx+3,hy+14,8,40,C.shade);T.r(hx+3,hy+14,5,40,C.skin);T.r(hx,hy,14,15,C.skin);T.r(hx+11,hy,3,15,C.shade);for(let i=0;i<4;i++){T.r(hx+i*3.5,hy-9+(i%3===0?2:0),3,10,C.skin);T.r(hx+i*3.5+2,hy-9+(i%3===0?2:0),1,10,C.shade);}T.r(hx-4,hy+5,5,4,C.skin);}
 bq.save();if(o.ground){/* Schatten, dann die liegende Figur von schräg oben */bq.globalAlpha=.3;bq.fillStyle='#2a1a0c';bq.beginPath();bq.ellipse(84,62,58,40,-.5,0,Math.PI*2);bq.fill();bq.globalAlpha=1;bq.translate(80,56);bq.rotate(o.lie??-.62);bq.scale(.86,.86);bq.translate(-80,-50);}bq.drawImage(B.c,0,0);bq.restore();
 if(o.dark>0){bq.globalAlpha=cl(o.dark);bq.fillStyle='#050302';bq.fillRect(0,0,FW,FH+40);bq.globalAlpha=1;}
 // Ausgabe: füllt die Fläche, langsamer Zug ins Bild
 const z=(o.zoom||1)*1.12*(1+.07*ease(t/5)),s=Math.max(w/FW,h/FH)*z,dw=Math.round(FW*s),dh=Math.round(FH*s);g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;g.fillStyle='#120c09';g.fillRect(0,0,w,h);
 if(o.cheer){/* Blütenblätter und Tücher aus den Rängen */for(let i=0;i<34;i++){const n=Math.sin(i*91.7)*43758.5,v=n-Math.floor(n),k=((t*(.18+v*.22)+v*7)%1),x=(v*1.9*FW+Math.sin(t*1.3+i)*9)%FW,y=k*(FH+10)-6;BT.r(x,y,2+(i%3===0?1:0),2,['#d6453a','#f0c94a','#f4ead0','#c8372f'][i%4]);}}
 const sh=o.shake||0,ox=sh?Math.round((Math.random()-.5)*sh*s):0,oy=sh?Math.round((Math.random()-.5)*sh*s*.7):0;g.drawImage(B.a,0,0,FW,FH,Math.round(w/2-dw/2)+ox,Math.round(Math.min(0,(h-dh)*.42))+oy,dw,dh);
 if(o.lines>0){/* Schrei: Linien vom Rand zur Mitte */g.save();g.globalAlpha=cl(o.lines)*.75;g.strokeStyle='#fff6dc';g.lineWidth=Math.max(2,w/160);for(let i=0;i<18;i++){const a=i/18*Math.PI*2+Math.floor(t*14)*.37,r0=Math.max(w,h)*.74,r1=Math.max(w,h)*(.4+((i*7)%5)*.035);g.beginPath();g.moveTo(w/2+Math.cos(a)*r0,h*.45+Math.sin(a)*r0);g.lineTo(w/2+Math.cos(a)*r1,h*.45+Math.sin(a)*r1);g.stroke();}g.restore();}
 const vg=g.createRadialGradient(w/2,h*.45,Math.min(w,h)*.35,w/2,h*.5,Math.max(w,h)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.62)');g.fillStyle=vg;g.fillRect(0,0,w,h);}
M.faceShot={paint,moods:Object.keys(MOODS),FW,FH};
})();
