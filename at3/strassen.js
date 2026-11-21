// WAS DIE DATEI TUT: Straßen nach Rang von Arena Theory 3.0 (Schritt N5d): jede Verbindung des Netzes aus W1b bekommt einen Rang (Trail, Country Road,
// Highway, Imperial Road, Caravan Route, Sea Lane), jede Straßenzelle Rang und Bauweise nach Biom, dazu Haltepunkte am Weg (Raststation, Zoll, Brunnen,
// Karawanserei, Herberge, Fort, Wachturm, Wegweiser) als Daten. Alles entsteht aus Seed und Erde, nichts davon liegt in der Erde (Erde und Fingerabdruck
// unverändert); einmal je Welt gerechnet und nur im Speicher. Gleicher Seed = gleiches Netz auf jedem Gerät.
// Entscheidungen Thomas (21.11.2026): einmal je Welt im Hintergrundkern rechnen, Rangregeln wie vorgeschlagen, alle Haltepunkte plus Wachtürme und Wegweiser.
// Rang (Vorschlag, bestätigt): Imperial Road = Verbindung im Grundnetz und (beide Orte ab G5 in derselben obersten Herrschaft oder ein Ende G7);
// Highway = beide ab G4 oder einer ab G5; Country Road = Klasse „Straße“ aus W1b oder beide ab G3; sonst Trail. Caravan Route = bis Highway, mehr als die
// Hälfte der Zellen in Steppe, Wüste oder Savanne. Sea Lane = alle Seewege. Rang einer Zelle = höchster Rang der Verbindungen, die über sie laufen.
// Lauf einer Verbindung: kürzester Weg über Straßenzellen von Ort zu Ort, ohne durch einen dritten Ort zu gehen (so legt W1b die Spur an).
// Grundnetz: Kruskal über die Landverbindungen in ihrer gespeicherten Reihenfolge (W1b legt sie nach Länge sortiert ab) ergibt genau das verbindende Netz.
// Kerne: reine Rechnung ohne Bildschirm. Im Bildkern einmal je Welt beim ersten Antippen, im Master-Editor in Scheiben zu höchstens rund 4 ms.
// Notausschalter ?n5d=0: keine Straßenränge (Editor ohne Einfärbung „Straßenränge“, keine Straßenkarte im Spiel).
(function(root){
'use strict';
var AUS=!!(root.location&&/[?&]n5d=0/.test(root.location.search||''));
var GW=600, GH=300, N=GW*GH;
var RANG=['','trail','country','highway','imperial'];                 // Stufe 1–4; Bit 3 = Karawanenroute, Bit 4 = Seeweg
var HALT=['','rest','toll','well','caravanserai','inn','fort','watchtower','signpost'];
var H_RAST=1, H_ZOLL=2, H_BRUNNEN=3, H_KARA=4, H_HERBERGE=5, H_FORT=6, H_WACHT=7, H_WEG=8;
// Abstände in Zellen (bestätigt): Raststation auf der Imperial Road alle 3 Zellen, auf dem Highway eine in der Mitte jeder Verbindung ab 4 Zellen
// (Thomas 21.11.2026: eine Verbindung ist meist nur rund 5 Zellen lang, mit 6/10 gäbe es fast keine), Brunnen auf Karawanenrouten, Wachturm auf gefährlichem Stück
var RAST4=3, RAST3=4, BRUNNEN=4, WACHT=8;
var Z_TROCKEN={7:1,9:1,10:1}, Z_GEFAHR={12:1,13:1,14:1};             // Klimazonen (weltgen.js ZONE): Steppe, Wüste, Savanne · Sumpf, Mangroven, Gebirge
var BFS_MAX=40000;                                                    // höchstens so viele Zellen je Suche (Sicherung)

function nb(i,r){if(r===0)return(i+1)%GW?i+1:i+1-GW;if(r===2)return i%GW?i-1:i-1+GW;if(r===1)return i+GW<N?i+GW:-1;return i>=GW?i-GW:-1}
function aus4(w){return(w&1)+(w>>1&1)+(w>>2&1)+(w>>3&1)}
function zone(A,i){return A.zon?A.zon[i]&15:0}

// Einen Lauf anfangen: Größen, oberste Herrschaft je Ort, Grundnetz (fest, wenige ms)
function start(seed,A,O,H){var nO=A.orte.length,nK=(A.kanten.length/4)|0,J={seed:seed>>>0,A:A,O:O,H:H,nO:nO,nK:nK,k:0,fertig:false,ms:0},t0=now(),k;
 J.g=new Uint8Array(nO);J.top=new Int32Array(nO);for(k=0;k<nO;k++){J.g[k]=O?O.groesse(J.seed,A,k):2;var u=A.hs?A.hs.ort[k]:0;J.top[k]=u&&H?H.oben(A.hs,u-1):-1}
 J.grund=new Uint8Array(nK);var uf=new Int32Array(nO);for(k=0;k<nO;k++)uf[k]=k;
 function w(x){while(uf[x]!==x){uf[x]=uf[uf[x]];x=uf[x]}return x}
 for(k=0;k<nK;k++){if(A.kanten[k*4+3]&8)continue;var a=w(A.kanten[k*4]),b=w(A.kanten[k*4+1]);if(a!==b){uf[a]=b;J.grund[k]=1}}
 J.er=new Uint8Array(nK);J.p0=new Int32Array(nK+1);J.pfad=new Int32Array(1024);J.pn=0;
 J.mark=new Int32Array(N);J.vor=new Uint8Array(N);J.q=new Int32Array(BFS_MAX+8);J.stamp=0;
 J.ms+=now()-t0;return J}
function now(){return typeof performance!=='undefined'?performance.now():Date.now()}
function rein(J,i){if(J.pn>=J.pfad.length){var n=new Int32Array(J.pfad.length*2);n.set(J.pfad);J.pfad=n}J.pfad[J.pn++]=i}

// Lauf der Verbindung k: Breitensuche über Straßenzellen (Ausgänge in beiden Zellen), nicht durch einen dritten Ort
function lauf(J,k){var A=J.A,a=A.orte[A.kanten[k*4]]&0xffffff,b=A.orte[A.kanten[k*4+1]]&0xffffff,M=J.mark,V=J.vor,Q=J.q,s=++J.stamp,h=0,t=1,i,j,r,w,da=false;
 M[a]=s;Q[0]=a;if(a===b)da=true;
 while(!da&&h<t){i=Q[h++];w=A.weg[i]&15;for(r=0;r<4;r++){if(!(w>>r&1))continue;j=nb(i,r);if(j<0||M[j]===s||!(A.weg[j]>>(r^2)&1))continue;M[j]=s;V[j]=r^2;
  if(j===b){da=true;break}if(A.ort[j]&15)continue;if(t<BFS_MAX)Q[t++]=j}}
 var anf=J.pn;if(!da){rein(J,a);if(b!==a)rein(J,b);return}
 for(i=b;;){rein(J,i);if(i===a)break;i=nb(i,V[i])}
 for(var x=anf,y=J.pn-1;x<y;x++,y--){var z=J.pfad[x];J.pfad[x]=J.pfad[y];J.pfad[y]=z}}   // von a nach b

// Rang der Verbindung k aus Größe, Herrschaft, Grundnetz, Klasse und Lauf
function rangVon(J,k){var A=J.A,art=A.kanten[k*4+3];if(art&8)return 16;var a=A.kanten[k*4],b=A.kanten[k*4+1],ga=J.g[a],gb=J.g[b],mi=Math.min(ga,gb),ma=Math.max(ga,gb),l;
 if(J.grund[k]&&(mi>=5&&J.top[a]>=0&&J.top[a]===J.top[b]||ma===7))l=4;else if(mi>=4||ma>=5)l=3;else if((art&3)===2||mi>=3)l=2;else l=1;
 if(l<=3){var p0=J.p0[k],p1=J.p0[k+1],tr=0;for(var x=p0;x<p1;x++)if(Z_TROCKEN[zone(A,J.pfad[x])])tr++;if(p1>p0&&tr*2>p1-p0)l|=8}
 return l}
function stufe(b){return b&7}
function wert(b){return b&16?0:(b&7)*2+(b&8?0:1)}                     // Vorrang in einer Zelle: höhere Stufe, bei gleicher Stufe die feste Straße vor der Karawanenroute

// Weiterrechnen höchstens ms Millisekunden; true = fertig
// Abschluss läuft als Generator in kleinen Stücken (je 1.024 Zellen oder 64 Verbindungen eine Pause), damit der Editor unter ~4 ms je Scheibe bleibt
function weiter(J,ms){if(J.fertig)return true;var t0=now(),A=J.A;
 while(J.k<J.nK){var k=J.k;J.p0[k]=J.pn;if(!(A.kanten[k*4+3]&8))lauf(J,k);J.k++;J.p0[J.k]=J.pn;if(ms!=null&&now()-t0>=ms){J.ms+=now()-t0;return false}}
 if(!J.gen)J.gen=abschluss(J);
 while(!J.gen.next().done)if(ms!=null&&now()-t0>=ms){J.ms+=now()-t0;return false}
 J.gen=null;J.ms+=now()-t0;J.fertig=true;return true}

function* abschluss(J){var A=J.A,nK=J.nK,k,x,i,p0,p1,y;
 for(k=0;k<nK;k++){J.er[k]=rangVon(J,k);if((k&63)===63)yield}
 var zr=J.zr=new Uint8Array(N),zk=J.zk=new Uint16Array(N),halt=J.halt=new Uint8Array(N);
 for(k=0;k<nK;k++){if((k&255)===255)yield;var b=J.er[k];if(b&16)continue;p0=J.p0[k];p1=J.p0[k+1];for(x=p0;x<p1;x++){i=J.pfad[x];if(!zk[i]||wert(b)>wert(zr[i])){zr[i]=b;zk[i]=k+1}}}
 // Reste (rund 1 % der Straßenzellen liegen auf keinem kürzesten Lauf, z. B. Umwege der Spur): übernehmen den kleinsten Rang eines verbundenen Nachbarn
 for(var run=0;run<4;run++){var neu=0;for(i=0;i<N;i++){if((i&4095)===4095)yield;if(zk[i]||!(A.weg[i]&15))continue;var bw=-1;
  for(var r0=0;r0<4;r0++){if(!(A.weg[i]>>r0&1))continue;var j0=nb(i,r0);if(j0<0||!zk[j0]||zk[j0]>65535)continue;if(bw<0||wert(zr[j0])<wert(zr[bw])){bw=j0}}
  if(bw>=0){zr[i]=zr[bw];zk[i]=zk[bw];neu++}}if(!neu)break}
 function frei(i){return i>=0&&!halt[i]&&!(A.ort[i]&15)&&(A.weg[i]&15)}
 function setz(i,h){if(frei(i)){halt[i]=h;return true}return false}
 var Lk=[];for(k=0;k<nK;k++)if(!(J.er[k]&16))Lk.push(k);Lk.sort(function(a,b){return stufe(J.er[b])-stufe(J.er[a])||a-b});   // große Straßen zuerst
 var zel=A.hs?A.hs.zel:null,H=J.H,reich=null;
 if(zel&&H){reich=new Int32Array(A.hs.zahl[0]);for(var u=0;u<reich.length;u++)reich[u]=H.oben(A.hs,u)}
 // 1. Grenzen: Zoll beim Eintritt in eine andere Herrschaft (unterste Einheit), an Reichsgrenzen Fort (ab Highway) bzw. Wachturm (Country Road) davor
 if(zel)for(y=0;y<Lk.length;y++){if((y&127)===127)yield;k=Lk[y];var l=stufe(J.er[k]);p0=J.p0[k];p1=J.p0[k+1];for(x=p0+1;x<p1;x++){var u0=zel[J.pfad[x-1]],u1=zel[J.pfad[x]];if(!u0||!u1||u0===u1)continue;
  setz(J.pfad[x],H_ZOLL);if(reich&&reich[u0-1]!==reich[u1-1]){if(l>=3)setz(J.pfad[x-1],H_FORT);else if(l===2)setz(J.pfad[x-1],H_WACHT)}}}
 // 2. Kreuzungen: Karawanserei (Karawanenroute oder Highway und mehr), Herberge (Country Road), sonst Wegweiser
 for(i=0;i<N;i++){if((i&4095)===4095)yield;if(!zk[i]||aus4(A.weg[i]&15)<3||!frei(i))continue;var b=zr[i];setz(i,b&8||stufe(b)>=3?H_KARA:stufe(b)>=2?H_HERBERGE:H_WEG)}
 // 3. Oasen: Straße in der Wüste mit Fluss oder See daneben, keine zweite Karawanserei gleich daneben
 for(i=0;i<N;i++){if((i&4095)===4095)yield;if(!zk[i]||zone(A,i)!==9||!frei(i))continue;var nass=A.flu[i]>0,nah=false;
  for(var r=0;r<4;r++){var j=nb(i,r);if(j<0)continue;if(A.bio[j]===11||A.flu[j]>=2)nass=true;if(halt[j]===H_KARA)nah=true}
  if(nass&&!nah)setz(i,H_KARA)}
 // 4. Entlang jeder Verbindung: Raststationen, Brunnen, Wachtürme auf gefährlichen Stücken
 for(y=0;y<Lk.length;y++){if((y&127)===127)yield;k=Lk[y];(function(k){var b=J.er[k],l=stufe(b),p0=J.p0[k],p1=J.p0[k+1],n=p1-p0,gef=0;
  for(var x=p0+1;x<p1-1;x++){var s=x-p0,c=J.pfad[x];
   if(l===4&&s%RAST4===0||l===3&&n>=RAST3&&s===((n-1)>>1))setz(c,H_RAST);
   if(b&8&&s%BRUNNEN===0)setz(c,H_BRUNNEN);
   if(l>=2&&Z_GEFAHR[zone(A,c)]){gef++;if(gef%WACHT===WACHT>>1)setz(c,H_WACHT)}else gef=0}})(k)}
 var zahl=J.zahl={rang:[0,0,0,0,0,0,0],zellen:[0,0,0,0,0,0],halt:new Array(HALT.length).fill(0)};
 for(k=0;k<nK;k++)zahl.rang[idx(J.er[k])]++;
 for(i=0;i<N;i++){if((i&8191)===8191)yield;if(zk[i])zahl.zellen[idx(zr[i])]++;if(halt[i])zahl.halt[halt[i]]++}
 J.mark=J.vor=J.q=null}
// Rang-Byte → Nummer 1–6 (1 Trail … 4 Imperial Road, 5 Caravan Route, 6 Sea Lane)
function idx(b){return b&16?6:b&8?5:b&7}
function rangId(b){return b&16?'sea':b&8?'caravan':RANG[b&7]||''}

// Bauweise einer Straßenzelle nach Biom und Rang (Vorschlag): Fähre, Brücke oder Furt am Wasser, Pflaster auf der Imperial Road, sonst je Klimazone
function bauweise(A,i,b){var z=zone(A,i),l=b&7;
 if(A.weg[i]&64)return 'ferry';
 if(A.flu[i]>=2)return l>=3?'bridge':'ford';
 if(l===4)return 'paved';
 if(z===12||z===13)return 'plank';
 if(z===14||A.bio[i]===8)return 'serpentine';
 if(z===9)return 'sand';
 if(b&8)return 'cairns';
 if(z===4||z===5||z===11)return 'corduroy';
 return l===3?'gravel':'dirt'}

// Alles auf einmal (Bildkern), gemerkt an der Erde
function netz(seed,A,O,H){if(A._n5d&&A._n5d.seed===(seed>>>0))return A._n5d;var J=start(seed,A,O,H);weiter(J,null);try{Object.defineProperty(A,'_n5d',{value:J,configurable:true,writable:true})}catch(x){A._n5d=J}return J}

// Auskunft zu einer Zelle (oder null): Rang, Bauweise, Verbindung mit beiden Orten, Haltepunkt
function zelle(J,i){if(!J||!J.fertig||i<0||i>=N||!J.zk[i])return null;var A=J.A,k=J.zk[i]-1,b=J.zr[i];
 return{rang:rangId(b),stufe:b&7,karawane:!!(b&8),bau:bauweise(A,i,b),k:k,a:A.kanten[k*4],b:A.kanten[k*4+1],ga:J.g[A.kanten[k*4]],gb:J.g[A.kanten[k*4+1]],
  zellen:J.p0[k+1]-J.p0[k],grund:!!J.grund[k],halt:HALT[J.halt[i]]||''}}
// Nächste Straßenzelle zu Weltfeld x,y (Felder; Zelle = 1.024 Felder): die Zelle selbst, sonst die nächste Mitte im Umkreis 3 × 3
function naechste(J,x,y){if(!J||!J.fertig)return -1;var zx=Math.floor(x/1024),zy=Math.floor(y/1024),best=-1,be=1e18;
 for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){var Y=zy+dy,X=((zx+dx)%GW+GW)%GW;if(Y<0||Y>=GH)continue;var i=Y*GW+X;if(!J.zk[i])continue;
  if(!dx&&!dy)return i;var ex=(zx+dx)*1024+512-x,ey=Y*1024+512-y,e=ex*ex+ey*ey;if(e<be){be=e;best=i}}
 return be<=900*900?best:-1}

var S={AUS:AUS,RANG:RANG,HALT:HALT,RAST4:RAST4,RAST3:RAST3,BRUNNEN:BRUNNEN,WACHT:WACHT,start:start,weiter:weiter,netz:netz,zelle:zelle,naechste:naechste,
 bauweise:bauweise,rangId:rangId,idx:idx};
if(typeof module!=='undefined'&&module.exports)module.exports=S;else root.AT3STRASSEN=S;
})(typeof self!=='undefined'?self:this);
