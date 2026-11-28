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
// N7h1: scharf() rechnet dieselbe Raute mit 256 × 256 Stichproben und dem feinen Höhenrauschen des Kartenstücks als Auftrag in kleinen Zeitanteilen (Bildkern);
//    kachel() (grob) bleibt Byte für Byte gleich. Kosten fest je Bild, unabhängig von Ort und Weltgröße.
// N7h3: Globus schärfer: globusKachel() rechnet die Erdtextur in Kacheln von 8 × 8 Erdzellen (2/4/8 Stichproben je Zelle, Rechnung wie die scharfen Fernstufen),
//    globusBedarf() sagt, welche die Ansicht zeigt (Mitte zuerst), globusAuftrag() malt den Globus in Zeitanteilen aus den feinsten vorhandenen Kacheln.
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
// N7h1: Rechnung in Teilen über einen Satz Felder Bf (grob: der feste Satz K0 mit 128 × 128 Stichproben; scharf: ein eigener Satz mit 256 × 256, Zeile für Zeile
// in kleinen Zeitanteilen). Grob bleibt Byte für Byte wie vorher.
function satz(S2,HS2,KS2,FA2,TT2,BI2,BQ2,RQ2,COL2){var GS2=S2+2*M,n=GS2*GS2;return{S:S2,GS:GS2,HS:HS2||new Int32Array(n),KS:KS2||new Uint8Array(n),FA:FA2||new Int32Array(n),TT:TT2||new Int32Array(n),
 BI:BI2||new Uint8Array(n),BQ:BQ2||new Uint8Array(n),RQ:RQ2||new Uint16Array(n),COL:COL2||new Uint8Array(S2*S2),TAB:S2===S?TAB:tafel(S2)}}
function tafel(S2){var t=new Int32Array(IW*IH);for(var py=0;py<IH;py++)for(var px=0;px<IW;px++){var X=px+.5-256,Y=py+.5,a=(X/256+Y/128)/2,b=(Y/128-X/256)/2;
 t[py*IW+px]=a<0||b<0||a>=1||b>=1?-1:((b*S2)|0)*S2+((a*S2)|0)}return t}
var K0=satz(S,HS,KS,FA,TT,BI,BQ,RQ,COL), K1=null;
// N7h1: feines Höhenrauschen des Kartenstücks (weltgen.js gelaende: O_FEIN, gitter, glatt) an einem Punkt. Oktaven feiner als zwei Stichproben zählen mit ihrem
// Mittelwert (keine Arbeit für Unsichtbares). Ergibt dieselbe Summe wie stufe() im Kartenstück.
var O_FEIN=[[9,72],[8,56],[7,44],[6,34],[5,24],[4,16],[3,10]];
function glatt(u){return(u*u*(768-2*u))>>16}
function feinH(G,seed,fx,fy,minLd){var s=0;for(var i=0;i<7;i++){var ld=O_FEIN[i][0],gew=O_FEIN[i][1];if(ld<minLd){s+=(255*gew)>>1;continue}
 var P=WF>>ld,lx=fx>>ld,ly=fy>>ld,o=i+20,tx=fx-(lx<<ld),ty=fy-(ly<<ld),ux=glatt(ld>=8?tx>>(ld-8):tx<<(8-ld)),uy=glatt(ld>=8?ty>>(ld-8):ty<<(8-ld)),l1=(lx+1)%P;lx%=P;
 var e00=git(G,seed,o,lx,ly),e10=git(G,seed,o,l1,ly),e01=git(G,seed,o,lx,ly+1),e11=git(G,seed,o,l1,ly+1),o1=e00*(256-ux)+e10*ux,o2=e01*(256-ux)+e11*ux;s+=((o1*(256-uy)+o2*uy)>>16)*gew}return s}
function git(G,seed,o,lx,ly){return G.mix(seed^Math.imul(lx,0x27d4eb2d)^Math.imul(ly,0x165667b1)^Math.imul(o+1,0x9e3779b9))&255}
// Zeilen j0 … j1−1 der Stichproben. fein: kleinste Oktave des feinen Rauschens (0 = ohne, wie das grobe Bild)
function zeilen(Bf,G,A,seed,x0,y0,lod,U,RE,j0,j1,fein){var S2=Bf.S,GS2=Bf.GS,HS2=Bf.HS,KS2=Bf.KS,FA2=Bf.FA,TT2=Bf.TT,BI2=Bf.BI,RQ2=Bf.RQ,ueb=U&&lod>=U_AB,n=8<<lod,st=n/S2,sI=G.eisSeed(seed),i,j,q,fx,fy;
 if(j1>GS2)j1=GS2;
 for(j=j0;j<j1;j++){fy=Math.floor(y0+(j-M+.5)*st);if(fy<0)fy=0;else if(fy>=HF)fy=HF-1;var zy=fy>>10,pol=zy<ZONE||zy>=GH-ZONE;
  for(i=0;i<GS2;i++){fx=umF(Math.floor(x0+(i-M+.5)*st));q=j*GS2+i;var h=weich(A,0,fx,fy),ks=KS2[q]=weich(A,3,fx,fy),fa=FA2[q]=weich(A,1,fx,fy),tt=TT2[q]=weich(A,2,fx,fy),b,ho=0;
   if(fein){var hr=feinH(G,seed,fx,fy,fein),amp=h>0?48+((h*3)>>3):48+((-h)>>3);ho=hr-32640;h+=(ho*amp)>>15}   // N7h1: wie im Kartenstück: Höhe = weiche Erdhöhe + feines Rauschen
   HS2[q]=h;
   if(pol&&G.eis(sI,fx&~7,fy&~7,true)>0)b=12;
   else if(h<0)b=ks>127?11:h<-600?0:1;
   else if(h<24&&ks<=127)b=2;
   else if(ueb){var hz=G.mix(seed^Math.imul(fx>>7,0x2c9277b5)^Math.imul(fy>>7,0x5bd1e995)),ux=umF(fx+(hz&511)-256)>>10,uy=(fy+((hz>>>9)&511)-256)>>10;   // Grenzen leicht ausgefranst
    uy=uy<0?0:uy>=GH?GH-1:uy;b=U[uy*GW+ux];if(!binnen(b))b=U[zy*GW+(fx>>10)];if(!binnen(b))b=5}
   else{if(G.N2B&&A.zon)G.zonenV(A,seed,fx,fy,V);else G.neigung(tt,fa,h,V);G.punkt(seed,fx,fy,P,0);b=G.klasse(P,0,V,0,ho>>6,0)}
   if(RE){var hq=G.mix(seed^0x7e1c5a3^Math.imul(fx>>7,0x2c9277b5)^Math.imul(fy>>7,0x5bd1e995)),rx=umF(fx+(hq&511)-256)>>10,ry=(fy+((hq>>>9)&511)-256)>>10;ry=ry<0?0:ry>=GH?GH-1:ry;RQ2[q]=RE.z[ry*GW+rx]}
   BI2[q]=b}}
 return j1}
// Mehrheit, Farben, Bildpunkte, Netz
function mehrheit(Bf,lod,U){var GS2=Bf.GS,BI2=Bf.BI,BQ2=Bf.BQ,ueb=U&&lod>=U_AB,i,j,k,q;
 // Weit draußen deckt eine Stichprobe viele Felder, die Flecken sind kleiner: Mehrheit je 3 × 3 (⅟256, ⅟512 einmal, ab ⅟1024 zweimal), wie die Region der Startplatz-Wahl
 var pass=ueb?0:lod>=10?2:lod>=8?1:0;
 for(var d=0;d<pass;d++){BQ2.set(BI2);for(j=1;j<GS2-1;j++)for(i=1;i<GS2-1;i++){q=j*GS2+i;if(!binnen(BQ2[q]))continue;for(k=0;k<18;k++)ZB[k]=0;var mb=BQ2[q],mz=0;
  for(var v=-1;v<=1;v++)for(var u=-1;u<=1;u++){var b2=BQ2[q+v*GS2+u];if(!binnen(b2))continue;if(++ZB[b2]>mz){mz=ZB[b2];mb=b2}}if(ZB[BQ2[q]]<mz)BI2[q]=mb}}
}
function fertig(Bf,G,A,seed,x0,y0,lod,F,U,RE,ohneMehrheit){var S2=Bf.S,GS2=Bf.GS,HS2=Bf.HS,BI2=Bf.BI,RQ2=Bf.RQ,COL2=Bf.COL,T=Bf.TAB,ueb=U&&lod>=U_AB,n=8<<lod,st=n/S2,i,j,k,q;
 if(!ohneMehrheit)mehrheit(Bf,lod,U);
 farben(Bf,lod,F,U,RE);var pal=F.pal;
 var px=new Uint32Array(IW*IH);for(k=0;k<IW*IH;k++){var t=T[k];if(t>=0)px[k]=pal[COL2[t]]}
 var r={w:IW,h:IH,ox:256,oy:0,px:px};if(ohneMehrheit&&N7H2)return r;   // N7h2: scharf malt das Netz im eigenen Zeitanteil (scharf → netz mit Bf)
 netz(G,A,seed,x0,y0,lod,n,F,px);
 return r}
// Farbnummer je Stichprobe (Bf.COL): Biomfarbe, Hangschatten (Licht von Westen), Reiche. N7h3: auch für die Kacheln des scharfen Globus.
function farben(Bf,lod,F,U,RE){var S2=Bf.S,GS2=Bf.GS,HS2=Bf.HS,BI2=Bf.BI,RQ2=Bf.RQ,COL2=Bf.COL,ueb=U&&lod>=U_AB,st=(8<<lod)/S2,i,j,q;
 var du=F.du,he=F.he,rm=S2>>7;   // Reichsmuster: grob jede 4. Stichprobe, scharf jede 8. (gleich viel Fläche)
 if(rm<1)rm=1;   // N7h3: Globus-Kacheln haben weniger als 128 Stichproben je Seite
 for(j=0;j<S2;j++)for(i=0;i<S2;i++){q=(j+M)*GS2+i+M;var b=BI2[q],c=ueb?UFARBE[b]:BFARBE[b];
  if(b>=2&&b<=9||b>=13){var gx=(HS2[q+1]-HS2[q-1])/(2*st),gy=(HS2[q+GS2]-HS2[q-GS2])/(2*st),sh=gx>T2?2:gx>T1?1:gx<-T2?-2:gx<-T1?-1:0;   // Licht von Westen wie im Bodenbild
   if(gy>T2)sh--;while(sh>0){c=he[c];sh--}while(sh<0){c=du[c];sh++}
   if(RE){var rr=RQ2[q];if(rr){var rc=RE.f[rr-1],m4=rm*4-1,h2=rm*2;if((RQ2[q+1]&&RQ2[q+1]!==rr)||(RQ2[q+GS2]&&RQ2[q+GS2]!==rr))c=du[rc];else if(((i&m4)===0&&(j&m4)===0)||((i&m4)===h2&&(j&m4)===h2))c=rc}}}
  COL2[j*S2+i]=c}}
function kachel(G,A,seed,x0,y0,lod,F,U,RE){seed=seed>>>0;x0=umF(x0);zeilen(K0,G,A,seed,x0,y0,lod,U,RE,0,K0.GS,0);return fertig(K0,G,A,seed,x0,y0,lod,F,U,RE)}
// N7h1 Weltansicht schärfer: scharfe Fassung eines Fernbilds als Auftrag in kleinen Zeitanteilen (Bildkern). 256 × 256 Stichproben (eine je Bildpunkt der
// Raute statt einer je 4 × 2), Höhe mit dem feinen Rauschen des Kartenstücks, also Küsten, Seen, Strand, Eis, Biomgrenzen und Hangschatten so fein wie auf
// der nahen Karte. Kosten fest je Bild (66.564 Stichproben), unabhängig von Ort und Weltgröße. Nur ein Auftrag rechnet zugleich (ein gemeinsamer Satz Felder).
// schritt(ms) rechnet bis zur Zeitgrenze weiter und meldet true, wenn fertig; bild() gibt dann das Bild. Ein neuer Auftrag verwirft den alten.
var S_SCHARF=256, Z_SCHRITT=4;
function feinVon(lod){var st=(8<<lod)/S_SCHARF,ld=3;while(ld<9&&(1<<ld)<2*st)ld++;return ld}   // kleinste Oktave, die zwei Stichproben überspannt
function scharf(G,A,seed,x0,y0,lod,F,U,RE){seed=seed>>>0;x0=umF(x0);if(!K1)K1=satz(S_SCHARF);var Bf=K1,j=0,fe=feinVon(lod),fertigB=null,farb=null,nf=null,mehr=false,uhr=typeof performance!=='undefined'?performance:Date;
 var auf={lod:lod,x0:x0,y0:y0,ms:0,schritte:0,netzMs:0,
  schritt:function(ms){var t=uhr.now();auf.schritte++;
   while(j<Bf.GS){j=zeilen(Bf,G,A,seed,x0,y0,lod,U,RE,j,j+Z_SCHRITT,fe);if(uhr.now()-t>=ms)break}
   if(j>=Bf.GS&&!mehr&&uhr.now()-t<ms){mehrheit(Bf,lod,U);mehr=true}                     // Mehrheit und Färben je in einem eigenen Zeitanteil
   if(mehr&&!farb&&uhr.now()-t<ms){farb=fertig(Bf,G,A,seed,x0,y0,lod,F,U,RE,true);if(!N7H2)fertigB=farb}
   if(farb&&!fertigB&&uhr.now()-t<ms){var tn=uhr.now();if(!nf)nf=netzFein(G,A,seed,x0,y0,lod,8<<lod,F,farb.px,Bf);   // N7h2: Flüsse und Straßen in Zeitanteilen, dann Seewege und Orte
    if(nf.weiter(t+ms)&&uhr.now()-t<ms){netz(G,A,seed,x0,y0,lod,8<<lod,F,farb.px,Bf);fertigB=farb}auf.netzMs+=uhr.now()-tn}
   auf.ms+=uhr.now()-t;return!!fertigB},
  bild:function(){return fertigB}};
 K1.wer=auf;return auf}
// Flüsse, Straßen, Seewege, Orte (nur Bildpunkte in der eigenen Raute, damit Nachbarbilder nichts überdecken)
function netz(G,A,seed,x0,y0,lod,n,F,px,Bf){var pal=F.pal,zn={n:0},fein=!!(Bf&&N7H2&&G.flussLinien);
 function P2(fx,fy,o){var dx=fx-x0;dx-=Math.round(dx/WF)*WF;var a=dx/n,b=(fy-y0)/n;o[0]=256+(a-b)*256;o[1]=(a+b)*128;return o}
 function pkt(x,y,c,r,ok){x=Math.round(x);y=Math.round(y);for(var v=0;v<r;v++)for(var u=0;u<r;u++){var X=x+u,Y=y+v;if(X<0||Y<0||X>=IW||Y>=IH)continue;var o=Y*IW+X;if(TAB[o]>=0&&(!ok||ok(o)))px[o]=c}}
 var p0=[0,0],p1=[0,0];
 function lin(ax,ay,bx,by,c,r,strich,ok){P2(ax,ay,p0);P2(bx,by,p1);var L=Math.hypot(p1[0]-p0[0],p1[1]-p0[1]);if(L>4000)return;var m=Math.max(1,Math.ceil(L*1.5));
  for(var s=0;s<=m;s++){zn.n++;if(strich&&(zn.n%8)>4)continue;pkt(p0[0]+(p1[0]-p0[0])*s/m-(r>>1),p0[1]+(p1[1]-p0[1])*s/m-(r>>1),c,r,ok)}}
 var za=Math.floor((x0-ZF)/ZF),ze=Math.floor((x0+n+ZF)/ZF),ya=Math.max(0,Math.floor((y0-ZF)/ZF)),ye=Math.min(GH-1,Math.floor((y0+n+ZF)/ZF)),x,y,i,k,v;
 var breit=lod<=6?2:1,fw=pal[BFARBE[10]];
 // N7h2: mit Bf (scharf) malt netzFein Flüsse und Straßen vorher in eigenen Zeitanteilen; hier nur Seewege und Orte wie bisher
 // Flüsse: Zellmitte → Mitte der Abflusszelle
 if(!fein)for(y=ya;y<=ye;y++)for(x=za;x<=ze;x++){i=y*GW+um(x);if(A.flu[i]<2||A.bio[i]<2||A.bio[i]===11||A.bio[i]===12)continue;var r0=A.dir[i]&7;if(r0>3)continue;
  lin(x*ZF+512,y*ZF+512,(x+G.DX[r0])*ZF+512,(y+G.DY[r0])*ZF+512,fw,A.flu[i]>3?breit:1,false)}
 // Seewege (gestrichelt, von der Mitte der Meereszelle zu ihren Ausgängen)
 for(y=ya;y<=ye;y++)for(x=za;x<=ze;x++){i=y*GW+um(x);var o=A.ort[i];if(A.bio[i]>=2||!(o>>4))continue;
  for(k=0;k<4;k++)if(o>>4>>k&1)lin(x*ZF+512,y*ZF+512,x*ZF+512+G.DX[k]*512,y*ZF+512+G.DY[k]*512,pal[F_SEE],1,true)}
 // Straßen: nah die echten Läufe aus dem Seed, weiter draußen von der Zellmitte zu den Ausgängen
 if(!fein)for(y=ya;y<=ye;y++)for(x=za;x<=ze;x++){i=y*GW+um(x);var wg=A.weg[i];if(!(wg&15)&&!(A.ort[i]&15))continue;
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

// N7h2 (27.11.2026): Flüsse und Straßen der scharfen Fassung, Lauf wie im Kartenstück (weltgen.js flussLinien, wegLinienFein), nur so fein, wie es Bildpunkte gibt:
// Breite aus der echten Flussbreite (HW) bzw. dem Rang, Wegpunkte höchstens alle 2 Bildpunkte, kleinste Flüsse (Klasse 1) nur, solange sie mindestens 0,4 Bildpunkte breit sind, größere
// immer (mindestens 1 Bildpunkt, wie im groben Bild),
// alle Ränge bis ⅟4096 (Pfade dünn, Straßen breiter, Reichsstraßen dunkler und am breitesten; Ausdünnen nach Rang erst mit N7d; PFAD_BIS), Flüsse malen nur auf Land der scharfen Fassung
// (Mündung endet an der feinen Küste). Kosten: Läufe der Erdzellen im Bild (fest je Stufe, nie von der Weltgröße abhängig). Notausschalter ?n7h2=0 (Bildkern).
var N7H2=true;
function n7h2An(b){N7H2=b!==false}
var PFAD_BIS=12;   // Pfade (Rang 1) bis zu dieser Stufe (12 = ⅟4096, also überall wie im groben Bild)
var PXF=286;   // Bildpunkte je Feld × n (Raute: ein Feld entlang einer Achse ≈ 286 / n Bildpunkte)
// Als Auftrag in Teilen: weiter(ende) malt Zelle für Zelle (erst alle Flüsse, dann alle Straßen) bis zur Zeitgrenze und meldet true, wenn fertig.
function stift(x0,y0,n,px){var zn=0,p0=[0,0],p1=[0,0];
 function P2(fx,fy,o){var dx=fx-x0;dx-=Math.round(dx/WF)*WF;var a=dx/n,b=(fy-y0)/n;o[0]=256+(a-b)*256;o[1]=(a+b)*128;return o}
 function pkt(x,y,c,r,ok){x=Math.round(x);y=Math.round(y);for(var v=0;v<r;v++)for(var u=0;u<r;u++){var X=x+u,Y=y+v;if(X<0||Y<0||X>=IW||Y>=IH)continue;var o=Y*IW+X;if(TAB[o]>=0&&(!ok||ok(o)))px[o]=c}}
 return function lin(ax,ay,bx,by,c,r,strich,ok){P2(ax,ay,p0);P2(bx,by,p1);var L=Math.hypot(p1[0]-p0[0],p1[1]-p0[1]);if(L>4000)return;
  var m=Math.max(1,Math.ceil(L*1.5/(r>2?r/2:1)));   // breite Linien: Punkte im Abstand einer halben Breite statt je Bildpunkt (gleiche Fläche, weniger Arbeit)
  for(var s=0;s<=m;s++){zn++;if(strich&&(zn%8)>4)continue;pkt(p0[0]+(p1[0]-p0[0])*s/m-(r>>1),p0[1]+(p1[1]-p0[1])*s/m-(r>>1),c,r,ok)}}}
function netzFein(G,A,seed,x0,y0,lod,n,F,px,Bf){var pal=F.pal,T=Bf.TAB,GS2=Bf.GS,BI2=Bf.BI,S2=Bf.S,HW=G.HW,lin=stift(x0,y0,n,px);
 var za=Math.floor((x0-ZF)/ZF),ze=Math.floor((x0+n+ZF)/ZF),ya=Math.max(0,Math.floor((y0-ZF)/ZF)),ye=Math.min(GH-1,Math.floor((y0+n+ZF)/ZF)),bw=ze-za+1,nz=bw*(ye-ya+1),z=0;
 var fw=pal[BFARBE[10]],land=function(o){var t=T[o];if(t<0)return false;var b=BI2[((t/S2|0)+M)*GS2+(t%S2)+M];return b>=2&&b<=10||b>=13};
 var schritt=Math.max(8,Math.round(2*n/PXF)),cS=pal[F_STRASSE],cR=pal[F.du[F_STRASSE]],uhr=typeof performance!=='undefined'?performance:Date;
 function fluss(x,y){var i=y*GW+um(x),k,v,l,L;if(A.bio[i]===12||(!A.flu[i]&&A.E[i]>=0))return;   // nur auf Land (Biom 2–9 und ab 13), Breite nach der Flussklasse
  L=G.flussLinien(seed,A,um(x),y);var vx=(x-um(x))*ZF;
  for(k=0;k<L.length;k++){l=L[k];var w=(2*HW[l.kl]+1)*PXF/n;if(w<.4&&l.kl<2)continue;var r=Math.max(1,Math.min(12,Math.round(w)));
   for(v=1;v<l.x.length;v++)lin(l.x[v-1]+vx,l.y[v-1],l.x[v]+vx,l.y[v],fw,r,false,land)}}
 function weg(x,y){var i=y*GW+um(x),k,v,l,L;if(!(A.weg[i]&15)&&!(A.ort[i]&15))return;   // nach Rang, Seewege und Fähren gestrichelt
  L=G.wegLinienFein(seed,A,um(x),y,schritt);var vx=(x-um(x))*ZF;
  for(k=0;k<L.length;k++){l=L[k];var kl=l.kl,c,r;if(kl<2&&lod>PFAD_BIS&&!l.see)continue;
   if(l.see){c=pal[F_SEE];r=1}else if(l.faehre){c=pal[F_FAEHRE];r=1}
   else if(kl>=3){c=cR;r=lod<=5?3:lod<=8?2:1}else if(kl===2){c=cS;r=lod<=6?2:1}else{c=pal[F_PFAD];r=1}
   for(v=1;v<l.x.length;v++)lin(l.x[v-1]+vx,l.y[v-1],l.x[v]+vx,l.y[v],c,r,!!(l.see||l.faehre))}}
 return{weiter:function(ende){while(z<2*nz){var q=z%nz,x=za+q%bw,y=ya+(q/bw|0);if(z<nz)fluss(x,y);else weg(x,y);z++;if((z&7)===0&&uhr.now()>=ende)break}return z>=2*nz}}}

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
function symbole(L,px,F,raute,bw,bh,z){var S=symBau(),pal=F.pal,W=raute?IW:bw,H=raute?IH:bh,o=[],i;z=z>1?z|0:1;   // N7h3: z = Vergrößerung (scharfer Globus: gleich groß wie im groben)
 for(i=0;i<L.length;i+=3)o.push(i);o.sort(function(a,b){return L[a+2]-L[b+2]||L[a+1]-L[b+1]});   // kleine zuerst, große obenauf
 for(var q=0;q<o.length;q++){i=o[q];var s=S[L[i+2]];if(!s)continue;var sx=L[i]-((s.w*z)>>1),sy=L[i+1]-((s.h*z)>>1);
  for(var y=0;y<s.h*z;y++){var Y=sy+y;if(Y<0||Y>=H)continue;for(var x=0;x<s.w*z;x++){var c=s.m[((y/z)|0)*s.w+((x/z)|0)];if(c<0)continue;var X=sx+x;if(X<0||X>=W)continue;var p=Y*W+X;
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
// N7h3: FEIN (oder null = wie vorher, Byte für Byte) = Kacheln der scharfen Erdtextur {L:[{k, T}], …} feinste zuerst; je Bildpunkt die feinste vorhandene Kachel, sonst das Erdbild.
function globus(tex,texD,W,H,R,lon0,lat0,s,rand,ORTE,F,FEIN){var j=globusAuftrag(tex,texD,W,H,R,lon0,lat0,s,rand,ORTE,F,FEIN);j.schritt(1e9);return j.bild()}
// N7h3: derselbe Globus als Auftrag in Zeitanteilen (Zeilen für Zeilen, Orte am Schluss). schritt(ms) → true wenn fertig, bild() → {w,h,px}.
function globusAuftrag(tex,texD,W,H,R,lon0,lat0,s,rand,ORTE,F,FEIN){var w=Math.ceil(W/s),h=Math.ceil(H/s),r=R/s,cx=W/2/s,cy=H/2/s,px=new Uint32Array(w*h),cl=Math.cos(lat0),sl=Math.sin(lat0),
  ZP=2*Math.PI,ra=(1+1.5/r)*(1+1.5/r),uhr=typeof performance!=='undefined'?performance:Date;
 var y0=Math.max(0,Math.floor(cy-r-2)),y1=Math.min(h,Math.ceil(cy+r+2)),x0=Math.max(0,Math.floor(cx-r-2)),x1=Math.min(w,Math.ceil(cx+r+2)),py=y0,fertigB=null;
 var FL=FEIN&&FEIN.L&&FEIN.L.length?FEIN.L:null,pal=F&&F.pal,du=F&&F.du;
 function zeile(py){var y=-(py+.5-cy)/r;for(var qx=x0;qx<x1;qx++){var x=(qx+.5-cx)/r,r2=x*x+y*y;if(r2>=1){if(r2<ra)px[py*w+qx]=rand;continue}
  var z=Math.sqrt(1-r2),la=Math.asin(y*cl+z*sl),lo=lon0+Math.atan2(x,z*cl-y*sl);
  if(FL){var u=lo/ZP*GW,v=(.5-la/Math.PI)*GH,c=-1;
   for(var l=0;l<FL.length;l++){var e=FL[l],k=e.k,KS=GK*k,sx=Math.floor(u*k)%(GW*k),sy=Math.floor(v*k);if(sx<0)sx+=GW*k;if(sy<0)sy=0;else if(sy>=GH*k)sy=GH*k-1;
    var tx=(sx/KS)|0,ty=(sy/KS)|0,d=e.T[ty*GTX+tx];if(d){c=d[(sy-ty*KS)*KS+sx-tx*KS];if(e.nr)e.nr[ty*GTX+tx]=FEIN.nr;break}}
   if(c>=0){px[py*w+qx]=z<.28?pal[du[c]]:pal[c];continue}}
  var col=Math.floor(lo/ZP*GW)%GW,row=Math.floor((.5-la/Math.PI)*GH);
  if(col<0)col+=GW;if(row<0)row=0;else if(row>=GH)row=GH-1;var t=row*GW+col;px[py*w+qx]=z<.28?texD[t]:tex[t]}}
 function orte(){if(ORTE&&F&&ORTE.length){var SL=[],dl;   // N7b1: Großstädte und Hauptstädte auf der Vorderseite der Kugel (ORTE = [Länge, Breite, Größe, …] im Bogenmaß)
  for(var k=0;k<ORTE.length;k+=3){var la=ORTE[k+1],cp=Math.cos(la);dl=ORTE[k]-lon0;var gx=cp*Math.sin(dl),gy=cl*Math.sin(la)-sl*cp*Math.cos(dl),gz=sl*Math.sin(la)+cl*cp*Math.cos(dl);
   if(gz<.3)continue;SL.push(Math.round(cx+gx*r-.5),Math.round(cy-gy*r-.5),ORTE[k+2]+10)}
  if(SL.length)symbole(SL,px,F,false,w,h,FEIN&&FEIN.z)}}
 var auf={ms:0,schritte:0,schritt:function(ms){if(fertigB)return true;var t=uhr.now();auf.schritte++;
   while(py<y1){zeile(py++);if((py&7)===0&&uhr.now()-t>=ms)break}
   if(py>=y1){orte();fertigB={w:w,h:h,px:px}}auf.ms+=uhr.now()-t;return!!fertigB},
  bild:function(){return fertigB}};
 return auf}
// N7h3 Globus schärfer: Kacheln der Erdtextur, je GK × GK Erdzellen (8 × 8 = 8.192 × 8.192 Felder, genau ein Fernbild ⅟1024), k = 2, 4 oder 8 Stichproben je
// Erdzelle und Richtung. Gerechnet mit derselben Rechnung wie die scharfen Fernstufen ab ⅟1024 (zeilen, Übersichtsfarben, feine Küsten, Seen, Eis, Hangschatten,
// Reiche), achsparallel statt als Raute, also passen Globus und ⅟4096 zusammen. Daten: eine Farbnummer je Stichprobe ((8k)² Byte). Kosten fest je Kachel
// (höchstens 68 × 68 Stichproben mit Rand), unabhängig von Ort und Weltgröße.
var GK=8, GTX=GW/GK, GTY=Math.ceil(GH/GK), GLOD=10, GSATZ={};
function globusStufe(R,s){var ppz=2*Math.PI*R/GW/s;return ppz>4?8:ppz>2?4:2}   // Stichproben je Erdzelle nach Bildpunkten je Erdzelle am Äquator
function globusKachel(G,A,seed,tx,ty,k,F,U,RE){seed=seed>>>0;var S2=GK*k,Bf=GSATZ[S2]||(GSATZ[S2]=satz(S2)),x0=tx*GK*ZF,y0=ty*GK*ZF,st=(8<<GLOD)/S2,j=0,daten=null,
  fe=3,uhr=typeof performance!=='undefined'?performance:Date;while(fe<9&&(1<<fe)<2*st)fe++;
 var auf={tx:tx,ty:ty,k:k,ms:0,schritte:0,schritt:function(ms){if(daten)return true;var t=uhr.now();auf.schritte++;Bf.wer=auf;
   while(j<Bf.GS){j=zeilen(Bf,G,A,seed,x0,y0,GLOD,U,RE,j,j+Z_SCHRITT,fe);if(uhr.now()-t>=ms)break}
   if(j>=Bf.GS&&uhr.now()-t<ms){farben(Bf,GLOD,F,U,RE);daten=Bf.COL.slice()}auf.ms+=uhr.now()-t;return!!daten},
  daten:function(){return daten}};
 return auf}
// Kacheln, die der Globus mit dieser Ansicht zeigt (Vorderseite), Bildmitte zuerst: [Nummer ty·GTX+tx, …]. Kosten nur von der Bildgröße (Raster alle 3 Bildpunkte).
function globusBedarf(W,H,R,lon0,lat0,s,k){var w=Math.ceil(W/s),h=Math.ceil(H/s),r=R/s,cx=W/2/s,cy=H/2/s,cl=Math.cos(lat0),sl=Math.sin(lat0),ZP=2*Math.PI,KS=GK*k,
  D=new Map(),SCH=3;
 for(var py=Math.max(0,Math.floor(cy-r));py<Math.min(h,Math.ceil(cy+r));py+=SCH){var y=-(py+.5-cy)/r;for(var qx=Math.max(0,Math.floor(cx-r));qx<Math.min(w,Math.ceil(cx+r));qx+=SCH){
  var x=(qx+.5-cx)/r,r2=x*x+y*y;if(r2>=1)continue;var z=Math.sqrt(1-r2),la=Math.asin(y*cl+z*sl),lo=lon0+Math.atan2(x,z*cl-y*sl),
   sx=Math.floor(lo/ZP*GW*k)%(GW*k),sy=Math.floor((.5-la/Math.PI)*GH*k);if(sx<0)sx+=GW*k;if(sy<0)sy=0;else if(sy>=GH*k)sy=GH*k-1;
  var n=((sy/KS)|0)*GTX+((sx/KS)|0),ab=(qx-cx)*(qx-cx)+(py-cy)*(py-cy),a=D.get(n);if(a==null||ab<a)D.set(n,ab)}}
 var L=[];D.forEach(function(ab,n){L.push([ab,n])});L.sort(function(a,b){return a[0]-b[0]||a[1]-b[1]});return L.map(function(e){return e[1]})}
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
var FB={n7h2An:n7h2An,groesseAn:groesseAn,globusOrte:globusOrte,symbole:symbole,SYM_ROH:SYM_ROH,miniAn:miniAn,MINI_BIS:MINI_BIS,ortNr:ortNr,reicheErde:reicheErde,S:S,IW:IW,IH:IH,MAX:MAX,WEGE_BIS:WEGE_BIS,TAB:TAB,kachel:kachel,scharf:scharf,S_SCHARF:S_SCHARF,feinH:feinH,uebersicht:uebersicht,UFARBE:UFARBE,U_AB:U_AB,globus:globus,globusAuftrag:globusAuftrag,globusKachel:globusKachel,globusBedarf:globusBedarf,globusStufe:globusStufe,GK:GK,GTX:GTX,GTY:GTY,aufGlobus:aufGlobus,dunkler:dunkler,weich:weich};
if(typeof module!=='undefined'&&module.exports)module.exports=FB;else root.AT3FERN=FB;
})(typeof self!=='undefined'?self:this);
