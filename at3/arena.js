// WAS DIE DATEI TUT: Arena im Weltkern von Arena Theory 3.0 (Schritt G9d2): feste Arena am Startplatz, Kampftermin am nächsten Spieltag, Kämpfer hören
// rechtzeitig mit der Arbeit auf und gehen zur Arena, Ergebnis des Kampfs genau einmal in den Spielstand (Daten aus 1.0, Prämie in die Kasse).
// Entscheidungen Thomas (17.11.2026): Aufstellung 1:1 aus 1.0 (3×3-Raster, ★-Held, fünf Gegner mit 1–5 Totenköpfen, Prämie wie 1.0 in die AT3-Kasse), im Kampffenster
// (kampffenster.js) gerechnet und gezeigt; feste Arena auf der Karte (Skizze nach der 2.0-Sandgrube); Termin am nächsten Spieltag; Gegner kommen aus benannten Orten
// der Welt: leichte aus der Nähe, 4–5 Totenköpfe aus fernen Städten (Auswahl im Kampffenster aus den Listen nah/fern, die hier entstehen).
// Ablauf: Befehl arenaTermin (aus dem Kampffenster: Aufstellung, gewähltes Angebot, Kämpfer) → Termin am Tag danach. Ab RUF (3/8 des Tags) gehen die Kämpfer zur
// Arena: freie sofort, Bauarbeiter und Säger/Köche am Ende ihres Arbeitsgangs, Träger erst nach dem Abliefern (nichts geht verloren); sie bekommen keine neuen
// Aufgaben mehr. Ab KAMPF (Mittag) ist der Termin fällig, sobald alle an der Arena sind (spätestens SPAET = 1 Minute bei 1× danach): das Spiel öffnet das Kampffenster (Weltuhr steht). Befehl arenaErgebnis schreibt über
// kampfanschluss.js KA.zurueckschreiben genau einmal zurück (Buch), bucht die Prämie und gibt die Kämpfer frei. arenaAbsage gibt sie ebenfalls frei.
// G9d3 (Thomas 17.11.2026): Tickets nach Spektakel: Zuschauer = ZUSCHAUER × Totenköpfe × Spektakel × Ruhmfaktor (beides aus 1.0 A.judge, kommt mit dem Ergebnis als
// spekt ×100 und ruhm ×1000), je Zuschauer TICKET Gold, zusätzlich zur Prämie in die Kasse (Vorschlagswerte). Tote: Person verschwindet aus Arbeit und Kader
// (personen.js weg, getragene Ware wird abgelegt), Leiche liegt einen Spieltag neben der Arena (antippbar), Eintrag in der Liste der Gefallenen. Verletzte: Gesundheit
// und „ruht“ (schwer verletzt) aus dem Ergebnis; geheilt wird täglich in gladiatoren.js (glaHeil, 1.0-Heilung im Kampfkern).
// Kerne: nur Weltkern, Kosten je Tick ein Vergleich, alles andere einmal je Sekunde oder bei einem Befehl. Hängt nicht von der Weltgröße ab (Regel 14).
// Wiederverwendet: Orte und Herkunft aus gladiatoren.js (G9c1), Laufen und Aufgaben aus personen.js (G7), Zurückschreiben aus kampfanschluss.js (G9a).
// AR1b (Thomas 20.11.2026): große Arena (Sandgrube 17 × 17 aus attraktion.js) setzt der Spieler selbst (Befehl arenaSetzen, Mitte x,y; kostenlos, sofort fertig;
// versetzen nur ohne offenen Termin, Häuschen danach neu), Häuschen mit arenaHaus (art ein/aus, Feld x,y, kostenlos versetzbar). Nur neue Spiele (r.gross = 1,
// Spielstand Format 2); alte Stände (Format 1) behalten die kleine Arena. „closed“ ist bis AR2 nur Anzeige: Kämpfe und Tickets wie bisher. Sammelpunkt der
// Kämpfer (ax, ay) ist das Eingangshäuschen, ohne Häuschen das erste begehbare Feld am Rand. Seit AR1c1 Standard für neue Spiele (Notausschalter ?ar1b=0: kleine Arena wie bisher).
// AR2a (Thomas 21.11.2026): große Arena mit echten Zuschauern (besucher.js, r.bes): Tickets zahlen sie beim Einlass, nach dem Ergebnis kommt der Spektakel-Bonus je
// Sitzendem dazu (bonus); zum Ruf geschlossen = Kampf ohne Publikum. Kleine Arena und Notausschalter ?ar2=0: Tickets nach der Formel wie bisher.
(function(root){
'use strict';
function PERS(){return root.AT3PERS||(typeof module!=='undefined'&&module.exports?require('./personen.js'):null)}
function BAU(){return root.AT3BAU||(typeof module!=='undefined'&&module.exports?require('./bau.js'):null)}
function KA(){return root.AT3Kampf||(typeof module!=='undefined'&&module.exports?require('./kampfanschluss.js'):null)}
function ATT(){return root.AT3ATT||(typeof module!=='undefined'&&module.exports?require('./attraktion.js'):null)}
function BES(){return root.AT3BES||(typeof module!=='undefined'&&module.exports?require('./besucher.js'):null)}
var AN=!!(root.location&&!/[?&]ar1b=0/.test(root.location.search||'')),AN2=!(root.location&&/[?&]ar2=0/.test(root.location.search||''));      // AR2a: Zuschauer (besucher.js); Notausschalter ?ar2=0      // AR1c1: neue Spiele bekommen die große Arena; Notausschalter ?ar1b=0 (Node-Tests: klein, AR.gross(true))
var STAND=1, STAND_G=2, ZUSCHAUER=40, TICKET=1, MAX_LEICHEN=64, MAX_GEF=60, TAG=12000, RUF=4500, KAMPF=6000, SPAET=1200, A_ARENA=11, BUCH=32, FERN_R=8, ORTE=8, MAX_IDS=64, MAX_GOLD=100000000, WX=64*9600;   // RUF/KAMPF: Ticks ab Tagesbeginn (Vorschlag)
var ART=['','dorf','stadt','hafen','hafen'];
function um(X){return X<0?X+WX:X>=WX?X-WX:X}
function tag(z){return Math.floor(z.tick/TAG)}
function neu(){return{ax:0,ay:0,platz:false,versuche:0,fern:[],n:1,termin:null,buch:{erledigt:{}},auf:null,letzt:null,da:0,leichen:[],gef:[],gross:AN?1:0,anl:null}}

// ── Platz: erstes begehbares Feld ab 3 Felder südöstlich des Startplatzes (Spirale bis 6), nicht auf dem Marktstand ──
function feld(z,a,x,y){var P=PERS();for(var r=0;r<=6;r++)for(var dy=-r;dy<=r;dy++)for(var dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
  var X=um(x+3+dx),Y=y+3+dy;if(X===a.mx&&Y===a.my)continue;if(P&&P.gangbar(z,X,Y))return[X,Y]}
 return null}
// Ferne Städte (Gegner mit 4–5 Totenköpfen): Städte und Hafenstädte im Umkreis von FERN_R Erdzellen, ohne die nahen Orte, die nächsten ORTE davon
function ferne(z,a){var GL=root.AT3GLAD||require('./gladiatoren.js'),nah={};a.orte.forEach(function(o){nah[o[0]]=1});
 return GL.orteUm(z,a.sx,a.sy,FERN_R,ORTE*4).filter(function(o){return !nah[o[0]]&&(o[1]===2||o[1]===4)}).slice(0,ORTE)}
function platz(z,a,r){if(r.gross){if(!r.fern.length&&a.platz&&!(z.tick%200)){r.fern=ferne(z,a);if(r.fern.length)a.zaehler++}return}      // AR1b: Spieler setzt die Arena
 if(r.platz||!a.platz||z.tick%20)return;var f=feld(z,a,a.sx,a.sy);if(!f&&++r.versuche<10)return;f=f||[a.sx,a.sy+1];
 r.ax=f[0];r.ay=f[1];r.fern=ferne(z,a);r.platz=true;a.zaehler++}

// ── Kämpfer rufen und freigeben ──
function ruft(z,id){var r=z.gla&&z.gla.ar,t=r&&r.termin;return !!t&&t.zu>=1&&t.ids.indexOf(id)>=0}
function frei(z,ids){var P=PERS(),g=z.per;if(!g)return;for(var i=0;i<ids.length;i++){var c=P.finde(g,ids[i]);if(c&&c.auf===A_ARENA)P.los(g,c)}}
function rufen(z,r,t){var P=PERS(),g=z.per;if(!g)return;var da=0;
 for(var i=0;i<t.ids.length;i++){var c=P.finde(g,t.ids[i]);if(!c)continue;
  if(c.auf===A_ARENA){if(c.zust===P.Z_ARBEITET)da++;continue}
  var Z=c.zust,los=Z===P.Z_FREI||Z===P.Z_WARTET||(Z===P.Z_ARBEITET&&(c.auf===P.A_BAUEN||((c.auf===6||c.auf===7)&&!c.kt)));   // 6 sägen, 7 kochen: am Ende eines Arbeitsgangs
  if(!los)continue;P.los(g,c);c.auf=A_ARENA;P.geh(z,c,r.ax,r.ay)}
 if(da!==r.da){r.da=da;z.gla.zaehler++}}

function schritt(z){var a=z.gla;if(!a)return;var r=a.ar||(a.ar=neu());platz(z,a,r);
 if(r.anl&&!(z.tick%20)&&ATT().zustand(z,r.anl))a.zaehler++;      // AR1b: offen/zu nur nach Bauänderungen
 if(r.gross&&AN2&&r.anl&&(r.bes||r.termin))BES().schritt(z,a,r);      // AR2a: Zuschauer, jeden Tick
 if(!(z.tick%20)&&r.leichen.length&&r.leichen[0].bis<=z.tick){r.leichen=r.leichen.filter(function(l){return l.bis>z.tick});a.zaehler++}      // G9d3: nach einem Spieltag weggeräumt
 var t=r.termin;if(!t||z.tick%20)return;
 var p=z.tick-t.tag*TAG;
 if(t.zu<1&&p>=RUF){t.zu=1;a.zaehler++}
 if(t.zu<2&&p>=KAMPF&&(r.da>=t.ids.length||p>=KAMPF+SPAET)){t.zu=2;a.zaehler++}      // fällig: ab Mittag, sobald alle an der Arena sind, spätestens SPAET danach
 if(t.zu>=1){var da=z.per?t.ids.filter(function(id){return !!PERS().finde(z.per,id)}):[];if(!da.length){r.termin=null;r.letzt={id:t.id,label:t.label,skulls:t.skulls,ort:t.ort,abgesagt:1,tag:tag(z)};a.zaehler++;return}
  rufen(z,r,t)}}

// ── Befehle ──
function istG(g){return !!g&&typeof g==='object'&&!Array.isArray(g)&&typeof g.name==='string'&&!!g.stats&&typeof g.stats==='object'}
function ganz(v,a,b){return typeof v==='number'&&v===Math.floor(v)&&v>=a&&v<=b}
function istOrt(o){return o===null||(!!o&&typeof o==='object'&&typeof o.name==='string'&&o.name.length<=80)}
var ARTEN={
 arenaTermin:function(w){return !!w&&Array.isArray(w.ids)&&w.ids.length>=1&&w.ids.length<=MAX_IDS&&w.ids.every(function(i){return ganz(i,1,2147483647)})&&
  !!w.offer&&typeof w.offer==='object'&&Array.isArray(w.offer.enemy)&&w.offer.enemy.length>=1&&w.offer.enemy.length<=40&&w.offer.enemy.every(function(u){return !!u&&istG(u.g)})&&
  (w.auf===null||(!!w.auf&&typeof w.auf==='object'&&!Array.isArray(w.auf)))&&ganz(w.seed,0,4294967295)&&typeof w.label==='string'&&w.label.length<=200&&ganz(w.skulls,1,5)&&istOrt(w.ort)},
 arenaAbsage:function(w){return !!w&&typeof w.id==='string'&&w.id.length<=40},
 arenaSetzen:function(w){return !!w&&ganz(w.x,0,WX-1)&&ganz(w.y,0,1e9)},
 arenaHaus:function(w){return !!w&&(w.art==='ein'||w.art==='aus')&&ganz(w.x,0,WX-1)&&ganz(w.y,0,1e9)},
 arenaErgebnis:function(w){return !!w&&typeof w.id==='string'&&w.id.length<=40&&ganz(w.praemie,0,MAX_GOLD)&&ganz(w.gewonnen,0,2)&&
  (w.spekt===undefined||ganz(w.spekt,0,100000))&&(w.ruhm===undefined||ganz(w.ruhm,0,10000))&&(w.angesehen===undefined||ganz(w.angesehen,0,1))&&
  (w.auf===null||(!!w.auf&&typeof w.auf==='object'&&!Array.isArray(w.auf)))&&Array.isArray(w.einheiten)&&w.einheiten.length<=128&&
  w.einheiten.every(function(e){return !!e&&typeof e.key==='string'&&(e.g===null||istG(e.g))})}};
function melde(a,m){a.meld.push(m);if(a.meld.length>8)a.meld.shift();a.zaehler++}
function befehl(z,art,w){var a=z.gla;if(!a||!a.platz)return;var r=a.ar||(a.ar=neu()),t=r.termin,d=tag(z);
 if(art==='arenaTermin'){
  if(!r.platz){melde(a,{tick:z.tick,arena:1,ok:0,grund:'no_arena'});return}
  if(t){melde(a,{tick:z.tick,arena:1,ok:0,grund:'busy'});return}
  var ids=[];w.ids.forEach(function(id){if(a.per[id]&&ids.indexOf(id)<0&&z.per&&PERS().finde(z.per,id))ids.push(id)});
  if(!ids.length){melde(a,{tick:z.tick,arena:1,ok:0,grund:'nobody'});return}
  r.termin={id:'a'+(r.n++),tag:d+1,ids:ids,offer:JSON.parse(JSON.stringify(w.offer)),auf:w.auf?JSON.parse(JSON.stringify(w.auf)):null,seed:w.seed>>>0,label:w.label,skulls:w.skulls,ort:w.ort?{name:w.ort.name,art:w.ort.art||'',ortId:ganz(w.ort.ortId,0,1e9)?w.ort.ortId:null}:null,zu:0};
  if(w.auf)r.auf=JSON.parse(JSON.stringify(w.auf));
  r.da=0;melde(a,{tick:z.tick,arena:1,ok:1,id:r.termin.id,tag:r.termin.tag});return}
 if(art==='arenaSetzen'||art==='arenaHaus'){grosse(z,a,r,art,w);return}
 if(art==='arenaAbsage'){if(!t||t.id!==w.id)return;frei(z,t.ids);if(r.bes)BES().ende(z,r);r.termin=null;r.letzt={id:t.id,label:t.label,skulls:t.skulls,ort:t.ort,abgesagt:1,tag:d};a.zaehler++;return}
 if(art==='arenaErgebnis'){if(!t||t.id!==w.id)return;
  var k={};t.ids.forEach(function(id){var p=a.per[id];if(p&&p.g&&p.g.id!=null)k[String(p.g.id)]=p});
  var erg={auftrag:t.id,sieger:w.gewonnen,zeit:0,einheiten:w.einheiten.map(function(e){return{key:e.key,g:e.g,tot:!!e.tot,unten:!!e.unten,leben:+e.leben||0,verletzt:!!e.verletzt,schwer:!!e.schwer,
   verletzungen:Array.isArray(e.verletzungen)?e.verletzungen:[],ursache:typeof e.ursache==='string'?e.ursache:''}})};
  if(!KA().zurueckschreiben(r.buch,{id:t.id},erg,k))return;
  var ks=Object.keys(r.buch.erledigt);if(ks.length>BUCH)ks.slice(0,ks.length-BUCH).forEach(function(x){delete r.buch.erledigt[x]});
  var zu=zuschauer(t.skulls,w.spekt,w.ruhm),tk=zu*TICKET,bo=-1,ohne=0;
  if(r.gross&&AN2){var B=r.bes&&r.bes.id===t.id?r.bes:null;zu=B?BES().ende(z,r):0;bo=bonus(zu,w.spekt,w.ruhm);ohne=!B||B.ohne?1:0;tk=B?B.tk:0}      // AR2a: Tickets schon beim Einlass gezahlt, dazu der Bonus
  if(!z.bau)z.bau=BAU().neu();z.bau.gold+=w.praemie+(bo>=0?bo:tk);z.bau.zaehler++;
  if(w.auf)r.auf=JSON.parse(JSON.stringify(w.auf));
  frei(z,t.ids);var tote=folgen(z,a,r,t,w);
  r.termin=null;r.letzt={id:t.id,label:t.label,skulls:t.skulls,ort:t.ort,gewonnen:w.gewonnen,praemie:w.praemie,zuschauer:zu,tickets:tk,tote:tote,angesehen:w.angesehen===0?0:1,tag:d};if(bo>=0){r.letzt.bonus=bo;r.letzt.ohne=ohne}melde(a,{tick:z.tick,arena:1,ok:1,ende:t.id});return}}
// ── AR1b: große Arena setzen und Häuschen ──
function grosse(z,a,r,art,w){var m={tick:z.tick,arena:1,art:art};
 if(!r.gross){m.ok=0;m.grund='small_arena';melde(a,m);return}
 if(art==='arenaSetzen'){if(r.termin){m.ok=0;m.grund='busy';melde(a,m);return}
  var rec=r.anl||ATT().neu('sandgrube',1),A=ATT().ANLAGEN[rec.typ],g=ATT().setzen(z,rec,w.x-(A.w>>1),w.y-(A.h>>1),[[a.mx,a.my],a.md||null]);
  if(g){m.ok=0;m.grund=g;melde(a,m);return}
  r.anl=rec;r.platz=true;if(!r.fern.length)r.fern=ferne(z,a);sammel(z,r);m.ok=1;m.x=rec.x;m.y=rec.y;melde(a,m);return}
 if(!r.anl||r.anl.x<0){m.ok=0;m.grund='unplaced';melde(a,m);return}
 var h=ATT().hausSetzen(z,r.anl,w.art,w.x,w.y);if(h){m.ok=0;m.grund=h;melde(a,m);return}
 sammel(z,r);m.ok=1;m.haus=w.art;melde(a,m)}
// Sammelpunkt der Kämpfer: Eingangshäuschen, sonst das erste begehbare Feld am Rand (Süden zuerst, dann reihum)
function sammel(z,r){var e=r.anl.ein;if(e){r.ax=e[0];r.ay=e[1];return}var rec=r.anl,A=ATT().ANLAGEN[rec.typ],P=PERS(),mx=A.w>>1,my=A.h>>1;
 for(var k=0;k<=3;k++)for(var u=0;u<=mx+k;u++)for(var sg=0;sg<2;sg++){var d=sg?-u:u;if(sg&&!u)continue;
  var L=[[mx+d,A.h+k],[mx+d,-1-k],[-1-k,my+d],[A.w+k,my+d]];
  for(var i=0;i<4;i++){var X=um(rec.x+L[i][0]),Y=rec.y+L[i][1];if(!ATT().innen(rec,X,Y)&&P&&P.gangbar(z,X,Y)){r.ax=X;r.ay=Y;return}}}
 r.ax=um(rec.x+mx);r.ay=rec.y+A.h}
// ── G9d3 Folgen ──
// Zuschauer aus Totenköpfen, Spektakel (×100) und Ruhmfaktor (×1000) wie A.judge in 1.0; ohne Angabe Spektakel 1 und Ruhm 1
// AR2a (Thomas 21.11.2026): Spektakel-Bonus je Sitzendem: was die alte Formel je Zuschauer brachte (Spektakel × Ruhm Gold) über dem schon bezahlten Ticket, nie weniger als 0 (Vorschlag)
function bonus(n,sp,ru){sp=sp===undefined?100:sp;ru=ru===undefined?1000:ru;var x=sp*ru-100000*TICKET;return x>0?Math.floor(n*x/100000):0}
function zuschauer(sk,sp,ru){sp=sp===undefined?100:sp;ru=ru===undefined?1000:ru;return Math.floor(ZUSCHAUER*(sk|0)*sp*ru/100000)}
// Leichenplatz: Nachbarfelder der Arena (Spirale bis 3), begehbar, nicht Arena, Marktstand oder schon belegt
function leichenFeld(z,a,r){var P=PERS();for(var k=1;k<=3;k++)for(var dy=-k;dy<=k;dy++)for(var dx=-k;dx<=k;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==k)continue;
  var X=um(r.ax+dx),Y=r.ay+dy;if(X===a.mx&&Y===a.my)continue;if(r.leichen.some(function(l){return l.x===X&&l.y===Y}))continue;if(P&&P.gangbar(z,X,Y))return[X,Y]}
 return[r.ax,r.ay]}
// Nach dem Zurückschreiben: Tote aus der Welt nehmen (Leiche, Gefallene), Verletzten Gesundheit und Ruhen setzen. Gibt die Namen der Toten zurück.
function folgen(z,a,r,t,w){var tote=[],P=PERS();
 t.ids.forEach(function(id){var p=a.per[id];if(!p||!p.g)return;var zs=p.zustand||{};p.gv=(p.gv|0)+1;
  if(zs.tot||p.g.dead){var c=z.per&&P.finde(z.per,id),f=leichenFeld(z,a,r),name=String(p.g.name||'?').slice(0,80),urs=String(zs.ursache||'').slice(0,120);
   if(c)P.weg(z,id);delete a.per[id];tote.push(name);
   r.leichen.push({id:id,x:f[0],y:f[1],name:name,ursache:urs,her:p.her?p.her.name:'',bis:z.tick+TAG});if(r.leichen.length>MAX_LEICHEN)r.leichen.shift();
   r.gef.push({name:name,ursache:urs,tag:tag(z),kampf:t.label,skulls:t.skulls});if(r.gef.length>MAX_GEF)r.gef.shift();return}
  var hp=Math.round(+zs.leben);p.hp=hp>=0&&hp<=100?hp:100;p.ruht=zs.schwer?1:0});
 return tote}

// ── An das Spiel ──
function kurz(z){var a=z.gla,r=a&&a.ar;if(!r)return null;var t=r.termin;
 return{platz:r.platz,x:r.ax,y:r.ay,gross:r.gross|0,anlage:r.anl?ATT().kurz(r.anl):null,bes:r.gross&&r.bes?BES().kurz(r):null,letzt:r.letzt,da:r.da,leichen:r.leichen.map(function(l){return{id:l.id,x:l.x,y:l.y,name:l.name,ursache:l.ursache,her:l.her}}),gefallen:r.gef.length,termin:t?{id:t.id,tag:t.tag,ruf:t.tag*TAG+RUF,kampf:t.tag*TAG+KAMPF,ids:t.ids.slice(),label:t.label,skulls:t.skulls,ort:t.ort,zu:t.zu,n:t.offer.enemy.length}:null}}
function ortO(o){return{art:ART[o[1]],ortId:o[0],name:o[4],x:o[2],y:o[3]}}
// Volle Daten fürs Kampffenster (nur auf Nachfrage): Kader (alle lebenden Gladiatoren mit 1.0-Daten), gespeicherte Aufstellung, Orte nah/fern, Termin mit Angebot
function daten(z){var a=z.gla,r=a&&a.ar;if(!r||!z.per)return null;var P=PERS(),K=[];
 for(var i=0;i<z.per.p.length;i++){var id=z.per.p[i].id,p=a.per[id];if(!p||!p.g||(p.zustand&&p.zustand.tot)||p.g.dead)continue;K.push({pid:id,g:p.g,her:p.her,geb:p.geb})}
 return JSON.parse(JSON.stringify({kader:K,auf:r.auf,orte:{nah:a.orte.map(ortO),fern:r.fern.map(ortO)},termin:r.termin,heute:tag(z),gold:z.bau?z.bau.gold:BAU().START_GOLD}))}

function abdruck(r,f){if(!r){f(-1);return}f(r.platz?1:0);f(r.ax);f(r.ay);f(r.n);f(r.da);f(r.fern.length);var t=r.termin;f(t?t.tag:-1);f(t?t.zu:-1);f(t?t.ids.length:0);if(t)t.ids.forEach(f);
 f(Object.keys(r.buch.erledigt).length);f(r.leichen.length);r.leichen.forEach(function(l){f(l.id);f(l.x);f(l.y);f(l.bis)});f(r.gef.length);
 if(r.gross){f(STAND_G);ATT().abdruck(r.anl,f);if(r.bes)BES().abdruck(r.bes,f)}}      // AR2a: Zuschauer nur, wenn welche da sind      // AR1b: nur große Arena (alte Fingerabdrücke unverändert)
function stand(r){if(r&&r.gross){var o=standK(r);o.format=STAND_G;o.gross=1;o.anl=ATT().stand(r.anl);if(r.bes)o.bes=BES().stand(r.bes);return o}return r?standK(r):null}
function standK(r){return JSON.parse(JSON.stringify({format:STAND,ax:r.ax,ay:r.ay,platz:r.platz,versuche:r.versuche,fern:r.fern,n:r.n,termin:r.termin,buch:r.buch,auf:r.auf,letzt:r.letzt,da:r.da,leichen:r.leichen,gef:r.gef}))}
function ausStand(d){if(d==null)return null;if(typeof d!=='object'||(d.format!==STAND&&d.format!==STAND_G)||!ganz(d.ax,0,WX-1)||!ganz(d.ay,0,1e9)||!Array.isArray(d.fern)||!ganz(d.n,1,2147483647)||!d.buch||typeof d.buch.erledigt!=='object')return false;
 var t=d.termin;if(t!==null&&(!t||typeof t.id!=='string'||!ganz(t.tag,0,1e9)||!Array.isArray(t.ids)||!t.ids.every(function(i){return ganz(i,1,2147483647)})||!ganz(t.zu,0,2)||!t.offer||!Array.isArray(t.offer.enemy)||!t.offer.enemy.every(function(u){return u&&istG(u.g)})))return false;
 if(d.leichen!==undefined&&(!Array.isArray(d.leichen)||d.leichen.length>MAX_LEICHEN||!d.leichen.every(function(l){return !!l&&ganz(l.id,1,2147483647)&&ganz(l.x,0,WX-1)&&ganz(l.y,0,1e9)&&ganz(l.bis,0,1e12)&&typeof l.name==='string'})))return false;
 if(d.gef!==undefined&&(!Array.isArray(d.gef)||d.gef.length>MAX_GEF))return false;
 var an=null,bs=null;if(d.format===STAND_G){if(d.gross!==1)return false;if(d.anl!=null){an=ATT().ausStand(d.anl);if(!an)return false}if(!!d.platz!==!!(an&&an.x>=0))return false;
  if(d.bes!=null){if(!an)return false;bs=BES().ausStand(d.bes);if(!bs)return false}}      // AR2a
 var r=JSON.parse(JSON.stringify(d));delete r.format;r.gross=d.format===STAND_G?1:0;r.anl=an;r.platz=!!r.platz;r.versuche=r.versuche|0;r.da=r.da|0;r.auf=r.auf||null;r.letzt=r.letzt||null;r.leichen=r.leichen||[];r.gef=r.gef||[];delete r.bes;if(bs)r.bes=bs;return r}      // G9d3: ältere Stände ohne Leichen/Gefallene

var AR={STAND:STAND,STAND_G:STAND_G,gross:function(v){AN=!!v},zuschauerAn:function(v){AN2=!!v},bonus:bonus,ZUSCHAUER:ZUSCHAUER,TICKET:TICKET,zuschauer:zuschauer,TAG:TAG,RUF:RUF,KAMPF:KAMPF,SPAET:SPAET,A_ARENA:A_ARENA,ARTEN:ARTEN,neu:neu,schritt:schritt,befehl:befehl,ruft:ruft,kurz:kurz,daten:daten,abdruck:abdruck,stand:stand,ausStand:ausStand};
if(typeof module!=='undefined'&&module.exports)module.exports=AR;else root.AT3ARENA=AR;
})(typeof self!=='undefined'?self:this);
