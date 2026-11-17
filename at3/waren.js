// WAS DIE DATEI TUT: Waren und Lieferaufträge im Weltkern von Arena Theory 3.0 (Schritt G7): Bestände je Ort (Lager, Karren, Baustelle, abgelegter Stapel,
// Träger), Reservierung, Lieferaufträge, Material für Baustellen, Ausgleich zwischen Lagern per Karren. Reine Rechnung ohne Bildschirm, nur ganze Zahlen.
// Entscheidungen Thomas (16.11.2026): Startwaren Holz, Stein, Wasser, Nahrung; gekennzeichneter Startvorrat im ersten Lager (200/200/100/100), das erste
// Lager selbst braucht kein Material; Material je Bauteil: Gebäudefeld 1 Holz, Wand/Tür/Tor 1 Stein, Kiesweg/Pflaster/Steinstraße 1 Stein je Feld,
// Trampelpfad nichts; Arbeiter tragen Material zu Fuß zur Baustelle, Karren fahren nicht mehr leer, sondern verteilen Vorräte zwischen Lagern.
// Eine Ware – ein Besitzer (AT3_PLAN 6.1): jeder Bestand hat je Ware drei Zahlen: p physisch (liegt wirklich dort), r reserviert (für einen Auftrag
// vorgemerkt, noch dort), e erwartet (Platz für einen Auftrag vorgemerkt, noch nicht dort). Verfügbar = p − r. Unterwegs = was Karren und Träger tragen.
// Lieferauftrag: Quelle, Ziel, Ware, Menge, Zustand reserviert (1: Ware und Platz vorgemerkt, Träger holt) → unterwegs (2: Träger hat die Ware) →
// geliefert (Auftrag verschwindet, Zähler gel). Aufnehmen und Abliefern sind je eine Buchung in einem Tick; der Zustand steht im Spielstand, darum
// wird nach dem Laden nichts doppelt gebucht. Abbruch: Vormerkungen weg; trägt schon jemand die Ware, bringt er sie ins nächste Lager zurück (Auftrag
// „Rückgabe“) oder legt sie als Stapel ab. Ware geht nie verloren: verschwindet ein Lager, eine Baustelle oder ein Karren, wird der Bestand ein Stapel
// am Boden, den die Träger von selbst wieder einsammeln.
// Einschalten: Befehl „wirtschaft {x,y}“ (Startplatz; das Spiel schickt ihn nach der Platzwahl). Ohne den Befehl bleibt z.war leer, Bauen, Karren und
// Fingerabdruck sind wie bisher (alle Tests bis G6 unverändert).
// Kerne: nur Weltkern (Regel 13). Kosten: Abgleich nur nach Bauänderungen, Anfragen der Baustellen alle 0,5 s (höchstens 256 Baustellen, je 16 Ziele
// voraus), Ausgleich alle 10 s; nichts hängt von der Weltgröße ab (Regel 14). Höchstens 256 Aufträge zugleich.
// Wiederverwendet: Baustellen und Räume aus G5 (bau.js), Karren und Ladestellen aus G6c (karren.js), Einhäng-Muster aus weltstrom.js/karren.js.
// G8 (Thomas 17.11.2026): sechs Waren. Bretter ersetzen „Holz“ (Index 0), Mahlzeit ersetzt „Nahrung“ (Index 3), neu Stamm (4) und Fleisch (5). Dazu der
// Bestand einer Arbeitsstätte (T_WERK: Sägewerkstatt, Küche, Jägerhütte; nur wenn die Ketten laufen, ketten.js) und zwei Zähler je Ware: erz (erzeugt) und
// vb (verbraucht). Immer gilt: Summe aller Ware + verbraucht − erzeugt = Startvorrat. Spielstand Form 2 (Form 1 mit vier Waren wird weiter gelesen).
(function(root){
'use strict';
function BAU(){return root.AT3BAU||(typeof module!=='undefined'&&module.exports?require('./bau.js'):null)}
function KAR(){return root.AT3KARREN||(typeof module!=='undefined'&&module.exports?require('./karren.js'):null)}
function PERS(){return root.AT3PERS||(typeof module!=='undefined'&&module.exports?require('./personen.js'):null)}
function KET(){return root.AT3KETTEN||(typeof module!=='undefined'&&module.exports?require('./ketten.js'):null)}
var WX=614400, WY=307200, STAND=2, M31=2147483647;
var WAREN=['boards','stone','water','meal','log','meat'], NW=6, NW_ALT=4, BRETT=0, STEIN=1, WASSER=2, MAHL=3, STAMM=4, FLEISCH=5;
// Vorschlagswerte (Thomas setzt die Zahlen später): Startvorrat, Platz je Lagerfeld, Karrenladung, Traglast, Aufträge zugleich, Ziele voraus, Takte
var START=[200,200,100,100,0,0], LAGER_KAP=50, WERK_KAP=40, KARREN_KAP=20, TRAG=5, MAX_AUF=256, VORAUS=16, TAKT=10, AUSGLEICH=200, MAX_STAPEL_AUF=8, MAX_MENGE=100;
var T_LAGER=1, T_KARREN=2, T_BAU=3, T_STAPEL=4, T_PERSON=5, T_WERK=6, TF=4294967296;
var A_RES=1, A_UNTERWEGS=2;
var ART_HAND=0, ART_BAU=1, ART_AUSGLEICH=2, ART_STAPEL=3, ART_RUECK=4, ART_KETTE=5;
function nul(){return[0,0,0,0,0,0]}
var BLOCK=['','no_worker','no_material','waits_delivery','no_path','too_far'];
function neu(x,y){return{sx:x,sy:y,start:0,nr:1,snr:1,inv:new Map(),auf:[],gel:0,verbr:0,zaehler:0,bz:-1,erz:nul(),vb:nul()}}
function key(t,id){return t*TF+id}
function hole(g,t,id){return g.inv.get(key(t,id))||null}
function mach(g,t,id,x,y){var k=key(t,id),i=g.inv.get(k);if(!i){i={t:t,id:id,p:nul(),r:nul(),e:nul(),x:x|0,y:y|0};g.inv.set(k,i)}return i}
function summe(a){return a[0]+a[1]+a[2]+a[3]+a[4]+a[5]}
function kap(z,i){if(i.t===T_LAGER){var r=z.bau&&z.bau.raeume.get(i.id);return r?r.felder*LAGER_KAP:0}return i.t===T_KARREN?KARREN_KAP:i.t===T_PERSON?TRAG:i.t===T_BAU?M31:i.t===T_WERK?WERK_KAP:0}
function frei(z,i){var f=kap(z,i)-summe(i.p)-summe(i.e);return f>0?f:0}
function verf(i,w){return i.p[w]-i.r[w]}
function ab(a,b){var d=Math.abs(a-b);return d>WX/2?WX-d:d}
function weit(x,y,x2,y2){return Math.max(ab(x,x2),Math.abs(y-y2))}
function lagerOk(z,i){var r=z.bau&&z.bau.raeume.get(i.id);if(!r||r.art!==1)return false;var f=BAU().feld(z,r.hx,r.hy);return !!f&&f.zustand===BAU().Z_FERTIG}
// G8: Arbeitsstätte (Raumart 2 Sägewerkstatt, 4 Küche, 5 Jägerhütte) nutzbar? Gibt die Raumart oder 0.
function werkArt(z,id){var r=z.bau&&z.bau.raeume.get(id);if(!r||(r.art!==2&&r.art!==4&&r.art!==5))return 0;var f=BAU().feld(z,r.hx,r.hy);return f&&f.zustand===BAU().Z_FERTIG?r.art:0}
// nächster Bestand zum Punkt, der passt (bei gleichem Abstand der ältere Eintrag)
function naechstes(z,x,y,passt){var best=null,bd=0;z.war.inv.forEach(function(i){if(!passt(i))return;var d=weit(x,y,i.x,i.y);if(!best||d<bd){best=i;bd=d}});return best}

// ── Lieferaufträge: jede Buchung ändert Quelle, Ziel oder Träger in einem Zug ──
function auftrag(g,v,n,w,m,zu,tt,ti,art,kar,tick){var o={nr:g.nr++,vt:v.t,vi:v.id,nt:n.t,ni:n.id,w:w,m:m,zu:zu,tt:tt,ti:ti,art:art,kar:kar?1:0,alt:tick,versuch:0,grund:0,sperr:0};g.auf.push(o);g.zaehler++;return o}
// Neuer Auftrag: Ware in der Quelle und Platz im Ziel werden sofort vorgemerkt. Gibt den Auftrag oder einen Ablehnungsgrund (Text) zurück.
function anlegen(z,v,n,w,m,art,kar,zwang){var g=z.war;if(g.auf.length>=MAX_AUF)return'too_many_orders';if(!(m>=1))return'invalid';if(verf(v,w)<m)return'no_stock';if(!zwang&&frei(z,n)<m)return'no_room';
 v.r[w]+=m;n.e[w]+=m;return auftrag(g,v,n,w,m,A_RES,0,0,art,kar,z.tick)}
function finde(g,nr){for(var i=0;i<g.auf.length;i++)if(g.auf[i].nr===nr)return g.auf[i];return null}
function raus(g,o){var i=g.auf.indexOf(o);if(i>=0)g.auf.splice(i,1)}
function leerWeg(g,c){if((c.t===T_KARREN||c.t===T_PERSON)&&!summe(c.p))g.inv.delete(key(c.t,c.id))}
// Aufnehmen: Ware geht von der Quelle auf den Träger (Karren oder Person), Zustand „unterwegs“
function aufnehmen(z,o,tt,ti,x,y){var g=z.war,v=hole(g,o.vt,o.vi);if(o.zu!==A_RES||!v||v.p[o.w]<o.m||v.r[o.w]<o.m)return false;
 var c=mach(g,tt,ti,x,y);v.p[o.w]-=o.m;v.r[o.w]-=o.m;c.p[o.w]+=o.m;c.x=x;c.y=y;o.tt=tt;o.ti=ti;o.zu=A_UNTERWEGS;g.zaehler++;return true}
// Abliefern: Ware geht vom Träger ins Ziel, der Auftrag ist erledigt
function abliefern(z,o){var g=z.war,c=hole(g,o.tt,o.ti),n=hole(g,o.nt,o.ni);if(o.zu!==A_UNTERWEGS||!c||!n||c.p[o.w]<o.m)return false;
 c.p[o.w]-=o.m;n.p[o.w]+=o.m;n.e[o.w]-=o.m;raus(g,o);g.gel++;g.zaehler++;leerWeg(g,c);return true}
// Abbruch: Vormerkungen lösen. Trägt schon jemand die Ware, bleibt sie bei ihm (er ruft danach rueck oder ablegen).
function abbrechen(z,o){var g=z.war,n=hole(g,o.nt,o.ni);if(n)n.e[o.w]-=o.m;if(o.zu===A_RES){var v=hole(g,o.vt,o.vi);if(v)v.r[o.w]-=o.m}raus(g,o);g.zaehler++}
function stapelBei(g,x,y){var f=null;g.inv.forEach(function(i){if(!f&&i.t===T_STAPEL&&i.x===x&&i.y===y)f=i});return f||mach(g,T_STAPEL,g.snr++,x,y)}
// Träger legt alles ab, was er trägt: Stapel am Boden (wird von selbst eingesammelt)
function ablegen(z,tt,ti,x,y){var g=z.war,c=hole(g,tt,ti);if(!c)return;if(summe(c.p)){var s=stapelBei(g,x,y);for(var w=0;w<NW;w++){s.p[w]+=c.p[w];c.p[w]=0}}g.inv.delete(key(tt,ti));g.zaehler++}
// Träger hat Ware ohne Auftrag (Auftrag abgebrochen): Rückgabe ins nächste nutzbare Lager (auch über dessen Platz hinaus), sonst ablegen. Gibt den Auftrag oder null.
function rueck(z,tt,ti,x,y){var g=z.war,c=hole(g,tt,ti);if(!c)return null;
 for(var w=0;w<NW;w++){var m=c.p[w];if(!m)continue;var n=naechstes(z,x,y,function(i){return i.t===T_LAGER&&lagerOk(z,i)});
  if(!n||g.auf.length>=MAX_AUF)break;n.e[w]+=m;return auftrag(g,c,n,w,m,A_UNTERWEGS,tt,ti,ART_RUECK,0,z.tick)}
 ablegen(z,tt,ti,x,y);return null}
// Karren zu Hause: alles, was er trägt, geht ins eigene Lager (Rückgabe ohne Platzprüfung); ein offener Auftrag dieses Karrens endet
function heimAb(z,kid,raum){var g=z.war,c=hole(g,T_KARREN,kid);if(!c)return;for(var j=g.auf.length-1;j>=0;j--){var o=g.auf[j];if(o.tt===T_KARREN&&o.ti===kid)abbrechen(z,o)}
 var n=hole(g,T_LAGER,raum);if(!n){zuStapel(z,c);return}for(var w=0;w<NW;w++){n.p[w]+=c.p[w];c.p[w]=0}g.inv.delete(key(T_KARREN,kid));g.zaehler++}
// Bestand wird ein Stapel am Boden (Lager abgerissen, Baustelle fertig oder abgebrochen, Karren weg): Aufträge dorthin enden, Aufträge von dort bleiben
function zuStapel(z,i){var g=z.war,j,o;for(j=g.auf.length-1;j>=0;j--){o=g.auf[j];if(o.nt===i.t&&o.ni===i.id)abbrechen(z,o)}
 g.inv.delete(key(i.t,i.id));g.zaehler++;if(!summe(i.p)){for(j=g.auf.length-1;j>=0;j--){o=g.auf[j];if(o.vt===i.t&&o.vi===i.id&&o.zu===A_RES)raus(g,o)}return}
 var ot=i.t,oi=i.id;i.t=T_STAPEL;i.id=g.snr++;i.e=nul();g.inv.set(key(i.t,i.id),i);
 for(j=0;j<g.auf.length;j++){o=g.auf[j];if(o.vt===ot&&o.vi===oi&&o.zu===A_RES){o.vt=i.t;o.vi=i.id;if(o.kar&&!o.tt){o.kar=0}}}}

// ── Abgleich mit dem Bau (nur wenn sich am Bau etwas geändert hat, sonst alle 10 s): Lager, Baustellen, Karren, Startvorrat ──
function karreDa(z,id){var k=z.kar&&z.kar.k;if(!k)return false;for(var i=0;i<k.length;i++)if(k[i].id===id)return true;return false}
function abgleich(z){var g=z.war,b=z.bau,L=[],S=null,j,q;g.inv.forEach(function(i){L.push(i)});
 for(j=0;j<L.length;j++){var i=L[j];
  if(i.t===T_LAGER){var r=b.raeume.get(i.id);if(!r||r.art!==1)zuStapel(z,i);else{i.x=r.hx;i.y=r.hy}}
  else if(i.t===T_BAU){if(!S){S=new Set();for(q=0;q<b.auf.length;q++)S.add(b.auf[q].nr)}if(!S.has(i.id))zuStapel(z,i)}
  else if(i.t===T_KARREN){if(!karreDa(z,i.id)){for(q=g.auf.length-1;q>=0;q--)if(g.auf[q].tt===T_KARREN&&g.auf[q].ti===i.id)abbrechen(z,g.auf[q]);zuStapel(z,i)}}
  else if(i.t===T_WERK){var rw=b.raeume.get(i.id);if(!z.ket||!rw||(rw.art!==2&&rw.art!==4&&rw.art!==5))zuStapel(z,i);else{i.x=rw.hx;i.y=rw.hy}}
  else if(i.t===T_STAPEL&&!summe(i.p)){g.inv.delete(key(i.t,i.id));g.zaehler++}}
 var ids=[];b.raeume.forEach(function(r){if(r.art===1)ids.push(r.id)});ids.sort(function(a,c){return a-c});
 for(j=0;j<ids.length;j++){var r2=b.raeume.get(ids[j]);if(hole(g,T_LAGER,r2.id))continue;var n=mach(g,T_LAGER,r2.id,r2.hx,r2.hy),imBau=false;for(q=0;q<b.auf.length;q++)if(b.auf[q].raum===r2.id)imBau=true;      // ein neues Lager zählt erst, wenn seine Baustelle fertig ist (das erste braucht darum kein Material)
  if(imBau||!lagerOk(z,n)){g.inv.delete(key(T_LAGER,r2.id));continue}
  g.zaehler++;if(!g.start){g.start=1;for(var w=0;w<NW;w++)n.p[w]+=START[w]}}
 if(z.ket){ids=[];b.raeume.forEach(function(r){if(r.art===2||r.art===4||r.art===5)ids.push(r.id)});ids.sort(function(a,c){return a-c});      // G8: Arbeitsstätten, sobald sie fertig sind
  for(j=0;j<ids.length;j++){var r3=b.raeume.get(ids[j]);if(hole(g,T_WERK,r3.id))continue;var bau3=false;for(q=0;q<b.auf.length;q++)if(b.auf[q].raum===r3.id)bau3=true;
   if(bau3||!werkArt(z,r3.id))continue;mach(g,T_WERK,r3.id,r3.hx,r3.hy);g.zaehler++}}}

// ── Baustellen: Material je Ziel, nächstes geplantes Ziel, Anfragen ──
// Ware für ein Bauziel (t: 0 Gebäudefeld, 1/2 Kante, 3 Wegfeld) oder −1 (braucht nichts)
function mat(z,t,X,Y){if(t===0)return 0;if(t===3){var w=BAU().weg(z,X,Y);return w&&w.nr>1?1:-1}return 1}
function naechstesZiel(b,a){var Z=a.ziele,B=BAU();for(var j=a.i,n=0;j*3<Z.length&&n<64;j++,n++)if(B.ziel(b,Z[j*3],Z[j*3+1],Z[j*3+2])===B.Z_PLAN)return j;return -1}
// Kann die Baustelle jetzt weiterbauen (Material fürs nächste Ziel liegt dort, oder es braucht keins)?
function bereit(z,a){if(a.rest)return true;var g=z.war,j=naechstesZiel(z.bau,a);if(j<0||!g.start)return true;var Z=a.ziele,w=mat(z,Z[j*3],Z[j*3+1],Z[j*3+2]);if(w<0)return true;
 var i=hole(g,T_BAU,a.nr);return !!i&&i.p[w]>0}
// Haken aus bau.js: ein Ziel beginnen (verbraucht ein Stück Material), Fortschritt je Tick (0 = kein Bauarbeiter da), Ziel fertig
function bauStart(z,a,t,X,Y){var g=z.war,P=PERS();if(!P||!P.amBau(z,a))return false;if(!g.start)return true;var w=mat(z,t,X,Y);if(w<0)return true;
 var i=hole(g,T_BAU,a.nr);if(!i||i.p[w]<1)return false;i.p[w]--;g.verbr++;g.vb[w]++;g.zaehler++;return true}
function bauTakt(z,a){var P=PERS(),c=P&&P.amBau(z,a);if(c&&c.hu&&(z.tick&1))return 0;return c?1+((z.tick%100)<(c.f1>>1)?1:0):0}      // G8: hungrig oder durstig = halb so schnell
function bauFertig(z,a){var P=PERS();if(P)P.gebaut(z,a)}
function aufraeumen(z){var g=z.war,hat=null;for(var j=g.auf.length-1;j>=0;j--){var o=g.auf[j];if(!o.kar||o.zu!==A_RES||o.tt)continue;
  if(!hat){hat=new Set();if(z.kar)for(var q=0;q<z.kar.k.length;q++)hat.add(z.kar.k[q].raum)}
  if(o.vt!==T_LAGER||!hat.has(o.vi)||o.nt!==T_LAGER){if(o.m<=TRAG)o.kar=0;else abbrechen(z,o)}}}
function anfragen(z){var g=z.war,b=z.bau,B=BAU(),A=b.auf,q,w,n;aufraeumen(z);
 // Stapel einsammeln: höchstens MAX_STAPEL_AUF solche Aufträge zugleich
 var ns=0,S=[];for(q=0;q<g.auf.length;q++)if(g.auf[q].art===ART_STAPEL)ns++;
 if(ns<MAX_STAPEL_AUF){g.inv.forEach(function(i){if(i.t===T_STAPEL&&S.length<16)S.push(i)});
  for(q=0;q<S.length&&ns<MAX_STAPEL_AUF;q++)for(w=0;w<NW;w++){var m=verf(S[q],w);if(m<=0)continue;
   var ziel=naechstes(z,S[q].x,S[q].y,function(i){return i.t===T_LAGER&&frei(z,i)>0&&lagerOk(z,i)});if(!ziel)break;
   if(typeof anlegen(z,S[q],ziel,w,Math.min(TRAG,m,frei(z,ziel)),ART_STAPEL,0)==='object')ns++;break}}
 if(!g.start)return;
 for(q=0;q<A.length;q++){var a=A[q],Z=a.ziele;if(a.zu!==B.B_LAEUFT)continue;
  var need=nul(),j=a.rest?a.i+1:a.i,x=-1,y=0,ges=0;n=0;
  for(;j*3<Z.length&&n<VORAUS&&ges<256;j++,ges++){if(B.ziel(b,Z[j*3],Z[j*3+1],Z[j*3+2])!==B.Z_PLAN)continue;n++;if(x<0){x=Z[j*3+1];y=Z[j*3+2]}w=mat(z,Z[j*3],Z[j*3+1],Z[j*3+2]);if(w>=0)need[w]++}
  if(x<0)continue;var i=hole(g,T_BAU,a.nr);if(i){i.x=x;i.y=y}
  for(w=0;w<NW;w++){var fehl=need[w]-(i?i.p[w]+i.e[w]:0);if(fehl<=0)continue;
   var v=naechstes(z,x,y,(function(w){return function(k){return(k.t===T_STAPEL||k.t===T_LAGER)&&verf(k,w)>0}})(w));if(!v)continue;
   if(!i)i=mach(g,T_BAU,a.nr,x,y);anlegen(z,v,i,w,Math.min(TRAG,fehl,verf(v,w)),ART_BAU,0,true)}}}
// Ausgleich per Karren: je Ware höchstens ein Auftrag zugleich, vom vollsten Lager mit Karren zum leersten mit Platz und Besucherplatz, wenn der Unterschied
// mindestens zwei Karrenladungen beträgt
function verteilen(z){var g=z.war,K=z.kar,L=[],w,q;if(!K||!K.k.length)return;g.inv.forEach(function(i){if(i.t===T_LAGER&&L.length<256)L.push(i)});if(L.length<2)return;
 var hat=new Set(),bes=new Map();for(q=0;q<K.k.length;q++)hat.add(K.k[q].raum);
 function besuch(i){if(!bes.has(i.id))bes.set(i.id,!!KAR().besuch(z,z.bau.raeume.get(i.id)));return bes.get(i.id)}
 for(w=0;w<NW;w++){var da=false,a=null,c=null;for(q=0;q<g.auf.length;q++)if(g.auf[q].art===ART_AUSGLEICH&&g.auf[q].w===w)da=true;if(da)continue;
  for(q=0;q<L.length;q++)if(hat.has(L[q].id)&&(!a||verf(L[q],w)>verf(a,w)))a=L[q];if(!a||verf(a,w)<KARREN_KAP)continue;
  for(q=0;q<L.length;q++){var i=L[q];if(i===a||frei(z,i)<KARREN_KAP||(c&&i.p[w]+i.e[w]>=c.p[w]+c.e[w]))continue;if(lagerOk(z,i)&&besuch(i))c=i}
  if(c&&verf(a,w)-(c.p[w]+c.e[w])>=2*KARREN_KAP)anlegen(z,a,c,w,KARREN_KAP,ART_AUSGLEICH,1)}}
// Nächster Auftrag für den Karren eines Lagers (ältester zuerst)
function fuerKarren(z,raum){var g=z.war;for(var i=0;i<g.auf.length;i++){var o=g.auf[i];if(o.kar&&o.zu===A_RES&&!o.tt&&o.vt===T_LAGER&&o.vi===raum&&o.nt===T_LAGER)return o}return null}

// ── G8: Buchungen der Ketten (ketten.js). Erzeugen und Verbrauchen sind je eine Buchung in einem Tick und werden je Ware gezählt. ──
function erzeugen(z,i,w,m){var g=z.war;i.p[w]+=m;g.erz[w]+=m;g.zaehler++}
function verbrauchen(z,i,w,m){var g=z.war;if(verf(i,w)<m)return false;i.p[w]-=m;g.vb[w]+=m;g.verbr+=m;g.zaehler++;return true}
function stapelNeu(z,x,y,w,m){erzeugen(z,stapelBei(z.war,x,y),w,m)}
function schritt(z){var g=z.war,b=z.bau;if(!b)return;
 if(g.bz!==b.zaehler||z.tick%200===0){g.bz=b.zaehler;abgleich(z)}
 if(z.tick%TAKT===0)anfragen(z);
 if(z.tick%AUSGLEICH===AUSGLEICH-1)verteilen(z)}

// ── Befehle ──
function G(v,min,max){return typeof v==='number'&&v===Math.floor(v)&&v>=min&&v<=max}
var ARTEN={
 wirtschaft:function(w){return !!w&&G(w.x,0,WX-1)&&G(w.y,0,WY-1)},
 ketten:function(w){return !!w&&G(w.an,1,1)},
 lieferung:function(w){return !!w&&G(w.von,1,4294967295)&&G(w.nach,1,4294967295)&&w.von!==w.nach&&G(w.ware,0,NW-1)&&G(w.menge,1,MAX_MENGE)},
 personRolle:function(w){return !!w&&G(w.id,1,M31)&&G(w.darf,0,127)}};
function befehl(z,art,w){
 if(art==='wirtschaft'){if(z.war)return;z.war=neu(w.x,w.y);var P=PERS();if(P)P.start(z,w.x,w.y);return}
 if(!z.war)return;
 if(art==='ketten'){var Kt=KET();if(Kt&&!z.ket)Kt.start(z);return}
 if(art==='personRolle'){var P2=PERS();if(P2)P2.rolle(z,w.id,w.darf);return}
 var g=z.war,v=hole(g,T_LAGER,w.von),n=hole(g,T_LAGER,w.nach);if(!v||!n)return;
 var kar=karreVon(z,w.von)&&!!KAR().besuch(z,z.bau.raeume.get(w.nach)),je=kar?KARREN_KAP:TRAG,rest=w.menge;
 while(rest>0){var m=Math.min(je,rest);if(typeof anlegen(z,v,n,w.ware,m,ART_HAND,kar)!=='object')break;rest-=m}}
function karreVon(z,raum){var k=z.kar&&z.kar.k;if(!k)return false;for(var i=0;i<k.length;i++)if(k[i].raum===raum)return true;return false}

// ── Fingerabdruck, Nachricht an den Hauptkern, Spielstand ──
var OF=['nr','vt','vi','nt','ni','w','m','zu','tt','ti','art','kar','alt','versuch','grund','sperr'];
function abdruck(g,f){f(g.sx);f(g.sy);f(g.start);f(g.nr);f(g.snr);f(g.gel);f(g.verbr);for(var v=0;v<NW;v++){f(g.erz[v]);f(g.vb[v])}f(g.inv.size);
 g.inv.forEach(function(i){f(i.t);f(i.id);f(i.x);f(i.y);for(var w=0;w<NW;w++){f(i.p[w]);f(i.r[w]);f(i.e[w])}});
 f(g.auf.length);for(var j=0;j<g.auf.length;j++)for(var q=0;q<OF.length;q++)f(g.auf[j][OF[q]])}
// Warum steht eine Baustelle? (nur für die Anzeige, aus dem Zustand abgeleitet) 0 = läuft
function blocker(z,a){var g=z.war,P=PERS();if(a.rest&&P&&P.amBau(z,a))return 0;if(a.rest)return 1;var j=naechstesZiel(z.bau,a);if(j<0)return 0;
 if(bereit(z,a)){if(P&&P.hatBauer(z,a))return 0;var Zz=a.ziele;return P&&!P.inReichweite(z,Zz[j*3+1],Zz[j*3+2])?5:1}
 var Z=a.ziele,w=mat(z,Z[j*3],Z[j*3+1],Z[j*3+2]),weg=false,kommt=false;
 for(var q=0;q<g.auf.length;q++){var o=g.auf[q];if(o.nt===T_BAU&&o.ni===a.nr&&o.w===w){kommt=true;if(o.grund)weg=true}}
 if(weg)return 4;if(kommt)return 3;var da=false;g.inv.forEach(function(i){if((i.t===T_LAGER||i.t===T_STAPEL)&&verf(i,w)>0)da=true});return da?3:2}
function meld(z){var g=z.war,b=z.bau,L=[],S=[],K=[],T=[nul(),nul(),nul()],BL=[],w;
 g.inv.forEach(function(i){var a;
  if(i.t===T_LAGER){for(w=0;w<NW;w++){T[0][w]+=i.p[w];T[1][w]+=i.r[w]}if(L.length<64){a=[i.id,i.x,i.y,kap(z,i)];L.push(a.concat(i.p,i.r,i.e))}}
  else if(i.t===T_STAPEL){for(w=0;w<NW;w++){T[0][w]+=i.p[w];T[1][w]+=i.r[w]}if(S.length<64)S.push([i.id,i.x,i.y].concat(i.p))}
  else if(i.t===T_KARREN||i.t===T_PERSON){for(w=0;w<NW;w++){T[2][w]+=i.p[w];if(i.t===T_KARREN&&i.p[w])K.push([i.id,w,i.p[w]])}}
  else for(w=0;w<NW;w++)T[0][w]+=i.p[w]});
 if(b)for(var q=0;q<b.auf.length&&BL.length<64;q++){var a2=b.auf[q];if(a2.zu!==BAU().B_LAEUFT)continue;var gr=blocker(z,a2);if(gr){var Z=a2.ziele,j=Math.min(a2.i,Z.length/3-1);BL.push([a2.nr,gr,Z[j*3+1],Z[j*3+2]])}}
 return{an:1,nw:NW,start:g.start,zaehler:g.zaehler,gel:g.gel,verbr:g.verbr,auf:g.auf.length,summe:T,lager:L,stapel:S,karren:K,block:BL,erz:g.erz.slice(),vb:g.vb.slice(),ket:z.ket&&KET()?KET().meld(z):null}}
function stand(g){var I=[];g.inv.forEach(function(i){I.push([i.t,i.id,i.x,i.y].concat(i.p,i.r,i.e))});
 return{format:STAND,sx:g.sx,sy:g.sy,start:g.start,nr:g.nr,snr:g.snr,gel:g.gel,verbr:g.verbr,zaehler:g.zaehler,bz:g.bz,erz:g.erz.slice(),vb:g.vb.slice(),inv:I,auf:g.auf.map(function(o){return OF.map(function(f){return o[f]})})}}
// Prüft streng; null = Stand ungültig.
function ausStand(d){var i,j;
 var n0=d&&d.format===1?NW_ALT:NW,LEN=4+3*n0;      // Form 1 (G7): vier Waren, Holz → Bretter (Index 0), Nahrung → Mahlzeit (Index 3)
 if(!d||(d.format!==STAND&&d.format!==1)||!G(d.sx,0,WX-1)||!G(d.sy,0,WY-1)||!G(d.start,0,1)||!G(d.nr,1,M31)||!G(d.snr,1,M31)||!G(d.gel,0,M31)||!G(d.verbr,0,M31)||!G(d.zaehler,0,M31)||!G(d.bz,-1,M31)||
  !Array.isArray(d.inv)||d.inv.length>65536||!Array.isArray(d.auf)||d.auf.length>MAX_AUF)return null;
 var g=neu(d.sx,d.sy);g.start=d.start;g.nr=d.nr;g.snr=d.snr;g.gel=d.gel;g.verbr=d.verbr;g.zaehler=d.zaehler;g.bz=d.bz;
 if(d.format===1){g.vb[BRETT]=0;g.vb[STEIN]=d.verbr}      // Aufteilung des alten Verbrauchs ist unbekannt; die Summe stimmt
 else{if(!Array.isArray(d.erz)||!Array.isArray(d.vb)||d.erz.length!==NW||d.vb.length!==NW)return null;for(j=0;j<NW;j++){if(!G(d.erz[j],0,M31)||!G(d.vb[j],0,M31))return null;g.erz[j]=d.erz[j];g.vb[j]=d.vb[j]}}
 for(i=0;i<d.inv.length;i++){var a=d.inv[i];if(!Array.isArray(a)||a.length!==LEN||!G(a[0],T_LAGER,T_WERK)||!G(a[1],1,4294967295)||!G(a[2],0,WX-1)||!G(a[3],0,WY-1)||g.inv.has(key(a[0],a[1])))return null;
  for(j=4;j<LEN;j++)if(!G(a[j],0,M31))return null;var n=mach(g,a[0],a[1],a[2],a[3]);
  for(j=0;j<n0;j++){n.p[j]=a[4+j];n.r[j]=a[4+n0+j];n.e[j]=a[4+2*n0+j];if(n.r[j]>n.p[j])return null}}
 var GR={nr:[1,d.nr-1],vt:[1,6],vi:[1,4294967295],nt:[1,6],ni:[1,4294967295],w:[0,n0-1],m:[1,M31],zu:[A_RES,A_UNTERWEGS],tt:[0,5],ti:[0,4294967295],art:[0,5],kar:[0,1],alt:[0,M31],versuch:[0,16],grund:[0,16],sperr:[0,M31]};
 for(i=0;i<d.auf.length;i++){var b=d.auf[i],o={};if(!Array.isArray(b)||b.length!==OF.length)return null;
  for(j=0;j<OF.length;j++){var gr=GR[OF[j]];if(!G(b[j],gr[0],gr[1]))return null;o[OF[j]]=b[j]}
  if(i&&o.nr<=g.auf[i-1].nr)return null;if(!hole(g,o.nt,o.ni))return null;if(o.zu===A_RES?!hole(g,o.vt,o.vi):!hole(g,o.tt,o.ti))return null;g.auf.push(o)}
 return g}

var W={WAREN:WAREN,NW:NW,START:START,BRETT:BRETT,STEIN:STEIN,WASSER:WASSER,MAHL:MAHL,STAMM:STAMM,FLEISCH:FLEISCH,T_WERK:T_WERK,ART_KETTE:ART_KETTE,WERK_KAP:WERK_KAP,erzeugen:erzeugen,verbrauchen:verbrauchen,stapelNeu:stapelNeu,werkArt:werkArt,lagerOk:lagerOk,naechstes:naechstes,mach:mach,LAGER_KAP:LAGER_KAP,KARREN_KAP:KARREN_KAP,TRAG:TRAG,MAX_AUF:MAX_AUF,TAKT:TAKT,AUSGLEICH:AUSGLEICH,BLOCK:BLOCK,
 T_LAGER:T_LAGER,T_KARREN:T_KARREN,T_BAU:T_BAU,T_STAPEL:T_STAPEL,T_PERSON:T_PERSON,A_RES:A_RES,A_UNTERWEGS:A_UNTERWEGS,ART_HAND:ART_HAND,ART_BAU:ART_BAU,ART_AUSGLEICH:ART_AUSGLEICH,ART_STAPEL:ART_STAPEL,ART_RUECK:ART_RUECK,
 ARTEN:ARTEN,befehl:befehl,schritt:schritt,abdruck:abdruck,meld:meld,stand:stand,ausStand:ausStand,
 hole:hole,finde:finde,anlegen:anlegen,aufnehmen:aufnehmen,abliefern:abliefern,abbrechen:abbrechen,ablegen:ablegen,rueck:rueck,heimAb:heimAb,fuerKarren:fuerKarren,
 bereit:bereit,naechstesZiel:naechstesZiel,bauStart:bauStart,bauTakt:bauTakt,bauFertig:bauFertig,blocker:blocker,frei:frei,verf:verf,kap:kap,summe:summe,weit:weit};
if(typeof module!=='undefined'&&module.exports)module.exports=W;else root.AT3WAREN=W;
})(typeof self!=='undefined'?self:this);
