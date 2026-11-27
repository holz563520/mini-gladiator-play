// WAS DIE DATEI TUT: Attraktionen im Weltkern von Arena Theory 3.0 (Schritt AR1b): Werkzeug für jede große Anlage mit Ein- und Ausgang wie RollerCoaster Tycoon
// Classic (Fahrplan Regel 20). Fußabdruck setzen und versetzen (sperrt, rodet), Eingangs- und Ausgangshäuschen je ein Feld direkt außen am Rand setzen und
// kostenlos versetzen, Warteschlange aus Queue Path prüfen, Zustand offen/zu mit Grund. Gezeichnet wird hier nichts (AR1c).
// Entscheidungen Thomas (20.11.2026): Boden höchstens 1 Höhenstufe Unterschied im ganzen Fußabdruck, Setzen kostenlos und sofort fertig, Versetzen erlaubt
// (arena.js: nur ohne offenen Kampftermin, Häuschen müssen danach neu gesetzt werden).
// Offen ist eine Anlage, wenn (wie 2.0 welt-arena.js schlangeRechnen) eine Kette aus fertigem Queue Path am Eingangshäuschen beginnt und ihr am weitesten
// entferntes Feld an einen normalen Weg (gebauter Weg oder Weltstraße) grenzt, und das Ausgangshäuschen an einem normalen Weg liegt.
// Kerne: nur Weltkern. Kosten: Setzen einmal je Befehl (Fußabdruck 221 Felder), Zustand nur wenn sich am Bau etwas geändert hat (höchstens einmal je Sekunde,
// Schlange höchstens MAX_SCHLANGE Felder). Nichts hängt von der Weltgröße ab (Regel 14).
// Wiederverwendet: Fußabdruck der 2.0-Sandgrube (= kartei arena-sandgrube, Test), Regeln für Eingang, Ausgang und Schlange aus 2.0 welt-arena.js,
// Bodenprüfung, Rodung und Wegschicht aus bau.js (G5a/G6a), Begehbarkeit aus begehbar.js.
(function(root){
'use strict';
function BAU(){return root.AT3BAU||(typeof module!=='undefined'&&module.exports?require('./bau.js'):null)}
var ST=64, WX=ST*9600, WY=ST*4800, MAX_SCHLANGE=256, WEG_Q=5;
var DX=[0,-1,0,1], DY=[-1,0,1,0];                        // Seiten 0 Nord, 1 West, 2 Süd, 3 Ost
// Tafel der Anlagen: Kennung in der Kartei, Fläche, Fußabdruck (x = gesperrt, f = frei, Zeile für Zeile von Nord nach Süd)
var ANLAGEN={
 sandgrube:{id:'arena-sandgrube',w:17,h:17,feld:new Array(290).join('x')},   // seit 27.11.2026 (Thomas) eckiger Platz: die ganze Fläche 17 × 17 gehört zur Anlage
 // AR4 (Thomas 27.11.2026): Arena Stufe 4 „Great Amphitheatre“, eckiger Platz 47 × 47 wie die Sandgrube (= kartei arena-amphitheater, Test)
 amphitheater:{id:'arena-amphitheater',w:47,h:47,feld:new Array(47*47+1).join('x')},
 // N12j1 (Thomas 27.11.2026): Sandgrube als Rechteck 25 × 17 mit Budenviertel (= kartei arena-sandgrube-viertel, Test). Das Rund steht in der Mitte, die lange Seite
 // liegt in Ost-West-Richtung. Doppeltor in der Mitte der Südseite: tor = Lage der Häuschen in Feldern neben der Mittelspalte (Eingang links vor IN, Ausgang rechts
 // vor OUT), weit = so nah an der Mitte muss der Spieler tippen. Die alte Art sandgrube (eckiger Platz 17 × 17) bleibt für alte Spielstände und ?arenaRechteck=0.
 sandviertel:{id:'arena-sandgrube-viertel',w:25,h:17,feld:new Array(25*17+1).join('x'),tor:{ein:-2,aus:2,weit:3}}};
var HAUS=['ein','aus'];
function um(X){return X<0?X+WX:X>=WX?X-WX:X}
function rel(X,x0){var d=X-x0;if(d<-WX/2)d+=WX;else if(d>WX/2)d-=WX;return d}      // Abstand in x über die Naht
function belegt(A,dx,dy){return dx>=0&&dy>=0&&dx<A.w&&dy<A.h&&A.feld.charCodeAt(dy*A.w+dx)===120}
function neu(typ,id){return{typ:typ,id:id,x:-1,y:-1,hs:0,ein:null,aus:null,offen:0,grund:'unplaced',schlange:0,ende:null,v:-1}}
function raum(rec){return(BAU().RAUM_ANL|rec.id)>>>0}
// Felder des Fußabdrucks mit linker oberer Ecke x0,y0 als flache Liste [X,Y,…]
function felder(A,x0,y0){var L=[];for(var j=0;j<A.h;j++)for(var i=0;i<A.w;i++)if(belegt(A,i,j))L.push(um(x0+i),y0+j);return L}
function innen(rec,X,Y){var A=ANLAGEN[rec.typ];return rec.x>=0&&belegt(A,rel(X,rec.x),Y-rec.y)}
function steht(z,L){var S=new Set();for(var i=0;i<L.length;i+=2)S.add(L[i+1]*WX+L[i]);
 var P=z.per?z.per.p:[],K=z.kar?z.kar.k:[],j;for(j=0;j<P.length;j++)if(S.has(P[j].y*WX+P[j].x))return true;for(j=0;j<K.length;j++)if(S.has(K[j].y*WX+K[j].x))return true;return false}

// ── Fußabdruck prüfen (ändert nichts): Boden, Höhe, Belegung, niemand darf darauf stehen, sperr = weitere freizuhaltende Felder [[X,Y],…] ──
function pruefen(z,rec,x0,y0,sperr){var A=ANLAGEN[rec.typ];if(!A)return{ok:false,grund:'invalid'};
 if(!z.wg||!z.wg.ans)return{ok:false,grund:'no_world'};if(y0<0||y0+A.h>=WY-1)return{ok:false,grund:'edge'};
 var L=felder(A,um(x0),y0),C=new Map(),mn=1e9,mx=-1,rod=0,r=raum(rec),i;
 for(i=0;i<L.length;i+=2){var g=BAU().anlageBoden(z,L[i],L[i+1],C,r);if(typeof g==='string')return{ok:false,grund:g,x:L[i],y:L[i+1]};
  if(g[0]<mn)mn=g[0];if(g[1]>mx)mx=g[1];rod+=g[2]}
 if(mx-mn>1)return{ok:false,grund:'too_steep'};
 if(sperr)for(i=0;i<sperr.length;i++){var s=sperr[i];if(s&&belegt(A,rel(s[0],um(x0)),s[1]-y0))return{ok:false,grund:'occupied',x:s[0],y:s[1]}}
 if(steht(z,L))return{ok:false,grund:'people'};
 return{ok:true,grund:'',felder:L,rod:rod,hs:mn}}
// Setzen oder versetzen (kostenlos, sofort fertig). Häuschen fallen beim Versetzen weg. Gibt null oder den Ablehnungsgrund zurück.
function setzen(z,rec,x0,y0,sperr){x0=um(x0);var p=pruefen(z,rec,x0,y0,sperr);if(!p.ok)return p.grund;
 var r=raum(rec);if(rec.x>=0)BAU().anlageLoeschen(z,alle(rec),r);
 BAU().anlageSchreiben(z,p.felder,BAU().A_ANLAGE,r);rec.x=x0;rec.y=y0;rec.hs=p.hs;rec.ein=null;rec.aus=null;rec.v=-1;zustand(z,rec);return null}
// AR4: Anlage gegen eine andere Art tauschen (z. B. Sandgrube → Great Amphitheatre), Mitte cx,cy. Erst prüfen (die eigenen Felder zählen als frei), dann die alte
// abräumen und die neue setzen; Häuschen fallen weg wie beim Versetzen. Gibt den neuen Datensatz zurück oder den Ablehnungsgrund (dann bleibt alles, wie es war).
function wechseln(z,rec,typ,cx,cy,sperr){var A=ANLAGEN[typ];if(!A)return'invalid';var n=neu(typ,rec.id),x0=um(cx-(A.w>>1)),y0=cy-(A.h>>1),p=pruefen(z,n,x0,y0,sperr);if(!p.ok)return p.grund;
 if(rec.x>=0)BAU().anlageLoeschen(z,alle(rec),raum(rec));var g=setzen(z,n,x0,y0,sperr);return g||n}
function alle(rec){var L=felder(ANLAGEN[rec.typ],rec.x,rec.y);HAUS.forEach(function(h){if(rec[h])L.push(rec[h][0],rec[h][1])});return L}

// ── Häuschen: je ein Feld direkt außen am Rand (Nachbar eines Fußabdruck-Felds), nicht auf dem anderen Häuschen ──
// Seite zur Anlage: die Seite, deren Nachbar im Fußabdruck liegt (bei zweien die, die näher zur Mitte zeigt). −1 = nicht am Rand.
function seite(rec,X,Y){var A=ANLAGEN[rec.typ],best=-1,bd=1e9;
 for(var s=0;s<4;s++){var nx=um(X+DX[s]),ny=Y+DY[s];if(!innen(rec,nx,ny))continue;var dx=2*rel(nx,rec.x)-(A.w-1),dy=2*(ny-rec.y)-(A.h-1),d=dx*dx+dy*dy;if(d<bd){bd=d;best=s}}
 return best}
// N12j1: Hat die Anlage ein festes Tor (ANLAGEN.tor), steht das Häuschen immer vor seiner Tür an der Südseite: Tippen vor dem Tor genügt, die Lage rastet ein.
function hausPruefen(z,rec,art,X,Y){if(HAUS.indexOf(art)<0)return{ok:false,grund:'invalid'};if(rec.x<0)return{ok:false,grund:'unplaced'};X=um(X);
 var T=ANLAGEN[rec.typ].tor;if(T){var mx=um(rec.x+(ANLAGEN[rec.typ].w>>1));if(Y!==rec.y+ANLAGEN[rec.typ].h||Math.abs(rel(X,mx))>T.weit)return{ok:false,grund:'not_at_gate',x:X,y:Y};X=um(mx+T[art])}
 var alt=rec[art],ander=rec[art==='ein'?'aus':'ein'];if(alt&&alt[0]===X&&alt[1]===Y)return{ok:false,grund:'nothing'};
 if(innen(rec,X,Y)||(ander&&ander[0]===X&&ander[1]===Y))return{ok:false,grund:'occupied',x:X,y:Y};
 var s=seite(rec,X,Y);if(s<0)return{ok:false,grund:'not_at_edge',x:X,y:Y};
 var g=BAU().anlageBoden(z,X,Y,new Map(),alt&&alt[0]===X&&alt[1]===Y?raum(rec):0);if(typeof g==='string')return{ok:false,grund:g,x:X,y:Y};
 if(g[1]-g[0]>1)return{ok:false,grund:'too_steep',x:X,y:Y};
 return{ok:true,grund:'',seite:s,x:X,y:Y}}
function hausSetzen(z,rec,art,X,Y){X=um(X);var p=hausPruefen(z,rec,art,X,Y);if(!p.ok)return p.grund;var r=raum(rec);X=p.x;Y=p.y;
 if(rec[art])BAU().anlageLoeschen(z,[rec[art][0],rec[art][1]],r);
 BAU().anlageSchreiben(z,[X,Y],BAU().A_HAUS,r);rec[art]=[X,Y,p.seite];rec.v=-1;zustand(z,rec);return null}

// ── Zustand offen/zu (nur wenn sich am Bau etwas geändert hat). Gibt true zurück, wenn sich offen, Grund oder Schlange geändert haben. ──
// Gründe: unplaced, no_entrance (kein Eingangshäuschen), no_exit (kein Ausgangshäuschen), no_queue (keine Schlange mit Anschluss), exit_blocked (Ausgang ohne Weg)
function normal(t){return(t>=1&&t<=4)||t>10}
function amWeg(z,rec,X,Y,zur,C){for(var s=0;s<4;s++){if(s===zur)continue;var nx=um(X+DX[s]),ny=Y+DY[s];if(ny<0||ny>=WY)continue;if(normal(BAU().wegTyp(z,nx,ny,C)))return true}return false}
function schlange(z,rec,C){var e=rec.ein;if(!e)return null;var Q=[],d=new Map(),i,s,best=-1,ende=null;
 for(s=0;s<4;s++){if(s===e[2])continue;var X=um(e[0]+DX[s]),Y=e[1]+DY[s];if(Y<0||Y>=WY)continue;var k=Y*WX+X;if(!d.has(k)&&BAU().wegTyp(z,X,Y,C)===WEG_Q){d.set(k,1);Q.push(X,Y)}}
 for(i=0;i<Q.length&&Q.length<2*MAX_SCHLANGE;i+=2){var x=Q[i],y=Q[i+1],dist=d.get(y*WX+x);
  for(s=0;s<4;s++){var nx=um(x+DX[s]),ny=y+DY[s];if(ny<0||ny>=WY)continue;var nk=ny*WX+nx;if(d.has(nk))continue;
   if(BAU().wegTyp(z,nx,ny,C)===WEG_Q){d.set(nk,dist+1);Q.push(nx,ny)}}}
 for(i=0;i<Q.length;i+=2){var dd=d.get(Q[i+1]*WX+Q[i]);if(dd>best&&amWeg(z,rec,Q[i],Q[i+1],-1,C)){best=dd;ende=[Q[i],Q[i+1]]}}
 return{n:Q.length>>1,ende:ende}}
// AR2a: Schlange als Feldliste vom Feld am Eingangshäuschen (vorn) bis zum Ende am Weg, für die Zuschauer. Gleiche Kette wie schlange(): kürzester Weg
// über Queue Path vom Ende zurück zum Eingang. Gibt [X,Y,…] zurück oder null (keine Schlange mit Anschluss). Kosten höchstens MAX_SCHLANGE Felder.
function kette(z,rec){var e=rec.ein,en=rec.ende;if(!e||!en)return null;var C=new Map(),d=new Map(),Q=[],i,s;
 for(s=0;s<4;s++){if(s===e[2])continue;var X=um(e[0]+DX[s]),Y=e[1]+DY[s];if(Y<0||Y>=WY)continue;var k=Y*WX+X;if(!d.has(k)&&BAU().wegTyp(z,X,Y,C)===WEG_Q){d.set(k,1);Q.push(X,Y)}}
 for(i=0;i<Q.length&&Q.length<2*MAX_SCHLANGE;i+=2){var x=Q[i],y=Q[i+1],dist=d.get(y*WX+x);
  for(s=0;s<4;s++){var nx=um(x+DX[s]),ny=y+DY[s];if(ny<0||ny>=WY)continue;var nk=ny*WX+nx;if(d.has(nk))continue;if(BAU().wegTyp(z,nx,ny,C)===WEG_Q){d.set(nk,dist+1);Q.push(nx,ny)}}}
 var L=[en[0],en[1]],cx=en[0],cy=en[1],cd=d.get(cy*WX+cx);if(!cd)return null;
 while(cd>1){var ok=false;for(s=0;s<4;s++){var px=um(cx+DX[s]),py=cy+DY[s];if(d.get(py*WX+px)===cd-1){cx=px;cy=py;cd--;L.push(cx,cy);ok=true;break}}if(!ok)return null}
 var R=[];for(i=L.length-2;i>=0;i-=2)R.push(L[i],L[i+1]);return R}
function zustand(z,rec){if(rec.x<0)return false;var v=z.bau?z.bau.zaehler:0;if(v===rec.v)return false;rec.v=v;
 var C=new Map(),q=schlange(z,rec,C),aus=rec.aus&&amWeg(z,rec,rec.aus[0],rec.aus[1],rec.aus[2],C),g;
 g=!rec.ein?'no_entrance':!rec.aus?'no_exit':!(q&&q.ende)?'no_queue':!aus?'exit_blocked':'';
 var n=q?q.n:0,en=q&&q.ende?q.ende:null,alt=rec.grund+'|'+rec.schlange+'|'+(rec.ende?rec.ende.join(','):'');
 rec.grund=g;rec.offen=g?0:1;rec.schlange=n;rec.ende=en;return alt!==g+'|'+n+'|'+(en?en.join(','):'')}

// ── Spielstand und Fingerabdruck ──
function G(v,a,b){return typeof v==='number'&&v===Math.floor(v)&&v>=a&&v<=b}
// AR2a: Zustand mit Version (z.bau.zaehler) gesichert, damit er nach dem Laden sofort gilt (vorher erst nach dem nächsten Nachrechnen; die Zuschauer brauchen ihn)
function stand(rec){return rec?{typ:rec.typ,id:rec.id,x:rec.x,y:rec.y,hs:rec.hs,ein:rec.ein?rec.ein.slice():null,aus:rec.aus?rec.aus.slice():null,
 zu:[rec.v,rec.offen,rec.grund,rec.schlange,rec.ende?rec.ende[0]:-1,rec.ende?rec.ende[1]:-1]}:null}
function hausOk(h){return h===null||(Array.isArray(h)&&h.length===3&&G(h[0],0,WX-1)&&G(h[1],0,WY-1)&&G(h[2],0,3))}
function ausStand(d){if(!d||typeof d!=='object'||!ANLAGEN[d.typ]||!G(d.id,1,0x7fffffff)||!(d.x===-1||G(d.x,0,WX-1))||!(d.y===-1||G(d.y,0,WY-1))||!G(d.hs,0,1000)||!hausOk(d.ein)||!hausOk(d.aus))return null;
 if(d.x<0&&(d.ein||d.aus))return null;
 var r=neu(d.typ,d.id);r.x=d.x;r.y=d.y;r.hs=d.hs;r.ein=d.ein?d.ein.slice():null;r.aus=d.aus?d.aus.slice():null;
 var u=d.zu;if(Array.isArray(u)&&u.length===6&&G(u[0],-1,2147483647)&&G(u[1],0,1)&&GRUENDE.indexOf(u[2])>=0&&G(u[3],0,MAX_SCHLANGE*2)&&(u[4]===-1?u[5]===-1:G(u[4],0,WX-1)&&G(u[5],0,WY-1))){
  r.v=u[0];r.offen=u[1];r.grund=u[2];r.schlange=u[3];r.ende=u[4]<0?null:[u[4],u[5]]}
 return r}      // ohne zu (AR1-Stände): Zustand wird nach dem Laden neu gerechnet (v = −1)
var GRUENDE=['','unplaced','no_entrance','no_exit','no_queue','exit_blocked'];
function abdruck(rec,f){if(!rec){f(-1);return}f(rec.id);f(rec.x);f(rec.y);f(rec.hs);HAUS.forEach(function(h){var e=rec[h];f(e?e[0]:-1);f(e?e[1]:-1);f(e?e[2]:-1)});f(rec.offen);f(rec.schlange)}
// Für das Spiel (AR1c): Lage, Häuschen, Zustand
function kurz(rec){if(!rec)return null;var A=ANLAGEN[rec.typ];return{typ:rec.typ,id:A.id,x:rec.x,y:rec.y,w:A.w,h:A.h,hs:rec.hs,ein:rec.ein?rec.ein.slice():null,aus:rec.aus?rec.aus.slice():null,
 offen:rec.offen,grund:rec.grund,schlange:rec.schlange,ende:rec.ende?rec.ende.slice():null}}

var AT={ANLAGEN:ANLAGEN,MAX_SCHLANGE:MAX_SCHLANGE,WEG_Q:WEG_Q,neu:neu,felder:felder,innen:innen,seite:seite,pruefen:pruefen,setzen:setzen,wechseln:wechseln,hausPruefen:hausPruefen,hausSetzen:hausSetzen,
 zustand:zustand,kette:kette,stand:stand,ausStand:ausStand,abdruck:abdruck,kurz:kurz};
if(typeof module!=='undefined'&&module.exports)module.exports=AT;else root.AT3ATT=AT;
})(typeof self!=='undefined'?self:this);
