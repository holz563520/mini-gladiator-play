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
 var pruef=b&&(ARTEN[b.art]||(RW_ARTEN[b.art]&&RW()&&RW().ARTEN[b.art])||(WS_ARTEN[b.art]&&WS()&&WS().ARTEN[b.art]));
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
  else if(WS_ARTEN[b.art])WS().befehl(z,b.art,b.wert);
  else RW().befehl(z,b.art,b.wert);
  z.angewandt++}
 return jetzt.length}
function lastSetzen(z,n){var alt=z.e,vor=alt.length/5,e=new Int32Array(n*5);e.set(n<vor?alt.subarray(0,n*5):alt);
 for(var i=vor;i<n;i++){var p=i*5;e[p]=zufallBis(z,0,RAND);e[p+1]=zufallBis(z,0,RAND);e[p+2]=zufallBis(z,0,RAND);e[p+3]=zufallBis(z,0,RAND);e[p+4]=zufall(z,0)|0}
 z.e=e;z.last=n}

// ── Helferaufträge ──
// Fällige Aufträge dieses Ticks (Nummern). Der Weltkern rechnet den Tick erst, wenn alle Ergebnisse da sind.
function faellig(z){var L=[];for(var i=0;i<z.offen.length;i++){if(z.offen[i].faellig>z.tick)break;L.push(z.offen[i].nr)}return L}
// Rechnung eines Auftrags (läuft im Helfer oder, ohne Helfer, im Weltkern). Nur ganze Zahlen.
function auftragRechnen(a){if(WG_AUFTRAG[a.art])return WG().rechnen(a);if(a.art!=='probe')return RW().rechnen(a);var v=(a.ein^0x5bd1e995)>>>0||1;for(var i=0;i<a.runden;i++)v=dreh(v);return v|0}

// ── Ein Tick. holen(nr) liefert das Ergebnis eines fälligen Auftrags. Gibt die neu vergebenen Aufträge zurück. ──
function schritt(z,holen){
 anwenden(z);
 var i,o=z.offen,n=0;
 while(n<o.length&&o[n].faellig<=z.tick){if(WG_AUFTRAG[o[n].art])WS().uebernehmen(z,o[n],holen(o[n].nr));else if(o[n].art)RW().uebernehmen(z,o[n],holen(o[n].nr));else z.fern[o[n].region]=holen(o[n].nr)|0;n++}     // feste Reihenfolge: Auftragsnummer
 if(n)o.splice(0,n);
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
 z.tick++;return neuL}

// ── Fingerabdruck: Prüfsumme über den ganzen Zustand ──
function abdruck(z){var h=0x811c9dc5,i;function f(v){h=Math.imul(h^(v&255),0x01000193);h=Math.imul(h^((v>>>8)&255),0x01000193);h=Math.imul(h^((v>>>16)&255),0x01000193);h=Math.imul(h^(v>>>24),0x01000193)}
 f(z.seed);f(z.tick);f(z.tempo);f(z.last);f(z.auftragNr);
 for(i=0;i<z.zufall.length;i++)f(z.zufall[i]);for(i=0;i<z.fern.length;i++)f(z.fern[i]);
 var e=z.e,n=z.last*5;for(i=0;i<n;i++)f(e[i]);
 if(z.rw)RW().abdruck(z.rw,f);
 if(z.wg)WS().abdruck(z.wg,f);
 return('0000000'+(h>>>0).toString(16)).slice(-8)}

// ── Spielstand (G3): Zustand an einer Tickgrenze als einfache Zahlenlisten (JSON-tauglich) und zurück ──
// Gesichert wird alles, was der Fingerabdruck sieht, dazu wartende Befehle und offene Probeaufträge (die werden nach dem Laden neu vergeben,
// gleiche Nummer, gleicher Eingang, gleicher Fälligkeits-Tick: darum ist der Fingerabdruck nach dem Laden exakt gleich).
// Riesenwelt-Probe (rw) gehört nicht zum Spiel. Weltgenerator (wg, seit G4a im Spiel): gesichert werden Seed, Dichte, Blick und die Zählwerte (weltstrom.js stand),
// Erde und Kartenstücke entstehen beim Laden neu aus dem Seed. stand.ganz=false meldet, dass etwas davon nicht exakt gesichert ist.
var STAND=1;
function stand(z){var off=[],ganz=!z.rw,i;
 for(i=0;i<z.offen.length;i++){var o=z.offen[i];if(o.art){if(o.art!=='gelaende'||!z.wg)ganz=false;continue}off.push([o.nr,o.region,o.faellig,o.ein|0,o.runden|0])}
 if(z.wg&&!WS().exakt(z.wg))ganz=false;
 return{format:STAND,ganz:ganz,seed:z.seed>>>0,tick:z.tick,tempo:z.tempo,last:z.last,auftragNr:z.auftragNr,angewandt:z.angewandt,
  zufall:Array.from(z.zufall),fern:Array.from(z.fern),e:Array.from(z.e),offen:off,
  warte:z.warte.map(function(b){return[b.nr,b.tick,b.art,b.wert]}),
  welt:z.wg?WS().stand(z.wg,z):null}}
// Prüft streng (fremde oder kaputte Stände werden abgelehnt, nicht halb geladen). Gibt {z, auftraege} oder {fehler} zurück.
function ausStand(d,version){
 function ganzZ(v,min,max){return typeof v==='number'&&v===Math.floor(v)&&v>=min&&v<=max}
 function liste(L,n,pruef){if(!Array.isArray(L)||(n>=0&&L.length!==n))return false;for(var i=0;i<L.length;i++)if(!pruef(L[i]))return false;return true}
 var I32=function(v){return ganzZ(v,-2147483648,2147483647)},U32=function(v){return ganzZ(v,0,4294967295)},MAXT=2147483647;
 if(!d||d.format!==STAND)return{fehler:'unbekanntes Format'};
 if(!U32(d.seed)||!ganzZ(d.tick,0,MAXT)||!ARTEN.tempo(d.tempo)||!ARTEN.last(d.last)||!ganzZ(d.auftragNr,0,MAXT)||!ganzZ(d.angewandt,0,MAXT))return{fehler:'Kopfwerte'};
 if(!liste(d.zufall,STROEME.length,function(v){return U32(v)&&v>0})||!liste(d.fern,FERN,I32)||!liste(d.e,d.last*5,I32))return{fehler:'Zahlenfelder'};
 if(!liste(d.offen,-1,function(o){return Array.isArray(o)&&o.length===5&&ganzZ(o[0],0,d.auftragNr-1)&&ganzZ(o[1],0,FERN-1)&&ganzZ(o[2],0,MAXT)&&I32(o[3])&&ganzZ(o[4],0,MAXT)})||d.offen.length>MAX_SCHLANGE)return{fehler:'offene Aufträge'};
 if(!liste(d.warte,-1,function(b){return Array.isArray(b)&&b.length===4&&ARTEN[b[2]]&&ARTEN[b[2]](b[3])&&ganzZ(b[0],0,MAXT)&&ganzZ(b[1],0,MAXT)})||d.warte.length>MAX_WARTE)return{fehler:'wartende Befehle'};
 var z=neu(d.seed,version);
 z.tick=d.tick;z.tempo=d.tempo;z.last=d.last;z.auftragNr=d.auftragNr;z.angewandt=d.angewandt;
 z.zufall=Uint32Array.from(d.zufall);z.fern=Int32Array.from(d.fern);z.e=Int32Array.from(d.e);
 z.warte=d.warte.map(function(b){return{nr:b[0],tick:b[1],art:b[2],wert:b[3]}});
 var auftraege=[];z.offen=d.offen.map(function(o){
  auftraege.push({nr:o[0],version:z.version,vorrang:0,art:'probe',region:o[1],ein:o[3],runden:o[4],faellig:o[2]});
  return{nr:o[0],region:o[1],faellig:o[2],ein:o[3],runden:o[4]}});
 return{z:z,auftraege:auftraege,welt:d.welt||null}}

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

var K={RW_ARTEN:RW_ARTEN,WS_ARTEN:WS_ARTEN,WG_AUFTRAG:WG_AUFTRAG,TICKS:TICKS,STROEME:STROEME,MAX_LAST:MAX_LAST,MAX_WARTE:MAX_WARTE,FELD:FELD,RAND:RAND,FERN:FERN,JE_TICK:JE_TICK,FRIST:FRIST,MAX_SCHLANGE:MAX_SCHLANGE,
 neu:neu,zufall:zufall,zufallBis:zufallBis,befehl:befehl,anwenden:anwenden,faellig:faellig,auftragRechnen:auftragRechnen,schritt:schritt,abdruck:abdruck,
 verteiler:verteiler,stand:stand,ausStand:ausStand,STAND:STAND};
if(typeof module!=='undefined'&&module.exports)module.exports=K;else root.AT3KERN=K;
})(typeof self!=='undefined'?self:this);
