// WAS DIE DATEI TUT: Weltgenerator von Arena Theory 3.0 (Schritte W1a, W1a+, W1b). Reine Rechnung ohne Bildschirm, nur ganze Zahlen: gleicher Seed = gleiche Welt
// auf jedem Gerät. Welt 307.200 × 307.200 Felder (4.800 × 4.800 Kartenstücke zu 64 × 64 Feldern), ohne Weltarrays.
// 1) Ebene Erde: grobes Raster 300 × 300 Zellen (eine Zelle = 16 × 16 Kartenstücke = 1.024 Felder), einmal je Welt in 11 kleinen Teilaufträgen:
//    4 Bänder Rauschen (Kontinente, Gebirgszüge, Feuchte; zum Rand hin Ozean), Ozean und Seen (vom Rand geflutet: ein zusammenhängender Ozean),
//    Senken auffüllen mit Fließrichtung, Flüsse (Wassermenge sammeln), Klima und Biome; seit W1b drei weitere Teile (siehe 3). Bleibend 9 Byte je Zelle.
// 2) Kartenstück: entsteht erst bei Bedarf aus Seed und einem kleinen Ausschnitt des Erdrasters (5 × 5 Zellen, 400 Byte), den der Auftrag mitbringt.
//    Höhe = geglättete Erdhöhe + feines Rauschen über Weltkoordinaten (Ränder passen von selbst), Flusslauf über gemeinsame Punkte auf den Zellkanten,
//    Küste und Strand aus der endgültigen Höhe. Biome gemischt (W1a+, unten): jede Gegend hat alle Land-Biome als Flecken, das Großklima verschiebt
//    nur leicht; Hochland hebt Hügel mit Fels und Schneekuppen, Sumpf senkt, Teiche im Land. Format je Stück 16 KB: Höhe 16 Bit (1/16 Feld, Meeresspiegel = 2048), Biom 8 Bit, Weg 8 Bit (W1b).
// Kerne: rechnen(a) läuft in den Helferkernen (ohne Helfer im Weltkern in freien Scheiben), nie auf dem Hauptkern (Regel 13). Helfer haben keinen Zustand.
// Riesenwelt (Regel 14): Ein Kartenstück kostet überall gleich viel; das Erdraster ist ein fester Betrag.
// 3) W1b Orte, Straßen, Häfen, Seewege (unten): drei weitere Erd-Teile. Orte und Häfen aus dem Seed (Dichte dünn/mittel/dicht), jede Landmasse hat
//    mindestens einen Hafen; Straßen als Wegsuche von allen Orten zugleich über Gelände, Sumpf, Fels und Flussquerungen (gewunden, keine Geraden),
//    erst ein Netz, das jeden Ort erreicht, dann Querverbindungen; Seewege ebenso über den zusammenhängenden Ozean. Bleibend 2 Byte je Zelle mehr
//    (9 Byte = 810 KB) und das Netz als Graph (Orte, Verbindungen mit Länge und Art). Im Kartenstück eine vierte Schicht (1 Byte je Feld):
//    Pfad, Straße, Brücke, Furt, Steg, Ortsplatz, Fähre. Stücke ohne Straße kosten nichts zusätzlich.
// Wiederverwendet: Ganzzahl-Rauschen (gitter/stufe) und mix aus riesenwelt.js und kern.js (MK1, G2); zustandslose Landschaft nach dem Vorbild von
// welt-gross-core.js (2.0); Höheneinheit wie fpwelt.js (M7: 1 Feld = 1 Geschoss).
(function(root){
'use strict';
var ST=64, FELDER=ST*ST, SEITE=4800;          // Kartenstück 64 × 64 Felder, Welt 4.800 × 4.800 Stücke
var GE=300, N=GE*GE, ZP=16, ZF=1024;          // Erdraster 300 × 300 Zellen, Zelle = 16 Stücke = 1.024 Felder
var MEER=2048;                                // Meeresspiegel im Stück (Höhe in 1/16 Feld)
var ST_BYTES=FELDER*4, AUS=200;               // Stück: Höhe (2 Byte) + Biom (1 Byte) + Weg (1 Byte, W1b); Ausschnitt 5 × 5 Zellen × 8 Zahlen
var GEL_BYTES=ST_BYTES+AUS*2;                 // Auftragspuffer eines Kartenstücks
var ORT_MAX=16384, KANTE_MAX=32768, NETZ_KOPF=16, NETZ_MAX=NETZ_KOPF+ORT_MAX*4+KANTE_MAX*8;   // W1b: Obergrenzen des Netzes (Orte, Verbindungen)
var ERD_ZELLEN=9*N, ERD_FEST=ERD_ZELLEN+NETZ_MAX;   // Erdraster: bleibend 9 Byte je Zelle + Netz (höchstens; übernommen wird nur der belegte Teil)
var TAB=65536, SC=ERD_FEST, ERD_BYTES=SC+11*N+TAB*12;   // beim Entstehen zusätzlich Arbeitsfelder der Wegsuche
var BAND=4, TEILE=BAND+7;                     // Teilaufträge der Erde
var TEIL_NAME=['Rauschen 1','Rauschen 2','Rauschen 3','Rauschen 4','Ozean und Seen','Senken','Flüsse','Klima','Orte und Häfen','Straßen','Seewege'];
var ORT_ART=['','Dorf','Stadt','Hafendorf','Hafenstadt'], WEG_ART=['','Pfad','Straße','Brücke','Furt','Steg','Ortsplatz','Fähre'];
var BIOM=['tiefes Meer','Meer','Strand','Wüste','Steppe','Wald','Sumpf','Tundra','Fels','Schnee','Fluss','See'];
var DX=[1,0,-1,0], DY=[0,1,0,-1];             // Richtungen: 0 Ost, 1 Süd, 2 West, 3 Nord; 4 = keine
var LAND_AB=1400, RAND=32, FLUSS_AB=48;       // Meeresanteil, Breite des Randozeans in Zellen, Wassermenge für einen Fluss

function mix(a){a=a>>>0;a^=a>>>16;a=Math.imul(a,0x7feb352d);a^=a>>>15;a=Math.imul(a,0x846ca68b);a^=a>>>16;return a>>>0}
function gitter(seed,o,lx,ly){return mix(seed^Math.imul(lx,0x27d4eb2d)^Math.imul(ly,0x165667b1)^Math.imul(o+1,0x9e3779b9))&255}

// Sichten auf den Erdpuffer (bleibend: Höhe, Biom, Fluss, Richtung, Feuchte, Wärme; nur beim Entstehen: Meeresnähe, Reihenfolge, Wassermenge)
function ansicht(buf){var a={E:new Int16Array(buf,0,N),bio:new Uint8Array(buf,2*N,N),flu:new Uint8Array(buf,3*N,N),dir:new Uint8Array(buf,4*N,N),
  feu:new Uint8Array(buf,5*N,N),tmp:new Uint8Array(buf,6*N,N)};
 if(buf.byteLength>=ERD_ZELLEN+NETZ_KOPF){a.ort=new Uint8Array(buf,7*N,N);a.weg=new Uint8Array(buf,8*N,N);a.kopf=new Uint32Array(buf,9*N,4)}   // W1b
 if(buf.byteLength>=ERD_BYTES){a.meer=new Uint8Array(buf,7*N,N);a.ord=new Uint32Array(buf,8*N,N);a.acc=new Uint32Array(buf,12*N,N);  // nur beim Entstehen (Teile 0 bis 7 nutzen den Platz von ort, weg und Netz als Arbeitsfeld)
  a.orte=new Uint32Array(buf,9*N+NETZ_KOPF,ORT_MAX);a.kanten=new Uint16Array(buf,9*N+NETZ_KOPF+ORT_MAX*4,KANTE_MAX*4);
  a.lm=new Uint16Array(buf,SC,N);a.bes=new Uint16Array(buf,SC+2*N,N);a.dst=new Uint16Array(buf,SC+4*N,N);a.vor=new Uint8Array(buf,SC+6*N,N);a.hp=new Uint32Array(buf,SC+7*N,N);
  a.tk=new Uint32Array(buf,SC+11*N,TAB);a.tv=new Uint32Array(buf,SC+11*N+TAB*4,TAB);a.tc=new Uint32Array(buf,SC+11*N+TAB*8,TAB)}
 else if(a.kopf){a.orte=new Uint32Array(buf,9*N+NETZ_KOPF,a.kopf[0]);a.kanten=new Uint16Array(buf,9*N+NETZ_KOPF+a.kopf[0]*4,a.kopf[1]*4)}   // übernommen: nur der belegte Teil
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
   if(bio[i]===1)bio[i]=e<-600?0:1;else if(bio[i]!==11)bio[i]=herrscht(e,t,f)}}
 for(y=0;y<GE;y++)for(x=0;x<GE;x++){i=y*GE+x;var see=bio[i]===11?1:bio[i]<2?0:1;                     // Bit 7: Wasser hier ist Binnenwasser (See), sonst Meer
  if(see&&bio[i]!==11)for(var dy=-1;dy<=1&&see;dy++)for(var dx=-1;dx<=1;dx++){var nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=GE||ny>=GE||bio[ny*GE+nx]<2){see=0;break}}
  dir[i]=(dir[i]&7)|(see?128:0)}}

function erdTeil(a){var A=ansicht(a.daten.buffer),t=a.teil;
 if(t<BAND)teilRauschen(A,a.seed>>>0,t);else if(t===BAND)teilOzean(A);
 else if(t===BAND+1)teilSenken(A);else if(t===BAND+2)teilFluesse(A);
 else if(t===BAND+3)teilKlima(A);
 else if(t===BAND+4)teilOrte(A,a.seed>>>0,a.dichte==null?1:a.dichte);else teilNetz(A,a.seed>>>0,t===BAND+6?1:0);
 return a.daten}
// Bleibender Teil der fertigen Erde: 9 Byte je Zelle, Kopf, belegte Orte, belegte Verbindungen (dicht hintereinander)
function fest(d){var k=new Uint32Array(d.buffer,9*N,4),nO=k[0],nK=k[1],aus=new Uint8Array(ERD_ZELLEN+NETZ_KOPF+nO*4+nK*8),p=ERD_ZELLEN+NETZ_KOPF;
 aus.set(d.subarray(0,p+nO*4));aus.set(d.subarray(ERD_ZELLEN+NETZ_KOPF+ORT_MAX*4,ERD_ZELLEN+NETZ_KOPF+ORT_MAX*4+nK*8),p+nO*4);return aus}
// Ganze Erde in einem Stück (Tests und Werkzeuge). Liefert den bleibenden Teil.
function erde(seed,dichte){var d=new Uint8Array(ERD_BYTES);for(var t=0;t<TEILE;t++)erdTeil({seed:seed,teil:t,dichte:dichte,daten:d});return fest(d)}

// Ausschnitt 5 × 5 Zellen um das Kartenstück in den Auftragspuffer schreiben (Weltkern). Außerhalb der Welt: tiefes Meer.
function ausschnitt(A,cx,cy,daten){var X=new Int16Array(daten.buffer,ST_BYTES,AUS),zx=cx>>4,zy=cy>>4,p=0;
 for(var dy=-2;dy<=2;dy++)for(var dx=-2;dx<=2;dx++,p+=8){var x=zx+dx,y=zy+dy;
  if(x<0||y<0||x>=GE||y>=GE){X[p]=-2048;X[p+1]=128;X[p+2]=0;X[p+3]=0;X[p+4]=0;X[p+5]=4;X[p+6]=0;X[p+7]=0;continue}
  var i=y*GE+x;X[p]=A.E[i];X[p+1]=A.feu[i];X[p+2]=A.tmp[i];X[p+3]=A.dir[i]&128?255:0;X[p+4]=A.flu[i];X[p+5]=A.dir[i]&7;X[p+6]=A.weg?A.weg[i]:0;X[p+7]=A.ort?A.ort[i]:0}
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
var HW=[0,1,2,3,5,7], UFER=6, SUMPF_W=14;                                                                        // halbe Flussbreite je Klasse, Uferzone in Feldern
var segs=new Int32Array(5*5*8*5), nSeg=0, teiche=new Int32Array(5*3), nTeich=0;
var wurzel=(function(){var t=new Uint8Array(1024);for(var i=0;i<1024;i++){var r=0;while((r+1)*(r+1)<=i)r++;t[i]=r}return t})();

function X6(X,dx,dy,k){return X[((dy+2)*5+dx+2)*8+k]}
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

function gelaende(a){var d=a.daten,buf=d.buffer,H=new Uint16Array(buf,0,FELDER),B=new Uint8Array(buf,FELDER*2,FELDER),W=new Uint8Array(buf,FELDER*3,FELDER),X=new Int16Array(buf,ST_BYTES,AUS);
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
 var KE=kanal[0],KF=kanal[1],KT=kanal[2],KS=kanal[3],PI=FK,gi,gj;
 // W1a+: Kanalwerte auf dem groben Raster (alle 8 Felder), Fransen
 for(gj=0;gj<GN;gj++)for(gi=0;gi<GN;gi++)punkt(seed,gx0+gi*GRB,gy0+gj*GRB,GP,(gj*GN+gi)*KP);
 for(y=0;y<ST;y++)for(x=0;x<ST;x++){i=y*ST+x;var b=KE[i],amp=b>0?48+((b*3)>>3):48+((-b)>>3),h=b+(((hoch[i]-32640)*amp)>>15),fl=0,best=255;
  if(nSeg){best=1<<30;
   for(k=0;k<nSeg;k++){var p=k*5,x1=segs[p],y1=segs[p+1],vx=segs[p+2]-x1,vy=segs[p+3]-y1,wxx=x-x1,wyy=y-y1,t=wxx*vx+wyy*vy,vv=vx*vx+vy*vy,d2=wxx*wxx+wyy*wyy;
    if(t>0){if(t>=vv){wxx=x-segs[p+2];wyy=y-segs[p+3];d2=wxx*wxx+wyy*wyy}else d2-=Math.floor(t*t/vv)}
    var hw=HW[segs[p+4]],gr=(hw+UFER+SUMPF_W)*(hw+UFER+SUMPF_W);if(d2<gr){var ab=wurzel[d2]-hw;if(ab<best)best=ab}}
   if(best>255)best=255}
  // Biom aus den Kanälen (weich zwischen den Rasterpunkten), Großklima, Fransen, Ufer
  var fx=x&7,fy=y&7,q=((y>>3)*GN+(x>>3))*KP,w00=(8-fx)*(8-fy),w10=fx*(8-fy),w01=(8-fx)*fy,w11=fx*fy,q2=q+GN*KP;
  for(k=0;k<KP;k++)PI[k]=(GP[q+k]*w00+GP[q+KP+k]*w10+GP[q2+k]*w01+GP[q2+KP+k]*w11)>>6;
  neigung(KT[i],KF[i],b,VN);
  var bk=klasse(PI,0,VN,(fein[i]-32640)>>6,(hoch[i]-32640)>>6,best<UFER+SUMPF_W?(UFER+SUMPF_W-best)*48:0);
  // Gelände folgt dem Biom: Hochland hebt zu Hügeln und Gipfeln, Sumpf senkt zu Senken; an der Küste ausgeblendet
  if(b>0){var fk=b>=320?256:(b<<8)/320|0,hu=KL.d>-M_HUEGEL?KL.d+M_HUEGEL:0,se=KL.s>-M_SENKE?KL.s+M_SENKE:0,auf=(hu*hu)>>13,ab2=(se*se)>>14;
   if(ab2>h-48)ab2=h-48;if(ab2<0)ab2=0;h+=((auf-ab2)*fk)>>8}
  if(best<UFER&&h>0){var ob=b-24;if(ob>h-8)ob=h-8;if(ob<4)ob=4;                                       // Wasserspiegel: glatte Erdhöhe, nie über dem Gelände
   if(best<=0){h=ob;fl=1}else{var ufer=ob+best*20;if(ufer<h)h=((h*best+ufer*(UFER-best))/UFER)|0}}
  for(k=0;k<nTeich;k++){var tx=x-teiche[k*3],ty=y-teiche[k*3+1],tr=teiche[k*3+2];if(tx*tx+ty*ty<tr*tr&&h>-8){h=-8;fl=0}}   // Mündung: der Fluss endet sichtbar im Wasser
  var bi;
  if(fl)bi=10;
  else if(h<0)bi=KS[i]>127?11:h<-600?0:1;
  else if(h<24&&KS[i]<=127)bi=2;
  else{bi=bk;if(bi===11)h-=16}                                                                        // Teich: Spiegel ein Feld tiefer
  h+=MEER;H[i]=h<0?0:h>65535?65535:h;B[i]=bi}
 // W1b: Straßen, Brücken, Stege, Ortsplatz (nur wenn die Zelle oder die Nachbarzelle hinter einer nahen Kante etwas davon hat)
 for(i=0;i<FELDER;i++)W[i]=0;nStempel=0;pTyp=0;
 wegZelle(X,seed,zx,zy,0,0,cx,cy,W);
 if((cx&15)===0)wegZelle(X,seed,zx,zy,-1,0,cx,cy,W);if((cx&15)===15)wegZelle(X,seed,zx,zy,1,0,cx,cy,W);
 if((cy&15)===0)wegZelle(X,seed,zx,zy,0,-1,cx,cy,W);if((cy&15)===15)wegZelle(X,seed,zx,zy,0,1,cx,cy,W);
 if(nStempel||pTyp)wegFertig(X,H,B,W);
 return d}

// ── W1a+ Biome gemischt: jede Gegend enthält alle Land-Biome als Flecken, das Großklima verschiebt die Anteile nur leicht ──
// Sechs Kanäle (Wüste, Steppe, Wald, Sumpf, Tundra, Hochland) aus Rauschen in vier Größen (rund 30 bis 600 Felder), jede Stufe um einen eigenen
// Winkel gedreht und das Ganze verzerrt (keine Gitter, keine Kacheln, nichts wiederholt sich). Gewinner je Feld = Biom; Hochland trägt Fels,
// im Kern Schnee, und hebt das Gelände zu Hügeln und kleinen Gipfeln; Sumpf senkt es zu Senken und liebt Flussufer; ein siebter Kanal legt
// Teiche und Seen ins Land. Gerechnet auf einem groben Raster alle 4 Felder (17 × 17 Punkte über Weltkoordinaten, darum nahtlos), dazwischen
// weich verbunden, die Ränder mit feinem Rauschen ausgefranst.
var KAN=[3,4,5,6,7,8], KN=6, KP=KN+1, GRB=8, GN=ST/GRB+1;
var ROT=[[1024,0],[857,560],[-327,970],[594,-834],[-998,229],[202,-1004],[-740,-708]];             // Drehung je Rauschstufe (× 1024)
var M_OKT=[[587,0],[241,32],[113,128],[47,96]], H_OKT=[[587,0],[241,0],[113,104],[47,152]];   // Hochland: mehr kleine Hügel, gleichmäßiger verteilt                                                      // Gitterabstand in Feldern, Gewicht (Summe 256)
var M_SCHNEE=1700, H_GRUND=800, M_HUEGEL=900, M_SENKE=700, M_TEICH=11900;                                          // Schwellen (Rauscheinheit = 64)
function wn(seed,o,x,y,S){var r=ROT[o%7],X=(r[0]*x-r[1]*y)>>10,Y=(r[1]*x+r[0]*y)>>10,fx=X%S,fy=Y%S;if(fx<0)fx+=S;if(fy<0)fy+=S;
 var lx=(X-fx)/S,ly=(Y-fy)/S,ux=glatt(((fx<<8)/S)|0),uy=glatt(((fy<<8)/S)|0);
 var a=gitter(seed,o,lx,ly),b=gitter(seed,o,lx+1,ly),c=gitter(seed,o,lx,ly+1),d=gitter(seed,o,lx+1,ly+1);
 return((a*(256-ux)+b*ux)*(256-uy)+(c*(256-ux)+d*ux)*uy)>>8}                                       // 0..65280
// Kanalwerte an einem Weltpunkt (Feld x, y) nach P[p..p+6]: 6 Biome und Teiche, je 0..16320
function punkt(seed,x,y,P,p){var c,k,s;
 var X=x+(((wn(seed,50,x,y,389)-32640)*96)>>15)+(((wn(seed,51,x,y,97)-32640)*30)>>15),
     Y=y+(((wn(seed,52,x,y,389)-32640)*96)>>15)+(((wn(seed,53,x,y,97)-32640)*30)>>15);
 for(c=0;c<KN;c++){var O=c===5?H_OKT:M_OKT;s=0;for(k=0;k<4;k++)if(O[k][1])s+=wn(seed,60+c*4+k,X,Y,O[k][0])*O[k][1];P[p+c]=s>>10}
 P[p+KN]=(wn(seed,90,X,Y,173)*150+wn(seed,91,X,Y,61)*106)>>10}
// Großklima → leichte Verschiebung je Kanal (höchstens ±4 Rauscheinheiten). t Wärme, f Feuchte 0..255, e Erdhöhe in 1/16 Feld.
function kl(v){return v<-280?-280:v>280?280:v|0}
function neigung(t,f,e,V){V[0]=kl((t-140)*2+(110-f)*2);V[1]=kl(60-Math.abs(f-110)*3-Math.abs(t-150)*2);V[2]=kl((f-110)*4-Math.abs(t-140)*2+80);
 V[3]=kl((f-140)*2+(e<800?60:-((e-800)>>3)));V[4]=kl((100-t)*3);V[5]=H_GRUND+(e>3800?120:0)}
// vorherrschendes Biom für die Weltkarte (nur Neigung, ohne Flecken)
var VN=new Int32Array(KN);
function herrscht(e,t,f){neigung(t,f,e,VN);VN[5]-=H_GRUND;var b=0;for(var c=1;c<KN;c++)if(VN[c]>VN[b])b=c;return b===5?(t<60||e>6000?9:8):KAN[b]}
var GP=new Int32Array(GN*GN*KP), FK=new Int32Array(FELDER*2);
// Anteile der Biome in einem Erdfeld schätzen (Weltansicht beim Antippen): 24 × 24 Stichproben, gleiche Regel wie im Kartenstück ohne Flüsse und Fransen
function anteile(seed,A,zx,zy){var Z=new Int32Array(12),P=new Int32Array(KP),V=new Int32Array(KN),i=zy*GE+zx,n=0;
 if(A.bio[i]<2||A.bio[i]===11){Z[A.bio[i]]=1;return Z}
 neigung(A.tmp[i],A.feu[i],A.E[i],V);
 for(var y=0;y<24;y++)for(var x=0;x<24;x++){punkt(seed>>>0,zx*ZF+x*42+21,zy*ZF+y*42+21,P,0);Z[klasse(P,0,V,0,0,0)]++;n++}
 return Z}
// Klasse aus Kanalwerten (dazu Großklima V, Fransen j1/j2, Uferbonus für Sumpf). Setzt KL.d (Vorsprung Hochland) und KL.s (Vorsprung Sumpf).
var KL={d:0,s:0}, KV=new Int32Array(KN), JA=[2,1,-1,-2,-1,1], JB=[0,2,2,0,-2,-2];                  // Fransen in sechs Richtungen: jede Grenze franst aus
function klasse(P,p,V,j1,j2,ufer){var c,b=0,v,oh=-1e9,os=-1e9;
 for(c=0;c<KN;c++){v=P[p+c]+V[c]+(c===3?ufer:0);if(c!==5&&v>oh)oh=v;if(c!==3&&v>os)os=v;KV[c]=v+((JA[c]*j1+JB[c]*j2)>>1);if(KV[c]>KV[b])b=c}   // Vorsprünge ohne Fransen: Hügel und Schnee bleiben glatt
 KV[5]=P[p+5]+V[5];KV[3]=P[p+3]+V[3]+ufer;
 KL.d=KV[5]-oh;KL.s=KV[3]-os;
 if(b===5)return KL.d>M_SCHNEE?9:8;                                                                      // Schnee auf den Kuppen
 if(P[p+KN]+j1-(KL.d>-M_HUEGEL?KL.d+M_HUEGEL:0)+(KL.s>0?KL.s>>2:0)>M_TEICH)return 11;               // Teiche und Seen, nie am Hang, gern im Sumpf
 return KAN[b]}

// ── W1b Orte, Häfen, Straßen, Seewege ──
// Ortsart je Zelle (ort, untere 4 Bit): 1 Dorf, 2 Stadt, 3 Hafendorf, 4 Hafenstadt; obere 4 Bit: Ausgänge des Seewegs (Ost, Süd, West, Nord).
// Straße je Zelle (weg): Bit 0–3 Ausgänge, Bit 4–5 Klasse (1 Pfad, 2 Straße), Bit 6 Fähre über einen Binnensee.
// Netz: Kopf (Orte, Verbindungen, Landmassen, Dichte), Orte (Zelle | Art << 24), Verbindungen (Ort a, Ort b, Länge, Art: 1 Pfad, 2 Straße, +4 mit Fähre, 8 Seeweg).
// Vorschlagswerte (Thomas sieht sie in der Weltansicht): Dichte = [Blockgröße in Zellen, Anteil von 256, Hafenblock, Hafenanteil von 256]
var DICHTE=[[5,180,12,110],[3,190,8,130],[2,256,5,170]], QUER=90;                  // QUER: Anteil der Querverbindungen (von 256)
var B_STRAF=[0,0,10,40,0,5,45,30,120,255,0,0], B_WEG=[0,0,4,6,0,3,14,4,16,40,0,0];   // Biom: Abzug als Siedlungsplatz, Aufschlag als Wegstück
var JE=new Int32Array(9), JP=new Int32Array(3), EIMER=new Int32Array(256);
// Geglättete Erdhöhe an einem Punkt der Zelle (px, py in 0..1023), aus den 3 × 3 Erdhöhen in JE: dieselbe Formel wie im Kartenstück
function glattE(px,py){var a0=((ZF-px)*(ZF-px))>>6,a2=(px*px)>>6,a1=32768-a0-a2,b0=((ZF-py)*(ZF-py))>>6,b2=(py*py)>>6,b1=32768-b0-b2;
 return(b0*((a0*JE[0]+a1*JE[1]+a2*JE[2])>>15)+b1*((a0*JE[3]+a1*JE[4]+a2*JE[5])>>15)+b2*((a0*JE[6]+a1*JE[7]+a2*JE[8])>>15))>>15}
// Mittelpunkt einer Zelle für Ort und Straßenknoten: von fünf Punkten aus dem Seed der mit dem höchsten (trockensten) Grund. JE muss gefüllt sein.
function jWahl(seed,Zx,Zy){var h=mix(seed^Math.imul(Zx,0x2f0b4a71)^Math.imul(Zy,0x6c8e9cf5)),best=-1e9;
 for(var k=0;k<5;k++){var px=220+h%585;h=mix(h+k+1);var py=220+h%585;h=mix(h+0x9e37);var b=glattE(px,py);if(b>best){best=b;JP[0]=px;JP[1]=py}}
 JP[2]=best}
function jeFuell(E,x,y){var p=0;for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){var X=x+dx,Y=y+dy;JE[p++]=X<0||Y<0||X>=GE||Y>=GE?-2048:E[Y*GE+X]}}
// Lage des Orts oder Straßenknotens einer Zelle in Feldern der Welt (Weltansicht, Tests)
function ortPunkt(seed,A,zx,zy){jeFuell(A.E,zx,zy);jWahl(seed>>>0,zx,zy);var x=zx*ZF+JP[0],y=zy*ZF+JP[1];versch(seed>>>0,x,y);return[x+VS[0],y+VS[1],JP[2]]}

// Teil „Orte und Häfen“: Landmassen (Land samt Binnenseen), je Landmasse ein Pflichthafen, weitere Häfen an der Küste, Dörfer und Städte je Gegend.
function teilOrte(A,seed,dichte){var E=A.E,bio=A.bio,flu=A.flu,dir=A.dir,ort=A.ort,weg=A.weg,lm=A.lm,q=A.hp,wert=A.dst,hafen=A.bes,bestZ=A.tv,bestW=A.tc,kopf=A.kopf,orte=A.orte;
 var D=DICHTE[dichte]||DICHTE[1],i,x,y,r,j,n,k,c,L=0,nO=0,nx,ny,s,bx,by;
 for(i=0;i<N;i++){ort[i]=0;weg[i]=0;lm[i]=0;wert[i]=0;hafen[i]=0}
 for(i=0;i<N;i++){if(bio[i]<2||lm[i])continue;L++;n=0;k=0;q[n++]=i;lm[i]=L;bestW[L]=0;bestZ[L]=0;
  while(k<n){c=q[k++];x=c%GE;y=(c/GE)|0;for(r=0;r<4;r++){nx=x+DX[r];ny=y+DY[r];if(nx<0||ny<0||nx>=GE||ny>=GE)continue;j=ny*GE+nx;if(bio[j]>=2&&!lm[j]){lm[j]=L;q[n++]=j}}}}
 // Eignung je Landzelle: wert = Siedlungsplatz, hafen = Hafenplatz (ab 1000: fester Grund)
 for(i=0;i<N;i++){var b=bio[i];if(b<2||b===11)continue;x=i%GE;y=(i/GE)|0;var kueste=0,see=0,muend=0;
  for(r=0;r<4;r++){j=i+DX[r]+DY[r]*GE;if(bio[j]<2){kueste=1;if(flu[i]&&(dir[i]&7)===r)muend=1}else if(bio[j]===11)see=1}
  jeFuell(E,x,y);jWahl(seed,x,y);var bj=JP[2],h=mix(seed^Math.imul(i+1,0x9e3779b1)),fl=flu[i]>4?4:flu[i];
  s=300+(h&255)+fl*25+(kueste?50:0)+(see?20:0)+((bj<0?0:bj>400?400:bj)>>3)-B_STRAF[b]-(E[i]>>6);
  wert[i]=b===9||E[i]>5000||bj<48?0:s<1?1:s;
  if(kueste){s=300+((h>>>8)&127)+(muend?120:0)+fl*10+(((bj<-400?-400:bj>400?400:bj)+400)>>2)+(bj>=16?1000:0);hafen[i]=s;
   if(s>bestW[lm[i]]){bestW[lm[i]]=s;bestZ[lm[i]]=i}}}
 function setz(i,typ){if(nO<ORT_MAX){ort[i]=typ;orte[nO++]=(i|typ<<24)>>>0}}
 function hafenArt(i){var m=flu[i]>=3&&hafen[i]%1000>=420;return m||(mix(seed^Math.imul(i+7,0x85ebca6b))&3)===0?4:3}
 function frei(i){x=i%GE;y=(i/GE)|0;for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){var X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<GE&&Y<GE&&ort[Y*GE+X])return false}return true}
 for(k=1;k<=L;k++)if(bestW[k])setz(bestZ[k],hafenArt(bestZ[k]));                                        // Pflichthafen je Landmasse
 function bloecke(K,anteil,feld,ab,salz,art){for(by=0;by<GE;by+=K)for(bx=0;bx<GE;bx+=K){var best=-1,bw=ab;
   for(y=by;y<by+K&&y<GE;y++)for(x=bx;x<bx+K&&x<GE;x++){i=y*GE+x;if(feld[i]>=bw&&!ort[i]&&(feld[i]>bw||best<0)){bw=feld[i];best=i}}
   if(best<0||(mix(seed^salz^Math.imul(by*GE+bx+1,0x27d4eb2d))&255)>=anteil||!frei(best))continue;setz(best,art(best))}}
 bloecke(D[2],D[3],hafen,1000,0x4a7c15,hafenArt);                                                        // weitere Häfen
 bloecke(D[0],D[1],wert,1,0x2c1b3c6d,function(i){var h=mix(seed^Math.imul(i+3,0xc2b2ae35))&255,lage=(flu[i]>4?4:flu[i])*25+(hafen[i]?50:0);
  var stadt=h<16+(lage>>2);return hafen[i]>=1000?(stadt?4:3):(stadt?2:1)});                              // Dörfer und Städte; an fester Küste mit Hafen
 kopf[0]=nO;kopf[1]=0;kopf[2]=L;kopf[3]=dichte}

// Teile „Straßen“ (see = 0) und „Seewege“ (see = 1): Wegsuche von allen Orten bzw. Häfen zugleich (niedrigste Kosten zuerst). Jede Zelle gehört dem
// Ort, von dem aus sie zuerst erreicht wird, und merkt sich die Richtung zurück. Wo sich zwei Gebiete berühren, entsteht eine mögliche Verbindung
// (die billigste je Paar). Daraus zuerst das Netz, das alle verbindet (billigste zuerst), dann günstige Querverbindungen. Kosten an Land: Steigung,
// Biom, Flussquerung, Fähre über Seen und weiches Rauschen, damit die Wege sich winden; auf See: Rauschen und etwas Abstand zur Küste.
function teilNetz(A,seed,see){var E=A.E,bio=A.bio,flu=A.flu,dir=A.dir,ort=A.ort,weg=A.weg,bes=A.bes,dst=A.dst,vor=A.vor,hp=A.hp,tk=A.tk,tv=A.tv,tc=A.tc,kopf=A.kopf,orte=A.orte,kanten=A.kanten;
 var nO=kopf[0],nK=see?kopf[1]:0,n=0,i,j,x,y,r,v,c,a,b,d,k,t,nx,ny,h,sR=mix(seed^(see?0x5ea1e5:0x57a55e)),uf=dst;
 // Warteschlange nach Kosten in 256 Eimern (jeder Schritt kostet 1 bis 250): hp[zelle] = nächste Zelle im selben Eimer + 1, eimer[k] = erste Zelle + 1
 var eimer=EIMER,jetzt=0;for(i=0;i<256;i++)eimer[i]=0;
 function rein(j,t){hp[j]=eimer[t&255];eimer[t&255]=j+1;n++}
 function kandidat(a,b,kosten,zelle,r){if(a>b){var w=a;a=b;b=w;if(r<4){zelle+=DX[r]+DY[r]*GE;r^=2}}
  var key=a*16384+b+1,s=mix(key)&(TAB-1);while(tk[s]&&tk[s]!==key)s=(s+1)&(TAB-1);
  if(!tk[s]){tk[s]=key;tc[s]=kosten;tv[s]=zelle|r<<17}else if(kosten<tc[s]){tc[s]=kosten;tv[s]=zelle|r<<17}}
 for(i=0;i<N;i++)bes[i]=65535;for(i=0;i<TAB;i++)tk[i]=0;
 for(k=0;k<nO;k++){i=orte[k]&0xffffff;
  if(!see){bes[i]=k;dst[i]=0;vor[i]=4;rein(i,0);continue}
  if(orte[k]>>>24<3)continue;x=i%GE;y=(i/GE)|0;var r0=mix(seed^Math.imul(i+11,0x165667b1))&3,frei=-1,erst=-1;
  for(t=0;t<4;t++){r=(r0+t)&3;j=i+DX[r]+DY[r]*GE;if(bio[j]>=2)continue;if(erst<0)erst=r;if(bes[j]===65535){frei=r;break}}
  r=frei<0?erst:frei;j=i+DX[r]+DY[r]*GE;ort[i]|=16<<r;ort[j]|=16<<(r^2);                                 // Ausfahrt des Hafens
  if(frei<0)kandidat(k,bes[j],1,j,4);else{bes[j]=k;dst[j]=0;vor[j]=4;rein(j,0)}}
 while(n){while(!eimer[jetzt&255])jetzt++;i=eimer[jetzt&255]-1;eimer[jetzt&255]=hp[i];n--;d=dst[i];a=bes[i];x=i%GE;y=(i/GE)|0;
  for(r=0;r<4;r++){nx=x+DX[r];ny=y+DY[r];if(nx<0||ny<0||nx>=GE||ny>=GE)continue;j=ny*GE+nx;var bj=bio[j];if(see?bj>=2:bj<2)continue;
   b=bes[j];if(b===a)continue;
   if(b!==65535){kandidat(a,b,d+dst[j]+10,i,r);continue}                                                // Gebiete berühren sich: mögliche Verbindung
   if(see)c=10+((rau(sR,0,nx,ny,2)*12)>>16)+(E[j]>-100?6:0);                                             // Kosten nur einmal je Zelle (beim ersten Erreichen)
   else if(bj===11)c=70;
   else{c=Math.abs(E[j]-E[i])>>5;c=10+(c>120?120:c)+B_WEG[bj]+((rau(sR,0,nx,ny,2)*24)>>16)+(mix(sR^j)&7)+(vor[i]===(r^2)?12:0);   // geradeaus kostet extra: lieber im Zickzack als als Schneise
    if(flu[j]&&(dir[j]&7)<4&&(dir[j]&3)!==r&&(dir[j]&3)!==(r^2))c+=6*flu[j]}
   bes[j]=a;vor[j]=r^2;t=d+c;if(t>65000)t=65000;dst[j]=t;rein(j,t)}}
 // Verbindungen wählen: billigste zuerst (Länge × 65536 + Platz in der Tabelle), erst das verbindende Netz, dann Querverbindungen
 var m=0,summe=0,zahl=0;for(h=0;h<TAB;h++)if(tk[h])hp[m++]=(tc[h]>65535?65535:tc[h])*65536+h;
 var L=hp.subarray(0,m);L.sort();
 for(k=0;k<nO;k++)uf[k]=k;
 function wurzelVon(k){while(uf[k]!==k){uf[k]=uf[uf[k]];k=uf[k]}return k}
 for(k=0;k<m;k++){h=L[k]&65535;v=tk[h]-1;a=wurzelVon((v/16384)|0);b=wurzelVon(v%16384);if(a!==b){uf[a]=b;tk[h]|=0x80000000;summe+=tc[h];zahl++}}
 var grenze=zahl?((summe/zahl)|0)*2:0,platz=(see?KANTE_MAX:KANTE_MAX-ORT_MAX)-nK-zahl;
 for(k=0;k<m&&platz>0;k++){h=L[k]&65535;if(tk[h]&0x80000000||tc[h]>grenze)continue;if((mix(seed^Math.imul(tk[h],0x2545f491))&255)<QUER){tk[h]|=0x40000000;platz--}}
 // Spur legen: von der Berührungsstelle auf beiden Seiten zurück bis zum Ort; Ausgänge und Klasse je Zelle merken
 var faehre=0;
 function marke(c,r,kl){if(see)ort[c]|=16<<r;else{weg[c]|=1<<r;if(((weg[c]>>4)&3)<kl)weg[c]=(weg[c]&0xcf)|kl<<4;if(bio[c]===11){weg[c]|=64;faehre=1}}}
 function spur(c,kl){for(;;){var d=vor[c];if(d>=4)return;marke(c,d,kl);c+=DX[d]+DY[d]*GE;marke(c,d^2,kl)}}
 for(k=0;k<m;k++){h=L[k]&65535;if(!(tk[h]&0xc0000000))continue;v=(tk[h]&0x3fffffff)-1;a=(v/16384)|0;b=v%16384;c=tv[h]&0x1ffff;r=tv[h]>>>17;
  var ta=orte[a]>>>24,tb=orte[b]>>>24,kl=!see&&(tk[h]&0x80000000)&&(ta===2||ta===4||tb===2||tb===4)?2:1;faehre=0;
  if(r<4){j=c+DX[r]+DY[r]*GE;marke(c,r,kl);marke(j,r^2,kl);spur(c,kl);spur(j,kl)}
  kanten[nK*4]=a;kanten[nK*4+1]=b;kanten[nK*4+2]=tc[h]>65535?65535:tc[h];kanten[nK*4+3]=see?8:kl|(faehre?4:0);nK++}
 kopf[1]=nK}

// ── W1b im Kartenstück: Straßenlauf wie der Flusslauf (feste Querungspunkte auf den Zellkanten, Bögen zum Mittelpunkt der Zelle), dazu grob und fein
// seitlich verschoben, damit sich die Straße windet. Gezeichnet als dünne Linie (Pfad 1 Feld, Straße 2 Felder) nur dort, wo die Straße das Stück
// berührt: Stücke ohne Straße kosten nichts. Wegschicht je Feld: 1 Pfad, 2 Straße, 3 Brücke, 4 Furt, 5 Steg (flaches Wasser), 6 Ortsplatz, 7 Fähre.
var nStempel=0, pTyp=0, pX=0, pY=0, PLATZ=[0,5,9,6,10];
// Punkt, an dem eine Straße die Kante einer Zelle quert (hängt nur von der Kante ab); hält Abstand zur Flussquerung derselben Kante
function kanteW(seed,zx,zy,q){var kx=q===0?zx+1:zx,ky=q===1?zy+1:zy,h=200+mix(seed^Math.imul(kx,0x45d9f3b)^Math.imul(ky,0x2545f491)^((q&1)?0x7a3d11:0x1c9b57))%625;
 var f=256+mix(seed^Math.imul(kx,0x632be5ab)^Math.imul(ky,0x7ed55d16)^((q&1)?0x51ed27:0x2c1b3c))%513;if(Math.abs(h-f)<60)h=f<512?f+90:f-90;
 return q===0?[ZF,h]:q===2?[0,h]:q===1?[h,ZF]:[h,0]}
function stempel(x,y,kl,W){if(x>=0&&y>=0&&x<ST&&y<ST){var i=y*ST+x;if(W[i]<kl)W[i]=kl;nStempel++}}
function linie(x0,y0,x1,y1,kl,W){if((x0<-2&&x1<-2)||(y0<-2&&y1<-2)||(x0>ST+1&&x1>ST+1)||(y0>ST+1&&y1>ST+1))return;
 var dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,err=dx-dy,x=x0,y=y0;
 for(;;){stempel(x,y,kl,W);if(kl>1){stempel(x+1,y,kl,W);stempel(x,y+1,kl,W);stempel(x+1,y+1,kl,W)}
  if(x===x1&&y===y1)return;if(2*err>-dy){err-=dy;x+=sx}else{err+=dx;y+=sy}}}                           // immer nur ein Schritt in einer Achse: zusammenhängend begehbar
// Ein grobes Stück des Laufs (Weltfelder) fein unterteilen, jeden Punkt mit weichem Rauschen über Weltkoordinaten verschieben und zeichnen
// Seitliche Verschiebung eines Wegpunkts: weiches Rauschen über Weltkoordinaten in zwei Größen (weite Schlenker, kleine Krümmungen); an Zellkanten
// und Stücknähten rechnen beide Seiten denselben Wert.
var VS=new Int32Array(2), V_WEIT=30, V_NAH=8;
function versch(seed,x,y){var h=mix(seed^Math.imul(x,0x2c9277b5)^Math.imul(y,0x5bd1e995));                  // dazu ein Feld Zufall je Punkt: nie wie mit dem Lineal gezogen
 VS[0]=(((wn(seed,54,x,y,137)-32640)*V_WEIT)>>15)+(((wn(seed,56,x,y,37)-32640)*V_NAH)>>15)+h%3-1;VS[1]=(((wn(seed,55,x,y,137)-32640)*V_WEIT)>>15)+(((wn(seed,57,x,y,37)-32640)*V_NAH)>>15)+(h>>>8)%3-1}
function fein2(seed,x0,y0,x1,y1,gx0,gy0,kl,W){var dx=x1-x0,dy=y1-y0,len=Math.max(Math.abs(dx),Math.abs(dy)),m=(len+7)>>3||1,ux=0,uy=0;
 for(var k=0;k<=m;k++){var x=x0+Math.trunc(dx*k/m),y=y0+Math.trunc(dy*k/m);versch(seed,x,y);var vx=x+VS[0]-gx0,vy=y+VS[1]-gy0;
  if(k)linie(ux,uy,vx,vy,kl,W);ux=vx;uy=vy}}
// Grober Lauf eines Ausgangs: 13 Punkte in Feldern der Zelle (0..1024) von der Kantenquerung in einem Bogen zum Mittelpunkt, dazwischen seitlich versetzt
var GX=new Int32Array(13), GY=new Int32Array(13);
function grob(seed,Zx,Zy,q,jx,jy){var P=kanteW(seed,Zx,Zy,q),x0=P[0],y0=P[1],hs=mix(seed^Math.imul(Zx,0x3d4d51cb)^Math.imul(Zy,0x1f83d9ab)^Math.imul(q+1,0x9e3779b1));
 var mx=((x0+jx)>>1)+(hs%361)-180,my=((y0+jy)>>1)+((hs>>>10)%361)-180;
 mx=mx<48?48:mx>ZF-48?ZF-48:mx;my=my<48?48:my>ZF-48?ZF-48:my;GX[0]=x0;GY[0]=y0;
 for(var i=1;i<=12;i++){var a=(12-i)*(12-i),b=2*i*(12-i),c=i*i,qx=((a*x0+b*mx+c*jx)/144)|0,qy=((a*y0+b*my+c*jy)/144)|0;
  if(i<12){var t=i<12-i?i:12-i,hh=mix(hs+Math.imul(i,0x632be5ab));if(t>3)t=3;qx+=((((hh%73)-36)*t)/3)|0;qy+=(((((hh>>>8)%73)-36)*t)/3)|0;
   qx=qx<8?8:qx>ZF-8?ZF-8:qx;qy=qy<8?8:qy>ZF-8?ZF-8:qy}
  GX[i]=qx;GY[i]=qy}}
function lauf(seed,Zx,Zy,q,jx,jy,kl,cx,cy,W){var ox=Zx*ZF-cx*ST,oy=Zy*ZF-cy*ST,g=V_WEIT+V_NAH+14;grob(seed,Zx,Zy,q,jx,jy);
 for(var i=1;i<=12;i++){var ax=GX[i-1]+ox,ay=GY[i-1]+oy,bx=GX[i]+ox,by=GY[i]+oy;
  if(!((ax<-g&&bx<-g)||(ay<-g&&by<-g)||(ax>ST+g&&bx>ST+g)||(ay>ST+g&&by>ST+g)))fein2(seed,Zx*ZF+GX[i-1],Zy*ZF+GY[i-1],Zx*ZF+GX[i],Zy*ZF+GY[i],cx*ST,cy*ST,kl,W)}}
// Läufe einer Zelle für die Weltansicht (Hauptkern, nur beim Neuzeichnen der Region): je Ausgang 13 Punkte in Weltfeldern, mit der weiten Verschiebung.
// Liefert [{x:[..],y:[..],kl,see}], see = Ausfahrt eines Hafens. A = ansicht der fertigen Erde.
function wegLinien(seed,A,zx,zy){var i=zy*GE+zx,wg=A.weg[i],og=A.ort[i],ex=wg&15,typ=og&15,sea=typ>=3?(og>>4)&15:0,L=[];seed=seed>>>0;if(!ex&&!sea)return L;
 jeFuell(A.E,zx,zy);jWahl(seed,zx,zy);var jx=JP[0],jy=JP[1];
 for(var q=0;q<4;q++){if(!((ex|sea)>>q&1))continue;grob(seed,zx,zy,q,jx,jy);var X=[],Y=[];
  for(var k=0;k<=12;k++){var x=zx*ZF+GX[k],y=zy*ZF+GY[k];versch(seed,x,y);X.push(x+VS[0]);Y.push(y+VS[1])}
  L.push({x:X,y:Y,kl:ex>>q&1?(wg>>4)&3||1:typ===4?2:1,see:!(ex>>q&1),faehre:!!(wg&64)})}
 return L}
// Straßen und Ort einer Zelle (dx, dy relativ zur Zelle des Stücks), soweit sie das Stück berühren
function wegZelle(X,seed,zx,zy,dx,dy,cx,cy,W){var wg=X6(X,dx,dy,6),og=X6(X,dx,dy,7),ex=wg&15,typ=og&15,sea=typ>=3?(og>>4)&15:0,p=0,q;
 if(!ex&&!typ)return;
 for(var ey=-1;ey<=1;ey++)for(var ex2=-1;ex2<=1;ex2++)JE[p++]=X6(X,dx+ex2,dy+ey,0);
 var Zx=zx+dx,Zy=zy+dy;jWahl(seed,Zx,Zy);var jx=JP[0],jy=JP[1],kl=(wg>>4)&3||1;
 for(q=0;q<4;q++){if(ex>>q&1)lauf(seed,Zx,Zy,q,jx,jy,kl,cx,cy,W);else if(sea>>q&1)lauf(seed,Zx,Zy,q,jx,jy,typ===4?2:1,cx,cy,W)}
 if(!dx&&!dy&&typ){var R=PLATZ[typ]+4;versch(seed,Zx*ZF+jx,Zy*ZF+jy);pX=Zx*ZF+jx-cx*ST+VS[0];pY=Zy*ZF+jy-cy*ST+VS[1];
  if(pX>=-R&&pY>=-R&&pX<ST+R&&pY<ST+R)pTyp=typ}}
// Art je Wegfeld nach dem Untergrund (Fluss: Brücke oder Furt, flaches Wasser: Steg, tiefes: Fähre); Ortsplatz: fester Grund, auch am Ufer
function wegFertig(X,H,B,W){var i,x,y,fk=0,b,h;
 for(i=0;i<5;i++){b=i===0?X6(X,0,0,4):X6(X,DX[i-1],DY[i-1],4);if(b>fk)fk=b}
 if(nStempel)for(i=0;i<FELDER;i++){if(!W[i])continue;b=B[i];if(b===10)W[i]=fk>=2?3:4;else if(b===11||b<2)W[i]=H[i]-MEER>=-32?5:7}
 if(!pTyp)return;var R=PLATZ[pTyp],G=R+4,y0=pY-G<0?0:pY-G,y1=pY+G>ST-1?ST-1:pY+G,x0=pX-G<0?0:pX-G,x1=pX+G>ST-1?ST-1:pX+G;
 for(y=y0;y<=y1;y++)for(x=x0;x<=x1;x++){var d2=(x-pX)*(x-pX)+(y-pY)*(y-pY);if(d2>G*G)continue;var d=wurzel[d2],t=d<=R?32:32-(d-R)*8;i=y*ST+x;b=B[i];h=H[i]-MEER;
  if(b===10){if(d<=R)W[i]=fk>=2?3:4;continue}
  if(b<2||b===11){if(d>R&&h>=t)continue;B[i]=2;if(W[i]===5||W[i]===7)W[i]=1}
  if(h<t)H[i]=MEER+t;if(d<=R)W[i]=6}}

function rechnen(a){return a.art==='erde'?erdTeil(a):gelaende(a)}
// Ein Kartenstück in einem Stück (Tests und Werkzeuge): A = ansicht(erde(seed).buffer)
function stueck(seed,A,cx,cy,daten){   // A muss ort und weg tragen (ansicht der fertigen Erde)
 daten=daten||new Uint8Array(GEL_BYTES);ausschnitt(A,cx,cy,daten);return gelaende({seed:seed,cx:cx,cy:cy,daten:daten})}

var WG={ORT_MAX:ORT_MAX,KANTE_MAX:KANTE_MAX,NETZ_MAX:NETZ_MAX,ERD_ZELLEN:ERD_ZELLEN,ORT_ART:ORT_ART,WEG_ART:WEG_ART,fest:fest,kanteW:kanteW,ortPunkt:ortPunkt,wegLinien:wegLinien,ST:ST,FELDER:FELDER,SEITE:SEITE,GE:GE,N:N,ZP:ZP,ZF:ZF,MEER:MEER,ST_BYTES:ST_BYTES,GEL_BYTES:GEL_BYTES,ERD_FEST:ERD_FEST,ERD_BYTES:ERD_BYTES,BAND:BAND,TEILE:TEILE,
 TEIL_NAME:TEIL_NAME,BIOM:BIOM,DX:DX,DY:DY,HW:HW,mix:mix,ansicht:ansicht,erdTeil:erdTeil,erde:erde,ausschnitt:ausschnitt,gelaende:gelaende,stueck:stueck,rechnen:rechnen,kante:kante,biomVon:biomVon,herrscht:herrscht,anteile:anteile,punkt:punkt,neigung:neigung,klasse:klasse,KAN:KAN};
if(typeof module!=='undefined'&&module.exports)module.exports=WG;else root.AT3WG=WG;
})(typeof self!=='undefined'?self:this);
