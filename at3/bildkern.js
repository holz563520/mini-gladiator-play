// WAS DIE DATEI TUT: Bildkern von Arena Theory 3.0 (Schritt G4a). Ein eigener Hintergrundkern nur für die Kartenansicht: bekommt vom Hauptkern einmal das
// Erdraster (vom Weltkern), rechnet die Kartenstücke, die er zum Zeichnen braucht, selbst aus Seed und Erde (weltgen.js; reine Ansicht, gehört nicht zum Spielzustand,
// darum geht die Karte auch in der Pause), und macht daraus auf Anfrage Bodenbilder (bodenbild.js), die er als fertiges Bild zurückgibt (ImageBitmap; wo der Browser
// das im Hintergrund nicht kann, als Zahlenfeld). Hält höchstens die 7 × 7 Stücke um den Blick (Puffer werden wiederverwendet), nächste zuerst, eins nach dem anderen.
// Dazu: „welches Feld liegt unter dem Finger“ und der automatische Startplatz (erstes Dorf von der Weltmitte aus; nur noch für ?nosave und Tests).
// G4c: Startplatz-Wahl (startplatz.js): Erdbild, Regionsbild, trockenes Feld mit nächstem Ort, zufälliger Platz an Land; Antwort mit der Fragenummer.
// G4b: backt die Natur aus dem Startset (natur.js) mit ins Bodenbild und findet beim Antippen das vorderste Naturobjekt unter dem Finger.
// W1c Runde Welt: Das Fenster der Stücke läuft in x über die Naht (hole rechnet die Stückspalte um), in y endet es am Pol.
// N7h2: in der scharfen Fassung Flüsse und Straßen aus den Läufen des Kartenstücks (fernbild.js netzFein), Notausschalter ?n7h2=0.
// N7h3: scharfer Globus auf Wunsch der Karte („gscharf“): Kacheln der feinen Erdtextur in Zeitanteilen, gemerkt bis 8 MB, Globus in voller Auflösung.
// N7h1: scharfe Fernbilder auf Wunschliste der Karte („scharf“), ein Auftrag zugleich, je Durchlauf höchstens 6 ms, neue Liste bricht Überholtes ab.
// G4d: Fernbilder der Stufen ⅟16 bis ⅟4096 (fernbild.js, nur aus dem Erdraster, ohne Kartenstücke) und der Globus (Frage „globus“, aus dem Erdbild der Startplatz-Wahl).
// FP1: Frage „fp“: Ausschnitt der echten Welt für die First-Person-Ansicht (fpausschnitt.js). FP2a: mit Wänden, Türen, Toren und Gebäudeböden.
// G5b: Gebäude (baubild.js). Der Hauptkern reicht die geänderten Bau-Kartenstücke vom Weltkern weiter (Nachricht „bau“, dünn: nur wo gebaut ist) und die Bilder
// aus dem Startset („bauBilder“). Bodenbilder bekommen Boden, Wände und Dach mit; auf Gebautem und Gerodetem keine Natur (auch nicht in First Person).
// Anfrage „bild“ mit „offen“ (Räume ohne Dach, nur Stufe 1×). Antippen findet das vorderste Bauteil oder die Natur davor und meldet das Gebäudefeld.
// Kerne: läuft nur als Hintergrundkern (Worker), gestartet von weltkarte.js, nie auf dem Hauptkern (Regel 13). Kein Zufall, kein Tick, keine Wirkung aufs Spiel.
// N4c1: Reiche in Fernbildern und Globus (herrschaften.js; Tafel Reich je Erdzelle einmal je Welt, Nachricht „reiche“ schaltet um), Frage „reich“: Kette
// „Answers to“ an einem Weltfeld mit Ortsnamen der Sitze. N5b: dazu der nächste Ort (orte.js, erst beim ersten Antippen geladen; Notausschalter ?n5b=0).
// N5c: dazu die Umgebung des Orts und sein Ortspunkt für die Außenposten (aussenposten.js, erst beim ersten Antippen geladen; Notausschalter ?n5c=0).
// N5d: dazu die Straße unter dem Finger mit Rang, Bauweise, Haltepunkt und beiden Orten (strassen.js, Netz einmal je Welt beim ersten Antippen; Notausschalter ?n5d=0).
// N7a2a: Ortsflächen (ortsflaeche.js): Pläne der Orte im Fenster kommen vom Ortskern (ortskern.js, eigener Hintergrundkern über einen MessageChannel; ohne ihn
// eingebettet hier in den Pausen), das Gelände darunter wird eingeebnet, Bodenbilder zeigen das Ersatzbild (Planfelder, Klötze), keine Natur auf der Fläche;
// Park gewinnt (Kartenstück mit Gebautem bleibt, wie es ist); Startplatz-Wahl hält Abstand von Orten. Notausschalter ?n7a2=0.
// N7a2b1: echte Böden der Orte in 1× aus der Kartei (stadtbild.js elemente().boden, karteilader.js höchstens 4 MB, nur gebrauchte Bilder); Notausschalter ?n7a2b=0.
// N7a2b2: echte Häuser, Mauern, Dinge in 1× (ortsflaeche.js schritt/fertige, Gebäudebilder ≤ 2 MB, 4 Orte mit Liste, gebündelt alle 0,3 s); Notausschalter ?n7a2b2=0.
// N7a2c: Außenposten und Gehöfte wie kleine Orte (Postenlisten je Ort vom Ortskern, Hang 8 Felder, eigene Grenzen), Startplatz meidet auch Posten; Notausschalter ?n7a2c=0.
// N7a3a: Stufe ½ mit echten verkleinerten Böden, Häusern, Mauern, Dingen (ortsflaeche.js halb, höchstens 1 MB); Notausschalter ?n7a3=0.
// N7a3b: auch ¼ und ⅛ (¼ aus ½, ⅛ aus ¼, zusammen höchstens 0,5 MB); Notausschalter ?n7a3b=0.
// N7a3c1: Mini-Pläne der Orte für die Fernstufen ⅟16–⅟512 (ortsbild.js mini, vom Ortskern mit jeder Planantwort oder auf „mini“), höchstens MINI_GR (4 MB) gemerkt,
// fehlt einer, steht der Punkt und der Ort wird angefragt; Neues gebündelt (etwa alle 0,3 s) als „fernNeu“ mit den Ortsflächen. Notausschalter ?n7a3c1=0.
// N7a3c2: Frage „namen“: Ortsnamen im Ausschnitt nach Staffel, Zusatz in ⅟16–⅟32 (Notausschalter ?n7a3c2=0 in der Weltkarte: keine Frage).
// N7a2b3: Gebäudebilder in Abschnitten (stadtbild.js bauAuftrag, größter Schritt ≤ 8 ms gedrosselt), Messfeld in der Weltkarte mit ?mess=1; Notausschalter ?n7a2b3=0.
'use strict';
importScripts('bodenbild.js'+self.location.search,'weltgen.js'+self.location.search,'natur.js'+self.location.search,'startplatz.js'+self.location.search,'fernbild.js'+self.location.search,'baubild.js'+self.location.search,'herrschaften.js'+self.location.search);
var HR=self.AT3HERRSCHAFT, REI=true, RE=null;   // N4c1: Reiche in den Fernbildern (Knopf „Realms“), Tafeln einmal je Welt
var BAUB=self.AT3BAUBILD, BAU=new Map(), BBILD=null, SP=self.AT3STARTPLATZ, FB=self.AT3FERN, ON=null, PBUF=null, TEX=null, TEXD=null, UEB=null;
var OR=null, AP=null, SN=null, BB=self.AT3BB, G=self.AT3WG, NAT=self.AT3NATUR, NBILD=null, F=null, st=new Map(), lager=[], gen=-1, HALB=3, A=null, seed=0, kx=-1, ky=-1, laeuft=false;
var N7A2C=!/[?&]n7a2c=0/.test(self.location.search),PD=null,PDL=null,PPK=new Map();   // N7a2c: Posten an?, Daten und Postenpunkte je Ort für den Startplatz
var N7A2=!/[?&]n7a2=0/.test(self.location.search),OFL=null,OK=null,OKP=null,OKE=false,WB=null;   // N7a2a: Ortsflächen, Ortskern (Port), eingebettet?, Warteliste
var BMP=typeof createImageBitmap==='function'&&typeof ImageData!=='undefined', stUs=0, stN=0;
var ORDNUNG=(function(){var L=[];for(var y=-HALB;y<=HALB;y++)for(var x=-HALB;x<=HALB;x++)L.push([x,y,x*x+y*y]);L.sort(function(a,b){return a[2]-b[2]||a[1]-b[1]||a[0]-b[0]});return L})();
var SX=G.SEITE_X, SY=G.SEITE_Y;
function um(cx){cx%=SX;return cx<0?cx+SX:cx}                                    // W1c: Stückspalte über die Naht
function ab(a,b){var d=Math.abs(a-b);return d>SX-d?SX-d:d}
function hole(cx,cy){return st.get(um(cx)*8192+cy)||null}
function holeBau(cx,cy){return BAU.size?BAU.get(um(cx)*8192+cy)||null:null}
function bauFrei(X,Y){return BAUB.frei(holeBau,X,Y)}
// N7a2a: Natur frei = nicht gebaut und nicht in einer Ortsfläche
function natFrei(){var o=OFL&&OFL.orte.size;if(!o)return BAU.size?bauFrei:null;return BAU.size?function(X,Y){return OFL.frei(X,Y)&&bauFrei(X,Y)}:OFL.frei}
function bauHat(k){var a=BAU.get(k);if(!a)return false;for(var i=0;i<4096;i++)if(a[i])return true;return false}
function ofl(){if(!N7A2||OFL===false)return null;if(OFL)return OFL;try{if(!self.AT3ORTSSPERRE)importScripts('ortssperre.js'+self.location.search);importScripts('ortsflaeche.js'+self.location.search,'orte.js'+self.location.search,'aussenposten.js'+self.location.search);
  OFL=self.AT3ORTSFLAECHE.neu(G,BB);OFL.postenAn(N7A2C);if(!OR&&OR!==false)OR=self.AT3ORTE.AUS?false:self.AT3ORTE;if(AP==null)AP=self.AT3POSTEN.AUS?false:self.AT3POSTEN;if(!OR||!AP)OFL=false}catch(x){OFL=false}return OFL||null}
// Anfrage an den Ortskern (Port) oder eingebettet (ohne zweiten Hintergrundkern: hier planen, je Pause ein Ort)
function zumOrtskern(m){if(OKP){OKP.postMessage(m);return}if(!OK){try{self.AT3_ORTSKERN_EINGEBETTET=true;self.AT3_ORTSKERN_ANTWORT=vomOrtskern;importScripts('ortskern.js'+self.location.search);OK=self.AT3ORTSKERN;OKE=true;if(WB)OK.nachricht({art:'welt',gen:gen,seed:seed,buf:WB})}catch(x){OK=false}}
 if(OK)OK.nachricht(m)}
function ortsBedarf(){var O=ofl();if(!O||!A||kx<0)return;var b=O.bedarf(A,seed,OR,AP,kx,ky,HALB,bauHat);
 if(b.vergessen.length)zumOrtskern({art:'vergiss',liste:b.vergessen});b.neu.forEach(function(k){zumOrtskern({art:'plan',gen:gen,k:k})});
 (b.neuP||[]).forEach(function(k){zumOrtskern({art:'posten',gen:gen,k:k})});   // N7a2c: Postenlisten der Orte im weiten Umkreis
 if(b.stuecke&&b.stuecke.length){echteBoeden();var S=[];b.stuecke.forEach(function(k){if(S.indexOf(k)<0)S.push(k)});eingeebnet(S);var ps=O.postenStand();
  self.postMessage({art:'ortNeu',gen:gen,stuecke:S,posten:ps.posten,postenListen:ps.orteMitListe,postenMs:ps.maxMs})}}
// Betroffene, schon gerechnete Stücke einebnen und dem Hauptkern die neue Kurzauskunft schicken (Orte und Posten)
function eingeebnet(L){L.forEach(function(k){var b=st.get(k);if(!b)return;if(OFL.flachen(b,(k/8192)|0,k%8192)){b._s=null;var q=BB.kunde(b);self.postMessage({art:'kunde',gen:gen,cx:(k/8192)|0,cy:k%8192,mm:q.mm,hg:q.hg,stUs:stUs/(stN||1)},[q.mm.buffer,q.hg.buffer])}})}
// Plan eines Orts ist da: aufnehmen, betroffene Stücke einebnen, Kurzauskunft neu, Hauptkern markiert die Bilder als alt
var ORTMS=[];
// N7a2b1: echte Böden der Orte in 1× (Thomas 24.11.2026): stadtbild.js samt Teilen erst beim ersten Ort laden (eingebettet sind sie vom Ortskern schon da),
// Kartei-Bilder nur, wenn ein Bodenbild sie braucht (karteilader.js, höchstens 4 MB); fertig geladen → „ortNeu“ für die wartenden Orte. Notausschalter ?n7a2b=0.
var N7A2B=!/[?&]n7a2b=0/.test(self.location.search),N7A2B2=!/[?&]n7a2b2=0/.test(self.location.search),N7A2B3=!/[?&]n7a2b3=0/.test(self.location.search),N7A3=!/[?&]n7a3=0/.test(self.location.search),N7A3B=!/[?&]n7a3b=0/.test(self.location.search),N7A5A3D=!/[?&]n7a5a3d=0/.test(self.location.search),KL=null,KLL=false,KLN=false;
function echteBoeden(){if(!N7A2B||KL===false||!OFL)return;if(KL)return;var Q=self.location.search;
 try{if(!self.AT3_STADTBILD)importScripts('at3-64.js'+Q,'baubild.js'+Q,'baukasten.js'+Q,'stadtliste.js'+Q,'landwirtschaft.js'+Q,'begehbar.js'+Q,'stadtbild.js'+Q);
  if(!self.AT3KARTEILADER)importScripts('karteilader.js'+Q);
  KL=self.AT3KARTEILADER.neu(function(id){return fetch('kartei/obj/'+encodeURIComponent(id)+'.json'+Q).then(function(r){return r.ok?r.json():null})});OFL.bilder(self.AT3_STADTBILD,KL,{haeuser:N7A2B2,abschnitte:N7A2B3,halb:N7A3,viertel:N7A3B,viertelSpeicher:N7A5A3D?0:524288})}   // N7a5a3d: 0 = Standard 6 MB, ?n7a5a3d=0 = 0,5 MB wie vorher
 catch(x){KL=false}}
function nachladen(){if(!KL||!KL.wuensche())return;if(KLL){KLN=true;return}KLL=true;var g=gen;
 KL.laden().then(function(){KLL=false;if(g===gen&&OFL){var L=OFL.wartende(),k=KL.stand();if(L.length)self.postMessage({art:'ortNeu',gen:gen,stuecke:L,kartei:k.anzahl,karteiB:k.bytes,eMs:OFL.elementeMs()})}
  if(KLN){KLN=false;nachladen()}})}
// N7a2b2: Elementlisten und Gebäudebilder in Zeitanteilen (4 ms, dazwischen kommen Bildanfragen dran); Fertiges gebündelt etwa alle 0,3 s als „ortNeu“ (Thomas 24.11.2026)
var HAUSL=false,HAUSF=0,BUENDEL=300;
function haeuser(){HAUSL=false;if(!OFL||!OFL.schritt)return;var mehr=OFL.schritt(4),t=performance.now();nachladen();
 if(OFL.fertigeZahl()&&t-HAUSF>=BUENDEL){HAUSF=t;var L=OFL.fertige(),h=OFL.haeuser(),h2=OFL.halbStand(),h4=OFL.viertelStand();self.postMessage({art:'ortNeu',gen:gen,stuecke:L,haeuser:h.bilder,hausB:h.bytes,hausMs:h.maxMs,listeMs:h.listeMaxMs,hausPausen:h.pausen,listen:h.listen,halbN:h2.bilder,halbB:h2.bytes,halbMs:h2.maxMs,fernN:h4.bilder,fernB:h4.bytes,fernMs:h4.maxMs})}
 if(mehr||OFL.fertigeZahl()){HAUSL=true;setTimeout(haeuser,mehr?0:Math.max(0,BUENDEL-(t-HAUSF)))}}
function haeuserAn(){if(!HAUSL&&OFL&&OFL.arbeitOffen&&(OFL.arbeitOffen()||OFL.fertigeZahl())){HAUSL=true;setTimeout(haeuser,0)}}
// N7a3c1 (Thomas 25.11.2026): Mini-Pläne gemerkt (älteste fallen heraus), Anfrage je Ort nur einmal, Farbtafel je Palette (Böden wie das Ersatzbild in ⅛)
var N7A3C1=!/[?&]n7a3c1=0/.test(self.location.search),MINI_GR=4194304,MINI=new Map(),MINIB=0,MINIF=new Set(),MININ=[],MINIT=0,MINILUT=null,MINIST={n:0,ms:0,maxMs:0,raus:0};
function miniLut(){if(MINILUT&&MINILUT.F===F)return MINILUT;var O=self.AT3ORTSFLAECHE;if(!O||!F)return null;var t=new Uint8Array(256);
 for(var v=0;v<64;v++)t[v]=v;for(var c=0;c<O.CODES.length;c++)t[128+c]=naechste(F.pal,O.FARBE_RGB[c]);t.F=F;return MINILUT=t}
function naechste(p,c){var b=0,bd=1e9;for(var i=0;i<64;i++){var v=p[i],dr=(v&255)-c[0],dg=((v>>8)&255)-c[1],db=((v>>16)&255)-c[2],d=dr*dr*3+dg*dg*6+db*db;if(d<bd){bd=d;b=i}}return b}
function miniHole(k){var e=MINI.get(k);if(e){MINI.delete(k);MINI.set(k,e);return e}if(!MINIF.has(k)){MINIF.add(k);zumOrtskern({art:'mini',gen:gen,k:k})}return null}
function miniDa(k,o){if(!o||!o.m||!o.W)return;MINIF.delete(k);var e=MINI.get(k);if(e){MINIB-=e.m.length;MINI.delete(k)}
 MINI.set(k,{x0:o.x0,y0:o.y0,W:o.W,m:o.m});MINIB+=o.m.length;while(MINIB>MINI_GR&&MINI.size>1){var k0=MINI.keys().next().value,e0=MINI.get(k0);MINIB-=e0.m.length;MINI.delete(k0);MINIST.raus++}
 if(o.ms!=null){MINIST.n++;MINIST.ms=o.ms;if(o.ms>MINIST.maxMs)MINIST.maxMs=o.ms}
 if(e)return;MININ.push([o.x0,o.y0,o.W]);if(!MINIT)MINIT=setTimeout(miniMelden,BUENDEL)}
function miniMelden(){MINIT=0;if(!MININ.length)return;var L=MININ;MININ=[];self.postMessage({art:'fernNeu',gen:gen,flaechen:L,minis:MINI.size,miniB:MINIB,miniMs:MINIST.maxMs,miniRaus:MINIST.raus})}
// N7b1 (26.11.2026): Ortssymbole nach Größe in den Fernstufen und auf dem Globus. orte.js (Größe G2–G7) wird beim ersten Fernbild geladen; ohne orte.js oder
// mit ?n7b1=0 bleiben die Quadrate wie vorher. Größen einmal je Welt in einer Tafel (4.450 Orte ≈ 4 KB), Globus-Liste einmal je Welt.
var N7B1=!/[?&]n7b1=0/.test(self.location.search), GRT=null, GORTE=null;
FB.n7h2An(!/[?&]n7h2=0/.test(self.location.search));   // N7h2: Flüsse und Straßen der scharfen Fassung wie in der Kartenansicht; ?n7h2=0 = Netz wie im groben Bild
function groeAn(){if(!N7B1||!A){FB.groesseAn(null);return false}
 if(!OR&&OR!==false){try{importScripts('orte.js'+self.location.search);OR=self.AT3ORTE.AUS?false:self.AT3ORTE}catch(x){OR=false}}
 if(!OR){FB.groesseAn(null);return false}
 if(!GRT){var O=A.orte,n=Math.min(O.length,A.kopf?A.kopf[0]:O.length);GRT=new Uint8Array(O.length);for(var k=0;k<n;k++)GRT[k]=OR.groesse(seed,A,k)}
 FB.groesseAn(function(k){return GRT[k]||2});return true}
function globusOrte(){if(GORTE)return GORTE;if(!groeAn())return null;return GORTE=FB.globusOrte(G,A,seed,function(k){return GRT[k]||2})}
// N7b2 (27.11.2026): Stadtkarte beim Antippen. stadtInfo(k) = Rohdaten des Orts (orte.js roh) mit Nummer, Zellart (1 Dorf, 2 Stadt, 3 Hafendorf, 4 Hafenstadt),
// Ortspunkt und der Kette „Answers to“ seiner Herrschaft (herrschaften.js); stadtSuche(d) = Ort unter dem Finger in den Fernstufen und auf dem Globus:
// alle Orte einmal durchgehen (rund 4.450, unter 2 ms), Abstand in Bildpunkten wie gemalt (Raute bzw. Kugel), Treffer bis d.T Bildpunkte, in den Stufen mit
// Mini-Plan (⅟16–⅟512) auch innerhalb der halben Ortsbreite. Nur beim Antippen, nichts je Bild. Notausschalter ?n7b2=0.
var N7B2=!/[?&]n7b2=0/.test(self.location.search);
var N7B3=!/[?&]n7b3=0/.test(self.location.search),FPL=null;   // N7b3: Stadt als Kulisse in First Person; FPL = Lage des letzten Ausschnitts (Pläne, die später kommen, holen ihn neu)
function onLaden(){if(!ON){try{importScripts('ortsnamen.js'+self.location.search);ON=self.AT3ORTSNAMEN}catch(x){ON=null}}return ON}
function orLaden(){if(!OR&&OR!==false){try{importScripts('orte.js'+self.location.search);OR=self.AT3ORTE.AUS?false:self.AT3ORTE}catch(x){OR=false}}return OR||null}
function stadtInfo(k){if(!orLaden()||!A||!A.orte||k==null||k<0||k>=A.orte.length)return null;onLaden();var c=A.orte[k],z=c&0xffffff,r=OR.roh(seed,A,k,ON),pp=G.ortPunkt(seed,A,z%G.GW,(z/G.GW)|0),u=A.hs&&A.hs.ort?A.hs.ort[k]:0;
 r.k=k;r.art=A.ort?A.ort[z]&15:0;r.punkt=[pp[0],pp[1]];r.kette=u&&HR?HR.info(A.hs,A.vk,A.orte,u-1,seed,ON):null;
 if(AP==null){try{importScripts('aussenposten.js'+self.location.search);AP=self.AT3POSTEN.AUS?false:self.AT3POSTEN}catch(x){AP=false}}
 if(AP){r.umg=AP.umgebung(seed,A,k);r.fremd=AP.fremde?AP.fremde(seed,A,k,G.ortPunkt,OR):null}return r}
function stadtSuche(d){if(!N7B2||!groeAn())return null;var O=A.orte,n=Math.min(O.length,A.kopf?A.kopf[0]:O.length),best=-1,bd=1e18,T2=d.T*d.T,glob=d.glob,k;
 if(!glob&&AP==null){try{importScripts('aussenposten.js'+self.location.search);AP=self.AT3POSTEN.AUS?false:self.AT3POSTEN}catch(x){AP=false}}
 var cl=glob?Math.cos(glob.lat):0,sl=glob?Math.sin(glob.lat):0,WF=G.WF,HF=G.GH*G.ZF;
 for(k=0;k<n;k++){var g=GRT[k]||2;if(glob&&g<6)continue;var z=O[k]&0xffffff,pp=G.ortPunkt(seed,A,z%G.GW,(z/G.GW)|0),q;
  if(glob){var la=(.5-(pp[1]+.5)/HF)*Math.PI,cp=Math.cos(la),dl=(pp[0]+.5)/WF*2*Math.PI-glob.lon,gx=cp*Math.sin(dl),gy=cl*Math.sin(la)-sl*cp*Math.cos(dl),gz=sl*Math.sin(la)+cl*cp*Math.cos(dl);
   if(gz<.3)continue;var ax=(gx-d.x)*glob.R,ay=(gy-d.y)*glob.R;q=ax*ax+ay*ay;if(q>T2)continue}
  else{var ex=pp[0]-d.x,ey=pp[1]-d.y;if(ex>WF/2)ex-=WF;else if(ex<-WF/2)ex+=WF;var sx=(ex-ey)*32/d.Z,sy=(ex+ey)*16/d.Z;q=sx*sx+sy*sy;
   if(q>T2){if(!d.mini||!AP||!AP.halb)continue;var hb=AP.halb(g);if(Math.abs(ex)>hb||Math.abs(ey)>hb)continue;q=T2+(ex*ex+ey*ey)}}
  if(q<bd){bd=q;best=k}}
 return best<0?null:stadtInfo(best)}
function miniAn(){if(!N7A3C1||!A||!ofl()){FB.miniAn(null);return}var lut=miniLut();FB.miniAn(lut?{hole:miniHole,lut:lut}:null)}
// N7a3c2 (Thomas 25.11.2026): Ortsnamen für die Fernstufen. Frage „namen“ mit Ausschnitt (Weltfelder) und Stufe: alle Orte in den Erdzellen des Ausschnitts, die in
// dieser Stufe einen Namen tragen (Staffel NAMEN_G: ⅟16 Weiler, bis ⅟32 Dörfer, bis ⅟128 Städte/Marktflecken, bis ⅟2048 Haupt-/Großstädte, Thomas 25.11.2026), in ⅟16–⅟32 mit Zusatz
// (orte.js bilanz, Text aus sprache/en.json). Kosten nur nach Zellen im Bild; je Ort gemerkt (höchstens NAMEN_MAX), Daten beim ersten Mal geladen.
var NAMEN_G=[0,0,0,0,2,3,4,4,6,6,6,6],NAMEN_MAX=8192,NAMK=new Map(),NTX=null,NTXL=null;
function namenTexte(){if(NTXL)return NTXL;NTXL=fetch('sprache/en.json'+self.location.search).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(j){NTX=j.texte||j;return NTX},function(){NTX=false;return null});return NTXL}
function namen(d,m,t){var lod=d.lod|0,gmin=NAMEN_G[lod];m.namen=[];if(!gmin||!A.ort){m.us=(performance.now()-t)*1000;self.postMessage(m);return}
 if(!ON){try{importScripts('ortsnamen.js'+self.location.search);ON=self.AT3ORTSNAMEN}catch(x){ON=null}}
 if(!OR&&OR!==false){try{importScripts('orte.js'+self.location.search);OR=self.AT3ORTE.AUS?false:self.AT3ORTE}catch(x){OR=false}}
 if(AP==null){try{importScripts('aussenposten.js'+self.location.search);AP=self.AT3POSTEN.AUS?false:self.AT3POSTEN}catch(x){AP=false}}
 if(!ON||!OR){m.us=(performance.now()-t)*1000;self.postMessage(m);return}
 var zus=!!d.zus;if(zus&&(PD==null||NTX==null)){Promise.all([PD==null?postenDaten():0,NTX==null?namenTexte():0]).then(function(){if(d.gen!==gen||!A){m.fehlt=true;self.postMessage(m);return}namen(d,m,performance.now())});return}
 var ZF=G.ZF,za=Math.floor(d.x0/ZF),ze=Math.floor(d.x1/ZF),ya=Math.max(0,Math.floor(d.y0/ZF)),ye=Math.min(G.GH-1,Math.floor(d.y1/ZF)),x,y;if(ze-za>=G.GW)ze=za+G.GW-1;
 for(y=ya;y<=ye;y++)for(x=za;x<=ze;x++){var X=((x%G.GW)+G.GW)%G.GW,z=y*G.GW+X;if(!(A.ort[z]&15))continue;var k=OR.ortNr(A,z);if(k==null)continue;
  var e=NAMK.get(k);if(!e){var g=OR.groesse(seed,A,k);if(g<gmin)continue;var r=OR.roh(seed,A,k,ON),pp=G.ortPunkt(seed,A,X,y);
   e={k:k,x:pp[0],y:pp[1],g:r.g,h:AP&&AP.HALB?(AP.HALB[r.g]||AP.HALB[7]):24,name:r.name,r:r};NAMK.set(k,e);if(NAMK.size>NAMEN_MAX)NAMK.delete(NAMK.keys().next().value)}
  if(e.g<gmin)continue;
  if(zus&&e.zus===undefined){e.zus=null;try{var b=PD?OR.bilanz(seed,e.r,PD):null;if(b&&b.zusatz&&NTX){var tx=NTX['ort.zusatz.'+b.zusatz.gruppe+'.'+b.zusatz.n];if(tx)e.zus=tx}}catch(q){}}
  m.namen.push([e.k,e.x,e.y,e.g,e.h,e.name,zus?e.zus:undefined])}
 m.us=(performance.now()-t)*1000;self.postMessage(m)}
function miniLeeren(){MINI.clear();MINIB=0;MINIF.clear();MININ=[];if(MINIT){clearTimeout(MINIT);MINIT=0}}
function vomOrtskern(m){if(m.gen!==gen)return;if(m.art==='mini'){if(m.fehler)MINIF.delete(m.k);else if(N7A3C1)miniDa(m.k,m);return}if(N7A3C1&&m.art==='plan'&&m.mini)miniDa(m.k,m.mini);if(!OFL)return;
 if(m.art==='posten'){OFL.postenListe(m);ortsBedarf();return}   // N7a2c: Postenliste da → berührende Posten aufnehmen
 if(m.art!=='plan')return;echteBoeden();if(m.ms!=null)ORTMS.push(m.ms);var L=OFL.aufnehmen(m,bauHat);if(!L.length)return;
 eingeebnet(L);
 self.postMessage({art:'ortNeu',gen:gen,stuecke:L,k:m.k,name:m.name,ms:m.ms,ersatz:m.ersatz||null,fpNeu:fpBeruehrt(L)})}   // N7b3: Plan im First-Person-Ausschnitt → neu holen
// N7a2c Startplatz: Postenpunkte rechnet der Bildkern selbst (Ortsbilanz + aussenposten.js, rund 0,3 ms je Ort, kein Plan), damit die Wahl nie auf den
// Ortskern warten muss (der plant gerade vielleicht eine Großstadt). Daten (3 Dateien) einmal laden; je Ort gemerkt (höchstens 64 Orte).
function postenDaten(){if(PDL)return PDL;var Q=self.location.search;
 PDL=Promise.all(['gebaeude','rezepte','kulturen'].map(function(f){return fetch('daten/'+f+'.json'+Q).then(function(r){if(!r.ok)throw new Error(f);return r.json()})}))
  .then(function(d){PD=OR.daten(d[0],d[1],d[2]);return PD},function(){PD=false;return null});return PDL}
// N7a5f: Kartenstücke für „Posten ans Wasser“ (gleich dem Ortskern), höchstens 12 gemerkt
var STR=new Map();function stueckR(cx,cy){var key=cx*8192+cy,b=STR.get(key);if(b)return b;b=G.ausschnitt(A,cx,cy,new Uint8Array(G.GEL_BYTES));G.gelaende({seed:seed,cx:cx,cy:cy,daten:b});STR.set(key,b);if(STR.size>12)STR.delete(STR.keys().next().value);return b}
function postenPunkte(x,y){var L=[];OFL.orteUm(A,seed,OR,x,y).forEach(function(k){var P=PPK.get(k);
  if(!P){P=[];try{var z=A.orte[k]&0xffffff,X=z%G.GW,Y=(z/G.GW)|0,r=OR.roh(seed,A,k,ON),b=OR.bilanz(seed,r,PD);
    AP.posten(seed,b,AP.umgebung(seed,A,k),PD,G.ortPunkt(seed,A,X,Y),AP.fremde?AP.fremde(seed,A,k,G.ortPunkt,OR):null,{WG:G,hole:stueckR}).forEach(function(p){P.push({x:p.x,y:p.y})})}catch(x){}
   PPK.set(k,P);if(PPK.size>64)PPK.delete(PPK.keys().next().value)}
  L=L.concat(P)});return L}
function BA(offen){return BBILD?{M:BAUB,hole:holeBau,BILD:BBILD,offen:offen&&offen.length?new Set(offen):null}:null}
// Nächstes fehlendes Stück im Fenster rechnen, dann dem Hauptkern die Kurzauskunft schicken. Immer nur eins je Durchlauf (Bildanfragen kommen dazwischen dran).
function arbeit(){laeuft=false;if(!A||kx<0)return;
 for(var i=0;i<ORDNUNG.length;i++){var cx=um(kx+ORDNUNG[i][0]),cy=ky+ORDNUNG[i][1];if(cy<0||cy>=SY)continue;var k=cx*8192+cy;if(st.has(k))continue;
  var t=performance.now(),b=G.ausschnitt(A,cx,cy,lager.pop()||new Uint8Array(G.GEL_BYTES));G.gelaende({seed:seed,cx:cx,cy:cy,daten:b});b._s=null;if(OFL)OFL.flachen(b,cx,cy);st.set(k,b);stUs+=(performance.now()-t)*1000;stN++;
  var q=BB.kunde(b);self.postMessage({art:'kunde',gen:gen,cx:cx,cy:cy,mm:q.mm,hg:q.hg,stUs:stUs/stN},[q.mm.buffer,q.hg.buffer]);weiter();return}}
function weiter(){if(!laeuft){laeuft=true;setTimeout(arbeit,0)}}
// N7h1 Weltansicht schärfer (27.11.2026): Wunschliste der scharfen Fernbilder vom Hauptkern (nur wenn der Blick ruht, Bildmitte zuerst). Immer nur ein Auftrag
// in Arbeit, je Durchlauf höchstens SCH_MS Rechenzeit, dazwischen kommen grobe Bilder und Kartenstücke dran. Eine neue Liste verwirft alles, was nicht mehr
// darauf steht (auch den laufenden Auftrag). Fertige Bilder gehen als „scharf“ an den Hauptkern, der sie merkt und einblendet. Notausschalter ?n7h=0 (Hauptkern).
var SCH=[], SCHA=null, SCHL=false, SCH_MS=6;
function scharfListe(d){SCH=(d.liste||[]).map(function(e){return{key:e[0],x0:e[1],y0:e[2],lod:e[3],nv:d.nv,gen:d.gen}});
 if(SCHA&&!SCH.some(function(e){return e.key===SCHA.e.key}))SCHA=null;scharfWeiter()}
function scharfWeiter(){if(!SCHL&&(SCHA||SCH.length)){SCHL=true;setTimeout(scharfArbeit,0)}}
function scharfArbeit(){SCHL=false;if(!A||!F){SCHA=null;SCH.length=0;return}
 if(!SCHA){var e=SCH.shift();if(!e)return;if(e.gen!==gen){scharfWeiter();return}
  if(e.lod<=FB.MINI_BIS)miniAn();groeAn();SCHA={e:e,j:FB.scharf(G,A,seed,e.x0,e.y0,e.lod,F,e.lod>=FB.U_AB?ueb():null,reiche())}}
 var a=SCHA;if(a.e.lod<=FB.MINI_BIS)miniAn();groeAn();
 if(a.j.schritt(SCH_MS)){SCHA=null;var r=a.j.bild(),m={art:'scharf',gen:a.e.gen,nv:a.e.nv,key:a.e.key,x0:a.e.x0,y0:a.e.y0,lod:a.e.lod,w:r.w,h:r.h,ox:r.ox,oy:r.oy,ms:a.j.ms,schritte:a.j.schritte};
  if(BMP)createImageBitmap(new ImageData(new Uint8ClampedArray(r.px.buffer),r.w,r.h)).then(function(b){m.bmp=b;self.postMessage(m,[b])},function(){m.buf=r.px;self.postMessage(m,[r.px.buffer])});
  else{m.buf=r.px;self.postMessage(m,[r.px.buffer])}}
 scharfWeiter()}
// N7h3 Globus schärfer (28.11.2026): ruht der Blick auf dem Globus, schickt die Karte „gscharf“ mit der Ansicht. Der Bildkern rechnet die fehlenden Kacheln der
// feinen Erdtextur (fernbild.js globusKachel, Mitte zuerst), dann den Globus in voller Auflösung (globusAuftrag), je Durchlauf höchstens SCH_MS, und schickt ihn
// zurück. Fertige Kacheln bleiben gemerkt (GT_SPEICHER, am längsten Ungenutztes fliegt) und erscheinen auch im groben Globus beim Drehen. Neue Ansicht oder
// „gscharf“ ohne an bricht die laufende Arbeit ab (Fertiges bleibt). Notausschalter ?n7h=0 / ?n7h3=0 auf dem Hauptkern (schickt dann nichts, grober Globus wie vorher).
var GT={}, GTB=0, GTNR=0, GJ=null, GJL=false, GT_SPEICHER=8*1048576;
function gtLeeren(){GT={};GTB=0;GJ=null}
function gtStufe(k){var e=GT[k];if(!e)e=GT[k]={k:k,T:new Array(FB.GTX*FB.GTY),nr:new Int32Array(FB.GTX*FB.GTY),n:0};return e}
function gtFein(kMax){var L=[];[8,4,2].forEach(function(k){if(k<=kMax&&GT[k]&&GT[k].n)L.push(GT[k])});return L.length?{L:L,nr:++GTNR}:null}
function texAn(){if(!TEX){TEX=SP.erdBild(A,F,ueb(),FB.UFARBE);if(reiche())FB.reicheErde(TEX,RE,F);TEXD=FB.dunkler(TEX,F)}}
function gtRaus(schutz){if(GTB<=GT_SPEICHER)return;var L=[];[2,4,8].forEach(function(k){var e=GT[k];if(!e)return;for(var i=0;i<e.T.length;i++)if(e.T[i]&&!(k===schutz.k&&schutz.s.has(i)))L.push([e.nr[i],k,i])});
 L.sort(function(a,b){return a[0]-b[0]});for(var j=0;j<L.length&&GTB>GT_SPEICHER*.8;j++){var e=GT[L[j][1]],d=e.T[L[j][2]];GTB-=d.length;e.T[L[j][2]]=null;e.n--;GTRAUS++}}
var GTRAUS=0;
function gscharf(d){if(!d.an||!A||!F||d.gen!==gen){GJ=null;return}var k=d.k===8||d.k===4||d.k===2?d.k:FB.globusStufe(d.R,d.s),e=gtStufe(k),B=FB.globusBedarf(d.W,d.H,d.R,d.lon,d.lat,d.s,k);
 GJ={d:d,k:k,e:e,L:B.filter(function(n){return!e.T[n]}),s:new Set(B),job:null,bild:null,ms:0,neu:0,schritte:0,kMs:0};gWeiter()}
function gWeiter(){if(!GJL&&GJ){GJL=true;setTimeout(gArbeit,0)}}
function gArbeit(){GJL=false;var J=GJ;if(!J)return;if(!A||!F||J.d.gen!==gen){GJ=null;return}var t=performance.now();J.schritte++;
 while(performance.now()-t<SCH_MS){
  if(!J.bild&&(J.job||J.L.length)){if(!J.job){var n=J.L.shift();J.job=FB.globusKachel(G,A,seed,n%FB.GTX,(n/FB.GTX)|0,J.k,F,ueb(),reiche());J.n=n}
   var rest=SCH_MS-(performance.now()-t);if(rest<=0)break;var tk=performance.now();
   if(J.job.schritt(rest)){var D=J.job.daten();if(!J.e.T[J.n]){J.e.T[J.n]=D;J.e.n++;GTB+=D.length}J.e.nr[J.n]=++GTNR;J.neu++;J.job=null;gtRaus({k:J.k,s:J.s})}J.kMs+=performance.now()-tk;continue}
  if(!J.bild){texAn();var d=J.d;var FE=gtFein(J.k);if(FE)FE.z=Math.max(1,Math.round((d.sg||d.s)/d.s));J.bild=FB.globusAuftrag(TEX,TEXD,d.W,d.H,d.R,d.lon,d.lat,d.s,F.pal[F.dunkel],globusOrte(),F,FE)}   // z: Ortssymbole so groß wie im groben Globus
  if(J.bild.schritt(Math.max(1,SCH_MS-(performance.now()-t)))){var r=J.bild.bild();J.ms+=performance.now()-t;GJ=null;
   self.postMessage({art:'gscharf',gen:J.d.gen,nv:J.d.nv,key:J.d.key,w:r.w,h:r.h,s:J.d.s,R:J.d.R,k:J.k,buf:r.px,ms:J.ms,kMs:J.kMs,gMs:J.bild.ms,neu:J.neu,schritte:J.schritte,
    kacheln:(GT[2]?GT[2].n:0)+(GT[4]?GT[4].n:0)+(GT[8]?GT[8].n:0),bytes:GTB,raus:GTRAUS},[r.px.buffer]);return}
  break}
 J.ms+=performance.now()-t;gWeiter()}
// Übersichtsbiome (Globus, Fernstufen ab ⅟1024): einmal je Welt, beim ersten Bedarf
function ueb(){if(!UEB)UEB=FB.uebersicht(G,A,seed);return UEB}
// N4c1: Reich + 1 je Erdzelle und Farbnummer je Reich (Vasallen eine Stufe heller), nur wenn die Erde Herrschaften trägt und der Knopf an ist
function reiche(){if(!REI||!A||!A.hs||!F)return null;if(RE)return RE;var hs=A.hs,T=HR.tafel(hs),z=new Uint16Array(G.N),f=new Uint8Array(hs.zahl[0]),i,u;
 for(i=0;i<G.N;i++){u=hs.zel[i];z[i]=u?T[u-1]&16383:0}
 for(u=0;u<hs.zahl[0];u++){var c=HR.farbe(hs,u);f[u]=hs.tab[u*4+3]&256?F.he[c]:c}return RE={z:z,f:f}}
function dunkelste(p){var b=0,bl=1e9;for(var i=0;i<p.length;i++){var c=p[i],l=(c&255)*3+((c>>8)&255)*6+((c>>16)&255);if(l<bl){bl=l;b=i}}return b}
// G4c: Fragen der Startplatz-Wahl. Bilder gehen als Zahlenfeld zurück (klein, einmalig), der Hauptkern malt sie nur.
function wahl(d){var m={art:'antwort',id:d.id},tr=[];if(!A||!F||d.gen!==gen){m.fehlt=true;self.postMessage(m);return}var t=performance.now();
 if(d.frage==='fp'){fp(d,m,t);return}
 if(d.frage==='namen'){namen(d,m,t);return}
 if(d.frage==='stadt'){m.ort=stadtSuche(d);m.us=(performance.now()-t)*1000;self.postMessage(m);return}      // N7b2: Ort unter dem Finger (Fernstufen, Globus)      // N7a3c2: Ortsnamen im Ausschnitt
 if(d.frage==='globus'){texAn();var gl=FB.globus(TEX,TEXD,d.W,d.H,d.R,d.lon,d.lat,d.s,F.pal[F.dunkel],globusOrte(),F,d.fein?gtFein(8):null);   // N7h3: gemerkte feine Kacheln auch beim Drehen
 m.w=gl.w;m.h=gl.h;m.buf=gl.px;tr.push(gl.px.buffer)}
 else if(d.frage==='erdbild'){var e=SP.erdBild(A,F);m.w=SP.GW;m.h=SP.GH;m.buf=e;tr.push(e.buffer)}
 else if(d.frage==='region'){var rx=SP.eckeX(d.zx),ry=SP.eckeY(d.zy),r=SP.regionBild(G,seed,A,rx,ry,F);m.rx=rx;m.ry=ry;m.w=m.h=SP.RP;m.rs=SP.RS;m.buf=r;tr.push(r.buffer)}
 else if(d.frage==='platz'||d.frage==='zufall'){if(!ON){try{importScripts('ortsnamen.js'+self.location.search);ON=self.AT3ORTSNAMEN}catch(x){ON=null}}
  var x=d.x,y=d.y;if(d.frage==='zufall'){var z=SP.zufall(G,seed,A,d.r1,d.r2);if(!z){m.platz={ok:false};self.postMessage(m);return}x=z.x;y=z.y}
  PBUF=PBUF||new Uint8Array(G.GEL_BYTES);m.platz=SP.platz(G,ON,seed,A,x,y,PBUF);
  var O=ofl();
  // N7a2c (Thomas 24.11.2026): auch nie in einem Außenposten oder Gehöft (Postenpunkte selbst gerechnet, siehe postenPunkte)
  if(O&&N7A2C&&AP&&PD==null){postenDaten().then(function(){wahl(d)});return}   // erstes Mal: Daten laden, dann dieselbe Frage noch einmal
  var imP=function(x,y){return O.imOrt(A,seed,OR,AP,x,y)||(N7A2C&&AP&&PD?O.imPosten(x,y,8,postenPunkte(x,y)):null)};
  if(O)for(var v=0;v<3&&m.platz&&m.platz.ok;v++){var io=imP(m.platz.x,m.platz.y);if(!io)break;   // N7a2a: nie in einer Ortsfläche (Park gewinnt nur bei alten Spielständen)
   var h=O.hinaus(io);m.platz=SP.platz(G,ON,seed,A,h.x,h.y,PBUF);if(v===2&&m.platz&&m.platz.ok&&imP(m.platz.x,m.platz.y))m.platz={ok:false,weit:-1,imOrt:true}}}
 else if(d.frage==='reich'){if(!ON){try{importScripts('ortsnamen.js'+self.location.search);ON=self.AT3ORTSNAMEN}catch(x){ON=null}}   // N4c1: Kette „Answers to“ an einem Weltfeld
  var zx=((d.x%G.WF+G.WF)%G.WF)>>10,zy=Math.max(0,Math.min(G.GH-1,d.y>>10)),u=A.hs?A.hs.zel[zy*G.GW+zx]:0;m.hat=!!A.hs;m.reich=u?HR.info(A.hs,A.vk,A.orte,u-1,seed,ON):null;
  if(!OR&&OR!==false){try{importScripts('orte.js'+self.location.search);OR=self.AT3ORTE.AUS?false:self.AT3ORTE}catch(x){OR=false}}   // N5b: nächster Ort im Umkreis von 3 × 3 Zellen (Rohdaten, Name)
  if(OR&&A.ort){var bp=null,bo=-1,be=1.6*G.ZF*G.ZF*1.6,x0=(d.x%G.WF+G.WF)%G.WF,du,dv;for(dv=-1;dv<=1;dv++)for(du=-1;du<=1;du++){var Y=zy+dv,X=(zx+du+G.GW)%G.GW;if(Y<0||Y>=G.GH||!(A.ort[Y*G.GW+X]&15))continue;
   var pp=G.ortPunkt(seed,A,X,Y),ex=pp[0]-x0,ey=pp[1]-d.y;if(ex>G.WF/2)ex-=G.WF;else if(ex<-G.WF/2)ex+=G.WF;var ee=ex*ex+ey*ey;if(ee<be){be=ee;bo=Y*G.GW+X;bp=pp}}
   if(bo>=0){var kk=OR.ortNr(A,bo);if(kk!=null){m.ort=OR.roh(seed,A,kk,ON);
    if(AP==null){try{importScripts('aussenposten.js'+self.location.search);AP=self.AT3POSTEN.AUS?false:self.AT3POSTEN}catch(x){AP=false}}   // N5c: Umgebung für die Außenposten (Notausschalter ?n5c=0)
    if(AP){m.ort.umg=AP.umgebung(seed,A,kk);m.ort.punkt=[bp[0],bp[1]];m.ort.fremd=AP.fremde?AP.fremde(seed,A,kk,G.ortPunkt,OR):null}}}}
  if(OR&&A.kanten){if(SN==null){try{importScripts('strassen.js'+self.location.search);SN=self.AT3STRASSEN.AUS?false:self.AT3STRASSEN}catch(x){SN=false}}   // N5d: Straße unter dem Finger (Notausschalter ?n5d=0)
   if(SN){var t5=performance.now(),neu5=!A._n5d,J5=SN.netz(seed,A,OR,HR),zi=SN.naechste(J5,(d.x%G.WF+G.WF)%G.WF,d.y),sz=zi>=0?SN.zelle(J5,zi):null;
    if(sz){sz.an=ON?ON.name(seed,A.orte[sz.a]&0xffffff,A.orte[sz.a]>>>24,A.vk):'';sz.bn=ON?ON.name(seed,A.orte[sz.b]&0xffffff,A.orte[sz.b]>>>24,A.vk):'';sz.zelle=zi;sz.einheit=A.hs?A.hs.zel[zi]:0;m.strasse=sz}
    if(neu5)m.n5dMs=performance.now()-t5}}}
 m.us=(performance.now()-t)*1000;self.postMessage(m,tr)}
// FP1: Ausschnitt 96 × 96 Felder um den Gladiator (fpausschnitt.js, erst beim ersten Mal geladen). Das Fenster der Stücke rückt zum Ausschnitt,
// fehlende Stücke werden sofort gerechnet (höchstens 9), dann geht der Ausschnitt ohne Kopie an den Hauptkern.
var FPA=null,DACHF=null,ANF=null;
// FP2b: Ziegelfarbe fürs Dach in First Person = häufigste Farbe im Kartenbild von dach-ziegel (Startset; nicht übernommen = graues Ersatzbild), Fuge eine Stufe dunkler
function dachF(){if(DACHF&&DACHF.b===BBILD)return DACHF;var b=BBILD&&BBILD[BAUB.ARTEN.indexOf('dach-ziegel')],z=new Uint32Array(256),c=46;
 if(b){var px=b.L[0].px;for(var i=0;i<px.length;i++)z[px[i]]++;z[255]=0;for(var k=0,m=0;k<64;k++)if(z[k]>m){m=z[k];c=k}}
 DACHF=[c,F.du[c]];DACHF.b=BBILD;return DACHF}
function fp(d,m,t){if(!FPA){importScripts('fpausschnitt.js'+self.location.search);FPA=self.AT3FPA}
 var L=FPA.stuecke(BB,d.ox,d.oy),mx=L[0][0]+((L[L.length-1][0]-L[0][0]+SX)%SX>>1),my=(L[0][1]+L[L.length-1][1])>>1,neu=0;kx=um(mx);ky=my;
 st.forEach(function(b,k){if(ab((k/8192)|0,kx)>HALB||Math.abs(k%8192-ky)>HALB){st.delete(k);if(lager.length<8)lager.push(b)}});
 ortsBedarf();
 L.forEach(function(c){var k=um(c[0])*8192+c[1];if(st.has(k))return;var b=G.ausschnitt(A,c[0],c[1],lager.pop()||new Uint8Array(G.GEL_BYTES));G.gelaende({seed:seed,cx:c[0],cy:c[1],daten:b});b._s=null;if(OFL)OFL.flachen(b,um(c[0]),c[1]);st.set(k,b);neu++});
 var sp=new Uint8Array(NAT.ARTEN.length);(d.sperr||[]).forEach(function(id){var i=NAT.ARTEN.indexOf(id);if(i>=0)sp[i]=1});
 var w=FPA.bauen(BB,NAT,hole,seed,d.ox,d.oy,sp,F,natFrei(),BAU.size?{hole:holeBau,BODEN:BAUB.BODEN,PUNKT:BAUB.PUNKT,DACHF:dachF()}:null,anl(d.anl),kuli());m.welt=w;FPL={ox:w.ox,oy:w.oy};if(w.kulisse)w.orte=fpOrte(w);m.arten=NAT.ARTEN;m.neu=neu;m.us=(performance.now()-t)*1000;self.postMessage(m,FPA.puffer(w));weiter()}
// N7b3: Orte im Ausschnitt als Kulisse (fpausschnitt.js kulisse), Stadtkarte fürs Antippen (Lage in Ausschnitt-Feldern, nur Orte, keine Posten)
function kuli(){return N7B3&&OFL&&OFL.orte.size&&F?{bei:OFL.bei,F:OFL.fpFarben(F)}:null}
function fpOrte(w){var L=[];OFL.orte.forEach(function(o){if(o.posten)return;var i0=o.x0-w.ox;i0=((i0%BB.WX)+BB.WX)%BB.WX;if(i0>BB.WX/2)i0-=BB.WX;var j0=o.y0-w.oy;
  if(i0+o.W<=0||j0+o.W<=0||i0>=FPA.N||j0>=FPA.N)return;L.push({i0:i0,j0:j0,W:o.W,k:o.k,stadt:N7B2?stadtInfo(o.k):null})});return L}
function fpBeruehrt(L){if(!FPL||!N7B3)return false;for(var n=0;n<L.length;n++){var cx=(L[n]/8192)|0,cy=L[n]%8192,dx=cx*64-FPL.ox;dx=((dx%BB.WX)+BB.WX)%BB.WX;if(dx>BB.WX/2)dx-=BB.WX;
  if(dx>-64&&dx<FPA.N&&cy*64>FPL.oy-64&&cy*64<FPL.oy+FPA.N)return true}return false}
// AR1c2: Arena in First Person: Höhenfeld aus daten/arena-fp.json (vom Hauptkern mitgeschickt, hier einmal entpackt) und Lage der Anlage mit Häuschen
function anl(a){if(!a||!a.fp)return null;if(!ANF||ANF.h!==a.fp.h){ANF={h:a.fp.h,d:FPA.entpacken(a.fp)}}return{d:ANF.d,x:a.x,y:a.y,w:a.w,h:a.h,haus:a.haus||[]}}
function startplatz(){var MX=G.GW>>1,MY=G.GH>>1,land=-1;
 for(var r=0;r<MY;r++)for(var dy=-r;dy<=r;dy++)for(var dx=-r;dx<=r;dx+=(Math.abs(dy)===r?1:2*r||1)){var x=MX+dx,y=MY+dy,i=y*G.GW+x;
  if(A.ort[i]&15){var p=G.ortPunkt(seed,A,x,y);return{x:p[0],y:p[1],ort:A.ort[i]&15}}
  if(land<0&&A.bio[i]>1&&A.bio[i]<10)land=i}
 return land<0?{x:BB.WX>>1,y:BB.WY>>1,ort:0}:{x:(land%G.GW)*G.ZF+(G.ZF>>1),y:((land/G.GW)|0)*G.ZF+(G.ZF>>1),ort:0}}
self.onmessage=function(e){var d=e.data;
 if(d.art==='init'){F={pal:d.pal,du:d.du,he:d.he,dunkel:dunkelste(d.pal)};self.postMessage({art:'arten',liste:NAT.ARTEN,bau:BAUB.ARTEN})}
 else if(d.art==='welt'){gen=d.gen;seed=d.seed>>>0;A=G.ansicht(d.buf.buffer);SCHA=null;SCH.length=0;TEX=TEXD=UEB=RE=null;GRT=GORTE=null;gtLeeren();miniLeeren();NAMK.clear();WB=d.buf;if(OFL)OFL.leeren();if(!OKP&&OK)OK.nachricht({art:'welt',gen:gen,seed:seed,buf:d.buf});st.forEach(function(b){if(lager.length<8)lager.push(b)});st.clear();ortsBedarf();weiter()}
 else if(d.art==='blick'){kx=d.kx;ky=d.ky;st.forEach(function(b,k){if(ab((k/8192)|0,kx)>HALB||Math.abs(k%8192-ky)>HALB){st.delete(k);if(lager.length<8)lager.push(b)}});ortsBedarf();weiter()}
 else if(d.art==='ortskern'){OKP=d.port;OKP.onmessage=function(e){vomOrtskern(e.data)}}
 else if(d.art==='ortskernWeg'){OKP=null;if(OFL)OFL.vergessenAlle();ortsBedarf()}   // Ortskern ausgefallen: ab jetzt eingebettet   // N7a2a: eigener Hintergrundkern für die Ortspläne
 else if(d.art==='natur'){NBILD=NAT.vorbereiten(d.liste,d.grau,d.rand);if(d.bau)BBILD=BAUB.vorbereiten(d.bau,d.grau,d.rand)}   // G4b: Bilder der Naturobjekte (nur übernommene, Rest grau); G5b: Bauteile
 else if(d.art==='bau'){if(d.leer)BAU.clear();(d.stuecke||[]).forEach(function(e){if(e[1])BAU.set(e[0],e[1]);else BAU.delete(e[0])})
  if(OFL&&OFL.orte.size){var neuS=[];(d.stuecke||[]).forEach(function(e){var k=e[0];if(bauHat(k)&&OFL.bauGeaendert(k)){var b=st.get(k);if(b){st.delete(k);if(lager.length<8)lager.push(b)}   // N7a2a: Park gewinnt
     var cx=(k/8192)|0,cy=k%8192;neuS.push(k,um(cx-1)*8192+cy);if(cy>0)neuS.push(cx*8192+cy-1)}});if(neuS.length){self.postMessage({art:'ortNeu',gen:gen,stuecke:neuS});weiter()}}}           // G5b: Bau-Kartenstücke (dünn)
 else if(d.art==='bild'){var t=performance.now();if(d.lod>=BB.STUFEN&&d.lod<=FB.MINI_BIS&&A&&F)miniAn();if(d.lod>=BB.STUFEN&&A&&F)groeAn();var r=d.gen!==gen||!F?null:d.lod>=BB.STUFEN?(A?FB.kachel(G,A,seed,d.x0,d.y0,d.lod,F,d.lod>=FB.U_AB?ueb():null,reiche()):null):BB.bild(hole,d.x0,d.y0,d.lod,F,NBILD?{N:NAT,seed:seed,BILD:NBILD}:null,BA(d.offen),OFL?OFL.fuerBild(d.x0,d.y0,BB.TEIL<<d.lod,d.lod,F):null),m={art:'bild',gen:d.gen,nv:d.nv,key:d.key,x0:d.x0,y0:d.y0,lod:d.lod};
  if(!r){m.fehlt=true;self.postMessage(m);return}
  m.w=r.w;m.h=r.h;m.ox=r.ox;m.oy=r.oy;m.natur=r.natur;m.bau=r.bau||0;m.ort=r.ort||0;m.ortBoden=r.ortBoden||0;m.us=(performance.now()-t)*1000;nachladen();haeuserAn();
  if(BMP)createImageBitmap(new ImageData(new Uint8ClampedArray(r.px.buffer),r.w,r.h)).then(function(b){m.bmp=b;self.postMessage(m,[b])},function(){BMP=false;m.buf=r.px;self.postMessage(m,[r.px.buffer])});
  else{m.buf=r.px;self.postMessage(m,[r.px.buffer])}}
 else if(d.art==='feld'){var fd=BB.feld(hole,d.px,d.py),ob=NBILD&&A?NAT.treffer(hole,d.px,d.py,seed,NBILD,BB.sicht,fd&&fd.xu,fd&&fd.y,natFrei()):null;
  if(BAU.size&&BBILD&&A){var bt=BAUB.treffer(holeBau,hole,BB.sicht,d.px,d.py,BBILD,d.offen&&d.offen.length?new Set(d.offen):null,fd&&fd.xu,fd&&fd.y);   // G5b: Bauteil vor oder hinter der Natur?
   if(bt&&(!ob||bt.tief>=(ob.x+ob.y)*4+1))ob=bt;var bf=fd&&fd.x!=null?BAUB.feld(holeBau,fd.x,fd.y):null;if(bf){fd.bau=bf}else if(bt&&bt.raum&&fd)fd.bau=BAUB.feld(holeBau,bt.x,bt.y)||{raum:bt.raum,art:0,zustand:bt.zustand}}
  if(BAU.size&&fd&&fd.x!=null&&!fd.bau){var ga=holeBau(fd.x>>6,fd.y>>6),gv=ga&&ga.length>32768?ga[32768+(((fd.y&63)<<6)|(fd.x&63))]:0;if(gv)fd.bweg=[gv&7,(gv>>4)&3]}   // G6a: gebauter Weg
  if(N7B2&&fd&&fd.x!=null&&!fd.bau&&OFL&&OFL.ortBei){var sk=OFL.ortBei(fd.x,fd.y);if(sk!=null)fd.stadt=stadtInfo(sk)}   // N7b2: Feld in einem Ort → Stadtkarte
  if(fd&&ob)fd.obj=ob;else if(ob)fd={obj:ob};
  self.postMessage({art:'feld',id:d.id,feld:fd})}
 else if(d.art==='scharf')scharfListe(d);   // N7h1
 else if(d.art==='gscharf')gscharf(d);   // N7h3
 else if(d.art==='wahl')wahl(d);
 else if(d.art==='messNeu'){if(OFL&&OFL.messNeu)OFL.messNeu()}   // N7a2b3: Messfeld „Reset“
 else if(d.art==='reiche'){REI=!!d.an;RE=null;SCHA=null;SCH.length=0;TEX=TEXD=null;gtLeeren()}   // N4c1: Knopf „Realms“; die Karte verwirft ihre Fernbilder selbst
 else if(d.art==='start'){self.postMessage({art:'start',gen:gen,platz:A?startplatz():null})}};
