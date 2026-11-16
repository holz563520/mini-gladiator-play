// WAS DIE DATEI TUT: AT3 First Person mit echtem Gelände (M7, Thomas 15.11.2026: „nicht flach“, später ganze Erde, AT3_PLAN 4.3 und 9.6).
// 1) welt(seed): Probe-Welt aus Seed (Höhenkarte mit Bergen, See, Straße, Steg, Hof mit Wänden, Bäume, Blumen). Läuft im Hintergrundkern (Worker),
//    zur Not im Hauptkern. Gleicher Seed = gleiche Welt.
// 2) zeichne(...): ein Bild in Farbnummern (Uint8Array W × H). Je Bildspalte ein Sichtstrahl über die Höhenkarte von vorn nach hinten mit
//    Verdeckungspuffer, Wände auf den Feldkanten im selben Durchgang, danach Objekte (8 Seiten aus fp.js) gegen den Puffer abgeschnitten.
//    Ferne über Dunst-Farbtabellen der Palette, dahinter der vorbereitete Hintergrund aus fp.js (Himmel, Hügel als Horizontband).
//    Kosten je Bild: Breite × Schritte (feste Obergrenze über die Sichtweite) + sichtbare Objekte (Obergrenze). Unabhängig von der Weltgröße.
// 3) bewegen(...): Laufen wie eine Figur (Augenhöhe, Tempo, Wände, Wasser, zu steile Hänge, Bäume sperren ihr Feld).
// FP1: zeichne/bewegen laufen unverändert auch auf einem Ausschnitt der echten Welt (fpausschnitt.js, gleiches Format, Farben fertig in w.farbe).
// Einheiten: 1 Feld ≈ 3 m, Höhe in Feldern (1 Feld = 1 Geschoss = 32 Bildpunkte im AT3-64-Bild).
(function(G){
'use strict';
var N=96,U=4,M=N*U+1,WL=0.8,WANDH=1.0;
var BIOM={wasser:0,sand:1,gras:2,wald:3,fels:4,schnee:5,weg:6,steg:7,hof:8};

// ---------- Welt aus Seed ----------
function rnd(seed){var z=(seed>>>0)||1;return function(){z^=z<<13;z>>>=0;z^=z>>>17;z^=z<<5;z>>>=0;return z/4294967296}}
function rauschen(seed,gr){var r=rnd(seed),v=new Float32Array(gr*gr);for(var i=0;i<v.length;i++)v[i]=r();
 return function(x,y){var xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
  var x0=((xi%gr)+gr)%gr,y0=((yi%gr)+gr)%gr,x1=(x0+1)%gr,y1=(y0+1)%gr;
  var a=v[y0*gr+x0],b=v[y0*gr+x1],c=v[y1*gr+x0],d=v[y1*gr+x1];return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy}}
function fbm(n,x,y,okt){var s=0,a=1,t=0;for(var i=0;i<okt;i++){s+=a*n(x,y);t+=a;a*=.5;x*=2.03;y*=2.03}return s/t}
function glatt(a,b,x){var t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)}

function welt(seed){
 seed=seed||1;var t0=Date.now(),n1=rauschen(seed*7+1,64),n2=rauschen(seed*13+5,64),n3=rauschen(seed*31+9,64),r=rnd(seed*101+3);
 var h=new Float32Array(M*M),biom=new Uint8Array(M*M);
 var HX=48,HY=56,HOF=6;           // Hof: Mitte und halbe Kantenlänge in Feldern
 var SEE={x:72,y:74,r:15};
 for(var j=0;j<M;j++)for(var i=0;i<M;i++){var x=i/U,y=j/U;
  var basis=1.5+3*fbm(n1,x/22,y/22,4);
  var berg=glatt(52,12,y)*(.55+.45*n3(x/30,y/30)),rid=1-Math.abs(2*fbm(n2,x/14,y/14,4)-1);
  var hh=basis+berg*rid*rid*30;
  var ds=Math.hypot(x-SEE.x,y-SEE.y);if(ds<SEE.r+4)hh-=Math.pow(1-ds/(SEE.r+4),1.4)*9;
  h[j*M+i]=hh}
 // Hof flach machen (gleiche Höhe wie die Mitte), weicher Rand über 4 Felder
 var h0=h[(HY*U)*M+HX*U];
 for(j=0;j<M;j++)for(i=0;i<M;i++){var dx=Math.abs(i/U-HX)-HOF,dy=Math.abs(j/U-HY)-HOF,d=Math.max(dx,dy),w=1-glatt(0,4,d);if(w>0)h[j*M+i]+=(h0-h[j*M+i])*w}
 // Straße vom Südtor zum See, danach Steg ins Wasser. Höhe entlang der Straße geglättet.
 var pfad=[],A={x:HX+.5,y:HY+HOF+.6},B={x:HX+2,y:SEE.y+2},C={x:SEE.x,y:SEE.y};
 for(var s=0;s<=1.0001;s+=1/240){var q=1-s;pfad.push({x:q*q*A.x+2*q*s*B.x+s*s*C.x,y:q*q*A.y+2*q*s*B.y+s*s*C.y})}
 function hRoh(x,y){var i=Math.round(x*U),j=Math.round(y*U);return h[Math.max(0,Math.min(M-1,j))*M+Math.max(0,Math.min(M-1,i))]}
 var ufer=-1;pfad.forEach(function(p,k){p.h=hRoh(p.x,p.y);if(ufer<0&&p.h<WL+.25)ufer=k});
 var steg=[];if(ufer>0){var len=0;for(var k=ufer;k<pfad.length&&len<6;k++){if(k>ufer)len+=Math.hypot(pfad[k].x-pfad[k-1].x,pfad[k].y-pfad[k-1].y);steg.push(pfad[k])}pfad=pfad.slice(0,ufer)}
 pfad.forEach(function(p,k){var a=0,n=0;for(var m=Math.max(0,k-12);m<=Math.min(pfad.length-1,k+12);m++){a+=pfad[m].h;n++}p.hs=Math.max(WL+.3,a/n)});
 var istWeg=new Uint8Array(M*M),istSteg=new Uint8Array(M*M);
 function stempel(p,ra,hz,feld,ziel){var i0=Math.floor((p.x-ra)*U),i1=Math.ceil((p.x+ra)*U),j0=Math.floor((p.y-ra)*U),j1=Math.ceil((p.y+ra)*U);
  for(var j=Math.max(0,j0);j<=Math.min(M-1,j1);j++)for(var i=Math.max(0,i0);i<=Math.min(M-1,i1);i++){var d=Math.hypot(i/U-p.x,j/U-p.y);if(d>ra)continue;
   var w=ziel?1:1-glatt(ra*.5,ra,d);h[j*M+i]+=(hz-h[j*M+i])*w;if(d<ra*(ziel?1:.55))feld[j*M+i]=1}}
 pfad.forEach(function(p){stempel(p,1.3,p.hs,istWeg,false)});
 steg.forEach(function(p){stempel(p,.5,WL+.18,istSteg,true)});
 // Wände: Hofmauer mit Tor im Süden und Pforte im Norden, kleines Haus im Hof mit Tür
 var wandX=new Uint8Array((N+1)*N),wandY=new Uint8Array(N*(N+1));     // wandX[ex + fy*(N+1)] = Kante x=ex; wandY[fx + ey*N] = Kante y=ey
 function wx(ex,y0,y1,luecke){for(var y=y0;y<y1;y++)if(!luecke||luecke.indexOf(y)<0)wandX[ex+y*(N+1)]=1}
 function wy(ey,x0,x1,luecke){for(var x=x0;x<x1;x++)if(!luecke||luecke.indexOf(x)<0)wandY[x+ey*N]=1}
 var L=HX-HOF,R=HX+HOF,O=HY-HOF,S=HY+HOF;
 wx(L,O,S);wx(R,O,S);wy(O,L,R,[HX]);wy(S,L,R,[HX-1,HX,HX+1]);
 wx(L+2,O+2,O+6);wx(L+6,O+2,O+6,[O+4]);wy(O+2,L+2,L+6);wy(O+6,L+2,L+6);
 // Biome je Höhenpunkt
 var hof=function(x,y){return x>L&&x<R&&y>O&&y<S};
 for(j=0;j<M;j++)for(i=0;i<M;i++){var k2=j*M+i,x=i/U,y=j/U,v=h[k2],nb=Math.max(Math.abs(v-h[j*M+Math.min(M-1,i+1)]),Math.abs(v-h[Math.min(M-1,j+1)*M+i]))*U,b;
  if(istSteg[k2])b=BIOM.steg;else if(v<WL)b=BIOM.wasser;else if(istWeg[k2])b=BIOM.weg;else if(hof(x,y))b=BIOM.hof;else if(v<WL+.35)b=BIOM.sand;
  else if(v>17)b=BIOM.schnee;else if(nb>1.1||v>12)b=BIOM.fels;else b=fbm(n3,x/9,y/9,3)>.55?BIOM.wald:BIOM.gras;biom[k2]=b}
 // Objekte je Feld (Bäume sperren ihr Feld): Wald dicht, Wiese locker, Blumen um den Hof und im Hof
 var obj=[],sperre=new Uint8Array(N*N);
 for(var fy=1;fy<N-1;fy++)for(var fx=1;fx<N-1;fx++){var k3=(fy*U+U/2)*M+fx*U+U/2,bb=biom[k3],z=r();
  if(bb===BIOM.wald&&z<.42||bb===BIOM.gras&&z<.05){obj.push({art:r()<.5?'eiche':'baum',x:fx+.3+r()*.4,y:fy+.3+r()*.4,r:Math.floor(r()*4)*2});sperre[fy*N+fx]=1}
  else if(bb===BIOM.gras&&z<.11&&Math.abs(fx-HX)<HOF+6&&Math.abs(fy-HY)<HOF+6||bb===BIOM.hof&&z<.04&&!(fx>=L+2&&fx<L+6&&fy>=O+2&&fy<O+6))
   obj.push({art:'blume',x:fx+.2+r()*.6,y:fy+.2+r()*.6,r:Math.floor(r()*4)*2})}
 obj.forEach(function(o){o.z=hoeheIn(h,o.x,o.y)});
 return{format:'at3-fpwelt',seed:seed,N:N,U:U,M:M,WL:WL,WANDH:WANDH,h:h,biom:biom,wandX:wandX,wandY:wandY,sperre:sperre,obj:obj,
  start:{x:HX+.5,y:S-1.5,a:-Math.PI/2},ms:Date.now()-t0}}
function hoeheIn(h,x,y){var fx=Math.max(0,Math.min(M-1.001,x*U)),fy=Math.max(0,Math.min(M-1.001,y*U)),i=fx|0,j=fy|0,a=fx-i,b=fy-j,k=j*M+i;
 var v=h[k]+(h[k+1]-h[k])*a+(h[k+M]-h[k])*b+(h[k]-h[k+1]-h[k+M]+h[k+M+1])*a*b;return v<WL?WL:v}
function hoehe(w,x,y){return hoeheIn(w.h,x,y)}

// ---------- Farben (einmal je Welt, Palette und Muster) ----------
// Farbe je Höhenpunkt als Palettennummer: Biom, Licht von Nordwesten (Hangneigung), mit Muster zusätzlich leichte Streuung je Punkt.
function farben(w,S,muster){if(w.farbe)return w.farbe;   // FP1: Ausschnitt der echten Welt bringt die Farben fertig aus dem Bildkern mit (fpausschnitt.js)
var f=new Uint8Array(M*M),N_=S.nummer,h=w.h,z=12345;
 var R={0:[6,3,0,5],1:[7,3,0,4],2:[2,4,1,7],3:[2,3,1,6],4:[0,4,2,6],5:[0,6,5,6],6:[1,3,1,5],7:[3,3,1,5],8:[1,4,2,5]};   // Reihe, Grundstufe, min, max
 for(var j=0;j<M;j++)for(var i=0;i<M;i++){var k=j*M+i,b=w.biom[k],d=R[b];
  var l=((i>0?h[k-1]:h[k])-(i<M-1?h[k+1]:h[k])+(j>0?h[k-M]:h[k])-(j<M-1?h[k+M]:h[k]))*U*.6,st=d[1]+(b===0?0:Math.max(-2,Math.min(2,Math.round(l))));
  if(muster){z=(z*1103515245+12345)&0x7fffffff;var q=z%7;
   if(b===2||b===3)st+=q<1?-1:q>5?1:0;else if(b===0)st+=((i+j*3)%11===0)?1:0;else if(b===7)st+=(j%2)?-1:0;else if(b===6||b===8||b===1)st+=q<1?-1:0;else if(b===4)st+=q<2?-1:0}
  f[k]=N_(d[0],Math.max(d[2],Math.min(d[3],st)))}
 return f}

// ---------- Zeichnen ----------
var NEBEL=[0,.05,.1,.17,.26,.38],MAXS=700,MAXOBJ=400;
var merk={};
function vorbereiten(w,W,H,pal,muster,S,FP){var k=W+'x'+H+':'+pal;if(!merk.bg||merk.bgk!==k){var src=FP.hintergrundNummern(pal),bg=new Uint8Array(W*H);
  for(var y=0;y<H;y++){var sy=Math.min(FP.H-1,Math.floor(y*FP.H/H));for(var x=0;x<W;x++)bg[y*W+x]=src[sy*FP.W+Math.min(FP.W-1,Math.floor(x*FP.W/W))]}
  merk.bg=bg;merk.bgk=k;merk.pd=new Float32Array(W*MAXS);merk.py=new Int16Array(W*MAXS);merk.pc=new Int16Array(W)}
 if(merk.nk!==pal){var t=new Uint8Array(NEBEL.length*64);NEBEL.forEach(function(a,i){var d=FP.dunstTabelle(pal,a);for(var c=0;c<64;c++)t[i*64+c]=a?d[c]:c});merk.nebel=t;merk.nk=pal}
 var fk=pal+':'+(muster?1:0);if(merk.fw!==w||merk.fk!==fk){merk.farbe=farben(w,S,muster);merk.fw=w;merk.fk=fk}
 if(merk.wf!==W){var fov=75*Math.PI/180,f=(W/2)/Math.tan(fov/2),off=new Float32Array(W),co=new Float32Array(W);
  for(var x=0;x<W;x++){off[x]=Math.atan((x+.5-W/2)/f);co[x]=Math.cos(off[x])}merk.off=off;merk.co=co;merk.f=f;merk.wf=W}
 var S2=S;merk.stein=[S2.nummer(0,2),S2.nummer(0,3),S2.nummer(0,4),S2.nummer(0,5)];
 return merk}
// Höhe der Verdeckung (oberste schon belegte Zeile) in Spalte x für Tiefe d.
function oberkante(m,x,d,H){var n=m.pc[x],b=x*MAXS,lo=0,hi=n-1,r=-1;while(lo<=hi){var mi=(lo+hi)>>1;if(m.pd[b+mi]<=d){r=mi;lo=mi+1}else hi=mi-1}return r<0?H:m.py[b+r]}
// Objektbild als Farbnummern (255 = durchsichtig), einmal je Bild.
var bildMerk=typeof WeakMap!=='undefined'?new WeakMap():null;
function nummernBild(b,S){var v=bildMerk.get(b);if(v)return v;var px=new Uint8Array(b.w*b.h).fill(255);
 for(var y=0;y<b.h;y++){var r=b.z[y]||'';for(var x=0;x<b.w;x++){var c=r[x];if(c&&c!==S.LEER)px[y*b.w+x]=S.ZEICHEN.indexOf(c)}}
 v={w:b.w,h:b.h,ax:b.ax,ay:b.ay,px:px};bildMerk.set(b,v);return v}

// cam {x,y,z,a}; opt {W,H,sicht,muster,pal}; arten {eiche:o, baum:o, blume:o}. Gibt Zählwerte und die getroffenen Flächen fürs Antippen zurück.
function zeichne(buf,w,cam,opt,arten,S,FP){var W=opt.W,H=opt.H,sicht=opt.sicht,pal=opt.pal||S.PALETTE,m=vorbereiten(w,W,H,pal,!!opt.muster,S,FP);
 buf.set(m.bg);var hz=Math.round(H*FP.HORIZONT/FP.H),f=m.f,fa=m.farbe,nb=m.nebel,NL=NEBEL.length,h=w.h,schritte=0,stein=m.stein,cz=cam.z;
 var ca=Math.cos(cam.a),sa=Math.sin(cam.a);
 for(var x=0;x<W;x++){var an=cam.a+m.off[x],dx=Math.cos(an),dy=Math.sin(an),co=m.co[x],yb=H,t=.12,dt=.04,pfx=Math.floor(cam.x),pfy=Math.floor(cam.y),n=0,b=x*MAXS;
  while(t<sicht&&n<MAXS-2){var px=cam.x+dx*t,py=cam.y+dy*t;if(px<0||py<0||px>=N||py>=N)break;
   var fx=Math.floor(px),fy=Math.floor(py);
   if(fx!==pfx||fy!==pfy){var k1=1e9,k2=1e9,u1=0,u2=0,e1=-1,e2=-1;
    if(fx!==pfx){var ex=Math.max(fx,pfx),tc=(ex-cam.x)/dx,yc=cam.y+dy*tc;if(wandAn(w.wandX,ex+Math.floor(yc)*(N+1))){k1=tc;u1=yc;e1=0}}
    if(fy!==pfy){var ey=Math.max(fy,pfy),tc2=(ey-cam.y)/dy,xc=cam.x+dx*tc2;if(wandAn(w.wandY,Math.floor(xc)+ey*N)){k2=tc2;u2=xc;e2=1}}
    if(k2<k1){var tk=k1,tu=u1,te=e1;k1=k2;u1=u2;e1=e2;k2=tk;u2=tu;e2=te}
    if(e1>=0){yb=wand(k1,u1,e1);m.pd[b+n]=k1*co;m.py[b+n]=yb;n++}
    if(e2>=0&&yb>0){yb=wand(k2,u2,e2);m.pd[b+n]=k2*co;m.py[b+n]=yb;n++}
    pfx=fx;pfy=fy;if(yb<=0)break}
   var d=t*co,hh=hoeheIn(h,px,py),y=hz+((cz-hh)*f/d)|0;
   if(y<yb){var gi=(Math.round(py*U)*M+Math.round(px*U)),lv=Math.min(NL-1,(d/sicht*NL)|0),c=nb[lv*64+fa[gi]];if(y<0)y=0;
    for(var yy=y;yy<yb;yy++)buf[yy*W+x]=c;yb=y;m.pd[b+n]=d;m.py[b+n]=yb;n++;if(yb<=0)break}
   t+=dt;dt=.035+t*.011;schritte++}
  m.pc[x]=n;
  function wand(tc,u,seite){var d=tc*co;if(d<.05)return yb;var hb=hoeheIn(h,cam.x+dx*tc,cam.y+dy*tc),top=hb+WANDH,
    y0=Math.max(0,Math.ceil(hz+(cz-top)*f/d)),y1=Math.min(yb,Math.floor(hz+(cz-hb)*f/d)+1),lv=Math.min(NL-1,(d/sicht*NL)|0);
   if(y0>=y1)return yb;
   for(var yy=y0;yy<y1;yy++){var wz=cz-(yy-hz)*d/f-hb,lage=wz*5,reihe=Math.floor(lage),fr=lage-reihe,fu=u*2.5+(reihe&1)*.5,ju=fu-Math.floor(fu);
    var c=fr<.14||ju<.07?stein[0]:(seite?stein[1]:stein[2]);if(reihe>=4&&fr>.6)c=stein[3];buf[yy*W+x]=nb[lv*64+c]}
   return Math.min(yb,y0)}}
 // Objekte: in Sichtweite und vor der Kamera, nah zuerst ausgewählt (Obergrenze), dann von hinten nach vorn gezeichnet
 var liste=[];for(var i=0;i<w.obj.length;i++){var o=w.obj[i],rx=o.x-cam.x,ry=o.y-cam.y,de=rx*ca+ry*sa;if(de<.25||de>sicht)continue;
  var si=-rx*sa+ry*ca;if(Math.abs(si)>de*1.1+1)continue;liste.push({o:o,d:de,sx:W/2+si*f/de})}
 liste.sort(function(a,b){return a.d-b.d});if(liste.length>MAXOBJ)liste.length=MAXOBJ;
 var treffer=[],FPW=FP;
 for(var q=liste.length-1;q>=0;q--){var e=liste[q],oo=e.o,ob=arten[oo.art];if(!ob)continue;
  var seite=((Math.round((Math.atan2(cam.y-oo.y,cam.x-oo.x)-cam.a*0)/(Math.PI/4))+oo.r)%8+8)%8,k=f/(32*e.d),fern=k<.5,bi=fern?FPW.fernBild(ob,seite):FPW.nahBild(ob,seite);
  if(!bi){bi=FPW.nahBild(ob,seite);fern=false}if(!bi)continue;if(fern)k*=2;
  var nbz=nummernBild(bi,S),fy2=hz+(cz-oo.z)*f/e.d,x0=e.sx-nbz.ax*k,y0=fy2-nbz.ay*k,sw=nbz.w*k,sh=nbz.h*k,lv2=Math.min(NL-1,(e.d/sicht*NL)|0),ix0=Math.max(0,Math.ceil(x0)),ix1=Math.min(W,Math.ceil(x0+sw));
  if(ix0>=ix1||y0>=H)continue;var gezeigt=false;
  for(var X=ix0;X<ix1;X++){var ix=Math.min(nbz.w-1,((X-x0)/k)|0),clip=Math.min(H,oberkante(m,X,e.d,H),Math.ceil(y0+sh));
   for(var Y=Math.max(0,Math.ceil(y0));Y<clip;Y++){var iy=Math.min(nbz.h-1,((Y-y0)/k)|0),c2=nbz.px[iy*nbz.w+ix];if(c2!==255){buf[Y*W+X]=nb[lv2*64+c2];gezeigt=true}}}
  if(gezeigt)treffer.push({o:oo,x0:x0,y0:y0,x1:x0+sw,y1:y0+sh,d:e.d})}
 return{schritte:schritte,objekte:treffer.length,kandidaten:liste.length,treffer:treffer}}
function wandAn(a,i){return i>=0&&i<a.length&&a[i]===1}

// ---------- Laufen ----------
// Wie eine Figur: Wände auf Kanten, Wasser (außer Steg), Bäume sperren ihr Feld, Hänge steiler als 50° nicht begehbar. Gleiten an Hindernissen.
var KOERPER=.22,STEIL=1.2;
function frei(w,x0,y0,x1,y1){if(x1<1||y1<1||x1>N-1||y1>N-1)return false;
 var sx=x1+Math.sign(x1-x0)*KOERPER,sy=y1+Math.sign(y1-y0)*KOERPER,fa=Math.floor(x0),fb=Math.floor(y0),ga=Math.floor(sx),gb=Math.floor(sy);
 if(ga!==fa&&wandAn(w.wandX,Math.max(ga,fa)+fb*(N+1)))return false;
 if(gb!==fb&&wandAn(w.wandY,fa+Math.max(gb,fb)*N))return false;
 if(w.sperre[Math.floor(sy)*N+Math.floor(sx)])return false;
 var k=Math.round(sy*U)*M+Math.round(sx*U);if((w.h[k]<WL||w.biom[k]===BIOM.wasser)&&w.biom[k]!==BIOM.steg)return false;   // FP1: Bergseen liegen über WL, zählen über das Biom
 var dh=hoehe(w,x1,y1)-hoehe(w,x0,y0),dist=Math.hypot(x1-x0,y1-y0)||1e-6;return dh/dist<=STEIL}
function bewegen(w,cam,vor,seit,dt,auge){var ca=Math.cos(cam.a),sa=Math.sin(cam.a),mx=(vor*ca-seit*sa)*dt,my=(vor*sa+seit*ca)*dt,x=cam.x,y=cam.y;
 if(mx||my){if(frei(w,x,y,x+mx,y))x+=mx;if(frei(w,x,y,x,y+my))y+=my;cam.x=x;cam.y=y}
 var ziel=hoehe(w,cam.x,cam.y)+auge;cam.z=cam.z==null?ziel:cam.z+(ziel-cam.z)*Math.min(1,dt*12);return cam}

var FPW={N:N,U:U,M:M,WL:WL,WANDH:WANDH,BIOM:BIOM,MAXOBJ:MAXOBJ,welt:welt,hoehe:hoehe,farben:farben,zeichne:zeichne,bewegen:bewegen,frei:frei};
// Hintergrundkern: im Worker erzeugt der Kern die Welt und schickt die Felder ohne Kopie zurück.
if(typeof window==='undefined'&&typeof importScripts==='function'&&typeof self!=='undefined'){
 self.onmessage=function(e){var w=welt(e.data.seed);self.postMessage(w,[w.h.buffer,w.biom.buffer,w.wandX.buffer,w.wandY.buffer,w.sperre.buffer])};return}
if(typeof module!=='undefined'&&module.exports)module.exports=FPW;else G.AT3_FPW=FPW;
})(typeof window!=='undefined'?window:globalThis);
