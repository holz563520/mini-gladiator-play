// WAS DIE DATEI TUT: Gladiatoren und Sklavenmarkt im Weltkern von Arena Theory 3.0 (Schritt G9c1). Jede Person ist ein Gladiator mit den Daten aus 1.0,
// einem benannten Herkunftsort und einem Geburtsort aus dem Weltnetz. Fester Marktstand am Startplatz, jeden Spieltag 5 Kandidaten, Kaufen für 100 Gold.
// Entscheidungen Thomas (17.11.2026): Gladiatoren bekommt man wie in 1.0 vom Sklavenmarkt, GENAU so ausgewürfelt wie in 1.0 (1:1). Alle Personen sind
// Gladiatoren, auch die 5 vom Start. Aufgaben teilt vorerst die Automatik ein. Alles im Spiel englisch.
// Würfeln: NICHT hier. Der Weltkern rechnet nur ganze Zahlen und kennt 1.0 nicht. Er meldet „braucht“ (Spieltag, Zahl der Startpersonen ohne Daten); das Spiel
// lässt den Kampfkern (kampfkern.js, unverändertes 1.0) würfeln, genau wie trader.js stock(): makeGladiator(0), danach special.roll, und schickt das Ergebnis mit
// dem Befehl glaLot zurück. Die Daten (g) liegen hier unverändert und undurchsucht im Zustand und im Spielstand (1.0-Format, für den Kampf in G9d).
// Herkunft (Thomas 16.11.2026): Beim Einschalten werden die 8 nächsten benannten Orte um den Startplatz gemerkt (Dorf, Stadt, Hafen; Namen aus ortsnamen.js).
// Jeder Gladiator bekommt daraus einen Herkunftsort (näher = häufiger, aus dem Strom „wirtschaft“) und einen Geburtsort (meist derselbe, sonst ein Nachbarort).
// Kaufen: Befehl glaKauf {i}: Kandidat i des heutigen Tags, 100 Gold aus der Baukasse (wie 1.0 PRICE), neue Person am Marktstand. Ein neuer Tag bringt 5 neue,
// Unverkaufte gehen (wie 1.0). Einschalten: Befehl „gladiatoren {an:1}“ (das Spiel schickt ihn nach „wirtschaft“ und für ältere Stände beim Laden).
// G9d3 Heilung (Thomas 17.11.2026: „Heilen wie 1.0, schonen“): Ein neuer Spieltag meldet „heil“ (Tag, Zahl der Tage seit der letzten Heilung, höchstens 30). Das Spiel
// lässt den Kampfkern die 1.0-Heilung rechnen (KK.heile: unveränderter Tageswechsel aus data.js) und schickt glaHeil {tag, liste:[{pid, gv, g, hp, ruht}]}. Übernommen
// wird nur, wenn gv (Datenstand des Gladiators, wächst bei jedem Kampf und jeder Heilung) noch passt. hp (Gesundheit 0–100) macht leicht Verletzte langsamer,
// ruht = schwer verletzt: keine Arbeit, liegt in der Unterkunft (personen.js).
// Kerne: nur Weltkern; Kosten je Tick ein Vergleich, alles andere nur bei einem Befehl oder einmal je Spieltag. Hängt nicht von der Weltgröße ab.
(function(root){
'use strict';
function PERS(){return root.AT3PERS||(typeof module!=='undefined'&&module.exports?require('./personen.js'):null)}
function BAU(){return root.AT3BAU||(typeof module!=='undefined'&&module.exports?require('./bau.js'):null)}
function KET(){return root.AT3KETTEN||(typeof module!=='undefined'&&module.exports?require('./ketten.js'):null)}
function WG(){return root.AT3WG||(typeof module!=='undefined'&&module.exports?require('./weltgen.js'):null)}
function AR(){return root.AT3ARENA||(typeof module!=='undefined'&&module.exports?require('./arena.js'):null)}
function ON(){return root.AT3ORTSNAMEN||(typeof module!=='undefined'&&module.exports?require('./ortsnamen.js'):null)}
var STAND=1, HEIL_MAX=30, PREIS=100, LOT=5, ORTE=8, GLEICH=70, TAG=12000, MAX_G=4096, WX=64*9600;   // PREIS, LOT wie trader.js (1.0); GLEICH: % Geburtsort = Herkunftsort (Vorschlag)
var ART=['','dorf','stadt','hafen','hafen'];   // Ortsart im Weltnetz: 1 Dorf, 2 Stadt, 3 Hafendorf, 4 Hafenstadt
function um(X){return X<0?X+WX:X>=WX?X-WX:X}
function wuerfel(z){var v=z.zufall[1];v^=v<<13;v>>>=0;v^=v>>>17;v^=v<<5;v>>>=0;z.zufall[1]=v||1;return v}      // Strom „wirtschaft“ (wie ketten.js)
function tag(z){return Math.floor(z.tick/TAG)}

// ── Orte: die ORTE nächsten benannten Orte (Erdzellen im Umkreis 3, wie startplatz.js naechsterOrt) ──
function orteUm(z,x,y,R,ANZ){R=R||3;ANZ=ANZ||ORTE;var w=z.wg,G=WG(),N=ON();if(!w||!w.ans||!w.ans.ort||!G)return[];var A=w.ans,GW=G.GW,GH=G.GH,ZF=G.ZF,zx=Math.floor(x/ZF),zy=Math.floor(y/ZF),L=[];
 for(var v=-R;v<=R;v++)for(var u=-R;u<=R;u++){var X=((zx+u)%GW+GW)%GW,Y=zy+v;if(Y<0||Y>=GH)continue;var i=Y*GW+X,a=A.ort[i]&15;if(!a||a>4)continue;
  var p=G.ortPunkt(w.seed>>>0,A,X,Y),ox=p[0]+(zx+u-X)*ZF,e=(ox-x)*(ox-x)+(p[1]-y)*(p[1]-y);L.push([i,a,um(p[0]),p[1],e,N?N.name(w.seed>>>0,i,a):'']);}
 L.sort(function(a,b){return a[4]-b[4]||a[0]-b[0]});return L.slice(0,ANZ).map(function(o){return[o[0],o[1],o[2],o[3],o[5]]})}
function ort(o){return{art:ART[o[1]],ortId:o[0],name:o[4],x:o[2],y:o[3]}}
// Herkunft: Ort k mit Gewicht ORTE-k (der nächste 8×, der fernste 1×); Geburtsort GLEICH % derselbe, sonst ein anderer der Liste
function herkunft(z,a){var O=a.orte;if(!O.length)return null;var n=O.length,s=n*(n+1)/2,r=wuerfel(z)%s,k=0;while(r>=n-k){r-=n-k;k++}
 var b=k;if(n>1&&wuerfel(z)%100>=GLEICH){b=wuerfel(z)%(n-1);if(b>=k)b++}
 var h=ort(O[k]),gb=ort(O[b]);return{her:{art:h.art,ortId:h.ortId,name:h.name},geb:{ortId:gb.ortId,name:gb.name,x:gb.x,y:gb.y}}}

// ── Marktstand: erstes begehbares Feld ab 3 Felder östlich des Startplatzes (Spirale bis 6), sonst der Startplatz selbst ──
function standFeld(z,x,y){var P=PERS();for(var r=0;r<=6;r++)for(var dy=-r;dy<=r;dy++)for(var dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
  var X=um(x+3+dx),Y=y-1+dy;if(P&&P.gangbar(z,X,Y))return[X,Y]}
 return[x,y]}

function neu(z){var s=z.war;return{zaehler:1,mx:0,my:0,orte:[],tag:-1,frage:-1,lot:[],per:{},verkauft:0,meld:[],sx:s?s.sx:0,sy:s?s.sy:0,platz:false,hl:-1}}
function start(z){if(z.gla||!z.war||!z.per)return;z.gla=neu(z)}
// Platz und Orte erst, wenn die Kartenstücke um den Start da sind (sonst ist kein Feld begehbar): einmal versuchen je Sekunde, nach 10 s den Startplatz nehmen
function platz(z,a){if(a.platz)return;if(z.tick%20)return;var s=standFeld(z,a.sx,a.sy);if(s[0]===a.sx&&s[1]===a.sy&&(a.versuche=(a.versuche|0)+1)<10)return;
 a.mx=s[0];a.my=s[1];a.orte=orteUm(z,a.sx,a.sy);a.platz=true;a.zaehler++}
function schritt(z){var a=z.gla;if(!a)return;platz(z,a);if(!a.platz)return;var d=tag(z);
 if(a.tag!==d&&a.frage!==d){a.frage=d;a.zaehler++}
 if(a.hl<0){a.hl=d;a.zaehler++}else if(a.hl<d&&a.hf!==d){a.hf=d;a.zaehler++}      // G9d3: Heilung fällig (einmal melden)
 AR().schritt(z)}      // G9d2: Arena und Kampftermin
// Startpersonen ohne Gladiatordaten (die Spielstartfünf, Stände von vor G9c)
function ohne(z){var g=z.per,L=[];if(!g)return L;for(var i=0;i<g.p.length;i++)if(!z.gla.per[g.p[i].id])L.push(g.p[i].id);return L}
// G9d3: Heilung fällig? {tag, tage}
function heil(z){var a=z.gla;if(!a||!a.platz||a.hl<0)return null;var d=tag(z);return a.hl<d?{tag:d,tage:Math.min(HEIL_MAX,d-a.hl)}:null}
function braucht(z){var a=z.gla;if(!a||!a.platz)return null;var d=tag(z),n=ohne(z).length;if(a.tag===d&&!n)return null;return{tag:d,lot:a.tag===d?0:LOT,start:n}}

function istG(g){return !!g&&typeof g==='object'&&!Array.isArray(g)&&typeof g.name==='string'&&!!g.stats&&typeof g.stats==='object'}
var ARTEN={
 gladiatoren:function(w){return !!w&&w.an===1},
 glaLot:function(w){return !!w&&w.tag===Math.floor(w.tag)&&w.tag>=0&&Array.isArray(w.lot)&&(w.lot.length===0||w.lot.length===LOT)&&w.lot.every(istG)&&
  Array.isArray(w.start)&&w.start.length<=64&&w.start.every(istG)},
 glaKauf:function(w){return !!w&&w.i===Math.floor(w.i)&&w.i>=0&&w.i<LOT&&w.tag===Math.floor(w.tag)},
 glaHeil:function(w){return !!w&&w.tag===Math.floor(w.tag)&&w.tag>=0&&Array.isArray(w.liste)&&w.liste.length<=MAX_G&&w.liste.every(function(e){return !!e&&e.pid===Math.floor(e.pid)&&e.pid>=1&&
  e.gv===Math.floor(e.gv)&&e.gv>=0&&istG(e.g)&&e.hp===Math.floor(e.hp)&&e.hp>=0&&e.hp<=100&&(e.ruht===0||e.ruht===1)})},
 arenaTermin:function(w){return AR().ARTEN.arenaTermin(w)},arenaAbsage:function(w){return AR().ARTEN.arenaAbsage(w)},arenaErgebnis:function(w){return AR().ARTEN.arenaErgebnis(w)}};      // G9d2
function rec(z,a,g){var h=herkunft(z,a);return{g:JSON.parse(JSON.stringify(g)),her:h?h.her:null,geb:h?h.geb:null}}
function melde(a,m){a.meld.push(m);if(a.meld.length>8)a.meld.shift();a.zaehler++}
function befehl(z,art,w){
 if(art==='gladiatoren'){start(z);return}
 if(art==='arenaTermin'||art==='arenaAbsage'||art==='arenaErgebnis'){AR().befehl(z,art,w);return}      // G9d2
 var a=z.gla;if(!a||!a.platz)return;var d=tag(z),i;
 if(art==='glaLot'){
  if(w.lot.length&&w.tag===d&&a.tag!==d){a.lot=w.lot.map(function(g){return rec(z,a,g)});a.tag=d;a.verkauft=0}      // veraltete Lieferungen (anderer Tag) fallen weg
  var L=ohne(z);for(i=0;i<L.length&&i<w.start.length;i++)a.per[L[i]]=rec(z,a,w.start[i]);
  a.zaehler++;return}
 if(art==='glaHeil'){if(w.tag!==d||a.hl>=d)return;      // G9d3: veraltete Heilung (anderer Tag) fällt weg
  w.liste.forEach(function(e){var p=a.per[e.pid];if(!p||(p.gv|0)!==e.gv)return;p.g=JSON.parse(JSON.stringify(e.g));p.hp=e.hp;p.ruht=e.ruht;p.gv=e.gv+1});a.hl=d;a.zaehler++;return}
 if(art==='glaKauf'){var k=a.lot[w.i];
  if(w.tag!==a.tag||a.tag!==d||!k){melde(a,{tick:z.tick,ok:0,grund:'gone'});return}
  if(!z.bau)z.bau=BAU().neu();if(z.bau.gold<PREIS){melde(a,{tick:z.tick,ok:0,grund:'no_gold'});return}
  var id=PERS().dazu(z,a.mx,a.my);if(!id){melde(a,{tick:z.tick,ok:0,grund:'full'});return}
  z.bau.gold-=PREIS;z.bau.zaehler++;a.per[id]=k;a.lot[w.i]=null;a.verkauft++;melde(a,{tick:z.tick,ok:1,id:id,name:k.g.name});return}}
// Tote nimmt arena.js heraus (G9d3); hier fällt zusätzlich weg, wer nicht mehr in der Personenliste steht
function aufraeumen(z){var a=z.gla,g=z.per;if(!a||!g)return;var da={};for(var i=0;i<g.p.length;i++)da[g.p[i].id]=1;for(var id in a.per)if(!da[id])delete a.per[id]}

// ── An das Spiel: kleine Übersicht (keine vollen 1.0-Daten), nur bei einer Änderung (zaehler) ──
function kurz(r){var g=r.g,s=g.stats||{},w=function(x){return x==null?null:Math.round(x)};return{name:g.name,alter:g.age|0,groesse:g.height|0,gewicht:g.weight|0,
 talent:w(g.potential),wuchs:g.stature||'',her:r.her,geb:r.geb,hp:r.hp==null?100:r.hp,ruht:r.ruht|0,gv:r.gv|0,werte:{str:w(s.strength),sta:w(s.stamina),agi:w(s.agility),dex:w(s.dexterity)}}}
function meld(z){var a=z.gla;if(!a)return null;aufraeumen(z);var per={};for(var id in a.per)per[id]=kurz(a.per[id]);
 return{zaehler:a.zaehler,platz:a.platz,markt:[a.mx,a.my],tag:a.tag,heute:tag(z),preis:PREIS,gold:z.bau?z.bau.gold:BAU().START_GOLD,
  lot:a.tag===tag(z)?a.lot.map(function(r){return r?kurz(r):null}):[],braucht:braucht(z),heil:heil(z),per:per,meld:a.meld.slice(),orte:a.orte.map(function(o){return{ortId:o[0],art:ART[o[1]],name:o[4]}}),arena:AR().kurz(z)}}
// Volle 1.0-Daten einer Person oder eines Kandidaten (G9c2 Karte, G9d Kampf); nur auf Nachfrage
function daten(z,wo){var a=z.gla;if(!a)return null;if(wo.arena)return AR().daten(z);      // G9d2: Kampffenster
 if(wo.heil){var L=[];for(var id in a.per){var q=a.per[id];if(q&&q.g&&!q.g.dead)L.push({pid:+id,gv:q.gv|0,g:q.g})}return JSON.parse(JSON.stringify({tag:tag(z),liste:L}))}      // G9d3: alle Lebenden zur Heilung
 if(wo.figur){var F=[];wo.figur.forEach(function(id){var q=a.per[id];if(q&&q.g)F.push({pid:+id,gv:q.gv|0,g:q.g})});return JSON.parse(JSON.stringify(F))}      // F1b: Aussehen für die Kartenblätter
 var r=wo.person!=null?a.per[wo.person]:a.tag===tag(z)?a.lot[wo.i]:null;return r?JSON.parse(JSON.stringify(r)):null}

function abdruck(a,f){f(a.platz?1:0);f(a.mx);f(a.my);f(a.tag);f(a.frage);f(a.verkauft);f(a.orte.length);
 var ids=Object.keys(a.per).map(Number).sort(function(x,y){return x-y});f(ids.length);ids.forEach(function(id){f(id);var r=a.per[id];f(r.her?r.her.ortId:-1);f(r.geb?r.geb.ortId:-1);f(r.gv|0);f(r.hp==null?100:r.hp);f(r.ruht|0)});f(a.hl)
 a.lot.forEach(function(r){f(r?(r.her?r.her.ortId:-1)+1:0)});AR().abdruck(a.ar,f)}
function stand(a){return{format:STAND,zaehler:a.zaehler,mx:a.mx,my:a.my,orte:a.orte.map(function(o){return o.slice()}),tag:a.tag,frage:a.frage,lot:a.lot.slice(),per:Object.assign({},a.per),verkauft:a.verkauft,
 sx:a.sx,sy:a.sy,platz:a.platz,versuche:a.versuche|0,hl:a.hl,hf:a.hf|0,ar:AR().stand(a.ar)}}
function ausStand(d){if(!d||d.format!==STAND||!Array.isArray(d.orte)||!Array.isArray(d.lot)||!d.per||typeof d.per!=='object')return null;
 var okR=function(r){return r===null||(r&&istG(r.g))};if(!d.lot.every(okR))return null;for(var id in d.per)if(!okR(d.per[id])||d.per[id]===null)return null;
 var ar=d.ar==null?null:AR().ausStand(d.ar);if(ar===false)return null;      // G9d2: Stände von vor G9d2 haben keine Arena (entsteht von selbst)
 return{ar:ar,zaehler:d.zaehler|0,mx:d.mx|0,my:d.my|0,orte:d.orte.map(function(o){return o.slice()}),tag:d.tag|0,frage:d.frage|0,lot:d.lot.slice(),per:Object.assign({},d.per),verkauft:d.verkauft|0,meld:[],
  sx:d.sx|0,sy:d.sy|0,platz:!!d.platz,versuche:d.versuche|0,hl:typeof d.hl==='number'&&d.hl===Math.floor(d.hl)&&d.hl>=-1?d.hl:-1,hf:d.hf|0}}      // G9d3: ohne hl = ab dem nächsten Tag

var GL={STAND:STAND,HEIL_MAX:HEIL_MAX,heil:heil,PREIS:PREIS,LOT:LOT,ORTE:ORTE,GLEICH:GLEICH,ARTEN:ARTEN,start:start,schritt:schritt,befehl:befehl,braucht:braucht,meld:meld,daten:daten,
 abdruck:abdruck,stand:stand,ausStand:ausStand,orteUm:orteUm,MAX_G:MAX_G};
if(typeof module!=='undefined'&&module.exports)module.exports=GL;else root.AT3GLAD=GL;
})(typeof self!=='undefined'?self:this);
