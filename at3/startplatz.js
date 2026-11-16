// WAS DIE DATEI TUT: Rechnung für die Startplatz-Wahl von Arena Theory 3.0 (Schritt G4c): Erdbild (300 × 300, ein Punkt je Erdzelle, mit Orten und Straßen),
// Regionsbild (30 × 30 Erdzellen als 240 × 240 Punkte, ein Punkt = 128 Felder, Biom echt gemischt wie im Kartenstück, Straßen als Linien, Orte als Quadrate),
// trockenes Feld nahe einem angetippten Punkt (aus dem echten Kartenstück), nächster Ort mit Name und ein zufälliger Platz an Land.
// Kerne: läuft nur im Bildkern (bildkern.js, Hintergrundkern), nie auf dem Hauptkern (Regel 13). Kein Spielzufall: „Surprise me“ bekommt seine Zahl vom Hauptkern.
// Riesenwelt (Regel 14): Kosten fest (Erdbild 90.000 Punkte, Region 57.600 Stichproben, Platzsuche höchstens 25 Kartenstücke), egal wo und wie groß die Welt ist.
// Wiederverwendet: Biomfarben, Netzfarben und Straßenläufe der Weltansicht (menue/weltansicht.js, W1b), Biomregel des Kartenstücks (weltgen.js punkt/klasse/neigung),
// Ortsnamen (ortsnamen.js), Palette AT3-64 (nur Palettenfarben).
(function(root){
'use strict';
var GE=300, N=GE*GE, ZF=1024, ST=64, FELDER=ST*ST, REGION=30, RP=240, RS=ZF*REGION/RP;      // RS = Felder je Regionspunkt (128)
var BFARBE=[39,40,46,62,19,15,8,11,23,5,42,41];                                               // wie Weltansicht: Biom → Farbnummer (Mitte der Reihe)
var OFARBE=[0,53,37,48,32], F_PFAD=12, F_STRASSE=47, F_SEE=43, F_FAEHRE=48;

function land(b){return b>1&&b<10}
// Sichere Landzelle: hoch genug oder ganz von Land umgeben. Flache Küstenzellen sind im echten Kartenstück oft Meer (Messung G4c: bis gut die Hälfte).
function sicher(A,i){if(!land(A.bio[i]))return false;if(A.E[i]>=128)return true;var x=i%GE,y=(i/GE)|0;
 return x>0&&y>0&&x<GE-1&&y<GE-1&&land(A.bio[i-1])&&land(A.bio[i+1])&&land(A.bio[i-GE])&&land(A.bio[i+GE])}
// ── Erdbild: Biom je Zelle mit Hangschatten, Fluss, dazu Orte, Straßen und Seewege als Punkte (wie Weltansicht Erde + Netz) ──
function erdBild(A,F){var d=new Uint32Array(N),pal=F.pal;
 for(var i=0;i<N;i++){var b=A.flu[i]>1?10:A.bio[i],j=i>GE?i-GE-1:i,dh=A.E[i]-A.E[j],c=BFARBE[b];if(land(b))c+=dh>120?1:dh<-120?-1:0;d[i]=pal[c];
  var o=A.ort?A.ort[i]&15:0,w=A.weg?A.weg[i]:0;
  if(o)d[i]=pal[OFARBE[o]];else if(w&15)d[i]=pal[w&64?F_FAEHRE:(w>>4&3)>1?F_STRASSE:F_PFAD];else if(A.ort&&A.ort[i]>>4&&A.bio[i]<2&&((i%GE+((i/GE)|0))&1))d[i]=pal[F_SEE]}
 return d}

// ── Regionsbild ──
function ecke(z){return Math.max(0,Math.min(GE-REGION,z-(REGION>>1)))}
function punkt(d,x,y,c,r){x=Math.round(x);y=Math.round(y);for(var v=0;v<r;v++)for(var u=0;u<r;u++){var X=x+u,Y=y+v;if(X>=0&&Y>=0&&X<RP&&Y<RP)d[Y*RP+X]=c}}
function linie(d,x0,y0,x1,y1,c,r,strich,z){var n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)*2));
 for(var k=0;k<=n;k++){z.n++;if(strich&&(z.n%8)>4)continue;punkt(d,x0+(x1-x0)*k/n-(r>>1),y0+(y1-y0)*k/n-(r>>1),c,r)}}
function regionBild(G,seed,A,rx,ry,F){seed=seed>>>0;var d=new Uint32Array(RP*RP),M=new Uint8Array(RP*RP),Z=new Int32Array(12),pal=F.pal,P=new Int32Array(64),V=new Int32Array(8),vz=-1,x,y,i,k;
 for(y=0;y<RP;y++)for(x=0;x<RP;x++){var X=rx*ZF+x*RS+(RS>>1),Y=ry*ZF+y*RS+(RS>>1),z=(Y>>10)*GE+(X>>10),b=A.bio[z];
  if(land(b)){if(z!==vz){G.neigung(A.tmp[z],A.feu[z],A.E[z],V);vz=z}G.punkt(seed,X,Y,P,0);b=G.klasse(P,0,V,0,0,0)}
  M[y*RP+x]=b}
 // Mehrheit je 3 × 3 (zweimal): ein Punkt deckt 128 Felder, die Flecken sind oft kleiner; ohne Glätten wirkt die Region wie Rauschen. Wasser der Erdzelle bleibt.
 for(var dg=0;dg<2;dg++){var Q=M.slice();for(y=1;y<RP-1;y++)for(x=1;x<RP-1;x++){i=y*RP+x;if(!land(Q[i]))continue;for(k=0;k<12;k++)Z[k]=0;var mb=Q[i],mz=0;
  for(var v=-1;v<=1;v++)for(var u=-1;u<=1;u++){var q2=Q[i+v*RP+u];if(q2===10||q2<2)continue;if(++Z[q2]>mz){mz=Z[q2];mb=q2}}if(Z[Q[i]]<mz)M[i]=mb}}
 for(i=0;i<RP*RP;i++)d[i]=pal[BFARBE[M[i]]];
 // Flüsse grob (Zelle mit Fluss: Linie zur Abflussrichtung, Breite nach Flussgröße)
 var s=RP/REGION,zz={n:0};
 if(A.dir)for(y=ry;y<ry+REGION;y++)for(x=rx;x<rx+REGION;x++){i=y*GE+x;if(A.flu[i]<2||!land(A.bio[i]))continue;var r0=A.dir[i];if(r0>3)continue;
  linie(d,(x-rx+.5)*s,(y-ry+.5)*s,(x-rx+.5+G.DX[r0])*s,(y-ry+.5+G.DY[r0])*s,pal[BFARBE[10]],A.flu[i]>3?2:1,false,zz)}
 // Seewege (wie Weltansicht: von der Mitte der Meereszelle zu ihren Ausgängen, gestrichelt)
 for(y=ry;y<ry+REGION;y++)for(x=rx;x<rx+REGION;x++){i=y*GE+x;var o=A.ort[i];if(A.bio[i]>=2||!(o>>4))continue;var mx=(x-rx+.5)*s,my=(y-ry+.5)*s;
  for(k=0;k<4;k++)if(o>>4>>k&1)linie(d,mx,my,mx+(k===0?s/2:k===2?-s/2:0),my+(k===1?s/2:k===3?-s/2:0),pal[F_SEE],1,true,zz)}
 // Straßen, Pfade, Fähren: echte Läufe aus dem Seed (13 Punkte je Zelle)
 var f=RP/(REGION*ZF);
 for(y=ry;y<ry+REGION;y++)for(x=rx;x<rx+REGION;x++){i=y*GE+x;if(!(A.weg[i]&15)&&!(A.ort[i]&15))continue;var L=G.wegLinien(seed,A,x,y);
  for(k=0;k<L.length;k++){var l=L[k],c=pal[l.see?F_SEE:l.faehre?F_FAEHRE:l.kl>1?F_STRASSE:F_PFAD],r=l.kl>1&&!l.see?2:1;
   for(var q=1;q<l.x.length;q++)linie(d,(l.x[q-1]-rx*ZF)*f,(l.y[q-1]-ry*ZF)*f,(l.x[q]-rx*ZF)*f,(l.y[q]-ry*ZF)*f,c,r,!!(l.see||l.faehre),zz)}}
 // Orte als Quadrate mit dunklem Rand (Städte größer)
 for(y=ry;y<ry+REGION;y++)for(x=rx;x<rx+REGION;x++){var a=A.ort[y*GE+x]&15;if(!a)continue;var p=G.ortPunkt(seed,A,x,y),gr=a===2||a===4?6:4,px=(p[0]-rx*ZF)*f-gr/2,py=(p[1]-ry*ZF)*f-gr/2;
  punkt(d,px-1,py-1,pal[F.dunkel],gr+2);punkt(d,px,py,pal[OFARBE[a]],gr)}
 return d}

// ── Trockenes Feld nahe (x, y): echtes Kartenstück rechnen, spiralförmig suchen; erst das eigene Stück, dann die Nachbarn bis Abstand 2 ──
function trocken(G,seed,A,x,y,buf){var cx0=x>>6,cy0=y>>6,best=null,bd=1e18;
 for(var ring=0;ring<=2&&!best;ring++)for(var dy=-ring;dy<=ring;dy++)for(var dx=-ring;dx<=ring;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==ring)continue;
  var cx=cx0+dx,cy=cy0+dy;if(cx<0||cy<0||cx>=G.SEITE||cy>=G.SEITE)continue;
  G.ausschnitt(A,cx,cy,buf);G.gelaende({seed:seed>>>0,cx:cx,cy:cy,daten:buf});
  for(var j=0;j<FELDER;j++){var b=buf[FELDER*2+j],w=buf[FELDER*3+j];if(!land(b)||w===5||w===7)continue;
   var fx=cx*ST+(j&63),fy=cy*ST+(j>>6),e=(fx-x)*(fx-x)+(fy-y)*(fy-y);if(e<bd){bd=e;best={x:fx,y:fy,bio:b,weg:w}}}}
 return best}
// Nächster Ort (Zellen im Umkreis 3) mit Name, Art und Abstand in Feldern
function naechsterOrt(G,ON,seed,A,x,y){var zx=x>>10,zy=y>>10,best=null,bd=1e18;
 for(var v=-3;v<=3;v++)for(var u=-3;u<=3;u++){var X=zx+u,Y=zy+v;if(X<0||Y<0||X>=GE||Y>=GE)continue;var i=Y*GE+X,a=A.ort[i]&15;if(!a)continue;
  var p=G.ortPunkt(seed>>>0,A,X,Y),e=(p[0]-x)*(p[0]-x)+(p[1]-y)*(p[1]-y);if(e<bd){bd=e;best={name:ON?ON.name(seed>>>0,i,a):'',art:a,weit:Math.round(Math.sqrt(e)),x:p[0],y:p[1]}}}
 return best}
// Platz zum angetippten Punkt: erst trockenes Feld in der Nähe; findet sich keins (flache Küste), dann zum nächsten Punkt einer sicheren Zelle im Umkreis 2,
// aber nur, wenn an der Stelle überhaupt Land ist (angetippte Zelle oder ein direkter Nachbar). Mitten im Meer: kein Platz.
function platz(G,ON,seed,A,x,y,buf){x=Math.max(0,Math.min(GE*ZF-1,x|0));y=Math.max(0,Math.min(GE*ZF-1,y|0));var t=trocken(G,seed,A,x,y,buf),zx=x>>10,zy=y>>10;
 if(!t){var nah=false,u,v;for(v=-1;v<=1;v++)for(u=-1;u<=1;u++){var X=zx+u,Y=zy+v;if(X>=0&&Y>=0&&X<GE&&Y<GE&&land(A.bio[Y*GE+X]))nah=true}
  if(nah){var bx=-1,by=-1,bd=1e18;for(v=-2;v<=2;v++)for(u=-2;u<=2;u++){X=zx+u;Y=zy+v;if(X<0||Y<0||X>=GE||Y>=GE||!sicher(A,Y*GE+X))continue;
    var px=Math.max(X*ZF+96,Math.min(X*ZF+ZF-97,x)),py=Math.max(Y*ZF+96,Math.min(Y*ZF+ZF-97,y)),e=(px-x)*(px-x)+(py-y)*(py-y);if(e<bd){bd=e;bx=px;by=py}}
   if(bx>=0)t=trocken(G,seed,A,bx,by,buf)}}
 if(!t)return{ok:false,weit:-1};t.ok=true;t.weit=Math.round(Math.hypot(t.x-x,t.y-y));t.ort=naechsterOrt(G,ON,seed,A,t.x,t.y);return t}
// Zufälliger Platz an Land: r1 wählt die Zelle (erste Landzelle ab r1 mod N), r2 den Punkt darin. Zahlen kommen vom Hauptkern (kein Spielzufall).
function zufall(A,r1,r2){for(var k=0;k<N;k++){var i=((r1>>>0)+k)%N;if(sicher(A,i))return{zx:i%GE,zy:(i/GE)|0,x:(i%GE)*ZF+64+(r2>>>0)%(ZF-128),y:((i/GE)|0)*ZF+64+((r2>>>0)>>>10)%(ZF-128)}}
 return null}

var SP={GE:GE,REGION:REGION,RP:RP,RS:RS,ZF:ZF,land:land,sicher:sicher,erdBild:erdBild,regionBild:regionBild,ecke:ecke,trocken:trocken,naechsterOrt:naechsterOrt,platz:platz,zufall:zufall};
if(typeof module!=='undefined'&&module.exports)module.exports=SP;else root.AT3STARTPLATZ=SP;
})(typeof self!=='undefined'?self:this);
