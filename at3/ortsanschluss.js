// WAS DIE DATEI TUT: Weltstraßen im Hangring an den passenden Ausgang des Ortsbilds anschließen (AT3 N7a5b1, enthält N7a4b2, Thomas 25.11.2026).
// Eine gemeinsame Rechnung je Ort (im Ortskern, Hintergrund), unabhängig vom Kartenstück: aus der Wassermaske samt Weltwegen (ortsbild.js wasserMaske, Schicht w)
// werden die Weltwege im Hangring gesucht, die auf das Ortsbild zulaufen (Zulauf: berührt den Rand des Ortsbilds). Ihr Stück im Hangring fällt weg; von jedem
// Eintritt in den Hangring führt ein weicher Bogen ganz im Hangring (notfalls um die Ecke) zum passenden Ausgang am Bildrand (lage().ausgaenge):
//   Straße (Klasse 2) → Ausgang einer Hauptstraße (Planzelle s), nicht an der Seite von Stinktor und Gräbertor (dort nur Pfade, Entscheidung Thomas 25.11.2026),
//   Pfad (Klasse 1) → jeder Ausgang (Straße oder Feldweg). Fluss- und Hafentore haben keinen Ausgang am Bildrand. Ausgang ohne Weltweg bleibt ohne Anschluss.
// Weltwege, die nur am Ort vorbeilaufen (berühren den Bildrand nicht), bleiben unverändert. Auf Wasser wird der Bogen Brücke/Furt (Fluss) bzw. Steg (See, Meer).
// Übergang: die letzten UE Felder vor dem Bildrand wechseln weich vom Weltweg zum Ortsweg (Punktmuster im Bodenbild, Farbe der Planzelle am Ausgang).
// Ergebnis: {x0, y0, n, liste} mit liste = Int32Array Paare [Feld im Ring (v·n + u), Wert]; Wert Bit 0–2 Wegart wie weltgen (0 kein Weg, 1 Pfad, 2 Straße,
// 3 Brücke, 4 Furt, 5 Steg), Bit 4–6 Übergangsstufe k (1 = am Bildrand … UE), ab Bit 8 Planzelle des Ausgangs + 1 (nur mit k). Ringfeld (0, 0) = Weltfeld (x0, y0).
// Bild (bodenbild.js über ortsflaeche.js weg) und Wegsuche (ortssperre.js lupe.weg → begehbar.js) lesen dieselbe Liste: Bild und Begehbarkeit gleich.
// Kosten: einmal je Ort im Ortskern, ein Durchgang über den Hangring ((W + 2R)² Felder, Hauptstadt rund 134.000), Liste meist wenige hundert Einträge.
// Notausschalter ?n7a5b1=0 (Ortskern rechnet nichts, alles wie vorher).
(function(root){
'use strict';
var UE=4, R_DEF=24, ANLAUF=6, GLATT=3, ABST=4, B4=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
var KLASSE=[0,1,2,1,1,1,0,1];   // Weltwegart → Klasse (Brücke, Furt, Steg, Fähre zählen als Pfad, falls im Lauf keine Straße liegt; 6 Ortsplatz nie im Ring)
var SEITEN={north:1,south:1,west:1,east:1};
// M = Maske mit Schicht w (Weltweg je Feld), L = lage(), P = Plan, R = Hangring, WX = Weltbreite in Feldern (Umbruch der x-Koordinate)
function rechnen(M,L,P,R,WX){R=R||R_DEF;var W=L.W,n=W+2*R,N=M.N,o=(N>>1)-(W>>1)-R,x0=L.x0-R,y0=L.y0-R;if(WX){x0%=WX;if(x0<0)x0+=WX}
 var st={zulauf:0,eintritte:0,anschluesse:0,ohne:0,entfernt:0,bogen:0,wasser:0,fluss:0,umweg:0,wege:[]};
 if(!M||!M.w||o<0||o+n>N)return{x0:x0,y0:y0,n:n,liste:new Int32Array(0),st:st,fehler:'maske'};
 var plan=function(a,b){return a>=R&&a<R+W&&b>=R&&b<R+W},ring=function(a,b){return a>=0&&b>=0&&a<n&&b<n&&!plan(a,b)},
  wg=function(a,b){return M.w[(b+o)*N+a+o]},wa=function(a,b){return M.m[(b+o)*N+a+o]&3},
  rand=function(a,b){return a===0||b===0||a===n-1||b===n-1},innen=function(a,b){return a>=R-1&&a<=R+W&&b>=R-1&&b<=R+W};
 var K=new Int32Array(n*n),a,b,s,q,V=new Map();K.fill(-1);
 // Zuläufe: zusammenhängende Weltwege im Ring (8 Nachbarn), die den Bildrand berühren
 var ZL=[];
 for(b=0;b<n;b++)for(a=0;a<n;a++){q=b*n+a;if(K[q]>=0||!ring(a,b)||!KLASSE[wg(a,b)])continue;var C=[q],id=ZL.length,anI=false;K[q]=id;
  for(s=0;s<C.length;s++){var p=C[s],pa=p%n,pb=(p/n)|0;if(innen(pa,pb))anI=true;
   for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){var na=pa+dx,nb=pb+dy;if((dx||dy)&&ring(na,nb)){var nq=nb*n+na;if(K[nq]<0&&KLASSE[wg(na,nb)]){K[nq]=id;C.push(nq)}}}}
  ZL.push({f:C,innen:anI})}
 var Lp=n-1-2*(R>>1),c=R>>1;
 // Lage auf der Mittellinie des Rings (Umlauf im Uhrzeigersinn ab der Ecke Nordwest)
 function um(a,b){var m=(n-1)/2,dx=a-m,dy=b-m;if(Math.abs(dy)>=Math.abs(dx))return dy<0?cl(a-c):2*Lp+cl(n-1-c-a);return dx>0?Lp+cl(b-c):3*Lp+cl(n-1-c-b)}
 function cl(t){return t<0?0:t>Lp?Lp:t}
 function abst(t1,t2){var d=Math.abs(t1-t2);return Math.min(d,4*Lp-d)}
 var ECKE=[[c,c],[n-1-c,c],[n-1-c,n-1-c],[c,n-1-c]];
 // Ausgänge mit Punkt direkt vor dem Bildrand (out) und Anlauf weiter draußen (vor)
 var stink={};if(P&&P.aussen){if(P.aussen.stinktor)stink[P.aussen.stinktor]=1;if(P.aussen.graebertor)stink[P.aussen.graebertor]=1}
 var AU=(L.ausgaenge||[]).filter(function(x){return SEITEN[x.seite]}).map(function(x){var i=x.i,j=x.j,an=Math.min(ANLAUF,R-3),o2,v2;
  if(x.seite==='north'){o2=[R+i,R-1];v2=[R+i,R-1-an]}else if(x.seite==='south'){o2=[R+i,R+W];v2=[R+i,R+W+an]}
  else if(x.seite==='west'){o2=[R-1,R+j];v2=[R-1-an,R+j]}else{o2=[R+W,R+j];v2=[R+W+an,R+j]}
  return{x:x,out:o2,vor:v2,t:um(o2[0],o2[1]),zelle:j*W+i,stink:!!stink[x.seite]}});
 function wahl(kl,t){var S=kl>=2?[AU.filter(function(e){return e.x.art==='strasse'&&!e.stink}),AU.filter(function(e){return !e.stink}),AU]:[AU];
  for(var g=0;g<S.length;g++){if(!S[g].length)continue;var best=null,bd=1e9;S[g].forEach(function(e){var d=abst(t,e.t);if(d<bd){bd=d;best=e}});return best}return null}
 function setze(a,b,v){if(!ring(a,b))return;V.set(b*n+a,v)}
 ZL.forEach(function(z){if(!z.innen)return;st.zulauf++;
  // Eintritte: Läufe auf dem äußeren Rand des Rings (nach Umlauf sortiert, Lücke ≤ 2 Felder = derselbe Lauf)
  var RF=z.f.filter(function(p){return rand(p%n,(p/n)|0)}).map(function(p){var pa=p%n,pb=(p/n)|0;return{a:pa,b:pb,t:um(pa,pb),k:KLASSE[wg(pa,pb)]===2||wg(pa,pb)===2?2:1}});
  RF.sort(function(u,v){return u.t-v.t});var LA=[],cur=null;
  RF.forEach(function(r){if(cur&&r.t-cur.ende<=2){cur.F.push(r);cur.ende=r.t}else{cur={F:[r],ende:r.t};LA.push(cur)}});
  if(LA.length>1&&4*Lp-LA[LA.length-1].ende+LA[0].F[0].t<=2){LA[0].F=LA.pop().F.concat(LA[0].F)}   // Lauf über die Ecke Nordwest
  z.f.forEach(function(p){if(!V.has(p))V.set(p,0);st.entfernt++});
  LA.forEach(function(la){st.eintritte++;var m=la.F[la.F.length>>1],kl=1;la.F.forEach(function(r){if(r.k>kl)kl=r.k});
   var e=wahl(kl,m.t);if(!e){st.ohne++;return}st.anschluesse++;bogen(m,e,kl)})});
 // Bogen vom Eintritt (m) zum Ausgang (e): Eintritt → ein Stück hinein → Ecken der Mittellinie → Anlauf → vor den Bildrand; geglättet, gerastert
 function bogen(m,e,kl){var Pk=[[m.a,m.b]],ein=Math.min(4,c),mx=(n-1)/2,dxm=m.a-mx,dym=m.b-mx;
  if(Math.abs(dym)>=Math.abs(dxm))Pk.push([m.a,m.b+(dym<0?ein:-ein)]);else Pk.push([m.a+(dxm<0?ein:-ein),m.b]);
  var t0=m.t,t1=e.t,d=t1-t0;if(d>2*Lp)d-=4*Lp;else if(d<-2*Lp)d+=4*Lp;
  var Ek=[];for(var k=0;k<4;k++){var tk=k*Lp,r=tk-t0;if(d>=0){r=((r%(4*Lp))+4*Lp)%(4*Lp);if(r>0&&r<d)Ek.push([r,k])}else{r=((t0-tk)%(4*Lp)+4*Lp)%(4*Lp);if(r>0&&r<-d)Ek.push([r,k])}}
  Ek.sort(function(u,v){return u[0]-v[0]});Ek.forEach(function(x){Pk.push(ECKE[x[1]].slice())});
  Pk.push(e.vor.slice());Pk.push(e.out.slice());
  for(var g=0;g<GLATT;g++){var Q=[Pk[0]];for(var i=0;i<Pk.length-1;i++){var A=Pk[i],B=Pk[i+1];
    if(i>0)Q.push([A[0]*.75+B[0]*.25,A[1]*.75+B[1]*.25]);if(i<Pk.length-2)Q.push([A[0]*.25+B[0]*.75,A[1]*.25+B[1]*.75])}Q.push(Pk[Pk.length-1]);Pk=Q}
  // Abstand: bis zum Anlauf (letzte zwei Punkte) mindestens ABST Felder vom Ortsbild, Punkte höchstens 2 Felder auseinander (keine Ecke wird geschnitten)
  // (zweimal: nach dem Schieben können zwei Nachbarn an einer Ecke auseinanderliegen, dann wird dazwischen noch einmal verdichtet und geschoben)
  var z=Pk.length-2,AN2=[rund(Pk[z][0],Pk[z][1]),rund(Pk[z+1][0],Pk[z+1][1])],D=Pk.slice(0,z+1);
  for(var dg=0;dg<3;dg++){var D2=[];for(var h0=0;h0<D.length-1;h0++){var A0=D[h0],B0=D[h0+1],st0=Math.max(1,Math.ceil(Math.max(Math.abs(B0[0]-A0[0]),Math.abs(B0[1]-A0[1]))/2));
    for(var u=0;u<st0;u++)D2.push(weg(A0[0]+(B0[0]-A0[0])*u/st0,A0[1]+(B0[1]-A0[1])*u/st0))}D2.push(AN2[0]);D=D2}
  D.push(AN2[1]);Pk=D;
  // Liegt der Bogen über See oder Meer: Umweg um das Wasser (kürzester Weg im Ring, Fluss teuer, See und Meer gesperrt), dann leicht geglättet
  var nass=0;for(var h1=1;h1<Pk.length;h1++)linie(Pk[h1-1][0],Pk[h1-1][1],Pk[h1][0],Pk[h1][1],function(x,y){var w=ring(x,y)?wa(x,y):0;if(w===1||w===3)nass++});
  if(nass){var U=umweg(Pk[0],Pk[Pk.length-2]);if(U){st.umweg++;var Q2=[];for(var h2=0;h2<U.length;h2+=4)Q2.push(U[h2]);if(Q2[Q2.length-1]!==U[U.length-1])Q2.push(U[U.length-1]);
    for(var g2=0;g2<1;g2++){var Q3=[Q2[0]];for(var i2=0;i2<Q2.length-1;i2++){var A2=Q2[i2],B2=Q2[i2+1];if(i2>0)Q3.push([A2[0]*.75+B2[0]*.25,A2[1]*.75+B2[1]*.25]);if(i2<Q2.length-2)Q3.push([A2[0]*.25+B2[0]*.75,A2[1]*.25+B2[1]*.75])}Q3.push(Q2[Q2.length-1]);Q2=Q3}
    Pk=Q2.map(function(p){return weg(p[0],p[1])}).concat([Pk[Pk.length-1]])}}
  st.bogen++;st.wege.push({von:[m.a,m.b],nach:e.out.slice(),kl:kl,seite:e.x.seite,art:e.x.art,stink:e.stink});var ex=e.out[0],ey=e.out[1];
  for(var h=1;h<Pk.length;h++)linie(Pk[h-1][0],Pk[h-1][1],Pk[h][0],Pk[h][1],function(x,y){feld(x,y,kl,e,ex,ey);if(kl>1){feld(x+1,y,kl,e,ex,ey);feld(x,y+1,kl,e,ex,ey);feld(x+1,y+1,kl,e,ex,ey)}})}
 function feld(x,y,kl,e,ex,ey){if(!ring(x,y))return;var w=wa(x,y),v=kl;if(w){v=w===2?(kl>=2?3:4):5;if(w===2)st.fluss++;else st.wasser++}
  var dx=x<R?R-x:x>=R+W?x-R-W+1:0,dy=y<R?R-y:y>=R+W?y-R-W+1:0,dd=Math.max(dx,dy);
  if(!w&&dd<=UE&&Math.abs(x-ex)+Math.abs(y-ey)<=UE+3)v|=(dd<<4)|((e.zelle+1)<<8);
  var q2=y*n+x,alt=V.get(q2);if(alt&&(alt&7)>=(v&7)&&!(v>>4))return;V.set(q2,v)}
 // Kürzester Weg im Ring von a nach b (8 Nachbarn): See und Meer gesperrt, Fluss teuer (Brücke, Furt), nah am Ortsbild (unter ABST) gesperrt, Abweichung von der
 // Ringmitte kostet etwas. null, wenn kein Weg (dann bleibt der Bogen). Kosten höchstens einmal je Bogen über Wasser, im Ortskern.
 function umweg(a,b){var NN=n*n,Dk=new Float64Array(NN),VO=new Int32Array(NN),H=[],s0=a[1]*n+a[0],z0=b[1]*n+b[0],i;Dk.fill(1e18);Dk[s0]=0;H.push([0,s0]);
  var frei=function(x,y){if(!ring(x,y))return false;var w=wa(x,y);if((w===1||w===3)&&Math.max(Math.abs(x-a[0]),Math.abs(y-a[1]))>8&&Math.max(Math.abs(x-b[0]),Math.abs(y-b[1]))>8)return false;   // am Eintritt und am Anlauf darf der Weg aus dem Wasser kommen (Steg der Welt)
  var dx=x<R?R-x:x>=R+W?x-R-W+1:0,dy=y<R?R-y:y>=R+W?y-R-W+1:0;return Math.max(dx,dy)>=ABST};
  function hoch(i){var e=H[i];while(i>0){var p=(i-1)>>1;if(H[p][0]<=e[0])break;H[i]=H[p];i=p}H[i]=e}
  function runter(){var e=H.pop();if(!H.length)return;var i=0,L2=H.length;for(;;){var l=2*i+1,r=l+1,m=i;if(l<L2&&H[l][0]<(m===i?e[0]:H[m][0]))m=l;if(r<L2&&H[r][0]<(m===i?e[0]:H[m][0]))m=r;if(m===i)break;H[i]=H[m];i=m}H[i]=e}
  while(H.length){var top=H[0],q=top[1];if(top[0]>Dk[q]){runter();continue}if(q===z0)break;runter();var x=q%n,y=(q/n)|0;
   for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;var nx=x+dx,ny=y+dy;if(!frei(nx,ny))continue;if(dx&&dy&&(!frei(x+dx,y)||!frei(x,y+dy)))continue;
    var d1=nx<R?R-nx:nx>=R+W?nx-R-W+1:0,d2=ny<R?R-ny:ny>=R+W?ny-R-W+1:0,mi=Math.abs(Math.max(d1,d2)-c),k=(dx&&dy?14:10)+mi+(wa(nx,ny)===2?60:0),nq=ny*n+nx,nd=Dk[q]+k;
    if(nd<Dk[nq]){Dk[nq]=nd;VO[nq]=q;H.push([nd,nq]);hoch(H.length-1)}}}
  if(Dk[z0]>=1e18)return null;var L3=[];for(i=z0;i!==s0;i=VO[i])L3.push([i%n,(i/n)|0]);L3.push([a[0],a[1]]);return L3.reverse()}
 function rund(x,y){x=Math.round(x);y=Math.round(y);return[x<0?0:x>n-1?n-1:x,y<0?0:y>n-1?n-1:y]}
 // Punkt aus dem Ortsbild und seinem Saum (ABST Felder) hinaus zur nächsten Seite schieben
 function weg(x,y){var p=rund(x,y);x=p[0];y=p[1];var dx=x<R?R-x:x>=R+W?x-R-W+1:0,dy=y<R?R-y:y>=R+W?y-R-W+1:0;if(Math.max(dx,dy)>=ABST)return p;
  var mid=R+(W-1)/2;if(!dx&&!dy){var dl=x-R,dr=R+W-1-x,du=y-R,dw=R+W-1-y,mn=Math.min(dl,dr,du,dw);if(mn===dl||mn===dr)dy=-1;else dx=-1}
  if(dx>0&&dy>0){var sch=ABST-Math.max(dx,dy);x+=x<mid?-sch:sch;y+=y<mid?-sch:sch;return rund(x,y)}   // an der Ecke schräg hinaus
  if(dx>=dy)x=x<mid?R-ABST:R+W-1+ABST;else y=y<mid?R-ABST:R+W-1+ABST;return rund(x,y)}
 // immer nur ein Schritt in einer Achse (zusammenhängend begehbar), wie weltgen.js linie
 function linie(x0,y0,x1,y1,f){var dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,err=dx-dy,x=x0,y=y0;
  for(;;){f(x,y);if(x===x1&&y===y1)return;if(2*err>-dy){err-=dy;x+=sx}else{err+=dx;y+=sy}}}
 var K2=Array.from(V.keys()).sort(function(u,v){return u-v}),liste=new Int32Array(K2.length*2);
 K2.forEach(function(k,i){liste[2*i]=k;liste[2*i+1]=V.get(k)});
 return{x0:x0,y0:y0,n:n,liste:liste,st:st}}
// Nachschlagen: Map aus der Liste (einmal je Empfänger)
function karte(an){if(an._m)return an._m;var m=new Map(),l=an.liste;for(var i=0;i<l.length;i+=2)m.set(l[i],l[i+1]);an._m=m;return m}
// Wert am Weltfeld (X, Y) oder −1 (nicht in der Liste)
function bei(an,X,Y,WX){var dx=X-an.x0;if(WX){if(dx<0)dx+=WX;else if(dx>=WX)dx-=WX}var dy=Y-an.y0;if(dx<0||dy<0||dx>=an.n||dy>=an.n)return -1;
 var v=karte(an).get(dy*an.n+dx);return v===undefined?-1:v}
// Punktmuster des Übergangs: Bildpunkt (x, y) bei Stufe k zeigt den Ortsweg?
function ortPunkt(k,x,y){return B4[((y&3)<<2)|(x&3)]<Math.round((UE+1-k)*16/(UE+1))}
var OA={UE:UE,R_DEF:R_DEF,rechnen:rechnen,karte:karte,bei:bei,ortPunkt:ortPunkt};
if(typeof module!=='undefined'&&module.exports)module.exports=OA;else root.AT3ORTSANSCHLUSS=OA;
})(typeof self!=='undefined'?self:this);
