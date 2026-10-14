'use strict';
// =====================================================================================================
// KAPITEL 2 · BILDER (Pixelstil des Spiels, alles in Weltpixeln der 900 × 670 großen Ludus-Karte)
// · Die Hühnerhändlerin: eigene Figur (wilde Mähne mit brütender Henne, Federboa, Flickenrock, Ringelstrümpfe,
//   schielende Glupschaugen), Posen: gehen/ziehen, stehen, verkaufen, flattern, zeigen, klopfen, umarmen
// · Ihr Holzkarren mit drei Käfigen; die Hähne darin zeichnet ArenaArt.rooster (dieselbe Darstellung wie überall)
// · Das Hahnenschild (gemalter Hahn aus der Hahnengrafik), das Beastrium als Gebäude und als Innenraum
// =====================================================================================================
(()=>{
const M=window.MG,CF=window.CF,ART=window.ArenaArt,HS=window.HS;
const A=HS.art={};
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
function painter(g){const R=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
 const line=(x0,y0,x1,y1,w,c)=>{const n=Math.max(1,Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));for(let i=0;i<=n;i++)R(x0+(x1-x0)*i/n-w/2,y0+(y1-y0)*i/n-w/2,w,w,c);};
 return {R,line};}

// ---------- Hühnerhändlerin ----------
const COL={out:'#2a1c14',skin:'#e2b48a',skinS:'#b98763',blush:'#d0705a',hair:'#c9562a',hairL:'#ee8a3a',hairD:'#7e2f17',eye:'#f6f1df',pupil:'#160d0a',mouth:'#5c1a1a',teeth:'#f2e8cf',
 blouse:'#d8c9a0',blouseS:'#ab9b74',vest:'#4f7a3a',vestS:'#365a28',skirt:['#b13b35','#3f6aa0','#d6a93c','#5f8a3a','#8a4f8f'],hem:'#5a3b25',apron:'#9c8a5c',apronS:'#73653f',dirt:'#5a4a30',
 sock:'#6a4a7a',sock2:'#e0c34a',shoe:'#3a2a1e',fw:'#f1ecdc',fo:'#de7d2c',fb:'#9a6436',fr:'#b8322a'};
A.SELLER=COL;
// o: {x,y,dir,pose,t,phase,mouth,look}
A.seller=function(g,o){const SC=o.scale??1.22;g.save();g.translate(o.x,o.y);g.scale(SC,SC);g.translate(-o.x,-o.y);try{drawSeller(g,o);}finally{g.restore();}};
function drawSeller(g,o){const {R,line}=painter(g),d=o.dir||1,t=o.t||0,pose=o.pose||'stand',walking=pose==='walk'||pose==='pull';
 const X=(dx,w=1)=>d>0?o.x+dx:o.x-dx-w+1,Y=dy=>o.y+dy,P=(dx,dy,w,h,c)=>R(X(dx,w),Y(dy),w,h,c),L=(a,b,c,e,w,col)=>line(X(a),Y(b),X(c),Y(e),w,col);
 const ph=o.phase||0,s=walking?Math.sin(ph):0,bob=walking?Math.abs(Math.cos(ph))*1.2:(pose==='flail'?Math.abs(Math.sin(t*14))*1.5:Math.sin(t*2.2)*.4),by=-Math.round(bob);
 g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(o.x,o.y+1,12,3,0,0,7);g.fill();
 // Beine mit Ringelstrümpfen
 const hipY=-17+by,legs=[[-2,-2-s*4,Math.max(0,-Math.cos(ph))*2],[2,3+s*4,Math.max(0,Math.cos(ph))*2]];
 for(const [hx,fx,lift] of walking?legs:[[-2,-3,0],[2,3,0]]){const n=14;for(let i=0;i<n;i++){const k=i/n,x=hx+(fx-hx)*k,y=hipY+(-2-lift-hipY)*k;P(Math.round(x)-1,Math.round(y),3,1,(Math.floor(i/2)%2)?COL.sock:COL.sock2);}
  P(Math.round(fx)-1,-3-lift,5,3,COL.shoe);P(Math.round(fx)+2,-3-lift,2,1,'#6a5040');}
 // Flickenrock mit ausgefranstem Saum, Dreck und Federn
 const sw=walking?Math.round(s):0;
 for(let r=0;r<15;r++){const y=-27+r+by,half=6+Math.round(r*.32),x0=-half+sw*(r>8?1:0);for(let c=0;c<half*2;c+=1){const patch=Math.floor((c+(r>7?2:0))/4)+Math.floor(r/5)*2;let col=COL.skirt[patch%5];if(r===6||r===7)col=COL.hem;if(r===14&&(c+Math.floor(t*0))%3===1)continue;if(r>11&&hash(c*7+r)>.82)col=COL.dirt;P(x0+c,y,1,1,col);}}
 // Schürze vorn
 for(let r=0;r<11;r++)P(1,-26+r+by,6-(r>8?1:0),1,r%4===3?COL.apronS:COL.apron);P(3,-20+by,2,2,COL.dirt);
 // Oberkörper: Bluse, grüne Weste
 for(let r=0;r<10;r++){const y=-37+r+by;P(-5,y,11,1,COL.blouse);P(-5,y,3,1,COL.vestS);P(3,y,3,1,COL.vest);}
 P(-1,-36+by,3,8,COL.blouseS);P(0,-33+by,1,1,'#b8322a');P(0,-30+by,1,1,'#b8322a');
 // Federn am Rock
 for(const [fx,fy,col] of [[-7,-21,COL.fw],[5,-17,COL.fo],[-3,-14,COL.fb]]){P(fx,fy+by,1,5,col);P(fx-1,fy+1+by,1,3,col);P(fx+1,fy+2+by,1,2,col);P(fx,fy+5+by,1,1,COL.out);}
 // Arme
 const sh=[[-4,-35+by],[4,-35+by]],H=handsFor(pose,t,ph,by);
 for(let i=0;i<2;i++){const [sx,sy]=sh[i],[hx,hy]=H[i],ex=(sx+hx)/2+(i?1:-1)*1.5,ey=(sy+hy)/2+2;L(sx,sy,ex,ey,2,COL.blouse);L(ex,ey,hx,hy,2,COL.blouseS);P(hx-1,hy-1,3,3,COL.skin);}
 // Federboa um die Schultern
 for(let i=0;i<16;i++){const x=-7+i,y=-38+by+(i%3===0?1:0)+Math.round(Math.sin(t*6+i)*.5);P(x,y,1,3,[COL.fw,COL.fo,COL.fr,COL.fw,COL.fb][i%5]);}
 P(-8,-37+by,2,2,COL.fo);P(8,-37+by,2,2,COL.fw);
 // Kopf
 const hx=0,hy=-46+by,look=o.look??Math.sin(t*1.7)*1.2;
 hair(P,hx,hy,t,o,false);
 for(let r=0;r<9;r++)P(-3,hy+r,9,1,r>6?COL.skinS:COL.skin);P(-3,hy,2,9,COL.skinS);
 P(6,hy+3,2,2,COL.skin);P(7,hy+4,1,1,COL.blush);// Knollennase mit roter Spitze
 P(-1,hy+5,1,1,COL.blush);P(4,hy+6,1,1,COL.blush);
 // Glupschaugen, schielend
 P(2,hy+1,3,3,COL.eye);P(2+Math.round(1+look*.6),hy+2+Math.round(Math.sin(t*3.1)*.6),1,1,COL.pupil);
 P(-1,hy+2,2,2,COL.eye);P(-1+(look>0?0:1),hy+3,1,1,COL.pupil);
 P(1,hy-1+(o.mouth==='shout'?-1:0),4,1,COL.hairD);P(-2,hy,2,1,COL.hairD);// Brauen, eine hochgezogen
 const m=o.mouth||'grin';
 if(m==='shout'){P(1,hy+6,4,3,COL.mouth);P(1,hy+6,4,1,COL.teeth);P(2,hy+8,2,1,'#a83a3a');}
 else if(m==='closed'){P(1,hy+7,4,1,COL.mouth);}
 else{P(0,hy+6,6,2,COL.mouth);P(1,hy+6,4,1,COL.teeth);P(2,hy+6,1,1,COL.mouth);}
 hair(P,hx,hy,t,o,true);
}
function handsFor(pose,t,ph,by){const w=Math.sin(t*12),f=Math.sin(t*14);
 switch(pose){
  case 'walk':return [[-6+Math.sin(ph)*3,-25+by],[6-Math.sin(ph)*3,-26+by]];
  case 'pull':return [[-11,-24+by],[6-Math.sin(ph)*3,-26+by]];
  case 'sell':return [[-11,-31+by],[9,-50+by+w*2]];
  case 'flail':return [[-11,-47+by+f*4],[11,-47+by-f*4]];
  case 'point':return [[-6,-26+by],[13,-38+by]];
  case 'knock':return [[-6,-26+by],[11,-31+by+Math.abs(Math.sin(t*10))*3]];
  case 'hug':return [[-2,-30+by],[4,-31+by]];
  case 'hips':default:return [[-8,-26+by],[8,-26+by]];}}
// Wilde Mähne (hinten) und Stirnsträhnen (vorn), darin eine brütende Henne und zwei Federn
function hair(P,hx,hy,t,o,front){const cx=hx+1,cy=hy+3,j=Math.sin(t*9)*.6;
 if(!front){for(let a=0;a<64;a++){const ang=a/64*Math.PI*2,rr=8+hash(a*3.1)*4+(a%5===0?3:0)+j*hash(a);for(let r=4;r<rr;r+=1){const x=Math.round(cx+Math.cos(ang)*r*1.05),y=Math.round(cy+Math.sin(ang)*r*.95-2);if(y>hy+8&&Math.abs(x-cx)<6)continue;P(x,y,1,1,r>rr-2?COL.hairD:hash(a+r)>.75?COL.hairL:COL.hair);}}
  // Federn in der Mähne
  for(let i=0;i<6;i++){P(cx-9+i,hy-9-i,1,2,COL.fo);}P(cx-10,hy-4,1,1,COL.out);
  for(let i=0;i<5;i++){P(cx+6+i,hy-7-i*1.2,1,2,COL.fw);}
  // Henne im Haar
  const hb=Math.round(Math.sin(t*2.7)*.6),hy2=hy-12+hb;P(cx-3,hy2,7,4,'#efe4c8');P(cx-3,hy2+3,7,1,'#c9b890');P(cx+3,hy2-3,3,3,'#efe4c8');P(cx+6,hy2-2,2,1,'#e39a2a');P(cx+3,hy2-4,2,1,'#c8322a');P(cx+4,hy2-2,1,1,'#160d0a');P(cx-4,hy2-1,2,2,'#efe4c8');
 }else{P(hx-3,hy-1,9,2,COL.hair);P(hx-3,hy+1,2,4,COL.hair);P(hx+5,hy-1,2,3,COL.hairL);P(hx+1,hy+1,1,1,COL.hairD);}}

// ---------- Holzkarren mit drei Käfigen ----------
const roosterCv=new Map();
function roosterSprite(R,t,mood,face,w=30,h=26,size=15){let c=roosterCv.get(R.id+':'+w);if(!c){c=mk(w,h);roosterCv.set(R.id+':'+w,c);}const x=c.getContext('2d');x.clearRect(0,0,w,h);ART.rooster(x,R,{w,h,t,mood,size,x:w/2,y:h-2,seed:(R.seed||1)%7,face,shadow:false});return c;}
A.roosterSprite=roosterSprite;
A.CART={len:72,cage:21};
// o: {x (Mitte), y (Boden), t, roll, roosters:[R|null], sold:[bool], face, hover}
A.cart=function(g,o){const {R,line}=painter(g),x=Math.round(o.x),y=Math.round(o.y),t=o.t||0,face=o.face||-1;
 g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,y+1,38,4,0,0,7);g.fill();
 // Deichsel zur Händlerin
 if(o.handle){line(x+face*34,y-16,o.handle[0],o.handle[1],2,'#6b4a2c');line(x+face*34,y-13,o.handle[0],o.handle[1]+2,1,'#4a321e');}
 // Ladefläche
 R(x-36,y-18,72,5,'#7a5532');R(x-36,y-18,72,1,'#a8784a');for(let i=0;i<6;i++)R(x-34+i*12,y-17,1,4,'#56391f');R(x-37,y-13,74,2,'#4a321e');
 // Räder
 for(const wx of [x-23,x+23]){const cy=y-7,rr=7,ang=(o.roll||0);for(let a=0;a<24;a++){const k=a/24*Math.PI*2;R(wx+Math.cos(k)*rr-1,cy+Math.sin(k)*rr-1,2,2,'#3e2a18');}
  for(let i=0;i<4;i++){const k=ang+i*Math.PI/4;line(wx-Math.cos(k)*6,cy-Math.sin(k)*6,wx+Math.cos(k)*6,cy+Math.sin(k)*6,1,'#6b4a2c');}R(wx-1,cy-1,3,3,'#2a1c12');}
 // Käfige
 for(let i=0;i<3;i++){const cx=x-31+i*21,top=y-38,Rr=o.roosters?.[i],sold=o.sold?.[i],hov=o.hover===i;
  R(cx,top,20,20,'#2b2016');R(cx+1,top+15,18,4,'#c9a85a');for(let s=0;s<6;s++)R(cx+2+s*3,top+15+(s%2),2,1,'#e0c47a');
  if(Rr&&!sold){const sp=roosterSprite(Rr,t+i*1.3,o.moods?.[i]||(Math.sin(t*.7+i*2)>.6?'proud':'idle'),face);g.drawImage(sp,cx+10-15,top+19-24);}
  if(sold){R(cx+5,top+17,3,1,'#f1ecdc');R(cx+12,top+16,2,1,'#de7d2c');}
  // Gitter, Rahmen, Tür
  const bars=sold?[0,1,5,6]:[0,1,2,3,4,5,6];for(const b of bars)R(cx+1+b*3,top+1,1,18,'#3a2a18');
  if(sold){for(let b=0;b<4;b++)line(cx+20+b*2,top+2,cx+24+b*2,top+16,1,'#3a2a18');}
  R(cx,top,20,2,hov?'#e8c060':'#8a6a40');R(cx,top+18,20,2,'#8a6a40');R(cx,top,2,20,'#6e5030');R(cx+18,top,2,20,'#6e5030');R(cx+8,top-3,4,3,'#6e5030');
  if(o.labels){R(cx+6,top+21,8,5,'#e6d8b0');g.fillStyle='#2a1c14';g.font='bold 5px monospace';g.textAlign='center';g.fillText(String(i+1),cx+10,top+25.5);}}
 // Kram: Sack, Topf, Glocke
 R(x+30,y-26,6,8,'#b39a6a');R(x+31,y-27,4,2,'#8a744a');R(x-38,y-24,4,6,'#5e6a6a');R(x-37,y-25,2,1,'#9aa8a8');
};

// ---------- Hahnenschild: gemalter Hahn aus der Hahnengrafik des Spiels ----------
let signArt=null;
A.signRooster=null;
A.sign=function(){if(signArt)return signArt;const W=180,H=120,c=mk(W,H),g=c.getContext('2d');g.imageSmoothingEnabled=false;const {R}=painter(g);
 // Bretter
 for(let i=0;i<5;i++){const y=6+i*22;R(4,y,W-8,21,i%2?'#8a5a32':'#93633a');for(let k=0;k<9;k++)R(8+hash(i*9+k)*(W-30),y+3+hash(k*3+i)*15,10+hash(k+i)*16,1,'#6e4524');R(4,y+20,W-8,1,'#4a2e18');}
 R(0,2,W,4,'#5a3a20');R(0,H-6,W,4,'#5a3a20');R(0,2,4,H-4,'#5a3a20');R(W-4,2,4,H-4,'#5a3a20');
 for(const [x,y] of [[8,8],[W-11,8],[8,H-11],[W-11,H-11]]){R(x,y,3,3,'#3a3a3a');R(x,y,1,1,'#a8a8a0');}
 // roter Kreis
 g.fillStyle='#a8302a';g.beginPath();g.arc(W/2,H/2+4,40,0,7);g.fill();g.fillStyle='#c8463a';g.beginPath();g.arc(W/2,H/2+4,36,0,7);g.fill();
 // Hahn: eigene Grafik des Spiels (Feuerrot), schwarz umrandet wie aufgemalt
 const R0=A.signRooster??=CF.createRooster({seed:1000,minQuality:5,maxQuality:8});const src=mk(170,120),sg=src.getContext('2d');
 ART.rooster(sg,R0,{w:170,h:120,size:98,x:100,y:116,face:1,shadow:false,pose:{lean:-.45,hackle:1.35,wing:1.05,flap:1.2,beakOpen:1,headY:-1.5,crouch:-.1,glow:true}});
 const out=mk(170,120),og=out.getContext('2d');for(const [ox,oy] of [[-2,0],[2,0],[0,-2],[0,2],[-1,-1],[1,1]])og.drawImage(src,ox,oy);og.globalCompositeOperation='source-in';og.fillStyle='#1a100a';og.fillRect(0,0,170,120);og.globalCompositeOperation='source-over';og.drawImage(src,0,0);
 g.drawImage(out,W/2-88,H/2-58);
 // Wutstriche
 for(const [x,y,a] of [[30,30,-.6],[26,44,-.2],[150,30,.6],[154,44,.2]]){g.save();g.translate(x,y);g.rotate(a);R(-5,-1,10,3,'#1a100a');g.restore();}
 return signArt=c;};
// Schild am Schultor: Querbalken auf zwei Pfosten über dem Tor, Schild an Seilen (schwingt leicht)
A.GATE={x:610,beam:584,post:[586,632]};
A.gateSign=function(g,t,o={}){const {R}=painter(g),G=A.GATE,art=A.sign();
 if(o.frame!==false){for(const px of G.post){R(px-2,G.beam,5,40,'#5e4128');R(px-2,G.beam,1,40,'#80603c');}R(G.post[0]-6,G.beam-3,G.post[1]-G.post[0]+13,5,'#6e4a2c');R(G.post[0]-6,G.beam-3,G.post[1]-G.post[0]+13,1,'#9a7046');}
 if(o.hidden)return;const sw=(o.sway??Math.sin(t*1.3)*.03)+(o.tilt||0),w=38,h=26,cx=o.x??G.x,cy=o.y??G.beam+4;
 g.save();g.translate(cx,cy);g.rotate(sw);if(o.frame!==false&&o.y==null){R(-13,0,1,4,'#c9b07a');R(12,0,1,4,'#c9b07a');}g.imageSmoothingEnabled=false;g.drawImage(art,0,0,180,120,-w/2,o.y==null?4:-h/2,w,h);
 if(o.nails)for(let i=0;i<o.nails;i++)R(i%2?w/2-4:-w/2+2,(o.y==null?4:-h/2)+(i<2?2:h-4),2,2,'#2a2a2a');g.restore();};

// ---------- Beastrium (Gebäude auf der Karte) ----------
A.BEASTRIUM={name:'Beastrium',sub:'Tiere & Käfige',route:'beastrium',x:652,y:298,w:196,h:126};
A.beastrium=function(g,t,o={}){const {R,line}=painter(g),B=A.BEASTRIUM,x=B.x,y=B.y,w=B.w,h=B.h,rise=o.rise??1;if(rise<=0)return;
 g.save();if(rise<1){g.beginPath();g.rect(x-12,y+h-h*rise-30,w+24,h*rise+40);g.clip();}
 g.globalAlpha=.3;R(x+8,y+h-10,w,20,'#2f2a1f');g.globalAlpha=1;
 // Mauern aus Bruchstein
 R(x,y+38,w,h-38,'#6e6a52');for(let row=y+42;row<y+h-6;row+=9)for(let col=x+3+((row/9)%2)*8;col<x+w-4;col+=17){R(col,row,15,8,hash(row+col)>.5?'#8a8468':'#7c775d');R(col,row+7,15,1,'#55513f');}
 // Dach aus Holzschindeln
 g.fillStyle='#5a3a22';g.beginPath();g.moveTo(x-10,y+42);g.lineTo(x+20,y+6);g.lineTo(x+w-20,y+6);g.lineTo(x+w+10,y+42);g.closePath();g.fill();
 for(let yy=10;yy<42;yy+=5){const inset=20-(yy-6)*30/36;line(x+inset-1,y+yy,x+w-inset,y+yy,1,yy%10?'#3e2716':'#7a5232');for(let xx=x+inset+((yy/5)%2)*4;xx<x+w-inset;xx+=8)R(xx,y+yy-4,1,4,'#3e2716');}
 R(x+20,y+4,w-40,3,'#8a6040');
 // Wetterhahn auf dem First
 const vx=x+w/2,vy=y+4,sw=Math.sin(t*.8)*.25;R(vx,vy-16,1,16,'#3a3a3a');g.save();g.translate(vx,vy-16);g.scale(Math.cos(sw)>0?1:-1,1);R(-5,-6,9,5,'#2e2e2e');R(2,-9,3,4,'#2e2e2e');R(5,-8,2,1,'#2e2e2e');R(-7,-9,3,4,'#2e2e2e');R(2,-10,2,1,'#2e2e2e');g.restore();R(vx-4,vy-4,9,1,'#3a3a3a');
 // Tor mit Eisenbeschlag
 const dx=x+w/2-24,dy=y+h-54;R(dx-3,dy-4,54,58,'#4f4a3a');R(dx,dy,48,54,'#5e3e24');for(let i=0;i<8;i++)R(dx+2+i*6,dy+1,1,52,'#4a2f1a');R(dx,dy+12,48,3,'#3a3a3a');R(dx,dy+38,48,3,'#3a3a3a');R(dx+23,dy,2,54,'#2a1c12');
 for(let i=0;i<6;i++){R(dx+4+i*8,dy+13,2,1,'#9a9a90');R(dx+4+i*8,dy+39,2,1,'#9a9a90');}R(dx+20,dy+26,2,3,'#c9a54a');R(dx+26,dy+26,2,3,'#c9a54a');
 // Gitterfenster: links ein Hahn, rechts glühende Augen
 for(const [wx,kind] of [[x+16,'hahn'],[x+w-50,'augen']]){const wy=y+56;R(wx-2,wy-2,38,26,'#4f4a3a');R(wx,wy,34,22,'#16110c');
  if(kind==='hahn'){const peek=Math.sin(t*.9)>.2;if(peek){R(wx+12,wy+8,8,8,'#e8dcc0');R(wx+14,wy+5,4,3,'#c8322a');R(wx+20,wy+11,3,2,'#e39a2a');R(wx+17,wy+9,1,1,'#160d0a');}}
  else{const blink=(t%4.2)<.15;if(!blink){R(wx+9,wy+9,3,2,'#f2c040');R(wx+21,wy+9,3,2,'#f2c040');R(wx+10,wy+9,1,1,'#2a1a0a');R(wx+22,wy+9,1,1,'#2a1a0a');}}
  for(let b=0;b<6;b++)R(wx+2+b*6,wy,2,22,'#5c5c54');R(wx,wy+10,34,2,'#5c5c54');}
 // Stroh, Trog, Federn, Tatzenspuren
 R(x+6,y+h-14,22,10,'#c9a85a');R(x+6,y+h-14,22,2,'#e0c47a');R(x+8,y+h-20,18,6,'#b8964a');
 R(x+w-34,y+h-10,26,7,'#6e5030');R(x+w-32,y+h-9,22,3,'#5a7a8a');
 for(const [px,py] of [[x+w/2-38,y+h+4],[x+w/2-30,y+h+9],[x+w/2+34,y+h+5]]){R(px,py,3,2,'#5a4a34');R(px-1,py-2,1,1,'#5a4a34');R(px+1,py-3,1,1,'#5a4a34');R(px+3,py-2,1,1,'#5a4a34');}
 R(x+w/2+40,y+h+1,3,1,'#f1ecdc');R(x+w/2-44,y+h-2,2,1,'#de7d2c');
 // Namensschild wie bei den anderen Gebäuden
 R(x+w/2-62,y+22,124,22,'#a8a88c');R(x+w/2-60,y+24,120,18,'#273d3e');g.font="bold 16px 'Courier Prime',monospace";g.textAlign='center';g.fillStyle='#efe0b3';g.fillText('BEASTRIUM',x+w/2,y+38);
 g.restore();
 if(rise<1){g.globalAlpha=.5*(1-rise);for(let i=0;i<14;i++)R(x+hash(i)*w,y+h-4-hash(i*3)*14,6,3,'#c9b586');g.globalAlpha=1;}};

// ---------- Beastrium innen (Kulisse für die Filme) ----------
let inside=null;
A.CAGE_SPOTS=[[250,394],[370,394],[490,394],[610,394],[730,394]];
A.interior=function(){if(inside)return inside;const W=900,H=670,c=mk(W,H),g=c.getContext('2d');g.imageSmoothingEnabled=false;const {R}=painter(g);
 R(0,0,W,H,'#17120e');
 for(let y=150;y<330;y+=10)for(let x=((y/10)%2)*12;x<W;x+=24){const n=hash(x*.7+y);R(x,y,23,9,n<.33?'#4f4334':n<.66?'#584a39':'#4a3e31');R(x,y+9,23,1,'#271f18');}
 for(let x=60;x<W;x+=200){R(x,150,14,190,'#4a321e');R(x,150,3,190,'#6e4a2c');}R(0,146,W,8,'#3a2716');
 // Fackeln
 for(const x of [130,440,760]){R(x,236,4,14,'#4a321e');R(x-2,228,8,8,'#f0a13c');R(x,224,4,5,'#ffd27a');g.fillStyle='rgba(255,190,90,.07)';g.beginPath();g.arc(x+2,232,70,0,7);g.fill();}
 // Boden: Stroh auf Stein
 for(let y=340;y<H;y+=8){R(0,y,W,8,((y/8)%2)?'#5a4a36':'#62513b');}for(let i=0;i<260;i++)R(hash(i*1.7)*W,340+hash(i*2.3)*(H-340),4+hash(i)*6,1,hash(i*5)>.5?'#c9a85a':'#a8894a');
 // Käfigreihe an der Rückwand (Rahmen; Tiere und Gitter kommen im Bild davor)
 for(const [x,y] of A.CAGE_SPOTS){R(x-48,y-112,96,116,'#20180f');R(x-46,y-24,92,26,'#b8964a');for(let k=0;k<12;k++)R(x-44+k*8,y-22+(k%2)*3,5,1,'#e0c47a');}
 // gesperrte Gehege: Ketten, Kratzspuren, Schilder
 for(const [x,lab] of [[120,'HUND'],[800,'BÄR']]){R(x-50,180,100,150,'#1a140e');for(let k=0;k<5;k++)R(x-44+k*22,186,4,140,'#4a4a44');for(let k=0;k<3;k++)R(x-30+k*10,230+k*4,2,30,'#6a3a2a');R(x-30,170,60,12,'#3a2a18');g.font="bold 10px 'Courier Prime',monospace";g.textAlign='center';g.fillStyle='#8a7a5a';g.fillText(lab+' · BALD',x,179);}
 return inside=c;};
A.drawCage=function(g,x,y,R,t,o={}){const {R:r}=painter(g);// Gitter vor dem Tier, Namensschild
 if(R){const sp=roosterSprite(R,t,o.mood||'idle',o.face||1,64,56,34);g.drawImage(sp,x-32,y-56);}
 for(let k=0;k<9;k++)r(x-44+k*11,y-110,3,112,'#5c5c54');r(x-48,y-114,96,5,'#6e5030');r(x-48,y,96,4,'#6e5030');
 if(o.label){r(x-34,y+6,68,12,'#e6d8b0');g.font="bold 9px 'Courier Prime',monospace";g.textAlign='center';g.fillStyle='#2a1c14';g.fillText(String(o.label).slice(0,14),x,y+15);}};

// ---------- Großaufnahme der Händlerin: Gesicht und Mimik aus M.faceShot (wie alle Figuren), darüber ihre Mähne,
// die Henne, Federn, Ohrringe und Federboa; Hintergrund: Straße vor dem Schultor ----------
let sellerG=null,faceCv=null;
A.sellerG=()=>{if(sellerG)return sellerG;const rng=M.s.rng,g=M.makeGladiator(0);M.s.rng=rng;g.id='hs-seller';g.name='Hühnerhändlerin';g.sex='female';g.age=47;
 Object.assign(g.appearance,{skin:COL.skin,shade:COL.skinS,hair:COL.hair,style:3,beard:0,cloth:COL.vest,silhouette:1.15});g.scars=[];return sellerG=g;};
// Extrem schielende Glupschaugen über die Augen des Gesichts gemalt (Koordinaten der Großaufnahme bei zoom 1, ohne Kopfdrehung)
A.EYES=[[296,146],[420,146]];
function crossEyes(c,t){const R=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));},P=6,wob=Math.round(Math.sin(t*2.3)*1);
 A.EYES.forEach(([x,y],i)=>{const W=i?11:12,H=i?7:8,x0=x-W*P/2,y0=y-H*P/2-(i?0:P);
  R(x0-P,y0-P,(W+2)*P,(H+2)*P,'#3a2418');R(x0,y0,W*P,H*P,'#f6f1df');R(x0,y0+(H-1)*P,W*P,P,'#d8ccb0');
  // Pupillen beide zur Nase: linkes Auge nach rechts unten, rechtes Auge nach links oben
  const px=i?x0:x0+(W-3)*P,py=i?y0+(wob>0?P:0):y0+(H-3)*P;R(px,py,3*P,3*P,'#160d0a');R(px+P,py,P,P,'#ffffff');});
 R(A.EYES[0][0]-7*P,A.EYES[0][1]-7*P,7*P,P,'#7e2f17');R(A.EYES[1][0]-3*P,A.EYES[1][1]-4*P-wob*P,7*P,P,'#7e2f17');}
A.sellerFace=function(g,w,h,t,o={}){if(M.sceneHeads?.seller){M.sceneHeads.seller(g,w,h,A.sellerG(),t,o);return;}const {R}=painter(g);faceCv??=mk(660,420);const fc=faceCv.getContext('2d');fc.clearRect(0,0,660,420);
 try{M.faceShot.paint(fc,660,420,{g:A.sellerG(),mood:o.mood||'grin',team:0,lines:o.lines||0,zoom:1,shake:o.shake||0,yaw:0},t);}catch(e){}
 crossEyes(fc,t);
 // Hintergrund
 g.fillStyle='#8a8468';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=24)for(let x=((y/24)%2)*28;x<w;x+=56){R(x,y,54,22,hash(x+y)>.5?'#948e70':'#7c775d');}
 g.fillStyle='rgba(20,12,8,.35)';g.fillRect(0,0,w,h);
 const k=.72*(w/660),ox=(w-660*k)/2+(o.dx||0),oy=h-420*k+Math.sin(t*3)*2,hx=ox+340*k,hy=oy+150*k,rx=150*k,ry=168*k;
 // Mähne hinter dem Kopf: Büschel aus Pixelblöcken rund um den Schädel
 const B=Math.max(4,Math.round(6*k/.72));const jig=Math.sin(t*9)*.08;
 for(let a=0;a<140;a++){const ang=Math.PI*(1.02+a/140*1.36)-Math.PI*.18;const len=(.25+hash(a*3.7)*.55+(a%6===0?.3:0))*(1+jig*hash(a));for(let r=.85;r<1+len;r+=.04){const x=hx+Math.cos(ang)*rx*r,y=hy+Math.sin(ang)*ry*r;R(Math.round(x/B)*B,Math.round(y/B)*B,B,B,r>.95+len?COL.hairD:hash(a*7+r*10)>.7?COL.hairL:COL.hair);}}
 // Gesicht ausgeschnitten (Kopf, Hals, Schultern), ohne den Raum dahinter
 g.save();g.beginPath();g.ellipse(hx,hy+8*k,rx*1.06,ry,0,0,7);g.rect(ox+262*k,oy+250*k,160*k,110*k);g.moveTo(ox,oy+420*k);g.lineTo(ox+40*k,oy+340*k);g.lineTo(ox+620*k,oy+340*k);g.lineTo(ox+660*k,oy+420*k);g.closePath();g.clip();g.imageSmoothingEnabled=false;g.drawImage(faceCv,ox,oy,660*k,420*k);g.restore();
 // Strähnen über der Stirn, Federn im Haar, Henne obenauf
 for(let i=0;i<9;i++){const x=hx-rx*.75+i*rx*.19,y=hy-ry*.82+(i%2)*B;R(Math.round(x/B)*B,Math.round(y/B)*B,B*2,B*(2+i%3),i%3?COL.hair:COL.hairL);}
 for(let i=0;i<9;i++){R(hx-rx*1.1-i*B*.9,hy-ry*.6-i*B*1.3,B,B*2,COL.fo);R(hx-rx*1.1-i*B*.9+B,hy-ry*.6-i*B*1.3+B,B,B,COL.fr);}R(hx-rx*1.12,hy-ry*.55,B,B,COL.out);
 for(let i=0;i<7;i++)R(hx+rx*.8+i*B*.8,hy-ry*.7-i*B*1.2,B,B*2,COL.fw);
 const eb=Math.round(Math.sin(t*2.7)*2)*(B/2),ex=hx-B*5,ey=hy-ry*1.02-B*6+eb;
 for(const [dx,dy,ww,hh,c] of [[0,4,12,6,'#efe4c8'],[0,9,12,1,'#c9b890'],[9,0,5,5,'#efe4c8'],[14,2,3,1,'#e39a2a'],[9,-1,3,1,'#c8322a'],[10,-2,2,1,'#c8322a'],[11,1,1,1,'#160d0a'],[-3,3,4,3,'#efe4c8'],[-4,2,2,2,'#d8ccb0'],[2,6,7,1,'#d8ccb0']])R(ex+dx*B/1.5,ey+dy*B/1.5,ww*B/1.5,hh*B/1.5,c);
 if(Math.sin(t*1.1)>.85){g.font='bold '+Math.round(B*3)+'px "Courier Prime",monospace';g.textAlign='left';g.fillStyle='#f4d37a';g.fillText('gock',ex+B*12,ey-B);}
 // Ohrringe, Dreck
 for(const sx of [-1,1]){const cx=hx+sx*rx*.96,cy=hy+ry*.25;g.strokeStyle='#d9b040';g.lineWidth=B*.8;g.beginPath();g.arc(cx,cy+B*3,B*2.4,0,7);g.stroke();}
 R(hx-rx*.5,hy+ry*.25,B*2,B,'#7a5a3a');R(hx+rx*.35,hy+ry*.42,B,B,'#7a5a3a');
 // Federboa
 for(let i=0;i<34;i++){const x=ox+(80+i*15)*k,y=oy+(338+Math.sin(i*1.7+t*4)*6+(i%2)*10)*k;R(x,y,B*2,B*3,[COL.fw,COL.fo,COL.fr,COL.fw,COL.fb,'#e0c34a'][i%6]);}
 if(o.lines){g.strokeStyle='rgba(255,240,200,.6)';g.lineWidth=4;for(let i=0;i<12;i++){const a=-Math.PI*.95+i/11*Math.PI*.9,r0=ry*1.55,r1=r0+18+Math.sin(t*22+i)*8;g.beginPath();g.moveTo(hx+Math.cos(a)*r0,hy+Math.sin(a)*r0*.8);g.lineTo(hx+Math.cos(a)*r1,hy+Math.sin(a)*r1*.8);g.stroke();}}};

// ---------- Der Dorftrottel: billige Kleidung, Dolch, keine Rüstung ----------
const SILLY_FIRST=['Gaius','Lucius','Tiberius','Quintus','Decimus','Septimus','Flavius','Titus','Aulus','Spurius','Numerius','Kaeso'];
const SILLY_LAST=['Hosenlos','Kartoffelnase','Plattfuß','Wackelzahn','Dreiviertelhirn','Linksfuß','Sabberlippe','Zehenbeißer','Ohnebart','Stolperbein','Schweinsgalopp','Bohnenstroh','Schielauge','Rübenkopf','Klappohr'];
A.sillyName=r=>SILLY_FIRST[Math.floor(r()*SILLY_FIRST.length)]+' '+SILLY_LAST[Math.floor(r()*SILLY_LAST.length)];
A.idiotLook=(g,r)=>{Object.assign(g.appearance,{cloth:['#8a7a5a','#7a6a4a','#9a8058','#6e6448'][Math.floor(r()*4)],style:3,beard:r()<.5?0:1,hair:'#6a4a2a'});g.scars=[];g.height=Math.round(168+r()*12);g.weight=Math.round(58+r()*10);return g;};
})();

