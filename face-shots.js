'use strict';
// ARENA THEORY · FACE RENDERER V3 · optional replacement for dist/face-shots.js
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
function head(q,T,C,o,yaw,t,mood){
 const r=T.r,dx=Math.round(yaw*4),cx=80+dx,cy=10,m=MOODS[mood]||MOODS.calm;
 let seed=2166136261;for(const c of String(o.g?.appearance?.faceSeed??C.faceSeed??o.g?.id??C.identity??'portrait'))seed=Math.imul(seed^c.charCodeAt(0),16777619);seed>>>=0;
 const sx=.96+(seed%9)*.01,sy=.98+((seed>>>5)%5)*.01,pale=Math.max(m.pale||0,o.pale||0),sk=mix(C.skin,'#c9c4b0',pale*.6),sh=mix(C.shade,'#8a8778',pale*.6);
 const st=C.style,beard=C.beard;let feature=false;
 const X=x=>cx+x*sx+(feature?yaw*5:0),Y=y=>cy+y*sy;

 const P={outline:mix(sh,'#281b1b',.58),deep:mix(sh,'#3b2523',.40),shadow:mix(sh,'#794c3d',.20),half:mix(sk,sh,.38),skin:sk,warm:mix(sk,'#c98964',.25),light:mix(sk,'#f6d2a0',.30),bright:mix(sk,'#ffe0b2',.47),red:mix(sk,'#ad6054',.35),hair:C.hair,hairDark:mix(C.hair,'#100f13',.53),hairMid:mix(C.hair,'#927255',.23),hairLight:mix(C.hair,'#b79769',.36)};
 // Scanline polygons: actual pixel art, with no blurred edges or raster-image assets.
 function poly(points,color){const ps=points.map(([x,y])=>[X(x),Y(y)]);let lo=Math.floor(Math.min(...ps.map(p=>p[1]))),hi=Math.ceil(Math.max(...ps.map(p=>p[1])));for(let y=lo;y<hi;y++){const xs=[];for(let i=0,j=ps.length-1;i<ps.length;j=i++){const a=ps[j],b=ps[i];if((a[1]<=y+.5&&b[1]>y+.5)||(b[1]<=y+.5&&a[1]>y+.5))xs.push(a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort((a,b)=>a-b);for(let i=0;i<xs.length;i+=2)if(xs[i+1]>xs[i])r(Math.ceil(xs[i]),y,Math.floor(xs[i+1])-Math.ceil(xs[i])+1,1,color);}}
 const R=(x,y,w,h,c)=>r(X(x),Y(y),w*sx,h*sy,c);
 // Neck and the shadow cast by the jaw connect the portrait to the original torso.
 poly([[-13,55],[12,55],[14,76],[23,82],[-23,82],[-15,76]],P.half);
 poly([[-13,58],[-3,63],[-3,78],[-16,79]],P.light);poly([[3,63],[12,58],[14,76],[22,82],[6,82]],P.shadow);
 poly([[-14,57],[14,57],[12,65],[1,70],[-11,65]],P.deep);
 if(st===3||st===4){poly([[-24,5],[-33,17],[-32,73],[-23,77],[-21,40]],P.hair);poly([[22,7],[32,18],[31,74],[23,72],[22,37]],P.hairDark);for(const x of [-30,-26,26,29])R(x,31,1,36,x<0?P.hairMid:P.hair);}
 // Ears, helix and concha remain attached to the head silhouette.
 for(const sd of [-1,1]){const x=sd*28;R(x-3,25,6,16,P.deep);R(x-3,26,5,12,sd<0?P.warm:P.half);R(x-2,27,3,2,P.light);R(x-1,30,2,7,P.shadow);R(x-2,36,2,3,P.red);}
 // Angular skull: narrower temples and a distinct jaw, avoiding a circular mask.
 poly([[-20,0],[-8,-5],[10,-5],[23,2],[29,14],[28,39],[24,51],[16,60],[6,65],[-6,65],[-18,59],[-26,49],[-29,34],[-28,14]],P.outline);
 poly([[-19,1],[-7,-3],[11,-3],[22,4],[26,16],[25,37],[21,49],[13,58],[4,62],[-7,61],[-18,55],[-24,44],[-26,29],[-25,14]],P.skin);
 // Broad light planes are continuous, with smaller accents on the bony landmarks.
 poly([[-19,8],[-9,5],[-7,15],[-12,24],[-18,28],[-23,23],[-24,16]],P.light);
 poly([[-9,6],[10,5],[17,13],[14,19],[-6,18]],P.warm);
 poly([[18,8],[25,15],[25,36],[19,39],[14,30],[16,20]],P.shadow);
 poly([[-24,26],[-18,29],[-19,35],[-12,39],[-17,45],[-23,42],[-25,33]],P.half);
 poly([[-17,32],[-8,35],[-9,41],[-18,41],[-22,37]],P.light);
 poly([[-17,33],[-11,34],[-13,36],[-20,37]],P.bright);
 poly([[10,33],[18,31],[24,35],[20,43],[10,39]],P.half);
 poly([[10,33],[18,32],[20,34],[12,36]],P.warm);
 poly([[-18,42],[-8,45],[-9,52],[-19,50],[-23,44]],P.shadow);
 poly([[12,41],[21,39],[20,49],[11,55],[7,49]],P.shadow);
 feature=true;
 // Brow ridge, bridge and anatomical eye sockets.
 poly([[-23,23],[-17,20],[-8,21],[-4,25],[-7,30],[-19,30],[-24,27]],P.half);
 poly([[4,24],[9,21],[19,20],[23,24],[22,29],[8,30]],P.deep);
 poly([[-23,23],[-17,21],[-7,22],[-5,24],[-8,25],[-20,25]],P.shadow);
 poly([[6,24],[10,22],[20,22],[23,25],[19,26],[8,26]],P.shadow);
 const blink=(t%4.4)<.12&&m.open>.2,open=blink?0:m.open,look=m.dart?Math.round(Math.sin(t*5.5)*2):Math.round(yaw*1.6),eyeY=27;
 function eye(x,far){
  const w=far?10:12,up=m.uneven&&far?-2:0,yy=eyeY+up,eh=open<.2?0:Math.max(1,Math.round(open*3)),dx=(m.cross||o.crossEyes)?(far?-2:2):look;
  if(eh===0){R(x+1,yy+1,w-2,1,P.deep);R(x+2,yy+2,w-4,1,P.half);}
  else{
   R(x+1,yy-1,w-2,eh+3,P.shadow);R(x,yy,w,1,P.deep);R(x+1,yy+1,w-2,eh,'#c6b89c');R(x+2,yy+1,w-4,Math.max(1,eh-1),'#e0d4b7');
   const iw=m.tiny?2:3,ix=x+Math.floor(w/2)-1+dx,ih=Math.min(eh,iw),iy=yy+1+Math.max(0,Math.floor((eh-ih)/2)-(m.up?1:0));R(ix,iy,iw,ih,'#6d7960');R(ix+1,iy,1,ih,'#282c24');if(!m.tiny)R(ix,iy,1,1,'#f5efcf');
   R(x,yy+1,1,Math.min(2,eh),P.red);R(x+w-1,yy+1,1,eh,P.deep);R(x+2,yy+eh+1,w-4,1,P.half);R(x+3,yy+eh+2,w-5,1,P.light);
  }
  if(m.tears){const tx=x+(far?w-2:1),ty=yy+Math.max(2,eh);R(tx,ty,2,2,'#d2e6e4');if(m.tears>1){const len=3+((t*.8+(far?.4:0))%1)*15;R(tx,ty+2,1,len,'#a3c4c6');R(tx,ty+len+1,2,2,'#d7ebdf');}}
 }
 eye(-22,false);eye(9,true);
 // Separate hair strokes in the brows; expressive shape without giant rectangular eyebrows.
 function brow(x,side){const w=side<0?17:16,bi=m.brow[0],bo=m.brow[1],raise=m.lift&&side>0?-2:0;for(let i=0;i<w;i++){const inner=side<0?i/(w-1):1-i/(w-1),y=21+raise+Math.round(bo+(bi-bo)*inner)-Math.round(Math.sin(i/(w-1)*Math.PI));R(x+i,y,1,2+(i%4===0?1:0),P.hairDark);if(i>3&&i<w-3)R(x+i,y,1,1,P.hairMid);}}
 brow(-24,-1);brow(6,1);R(-3,22,1,5,P.half);R(3,22,1,5,P.shadow);
 if(['determined','roar','pain'].includes(mood)){R(-5,21,1,4,P.shadow);R(4,21,1,4,P.shadow);}
 // Nose has a continuous light-facing ridge, a side plane, tip and nostrils.
 poly([[-3,26],[1,25],[3,36],[7,41],[5,44],[-5,44],[-7,41],[-3,37]],P.half);
 poly([[-3,27],[-1,27],[0,37],[-3,40],[-5,40]],P.light);
 poly([[1,27],[3,36],[7,41],[5,44],[2,42],[1,36]],P.shadow);
 poly([[-3,38],[1,37],[4,40],[2,42],[-3,42],[-5,41]],P.warm);R(-3,39,4,1,P.bright);
 R(-5,43,3,1,P.deep);R(3,43,3,1,P.deep);R(-1,43,3,2,P.skin);R(-1,46,2,2,P.shadow);
 feature=false;
 // Chin and lip anatomy remains visible for clean-shaven men as well as under beards.
 poly([[-13,49],[-6,46],[0,47],[6,46],[13,49],[12,57],[5,62],[-5,62],[-12,57]],P.skin);
 poly([[-9,55],[7,55],[9,59],[3,61],[-6,60]],P.half);R(-6,57,10,1,P.light);
 if(beard===2){
  poly([[-25,35],[-21,39],[-19,46],[-13,49],[-7,47],[-2,49],[5,48],[12,46],[18,44],[24,36],[23,50],[17,59],[7,65],[-6,65],[-17,60],[-24,52]],P.hairDark);
  poly([[-24,39],[-20,46],[-15,52],[-8,56],[-5,63],[-15,59],[-22,52]],P.hair);
  poly([[-17,51],[-8,55],[7,55],[15,51],[14,57],[6,62],[-5,62]],P.hair);poly([[-18,52],[-10,56],[-6,60],[-14,57]],P.hairMid);
 }else if(beard===3){poly([[-7,55],[8,55],[7,64],[2,67],[-5,64]],P.hairDark);poly([[-6,55],[-1,57],[0,64],[-4,63]],P.hair);}
 if(beard===1){for(let y=47;y<61;y+=2)for(let x=-18;x<=18;x+=3){if(Math.abs(x)<6&&y<56||Math.abs(x)>(62-y)*1.7)continue;R(x+(y%3),y,1,1,mix(P.half,P.hair,.48));}}
 feature=true;
 const my=51,mouth=m.mouth;
 if(beard===2||beard===3)poly([[-8,47],[-3,46],[0,48],[3,46],[8,47],[11,50],[4,50],[0,49],[-5,50],[-11,51]],P.hair);
 function lips(){poly([[-9,my],[-4,my-1],[0,my],[4,my-1],[9,my],[6,my+2],[-6,my+2]],P.deep);R(-6,my+1,12,1,mix(P.red,'#5b3230',.43));R(-4,my+2,9,1,P.red);R(-2,my+2,5,1,mix(P.red,P.light,.27));}
 // Sprechen (o.talk 0–1, aus der Sprechstimme): Mund öffnet sich je nach Laut, Oberzähne, dunkle Mundhöhle, Zunge
 const tk=cl(+o.talk||0);
 if(tk>.06){const wide=Math.round(6+tk*3),top=my-1,bot=top+Math.max(2,Math.round(1+tk*8));poly([[-wide+2,top],[wide-2,top],[wide,top+1],[wide-2,bot],[-wide+2,bot],[-wide,top+1]],'#32191a');if(bot-top>3){R(-wide+3,top,wide*2-6,1,'#ddd0ac');R(-wide+4,bot-1,wide*2-8,1,'#854943');}R(-wide+2,bot+1,wide*2-4,1,P.red);R(-wide+1,top-1,wide*2-2,1,P.deep);}
 else if(mouth==='line'||mouth==='firm'||mouth==='slack'){lips();if(o.g?.teeth?.gold?.length&&mouth!=='firm'){R(-2,my+1,2,1,'#e0b02a');R(-2,my+1,1,1,'#fff2a0');}if(mouth==='firm'){R(-9,my,18,1,P.deep);R(-10,my+1,2,1,P.shadow);}if(mouth==='slack')R(-4,my+1,8,2,P.deep);}
 else if(mouth==='smirk'){for(let x=-9;x<=9;x++){const y=my-Math.max(0,Math.round(x*.25));R(x,y,1,1,P.deep);if(x>-7&&x<7)R(x,y+1,1,1,P.red);}R(10,my-2,1,3,P.shadow);}
 else if(mouth==='wobble'){for(let x=-8;x<=8;x++){const y=my+Math.round(Math.sin(x*.5+t*7)*.65);R(x,y,1,1,P.deep);R(x,y+1,1,1,P.red);}}
 else{const roar=mouth==='roar',grin=mouth==='grin',teeth=mouth==='teeth',wide=roar?12:grin?12:teeth?10:6,top=roar?47:50,bot=roar?62:grin?57:teeth?56:60;
  poly([[-wide+3,top-1],[wide-3,top-1],[wide,top+2],[wide-2,bot-1],[wide-5,bot],[-wide+4,bot],[-wide+1,bot-2],[-wide,top+2]],'#32191a');
  R(-wide+3,top,wide*2-6,2,'#ddd0ac');if(grin||teeth||roar){for(let x=-wide+6;x<wide-3;x+=4)R(x,top,1,2,'#9e8c72');}{const TT=o.g?.teeth;if(TT&&(TT.missing?.length||TT.gold?.length)){const w=wide*2-6;for(let i=0;i<8;i++){const c=TT.missing?.includes(i)?'#1a0c0c':TT.gold?.includes(i)?'#e0b02a':null;if(!c)continue;const x0=-wide+3+Math.floor(i*w/8),x1=-wide+3+Math.floor((i+1)*w/8);R(x0,top,Math.max(1,x1-x0),2,c);if(c!=='#1a0c0c')R(x0,top,1,1,'#fff2a0');}}}
  if(teeth)R(-wide+2,bot-2,wide*2-4,1,'#d0bc99');else{R(-wide+4,bot-3,wide*2-8,2,'#854943');R(-wide+5,bot-3,wide*2-10,1,'#ac635a');}
  R(-wide+3,bot+1,wide*2-6,1,P.red);R(-wide-1,top+2,1,3,P.shadow);R(wide,top+2,1,3,P.deep);
 }
 if(beard===2){for(const [x,y,len]of [[-23,43,3],[-21,48,3],[-18,52,4],[-14,55,3],[-11,59,2],[-6,63,2],[0,63,2],[6,63,2],[12,57,3],[17,50,3],[20,45,3]])R(x,y,1,len,x<0?P.hairMid:P.hair);}
 if(beard===3){R(-4,60,1,3,P.hairMid);R(3,61,1,3,P.hair);}
 feature=false;
 // Six real game hairstyles, each built on the same anatomical head.
 if(st===0){poly([[-27,13],[-24,17],[-23,27],[-26,30]],P.hair);poly([[24,13],[27,17],[26,29],[23,26]],P.hairDark);poly([[-17,5],[-7,1],[8,1],[15,5],[12,8],[-10,8]],P.light);}
 else if(st===2){
 // Sculpted hairline and swept locks, with a few warm highlights.
 poly([[-28,21],[-29,10],[-25,1],[-16,-6],[-4,-9],[10,-8],[23,-2],[29,8],[27,25],[23,23],[21,14],[15,9],[9,11],[2,7],[-7,11],[-11,8],[-19,14],[-23,24]],P.hairDark);
 poly([[-27,9],[-22,1],[-12,-4],[2,-6],[13,-4],[19,0],[13,5],[4,4],[-4,8],[-9,6],[-18,11],[-22,18],[-25,20]],P.hair);
 poly([[-20,3],[-11,-2],[1,-4],[9,-3],[6,0],[-4,0],[-10,4],[-18,8]],P.hairMid);
 poly([[-11,1],[-3,-1],[5,-1],[1,2],[-7,4]],P.hairLight);
 poly([[9,0],[18,1],[23,6],[24,16],[20,11],[15,8],[7,7],[4,5]],P.hair);
 poly([[12,1],[19,4],[20,7],[13,5],[8,6]],P.hairMid);
 R(-23,12,2,4,P.hairMid);R(-21,9,2,3,P.hairLight);R(-9,6,4,1,P.hairMid);R(5,6,3,1,P.hairMid);

 }else if(st===1){poly([[-28,22],[-28,9],[-22,0],[-9,-5],[9,-5],[23,1],[28,10],[27,25],[23,22],[22,12],[16,8],[5,7],[-7,8],[-19,12],[-24,23]],P.hairDark);poly([[-24,9],[-18,2],[-6,-2],[9,-2],[18,3],[20,7],[8,5],[-5,6],[-19,11]],P.hair);for(let i=0;i<9;i++)R(-19+i*4,3+(i%3),2,1,P.hairMid);}
 else if(st===3||st===4){poly([[-29,24],[-29,10],[-23,0],[-10,-6],[9,-6],[23,1],[29,11],[27,29],[22,20],[19,9],[9,6],[1,4],[-8,6],[-19,12],[-23,29]],P.hairDark);poly([[-25,12],[-19,3],[-8,-2],[0,1],[-9,6],[-18,15],[-22,29],[-25,38]],P.hair);poly([[2,0],[12,-2],[22,5],[25,15],[22,25],[18,10],[10,5]],P.hair);for(const [x,y]of [[-21,10],[-18,7],[-13,4],[14,5],[20,12]])R(x,y,1,9,P.hairMid);if(st===4){poly([[-7,-5],[-9,-11],[-4,-16],[6,-15],[10,-9],[7,-4]],P.hairDark);R(-5,-12,9,4,P.hair);R(-3,-13,5,1,P.hairMid);}}
 else if(st===5){poly([[-6,10],[-8,0],[-6,-14],[0,-18],[7,-14],[8,-2],[5,11]],P.hairDark);poly([[-4,5],[-4,-12],[0,-15],[4,-12],[3,6]],P.hair);R(-3,-11,2,12,P.hairMid);R(-2,8,7,2,P.hair);}
 // Small skin highlights, a lower eyelid crease and subtle age lines.
 R(-19,16,8,1,P.warm);R(-12,14,14,1,P.light);R(4,16,8,1,P.half);
 R(-24,30,2,1,P.shadow);R(22,30,2,1,P.deep);R(-19,38,3,1,P.light);
 feature=true;
 if(o.scar){for(let i=0;i<13;i++)R(-19+i*.55,32+i,1,1,mix(P.skin,'#edc4ad',.50));}
 if(o.box){/* Boxschäden (Faustkampf): Veilchen, geschwollene Wange/Lippe/Nase, Platzwunde. o.box = {eyeL,eyeR,cheek,nose,lip,cut,blood} jeweils 0–1,5 */const B=o.box,k=v=>Math.min(1,v||0);
  for(const [x0,v] of [[-22,B.eyeL],[9,B.eyeR]]){if(v>.12){const w=12,a=Math.min(.85,v*.7);q.globalAlpha=a*.7;R(x0-3,eyeY-3,w+6,12,'#5b2b5e');q.globalAlpha=a;R(x0-1,eyeY-2,w+2,9,v>.8?'#3a1d4a':'#6b3563');q.globalAlpha=a*.6;R(x0,eyeY+8,w,3,'#8a4a4a');q.globalAlpha=1;
   if(v>.7){R(x0,eyeY-1,w,1+Math.round(k(v)*3),P.skin);R(x0+1,eyeY-1,w-2,1,P.shadow);}}}
  if(B.cheek>.1){const a=Math.min(.7,B.cheek*.6);q.globalAlpha=a;R(-23,36,15,9,'#6e3a60');R(10,36,14,9,'#6e3a60');q.globalAlpha=a*.5;R(-26,40,6,6,'#8e4a52');q.globalAlpha=1;}
  if(B.nose>.15){const a=Math.min(.8,B.nose*.55);q.globalAlpha=a;poly([[-4,30],[2,30],[5,41],[7,44],[-6,44],[-7,41]],'#9c4048');q.globalAlpha=1;if(B.nose>.9){R(-2,44,2,3+Math.round(k(B.blood)*10),'#8a2a2a');R(4,44,2,2+Math.round(k(B.blood)*8),'#8a2a2a');}}
  if(B.lip>.2){const a=Math.min(.9,B.lip*.7);q.globalAlpha=a;R(-8,50,17,5,'#a64a4a');R(-7,55,15,2,'#8a3636');q.globalAlpha=1;R(-3,50,4,1,'#d98a82');if(B.lip>.7)R(5,55,1,3+Math.round(k(B.blood)*6),'#8a2020');}
  if(B.cut>.1){R(8,17,10,2,'#6b1c1c');R(9,18,8,1,'#b02a2a');const len=3+Math.round(k(B.cut)*16);R(11,19,1,len,'#9a2020');R(15,19,1,Math.max(2,len-5),'#8a1c1c');if(B.cut>.6)R(10,19+len,3,2,'#b02a2a');}}
 if(o.hurt>0){const n=Math.round(o.hurt*24);R(-17,14,7,1,'#682c2c');R(-14,15,1,n,'#9d443b');if(o.hurt>.4){q.globalAlpha=.35;R(9,26,13,8,'#663d57');q.globalAlpha=1;}}
 for(let i=0;i<(m.sweat||0);i++){const y=16+((t*.65+i*.5)%1)*23;R(i?-24:23,y,1,3,'#c3d9d4');R(i?-24:23,y,1,1,'#edf2df');}

 if(o.blood>0)R(8,53,1,Math.round(o.blood*8),'#943a33');


 feature=false;
 const helm=o.armor?.helm;
 if(helm){
  const p=M.itemLook(helm),quality=cl(Math.round(helm.q||0),0,6),soft=helm.material==='leather',hybrid=helm.material==='medium';
  const base=hybrid?p.leather:p.metal,edge=p.edge,trim=quality>=4?p.trim:mix(base,'#d8c5a0',.32);
  const ink=mix(base,'#10161b',.78),deep=mix(base,'#151d24',.56),shadow=mix(base,'#202933',.32),light=mix(base,soft?'#d8af77':'#d8e5e5',.32),shine=mix(base,'#fff3d4',.58);
  const plate=hybrid?p.metal:base,plight=mix(plate,'#e1e6d5',.4),pdark=mix(plate,'#18232a',.55);
  // Solid, fitted silhouette covers hairstyles; polygons follow the portrait's proportions.
  poly([[-34,22],[-34,3],[-29,-10],[-19,-18],[-7,-21],[10,-20],[23,-14],[31,-4],[34,10],[33,23]],ink);
  poly([[-32,17],[-32,3],[-27,-8],[-17,-16],[-5,-18],[10,-17],[21,-11],[29,-2],[31,16]],base);
  poly([[-31,13],[-29,0],[-23,-9],[-13,-15],[-4,-16],[-8,-9],[-14,-1],[-17,14]],light);
  poly([[-28,3],[-23,-7],[-14,-13],[-8,-14],[-14,-7],[-19,2]],shine);
  poly([[8,-17],[20,-11],[28,-1],[31,15],[20,15],[18,1],[13,-8]],shadow);
  poly([[23,-6],[29,2],[31,16],[27,16],[25,3]],deep);
  // Center reinforcing rib, with a light edge and shadow beneath it.
  if(!soft||quality>=2){poly([[-4,-19],[1,-19],[6,16],[-1,17]],ink);poly([[-3,-18],[0,-18],[4,15],[0,15]],hybrid?p.metal:trim);R(-2,-15,1,9,shine);R(0,-4,1,16,light);}
  if(soft){
   for(const side of [-1,1])for(let i=0;i<8;i++){const x=side*(12+i*.9),y=-10+i*3;R(x,y,2,1,deep);R(x,y-1,1,1,light);}
   for(let i=0;i<24;i++){const x=(i*17%55)-27,y=(i*11%25)-9;if(Math.abs(x)<22||y>1)R(x,y,1,1,i%3?shadow:light);}
   if(quality===0){poly([[-22,-4],[-10,-8],[-7,4],[-19,8]],deep);poly([[-21,-3],[-11,-6],[-9,3],[-18,6]],mix(base,'#c59a68',.18));for(let i=0;i<4;i++)R(-20+i*3,-2-i,1,2,shine);}
  }else{
   // Fixed surface marks never shimmer from frame to frame.
   for(const [x,y,l]of [[-23,5,4],[-16,-7,3],[12,4,5],[18,10,3]]){R(x,y,l,1,shadow);R(x,y+1,l-1,1,light);}
  }
  // Brow follows the skull instead of forming a rectangular band.
  poly([[-35,14],[-21,12],[-8,14],[0,16],[9,14],[23,12],[35,15],[34,22],[20,19],[9,20],[0,22],[-11,20],[-24,19],[-34,22]],ink);
  poly([[-33,15],[-22,14],[-9,16],[0,18],[10,16],[23,14],[33,16],[32,19],[21,17],[10,18],[0,20],[-10,18],[-23,17],[-32,19]],soft?deep:trim);
  for(const [x,y]of [[-30,15],[-23,14],[-16,15],[13,15],[22,14],[29,15]])R(x,y,3,1,soft?light:shine);
  function rivet(x,y){R(x-1,y-1,3,3,ink);R(x-1,y-1,2,2,trim);R(x-1,y-1,1,1,shine);}
  for(const x of [-28,-16,16,28])rivet(x,17);
  if(quality>=1){for(const side of [-1,1]){
   const f=1-cl(side*yaw*.32,0,.25),pts=a=>a.map(([x,y])=>[side*(24+(x-24)*f),y]);
   poly(pts([[25,20],[34,20],[34,39],[29,54],[23,57],[19,51],[21,38]]),ink);
   poly(pts([[26,22],[32,22],[32,38],[28,51],[24,54],[21,50],[23,38]]),soft?base:plate);
   poly(pts([[26,23],[28,24],[27,38],[23,49],[24,52],[21,49],[23,36]]),side<0?(soft?light:plight):(soft?shadow:pdark));
   poly(pts([[31,24],[32,26],[31,39],[27,51],[25,52],[28,40]]),deep);
   rivet(side*28,24);R(side*27-1,43,3,1,ink);R(side*26-1,46,3,1,ink);
   if(quality>=4){poly(pts([[23,40],[25,41],[23,48],[25,51],[28,46],[28,49],[24,54],[21,50]]),trim);}
  }}
  if(quality>=2&&!soft){const nx=yaw*5;poly([[nx-3,19],[nx+3,19],[nx+3,33],[nx,38],[nx-3,33]],ink);poly([[nx-2,20],[nx+1,20],[nx+1,34],[nx,36],[nx-2,32]],trim);R(nx-2,21,1,11,shine);}
  if(hybrid){for(const side of [-1,1]){poly([[side*17,-14],[side*22,-10],[side*29,3],[side*30,12],[side*25,12],[side*24,1]],plate);R(side*25,3,1,7,plight);rivet(side*25,10);}}
  // Quality is expressed through construction and ornament, not only color.
  if(quality>=3){
   const crest=soft?mix(p.cloth,base,.35):p.cloth,cd=mix(crest,'#170f19',.57),ch=mix(crest,'#ffcf98',.32);
   poly([[-9,-17],[-10,-27],[-7,-32],[0,-35],[7,-32],[11,-26],[10,-17]],ink);
   poly([[-7,-18],[-8,-26],[-5,-30],[0,-32],[6,-29],[8,-24],[8,-18]],cd);
   for(let i=-6;i<=6;i+=2){const y=-31+Math.abs(i)*.7;R(i,y,1,12-Math.abs(i)*.5,i<1?ch:crest);}
   R(-9,-18,19,3,deep);R(-8,-18,17,1,trim);rivet(-5,-16);rivet(5,-16);
  }
  if(quality>=5){for(const side of [-1,1])for(let i=0;i<4;i++){const x=side*(12+i*4),y=9-i*3;poly([[x,y],[x-side*3,y-4],[x-side*4,y-3],[x-side*2,y+1]],trim);R(x-side*2,y-2,1,1,shine);}}
  if(quality===6){poly([[-5,12],[0,8],[5,12],[4,18],[0,21],[-4,18]],ink);poly([[-4,12],[0,9],[4,12],[3,17],[0,19],[-3,17]],trim);poly([[-2,12],[1,11],[3,14],[0,17],[-2,15]],p.gem||'#b44039');R(-1,12,1,2,'#ffe4ba');}
 }

}
const bufs=new WeakMap();
// o: {g, team, mood, yaw?, sink?, tilt?, dark?, pale?, blood?, zoom?}; t: Sekunden seit Beginn der Einstellung
// Wer wo gemalt wurde (für Sprechstimmen: stehende Großaufnahmen beim Sprechen neu malen)
const recs=new Map();
function paint(g,w,h,o,t){if(g?.canvas&&o?.g&&!o._sprech){recs.set(g.canvas,{ctx:g,w,h,o,t,time:(typeof performance!=='undefined'?performance.now():Date.now())});if(recs.size>40)recs.delete(recs.keys().next().value);}let B=bufs.get(g.canvas);if(!B){B={a:document.createElement('canvas'),b:document.createElement('canvas'),c:document.createElement('canvas'),d:document.createElement('canvas')};B.a.width=B.b.width=B.c.width=B.d.width=FW;B.a.height=B.b.height=B.c.height=B.d.height=FH+40;bufs.set(g.canvas,B);}
 const colors=x=>{const A=x?.appearance||{},skin=hex(A.skin)||'#c19169',shade=hex(A.shade)||'#875e43';return {identity:x?.id,faceSeed:A.faceSeed,skin,shade,light:mix(skin,'#fff2dc',.22),hair:hex(A.hair)||'#443025',style:(A.style??1)%6,beard:(A.beard??0)%4};},gearOf=x=>{const r={};try{for(const it of M.armorItems(x)||[])r[it.def]=it;}catch{}return r;},C=colors(o.g),armor=gearOf(o.g);
 const opt={talk:o.talk??(M.talkMouth?.(o.g)||0),...o,armor,scar:o.scar??((o.g?.scars||[]).length>0||(o.g?.kills||0)>=5)},mood=o.mood||'calm',m=MOODS[mood]||MOODS.calm;
 // Kamerafahrt um den Kopf: langsamer Schwenk von einer Seite zur anderen
 const yaw=o.yaw??Math.sin(t*.55+(o.team===1?Math.PI:0))*.75;
 const bq=B.a.getContext('2d');bq.imageSmoothingEnabled=false;bq.setTransform(1,0,0,1,0,0);bq.clearRect(0,0,FW,FH+40);const BT=tools(bq);
 if(o.ground)sand(bq,BT,opt,t);else if(!o.clear)backdrop(bq,BT,opt,yaw,t);
 // Figur auf eigener Fläche, damit sie am Boden als Ganzes liegen kann
 const q=B.c.getContext('2d');q.imageSmoothingEnabled=false;q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,FW,FH+40);const T=tools(q);torso(q,T,C,opt,yaw);
 const hq=B.b.getContext('2d');hq.imageSmoothingEnabled=false;hq.setTransform(1,0,0,1,0,0);hq.clearRect(0,0,FW,FH+40);if(armor.helm){hq.translate(80,43);hq.scale(.78,.78);hq.translate(-80,0);}else hq.translate(0,20);head(hq,tools(hq),C,opt,yaw,t,mood);hq.setTransform(1,0,0,1,0,0);
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
 const z=(o.zoom||1)*1.12*(1+.07*ease(t/5)),s=Math.max(w/FW,h/FH)*z,dw=Math.round(FW*s),dh=Math.round(FH*s);g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;/* clear: ohne Hintergrund, z. B. zum Freistellen */if(o.clear)g.clearRect(0,0,w,h);else{g.fillStyle='#120c09';g.fillRect(0,0,w,h);}
 if(o.cheer){/* Blütenblätter und Tücher aus den Rängen */for(let i=0;i<34;i++){const n=Math.sin(i*91.7)*43758.5,v=n-Math.floor(n),k=((t*(.18+v*.22)+v*7)%1),x=(v*1.9*FW+Math.sin(t*1.3+i)*9)%FW,y=k*(FH+10)-6;BT.r(x,y,2+(i%3===0?1:0),2,['#d6453a','#f0c94a','#f4ead0','#c8372f'][i%4]);}}
 const sh=o.shake||0,ox=sh?Math.round((Math.random()-.5)*sh*s):0,oy=sh?Math.round((Math.random()-.5)*sh*s*.7):0;g.drawImage(B.a,0,0,FW,FH,Math.round(w/2-dw/2)+ox,Math.round(Math.min(0,(h-dh)*.42))+oy,dw,dh);
 if(o.lines>0){/* Schrei: Linien vom Rand zur Mitte */g.save();g.globalAlpha=cl(o.lines)*.75;g.strokeStyle='#fff6dc';g.lineWidth=Math.max(2,w/160);for(let i=0;i<18;i++){const a=i/18*Math.PI*2+Math.floor(t*14)*.37,r0=Math.max(w,h)*.74,r1=Math.max(w,h)*(.4+((i*7)%5)*.035);g.beginPath();g.moveTo(w/2+Math.cos(a)*r0,h*.45+Math.sin(a)*r0);g.lineTo(w/2+Math.cos(a)*r1,h*.45+Math.sin(a)*r1);g.stroke();}g.restore();}
 if(o.clear)return;const vg=g.createRadialGradient(w/2,h*.45,Math.min(w,h)*.35,w/2,h*.5,Math.max(w,h)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.62)');g.fillStyle=vg;g.fillRect(0,0,w,h);}
M.faceShot={records:()=>recs,paint,moods:Object.keys(MOODS),FW,FH,version:'helmet-lab-v4'};
M.faceShot.paintHead=(q,actor,o={},t=0)=>{const A=actor?.appearance||{},skin=hex(A.skin)||'#c19169',shade=hex(A.shade)||'#875e43';const C={identity:actor?.id,faceSeed:A.faceSeed,skin,shade,light:mix(skin,'#fff2dc',.22),hair:hex(A.hair)||'#443025',style:(A.style??1)%6,beard:(A.beard??0)%4};head(q,tools(q),C,{...o,g:actor,armor:o.armor||{}},o.yaw||0,t,o.mood||'calm');};
})();

// Hühnerhändlerin: besondere Großaufnahme im Stil des gemeinsamen Kopf-Renderers.
(()=>{'use strict';const M=window.MG,buffers=new WeakMap(),mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
function setup(g){let b=buffers.get(g.canvas);if(!b){b={canvas:mk(240,156)};buffers.set(g.canvas,b)}const q=b.canvas.getContext('2d');q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,240,156);q.imageSmoothingEnabled=false;const R=(x,y,w,h,c)=>{q.fillStyle=c;q.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)))};const line=(x,y,xx,yy,c,width=1)=>{const n=Math.ceil(Math.max(Math.abs(xx-x),Math.abs(yy-y)));for(let i=0;i<=n;i++)R(x+(xx-x)*i/(n||1),y+(yy-y)*i/(n||1),width,width,c)};return {...b,q,R,line};}
function finish(g,w,h,b,t,shake=0){g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;g.fillStyle='#171512';g.fillRect(0,0,w,h);const s=Math.min(w/240,h/156),dx=(w-240*s)/2,dy=(h-156*s)/2;g.drawImage(b.canvas,Math.round(dx+Math.sin(t*47)*shake*s),Math.round(dy+Math.cos(t*39)*shake*.5*s),240*s,156*s);}
function room(b,kind,t){const {q,R}=b;R(0,0,240,156,'#504535');for(let y=0;y<156;y+=16)for(let x=(y%32?-15:0);x<240;x+=32){R(x+1,y+1,30,14,'#635a45');R(x+1,y+1,30,1,'#746c54');}const v=q.createRadialGradient(120,72,30,120,72,150);v.addColorStop(0,'#00000000');v.addColorStop(1,'#00000088');q.fillStyle=v;q.fillRect(0,0,240,156);}
function body(b,actor,kind){const {R}=b;for(let y=109;y<156;y++){const hw=Math.min(93,26+(y-109)*2.5);R(120-hw,y,hw*2,1,'#587446');R(120+hw*.45,y,hw*.55,1,'#354b31');}}
function raw(b,actor,o,t,x=40,y=22,scale=1){b.q.save();b.q.translate(x,y);b.q.scale(scale,scale);M.faceShot.paintHead(b.q,actor,o,t);b.q.restore();}
function seller(g,w,h,actor,t,o={}){const b=setup(g),{q,R,line}=b;room(b,'seller',t);body(b,actor,'seller');const hair='#c9562a',dark='#74301e',hi='#ed9550';
 // Sculpted, individually shaded copper curls; same fixed silhouette from frame to frame.
 for(let i=0;i<38;i++){const a=i/38*Math.PI*2,x=120+Math.cos(a)*(39+(i%3)*2),y=78+Math.sin(a)*(43+(i%4));const n=6+i%4;R(x-n,y-n,n*2,n*2,dark);R(x-n+1,y-n+1,n*2-3,n*2-3,hair);R(x-n+2,y-n+1,n,2,hi);R(x-2,y-2,n,2,dark);R(x-2,y-2,2,n,dark);}
 raw(b,actor,{mood:o.mood||'grin',armor:{},crossEyes:true,yaw:0},t,40,43);
 // Frame the face with separate locks, earrings and fine feather shafts.
 for(const side of [-1,1]){for(let i=0;i<5;i++){const x=120+side*(28+i*.9),y=68+i*9;R(x-2,y,5,11,dark);R(x-2,y,2,8,hi);}const x=120+side*32;R(x-4,105,8,12,'#623e23');R(x-3,105,6,2,'#edc465');R(x-3,115,6,2,'#bc8b39');R(x-4,107,2,8,'#dba84b');R(x+2,107,2,8,'#aa7831');}
 for(const side of [-1,1])for(let i=0;i<3;i++){const x=120+side*(25+i*4),y=49-i*5;line(x,y,x+side*13,y-20,'#c9b585');for(let j=0;j<9;j++){line(x+side*j,y-j*1.5,x+side*(j+5),y-j*1.5-4,i%2?'#e5d6ba':'#c78641');}}
 // Small brooding hen: shaded breast, layered wing, comb and amber beak.
 const hy=25+Math.round(Math.sin(t*2)*.5);for(let y=0;y<16;y++){const hw=14*Math.sqrt(Math.max(0,1-Math.pow((y-8)/9,2)));R(120-hw,hy+y,hw*2,1,y<5?'#f5e9cd':y>12?'#a59678':'#d8c9a6');}R(108,hy+5,13,2,'#f5ecd8');for(let i=0;i<5;i++)line(113+i*2,hy+7,117+i*2,hy+13,'#b7aa8d');R(128,hy-5,9,11,'#e8dbbb');R(128,hy-5,3,7,'#faf0d5');R(136,hy-1,6,3,'#db9a38');R(133,hy-2,2,2,'#28221c');R(133,hy-2,1,1,'#fff4d5');R(130,hy-8,6,3,'#ac3d32');R(131,hy-10,2,3,'#d1503f');R(135,hy+3,2,4,'#a53c31');for(let i=0;i<4;i++)line(108,hy+7,101-i,hy-2+i*3,i%2?'#c4b593':'#ede1c4');
 for(let i=0;i<28;i++){const x=56+i*4.8,y=139+Math.sin(i*.6)*5+Math.sin(t*3+i)*.5,c=['#e4d5b6','#bb663a','#8f4633','#dfad55'][i%4];line(x,y+8,x+2,y-7,'#4e392a',2);for(let j=0;j<7;j++){line(x,y+j-5,x-3,y+j-8,c);line(x+1,y+j-5,x+5,y+j-8,c);}}
 finish(g,w,h,b,t,o.shake?Math.sin(t*5)*.4:0);}
M.sceneHeads={...(M.sceneHeads||{}),seller,version:'seller-head-v1'};
})();

