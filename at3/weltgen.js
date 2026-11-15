// WAS DIE DATEI TUT: Weltgenerator von Arena Theory 3.0 (Schritt W1a). Reine Rechnung ohne Bildschirm, nur ganze Zahlen: gleicher Seed = gleiche Welt
// auf jedem Gerät. Welt 307.200 × 307.200 Felder (4.800 × 4.800 Kartenstücke zu 64 × 64 Feldern), ohne Weltarrays.
// 1) Ebene Erde: grobes Raster 300 × 300 Zellen (eine Zelle = 16 × 16 Kartenstücke = 1.024 Felder), einmal je Welt in 8 kleinen Teilaufträgen:
//    4 Bänder Rauschen (Kontinente, Gebirgszüge, Feuchte; zum Rand hin Ozean), Ozean und Seen (vom Rand geflutet: ein zusammenhängender Ozean),
//    Senken auffüllen mit Fließrichtung, Flüsse (Wassermenge sammeln), Klima und Biome. Bleibend 7 Byte je Zelle = 630 KB, egal wo man ist.
// 2) Kartenstück: entsteht erst bei Bedarf aus Seed und einem kleinen Ausschnitt des Erdrasters (5 × 5 Zellen, 300 Byte), den der Auftrag mitbringt.
//    Höhe = geglättete Erdhöhe + feines Rauschen über Weltkoordinaten (Ränder passen von selbst), Flusslauf über gemeinsame Punkte auf den Zellkanten,
//    Küste, Strand und Biome aus der endgültigen Höhe. Format je Stück 12 KB: Höhe 16 Bit (1/16 Feld, Meeresspiegel = 2048), Biom 8 Bit.
// Kerne: rechnen(a) läuft in den Helferkernen (ohne Helfer im Weltkern in freien Scheiben), nie auf dem Hauptkern (Regel 13). Helfer haben keinen Zustand.
// Riesenwelt (Regel 14): Ein Kartenstück kostet überall gleich viel; das Erdraster ist ein fester Betrag. Orte, Straßen, Häfen, Seewege: Schritt W1b.
// Wiederverwendet: Ganzzahl-Rauschen (gitter/stufe) und mix aus riesenwelt.js und kern.js (MK1, G2); zustandslose Landschaft nach dem Vorbild von
// welt-gross-core.js (2.0); Höheneinheit wie fpwelt.js (M7: 1 Feld = 1 Geschoss).
(function(root){
'use strict';
var ST=64, FELDER=ST*ST, SEITE=4800;          // Kartenstück 64 × 64 Felder, Welt 4.800 × 4.800 Stücke
var GE=300, N=GE*GE, ZP=16, ZF=1024;          // Erdraster 300 × 300 Zellen, Zelle = 16 Stücke = 1.024 Felder
var MEER=2048;                                // Meeresspiegel im Stück (Höhe in 1/16 Feld)
var ST_BYTES=FELDER*3, AUS=150;               // Stück: Höhe (2 Byte) + Biom (1 Byte); Ausschnitt 5 × 5 Zellen × 6 Zahlen
var GEL_BYTES=ST_BYTES+AUS*2;                 // Auftragspuffer eines Kartenstücks
var ERD_FEST=7*N, ERD_BYTES=16*N;             // Erdraster: bleibend 7 Byte je Zelle, beim Entstehen 16
var BAND=4, TEILE=BAND+4;                     // Teilaufträge der Erde
var TEIL_NAME=['Rauschen 1','Rauschen 2','Rauschen 3','Rauschen 4','Ozean und Seen','Senken','Flüsse','Klima'];
var BIOM=['tiefes Meer','Meer','Strand','Wüste','Steppe','Wald','Sumpf','Tundra','Gebirge','Schnee','Fluss','See'];
var DX=[1,0,-1,0], DY=[0,1,0,-1];             // Richtungen: 0 Ost, 1 Süd, 2 West, 3 Nord; 4 = keine
var LAND_AB=1400, RAND=32, FLUSS_AB=48;       // Meeresanteil, Breite des Randozeans in Zellen, Wassermenge für einen Fluss

function mix(a){a=a>>>0;a^=a>>>16;a=Math.imul(a,0x7feb352d);a^=a>>>15;a=Math.imul(a,0x846ca68b);a^=a>>>16;return a>>>0}
function gitter(seed,o,lx,ly){return mix(seed^Math.imul(lx,0x27d4eb2d)^Math.imul(ly,0x165667b1)^Math.imul(o+1,0x9e3779b9))&255}

// Sichten auf den Erdpuffer (bleibend: Höhe, Biom, Fluss, Richtung, Feuchte, Wärme; nur beim Entstehen: Meeresnähe, Reihenfolge, Wassermenge)
function ansicht(buf){var a={E:new Int16Array(buf,0,N),bio:new Uint8Array(buf,2*N,N),flu:new Uint8Array(buf,3*N,N),dir:new Uint8Array(buf,4*N,N),
  feu:new Uint8Array(buf,5*N,N),tmp:new Uint8Array(buf,6*N,N)};
 if(buf.byteLength>=ERD_BYTES){a.meer=new Uint8Array(buf,7*N,N);a.ord=new Uint32Array(buf,8*N,N);a.acc=new Uint32Array(buf,12*N,N)}
 return a}

// ── Ebene Erde ──
function glatt(u){return(u*u*(768-2*u))>>16}                                                     // 0..256 → 0..256, weich
function rau(seed,o,x,y,ld){var S=1<<ld,lx=x>>ld,ly=y>>ld,ux=glatt(((x&(S-1))<<8)>>ld),uy=glatt(((y&(S-1))<<8)>>ld);
 var a=gitter(seed,o,lx,ly),b=gitter(seed,o,lx+1,ly),c=gitter(seed,o,lx,ly+1),d=gitter(seed,o,lx+1,ly+1);
 return((a*(256-ux)+b*ux)*(256-uy)+(c*(256-ux)+d*ux)*uy)>>8}                                     // 0..65280
var O_LAND=[[6,96],[5,64],[4,40],[3,28],[2,16],[1,12]], O_BERG=[[5,128],[4,72],[3,40],[2,16]], O_FEU=[[5,120],[4,80],[3,56]];
function okt(seed,L,x,y){var s=0;for(var i=0;i<L.length;i++)s+=rau(seed,i,x,y,L[i][0])*L[i][1];return s>>8}

function teilRauschen(A,seed,band){var y0=(band*GE/BAND)|0,y1=((band+1)*GE/BAND)|0,sB=mix(seed^0x3c6ef372),sF=mix(seed^0x6a09e667);
 for(var y=y0;y<y1;y++)for(var x=0;x<GE;x++){var i=y*GE+x,d=Math.min(x,y,GE-1-x,GE-1-y);
  var c=okt(seed,O_LAND,x,y)-32640-LAND_AB-(d<RAND?(RAND-d)*(RAND-d)*30:0),e;
  if(d<2&&c>-2000)c=-2000;
  if(c>0){var r=2200-Math.abs(okt(sB,O_BERG,x,y)-32640);if(r<0)r=0;var inl=c>5000?5000:c;
   e=((c/9)|0)+((((r*inl)/5000)|0)<<2)+1;if(e>9600)e=9600}
  else{e=(c/5)|0;if(e>-1)e=-1;if(e<-2048)e=-2048}
  A.E[i]=e;A.feu[i]=okt(sF,O_FEU,x,y)>>8}}

// Ozean = alles Wasser, das den Rand erreicht (ein zusammenhängendes Meer). Übriges Wasser = See. Dazu die Meeresnähe je Zelle.
function teilOzean(A){var E=A.E,bio=A.bio,q=A.ord,meer=A.meer,n=0,k=0,i,x,y,r,j;
 for(i=0;i<N;i++){bio[i]=E[i]<0?11:5;meer[i]=255}
 for(x=0;x<GE;x++){q[n++]=x;q[n++]=(GE-1)*GE+x}for(y=1;y<GE-1;y++){q[n++]=y*GE;q[n++]=y*GE+GE-1}
 for(i=0;i<n;i++){bio[q[i]]=1;meer[q[i]]=0}
 while(k<n){i=q[k++];x=i%GE;y=(i/GE)|0;
  for(r=0;r<4;r++){var nx=x+DX[r],ny=y+DY[r];if(nx<0||ny<0||nx>=GE||ny>=GE)continue;j=ny*GE+nx;if(bio[j]===11){bio[j]=1;meer[j]=0;q[n++]=j}}}
 k=0;                                                                                              // Meeresnähe: Schritte bis zum Ozean (höchstens 255)
 while(k<n){i=q[k++];x=i%GE;y=(i/GE)|0;var m=meer[i];if(m>=254)continue;
  for(r=0;r<4;r++){nx=x+DX[r];ny=y+DY[r];if(nx<0||ny<0||nx>=GE||ny>=GE)continue;j=ny*GE+nx;if(meer[j]===255){meer[j]=m+1;q[n++]=j}}}}

// Senken auffüllen (vom Wasser her, niedrigste Zelle zuerst): jede Landzelle fließt zu der Zelle, von der aus sie erreicht wurde. Ohne Kreise.
function teilSenken(A){var E=A.E,bio=A.bio,dir=A.dir,hp=A.acc,ord=A.ord,n=0,cnt=0,i,x,y,r,j,v,p,e,c;
 // Haufen aus einer Zahl je Zelle: Höhe × Zellenzahl + Zellnummer (niedrigste zuerst, bei Gleichstand die kleinere Nummer)
 function rein(v){p=n++;while(p>0){e=(p-1)>>1;if(hp[e]<=v)break;hp[p]=hp[e];p=e}hp[p]=v}
 function raus(){var top=hp[0];v=hp[--n];p=0;for(;;){c=2*p+1;if(c>=n)break;if(c+1<n&&hp[c+1]<hp[c])c++;if(hp[c]>=v)break;hp[p]=hp[c];p=c}hp[p]=v;return top}
 for(i=0;i<N;i++)dir[i]=bio[i]===5?255:4;
 for(i=0;i<N;i++){if(dir[i]!==4)continue;x=i%GE;y=(i/GE)|0;
  for(r=0;r<4;r++){var nx=x+DX[r],ny=y+DY[r];if(nx<0||ny<0||nx>=GE||ny>=GE)continue;if(dir[ny*GE+nx]===255){rein(i);break}}}
 while(n){i=raus()%N;ord[cnt++]=i;x=i%GE;y=(i/GE)|0;var h=E[i]<0?0:E[i];
  for(r=0;r<4;r++){nx=x+DX[r];ny=y+DY[r];if(nx<0||ny<0||nx>=GE||ny>=GE)continue;j=ny*GE+nx;if(dir[j]!==255)continue;
   dir[j]=r^2;if(E[j]<=h)E[j]=h+1;rein((E[j]>47000?47000:E[j])*N+j)}}
 for(i=cnt;i<N;i++)ord[i]=0xffffffff}                                                               // Rest der Reihenfolge leer

// Flüsse: Wassermenge von oben nach unten sammeln (umgekehrte Reihenfolge der Senken-Rechnung). Fluss ab fester Menge, fünf Breiten.
function teilFluesse(A){var dir=A.dir,flu=A.flu,acc=A.acc,ord=A.ord,feu=A.feu,i,k,m;
 for(i=0;i<N;i++){acc[i]=dir[i]<4?1+(feu[i]>>5):0;flu[i]=0}
 for(k=N-1;k>=0;k--){i=ord[k];if(i>=N||dir[i]>=4)continue;acc[i+DX[dir[i]]+DY[dir[i]]*GE]+=acc[i]}
 for(i=0;i<N;i++){if(dir[i]>=4)continue;m=acc[i];flu[i]=m<FLUSS_AB?0:m<FLUSS_AB*3?1:m<FLUSS_AB*9?2:m<FLUSS_AB*27?3:m<FLUSS_AB*81?4:5}}

function biomVon(h,t,f){return h>7000||(t<25&&h>4000)?9:h>3800?8:t<45?7:t>185&&f<95?3:f<110?4:f>175&&h<600?6:5}
// Klima: Wärme nach Breite (Äquator in der Mitte) und Höhe, Feuchte aus Rauschen, Meeresnähe und Flüssen; Biom; Wasserart für die Kartenstücke.
function teilKlima(A){var E=A.E,bio=A.bio,dir=A.dir,flu=A.flu,feu=A.feu,tmp=A.tmp,meer=A.meer,i,x,y;
 for(y=0;y<GE;y++){var warm=255-Math.abs((((y*510)/(GE-1))|0)-255);
  for(x=0;x<GE;x++){i=y*GE+x;var e=E[i],t=warm-(e>0?e>>6:0)+((feu[i]&15)-8),f=((feu[i]*3)>>2)+(meer[i]<16?(16-meer[i])<<2:0)+(flu[i]?24:0);
   t=t<0?0:t>255?255:t;f=f>255?255:f;tmp[i]=t;feu[i]=f;
   if(bio[i]===1)bio[i]=e<-600?0:1;else if(bio[i]!==11)bio[i]=biomVon(e,t,f)}}
 for(y=0;y<GE;y++)for(x=0;x<GE;x++){i=y*GE+x;var see=bio[i]===11?1:bio[i]<2?0:1;                     // Bit 7: Wasser hier ist Binnenwasser (See), sonst Meer
  if(see&&bio[i]!==11)for(var dy=-1;dy<=1&&see;dy++)for(var dx=-1;dx<=1;dx++){var nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=GE||ny>=GE||bio[ny*GE+nx]<2){see=0;break}}
  dir[i]=(dir[i]&7)|(see?128:0)}}

function erdTeil(a){var A=ansicht(a.daten.buffer),t=a.teil;
 if(t<BAND)teilRauschen(A,a.seed>>>0,t);else if(t===BAND)teilOzean(A);
 else if(t===BAND+1)teilSenken(A);else if(t===BAND+2)teilFluesse(A);
 else teilKlima(A);
 return a.daten}
// Ganze Erde in einem Stück (Tests und Werkzeuge). Liefert den bleibenden Teil.
function erde(seed){var d=new Uint8Array(ERD_BYTES);for(var t=0;t<TEILE;t++)erdTeil({seed:seed,teil:t,daten:d});return new Uint8Array(d.buffer.slice(0,ERD_FEST))}

// Ausschnitt 5 × 5 Zellen um das Kartenstück in den Auftragspuffer schreiben (Weltkern). Außerhalb der Welt: tiefes Meer.
function ausschnitt(A,cx,cy,daten){var X=new Int16Array(daten.buffer,ST_BYTES,AUS),zx=cx>>4,zy=cy>>4,p=0;
 for(var dy=-2;dy<=2;dy++)for(var dx=-2;dx<=2;dx++,p+=6){var x=zx+dx,y=zy+dy;
  if(x<0||y<0||x>=GE||y>=GE){X[p]=-2048;X[p+1]=128;X[p+2]=0;X[p+3]=0;X[p+4]=0;X[p+5]=4;continue}
  var i=y*GE+x;X[p]=A.E[i];X[p+1]=A.feu[i];X[p+2]=A.tmp[i];X[p+3]=A.dir[i]&128?255:0;X[p+4]=A.flu[i];X[p+5]=A.dir[i]&7}
 return daten}

// ── Kartenstück ──
var hoch=new Uint16Array(FELDER), fein=new Uint16Array(FELDER), ecken=new Uint8Array(81);
// Wertrauschen einer Stufe über Weltkoordinaten (wie riesenwelt.js, hier mit weichem Übergang): Gitterabstand 2^ld Felder
var sx=new Int32Array(ST), su=new Int32Array(ST);
function stufe(seed,o,ld,gew,gx0,gy0,ziel,setzen){var S=1<<ld,c=ld>=6?1:ST>>ld,lx0=gx0>>ld,ly0=gy0>>ld,x,y,t;
 for(y=0;y<=c;y++)for(x=0;x<=c;x++)ecken[y*(c+1)+x]=gitter(seed,o,lx0+x,ly0+y);
 for(x=0;x<ST;x++){t=gx0+x-(lx0<<ld);sx[x]=t>>ld;su[x]=glatt(ld>=8?(t&(S-1))>>(ld-8):(t&(S-1))<<(8-ld))}
 for(y=0;y<ST;y++){t=gy0+y-(ly0<<ld);var r=(t>>ld)*(c+1),uy=glatt(ld>=8?(t&(S-1))>>(ld-8):(t&(S-1))<<(8-ld)),p=y*ST;
  for(x=0;x<ST;x++){var e=r+sx[x],ux=su[x],o1=ecken[e]*(256-ux)+ecken[e+1]*ux,o2=ecken[e+c+1]*(256-ux)+ecken[e+c+2]*ux,w=(o1*(256-uy)+o2*uy)>>16;
   if(setzen)ziel[p+x]=w*gew;else ziel[p+x]+=w*gew}}}
var O_FEIN=[[9,72],[8,56],[7,44],[6,34],[5,24],[4,16],[3,10]];                                       // Summe 256
var wx=new Int32Array(ST*3), wy=new Int32Array(ST*3), zeile=new Int32Array(ST*3), kanal=[new Int32Array(FELDER),new Int32Array(FELDER),new Int32Array(FELDER),new Int32Array(FELDER)];
var HW=[0,1,2,3,5,7], UFER=6;                                                                        // halbe Flussbreite je Klasse, Uferzone in Feldern
var segs=new Int32Array(5*5*8*5), nSeg=0, teiche=new Int32Array(5*3), nTeich=0;
var wurzel=(function(){var t=new Uint8Array(1024);for(var i=0;i<1024;i++){var r=0;while((r+1)*(r+1)<=i)r++;t[i]=r}return t})();

function X6(X,dx,dy,k){return X[((dy+2)*5+dx+2)*6+k]}
// Punkt, an dem ein Fluss die Kante einer Zelle quert: hängt nur von der Kante ab, beide Nachbarn rechnen denselben Punkt.
function kante(seed,zx,zy,q){var kx=q===0?zx+1:zx,ky=q===1?zy+1:zy,h=256+mix(seed^Math.imul(kx,0x632be5ab)^Math.imul(ky,0x7ed55d16)^((q&1)?0x51ed27:0x2c1b3c))%513;
 return q===0?[ZF,h]:q===2?[0,h]:q===1?[h,ZF]:[h,0]}
function bogen(x0,y0,x2,y2,kl,sd,ox,oy){var h=mix(sd),x1=((x0+x2)>>1)+(h%321)-160,y1=((y0+y2)>>1)+((h>>>9)%321)-160;
 x1=x1<32?32:x1>ZF-32?ZF-32:x1;y1=y1<32?32:y1>ZF-32?ZF-32:y1;
 var px=x0,py=y0,rand=HW[kl]+UFER+1;
 for(var i=1;i<=8;i++){var a=(8-i)*(8-i),b=2*i*(8-i),c=i*i,qx=(a*x0+b*x1+c*x2)>>6,qy=(a*y0+b*y1+c*y2)>>6;
  var ax=px+ox,ay=py+oy,bx=qx+ox,by=qy+oy;                                                            // in Feldern relativ zum Stück
  if(!((ax<-rand&&bx<-rand)||(ay<-rand&&by<-rand)||(ax>ST+rand&&bx>ST+rand)||(ay>ST+rand&&by>ST+rand))){var p=nSeg*5;segs[p]=ax;segs[p+1]=ay;segs[p+2]=bx;segs[p+3]=by;segs[p+4]=kl;nSeg++}
  px=qx;py=qy}}
// Flussläufe einer Zelle (dx, dy relativ zur Zelle des Stücks) einsammeln, soweit sie das Stück berühren
function zelleFluss(X,seed,zx,zy,dx,dy,cx,cy){var Zx=zx+dx,Zy=zy+dy,k=X6(X,dx,dy,4),d=X6(X,dx,dy,5),wasser=X6(X,dx,dy,0)<0,q,ein=0;
 var ox=Zx*ZF-cx*ST,oy=Zy*ZF-cy*ST,hz=mix(seed^Math.imul(Zx,0x1b873593)^Math.imul(Zy,0xcc9e2d51)),jx=362+hz%301,jy=362+(hz>>>10)%301;
 if(!wasser&&!k)return;
 for(q=0;q<4;q++){var nk=X6(X,dx+DX[q],dy+DY[q],4);if(!nk||X6(X,dx+DX[q],dy+DY[q],5)!==(q^2))continue;
  var P=kante(seed,Zx,Zy,q);bogen(P[0],P[1],jx,jy,nk,hz+q+1,ox,oy);ein++}
 if(wasser){if(ein&&nTeich<5){teiche[nTeich*3]=jx+ox;teiche[nTeich*3+1]=jy+oy;teiche[nTeich*3+2]=30;nTeich++}return}
 if(d<4){P=kante(seed,Zx,Zy,d);bogen(jx,jy,P[0],P[1],k,hz+7,ox,oy)}}

function gelaende(a){var d=a.daten,buf=d.buffer,H=new Uint16Array(buf,0,FELDER),B=new Uint8Array(buf,FELDER*2,FELDER),X=new Int16Array(buf,ST_BYTES,AUS);
 var seed=a.seed>>>0,cx=a.cx,cy=a.cy,zx=cx>>4,zy=cy>>4,gx0=cx*ST,gy0=cy*ST,i,x,y,k,u;
 // geglättete Erdwerte (Höhe, Feuchte, Wärme, Wasserart): weicher Übergang über 3 × 3 Zellen, an Zellgrenzen stetig
 for(x=0;x<ST;x++){u=(cx&15)*ST+x;wx[x*3]=((ZF-u)*(ZF-u))>>6;wx[x*3+2]=(u*u)>>6;wx[x*3+1]=32768-wx[x*3]-wx[x*3+2];
  u=(cy&15)*ST+x;wy[x*3]=((ZF-u)*(ZF-u))>>6;wy[x*3+2]=(u*u)>>6;wy[x*3+1]=32768-wy[x*3]-wy[x*3+2]}
 for(k=0;k<4;k++){var K=kanal[k];
  for(var r=0;r<3;r++){var v0=X6(X,-1,r-1,k),v1=X6(X,0,r-1,k),v2=X6(X,1,r-1,k);for(x=0;x<ST;x++)zeile[r*ST+x]=(wx[x*3]*v0+wx[x*3+1]*v1+wx[x*3+2]*v2)>>15}
  for(y=0;y<ST;y++){var a0=wy[y*3],a1=wy[y*3+1],a2=wy[y*3+2];for(x=0;x<ST;x++)K[y*ST+x]=(a0*zeile[x]+a1*zeile[ST+x]+a2*zeile[2*ST+x])>>15}}
 // feines Rauschen über Weltkoordinaten
 for(i=0;i<O_FEIN.length;i++)stufe(seed,i+20,O_FEIN[i][0],O_FEIN[i][1],gx0,gy0,hoch,i===0);
 stufe(seed^0x5f356495,40,4,256,gx0,gy0,fein,true);
 // Flussläufe der eigenen Zelle und der Nachbarzelle hinter einer nahen Kante
 nSeg=0;nTeich=0;zelleFluss(X,seed,zx,zy,0,0,cx,cy);
 if((cx&15)===0)zelleFluss(X,seed,zx,zy,-1,0,cx,cy);if((cx&15)===15)zelleFluss(X,seed,zx,zy,1,0,cx,cy);
 if((cy&15)===0)zelleFluss(X,seed,zx,zy,0,-1,cx,cy);if((cy&15)===15)zelleFluss(X,seed,zx,zy,0,1,cx,cy);
 var KE=kanal[0],KF=kanal[1],KT=kanal[2],KS=kanal[3];
 for(y=0;y<ST;y++)for(x=0;x<ST;x++){i=y*ST+x;var b=KE[i],amp=b>0?48+((b*3)>>3):48+((-b)>>3),h=b+(((hoch[i]-32640)*amp)>>15),fl=0;
  if(nSeg){var best=1<<30;
   for(k=0;k<nSeg;k++){var p=k*5,x1=segs[p],y1=segs[p+1],vx=segs[p+2]-x1,vy=segs[p+3]-y1,wxx=x-x1,wyy=y-y1,t=wxx*vx+wyy*vy,vv=vx*vx+vy*vy,d2=wxx*wxx+wyy*wyy;
    if(t>0){if(t>=vv){wxx=x-segs[p+2];wyy=y-segs[p+3];d2=wxx*wxx+wyy*wyy}else d2-=Math.floor(t*t/vv)}
    var hw=HW[segs[p+4]],gr=(hw+UFER)*(hw+UFER);if(d2<gr){var ab=wurzel[d2]-hw;if(ab<best)best=ab}}
   if(best<UFER&&h>0){var ob=b-24;if(ob>h-8)ob=h-8;if(ob<4)ob=4;                                      // Wasserspiegel: glatte Erdhöhe, nie über dem Gelände
    if(best<=0){h=ob;fl=1}else{var ufer=ob+best*20;if(ufer<h)h=((h*best+ufer*(UFER-best))/UFER)|0}}}
  for(k=0;k<nTeich;k++){var tx=x-teiche[k*3],ty=y-teiche[k*3+1],tr=teiche[k*3+2];if(tx*tx+ty*ty<tr*tr&&h>-8){h=-8;fl=0}}   // Mündung: der Fluss endet sichtbar im Wasser
  var bi;
  if(fl)bi=10;
  else if(h<0)bi=KS[i]>127?11:h<-600?0:1;
  else if(h<24&&KS[i]<=127)bi=2;
  else{var z=(fein[i]>>11)-16;bi=biomVon(h,KT[i]+z,KF[i]+z)}
  h+=MEER;H[i]=h<0?0:h>65535?65535:h;B[i]=bi}
 return d}

function rechnen(a){return a.art==='erde'?erdTeil(a):gelaende(a)}
// Ein Kartenstück in einem Stück (Tests und Werkzeuge): A = ansicht(erde(seed).buffer)
function stueck(seed,A,cx,cy,daten){daten=daten||new Uint8Array(GEL_BYTES);ausschnitt(A,cx,cy,daten);return gelaende({seed:seed,cx:cx,cy:cy,daten:daten})}

var WG={ST:ST,FELDER:FELDER,SEITE:SEITE,GE:GE,N:N,ZP:ZP,ZF:ZF,MEER:MEER,ST_BYTES:ST_BYTES,GEL_BYTES:GEL_BYTES,ERD_FEST:ERD_FEST,ERD_BYTES:ERD_BYTES,BAND:BAND,TEILE:TEILE,
 TEIL_NAME:TEIL_NAME,BIOM:BIOM,DX:DX,DY:DY,HW:HW,mix:mix,ansicht:ansicht,erdTeil:erdTeil,erde:erde,ausschnitt:ausschnitt,gelaende:gelaende,stueck:stueck,rechnen:rechnen,kante:kante,biomVon:biomVon};
if(typeof module!=='undefined'&&module.exports)module.exports=WG;else root.AT3WG=WG;
})(typeof self!=='undefined'?self:this);
