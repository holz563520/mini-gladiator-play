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
    ZB=new Int32Array(18), COL=new Uint8Array(S*S), P=new Int32Array(8), V=new Int32Array(8);
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
function kachel(G,A,seed,x0,y0,lod,F,U){seed=seed>>>0;var ueb=U&&lod>=U_AB;x0=umF(x0);var n=8<<lod,st=n/S,sI=G.eisSeed(seed),i,j,k,q,fx,fy;
 for(j=0;j<GS;j++){fy=Math.floor(y0+(j-M+.5)*st);if(fy<0)fy=0;else if(fy>=HF)fy=HF-1;var zy=fy>>10,pol=zy<ZONE||zy>=GH-ZONE;
  for(i=0;i<GS;i++){fx=umF(Math.floor(x0+(i-M+.5)*st));q=j*GS+i;var h=HS[q]=weich(A,0,fx,fy),ks=KS[q]=weich(A,3,fx,fy),fa=FA[q]=weich(A,1,fx,fy),tt=TT[q]=weich(A,2,fx,fy),b;
   if(pol&&G.eis(sI,fx&~7,fy&~7,true)>0)b=12;
   else if(h<0)b=ks>127?11:h<-600?0:1;
   else if(h<24&&ks<=127)b=2;
   else if(ueb){var hz=G.mix(seed^Math.imul(fx>>7,0x2c9277b5)^Math.imul(fy>>7,0x5bd1e995)),ux=umF(fx+(hz&511)-256)>>10,uy=(fy+((hz>>>9)&511)-256)>>10;   // Grenzen leicht ausgefranst
    uy=uy<0?0:uy>=GH?GH-1:uy;b=U[uy*GW+ux];if(!binnen(b))b=U[zy*GW+(fx>>10)];if(!binnen(b))b=5}
   else{if(G.N2B&&A.zon)G.zonenV(A,seed,fx,fy,V);else G.neigung(tt,fa,h,V);G.punkt(seed,fx,fy,P,0);b=G.klasse(P,0,V,0,0,0)}
   BI[q]=b}}
 // Weit draußen deckt eine Stichprobe viele Felder, die Flecken sind kleiner: Mehrheit je 3 × 3 (⅟256, ⅟512 einmal, ab ⅟1024 zweimal), wie die Region der Startplatz-Wahl
 var pass=ueb?0:lod>=10?2:lod>=8?1:0;
 for(var d=0;d<pass;d++){BQ.set(BI);for(j=1;j<GS-1;j++)for(i=1;i<GS-1;i++){q=j*GS+i;if(!binnen(BQ[q]))continue;for(k=0;k<18;k++)ZB[k]=0;var mb=BQ[q],mz=0;
  for(var v=-1;v<=1;v++)for(var u=-1;u<=1;u++){var b2=BQ[q+v*GS+u];if(!binnen(b2))continue;if(++ZB[b2]>mz){mz=ZB[b2];mb=b2}}if(ZB[BQ[q]]<mz)BI[q]=mb}}
 var pal=F.pal,du=F.du,he=F.he;
 for(j=0;j<S;j++)for(i=0;i<S;i++){q=(j+M)*GS+i+M;var b=BI[q],c=ueb?UFARBE[b]:BFARBE[b];
  if(b>=2&&b<=9||b>=13){var gx=(HS[q+1]-HS[q-1])/(2*st),gy=(HS[q+GS]-HS[q-GS])/(2*st),sh=gx>T2?2:gx>T1?1:gx<-T2?-2:gx<-T1?-1:0;   // Licht von Westen wie im Bodenbild
   if(gy>T2)sh--;while(sh>0){c=he[c];sh--}while(sh<0){c=du[c];sh++}}
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
 // Orte als Quadrate mit dunklem Rand (Städte größer)
 for(y=ya;y<=ye;y++)for(x=za;x<=ze;x++){var a=A.ort[y*GW+um(x)]&15;if(!a)continue;var pp=G.ortPunkt(seed,A,um(x),y),gross=a===2||a===4,gr=lod<=6?(gross?7:5):lod<=9?(gross?5:3):(gross?3:2);
  P2(pp[0]+(x-um(x))*ZF,pp[1],p0);if(gr>2)pkt(p0[0]-gr/2-1,p0[1]-gr/2-1,pal[F.dunkel],gr+2);pkt(p0[0]-gr/2,p0[1]-gr/2,pal[OFARBE[a]],gr)}}

// ── Globus (Norden oben) ──
// tex: Erdbild 600 × 300 (Farben), texD: dieselbe Erde dunkler (Rand der Kugel). W, H Bildschirm, R Kugelhalbmesser in Bildpunkten, lon0/lat0 Mitte (Bogenmaß), s Verkleinerung.
function globus(tex,texD,W,H,R,lon0,lat0,s,rand){var w=Math.ceil(W/s),h=Math.ceil(H/s),r=R/s,cx=W/2/s,cy=H/2/s,px=new Uint32Array(w*h),cl=Math.cos(lat0),sl=Math.sin(lat0),
  ZP=2*Math.PI,ra=(1+1.5/r)*(1+1.5/r);
 var y0=Math.max(0,Math.floor(cy-r-2)),y1=Math.min(h,Math.ceil(cy+r+2)),x0=Math.max(0,Math.floor(cx-r-2)),x1=Math.min(w,Math.ceil(cx+r+2));
 for(var py=y0;py<y1;py++){var y=-(py+.5-cy)/r;for(var qx=x0;qx<x1;qx++){var x=(qx+.5-cx)/r,r2=x*x+y*y;if(r2>=1){if(r2<ra)px[py*w+qx]=rand;continue}
  var z=Math.sqrt(1-r2),la=Math.asin(y*cl+z*sl),lo=lon0+Math.atan2(x,z*cl-y*sl),col=Math.floor(lo/ZP*GW)%GW,row=Math.floor((.5-la/Math.PI)*GH);
  if(col<0)col+=GW;if(row<0)row=0;else if(row>=GH)row=GH-1;var t=row*GW+col;px[py*w+qx]=z<.28?texD[t]:tex[t]}}
 return{w:w,h:h,px:px}}
// Bildschirmpunkt auf dem Globus → Feld der Welt (oder null außerhalb der Kugel). x, y relativ zur Kugelmitte in Bildpunkten.
function aufGlobus(x,y,R,lon0,lat0){x/=R;y=-y/R;var r2=x*x+y*y;if(r2>=1)return null;var z=Math.sqrt(1-r2),cl=Math.cos(lat0),sl=Math.sin(lat0),
  la=Math.asin(y*cl+z*sl),lo=lon0+Math.atan2(x,z*cl-y*sl);
 return{x:umF(Math.floor(lo/(2*Math.PI)*WF)),y:Math.max(0,Math.min(HF-1,Math.floor((.5-la/Math.PI)*HF)))}}
// Erdbild dunkler (Farbe → Farbnummer → dunkler)
function dunkler(tex,F){var inv=new Map(),d=new Uint32Array(tex.length);for(var i=0;i<64;i++)inv.set(F.pal[i],i);
 for(i=0;i<tex.length;i++){var c=inv.get(tex[i]);d[i]=c==null?tex[i]:F.pal[F.du[c]]}return d}

var FB={S:S,IW:IW,IH:IH,MAX:MAX,WEGE_BIS:WEGE_BIS,TAB:TAB,kachel:kachel,uebersicht:uebersicht,UFARBE:UFARBE,U_AB:U_AB,globus:globus,aufGlobus:aufGlobus,dunkler:dunkler,weich:weich};
if(typeof module!=='undefined'&&module.exports)module.exports=FB;else root.AT3FERN=FB;
})(typeof self!=='undefined'?self:this);
