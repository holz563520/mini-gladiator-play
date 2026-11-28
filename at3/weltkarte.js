// WAS DIE DATEI TUT: Kartenansicht von Arena Theory 3.0 (Schritt G4a): Kamera, Wischen, Zoom in vier festen Stufen (1×, ½, ¼, ⅛) und das Zeichnen der fertigen
// Bodenbilder. Die Bilder rechnet der Bildkern (bildkern.js + bodenbild.js) aus Kartenstücken, die er aus Seed und Erde selbst erzeugt; der Hauptkern reicht nur
// das Erdraster weiter, fragt Bilder an und kopiert sie ins Bild (Regel 13). Gezeichnet wird nur, wenn sich etwas geändert hat.
// Zeichenregeln (Regel 20): höchstens ANFRAGEN Bilder zugleich in Arbeit, Sichtbares zuerst (Mitte vor Rand); was fehlt, zeigt ein Ersatzbild (Bild der Nachbarstufe
// vergrößert oder verkleinert, sonst eine graue Raute), nie eine Lücke; beim Zoomen wird nichts Neues angefangen (erst wenn die Hand ruht); in Ruhe wird die
// Nachbarstufe vorbereitet. Bildspeicher nach echten Bytes begrenzt (SPEICHER), am längsten Ungenutztes fliegt zuerst.
// Riesenwelt (Regel 14): Kosten hängen nur vom Bildausschnitt ab; bekannt sind immer nur die 7 × 7 Kartenstücke um den Blick (Befehl blick an den Weltkern für
// die Spielwelt, an den Bildkern für die Ansicht).
// Höhe: Die Kamera folgt weich der Geländehöhe unter der Bildmitte; „was ist im Bild“ rechnet mit kleinster und größter Stufe je Block (Auskunft des Bildkerns).
// G4b: Natur steckt schon in den Bodenbildern (vom Bildkern gebacken); hier nur die größeren Bildränder beim „was ist im Bild“ und das Weiterreichen der Bilder.
// FP1: Solange First Person läuft (Karte versteckt), wird nichts gezeichnet und nichts angefragt; frage('fp') holt den Ausschnitt beim Bildkern.
// G4c: neue Welt ohne Kameraort → statt automatischem Start ruft die Karte o.beiErde() (Startplatz-Wahl, startwahl.js); frage() reicht deren Fragen an den Bildkern.
// N4c1: reiche(an) schaltet die Reiche in den Fernbildern um (nur Fernbilder und Globus werden neu gemalt); Antippen in der Fernansicht fragt den Bildkern,
// wem das Land gehört, und meldet es an o.beiReich (N5d: mit der Straße unter dem Finger).
// W1c Runde Welt: Die Kamera läuft in x um (cam.x immer 0..WX−1). Gezeichnet wird jedes Kartenstück in der Lage relativ zur Kamera (Stückspalte um ganze
// Weltbreiten verschoben), darum springt beim Wischen über die Naht nichts. Bildschlüssel und Anfragen bleiben auf die Welt bezogen (ein Bild je Ort, nichts
// doppelt im Bildspeicher). In y hält die Kamera POL Felder vor dem Polrand an: man sieht nie über den Weltrand hinaus.
// G4d Zoom bis zum Globus: nach ⅛ weitere Fernstufen ⅟16 … ⅟4096 (lod 4 bis MAXL = 12), gemalt vom Bildkern nur aus dem Erdraster (fernbild.js, nie aus
// Kartenstücken), gleiche Bildschlüssel, gleicher Bildspeicher, gleiches Ersatzbild aus der Nachbarstufe. In den Fernstufen ruht das Fenster der Kartenstücke
// (kein blick an Welt- und Bildkern, die Kamera sinkt weich auf Meereshöhe); zurück in ⅛ zeigt das Fernbild ⅟16 als Untergrund, bis die Stücke da sind.
// Nach ⅟4096 der Globus (Norden oben): Stufen mit halbem Halbmesser bis die ganze Kugel passt; Wischen dreht, Kneifen/Knöpfe zoomen zurück in die Karte (⅟4096 an
// der Mitte der Kugel), Antippen springt in ⅛ an die Stelle. Der Globus wird im Bildkern gerechnet (halbe Auflösung), hier nur das letzte Bild kopiert.
// G4d Startplatz-Wahl (Wunsch Thomas): wahlStart() beginnt beim ganzen Globus, voller Zoom wie im Spiel; Antippen meldet auf jeder Stufe (auch auf dem Globus) das Feld
// der Welt an die Wahl (statt zu springen), marke() malt das Kreuz auf Karte und Globus, zeigeAuf() schaut auf einen Platz. Während der Wahl gibt kam() null (nichts gespeichert).
// G5b Gebäude: beiBau() bekommt die geänderten Bau-Kartenstücke vom Weltkern, reicht sie dem Bildkern weiter (der sie in die Bodenbilder backt) und behält nur die
// Raumnummern (für „welcher Raum ist wo“). Betroffene Bilder bleiben stehen, bis das neue Bild da ist (alt), kein Flackern. Dach wie in 2.0 (welt-gebaeude.js):
// nur in 1× offen, für den Raum in der Bildmitte, unter der Maus und angetippte (Antippen schaltet um); weiter draußen alle zu. Offene Räume stecken im
// Bildschlüssel (…|o3,7), so liegen offenes und geschlossenes Bild im selben Bildspeicher; bis das offene da ist, zeigt die Karte das geschlossene.
// werkzeug(): Bau-Werkzeug (Rechteck ziehen wie 2.0 welt-bau.js): ein Finger zieht das Rechteck, zwei Finger verschieben und zoomen, Vorschau als Raute.
// Wiederverwendet: Vorgehen von welt-raster.js/welt-gross.js aus 2.0 (Bodenkacheln mit Zeitanteil, Nachbarstufe, begrenzter Bildcache), Palette aus at3-64.js.
(function(){
'use strict';
// G6c Karren: karren(d) bekommt nach jedem Takt des Weltkerns die Karren (je 6 Zahlen: Nummer, Lage in 1/256 Feld, Richtung, Zustand, Grund). Gezeichnet wird
// nur, wer im Bild ist, als vorgezeichnetes Bild des Startsets (karren-ochse, 4 Kartenrichtungen, Ersatzbild grau), gleitend zwischen zwei Nachrichten; solange
// ein sichtbarer Karren fährt, zeichnet die Karte jedes Bild neu (sonst nur bei Änderung). Kein Bodenbild wird dafür neu gerechnet, beim Zoomen keine neue Arbeit.
var V='6e484516', BASIS=(document.currentScript&&document.currentScript.src||'').replace(/[^/]*$/,'');
var N7B2=!/[?&]n7b2=0/.test(location.search);
// N7h1 Weltansicht schärfer (Thomas 24.11.2026): In den Fernstufen steht sofort das grobe Bild. Ruht der Blick VERWEILEN_MS, rechnet der Bildkern die scharfen
// Fassungen der sichtbaren Fernbilder (Bildmitte zuerst, fernbild.js scharf) und die Karte blendet jede in EINBLENDEN_MS ein. Fertige scharfe Bilder bleiben
// gemerkt (eigener Speicher SCH_SPEICHER, am längsten Ungenutztes fliegt zuerst), beim Zurückzoomen oder Verschieben wird nichts neu gerechnet. Bewegt sich der
// Blick, bekommt der Bildkern eine leere Liste und bricht ab. Hauptkern: nur Liste schicken und Bilder kopieren. Notausschalter ?n7h=0 (nur grobes Bild).
// N7h3 Globus schärfer (28.11.2026): auf dem Globus nach VERWEILEN_MS „gscharf“ an den Bildkern (Ansicht, Verkleinerung halb so stark wie grob), der schickt den
// Globus aus der feinen Erdtextur zurück, Einblenden in EINBLENDEN_MS. Neue Ansicht bricht ab. Notausschalter ?n7h3=0 (oder ?n7h=0): grober Globus wie vorher.
var N7H3=!/[?&]n7h3?=0/.test(location.search), G_PUNKTE=800000;
var N7H=!/[?&]n7h=0/.test(location.search), VERWEILEN_MS=600, EINBLENDEN_MS=900, SCH_SPEICHER=24*1048576;   // N7b2: Stadtkarte beim Antippen (Notausschalter ?n7b2=0)
var ST=64, SX=9600, SY=4800, WX=ST*SX, WY=ST*SY, POL=4*ST, HALB=3, TEIL=8, STUFEN=4, MAXL=12, ANFRAGEN=4, SPEICHER=48*1048576, MAXB=1300, MAXH=900, RUHE_MS=220, FEHLT_MS=800;
var ERSATZ='#3e3934', NACHT='#0e0c0b';
// N7a3c2 Ortsnamen (Thomas 25.11.2026): Staffel nach Ortsgröße g (2 Weiler … 7 Hauptstadt) je Stufe lod 4–9, Zusatz bis lod 5, Schriftgröße je g; Notausschalter ?n7a3c2=0
var N7A3C2=!/[?&]n7a3c2=0/.test(location.search||''), NAMEN_G=[0,0,0,0,2,3,4,4,6,6,6,6], NAMEN_BIS=11, NAMEN_ZUS=5, NAMEN_MAX=8192, NAMEN_PX=[15,15,15,16,17,18,21,24]; var NAMEN_ANTEIL=4;   // ms je Bild fürs Vorzeichnen neuer Namen (Regel 20), der Rest folgt im nächsten Bild
var NF={papier:'#d8c499',papier2:'#b49c6c',rand:'#412614',tinte:'#24140a',tinte2:'#5f3d23',blut:'#5d0b07'};
var NFARB=(function(){var P=typeof window!=='undefined'&&window.AT3_64,L=[];for(var k in NF){var v=parseInt(NF[k].slice(1),16),r=v>>16,gg=(v>>8)&255,bb=v&255;
 if(P){var f=P.farbe(P.PALETTEN[P.PALETTE].farben[P.naechste(r,gg,bb,P.PALETTE)]);r=f[0];gg=f[1];bb=f[2];NF[k]='rgb('+r+','+gg+','+bb+')'}L.push(r,gg,bb)}return L})();   // Farben = nächste der AT3-Palette
var N7A5A0=!/[?&]n7a5a0=0/.test(location.search||'');   // N7a5a0 Wasser waagrecht (ufer.js im Bildkern)
var GW_ZELLEN=600, RO=112, RS=16, RG0=GW_ZELLEN*8/(2*Math.PI), ZP=2*Math.PI;   // G4d: Globus-Halbmesser der ersten Stufe (eine Erdzelle = 8 Bildpunkte am Äquator)   // G4b: größte Überstände der Naturbilder über ihr Feld (Stufe 1×, wie RAND_OBEN/RAND_SEITE in natur.js), damit Baumkronen am Bildrand nicht fehlen

function starten(o){
 var cv=o.cv, g=cv.getContext('2d'), S=o.S, kern=o.kern, bk=null, tot=false;
 function umX(x){x%=WX;return x<0?x+WX:x}
 function halteY(y){return Math.max(POL,Math.min(WY-POL-.01,y))}
 function ab(a,b){var d=Math.abs(a-b);return d>SX-d?SX-d:d}                     // Abstand zweier Stückspalten über die Naht
 function modu(a,m){a%=m;return a<0?a+m:a}
 var gsch=null, gsKey='', gsSeit=0, gsWeg='';   // N7h3: scharfer Globus {c,w,h,s,R,key,t}, Ansicht seit, geschickter Wunsch
 var glob=null, gimg=null, gimgKey='', globOffen=false, wahl=null, marke=null;   // G4d: Globus {g Stufe, lon, lat} (null = Karte), letztes Bild
 var cam={x:WX/2,y:WY/2,z:0,lod:0,nah:false}, hatKam=false, zFest=false, gen=-1, seed=0, blickK=-1;
 var BAUM=new Map(), TR=new Map(), altB=new Set(), fest=new Set(), OFFEN=[], offenS='', hoverR=0, WZ=null, wzRahmen=null, BV=0, stV=new Map();   // G5b
 var okern=null, fragen={}, frageNr=0, NV=0, bekannt=new Map(), bilder=new Map(), offen=new Map(), fehlt=new Map(), bytes=0, bildNr=0, geplant=false, zoomZeit=0, feldNr=0, feldOk={};
 var M={festMs:0,maxFestMs:0,festVorMs:{},globus:-1,globusUs:0,globusN:0,bilder:0,bytes:0,maxBytes:0,gerechnet:0,rechenUs:0,maxRechenUs:0,zeichnen:0,zeichenMs:0,maxZeichenMs:0,sichtbar:0,ersatz:0,fertig:false,stuecke:0,anfragen:0,verdraengt:0,bmp:null,natur:0,rechenL:[],rechenN:0,naturArten:0,naturErsatz:0,bau:0,bauStuecke:0,bauArten:0,bauErsatz:0,veraltet:0,offen:[]};
 if(o.kam&&o.kam.length===3&&o.kam[0]>=0&&o.kam[0]<WX&&o.kam[1]>=0&&o.kam[1]<WY){cam.x=o.kam[0];cam.y=halteY(o.kam[1]);cam.lod=Math.max(0,Math.min(MAXL,o.kam[2]|0));hatKam=true}

 function ende(g2){if(tot)return;tot=true;try{bk&&bk.terminate()}catch(e){}bk=null;if(okern&&kern&&kern.ortskernWeg)kern.ortskernWeg();try{okern&&okern.terminate()}catch(e){}okern=null;if(o.beiAusfall)o.beiAusfall(g2)}
 try{bk=new Worker(BASIS+'bildkern.js?v='+V+(location.search.match(/[?&](n2[bcd]|n4b|n5d|n7a2[a-z0-9]*|n7a3[a-z0-9]*|n7a5a[0-9][a-z]?|n7a5b[0-9]|n7a5d|n7a5e2?|n7a5f|n7b1|n7b2|n7b3|n7h2)=0/g)||[]).join('').replace(/\?/g,'&'))}catch(e){setTimeout(function(){ende('no picture core')},0)}
 if(bk){bk.onerror=function(e){if(e&&e.preventDefault)e.preventDefault();ende('picture core failed')};bk.onmessage=vomBildkern;
  var F=S.PALETTEN[S.PALETTE].farben,pal=new Uint32Array(64),du=new Uint8Array(64),he=new Uint8Array(64);
  for(var i=0;i<64;i++){var c=S.farbe(F[i]);pal[i]=(255<<24|c[2]<<16|c[1]<<8|c[0])>>>0;du[i]=S.dunkler(i);he[i]=i}
  for(var r=0;r<S.REIHEN.length;r++)for(var k=0;k<S.REIHEN[r].n-1;k++)he[S.START[r]+k]=S.START[r]+k+1;
  bk.postMessage({art:'init',pal:pal,du:du,he:he});
  // N7a5a2: Notausschalter der Wasserschritte (?n7a5a0/1/2=0, N7a5a2b: ?n7a5a2b=0) gehen an den Ortskern mit.
  // N7a2a: Ortskern (ortskern.js) = eigener Hintergrundkern für die Ortspläne, spricht über einen MessageChannel direkt mit dem Bildkern.
  // Fehlt er (kein Worker, Fehler), plant der Bildkern eingebettet in seinen Pausen (Regel 13). Notausschalter ?n7a2=0 (dann keine Ortsflächen), ?n7a2k=0 nur ohne eigenen Ortskern (Probe für Regel 13).
  if(!/[?&]n7a2k?=0/.test(location.search)&&typeof MessageChannel!=='undefined'){try{okern=new Worker(BASIS+'ortskern.js?v='+V+['n7a5a0','n7a5a1','n7a5a2','n7a5a2b','n7a5a3a','n7a5a3b','n7a5a3b2','n7a5a3c1','n7a5a3c2','n7a5b1','n7a5e','n7a5e2','n7a5f'].map(function(x){return new RegExp('[?&]'+x+'=0').test(location.search)?'&'+x+'=0':''}).join(''));var mc=new MessageChannel();
    okern.postMessage({art:'port',port:mc.port1},[mc.port1]);bk.postMessage({art:'ortskern',port:mc.port2},[mc.port2]);
    // N7a4a2: zweiter Kanal vom Ortskern zum Weltkern (Sperrkarten für die Wegsuche)
    if(kern&&kern.ortskern){var mw=new MessageChannel();okern.postMessage({art:'portWelt',port:mw.port1},[mw.port1]);kern.ortskern(mw.port2)}
    okern.onerror=function(e){if(e&&e.preventDefault)e.preventDefault();try{okern.terminate()}catch(x){}okern=null;if(bk)bk.postMessage({art:'ortskernWeg'});if(kern&&kern.ortskernWeg)kern.ortskernWeg()}}catch(e){okern=null}}}
  if(!okern&&kern&&kern.ortskern)kern.ortskern(null);   // N7a4a2: kein eigener Ortskern → Weltkern rechnet die Sperrkarten eingebettet

 // ── Vom Weltkern (über kernstart.js beiWs): Erde und Kartenstücke weiterreichen ──
 function beiWs(d){if(tot||!bk)return;
  if(d.art==='wsErde'){gen=d.gen;seed=d.seed;bekannt.clear();bilderWeg();fehlt.clear();offen.clear();blickK=-1;M.stuecke=0;
   if(okern)okern.postMessage({art:'welt',gen:gen,seed:seed,buf:d.buf.slice()});   // N7a2a: eigene Kopie der Erde für den Ortskern
   bk.postMessage({art:'welt',gen:gen,seed:seed,buf:d.buf},[d.buf.buffer]);if(hatKam)blick();else if(o.waehlen){if(o.beiErde)o.beiErde()}else bk.postMessage({art:'start'});plan()}
  else if(d.art==='wsStueck')kern.wsZurueck(d.buf)}
 // N4c1: Knopf „Realms“: Bildkern umschalten, Fernbilder und Globus verwerfen (unterwegs mit alter NV fliegen weg), Nahbilder bleiben
 function reiche(an){if(!bk)return;bk.postMessage({art:'reiche',an:!!an});NV++;schWeg();bilder.forEach(function(b,k){if(b.lod>=STUFEN){if(b.bmp&&b.bmp.close)b.bmp.close();bytes-=b.bytes;bilder.delete(k);altB.delete(k)}});fehlt.clear();gimg=null;gimgKey='';gsch=null;gsKey=gsWeg='';plan()}
 function bilderWeg(){bilder.forEach(function(b){if(b.bmp&&b.bmp.close)b.bmp.close()});bilder.clear();altB.clear();bytes=0;schWeg()}
 // N7h1: scharfe Fernbilder (Schlüssel wie die groben)
 var schB=new Map(), schBytes=0, schSig='', schRuhe=0, schCam='';
 function schWeg(k){if(k!=null){var b=schB.get(k);if(b){if(b.bmp.close)b.bmp.close();schBytes-=b.bytes;schB.delete(k)}return}schB.forEach(function(b){if(b.bmp.close)b.bmp.close()});schB.clear();schBytes=0;schSig=''}
 function schListe(L){var sig=L.map(function(e){return e[0]}).join(';');if(sig===schSig)return;schSig=sig;if(bk)bk.postMessage({art:'scharf',gen:gen,nv:NV,liste:L})}
 function schNeu(d){if(d.nv!==NV||d.gen!==gen){if(d.bmp&&d.bmp.close)d.bmp.close();return}var b={bmp:d.bmp||null,w:d.w,h:d.h,ox:d.ox,oy:d.oy,lod:d.lod,x0:d.x0,y0:d.y0,nr:bildNr,bytes:d.w*d.h*4,t:performance.now()};
  if(!b.bmp){var c=document.createElement('canvas');c.width=d.w;c.height=d.h;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(d.buf.buffer),d.w,d.h),0,0);b.bmp=c}
  schWeg(d.key);schB.set(d.key,b);schBytes+=b.bytes;M.scharfN=(M.scharfN|0)+1;M.scharfMs=d.ms;if(d.ms>(M.maxScharfMs||0))M.maxScharfMs=d.ms;M.scharfSchritte=d.schritte;
  if(schBytes>SCH_SPEICHER){var L=[];schB.forEach(function(x,k){if(x.nr<bildNr-1)L.push([x.nr,k])});L.sort(function(a,c){return a[0]-c[0]});for(var i=0;i<L.length&&schBytes>SCH_SPEICHER*.8;i++){schWeg(L[i][1]);M.scharfRaus=(M.scharfRaus|0)+1}}
  M.scharfZahl=schB.size;M.scharfB=schBytes;schSig=schSig.split(';').filter(function(k){return k&&k!==d.key}).join(';');plan()}

 function vomBildkern(e){var d=e.data;
  if(d.art==='arten'){NARTEN=d.liste;BARTEN=d.bau||[];naturSenden();return}
  if(d.art==='antwort'){var a=fragen[d.id];delete fragen[d.id];if(a)a(d);return}
  if(d.art==='feld'){var f=feldOk[d.id];delete feldOk[d.id];if(f)f(d.feld);return}
  if(d.gen!==gen){if(d.bmp&&d.bmp.close)d.bmp.close();return}
  if(d.art==='kunde'){var mn=32767,mx=0;for(var i=0;i<128;i+=2){if(d.mm[i]<mn)mn=d.mm[i];if(d.mm[i+1]>mx)mx=d.mm[i+1]}
   if(ab(d.cx,cam.x>>6)>HALB||Math.abs(d.cy-(cam.y>>6))>HALB)return;
   bekannt.set(d.cx*8192+d.cy,{cx:d.cx,cy:d.cy,mm:d.mm,hg:d.hg,mn:mn,mx:mx});M.stuecke=bekannt.size;M.stueckUs=d.stUs;fehlt.clear();plan()}
  else if(d.art==='fernNeu'){if(d.gen!==gen)return;var FL=d.flaechen||[];M.minis=d.minis;M.miniB=d.miniB;M.miniMs=d.miniMs;M.miniRaus=d.miniRaus;M.fernNeu=(M.fernNeu|0)+FL.length;   // N7a3c1: Mini-Pläne da → Fernbilder ⅟16–⅟512 dort neu holen (altes bleibt stehen)
   bilder.forEach(function(b,key){if(b.lod<STUFEN||b.lod>9)return;var n=TEIL<<b.lod;for(var i=0;i<FL.length;i++){var f=FL[i],dx=modu(f[0]-b.x0,WX);
    if((dx<n||dx+f[2]>WX)&&f[1]<b.y0+n&&f[1]+f[2]>b.y0){altB.add(key);schWeg(key);break}}});plan()}
  else if(d.art==='ortNeu'){if(d.fpNeu&&window.AT3FP&&window.AT3FP.zustand().an)window.AT3FP.bauNeu();var S=new Set(d.stuecke||[]);   // N7b3: Stadtplan im First-Person-Ausschnitt angekommenS.forEach(function(k){stV.set(k,++BV)});   // N7a2a: Ortsfläche eingeebnet (oder Park gewinnt): Bilder dieser Stücke neu holen
   bilder.forEach(function(b,key){if(b.lod<STUFEN&&S.has(stk(b.x0,b.y0)))altB.add(key)});if(d.karteiB!=null){M.kartei=d.kartei;M.karteiB=d.karteiB;M.ortEMs=d.eMs}if(d.posten!=null){M.posten=d.posten;M.postenListen=d.postenListen;M.postenMs=d.postenMs}if(d.hausB!=null){M.haeuser=d.haeuser;M.hausB=d.hausB;M.hausMs=d.hausMs;M.listeMs=d.listeMs;M.hausPausen=d.hausPausen;M.listen=d.listen;M.halbN=d.halbN;M.halbB=d.halbB;M.halbMs=d.halbMs;M.fernN=d.fernN;M.fernB=d.fernB;M.fernMs=d.fernMs}if(d.name){M.orte=(M.orte||0)+1;M.ortMs=d.ms;if(d.ms>(M.ortMaxMs||0))M.ortMaxMs=d.ms;if(d.ersatz)M.ortErsatz=(M.ortErsatz||0)+1}plan()}
  else if(d.art==='start'){if(d.platz&&!hatKam){cam.x=umX(d.platz.x+.5);cam.y=halteY(d.platz.y+.5);hatKam=true;M.startOrt=d.platz.ort;blick();plan()}}
  else if(d.art==='scharf')schNeu(d);   // N7h1
  else if(d.art==='gscharf'){if(d.nv!==NV)return;if(gsWeg===d.key)gsWeg='';if(!glob||d.key!==gsKey)return;var c=document.createElement('canvas');c.width=d.w;c.height=d.h;   // N7h3
   c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(d.buf.buffer),d.w,d.h),0,0);gsch={c:c,w:d.w,h:d.h,s:d.s,R:d.R,key:d.key,t:performance.now()};gsWeg=d.key;
   M.gScharfN=(M.gScharfN|0)+1;M.gScharfMs=d.ms;if(d.ms>(M.maxGScharfMs||0))M.maxGScharfMs=d.ms;M.gKMs=d.kMs;M.gGMs=d.gMs;M.gNeu=d.neu;M.gSchritte=d.schritte;M.gKacheln=d.kacheln;M.gBytes=d.bytes;M.gRaus=d.raus;M.gK=d.k;M.gScharf=d.key;plan()}
  else if(d.art==='bild'){var gv=offen.get(d.key);offen.delete(d.key);if(d.nv!==NV){if(d.bmp&&d.bmp.close)d.bmp.close();plan();return}
   if(d.fehlt){fehlt.set(d.key,performance.now());plan();setTimeout(plan,FEHLT_MS+50);return}   // G4d: „fehlt“ verfällt nach FEHLT_MS (Bildkern hatte das Stück gerade verworfen; sonst hinge das Ersatzbild)
   var b={bmp:d.bmp||null,w:d.w,h:d.h,ox:d.ox,oy:d.oy,lod:d.lod,x0:d.x0,y0:d.y0,nr:bildNr,bytes:d.w*d.h*4};
   if(!b.bmp){var c=document.createElement('canvas');c.width=d.w;c.height=d.h;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(d.buf.buffer),d.w,d.h),0,0);b.bmp=c}
   M.bmp=!!d.bmp;M.natur+=d.natur||0;M.rechenL[M.rechenN++%200]=d.us;var alt=bilder.get(d.key);if(alt){bytes-=alt.bytes;if(alt.bmp.close)alt.bmp.close()}
   bilder.set(d.key,b);bytes+=b.bytes;if(d.lod<STUFEN&&(stV.get(stk(d.x0,d.y0))||0)>gv)altB.add(d.key);else altB.delete(d.key);M.bau+=d.bau||0;M.gerechnet++;M.rechenUs+=d.us;if(d.us>M.maxRechenUs)M.maxRechenUs=d.us;verdraengen();plan()}}
 function verdraengen(){if(bytes<=SPEICHER)return;var L=[];bilder.forEach(function(b,k){if(b.nr<bildNr-1)L.push([b.nr,k])});L.sort(function(a,b){return a[0]-b[0]});
  for(var i=0;i<L.length&&bytes>SPEICHER*.8;i++){var b=bilder.get(L[i][1]);bytes-=b.bytes;if(b.bmp.close)b.bmp.close();bilder.delete(L[i][1]);altB.delete(L[i][1]);M.verdraengt++}}

 // ── Blick: mittleres Kartenstück an den Weltkern, Stücke außerhalb des Fensters vergessen ──
 function blick(){if(glob||cam.lod>=STUFEN)return;var kx=cam.x>>6,ky=cam.y>>6,k=kx*8192+ky;if(k===blickK||gen<0)return;blickK=k;kern.befehl('blick',k);if(bk)bk.postMessage({art:'blick',kx:kx,ky:ky});
  bekannt.forEach(function(p,q){if(ab(p.cx,kx)>HALB||Math.abs(p.cy-ky)>HALB)bekannt.delete(q)});M.stuecke=bekannt.size;fehlt.clear()}
 function hoeheUnter(){var p=bekannt.get((cam.x>>6)*8192+(cam.y>>6));if(!p)return null;var u=(cam.x%ST)/8,v=(cam.y%ST)/8,i=Math.min(7,u|0),j=Math.min(7,v|0),a=u-i,b=v-j,h=p.hg;
  return(h[j*9+i]*(1-a)+h[j*9+i+1]*a)*(1-b)+(h[j*9+9+i]*(1-a)+h[j*9+10+i]*a)*b}

 // ── Was ist im Bild? Bodenbilder der Stufe lod, deren Rahmen (mit kleinster/größter Stufe) den Ausschnitt schneidet ──
 function sicht(lod,CX,CY,hb,hh,aus){var n=TEIL<<lod,q=1<<lod;aus.length=0;
  var kx=cam.x>>6;
  bekannt.forEach(function(p){var cu=p.cx+Math.round((kx-p.cx)/SX)*SX,X=(cu-p.cy)*ST*32,Y=(cu+p.cy)*ST*16;            // cu: Stückspalte in der Lage der Kamera (über die Naht)
   if(X+ST*32+RS<CX-hb||X-ST*32-RS>CX+hb||Y+ST*32-p.mn*8<CY-hh||Y-p.mx*8-RO>CY+hh)return;
   for(var by=0;by<8;by+=q)for(var bx=0;bx<8;bx+=q){var mn=32767,mx=0,m=p.mm;
    for(var j=by;j<by+q;j++)for(var i=bx;i<bx+q;i++){var e=(j*8+i)*2;if(m[e]<mn)mn=m[e];if(m[e+1]>mx)mx=m[e+1]}
    var x0=p.cx*ST+bx*8,xu=cu*ST+bx*8,y0=p.cy*ST+by*8,x=(xu-y0)*32,y=(xu+y0)*16;
    if(x+n*32+RS<CX-hb||x-n*32-RS>CX+hb||y+n*32-mn*8<CY-hh||y-mx*8-RO>CY+hh)continue;
    var rr=bx+q>=8,ru=by+q>=8,nx=modu(p.cx+1,SX),rand=(rr&&!bekannt.has(nx*8192+p.cy))||(ru&&!bekannt.has(p.cx*8192+p.cy+1))||(rr&&ru&&!bekannt.has(nx*8192+p.cy+1))||(N7A5A0&&(bx===0||by===0)&&randLO(p,bx===0,by===0));   // G4d: braucht ein Nachbarstück jenseits des Fensters
    var bk0=lod+':'+x0+':'+y0,of=lod?null:offenBei(x0,y0);aus.push({x0:x0,xu:xu,y0:y0,X:x,Y:y,key:of?bk0+'|o'+of.join(','):bk0,basis:bk0,offen:of,mn:mn,rand:rand,ab:Math.abs(x-CX)+2*Math.abs(y+n*16-((mn+mx)*4)-CY)})}});return aus}
 // G4d: Fernbilder der Stufe lod (≥ STUFEN), die den Ausschnitt schneiden: Raster aus (8 << lod)² Feldern in der Lage der Kamera, Schlüssel mit der Weltspalte
 function sichtFern(lod,CX,CY,hb,hh,aus){var n=TEIL<<lod;aus.length=0;
  var uA=Math.floor(((CX-hb)/64+(CY-hh)/32)/n)-1,uE=Math.floor(((CX+hb)/64+(CY+hh)/32)/n)+1,vA=Math.floor(((CY-hh)/32-(CX+hb)/64)/n)-1,vE=Math.floor(((CY+hh)/32-(CX-hb)/64)/n)+1;
  for(var tv=vA;tv<=vE;tv++){var y0=tv*n;if(y0<0||y0>=WY)continue;
   for(var tu=uA;tu<=uE;tu++){var xu=tu*n,X=(xu-y0)*32,Y=(xu+y0)*16;if(X+n*32<CX-hb||X-n*32>CX+hb||Y+n*32<CY-hh||Y>CY+hh)continue;var x0=umX(xu);
    aus.push({x0:x0,xu:xu,y0:y0,X:X,Y:Y,key:lod+':'+x0+':'+y0,mn:0,ab:Math.abs(X-CX)+2*Math.abs(Y+n*16-CY)})}}return aus}
 function randLO(p,l,o){var vx=modu(p.cx-1,SX);return(l&&!bekannt.has(vx*8192+p.cy))||(o&&p.cy>0&&!bekannt.has(p.cx*8192+p.cy-1))||(l&&o&&p.cy>0&&!bekannt.has(vx*8192+p.cy-1))}   // N7a5a0: Ecken am Wasser brauchen auch das Stück links und oben
 function sichtX(lod,CX,CY,hb,hh,aus){return lod>=STUFEN?sichtFern(lod,CX,CY,hb,hh,aus):sicht(lod,CX,CY,hb,hh,aus)}
 function anfragen(L,lod,max){L.sort(function(a,b){return a.ab-b.ab});for(var i=0;i<L.length&&offen.size<max;i++){var c=L[i];if(c.rand||(bilder.has(c.key)&&!altB.has(c.key))||offen.has(c.key)||(fehlt.has(c.key)&&performance.now()-fehlt.get(c.key)<FEHLT_MS))continue;
   offen.set(c.key,lod<STUFEN?(stV.get(stk(c.x0,c.y0))||0):0);M.anfragen++;bk.postMessage({art:'bild',gen:gen,nv:NV,key:c.key,x0:c.x0,y0:c.y0,lod:lod,offen:c.offen||null})}}

 var LISTE=[],NEBEN=[],GRUND=[],gemaltB=new Set();
 function mal(b,xu,CX,CY,Z,W,H){var s=b.lod===cam.lod&&!cam.nah?1:Math.pow(2,b.lod)/Z,x=((xu-b.y0)*32-CX)/Z+W/2-b.ox*s,y=((xu+b.y0)*16-CY)/Z+H/2-b.oy*s;   // xu: linke Ecke des Bildes in der Lage der Kamera
  g.drawImage(b.bmp,Math.round(x),Math.round(y),b.w*s,b.h*s);b.nr=bildNr}
 function zeichnen(){geplant=false;if(tot||cv.hidden)return;     // FP1: während First Person ist die Karte versteckt und zeichnet nichts
var t0=performance.now();
  var cw=cv.clientWidth||320,ch=cv.clientHeight||240,f=Math.max(1,Math.ceil(Math.max(cw/MAXB,ch/MAXH))),W=Math.round(cw/f),H=Math.round(ch/f);
  if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}
  g.imageSmoothingEnabled=false;g.fillStyle=NACHT;g.fillRect(0,0,W,H);bildNr++;
  if(glob){globusZeichnen(W,H,t0);return}
  var ziel=cam.lod>=STUFEN?0:hoeheUnter(),weiter=false;if(ziel!=null){if(!zFest){cam.z=ziel;zFest=true}else{var dz=ziel-cam.z;if(Math.abs(dz)<.05)cam.z=ziel;else{cam.z+=dz*.25;weiter=true}}}
  var lod=cam.lod,Z=zf(),CX=(cam.x-cam.y)*32,CY=(cam.x+cam.y)*16-cam.z*8,hb=W/2*Z,hh=H/2*Z,n=TEIL<<lod,i,c,b,ersatz=0;
  // G4d: in den Kartenstufen das Fernbild ⅟16 als Untergrund, solange Kartenstücke oder Bilder fehlen (nach einem Sprung vom Globus, nach dem Hereinzoomen)
  var grund=false;if(lod<STUFEN&&(bekannt.size<49||M.ersatz)){sichtFern(STUFEN,CX,CY,hb,hh,GRUND);for(i=0;i<GRUND.length;i++){c=GRUND[i];b=bilder.get(c.key);if(b){mal(b,c.xu,CX,CY,Z,W,H);grund=true}}}
  offenSetzen();sichtX(lod,CX,CY,hb,hh,LISTE).sort(function(a,b2){return(a.x0+a.y0)-(b2.x0+b2.y0)||a.x0-b2.x0});gemaltB.clear();
  var randN=0,veraltet=0,tS=performance.now();for(i=0;i<LISTE.length;i++){c=LISTE[i];b=bilder.get(c.key);var sb=lod>=STUFEN?schB.get(c.key):null;   // N7h1: scharfes Bild darüber einblenden
   if(sb){var al=(tS-sb.t)/EINBLENDEN_MS;if(al>=1&&!altB.has(c.key)){mal(sb,c.xu,CX,CY,Z,W,H);if(b)b.nr=bildNr;continue}if(b)mal(b,c.xu,CX,CY,Z,W,H);g.globalAlpha=Math.max(0,Math.min(1,al));mal(sb,c.xu,CX,CY,Z,W,H);g.globalAlpha=1;if(al<1)weiter=true;if(b){if(altB.has(c.key))veraltet++;continue}}
   if(b){mal(b,c.xu,CX,CY,Z,W,H);if(altB.has(c.key))veraltet++;continue}
   if(c.basis!==c.key&&(b=bilder.get(c.basis))){mal(b,c.xu,CX,CY,Z,W,H);veraltet++;continue}   // G5b: offenes Dach noch unterwegs → geschlossenes Bild zeigen
   if(c.rand)randN++;else ersatz++;   // Randbild (Nachbarstück jenseits des Fensters): gröbere Stufe zeigen, nicht anfragen, nicht als fehlend zählen
   // Ersatzbild: gröbere Stufe vergrößert, sonst feinere verkleinert, sonst graue Raute
   var da=false,L,m,k;
   for(L=lod+1;L<=MAXL&&!da;L++){m=TEIL<<L;var xs=c.xu-modu(c.xu,m);k=L+':'+umX(xs)+':'+(c.y0-c.y0%m);b=bilder.get(k);if(b){da=true;if(!gemaltB.has(k)){gemaltB.add(k);mal(b,xs,CX,CY,Z,W,H)}}}
   if(!da&&lod>0){m=n>>1;for(k=0;k<4;k++){b=bilder.get((lod-1)+':'+umX(c.xu+(k&1)*m)+':'+(c.y0+(k>>1)*m));if(b){mal(b,c.xu+(k&1)*m,CX,CY,Z,W,H);da=true}}}
   if(!da&&!grund){var x=(c.X-CX)/Z+W/2,y=(c.Y-c.mn*8-CY)/Z+H/2,r=n*32/Z;g.fillStyle=ERSATZ;g.beginPath();g.moveTo(x,y);g.lineTo(x+r,y+r/2);g.lineTo(x,y+r);g.lineTo(x-r,y+r/2);g.closePath();g.fill()}}
  // Anfragen: nur wenn die Hand ruht. Erst Sichtbares, danach die Nachbarstufen (gröber, dann feiner um die Mitte) auf Vorrat.
  var ruht=performance.now()-zoomZeit>RUHE_MS&&zeiger.size<2;
  if(bk&&gen>=0&&ruht){if(ersatz||veraltet)anfragen(LISTE,lod,ANFRAGEN);
   else if(!offen.size&&bytes<SPEICHER*.6){if(lod<MAXL)anfragen(sichtX(lod+1,CX,CY,hb,hh,NEBEN),lod+1,2);if(lod>0&&!offen.size)anfragen(sichtX(lod-1,CX,CY,hb/2,hh/2,NEBEN),lod-1,2)}}
  else if((ersatz||veraltet)&&!ruht){setTimeout(plan,RUHE_MS)}
  if(N7H&&bk&&gen>=0){var camS=lod+':'+Math.round(cam.x)+':'+Math.round(cam.y),jetzt=performance.now();if(camS!==schCam){schCam=camS;schRuhe=jetzt}
   if(lod>=STUFEN&&ruht&&!ersatz&&!veraltet&&!offen.size){if(jetzt-schRuhe>=VERWEILEN_MS){var SL=[];for(i=0;i<LISTE.length;i++){c=LISTE[i];if(!schB.has(c.key)&&bilder.has(c.key))SL.push(c)}
     SL.sort(function(a,b2){return a.ab-b2.ab});schListe(SL.map(function(c){return[c.key,c.x0,c.y0,lod]}))}else{schListe([]);setTimeout(plan,VERWEILEN_MS-(jetzt-schRuhe)+20)}}
   else schListe([])}
  karFaehrt=false;if(KAR.size&&lod<STUFEN){var tk=performance.now();karrenMalen(CX,CY,Z,W,H);M.karrenMs=performance.now()-tk;if(karFaehrt)weiter=true}
  if(FEST.length&&lod<STUFEN){var tf=performance.now();festMalen(CX,CY,Z,W,H);M.festMs=performance.now()-tf;if(M.festMs>M.maxFestMs)M.maxFestMs=M.festMs}      // G9c1: Marktstand (vor den Personen, die davor stehen)
  perGeht=false;if(PER.size&&lod<STUFEN){var tp=performance.now();personenMalen(CX,CY,Z,W,H);M.personenMs=performance.now()-tp;if(perGeht)weiter=true}      // G7: Arbeiter
  if(BN[4].size&&!(cam.nah===2&&lod===0)){BN[4].clear();M.besNah4=0}      // Z4b: 4×-Zuschauerblätter nur auf 4× im Speicher
  besGeht=false;if(BESU.size&&lod<STUFEN){var tb=performance.now();besucherMalen(CX,CY,Z,W,H);M.besucherMs=performance.now()-tb;if(M.besucherMs>(M.maxBesucherMs||0))M.maxBesucherMs=M.besucherMs;if(besGeht)weiter=true}      // AR2b: Zuschauer
  tierGeht=false;if(TIER.size&&lod<STUFEN){tiereMalen(CX,CY,Z,W,H);if(tierGeht)weiter=true}      // G8: Rehe
  if(wzRahmen&&lod<STUFEN)rahmenMalen(CX,CY,Z,W,H);
  if(wzPfad&&lod<STUFEN)pfadMalen(CX,CY,Z,W,H);
  if(N7A3C2&&!(lod>=STUFEN&&lod<=NAMEN_BIS&&!glob))M.namen=0;
  if(N7A3C2&&lod>=STUFEN&&lod<=NAMEN_BIS&&!glob){var tn=performance.now();namenMalen(CX,CY,Z,W,H,lod,ruht);M.namenMs=performance.now()-tn;if(M.namenMs>(M.maxNamenMs||0))M.maxNamenMs=M.namenMs}      // N7a3c2: Ortsnamen
  if(marke){var mx=marke.x+Math.round((cam.x-marke.x)/WX)*WX,mh=lod<STUFEN?hoeheBei(marke.x,marke.y):0;kreuz(((mx-marke.y)*32-CX)/Z+W/2,((mx+marke.y)*16-(mh==null?cam.z:mh)*8-CY)/Z+H/2)}
  M.sichtbar=LISTE.length;M.ersatz=ersatz;M.veraltet=veraltet;M.offen=OFFEN.slice();M.rand=randN;M.bilder=bilder.size;M.bytes=bytes;if(bytes>M.maxBytes)M.maxBytes=bytes;M.fertig=gen>=0&&hatKam&&LISTE.length>0&&!ersatz&&!veraltet&&!weiter;
  var ms=performance.now()-t0;M.zeichnen++;M.zeichenMs+=ms;if(ms>M.maxZeichenMs)M.maxZeichenMs=ms;
  if(weiter)plan()}
 // ── G4d Globus: Stufen (Halbmesser halbiert bis die Kugel passt), Bild aus dem Bildkern, das letzte Bild bleibt stehen, bis das neue da ist ──
 function globStufen(W,H){var R=RG0,fit=.45*Math.min(W,H),L=[];while(R>fit*1.05){L.push(R);R/=2}L.push(fit);return L}
 function globR(){var L=globStufen(cv.width,cv.height);return L[Math.min(glob.g,L.length-1)]}
 function globusZeichnen(W,H,t0){var L=globStufen(W,H);if(glob.g>=L.length)glob.g=L.length-1;var R=L[glob.g],s=Math.max(2,Math.ceil(Math.sqrt(W*H/200000)));
  if(gimg){var k=R/gimg.R,w=gimg.w*gimg.s*k,h=gimg.h*gimg.s*k;g.drawImage(gimg.c,Math.round(W/2-w/2),Math.round(H/2-h/2),Math.round(w),Math.round(h))}
  var key=W+','+H+','+R.toFixed(2)+','+glob.lon.toFixed(5)+','+glob.lat.toFixed(5);
  if(gsch&&gsch.key===key){var al=(performance.now()-gsch.t)/EINBLENDEN_MS;g.globalAlpha=Math.max(0,Math.min(1,al));g.drawImage(gsch.c,Math.round(W/2-gsch.w*gsch.s/2),Math.round(H/2-gsch.h*gsch.s/2),gsch.w*gsch.s,gsch.h*gsch.s);g.globalAlpha=1;if(al<1)plan()}   // N7h3
  if(N7H3&&bk&&gen>=0){var jt=performance.now();if(key!==gsKey){gsKey=key;gsSeit=jt;if(gsWeg){bk.postMessage({art:'gscharf',an:false});gsWeg=''}}
   if(key===gimgKey&&!(gsch&&gsch.key===key)&&gsWeg!==key&&jt-zoomZeit>RUHE_MS&&zeiger.size<2){if(jt-gsSeit>=VERWEILEN_MS){gsWeg=key;
     bk.postMessage({art:'gscharf',an:true,gen:gen,nv:NV,key:key,W:W,H:H,R:R,lon:glob.lon,lat:glob.lat,sg:s,s:Math.max(1,Math.ceil(Math.sqrt(W*H/G_PUNKTE)))})}else setTimeout(plan,VERWEILEN_MS-(jt-gsSeit)+20)}}
  if(key!==gimgKey&&!globOffen&&bk&&gen>=0){globOffen=true;frage('globus',{W:W,H:H,R:R,lon:glob.lon,lat:glob.lat,s:s,fein:N7H3}).then(function(a){globOffen=false;
    if(!a.fehlt&&glob){var c=document.createElement('canvas');c.width=a.w;c.height=a.h;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(a.buf.buffer),a.w,a.h),0,0);
     gimg={c:c,w:a.w,h:a.h,s:s,R:R};gimgKey=key;M.globusUs=a.us;M.globusN++}plan()})}
  if(marke){var lo=marke.x/WX*ZP-glob.lon,la=(.5-marke.y/WY)*Math.PI,cl=Math.cos(glob.lat),sl=Math.sin(glob.lat),cla=Math.cos(la),sla=Math.sin(la);
   if(sl*sla+cl*cla*Math.cos(lo)>0)kreuz(W/2+R*cla*Math.sin(lo),H/2-R*(cl*sla-sl*cla*Math.cos(lo)))}
  if(wahl&&wahl.bereit&&key===gimgKey){var bb=wahl.bereit;wahl.bereit=null;bb()}
  M.globus=glob.g;M.sichtbar=1;M.ersatz=key===gimgKey?0:1;M.fertig=gen>=0&&key===gimgKey;
  var ms=performance.now()-t0;M.zeichnen++;M.zeichenMs+=ms;if(ms>M.maxZeichenMs)M.maxZeichenMs=ms}
 function kreuz(x,y){x=Math.round(x);y=Math.round(y);g.fillStyle='#2a0604';g.fillRect(x-6,y-2,13,5);g.fillRect(x-2,y-6,5,13);g.fillStyle='#f4c8a0';g.fillRect(x-5,y-1,11,3);g.fillRect(x-1,y-5,3,11)}
 function hoeheBei(x,y){var p=bekannt.get((x>>6)*8192+(y>>6));if(!p)return null;var i=Math.min(8,Math.round((x&63)/8)),j=Math.min(8,Math.round((y&63)/8));return p.hg[j*9+i]}
 // Bildschirmpunkt → Feld der Welt ohne Bildkern (Globus: Kugel umkehren; Karte: flach auf Kamerahöhe). null außerhalb der Kugel.
 function weltBei(cx,cy){var r=cv.getBoundingClientRect(),f=cv.width/(r.width||1),sx=(cx-r.left)*f-cv.width/2,sy=(cy-r.top)*f-cv.height/2;
  if(glob){var R=globR(),x=sx/R,y=-sy/R,q=x*x+y*y;if(q>=1)return null;var z=Math.sqrt(1-q),cl=Math.cos(glob.lat),sl=Math.sin(glob.lat),la=Math.asin(y*cl+z*sl),lo=glob.lon+Math.atan2(x,z*cl-y*sl);
   return{x:Math.floor(modu(lo/ZP,1)*WX),y:Math.max(0,Math.min(WY-1,Math.floor((.5-la/Math.PI)*WY)))}}
  var Z=zf(),PX=(cam.x-cam.y)*32+sx*Z,PY=(cam.x+cam.y)*16+sy*Z,u=(PX/32+PY/16)/2,v=(PY/16-PX/32)/2;
  return{x:Math.floor(umX(u)),y:Math.max(0,Math.min(WY-1,Math.floor(v)))}}
 // N7a3c2 (Thomas 25.11.2026): Ortsnamen in den Fernstufen. Der Bildkern nennt die Orte im Ausschnitt (frage „namen“, erst wenn die Hand ruht), hier wird jeder Name
 // einmal vorgezeichnet (Pergamentstreifen mit Rand, Tinte, Haupt-/Großstädte blutrot, Zusatz in heller Tinte; Schrift AT3 Text, Kanten hart auf Palettenfarben gerundet) und gemerkt (NBILD, höchstens NBILD_MAX), danach je Bild nur kopiert.
 // Staffel nach Größe (NAMEN_G, wie im Bildkern), Zusatz nur ⅟16–⅟32, größere Orte größere Schrift; größere zuerst, ein Name, der einen gesetzten überdeckt, fällt weg.
 var NAMEN=new Map(), NBILD=new Map(), NBILD_MAX=400, nFrage=null, nLetzt=null, nFont=null, NRECHT=[], NLISTE=[];
 function namenFrage(lod,CX,CY,hb,hh){var x0=1e18,x1=-1e18,y0=1e18,y1=-1e18,ex=[-1,1,1,-1],ey=[-1,-1,1,1],q=1.25;
  for(var i=0;i<4;i++){var a=(CX+ex[i]*hb*q)/32,b=(CY+ey[i]*hh*q)/16,wx=(a+b)/2,wy=(b-a)/2;if(wx<x0)x0=wx;if(wx>x1)x1=wx;if(wy<y0)y0=wy;if(wy>y1)y1=wy}
  var L=nLetzt;if(L&&L.lod===lod&&L.gen===gen&&x0>=L.x0&&x1<=L.x1&&y0>=L.y0&&y1<=L.y1)return;if(nFrage)return;
  var w=(x1-x0)*.25,h=(y1-y0)*.25,R={lod:lod,gen:gen,x0:x0-w,x1:x1+w,y0:Math.max(0,y0-h),y1:Math.min(WY,y1+h),zus:lod<=NAMEN_ZUS};nFrage=R;M.namenFragen=(M.namenFragen|0)+1;var tq=performance.now();
  frage('namen',R).then(function(a){nFrage=null;if(a.fehlt||R.gen!==gen)return;M.namenAntwortMs=performance.now()-tq;M.namenUs=a.us;var L=a.namen||[];
   for(var i=0;i<L.length;i++){var e=L[i],o=NAMEN.get(e[0]);if(!o){o={k:e[0],x:e[1],y:e[2],g:e[3],h:e[4],name:e[5],zus:undefined};NAMEN.set(e[0],o);if(NAMEN.size>NAMEN_MAX)NAMEN.delete(NAMEN.keys().next().value)}
    if(e[6]!==undefined)o.zus=e[6]}
   M.namenOrte=NAMEN.size;nLetzt=R;plan()})}
 function schriftDa(){if(nFont)return true;var d=typeof document!=='undefined'?document:null;if(!d||!d.fonts||!d.fonts.check){nFont=true;return true}
  if(d.fonts.check('16px "AT3 Text"')){nFont=true;return true}if(nFont!==false){nFont=false;d.fonts.load('16px "AT3 Text"').then(function(){nFont=true;plan()},function(){nFont=true;plan()})}return false}
 function namenBild(o,mitZ){var key=o.k+(mitZ?'z':'n'),b=NBILD.get(key);if(b){NBILD.delete(key);NBILD.set(key,b);return b}
  var t0=performance.now(),px=NAMEN_PX[o.g]||15,pz=Math.max(15,px-3),fn=function(p){return p+'px "AT3 Text",ui-monospace,monospace'},
   c=document.createElement('canvas'),x=c.getContext('2d',{willReadFrequently:true});x.font=fn(px);var w1=Math.ceil(x.measureText(o.name).width),w2=0,zt=mitZ&&o.zus?o.zus:'';
  if(zt){x.font=fn(pz);w2=Math.ceil(x.measureText(zt).width)}
  var pad=5,W=w1+w2+2*pad,H=px+6;c.width=W;c.height=H;x=c.getContext('2d',{willReadFrequently:true});x.textBaseline='alphabetic';
  var base=Math.round(H/2+px*.32),gross=o.g>=6;
  x.fillStyle=NF.rand;x.fillRect(0,0,W,H);x.fillStyle=NF.papier2;x.fillRect(1,1,W-2,H-2);x.fillStyle=NF.papier;x.fillRect(2,2,W-4,H-4);
   x.font=fn(px);x.fillStyle=gross?NF.blut:NF.tinte;x.fillText(o.name,pad,base);if(zt){x.font=fn(pz);x.fillStyle=NF.tinte2;x.fillText(zt,pad+w1,base)}
  hart(x,W,H);b={c:c,w:W,h:H};NBILD.set(key,b);if(NBILD.size>NBILD_MAX)NBILD.delete(NBILD.keys().next().value);
  var ms=performance.now()-t0;M.namenBilder=(M.namenBilder|0)+1;if(ms>(M.maxNamenBildMs||0))M.maxNamenBildMs=ms;return b}
 // Kantenglättung der Schrift weg: jeder Bildpunkt ganz oder gar nicht, Farbe die nächste der verwendeten Farben (keine Zwischenfarben)
 function hart(x,W,H){var D=x.getImageData(0,0,W,H),p=D.data,F=NFARB;for(var i=0;i<p.length;i+=4){if(p[i+3]<128){p[i+3]=0;continue}p[i+3]=255;
   var bi=0,bd=1e9;for(var q=0;q<F.length;q+=3){var dr=p[i]-F[q],dg=p[i+1]-F[q+1],db=p[i+2]-F[q+2],dd=dr*dr*3+dg*dg*6+db*db;if(dd<bd){bd=dd;bi=q}}p[i]=F[bi];p[i+1]=F[bi+1];p[i+2]=F[bi+2]}x.putImageData(D,0,0)}
 function namenMalen(CX,CY,Z,W,H,lod,ruht){var gmin=NAMEN_G[lod];if(!gmin)return;if(bk&&gen>=0&&ruht)namenFrage(lod,CX,CY,W/2*Z,H/2*Z);else if(!ruht)setTimeout(plan,RUHE_MS);
  if(!NAMEN.size||!schriftDa())return;var L=NLISTE,R=NRECHT,mitZ=lod<=NAMEN_ZUS,i,j,n=0,weg=0;L.length=0;R.length=0;
  NAMEN.forEach(function(o){if(o.g<gmin)return;var mx=o.x+Math.round((cam.x-o.x)/WX)*WX,sx=((mx-o.y)*32-CX)/Z+W/2,sy=((mx+o.y)*16-CY)/Z+H/2;
   if(sx<-200||sx>W+200||sy<-60||sy>H+100)return;L.push({o:o,sx:sx,top:sy-o.h*32/Z,bot:sy+o.h*32/Z})});
  L.sort(function(a,b){return b.o.g-a.o.g||a.o.k-b.o.k});
  var tA=performance.now(),spaeter=false;for(i=0;i<L.length;i++){var e=L[i],zk=e.o.k+(mitZ&&e.o.zus?'z':'n');if(!NBILD.has(zk)&&performance.now()-tA>NAMEN_ANTEIL){spaeter=true;continue}var b=namenBild(e.o,mitZ&&e.o.zus),x0=Math.round(e.sx-b.w/2),y0=Math.round(e.top-b.h-2),ok=true;if(y0<3&&e.bot>b.h+3)y0=3;var hw=e.o.h*64/Z;if(e.sx+hw>0&&e.sx-hw<W)x0=Math.max(3,Math.min(W-3-b.w,x0));   // Ort größer als das Bild: Name bleibt am Rand sichtbar
  
   for(j=0;j<R.length;j+=4)if(x0<R[j+2]&&x0+b.w>R[j]&&y0<R[j+3]&&y0+b.h>R[j+1]){ok=false;break}
   if(!ok){weg++;continue}R.push(x0,y0,x0+b.w,y0+b.h);g.drawImage(b.c,x0,y0);n++}
  if(spaeter)setTimeout(plan,0);M.namen=n;M.namenWeg=weg}
 function zf(){return cam.nah===2?.25:cam.nah?.5:1<<cam.lod}
 function zText(l){return cam.nah===2&&l===0?'4×':cam.nah&&l===0?'2×':l===0?'1×':l<STUFEN?['','½','¼','⅛'][l]:'1/'+(1<<l)}
 function melden(){M.globus=glob?glob.g:-1;if(o.beiZoom)o.beiZoom(glob?-1:cam.lod,glob?'globe':zText(cam.lod))}
 function zurKarte(x,y,lod){glob=null;cam.nah=false;gimg=null;gimgKey='';cam.x=umX(x);cam.y=halteY(y);cam.lod=lod;zFest=false;blickK=-1;blick();zoomZeit=performance.now();plan();setTimeout(plan,RUHE_MS+20);melden()}
 function globNach(){return{x:modu(glob.lon/ZP,1)*WX,y:(.5-glob.lat/Math.PI)*WY}}
 function plan(){if(!geplant&&!tot){geplant=true;requestAnimationFrame(zeichnen)}}

 // ── G5b Gebäude: Bau-Kartenstücke, Räume je Bild, Dach offen ──
 function stk(x,y){return(x>>6)*8192+(y>>6)}
 // ── G6c Karren: Lage gleitet von der vorigen zur neuen Nachricht (Zeit zwischen zwei Nachrichten gemessen), Bild je Richtung einmal vorgezeichnet ──
 var KAR=new Map(), karT=0, karDt=50, KBILD=null, karFaehrt=false, STAU=null;
 function karLage(e,t){var f=karDt>0?(t-karT)/karDt:1;if(f>1)f=1;if(f<0)f=0;var dx=e.px-e.px0;if(dx>WX*128)dx-=WX*256;else if(dx<-WX*128)dx+=WX*256;
  return[(e.px0+dx*f)/256,(e.py0+(e.py-e.py0)*f)/256,f<1&&(dx||e.py!==e.py0)]}
 function karren(d){if(tot)return;var t=performance.now(),a=d.buf,n=a[0]|0,neuM=new Map(),neuB=false;if(karT){var dt=t-karT;if(dt>5&&dt<400)karDt=karDt*.7+dt*.3}
  for(var i=0;i<n;i++){var o2=1+i*7,id=a[o2],e=KAR.get(id),px=a[o2+1],py=a[o2+2];   // G6c2: 7 Zahlen je Karren (dazu Wartezeit)
   if(e){var L=karLage(e,t);e.px0=L[0]*256;e.py0=L[1]*256}else e={px0:px,py0:py};
   if(e.px!==px||e.py!==py||e.zust!==a[o2+4]||e.grund!==a[o2+5]||(e.warte>=60)!==(a[o2+6]>=60))neuB=true;
   e.px=px;e.py=py;e.dir=a[o2+3];e.zust=a[o2+4];e.grund=a[o2+5];e.warte=a[o2+6];neuM.set(id,e)}
  if(neuM.size!==KAR.size)neuB=true;KAR=neuM;karT=t;M.karren=n;if(neuB&&cam.lod<STUFEN&&!glob)plan()}      // G7: neues Bild nur, wenn sich ein Karren geändert hat (wartende Karren kosten nichts)
 function stauZeichen(){if(STAU)return STAU;var P=S.PALETTEN[S.PALETTE].farben,c=document.createElement('canvas'),q=c.getContext('2d'),
   hell=P[S.naechste(236,226,198,S.PALETTE)],dunkel=P[S.naechste(40,34,30,S.PALETTE)],M=['.#########.','#,,,,,,,,,#','#,#,,#,,#,#','#,,,,,,,,,#','.####,####.','.....##....'];
  c.width=M[0].length*2;c.height=M.length*2;for(var y=0;y<M.length;y++)for(var x=0;x<M[y].length;x++){var ch=M[y][x];if(ch==='.')continue;q.fillStyle=ch==='#'?dunkel:hell;q.fillRect(x*2,y*2,2,2)}
  return STAU=c}   // G6c2: kleines vorgezeichnetes Zeichen „…“ über wartenden Karren (nach 3 s), Palette A, einmal gebaut
 // G6c2: Karren antippen (Lage aus dem letzten Bild, Bildpunkte der Karte)
 function karrenBei(cx,cy){var r=cv.getBoundingClientRect(),f=cv.width/(r.width||1),px=(cx-r.left)*f,py=(cy-r.top)*f,best=null,bd=40*f*f*40;
  KAR.forEach(function(e,id){if(e.sx==null||e.sx<-1e8)return;var dx=e.sx-px,dy=e.sy-8*f/(zf())-py,d=dx*dx+dy*dy;if(d<bd){bd=d;best={id:id,zust:e.zust,grund:e.grund,warte:e.warte||0}}});return best}
 function karBilder(objekte){var ob=objekte&&objekte['karren-ochse'];KBILD=null;if(!ob||!ob.bild)return;KBILD=[];
  for(var r=0;r<4;r++){var b=S.richtungsBild(ob,r)||ob.bild,c=S.zuCanvas(b,S.PALETTE);KBILD.push({c:c,p:punktBild(c),w:b.w,h:b.h,ax:b.ax,ay:b.ay})}}
 // Nachbesserung G6c2 (Thomas): Punktmuster des Karrens (jeder zweite Bildpunkt im Schachbrett), einmal je Richtung vorgezeichnet; gezeigt, wenn ein Gebäude davor steht
 function punktBild(c){try{var d=document.createElement('canvas');d.width=c.width;d.height=c.height;var q=d.getContext('2d');q.drawImage(c,0,0);var im=q.getImageData(0,0,d.width,d.height),a=im.data;
  for(var y=0;y<d.height;y++)for(var x=0;x<d.width;x++)if((x+y)&1)a[(y*d.width+x)*4+3]=0;q.putImageData(im,0,0);return d}catch(err){return c}}
 // Verdeckt ein Gebäude mit geschlossenem Dach den Karren? Jedes Gebäudefeld ist ein Klotz: Raute 64 × 32 bis Wandhöhe (GESCHOSS, Bildpunkte bei 1×) hoch.
 // Geprüft wird die Mitte des Karrens (halbe Bildhöhe über seinem Standpunkt, Lage auch zwischen zwei Feldern) gegen die Klötze der Felder um ihn und davor.
 // Leistungsarm: höchstens 16 Nachschläge in der Raumkarte je sichtbarem Karren, nur Rechnen, kein Bild neu. Dachfirst und Ränder nicht pixelgenau.
 function verdeckt(x,y,hc){var X0=Math.floor(x),Y0=Math.floor(y),WH=(S.GESCHOSS||32),py=-hc/2;
  for(var dy=-1;dy<=2;dy++)for(var dx=-1;dx<=2;dx++){var X=X0+dx,Y=Y0+dy,r=raumBei(umX(X),Y);if(!r||OFFEN.indexOf(r)>=0)continue;
   var ex=X+.5-x,ey=Y+.5-y,cx=(ex-ey)*32,cy=(ex+ey)*16,a=Math.abs(cx)/32;if(a>=1)continue;var rest=16*(1-a);
   if(py<=cy+rest&&py>=cy-WH-rest&&(cy>=0||py>=cy-rest))return true}
  return false}
 function karrenMalen(CX,CY,Z,W,H){var t=performance.now(),n=0,fahrt=false;M.karrenVerdeckt=0;
  KAR.forEach(function(e){var L=karLage(e,t),x=L[0],y=L[1];x+=Math.round((cam.x-x)/WX)*WX;var h=hoeheBei(umX(Math.floor(x)),Math.floor(y));if(h==null)h=cam.z;
   var sx=((x-y)*32-CX)/Z+W/2,sy=((x+y)*16-h*8-CY)/Z+H/2;e.sx=-1e9;if(sx<-64||sy<-64||sx>W+64||sy>H+64)return;n++;if(L[2])fahrt=true;e.sx=sx;e.sy=sy;
   var B=KBILD&&KBILD[e.dir&3],vd=verdeckt(x,y,B?B.ay:20);e.verdeckt=vd;M.karrenVerdeckt=(M.karrenVerdeckt||0)+(vd?1:0);
   if(B)g.drawImage(vd?B.p:B.c,Math.round(sx-B.ax/Z),Math.round(sy-B.ay/Z),Math.max(1,Math.round(B.w/Z)),Math.max(1,Math.round(B.h/Z)));
   else{var r=Math.max(2,14/Z);g.fillStyle=ERSATZ;g.beginPath();g.moveTo(sx,sy-r);g.lineTo(sx+r*2,sy);g.lineTo(sx,sy+r);g.lineTo(sx-r*2,sy);g.closePath();g.fill()}
   if(e.grund>=10&&e.grund<=12&&e.zust===1){var Mk=stauZeichen(),hb=B?B.ay/Z:Math.max(2,14/Z);g.drawImage(Mk,Math.round(sx-Mk.width/2),Math.round(sy-hb-Mk.height-2))}});   // Ersatzbild: graue Raute; G6c2: Stau-Zeichen
  M.karrenSichtbar=n;karFaehrt=fahrt}
 // ── G7 Arbeiter: wie die Karren. personen(d) bekommt nach jedem Takt des Weltkerns je Person 10 Zahlen (personen.js meld); Lage gleitet zwischen zwei
 // Nachrichten, Bild figur-arbeiter je Richtung einmal vorgezeichnet (Ersatzbild grauer Balken), Punktmuster hinter Gebäuden, gezeichnet wird nur, wer im Bild ist;
 // ein neues Bild gibt es nur, wenn sich jemand bewegt oder ändert. ──
 var PER=new Map(), perT=0, perDt=50, PBILD=null, perGeht=false;
 function perLage(e,t,T,D){if(T==null){T=perT;D=perDt}var f=D>0?(t-T)/D:1;      // AR2b: auch für die Zuschauer (eigene Zeit)
if(f>1)f=1;if(f<0)f=0;var dx=e.px-e.px0;if(dx>WX*128)dx-=WX*256;else if(dx<-WX*128)dx+=WX*256;
  return[(e.px0+dx*f)/256,(e.py0+(e.py-e.py0)*f)/256,f<1&&(dx||e.py!==e.py0)]}
 function personen(d){if(tot)return;var t=performance.now(),a=d.buf,n=a[0]|0,neuM=new Map(),neuB=false;if(perT){var dt=t-perT;if(dt>5&&dt<400)perDt=perDt*.7+dt*.3}
  for(var i=0;i<n;i++){var o2=1+i*13,id=a[o2],e=PER.get(id),px=a[o2+1],py=a[o2+2];      // G8: 13 Zahlen je Person
   if(e){var L=perLage(e,t);e.px0=L[0]*256;e.py0=L[1]*256}else{e={px0:px,py0:py};neuB=true}
   if(e.px!==px||e.py!==py||e.dir!==a[o2+3])neuB=true;
   e.px=px;e.py=py;e.dir=a[o2+3];e.zust=a[o2+4];e.auf=a[o2+5]&15;e.darf=a[o2+5]>>4;e.grund=a[o2+6];e.last=a[o2+7];e.f0=a[o2+8];e.f1=a[o2+9];e.fa=a[o2+10];e.fb=a[o2+11];neuM.set(id,e)}
  if(neuM.size!==PER.size)neuB=true;PER=neuM;perT=t;M.personen=n;if(neuB&&cam.lod<STUFEN&&!glob)plan()}
 function perBilder(objekte){var ob=objekte&&objekte['figur-arbeiter'];PBILD=null;if(!ob||!ob.bild)return;PBILD=[];
  for(var r=0;r<4;r++){var b=S.richtungsBild(ob,r)||ob.bild,c=S.zuCanvas(b,S.PALETTE);PBILD.push({c:c,p:punktBild(c),w:b.w,h:b.h,ax:b.ax,ay:b.ay})}}
 function personBei(cx,cy){var r=cv.getBoundingClientRect(),f=cv.width/(r.width||1),px=(cx-r.left)*f,py=(cy-r.top)*f,best=null,bd=24*f*f*24;
  PER.forEach(function(e,id){if(e.sx==null||e.sx<-1e8)return;var dx=e.sx-px,dy=e.sy-10*f/(zf())-py,d=dx*dx+dy*dy;if(d<bd){bd=d;best={id:id,zust:e.zust,auf:e.auf,darf:e.darf,grund:e.grund,last:e.last,f0:e.f0,f1:e.f1,fa:e.fa,fb:e.fb}}});return best}
 // ── F1b Kartenfiguren wie 2.0 (Thomas 18.11.2026): je Person ein Posenblatt AT3-64 (Kampfkern, figurbild.js karte), hier nur einmal in ein Canvas gelegt.
 // Pose nach Zustand: läuft → Gehen 8, arbeitet (Bauen, Ketten) → Axt-Schlag 4, sonst Stehen; Last je Ware (personen.js meld last) obenauf, mit dem Kopf verschoben.
 // Rechts für Richtung 0 und 2, links für 1 und 3 (Bildschirm x = (x-y)·32). Ohne Blatt bleibt das alte Bild figur-arbeiter als Ersatz. Kein Zeichnen beim Zoomen.
 var FIG=new Map(), FLAST=null, FK={n:13,gehen:0,stehen:8,arbeiten:9,w:14,h:24,ax:7,ay:22};
 function f1Canvas(w,h,p64,rgb){var c=document.createElement('canvas');c.width=w;c.height=h;var x=c.getContext('2d'),im=x.createImageData(w,h),d=im.data;
  for(var i=0;i<p64.length;i++){var n=p64[i];if(n===255)continue;var q=rgb[n],o=i*4;d[o]=q[0];d[o+1]=q[1];d[o+2]=q[2];d[o+3]=255}x.putImageData(im,0,0);return c}
 function f1Rgb(){var f=S.PALETTEN[S.PALETTE].farben;return f.map(function(h){if(Array.isArray(h))return h;h=String(h).replace('#','');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]})}
 // ── F1c Nahansicht (Thomas 18.11.2026): auf Stufe 2× die volle 1.0-Figur wie 2.0 (figurbild.js nahKarte, AT3-64, 45 × 58, ein Bildpunkt = ein Bildschirmpunkt).
 // Nur für Personen im Bild, Stück für Stück: auf 1× (in Ruhe) und 2× meldet die Karte fehlende Blätter (o.beiNahFehlt), das Spiel lässt höchstens 2 je Auftrag zeichnen.
 // Bis dahin wird das Kartenblatt doppelt groß gezeigt (Ersatz statt Lücke). Höchstens NAHMAX Blätter, ferne fliegen zuerst raus. Notausschalter: ?f1c=0
 var FN=new Map(), FNLAST=null, FNK={n:13,gehen:0,stehen:8,arbeiten:9,w:45,h:58,ax:22,ay:50}, NAHMAX=40, nahFehlt=0, nahMeldT=0, F1CAUS=/[?&]f1c=0/.test(location.search);
 // Z4a Detailstufe 4× (Thomas 21.11.2026): eine Stufe vor 2×, Karte Stufe 0 viermal groß. Personen im Bild bekommen ein Blatt doppelt so fein (figurbild.js nahKarte stufe 4,
 // 90 × 115, AT3-64), bis dahin das 2×-Blatt doppelt groß (Ersatz statt Lücke). Höchstens NAH4MAX Blätter, ferne fliegen zuerst raus. Notausschalter: ?z4=0
 var FN4=new Map(), FN4LAST=null, FN4K={n:13,gehen:0,stehen:8,arbeiten:9,w:90,h:115,ax:45,ay:99}, NAH4MAX=16, Z4AUS=/[?&]z4=0/.test(location.search);
 function nahStufe(){return cam.nah===2&&!Z4AUS?4:2}
 function nah4Blaetter(r){var rgb=f1Rgb(),t=performance.now();if(r.posen)r.posen.forEach(function(p){FN4K[p.id]=p.ab});FN4K.n=r.n||FN4K.n;FN4K.w=r.fw;FN4K.h=r.fh;FN4K.ax=r.ax;FN4K.ay=r.ay;
  (r.blaetter||[]).forEach(function(b){var c=f1Canvas(b.w,b.h,b.p64,rgb);FN4.set(b.pid,{c:c,p:punktBild(c),dy:b.dy,gv:b.gv,t:t})});
  if(r.lasten){var c=f1Canvas(r.lasten.w,r.lasten.h,r.lasten.p64,rgb);FN4LAST={c:c,p:punktBild(c)}}
  if(FN4.size>NAH4MAX){var L=[];FN4.forEach(function(v,id){var e=PER.get(id);L.push([e&&e.sx>-1e8?1:0,v.t,id])});L.sort(function(a,b){return a[0]-b[0]||a[1]-b[1]});for(var i=0;FN4.size>NAH4MAX&&i<L.length;i++)FN4.delete(L[i][2])}
  M.nah4Ms=(M.nah4Ms||0)+performance.now()-t;M.nah4=FN4.size;plan()}
 function nahBlaetter(r){if(r.stufe===4)return nah4Blaetter(r);var rgb=f1Rgb(),t=performance.now();if(r.posen)r.posen.forEach(function(p){FNK[p.id]=p.ab});FNK.n=r.n||FNK.n;FNK.w=r.fw;FNK.h=r.fh;FNK.ax=r.ax;FNK.ay=r.ay;
  (r.blaetter||[]).forEach(function(b){var c=f1Canvas(b.w,b.h,b.p64,rgb);FN.set(b.pid,{c:c,p:punktBild(c),dy:b.dy,gv:b.gv,t:t})});
  if(r.lasten){var c=f1Canvas(r.lasten.w,r.lasten.h,r.lasten.p64,rgb);FNLAST={c:c,p:punktBild(c)}}
  if(FN.size>NAHMAX){var L=[];FN.forEach(function(v,id){var e=PER.get(id);L.push([e&&e.sx>-1e8?1:0,v.t,id])});L.sort(function(a,b){return a[0]-b[0]||a[1]-b[1]});for(var i=0;FN.size>NAHMAX&&i<L.length;i++)FN.delete(L[i][2])}
  M.nahMs=(M.nahMs||0)+performance.now()-t;M.nah=FN.size;plan()}
 function figurBlaetter(r){if(!r)return;if(r.nah)return nahBlaetter(r);var rgb=f1Rgb(),t=performance.now();if(r.posen)r.posen.forEach(function(p){FK[p.id]=p.ab});if(r.n)FK.n=r.n;if(r.fw){FK.w=r.fw;FK.h=r.fh;FK.ax=r.ax;FK.ay=r.ay}
  (r.blaetter||[]).forEach(function(b){var c=f1Canvas(b.w,b.h,b.p64,rgb);FIG.set(b.pid,{c:c,p:punktBild(c),dy:b.dy,gv:b.gv})});
  if(r.lasten){var c=f1Canvas(r.lasten.w,r.lasten.h,r.lasten.p64,rgb);FLAST={c:c,p:punktBild(c)}}M.figurenMs=(M.figurenMs||0)+performance.now()-t;M.figuren=FIG.size;plan()}
 function figurVergessen(da){FIG.forEach(function(v,id){if(!da[id])FIG.delete(id)});FN.forEach(function(v,id){if(!da[id])FN.delete(id)});FN4.forEach(function(v,id){if(!da[id])FN4.delete(id)});M.figuren=FIG.size}
 function personenMalen(CX,CY,Z,W,H){var t=performance.now(),n=0,geht=false,nah=cam.nah&&!F1CAUS,fehlt=0,ruht=t-zoomZeit>RUHE_MS;
  PER.forEach(function(e,id){var L=perLage(e,t),x=L[0],y=L[1];x+=Math.round((cam.x-x)/WX)*WX;var h=hoeheBei(umX(Math.floor(x)),Math.floor(y));if(h==null)h=cam.z;
   var sx=((x-y)*32-CX)/Z+W/2,sy=((x+y)*16-h*8-CY)/Z+H/2;e.sx=-1e9;var rm=Z<.5?2:1;if(sx<-32*rm||sy<-32*rm||sx>W+32*rm||sy>H+50*rm)return;n++;if(L[2])geht=true;e.sx=sx;e.sy=sy;
   var Q=null,QK=FNK,QL=FNLAST,qs=1,vier=nah&&cam.nah===2&&!Z4AUS;if(nah){if(vier){Q=FN4.get(id);if(Q){QK=FN4K;QL=FN4LAST}else{Q=FN.get(id);qs=2}}else Q=FN.get(id)}   // Z4a: 4× eigenes Blatt, sonst 2×-Blatt doppelt
   var QW=!F1CAUS&&cam.lod===0&&ruht?(vier?FN4.get(id):nah?Q:FN.get(id)):null;if(!F1CAUS&&cam.lod===0&&ruht&&(!QW||(GV[id]!=null&&QW.gv!==GV[id])))fehlt++;
   if(Q){var vq=verdeckt(x,y,Math.round(QK.ay*qs*Z));e.verdeckt=vq;var rq=(e.dir&3)===0||(e.dir&3)===2?0:1,aq=e.zust===3&&(e.auf===3||(e.auf>=5&&e.auf!==11&&e.auf!==12)),
     fq=L[2]?QK.gehen+(Math.floor(t/110)%8):aq?QK.arbeiten+(Math.floor(t/170)%4):QK.stehen;if(aq)geht=true;var qx=Math.round(sx-QK.ax*qs),qy=Math.round(sy-QK.ay*qs);
     g.drawImage(vq?Q.p:Q.c,fq*QK.w,rq*QK.h,QK.w,QK.h,qx,qy,QK.w*qs,QK.h*qs);
     var wq=(e.last&15)-1;if(wq>=0&&!aq&&QL){var kq=Q.dy?Q.dy[rq*QK.n+fq]|0:0;g.drawImage(vq?QL.p:QL.c,wq*QK.w,rq*QK.h,QK.w,QK.h,qx,qy+kq*qs,QK.w*qs,QK.h*qs)}return}
   var F=FIG.get(id);if(F){var vd=verdeckt(x,y,FK.ay);e.verdeckt=vd;var re=(e.dir&3)===0||(e.dir&3)===2?0:1,ar=e.zust===3&&(e.auf===3||(e.auf>=5&&e.auf!==11&&e.auf!==12)),
     fr=L[2]?FK.gehen+(Math.floor(t/110)%8):ar?FK.arbeiten+(Math.floor(t/170)%4):FK.stehen;if(ar)geht=true;
     var dw=Math.max(1,Math.round(FK.w/Z)),dh=Math.max(1,Math.round(FK.h/Z)),ox=Math.round(sx-FK.ax/Z),oy=Math.round(sy-FK.ay/Z);
     g.drawImage(vd?F.p:F.c,fr*FK.w,re*FK.h,FK.w,FK.h,ox,oy,dw,dh);
     var wa=(e.last&15)-1;if(wa>=0&&!ar&&FLAST){var kd=F.dy?F.dy[re*FK.n+fr]|0:0;g.drawImage(vd?FLAST.p:FLAST.c,wa*FK.w,re*FK.h,FK.w,FK.h,ox,Math.round(oy+kd/Z),dw,dh)}return}
   var B=PBILD&&PBILD[e.dir&3],vd=verdeckt(x,y,B?B.ay:20);e.verdeckt=vd;
   if(B)g.drawImage(vd?B.p:B.c,Math.round(sx-B.ax/Z),Math.round(sy-B.ay/Z),Math.max(1,Math.round(B.w/Z)),Math.max(1,Math.round(B.h/Z)));
   else{g.fillStyle=ERSATZ;g.fillRect(Math.round(sx-3/Z),Math.round(sy-20/Z),Math.max(2,Math.round(6/Z)),Math.max(3,Math.round(20/Z)))}});
  M.personenSichtbar=n;perGeht=geht;nahFehlt=fehlt;M.nahFehlt=fehlt;if(fehlt&&o.beiNahFehlt&&t-nahMeldT>250){nahMeldT=t;setTimeout(o.beiNahFehlt,0)}}
 var GV={};
 // ── G8 Rehe: wie die Arbeiter. tiere(d) bekommt nach jedem Takt je Reh 5 Zahlen (ketten.js tiere); Bild tier-reh je Richtung einmal vorgezeichnet
 // (Ersatzbild grauer Fleck), gezeichnet wird nur, was im Bild ist; ein neues Bild gibt es nur, wenn sich ein Reh bewegt. ──
 var TIER=new Map(), tierT=0, tierDt=50, TBILD=null, tierGeht=false;
 function tierLage(e,t){var f=tierDt>0?(t-tierT)/tierDt:1;if(f>1)f=1;if(f<0)f=0;var dx=e.px-e.px0;if(dx>WX*128)dx-=WX*256;else if(dx<-WX*128)dx+=WX*256;
  return[(e.px0+dx*f)/256,(e.py0+(e.py-e.py0)*f)/256,f<1&&(dx||e.py!==e.py0)]}
 function tiere(d){if(tot)return;var t=performance.now(),a=d.buf,n=a[0]|0,neuM=new Map(),neuB=false;if(tierT){var dt=t-tierT;if(dt>5&&dt<400)tierDt=tierDt*.7+dt*.3}
  for(var i=0;i<n;i++){var o2=1+i*5,id=a[o2],e=TIER.get(id),px=a[o2+1],py=a[o2+2];
   if(e){var L=tierLage(e,t);e.px0=L[0]*256;e.py0=L[1]*256}else{e={px0:px,py0:py};neuB=true}
   if(e.px!==px||e.py!==py||e.dir!==a[o2+3])neuB=true;e.px=px;e.py=py;e.dir=a[o2+3];e.zust=a[o2+4];neuM.set(id,e)}
  if(neuM.size!==TIER.size)neuB=true;TIER=neuM;tierT=t;M.tiere=n;if(neuB&&cam.lod<STUFEN&&!glob)plan()}
 function tierBilder(objekte){var ob=objekte&&objekte['tier-reh'];TBILD=null;if(!ob||!ob.bild)return;TBILD=[];
  for(var r=0;r<4;r++){var b=S.richtungsBild(ob,r)||ob.bild,c=S.zuCanvas(b,S.PALETTE);TBILD.push({c:c,p:punktBild(c),w:b.w,h:b.h,ax:b.ax,ay:b.ay})}}
 function tierBei(cx,cy){var r=cv.getBoundingClientRect(),f=cv.width/(r.width||1),px=(cx-r.left)*f,py=(cy-r.top)*f,best=null,bd=22*f*f*22;
  TIER.forEach(function(e,id){if(e.sx==null||e.sx<-1e8)return;var dx=e.sx-px,dy=e.sy-8*f/(zf())-py,d=dx*dx+dy*dy;if(d<bd){bd=d;best={id:id,zust:e.zust}}});return best}
 function tiereMalen(CX,CY,Z,W,H){var t=performance.now(),n=0,geht=false;
  TIER.forEach(function(e){var L=tierLage(e,t),x=L[0],y=L[1];x+=Math.round((cam.x-x)/WX)*WX;var h=hoeheBei(umX(Math.floor(x)),Math.floor(y));if(h==null)h=cam.z;
   var sx=((x-y)*32-CX)/Z+W/2,sy=((x+y)*16-h*8-CY)/Z+H/2;e.sx=-1e9;if(sx<-32||sy<-32||sx>W+32||sy>H+48)return;n++;if(L[2])geht=true;e.sx=sx;e.sy=sy;
   var B=TBILD&&TBILD[e.dir&3],vd=verdeckt(x,y,B?B.ay:14);
   if(B)g.drawImage(vd?B.p:B.c,Math.round(sx-B.ax/Z),Math.round(sy-B.ay/Z),Math.max(1,Math.round(B.w/Z)),Math.max(1,Math.round(B.h/Z)));
   else{g.fillStyle=ERSATZ;g.fillRect(Math.round(sx-6/Z),Math.round(sy-10/Z),Math.max(2,Math.round(12/Z)),Math.max(2,Math.round(10/Z)))}});
  M.tiereSichtbar=n;tierGeht=geht}
 // ── AR2b Zuschauer der großen Arena (Thomas 21.11.2026): besucher(d) bekommt nach jedem Takt je Zuschauer 9 Zahlen (besucher.js meld). Draußen wie die Arbeiter
 // (Lage gleitet, Gehen 8, Stehen 1), drinnen rechnet die Karte den Weg aus dem Fortschritt nach: vom Häuschen die Treppe hinauf auf den Umgang, den Umgang
 // entlang, den Rang hinunter zum Platz (wie 2.0 welt-arena.js innen); Sitzende zeigen nur den Oberkörper (wie 2.0 drawSit), Blick zur Mitte. Draußen hinter
 // dem Arena-Bild (weiter hinten als ihre Mitte und im Bild) wird niemand gezeichnet. Blatt je Besuchertyp (60, Kampfkern, figurbild.js karte btypen);
 // fehlt eins für einen Sichtbaren, meldet die Karte es (o.beiBesFehlt), bis dahin Ersatzbild. Auf 2× das Kartenblatt doppelt (Thomas). Nur Rechnen, kein Bild neu.
 var BESU=new Map(), besT=0, besDt=50, BFIG=new Map(), besGeht=false, BINFO=null, besFehltL=[], besMeldT=0, B_SITZT=4, B_HINEIN=3, B_HINAUS=5;
 var AR2B_AUS=/[?&]ar2b=0/.test(location.search);
 // Z4b (Thomas 21.11.2026): auf 2× und 4× eigene Nahblätter je Besuchertyp (volle 1.0-Figur ohne Waffen, figurbild.js nahKarte btypen, nur Gehen und Stehen).
 // Nur für Typen im Bild, in Ruhe gemeldet (o.beiBesFehlt), bis dahin auf 4× das 2×-Blatt doppelt, sonst das Kartenblatt. Lager je Stufe: bis 20 (2×) bzw. 8 (4×),
 // Typen aus dem Bild zuerst raus; sind mehr Typen im Bild, wächst es bis 30 bzw. 12, darüber bleibt das Ersatzblatt. Speicher (Thomas 21.11.2026): außerhalb von 4×
 // wird das 4×-Lager geleert (bis ~9 MB), beim nächsten Heranzoomen neu gezeichnet. Notausschalter ?z4b=0 (wie AR2b).
 var BN={2:new Map(),4:new Map()}, BNK={2:{gehen:0,stehen:8,w:45,h:58,ax:22,ay:50},4:{gehen:0,stehen:8,w:90,h:115,ax:45,ay:99}}, BNMAX={2:20,4:8}, BNHART={2:30,4:12},
  BSEEN=new Map(), besNahFehltL=[], besNahStufe=0, Z4B_AUS=/[?&]z4b=0/.test(location.search);
 var FPFEHLT=[], AR2C2_AUS=/[?&]ar2c2=0/.test(location.search);      // AR2c2: Typen, die First Person sieht, aber noch kein Blatt hat (Notausschalter ?ar2c2=0)
 function besucherNahBlaetter(r){if(!r||!r.nah)return;var s=r.stufe===4?4:2,K=BNK[s],Mp=BN[s],rgb=f1Rgb(),t=performance.now();if(r.posen)r.posen.forEach(function(p){K[p.id]=p.ab});K.w=r.fw;K.h=r.fh;K.ax=r.ax;K.ay=r.ay;
  (r.blaetter||[]).forEach(function(b){Mp.set(b.pid,{c:f1Canvas(b.w,b.h,b.p64,rgb),t:t})});
  if(Mp.size>BNMAX[s]){var L=[];Mp.forEach(function(v,typ){L.push([BSEEN.get(typ)||0,v.t,typ])});L.sort(function(a,b){return a[0]-b[0]||a[1]-b[1]});
   for(var i=0;Mp.size>BNMAX[s]&&i<L.length;i++){if(t-L[i][0]<1000)break;Mp.delete(L[i][2])}}      // nur Typen, die seit 1 s nicht mehr im Bild waren
  M['besNah'+s]=Mp.size;M.besNahMs=(M.besNahMs||0)+performance.now()-t;plan()}
 function besucher(d){if(tot||AR2B_AUS)return;var t=performance.now(),a=d.buf,n=a[0]|0,neuM=new Map(),neuB=false;if(besT){var dt=t-besT;if(dt>5&&dt<400)besDt=besDt*.7+dt*.3}
  for(var i=0;i<n;i++){var o2=1+i*9,id=a[o2],e=BESU.get(id),px=a[o2+1],py=a[o2+2],st=a[o2+3],pr=a[o2+6];
   if(e&&e.st===st){var L=perLage(e,t,besT,besDt);e.px0=L[0]*256;e.py0=L[1]*256;e.pr0=e.pr0+(e.pr-e.pr0)*Math.min(1,Math.max(0,(t-besT)/besDt))}else{e={px0:px,py0:py,pr0:pr};neuB=true}
   if(e.px!==px||e.py!==py||e.pr!==pr)neuB=true;e.px=px;e.py=py;e.st=st;e.typ=a[o2+4];e.sitz=a[o2+5];e.pr=pr;e.dir=a[o2+7];e.sp=a[o2+8];neuM.set(id,e)}
  if(neuM.size!==BESU.size)neuB=true;BESU=neuM;besT=t;M.besucher=n;if(neuB&&cam.lod<STUFEN&&!glob)plan()}
 // Arena für die Innenwege: {x,y (linke obere Ecke), w,h, ein,aus ([x,y,seite] oder null)} und die Sitzdaten (arena-sitze.js)
 function besucherArena(A,SZ){BINFO=A&&SZ&&A.x>=0?{x:A.x,y:A.y,cx:A.x+A.w/2,cy:A.y+A.h/2,ein:A.ein,aus:A.aus,S:SZ}:null}
 function besucherBlaetter(r){if(!r)return;var rgb=f1Rgb(),t=performance.now();if(r.posen)r.posen.forEach(function(p){FK[p.id]=p.ab});if(r.n)FK.n=r.n;if(r.fw){FK.w=r.fw;FK.h=r.fh;FK.ax=r.ax;FK.ay=r.ay}
  (r.blaetter||[]).forEach(function(b){var c=f1Canvas(b.w,b.h,b.p64,rgb);BFIG.set(b.pid,{c:c,p64:b.p64,w:b.w,h:b.h,vh:b.vh||null})});if(r.vhN)FK.vhN=r.vhN;      /* AR2c1: Nummern und vorn/hinten bleiben für First Person */M.besFigurenMs=(M.besFigurenMs||0)+performance.now()-t;M.besFiguren=BFIG.size;plan()}
 // Weg drinnen bei Anteil f (0 = am Häuschen, 1 = auf dem Platz): [x, y, Höhe in Bildpunkten über dem Boden der Arena-Mitte, oder null = Boden des Häuschens]
 var TREPPE=40;
 function innenLage(h,s,tt,T){var B=BINFO,S=B.S,P=S.plaetze[s],hx=h[0]+.5,hy=h[1]+.5,dx=hx-B.cx,dy=hy-B.cy;dx-=Math.round(dx/WX)*WX;var ah=Math.atan2(dy,dx),
   Ru=S.umgang/16,Rr=S.rang[P[3]]/16,as=P[2]*Math.PI/1800,da=as-ah;da-=Math.round(da/(2*Math.PI))*2*Math.PI;var Hu=S.hoehe.umgang,Hs=P[4]-4;
  if(tt<TREPPE){var f=tt/TREPPE,ux=B.cx+Math.cos(ah)*Ru,uy=B.cy+Math.sin(ah)*Ru;return[hx+(ux-hx)*f,hy+(uy-hy)*f,f,Hu]}      // Treppe: Höhe vom Häuschen zum Umgang (f)
  var L1=Math.abs(da)*Ru,L2=Math.max(0,Ru-Rr),q=(tt-TREPPE)/Math.max(1,T-TREPPE)*(L1+L2);
  if(q<L1){var a=ah+da*(L1?q/L1:1);return[B.cx+Math.cos(a)*Ru,B.cy+Math.sin(a)*Ru,1,Hu]}
  var g=L2?Math.min(1,(q-L1)/L2):1,r=Ru+(Rr-Ru)*g;return[B.cx+Math.cos(as)*r,B.cy+Math.sin(as)*r,1,Hu+(Hs-Hu)*g]}
 function innenDauer(h,s){var B=BINFO,P=B.S.plaetze[s],x0=h[0]-B.x;x0-=Math.round(x0/WX)*WX;var hx=x0*16+8,hy=(h[1]-B.y)*16+8,dx=Math.abs(P[0]-hx),dy=Math.abs(P[1]-hy),d=Math.max(dx,dy)+(Math.min(dx,dy)>>1);return TREPPE+Math.floor(d*25/16)}
 // AR2c2: Lage eines Zuschauers jetzt (Karte und First Person gemeinsam): {x,y (Welt), zp (Höhe in Kartenpunkten), sitzt, innen, re (Kartenreihe), geht}, null = nicht zeigen
 function besLage(e,id,t,B,hc){var gh=false,x,y,zp,sitzt=false,innen=false,re,f=Math.min(1,Math.max(0,besDt>0?(t-besT)/besDt:1)),pr=e.pr0+(e.pr-e.pr0)*f;
   if((e.st===B_HINEIN||e.st===B_HINAUS||e.st===B_SITZT)&&B&&e.sitz>=0&&e.sitz<B.S.plaetze.length){innen=true;
    if(e.st===B_SITZT){var P=B.S.plaetze[e.sitz];x=B.x+P[0]/16;y=B.y+P[1]/16;zp=hc*8+P[4]-4;sitzt=true;var cdx=(B.cx-x)-(B.cy-y);re=cdx>=0?0:1}
    else{var h=e.st===B_HINEIN?B.ein:B.aus;if(!h)return null;var T=innenDauer(h,e.sitz),tt=pr/256*T;if(e.st===B_HINAUS)tt=T-tt;
     var p=innenLage(h,e.sitz,tt,T),p2=innenLage(h,e.sitz,Math.min(T,Math.max(0,tt+(e.st===B_HINAUS?-4:4))),T),hh=hoeheBei(umX(h[0]),h[1]);if(hh==null)hh=hc;
     x=p[0];y=p[1];zp=hh*8+(hc*8+p[3]-hh*8)*p[2];var sd=((p2[0]-p2[1])-(p[0]-p[1]));re=sd>=0?0:1;gh=true}}
   else{var L=perLage(e,t,besT,besDt);x=L[0];y=L[1];gh=!!L[2];e.geht=L[2];var hb=hoeheBei(umX(Math.floor(x)),Math.floor(y));zp=(hb==null?cam.z:hb)*8;re=(e.dir&3)===0||(e.dir&3)===2?0:1}
   return{x:x,y:y,zp:zp,sitzt:sitzt,innen:innen,re:re,geht:gh}}
 function besucherMalen(CX,CY,Z,W,H){var t=performance.now(),n=0,hinten=0,geht=false,fehlt={},fl=[],B=BINFO,AN=null,ruht=t-zoomZeit>RUHE_MS,
   nS=cam.nah&&cam.lod===0&&!Z4B_AUS?(cam.nah===2&&!Z4AUS?4:2):0,nf={},nfl=[];      // Z4b: Nahstufe der Zuschauer
  FEST.forEach(function(e){if(e.anl&&e.B&&e.sx>-1e8)AN=e});
  var hc=B?hoeheBei(umX(Math.floor(B.cx)),Math.floor(B.cy)):null;if(hc==null)hc=cam.z;
  BESU.forEach(function(e,id){var lg=besLage(e,id,t,B,hc);if(!lg){BESU_Q(e);return}var x=lg.x,y=lg.y,zp=lg.zp,sitzt=lg.sitzt,innen=lg.innen,re=lg.re;if(lg.geht)geht=true;
   x+=Math.round((cam.x-x)/WX)*WX;
   var sx=((x-y)*32-CX)/Z+W/2,sy=((x+y)*16-zp-CY)/Z+H/2;e.sx=-1e9;if(sx<-32||sy<-32||sx>W+32||sy>H+48)return;
   if(!innen&&AN){var cxw=AN.x+.5,cyw=AN.y+.5;cxw+=Math.round((x-cxw)/WX)*WX;if(x+y<cxw+cyw){var Bb=AN.B,u=(sx-AN.sx)*AN.Z/(Bb.w/2),v=(sy-(AN.sy-(Bb.ay-Bb.h/2)/AN.Z))*AN.Z/(Bb.h/2);if(u*u+v*v<=1){hinten++;return}}}      // hinter dem Ring
   n++;e.sx=sx;e.sy=sy;e.sitzt=sitzt;var F=BFIG.get(e.typ);if(!F&&!fehlt[e.typ]){fehlt[e.typ]=1;fl.push(e.typ)}
   var lauf=!sitzt&&(innen||e.geht),fr=lauf?FK.gehen+((Math.floor(t/110)+id)%8):FK.stehen;
   if(nS){BSEEN.set(e.typ,t);var Mp=BN[nS],Q=Mp.get(e.typ),QK=BNK[nS],qs=1;if(!Q&&nS===4){Q=BN[2].get(e.typ);QK=BNK[2];qs=2}
    if(!Mp.has(e.typ)&&F&&ruht&&!nf[e.typ]&&Mp.size+nfl.length<BNHART[nS]){nf[e.typ]=1;nfl.push(e.typ)}      // erst Kartenblatt, dann Nahblatt
    if(Q){var qf=lauf?QK.gehen+((Math.floor(t/110)+id)%8):QK.stehen,qx=Math.round(sx-QK.ax*qs);
     if(sitzt){var qk=QK.ay-Math.round(7/Z/qs);g.drawImage(Q.c,qf*QK.w,re*QK.h,QK.w,qk,qx,Math.round(sy-qk*qs),QK.w*qs,qk*qs)}      // Oberkörper über der Bank (wie unten)
     else g.drawImage(Q.c,qf*QK.w,re*QK.h,QK.w,QK.h,qx,Math.round(sy-QK.ay*qs),QK.w*qs,QK.h*qs);return}}
   if(F){var dw=Math.max(1,Math.round(FK.w/Z)),ox=Math.round(sx-FK.ax/Z);
    if(sitzt){var keep=FK.ay-7,dk=Math.max(1,Math.round(keep/Z));g.drawImage(F.c,fr*FK.w,re*FK.h,FK.w,keep,ox,Math.round(sy-dk),dw,dk)}      // Oberkörper über der Bank
    else{var dh=Math.max(1,Math.round(FK.h/Z));g.drawImage(F.c,fr*FK.w,re*FK.h,FK.w,FK.h,ox,Math.round(sy-FK.ay/Z),dw,dh)}return}
   var PB=PBILD&&PBILD[e.dir&3];
   if(PB&&!sitzt)g.drawImage(PB.c,Math.round(sx-PB.ax/Z),Math.round(sy-PB.ay/Z),Math.max(1,Math.round(PB.w/Z)),Math.max(1,Math.round(PB.h/Z)));
   else{g.fillStyle=ERSATZ;var eh=sitzt?12:20;g.fillRect(Math.round(sx-3/Z),Math.round(sy-eh/Z),Math.max(2,Math.round(6/Z)),Math.max(2,Math.round(eh/Z)))}});
  M.besucherSichtbar=n;M.besucherHinten=hinten;besGeht=geht;besFehltL=fl;M.besFehlt=fl.length;besNahFehltL=nfl;besNahStufe=nS;M.besNahFehlt=nfl.length;
  if((fl.length||nfl.length)&&ruht&&o.beiBesFehlt&&t-besMeldT>250){besMeldT=t;setTimeout(o.beiBesFehlt,0)}}
 function BESU_Q(e){e.sx=-1e9}
 function besucherBei(cx,cy){var r=cv.getBoundingClientRect(),f=cv.width/(r.width||1),px=(cx-r.left)*f,py=(cy-r.top)*f,best=null,bd=20*f*f*20;
  BESU.forEach(function(e,id){if(e.sx==null||e.sx<-1e8)return;var dx=e.sx-px,dy=e.sy-(e.sitzt?6:10)*f/(zf())-py,d=dx*dx+dy*dy;if(d<bd){bd=d;best={id:id,typ:e.typ,st:e.st,sp:e.sp,sitz:e.sitz}}});return best}
 // ── G9c1 feste Einzelobjekte (heute nur der Marktstand am Startplatz): Liste vom Spiel, Bild aus der Kartei einmal vorgezeichnet (Ersatzbild grauer Block),
 // gezeichnet nur, wenn im Bild; Antippen wie bei den Personen. Keine eigene Rechenarbeit je Bild außer Lage und Kopieren. ──
 var FEST=[], FBILD={}, FOBJ=null;
 function festSetzen(L){FEST=(L||[]).map(function(e){return{art:e.art,x:e.x,y:e.y,info:e.info||null,r:e.r|0,anl:!!e.anl}}).sort(function(a,b){return(a.x+a.y)-(b.x+b.y)});if(cam&&cam.lod<STUFEN&&!glob)plan()}      // AR1c1: hinten zuerst; große Anlage nach ihrer Mitte (Häuschen hinter dem Ring liegen darunter)
 // AR4: sehr große Bilder (Great Amphitheatre, 2109 × 1237) in Streifen zu 64 Zeilen vorzeichnen, ein Streifen je Zeitscheibe (Regel 20: große Bilder in kleinen Schritten);
 // bis das Bild fertig ist, zeigt die Karte das Ersatzbild. festNeu(art): ein Objekt kam nachträglich (spiel.js spaetObjekt), sein Bild neu holen.
 var FGROSS=600000, FBAU={};
 function festGross(k,b){if(FBAU[k])return;FBAU[k]=1;var c=document.createElement('canvas');c.width=b.w;c.height=b.h;var x2=c.getContext('2d'),y=0;M.festVorMs[k]=0;
  (function teil(){var t0=performance.now(),h=Math.min(64,b.h-y);x2.drawImage(S.zuCanvas({w:b.w,h:h,z:b.z.slice(y,y+h)},S.PALETTE),0,y);y+=h;var ms=performance.now()-t0;if(ms>M.festVorMs[k])M.festVorMs[k]=ms;
   if(y<b.h)setTimeout(teil,0);else{delete FBAU[k];FBILD[k]={c:c,w:b.w,h:b.h,ax:b.ax,ay:b.ay};plan()}})()}
 function festNeu(art){Object.keys(FBILD).forEach(function(k){if(k.indexOf(art+':')===0)delete FBILD[k]});plan()}
 function festBild(art,ri){var k=art+':'+(ri|0);if(k in FBILD)return FBILD[k];var ob=FOBJ&&FOBJ[art],r=null;if(ob&&ob.bild){var b=S.richtungsBild(ob,ri|0)||ob.bild;if(b.w*b.h>FGROSS){FBILD[k]=null;festGross(k,b);return null}
  var t0=performance.now(),c=S.zuCanvas(b,S.PALETTE);r={c:c,w:b.w,h:b.h,ax:b.ax,ay:b.ay};M.festVorMs[k]=performance.now()-t0}
  if(FOBJ)FBILD[k]=r;return r}      // AR1c1: Richtung je Eintrag (Häuschen); große Anlage einmal vorgezeichnet, danach nur Kopieren
 function festMalen(CX,CY,Z,W,H){FEST.forEach(function(e){var x=e.x+.5,y=e.y+.5;x+=Math.round((cam.x-x)/WX)*WX;var h=hoeheBei(umX(Math.floor(x)),Math.floor(y));if(h==null)h=cam.z;
  var sx=((x-y)*32-CX)/Z+W/2,sy=((x+y)*16-h*8-CY)/Z+H/2,B=festBild(e.art,e.r),rx=B?Math.max(B.ax,B.w-B.ax)/Z:64,ry=B?Math.max(B.ay,B.h-B.ay)/Z:80;e.sx=-1e9;e.B=B;e.Z=Z;
  if(sx<-rx||sy<-ry||sx>W+rx||sy>H+ry)return;e.sx=sx;e.sy=sy;      // AR1c1: Ränder nach Bildgröße (Arena 751 × 416)
  if(B)g.drawImage(B.c,Math.round(sx-B.ax/Z),Math.round(sy-B.ay/Z),Math.max(1,Math.round(B.w/Z)),Math.max(1,Math.round(B.h/Z)));
  else{g.fillStyle=ERSATZ;g.fillRect(Math.round(sx-16/Z),Math.round(sy-24/Z),Math.max(3,Math.round(32/Z)),Math.max(3,Math.round(24/Z)))}})}
 function festBei(cx,cy){var r=cv.getBoundingClientRect(),f=cv.width/(r.width||1),px=(cx-r.left)*f,py=(cy-r.top)*f,best=null,bd=28*f*f*28;
  FEST.forEach(function(e){if(e.sx==null||e.sx<-1e8)return;var dx=e.sx-px,dy=e.sy-14*f/(zf())-py,d=dx*dx+dy*dy;if(d<bd){bd=d;best=e}});
  if(!best)FEST.forEach(function(e){if(!e.anl||!e.B||e.sx==null||e.sx<-1e8)return;var B=e.B,u=(px-e.sx)*e.Z/(B.w/2),v=(py-(e.sy-(B.ay-B.h/2)/e.Z))*e.Z/(B.h/2);if(u*u+v*v<=1)best=e});      // AR1c1: große Anlage überall im Bild antippbar (Ellipse), Kleines davor zuerst
  return best}
 // FP3: Lage aller Arbeiter und Karren jetzt (gleitend wie auf der Karte) für die First-Person-Ansicht; Karte = Infos wie beim Antippen. Nur Rechnen, kein Bild.
 function bewegte(){var t=performance.now(),L=[];
  PER.forEach(function(e,id){var p=perLage(e,t);L.push({art:'figur-arbeiter',id:id,x:p[0],y:p[1],dir:e.dir,geht:p[2],karte:{id:id,zust:e.zust,auf:e.auf,darf:e.darf,grund:e.grund,last:e.last,f0:e.f0,f1:e.f1,fa:e.fa,fb:e.fb},typ:'person'})});
  TIER.forEach(function(e,id){var p=tierLage(e,t);L.push({art:'tier-reh',id:id,x:p[0],y:p[1],dir:e.dir,geht:p[2],karte:{id:id,zust:e.zust},typ:'tier'})});      // G8
  KAR.forEach(function(e,id){var p=karLage(e,t);L.push({art:'karren-ochse',id:id,x:p[0],y:p[1],dir:e.dir,geht:p[2],karte:{id:id,zust:e.zust,grund:e.grund,warte:e.warte||0},typ:'karren'})});
  if(!AR2B_AUS&&!AR2C2_AUS&&BESU.size){var B=BINFO,hc=B?hoeheBei(umX(Math.floor(B.cx)),Math.floor(B.cy)):null;if(hc==null)hc=cam.z;      // AR2c2: Zuschauer (Lage wie auf der Karte), Sitzende schauen zur Mitte
   BESU.forEach(function(e,id){var lg=besLage(e,id,t,B,hc);if(!lg)return;var hx=0,hy=0;if(lg.sitzt&&B){hx=B.cx-lg.x;hy=B.cy-lg.y;var l=Math.hypot(hx,hy)||1;hx/=l;hy/=l}
    L.push({art:'besucher',id:id,x:lg.x,y:lg.y,dir:e.dir|0,geht:lg.geht,typ:'besucher',btyp:e.typ,sitzt:lg.sitzt,hx:hx,hy:hy,karte:{id:id,typ:e.typ,st:e.st,sp:e.sp,sitz:e.sitz}})})}
  FEST.forEach(function(e,i){if(e.anl)return;L.push({art:e.art,id:'f'+i+e.art,x:e.x+.5,y:e.y+.5,dir:0,geht:false,karte:e,typ:'fest'})});      // K0: feste Objekte (Markt, Arena, Medicus, Leiche) auch in First Person; AR1c1: große Anlage noch nicht (AR1c2)
  return L}
 function raumBei(X,Y){if(Y<0||Y>=WY)return 0;X=umX(X);var r=BAUM.get(stk(X,Y));return r?r[((Y&63)<<6)|(X&63)]:0}
 // Räume, die ein Bild der Stufe 1× berühren (Felder darin und die Nachbarn nördlich/westlich, deren Vorderwände in diesem Bild stehen); je Kartenstück 64 Listen.
 function raeume(k){var R=BAUM.get(k);if(!R){TR.delete(k);return}var cx=(k/8192)|0,cy=k%8192,RN=cy>0?BAUM.get(cx*8192+cy-1):null,RW=BAUM.get(modu(cx-1,SX)*8192+cy),L=[];
  for(var t=0;t<64;t++){var bx=(t&7)*8,by=(t>>3)*8,S=null;
   for(var j=-1;j<8;j++)for(var i=-1;i<8;i++){if(i<0&&j<0)continue;var x=bx+i,y=by+j,A=R;if(y<0){if(i<0)continue;A=RN;y=63}else if(x<0){A=RW;x=63}if(!A)continue;var r=A[(y<<6)|x];if(r){if(!S)S=[];if(S.indexOf(r)<0)S.push(r)}}
   L.push(S?S.sort(function(a,b){return a-b}):null)}
  TR.set(k,L)}
 function offenBei(x0,y0){if(!OFFEN.length)return null;var L=TR.get(stk(x0,y0));if(!L)return null;var S=L[((y0&63)>>3)*8+((x0&63)>>3)];if(!S)return null;var o=null;
  for(var i=0;i<S.length;i++)if(OFFEN.indexOf(S[i])>=0)(o||(o=[])).push(S[i]);return o}
 // Dach offen (wie 2.0): nur in 1×, Raum in der Bildmitte, unter der Maus und angetippte
 function offenSetzen(){var L=[];if(!glob&&cam.lod===0&&BAUM.size&&!wahl){fest.forEach(function(r){L.push(r)});var m=raumBei(Math.floor(cam.x),Math.floor(cam.y));if(m&&L.indexOf(m)<0)L.push(m);if(hoverR&&L.indexOf(hoverR)<0)L.push(hoverR)}
  L.sort(function(a,b){return a-b});var t=L.join(',');if(t!==offenS){offenS=t;OFFEN=L}}
 // Vom Weltkern (über kernstart.js beiBau): geänderte Stücke an den Bildkern, Raumnummern behalten, betroffene Bilder als alt markieren
 function beiBau(d){if(tot)return;var L=d.stuecke||[],tr=[],neuK=[];
  if(d.leer){BAUM.forEach(function(v,k){neuK.push(k)});BAUM.clear();TR.clear();fest.clear()}
  for(var i=0;i<L.length;i++){var e=L[i];if(e[1]){BAUM.set(e[0],new Uint32Array(e[1].buffer.slice(16384,32768)));tr.push(e[1].buffer)}else BAUM.delete(e[0]);neuK.push(e[0])}
  if(!neuK.length&&!d.leer)return;
  if(bk)bk.postMessage({art:'bau',leer:!!d.leer,stuecke:L},tr);
  var nach=new Set();neuK.forEach(function(k){var cx=(k/8192)|0,cy=k%8192;nach.add(k);nach.add(modu(cx+1,SX)*8192+cy);if(cy+1<SY)nach.add(cx*8192+cy+1);stV.set(k,++BV)});
  nach.forEach(raeume);
  bilder.forEach(function(b,key){if(b.lod>=STUFEN)return;if(neuK.indexOf(stk(b.x0,b.y0))>=0)altB.add(key)});
  fest.forEach(function(r){var da=false;BAUM.forEach(function(R){if(!da)for(var q=0;q<4096;q++)if(R[q]===r){da=true;break}});if(!da)fest.delete(r)});
  M.bauStuecke=BAUM.size;plan()}
 // Bau-Werkzeug: Bildschirmpunkt → Feld auf Höhe der Kamera (wie feldBei, ohne Bildkern; die Vorschau des Weltkerns prüft genau)
 function feldFlach(cx,cy){var r=cv.getBoundingClientRect(),f=cv.width/(r.width||1),Z=zf(),PX=(cam.x-cam.y)*32+((cx-r.left)*f-cv.width/2)*Z,PY=(cam.x+cam.y)*16+((cy-r.top)*f-cv.height/2)*Z;   // Boden auf Kamerahöhe
  return{x:Math.floor(umX((PX/32+PY/16)/2)),y:Math.max(0,Math.min(WY-1,Math.floor((PY/16-PX/32)/2)))}}
 // G5c: Eckpunkt des Feldrasters unter dem Finger (für Wandlinien)
 function eckeFlach(cx,cy){var r=cv.getBoundingClientRect(),f=cv.width/(r.width||1),Z=zf(),PX=(cam.x-cam.y)*32+((cx-r.left)*f-cv.width/2)*Z,PY=(cam.x+cam.y)*16+((cy-r.top)*f-cv.height/2)*Z;
  return{x:Math.round((PX/32+PY/16)/2),y:Math.max(0,Math.min(WY-1,Math.round((PY/16-PX/32)/2)))}}
 // Linie von Eckpunkt a nach b, gerade nach der längeren Richtung: r 0 = waagerecht (Nordkanten), r 1 = senkrecht (Westkanten); null, solange sie keine Kante lang ist
 function wzLinie(a,b){var dx=b.x-a.x;if(dx>WX/2)dx-=WX;else if(dx<-WX/2)dx+=WX;var dy=b.y-a.y;
  if(Math.abs(dx)>=Math.abs(dy)){if(!dx)return null;return{r:0,x:umX(dx<0?a.x+dx:a.x),y:a.y,n:Math.abs(dx)}}
  return{r:1,x:umX(a.x),y:dy<0?b.y:a.y,n:Math.abs(dy)}}
 // G6b: Wegprobe. wzPfad = {punkte: Int32Array X,Y …, orte: Int32Array X,Y … (Straßennetz, gestrichelt), a: [X,Y] Startpunkt, ok}. Nur eine Linie, kein Bodenbild.
 var wzPfad=null;
 function pfadMalen(CX,CY,Z,W,H){var a=wzPfad,hz=cam.z*8,P=function(x,y){x+=Math.round((cam.x-x)/WX)*WX;return[((x-y)*32-CX)/Z+W/2,((x+y)*16-hz-CY)/Z+H/2]},i,q;
  g.lineCap='round';g.lineJoin='round';
  if(a.orte&&a.orte.length>=2){g.setLineDash([8,6]);g.lineWidth=Math.max(2,3/Z);g.strokeStyle='#f0c868';g.beginPath();q=P(a.orte[0]+.5,a.orte[1]+.5);g.moveTo(q[0],q[1]);
   for(i=2;i<a.orte.length;i+=2){q=P(a.orte[i]+.5,a.orte[i+1]+.5);g.lineTo(q[0],q[1])}g.stroke();g.setLineDash([])}
  var L=a.punkte;if(L&&L.length>=2){g.lineWidth=Math.max(2,5/Z);g.strokeStyle=a.ok?'#b4cc6c':'#e05a34';g.beginPath();q=P(L[0]+.5,L[1]+.5);g.moveTo(q[0],q[1]);
   for(i=2;i<L.length;i+=2){q=P(L[i]+.5,L[i+1]+.5);g.lineTo(q[0],q[1])}g.stroke()}
  if(a.a){q=P(a.a[0]+.5,a.a[1]+.5);kreuz(q[0],q[1])}if(L&&L.length>=2){q=P(L[L.length-2]+.5,L[L.length-1]+.5);kreuz(q[0],q[1])}
  g.lineCap='butt';g.lineJoin='miter'}
 function rahmenMalen(CX,CY,Z,W,H){var a=wzRahmen,xu=a.x+Math.round((cam.x-a.x)/WX)*WX,hz=cam.z*8,P=function(x,y){return[((x-y)*32-CX)/Z+W/2,((x+y)*16-hz-CY)/Z+H/2]};
  var p=[P(xu,a.y),P(xu+a.w,a.y),P(xu+a.w,a.y+a.h),P(xu,a.y+a.h)];g.lineWidth=Math.max(1,2/Z*2);
  g.fillStyle=a.ok?'rgba(70,98,30,.35)':a.ok===false?'rgba(140,26,16,.35)':'rgba(240,200,104,.25)';g.strokeStyle=a.ok?'#b4cc6c':a.ok===false?'#e05a34':'#f0c868';
  if(a.n!=null){var e=a.r===0?P(xu+a.n,a.y):P(xu,a.y+a.n);g.lineWidth=Math.max(3,6/Z);g.lineCap='round';g.beginPath();g.moveTo(p[0][0],p[0][1]);g.lineTo(e[0],e[1]);g.stroke();g.lineCap='butt'}   // G5c: Wandlinie
  else{g.beginPath();g.moveTo(p[0][0],p[0][1]);for(var i=1;i<4;i++)g.lineTo(p[i][0],p[i][1]);g.closePath();g.fill();g.stroke()}
  if(a.fx!=null){var q=P(a.fx+Math.round((cam.x-a.fx)/WX)*WX+.5,a.fy+.5);kreuz(q[0],q[1])}}

 // ── Eingabe: Wischen, Zwei-Finger-Zoom, Mausrad, Antippen ──
 var zeiger=new Map(), zieht=false, kneifAb=0;
 function schieben(dx,dy){if(glob){var fg=cv.width/(cv.clientWidth||1),R=globR();glob.lon=modu(glob.lon-dx*fg/R,ZP);glob.lat=Math.max(-1.35,Math.min(1.35,glob.lat+dy*fg/R));plan();return}
  var f=cv.width/(cv.clientWidth||1)*(zf()),X=-dx*f/32,Y=-dy*f/16;cam.x=umX(cam.x+(X+Y)/2);cam.y=halteY(cam.y+(Y-X)/2);blick();plan()}
 function zoom(d){
  if(glob){var n=globStufen(cv.width,cv.height).length;if(glob.g>=n)glob.g=n-1;var g2=glob.g+d;if(g2<0){var p=globNach();zurKarte(p.x,p.y,MAXL);return}if(g2>=n)return;glob.g=g2;plan();melden();return}
  // F1c: Stufe 2× (cam.nah) vor 1×: Karte bleibt Stufe 0, nur doppelt groß; Figuren im Bild bekommen die volle Figur
  if(d<0&&cam.lod===0){if((cam.nah|0)<(Z4AUS?1:2)){cam.nah=(cam.nah|0)+1;zoomZeit=performance.now();plan();setTimeout(plan,RUHE_MS+20);melden()}return}
  if(d>0&&cam.nah){cam.nah=cam.nah===2?1:false;zoomZeit=performance.now();plan();melden();return}
  var l=cam.lod+d;if(l>MAXL){if(!hatKam||gen<0)return;glob={g:0,lon:cam.x/WX*ZP,lat:(.5-cam.y/WY)*Math.PI};plan();melden();return}
  l=Math.max(0,l);if(l===cam.lod)return;var war=cam.lod;cam.lod=l;zoomZeit=performance.now();if(war>=STUFEN&&l<STUFEN){blickK=-1;zFest=false;blick()}plan();setTimeout(plan,RUHE_MS+20);melden()}
 function abstand(){var p=Array.from(zeiger.values());return Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}
 var wzA=null;                                                                   // G5b: Startfeld des Rechtecks (Bau-Werkzeug)
 function wzAn(){return WZ&&WZ.aktiv()&&!glob&&!wahl&&cam.lod<STUFEN&&wzForm()!=='tipp'}    // G5c: Tipp-Werkzeuge (Tür, Hülle) lassen die Karte verschieben
 function wzForm(){return WZ&&WZ.form?WZ.form():'rechteck'}
 function wzRechteck(a,b){return{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x)+1,h:Math.abs(a.y-b.y)+1}}
 cv.addEventListener('pointerdown',function(e){zeiger.set(e.pointerId,{x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY});try{cv.setPointerCapture(e.pointerId)}catch(x){}
  if(zeiger.size===1){zieht=false;wzA=null}else if(zeiger.size===2){kneifAb=abstand();zieht=true;if(wzA){wzA=null;wzRahmen=null;if(WZ)WZ.weg();plan()}}});
 cv.addEventListener('pointermove',function(e){var p=zeiger.get(e.pointerId);
  if(!p){if(e.pointerType==='mouse'&&!zeiger.size&&cam.lod===0&&BAUM.size&&!glob){var w=feldFlach(e.clientX,e.clientY),r=raumBei(w.x,w.y);if(r!==hoverR){hoverR=r;plan()}}return}   // Dach unter der Maus (wie 2.0)
  var dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(zeiger.size===1){if(!zieht&&Math.abs(p.x-p.x0)+Math.abs(p.y-p.y0)<8){p.x-=dx;p.y-=dy;return}zieht=true;
   if(wzAn()){var lin=wzForm()==='linie';if(!wzA)wzA=lin?eckeFlach(p.x0,p.y0):feldFlach(p.x0,p.y0);
    if(lin){var L=wzLinie(wzA,eckeFlach(e.clientX,e.clientY));if(!L){if(wzRahmen){wzRahmen=null;WZ.weg()}plan();return}
     if(!wzRahmen||wzRahmen.r!==L.r||wzRahmen.x!==L.x||wzRahmen.y!==L.y||wzRahmen.n!==L.n){wzRahmen=L;WZ.zieht(L)}plan();return}
    var b=feldFlach(e.clientX,e.clientY),R=wzRechteck(wzA,b);if(!wzRahmen||wzRahmen.x!==R.x||wzRahmen.y!==R.y||wzRahmen.w!==R.w||wzRahmen.h!==R.h){wzRahmen=R;WZ.zieht(R)}plan();return}
   schieben(dx,dy)}
  else if(zeiger.size===2&&kneifAb>0){if(wzAn())schieben(dx/2,dy/2);var a=abstand();if(a>kneifAb*1.45){zoom(-1);kneifAb=a}else if(a<kneifAb/1.45){zoom(1);kneifAb=a}zoomZeit=performance.now()}});
 cv.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse'&&hoverR){hoverR=0;plan()}});
 function los(e){var p=zeiger.get(e.pointerId);if(!p)return;zeiger.delete(e.pointerId);
  if(wzA&&e.type==='pointerup'&&!zeiger.size&&wzRahmen){var R=wzRahmen;wzA=null;WZ.fertig(R);if(!zeiger.size)plan();return}
  if(wzA&&!zeiger.size){wzA=null;wzRahmen=null;if(WZ)WZ.weg()}
  if(e.type==='pointerup'&&!zieht&&!zeiger.size)tipp(e.clientX,e.clientY);if(!zeiger.size)plan()}
 cv.addEventListener('pointerup',los);cv.addEventListener('pointercancel',los);
 var radZeit=0;cv.addEventListener('wheel',function(e){e.preventDefault();var t=performance.now();if(t-radZeit<160)return;radZeit=t;zoom(e.deltaY>0?1:-1)},{passive:false});
 function feldBei(cx,cy){return new Promise(function(ok){if(!bk)return ok(null);var r=cv.getBoundingClientRect(),Z=zf(),f=cv.width/(r.width||1),id=++feldNr;feldOk[id]=ok;
  bk.postMessage({art:'feld',id:id,offen:OFFEN,px:(cam.x-cam.y)*32+((cx-r.left)*f-cv.width/2)*Z,py:(cam.x+cam.y)*16-cam.z*8+((cy-r.top)*f-cv.height/2)*Z})})}
 function tipp(cx,cy){if(wahl){if(cam.lod<STUFEN&&!glob)feldBei(cx,cy).then(function(fd){var w=fd&&fd.x!=null?fd:weltBei(cx,cy);if(w&&wahl)wahl.beiTipp(w.x,w.y)});else{var w=weltBei(cx,cy);if(w)wahl.beiTipp(w.x,w.y)}return}
  if(glob){var r=cv.getBoundingClientRect(),f=cv.width/(r.width||1),R=globR(),x=((cx-r.left)*f-cv.width/2)/R,y=-((cy-r.top)*f-cv.height/2)/R,q=x*x+y*y;if(q>=1)return;
   var z=Math.sqrt(1-q),cl=Math.cos(glob.lat),sl=Math.sin(glob.lat),la=Math.asin(y*cl+z*sl),lo=glob.lon+Math.atan2(x,z*cl-y*sl),gx=modu(lo/ZP,1)*WX,gy=(.5-la/Math.PI)*WY;
   if(!N7B2||!o.beiStadt){zurKarte(gx,gy,3);return}var gl={lon:glob.lon,lat:glob.lat,R:R};   // N7b2: Großstadt oder Hauptstadt unter dem Finger → Stadtkarte, sonst Sprung in die Karte
   frage('stadt',{x:x,y:y,T:tippT(f),glob:gl}).then(function(a){if(a&&a.ort){o.beiStadt(a.ort);return}if(glob&&glob.lon===gl.lon&&glob.lat===gl.lat)zurKarte(gx,gy,3)});return}
  if(cam.lod>=STUFEN&&N7B2&&o.beiStadt){var ws=weltBei(cx,cy),fs=cv.width/(cv.getBoundingClientRect().width||1);if(ws)frage('stadt',{x:ws.x,y:ws.y,Z:zf(),T:tippT(fs),mini:cam.lod<=9}).then(function(a){if(a&&a.ort)o.beiStadt(a.ort)})}   // N7b2: Ortssymbol unter dem Finger → Stadtkarte
  if(cam.lod>=STUFEN){var wr=o.beiReich?weltBei(cx,cy):null;if(wr){frage('reich',{x:wr.x,y:wr.y}).then(function(a){if(a&&!a.fehlt)o.beiReich(a.reich,a.hat,a.ort,a.strasse)});return}if(o.beiFeld)o.beiFeld(null);return}   // N4c1: Fernansicht: wem gehört das Land
  if(o.beiPerson&&!WZ_AKTIV()){var pp=personBei(cx,cy);if(pp&&o.beiPerson(pp)!==false)return}      // G7: Arbeiter zuerst (stehen vor dem Karren)
  if(o.beiBesucher&&!WZ_AKTIV()){var bb=besucherBei(cx,cy);if(bb&&o.beiBesucher(bb)!==false)return}      // AR2b: Zuschauer
  if(o.beiKarren&&!WZ_AKTIV()){var kk=karrenBei(cx,cy);if(kk&&o.beiKarren(kk)!==false)return}
  if(o.beiTier&&!WZ_AKTIV()){var tt=tierBei(cx,cy);if(tt&&o.beiTier(tt)!==false)return}      // G8
  if(o.beiFest&&!WZ_AKTIV()){var fe=festBei(cx,cy);if(fe&&o.beiFest(fe)!==false)return}      // G9c1: Marktstand
  feldBei(cx,cy).then(function(fd){var r=fd&&fd.bau&&fd.bau.raum;                              // G5b: Gebäude antippen schaltet in 1× sein Dach auf/zu (wie 2.0)
   if(r&&cam.lod===0&&!WZ_AKTIV()){if(fest.has(r))fest.delete(r);else fest.add(r);if(fd)fd.dachOffen=fest.has(r);plan()}
   if(o.beiFeld)o.beiFeld(fd)})}
 function tippT(f){return Math.max(10,14*f)}   // N7b2: Trefferweite fürs Antippen eines Ortssymbols in Bildpunkten (etwa ein Fingerabdruck)
 function WZ_AKTIV(){return !!(WZ&&WZ.aktiv())}
 if(window.ResizeObserver)new ResizeObserver(plan).observe(cv);else addEventListener('resize',plan);
 plan();
 // ── Natur (G4b): Bilder der übernommenen Naturobjekte einmal an den Bildkern; danach alle Bodenbilder neu (mit Natur). Rest = graues Ersatzbild. ──
 var NOBJ=null, NARTEN=null, BARTEN=[];
 function natur(objekte){NOBJ=objekte||{};FOBJ=NOBJ;FBILD={};karBilder(NOBJ);perBilder(NOBJ);tierBilder(NOBJ);naturSenden()}
 function naturSenden(){if(!bk||!NOBJ||!NARTEN)return;var objekte=NOBJ,arten=NARTEN,liste=[],tr=[],ers=0;NOBJ=null;
  function bild(id){var ob=objekte&&objekte[id];if(!ob||!ob.bild)return null;var b=ob.bild,px=new Uint8Array(b.w*b.h).fill(255);
   for(var y=0;y<b.h;y++){var r=b.z[y];for(var x=0;x<b.w;x++){var c=S.ZEICHEN.indexOf(r[x]);if(c>=0)px[y*b.w+x]=c}}
   tr.push(px.buffer);return{w:b.w,h:b.h,ax:b.ax,ay:b.ay,px:px}}
  arten.forEach(function(id){var b=bild(id);if(!b)ers++;liste.push(b)});
  M.bauErsatz=0;var bau=BARTEN.map(function(id){var b=bild(id);if(!b)M.bauErsatz++;return b});M.bauArten=bau.length;   // G5b: Wand, Tür, Tor, Dach (nicht übernommen → grau)
  var grau=S.naechste(132,128,122,S.PALETTE);bk.postMessage({art:'natur',liste:liste,bau:bau,grau:grau,rand:S.dunkler(grau)},tr);
  M.naturArten=arten.length-ers;M.naturErsatz=ers;NV++;bilderWeg();fehlt.clear();M.natur=0;plan()}   // Bilder, die noch ohne Natur unterwegs sind, kommen mit alter NV und fliegen weg
 function frage(f,w){return new Promise(function(ok){if(!bk||gen<0)return ok({fehlt:true});var id=++frageNr,m={art:'wahl',frage:f,id:id,gen:gen};for(var k in w)m[k]=w[k];fragen[id]=ok;bk.postMessage(m)})}
 return{reiche:reiche,beiWs:beiWs,mess:M,messNeu:function(){M.maxRechenUs=0;M.maxScharfMs=0;M.maxGScharfMs=0;M.maxZeichenMs=0;M.maxFestMs=0;M.ortMaxMs=0;M.hausMs=0;M.listeMs=0;if(bk)bk.postMessage({art:'messNeu'})},frage:frage,zoom:zoom,plan:plan,feldBei:feldBei,natur:natur,beiBau:beiBau,karren:karren,personen:personen,besucher:besucher,besucherArena:besucherArena,festNeu:festNeu,besucherBlaetter:besucherBlaetter,besucherFehlt:function(){var L=besFehltL.slice();FPFEHLT.forEach(function(i){if(L.indexOf(i)<0)L.push(i)});return L.filter(function(i){return !BFIG.has(i)})},
  besucherWunsch:function(L){FPFEHLT=(L||[]).filter(function(i){return !BFIG.has(i)});if(FPFEHLT.length)M.besFpWunsch=(M.besFpWunsch||0)+1;var t=performance.now();if(FPFEHLT.length&&o.beiBesFehlt&&t-besMeldT>250){besMeldT=t;setTimeout(o.beiBesFehlt,0)}},      // AR2c2: First Person bestellt nach,besucherHat:function(i){return BFIG.has(i)},
  besucherNahFehlt:function(){return besNahFehltL.length?{stufe:besNahStufe,typen:besNahFehltL.slice()}:null},besucherNahBlaetter:besucherNahBlaetter,      // Z4b
  besucherNahTest:function(s){var L=[];BN[s===4?4:2].forEach(function(v,typ){L.push({typ:typ,c:v.c})});return L},
  besucherBild:function(t){var F=BFIG.get(t);return F?{w:F.w,h:F.h,p64:F.p64,vh:F.vh,fw:FK.w,fh:FK.h,ax:FK.ax,ay:FK.ay,vhN:FK.vhN||0,gehen:FK.gehen|0,stehen:FK.stehen|0}:null},      // AR2c1: für First Person (AR2c2)
  besucherListe:function(){var L=[];BESU.forEach(function(e,id){L.push({id:id,st:e.st,typ:e.typ,sitz:e.sitz,pr:e.pr,sp:e.sp,sx:e.sx,sy:e.sy,sitzt:!!e.sitzt,bild:BFIG.has(e.typ)})});return L},figurBlaetter:figurBlaetter,figurVergessen:figurVergessen,figurTest:function(){var L=[];FIG.forEach(function(f){L.push(f.c)});if(FLAST)L.push(FLAST.c);return L},figurHat:function(id,gv){var f=FIG.get(id);GV[id]=gv;return !!f&&(gv==null||f.gv===gv)},nahStufe:nahStufe,nahLastFehlt:function(st){return st===4?!FN4LAST:!FNLAST},nah4Test:function(){var L=[];FN4.forEach(function(f){L.push(f.c)});if(FN4LAST)L.push(FN4LAST.c);return L},nahHat:function(id,gv){var f=(nahStufe()===4?FN4:FN).get(id);return !!f&&(gv==null||f.gv===gv)},nahSichtbar:function(){var L=[];PER.forEach(function(e,id){if(e.sx!=null&&e.sx>-1e8)L.push(id)});return L},nahTest:function(){var L=[];FN.forEach(function(f){L.push(f.c)});if(FNLAST)L.push(FNLAST.c);return L},tiere:tiere,bewegte:bewegte,fest:festSetzen,
  festListe:function(){return FEST.map(function(e){return{art:e.art,x:e.x,y:e.y,r:e.r,anl:e.anl,sx:e.sx,sy:e.sy,bild:!!FBILD[e.art+':'+(e.r|0)]}})},
  tiereListe:function(){var t=performance.now(),L=[];TIER.forEach(function(e,id){var p=tierLage(e,t);L.push({id:id,x:p[0],y:p[1],dir:e.dir,zust:e.zust,bild:!!TBILD,sx:e.sx,sy:e.sy})});return L},
  personenListe:function(){var t=performance.now(),L=[];PER.forEach(function(e,id){var p=perLage(e,t);L.push({id:id,x:p[0],y:p[1],dir:e.dir,zust:e.zust,auf:e.auf,darf:e.darf,grund:e.grund,last:e.last,f0:e.f0,f1:e.f1,fa:e.fa,fb:e.fb,bild:!!PBILD,sx:e.sx,sy:e.sy,verdeckt:!!e.verdeckt})});return L},
  karrenListe:function(){var t=performance.now(),L=[];KAR.forEach(function(e,id){var p=karLage(e,t);L.push({id:id,x:p[0],y:p[1],dir:e.dir,zust:e.zust,grund:e.grund,warte:e.warte||0,bild:!!KBILD,sx:e.sx,sy:e.sy,verdeckt:!!e.verdeckt})});return L},
  stauZeichen:function(){return !!STAU},
  // G6c2: Feld an einer Weltlage abfragen (wie Antippen, ohne Bildschirm)
  feldAn:function(x,y){return new Promise(function(ok){if(!bk)return ok(null);var h=hoeheBei(umX(Math.floor(x)),Math.floor(y));if(h==null)h=cam.z;var id=++feldNr;feldOk[id]=ok;
   bk.postMessage({art:'feld',id:id,offen:OFFEN,px:(x-y)*32,py:(x+y)*16-h*8})})},
  // G5b: Bau-Werkzeug anschließen: {aktiv() → bool, zieht(R), fertig(R), weg(), form() → 'rechteck'|'linie'|'tipp' (G5c)}; Linie R = {r, x, y, n}; rahmen(R|null, ok, fx, fy) zeigt die Vorschau
  werkzeug:function(w){WZ=w},pfad:function(P){wzPfad=P||null;plan()},rahmen:function(R,ok,fx,fy){wzRahmen=R?{x:R.x,y:R.y,w:R.w,h:R.h,r:R.r,n:R.n,ok:ok,fx:fx,fy:fy}:null;plan()},
  dach:function(){return{offen:OFFEN.slice(),fest:Array.from(fest)}},dachUm:function(r){if(fest.has(r))fest.delete(r);else fest.add(r);plan()},raumBei:raumBei,
  kam:function(){return hatKam&&!wahl?[Math.floor(cam.x),Math.floor(cam.y),cam.lod]:null},
  kamera:function(){return{x:cam.x,y:cam.y,z:cam.z,lod:cam.lod,gesetzt:hatKam,globus:glob?{g:glob.g,lon:glob.lon,lat:glob.lat,n:globStufen(cv.width,cv.height).length}:null}},
  geh:function(x,y,lod){glob=null;cam.x=umX(x);cam.y=halteY(y);if(lod!=null)cam.lod=lod;hatKam=true;zFest=false;blickK=-1;blick();plan()},
  schieben:schieben,ende:function(){ende(null)},
  // G4d: Startplatz-Wahl in der Karte
  wahlStart:function(beiTipp,beiBereit){wahl={beiTipp:beiTipp,bereit:beiBereit||null};marke=null;hatKam=true;glob={g:99,lon:Math.PI,lat:.3};plan();melden()},
  wahlEnde:function(){wahl=null;marke=null;plan()},
  marke:function(x,y){marke=x==null?null:{x:x+.5,y:y+.5};plan()},
  zeigeAuf:function(x,y){if(glob){glob.lon=modu(x/WX*ZP,ZP);glob.lat=Math.max(-1.35,Math.min(1.35,(.5-y/WY)*Math.PI))}else{cam.x=umX(x);cam.y=halteY(y);zFest=false;blick()}plan()}}}

window.AT3KARTE={starten:starten,STUFEN:STUFEN,MAXL:MAXL,SPEICHER:SPEICHER,WX:WX,WY:WY,POL:POL};
})();
