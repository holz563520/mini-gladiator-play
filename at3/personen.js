// WAS DIE DATEI TUT: Arbeiter im Weltkern von Arena Theory 3.0 (Schritt G7): erste Personen, Laufen zu Fuß entlang einer Feldliste, Aufgabenkern
// (Tragen vor Bauen, Zuteilung von selbst), Arbeitsfähigkeiten Tragen und Bauen, Spielstand, Fingerabdruck. Reine Rechnung ohne Bildschirm, nur ganze Zahlen.
// Entscheidungen Thomas (16.11.2026): 5 Arbeiter am Anfang, sie erscheinen am gewählten Startplatz; Arbeiter tragen Material zu Fuß zur Baustelle und
// bauen; Arbeiter sind normale Gladiatorenfiguren (E7), Bild figur-arbeiter aus dem Startset.
// Aufgaben (Vorrang Versorgung vor Arbeit, AT3_PLAN 6.3): 1 holen (zur Quelle eines Lieferauftrags), 2 bringen (zum Ziel), 3 bauen (zur Baustelle, dort
// bleiben, solange sie weiterbauen kann), 4 Rückgabe (Ware eines abgebrochenen Auftrags ins Lager). Zuteilung je Tick höchstens 2 neue Aufgaben, nur an
// freie Personen: Lieferaufträge (Material für Baustellen und über 60 s alte zuerst, sonst der Reihe nach) an die nächste freie Person, Baustellen ohne Bauarbeiter an die beste freie Person (Fähigkeit, dann Nähe).
// Keine Prüfung „jede Person gegen jede Aufgabe“. Eine Baustelle bekommt erst einen Bauarbeiter, wenn ihr Material da ist; wartet er dort länger als
// 2 s vergeblich, wird er wieder frei (und kann tragen). Eingreifen von Hand: Befehl personRolle {id, darf} (Bit 0 tragen, Bit 1 bauen), sonst Automatik (Regel 18).
// Fähigkeiten (IST 0–100, wachsen durch die Arbeit selbst): Tragen → mit Last bis 50 % schneller; Bauen → bis 50 % schneller. Vorschlagswerte.
// Laufen: Wegauftrag „pweg“ an einen Helfer (wegsuche.js, Profil zu Fuß, naher Weg), dann Feld für Feld, 1 Feld/s × Bodentempo wie die Karren. Personen
// belegen keine Felder (kein Stau). Ändert sich der Bau unter dem Weg (Wegversion), wird der Rest nachgeprüft, sonst neu gesucht. Ohne Weg: 10 s warten;
// ein Lieferauftrag wird nach 3 Fehlversuchen abgebrochen, getragene Ware als Stapel abgelegt (geht nie verloren).
// Kerne: nur Weltkern (Regel 13), Suchen auf den Helfern. Kosten je Person und Tick fest, nichts hängt von der Weltgröße ab (Regel 14).
// Wiederverwendet: Bewegung, Wegversion und Nachprüfen aus karren.js (G6c), Wegsuche und Fenster aus G6b, Begehbarkeit aus G6a, Baustellen aus G5,
// Bestände und Aufträge aus waren.js.
// G8 (ketten.js, nur wenn die Ketten laufen): Aufgaben 5 fällen, 6 sägen, 7 kochen, 8 jagen, 9 Wasser schöpfen, 10 essen und trinken; Rollen-Bits 2–6;
// Fähigkeiten f2–f6 und Zähler der Arbeitsgänge n0–n6 je Tätigkeit; hungrig oder durstig (hu) = halb so schnell. Spielstand Form 2 (Form 1 wird gelesen).
(function(root){
'use strict';
function SU(){return root.AT3WEG||(typeof module!=='undefined'&&module.exports?require('./wegsuche.js'):null)}
function WE(){return root.AT3WEGSTROM||(typeof module!=='undefined'&&module.exports?require('./wegstrom.js'):null)}
function BG(){return root.AT3BEGEH||(typeof module!=='undefined'&&module.exports?require('./begehbar.js'):null)}
function BAU(){return root.AT3BAU||(typeof module!=='undefined'&&module.exports?require('./bau.js'):null)}
function KAR(){return root.AT3KARREN||(typeof module!=='undefined'&&module.exports?require('./karren.js'):null)}
function W(){return root.AT3WAREN||(typeof module!=='undefined'&&module.exports?require('./waren.js'):null)}
function KET(){return root.AT3KETTEN||(typeof module!=='undefined'&&module.exports?require('./ketten.js'):null)}
var ST=64, SX=9600, WX=ST*SX, WY=ST*4800, STAND=2, M31=2147483647, ALLE=127;
var N_START=5, MAX_P=512, JE_TICK=2, FRIST=20, WIEDER=200, MAX_VERSUCH=3, NAH=3, LEERLAUF=40, XP_TRAG=2, XP_BAU=4, ALT=1200;   // Vorschlagswerte (Ticks: 20 = 1 s)
var LEN_O=256000, LEN_D=362039, VF=128;      // wie karren.js: Tempo 100 = 1 Feld/s
var Z_FREI=0, Z_SUCHT=1, Z_GEHT=2, Z_ARBEITET=3, Z_WARTET=4, ZUST=['idle','seeks','walks','works','waits'];
var A_HOLEN=1, A_BRINGEN=2, A_BAUEN=3, A_RUECK=4;
// Gründe: 1–6 wie wegsuche.js, 7 too_far, 8 changed
var DX=[0,-1,0,1], DY=[-1,0,1,0];
function umX(X){return X<0?X+WX:X>=WX?X-WX:X}
function umS(c){return c<0?c+SX:c>=SX?c-SX:c}
function dx1(a,b){var d=b-a;return d>1?d-WX:d<-1?d+WX:d}
function neu(){return{nr:1,p:[],bau:new Map()}}
function person(id,x,y){return{id:id,x:x,y:y,nx:-1,ny:-1,sub:0,len:0,zust:Z_FREI,t:0,i:0,ab:0,job:-1,versuch:0,grund:0,dir:1,auf:0,o:0,site:0,zx:-1,zy:-1,darf:ALLE,f0:0,f1:0,e0:0,e1:0,leer:0,f2:0,f3:0,f4:0,f5:0,f6:0,e2:0,e3:0,e4:0,e5:0,e6:0,n0:0,n1:0,n2:0,n3:0,n4:0,n5:0,n6:0,kx:-1,ky:-1,kr:0,kt:0,em:0,ew:0,et:0,hu:0,pf:null,tp:null,keys:[]}}
function start(z,x,y){if(z.per)return;var g=z.per=neu();for(var i=0;i<N_START;i++)g.p.push(person(g.nr++,x,y))}
function finde(g,id){for(var i=0;i<g.p.length;i++)if(g.p[i].id===id)return g.p[i];return null}
function rolle(z,id,darf){var c=z.per&&finde(z.per,id);if(c)c.darf=darf}
function bauVon(z,nr){var A=z.bau?z.bau.auf:[];for(var i=0;i<A.length;i++)if(A[i].nr===nr)return A[i];return null}
// Bauarbeiter einer Baustelle: zugeteilt (auch noch auf dem Weg) bzw. vor Ort bei der Arbeit
function hatBauer(z,a){return !!z.per&&z.per.bau.has(a.nr)}
function amBau(z,a){var g=z.per;if(!g)return null;var id=g.bau.get(a.nr);if(id===undefined)return null;var c=finde(g,id);return c&&c.zust===Z_ARBEITET?c:null}
// Ist jemand, der bauen darf, nah genug (naher Weg: höchstens 2 Kartenstücke)? Darf niemand bauen, gilt das nicht als „zu weit“. Nur für die Anzeige des Grunds.
function inReichweite(z,x,y){var g=z.per,n=0;if(!g)return true;for(var i=0;i<g.p.length;i++){var c=g.p[i];if(!(c.darf&2))continue;n++;if(WE().nah({x0:c.x,y0:c.y,x1:x,y1:y}))return true}return !n}
function gebaut(z,a){var c=amBau(z,a);if(!c)return;c.n1++;if(++c.e1>=(c.f1+1)*XP_BAU&&c.f1<100){c.e1=0;c.f1++}}

// ── Orte: begehbares Feld an einem Bauziel, Lage eines Bestands ──
function gangbar(z,X,Y){var w=z.wg;if(!w||Y<0||Y>=WY)return false;var b=z.bau;
 return BG().tempo(function(cx,cy){return w.stuecke.get(umS(cx)*8192+cy)||null},function(cx,cy){return b?BAU().stueck(b,umS(cx)*8192+cy):null},w.seed>>>0,umX(X),Y,0)>0}
// Feld, von dem aus ein Ziel (t: 0 Feld, 1 Nordkante, 2 Westkante, 3 Wegfeld) gebaut wird: das Feld selbst, bei Kanten sonst die andere Seite, sonst ein Nachbar
function zielFeld(z,t,X,Y){if(!z.wg||gangbar(z,X,Y))return[X,Y];var L=t===1?[0]:t===2?[1]:[],s;for(s=0;s<4;s++)if(L.indexOf(s)<0)L.push(s);
 for(var i=0;i<L.length;i++){s=L[i];var x=umX(X+DX[s]),y=Y+DY[s];if(gangbar(z,x,y))return[x,y]}return[X,Y]}
function zielPos(z,a){var Z=a.ziele,j=a.rest?a.i:W().naechstesZiel(z.bau,a);if(j<0||j*3>=Z.length)j=Math.min(a.i,Z.length/3-1);return zielFeld(z,Z[j*3],Z[j*3+1],Z[j*3+2])}
function invPos(z,t,id){var Wn=W(),i=Wn.hole(z.war,t,id);if(!i)return null;if(t===Wn.T_BAU){var a=bauVon(z,id);if(a)return zielPos(z,a)}return[i.x,i.y]}

// ── Aufgaben beginnen und beenden ──
function los(g,c){if(c.site&&g.bau.get(c.site)===c.id)g.bau.delete(c.site);c.site=0;c.auf=0;c.o=0;c.leer=0;c.zust=Z_FREI;c.pf=null;c.tp=null;c.keys=[];c.i=0;c.job=-1;c.nx=-1;c.ny=-1;c.sub=0;c.zx=-1;c.zy=-1;c.kx=-1;c.ky=-1;c.kr=0;c.kt=0}
function geh(z,c,x,y){c.zx=x;c.zy=y;c.pf=null;c.tp=null;c.keys=[];c.i=0;c.job=-1;c.versuch=0;c.nx=-1;c.ny=-1;c.sub=0;c.grund=0;
 if(c.x===x&&c.y===y){ankunft(z,c);return}c.zust=Z_SUCHT}
function warten(z,c,code){los(z.per,c);c.zust=Z_WARTET;c.t=z.tick+WIEDER;c.grund=code}
// Kein Weg: Lieferauftrag freigeben (nach 3 Fehlversuchen abbrechen), getragene Ware ablegen, Baustelle freigeben; die Person wartet 10 s
function scheitern(z,c,code){var Wn=W(),g=z.war,o;
 if(c.auf===A_HOLEN){o=Wn.finde(g,c.o);if(o&&o.tt===Wn.T_PERSON&&o.ti===c.id&&o.zu===Wn.A_RES){o.tt=0;o.ti=0;o.grund=1;o.sperr=z.tick+WIEDER;if(++o.versuch>=MAX_VERSUCH)Wn.abbrechen(z,o)}}
 else if(c.auf===A_BRINGEN||c.auf===A_RUECK){o=Wn.finde(g,c.o);if(o&&o.tt===Wn.T_PERSON&&o.ti===c.id)Wn.abbrechen(z,o);Wn.ablegen(z,Wn.T_PERSON,c.id,c.x,c.y)}
 else if(c.auf>=5&&z.ket)KET().gescheitert(z,c);
 warten(z,c,code)}
function ankunft(z,c){var Wn=W(),g=z.war,o,P;c.pf=null;c.tp=null;c.keys=[];c.i=0;c.nx=-1;c.ny=-1;c.sub=0;
 if(c.auf>=5){if(z.ket)KET().ankunft(z,c);else los(z.per,c);return}      // G8
 if(c.auf===A_HOLEN){o=Wn.finde(g,c.o);
  if(!o||o.tt!==Wn.T_PERSON||o.ti!==c.id||!Wn.aufnehmen(z,o,Wn.T_PERSON,c.id,c.x,c.y)){if(o&&o.tt===Wn.T_PERSON&&o.ti===c.id){o.tt=0;o.ti=0}los(z.per,c);return}
  P=invPos(z,o.nt,o.ni);if(!P){Wn.abbrechen(z,o);zurueck(z,c);return}c.auf=A_BRINGEN;geh(z,c,P[0],P[1]);return}
 if(c.auf===A_BRINGEN||c.auf===A_RUECK){o=Wn.finde(g,c.o);
  if(o&&o.tt===Wn.T_PERSON&&o.ti===c.id&&Wn.abliefern(z,o)){c.n0++;if(++c.e0>=(c.f0+1)*XP_TRAG&&c.f0<100){c.e0=0;c.f0++}los(z.per,c);return}
  if(o&&o.tt===Wn.T_PERSON&&o.ti===c.id)Wn.abbrechen(z,o);zurueck(z,c);return}
 if(c.auf===A_BAUEN){c.zust=Z_ARBEITET;c.leer=0;return}
 los(z.per,c)}
// Ware ohne Auftrag in der Hand: ins nächste Lager zurück, sonst ablegen
function zurueck(z,c){var Wn=W(),o=Wn.rueck(z,Wn.T_PERSON,c.id,c.x,c.y);if(!o){los(z.per,c);return}var P=invPos(z,o.nt,o.ni);c.auf=A_RUECK;c.o=o.nr;c.site=0;geh(z,c,P[0],P[1])}

// ── Je Tick: Bewegung, Zuteilung, Wegaufträge ──
function veraltet(z,c){var wt=z.bau&&z.bau.wt;if(!wt)return false;for(var i=0;i<c.keys.length;i++){var t=wt.get(c.keys[i]);if(t!==undefined&&t>c.ab)return true}return false}
function richtung(dx,dy){return dx>0?0:dx<0?3:dy>0?1:2}
function traegt(c){return c.auf===A_BRINGEN||c.auf===A_RUECK}
function bewegen(z,g,c){var Wn=W(),o;
 if(c.zust===Z_WARTET){if(z.tick>=c.t){c.zust=Z_FREI;c.grund=0}return}
 if(c.zust===Z_ARBEITET&&c.auf>=5){if(z.ket)KET().werk(z,c);else los(g,c);return}      // G8: Arbeit der Ketten
 if(c.zust===Z_ARBEITET){var a=bauVon(z,c.site);if(!a||a.zu!==BAU().B_LAEUFT){los(g,c);return}
  if(z.ket&&!a.rest&&KET().essPause(z,c)){los(g,c);return}      // G8: erst essen und trinken
  var P=zielPos(z,a);if(Wn.weit(c.x,c.y,P[0],P[1])>NAH){geh(z,c,P[0],P[1]);return}
  if(Wn.bereit(z,a))c.leer=0;else if(++c.leer>LEERLAUF)los(g,c);return}
 if(c.zust===Z_SUCHT&&c.auf===A_HOLEN&&c.job<0){o=Wn.finde(z.war,c.o);if(!o||o.ti!==c.id||o.tt!==Wn.T_PERSON){los(g,c);return}}
 if(c.zust!==Z_GEHT)return;
 if(c.nx<0){
  if(c.auf===A_BAUEN){var a2=bauVon(z,c.site);if(!a2||a2.zu!==BAU().B_LAEUFT){los(g,c);return}}
  if(traegt(c)){o=Wn.finde(z.war,c.o);if(!o||o.tt!==Wn.T_PERSON||o.ti!==c.id){zurueck(z,c);return}}      // Auftrag unterwegs abgebrochen (Ziel weg): gleich umkehren
  if(veraltet(z,c)){if(z.wg&&KAR().gilt(z,c.pf,c.i,0))c.ab=z.tick;else{c.zust=Z_SUCHT;c.pf=null;c.tp=null;c.keys=[];c.i=0;c.job=-1;return}}
  var n=c.pf.length>>1;if(c.i>=n-1){ankunft(z,c);return}
  var X=c.pf[c.i*2+2],Y=c.pf[c.i*2+3],dx=dx1(c.x,X),dy=Y-c.y;c.nx=X;c.ny=Y;c.len=dx&&dy?LEN_D:LEN_O;c.sub=0;c.dir=richtung(dx,dy)}
 var v=(c.tp[c.i+1]||1)*VF;if(traegt(c))v=Math.floor(v*(200+c.f0)/200);if(c.hu)v>>=1;c.sub+=v;
 if(c.sub>=c.len){c.x=c.nx;c.y=c.ny;c.nx=-1;c.ny=-1;c.sub=0;c.i++}}
function zuteilen(z,g){var Wn=W(),war=z.war,b=z.bau,F=[],i,n=0,q;if(!b)return;
 for(i=0;i<g.p.length;i++)if(g.p[i].zust===Z_FREI)F.push(g.p[i]);if(!F.length)return;
 if(z.ket)KET().essen(z,g,F);      // G8: Versorgung vor Arbeit
 function beste(x,y,bit,fk){var best=-1,bw=0;for(var j=0;j<F.length;j++){var c=F[j];if(!c||!(c.darf&bit)||!WE().nah({x0:c.x,y0:c.y,x1:x,y1:y}))continue;var d=Wn.weit(c.x,c.y,x,y),w=(fk?c[fk]*8:0)-(d>4096?4096:d);if(best<0||w>bw){best=j;bw=w}}return best}
 // Lieferaufträge: zuerst Material für Baustellen und alles, was schon länger als ALT wartet (nichts verhungert), dann der Rest nach Alter
 for(var lauf=0;lauf<2&&n<JE_TICK;lauf++)for(q=0;q<war.auf.length&&n<JE_TICK;q++){var o=war.auf[q];if(o.zu!==Wn.A_RES||o.tt||o.kar||o.sperr>z.tick)continue;
  if(!lauf&&o.art!==Wn.ART_BAU&&z.tick-o.alt<ALT)continue;
  var P=invPos(z,o.vt,o.vi);if(!P)continue;var j=beste(P[0],P[1],1,false);if(j<0)continue;var c=F[j];F[j]=null;
  o.tt=Wn.T_PERSON;o.ti=c.id;c.auf=A_HOLEN;c.o=o.nr;n++;geh(z,c,P[0],P[1])}
 for(q=0;q<b.auf.length&&n<JE_TICK;q++){var a=b.auf[q];if(a.zu!==BAU().B_LAEUFT||g.bau.has(a.nr)||!Wn.bereit(z,a))continue;
  var Q=zielPos(z,a),k=beste(Q[0],Q[1],2,'f1');if(k<0)continue;var c2=F[k];F[k]=null;g.bau.set(a.nr,c2.id);c2.auf=A_BAUEN;c2.site=a.nr;n++;
  if(Wn.weit(c2.x,c2.y,Q[0],Q[1])<=NAH){c2.zust=Z_ARBEITET;c2.leer=0}else geh(z,c2,Q[0],Q[1])}
 if(z.ket&&n<JE_TICK)KET().arbeit(z,g,F,beste,JE_TICK-n)}      // G8: zuletzt die Arbeit der Ketten (Automatik mit Sollbeständen)
function auftrag(z,c,nr,faellig,ab){var w=z.wg,b=z.bau,e={x0:c.x,y0:c.y,x1:c.zx,y1:c.zy},f=WE().fenster(e);
 var pk=SU().paket(f.cx0,f.cy0,function(k){return w.stuecke.get(k)||null},b?function(k){return BAU().stueck(b,k)}:null,w.ans);
 var o={nr:nr,art:'pweg',pid:c.id,x0:c.x,y0:c.y,x1:c.zx,y1:c.zy,faellig:faellig,ab:ab,gen:w.gen,keys:f.keys};
 var a={nr:nr,version:z.version,vorrang:0,art:'pweg',faellig:faellig,p:0,x0:c.x,y0:c.y,x1:c.zx,y1:c.zy,cx0:f.cx0,cy0:f.cy0,seed:w.seed>>>0,gen:w.gen,fern:false,temp:true,startFrei:true,daten:pk.daten,tab:pk.tab};
 return{o:o,a:a}}
function ausgeben(z,g,neuL){var w=z.wg,n=0;if(!w||!w.ans)return;
 for(var i=0;i<g.p.length&&n<JE_TICK;i++){var c=g.p[i];if(c.zust!==Z_SUCHT||c.job>=0)continue;
  if(!WE().nah({x0:c.x,y0:c.y,x1:c.zx,y1:c.zy})){scheitern(z,c,7);continue}
  var j=auftrag(z,c,z.auftragNr++,z.tick+FRIST,z.tick);c.job=j.o.nr;z.offen.push(j.o);neuL.push(j.a);n++}}
function schritt(z,neuL){var g=z.per;if(!g)return;for(var i=0;i<g.p.length;i++)bewegen(z,g,g.p[i]);zuteilen(z,g);ausgeben(z,g,neuL)}
// Übernahme an der Tickgrenze (kern.js, Reihenfolge der Auftragsnummer)
function uebernehmen(z,o,r){var g=z.per;if(!g||!z.wg||o.gen!==z.wg.gen)return;var c=finde(g,o.pid);if(!c||c.job!==o.nr)return;c.job=-1;
 if(c.zust!==Z_SUCHT||c.x!==o.x0||c.y!==o.y0||c.zx!==o.x1||c.zy!==o.y1)return;      // Lage oder Ziel änderte sich: neu suchen
 if(!r||!r.length){scheitern(z,c,2);return}if(r[0]!==0){scheitern(z,c,r[0]);return}
 var KO=SU().KOPF,nF=r[2],nO=r[4],pf=r.slice(KO,KO+nF*2),tp=new Uint8Array(nF),i;for(i=0;i<nF;i++)tp[i]=r[KO+nF*2+nO+i];
 if(nF<1||pf[0]!==c.x||pf[1]!==c.y||pf[nF*2-2]!==c.zx||pf[nF*2-1]!==c.zy){scheitern(z,c,1);return}
 var wt=z.bau?z.bau.wt:null,alt=false;if(wt)for(i=0;i<o.keys.length;i++){var t=wt.get(o.keys[i]);if(t!==undefined&&t>o.ab){alt=true;break}}
 if(alt&&!KAR().gilt(z,pf,0,0)){if(++c.versuch>MAX_VERSUCH)scheitern(z,c,8);return}
 c.pf=pf;c.tp=tp;c.i=0;c.ab=alt?z.tick:o.ab;c.keys=KAR().schluessel(pf);c.zust=Z_GEHT;c.nx=-1;c.ny=-1;c.sub=0;c.versuch=0;if(nF===1)ankunft(z,c)}

// ── Fingerabdruck, Nachricht an den Hauptkern, Spielstand ──
function pruef(a){var h=0x811c9dc5;for(var i=0;i<a.length;i++){h=Math.imul(h^(a[i]&0xFFFF),0x01000193);h=Math.imul(h^(a[i]>>>16),0x01000193)}return h>>>0}
var FELDER=['id','x','y','nx','ny','sub','len','zust','t','i','ab','job','versuch','grund','dir','auf','o','site','zx','zy','darf','f0','f1','e0','e1','leer',
 'f2','f3','f4','f5','f6','e2','e3','e4','e5','e6','n0','n1','n2','n3','n4','n5','n6','kx','ky','kr','kt','em','ew','et','hu'], N_ALT=26;      // G8: ab f2 neu (Form 2)
function abdruck(g,f){f(g.nr);f(g.p.length);for(var i=0;i<g.p.length;i++){var c=g.p[i];for(var j=0;j<FELDER.length;j++)f(c[FELDER[j]]);f(c.pf?c.pf.length:0);if(c.pf){f(pruef(c.pf));f(pruef(c.tp))}}}
// Je Person 13 Zahlen: Nummer, Lage x und y in 1/256 Feld, Richtung, Zustand, Aufgabe (+ Rollen × 16), Grund, Last (0 nichts, sonst Ware + 1 und Menge × 16), Fähigkeit Tragen, Bauen,
// G8: Fähigkeiten Fällen, Sägen, Kochen, Jagen (je 7 Bit), Wasser (+ hungrig/durstig × 128), frei
var MELD=13;
function meld(z){var g=z.per,n=g.p.length,a=new Int32Array(1+n*MELD),Wn=W();a[0]=n;
 for(var i=0;i<n;i++){var c=g.p[i],o=1+i*MELD,px=c.x*256+128,py=c.y*256+128,last=0;
  if(c.nx>=0&&c.len){var f=Math.floor(c.sub*256/c.len);if(f>256)f=256;px+=dx1(c.x,c.nx)*f;py+=(c.ny-c.y)*f;if(px<0)px+=WX*256;else if(px>=WX*256)px-=WX*256}
  if(z.war){var v=Wn.hole(z.war,Wn.T_PERSON,c.id);if(v)for(var w=0;w<Wn.NW;w++)if(v.p[w])last=w+1+v.p[w]*16}
  a[o]=c.id;a[o+1]=px;a[o+2]=py;a[o+3]=c.dir;a[o+4]=c.zust;a[o+5]=c.auf|(c.darf<<4);a[o+6]=c.grund;a[o+7]=last;a[o+8]=c.f0;a[o+9]=c.f1;a[o+10]=c.f2|(c.f3<<7)|(c.f4<<14)|(c.f5<<21);a[o+11]=c.f6|(c.hu<<7);a[o+12]=0}
 return a}
function stand(g,z){var lauf=[];for(var i=0;i<z.offen.length;i++){var o=z.offen[i];if(o.art==='pweg'&&z.wg&&o.gen===z.wg.gen){var c=finde(g,o.pid);if(c&&c.job===o.nr)lauf.push([o.nr,o.pid,o.faellig,o.ab])}}
 return{format:STAND,nr:g.nr,p:g.p.map(function(c){var a=FELDER.map(function(f){return c[f]});a.push(c.pf?Array.from(c.pf):null,c.tp?Array.from(c.tp):null);return a}),lauf:lauf}}
function G(v,min,max){return typeof v==='number'&&v===Math.floor(v)&&v>=min&&v<=max}
// Nach dem Laden der Welt aufrufen. Gibt die neu zu vergebenden Aufträge zurück oder null (ungültig).
function ausStand(d,z){var i,j;
 if(!d||(d.format!==STAND&&d.format!==1)||!G(d.nr,1,M31)||!Array.isArray(d.p)||d.p.length>MAX_P||!Array.isArray(d.lauf)||d.lauf.length>MAX_P)return null;
 var g=neu(),N=d.format===1?N_ALT:FELDER.length;g.nr=d.nr;      // Form 1 (G7): ohne die Felder der Ketten, alle neuen Rollen erlaubt
 var GR={id:[1,d.nr-1],x:[0,WX-1],y:[0,WY-1],nx:[-1,WX-1],ny:[-1,WY-1],sub:[0,LEN_D+VF*400],len:[0,LEN_D],zust:[0,4],t:[0,M31],i:[0,1<<20],ab:[0,M31],job:[-1,M31],versuch:[0,MAX_VERSUCH+1],grund:[0,16],dir:[0,3],
  auf:[0,10],o:[0,M31],site:[0,M31],zx:[-1,WX-1],zy:[-1,WY-1],darf:[0,ALLE],f0:[0,100],f1:[0,100],e0:[0,M31],e1:[0,M31],leer:[0,M31],
  f2:[0,100],f3:[0,100],f4:[0,100],f5:[0,100],f6:[0,100],e2:[0,M31],e3:[0,M31],e4:[0,M31],e5:[0,M31],e6:[0,M31],n0:[0,M31],n1:[0,M31],n2:[0,M31],n3:[0,M31],n4:[0,M31],n5:[0,M31],n6:[0,M31],
  kx:[-1,WX-1],ky:[-1,WY-1],kr:[0,4294967295],kt:[0,M31],em:[0,M31],ew:[0,M31],et:[0,M31],hu:[0,3]};
 for(i=0;i<d.p.length;i++){var a=d.p[i];if(!Array.isArray(a)||a.length!==N+2)return null;var c=person(1,0,0);
  for(j=0;j<N;j++){var gr=GR[FELDER[j]];if(!G(a[j],gr[0],gr[1]))return null;c[FELDER[j]]=a[j]}
  if(d.format===1){if(c.auf>4)return null;c.darf|=ALLE&~3}
  var pf=a[N],tp=a[N+1];
  if(pf===null){if(tp!==null||c.zust===Z_GEHT)return null;c.pf=null;c.tp=null}
  else{if(!Array.isArray(pf)||!Array.isArray(tp)||pf.length<2||pf.length!==tp.length*2||pf.length>(1<<20))return null;
   for(j=0;j<pf.length;j++)if(!G(pf[j],0,j&1?WY-1:WX-1))return null;for(j=0;j<tp.length;j++)if(!G(tp[j],0,255))return null;
   if(c.i>=tp.length)return null;c.pf=Int32Array.from(pf);c.tp=Uint8Array.from(tp);c.keys=KAR().schluessel(c.pf)}
  if(i&&c.id<=g.p[i-1].id)return null;if(c.auf===A_BAUEN){if(!c.site||g.bau.has(c.site))return null;g.bau.set(c.site,c.id)}g.p.push(c)}
 var neuL=[];
 for(i=0;i<d.lauf.length;i++){var l=d.lauf[i];if(!Array.isArray(l)||l.length!==4||!G(l[0],0,z.auftragNr-1)||!G(l[1],1,M31)||!G(l[2],0,M31)||!G(l[3],0,M31))return null;
  if(!z.wg||!z.wg.ans)return null;var ck=finde(g,l[1]);if(!ck||ck.job!==l[0]||ck.zx<0)return null;
  var q=auftrag(z,ck,l[0],l[2],l[3]);z.offen.push(q.o);neuL.push(q.a)}
 for(i=0;i<g.p.length;i++)if(g.p[i].job>=0&&!neuL.some(function(a){return a.nr===g.p[i].job}))return null;
 z.per=g;return neuL}

var P={N_START:N_START,MELD:MELD,JE_TICK:JE_TICK,FRIST:FRIST,WIEDER:WIEDER,NAH:NAH,LEERLAUF:LEERLAUF,ZUST:ZUST,Z_FREI:Z_FREI,Z_SUCHT:Z_SUCHT,Z_GEHT:Z_GEHT,Z_ARBEITET:Z_ARBEITET,Z_WARTET:Z_WARTET,
 A_HOLEN:A_HOLEN,A_BRINGEN:A_BRINGEN,A_BAUEN:A_BAUEN,A_RUECK:A_RUECK,start:start,rolle:rolle,schritt:schritt,uebernehmen:uebernehmen,abdruck:abdruck,meld:meld,stand:stand,ausStand:ausStand,
 amBau:amBau,hatBauer:hatBauer,inReichweite:inReichweite,gebaut:gebaut,finde:finde,los:los,geh:geh,zurueck:zurueck,gangbar:gangbar,ALLE:ALLE};
if(typeof module!=='undefined'&&module.exports)module.exports=P;else root.AT3PERS=P;
})(typeof self!=='undefined'?self:this);
