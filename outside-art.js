'use strict';
/* AUSSENWELT · Grafik (Orte, Tiere, Wetter, Übersichtskarte, Tor im Ludus). Quelle der Wahrheit für Spiel und Testseite. */
/* DER SCHULDENEINTREIBER · Grafik der Testmission. Alles generativ aus dem Seed: Stimmung (Jahreszeit, Tageszeit, Wetter),
   Gebäude, Wege, Requisiten, Tiere. In der Welt gibt es bewusst keine Schriftzüge. */
(()=>{
const M=window.MG,D=window.Debt,A=window.DebtArt={};M.outsideArt=A;
const rng32=D.rng32,clamp=(v,a,b)=>v<a?a:v>b?b:v,pick=(r,l)=>l[Math.floor(r()*l.length)];
function px(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));}
A.px=px;
// Pixelschrift nur noch für das Schild im Ludus (passend zu KASERNE, SCHMIEDE …)
const F={A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',O:'010101101101010',P:'110101110100100',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',W:'101101111111101',Ä:'101010101111101',Ü:'101000101101111',' ':'000000000000000','$':'010111110011111'};
A.text=function(g,t,x,y,q,col,shadow,align='left'){t=String(t).toUpperCase();const w=[...t].length*4*q-q;if(align==='center')x-=w/2;else if(align==='right')x-=w;
 [...t].forEach((ch,i)=>{const f=F[ch];if(!f)return;for(let r=0;r<5;r++)for(let c=0;c<3;c++)if(f[r*3+c]==='1'){if(shadow)px(g,x+(i*4+c)*q+q,y+r*q+q,q,q,shadow);px(g,x+(i*4+c)*q,y+r*q,q,q,col);}});};
function noise(g,r,x0,y0,w,h,n,cols,s=2){for(let k=0;k<n;k++)px(g,x0+r()*w,y0+r()*h,s,s,cols[Math.floor(r()*cols.length)]);}
function ellipse(g,x,y,rx,ry,c){g.fillStyle=c;g.beginPath();g.ellipse(Math.round(x),Math.round(y),Math.max(1,rx),Math.max(1,ry),0,0,7);g.fill();}
// Pixel-Ellipse (harte Kanten)
function flatStone(g,x,y,c,v){x=Math.round(x);y=Math.round(y);const w=v<.5?5:4;px(g,x-2,y,w,3,'#00000026');px(g,x-2,y-1,w,2,c);px(g,x-1,y-2,w-2,1,c);px(g,x-1,y-2,1,1,'#ffffff22');}
function pell(g,x,y,rx,ry,c,step=2){for(let yy=-ry;yy<=ry;yy+=step){const w=rx*Math.sqrt(Math.max(0,1-(yy/ry)**2));px(g,x-w,y+yy,w*2,step,c);}}
function mix(a,b,t){const p=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)),A0=p(a),B0=p(b);return '#'+A0.map((v,i)=>Math.round(v+(B0[i]-v)*t).toString(16).padStart(2,'0')).join('');}
A.mix=mix;
Object.assign(A,{noise,ellipse,pell});

// ---------- Stimmung → Farben ----------
A.palette=function(mood,biome){const s=mood.season,snow=s==='winter';
 const P={snow,season:s,time:mood.time,weather:mood.weather,biome};
 P.grass=snow?['#e4eaee','#d3dbe1','#c0cad2','#f2f5f7']:biome==='wald'?['#3f5226','#4a5e2c','#34461f','#56693a']:{fruehling:['#6f8f3e','#7fa048','#5f7c35','#8db052'],sommer:['#7b8b3b','#8b9b45','#69793a','#9aa850'],herbst:['#7f7a3c','#8c8044','#6b6534','#9a8a4a']}[s];
 P.dirt=snow?['#a9a299','#958d83','#bcb6ad']:['#8a7148','#9a7f52','#6f5a38','#a88c5c'];
 P.path=snow?'#9c958c':biome==='stadt'?'#8f8676':'#8f774c';
 P.leaf=snow?['#2f4630','#3b5638','#26392a']:{fruehling:['#5d8a3a','#78a648','#9cc45a','#f2c6d0'],sommer:['#3f6a2a','#527d33','#6a9640','#7fa84a'],herbst:['#b8642a','#d08a34','#9a4a24','#e0b040']}[s];
 P.conifer=['#24402c','#2f5236','#1c3324'];
 P.flowers=snow?[]:{fruehling:['#f2c6d0','#f4e27a','#ffffff','#b9a0e0'],sommer:['#e05050','#f4d040','#ffffff','#7a8ee0'],herbst:['#d07a30','#c9a040']}[s];
 P.back=mood.time==='abend'?['#1d2430','#252c38','#2e3442']:mood.time==='morgen'?['#3a4a4a','#475a56','#55695f']:['#33452a','#3d5230','#4a6038'];
 if(snow)P.back=mood.time==='abend'?['#2a3240','#343c4c','#3e4658']:['#8a97a0','#9aa6ae','#aab5bc'];
 P.lit=mood.time==='abend'||mood.time==='morgen'||mood.weather==='nebel';
 P.roofs=[['#8c3b2c','#a24a34','#6e2c22'],['#4b5560','#5d6873','#39414a'],['#b39550','#c8aa62','#8f7638'],['#5a3b2a','#6e4a34','#3e2a1e'],['#7a4a3a','#8e5a46','#5c362a']];
 P.walls=[['#d6c7a0','#c4b48b','#9a8a66'],['#cbbd9c','#b8a986','#8f8064'],['#e0d4b4','#cdbf9c','#a39572'],['#c9b38c','#b59e77','#8a7656']];
 P.timber=['#4e3420','#5b3d26','#3e2a1a'];
 P.stone=['#8b8578','#9a9486','#6f6a5f','#5b574e'];
 return P;};

// ---------- Bäume ----------
function tree(g,x,y,s,r,P,kind){if(!kind)kind=r()<(P.snow?.6:.3)?'conifer':'leaf';
 px(g,x-8*s,y-2*s,16*s,4*s,'#00000030');
 if(kind==='conifer'){px(g,x-1.5*s,y-8*s,3*s,8*s,'#3b2a1a');const c=P.conifer;for(let k=0;k<6;k++){const w=(11-k*1.7)*s,yy=y-8*s-k*6*s;px(g,x-w,yy-6*s,w*2,7*s,c[k%2]);px(g,x-w+2*s,yy-6*s,w*.8,2*s,c[2]);if(P.snow)px(g,x-w*.8,yy-6*s,w*1.2,2*s,'#eef3f6');}return;}
 // Laubbaum: Stamm, Krone aus Blöcken (Winter: kahle Äste)
 px(g,x-2*s,y-14*s,4*s,14*s,'#4a3322');px(g,x-1*s,y-14*s,1*s,14*s,'#5e4430');
 if(P.snow){for(let k=0;k<7;k++){const a=-Math.PI/2+(k-3)*.35,L=(10+r()*8)*s;for(let i=0;i<L;i+=s)px(g,x+Math.cos(a)*i,y-14*s+Math.sin(a)*i,s,s,'#4a3322');}px(g,x-8*s,y-28*s,16*s,2*s,'#eef3f6');return;}
 const c=P.leaf;const R=(9+r()*4)*s;for(let k=0;k<7;k++){const dx=(r()-.5)*R*1.4,dy=-14*s-R*.6-(r())*R*.9;pell(g,x+dx,y+dy,R*.62,R*.5,c[k%3],Math.max(1,s));}
 for(let k=0;k<10;k++)px(g,x+(r()-.5)*R*1.6,y-14*s-R*(.3+r()*1.2),2*s,2*s,c[3]||c[2]);}
A.tree=tree;
function bush(g,x,y,s,r,P){const c=P.snow?['#5d6e60','#6f7f70']:P.leaf;px(g,x-9*s,y,18*s,2*s,'#00000030');for(let k=0;k<6;k++)pell(g,x+(r()-.5)*12*s,y-4*s-r()*4*s,5*s,4*s,c[k%2],Math.max(1,s));if(P.snow)px(g,x-6*s,y-9*s,12*s,2*s,'#eef3f6');
 if(!P.snow&&P.flowers.length&&r()<.5)for(let k=0;k<5;k++)px(g,x+(r()-.5)*12*s,y-3*s-r()*7*s,s*1.5,s*1.5,pick(r,P.flowers));}
A.bush=bush;

// ---------- Gebäude (Vorderansicht, Fußlinie y=base) ----------
let BASE=152;function setBase(v){BASE=v;}
function window_(g,x,y,w,h,P,r,o={}){px(g,x-2,y-2,w+4,h+4,'#3a2414');px(g,x,y,w,h,P.lit&&r()<.75?(r()<.5?'#f2c060':'#e8a848'):'#1f2a30');
 if(!(P.lit))px(g,x+1,y+1,w/2-1,2,'#4d6470');px(g,x+w/2-1,y,2,h,'#3a2414');px(g,x,y+h/2-1,w,2,'#3a2414');
 if(o.shutters){const sc=o.shutters;px(g,x-w/2-2,y-1,w/2,h+2,sc);px(g,x+w+2,y-1,w/2,h+2,sc);for(let k=2;k<h;k+=3){px(g,x-w/2-2,y+k,w/2,1,'#00000030');px(g,x+w+2,y+k,w/2,1,'#00000030');}}
 if(o.box&&!P.snow&&P.flowers.length){px(g,x-2,y+h+2,w+4,4,'#5b3a20');for(let k=0;k<w;k+=3)px(g,x+k,y+h-1,2,3,pick(r,P.flowers));px(g,x,y+h,w,2,'#4f7a32');}
 if(P.snow)px(g,x-2,y-3,w+4,2,'#eef3f6');}
function door_(g,x,y,w,h,r,o={}){px(g,x-2,y-2,w+4,h+2,'#2a1a10');px(g,x,y,w,h,o.color||'#5b3a20');for(let k=3;k<w-1;k+=4)px(g,x+k,y+2,1,h-2,'#00000030');if(o.arch)for(let k=0;k<4;k++)px(g,x+k,y-4+k,w-2*k,1,'#2a1a10');
 px(g,x+w-5,y+h*.55,2,2,o.gold?'#e0b02a':'#c9a65a');px(g,x-4,y+h,w+8,3,'#7f786c');}
function lamp(g,x,y,P){px(g,x,y,2,8,'#2a1a10');px(g,x-2,y+8,6,6,'#2a1a10');px(g,x-1,y+9,4,4,P.lit?'#ffd36a':'#7a7060');}
function roofGable(g,x,top,w,hr,R,P,r,thatch){// Giebel nach vorn
 for(let i=0;i<hr;i+=2){const k=i/hr,ww=w*(1-k)+6;px(g,x+w/2-ww/2,top-i-2,ww,2,thatch?(i%4?R[0]:R[1]):((i/2)%3===0?R[2]:R[0]));}
 if(thatch){for(let k=0;k<w+6;k+=3)px(g,x-3+k,top-2,2,4+((k*7)%5),R[2]);}else for(let k=0;k<hr;k+=6){const ww=w*(1-k/hr);for(let xx=0;xx<ww;xx+=7)px(g,x+w/2-ww/2+xx,top-k-6,1,4,R[2]+'88');}
 if(P.snow)for(let i=0;i<hr;i+=2){const k=i/hr,ww=w*(1-k)+6;px(g,x+w/2-ww/2,top-i-2,3,2,'#eef3f6');px(g,x+w/2+ww/2-3,top-i-2,3,2,'#eef3f6');}
}
function roofBand(g,x,top,w,hr,R,P,thatch){// Traufseite nach vorn
 for(let i=0;i<hr;i+=2){const inset=Math.round((hr-i)*.42);px(g,x-7+inset,top-hr+i,w+14-inset*2,2,thatch?(i%4?R[0]:R[1]):(i%6===0?R[2]:R[0]));}
 if(thatch)for(let k=0;k<w+12;k+=3)px(g,x-6+k,top-3,2,4+((k*5)%6),R[2]);else for(let xx=x;xx<x+w;xx+=8)px(g,xx,top-hr+6,1,hr-8,R[1]+'aa');
 px(g,x-8,top-2,w+16,3,R[2]);if(P.snow){px(g,x-6+Math.round(hr*.42),top-hr,w+12-Math.round(hr*.84),5,'#eef3f6');for(let k=0;k<w;k+=9)px(g,x+k,top-2,4,2+(k%3),'#eef3f6');}}
function chimney(g,x,top,P){px(g,x,top-14,10,16,P.stone[2]);px(g,x-1,top-16,12,3,P.stone[3]);px(g,x+2,top-12,3,10,P.stone[1]);if(P.snow)px(g,x-1,top-18,12,2,'#eef3f6');}
function wallBody(g,h,P,r,x,top,w,hh,style){const Wl=P.walls[h.wall%P.walls.length];
 if(style==='stone'){px(g,x,top,w,hh,P.stone[0]);for(let yy=top;yy<top+hh;yy+=8)for(let xx=x+((yy/8)%2?0:6);xx<x+w;xx+=12){px(g,Math.min(xx,x+w-1),yy,Math.min(11,x+w-xx),7,P.stone[(xx+yy)%3===0?1:0]);px(g,xx,yy+6,Math.min(11,x+w-xx),1,P.stone[3]);}}
 else if(style==='wood'){px(g,x,top,w,hh,'#6b4a2e');for(let xx=x;xx<x+w;xx+=6){px(g,xx,top,1,hh,'#4e3420');if(r()<.3)px(g,xx+2,top+r()*hh,2,3,'#7a5838');}}
 else{px(g,x,top,w,hh,Wl[0]);noise(g,r,x,top,w,hh,w*hh/70,[Wl[1],Wl[2]],2);px(g,x,top+hh-6,w,6,Wl[2]);
  if(style==='timber'){const tb=pick(r,P.timber);px(g,x,top,3,hh,tb);px(g,x+w-3,top,3,hh,tb);px(g,x,top,w,3,tb);px(g,x,top+Math.round(hh*.48),w,3,tb);px(g,x,top+hh-4,w,4,tb);
   const step=34+Math.floor(r()*10);for(let xx=x+step;xx<x+w-14;xx+=step){px(g,xx,top,3,hh,tb);const pat=Math.floor(r()*3);const half=Math.round(hh*.48);
    for(let k=0;k<14;k++){if(pat===0){px(g,xx+3+k*1.4,top+3+k*(half-3)/14,3,3,tb);}else if(pat===1){px(g,xx-k*1.4,top+half+3+k*(hh-half-7)/14,3,3,tb);}else{px(g,xx+3+k*1.4,top+half+3+k*(hh-half-7)/14,3,3,tb);px(g,xx-k*1.4,top+half+3+k*(hh-half-7)/14,3,3,tb);}}}}}
 // Efeu
 if(r()<.3&&!P.snow){const ex=x+r()*w*.8;for(let k=0;k<40;k++)px(g,ex+(r()-.5)*18,top+hh*.3+r()*hh*.7,2,2,pick(r,P.leaf.slice(0,2)));}}
function house(g,h,P,r){const style=h.kind==='stein'?'stone':h.kind==='kate'?'plaster':h.kind==='schuppen'||h.kind==='huette'?'wood':h.kind==='haus'?(h.v2<.5?'plaster':'stone'):'timber';
 const thatch=h.kind==='kate'||(h.kind==='bauernhof'&&h.v<.5)||(h.kind==='huette'&&h.v<.5),R=thatch?['#b39550','#c8aa62','#7f6a38']:P.roofs[h.roof%P.roofs.length];
 const gable=h.v2<.45&&h.w<200,small=h.kind==='schuppen'||h.kind==='huette';const hh=small?Math.round(h.h*.62):h.kind==='kate'?Math.round(h.h*.66):h.h,top=BASE-hh,x=h.x,w=h.w;
 wallBody(g,h,P,r,x,top,w,hh,style);
 if(h.chimney&&!small)chimney(g,h.chimney.x,top-(gable?Math.min(70,w*.5)*.45:24),P),h.chimneyTop={x:h.chimney.x+5,y:top-(gable?Math.min(70,w*.5)*.45:24)-18};
 if(gable)roofGable(g,x-4,top,w+8,Math.min(76,w*.55),R,P,r,thatch);else roofBand(g,x,top,w,small?24:thatch?42:34,R,P,thatch);
 // Fenster
 const shut=pick(r,['#3f6b5a','#7a2a20','#3f5a7a','#5b3a20','#6b5a2a']),rows=hh>100&&!small?2:1;
 for(let row=0;row<rows;row++){const nw=Math.max(1,Math.floor(w/48));for(let k=0;k<nw;k++){const wx=x+Math.round((k+.5)*w/nw)-7,wy=top+12+row*Math.round(hh*.45);if(h.door&&Math.abs(wx+7-h.door.x)<22&&row===rows-1)continue;window_(g,wx,wy,14,13,P,r,{shutters:h.v<.6?shut:null,box:r()<.5});}}
 if(h.door){const dw=small?20:24,dh=small?38:44;door_(g,h.door.x-dw/2,BASE-dh,dw,dh,r,{arch:h.v2>.6,color:pick(r,['#5b3a20','#4a5a3a','#6b3a2a','#3f4a5a'])});if(r()<.5)lamp(g,h.door.x+dw/2+5,BASE-dh-4,P);}
 // Anbauten
 if(r()<.35&&!small){const bx=x+w-2,bw=26+r()*20;px(g,bx,BASE-34,bw,34,'#6b4a2e');for(let k=0;k<bw;k+=5)px(g,bx+k,BASE-34,1,34,'#4e3420');for(let i=0;i<12;i+=2)px(g,bx-2,BASE-40+i,bw+4-i,2,R[2]);}
 if(r()<.4){px(g,x+6,BASE-14,12,14,'#5b3a20');px(g,x+7,BASE-13,10,12,'#8a6038');px(g,x+6,BASE-10,12,2,'#4e3420');}
 px(g,x-4,BASE,w+8,5,'#00000026');}
function barn(g,h,P,r){const top=BASE-h.h-10,x=h.x,w=h.w,col=pick(r,[['#7a2a20','#5e2018'],['#6b4a2e','#4e3420'],['#5a4a3a','#3e3226']]);
 px(g,x,top,w,h.h+10,col[0]);for(let xx=x;xx<x+w;xx+=7)px(g,xx,top,2,h.h+10,col[1]);roofGable(g,x-8,top,w+16,Math.min(90,w*.42),P.roofs[3],P,r,false);
 const dw=Math.min(76,w-40),dx=(h.door?h.door.x:x+w/2)-dw/2;px(g,dx-3,BASE-62,dw+6,62,'#e6dcc2');px(g,dx,BASE-58,dw,58,col[1]);
 for(let k=0;k<dw;k+=2){px(g,dx+k,BASE-58+k*58/dw,2,2,'#e6dcc2');px(g,dx+dw-2-k,BASE-58+k*58/dw,2,2,'#e6dcc2');}px(g,dx+dw/2-1,BASE-58,2,58,'#e6dcc2');
 px(g,x+w/2-12,top-26,24,18,'#2a1a10');noise(g,r,x+w/2-12,top-14,24,8,30,['#d8b850','#c9a84f']);
 noise(g,r,x,BASE-6,w,8,50,['#c9a84f','#e0c060','#a88a3a']);px(g,x-4,BASE,w+8,5,'#00000026');}
function tavern(g,h,P,r){house(g,{...h,kind:'fachwerk',v2:.9},P,r);const sx=(h.door?h.door.x:h.x+h.w/2)+28;
 px(g,sx,BASE-h.h+10,3,20,'#2a1a10');px(g,sx,BASE-h.h+10,26,3,'#2a1a10');px(g,sx+8,BASE-h.h+13,1,4,'#2a1a10');px(g,sx+18,BASE-h.h+13,1,4,'#2a1a10');
 px(g,sx+5,BASE-h.h+17,18,16,'#5b3a20');px(g,sx+8,BASE-h.h+20,10,11,'#e8c45a');px(g,sx+8,BASE-h.h+20,10,3,'#fff4d8');px(g,sx+18,BASE-h.h+22,3,6,'#e8c45a');
 for(let k=0;k<3;k++){const bx=h.x+12+k*22;px(g,bx,BASE-22,18,22,'#4b3a28');px(g,bx+2,BASE-20,14,18,'#9d7846');px(g,bx,BASE-16,18,3,'#514e40');}}
function smithy(g,h,P,r){const x=h.x,w=h.w,top=BASE-h.h+16;px(g,x,top,w*.45,h.h-16,P.stone[0]);noise(g,r,x,top,w*.45,h.h-16,120,[P.stone[1],P.stone[2]],3);
 roofBand(g,x,top,w,30,P.roofs[1],P,false);for(const k of [.45,.72,.98])px(g,x+w*k-4,top,6,h.h-16,'#4e3420');
 const fx=x+w*.12,fy=BASE-40;px(g,fx,fy,w*.25,40,P.stone[2]);px(g,fx+6,fy+8,w*.25-12,16,'#1c1210');h.forge={x:fx+w*.125,y:fy+16};
 px(g,x+w*.55,BASE-20,22,8,'#3b3632');px(g,x+w*.58,BASE-12,10,12,'#2a2622');for(let k=0;k<4;k++)px(g,x+w*.75+k*7,top+10,2,16,'#3b3632');
 chimney(g,x+w*.15,top-28,P);h.chimneyTop={x:x+w*.15+5,y:top-46};}
function chapel(g,h,P,r){house(g,{...h,kind:'stein',v2:.9,chimney:null},P,r);const cx=h.x+h.w/2,tt=BASE-h.h;px(g,cx-14,tt-70,28,60,P.stone[0]);noise(g,r,cx-14,tt-70,28,60,40,[P.stone[1],P.stone[2]],2);
 for(let i=0;i<24;i+=2)px(g,cx-16+i*.66,tt-94+i,32-i*1.32,2,P.roofs[1][i%4?0:2]);px(g,cx-6,tt-62,12,14,'#1c1614');px(g,cx-4,tt-58,8,8,'#a8862a');px(g,cx-1,tt-112,2,20,'#3a2a1a');px(g,cx-6,tt-106,12,2,'#3a2a1a');
 pell(g,cx,tt+22,7,7,'#2a1a10');pell(g,cx,tt+22,5,5,P.lit?'#e8a848':'#6a4a8a');px(g,cx-1,tt+16,2,12,'#2a1a10');px(g,cx-6,tt+21,12,2,'#2a1a10');}
function mill(g,h,P,r){house(g,{...h,kind:'stein',chimney:null},P,r);h.wheel={x:h.x+h.w-6,y:BASE-30,r:36};}
function kontor(g,h,P,r){const x=h.x,w=h.w,hh=h.h+26,top=BASE-hh;px(g,x,top,w,hh,'#6f6a5f');
 for(let yy=top;yy<BASE;yy+=10)for(let xx=x+((yy/10)%2?0:8);xx<x+w;xx+=16){px(g,Math.min(xx,x+w-1),yy,Math.min(15,x+w-xx),9,(xx*7+yy)%4===0?'#7d776b':'#69645a');px(g,xx,yy+9,Math.min(15,x+w-xx),1,'#4f4b44');}
 px(g,x-6,top-12,w+12,12,'#3b3632');for(let k=0;k<w+10;k+=16)px(g,x-4+k,top-22,10,10,'#3b3632');
 for(const fx of [.18,.42,.66,.86]){if(h.door&&Math.abs(x+w*fx-h.door.x)<30)continue;for(const fy of [.22,.6]){const wx=x+w*fx-8,wy=top+hh*fy;px(g,wx-2,wy-2,20,22,'#2a2622');px(g,wx,wy,16,18,P.lit?'#d89a40':'#1c2228');for(let k=3;k<16;k+=4)px(g,wx+k,wy,2,18,'#3b3632');}}
 // Banner mit Münze (Bild statt Schrift)
 for(const bx of [x+12,x+w-36]){px(g,bx,top+6,24,62,'#4a1410');px(g,bx+2,top+8,20,56,'#8a2a22');pell(g,bx+12,top+30,7,7,'#7a5a14');pell(g,bx+12,top+30,6,6,'#e0b02a');px(g,bx+11,top+25,2,10,'#7a5a14');for(let k=0;k<5;k++)px(g,bx+2+k*4,top+64,2,5,'#4a1410');}
 if(h.door){const dx=h.door.x-18;px(g,dx-4,BASE-56,44,56,'#1c1614');for(let k=0;k<5;k++)px(g,dx-4+k,BASE-60+k,44-2*k,1,'#1c1614');px(g,dx,BASE-52,36,52,'#3b2a1e');for(let k=0;k<3;k++)px(g,dx,BASE-46+k*15,36,3,'#c9a65a');px(g,dx+26,BASE-30,4,4,'#e0b02a');px(g,dx+8,BASE-30,4,4,'#e0b02a');}
 // Laternen mit Totenkopf
 for(const lx of [x+w*.3,x+w*.7]){px(g,lx,BASE-70,2,10,'#1c1614');px(g,lx-4,BASE-60,10,10,'#1c1614');px(g,lx-3,BASE-59,8,8,P.lit?'#ffd36a':'#8a8070');px(g,lx-1,BASE-57,4,3,'#e0d6bb');}
 px(g,x-4,BASE,w+8,5,'#00000030');}
function tower(g,h,P,r){const x=h.x+h.w/2-26,w=52,hh=h.h+60,top=BASE-hh;px(g,x,top,w,hh,P.stone[2]);noise(g,r,x,top,w,hh,140,[P.stone[0],P.stone[3]],3);for(let k=0;k<w;k+=13)px(g,x+k-2,top-10,9,10,P.stone[2]);px(g,x+w/2-5,top+20,10,16,'#1c1614');px(g,x+w/2-5,top+60,10,16,'#1c1614');
 if(P.snow)px(g,x-2,top-12,w+4,3,'#eef3f6');px(g,x+w/2,top-34,2,24,'#3a2a1a');px(g,x+w/2+2,top-34,16,10,'#8a2a22');pell(g,x+w/2+10,top-29,3,3,'#e0b02a');
 if(h.door)door_(g,h.door.x-10,BASE-30,20,30,r,{arch:true});}
function stall(g,h,P,r){const x=h.x+4,w=h.w-8,top=BASE-62;px(g,x+2,top,3,62,'#4e3420');px(g,x+w-5,top,3,62,'#4e3420');const cols=pick(r,[['#b8382e','#e8dcc0'],['#3f6b8a','#e8dcc0'],['#c9a84f','#7a2a20'],['#4f7a3a','#e8dcc0']]);
 for(let i=0;i<w;i+=10)px(g,x+i,top-12,Math.min(10,w-i),16,cols[(i/10)%2]);for(let i=0;i<w;i+=10)pell(g,x+i+5,top+5,5,3,cols[(i/10)%2],1);if(P.snow)px(g,x,top-14,w,3,'#eef3f6');
 px(g,x,BASE-30,w,10,'#6b4a2e');px(g,x,BASE-30,w,2,'#8a6038');const goods=pick(r,[['#c43a2e','#d84a3a'],['#7ea040','#5a8030'],['#e0a030','#c88a20'],['#9ab0c0','#7890a0'],['#8a5aa0','#6a4080']]);
 for(let k=0;k<w-8;k+=6)pell(g,x+4+k,BASE-33,3,3,goods[k%2],1);px(g,x+4,BASE-20,w-8,20,'#5b3a20');}
function felder(g,h,P,r){const x=h.x,w=h.w,top=60;const c=P.snow?['#e8eef1','#d8e0e5']:P.season==='herbst'?['#8a6a3a','#7a5a32']:P.season==='fruehling'?['#6a8a3a','#5a7a30']:['#d0b050','#c0a040'];
 for(let yy=top;yy<BASE;yy+=4)px(g,x,yy,w,4,c[(yy/4)%2]);if(!P.snow&&P.season==='sommer')noise(g,r,x,top,w,BASE-top,w/2,['#e0c060','#b89a38'],2);
 for(let k=0;k<w;k+=10)px(g,x+k,BASE-2,4,6,'#6b4a2e');px(g,x,BASE,w,2,'#5b3a20');}
function garden(g,h,P,r){const x=h.x,w=h.w;tree(g,x+w*.2,BASE-6,1.3,r,P);if(r()<.6)tree(g,x+w*.75,BASE-10,1.1,r,P);
 for(let k=0;k<w;k+=9){px(g,x+k,BASE-18,3,20,'#8a6038');}px(g,x,BASE-14,w,2,'#6b4a2e');px(g,x,BASE-6,w,2,'#6b4a2e');
 if(!P.snow)for(let k=6;k<w-6;k+=8){px(g,x+k,BASE-30,2,14,'#4f7a32');if(P.season!=='fruehling')pell(g,x+k+1,BASE-32,4,4,P.season==='herbst'?'#c08a30':'#f0c830',1);}}
function haystacks(g,h,P,r){for(let k=0;k<Math.max(1,Math.floor(h.w/45));k++){const cx=h.x+22+k*45,c=P.snow?['#d8dfe3','#c6ced4']:['#c9a84f','#a88a3a'];pell(g,cx,BASE-18,20,22,c[1]);pell(g,cx-2,BASE-20,17,19,c[0]);px(g,cx-1,BASE-44,2,8,'#5b3a20');}}
function laundry(g,h,P,r){const x=h.x,w=h.w;px(g,x+8,BASE-80,4,80,'#5b3a20');px(g,x+w-12,BASE-80,4,80,'#5b3a20');const cols=['#e8e0d0','#c9b89a','#7a8aa0','#b8382e','#e0d8b0','#8a6a4a'];
 for(let k=0;k<w-24;k+=2)px(g,x+12+k,BASE-78+Math.sin(k/(w-24)*Math.PI)*12,2,1,'#2a1a10');for(let k=10;k<w-34;k+=18+r()*8){const yy=BASE-77+Math.sin(k/(w-24)*Math.PI)*12;px(g,x+12+k,yy,12+r()*6,14+r()*10,pick(r,cols));}
 house(g,{...h,kind:'fachwerk',x:h.x,w:h.w,door:null,chimney:null,h:h.h*.5},P,r);}
function cemeteryWall(g,h,P,r){const x=h.x,w=h.w;tree(g,x+20,BASE-2,1.6,r,P,'conifer');tree(g,x+w-20,BASE-2,1.6,r,P,'conifer');px(g,x,BASE-22,w,22,P.stone[2]);for(let k=0;k<w;k+=14)px(g,x+k,BASE-26,12,6,P.stone[0]);
 px(g,x+w/2-16,BASE-34,32,34,'#2a2622');for(let k=0;k<32;k+=4)px(g,x+w/2-16+k,BASE-34,2,34,'#4b4540');}
function rocks(g,h,P,r){for(let k=0;k<4;k++){const cx=h.x+r()*h.w,s=14+r()*20;pell(g,cx,BASE-s*.5,s,s*.7,P.stone[3]);pell(g,cx-3,BASE-s*.6,s*.8,s*.55,P.stone[1]);if(P.snow)px(g,cx-s*.6,BASE-s*1.1,s*1.2,3,'#eef3f6');}}
function meiler(g,h,P,r){const cx=h.x+h.w/2;pell(g,cx,BASE-20,h.w*.4,30,'#2a2420');pell(g,cx,BASE-24,h.w*.36,24,'#3b332c');h.chimneyTop={x:cx,y:BASE-50};tree(g,h.x+10,BASE,1.4,r,P);}
function woodpile(g,x,y,w,P,r){for(let row=0;row<4;row++)for(let k=0;k<w/8-row;k++){const cx=x+row*4+k*8;pell(g,cx,y-row*7,4,4,'#6b4a2e',1);pell(g,cx,y-row*7,2,2,'#c8a070',1);}}
function tent(g,h,P,r){const cx=h.x+h.w/2,tw=h.w-10,th=h.h-10;const c=pick(r,[['#8a6b4a','#6e5a3e'],['#6a6a5a','#50503f'],['#7a3a2a','#5a2a1e']]);for(let i=0;i<th;i+=2){const ww=tw*i/th;px(g,cx-ww/2,BASE-th+i,ww,2,c[i%6<3?0:1]);}px(g,cx-6,BASE-26,12,26,'#2a1a10');px(g,cx-1,BASE-th-10,2,12,'#3a2a1a');px(g,cx+1,BASE-th-10,10,6,'#8a2a22');}
function palisade(g,h,P,r){for(let xx=h.x;xx<h.x+h.w;xx+=10){const hh=h.h-10+((xx*13)%9);px(g,xx,BASE-hh,9,hh,'#6b4a2e');px(g,xx,BASE-hh,2,hh,'#8a6038');px(g,xx+2,BASE-hh-6,5,6,'#6b4a2e');}px(g,h.x,BASE-60,h.w,5,'#3e2716');}
function townhouse(g,h,P,r){house(g,{...h,kind:h.v<.5?'stein':'haus',h:h.h+30,v2:.9},P,r);}
function gateTower(g,h,P,r){const x=h.x,w=h.w,top=BASE-h.h-30;px(g,x,top,w,h.h+30,P.stone[0]);noise(g,r,x,top,w,h.h+30,300,[P.stone[1],P.stone[2]],3);for(let k=0;k<w;k+=16)px(g,x+k,top-10,10,10,P.stone[0]);
 const ax=x+w/2-30;px(g,ax,BASE-80,60,80,'#1c1614');for(let k=0;k<6;k++)px(g,ax+k*2,BASE-86+k,60-k*4,1,'#1c1614');for(let k=0;k<60;k+=8)px(g,ax+k,BASE-80,2,70,'#4b4540');h.door={x:x+w/2};}
function villa(g,h,P,r){house(g,{...h,kind:'stein',v2:.9},P,r);for(let k=0;k<5;k++)px(g,h.x+10+k*(h.w-28)/4,BASE-h.h+4,7,h.h-4,'#e8e2d0');}
function quay(g,h,P,r){px(g,h.x,40,h.w,BASE-60,'#2e4a5c');noise(g,r,h.x,40,h.w,BASE-60,h.w/2,['#3b5d72','#24404f','#5a7d90'],3);px(g,h.x,BASE-24,h.w,24,'#6b4a2e');for(let xx=h.x;xx<h.x+h.w;xx+=12)px(g,xx,BASE-24,1,24,'#4e3420');
 const bx=h.x+h.w*.4;for(let i=0;i<10;i++)px(g,bx-30+i*2,BASE-46+i,60-i*4,2,'#5b3a20');px(g,bx-1,BASE-100,2,56,'#3a2a1a');for(let i=0;i<30;i+=2)px(g,bx+2,BASE-98+i,i*.8,2,'#e8e0d0');}
function vats(g,h,P,r){for(let k=0;k<4;k++){const cx=h.x+20+k*(h.w-40)/3;pell(g,cx,BASE-10,16,8,'#3a2a1a');pell(g,cx,BASE-12,13,6,pick(r,['#7a4a2a','#4a6a3a','#8a3a2a']));}house(g,{...h,kind:'schuppen',w:h.w*.5,door:null},P,r);}
function wellhouse(g,h,P,r){const cx=h.x+h.w/2;pell(g,cx,BASE-10,22,10,P.stone[3]);pell(g,cx,BASE-12,18,7,'#1b2428');px(g,cx-22,BASE-60,4,50,'#4e3420');px(g,cx+18,BASE-60,4,50,'#4e3420');roofGable(g,cx-30,BASE-58,60,24,P.roofs[0],P,r,false);}
const DRAW={fachwerk:house,haus:house,kate:house,stein:house,schuppen:house,huette:house,bauernhof:house,scheune:barn,stall:barn,wirtshaus:tavern,schmiede:smithy,kapelle:chapel,muehle:mill,kontor:kontor,turm:tower,stand:stall,felder,garten:garden,heu:haystacks,waesche:laundry,friedhofsmauer:cemeteryWall,felsen:rocks,meiler,zelt:tent,palisade,stadthaus:townhouse,lager:(g,h,P,r)=>barn(g,{...h},P,r),stadttor:gateTower,villa,kai:quay,gerbe:vats,brunnenhaus:wellhouse,
 baeume:(g,h,P,r)=>{const n=Math.max(1,Math.round(h.w/34));for(let k=0;k<n;k++)tree(g,h.x+10+k*h.w/n+(r()-.5)*10,BASE+2-r()*16,1.3+r()*.5,r,P,P.biome==='wald'&&r()<.5?'conifer':undefined);},
 holzstapel:(g,h,P,r)=>{house(g,{...h,kind:'schuppen',w:h.w*.5,door:null},P,r);woodpile(g,h.x+h.w*.55,BASE-6,h.w*.4,P,r);}};
A.building=(g,h,P,r)=>(DRAW[h.kind]||house)(g,h,P,r);
A.BASE=BASE;Object.assign(A,{woodpile,window_,door_,lamp});

// ---------- Requisiten im Feld ----------
const PROP={
 pfuetze:(g,p,P,r)=>{const rx=14+p.v*18,ry=5+p.v*3;pell(g,p.x,p.y,rx+3,ry+2,P.snow?'#8e9aa2':'#5e4a30');pell(g,p.x,p.y,rx,ry,P.snow?'#b8c8d4':'#3e4e58');px(g,p.x-rx*.4,p.y-ry*.4,rx*.5,1,'#9ab0bc');},
 blumen:(g,p,P,r)=>{if(P.snow)return;for(let k=0;k<14;k++){const x=p.x+(r()-.5)*40,y=p.y+(r()-.5)*16;px(g,x,y,1,3,'#3f6a2a');if(P.flowers.length)px(g,x-1,y-2,3,2,pick(r,P.flowers));}},
 stroh:(g,p,P,r)=>noise(g,r,p.x-20,p.y-8,40,16,26,P.snow?['#c9b878','#e8eef1']:['#c9a84f','#e0c060','#a88a3a']),
 stein:(g,p,P,r)=>{pell(g,p.x,p.y,8+p.v*6,5+p.v*3,P.stone[3]);pell(g,p.x-1,p.y-1,6+p.v*5,4+p.v*2,P.stone[1]);if(P.snow)px(g,p.x-5,p.y-5,10,2,'#eef3f6');},
 grasbuesche:(g,p,P,r)=>{for(let k=0;k<10;k++){const x=p.x+(r()-.5)*30;px(g,x,p.y-3-r()*5,2,6,P.grass[2]);px(g,x+2,p.y-2-r()*4,2,5,P.grass[3]);}},
 spuren:(g,p,P,r)=>{for(let k=0;k<12;k++)px(g,p.x-40+k*7,p.y+((k%2)?4:-4),3,2,'#00000030');},
 laub:(g,p,P,r)=>noise(g,r,p.x-24,p.y-10,48,20,34,P.snow?['#e8eef1']:['#8a6a2a','#a05a2a','#6b5a2a','#c08a30']),
 stumpf:(g,p,P,r)=>{px(g,p.x-11,p.y-8,22,10,'#5b3a20');pell(g,p.x,p.y-9,11,4,'#a07a4a',1);pell(g,p.x,p.y-9,5,2,'#7a5230',1);},
 farn:(g,p,P,r)=>{for(let k=0;k<7;k++){const a=-Math.PI+k*.5;for(let i=0;i<10;i++)px(g,p.x+Math.cos(a)*i,p.y-Math.abs(Math.sin(a))*i,2,2,P.leaf[k%2]);}},
 pilze:(g,p,P,r)=>{for(let k=0;k<4;k++){const x=p.x+k*6-10;px(g,x,p.y-4,2,4,'#e8e0d0');px(g,x-2,p.y-6,6,3,'#b8382e');px(g,x,p.y-6,1,1,'#fff');}},
 kiste:(g,p,P,r)=>{for(let k=0;k<(p.v<.5?1:2);k++){const y=p.y-k*18;px(g,p.x-12,y-20,24,22,'#5b3a20');px(g,p.x-10,y-18,20,18,'#8a6038');px(g,p.x-10,y-10,20,2,'#5b3a20');}if(P.snow)px(g,p.x-12,p.y-22-(p.v<.5?0:18),24,3,'#eef3f6');},
 pflaster:(g,p,P,r)=>noise(g,r,p.x-24,p.y-10,48,20,16,[P.stone[3],P.stone[1]],3),
 taube:()=>{},
 vogelscheuche:(g,p,P,r)=>{px(g,p.x-1,p.y-70,3,72,'#5b3a20');px(g,p.x-22,p.y-54,46,3,'#5b3a20');px(g,p.x-10,p.y-56,22,26,'#7a5a3a');px(g,p.x-6,p.y-72,14,13,'#c9a84f');px(g,p.x-9,p.y-75,20,4,'#4a3a2a');px(g,p.x-4,p.y-67,2,2,'#2a1a10');px(g,p.x+3,p.y-67,2,2,'#2a1a10');px(g,p.x-24,p.y-55,4,8,'#c9a84f');px(g,p.x+22,p.y-55,4,8,'#c9a84f');},
 beet:(g,p,P,r)=>{if(P.snow){pell(g,p.x,p.y,40,12,'#f2f5f7',2);for(let k=0;k<6;k++)px(g,p.x-30+k*12,p.y-10,2,8,'#6b5a3a');return;}px(g,p.x-40,p.y-14,80,28,'#5e4a30');for(let k=0;k<3;k++)for(let i=0;i<9;i++){const x=p.x-34+i*8,y=p.y-8+k*8;if(P.snow)px(g,x,y,5,2,'#eef3f6');else pell(g,x,y,3,2,P.season==='herbst'?'#8a7a3a':'#5a8a3a',1);}},
 karren:(g,p,P,r)=>{px(g,p.x-24,p.y-22,48,12,'#5b3a20');px(g,p.x-24,p.y-22,48,2,'#8a6038');px(g,p.x+24,p.y-16,18,2,'#5b3a20');for(const wx of [-14,14]){pell(g,p.x+wx,p.y-6,8,8,'#2a1a10');pell(g,p.x+wx,p.y-6,5,5,'#7a5230');px(g,p.x+wx-1,p.y-7,2,2,'#2a1a10');}if(p.v<.6)noise(g,r,p.x-20,p.y-30,40,8,20,P.snow?['#eef3f6']:['#c9a84f','#8a6038','#7ea040']);},
 trog:(g,p,P,r)=>{px(g,p.x-18,p.y-10,36,10,'#4e3420');px(g,p.x-16,p.y-9,32,4,P.snow?'#cfdde6':'#3e5a68');},
 brunnen:(g,p,P,r)=>{pell(g,p.x,p.y,30,16,P.stone[3]);pell(g,p.x,p.y-2,26,13,P.stone[0]);pell(g,p.x,p.y-3,18,8,'#1b2428');px(g,p.x-26,p.y-46,4,44,'#4e3420');px(g,p.x+22,p.y-46,4,44,'#4e3420');px(g,p.x-28,p.y-48,56,4,'#4e3420');px(g,p.x-3,p.y-44,6,16,'#2a1a10');px(g,p.x-4,p.y-30,8,7,'#6b4a2e');if(P.snow)px(g,p.x-28,p.y-50,56,2,'#eef3f6');},
 pferch:(g,p,P,r)=>{pell(g,p.x,p.y+10,80,28,P.snow?'#bfb5a8':'#5a4528');for(let k=0;k<9;k++){px(g,p.x-90+k*22,p.y-26,4,40,'#5b3a20');}px(g,p.x-90,p.y-20,180,3,'#6b4a2e');px(g,p.x-90,p.y-6,180,3,'#6b4a2e');},
 heuballen:(g,p,P,r)=>{px(g,p.x-22,p.y+2,44,4,'#00000030');pell(g,p.x,p.y-14,22,16,'#8a6e2c');pell(g,p.x-1,p.y-15,20,14,P.snow?'#b8a070':'#c9a84f');for(let k=4;k<18;k+=5){g.strokeStyle=P.snow?'#9a8a60':'#a88a3a';g.lineWidth=1;g.beginPath();g.ellipse(p.x+3,p.y-14,k*.9,k*.7,0,0,6.28);g.stroke();}if(P.snow){pell(g,p.x-2,p.y-26,18,6,'#f2f5f7');}else noise(g,r,p.x-20,p.y-30,40,26,12,['#e0c060','#a88a3a']);},
 misthaufen:(g,p,P,r)=>{pell(g,p.x,p.y-6,28,14,'#4a3a22');pell(g,p.x-4,p.y-10,20,10,'#5e4a2c');noise(g,r,p.x-24,p.y-18,48,16,16,['#c9a84f','#3a2a18']);},
 bach:(g,p,P,r)=>{for(let yy=150;yy<720;yy+=2){const xx=p.x+Math.sin(yy*.012+p.v*6)*40;px(g,xx-38,yy,76,2,P.snow?'#a8b8c4':'#5e4a30');px(g,xx-32,yy,64,2,P.snow?'#c6d6e0':'#3b5d72');if(yy%6===0)px(g,xx-24+Math.sin(yy*.2)*18,yy,10,2,P.snow?'#e2ecf2':'#5a7d90');}
  for(let k=0;k<8;k++){const yy=180+k*64;px(g,p.x+Math.sin(yy*.012+p.v*6)*40-36+r()*60,yy,12,7,P.stone[1]);}p.bridgeY=null;},
 saecke:(g,p,P,r)=>{for(let k=0;k<3;k++){pell(g,p.x-12+k*12,p.y-8,7,9,'#c8b48a');px(g,p.x-14+k*12,p.y-18,4,3,'#8a6a4a');}},
 grab:(g,p,P,r)=>{px(g,p.x-12,p.y-2,24,10,P.snow?'#d8dfe3':'#4a3b25');if(p.v<.5){px(g,p.x-8,p.y-22,16,22,P.stone[3]);px(g,p.x-7,p.y-21,14,20,P.stone[1]);px(g,p.x-7,p.y-23,14,3,P.stone[1]);}else{px(g,p.x-1,p.y-24,3,24,'#5b3a20');px(g,p.x-7,p.y-18,15,3,'#5b3a20');}
  if(!P.snow&&p.v>.7&&P.flowers.length)for(let k=0;k<4;k++)px(g,p.x-6+k*4,p.y,2,2,pick(r,P.flowers));if(P.snow)px(g,p.x-8,p.y-24,16,2,'#eef3f6');},
 kreuz:(g,p,P,r)=>{px(g,p.x-2,p.y-40,4,40,P.stone[3]);px(g,p.x-12,p.y-30,24,4,P.stone[3]);},
 bank:(g,p,P,r)=>{px(g,p.x-24,p.y-12,48,4,'#6b4a2e');px(g,p.x-20,p.y-8,3,8,'#4e3420');px(g,p.x+17,p.y-8,3,8,'#4e3420');},
 feuer:(g,p,P,r)=>{for(let k=0;k<10;k++){const a=k/10*6.28;pell(g,p.x+Math.cos(a)*14,p.y+Math.sin(a)*6,3,2,P.stone[3],1);}pell(g,p.x,p.y,10,4,'#2a1a10');px(g,p.x-8,p.y-2,16,3,'#4e3420');p.fire=true;},
 amboss:(g,p,P,r)=>{px(g,p.x-4,p.y-12,8,12,'#2a2622');px(g,p.x-12,p.y-18,24,6,'#3b3632');px(g,p.x+12,p.y-17,6,3,'#3b3632');},
 teich:(g,p,P,r)=>{const rx=110+p.v*40,ry=48+p.v*14;pell(g,p.x,p.y,rx+6,ry+4,P.snow?'#a8b4bc':'#4a5a30');pell(g,p.x,p.y,rx,ry,P.snow?'#cfe0ea':'#3b5d72');pell(g,p.x-rx*.2,p.y-ry*.2,rx*.6,ry*.5,P.snow?'#e2eef4':'#456c82');p.collide=0;},
 schilf:(g,p,P,r)=>{for(let k=0;k<8;k++){const x=p.x+(r()-.5)*24;px(g,x,p.y-18-r()*10,2,22,P.snow?'#a89a70':'#6a7a3a');px(g,x-1,p.y-24-r()*8,4,6,'#6b4a2a');}},
 steg:(g,p,P,r)=>{px(g,p.x-40,p.y-6,80,10,'#6b4a2e');for(let k=0;k<80;k+=8)px(g,p.x-40+k,p.y-6,1,10,'#4e3420');},
 kaefig:(g,p,P,r)=>{px(g,p.x-26,p.y-60,52,4,'#2a2622');px(g,p.x-26,p.y-2,52,4,'#2a2622');for(let k=0;k<7;k++)px(g,p.x-24+k*8,p.y-58,2,58,'#3b3632');px(g,p.x-6,p.y-24,10,8,'#e0d6bb');px(g,p.x-4,p.y-22,2,2,'#2a1a10');px(g,p.x,p.y-22,2,2,'#2a1a10');px(g,p.x-10,p.y-14,16,10,'#cfc6a8');},
 schaedel:(g,p,P,r)=>{for(let k=0;k<10;k++){const sx=p.x-22+(k%4)*11+(Math.floor(k/4)%2)*5,sy=p.y-Math.floor(k/4)*7;px(g,sx,sy,8,7,'#e0d6bb');px(g,sx+1,sy+2,2,2,'#2a1a10');px(g,sx+5,sy+2,2,2,'#2a1a10');}},
 truhe:(g,p,P,r)=>{px(g,p.x-18,p.y-16,36,20,'#3a2414');px(g,p.x-16,p.y-14,32,16,'#7a5230');px(g,p.x-16,p.y-14,32,3,'#c9a65a');px(g,p.x-3,p.y-8,6,6,'#e0b02a');if(p.v<.5)for(let k=0;k<8;k++)pell(g,p.x-12+k*3,p.y-18,2,2,'#e0b02a',1);},
 pranger:(g,p,P,r)=>{px(g,p.x-3,p.y-34,6,34,'#4e3420');px(g,p.x-26,p.y-34,52,10,'#6b4a2e');for(const k of [-16,0,16])pell(g,p.x+k,p.y-29,3,3,'#2a1a10',1);},
 busch:(g,p,P,r)=>bush(g,p.x,p.y,1.5,r,P),
 baumstamm:(g,p,P,r)=>{px(g,p.x-40,p.y-12,80,12,'#5b3a20');px(g,p.x-40,p.y-12,80,3,'#7a5230');pell(g,p.x+40,p.y-6,5,6,'#a07a4a',1);if(P.snow)px(g,p.x-38,p.y-14,76,3,'#eef3f6');},
 holzstapel:(g,p,P,r)=>woodpile(g,p.x-20,p.y,46,P,r),
 bottich:(g,p,P,r)=>{pell(g,p.x,p.y-6,18,9,'#3a2a1a');pell(g,p.x,p.y-8,14,6,pick(r,['#7a4a2a','#4a6a3a']));},
 netze:(g,p,P,r)=>{for(let k=0;k<20;k+=4){px(g,p.x-20+k,p.y-10,1,14,'#8a7a5a');px(g,p.x-20,p.y-10+k*.6,24,1,'#8a7a5a');}},
 waesche:(g,p,P,r)=>{const w=p.w||120,x=p.x-w/2,y=p.y;px(g,x,y-62,3,62,'#5b3a20');px(g,x+w,y-62,3,62,'#5b3a20');for(let k=0;k<w;k+=2)px(g,x+k,y-60+Math.sin(k/w*Math.PI)*8,2,1,'#2a1a10');for(let k=8;k<w-14;k+=14+r()*8){const yy=y-59+Math.sin(k/w*Math.PI)*8;px(g,x+k,yy,9+r()*5,11+r()*8,pick(r,['#e8e0d0','#c9b89a','#7a8aa0','#b8382e','#e0d8b0']));}},
 obstbaum:(g,p,P,r)=>{tree(g,p.x,p.y,1.25,r,P,'leaf');if(!P.snow&&P.season!=='fruehling')for(let k=0;k<6;k++)pell(g,p.x+(r()-.5)*22,p.y-26-r()*16,2,2,P.season==='herbst'?'#d07a30':'#c43a2e',1);if(P.season==='herbst')for(let k=0;k<4;k++)pell(g,p.x+(r()-.5)*30,p.y+2+r()*6,2,2,'#c43a2e',1);if(P.season==='fruehling')for(let k=0;k<10;k++)px(g,p.x+(r()-.5)*24,p.y-22-r()*20,2,2,'#f6dce4');},
 hackklotz:(g,p,P,r)=>{px(g,p.x-9,p.y-10,18,12,'#5b3a20');pell(g,p.x,p.y-10,9,3,'#a07a4a',1);px(g,p.x-2,p.y-22,3,12,'#6b4a2e');px(g,p.x-6,p.y-14,9,4,'#8a8a90');noise(g,r,p.x-20,p.y-2,40,8,14,['#c8a070','#a07a4a']);},
 tuempel:(g,p,P,r)=>{pell(g,p.x,p.y,p.rx+5,p.ry+4,P.snow?'#a8b4bc':'#4a5a30');pell(g,p.x,p.y,p.rx,p.ry,P.snow?'#cfe0ea':'#3b5d72');pell(g,p.x-p.rx*.25,p.y-p.ry*.25,p.rx*.5,p.ry*.4,P.snow?'#e2eef4':'#456c82');if(!P.snow)for(let k=0;k<6;k++){const a=r()*6.28;px(g,p.x+Math.cos(a)*p.rx*.95,p.y+Math.sin(a)*p.ry*.95-14,2,16,'#6a7a3a');}},
 statue:(g,p,P,r)=>{px(g,p.x-12,p.y-10,24,10,P.stone[3]);px(g,p.x-6,p.y-46,12,36,P.stone[1]);pell(g,p.x,p.y-50,5,5,P.stone[1]);}
};

// ---------- Zonen im Feld ----------
function fence(g,x,y,w,h,col='#7a5230',dark='#4e3420',P){for(let k=0;k<=w;k+=14){px(g,x+k,y-10,3,12,dark);px(g,x+k,y+h-10,3,12,dark);}for(let k=0;k<=h;k+=14){px(g,x,y+k-10,3,12,dark);px(g,x+w,y+k-10,3,12,dark);}
 px(g,x,y-6,w,2,col);px(g,x,y+h-6,w,2,col);px(g,x,y-6,2,h,col);px(g,x+w,y-6,2,h,col);if(P?.snow){px(g,x,y-8,w,2,'#eef3f6');px(g,x,y+h-8,w,2,'#eef3f6');}}
const ZONE={
 vorgarten:(g,z,P,r)=>{const y=z.y;for(let k=0;k<z.w;k+=6){px(g,z.x+k,y+8,2,12,'#e8dcc0');px(g,z.x+k,y+7,2,2,'#c8bca0');}px(g,z.x,y+12,z.w,2,'#c8bca0');
  if(!P.snow&&P.flowers.length)for(let k=0;k<z.w/4;k++)px(g,z.x+r()*z.w,y+r()*8,2,2,pick(r,P.flowers));px(g,z.x+z.w*.3,y+22,28,4,'#6b4a2e');px(g,z.x+z.w*.3+3,y+26,3,6,'#4e3420');px(g,z.x+z.w*.3+22,y+26,3,6,'#4e3420');},
 obstgarten:(g,z,P,r)=>{noise(g,r,z.x,z.y,z.w,z.h,z.w*z.h/60,[P.grass[3],P.grass[1]],2);},
 weide:(g,z,P,r)=>{noise(g,r,z.x,z.y,z.w,z.h,z.w*z.h/50,P.snow?['#f2f5f7']:[P.grass[3],P.grass[0]],2);for(let k=0;k<z.w;k+=16){px(g,z.x+k,z.y-8,3,14,'#5b3a20');px(g,z.x+k,z.y+z.h-8,3,14,'#5b3a20');}
  for(let k=0;k<z.h;k+=16){px(g,z.x,z.y+k-8,3,14,'#5b3a20');px(g,z.x+z.w,z.y+k-8,3,14,'#5b3a20');}for(const yy of [z.y-6,z.y-1,z.y+z.h-6,z.y+z.h-1])px(g,z.x,yy,z.w,1,'#7a5230');for(const xx of [z.x,z.x+z.w])px(g,xx+1,z.y-6,1,z.h,'#7a5230');
  px(g,z.x+z.w-30,z.y+z.h-14,24,8,'#4e3420');px(g,z.x+z.w-28,z.y+z.h-13,20,3,P.snow?'#cfdde6':'#3e5a68');},
 acker:(g,z,P,r)=>{const c=P.snow?['#e8eef1','#c9d2d8']:P.season==='herbst'?['#7a5a32','#8a6a3a']:P.season==='fruehling'?['#6a5a38','#5f8a36']:['#c9a84f','#b0903a'];
  for(let yy=0;yy<z.h;yy+=6){px(g,z.x,z.y+yy,z.w,6,c[(yy/6)%2]);}if(!P.snow&&P.season==='sommer')noise(g,r,z.x,z.y,z.w,z.h,z.w*z.h/40,['#e0c060','#a88a3a'],2);if(P.season==='fruehling'&&!P.snow)for(let yy=3;yy<z.h;yy+=6)for(let xx=0;xx<z.w;xx+=5)px(g,z.x+xx,z.y+yy,2,2,'#7fa048');},
 gemuese:(g,z,P,r)=>{px(g,z.x,z.y,z.w,z.h,'#5e4a30');for(let yy=8;yy<z.h-4;yy+=12)for(let xx=8;xx<z.w-6;xx+=10){if(P.snow)px(g,z.x+xx-3,z.y+yy-1,7,3,'#eef3f6');else pell(g,z.x+xx,z.y+yy,4,3,pick(r,P.season==='herbst'?['#8a7a3a','#c07a30']:['#4f8a32','#6aa040','#3f7a2a']),1);}
  fence(g,z.x-4,z.y+4,z.w+8,z.h,'#8a6a40','#5b3a20',P);px(g,z.x+z.w*.8,z.y-4,3,24,'#5b3a20');px(g,z.x+z.w*.8-8,z.y-20,19,10,'#7a5a3a');px(g,z.x+z.w*.8-3,z.y-28,10,8,'#c9a84f');},
 holzplatz:(g,z,P,r)=>noise(g,r,z.x+z.w*.2,z.y+z.h*.4,z.w*.6,z.h*.5,40,['#c8a070','#8a6038'],2),
 waescheplatz:(g,z,P,r)=>{const x=z.x+20,w=Math.min(160,z.w-40),y=z.y+z.h*.7;px(g,x,y-60,3,60,'#5b3a20');px(g,x+w,y-60,3,60,'#5b3a20');for(let k=0;k<w;k+=2)px(g,x+k,y-58+Math.sin(k/w*Math.PI)*8,2,1,'#2a1a10');
  for(let k=8;k<w-14;k+=16+r()*8){const yy=y-57+Math.sin(k/w*Math.PI)*8;px(g,x+k,yy,10+r()*5,12+r()*8,pick(r,['#e8e0d0','#c9b89a','#7a8aa0','#b8382e','#e0d8b0']));}z.line={x,y:y-58,w};},
 heuplatz:(g,z,P,r)=>noise(g,r,z.x,z.y+z.h*.3,z.w,z.h*.6,z.w/2,P.snow?['#eef3f6']:['#c9a84f','#e0c060'],2),
 tuempel:()=>{},
 blumenwiese:(g,z,P,r)=>{if(P.snow)return;for(let k=0;k<z.w*z.h/90;k++){const x=z.x+r()*z.w,y=z.y+r()*z.h;px(g,x,y,1,3,'#3f6a2a');if(P.flowers.length)px(g,x-1,y-2,3,2,pick(r,P.flowers));}},
 dickicht:(g,z,P,r)=>noise(g,r,z.x,z.y,z.w,z.h,z.w*z.h/80,['#2f421d','#3d5226'],3),
 lichtfleck:(g,z,P,r)=>{g.globalAlpha=.07;pell(g,z.x+z.w/2,z.y+z.h/2,z.w*.4,z.h*.4,'#fff4c0',2);g.globalAlpha=1;if(!P.snow)for(let k=0;k<20;k++)px(g,z.x+r()*z.w,z.y+r()*z.h,2,2,pick(r,P.flowers.length?P.flowers:['#fff']));},
 totholz:(g,z,P,r)=>{for(let k=0;k<3;k++){const x=z.x+20+r()*(z.w-80),y=z.y+10+r()*(z.h-20);px(g,x,y,50+r()*30,7,'#5b3a20');px(g,x,y,50,2,'#7a5230');}},
 pilzring:(g,z,P,r)=>{for(let k=0;k<12;k++){const a=k/12*6.28,x=z.x+z.w/2+Math.cos(a)*40,y=z.y+z.h/2+Math.sin(a)*18;px(g,x,y-3,2,3,'#e8e0d0');px(g,x-2,y-5,6,2,'#b8382e');}},
 marktkarren:()=>{},fasslager:()=>{},brunnenplatz:(g,z,P,r)=>noise(g,r,z.x,z.y,z.w,z.h,z.w*z.h/50,[P.stone[1],P.stone[3]],3),taubenplatz:(g,z,P,r)=>noise(g,r,z.x,z.y,z.w,z.h,z.w*z.h/60,[P.stone[1],P.stone[0]],3)};
A.ZONE=ZONE;
// ---------- Große Bäume (Kunstpixel; werden doppelt groß gezeigt) ----------
function bigTree(g,x,y,hA,r,P,kind){const snow=P.snow;
 if(kind==='conifer'){// Tanne: geschlossene Silhouette aus überlappenden Stufen (keine Lücken), Licht von links, Schnee nur auf den Stufenoberseiten
  const tw=Math.max(4,hA*.05),th=hA*.12;px(g,x-tw/2,y-th,tw,th,'#3b2a1a');px(g,x-tw/2,y-th,tw*.35,th,'#5a4028');
  const c=P.conifer,tiers=Math.max(4,Math.round(hA/16)),top=y-hA,bot=y-th+2,H=bot-top,lean=(r()-.5)*.06,jag=[];
  for(let k=0;k<tiers;k++)jag.push(.85+r()*.3);
  for(let yy=Math.floor(top);yy<bot;yy+=2){const t=(bot-yy)/H,tf=(1-t)*tiers,ti=Math.min(tiers-1,Math.floor(tf)),f=tf-ti;// f: 0 Stufenoberkante … 1 Unterkante
   const env=Math.pow(1-t,.92)*hA*.27*jag[ti],w=Math.max(1.5,env*(.5+.5*f)),cx=x+lean*(bot-yy);
   px(g,cx-w,yy,w*2,2,c[1]);px(g,cx-w,yy,w*(f<.55?1.05:.7),2,c[0]);
   if(f>.78){px(g,cx-w,yy,w*.25,2,c[2]);px(g,cx+w*.55,yy,w*.45,2,c[2]);}
   if(r()<.5)px(g,cx-w+r()*w*2,yy,2,2,c[2]);
   if(snow&&f<.22){const sw=w*(.4+r()*.35),ox=(r()-.6)*w*.4;px(g,cx-sw+ox,yy,sw*1.4,2,'#dfe8ec');if(f<.12)px(g,cx-sw*.7+ox,yy,sw*.8,1,'#f4f8fa');}}
  px(g,x+lean*H-1,top-4,2,6,c[0]);if(snow)px(g,x+lean*H-1,top-4,2,2,'#ffffff');return;}
 // Laub- und Obstbaum: Stamm mit Wurzeln, Äste, Krone aus vielen Blättergruppen
 const fruit=kind==='fruit',tw=Math.max(5,hA*(fruit?.07:.08)),th=hA*(fruit?.42:.45);
 for(let i=0;i<th;i+=2){const w=tw*(1+.5*(1-i/th)**3);px(g,x-w/2,y-i-2,w,2,'#4a3322');px(g,x-w/2,y-i-2,w*.3,2,'#5e4430');}
 px(g,x-tw*1.1,y-3,tw*.6,3,'#4a3322');px(g,x+tw*.5,y-3,tw*.6,3,'#4a3322');for(let i=0;i<th;i+=7)px(g,x-tw*.2+((i*3)%5)-2,y-i-4,2,3,'#3a2618');
 const cy=y-th-hA*.2,R=hA*(fruit?.32:.3);
 const branch=(x0,y0,a,L,d)=>{if(d>3||L<4)return;for(let i=0;i<L;i+=1.5)px(g,x0+Math.cos(a)*i,y0+Math.sin(a)*i,Math.max(1,3-d),Math.max(1,3-d),'#4a3322');const x1=x0+Math.cos(a)*L,y1=y0+Math.sin(a)*L;branch(x1,y1,a-.45-r()*.2,L*.7,d+1);branch(x1,y1,a+.45+r()*.2,L*.7,d+1);};
 if(snow){branch(x,y-th,-Math.PI/2,hA*.28,0);for(let k=0;k<8;k++)px(g,x+(r()-.5)*R*1.6,cy-R*.6+(r()-.2)*R,6,2,'#eef3f6');return;}
 branch(x,y-th,-Math.PI/2,hA*.2,1);
 const c=P.leaf,dark=A.mix(c[0],'#000000',.25),light=c[2];
 pell(g,x+R*.15,cy+R*.2,R*1.02,R*.82,dark,1);// Schatten der Krone
 for(let k=0;k<26;k++){const a=r()*6.28,d=Math.sqrt(r())*R*.75,bx=x+Math.cos(a)*d,by=cy+Math.sin(a)*d*.8,br=R*(.28+r()*.2);pell(g,bx,by,br,br*.82,k<10?dark:c[k%2],1);}
 for(let k=0;k<18;k++){const a=-Math.PI*.15-r()*Math.PI*.7,d=r()*R*.7,bx=x+Math.cos(a)*d,by=cy+Math.sin(a)*d*.8-R*.15,br=R*(.16+r()*.12);pell(g,bx,by,br,br*.8,light,1);}
 for(let k=0;k<40;k++){const a=r()*6.28,d=r()*R*.95;px(g,x+Math.cos(a)*d,cy+Math.sin(a)*d*.8,2,2,k%3?c[3]||light:dark);}
 if(P.season==='fruehling')for(let k=0;k<30;k++){const a=r()*6.28,d=r()*R*.9;px(g,x+Math.cos(a)*d,cy+Math.sin(a)*d*.8,2,2,fruit?'#f6dce4':'#ffffff');}
 if(fruit&&P.season!=='fruehling')for(let k=0;k<14;k++){const a=r()*6.28,d=r()*R*.85;pell(g,x+Math.cos(a)*d,cy+Math.sin(a)*d*.8,1.6,1.6,P.season==='herbst'?'#d07a30':'#c43a2e',1);}}
A.bigTree=bigTree;

// ---------- Vorrendern: Boden (flach) und Sprites (hoch) ----------
const AR=()=>D.ART;
function treeShadow(g,t,P){const a=AR();pell(g,t.x/a+t.hA*.12,t.y/a+2,t.hA*(t.kind==='conifer'?.18:.3),t.hA*.08,'#00000026',1);}
A.scene=function(L,place){const ART=AR(),Wa=Math.ceil(L.W/ART),Ha=Math.ceil(L.H/ART),r=rng32(L.seed^0x9e3779b9),P=A.palette(L.mood,L.biome);L.P=P;
 const c=document.createElement('canvas');c.width=Wa;c.height=Ha;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
 const pyA=xa=>D.pathY(L,xa*ART)/ART,mT=L.mT/ART,mB=L.mB/ART;
 // Boden
 px(g,0,0,Wa,Ha,P.grass[0]);for(let k=0;k<Wa*Ha/700;k++){pell(g,r()*Wa,r()*Ha,5+r()*14,2+r()*5,pick(r,[P.grass[1],P.grass[2],P.grass[1]]),2);}
 noise(g,r,0,0,Wa,Ha,Wa*Ha/90,[P.grass[2],P.grass[3]],1);
 if(L.biome==='stadt')for(let yy=mT;yy<Ha;yy+=7)for(let xx=(yy/7)%2?0:5;xx<Wa;xx+=10){px(g,xx,yy,9,6,P.stone[(xx*3+yy)%3]);px(g,xx,yy+6,9,1,P.stone[3]);}
 // ferner Hintergrund oben (Hügel, kleine Bäume)
 for(let x=0;x<Wa;x+=2){const h=mT*.55+Math.sin(x*.006+L.seed%9)*mT*.12+Math.sin(x*.03)*3;px(g,x,0,2,h,P.back[0]);px(g,x,h-2,2,2,P.back[1]);}
 for(let x=-6;x<Wa;x+=9+r()*7)A.tree(g,x,mT*.55+r()*8,.9+r()*.4,r,{...P,leaf:P.snow?P.leaf:[P.back[1],P.back[2],P.back[1],P.back[2]]},r()<.5?'conifer':'leaf');
 for(const p of L.props)if(p.kind==='bach')PROP.bach(g,{...p,x:p.x/ART},P,r);
 // Weg mit Rand, Spuren, Steinen
 for(let x=0;x<Wa;x+=1){const y=pyA(x),w=32+Math.sin(x*.02)*4;px(g,x,y-w-2,1,w*2+4,P.dirt[2]);px(g,x,y-w,1,w*2,P.path);if(x%7===0)px(g,x,y-w+3+((x*13)%((w*2-6)|0)),2,1,P.dirt[3]);px(g,x,y-9,1,1,P.dirt[2]);px(g,x,y+9,1,1,P.dirt[2]);if(r()<.4){px(g,x,y-w-3,1,2,P.grass[2]);px(g,x,y+w+1,1,2,P.grass[2]);}}
 for(let k=0;k<Wa/18;k++){const x=r()*Wa;pell(g,x,pyA(x)+(r()-.5)*40,2,1.5,P.stone[1],1);}
 // Trampelpfade von Haustüren zum Weg
 for(const h of L.houses)if(h.door&&h.front){const tx=h.door.x/ART,y0=h.base/ART+2,y1=pyA(tx)-30;g.globalAlpha=.6;for(let y=y0;y<y1;y++){const k=(y-y0)/Math.max(1,y1-y0),xx=tx+Math.sin(k*Math.PI)*(h.v2-.5)*24;px(g,xx-5,y,10,1,P.dirt[0]);}g.globalAlpha=1;for(let y=y0+4;y<y1;y+=9){const k=(y-y0)/Math.max(1,y1-y0),xx=tx+Math.sin(k*Math.PI)*(h.v2-.5)*24;flatStone(g,xx+(r()-.5)*3,y,P.stone[r()<.5?1:3],r());}}
 // Zonen und flache Requisiten
 for(const z of L.zones)(ZONE[z.kind]||(()=>{}))(g,{...z,x:z.x/ART,y:z.y/ART,w:z.w/ART,h:z.h/ART},P,r);
 for(const p of [...L.props].sort((a,b)=>a.y-b.y))if(!p.sprite&&p.kind!=='bach')(PROP[p.kind]||(()=>{}))(g,{...p,x:p.x/ART,y:p.y/ART,rx:p.rx?p.rx/ART:undefined,ry:p.ry?p.ry/ART:undefined},P,r);
 // Schatten unter Bäumen und Häusern
 for(const t of L.trees)treeShadow(g,t,P);
 for(const h of L.houses)px(g,h.x/ART-4,h.base/ART,h.wA+8,4,'#00000022');
 if(P.snow)noise(g,r,0,mT,Wa,Ha-mT,Wa*(Ha-mT)/60,['#ffffff','#e8eef1'],1);
 // Sprites vorrendern
 for(const s of L.sprites)renderSprite(s,L,P,r);
 // Leistung: Häuser, Bäume und Requisiten werden in Tiefenreihenfolge fest in den Boden eingemalt. Pro Bild wird dann nur der
 // sichtbare Bodenausschnitt kopiert. Steht jemand hinter einem dieser Dinge, malt drawSprite genau dieses eine Bild noch einmal
 // (halbdurchsichtig) über die Figur – so bleibt vorn/hinten richtig, ohne Dutzende große Bilder je Bild.
 for(const s of [...L.sprites].filter(s=>s.cv&&['tree','house','prop'].includes(s.kind)).sort((a,b)=>a.y-b.y)){g.drawImage(s.cv,Math.round(s.dx/ART),Math.round(s.dy/ART));s.baked=true;}
 L.extraObstacles=[];
 return c;};
function renderSprite(s,L,P,r){const ART=AR();
 if(s.kind==='house'){const h=s.h,ox=40,top=h.hA+190,cv=document.createElement('canvas');cv.width=h.wA+130;cv.height=top+12;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
  const hc={kind:h.kind,x:ox,w:h.wA,h:h.hA,v:h.v,v2:h.v2,roof:h.roof,wall:h.wall,door:h.doorA==null?null:{x:ox+h.doorA},chimney:h.chimney==null?null:{x:ox+h.chimney}};
  setBase(top);A.building(g,hc,P,r);setBase(152);
  s.cv=cv;s.dx=h.x-ox*ART;s.dy=h.base-top*ART;s.w=cv.width*ART;s.h=cv.height*ART;
  s.fx={};if(hc.chimneyTop)s.fx.smoke={x:s.dx+hc.chimneyTop.x*ART,y:s.dy+hc.chimneyTop.y*ART};if(hc.forge)s.fx.forge={x:s.dx+hc.forge.x*ART,y:s.dy+hc.forge.y*ART};if(hc.wheel)s.fx.wheel={x:s.dx+hc.wheel.x*ART,y:s.dy+hc.wheel.y*ART,r:hc.wheel.r*ART};return;}
 if(s.kind==='tree'){const t=s.t,wA=Math.round(t.hA*.8)+20,cv=document.createElement('canvas');cv.width=wA;cv.height=t.hA+16;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
  bigTree(g,wA/2,t.hA+8,t.hA,rng32((t.x*7+t.y*13)|0),P,t.kind);s.cv=cv;s.dx=t.x-wA/2*ART;s.dy=t.y-(t.hA+8)*ART;s.w=cv.width*ART;s.h=cv.height*ART;return;}
 if(s.kind==='prop'){const p=s.p,size=p.kind==='waesche'?Math.round((p.w||200)/ART)+60:140,hh=130,cv=document.createElement('canvas');cv.width=size;cv.height=hh;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
  const lp={...p,x:size/2,y:hh-10,w:p.w?p.w/ART:undefined};(PROP[p.kind]||(()=>{}))(g,lp,P,rng32((p.x*3+p.y)|0));s.cv=cv;s.dx=p.x-size/2*ART;s.dy=p.y-(hh-10)*ART;s.w=size*ART;s.h=hh*ART;if(lp.fire)s.fire=true;return;}}
// Tiefen-Sprites zeichnen (wird von der Arena in y-Reihenfolge mit den Kämpfern aufgerufen)
function offscreen(ctx,s){const m=ctx.getTransform(),cw=ctx.canvas.width,x0=s.cv?s.dx:(s.a?s.a.x:s.x)-60,x1=s.cv?s.dx+s.w:x0+120,sx0=m.a*x0+m.e,sx1=m.a*x1+m.e;return sx1<-40||sx0>cw+40;}
function fig(g,a){try{g.save();g.translate(a.x,a.y);g.scale(1/.6,1/.6);M.renderLudusActors(g,[{...a,x:0,y:0}]);g.restore();}catch(e){g.restore();}}
A.drawSprite=function(ctx,o){const b=window.MG.s.battle,L=b?.L;if(!L)return;const s=L.sprites[o.sid];if(!s)return;if(offscreen(ctx,s))return;const t=performance.now()/1000,ART=AR(),P=L.P;
 if(s.kind==='life'){animal(ctx,s.a,b,t,P);o.x=s.a.x;o.y=s.a.y;return;}
 if(s.kind==='idle'){const m=b.mission;if(!m||b.triggered.has(s.si))return;const st=m.place.stations[s.si],q=m.queues[s.si],g0=q[s.k];if(!g0||!(st.kind==='idle'||st.kind==='boss'))return;if(s.k>=Math.min(window.Debt.CFG.maxActive,q.length))return;
  const act=L.enc[s.si].act,sway=Math.sin(t*1.3+s.k*2);fig(ctx,{id:'idle-'+s.si+'-'+s.k,g:g0,team:1,x:s.p.x,y:s.p.y,a:s.p.face??0,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,bloodMarks:{},forgeHold:act==='fire'||act==='barrel'||(act==='sleep'&&s.k===0)?'beer':act==='argue'?'bottle':null,forgePose:sway>.85?'sip':null});return;}
 if(!s.cv)return;
 // verdeckt die Figur jemanden? Dann halb durchsichtig, damit man den Kampf noch sieht
 let hide=false;for(const a of b.actors){if(a.y<s.y-4&&a.x>s.dx+8&&a.x<s.dx+s.w-8&&a.y>s.dy+20){hide=true;break;}}
 if(!s.baked||hide){ctx.save();if(hide)ctx.globalAlpha=.5;ctx.imageSmoothingEnabled=false;ctx.drawImage(s.cv,Math.round(s.dx),Math.round(s.dy),s.w,s.h);ctx.restore();}
 const f=s.fx||{};
 if(f.smoke)for(let k=0;k<7;k++){const ph=((t*.3+k/7+s.h%1)%1),x=f.smoke.x+Math.sin(ph*5+k)*8+ph*30,y=f.smoke.y-ph*130,rr=5+ph*16;ctx.globalAlpha=.45*(1-ph);pell(ctx,x,y,rr,rr*.8,P.time==='abend'?'#6a6a7a':'#d4d4d4',2);}
 ctx.globalAlpha=1;
 if(f.forge){ctx.globalAlpha=.5+.3*Math.sin(t*9);pell(ctx,f.forge.x,f.forge.y,22,10,'#ff8a30',2);ctx.globalAlpha=1;}
 if(f.wheel){const w=f.wheel;pell(ctx,w.x,w.y,w.r,w.r,'#3a2a1a');pell(ctx,w.x,w.y,w.r-8,w.r-8,'#5b3a20');for(let k=0;k<8;k++){const a=t*.8+k*Math.PI/4;for(let i=0;i<w.r;i+=4)px(ctx,w.x+Math.cos(a)*i-2,w.y+Math.sin(a)*i-2,5,5,'#7a5230');}}
 if(s.fire){const x=s.p.x,y=s.p.y-10;for(let k=0;k<6;k++){const ph=(t*2+k*.17)%1;px(ctx,x-12+k*5+Math.sin(t*12+k)*3,y-ph*30,5,7,ph<.4?'#ffd060':ph<.7?'#ff8a30':'#c03a20');}ctx.globalAlpha=.22;pell(ctx,x,y,46,20,'#ffb050',2);ctx.globalAlpha=1;}
};
// ---------- Tiere: Verhalten (grasen, schlendern, fliehen, folgen) und Zeichnung in echter Größe ----------
const AK={// Fluchtdistanz, Geh- und Lauftempo (Welt-px/s), Gruppe
 huhn:{flee:120,walk:22,run:150},gans:{flee:110,walk:20,run:120},ente:{flee:140,walk:14,run:60},schaf:{flee:150,walk:18,run:120},kuh:{flee:110,walk:12,run:80},ziege:{flee:130,walk:20,run:140},
 schwein:{flee:120,walk:14,run:110},hund:{flee:170,walk:40,run:190},katze:{flee:160,walk:24,run:200},kraehe:{flee:150,walk:16,run:260},taube:{flee:130,walk:16,run:240},ratte:{flee:120,walk:30,run:200},reh:{flee:260,walk:24,run:260},hase:{flee:200,walk:20,run:240}};
const near=(a,list,r)=>{let best=null,bd=r;for(const x of list){const d=Math.hypot(x.x-a.x,x.y-a.y);if(d<bd){bd=d;best=x;}}return best;};
function avoid(a,b){for(const o of b.obstacles){if(o.hp<=0||Math.abs(o.x-a.x)>60||Math.abs(o.y-a.y)>60)continue;const dx=a.x-o.x,dy=a.y-o.y,d=Math.hypot(dx,dy),min=o.r+8;if(d<min&&d>.01){a.x=o.x+dx/d*min;a.y=o.y+dy/d*min;}}}
A.animalStep=function(a,b,now){const L=b.L,K=AK[a.kind]||AK.huhn,dt=Math.min(.1,(now-(a.lt||now))/1000)*Math.max(1,window.DebtUI?.T?.speed||window.MG?.s?.options?.speed||1);a.lt=now;if(!dt)return;
 a.home??={x:a.x,y:a.y};a.mode??='graze';a.tt=(a.tt??Math.random()*3)-dt;a.ph=(a.ph||0);
 const people=b.actors.filter(x=>!x.g.dead&&!x.down),fighting=b.started&&!b.done;
 const threat=near(a,people,K.flee*(fighting?1.4:1));
 if(a.hidden){a.hideT-=dt;if(a.hideT<=0&&!threat){a.hidden=false;a.mode='graze';}return;}
 // Hund: trabt einmal zu einem der Fremden, schnuppert kurz und rennt dann davon (kein Hinterherlaufen)
 const dogBusy=a.kind==='hund'&&!a.sniffed&&!fighting&&(a.mode==='approach'||a.mode==='sniff');
 if(a.kind==='hund'&&!a.sniffed&&!fighting&&people.length&&a.mode!=='flee'){
  if(a.mode==='sniff'){a.sniffT-=dt;if(a.sniffAt)a.dir=a.sniffAt.x>=a.x?1:-1;
   if(a.sniffT<=0){a.sniffed=true;const c=people.reduce((s,x)=>({x:s.x+x.x/people.length,y:s.y+x.y/people.length}),{x:0,y:0}),dx=a.x-c.x||1,dy=a.y-c.y,d=Math.hypot(dx,dy)||1;
    const py=window.Debt?.pathY?window.Debt.pathY(L,a.x):a.y,up=a.y<py;// weg vom Weg, zur Seite und etwas zurück
    a.mode='flee';a.tx=clamp(a.x+Math.sign(dx)*(60+Math.random()*90),60,(b.width||4000)-60);a.ty=up?L.mT+30+Math.random()*60:L.mB-20-Math.random()*60;a.tt=6;}}
  else{const p=near(a,people,a.mode==='approach'?420:300);
   if(p){const d=Math.hypot(p.x-a.x,p.y-a.y),sd=p.x>=a.x?-1:1;if(d<36){a.mode='sniff';a.sniffT=1.1+Math.random()*1.3;a.sniffAt={x:p.x,y:p.y};}else{a.mode='approach';a.tx=p.x+sd*22;a.ty=p.y+6;a.tt=4;}}
   else if(a.mode==='approach')a.mode='graze';}}
 if(threat&&!dogBusy){const dx=a.x-threat.x,dy=a.y-threat.y,d=Math.hypot(dx,dy)||1;
  if((a.kind==='kraehe'||a.kind==='taube')&&a.mode!=='fly'){a.mode='fly';a.fly=0;a.tx=a.x+dx/d*500+(Math.random()-.5)*200;a.ty=clamp(a.y+(Math.random()-.5)*300,L.mT+30,L.mB-20);a.tt=2.5;}
  else if(a.kind==='katze'&&a.mode!=='flee'){const door=L.houses.filter(h=>h.door).sort((p,q)=>Math.hypot(p.door.x-a.x,p.door.y-a.y)-Math.hypot(q.door.x-a.x,q.door.y-a.y))[0];a.mode='flee';a.tx=door?door.x:a.x+dx/d*300;a.ty=door?door.y-24:a.y+dy/d*300;a.tt=4;a.toDoor=!!door;}
  else if(a.mode!=='fly'&&a.mode!=='flee'){a.mode='flee';a.tx=a.x+dx/d*220;a.ty=a.y+dy/d*220+(Math.random()-.5)*60;a.tt=1.2+Math.random();}}
 if(a.mode==='graze'&&a.tt<=0){if(Math.random()<.45){const R=a.pen?0:140,px=a.pen?a.pen.x+20+Math.random()*(a.pen.w-40):a.home.x+(Math.random()-.5)*R*2,py=a.pen?a.pen.y+20+Math.random()*(a.pen.h-30):a.home.y+(Math.random()-.5)*R;a.mode='walk';a.tx=px;a.ty=py;a.tt=6;}else a.tt=2+Math.random()*4;}
 let sp=0;if(a.mode==='walk')sp=K.walk;else if(a.mode==='flee')sp=K.run;else if(a.mode==='approach')sp=K.walk*2.2;else if(a.mode==='fly')sp=K.run;
 // weich beschleunigen und abbremsen statt ruckartig loszulaufen
 a.cur=(a.cur||0)+(sp-(a.cur||0))*Math.min(1,dt*(sp>(a.cur||0)?4:6));
 if(sp&&a.tx!=null){const dx=a.tx-a.x,dy=a.ty-a.y,d=Math.hypot(dx,dy);if(d<4||a.tt<=0){if(a.mode==='fly'){a.fly=0;}if(a.mode==='flee'&&a.toDoor&&d<20){a.hidden=true;a.hideT=8+Math.random()*8;a.toDoor=false;}a.mode='graze';a.tt=1+Math.random()*3;a.moving=0;}
  else{const s=Math.min(d,Math.max(2,a.cur)*dt);a.x+=dx/d*s;a.y+=dy/d*s;if(Math.abs(dx)>2)a.dir=dx>=0?1:-1;a.moving=a.cur;a.step=(a.step||0)+s*.18;}}else a.moving=0;
 if(a.mode==='fly')a.fly=Math.min(1,(a.fly||0)+dt*2);else if(a.fly)a.fly=Math.max(0,a.fly-dt*2);
 a.y=clamp(a.y,L.mT+16,L.mB-6);if(a.pen){a.x=clamp(a.x,a.pen.x+16,a.pen.x+a.pen.w-16);a.y=clamp(a.y,a.pen.y+16,a.pen.y+a.pen.h-6);}
 if(a.kind==='ente'&&a.home){const p=L.props.find(q=>q.kind==='tuempel'&&Math.hypot(q.x-a.home.x,q.y-a.home.y)<200);if(p){const rx=(p.rx||120)-16,ry=(p.ry||46)-8,ex=(a.x-p.x)/rx,ey=(a.y-p.y)/ry,e=Math.hypot(ex,ey);if(e>1){a.x=p.x+ex/e*rx;a.y=p.y+ey/e*ry;}}}
 else if(a.mode!=='fly')avoid(a,b);};
// Zeichnung (Kunstpixel, doppelt groß; Ursprung = Füße, Blick nach rechts)
function pe(g,x,y,rx,ry,c){const R=Math.max(1,Math.round(ry)),cy=Math.round(y);g.fillStyle=c;for(let yy=-R;yy<=R;yy++){const w=rx*Math.sqrt(Math.max(0,1-(yy/(R+.5))**2));const x0=Math.round(x-w),x1=Math.round(x+w);if(x1>x0)g.fillRect(x0,cy+yy,x1-x0,1);}}
function legs(g,xs,y,h,col,phase,moving,w=2){xs.forEach((x,i)=>{const sw=moving?Math.round(Math.sin(phase+(i%2?Math.PI:0))*2):0;px(g,x+sw,y-h,w,h,col);});}
A.drawAnimal=function(g,a,t,P){if(a.hidden)return;const dir=a.dir||1,mv=a.moving||0,ph=a.step||0,graze=!mv&&Math.sin(t*.7+(a.v||0)*9)>.1,fly=a.fly||0;
 g.save();g.translate(Math.round(a.x),Math.round(a.y-fly*120));
 if(!fly&&!['ente'].includes(a.kind)){g.globalAlpha=.22;pe(g,0,1,a.kind==='kuh'?50:a.kind==='schaf'||a.kind==='reh'?26:a.kind==='ziege'||a.kind==='schwein'||a.kind==='hund'?20:10,a.kind==='kuh'?8:4,'#000',2);g.globalAlpha=1;}
 g.scale(2*dir,2);const v=a.v||0;
 switch(a.kind){
 case 'huhn':{const c=v<.4?['#f2ece0','#d8cfbd','#b8ad98']:v<.75?['#b8642a','#94491c','#6e3414']:['#3a3634','#24201e','#141210'],peck=graze&&Math.sin(t*5+v*20)>0;
  legs(g,[-1,1],0,3,'#d8a030',ph,mv,1);pe(g,0,-5,4.5,3.5,c[0],1);pe(g,-.5,-4.5,3,2,c[1],1);px(g,-6,-10,2,4,c[2]);px(g,-5,-11,2,3,c[1]);
  const hx=peck?4.5:3.5,hy=peck?-3:-8.5;pe(g,hx,hy,1.8,1.8,c[0],1);px(g,hx-.5,hy-3,2,1.5,'#c43a2e');px(g,hx+.5,hy+1,1,1.5,'#c43a2e');px(g,hx+1.5,hy-.5,1.5,1,'#e0a030');px(g,hx+.5,hy-1,1,1,'#141210');break;}
 case 'gans':{legs(g,[-1,1],0,3,'#e08a30',ph,mv,1);pe(g,0,-6,6,4,'#f2f0e8',1);pe(g,-1,-5.5,4,2.5,'#d8d6ce',1);const hy=graze?-5:-14;for(let k=0;k<5;k++)px(g,4+k*.2,-8-(graze?-k*.4:k*1.3),2,2,'#f2f0e8');pe(g,5.5,hy,2,1.8,'#f2f0e8',1);px(g,7,hy,2.5,1.2,'#e08a30');px(g,5.5,hy-.8,1,1,'#141210');break;}
 case 'ente':{const drake=v<.5;pe(g,0,-2,5.5,2.6,drake?'#8a7a5a':'#9a7a52',1);pe(g,-1,-2.5,3,1.5,drake?'#e8e4dc':'#7a5a3a',1);px(g,-6,-4,2,2,drake?'#3a3a3a':'#6a4a2a');pe(g,4,-5.5,1.8,1.8,drake?'#2a6a3a':'#8a6a42',1);px(g,5.5,-5.6,2.2,1.2,'#e0a030');px(g,4,-6.2,1,1,'#141210');if(drake)px(g,2.8,-4,2.5,.8,'#f2f0e8');
  g.globalAlpha=.4;px(g,-6+Math.sin(t*2)*1,0,12,.6,'#d8e6ee');g.globalAlpha=1;break;}
 case 'schaf':{const face=v<.5?'#2a2422':'#e8dcc0',wool=P.snow?['#e4e0d6','#cfc9bc']:['#f0ebe0','#d8d0bf'];legs(g,[-8,-5,5,8],0,6,'#2a2422',ph,mv,2);
  pe(g,0,-10,12,7.5,wool[1],1);pe(g,-.5,-10.5,11,6.5,wool[0],1);for(let k=0;k<14;k++){const x=-9+((k*7)%18),y=-15+((k*5)%9);pe(g,x,y,1.6,1.3,wool[1],1);}
  const hx=graze?13:12,hy=graze?-6:-13;pe(g,hx,hy,3,3.6,face,1);px(g,hx-3.5,hy-2.5,2.5,1.5,face);px(g,hx+.5,hy-1.5,1,1,'#f0e6c0');px(g,-12.5,-11,2,3,wool[1]);break;}
 case 'kuh':{const base=v<.5?['#f0ece0','#2a2622']:v<.8?['#8a5a32','#f0ece0']:['#5a3a24','#3a2416'],sw=Math.sin(t*1.6+v*7)*2;
  legs(g,[-17,-12,11,16],0,11,base[0]===('#f0ece0')?'#d8d2c4':base[0],ph,mv,3);px(g,-17,-1,3,1,'#2a2622');px(g,-12,-1,3,1,'#2a2622');px(g,11,-1,3,1,'#2a2622');px(g,16,-1,3,1,'#2a2622');
  pe(g,0,-19,22,10,base[0],1);px(g,-20,-28,40,3,base[0]);if(v<.8){pe(g,-8,-21,6,5,base[1],1);pe(g,7,-17,5,4,base[1],1);pe(g,-15,-15,3,3,base[1],1);}pe(g,-2,-9.5,4,2.4,'#e8b0a8',1);
  pe(g,1,-15,18,5,'#00000014',1);for(let k=0;k<10;k++)px(g,-22-k*.1,-26+k*1.4+(k>6?sw*.5:0),1.5,1.5,base[0]==='#f0ece0'?'#d8d2c4':base[0]);px(g,-23+sw*.6,-12,2,3,'#2a2622');
  const hx=graze?25:24,hy=graze?-12:-25;pe(g,hx,hy,5,5.5,base[0],1);pe(g,hx+3,hy+3.5,3.2,2.4,'#e0b8b0',1);px(g,hx+3.5,hy+3,1,1,'#2a2622');px(g,hx-1,hy-2,1.4,1.4,'#141210');px(g,hx-6,hy-4,3,2,base[0]);px(g,hx-2,hy-7,1.5,3,'#e8dcc0');px(g,hx+2,hy-7,1.5,3,'#e8dcc0');break;}
 case 'ziege':{const c=v<.5?['#e8e2d6','#c8c0b0']:['#8a6a4a','#6a4e34'];legs(g,[-7,-4,5,8],0,8,c[1],ph,mv,1.5);pe(g,0,-12,9.5,5,c[0],1);pe(g,0,-11,8,3,c[1]+'66',1);px(g,-10,-17,2,4,c[0]);
  const hx=graze?11:10,hy=graze?-8:-19;px(g,hx-3,hy+2,3,6,c[0]);pe(g,hx,hy,2.8,3,c[0],1);px(g,hx+1,hy+3,1.5,3.5,c[1]);px(g,hx-2,hy-5,1,3,'#8a8070');px(g,hx-3,hy-6,1,2,'#8a8070');px(g,hx-.5,hy-1,1,1,'#141210');px(g,hx-3.5,hy-1,2,1.2,c[1]);break;}
 case 'schwein':{legs(g,[-8,-5,5,8],0,4,'#c88a80',ph,mv,2);pe(g,0,-8,12,6.5,'#e8a89c',1);pe(g,0,-6,10,3,'#d8968a',1);pe(g,12,-8,3.5,3.5,'#e8a89c',1);pe(g,15,-7.5,1.6,2,'#d8867a',1);px(g,15,-8,1,1,'#7a3a33');px(g,11,-12,3,2.5,'#d8867a');px(g,11.5,-9.5,1,1,'#141210');
  const tw=Math.sin(t*4+v*9);px(g,-13,-11+tw,1.5,1.5,'#d8867a');px(g,-14,-12,1.5,1.5,'#d8867a');if(P.season!=='winter'&&v<.5){px(g,-9,-2,4,2,'#6a5038');px(g,4,-2,4,2,'#6a5038');}break;}
 case 'hund':{const c=v<.33?['#8a6a4a','#5a4430']:v<.66?['#2a2622','#4a4440']:['#c8b090','#8a7458'],wag=Math.sin(t*(a.mode==='sniff'||a.mode==='approach'?14:5))*2.5;legs(g,[-6,-3,4,7],0,6,c[1],ph*1.4,mv,1.5);
  pe(g,0,-9,8,4,c[0],1);px(g,-9,-12+wag*.4,2,1.5,c[0]);px(g,-11,-14+wag,2,2.5,c[0]);const hx=a.mode==='sniff'?10:9,hy=(graze&&!mv)||a.mode==='sniff'?-8+Math.sin(t*9)*.6:-13;pe(g,hx,hy,3.5,3,c[0],1);px(g,hx+2.5,hy,3,2,c[0]);px(g,hx+5,hy,1,1,'#141210');px(g,hx-1.5,hy-3.5,2,3,c[1]);px(g,hx+.5,hy-1.5,1,1,'#141210');if(a.mode==='approach'&&Math.sin(t*3)>.8)px(g,hx+3,hy+1.5,2,1.5,'#c43a5a');break;}
 case 'katze':{const c=v<.33?['#2a2622','#141210']:v<.66?['#c08040','#8a5a2a']:['#9a9a96','#6a6a66'],sw=Math.sin(t*2+v*7);legs(g,[-3,-1,2,4],0,3,c[1],ph*1.5,mv,1);pe(g,0,-4.5,5,2.5,c[0],1);
  for(let k=0;k<6;k++)px(g,-5-k*.5,-5-k*1.1+Math.sin(k*.6+sw)*1,1.2,1.2,c[0]);pe(g,5,-6.5,2.2,2,c[0],1);px(g,4,-9.5,1,2,c[0]);px(g,6,-9.5,1,2,c[0]);px(g,5.8,-7,1,1,'#c8d040');break;}
 case 'kraehe': case 'taube':{const c=a.kind==='kraehe'?['#1c1a20','#2a2a3a']:['#8a90a0','#6a7080'],fl=Math.sin(t*22);if(fly>.1){pe(g,0,-3,3.5,1.8,c[0],1);px(g,-7,-4+fl*3,6,1.5,c[0]);px(g,1,-4-fl*3,6,1.5,c[0]);px(g,3,-4,2,2,c[0]);break;}
  legs(g,[0],0,2,'#3a3a3a',ph,mv,1);pe(g,0,-3.5,3.4,2,c[0],1);px(g,-5,-4,2.5,1.3,c[0]);const hp=graze&&Math.sin(t*4+v*10)>.3;pe(g,3,hp?-3:-5.5,1.6,1.5,c[0],1);px(g,4.4,hp?-3:-5.6,1.5,.8,'#5a5a5a');if(a.kind==='taube')px(g,2.2,-4,1.5,1,'#6a9a8a');break;}
 case 'ratte':{legs(g,[-1,2],0,1,'#3a3430',ph*2,mv,1);pe(g,0,-1.8,3.4,1.6,'#5a504a',1);pe(g,3.4,-2,1.5,1.1,'#5a504a',1);for(let k=0;k<6;k++)px(g,-4-k,-1.5+Math.sin(k+t*3)*.4,1,.8,'#8a7a70');break;}
 case 'reh':{const run=a.mode==='flee'?Math.abs(Math.sin(ph*.5))*5:0;g.translate(0,-run);legs(g,[-8,-6,6,8],0,14,'#7a5028',ph,mv,1);for(const lx of [-8,-6,6,8])px(g,lx,-1,1,1,'#2a1a10');pe(g,0,-17,10,5,'#a0703a',1);pe(g,1,-14,7,1.4,'#c49a68',1);px(g,-10.5,-20,2,2.5,'#f2f0e8');
  const hx=graze?11:10,hy=graze?-12:-27;px(g,hx-3,hy+2,3,8,'#a0703a');pe(g,hx,hy,2.5,3,'#a0703a',1);px(g,hx+2,hy+1,2,1.5,'#7a5028');px(g,hx-2,hy-5,1.5,3,'#a0703a');px(g,hx,hy-5,1.5,3,'#a0703a');px(g,hx,hy-1,1,1,'#141210');break;}
 case 'hase':{const hop=a.mode==='flee'?Math.abs(Math.sin(ph*.8))*4:0;g.translate(0,-hop);pe(g,0,-3,4,2.6,'#a89070',1);pe(g,-4,-3.5,1.4,1.4,'#f2f0e8',1);pe(g,3.5,-4.5,1.8,1.6,'#a89070',1);px(g,3,-9,1,4,'#a89070');px(g,4,-9.5,1,4.5,'#a89070');px(g,4.4,-4.6,.8,.8,'#141210');px(g,-2,-.5,3,.8,'#8a7458');break;}}
 g.restore();};

function animal(g,a,b,t,P){if(b.actors.length||b.started)A.animalStep(a,b,performance.now());A.drawAnimal(g,a,t,P);}

// Vorschau eines Abschnitts als ein Bild (Kunstpixel): Boden + Sprites nach Tiefe
A.preview=function(L,place){const g0=A.scene(L,place),c=document.createElement('canvas');c.width=g0.width;c.height=g0.height;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(g0,0,0);const ART=AR();
 for(const s of [...L.sprites].sort((a,b)=>a.y-b.y)){if(s.baked)continue;if(s.cv)g.drawImage(s.cv,s.dx/ART,s.dy/ART);else if(s.kind==='life'){g.save();g.scale(1/ART,1/ART);animal(g,s.a,{actors:[],L},0,L.P);g.restore();}}
 return c;};

// ---------- Wetter und Licht über dem Bild (Bildschirmkoordinaten) ----------
// Leistung: Vom Boden des Abschnitts (Tausende Pixel breit) nur den sichtbaren Ausschnitt zeichnen
A.drawBackdrop=function(ctx,img,b){ctx.save();ctx.scale(1040/b.width*AR(),720/b.height*AR());const m=ctx.getTransform(),cw=ctx.canvas.width,ch=ctx.canvas.height;
 if(m.b||m.c||!m.a||!m.d){ctx.drawImage(img,0,0);ctx.restore();return;}
 const x0=Math.max(0,Math.floor(-m.e/m.a)-2),y0=Math.max(0,Math.floor(-m.f/m.d)-2),x1=Math.min(img.width,Math.ceil((cw-m.e)/m.a)+2),y1=Math.min(img.height,Math.ceil((ch-m.f)/m.d)+2);
 if(x1>x0&&y1>y0)ctx.drawImage(img,x0,y0,x1-x0,y1-y0,x0,y0,x1-x0,y1-y0);ctx.restore();};
let wxCache=null;
// Leistung: Jedes neu bemalte Canvas muss pro Bild an den Bildschirm übergeben werden. Ohne bewegtes Wetter wird die Wetterschicht
// nur einmal gemalt; Regen, Schnee, Nebel und Glühwürmchen höchstens 30-mal pro Sekunde.
A.weatherAnimated=mood=>['nebel','regen','schnee'].includes(mood.weather)||(mood.time==='abend'&&mood.season==='sommer');
A.weatherStep=function(cv,mood,t,camX){if(!cv)return;const key=cv.width+'x'+cv.height+JSON.stringify(mood),st=cv._wx||(cv._wx={});
 if(st.key===key&&(!A.weatherAnimated(mood)||t-st.t<1/30))return;st.key=key;st.t=t;A.weather(cv.getContext('2d'),cv.width,cv.height,mood,t,camX);};
A.weather=function(g,w,h,mood,t,camX){g.clearRect(0,0,w,h);
 // Leistung: Tönung, Vignette und Wolkengrau ändern sich nie – einmal malen, danach nur noch kopieren
 const key=w+'x'+h+mood.time+mood.weather;if(!wxCache||wxCache.key!==key){const c=document.createElement('canvas');c.width=w;c.height=h;const q=c.getContext('2d');
  const tint={morgen:'rgba(255,190,150,.10)',mittag:null,nachmittag:'rgba(255,180,90,.10)',abend:'rgba(40,30,80,.32)'}[mood.time];if(tint){q.fillStyle=tint;q.fillRect(0,0,w,h);}
  if(mood.time==='abend'){const gr=q.createRadialGradient(w/2,h/2,h*.3,w/2,h/2,w*.75);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(10,8,20,.45)');q.fillStyle=gr;q.fillRect(0,0,w,h);}
  if(mood.weather==='bewoelkt'){q.fillStyle='rgba(70,80,90,.14)';q.fillRect(0,0,w,h);}
  if(mood.weather==='nebel'){q.fillStyle='rgba(210,215,220,.12)';q.fillRect(0,0,w,h);}if(mood.weather==='regen'){q.fillStyle='rgba(40,50,70,.12)';q.fillRect(0,0,w,h);}
  wxCache={key,c};}
 g.drawImage(wxCache.c,0,0);
 if(mood.weather==='nebel'){for(let k=0;k<5;k++){const y=h*(.15+k*.18)+Math.sin(t*.3+k)*8,x=((t*12*(k%2?1:-1)+k*200-camX*.3)%(w*2)+w*2)%(w*2)-w*.5;g.fillStyle='rgba(225,230,235,.13)';g.beginPath();g.ellipse(x,y,w*.55,h*.07,0,0,7);g.fill();}}
 if(mood.weather==='regen'){g.strokeStyle='rgba(190,205,225,.45)';g.lineWidth=1;g.beginPath();for(let k=0;k<110;k++){const x=((k*97.3+t*60-camX*.5)%(w+40)+w+40)%(w+40)-20,y=((k*53.7+t*620)%(h+30));g.moveTo(x,y);g.lineTo(x-4,y+12);}g.stroke();}
 if(mood.weather==='schnee'){g.fillStyle='rgba(255,255,255,.85)';for(let k=0;k<90;k++){const y=((k*61.3+t*40)%(h+10)),x=((k*131.7+Math.sin(t+k)*14-camX*.5)%(w+20)+w+20)%(w+20)-10;g.fillRect(Math.round(x),Math.round(y),2,2);}}
 if(mood.time==='abend'&&mood.season==='sommer'){for(let k=0;k<14;k++){const x=((k*173+Math.sin(t*.7+k)*40-camX*.4)%w+w)%w,y=h*.3+((k*91)%(h*.6))+Math.sin(t*1.3+k)*10;g.fillStyle=`rgba(230,240,120,${.4+.4*Math.sin(t*3+k)})`;g.fillRect(x,y,2,2);}}
};

// ---------- Übersichtskarte (480×270) mit Nebel ----------
A.map=function(c,place,o={}){const g=c.getContext('2d'),{W,H,pts}=place.map;c.width=W;c.height=H;g.imageSmoothingEnabled=false;const r=rng32(place.seed^0x51ed),bi=place.biome,P=A.palette(place.mood,bi);
 const base=bi==='stadt'?'#77705f':P.snow?'#dfe6ea':P.grass[0];px(g,0,0,W,H,base);noise(g,r,0,0,W,H,2600,bi==='stadt'?['#857e6f','#6b6558']:P.grass.slice(1),1);
 for(const f of place.map.feats)if(f.kind==='field'){const cols=P.snow?['#e8eef1','#d2dbe0']:P.season==='herbst'?['#9a7a40','#7a6030']:['#c8b050','#8aa048','#a08850'];const col=pick(r,cols);px(g,f.x,f.y,f.w,f.h,col);for(let k=0;k<f.h;k+=2)px(g,f.x,f.y+k,f.w,1,'#00000014');px(g,f.x,f.y,f.w,1,'#00000022');}
 if(place.map.river){const rv=place.map.river;for(let y=0;y<H;y++){const x=rv.x+Math.sin(y*.025)*rv.bend*.4;px(g,x-4,y,9,1,P.snow?'#a8bcc8':'#3b5d72');px(g,x-1,y,3,1,P.snow?'#d0e0ea':'#5a7d90');}}
 if(place.map.pond){const p=place.map.pond;pell(g,p.x,p.y,p.r+2,p.r*.7+2,'#4a5a30',1);pell(g,p.x,p.y,p.r,p.r*.7,'#3b5d72',1);}
 // Weg (sanft geschwungen) mit Brücke über dem Fluss
 for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y));for(let k=0;k<=n;k++){const t=k/n,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;px(g,x-1,y-1,3,3,P.snow?'#a59d92':'#9a7f52');}}
 if(place.map.river){const rv=place.map.river;const p=pts.reduce((best,q)=>{const rx=rv.x+Math.sin(q.y*.025)*rv.bend*.4;return Math.abs(q.x-rx)<Math.abs(best.x-(rv.x+Math.sin(best.y*.025)*rv.bend*.4))?q:best;});px(g,p.x-6,p.y-3,12,6,'#6b4a2e');px(g,p.x-6,p.y-3,12,1,'#8a6038');}
 for(const f of place.map.feats){if(f.kind==='house'){px(g,f.x,f.y,f.w,f.h,'#cbb98f');px(g,f.x-1,f.y-2,f.w+2,3,pick(r,['#8c3b2c','#4b5560','#b39550']));px(g,f.x,f.y+f.h,f.w,1,'#00000040');}
  else if(f.kind==='tree'){const cc=P.snow?['#2f4630','#eef3f6']:bi==='wald'?['#2f5236','#4b6330']:[P.leaf[0],P.leaf[1]];px(g,f.x-1,f.y+1,4,1,'#00000030');px(g,f.x-1,f.y-2,4,4,cc[0]);px(g,f.x,f.y-2,2,1,cc[1]);}
  else if(f.kind==='rock')px(g,f.x,f.y,3,2,'#8b8578');}
 // Eingang, Stationen, Ziel (Bildzeichen statt Text)
 const S=place.stations;const e=pts[0];px(g,e.x-1,e.y-9,2,10,'#3a2414');px(g,e.x+1,e.y-9,6,4,'#3f8a5a');
 S.forEach((s,i)=>{const seen=i<=(o.reveal??0),done=i<=o.cleared;if(!seen&&!o.noFog)return;
  if(s.boss){pell(g,s.mx,s.my,6,6,'#3a2414',1);pell(g,s.mx,s.my,5,5,'#e0b02a',1);px(g,s.mx-1,s.my-3,2,6,'#7a5a14');return;}
  if(done){px(g,s.mx-3,s.my-3,7,6,'#e0d6bb');px(g,s.mx-2,s.my-1,2,2,'#2a1a10');px(g,s.mx+1,s.my-1,2,2,'#2a1a10');px(g,s.mx-2,s.my+3,5,2,'#e0d6bb');}
  else{for(let k=-4;k<=4;k++){px(g,s.mx+k,s.my+k,2,2,'#2a1a10');px(g,s.mx+k,s.my-k,2,2,'#2a1a10');}for(let k=-3;k<=3;k++){px(g,s.mx+k,s.my+k,1,1,'#e8e0c8');px(g,s.mx+k,s.my-k,1,1,'#e8e0c8');}}});
 // Nebel: aufgedeckt ist der gelaufene Weg plus etwas Umgebung
 if(!o.noFog){const fog=document.createElement('canvas');fog.width=W;fog.height=H;const f=fog.getContext('2d');f.fillStyle='#1c150e';f.fillRect(0,0,W,H);f.globalCompositeOperation='destination-out';
  const hole=(x,y,rr)=>{const gr=f.createRadialGradient(x,y,rr*.5,x,y,rr);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(1,'rgba(0,0,0,0)');f.fillStyle=gr;f.beginPath();f.arc(x,y,rr,0,7);f.fill();};
  const upto=o.progress??0;for(let k=0;k<pts.length;k++){if(k>upto+.5)break;hole(pts[k].x,pts[k].y,k<=upto?40:20);}
  if(o.party)hole(o.party.x,o.party.y,46);
  g.globalAlpha=.78;g.drawImage(fog,0,0);g.globalAlpha=1;
  {const z=S[S.length-1];pell(g,z.mx,z.my,7,7,'#2a1a10',1);pell(g,z.mx,z.my,5,5,'#e0b02a',1);px(g,z.mx-1,z.my-3,2,6,'#7a5a14');g.globalAlpha=.6+.3*Math.sin((o.t||0)*2);g.strokeStyle='#e0b02a';g.lineWidth=1;g.beginPath();g.arc(z.mx,z.my,10,0,7);g.stroke();g.globalAlpha=1;}
  // Rand des Nebels: Ahnung des nächsten Ziels
  const nx=S[(o.reveal??0)+1];if(nx&&!(o.reveal>=S.length-1)){g.globalAlpha=.5+.3*Math.sin((o.t||0)*3);px(g,nx.mx-1,nx.my-1,3,3,'#e8e0c8');g.globalAlpha=1;}}
 if(o.party){const p=o.party,b=Math.sin((o.t||0)*6)>0?1:0;px(g,p.x-3,p.y-10-b,7,7,'#1c120a');px(g,p.x-2,p.y-9-b,5,5,'#3f8a5a');px(g,p.x,p.y-3-b,1,3,'#1c120a');}
 // Rahmen
 g.strokeStyle='#2a1a10';g.lineWidth=2;g.strokeRect(1,1,W-2,H-2);};
A.mapPoint=function(place,progress){const pts=place.map.pts,i=clamp(Math.floor(progress),0,pts.length-1),j=Math.min(pts.length-1,i+1),t=clamp(progress-i,0,1);return {x:pts[i].x+(pts[j].x-pts[i].x)*t,y:pts[i].y+(pts[j].y-pts[i].y)*t};};

// ---------- Ludus: fester Ort „Außenwelt“ (Tor in der rechten Außenmauer, davor ein kleiner Vorplatz) ----------
A.OUTPOST={x:872,y:290,w:188,h:200};
A.ludusWorld=function(bg){const c=document.createElement('canvas');c.width=1060;c.height=670;const g=c.getContext('2d');g.imageSmoothingEnabled=false;const r=rng32(4711);
 const P=A.palette({season:'sommer',time:'mittag',weather:'klar'},'dorf');
 g.drawImage(bg,0,0);
 // Außenstreifen: Wiese, Bäume, Weg ins Land
 px(g,900,0,160,670,'#2e3a24');noise(g,r,900,0,160,670,2200,['#36442a','#283320','#3d4c2e','#33402a'],2);
 for(let y=24;y<670;y+=30)if(y<290||y>500)A.tree(g,918+r()*128,y+r()*12,1.2+r()*.4,r,P);
 for(let k=0;k<6;k++)A.bush(g,1000+r()*50,300+r()*190,1.2,r,P);
 // Weg vom Tor nach rechts, dann aus dem Bild
 for(let x=896;x<1060;x+=2){const y=388+Math.sin((x-896)*.03)*6+(x>990?(x-990)*.6:0);px(g,x,y-14,2,28,'#7d6a4a');px(g,x,y-12,2,24,'#9a8256');if((x>>1)%5===0)px(g,x,y-4,2,2,'#7d6a4a');}
 // Tor in der Mauer (Durchbruch, offene Torflügel), Pfad vom Brunnenplatz
 px(g,878,358,26,58,'#2a2622');px(g,881,364,20,52,'#9a8256');px(g,875,354,32,6,'#5b574e');px(g,875,354,6,64,'#6f6a5f');px(g,901,354,6,64,'#6f6a5f');px(g,876,355,30,2,'#8b8578');
 px(g,881,366,4,46,'#6b4a2e');px(g,882,368,2,42,'#8a6038');px(g,897,366,4,46,'#6b4a2e');
 for(let x=846;x<882;x+=2)px(g,x,378+Math.sin(x*.2)*2,2,24,'#b49865');
 // Meilenstein
 px(g,1034,318,12,18,'#8b8578');px(g,1036,318,8,3,'#9a9486');
 return c;};
A.outpost=function(g,t,o={}){const X=906,Y=300;
 // Schild im Stil der Ludus-Schilder
 const pw=104,ph=20,plX=X+74-pw/2,plY=Y-4;px(g,plX+10,plY+ph,2,14,'#3a2a1a');px(g,plX+pw-12,plY+ph,2,14,'#3a2a1a');
 px(g,plX-1,plY-1,pw+2,ph+2,'#0f1a18');px(g,plX,plY,pw,ph,'#1f3a35');px(g,plX+1,plY+1,pw-2,1,'#2f554d');A.text(g,'AUSSENWELT',plX+pw/2,plY+5,2,'#e8e0c8','#0f1a18','center');
 // Wegweiser mit Bildzeichen (Haus, Baum, Schädel)
 const sx=X+36,sy=Y+86;px(g,sx,sy-48,3,52,'#4e3420');px(g,sx+1,sy-48,1,52,'#6b4a2e');
 const arrow=(y,dir,col,icon)=>{const w=28,x0=dir>0?sx+3:sx-w;px(g,x0,y,w,9,col[0]);px(g,x0,y,w,2,col[1]);for(let k=0;k<5;k++)px(g,dir>0?x0+w+k:x0-1-k,y+k,1,9-2*k,col[0]);icon(dir>0?x0+11:x0+9,y+2);};
 arrow(sy-46,1,['#8a6038','#a87a48'],(x,y)=>{px(g,x,y+2,7,4,'#e8e0c8');px(g,x-1,y,9,2,'#b8382e');});
 arrow(sy-34,-1,['#7a5230','#9a6a40'],(x,y)=>{px(g,x+2,y+3,2,3,'#3a2414');px(g,x,y,6,4,'#3f6a2a');});
 arrow(sy-22,1,['#8a6038','#a87a48'],(x,y)=>{px(g,x,y,6,5,'#e0d6bb');px(g,x+1,y+1,1,2,'#2a1a10');px(g,x+4,y+1,1,2,'#2a1a10');});
 // Reisekarren mit Säcken, Fässchen und aufgerollter Karte
 const cx=X+92,cy=Y+170;px(g,cx-28,cy-20,56,12,'#5b3a20');px(g,cx-28,cy-20,56,2,'#8a6038');px(g,cx-48,cy-14,20,2,'#5b3a20');
 for(const wx of [-16,16]){pell(g,cx+wx,cy-5,8,8,'#2a1a10');pell(g,cx+wx,cy-5,5,5,'#7a5230');}
 pell(g,cx-14,cy-26,8,7,'#c8b48a');pell(g,cx-2,cy-27,7,7,'#b8a47a');px(g,cx+6,cy-34,12,14,'#6b4a2e');px(g,cx+6,cy-30,12,2,'#3a2a1a');px(g,cx-22,cy-34,18,5,'#e8dcc0');px(g,cx-22,cy-34,3,5,'#b8382e');
 // Laterne am Tor
 px(g,X+4,Y+52,2,40,'#2a2622');px(g,X,Y+46,10,8,'#2a2622');px(g,X+1,Y+47,8,6,`rgb(255,${200+Math.round(30*Math.sin(t*5))},90)`);
 const box=[X-30,Y-10,160,196];
 if(o.fresh){const by=Y-24+Math.sin(t*5)*3,bx=sx-3;px(g,bx-1,by-1,10,16,'#2a1a10');px(g,bx,by,8,14,'#f4d37a');px(g,bx+2,by+2,4,6,'#7a2a20');px(g,bx+2,by+10,4,2,'#7a2a20');g.strokeStyle=`rgba(244,211,122,${.45+.35*Math.sin(t*4)})`;g.lineWidth=1.5;g.strokeRect(...box);}
 if(o.hot){g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=2;g.strokeRect(...box);}
};
// ---------- Tor zur Außenwelt im echten Ludus (900×670, rechte Mauer zwischen Schmiede und Truppenplatz) ----------
// Wird in ludus.js über M.ludusOverlay gezeichnet. Klickfläche: A.GATE. Schild im Stil der Ludus-Schilder (Courier Prime).
A.GATE={x:790,y:278,w:110,h:76};
let gateCache=null;
function gateImage(){if(gateCache)return gateCache;const c=document.createElement('canvas');c.width=112;c.height=82;const g=c.getContext('2d');g.imageSmoothingEnabled=false;const ox=-790,oy=-280,R=(x,y,w,h,col)=>px(g,x+ox,y+oy,w,h,col);
 // Durchgang durch die Mauer und Weg nach draußen
 R(864,302,22,42,'#9a8256');R(864,302,22,3,'#7d6a4a');R(884,310,16,26,'#7d6a4a');R(884,312,16,22,'#8d7650');
 for(let x=838;x<866;x+=2)R(x,310+Math.round(Math.sin(x*.21)*2),2,26,x<846?'#a08a5f':'#9a8256');
 // Pfeiler mit Abdeckung
 for(const y of [292,344]){R(863,y,24,10,'#596350');R(864,y+1,22,8,'#8d9275');R(864,y+1,22,2,'#a7ac90');R(866,y+5,4,2,'#7a8066');}
 // offene Torflügel (nach außen geschwenkt, von oben gesehen)
 R(884,302,14,4,'#4e3420');R(884,302,14,1,'#7a5230');R(884,340,14,4,'#4e3420');R(884,340,14,1,'#7a5230');for(const x of [888,894]){R(x,302,1,4,'#2a1a10');R(x,340,1,4,'#2a1a10');}
 // Pfosten mit Schild (Schrift wie die Gebäudeschilder; Größe passt sich der Breite an)
 R(866,298,3,4,'#4e3420');
 const pw=82,ph=17,plX=792,plY=283;R(plX-1,plY-1,pw+2,ph+2,'#1f2b25');R(plX,plY,pw,ph,'#37473d');R(plX,plY,pw,1,'#55695a');for(const nx of [plX+2,plX+pw-4]){R(nx,plY+2,2,2,'#c9b071');R(nx,plY+ph-4,2,2,'#c9b071');}
 let fs=12;const fam="'Courier Prime',monospace";g.font=`bold ${fs}px ${fam}`;while(fs>8&&g.measureText('AUSSENWELT').width>pw-12){fs-=.5;g.font=`bold ${fs}px ${fam}`;}
 g.textAlign='center';g.textBaseline='middle';g.fillStyle='#efe0b3';g.fillText('AUSSENWELT',plX+pw/2+ox,plY+ph/2+1+oy);
 // Schatten im Durchgang, damit die Öffnung lesbar ist
 R(864,305,22,3,'#00000033');R(884,305,2,36,'#00000044');
 // Kiste mit Reisegepäck neben dem Tor
 R(842,326,14,10,'#6b4a2e');R(842,326,14,2,'#8a6038');R(846,322,8,5,'#c8b48a');
 if(typeof document==='undefined'||!document.fonts||document.fonts.check("bold 12px 'Courier Prime'"))gateCache=c;return c;}
A.resetGate=()=>{gateCache=null;};
A.ludusGate=function(g,t,o={}){g.save();g.imageSmoothingEnabled=false;g.drawImage(gateImage(),790,280);
 // Laterne am oberen Pfeiler
 const f=Math.sin(t*5)*.5+.5;px(g,877,284,6,7,'#2a2622');px(g,878,285,4,5,`rgb(255,${190+Math.round(40*f)},90)`);
 if(o.fresh){const by=262+Math.sin(t*4)*3;px(g,828,by-1,10,17,'#1f2b25');px(g,829,by,8,15,'#f4d37a');px(g,832,by+2,2,7,'#7a2a20');px(g,832,by+11,2,2,'#7a2a20');
  g.globalAlpha=.35+.25*Math.sin(t*4);g.strokeStyle='#f4d37a';g.lineWidth=2;g.strokeRect(A.GATE.x+.5,A.GATE.y+.5,A.GATE.w-1,A.GATE.h-1);g.globalAlpha=1;}
 if(o.hot){g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=1.5;g.strokeRect(A.GATE.x+.5,A.GATE.y+.5,A.GATE.w-1,A.GATE.h-1);}
 g.restore();};
// ---------- Zubehör über den Figuren (Szenen im Ludus) ----------
// Orontes: Köcher, Gurt und der Pfeil im Kopf (Aussehen wie im Spiel, bogner.js)
function pixArrow(g,x0,y0,x1,y1,q,o={}){const L=Math.hypot(x1-x0,y1-y0),n=Math.max(2,Math.round(L/q)),ux=(x1-x0)/L,uy=(y1-y0)/L,nx=-uy,ny=ux;
 for(let i=0;i<=n;i++){const x=x0+ux*i*q,y=y0+uy*i*q;px(g,x-q,y-q,q*3,q*3,'#22150c');}for(let i=0;i<=n;i++){const x=x0+ux*i*q,y=y0+uy*i*q;px(g,x,y,q,q,'#cfae72');}
 if(o.fletch)for(let k=0;k<5;k++){px(g,x0+ux*k*q+nx*q*1.5,y0+uy*k*q+ny*q*1.5,q,q,'#b8382e');px(g,x0+ux*k*q-nx*q*1.5,y0+uy*k*q-ny*q*1.5,q,q,'#e8e0c8');}
 if(o.tip)for(let k=0;k<3;k++)px(g,x1+ux*k*q,y1+uy*k*q,q*1.5,q*1.5,k<1?'#6b7078':'#a2a8b0');}
A.oroOverlay=function(g,a,K=1){const dir=Math.cos(a.a||0)>=0?1:-1,u=K*.6,P=(fx,fy)=>({x:a.x+dir*fx*u,y:a.y+fy*u}),q=Math.max(1,u);
 {const s=P(-19,-44),e=P(-13,-78);const n=Math.round(Math.hypot(e.x-s.x,e.y-s.y)/q);for(let i=0;i<=n;i++){const k=i/n;px(g,s.x+(e.x-s.x)*k-2.6*q,s.y+(e.y-s.y)*k-q,5.2*q,2*q,i%4?'#7a4a2a':'#5b3a20');}for(let i=0;i<5;i++){const f=P(-16.5+i*1.5,-81-(i%2)*2.5);px(g,f.x-q,f.y-2*q,q*2,q*4,i%2?'#e8e0c8':'#b8382e');}}
 const h=P(1.5,-75.5),r=8.8*u;pixArrow(g,h.x-dir*(r+r*1.6),h.y-r*.55,h.x-dir*r*.82,h.y-r*.32,q,{fletch:true});pixArrow(g,h.x+dir*r*.84,h.y-r*.22,h.x+dir*(r+r*.9),h.y-r*.08,q,{tip:true});};
// Krassus: Goldmünze als Augenklappe, Kette aus Schuldnerzähnen, Schuldbuch am Gürtel
A.krassusOverlay=function(g,a,K=1){const dir=Math.cos(a.a||0)>=0?1:-1,u=K*.6*(197/167),P=(fx,fy)=>({x:a.x+dir*fx*u,y:a.y+fy*u}),q=Math.max(1,K*.6);
 const ch=P(-6,-60);for(let i=0;i<9;i++){const t=i/8,x=ch.x+dir*t*12*q,y=ch.y+Math.sin(t*Math.PI)*4*q;px(g,x,y,q*1.6,q*1.6,i%2?'#e0b02a':'#efe6d4');}
 const eye=P(3.5,-68);px(g,eye.x-2.2*q,eye.y-2.2*q,q*4.4,q*4.4,'#7a5a14');px(g,eye.x-1.6*q,eye.y-1.6*q,q*3.2,q*3.2,'#e0b02a');px(g,eye.x-1*q,eye.y-1*q,q,q,'#fff2a0');
 const st=P(-4,-72);for(let k=0;k<8;k++)px(g,st.x+dir*(k*1.2-2)*q,st.y+k*.4*q,q*.8,q*.8,'#1c1614');
 const bk=P(-12,-40);px(g,bk.x-3*q,bk.y-4*q,6*q,8*q,'#3a2414');px(g,bk.x-2.4*q,bk.y-3.4*q,4.8*q,6.8*q,'#8a2a22');px(g,bk.x-.5*q,bk.y-3.4*q,q,6.8*q,'#e0b02a');};
// Porträt-Zubehör (Gesichtsbild 160×104)
A.krassusFace=function(g,W,H){const q=W/160,cx=W*.355,cy=H*.375,r=7*q;
 // Riemen über die Stirn zur Schläfe
 for(let k=0;k<26;k++)px(g,cx+r*.6+k*2*q,cy-r*.7-k*1.1*q,2*q,1.6*q,'#1c1614');for(let k=0;k<8;k++)px(g,cx-r-k*1.6*q,cy-k*.4*q,1.8*q,1.6*q,'#1c1614');
 // Goldmünze (rund) mit Prägung
 for(let y=-r;y<=r;y+=q)for(let x=-r;x<=r;x+=q){const d=Math.hypot(x,y);if(d<=r)px(g,cx+x,cy+y,q,q,d>r-1.6*q?'#7a5a14':d<r*.45&&x<0&&y<0?'#fff2a0':'#e0b02a');}
 A.text(g,'$',cx-1.4*q,cy-2.4*q,q,'#8a6a14');};
A.oroFace=function(g,W,H){const q=Math.max(1,W/160);pixArrow(g,W*.08,H*.19,W*.31,H*.29,q*1.6,{fletch:true});pixArrow(g,W*.69,H*.28,W*.9,H*.25,q*1.6,{tip:true});};
})();
