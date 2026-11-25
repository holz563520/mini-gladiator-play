// WAS DIE DATEI TUT: Bildkern von Arena Theory 3.0 (Schritt G4a). Ein eigener Hintergrundkern nur für die Kartenansicht: bekommt vom Hauptkern einmal das
// Erdraster (vom Weltkern), rechnet die Kartenstücke, die er zum Zeichnen braucht, selbst aus Seed und Erde (weltgen.js; reine Ansicht, gehört nicht zum Spielzustand,
// darum geht die Karte auch in der Pause), und macht daraus auf Anfrage Bodenbilder (bodenbild.js), die er als fertiges Bild zurückgibt (ImageBitmap; wo der Browser
// das im Hintergrund nicht kann, als Zahlenfeld). Hält höchstens die 7 × 7 Stücke um den Blick (Puffer werden wiederverwendet), nächste zuerst, eins nach dem anderen.
// Dazu: „welches Feld liegt unter dem Finger“ und der automatische Startplatz (erstes Dorf von der Weltmitte aus; nur noch für ?nosave und Tests).
// G4c: Startplatz-Wahl (startplatz.js): Erdbild, Regionsbild, trockenes Feld mit nächstem Ort, zufälliger Platz an Land; Antwort mit der Fragenummer.
// G4b: backt die Natur aus dem Startset (natur.js) mit ins Bodenbild und findet beim Antippen das vorderste Naturobjekt unter dem Finger.
// W1c Runde Welt: Das Fenster der Stücke läuft in x über die Naht (hole rechnet die Stückspalte um), in y endet es am Pol.
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
function ofl(){if(!N7A2||OFL===false)return null;if(OFL)return OFL;try{importScripts('ortsflaeche.js'+self.location.search,'orte.js'+self.location.search,'aussenposten.js'+self.location.search);
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
function miniAn(){if(!N7A3C1||!A||!ofl()){FB.miniAn(null);return}var lut=miniLut();FB.miniAn(lut?{hole:miniHole,lut:lut}:null)}
function miniLeeren(){MINI.clear();MINIB=0;MINIF.clear();MININ=[];if(MINIT){clearTimeout(MINIT);MINIT=0}}
function vomOrtskern(m){if(m.gen!==gen)return;if(m.art==='mini'){if(m.fehler)MINIF.delete(m.k);else if(N7A3C1)miniDa(m.k,m);return}if(N7A3C1&&m.art==='plan'&&m.mini)miniDa(m.k,m.mini);if(!OFL)return;
 if(m.art==='posten'){OFL.postenListe(m);ortsBedarf();return}   // N7a2c: Postenliste da → berührende Posten aufnehmen
 if(m.art!=='plan')return;echteBoeden();if(m.ms!=null)ORTMS.push(m.ms);var L=OFL.aufnehmen(m,bauHat);if(!L.length)return;
 eingeebnet(L);
 self.postMessage({art:'ortNeu',gen:gen,stuecke:L,k:m.k,name:m.name,ms:m.ms,ersatz:m.ersatz||null})}
// N7a2c Startplatz: Postenpunkte rechnet der Bildkern selbst (Ortsbilanz + aussenposten.js, rund 0,3 ms je Ort, kein Plan), damit die Wahl nie auf den
// Ortskern warten muss (der plant gerade vielleicht eine Großstadt). Daten (3 Dateien) einmal laden; je Ort gemerkt (höchstens 64 Orte).
function postenDaten(){if(PDL)return PDL;var Q=self.location.search;
 PDL=Promise.all(['gebaeude','rezepte','kulturen'].map(function(f){return fetch('daten/'+f+'.json'+Q).then(function(r){if(!r.ok)throw new Error(f);return r.json()})}))
  .then(function(d){PD=OR.daten(d[0],d[1],d[2]);return PD},function(){PD=false;return null});return PDL}
function postenPunkte(x,y){var L=[];OFL.orteUm(A,seed,OR,x,y).forEach(function(k){var P=PPK.get(k);
  if(!P){P=[];try{var z=A.orte[k]&0xffffff,X=z%G.GW,Y=(z/G.GW)|0,r=OR.roh(seed,A,k,ON),b=OR.bilanz(seed,r,PD);
    AP.posten(seed,b,AP.umgebung(seed,A,k),PD,G.ortPunkt(seed,A,X,Y),AP.fremde?AP.fremde(seed,A,k,G.ortPunkt,OR):null).forEach(function(p){P.push({x:p.x,y:p.y})})}catch(x){}
   PPK.set(k,P);if(PPK.size>64)PPK.delete(PPK.keys().next().value)}
  L=L.concat(P)});return L}
function BA(offen){return BBILD?{M:BAUB,hole:holeBau,BILD:BBILD,offen:offen&&offen.length?new Set(offen):null}:null}
// Nächstes fehlendes Stück im Fenster rechnen, dann dem Hauptkern die Kurzauskunft schicken. Immer nur eins je Durchlauf (Bildanfragen kommen dazwischen dran).
function arbeit(){laeuft=false;if(!A||kx<0)return;
 for(var i=0;i<ORDNUNG.length;i++){var cx=um(kx+ORDNUNG[i][0]),cy=ky+ORDNUNG[i][1];if(cy<0||cy>=SY)continue;var k=cx*8192+cy;if(st.has(k))continue;
  var t=performance.now(),b=G.ausschnitt(A,cx,cy,lager.pop()||new Uint8Array(G.GEL_BYTES));G.gelaende({seed:seed,cx:cx,cy:cy,daten:b});b._s=null;if(OFL)OFL.flachen(b,cx,cy);st.set(k,b);stUs+=(performance.now()-t)*1000;stN++;
  var q=BB.kunde(b);self.postMessage({art:'kunde',gen:gen,cx:cx,cy:cy,mm:q.mm,hg:q.hg,stUs:stUs/stN},[q.mm.buffer,q.hg.buffer]);weiter();return}}
function weiter(){if(!laeuft){laeuft=true;setTimeout(arbeit,0)}}
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
 if(d.frage==='globus'){if(!TEX){TEX=SP.erdBild(A,F,ueb(),FB.UFARBE);if(reiche())FB.reicheErde(TEX,RE,F);TEXD=FB.dunkler(TEX,F)}var gl=FB.globus(TEX,TEXD,d.W,d.H,d.R,d.lon,d.lat,d.s,F.pal[F.dunkel]);m.w=gl.w;m.h=gl.h;m.buf=gl.px;tr.push(gl.px.buffer)}
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
 var w=FPA.bauen(BB,NAT,hole,seed,d.ox,d.oy,sp,F,natFrei(),BAU.size?{hole:holeBau,BODEN:BAUB.BODEN,PUNKT:BAUB.PUNKT,DACHF:dachF()}:null,anl(d.anl));m.welt=w;m.arten=NAT.ARTEN;m.neu=neu;m.us=(performance.now()-t)*1000;self.postMessage(m,FPA.puffer(w));weiter()}
// AR1c2: Arena in First Person: Höhenfeld aus daten/arena-fp.json (vom Hauptkern mitgeschickt, hier einmal entpackt) und Lage der Anlage mit Häuschen
function anl(a){if(!a||!a.fp)return null;if(!ANF||ANF.h!==a.fp.h){ANF={h:a.fp.h,d:FPA.entpacken(a.fp)}}return{d:ANF.d,x:a.x,y:a.y,w:a.w,h:a.h,haus:a.haus||[]}}
function startplatz(){var MX=G.GW>>1,MY=G.GH>>1,land=-1;
 for(var r=0;r<MY;r++)for(var dy=-r;dy<=r;dy++)for(var dx=-r;dx<=r;dx+=(Math.abs(dy)===r?1:2*r||1)){var x=MX+dx,y=MY+dy,i=y*G.GW+x;
  if(A.ort[i]&15){var p=G.ortPunkt(seed,A,x,y);return{x:p[0],y:p[1],ort:A.ort[i]&15}}
  if(land<0&&A.bio[i]>1&&A.bio[i]<10)land=i}
 return land<0?{x:BB.WX>>1,y:BB.WY>>1,ort:0}:{x:(land%G.GW)*G.ZF+(G.ZF>>1),y:((land/G.GW)|0)*G.ZF+(G.ZF>>1),ort:0}}
self.onmessage=function(e){var d=e.data;
 if(d.art==='init'){F={pal:d.pal,du:d.du,he:d.he,dunkel:dunkelste(d.pal)};self.postMessage({art:'arten',liste:NAT.ARTEN,bau:BAUB.ARTEN})}
 else if(d.art==='welt'){gen=d.gen;seed=d.seed>>>0;A=G.ansicht(d.buf.buffer);TEX=TEXD=UEB=RE=null;miniLeeren();WB=d.buf;if(OFL)OFL.leeren();if(!OKP&&OK)OK.nachricht({art:'welt',gen:gen,seed:seed,buf:d.buf});st.forEach(function(b){if(lager.length<8)lager.push(b)});st.clear();ortsBedarf();weiter()}
 else if(d.art==='blick'){kx=d.kx;ky=d.ky;st.forEach(function(b,k){if(ab((k/8192)|0,kx)>HALB||Math.abs(k%8192-ky)>HALB){st.delete(k);if(lager.length<8)lager.push(b)}});ortsBedarf();weiter()}
 else if(d.art==='ortskern'){OKP=d.port;OKP.onmessage=function(e){vomOrtskern(e.data)}}
 else if(d.art==='ortskernWeg'){OKP=null;if(OFL)OFL.vergessenAlle();ortsBedarf()}   // Ortskern ausgefallen: ab jetzt eingebettet   // N7a2a: eigener Hintergrundkern für die Ortspläne
 else if(d.art==='natur'){NBILD=NAT.vorbereiten(d.liste,d.grau,d.rand);if(d.bau)BBILD=BAUB.vorbereiten(d.bau,d.grau,d.rand)}   // G4b: Bilder der Naturobjekte (nur übernommene, Rest grau); G5b: Bauteile
 else if(d.art==='bau'){if(d.leer)BAU.clear();(d.stuecke||[]).forEach(function(e){if(e[1])BAU.set(e[0],e[1]);else BAU.delete(e[0])})
  if(OFL&&OFL.orte.size){var neuS=[];(d.stuecke||[]).forEach(function(e){var k=e[0];if(bauHat(k)&&OFL.bauGeaendert(k)){var b=st.get(k);if(b){st.delete(k);if(lager.length<8)lager.push(b)}   // N7a2a: Park gewinnt
     var cx=(k/8192)|0,cy=k%8192;neuS.push(k,um(cx-1)*8192+cy);if(cy>0)neuS.push(cx*8192+cy-1)}});if(neuS.length){self.postMessage({art:'ortNeu',gen:gen,stuecke:neuS});weiter()}}}           // G5b: Bau-Kartenstücke (dünn)
 else if(d.art==='bild'){var t=performance.now();if(d.lod>=BB.STUFEN&&d.lod<=FB.MINI_BIS&&A&&F)miniAn();var r=d.gen!==gen||!F?null:d.lod>=BB.STUFEN?(A?FB.kachel(G,A,seed,d.x0,d.y0,d.lod,F,d.lod>=FB.U_AB?ueb():null,reiche()):null):BB.bild(hole,d.x0,d.y0,d.lod,F,NBILD?{N:NAT,seed:seed,BILD:NBILD}:null,BA(d.offen),OFL?OFL.fuerBild(d.x0,d.y0,BB.TEIL<<d.lod,d.lod,F):null),m={art:'bild',gen:d.gen,nv:d.nv,key:d.key,x0:d.x0,y0:d.y0,lod:d.lod};
  if(!r){m.fehlt=true;self.postMessage(m);return}
  m.w=r.w;m.h=r.h;m.ox=r.ox;m.oy=r.oy;m.natur=r.natur;m.bau=r.bau||0;m.ort=r.ort||0;m.ortBoden=r.ortBoden||0;m.us=(performance.now()-t)*1000;nachladen();haeuserAn();
  if(BMP)createImageBitmap(new ImageData(new Uint8ClampedArray(r.px.buffer),r.w,r.h)).then(function(b){m.bmp=b;self.postMessage(m,[b])},function(){BMP=false;m.buf=r.px;self.postMessage(m,[r.px.buffer])});
  else{m.buf=r.px;self.postMessage(m,[r.px.buffer])}}
 else if(d.art==='feld'){var fd=BB.feld(hole,d.px,d.py),ob=NBILD&&A?NAT.treffer(hole,d.px,d.py,seed,NBILD,BB.sicht,fd&&fd.xu,fd&&fd.y,natFrei()):null;
  if(BAU.size&&BBILD&&A){var bt=BAUB.treffer(holeBau,hole,BB.sicht,d.px,d.py,BBILD,d.offen&&d.offen.length?new Set(d.offen):null,fd&&fd.xu,fd&&fd.y);   // G5b: Bauteil vor oder hinter der Natur?
   if(bt&&(!ob||bt.tief>=(ob.x+ob.y)*4+1))ob=bt;var bf=fd&&fd.x!=null?BAUB.feld(holeBau,fd.x,fd.y):null;if(bf){fd.bau=bf}else if(bt&&bt.raum&&fd)fd.bau=BAUB.feld(holeBau,bt.x,bt.y)||{raum:bt.raum,art:0,zustand:bt.zustand}}
  if(BAU.size&&fd&&fd.x!=null&&!fd.bau){var ga=holeBau(fd.x>>6,fd.y>>6),gv=ga&&ga.length>32768?ga[32768+(((fd.y&63)<<6)|(fd.x&63))]:0;if(gv)fd.bweg=[gv&7,(gv>>4)&3]}   // G6a: gebauter Weg
  if(fd&&ob)fd.obj=ob;else if(ob)fd={obj:ob};
  self.postMessage({art:'feld',id:d.id,feld:fd})}
 else if(d.art==='wahl')wahl(d);
 else if(d.art==='messNeu'){if(OFL&&OFL.messNeu)OFL.messNeu()}   // N7a2b3: Messfeld „Reset“
 else if(d.art==='reiche'){REI=!!d.an;RE=null;TEX=TEXD=null}   // N4c1: Knopf „Realms“; die Karte verwirft ihre Fernbilder selbst
 else if(d.art==='start'){self.postMessage({art:'start',gen:gen,platz:A?startplatz():null})}};
