// WAS DIE DATEI TUT: FP1 First Person im Spiel: schneidet aus den Kartenstücken der echten Welt einen Ausschnitt von 96 × 96 Feldern im Format von fpwelt.js
// (Höhenkarte mit 4 Punkten je Feld, Biom-Code, Grundfarbe wie auf der Karte, Sperren, Naturobjekte). Reine Rechnung ohne Bildschirm.
// Höhe: Eckhöhe der Kartenstücke (1/16 Feld, Meeresspiegel 2048) → Felder, Meeresspiegel = WL von fpwelt.js; zwischen den Ecken weich (bilinear).
// Farben wie die Karte (bodenbild.js BFARBE/WFARBE) mit Licht und Muster wie fpwelt.js, fertig gerechnet (w.farbe). Natur genau wie auf der Karte (natur.js: Art, Versatz im Feld).
// Wasser sperrt (Meer, Fluss, See, Fähre), Brücken und Stege tragen, Furten sind begehbar. Objekte mit Kollision „gesperrt“ (Kartei: karte.feld 'x') sperren ihr Feld.
// Kerne: läuft im Bildkern (bildkern.js, Hintergrundkern), nie auf dem Hauptkern (Regel 13). Kosten je Ausschnitt fest (96² Felder), unabhängig von Ort und Weltgröße (Regel 14).
// W1c: Felder in x laufen über die Naht, in y wird der Ausschnitt vor dem Pol gehalten.
(function(root){
'use strict';
var N=96,U=4,M=N*U+1,WL=0.8,MEER=2048;
function UFm(){if(root.AT3UFER)return root.AT3UFER;try{if(typeof module!=='undefined'&&module.exports)return require('./ufer.js');if(typeof importScripts==='function'){importScripts('ufer.js'+((root.location&&root.location.search)||''));return root.AT3UFER||null}}catch(e){}return null}   // N7a5a0
// fpwelt-Codes: 0 Wasser, 1 Sand, 2 Gras, 3 Wald, 4 Fels, 5 Schnee, 6 Weg, 7 Steg/Brücke, 8 Platz (Hof)
var VON_BIOM=[0,0,1,1,2,3,2,2,4,5,0,0,5,2,1,2,3,2];  // weltgen-Biome 0..17 → Code (Wüste wie Sand, Steppe/Sumpf/Tundra wie Gras fürs Muster; N2c: Savanne wie Sand, Regenwald wie Wald, übrige wie Gras)
var VON_WEG=[-1,6,6,7,1,7,8,0];                    // Wegschicht 1..7: Pfad, Straße, Brücke, Furt (begehbar, sieht nass aus), Steg, Ortsplatz, Fähre (Wasser)

// PF: {he, du} Farbtabellen des Bildkerns (eine Stufe heller/dunkler). hole(cx,cy) → Kartenstück (Uint8Array) oder null. ox,oy: linke obere Ecke auf der Welt (ox darf beliebig sein, läuft um). sperr: Uint8Array je Naturart (1 = sperrt).
// FP2a: BA = {hole(cx,cy) → Bau-Kartenstück (gepackt wie bau.stueck) oder null, BODEN, PUNKT} oder null: Wände, Türen, Tore auf die Kanten, Gebäudeböden in die Farben.
// FP2b: BA.DACHF = [Ziegel, Fuge] (Palettennummern aus dem Startset dach-ziegel): Walmdach über fertigen Feldern mit Dach (w.innen, w.dachR, w.dachC).
var BF=4096,Z_PLAN=1;
function bauen(BB,NAT,hole,seed,ox,oy,sperr,PF,frei,BA,AN,OK){   // N7b3: OK = Orte als Kulisse (kulisse unten) oder null                // G5b: frei(X,Y) = false auf Gebautem/Gerodetem (keine Natur)
var WX=BB.WX,WY=BB.WY,F=N+2,t0=Date.now();
 oy=Math.max(0,Math.min(WY-F,oy|0));ox=((ox|0)%WX+WX)%WX;
 var RH=new Uint16Array(F*F),RB=new Uint8Array(F*F),EH=new Float32Array(F*F),EB=new Uint8Array(F*F),EW=new Uint8Array(F*F),ES=new Uint8Array(F*F),fehlt=0;
 for(var j=0;j<F;j++)for(var i=0;i<F;i++){var X=(ox+i)%WX,Y=oy+j,p=hole(X>>6,Y>>6),e=j*F+i;
  if(!p){fehlt++;EH[e]=WL;RH[e]=MEER;RB[e]=5;continue}var s=BB.sicht(p),q=((Y&63)<<6)|(X&63);RH[e]=s.H[q];RB[e]=s.B[q];EH[e]=(s.H[q]-MEER)/16+WL;EB[e]=s.B[q];EW[e]=s.W[q];ES[e]=BB.stufe(s.H[q])}
 var UF=UFm();if(UF&&UF.an())for(j=1;j<F;j++)for(i=1;i<F;i++){e=j*F+i;var hu=UF.eckRaster(RH,RB,F,e);if(hu!==RH[e]){EH[e]=(hu-MEER)/16+WL;ES[e]=BB.stufe(hu)}}   // N7a5a0: Wasser waagrecht wie im Bodenbild (ufer.js)
 var h=new Float32Array(M*M),biom=new Uint8Array(M*M),basis=new Uint8Array(M*M),BF=BB.BFARBE,WF=BB.WFARBE;
 for(j=0;j<M;j++){var fy=j/U,jy=fy|0,b=fy-jy;if(jy>N-1&&j===M-1){jy=N-1;b=1}
  for(i=0;i<M;i++){var fx=i/U,ix=fx|0,a=fx-ix;if(ix>N-1){ix=N-1;a=1}var k=j*M+i,e0=jy*F+ix;
   h[k]=EH[e0]+(EH[e0+1]-EH[e0])*a+(EH[e0+F]-EH[e0])*b+(EH[e0]-EH[e0+1]-EH[e0+F]+EH[e0+F+1])*a*b;
   var fe=Math.min(N-1,Math.floor(fy))*F+Math.min(N-1,Math.floor(fx)),bb=EB[fe],wv=EW[fe],c=BF[bb]!=null?BF[bb]:BF[9],code=VON_BIOM[bb]!=null?VON_BIOM[bb]:5;
   if(wv===7){code=0;if(((ox+(fe%F))+(oy+((fe/F)|0)))&1)c=WF[7]}else if(wv){code=VON_WEG[wv];c=wv===4?BF[10]:WF[wv]}
   biom[k]=code;basis[k]=c}}
 // Farben je Höhenpunkt wie fpwelt.farben mit Muster: Licht von Nordwesten (Hang), leichte Streuung; he/du = eine Stufe heller/dunkler in der Palettenreihe.
 // Hier im Bildkern gerechnet, damit der Hauptkern beim Nachladen nichts rechnen muss (Regel 13).
 var wandX=new Uint8Array((N+1)*N),wandY=new Uint8Array(N*(N+1)),sperre=new Uint8Array(N*N),ku=OK?kulisse(OK,ox,oy,WX,h,biom,basis,wandX,wandY,sperre):null;   // N7b3: vor dem Licht, damit Mauern Schatten bekommen
 var farbe=new Uint8Array(M*M),he=PF.he,du=PF.du,z=12345;
 for(j=0;j<M;j++)for(i=0;i<M;i++){var k2=j*M+i,c2=basis[k2],b2=biom[k2],sh=0;
  if(b2!==0){var l=((i>0?h[k2-1]:h[k2])-(i<M-1?h[k2+1]:h[k2])+(j>0?h[k2-M]:h[k2])-(j<M-1?h[k2+M]:h[k2]))*U*.6;sh=Math.max(-2,Math.min(2,Math.round(l)))}
  z=(z*1103515245+12345)&0x7fffffff;var q2=z%7;if(b2===0)sh+=((i+j*3)%11===0)?1:0;else if(b2===7)sh+=(j%2)?-1:0;else sh+=q2<1?-1:q2>5&&(b2===2||b2===3)?1:0;
  while(sh>0){c2=he[c2];sh--}while(sh<0){c2=du[c2];sh++}farbe[k2]=c2}
 // Natur wie auf der Karte: Art je Feld, Versatz im Feld (Bildpunkte der Karte → Felder), Sperren nach Kollision der Kartei
 var ox2=[],oy2=[],oa=[];
 for(j=0;j<N;j++)for(i=0;i<N;i++){var e1=j*F+i,X2=(ox+i)%WX,Y2=oy+j,mn=Math.min(ES[e1],ES[e1+1],ES[e1+F],ES[e1+F+1]),mx=Math.max(ES[e1],ES[e1+1],ES[e1+F],ES[e1+F+1]);
  var t=NAT.art(seed,X2,Y2,EB[e1],EW[e1],mx-mn);if(t<0||(frei&&!frei(X2,Y2)))continue;var v=NAT.versatz(seed,X2,Y2),du=(v[0]/32+v[1]/16)/2,dv=(v[1]/16-v[0]/32)/2;
  ox2.push(i+.5+du);oy2.push(j+.5+dv);oa.push(t);if(sperr&&sperr[t])sperre[j*N+i]=1}
 var n=oa.length,kanten=(ku?ku.kanten:0)+(BA?gebaeude(BA,ox,oy,WX,WY,wandX,wandY,farbe,PF):0),dach=BA||ku?walm(BA,ox,oy,WX,WY,farbe,PF,ku&&ku.dach):null;
 var anl=AN?anlage(AN,BB,hole,ox,oy,WX,h,farbe):null;
 return{format:'at3-fpwelt',ausschnitt:true,anl:anl,N:N,U:U,M:M,WL:WL,WANDH:1,ox:ox,oy:oy,h:h,biom:biom,farbe:farbe,kanten:kanten,
  wandX:wandX,wandY:wandY,sperre:sperre,innen:dach&&dach.innen,dachR:dach&&dach.R,dachC:dach&&dach.C,dachN:dach?dach.n:0,objX:new Float32Array(ox2),objY:new Float32Array(oy2),objArt:new Uint8Array(oa),objN:n,fehlt:fehlt,kulisse:ku?ku.orte:0,ms:Date.now()-t0}}
// FP2a: Gebautes aus dem Bau-Kartenstück (bau.js, eine Wahrheit) in den Ausschnitt. Kante: Typ und Bauzustand (ohne Herkunft) wie fpwelt.js sie liest.
// Nordkante eines Felds → wandY, Westkante → wandX; die Ost- und Südkante des Ausschnitts kommt vom Feld dahinter (eine Spalte/Zeile mehr gelesen).
// Geplante Kanten: Punktlinie am Boden. Boden der Gebäudefelder wie auf der Karte (Lager Sand, Werkstatt Erde, Unterkunft Holz), geplant als Punktmuster,
// mit Fugen am Feldrand (Holz zusätzlich Dielen). Kosten fest: (N+1)² Felder, nur Lesen wo gebaut ist.
function gebaeude(BA,ox,oy,WX,WY,wandX,wandY,farbe,PF){var n=0,BOD=BA.BODEN,PK=BA.PUNKT,du=PF.du;
 for(var j=0;j<=N;j++){var Y=oy+j;if(Y>=WY)break;
  for(var i=0;i<=N;i++){var X=(ox+i)%WX,a=BA.hole(X>>6,Y>>6);if(!a)continue;var q=((Y&63)<<6)|(X&63),kn=a[BF+q]&0x33,kw=a[2*BF+q]&0x33,art=a[q],k,t;
   if(i<N&&(kn&3)){wandY[i+j*N]=kn;n++;if(((kn>>4)&3)===Z_PLAN)for(k=0;k<=U;k+=2)farbe[j*U*M+i*U+k]=PK}
   if(j<N&&(kw&3)){wandX[i+j*(N+1)]=kw;n++;if(((kw>>4)&3)===Z_PLAN)for(k=0;k<=U;k+=2)farbe[(j*U+k)*M+i*U]=PK}
   if(i<N&&j<N&&art){var c=BOD[art],plan=((a[3*BF+q]>>4)&3)===Z_PLAN;
    for(var jj=0;jj<=U;jj++)for(var ii=0;ii<=U;ii++){var p=(j*U+jj)*M+i*U+ii;
     if(plan){if(ii&jj&1)farbe[p]=PK;continue}
     t=ii===0||jj===0||(art===3&&(jj&1)===0&&jj<U)?du[c]:c;farbe[p]=t}}}}
 return n}
// FP2b: Walmdach (Entscheidung Thomas 16.11.2026) über allen fertigen Feldern mit Dach (wie die Karte: Dach erst, wenn das Feld fertig ist; Hof = Dach offen bleibt frei).
// Höhe über der Traufe = Anstieg je Feld × Abstand zum Rand der Dachfläche (Schachbrett-Abstand, so entstehen Grate und Kehlen bei L-, U-Formen und um Höfe von selbst),
// höchstens DMAX, darüber flach. Gerechnet auf dem Höhenpunkt-Raster (4 je Feld) mit RAND Feldern Rand, damit Häuser am Ausschnittrand richtig enden.
// Innen (w.innen je Feld = 1): Boden eine Stufe dunkler. w.dachR je Höhenpunkt: Höhe über der Traufe in 1/32 Geschoss; w.dachC: Ziegelfarbe mit Licht von Nordwesten.
// Kosten: nur wo Bau-Kartenstücke liegen, Abstandsrechnung nur im Rechteck um die Dachfelder. Ohne Dach: nichts (null).
var SL=.5,DMAX=1.5,RAND=3;                          // Vorschlagswerte: 0,5 Geschoss Anstieg je Feld, First höchstens 1,5 Geschosse über der Traufe
function walm(BA,ox,oy,WX,WY,farbe,PF,OD){var NE=N+2*RAND,mk=new Uint8Array(NE*NE),col=OD?new Uint8Array(NE*NE).fill(255):null,n=0,i0=NE,i1=-1,j0=NE,j1=-1,i,j;   // N7b3: OD(X, Y) → Dachfarbe eines Ortshauses oder −1
 for(j=0;j<NE;j++){var Y=oy+j-RAND;if(Y<0||Y>=WY)continue;
  for(i=0;i<NE;i++){var X=((ox+i-RAND)%WX+WX)%WX,a=BA?BA.hole(X>>6,Y>>6):null,ja=false;if(a){var q=((Y&63)<<6)|(X&63),fl=a[3*BF+q];ja=!!(a[q]&&(fl&1)&&((fl>>4)&3)===3)}
   if(!ja&&OD){var oc=OD(X,Y);if(oc>=0){col[j*NE+i]=oc;ja=true}}
   if(ja){mk[j*NE+i]=1;n++;if(i<i0)i0=i;if(i>i1)i1=i;if(j<j0)j0=j;if(j>j1)j1=j}}}
 if(!n)return null;
 var innen=new Uint8Array(N*N),R=new Uint8Array(M*M),C=new Uint8Array(M*M),du=PF.du,he=PF.he,DF=BA&&BA.DACHF||[du[du[46]],du[du[du[46]]]],ni=0;
 for(j=0;j<N;j++)for(i=0;i<N;i++)if(mk[(j+RAND)*NE+i+RAND]){innen[j*N+i]=1;ni++}
 if(!ni)return null;
 // Innenboden eine Stufe dunkler (Licht kommt nur durch Tür und Tor); Punkt dunkel, wenn alle angrenzenden Felder innen sind
 for(j=0;j<M;j++)for(i=0;i<M;i++){var f0=i%U?(i/U)|0:i/U-1,f1=Math.min(N-1,(i/U)|0),g0=j%U?(j/U)|0:j/U-1,g1=Math.min(N-1,(j/U)|0);if(f0<0)f0=0;if(g0<0)g0=0;
  if(innen[g0*N+f0]&innen[g0*N+f1]&innen[g1*N+f0]&innen[g1*N+f1]){var p=j*M+i;farbe[p]=du[farbe[p]]}}
 // Abstand zum Rand der Dachfläche im Rechteck um die Dachfelder (Punkte ±1 Feld), Punkt „innen“ = alle angrenzenden Felder haben Dach
 var a0=Math.max(0,i0-1)*U,b0=Math.max(0,j0-1)*U,PW=(Math.min(NE,i1+2)*U)-a0+1,PH=(Math.min(NE,j1+2)*U)-b0+1,d=new Uint16Array(PW*PH),GR=60000,x,y;
 function fe(pi,pj){var fx0=pi%U?(pi/U)|0:pi/U-1,fx1=(pi/U)|0,fy0=pj%U?(pj/U)|0:pj/U-1,fy1=(pj/U)|0;
  if(fx0<0||fy0<0||fx1>=NE||fy1>=NE)return 0;return mk[fy0*NE+fx0]&mk[fy0*NE+fx1]&mk[fy1*NE+fx0]&mk[fy1*NE+fx1]}
 for(y=0;y<PH;y++)for(x=0;x<PW;x++)d[y*PW+x]=fe(a0+x,b0+y)?GR:0;
 for(y=0;y<PH;y++)for(x=0;x<PW;x++){var k=y*PW+x,v=d[k];if(!v)continue;if(x>0)v=Math.min(v,d[k-1]+1);if(y>0){v=Math.min(v,d[k-PW]+1);if(x>0)v=Math.min(v,d[k-PW-1]+1);if(x<PW-1)v=Math.min(v,d[k-PW+1]+1)}d[k]=v}
 for(y=PH-1;y>=0;y--)for(x=PW-1;x>=0;x--){k=y*PW+x;v=d[k];if(!v)continue;if(x<PW-1)v=Math.min(v,d[k+1]+1);if(y<PH-1){v=Math.min(v,d[k+PW]+1);if(x<PW-1)v=Math.min(v,d[k+PW+1]+1);if(x>0)v=Math.min(v,d[k+PW-1]+1)}d[k]=v}
 var off=RAND*U,TOP=Math.round(DMAX*U/SL);
 function dv(px,py){px-=a0;py-=b0;if(px<0)px=0;if(py<0)py=0;if(px>=PW)px=PW-1;if(py>=PH)py=PH-1;return Math.min(TOP,d[py*PW+px])}
 for(j=0;j<M;j++){var pj=j+off;if(pj<b0-U||pj>=b0+PH+U)continue;
  for(i=0;i<M;i++){var pi=i+off;if(pi<a0-U||pi>=a0+PW+U)continue;var e=dv(pi,pj);R[j*M+i]=Math.round(e*SL/U*32);
   var l=(dv(pi+1,pj)-dv(pi-1,pj))+(dv(pi,pj+1)-dv(pi,pj-1)),c=DF[0];if(col){var cv=col[Math.min(NE-1,(pi/U)|0)+Math.min(NE-1,(pj/U)|0)*NE];if(cv!==255)c=cv}   // steigt nach Südosten = Fläche schaut nach Nordwesten = heller
   C[j*M+i]=l>0?he[c]:l<0?du[c]:c}}
 return{innen:innen,R:R,C:C,n:ni}}
// N7b3 Stadt als Kulisse in First Person (Thomas 27.11.2026, ohne Rückfragen nach Empfehlung). Die Pläne der Orte und Außenposten, die der Bildkern für die
// Karte ohnehin hält (ortsflaeche.js, vom Ortskern), kommen in den Ausschnitt: Boden je Planfeld in der Farbe der Karte (Gasse, Platz, Feld, Kai, Wasser …),
// Häuser mit Wand ringsum, Tür an der Türkante und Walmdach wie FP2a/FP2b (innen begehbar wie in der Wegsuche, ortssperre.js), Mauerring, Türme und Treppen
// (P.wehr) als Stein im Höhenfeld (Gang je Stufe ½ Geschoss wie im Stadtbild: HSTUFE 16 Bildpunkte, Geschoss 32), Tore offen, Wasser und Fels des Plans
// sperren. Mauerstücke ohne Wehr (rolle 'mauer') 1¼ Geschoss. Park gewinnt (ortsflaeche.js bei). Je Ort einmal ein Auszug (o.FPK, W² Byte × 4, Großstadt 204² ≈ 166 KB);
// je Ausschnitt fest 96² Felder, unabhängig von Ortszahl und Weltgröße (Regel 14). OK = {bei(X, Y) → {o, i, j} | null, F: Farben (ortsflaeche.js fpFarben)}.
var OCODE='gsomfwepxqyuh',O_BIOM=[2,6,8,8,2,0,2,2,4,6,7,1,6],K_WAND=0x31,K_TUER=0x32,TURM_H=2;   // Codes wie ortsflaeche.js CODES; fpwelt-Codes siehe oben
function fpk(o){if(o.FPK)return o.FPK;var W=o.W,P=o.P,WW=W*W,dach=new Uint8Array(WW),kan=new Uint8Array(WW),hoch=new Uint8Array(WW),zu=new Uint8Array(WW),k,x,y,n;
 for(k=0;k<WW;k++){var z=o.Z[k];if(z===5||z===8)zu[k]=1}                      // Wasser, Fels des Plans (255 = hier malt die Welt)
 (P.bauten||[]).forEach(function(b){if(!(b.w>0&&b.h>0))return;var bi=b.rund?b.i-1:b.i,bj=b.rund?b.j-1:b.j,bw=b.w|0,bh=b.h|0,tu=b.tuer,mau=b.rolle==='mauer';
  for(y=bj;y<bj+bh;y++)for(x=bi;x<bi+bw;x++){if(x<0||y<0||x>=W||y>=W)continue;k=y*W+x;
   if(mau){hoch[k]=5;zu[k]=1;dach[k]=0;kan[k]=0;continue}
   dach[k]=1;zu[k]=0;var r=0;if(y===bj)r|=1;if(x===bi)r|=2;if(y===bj+bh-1)r|=4;if(x===bi+bw-1)r|=8;kan[k]|=r}   // Seiten: 1 Nord, 2 West, 4 Süd, 8 Ost
  if(tu&&!mau&&tu[0]>=0&&tu[1]>=0&&tu[0]<W&&tu[1]<W){k=tu[1]*W+tu[0];if(dach[k]){var s=tu[3]<0?0:tu[2]<0?1:tu[3]>0?2:3;kan[k]|=16<<s}}});   // Tür wie ortssperre.js seiteVon
 var Wh=P.wehr;if(Wh&&Wh.k)for(n=0;n<Wh.k.length;n++){k=Wh.k[n];var a=Wh.f.charAt(n*4),g=Wh.f.charCodeAt(n*4+1)-48;if(a==='.')continue;dach[k]=0;kan[k]=0;
  if(a==='t'||a==='n'||a==='d'||a==='q'){hoch[k]=0;zu[k]=0;continue}            // Tor und Nische: Boden, frei
  var st=a==='T'?g+TURM_H:g;hoch[k]=Math.max(2,Math.min(60,st*2));zu[k]=1}      // hoch in ¼ Geschoss: Stufe = ½ Geschoss
 return o.FPK={dach:dach,kan:kan,hoch:hoch,zu:zu}}
function kulisse(OK,ox,oy,WX,h,biom,basis,wandX,wandY,sperre){var FB=OK.F,NN=N*N,fo=new Int32Array(NN).fill(-1),fq=new Int32Array(NN),L=[],RF=new Uint8Array(NN),nk=0,i,j,e,t;
 for(j=0;j<N;j++)for(i=0;i<N;i++){var b=OK.bei((ox+i)%WX,oy+j);if(!b)continue;t=L.indexOf(b.o);if(t<0){t=L.length;L.push(b.o);fpk(b.o)}e=j*N+i;fo[e]=t;fq[e]=b.j*b.o.W+b.i}
 if(!L.length)return null;
 function setz(a,k,v){if(a[k]!==K_TUER)a[k]=v;nk++}
 for(e=0;e<NN;e++){t=fo[e];if(t<0)continue;var K=L[t].FPK,q=fq[e],kb=K.kan[q];i=e%N;j=(e-i)/N;if(K.zu[q])sperre[e]=1;RF[e]=K.hoch[q];
  if(kb){var d=kb>>4;if(kb&1)setz(wandY,i+j*N,d&1?K_TUER:K_WAND);if(kb&2)setz(wandX,i+j*(N+1),d&2?K_TUER:K_WAND);
   if(kb&4)setz(wandY,i+(j+1)*N,d&4?K_TUER:K_WAND);if(kb&8)setz(wandX,i+1+j*(N+1),d&8?K_TUER:K_WAND)}}
 // Boden und Stein je Höhenpunkt: Feld wie in bauen(); Höhe = kleinste Mauerhöhe der angrenzenden Felder (Mauer steigt in ¼ Feld an), Seiten in Mauerfarbe, Krone heller
 for(j=0;j<M;j++)for(i=0;i<M;i++){var k2=j*M+i,fx=Math.min(N-1,(i/U)|0),fy=Math.min(N-1,(j/U)|0),fe=fy*N+fx;t=fo[fe];
  if(t>=0){var o=L[t],q2=fq[fe],z=o.Z[q2];if(z!==255&&!(o.WB&&o.WB[q2])&&z<O_BIOM.length){biom[k2]=O_BIOM[z];basis[k2]=FB.boden[z]}}
  var f0=i%U?(i/U)|0:i/U-1,f1=Math.min(N-1,(i/U)|0),g0=j%U?(j/U)|0:j/U-1,g1=Math.min(N-1,(j/U)|0),mn=255,mx=0;if(f0<0)f0=f1;if(g0<0)g0=g1;
  var r0=RF[g0*N+f0],r1=RF[g0*N+f1],r2=RF[g1*N+f0],r3=RF[g1*N+f1];mn=Math.min(r0,r1,r2,r3);mx=Math.max(r0,r1,r2,r3);
  if(mx){basis[k2]=mn?FB.dachM:FB.mauer;biom[k2]=4;if(mn)h[k2]+=mn/4}}
 return{kanten:nk,orte:L.length,dach:function(X,Y){var b=OK.bei(X,Y);if(!b)return -1;var K=fpk(b.o);return K.dach[b.j*b.o.W+b.i]?FB.dach:-1}}}
// AR1c2: große Anlage (Arena) in First Person. AN = {d: Höhenfeld aus daten/arena-fp.json (entpackt), x, y (linke obere Ecke), w, h, haus: [[x,y], …]}.
// Der Bauplan liegt vorgezeichnet vor (tools/at3-ar1-zeichnen.cjs, 4 Punkte je Feld wie hier); er wird auf die Bodenhöhe der Anlagenmitte gesetzt.
// Je Häuschen ein Aufgang: 1 Feld breit auf der Linie Mitte → Häuschen, vom Boden am Außenrand bis auf die Höhe des Umgangs (Steigung unter der Grenze
// fürs Laufen), Holzstufen; der Aufgang beginnt auf dem echten Boden am Außenrand. Der Zeichner bekommt Wandseiten und Lage (w.anl). Kosten fest: n² Punkte (69²), nur wenn die Anlage im Ausschnitt liegt.
var AUF=1.3;
function anlage(AN,BB,hole,ox,oy,WX,h,farbe){var D=AN.d,n=D.n,mi=D.mitte,LA=D.auf||AUF;      // AR4: Länge des Aufgangs je Anlage (Great Amphitheatre 4 Felder bis auf die Galerie)
 var dxA=((AN.x-ox)%WX+WX)%WX;if(dxA>WX/2)dxA-=WX;var i0=dxA*U+(U*AN.w/2-mi),j0=(AN.y-oy)*U+(U*AN.h/2-mi);
 if(i0+n<=0||j0+n<=0||i0>=M||j0>=M)return null;
 var X=(AN.x+(AN.w>>1))%WX,Y=AN.y+(AN.h>>1),p=hole(X>>6,Y>>6);if(!p)return null;var sc=BB.sicht(p),base=(sc.H[((Y&63)<<6)|(X&63)]-MEER)/16+WL;
 var dh=Uint8Array.from(D.h),fi=Uint16Array.from(D.fi),ca=null,auf=null,i,j,q,k;
 var hm=(AN.haus||[]).map(function(e){var vx=e[0]-AN.x+.5-AN.w/2,vy=e[1]-AN.y+.5-AN.h/2,l=Math.hypot(vx,vy)||1;return[vx/l,vy/l]});
 if(hm.length){ca=new Uint8Array(n*n).fill(255);auf=new Uint8Array(n*n);
  for(j=0;j<n;j++)for(i=0;i<n;i++){q=j*n+i;if(dh[q]===255)continue;var wx=(i-mi)/U,wy=(j-mi)/U;
   for(k=0;k<hm.length;k++){var al=wx*hm[k][0]+wy*hm[k][1],qu=Math.abs(wx*hm[k][1]-wy*hm[k][0]);if(qu>.5||al<D.raus-LA)continue;
    var tq=Math.max(0,Math.min(1,(D.raus-al)/LA));dh[q]=Math.round(tq*D.umgang);auf[q]=Math.round(tq*250)+1;fi[q]=0;ca[q]=D.treppe[Math.floor(al*U)&1];break}}}
 for(j=0;j<n;j++){var gj=j0+j;if(gj<0||gj>=M)continue;
  for(i=0;i<n;i++){var gi=i0+i;q=j*n+i;if(gi<0||gi>=M||dh[q]===255)continue;var g=gj*M+gi;h[g]=auf&&auf[q]?h[g]+(base+D.umgang/32-h[g])*(auf[q]-1)/250:base+dh[q]/32;farbe[g]=ca&&ca[q]!==255?ca[q]:D.c[q]}}
 return{i0:i0,j0:j0,n:n,h:dh,fi:fi,tab:D.tab,nb:D.baender,bpg:32/D.band,base:base}}
// AR1c2: daten/arena-fp.json entpacken (Base64 → Felder), einmal je Kern
function entpacken(J){function b(s){var t=typeof atob==='function'?atob(s):Buffer.from(s,'base64').toString('binary'),u=new Uint8Array(t.length);for(var i=0;i<t.length;i++)u[i]=t.charCodeAt(i);return u}
 var fi=b(J.fi);return{n:J.n,mitte:J.mitte,baender:J.baender,band:J.band,raus:J.raus,umgang:J.umgang,auf:J.auf||0,treppe:J.treppe,h:b(J.h),c:b(J.c),fi:new Uint16Array(fi.buffer,0,fi.length>>1),tab:b(J.tab)}}
// Felder (Puffer), die beim Verschicken ohne Kopie übergeben werden
function puffer(w){var L=[w.h.buffer,w.biom.buffer,w.farbe.buffer,w.wandX.buffer,w.wandY.buffer,w.sperre.buffer,w.objX.buffer,w.objY.buffer,w.objArt.buffer];
 if(w.innen)L.push(w.innen.buffer,w.dachR.buffer,w.dachC.buffer);if(w.anl)L.push(w.anl.h.buffer,w.anl.fi.buffer);return L}
// Kartenstücke, die ein Ausschnitt braucht (für den Bildkern: vorher rechnen)
function stuecke(BB,ox,oy){var WX=BB.WX,WY=BB.WY,F=N+2,L=[],x0,y0;oy=Math.max(0,Math.min(WY-F,oy|0));ox=((ox|0)%WX+WX)%WX;
 for(y0=oy>>6;y0<=(oy+F-1)>>6;y0++)for(x0=ox>>6;x0<=(ox+F-1)>>6;x0++)L.push([x0%BB.SX,y0]);return L}

var FA={kulisse:kulisse,fpk:fpk,anlage:anlage,entpacken:entpacken,N:N,U:U,M:M,WL:WL,SL:SL,DMAX:DMAX,bauen:bauen,walm:walm,puffer:puffer,stuecke:stuecke,VON_BIOM:VON_BIOM,VON_WEG:VON_WEG};
if(typeof module!=='undefined'&&module.exports)module.exports=FA;else root.AT3FPA=FA;
})(typeof self!=='undefined'?self:this);
