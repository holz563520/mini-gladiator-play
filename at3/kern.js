// WAS DIE DATEI TUT: Spielkern von Arena Theory 3.0 (Schritt G2). Reine Rechnung ohne Bildschirm: Zustand, Befehle, Uhr (20 feste Ticks je Sekunde),
// Zufall in vier getrennten Strömen, Fingerabdruck des Zustands, Verteiler für Helferaufträge. Läuft unverändert im Weltkern (weltkern.js),
// in den Helfern (helfer.js), im Master-Editor (Kernprobe) und in Node-Tests.
// Kerne: diese Datei wird nur in Hintergrundkernen geladen, nie auf dem Hauptkern des Spiels (Regel 13).
// Gleichheit: Die Spiellogik rechnet nur mit ganzen Zahlen (keine Winkel-, Wurzel- oder Kommarechnung), damit gleicher Seed und gleiche Befehle
// auf jedem Gerät denselben Zustand ergeben. Helferergebnisse werden an einem festen Tick in Reihenfolge der Auftragsnummer übernommen,
// darum ist das Ergebnis gleich, egal wie viele Helfer rechnen und wie schnell sie sind.
// Probelast: Platzhalter-Einheiten und Probeaufträge sind nur Messlast für G2/MK1, kein Spielinhalt. Sie fallen weg, sobald echte Systeme da sind.
// Riesenwelt-Probe (MK1): Befehle nationen/anteil/welt/reise und die Auftragsarten nation/stueck liegen in riesenwelt.js und hängen sich hier ein.
// Ohne solchen Befehl bleibt z.rw leer, riesenwelt.js wird nicht geladen und der Fingerabdruck ist derselbe wie in G2.
// Weltgenerator (W1a): Befehle weltseed/blick liegen in weltstrom.js, die Auftragsarten erde/gelaende rechnet weltgen.js; beide hängen sich hier ein.
// Ohne solchen Befehl bleibt z.wg leer, die Dateien werden nicht geladen und der Fingerabdruck ist derselbe wie in G2.
// Bauen (G5a): Befehle bauBoden, bauEntfernen, bauWand, bauTuer, bauDach, bauHuelle, bauPause, bauAbbruch liegen in bau.js und hängen sich hier ein.
// Ohne solchen Befehl bleibt z.bau leer, bau.js wird nicht geladen und der Fingerabdruck ist derselbe wie bisher. Im Spielstand steckt der Bau exakt (bau:).
// Spielstand (G3): stand(z) und ausStand(d) sichern den Zustand an einer Tickgrenze und stellen ihn exakt wieder her (gleicher Fingerabdruck).
// Wiederverwendet: Seed-Zufall nach dem Muster rnd() aus fpwelt.js (xorshift), hier mit dem Stand im Zustand und in getrennten Strömen.
(function(root){
'use strict';
var TICKS=20;                         // Ticks je Spielsekunde bei 1×
var STROEME=['welt','wirtschaft','kampf','kosmetik'];
var MAX_LAST=1000000, MAX_WARTE=256;  // Obergrenzen: Probe-Einheiten (1 Mio. nur als Anschlag in der Kernprobe), wartende Befehle
var FELD=256, RAND=64*FELD;           // Probefläche 64 × 64 Felder, Lage in 1/256 Feld
var TEMPO_V=40, DENK=8;               // Schritt je Tick, Denk-Runden je Einheit (Messlast)
var FERN=64, JE_TICK=4, FRIST=4;      // Probe-Fernregionen, Aufträge je Tick, Ticks bis zur Übernahme
var MAX_SCHLANGE=64;                  // Verteiler: höchstens so viele wartende Aufträge

// Riesenwelt-Teil: im Hintergrundkern vorher mit importScripts geladen (weltkern.js, helfer.js), in Node bei Bedarf nachgeladen.
function RW(){return root.AT3RW||(typeof module!=='undefined'&&module.exports?require('./riesenwelt.js'):null)}
var RW_ARTEN={nationen:1,anteil:1,welt:1,reise:1};
// Weltgenerator-Teil (W1a): gleiches Muster. weltstrom.js = Befehle, Vergabe, Übernahme (nur Weltkern); weltgen.js = Rechnung (Helferkerne).
function WS(){return root.AT3WS||(typeof module!=='undefined'&&module.exports?require('./weltstrom.js'):null)}
function WG(){return root.AT3WG||(typeof module!=='undefined'&&module.exports?require('./weltgen.js'):null)}
var WS_ARTEN={weltseed:1,weltdichte:1,blick:1}, WG_AUFTRAG={erde:1,gelaende:1};
// Bauen (G5a): gleiches Muster. bau.js = Gebäudefelder, Räume, Wände, Baustellen, Gold (nur Weltkern). Ohne Bau-Befehl bleibt z.bau leer und der Fingerabdruck wie bisher.
function BAU(){return root.AT3BAU||(typeof module!=='undefined'&&module.exports?require('./bau.js'):null)}
// Wegsuche (G6b): gleiches Muster. wegstrom.js = Befehl wegProbe, Vergabe, Übernahme, Spielstand (nur Weltkern); wegsuche.js = Rechnung (Helferkerne).
// Ohne Befehl wegProbe bleibt z.weg leer, die Dateien werden nicht geladen und der Fingerabdruck ist derselbe wie bisher.
function WEG(){return root.AT3WEGSTROM||(typeof module!=='undefined'&&module.exports?require('./wegstrom.js'):null)}
function SUCHE(){return root.AT3WEG||(typeof module!=='undefined'&&module.exports?require('./wegsuche.js'):null)}
var WEG_ARTEN={wegProbe:1};
// Karren (G6c): karren.js hängt sich an den Bau (Pendel-Automatik: jedes Lager mit fertigem Tor bekommt einen Karren). Auftragsart „kweg“ = Wegsuche eines Karrens
// (rechnet wie „weg“ in wegsuche.js). Ohne Lager mit Tor bleibt z.kar leer und der Fingerabdruck derselbe wie bisher.
function KAR(){return root.AT3KARREN||(typeof module!=='undefined'&&module.exports?require('./karren.js'):null)}
// Waren und Arbeiter (G7): waren.js = Bestände, Lieferaufträge, Material für Baustellen; personen.js = Arbeiter (Laufen, Aufgaben, Fähigkeiten). Beide nur im
// Weltkern, eingeschaltet mit dem Befehl „wirtschaft“. Auftragsart „pweg“ = Wegsuche einer Person (rechnet wie „weg“). Ohne den Befehl bleiben z.war und z.per
// leer, Bauen und Karren laufen wie bisher und der Fingerabdruck ist derselbe.
function WAR(){return root.AT3WAREN||(typeof module!=='undefined'&&module.exports?require('./waren.js'):null)}
function PERS(){return root.AT3PERS||(typeof module!=='undefined'&&module.exports?require('./personen.js'):null)}
// Erste Ketten (G8): ketten.js = Holz, Nahrung, Wasser, Essen, Rehe, Stümpfe, Automatik mit Sollbeständen. Nur im Weltkern, eingeschaltet mit dem Befehl
// „ketten“ (nach „wirtschaft“). Ohne den Befehl bleibt z.ket leer und alles läuft wie in G7.
function GLA(){return root.AT3GLAD||(typeof module!=='undefined'&&module.exports?require('./gladiatoren.js'):null)}
function KET(){return root.AT3KETTEN||(typeof module!=='undefined'&&module.exports?require('./ketten.js'):null)}
var WAR_ARTEN={wirtschaft:1,lieferung:1,personRolle:1,ketten:1,gladiatoren:1,glaLot:1,glaKauf:1};      // G9c1: gladiatoren, glaLot, glaKauf (gladiatoren.js über waren.js)
var BAU_ARTEN={bauBoden:1,bauEntfernen:1,bauWand:1,bauTuer:1,bauDach:1,bauHuelle:1,bauPause:1,bauAbbruch:1,bauWaende:1,bauTuerWechsel:1,bauWeg:1};   // G6a: bauWeg

function mix(a){a=a>>>0;a^=a>>>16;a=Math.imul(a,0x7feb352d);a^=a>>>15;a=Math.imul(a,0x846ca68b);a^=a>>>16;return a>>>0}
function dreh(z){z^=z<<13;z>>>=0;z^=z>>>17;z^=z<<5;return z>>>0}

// ── Zustand ──
function neu(seed,version){var z={};setze(z,seed,version||1);return z}
function setze(z,seed,version){seed=seed>>>0;
 z.seed=seed;z.version=version;z.tick=0;z.tempo=1;z.last=0;z.auftragNr=0;z.angewandt=0;
 z.zufall=new Uint32Array(STROEME.length);for(var i=0;i<STROEME.length;i++)z.zufall[i]=mix(seed+Math.imul(i+1,0x9e3779b9))||1;
 z.e=new Int32Array(0);               // Probe-Einheiten: je 5 Zahlen x, y, Zielx, Ziely, Sinn
 z.fern=new Int32Array(FERN);for(var r=0;r<FERN;r++)z.fern[r]=mix(seed^Math.imul(r+1,0x85ebca6b))|0;
 z.rw=null;                           // Riesenwelt-Probe (MK1), entsteht erst mit dem ersten Riesenwelt-Befehl
 z.wg=null;                           // Weltgenerator (W1a), entsteht erst mit dem ersten Befehl weltseed oder blick
 z.bau=null;                          // Bauen (G5a), entsteht erst mit dem ersten Bau-Befehl
 z.weg=null;                          // Wegsuche (G6b), entsteht erst mit dem ersten Befehl wegProbe
 z.kar=null;                          // Karren (G6c), entsteht erst mit dem ersten Lager mit fertigem Tor
 z.war=null;z.per=null;                // Waren und Arbeiter (G7), entstehen erst mit dem Befehl wirtschaft
 z.gla=null;                          // Gladiatoren und Sklavenmarkt (G9c1), entstehen erst mit dem Befehl gladiatoren
 z.ket=null;                          // Erste Ketten (G8), entstehen erst mit dem Befehl ketten
 z.offen=[];z.warte=[];return z}

// ── Zufall: getrennte Ströme, Stand liegt im Zustand ──
function zufall(z,strom){var v=dreh(z.zufall[strom]);z.zufall[strom]=v;return v}
function zufallBis(z,strom,n){return zufall(z,strom)%n}

// ── Befehle: Laufnummer, Ziel-Tick, Art, Wert. Geprüft beim Annehmen, angewendet nur an Tickgrenzen in Reihenfolge der Laufnummer ──
var ARTEN={
 tempo:function(w){return w===0||w===1||w===2||w===3},
 last:function(w){return w===(w|0)&&w>=0&&w<=MAX_LAST},
 neu:function(w){return typeof w==='number'&&w>=0&&w<=4294967295&&w===Math.floor(w)}
};
function befehl(z,b){
 var pruef=b&&(ARTEN[b.art]||(RW_ARTEN[b.art]&&RW()&&RW().ARTEN[b.art])||(WS_ARTEN[b.art]&&WS()&&WS().ARTEN[b.art])||(BAU_ARTEN[b.art]&&BAU()&&BAU().ARTEN[b.art])||(WEG_ARTEN[b.art]&&WEG()&&WEG().ARTEN[b.art])||(WAR_ARTEN[b.art]&&WAR()&&WAR().ARTEN[b.art]));
 if(!pruef)return'unbekannter Befehl';
 if(!pruef(b.wert))return'ungültiger Wert';
 if(!(b.nr===(b.nr|0)&&b.nr>=0))return'keine Laufnummer';
 if(z.warte.length>=MAX_WARTE)return'zu viele wartende Befehle';
 var t=b.tick==null?z.tick:b.tick;if(!(t===Math.floor(t)&&t>=0))return'ungültiger Tick';
 z.warte.push({nr:b.nr,tick:t<z.tick?z.tick:t,art:b.art,wert:b.wert});return null}
function anwenden(z){if(!z.warte.length)return 0;
 var jetzt=[],rest=[],i;for(i=0;i<z.warte.length;i++)(z.warte[i].tick<=z.tick?jetzt:rest).push(z.warte[i]);
 if(!jetzt.length)return 0;jetzt.sort(function(a,b){return a.nr-b.nr});z.warte=rest;
 for(i=0;i<jetzt.length;i++){var b=jetzt[i];
  if(b.art==='tempo')z.tempo=b.wert;
  else if(b.art==='last')lastSetzen(z,b.wert);
  else if(b.art==='neu'){var w=z.warte,a=z.angewandt;setze(z,b.wert,z.version+1);z.warte=w;z.angewandt=a;for(var k=0;k<w.length;k++)w[k].tick=0}
  else if(WS_ARTEN[b.art]){var g0=z.wg?z.wg.gen:0;WS().befehl(z,b.art,b.wert);if(z.wg.gen!==g0){z.bau=null;z.weg=null;z.kar=null;z.war=null;z.per=null;z.ket=null;z.gla=null}}   // neue Welt = Gebautes weg
  else if(BAU_ARTEN[b.art])BAU().befehl(z,b.art,b.wert,b.nr);
  else if(WEG_ARTEN[b.art])WEG().befehl(z,b.art,b.wert,b.nr);
  else if(WAR_ARTEN[b.art])WAR().befehl(z,b.art,b.wert);
  else RW().befehl(z,b.art,b.wert);
  z.angewandt++}
 return jetzt.length}
function lastSetzen(z,n){var alt=z.e,vor=alt.length/5,e=new Int32Array(n*5);e.set(n<vor?alt.subarray(0,n*5):alt);
 for(var i=vor;i<n;i++){var p=i*5;e[p]=zufallBis(z,0,RAND);e[p+1]=zufallBis(z,0,RAND);e[p+2]=zufallBis(z,0,RAND);e[p+3]=zufallBis(z,0,RAND);e[p+4]=zufall(z,0)|0}
 z.e=e;z.last=n}

// ── Helferaufträge ──
// Fällige Aufträge dieses Ticks (Nummern). Der Weltkern rechnet den Tick erst, wenn alle Ergebnisse da sind.
// G6b: Aufträge haben verschiedene Fristen (Weg 20 Ticks, sonst 4), darum wird die ganze (kurze, begrenzte) Liste angesehen, nicht nur der Anfang.
function faellig(z){var L=[];for(var i=0;i<z.offen.length;i++)if(z.offen[i].faellig<=z.tick)L.push(z.offen[i].nr);return L}
// Rechnung eines Auftrags (läuft im Helfer oder, ohne Helfer, im Weltkern). Nur ganze Zahlen.
function auftragRechnen(a){if(WG_AUFTRAG[a.art])return WG().rechnen(a);if(a.art==='weg'||a.art==='kweg'||a.art==='pweg')return SUCHE().rechnen(a);if(a.art!=='probe')return RW().rechnen(a);var v=(a.ein^0x5bd1e995)>>>0||1;for(var i=0;i<a.runden;i++)v=dreh(v);return v|0}

// ── Ein Tick. holen(nr) liefert das Ergebnis eines fälligen Auftrags. Gibt die neu vergebenen Aufträge zurück. ──
function schritt(z,holen){
 anwenden(z);
 var i,o=z.offen,n=0,F=[];
 for(i=0;i<o.length;i++)if(o[i].faellig<=z.tick)F.push(o[i]);
 if(F.length){F.sort(function(a,b){return a.nr-b.nr});z.offen=o=o.filter(function(q){return q.faellig>z.tick})}
 for(n=0;n<F.length;n++){var q=F[n];if(WG_AUFTRAG[q.art])WS().uebernehmen(z,q,holen(q.nr));else if(q.art==='weg')WEG().uebernehmen(z,q,holen(q.nr));else if(q.art==='kweg'){if(KAR())KAR().uebernehmen(z,q,holen(q.nr))}else if(q.art==='pweg'){if(PERS())PERS().uebernehmen(z,q,holen(q.nr))}else if(q.art)RW().uebernehmen(z,q,holen(q.nr));else z.fern[q.region]=holen(q.nr)|0}     // feste Reihenfolge: Auftragsnummer
 var e=z.e,N=z.last,p,x,y,d,s,r;
 for(i=0;i<N;i++){p=i*5;x=e[p];y=e[p+1];
  d=e[p+2]-x;x+=d>TEMPO_V?TEMPO_V:d<-TEMPO_V?-TEMPO_V:d;d=e[p+3]-y;y+=d>TEMPO_V?TEMPO_V:d<-TEMPO_V?-TEMPO_V:d;
  if(x===e[p+2]&&y===e[p+3]){e[p+2]=zufallBis(z,0,RAND);e[p+3]=zufallBis(z,0,RAND)}
  s=e[p+4];for(r=0;r<DENK;r++){s^=s<<13;s^=s>>>17;s^=s<<5}
  e[p]=x;e[p+1]=y;e[p+4]=s^x^(y<<3)}
 var neuL=[],runden=4000+(N>>1);
 for(i=0;i<JE_TICK;i++){var nr=z.auftragNr++,reg=nr%FERN,a={nr:nr,version:z.version,vorrang:0,art:'probe',region:reg,ein:z.fern[reg]^nr,runden:runden,faellig:z.tick+FRIST};
  o.push({nr:nr,region:reg,faellig:a.faellig,ein:a.ein,runden:runden});neuL.push(a)}
 if(z.rw)RW().ausgeben(z,neuL);
 if(z.wg)WS().ausgeben(z,neuL);
 if(z.bau)BAU().schritt(z);
 if(z.war){WAR().schritt(z);if(z.ket)KET().schritt(z);PERS().schritt(z,neuL);if(z.gla)GLA().schritt(z)}      // G7: nach dem Bau (sehen fertige Lager und Baustellen dieses Ticks), vor den Karren
 if(z.bau&&KAR())KAR().schritt(z,neuL);              // G6c: Karren nach dem Bau (sehen die Änderungen dieses Ticks)
 if(z.weg)WEG().ausgeben(z,neuL);                    // G6b: nach dem Bau, damit das Paket alle Änderungen dieses Ticks sieht
 z.tick++;return neuL}

// ── Fingerabdruck: Prüfsumme über den ganzen Zustand ──
function abdruck(z){var h=0x811c9dc5,i;function f(v){h=Math.imul(h^(v&255),0x01000193);h=Math.imul(h^((v>>>8)&255),0x01000193);h=Math.imul(h^((v>>>16)&255),0x01000193);h=Math.imul(h^(v>>>24),0x01000193)}
 f(z.seed);f(z.tick);f(z.tempo);f(z.last);f(z.auftragNr);
 for(i=0;i<z.zufall.length;i++)f(z.zufall[i]);for(i=0;i<z.fern.length;i++)f(z.fern[i]);
 var e=z.e,n=z.last*5;for(i=0;i<n;i++)f(e[i]);
 if(z.rw)RW().abdruck(z.rw,f);
 if(z.wg)WS().abdruck(z.wg,f);
 if(z.bau)BAU().abdruck(z.bau,f);
 if(z.weg)WEG().abdruck(z.weg,f);
 if(z.kar)KAR().abdruck(z.kar,f);
 if(z.war)WAR().abdruck(z.war,f);
 if(z.per)PERS().abdruck(z.per,f);
 if(z.ket)KET().abdruck(z.ket,f);
 if(z.gla)GLA().abdruck(z.gla,f);
 return('0000000'+(h>>>0).toString(16)).slice(-8)}

// ── Spielstand (G3): Zustand an einer Tickgrenze als einfache Zahlenlisten (JSON-tauglich) und zurück ──
// Gesichert wird alles, was der Fingerabdruck sieht, dazu wartende Befehle und offene Probeaufträge (die werden nach dem Laden neu vergeben,
// gleiche Nummer, gleicher Eingang, gleicher Fälligkeits-Tick: darum ist der Fingerabdruck nach dem Laden exakt gleich).
// Riesenwelt-Probe (rw) gehört nicht zum Spiel. Weltgenerator (wg, seit G4a im Spiel): gesichert werden Seed, Dichte, Blick und die Zählwerte (weltstrom.js stand),
// Erde und Kartenstücke entstehen beim Laden neu aus dem Seed. stand.ganz=false meldet, dass etwas davon nicht exakt gesichert ist.
var STAND=1;
function stand(z){var off=[],ganz=!z.rw,i;
 for(i=0;i<z.offen.length;i++){var o=z.offen[i];if(o.art){if(!((o.art==='gelaende'&&z.wg)||(o.art==='weg'&&z.weg)||(o.art==='kweg'&&z.kar)||(o.art==='pweg'&&z.per)))ganz=false;continue}off.push([o.nr,o.region,o.faellig,o.ein|0,o.runden|0])}
 if(z.wg&&!WS().exakt(z.wg))ganz=false;
 return{format:STAND,ganz:ganz,seed:z.seed>>>0,tick:z.tick,tempo:z.tempo,last:z.last,auftragNr:z.auftragNr,angewandt:z.angewandt,
  zufall:Array.from(z.zufall),fern:Array.from(z.fern),e:Array.from(z.e),offen:off,
  warte:z.warte.map(function(b){return[b.nr,b.tick,b.art,b.wert]}),
  welt:z.wg?WS().stand(z.wg,z):null,bau:z.bau?BAU().stand(z.bau):null,weg:z.weg?WEG().stand(z.weg,z):null,kar:z.kar?KAR().stand(z.kar,z):null,war:z.war?WAR().stand(z.war):null,per:z.per?PERS().stand(z.per,z):null,ket:z.ket?KET().stand(z.ket):null,gla:z.gla?GLA().stand(z.gla):null}}
// Prüft streng (fremde oder kaputte Stände werden abgelehnt, nicht halb geladen). Gibt {z, auftraege} oder {fehler} zurück.
function ausStand(d,version){
 function ganzZ(v,min,max){return typeof v==='number'&&v===Math.floor(v)&&v>=min&&v<=max}
 function liste(L,n,pruef){if(!Array.isArray(L)||(n>=0&&L.length!==n))return false;for(var i=0;i<L.length;i++)if(!pruef(L[i]))return false;return true}
 var I32=function(v){return ganzZ(v,-2147483648,2147483647)},U32=function(v){return ganzZ(v,0,4294967295)},MAXT=2147483647;
 if(!d||d.format!==STAND)return{fehler:'unbekanntes Format'};
 if(!U32(d.seed)||!ganzZ(d.tick,0,MAXT)||!ARTEN.tempo(d.tempo)||!ARTEN.last(d.last)||!ganzZ(d.auftragNr,0,MAXT)||!ganzZ(d.angewandt,0,MAXT))return{fehler:'Kopfwerte'};
 if(!liste(d.zufall,STROEME.length,function(v){return U32(v)&&v>0})||!liste(d.fern,FERN,I32)||!liste(d.e,d.last*5,I32))return{fehler:'Zahlenfelder'};
 if(!liste(d.offen,-1,function(o){return Array.isArray(o)&&o.length===5&&ganzZ(o[0],0,d.auftragNr-1)&&ganzZ(o[1],0,FERN-1)&&ganzZ(o[2],0,MAXT)&&I32(o[3])&&ganzZ(o[4],0,MAXT)})||d.offen.length>MAX_SCHLANGE)return{fehler:'offene Aufträge'};
 if(!liste(d.warte,-1,function(b){return Array.isArray(b)&&b.length===4&&((ARTEN[b[2]]&&ARTEN[b[2]](b[3]))||(BAU_ARTEN[b[2]]&&BAU()&&BAU().ARTEN[b[2]](b[3]))||(WEG_ARTEN[b[2]]&&WEG()&&WEG().ARTEN[b[2]](b[3]))||(WAR_ARTEN[b[2]]&&WAR()&&WAR().ARTEN[b[2]](b[3])))&&ganzZ(b[0],0,MAXT)&&ganzZ(b[1],0,MAXT)})||d.warte.length>MAX_WARTE)return{fehler:'wartende Befehle'};
 var z=neu(d.seed,version);
 z.tick=d.tick;z.tempo=d.tempo;z.last=d.last;z.auftragNr=d.auftragNr;z.angewandt=d.angewandt;
 z.zufall=Uint32Array.from(d.zufall);z.fern=Int32Array.from(d.fern);z.e=Int32Array.from(d.e);
 z.warte=d.warte.map(function(b){return{nr:b[0],tick:b[1],art:b[2],wert:b[3]}});
 if(d.bau){z.bau=BAU()&&BAU().ausStand(d.bau);if(!z.bau)return{fehler:'Bau'}}
 if(d.war){z.war=WAR()&&WAR().ausStand(d.war);if(!z.war)return{fehler:'Waren'}}
 if(d.ket){z.ket=d.war&&KET()?KET().ausStand(d.ket):null;if(!z.ket)return{fehler:'Ketten'}}
 if(d.gla){z.gla=d.war&&GLA()?GLA().ausStand(d.gla):null;if(!z.gla)return{fehler:'Gladiatoren'}}      // G9c1      // G7: Personen (per) kommen nach der Welt (personen.js ausStand)
 var auftraege=[];z.offen=d.offen.map(function(o){
  auftraege.push({nr:o[0],version:z.version,vorrang:0,art:'probe',region:o[1],ein:o[3],runden:o[4],faellig:o[2]});
  return{nr:o[0],region:o[1],faellig:o[2],ein:o[3],runden:o[4]}});
 return{z:z,auftraege:auftraege,welt:d.welt||null,weg:d.weg||null,kar:d.kar||null,per:d.per||null}}

// ── Verteiler: wartende Aufträge (nach Vorrang, dann Nummer), Ergebnisse je Nummer, Veraltetes wird verworfen. Begrenzt. ──
function verteiler(max){max=max||MAX_SCHLANGE;var schlange=[],fertig={},version=1,nFertig=0;
 return{
  auf:function(a){if(a.version!==version)return false;if(schlange.length>=max)return false;
   var i=schlange.length;while(i>0&&(schlange[i-1].vorrang<a.vorrang||(schlange[i-1].vorrang===a.vorrang&&schlange[i-1].nr>a.nr)))i--;schlange.splice(i,0,a);return true},
  naechster:function(){return schlange.length?schlange.shift():null},
  ergebnis:function(nr,v,wert){if(v!==version||fertig[nr]!==undefined)return false;fertig[nr]=wert;nFertig++;return true},
  hat:function(nr){return fertig[nr]!==undefined},
  nimm:function(nr){var w=fertig[nr];delete fertig[nr];nFertig--;return w},
  wartet:function(nr){for(var i=0;i<schlange.length;i++)if(schlange[i].nr===nr)return schlange.splice(i,1)[0];return null},
  verwerfen:function(neueVersion){version=neueVersion;schlange=[];fertig={};nFertig=0},
  version:function(){return version},laenge:function(){return schlange.length},fertige:function(){return nFertig},max:max}}

var K={WAR_ARTEN:WAR_ARTEN,BAU_ARTEN:BAU_ARTEN,WEG_ARTEN:WEG_ARTEN,RW_ARTEN:RW_ARTEN,WS_ARTEN:WS_ARTEN,WG_AUFTRAG:WG_AUFTRAG,TICKS:TICKS,STROEME:STROEME,MAX_LAST:MAX_LAST,MAX_WARTE:MAX_WARTE,FELD:FELD,RAND:RAND,FERN:FERN,JE_TICK:JE_TICK,FRIST:FRIST,MAX_SCHLANGE:MAX_SCHLANGE,
 neu:neu,zufall:zufall,zufallBis:zufallBis,befehl:befehl,anwenden:anwenden,faellig:faellig,auftragRechnen:auftragRechnen,schritt:schritt,abdruck:abdruck,
 verteiler:verteiler,stand:stand,ausStand:ausStand,STAND:STAND};
if(typeof module!=='undefined'&&module.exports)module.exports=K;else root.AT3KERN=K;
})(typeof self!=='undefined'?self:this);
