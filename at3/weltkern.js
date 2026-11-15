// WAS DIE DATEI TUT: Weltkern von Arena Theory 3.0 (Schritt G2). Ein eigener Hintergrundkern, dem der Spielzustand allein gehört. Taktet sich selbst
// (20 Ticks je Sekunde mal Tempo), nimmt Befehle an, verteilt Aufträge an die Helferkerne und schickt dem Hauptkern je Tick ein kleines Zahlenfeld.
// Kerne: läuft nur als Hintergrundkern (Worker), gestartet von kernstart.js. Lädt nur kern.js. Der Hauptkern rechnet nichts davon.
// Regeln: kein stilles Vorspulen (bei Überlast läuft die Uhr langsamer und meldet es), Seite im Hintergrund = Welt pausiert,
// Ergebnisse der Helfer werden an festen Ticks übernommen (fehlt eines, wartet die Welt), ohne Helfer rechnet der Weltkern die Aufträge selbst
// in kleinen Scheiben. Zahlenfelder werden übergeben statt kopiert und wiederverwendet. Warteschlangen sind begrenzt.
'use strict';
importScripts('kern.js'+self.location.search);
var K=self.AT3KERN, KOPF=16, SICHT=256, MAXNACH=3, SCHEIBE=30;
var z=K.neu(1), V=K.verteiler(), helfer=[], puffer=[], sichtbar=true, laeuft=false, modus='halt', timer=null, letzt=0, schuld=0;
var verloren=0, gesamt=0, wartet=false, selbst=0, fremd=0, ueber=false, lauf=null, neuesBild=true;
var ring=new Float32Array(256), ringN=0, p95Us=0, mittelUs=0, letzteUs=0;
for(var i=0;i<3;i++)puffer.push(new Int32Array(KOPF+2*SICHT));

function plane(ms){if(timer==null)timer=setTimeout(function(){timer=null;takt()},ms)}
function version(){if(z.version!==V.version())V.verwerfen(z.version)}
function verteilen(){for(var i=0;i<helfer.length;i++){if(!helfer[i].frei)continue;var a=V.naechster();if(!a)return;helfer[i].frei=false;helfer[i].port.postMessage(a)}}
function selbstRechnen(a){V.ergebnis(a.nr,a.version,K.auftragRechnen(a));selbst++}
function bereit(){var L=K.faellig(z);for(var i=0;i<L.length;i++){if(V.hat(L[i]))continue;if(helfer.length)return false;var a=V.wartet(L[i]);if(a)selbstRechnen(a)}return true}
function statistik(us){letzteUs=us;ring[ringN++&255]=us;if(ringN%20)return;var n=Math.min(ringN,256),s=Array.prototype.slice.call(ring,0,n).sort(function(a,b){return a-b}),t=0;
 for(var i=0;i<n;i++)t+=s[i];p95Us=s[Math.min(n-1,Math.floor(n*.95))];mittelUs=t/n}
function einTick(){K.anwenden(z);version();if(!bereit()){wartet=true;return false}wartet=false;
 var t=performance.now(),neu=K.schritt(z,V.nimm);version();for(var i=0;i<neu.length;i++)V.auf(neu[i]);
 statistik((performance.now()-t)*1000);gesamt++;neuesBild=true;verteilen();return true}

function senden(){if(!neuesBild||!puffer.length)return;neuesBild=false;var b=puffer.pop(),n=Math.min(z.last,SICHT),e=z.e;
 b[0]=z.tick;b[1]=z.tempo;b[2]=letzteUs;b[3]=z.last;b[4]=helfer.length;b[5]=verloren;b[6]=wartet?1:0;b[7]=z.version;b[8]=n;b[9]=z.offen.length;
 b[10]=gesamt;b[11]=ueber?1:0;b[12]=selbst;b[13]=fremd;b[14]=p95Us;b[15]=mittelUs;
 for(var i=0;i<n;i++){b[KOPF+2*i]=e[i*5];b[KOPF+2*i+1]=e[i*5+1]}
 self.postMessage({art:'bild',buf:b},[b.buffer])}

function takt(){if(modus==='lauf'){laufen();return}
 var jetzt=performance.now(),dt=jetzt-letzt;letzt=jetzt;
 if(!laeuft||!sichtbar||z.tempo===0){schuld=0;ueber=false;senden();return}       // Pause: kein Zeitgeber, weiter erst nach Befehl
 schuld+=dt*z.tempo*K.TICKS/1000;
 if(schuld>MAXNACH){verloren+=Math.floor(schuld-MAXNACH);schuld=MAXNACH;ueber=true}
 var ende=jetzt+SCHEIBE;
 while(schuld>=1){if(!einTick())break;schuld-=1;if(performance.now()>ende)break}
 if(schuld<1)ueber=false;
 senden();
 if(wartet)return;                                                              // ein Helferergebnis weckt den Takt
 if(!helfer.length&&schuld<1){var a=V.naechster();if(a)selbstRechnen(a)}        // ohne Helfer: Aufträge in freien Scheiben vorrechnen
 plane(schuld>=1?0:Math.max(1,(1-schuld)*1000/(z.tempo*K.TICKS)))}

// Fester Ablauf für die Kernprobe: so schnell wie möglich, Befehle an festen Laufschritten, am Ende der Fingerabdruck.
function laufen(){var L=lauf,ende=performance.now()+SCHEIBE;
 while(L.s<L.bis){
  while(L.i<L.befehle.length&&L.befehle[L.i].tick<=L.s){var b=L.befehle[L.i++];K.befehl(z,{nr:L.nr++,art:b.art,wert:b.wert})}
  if(!einTick())return;L.s++;
  if(performance.now()>ende){plane(0);return}}
 modus='halt';lauf=null;
 self.postMessage({art:'laufFertig',id:L.id,abdruck:K.abdruck(z),ms:performance.now()-L.t0,ticks:L.s,tick:z.tick,selbst:selbst,fremd:fremd,helfer:helfer.length})}

function vonHelfer(h){return function(e){var d=e.data;h.frei=true;fremd++;V.ergebnis(d.nr,d.version,d.wert);verteilen();
 if(wartet){if(modus==='lauf')laufen();else{if(timer!=null){clearTimeout(timer);timer=null}takt()}}}}

self.onmessage=function(e){var d=e.data;
 if(d.art==='start'){(d.ports||[]).forEach(function(p){var h={port:p,frei:true};p.onmessage=vonHelfer(h);helfer.push(h)});
  z=K.neu(d.seed>>>0,V.version()+1);version();selbst=fremd=verloren=gesamt=0;schuld=0;laeuft=true;modus='takt';letzt=performance.now();neuesBild=true;
  self.postMessage({art:'bereit',helfer:helfer.length});plane(0)}
 else if(d.art==='befehl'){var f=K.befehl(z,{nr:d.nr,art:d.befehl,wert:d.wert});
  if(f){self.postMessage({art:'abgelehnt',nr:d.nr,grund:f});return}
  if(modus==='takt'&&(z.tempo===0||!sichtbar)){K.anwenden(z);version();neuesBild=true;letzt=performance.now();senden();if(z.tempo>0&&sichtbar)plane(0)}}
 else if(d.art==='puffer'){if(puffer.length<3)puffer.push(d.buf);if(neuesBild&&modus==='takt')senden()}
 else if(d.art==='sichtbar'){sichtbar=!!d.an;letzt=performance.now();schuld=0;if(sichtbar&&modus==='takt')plane(0)}
 else if(d.art==='abdruck'){self.postMessage({art:'abdruck',id:d.id,wert:K.abdruck(z),tick:z.tick,version:z.version})}
 else if(d.art==='lauf'){if(timer!=null){clearTimeout(timer);timer=null}z=K.neu(d.seed>>>0,V.version()+1);version();selbst=fremd=0;wartet=false;
  lauf={id:d.id,befehle:d.befehle.slice().sort(function(a,b){return a.tick-b.tick}),bis:d.bis,i:0,s:0,nr:0,t0:performance.now()};modus='lauf';laufen()}
 else if(d.art==='testAusfall'){throw new Error('Probe-Ausfall im Weltkern')}};
