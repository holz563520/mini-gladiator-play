// WAS DIE DATEI TUT: Zuschauer der großen Arena im Weltkern von Arena Theory 3.0 (Schritt AR2a): kommen zum Kampftermin aus den nächsten Orten über den Weg,
// stellen sich in der selbst gebauten Wartestraße an, gehen durchs Eingangshäuschen (Ticket), setzen sich auf einen freien Platz, gehen nach dem Kampf
// über das Ausgangshäuschen heim. Reine Rechnung ohne Bildschirm, nur ganze Zahlen. Gezeichnet wird ab AR2b (Karte) und AR2c (First Person).
// Entscheidungen Thomas (21.11.2026): Zuschauer kommen nur zum Kampf (Einlass ab dem Ruf, ohne Termin niemand); Tickets sind echte Besucher: es kommen
// ZUSCHAUER × Totenköpfe, höchstens so viele wie Plätze, jeder zahlt beim Einlass TICKET Gold; nach dem Kampf ein Spektakel-Bonus je Sitzendem
// (arena.js bonus); ist die Arena zum Ruf „closed“, findet der Kampf ohne Publikum statt (0 Tickets, Prämie trotzdem).
// Ablauf je Termin (Zufall aus dem Seed des Termins, eigener Strom, die anderen Ströme bleiben unberührt):
//  · Ruf (arena.js t.zu = 1): bis zu ORTE_MAX nahe Orte (gladiatoren.js a.orte) geben je einen Ankunftspunkt WEIT Felder vor der Arena in ihrer Richtung,
//    bevorzugt auf einer Straße. Je Ankunftspunkt EIN Weg zum Ende der Schlange (Wegsuche wie personen.js, hier einmal je Termin im Weltkern gerechnet,
//    alle Zuschauer teilen ihn). Kein Weg: sie erscheinen am Ende der Schlange.
//  · Ankunft gleichmäßig über SPAWN Ticks verteilt. Laufen Feld für Feld, 1 Feld/s × Bodentempo (wie personen.js). In der Schlange je halbes Feld einer,
//    vorn lässt der Einlasser alle EIN Ticks einen durch (Ticket in die Kasse). Edelleute (Typen 17–19 von 20 wie 2.0 welt-besucher.js STAND) nehmen
//    zuerst die Kissen des Adelsblocks, alle anderen zuerst die Bänke. Kein Platz frei: umkehren.
//  · Nach dem Ergebnis oder der Absage (ende): Wartende und Ankommende kehren um, Sitzende stehen nach und nach auf (bis GEHEN Ticks), gehen zum Ausgang
//    und über einen Weg zurück zu ihrem Ankunftspunkt. Wird die Arena zwischendurch zu, kehren Schlange und Ankommende um.
// Kerne: nur Weltkern (Regel 13). Kosten: je Termin höchstens ORTE_MAX + ORTE_MAX Wegsuchen, je Tick fest je Zuschauer (höchstens Plätze + Umkehrer),
// nichts hängt von der Weltgröße ab (Regel 14). Notausschalter ?ar2=0 (arena.js): keine Zuschauer, Tickets wie bisher nach der Formel.
// Wiederverwendet: Ablauf und Regeln aus 2.0 welt-besucher.js/welt-arena.js (Schlange, Einlass, Plätze, Adel, murrend gehen), Laufen und Wegsuche aus
// personen.js/karren.js (G6/G7), Schlange aus attraktion.js (AR1b), Sitzplätze aus demselben Bauplan wie die Bilder (arena-sitze.js, AR1a-Werkzeug).
(function(root){
'use strict';
function SU(){return root.AT3WEG||(typeof module!=='undefined'&&module.exports?require('./wegsuche.js'):null)}
function WE(){return root.AT3WEGSTROM||(typeof module!=='undefined'&&module.exports?require('./wegstrom.js'):null)}
function BAU(){return root.AT3BAU||(typeof module!=='undefined'&&module.exports?require('./bau.js'):null)}
function ATT(){return root.AT3ATT||(typeof module!=='undefined'&&module.exports?require('./attraktion.js'):null)}
function PERS(){return root.AT3PERS||(typeof module!=='undefined'&&module.exports?require('./personen.js'):null)}
// AR4: Sitzplätze je Art der Anlage (Sandgrube: arena-sitze.js, Great Amphitheatre: arena-sitze-amphitheater.js). TYP setzt jeder Einstieg (schritt, meld, ausStand, wechsel).
var TYP='sandgrube';
function SITZE(){var N=typeof module!=='undefined'&&module.exports;if(TYP==='amphitheater')return root.AT3SITZE_AMPHI||(N?require('./arena-sitze-amphitheater.js'):null);return root.AT3SITZE||(N?require('./arena-sitze.js'):null)}
var ST=64, WX=ST*9600, WY=ST*4800, M31=2147483647, STAND=1, MELD=9, TYPEN=60;
// Vorschlagswerte (Ticks: 20 = 1 s)
var ZUSCHAUER=40, TICKET=1, SPAWN=400, EIN=5, ABSTAND=128, SCHRITT_Q=13, WEIT=30, ORTE_MAX=3, GEHEN=400, MAX_V=2048, MAX_PF=4096;
var LEN_O=256000, LEN_D=362039, VF=128;      // wie personen.js: Tempo 100 = 1 Feld/s
var B_HIN=1, B_SCHLANGE=2, B_HINEIN=3, B_SITZT=4, B_HINAUS=5, B_HEIM=6, B_KEHRT=7, B_RAUS=8, ZUST=['','arrives','queues','enters','seated','leaves','home','turns','backs'];
var DX=[0,-1,0,1], DY=[-1,0,1,0];
function um(X){return X<0?X+WX:X>=WX?X-WX:X}
function rel(X,x0){var d=X-x0;if(d<-WX/2)d+=WX;else if(d>WX/2)d-=WX;return d}
function dx1(a,b){var d=b-a;return d>1?d-WX:d<-1?d+WX:d}
function richtung(dx,dy){return dx>0?0:dx<0?3:dy>0?1:2}
function zz(b){var s=b.rng;s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;b.rng=s||1;return b.rng}
function bis(b,n){return n>0?zz(b)%n:0}
function adel(typ){return typ%20>=17}

// ── Weg zu Fuß, einmal im Weltkern gerechnet (gleiche Rechnung wie die Helfer, gleiches Ergebnis) → {pf:[X,Y,…], tp:[…]} oder null ──
function weg(z,x0,y0,x1,y1){var w=z.wg,b=z.bau;if(!w||!w.ans||!SU()||!WE())return null;var e={x0:x0,y0:y0,x1:x1,y1:y1};if(!WE().nah(e))return null;
 if(x0===x1&&y0===y1)return{pf:[x0,y0],tp:[100]};
 var f=WE().fenster(e),pk=SU().paket(f.cx0,f.cy0,function(k){return w.stuecke.get(k)||null},b?function(k){return BAU().stueck(b,k)}:null,w.ans);
 var r=SU().rechnen({nr:0,version:z.version,vorrang:0,art:'pweg',faellig:0,p:0,x0:x0,y0:y0,x1:x1,y1:y1,cx0:f.cx0,cy0:f.cy0,seed:w.seed>>>0,gen:w.gen,fern:false,temp:true,startFrei:true,daten:pk.daten,tab:pk.tab});
 if(!r||!r.length||r[0]!==0)return null;var K=SU().KOPF,nF=r[2],nO=r[4],i;if(nF<1||nF*2>MAX_PF)return null;
 var pf=[],tp=[];for(i=0;i<nF*2;i++)pf.push(r[K+i]);for(i=0;i<nF;i++)tp.push(r[K+nF*2+nO+i]);
 if(pf[0]!==x0||pf[1]!==y0||pf[nF*2-2]!==x1||pf[nF*2-1]!==y1)return null;return{pf:pf,tp:tp}}
function normal(t){return(t>=1&&t<=4)||t>10}
// Ankunftspunkt: WEIT Felder vor der Arena in Richtung des Orts, das nächste begehbare Feld (Spirale bis 8), eine Straße oder ein Weg zuerst
function punkt(z,cx,cy,ox,oy){var dx=rel(ox,cx),dy=oy-cy,L=Math.floor(Math.sqrt(dx*dx+dy*dy));if(L<1)return null;
 var px=um(cx+Math.trunc(dx*WEIT/L)),py=cy+Math.trunc(dy*WEIT/L),P=PERS(),C=new Map(),erst=null;
 for(var r=0;r<=8;r++)for(var v=-r;v<=r;v++)for(var u=-r;u<=r;u++){if(Math.max(Math.abs(u),Math.abs(v))!==r)continue;var X=um(px+u),Y=py+v;if(Y<1||Y>=WY-1||!P.gangbar(z,X,Y))continue;
  if(normal(BAU().wegTyp(z,X,Y,C)))return[X,Y];if(!erst)erst=[X,Y]}
 return erst}

// ── Termin beginnt (Ruf) ──
function neu(z,a,r,t){var anl=r.anl,S=SITZE(),b={id:t.id,rng:((t.seed^0x2545f491)>>>0)||1,soll:0,n:0,t0:z.tick,nid:1,sp:[],P:[],W:[],v:[],Q:[],K:null,kv:-1,
  sitz:new Array(S.plaetze.length).fill(0),tk:0,ein:0,ende:0,ohne:0,ax:anl.x,ay:anl.y,oi:0};
 if(!anl.offen){b.ohne=1;b.ende=1;return b}
 b.soll=Math.min(S.plaetze.length,ZUSCHAUER*(t.skulls|0));b.K=ATT().kette(z,anl);b.kv=anl.v;return b}
// Ankunftspunkte: einer je Tick (je eine Wegsuche), damit der Weltkern nie lange steht. Ohne jeden Weg: am Ende der Schlange.
function ankunft(z,a,r,b){var anl=r.anl,O=(a.orte||[]).slice(0,ORTE_MAX),k=b.oi,en=anl.ende;
 if(k<O.length&&en){var A=ATT().ANLAGEN[anl.typ],p=punkt(z,um(anl.x+(A.w>>1)),anl.y+(A.h>>1),O[k][2],O[k][3]),w=p?weg(z,p[0],p[1],en[0],en[1]):null;
  if(w){b.P.push(w);b.sp.push([p[0],p[1],ORTE_MAX-k,b.P.length-1]);b.W.push(-1)}b.oi++;if(b.oi<O.length)return}
 b.oi=-1;if(!b.sp.length){b.sp.push([en?en[0]:anl.ein[0],en?en[1]:anl.ein[1],1,-1]);b.W.push(-1)}}
function waehle(b){var s=0,i;for(i=0;i<b.sp.length;i++)s+=b.sp[i][2];var x=bis(b,s);for(i=0;i<b.sp.length;i++){x-=b.sp[i][2];if(x<0)return i}return 0}
function dazu(z,b){var s=waehle(b),S=b.sp[s],v={id:b.nid++,typ:bis(b,TYPEN),sp:s,st:B_HIN,pi:S[3],i:0,rv:0,x:S[0],y:S[1],nx:-1,ny:-1,sub:0,len:0,dir:1,q:0,sitz:-1,t0:0,t:0};
 b.n++;b.v.push(v);if(v.pi<0)anstellen(b,v)}
function anstellen(b,v){var K=b.K;if(!K){kehren(b,v);return}v.st=B_SCHLANGE;v.q=((K.length>>1)-1)*256;v.nx=-1;v.sub=0;b.Q.push(v.id)}
// Umkehren: auf dem eigenen Ankunftsweg zurück (vom Ende der Schlange); ohne Weg verschwinden
function kehren(b,v){var p=v.pi>=0?b.P[v.pi]:null;if(!p){v.st=0;return}var n=p.pf.length>>1;
 if(v.st!==B_HIN){v.i=n-1;v.x=p.pf[n*2-2];v.y=p.pf[n*2-1];v.nx=-1;v.sub=0}else if(v.nx>=0){v.i++;v.x=v.nx;v.y=v.ny;v.nx=-1;v.sub=0}
 v.st=B_KEHRT;v.rv=1}
// Ein Schritt auf einem Weg (vorwärts oder rückwärts). true = am Ziel.
function laufen(v,p){var n=p.pf.length>>1;
 if(v.nx<0){var j=v.rv?v.i-1:v.i+1;if(j<0||j>=n)return true;var X=p.pf[j*2],Y=p.pf[j*2+1],dx=dx1(v.x,X),dy=Y-v.y;v.nx=X;v.ny=Y;v.len=dx&&dy?LEN_D:LEN_O;v.sub=0;v.dir=richtung(dx,dy)}
 var k=v.rv?v.i-1:v.i+1;v.sub+=(p.tp[k]||1)*VF;
 if(v.sub>=v.len){v.x=v.nx;v.y=v.ny;v.nx=-1;v.ny=-1;v.sub=0;v.i+=v.rv?-1:1}return false}
// Gehzeit drinnen (Häuschen ↔ Platz): 2 s Treppe, dazu Länge grob (Achtel-Näherung) × 1,25 für Umgang und Rang, 1 Feld/s
function dauer(b,s,h){var P=SITZE().plaetze[s],hx=rel(h[0],b.ax)*16+8,hy=(h[1]-b.ay)*16+8,dx=Math.abs(P[0]-hx),dy=Math.abs(P[1]-hy),d=Math.max(dx,dy)+(Math.min(dx,dy)>>1);return 40+Math.floor(d*25/16)}
function platz(b,v){var S=SITZE().plaetze,ad=adel(v.typ),n=0,m=0,i;
 for(i=0;i<S.length;i++)if(!b.sitz[i]){n++;if(!!S[i][5]===ad)m++}if(!n)return -1;
 var nur=m>0,x=bis(b,nur?m:n);for(i=0;i<S.length;i++)if(!b.sitz[i]&&(!nur||!!S[i][5]===ad)){if(!x)return i;x--}return -1}
function frei(b){var n=0;for(var i=0;i<b.sitz.length;i++)if(!b.sitz[i])n++;return n}
function finde(b,id){for(var i=0;i<b.v.length;i++)if(b.v[i].id===id)return b.v[i];return null}

// ── Ende (Ergebnis, Absage): alle gehen. Gibt die Zahl derer zurück, die drin sind (sitzen oder zum Platz gehen). ──
function ende(z,r){var b=r.bes;if(!b)return 0;var n=0;b.ende=1;b.soll=b.n;
 for(var i=0;i<b.v.length;i++){var v=b.v[i];if(v.st===B_SITZT||v.st===B_HINEIN){n++;if(v.st===B_SITZT)v.t=z.tick+bis(b,GEHEN)}}
 return n}
function schliessen(b){for(var i=0;i<b.v.length;i++){var v=b.v[i];if(v.st===B_HIN)kehren(b,v);else if(v.st===B_SCHLANGE)v.st=B_RAUS}b.Q=[]}

// AR4: Die Anlage wurde gegen eine andere Art getauscht (arena.js): wer drin war, ist weg, die Plätze gelten für die neue Art
function wechsel(r){var b=r.bes,anl=r.anl;if(!b||!anl)return;TYP=anl.typ;b.v=b.v.filter(function(v){return v.st===B_HIN||v.st===B_KEHRT||v.st===B_HEIM});b.Q=[];b.K=null;b.ende=1;
 b.sitz=new Array(SITZE().plaetze.length).fill(0);b.ax=anl.x;b.ay=anl.y}
// ── Ein Tick (aus arena.js, nur große Arena) ──
function schritt(z,a,r){var t=r.termin,b=r.bes,anl=r.anl;if(anl)TYP=anl.typ;
 if(b&&!b.v.length&&(!t||t.id!==b.id))r.bes=b=null;      // fertig: alle weg, Termin vorbei (Wege und Plätze vergessen)
 if(!b){if(t&&t.zu>=1&&anl&&anl.x>=0){r.bes=b=neu(z,a,r,t);a.zaehler++}else return}
 if(anl.x!==b.ax||anl.y!==b.ay){b.v=b.v.filter(function(v){return v.st===B_HIN||v.st===B_KEHRT||v.st===B_HEIM});b.Q=[];b.K=null;b.ende=1;b.sitz.fill(0)}      // versetzt
 if(!b.ende&&(!t||t.id!==b.id)){ende(z,r)}
 if(anl.v!==b.kv){b.kv=anl.v;var K=anl.offen?ATT().kette(z,anl):null;if(K)b.K=K;else if(!b.ende){schliessen(b);b.soll=b.n}}
 if(b.oi>=0&&!b.ende)ankunft(z,a,r,b);
 if(!b.ende&&b.K&&b.sp.length)while(b.n<b.soll&&z.tick>=b.t0+Math.floor(b.n*SPAWN/b.soll)+(b.n*7)%20)dazu(z,b);
 // Schlange: vorn zuerst, je halbes Feld einer
 var K=b.K,qm=K?((K.length>>1)-1)*256:0,i,v;
 var IX=null;if(b.Q.length>16){IX=new Map();for(i=0;i<b.v.length;i++)IX.set(b.v[i].id,b.v[i])}      // AR4: lange Schlangen (bis 1.600 Zuschauer) ohne Suchen je Platz
 for(i=0;i<b.Q.length;i++){v=IX?IX.get(b.Q[i]):finde(b,b.Q[i]);if(!v)continue;var ziel=Math.min(qm,i*ABSTAND);if(v.q>ziel)v.q=Math.max(ziel,v.q-SCHRITT_Q)}
 if(!b.ende&&b.Q.length&&z.tick>=b.ein){v=finde(b,b.Q[0]);if(v&&v.q<=0){b.Q.shift();b.ein=z.tick+EIN;var s=platz(b,v);
   if(s<0){v.st=B_RAUS}else{b.sitz[s]=1;v.sitz=s;v.st=B_HINEIN;v.t0=z.tick;v.t=z.tick+dauer(b,s,anl.ein);b.tk++;if(z.bau){z.bau.gold+=TICKET;z.bau.zaehler++}}}}
 var weg2=false;
 for(i=0;i<b.v.length;i++){v=b.v[i];
  if(v.st===B_HIN){if(laufen(v,b.P[v.pi])){if(b.ende||!b.K)kehren(b,v);else anstellen(b,v)}}
  else if(v.st===B_KEHRT){if(laufen(v,b.P[v.pi]))v.st=0}
  else if(v.st===B_RAUS){if(v.q<qm)v.q=Math.min(qm,v.q+SCHRITT_Q);else kehren(b,v)}
  else if(v.st===B_HINEIN){if(z.tick>=v.t)v.st=B_SITZT}
  else if(v.st===B_SITZT){if(b.ende&&z.tick>=v.t){v.st=B_HINAUS;v.t0=z.tick;v.t=anl.aus?z.tick+dauer(b,v.sitz,anl.aus):z.tick;b.sitz[v.sitz]=0}}
  else if(v.st===B_HINAUS){if(z.tick>=v.t){if(!anl.aus){v.st=0;continue}var sp=b.sp[v.sp];
    if(b.W[v.sp]<0){var w=weg(z,anl.aus[0],anl.aus[1],sp[0],sp[1]);if(w){b.P.push(w);b.W[v.sp]=b.P.length-1}else b.W[v.sp]=M31}
    if(b.W[v.sp]===M31){v.st=0;continue}v.st=B_HEIM;v.pi=b.W[v.sp];v.i=0;v.rv=0;v.x=anl.aus[0];v.y=anl.aus[1];v.nx=-1;v.sub=0;v.sitz=-1}}
  else if(v.st===B_HEIM){if(laufen(v,b.P[v.pi]))v.st=0}
  if(!v.st)weg2=true}
 if(weg2)b.v=b.v.filter(function(v){return v.st!==0});
 if(!(z.tick%20)){var k=kurzK(b);if(k!==b.zk){b.zk=k;a.zaehler++}}}
// ── An das Spiel ──
function zaehlen(b){var c={hin:0,schlange:0,drin:0,sitzen:0,gehen:0};if(!b)return c;
 b.v.forEach(function(v){if(v.st===B_HIN)c.hin++;else if(v.st===B_SCHLANGE)c.schlange++;else if(v.st===B_HINEIN)c.drin++;else if(v.st===B_SITZT)c.sitzen++;else c.gehen++});return c}
function kurzK(b){var c=zaehlen(b);return[b.sp.length,b.soll,b.n,c.hin,c.schlange,c.drin,c.sitzen,c.gehen,b.tk,b.ende,b.ohne].join(',')}
// AR2b: Herkunft je Ankunftspunkt [Kultur 1–24 (0 unbekannt), Ortsname] für die Karte (Name im Klang der Kultur, Herkunft). Gewicht ORTE_MAX−k = Ort k der Liste,
// der Ersatzpunkt am Ende der Schlange (ohne Weg) gilt als der nächste Ort. Höchstens ORTE_MAX + 1 Nachschläge, nur wenn sich die Zählung ändert (gladiatoren.js meld).
function herkunft(z,b){var a=z&&z.gla,O=a&&a.orte||[],A=z&&z.wg&&z.wg.ans,vk=A&&A.vk;
 return b.sp.map(function(s){var k=s[3]<0?0:ORTE_MAX-s[2],o=O[k];if(!o)return[0,''];var ku=vk&&vk.vol&&vk.vol[o[0]]?vk.tab[vk.vol[o[0]]-1]>>>24:0;return[ku,o[4]||'']})}
function kurz(r,z){var b=r&&r.bes;if(!b)return null;var c=zaehlen(b);return{id:b.id,soll:b.soll,kommen:b.n,hin:c.hin,schlange:c.schlange,drin:c.drin+c.sitzen,sitzen:c.sitzen,gehen:c.gehen,
 tickets:b.tk,ende:b.ende,ohne:b.ohne,plaetze:b.sitz.length,frei:frei(b),her:herkunft(z,b)}}
// Je Zuschauer MELD Zahlen: Nummer, Lage x und y in 1/256 Feld (draußen und in der Schlange; drinnen das Häuschen bzw. der Platz), Zustand, Typ (0–59),
// Platz (−1 keiner), Fortschritt drinnen 0–256 (zum Platz bzw. zum Ausgang), Richtung, Ankunftspunkt (AR2b: Herkunft über kurz().her)
function meld(z){var r=z.gla&&z.gla.ar,b=r&&r.bes;if(!b)return new Int32Array(1);if(r.anl)TYP=r.anl.typ;var n=b.v.length,A=new Int32Array(1+n*MELD),S=SITZE().plaetze,anl=r.anl,K=b.K;A[0]=n;
 for(var i=0;i<n;i++){var v=b.v[i],o=1+i*MELD,px=v.x*256+128,py=v.y*256+128,pr=0,dir=v.dir;
  if(v.st===B_SCHLANGE||v.st===B_RAUS){if(K){var j=v.q>>8,fr=v.q&255,m=(K.length>>1)-1;if(j>m){j=m;fr=0}px=K[j*2]*256+128;py=K[j*2+1]*256+128;
    if(j<m&&fr){var ddx=dx1(K[j*2],K[j*2+2]),ddy=K[j*2+3]-K[j*2+1];px+=ddx*fr;py+=ddy*fr;dir=v.st===B_RAUS?richtung(ddx,ddy):richtung(-ddx,-ddy)}}}
  else if(v.st===B_HINEIN||v.st===B_HINAUS){var h=v.st===B_HINEIN?anl.ein:anl.aus;if(h){px=h[0]*256+128;py=h[1]*256+128}pr=v.t>v.t0?Math.min(256,Math.floor((z.tick-v.t0)*256/(v.t-v.t0))):256}
  else if(v.st===B_SITZT&&v.sitz>=0){px=(b.ax*16+S[v.sitz][0])*16;py=(b.ay*16+S[v.sitz][1])*16;pr=256}
  else if(v.nx>=0&&v.len){var f=Math.floor(v.sub*256/v.len);if(f>256)f=256;px+=dx1(v.x,v.nx)*f;py+=(v.ny-v.y)*f}
  if(px<0)px+=WX*256;else if(px>=WX*256)px-=WX*256;
  A[o]=v.id;A[o+1]=px;A[o+2]=py;A[o+3]=v.st;A[o+4]=v.typ;A[o+5]=v.sitz;A[o+6]=pr;A[o+7]=dir;A[o+8]=v.sp}
 return A}

// ── Fingerabdruck und Spielstand ──
var VF_=['id','typ','sp','st','pi','i','rv','x','y','nx','ny','sub','len','dir','q','sitz','t0','t'];
function abdruck(b,f){if(!b){f(-1);return}f(STAND);f(b.rng);f(b.soll);f(b.n);f(b.t0);f(b.nid);f(b.tk);f(b.ein);f(b.ende);f(b.ohne);f(b.kv);f(b.ax);f(b.ay);f(b.oi);
 f(b.sp.length);b.sp.forEach(function(s){s.forEach(f)});f(b.P.length);b.P.forEach(function(p){f(p.pf.length);f(p.pf[0]|0);f(p.pf[p.pf.length-1]|0)});b.W.forEach(f);
 f(b.K?b.K.length:-1);f(b.Q.length);b.Q.forEach(f);b.sitz.forEach(f);f(b.v.length);b.v.forEach(function(v){VF_.forEach(function(k){f(v[k])})})}
function stand(b){if(!b)return null;return{format:STAND,id:b.id,rng:b.rng,soll:b.soll,n:b.n,t0:b.t0,nid:b.nid,tk:b.tk,ein:b.ein,ende:b.ende,ohne:b.ohne,kv:b.kv,ax:b.ax,ay:b.ay,oi:b.oi,
 sp:b.sp.map(function(s){return s.slice()}),P:b.P.map(function(p){return{pf:p.pf.slice(),tp:p.tp.slice()}}),W:b.W.slice(),K:b.K?b.K.slice():null,Q:b.Q.slice(),sitz:b.sitz.slice(),
 v:b.v.map(function(v){return VF_.map(function(k){return v[k]})})}}
function G(v,a,c){return typeof v==='number'&&v===Math.floor(v)&&v>=a&&v<=c}
function ausStand(d,typ){if(d==null)return null;TYP=typ||'sandgrube';var S=SITZE().plaetze,i;
 if(typeof d!=='object'||d.format!==STAND||typeof d.id!=='string'||d.id.length>40||!G(d.rng,1,4294967295)||!G(d.soll,0,MAX_V)||!G(d.n,0,MAX_V)||!G(d.t0,0,M31)||!G(d.nid,1,M31)||!G(d.tk,0,M31)||
  !G(d.ein,0,M31)||!G(d.ende,0,1)||!G(d.ohne,0,1)||!G(d.kv,-1,M31)||!G(d.ax,0,WX-1)||!G(d.ay,0,WY-1)||!G(d.oi,-1,ORTE_MAX))return false;
 if(!Array.isArray(d.P)||d.P.length>4*ORTE_MAX+2||!d.P.every(function(p){return p&&Array.isArray(p.pf)&&Array.isArray(p.tp)&&p.pf.length>=2&&p.pf.length<=MAX_PF&&p.pf.length===p.tp.length*2&&
  p.pf.every(function(x,j){return G(x,0,j&1?WY-1:WX-1)})&&p.tp.every(function(x){return G(x,0,255)})}))return false;
 if(!Array.isArray(d.sp)||d.sp.length<1&&!d.ohne&&d.oi<0||d.sp.length>ORTE_MAX+1||!d.sp.every(function(s){return Array.isArray(s)&&s.length===4&&G(s[0],0,WX-1)&&G(s[1],0,WY-1)&&G(s[2],1,ORTE_MAX)&&G(s[3],-1,d.P.length-1)}))return false;
 if(!Array.isArray(d.W)||d.W.length!==d.sp.length||!d.W.every(function(w){return w===M31||G(w,-1,d.P.length-1)}))return false;
 if(d.K!==null&&(!Array.isArray(d.K)||d.K.length<2||d.K.length>2*ATT().MAX_SCHLANGE||d.K.length&1||!d.K.every(function(x,j){return G(x,0,j&1?WY-1:WX-1)})))return false;
 if(!Array.isArray(d.sitz)||d.sitz.length!==S.length||!d.sitz.every(function(x){return x===0||x===1}))return false;
 if(!Array.isArray(d.v)||d.v.length>MAX_V||!Array.isArray(d.Q)||d.Q.length>d.v.length)return false;
 var GR={id:[1,M31],typ:[0,TYPEN-1],sp:[0,Math.max(0,d.sp.length-1)],st:[1,8],pi:[-1,d.P.length-1],i:[0,MAX_PF],rv:[0,1],x:[0,WX-1],y:[0,WY-1],nx:[-1,WX-1],ny:[-1,WY-1],sub:[0,LEN_D+VF*256],len:[0,LEN_D],
  dir:[0,3],q:[0,2*ATT().MAX_SCHLANGE*256],sitz:[-1,S.length-1],t0:[0,M31],t:[0,M31]},b={},V=[];
 for(i=0;i<d.v.length;i++){var a=d.v[i];if(!Array.isArray(a)||a.length!==VF_.length)return false;var v={};
  for(var j=0;j<VF_.length;j++){var g=GR[VF_[j]];if(!G(a[j],g[0],g[1]))return false;v[VF_[j]]=a[j]}
  if((v.st===B_HIN||v.st===B_KEHRT||v.st===B_HEIM)&&(v.pi<0||v.i>=d.P[v.pi].tp.length))return false;
  if((v.st===B_SCHLANGE||v.st===B_RAUS)&&!d.K)return false;if((v.st===B_HINEIN||v.st===B_SITZT)&&(v.sitz<0||!d.sitz[v.sitz]))return false;V.push(v)}
 if(!d.Q.every(function(id){return V.some(function(v){return v.id===id&&v.st===B_SCHLANGE})}))return false;
 b=JSON.parse(JSON.stringify(d));delete b.format;b.v=V;b.zk='';return b}

var BES={STAND:STAND,MELD:MELD,ZUST:ZUST,ZUSCHAUER:ZUSCHAUER,TICKET:TICKET,SPAWN:SPAWN,EIN:EIN,GEHEN:GEHEN,WEIT:WEIT,B_HIN:B_HIN,B_SCHLANGE:B_SCHLANGE,B_HINEIN:B_HINEIN,B_SITZT:B_SITZT,
 B_HINAUS:B_HINAUS,B_HEIM:B_HEIM,B_KEHRT:B_KEHRT,B_RAUS:B_RAUS,adel:adel,weg:weg,schritt:schritt,wechsel:wechsel,ende:ende,zaehlen:zaehlen,kurz:kurz,meld:meld,abdruck:abdruck,stand:stand,ausStand:ausStand};
if(typeof module!=='undefined'&&module.exports)module.exports=BES;else root.AT3BES=BES;
})(typeof self!=='undefined'?self:this);
