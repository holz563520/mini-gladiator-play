// WAS DIE DATEI TUT: Stadtbilder von Arena Theory 3.0 (Schritt N6a, Entscheidungen Thomas 21.11.2026: Bauplan + Teile, Flächen wie AT3_NEUAUSRICHTUNG 5.2,
// Bild im Bildkern bauen statt fertige Bilder speichern, 12 Baustile als Achse). Gemeinsam für Master-Editor (Reiter „Stadtbilder“) und später Bildkern (N7a);
// läuft im Browser und in Node.
// 1) plan() (seit N6b2c2 nach Einwohnern, Gebäudeliste aus stadtliste.js; Blöcke mit Innenhof, 4 Tore, Hauptstraßen, Mauer ab Marktflecken; ältere Beschreibung:)
//    aus Siedlungsart × Biom × Baustil × Seed × Zusatzteilen ein Bauplan (Felder): Boden je Feld, Häuser als Rechtecke mit Bauklasse, Dach, Firstachse,
//    Tür zur Gasse, Mauer als Feldstücke mit Tor, Plätze, Rundbauten, Dinge (Bäume, Stände, Brunnen …). Varianten aus dem Seed (gespiegelt, Lage von Tempel und
//    Markt, Gassen versetzt). Gleicher Seed = gleicher Plan. Ein Plan ist klein (Kennzahlen, keine Bildpunkte).
// 2) Malen: Boden je Feld aus den Kartei-Böden, jedes Haus mit dem Gebäudebaukasten (baukasten.js setzen, Teile je Bauklasse, Farbtausch nach Biom/Baustil),
//    Rundbauten aus dessen Grundform „rund“, Dinge aus der Kartei; alles nach Tiefe sortiert ins Bild. Bauer in kleinen Schritten (Regel 20): schritt(ms) arbeitet,
//    bis der Zeitanteil um ist. Kosten hängen nur an der Fläche des Orts, nie an der Welt. Bis N6b sind alle Teile Skizzen aus dem Baukasten.
// 3) kacheln(): fertiges Bild in Kacheln (256 × 256) für den Bildkern; leere Kacheln fallen weg.
// 4) kachelBauer() (N6b2-0): baut und hält nur die sichtbaren Kacheln plus einen Ring Vorrat (höchstens 32 ≈ 2 MB), der Rest wird verworfen; jede Kachel
//    ist Bildpunkt für Bildpunkt gleich dem Ausschnitt aus malen(). Pflicht für große Städte (10.000er in 1,5× = 41 MB am Stück). opt.probeW in plan(): Probestadt.
// Kerne: im Editor auf Knopfdruck auf dem Hauptkern (in Schritten), im Spiel ab N7a im Bildkern, einmal je sichtbarem Ort, danach nur Kopieren.
(function(G){
'use strict';
function BK(){return G.AT3_BAUKASTEN||(typeof require!=='undefined'?require('./baukasten.js'):null)}
function S(){return G.AT3_64||(typeof require!=='undefined'?require('./at3-64.js'):null)}
var STEIN=0,ERDE=1,GRUEN=2,HOLZ=3,HAUT=4,BLUT=5,SAND=7,PURPUR=9,OCKER=10,LEER=255;

// Siedlungsarten (N6b2c2, Thomas 22.11.2026: Plan nach Einwohnern ersetzt die festen Flächen aus N6a ganz). Größe g wie orte.js, Probe-Einwohner, wenn opt.einw fehlt.
// Die Fläche ergibt sich aus der Gebäudeliste (stadtliste.js, N6b2c1). slum = Elendssiedlung (nur Bretterbuden, bis N6b5/N6e).
var ARTEN={homestead:{g:1,einw:10},hamlet:{g:2,einw:40},village:{g:3,einw:150},'market-town':{g:4,einw:500},city:{g:5,einw:2000},'great-city':{g:6,einw:5000},
 capital:{g:7,einw:10000},slum:{g:3,einw:150,elend:true}};
var ART_G=['homestead','homestead','hamlet','village','market-town','city','great-city','capital'];
// Blockmaß in Planfeldern je Größe (Thomas: Weiler/Dorf 4, Marktflecken 5, ab Stadt 7 wie die Skizze); Gasse 1 breit, Hauptstraßen 2, Mauer 2 ab Marktflecken.
function blockMass(g){return g<=3?4:g===4?5:7}
var AVE=2,MAUER=2,MAUER_AB=4,PROBE_EINW=20000;
// Gebäude ohne eigene Teile: Baukasten-Haus in seiner Grundfläche (Thomas). Repräsentatives in Marmor, Markt und Forum sind Plätze mit Ständen, Brunnen ein Ding.
var MARMOR={temple:1,senate:1,governor:1,'royal-palace':1,bathhouse:1,theatre:1,aqueduct:1};
var PLATZ={market:'o',forum:'m'},DING={well:'ware-water'};
var EDEL={domus:1,villa:1,palazzo:1};
// N6b2c4c1 Fluss (Thomas 22.11.2026): ab Marktflecken mitten durch die Stadt (Breite in Planfeldern je Größe, Ufergasse auf beiden Seiten, Brücken an der
// Hauptstraße und 1–2 Gassen, Flusstore in der Mauer); Weiler und Dörfer: Fluss vor dem Ort, Furt, wo ein Weg hinausführt. Gebäude, die Wasser brauchen, ans Ufer.
var FLUSS_B=[0,0,2,2,2,2,3,3],UFER={fisher:1,mill:1,'gold-wash':1,'clay-pit':1,tannery:1,dyer:1,fuller:1};
// N6b2c4c2 Küste (Thomas 22.11.2026): gerade Küste auf einer Seite (aus der Welt, orte.js kuesteSeite). Ab Marktflecken: Seemauer bleibt, auf der Meerseite immer ein
// Hafentor; davor ein Landstreifen mit Hafen, Werft und Seefischerei (HAFEN, Tür zum Kai), dann der Kai (2 breit, Zelle q) vor der Stadt, daneben Strand (u), dann Meer (w).
// Molen (q, 2 breit) ins Meer, die erste verlängert die Straße vom Hafentor; Holzstege (y, 1 breit) mit einzelnen Anlegern (1 Feld seitlich). Stinktor, Gräberstraße und
// Gehöfte nie zur See. Fluss quer zur Küste, er mündet ins Meer. Weiler und Dörfer: Strand mit einem Bootssteg an jedem Weg zum Wasser. Schiffe kommen später (eigene Grafik).
// Vorschläge (Regel 11): Molen je Größe MOLEN, Stege alle 4–7 Felder am Kai, 3–5 lang, je Steg 1–2 Anleger; Meer mindestens SEE Planfelder tief.
// N6b2c4c3 Burgberg (Thomas 22.11.2026): nur bei Gebirge als Hauptzone (orte.js huegel), ab Marktflecken. Der Hügel liegt am Stadtrand, die Mauer läuft über den Fels.
// Oben (Kern = Doppelblock des Gipfelbaus mit Platz, höchste Stufe) nach Rang: Palast, sonst Statthalter, sonst Tempel; ab Großstadt ein zweites Monument daneben
// (Akropolis). Die Blöcke rings um den Gipfel bleiben nackter Fels mit Terrassen (kein Haus); Stufen: Gipfel oben (Großstadt/Hauptstadt 4, sonst 3), Felsring zwei
// Stufen tiefer werdend, ab Großstadt ein Ring Häuser auf Stufe 1; Ränder leicht ausgefranst; Wasser, Kai, Strand, Stege und Ufergassen bleiben unten. Höhe nur gemalt wie RCT Classic: je Stufe HSTUFE Bildpunkte höher, Felskante unter vorderen Kanten, Felstreppen auf Wegen.
var GIPFEL1=['royal-palace','governor','temple'],GIPFEL2=['temple','senate','governor','royal-palace'],HSTUFE=16;
var HAFEN={harbour:1,shipyard:1,'sea-fishery':1},MOLEN=[0,0,0,0,1,2,2,3],SEE=9,SEITE_NR={south:0,north:1,east:2,west:3},QUER=[2,3,0,1];
// Zonen von innen nach außen wie die Skizze: Verwaltung, Glaube, Adel, Handel und Gewerbe, Militär, Mietshäuser, Gasthöfe, Unterwelt, Buden
var ORD={administration:0,faith:1,economy:2,households:3,military:4,underworld:5};
function rang(it){if(EDEL[it.id])return 0.5;if(it.id==='tenement'||it.id==='cottage')return 6;if(it.id==='townhouse')return 5.5;
 if(it.id==='inn'||it.id==='cart-yard'||it.id==='trading-post'||it.id==='warehouse'||it.id==='stable'||it.id==='tavern')return 7;
 if(it.id==='shack')return 9;if(it.haupt==='underworld')return 8;return (ORD[it.haupt]==null?3:ORD[it.haupt])+((it.stufe||1)>=4?0:1.5)}
// Geschosse (N6b2b1): Hütten, Elend, Dorf 1 · Bürgerhaus 2 · Mietshaus 2–4 · Domus/Villa 1–2 · Palazzo 2 · Gewerbe 1–2 · Monumente 1
function stock(id,g,u,w,h){if(g<MAUER_AB||Math.min(w,h)<2||id==='shack'||id==='cottage'||MARMOR[id])return 1;if(id==='townhouse')return 2;if(id==='tenement')return 2+Math.floor(u*3);
 if(id==='domus'||id==='villa')return u<.5?2:1;if(id==='palazzo')return 2;return g===4?2:1+(u<.5?1:0)}
// Gebäudedaten: in Node aus daten/gebaeude.json, im Browser über setzeDaten() (Editor) bzw. opt.daten
function SL(){return G.AT3_STADTLISTE||(typeof require!=='undefined'?require('./stadtliste.js'):null)}
var DAT=null;function setzeDaten(geb){DAT=geb&&geb.G?geb:SL().daten(geb);return DAT}
function daten(o){if(o&&o.daten)return o.daten.G?o.daten:SL().daten(o.daten);if(!DAT&&typeof require!=='undefined')DAT=SL().daten(require('./daten/gebaeude.json'));
 if(!DAT)throw new Error('Gebäudedaten fehlen (setzeDaten)');return DAT}
// Bauweise je Biom (5.3a) als Skizze aus den Baukasten-Teilen: Bauklasse, Dachform, Farbtausch (Wand, Dach), Boden, Gassenbelag, Bäume, Dichte im Umland, Felder.
var BIOME={
 mediterranean:{klasse:'brick',dach:'sattel',wand:STEIN,satz:'putz',boden:['boden-gras','boden-erde'],weg:'boden-weg',baeume:['baum-olive','baum-zypresse','busch-bluete'],dichte:.16,feld:'bk-feld'},
 grassland:{klasse:'clay-wood',dach:'sattel',boden:['boden-gras'],weg:'boden-weg',baeume:['baum-pappel','busch-hasel'],dichte:.06,feld:'bk-feld'},
 broadleaf:{klasse:'clay-wood',dach:'sattel',wand:HOLZ,boden:['boden-gras'],weg:'boden-erde',baeume:['baum-eiche-skizze','baum-buche','baum-apfel','busch-gruen'],dichte:.3,feld:'bk-feld'},
 desert:{klasse:'clay-wood',dach:'flach',wand:SAND,dachR:SAND,boden:['boden-sand'],weg:'boden-sand',baeume:['baum-dattelpalme','busch-tamariske'],dichte:.03,feld:'boden-erde'},
 mountain:{klasse:'marble',dach:'sattel',dachR:HOLZ,boden:['boden-fels','boden-gras'],weg:'boden-weg',baeume:['baum-tanne','fels-block'],dichte:.14,feld:'bk-feld'},
 savanna:{klasse:'clay-wood',dach:'walm',dachR:OCKER,boden:['boden-gras','boden-sand'],weg:'boden-sand',baeume:['baum-akazie','baum-baobab','blume-hohes-gras'],dichte:.07,feld:'boden-erde'},
 conifer:{klasse:'clay-wood',dach:'sattel',wand:HOLZ,dachR:HOLZ,boden:['boden-gras','boden-erde'],weg:'boden-erde',baeume:['baum-tanne','baum-birke'],dichte:.32,feld:'bk-feld'},
 coast:{klasse:'brick',dach:'sattel',boden:['boden-gras','boden-sand'],weg:'boden-weg',baeume:['baum-pappel','busch-gruen'],dichte:.05,feld:'bk-feld',wasser:true},
 swamp:{klasse:'clay-wood',dach:'walm',wand:HOLZ,dachR:OCKER,boden:['boden-erde','boden-gras'],weg:'boden-erde',baeume:['blume-schilf','busch-gruen','baum-lianen'],dichte:.2,feld:'boden-erde',wasser:true},
 rainforest:{klasse:'clay-wood',dach:'walm',wand:HOLZ,dachR:GRUEN,boden:['boden-gras'],weg:'boden-erde',baeume:['baum-lianen','baum-kokospalme','busch-banane','baum-farn'],dichte:.42,feld:'boden-erde'},
 mangrove:{klasse:'clay-wood',dach:'walm',wand:HOLZ,dachR:OCKER,boden:['boden-erde','boden-sand'],weg:'boden-sand',baeume:['baum-mangrove','blume-schilf'],dichte:.22,feld:'boden-erde',wasser:true},
 tundra:{klasse:'clay-wood',dach:'flach',wand:ERDE,dachR:GRUEN,boden:['boden-erde','boden-gras'],weg:'boden-erde',baeume:['busch-gruen','fels-block'],dichte:.04,feld:'boden-erde'},
 snow:{klasse:'marble',dach:'flach',boden:['boden-fels'],weg:'boden-fels',baeume:['fels-block'],dichte:.03,feld:'boden-fels',nurAussenposten:true}};
// Baustile der Kulturen (daten/ortsbilder.json, zweite Achse): überschreiben Bauklasse, Dach und Farben; Boden und Pflanzen bleiben vom Biom.
var STILE={
 mudbrick:{klasse:'clay-wood',dach:'flach',wand:SAND,dachR:SAND},
 palisade:{klasse:'clay-wood',dach:'sattel',wand:HOLZ},
 fieldstone:{klasse:'marble',dach:'sattel',dachR:OCKER},
 marble:{klasse:'marble',dach:'walm'},
 pagoda:{klasse:'brick',dach:'walm',dachR:PURPUR},
 'step-pyramid':{klasse:'marble',dach:'flach',wand:SAND,dachR:SAND},
 tents:{klasse:'clay-wood',dach:'walm',wand:HAUT,dachR:HAUT},
 stilts:{klasse:'clay-wood',dach:'walm',wand:HOLZ,dachR:OCKER},
 'style-09':{klasse:'clay-wood',dach:'sattel',wand:HOLZ,dachR:GRUEN,lang:true},
 'style-10':{klasse:'brick',dach:'flach',wand:STEIN,dachR:STEIN},
 'style-11':{klasse:'clay-wood',dach:'walm',dachR:OCKER},
 'style-12':{klasse:'marble',dach:'flach',wand:ERDE,dachR:ERDE}};
var STUFE={'clay-wood':'brick',brick:'marble',marble:'marble'};

function hashT(s){var h=2166136261>>>0;s=String(s);for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h}
function rng(seed){var a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function rausch(i,j,s){var h=(Math.imul(i|0,374761393)+Math.imul(j|0,668265263)+Math.imul(s|0,982451653))>>>0;h=Math.imul(h^(h>>>13),1274126177)>>>0;return((h^(h>>>16))>>>0)/4294967296}

// ---------- Bauplan ----------
// opt: {art, biom, stil ('' = nach Biom), seed, zusatz (Liste oder null = Standard der Art)}. Ergebnis: {art,biom,stil,seed,W,zellen,bauten,dinge,tor,zusatz,gespiegelt}
// Zellen: g Wiese, s Gasse, o Platz (Pflaster der Bauklasse), m Platz aus Marmor, f Feld, w Wasser, e Erde (Elend), p Weide, x Ruine/Fels; Küste (N6b2c4c2): q Kai und Mole, y Holzsteg und Anleger (Boden Wasser, Deck als Ding eine Stufe höher), u Strand.
// Plan nach Einwohnern (N6b2c2): Gebäudeliste (nur Lage „innen“; Tor und Umland kommen mit N6b2c3) → Blöcke mit Innenhof, jedes Gebäude am Blockrand mit Tür zur Gasse,
// zwei Hauptstraßen (2 breit) kreuzen in der Mitte und enden an 4 Toren, Ringgasse innen an der Mauer (2 breit, ab Marktflecken, Platzhalter bis N6b2d).
// Monumente (Fläche ≥ 30 oder breiter als ein Block) liegen mittig in Doppelblöcken; der Rest der Gruppe ist Platz mit Zugängen von allen 4 Seiten.
// Zonen von innen nach außen (rang). Varianten aus dem Seed: Lage der Monumente, Reihenfolge der Blöcke, Drehung, Spiegeln. Gleicher Seed = gleicher Plan.
// opt: {seed, biom, stil?, einw? (1–20.000), art? (Probe-Einwohner der Art), liste? (stadtliste-Ergebnis), leit?, daten?, probeW? (Probestadt = 20.000 Einwohner), mass?}
// N6b2c4a2 (Thomas 22.11.2026, ab Marktflecken): Umriss aus dem Seed, Mauer folgt. Rund, oval, unregelmäßig je 30 %, Quadrat/Rechteck je 5 %.
// Vieleck (Thomas): lange gerade Stücke längs der Achsen, Ecken als kurze Treppe (Steigung 1, bei 12 Ecken zusätzlich 1:2 und 2:1).
// Unregelmäßig = rund mit Beulen: jede Seite und jede Ecke anders, dazu 1–2 Ausbuchtungen (angebaute Viertel). Koordinaten u, v in −1 … 1 (v > 0 = Süden).
// Tore nach Größe: Marktflecken 2–3, Stadt 3–4, Großstadt/Hauptstadt 4–6.
function umrissWahl(r,g){var x=r(),art=x<.3?'rund':x<.6?'oval':x<.9?'unregelmaessig':x<.95?'quadrat':'rechteck';
 var e=[1,1,1,1],c=[0,0,0,0],zw=false,d=0,beulen=[],k,a;   // e: Süd, Nord, Ost, West; c: Eckschnitt je Viertel SO, SW, NO, NW
 if(art==='rund'){a=.45+r()*.15;c=[a,a,a,a]}
 else if(art==='oval'){a=.7+r()*.12;if(r()<.5)e[0]=e[1]=a;else e[2]=e[3]=a;var cc=.3+r()*.15;c=[cc,cc,cc,cc]}
 else if(art==='unregelmaessig'){for(k=0;k<4;k++)e[k]=.8+r()*.15;for(k=0;k<4;k++)c[k]=.35+r()*.25;
  for(var nbu=1+(r()<.5?1:0),b=0;b<nbu;b++){var s=Math.floor(r()*4),t=(r()-.5)*.9,gr=Math.min(.3,(1-e[s])/.7);if(gr<.1)continue;
   beulen.push(s===0?{u:t,v:e[0]-.3*gr,s:gr}:s===1?{u:t,v:-(e[1]-.3*gr),s:gr}:s===2?{u:e[2]-.3*gr,v:t,s:gr}:{u:-(e[3]-.3*gr),v:t,s:gr})}}
 else if(art==='rechteck'){a=.7+r()*.15;if(r()<.5)e[0]=e[1]=a;else e[2]=e[3]=a}
 if(art==='rund'||art==='oval'||art==='unregelmaessig'){zw=r()<.5;d=.12+r()*.08;for(k=0;k<4;k++)if(c[k]-.05<d)d=Math.max(0,c[k]-.05)}
 var koerper=function(u,v){if(v>e[0]||v<-e[1]||u>e[2]||u<-e[3])return false;var q=(v>=0?0:2)+(u>=0?0:1),eu=u>=0?e[2]:e[3],ev=v>=0?e[0]:e[1],au=Math.abs(u),av=Math.abs(v);
  if(c[q]>0&&au+av>eu+ev-c[q])return false;if(zw&&d>0&&(2*au+av>2*eu+ev-c[q]-d||au+2*av>eu+2*ev-c[q]-d))return false;return true};
 var innen=function(u,v){if(koerper(u,v))return true;for(var b=0;b<beulen.length;b++){var B=beulen[b],au=Math.abs(u-B.u),av=Math.abs(v-B.v);if(au<=B.s&&av<=B.s&&au+av<=1.4*B.s)return true}return false};
 var n=0,N=48;for(var j=0;j<N;j++)for(var i=0;i<N;i++)if(innen((i+.5)/N*2-1,(j+.5)/N*2-1))n++;
 var tore=g<=4?2+(r()<.5?1:0):g===5?3+(r()<.5?1:0):4+Math.floor(r()*3);
 return{art:art,ecken:art==='quadrat'||art==='rechteck'?4:zw?12:8,beulen:beulen.length,innen:innen,anteil:n/(N*N),tore:tore}}
// Innen-Maske eines fertigen Plans (1 = innerhalb der Mauer, Mauer eingeschlossen), auch skaliert und gespiegelt. Ohne Umriss (offene Orte): alles 1.
function innenMaske(P){var W=P.W,M=new Uint8Array(W*W),U=P.umriss;if(!U||!U.zeilen){M.fill(1);return M}
 if(U.bild){for(var kb=0;kb<U.bild.length;kb+=3)for(var ib=U.bild[kb+1];ib<=U.bild[kb+2];ib++)M[U.bild[kb]*W+ib]=1;return M}   // N6b2e2a: Umriss in Bildfeldern
 var F=P.mass||1,PW=U.planW,rows={},k,I,J;for(k=0;k<U.zeilen.length;k+=3)(rows[U.zeilen[k]]=rows[U.zeilen[k]]||[]).push(U.zeilen[k+1],U.zeilen[k+2]);
 for(J=0;J<W;J++)for(I=0;I<W;I++){var a=P.gespiegelt?J:I,b=P.gespiegelt?I:J,pi=Math.min(PW-1,Math.floor(a/F)),r=rows[Math.min(PW-1,Math.floor(b/F))];
  if(r)for(k=0;k<r.length;k+=2)if(pi>=r[k]&&pi<=r[k+1]){M[J*W+I]=1;break}}return M}
function plan(opt){
 var art=opt.art||'',A=art?ARTEN[art]:null;if(art&&!A)throw new Error('Unbekannte Siedlungsart: '+art);var B=BIOME[opt.biom];if(!B)throw new Error('Unbekanntes Biom: '+opt.biom);
 var ST=opt.stil?STILE[opt.stil]:null;if(opt.stil&&!ST)throw new Error('Unbekannter Baustil: '+opt.stil);
 var F=opt.mass==null?BK().MASS:+opt.mass,seed=opt.seed>>>0,elend=!!(A&&A.elend);
 var einw=opt.liste?opt.liste.einw:opt.einw!=null?Math.max(1,Math.min(20000,opt.einw|0)):opt.probeW?PROBE_EINW:A?A.einw:150;
 var Li=opt.liste||(elend?null:SL().probe(einw,opt.biom,seed,daten(opt),opt.leit)),g=elend?3:Li.g;if(!art)art=ART_G[g];
 var basis={klasse:(ST||B).klasse,dach:(ST||B).dach,wand:(ST||B).wand,dachR:(ST||B).dachR};
 // Fluss (N6b2c4c1): opt.fluss 'ns' | 'ow' (aus der Welt, orte.js flussAchse) oder true (Richtung aus dem Seed); nicht in Elendssiedlungen
 var FL=elend||!opt.fluss?null:opt.fluss==='ns'||opt.fluss==='ow'?opt.fluss:(rng(hashT([seed,einw,'flussachse'].join('|')))()<.5?'ns':'ow');
 // Küste (N6b2c4c2): opt.kueste 'south' | 'north' | 'east' | 'west' (aus der Welt) oder true (Seite aus dem Seed). KS = Seite in der Welt, KSP = Seite im Plan
 // (der Plan wird am Schluss evtl. an der Diagonale gespiegelt: Süd ↔ Ost, Nord ↔ West). Stadt mit Fluss: Fluss quer zur Küste (mündet ins Meer).
 var KS=elend||!opt.kueste?null:SEITE_NR[opt.kueste]!=null?SEITE_NR[opt.kueste]:Math.floor(rng(hashT([seed,einw,'kuestenseite'].join('|')))()*4);
 var spW0=rng(hashT([seed,art,einw,'sp'].join('|')))()<.5,KSP=null,spK=null;
 if(KS!=null&&g>=MAUER_AB){if(FL)FL=KS<2?'ns':'ow';spK=FL?FL==='ow':spW0;KSP=spK?QUER[KS]:KS}
 // Gebäude einzeln
 var items=[];if(elend){for(var e0=Math.ceil(einw/6);e0>0;e0--)items.push({id:'shack',w:1,h:1,haupt:'households',stufe:1})}
 else Li.gebaeude.forEach(function(x){if(x.lage!=='innen')return;for(var k=0;k<x.n;k++)items.push({id:x.id,w:x.w,h:x.h,haupt:x.haupt,stufe:x.stufe})});
 // Küste ab Marktflecken: Hafen, Werft, Seefischerei stehen draußen am Kai statt in der Stadt
 var hafenItems=KSP!=null?items.filter(function(it){return HAFEN[it.id]}):[];if(hafenItems.length)items=items.filter(function(it){return !HAFEN[it.id]});
 var Bm=blockMass(g),P1=Bm+1,wall=g>=MAUER_AB&&!elend?MAUER:0,off=wall+1;
 // Burgberg (N6b2c4c3): Gipfelbau(ten) nach Rang, immer als Monument (eigener Doppelblock mit Platz)
 var HU=!!opt.huegel&&!elend&&g>=MAUER_AB,HT=g>=6?4:3,gip1=null,gip2=null;
 if(HU){for(var q0=0;q0<GIPFEL1.length&&!gip1;q0++)gip1=items.filter(function(it){return it.id===GIPFEL1[q0]})[0]||null;
  if(gip1){gip1.gipfel=1;if(g>=6)for(var q1=0;q1<GIPFEL2.length&&!gip2;q1++)gip2=items.filter(function(it){return it.id===GIPFEL2[q1]&&it!==gip1})[0]||null;if(gip2)gip2.gipfel=2}else HU=false}
 var istMono=function(it){return !!it.gipfel||Math.max(it.w,it.h)>Bm||it.w*it.h>=30};
 var mono=items.filter(istMono),rest=items.filter(function(it){return !istMono(it)});
 mono.sort(function(a,b){return (b.gipfel?3-b.gipfel:0)-(a.gipfel?3-a.gipfel:0)||b.w*b.h-a.w*a.h||(a.id<b.id?-1:a.id>b.id?1:0)});
 rest.sort(function(a,b){return rang(a)-rang(b)||b.w*b.h-a.w*a.h||(a.id<b.id?-1:a.id>b.id?1:0)});
 var grpK=function(it){var m=Math.max(it.w,it.h),k=2;while(k*P1-1<m)k++;return k};
 var fl=0,kmax=0;rest.forEach(function(it){fl+=it.w*it.h});mono.forEach(function(it){var k=grpK(it);fl+=k*k*Bm*Bm;if(k>kmax)kmax=k});
 var viel0=g>=MAUER_AB&&!elend&&opt.vielfalt!==false,UM=viel0?umrissWahl(rng(hashT([seed,art,opt.biom,einw,'umriss'].join('|'))),g):null;
 if(HU){var gk=grpK(gip1);fl+=(4*gk+4)*Bm*Bm}   // Burgberg: Felsblöcke rings um den Gipfel
 var nb=Math.max(2,Math.ceil(Math.sqrt(fl/(Bm*Bm)/(UM?UM.anteil:1))),2*kmax);if(nb%2)nb++;   // erst dicht versuchen, bei Bedarf je 2 Blöcke mehr
 var ergebnis=null;
 // N6b2c4b: Weiler und Dörfer gewachsen (dorf()), opt.vielfalt === false = Raster
 if(g>=2&&g<=3&&!elend&&opt.vielfalt!==false)for(var vd=0;vd<14&&!ergebnis;vd++)ergebnis=dorf(vd);
 for(var versuch=0;versuch<14&&!ergebnis;versuch++,nb+=2)ergebnis=anlegen(nb);
 if(!ergebnis)throw new Error('Stadtplan passt nicht ('+items.length+' Gebäude)');
 // Vor den Toren und Umland (N6b2c3): Außenring um den Plan innen; opt.aussen === false = nur innen (Tests N6b2c2)
 if(opt.aussen!==false&&!elend){var ea=null;for(var zug=0;zug<12&&!ea;zug++)ea=aussen(ergebnis,zug);if(!ea)throw new Error('Außenring passt nicht');ergebnis=ea}
 function aussen(E,zug){
  var Wi=E.W,MK=E.maske,TO=E.tore,ra=rng(hashT([seed,art,opt.biom,einw,'aussen'].join('|'))),D=daten(opt),gST=SL().STUFE[g]||1,mit=g>=MAUER_AB;
  // N6b2c4a2: Stinktor und Gräberstraße an zwei verschiedenen Haupttoren; Zusatztore bekommen nur Gehöfte
  // Küste (N6b2c4c2): Seite im Plan (Weiler und Dörfer: die der zwei möglichen, an der ein Weg hinausführt), uS = Abstand vom Rand des Plans innen zur See hin,
  // lS = Lage längs der Küste. Ab uK: Kai bzw. Strand (2 Felder), ab uK + 2 Meer.
  var ks=KSP,spKa=spK;if(KS!=null&&ks==null){var kA=spW0?QUER[KS]:KS,kB=spW0?KS:QUER[KS],hat=function(s){return TO.some(function(t){return t.s===s})};
   if(!hat(kA)&&hat(kB)){ks=kB;spKa=!spW0}else{ks=kA;spKa=spW0}}
  var uS=function(x,y){return ks===0?y-Wi:ks===1?-1-y:ks===2?x-Wi:-1-x},lS=function(x,y){return ks<2?x:y};
  var stadtK=ks!=null&&g>=MAUER_AB,hTief=0,hafenL=hafenItems.slice();
  if(stadtK)Li.gebaeude.forEach(function(x){if(x.lage==='umland'&&HAFEN[x.id])for(var k=0;k<x.n;k++)hafenL.push({id:x.id,w:x.w,h:x.h})});   // Seefischerei aus dem Umland
  hafenL.forEach(function(it){var d=Math.min(it.w,it.h);if(d>hTief)hTief=d});
  var uK=ks==null?0:stadtK?Math.max(3,hTief+2):3+Math.floor(ra()*2);
  var see=function(x,y){return ks!=null&&uS(x,y)>=uK};
  var HP=[];TO.forEach(function(t,k){if(t.haupt&&t.s!==ks)HP.push(k)});if(HP.length<2&&(ks==null||!HP.length))return null;
  var sI=Math.floor(ra()*HP.length),stinkK=HP[sI],grabK=HP.length<2?stinkK:HP[(sI+1+Math.floor(ra()*(HP.length-1)))%HP.length];
  var gewerbe=[],tote=[],friedhof=[],buden=0,hoefe=[];
  Li.gebaeude.forEach(function(x){for(var k=0;k<x.n;k++){
   if(x.lage==='tor'){if(x.id==='shack')buden++;else if(x.id==='cemetery')friedhof.push(x);else if(TOTE[x.id])tote.push(x);else gewerbe.push(x)}
   else if(x.lage==='umland'&&!(stadtK&&HAFEN[x.id]))hoefe.push({id:x.id,w:x.w,h:x.h,liste:true})}});
  // Zusätzliche Felder und Weiden nach Einwohnern (Vorschlag: 1 Hof je HOF_JE Einwohner), Arten aus dem Biom, abwechselnd Feld und Herde
  var passt=function(x){return x&&x.hof&&(x.gruppe==='felder'||x.gruppe==='vieh')&&(x.biom.indexOf('alle')>=0||x.biom.indexOf(opt.biom)>=0)&&(x.stufe||1)<=gST};
  var FA=D.L.filter(function(x){return passt(x)&&x.gruppe==='felder'&&!HAIN[x.id]}).map(function(x){return x.id}).sort(),
      VA=D.L.filter(function(x){return passt(x)&&x.gruppe==='vieh'}).map(function(x){return x.id}).sort();
  var nx=Math.floor(einw/HOF_JE);for(var k=0;k<nx;k++){var L2=(k%2&&VA.length)||!FA.length?VA:FA;if(!L2.length)break;var id=L2[Math.floor(ra()*L2.length)],fs=SL().fuss(D.G[id]);hoefe.push({id:id,w:fs[0],h:fs[1],liste:false})}
  var graeber=mit&&(tote.length||friedhof.length)?Math.min(GRAB_MAX,Math.ceil(einw/GRAB_JE)):0;
  // Lage je Tor: u = Abstand vom Rand des Plans innen nach außen (negativ = zwischen Mauer und Rand, dort ist Umland), l = quer (Straße l 0 und 1).
  // Erst alles in Koordinaten des Plans innen (auch negativ) mit Belegungsprüfung legen, dann die Ringbreite R bestimmen.
  var glob=function(t,u,l){return t.s===0?[t.c+l,Wi+u]:t.s===1?[t.c+l,-1-u]:t.s===2?[Wi+u,t.c+l]:[-1-u,t.c+l]};
  var lok=function(t,x,y){return t.s===0?[y-Wi,x-t.c]:t.s===1?[-1-y,x-t.c]:t.s===2?[x-Wi,y-t.c]:[-1-x,y-t.c]};
  var OFF=4096,key=function(x,y){return (x+OFF)*8192+(y+OFF)},occ=new Set();
  var aufStr=function(x,y){for(var k=0;k<TO.length;k++){var L=lok(TO[k],x,y);if((L[1]===0||L[1]===1)&&L[0]>=TO[k].u0&&(TO[k].s!==ks||L[0]<uK))return true}return false};
  // Fluss (N6b2c4c1): Stadt = Wasserspalten des Plans laufen bis zum Bildrand weiter; Weiler und Dörfer = Band vor einer Seite mit Ausgang (Furt am Weg)
  var FE=E.fluss?JSON.parse(JSON.stringify(E.fluss)):null,fd=null;
  if(FL&&!FE&&g<MAUER_AB){var rd=rng(hashT([seed,art,einw,'flussdorf'].join('|'))),TF=TO;
   // mit Küste: Fluss vor einer Seite quer zur Küste (mündet ins Meer), sonst einer Seite, die nicht zur See liegt
   if(ks!=null){var TQ=TO.filter(function(t){return (t.s<2)!==(ks<2)}),TN=TO.filter(function(t){return t.s!==ks});TF=TQ.length?TQ:TN.length?TN:TO}
   var sd=TF[Math.floor(rd()*TF.length)].s;fd={s:sd,u1:2+Math.floor(rd()*3),b:2};
   FE={achse:sd<2?'ow':'ns',breite:2,bruecken:0,furten:TO.filter(function(t){return t.s===sd}).length,tore:0}}
  var wasser=function(x,y){if(fd){var u=fd.s===0?y-Wi:fd.s===1?-1-y:fd.s===2?x-Wi:-1-x;return u>=fd.u1&&u<fd.u1+fd.b}
   if(!FE)return false;if(x>=0&&y>=0&&x<Wi&&y<Wi)return E.Z[y*Wi+x]==='w';return x>=FE.x0&&x<FE.x0+FE.breite&&(y<0||y>=Wi)};
  var frei=function(x,y){if(occ.has(key(x,y))||aufStr(x,y)||wasser(x,y)||see(x,y))return false;if(x>=0&&y>=0&&x<Wi&&y<Wi){var kk=y*Wi+x;return !MK[kk]&&E.Z[kk]!=='s'}return true};
  // Seite eines Punkts vom Mittelpunkt aus (wie die Tests); −1 = zu nah an der Diagonale
  var seiteVon=function(x,y){var dx=x-Wi/2,dy=y-Wi/2;if(Math.abs(Math.abs(dx)-Math.abs(dy))<1.5)return -1;return Math.abs(dx)>Math.abs(dy)?(dx>0?2:3):(dy>0?0:1)};
  var rechteck=function(t,u0,du,l0,dl){var a=glob(t,u0,l0),b=glob(t,u0+du-1,l0+dl-1);return{i:Math.min(a[0],b[0]),j:Math.min(a[1],b[1]),w:Math.abs(a[0]-b[0])+1,h:Math.abs(a[1]-b[1])+1}};
  var cur=[],teile=[];TO.forEach(function(t){cur.push(t.u0,t.u0)});
  var leg=function(z,du,dl,gap,was,fest){var t=TO[z>>1],sei=z&1,l0=sei===0?-dl:2;
   for(var u=cur[z];u<cur[z]+800;u++){var r=rechteck(t,u,du,l0,dl),ok=true,x,y;
    if(fest&&seiteVon(r.i+r.w/2,r.j+r.h/2)!==t.s)continue;
    for(y=r.j;y<r.j+r.h&&ok;y++)for(x=r.i;x<r.i+r.w&&ok;x++)if(!frei(x,y))ok=false;
    if(!ok)continue;for(y=r.j;y<r.j+r.h;y++)for(x=r.i;x<r.i+r.w;x++)occ.add(key(x,y));
    teile.push({t:z>>1,sei:sei,u0:u,du:du,dl:dl,was:was,r:r});cur[z]=u+du+gap;return true}
   return false};
  var minZ=function(k){return cur[k*2]<=cur[k*2+1]?k*2:k*2+1};
  // Vor dem Tor: zuerst die kürzere Straßenseite, passt es dort nicht (Zusatzstraße daneben), die andere
  var legT=function(k,du,dl,gap,was){var z=minZ(k);return leg(z,du,dl,gap,was,true)||leg(z^1,du,dl,gap,was,true)};
  // Elendsbuden als wilder Haufen an der Mauer vor dem Stinktor, der Mauer entlang (auch um Ecken, solange es dieselbe Seite bleibt):
  // je Spalte eine Schlammgasse direkt vor der Mauer (an Stufen so lang, dass sie zusammenhängt), dahinter Ue Felder Schlamm für die Buden.
  var tS=TO[stinkK],eG=[],eR=[],Ue=0;
  if(buden){var uwC={},uw=function(l){if(l in uwC)return uwC[l];var last=null;for(var u=-Wi;u<0;u++){var p=glob(tS,u,l);if(p[0]>=0&&p[1]>=0&&p[0]<Wi&&p[1]<Wi&&MK[p[1]*Wi+p[0]])last=u}return uwC[l]=last===null?null:last+1};
   var strU=function(l){if(l===0||l===1)return tS.u0;for(var k=0;k<TO.length;k++){var t2=TO[k];if(k!==stinkK&&t2.s===tS.s&&(l+tS.c-t2.c===0||l+tS.c-t2.c===1))return t2.u0}return null};
   var gut=function(l,u){var p=glob(tS,u,l);return frei(p[0],p[1])&&seiteVon(p[0]+.5,p[1]+.5)===tS.s};
   var spalten=function(tief){var out=[];[-1,1].forEach(function(dir){var prev=tS.u0;
     for(var l=dir<0?-1:2;;l+=dir){var su=strU(l);if(su!==null){prev=su;continue}
      var w=uw(l);if(w===null)break;var nu=strU(l+dir);if(nu===null)nu=uw(l+dir);var end=Math.max(w,prev,nu===null?w:nu),ok=true,u;
      for(u=w;u<=end&&ok;u++)if(!gut(l,u))ok=false;if(!ok)break;
      var reg=[];if(l<=-5||l>=6)for(u=end+1;u<=w+tief;u++){if(!gut(l,u))break;reg.push(u)}
      out.push({l:l,w:w,end:end,reg:reg});prev=w}});return out};
   var regW=spalten(1).filter(function(c){return c.reg.length}).length;if(!regW)return null;
   Ue=Math.max(2,Math.ceil(buden*2.6/regW))+zug;
   spalten(Ue).forEach(function(c){for(var u=c.w;u<=c.end;u++){var p=glob(tS,u,c.l);eG.push(p);occ.add(key(p[0],p[1]))}
    c.reg.forEach(function(u){var p=glob(tS,u,c.l);eR.push(p);occ.add(key(p[0],p[1]))})})}
  var i0;
  for(i0=0;i0<gewerbe.length;i0++){var x0=gewerbe[i0];if(!legT(stinkK,Math.max(x0.w,x0.h),Math.min(x0.w,x0.h),1,{art:'gewerbe',x:x0}))return null}
  for(i0=0;i0<tote.length;i0++){var x1=tote[i0];if(!legT(grabK,Math.max(x1.w,x1.h),Math.min(x1.w,x1.h),1,{art:'gewerbe',x:x1}))return null}
  for(var gb=0;gb<graeber;gb++)if(!legT(grabK,1,1,gb%3===2?1:0,{art:'grab'}))return null;
  for(i0=0;i0<friedhof.length;i0++){var x2=friedhof[i0];if(!legT(grabK,Math.max(x2.w,x2.h),Math.min(x2.w,x2.h),1,{art:'friedhof',x:x2}))return null}
  for(i0=0;i0<hoefe.length;i0++){var h0=hoefe[i0],Zs=cur.map(function(v,z){return z}).filter(function(z){return TO[z>>1].s!==ks}).sort(function(a,b){return cur[a]-cur[b]||a-b}),gelegt=false;
   for(var zi=0;zi<Zs.length&&!gelegt;zi++)gelegt=leg(Zs[zi],h0.w,h0.h,1,{art:'hof',h:h0},false);if(!gelegt)return null}
  // Küste (N6b2c4c2): Hafen, Werft, Seefischerei am Kai, nahe dem Hafentor, abwechselnd rechts und links der Straße, Tür zum Kai, 1 Feld Abstand
  var tH=ks==null?null:TO.filter(function(t){return t.s===ks&&t.haupt})[0]||TO.filter(function(t){return t.s===ks})[0]||null,hafenTeile=[];
  var rUA=function(u0,du,a0,da){var p=ks<2?[a0,ks===0?Wi+u0:-u0-du]:[ks===2?Wi+u0:-u0-du,a0];return ks<2?{i:p[0],j:p[1],w:da,h:du}:{i:p[0],j:p[1],w:du,h:da}};
  var KDIR=[[0,1],[0,-1],[1,0],[-1,0]];
  if(stadtK){if(!tH)return null;var hs=hafenL.slice().sort(function(a,b){return b.w*b.h-a.w*a.h||(a.id<b.id?-1:1)}),nr=[tH.c+3,tH.c-2];
   for(var hi0=0;hi0<hs.length;hi0++){var hx0=hs[hi0],dd=Math.min(hx0.w,hx0.h),da0=Math.max(hx0.w,hx0.h),ok0=false;
    for(var tr=0;tr<400&&!ok0;tr++){var sei0=tr&1,a0=sei0===0?nr[0]+(tr>>1):nr[1]-da0+1-(tr>>1),rr=rUA(uK-dd,dd,a0,da0),fr=true;
     for(var yy=rr.j;yy<rr.j+rr.h&&fr;yy++)for(var xx=rr.i;xx<rr.i+rr.w&&fr;xx++)if(!frei(xx,yy))fr=false;if(!fr)continue;
     for(yy=rr.j;yy<rr.j+rr.h;yy++)for(xx=rr.i;xx<rr.i+rr.w;xx++)occ.add(key(xx,yy));
     [a0-1,a0+da0].forEach(function(al){for(var uu=uK-dd;uu<uK;uu++){var q=ks<2?[al,ks===0?Wi+uu:-1-uu]:[ks===2?Wi+uu:-1-uu,al];occ.add(key(q[0],q[1]))}});
     var tm=a0+(da0>>1),tp=ks<2?[tm,ks===0?Wi+uK-1:-uK]:[ks===2?Wi+uK-1:-uK,tm];
     hafenTeile.push({id:hx0.id,a0:a0,a1:a0+da0-1,r:rr,tuer:[tp[0],tp[1],KDIR[ks][0],KDIR[ks][1]]});ok0=true}
    if(!ok0)return null}}
  // Ringbreite: alles Gelegte plus 2 Felder Rand
  var ext=0;occ.forEach(function(v){var x=Math.floor(v/8192)-OFF,y=v%8192-OFF,e2=Math.max(-x,-y,x-Wi+1,y-Wi+1);if(e2>ext)ext=e2});
  if(fd&&fd.u1+fd.b>ext)ext=fd.u1+fd.b;
  if(ks!=null&&uK+2+(stadtK?SEE:6)>ext)ext=uK+2+(stadtK?SEE:6);   // Meer: Kai bzw. Strand und genug Wasser für Molen und Stege
  var R=Math.max(4,ext+2);if(opt.zeilen)opt.zeilen.push(cur.slice());
  var W=Wi+2*R,Z=new Array(W*W).fill('g'),belegt=new Uint8Array(W*W),at=function(i,j){return j*W+i},keinBaum=new Uint8Array(W*W),neu=new Uint8Array(W*W);
  for(var j=0;j<Wi;j++)for(var i=0;i<Wi;i++)Z[at(i+R,j+R)]=E.Z[j*Wi+i];
  var verschieben=function(o){var q=JSON.parse(JSON.stringify(o));q.i+=R;q.j+=R;if(q.tuer){q.tuer[0]+=R;q.tuer[1]+=R}return q};
  var bauten=E.bauten.map(verschieben),dinge=E.dinge.map(verschieben),nE=dinge.length,gesetzt=JSON.parse(JSON.stringify(E.gesetzt));
  for(var q0=0;q0<bauten.length;q0++){var b0=bauten[q0];for(var y0=b0.j;y0<b0.j+b0.h;y0++)for(var xb=b0.i;xb<b0.i+b0.w;xb++)belegt[at(xb,y0)]=1}
  for(var y1=R;y1<R+Wi;y1++)for(var x1=R;x1<R+Wi;x1++)keinBaum[at(x1,y1)]=1;
  var hin=function(r,c){for(var y=r.j;y<r.j+r.h;y++)for(var x=r.i;x<r.i+r.w;x++){Z[at(x,y)]=c;keinBaum[at(x,y)]=1;neu[at(x,y)]=1}};
  var bau=function(id,rolle,r,tuer,kl){var u=rausch(r.i,r.j,seed+31),sh=rolle==='shack',gr=rolle==='grab';kl=kl||(sh?'clay-wood':gr?'marble':basis.klasse);
   var satz=!sh&&!gr&&!ST&&B.satz&&kl===basis.klasse?B.satz:null,schmal=Math.min(r.w,r.h)<2;
   for(var y=r.j;y<r.j+r.h;y++)for(var x=r.i;x<r.i+r.w;x++){belegt[at(x,y)]=1;keinBaum[at(x,y)]=1;neu[at(x,y)]=1;Z[at(x,y)]='g'}
   bauten.push({rolle:rolle,id:id,i:r.i,j:r.j,w:r.w,h:r.h,g:sh||gr||rolle==='hof'?1:stock(id,g,u,r.w,r.h),klasse:kl,dach:sh||gr||schmal?'flach':basis.dach,
    achse:r.w>r.h?'i':r.h>r.w?'j':(u<.5?'i':'j'),wand:kl===basis.klasse&&!sh&&!satz?basis.wand:null,dachR:sh?HOLZ:kl===basis.klasse&&!satz?basis.dachR:null,tuer:tuer,satz:satz})};
  var schieb=function(r){return{i:r.i+R,j:r.j+R,w:r.w,h:r.h}};
  // Ausfallstraßen vom Plan innen bis zum Bildrand (zwischen Mauer und Rand liegen sie schon im Plan innen)
  TO.forEach(function(t){for(var u=0;u<(t.s===ks?Math.min(R,uK):R);u++)for(var l=0;l<2;l++){var p=glob(t,u,l),kk=at(p[0]+R,p[1]+R);Z[kk]='s';keinBaum[kk]=1;neu[kk]=1}});
  // Tür eines Stücks an der Straße: links der Straße zur Querrichtung +, rechts −
  var tuerAn=function(tt,um){var t=TO[tt.t],p=glob(t,um,tt.sei===0?-1:2),q=t.s<2?[1,0]:[0,1];return tt.sei===0?[p[0]+R,p[1]+R,q[0],q[1]]:[p[0]+R,p[1]+R,-q[0],-q[1]]};
  teile.forEach(function(tt){var t=TO[tt.t],r=schieb(tt.r),w=tt.was;
   if(w.art==='gewerbe'){bau(w.x.id,'bau',r,tuerAn(tt,tt.u0+(tt.du>>1)));gesetzt[w.x.id]=(gesetzt[w.x.id]|0)+1}
   else if(w.art==='grab'){bau('grab','grab',r,tuerAn(tt,tt.u0))}
   else if(w.art==='friedhof'){gesetzt.cemetery=(gesetzt.cemetery|0)+1;hin(r,'e');
    // Grabhäuschen im Raster, Wege dazwischen; Zugang von der Straße über die Reihe am Rand
    for(var y=r.j;y<r.j+r.h;y++)for(var x=r.i;x<r.i+r.w;x++){var dx=x-r.i,dy=y-r.j;if(dx%2===1&&dy%2===1&&dx<r.w-1&&dy<r.h-1)bau('grab','grab',{i:x,j:y,w:1,h:1},[x,y,0,-1])}}
   else if(w.art==='hof'){var h=w.h,hw=Math.min(2,tt.dl),hl=Math.min(2,tt.du),hu=tt.u0+((tt.du-hl)>>1),hr=schieb(rechteck(t,hu,hl,tt.sei===0?-hw:2,hw));
    var D0=D.G[h.id],herde=D0&&D0.gruppe==='vieh',hain=HAIN[h.id];hin(r,hain?'g':herde?'p':'f');
    if(hain)for(var y2=r.j;y2<r.j+r.h;y2++)for(var x2=r.i;x2<r.i+r.w;x2++)if(((x2+y2)&1)===0)dinge.push({id:hain,i:x2,j:y2,rolle:h.id});
    bau(h.id,'hof',hr,tuerAn(tt,hu+(hl>>1)));if(hain)dinge=dinge.filter(function(d){return !(d.rolle===h.id&&d.i>=hr.i&&d.i<hr.i+hr.w&&d.j>=hr.j&&d.j<hr.j+hr.h)});
    if(h.liste)gesetzt[h.id]=(gesetzt[h.id]|0)+1}});
  // Elendsbuden: jede Bude hält eine Tür frei, alles bleibt zusammenhängend
  if(buden){var reg=[],regId=new Int32Array(W*W).fill(-1),frei2=[],seeds=[];
   eG.forEach(function(p){var kk=at(p[0]+R,p[1]+R);if(!belegt[kk]){Z[kk]='e';keinBaum[kk]=1;neu[kk]=1;seeds.push(kk)}});
   eR.forEach(function(p){var kk=at(p[0]+R,p[1]+R);if(belegt[kk])return;Z[kk]='e';keinBaum[kk]=1;neu[kk]=1;regId[kk]=reg.length;reg.push(kk)});
   var tuerRes=new Uint8Array(W*W),bude=new Uint8Array(W*W),ord=reg.slice();for(var o1=ord.length-1;o1>0;o1--){var o2=Math.floor(ra()*(o1+1)),tt2=ord[o1];ord[o1]=ord[o2];ord[o2]=tt2}
   var istE=function(k){return Z[k]==='e'&&!belegt[k]&&!bude[k]},NB=[[1,0],[-1,0],[0,1],[0,-1]];
   var zusammen=function(){var seen=new Uint8Array(W*W),st=[],n=0,soll=0;for(var a=0;a<reg.length;a++)if(istE(reg[a]))soll++;
    seeds.forEach(function(k4){if(istE(k4)&&!seen[k4]){seen[k4]=1;st.push(k4)}});
    while(st.length){var q=st.pop();if(regId[q]>=0)n++;var qi=q%W,qj=(q/W)|0;for(var d=0;d<4;d++){var xi=qi+NB[d][0],yj=qj+NB[d][1];if(xi<0||yj<0||xi>=W||yj>=W)continue;var kk=at(xi,yj);if(!seen[kk]&&istE(kk)){seen[kk]=1;st.push(kk)}}}
    return n===soll};
   var gesetztB=0;for(var o3=0;o3<ord.length&&gesetztB<buden;o3++){var k5=ord[o3];if(tuerRes[k5]||bude[k5])continue;var i5=k5%W,j5=(k5/W)|0,dd=[];
    for(var d5=0;d5<4;d5++){var xi5=i5+NB[d5][0],yj5=j5+NB[d5][1];if(xi5<0||yj5<0||xi5>=W||yj5>=W)continue;var kn=at(xi5,yj5);if(istE(kn))dd.push([kn,NB[d5]])}
    if(!dd.length)continue;var wahl=dd[Math.floor(ra()*dd.length)],warRes=tuerRes[wahl[0]];bude[k5]=1;tuerRes[wahl[0]]=1;
    if(!zusammen()){bude[k5]=0;tuerRes[wahl[0]]=warRes;continue}
    frei2.push([i5,j5,wahl[1]]);gesetztB++}
   if(gesetztB<buden)return null;
   frei2.forEach(function(f){bude[at(f[0],f[1])]=0;bau('shack','shack',{i:f[0],j:f[1],w:1,h:1},[f[0],f[1],f[2][0],f[2][1]])});
   gesetzt.shack=(gesetzt.shack|0)+buden;
   reg.forEach(function(k6){if(belegt[k6]||tuerRes[k6])return;var i6=k6%W,j6=(k6/W)|0;if(rausch(i6,j6,seed+43)<.1)dinge.push({id:rausch(i6,j6,seed+44)<.15?'leiche':'lager-platz',i:i6,j:j6})})}
  // Bäume und Kram aus dem Plan innen weichen allem, was hier zwischen Mauer und Rand gebaut wurde
  dinge=dinge.filter(function(d,ix){return ix>=nE||!neu[at(d.i,d.j)]});
  // Fluss im Ring: Wasser, wo ein Weg kreuzt bleibt der Weg (Furt bzw. Brücke); Lage für die Spiegelung umrechnen
  if(FE){for(var jw=0;jw<W;jw++)for(var iw=0;iw<W;iw++){var xw=iw-R,yw=jw-R;if(xw>=0&&yw>=0&&xw<Wi&&yw<Wi&&!fd)continue;if(!wasser(xw,yw))continue;var kw=at(iw,jw);
    if(Z[kw]==='s')continue;Z[kw]='w';keinBaum[kw]=1}
   if(FE.x0!=null)FE.x0+=R;if(fd)FE.u1=fd.u1}
  // Küste (N6b2c4c2): Kai (q) vor der Stadt, daneben Strand (u), dahinter Meer (w); der Fluss mündet (unter dem Kai als Brücke, am Strand offen).
  // Dann Molen (q, 2 breit, die erste verlängert die Straße vom Hafentor) und Holzstege (y) mit einzelnen Anlegern; Weiler und Dörfer: Steg an jedem Weg zum Wasser.
  var KU=null;
  if(ks!=null){var rk=rng(hashT([seed,art,einw,'kueste'].join('|'))),zK=function(u,a){var p=ks<2?[a,ks===0?Wi+u:-1-u]:[ks===2?Wi+u:-1-u,a],x=p[0]+R,y=p[1]+R;return x>=0&&y>=0&&x<W&&y<W?at(x,y):-1};
   var kaiVon=-1,kaiBis=Wi,nKai=0;hafenTeile.forEach(function(h){kaiVon=Math.min(kaiVon,h.a0-1);kaiBis=Math.max(kaiBis,h.a1+1)});   // Kai reicht über alle Hafenbauten
   for(var jk=0;jk<W;jk++)for(var ik=0;ik<W;ik++){var xk=ik-R,yk=jk-R,uk=uS(xk,yk);if(uk<uK)continue;var kk=at(ik,jk),ak=lS(xk,yk);keinBaum[kk]=1;
    if(uk>=uK+2){Z[kk]='w';continue}
    var amKai=stadtK&&ak>=kaiVon&&ak<=kaiBis;if(Z[kk]==='w'&&!amKai)continue;Z[kk]=amKai?'q':'u';if(amKai)nKai++}
   KU={seite:SEITE[ks],kai:stadtK?uK:null,strand:!stadtK,molen:0,stege:0,anleger:0,hafentore:TO.filter(function(t){return t.s===ks}).length,hafen:hafenTeile.length,spiegel:spKa};
   var setz=function(u,a,c){var k=zK(u,a);if(k<0||Z[k]!=='w')return false;Z[k]=c;return true};
   var istFluss=function(a){var k=zK(uK-1,a);return k>=0&&Z[k]==='w'};
   var steg=function(a,L){var n=0;for(var u=uK+2;u<uK+2+L;u++)if(setz(u,a,'y'))n++;if(!n)return;KU.stege++;
    for(var na=1+(rk()<.5?1:0),t=0;t<na;t++){var o=1+Math.floor(rk()*(L-1)),sd2=rk()<.5?-1:1;if(setz(uK+2+o,a+sd2,'y'))KU.anleger++}};
   if(stadtK){var block={},sperr=function(a,r){for(var d=-r;d<=r;d++)block[a+d]=1};
    var mole=function(a,L){for(var u=uK+2;u<uK+2+L;u++){setz(u,a,'q');setz(u,a+1,'q')}KU.molen++;sperr(a,3);sperr(a+1,3)};
    if(tH&&MOLEN[g]>0)mole(tH.c,5+Math.floor(rk()*3));
    for(var mz=KU.molen,tr2=0;mz<MOLEN[g]&&tr2<40;tr2++){var am=1+Math.floor(rk()*(Wi-3));if(block[am]||block[am+1]||istFluss(am)||istFluss(am+1))continue;mole(am,4+Math.floor(rk()*3));mz++}
    for(var as=1+Math.floor(rk()*3);as<Wi-1;as+=4+Math.floor(rk()*4)){if(block[as]||istFluss(as)||istFluss(as-1)||istFluss(as+1))continue;steg(as,3+Math.floor(rk()*3));sperr(as,2)}}
   else TO.forEach(function(t){if(t.s!==ks)return;for(var u=uK;u<uK+2;u++)for(var l=0;l<2;l++){var k=zK(u,t.c+l);if(k>=0&&Z[k]==='u')Z[k]='s'}steg(t.c+(rk()<.5?0:1),3+Math.floor(rk()*2))})}
  hafenTeile.forEach(function(h){bau(h.id,'bau',schieb(h.r),[h.tuer[0]+R,h.tuer[1]+R,h.tuer[2],h.tuer[3]]);gesetzt[h.id]=(gesetzt[h.id]|0)+1});
  // Landschaft im Ring: Bäume des Bioms wie in den Höfen innen
  for(var q7=0;q7<W*W;q7++){if(keinBaum[q7]||belegt[q7]||Z[q7]!=='g')continue;var i7=q7%W,j7=(q7/W)|0;if(rausch(i7,j7,seed+41)<B.dichte*.6+.04)dinge.push({id:B.baeume[Math.floor(rausch(i7,j7,seed+42)*B.baeume.length)],i:i7,j:j7})}
  var TL=TO.filter(function(t){return t.s!==ks});if(!TL.length)TL=TO;   // Ankunft über Land (Küste: nicht die Straße zum Kai)
  var tp=TL.filter(function(t){return t.s===0})[0]||TL.filter(function(t){return t.s===2})[0]||TL[0],te=glob(tp,R-1,0);
  var MTa=null;if(E.mauertor){MTa=new Array(W*W).fill('0');for(var jt=0;jt<Wi;jt++)for(var it=0;it<Wi;it++)MTa[at(it+R,jt+R)]=E.mauertor.charAt(jt*Wi+it);MTa=MTa.join('')}
  return{W:W,Z:Z,bauten:bauten,dinge:dinge,mauertor:MTa,tor:{i:te[0]+R,j:te[1]+R},nb:E.nb,fluss:FE,kueste:KU,gesetzt:gesetzt,vielfalt:E.vielfalt,tore:TO,maske:MK,rand:R,
   aussen:{ring:R,innenW:Wi,stinktor:SEITE[TO[stinkK].s],graebertor:SEITE[TO[grabK].s],tore:TO.map(function(t){return SEITE[t.s]}),buden:buden,graeber:graeber,hoefe:hoefe.length,hoefeExtra:nx>0?hoefe.filter(function(h){return !h.liste}).length:0,elend:Ue}};}
 function anlegen(nb){
  var r=rng(hashT([seed,art,opt.biom,opt.stil||'',einw,nb].join('|'))),a,b,k;
  // N6b2c4a1 (Thomas 22.11.2026, ab Marktflecken): Blockmaß je Spalte und Zeile ±2 (mind. 3), Kreuzung außermittig, etwa jede 4. Gasse krumm oder schräg.
  // opt.vielfalt === false = festes Raster wie N6b2c2. Weiler und Dörfer folgen mit N6b2c4b.
  var viel=g>=MAUER_AB&&!elend&&opt.vielfalt!==false,rv=rng(hashT([seed,art,einw,nb,'vielfalt'].join('|')));
  var cw=[],rh=[],hx=nb>>1,hy=nb>>1;for(a=0;a<nb;a++){cw.push(Bm);rh.push(Bm)}
  // Fluss (N6b2c4c1): im Plan immer Nord–Süd zwischen Spalte fk−1 und fk (Ost–West durch Spiegeln am Schluss); Lücke = Ufergasse + RW Wasser + Ufergasse
  var mitFluss=viel&&!!FL,rf=rng(hashT([seed,art,einw,nb,'fluss'].join('|'))),RW=mitFluss?FLUSS_B[g]+(g>=5&&rf()<.5?1:0):0,RX=mitFluss?RW+1:0,fk=-1,BR={};
  if(viel){var lo=Math.max(3,Bm-2),hi=Bm+2,zuf=function(){return lo+Math.floor(rv()*(hi-lo+1))};
   for(a=0;a<nb;a++){cw[a]=zuf();rh[a]=zuf()}
   var su=function(L){var s=0;L.forEach(function(v){s+=v});return s},sc=su(cw)+RX,sr=su(rh);   // gleiche Summe (samt Fluss): der Plan bleibt quadratisch
   for(var sw=0;sc!==sr&&sw<4000;sw++){var kl=sc<sr?cw:rh,gr=sc<sr?rh:cw,q=Math.floor(rv()*nb);if(kl[q]<hi){kl[q]++;if(sc<sr)sc++;else sr++}else if(gr[q]>lo){gr[q]--;if(sc>sr)sc--;else sr--}}
   if(sc!==sr)return null;
   var wahl=[];for(a=Math.max(1,Math.round(nb*.3));a<=Math.min(nb-1,Math.round(nb*.7));a++)if(a*2!==nb)wahl.push(a);
   if(wahl.length){hx=wahl[Math.floor(rv()*wahl.length)];hy=wahl[Math.floor(rv()*wahl.length)]}
   if(mitFluss){var fw=[];for(a=Math.max(1,Math.round(nb*.2));a<=Math.min(nb-1,Math.round(nb*.8));a++)if(a!==hx)fw.push(a);if(!fw.length)return null;fk=fw[Math.floor(rf()*fw.length)];
    // Brücken an 1–2 geraden Gassen (dazu immer die Hauptstraße), möglichst weit von ihr weg
    var bw0=[];for(a=0;a<nb-1;a++)if(a+1!==hy)bw0.push(a);for(var nbr=1+(rf()<.5?1:0);nbr>0&&bw0.length;nbr--){var bi=Math.floor(rf()*bw0.length),bk0=bw0[bi];BR[bk0]=1;
     bw0=bw0.filter(function(x){return Math.abs(x-bk0)>1})}}}
  var X0=[],Y0=[],p=off;for(a=0;a<nb;a++){if(a===hx)p++;if(a===fk)p+=RX;X0.push(p);p+=cw[a]+1}p=off;for(b=0;b<nb;b++){if(b===hy)p++;Y0.push(p);p+=rh[b]+1}
  var W=p-1+off,cA=X0[hx]-2,cB=Y0[hy]-2;
  var Z=new Array(W*W).fill('g'),belegt=new Uint8Array(W*W),bauten=[],dinge=[],gesetzt={};
  var at=function(i,j){return j*W+i};
  // Umriss (N6b2c4a2): M = innen samt Mauer; D4 = Schritte bis nach draußen (Bildrand zählt als draußen). Mauer: D4 ≤ wall (für Schritte in 4 Richtungen dicht),
  // Ringgasse: Nachbarn der Mauer, auch schräg (so hängt sie auch an den Treppen zusammen); nutzbar: der Rest. Ohne Vielfalt: alles innen = Quadrat wie N6b2c2.
  var WW=W*W,M=new Uint8Array(WW),D4=new Int32Array(WW),wallC=new Uint8Array(WW),ring=new Uint8Array(WW),nutz=new Uint8Array(WW),weg=new Uint8Array(WW),offenM=new Uint8Array(WW),k1,i,j;
  for(j=0;j<W;j++)for(i=0;i<W;i++)M[at(i,j)]=viel?(UM.innen((i+.5)/W*2-1,(j+.5)/W*2-1)?1:0):1;
  var qu=[],qh=0;for(j=0;j<W;j++)for(i=0;i<W;i++){k1=at(i,j);if(!M[k1])continue;D4[k1]=1e9;
   if(i===0||j===0||i===W-1||j===W-1||!M[k1-1]||!M[k1+1]||!M[k1-W]||!M[k1+W]){D4[k1]=1;qu.push(k1)}}
  while(qh<qu.length){var kq=qu[qh++],iq=kq%W,jq=(kq/W)|0,nq=[iq>0?kq-1:-1,iq<W-1?kq+1:-1,jq>0?kq-W:-1,jq<W-1?kq+W:-1];
   for(var dq=0;dq<4;dq++){var kn=nq[dq];if(kn>=0&&M[kn]&&D4[kn]>D4[kq]+1){D4[kn]=D4[kq]+1;qu.push(kn)}}}
  for(k1=0;k1<WW;k1++)if(M[k1]&&D4[k1]<=wall)wallC[k1]=1;
  for(j=0;j<W;j++)for(i=0;i<W;i++){k1=at(i,j);if(!M[k1]||wallC[k1])continue;var nah=false;
   for(var dy=-1;dy<=1&&!nah;dy++)for(var dx=-1;dx<=1&&!nah;dx++){var xx=i+dx,yy=j+dy;if(xx>=0&&yy>=0&&xx<W&&yy<W&&wallC[at(xx,yy)])nah=true}
   if(nah)ring[k1]=1;else nutz[k1]=1}
  for(k1=0;k1<WW;k1++){if(!M[k1])Z[k1]='g';else if(wallC[k1]){Z[k1]='g';belegt[k1]=1}else Z[k1]=elend?'e':'s'}
  var frei0=function(k){return nutz[k]&&!weg[k]};
  // Tore (Thomas: nach Größe). Hauptstraßen-Arme 0 Süd, 1 Nord, 2 Ost, 3 West; 2 Tore = eine durchgehende Straße, 3 Tore = ein Arm endet innen an der Ringgasse.
  var rt=rng(hashT([seed,art,einw,'tore'].join('|'))),arme=[0,1,2,3],tore=[];
  if(viel){if(UM.tore<=2)arme=rt()<.5?[0,1]:[2,3];else if(UM.tore===3){var ohne=Math.floor(rt()*4);arme=arme.filter(function(x){return x!==ohne})}}
  // Küste (N6b2c4c2): auf der Meerseite immer ein Haupttor (Hafentor)
  if(KSP!=null&&arme.indexOf(KSP)<0){if(arme.length===2)arme=KSP<2?[0,1]:[2,3];else arme=[0,1,2,3].filter(function(x){return x!==QUER[KSP]})}
  // Straße 2 breit von der Hauptstraße bis zum Bildrand, Mauer dort offen; u0 = erstes Feld hinter der Mauer, gezählt vom Bildrand nach außen (≤ 0)
  function oeffne(s,c,haupt){var mx=-1,mn=W;
   for(var l=0;l<2;l++){var cc=c+l,a0=s===0?cB+2:s===1?cB-1:s===2?cA+2:cA-1,da=s===0||s===2?1:-1;
    for(var p0=a0;p0>=0&&p0<W;p0+=da){var k=s<2?at(cc,p0):at(p0,cc);weg[k]=1;if(wallC[k]){wallC[k]=0;offenM[k]=1;Z[k]='s';belegt[k]=1}else if(!M[k]){Z[k]='s';belegt[k]=1}
     if(M[k]){if(p0>mx)mx=p0;if(p0<mn)mn=p0}}}
   tore.push({s:s,c:c,u0:s===0||s===2?mx+1-W:-mn,haupt:haupt})}
  arme.forEach(function(s){oeffne(s,s<2?cA:cB,true)});
  // Fluss Teil 1: Wasser von Bildrand zu Bildrand, die Mauer bleibt dort offen (Flusstor)
  var fx0=mitFluss?X0[fk-1]+cw[fk-1]+1:-1,ftore=0,vorM=false;
  if(mitFluss)for(j=0;j<W;j++){var warM=false;for(i=fx0;i<fx0+RW;i++){k1=at(i,j);if(wallC[k1]){wallC[k1]=0;offenM[k1]=1;warM=true}Z[k1]='w';belegt[k1]=1;nutz[k1]=0;ring[k1]=0}
   if(warM&&!vorM)ftore++;vorM=warM}
  for(k1=0;k1<WW;k1++)if(wallC[k1])bauten.push({rolle:'mauer',i:k1%W,j:(k1/W)|0,w:1,h:1,klasse:basis.klasse==='clay-wood'&&g>=5?'brick':basis.klasse,dach:'flach',achse:'i',wand:basis.wand,dachR:STEIN});
  var cx=W/2,cy=W/2,bl=[];
  if(viel){var sx=0,sy=0,sn=0;for(k1=0;k1<WW;k1++)if(nutz[k1]){sx+=k1%W+.5;sy+=((k1/W)|0)+.5;sn++}if(sn){cx=sx/sn;cy=sy/sn}}
  var bw=function(a0,k){return X0[a0+k-1]+cw[a0+k-1]-X0[a0]},bh=function(b0,k){return Y0[b0+k-1]+rh[b0+k-1]-Y0[b0]};
  for(a=0;a<nb;a++)for(b=0;b<nb;b++)bl.push({a:a,b:b,x:X0[a],y:Y0[b],w:cw[a],h:rh[b],d:Math.hypot(X0[a]+cw[a]/2-cx,Y0[b]+rh[b]/2-cy)+r()*P1*.6,frei:null,rest:cw[a]*rh[b]});
  var offen=function(q){q.frei=new Uint8Array(q.w*q.h).fill(1);for(var y=0;y<q.h;y++)for(var x=0;x<q.w;x++)Z[at(q.x+x,q.y+y)]=elend?'e':'g'};
  // Monumente in Gruppen aus k × k Blöcken (nicht über die Hauptstraße), nahe der Mitte; mit ungleichen Blöcken notfalls eine Gruppe größer
  var gruppen=[],benutzt={},fest={},g1c=null;
  // Burgberg: erster Gipfelbau so weit wie möglich vom Mittelpunkt (am Stadtrand), nie zur See und mit Abstand zum Fluss; der zweite so nah wie möglich daneben
  var gipfelWert=function(it,x,y,w,h){var gx=x+w/2,gy=y+h/2,v=it.gipfel===2&&g1c?Math.hypot(gx-g1c[0],gy-g1c[1]):-Math.hypot(gx-cx,gy-cy),reich=(HT>=4?2:1)*P1+2;
   if(KSP!=null&&(KSP===0?gy-cy:KSP===1?cy-gy:KSP===2?gx-cx:cx-gx)>0)v+=4*W;
   if(mitFluss&&x<fx0+RW+reich&&x+w+reich>fx0)v+=2*W;return v};
  var passt=function(it,gw,gh){return it.w<=gw&&it.h<=gh||it.h<=gw&&it.w<=gh};
  for(var m=0;m<mono.length;m++){var it=mono[m],k0=grpK(it),best=null,bd=1e9,bk=0;
   for(var q=0;q<bl.length;q++){var s=bl[q],kk=0;
    for(k=k0;k<=k0+(viel?1:0)&&!kk;k++){if(s.a+k>nb||s.b+k>nb)continue;if((s.a<hx)!==(s.a+k-1<hx)||(s.b<hy)!==(s.b+k-1<hy)||(s.a<fk)!==(s.a+k-1<fk))continue;if(passt(it,bw(s.a,k),bh(s.b,k)))kk=k}
    if(!kk)continue;var frei=true;for(var u=0;u<kk&&frei;u++)for(var v=0;v<kk&&frei;v++)if(benutzt[(s.a+u)*nb+s.b+v])frei=false;
    if(frei&&viel){var gw1=bw(s.a,kk),gh1=bh(s.b,kk);for(var y9=0;y9<gh1&&frei;y9++)for(var x9=0;x9<gw1&&frei;x9++)if(!frei0(at(s.x+x9,s.y+y9)))frei=false}if(!frei)continue;
    var gx0=s.x+bw(s.a,kk)/2,gy0=s.y+bh(s.b,kk)/2,dd=(it.gipfel?gipfelWert(it,s.x,s.y,bw(s.a,kk),bh(s.b,kk)):Math.hypot(gx0-cx,gy0-cy))+r()*P1;if(dd<bd){bd=dd;best=s;bk=kk}}
   if(!best)return null;for(var u2=0;u2<bk;u2++)for(var v2=0;v2<bk;v2++)benutzt[(best.a+u2)*nb+best.b+v2]=1;
   if(it.gipfel===1)g1c=[best.x+bw(best.a,bk)/2,best.y+bh(best.b,bk)/2];
   for(var f2=0;f2<bk;f2++){fest['c'+(best.a-1)+'_'+(best.b+f2)]=1;fest['c'+(best.a+bk-1)+'_'+(best.b+f2)]=1;fest['r'+(best.b-1)+'_'+(best.a+f2)]=1;fest['r'+(best.b+bk-1)+'_'+(best.a+f2)]=1}
   var gw2=bw(best.a,bk),gh2=bh(best.b,bk),grp={x:best.x,y:best.y,w:gw2,h:gh2,d:bd,rest:0,mono:true,it:it,a:best.a,b:best.b,k:bk};gruppen.push(grp);if(!viel)platzieren(grp)}
  // Burgberg (N6b2c4c3): die Blöcke rings um die Gipfelgruppen (auch schräg) bleiben nackter Fels mit Terrassen (Zelle x), dort steht kein Haus
  var felsB=[];if(HU)bl.forEach(function(s){if(benutzt[s.a*nb+s.b]||s.weg)return;
   if(gruppen.some(function(gr){return gr.it.gipfel&&s.a>=gr.a-1&&s.a<=gr.a+gr.k&&s.b>=gr.b-1&&s.b<=gr.b+gr.k})){benutzt[s.a*nb+s.b]=1;felsB.push(s)}});
  // Krumme und schräge Gassen: Verschiebung je Gasse und Block (Zeilengassen zuerst). Höchstens ±1 je Schritt, Blöcke bleiben mind. 3 breit,
  // an Monumenten gerade, an Kreuzungen nie gleichzeitig mit der Quergasse versetzt (sonst nur noch eine Ecke als Durchgang).
  var SC={},TR={};
  var sCol=function(k2,b2){return k2<0||k2>=nb-1||k2+1===hx||k2+1===fk?0:(SC[k2]?SC[k2][b2]:0)},tRow=function(k2,a2){return k2<0||k2>=nb-1||k2+1===hy?0:(TR[k2]?TR[k2][a2]:0)};
  var profil=function(L,lang,cap,frei2,fix){if(cap<1||rv()>=.32)return null;   // .32: dünne Blöcke bleiben gerade, so wird es insgesamt etwa jede 4. Gasse
   for(var vers=0;vers<6;vers++){var dir=rv()<.5?-1:1,schraeg=rv()<.5,ziel=1+Math.floor(rv()*Math.max(1,lang-1)),v=0,P=[],t2,bad=false,nz=false;
    for(t2=0;t2<lang&&!bad;t2++){if(t2>0&&frei2(t2-1)){if(schraeg?t2>=ziel&&Math.abs(v)<cap:t2===ziel)v+=dir}P.push(v);if(v)nz=true;if(fix(t2)&&v!==0)bad=true}
    if(!bad&&nz)return P}return null};
  if(viel){
   for(k=0;k<nb-1;k++){if(k+1===hy||BR[k])continue;var capR=Math.min(2,Math.floor((Math.min(rh[k],rh[k+1])-3)/2));
    TR[k]=profil(TR,nb,capR,function(){return true},function(a3){return fest['r'+k+'_'+a3]})}
   for(k=0;k<nb-1;k++){if(k+1===hx||k+1===fk)continue;var capC=Math.min(2,Math.floor((Math.min(cw[k],cw[k+1])-3)/2));
    SC[k]=profil(SC,nb,capC,function(b3){return tRow(b3,k)===tRow(b3,k+1)},function(b3){return fest['c'+k+'_'+b3]})}}
  bl.forEach(function(s){s.x=X0[s.a]+sCol(s.a-1,s.b);s.w=X0[s.a]+cw[s.a]+sCol(s.a,s.b)-s.x;s.y=Y0[s.b]+tRow(s.b-1,s.a);s.h=Y0[s.b]+rh[s.b]+tRow(s.b,s.a)-s.y;s.rest=s.w*s.h});
  if(viel){
   // Zusätzliche Tore ab 5 (Thomas: eigene Straße 2 breit vom Tor bis zur nächsten Hauptstraße): eine gerade Gasse auf einem Arm wird breiter,
   // die Blöcke an einer Seite werden dafür 1 Feld schmaler (nur Blöcke ohne Monument, danach mindestens 3 breit). Je Seite höchstens ein Zusatztor.
   var extra=UM.tore-arme.length,seiten=[0,1,2,3],z1,z2,tz;for(z1=3;z1>0;z1--){z2=Math.floor(rt()*(z1+1));tz=seiten[z1];seiten[z1]=seiten[z2];seiten[z2]=tz}
   for(var si=0;si<4&&extra>0;si++){var s3=seiten[si],sp=s3<2,hm=sp?hx:hy,Ks=[];for(k=0;k<nb-1;k++)if(k!==hm-1&&!(sp&&k===fk-1)&&!(sp?SC[k]:TR[k]))Ks.push(k);
    for(z1=Ks.length-1;z1>0;z1--){z2=Math.floor(rt()*(z1+1));tz=Ks[z1];Ks[z1]=Ks[z2];Ks[z2]=tz}
    var hq=sp?hy:hx,R2=[];for(var bb=0;bb<nb;bb++)if(s3===0||s3===2?bb>=hq:bb<hq)R2.push(bb);
    var gefunden=false;
    for(var ki=0;ki<Ks.length&&!gefunden;ki++)for(var dir=0;dir<2&&!gefunden;dir++){var kg=Ks[ki],aa=dir===0?kg+1:kg,ok2=true,ri,ix;
     for(ri=0;ri<R2.length&&ok2;ri++){ix=sp?aa*nb+R2[ri]:R2[ri]*nb+aa;if(benutzt[ix]||(sp?bl[ix].w:bl[ix].h)<4)ok2=false}
     var gl=(sp?X0[kg+1]:Y0[kg+1])-1,c5=dir===0?gl:gl-1;
     // Die Straße muss in beiden Spalten durch die Mauer gehen (sonst läge das Tor neben einem Oval ins Leere)
     // und zwar einmal: erst innen, dann Mauer, dann draußen bis zum Bildrand (nicht außen entlang in eine Beule)
     for(var l5=0;l5<2&&ok2;l5++){var zst=0,a5=s3===0?cB+2:s3===1?cB-1:s3===2?cA+2:cA-1,d5=s3===0||s3===2?1:-1;
      var nW=0;for(var p5=a5;p5>=0&&p5<W&&ok2;p5+=d5){var k5=sp?at(c5+l5,p5):at(p5,c5+l5);if(wallC[k5]){if(zst===2||p5===a5||++nW>4)ok2=false;else zst=1}else if(!M[k5]){if(zst===0)ok2=false;else zst=2}else if(zst)ok2=false}
      if(!zst)ok2=false}   // quer durch die Mauer (höchstens 4 Mauerfelder), nicht längs in ihr
     if(!ok2)continue;
     for(ri=0;ri<R2.length;ri++){var bx=bl[sp?aa*nb+R2[ri]:R2[ri]*nb+aa];if(sp){if(dir===0)bx.x++;bx.w--}else{if(dir===0)bx.y++;bx.h--}bx.rest=bx.w*bx.h}
     oeffne(s3,c5,false);gefunden=true;extra--}}
   bauten=bauten.filter(function(b){return !(b.rolle==='mauer'&&offenM[at(b.i,b.j)])});
   // Blöcke am Umriss stutzen: was nicht ganz im nutzbaren Inneren liegt, wird an der schlechtesten Seite kleiner; unter 3 Feldern fällt der Block weg (Garten).
   // Abgeschnittene Streifen werden kleine Plätze an der Mauer (o), damit jede Tür am Rand einen Weg hat.
   bl.forEach(function(s){if(benutzt[s.a*nb+s.b])return;var x0=s.x,y0=s.y,w0=s.w,h0=s.h,xx,yy,kk2;
    for(var it=0;it<80;it++){var sl=0,sr=0,st=0,sb=0,schlecht=0;
     for(yy=0;yy<s.h;yy++)for(xx=0;xx<s.w;xx++)if(!frei0(at(s.x+xx,s.y+yy))){schlecht++;if(xx===0)sl++;if(xx===s.w-1)sr++;if(yy===0)st++;if(yy===s.h-1)sb++}
     if(!schlecht)break;var mm=Math.max(sl,sr,st,sb);if(!mm){s.weg=true;break}
     if(mm===sl){s.x++;s.w--}else if(mm===sr)s.w--;else if(mm===st){s.y++;s.h--}else s.h--;
     if(s.w<3||s.h<3){s.weg=true;break}}
    for(yy=0;yy<h0;yy++)for(xx=0;xx<w0;xx++){kk2=at(x0+xx,y0+yy);if(!frei0(kk2))continue;
     if(s.weg)Z[kk2]='g';else if(x0+xx<s.x||x0+xx>=s.x+s.w||y0+yy<s.y||y0+yy>=s.y+s.h)Z[kk2]='o'}
    s.rest=s.weg?0:s.w*s.h})}
  // Fluss Teil 2: Brücken an der Hauptstraße, an Straßen zu Zusatztoren und an den gewählten Gassen, nur wo beide Ufer Gasse sind
  var fbr=0,fbrZ=[];
  if(mitFluss){var brY={};brY[cB]=brY[cB+1]=1;Object.keys(BR).forEach(function(x){brY[Y0[+x+1]-1]=1});
   var ufer=function(i2,j2){var k2=at(i2,j2);return M[k2]&&!wallC[k2]&&(Z[k2]==='s'||Z[k2]==='o')};
   for(j=0;j<W;j++){var wg=false;for(i=fx0;i<fx0+RW;i++)if(weg[at(i,j)])wg=true;
    if((brY[j]||wg)&&ufer(fx0-1,j)&&ufer(fx0+RW,j)){for(i=fx0;i<fx0+RW;i++){k1=at(i,j);Z[k1]='s';belegt[k1]=0}fbrZ.push(j)}}
   fbrZ.forEach(function(y,ix){if(ix===0||fbrZ[ix-1]!==y-1)fbr++})}
  if(viel)gruppen.forEach(platzieren);
  function platzieren(grp){offen(grp);var it=grp.it,gw2=grp.w,gh2=grp.h,rot=r()<.5;if(!(rot?it.h<=gw2&&it.w<=gh2:it.w<=gw2&&it.h<=gh2))rot=!rot;
   var mw=rot?it.h:it.w,mh=rot?it.w:it.h,px=grp.x+((gw2-mw)>>1),py=grp.y+((gh2-mh)>>1);
   for(var y1=0;y1<gh2;y1++)for(var x1=0;x1<gw2;x1++){var X=grp.x+x1,Y=grp.y+y1,inM=X>=px&&X<px+mw&&Y>=py&&Y<py+mh,
     mitte=(x1===(gw2>>1)||x1===((gw2-1)>>1)||y1===(gh2>>1)||y1===((gh2-1)>>1));
    if(inM||mitte||it.gipfel){grp.frei[y1*gw2+x1]=0;if(!inM)Z[at(X,Y)]='o'}else{Z[at(X,Y)]='o';grp.rest++}}   // Gipfel: ganzer Platz frei
   setzen(it,px,py,mw,mh,null);if(it.gipfel){var bg=bauten[bauten.length-1];bg.gipfel=it.gipfel;bg.kern=[grp.x-bg.i,grp.y-bg.j,gw2,gh2]}}
  var bloecke=bl.filter(function(s){return !benutzt[s.a*nb+s.b]&&!s.weg});bloecke.forEach(offen);
  // Burgberg: Felsblöcke, ab und zu ein Baum auf den Terrassen
  felsB.forEach(function(q){for(var y=0;y<q.h;y++)for(var x=0;x<q.w;x++){var kf=at(q.x+x,q.y+y);if(frei0(kf)){Z[kf]='x';belegt[kf]=1;var uf=rausch(q.x+x,q.y+y,seed+95);if(uf<.07)dinge.push({id:B.baeume[Math.floor(uf/.07*B.baeume.length)%B.baeume.length],i:q.x+x,j:q.y+y})}}});bloecke=bloecke.concat(gruppen);bloecke.sort(function(p,q){return p.d-q.d});
  // Übrige Gebäude: erstes freies Randstück im innersten Block (Zonen); Tür zur Gasse an der Seite, die am Blockrand liegt
  // Gleichmäßig füllen: zuerst nur bis zum Anteil je Block (alle Blöcke behalten einen Hof), dann frei; Reihenfolge der Blöcke nach Abstand = Zonen
  var vorn=0,summe=0,platzAll=0;rest.forEach(function(it){summe+=it.w*it.h});bloecke.forEach(function(s){s.voll=0;platzAll+=s.rest});var anteil=Math.min(1,summe/Math.max(1,platzAll)*1.1+.05);
  for(var n=0;n<rest.length;n++){var it2=rest[n],ok=false,dreh=r()<.5;
   while(vorn<bloecke.length&&bloecke[vorn].rest<=0)vorn++;
   var LB=mitFluss&&UFER[it2.id]?bloecke.filter(function(s){return !s.mono&&(s.a===fk-1||s.a===fk)&&s.rest>0}).concat(bloecke.slice(vorn)):null;   // ans Ufer, wenn Platz ist
   for(var gang=0;gang<2&&!ok;gang++)for(var q2=LB?0:vorn;q2<(LB||bloecke).length&&!ok;q2++){var s2=(LB||bloecke)[q2],fa=it2.w*it2.h;if(s2.rest<fa)continue;
    if(gang===0&&s2.voll>0&&s2.voll+fa>anteil*(s2.voll+s2.rest))continue;
    for(var t=0;t<2&&!ok;t++){var w=(t===0)!==dreh?it2.w:it2.h,h=(t===0)!==dreh?it2.h:it2.w;if(w>s2.w||h>s2.h)continue;var p=randStelle(s2,w,h);
     if(p){for(var y3=0;y3<h;y3++)for(var x3=0;x3<w;x3++){s2.frei[(p.y+y3)*s2.w+p.x+x3]=0;if(Z[at(s2.x+p.x+x3,s2.y+p.y+y3)]==='o')s2.rest--}if(!s2.mono)s2.rest-=w*h;s2.voll+=w*h;
      setzen(it2,s2.x+p.x,s2.y+p.y,w,h,p.tuer);ok=true}}}
   if(!ok)return null}
  // Plätze ohne Zugang werden Hof; Höfe bekommen Bäume und Kram
  var erreicht=new Uint8Array(W*W),st=[];for(var q3=0;q3<W*W;q3++)if(!belegt[q3]&&/[se]/.test(Z[q3])){erreicht[q3]=1;st.push(q3)}
  while(st.length){var q4=st.pop(),i4=q4%W,j4=(q4/W)|0;[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(dv){var x=i4+dv[0],y=j4+dv[1];if(x<0||y<0||x>=W||y>=W)return;var k2=at(x,y);
    if(!erreicht[k2]&&!belegt[k2]&&/[seom]/.test(Z[k2])){erreicht[k2]=1;st.push(k2)}})}
  for(var q5=0;q5<W*W;q5++){if(belegt[q5])continue;var z5=Z[q5],i5=q5%W,j5=(q5/W)|0;if(z5==='o'&&!erreicht[q5]){Z[q5]='g';z5='g'}
   if(z5==='g'&&!elend){var u5=rausch(i5,j5,seed+7);if(u5<B.dichte*.6+.04)dinge.push({id:B.baeume[Math.floor(rausch(i5,j5,seed+8)*B.baeume.length)],i:i5,j:j5});else if(u5>.97)dinge.push({id:'lager-platz',i:i5,j:j5})}
   else if(z5==='e'&&rausch(i5,j5,seed+9)<.15&&!/[s]/.test(Z[q5]))dinge.push({id:rausch(i5,j5,seed+10)<.15?'leiche':'lager-platz',i:i5,j:j5})}
  // Mit Umriss: jeder Weg muss von der Kreuzung aus erreichbar sein, sonst mit mehr Blöcken neu versuchen
  if(viel){var er2=new Uint8Array(WW),st2=[at(cA,cB)];er2[st2[0]]=1;
   while(st2.length){var q6=st2.pop(),i6=q6%W,j6=(q6/W)|0,nn=[i6>0?q6-1:-1,i6<W-1?q6+1:-1,j6>0?q6-W:-1,j6<W-1?q6+W:-1];
    for(var d6=0;d6<4;d6++){var k6=nn[d6];if(k6>=0&&!er2[k6]&&/[seom]/.test(Z[k6])){er2[k6]=1;st2.push(k6)}}}
   for(k1=0;k1<WW;k1++)if(!er2[k1]&&/[seom]/.test(Z[k1]))return null}
  var tp=tore.filter(function(t){return t.s===0})[0]||tore.filter(function(t){return t.s===2})[0]||tore[0];
  return{W:W,Z:Z,bauten:bauten,dinge:dinge,tor:tp.s===0?{i:tp.c,j:W-1}:tp.s===2?{i:W-1,j:tp.c}:tp.s===1?{i:tp.c,j:0}:{i:0,j:tp.c},achse:{i:cA,j:cB},nb:nb,gesetzt:gesetzt,
   mauertor:wall?Array.prototype.join.call(offenM,''):null,   // N6b2d: Felder, an denen die Mauer für Straße oder Fluss offen ist (Tore)
   tore:tore,maske:M,fluss:mitFluss?{achse:'ns',x0:fx0,breite:RW,bruecken:fbr,tore:ftore}:null,
   vielfalt:viel?{spalten:cw,zeilen:rh,kreuzung:[hx,hy],gassen:2*(nb-2),krumm:Object.keys(SC).filter(function(x){return SC[x]}).length+Object.keys(TR).filter(function(x){return TR[x]}).length}:null};
  // Randstück im Block: x==0, y==0 oder an der rechten/unteren Kante, alle Zellen frei; Tür mittig an der Blockkante (Reihenfolge aus dem Seed)
  function randStelle(s,w,h){var L=[],x,y;for(x=0;x+w<=s.w;x++){L.push([x,0,0,-1]);L.push([x,s.h-h,0,1])}for(y=1;y+h<s.h;y++){L.push([0,y,-1,0]);L.push([s.w-w,y,1,0])}
   for(var k=0;k<L.length;k++){var c=L[k],fr=true;for(var yy=0;yy<h&&fr;yy++)for(var xx=0;xx<w&&fr;xx++)if(!s.frei[(c[1]+yy)*s.w+c[0]+xx])fr=false;
    if(fr){var gi=s.x+c[0],gj=s.y+c[1],tu=c[3]>0?[gi+(w>>1),gj+h-1,0,1]:c[3]<0?[gi+(w>>1),gj,0,-1]:c[2]>0?[gi+w-1,gj+(h>>1),1,0]:[gi,gj+(h>>1),-1,0];return{x:c[0],y:c[1],tuer:tu}}}return null}
  function setzen(it,i,j,w,h,tuer){var id=it.id;gesetzt[id]=(gesetzt[id]||0)+1;
   for(var y=j;y<j+h;y++)for(var x=i;x<i+w;x++){belegt[at(x,y)]=1;Z[at(x,y)]=elend?'e':'g'}
   if(PLATZ[id]){for(var y6=j;y6<j+h;y6++)for(var x6=i;x6<i+w;x6++){belegt[at(x6,y6)]=0;Z[at(x6,y6)]=PLATZ[id];
     if(id==='market'?rausch(x6,y6,seed)<.4&&x6>i&&y6>j&&x6<i+w-1&&y6<j+h-1:(x6===i+(w>>1)&&y6===j+(h>>1)))dinge.push({id:'markt-stand',i:x6,j:y6,rolle:id})}return}
   if(DING[id]){belegt[at(i,j)]=0;Z[at(i,j)]='o';dinge.push({id:DING[id],i:i,j:j,rolle:id});return}
   if(!tuer){var T=[[i+(w>>1),j+h-1,0,1,i+(w>>1),j+h],[i+w-1,j+(h>>1),1,0,i+w,j+(h>>1)],[i,j+(h>>1),-1,0,i-1,j+(h>>1)],[i+(w>>1),j,0,-1,i+(w>>1),j-1]];
    for(var k=0;k<4&&!tuer;k++){var o=T[k][5]*W+T[k][4];if(Z[o]==='o'&&!belegt[o])tuer=T[k].slice(0,4)}if(!tuer)tuer=T[0].slice(0,4)}
   var sh=id==='shack',u=rausch(i,j,seed+31),kl=sh?'clay-wood':MARMOR[id]&&g>=MAUER_AB?'marble':EDEL[id]?STUFE[basis.klasse]:basis.klasse;
   var satz=!sh&&!ST&&B.satz&&kl===basis.klasse?B.satz:null,schmal=Math.min(w,h)<2;
   bauten.push({rolle:sh?'shack':(WOHN[id]?'house':'bau'),id:id,i:i,j:j,w:w,h:h,g:stock(id,g,u,w,h),klasse:kl,dach:sh||schmal?'flach':basis.dach,
    achse:w>h?'i':h>w?'j':(u<.5?'i':'j'),wand:kl===basis.klasse&&!sh&&!satz?basis.wand:null,dachR:sh?HOLZ:kl===basis.klasse&&!satz?basis.dachR:null,tuer:tuer,satz:satz})}
 }
 // N6b2c4b (Thomas 22.11.2026): Weiler und Dörfer gewachsen statt im Raster. Weiler = Haufen um einen Brunnenplatz mit Trampelpfaden zu jeder Tür, ein Weg führt durch;
 // Dörfer aus dem Seed: Straßendorf 40 % (Häuser beidseits einer leicht krummen Straße, bei Bedarf Seitengassen), Haufendorf um einen Platz 40 % (Markt in der Mitte,
 // 3–4 Wege hinaus, Pfade zu jeder Tür), Angerdorf 20 % (die Straße gabelt sich um einen Anger mit Brunnen, Markt auf dem Anger). Ausgänge: Weiler 2, Straßendorf 2,
 // Angerdorf 2–3, Haufendorf 3–4. Hinter jedem Wohnhaus ein Garten (Feldboden, 1–2 tief), Häuser locker mit mindestens 1 Feld Abstand, teils 1 Feld zurückgesetzt.
 // Gebaut wird stehend (Hauptweg Nord–Süd) und bei Bedarf gekippt. opt.vielfalt === false = Raster wie N6b2c2.
 function dorf(versuch){
  var rf=rng(hashT([seed,art,opt.biom,einw,'dorfform'].join('|'))),xf=rf(),form=g<=2?'weiler':xf<.4?'strasse':xf<.8?'haufen':'anger',kipp=rf()<.5;
  var r=rng(hashT([seed,art,opt.biom,opt.stil||'',einw,'dorf',versuch].join('|')));
  var spez={market:null,well:null},bauL=[],fl=0;
  items.forEach(function(it){fl+=it.w*it.h;if((it.id==='market'||it.id==='well')&&!spez[it.id])spez[it.id]=it;else bauL.push(it)});
  var klasse=function(it){return it.id==='shack'?3:WOHN[it.id]?2:1};
  bauL.sort(function(a,b){return klasse(a)-klasse(b)||rang(a)-rang(b)||b.w*b.h-a.w*a.h||(a.id<b.id?-1:a.id>b.id?1:0)});
  var W=Math.max(form==='anger'?26:14,Math.ceil(Math.sqrt(fl*(form==='weiler'?7:5.5))))+2*versuch,WW=W*W,at=function(i,j){return j*W+i};
  var Z=new Array(WW).fill('g'),belegt=new Uint8Array(WW),res=new Uint8Array(WW),garten=new Uint8Array(WW),anger=new Uint8Array(WW),vor=new Uint8Array(WW),bauten=[],dinge=[],gesetzt={},tore=[],gaerten=0,gassen=0;
  var cx=(W>>1)+Math.floor(r()*3)-1,cy=(W>>1)+Math.floor(r()*3)-1,pcx=cx+.5,pcy=cy+.5;
  var istWeg=function(k){return Z[k]==='s'||Z[k]==='o'};
  var frei=function(i,j){if(i<0||j<0||i>=W||j>=W)return false;var k=at(i,j);return Z[k]==='g'&&!belegt[k]&&!res[k]&&!garten[k]};
  var weg=function(i,j){if(i>=0&&j>=0&&i<W&&j<W&&Z[at(i,j)]==='g'&&!belegt[at(i,j)]){Z[at(i,j)]='s';res[at(i,j)]=0}};
  // Weg 2 breit, leicht krumm: Spalte je Zeile (stehend), an den Enden 3 Felder gerade
  var krumm=function(t0,t1,x0,p){var L=[],v=x0,n=Math.abs(t1-t0)+1;for(var t=0;t<n;t++){if(t>=3&&t<n-3&&r()<p){var nv=v+(r()<.5?-1:1);if(nv>=2&&nv<=W-4)v=nv}L.push(v)}return L};
  var senkrecht=function(t0,t1,x0,p){var L=krumm(t0,t1,x0,p),d=t1>=t0?1:-1;for(var k=0;k<L.length;k++){weg(L[k],t0+k*d);weg(L[k]+1,t0+k*d)}return L};
  var waagrecht=function(t0,t1,y0,p){var L=krumm(t0,t1,y0,p),d=t1>=t0?1:-1;for(var k=0;k<L.length;k++){weg(t0+k*d,L[k]);weg(t0+k*d,L[k]+1)}return L};
  var setzeTor=function(s,c){tore.push({s:s,c:c,u0:0,haupt:true})};
  var platz=function(it,i,j,w,h){gesetzt[it.id]=(gesetzt[it.id]||0)+1;for(var y=j;y<j+h;y++)for(var x=i;x<i+w;x++){var k=at(x,y);Z[k]=PLATZ[it.id]||'o';res[k]=0;anger[k]=0;
    if(it.id==='market'&&rausch(x,y,seed)<.4&&x>i&&y>j&&x<i+w-1&&y<j+h-1)dinge.push({id:'markt-stand',i:x,j:y,rolle:it.id})}};
  var brunnen=function(i,j){var it=spez.well;gesetzt.well=(gesetzt.well||0)+1;Z[at(i,j)]='o';res[at(i,j)]=0;anger[at(i,j)]=0;dinge.push({id:DING.well,i:i,j:j,rolle:'well'})};
  // Bau eintragen (wie setzen() im Raster)
  var bau=function(it,i,j,w,h,tuer){var id=it.id;gesetzt[id]=(gesetzt[id]||0)+1;for(var y=j;y<j+h;y++)for(var x=i;x<i+w;x++){belegt[at(x,y)]=1;Z[at(x,y)]='g'}
   var sh=id==='shack',u=rausch(i,j,seed+31),kl=sh?'clay-wood':MARMOR[id]&&g>=MAUER_AB?'marble':EDEL[id]?STUFE[basis.klasse]:basis.klasse;
   var satz=!sh&&!ST&&B.satz&&kl===basis.klasse?B.satz:null,schmal=Math.min(w,h)<2;
   bauten.push({rolle:sh?'shack':(WOHN[id]?'house':'bau'),id:id,i:i,j:j,w:w,h:h,g:stock(id,g,u,w,h),klasse:kl,dach:sh||schmal?'flach':basis.dach,
    achse:w>h?'i':h>w?'j':(u<.5?'i':'j'),wand:kl===basis.klasse&&!sh&&!satz?basis.wand:null,dachR:sh?HOLZ:kl===basis.klasse&&!satz?basis.dachR:null,tuer:tuer,satz:satz})};
  // Rechteck frei und mit 1 Feld Abstand zu anderen Bauten (Rand 1 Feld frei)
  var rechteckFrei=function(i,j,w,h){if(i<1||j<1||i+w>W-1||j+h>W-1)return false;var x,y;for(y=j;y<j+h;y++)for(x=i;x<i+w;x++)if(!frei(x,y))return false;
   for(y=j-1;y<=j+h;y++)for(x=i-1;x<=i+w;x++)if(belegt[at(x,y)])return false;return true};
  // Garten hinter dem Haus (gegenüber der Tür), 1–2 tief, nur auf freiem Gras
  var garteln=function(it,i,j,w,h,di,dj){if(!WOHN[it.id])return;var tief=r()<.7?2:1,n=0,a,b;
   for(var t=1;t<=tief;t++){var ok=true,L=[];
    for(a=0;a<(dj?w:h);a++){var x=dj?i+a:(di>0?i-t:i+w-1+t),y=dj?(dj>0?j-t:j+h-1+t):j+a;if(!frei(x,y)||x<1||y<1||x>W-2||y>W-2){ok=false;break}L.push(at(x,y))}
    if(!ok)break;for(b=0;b<L.length;b++){Z[L[b]]='k';garten[L[b]]=1}n++}if(n)gaerten++};
  // Abstandsfeld von allen Wegen über freies Gras (Anger nur für Pfade zum Brunnen)
  var feld=function(mitAnger){var D=new Int32Array(WW).fill(-1),q=[],h=0,k;for(k=0;k<WW;k++)if(istWeg(k)&&!belegt[k]){D[k]=0;q.push(k)}
   while(h<q.length){var c=q[h++],ci=c%W,cj=(c/W)|0,N=[ci>0?c-1:-1,ci<W-1?c+1:-1,cj>0?c-W:-1,cj<W-1?c+W:-1];
    for(var d=0;d<4;d++){var n=N[d];if(n<0||D[n]>=0||Z[n]!=='g'||belegt[n]||garten[n]||(res[n]&&!(mitAnger&&anger[n])))continue;D[n]=D[c]+1;q.push(n)}}return D};
  var pfad=function(k,D){var n=0;while(D[k]>0){Z[k]='s';res[k]=0;n++;var ci=k%W,cj=(k/W)|0,N=[ci>0?k-1:-1,ci<W-1?k+1:-1,cj>0?k-W:-1,cj<W-1?k+W:-1],best=-1;
    for(var d=0;d<4;d++)if(N[d]>=0&&D[N[d]]===D[k]-1){best=N[d];break}if(best<0)return false;k=best}return true};
  // Seiten: Tür unten, rechts, links, oben (wie setzen()); Vorfeld vor der Tür
  var seiten=function(i,j,w,h){return[[i+(w>>1),j+h-1,0,1],[i+w-1,j+(h>>1),1,0],[i,j+(h>>1),-1,0],[i+(w>>1),j,0,-1]]};
  // Haufen: freie Stelle möglichst nah an der Mitte, Tür zur Seite mit dem kürzesten Pfad, Pfad bis zum nächsten Weg
  var haufen=function(it){var D=feld(false),C=[],rot,w,h,i,j,best;
   for(rot=0;rot<2;rot++){if(rot&&it.w===it.h)break;w=rot?it.h:it.w;h=rot?it.w:it.h;
    for(j=1;j+h<=W-1;j++)for(i=1;i+w<=W-1;i++){if(!rechteckFrei(i,j,w,h))continue;var S=seiten(i,j,w,h),bs=null,bd=1e9;
     for(var s=0;s<4;s++){var fx=S[s][0]+S[s][2],fy=S[s][1]+S[s][3];if(fx<0||fy<0||fx>=W||fy>=W)continue;var dv=D[at(fx,fy)];if(dv>=0&&dv<bd){bd=dv;bs=S[s]}}
     if(!bs)continue;C.push({i:i,j:j,w:w,h:h,t:bs,s:Math.hypot(i+w/2-pcx,j+h/2-pcy)+r()*3+bd*.6})}}
   C.sort(function(a,b){return a.s-b.s});
   for(var q=0;q<C.length&&q<40;q++){var c=C[q];if(!rechteckFrei(c.i,c.j,c.w,c.h))continue;
    for(j=c.j;j<c.j+c.h;j++)for(i=c.i;i<c.i+c.w;i++)belegt[at(i,j)]=1;var D2=feld(false),fk=at(c.t[0]+c.t[2],c.t[1]+c.t[3]);
    for(j=c.j;j<c.j+c.h;j++)for(i=c.i;i<c.i+c.w;i++)belegt[at(i,j)]=0;if(D2[fk]<0)continue;
    garteln(it,c.i,c.j,c.w,c.h,c.t[2],c.t[3]);bau(it,c.i,c.j,c.w,c.h,c.t.slice());
    var D3=feld(false);if(D3[fk]<0){garten.fill(0,0,0);return false}pfad(fk,D3);return true}
   return false};
  // Straße: Bau mit der Tür direkt am Weg oder 1 Feld zurückgesetzt (das Feld davor wird Pfad), nah an der Mitte
  var anStrasse=function(it,alsPlatz){var C=[],k,d,DIR=[[0,1],[0,-1],[1,0],[-1,0]];
   for(k=0;k<WW;k++){if(!istWeg(k)||belegt[k]||vor[k])continue;var x=k%W,y=(k/W)|0;
    for(d=0;d<4;d++){var dx=DIR[d][0],dy=DIR[d][1];for(var sb=0;sb<(alsPlatz?1:2);sb++)for(var rot=0;rot<2;rot++){if(rot&&it.w===it.h)break;
     var w=rot?it.h:it.w,h=rot?it.w:it.h,tx=x+dx*(1+sb),ty=y+dy*(1+sb),i,j;
     if(dy>0){i=tx-(w>>1);j=ty}else if(dy<0){i=tx-(w>>1);j=ty-h+1}else if(dx>0){i=tx;j=ty-(h>>1)}else{i=tx-w+1;j=ty-(h>>1)}
     if(sb&&!frei(x+dx,y+dy))continue;if(!rechteckFrei(i,j,w,h))continue;
     C.push({i:i,j:j,w:w,h:h,t:[tx,ty,-dx,-dy],sb:sb?[x+dx,y+dy]:null,s:Math.hypot(i+w/2-pcx,j+h/2-pcy)+r()*3+(sb?0:r()<.3?2:0)})}}}
   if(!C.length)return false;C.sort(function(a,b){return a.s-b.s});var c=C[0];
   if(alsPlatz){platz(it,c.i,c.j,c.w,c.h);return true}
   garteln(it,c.i,c.j,c.w,c.h,c.t[2],c.t[3]);if(c.sb){weg(c.sb[0],c.sb[1]);vor[at(c.sb[0],c.sb[1])]=1}bau(it,c.i,c.j,c.w,c.h,c.t);return true};
  // Seitengasse 1 breit quer vom Weg hinaus (Straßen- und Angerdorf), mit Abstand zu anderen Wegen
  var gasse=function(mitte){var SL2=[];for(var k0=0;k0<WW;k0++)if(Z[k0]==='s'&&!belegt[k0]&&!vor[k0])SL2.push(k0);if(!SL2.length)return false;
   if(mitte)SL2.sort(function(a,b){return Math.hypot(a%W-pcx,((a/W)|0)-pcy)-Math.hypot(b%W-pcx,((b/W)|0)-pcy)});
   for(var v=0;v<80;v++){var k=SL2[mitte?Math.floor(Math.pow(r(),2)*SL2.length):Math.floor(r()*SL2.length)],x=k%W,y=(k/W)|0,dv=[[1,0],[-1,0],[0,1],[0,-1]][Math.floor(r()*4)],dx=dv[0],dy=dv[1],L=[],n;
    if(!frei(x+dx,y+dy))continue;var len=5+Math.floor(r()*8);
    for(n=1;n<=len;n++){var xx=x+dx*n,yy=y+dy*n;if(xx<2||yy<2||xx>W-3||yy>W-3||!frei(xx,yy))break;var ok=true;
     for(var dd=-2;dd<=2&&ok;dd++){if(!dd)continue;var px=xx+dy*dd,py=yy+dx*dd;if(px<0||py<0||px>=W||py>=W)continue;var kk=at(px,py);if(istWeg(kk)||(Math.abs(dd)===1&&anger[kk]))ok=false}
     if(!ok)break;L.push([xx,yy])}
    if(L.length<4)continue;L.forEach(function(p){weg(p[0],p[1])});gassen++;return true}return false};
  var stehen=function(it){if(form==='weiler'||form==='haufen')return haufen(it);for(var v=0;v<10;v++){if(anStrasse(it,false))return true;if(!gasse())return false}return false};
  // Hauptwege je Form
  if(form==='weiler'){var T=senkrecht(0,W-1,cx-1,.12),m=cy;setzeTor(1,T[0]);setzeTor(0,T[W-1]);
   var sd=r()<.5?1:-1;pcx=T[m]+(sd>0?3.5:-1.5);pcy=m+.5;var bx=Math.floor(pcx),by=m;
   for(var y0=by-1;y0<=by+1;y0++)for(var x0=bx-1;x0<=bx+1;x0++){if((x0-bx)*(y0-by)&&r()<.5)continue;if(x0>=0&&y0>=0&&x0<W&&y0<W&&!istWeg(at(x0,y0))){Z[at(x0,y0)]='o'}}
   for(var x1=Math.min(bx,T[m]+2);x1<=Math.max(bx,T[m]-1);x1++)if(!istWeg(at(x1,by)))Z[at(x1,by)]='o';
   if(spez.well)brunnen(bx,by);if(spez.market&&!anStrasse(spez.market,true))return null}
  else if(form==='haufen'){var M=spez.market,pw=M?M.w:4,ph=M?M.h:4,pi=cx-(pw>>1),pj=cy-(ph>>1);
   if(M)platz(M,pi,pj,pw,ph);else for(var y2=pj;y2<pj+ph;y2++)for(var x2=pi;x2<pi+pw;x2++)Z[at(x2,y2)]='o';
   if(spez.well)brunnen(pi,pj);
   var S4=[0,1,2,3];if(r()<.5)S4.splice(Math.floor(r()*4),1);
   S4.forEach(function(s){var a=s<2?pi+Math.floor(r()*Math.max(1,pw-1)):pj+Math.floor(r()*Math.max(1,ph-1)),L;
    if(s===0){L=senkrecht(pj+ph,W-1,a,.15);setzeTor(0,L[L.length-1])}else if(s===1){L=senkrecht(pj-1,0,a,.15);setzeTor(1,L[L.length-1])}
    else if(s===2){L=waagrecht(pi+pw,W-1,a,.15);setzeTor(2,L[L.length-1])}else{L=waagrecht(pi-1,0,a,.15);setzeTor(3,L[L.length-1])}})}
  else{var p0=form==='strasse'?.15:.1;
   if(form==='strasse'){var T2=senkrecht(0,W-1,cx-1,p0);setzeTor(1,T2[0]);setzeTor(0,T2[W-1]);if(spez.market&&!anStrasse(spez.market,true))return null;
   }else{
    // Angerdorf: Stamm, Gabel um den Anger (Linse), wieder zusammen; Anger frei mit Brunnen und Markt
    var kA=5,LA=Math.max(16,Math.min(W-10,22)),a0=Math.max(4,cy-(LA>>1)),a1=a0+LA,xc=cx-1;if(a1>W-5)return null;
    for(var t=0;t<W;t++){var dA=t>=a0&&t<=a1?Math.round(kA*Math.sin(Math.PI*(t-a0)/LA)):0;weg(xc-dA,t);weg(xc-dA+1,t);weg(xc+dA,t);weg(xc+dA+1,t);
     for(var xa=xc-dA+2;xa<=xc+dA-1;xa++){var ka=at(xa,t);if(Z[ka]==='g'){res[ka]=1;anger[ka]=1}}}
    setzeTor(1,xc);setzeTor(0,xc);
    if(r()<.5){var ost=r()<.5,ym=a0+(LA>>1);if(ost)setzeTor(2,waagrecht(xc+kA+2,W-1,ym,.12).pop());else setzeTor(3,waagrecht(xc-kA-1,0,ym,.12).pop())}
    var M2=spez.market;if(M2){var gut=null;
     for(var tj=a0;tj<=a1&&!gut;tj++)for(var ti=1;ti<W-1&&!gut;ti++)for(var rt=0;rt<2&&!gut;rt++){var mw=rt?M2.h:M2.w,mh=rt?M2.w:M2.h,ok=true,ran=false;
      for(var yy=tj;yy<tj+mh&&ok;yy++)for(var xx=ti;xx<ti+mw&&ok;xx++){if(yy>=W||xx>=W||!anger[at(xx,yy)]){ok=false;break}if(istWeg(at(xx-1,yy))||istWeg(at(xx+1,yy)))ran=true}
      if(ok&&ran)gut=[ti,tj,mw,mh]}
     if(gut)platz(M2,gut[0],gut[1],gut[2],gut[3]);else if(!anStrasse(M2,true))return null}
    if(spez.well){var bi=xc,bj=a0+(LA>>1),bk=-1;for(var dd2=0;dd2<LA&&bk<0;dd2++)for(var sg=-1;sg<=1&&bk<0;sg+=2){var yb=bj+sg*dd2,xs=[xc,xc+1,xc-1,xc+2];for(var xi=0;xi<4&&bk<0;xi++)if(yb>=0&&yb<W&&anger[at(xs[xi],yb)]&&Z[at(xs[xi],yb)]==='g')bk=at(xs[xi],yb)}
     if(bk<0)return null;brunnen(bk%W,(bk/W)|0);var Dw=feld(true),nb2=[bk-1,bk+1,bk-W,bk+W],st=-1;for(var e=0;e<4;e++)if(Dw[nb2[e]]>=0&&(st<0||Dw[nb2[e]]<Dw[st]))st=nb2[e];
     if(st>=0&&Dw[st]>0)pfad(st,Dw)}}
   if(form==='strasse'&&spez.well&&!gesetzt.well){var wk=-1;for(var q2=0;q2<WW&&wk<0;q2++)if(Z[q2]==='o'){var qi=q2%W,qj=(q2/W)|0;[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(v2){var x3=qi+v2[0],y3=qj+v2[1];if(wk<0&&frei(x3,y3)&&x3>0&&y3>0&&x3<W-1&&y3<W-1)wk=at(x3,y3)})}
    if(wk<0)return null;brunnen(wk%W,(wk/W)|0)}}
  // Straßen- und Angerdorf: Seitengassen vorab nach Bedarf (Häuser an der Hauptstraße reichen für etwa 8 Bauten je 10 Felder Straße), nahe der Mitte zuerst
  if(form==='strasse'||form==='anger'){var vorab=Math.max(0,Math.round(bauL.length/(form==='anger'?7:6))-2);for(var ga=0;ga<vorab;ga++)gasse(true)}
  for(var n=0;n<bauL.length;n++)if(!stehen(bauL[n]))return null;
  // Alles Begehbare hängt zusammen (vom ersten Ausgang aus)
  var t0=tore[0],sk=t0.s===0?at(t0.c,W-1):t0.s===1?at(t0.c,0):t0.s===2?at(W-1,t0.c):at(0,t0.c),er=new Uint8Array(WW),st2=[sk];er[sk]=1;
  while(st2.length){var c2=st2.pop(),c2i=c2%W,c2j=(c2/W)|0,N2=[c2i>0?c2-1:-1,c2i<W-1?c2+1:-1,c2j>0?c2-W:-1,c2j<W-1?c2+W:-1];for(var d2=0;d2<4;d2++){var k2=N2[d2];if(k2>=0&&!er[k2]&&!belegt[k2]&&istWeg(k2)){er[k2]=1;st2.push(k2)}}}
  for(var k3=0;k3<WW;k3++)if(istWeg(k3)&&!belegt[k3]&&!er[k3])return null;
  // Zuschneiden: Quadrat um alles Gebaute (Bauten, Gärten, Plätze, Anger) plus 2 Felder Rand; die Wege hinaus werden am neuen Rand gekappt
  var bx0=W,by0=W,bx1=-1,by1=-1;for(var k4=0;k4<WW;k4++)if(belegt[k4]||garten[k4]||anger[k4]||Z[k4]==='o'){var i4=k4%W,j4=(k4/W)|0;if(i4<bx0)bx0=i4;if(i4>bx1)bx1=i4;if(j4<by0)by0=j4;if(j4>by1)by1=j4}
  var SW=Math.max(bx1-bx0,by1-by0)+5;
  if(SW<W){var ox=Math.max(0,Math.min(W-SW,((bx0+bx1+1)>>1)-(SW>>1))),oy=Math.max(0,Math.min(W-SW,((by0+by1+1)>>1)-(SW>>1))),neuT=[],okT=true;
   tore.forEach(function(t){var runs=[],e,run=-1,len=0;for(e=0;e<=SW;e++){var x=e<SW?(t.s<2?ox+e:t.s===2?ox+SW-1:ox):0,y=e<SW?(t.s<2?(t.s===0?oy+SW-1:oy):oy+e):0,w2=e<SW&&Z[at(x,y)]==='s';
     if(w2){if(run<0)run=e;len++}else{if(len>=2)runs.push([run,len]);run=-1;len=0}}
    var alt=t.s<2?t.c-ox:t.c-oy,best=null;runs.forEach(function(q){if(!best||Math.abs(q[0]-alt)<Math.abs(best[0]-alt))best=q});if(!best||best[1]>3){okT=false;return}neuT.push({s:t.s,c:best[0],u0:0,haupt:true})});
   if(okT&&new Set(neuT.map(function(t){return t.s})).size===neuT.length){
    var Z3=new Array(SW*SW),b3=new Uint8Array(SW*SW),a3=new Uint8Array(SW*SW),ve=new Uint8Array(SW*SW);for(var j7=0;j7<SW;j7++)for(var i7=0;i7<SW;i7++){var o7=at(i7+ox,j7+oy);Z3[j7*SW+i7]=Z[o7];b3[j7*SW+i7]=belegt[o7];a3[j7*SW+i7]=anger[o7]}
    // alles Begehbare hängt im Zuschnitt noch zusammen?
    var st3=[],ok3=true,t3=neuT[0];st3.push(t3.s===0?(SW-1)*SW+t3.c:t3.s===1?t3.c:t3.s===2?t3.c*SW+SW-1:t3.c*SW);ve[st3[0]]=1;
    while(st3.length){var c3=st3.pop(),ci3=c3%SW,cj3=(c3/SW)|0,N3=[ci3>0?c3-1:-1,ci3<SW-1?c3+1:-1,cj3>0?c3-SW:-1,cj3<SW-1?c3+SW:-1];for(var d3=0;d3<4;d3++){var n3=N3[d3];if(n3>=0&&!ve[n3]&&!b3[n3]&&/[so]/.test(Z3[n3])){ve[n3]=1;st3.push(n3)}}}
    for(var q3=0;q3<SW*SW;q3++)if(/[so]/.test(Z3[q3])&&!b3[q3]&&!ve[q3])ok3=false;
    if(ok3){bauten.forEach(function(b){b.i-=ox;b.j-=oy;if(b.tuer){b.tuer[0]-=ox;b.tuer[1]-=oy}});dinge=dinge.filter(function(d){d.i-=ox;d.j-=oy;return d.i>=0&&d.j>=0&&d.i<SW&&d.j<SW});
     W=SW;WW=SW*SW;Z=Z3;belegt=b3;anger=a3;tore=neuT;cx-=ox;cy-=oy}}}
  // Bäume und Kram auf freiem Gras (auf dem Anger seltener, keine in Gärten)
  for(var q5=0;q5<WW;q5++){if(belegt[q5]||Z[q5]!=='g')continue;var i5=q5%W,j5=(q5/W)|0,u5=rausch(i5,j5,seed+7),pb=(B.dichte*.6+.04)*(anger[q5]?.35:1);
   if(u5<pb)dinge.push({id:B.baeume[Math.floor(rausch(i5,j5,seed+8)*B.baeume.length)],i:i5,j:j5});else if(u5>.97&&!anger[q5])dinge.push({id:'lager-platz',i:i5,j:j5})}
  var E={W:W,Z:Z,bauten:bauten,dinge:dinge,nb:1,gesetzt:gesetzt,tore:tore,maske:new Uint8Array(WW).fill(1),achse:{i:cx,j:cy},
   vielfalt:{dorf:form,ausgaenge:tore.length,gaerten:gaerten,gassen:gassen}};
  if(kipp){var Z2=new Array(WW);for(var j6=0;j6<W;j6++)for(var i6=0;i6<W;i6++)Z2[at(j6,i6)]=Z[at(i6,j6)];E.Z=Z2;
   bauten.forEach(function(b){var t=b.i;b.i=b.j;b.j=t;t=b.w;b.w=b.h;b.h=t;if(b.w!==b.h)b.achse=b.w>b.h?'i':'j';if(b.tuer)b.tuer=[b.tuer[1],b.tuer[0],b.tuer[3],b.tuer[2]]});
   dinge.forEach(function(d){var t=d.i;d.i=d.j;d.j=t});tore.forEach(function(t){t.s=[2,3,0,1][t.s]});E.achse={i:cy,j:cx}}
  var tp=tore.filter(function(t){return t.s===0})[0]||tore.filter(function(t){return t.s===2})[0]||tore[0];
  E.tor=tp.s===0?{i:tp.c,j:W-1}:tp.s===2?{i:W-1,j:tp.c}:tp.s===1?{i:tp.c,j:0}:{i:0,j:tp.c};
  return E}
 var E2=ergebnis,P={format:'at3-stadtplan',art:art,g:g,einw:einw,biom:opt.biom,stil:opt.stil||'',seed:seed,W:E2.W,block:Bm,nb:E2.nb,zellen:E2.Z.join(''),bauten:E2.bauten,dinge:E2.dinge,
  tor:E2.tor,mauertor:E2.mauertor||null,gesetzt:E2.gesetzt,vielfalt:E2.vielfalt||null,gespiegelt:false,basis:basis,feld:B.feld,aussen:E2.aussen||null,fluss:E2.fluss||null,kueste:E2.kueste||null};
 // Umriss (N6b2c4a2): Art, Ecken, Tore und die Innenfläche je Zeile [j, i0, i1, …] in Planfeldern (innenMaske() rechnet Maßstab und Spiegeln um)
 if(!elend){var MK=E2.maske,Wm=Math.round(Math.sqrt(MK.length)),Rm=E2.rand||0,zl=[];
  for(var jm=0;jm<Wm;jm++){var im=0;while(im<Wm){if(!MK[jm*Wm+im]){im++;continue}var i1=im;while(i1+1<Wm&&MK[jm*Wm+i1+1])i1++;zl.push(jm+Rm,im+Rm,i1+Rm);im=i1+1}}
  P.umriss={dorf:E2.vielfalt&&E2.vielfalt.dorf||null,art:UM?UM.art:g>=MAUER_AB?'quadrat':'offen',ecken:UM?UM.ecken:4,beulen:UM?UM.beulen:0,tore:E2.tore.map(function(t){return SEITE[t.s]}),zeilen:zl,planW:E2.W}}
 if(HU)huegelPlan(P,HT,seed,P1);
 if(F!==1)P=skalieren(P,F);
 var spW=rng(hashT([seed,art,einw,'sp'].join('|')))()<.5;if(P.fluss)spW=P.fluss.achse!==FL;   // mit Fluss: Spiegeln so, dass er wie in der Welt fließt
 if(P.kueste){spW=P.kueste.spiegel;delete P.kueste.spiegel}   // mit Küste: so, dass das Meer auf der Seite aus der Welt liegt (N6b2c4c2)
 if(spW)P=spiegeln(P);
 if(P.kueste)hochstege(P);
 if(P.hoehe)huegelFertig(P);
 if(g>=MAUER_AB&&UM&&opt.rund!==false)mauerRund(P,UM,Rm,Wm,spW);   // N6b2e2a runde Mauerlinie in Bildfeldern (opt.rund:false = vergrößerter Plan wie vorher)
 if(g>=MAUER_AB&&opt.wehr!==false)mauerwerk(P);   // N6b2d begehbare Mauer (opt.wehr:false = Platzhalter wie vorher)
 delete P.mauertor;   // nur zum Rechnen der Tore
 P.dinge.forEach(function(d){d.id=dingWahl(d.id,d.i,d.j)});
 return P}
// Hochstege (Thomas 22.11.2026, Rückmeldung zu N6b2c4c2): Holzstege eine Stufe über dem Wasser wie die Holzbrücke aus 2.0 (welt-bruecke.js), auf Pfählen;
// das erste Feld vom Kai bzw. Strand ist eine Rampe hinauf (steigt zur See), Anleger (Planken quer) auf Deckhöhe. Unter dem Steg liegt Wasser. Nach dem Spiegeln
// gesetzt, damit Richtung und Planken zum fertigen Bild passen. Molen bleiben flaches Pflaster; hohe, breite Flussbrücken für Schiffe kommen später.
var RAMPE={south:'steg-rampe-s',north:'steg-rampe-n',east:'steg-rampe-o',west:'steg-rampe-w'},SEE_DIR={south:[0,1],north:[0,-1],east:[1,0],west:[-1,0]};
function hochstege(P){var W=P.W,Z=P.zellen,d=SEE_DIR[P.kueste.seite],ax=d[0]?'i':'j',quer=ax==='i'?'j':'i',i,j;
 var c=function(x,y){return x>=0&&y>=0&&x<W&&y<W?Z.charAt(y*W+x):'w'};
 for(j=0;j<W;j++)for(i=0;i<W;i++){if(Z.charAt(j*W+i)!=='y')continue;var land=c(i-d[0],j-d[1]),see=c(i+d[0],j+d[1]),id;
  if(land!=='y'&&land!=='w')id=RAMPE[P.kueste.seite];else id='steg-deck-'+(land==='y'||see==='y'?ax:quer);
  P.dinge.push({id:id,i:i,j:j,rolle:'steg'})}}
// Burgberg (N6b2c4c3): Höhenstufe je Feld als Ziffernfolge P.hoehe (gleiche Lage wie P.zellen), vor dem Maßstab im Plan gerechnet. Kern = Doppelblock(s) der
// Gipfelbauten (Stufe T); Abstand d bis ½ Block T−1, bis 1 Block T−2, ab Großstadt bis 2 Blöcke Stufe 1, sonst 0; Rand mit grobem Rauschen ±0,75 ausgefranst.
// Wasser, Kai, Strand, Stege und Wege am Wasser (Brücken, Ufergassen) bleiben auf Stufe 0, von dort höchstens 1 Stufe je Feld (kein Weg springt um 2 Stufen).
function huegelPlan(P,T,seed,P1){var W=P.W,Z=P.zellen,K=[],ids=[],i,j,n=0;
 P.bauten.forEach(function(b){if(b.gipfel&&b.kern){K.push([b.i+b.kern[0],b.j+b.kern[1],b.kern[2],b.kern[3]]);ids[b.gipfel-1]=b.id}delete b.kern});if(!K.length)return;
 var c=function(x,y){return x>=0&&y>=0&&x<W&&y<W?Z.charAt(y*W+x):'g'},H=new Array(W*W);
 for(j=0;j<W;j++)for(i=0;i<W;i++){var z=Z.charAt(j*W+i),d=1e9,l;
  for(var q=0;q<K.length;q++){var k=K[q],dx=Math.max(k[0]-i,0,i-(k[0]+k[2]-1)),dy=Math.max(k[1]-j,0,j-(k[1]+k[3]-1)),e=(Math.sqrt(dx*dx+dy*dy)+Math.max(dx,dy))/2;if(e<d)d=e}
  var dr=d+(rausch(i>>1,j>>1,seed+91)-.5)*1.5;l=d===0?T:dr<=P1*.5?T-1:dr<=P1+.5?T-2:T>=4&&dr<=2*P1+1?1:0;if(l<0)l=0;
  if(/[wquy]/.test(z)||z==='s'&&(c(i+1,j)==='w'||c(i-1,j)==='w'||c(i,j+1)==='w'||c(i,j-1)==='w'))l=0;H[j*W+i]=l}
 // vom Wasser aus höchstens 1 Stufe je Feld (Abstand in 4 Richtungen), so springt kein Weg um 2 Stufen
 var D=new Int32Array(W*W).fill(1e9),qu=[],qh=0;for(var k0=0;k0<W*W;k0++){var z0=Z.charAt(k0),i0=k0%W,j0=(k0/W)|0;if(/[wquy]/.test(z0)||z0==='s'&&(c(i0+1,j0)==='w'||c(i0-1,j0)==='w'||c(i0,j0+1)==='w'||c(i0,j0-1)==='w')){D[k0]=0;qu.push(k0)}}
 while(qh<qu.length){var kq=qu[qh++],iq=kq%W,jq=(kq/W)|0;[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(v){var x=iq+v[0],y=jq+v[1];if(x<0||y<0||x>=W||y>=W)return;var kn=y*W+x;if(D[kn]>D[kq]+1){D[kn]=D[kq]+1;qu.push(kn)}})}
 for(k0=0;k0<W*W;k0++){if(H[k0]>D[k0])H[k0]=D[k0];if(H[k0])n++}
 P.hoehe=H.join('');P.huegel={stufen:T,gipfel:ids.filter(Boolean),kern:K,felder:n}}
// Nach Maßstab und Spiegeln: jedes Gebäude steht ganz auf einer Stufe (der Stufe vor seiner Tür, Gipfelbauten oben, Mauerstücke auf ihrem Feld), lose Dinge auf
// ihrem Feld. hz = Stufe (Bild: hz · HSTUFE Bildpunkte höher).
function huegelFertig(P){var W=P.W,H=P.hoehe.split('').map(Number),lv=function(i,j){return i>=0&&j>=0&&i<W&&j<W?H[j*W+i]:0};
 P.bauten.forEach(function(b){var l=b.gipfel?P.huegel.stufen:b.tuer?lv(b.tuer[0]+b.tuer[2],b.tuer[1]+b.tuer[3]):lv(b.i+(b.w>>1),b.j+(b.h>>1));
  b.hz=l;for(var y=b.j;y<b.j+b.h;y++)for(var x=b.i;x<b.i+b.w;x++)if(x>=0&&y>=0&&x<W&&y<W)H[y*W+x]=l});
 P.dinge.forEach(function(d){d.hz=lv(d.i,d.j)});P.hoehe=H.join('')}
// N6b2d Begehbare Mauern und Türme (Thomas 22.11.2026: ein Schritt, Mauer 4 Stufen, Türme 6, Treppen innen und Wehrgang durchgehend über Tore und durch
// Türme, Teile als Skizze direkt eingebaut). Nach Maßstab und Spiegeln aus den fertigen Mauerfeldern (Bildfelder) gerechnet, einmal je Ort im Plan:
//  · Wehrgang auf jedem Mauerfeld, Höhe = Boden + 4 Stufen; Nachbarn höchstens 1 Stufe auseinander (auf dem Burgberg wird die Mauer dafür höher, der Gang hat Stufen).
//  · Tore und Wassertore: Lücken der Mauer (Straße oder Fluss), der Wehrgang läuft als Sturz darüber, unten bleibt frei.
//  · Türme 3 × 3 ganz auf der Mauer: zuerst je zwei an jedem Tor, dann reihum etwa alle TURM_AB Felder. N6b2e1 (Rundgang): die Plattform ist Wehrgang,
//    TURM_H Stufen höher, davor auf jeder Seite ein Rampenfeld je Stufe (mauer-rampe-*); keine Tür, keine Leiter. Jeder Höhenwechsel im Gang ist eine Rampe.
//  · Treppen innen: 4 Felder in der inneren Mauerreihe an der Ringgasse (Felstreppen des Burgbergs), davor eine Nische (inneres Mauerfeld frei, Weg), sodass
//    man von der Gasse in die Nische und geradeaus hinaufgeht; oben geht der Gang weiter.
//  · Zinnen nur an der Außenkante der Mauer, am Turm nur dort, wo kein Gang anschließt (nie quer über den Gang).
// P.wehr (Begehbarkeit als Daten für First Person und Kampf): Zeichenketten je Bildfeld wie P.zellen: art ('.' nichts, m Mauer, t Tor, T Turm, r Treppe,
// n Nische), gang (Höhe als Zeichen 48 + Stufe; Turm: Plattform = Gang + TURM_H; Nische: Boden), stufe (Richtung, in die das Feld eine Stufe steigt), zinne
// (Bits s1 o2 n4 w8, hex); tuerme [[i, j, Plattformhöhe]] (obere Ecke des 3 × 3), treppen [{felder, s, nische, gasse, unten, oben}]. Übergänge: Gasse ↔ Nische
// (Boden), Nische ↔ Treppenfuß (wehrNachbarn). Bild: je Feld vorgezeichnete Teile (Wandstück je Stufe und Vorderkante, Wehrgang, Zinnen), Kosten wie beim Burgberg.
// N6b2e2a (Thomas 22.11.2026, „neu rechnen“): Mauerlinie direkt in Bildfeldern aus dem Umriss statt aus dem vergrößerten Plan (gleichmäßige 45°-Stufen statt
// 1-2-1-Zacken). Band = innen und höchstens MAUER_BILD Schritte (4 Richtungen) bis draußen. Häuser, Dinge, Wasser und Gassen außerhalb des alten Bands bleiben
// unangetastet (dort bleibt die alte Mauer), Tore laufen längs ihrer Straße durch das neue Band.
var MAUER_BILD=3;
function mauerRund(P,UM,R,Wc,sp){var W=P.W,WW=W*W,F=P.mass||1,Z=P.zellen.split(''),k,i,j,d;
 var MI=new Uint8Array(WW);for(j=0;j<W;j++)for(i=0;i<W;i++){var a=sp?j:i,b=sp?i:j;MI[j*W+i]=UM.innen(((a+.5)/F-R)/Wc*2-1,((b+.5)/F-R)/Wc*2-1)?1:0}
 var N4=function(k){var x=k%W,y=(k/W)|0;return[x<W-1?k+1:-1,y<W-1?k+W:-1,x>0?k-1:-1,y>0?k-W:-1]};
 var D=new Int32Array(WW).fill(1e9),q=[],h=0;for(k=0;k<WW;k++){if(!MI[k])continue;var n0=N4(k);if(n0.some(function(x){return x<0||!MI[x]})){D[k]=1;q.push(k)}}
 while(h<q.length){var a2=q[h++],nn=N4(a2);for(d=0;d<4;d++){var b2=nn[d];if(b2>=0&&MI[b2]&&D[b2]>D[a2]+1){D[b2]=D[a2]+1;q.push(b2)}}}
 var alt=new Uint8Array(WW),bau=new Uint8Array(WW),ding=new Uint8Array(WW),MT=P.mauertor,MO=innenMaske(P),B=BIOME[P.biom],baum={};(B&&B.baeume||[]).forEach(function(x){baum[x]=1});
 P.bauten.forEach(function(b){for(var y=Math.max(0,b.j);y<Math.min(W,b.j+b.h);y++)for(var x=Math.max(0,b.i);x<Math.min(W,b.i+b.w);x++)(b.rolle==='mauer'?alt:bau)[y*W+x]=1});
 P.dinge.forEach(function(o){if(o.i>=0&&o.j>=0&&o.i<W&&o.j<W)ding[o.j*W+o.i]=baum[o.id]?1:2});
 var band=function(k){return MI[k]&&D[k]<=MAUER_BILD},torAlt=function(k){return MT&&MT.charCodeAt(k)===49};
 // Tore: zusammenhängende alte Torfelder; Achse = Richtung, in der die Straße (oder der Fluss) auf beiden Seiten weitergeht; längs der Achse durch das neue Band
 var tor=new Uint8Array(WW),seen=new Uint8Array(WW),SW=/[sw]/;
 for(k=0;k<WW;k++){if(!torAlt(k)||seen[k])continue;var T=[],st=[k];seen[k]=1;while(st.length){var c=st.pop();T.push(c);N4(c).forEach(function(x){if(x>=0&&torAlt(x)&&!seen[x]){seen[x]=1;st.push(x)}})}
  var inT={};T.forEach(function(x){inT[x]=1});var zahl=[0,0];T.forEach(function(x){var n=N4(x);[0,1].forEach(function(ax){[n[ax],n[ax+2]].forEach(function(y){if(y>=0&&!inT[y]&&SW.test(Z[y]))zahl[ax]++})})});
  var ax=zahl[1]>=zahl[0]?1:0,step=ax?W:1;
  T.forEach(function(x){if(band(x))tor[x]=1;[step,-step].forEach(function(sv){var y=x+sv;while(y>=0&&y<WW&&Math.abs((y%W)-(x%W))<=(ax?0:W)&&band(y)&&SW.test(Z[y])&&!bau[y]){tor[y]=1;y+=sv}})})}
 for(k=0;k<WW;k++)if(band(k)&&Z[k]==='w')tor[k]=1;
 // neue Mauer: Band nur auf alter Mauer oder freiem Boden (Gras, Fels, Feld mit Baum); Gassen, Straßen, Häuser, Dinge und Wasser bleiben, wo sie sind.
 // Ist ein Bandfeld außerhalb der alten Mauer belegt (Hof, Elendsbude, Straße), bleibt dort im Umkreis von 2 Feldern die alte Mauer (keine Lücke, nichts
 // Belegtes landet innen). Innen belegte Bandfelder (Ringgasse, Haus) bleiben frei, die Mauer ist dort schmaler.
 var neu=new Uint8Array(WW),zu=new Uint8Array(WW),n=0;for(k=0;k<WW;k++){if(!band(k)||tor[k])continue;var c2=Z[k];
  if(alt[k]||(!bau[k]&&ding[k]!==2&&(c2==='g'||c2==='x'))){neu[k]=1;n++}else if(!MO[k])zu[k]=1}
 if(!n)return;
 var R2=2;for(k=0;k<WW;k++){if(!zu[k])continue;var zi=k%W,zj=(k/W)|0;
  for(var dy=-R2-1;dy<=R2+1;dy++)for(var dx=-R2-1;dx<=R2+1;dx++){var x=zi+dx,y=zj+dy;if(x<0||y<0||x>=W||y>=W)continue;var kk=y*W+x,nahe=Math.max(Math.abs(dx),Math.abs(dy))<=R2;
   if(nahe&&neu[kk]&&!alt[kk]&&!MO[kk])neu[kk]=0;if(alt[kk]&&!tor[kk])neu[kk]=1}}
 // Mauer muss über Kanten zusammenhängen (Wehrgang geht nur in 4 Richtungen): berühren sich zwei Mauerfelder nur über Eck, kommt eins der beiden
 // anderen Felder dazu (alte Mauer zuerst, sonst freier Boden); geht keins, bleibt dort die alte Mauer ringsum
 var darf=function(kk){return !tor[kk]&&(alt[kk]||(!bau[kk]&&ding[kk]!==2&&(Z[kk]==='g'||Z[kk]==='x')))};
 for(var runde=0;runde<6;runde++){var neuDa=false;for(j=0;j<W-1;j++)for(i=0;i<W-1;i++){var p0=j*W+i,p1=p0+1,p2=p0+W,p3=p2+1,c=null;
   if(neu[p0]&&neu[p3]&&!neu[p1]&&!neu[p2])c=[p1,p2];else if(neu[p1]&&neu[p2]&&!neu[p0]&&!neu[p3])c=[p0,p3];if(!c)continue;
   var wahl=alt[c[0]]&&darf(c[0])?c[0]:alt[c[1]]&&darf(c[1])?c[1]:darf(c[0])?c[0]:darf(c[1])?c[1]:-1;
   if(wahl>=0){neu[wahl]=1;neuDa=true;continue}
   for(var dy2=-2;dy2<=3;dy2++)for(var dx2=-2;dx2<=3;dx2++){var x2=i+dx2,y2=j+dy2;if(x2>=0&&y2>=0&&x2<W&&y2<W&&alt[y2*W+x2]&&!tor[y2*W+x2]&&!neu[y2*W+x2]){neu[y2*W+x2]=1;neuDa=true}}}
  if(!neuDa)break}
 // Innenfläche = was die Mauer samt Toren einschließt (Flut vom Bildrand über alles andere)
 var aus=new Uint8Array(WW),fl=[];for(k=0;k<WW;k++){var fi=k%W,fj=(k/W)|0;if((fi===0||fj===0||fi===W-1||fj===W-1)&&!neu[k]&&!tor[k]){aus[k]=1;fl.push(k)}}
 while(fl.length){var a3=fl.pop(),n3=N4(a3);for(d=0;d<4;d++){var b3=n3[d];if(b3>=0&&!aus[b3]&&!neu[b3]&&!tor[b3]){aus[b3]=1;fl.push(b3)}}}
 var MN=new Uint8Array(WW),nin=0,nmo=0;for(k=0;k<WW;k++){if(!aus[k]){MN[k]=1;nin++}if(MO[k])nmo++}
 if(nin<nmo*.8)return;   // Mauer nicht dicht (sollte nicht vorkommen): alles bleibt wie vorher
 for(k=0;k<WW;k++){if(neu[k]){Z[k]='g';continue}if(alt[k])Z[k]=MN[k]?'s':'g';if(tor[k]&&!SW.test(Z[k]))Z[k]='s'}
 // Bäume weichen auf der Mauer und direkt davor (freies Schussfeld; dort liegen die Halbfelder der Schrägen)
 var frei=function(x,y){if(x<0||y<0||x>=W||y>=W)return false;var kk=y*W+x;if(neu[kk])return true;if(MN[kk])return false;var nz=N4(kk);for(var q2=0;q2<4;q2++)if(nz[q2]>=0&&neu[nz[q2]])return true;return false};
 P.dinge=P.dinge.filter(function(o){return !(o.i>=0&&o.j>=0&&o.i<W&&o.j<W&&(neu[o.j*W+o.i]||(baum[o.id]&&frei(o.i,o.j))))});
 var m0=null;P.bauten=P.bauten.filter(function(b){if(b.rolle!=='mauer')return true;if(!m0)m0=b;return false});
 var HZ=P.hoehe;for(k=0;k<WW;k++)if(neu[k]){var o={rolle:'mauer',i:k%W,j:(k/W)|0,w:1,h:1,klasse:m0.klasse,dach:m0.dach,achse:'i',wand:m0.wand,dachR:m0.dachR};
  if(HZ)o.hz=HZ.charCodeAt(k)-48;P.bauten.push(o)}
 P.zellen=Z.join('');var mt='';for(k=0;k<WW;k++)mt+=tor[k]&&!neu[k]?'1':'0';P.mauertor=mt;
 var zl=[];for(j=0;j<W;j++){i=0;while(i<W){if(!MN[j*W+i]){i++;continue}var i1=i;while(i1+1<W&&MN[j*W+i1+1])i1++;zl.push(j,i,i1);i=i1+1}}P.umriss.bild=zl}
var WEHR_IDS=['mauer-kante-i','mauer-kante-j','turm-kante-i','turm-kante-j','turm-scharte-i','turm-scharte-j','tor-sturz-i','tor-sturz-j','mauer-gang',
 'mauer-zinne-n','mauer-zinne-s','mauer-zinne-o','mauer-zinne-w','fels-treppe-s','fels-treppe-n','fels-treppe-o','fels-treppe-w',
 'mauer-rampe-s','mauer-rampe-n','mauer-rampe-o','mauer-rampe-w',
 'mauer-zinne-n-a','mauer-zinne-s-a','mauer-zinne-o-a','mauer-zinne-w-a','mauer-zinne-n-b','mauer-zinne-s-b','mauer-zinne-o-b','mauer-zinne-w-b',
 'mauer-halb-ob','mauer-halb-re','mauer-halb-un','mauer-halb-li','mauer-halb-zinne-ob','mauer-halb-zinne-ob-a','mauer-halb-zinne-ob-b','mauer-halb-zinne-re',
 'mauer-halb-zinne-un','mauer-halb-zinne-li','mauer-halb-wand','mauer-halb-wand-a','mauer-halb-wand-b','mauer-halb-wand-c','mauer-halb-wand-d'];
// Zinnen-Varianten nach Lage (N6b2e1, gegen Wiederholung auf langen Mauern): 12 Plätze, Grundbild 8×, -a ausgebrochen 3×, -b Pfeil und Blutspur 1×
var ZINNE_VAR='00000000aaab';function zinneWahl(d,i,j,seed){var c=ZINNE_VAR.charAt(Math.floor(rausch(i,j,seed+131)*ZINNE_VAR.length));return 'mauer-zinne-'+d+(c==='0'?'':'-'+c)}   // N6b2e1: Turmtür entfällt (Gang führt über Rampen auf die Plattform)
// N6b2e2a Halbfelder: Raster-Ecke → Bildlage (N oben, E rechts, S unten, W links); vordere Zinnen wie die Zinnen 8 : 3 : 1, Schrägwand 3 ruhige Fassungen (je 3) + Riss 2 + Flickstein 1
var HALB={N:'ob',E:'re',S:'un',W:'li'},WAND_VAR='000cccdddaab';function halbWahl(id,i,j,seed,v){v=v||ZINNE_VAR;var c=v.charAt(Math.floor(rausch(i,j,seed+137)*v.length));return c==='0'?id:id+'-'+c}
var WEHR_H=4,TURM_H=2,TURM_AB=12,TREPPE_AB=20,WRI={s:[0,1],o:[1,0],n:[0,-1],w:[-1,0]},WRK=['s','o','n','w'],ZBIT={s:1,o:2,n:4,w:8};
function mauerwerk(P){var W=P.W,WW=W*W,Z=P.zellen,H=P.hoehe,MK=innenMaske(P),wand=new Uint8Array(WW),k,i,j,q;
 P.bauten.forEach(function(b){if(b.rolle!=='mauer')return;for(var y=b.j;y<b.j+b.h;y++)for(var x=b.i;x<b.i+b.w;x++)if(x>=0&&y>=0&&x<W&&y<W)wand[y*W+x]=1});
 var nw=0;for(k=0;k<WW;k++)nw+=wand[k];if(!nw)return;
 var lv=function(i,j){return H&&i>=0&&j>=0&&i<W&&j<W?H.charCodeAt(j*W+i)-48:0},drin=function(i,j){return i>=0&&j>=0&&i<W&&j<W&&MK[j*W+i]===1};
 var A=new Uint8Array(WW);for(k=0;k<WW;k++)if(wand[k])A[k]=1;   // 1 Mauer, 2 Tor, 3 Turm, 4 Treppe
 // Tore: Felder, an denen der Plan die Mauer für eine Straße oder den Fluss geöffnet hat (P.mauertor)
 var MT=P.mauertor;if(MT)for(k=0;k<WW;k++)if(!wand[k]&&MT.charCodeAt(k)===49)A[k]=2;
 // Ganghöhe: Boden + 4, dann glätten (Nachbarn höchstens 1 Stufe auseinander, nur anheben)
 var L=new Int16Array(WW).fill(-1);for(k=0;k<WW;k++)if(A[k])L[k]=lv(k%W,(k/W)|0)+WEHR_H;
 var N4=function(k){var i=k%W,j=(k/W)|0;return[i<W-1?k+1:-1,j<W-1?k+W:-1,i>0?k-1:-1,j>0?k-W:-1]};
 var glaetten=function(){var qq=[],h=0;for(k=0;k<WW;k++)if(A[k])qq.push(k);while(h<qq.length){var a=qq[h++],nn=N4(a);for(var d=0;d<4;d++){var b=nn[d];if(b>=0&&A[b]&&L[b]<L[a]-1){L[b]=L[a]-1;qq.push(b)}}}};
 glaetten();
 // Mittelpunkt der Innenfläche (für die Reihenfolge rund um die Mauer)
 var cx=0,cy=0,cn=0;for(k=0;k<WW;k++)if(MK[k]){cx+=k%W;cy+=(k/W)|0;cn++}cx/=cn;cy/=cn;
 // Türme: Fenster 3 × 3 ganz aus Mauerfeldern
 var kand=[];for(j=0;j+2<W;j++)for(i=0;i+2<W;i++){var voll=true;for(q=0;q<9&&voll;q++)if(A[(j+(q/3|0))*W+i+q%3]!==1)voll=false;if(voll)kand.push([i,j])}
 var tuerme=[],belegtT=new Uint8Array(WW);
 var frei=function(c){for(var q2=0;q2<9;q2++){var y=c[1]+(q2/3|0),x=c[0]+q2%3;for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){var x2=x+dx,y2=y+dy;if(x2>=0&&y2>=0&&x2<W&&y2<W&&belegtT[y2*W+x2])return false}}return true};
 var setzT=function(c){tuerme.push([c[0],c[1],0]);for(var q2=0;q2<9;q2++)belegtT[(c[1]+(q2/3|0))*W+c[0]+q2%3]=1};
 var mitte=function(c){return[c[0]+1,c[1]+1]},ab=function(a,b){var p=mitte(a),r=mitte(b);return Math.hypot(p[0]-r[0],p[1]-r[1])};
 // je Tor (zusammenhängende Torfelder) zwei Türme direkt daneben, möglichst weit auseinander (links und rechts der Durchfahrt)
 var torId=new Int32Array(WW).fill(-1),tore=[];for(k=0;k<WW;k++){if(A[k]!==2||torId[k]>=0)continue;var st=[k],T=[];torId[k]=tore.length;
  while(st.length){var a=st.pop();T.push(a);N4(a).forEach(function(b){if(b>=0&&A[b]===2&&torId[b]<0){torId[b]=tore.length;st.push(b)}})}tore.push(T)}
 tore.forEach(function(T){var nah=kand.filter(function(c){for(var q2=0;q2<T.length;q2++){var ti=T[q2]%W,tj=(T[q2]/W)|0;if(ti>=c[0]-2&&ti<=c[0]+4&&tj>=c[1]-2&&tj<=c[1]+4)return true}return false});
  var best=null,bd=-1;for(var a=0;a<nah.length;a++)for(var b=a+1;b<nah.length;b++){var d=ab(nah[a],nah[b]);if(d>bd&&frei(nah[a])&&frei(nah[b])&&Math.abs(nah[a][0]-nah[b][0])+Math.abs(nah[a][1]-nah[b][1])>4){bd=d;best=[nah[a],nah[b]]}}
  if(best){setzT(best[0]);setzT(best[1])}else if(nah.length&&frei(nah[0]))setzT(nah[0])});
 // dann reihum (nach Winkel um die Mitte) etwa alle TURM_AB Felder
 kand.sort(function(a,b){return Math.atan2(a[1]+1-cy,a[0]+1-cx)-Math.atan2(b[1]+1-cy,b[0]+1-cx)||a[1]-b[1]||a[0]-b[0]});
 kand.forEach(function(c){if(!frei(c))return;for(var t=0;t<tuerme.length;t++)if(ab(c,tuerme[t])<TURM_AB)return;setzT(c)});
 // Turm: alle 9 Felder auf der höchsten Ganghöhe darunter, danach wieder glätten (bis alles passt)
 // N6b2e1: Turmplattform = Wehrgang, TURM_H Stufen über dem Gang; glaetten() legt davor auf jeder Seite Rampenfelder (je Feld 1 Stufe)
 for(var rund=0;rund<8;rund++){var neu=false;tuerme.forEach(function(t){var m=0,q2;for(q2=0;q2<9;q2++){var k2=(t[1]+(q2/3|0))*W+t[0]+q2%3;m=Math.max(m,A[k2]===3?L[k2]-TURM_H:L[k2])}
   for(q2=0;q2<9;q2++){var kk=(t[1]+(q2/3|0))*W+t[0]+q2%3;A[kk]=3;if(L[kk]!==m+TURM_H){L[kk]=m+TURM_H;neu=true}}t[2]=m+TURM_H});
  // Liegt ein Gangfeld zwischen zwei Türmen (zwei Turmnachbarn eine Stufe höher), wird es eine flache Brücke auf Plattformhöhe statt eines Tals
  for(k=0;k<WW;k++){if(A[k]!==1&&A[k]!==2)continue;var nt=0,n4=N4(k);for(q=0;q<4;q++)if(n4[q]>=0&&A[n4[q]]===3&&L[n4[q]]===L[k]+1)nt++;if(nt>=2){L[k]++;neu=true}}
  if(!neu)break;glaetten()}
 // Treppen innen an den Türmen: 4 innere Mauerfelder in einer Reihe an der Ringgasse (gleicher Boden, Ganghöhe = Boden + 4), dahinter weiter Mauer,
 // am oberen Ende ein Gang- oder Turmfeld auf Ganghöhe. Fuß auf Höhe der Gasse, steigt je Feld 1 Stufe.
 var GEHW=/[somq]/,stufe=new Array(WW).fill('.'),treppen=[],bau=new Uint8Array(WW);
 P.bauten.forEach(function(b){if(b.rolle==='mauer')return;for(var y=b.j;y<b.j+b.h;y++)for(var x=b.i;x<b.i+b.w;x++)if(x>=0&&y>=0&&x<W&&y<W)bau[y*W+x]=1});
 var gasse=function(x,y){return x>=0&&y>=0&&x<W&&y<W&&!A[y*W+x]&&!bau[y*W+x]&&MK[y*W+x]&&GEHW.test(Z.charAt(y*W+x))};
 var lauf=function(i,j,d,e){var D=WRI[d],E=WRI[e],g0=lv(i,j),f=[];for(var s=0;s<4;s++){var x=i+D[0]*s,y=j+D[1]*s;if(x<0||y<0||x>=W||y>=W)return null;var kk=y*W+x;
   if(A[kk]!==1||lv(x,y)!==g0||L[kk]!==g0+WEHR_H||!gasse(x+E[0],y+E[1])||lv(x+E[0],y+E[1])!==g0)return null;
   var ox=x-E[0],oy=y-E[1];if(ox<0||oy<0||ox>=W||oy>=W||(A[oy*W+ox]!==1&&A[oy*W+ox]!==3))return null;f.push(kk)}
  var tx=i+D[0]*4,ty=j+D[1]*4;if(tx<0||ty<0||tx>=W||ty>=W)return null;var tk=ty*W+tx;if((A[tk]!==1&&A[tk]!==3)||L[tk]!==g0+WEHR_H)return null;
  // Rückmeldung Thomas (N6b2e1): oben eine Plattform: das Feld nach der letzten Stufe und die Mauerfelder daneben (quer über die Mauer) flach auf Ganghöhe,
  // ohne höheren Nachbarn (sonst würden sie Rampe); und keine Treppe stößt an eine andere Treppe oder Nische (auch in der Reihe daneben)
  if(A[tk]!==1)return null;for(var s2=0;s2<3;s2++){var px=tx-E[0]*s2,py=ty-E[1]*s2;if(px<0||py<0||px>=W||py>=W)return null;var pk=py*W+px;
   if(s2&&!A[pk])break;if((A[pk]!==1&&A[pk]!==2)||L[pk]!==g0+WEHR_H)return null;var nn2=N4(pk);
   for(var d2=0;d2<4;d2++){var b2=nn2[d2];if(b2>=0&&A[b2]&&A[b2]!==4&&A[b2]!==5&&L[b2]>g0+WEHR_H)return null}}
  for(var s3=-3;s3<=6;s3++)for(var e3=0;e3<2;e3++){var rx=i+D[0]*s3-E[0]*e3,ry=j+D[1]*s3-E[1]*e3;if(rx>=0&&ry>=0&&rx<W&&ry<W&&(A[ry*W+rx]===4||A[ry*W+rx]===5))return null}
  // N6b2e1: vor dem Fuß eine Nische (inneres Mauerfeld wird frei, außen läuft die Mauer weiter, seitlich die Gasse): man geht geradeaus auf die Treppe
  var bx=i-D[0],by=j-D[1];if(bx<0||by<0||bx>=W||by>=W)return null;var bk=by*W+bx;if(A[bk]!==1||lv(bx,by)!==g0||!gasse(bx+E[0],by+E[1])||lv(bx+E[0],by+E[1])!==g0)return null;
  var nx=bx-E[0],ny=by-E[1];if(nx<0||ny<0||nx>=W||ny>=W||(A[ny*W+nx]!==1&&A[ny*W+nx]!==3))return null;f.unshift(bk);return f};
 // Eine Treppe darf den Gang nicht zerschneiden (an dünnen Ecken ist die innere Reihe der einzige Weg): Zahl der Gangstücke vorher und nachher gleich
 var stuecke=function(){var seen=new Uint8Array(WW),c=0;for(var k0=0;k0<WW;k0++){if(!A[k0]||A[k0]===5||seen[k0])continue;c++;var st=[k0];seen[k0]=1;
   while(st.length){var a=st.pop(),nn=N4(a);for(var d=0;d<4;d++){var b=nn[d];if(b>=0&&A[b]&&A[b]!==5&&!seen[b]&&Math.abs(L[b]-L[a])<=1){seen[b]=1;st.push(b)}}}}return c};
 var c0=stuecke();
 var setzR=function(x,y,d,e,f){var g0=lv(x,y),alt=f.map(function(kk){return[A[kk],L[kk]]});f.forEach(function(kk,s){if(!s){A[kk]=5;L[kk]=g0;return}A[kk]=4;L[kk]=g0+s-1;stufe[kk]=d});
  if(stuecke()!==c0){f.forEach(function(kk,s){A[kk]=alt[s][0];L[kk]=alt[s][1];stufe[kk]='.'});return false}
  var nk=f[0],nx=nk%W,ny=(nk/W)|0;
  treppen.push({felder:f.slice(1).map(function(kk){return[kk%W,(kk/W)|0]}),s:d,nische:[nx,ny],gasse:[nx+WRI[e][0],ny+WRI[e][1]],unten:g0,oben:g0+WEHR_H});return true};
 tuerme.forEach(function(t){var kandT=[];
  for(var y=t[1]-6;y<=t[1]+8;y++)for(var x=t[0]-6;x<=t[0]+8;x++){if(x<0||y<0||x>=W||y>=W||A[y*W+x]!==1)continue;
   for(var a=0;a<4;a++)for(var b=0;b<4;b++){var d=WRK[a],e=WRK[b];if(WRI[d][0]===WRI[e][0]||WRI[d][1]===WRI[e][1])continue;
    var f=lauf(x,y,d,e);if(!f)continue;var ex=x+WRI[d][0]*4,ey=y+WRI[d][1]*4,dd=Math.max(0,t[0]-ex,ex-t[0]-2)+Math.max(0,t[1]-ey,ey-t[1]-2);
    if(dd<=3)kandT.push({f:f,d:d,e:e,x:x,y:y,dd:dd})}}
  kandT.sort(function(a,b){return a.dd-b.dd});for(var q2=0;q2<kandT.length;q2++){var c=kandT[q2];if(lauf(c.x,c.y,c.d,c.e)&&setzR(c.x,c.y,c.d,c.e,c.f))break}});
 // Wo der Gang zwischen Türmen ohne Treppe bleibt (schräge Mauerstücke, Fels): weitere Treppen an geraden Stücken, reihum mindestens TREPPE_AB Felder auseinander
 var mT=function(x,y){for(var t=0;t<treppen.length;t++){var f=treppen[t].felder[0];if(Math.hypot(f[0]-x,f[1]-y)<TREPPE_AB)return false}return true};
 var wk=[];for(k=0;k<WW;k++)if(A[k]===1)wk.push(k);wk.sort(function(a,b){return Math.atan2(((a/W)|0)-cy,a%W-cx)-Math.atan2(((b/W)|0)-cy,b%W-cx)||a-b});
 wk.forEach(function(kk){var x=kk%W,y=(kk/W)|0;if(A[kk]!==1||!mT(x,y))return;for(var a=0;a<4;a++)for(var b=0;b<4;b++){var d=WRK[a],e=WRK[b];if(WRI[d][0]===WRI[e][0]||WRI[d][1]===WRI[e][1])continue;
  var f=lauf(x,y,d,e);if(f&&mT(x,y)&&setzR(x,y,d,e,f))return}});
 // Stufen im Wehrgang (Burgberg): Feld steigt zum Nachbarn, der genau 1 höher ist
 for(k=0;k<WW;k++){if(A[k]!==1&&A[k]!==2)continue;var nn=N4(k);for(q=0;q<4;q++){var b=nn[q];if(b>=0&&A[b]&&A[b]!==4&&A[b]!==5&&L[b]===L[k]+1){stufe[k]=['o','s','w','n'][q];break}}}
 // N6b2e2a Halbfelder: ein freies Feld mit genau zwei Mauernachbarn an einer gemeinsamen Ecke (Stufe der 45°-Treppe) bekommt die halbe Mauer zu dieser Ecke
 // (Art d, Form = Ecke N/E/S/W im Raster: N −i−j, E +i−j, S +i+j, W −i+j), gleiche Höhe wie die Nachbarn, nicht begehbar (Gang nur auf ganzen Feldern).
 // Außen (außerhalb des Umrisses) mit Zinnen auf der Schräge. Nicht auf Gebäuden, Dingen und Wasser (Bäume vor der Mauer räumt schon mauerRund weg).
 var DG={};P.dinge.forEach(function(o){if(o.i>=0&&o.j>=0&&o.i<W&&o.j<W)DG[o.j*W+o.i]=1});
 var halb=0;
 for(k=0;k<WW;k++){if(A[k]||bau[k]||DG[k]||'wy'.indexOf(Z.charAt(k))>=0)continue;
  var hi=k%W,hj=(k/W)|0,w4=[hi<W-1&&A[k+1]===1,hj<W-1&&A[k+W]===1,hi>0&&A[k-1]===1,hj>0&&A[k-W]===1],nw4=w4.filter(Boolean).length;
  if(nw4!==2)continue;var form=w4[2]&&w4[3]?'N':w4[0]&&w4[3]?'E':w4[0]&&w4[1]?'S':w4[2]&&w4[1]?'W':null;if(!form)continue;
  var na=w4[0]?k+1:k-1,nb2=w4[1]?k+W:k-W;if(L[na]!==L[nb2]||stufe[na]!=='.'||stufe[nb2]!=='.')continue;
  A[k]=6;L[k]=L[na];stufe[k]=form;halb++}
 // Zinnen: Mauer und Tor an jeder Außenkante, Turm ringsum
 // Ablage nur der Mauerfelder (Kosten nach Mauerlänge, nicht nach Fläche): k = Feldnummern j·W + i (aufsteigend), f = je Feld 4 Zeichen Art, Ganghöhe, Stufe, Zinnen
 var KL=[],FS='',ART='.mtTrnd';for(k=0;k<WW;k++){if(!A[k])continue;var z=0,i3=k%W,j3=(k/W)|0;
  if(A[k]===6){if(!drin(i3,j3))z=1}   // Halbfeld: Bit 1 = Zinnen auf der Schräge (außen)
  else if(A[k]!==4&&A[k]!==5)WRK.forEach(function(d){var x=i3+WRI[d][0],y=j3+WRI[d][1],a=x>=0&&y>=0&&x<W&&y<W?A[y*W+x]:0;if(A[k]===3?(!a||a===5):(!a&&!drin(x,y)))z|=ZBIT[d]});
  KL.push(k);FS+=ART.charAt(A[k])+String.fromCharCode(48+L[k])+stufe[k]+z.toString(16)}
 P.wehr={W:W,k:KL,f:FS,tuerme:tuerme,treppen:treppen,tore:tore.length,felder:nw,halb:halb,hoehe:WEHR_H,turmHoehe:TURM_H}}
// Lesen der Wehr-Ablage: art(k) '.'/m/t/T/r, gang(k) Stufe oder −1, stufe(k), zinne(k) Bits; einmal je Ablage ein Verzeichnis Feld → Stelle
var WEHR_LS=typeof WeakMap!=='undefined'?new WeakMap():null;
function wehrLese(w){var x=WEHR_LS&&WEHR_LS.get(w);if(x)return x;var m=new Map(),f=w.f;for(var p=0;p<w.k.length;p++)m.set(w.k[p],p*4);
 x={n:w.k.length,art:function(k){var p=m.get(k);return p==null?'.':f.charAt(p)},gang:function(k){var p=m.get(k);return p==null?-1:f.charCodeAt(p+1)-48},
  stufe:function(k){var p=m.get(k);return p==null?'.':f.charAt(p+2)},zinne:function(k){var p=m.get(k);return p==null?0:parseInt(f.charAt(p+3),16)}};
 if(WEHR_LS)WEHR_LS.set(w,x);return x}
// Begehbarkeit (N6b2d): Nachbarn einer Fläche e ('boden' | 'gang' | 'turm') auf Feld (i, j) als [{i, j, e}]. Boden: begehbare Zellen ohne Gebäude, höchstens
// 1 Stufe Unterschied; Wehrgang: Nachbarn mit Gang, höchstens 1 Stufe; Übergänge nur ausdrücklich (Treppenfuß ↔ Gasse, Turmmitte ↔ Plattform).
var WEHR_IX=typeof WeakMap!=='undefined'?new WeakMap():null;
function wehrIndex(P){var x=WEHR_IX&&WEHR_IX.get(P);if(x)return x;var W=P.W,w=P.wehr,bau=new Uint8Array(W*W),fuss={},gas={},nis={},turm=new Map();
 P.bauten.forEach(function(b){if(b.rolle==='mauer')return;for(var y=b.j;y<b.j+b.h;y++)for(var x2=b.i;x2<b.i+b.w;x2++)if(x2>=0&&y>=0&&x2<W&&y<W)bau[y*W+x2]=1});
 if(w){w.treppen.forEach(function(t){var f=t.felder[0],v=t.nische||t.gasse;fuss[f[1]*W+f[0]]=v;gas[v[1]*W+v[0]]=f;if(t.nische)nis[v[1]*W+v[0]]=1});
  w.tuerme.forEach(function(t,ix){for(var q=0;q<9;q++)turm.set((t[1]+(q/3|0))*W+t[0]+q%3,ix)})}
 x={bau:bau,fuss:fuss,gas:gas,nis:nis,turm:turm};if(WEHR_IX)WEHR_IX.set(P,x);return x}
// N6b2e1: Turmplattformen sind Wehrgang (2 Stufen höher, Rampen davor), kein eigener Belag mehr; Nischen vor dem Treppenfuß sind Boden.
function wehrNachbarn(P,i,j,e){var W=P.W,w=P.wehr,X=wehrIndex(P),k=j*W+i,r=[],H=P.hoehe,Z=P.zellen;
 var lv=function(x,y){return H?H.charCodeAt(y*W+x)-48:0},R=w?wehrLese(w):null,gl=function(kk){var a=R?R.art(kk):'.';return R&&a!=='n'&&a!=='d'?R.gang(kk):-1};
 WRK.forEach(function(d){var x=i+WRI[d][0],y=j+WRI[d][1];if(x<0||y<0||x>=W||y>=W)return;var q=y*W+x;
  if(e==='boden'){if(((!X.bau[q]&&/[somqy]/.test(Z.charAt(q)))||X.nis[q])&&Math.abs(lv(x,y)-lv(i,j))<=1)r.push({i:x,j:y,e:'boden'})}
  else if(e==='gang'){if(gl(k)>=0&&gl(q)>=0&&Math.abs(gl(q)-gl(k))<=1)r.push({i:x,j:y,e:'gang'})}});
 if(w){if(e==='boden'&&X.gas[k])r.push({i:X.gas[k][0],j:X.gas[k][1],e:'gang'});
  if(e==='gang'&&X.fuss[k])r.push({i:X.fuss[k][0],j:X.fuss[k][1],e:'boden'})}
 return r}
// Fassungen loser Dinge (Thomas 22.11.2026): Lagerplatz in 6 Fassungen, nach Lage gewürfelt. 16 Plätze: Grundbild 4×, ruhige a/b/c je 3×, schwarzhumorige d 2×, e 1×.
var DING_VAR={'lager-platz':'0000aaabbbcccdde'};
function dingWahl(id,i,j){var v=DING_VAR[id];if(!v)return id;var c=v.charAt(Math.floor(rausch(i,j,hashT(id))*v.length));return c==='0'?id:id+'-'+c}
var WOHN={townhouse:1,domus:1,villa:1,palazzo:1,tenement:1,cottage:1};
// N6b2c3 (Thomas 22.11.2026): Stinktor (stinkendes Gewerbe, Elendsbuden als wilder Haufen an der Mauer) und Gräberstraße wie die Via Appia (Bestatter, Grabhäuschen
// an der Straße, Friedhof mit Grabhäuschen) an zwei verschiedenen Toren aus dem Seed; Gehöfte an den Ausfallstraßen. Vorschläge: 1 Grabhäuschen je GRAB_JE Einwohner
// (höchstens GRAB_MAX), 1 zusätzlicher Hof je HOF_JE Einwohner (Felder und Herden abwechselnd, Arten aus dem Biom). Olivenhain und Obstgarten mit Bäumen, Felder Feldboden,
// Herden Weide (p); Zäune, Rebstöcke und Tiere mit N6b4.
var TOTE={cemetery:1,undertaker:1,'coffin-maker':1,'tear-press':1},HAIN={'olive-grove':'baum-olive',orchard:'baum-apfel'},GRAB_JE=400,GRAB_MAX=40,HOF_JE=1000,
 SEITE=['south','north','east','west'],SPIEGEL={south:'east',east:'south',north:'west',west:'north'};
// Maßstab (N6b2b1, E31): Plan in Planfeldern → Bildfelder ×F. Feld (I, J) gehört zu Planfeld (⌊I/F⌋, ⌊J/F⌋), Bau [i, i+w) → [r(i), r(i+w)) mit r = runden(·F);
// Rundbauten bleiben quadratisch (kleinere Seite), Türen sitzen wieder mittig an derselben Seite, Dinge auf dem ersten Feld ihres Planfelds.
function skalieren(P,F){var r=function(v){return Math.floor(v*F+.5)},W=P.W,N=r(W),z='',I,J;
 var zh='',zt='';for(J=0;J<N;J++)for(I=0;I<N;I++){var q=Math.min(W-1,Math.floor(J/F))*W+Math.min(W-1,Math.floor(I/F));z+=P.zellen.charAt(q);if(P.hoehe)zh+=P.hoehe.charAt(q);if(P.mauertor)zt+=P.mauertor.charAt(q)}
 var Q=JSON.parse(JSON.stringify(P));Q.W=N;Q.planW=W;Q.mass=F;Q.zellen=z;if(P.hoehe)Q.hoehe=zh;if(P.mauertor)Q.mauertor=zt;
 Q.bauten=P.bauten.map(function(b){var o=JSON.parse(JSON.stringify(b)),i=r(b.i),j=r(b.j),w=r(b.i+b.w)-i,h=r(b.j+b.h)-j;if(b.rund){w=h=Math.min(w,h)}
  o.i=i;o.j=j;o.w=w;o.h=h;if(b.tuer){var di=b.tuer[2],dj=b.tuer[3];o.tuer=dj>0?[i+(w>>1),j+h-1,0,1]:dj<0?[i+(w>>1),j,0,-1]:di>0?[i+w-1,j+(h>>1),1,0]:[i,j+(h>>1),-1,0];
   // Führt die mittige Tür im Bild vor ein anderes Planfeld als im Plan (Monument nicht mittig im Platz), sitzt sie vor demselben Planfeld wie im Plan (N6b2c4a2)
   if(Math.floor((o.tuer[0]+di)/F)!==b.tuer[0]+di||Math.floor((o.tuer[1]+dj)/F)!==b.tuer[1]+dj){if(dj!==0){var a1=r(b.tuer[0]),e1=r(b.tuer[0]+1)-1;o.tuer[0]=Math.max(i,Math.min(i+w-1,(a1+e1)>>1))}
    else{var a2=r(b.tuer[1]),e2=r(b.tuer[1]+1)-1;o.tuer[1]=Math.max(j,Math.min(j+h-1,(a2+e2)>>1))}}}return o});
 Q.dinge=P.dinge.map(function(d){var o=JSON.parse(JSON.stringify(d));o.i=r(d.i);o.j=r(d.j);return o});
 Q.tor=P.tor.i===W-1&&P.tor.j!==W-1?{i:N-1,j:r(P.tor.j)}:{i:r(P.tor.i),j:r(P.tor.j+1)-1};return Q}   // Tor am Süd- oder (N6b2c4a2) Ostrand
function spiegeln(P){var W=P.W,z='',zh='',zt='',i,j;for(j=0;j<W;j++)for(i=0;i<W;i++){z+=P.zellen[i*W+j];if(P.hoehe)zh+=P.hoehe[i*W+j];if(P.mauertor)zt+=P.mauertor[i*W+j]}
 var N=JSON.parse(JSON.stringify(P));N.zellen=z;if(P.hoehe)N.hoehe=zh;if(P.mauertor)N.mauertor=zt;N.gespiegelt=!P.gespiegelt;
 N.bauten=P.bauten.map(function(b){var o=JSON.parse(JSON.stringify(b));o.i=b.j;o.j=b.i;o.w=b.h;o.h=b.w;o.achse=b.achse==='i'?'j':'i';if(b.tuer)o.tuer=[b.tuer[1],b.tuer[0],b.tuer[3],b.tuer[2]];return o});
 N.dinge=P.dinge.map(function(d){var o=JSON.parse(JSON.stringify(d));o.i=d.j;o.j=d.i;return o});N.tor={i:P.tor.j,j:P.tor.i};
 if(N.aussen){N.aussen.stinktor=SPIEGEL[N.aussen.stinktor];N.aussen.graebertor=SPIEGEL[N.aussen.graebertor];if(N.aussen.tore)N.aussen.tore=N.aussen.tore.map(function(x){return SPIEGEL[x]})}
 if(N.umriss)N.umriss.tore=N.umriss.tore.map(function(x){return SPIEGEL[x]});if(N.fluss)N.fluss.achse=N.fluss.achse==='ns'?'ow':'ns';if(N.kueste)N.kueste.seite=SPIEGEL[N.kueste.seite];return N}
// Drehen um 90° (Blick von der nächsten Seite, für First Person): Zelle (i, j) → (W−1−j, i), Richtung (di, dj) → (−dj, di)
function drehen(P){var W=P.W,z=new Array(W*W),zh=P.hoehe?new Array(W*W):null,zt=P.mauertor?new Array(W*W):null,i,j;for(j=0;j<W;j++)for(i=0;i<W;i++){z[i*W+(W-1-j)]=P.zellen[j*W+i];if(zh)zh[i*W+(W-1-j)]=P.hoehe[j*W+i];if(zt)zt[i*W+(W-1-j)]=P.mauertor[j*W+i]}
 var N=JSON.parse(JSON.stringify(P));N.zellen=z.join('');if(zh)N.hoehe=zh.join('');if(zt)N.mauertor=zt.join('');
 N.bauten=P.bauten.map(function(b){var o=JSON.parse(JSON.stringify(b));o.i=W-b.j-b.h;o.j=b.i;o.w=b.h;o.h=b.w;o.achse=b.achse==='i'?'j':'i';
  if(b.tuer)o.tuer=[W-1-b.tuer[1],b.tuer[0],-b.tuer[3],b.tuer[2]];return o});
 N.dinge=P.dinge.map(function(d){var o=JSON.parse(JSON.stringify(d));o.i=W-1-d.j;o.j=d.i;return o});N.tor={i:W-1-P.tor.j,j:P.tor.i};
 if(P.wehr)N.wehr=wehrDrehen(P.wehr,W);return N}
// Wehr (N6b2d) mitdrehen: Zeichenketten wie die Zellen, Richtungen (di, dj) → (−dj, di): s → w, o → s, n → o, w → n
var DREH={s:'w',o:'s',n:'o',w:'n','.':'.',N:'E',E:'S',S:'W',W:'N'};   // N6b2e2a: Halbfeld-Ecken drehen mit
function wehrDrehen(w,W){var r=JSON.parse(JSON.stringify(w)),L=[];
 w.k.forEach(function(k,p){var i=k%W,j=(k/W)|0,b=parseInt(w.f.charAt(p*4+3),16),n=0;if(w.f.charAt(p*4)==='d')n=b;else WRK.forEach(function(d){if(b&ZBIT[d])n|=ZBIT[DREH[d]]});
  L.push([i*W+(W-1-j),w.f.charAt(p*4)+w.f.charAt(p*4+1)+DREH[w.f.charAt(p*4+2)]+n.toString(16)])});
 L.sort(function(a,b){return a[0]-b[0]});r.k=L.map(function(x){return x[0]});r.f=L.map(function(x){return x[1]}).join('');
 r.tuerme=w.tuerme.map(function(t){return[W-t[1]-3,t[0],t[2]]});var p=function(a){return[W-1-a[1],a[0]]};
 r.treppen=w.treppen.map(function(t){var o={felder:t.felder.map(p),s:DREH[t.s]};if(t.nische)o.nische=p(t.nische);o.gasse=p(t.gasse);o.unten=t.unten;o.oben=t.oben;return o});return r}

// ---------- Malen ----------
var MERK=typeof WeakMap!=='undefined'?new WeakMap():null;
function malbild(o){var b=o&&o.bild;if(!b)return null;var m=MERK&&MERK.get(o);if(m)return m;var Zs=S().ZEICHEN,px=new Uint8Array(b.w*b.h).fill(LEER),y,x;
 for(y=0;y<b.h;y++){var z=b.z[y];for(x=0;x<b.w;x++){var ch=z.charAt(x);if(ch!=='.')px[y*b.w+x]=Zs.indexOf(ch)}}
 var r={w:b.w,h:b.h,ax:b.ax,ay:b.ay,px:px};if(MERK)MERK.set(o,r);return r}
function blit(Z,sp,X,Y){var x0=X-sp.ax,y0=Y-sp.ay,y,x;for(y=0;y<sp.h;y++){var ty=y0+y;if(ty<0||ty>=Z.h)continue;var zo=ty*Z.w,so=y*sp.w;
  for(x=0;x<sp.w;x++){var n=sp.px[so+x];if(n===LEER)continue;var tx=x0+x;if(tx>=0&&tx<Z.w)Z.px[zo+tx]=n}}}
// Teile mit Farbtausch: Kopie des Kartei-Objekts mit umgefärbtem Bild, einmal je Kennung und Tausch gemerkt
var HOLER=typeof WeakMap!=='undefined'?new WeakMap():null;
function holer(hole){var bk=BK(),cache=(HOLER&&HOLER.get(hole))||{};if(HOLER)HOLER.set(hole,cache);
 return function(id,K,wand,dachR){var o=hole(id);if(!o||(wand==null&&dachR==null)||id.indexOf('bk-')!==0)return o;var k=bk.klasse(K),istDach=id.indexOf('-dach-')>0,
  paar=istDach?(dachR!=null?[k.dachReihe,dachR]:null):/-(wand|tuer|giebel)/.test(id)&&wand!=null?[k.wandReihe,wand]:null;if(!paar)return o;
  var key=id+'|'+paar.join(',');if(!cache[key])cache[key]={id:o.id,kat:o.kat,bild:bk.umfaerben(o.bild,paar)};return cache[key]}}
var BODEN_ID={s:null,o:null,m:'bk-marmor-boden',f:null,w:'boden-fluss',e:'boden-erde',p:'boden-gras',x:'boden-fels'};
// Offenes Wasser (Thomas 22.11.2026): boden-fluss statt der Wasserstelle, nahtlos; Fassungen nach Lage: ruhig 0/a/b (5:5:4), selten Fass (c) und tote Ratte (d) je 1 von 128
var FLUSS_VAR=['boden-fluss','boden-fluss-a','boden-fluss-b','boden-fluss-c','boden-fluss-d'];
function flussWahl(i,j,seed){var u=rausch(i,j,seed+77);if(u<1/128)return FLUSS_VAR[3];if(u<2/128)return FLUSS_VAR[4];u=(u-2/128)/(1-2/128)*14;return FLUSS_VAR[u<5?0:u<10?1:2]}
var KURZ={'clay-wood':'lehm',brick:'ziegel',marble:'marmor'};
// Zeichenreihenfolge für Grundflächen ohne Überlappung (Thomas 21.11.2026: Sortieren nach der Mitte i + j ließ bei langen Häusern Wände über das Dach des
// Nachbarn malen). A kommt vor B, wenn A ganz bei kleinerem i (bzw. j) liegt und sich die Bildrahmen beider überlagern; sonst Mitte i + j (Kahn-Sortierung).
// Paare nur aus gemeinsamen Bildfächern (128 × 128) mit mindestens einer großen Grundfläche; in Schritten (Regel 20), Kosten nach Zahl der Elemente.
function ordner(el){var n=el.length,RI=new Int32Array(n),RJ=new Int32Array(n),RW=new Int32Array(n),RH=new Int32Array(n),X0=new Int32Array(n),X1=new Int32Array(n),Y0=new Int32Array(n),Y1=new Int32Array(n),
  F=new Map(),FS=128,ein=new Int32Array(n),kopf=new Int32Array(n).fill(-1),nxt=[],zu=[],heap=[],liste=[],phase=0,k=0,c=0;
 var vor=function(a,b){return el[a].t-el[b].t||el[a].n-el[b].n};
 function rein(v){heap.push(v);var c2=heap.length-1;while(c2>0){var p=(c2-1)>>1;if(vor(heap[c2],heap[p])<0){var t=heap[c2];heap[c2]=heap[p];heap[p]=t;c2=p}else break}}
 function raus(){var top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;var c2=0;for(;;){var l=2*c2+1,r=l+1,m=c2;if(l<heap.length&&vor(heap[l],heap[m])<0)m=l;if(r<heap.length&&vor(heap[r],heap[m])<0)m=r;if(m===c2)break;var t=heap[c2];heap[c2]=heap[m];heap[m]=t;c2=m}}return top}
 function kante(a,b){zu.push(b);nxt.push(kopf[a]);kopf[a]=zu.length-1;ein[b]++}
 function paar(a,b){
  if(RI[a]+RW[a]<=RI[b]&&!(RJ[b]+RH[b]<=RJ[a]))kante(a,b);else if(RI[b]+RW[b]<=RI[a]&&!(RJ[a]+RH[a]<=RJ[b]))kante(b,a);
  else if(RJ[a]+RH[a]<=RJ[b]&&!(RI[b]+RW[b]<=RI[a]))kante(a,b);else if(RJ[b]+RH[b]<=RJ[a]&&!(RI[a]+RW[a]<=RI[b]))kante(b,a)}
 var fach=function(fx,fy){return(fx+32768)*65536+fy+32768},gr=function(q){return RW[q]>1||RH[q]>1};
 // weiter(aus): arbeitet, bis aus() einen vollen Zeitanteil meldet (→ false) oder alles fertig ist (→ true, Ergebnis in .liste)
 var O={liste:null,weiter:function(aus){for(;;){
  if(phase===0){for(;k<n;k++){var e=el[k],b=e.b,i,j,w,h;if(!b){i=e.d.i;j=e.d.j;w=1;h=1}else if(b.rund){i=b.i-1;j=b.j-1;w=b.w+2;h=b.w+2}else{i=b.i;j=b.j;w=b.w;h=b.h}
     RI[k]=i;RJ[k]=j;RW[k]=w;RH[k]=h;X0[k]=(i-j-h)*32;X1[k]=(i+w-j)*32;Y0[k]=(i+j)*16-hoch(b)-((b||e.d).hz|0)*HSTUFE;Y1[k]=(i+w+j+h)*16;
     if(w>1||h>1){for(var fy=Math.floor(Y0[k]/FS);fy<=Math.floor((Y1[k]-1)/FS);fy++)for(var fx=Math.floor(X0[k]/FS);fx<=Math.floor((X1[k]-1)/FS);fx++){var L=F.get(fach(fx,fy));if(!L)F.set(fach(fx,fy),L=[]);L.push(k)}}
     if((++c&127)===0&&aus&&aus()){k++;return false}}phase=1;k=0}
  else if(phase===1){for(;k<n;k++){var ga=gr(k),fy0=Math.floor(Y0[k]/FS),fx0=Math.floor(X0[k]/FS);
     for(var fy2=fy0;fy2<=Math.floor((Y1[k]-1)/FS);fy2++)for(var fx2=fx0;fx2<=Math.floor((X1[k]-1)/FS);fx2++){var L2=F.get(fach(fx2,fy2));if(!L2)continue;
      for(var q=0;q<L2.length;q++){var o=L2[q];if(o===k||(ga&&o<k))continue;                 // Paar groß–groß nur einmal
       if(X1[k]<=X0[o]||X1[o]<=X0[k]||Y1[k]<=Y0[o]||Y1[o]<=Y0[k])continue;
       if(Math.max(fy0,Math.floor(Y0[o]/FS))!==fy2||Math.max(fx0,Math.floor(X0[o]/FS))!==fx2)continue;paar(k,o)}}   // nur im ersten gemeinsamen Fach
     if((++c&31)===0&&aus&&aus()){k++;return false}}phase=2;k=0;for(var z=0;z<n;z++)if(!ein[z])rein(z)}
  else if(phase===2){while(heap.length){var v=raus();liste.push(el[v]);for(var x=kopf[v];x>=0;x=nxt[x])if(!--ein[zu[x]])rein(zu[x]);if((++c&127)===0&&aus&&aus())return false}phase=3}
  else{if(liste.length<n){var da={};liste.forEach(function(e2){da[e2.n]=1});el.filter(function(e2){return!da[e2.n]}).sort(function(a2,b2){return a2.t-b2.t||a2.n-b2.n}).forEach(function(e2){liste.push(e2)})}
   O.liste=liste;return true}}}};
 return O}
function ordnen(el){var O=ordner(el);O.weiter(null);return O.liste}
// Elementliste (N6b2-0), gemeinsam für bauer() und kachelBauer(): P = Plan, hole(id) → Kartei-Objekt, opt {umland: Felder Landschaft ringsum}.
// Reihenfolge wie bisher: Boden je Feld (hinten zuerst), dann Häuser, Mauerstücke, Rundbauten, Dinge, Umland-Bäume nach Tiefe. Rohbild w × h mit Anker (ax, ay) = obere Ecke von Feld (0, 0).
function elemente(P,hole,opt){opt=opt||{};var bk=BK(),B=BIOME[P.biom],W=P.W,U=Math.max(0,opt.umland|0),WT=W+2*U,teil=holer(hole);
 var gmax=1;P.bauten.forEach(function(b){if((b.g|0)>gmax)gmax=b.g|0});var HZ=P.hoehe||null,HMAX=(P.huegel?P.huegel.stufen:0)+(P.wehr?WEHR_H+TURM_H+1:0),TOP=176+HOCH_PLUS+(gmax-1)*GH+HMAX*HSTUFE;   // + Mauer und Türme (N6b2d)   // Platz oben für Geschosse (N6b2b1) und Burgberg (N6b2c4c3)
 var Zw=WT*64+64,Zh=WT*32+TOP+8,OX=WT*32+32,OY=TOP;
 // Bildlage eines Felds (i, j) im Plan (Umland hat negative bzw. zu große Zahlen): Ecke oben = ((i−j)·32, (i+j)·16)
 var bx=function(i,j){return OX+(i-j)*32},by=function(i,j){return OY+(i+U+j+U)*16};
 var weg=P.basis&&KURZ[P.basis.klasse]?'bk-'+KURZ[P.basis.klasse]+'-boden':'boden-weg';
 var bodenId=function(i,j){var innen=i>=0&&j>=0&&i<W&&j<W,c=innen?P.zellen.charAt(j*W+i):'g';
  if(c==='g'){var l=B.boden;return l[Math.floor(rausch(i,j,P.seed+1)*l.length*(l.length>1?.75:1))%l.length]}
  if(c==='s')return B.weg;if(c==='o')return weg;if(c==='f'||c==='k')return P.feld||'bk-feld';if(c==='w')return flussWahl(i,j,P.seed);if(c==='q')return weg;if(c==='y')return flussWahl(i,j,P.seed);if(c==='u')return 'boden-sand';return BODEN_ID[c]||'boden-gras'};
 var O3=null,L=[],el=[],n=0,stufe=0,qs=-U,qi=-U,qk=0,uj=-U,ui=-U,HL=[],UNTER=null;
 // Burgberg (N6b2c4c3): Felder auf oder neben dem Hügel werden beim Boden gesammelt und als eigene Elemente gehoben gemalt (Felskanten, Boden, Treppen);
 // unter Gebäuden nur die Felskanten (der Boden läge in der Zeichenreihenfolge sonst über den Wänden)
 var lv=function(i,j){return HZ&&i>=0&&j>=0&&i<W&&j<W?HZ.charCodeAt(j*W+i)-48:0},GEH=/[somq]/,TR=[[0,1,'s'],[1,0,'o'],[0,-1,'n'],[-1,0,'w']];
 var huegelEl=function(i,j){var l=lv(i,j),c=P.zellen.charAt(j*W+i),tr=null,s,dz=function(id,z){el.push({t:i+j+.01,n:n++,d:{id:id,i:i,j:j,hz:z}})};
  if(GEH.test(c))for(var q=0;q<4&&!tr;q++){var x=i+TR[q][0],y=j+TR[q][1];if(x>=0&&y>=0&&x<W&&y<W&&GEH.test(P.zellen.charAt(y*W+x))&&lv(x,y)===l+1)tr='fels-treppe-'+TR[q][2]}
  if(!l&&!tr)return;
  for(s=lv(i+1,j)+1;s<=l;s++)dz('fels-kante-i',s);for(s=lv(i,j+1)+1;s<=l;s++)dz('fels-kante-j',s);
  if(tr)dz(tr,l);else if(!UNTER||!UNTER[j*W+i])dz(c==='g'||c==='x'?(rausch(i>>1,j>>1,P.seed+93)<.6?'boden-fels':B.boden[Math.floor(rausch(i>>1,j>>1,P.seed+1)*B.boden.length)]):bodenId(i,j),l)};
 // Mauer, Tore, Türme, Treppen (N6b2d): je Feld Wandstücke an den Vorderkanten (eine Stufe je Teil, vom höheren Boden bzw. Nachbarn bis oben), Turmtür, wo der
 // Wehrgang hineinführt (2 Stufen), Sturz über Toren, oben Wehrgang oder Stufe, dann Zinnen. Unter der Mauer malt der Burgberg seine Felskanten.
 var wehrEls=function(w){var R=wehrLese(w),gA=function(x,y){return x>=0&&y>=0&&x<W&&y<W?R.art(y*W+x):'.'},gL=function(x,y){return R.gang(y*W+x)};
  var NG={};w.treppen.forEach(function(t){if(t.nische)NG[t.nische[1]*W+t.nische[0]]=t.gasse});var TM=new Map();w.tuerme.forEach(function(t,ix){for(var q=0;q<9;q++)TM.set((t[1]+(q/3|0))*W+t[0]+q%3,ix)});   // Tür nur in der Mitte der Turmseite
  // N6b2e1: Turm = Gang + TURM_H (in der Ablage), Rampen davor; eine Rampe deckt die Wand des höheren Nachbarn, in den sie hinaufführt
  var oben=function(x,y){var a=gA(x,y);if(a==='.'||a==='t'||a==='n')return lv(x,y);return gL(x,y)},GEG={o:'w',s:'n'};
  w.k.forEach(function(k){var i=k%W,j=(k/W)|0,a=R.art(k),L0=R.gang(k),g0=lv(i,j),top=L0,t0=i+j+.02,s;
   var dz=function(id,z){el.push({t:t0,n:n++,d:{id:id,i:i,j:j,hz:z}})};
   if(a==='n'){var gs=NG[k];dz(gs?bodenId(gs[0],gs[1]):B.weg,g0);return}   // Nische vor dem Treppenfuß: Boden der Gasse daneben
   if(a==='d'){var fo=HALB[R.stufe(k)];if(fo==='ob')for(s=g0+1;s<=top;s++)dz(halbWahl('mauer-halb-wand',i,j+s*7,P.seed,WAND_VAR),s);   // N6b2e2a: nur die Schräge der oberen Hälfte zeigt zum Betrachter
    dz('mauer-halb-'+fo,top);if(R.zinne(k))dz(fo==='ob'?halbWahl('mauer-halb-zinne-ob',i,j,P.seed):'mauer-halb-zinne-'+fo,top);return}
   [['o','i'],['s','j']].forEach(function(q){var x=i+WRI[q[0]][0],y=j+WRI[q[0]][1],nb=oben(x,y),na=gA(x,y);
    if(a==='t'){if(nb<L0)dz('tor-sturz-'+q[1],L0);return}
    if((na==='m'||na==='t')&&R.stufe(y*W+x)===GEG[q[0]]&&nb===top-1)return;   // Rampe davor steigt bis an die Kante
    for(s=Math.max(nb,g0)+1;s<=top;s++)dz(a==='T'?(s===top?'turm-scharte-':'turm-kante-')+q[1]:'mauer-kante-'+q[1],s)});
   var st=R.stufe(k);dz(a==='r'?'fels-treppe-'+st:a!=='T'&&st!=='.'?'mauer-rampe-'+st:'mauer-gang',top);
   var zb=R.zinne(k);if(zb)['n','w','o','s'].forEach(function(d){if(zb&ZBIT[d])dz(zinneWahl(d,i,j,P.seed),top)})})};
 // Liste füllen, auf Wunsch in Schritten: aus() → true, wenn der Zeitanteil um ist (Kachelbauer); bauer() füllt am Stück wie bisher
 var fuellen=function(aus){var c=0;while(stufe<5){
   if(stufe===0){for(;qs<=2*(W-1)+U;qs++,qi=-U){for(;qi<W+U;qi++){var j=qs-qi;if(j<-U||j>=W+U)continue;L.push({k:0,id:bodenId(qi,j),X:bx(qi,j),Y:by(qi,j)+16});
      if(HZ&&qi>=0&&j>=0&&qi<W&&j<W&&(lv(qi,j)||lv(qi+1,j)||lv(qi-1,j)||lv(qi,j+1)||lv(qi,j-1)))HL.push(j*W+qi);
      if((++c&255)===0&&aus&&aus()){qi++;return false}}}stufe=1}
   else if(stufe===1){var WE=P.wehr;P.bauten.forEach(function(b){if(WE&&b.rolle==='mauer')return;el.push({t:b.i+b.j+(b.w+b.h)/2,n:n++,b:b})});if(WE)wehrEls(WE);P.dinge.forEach(function(d){el.push({t:d.i+d.j+1.02,n:n++,d:d})});if(HL.length){UNTER=new Uint8Array(W*W);P.bauten.forEach(function(b){for(var y=Math.max(0,b.j);y<Math.min(W,b.j+b.h);y++)for(var x=Math.max(0,b.i);x<Math.min(W,b.i+b.w);x++)UNTER[y*W+x]=1})}
   HL.forEach(function(k){huegelEl(k%W,(k/W)|0)});HL=null;stufe=U?2:3;if(aus&&aus())return false}
   else if(stufe===2){for(;uj<W+U;uj++,ui=-U){for(;ui<W+U;ui++){if(ui>=0&&uj>=0&&ui<W&&uj<W)continue;
      if(rausch(ui,uj,P.seed+21)<B.dichte*(1+.15*Math.max(ui<0?-ui:ui-W+1,uj<0?-uj:uj-W+1)))el.push({t:ui+uj+1.02,n:n++,d:{id:B.baeume[Math.floor(rausch(ui,uj,P.seed+22)*B.baeume.length)],i:ui,j:uj}})}}stufe=3}
   else if(stufe===3){if(!O3)O3=ordner(el);if(!O3.weiter(aus))return false;el=O3.liste;O3=null;stufe=4;if(aus&&aus())return false}
   else{for(;qk<el.length;qk++){var e=el[qk];if(e.d)L.push({k:1,id:e.d.id,X:bx(e.d.i,e.d.j),Y:by(e.d.i,e.d.j)+16-(e.d.hz|0)*HSTUFE});
      else{var b=e.b,ox=b.rund?b.i-1:b.i,oy=b.rund?b.j-1:b.j,fw=b.w,fh=b.h;if(b.rund){var R=bk.bilde('rund',b.w,b.w,b.klasse);fw=R.w;fh=R.h}L.push({k:2,b:b,X:bx(ox,oy),Y:by(ox,oy)-(b.hz|0)*HSTUFE,fw:fw,fh:fh})}
      if((++c&255)===0&&aus&&aus()){qk++;return false}}el=null;stufe=5}}return true};
 if(!opt.inSchritten)fuellen(null);
 // Gebäude zusammensetzen (Baukasten); N6b: Teile des Biom-Satzes (bk-putz-…) vor den Klassenteilen, fehlt eins, gilt das Klassenteil
 var bauBild=function(e){var b=e.b,R;
  if(b.rund){R=bk.bilde('rund',b.w,b.w,b.klasse);R.dinge=[];R.tueren=[]}
  else R={w:b.w,h:b.h,c:new Array(b.w*b.h).fill('b'),klasse:b.klasse,achse:b.achse,dach:b.dach||'sattel',offen:false,tueren:b.tuer?[[b.tuer[0]-b.i,b.tuer[1]-b.j,b.tuer[2],b.tuer[3]]]:[],spina:[],dinge:[],geschosse:b.g||1};
  var vs=b.satz?'bk-'+KURZ[b.klasse]+'-':null;
  var r=bk.setzen(R,function(id){if(vs&&id.indexOf(vs)===0){var o=hole('bk-'+b.satz+'-'+id.slice(vs.length));if(o)return o}return teil(id,b.klasse,b.wand,b.dachR)},b.dach||'',true);
  return{sp:{w:r.w,h:r.h,ax:r.ax,ay:r.ay,px:r.px},X:e.X,Y:e.Y,fehlt:r.fehlt,teile:r.teile}};
 return{w:Zw,h:Zh,ax:bx(0,0),ay:by(0,0),bx:bx,by:by,W:W,U:U,L:L,hole:hole,bauBild:bauBild,fuellen:fuellen,voll:function(){return stufe===5}}}
// Nach Tiefe sortieren wie sort(t, dann n), aber linear: alle Tiefen sind Vielfache von 1/50 (i + j + (w + h)/2 bzw. + 1,02), Zählsortierung ist stabil (n steigt schon)
// tiefenSort: frühere Reihenfolge nach der Mitte (seit 21.11.2026 ersetzt durch ordnen(), lange Häuser malten sonst Wände über Nachbardächer)
function tiefenSort(el){var N=el.length,key=new Int32Array(N),lo=2147483647,hi=-2147483648,i;for(i=0;i<N;i++){var k=Math.round(el[i].t*50);key[i]=k;if(k<lo)lo=k;if(k>hi)hi=k}
 if(!N)return el;var z=new Int32Array(hi-lo+2);for(i=0;i<N;i++)z[key[i]-lo+1]++;for(i=1;i<z.length;i++)z[i]+=z[i-1];var r=new Array(N);for(i=0;i<N;i++)r[z[key[i]-lo]++]=el[i];return r}
// Ein Element ins Ziel Z zeichnen, Ziel liegt bei (dx, dy) im Rohbild; bau(e) liefert ein gemerktes Gebäudebild (Kachelbauer), sonst neu zusammengesetzt
function zeichne(E,e,Z,dx,dy,fehlt,bau){if(e.k<2){var sp=malbild(E.hole(e.id));if(!sp){fehlt[e.id]=1;return 0}blit(Z,sp,e.X-dx,e.Y-dy);return 1}
 var r=bau?bau(e):E.bauBild(e);r.fehlt.forEach(function(f){fehlt[f]=1});blit(Z,r.sp,r.X-dx,r.Y-dy);return r.teile}
var jetzt=typeof performance!=='undefined'?function(){return performance.now()}:function(){var t=process.hrtime();return t[0]*1e3+t[1]/1e6};
// Bauer: ganzes Bild am Stück in Schritten. schritt(ms) → true, wenn fertig; bild() → {w,h,ax,ay,px,…}. Für große Orte kachelBauer() nehmen (Speicher!).
function bauer(P,hole,opt){var E=elemente(P,hole,opt),Zb={w:E.w,h:E.h,px:new Uint8Array(E.w*E.h).fill(LEER)},fehlt={},teile=0,k=0,ms=0,maxMs=0,schritte=0,L=E.L;
 return{auftraege:L.length,
  schritt:function(budget){var t0=jetzt();if(k>=L.length)return true;do{teile+=zeichne(E,L[k++],Zb,0,0,fehlt)}while(k<L.length&&jetzt()-t0<(budget||4));var d=jetzt()-t0;ms+=d;if(d>maxMs)maxMs=d;schritte++;return k>=L.length},
  fertig:function(){return k>=L.length},
  bild:function(){var x0=Zb.w,x1=-1,y0=Zb.h,y1=-1,x,y;for(y=0;y<Zb.h;y++){var o=y*Zb.w;for(x=0;x<Zb.w;x++)if(Zb.px[o+x]!==LEER){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}
   if(x1<0)return{w:0,h:0,ax:0,ay:0,px:new Uint8Array(0),teile:0,fehlt:Object.keys(fehlt),ms:ms,maxMs:maxMs,schritte:schritte};
   var w=x1-x0+1,h=y1-y0+1,px=new Uint8Array(w*h);for(y=0;y<h;y++)px.set(Zb.px.subarray((y+y0)*Zb.w+x0,(y+y0)*Zb.w+x0+w),y*w);
   // Anker: obere Ecke des Felds (0, 0) im Plan; tor: Bildpunkt vor dem Tor (Ziel der Straßen, N7a); x0/y0: Lage des Ausschnitts im Rohbild (= Kachelbauer)
   var T=P.tor;return{w:w,h:h,ax:E.ax-x0,ay:E.ay-y0,px:px,teile:teile,fehlt:Object.keys(fehlt),ms:ms,maxMs:maxMs,schritte:schritte,
    tor:{x:E.bx(T.i,T.j)-x0,y:E.by(T.i,T.j)+32-y0},W:E.W,umland:E.U,x0:x0,y0:y0}}}}
// Kachelbauer (N6b2-0, Thomas 21.11.2026): baut und hält nur die Kacheln (K × K, Standard 256), die im Bild sind, plus einen Ring Vorrat; der Rest wird verworfen.
// Speicher: höchstens opt.grenze Kacheln (Standard 32 ≈ 2 MB) und opt.hausSpeicher Bytes gemerkte Gebäudebilder (Standard 1 MB), unabhängig von der Stadtgröße.
// Aufbau der Fächer (welches Element in welche Kachel) und das Zeichnen laufen in Schritten mit Zeitanteil (Regel 20). Koordinaten = Rohbild (w × h) wie elemente().
// sicht(x,y,w,h) setzt den Bildausschnitt; schritt(ms) → true, wenn alles Gewünschte fertig ist; sichtbare() → Kacheln im Bild (fertige mit px); umrisse() → Ersatzbild.
// Gebäuderahmen werden vorab geschätzt (ohne Bild): links h·32+16, rechts w·32+16, oben HOCH, unten (w+h)·16+16; ueber zählt Gebäude, die größer sind (Test: 0).
var HOCH=96,GH=51,HOCH_PLUS=17;   // N6b2b1: Geschoss 51 statt 34 (+17), je weiteres Geschoss +51
function hoch(b){return HOCH+HOCH_PLUS+(b&&b.g>1?(b.g-1)*GH:0)}
function kachelBauer(P,hole,opt){opt=opt||{};var E=elemente(P,hole,{umland:opt.umland,inSchritten:true}),K=opt.kachel||256,GRENZE=opt.grenze||32,RAND=opt.rand==null?1:opt.rand,HAUS=opt.hausSpeicher||1048576;
 var NX=Math.ceil(E.w/K),NY=Math.ceil(E.h/K),NK=NX*NY,L=E.L,N=0,box=null,hat=null,fehlt={};
 var anz=null,start=null,fach=null,pos=null,phase=-1,pk=0,aufbauMs=0,bauIdx=[],farben=null;
 var kach=new Map(),wunsch=[],imBild=[],sx=0,sy=0,sw=0,sh=0,hatSicht=false;
 var haus=new Map(),hausB=0,st={gebaut:0,verworfen:0,ms:0,maxMs:0,schritte:0,ueber:0,haeuserGebaut:0};
 var t0x=function(i){return Math.max(0,Math.floor(box[i*4]/K))},t1x=function(i){return Math.min(NX-1,Math.floor((box[i*4+2]-1)/K))},
     t0y=function(i){return Math.max(0,Math.floor(box[i*4+1]/K))},t1y=function(i){return Math.min(NY-1,Math.floor((box[i*4+3]-1)/K))};
 var innen=function(i){return box[i*4+2]>0&&box[i*4+3]>0&&box[i*4]<E.w&&box[i*4+1]<E.h};
 // Aufbau: 0 Rahmen je Element, 1 Zählen je Kachel, 2 Einsortieren (Reihenfolge bleibt), 3 fertig
 var aufbau=function(t0,budget){var aus=function(){return jetzt()-t0>budget};while(phase<3){
   if(phase===-1){if(!E.fuellen(aus))return false;N=L.length;box=new Int32Array(N*4);hat=new Uint8Array(N);anz=new Int32Array(NK+1);
    for(var q0=0;q0<N;q0++)if(L[q0].k===2){L[q0].q=q0;bauIdx.push(q0)}phase=0;pk=0;if(aus())return false}
   else if(phase===0){for(;pk<N;pk++){if((pk&31)===0&&aus())return false;var e=L[pk],q=pk*4;
     if(e.k<2){var sp=malbild(hole(e.id));if(!sp){fehlt[e.id]=1;continue}box[q]=e.X-sp.ax;box[q+1]=e.Y-sp.ay;box[q+2]=box[q]+sp.w;box[q+3]=box[q+1]+sp.h}
     else{box[q]=e.X-e.fh*32-16;box[q+1]=e.Y-hoch(e.b);box[q+2]=e.X+e.fw*32+16;box[q+3]=e.Y+(e.fw+e.fh)*16+16}
     hat[pk]=innen(pk)?1:0}phase=1;pk=0}
   else if(phase===1){for(;pk<N;pk++){if((pk&255)===0&&jetzt()-t0>budget)return false;if(!hat[pk])continue;
     for(var ty=t0y(pk),y1=t1y(pk);ty<=y1;ty++)for(var tx=t0x(pk),x1=t1x(pk);tx<=x1;tx++)anz[ty*NX+tx+1]++}
    start=new Int32Array(NK+1);for(var a=0;a<NK;a++)start[a+1]=start[a]+anz[a+1];fach=new Int32Array(start[NK]);pos=start.slice(0,NK);anz=null;phase=2;pk=0}
   else{for(;pk<N;pk++){if((pk&255)===0&&jetzt()-t0>budget)return false;if(!hat[pk])continue;
     for(var ty2=t0y(pk),y2=t1y(pk);ty2<=y2;ty2++)for(var tx2=t0x(pk),x2=t1x(pk);tx2<=x2;tx2++)fach[pos[ty2*NX+tx2]++]=pk}
    pos=null;phase=3;if(hatSicht)planen()}}return true};
 // Gebäudebild gemerkt (über mehrere Kacheln), älteste fallen zuerst heraus
 var bau=function(e){var key=e,r=haus.get(key);if(r){haus.delete(key);haus.set(key,r);return r}
  r=E.bauBild(e);st.haeuserGebaut++;var q=e.q*4;
  if(r.X-r.sp.ax<box[q]||r.Y-r.sp.ay<box[q+1]||r.X-r.sp.ax+r.sp.w>box[q+2]||r.Y-r.sp.ay+r.sp.h>box[q+3])st.ueber++;
  haus.set(key,r);hausB+=r.sp.px.length;while(hausB>HAUS&&haus.size>1){var alt=haus.keys().next().value;hausB-=haus.get(alt).sp.px.length;haus.delete(alt)}return r};
 // Gewünscht: Kacheln im Bild (Mitte zuerst), danach der Ring Vorrat; höchstens GRENZE. Alles andere wird verworfen.
 var planen=function(){if(!hatSicht)return;var ax0=Math.max(0,Math.floor(sx/K)),ax1=Math.min(NX-1,Math.floor((sx+sw-1)/K)),ay0=Math.max(0,Math.floor(sy/K)),ay1=Math.min(NY-1,Math.floor((sy+sh-1)/K));
  var mx=(sx+sw/2)/K,my=(sy+sh/2)/K,a=[],b=[],tx,ty;
  for(ty=ay0-RAND;ty<=ay1+RAND;ty++)for(tx=ax0-RAND;tx<=ax1+RAND;tx++){if(tx<0||ty<0||tx>=NX||ty>=NY)continue;var d=(tx+.5-mx)*(tx+.5-mx)+(ty+.5-my)*(ty+.5-my),t=ty*NX+tx;
   (tx>=ax0&&tx<=ax1&&ty>=ay0&&ty<=ay1?a:b).push([d,t])}
  var nach=function(u,v){return u[0]-v[0]||u[1]-v[1]};a.sort(nach);b.sort(nach);imBild=a.map(function(x){return x[1]});
  wunsch=a.concat(b).slice(0,GRENZE).map(function(x){return x[1]});var soll={};wunsch.forEach(function(t){soll[t]=1});
  kach.forEach(function(k,t){if(!soll[t]){kach.delete(t);st.verworfen++}})};
 var leerTest=function(px){for(var i=0;i<px.length;i++)if(px[i]!==LEER)return false;return true};
 return{w:E.w,h:E.h,ax:E.ax,ay:E.ay,K:K,NX:NX,NY:NY,grenze:GRENZE,
  sicht:function(x,y,w,h){sx=x|0;sy=y|0;sw=Math.max(1,w|0);sh=Math.max(1,h|0);hatSicht=true;if(phase===3)planen()},
  schritt:function(budget){budget=budget||4;var t0=jetzt();
   if(phase<3){var a0=jetzt(),ok=aufbau(t0,budget);aufbauMs+=jetzt()-a0;if(!ok){var d0=jetzt()-t0;st.ms+=d0;if(d0>st.maxMs)st.maxMs=d0;st.schritte++;return false}}
   var fertig=true;
   for(var w=0;w<wunsch.length;w++){var t=wunsch[w],k=kach.get(t);
    if(!k){var tx=t%NX,ty=(t/NX)|0,x=tx*K,y=ty*K;k={t:t,tx:tx,ty:ty,x:x,y:y,w:Math.min(K,E.w-x),h:Math.min(K,E.h-y),px:null,i:start[t],ende:start[t+1],fertig:false};
     if(k.i>=k.ende)k.fertig=true;kach.set(t,k)}
    if(k.fertig)continue;if(jetzt()-t0>=budget){fertig=false;break}
    if(!k.px)k.px=new Uint8Array(k.w*k.h).fill(LEER);var Z={w:k.w,h:k.h,px:k.px};
    do{zeichne(E,L[fach[k.i++]],Z,k.x,k.y,fehlt,bau)}while(k.i<k.ende&&jetzt()-t0<budget);
    if(k.i>=k.ende){k.fertig=true;st.gebaut++;if(leerTest(k.px))k.px=null}else{fertig=false;break}}
   var d=jetzt()-t0;st.ms+=d;if(d>st.maxMs)st.maxMs=d;st.schritte++;return fertig&&phase===3},
  kachel:function(tx,ty){return kach.get(ty*NX+tx)||null},
  sichtbare:function(){return imBild.map(function(t){var k=kach.get(t),tx=t%NX,ty=(t/NX)|0;return k||{t:t,tx:tx,ty:ty,x:tx*K,y:ty*K,w:Math.min(K,E.w-tx*K),h:Math.min(K,E.h-ty*K),px:null,fertig:false}})},
  // Ersatzbild (Regel 20): Fläche des Orts als Raute und Gebäude als Klötze aus dem Plan (Lage im Rohbild), nach Tiefe sortiert, im Rechteck (x, y, w, h)
  umrisse:function(x,y,w,h){var r=[],W=E.W+2*E.U,c=function(i,j){return[E.bx(i,j),E.by(i,j)]},U=E.U;
   for(var bi=0;phase===3&&bi<bauIdx.length;bi++){var i=bauIdx[bi],e=L[i];if(!hat[i])continue;var q=i*4;if(box[q+2]<x||box[q]>x+w||box[q+3]<y||box[q+1]>y+h)continue;r.push({X:e.X,Y:e.Y,fw:e.fw,fh:e.fh,rolle:e.b.rolle})}
   if(!farben){var B=BIOME[P.biom],vs='bk-'+(B.satz||KURZ[P.basis.klasse]||'ziegel'),dom=function(id,sonst){var sp=malbild(hole(id));if(!sp)return sonst;var z=new Int32Array(256),m=-1,mi=sonst;
     for(var a=0;a<sp.px.length;a++)if(sp.px[a]!==LEER&&++z[sp.px[a]]>m){m=z[sp.px[a]];mi=sp.px[a]}return mi},bo=dom(B.boden[0],0);
    farben={boden:bo,weg:dom(B.weg,bo),wand:dom(vs+'-wand',bo),dach:dom(vs+'-dach-flach',dom(vs+'-dach-ab-i',bo))}}
   return{flaeche:[c(-U,-U),c(W-U,-U),c(W-U,W-U),c(-U,W-U)].map(function(p,n){return[p[0],p[1]+16]}),bauten:r,farben:farben}},
  stand:function(){var gehalten=0,bytes=0;kach.forEach(function(k){if(k.px){gehalten++;bytes+=k.px.length}});
   return{aufgebaut:phase===3,aufbauMs:aufbauMs,elemente:N,fachBytes:(fach?fach.length*4:0)+(box?box.length*4:0)+N+(start?start.length*4:0),kacheln:NK,
    imBild:imBild.length,gewuenscht:wunsch.length,gehalten:gehalten,bytes:bytes,haeuser:haus.size,hausBytes:hausB,
    gebaut:st.gebaut,verworfen:st.verworfen,haeuserGebaut:st.haeuserGebaut,ueber:st.ueber,ms:st.ms,maxMs:st.maxMs,schritte:st.schritte,fehlt:Object.keys(fehlt)}}}}
// Am Stück (Tests, Werkzeug): baut mit großem Zeitanteil
function malen(P,hole,opt){var b=bauer(P,hole,opt);while(!b.schritt(1e9));return b.bild()}
function kacheln(r,K){K=K||256;var L=[],ty,tx,y;for(ty=0;ty<r.h;ty+=K)for(tx=0;tx<r.w;tx+=K){var w=Math.min(K,r.w-tx),h=Math.min(K,r.h-ty),px=new Uint8Array(w*h),voll=false;
  for(y=0;y<h;y++){var a=(ty+y)*r.w+tx,zeile=r.px.subarray(a,a+w);px.set(zeile,y*w);if(!voll)for(var x=0;x<w;x++)if(zeile[x]!==LEER){voll=true;break}}
  if(voll)L.push({x:tx,y:ty,w:w,h:h,px:px})}return L}
// Kennzahlen eines Plans für Anzeige und Tests
function zaehle(P){var n={haeuser:0,mauer:0,besondere:0,dinge:P.dinge.length};P.bauten.forEach(function(b){if(b.rolle==='house'||b.rolle==='shack')n.haeuser++;else if(b.rolle==='mauer')n.mauer++;else n.besondere++});return n}
// Alle Kartei-Kennungen, die ein Plan braucht (Editor lädt nur diese)
function kennungen(P){var bk=BK(),s={},B=BIOME[P.biom];B.boden.concat([B.weg,P.feld||'bk-feld','boden-wasser','boden-erde','boden-gras','boden-fels','bk-marmor-boden','boden-sand','steg-deck-i','steg-deck-j'].concat(P.wehr?WEHR_IDS:[],P.hoehe?['fels-kante-i','fels-kante-j','fels-treppe-s','fels-treppe-n','fels-treppe-o','fels-treppe-w']:[],FLUSS_VAR,Object.keys(RAMPE).map(function(k){return RAMPE[k]}))).forEach(function(i){s[i]=1});
 bk.KLASSEN.forEach(function(k){s['bk-'+k.kurz+'-boden']=1});B.baeume.forEach(function(i){s[i]=1});for(var h in HAIN)s[HAIN[h]]=1;P.dinge.forEach(function(d){s[d.id]=1});return Object.keys(s)}

var SB={wehrLese:wehrLese,WEHR_IDS:WEHR_IDS,WEHR_H:WEHR_H,TURM_H:TURM_H,TURM_AB:TURM_AB,mauerwerk:mauerwerk,wehrNachbarn:wehrNachbarn,wehrDrehen:wehrDrehen,HSTUFE:HSTUFE,GIPFEL1:GIPFEL1,GIPFEL2:GIPFEL2,huegelPlan:huegelPlan,innenMaske:innenMaske,TOTE:TOTE,HOF_JE:HOF_JE,GRAB_JE:GRAB_JE,GRAB_MAX:GRAB_MAX,elemente:elemente,kachelBauer:kachelBauer,HOCH:HOCH,hoch:hoch,skalieren:skalieren,ARTEN:ARTEN,BIOME:BIOME,STILE:STILE,plan:plan,blockMass:blockMass,setzeDaten:setzeDaten,PROBE_EINW:PROBE_EINW,ART_G:ART_G,spiegeln:spiegeln,drehen:drehen,bauer:bauer,malen:malen,kacheln:kacheln,zaehle:zaehle,kennungen:kennungen,hashT:hashT};
if(typeof module!=='undefined'&&module.exports)module.exports=SB;else G.AT3_STADTBILD=SB;
})(typeof window!=='undefined'?window:globalThis);
