// WAS DIE DATEI TUT: Wegsuche von Arena Theory 3.0 (Schritt G6b). Reine Rechnung ohne Bildschirm, nur ganze Zahlen. Zwei Stufen:
// naher Weg = feldgenaues A* in einem Fenster aus 5 × 5 Kartenstücken (320 × 320 Felder) um den Start, 8 Richtungen ohne Eckenschneiden;
// Fernweg = Suche im Straßennetz des Weltgenerators (W1b: Orte und Verbindungen) von Ort zu Ort, dazu feldgenau der nahe Weg bis zur nächsten Netzstraße.
// Profile aus begehbar.js (zu Fuß, Karren; Karrenhülle 1 Feld: schräg nur, wenn beide Nachbarfelder frei sind; Türen nur zu Fuß, Tore für alle).
// Kerne: läuft auf den Helferkernen (helfer.js), ohne Helfer im Weltkern; nie auf dem Hauptkern (Regel 13). Ein Auftrag bringt alle Daten mit
// (Paket: Kartenstücke des Fensters, fertig oder als Erdausschnitt zum Selbstrechnen, und Bau-Kartenstücke). Darum ist das Ergebnis gleich,
// egal wer rechnet (0/1/2/4/6 Helfer). Kosten hängen nur vom Fenster ab, nie von der Weltgröße (Regel 14).
// Wiederverwendet aus 2.0 welt-begehbar.js (als Kopie angepasst): A* mit Binärhaufen, Stempel statt Löschen, Schätzung „Schachbrett mit Schrägen“,
// Schrägschritt nur, wenn beide Wege über die Nachbarfelder gehen (schraeg), Kosten = Strecke / Tempo des Zielfelds. Keine Wegglättung (AT3_PLAN 6.2:
// kein Abschneiden von Wandecken).
// Ergebnis (Int32Array): [Code, Modus (0 nah, 1 fern), Felder, Kosten, Orte, Knoten, Netzkosten, Teilweg (1 = endet am Fensterrand), X0, Y0, X1, Y1, …, Ort-Nummern …].
// Codes: 0 ok, 1 no_path, 2 no_map, 3 start_blocked, 4 goal_blocked, 5 no_road, 6 no_town.
(function(root){
'use strict';
function BG(){return root.AT3BEGEH||(typeof module!=='undefined'&&module.exports?require('./begehbar.js'):null)}
function WG(){return root.AT3WG||(typeof module!=='undefined'&&module.exports?require('./weltgen.js'):null)}
var ST=64, F=ST*ST, SX=9600, SY=4800, WX=ST*SX, WY=ST*SY, FEN=5, HALB=2, FS=FEN*ST, NN=FS*FS, TERR=F*4, BAUB=F*9, KOPF=8;
var CODE=['ok','no_path','no_map','start_blocked','goal_blocked','no_road','no_town'];
var K_O=1000000, K_D=1414214, MAXT=115, H_O=(K_O/MAXT)|0, H_D=(K_D/MAXT)|0;   // Kosten je Schritt = K / Tempo; Schätzung mit dem besten Tempo
var DX=[0,-1,0,1], DY=[-1,0,1,0], SCHR=[[0,1],[1,2],[2,3],[3,0]];
// Netzstraße als Anschluss (Wegschicht des Weltgenerators: 1 Pfad, 2 Straße, 3 Brücke, 4 Furt, 5 Steg, 6 Ortsplatz, 7 Fähre)
var ANSCHLUSS=[[0,1,1,1,1,1,1,0],[0,0,1,1,0,0,1,0]];
function umS(cx){return cx<0?cx+SX:cx>=SX?cx-SX:cx}
function umX(X){return X<0?X+WX:X>=WX?X-WX:X}

// ── Paket (läuft im Weltkern): Daten des Fensters ab Stück cx0, cy0. holeT(key) → fertiges Kartenstück oder null, holeB(key) → Bau-Puffer oder null,
// ans = Erdansicht für fehlende Stücke (der Rechner erzeugt sie selbst aus dem Seed, gleiche Bytes wie im Weltkern). Tab je Stück: Versatz, Typ (0 fehlt,
// 1 fertig, 2 Erdausschnitt), Versatz Bau (−1 = nichts gebaut).
function paket(cx0,cy0,holeT,holeB,ans){var G=WG(),tab=new Int32Array(FEN*FEN*3),L=[],n=0,i,cx,cy,k,t,b,GB=(G.GEL_BYTES+7)&~7;
 for(i=0;i<FEN*FEN;i++){cx=umS(cx0+i%FEN);cy=cy0+((i/FEN)|0);tab[i*3]=-1;tab[i*3+2]=-1;if(cy<0||cy>=SY)continue;k=cx*8192+cy;
  t=holeT(k);if(t){tab[i*3]=n;tab[i*3+1]=1;L.push([n,t,TERR]);n+=TERR}
  else if(ans&&ans.E){var r=new Uint8Array(G.GEL_BYTES);G.ausschnitt(ans,cx,cy,r);tab[i*3]=n;tab[i*3+1]=2;L.push([n,r,G.GEL_BYTES]);n+=GB}
  b=holeB?holeB(k):null;if(b){tab[i*3+2]=n;L.push([n,b,BAUB]);n+=BAUB}}
 var d=new Uint8Array(n);for(i=0;i<L.length;i++)d.set(L[i][1].subarray(0,L[i][2]),L[i][0]);
 return{daten:d,tab:tab}}

// ── Netz (W1b): Orte mit Lage in Feldern und Verbindungen als Nachbarliste. Je Rechner einmal je Welt (gen) gesetzt. ──
var NETZ=null;
function netzBauen(seed,ans,gen){var G=WG(),nO=ans.kopf?ans.kopf[0]:0,nK=ans.kopf?ans.kopf[1]:0,pkt=new Int32Array(nO*2),i;
 for(i=0;i<nO;i++){var c=ans.orte[i]&0xFFFFFF,p=G.ortPunkt(seed,ans,c%G.GW,(c/G.GW)|0);pkt[i*2]=umX(p[0]);pkt[i*2+1]=p[1]}
 return{gen:gen,nO:nO,nK:nK,pkt:pkt,kanten:new Uint16Array(ans.kanten.subarray(0,nK*4))}}
function netzSetzen(n){var nO=n.nO,nK=n.nK,K=n.kanten,ab=new Int32Array(nO+1),zu=new Int32Array(nK*2),ka=new Int32Array(nK*2),i;
 for(i=0;i<nK;i++){ab[K[i*4]+1]++;ab[K[i*4+1]+1]++}for(i=0;i<nO;i++)ab[i+1]+=ab[i];var p=ab.slice(0,nO);
 for(i=0;i<nK;i++){var a=K[i*4],b=K[i*4+1];zu[p[a]]=b;ka[p[a]++]=i;zu[p[b]]=a;ka[p[b]++]=i}
 NETZ={gen:n.gen,nO:nO,pkt:n.pkt,kanten:K,ab:ab,zu:zu,ka:ka,roh:n}}
function netzHat(gen){return !!NETZ&&NETZ.gen===gen}
function netz(){return NETZ?NETZ.roh:null}

// ── Haufen (aus 2.0) ──
var hN=new Int32Array(4096), hF=new Int32Array(4096), hLen=0;
function hPush(u,f){if(hLen>=hN.length){var a=new Int32Array(hN.length*2),b=new Int32Array(hN.length*2);a.set(hN);b.set(hF);hN=a;hF=b}
 var i=hLen++;while(i>0){var q=(i-1)>>1;if(hF[q]<=f)break;hN[i]=hN[q];hF[i]=hF[q];i=q}hN[i]=u;hF[i]=f}
function hPop(){var u=hN[0],lu=hN[--hLen],lf=hF[hLen],i=0;for(;;){var c=2*i+1;if(c>=hLen)break;if(c+1<hLen&&hF[c+1]<hF[c])c++;if(hF[c]>=lf)break;hN[i]=hN[c];hF[i]=hF[c];i=c}
 if(hLen>0){hN[i]=lu;hF[i]=lf}return u}

// ── Arbeitsfelder je Rechner (wiederverwendet, Stempel statt Löschen) ──
var tem=null, temS, gS, par, stp, zu, stamp=0;
function speicher(){if(tem)return;tem=new Int16Array(NN);temS=new Uint32Array(NN);gS=new Int32Array(NN);par=new Int32Array(NN);stp=new Uint32Array(NN);zu=new Uint32Array(NN)}

// ── Rechnung eines Auftrags {p, x0, y0, x1, y1, cx0, cy0, seed, fern, daten, tab} ──
function rechnen(a){speicher();var G=WG(),B=BG(),d=a.daten,tab=a.tab,T=new Array(FEN*FEN),BU=new Array(FEN*FEN),i,p=a.p,seed=a.seed>>>0;
 for(i=0;i<FEN*FEN;i++){var o=tab[i*3],ty=tab[i*3+1],ob=tab[i*3+2];T[i]=null;BU[i]=ob>=0?d.subarray(ob,ob+BAUB):null;
  if(ty===1)T[i]=d.subarray(o,o+TERR);
  else if(ty===2){var r=new Uint8Array(G.GEL_BYTES);r.set(d.subarray(o,o+G.GEL_BYTES));G.gelaende({seed:seed,cx:umS(a.cx0+i%FEN),cy:a.cy0+((i/FEN)|0),daten:r});T[i]=r}}
 function idx(cx,cy){var dx=cx-a.cx0;if(dx<0)dx+=SX;else if(dx>=SX)dx-=SX;var dy=cy-a.cy0;return dx>=FEN||dy<0||dy>=FEN?-1:dy*FEN+dx}
 function hole(cx,cy){var j=idx(cx,cy);return j<0?null:T[j]}
 function holeB(cx,cy){var j=idx(cx,cy);return j<0?null:BU[j]}
 var OX=a.cx0*ST, OY=a.cy0*ST;
 function lokal(X,Y){var lx=X-OX;if(lx<0)lx+=WX;else if(lx>=WX)lx-=WX;var ly=Y-OY;return lx<0||lx>=FS||ly<0||ly>=FS?-1:ly*FS+lx}
 stamp++;if(stamp>4e9){temS.fill(0);stp.fill(0);zu.fill(0);stamp=1}
 function tp(u){if(temS[u]===stamp)return tem[u];temS[u]=stamp;var X=umX(OX+u%FS),Y=OY+((u/FS)|0),v=B.tempo(hole,holeB,seed,X,Y,p);v=v>0?v:0;tem[u]=v;return v}
 function schritt(u,s){var lx=u%FS,ly=(u/FS)|0,nx=lx+DX[s],ny=ly+DY[s];if(nx<0||ny<0||nx>=FS||ny>=FS)return -1;
  if(!B.kante(holeB,umX(OX+lx),OY+ly,s,p))return -1;var v=ny*FS+nx;return tp(v)>0?v:-1}
 var s0=lokal(a.x0,a.y0),z0=a.fern?-1:lokal(a.x1,a.y1),zx=z0%FS,zy=(z0/FS)|0;
 function aus(code,modus,L,kosten,knoten,orte,nk){var nF=L?L.length:0,nO=orte?orte.length:0,r=new Int32Array(KOPF+nF*2+nO);
  r[0]=code;r[1]=modus;r[2]=nF;r[3]=kosten|0;r[4]=nO;r[5]=knoten|0;r[6]=nk|0;
  for(var j=0;j<nF;j++){r[KOPF+j*2]=umX(OX+L[j]%FS);r[KOPF+j*2+1]=OY+((L[j]/FS)|0)}for(j=0;j<nO;j++)r[KOPF+nF*2+j]=orte[j];return r}
 var modus=a.fern?1:0;
 if(s0<0||(!a.fern&&z0<0)||!hole(a.x0>>6,a.y0>>6))return aus(2,modus);
 if(!tp(s0))return aus(3,modus);
 if(!a.fern&&!tp(z0))return aus(4,modus);
 // Fernweg: Ziel ist jedes Feld mit Netzstraße, das das Profil benutzen darf, oder der nächste Ort; geschätzt wird zum nächsten Ort hin.
 // Liegt beides nicht im Fenster, endet der nahe Weg am Feld, das dem Ort am nächsten kommt (Teilweg, Kopf[7] = 1; der Karren holt in G6c das nächste Fenster).
 var AN=ANSCHLUSS[p],oA=-1,TX=a.x1,TY=a.y1;
 if(a.fern){if(!NETZ||NETZ.gen!==a.gen||!NETZ.nO)return aus(6,1);oA=naechster(a.x0,a.y0);TX=NETZ.pkt[oA*2];TY=NETZ.pkt[oA*2+1]}
 var zO=a.fern?lokal(TX,TY):-1;
 function rand(u){var lx=u%FS,ly=(u/FS)|0;return lx===0||ly===0||lx===FS-1||ly===FS-1}
 function istZiel(u){if(!a.fern)return u===z0;if(u===zO||(zO<0&&rand(u)))return true;var X=umX(OX+u%FS),Y=OY+((u/FS)|0),t=hole(X>>6,Y>>6);return !!t&&AN[t[3*F+(((Y&63)<<6)|(X&63))]]===1}
 function h(u){var dx,dy;if(a.fern){dx=Math.abs(umX(OX+u%FS)-TX);if(dx>WX-dx)dx=WX-dx;dy=Math.abs(OY+((u/FS)|0)-TY)}else{dx=u%FS-zx;dy=((u/FS)|0)-zy;if(dx<0)dx=-dx;if(dy<0)dy=-dy}
  return dx>dy?H_O*(dx-dy)+H_D*dy:H_O*(dy-dx)+H_D*dx}
 function rel(u,v,k){var g=gS[u]+((k/tem[v])|0);if(stp[v]===stamp&&g>=gS[v])return;stp[v]=stamp;gS[v]=g;par[v]=u;hPush(v,g+h(v))}
 hLen=0;stp[s0]=stamp;gS[s0]=0;par[s0]=-1;hPush(s0,h(s0));var gef=-1,knoten=0,u,s,v,best=s0,bestH=h(s0);
 while(hLen){u=hPop();if(zu[u]===stamp)continue;zu[u]=stamp;knoten++;
  if(istZiel(u)){gef=u;break}
  if(a.fern){var hu=h(u);if(hu<bestH){bestH=hu;best=u}}
  for(s=0;s<4;s++){v=schritt(u,s);if(v>=0&&zu[v]!==stamp)rel(u,v,K_O)}
  for(s=0;s<4;s++){var s1=SCHR[s][0],s2=SCHR[s][1],ax=schritt(u,s1);if(ax<0)continue;var ay=schritt(u,s2);if(ay<0)continue;
   var d1=schritt(ax,s2);if(d1<0||d1!==schritt(ay,s1)||zu[d1]===stamp)continue;rel(u,d1,K_D)}}
 var teil=0;if(gef<0){if(!a.fern||best===s0)return aus(a.fern?5:1,modus,null,0,knoten);gef=best}
 if(a.fern&&gef!==zO){var X=umX(OX+gef%FS),Y=OY+((gef/FS)|0),tt=hole(X>>6,Y>>6);if(!tt||AN[tt[3*F+(((Y&63)<<6)|(X&63))]]!==1)teil=1}
 var L=[];for(u=gef;u!==-1;u=par[u])L.push(u);L.reverse();
 if(!a.fern)return aus(0,0,L,gS[gef],knoten);
 // Netzstufe: nächster Ort am Start → nächster Ort am Ziel, Suche im Graphen (niedrigste Kosten zuerst)
 var R=netzRoute(p,oA,a.x1,a.y1),r;
 r=R?aus(0,1,L,gS[gef],knoten,R.orte,R.kosten):aus(6,1,L,gS[gef],knoten);r[7]=teil;return r}

function naechster(X,Y){var n=NETZ,best=-1,bd=Infinity;for(var i=0;i<n.nO;i++){var dx=Math.abs(n.pkt[i*2]-X);if(dx>WX-dx)dx=WX-dx;var dy=n.pkt[i*2+1]-Y,dd=dx*dx+dy*dy;if(dd<bd){bd=dd;best=i}}return best}
// Verbindungsart: 1 Pfad, 2 Straße, +4 mit Fähre, 8 Seeweg. Karren nicht auf Pfaden. Kosten = Länge (Pfad × 1,05, Vorschlag).
function netzRoute(p,A,X1,Y1){var n=NETZ;if(!n||!n.nO)return null;var Z=naechster(X1,Y1);if(A<0||Z<0)return null;
 if(A===Z)return{orte:[A],kosten:0};
 var nO=n.nO,g=new Int32Array(nO).fill(2147483647),vor=new Int32Array(nO).fill(-1),fertig=new Uint8Array(nO),K=n.kanten;hLen=0;g[A]=0;hPush(A,0);
 while(hLen){var u=hPop();if(fertig[u])continue;fertig[u]=1;if(u===Z)break;
  for(var j=n.ab[u];j<n.ab[u+1];j++){var e=n.ka[j],art=K[e*4+3],v=n.zu[j];if(fertig[v])continue;if(p===1&&!(art&8)&&(art&3)===1)continue;
   var c=g[u]+((art&3)===1&&!(art&8)?((K[e*4+2]*105/100)|0):K[e*4+2])+1;if(c<g[v]){g[v]=c;vor[v]=u;hPush(v,c)}}}
 if(!fertig[Z])return null;var L=[];for(var w=Z;w!==-1;w=vor[w])L.push(w);L.reverse();return{orte:L,kosten:g[Z]}}

var WS_={CODE:CODE,FEN:FEN,HALB:HALB,FS:FS,KOPF:KOPF,K_O:K_O,K_D:K_D,ANSCHLUSS:ANSCHLUSS,paket:paket,rechnen:rechnen,netzBauen:netzBauen,netzSetzen:netzSetzen,netzHat:netzHat,netz:netz,netzRoute:netzRoute};
if(typeof module!=='undefined'&&module.exports)module.exports=WS_;else root.AT3WEG=WS_;
})(typeof self!=='undefined'?self:this);
