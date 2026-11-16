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
// fpwelt-Codes: 0 Wasser, 1 Sand, 2 Gras, 3 Wald, 4 Fels, 5 Schnee, 6 Weg, 7 Steg/Brücke, 8 Platz (Hof)
var VON_BIOM=[0,0,1,1,2,3,2,2,4,5,0,0,5];          // weltgen-Biome 0..12 → Code (Wüste wie Sand, Steppe/Sumpf/Tundra wie Gras fürs Muster)
var VON_WEG=[-1,6,6,7,1,7,8,0];                    // Wegschicht 1..7: Pfad, Straße, Brücke, Furt (begehbar, sieht nass aus), Steg, Ortsplatz, Fähre (Wasser)

// PF: {he, du} Farbtabellen des Bildkerns (eine Stufe heller/dunkler). hole(cx,cy) → Kartenstück (Uint8Array) oder null. ox,oy: linke obere Ecke auf der Welt (ox darf beliebig sein, läuft um). sperr: Uint8Array je Naturart (1 = sperrt).
// FP2a: BA = {hole(cx,cy) → Bau-Kartenstück (gepackt wie bau.stueck) oder null, BODEN, PUNKT} oder null: Wände, Türen, Tore auf die Kanten, Gebäudeböden in die Farben.
var BF=4096,Z_PLAN=1;
function bauen(BB,NAT,hole,seed,ox,oy,sperr,PF,frei,BA){                // G5b: frei(X,Y) = false auf Gebautem/Gerodetem (keine Natur)
var WX=BB.WX,WY=BB.WY,F=N+2,t0=Date.now();
 oy=Math.max(0,Math.min(WY-F,oy|0));ox=((ox|0)%WX+WX)%WX;
 var EH=new Float32Array(F*F),EB=new Uint8Array(F*F),EW=new Uint8Array(F*F),ES=new Uint8Array(F*F),fehlt=0;
 for(var j=0;j<F;j++)for(var i=0;i<F;i++){var X=(ox+i)%WX,Y=oy+j,p=hole(X>>6,Y>>6),e=j*F+i;
  if(!p){fehlt++;EH[e]=WL;continue}var s=BB.sicht(p),q=((Y&63)<<6)|(X&63);EH[e]=(s.H[q]-MEER)/16+WL;EB[e]=s.B[q];EW[e]=s.W[q];ES[e]=BB.stufe(s.H[q])}
 var h=new Float32Array(M*M),biom=new Uint8Array(M*M),basis=new Uint8Array(M*M),BF=BB.BFARBE,WF=BB.WFARBE;
 for(j=0;j<M;j++){var fy=j/U,jy=fy|0,b=fy-jy;if(jy>N-1&&j===M-1){jy=N-1;b=1}
  for(i=0;i<M;i++){var fx=i/U,ix=fx|0,a=fx-ix;if(ix>N-1){ix=N-1;a=1}var k=j*M+i,e0=jy*F+ix;
   h[k]=EH[e0]+(EH[e0+1]-EH[e0])*a+(EH[e0+F]-EH[e0])*b+(EH[e0]-EH[e0+1]-EH[e0+F]+EH[e0+F+1])*a*b;
   var fe=Math.min(N-1,Math.floor(fy))*F+Math.min(N-1,Math.floor(fx)),bb=EB[fe],wv=EW[fe],c=BF[bb]!=null?BF[bb]:BF[9],code=VON_BIOM[bb]!=null?VON_BIOM[bb]:5;
   if(wv===7){code=0;if(((ox+(fe%F))+(oy+((fe/F)|0)))&1)c=WF[7]}else if(wv){code=VON_WEG[wv];c=wv===4?BF[10]:WF[wv]}
   biom[k]=code;basis[k]=c}}
 // Farben je Höhenpunkt wie fpwelt.farben mit Muster: Licht von Nordwesten (Hang), leichte Streuung; he/du = eine Stufe heller/dunkler in der Palettenreihe.
 // Hier im Bildkern gerechnet, damit der Hauptkern beim Nachladen nichts rechnen muss (Regel 13).
 var farbe=new Uint8Array(M*M),he=PF.he,du=PF.du,z=12345;
 for(j=0;j<M;j++)for(i=0;i<M;i++){var k2=j*M+i,c2=basis[k2],b2=biom[k2],sh=0;
  if(b2!==0){var l=((i>0?h[k2-1]:h[k2])-(i<M-1?h[k2+1]:h[k2])+(j>0?h[k2-M]:h[k2])-(j<M-1?h[k2+M]:h[k2]))*U*.6;sh=Math.max(-2,Math.min(2,Math.round(l)))}
  z=(z*1103515245+12345)&0x7fffffff;var q2=z%7;if(b2===0)sh+=((i+j*3)%11===0)?1:0;else if(b2===7)sh+=(j%2)?-1:0;else sh+=q2<1?-1:q2>5&&(b2===2||b2===3)?1:0;
  while(sh>0){c2=he[c2];sh--}while(sh<0){c2=du[c2];sh++}farbe[k2]=c2}
 // Natur wie auf der Karte: Art je Feld, Versatz im Feld (Bildpunkte der Karte → Felder), Sperren nach Kollision der Kartei
 var ox2=[],oy2=[],oa=[],sperre=new Uint8Array(N*N);
 for(j=0;j<N;j++)for(i=0;i<N;i++){var e1=j*F+i,X2=(ox+i)%WX,Y2=oy+j,mn=Math.min(ES[e1],ES[e1+1],ES[e1+F],ES[e1+F+1]),mx=Math.max(ES[e1],ES[e1+1],ES[e1+F],ES[e1+F+1]);
  var t=NAT.art(seed,X2,Y2,EB[e1],EW[e1],mx-mn);if(t<0||(frei&&!frei(X2,Y2)))continue;var v=NAT.versatz(seed,X2,Y2),du=(v[0]/32+v[1]/16)/2,dv=(v[1]/16-v[0]/32)/2;
  ox2.push(i+.5+du);oy2.push(j+.5+dv);oa.push(t);if(sperr&&sperr[t])sperre[j*N+i]=1}
 var n=oa.length,wandX=new Uint8Array((N+1)*N),wandY=new Uint8Array(N*(N+1)),kanten=BA?gebaeude(BA,ox,oy,WX,WY,wandX,wandY,farbe,PF):0;
 return{format:'at3-fpwelt',ausschnitt:true,N:N,U:U,M:M,WL:WL,WANDH:1,ox:ox,oy:oy,h:h,biom:biom,farbe:farbe,kanten:kanten,
  wandX:wandX,wandY:wandY,sperre:sperre,objX:new Float32Array(ox2),objY:new Float32Array(oy2),objArt:new Uint8Array(oa),objN:n,fehlt:fehlt,ms:Date.now()-t0}}
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
// Felder (Puffer), die beim Verschicken ohne Kopie übergeben werden
function puffer(w){return[w.h.buffer,w.biom.buffer,w.farbe.buffer,w.wandX.buffer,w.wandY.buffer,w.sperre.buffer,w.objX.buffer,w.objY.buffer,w.objArt.buffer]}
// Kartenstücke, die ein Ausschnitt braucht (für den Bildkern: vorher rechnen)
function stuecke(BB,ox,oy){var WX=BB.WX,WY=BB.WY,F=N+2,L=[],x0,y0;oy=Math.max(0,Math.min(WY-F,oy|0));ox=((ox|0)%WX+WX)%WX;
 for(y0=oy>>6;y0<=(oy+F-1)>>6;y0++)for(x0=ox>>6;x0<=(ox+F-1)>>6;x0++)L.push([x0%BB.SX,y0]);return L}

var FA={N:N,U:U,M:M,WL:WL,bauen:bauen,puffer:puffer,stuecke:stuecke,VON_BIOM:VON_BIOM,VON_WEG:VON_WEG};
if(typeof module!=='undefined'&&module.exports)module.exports=FA;else root.AT3FPA=FA;
})(typeof self!=='undefined'?self:this);
