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
// N6b3b1 Tempel (Thomas 23.11.2026): genau 6 × 8 Felder, ab Großstadt der erste Tempel groß 10 × 14, Eingang mittig an einer
// Schmalseite; jeder Tempel trägt die Religion seines Orts (b.rel, austauschbar: tempelUmwidmen), das Ganzbild zeigt sie als Wechselschild (Giebelfeld + Banner).
// Ohne opt.religion gilt die erste Religion mit diesem Biom als Heimat (daten/religionen.json). hoch = Bildpunkte über der oberen Ecke (Rahmen, Vorschlag).
var TEMPEL={klein:{s:6,l:8,hoch:150},gross:{s:10,l:14,hoch:230}},TEMPEL_GROSS_AB=6,TEMPEL_PLAN=[4,6],TEMPEL_PLAN_GROSS=[7,10];   // im Plan vor dem Maßstab 1,5: 4 × 6 → immer 6 × 9, 7 × 10 → 10–11 × 15
var REL_BIOM={mediterranean:'thunderous-pantheon',grassland:'beast-crowned',broadleaf:'whispering-green',desert:'beast-crowned',mountain:'deep-mother',savanna:'long-table',
 conifer:'undying-flame',coast:'tide-ledger',swamp:'fever-saints',rainforest:'undying-flame',mangrove:'tide-ledger',tundra:'frost-covenant',snow:'frost-covenant'};
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
 mediterranean:{klasse:'brick',dach:'sattel',wand:STEIN,satz:'putz',pflaster:true,felder:true,boden:['boden-gras','boden-erde'],weg:'boden-weg',baeume:['baum-olive','baum-zypresse','busch-bluete'],dichte:.16,feld:'bk-feld'},
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
// N6b3b1: scheitert ein Plan mit der größeren Tempelfläche (seltene Grenzfälle, z. B. „Außenring passt nicht“), plant er noch einmal mit der alten Fläche;
// die Tempel werden dann nur zugeschnitten, wo es geht (sonst Baukasten-Bild). Kosten nur im Fehlerfall.
function plan(opt){if(opt.tempel===false||opt.tempelAlt)return plan0(opt);try{return plan0(opt)}catch(e){if(!opt.theaterAlt&&opt.theater!==false){try{return plan0(Object.assign({},opt,{theaterAlt:true}))}catch(e2){}}return plan0(Object.assign({},opt,{tempelAlt:true,theaterAlt:true}))}}   // N6b3d: scheitert der Plan mit der größeren Theaterfläche, erst mit der alten
function plan0(opt){
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
 var TPL=opt.tempel!==false&&F===BK().MASS;   // N6b3b1 nur im echten Maßstab (Ganzbilder in Bildfeldern)
 if(TPL&&!opt.tempelAlt){var tg=items.filter(function(it){return it.id==='temple'});tg.forEach(function(it,n){var q=n===0&&g>=TEMPEL_GROSS_AB?TEMPEL_PLAN_GROSS:TEMPEL_PLAN;it.w=q[0];it.h=q[1]})}   // N6b3b1: Platz etwas größer, nach dem Maßstab auf genau 6 × 8 bzw. 10 × 14 zugeschnitten
 if(TPL&&B.pflaster&&opt.theater!==false&&!opt.theaterAlt)items.forEach(function(it){if(it.id==='theatre'){it.w=THEATER_PLAN[0];it.h=THEATER_PLAN[1]}});   // N6b3d Theater: Platz für 12 × 9 (nur Mittelmeer)
 if(TPL&&B.pflaster&&opt.senat!==false&&!opt.theaterAlt)items.forEach(function(it){if(it.id==='senate'){it.w=SENAT_PLAN[0];it.h=SENAT_PLAN[1]}});
 if(TPL&&B.pflaster&&opt.presse!==false)items.forEach(function(it){if(PRESSE_ID[it.id]){it.w=PRESSE_PLAN[0];it.h=PRESSE_PLAN[1]}});   // N6b4c4 Weinpresse/Ölmühle: Platz für 4 × 5 (nur Mittelmeer)   // N6b3e2 Senat: Platz für 8 × 9 (nur Mittelmeer)
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
  var FLUR=flurStart(opt,einw,FL,Li);   // N6b4b2: Felder nach Bedarf statt HOF_JE (opt.flur:false = wie vorher)
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
   else if(x.lage==='umland'&&!(stadtK&&HAFEN[x.id])){if(FLUR&&FLUR.kulturVon[x.id])FLUR.liste.push({id:x.id,w:x.w,h:x.h});else hoefe.push({id:x.id,w:x.w,h:x.h,liste:true})}}});
  // Zusätzliche Felder und Weiden nach Einwohnern (Vorschlag: 1 Hof je HOF_JE Einwohner), Arten aus dem Biom, abwechselnd Feld und Herde
  var passt=function(x){return x&&x.hof&&(x.gruppe==='felder'||x.gruppe==='vieh')&&(x.biom.indexOf('alle')>=0||x.biom.indexOf(opt.biom)>=0)&&(x.stufe||1)<=gST};
  var FA=D.L.filter(function(x){return passt(x)&&x.gruppe==='felder'&&!HAIN[x.id]}).map(function(x){return x.id}).sort(),
      VA=D.L.filter(function(x){return passt(x)&&x.gruppe==='vieh'}).map(function(x){return x.id}).sort();
  var nx=FLUR?0:Math.floor(einw/HOF_JE);for(var k=0;k<nx;k++){var L2=(k%2&&VA.length)||!FA.length?VA:FA;if(!L2.length)break;var id=L2[Math.floor(ra()*L2.length)],fs=SL().fuss(D.G[id]);hoefe.push({id:id,w:fs[0],h:fs[1],liste:false})}
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
  // N6b5a Rückmeldung Thomas (24.11.2026): Elendsviertel extrem überfüllt: in Biomen mit Budenbild 1,25 statt 2,6 Felder Schlamm je Bude (opt.budenEng:false = wie vorher)
  var tS=TO[stinkK],eG=[],eR=[],Ue=0,JE=B.felder&&opt.budenbild!==false&&opt.budenEng!==false&&opt.stinkEng!==false?1.25:2.6;   // stinkEng:false = alter Riesenplan ganz wie vorher
  if(buden){var uwC={},uw=function(l){if(l in uwC)return uwC[l];var last=null;for(var u=-Wi;u<0;u++){var p=glob(tS,u,l);if(p[0]>=0&&p[1]>=0&&p[0]<Wi&&p[1]<Wi&&MK[p[1]*Wi+p[0]])last=u}return uwC[l]=last===null?null:last+1};
   var strU=function(l){if(l===0||l===1)return tS.u0;for(var k=0;k<TO.length;k++){var t2=TO[k];if(k!==stinkK&&t2.s===tS.s&&(l+tS.c-t2.c===0||l+tS.c-t2.c===1))return t2.u0}return null};
   var gut=function(l,u){var p=glob(tS,u,l);return frei(p[0],p[1])&&seiteVon(p[0]+.5,p[1]+.5)===tS.s};
   var spalten=function(tief){var out=[];[-1,1].forEach(function(dir){var prev=tS.u0;
     for(var l=dir<0?-1:2;;l+=dir){var su=strU(l);if(su!==null){prev=su;continue}
      var w=uw(l);if(w===null)break;var nu=strU(l+dir);if(nu===null)nu=uw(l+dir);var end=Math.max(w,prev,nu===null?w:nu),ok=true,u;
      for(u=w;u<=end&&ok;u++)if(!gut(l,u))ok=false;if(!ok)break;
      var reg=[];if(l<=-5||l>=6)for(u=end+1;u<=w+tief;u++){if(!gut(l,u))break;reg.push(u)}
      out.push({l:l,w:w,end:end,reg:reg});prev=w}});return out};
   var regW=spalten(1).filter(function(c){return c.reg.length}).length;
   // N6b2e2g0 Riesenplan (Thomas 22.11.2026): liegt neben dem Stinktor ein Fluss oder eine Mauerschräge, bleiben kaum Spalten, die Buden würden sehr tief
   // gestapelt (bis 260 Felder) und der ganze Ring wüchse mit. Dann (tiefer als UE_MAX oder gar keine Spalte) das Haupttor mit den meisten Budenspalten;
   // das Gräbertor tauscht, falls es dasselbe wäre. Sonst bleibt alles wie vorher. Notausschalter opt.stinkEng:false.
   if(opt.stinkEng!==false&&(!regW||Math.ceil(buden*JE/regW)>UE_MAX)){var sAlt=stinkK,sBest=stinkK,sN=regW;
    HP.forEach(function(k){if(k===sAlt)return;stinkK=k;tS=TO[k];uwC={};var n=spalten(1).filter(function(c){return c.reg.length}).length;if(n>sN){sN=n;sBest=k}});
    stinkK=sBest;tS=TO[sBest];uwC={};regW=sN;if(sBest!==sAlt&&grabK===sBest)grabK=sAlt}
   if(!regW)return null;
   Ue=Math.max(2,Math.ceil(buden*JE/regW))+zug;
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
  var R=Math.max(4,ext+2),flurB=0;if(opt.zeilen)opt.zeilen.push(cur.slice());
  // N6b4b2 Flurgürtel: so viele Ringe außen dazu, bis genug freie Fläche (in Bildfeldern ×F²) für Felder, Höfe und Feldwege da ist (FLUR_PLATZ × Felder)
  if(FLUR){var zielN=flurBedarf(FLUR,g)*FLUR_PLATZ*(1+.3*(opt.flurV|0))/(F*F),hab=0,dd;
   for(dd=R;hab<zielN&&dd<R+FLUR_MAX;dd++){var xx2,yy2;   // Ring im Abstand dd vom Plan innen (Chebyshev), Koordinaten wie frei()
    for(xx2=-dd;xx2<Wi+dd;xx2++){if(frei(xx2,-dd))hab++;if(frei(xx2,Wi+dd-1))hab++}
    for(yy2=-dd+1;yy2<Wi+dd-1;yy2++){if(frei(-dd,yy2))hab++;if(frei(Wi+dd-1,yy2))hab++}}
   flurB=dd-R;flurB+=flurB&1;FLUR.ab=R;R+=flurB}   // gerade Breite: der Maßstab 1,5 rundet den Ort innen dann genau wie ohne Gürtel
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
   reg.forEach(function(k6){if(belegt[k6]||tuerRes[k6])return;var i6=k6%W,j6=(k6/W)|0;if(rausch(i6,j6,seed+43)<.1&&(rausch(i6,j6,seed+44)>=.15||!B.felder||opt.budenbild===false))dinge.push({id:rausch(i6,j6,seed+44)<.15?'leiche':'lager-platz',i:i6,j:j6})})}
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
  // Landschaft im Ring: Bäume des Bioms wie in den Höfen innen (Flurgürtel N6b4b2: Bäume erst in flurPlan())
  for(var q7=0;q7<W*W;q7++){if(keinBaum[q7]||belegt[q7]||Z[q7]!=='g')continue;var i7=q7%W,j7=(q7/W)|0;if(FLUR&&Math.max(R-i7,R-j7,i7-R-Wi+1,j7-R-Wi+1)>=FLUR.ab)continue;if(rausch(i7,j7,seed+41)<B.dichte*.6+.04)dinge.push({id:B.baeume[Math.floor(rausch(i7,j7,seed+42)*B.baeume.length)],i:i7,j:j7})}
  var TL=TO.filter(function(t){return t.s!==ks});if(!TL.length)TL=TO;   // Ankunft über Land (Küste: nicht die Straße zum Kai)
  var tp=TL.filter(function(t){return t.s===0})[0]||TL.filter(function(t){return t.s===2})[0]||TL[0],te=glob(tp,R-1,0);
  var MTa=null;if(E.mauertor){MTa=new Array(W*W).fill('0');for(var jt=0;jt<Wi;jt++)for(var it=0;it<Wi;it++)MTa[at(it+R,jt+R)]=E.mauertor.charAt(jt*Wi+it);MTa=MTa.join('')}
  return{W:W,Z:Z,bauten:bauten,dinge:dinge,mauertor:MTa,tor:{i:te[0]+R,j:te[1]+R},nb:E.nb,fluss:FE,kueste:KU,gesetzt:gesetzt,vielfalt:E.vielfalt,tore:TO,maske:MK,rand:R,
   aussen:{ring:R,innenW:Wi,stinktor:SEITE[TO[stinkK].s],graebertor:SEITE[TO[grabK].s],tore:TO.map(function(t){return SEITE[t.s]}),buden:buden,graeber:graeber,hoefe:hoefe.length,hoefeExtra:nx>0?hoefe.filter(function(h){return !h.liste}).length:0,elend:Ue,
   flur:FLUR?{ab:FLUR.ab,breite:flurB,ring:R,innenW:Wi,liste:FLUR.liste,zeilen:FLUR.zeilen,biomLW:FLUR.biomLW,stufe:FLUR.stufe}:null}};}
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
   else if(z5==='e'&&rausch(i5,j5,seed+9)<.15&&!/[s]/.test(Z[q5]))(rausch(i5,j5,seed+10)>=.15||!B.felder||opt.budenbild===false)&&dinge.push({id:rausch(i5,j5,seed+10)<.15?'leiche':'lager-platz',i:i5,j:j5})}
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
 if(opt.pflaster===false)P.pflaster=false;   // N6b3a Notausschalter: Wege und Plätze wie vorher
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
 if(!elend&&TPL)tempelFest(P,opt);   // N6b3b1 Tempel genau 6 × 8 bzw. 10 × 14, Eingang an der Schmalseite (opt.tempel:false = wie vorher)
 if(!elend&&TPL&&opt.forum!==false)forumFest(P,opt);   // N6b3c1 Forum genau 14 × 14, Säulenhallen an 3 Seiten (opt.forum:false = wie vorher)
 if(!elend&&TPL&&opt.theater!==false)theaterFest(P,opt);   // N6b3d Theater genau 12 × 9, Tor im Bühnenhaus an der Gasse (opt.theater:false = wie vorher)
 if(!elend&&TPL&&opt.statthalter!==false)statthalterFest(P,opt);   // N6b3e1 Statthalterpalast genau 9 × 9, Portal mittig an einer Seite (opt.statthalter:false = wie vorher)
 if(!elend&&TPL&&opt.senat!==false)senatFest(P,opt);   // N6b3e2 Senat genau 8 × 9, Tor mittig an der Schmalseite (opt.senat:false = wie vorher)
 if(!elend&&TPL&&opt.presse!==false)presseFest(P,opt);   // N6b4c4 Weinpresse und Ölmühle genau 4 × 5, Tor mittig an der Schmalseite (opt.presse:false = wie vorher)
 if(!elend&&TPL&&opt.koenigspalast!==false)koenigspalastFest(P,opt);   // N6b3e3 Königspalast genau 15 × 15, Tor mittig an einer Seite (opt.koenigspalast:false = wie vorher)
 if(elend&&B.felder&&opt.budenbild!==false&&opt.gewirr!==false)elendGewirr(P,seed,{eng:opt.budenEng!==false&&opt.anbauten!==false,dinge:opt.elendDinge!==false});   // N6b5b3 Elendssiedlung als Gewirr (opt.gewirr:false = Blockraster wie vorher)
 if(B.felder&&opt.budenbild!==false&&opt.budenEng!==false&&opt.anbauten!==false&&(elend||(g>=MAUER_AB&&P.aussen&&P.aussen.buden)))anbauten(P,seed);   // N6b5a überfülltes Elendsviertel (vor Mauer und Toren: die behandeln Anbauten wie Buden)
 if(g>=MAUER_AB&&UM&&opt.rund!==false)mauerRund(P,UM,Rm,Wm,spW,opt.torGerade);   // N6b2e2a runde Mauerlinie in Bildfeldern (opt.rund:false = vergrößerter Plan wie vorher)
 if(g>=MAUER_AB&&UM&&opt.rund!==false&&opt.torGerade!==false)toreGerade(P,opt);   // N6b2e2g1 jedes Straßentor 3 breit in geradem Mauerstück (opt.torGerade:false = wie vorher)
 if(g>=MAUER_AB&&UM&&opt.rund!==false&&opt.torGerade!==false&&opt.wasserOffen!==false)wassertoreGerade(P,opt);   // N6b2e2g2 Mauer endet am Fluss mit Türmen an beiden Ufern (opt.wasserOffen:false = wie vorher)
 if(g>=MAUER_AB&&opt.wehr!==false)mauerwerk(P,opt);   // N6b2d begehbare Mauer (opt.wehr:false = Platzhalter wie vorher)
 if(!elend&&opt.ehrensaeulen!==false)ehrensaeulen(P);
 if(!elend){flurPlan(P,opt);dauerDinge(P,opt);pferchZaun(P,opt)}   // N6b4b2 Flurgürtel mit Höfen, Feldern und Feldwegen in Bildfeldern, ganz zum Schluss (Hofhäuser vorn in P.bauten; opt.flur:false = wie vorher)   // N6b3b4 Ehrensäulen am Marktplatz (opt.ehrensaeulen:false = wie vorher)
 if(B.felder&&opt.budenbild!==false&&opt.elendDinge!==false&&(elend||(g>=MAUER_AB&&P.aussen&&P.aussen.buden)))elendDinge(P,seed);   // N6b5b1 Dinge im Elendsviertel (opt.elendDinge:false = wie vorher)
 budenBild(P,opt);   // N6b5a Elendsbuden als Ganzbild (opt.budenbild:false = wie vorher)
 if(P._gasse&&opt.gasseZeigen)P.gasse=Array.prototype.join.call(P._gasse,'');delete P._gasse;   // N6b5b3 nur zum Planen (opt.gasseZeigen: als Zeichenkette für Tests)
 delete P.mauertor;delete P.uferAuf;   // nur zum Rechnen der Tore
 // N6b4b2: hat der Gürtel nicht für alle Felder gereicht (Wüste: viele kleine Höfe), denselben Ort mit breiterem Gürtel neu planen (höchstens 3-mal)
 if(P.flur&&P.flur.fehlt>0&&(opt.flurV|0)<3)return plan0(Object.assign({},opt,{flurV:(opt.flurV|0)+1}));
 P.dinge.forEach(function(d){d.id=dingWahl(d.id,d.i,d.j)});
 return P}
// N6b3c1 Forum (Thomas 23.11.2026): begehbarer Marmorplatz mit Säulenhallen 2 tief an 3 Seiten (außen Läden, gesperrt; innen Säulengang, begehbar), die 4. Seite
// offen zur Straße (am liebsten zur Hauptstraße), Rednerbühne 4 × 2 mittig vor der hinteren Halle, Reiterstandbild 2 × 2 auf der Achse mitten im freien Platz.
// Die Hallen bestehen aus Randstücken je Feld (N6b3c2), darum keine feste Größe: je Achse die größte gerade Länge in der alten Forumsfläche (Plan 9 × 9 × 1,5 → 13 oder 14,
// also 12 oder 14; am Burgberg auch 10, alles auf einer Stufe), damit die Achse mittig zwischen zwei Feldern liegt. Der Stadtplan wächst nicht. Nur Biome mit Pflaster (Mittelmeer), andere Biome später mit ihren Baustilen.
// Gesperrte Felder (Läden, Bühne, Statue) liegen nie vor einer Tür, die offene Seite hat Weg davor, die Wege der Stadt zerfallen nicht in mehr Stücke als vorher.
// Abgeschnittene Randfelder bekommen den Boden der Nachbarn (wie tempelFest). Ergebnis P.forum (Rechtecke in Bildfeldern, s. forumArt), Zähler P.forumStat.
// Bilder: Säulenhallen N6b3c2, Rednerbühne und Statue N6b3c3; bis dahin bleibt alles Marmor, der alte Stand steht auf dem Statuenfeld.
// Kosten: einmal je Ort im Bildkern, ≤ 16 Lagen × ~200 Felder plus wenige Flutungen der Wegefelder (Abbruch beim ersten Treffer).
var FORUM={tief:2,rostra:[4,2],statue:[2,2]};
// Lokale Lage: t = Tiefe ab der hinteren Seite (0 … St−1), u = quer (0 … Su−1); offen = Richtung von der Mitte zur offenen Seite
function forumMass(F){return F.offen[1]?[F.w,F.h]:[F.h,F.w]}
function forumLok(F,x,y){var d=F.offen;if(d[1]>0)return[y-F.j,x-F.i];if(d[1]<0)return[F.j+F.h-1-y,F.i+F.w-1-x];if(d[0]>0)return[x-F.i,F.j+F.h-1-y];return[F.i+F.w-1-x,y-F.j]}
function forumArtLok(Su,St,t,u){if(t<0||u<0||t>=St||u>=Su)return null;if(t<1||u<1||u>Su-2)return 'laden';if(t<2||u<2||u>Su-3)return 'gang';
 var m=Su>>1,ts=((4+St)>>1)-1;if(t>=2&&t<=3&&u>=m-2&&u<=m+1)return 'rostra';if(t>=ts&&t<=ts+1&&u>=m-1&&u<=m)return 'statue';return 'platz'}
function forumArtF(F,i,j){if(i<F.i||j<F.j||i>=F.i+F.w||j>=F.j+F.h)return null;var M=forumMass(F),L=forumLok(F,i,j);return forumArtLok(M[0],M[1],L[0],L[1])}
function forumArt(P,i,j){return P&&P.forum?forumArtF(P.forum,i,j):null}
// N6b3c2 Säulenhallen: ein vorgezeichnetes Randstück je Laden- und Gangfeld (tools/at3-forum-hallen.py), Kennung nach Lage.
// Seite = Rand des Forums, an dem die Halle steht (i0 = kleinstes i …); Ecke = zwei Hallen, Ende = Feld an der offenen Seite. Varianten nach Lage aus dem Seed:
// Laden ruhig ~45 %, Läden zu ~27 %, Metzger ~15 %, aufgegeben ~13 %; Gang ruhig 60 %, Tauben 22 %, Säule mit Riss 18 %.
var FORUM_SEITE=['i0','i1','j0','j1'];
function forumOffen(F){var d=F.offen;return d[0]>0?'i1':d[0]<0?'i0':d[1]>0?'j1':'j0'}
function forumId(F,x,y,seed){var a=forumArtF(F,x,y);if(a!=='laden'&&a!=='gang')return null;var tief=a==='laden'?0:1,of=forumOffen(F);
 var ab={i0:x-F.i,i1:F.i+F.w-1-x,j0:y-F.j,j1:F.j+F.h-1-y},E=FORUM_SEITE.filter(function(s){return s!==of&&ab[s]===tief});
 if(E.length===2)return 'forum-'+a+'-ecke-'+E[0]+E[1];
 if(ab[of]===0)return 'forum-'+a+'-ende-'+E[0]+of;
 var u=rausch(x,y,(seed|0)+161),v=a==='laden'?(u<.45?'':u<.72?'-a':u<.87?'-b':'-c'):(u<.6?'':u<.82?'-a':'-b');
 return 'forum-'+a+'-'+E[0]+v}
function FORUM_IDS(){var r=[];FORUM_SEITE.forEach(function(s){['','-a','-b','-c'].forEach(function(v){r.push('forum-laden-'+s+v);if(v!=='-c')r.push('forum-gang-'+s+v)});
  FORUM_SEITE.forEach(function(o){if(o[0]!==s[0])['laden','gang'].forEach(function(a){r.push('forum-'+a+'-ende-'+s+o)})})});
 ['i0j0','i0j1','i1j0','i1j1'].forEach(function(e){r.push('forum-laden-ecke-'+e,'forum-gang-ecke-'+e)});return r}
// N6b3c3 Rednerbühne (4 × 2) und Reiterstandbild (2 × 2) als Ganzbild je Lage (tools/at3-forum-mitte.py), beide blicken zur offenen Seite.
// Kennung 'forum-rostra-<offen>' bzw. 'forum-reiter-<offen>'; der Kopf des Reiters ist ein Wechselschild 'forum-reiter-kopf-<wer>-<offen>' (F.kopf, Platzhalter 'ohne').
// hoch = Bildpunkte über der oberen Feldecke (für Rahmen und Sortierung, gemessen 35 bzw. 79).
var FORUM_GANZ={rostra:{id:'forum-rostra-',hoch:48},statue:{id:'forum-reiter-',hoch:96}};
function forumGanzEls(F){var of=forumOffen(F);return['rostra','statue'].map(function(a){var r=F[a];
 return{id:'forum-'+a,ganz:FORUM_GANZ[a].id+of,art:a,kopf:a==='statue'?(F.kopf||'ohne'):null,of:of,i:r[0],j:r[1],w:r[2],h:r[3],hz:F.hz|0,rolle:'forum'}})}
function forumGanzBild(b,hole){var o=hole(b.ganz),sp=malbild(o);if(!sp)return{sp:null,fehlt:[b.ganz],teile:0};var key=b.ganz+'|'+(b.kopf||''),m=GANZ&&GANZ.get(key);
 if(m&&m.o===o)return{sp:m.sp,fehlt:[],teile:m.teile};var F=o.karte.flaeche,r={w:sp.w,h:sp.h,ax:sp.ax-(F.w-F.h)*16,ay:sp.ay-(F.w+F.h)*8,px:new Uint8Array(sp.px)},teile=1,fehlt=[];
 (o.schilder||[]).forEach(function(s){var id='forum-reiter-'+s.teil+'-',t=malbild(hole(id+b.kopf+'-'+b.of))||malbild(hole(id+'ohne-'+b.of));if(!t){fehlt.push(id+'ohne-'+b.of);return}
  blit(r,t,s.x+r.ax,s.y+r.ay);teile++});
 if(GANZ){if(GANZ.size>64)GANZ.clear();GANZ.set(key,{o:o,sp:r,teile:teile})}return{sp:r,fehlt:fehlt,teile:teile}}
function FORUM_GANZ_IDS(F){var of=forumOffen(F);return['forum-rostra-'+of,'forum-reiter-'+of,'forum-reiter-kopf-ohne-'+of].concat(F.kopf&&F.kopf!=='ohne'?['forum-reiter-kopf-'+F.kopf+'-'+of]:[])}
// Rechtecke je Art (für Bilder und Spielwege)
function forumTeile(F){var R={laden:[],gang:[],rostra:[],statue:[]},seen=new Uint8Array(F.w*F.h),x,y;
 var art=function(x,y){return forumArtF(F,F.i+x,F.j+y)},frei=function(x,y,a){return x<F.w&&y<F.h&&!seen[y*F.w+x]&&art(x,y)===a};
 for(y=0;y<F.h;y++)for(x=0;x<F.w;x++){var a=art(x,y);if(!R[a]||seen[y*F.w+x])continue;var w=1,h=1;while(frei(x+w,y,a))w++;
  for(;;){var ok=true;for(var q=0;q<w;q++)if(!frei(x+q,y+h,a)){ok=false;break}if(!ok)break;h++}
  for(var b=0;b<h;b++)for(var c=0;c<w;c++)seen[(y+b)*F.w+x+c]=1;R[a].push([F.i+x,F.j+y,w,h])}
 return R}
function forumFest(P,opt){var B=BIOME[P.biom],st={n:0,fest:0,fehl:0};P.forumStat=st;P.forum=null;if(!B||!B.pflaster)return;
 var W=P.W,WW=W*W,Z=P.zellen.split(''),HZ=P.hoehe,sn=-1;P.dinge.forEach(function(d,n){if(d.rolle==='forum'&&sn<0)sn=n});if(sn<0)return;
 var s0=P.dinge[sn],k0=s0.j*W+s0.i;st.n=1;if(Z[k0]!=='m'){st.fehl++;return}
 var lv=function(k){return HZ?HZ.charCodeAt(k)-48:0};
 var nb=function(k,d){var x=k%W,y=(k/W)|0;return d===0?(x<W-1?k+1:-1):d===1?(y<W-1?k+W:-1):d===2?(x>0?k-1:-1):(y>0?k-W:-1)};
 // alte Fläche: zusammenhängende Marmorfelder ab dem Stand
 var alt=new Uint8Array(WW),q=[k0],h=0,i0=W,i1=-1,j0=W,j1=-1;alt[k0]=1;
 while(h<q.length){var a=q[h++],ax=a%W,ay=(a/W)|0;if(ax<i0)i0=ax;if(ax>i1)i1=ax;if(ay<j0)j0=ay;if(ay>j1)j1=ay;for(var e=0;e<4;e++){var b=nb(a,e);if(b>=0&&!alt[b]&&Z[b]==='m'){alt[b]=1;q.push(b)}}}
 var belegt=new Uint8Array(WW),vor=new Uint8Array(WW);
 P.bauten.forEach(function(o){for(var y=Math.max(0,o.j);y<Math.min(W,o.j+o.h);y++)for(var x=Math.max(0,o.i);x<Math.min(W,o.i+o.w);x++)belegt[y*W+x]=1;
  if(o.tuer){var fx=o.tuer[0]+o.tuer[2],fy=o.tuer[1]+o.tuer[3];if(fx>=0&&fy>=0&&fx<W&&fy<W)vor[fy*W+fx]=1}});
 var ding=new Int32Array(WW).fill(-1);P.dinge.forEach(function(d,n){if(n!==sn&&d.i>=0&&d.j>=0&&d.i<W&&d.j<W)ding[d.j*W+d.i]=n});
 var WEG={s:1,e:1,o:1,m:1},gehbar=function(k,hh){return !belegt[k]&&WEG[Z[k]]&&ding[k]<0&&lv(k)===hh};
 // Wegestücke zählen (Weg = s, e, o, m ohne Gebäude; Nachbarn höchstens 1 Stufe auseinander); sperr = gesperrte Felder, raus = Felder, die das Forum abgibt (Boden folgt später, zählen als Weg)
 var stuecke=function(sperr){var v=new Uint8Array(WW),n=0,k,st2=[],weg=function(k){return !belegt[k]&&!sperr[k]&&!!WEG[Z[k]]};
  for(k=0;k<WW;k++){if(v[k]||!weg(k))continue;n++;v[k]=1;st2.push(k);while(st2.length){var c=st2.pop();for(var d=0;d<4;d++){var m=nb(c,d);if(m>=0&&!v[m]&&weg(m)&&Math.abs(lv(m)-lv(c))<=1){v[m]=1;st2.push(m)}}}}return n};
 var n0=stuecke(new Uint8Array(WW)),C=[],AW=i1-i0+1,AH=j1-j0+1,D=[[0,1],[1,0],[0,-1],[-1,0]],x,y;
 // Größen 14, 12, 10 je Achse (höchstens die alte Fläche), am Burgberg alles auf einer Stufe; größere Fläche zuerst
 for(var FW=Math.min(14,AW&~1);FW>=10;FW-=2)for(var FH=Math.min(14,AH&~1);FH>=10;FH-=2)for(var oy=0;oy<=AH-FH;oy++)for(var ox=0;ox<=AW-FW;ox++){var ri=i0+ox,rj=j0+oy,ok=true,h0=lv(rj*W+ri);
  for(y=rj;y<rj+FH&&ok;y++)for(x=ri;x<ri+FW&&ok;x++)if(!alt[y*W+x]||belegt[y*W+x]||lv(y*W+x)!==h0)ok=false;if(!ok)continue;
  D.forEach(function(d){var F={i:ri,j:rj,w:FW,h:FH,offen:d},weg=0,haupt=0,L=d[1]?FW:FH,t,dn=d[0]>0?0:d[1]>0?1:d[0]<0?2:3;
   for(y=rj;y<rj+FH;y++)for(x=ri;x<ri+FW;x++){var a=forumArtF(F,x,y);if(a!=='platz'&&a!=='gang'&&vor[y*W+x])return}
   for(t=0;t<L;t++){var px=d[0]>0?ri+FW:d[0]<0?ri-1:ri+t,py=d[1]>0?rj+FH:d[1]<0?rj-1:rj+t;if(px<0||py<0||px>=W||py>=W)continue;var ko=py*W+px;
    // abgeschnittene Randfelder des alten Forums liegen davor: sie werden Weg, wenn ein Weg anschließt; dann zählt das Feld dahinter
    if(alt[ko]){ko=nb(ko,dn);if(ko<0)continue}
    if(gehbar(ko,h0)){weg++;var o2=nb(ko,dn),o3=o2>=0?nb(o2,dn):-1;if(o2>=0&&o3>=0&&gehbar(o2,h0)&&gehbar(o3,h0))haupt++}}
   if(weg<2)return;
   C.push({v:20*(196-FW*FH)+2*(L-weg)+(L-haupt)+(ox+oy),F:F,h0:h0})})}
 C.sort(function(a,b){return a.v-b.v});
 var best=null,bh=0;for(var c=0;c<C.length&&!best;c++){var F=C[c].F,sp=new Uint8Array(WW);bh=C[c].h0;
  for(y=F.j;y<F.j+F.h;y++)for(x=F.i;x<F.i+F.w;x++){var a2=forumArtF(F,x,y);if(a2!=='platz'&&a2!=='gang')sp[y*W+x]=1}
  if(stuecke(sp)<=n0)best=F}
 if(!best){st.fehl++;return}
 var h0=bh;
 // abgeschnittene Felder: Boden der Nachbarn außerhalb des Forums (Weg oder Wiese), sonst Gasse, damit kein Weg abreißt
 var neu=new Uint8Array(WW),k3;for(y=best.j;y<best.j+best.h;y++)for(x=best.i;x<best.i+best.w;x++)neu[y*W+x]=1;
 for(k3=0;k3<WW;k3++)if(alt[k3]&&!neu[k3]){var z={},bz=null;for(var e3=0;e3<4;e3++){var q3=nb(k3,e3);if(q3<0||alt[q3]||belegt[q3]||lv(q3)!==lv(k3))continue;var c3=Z[q3];
   if(c3==='g'||c3==='o'||c3==='s'){z[c3]=(z[c3]||0)+1;if(!bz||z[c3]>z[bz])bz=c3}}Z[k3]=bz||(lv(k3)===h0?'s':'g')}
 // N6b4b2: abgeschnittene Felder, die als Gasse nur über gesperrte Forumsfelder (Läden, Bühne, Statue) hingen, werden Wiese (sonst ein abgerissenes Wegstück, at3-n6b3c1)
 (function(){var sp4=new Uint8Array(WW),x4,y4;for(y4=best.j;y4<best.j+best.h;y4++)for(x4=best.i;x4<best.i+best.w;x4++){var a4=forumArtF(best,x4,y4);if(a4!=='platz'&&a4!=='gang')sp4[y4*W+x4]=1}
  var seen=new Uint8Array(WW);for(var k4=0;k4<WW;k4++){if(!alt[k4]||neu[k4]||seen[k4]||!WEG[Z[k4]]||belegt[k4])continue;var L4=[k4],h4=0,nurAlt=true;seen[k4]=1;
   while(h4<L4.length){var c4=L4[h4++];if(!alt[c4]||neu[c4])nurAlt=false;for(var e4=0;e4<4;e4++){var m4=nb(c4,e4);if(m4<0||seen[m4]||sp4[m4]||belegt[m4]||!WEG[Z[m4]]||Math.abs(lv(m4)-lv(c4))>1)continue;seen[m4]=1;L4.push(m4)}}
   if(nurAlt)L4.forEach(function(c){Z[c]='g'})}})();
 var T=forumTeile(best);best.hz=h0;best.laeden=T.laden;best.gang=T.gang;best.rostra=T.rostra[0];best.statue=T.statue[0];
 s0.i=best.statue[0];s0.j=best.statue[1];   // der alte Stand steht auf dem Statuenfeld; seit N6b3c3 wird er dort nicht mehr gemalt (Reiterstandbild)
 P.zellen=Z.join('');P.forum=best;st.fest++}
// N6b3b1 Tempel auf genaue Größe (nach Maßstab, Spiegeln und Burgberg): je Tempel Lage (bis 2 Felder verschoben), Ausrichtung (Längsachse i oder j) und Eingangsseite
// (eine der beiden Schmalseiten) so wählen, dass der Grund frei ist (alter Grund oder Wiese; Bäume und Büsche darauf fallen weg) und vor dem Eingang (Feld vor der Tür, besser
// auch das Nachbarfeld) Gasse oder Platz liegt; kein fremder Eingang wird zugestellt, am Burgberg alles auf einer Stufe. Bewertung: wenig verschieben, alte Eingangsseite und Achse behalten.
// Freie alte Felder bekommen den Boden der Nachbarn auf gleicher Stufe (am Hang Wiese, wo sonst ein Weg zwei Stufen spränge). Passt nichts, bleibt der Tempel wie er war (P.tempel.fehl, Baukasten-Bild). Rechnung je Tempel ~100 Lagen × Fläche.
function tempelFest(P,opt){var B=BIOME[P.biom],rel=opt.religion||REL_BIOM[P.biom]||null,st={n:0,fest:0,fehl:0,gross:0};
 var tem=P.bauten.filter(function(b){return b.id==='temple'});P.religion=rel;if(!tem.length){P.tempel=st;return}
 var gross=null;if((P.g|0)>=TEMPEL_GROSS_AB)tem.forEach(function(b){if(!gross||b.w*b.h>gross.w*gross.h)gross=b});
 var Z=P.zellen.split('');
 tem.forEach(function(b){st.n++;var T=b===gross?TEMPEL.gross:TEMPEL.klein;
  b.rel=rel;if(b===gross)b.gross=1;
  // Schmalseiten: Achse j → Nord (0,−1) und Süd (0,1), Mitte i0 + s/2; Achse i → West und Ost, Mitte j0 + s/2
  if(!festLage(P,Z,b,[{ax:'j',w:T.s,h:T.l,s:[[0,-1],[0,1]]},{ax:'i',w:T.l,h:T.s,s:[[-1,0],[1,0]]}])){st.fehl++;return}
  st.fest++;if(b.gross)st.gross++});
 P.zellen=Z.join('');P.tempel=st}
// Gemeinsamer Zuschnitt für Ganzbild-Gebäude (Tempel N6b3b1, Theater N6b3d): Lage bis 2 Felder verschoben, je Kandidat k = {ax, w, h, s: Eingangsseiten};
// Eingang mittig an der Seite (Seite längs i: Mitte i0 + w/2, längs j: j0 + h/2). Grund frei (alter Grund oder Wiese, Bäume fallen weg), Feld vor der Tür gehbar
// (Gasse, Platz, Marmor; keine gesperrten Forumsfelder), kein fremder Eingang zugestellt, alles auf einer Stufe. Bewertung: wenig verschieben, Nachbarfeld der Tür
// gehbar, alte Eingangsseite und alte Längsachse behalten. Setzt b (i, j, w, h, tuer, achse) und Z; false, wenn nichts passt (b bleibt wie es war).
function festLage(P,Z,b,kand){var W=P.W,WW=W*W,HZ=P.hoehe,B=BIOME[P.biom],belegt=new Int32Array(WW).fill(-1),vor={};
 var weich={'lager-platz':1};(B.baeume||[]).forEach(function(id){weich[id]=1});
 var ding={};P.dinge.forEach(function(d,n){ding[d.j*W+d.i]=n});
 var lv=function(k){return HZ?HZ.charCodeAt(k)-48:0};
 P.bauten.forEach(function(o,n){if(o===b)return;for(var y=Math.max(0,o.j);y<Math.min(W,o.j+o.h);y++)for(var x=Math.max(0,o.i);x<Math.min(W,o.i+o.w);x++)belegt[y*W+x]=n;
  if(o.tuer){var fx=o.tuer[0]+o.tuer[2],fy=o.tuer[1]+o.tuer[3];if(fx>=0&&fy>=0&&fx<W&&fy<W)vor[fy*W+fx]=1}});
 var alt=new Uint8Array(WW);for(var y0=b.j;y0<b.j+b.h;y0++)for(var x0=b.i;x0<b.i+b.w;x0++)alt[y0*W+x0]=1;
 var h0=lv(b.j*W+b.i),cx=b.i+b.w/2,cy=b.j+b.h/2,achse0=b.w>b.h?'i':b.h>b.w?'j':null,d0=b.tuer?[b.tuer[2],b.tuer[3]]:null,best=null,FO=P.forum;
 var grund=function(k){if(belegt[k]>=0||vor[k]||lv(k)!==h0)return false;if(alt[k])return true;if(Z[k]!=='g')return false;
  var dn=ding[k];return dn==null||!!weich[P.dinge[dn].id]};
 var gehbar=function(k){if(belegt[k]>=0||lv(k)!==h0||!(Z[k]==='s'||Z[k]==='o'||Z[k]==='m')||ding[k]!=null)return false;
  if(FO){var x=k%W,y=(k/W)|0;if(x>=FO.i&&y>=FO.j&&x<FO.i+FO.w&&y<FO.j+FO.h){var fa=forumArt(P,x,y);if(fa!=='platz'&&fa!=='gang')return false}}return true};
 kand.forEach(function(K){var w=K.w,h=K.h,ax=w>h?'i':h>w?'j':K.ax,bi=Math.round(cx-w/2),bj=Math.round(cy-h/2);
  for(var dy=-2;dy<=2;dy++)for(var dx=-2;dx<=2;dx++){var i0=bi+dx,j0=bj+dy,ok=i0>=0&&j0>=0&&i0+w<=W&&j0+h<=W;
   for(var y=j0;y<j0+h&&ok;y++)for(var x=i0;x<i0+w&&ok;x++)if(!grund(y*W+x))ok=false;if(!ok)continue;
   K.s.forEach(function(d){var ns=d[1]!==0,m=ns?i0+(w>>1):j0+(h>>1),fx,fy,ok2;
    var vf=function(q){if(ns){fx=m+q;fy=d[1]<0?j0-1:j0+h}else{fy=m+q;fx=d[0]<0?i0-1:i0+w}return fx>=0&&fy>=0&&fx<W&&fy<W&&gehbar(fy*W+fx)};
    if(!vf(0))return;ok2=vf(-1);var v=2*(Math.abs(dx)+Math.abs(dy))+(ok2?0:1)+(d0&&(d0[0]!==d[0]||d0[1]!==d[1])?1:0)+(achse0&&achse0!==ax?3:0);
    if(!best||v<best.v)best={v:v,i:i0,j:j0,w:w,h:h,d:d,tuer:ns?[m,d[1]<0?j0:j0+h-1,0,d[1]]:[d[0]<0?i0:i0+w-1,m,d[0],0]}})}});
 if(!best)return false;
 var neu=new Uint8Array(WW),k;for(var y1=best.j;y1<best.j+best.h;y1++)for(var x1=best.i;x1<best.i+best.w;x1++){k=y1*W+x1;neu[k]=1;if(ding[k]!=null)P.dinge[ding[k]]=null}
 for(k=0;k<WW;k++)if(alt[k]&&!neu[k]){var i=k%W,j=(k/W)|0,z={},bz=null,sprung=0;[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(e){var x=i+e[0],y=j+e[1];if(x<0||y<0||x>=W||y>=W)return;var q=y*W+x;
   if(alt[q]||neu[q]||belegt[q]>=0)return;var c=Z[q];if(c==='g'||c==='o'||c==='m'||c==='s'){if(c!=='g'&&Math.abs(lv(q)-lv(k))>1)sprung=1;if(lv(q)!==lv(k))return;z[c]=(z[c]||0)+1;if(!bz||z[c]>z[bz])bz=c}});
  Z[k]=bz&&bz!=='s'&&!sprung?bz:'g'}
 b.i=best.i;b.j=best.j;b.w=best.w;b.h=best.h;b.tuer=best.tuer;b.achse=best.w>best.h?'i':'j';
 P.dinge=P.dinge.filter(function(d){return d});return true}
// N6b3d Theater (Thomas 23.11.2026): nur Biome mit Pflaster (Mittelmeer), genau 12 × 9 Bildfelder (Bühnenhaus 12 breit an der Langseite, Halbrund Radius 6 dahinter).
// Eingang = Tor mitten in der Rückwand des Bühnenhauses an der Gasse (Langseite), das Halbrund zeigt in den Block. Zuschnitt wie der Tempel (festLage).
// Passt nichts, bleibt das Baukastenbild (P.theater.fehl). Notausschalter opt.theater:false.
var THEATER={l:12,s:9,hoch:200},THEATER_PLAN=[8,7];   // im Plan vor dem Maßstab 1,5: 8 × 7 → 12 × 10–11, dann auf 12 × 9 zugeschnitten
function theaterFest(P,opt){var st={n:0,fest:0,fehl:0};P.theater=st;var B=BIOME[P.biom];if(!B||!B.pflaster)return;
 var th=P.bauten.filter(function(b){return b.id==='theatre'});if(!th.length)return;var Z=P.zellen.split('');
 th.forEach(function(b){st.n++;
  if(!festLage(P,Z,b,[{ax:'i',w:THEATER.l,h:THEATER.s,s:[[0,-1],[0,1]]},{ax:'j',w:THEATER.s,h:THEATER.l,s:[[-1,0],[1,0]]}])){st.fehl++;return}
  st.fest++});
 P.zellen=Z.join('')}
// Ganzbild des Theaters: Langseite längs i (Tor Süd = vorn, Halbrund nach Norden; Tor Nord = hinten), längs j eigene Bilder '-i' (Tor Ost = vorn, West = hinten).
function theaterGanz(b){if(b.id!=='theatre'||!b.tuer)return null;var sp=b.h>b.w;
 if(sp?b.w!==THEATER.s||b.h!==THEATER.l:b.w!==THEATER.l||b.h!==THEATER.s)return null;var d=sp?b.tuer[2]:b.tuer[3];if(!d||(sp?b.tuer[3]:b.tuer[2]))return null;
 return{id:'theater-'+(d>0?'vorn':'hinten'),spiegel:sp,rel:null,theater:1}}
// N6b3e1 Statthalterpalast (Thomas 23.11.2026): nur Biome mit Pflaster (Mittelmeer), genau 9 × 9 Bildfelder (liegt im Plan schon so), Säulenhof-Palast mit
// Portikus; Portal mittig an einer Seite mit Weg davor (Zuschnitt festLage). Wechselschild Wappenbanner (b.herr, jetzt Platzhalter „ohne“, Herrscherwechsel N9).
// Passt nichts, bleibt das Baukastenbild (P.statthalter.fehl). Notausschalter opt.statthalter:false.
var STATTHALTER={s:9,hoch:150};
function statthalterFest(P,opt){var st={n:0,fest:0,fehl:0};P.statthalter=st;var B=BIOME[P.biom];if(!B||!B.pflaster)return;
 var gv=P.bauten.filter(function(b){return b.id==='governor'});if(!gv.length)return;var Z=P.zellen.split(''),S=STATTHALTER.s;
 gv.forEach(function(b){st.n++;if(!festLage(P,Z,b,[{ax:'j',w:S,h:S,s:[[0,-1],[0,1]]},{ax:'i',w:S,h:S,s:[[-1,0],[1,0]]}])){st.fehl++;return}b.statthalter=1;st.fest++});
 P.zellen=Z.join('')}
// Ganzbild: Portal Süd = vorn, Nord = hinten (Zeichnungen längs j); Portal Ost/West eigene Bilder '-i'.
function statthalterGanz(b){if(b.id!=='governor'||!b.tuer||!b.statthalter||b.w!==STATTHALTER.s||b.h!==STATTHALTER.s)return null;var sp=b.tuer[2]!==0,d=sp?b.tuer[2]:b.tuer[3];if(!d||(sp&&b.tuer[3]))return null;
 return{id:'statthalter-'+(d>0?'vorn':'hinten'),spiegel:sp,rel:null,schild:'statthalter-',herr:b.herr||null}}
// N6b3e2 Senat (Thomas 23.11.2026): nur Biome mit Pflaster (Mittelmeer), genau 8 × 9 Bildfelder (liegt im Plan als 7–9 × 7–9), Curia mit Säulenvorhof;
// Tor mittig an der Schmalseite mit Weg davor (Zuschnitt festLage). Wechselschild Fraktionsbanner (b.frak, jetzt Platzhalter „ohne“, Machtwechsel N9).
// Passt nichts, bleibt das Baukastenbild (P.senat.fehl). Notausschalter opt.senat:false.
var SENAT={l:9,s:8,hoch:185},SENAT_PLAN=[6,6];   // im Plan vor dem Maßstab 1,5: 6 × 6 → 9 × 9, dann auf 8 × 9 zugeschnitten
function senatFest(P,opt){var st={n:0,fest:0,fehl:0};P.senat=st;var B=BIOME[P.biom];if(!B||!B.pflaster)return;
 var se=P.bauten.filter(function(b){return b.id==='senate'});if(!se.length)return;var Z=P.zellen.split('');
 se.forEach(function(b){st.n++;if(!festLage(P,Z,b,[{ax:'j',w:SENAT.s,h:SENAT.l,s:[[0,-1],[0,1]]},{ax:'i',w:SENAT.l,h:SENAT.s,s:[[-1,0],[1,0]]}])){st.fehl++;return}b.senat=1;st.fest++});
 P.zellen=Z.join('')}
// Ganzbild: Längsachse j (Tor Süd = vorn, Nord = hinten), Längsachse i eigene Bilder '-i' (Tor Ost = vorn, West = hinten).
function senatGanz(b){if(b.id!=='senate'||!b.tuer||!b.senat)return null;var sp=b.w>b.h;
 if(sp?b.w!==SENAT.l||b.h!==SENAT.s:b.w!==SENAT.s||b.h!==SENAT.l)return null;var d=sp?b.tuer[2]:b.tuer[3];if(!d||(sp?b.tuer[3]:b.tuer[2]))return null;
 return{id:'senat-'+(d>0?'vorn':'hinten'),spiegel:sp,rel:null,schild:'senat-',herr:b.frak||null}}
// N6b3e3 Königspalast (Thomas 23.11.2026): nur Biome mit Pflaster (Mittelmeer), nur Hauptstädte, genau 15 × 15 Bildfelder (liegt im Plan schon so),
// Palastanlage mit Kuppel (Mauer, Torbau, Ehrenhof, Thronsaal, Flügel, Garten); Tor mittig an einer Seite mit Weg davor (Zuschnitt festLage).
// Wechselschild Königsbanner (b.herr, jetzt Platzhalter „ohne“, Herrscherwechsel N9). Budgetgruppe „Prunkbauten“ (1 MB je Datei, Thomas).
// Passt nichts, bleibt das Baukastenbild (P.koenigspalast.fehl). Notausschalter opt.koenigspalast:false.
var KOENIGSPALAST={s:15,hoch:150};
function koenigspalastFest(P,opt){var st={n:0,fest:0,fehl:0};P.koenigspalast=st;var B=BIOME[P.biom];if(!B||!B.pflaster)return;
 var kp=P.bauten.filter(function(b){return b.id==='royal-palace'});if(!kp.length)return;var Z=P.zellen.split(''),S=KOENIGSPALAST.s;
 kp.forEach(function(b){st.n++;if(!festLage(P,Z,b,[{ax:'j',w:S,h:S,s:[[0,-1],[0,1]]},{ax:'i',w:S,h:S,s:[[-1,0],[1,0]]}])){st.fehl++;return}b.koenigspalast=1;st.fest++});
 P.zellen=Z.join('')}
// Ganzbild: Tor Süd = vorn, Nord = hinten (Zeichnungen längs j); Tor Ost/West eigene Bilder '-i'.
function koenigspalastGanz(b){if(b.id!=='royal-palace'||!b.tuer||!b.koenigspalast||b.w!==KOENIGSPALAST.s||b.h!==KOENIGSPALAST.s)return null;var sp=b.tuer[2]!==0,d=sp?b.tuer[2]:b.tuer[3];if(!d||(sp&&b.tuer[3]))return null;
 return{id:'koenigspalast-'+(d>0?'vorn':'hinten'),spiegel:sp,rel:null,schild:'koenigspalast-',herr:b.herr||null}}
// N6b4c4 Weinpresse und Ölmühle (Thomas 23.11.2026): nur Biome mit Pflaster (Mittelmeer), genau 4 × 5 Bildfelder (im Plan vor dem Maßstab 1,5 als 3 × 4, danach 4–5 × 6),
// halb offene Ziegeldach-Halle mit Hebelpresse und offenem Hof (Tretbecken und Dolien bzw. Steinmühle und Klärbecken); Tor mittig an der Schmalseite mit Weg
// davor (Zuschnitt festLage). Passt nichts, bleibt das Baukastenbild (P.presse.fehl). Notausschalter opt.presse:false (auch für die kleine Presse am Gutshof).
var PRESSE={s:4,l:5,hoch:90},PRESSE_PLAN=[3,4],PRESSE_ID={winepress:'weinpresse','oil-press':'oelmuehle'};
function presseFest(P,opt){var st={n:0,fest:0,fehl:0};P.presse=st;var B=BIOME[P.biom];if(!B||!B.pflaster)return;
 var pr=P.bauten.filter(function(b){return PRESSE_ID[b.id]});if(!pr.length)return;var Z=P.zellen.split('');
 pr.forEach(function(b){st.n++;if(!festLage(P,Z,b,[{ax:'j',w:PRESSE.s,h:PRESSE.l,s:[[0,-1],[0,1]]},{ax:'i',w:PRESSE.l,h:PRESSE.s,s:[[-1,0],[1,0]]}])){st.fehl++;return}b.pressfest=1;st.fest++});
 P.zellen=Z.join('')}
// Ganzbild: Längsachse j (Tor Süd = vorn, Nord = hinten), Längsachse i eigene Bilder '-i' (Tor Ost = vorn, West = hinten).
function presseGanz(b){if(!PRESSE_ID[b.id]||!b.tuer||!b.pressfest)return null;var sp=b.w>b.h;
 if(sp?b.w!==PRESSE.l||b.h!==PRESSE.s:b.w!==PRESSE.s||b.h!==PRESSE.l)return null;var d=sp?b.tuer[2]:b.tuer[3];if(!d||(sp?b.tuer[3]:b.tuer[2]))return null;
 return{id:PRESSE_ID[b.id]+'-'+(d>0?'vorn':'hinten'),spiegel:sp,rel:null}}
// Kleine Presse am Gutshof: Gutshof (Mittelmeer) mit Weinberg bzw. Olivenhain, die größere Fläche entscheidet (gleich: Wein). b.hp = 'wein' | 'oel'.
function hofPresse(hofart,ku){if(hofart!=='villa-rustica'||!ku)return null;var w=ku.vineyard|0,o=ku['olive-grove']|0;return w||o?(w>=o?'wein':'oel'):null}
// N6b3b4 Ehrensäulen (Thomas 23.11.2026): nur Biome mit Pflaster (Mittelmeer), ab Marktflecken auf dem Marktplatz, Marktflecken 1, Stadt 2, ab Großstadt 3.
// Markt = größte zusammenhängende Platzfläche (o) mit einem Marktstand. Stelle: zweite Reihe vom Platzrand (die äußere Reihe bleibt zum Gehen frei),
// kein Ding darauf, nicht vor oder neben einem Eingang, mindestens EHREN_ABSTAND Felder auseinander; die freien Platzfelder bleiben zusammenhängend.
// Art aus dem Seed (Statue 1/2, gestürzt 1/4, Schande 1/4); Vorderseite zum nächsten Platzrand: Rand längs i → Bild ohne -i, längs j → -i.
// Kosten: einmal je Ort, nur über die Marktfläche (≤ ~600 Felder).
var EHREN_ART=['statue','statue','gestuerzt','schande'],EHREN_ABSTAND=5;
function ehrensaeulen(P){var B=BIOME[P.biom],st={soll:0,gesetzt:0};P.ehrensaeulen=st;if(!B||!B.pflaster||(P.g|0)<MAUER_AB)return;
 st.soll=P.g>=6?3:P.g===5?2:1;var W=P.W,WW=W*W,Z=P.zellen,HZ=P.hoehe,ding=new Uint8Array(WW),start=[];
 P.dinge.forEach(function(d){if(d.i<0||d.j<0||d.i>=W||d.j>=W)return;var k=d.j*W+d.i;ding[k]=1;if(d.id==='markt-stand'&&d.rolle==='market'&&Z[k]==='o')start.push(k)});
 if(!start.length)return;
 var vor=new Uint8Array(WW);P.bauten.forEach(function(b){if(!b.tuer)return;var fx=b.tuer[0]+b.tuer[2],fy=b.tuer[1]+b.tuer[3];if(fx>=0&&fy>=0&&fx<W&&fy<W)vor[fy*W+fx]=1});
 var nb=function(k,d){var x=k%W,y=(k/W)|0;return d===0?(x<W-1?k+1:-1):d===1?(y<W-1?k+W:-1):d===2?(x>0?k-1:-1):(y>0?k-W:-1)};
 // Platzflächen von den Marktständen aus, die größte gilt
 var comp=new Int32Array(WW).fill(-1),best=-1,bestN=0,nr=0;start.forEach(function(s0){if(comp[s0]>=0)return;var q=[s0],h=0;comp[s0]=nr;
  while(h<q.length){var a=q[h++];for(var d=0;d<4;d++){var b=nb(a,d);if(b>=0&&comp[b]<0&&Z[b]==='o'){comp[b]=nr;q.push(b)}}}if(q.length>bestN){bestN=q.length;best=nr}nr++});
 var M=[],dist=new Int32Array(WW).fill(-1),q=[],h=0,k,d;for(k=0;k<WW;k++)if(comp[k]===best){M.push(k);for(d=0;d<4;d++){var b=nb(k,d);if(b<0||comp[b]!==best){dist[k]=0;q.push(k);break}}}
 while(h<q.length){var a=q[h++];for(d=0;d<4;d++){var b2=nb(a,d);if(b2>=0&&comp[b2]===best&&dist[b2]<0){dist[b2]=dist[a]+1;q.push(b2)}}}
 var frei=function(k){return comp[k]===best&&!ding[k]};
 var stuecke=function(){var v=new Uint8Array(WW),n=0;M.forEach(function(s0){if(v[s0]||!frei(s0))return;n++;var qq=[s0],hh=0;v[s0]=1;while(hh<qq.length){var a=qq[hh++];for(var e=0;e<4;e++){var b=nb(a,e);if(b>=0&&!v[b]&&frei(b)){v[b]=1;qq.push(b)}}}});return n};
 var seed=P.seed>>>0,C=M.filter(function(k){if(dist[k]!==1||ding[k]||vor[k])return false;for(var e=0;e<4;e++){var b=nb(k,e);if(b>=0&&vor[b])return false}return true});
 C.sort(function(x,y){return rausch(x%W,(x/W)|0,seed+151)-rausch(y%W,(y/W)|0,seed+151)});
 var n0=stuecke(),gesetzt=[];
 for(var c=0;c<C.length&&gesetzt.length<st.soll;c++){k=C[c];var x=k%W,y=(k/W)|0;
  if(gesetzt.some(function(o){return Math.max(Math.abs(o%W-x),Math.abs(((o/W)|0)-y))<EHREN_ABSTAND}))continue;
  ding[k]=1;if(stuecke()>n0){ding[k]=0;continue}gesetzt.push(k);
  var art=EHREN_ART[Math.floor(rausch(x,y,seed+152)*EHREN_ART.length)],lj=false,li=false;
  for(var e2=0;e2<4;e2++){var b3=nb(k,e2);if(b3>=0&&dist[b3]===0){if(e2&1)lj=true;else li=true}}
  var achseI=li&&!lj?true:lj&&!li?false:rausch(x,y,seed+153)<.5;
  P.dinge.push({id:'ehrensaeule-'+art+(achseI?'-i':''),i:x,j:y,rolle:'ehrensaeule',hz:HZ?HZ.charCodeAt(k)-48:0})}
 st.gesetzt=gesetzt.length}
// Ganzbild eines Tempels: Zeichnungen für Längsachse j (Eingang vorn = Süd, zum Betrachter; hinten = Nord); Längsachse i = gespiegelt (Eingang Ost bzw. West).
// null, wenn der Tempel nicht genau passt (dann Baukasten-Bild).
function tempelGanz(b){if(b.id!=='temple'||!b.tuer)return null;var T=b.gross?TEMPEL.gross:TEMPEL.klein,sp=b.w>b.h;
 if(sp?b.w!==T.l||b.h!==T.s:b.w!==T.s||b.h!==T.l)return null;var d=sp?b.tuer[2]:b.tuer[3];if(!d||(sp?b.tuer[3]:b.tuer[2]))return null;
 return{id:'tempel-'+(b.gross?'gross':'klein')+'-'+(d>0?'vorn':'hinten'),spiegel:sp,rel:b.rel||null}}
// Umwidmen (Wunsch Thomas 23.11.2026): neue Religion für alle Tempel oder nur den n-ten; nur das Wechselschild ändert sich. Danach das Ortsbild neu bauen.
function tempelUmwidmen(P,rel,n){var c=0;P.bauten.filter(function(b){return b.id==='temple'}).forEach(function(b,k){if(n==null||n===k){if(b.rel!==rel)c++;b.rel=rel}});
 if(n==null)P.religion=rel;return c}
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
//  · Türme 3 × 3 ganz auf der Mauer: zuerst je zwei an jedem Tor, dann reihum etwa alle TURM_AB Felder. N6b2e2t (ersetzt die Rampen aus N6b2e1): der Gang
//    führt auf Geschosshöhe durch Gangtüren in den Turm (Fläche 'turm'), die Plattform liegt TURM_H Stufen darüber (innere Treppe in der Turmmitte, nur Daten),
//    unten eine Erdgeschosstür zur Gasse; Höhenwechsel im Gang (Burgberg) sind Rampen längs des Gangs, nie auf die Zinnen zu.
//  · Treppen innen: 4 Felder in der inneren Mauerreihe an der Ringgasse (Felstreppen des Burgbergs), davor eine Nische (inneres Mauerfeld frei, Weg), sodass
//    man von der Gasse in die Nische und geradeaus hinaufgeht; oben geht der Gang weiter.
//    N6b2e2t: Treppen nur noch an den Türmen; wo keine gerade Treppe passt, ist die Erdgeschosstür der Aufgang. Weitere nur für Gangstücke ohne Aufgang.
//  · Zinnen nur an der Außenkante der Mauer, am Turm rings um die Plattform (nie quer über den Gang).
// P.wehr (Begehbarkeit als Daten für First Person und Kampf): Zeichenketten je Bildfeld wie P.zellen: art ('.' nichts, m Mauer, t Tor, T Turm, r Treppe,
// n Nische), gang (Höhe als Zeichen 48 + Stufe; Turm: Plattform = Gang + TURM_H; Nische: Boden), stufe (Richtung, in die das Feld eine Stufe steigt), zinne
// (Bits s1 o2 n4 w8, hex); tuerme [[i, j, Plattformhöhe]] (obere Ecke des 3 × 3), treppen [{felder, s, nische, gasse, unten, oben}]. Übergänge: Gasse ↔ Nische
// (Boden), Nische ↔ Treppenfuß (wehrNachbarn). Bild: je Feld vorgezeichnete Teile (Wandstück je Stufe und Vorderkante, Wehrgang, Zinnen), Kosten wie beim Burgberg.
// N6b2e2a (Thomas 22.11.2026, „neu rechnen“): Mauerlinie direkt in Bildfeldern aus dem Umriss statt aus dem vergrößerten Plan (gleichmäßige 45°-Stufen statt
// 1-2-1-Zacken). Band = innen und höchstens MAUER_BILD Schritte (4 Richtungen) bis draußen. Häuser, Dinge, Wasser und Gassen außerhalb des alten Bands bleiben
// unangetastet (dort bleibt die alte Mauer), Tore laufen längs ihrer Straße durch das neue Band.
var MAUER_BILD=3,TOR_GERADE=3;
function mauerRund(P,UM,R,Wc,sp,gerade){   // Thomas 22.11.2026: Tore in geraden Stücken; wird die Mauer an einem Tor dadurch undicht, bleibt dieses Tor wie vorher
 var ohne={alle:gerade===false,n:0};if(mauerRund0(P,UM,R,Wc,sp,ohne)!==false||ohne.alle)return;
 for(var g=0;g<ohne.n;g++){ohne[g]=1;if(mauerRund0(P,UM,R,Wc,sp,ohne)!==false)return}}
function mauerRund0(P,UM,R,Wc,sp,ohne){var W=P.W,WW=W*W,F=P.mass||1,Z=P.zellen.split(''),k,i,j,d;
 var MI=new Uint8Array(WW);for(j=0;j<W;j++)for(i=0;i<W;i++){var a=sp?j:i,b=sp?i:j;MI[j*W+i]=UM.innen(((a+.5)/F-R)/Wc*2-1,((b+.5)/F-R)/Wc*2-1)?1:0}
 var N4=function(k){var x=k%W,y=(k/W)|0;return[x<W-1?k+1:-1,y<W-1?k+W:-1,x>0?k-1:-1,y>0?k-W:-1]};
 var alt=new Uint8Array(WW),bau=new Uint8Array(WW),ding=new Uint8Array(WW),MO=innenMaske(P),B=BIOME[P.biom],baum={};(B&&B.baeume||[]).forEach(function(x){baum[x]=1});
 P.bauten.forEach(function(b){for(var y=Math.max(0,b.j);y<Math.min(W,b.j+b.h);y++)for(var x=Math.max(0,b.i);x<Math.min(W,b.i+b.w);x++)(b.rolle==='mauer'?alt:bau)[y*W+x]=1});
 P.dinge.forEach(function(o){if(o.i>=0&&o.j>=0&&o.i<W&&o.j<W)ding[o.j*W+o.i]=baum[o.id]?1:2});
 // Tore: zusammenhängende alte Torfelder; Achse = Richtung, in der die Straße (oder der Fluss) auf beiden Seiten weitergeht
 var MT=P.mauertor,torAlt=function(k){return MT&&MT.charCodeAt(k)===49},SW=/[sw]/,gruppen=[],seen=new Uint8Array(WW);
 for(k=0;k<WW;k++){if(!torAlt(k)||seen[k])continue;var T=[],st=[k];seen[k]=1;while(st.length){var c=st.pop();T.push(c);N4(c).forEach(function(x){if(x>=0&&torAlt(x)&&!seen[x]){seen[x]=1;st.push(x)}})}
  var inT={};T.forEach(function(x){inT[x]=1});var zahl=[0,0];T.forEach(function(x){var n=N4(x);[0,1].forEach(function(ax){[n[ax],n[ax+2]].forEach(function(y){if(y>=0&&!inT[y]&&SW.test(Z[y]))zahl[ax]++})})});
  gruppen.push({T:T,ax:zahl[1]>=zahl[0]?1:0})}
 // Thomas 22.11.2026: Tore nur in geraden Mauerstücken (später Torhäuser). Quer zur Straße über Tor + je TOR_GERADE Felder wird der Umriss gerade
 // (Grenze auf der Höhe der Tormitte), an beiden Enden springt er mit einem Absatz zurück auf die Schräge.
 var fenster=new Uint8Array(WW),FREI=/[gxfp]/;   // im Torfenster darf die gerade Mauer auch über Acker und Weide laufen
 ohne.n=gruppen.length;gruppen.forEach(function(G,gi){if(ohne.alle||ohne[gi])return;var ax=G.ax,L=function(x){return ax?x%W:(x/W)|0},A=function(x){return ax?(x/W)|0:x%W},
   id=function(l,a){return ax?a*W+l:l*W+a},l0=1e9,l1=-1,as=0;G.T.forEach(function(x){l0=Math.min(l0,L(x));l1=Math.max(l1,L(x));as+=A(x)});var a0=Math.round(as/G.T.length),lm=(l0+l1)>>1;
  var mi=function(l,a){return l>=0&&a>=0&&l<W&&a<W?MI[id(l,a)]:0},dir=mi(lm,a0-8)&&!mi(lm,a0+8)?1:!mi(lm,a0-8)&&mi(lm,a0+8)?-1:0;if(!dir)return;
  var grenze=function(l){var best=-1,bd=1e9;for(var a=a0-14;a<=a0+14;a++)if(mi(l,a)&&!mi(l,a+dir)&&Math.abs(a-a0)<bd){bd=Math.abs(a-a0);best=a}return best},bz=grenze(lm);if(bz<0)return;
  // Lage der Geraden: zwischen der innersten und äußersten Grenze im Fenster die, auf der am wenigsten Belegtes liegt (Ringgasse innen, Acker, Höfe
  // und Buden außen), bei Gleichstand die nächste an der Tormitte
  var lA=Math.max(0,l0-TOR_GERADE),lB=Math.min(W-1,l1+TOR_GERADE),bs=[],bmin=bz,bmax=bz;for(var l=lA;l<=lB;l++){bs[l]=grenze(l);if(bs[l]>=0){bmin=Math.min(bmin,bs[l]);bmax=Math.max(bmax,bs[l])}}
  for(l=lA;l<=lB;l++)for(var a1=Math.max(0,a0-14);a1<=Math.min(W-1,a0+14);a1++)fenster[id(l,a1)]=1;
  var frei=function(x){return alt[x]||(!bau[x]&&ding[x]!==2&&FREI.test(Z[x]))},beste=bz,bk=1e9;
  for(var c=bmin;c<=bmax;c++){var kost=0;for(l=lA;l<=lB;l++){if(l>=l0&&l<=l1)continue;for(var t=0;t<MAUER_BILD;t++){var a2=c-t*dir;if(a2<0||a2>=W||!frei(id(l,a2)))kost++}}
   if(kost<bk||(kost===bk&&Math.abs(c-bz)<Math.abs(beste-bz))){bk=kost;beste=c}}
  bz=beste;G.gerade={lA:lA,lB:lB,bz:bz,dir:dir,id:id};
  for(l=lA;l<=lB;l++){var b=bs[l];if(b<0)continue;
   for(var a=Math.min(b,bz)-1;a<=Math.max(b,bz)+1;a++)if(a>=0&&a<W)MI[id(l,a)]=(a-bz)*dir<=0?1:0}});
 var D=new Int32Array(WW).fill(1e9),q=[],h=0;for(k=0;k<WW;k++){if(!MI[k])continue;var n0=N4(k);if(n0.some(function(x){return x<0||!MI[x]})){D[k]=1;q.push(k)}}
 while(h<q.length){var a2=q[h++],nn=N4(a2);for(d=0;d<4;d++){var b2=nn[d];if(b2>=0&&MI[b2]&&D[b2]>D[a2]+1){D[b2]=D[a2]+1;q.push(b2)}}}
 var band=function(k){return MI[k]&&D[k]<=MAUER_BILD};
 // Tore längs der Achse durch das neue Band (auch wenn das gerade Stück vor oder hinter den alten Torfeldern liegt: der Straße bis 12 Felder folgen)
 var tor=new Uint8Array(WW);
 gruppen.forEach(function(G){var T=G.T,ax=G.ax,step=ax?W:1;
  T.forEach(function(x){if(band(x))tor[x]=1;[step,-step].forEach(function(sv){var y=x+sv,z2=0;while(y>=0&&y<WW&&(ax||((y/W)|0)===((x/W)|0))&&z2++<12&&(torAlt(y)||SW.test(Z[y]))&&!bau[y]){if(band(y))tor[y]=1;y+=sv}})})});
 for(k=0;k<WW;k++)if(band(k)&&Z[k]==='w')tor[k]=1;
 // neue Mauer: Band nur auf alter Mauer oder freiem Boden (Gras, Fels, Feld mit Baum); Gassen, Straßen, Häuser, Dinge und Wasser bleiben, wo sie sind.
 // Ist ein Bandfeld außerhalb der alten Mauer belegt (Hof, Elendsbude, Straße), bleibt dort im Umkreis von 2 Feldern die alte Mauer (keine Lücke, nichts
 // Belegtes landet innen). Innen belegte Bandfelder (Ringgasse, Haus) bleiben frei, die Mauer ist dort schmaler.
 var neu=new Uint8Array(WW),zu=new Uint8Array(WW),n=0;for(k=0;k<WW;k++){if(!band(k)||tor[k])continue;var c2=Z[k];
  if(alt[k]||(!bau[k]&&ding[k]!==2&&(c2==='g'||c2==='x'||(fenster[k]&&(c2==='f'||c2==='p'))))){neu[k]=1;n++}else if(!MO[k])zu[k]=1}
 if(!n)return true;
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
 // Im Torfenster nur das gerade Band: übrige alte Mauer daneben fällt weg, wenn das gerade Band in dieser Spalte ganz steht
 gruppen.forEach(function(G){var g=G.gerade;if(!g)return;for(var l=g.lA;l<=g.lB;l++){var ganz=true,t;for(t=0;t<MAUER_BILD;t++){var a=g.bz-t*g.dir;if(a<0||a>=W||!neu[g.id(l,a)]){ganz=false;break}}
   if(!ganz)continue;for(var d2=-14;d2<=14;d2++){var a2=g.bz+d2,off=d2*g.dir;if(a2<0||a2>=W||(off<=0&&off>-MAUER_BILD))continue;var k3=g.id(l,a2);if(neu[k3]&&!band(k3)&&Math.abs(off)<=MAUER_BILD+2)neu[k3]=0}}});
 // Tor genau so tief wie die Mauer daneben (wo das Band auf Acker, Hof oder Straße trifft, bleibt die alte Mauer, das Tor rückt mit)
 gruppen.forEach(function(G){var ax=G.ax,L=function(x){return ax?x%W:(x/W)|0},A=function(x){return ax?(x/W)|0:x%W},id=function(l,a){return ax?a*W+l:l*W+a},
   l0=1e9,l1=-1,as=0;G.T.forEach(function(x){l0=Math.min(l0,L(x));l1=Math.max(l1,L(x));as+=A(x)});var a0=Math.round(as/G.T.length),lo=1e9,hi=-1,alle=[],seiten=[];
  for(var l=l0;l<=l1;l++)for(var a=a0-14;a<=a0+14;a++)if(a>=0&&a<W&&tor[id(l,a)])alle.push(id(l,a));if(!alle.length)return;
  var am=0;alle.forEach(function(x){am+=A(x)});am=Math.round(am/alle.length);
  [l0-1,l1+1].forEach(function(l){if(l<0||l>=W)return;var best=-1,bd=1e9;for(var a=a0-14;a<=a0+14;a++)if(a>=0&&a<W&&neu[id(l,a)]&&Math.abs(a-am)<bd){bd=Math.abs(a-am);best=a}if(best<0)return;
   var x0=best,x1=best;while(x0-1>=0&&neu[id(l,x0-1)])x0--;while(x1+1<W&&neu[id(l,x1+1)])x1++;seiten.push([x0,x1])});if(!seiten.length)return;
  // Tiefe: wo beide Seiten Mauer haben (Schnitt), sonst beide zusammen
  lo=Math.max.apply(null,seiten.map(function(x){return x[0]}));hi=Math.min.apply(null,seiten.map(function(x){return x[1]}));
  if(lo>hi){lo=Math.min.apply(null,seiten.map(function(x){return x[0]}));hi=Math.max.apply(null,seiten.map(function(x){return x[1]}))}
  var spalte={},vorher={};alle.forEach(function(x){spalte[L(x)]=1;vorher[x]=1;tor[x]=0});
  for(l=l0;l<=l1;l++)if(spalte[l])for(a=lo;a<=hi;a++){var k2=id(l,a);if(!neu[k2]&&!bau[k2]&&(vorher[k2]||SW.test(Z[k2])))tor[k2]=1}});
 // Innenfläche = was die Mauer samt Toren einschließt (Flut vom Bildrand über alles andere)
 var aus=new Uint8Array(WW),fl=[];for(k=0;k<WW;k++){var fi=k%W,fj=(k/W)|0;if((fi===0||fj===0||fi===W-1||fj===W-1)&&!neu[k]&&!tor[k]){aus[k]=1;fl.push(k)}}
 while(fl.length){var a3=fl.pop(),n3=N4(a3);for(d=0;d<4;d++){var b3=n3[d];if(b3>=0&&!aus[b3]&&!neu[b3]&&!tor[b3]){aus[b3]=1;fl.push(b3)}}}
 var MN=new Uint8Array(WW),nin=0,nmo=0;for(k=0;k<WW;k++){if(!aus[k]){MN[k]=1;nin++}if(MO[k])nmo++}
 if(nin<nmo*.8)return false;   // Mauer nicht dicht (sollte nicht vorkommen): alles bleibt wie vorher
 for(k=0;k<WW;k++){if(neu[k]){Z[k]='g';continue}if(alt[k])Z[k]=MN[k]?'s':'g';if(tor[k]&&!SW.test(Z[k]))Z[k]='s'}
 // Bäume weichen auf der Mauer und direkt davor (freies Schussfeld; dort liegen die Halbfelder der Schrägen)
 var frei=function(x,y){if(x<0||y<0||x>=W||y>=W)return false;var kk=y*W+x;if(neu[kk])return true;if(MN[kk])return false;var nz=N4(kk);for(var q2=0;q2<4;q2++)if(nz[q2]>=0&&neu[nz[q2]])return true;return false};
 P.dinge=P.dinge.filter(function(o){return !(o.i>=0&&o.j>=0&&o.i<W&&o.j<W&&(neu[o.j*W+o.i]||(baum[o.id]&&frei(o.i,o.j))))});
 var m0=null;P.bauten=P.bauten.filter(function(b){if(b.rolle!=='mauer')return true;if(!m0)m0=b;return false});
 var HZ=P.hoehe;for(k=0;k<WW;k++)if(neu[k]){var o={rolle:'mauer',i:k%W,j:(k/W)|0,w:1,h:1,klasse:m0.klasse,dach:m0.dach,achse:'i',wand:m0.wand,dachR:m0.dachR};
  if(HZ)o.hz=HZ.charCodeAt(k)-48;P.bauten.push(o)}
 P.zellen=Z.join('');var mt='';for(k=0;k<WW;k++)mt+=tor[k]&&!neu[k]?'1':'0';P.mauertor=mt;
 var zl=[];for(j=0;j<W;j++){i=0;while(i<W){if(!MN[j*W+i]){i++;continue}var i1=i;while(i1+1<W&&MN[j*W+i1+1])i1++;zl.push(j,i,i1);i=i1+1}}P.umriss.bild=zl}
// N6b2e2g1 (Thomas 22.11.2026): jedes Straßentor genau TOR_B (3) Felder breit und MAUER_BILD tief in einem geraden Mauerstück (Tor + je TOR_GERADE Felder
// gleich tief, Platz für die Flanktürme der späteren Torhäuser). Entscheidung Thomas: passt es an der alten Stelle nicht, rückt das Tor ins nächste gerade
// Stück; das alte Tor wird zugemauert, die Straße außen 3 breit dorthin umgelegt (alter Stummel fällt weg), innen an die nächste Gasse angeschlossen.
// Kein Notbehelf: jede Stelle wird auf dichte, zusammenhängende Mauer geprüft. Wassertore folgen in N6b2e2g2. Notausschalter opt.torGerade:false.
var TOR_B=3,VERSUCHE=3,VERSUCHE_B=6,VERSUCHE_PLAN=24,ECKE_MAX=60;   // teure Versuche (mit Wegsuche) je Tor: gerades Stück suchen 3 (gemessen: Erfolg immer im 1. oder 2.; vorher bis 200, in großen Plänen bis 50 s), Schräge begradigen 6, je Plan höchstens 24
function torFelder(W,T){var x0=1e9,x1=-1,y0=1e9,y1=-1;T.forEach(function(q){var i=q%W,j=(q/W)|0;if(i<x0)x0=i;if(i>x1)x1=i;if(j<y0)y0=j;if(j>y1)y1=j});return{x0:x0,x1:x1,y0:y0,y1:y1}}
// gerade(): Tor (Felder T) ist ein Rechteck breit × MAUER_BILD tief, daneben je TOR_GERADE Spalten Mauer genau so tief; breit = TOR_B (Straße) oder beliebig (Wasser)
function torGeradeOk(W,T,istWand,breit){var b=torFelder(W,T),bw=b.x1-b.x0+1,bh=b.y1-b.y0+1;if(T.length!==bw*bh)return false;
 var seite=function(h){var lang=h?bw:bh,tief=h?bh:bw;if(tief!==MAUER_BILD||(breit&&lang!==breit))return false;
  for(var s=-1;s<=1;s+=2)for(var d=1;d<=TOR_GERADE;d++){if(h){var x=s<0?b.x0-d:b.x1+d;for(var j=b.y0;j<=b.y1;j++)if(!istWand(x,j))return false;if(istWand(x,b.y0-1)||istWand(x,b.y1+1))return false}
   else{var y=s<0?b.y0-d:b.y1+d;for(var i=b.x0;i<=b.x1;i++)if(!istWand(i,y))return false;if(istWand(b.x0-1,y)||istWand(b.x1+1,y))return false}}return true};
 return seite(true)||seite(false)}
function toreGerade(P,opt){opt=opt||{};var W=P.W,WW=W*W,Z0=P.zellen,Z=Z0.split(''),k,i,j,d;if(!P.mauertor||!P.umriss||!P.aussen)return;   // ohne Umland (aussen:false) liegt die Mauer am Bildrand: nichts zu verschieben
 var wand=new Uint8Array(WW),tor=new Uint8Array(WW),bau=new Uint8Array(WW),bauNr=new Int32Array(WW),bude=new Int32Array(WW),dsperr=new Uint8Array(WW),dbaum=new Uint8Array(WW),MN=new Uint8Array(WW),m0=null,B=BIOME[P.biom],baum={};
 (B&&B.baeume||[]).forEach(function(x){baum[x]=1});
 P.bauten.forEach(function(b){if(b.rolle==='mauer'){if(!m0)m0=b;for(var y=b.j;y<b.j+b.h;y++)for(var x=b.i;x<b.i+b.w;x++)if(x>=0&&y>=0&&x<W&&y<W)wand[y*W+x]=1}});
 for(k=0;k<WW;k++)if(P.mauertor.charCodeAt(k)===49&&!wand[k])tor[k]=1;
 // Innenfläche = was Mauer und Tore einschließen (auch wenn mauerRund die runde Linie verworfen hat)
 var N4=function(k){var x=k%W,y=(k/W)|0;return[x<W-1?k+1:-1,y<W-1?k+W:-1,x>0?k-1:-1,y>0?k-W:-1]},NB=new Int32Array(4),N4b=function(k){var x=k%W,y=(k/W)|0;NB[0]=x<W-1?k+1:-1;NB[1]=y<W-1?k+W:-1;NB[2]=x>0?k-1:-1;NB[3]=y>0?k-W:-1;return NB},   // N4b ohne neues Feld (nur in Schleifen ohne weiteren Aufruf)
  flut=function(){var a=new Uint8Array(WW),fl=[],k,d;
  for(k=0;k<WW;k++){var fi=k%W,fj=(k/W)|0;if((fi===0||fj===0||fi===W-1||fj===W-1)&&!wand[k]&&!tor[k]){a[k]=1;fl.push(k)}}
  while(fl.length){var c=fl.pop(),nn=N4b(c);for(d=0;d<4;d++){var x=nn[d];if(x>=0&&!a[x]&&!wand[x]&&!tor[x]){a[x]=1;fl.push(x)}}}return a};
 var a0f=flut();for(k=0;k<WW;k++)MN[k]=a0f[k]?0:1;
 P.bauten.forEach(function(b,bi){if(b.rolle==='mauer')return;
  for(var y2=Math.max(0,b.j);y2<Math.min(W,b.j+b.h);y2++)for(var x2=Math.max(0,b.i);x2<Math.min(W,b.i+b.w);x2++){if(b.rolle==='shack'&&!MN[y2*W+x2])bude[y2*W+x2]=bi+1;else{bau[y2*W+x2]=1;bauNr[y2*W+x2]=bi+1}}});if(!m0)return;
 // Elendsbuden draußen dürfen der neuen Straße weichen (AT3_FAHRPLAN N6b2e2g: „Elendsbuden direkt an der Mauer rücken ab“), kosten bei der Wegsuche extra
 var weg_bude={};
 // geschützt: Felder vor Türen (Zugang der Häuser und Buden), das Einfahrtsfeld P.tor und der Bildrand bleiben, wie sie sind (kein Stummel-Abriss, keine Mauer)
 var schutz=new Uint8Array(WW),tuerVon={};P.bauten.forEach(function(b,bi){if(!b.tuer||b.rolle==='mauer')return;var x=b.tuer[0]+b.tuer[2],y=b.tuer[1]+b.tuer[3];if(x>=0&&y>=0&&x<W&&y<W){schutz[y*W+x]=1;(tuerVon[y*W+x]=tuerVon[y*W+x]||[]).push(bi)}});
 for(k=0;k<WW;k++){var ri=k%W,rj=(k/W)|0;if(ri<=1||rj<=1||ri>=W-2||rj>=W-2)schutz[k]=1}if(P.tor&&P.tor.i>=0&&P.tor.j>=0&&P.tor.i<W&&P.tor.j<W)schutz[P.tor.j*W+P.tor.i]=1;
 P.dinge.forEach(function(o){if(o.i>=0&&o.j>=0&&o.i<W&&o.j<W)(o.rolle?dsperr:dbaum)[o.j*W+o.i]=1});   // lose Dinge ohne Rolle (Bäume, Büsche, Felsen, Lagerplätze, Leichen) weichen
 var istWand=function(x,y){return x>=0&&y>=0&&x<W&&y<W&&wand[y*W+x]===1};
 var ZT=function(z){var o={};z.split('').forEach(function(c){o[c]=1});return o},LAUFZ=ZT('gxfpse'),GEHZ=ZT('some'),BODEN=ZT('gxfpe'),frei=function(k){return !schutz[k]&&!bau[k]&&!bude[k]&&!dsperr[k]&&!wand[k]&&!tor[k]&&BODEN[Z[k]]===1};   // Zeichentabellen statt Regex (N6b2e2g0, gleiches Ergebnis)   // darf Mauer oder Straße werden
 // Tore als Gruppen; Wasser = mindestens ein Wasserfeld
 var gid=new Int32Array(WW).fill(-1),G=[];for(k=0;k<WW;k++){if(!tor[k]||gid[k]>=0)continue;var T=[],st=[k];gid[k]=G.length;
  while(st.length){var c=st.pop();T.push(c);N4(c).forEach(function(x){if(x>=0&&tor[x]&&gid[x]<0){gid[x]=G.length;st.push(x)}})}
  G.push({T:T,wasser:T.some(function(x){return Z[x]==='w'})})}
 // leck(): erreicht man von einem Innenfeld (ok(k)) aus über alles außer Mauer und Tor den Bildrand? Gleich wie die Flut vom Rand, aber über die
 // (kleinere) Innenfläche statt über das ganze Umland (Riesenpläne)
 var STK=new Int32Array(WW),erS=new Int32Array(WW),erN=0;   // N6b2e2g0: ein fester Stapel für leck, gebiete und die Gassensuche innen (jedes Feld höchstens einmal darauf)
 var leck=function(ok){var se=new Uint8Array(WW),sp=0,k,c,q;for(k=0;k<WW;k++)if(MN[k]&&!wand[k]&&!tor[k]&&ok(k)){se[k]=1;STK[sp++]=k}
  while(sp){c=STK[--sp];var cx2=c%W;if(cx2===0||cx2===W-1||c<W||c>=WW-W)return true;
   q=c+1;if(!se[q]&&!wand[q]&&!tor[q]){se[q]=1;STK[sp++]=q}q=c-1;if(!se[q]&&!wand[q]&&!tor[q]){se[q]=1;STK[sp++]=q}
   q=c+W;if(!se[q]&&!wand[q]&&!tor[q]){se[q]=1;STK[sp++]=q}q=c-W;if(!se[q]&&!wand[q]&&!tor[q]){se[q]=1;STK[sp++]=q}}return false};
 var komp=function(){var s=new Uint8Array(WW),n=0;for(var k=0;k<WW;k++){if(!(wand[k]||tor[k])||s[k])continue;n++;var st=[k];s[k]=1;while(st.length){var c=st.pop(),nn=N4b(c);for(var d=0;d<4;d++){var x=nn[d];if(x>=0&&!s[x]&&(wand[x]||tor[x])){s[x]=1;st.push(x)}}}}return n},komp0=komp();
 // belegt: Fenster fertiger Tore samt 2 Feldern Abstand (kein Torhaus überlappt ein anderes)
 var belegt=new Int32Array(WW).fill(-1),reserv=function(g,b){for(var y=Math.max(0,b.y0-2);y<=Math.min(W-1,b.y1+2);y++)for(var x=Math.max(0,b.x0-2);x<=Math.min(W-1,b.x1+2);x++)belegt[y*W+x]=g};
 var fenster=function(T){var b=torFelder(W,T);return{x0:b.x0-TOR_GERADE,x1:b.x1+TOR_GERADE,y0:b.y0-TOR_GERADE,y1:b.y1+TOR_GERADE}};   // Torhaus samt Flanktürmen
 var schlecht=[];G.forEach(function(g,gi){if(torGeradeOk(W,g.T,istWand,g.wasser?0:TOR_B)||g.wasser)reserv(gi,fenster(g.T));else schlecht.push(gi)});
 if(!schlecht.length)return;
 // Straße außen 3 breit: blkG = Mittelfeld, dessen 3 × 3 draußen frei ist (1), mit Elendsbude (4, kostet extra), sonst 0 (je Versuch vorgerechnet)
 var lauf=function(q){return q>=0&&q<WW&&!MN[q]&&!wand[q]&&!tor[q]&&!bau[q]&&!dsperr[q]&&(bude[q]||LAUFZ[Z[q]]===1)};
 // N6b2e2g0: nur die Felder, die die Wegsuche anfasst (Stempel blkN je Versuch), statt je Versuch das ganze Bild; gebiete() braucht alles (vorrechnenVoll)
 var blkG=new Uint8Array(WW),lfG=new Uint8Array(WW),blkS=new Int32Array(WW),lfS=new Int32Array(WW),blkN=0,
  lfW=function(k){if(lfS[k]!==blkN){lfS[k]=blkN;lfG[k]=lauf(k)?(bude[k]?2:Z[k]==='f'||Z[k]==='p'?3:1):0}return lfG[k]},   // Äcker und Weiden meiden (3)
  blk=function(k){if(blkS[k]===blkN)return blkG[k];blkS[k]=blkN;var x=k%W,y=(k/W)|0,v=0;
   if(x>=1&&y>=1&&x<=W-2&&y<=W-2){v=1;for(var dy=-1;dy<=1&&v;dy++)for(var dx=-1;dx<=1;dx++){var l=lfW((y+dy)*W+x+dx);if(!l){v=0;break}if(l===2)v=4;else if(l===3&&v<3)v=3}}return blkG[k]=v},
  vorrechnen=function(){blkN++},vorrechnenVoll=function(){var k,x,y;for(k=0;k<WW;k++){lfS[k]=blkN;lfG[k]=lauf(k)?(bude[k]?2:Z[k]==='f'||Z[k]==='p'?3:1):0}
   for(y=0;y<W;y++)for(x=0;x<W;x++){var v=0;if(x>=1&&y>=1&&x<=W-2&&y<=W-2){v=1;for(var dy=-1;dy<=1&&v;dy++)for(var dx=-1;dx<=1;dx++){var l=lfG[(y+dy)*W+x+dx];if(!l){v=0;break}if(l===2)v=4;else if(l===3&&v<3)v=3}}blkS[y*W+x]=blkN;blkG[y*W+x]=v}};
 var mx=0,my=0,mn=0;for(k=0;k<WW;k++)if(MN[k]){mx+=k%W;my+=(k/W)|0;mn++}mx/=mn;my/=mn;
 var geh=function(q){return !MN[q]&&!wand[q]&&!tor[q]&&!bau[q]&&!bude[q]&&GEHZ[Z[q]]===1};   // begehbar draußen (Straße, Platz, Markt, Schlamm)
 var flutGeh=function(start){var se=new Uint8Array(WW),st=[];start.forEach(function(q){if(q>=0&&!se[q]&&geh(q)){se[q]=1;st.push(q)}});
  while(st.length){var c=st.pop(),nn=N4b(c);for(var d=0;d<4;d++){var x=nn[d];if(x>=0&&!se[x]&&geh(x)){se[x]=1;st.push(x)}}}return se};
 var KO=new Int32Array(WW*4),VO=new Int32Array(WW*4),HP=new Float64Array(1<<16),hn=0;   // Wegsuche: Kosten, Vorgänger, Heap (je Stadt einmal)
 var hinein=function(v){if(hn>=HP.length){var N=new Float64Array(HP.length*2);N.set(HP);HP=N}var i=hn++;while(i>0){var p=(i-1)>>1;if(HP[p]<=v)break;HP[i]=HP[p];i=p}HP[i]=v};
 var heraus=function(){var r=HP[0],v=HP[--hn],i=0;if(hn){for(;;){var a=2*i+1,b=a+1,m=i,mv=v;if(a<hn&&HP[a]<mv){m=a;mv=HP[a]}if(b<hn&&HP[b]<mv){m=b;mv=HP[b]}if(m===i)break;HP[i]=HP[m];i=m}HP[i]=v}return r};
 var H=1+TOR_GERADE,teuer=0,zuMauern=[];   // teuer: Versuche mit Wegsuche in diesem Plan (höchstens VERSUCHE_PLAN, gegen Riesenpläne)   // halbe Fensterlänge längs der Mauer (Torspalten ±1, daneben TOR_GERADE)
 schlecht.forEach(function(gi){var g=G[gi],bb=torFelder(W,g.T),cx=(bb.x0+bb.x1)/2,cy=(bb.y0+bb.y1)/2,inG=function(k){return gid[k]===gi};
  // alte Straße außen: Straßenfelder draußen, die am alten Tor hängen
  var aus0=[],sAus=new Uint8Array(WW);g.T.forEach(function(x){N4(x).forEach(function(y){if(y>=0&&!tor[y]&&!wand[y]&&!MN[y]&&Z[y]==='s'&&!sAus[y]){sAus[y]=1;aus0.push(y)}})});
  for(var h0=0;h0<aus0.length;h0++)N4(aus0[h0]).forEach(function(y){if(y>=0&&!sAus[y]&&!tor[y]&&!wand[y]&&!MN[y]&&Z[y]==='s'){sAus[y]=1;aus0.push(y)}});
  var dist=function(k){return Math.max(Math.abs(k%W-cx),Math.abs(((k/W)|0)-cy))},RJ=10;
  // kurze alte Straße (kleiner Ort): Ziel ist ihr äußerer Teil
  var dmax=0;aus0.forEach(function(q){if(dist(q)>dmax)dmax=dist(q)});if(dmax<RJ)RJ=Math.max(1,dmax-1);
  // Richtung des alten Tors von der Stadtmitte aus; das Tor rückt höchstens um 90° um die Stadt (nie auf die andere Seite)
  var rx=cx-mx,ry=cy-my;
  // Kandidaten: (Achse, Spalte c längs, erste Bandreihe a0, Außenseite o)
  // N6b2e2g0 (Tempo, gleiches Ergebnis): erst nur die billigen Bedingungen (Lage, Abstand dd, Richtung, innen/außen), voll bewertet (kost, Platz vor dem Tor)
  // wird in der Reihenfolge von dd, bis kein unbewerteter Kandidat (wert ≥ dd) mehr besser sein kann. Reihenfolge wie vorher: wert, ax, l0, a0, o.
  var leicht=[];for(var ax=0;ax<2;ax++){var id=function(l,a){return ax?a*W+l:l*W+a};
   var schon=new Uint8Array(WW);   // jedes Band, das ein Mauer- oder Torfeld enthält (auch eine Reihe weiter außen, wo innen die Ringgasse anliegt)
   var bx0=Math.max(0,Math.floor(cx)-126),bx1=Math.min(W-1,Math.ceil(cx)+126),by0=Math.max(0,Math.floor(cy)-126),by1=Math.min(W-1,Math.ceil(cy)+126);   // nur im Umkreis (dd ≤ 120)
   for(var yy9=by0;yy9<=by1;yy9++)for(var xx9=bx0;xx9<=bx1;xx9++){var k9=yy9*W+xx9;if(!wand[k9]&&!inG(k9))continue;for(var t9=0;t9<MAUER_BILD;t9++){var l0=ax?k9%W:(k9/W)|0,a0=(ax?(k9/W)|0:k9%W)-t9;if(a0<0)continue;var kk9=id(l0,a0);if(schon[kk9])continue;schon[kk9]=1;
    for(var o=-1;o<=1;o+=2){var aus=function(t){return o<0?a0-1-t:a0+MAUER_BILD+t},inn=function(t){return o<0?a0+MAUER_BILD+t:a0-1-t};
     if(l0-H-1<0||l0+H+1>=W||Math.min(aus(2),inn(2))<0||Math.max(aus(2),inn(2))>=W)continue;
     var mitte=ax?{x:l0,y:a0+1}:{x:a0+1,y:l0},dd=Math.hypot(mitte.x-cx,mitte.y-cy);if(dd>120)continue;
     var ox=ax?0:o,oy=ax?o:0;if(ox*rx+oy*ry<0)continue;   // Außenseite zeigt nicht vom alten Tor weg (höchstens 90° um die Stadt)
     if(MN[id(l0,aus(2))]||!MN[id(l0,inn(2))])continue;
     leicht.push({ax:ax,l0:l0,a0:a0,o:o,dd:dd})}}}}
  var bewerte=function(c){var ax=c.ax,l0=c.l0,a0=c.a0,o=c.o,id=function(l,a){return ax?a*W+l:l*W+a},aus=function(t){return o<0?a0-1-t:a0+MAUER_BILD+t},inn=function(t){return o<0?a0+MAUER_BILD+t:a0-1-t};
     var kost=0,geht=true;for(var l=l0-H;l<=l0+H&&geht;l++){var torSp=Math.abs(l-l0)<=1;
      for(var t=0;t<MAUER_BILD;t++){var q=id(l,a0+t);if(belegt[q]>=0||(tor[q]&&!inG(q))){geht=false;break}
       if(torSp){if(Z[q]==='w'||bau[q]||bude[q]||dsperr[q]){geht=false;break}if(!inG(q))kost++}
       else{if(wand[q])continue;if((inG(q)&&!schutz[q])||frei(q))kost+=Z[q]==='f'||Z[q]==='p'?3:1;else{geht=false;break}}}
      if(!geht)break;
      // Reihen vor und hinter dem Band: in den Seitenspalten keine Mauer (sonst entfernt), in den Torspalten frei für die Straße
      for(var s2=0;s2<2&&geht;s2++){var r1=s2?inn(0):aus(0),r2=s2?inn(1):aus(1),q1=id(l,r1),q2=id(l,r2);
       if(belegt[q1]>=0||(tor[q1]&&!inG(q1))){geht=false;break}var w2=wand[q2]||(inG(q2)&&!schutz[q2]);if(w2&&torSp){geht=false;break}
       if(torSp){if(bau[q1]||bude[q1]||dsperr[q1]||Z[q1]==='w'||(!wand[q1]&&!inG(q1)&&LAUFZ[Z[q1]]!==1)){geht=false;break}if(wand[q1])kost++}
       else if(wand[q1]||(inG(q1)&&!schutz[q1])){if(w2&&Math.abs(l-l0)<H){geht=false;break}kost++}}}
     if(!geht||kost>24)return false;
     // vor dem Tor außen Platz für 3 × 3 Felder Straße (aus(1) ± 1) und innen für den Anschluss
     for(var l4=l0-1;l4<=l0+1&&geht;l4++)for(var t4=0;t4<3;t4++){var q4=id(l4,aus(t4));if(t4>0&&(MN[q4]||wand[q4]||tor[q4]||bau[q4]||dsperr[q4]||(!bude[q4]&&LAUFZ[Z[q4]]!==1))){geht=false;break}}
     if(!geht)return false;c.kost=kost;c.wert=c.dd+3*kost;return true};
  leicht.sort(function(a,b){return a.dd-b.dd});
  var kvor=function(a,b){return a.wert-b.wert||a.ax-b.ax||a.l0-b.l0||a.a0-b.a0||a.o-b.o},lp=0,fertigK=[];
  var naechst=function(){while(lp<leicht.length){var m=null;for(var f=0;f<fertigK.length;f++)if(!m||kvor(fertigK[f],m)<0)m=fertigK[f];if(m&&leicht[lp].dd>m.wert)break;var c=leicht[lp++];if(bewerte(c))fertigK.push(c)}
   var bi=-1;for(var f2=0;f2<fertigK.length;f2++)if(bi<0||kvor(fertigK[f2],fertigK[bi])<0)bi=f2;return bi<0?null:fertigK.splice(bi,1)[0]};
  var pre={lab:null,gut:null,voll:false};
  // Vorprobe: bleibt die Mauer dicht und an einem Stück, wenn vom alten Tor nur die Durchfahrt (bis MAUER_BILD tief) zugemauert wird? Sonst ganz zumauern.
  (function(){var tief=new Int32Array(WW).fill(-1),tq=[],th=0,alt2=[];g.T.forEach(function(q){if(N4(q).some(function(y){return y>=0&&!MN[y]&&!wand[y]&&!tor[y]})){tief[q]=0;tq.push(q)}});
   while(th<tq.length){var c7=tq[th++];N4(c7).forEach(function(y){if(y>=0&&inG(y)&&tief[y]<0){tief[y]=tief[c7]+1;tq.push(y)}})}
   g.T.forEach(function(q){alt2.push([q,tor[q],wand[q]]);tor[q]=0;if(!schutz[q]&&tief[q]>=0&&tief[q]<MAUER_BILD)wand[q]=1});
   var gut=komp()<=komp0&&!leck(function(k){return !inG(k)});
   alt2.forEach(function(e){tor[e[0]]=e[1];wand[e[0]]=e[2]});if(!gut)pre.voll=true})();
  for(var nv=0,K2;nv<VERSUCHE&&(K2=naechst());){if(pre.lab){var a2=K2.o<0?K2.a0-3:K2.a0+MAUER_BILD+2,p2=K2.ax?a2*W+K2.l0:K2.l0*W+a2,lb=pre.lab[p2];if(lb>=0&&!pre.gut[lb])continue}   // Gebiet ohne alte Straße: gar nicht erst umbauen
   nv++;if(teuer++>=VERSUCHE_PLAN)break;if(versuch(g,gi,K2,aus0,sAus,dist,RJ,pre))return}
  // kein gerades Stück erreichbar (lange 45°-Schräge, Ausweichstelle hinter Fluss oder Häusern): Schräge am alten Tor begradigen, nur nach außen (Thomas 22.11.2026)
  if(begradigen(g,gi,bb,aus0,sAus,dist,RJ))return;
  if(zusammen(g,gi,bb,aus0,sAus,dist,RJ))return;   // zu nah am Nachbartor: Straße dorthin umlegen
  if(opt.eckeInnen!==false&&begradigenInnen(g,gi,bb,aus0,sAus,dist,RJ))return;   // Ecktor: Ecke innen kurz gerade (Thomas 22.11.2026)
  P.toreKrumm=(P.toreKrumm||0)+1});   // sollte nicht vorkommen (Test verlangt 0)
 // gehKomp(): Zahl der zusammenhängenden begehbaren Stücke (Straße, Platz, Markt, Schlamm), innen und außen
 function gehKomp(){var se=new Uint8Array(WW),n=0,st=[];for(var k=0;k<WW;k++){if(se[k]||wand[k]||tor[k]||bau[k]||GEHZ[Z[k]]!==1)continue;n++;se[k]=1;st.push(k);
  while(st.length){var c=st.pop(),nn=N4b(c);for(var d=0;d<4;d++){var q=nn[d];if(q>=0&&!se[q]&&!wand[q]&&!tor[q]&&!bau[q]&&GEHZ[Z[q]]===1){se[q]=1;st.push(q)}}}}return n}
 // dick3() (Thomas 22.11.2026): zugemauerte alte Durchfahrt so dick wie die Mauer daneben. Quer zur Straße liegt vor und hinter dem Tor je ein Mauerstück;
 // je Reihe dazwischen MAUER_BILD Felder um die gemittelte Mitte (an Schrägen läuft die Mauer so gleichmäßig weiter). Türfelder, Gebäude, Buden, Dinge bleiben.
 function dick3(T,setz){var b=torFelder(W,T);for(var ax=0;ax<2;ax++){var L0=ax?b.x0:b.y0,L1=ax?b.x1:b.y1,A0=ax?b.y0:b.x0,A1=ax?b.y1:b.x1,id=function(l,a){return ax?a*W+l:l*W+a};
   if(L1-L0>6)continue;var lauf=function(l){if(l<0||l>=W)return null;var best=null,bd=1e9;for(var a=Math.max(0,A0-6);a<=Math.min(W-1,A1+6);a++){if(!wand[id(l,a)])continue;var e=a;while(e+1<W&&wand[id(l,e+1)])e++;
     var m=(a+e)/2,dd=Math.abs(m-(A0+A1)/2);if(dd<bd){bd=dd;best=[a,e]}a=e}return best},ra=lauf(L0-1),rb=lauf(L1+1);if(!ra||!rb)continue;
   var ca=(ra[0]+ra[1])/2,cb=(rb[0]+rb[1])/2;for(var l=L0;l<=L1;l++){var c=Math.round(ca+(cb-ca)*(l-L0+1)/(L1-L0+2));
    for(var a=c-1;a<=c+1;a++){if(a<0||a>=W)continue;var q=id(l,a);if(wand[q]||schutz[q]||bau[q]||bude[q]||dsperr[q]||(tor[q]&&gid[q]<0)||belegt[q]>=0||!/[sgxoe]/.test(Z[q]))continue;setz(wand,q,1);setz(Z,q,'g');setz(dbaum,q,0)}}
   return}}
 // zusammen(): zwei Tore zu nah (Torfenster überlappen): das krumme Tor wird zugemauert, seine Straße draußen ans nächste gerade Tor umgelegt (Thomas 22.11.2026)
 function zusammen(g,gi,bb,aus0,sAus,dist,RJ){var cx=(bb.x0+bb.x1)/2,cy=(bb.y0+bb.y1)/2,liste=[];
  // Nachbartore nach dem jetzigen Stand (auch schon verschobene), im Umkreis 24
  var sah=new Uint8Array(WW),nr=0;for(var y=Math.max(0,Math.floor(cy)-24);y<=Math.min(W-1,Math.ceil(cy)+24);y++)for(var x=Math.max(0,Math.floor(cx)-24);x<=Math.min(W-1,Math.ceil(cx)+24);x++){var k=y*W+x;
   if(!tor[k]||sah[k]||gid[k]===gi)continue;var T=[],st=[k];sah[k]=1;while(st.length){var c=st.pop();T.push(c);N4(c).forEach(function(q){if(q>=0&&tor[q]&&!sah[q]&&gid[q]!==gi){sah[q]=1;st.push(q)}})}
   if(T.some(function(q){return Z[q]==='w'})||!torGeradeOk(W,T,istWand,TOR_B))continue;var hb=torFelder(W,T),hx=(hb.x0+hb.x1)/2,hy=(hb.y0+hb.y1)/2,d=Math.max(Math.abs(hx-cx),Math.abs(hy-cy));nr++;
   // Lage: Straße längs der Achse, deren Nachbar auf einer Seite draußen und auf der anderen innen liegt
   for(var ax=0;ax<2;ax++){var lm=ax?Math.round(hx):Math.round(hy),a0=ax?hb.y0:hb.x0,id=function(l,a){return ax?a*W+l:l*W+a};if(a0-1<0||a0+MAUER_BILD>=W)continue;
    var vor=id(lm,a0-1),hin=id(lm,a0+MAUER_BILD);if(wand[vor]||wand[hin]||tor[vor]||tor[hin]||MN[vor]===MN[hin])continue;liste.push({d:d,K:{ax:ax,l0:lm,a0:a0,o:MN[hin]?-1:1,nur:nr}})}}
  liste.sort(function(a,b){return a.d-b.d||a.K.nur-b.K.nur});
  for(var i=0;i<liste.length&&i<2;i++){if(teuer++>=VERSUCHE_PLAN)return false;if(versuch(g,gi,liste[i].K,aus0,sAus,dist,RJ,{lab:null,gut:null,voll:g.voll||false})){
   // ein Tor weniger: Eintrag der Seite aus der Torliste nehmen
   var rx=cx-mx,ry=cy-my,seite=Math.abs(rx)>Math.abs(ry)?(rx>0?'east':'west'):(ry>0?'south':'north'),ti=P.umriss.tore.indexOf(seite);P.umriss.tore.splice(ti>=0?ti:P.umriss.tore.length-1,1);return true}}return false}
 // begradigen(): gerades Band (Tor + je TOR_GERADE Felder, MAUER_BILD tief) quer zur alten Straße, so weit draußen, dass die ganze alte Schräge im Fenster
 // innen oder unter dem Band liegt. Der Keil zwischen Band und alter Schräge wird Innenfläche (alte Mauer dort wird Boden, die Torspalten Gasse), an
 // beiden Enden schließt ein Absatz MAUER_BILD Reihen das Band an die alte Mauer an. Kein Haus landet draußen; Elendsbuden draußen weichen, Häuser,
 // Dinge mit Rolle, Wasser und Straßen außen sperren. Danach wie ein gewöhnliches Tor: versuch() baut Tor, Straße und Anschluss und prüft dicht.
 function begradigen(g,gi,bb,aus0,sAus,dist,RJ){var cx=Math.round((bb.x0+bb.x1)/2),cy=Math.round((bb.y0+bb.y1)/2),inG=function(k){return gid[k]===gi},rx=cx-mx,ry=cy-my,nv=0;
  for(var ax=0;ax<2;ax++)for(var o=-1;o<=1;o+=2){var ox=ax?0:o,oy=ax?o:0;if(ox*rx+oy*ry<=0)continue;var id=function(l,a){return ax?a*W+l:l*W+a},lc=ax?cx:cy,ac=ax?cy:cx;
   for(var dl=0;dl<7;dl++){var l0=lc+(dl&1?-1:1)*((dl+1)>>1);if(l0-H-MAUER_BILD-1<0||l0+H+MAUER_BILD+1>=W)continue;
    // äußerste alte Mauer (oder Torfeld) je Fensterreihe nahe dem Tor
    var ext=o>0?-1:1e9,ok=true;for(var l=l0-H;l<=l0+H&&ok;l++){var e=o>0?-1:1e9;for(var a=Math.max(0,ac-10);a<=Math.min(W-1,ac+10);a++){var q=id(l,a);if(wand[q]||inG(q))e=o>0?Math.max(e,a):Math.min(e,a)}
     if(e<0||e>=1e9)ok=false;else ext=o>0?Math.max(ext,e):Math.min(ext,e)}if(!ok)continue;
    for(var sh=0;sh<6;sh++){var a0=o>0?ext-(MAUER_BILD-1)+sh:ext-sh;if(a0-24<0||a0+MAUER_BILD+24>=W)continue;
     var r=begradigenVersuch(g,gi,{ax:ax,l0:l0,a0:a0,o:o},id,inG,aus0,sAus,dist,RJ);if(r===true)return true;if(r===false&&++nv>=VERSUCHE_B)return false}}}   // nur teure Versuche (mit Wegsuche) zählen
  return false}
 function begradigenVersuch(g,gi,K,id,inG,aus0,sAus,dist,RJ){var l0=K.l0,a0=K.a0,o=K.o,alt=[],l,t,q,s,a,n,HZ=P.hoehe;
  var setz=function(arr,k,v){alt.push([arr,k,arr[k]]);arr[k]=v},zur=function(){for(var x=alt.length-1;x>=0;x--)alt[x][0][alt[x][1]]=alt[x][2]};
  var abriss=function(bi){var b=P.bauten[bi];if(weg_bude[bi])return;setz(weg_bude,bi,1);for(var y=b.j;y<b.j+b.h;y++)for(var x=b.i;x<b.i+b.w;x++)if(x>=0&&y>=0&&x<W&&y<W&&bude[y*W+x]===bi+1)setz(bude,y*W+x,0)};
  var fremd=function(q){return belegt[q]>=0||(tor[q]&&!inG(q))},innen=o>0?-1:1;
  // 1. Durchgang nur rechnen: Band (b = Torspalte, B = Seite), Keil (k), Absatz (a); Gebäude draußen im Weg (Höfe, Werkstätten) rücken danach ab
  var zone={},keil={},weg={},nein=false,huerde=function(q){var bi=bauNr[q]-1;if(bi<0)return;var b=P.bauten[bi];if(MN[q]||b.rolle==='grab'||b.rolle==='shack'){nein=true;return}weg[bi]=1};
  var tuerOk=function(q){if(!schutz[q]||wand[q]||inG(q))return true;var tv=tuerVon[q];if(!tv)return false;tv.forEach(function(bi){var b=P.bauten[bi];if(b.rolle==='shack'||b.rolle==='grab'||MN[(b.j*W+b.i)])nein=true;else weg[bi]=1});return !nein};
  for(l=l0-H;l<=l0+H&&!nein;l++){var torSp=Math.abs(l-l0)<=1;for(t=0;t<MAUER_BILD&&!nein;t++){q=id(l,a0+t);zone[q]=torSp?'b':'B';
   if(fremd(q)||dsperr[q]||Z[q]==='w'||!tuerOk(q)){nein=true;break}if(bau[q])huerde(q);else if(!bude[q]&&!wand[q]&&!inG(q)&&!/[gxfpse]/.test(Z[q]))nein=true}}
  for(l=l0-H;l<=l0+H&&!nein;l++){a=o>0?a0-1:a0+MAUER_BILD;for(n=0;n<24;n++,a+=innen){q=id(l,a);if(MN[q]&&!wand[q]&&!tor[q])break;
    if(fremd(q)||dsperr[q]||Z[q]==='w'||!tuerOk(q)){nein=true;break}if(bau[q])huerde(q);zone[q]='k';keil[q]=1}if(n>=24)nein=true}
  for(s=-1;s<=1&&!nein;s+=2)for(t=1;t<=MAUER_BILD&&!nein;t++){l=l0+s*(H+t);a=o>0?a0+MAUER_BILD-1:a0;
   for(n=0;n<30;n++,a+=innen){q=id(l,a);if(wand[q]||keil[q]||(MN[q]&&!tor[q]))break;if(fremd(q)||tor[q]||dsperr[q]||!tuerOk(q)){nein=true;break}
    if(bau[q])huerde(q);else if(!bude[q]&&!/[gxfpes]/.test(Z[q])){nein=true;break}zone[q]='a'}if(n>=30)nein=true}   // Straße draußen darf unter den Absatz: sie wird danach per Anschluss herumgeführt (Thomas 22.11.2026)
  if(nein)return 0;
  // 2. Gebäude draußen abrücken: gleiche Form nach außen (bis 20 Felder, seitlich bis 6), nur auf freien Boden, Abstand 1 zur Zone, nicht vor dem neuen Tor;
  //    Tür an derselben Stelle, davor ein begehbares Feld oder ein Trampelpfad (Schlamm) zum nächsten Weg draußen
  var gang=function(q){return !MN[q]&&!wand[q]&&!tor[q]&&!bau[q]&&!bude[q]&&!dsperr[q]&&/[some]/.test(Z[q])};
  var vorTor=function(x,y){var l=ax2l(x,y),a=ax2a(x,y);return Math.abs(l-l0)<=2&&(o>0?a>=a0+MAUER_BILD&&a<=a0+MAUER_BILD+12:a<=a0-1&&a>=a0-13)},ax2l=function(x,y){return K.ax?x:y},ax2a=function(x,y){return K.ax?y:x};
  var nahZone=function(x,y){for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){var xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<W&&yy<W&&zone[yy*W+xx])return true}return false};
  var wegListe=Object.keys(weg).map(Number);for(var wi=0;wi<wegListe.length;wi++){var bi=wegListe[wi],b=P.bauten[bi],h0=HZ?HZ.charCodeAt(b.j*W+b.i):0,best=null;
   var ox2=K.ax?0:o,oy2=K.ax?o:0,qx=K.ax?1:0,qy=K.ax?0:1;
   for(var d=1;d<=20&&!best;d++)for(var e=0;e<=12&&!best;e++){var sv=(e&1?-1:1)*((e+1)>>1),ni=b.i+ox2*d+qx*sv,nj=b.j+oy2*d+qy*sv,geht=true;
    if(ni<2||nj<2||ni+b.w>W-2||nj+b.h>W-2)continue;
    for(var y=nj;y<nj+b.h&&geht;y++)for(var x=ni;x<ni+b.w;x++){var c=y*W+x,eigen=bauNr[c]===bi+1;
     if(MN[c]||wand[c]||tor[c]||(bau[c]&&!eigen)||bude[c]||dsperr[c]||(schutz[c]&&!eigen)||zone[c]||!/[gxfp]/.test(Z[c])&&!eigen||nahZone(x,y)||vorTor(x,y)||(HZ&&HZ.charCodeAt(c)!==h0)){geht=false;break}}
    if(!geht)continue;var tu=null,tf=-1;if(b.tuer){tu=[b.tuer[0]+ni-b.i,b.tuer[1]+nj-b.j,b.tuer[2],b.tuer[3]];var fx=tu[0]+tu[2],fy=tu[1]+tu[3];tf=fy*W+fx;
     if(fx<1||fy<1||fx>=W-1||fy>=W-1||MN[tf]||wand[tf]||tor[tf]||bude[tf]||dsperr[tf]||zone[tf]||(bau[tf]&&bauNr[tf]!==bi+1)||vorTor(fx,fy)||bauNr[tf]===bi+1)continue}
    best={i:ni,j:nj,tuer:tu,tf:tf}}
   if(!best){zur();return 0}
   for(y=b.j;y<b.j+b.h;y++)for(x=b.i;x<b.i+b.w;x++){c=y*W+x;if(bauNr[c]===bi+1){setz(bau,c,0);setz(bauNr,c,0)}}
   if(b.tuer){var of=(b.tuer[1]+b.tuer[3])*W+b.tuer[0]+b.tuer[2];if(tuerVon[of]&&tuerVon[of].length===1)setz(schutz,of,0)}
   for(y=best.j;y<best.j+b.h;y++)for(x=best.i;x<best.i+b.w;x++){c=y*W+x;setz(bau,c,1);setz(bauNr,c,bi+1);setz(Z,c,'g');setz(dbaum,c,0)}
   setz(b,'i',best.i);setz(b,'j',best.j);if(best.tuer){setz(b,'tuer',best.tuer);var f=best.tf;setz(schutz,f,1);setz(dbaum,f,0);
    if(!gang(f)){setz(Z,f,'e');   // Trampelpfad zum nächsten Weg draußen (über Gras, notfalls Acker), nicht durch die Zone
     var vv=new Map(),qa=[f],hq=0,end=-1;vv.set(f,-1);while(hq<qa.length&&end<0&&hq<4000){var a1=qa[hq++],n1=N4(a1);for(var d1=0;d1<4;d1++){var b1=n1[d1];if(b1<0||vv.has(b1)||zone[b1])continue;
       if(gang(b1)){vv.set(b1,a1);end=b1;break}if(!MN[b1]&&!wand[b1]&&!tor[b1]&&!bau[b1]&&!bude[b1]&&!dsperr[b1]&&/[gxfp]/.test(Z[b1])){vv.set(b1,a1);qa.push(b1)}}}
     if(end<0){zur();return 0}for(var e1=vv.get(end);e1>=0;e1=vv.get(e1)){if(!gang(e1))setz(Z,e1,'e');setz(dbaum,e1,0)}}}}
  // was draußen an der Zone hängt (Straße, Schlammpfade zu Buden): versuch() schließt es per Trampelpfad an, wenn es abgeschnitten wird
  var rand=[];for(var zk0 in zone)N4(+zk0).forEach(function(y){if(y>=0&&!zone[y]&&!MN[y]&&!wand[y]&&!tor[y]&&/[some]/.test(Z[y]))rand.push(y)});
  // 3. umbauen
  for(var zk in zone){q=+zk;var art=zone[zk],tl=Math.abs((K.ax?q%W:(q/W)|0)-l0)<=1;if(bude[q])abriss(bude[q]-1);
   if(art==='b'||art==='B'){if(inG(q)){setz(tor,q,0);setz(MN,q,0)}}
   else if(art==='k'){if(wand[q]){setz(wand,q,0);setz(Z,q,tl?'s':'g')}else if(tor[q]){setz(tor,q,0);setz(Z,q,'s')}else if(tl)setz(Z,q,'s');setz(MN,q,1);setz(dbaum,q,0)}
   else{setz(wand,q,1);setz(Z,q,'g');setz(dbaum,q,0)}}
  if(teuer++<VERSUCHE_PLAN&&versuch({T:[],vor:rand},gi,K,aus0,sAus,dist,RJ,{lab:null,gut:null,voll:false}))return true;
  zur();return false}
 // begradigenInnen() (N6b2e2g1, Thomas 22.11.2026: „Ecke innen kurz gerade“): nur für ein Tor an einer Ecke, wenn nach außen nichts geht (Höfe direkt an
 // der Mauer). Das gerade Band (Tor + je TOR_GERADE Felder, MAUER_BILD tief) liegt so weit innen, dass die alte Schräge im Fenster draußen oder unter dem Band
 // liegt; auf einer Seite läuft es in die vorhandene gerade Mauer (Ecke). Was zwischen Band und alter Schräge lag, wird Außenfläche (alte Mauer Boden, Torspalten
 // Straße), am anderen Ende schließt ein Absatz MAUER_BILD Spalten das Band an die alte Mauer. Nur freie Innenfelder (Gasse, Platz, Garten, Boden), kein Haus,
 // keine Tür, kein Ding mit Rolle, höchstens ECKE_MAX Innenfelder; Gassen innen bleiben zusammenhängend. Danach wie ein gewöhnliches Tor: versuch().
 function begradigenInnen(g,gi,bb,aus0,sAus,dist,RJ){var cx=Math.round((bb.x0+bb.x1)/2),cy=Math.round((bb.y0+bb.y1)/2),inG=function(k){return gid[k]===gi},rx=cx-mx,ry=cy-my;
  for(var ax=0;ax<2;ax++)for(var o=-1;o<=1;o+=2){var ox=ax?0:o,oy=ax?o:0;if(ox*rx+oy*ry<=0)continue;var id=function(l,a){return ax?a*W+l:l*W+a},lc=ax?cx:cy,ac=ax?cy:cx;
   for(var dl=0;dl<5;dl++){var l0=lc+(dl&1?-1:1)*((dl+1)>>1);if(l0-H-MAUER_BILD-1<0||l0+H+MAUER_BILD+1>=W)continue;
    // innerste alte Mauer (oder Torfeld) je Fensterreihe nahe dem Tor
    var ext=o>0?1e9:-1,ok=true;for(var l=l0-H;l<=l0+H&&ok;l++){var e=o>0?1e9:-1;for(var a=Math.max(0,ac-10);a<=Math.min(W-1,ac+10);a++){var q=id(l,a);if(wand[q]||inG(q))e=o>0?Math.min(e,a):Math.max(e,a)}
     if(e<0||e>=1e9)ok=false;else ext=o>0?Math.min(ext,e):Math.max(ext,e)}if(!ok)continue;
    for(var sh=0;sh<3;sh++){var a0=o>0?ext-sh:ext-(MAUER_BILD-1)+sh;if(a0-24<0||a0+MAUER_BILD+24>=W)continue;
     var r=innenVersuch(g,gi,{ax:ax,l0:l0,a0:a0,o:o},id,inG,aus0,sAus,dist,RJ);if(r===true)return true;if(r===false)return false}}}   // höchstens ein teurer Versuch
  return false}
 function innenVersuch(g,gi,K,id,inG,aus0,sAus,dist,RJ){var l0=K.l0,a0=K.a0,o=K.o,alt=[],l,t,q,a,n,s,innenN=0;
  var setz=function(arr,k,v){alt.push([arr,k,arr[k]]);arr[k]=v},zur=function(){for(var x=alt.length-1;x>=0;x--)alt[x][0][alt[x][1]]=alt[x][2]};
  var fremd=function(q){return (belegt[q]>=0&&belegt[q]!==gi)||(tor[q]&&!inG(q))};
  var freiI=function(q){return MN[q]&&!wand[q]&&!bau[q]&&!bude[q]&&!dsperr[q]&&(!schutz[q]||inG(q))&&Z[q]!=='w'&&(GEHZ[Z[q]]===1||BODEN[Z[q]]===1)};
  var zone={},nein=false,inR=o>0?a0:a0+MAUER_BILD-1,ausR=o>0?a0+MAUER_BILD:a0-1;
  // Ecke: auf einer Seite liegt neben dem Fenster in allen Bandreihen schon Mauer
  var ecke=false;for(s=-1;s<=1&&!ecke;s+=2){var alle=true;for(t=0;t<MAUER_BILD;t++)if(!wand[id(l0+s*(H+1),a0+t)])alle=false;if(alle)ecke=true}if(!ecke)return 0;
  // Band: alte Mauer, altes Tor oder freie Innenfelder
  for(l=l0-H;l<=l0+H&&!nein;l++)for(t=0;t<MAUER_BILD;t++){q=id(l,a0+t);if(fremd(q)){nein=true;break}if(wand[q]||inG(q)){zone[q]='b';continue}if(!freiI(q)){nein=true;break}zone[q]='b';innenN++}
  // Keil: vom Band nach außen alles bis zum ersten Außenfeld wird Außenfläche
  for(l=l0-H;l<=l0+H&&!nein;l++){a=ausR;for(n=0;n<24;n++,a+=o){q=id(l,a);if(!MN[q]&&!wand[q]&&!tor[q])break;if(fremd(q)){nein=true;break}
    if(!wand[q]&&!inG(q)){if(!freiI(q)){nein=true;break}innenN++}zone[q]='k'}if(n>=24)nein=true}
  // Absatz an beiden Enden: von der inneren Bandreihe nach außen bis zur alten Mauer
  for(s=-1;s<=1&&!nein;s+=2)for(t=1;t<=MAUER_BILD&&!nein;t++){l=l0+s*(H+t);a=inR;
   for(n=0;n<30;n++,a+=o){q=id(l,a);if(wand[q])break;if(!MN[q]||tor[q]||fremd(q)||!freiI(q)){nein=true;break}zone[q]='a';innenN++}if(n>=30)nein=true}
  if(nein||innenN>ECKE_MAX)return 0;
  // umbauen
  g.T.forEach(function(q){setz(tor,q,0);if(!zone[q])setz(Z,q,'s')});
  for(var zk in zone){q=+zk;var art=zone[zk],tl=Math.abs((K.ax?q%W:(q/W)|0)-l0)<=1;
   if(art==='k'){if(wand[q]){setz(wand,q,0);setz(Z,q,tl?'s':'g')}else if(inG(q)||tl)setz(Z,q,'s');setz(MN,q,0);setz(dbaum,q,0)}
   else if(art==='a'){setz(wand,q,1);setz(Z,q,'g');setz(dbaum,q,0)}}
  // Gassen innen und Wege draußen dürfen nicht zerfallen (Band probeweise als Mauer mit Torspalten)
  var kz0=gehKomp(),probe=[];for(zk in zone)if(zone[zk]==='b'){q=+zk;probe.push([q,wand[q],tor[q],Z[q]]);if(Math.abs((K.ax?q%W:(q/W)|0)-l0)<=1){wand[q]=0;tor[q]=1}else{wand[q]=1;tor[q]=0}}
  var kz1=gehKomp();probe.forEach(function(e){wand[e[0]]=e[1];tor[e[0]]=e[2];Z[e[0]]=e[3]});
  if(kz1>kz0+1){zur();return 0}   // +1: das alte Tor trennt sich ggf. von der Gasse, versuch() schließt das neue an
  var rand=[];for(zk in zone)if(zone[zk]==='k'){q=+zk;if(GEHZ[Z[q]]===1)rand.push(q);N4(q).forEach(function(y){if(y>=0&&!zone[y]&&!MN[y]&&!wand[y]&&!tor[y]&&GEHZ[Z[y]]===1)rand.push(y)})}
  if(teuer++<VERSUCHE_PLAN&&versuch({T:[],vor:rand},gi,K,aus0,sAus,dist,RJ,{lab:null,gut:null,voll:false}))return true;
  zur();return false}
 // zusammenhängende Gebiete der Mittelfelder (Stand vor dem Versuch) und ob ein Gebiet die alte Straße (ab RJ) bzw. ohne Straße den Rand erreicht
 function gebiete(pre,aus0,dist,RJ){var lab=new Int32Array(WW).fill(-1),gut=[],z=new Uint8Array(WW),zn=0,k,n=0;aus0.forEach(function(q){if(dist(q)>=RJ){z[q]=1;zn++}});
  var DXg=[1,-1,0,0],DYg=[0,0,1,-1];
  for(k=0;k<WW;k++){if(lab[k]>=0)continue;if(!blkG[k])continue;var sp=0,ok=false;STK[sp++]=k;lab[k]=n;
   while(sp){var c=STK[--sp],cx=c%W,cy=(c/W)|0;if(!ok){if(!zn)ok=cx<=1||cy<=1||cx>=W-2||cy>=W-2;else for(var dy=-1;dy<=1&&!ok;dy++)for(var dx=-1;dx<=1;dx++)if(z[(cy+dy)*W+cx+dx]){ok=true;break}}
    for(var d=0;d<4;d++){var nx=cx+DXg[d],ny=cy+DYg[d];if(nx<0||ny<0||nx>=W||ny>=W)continue;var nk=ny*W+nx;if(lab[nk]<0&&blkG[nk]){lab[nk]=n;STK[sp++]=nk}}}
   gut[n++]=ok}
  pre.lab=lab;pre.gut=gut}
 function versuch(g,gi,K,aus0,sAus,dist,RJ,pre){var inG=function(k){return gid[k]===gi},ax=K.ax,l0=K.l0,a0=K.a0,o=K.o,id=function(l,a){return ax?a*W+l:l*W+a},alt=[],
   setz=function(arr,k,v){alt.push([arr,k,arr[k]]);arr[k]=v},zur=function(){for(var q=alt.length-1;q>=0;q--)alt[q][0][alt[q][1]]=alt[q][2]};
  var aus=function(t){return o<0?a0-1-t:a0+MAUER_BILD+t},inn=function(t){return o<0?a0+MAUER_BILD+t:a0-1-t},neuT={};
  var abriss=function(bi){var b=P.bauten[bi];if(weg_bude[bi])return;alt.push([weg_bude,bi,undefined]);weg_bude[bi]=1;
   for(var y=b.j;y<b.j+b.h;y++)for(var x=b.i;x<b.i+b.w;x++)if(x>=0&&y>=0&&x<W&&y<W&&bude[y*W+x]===bi+1)setz(bude,y*W+x,0)};
  // vorher: alles Begehbare draußen, das am alten Tor hängt (Straße, Schlammpfade zu Buden und Gräbern)
  var vorTor=g.vor?g.vor.slice():[];g.T.forEach(function(q){N4(q).forEach(function(y){if(y>=0&&!MN[y])vorTor.push(y)})});var A0=flutGeh(vorTor);
  // altes Tor zumauern; Felder vor Türen (Haus oder Grab neben der Durchfahrt) bleiben offen, außen angeschlossen
  // nur die Torfelder bis MAUER_BILD tief von draußen (die Durchfahrt), ein Torstreifen längs einer Gasse innen bleibt Gasse
  var tief=new Int32Array(WW).fill(-1),tq=[],th=0;g.T.forEach(function(q){if(N4(q).some(function(y){return y>=0&&!MN[y]&&!wand[y]&&!tor[y]})){tief[q]=0;tq.push(q)}});
  while(th<tq.length){var c7=tq[th++];N4(c7).forEach(function(y){if(y>=0&&inG(y)&&tief[y]<0){tief[y]=tief[c7]+1;tq.push(y)}})}
  // Häuser, deren Tür in die alte Durchfahrt zeigt, bekommen die Tür auf eine andere Seite (begehbares Feld; draußen sonst Gras mit Trampelpfad)
  var muss=[],voll=pre.voll;g.T.forEach(function(q){if(!schutz[q]||!tuerVon[q])return;var alle=true;
   tuerVon[q].forEach(function(bi){var b=P.bauten[bi],best=null,bw=1e9;
    for(var y=b.j;y<b.j+b.h;y++)for(var x=b.i;x<b.i+b.w;x++){if(y!==b.j&&y!==b.j+b.h-1&&x!==b.i&&x!==b.i+b.w-1)continue;
     [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(dv){var fx=x+dv[0],fy=y+dv[1];if(fx<0||fy<0||fx>=W||fy>=W)return;if(fx>=b.i&&fx<b.i+b.w&&fy>=b.j&&fy<b.j+b.h)return;var f=fy*W+fx;
      if(inG(f)||wand[f]||tor[f]||bau[f]||bude[f]||dsperr[f])return;var gehF=/[some]/.test(Z[f]),wert=gehF?0:MN[f]?1e9:/[gx]/.test(Z[f])?2:1e9;
      if(wert<bw){bw=wert;best=[x,y,dv[0],dv[1]]}})}
    if(!best){alle=false;return}var nf=(best[1]+best[3])*W+best[0]+best[2];setz(b,'tuer',best);setz(schutz,nf,1);
    if(!/[some]/.test(Z[nf])){setz(Z,nf,'e');setz(dbaum,nf,0)}if(!MN[nf])muss.push(nf)});
   if(alle)setz(schutz,q,0)});
  g.T.forEach(function(q){setz(tor,q,0);if(!voll&&(tief[q]<0||tief[q]>=MAUER_BILD))return;if(!schutz[q]){setz(wand,q,1);setz(Z,q,'g');return}
   if(N4(q).some(function(y){return y>=0&&!MN[y]&&!wand[y]&&!tor[y]})){setz(MN,q,0);muss.push(q)}});
  if(!K.nur)for(var l=l0-H;l<=l0+H;l++){var torSp=Math.abs(l-l0)<=1;
   for(var t=0;t<MAUER_BILD;t++){var q=id(l,a0+t);if(torSp){setz(wand,q,0);setz(tor,q,1);setz(Z,q,'s');setz(dbaum,q,0);neuT[q]=1}else if(!wand[q]){setz(wand,q,1);setz(Z,q,'g');setz(dbaum,q,0)}}
   [aus(0),inn(0)].forEach(function(r,ri){var q1=id(l,r);if(torSp){if(wand[q1])setz(wand,q1,0);setz(Z,q1,'s');setz(dbaum,q1,0);setz(MN,q1,ri)}else if(wand[q1]){setz(wand,q1,0);setz(Z,q1,inG(q1)?Z0.charAt(q1):'g');setz(MN,q1,ri)}})}   // altes Torfeld bekommt seinen Boden zurück
  // dicht? Flut vom Rand über alles außer Mauer und Tor darf kein Innenfeld erreichen; Mauer zerfällt nicht in mehr Stücke
  var k,c,d,x,warW=new Uint8Array(WW);for(var q8=0;q8<alt.length;q8++)if(alt[q8][0]===wand&&alt[q8][2]===1)warW[alt[q8][1]]=1;   // war vorher Mauer
  if(leck(function(k){return !warW[k]})){zur();return false}
  if(komp()>komp0){zur();return false}
  // Straße außen: 3 breit vom Tor bis zur alten Straße (ab RJ Feldern vom alten Tor) oder zum Bildrand; Abbiegen kostet extra
  var ziel=new Uint8Array(WW),zn=0;aus0.forEach(function(q){if(dist(q)>=RJ){ziel[q]=1;zn++}});
  var start=ax?{x:l0,y:aus(1)}:{x:aus(1),y:l0},sd=ax?(o<0?3:1):(o<0?2:0);   // Richtung 0 +x, 1 +y, 2 −x, 3 −y
  var DX=[1,0,-1,0],DY=[0,1,0,-1],weg=null;
  if(aus0.length){var kost=KO.fill(1e9),von=VO.fill(-1),sk=(start.y*W+start.x)*4+sd;
   vorrechnen();if(!blk(start.y*W+start.x)){zur();return false}
   // Vorprüfung nach einem Fehlschlag: liegt das Feld zwei vor dem Tor in einem Gebiet ohne Ziel, gar nicht erst suchen
   if(pre.lab){var px=ax?l0:aus(2),py=ax?aus(2):l0,pl=pre.lab[py*W+px];if(pl>=0&&!pre.gut[pl]){zur();return false}}
   // Dijkstra mit Binärheap (Schlüssel = Kosten · 2^20 + Zustand, Zustand = Feld · 4 + Richtung), Kosten höchstens 800
   // A*: Schätzung = Abstand (4 Richtungen, ohne Hindernisse) zum nächsten Zielfeld, nie zu hoch
   // Schätzung = Abstand (4 Richtungen) zum Rechteck um alle Zielfelder bzw. zum Randstreifen, nie zu hoch (billig, kein Durchlauf übers ganze Bild)
   var zx0=1e9,zx1=-1,zy0=1e9,zy1=-1;if(zn)for(var z9=0;z9<aus0.length;z9++){var zq=aus0[z9];if(!ziel[zq])continue;var zi=zq%W,zj=(zq/W)|0;if(zi<zx0)zx0=zi;if(zi>zx1)zx1=zi;if(zj<zy0)zy0=zj;if(zj>zy1)zy1=zj}
   var hz=function(c){var x=c%W,y=(c/W)|0,v;if(zn)v=(x<zx0?zx0-x:x>zx1?x-zx1:0)+(y<zy0?zy0-y:y>zy1?y-zy1:0);else v=Math.min(x-1,y-1,W-2-x,W-2-y);v-=1;return v>0?v:0};
   var zielN=null;if(zn){zielN=new Uint8Array(WW);for(var z8=0;z8<aus0.length;z8++){var zq8=aus0[z8];if(!ziel[zq8])continue;var zi8=zq8%W,zj8=(zq8/W)|0;   // Ziel im 3 × 3 um ein Feld (vorab statt je Schritt)
    for(var dy8=-1;dy8<=1;dy8++)for(var dx8=-1;dx8<=1;dx8++){var xx8=zi8+dx8,yy8=zj8+dy8;if(xx8>=0&&yy8>=0&&xx8<W&&yy8<W)zielN[yy8*W+xx8]=1}}}
   kost[sk]=0;hn=0;hinein(hz(sk>>2)*1048576+sk);var fertig=-1,rand=function(x,y){return x<=1||y<=1||x>=W-2||y>=W-2};
   // N6b2e2g0: hängt das Gebiet um den Start gar nicht am Ziel (wie in gebiete), scheitert die Suche sicher, sonst erst nach 60.000 Schritten.
   // Vorher billig fluten (Breitensuche, hört beim ersten Zielfeld auf); erreicht die Flut das Ziel, sucht A* wie bisher (gleiches Ergebnis)
   var erreicht=false;{erN++;var st0=start.y*W+start.x,qh=0,qt=0;erS[st0]=erN;STK[qt++]=st0;
    while(qh<qt){var c9=STK[qh++],x9=c9%W,y9=(c9/W)|0;if(zn?zielN[c9]:rand(x9,y9)){erreicht=true;break}
     for(var d9=0;d9<4;d9++){var nx9=x9+DX[d9],ny9=y9+DY[d9];if(nx9<0||ny9<0||nx9>=W||ny9>=W)continue;var n9=ny9*W+nx9;if(erS[n9]===erN||!blk(n9))continue;erS[n9]=erN;STK[qt++]=n9}}}
   if(!erreicht)hn=0;
   var pops=0;while(erreicht&&hn&&fertig<0&&pops++<60000){var top=heraus(),fw=Math.floor(top/1048576),s0=top-fw*1048576,cst=kost[s0];if(cst+hz(s0>>2)!==fw||cst>800)continue;var cell=s0>>2,dr=s0&3,x0=cell%W,y0=(cell/W)|0;
     if(zn?zielN[cell]:rand(x0,y0)){fertig=s0;break}
     for(var nd=0;nd<4;nd++){if(nd===((dr+2)&3))continue;var nx=x0+DX[nd],ny=y0+DY[nd];if(nx<0||ny<0||nx>=W||ny>=W)continue;var bk=blk(ny*W+nx);if(!bk)continue;var ns=(ny*W+nx)*4+nd,nc=cst+bk+(nd===dr?0:4);
      if(nc<kost[ns]){kost[ns]=nc;von[ns]=s0;hinein((nc+hz(ns>>2))*1048576+ns)}}}
   if(fertig<0){if(!pre.lab)vorrechnenVoll();zur();if(!pre.lab)gebiete(pre,aus0,dist,RJ);return false}
   weg=[];for(var s1=fertig;s1>=0;s1=von[s1])weg.push(s1>>2)}
  // Straße innen: von der Innenseite des Tors 1 breit bis zur nächsten Gasse
  if(!K.nur){   // nur bei neuem Tor: innen an die Gasse anschließen (ein vorhandenes Tor ist schon angeschlossen)
  var vorn=[];for(var l2=l0-1;l2<=l0+1;l2++)vorn.push(id(l2,inn(0)));
  var innL=function(q){return q>=0&&MN[q]&&!wand[q]&&!tor[q]&&!bau[q]&&!dsperr[q]&&LAUFZ[Z[q]]===1};
  // Ziel innen: Gassenfeld im größten zusammenhängenden begehbaren Innengebiet (Straße, Platz, Markt, Schlamm), nicht ein abgeschnittenes Reststück
  var gIn=function(q){return MN[q]&&!wand[q]&&!tor[q]&&!bau[q]&&GEHZ[Z[q]]===1&&!neuT[q]},kl=new Int32Array(WW).fill(-1),gr=[],kn=0;
  for(k=0;k<WW;k++){if(kl[k]>=0||!gIn(k))continue;var sp6=0,n6=0;STK[sp6++]=k;kl[k]=kn;while(sp6){var c6=STK[--sp6],q6=N4b(c6);n6++;for(var d6=0;d6<4;d6++){var x6=q6[d6];if(x6>=0&&kl[x6]<0&&gIn(x6)){kl[x6]=kn;STK[sp6++]=x6}}}gr[kn++]=n6}
  var gross=-1,gn=0;for(k=0;k<kn;k++)if(gr[k]>gn){gn=gr[k];gross=k}
  var gasse=new Uint8Array(WW);for(k=0;k<WW;k++)if(kl[k]===gross&&gross>=0)gasse[k]=1;vorn.forEach(function(q){gasse[q]=0});
  var vv=new Int32Array(WW).fill(-2),qa=[],hq=0,end=-1;vorn.forEach(function(q){vv[q]=-1;qa.push(q)});
  while(hq<qa.length&&end<0){var a1=qa[hq++],n1=N4b(a1);for(d=0;d<4;d++){var b1=n1[d];if(b1<0||vv[b1]!==-2)continue;if(gasse[b1]){vv[b1]=a1;end=b1;break}if(innL(b1)){vv[b1]=a1;qa.push(b1)}}}
  if(end<0){zur();return false}
  for(var e1=vv[end];e1>=0;e1=vv[e1]){if(Z[e1]!=='s')setz(Z,e1,'s');setz(dbaum,e1,0)}}
  if(weg){weg.forEach(function(c){var x0=c%W,y0=(c/W)|0;for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){var q=(y0+dy)*W+x0+dx;if(Z[q]!=='s')setz(Z,q,'s');setz(dbaum,q,0);if(bude[q])abriss(bude[q]-1)}});
   // alter Stummel: Straßenfelder der alten Straße näher als RJ am alten Tor fallen weg, wenn alles andere am neuen Tor hängen bleibt
   var auf=new Uint8Array(WW);weg.forEach(function(c){var x0=c%W,y0=(c/W)|0;for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++)auf[(y0+dy)*W+x0+dx]=1});
   // begehbar draußen (Straße, Platz, Markt, Schlamm) vom neuen Tor aus: vorher zählen, nach dem Abbau darf nichts außer dem Stummel fehlen
   var zaehl=function(){var se=new Uint8Array(WW),st=[],n=0;
     for(var l3=l0-1;l3<=l0+1;l3++){var q3=id(l3,aus(0));if(!se[q3]){se[q3]=1;st.push(q3);n++}}
     while(st.length){var c3=st.pop(),n3=N4b(c3);for(var d3=0;d3<4;d3++){var x3=n3[d3];if(x3>=0&&!se[x3]&&geh(x3)){se[x3]=1;st.push(x3);n++}}}return{n:n,se:se}};
   var vorher=zaehl();
   var stumm=aus0.filter(function(q){return dist(q)<RJ&&!auf[q]&&!tor[q]&&!wand[q]&&!MN[q]&&!schutz[q]}),vor=alt.length;stumm.forEach(function(q){setz(Z,q,'g')});
   var seen=new Uint8Array(WW),st=[];for(var l3=l0-1;l3<=l0+1;l3++){var q3=id(l3,aus(0));seen[q3]=1;st.push(q3)}
   while(st.length){var c3=st.pop(),n3=N4b(c3);for(d=0;d<4;d++){var x3=n3[d];if(x3>=0&&!seen[x3]&&!MN[x3]&&!wand[x3]&&!tor[x3]&&Z[x3]==='s'){seen[x3]=1;st.push(x3)}}}
   var nachher=zaehl();if(aus0.some(function(q){return Z[q]==='s'&&!seen[q]})||nachher.n+stumm.length<vorher.n){for(var u=alt.length-1;u>=vor;u--)alt[u][0][alt[u][1]]=alt[u][2];alt.length=vor}}
  // abgeschnittene Flächen (Schlammpfad, Budengasse) mit einem Trampelpfad (Schlamm) über freies Gras an die Straße vor dem neuen Tor anschließen
  var vorN=[];for(var l5=l0-1;l5<=l0+1;l5++)vorN.push(id(l5,aus(0)));
  for(var runde=0;runde<12;runde++){var B5=flutGeh(vorN),los=[];for(var k5=0;k5<WW;k5++)if(A0[k5]&&!B5[k5]&&geh(k5))los.push(k5);muss.forEach(function(q){if(!B5[q]&&geh(q)&&los.indexOf(q)<0)los.push(q)});if(!los.length)break;var losS=los.some(function(q){return Z[q]==='s'});   // abgeschnittene Straße: Anschluss als Straße
   var vt=new Int32Array(WW).fill(-2),qb=[],hb=0,end5=-1;los.forEach(function(q){vt[q]=-1;qb.push(q)});
   for(var mitAcker=0;mitAcker<2&&end5<0;mitAcker++){vt.fill(-2);qb=[];hb=0;los.forEach(function(q){vt[q]=-1;qb.push(q)});var AK=mitAcker?/[gxfp]/:/[gx]/;
   var pfad=function(q){return !MN[q]&&!wand[q]&&!tor[q]&&!bau[q]&&!bude[q]&&!dsperr[q]&&(geh(q)||AK.test(Z[q]))};
   while(hb<qb.length&&end5<0){var a5=qb[hb++],n5=N4(a5);for(var d5=0;d5<4;d5++){var b5=n5[d5];if(b5<0||vt[b5]!==-2||!pfad(b5))continue;vt[b5]=a5;if(B5[b5]){end5=b5;break}qb.push(b5)}}}
   if(end5<0){zur();return false}
   for(var e5=vt[end5];e5>=0;e5=vt[e5])if(!geh(e5)||losS){setz(Z,e5,losS?'s':'e');setz(dbaum,e5,0)}}
  var nb={x0:1e9,x1:-1,y0:1e9,y1:-1};for(var nk in neuT){var ni=nk%W,nj=(nk/W)|0;nb.x0=Math.min(nb.x0,ni);nb.x1=Math.max(nb.x1,ni);nb.y0=Math.min(nb.y0,nj);nb.y1=Math.max(nb.y1,nj)}
  if(!K.nur)reserv(gi,{x0:nb.x0-TOR_GERADE,x1:nb.x1+TOR_GERADE,y0:nb.y0-TOR_GERADE,y1:nb.y1+TOR_GERADE});
  // zugemauerte Durchfahrt: am Ende so dick wie die Mauer daneben (dick3)
  if(g.T.length)zuMauern.push(g.T);
  return true;
}
 // zugemauerte Durchfahrten erst jetzt so dick wie die Mauer daneben (würde sonst die Suche für spätere Tore stören); nur wenn dabei kein Weg zerfällt
 if(zuMauern.length){var kz=gehKomp();zuMauern.forEach(function(T){var al=[],st=function(a,k,v){al.push([a,k,a[k]]);a[k]=v};dick3(T,st);
  if(al.length){var kn=gehKomp();if(kn>kz)for(var u=al.length-1;u>=0;u--)al[u][0][al[u][1]]=al[u][2];else kz=kn}})}
 // zurückschreiben: Zellen, Torfelder, Mauerstücke (1 × 1 wie in mauerRund), Bäume, Innenfläche
 P.zellen=Z.join('');var mt='';for(k=0;k<WW;k++)mt+=tor[k]?'1':'0';P.mauertor=mt;
 P.dinge=P.dinge.filter(function(o){if(o.i<0||o.j<0||o.i>=W||o.j>=W)return true;var q=o.j*W+o.i;return o.rolle||!(!dbaum[q]||wand[q]||tor[q]||Z[q]==='s')});
 var ab=0;P.bauten=P.bauten.filter(function(b,bi){if(weg_bude[bi]){ab++;return false}return true});if(ab&&P.aussen)P.aussen.buden-=ab;
 var HZ=P.hoehe,hat=new Uint8Array(WW);P.bauten=P.bauten.filter(function(b){if(b.rolle!=='mauer')return true;if(b.w===1&&b.h===1&&wand[b.j*W+b.i]){hat[b.j*W+b.i]=1;return true}return false});
 for(k=0;k<WW;k++)if(wand[k]&&!hat[k]){var o2={rolle:'mauer',i:k%W,j:(k/W)|0,w:1,h:1,klasse:m0.klasse,dach:m0.dach,achse:'i',wand:m0.wand,dachR:m0.dachR};if(HZ)o2.hz=HZ.charCodeAt(k)-48;P.bauten.push(o2)}
 var aus2=flut();
 var zl=[];for(j=0;j<W;j++){i=0;while(i<W){if(aus2[j*W+i]){i++;continue}var i1=i;while(i1+1<W&&!aus2[j*W+i1+1])i1++;zl.push(j,i,i1);i=i1+1}}P.umriss.bild=zl}
// N6b2e2g2 Wassertore (Entscheidung Thomas 22.11.2026: „einfach Türme am Wasserrand und fertig“): wo die Mauer auf den Fluss trifft, gibt es kein
// Wassertor mehr. Die Mauer endet an beiden Ufern, mauerwerk setzt dort je einen Turm (P.uferAuf), der Wehrgang läuft nicht übers Wasser. Die Felder
// bleiben Grenze der Innenfläche (die Stadt läuft nicht über den Fluss aus). Ebenso ein krummes Straßentor direkt am Wasser (Brücke, Ufergasse).
// Notausschalter opt.wasserOffen:false (Wassertore wie vorher).
var WREST=40;
function wassertoreGerade(P,opt){var W=P.W,WW=W*W,Z=P.zellen.split(''),k,i,j,d;if(!P.mauertor||!P.fluss||opt.wasserOffen===false)return;
 var wand=new Uint8Array(WW),tor=new Uint8Array(WW),sperr=new Uint8Array(WW),m0=null;
 P.bauten.forEach(function(b){var m=b.rolle==='mauer';if(m&&!m0)m0=b;for(var y=Math.max(0,b.j);y<Math.min(W,b.j+b.h);y++)for(var x=Math.max(0,b.i);x<Math.min(W,b.i+b.w);x++)(m?wand:sperr)[y*W+x]=1;
  if(b.tuer&&!m){var tx=b.tuer[0]+b.tuer[2],ty=b.tuer[1]+b.tuer[3];if(tx>=0&&ty>=0&&tx<W&&ty<W)sperr[ty*W+tx]=1}});if(!m0)return;
 P.dinge.forEach(function(o){if(o.rolle&&o.i>=0&&o.j>=0&&o.i<W&&o.j<W)sperr[o.j*W+o.i]=1});
 for(k=0;k<WW;k++)if(P.mauertor.charCodeAt(k)===49&&!wand[k])tor[k]=1;
 var NB=new Int32Array(4),N4b=function(k){var x=k%W,y=(k/W)|0;NB[0]=x<W-1?k+1:-1;NB[1]=y<W-1?k+W:-1;NB[2]=x>0?k-1:-1;NB[3]=y>0?k-W:-1;return NB};
 var flut=function(wa,to){var a=new Uint8Array(WW),fl=[],k,d;for(k=0;k<WW;k++){var fi=k%W,fj=(k/W)|0;if((fi===0||fj===0||fi===W-1||fj===W-1)&&!wa[k]&&!to[k]){a[k]=1;fl.push(k)}}
  while(fl.length){var c=fl.pop(),nn=N4b(c);for(d=0;d<4;d++){var x=nn[d];if(x>=0&&!a[x]&&!wa[x]&&!to[x]){a[x]=1;fl.push(x)}}}return a};
 var stuecke=function(wa,to){var s=new Uint8Array(WW),n=0,st=[],k,d;for(k=0;k<WW;k++){if(s[k]||!(wa[k]||to[k]))continue;n++;s[k]=1;st.push(k);
  while(st.length){var c=st.pop(),nn=N4b(c);for(d=0;d<4;d++){var x=nn[d];if(x>=0&&!s[x]&&(wa[x]||to[x])){s[x]=1;st.push(x)}}}}return n};
 var gruppen=function(to){var s=new Uint8Array(WW),L=[],k,d;for(k=0;k<WW;k++){if(!to[k]||s[k])continue;var T=[k],st=[k];s[k]=1;
  while(st.length){var c=st.pop(),nn=N4b(c);for(d=0;d<4;d++){var x=nn[d];if(x>=0&&to[x]&&!s[x]){s[x]=1;st.push(x);T.push(x)}}}L.push(T)}return L};
 var gerade=function(wa,T){return torGeradeOk(W,T,function(x,y){return x>=0&&y>=0&&x<W&&y<W&&wa[y*W+x]===1},0)};
 var BODEN={g:1,x:1,f:1,p:1,e:1},frei=function(k){return !sperr[k]&&BODEN[Z[k]]===1};
 var aus=flut(wand,tor),offen=[];
 gruppen(tor).forEach(function(T){if(T.some(function(x){return Z[x]==='w'}))offen.push(T)});
 var auf=new Uint8Array(WW);offen.forEach(function(T){T.forEach(function(x){auf[x]=1})});
 // dasselbe für ein krummes Straßentor am Fluss (aus N6b2e2g1: Brücke oder Ufergasse direkt am Wasser oder an der Unterbrechung): die Mauer endet dort
 gruppen(tor).forEach(function(T){if(auf[T[0]]||T.some(function(x){return Z[x]==='w'}))return;
  if(torGeradeOk(W,T,function(x,y){return x>=0&&y>=0&&x<W&&y<W&&wand[y*W+x]===1},TOR_B))return;
  var nah=T.some(function(x){var xi=x%W,xj=(x/W)|0;for(var u=-2;u<=2;u++)for(var w=-2;w<=2;w++){var y=xj+w,q=xi+u;if(q>=0&&y>=0&&q<W&&y<W&&(auf[y*W+q]||Z[y*W+q]==='w'))return true}return false});
  if(!nah)return;T.forEach(function(x){auf[x]=1});offen.push(T);if(P.toreKrumm)P.toreKrumm--;if(!P.toreKrumm)delete P.toreKrumm});
 if(offen.length){P.fluss.offen=offen.length;
  // Mauerstücke, die sich nur über Eck berühren, bekommen ein Feld dazu (wie in mauerRund); sonst bliebe am Ufer ein Stück Wehrgang ohne Zugang
  var mw=function(k){return wand[k]||(tor[k]&&!auf[k])},fuell=function(k){if(wand[k]||tor[k]||auf[k]||!frei(k))return false;var xi=k%W,xj=(k/W)|0,gs={},g0;   // Tore daneben bleiben gerade
   for(var u=-4;u<=4;u++)for(var w=-4;w<=4;w++){var y=xj+w,q=xi+u;if(q>=0&&y>=0&&q<W&&y<W&&torNr[y*W+q])gs[torNr[y*W+q]]=1}
   for(g0 in gs){var T0=torG[g0-1],b0=gerade(wand,T0);wand[k]=1;var b1=gerade(wand,T0);wand[k]=0;if(b0&&!b1)return false}return true};
  var torG=gruppen(tor.map(function(v,x){return v&&!auf[x]?1:0})),torNr=new Int32Array(WW);torG.forEach(function(T0,gi){T0.forEach(function(x){torNr[x]=gi+1})});
  for(var r=0;r<3;r++){var neu=false;for(j=0;j<W-1;j++)for(i=0;i<W-1;i++){var p0=j*W+i,p1=p0+1,p2=p0+W,p3=p2+1,c=null;
   if(mw(p0)&&mw(p3)&&!mw(p1)&&!mw(p2))c=[p1,p2];else if(mw(p1)&&mw(p2)&&!mw(p0)&&!mw(p3))c=[p0,p3];if(!c)continue;
   var wahl=fuell(c[0])?c[0]:fuell(c[1])?c[1]:-1;if(wahl>=0){wand[wahl]=1;Z[wahl]='g';neu=true}}if(!neu)break}
  // kleine Mauerreste (höchstens WREST Felder) zwischen oder an den Unterbrechungen gehören zur Öffnung
  var ges=new Uint8Array(WW);for(k=0;k<WW;k++){if(!wand[k]||ges[k])continue;var R=[k],st=[k],an=false;ges[k]=1;
   while(st.length){var q=st.pop(),nn=N4b(q);for(d=0;d<4;d++){var x=nn[d];if(x<0)continue;if(auf[x])an=true;if(!ges[x]&&mw(x)){ges[x]=1;st.push(x);R.push(x)}}}
   if(an&&R.length<=WREST&&R.every(function(x){return wand[x]}))R.forEach(function(x){wand[x]=0;auf[x]=1})}
  // Platz für den Turm am Ufer: an jedem Mauerende an der Öffnung ein 3 × 3 ganz aus Mauer; wo die Mauer dünner ist (Ringgasse dahinter), wächst sie
  // nach außen (nur freier Boden draußen, Tore daneben bleiben gerade)
  var hatTurm=function(k){var xi=k%W,xj=(k/W)|0;for(var oy=-2;oy<=0;oy++)for(var ox=-2;ox<=0;ox++){var ok3=true;for(var q=0;q<9&&ok3;q++){var x=xi+ox+q%3,y=xj+oy+(q/3|0);if(x<0||y<0||x>=W||y>=W||!wand[y*W+x])ok3=false}if(ok3)return true}return false};
  for(k=0;k<WW;k++){if(!wand[k])continue;var nn0=N4b(k),amUfer=false;for(d=0;d<4;d++)if(nn0[d]>=0&&auf[nn0[d]])amUfer=true;if(!amUfer)continue;
   var ki=k%W,kj=(k/W)|0,platz=false;for(var r2=-2;r2<=2&&!platz;r2++)for(var r3=-2;r3<=2&&!platz;r3++){var y0=kj+r2,x0=ki+r3;if(x0>=0&&y0>=0&&x0<W&&y0<W&&wand[y0*W+x0]&&hatTurm(y0*W+x0))platz=true}if(platz)continue;
   var best=null,bn=99;for(var oy=-2;oy<=0;oy++)for(var ox=-2;ox<=0;ox++){var add=[],gut=true;for(var q=0;q<9&&gut;q++){var x=ki+ox+q%3,y=kj+oy+(q/3|0);if(x<0||y<0||x>=W||y>=W){gut=false;break}var kk=y*W+x;
     if(wand[kk])continue;if(!aus[kk]||!fuell(kk)){gut=false;break}add.push(kk)}if(gut&&add.length<bn){bn=add.length;best=add}}
   if(best)best.forEach(function(x){wand[x]=1;Z[x]='g'})}
  aus=flut(wand,tor)}   // Innenfläche neu (Eckfelder und Turmplatz außen zählen zur Mauer)
 if(!offen.length)return;
 P.zellen=Z.join('');var mt='',ua='';for(k=0;k<WW;k++){mt+=tor[k]&&!auf[k]?'1':'0';ua+=auf[k]?'1':'0'}P.mauertor=mt;P.uferAuf=ua;   // uferAuf: nur für die Türme an den Ufern (mauerwerk)
 P.dinge=P.dinge.filter(function(o){return o.rolle||!(o.i>=0&&o.j>=0&&o.i<W&&o.j<W&&wand[o.j*W+o.i])});
 var HZ=P.hoehe,hat=new Uint8Array(WW);P.bauten=P.bauten.filter(function(b){if(b.rolle!=='mauer')return true;if(b.w===1&&b.h===1&&wand[b.j*W+b.i]){hat[b.j*W+b.i]=1;return true}return false});
 for(k=0;k<WW;k++)if(wand[k]&&!hat[k]){var o2={rolle:'mauer',i:k%W,j:(k/W)|0,w:1,h:1,klasse:m0.klasse,dach:m0.dach,achse:'i',wand:m0.wand,dachR:m0.dachR};if(HZ)o2.hz=HZ.charCodeAt(k)-48;P.bauten.push(o2)}
 var zl=[];for(j=0;j<W;j++){i=0;while(i<W){if(aus[j*W+i]){i++;continue}var i1=i;while(i1+1<W&&!aus[j*W+i1+1])i1++;zl.push(j,i,i1);i=i1+1}}P.umriss.bild=zl}
// N6b2e2b1 2:1-Zwischenstücke: Form a–p (Ecke N E S W · 4 + steil · 2 + Viertel). Schrägwand nur, wo die Schräge zum Betrachter zeigt (N flach und steil, E flach,
// W steil); Wand ruhig 3 : Riss 1; Zinnen vorn wie die Zinnen 8 : 3 (: 1 Pfeil und Blutspur an den N-Formen).
var ZW_SICHT='abcdefop',ZW_ZV={a:'00000000aaab',b:'00000000aaab',c:'00000000aaab',d:'00000000aaab',e:'00000000aaa',f:'00000000aaa',o:'00000000aaa',p:'00000000aaa'};
function ZW_IDS(){var r=[];for(var b=0;b<16;b++){var f=String.fromCharCode(97+b);r.push('mauer-zw-'+f,'mauer-zw-zinne-'+f);if(ZW_SICHT.indexOf(f)>=0)r.push('mauer-zw-wand-'+f,'mauer-zw-wand-'+f+'-a');
  var zv=ZW_ZV[f]||'';if(zv.indexOf('a')>=0)r.push('mauer-zw-zinne-'+f+'-a');if(zv.indexOf('b')>=0)r.push('mauer-zw-zinne-'+f+'-b')}return r}
var WEHR_IDS=['mauer-kante-i','mauer-kante-j','turm-kante-i','turm-kante-j','turm-scharte-i','turm-scharte-j','tor-sturz-i','tor-sturz-j','mauer-gang',
 'mauer-zinne-n','mauer-zinne-s','mauer-zinne-o','mauer-zinne-w','fels-treppe-s','fels-treppe-n','fels-treppe-o','fels-treppe-w',
 'mauer-rampe-s','mauer-rampe-n','mauer-rampe-o','mauer-rampe-w','turm-tuer-i','turm-tuer-j','turm-eingang-i','turm-eingang-j',
 'mauer-zinne-n-a','mauer-zinne-s-a','mauer-zinne-o-a','mauer-zinne-w-a','mauer-zinne-n-b','mauer-zinne-s-b','mauer-zinne-o-b','mauer-zinne-w-b',
 'mauer-halb-ob','mauer-halb-re','mauer-halb-un','mauer-halb-li','mauer-halb-zinne-ob','mauer-halb-zinne-ob-a','mauer-halb-zinne-ob-b','mauer-halb-zinne-re',
 'mauer-halb-zinne-un','mauer-halb-zinne-li','mauer-halb-wand','mauer-halb-wand-a','mauer-halb-wand-b','mauer-halb-wand-c','mauer-halb-wand-d'].concat(ZW_IDS(),TH_IDS());
// N6b2e3 Torhaus-Teile: Mauerscheibe außen/innen, Seite i/j, Spalte 0–2 (Bild links → rechts), Teil u/o; Köpfe auf Spießen; Gitter offen (jetzt) und zu (später)
function TH_IDS(){var r=[];['aussen','innen'].forEach(function(a){'ij'.split('').forEach(function(s){for(var c=0;c<3;c++)'uo'.split('').forEach(function(t){r.push('torhaus-'+a+'-'+s+'-'+c+t)})})});
 'ij'.split('').forEach(function(s){r.push('torhaus-spiesse-'+s,'torhaus-spiesse-'+s+'-a');for(var c=0;c<3;c++){r.push('torhaus-gitter-'+s+'-'+c,'torhaus-gitter-zu-'+s+'-'+c+'u');if(c===1)r.push('torhaus-gitter-zu-'+s+'-1o')}});return r}
// Zinnen-Varianten nach Lage (N6b2e1, gegen Wiederholung auf langen Mauern): 12 Plätze, Grundbild 8×, -a ausgebrochen 3×, -b Pfeil und Blutspur 1×
var ZINNE_VAR='00000000aaab';function zinneWahl(d,i,j,seed){var c=ZINNE_VAR.charAt(Math.floor(rausch(i,j,seed+131)*ZINNE_VAR.length));return 'mauer-zinne-'+d+(c==='0'?'':'-'+c)}   // N6b2e2t: Gangtür und Erdgeschosstür am Turm (turm-tuer-*, turm-eingang-*)
// N6b2e2a Halbfelder: Raster-Ecke → Bildlage (N oben, E rechts, S unten, W links); vordere Zinnen wie die Zinnen 8 : 3 : 1, Schrägwand 3 ruhige Fassungen (je 3) + Riss 2 + Flickstein 1
var HALB={N:'ob',E:'re',S:'un',W:'li'},WAND_VAR='000cccdddaab';function halbWahl(id,i,j,seed,v){v=v||ZINNE_VAR;var c=v.charAt(Math.floor(rausch(i,j,seed+137)*v.length));return c==='0'?id:id+'-'+c}
var WEHR_H=4,TURM_H=2,TURM_AB=36,TREPPE_AB=20,WRI={s:[0,1],o:[1,0],n:[0,-1],w:[-1,0]},WRK=['s','o','n','w'],ZBIT={s:1,o:2,n:4,w:8};
function mauerwerk(P,opt){opt=opt||{};var W=P.W,WW=W*W,Z=P.zellen,H=P.hoehe,MK=innenMaske(P),wand=new Uint8Array(WW),k,i,j,q;
 P.bauten.forEach(function(b){if(b.rolle!=='mauer')return;for(var y=b.j;y<b.j+b.h;y++)for(var x=b.i;x<b.i+b.w;x++)if(x>=0&&y>=0&&x<W&&y<W)wand[y*W+x]=1});
 var nw=0;for(k=0;k<WW;k++)nw+=wand[k];if(!nw)return;
 var lv=function(i,j){return H&&i>=0&&j>=0&&i<W&&j<W?H.charCodeAt(j*W+i)-48:0},drin=function(i,j){return i>=0&&j>=0&&i<W&&j<W&&MK[j*W+i]===1};
 var A=new Uint8Array(WW);for(k=0;k<WW;k++)if(wand[k])A[k]=1;   // 1 Mauer, 2 Tor, 3 Turm, 4 Treppe
 // Tore: Felder, an denen der Plan die Mauer für eine Straße oder den Fluss geöffnet hat (P.mauertor)
 var MT=P.mauertor;if(MT)for(k=0;k<WW;k++)if(!wand[k]&&MT.charCodeAt(k)===49)A[k]=2;
 // Ganghöhe: Boden + 4, dann glätten (Nachbarn höchstens 1 Stufe auseinander, nur anheben)
 var L=new Int16Array(WW).fill(-1);for(k=0;k<WW;k++)if(A[k])L[k]=lv(k%W,(k/W)|0)+WEHR_H;
 var N4=function(k){var i=k%W,j=(k/W)|0;return[i<W-1?k+1:-1,j<W-1?k+W:-1,i>0?k-1:-1,j>0?k-W:-1]};
 // N6b2e2t: ein Turm zählt mit seiner Geschosshöhe (Plattform − TURM_H, dort führen die Türen hinein) und wird selbst nie angehoben: keine Rampe vor dem Turm
 var eff=function(a){return A[a]===3?L[a]-TURM_H+1:L[a]};
 var glaetten=function(){var qq=[],h=0;for(k=0;k<WW;k++)if(A[k])qq.push(k);while(h<qq.length){var a=qq[h++],nn=N4(a),ea=eff(a);for(var d=0;d<4;d++){var b=nn[d];if(b>=0&&A[b]&&A[b]!==3&&L[b]<ea-1){L[b]=ea-1;qq.push(b)}}}};
 glaetten();
 // Mittelpunkt der Innenfläche (für die Reihenfolge rund um die Mauer)
 var cx=0,cy=0,cn=0;for(k=0;k<WW;k++)if(MK[k]){cx+=k%W;cy+=(k/W)|0;cn++}cx/=cn;cy/=cn;
 // Türme: Fenster 3 × 3 ganz aus Mauerfeldern
 var kand=[];for(j=0;j+2<W;j++)for(i=0;i+2<W;i++){var voll=true;for(q=0;q<9&&voll;q++)if(A[(j+(q/3|0))*W+i+q%3]!==1)voll=false;if(voll)kand.push([i,j])}
 // N6b2e2g1: nur Fenster, an denen innen eine Erdgeschosstür möglich ist (Gasse, Gras oder Tordurchfahrt neben einer Seite); an inneren Mauerecken liegt die
 // Gasse sonst nur über Eck
 var bauT=new Uint8Array(WW);P.bauten.forEach(function(b){if(b.rolle==='mauer')return;for(var y=b.j;y<b.j+b.h;y++)for(var x=b.i;x<b.i+b.w;x++)if(x>=0&&y>=0&&x<W&&y<W)bauT[y*W+x]=1});
 var tuerOk=function(c){for(var q2=0;q2<12;q2++){var s3=q2/3|0,r3=q2%3,x=s3===0?c[0]+r3:s3===1?c[0]+r3:s3===2?c[0]-1:c[0]+3,y=s3===0?c[1]-1:s3===1?c[1]+3:c[1]+r3;
   if(x<0||y<0||x>=W||y>=W)continue;var kk=y*W+x;if(!MK[kk])continue;if(A[kk]===2||(!A[kk]&&!bauT[kk]&&/[somqg]/.test(Z.charAt(kk))))return true}return false};kand=kand.filter(tuerOk);
 var tuerme=[],belegtT=new Uint8Array(WW);
 var frei=function(c){for(var q2=0;q2<9;q2++){var y=c[1]+(q2/3|0),x=c[0]+q2%3;for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){var x2=x+dx,y2=y+dy;if(x2>=0&&y2>=0&&x2<W&&y2<W&&belegtT[y2*W+x2])return false}}return true};
 var setzT=function(c){tuerme.push([c[0],c[1],0]);for(var q2=0;q2<9;q2++)belegtT[(c[1]+(q2/3|0))*W+c[0]+q2%3]=1};
 var mitte=function(c){return[c[0]+1,c[1]+1]},ab=function(a,b){var p=mitte(a),r=mitte(b);return Math.hypot(p[0]-r[0],p[1]-r[1])};
 // je Tor (zusammenhängende Torfelder) zwei Türme direkt daneben, möglichst weit auseinander (links und rechts der Durchfahrt)
 var torId=new Int32Array(WW).fill(-1),tore=[];for(k=0;k<WW;k++){if(A[k]!==2||torId[k]>=0)continue;var st=[k],T=[];torId[k]=tore.length;
  while(st.length){var a=st.pop();T.push(a);N4(a).forEach(function(b){if(b>=0&&A[b]===2&&torId[b]<0){torId[b]=tore.length;st.push(b)}})}tore.push(T)}
 var UA=P.uferAuf,ufer=[];if(UA){var su=new Uint8Array(WW);for(k=0;k<WW;k++){if(UA.charCodeAt(k)!==49||su[k])continue;var st2=[k],T2=[];su[k]=1;   // N6b2e2g2: Türme an beiden Ufern
  while(st2.length){var a2=st2.pop();T2.push(a2);N4(a2).forEach(function(b){if(b>=0&&!su[b]&&UA.charCodeAt(b)===49){su[b]=1;st2.push(b)}})}ufer.push(T2)}}
 // N6b2e3 Torhäuser (Thomas 22.11.2026): beide Türme direkt am Tor, in denselben Reihen wie das Tor (Turm 3 + Torbau 3 + Turm 3). Geht das nicht,
 // bleibt die alte Wahl und das Tor ein flacher Sturz. Rückmeldung Thomas: der Weg läuft offen unter dem Tor durch, Gang auf Mauerhöhe, vorn und hinten
 // eine Mauerscheibe mit runder Öffnung (gemalt), Gitter als eigenes Teil (jetzt hochgezogen). Notausschalter opt.torhaus:false.
 var TH=[],kandS=new Set();kand.forEach(function(c){kandS.add(c[1]*W+c[0])});
 tore.concat(ufer).forEach(function(T,ti){if(opt.torhaus!==false&&ti<tore.length&&T.length===9){var b=torFelder(W,T),pa=null;
   [[[b.x0-3,b.y0],[b.x1+1,b.y0]],[[b.x0,b.y0-3],[b.x0,b.y1+1]]].forEach(function(pp){if(!pa&&pp.every(function(c){return c[0]>=0&&c[1]>=0&&kandS.has(c[1]*W+c[0])&&frei(c)}))pa=pp});
   if(pa){setzT(pa[0]);setzT(pa[1]);TH.push({t:[tuerme.length-2,tuerme.length-1],i:b.x0,j:b.y0});return}}
  var nah=kand.filter(function(c){for(var q2=0;q2<T.length;q2++){var ti=T[q2]%W,tj=(T[q2]/W)|0;if(ti>=c[0]-2&&ti<=c[0]+4&&tj>=c[1]-2&&tj<=c[1]+4)return true}return false});
  var best=null,bd=-1;for(var a=0;a<nah.length;a++)for(var b=a+1;b<nah.length;b++){var d=ab(nah[a],nah[b]);if(d>bd&&frei(nah[a])&&frei(nah[b])&&Math.abs(nah[a][0]-nah[b][0])+Math.abs(nah[a][1]-nah[b][1])>4){bd=d;best=[nah[a],nah[b]]}}
  if(best){setzT(best[0]);setzT(best[1])}else if(nah.length&&frei(nah[0]))setzT(nah[0])});
 // dann reihum (nach Winkel um die Mitte) etwa alle TURM_AB Felder (Thomas 22.11.2026: 36 statt 12, zu viele Türme; die Torpaare bleiben)
 kand.sort(function(a,b){return Math.atan2(a[1]+1-cy,a[0]+1-cx)-Math.atan2(b[1]+1-cy,b[0]+1-cx)||a[1]-b[1]||a[0]-b[0]});
 kand.forEach(function(c){if(!frei(c))return;for(var t=0;t<tuerme.length;t++)if(ab(c,tuerme[t])<TURM_AB)return;setzT(c)});
 // N6b2e2b2 Türme auf Schrägen (Thomas 22.11.2026: „Turm springt vor“): wo auf Schrägen kein 3 × 3 ganz aus Mauer passt, darf ein Turm quer über der Mauer
 // sitzen und mit seiner äußeren Ecke vorspringen. Fenster mit mindestens 5 Mauerfeldern, die übrigen Felder draußen auf freiem Boden (Gras, Fels; kein
 // Gebäude, Ding, Weg, Wasser, Tor); innen muss die Erdgeschosstür möglich sein wie bei allen Türmen. Dann reihum wie oben, gleicher Abstand TURM_AB.
 // Die vorspringenden Felder werden Mauer und Innenfläche. Notausschalter opt.turmVor:false.
 var vor=0;if(opt.turmVor!==false){var DGv=new Uint8Array(WW);P.dinge.forEach(function(o){if(o.i>=0&&o.j>=0&&o.i<W&&o.j<W)DGv[o.j*W+o.i]=1});var vk=[];
  for(j=0;j+2<W;j++)for(i=0;i+2<W;i++){var mz=0,fe=[],gut=true;for(q=0;q<9&&gut;q++){var kq=(j+(q/3|0))*W+i+q%3;if(A[kq]===1)mz++;
    else if(!A[kq]&&!MK[kq]&&!bauT[kq]&&!DGv[kq]&&'gx'.indexOf(Z.charAt(kq))>=0)fe.push(kq);else gut=false}
   if(gut&&mz>=5&&fe.length&&tuerOk([i,j]))vk.push([i,j,fe])}
  vk.sort(function(a,b){return Math.atan2(a[1]+1-cy,a[0]+1-cx)-Math.atan2(b[1]+1-cy,b[0]+1-cx)||a[2].length-b[2].length||a[1]-b[1]||a[0]-b[0]});
  var m1=null;P.bauten.some(function(b){if(b.rolle==='mauer'){m1=b;return true}return false});
  vk.forEach(function(c){if(!frei(c))return;for(var t=0;t<tuerme.length;t++)if(ab(c,tuerme[t])<TURM_AB)return;
   c[2].forEach(function(kq){var x=kq%W,y=(kq/W)|0;A[kq]=1;wand[kq]=1;nw++;MK[kq]=1;L[kq]=lv(x,y)+WEHR_H;
    var o2={rolle:'mauer',i:x,j:y,w:1,h:1,klasse:m1.klasse,dach:m1.dach,achse:'i',wand:m1.wand,dachR:m1.dachR};if(H)o2.hz=lv(x,y);P.bauten.push(o2)});
   setzT([c[0],c[1]]);vor++});
  if(vor){var zl=[];for(j=0;j<W;j++){i=0;while(i<W){if(!MK[j*W+i]){i++;continue}var i1=i;while(i1+1<W&&MK[j*W+i1+1])i1++;zl.push(j,i,i1);i=i1+1}}P.umriss.bild=zl}}
 // Turm: Geschoss (Ganghöhe im Turm) = höchste Ganghöhe darunter und rings um den Turm, Plattform TURM_H Stufen darüber; danach wieder glätten (bis alles passt).
 // N6b2e2t (Thomas 22.11.2026): keine Rampen mehr. Der Gang führt auf Geschosshöhe durch Türen in den Turm und auf der anderen Seite wieder hinaus,
 // die Gangfelder rings um den Turm liegen genau auf Geschosshöhe; keine Brücke zwischen zwei Türmen.
 // N6b2e2t: Stufen im Gang nie auf die Zinnen zu und nie an ihnen endend (vor und hinter der Stufe liegt keine Außenkante). Hat ein Feld
 // nur so einen höheren Nachbarn, wird es angehoben (die Mauer wird dort höher), bis nichts mehr quer steigt.
 var langs=function(a,b){var ai=a%W,aj=(a/W)|0,di=b%W-ai,dj=((b/W)|0)-aj,aus=function(x,y){return x>=0&&y>=0&&x<W&&y<W&&!A[y*W+x]&&!drin(x,y)};return !aus(ai-di,aj-dj)&&!aus(ai+2*di,aj+2*dj)};   // kein Ende an der Außenseite (Zinnen)
 var quer=function(){var neu=false;for(var a=0;a<WW;a++){if(A[a]!==1&&A[a]!==2)continue;var nn=N4(a),hoch=0,gut=0;
   for(var d=0;d<4;d++){var b=nn[d];if(b>=0&&A[b]&&A[b]!==3&&L[b]===L[a]+1){hoch++;if(langs(a,b))gut++}}if(hoch&&!gut){L[a]++;neu=true}}return neu};
 glaetten();for(var qr=0;qr<40&&quer();qr++)glaetten();
 var turmFeld=function(t,q2){return(t[1]+(q2/3|0))*W+t[0]+q2%3},SEITE_T={s:function(t,q){return[t[0]+q,t[1]+2,t[0]+q,t[1]+3]},n:function(t,q){return[t[0]+q,t[1],t[0]+q,t[1]-1]},
  o:function(t,q){return[t[0]+2,t[1]+q,t[0]+3,t[1]+q]},w:function(t,q){return[t[0],t[1]+q,t[0]-1,t[1]+q]}},REIHE=[1,0,2];   // Seite → [Turmfeld i, j, Nachbar außen i, j], Mitte zuerst
 for(var rund=0;rund<40;rund++){var neu=false;tuerme.forEach(function(t){var m=0,q2;for(q2=0;q2<9;q2++){var k2=turmFeld(t,q2);m=Math.max(m,A[k2]===3?L[k2]-TURM_H:L[k2])}
   WRK.forEach(function(d){for(var q=0;q<3;q++){var f=SEITE_T[d](t,q),x=f[2],y=f[3];if(x>=0&&y>=0&&x<W&&y<W&&(A[y*W+x]===1||A[y*W+x]===2))m=Math.max(m,L[y*W+x])}});
   for(q2=0;q2<9;q2++){var kk=turmFeld(t,q2);A[kk]=3;if(L[kk]!==m+TURM_H){L[kk]=m+TURM_H;neu=true}}t[2]=m+TURM_H});
  if(quer())neu=true;if(!neu)break;glaetten()}
 // Treppen innen an den Türmen: 4 innere Mauerfelder in einer Reihe an der Ringgasse (gleicher Boden, Ganghöhe = Boden + 4), dahinter weiter Mauer,
 // am oberen Ende ein Gang- oder Turmfeld auf Ganghöhe. Fuß auf Höhe der Gasse, steigt je Feld 1 Stufe.
 var GEHW=/[somq]/,stufe=new Array(WW).fill('.'),treppen=[],bau=new Uint8Array(WW);
 P.bauten.forEach(function(b){if(b.rolle==='mauer')return;for(var y=b.j;y<b.j+b.h;y++)for(var x=b.i;x<b.i+b.w;x++)if(x>=0&&y>=0&&x<W&&y<W)bau[y*W+x]=1});
 var gasse=function(x,y){return x>=0&&y>=0&&x<W&&y<W&&!A[y*W+x]&&!bau[y*W+x]&&MK[y*W+x]&&GEHW.test(Z.charAt(y*W+x))};
 // N6b2e2t Türen (Thomas 22.11.2026): an jeder Turmseite, an die der Gang auf Geschosshöhe stößt, eine Gangtür (Mitte der Seite, sonst ein anderes Feld
 // dieser Seite); dazu eine Erdgeschosstür zur Gasse (innen, höchstens 1 Stufe Unterschied; an Torecken in die Tordurchfahrt), dort kommen die Soldaten heraus.
 // Nie eine Öffnung nach außen. Wo keine gerade Treppe neben den Turm passt, ist diese Tür der Aufgang (Thomas 22.11.2026).
 // t[3] = {tuer: [Turmfeld i, j, Gasse i, j] oder null, gang: [[Turmfeld i, j, Gangfeld i, j], …]}. Felder vor Türen bleiben frei von Treppen und Nischen.
 var RES=new Uint8Array(WW),TUER=new Set();
 tuerme.forEach(function(t){var o={tuer:null,gang:[]},fl=t[2]-TURM_H,r,x,y,f;
  WRK.forEach(function(d){for(r=0;r<3;r++){f=SEITE_T[d](t,REIHE[r]);x=f[2];y=f[3];if(x<0||y<0||x>=W||y>=W)continue;var b=y*W+x,fk=f[1]*W+f[0];
    if((A[b]===1||A[b]===2)&&L[b]===fl){o.gang.push(f);RES[b]=1;TUER.add(fk*WW+b);TUER.add(b*WW+fk);break}}});
  for(r=0;r<3&&!o.tuer;r++)for(var e=0;e<4&&!o.tuer;e++){f=SEITE_T[WRK[e]](t,REIHE[r]);if(gasse(f[2],f[3])&&Math.abs(lv(f[2],f[3])-lv(f[0],f[1]))<=1){o.tuer=f;RES[f[3]*W+f[2]]=1}}
  // sonst Gras innen (Turm am Wassertor, Ufer): die Wache tritt aufs Ufer
  for(r=0;r<3&&!o.tuer;r++)for(e=0;e<4&&!o.tuer;e++){f=SEITE_T[WRK[e]](t,REIHE[r]);x=f[2];y=f[3];if(x>=0&&y>=0&&x<W&&y<W&&!A[y*W+x]&&!bau[y*W+x]&&MK[y*W+x]&&Z.charAt(y*W+x)==='g'&&Math.abs(lv(x,y)-lv(f[0],f[1]))<=1){o.tuer=f;RES[y*W+x]=1}}
  // sonst (Turm an einer Torecke, innen nur über Eck an der Gasse): Tür in die Tordurchfahrt (Straße unter dem Sturz, innerhalb des Umrisses), nie über Wasser
  for(r=0;r<3&&!o.tuer;r++)for(e=0;e<4&&!o.tuer;e++){f=SEITE_T[WRK[e]](t,REIHE[r]);x=f[2];y=f[3];if(x>=0&&y>=0&&x<W&&y<W&&A[y*W+x]===2&&MK[y*W+x]&&GEHW.test(Z.charAt(y*W+x))&&Math.abs(lv(x,y)-lv(f[0],f[1]))<=1)o.tuer=f}
  t.push(o)});
 var verb=function(a,b){var ta=A[a]===3,tb=A[b]===3;if(ta||tb)return ta&&tb||TUER.has(a*WW+b);return Math.abs(L[b]-L[a])<=1};   // Gang ↔ Gang, Turm nur durch Türen
 var lauf=function(i,j,d,e){var D=WRI[d],E=WRI[e],g0=lv(i,j),f=[];for(var s=0;s<4;s++){var x=i+D[0]*s,y=j+D[1]*s;if(x<0||y<0||x>=W||y>=W)return null;var kk=y*W+x;
   if(A[kk]!==1||RES[kk]||lv(x,y)!==g0||L[kk]!==g0+WEHR_H||!gasse(x+E[0],y+E[1])||lv(x+E[0],y+E[1])!==g0)return null;
   var ox=x-E[0],oy=y-E[1];if(ox<0||oy<0||ox>=W||oy>=W||(A[oy*W+ox]!==1&&A[oy*W+ox]!==3))return null;f.push(kk)}
  var tx=i+D[0]*4,ty=j+D[1]*4;if(tx<0||ty<0||tx>=W||ty>=W)return null;var tk=ty*W+tx;if((A[tk]!==1&&A[tk]!==3)||L[tk]!==g0+WEHR_H)return null;
  // Rückmeldung Thomas (N6b2e1): oben eine Plattform: das Feld nach der letzten Stufe und die Mauerfelder daneben (quer über die Mauer) flach auf Ganghöhe,
  // ohne höheren Nachbarn (sonst würden sie Rampe); und keine Treppe stößt an eine andere Treppe oder Nische (auch in der Reihe daneben)
  if(A[tk]!==1)return null;for(var s2=0;s2<3;s2++){var px=tx-E[0]*s2,py=ty-E[1]*s2;if(px<0||py<0||px>=W||py>=W)return null;var pk=py*W+px;
   if(s2&&!A[pk])break;if((A[pk]!==1&&A[pk]!==2)||L[pk]!==g0+WEHR_H)return null;var nn2=N4(pk);
   for(var d2=0;d2<4;d2++){var b2=nn2[d2];if(b2>=0&&A[b2]&&A[b2]!==3&&A[b2]!==4&&A[b2]!==5&&L[b2]>g0+WEHR_H)return null}}
  for(var s3=-3;s3<=6;s3++)for(var e3=0;e3<2;e3++){var rx=i+D[0]*s3-E[0]*e3,ry=j+D[1]*s3-E[1]*e3;if(rx>=0&&ry>=0&&rx<W&&ry<W&&(A[ry*W+rx]===4||A[ry*W+rx]===5))return null}
  for(var s4=-1;s4<4;s4++){var sx=i+D[0]*s4,sy=j+D[1]*s4;if(sx>=0&&sy>=0&&sx<W&&sy<W&&SPERR[sy*W+sx])return null}   // N6b2e2t: auch nicht im Umfeld einer älteren Treppe
  // N6b2e1: vor dem Fuß eine Nische (inneres Mauerfeld wird frei, außen läuft die Mauer weiter, seitlich die Gasse): man geht geradeaus auf die Treppe
  var bx=i-D[0],by=j-D[1];if(bx<0||by<0||bx>=W||by>=W)return null;var bk=by*W+bx;if(A[bk]!==1||RES[bk]||lv(bx,by)!==g0||!gasse(bx+E[0],by+E[1])||lv(bx+E[0],by+E[1])!==g0)return null;
  var nx=bx-E[0],ny=by-E[1];if(nx<0||ny<0||nx>=W||ny>=W||(A[ny*W+nx]!==1&&A[ny*W+nx]!==3))return null;f.unshift(bk);return f};
 // Eine Treppe darf den Gang nicht zerschneiden (an dünnen Ecken ist die innere Reihe der einzige Weg): Zahl der Gangstücke vorher und nachher gleich
 var stuecke=function(){var seen=new Uint8Array(WW),c=0;for(var k0=0;k0<WW;k0++){if(!A[k0]||A[k0]===5||seen[k0])continue;c++;var st=[k0];seen[k0]=1;
   while(st.length){var a=st.pop(),nn=N4(a);for(var d=0;d<4;d++){var b=nn[d];if(b>=0&&A[b]&&A[b]!==5&&!seen[b]&&verb(a,b)){seen[b]=1;st.push(b)}}}}return c};
 var c0=stuecke();
 var SPERR=new Uint8Array(WW);
 var setzR=function(x,y,d,e,f){var g0=lv(x,y),alt=f.map(function(kk){return[A[kk],L[kk]]});f.forEach(function(kk,s){if(!s){A[kk]=5;L[kk]=g0;return}A[kk]=4;L[kk]=g0+s-1;stufe[kk]=d});
  if(stuecke()!==c0){f.forEach(function(kk,s){A[kk]=alt[s][0];L[kk]=alt[s][1];stufe[kk]='.'});return false}
  var nk=f[0],nx=nk%W,ny=(nk/W)|0;
  for(var s5=-3;s5<=6;s5++)for(var e5=0;e5<2;e5++){var qx=x+WRI[d][0]*s5-WRI[e][0]*e5,qy=y+WRI[d][1]*s5-WRI[e][1]*e5;if(qx>=0&&qy>=0&&qx<W&&qy<W)SPERR[qy*W+qx]=1}
  treppen.push({felder:f.slice(1).map(function(kk){return[kk%W,(kk/W)|0]}),s:d,nische:[nx,ny],gasse:[nx+WRI[e][0],ny+WRI[e][1]],unten:g0,oben:g0+WEHR_H});return true};
 tuerme.forEach(function(t){var kandT=[];
  for(var y=t[1]-6;y<=t[1]+8;y++)for(var x=t[0]-6;x<=t[0]+8;x++){if(x<0||y<0||x>=W||y>=W||A[y*W+x]!==1)continue;
   for(var a=0;a<4;a++)for(var b=0;b<4;b++){var d=WRK[a],e=WRK[b];if(WRI[d][0]===WRI[e][0]||WRI[d][1]===WRI[e][1])continue;
    var f=lauf(x,y,d,e);if(!f)continue;var ex=x+WRI[d][0]*4,ey=y+WRI[d][1]*4,dd=Math.max(0,t[0]-ex,ex-t[0]-2)+Math.max(0,t[1]-ey,ey-t[1]-2);
    if(dd<=3)kandT.push({f:f,d:d,e:e,x:x,y:y,dd:dd})}}
  kandT.sort(function(a,b){return a.dd-b.dd});for(var q2=0;q2<kandT.length;q2++){var c=kandT[q2];if(lauf(c.x,c.y,c.d,c.e)&&setzR(c.x,c.y,c.d,c.e,c.f))break}});
 // N6b2e2t (Thomas: die Treppen an den Türmen ersetzen die Treppen alle ~20 Felder): weitere Treppen nur für Gangstücke ohne Aufgang, je Stück eine
 var lab=new Int32Array(WW).fill(-1),nl=0;for(var k0=0;k0<WW;k0++){if(!A[k0]||A[k0]>=4||lab[k0]>=0)continue;var s0=[k0];lab[k0]=nl;
  while(s0.length){var a0=s0.pop(),n0=N4(a0);for(var d0=0;d0<4;d0++){var b0=n0[d0];if(b0>=0&&A[b0]&&A[b0]<4&&lab[b0]<0&&verb(a0,b0)){lab[b0]=nl;s0.push(b0)}}}nl++}
 var hatT=new Uint8Array(nl);treppen.forEach(function(t){var f=t.felder[3],d=WRI[t.s],ob=(f[1]+d[1])*W+f[0]+d[0];if(lab[ob]>=0)hatT[lab[ob]]=1});
 var wk=[];for(k=0;k<WW;k++)if(A[k]===1)wk.push(k);wk.sort(function(a,b){return Math.atan2(((a/W)|0)-cy,a%W-cx)-Math.atan2(((b/W)|0)-cy,b%W-cx)||a-b});
 wk.forEach(function(kk){var x=kk%W,y=(kk/W)|0;if(A[kk]!==1||lab[kk]<0||hatT[lab[kk]])return;for(var a=0;a<4;a++)for(var b=0;b<4;b++){var d=WRK[a],e=WRK[b];if(WRI[d][0]===WRI[e][0]||WRI[d][1]===WRI[e][1])continue;
  var f=lauf(x,y,d,e);if(f&&setzR(x,y,d,e,f)){hatT[lab[kk]]=1;return}}});
 // Stufen im Wehrgang (Burgberg): Feld steigt zum Nachbarn, der genau 1 höher ist
 for(k=0;k<WW;k++){if(A[k]!==1&&A[k]!==2)continue;var nn=N4(k);for(var lg=1;lg>=0&&stufe[k]==='.';lg--)for(q=0;q<4;q++){var b=nn[q];if(b>=0&&A[b]&&A[b]!==3&&A[b]!==4&&A[b]!==5&&L[b]===L[k]+1&&(!lg||langs(k,b))){stufe[k]=['o','s','w','n'][q];break}}}   // N6b2e2t: längs zuerst
 // N6b2e2a Halbfelder: ein freies Feld mit genau zwei Mauernachbarn an einer gemeinsamen Ecke (Stufe der 45°-Treppe) bekommt die halbe Mauer zu dieser Ecke
 // (Art d, Form = Ecke N/E/S/W im Raster: N −i−j, E +i−j, S +i+j, W −i+j), gleiche Höhe wie die Nachbarn, nicht begehbar (Gang nur auf ganzen Feldern).
 // Außen (außerhalb des Umrisses) mit Zinnen auf der Schräge. Nicht auf Gebäuden, Dingen und Wasser (Bäume vor der Mauer räumt schon mauerRund weg).
 var DG={};P.dinge.forEach(function(o){if(o.i>=0&&o.j>=0&&o.i<W&&o.j<W)DG[o.j*W+o.i]=1});
 var halb=0;
 for(k=0;k<WW;k++){if(A[k]||bau[k]||DG[k]||RES[k]||'wy'.indexOf(Z.charAt(k))>=0)continue;   // N6b2e2g1: nie vor einer Turmtür (RES)
  var hi=k%W,hj=(k/W)|0,w4=[hi<W-1&&A[k+1]===1,hj<W-1&&A[k+W]===1,hi>0&&A[k-1]===1,hj>0&&A[k-W]===1],nw4=w4.filter(Boolean).length;
  if(nw4!==2)continue;var form=w4[2]&&w4[3]?'N':w4[0]&&w4[3]?'E':w4[0]&&w4[1]?'S':w4[2]&&w4[1]?'W':null;if(!form)continue;
  var na=w4[0]?k+1:k-1,nb2=w4[1]?k+W:k-W;if(L[na]!==L[nb2]||stufe[na]!=='.'||stufe[nb2]!=='.')continue;
  A[k]=6;L[k]=L[na];stufe[k]=form;halb++}
 // N6b2e2b1 2:1-Zwischenstücke (flache und steile Mauerstücke): an einer 2 Felder breiten Stufe läuft die Kante von Außenecke zu Außenecke durch zwei
 // freie Felder. Das Feld an der Mauer (bisher 45°-Halbfeld) wird Dreiviertel-Stück, das Feld davor Viertel-Stück (Art q, nicht begehbar, Höhe der Nachbarn,
 // außen Zinnen). Nur hinzufügen, nie Mauerfelder anschneiden. Form = Buchstabe a–p: Ecke (N E S W) · 4 + steil · 2 + Viertel. Notausschalter opt.zwischen:false.
 var zw=0;if(opt.zwischen!==false){var ZW_E=[[-1,-1],[1,-1],[1,1],[-1,1]],ok1=function(x,y){return x>=0&&y>=0&&x<W&&y<W},am=function(x,y){return ok1(x,y)&&A[y*W+x]===1},
   frei2=function(x,y){var kk=y*W+x;return ok1(x,y)&&!A[kk]&&!bau[kk]&&!DG[kk]&&!RES[kk]&&'wy'.indexOf(Z.charAt(kk))<0},neu=[];
  for(k=0;k<WW;k++){if(A[k]!==6)continue;var ci='NESW'.indexOf(stufe[k]),si=ZW_E[ci][0],sj=ZW_E[ci][1],x0=k%W,y0=(k/W)|0,treffer=[];
   for(var ax=0;ax<2;ax++){var o=function(dx,dy){return ax?[x0+dy*si,y0+dx*sj]:[x0+dx*si,y0+dy*sj]},v=o(-1,0),c=o(-1,1),n1=o(-2,0),n2=o(-1,-1),n3=o(-2,1),a1=o(1,0);
    if(!frei2(v[0],v[1])||!am(c[0],c[1])||L[c[1]*W+c[0]]!==L[a1[1]*W+a1[0]]||stufe[c[1]*W+c[0]]!=='.')continue;
    if(am(n1[0],n1[1])||am(n2[0],n2[1])||am(n3[0],n3[1])||(ok1(n1[0],n1[1])&&A[n1[1]*W+n1[0]]))continue;treffer.push([ax,v[1]*W+v[0]])}
   if(treffer.length===1)neu.push([k,ci,treffer[0][0],treffer[0][1]])}
  neu.forEach(function(t){if(A[t[3]])return;var b=t[1]*4+t[2]*2;A[t[0]]=7;stufe[t[0]]=String.fromCharCode(97+b);A[t[3]]=7;L[t[3]]=L[t[0]];stufe[t[3]]=String.fromCharCode(98+b);halb--;zw+=2})}
 // Zinnen: Mauer und Tor an jeder Außenkante, Turm ringsum
 // Ablage nur der Mauerfelder (Kosten nach Mauerlänge, nicht nach Fläche): k = Feldnummern j·W + i (aufsteigend), f = je Feld 4 Zeichen Art, Ganghöhe, Stufe, Zinnen
 var KL=[],FS='',ART='.mtTrndq';for(k=0;k<WW;k++){if(!A[k])continue;var z=0,i3=k%W,j3=(k/W)|0;
  if(A[k]>=6){if(!drin(i3,j3))z=1}   // Halbfeld: Bit 1 = Zinnen auf der Schräge (außen)
  else if(A[k]!==4&&A[k]!==5)WRK.forEach(function(d){var x=i3+WRI[d][0],y=j3+WRI[d][1],a=x>=0&&y>=0&&x<W&&y<W?A[y*W+x]:0;if(A[k]===3?a!==3:(!a&&!drin(x,y)))z|=ZBIT[d]});
  KL.push(k);FS+=ART.charAt(A[k])+String.fromCharCode(48+L[k])+stufe[k]+z.toString(16)}
 P.wehr={W:W,k:KL,f:FS,tuerme:tuerme,torhaus:TH,treppen:treppen,tore:tore.length,felder:nw,halb:halb,zwischen:zw,vor:vor,hoehe:WEHR_H,turmHoehe:TURM_H};if(opt.torhaus===false)delete P.wehr.torhaus}
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
  w.tuerme.forEach(function(t,ix){for(var q=0;q<9;q++)turm.set((t[1]+(q/3|0))*W+t[0]+q%3,ix)});
}
  // N6b2e2t: Türen des Turms (Gangtür: Gangfeld ↔ Turmfeld, Erdgeschosstür: Gasse ↔ Turmfeld), Mitte des Turms (innere Treppe Geschoss ↔ Plattform)
 var tg=new Map(),add=function(m,a,b){var l=m.get(a);if(!l)m.set(a,l=[]);l.push(b)},mitte={};
 if(w)w.tuerme.forEach(function(t){mitte[(t[1]+1)*W+t[0]+1]=1;var o=t[3];if(!o)return;
  o.gang.forEach(function(f){var a=f[1]*W+f[0],b=f[3]*W+f[2];add(tg,a,[f[2],f[3],'gang']);add(tg,'g'+b,[f[0],f[1],'turm'])});
  if(o.tuer){var a=o.tuer[1]*W+o.tuer[0],b=o.tuer[3]*W+o.tuer[2];add(tg,a,[o.tuer[2],o.tuer[3],'boden']);add(tg,'b'+b,[o.tuer[0],o.tuer[1],'turm'])}});
 x={bau:bau,fuss:fuss,gas:gas,nis:nis,turm:turm,tg:tg,mitte:mitte};if(WEHR_IX)WEHR_IX.set(P,x);return x}
// N6b2e1: Turmplattformen sind Wehrgang (2 Stufen höher, Rampen davor), kein eigener Belag mehr; Nischen vor dem Treppenfuß sind Boden.
function wehrNachbarn(P,i,j,e){var W=P.W,w=P.wehr,X=wehrIndex(P),k=j*W+i,r=[],H=P.hoehe,Z=P.zellen;
 var lv=function(x,y){return H?H.charCodeAt(y*W+x)-48:0},R=w?wehrLese(w):null,gl=function(kk){var a=R?R.art(kk):'.';return R&&a!=='n'&&a!=='d'&&a!=='q'?R.gang(kk):-1};
 WRK.forEach(function(d){var x=i+WRI[d][0],y=j+WRI[d][1];if(x<0||y<0||x>=W||y>=W)return;var q=y*W+x;
  if(e==='boden'){if(((!X.bau[q]&&/[somqy]/.test(Z.charAt(q)))||X.nis[q])&&Math.abs(lv(x,y)-lv(i,j))<=1)r.push({i:x,j:y,e:'boden'})}
  else if(e==='gang'){if(gl(k)>=0&&gl(q)>=0&&Math.abs(gl(q)-gl(k))<=1)r.push({i:x,j:y,e:'gang'})}
  else if(e==='turm'){if(X.turm.has(k)&&X.turm.get(q)===X.turm.get(k))r.push({i:x,j:y,e:'turm'})}});   // N6b2e2t: Turmgeschoss, ein Raum je Turm
 var tl=function(key){var l=X.tg.get(key);if(l)l.forEach(function(c){r.push({i:c[0],j:c[1],e:c[2]})})};
 if(e==='turm'){tl(k);if(X.mitte[k])r.push({i:i,j:j,e:'gang'})}else if(e==='gang'){tl('g'+k);if(X.mitte[k])r.push({i:i,j:j,e:'turm'})}else tl('b'+k);
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
var TOTE={cemetery:1,undertaker:1,'coffin-maker':1,'tear-press':1},HAIN={'olive-grove':'baum-olive',orchard:'baum-apfel'},GRAB_JE=400,GRAB_MAX=40,HOF_JE=1000,UE_MAX=40,
 SEITE=['south','north','east','west'],SPIEGEL={south:'east',east:'south',north:'west',west:'north'};
// N6b4b2 Umlandplan (Thomas 23.11.2026, AT3_NEUAUSRICHTUNG 4.3a): Flurgürtel außen um den Ring vor den Toren. Felder nach Bedarf aus landwirtschaft.js
// (1 Feld = 1 Bildfeld, ersetzt HOF_JE), Höfe nach Hofart (Mischung nach Ortsgröße, Sonderhöfe nach Biom; Nomadenzelte wandern und stehen nicht im Plan),
// jeder Hof mit bis zu 3 Kulturen, seine Felder höchstens FLUR_WEIT Schritte vom Hof, Feldwege (h) im Raster FLUR_RASTER, angeschlossen an die Straßen.
// Feld- und Viehgebäude der Stadtübersicht werden Kulturen auf den Höfen (Fläche w × h). Grundflächen der Hofhäuser sind Platzhalter bis N6b4c.
// Ergebnis P.flur {arten, z (Kulturnummer je Bildfeld wie P.zellen, '.' keine), hoefe, felder, wege, fehlt}; flurArt()/flurTempo() für die Begehbarkeit.
// Kosten: einmal je Ort im Bildkern, linear in der Fläche des Gürtels (größte Hauptstadt ~0,1 s in Node). opt.flur:false = wie vorher (HOF_JE).
var FLUR_PLATZ=1.25,FLUR_MAX=240,FLUR_RASTER=13,FLUR_WEIT=16,LW_BIOM={mountain:'mountains',conifer:'taiga',mangrove:'mangroves'},
 HOF_HAUS={cottage:1,farmstead:2,'villa-rustica':3,'herders-camp':2,plantation:3,'oasis-garden':2},WEIDE={fodder:1,livestock:1};
// N6b4c3 Hofhäuser als Ganzbild (Thomas 23.11.2026, tools/at3-hofhaus.py): nur Biome mit felder:true (Mittelmeer), Kate, Bauernhof, Gutshof, Hirtenlager.
// Bild 'hof-<art>-<n>-<sued|ost|nord|west>' je Türseite, jede Lage eigens gemalt (lokal gedreht, Licht oben links). Türfeld fest (HOF_TUER = s >> 1, längs der
// Seite gezählt wie die gedrehte Zeichnung: Süd und West ab kleinem i bzw. j, Ost und Nord von der anderen Ecke), darum legen flurPlan() und postenHof() die Tür
// dorthin; so passt das Bild auch nach drehen(). Variante b.hv nach Lage (rausch, verbraucht keinen Zufall des Plans), die letzte selten.
// Kein passendes Bild (andere Hofart, Tür woanders): Baukasten wie vorher. Notausschalter opt.hofbild:false.
var HOF_BILD_VAR={cottage:[.5,.4,.1],farmstead:[.5,.4,.1],'villa-rustica':[.85,.15],'herders-camp':[.85,.15]},HOF_HOCH={cottage:52,farmstead:78,'villa-rustica':86,'herders-camp':54},
 HOF_RICHT={'0,1':'sued','1,0':'ost','0,-1':'nord','-1,0':'west'};
function hofBildAn(P,opt){var B=BIOME[P.biom];return !!(B&&B.felder&&!(opt&&opt.hofbild===false))}
function hofTuerOff(r,s){var c=s>>1;return r==='sued'||r==='west'?c:s-1-c}
function hofVariante(art,i,j,seed){var V=HOF_BILD_VAR[art];if(!V)return 0;var u=rausch(i,j,seed+231),k;for(k=0;k<V.length-1;k++){u-=V[k];if(u<0)return k+1}return V.length}
var LWDAT=null;
function LWm(){return G.AT3LANDW||(typeof require!=='undefined'?require('./landwirtschaft.js'):null)}
function BGm(){return G.AT3BEGEH||(typeof require!=='undefined'?require('./begehbar.js'):null)}
function setzeLandw(D){LWDAT=D;return D}
function landwDaten(o){if(o&&o.landw)return o.landw;if(LWDAT)return LWDAT;if(typeof require!=='undefined'){var L=LWm(),J=function(f){return require('./daten/'+f+'.json')};
  LWDAT=L.daten(J('landwirtschaft'),J('gebaeude'),J('waren'),J('rezepte'))}return LWDAT}
// Vorbereitung in aussen(): Bedarf je Ware, Kultur je Feld- und Viehgebäude
function flurStart(opt,einw,fluss,Li){if(opt.flur===false)return null;var LM=LWm(),LD=LM&&landwDaten(opt);if(!LD)return null;
 var bl=LW_BIOM[opt.biom]||opt.biom,o=LM.ort(LD,{einw:einw,biom:bl,fluss:!!fluss,leit:opt.leit||[]}),kv={};
 LD.K.forEach(function(x){if(x.k.geb&&!x.k.aussenposten&&!kv[x.k.geb]&&x.biome.indexOf(bl)>=0)kv[x.k.geb]=x.id});
 return{biomLW:bl,stufe:o.stufe.id,kulturVon:kv,liste:[],zeilen:o.zeilen.filter(function(z){return z.felder>0}).map(function(z){return{ware:z.ware,felder:z.felder,kulturen:z.kulturen}})}}
// Fläche des Gürtels in Bildfeldern: Felder + Hofhäuser samt freiem Rand (aus den Hofarten-Gewichten der Ortsgröße) + Feldwege (2 von FLUR_RASTER), mal FLUR_PLATZ
function flurBedarf(FL,g){var n=0;FL.zeilen.forEach(function(z){n+=z.felder});FL.liste.forEach(function(x){n+=x.w*x.h});if(!n)return 0;
 var LM=LWm(),LD=landwDaten({}),GW=hofGewichte(g),sw=0,sf=0,sh=0;(LD?LM.hofarten(LD,FL.biomLW):[]).forEach(function(h){var w=GW[h.id]||(HOF_HAUS[h.id]?3:0);if(!w||h.wandert)return;
  var q=(HOF_HAUS[h.id]||2)+1;sw+=w;sf+=w*(h.felder[0]+h.felder[1])/2;sh+=w*q*q});
 var proHof=sw?sf/sw:4,haus=sw?sh/sw:9;return(n+Math.min(n,n/proHof)*haus)/(1-2/FLUR_RASTER)}
// Hofarten-Gewichte nach Ortsgröße (Vorschlag, Regel 11)
function hofGewichte(g){return g<=3?{cottage:6,farmstead:4}:g===4?{cottage:35,farmstead:50,'villa-rustica':15}:g===5?{cottage:20,farmstead:45,'villa-rustica':35}:{cottage:10,farmstead:35,'villa-rustica':55}}
function flurPlan(P,opt){var A=P.aussen&&P.aussen.flur;if(!A)return;var LM=LWm(),LD=landwDaten(opt);if(!LM||!LD)return;
 var F=P.mass||1,rr=function(v){return Math.floor(v*F+.5)},W=P.W,WW=W*W,I0=rr(A.ring),I1=rr(A.ring+A.innenW)-1,eA=rr(A.ring)-rr(A.ring-A.ab),seed=P.seed>>>0,B=BIOME[P.biom];
 var Z=P.zellen.split(''),HZ=P.hoehe||null,ra=rng(hashT([seed,P.art,P.einw,P.biom,'flur'].join('|'))),k,i,j;
 var ab=function(i,j){return Math.max(I0-i,I0-j,i-I1,j-I1)};
 var belegt=new Uint8Array(WW);P.bauten.forEach(function(b){for(var y=Math.max(0,b.j);y<Math.min(W,b.j+b.h);y++)for(var x=Math.max(0,b.i);x<Math.min(W,b.i+b.w);x++)belegt[y*W+x]=1});
 var frei=new Uint8Array(WW),weg=new Uint8Array(WW);
 for(j=0;j<W;j++)for(i=0;i<W;i++){k=j*W+i;var d=ab(i,j);if(d<eA||Z[k]!=='g'||belegt[k])continue;frei[k]=1;
  var dx=i<I0?I0-i:i>I1?i-I1:0,dy=j<I0?I0-j:j>I1?j-I1:0,a=dy>=dx?i:j;   // Feldwege: Ringe im Abstand FLUR_RASTER und Speichen quer dazu
  if((d-eA)%FLUR_RASTER===0||(((a-I0)%FLUR_RASTER)+FLUR_RASTER)%FLUR_RASTER===0)weg[k]=1}
 // Nur Feldwege, die über andere Feldwege eine Straße erreichen, bleiben Weg
 var STR={s:1,o:1,q:1},NB=[1,-1,W,-W],st=[],ok=new Uint8Array(WW),nachbar=function(k,d){var i=k%W;if(d===0&&i===W-1||d===1&&i===0)return -1;var n=k+NB[d];return n<0||n>=WW?-1:n};
 for(k=0;k<WW;k++)if(weg[k])for(var d0=0;d0<4;d0++){var n0=nachbar(k,d0);if(n0>=0&&STR[Z[n0]]){ok[k]=1;st.push(k);break}}
 while(st.length){var q=st.pop();for(var d1=0;d1<4;d1++){var n1=nachbar(q,d1);if(n1>=0&&weg[n1]&&!ok[n1]){ok[n1]=1;st.push(n1)}}}
 var nWeg=0;for(k=0;k<WW;k++)if(weg[k]){if(ok[k]){Z[k]='h';frei[k]=0;nWeg++}else weg[k]=0}
 // Blöcke zwischen den Feldwegen, innen zuerst
 var blk=new Int32Array(WW).fill(-1),BL=[];
 for(k=0;k<WW;k++){if(!frei[k]||blk[k]>=0)continue;var id=BL.length,L=[k],h0=0,mi=1e9;blk[k]=id;
  while(h0<L.length){var p=L[h0++],e0=ab(p%W,(p/W)|0);if(e0<mi)mi=e0;for(var d2=0;d2<4;d2++){var n2=nachbar(p,d2);if(n2>=0&&frei[n2]&&blk[n2]<0){blk[n2]=id;L.push(n2)}}}
  BL.push({id:id,L:L,e:mi})}
 BL.sort(function(a,b){return a.e-b.e||a.L[0]-b.L[0]});
 // Aufträge: Kultur und Zahl der Felder (Feld- und Viehgebäude der Übersicht zuerst, dann der Bedarf je Ware)
 var kv={};LD.K.forEach(function(x){if(x.k.geb&&!x.k.aussenposten&&!kv[x.k.geb]&&x.biome.indexOf(A.biomLW)>=0)kv[x.k.geb]=x.id});
 var JO={},jobs=[],job=function(kid,n,liste){if(!kid||n<=0)return;var J=JO[kid];if(!J){J=JO[kid]={k:kid,n:0,rest:0,gruppe:LD.kid[kid].k.gruppe,liste:{}};jobs.push(J)}J.n+=n;J.rest+=n;if(liste)J.liste[liste]=(J.liste[liste]|0)+1};
 A.liste.forEach(function(x){job(kv[x.id],x.w*x.h,x.id)});
 A.zeilen.forEach(function(z){if(z.kulturen.length)job(z.kulturen[Math.floor(ra()*z.kulturen.length)],z.felder)});
 var arten=jobs.map(function(J){return J.k}),nr={};arten.forEach(function(a,x){nr[a]=x});
 var HA=LM.hofarten(LD,A.biomLW).filter(function(h){return !h.wandert&&h.felder[1]>0}),GW=hofGewichte(P.g),gw={};
 HA.forEach(function(h){gw[h.id]=GW[h.id]||0});
 if(gw.plantation!=null)gw.plantation=Math.max(10,(GW['villa-rustica']||0)*.6);if(gw['oasis-garden']!=null)gw['oasis-garden']=Math.max(10,(GW.farmstead||0)*.6);
 var HBILD=hofBildAn(P,opt),HB0=null;
 var mark=new Int32Array(WW),dist=new Uint8Array(WW),stempel=0,FZ=new Array(WW).fill('.'),HB=[],hoefe=[],nFeld=0,rest=0,jp=0,bi=0;jobs.forEach(function(J){rest+=J.rest});
 var naechster=function(pass){for(var t=0;t<jobs.length;t++){var J=jobs[(jp+t)%jobs.length];if(J.rest>0&&(!pass||pass(J))){jp=(jp+t+1)%jobs.length;return J}}return null};
 var hofWahl=function(J){var C=HA.filter(function(h){return h.gruppen.indexOf(J.gruppe)>=0}),s=0;if(!C.length)return null;
  var w=C.map(function(h){var x=h.id==='herders-camp'?(WEIDE[J.gruppe]?(GW.farmstead||4)*.8:0):gw[h.id]||0;s+=x;return x});if(s<=0)return C[0];
  var u=ra()*s;for(var c=0;c<C.length;c++){u-=w[c];if(u<0)return C[c]}return C[C.length-1]};
 // Hausplatz im Block: s × s freie Felder, eins davon neben einem Feldweg; Tür zum Weg
 var platz=function(b,s){var pz=b.pz||(b.pz=[0,0,0,0]);for(var x0=pz[s];x0<b.L.length;x0++){var p=b.L[x0];if(!frei[p]){pz[s]=x0+1;continue}var pi=p%W,pj=(p/W)|0,dw=-1;
   for(var d3=0;d3<4;d3++){var n3=nachbar(p,d3);if(n3>=0&&Z[n3]==='h'){dw=d3;break}}if(dw<0)continue;
   for(var oy=0;oy<s;oy++)for(var ox=0;ox<s;ox++){var i0=pi-ox,j0=pj-oy,gut=i0>=0&&j0>=0&&i0+s<=W&&j0+s<=W;
    for(var yy=j0;yy<j0+s&&gut;yy++)for(var xx=i0;xx<i0+s&&gut;xx++){var kk=yy*W+xx;if(!frei[kk]||blk[kk]!==b.id||(HZ&&HZ.charCodeAt(kk)!==HZ.charCodeAt(p)))gut=false}
    for(yy=j0-1;yy<=j0+s&&gut;yy++)for(xx=i0-1;xx<=i0+s&&gut;xx++){if(xx<0||yy<0||xx>=W||yy>=W)continue;if(belegt[yy*W+xx])gut=false}   // berührt keinen Bau, auch nicht über Eck
    if(gut&&HB0&&HOF_BILD_VAR[HB0]&&(dw<2?oy:ox)!==hofTuerOff(['ost','west','sued','nord'][dw],s))gut=false;   // N6b4c3 Tür ans Türfeld des Hofbilds
    if(gut)return{i:i0,j:j0,tuer:[pi,pj,[1,-1,0,0][dw],[0,0,1,-1][dw]]}}}return null};
 while(rest>0&&bi<BL.length){var b=BL[bi],J0=naechster(null),H=hofWahl(J0);if(!H){J0.rest=0;rest=0;jobs.forEach(function(J){rest+=J.rest});continue}
  var s=HOF_HAUS[H.id]||2;HB0=HBILD?H.id:null;var pl=platz(b,s);if(!pl){bi++;continue}
  var nF=H.felder[0]+Math.floor(ra()*(H.felder[1]-H.felder[0]+1));nF=Math.max(1,Math.min(nF,rest));
  // Kulturen des Hofs: der Auftrag und bis zu 2 weitere, die zur Hofart passen
  var KU=[J0];for(var e1=0;e1<Math.min(2,nF-1);e1++){var Jx=naechster(function(J){return KU.indexOf(J)<0&&H.gruppen.indexOf(J.gruppe)>=0});if(Jx)KU.push(Jx)}
  for(var y5=pl.j;y5<pl.j+s;y5++)for(var x5=pl.i;x5<pl.i+s;x5++){frei[y5*W+x5]=0;belegt[y5*W+x5]=1}
  // Felder: Breitensuche vom Haus über freie Felder desselben Blocks, höchstens FLUR_WEIT Schritte
  stempel++;var Q=[],qh=0,fe=[];for(y5=pl.j;y5<pl.j+s;y5++)for(x5=pl.i;x5<pl.i+s;x5++){mark[y5*W+x5]=stempel;dist[y5*W+x5]=0;Q.push(y5*W+x5)}
  while(qh<Q.length&&fe.length<nF){var c0=Q[qh++],dc=dist[c0];if(dc>=FLUR_WEIT)continue;for(var d4=0;d4<4;d4++){var n4=nachbar(c0,d4);if(n4<0||mark[n4]===stempel||!frei[n4]||blk[n4]!==b.id)continue;
    mark[n4]=stempel;dist[n4]=dc+1;Q.push(n4);fe.push(n4);if(fe.length>=nF)break}}
  if(!fe.length){bi++;continue}   // Block voll: das Haus bleibt Wiese, nächster Block
  var anteil=[],sum0=0;KU.forEach(function(J,x){var a=Math.max(1,Math.min(J.rest,Math.round(fe.length/KU.length)));anteil.push(a);sum0+=a});
  var hof={art:H.id,i:pl.i,j:pl.j,kulturen:{},felder:0},f0=0;
  KU.forEach(function(J,x){var n=x===KU.length-1?fe.length-f0:Math.min(anteil[x],fe.length-f0);n=Math.min(n,J.rest);
   for(var m=0;m<n;m++){var kf=fe[f0++];frei[kf]=0;FZ[kf]=String.fromCharCode(48+nr[J.k]);var gk=LD.kid[J.k],hain=gk&&HAIN[gk.k.geb];
    Z[kf]=WEIDE[J.gruppe]?'p':hain?'g':'f';if(hain&&((kf%W+((kf/W)|0))&1)===0)P.dinge.push({id:hain,i:kf%W,j:(kf/W)|0,rolle:J.k})}
   if(n>0){hof.kulturen[J.k]=(hof.kulturen[J.k]|0)+n;hof.felder+=n;J.rest-=n;rest-=n}});
  for(;f0<fe.length;f0++){}   // nicht vergebene Plätze bleiben frei (Wiese)
  nFeld+=hof.felder;hoefe.push(hof);
  HB.push({rolle:'hof',id:'hof-'+H.id,hofart:H.id,i:pl.i,j:pl.j,w:s,h:s,g:1,klasse:P.basis.klasse,dach:s<2?'flach':P.basis.dach,achse:ra()<.5?'i':'j',
   wand:P.basis.wand||null,dachR:P.basis.dachR||null,tuer:pl.tuer,satz:null});if(HZ)HB[HB.length-1].hz=HZ.charCodeAt(pl.j*W+pl.i)-48;
  if(HBILD&&HOF_BILD_VAR[H.id])HB[HB.length-1].hv=hofVariante(H.id,pl.i,pl.j,seed);
  if(HBILD&&opt.presse!==false){var hp0=hofPresse(H.id,hof.kulturen);if(hp0)HB[HB.length-1].hp=hp0}   // N6b4c4 kleine Presse am Gutshof
  for(y5=pl.j;y5<pl.j+s;y5++)for(x5=pl.i;x5<pl.i+s;x5++){Z[y5*W+x5]='g';FZ[y5*W+x5]='.'}}
 P.bauten=HB.concat(P.bauten);   // Hofhäuser vorn: spätere Zusätze (vorspringende Türme) hängen weiter hinten an wie ohne Flur
 // Übersicht: Feld- und Viehgebäude der Liste gelten als gesetzt, sobald ihre Kultur Felder hat
 jobs.forEach(function(J){if(J.n>J.rest)for(var id in J.liste)P.gesetzt[id]=(P.gesetzt[id]|0)+J.liste[id]});
 // Wiese im Gürtel: Bäume des Bioms wie im Ring; nichts bleibt auf Feldern, Wegen oder Höfen stehen
 for(k=0;k<WW;k++){if(!frei[k])continue;i=k%W;j=(k/W)|0;if(rausch(i,j,seed+41)<B.dichte*.6+.04)P.dinge.push({id:B.baeume[Math.floor(rausch(i,j,seed+42)*B.baeume.length)],i:i,j:j})}
 var hofFeld=new Uint8Array(WW);hoefe.forEach(function(h){var s=HOF_HAUS[h.art];for(var y=h.j;y<h.j+s;y++)for(var x=h.i;x<h.i+s;x++)hofFeld[y*W+x]=1});
 P.dinge=P.dinge.filter(function(d){var kk=d.j*W+d.i;if(ab(d.i,d.j)<eA)return true;return !(Z[kk]==='h'||Z[kk]==='f'||Z[kk]==='p'||hofFeld[kk])||(d.rolle&&nr[d.rolle]!=null&&!hofFeld[kk])});
 if(HZ)P.dinge.forEach(function(d){if(d.hz==null)d.hz=HZ.charCodeAt(d.j*W+d.i)-48});
 P.aussen.flur={ab:A.ab,breite:A.breite,ring:A.ring,innenW:A.innenW};   // Arbeitsdaten aus aussen() nicht im Plan behalten
 P.zellen=Z.join('');
 P.flur={arten:arten,z:FZ.join(''),hoefe:hoefe,felder:nFeld,wege:nWeg,fehlt:rest,eA:eA,raster:FLUR_RASTER,weit:FLUR_WEIT,stufe:A.stufe,biom:A.biomLW,
  zeilen:A.zeilen.map(function(z){return{ware:z.ware,felder:z.felder}}),versuch:opt.flurV|0}}
// Kultur (Kennung aus landwirtschaft.json) und Tempo zu Fuß (×100, 0 = gesperrt) eines Bildfelds; null = kein Feld
function flurArt(P,i,j){var f=P&&P.flur;if(!f||i<0||j<0||i>=P.W||j>=P.W)return null;var c=f.z.charCodeAt(j*P.W+i)-48;return c>=0&&c<f.arten.length?f.arten[c]:null}
function flurTempo(P,i,j,profil,opt){var id=flurArt(P,i,j);if(!id)return null;var BG=BGm();if(!BG)return null;
 if(P.flur.zaun&&FELD_BILD[id]==='feld-pferch')return profil===BG.KARREN?0:PFERCH_FUSS;   // N6b4c3 eingezäunter Pferch: zu Fuß, hinein nur durchs Gatter (flurKante)
 return BG.feldart(landwDaten(opt),id,profil)}
// N6b4c3 Pferchzaun (Thomas 23.11.2026): jeder zusammenhängende Pferch (Kultur mit Bild feld-pferch) bekommt an jeder Außenkante ein Zaunstück
// 'pferch-zaun-<seite>[-a|-b]' (Ding auf dem Pferchfeld, Variante nach Lage, -b selten) und genau ein Gatter 'pferch-gatter-<seite>' an einer Kante zu einem
// begehbaren Feld (Feldweg zuerst, dann Straße, dann Wiese oder Feld). Seiten: 0 nord (j − 1), 1 west (i − 1), 2 sued (j + 1), 3 ost (i + 1).
// P.flur.zaun {k: Feldnummern (sortiert), m: gesperrte Kanten je k als Hexziffer, tore: [[i, j, s]], kanten, fehlt (Pferche ohne Gatter)};
// flurKante(P, i, j, s) sagt, ob man über die Kante darf. Zu Fuß im Pferch PFERCH_FUSS (Vorschlag, Regel 11). Nur mit Hofbildern (felder:true),
// Notausschalter opt.pferch:false. Kosten: einmal je Ort, linear in der Zahl der Pferchfelder.
var PFERCH_FUSS=70,ZAUN_SEITE=['nord','west','sued','ost'],ZAUN_D=[[0,-1],[-1,0],[0,1],[1,0]];
function pferchZaun(P,opt){if(!P.flur||!hofBildAn(P,opt)||(opt&&(opt.pferch===false||opt.feldbild===false)))return;
 var W=P.W,WW=W*W,Z=P.zellen,FZ=P.flur.z,HZ=P.hoehe,seed=P.seed>>>0,k,i,j,s;
 var pen=function(i,j){return i>=0&&j>=0&&i<W&&j<W&&FELD_BILD[flurArt(P,i,j)]==='feld-pferch'};
 var bau=new Uint8Array(WW);P.bauten.forEach(function(b){for(var y=Math.max(0,b.j);y<Math.min(W,b.j+b.h);y++)for(var x=Math.max(0,b.i);x<Math.min(W,b.i+b.w);x++)bau[y*W+x]=1});
 var rang=function(i,j,von){if(i<0||j<0||i>=W||j>=W)return 0;var q=j*W+i,c=Z.charAt(q);if(bau[q]||pen(i,j))return 0;if(HZ&&HZ.charAt(q)!==HZ.charAt(von))return 0;
  return c==='h'?4:c==='s'||c==='o'||c==='q'?3:c==='g'||c==='f'||c==='p'||c==='x'||c==='u'?2:0};
 var comp=new Int32Array(WW).fill(-1),M={},tore=[],kanten=0,fehlt=0,nc=0;
 for(k=0;k<WW;k++){i=k%W;j=(k/W)|0;if(comp[k]>=0||!pen(i,j))continue;var ch=FZ.charAt(k),L=[k],h=0;comp[k]=nc;
  while(h<L.length){var q=L[h++],qi=q%W,qj=(q/W)|0;for(s=0;s<4;s++){var ni=qi+ZAUN_D[s][0],nj=qj+ZAUN_D[s][1],nk=nj*W+ni;
    if(ni>=0&&nj>=0&&ni<W&&nj<W&&comp[nk]<0&&FZ.charAt(nk)===ch&&pen(ni,nj)){comp[nk]=nc;L.push(nk)}}}
  var best=null,bw=-1;
  L.forEach(function(q){var qi=q%W,qj=(q/W)|0;for(var s2=0;s2<4;s2++){var ni=qi+ZAUN_D[s2][0],nj=qj+ZAUN_D[s2][1];
    if(ni>=0&&nj>=0&&ni<W&&nj<W&&comp[nj*W+ni]===nc)continue;M[q]=(M[q]|0)|(1<<s2);kanten++;
    var r=rang(ni,nj,q);if(r){var w=r*10+rausch(qi*4+s2,qj,seed+243);if(w>bw){bw=w;best=[qi,qj,s2]}}}});
  if(best){M[best[1]*W+best[0]]&=~(1<<best[2]);tore.push(best)}else fehlt++;nc++}
 Object.keys(M).forEach(function(q){q=+q;var qi=q%W,qj=(q/W)|0,hz=HZ?HZ.charCodeAt(q)-48:0;
  for(var s3=0;s3<4;s3++){var tor=tore.some(function(t){return t[0]===qi&&t[1]===qj&&t[2]===s3});if(!(M[q]&(1<<s3))&&!tor)continue;
   var u=rausch(qi*4+s3,qj,seed+241),v=tor?'':u<1/12?'-b':u<.3?'-a':'';
   var d={id:'pferch-'+(tor?'gatter':'zaun')+'-'+ZAUN_SEITE[s3]+v,i:qi,j:qj,rolle:'pferch'};if(HZ)d.hz=hz;P.dinge.push(d)}});
 var KK=Object.keys(M).map(Number).sort(function(a,b){return a-b});
 P.flur.zaun={k:KK,m:KK.map(function(q){return M[q].toString(16)}).join(''),tore:tore,kanten:kanten,fehlt:fehlt}}
function zaunMaske(z,q){var lo=0,hi=z.k.length-1;while(lo<=hi){var m=(lo+hi)>>1;if(z.k[m]===q)return parseInt(z.m.charAt(m),16);if(z.k[m]<q)lo=m+1;else hi=m-1}return 0}
function flurKante(P,i,j,s){var z=P&&P.flur&&P.flur.zaun;if(!z)return true;var W=P.W,ni=i+ZAUN_D[s][0],nj=j+ZAUN_D[s][1];
 if(i>=0&&j>=0&&i<W&&j<W&&(zaunMaske(z,j*W+i)>>s)&1)return false;
 if(ni>=0&&nj>=0&&ni<W&&nj<W&&(zaunMaske(z,nj*W+ni)>>((s+2)&3))&1)return false;return true}

// N6b4b4 Postenpläne (Thomas 23.11.2026): eigener kleiner Plan je Außenposten und Gehöft aus N5c (aussenposten.js), am Postenpunkt, nicht im Ortsbild.
// Entscheidungen: feste Anlage je Art (Hütte 2 × 2, ab POSTEN_GROSS Leuten 3 × 2, Hof mit Lagerteilen, Plan POSTEN_W Bildfelder, +2 bei vielen Leuten),
// eigenes Gelände im Plan (Hang mit Höhenstufen wie der Burgberg für Mine und Steinbruch, Wasser für Fischer, Salz, Ried, Torf, Goldwäsche, Waldrand für
// Holzfäller, Köhler, Harzer, Jäger, Fallensteller), Weg im Plan als Feldweg (h) bis zum Rand auf der Seite zum eigenen Ort; draußen nur Richtung und Länge
// als Daten (P.posten.anschluss, echter Pfad im Gelände mit N7a). Mine: Tor in den Berg (Stollen, Einschnitt im Hang) mit Lager davor, Untertage gesperrt,
// das Tor ist das Ende des Wegs. Gehöfte: Hofhaus nach Hofart und Felder ihrer Kultur (landwirtschaft.js), P.flur wie im Flurgürtel (flurArt/flurTempo).
// Gebaut wird im Plan mit dem Gelände im Norden; dann gedreht (drehen()), bis es auf seiner Seite liegt, erst danach Weg und Begehbarkeit.
// Bilder: Hütten aus dem Baukasten, Lagerteile aus der Kartei (Platzhalter bis N6b4d). Kosten: ein Plan unter 1 ms (Node), einmal je sichtbarem Posten.
// Ergebnis wie plan() (at3-stadtplan, malen/kachelBauer/drehen gehen) plus P.posten {id, anlage, haus, ziel, weg, anschluss, begeh ('f' frei, 'p' nur zu Fuß, 'x' gesperrt je Bildfeld)}.
var POSTEN_ANLAGE={'iron-mine':'mine','copper-mine':'mine','tin-mine':'mine','silver-mine':'mine','sulphur-pit':'mine','gold-wash':'wasch',quarry:'bruch','marble-quarry':'bruch',
 woodcutter:'holz','resin-tapper':'holz',charcoal:'koehler',fisher:'fischer','sea-fishery':'fischer','reed-cutter':'ufer','peat-cut':'ufer','salt-pan':'salz',hunter:'jagd',trapper:'jagd'};
var POSTEN_HOF={'wheat-farm':1,'barley-farm':1,'oat-farm':1,'sheep-farm':1,'cattle-ranch':1,'pig-farm':1,'goat-pen':1,'olive-grove':1,vineyard:1,orchard:1};
var POSTEN_W={mine:16,bruch:16,holz:14,koehler:14,jagd:12,fischer:14,ufer:14,wasch:14,salz:16},POSTEN_GROSS=8,POSTEN_SEITEN=['north','east','south','west'];
var POSTEN_TIEF={mine:[5,3],bruch:[6,4],holz:[5,0],koehler:[5,0],jagd:[5,0],fischer:[4,0],ufer:[4,0],wasch:[3,0],salz:[5,0]};   // Tiefe des Geländes, höchste Stufe
var POSTEN_MEER={'sea-fishery':1,'salt-pan':1};
function postenSeite(dx,dy){return Math.abs(dx)>=Math.abs(dy)?(dx>=0?'east':'west'):(dy>=0?'south':'north')}
// N6b4d1 Bilder der Außenposten (Mittelmeer, Biome mit felder): gemeinsame Hütte 'posten-huette-<w>-<n>-<seite>' (2 × 2, ab 8 Leuten 3 × 2) mit Zubehör
// der Anlage als Teilbild (Schild 'zubehoer-<anlage>', fehlt es, bleibt die Hütte ohne), Stollentor 'posten-stollen-<n>-<seite>' (2 × 1), Lager der Mine
// auf denselben Feldern wie vorher (Wege und Begehbarkeit unverändert). Variante b.pv nach Lage (rausch), die zweite selten. Notausschalter opt.postenbild:false.
var POSTEN_SELTEN=.15,MINE_LAGER=['mine-erzhalde','mine-scheidebank','mine-erzhalde-a','mine-erzkoerbe','mine-grubenholz'],POSTEN_HOCH={posten:62,stollen:42};
// N6b4d2 Steinbruch, Holzfällerlager, Köhlerei (Mittelmeer): Lager auf denselben Feldern wie vorher (BRUCH_LAGER[2] liegt auf dem Feld des Platzes: flacher
// Splitt unter dem Hebebaum), Abbauwand 'bruch-wand-<n>-<seite>' als Bild auf der untersten Hangstufe der drei Spalten am Ziel (Hang, Weg und Begehbarkeit
// unverändert; Seite = Blickrichtung der Stirn nach dem Drehen), Stümpfe in drei Fassungen (Präfix natur-: zu Fuß wie vorher).
var BRUCH_LAGER=['bruch-rohblock','bruch-keilblock','bruch-splitt','bruch-quader','bruch-quader-a'],BRUCH_PLATZ='bruch-hebebaum',HOLZ_LAGER=['holz-stapel','holz-stapel-a','holz-hackklotz'],
 KOEHLER_LAGER=['koehler-meilerbau','koehler-meiler','koehler-loesche','koehler-kohle'],KOEHLER_PLATZ='koehler-saecke',BRUCH_SEITE=['sued','west','nord','ost'];
// N6b4d3 Wasser und Jagd (Mittelmeer): Lager auf denselben Feldern wie vorher (Fischer, Ufer je Art, Goldwäsche, Salz, Jagd je Art), Verdunstungsbecken
// 'salz-becken-<sole|kruste|ernte>' als Bild auf jedem Feld des Siedebeckens (Zelle bleibt Wasser, Weg und Begehbarkeit unverändert).
var FISCHER_LAGER=['fischer-netze','fischer-boot'],UFER_LAGER={'reed-cutter':['ufer-schilf','ufer-schilfbuendel'],'peat-cut':['ufer-torf','ufer-torfkarre']},WASCH_LAGER=['wasch-rinne','wasch-sand'],
 SALZ_LAGER=['salz-haufen','salz-koerbe','salz-pfanne'],SALZ_BECKEN=['salz-becken-sole','salz-becken-kruste','salz-becken-ernte'],JAGD_LAGER={hunter:['jagd-raeucher','jagd-fellrahmen'],trapper:['jagd-fallen','jagd-fellrahmen']};
function beckenBild(i,j,seed){var r=rausch(i,j,seed+237);return SALZ_BECKEN[r<.45?0:r<.85?1:2]}
function stumpfBild(i,j,seed){var r=rausch(i,j,seed+618);return r<.1?'natur-stumpf-kerbe':r<.55?'natur-stumpf-frisch':'natur-stumpf-alt'}
function postenBildAn(B,opt){return !!(B&&B.felder&&!(opt&&opt.postenbild===false))}
function postenGanz(b){if(!b.pv||!b.tuer||(b.rolle!=='posten'&&b.rolle!=='stollen'))return null;var r=HOF_RICHT[b.tuer[2]+','+b.tuer[3]];if(!r)return null;
 var lang=r==='sued'||r==='nord'?b.w:b.h,quer=r==='sued'||r==='nord'?b.h:b.w,ti=b.tuer[0]-b.i,tj=b.tuer[1]-b.j,o=lang===3?1:hofTuerOff(r,2);
 if(b.rolle==='stollen'?(lang!==2||quer!==1):(quer!==2||(lang!==2&&lang!==3)))return null;
 if(r==='sued'?(tj!==b.h-1||ti!==o):r==='nord'?(tj!==0||ti!==o):r==='ost'?(ti!==b.w-1||tj!==o):(ti!==0||tj!==o))return null;
 return b.rolle==='stollen'?{id:'posten-stollen-'+b.pv+'-'+r,spiegel:false,rel:null,hr:r}:{id:'posten-huette-'+lang+'-'+b.pv+'-'+r,spiegel:false,rel:null,hr:r,zub:b.pa,zw:lang}}
function postenPlan(opt){var id=opt.art,an=POSTEN_ANLAGE[id]||(POSTEN_HOF[id]?'hof':null);if(!an)throw new Error('Unbekannter Außenposten: '+id);
 var B=BIOME[opt.biom];if(!B)throw new Error('Unbekanntes Biom: '+opt.biom);var pb=postenBildAn(B,opt);var ST=opt.stil?STILE[opt.stil]:null;
 var seed=opt.seed>>>0,ra=rng(hashT([seed,id,opt.biom,'posten'].join('|'))),arb=opt.arb==null?4:Math.max(1,opt.arb|0),gross=arb>=POSTEN_GROSS;
 var basis={klasse:(ST||B).klasse,dach:(ST||B).dach,wand:(ST||B).wand,dachR:(ST||B).dachR};
 var oS=POSTEN_SEITEN.indexOf(opt.ortSeite);if(oS<0)oS=Math.floor(ra()*4);
 var nass=an==='fischer'||an==='ufer'||an==='wasch'||an==='salz',fS=nass&&POSTEN_SEITEN.indexOf(opt.wasser)>=0?POSTEN_SEITEN.indexOf(opt.wasser):(oS+[2,2,1,3][Math.floor(ra()*4)])%4;
 var P={format:'at3-stadtplan',art:'outpost',g:1,einw:arb,biom:opt.biom,stil:opt.stil||'',seed:seed,W:0,block:0,nb:0,zellen:'',bauten:[],dinge:[],tor:{i:0,j:0},gesetzt:{},
  vielfalt:null,gespiegelt:false,basis:basis,feld:B.feld,aussen:null,fluss:null,kueste:null};
 var haus=function(i,j,w,h,rolle,hid,dach){return{rolle:rolle,id:hid,i:i,j:j,w:w,h:h,g:1,klasse:basis.klasse,dach:dach||(Math.min(w,h)<2?'flach':basis.dach),achse:w>=h?'i':'j',
  wand:basis.wand||null,dachR:basis.dachR||null,tuer:[i+(w>>1),j+h-1,0,1],satz:null}};
 var ziel=null,W,Z,HZ=null,k,i,j,bk=null;
 if(an==='hof'){var hf=postenHof(P,opt,ra,oS);W=hf.W;Z=hf.Z;ziel=hf.ziel}
 else{W=POSTEN_W[an]+(gross?2:0);var WW=W*W,TF=POSTEN_TIEF[an],d=new Int32Array(W);Z=new Array(WW).fill('g');
  // Geländekante je Spalte: Grundtiefe ±1, Nachbarn höchstens 1 auseinander (ausgefranst, keine gerade Linie)
  for(i=0;i<W;i++){d[i]=TF[0]+Math.round((rausch(i>>1,0,seed+611)-.5)*2.4);if(i&&d[i]>d[i-1]+1)d[i]=d[i-1]+1;if(i&&d[i]<d[i-1]-1)d[i]=d[i-1]-1}
  var mitte=(W>>1)-1+Math.floor(ra()*2),hh=gross?[3,2]:[2,2],hs=ra()<.5?1:W-1-hh[0];
  if(TF[1]){HZ=new Array(WW).fill('0');for(i=0;i<W;i++)for(j=0;j<d[i];j++){HZ[j*W+i]=String(Math.min(TF[1],d[i]-j));if(an==='bruch')Z[j*W+i]='x'}}
  else if(nass){for(i=0;i<W;i++)for(j=0;j<d[i];j++)Z[j*W+i]='w';
   if(B.wasser||POSTEN_MEER[id]||an==='salz')for(i=0;i<W;i++)Z[d[i]*W+i]='u'}   // Strand an Küste und Sumpf, sonst Wiese bis ans Ufer
  else{var BA=B.baeume.filter(function(b){return /^baum-/.test(b)});if(!BA.length)BA=['baum-tanne','baum-birke'];   // Waldrand: dichter Wald hinten (Biome ohne Bäume: Nadelwald)
   for(i=0;i<W;i++)for(j=0;j<d[i]+1;j++)if(rausch(i,j,seed+613)<(j<d[i]?.72:.3))P.dinge.push({id:BA[Math.floor(rausch(i,j,seed+614)*BA.length)],i:i,j:j})}
  var fuss=function(i0){return d[Math.max(0,Math.min(W-1,i0))]};
  var lager=function(lid,i0,j0){if(i0<0||j0<0||i0>=W||j0>=W)return;P.dinge.push({id:lid,i:i0,j:j0,rolle:'lager'})};
  if(an==='mine'){d[mitte+1]=d[mitte]=Math.max(d[mitte],d[mitte+1]);for(j=0;j<d[mitte];j++){HZ[j*W+mitte]=HZ[j*W+mitte+1]=String(Math.min(TF[1],d[mitte]-j))}
   var st=haus(mitte,d[mitte]-1,2,1,'stollen','posten-stollen','flach');if(pb)st.pv=rausch(mitte,d[mitte],seed+233)<POSTEN_SELTEN?2:1;P.bauten.push(st);ziel={i:mitte,j:d[mitte],art:'tor'};   // Stollentor im Hang, Ende des Wegs
   var fy=d[mitte]+1,ML=pb?MINE_LAGER:['lager-platz','lager-platz','fels-block','fels-block','ware-bretter'];   // N6b4d1 Lager der Mine auf denselben Feldern
   lager(ML[0],mitte-2,fy);lager(ML[1],mitte+3,fy);lager(ML[2],mitte-3,fy+1);lager(ML[3],mitte-3,fy+2);lager(ML[4],mitte+3,fy+1)}
  else if(an==='bruch'){ziel={i:mitte,j:fuss(mitte),art:'wand'};for(i=0;i<W;i++)if(rausch(i,1,seed+615)<.7)Z[fuss(i)*W+i]='x';   // Schutt vor der Abbauwand
   for(var q=0;q<5;q++)lager(pb?BRUCH_LAGER[q]:'fels-block',mitte-3+((q*3)%7),fuss(mitte)+2+(q&1));lager(pb?BRUCH_PLATZ:'lager-platz',mitte+3,fuss(mitte)+2);
   if(pb){var wv=rausch(mitte,1,seed+235)<.5?1:0;for(var wk=-1;wk<=1;wk++){var wi=mitte+wk;if(wi<0||wi>=W||fuss(wi)<1)continue;   // N6b4d2 Abbauwand
    P.dinge.push({id:'bruch-wand-'+(!wk&&rausch(mitte,2,seed+235)<POSTEN_SELTEN?3:1+((wk+2+wv)&1)),i:wi,j:fuss(wi)-1})}}}
  else if(an==='holz'||an==='koehler'){for(i=0;i<W;i++)for(j=fuss(i)+1;j<fuss(i)+4&&j<W;j++)if(rausch(i,j,seed+616)<.35)P.dinge.push({id:pb?stumpfBild(i,j,seed):'natur-stumpf',i:i,j:j});
   ziel={i:mitte,j:fuss(mitte)+1,art:'waldrand'};
   if(an==='holz'){lager(pb?HOLZ_LAGER[0]:'ware-stamm',mitte-2,fuss(mitte)+4);lager(pb?HOLZ_LAGER[1]:'ware-stamm',mitte-1,fuss(mitte)+4);lager(pb?HOLZ_LAGER[2]:'ware-bretter',mitte+2,fuss(mitte)+4)}
   else{for(var mq=0;mq<4;mq++)lager(pb?(mq===1&&rausch(mitte,3,seed+235)<POSTEN_SELTEN?'koehler-meiler-a':KOEHLER_LAGER[mq]):'ware-stamm',mitte+(mq&1),fuss(mitte)+4+(mq>>1));
    lager(pb?KOEHLER_PLATZ:'lager-platz',mitte+3,fuss(mitte)+4)}}   // ohne Bilder: Meiler als Holzstoß
  else if(an==='jagd'){ziel={i:mitte,j:fuss(mitte)+1,art:'waldrand'};var JL=pb?JAGD_LAGER[id]:['ware-fleisch','ware-bretter'];lager(JL[0],mitte+2,fuss(mitte)+3);lager(JL[1],mitte+3,fuss(mitte)+3)}
  else if(an==='fischer'){for(j=Math.max(0,fuss(mitte)-3);j<fuss(mitte);j++)Z[j*W+mitte]='y';ziel={i:mitte,j:fuss(mitte),art:'steg'};   // Steg ins Wasser, Planken mit hochstege()
   lager(pb?FISCHER_LAGER[0]:'lager-platz',mitte-2,fuss(mitte)+1);lager(pb?(rausch(mitte,5,seed+235)<POSTEN_SELTEN?'fischer-boot-a':FISCHER_LAGER[1]):'ware-fleisch',mitte+2,fuss(mitte)+1)}
  else if(an==='salz'){var s0=fuss(mitte)+2;for(var pj=0;pj<2;pj++)for(var pi=2;pi+1<W-2;pi+=3)for(j=s0+pj*3;j<s0+pj*3+2;j++)for(i=pi;i<pi+2;i++){Z[j*W+i]='w';if(pb)(bk=bk||[]).push({id:beckenBild(i,j,seed),i:i,j:j,rolle:'becken'})}   // Siedebecken 2 × 2
   ziel={i:mitte,j:s0+2,art:'becken'};lager(pb?SALZ_LAGER[Math.floor(rausch(mitte,4,seed+236)*3)]:'lager-platz',hs<W/2?W-3:2,s0+6)}
  else{ziel={i:mitte,j:fuss(mitte),art:'ufer'};var UL=pb?(an==='wasch'?WASCH_LAGER:UFER_LAGER[id]):['lager-platz','ware-bretter'];lager(UL[0],mitte-2,fuss(mitte)+1);lager(UL[1],mitte+2,fuss(mitte)+1);
   if(id==='peat-cut')for(i=1;i<W-1;i++)for(j=fuss(i)+1;j<fuss(i)+3;j++)if(rausch(i,j,seed+617)<.5)Z[j*W+i]='e'}   // Torfstiche
  // Hütte (Vorarbeiter und Leute) seitlich im Hof, Tür zum Hof; Wiese des Bioms ringsum mit lichten Bäumen
  var hy=Math.min(W-hh[1]-1,an==='salz'?fuss(mitte)+8:Math.max(fuss(hs),fuss(hs+hh[0]-1))+(an==='mine'||an==='bruch'?3:2));
  var hu=haus(hs,hy,hh[0],hh[1],'posten','posten-'+an);if(pb){hu.pv=rausch(hs,hy,seed+234)<POSTEN_SELTEN?2:1;hu.pa=an}P.bauten.push(hu);
  for(k=0;k<WW;k++){i=k%W;j=(k/W)|0;if(Z[k]!=='g'||j<=fuss(i)+(TF[1]?0:1)||(HZ&&HZ[k]!=='0'))continue;
   if(Math.abs(i-mitte)<5&&j<fuss(mitte)+7)continue;if(i>=hs-1&&i<=hs+hh[0]&&j>=hy-1&&j<=hy+hh[1]+1)continue;
   if(rausch(i,j,seed+41)<B.dichte*.5+.03)P.dinge.push({id:B.baeume[Math.floor(rausch(i,j,seed+42)*B.baeume.length)],i:i,j:j})}}
 P.W=W;P.zellen=Z.join('');if(HZ){P.hoehe=HZ.join('');P.huegel={stufen:POSTEN_TIEF[an][1],gipfel:[],kern:[],felder:0}}
 dauerDinge(P,opt);pferchZaun(P,opt);   // N6b4c2 Hainbäume, Reben, Ranken am Gehöft; N6b4c3 Pferchzaun
 // Gebaute Dinge und Bauten liegen nie auf Wasser, Steg oder Becken
 P.dinge=P.dinge.filter(function(o){var c=P.zellen.charAt(o.j*W+o.i);return c!=='w'&&c!=='y'});if(bk)P.dinge=P.dinge.concat(bk);   // N6b4d3 Becken liegen auf dem Wasser
 // Drehen, bis das Gelände (gebaut im Norden) auf seiner Seite liegt: ein drehen() bringt Norden nach Osten
 var dz=an==='hof'?0:fS;P.posten={id:id,anlage:an,ziel:ziel};
 for(var r=0;r<dz;r++){var zl=P.posten.ziel;P=drehen(P);if(zl)P.posten.ziel={i:W-1-zl.j,j:zl.i,art:zl.art}}
 if(pb&&an==='bruch')P.dinge.forEach(function(d){if(/^bruch-wand-\d$/.test(d.id))d.id+='-'+BRUCH_SEITE[dz]});   // N6b4d2 Stirn zum Hof
 if(an==='fischer'){P.kueste={seite:POSTEN_SEITEN[fS]};hochstege(P);P.kueste=null}
 postenWeg(P,oS,opt);
 if(P.hoehe)huegelFertig(P);
 return P}
// Gehöft (N5c Hof-Art): Hofhaus nach Hofart mitten im Plan, Tür und gerader Weg zum Rand auf der Ortsseite, Felder der Kultur per Breitensuche (höchstens FLUR_WEIT Schritte)
function postenHof(P,opt,ra,oS){var id=opt.art,LM=LWm(),LD=landwDaten(opt),bl=LW_BIOM[opt.biom]||opt.biom,ku=null,ha=null,B=BIOME[opt.biom];
 if(LM&&LD){LD.K.forEach(function(x){if(x.k.geb===id&&(!ku||x.biome.indexOf(bl)>=0&&ku.biome.indexOf(bl)<0))ku=x});
  if(ku){var HA=LM.hofarten(LD,bl).filter(function(h){return !h.wandert&&h.felder[1]>0&&HOF_HAUS[h.id]&&h.gruppen.indexOf(ku.k.gruppe)>=0});
   ha=HA.filter(function(h){return h.id==='farmstead'})[0]||HA[0]||null}}
 var hid=ha?ha.id:'farmstead',s=HOF_HAUS[hid]||2,fe=ha?ha.felder:[3,6],nF=fe[0]+Math.floor(ra()*(fe[1]-fe[0]+1));
 var W=Math.max(12,Math.ceil(Math.sqrt(nF*2.2+(s+4)*(s+4)))+4);if(W%2)W++;var WW=W*W,Z=new Array(WW).fill('g'),FZ=new Array(WW).fill('.'),c0=(W-s)>>1,k,i,j;
 var DS=[[0,-1],[1,0],[0,1],[-1,0]],dv=DS[oS],ti=c0+(s>>1),tj=c0+(s>>1);   // Tür an der Hausseite zum Ort
 if(dv[0])ti=dv[0]>0?c0+s-1:c0;if(dv[1])tj=dv[1]>0?c0+s-1:c0;
 var HBI=hofBildAn(P,opt)&&HOF_BILD_VAR[hid];if(HBI){var rr=HOF_RICHT[dv[0]+','+dv[1]],of=hofTuerOff(rr,s);if(dv[0])tj=c0+of;else ti=c0+of}   // N6b4c3 Türfeld des Hofbilds
 var bau={rolle:'hof',id:'hof-'+hid,hofart:hid,i:c0,j:c0,w:s,h:s,g:1,klasse:P.basis.klasse,dach:s<2?'flach':P.basis.dach,achse:ra()<.5?'i':'j',wand:P.basis.wand||null,dachR:P.basis.dachR||null,
  tuer:[ti,tj,dv[0],dv[1]],satz:null};if(HBI)bau.hv=hofVariante(hid,c0,c0,P.seed>>>0);if(HBI&&ku&&opt.presse!==false){var kq={};kq[ku.k.id]=1;var hp1=hofPresse(hid,kq);if(hp1)bau.hp=hp1}P.bauten.push(bau);
 var frei=new Uint8Array(WW).fill(1);for(j=c0-1;j<=c0+s;j++)for(i=c0-1;i<=c0+s;i++)frei[j*W+i]=0;   // Hofplatz rings ums Haus bleibt Wiese
 for(var x=ti+dv[0],y=tj+dv[1];x>=0&&y>=0&&x<W&&y<W;x+=dv[0],y+=dv[1])frei[y*W+x]=0;   // Weg zum Ort freihalten (postenWeg legt ihn)
 var gk=ku?ku.k.gruppe:'grain',hain=ku&&HAIN[ku.k.geb],Q=[],qh=0,dist=new Uint8Array(WW),mark=new Uint8Array(WW),felder=[];
 for(j=c0-1;j<=c0+s;j++)for(i=c0-1;i<=c0+s;i++){mark[j*W+i]=1;Q.push(j*W+i)}
 while(qh<Q.length&&felder.length<nF){var p=Q[qh++];if(dist[p]>=FLUR_WEIT)continue;for(var q=0;q<4;q++){var xi=p%W+DS[q][0],yj=((p/W)|0)+DS[q][1],n=yj*W+xi;
   if(xi<1||yj<1||xi>=W-1||yj>=W-1||mark[n])continue;mark[n]=1;dist[n]=dist[p]+1;Q.push(n);if(frei[n]&&felder.length<nF)felder.push(n)}}
 felder.forEach(function(n){FZ[n]='0';Z[n]=WEIDE[gk]?'p':hain?'g':'f';if(hain&&((n%W+((n/W)|0))&1)===0)P.dinge.push({id:hain,i:n%W,j:(n/W)|0,rolle:id})});
 for(k=0;k<WW;k++){i=k%W;j=(k/W)|0;if(!frei[k]||FZ[k]!=='.')continue;if(rausch(i,j,P.seed+41)<B.dichte*.5+.03)P.dinge.push({id:B.baeume[Math.floor(rausch(i,j,P.seed+42)*B.baeume.length)],i:i,j:j})}
 P.flur={arten:ku?[ku.id]:[],z:FZ.join(''),hoefe:[{art:hid,i:c0,j:c0,kulturen:ku?(function(o){o[ku.id]=felder.length;return o})({}):{},felder:felder.length}],felder:felder.length,wege:0,fehlt:Math.max(0,nF-felder.length),
  eA:0,raster:FLUR_RASTER,weit:FLUR_WEIT,stufe:null,biom:bl,zeilen:[],versuch:0};
 if(!ku)P.flur.z=new Array(WW).fill('.').join('');
 return{W:W,Z:Z,ziel:null}}
// Weg im Plan (Feldweg h) vom Rand auf der Ortsseite zur Hüttentür und zum Ziel der Anlage (Tor, Abbauwand, Steg …): Breitensuche vom ganzen Rand über ebene,
// freie Felder; Bäume und Stümpfe auf dem Weg fallen weg. Danach Begehbarkeit je Bildfeld und Anschluss nach draußen (Richtung, Länge in Feldern).
function postenWeg(P,oS,opt){var W=P.W,WW=W*W,Z=P.zellen.split(''),HZ=P.hoehe,i,j,k,DS=[[1,0],[-1,0],[0,1],[0,-1]];
 var bau=new Uint8Array(WW),sperr=new Uint8Array(WW);P.bauten.forEach(function(b){for(var y=b.j;y<b.j+b.h;y++)for(var x=b.i;x<b.i+b.w;x++)if(x>=0&&y>=0&&x<W&&y<W)bau[y*W+x]=1});
 P.dinge.forEach(function(d){if(d.rolle==='lager'||d.rolle==='steg')sperr[d.j*W+d.i]=d.rolle==='lager'?1:0});
 var geh=function(k){return !bau[k]&&!sperr[k]&&/[gxuhe]/.test(Z[k])&&(!HZ||HZ.charAt(k)==='0')};
 var randS=function(s,k){var i=k%W,j=(k/W)|0;return s===0?j===0:s===1?i===W-1:s===2?j===W-1:i===0};
 var abO=function(k){var i=k%W,j=(k/W)|0;return oS===0?j:oS===1?W-1-i:oS===2?W-1-j:i};   // Abstand zum Rand der Ortsseite
 var vor=new Int32Array(WW).fill(-2),Q=[],qh=0;for(k=0;k<WW;k++)if(randS(oS,k)&&geh(k)){vor[k]=-1;Q.push(k)}
 // Mitte des Rands zuerst: gleich lange Wege enden möglichst mittig
 Q.sort(function(a,b){var m=(W-1)/2,fa=oS&1?Math.abs(((a/W)|0)-m):Math.abs(a%W-m),fb=oS&1?Math.abs(((b/W)|0)-m):Math.abs(b%W-m);return fa-fb||a-b});
 // Liegt auf der Ortsseite nur Wasser (Küste aus der Welt), geht der Weg seitlich hinaus, so nah an der Ortsseite wie möglich
 if(!Q.length){for(k=0;k<WW;k++)if((randS((oS+1)%4,k)||randS((oS+3)%4,k))&&geh(k)){vor[k]=-1;Q.push(k)}Q.sort(function(a,b){return abO(a)-abO(b)||a-b})}
 while(qh<Q.length){var p=Q[qh++];for(var q=0;q<4;q++){var x=p%W+DS[q][0],y=((p/W)|0)+DS[q][1],n=y*W+x;if(x<0||y<0||x>=W||y>=W||vor[n]!==-2||!geh(n))continue;vor[n]=p;Q.push(n)}}
 var Zi=[],hut=P.bauten.filter(function(b){return b.rolle==='posten'||b.rolle==='hof'})[0];
 if(hut&&hut.tuer)Zi.push([hut.tuer[0]+hut.tuer[2],hut.tuer[1]+hut.tuer[3]]);var zl=P.posten.ziel;
 if(zl){var best=-1;for(var dy=-1;dy<=1&&best<0;dy++)for(var dx=-1;dx<=1;dx++){var z2=(zl.j+dy)*W+zl.i+dx;if(zl.i+dx>=0&&zl.j+dy>=0&&zl.i+dx<W&&zl.j+dy<W&&vor[z2]!==-2){best=z2;break}}
  if(vor[zl.j*W+zl.i]!==-2)best=zl.j*W+zl.i;if(best>=0)Zi.push([best%W,(best/W)|0])}
 var wege=0,endR=null,fehlt=0,auf=new Uint8Array(WW);
 Zi.forEach(function(z){var c=z[1]*W+z[0];if(z[0]<0||z[1]<0||z[0]>=W||z[1]>=W||vor[c]===-2){fehlt++;return}
  while(c>=0){if(!auf[c]){auf[c]=1;wege++}if(vor[c]===-1&&!endR)endR={i:c%W,j:(c/W)|0};c=vor[c]}});
 for(k=0;k<WW;k++)if(auf[k])Z[k]='h';P.zellen=Z.join('');
 P.dinge=P.dinge.filter(function(d){return !auf[d.j*W+d.i]||d.rolle==='lager'});
 if(!endR){var m=W>>1;endR=oS===0?{i:m,j:0}:oS===1?{i:W-1,j:m}:oS===2?{i:m,j:W-1}:{i:0,j:m}}
 P.tor={i:endR.i,j:endR.j};
 // Begehbarkeit: x gesperrt (Wasser, Hang, Haus, Stollen und Untertage, Lager), p nur zu Fuß (Wald, Felder nach landwirtschaft.json), f frei; Steg frei
 var baum={},BG=[];P.dinge.forEach(function(d){if(!d.rolle&&/^(baum|busch|natur)-/.test(d.id))baum[d.j*W+d.i]=1});
 for(k=0;k<WW;k++){var c=Z[k],b='f';i=k%W;j=(k/W)|0;
  if(bau[k]||sperr[k]||c==='w'||(HZ&&HZ.charAt(k)!=='0'))b='x';else if(c==='y')b='f';else if(P.flur){var ft=flurTempo(P,i,j,'mensch',opt);b=ft==null?(baum[k]?'p':'f'):ft>0?'p':'x';if(c==='h')b='f'}else if(baum[k])b='p';
  BG.push(b)}
 var hb=hut?{i:hut.i,j:hut.j,w:hut.w,h:hut.h,tuer:hut.tuer}:null;
 P.posten.haus=hb;P.posten.weg={felder:wege,rand:endR,fehlt:fehlt};P.posten.begeh=BG.join('');
 P.posten.anschluss={seite:POSTEN_SEITEN[oS],ziel:'ort',laenge:opt.weg!=null?Math.round(opt.weg):null}}
function postenBegeh(P,i,j){return P&&P.posten&&i>=0&&j>=0&&i<P.W&&j<P.W?P.posten.begeh.charAt(j*P.W+i):null}
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
 N.dinge=P.dinge.map(function(d){var o=JSON.parse(JSON.stringify(d));o.i=W-1-d.j;o.j=d.i;if(/^ehrensaeule-/.test(o.id))o.id=/-i$/.test(o.id)?o.id.slice(0,-2):o.id+'-i';return o});N.tor={i:W-1-P.tor.j,j:P.tor.i};   // N6b3b4: Ehrensäulen drehen ihre Achse mit
 if(P.forum){var R=function(r){return[W-r[1]-r[3],r[0],r[3],r[2]]},F=P.forum,G=N.forum,g0=R([F.i,F.j,F.w,F.h]);G.i=g0[0];G.j=g0[1];G.w=g0[2];G.h=g0[3];   // N6b3c1 Forum dreht mit
  G.offen=[-F.offen[1],F.offen[0]];G.laeden=F.laeden.map(R);G.gang=F.gang.map(R);G.rostra=R(F.rostra);G.statue=R(F.statue)}
 if(P.flur){var fz=new Array(W*W);for(j=0;j<W;j++)for(i=0;i<W;i++)fz[i*W+(W-1-j)]=P.flur.z.charAt(j*W+i);N.flur.z=fz.join('');   // N6b4b2 Flur dreht mit
  N.flur.hoefe=P.flur.hoefe.map(function(h){var o=JSON.parse(JSON.stringify(h)),q=HOF_HAUS[h.art]||1;o.i=W-h.j-q;o.j=h.i;return o})
  if(P.flur.zaun){var Z0=P.flur.zaun,RS=[3,0,1,2],RK=[];Z0.k.forEach(function(q,x){var m=parseInt(Z0.m.charAt(x),16),n=0;for(var s=0;s<4;s++)if(m&(1<<s))n|=1<<RS[s];
    RK.push([(q%W)*W+(W-1-((q/W)|0)),n])});RK.sort(function(a,b){return a[0]-b[0]});   // N6b4c3 Pferchzaun dreht mit
   N.flur.zaun.k=RK.map(function(x){return x[0]});N.flur.zaun.m=RK.map(function(x){return x[1].toString(16)}).join('');N.flur.zaun.tore=Z0.tore.map(function(t){return[W-1-t[1],t[0],RS[t[2]]]})}
  N.dinge.forEach(function(d){var pz=/^pferch-(zaun|gatter)-(nord|west|sued|ost)(.*)$/.exec(d.id);if(pz)d.id='pferch-'+pz[1]+'-'+ZAUN_SEITE[[3,0,1,2][ZAUN_SEITE.indexOf(pz[2])]]+pz[3]});
  N.dinge.forEach(function(d){if(/^rebstock/.test(d.id)){var r=d.id.replace(/^rebstock(-j)?/,'');d.id='rebstock'+(feldAchse(N,d.i,d.j)==='j'?'-j':'')+r}})}   // N6b4c2: Reben folgen der Bodenrichtung
 if(P.wehr)N.wehr=wehrDrehen(P.wehr,W);return N}
// Wehr (N6b2d) mitdrehen: Zeichenketten wie die Zellen, Richtungen (di, dj) → (−dj, di): s → w, o → s, n → o, w → n
var DREH={s:'w',o:'s',n:'o',w:'n','.':'.',N:'E',E:'S',S:'W',W:'N'};   // N6b2e2a: Halbfeld-Ecken drehen mit
// N6b2e2b1: 2:1-Form drehen: Ecke wie die Halbfelder (N → E → S → W), flach ↔ steil, Teil bleibt
function zwDreh(f){var b=f.charCodeAt(0)-97;return String.fromCharCode(97+(((b>>2)+1)&3)*4+(((b>>1)&1)^1)*2+(b&1))}
function wehrDrehen(w,W){var r=JSON.parse(JSON.stringify(w)),L=[];
 w.k.forEach(function(k,p){var i=k%W,j=(k/W)|0,b=parseInt(w.f.charAt(p*4+3),16),n=0;var a0=w.f.charAt(p*4);if(a0==='d'||a0==='q')n=b;else WRK.forEach(function(d){if(b&ZBIT[d])n|=ZBIT[DREH[d]]});
  L.push([i*W+(W-1-j),a0+w.f.charAt(p*4+1)+(a0==='q'?zwDreh(w.f.charAt(p*4+2)):DREH[w.f.charAt(p*4+2)])+n.toString(16)])});
 L.sort(function(a,b){return a[0]-b[0]});r.k=L.map(function(x){return x[0]});r.f=L.map(function(x){return x[1]}).join('');
 var p=function(a){return[W-1-a[1],a[0]]},p4=function(f){return p([f[0],f[1]]).concat(p([f[2],f[3]]))};   // N6b2e2t: Türen drehen mit
 r.tuerme=w.tuerme.map(function(t){var o=[W-t[1]-3,t[0],t[2]];if(t[3])o.push({tuer:t[3].tuer?p4(t[3].tuer):null,gang:t[3].gang.map(p4)});return o});
 if(w.torhaus)r.torhaus=w.torhaus.map(function(h){return{t:h.t.slice(),i:W-h.j-3,j:h.i}});
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
// N6b4b3 Weiche Bodenübergänge (Saum-Technik aus 2.0, welt-gross-test-raster.js T3; Thomas 23.11.2026: alle Naturböden, Gras > Feld > Erde/Weg > Sand > Fels).
// Grenzt ein Naturbodenfeld an einen Boden mit höherem Rang (gleiche Höhe), malt es an dieser Kante einen ausgefransten Saum aus dem Nachbarboden darüber.
// Ein Saumbild je Bodenbild, Kante und Variante (SAUM_VAR), einmal gemalt und am Kartei-Objekt gemerkt; liegt ganz im eigenen Feld (Rahmen der Kacheln bleibt).
// Kante 0: Nachbar i+1, 1: i−1, 2: j+1, 3: j−1. Pflaster, Marmor, Wasser und Stege haben keinen Rang und bleiben scharf. opt.saum:false = wie vorher.
// N6b4c1 Feldböden je Kultur (nur Biome mit felder:true, bisher Mittelmeer): Kultur aus P.flur → Grundbild, Reihenkulturen mit Richtung (<id> Reihen längs i,
// <id>-j längs j; die längere gleichartige Strecke durch das Feld gewinnt), Variante nach Lage (ruhig häufig, auffällig selten). Notausschalter opt.feldbild:false.
var FELD_BILD={'wheat-farm':'feld-weizen','barley-farm':'feld-gerste','market-garden':'feld-garten','dye-garden':'feld-faerber',saffron:'feld-safran','physic-garden':'feld-kraeuter',
 lavender:'feld-lavendel','flower-garden':'feld-blumen',apiary:'feld-blumen','opium-poppy':'feld-mohn','mandrake-bed':'feld-alraune','sheep-farm':'feld-weide',
 'chicken-coop':'feld-pferch','goat-pen':'feld-pferch',stable:'feld-pferch',dormouse:'feld-pferch'},
 FELD_REIHE={'feld-weizen':1,'feld-gerste':1,'feld-garten':1,'feld-huelsen':1,'feld-lavendel':1,'feld-faerber':1,'feld-safran':1,'feld-mohn':1,'feld-blumen':1},
 FELD_VAR={'feld-weizen':{selten:[['d',1/70],['c',1/30],['b',1/20]],ruhig:[['',3],['a',2]]},'feld-gerste':{selten:[],ruhig:[['',3],['a',1]]},
 'feld-garten':{selten:[['b',1/25]],ruhig:[['',3],['a',2]]},'feld-huelsen':{selten:[],ruhig:[['',1],['a',1]]},'feld-lavendel':{selten:[],ruhig:[['',1]]},
 'feld-faerber':{selten:[['a',1/12]],ruhig:[['',1]]},'feld-safran':{selten:[],ruhig:[['',1]]},'feld-mohn':{selten:[['a',1/20]],ruhig:[['',1]]},'feld-blumen':{selten:[],ruhig:[['',1]]},
 'feld-kraeuter':{selten:[['a',1/10]],ruhig:[['',1]]},'feld-alraune':{selten:[['a',1/12]],ruhig:[['',1]]},'feld-weide':{selten:[['d',1/80],['c',1/30],['b',1/12]],ruhig:[['',3],['a',2]]},
 'feld-pferch':{selten:[['a',1/6]],ruhig:[['',1]]}},
 FELD_IDS=(function(){var L=[];Object.keys(FELD_VAR).forEach(function(b){(FELD_REIHE[b]?['','-j']:['']).forEach(function(o){var V=FELD_VAR[b];
  V.selten.concat(V.ruhig).forEach(function(v){L.push(b+o+(v[0]?'-'+v[0]:''))})})});return L})();
// N6b4c2 Dauerkulturen (Thomas 23.11.2026): Boden unter Hain, Weinberg und Bacchantenhain (P.dauer, gesetzt von dauerDinge) und stehende Bilder:
// Hainbäume in Reihen (jedes 2. Feld in jeder 2. Reihe, Lücken mit Stumpf), Rebstock-Reihen an Pfählen längs der Feldachse (jede 2. Reihe), wilde Ranken.
var DAUER_BILD={vineyard:'feld-rebe','olive-grove':'feld-hain',orchard:'feld-hain','bacchant-grove':'feld-bacchant'},
 DAUER_VAR={'feld-hain':{selten:[['b',1/30]],ruhig:[['',3],['a',1]]},'feld-rebe':{selten:[],ruhig:[['',3],['a',1]]},'feld-bacchant':{selten:[],ruhig:[['',4],['a',1]]}},
 DAUER_STUMPF=.08,
 DAUER_IDS=['feld-hain','feld-hain-a','feld-hain-b','feld-rebe','feld-rebe-a','feld-rebe-j','feld-rebe-j-a','feld-bacchant','feld-bacchant-a'],
 DAUER_DINGE=['hain-olive','hain-olive-a','hain-olive-b','hain-feige','hain-feige-a','hain-mandel','hain-mandel-a','hain-stumpf','rebstock','rebstock-a','rebstock-b',
  'rebstock-j','rebstock-j-a','rebstock-j-b','bacchant-ranke','bacchant-ranke-a','bacchant-ranke-b'];
Object.keys(DAUER_VAR).forEach(function(b){FELD_VAR[b]=DAUER_VAR[b]});FELD_REIHE['feld-rebe']=1;
function dauerDing(P,k,i,j){var u=rausch(i,j,P.seed+231),v=rausch(i,j,P.seed+233);
 if(k==='olive-grove'||k==='orchard'){   // je angefangenem 2 × 2-Block ein Baum, im vollen Hain auf dem Feld mit geraden i und j (Reihen)
  var bi=i&~1,bj=j&~1,q,x,y;for(q=0;q<4;q++){x=bi+(q&1);y=bj+(q>>1);if(flurArt(P,x,y)===k)break}if(x!==i||y!==j)return null;if(u<DAUER_STUMPF)return 'hain-stumpf';
  if(k==='olive-grove')return v<.06?'hain-olive-b':v<.35?'hain-olive-a':'hain-olive';
  var b=rausch(i>>2,j>>2,P.seed+235)<.5?'hain-feige':'hain-mandel';return v<.3?b+'-a':b}
 if(k==='vineyard'){var ax=feldAchse(P,i,j);   // Rebreihe auf jeder 2. Linie; liegt ein schmaler Weingarten nur auf einer ungeraden Linie, steht die Reihe dort
  if((ax==='i'?j:i)&1){var di=ax==='i'?0:1,dj=1-di;if(flurArt(P,i-di,j-dj)===k||flurArt(P,i+di,j+dj)===k)return null}return 'rebstock'+(ax==='j'?'-j':'')+(v<.05?'-b':v<.35?'-a':'')}
 if(k==='bacchant-grove'){if(u>.55)return null;return 'bacchant-ranke'+(v<.06?'-b':v<.25?'-a':'')}
 return null}
function dauerDinge(P,opt){var B=BIOME[P.biom];if(!P.flur||!B||!B.felder||(opt&&(opt.dauer===false||opt.feldbild===false)))return;P.dauer=1;
 var W=P.W,alt={};for(var h in HAIN)alt[HAIN[h]]=1;
 P.dinge=P.dinge.filter(function(d){return !(alt[d.id]&&d.rolle&&DAUER_BILD[flurArt(P,d.i,d.j)])});   // alte Bäume im Schachbrett (vor N6b4c2)
 var HZ=P.hoehe;for(var j=0;j<W;j++)for(var i=0;i<W;i++){var k=flurArt(P,i,j);if(!k||!DAUER_BILD[k])continue;var id=dauerDing(P,k,i,j);if(!id)continue;
  var d={id:id,i:i,j:j,rolle:k};if(HZ)d.hz=HZ.charCodeAt(j*W+i)-48;P.dinge.push(d)}}
function feldAchse(P,i,j){var W=P.W,z=P.flur.z,c=z.charAt(j*W+i),ri=0,rj=0,k;
 for(k=1;k<=5&&i+k<W&&z.charAt(j*W+i+k)===c;k++)ri++;for(k=1;k<=5&&i-k>=0&&z.charAt(j*W+i-k)===c;k++)ri++;
 for(k=1;k<=5&&j+k<W&&z.charAt((j+k)*W+i)===c;k++)rj++;for(k=1;k<=5&&j-k>=0&&z.charAt((j-k)*W+i)===c;k++)rj++;
 return ri>rj?'i':rj>ri?'j':rausch(c.charCodeAt(0),ri,P.seed+213)<.5?'i':'j'}
function feldBild(P,i,j){var id=flurArt(P,i,j),b=id&&(FELD_BILD[id]||(P.dauer&&DAUER_BILD[id]));if(!b)return null;
 if(b==='feld-garten'&&rausch(i>>1,j>>1,P.seed+211)<.4)b='feld-huelsen';   // Hülsenfrüchte als Beete im Gemüsegarten (Thomas 23.11.2026)
 var V=FELD_VAR[b],u=rausch(i,j,P.seed+217),s=0,k,o=FELD_REIHE[b]&&feldAchse(P,i,j)==='j'?b+'-j':b;
 for(k=0;k<V.selten.length;k++){s+=V.selten[k][1];if(u<s)return o+'-'+V.selten[k][0]}
 u=(u-s)/(1-s);var g=0;V.ruhig.forEach(function(r){g+=r[1]});u*=g;for(k=0;k<V.ruhig.length;k++){u-=V.ruhig[k][1];if(u<0)break}
 var r=V.ruhig[Math.min(k,V.ruhig.length-1)][0];return r?o+'-'+r:o}
var SAUM_SCHMAL=.45,SAUM_WEG=/[hs]/,SAUM_RANG={'boden-gras':12,'bk-feld':8,'boden-erde':4,'boden-weg':3,'boden-sand':2,'boden-fels':0},SAUM_VAR=4,SAUM_NB=[[1,0],[-1,0],[0,1],[0,-1]];
FELD_IDS.forEach(function(id){SAUM_RANG[id]=/^feld-weide/.test(id)?11:/^feld-pferch/.test(id)?5:8});
DAUER_IDS.forEach(function(id){SAUM_RANG[id]=/^feld-bacchant/.test(id)?6:8});   // N6b4c2   // N6b4c1: Weide fast wie Gras, Pferch wie Erde
var SAUM_MERK=typeof WeakMap!=='undefined'?new WeakMap():null;
function saumRausch(x,y,s){var xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),a=rausch(xi,yi,s),b=rausch(xi+1,yi,s),c=rausch(xi,yi+1,s),d=rausch(xi+1,yi+1,s);
 return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
// Maske je Bildgröße, Kante, Variante und Breite (1 = Saum deckt), einmal berechnet; das Saumbild stanzt nur noch das Nachbarbild aus (Bruchteil einer ms)
var SAUM_MASKE={};
function saumMaske(bw,bh,kante,v,schmal){var key=bw+'x'+bh+':'+kante+':'+v+':'+(schmal?1:0),M=SAUM_MASKE[key];if(M)return M;M=new Uint8Array(bw*bh);
 var cx=(bw-1)/2,hw=bw/2,hh=bh/2,sk=schmal?SAUM_SCHMAL:1,y,x;   // Wege (Feldweg, Straße) bekommen einen schmalen Saum, sonst fräße das Gras einen 1 Feld breiten Weg von beiden Seiten auf
 for(y=0;y<bh;y++)for(x=0;x<bw;x++){var a=(x-cx)/hw,bb=(y-hh)/hh,ux=(a+bb+1)/2,uy=(bb-a+1)/2,e=kante===0?1-ux:kante===1?ux:kante===2?1-uy:uy,
   w=(.26+(saumRausch((kante&1?uy:ux)*5+(kante>>1?7:0),v*3.1,77+kante)-.5)*.22)*sk;
   if(!(e>w+.12*sk||(e>w-.06*sk&&rausch(x>>1,y,7919+kante*7+v)>(w+.12*sk-e)/(.18*sk))))M[y*bw+x]=1}
 return SAUM_MASKE[key]=M}
function saumObj(o,kante,v,schmal){var b=o&&o.bild;if(!b)return null;var m=SAUM_MERK&&SAUM_MERK.get(o);if(!m){m={};if(SAUM_MERK)SAUM_MERK.set(o,m)}var key=(kante*SAUM_VAR+v)*2+(schmal?1:0);if(m[key])return m[key];
 var M=saumMaske(b.w,b.h,kante,v,schmal),q=malbild(o),r={id:o.id+'~saum'+kante+v+(schmal?'s':''),kat:o.kat},y,x;
 if(MERK&&q){var px=new Uint8Array(q.px.length);for(x=0;x<px.length;x++)px[x]=M[x]?q.px[x]:LEER;MERK.set(r,{w:q.w,h:q.h,ax:q.ax,ay:q.ay,px:px});r.bild={w:b.w,h:b.h,ax:b.ax,ay:b.ay}}   // gleich als Palettenbild gemerkt (malbild liest es)
 else{var z=[];for(y=0;y<b.h;y++){var zl=b.z[y],t='';for(x=0;x<b.w;x++)t+=M[y*b.w+x]?zl.charAt(x):'.';z.push(t)}r.bild={w:b.w,h:b.h,ax:b.ax,ay:b.ay,z:z}}
 return m[key]=r}
var BODEN_ID={s:null,o:null,m:'bk-marmor-boden',f:null,w:'boden-fluss',e:'boden-erde',p:'boden-gras',x:'boden-fels',h:'boden-erde'};   // h Feldweg (N6b4b2)
// Offenes Wasser (Thomas 22.11.2026): boden-fluss statt der Wasserstelle, nahtlos; Fassungen nach Lage: ruhig 0/a/b (5:5:4), selten Fass (c) und tote Ratte (d) je 1 von 128
var FLUSS_VAR=['boden-fluss','boden-fluss-a','boden-fluss-b','boden-fluss-c','boden-fluss-d'];
function flussWahl(i,j,seed){var u=rausch(i,j,seed+77);if(u<1/128)return FLUSS_VAR[3];if(u<2/128)return FLUSS_VAR[4];u=(u-2/128)/(1-2/128)*14;return FLUSS_VAR[u<5?0:u<10?1:2]}
var KURZ={'clay-wood':'lehm',brick:'ziegel',marble:'marmor'};
// N6b3a Pflaster nach Rang (Thomas 22.11.2026, nur Biome mit pflaster:true, ab Marktflecken, nur innerhalb der Mauer): Hauptstraße (Feld liegt in einem 3 × 3
// aus Gassenfeldern; Hauptstraße 2 Planfelder = 3 Bildfelder) Basalt, mittlere Spur mit Karrenrillen längs der Straße; übrige Gassen Kopfstein; Markt (o)
// Steinplatten; Forum (m) Marmorplatten. Einmal je Ort gerechnet (pflasterKarte), Wahl der Varianten nach Lage wie flussWahl. P.pflaster === false: wie vorher.
var PFL_IDS=['pflaster-basalt','pflaster-basalt-a','pflaster-basalt-b','pflaster-basalt-c','pflaster-basalt-d','pflaster-basalt-e','pflaster-basalt-f','pflaster-basalt-g',
 'pflaster-gasse','pflaster-gasse-a','pflaster-gasse-b','pflaster-gasse-c','pflaster-gasse-d','pflaster-gasse-e','pflaster-gasse-f',
 'pflaster-platz','pflaster-platz-a','pflaster-platz-b','pflaster-platz-c','pflaster-platz-d','pflaster-marmor','pflaster-marmor-a','pflaster-marmor-b','pflaster-marmor-c','pflaster-marmor-d'];
// Varianten je Art: [selten …] mit Anteil, Rest ruhig reihum nach Gewicht
var PFL_VAR={basalt:{selten:[['e',1/100],['d',1/40],['c',1/14]],ruhig:[['',5],['f',4],['g',3]]},gasse:{selten:[['d',1/90],['b',1/30],['c',1/25],['a',1/12]],ruhig:[['',5],['e',4],['f',3]]},
 platz:{selten:[['b',1/40],['a',1/20],['c',1/12]],ruhig:[['',3],['d',2]]},marmor:{selten:[['b',1/50],['a',1/25],['c',1/14]],ruhig:[['',3],['d',2]]}};
function pflasterWahl(art,i,j,seed){var V=PFL_VAR[art],u=rausch(i,j,seed+131),k,s=0,id='pflaster-'+art;
 for(k=0;k<V.selten.length;k++){s+=V.selten[k][1];if(u<s)return id+'-'+V.selten[k][0]}
 u=(u-s)/(1-s);var g=0;V.ruhig.forEach(function(r){g+=r[1]});u*=g;for(k=0;k<V.ruhig.length;k++){u-=V.ruhig[k][1];if(u<0)break}var r=V.ruhig[Math.min(k,V.ruhig.length-1)][0];return r?id+'-'+r:id}
// Codes je Feld: 0 kein Pflaster, 1 Basalt, 2 Basalt mit Rillen längs i, 3 längs j, 4 Kopfstein, 5 Platten, 6 Marmor
function pflasterKarte(P){var B=BIOME[P.biom];if(!B||!B.pflaster||P.pflaster===false||(P.g|0)<MAUER_AB)return null;
 var W=P.W,Z=P.zellen,MK=innenMaske(P),S=new Uint8Array(W*W),V=new Uint8Array(W*W),R=new Uint8Array(W*W),i,j,k,a,b;
 for(k=0;k<W*W;k++)S[k]=Z.charCodeAt(k)===115?1:0;   // 's'
 for(j=0;j+2<W;j++)for(i=0;i+2<W;i++){var voll=1;for(b=0;b<3&&voll;b++)for(a=0;a<3;a++)if(!S[(j+b)*W+i+a]){voll=0;break}
  if(voll)for(b=0;b<3;b++)for(a=0;a<3;a++)V[(j+b)*W+i+a]=1}
 var s=function(x,y){return x>=0&&y>=0&&x<W&&y<W&&S[y*W+x]};
 for(j=0;j<W;j++)for(i=0;i<W;i++){k=j*W+i;if(!MK[k])continue;var c=Z.charAt(k);
  if(c==='s'){if(!V[k]){R[k]=4;continue}R[k]=1;
   if(s(i,j-1)&&s(i,j+1)&&!s(i,j-2)&&!s(i,j+2)&&s(i-1,j)&&s(i+1,j))R[k]=2;else if(s(i-1,j)&&s(i+1,j)&&!s(i-2,j)&&!s(i+2,j)&&s(i,j-1)&&s(i,j+1))R[k]=3}
  else if(c==='o')R[k]=5;else if(c==='m')R[k]=6}
 return R}
// Zeichenreihenfolge für Grundflächen ohne Überlappung (Thomas 21.11.2026: Sortieren nach der Mitte i + j ließ bei langen Häusern Wände über das Dach des
// Nachbarn malen). A kommt vor B, wenn A ganz bei kleinerem i (bzw. j) liegt und sich die Bildrahmen beider überlagern; sonst Mitte i + j (Kahn-Sortierung).
// Paare nur aus gemeinsamen Bildfächern (128 × 128) mit mindestens einer großen Grundfläche; in Schritten (Regel 20), Kosten nach Zahl der Elemente.
// N6b3b1 Ganzbild + Wechselschilder: o.schilder = [{teil:'giebel'|'banner', x, y}] (Lage im ungespiegelten Bild, Anker des Schildteils). Schildteil
// 'tempel-<teil>-<klein|gross>-<Religion>', fehlt es, der Platzhalter '-ohne'. Gespiegelt: Bild und Schilder an der senkrechten Achse durch den Anker. Fehlt das
// Ganzbild selbst, null (Baukasten). Zusammengesetztes Bild gemerkt je Ganzbild, Spiegelung und Religion (wenige Stück je Ort).
// N6b3b2 (Thomas 23.11.2026, „Spiegeln + Licht neu“): gibt es zum Ganzbild eine eigene Fassung für die Längsachse i ('<id>-i', Licht von oben links), nimmt die
// Längsachse i diese und ihre Schilder '<…>-i' statt zu spiegeln. Religion in der Kennung nur mit ihrem ersten Wort (Kennungen höchstens 40 Zeichen).
var GANZ=typeof Map!=='undefined'?new Map():null;
function relKurz(rel){return rel?String(rel).split('-')[0]:null}
function spiegelSp(sp){var w=sp.w,px=new Uint8Array(sp.px.length),y,x;for(y=0;y<sp.h;y++)for(x=0;x<w;x++)px[y*w+x]=sp.px[y*w+w-1-x];return{w:w,h:sp.h,ax:w-1-sp.ax,ay:sp.ay,px:px}}
// N6b4c3 Hofbild: nur wenn die Tür genau auf dem Türfeld der Zeichnung liegt
// N6b5a (Thomas 24.11.2026): Elendsbuden 1 × 1 als Ganzbild elend-bude-<n>-<seite> (tools/at3-elend.py) in Biomen mit felder (Mittelmeer),
// vor dem Stinktor wie in der Elendssiedlung. Tür auf dem Türfeld, Blick nach draußen (b.tuer); so passt das Bild auch nach drehen(). Größere Buden
// (nach dem Maßstab 2 × 1, 2 × 2 …) werden ein Budenhaufen: je Feld eine Bude, alle zur Türseite, Variante je Feld nach Lage (budeBild).
// Variante b.bv nach Lage (rausch, verbraucht keinen Zufall des Plans): 1–6 gleich oft, 7 und 8 selten. Kein Bild: Baukasten wie vorher. Notausschalter opt.budenbild:false.
var BUDE_VAR=[.155,.155,.155,.155,.155,.155,.035,.035],BUDE_HOCH=52;
function budeVariante(i,j,seed){var u=rausch(i,j,seed+277),k;for(k=0;k<BUDE_VAR.length-1;k++){u-=BUDE_VAR[k];if(u<0)return k+1}return BUDE_VAR.length}
function budenBild(P,opt){var B=BIOME[P.biom];if(!B||!B.felder||(opt&&opt.budenbild===false))return;var s=P.seed>>>0;P.schlamm=true;
 P.bauten.forEach(function(b){if(b.rolle==='shack'&&b.tuer&&b.w<=3&&b.h<=3){b.bv=budeVariante(b.i,b.j,s);if(opt&&opt.drogenbude===false)return;
  var u=rausch(b.i,b.j,s+911);if(u<DROGE_ANTEIL)b.dv=u<DROGE_ANTEIL/2?'opium':'hasch'}})}   // N6b5b2 Drogenbude nur auf dem Türfeld (Haufen: übrige Felder normale Buden)
// N6b5b2 (Thomas 24.11.2026): Opiumküche und Haschischpresse (tools/at3-drogenbude.py) selten statt einer Bude, etwa 1 von 30, nur Bild (keine Ware,
// keine Bewohner, Wirtschaft erst N15e1). Eigene Wahl nach Lage (rausch), b.bv bleibt; Notausschalter opt.drogenbude:false.
var DROGE_ANTEIL=1/30;
// N6b5a Rückmeldung Thomas („Boden wirkt zu monoton“): Schlammböden (tools/at3-schlamm.py) für alle e-Felder, wenn P.schlamm (Budenbild an), Wahl nach Lage
var SCHLAMM=[['boden-schlamm-matsch',.34],['boden-schlamm-stroh',.14],['boden-schlamm-scherben',.12],['boden-schlamm-pfuetze',.1],['boden-schlamm-spur',.09],
 ['boden-schlamm-bretter',.08],['boden-schlamm-oel',.06],['boden-schlamm-rinne',.07]];
function schlammWahl(i,j,seed){var u=rausch(i,j,seed+733),k;for(k=0;k<SCHLAMM.length-1;k++){u-=SCHLAMM[k][1];if(u<0)return SCHLAMM[k][0]}return SCHLAMM[k][0]}
SCHLAMM.forEach(function(s){SAUM_RANG[s[0]]=SAUM_RANG['boden-erde']});
// Felder unter Buden mit Bild: beim Malen Erde statt Gras (man sieht sie zwischen den Buden); die Zellen des Plans bleiben unverändert
function budeFelder(P){var W=P.W,F=null;P.bauten.forEach(function(b){if(!b.bv||b.rolle!=='shack')return;if(!F)F=new Uint8Array(W*W);
  for(var y=Math.max(0,b.j);y<Math.min(W,b.j+b.h);y++)for(var x=Math.max(0,b.i);x<Math.min(W,b.i+b.w);x++)F[y*W+x]=1});return F}   // Erde statt Gras unter der Bude (sieht man zwischen den Buden)
function budeGanz(b){if(b.rolle!=='shack'||!b.bv||!b.tuer)return null;var r=HOF_RICHT[b.tuer[2]+','+b.tuer[3]],t=b.tuer,innen=function(i,j){return i>=b.i&&j>=b.j&&i<b.i+b.w&&j<b.j+b.h};
 if(!r||!innen(t[0],t[1])||innen(t[0]+t[2],t[1]+t[3]))return null;return{id:(b.dv?'elend-'+b.dv:'elend-bude-'+b.bv)+'-'+r,hr:r}}
// N6b5a Rückmeldung Thomas (24.11.2026, „extrem überfüllt“): nur vor dem Stinktor ummauerter Orte und in der Elendssiedlung (Weiler und Dörfer halten
// 1 Feld Abstand), im Plan vor Mauer und Toren. Freie Schlammfelder (e) im Elendsviertel bekommen Anbauten (Bude 1 × 1, rolle shack, anbau:1,
// ohne eigene Bewohner der Stadtliste). Nur höchstens 3 Felder von einer echten Bude, kein anderes Gebäude im Umkreis 1, keine Mauer im Umkreis 2 (Wehrgang-
// Stücke). Jeder Anbau hat seine Tür auf ein freies Schlammfeld; er wird nur gesetzt, wenn alle freien Wegfelder daneben im Umkreis 6 noch untereinander
// verbunden bleiben (so bleibt jedes Wegfeld vom Tor aus erreichbar). Etwa 4 von 5 möglichen Feldern, Reihenfolge nach Lage (rausch). Unter dem Anbau
// Wiese wie bei den echten Buden (gemalt wird Schlamm, budeFelder). Notausschalter opt.budenEng:false (auch die Dichte), opt.anbauten:false (nur die Anbauten).
var WEG_Z={s:1,o:1,m:1,e:1,h:1};
// Bleiben die freien Wegfelder nb um (x, y) ohne (x, y) im Umkreis 6 untereinander verbunden? wegK(q) = Feld q ist freier Weg. Für Anbauten und hohe Dinge (N6b5b1).
function wegLokal(W,wegK){var stamp=new Int32Array(W*W),gen=0,stk=new Int32Array(4*13*13+8);
 return function(x,y,nb){if(nb.length<2)return true;var R=6,sp=0,k0=y*W+x;gen++;var s0=nb[0][1]*W+nb[0][0];stamp[s0]=gen;stk[sp++]=s0;
  while(sp){var q=stk[--sp],qx=q%W,qy=(q-qx)/W;
   if(qx>0&&qx-1>=x-R&&q-1!==k0&&stamp[q-1]!==gen&&wegK(q-1)){stamp[q-1]=gen;stk[sp++]=q-1}
   if(qx<W-1&&qx+1<=x+R&&q+1!==k0&&stamp[q+1]!==gen&&wegK(q+1)){stamp[q+1]=gen;stk[sp++]=q+1}
   if(qy>0&&qy-1>=y-R&&q-W!==k0&&stamp[q-W]!==gen&&wegK(q-W)){stamp[q-W]=gen;stk[sp++]=q-W}
   if(qy<W-1&&qy+1<=y+R&&q+W!==k0&&stamp[q+W]!==gen&&wegK(q+W)){stamp[q+W]=gen;stk[sp++]=q+W}}
  for(var m=1;m<nb.length;m++)if(stamp[nb[m][1]*W+nb[m][0]]!==gen)return false;return true}}
function anbauten(P,s){var W=P.W,Z=P.zellen,N=W*W,HZ=P.hoehe||null,occ=new Uint8Array(N),tr=new Uint8Array(N),sperr=new Uint8Array(N),nah=new Uint8Array(N),NB=[[0,1],[1,0],[0,-1],[-1,0]],k;
 var mark=function(A,b,R){for(var y=Math.max(0,b.j-R);y<Math.min(W,b.j+b.h+R);y++)for(var x=Math.max(0,b.i-R);x<Math.min(W,b.i+b.w+R);x++)A[y*W+x]=1};
 P.bauten.forEach(function(b){mark(occ,b,0);if(b.rolle==='shack'){if(!b.anbau)mark(nah,b,3)}else mark(sperr,b,b.rolle==='mauer'?2:1);
  if(b.tuer){var tx=b.tuer[0]+b.tuer[2],ty=b.tuer[1]+b.tuer[3];if(tx>=0&&ty>=0&&tx<W&&ty<W)tr[ty*W+tx]=1}});
 var ding=new Uint8Array(N);P.dinge.forEach(function(d){if(d.i>=0&&d.j>=0&&d.i<W&&d.j<W)ding[d.j*W+d.i]=1});   // auf Dinge wird nicht gebaut, gehen darf man darüber
 var lv=function(q){return HZ?HZ.charCodeAt(q)-48:0},weg=function(x,y){return x>=0&&y>=0&&x<W&&y<W&&WEG_Z[Z.charAt(y*W+x)]&&!occ[y*W+x]};
 // erreichbar vom Tor über freie Wegfelder (nur solche Felder kommen in Frage)
 var err=new Uint8Array(N),st=[];if(P.tor&&weg(P.tor.i,P.tor.j)){err[P.tor.j*W+P.tor.i]=1;st.push(P.tor.j*W+P.tor.i)}
 if(!st.length)for(k=0;k<N;k++){var ex=k%W,ey=(k/W)|0;if((ex===0||ey===0||ex===W-1||ey===W-1)&&weg(ex,ey)){err[k]=1;st.push(k)}}   // Elendssiedlung: vom Rand
 while(st.length){var q=st.pop(),qx=q%W,qy=(q/W)|0;for(var d0=0;d0<4;d0++){var nx=qx+NB[d0][0],ny=qy+NB[d0][1];if(weg(nx,ny)&&!err[ny*W+nx]){err[ny*W+nx]=1;st.push(ny*W+nx)}}}
 // bleiben die freien Wegfelder um (x, y) ohne (x, y) im Umkreis 6 verbunden?
 var lokal=wegLokal(W,function(q){return WEG_Z[Z.charAt(q)]===1&&!occ[q]});
 var L=[];for(k=0;k<N;k++)if(nah[k]&&!(P._gasse&&P._gasse[k])&&!sperr[k]&&err[k]&&Z.charAt(k)==='e'&&!occ[k]&&!ding[k]&&!tr[k]&&rausch(k%W,(k/W)|0,s+611)<.8)L.push(k);
 L.sort(function(a,b){return rausch(a%W,(a/W)|0,s+612)-rausch(b%W,(b/W)|0,s+612)});
 var neu=0,gb=[];L.forEach(function(k){var x=k%W,y=(k/W)|0;if(occ[k]||tr[k])return;var nb=[],tuer=null,d;
  for(d=0;d<4;d++){var tx=x+NB[d][0],ty=y+NB[d][1];if(weg(tx,ty)){nb.push([tx,ty]);if(tuer===null&&err[ty*W+tx]&&Z.charAt(ty*W+tx)==='e'&&lv(ty*W+tx)===lv(k))tuer=d}}
  if(tuer===null||!lokal(x,y,nb))return;occ[k]=1;var t=NB[tuer];tr[(y+t[1])*W+x+t[0]]=1;
  var o={rolle:'shack',id:'shack',anbau:1,i:x,j:y,w:1,h:1,g:1,klasse:'clay-wood',dach:'flach',achse:'i',wand:null,dachR:HOLZ,tuer:[x,y,t[0],t[1]],satz:null};if(HZ)o.hz=lv(k);
  P.bauten.push(o);gb.push(k);neu++});
 if(gb.length){var Zs=Z.split('');gb.forEach(function(k){Zs[k]='g'});P.zellen=Zs.join('')}
 P.anbauten=neu}
// N6b5b1 (Thomas 24.11.2026): Dinge im Elendsviertel (tools/at3-elendding.py) auf freien Schlammfeldern (e) höchstens 3 Felder von einer Bude, vor dem
// Stinktor ummauerter Orte und in der Elendssiedlung. Nie vor einer Tür. Flaches (Kot, Erbrochenes, Knochen, Lumpenlager) überall, auch mitten auf der Gasse;
// Hohes (Müll, Knochenhaufen, Wäscheleine, Kochstelle, Wasserstelle, Schrein, Karren, Schuldenpfahl) nur, wo die Wegfelder
// daneben im Umkreis 6 verbunden bleiben (wie die Anbauten), nicht neben anderen Gebäuden und nicht an der Mauer. Etwa 4 von 10 Feldern, Art nach Lage (rausch),
// je Art eine seltene Variante. Wasserstelle und Schrein gedeckelt (1 je 15 bzw. 40 Buden, mindestens 1). Alte Lagerplätze im Viertel weichen.
// Hinterhöfe (freie Wiese direkt an einer Bude, kein Weg) bekommen nur Hohes. Dinge ohne Rolle (lose, wie Lagerplätze), hoch:1 für Hohes. Notausschalter opt.elendDinge:false.
var ELEND_FLACH=[['kot',26],['erbrochen',10],['knochen',14],['lumpen',5]],ELEND_HOCH=[['muell',18],['knochenhaufen',6],['waesche',8],['kochstelle',5],['wasser',4],['schrein',2],['karren',2],['schuldpfahl',2]],
 ELEND_SELTEN={muell:[3,.1],kot:[2,.12],erbrochen:[2,.15],knochenhaufen:[2,.15],knochen:[3,.1],waesche:[2,.12],kochstelle:[2,.15],wasser:[2,.15],schrein:[2,.2]},ELEND_DICHTE=.4;
function elendId(art,u){var S=ELEND_SELTEN[art];if(!S)return 'elend-'+art;if(u<S[1])return 'elend-'+art+'-'+S[0];
 var n=S[0]-1;return 'elend-'+art+'-'+(1+Math.min(n-1,Math.floor((u-S[1])/(1-S[1])*n)))}
function elendDinge(P,s){var W=P.W,Z=P.zellen,N=W*W,HZ=P.hoehe||null,occ=new Uint8Array(N),tr=new Uint8Array(N),sperr=new Uint8Array(N),nah=new Uint8Array(N),NB=[[0,1],[1,0],[0,-1],[-1,0]],k,nB=0;
 var mark=function(A,b,R){for(var y=Math.max(0,b.j-R);y<Math.min(W,b.j+b.h+R);y++)for(var x=Math.max(0,b.i-R);x<Math.min(W,b.i+b.w+R);x++)A[y*W+x]=1};
 P.bauten.forEach(function(b){mark(occ,b,0);if(b.rolle==='shack'){mark(nah,b,3);if(!b.anbau)nB++}else mark(sperr,b,b.rolle==='mauer'?2:1);
  if(b.tuer){var tx=b.tuer[0]+b.tuer[2],ty=b.tuer[1]+b.tuer[3];if(tx>=0&&ty>=0&&tx<W&&ty<W)tr[ty*W+tx]=1}});
 if(!nB)return;
 var istE=function(q){return Z.charAt(q)==='e'&&nah[q]};
 P.dinge=P.dinge.filter(function(d){return d.rolle||!/^lager-platz/.test(d.id)||!(d.i>=0&&d.j>=0&&d.i<W&&d.j<W&&istE(d.j*W+d.i))});   // alte Lagerplätze im Viertel weichen
 var ding=new Uint8Array(N);P.dinge.forEach(function(d){if(d.i>=0&&d.j>=0&&d.i<W&&d.j<W)ding[d.j*W+d.i]=1});
 var lv=function(q){return HZ?HZ.charCodeAt(q)-48:0},weg=function(x,y){return x>=0&&y>=0&&x<W&&y<W&&WEG_Z[Z.charAt(y*W+x)]&&!occ[y*W+x]};
 // nur im Rechteck um die Buden rechnen (Kosten nach Größe des Viertels, nicht des Orts)
 var bx0=W,by0=W,bx1=-1,by1=-1;P.bauten.forEach(function(b){if(b.rolle!=='shack')return;bx0=Math.min(bx0,b.i-3);by0=Math.min(by0,b.j-3);bx1=Math.max(bx1,b.i+b.w+2);by1=Math.max(by1,b.j+b.h+2)});
 bx0=Math.max(0,bx0);by0=Math.max(0,by0);bx1=Math.min(W-1,bx1);by1=Math.min(W-1,by1);
 var lokal=wegLokal(W,function(q){return WEG_Z[Z.charAt(q)]===1&&!occ[q]});
 var deckel={wasser:Math.max(1,Math.floor(nB/15)),schrein:Math.max(1,Math.floor(nB/40))},zahl={},SF=0,SH=0;var vorher=0;P.dinge.forEach(function(d){var m=/^elend-(wasser|schrein)/.exec(d.id);if(m){zahl[m[1]]=(zahl[m[1]]|0)+1;vorher++}});   // N6b5b3 Platzmitte zählt mit
 ELEND_FLACH.forEach(function(a){SF+=a[1]});ELEND_HOCH.forEach(function(a){SH+=a[1]});
 var wahl=function(L,u){for(var m=0;m<L.length-1;m++){u-=L[m][1];if(u<0)return L[m][0]}return L[m][0]};
 var L=[],yy,xx;for(yy=by0;yy<=by1;yy++)for(xx=bx0;xx<=bx1;xx++){k=yy*W+xx;if(istE(k)&&!occ[k]&&!ding[k]&&!tr[k]&&rausch(xx,yy,s+621)<ELEND_DICHTE)L.push(k)}
 L.sort(function(a,b){return rausch(a%W,(a/W)|0,s+622)-rausch(b%W,(b/W)|0,s+622)});
 var neu=0,hoch=0;L.forEach(function(k){var x=k%W,y=(k/W)|0,u=rausch(x,y,s+623),art=null,h=false;
  if(u<SH/(SF+SH)&&!sperr[k]&&!(P._gasse&&P._gasse[k])){var a=wahl(ELEND_HOCH,rausch(x,y,s+624)*SH);
   if(deckel[a]==null||(zahl[a]|0)<deckel[a]){var nb=[];for(var d=0;d<4;d++){var tx=x+NB[d][0],ty=y+NB[d][1];if(weg(tx,ty))nb.push([tx,ty])}
    if(nb.length&&lokal(x,y,nb)){art=a;h=true}}}
  if(!art)art=wahl(ELEND_FLACH,rausch(x,y,s+625)*SF);
  zahl[art]=(zahl[art]|0)+1;if(h){occ[k]=1;hoch++}
  var o={id:elendId(art,rausch(x,y,s+626)),i:x,j:y};if(h)o.hoch=1;if(HZ)o.hz=lv(k);P.dinge.push(o);neu++});
 // Hinterhöfe: freie Wiesenfelder direkt an einer Bude (kein Weg) bekommen nur Hohes (Müll, Gerümpel, Wäsche …), ohne Wasserstelle und Schrein
 var nah1=new Uint8Array(N);P.bauten.forEach(function(b){if(b.rolle==='shack')mark(nah1,b,1)});
 var HH=ELEND_HOCH.filter(function(a){return deckel[a[0]]==null}),SHH=0;HH.forEach(function(a){SHH+=a[1]});
 for(yy=by0;yy<=by1;yy++)for(xx=bx0;xx<=bx1;xx++){k=yy*W+xx;if(Z.charAt(k)!=='g'||!nah1[k]||occ[k]||ding[k]||sperr[k]||tr[k])continue;var x=xx,y=yy;if(rausch(x,y,s+627)>=ELEND_DICHTE)continue;
  var art=wahl(HH,rausch(x,y,s+628)*SHH),o={id:elendId(art,rausch(x,y,s+629)),i:x,j:y,hoch:1};if(HZ)o.hz=lv(k);P.dinge.push(o);zahl[art]=(zahl[art]|0)+1;occ[k]=1;hoch++;neu++}
 P.elendDinge={zahl:neu+vorher,hoch:hoch+vorher,arten:zahl}}
// N6b5b3 (Thomas 24.11.2026): Elendssiedlung als Gewirr statt Blockraster (nur Biome mit felder, Mittelmeer). In Bildfeldern nach dem Maßstab, vor den Anbauten:
// Platz 3 × 3 in der Mitte, unregelmäßig (oft 1 Ecke angeknabbert), darauf Wasserstelle oder Müll-Schrein; 3–4 krumme Hauptgassen (1 breit) vom Platz bis zum Rand,
// krumme Sackgassen, bis jedes Feld höchstens 2 Felder von einer Gasse liegt; jedes Feld an einer Gasse wird Bude (Tür zur Gasse): erst die echten Buden (einw/6),
// der Rest Anbauten (anbau:1, ohne Bewohner), etwa 1 von 10 bleibt Lücke; dahinter kleine Hinterhöfe aus Schlamm (dürfen eingeschlossen sein);
// Müllgrube 2 × 2 am Rand an einer Gasse (Zellen x, Bodenkacheln boden-muellgrube-n/o/w/s nach den Nachbarfeldern, tools/at3-muellgrube.py).
// Gassen und Platz bleiben frei (P._gasse, nur beim Planen): Anbauten und Hohes stehen nie darauf, Flaches schon. Tor am Ende einer Hauptgasse, bevorzugt Süd.
// Notausschalter opt.gewirr:false (Blockraster wie vorher).
var GEWIRR_NB=[[0,1],[1,0],[0,-1],[-1,0]],GRUBE_IDS=['boden-muellgrube-n','boden-muellgrube-o','boden-muellgrube-w','boden-muellgrube-s'];
function elendGewirr(P,s,f){f=f||{eng:true,dinge:true};var W=P.W,N=W*W,r=rng(hashT([s,'gewirr',W].join('|'))),NB=GEWIRR_NB,k,x,y,d;if(W<7)return;
 var tpl=P.bauten[0]||{g:1,klasse:'clay-wood',dach:'flach',wand:null,dachR:HOLZ},nB=P.bauten.length;
 var Z=new Array(N).fill('e'),gasse=new Uint8Array(N),drin=function(x,y){return x>=0&&y>=0&&x<W&&y<W},at=function(x,y){return y*W+x};
 // Platz
 var c0=Math.floor((W-3)/2),cm=c0+1,ecken=[[c0,c0],[c0+2,c0],[c0,c0+2],[c0+2,c0+2]],weg0=0;
 for(y=c0;y<c0+3;y++)for(x=c0;x<c0+3;x++)gasse[at(x,y)]=1;
 if(r()<.7){var e1=ecken[Math.floor(r()*4)];gasse[at(e1[0],e1[1])]=0;weg0=1}   // eine Ecke angeknabbert (mehr teilt den Platz um die Mitte)
 // Hauptgassen: krumm, 1 breit, Seitwärtsschritt nie zweimal hintereinander, Richtung des Ausweichens mit Trägheit
 var ri=[0,1,2,3];for(k=3;k>0;k--){var q=Math.floor(r()*(k+1)),t=ri[k];ri[k]=ri[q];ri[q]=t}
 var nH=r()<.5?3:4,aus=[];
 for(var h=0;h<nH;h++){d=NB[ri[h]];var lat=[d[1],d[0]],sg=r()<.5?1:-1,zuletzt=0;x=cm+d[0]*2;y=cm+d[1]*2;
  for(var g0=0;g0<4*W;g0++){gasse[at(x,y)]=1;
   if((d[0]>0&&x===W-1)||(d[0]<0&&x===0)||(d[1]>0&&y===W-1)||(d[1]<0&&y===0))break;
   if(!zuletzt&&r()<.45){if(r()<.3)sg=-sg;var nx=x+lat[0]*sg,ny=y+lat[1]*sg,lq=lat[0]?nx:ny;
    if(lq>=1&&lq<=W-2&&!(Math.abs(nx-cm)<=1&&Math.abs(ny-cm)<=1)){x=nx;y=ny;zuletzt=1;continue}}
   zuletzt=0;x+=d[0];y+=d[1]}
  aus.push({i:x,j:y,r:ri[h]})}
 // Sackgassen: vom fernsten Feld (mehr als 2 Felder von jeder Gasse) auf dem billigsten Weg zur nächsten Gasse; Kosten je Feld nach Lage (1–3, am Rand +5),
 // so werden sie krumm und laufen nicht am Rand entlang
 var dist=new Int16Array(N),vor=new Int32Array(N),kost=new Int32Array(N),seiten=0,abst=function(){var st=[],a=0;for(k=0;k<N;k++){dist[k]=gasse[k]?0:-1;if(gasse[k])st.push(k)}
  while(a<st.length){var q=st[a++],qx=q%W,qy=(q-qx)/W;for(var m=0;m<4;m++){var mx=qx+NB[m][0],my=qy+NB[m][1];if(!drin(mx,my))continue;var mk=at(mx,my);if(dist[mk]<0){dist[mk]=dist[q]+1;st.push(mk)}}}};
 var preis=function(x,y){return 1+Math.floor(rausch(x,y,s+649)*3)+(x===0||y===0||x===W-1||y===W-1?5:0)};
 var billig=function(){var B=[],c,q,m;for(k=0;k<N;k++){kost[k]=gasse[k]?0:1e9;vor[k]=-1;if(gasse[k])(B[0]||(B[0]=[])).push(k)}
  for(c=0;c<B.length;c++){var Bc=B[c];if(!Bc)continue;for(var a=0;a<Bc.length;a++){q=Bc[a];if(kost[q]!==c)continue;var qx=q%W,qy=(q-qx)/W;
   for(m=0;m<4;m++){var mx=qx+NB[m][0],my=qy+NB[m][1];if(!drin(mx,my))continue;var mk=at(mx,my),nk=c+preis(mx,my);if(nk<kost[mk]){kost[mk]=nk;vor[mk]=q;(B[nk]||(B[nk]=[])).push(mk)}}}}};
 for(var it=0;it<80;it++){abst();var best=-1,bw=2.5;for(k=0;k<N;k++){var w0=dist[k]+rausch(k%W,(k/W)|0,s+641)*.9;if(dist[k]>2&&w0>bw){bw=w0;best=k}}
  if(best<0)break;billig();for(k=best;k>=0&&!gasse[k];k=vor[k])gasse[k]=1;seiten++}
 // Müllgrube 2 × 2 am Rand, an einer Gasse, nicht auf Gassen, nicht am Platz; lieber an einer Seite ohne Ausgang
 var grube=null,gw=9;for(y=0;y<W-1;y++)for(x=0;x<W-1;x++){if(x>0&&y>0&&x<W-2&&y<W-2)continue;var frei=true,an=false,dx,dy;
  for(dy=0;dy<2&&frei;dy++)for(dx=0;dx<2;dx++)if(gasse[at(x+dx,y+dy)]){frei=false;break}
  if(!frei)continue;for(dy=-1;dy<3;dy++)for(dx=-1;dx<3;dx++){if((dx<0||dx>1)===(dy<0||dy>1))continue;var ax=x+dx,ay=y+dy;if(drin(ax,ay)&&gasse[at(ax,ay)])an=true}
  if(!an)continue;var seite=y===0?2:x===W-2?1:y===W-2?0:3,wq=rausch(x,y,s+643)+(aus.some(function(a){return a.r===seite})?1:0);if(wq<gw){gw=wq;grube=[x,y]}}
 if(grube)for(y=grube[1];y<grube[1]+2;y++)for(x=grube[0];x<grube[0]+2;x++)Z[at(x,y)]='x';
 // echte Buden an den Gassen, Tür zur Gasse, eher zur Mitte hin
 var L=[];for(k=0;k<N;k++){if(gasse[k]||Z[k]!=='e')continue;x=k%W;y=(k-x)/W;for(d=0;d<4;d++){var tx=x+NB[d][0],ty=y+NB[d][1];if(drin(tx,ty)&&gasse[at(tx,ty)]){L.push(k);break}}}
 var wert=function(k){var x=k%W,y=(k-x)/W;return (Math.abs(x-cm)+Math.abs(y-cm))/W*.25+rausch(x,y,s+645)};L.sort(function(a,b){return wert(a)-wert(b)});
 var bauten=[];L.forEach(function(k,n){var an=n>=nB;if(an&&!f.eng)return;if(an&&rausch(k%W,(k-k%W)/W,s+651)<.1)return;   // überfüllt: alle Felder an der Gasse bebaut, etwa 1 von 10 bleibt als Lücke
 var x=k%W,y=(k-x)/W,o0=Math.floor(rausch(x,y,s+647)*4),t=null;
  for(var m=0;m<4&&!t;m++){var q=NB[(o0+m)%4];if(drin(x+q[0],y+q[1])&&gasse[at(x+q[0],y+q[1])])t=q}
  var o={rolle:'shack',id:'shack',i:x,j:y,w:1,h:1,g:tpl.g,klasse:tpl.klasse,dach:tpl.dach,achse:t[0]?'i':'j',wand:tpl.wand,dachR:tpl.dachR,tuer:[x,y,t[0],t[1]],satz:null};if(an){o.anbau=1;Z[k]='g'}bauten.push(o)});   // unter Anbauten Wiese wie bei anbauten() (gemalt wird Schlamm)
 P.zellen=Z.join('');
 // Platzmitte: Wasserstelle oder Schrein; Tor am Ende einer Hauptgasse (Süd zuerst)
 var u1=r(),u2=r(),dinge=f.dinge?[{id:elendId(u1<.6?'wasser':'schrein',u2),i:cm,j:cm,hoch:1}]:[];
 var ts=aus.filter(function(a){return a.r===0})[0]||aus[0];
 P.bauten=bauten;P.dinge=dinge;P.tor={i:ts.i,j:ts.j};P.gesetzt={shack:Math.min(nB,L.length)};P._gasse=gasse;if(grube)P.grube=1;
 P.gewirr={gassen:nH,ausgaenge:aus.length,seiten:seiten,platz:9-weg0,grube:!!grube}}
// Bodenkachel der Müllgrube nach den Nachbarfeldern (passt nach drehen und spiegeln)
function grubeId(P,i,j){var W=P.W,x=function(a,b){return a>=0&&b>=0&&a<W&&b<W&&P.zellen.charAt(b*W+a)==='x'};var l=x(i-1,j),o=x(i,j-1);return GRUBE_IDS[(l?1:0)+(o?2:0)]}
var BUDE_C=new Map();
function budeBild(b,hole){var g=budeGanz(b);if(!g)return null;var ids=[],cells=[],di,dj;
 for(dj=0;dj<b.h;dj++)for(di=0;di<b.w;di++){var tf=b.i+di===b.tuer[0]&&b.j+dj===b.tuer[1],id=tf?g.id:'elend-bude-'+budeVariante(b.i+di,b.j+dj,b.bv*977)+'-'+g.hr,o=hole(id),sp=o&&malbild(o);
  if(!sp)return null;ids.push(id);cells.push({sp:sp,o:o,x:(di-dj)*32,y:(di+dj)*16+16,t:di+dj})}   // Anker der Kartei = Feldmitte, hier obere Ecke von Feld (0, 0)
 var key=b.w+'x'+b.h+'|'+ids.join('|'),m=BUDE_C.get(key);if(m&&m.o===cells[0].o)return{sp:m.sp,fehlt:[],teile:cells.length};
 cells.sort(function(a,c){return a.t-c.t});var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
 cells.forEach(function(c){x0=Math.min(x0,c.x-c.sp.ax);y0=Math.min(y0,c.y-c.sp.ay);x1=Math.max(x1,c.x-c.sp.ax+c.sp.w);y1=Math.max(y1,c.y-c.sp.ay+c.sp.h)});
 var r={w:x1-x0,h:y1-y0,ax:-x0,ay:-y0,px:new Uint8Array((x1-x0)*(y1-y0)).fill(LEER)};cells.forEach(function(c){blit(r,c.sp,c.x+r.ax,c.y+r.ay)});
 if(BUDE_C.size>64)BUDE_C.clear();BUDE_C.set(key,{o:cells[0].o,sp:r});return{sp:r,fehlt:[],teile:cells.length}}
function hofGanz(b){if(b.rolle!=='hof'||!b.hv||!b.tuer||b.w!==b.h||HOF_HAUS[b.hofart]!==b.w)return null;var r=HOF_RICHT[b.tuer[2]+','+b.tuer[3]];if(!r)return null;
 var s=b.w,o=hofTuerOff(r,s),ti=b.tuer[0]-b.i,tj=b.tuer[1]-b.j;
 if(r==='sued'?(tj!==s-1||ti!==o):r==='nord'?(tj!==0||ti!==o):r==='ost'?(ti!==s-1||tj!==o):(ti!==0||tj!==o))return null;
 return{id:'hof-'+b.hofart+'-'+b.hv+'-'+r,spiegel:false,rel:null,hp:b.hp||null,hr:r}}
function ganzBild(b,hole){var g=tempelGanz(b)||theaterGanz(b)||statthalterGanz(b)||senatGanz(b)||koenigspalastGanz(b)||presseGanz(b)||hofGanz(b)||postenGanz(b);if(!g)return null;var o=hole(g.id),oi=g.spiegel?hole(g.id+'-i'):null,suf='';if(oi&&malbild(oi)){o=oi;suf='-i'}
 var sp=malbild(o);if(!sp)return null;var gr=b.gross?'gross':'klein',spiegel=g.spiegel&&!suf,rk=relKurz(g.rel);
 var key=g.id+'|'+(spiegel?1:0)+suf+'|'+(g.rel||g.herr||'')+(g.hp?'|'+g.hp:'')+(g.zub?'|'+g.zub:''),m=GANZ&&GANZ.get(key);if(m&&m.o===o)return{sp:m.sp,fehlt:[],teile:m.teile};
 // Anker der Kartei (Art anlage) = Mitte der Grundfläche; hier gilt die obere Ecke von Feld (0, 0) wie bei allen Gebäuden
 var F=o.karte&&o.karte.flaeche,r={w:sp.w,h:sp.h,ax:sp.ax-(F?(F.w-F.h)*16:0),ay:sp.ay-(F?(F.w+F.h)*8:0),px:new Uint8Array(sp.px)},teile=1,fehlt=[];
 (o.schilder||[]).forEach(function(s){if(s.teil.indexOf('presse-')===0){if(g.hp&&s.teil==='presse-'+g.hp){var tp=malbild(hole('hofpresse-'+g.hp+'-'+g.hr));   // N6b4c4 Teilbild in der Gutshof-Ecke
   if(tp){blit(r,tp,s.x+r.ax,s.y+r.ay);teile++}else fehlt.push('hofpresse-'+g.hp+'-'+g.hr)}return}
  if(s.teil.indexOf('zubehoer-')===0){if(g.zub&&s.teil==='zubehoer-'+g.zub){var tz=malbild(hole('posten-zubehoer-'+g.zub+'-'+g.zw+'-'+g.hr));if(tz){blit(r,tz,s.x+r.ax,s.y+r.ay);teile++}}return}   // N6b4d1 Zubehör der Anlage
  var id=g.schild?g.schild+s.teil+'-':'tempel-'+s.teil+'-'+gr+'-',k2=g.schild?g.herr:rk,t=k2?malbild(hole(id+k2+suf)):null;if(!t)t=malbild(hole(id+'ohne'+suf));if(!t){fehlt.push(id+'ohne'+suf);return}
  blit(r,t,s.x+r.ax,s.y+r.ay);teile++});
 // Schilder sitzen in Bildkoordinaten (x, y ab Anker); gespiegelt wird das fertige Bild, so passen sie mit
 if(spiegel)r=spiegelSp(r);if(GANZ){if(GANZ.size>64)GANZ.clear();GANZ.set(key,{o:o,sp:r,teile:teile})}return{sp:r,fehlt:fehlt,teile:teile}}
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
 var gmax=1,hmax=0;P.bauten.forEach(function(b){if((b.g|0)>gmax)gmax=b.g|0;if(b.id==='temple')hmax=Math.max(hmax,hoch(b))});var HZ=P.hoehe||null,HMAX=(P.huegel?P.huegel.stufen:0)+(P.wehr?WEHR_H+TURM_H+1:0),TOP=176+HOCH_PLUS+(gmax-1)*GH+HMAX*HSTUFE;   // + Mauer und Türme (N6b2d)   // Platz oben für Geschosse (N6b2b1) und Burgberg (N6b2c4c3)
 TOP=Math.max(TOP,hmax+8+HMAX*HSTUFE);var Zw=WT*64+64,Zh=WT*32+TOP+8,OX=WT*32+32,OY=TOP;
 // Bildlage eines Felds (i, j) im Plan (Umland hat negative bzw. zu große Zahlen): Ecke oben = ((i−j)·32, (i+j)·16)
 var bx=function(i,j){return OX+(i-j)*32},by=function(i,j){return OY+(i+U+j+U)*16};
 var weg=P.basis&&KURZ[P.basis.klasse]?'bk-'+KURZ[P.basis.klasse]+'-boden':'boden-weg';
 var PK=pflasterKarte(P);   // N6b3a
 var FB=!!(B.felder&&P.flur&&opt.feldbild!==false);   // N6b4c1
 var BUF=budeFelder(P),bodenId=function(i,j){var innen=i>=0&&j>=0&&i<W&&j<W,c=innen?P.zellen.charAt(j*W+i):'g';if(c==='x'&&P.grube&&innen)return grubeId(P,i,j);   // N6b5b3 Müllgrube
  if(BUF&&innen&&c==='g'&&BUF[j*W+i])c='e';if(c==='e'&&P.schlamm&&innen)return schlammWahl(i,j,P.seed>>>0);   // N6b5a Erde unter Buden, Schlammböden
  if(PK&&innen){var pc=PK[j*W+i];if(pc){if(pc===2)return 'pflaster-basalt-a';if(pc===3)return 'pflaster-basalt-b';return pflasterWahl(pc===1?'basalt':pc===4?'gasse':pc===5?'platz':'marmor',i,j,P.seed|0)}}
  if(c==='g'){if(FB&&innen&&P.dauer){var fh=feldBild(P,i,j);if(fh)return fh}var l=B.boden;return l[Math.floor(rausch(i,j,P.seed+1)*l.length*(l.length>1?.75:1))%l.length]}
  if(FB&&innen&&(c==='f'||c==='p')){var fb=feldBild(P,i,j);if(fb)return fb}   // N6b4c1 (Hainboden N6b4c2 oben bei 'g')
  if(c==='s')return B.weg;if(c==='o')return weg;if(c==='f'||c==='k')return P.feld||'bk-feld';if(c==='w')return flussWahl(i,j,P.seed);if(c==='q')return weg;if(c==='y')return flussWahl(i,j,P.seed);if(c==='u')return 'boden-sand';return BODEN_ID[c]||'boden-gras'};
 // N6b4b3 Säume: Rang des eigenen Bodens, höherrangige Nachbarn gleicher Höhe (Burgberg-Felder nicht) hängen ihren Saum an (e.su = [[Nachbarbild, Kante, Variante], …])
 var SAUM=opt.saum!==false,saeume=function(e0,i,j){var p=SAUM_RANG[e0.id];if(p==null||(HZ&&lv(i,j)))return;var su=null,v=Math.floor(rausch(i,j,P.seed+177)*SAUM_VAR),sm=i>=0&&j>=0&&i<W&&j<W&&SAUM_WEG.test(P.zellen.charAt(j*W+i))?1:0;
  for(var q=0;q<4;q++){var x=i+SAUM_NB[q][0],y=j+SAUM_NB[q][1];if(x<-U||y<-U||x>=W+U||y>=W+U||(HZ&&lv(x,y)))continue;var nid=bodenId(x,y),np=SAUM_RANG[nid];
   if(np!=null&&np>p)(su||(su=[])).push([nid,q,v,sm])}if(su)e0.su=su};
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
  var NG={};w.treppen.forEach(function(t){if(t.nische)NG[t.nische[1]*W+t.nische[0]]=t.gasse});var TD={};w.tuerme.forEach(function(t){var o=t[3];if(!o)return;var mk=function(f,c){var d=f[2]-f[0]===1?'o':f[3]-f[1]===1?'s':'';if(d)TD[(f[1]*W+f[0])+d]=c};   // N6b2e2t: Türen an den vorderen Turmseiten
   o.gang.forEach(function(f){mk(f,'g')});if(o.tuer)mk(o.tuer,'e')});
  // N6b2e1: Turm = Gang + TURM_H (in der Ablage), Rampen davor; eine Rampe deckt die Wand des höheren Nachbarn, in den sie hinaufführt
  var THB={},MKe=w.torhaus&&w.torhaus.length?innenMaske(P):null;(w.torhaus||[]).forEach(function(h){for(var q=0;q<9;q++)THB[(h.j+(q/3|0))*W+h.i+q%3]=[h.i,h.j]});
  var oben=function(x,y){var a=gA(x,y);if(a==='.'||a==='t'||a==='n')return lv(x,y);return gL(x,y)},GEG={o:'w',s:'n'};
  w.k.forEach(function(k){var i=k%W,j=(k/W)|0,a=R.art(k),L0=R.gang(k),g0=lv(i,j),top=L0,t0=i+j+.02,s;
   var dz=function(id,z){el.push({t:t0,n:n++,d:{id:id,i:i,j:j,hz:z}})};
   var spiess=[];
   if(a==='n'){var gs=NG[k];dz(gs?bodenId(gs[0],gs[1]):B.weg,g0);return}   // Nische vor dem Treppenfuß: Boden der Gasse daneben
   if(a==='d'){var fo=HALB[R.stufe(k)];if(fo==='ob')for(s=g0+1;s<=top;s++)dz(halbWahl('mauer-halb-wand',i,j+s*7,P.seed,WAND_VAR),s);   // N6b2e2a: nur die Schräge der oberen Hälfte zeigt zum Betrachter
    dz('mauer-halb-'+fo,top);if(R.zinne(k))dz(fo==='ob'?halbWahl('mauer-halb-zinne-ob',i,j,P.seed):'mauer-halb-zinne-'+fo,top);return}
   if(a==='q'){var fq=R.stufe(k);if(ZW_SICHT.indexOf(fq)>=0)for(s=g0+1;s<=top;s++)dz(halbWahl('mauer-zw-wand-'+fq,i,j+s*7,P.seed,'000a'),s);   // N6b2e2b1
    dz('mauer-zw-'+fq,top);if(R.zinne(k))dz(ZW_ZV[fq]?halbWahl('mauer-zw-zinne-'+fq,i,j,P.seed,ZW_ZV[fq]):'mauer-zw-zinne-'+fq,top);return}
   [['o','i'],['s','j']].forEach(function(q){var x=i+WRI[q[0]][0],y=j+WRI[q[0]][1],nb=oben(x,y),na=gA(x,y);
    if(a==='t'){if(nb>=L0)return;var hb=THB[k];if(!hb){dz('tor-sturz-'+q[1],L0);return}
     // N6b2e3: Mauerscheibe mit runder Öffnung (2 Teile zu je 2 Stufen, oben bündig mit dem Gang), darunter am Burgberg Mauer; Gitter als eigenes Teil
     var seite=MKe[y*W+x]===1?'innen':'aussen',sp=q[0]==='o'?2-(j-hb[1]):i-hb[0],id='torhaus-'+seite+'-'+q[1]+'-'+sp;
     for(s=Math.max(nb,g0)+1;s<=L0-4;s++)dz('mauer-kante-'+q[1],s);dz(id+'u',L0-2);dz(id+'o',L0);if(seite==='aussen')dz('torhaus-gitter-'+q[1]+'-'+sp,L0-1);
     if(seite==='aussen'&&sp===1&&(R.zinne(k)&ZBIT[q[0]]))spiess.push([q[1],L0]);return}
    if((na==='m'||na==='t')&&R.stufe(y*W+x)===GEG[q[0]]&&nb===top-1)return;   // Rampe davor steigt bis an die Kante
    var td=a==='T'?TD[k+q[0]]:'',s0=Math.max(nb,g0)+1;
    if(td==='e'){dz('turm-eingang-'+q[1],s0+1);s0+=2}   // Erdgeschosstür (2 Stufen) ab dem höheren Boden (Gasse oder Turmfuß), darüber Turmwand
    for(s=s0;s<=top;s++){if(td==='g'&&s===top-1){dz('turm-tuer-'+q[1],top);break}   // Gangtür: 2 Stufen über dem Gang bis unter die Plattform
     dz(a==='T'?(s===top?'turm-scharte-':'turm-kante-')+q[1]:'mauer-kante-'+q[1],s)}});
   var st=R.stufe(k);dz(a==='r'?'fels-treppe-'+st:a!=='T'&&st!=='.'?'mauer-rampe-'+st:'mauer-gang',top);
   var zb=R.zinne(k);if(zb)['n','w','o','s'].forEach(function(d){if(zb&ZBIT[d])dz(zinneWahl(d,i,j,P.seed),top)});
   spiess.forEach(function(sp2){dz('torhaus-spiesse-'+sp2[0]+(rausch(i,j,P.seed+151)<.5?'':'-a'),sp2[1])})})};   // Köpfe auf Spießen über der Mitte der Außenseite
 // N6b3c2 Säulenhallen: je Laden- und Gangfeld ein Randstück auf der Stufe des Forums (opt.forumBild:false = schlichter Marmorplatz wie bisher)
 var forumEls=function(F){for(var y=F.j;y<F.j+F.h;y++)for(var x=F.i;x<F.i+F.w;x++){var id=forumId(F,x,y,P.seed);if(id)el.push({t:x+y+.02,n:n++,d:{id:id,i:x,j:y,hz:F.hz|0}})}};
 // Liste füllen, auf Wunsch in Schritten: aus() → true, wenn der Zeitanteil um ist (Kachelbauer); bauer() füllt am Stück wie bisher
 var fuellen=function(aus){var c=0;while(stufe<5){
   if(stufe===0){for(;qs<=2*(W-1)+U;qs++,qi=-U){for(;qi<W+U;qi++){var j=qs-qi;if(j<-U||j>=W+U)continue;var e0={k:0,id:bodenId(qi,j),X:bx(qi,j),Y:by(qi,j)+16};if(SAUM)saeume(e0,qi,j);L.push(e0);
      if(HZ&&qi>=0&&j>=0&&qi<W&&j<W&&(lv(qi,j)||lv(qi+1,j)||lv(qi-1,j)||lv(qi,j+1)||lv(qi,j-1)))HL.push(j*W+qi);
      if((++c&255)===0&&aus&&aus()){qi++;return false}}}stufe=1}
   else if(stufe===1){var WE=P.wehr;P.bauten.forEach(function(b){if(WE&&b.rolle==='mauer')return;el.push({t:b.i+b.j+(b.w+b.h)/2,n:n++,b:b})});if(WE)wehrEls(WE);var FM=P.forum&&opt.forumBild!==false&&opt.forumMitte!==false;if(P.forum&&opt.forumBild!==false)forumEls(P.forum);
     if(FM)forumGanzEls(P.forum).forEach(function(b){el.push({t:b.i+b.j+(b.w+b.h)/2,n:n++,b:b})});   // N6b3c3 Bühne und Reiter (opt.forumMitte:false = alter Stand)
     P.dinge.forEach(function(d){if(FM&&d.rolle==='forum')return;el.push({t:d.i+d.j+1.02,n:n++,d:d})});if(HL.length){UNTER=new Uint8Array(W*W);P.bauten.forEach(function(b){for(var y=Math.max(0,b.j);y<Math.min(W,b.j+b.h);y++)for(var x=Math.max(0,b.i);x<Math.min(W,b.i+b.w);x++)UNTER[y*W+x]=1})}
   HL.forEach(function(k){huegelEl(k%W,(k/W)|0)});HL=null;stufe=U?2:3;if(aus&&aus())return false}
   else if(stufe===2){for(;uj<W+U;uj++,ui=-U){for(;ui<W+U;ui++){if(ui>=0&&uj>=0&&ui<W&&uj<W)continue;
      if(rausch(ui,uj,P.seed+21)<B.dichte*(1+.15*Math.max(ui<0?-ui:ui-W+1,uj<0?-uj:uj-W+1)))el.push({t:ui+uj+1.02,n:n++,d:{id:B.baeume[Math.floor(rausch(ui,uj,P.seed+22)*B.baeume.length)],i:ui,j:uj}})}}stufe=3}
   else if(stufe===3){if(!O3)O3=ordner(el);if(!O3.weiter(aus))return false;el=O3.liste;O3=null;stufe=4;if(aus&&aus())return false}
   else{for(;qk<el.length;qk++){var e=el[qk];if(e.d)L.push({k:1,id:e.d.id,X:bx(e.d.i,e.d.j),Y:by(e.d.i,e.d.j)+16-(e.d.hz|0)*HSTUFE});
      else{var b=e.b,ox=b.rund?b.i-1:b.i,oy=b.rund?b.j-1:b.j,fw=b.w,fh=b.h;if(b.rund){var R=bk.bilde('rund',b.w,b.w,b.klasse);fw=R.w;fh=R.h}L.push({k:2,b:b,X:bx(ox,oy),Y:by(ox,oy)-(b.hz|0)*HSTUFE,fw:fw,fh:fh})}
      if((++c&255)===0&&aus&&aus()){qk++;return false}}el=null;stufe=5}}return true};
 if(!opt.inSchritten)fuellen(null);
 // Gebäude zusammensetzen (Baukasten); N6b: Teile des Biom-Satzes (bk-putz-…) vor den Klassenteilen, fehlt eins, gilt das Klassenteil
 var bauBild=function(e){var b=e.b,R;if(b.ganz){var fg=forumGanzBild(b,hole);if(!fg.sp)return{sp:{w:0,h:0,ax:0,ay:0,px:new Uint8Array(0)},X:e.X,Y:e.Y,fehlt:fg.fehlt,teile:0};fg.X=e.X;fg.Y=e.Y;return fg}
  var gz=b.id==='temple'||b.id==='theatre'||b.id==='governor'||b.id==='senate'||b.id==='royal-palace'||PRESSE_ID[b.id]||(b.hv&&b.rolle==='hof')||(b.pv&&(b.rolle==='posten'||b.rolle==='stollen'))?ganzBild(b,hole):b.bv&&b.rolle==='shack'?budeBild(b,hole):null;if(gz){gz.X=e.X;gz.Y=e.Y;return gz}   // N6b3b1 Tempel als Ganzbild mit Wechselschild, N6b3d Theater
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
function zeichne(E,e,Z,dx,dy,fehlt,bau){if(e.k<2){var sp=malbild(E.hole(e.id));if(!sp){fehlt[e.id]=1;return 0}blit(Z,sp,e.X-dx,e.Y-dy);
  if(e.su)for(var q=0;q<e.su.length;q++){var so=malbild(saumObj(E.hole(e.su[q][0]),e.su[q][1],e.su[q][2],e.su[q][3]));if(so)blit(Z,so,e.X-dx,e.Y-dy)}return 1}   // N6b4b3 Säume über dem eigenen Boden
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
function hoch(b){if(b&&b.ganz)return FORUM_GANZ[b.art].hoch;var h=HOCH+HOCH_PLUS+(b&&b.g>1?(b.g-1)*GH:0);if(b&&b.id==='temple'&&tempelGanz(b))h=Math.max(h,(b.gross?TEMPEL.gross:TEMPEL.klein).hoch);if(b&&b.id==='theatre'&&theaterGanz(b))h=Math.max(h,THEATER.hoch);if(b&&b.id==='governor'&&statthalterGanz(b))h=Math.max(h,STATTHALTER.hoch);if(b&&b.id==='senate'&&senatGanz(b))h=Math.max(h,SENAT.hoch);if(b&&b.id==='royal-palace'&&koenigspalastGanz(b))h=Math.max(h,KOENIGSPALAST.hoch);if(b&&PRESSE_ID[b.id]&&presseGanz(b))h=Math.max(h,PRESSE.hoch);if(b&&b.hv&&hofGanz(b))h=Math.max(h,HOF_HOCH[b.hofart]);if(b&&b.bv&&budeGanz(b))h=Math.max(h,BUDE_HOCH);if(b&&b.pv&&postenGanz(b))h=Math.max(h,POSTEN_HOCH[b.rolle]);return h}   // N6b3b1 Tempel-Ganzbild höher
function kachelBauer(P,hole,opt){opt=opt||{};var E=elemente(P,hole,{umland:opt.umland,inSchritten:true,saum:opt.saum}),K=opt.kachel||256,GRENZE=opt.grenze||32,RAND=opt.rand==null?1:opt.rand,HAUS=opt.hausSpeicher||1048576;
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
function kennungen(P){var bk=BK(),s={},B=BIOME[P.biom];B.boden.concat([B.weg,P.feld||'bk-feld','boden-wasser','boden-erde','boden-gras','boden-fels','bk-marmor-boden','boden-sand','steg-deck-i','steg-deck-j'].concat(B.pflaster&&P.pflaster!==false&&(P.g|0)>=MAUER_AB?PFL_IDS:[]).concat(B.felder&&P.flur?FELD_IDS:[],P.dauer?DAUER_IDS:[],P.wehr?WEHR_IDS:[],P.forum?FORUM_IDS().concat(FORUM_GANZ_IDS(P.forum)):[],P.hoehe?['fels-kante-i','fels-kante-j','fels-treppe-s','fels-treppe-n','fels-treppe-o','fels-treppe-w']:[],FLUSS_VAR,Object.keys(RAMPE).map(function(k){return RAMPE[k]}))).forEach(function(i){s[i]=1});
 bk.KLASSEN.forEach(function(k){s['bk-'+k.kurz+'-boden']=1});B.baeume.forEach(function(i){s[i]=1});for(var h in HAIN)s[HAIN[h]]=1;P.dinge.forEach(function(d){s[d.id]=1});if(P.grube)GRUBE_IDS.forEach(function(i){s[i]=1});return Object.keys(s)}

var SB={GRUBE_IDS:GRUBE_IDS,grubeId:grubeId,SCHLAMM:SCHLAMM,schlammWahl:schlammWahl,BUDE_VAR:BUDE_VAR,budeGanz:budeGanz,budeBild:budeBild,budeVariante:budeVariante,FISCHER_LAGER:FISCHER_LAGER,UFER_LAGER:UFER_LAGER,WASCH_LAGER:WASCH_LAGER,SALZ_LAGER:SALZ_LAGER,SALZ_BECKEN:SALZ_BECKEN,JAGD_LAGER:JAGD_LAGER,postenGanz:postenGanz,postenBildAn:postenBildAn,MINE_LAGER:MINE_LAGER,BRUCH_LAGER:BRUCH_LAGER,BRUCH_PLATZ:BRUCH_PLATZ,HOLZ_LAGER:HOLZ_LAGER,KOEHLER_LAGER:KOEHLER_LAGER,KOEHLER_PLATZ:KOEHLER_PLATZ,POSTEN_SELTEN:POSTEN_SELTEN,presseGanz:presseGanz,hofPresse:hofPresse,PRESSE:PRESSE,PRESSE_ID:PRESSE_ID,pferchZaun:pferchZaun,flurKante:flurKante,hofGanz:hofGanz,hofTuerOff:hofTuerOff,HOF_BILD_VAR:HOF_BILD_VAR,PFERCH_FUSS:PFERCH_FUSS,dauerDinge:dauerDinge,dauerDing:dauerDing,DAUER_BILD:DAUER_BILD,DAUER_IDS:DAUER_IDS,DAUER_DINGE:DAUER_DINGE,DAUER_STUMPF:DAUER_STUMPF,postenPlan:postenPlan,postenBegeh:postenBegeh,postenSeite:postenSeite,POSTEN_ANLAGE:POSTEN_ANLAGE,POSTEN_HOF:POSTEN_HOF,POSTEN_W:POSTEN_W,POSTEN_GROSS:POSTEN_GROSS,POSTEN_SEITEN:POSTEN_SEITEN,malbild:malbild,saumObj:saumObj,SAUM_RANG:SAUM_RANG,FELD_IDS:FELD_IDS,FELD_BILD:FELD_BILD,feldBild:feldBild,feldAchse:feldAchse,SAUM_SCHMAL:SAUM_SCHMAL,setzeLandw:setzeLandw,landwDaten:landwDaten,flurArt:flurArt,flurTempo:flurTempo,FLUR_RASTER:FLUR_RASTER,FLUR_WEIT:FLUR_WEIT,HOF_HAUS:HOF_HAUS,KOENIGSPALAST:KOENIGSPALAST,koenigspalastFest:koenigspalastFest,koenigspalastGanz:koenigspalastGanz,SENAT:SENAT,senatFest:senatFest,senatGanz:senatGanz,STATTHALTER:STATTHALTER,statthalterFest:statthalterFest,statthalterGanz:statthalterGanz,THEATER:THEATER,theaterFest:theaterFest,theaterGanz:theaterGanz,festLage:festLage,FORUM:FORUM,FORUM_GANZ:FORUM_GANZ,forumGanzEls:forumGanzEls,forumGanzBild:forumGanzBild,FORUM_GANZ_IDS:FORUM_GANZ_IDS,forumFest:forumFest,forumArt:forumArt,forumTeile:forumTeile,forumId:forumId,FORUM_IDS:FORUM_IDS,TEMPEL:TEMPEL,ehrensaeulen:ehrensaeulen,EHREN_ART:EHREN_ART,REL_BIOM:REL_BIOM,tempelGanz:tempelGanz,tempelUmwidmen:tempelUmwidmen,ganzBild:ganzBild,relKurz:relKurz,PFL_IDS:PFL_IDS,pflasterKarte:pflasterKarte,pflasterWahl:pflasterWahl,TOR_B:TOR_B,TOR_GERADE:TOR_GERADE,MAUER_BILD:MAUER_BILD,toreGeradeOk:torGeradeOk,wehrLese:wehrLese,WEHR_IDS:WEHR_IDS,WEHR_H:WEHR_H,TURM_H:TURM_H,TURM_AB:TURM_AB,mauerwerk:mauerwerk,wehrNachbarn:wehrNachbarn,wehrDrehen:wehrDrehen,HSTUFE:HSTUFE,GIPFEL1:GIPFEL1,GIPFEL2:GIPFEL2,huegelPlan:huegelPlan,innenMaske:innenMaske,TOTE:TOTE,HOF_JE:HOF_JE,GRAB_JE:GRAB_JE,GRAB_MAX:GRAB_MAX,elemente:elemente,kachelBauer:kachelBauer,HOCH:HOCH,hoch:hoch,skalieren:skalieren,ARTEN:ARTEN,BIOME:BIOME,STILE:STILE,plan:plan,blockMass:blockMass,setzeDaten:setzeDaten,PROBE_EINW:PROBE_EINW,ART_G:ART_G,spiegeln:spiegeln,drehen:drehen,bauer:bauer,malen:malen,kacheln:kacheln,zaehle:zaehle,kennungen:kennungen,hashT:hashT};
if(typeof module!=='undefined'&&module.exports)module.exports=SB;else G.AT3_STADTBILD=SB;
})(typeof window!=='undefined'?window:globalThis);
