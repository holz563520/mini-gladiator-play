// WAS DIE DATEI TUT: Rechnung für die Startplatz-Wahl von Arena Theory 3.0 (Schritt G4c): Erdbild (600 × 300, ein Punkt je Erdzelle, mit Orten und Straßen),
// Regionsbild (30 × 30 Erdzellen als 240 × 240 Punkte, ein Punkt = 128 Felder, Biom echt gemischt wie im Kartenstück, Straßen als Linien, Orte als Quadrate),
// trockenes Feld nahe einem angetippten Punkt (aus dem echten Kartenstück), die 5 nächsten Orte mit Name, Richtung und Anschluss (N3), Klimazone und ein zufälliger Platz an Land.
// Kerne: läuft nur im Bildkern (bildkern.js, Hintergrundkern), nie auf dem Hauptkern (Regel 13). Kein Spielzufall: „Surprise me“ bekommt seine Zahl vom Hauptkern.
// W1c Runde Welt: Die Region läuft in x über die Naht (rx darf negativ sein oder über den Rand reichen), Platzsuche und nächster Ort ebenso; auf dem Eis der
// Pole gibt es keinen Platz (Erd-Biom 12), „Surprise me“ wählt nie Eis.
// Riesenwelt (Regel 14): Kosten fest (Erdbild 180.000 Punkte, Region 57.600 Stichproben, Platzsuche höchstens 25 Kartenstücke), egal wo und wie groß die Welt ist.
// Wiederverwendet: Biomfarben, Netzfarben und Straßenläufe der Weltansicht (menue/weltansicht.js, W1b), Biomregel des Kartenstücks (weltgen.js punkt/klasse/neigung),
// Ortsnamen (ortsnamen.js), Palette AT3-64 (nur Palettenfarben).
(function(root){
'use strict';
var GW=600, GH=300, N=GW*GH, ZF=1024, WF=GW*ZF, HF=GH*ZF, SX=9600, ST=64, FELDER=ST*ST, REGION=30, RP=240, RS=ZF*REGION/RP;      // RS = Felder je Regionspunkt (128)
var BFARBE=[39,40,46,62,19,15,8,11,23,5,42,41,6,18,61,45,14,16];                                             // 12 Eis: hellste Stufe der Schneereihe
function um(z){z%=GW;return z<0?z+GW:z}                                               // wie Weltansicht: Biom → Farbnummer (Mitte der Reihe)
var ORTE=5;                                                                           // N3: so viele Orte nennt die Auskunft (Entscheidung Thomas)
var OFARBE=[0,53,37,48,32], F_PFAD=12, F_STRASSE=47, F_SEE=43, F_FAEHRE=48;

function land(b){return b>1&&b<10||b>=13}                                   // N2c: 13–17 neue Land-Biome
// Sichere Landzelle: hoch genug oder ganz von Land umgeben. Flache Küstenzellen sind im echten Kartenstück oft Meer (Messung G4c: bis gut die Hälfte).
function sicher(A,i){if(!land(A.bio[i]))return false;if(A.E[i]>=128)return true;var x=i%GW,y=(i/GW)|0;
 return y>0&&y<GH-1&&land(A.bio[y*GW+um(x-1)])&&land(A.bio[y*GW+um(x+1)])&&land(A.bio[i-GW])&&land(A.bio[i+GW])}
// ── Erdbild: Biom je Zelle mit Hangschatten, Fluss, dazu Orte, Straßen und Seewege als Punkte (wie Weltansicht Erde + Netz) ──
// U (16.11.2026, freiwillig): Übersichtsbiome je Zelle (fernbild.uebersicht) mit den Übersichtsfarben UF statt des Großklima-Bioms (Globus);
// dann nur große Flüsse und keine Pfade (Straßen, Fähren, Seewege und Orte bleiben), damit die Biome von oben zu sehen sind.
function erdBild(A,F,U,UF){var d=new Uint32Array(N),pal=F.pal,FA=U?UF:BFARBE;
 for(var i=0;i<N;i++){var b0=U?U[i]:A.bio[i],b=A.flu[i]>(U?3:1)&&A.bio[i]!==12?10:b0,j=i>=GW?i-GW-(i%GW?1:1-GW):i,dh=A.E[i]-A.E[j],c=FA[b];if(land(b))c+=dh>120?(U&&b===9?0:1):dh<-120?-1:0;d[i]=pal[c];
  var o=A.ort?A.ort[i]&15:0,w=A.weg?A.weg[i]:0;
  if(o)d[i]=pal[OFARBE[o]];else if(w&15&&!(U&&(w>>4&3)<2&&!(w&64)))d[i]=pal[w&64?F_FAEHRE:(w>>4&3)>1?F_STRASSE:F_PFAD];else if(A.ort&&A.ort[i]>>4&&A.bio[i]<2&&((i%GW+((i/GW)|0))&1))d[i]=pal[F_SEE]}
 return d}

// ── Regionsbild ──
function eckeX(z){return z-(REGION>>1)}                                                         // über die Naht: darf negativ sein oder rechts hinausreichen
function eckeY(z){return Math.max(0,Math.min(GH-REGION,z-(REGION>>1)))}
function punkt(d,x,y,c,r){x=Math.round(x);y=Math.round(y);for(var v=0;v<r;v++)for(var u=0;u<r;u++){var X=x+u,Y=y+v;if(X>=0&&Y>=0&&X<RP&&Y<RP)d[Y*RP+X]=c}}
function linie(d,x0,y0,x1,y1,c,r,strich,z){var n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)*2));
 for(var k=0;k<=n;k++){z.n++;if(strich&&(z.n%8)>4)continue;punkt(d,x0+(x1-x0)*k/n-(r>>1),y0+(y1-y0)*k/n-(r>>1),c,r)}}
function regionBild(G,seed,A,rx,ry,F){seed=seed>>>0;var d=new Uint32Array(RP*RP),M=new Uint8Array(RP*RP),Z=new Int32Array(18),pal=F.pal,P=new Int32Array(64),V=new Int32Array(8),vz=-1,x,y,i,k;
 for(y=0;y<RP;y++)for(x=0;x<RP;x++){var X=rx*ZF+x*RS+(RS>>1),Y=ry*ZF+y*RS+(RS>>1),z=(Y>>10)*GW+um(X>>10),b=A.bio[z];
  if(land(b)){if(G.N2B&&A.zon)G.zonenV(A,seed>>>0,X,Y,V);else if(z!==vz){G.neigung(A.tmp[z],A.feu[z],A.E[z],V);vz=z}G.punkt(seed,X,Y,P,0);b=G.klasse(P,0,V,0,0,0)}
  M[y*RP+x]=b}
 // Mehrheit je 3 × 3 (zweimal): ein Punkt deckt 128 Felder, die Flecken sind oft kleiner; ohne Glätten wirkt die Region wie Rauschen. Wasser der Erdzelle bleibt.
 for(var dg=0;dg<2;dg++){var Q=M.slice();for(y=1;y<RP-1;y++)for(x=1;x<RP-1;x++){i=y*RP+x;if(!land(Q[i]))continue;for(k=0;k<18;k++)Z[k]=0;var mb=Q[i],mz=0;
  for(var v=-1;v<=1;v++)for(var u=-1;u<=1;u++){var q2=Q[i+v*RP+u];if(q2===10||q2<2)continue;if(++Z[q2]>mz){mz=Z[q2];mb=q2}}if(Z[Q[i]]<mz)M[i]=mb}}
 for(i=0;i<RP*RP;i++)d[i]=pal[BFARBE[M[i]]];
 var zi=function(x,y){return y*GW+um(x)},vx=function(x){return(x-um(x))*ZF};                              // Zelle über die Naht; Verschiebung ihrer Weltfelder in die Lage der Region
 // Flüsse grob (Zelle mit Fluss: Linie zur Abflussrichtung, Breite nach Flussgröße)
 var s=RP/REGION,zz={n:0};
 if(A.dir)for(y=ry;y<ry+REGION;y++)for(x=rx;x<rx+REGION;x++){i=zi(x,y);if(A.flu[i]<2||!land(A.bio[i]))continue;var r0=A.dir[i];if(r0>3)continue;
  linie(d,(x-rx+.5)*s,(y-ry+.5)*s,(x-rx+.5+G.DX[r0])*s,(y-ry+.5+G.DY[r0])*s,pal[BFARBE[10]],A.flu[i]>3?2:1,false,zz)}
 // Seewege (wie Weltansicht: von der Mitte der Meereszelle zu ihren Ausgängen, gestrichelt)
 for(y=ry;y<ry+REGION;y++)for(x=rx;x<rx+REGION;x++){i=zi(x,y);var o=A.ort[i];if(A.bio[i]>=2||!(o>>4))continue;var mx=(x-rx+.5)*s,my=(y-ry+.5)*s;
  for(k=0;k<4;k++)if(o>>4>>k&1)linie(d,mx,my,mx+(k===0?s/2:k===2?-s/2:0),my+(k===1?s/2:k===3?-s/2:0),pal[F_SEE],1,true,zz)}
 // Straßen, Pfade, Fähren: echte Läufe aus dem Seed (13 Punkte je Zelle)
 var f=RP/(REGION*ZF);
 for(y=ry;y<ry+REGION;y++)for(x=rx;x<rx+REGION;x++){i=zi(x,y);if(!(A.weg[i]&15)&&!(A.ort[i]&15))continue;var L=G.wegLinien(seed,A,um(x),y),v0=vx(x)-rx*ZF;
  for(k=0;k<L.length;k++){var l=L[k],c=pal[l.see?F_SEE:l.faehre?F_FAEHRE:l.kl>1?F_STRASSE:F_PFAD],r=l.kl>1&&!l.see?2:1;
   for(var q=1;q<l.x.length;q++)linie(d,(l.x[q-1]+v0)*f,(l.y[q-1]-ry*ZF)*f,(l.x[q]+v0)*f,(l.y[q]-ry*ZF)*f,c,r,!!(l.see||l.faehre),zz)}}
 // Orte als Quadrate mit dunklem Rand (Städte größer)
 for(y=ry;y<ry+REGION;y++)for(x=rx;x<rx+REGION;x++){var a=A.ort[zi(x,y)]&15;if(!a)continue;var p=G.ortPunkt(seed,A,um(x),y),gr=a===2||a===4?6:4,px=(p[0]+vx(x)-rx*ZF)*f-gr/2,py=(p[1]-ry*ZF)*f-gr/2;
  punkt(d,px-1,py-1,pal[F.dunkel],gr+2);punkt(d,px,py,pal[OFARBE[a]],gr)}
 return d}

// ── Trockenes Feld nahe (x, y): echtes Kartenstück rechnen, spiralförmig suchen; erst das eigene Stück, dann die Nachbarn bis Abstand 2 ──
function trocken(G,seed,A,x,y,buf){var cx0=x>>6,cy0=y>>6,best=null,bd=1e18;
 for(var ring=0;ring<=2&&!best;ring++)for(var dy=-ring;dy<=ring;dy++)for(var dx=-ring;dx<=ring;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==ring)continue;
  var cu=cx0+dx,cx=((cu%SX)+SX)%SX,cy=cy0+dy;if(cy<0||cy>=G.SEITE_Y)continue;if(A.bio[(cy>>4)*GW+(cx>>4)]===12)continue;      // Stück über die Naht; im Eis kein Platz
  G.ausschnitt(A,cx,cy,buf);G.gelaende({seed:seed>>>0,cx:cx,cy:cy,daten:buf});
  for(var j=0;j<FELDER;j++){var b=buf[FELDER*2+j],w=buf[FELDER*3+j];if(!land(b)||w===5||w===7)continue;
   var fx=cu*ST+(j&63),fy=cy*ST+(j>>6),e=(fx-x)*(fx-x)+(fy-y)*(fy-y);if(e<bd){bd=e;best={x:cx*ST+(j&63),y:fy,bio:b,weg:w}}}}
 return best}
// Nächster Ort (Zellen im Umkreis 3) mit Name, Art und Abstand in Feldern
function naechsterOrt(G,ON,seed,A,x,y){return naechsteOrte(G,ON,seed,A,x,y,1)[0]||null}
// N3: die n nächsten Orte im Umkreis von 7 × 7 Erdzellen (fest 49 Zellen, egal wie groß die Welt), je Ort Name, Art, Entfernung in Feldern, Himmelsrichtung
// vom Platz aus (ri 0 = Norden, im Uhrzeigersinn in Achteln) und Anschluss ans Netz der Ortszelle (netz 0 keiner, 1 Pfad, 2 Straße, 3 Fähre).
function naechsteOrte(G,ON,seed,A,x,y,n){var zx=x>>10,zy=y>>10,L=[];
 for(var v=-3;v<=3;v++)for(var u=-3;u<=3;u++){var X=um(zx+u),Y=zy+v;if(Y<0||Y>=GH)continue;var i=Y*GW+X,a=A.ort[i]&15;if(!a)continue;
  var p=G.ortPunkt(seed>>>0,A,X,Y),dx=p[0]+(zx+u-X)*ZF-x,dy=p[1]-y,w=A.weg?A.weg[i]:0;
  L.push({e:dx*dx+dy*dy,i:i,art:a,weit:Math.round(Math.sqrt(dx*dx+dy*dy)),x:p[0],y:p[1],ri:(Math.round(Math.atan2(dx,-dy)/(Math.PI/4))+8)%8,
   netz:w&64?3:!(w&15)?0:((w>>4)&3)>1?2:1})}
 L.sort(function(a,b){return a.e-b.e||a.i-b.i});L.length=Math.min(L.length,n);
 return L.map(function(o){return{name:ON?ON.name(seed>>>0,o.i,o.art,A.vk):'',art:o.art,weit:o.weit,x:o.x,y:o.y,ri:o.ri,netz:o.netz}})}
// Platz zum angetippten Punkt: erst trockenes Feld in der Nähe; findet sich keins (flache Küste), dann zum nächsten Punkt einer sicheren Zelle im Umkreis 2,
// aber nur, wenn an der Stelle überhaupt Land ist (angetippte Zelle oder ein direkter Nachbar). Mitten im Meer: kein Platz.
function platz(G,ON,seed,A,x,y,buf){x=(((x|0)%WF)+WF)%WF;y=Math.max(0,Math.min(HF-1,y|0));var zx=x>>10,zy=y>>10;
 if(A.bio[zy*GW+zx]===12)return{ok:false,weit:-1,eis:true};                                                 // W1c: auf dem Eis der Pole kein Startplatz
 var t=trocken(G,seed,A,x,y,buf);
 if(!t){var nah=false,u,v;for(v=-1;v<=1;v++)for(u=-1;u<=1;u++){var X=um(zx+u),Y=zy+v;if(Y>=0&&Y<GH&&land(A.bio[Y*GW+X]))nah=true}
  if(nah){var bx=-1,by=-1,bd=1e18,bX=0,bY=0;for(v=-2;v<=2;v++)for(u=-2;u<=2;u++){X=zx+u;Y=zy+v;if(Y<0||Y>=GH||!sicher(A,Y*GW+um(X)))continue;
    var px=Math.max(X*ZF+96,Math.min(X*ZF+ZF-97,x)),py=Math.max(Y*ZF+96,Math.min(Y*ZF+ZF-97,y)),e=(px-x)*(px-x)+(py-y)*(py-y);if(e<bd){bd=e;bx=px;by=py;bX=X;bY=Y}}
   if(bx>=0){t=trocken(G,seed,A,bx,by,buf);
    if(!t){var P=G.ortPunkt(seed>>>0,A,um(bX),bY);t=trocken(G,seed,A,P[0]+(bX-um(bX))*ZF,P[1],buf)}}}}        // W1c: Zelle am steilen Polarmeer: der trockenste Punkt der Zelle (dort läge ihr Ort)
 if(!t)return{ok:false,weit:-1};var dx=Math.abs(t.x-x);if(dx>WF-dx)dx=WF-dx;t.ok=true;t.weit=Math.round(Math.hypot(dx,t.y-y));t.orte=naechsteOrte(G,ON,seed,A,t.x,t.y,ORTE);t.ort=t.orte[0]||null;
 var zi=(t.y>>10)*GW+(t.x>>10);t.zone=A.zon?A.zon[zi]:-1;t.zoneAnders=t.zone>=2&&!!G.Z_BIOM&&G.Z_BIOM[t.zone]!==t.bio;return t}   // N3: Klimazone der Erdzelle, anders als das Biom am Platz?
// Zufälliger Platz an Land: r1 wählt die Zelle (erste sichere Landzelle ab r1 mod N), r2 den Punkt darin. Zahlen kommen vom Hauptkern (kein Spielzufall).
// W1c: der Punkt liegt nahe dem trockensten Punkt der Zelle (dort läge ihr Ort), höchstens 80 Felder daneben: auch Zellen am steilen Polarmeer geben so einen Platz.
function zufall(G,seed,A,r1,r2){for(var k=0;k<N;k++){var i=((r1>>>0)+k)%N;if(!sicher(A,i))continue;var zx=i%GW,zy=(i/GW)|0,P=G.ortPunkt(seed>>>0,A,zx,zy);
  return{zx:zx,zy:zy,x:Math.max(zx*ZF+64,Math.min(zx*ZF+ZF-65,P[0]+(r2>>>0)%161-80)),y:Math.max(zy*ZF+64,Math.min(zy*ZF+ZF-65,P[1]+((r2>>>0)>>>10)%161-80))}}
 return null}

var SP={GW:GW,GH:GH,WF:WF,HF:HF,REGION:REGION,RP:RP,RS:RS,ZF:ZF,land:land,sicher:sicher,erdBild:erdBild,regionBild:regionBild,eckeX:eckeX,eckeY:eckeY,trocken:trocken,naechsterOrt:naechsterOrt,naechsteOrte:naechsteOrte,ORTE:ORTE,platz:platz,zufall:zufall};
if(typeof module!=='undefined'&&module.exports)module.exports=SP;else root.AT3STARTPLATZ=SP;
})(typeof self!=='undefined'?self:this);
