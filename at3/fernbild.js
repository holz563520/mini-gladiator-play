// WAS DIE DATEI TUT: Fernbilder und Globus der Kartenansicht von Arena Theory 3.0 (Schritt G4d). Reine Rechnung ohne Bildschirm, läuft im Bildkern.
// Fernstufen ⅟16 bis ⅟4096 (lod 4 bis 12): ein Bild = (8 << lod)² Felder, immer 512 × 256 Bildpunkte (Raute, flach, ohne Höhenstufen), gemalt nur aus dem
// Erdraster (nie aus Kartenstücken): 128 × 128 Stichproben je Bild, Höhe weich aus den Erdzellen (gleiche Glättung wie im Kartenstück, ohne feines Rauschen),
// Küste, Seen, Strand, Eis (grobe Eiskante aus weltgen.eis), Biome echt gemischt (Biomregel des Kartenstücks), ab ⅟256 über Mehrheiten je 3 × 3 geglättet;
// Hangschatten aus der weichen Höhe, dazu Flüsse, Straßen, Seewege und Orte. Globus: Erdbild (600 × 300, startplatz.erdBild) auf eine Kugel, Norden oben.
// Kerne: nur im Bildkern (bildkern.js), nie auf dem Hauptkern (Regel 13). Kosten je Bild fest (16.384 Stichproben, 131.072 Bildpunkte), unabhängig von Ort, Zoom
// und Weltgröße (Regel 14). Globus: Kosten nur von der Bildgröße (Hälfte der Auflösung, höchstens rund 200.000 Bildpunkte).
// W1c Runde Welt: Stichproben, Linien und Orte laufen in x über die Naht; die Bilder der Stufen 11 und 12 (16.384 und 32.768 Felder) teilen die Weltbreite
// nicht ganz, an der Naht überlappen sich darum zwei Bilder, beide zeigen dort dieselbe Welt.
// Wiederverwendet: Biomfarben, Netzfarben und Linien der Startplatz-Wahl (startplatz.js, G4c), Biomregel und Glättung des Kartenstücks (weltgen.js punkt/neigung/klasse/herrscht,
// W1a+), Eiskante (W1c), Ortspunkte und Straßenläufe (W1b), Palette AT3-64 mit heller/dunkler (at3-64.js).
// N7a3c1: Orte in ⅟16–⅟512 als Mini-Plan aus dem echten Ortsplan (miniAn, vom Bildkern gesetzt), sonst Punkt wie bisher.
// N7b1: Ortssymbole nach Größe statt Quadraten (groesseAn vom Bildkern), Großstädte und Hauptstädte auf dem Globus (globusOrte).
// N4c1: Reiche (Knopf „Realms“): Grenzlinie in der dunkleren Reichsfarbe, jede achte Landstichprobe in der Reichsfarbe; auf dem Globus je Erdzelle.
//    Kosten: eine Nachschau je Stichprobe in einer Tafel, nichts je Bildpunkt.
(function(root){
'use strict';
var GW=600, GH=300, ZF=1024, WF=GW*ZF, HF=GH*ZF, S=128, IW=512, IH=256, ZONE=58, WEGE_BIS=8, MAX=12;
var BFARBE=[39,40,46,62,19,15,8,11,23,5,42,41,6,18,61,45,14,16], OFARBE=[0,53,37,48,32], F_PFAD=12, F_STRASSE=47, F_SEE=43, F_FAEHRE=48;
// Biom-Übersicht (16.11.2026, Wunsch Thomas): auf dem Globus und in den fernsten Stufen (ab ⅟1024) zeigt jede Erdzelle das Biom, das in ihrer
// Gegend (17 × 17 Erdzellen) im Verhältnis zum Weltdurchschnitt am stärksten vertreten ist, in klaren Übersichtsfarben: Wüste gelb, Steppe hellgrün,
// Wald grün, Sumpf oliv, Tundra hellgrau, Fels grau, Schnee und Eis weiß. Die Karte selbst bleibt unverändert (nur Farben der Fernansicht).
var UFARBE=[39,40,46,62,19,16,45,5,3,6,42,41,6,18,60,24,14,9], U_R=8, U_AB=10;   // U_R: Halbmesser der Gegend in Erdzellen; U_AB: ab dieser Stufe (⅟1024) Übersicht
var T1=3, T2=8;            // Hangschatten: Steigung der weichen Höhe in 1/16 Feld je Feld (Vorschlagswerte)
function um(z){z%=GW;return z<0?z+GW:z}
function umF(x){x%=WF;return x<0?x+WF:x}

// Bildpunkt → Stichprobe (−1 = außerhalb der Raute); für alle Bilder gleich
var TAB=(function(){var t=new Int32Array(IW*IH);for(var py=0;py<IH;py++)for(var px=0;px<IW;px++){var X=px+.5-256,Y=py+.5,a=(X/256+Y/128)/2,b=(Y/128-X/256)/2;
 t[py*IW+px]=a<0||b<0||a>=1||b>=1?-1:((b*S)|0)*S+((a*S)|0)}return t})();

// Weicher Erdwert an Feld (fx, fy): quadratische Glättung über 3 × 3 Erdzellen wie im Kartenstück (weltgen.gelaende, Kanäle). art 0 Höhe, 1 Feuchte, 2 Wärme, 3 Seeflag
var WU=new Int32Array(3), WV=new Int32Array(3);
function weich(A,art,fx,fy){var zx=fx>>10,zy=fy>>10,u=fx&1023,v=fy&1023,s=0,j,i;
 WU[0]=((ZF-u)*(ZF-u))>>6;WU[2]=(u*u)>>6;WU[1]=32768-WU[0]-WU[2];WV[0]=((ZF-v)*(ZF-v))>>6;WV[2]=(v*v)>>6;WV[1]=32768-WV[0]-WV[2];
 var X=art===0?A.E:art===1?A.feu:art===2?A.tmp:A.dir;
 for(j=0;j<3;j++){var y=zy+j-1;if(y<0)y=0;else if(y>=GH)y=GH-1;var z=0,r=y*GW;
  for(i=0;i<3;i++){var w=X[r+um(zx+i-1)];if(art===3)w=w&128?255:0;z+=WU[i]*w}s+=WV[j]*(z>>15)}
 return s>>15}

// ── Fernbild ──
// Raster der Stichproben mit Rand M (für Mehrheit und Hangschatten): Höhe, Seeflag, Feuchte, Wärme, Biom
var M=2, GS=S+2*M, HS=new Int32Array(GS*GS), KS=new Uint8Array(GS*GS), FA=new Int32Array(GS*GS), TT=new Int32Array(GS*GS), BI=new Uint8Array(GS*GS), BQ=new Uint8Array(GS*GS),
    ZB=new Int32Array(18), COL=new Uint8Array(S*S), P=new Int32Array(8), V=new Int32Array(8), RQ=new Uint16Array(GS*GS);   // N4c1: Reich je Stichprobe
function binnen(b){return b>=3&&b<=9||b>=13}                                   // N2c: 13–17 neue Land-Biome
// Übersicht zählt je Land-Biom (Wüste … Schnee, dazu N2c Grasland … Mangroven): Biom → Platz 0..11 und zurück
var U_LAND=[3,4,5,6,7,8,9,13,14,15,16,17], U_PL=new Int8Array(18).fill(-1), UK=U_LAND.length;U_LAND.forEach(function(b,k){U_PL[b]=k});
// Übersichtsbiom je Erdzelle (600 × 300). Zwei Stichproben je Landzelle mit der Biomregel des Kartenstücks, Summen über die Gegend als Kastenfilter
// in x (über die Naht) und y, geteilt durch den Weltanteil. Kosten fest: rund 110.000 Stichproben, einmal je Welt im Bildkern (Regel 14).
function uebersicht(G,A,seed){seed=seed>>>0;var N=GW*GH,C=new Uint16Array(N*UK),T=new Uint16Array(N*UK),tot=new Float64Array(UK),U=new Uint8Array(N),P=new Int32Array(8),V=new Int32Array(8),i,k,x,y,s;
 var zg=G.N2B&&A.zon,UR=zg?2:U_R;   // N2b: Zuschlag der Klimazonen wie im Kartenstück, einfache Mehrheit über 5 × 5 Zellen (die Zonen machen die Gegend schon eindeutig)
 for(i=0;i<N;i++){var b=A.bio[i];if(!binnen(b))continue;x=i%GW;y=(i/GW)|0;if(!zg)G.neigung(A.tmp[i],A.feu[i],A.E[i],V);
  for(s=0;s<2;s++){var fx=x*ZF+256+s*512,fy=y*ZF+256+s*512;if(zg)G.zonenV(A,seed,fx,fy,V);G.punkt(seed,fx,fy,P,0);k=U_PL[G.klasse(P,0,V,0,0,0)];if(k>=0){C[i*UK+k]++;tot[k]++}}}
 var sum=0;for(k=0;k<UK;k++)sum+=tot[k];var w=new Float64Array(UK);for(k=0;k<UK;k++)w[k]=zg?1:tot[k]?sum/7/tot[k]:0;   // ohne Zonen: nur die 7 alten Biome kommen vor
 var Z=new Int32Array(UK);
 for(y=0;y<GH;y++){var o=y*GW;for(k=0;k<UK;k++)Z[k]=0;for(x=-UR;x<=UR;x++){var j=o+(x<0?x+GW:x);for(k=0;k<UK;k++)Z[k]+=C[j*UK+k]}   // in x über die Naht
  for(x=0;x<GW;x++){for(k=0;k<UK;k++)T[(o+x)*UK+k]=Z[k];var aus=o+(x-UR<0?x-UR+GW:x-UR),rein=o+(x+UR+1>=GW?x+UR+1-GW:x+UR+1);for(k=0;k<UK;k++)Z[k]+=C[rein*UK+k]-C[aus*UK+k]}}
 for(x=0;x<GW;x++){for(k=0;k<UK;k++)Z[k]=0;for(y=0;y<=UR&&y<GH;y++)for(k=0;k<UK;k++)Z[k]+=T[(y*GW+x)*UK+k];                                  // in y, am Pol abgeschnitten
  for(y=0;y<GH;y++){i=y*GW+x;var b2=A.bio[i];if(!binnen(b2))U[i]=b2;else{var m=0;for(k=1;k<UK;k++)if(Z[k]*w[k]>Z[m]*w[m])m=k;U[i]=Z[m]?U_LAND[m]:b2}
   if(y+UR+1<GH)for(k=0;k<UK;k++)Z[k]+=T[((y+UR+1)*GW+x)*UK+k];if(y-UR>=0)for(k=0;k<UK;k++)Z[k]-=T[((y-UR)*GW+x)*UK+k]}}
 return U}
// G = weltgen.js, A = Erdraster (ansicht), F = {pal, du, he, dunkel}. x0 darf beliebig sein (wird umgerechnet), y0 im Raster der Stufe. Gibt {w,h,ox,oy,px}.
// N4c1: RE = {z: Reich + 1 je Erdzelle, f: Farbnummer je Reich} oder null (Knopf „Realms“ aus, Erde ohne Herrschaften). Grenzen leicht ausgefranst
// (Versatz je Block von 128 Feldern wie die Übersicht), Grenzlinie in der dunkleren Reichsfarbe, Land jede achte Stichprobe (versetzt) in der Reichsfarbe.
function kachel(G,A,seed,x0,y0,lod,F,U,RE){seed=seed>>>0;var ueb=U&&lod>=U_AB;x0=umF(x0);var n=8<<lod,st=n/S,sI=G.eisSeed(seed),i,j,k,q,fx,fy;
 for(j=0;j<GS;j++){fy=Math.floor(y0+(j-M+.5)*st);if(fy<0)fy=0;else if(fy>=HF)fy=HF-1;var zy=fy>>10,pol=zy<ZONE||zy>=GH-ZONE;
  for(i=0;i<GS;i++){fx=umF(Math.floor(x0+(i-M+.5)*st));q=j*GS+i;var h=HS[q]=weich(A,0,fx,fy),ks=KS[q]=weich(A,3,fx,fy),fa=FA[q]=weich(A,1,fx,fy),tt=TT[q]=weich(A,2,fx,fy),b;
   if(pol&&G.eis(sI,fx&~7,fy&~7,true)>0)b=12;
   else if(h<0)b=ks>127?11:h<-600?0:1;
   else if(h<24&&ks<=127)b=2;
   else if(ueb){var hz=G.mix(seed^Math.imul(fx>>7,0x2c9277b5)^Math.imul(fy>>7,0x5bd1e995)),ux=umF(fx+(hz&511)-256)>>10,uy=(fy+((hz>>>9)&511)-256)>>10;   // Grenzen leicht ausgefranst
    uy=uy<0?0:uy>=GH?GH-1:uy;b=U[uy*GW+ux];if(!binnen(b))b=U[zy*GW+(fx>>10)];if(!binnen(b))b=5}
   else{if(G.N2B&&A.zon)G.zonenV(A,seed,fx,fy,V);else G.neigung(tt,fa,h,V);G.punkt(seed,fx,fy,P,0);b=G.klasse(P,0,V,0,0,0)}
   if(RE){var hr=G.mix(seed^0x7e1c5a3^Math.imul(fx>>7,0x2c9277b5)^Math.imul(fy>>7,0x5bd1e995)),rx=umF(fx+(hr&511)-256)>>10,ry=(fy+((hr>>>9)&511)-256)>>10;ry=ry<0?0:ry>=GH?GH-1:ry;RQ[q]=RE.z[ry*GW+rx]}
   BI[q]=b}}
 // Weit draußen deckt eine Stichprobe viele Felder, die Flecken sind kleiner: Mehrheit je 3 × 3 (⅟256, ⅟512 einmal, ab ⅟1024 zweimal), wie die Region der Startplatz-Wahl
 var pass=ueb?0:lod>=10?2:lod>=8?1:0;
 for(var d=0;d<pass;d++){BQ.set(BI);for(j=1;j<GS-1;j++)for(i=1;i<GS-1;i++){q=j*GS+i;if(!binnen(BQ[q]))continue;for(k=0;k<18;k++)ZB[k]=0;var mb=BQ[q],mz=0;
  for(var v=-1;v<=1;v++)for(var u=-1;u<=1;u++){var b2=BQ[q+v*GS+u];if(!binnen(b2))continue;if(++ZB[b2]>mz){mz=ZB[b2];mb=b2}}if(ZB[BQ[q]]<mz)BI[q]=mb}}
 var pal=F.pal,du=F.du,he=F.he;
 for(j=0;j<S;j++)for(i=0;i<S;i++){q=(j+M)*GS+i+M;var b=BI[q],c=ueb?UFARBE[b]:BFARBE[b];
  if(b>=2&&b<=9||b>=13){var gx=(HS[q+1]-HS[q-1])/(2*st),gy=(HS[q+GS]-HS[q-GS])/(2*st),sh=gx>T2?2:gx>T1?1:gx<-T2?-2:gx<-T1?-1:0;   // Licht von Westen wie im Bodenbild
   if(gy>T2)sh--;while(sh>0){c=he[c];sh--}while(sh<0){c=du[c];sh++}
   if(RE){var rr=RQ[q];if(rr){var rc=RE.f[rr-1];if((RQ[q+1]&&RQ[q+1]!==rr)||(RQ[q+GS]&&RQ[q+GS]!==rr))c=du[rc];else if(((i&3)===0&&(j&3)===0)||((i&3)===2&&(j&3)===2))c=rc}}}
  COL[j*S+i]=c}
 var px=new Uint32Array(IW*IH);for(k=0;k<IW*IH;k++){var t=TAB[k];if(t>=0)px[k]=pal[COL[t]]}
 netz(G,A,seed,x0,y0,lod,n,F,px);
 return{w:IW,h:IH,ox:256,oy:0,px:px}}

// Flüsse, Straßen, Seewege, Orte (nur Bildpunkte in der eigenen Raute, damit Nachbarbilder nichts überdecken)
function netz(G,A,seed,x0,y0,lod,n,F,px){var pal=F.pal,zn={n:0};
 function P2(fx,fy,o){var dx=fx-x0;dx-=Math.round(dx/WF)*WF;var a=dx/n,b=(fy-y0)/n;o[0]=256+(a-b)*256;o[1]=(a+b)*128;return o}
 function pkt(x,y,c,r){x=Math.round(x);y=Math.round(y);for(var v=0;v<r;v++)for(var u=0;u<r;u++){var X=x+u,Y=y+v;if(X<0||Y<0||X>=IW||Y>=IH)continue;var o=Y*IW+X;if(TAB[o]>=0)px[o]=c}}
 var p0=[0,0],p1=[0,0];
 function lin(ax,ay,bx,by,c,r,strich){P2(ax,ay,p0);P2(bx,by,p1);var L=Math.hypot(p1[0]-p0[0],p1[1]-p0[1]);if(L>4000)return;var m=Math.max(1,Math.ceil(L*1.5));
  for(var s=0;s<=m;s++){zn.n++;if(strich&&(zn.n%8)>4)continue;pkt(p0[0]+(p1[0]-p0[0])*s/m-(r>>1),p0[1]+(p1[1]-p0[1])*s/m-(r>>1),c,r)}}
 var za=Math.floor((x0-ZF)/ZF),ze=Math.floor((x0+n+ZF)/ZF),ya=Math.max(0,Math.floor((y0-ZF)/ZF)),ye=Math.min(GH-1,Math.floor((y0+n+ZF)/ZF)),x,y,i,k,v;
 var breit=lod<=6?2:1,fw=pal[BFARBE[10]];
 // Flüsse: Zellmitte → Mitte der Abflusszelle
 for(y=ya;y<=ye;y++)for(x=za;x<=ze;x++){i=y*GW+um(x);if(A.flu[i]<2||A.bio[i]<2||A.bio[i]===11||A.bio[i]===12)continue;var r0=A.dir[i]&7;if(r0>3)continue;
  lin(x*ZF+512,y*ZF+512,(x+G.DX[r0])*ZF+512,(y+G.DY[r0])*ZF+512,fw,A.flu[i]>3?breit:1,false)}
 // Seewege (gestrichelt, von der Mitte der Meereszelle zu ihren Ausgängen)
 for(y=ya;y<=ye;y++)for(x=za;x<=ze;x++){i=y*GW+um(x);var o=A.ort[i];if(A.bio[i]>=2||!(o>>4))continue;
  for(k=0;k<4;k++)if(o>>4>>k&1)lin(x*ZF+512,y*ZF+512,x*ZF+512+G.DX[k]*512,y*ZF+512+G.DY[k]*512,pal[F_SEE],1,true)}
 // Straßen: nah die echten Läufe aus dem Seed, weiter draußen von der Zellmitte zu den Ausgängen
 for(y=ya;y<=ye;y++)for(x=za;x<=ze;x++){i=y*GW+um(x);var wg=A.weg[i];if(!(wg&15)&&!(A.ort[i]&15))continue;
  if(lod<=WEGE_BIS){var L=G.wegLinien(seed,A,um(x),y),vx=(x-um(x))*ZF;
   for(k=0;k<L.length;k++){var l=L[k],c=pal[l.see?F_SEE:l.faehre?F_FAEHRE:l.kl>1?F_STRASSE:F_PFAD],r=l.kl>1&&!l.see&&lod<=6?2:1;
    for(v=1;v<l.x.length;v++)lin(l.x[v-1]+vx,l.y[v-1],l.x[v]+vx,l.y[v],c,r,!!(l.see||l.faehre))}}
  else{var cs=pal[wg&64?F_FAEHRE:(wg>>4&3)>1?F_STRASSE:F_PFAD];for(k=0;k<4;k++)if(wg>>k&1)lin(x*ZF+512,y*ZF+512,x*ZF+512+G.DX[k]*512,y*ZF+512+G.DY[k]*512,cs,1,!!(wg&64))}}
 // Orte als Quadrate mit dunklem Rand (Städte größer); N7a3c1: in ⅟16–⅟512 mit Mini-Plan der Ort selbst, maßstabsgetreu (fehlt er noch: Punkt, Regel 20)
 var MH=MINI&&lod<=MINI_BIS?MINI:null,nr=MH||GROE?ortNr(A):null,SL=GROE?[]:null;
 for(y=ya;y<=ye;y++)for(x=za;x<=ze;x++){var zi=y*GW+um(x),a=A.ort[zi]&15;if(!a)continue;
  var kk=nr?nr.get(zi):null;
  if(MH){var mp=kk!=null?MH.hole(kk):null;if(mp){miniMalen(mp,x0,y0,n,px,pal);continue}}
  var pp=G.ortPunkt(seed,A,um(x),y);
  if(SL&&kk!=null){P2(pp[0]+(x-um(x))*ZF,pp[1],p0);SL.push(Math.round(p0[0]),Math.round(p0[1]),GROE(kk));continue}   // N7b1: Symbol nach Größe, unten gemalt
  var gross=a===2||a===4,gr=lod<=6?(gross?7:5):lod<=9?(gross?5:3):(gross?3:2);
  P2(pp[0]+(x-um(x))*ZF,pp[1],p0);if(gr>2)pkt(p0[0]-gr/2-1,p0[1]-gr/2-1,pal[F.dunkel],gr+2);pkt(p0[0]-gr/2,p0[1]-gr/2,pal[OFARBE[a]],gr)}
 if(SL&&SL.length)symbole(SL,px,F,true)}

// N7b1 (26.11.2026): Ortssymbole nach Größe (orte.js groesse, G2 Weiler … G7 Hauptstadt) in den Fernstufen statt Quadraten: ab ⅟1024 immer, in ⅟16–⅟512 dort,
// wo der Mini-Plan (N7a3c1) noch fehlt. Auf dem Globus nur Großstadt (G6) und Hauptstadt (G7). Feste kleine Bildchen (höchstens 15 × 14 Bildpunkte), nur Palettenfarben
// (AT3-64), keine Figuren (Regel 22). Der Bildkern setzt GROE(k) → Größe mit groesseAn(); ohne bleibt alles wie vorher (Notausschalter ?n7b1=0 im Bildkern).
// Kosten: eine Nachschau je Ort im Bild (Orte sind dünn: im Mittel rund 25 je Bild in ⅟4096) und höchstens 210 Bildpunkte je Symbol, nichts je Bildpunkt des Bilds.
var GROE=null;
function groesseAn(f){GROE=typeof f==='function'?f:null}
var SYM_ROH={
 2:['..k..','.krk.','krrrk','khhhk','kkkkk'],
 3:['..k...k..','.krk.krk.','krrrkrrrk','khhhkhhhk','khkhkhkhk','kkkkkkkkk'],
 4:['....k....','...krk...','.k.krk.k.','krkrrrkrk','krkhhhkrk','khkhhhkhk','khkhkhkhk','kkkkkkkkk'],
 5:['...k...k...','..krk.krk..','.krrrkrrrk.','kkkkkkkkkkk','kwkwkwkwkwk','kwwwwwwwwwk','kswwkkkwwsk','kswkdddkwsk','kkkkkkkkkkk'],
 6:['......k......','.k...krk...k.','krk.krrrk.krk','krk.khhhk.krk','kwkkkkkkkkkwk','kwkwkwkwkwkwk','kwwwwwwwwwwwk','kswwwkkkwwwsk','kswwkdddkwwsk','kswwkdddkwwsk','kkkkkkkkkkkkk'],
 7:['.......b.......','.......bb......','.......k.......','......kgk......','.k...kgggk...k.','kbk.kgggggk.kbk','kwk.khhhhhk.kwk','kwkkkkkkkkkkkwk','kwkwkwkwkwkwkwk','kwwwwwwwwwwwwwk','kswwwwkkkwwwwsk','kswwwkdddkwwwsk','kswwwkdddkwwwsk','kkkkkkkkkkkkkkk'],
 16:['.k.','khk','.k.'],                          // Globus: Großstadt
 17:['..k..','.kgk.','kgggk','.kgk.','..k..']};   // Globus: Hauptstadt
var SYM_FARBE={k:1,r:36,h:47,w:5,s:4,d:0,g:53,b:36};   // Palettennummern AT3-64 (Rattenpergament)
var SYM=null;
function symBau(){if(SYM)return SYM;SYM={};for(var g in SYM_ROH){var R=SYM_ROH[g],h=R.length,w=R[0].length,m=new Int8Array(w*h).fill(-1);
  for(var y=0;y<h;y++)for(var x=0;x<w;x++){var c=R[y][x];if(c!=='.')m[y*w+x]=SYM_FARBE[c]}SYM[g]={w:w,h:h,m:m}}return SYM}
// L = [x, y, g, …] Mitte des Symbols in Bildpunkten; raute: nur Bildpunkte der eigenen Raute (Fernbild), sonst ganzes Bild (Globus: w, h in L.w/L.h)
function symbole(L,px,F,raute,bw,bh){var S=symBau(),pal=F.pal,W=raute?IW:bw,H=raute?IH:bh,o=[],i;
 for(i=0;i<L.length;i+=3)o.push(i);o.sort(function(a,b){return L[a+2]-L[b+2]||L[a+1]-L[b+1]});   // kleine zuerst, große obenauf
 for(var q=0;q<o.length;q++){i=o[q];var s=S[L[i+2]];if(!s)continue;var sx=L[i]-(s.w>>1),sy=L[i+1]-(s.h>>1);
  for(var y=0;y<s.h;y++){var Y=sy+y;if(Y<0||Y>=H)continue;for(var x=0;x<s.w;x++){var c=s.m[y*s.w+x];if(c<0)continue;var X=sx+x;if(X<0||X>=W)continue;var p=Y*W+X;
   if(raute&&TAB[p]<0)continue;px[p]=pal[c]}}}}

// N7a3c1 (Thomas 25.11.2026): Mini-Pläne der Orte (ortsbild.js mini) in den Fernstufen ⅟16–⅟512 (lod 4 bis MINI_BIS). Der Bildkern setzt MINI = {hole(k) → {x0, y0, W, m}
// oder null (dann fragt er den Ortskern), lut[256] → Farbnummer der Palette}. Jeder Bildpunkt der Ortsraute nimmt das Planfeld unter seiner Mitte (ab ⅟128 fallen
// mehrere Felder auf einen Bildpunkt: das mittlere zählt, keine Mittelung); 255 = Welt bleibt. Nur Bildpunkte der eigenen Raute (TAB), Kosten höchstens ein Bild.
var MINI=null, MINI_BIS=9;
function miniAn(o){MINI=o||null}
function ortNr(A){if(A._ortNr)return A._ortNr;var M=new Map(),L=A.orte,n=A.kopf?A.kopf[0]:L.length;for(var k=0;k<n&&k<L.length;k++){var z=L[k]&0xffffff;if(!M.has(z))M.set(z,k)}return A._ortNr=M}
function miniMalen(mp,x0,y0,n,px,pal){var W=mp.W,m=mp.m,lut=MINI.lut,dx=mp.x0-x0;dx-=Math.round(dx/WF)*WF;
 var a0=dx/n,b0=(mp.y0-y0)/n,s=W/n,cx=[a0-b0,a0+s-b0,a0-b0-s,a0+s-b0-s],cy=[a0+b0,a0+s+b0,a0+b0+s,a0+s+b0+s];
 var xa=Math.max(0,Math.floor(256+Math.min.apply(null,cx)*256)),xe=Math.min(IW-1,Math.ceil(256+Math.max.apply(null,cx)*256)),
  ya=Math.max(0,Math.floor(Math.min.apply(null,cy)*128)),ye=Math.min(IH-1,Math.ceil(Math.max.apply(null,cy)*128));
 for(var py=ya;py<=ye;py++){var Y=(py+.5)/128;for(var qx=xa;qx<=xe;qx++){var o=py*IW+qx;if(TAB[o]<0)continue;var X=(qx+.5-256)/256,a=(X+Y)/2,b=(Y-X)/2,
   i=Math.floor((a-a0)*n),j=Math.floor((b-b0)*n);if(i<0||j<0||i>=W||j>=W)continue;var v=m[j*W+i];if(v!==255)px[o]=pal[lut[v]]}}}

// ── Globus (Norden oben) ──
// tex: Erdbild 600 × 300 (Farben), texD: dieselbe Erde dunkler (Rand der Kugel). W, H Bildschirm, R Kugelhalbmesser in Bildpunkten, lon0/lat0 Mitte (Bogenmaß), s Verkleinerung.
function globus(tex,texD,W,H,R,lon0,lat0,s,rand,ORTE,F){var w=Math.ceil(W/s),h=Math.ceil(H/s),r=R/s,cx=W/2/s,cy=H/2/s,px=new Uint32Array(w*h),cl=Math.cos(lat0),sl=Math.sin(lat0),
  ZP=2*Math.PI,ra=(1+1.5/r)*(1+1.5/r);
 var y0=Math.max(0,Math.floor(cy-r-2)),y1=Math.min(h,Math.ceil(cy+r+2)),x0=Math.max(0,Math.floor(cx-r-2)),x1=Math.min(w,Math.ceil(cx+r+2));
 for(var py=y0;py<y1;py++){var y=-(py+.5-cy)/r;for(var qx=x0;qx<x1;qx++){var x=(qx+.5-cx)/r,r2=x*x+y*y;if(r2>=1){if(r2<ra)px[py*w+qx]=rand;continue}
  var z=Math.sqrt(1-r2),la=Math.asin(y*cl+z*sl),lo=lon0+Math.atan2(x,z*cl-y*sl),col=Math.floor(lo/ZP*GW)%GW,row=Math.floor((.5-la/Math.PI)*GH);
  if(col<0)col+=GW;if(row<0)row=0;else if(row>=GH)row=GH-1;var t=row*GW+col;px[py*w+qx]=z<.28?texD[t]:tex[t]}}
 if(ORTE&&F&&ORTE.length){var SL=[],dl;   // N7b1: Großstädte und Hauptstädte auf der Vorderseite der Kugel (ORTE = [Länge, Breite, Größe, …] im Bogenmaß)
  for(var k=0;k<ORTE.length;k+=3){var la=ORTE[k+1],cp=Math.cos(la);dl=ORTE[k]-lon0;var gx=cp*Math.sin(dl),gy=cl*Math.sin(la)-sl*cp*Math.cos(dl),gz=sl*Math.sin(la)+cl*cp*Math.cos(dl);
   if(gz<.3)continue;SL.push(Math.round(cx+gx*r-.5),Math.round(cy-gy*r-.5),ORTE[k+2]+10)}
  if(SL.length)symbole(SL,px,F,false,w,h)}
 return{w:w,h:h,px:px}}
// N7b1: Liste der Globus-Orte (Großstadt G6, Hauptstadt G7) aus dem Erdraster, einmal je Welt: [Länge, Breite, Größe, …]
function globusOrte(G,A,seed,groe){var L=[],O=A.orte,n=A.kopf?A.kopf[0]:O.length;
 for(var k=0;k<n&&k<O.length;k++){var g=groe(k);if(g<6)continue;var z=O[k]&0xffffff,pp=G.ortPunkt(seed,A,z%GW,(z/GW)|0);
  L.push((pp[0]+.5)/WF*2*Math.PI,(.5-(pp[1]+.5)/HF)*Math.PI,g)}
 return L}
// Bildschirmpunkt auf dem Globus → Feld der Welt (oder null außerhalb der Kugel). x, y relativ zur Kugelmitte in Bildpunkten.
function aufGlobus(x,y,R,lon0,lat0){x/=R;y=-y/R;var r2=x*x+y*y;if(r2>=1)return null;var z=Math.sqrt(1-r2),cl=Math.cos(lat0),sl=Math.sin(lat0),
  la=Math.asin(y*cl+z*sl),lo=lon0+Math.atan2(x,z*cl-y*sl);
 return{x:umF(Math.floor(lo/(2*Math.PI)*WF)),y:Math.max(0,Math.min(HF-1,Math.floor((.5-la/Math.PI)*HF)))}}
// Erdbild dunkler (Farbe → Farbnummer → dunkler)
function dunkler(tex,F){var inv=new Map(),d=new Uint32Array(tex.length);for(var i=0;i<64;i++)inv.set(F.pal[i],i);
 for(i=0;i<tex.length;i++){var c=inv.get(tex[i]);d[i]=c==null?tex[i]:F.pal[F.du[c]]}return d}

// N4c1: Reiche auf dem Erdbild des Globus (600 × 300 Farben): Grenze dunkel, jede vierte Zelle in der Reichsfarbe
function reicheErde(tex,RE,F){for(var i=0;i<GW*GH;i++){var r=RE.z[i];if(!r)continue;var x=i%GW,y=(i/GW)|0,e=RE.z[x+1<GW?i+1:i+1-GW],s=y+1<GH?RE.z[i+GW]:0,rc=RE.f[r-1];
  if((e&&e!==r)||(s&&s!==r))tex[i]=F.pal[F.du[rc]];else if(!(x&1)&&!(y&1))tex[i]=F.pal[rc]}return tex}
var FB={groesseAn:groesseAn,globusOrte:globusOrte,symbole:symbole,SYM_ROH:SYM_ROH,miniAn:miniAn,MINI_BIS:MINI_BIS,ortNr:ortNr,reicheErde:reicheErde,S:S,IW:IW,IH:IH,MAX:MAX,WEGE_BIS:WEGE_BIS,TAB:TAB,kachel:kachel,uebersicht:uebersicht,UFARBE:UFARBE,U_AB:U_AB,globus:globus,aufGlobus:aufGlobus,dunkler:dunkler,weich:weich};
if(typeof module!=='undefined'&&module.exports)module.exports=FB;else root.AT3FERN=FB;
})(typeof self!=='undefined'?self:this);
