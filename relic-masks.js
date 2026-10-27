'use strict';
/* =====================================================================================================
   MASKEN DER BERÜCHTIGTEN · hochwertige Darstellung (Wunsch Thomas 27.10.: „so gut wie die Gesichtsanimation“)
   Jede Maske wird einmal als schattiertes Pixelbild in Gesichtskoordinaten berechnet (1 Einheit = 1 Bildpunkt der Großaufnahme,
   0,0 = Kinn, Augen bei (−17|−34) und (15|−34), Mund bei (−1|−10)):
   · Form (shape), Höhenfeld (height) → Licht von links oben, Glanzlicht, Material (Porzellan, Eisen, Gold, Knochen, Leder,
     Lack, Fell, Stoff, Sackleinen, Spiegel), Bemalung (paint), Zubehör außerhalb der Form (post: Hörner, Hauer, Knoten, Stroh …).
   · Augenlöcher sind durchsichtig (hole=1): Darunter blinzeln, schauen und leiden die echten Augen der Großaufnahme weiter.
     Der Lack-Dämon hat einen offenen Mund: Dort sieht man den echten, sprechenden Mund. Das Tuch des Meuchlers bewegt sich mit
     dem Kiefer (o.talk), der Spiegel glänzt im Takt.
   · Kampfbild/Spielfeld: Dasselbe Bild wird auf die Kopfzellen der Figur verkleinert (Flächenmittel, Augenlöcher bleiben frei),
     sodass Maske und Großaufnahme genau zusammenpassen; es hängt am Kopf und folgt jeder Bewegung (drehen, fallen, liegen).
   · Zwischenspeicher je Maske/Farben/Zustand; ohne Browser (Tests) wird punktweise gezeichnet.
   Ersetzt ART.mask aus relics.js für alle Masken mit eigener Beschreibung; übrige Varianten bleiben wie bisher.
   ===================================================================================================== */
(()=>{
const R=window.MGRelics;if(!R?.ART?.mask)return;const M=window.MG;const {hash}=R.H;
const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v,inE=(x,y,cx,cy,rx,ry)=>((x-cx)/rx)**2+((y-cy)/ry)**2<=1,G=(x,y,cx,cy,sx,sy,a)=>a*Math.exp(-(((x-cx)**2)/(2*sx*sx)+((y-cy)**2)/(2*sy*sy)));
const dome=(x,y,cx,cy,rx,ry,d)=>{const v=1-((x-cx)/rx)**2-((y-cy)/ry)**2;return v>0?Math.sqrt(v)*d:0;};
const RGB={};const rgb=h=>RGB[h]??=(h.startsWith('rgba')?h.slice(5,-1).split(',').map((v,i)=>i<3?+v:Math.round(+v*255)):[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)).concat(h.length>7?parseInt(h.slice(7,9),16):255));
const mixc=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
const BAY=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+.5)/16),bay=(x,y)=>BAY[(x&3)+((y&3)<<2)];
// Farbleiter aus Grundfarbe: Schatten ins Kühl-Violette (wie die Gesichter), Lichter ins Warmweiße
const ladder=(base,n=7,dk=.82,lt=.62)=>{const b=rgb(base),D=rgb('#140c18'),L=rgb('#fff6e4'),o=[];for(let i=0;i<n;i++){const k=i/(n-1)*2-1;o.push(k<0?mixc(b,D,-k*dk):mixc(b,L,k*lt));}return o;};
// Stufen wie in den Gesichtern: meist flache Flächen, nur am Übergang ein schmaler Rastersaum
const tone=(lad,v,x,y)=>{const f=clamp(v)*(lad.length-1),i=Math.floor(f),fr=f-i,j=fr<.36?i:fr>.64?i+1:i+((fr-.36)/.28>bay(x,y)?1:0);return lad[Math.min(lad.length-1,j)];};
const LX=-.48,LY=-.58,LZ=.66,HX=LX/2,HY=LY/2,HZ=(LZ+1)/2,HN=Math.hypot(HX,HY,HZ);
const X0=-48,X1=48,Y0=-86,Y1=34,BW=X1-X0+1,BH=Y1-Y0+1;

// ---------- Maler ----------
function render(spec){const buf=new Uint8ClampedArray(BW*BH*4),inS=(x,y)=>spec.shape(x,y),put=(x,y,c,a)=>{x=Math.round(x);y=Math.round(y);if(x<X0||x>X1||y<Y0||y>Y1)return;const i=((y-Y0)*BW+(x-X0))*4,al=(a??(c[3]??255)/255);
  if(al>=.99){buf[i]=c[0];buf[i+1]=c[1];buf[i+2]=c[2];buf[i+3]=255;return;}const ba=buf[i+3]/255,oa=al+ba*(1-al);if(oa<=0)return;for(let k=0;k<3;k++)buf[i+k]=Math.round((c[k]*al+buf[i+k]*ba*(1-al))/oa);buf[i+3]=Math.round(oa*255);};
 const H=(x,y)=>inS(x,y)?spec.height(x,y):0,mat=spec.mat;
 for(let y=Y0;y<=Y1;y++)for(let x=X0;x<=X1;x++){if(!inS(x,y))continue;const hole=spec.hole?.(x,y)||0;
  if(hole===1){// durchsichtig, mit Tiefe: oben dunkler Rand
   const top=!spec.hole(x,y-1)?1:!spec.hole(x,y-2)?2:0,side=!spec.hole(x-1,y)||!spec.hole(x+1,y);put(x,y,[10,5,4],top===1?.78:top===2?.46:side?.4:(spec.holeShade??.14));continue;}
  if(hole===2){put(x,y,mixc(rgb('#070404'),rgb('#2a1612'),clamp((spec.cavLight?.(x,y))??0)));continue;}
  const hx=(H(x+1,y)-H(x-1,y))*.5,hy=(H(x,y+1)-H(x,y-1))*.5,nl=Math.hypot(hx,hy,1),nx=-hx/nl,ny=-hy/nl,nz=1/nl;
  let lam=Math.max(0,nx*LX+ny*LY+nz*LZ),sp=Math.pow(Math.max(0,(nx*HX+ny*HY+nz*HZ)/HN),mat.shin||20)*(mat.spec??.6);
  let v=(mat.amb??.3)+(1-(mat.amb??.3))*lam+(mat.tex?mat.tex(x,y,nx,ny):0);
  const lad=(spec.ladder?.(x,y))||mat.lad;let c=mat.env?mat.env(x,y,nx,ny,v):tone(lad,v,x,y);
  const pc=spec.paint?.(x,y,v);if(pc)c=Array.isArray(pc)?pc:tone(pc.lad||lad,pc.v??v,x,y);
  if(sp>.12&&!pc?.matte)c=mixc(c,rgb(mat.specCol||'#ffffff'),clamp((sp-.12)*1.6)*(sp>.5||bay(x,y)<sp*1.4?1:.5));
  // Kanten: außen dunkle Kontur, an Löchern Lippe (unten hell, oben dunkel)
  const out=!inS(x-1,y)||!inS(x+1,y)||!inS(x,y-1)||!inS(x,y+1);
  if(out)c=mixc(lad[0],rgb('#000000'),.35);
  else if(spec.hole){if(spec.hole(x,y-1)===1)c=lad[lad.length-2];else if(spec.hole(x,y+1)===1)c=lad[1];}
  put(x,y,c);}
 spec.post?.(put);return buf;}
// Puffer → Großaufnahme / Kampfbild / Symbol
const CACHE=new Map();
function canvasOf(key,buf,w,h){if(typeof document==='undefined')return null;let cv=CACHE.get(key);if(cv)return cv;cv=document.createElement('canvas');cv.width=w;cv.height=h;try{cv.getContext('2d').putImageData(new ImageData(buf,w,h),0,0);}catch(e){return null;}
 if(CACHE.size>220)CACHE.clear();CACHE.set(key,cv);return cv;}
const BUF=new Map();function bufOf(key,mk){let b=BUF.get(key);if(!b){b=render(mk());if(BUF.size>160)BUF.clear();BUF.set(key,b);}return b;}
function blitFace(q,key,buf){const cv=q.c&&q.fm?canvasOf('F'+key,buf,BW,BH):null;
 if(cv){const c=q.c,p=q.fm.to(X0,Y0),s=q.fm.s,sm=c.imageSmoothingEnabled;c.imageSmoothingEnabled=false;c.drawImage(cv,Math.round(p.x),Math.round(p.y),Math.round(BW*s),Math.round(BH*s));c.imageSmoothingEnabled=sm;return;}
 for(let y=0;y<BH;y++)for(let x=0;x<BW;x++){const i=(y*BW+x)*4;if(buf[i+3]<8)continue;q(x+X0,y+Y0,1,1,`rgba(${buf[i]},${buf[i+1]},${buf[i+2]},${(buf[i+3]/255).toFixed(2)})`);}}
// Kampfbild: Kopfzellen (rel. zum gerundeten Kopfanker) ↔ Gesichtskoordinaten. Augen (−2,5|3,5) und (4,5|3,5), Mund 8,5, Kinn 10,5,
// Stirn bis −5. Oberhalb der Augen gestaucht (Stirn ist in der Großaufnahme höher).
const FCX0=-9,FCX1=11,FCY0=-12,FCY1=15,FW=FCX1-FCX0+1,FH=FCY1-FCY0+1;
const fx=X=>(X-1)*4.57-1,fy=Y=>Y<3.5?-34+(Y-3.5)*3.55:-34+(Y-3.5)*4.9;
function figBuf(key,buf){const k='G'+key;let g=BUF.get(k);if(g)return g;g=new Uint8ClampedArray(FW*FH*4);
 for(let Y=FCY0;Y<=FCY1;Y++)for(let X=FCX0;X<=FCX1;X++){let n=0,r=0,gg=0,b=0,tot=0;
  for(let sy=0;sy<4;sy++)for(let sx=0;sx<4;sx++){tot++;const ux=Math.round(fx(X+(sx+.5)/4))-X0,uy=Math.round(fy(Y+(sy+.5)/4))-Y0;if(ux<0||uy<0||ux>=BW||uy>=BH)continue;const i=(uy*BW+ux)*4;if(buf[i+3]<150)continue;n++;r+=buf[i];gg+=buf[i+1];b+=buf[i+2];}
  if(n>=tot*.45){const o=((Y-FCY0)*FW+(X-FCX0))*4;g[o]=r/n;g[o+1]=gg/n;g[o+2]=b/n;g[o+3]=255;}}
 // Kontur nachziehen: Randzellen etwas dunkler, damit die Maske im Kleinen klar steht
 const al=(X,Y)=>X<FCX0||X>FCX1||Y<FCY0||Y>FCY1?0:g[((Y-FCY0)*FW+(X-FCX0))*4+3];
 const edge=[];for(let Y=FCY0;Y<=FCY1;Y++)for(let X=FCX0;X<=FCX1;X++)if(al(X,Y)&&(!al(X-1,Y)||!al(X+1,Y)||!al(X,Y+1)))edge.push([X,Y]);
 for(const [X,Y] of edge){const o=((Y-FCY0)*FW+(X-FCX0))*4;for(let k=0;k<3;k++)g[o+k]=g[o+k]*.72;}
 BUF.set(k,g);return g;}
function blitFig(P,key,buf){const g=figBuf(key,buf),hx=Math.round(P.head.x),hy=Math.round(P.head.y),ctx=P.ctx;const cv=ctx&&typeof ctx.drawImage==='function'?canvasOf('G'+key,g,FW,FH):null;
 if(cv){ctx.drawImage(cv,hx+FCX0,hy+FCY0,FW,FH);return;}
 for(let Y=FCY0;Y<=FCY1;Y++)for(let X=FCX0;X<=FCX1;X++){const o=((Y-FCY0)*FW+(X-FCX0))*4;if(g[o+3])P.rect(hx+X,hy+Y,1,1,`rgb(${g[o]},${g[o+1]},${g[o+2]})`);}}

// ---------- Materialien ----------
const MAT={
 porcelain:c=>({lad:ladder(c[0]||'#f2ece2',7,.7,.7),amb:.42,spec:.95,shin:16,specCol:'#ffffff'}),
 iron:c=>({lad:ladder(c[0]||'#6a6e70',7,.86,.7),amb:.26,spec:1.1,shin:34,specCol:'#f4f8ff',tex:(x,y)=>(hash(y*7,3)-.5)*.09+(hash(x*13+y*7,9)-.5)*.07}),
 gold:c=>({lad:[rgb('#2a1604'),rgb('#5a360a'),rgb('#8a5c14'),rgb('#b8862a'),rgb('#d8a83e'),rgb('#eecb62'),rgb('#fff0b0')],amb:.16,spec:.75,shin:30,specCol:'#fffbe8',tex:(x,y,nx,ny)=>Math.sin(ny*6+nx*2.4)*.09-.06}),
 bone:c=>({lad:ladder(c[0]||'#e4dac2',7,.8,.55),amb:.36,spec:.35,shin:10,tex:(x,y)=>(hash(x*31+y*17,2)>.94?-.28:0)+(hash(x*7+y*3,5)-.5)*.06}),
 leather:c=>({lad:ladder(c[0]||'#cdb88e',7,.85,.5),amb:.3,spec:.35,shin:8,tex:(x,y)=>(hash(x*17+y*29,4)-.5)*.12}),
 lacquer:c=>({lad:ladder(c[0],7,.85,.55),amb:.24,spec:1.3,shin:46,specCol:'#fff4ec'}),
 hide:c=>({lad:ladder(c[0]||'#5a3a24',7,.88,.5),amb:.28,spec:.15,shin:6,tex:(x,y)=>{const s=hash(x*5+Math.floor((y+x*.35)/4)*13,7);return (s-.5)*.34+((y+Math.round(x*.35))%4===0?-.12:0);}}),
 cloth:c=>({lad:ladder(c[0]||'#1e1e28',6,.7,.5),amb:.24,spec:.1,shin:6,tex:(x,y)=>(hash(x*3+y*5,6)-.5)*.03}),
 burlap:c=>({lad:ladder(c[0]||'#9a8252',7,.82,.45),amb:.3,spec:.05,shin:4,tex:(x,y)=>((x+y)&1?.05:-.05)+(x%3===0?-.07:0)+(y%3===0?-.06:0)+(hash(x*11+y*23,8)>.95?-.2:0)})};

// ---------- Formen und Masken ----------
const EL=[-17,-34],ER=[15,-34];
const faceShape=(x,y,o={})=>{const top=o.top??-64,bot=o.bot??3,cy=o.cy??-30,rx=o.rx??28;if(y<top||y>bot)return false;const ry=y<cy?cy-top:bot-cy+ (o.jaw??10),k=(y-cy)/ry;return Math.abs(x+1)<=rx*Math.sqrt(Math.max(0,1-k*k))*(y>cy?(1-(o.chinPinch??.18)*k):1);};
const almond=(x,y,c,rx,ry,tilt=0)=>{const dx=x-c[0],dy=y-c[1]-dx*tilt;return Math.abs(dy)<=ry*Math.max(0,1-(dx/rx)**2)**.6;};
const eyesAlmond=(rx=7,ry=3.4,tilt=0)=>(x,y)=>almond(x,y,EL,rx,ry,tilt)||almond(x,y,ER,rx,ry,-tilt)?1:0;
const faceRelief=(x,y,k=1)=>G(x,y,-1,-23,3,8,5*k)+G(x,y,-17,-40,7,2.4,1.6*k)+G(x,y,15,-40,7,2.4,1.6*k)+G(x,y,-19,-23,6,4,1.8*k)+G(x,y,17,-23,6,4,1.8*k)+G(x,y,-1,-10,7,2.5,1*k)+G(x,y,-1,-2,6,3,1.2*k);
const line=(put,pts,col,w=1)=>{for(let i=1;i<pts.length;i++){const [a,b]=pts[i-1],[c,d]=pts[i],n=Math.ceil(Math.hypot(c-a,d-b));for(let j=0;j<=n;j++){const x=a+(c-a)*j/n,y=b+(d-b)*j/n;for(let u=0;u<w;u++)put(x+u,y,col);}}};
const fill=(put,cx,cy,rx,ry,col,a)=>{for(let y=Math.floor(cy-ry);y<=cy+ry;y++)for(let x=Math.floor(cx-rx);x<=cx+rx;x++)if(inE(x,y,cx,cy,rx,ry))put(x,y,col,a);};
const C=h=>rgb(h);

const MASKS={
// Porzellan mit gemalten Tränen (Puppenmacher)
weep:(c,st)=>{const sh=(x,y)=>faceShape(x,y,{rx:27.5,top:-64,bot:3}),eye=eyesAlmond(6.6,3.3,.06);
 const crack=[[7,-62],[10,-55],[8,-50],[12,-44],[11,-40]],nearCrack=(x,y)=>crack.some(([a,b],i)=>i&&Math.abs(x-(a+crack[i-1][0])/2)<=.6+Math.abs(a-crack[i-1][0])/2&&y>=Math.min(b,crack[i-1][1])&&y<=Math.max(b,crack[i-1][1])&&Math.abs(x-(crack[i-1][0]+(a-crack[i-1][0])*((y-crack[i-1][1])/((b-crack[i-1][1])||1))))<.8);
 return {shape:sh,height:(x,y)=>dome(x,y,-1,-30,28,36,16)+faceRelief(x,y,1.1),mat:MAT.porcelain(c),hole:eye,
  paint:(x,y)=>{const tear=c[2]||'#7aa8d8';
   for(const e of [EL,ER]){const dx=x-e[0],dy=y-e[1];if(Math.abs(dx)<=7&&dy>=-5.6&&dy<=-3.4+Math.abs(dx)*.12)return C('#2a2230');if(dy<-5&&dy>-8&&Math.abs(dx)<6&&(dx+40)%3===0&&dy>-7.5)return C('#2a2230');
    if(Math.abs(dx)<=1.4&&dy>=5&&dy<=13)return dy>10?C(tear):(dx<0?C('#a8c8ec'):C(tear));if(inE(x,y,e[0],e[1]+14.5,2.2,2.6))return x<e[0]?C('#c8e0ff'):C(tear);
    if(inE(x,y,e[0]+(e===EL?-2:2),e[1]+13,6,3.4)&&bay(x,y)<.45)return C('#e8a8b4');}
   if(inE(x,y,-1,-10.2,5,1.6))return y<-10.5?C('#c43848'):C('#9a2034');if(inE(x,y,-1,-8.4,3.4,1.2))return C('#b02a3e');
   if(nearCrack(x,y))return C('#6a6068');return null;},
  post:put=>{for(const sd of [-1,1]){const x=sd<0?-30:28;fill(put,x,-34,2.4,2,C('#3a2a30'));line(put,[[x,-33],[x+sd*4,-26]],C('#5a3a44'));}}};},
// Eisen, festgeschmiedet (Eisenmaske)
iron:(c,st)=>{const sh=(x,y)=>faceShape(x,y,{rx:29,top:-68,bot:4,chinPinch:.1}),slit=(x,y)=>Math.abs(y+34+(x>-1?.0:0))<=1.4&&((x>=-26&&x<=-8)||(x>=6&&x<=24));
 const breath=(x,y)=>{for(let by=-17;by<=-5;by+=4)for(let bx=-9;bx<=7;bx+=4)if(inE(x,y,bx,by,1.3,1.3))return true;return false;};
 const riv=[[-23,-58],[21,-58],[-27,-44],[25,-44],[-26,-18],[24,-18],[-16,-2],[14,-2],[-1,-64]];
 return {shape:sh,height:(x,y)=>dome(x,y,-1,-32,30,38,15)+2.4*Math.exp(-((x+1)**2)/1.6)*(y<-6?1:0)+G(x,y,-1,-40,22,2.5,1.5)+riv.reduce((a,[rx,ry])=>a+G(x,y,rx,ry,1,1,2.2),0)+G(x,y,10,-50,4,3,-1.6)+G(x,y,-14,-12,3,2,-1.2),
  mat:MAT.iron(c),hole:(x,y)=>slit(x,y)?1:breath(x,y)?2:0,holeShade:.3,
  paint:(x,y,v)=>{const n=Math.sin(x*.21+y*.13)+Math.sin(x*.07-y*.29+1.3)+hash(x*3+y*5,11)*.9;if(n>1.75)return {lad:[C('#2a1408'),C('#4a240e'),C('#6e3814'),C('#8e4e1e'),C('#a86428')],v};
   if(Math.abs(y+44)<1&&Math.abs(x+1)<23)return C('#2a2c2e');return null;},
  post:put=>{for(const sd of [-1,1]){const x=sd<0?-31:29;for(let y=-40;y<=-30;y++)put(x+(sd>0?0:-1),y,C('#3a2a1c'));fill(put,x,-35,2,3,C('#4a4e50'));put(x,-36,C('#a0a6aa'));}}};},
// Gold, nach dem Gesicht gegossen (Champion)
gold:(c,st)=>{const sh=(x,y)=>faceShape(x,y,{rx:27,top:-64,bot:3}),eye=eyesAlmond(6.4,3,-.04);
 return {shape:sh,height:(x,y)=>dome(x,y,-1,-30,28,36,15)+G(x,y,-1,-22,3.2,9,6.5)+G(x,y,-17,-40,7,2.2,2.6)+G(x,y,15,-40,7,2.2,2.6)+G(x,y,-19,-24,6,4,3)+G(x,y,17,-24,6,4,3)+G(x,y,-1,-12.4,6.4,1.6,2.2)+G(x,y,-1,-8,5,1.8,2.4)+G(x,y,-1,-1,6,3,2)-G(x,y,-1,-10.2,6,.6,1.5),
  mat:MAT.gold(c),hole:eye,
  paint:(x,y)=>{if(Math.abs(y+10.2)<.6&&Math.abs(x+1)<6.5)return C('#3a2004');if((inE(x,y,-4,-15.5,1.4,1)||inE(x,y,2,-15.5,1.4,1)))return C('#3a2004');
   const ly=-52+Math.abs(x+1)*.05;for(let i=-4;i<=4;i++){const lx=-1+i*5.4;if(inE(x,y,lx,ly+Math.abs(i)*.5,2.4,1.2))return Math.abs(i)%2?C('#8a5c14'):C('#6a420c');}return null;}}},
// Schädel (Knochenmann)
bone:(c,st)=>{const sh=(x,y)=>inE(x,y,-1,-40,28.5,27)||(y>=-40&&y<=2&&Math.abs(x+1)<=(y<-20?26:26-(y+20)*.55));
 const sock=(x,y)=>inE(x,y,-16,-33,8.6,7.2)||inE(x,y,15,-33,8.6,7.2),nose=(x,y)=>(inE(x,y,-3.4,-20,2.6,4)||inE(x,y,1.6,-20,2.6,4))&&y<-16||(y>=-17&&y<=-14&&Math.abs(x+1)<=(-14-y)*1.2);
 return {shape:sh,height:(x,y)=>dome(x,y,-1,-36,30,40,15)+G(x,y,-19,-23,6,4,3.4)+G(x,y,17,-23,6,4,3.4)+G(x,y,-16,-42,8,3,3)+G(x,y,15,-42,8,3,3)-G(x,y,-28,-28,4,6,3)-G(x,y,26,-28,4,6,3),
  mat:MAT.bone(c),hole:(x,y)=>sock(x,y)?1:nose(x,y)?2:0,holeShade:.5,cavLight:(x,y)=>(y+20)/8*.4,
  paint:(x,y,v)=>{if(y>=-13&&y<=-5&&Math.abs(x+1)<=11-(y+13)*.3){const col=(x+1+12)%3,top=y===-13,gap=col===0||y===-9;if(gap)return C('#2a2016');return {lad:[C('#8a806a'),C('#c8bea4'),C('#ece4d0'),C('#fffaf0')],v:v+(top?-.25:0)};}
   if((Math.abs(x-6-(y+58)*.4)<.6&&y>-60&&y<-48)||(Math.abs(x+12+(y+56)*.3)<.6&&y>-58&&y<-50))return C('#5a5040');
   if(Math.sin(x*.3)+Math.sin(y*.25+1)>1.5&&bay(x,y)<.4)return {lad:[C('#5a4c34'),C('#8a7a58'),C('#b0a07a'),C('#cfc09a')],v};return null;}}},
// Pestarzt: Leder, Glasaugen, langer Schnabel
beak:(c,st)=>{const bw=y=>y<-28?0:Math.max(0,9.5*Math.max(0,1-(y+28)/36)**.75+.5),bc=y=>-1+(y+28)*.04,inBeak=(x,y)=>y>=-28&&y<=8&&Math.abs(x-bc(y))<=bw(y);
 const face=(x,y)=>faceShape(x,y,{rx:28,top:-64,bot:2}),sh=(x,y)=>face(x,y)||inBeak(x,y),goggle=(x,y)=>inE(x,y,-15,-36,7.6,7.6)||inE(x,y,13,-36,7.6,7.6);
 const L2=ladder(c[1]||'#a89c7e',7,.85,.5);
 return {shape:sh,ladder:(x,y)=>inBeak(x,y)?L2:null,height:(x,y)=>inBeak(x,y)&&y>-28?14+Math.sqrt(Math.max(0,1-((x-bc(y))/Math.max(.6,bw(y)))**2))*11-(y+28)*.1:dome(x,y,-1,-30,29,36,14)+G(x,y,-1,-48,26,2,1.4),
  mat:MAT.leather(c),hole:(x,y)=>goggle(x,y)&&!inE(x,y,-15,-36,6,6)&&!inE(x,y,13,-36,6,6)?0:goggle(x,y)?1:0,holeShade:0,
  paint:(x,y)=>{if(inBeak(x,y)&&y>-27&&Math.abs(x-bc(y))>bw(y)-1.1)return C('#3a2814');if(inBeak(x,y)&&y>-27&&y<-24&&Math.abs(x-bc(y))<bw(y))return C('#5a4428');if(inBeak(x,y)&&Math.abs(x-bc(y))<.6&&(y%3)!==0&&y>-24)return C('#4a3420');if(inBeak(x,y)&&y>=-6&&y<=-3&&(inE(x,y,bc(y)-2.4,-4.5,.9,1.4)||inE(x,y,bc(y)+2.4,-4.5,.9,1.4)))return C('#1a120a');
   if(Math.abs(y+50)<=1.5&&face(x,y))return y===-50?C('#3a2a1a'):C('#5a4430');return null;},
  post:put=>{for(const g of [[-15,-36],[13,-36]]){for(let a=0;a<64;a++){const t=a/64*Math.PI*2;for(const r of [6.4,7.2])put(g[0]+Math.cos(t)*r,g[1]+Math.sin(t)*r,t>2.4&&t<5.3?C('#f0c860'):t>.6&&t<2.4?C('#6a4a12'):C('#b08a2a'));}
   fill(put,g[0],g[1],5.6,5.6,C('#4a7a78'),.42);line(put,[[g[0]-3,g[1]-3],[g[0]-1,g[1]-4.6]],C('#ffffff'),1);put(g[0]+3,g[1]+2,C('#d8f4f0'),.7);}}};},
// Fuchs: rot-orange lackiert, weiße Schnauze, schwarze Ohrspitzen
fox:(c,st)=>{const ear=(x,y,sd)=>y>=-70&&y<=-46&&Math.abs(x-(sd*18-1))<=(y+70)*.48;const head=(x,y)=>y<-30?inE(x,y,-1,-30,27,25):y<=6&&Math.abs(x+1)<=27-(y+30)*.64;
 const sh=(x,y)=>head(x,y)||ear(x,y,-1)||ear(x,y,1),eye=(x,y)=>almond(x,y,[-16,-34],7.4,2.8,.28)||almond(x,y,[14,-34],7.4,2.8,-.28)?1:0;
 const white=(x,y)=>y>-30&&(Math.abs(x+1)>4.5||y>-6)&&!(y<-18&&Math.abs(x+1)<9);
 const L1=ladder(c[0]||'#d8702a',7,.85,.5),L2=ladder('#ece4dc',7,.6,.6);
 return {shape:sh,height:(x,y)=>(head(x,y)?dome(x,y,-1,-26,28,32,12):6)+G(x,y,-1,-12,6,13,8)+G(x,y,-1,0,4,3,2)+G(x,y,-16,-40,6,2,1.2)+G(x,y,14,-40,6,2,1.2),
  mat:MAT.lacquer([c[0]||'#d8702a']),ladder:(x,y)=>white(x,y)?L2:L1,hole:eye,
  paint:(x,y,v)=>{for(const sd of [-1,1])if(ear(x,y,sd)){if(y<-62)return C('#1a100c');if(Math.abs(x-(sd*18-1))<=(y+70)*.22&&y>-62)return {lad:ladder('#3a1a14',5),v};}
   if(inE(x,y,-1,1.2,3.6,2.6))return y<1?C('#3a3034'):C('#0e0a0c');
   for(const [ex,tl] of [[-16,.28],[14,-.28]]){const dx=x-ex,dy=y+34-dx*tl;if(Math.abs(dx)<=8&&dy>=-4.6&&dy<=-2.6)return C('#1a0e0c');if(Math.abs(dx)<=8.5&&dy>2.6&&dy<=4)return C('#c82a24');}
   if(inE(x,y,-1,-50,2,4))return C('#c82a24');if(inE(x,y,-1,-55,1.2,1.2))return C('#f0c040');
   if(white(x,y)&&y>-14&&y<-4&&(x+1)%6===0&&Math.abs(x+1)>6)return C('#2a2224');return null;}}},
// Eber: Fell, Schnauze, Hauer
boar:(c,st)=>{const snout=(x,y)=>inE(x,y,-1,-8,11,8.5);const ear=(x,y,sd)=>y>=-68&&y<=-50&&Math.abs(x-(sd*21-1))<=(y+68)*.42;
 const sh=(x,y)=>inE(x,y,-1,-32,29.5,30)||snout(x,y)||ear(x,y,-1)||ear(x,y,1),eye=(x,y)=>inE(x,y,-15,-36,4.4,2.6)||inE(x,y,13,-36,4.4,2.6)?1:snout(x,y)&&(inE(x,y,-5.2,-7,1.8,2.6)||inE(x,y,3.2,-7,1.8,2.6))?2:0;
 const L2=ladder('#b89088',6,.75,.4);
 return {shape:sh,height:(x,y)=>dome(x,y,-1,-32,30,32,13)+(snout(x,y)?10+dome(x,y,-1,-8,11,8.5,3):0)+G(x,y,-14,-42,8,3,4)+G(x,y,12,-42,8,3,4),
  mat:MAT.hide([c[0]||'#5a3a24']),ladder:(x,y)=>snout(x,y)?L2:null,hole:eye,
  paint:(x,y,v)=>{if(y<-56&&Math.abs(x+1)<6&&(x+y)%2===0)return C('#1a0e08');for(const sd of [-1,1])if(ear(x,y,sd)&&Math.abs(x-(sd*21-1))<=(y+68)*.18)return {lad:ladder('#8a5a4a',5),v};
   for(const e of [[-15,-36],[13,-36]])if(inE(x,y,e[0],e[1]+3.6,6,1.2))return C('#1a0e08');return null;},
  post:put=>{for(const sd of [-1,1]){for(let i=0;i<22;i++){const k=i/21,x=sd*(9+k*9+k*k*3)-1,y=-2-k*18+k*k*4,w=3.2-k*2.2;for(let u=-w;u<=w;u+=.5){const tone=u<-w*.3?C('#fffaf0'):u>w*.4?C('#b8a888'):C('#ece4d0');put(x+u,y,tone);}}put(sd*19-1,-17,C('#fffff8'));}}};},
// Teufelsfratze: roter Lack, Hörner, offener Mund mit Fangzähnen
demon:(c,st)=>{const sh=(x,y)=>faceShape(x,y,{rx:28.5,top:-64,bot:5,chinPinch:.06}),eye=(x,y)=>inE(x,y,-16,-34,6,4.4)||inE(x,y,14,-34,6,4.4),mouth=(x,y)=>inE(x,y,-1,-9,11,5.4);
 return {shape:sh,height:(x,y)=>dome(x,y,-1,-30,29,36,14)+G(x,y,-15,-42,8,3,5)+G(x,y,13,-42,8,3,5)+G(x,y,-1,-24,4,6,4.5)+G(x,y,-20,-22,6,4,4)+G(x,y,18,-22,6,4,4)+G(x,y,-1,-15,10,2,2.5)+G(x,y,-1,-2,9,2,2),
  mat:MAT.lacquer([c[0]||'#8a2018']),hole:(x,y)=>eye(x,y)||mouth(x,y)?1:0,holeShade:.1,
  paint:(x,y)=>{for(const [ex,sd] of [[-16,-1],[14,1]]){const dx=x-ex,dy=y+34;if(Math.abs(dx)<=9&&dy<-5&&dy>-9.5+Math.abs(dx+sd*3)*.35)return C('#140806');if(inE(x,y,ex,-34,7.6,6)&&!inE(x,y,ex,-34,6,4.4))return C('#e8c040');}
   for(let i=0;i<5;i++)if(inE(x,y,-1+(i-2)*4.4,-54+Math.abs(i-2)*1.2,1.2,1.2))return C('#f0c848');
   if(Math.abs(x+1)<1&&y>-52&&y<-46)return C('#1a0806');return null;},
  post:put=>{const ivory=[C('#6a5a3a'),C('#b8a678'),C('#e8dcb0'),C('#fff8e0')];
   for(const sd of [-1,1]){for(let i=0;i<26;i++){const k=i/25,x=sd*(14+k*14+Math.sin(k*2.2)*4)-1,y=-56-k*20+k*k*8,w=4.4-k*3.4;for(let u=-w;u<=w;u+=.5)put(x+u*.9,y+u*.25*sd,ivory[u<-w*.3?3:u>w*.4?1:2]);}}
   // Fangzähne über dem offenen Mund
   for(const [fx,dir,len] of [[-8,1,5],[6,1,5],[-4,-1,3.4],[2,-1,3.4]]){const y0=dir>0?-13.6:-4.2;for(let k=0;k<len;k++){const w=1.6*(1-k/len);for(let u=-w;u<=w;u+=.5)put(fx+u,y0+dir*k,u<0?C('#fffaf0'):C('#d8ccb0'));}}}};},
// Schwarzes Tuch vor Mund und Nase (Meuchler) – bewegt sich mit dem Kiefer
cloth:(c,st)=>{const drop=(st.talk||0)*3;const top=x=>-25+Math.abs(x+1)*.1-G(x,-25,-1,-25,3.4,1,3),bot=x=>3.5+drop*(1-Math.min(1,Math.abs(x+1)/16))+Math.sin(x*.42)*.9;
 const sh=(x,y)=>Math.abs(x+1)<=29.5-(y>-6?(y+6)*.5:0)&&y>=top(x)&&y<=bot(x);
 return {shape:sh,height:(x,y)=>Math.sqrt(Math.max(0,1-((x+1)/33)**2))*12+G(x,y,-1,-21,3.6,4.4,4.5)+(Math.sin((x+1)*.3+y*.09)*.7+Math.sin((x+1)*.13-y*.05+1)*.9)*(1-Math.min(1,Math.abs(y+11)/22))+G(x,y,-1,-1,8,3,1.5)+drop*G(x,y,-1,0,9,4,1.2)+G(x,y,24,-14,3,6,2.4),
  mat:MAT.cloth([c[0]||'#1e1e28']),paint:(x,y)=>Math.abs(y-top(x))<1.2?C(c[2]||'#3a3a48'):null,
  post:put=>{const L=ladder(c[0]||'#1e1e28',6,.6,.42);for(let i=0;i<12;i++)fill(put,27+Math.sin(i)*1.4,-16+i*1.6,3.2-i*.12,1.4,L[2+(i%3)]);for(let i=0;i<14;i++){put(30+i*.4,-6+i*1.2,L[2]);put(32+i*.5,-6+i*1.1,L[1]);}}};},
// Henkerskapuze: schwarzes Tuch, spitz, ausgefranste Augenlöcher
exec:(c,st)=>{const sh=(x,y)=>(y>=-82&&y<-60&&Math.abs(x+1)<=(y+82)*.95)||(y>=-64&&y<=-8&&inE(x,y,-1,-34,31,34))||(y>-8&&y<=16&&Math.abs(x+1)<=29+(y+8)*.7),
 eye=(x,y)=>(inE(x,y,-16,-34,6.4+hash(y*3,1)*1.4,3.8+hash(x*5,2)*.9)||inE(x,y,14,-34,6.4+hash(y*3,3)*1.4,3.8+hash(x*5,4)*.9))?1:0;
 return {shape:sh,height:(x,y)=>dome(x,y,-1,-34,32,48,13)+Math.sin(x*.18+y*.05)*.9+Math.sin(x*.07-y*.04+2)*1.2+G(x,y,-1,-22,4,6,3)+G(x,y,-1,-62,6,8,2)+G(x,y,-1,-44,18,4,1.4),
  mat:MAT.cloth([c[0]||'#1a1414']),hole:eye,holeShade:.2,paint:(x,y)=>(Math.abs(x+1)<.6&&y<-40&&(y%3))?C('#3a2a2a'):(Math.abs(y+12)<.6&&Math.abs(x+1)<5)?C('#080606'):null}},
// Spiegel ohne Gesicht (Gesichtsloser)
mirror:(c,st)=>{const ph=(st.frame||0)/16,sh=(x,y)=>faceShape(x,y,{rx:27,top:-64,bot:3}),slit=(x,y)=>(Math.abs(y+34)<=1.1&&((x>=-21&&x<=-12)||(x>=10&&x<=19)))?1:0;
 const lad=[C('#10141c'),C('#2a323e'),C('#4a5462'),C('#76828e'),C('#a6b2bc'),C('#d4dce2'),C('#ffffff')];
 return {shape:sh,height:(x,y)=>dome(x,y,-1,-30,28,36,18),mat:{lad,amb:.2,spec:1.4,shin:60,specCol:'#ffffff',
   env:(x,y,nx,ny,v)=>{let e=ny<-.2?.66+(-ny-.2)*.5:ny<0?.9:ny<.22?.42:.5+(ny-.22)*.25;e+=-nx*.16+(v-.5)*.25;const sw=((x*.55+y*.25+ph*70)%70+70)%70;if(sw<5)e+=.45*(1-sw/5);
    if(inE(x,y,-1,-20,8,11))e-=.07;return tone(lad,e,x,y);}},hole:slit,holeShade:.5}},
// Sackleinen mit ausgeschnittenen Augen und zugenähtem Mund (Vogelscheuche)
sack:(c,st)=>{const sh=(x,y)=>{const a=Math.atan2(y+34,x+1),r=Math.hypot((x+1)/31,(y+34)/39);return (r<=1+.05*Math.sin(a*5+1)+.03*Math.sin(a*11))&&y<=6||(y>6&&y<=12&&Math.abs(x+1)<=18+(y-6)*1.4);};
 const eye=(x,y)=>(inE(x,y,-16,-34,5.8+hash(y,1)*1.6,5+hash(x,2)*1.2)||inE(x,y,14,-34,5.8+hash(y,3)*1.6,5+hash(x,4)*1.2))?1:0;
 return {shape:sh,height:(x,y)=>dome(x,y,-1,-34,32,42,14)+Math.sin(x*.2+1)*Math.sin(y*.17)*2.4+G(x,y,-1,-22,4,5,2.6),mat:MAT.burlap([c[0]||'#9a8252']),hole:eye,holeShade:.3,
  paint:(x,y)=>{if(Math.abs(y+10)<=2.2&&x>=-12&&x<=10){const k=((x+12)%5+5)%5;if((k===0||k===4)&&Math.abs(y+10)<=2.2&&(Math.abs(y+10)>=1.4||k===0))return C('#2a1a0e');if(Math.abs(y+10)<.6&&k!==2)return C('#3a2614');}
   if(y>=4&&y<=7)return (x+y)%2?C('#6a5228'):C('#8a6c38');for(const e of [[-16,-34],[14,-34]])if(inE(x,y,e[0],e[1],8.8,8)&&!inE(x,y,e[0],e[1],7.6,6.8)&&((x*7+y*3)%5===0))return C('#3a2814');return null;},
  post:put=>{for(let i=0;i<26;i++){const sd=i%2?1:-1,x0=sd*(16+hash(i,3)*10)-1,y0=8+hash(i,5)*4,len=6+hash(i,7)*8,ang=(sd>0?.4:2.74)+(hash(i,9)-.5)*.6;line(put,[[x0,y0],[x0+Math.cos(ang)*len,y0+Math.sin(ang)*len*.6+3]],hash(i,1)>.5?C('#e8c868'):C('#c8a040'));}
   for(let i=0;i<10;i++){const sd=i%2?1:-1,y0=-50+i*5;line(put,[[sd*31-1,y0],[sd*(36+hash(i,4)*4)-1,y0-2+hash(i,6)*4]],C('#d8b858'));}}};}
};
R.MASKS=MASKS;
const stateOf=(v,t,o)=>v==='cloth'?{talk:Math.round(clamp(o?.talk||0)*2)/2}:v==='mirror'?{frame:Math.floor(((t||0)*4)%16)}:{};
const keyOf=(rel,st)=>rel.v+'|'+(rel.c||[]).join(',')+'|'+JSON.stringify(st);
function bufFor(rel,t,o){const st=stateOf(rel.v,t,o),key=keyOf(rel,st);return [key,bufOf(key,()=>MASKS[rel.v](rel.c||[],st))];}
// ---------- in ART.mask einhängen ----------
const A=R.ART.mask,oldFace=A.face,oldFig=A.fig,oldIcon=A.icon;
A.face=(q,rel,t,o={})=>{if(!MASKS[rel?.v])return oldFace(q,rel,t,o);const [key,buf]=bufFor(rel,t,o);blitFace(q,key,buf);};
A.fig=(P,rel,t,o={})=>{if(!MASKS[rel?.v])return oldFig(P,rel,t,o);if(P.back){const hx=Math.round(P.head.x),hy=Math.round(P.head.y);P.rect(hx-8,hy+1,17,1,'#2a1a14');return;}const [key,buf]=bufFor(rel,t,o);blitFig(P,key,buf);};
A.icon=(q,rel,t)=>{if(!MASKS[rel?.v])return oldIcon(q,rel,t);const [key,buf]=bufFor(rel,t,{});const k=.36,sub=(x,y,w,h,col)=>q(16+x*k,27+y*k,w*k,h*k,col);if(q.c&&q.fm){sub.c=q.c;sub.fm={s:q.fm.s*k,to:(x,y)=>q.fm.to(16+x*k,27+y*k)};}blitFace(sub,key,buf);};
window.RELIC_MASKS_READY=true;
})();
