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
// Zellen: g Wiese, s Gasse, o Platz (Pflaster der Bauklasse), m Platz aus Marmor, f Feld, w Wasser, e Erde (Elend), p Weide, x Ruine/Fels.
// Plan nach Einwohnern (N6b2c2): Gebäudeliste (nur Lage „innen“; Tor und Umland kommen mit N6b2c3) → Blöcke mit Innenhof, jedes Gebäude am Blockrand mit Tür zur Gasse,
// zwei Hauptstraßen (2 breit) kreuzen in der Mitte und enden an 4 Toren, Ringgasse innen an der Mauer (2 breit, ab Marktflecken, Platzhalter bis N6b2d).
// Monumente (Fläche ≥ 30 oder breiter als ein Block) liegen mittig in Doppelblöcken; der Rest der Gruppe ist Platz mit Zugängen von allen 4 Seiten.
// Zonen von innen nach außen (rang). Varianten aus dem Seed: Lage der Monumente, Reihenfolge der Blöcke, Drehung, Spiegeln. Gleicher Seed = gleicher Plan.
// opt: {seed, biom, stil?, einw? (1–20.000), art? (Probe-Einwohner der Art), liste? (stadtliste-Ergebnis), leit?, daten?, probeW? (Probestadt = 20.000 Einwohner), mass?}
function plan(opt){
 var art=opt.art||'',A=art?ARTEN[art]:null;if(art&&!A)throw new Error('Unbekannte Siedlungsart: '+art);var B=BIOME[opt.biom];if(!B)throw new Error('Unbekanntes Biom: '+opt.biom);
 var ST=opt.stil?STILE[opt.stil]:null;if(opt.stil&&!ST)throw new Error('Unbekannter Baustil: '+opt.stil);
 var F=opt.mass==null?BK().MASS:+opt.mass,seed=opt.seed>>>0,elend=!!(A&&A.elend);
 var einw=opt.liste?opt.liste.einw:opt.einw!=null?Math.max(1,Math.min(20000,opt.einw|0)):opt.probeW?PROBE_EINW:A?A.einw:150;
 var Li=opt.liste||(elend?null:SL().probe(einw,opt.biom,seed,daten(opt),opt.leit)),g=elend?3:Li.g;if(!art)art=ART_G[g];
 var basis={klasse:(ST||B).klasse,dach:(ST||B).dach,wand:(ST||B).wand,dachR:(ST||B).dachR};
 // Gebäude einzeln
 var items=[];if(elend){for(var e0=Math.ceil(einw/6);e0>0;e0--)items.push({id:'shack',w:1,h:1,haupt:'households',stufe:1})}
 else Li.gebaeude.forEach(function(x){if(x.lage!=='innen')return;for(var k=0;k<x.n;k++)items.push({id:x.id,w:x.w,h:x.h,haupt:x.haupt,stufe:x.stufe})});
 var Bm=blockMass(g),P1=Bm+1,wall=g>=MAUER_AB&&!elend?MAUER:0,off=wall+1;
 var istMono=function(it){return Math.max(it.w,it.h)>Bm||it.w*it.h>=30};
 var mono=items.filter(istMono),rest=items.filter(function(it){return !istMono(it)});
 mono.sort(function(a,b){return b.w*b.h-a.w*a.h||(a.id<b.id?-1:a.id>b.id?1:0)});
 rest.sort(function(a,b){return rang(a)-rang(b)||b.w*b.h-a.w*a.h||(a.id<b.id?-1:a.id>b.id?1:0)});
 var grpK=function(it){var m=Math.max(it.w,it.h),k=2;while(k*P1-1<m)k++;return k};
 var fl=0,kmax=0;rest.forEach(function(it){fl+=it.w*it.h});mono.forEach(function(it){var k=grpK(it);fl+=k*k*Bm*Bm;if(k>kmax)kmax=k});
 var nb=Math.max(2,Math.ceil(Math.sqrt(fl/(Bm*Bm))),2*kmax);if(nb%2)nb++;   // erst dicht versuchen, bei Bedarf je 2 Blöcke mehr
 var ergebnis=null;
 for(var versuch=0;versuch<10&&!ergebnis;versuch++,nb+=2)ergebnis=anlegen(nb);
 if(!ergebnis)throw new Error('Stadtplan passt nicht ('+items.length+' Gebäude)');
 // Vor den Toren und Umland (N6b2c3): Außenring um den Plan innen; opt.aussen === false = nur innen (Tests N6b2c2)
 if(opt.aussen!==false&&!elend){var ea=null;for(var zug=0;zug<12&&!ea;zug++)ea=aussen(ergebnis,zug);if(!ea)throw new Error('Außenring passt nicht');ergebnis=ea}
 function aussen(E,zug){
  var Wi=E.W,cX=E.achse?E.achse.i:E.tor.i,cY=E.achse?E.achse.j:E.tor.i,ra=rng(hashT([seed,art,opt.biom,einw,'aussen'].join('|'))),D=daten(opt),gST=SL().STUFE[g]||1,mit=g>=MAUER_AB;
  var stink=Math.floor(ra()*4),grab=(stink+1+Math.floor(ra()*3))%4;
  var gewerbe=[],tote=[],friedhof=[],buden=0,hoefe=[];
  Li.gebaeude.forEach(function(x){for(var k=0;k<x.n;k++){
   if(x.lage==='tor'){if(x.id==='shack')buden++;else if(x.id==='cemetery')friedhof.push(x);else if(TOTE[x.id])tote.push(x);else gewerbe.push(x)}
   else if(x.lage==='umland')hoefe.push({id:x.id,w:x.w,h:x.h,liste:true})}});
  // Zusätzliche Felder und Weiden nach Einwohnern (Vorschlag: 1 Hof je HOF_JE Einwohner), Arten aus dem Biom, abwechselnd Feld und Herde
  var passt=function(x){return x&&x.hof&&(x.gruppe==='felder'||x.gruppe==='vieh')&&(x.biom.indexOf('alle')>=0||x.biom.indexOf(opt.biom)>=0)&&(x.stufe||1)<=gST};
  var FA=D.L.filter(function(x){return passt(x)&&x.gruppe==='felder'&&!HAIN[x.id]}).map(function(x){return x.id}).sort(),
      VA=D.L.filter(function(x){return passt(x)&&x.gruppe==='vieh'}).map(function(x){return x.id}).sort();
  var nx=Math.floor(einw/HOF_JE);for(var k=0;k<nx;k++){var L2=(k%2&&VA.length)||!FA.length?VA:FA;if(!L2.length)break;var id=L2[Math.floor(ra()*L2.length)],fs=SL().fuss(D.G[id]);hoefe.push({id:id,w:fs[0],h:fs[1],liste:false})}
  var graeber=mit&&(tote.length||friedhof.length)?Math.min(GRAB_MAX,Math.ceil(einw/GRAB_JE)):0;
  // Zeilen: je Seite (0 Süd, 1 Nord, 2 Ost, 3 West) links und rechts der Ausfallstraße; u = Abstand von der Mauer nach außen, l = quer (Straße l 0 und 1)
  var cur=[0,0,0,0,0,0,0,0],teile=[];
  var leg=function(s,sei,du,dl,gap,was){var z=s*2+sei,u0=cur[z];teile.push({s:s,sei:sei,u0:u0,du:du,dl:dl,was:was});cur[z]=u0+du+gap};
  var minZ=function(s){return cur[s*2]<=cur[s*2+1]?0:1};
  var cS=stink<2?cX:cY,lin=-cS,rec=Wi-1-cS,regL=[lin,-5],regR=[6,rec],regW=Math.max(0,regL[1]-regL[0]+1)+Math.max(0,regR[1]-regR[0]+1),Ue=0;
  if(buden){if(!regW)return null;Ue=Math.max(2,Math.ceil(buden*2.6/regW))+zug;cur[stink*2]=cur[stink*2+1]=1}
  gewerbe.forEach(function(x){var s0=minZ(stink);leg(stink,s0,Math.max(x.w,x.h),Math.min(x.w,x.h),1,{art:'gewerbe',x:x})});
  tote.forEach(function(x){leg(grab,minZ(grab),Math.max(x.w,x.h),Math.min(x.w,x.h),1,{art:'gewerbe',x:x})});
  for(var gb=0;gb<graeber;gb++)leg(grab,minZ(grab),1,1,gb%3===2?1:0,{art:'grab'});
  friedhof.forEach(function(x){leg(grab,minZ(grab),Math.max(x.w,x.h),Math.min(x.w,x.h),1,{art:'friedhof',x:x})});
  if(buden){var ab=Ue+2;cur[stink*2]=Math.max(cur[stink*2],ab);cur[stink*2+1]=Math.max(cur[stink*2+1],ab)}
  hoefe.forEach(function(h){var best=0;for(var z=1;z<8;z++)if(cur[z]<cur[best])best=z;leg(best>>1,best&1,h.w,h.h,1,{art:'hof',h:h})});
  var R=4;cur.forEach(function(c){if(c+2>R)R=c+2});if(opt.zeilen)opt.zeilen.push(cur.slice());if(buden&&Ue+3>R)R=Ue+3;
  var W=Wi+2*R,Z=new Array(W*W).fill('g'),belegt=new Uint8Array(W*W),at=function(i,j){return j*W+i},keinBaum=new Uint8Array(W*W);
  for(var j=0;j<Wi;j++)for(var i=0;i<Wi;i++)Z[at(i+R,j+R)]=E.Z[j*Wi+i];
  var verschieben=function(o){var q=JSON.parse(JSON.stringify(o));q.i+=R;q.j+=R;if(q.tuer){q.tuer[0]+=R;q.tuer[1]+=R}return q};
  var bauten=E.bauten.map(verschieben),dinge=E.dinge.map(verschieben),gesetzt=JSON.parse(JSON.stringify(E.gesetzt));
  for(var q0=0;q0<bauten.length;q0++){var b0=bauten[q0];for(var y0=b0.j;y0<b0.j+b0.h;y0++)for(var x0=b0.i;x0<b0.i+b0.w;x0++)belegt[at(x0,y0)]=1}
  for(var y1=R;y1<R+Wi;y1++)for(var x1=R;x1<R+Wi;x1++)keinBaum[at(x1,y1)]=1;
  // Seite s: Feld (u, l) → (i, j); Richtungen nach außen und quer
  var zelle=function(s,u,l){var L=R+(s<2?cX:cY)+l;return s===0?[L,R+Wi+u]:s===1?[L,R-1-u]:s===2?[R+Wi+u,L]:[R-1-u,L]};
  var quer=function(s){return s<2?[1,0]:[0,1]};
  var rechteck=function(s,u0,du,l0,dl){var a=zelle(s,u0,l0),b=zelle(s,u0+du-1,l0+dl-1);return{i:Math.min(a[0],b[0]),j:Math.min(a[1],b[1]),w:Math.abs(a[0]-b[0])+1,h:Math.abs(a[1]-b[1])+1}};
  var hin=function(o,r,c){for(var y=r.j;y<r.j+r.h;y++)for(var x=r.i;x<r.i+r.w;x++){Z[at(x,y)]=c;keinBaum[at(x,y)]=1}};
  var bau=function(id,rolle,r,tuer,kl){var u=rausch(r.i,r.j,seed+31),sh=rolle==='shack',gr=rolle==='grab';kl=kl||(sh?'clay-wood':gr?'marble':basis.klasse);
   var satz=!sh&&!gr&&!ST&&B.satz&&kl===basis.klasse?B.satz:null,schmal=Math.min(r.w,r.h)<2;
   for(var y=r.j;y<r.j+r.h;y++)for(var x=r.i;x<r.i+r.w;x++){belegt[at(x,y)]=1;keinBaum[at(x,y)]=1;Z[at(x,y)]='g'}
   bauten.push({rolle:rolle,id:id,i:r.i,j:r.j,w:r.w,h:r.h,g:sh||gr||rolle==='hof'?1:stock(id,g,u,r.w,r.h),klasse:kl,dach:sh||gr||schmal?'flach':basis.dach,
    achse:r.w>r.h?'i':r.h>r.w?'j':(u<.5?'i':'j'),wand:kl===basis.klasse&&!sh&&!satz?basis.wand:null,dachR:sh?HOLZ:kl===basis.klasse&&!satz?basis.dachR:null,tuer:tuer,satz:satz})};
  // Tür eines Stücks an der Straße: links der Straße zur Querrichtung +, rechts −
  var anStrasse=function(t,du0,dl0,u1){var q=quer(t.s),um=u1!=null?u1:t.u0+(du0>>1);if(t.sei===0){var c=zelle(t.s,um,-1);return[c[0],c[1],q[0],q[1]]}var c2=zelle(t.s,um,2);return[c2[0],c2[1],-q[0],-q[1]]};
  // Ausfallstraßen bis zum Bildrand
  for(var s=0;s<4;s++)for(var u=0;u<R;u++)for(var l=0;l<2;l++){var c=zelle(s,u,l);Z[at(c[0],c[1])]='s';keinBaum[at(c[0],c[1])]=1}
  teile.forEach(function(t){var l0=t.sei===0?-t.dl:2,r=rechteck(t.s,t.u0,t.du,l0,t.dl),w=t.was;
   if(w.art==='gewerbe'){bau(w.x.id,'bau',r,anStrasse(t,t.du,t.dl));gesetzt[w.x.id]=(gesetzt[w.x.id]|0)+1}
   else if(w.art==='grab'){bau('grab','grab',r,anStrasse(t,1,1))}
   else if(w.art==='friedhof'){gesetzt.cemetery=(gesetzt.cemetery|0)+1;hin(null,r,'e');
    // Grabhäuschen im Raster, Wege dazwischen; Zugang von der Straße über die Reihe am Rand
    for(var y=r.j;y<r.j+r.h;y++)for(var x=r.i;x<r.i+r.w;x++){var dx=x-r.i,dy=y-r.j;if(dx%2===1&&dy%2===1&&dx<r.w-1&&dy<r.h-1)bau('grab','grab',{i:x,j:y,w:1,h:1},[x,y,0,-1])}}
   else if(w.art==='hof'){var h=w.h,hw=Math.min(2,t.dl),hl=Math.min(2,t.du),hu=t.u0+((t.du-hl)>>1),hl0=t.sei===0?-hw:2,hr=rechteck(t.s,hu,hl,hl0,hw);
    var D0=D.G[h.id],herde=D0&&D0.gruppe==='vieh',hain=HAIN[h.id];hin(null,r,hain?'g':herde?'p':'f');
    if(hain)for(var y2=r.j;y2<r.j+r.h;y2++)for(var x2=r.i;x2<r.i+r.w;x2++)if(((x2+y2)&1)===0)dinge.push({id:hain,i:x2,j:y2,rolle:h.id});
    bau(h.id,'hof',hr,anStrasse(t,hl,hw,hu+(hl>>1)));if(hain)dinge=dinge.filter(function(d){return !(d.rolle===h.id&&d.i>=hr.i&&d.i<hr.i+hr.w&&d.j>=hr.j&&d.j<hr.j+hr.h)});
    if(h.liste)gesetzt[h.id]=(gesetzt[h.id]|0)+1}});
  // Elendsbuden als wilder Haufen an der Mauer vor dem Stinktor: Gasse u = 0 an der Mauer, darüber Schlamm; jede Bude hält eine Tür frei, alles bleibt zusammenhängend
  if(buden){var reg=[],regId=new Int32Array(W*W).fill(-1),frei=[];
   for(var lx=lin;lx<=rec;lx++){if(lx===0||lx===1)continue;var c1=zelle(stink,0,lx);if(!belegt[at(c1[0],c1[1])]){Z[at(c1[0],c1[1])]='e';keinBaum[at(c1[0],c1[1])]=1}}
   [regL,regR].forEach(function(g2){for(var l2=g2[0];l2<=g2[1];l2++)for(var u2=1;u2<=Ue;u2++){var c3=zelle(stink,u2,l2),k3=at(c3[0],c3[1]);if(belegt[k3])continue;Z[k3]='e';keinBaum[k3]=1;regId[k3]=reg.length;reg.push(k3)}});
   var tuerRes=new Uint8Array(W*W),bude=new Uint8Array(W*W),ord=reg.slice();for(var o1=ord.length-1;o1>0;o1--){var o2=Math.floor(ra()*(o1+1)),tt=ord[o1];ord[o1]=ord[o2];ord[o2]=tt}
   var istE=function(k){return Z[k]==='e'&&!belegt[k]&&!bude[k]},NB=[[1,0],[-1,0],[0,1],[0,-1]];
   var zusammen=function(){var seen=new Uint8Array(W*W),st=[],n=0,soll=0;for(var a=0;a<reg.length;a++)if(istE(reg[a]))soll++;
    for(var lx2=lin;lx2<=rec;lx2++){if(lx2===0||lx2===1)continue;var c4=zelle(stink,0,lx2),k4=at(c4[0],c4[1]);if(istE(k4)&&!seen[k4]){seen[k4]=1;st.push(k4)}}
    while(st.length){var q=st.pop();if(regId[q]>=0)n++;var qi=q%W,qj=(q/W)|0;for(var d=0;d<4;d++){var xi=qi+NB[d][0],yj=qj+NB[d][1];if(xi<0||yj<0||xi>=W||yj>=W)continue;var kk=at(xi,yj);if(!seen[kk]&&istE(kk)&&(regId[kk]>=0||Z[kk]==='e')){seen[kk]=1;st.push(kk)}}}
    return n===soll};
   var gesetztB=0;for(var o3=0;o3<ord.length&&gesetztB<buden;o3++){var k5=ord[o3];if(tuerRes[k5]||bude[k5])continue;var i5=k5%W,j5=(k5/W)|0,dd=[];
    for(var d5=0;d5<4;d5++){var xi5=i5+NB[d5][0],yj5=j5+NB[d5][1];if(xi5<0||yj5<0||xi5>=W||yj5>=W)continue;var kn=at(xi5,yj5);if(istE(kn))dd.push([kn,NB[d5]])}
    if(!dd.length)continue;var wahl=dd[Math.floor(ra()*dd.length)],warRes=tuerRes[wahl[0]];bude[k5]=1;tuerRes[wahl[0]]=1;
    if(!zusammen()){bude[k5]=0;tuerRes[wahl[0]]=warRes;continue}
    frei.push([i5,j5,wahl[1]]);gesetztB++}
   if(gesetztB<buden)return null;
   frei.forEach(function(f){bude[at(f[0],f[1])]=0;bau('shack','shack',{i:f[0],j:f[1],w:1,h:1},[f[0],f[1],f[2][0],f[2][1]])});
   gesetzt.shack=(gesetzt.shack|0)+buden;
   reg.forEach(function(k6){if(belegt[k6]||tuerRes[k6])return;var i6=k6%W,j6=(k6/W)|0;if(rausch(i6,j6,seed+43)<.1)dinge.push({id:rausch(i6,j6,seed+44)<.15?'leiche':'lager-platz',i:i6,j:j6})})}
  // Landschaft im Ring: Bäume des Bioms wie in den Höfen innen
  for(var q7=0;q7<W*W;q7++){if(keinBaum[q7]||belegt[q7]||Z[q7]!=='g')continue;var i7=q7%W,j7=(q7/W)|0;if(rausch(i7,j7,seed+41)<B.dichte*.6+.04)dinge.push({id:B.baeume[Math.floor(rausch(i7,j7,seed+42)*B.baeume.length)],i:i7,j:j7})}
  var tor=zelle(0,R-1,0);
  return{W:W,Z:Z,bauten:bauten,dinge:dinge,tor:{i:tor[0],j:tor[1]},nb:E.nb,gesetzt:gesetzt,vielfalt:E.vielfalt,
   aussen:{ring:R,innenW:Wi,stinktor:SEITE[stink],graebertor:SEITE[grab],buden:buden,graeber:graeber,hoefe:hoefe.length,hoefeExtra:nx>0?hoefe.filter(function(h){return !h.liste}).length:0,elend:Ue}};}
 function anlegen(nb){
  var r=rng(hashT([seed,art,opt.biom,opt.stil||'',einw,nb].join('|'))),a,b,k;
  // N6b2c4a1 (Thomas 22.11.2026, ab Marktflecken): Blockmaß je Spalte und Zeile ±2 (mind. 3), Kreuzung außermittig, etwa jede 4. Gasse krumm oder schräg.
  // opt.vielfalt === false = festes Raster wie N6b2c2. Weiler und Dörfer folgen mit N6b2c4b.
  var viel=g>=MAUER_AB&&!elend&&opt.vielfalt!==false,rv=rng(hashT([seed,art,einw,nb,'vielfalt'].join('|')));
  var cw=[],rh=[],hx=nb>>1,hy=nb>>1;for(a=0;a<nb;a++){cw.push(Bm);rh.push(Bm)}
  if(viel){var lo=Math.max(3,Bm-2),hi=Bm+2,zuf=function(){return lo+Math.floor(rv()*(hi-lo+1))};
   for(a=0;a<nb;a++){cw[a]=zuf();rh[a]=zuf()}
   var su=function(L){var s=0;L.forEach(function(v){s+=v});return s},sc=su(cw),sr=su(rh);   // gleiche Summe: der Plan bleibt quadratisch
   for(var sw=0;sc!==sr&&sw<4000;sw++){var kl=sc<sr?cw:rh,gr=sc<sr?rh:cw,q=Math.floor(rv()*nb);if(kl[q]<hi){kl[q]++;if(sc<sr)sc++;else sr++}else if(gr[q]>lo){gr[q]--;if(sc>sr)sc--;else sr--}}
   var wahl=[];for(a=Math.max(1,Math.round(nb*.3));a<=Math.min(nb-1,Math.round(nb*.7));a++)if(a*2!==nb)wahl.push(a);
   if(wahl.length){hx=wahl[Math.floor(rv()*wahl.length)];hy=wahl[Math.floor(rv()*wahl.length)]}}
  var X0=[],Y0=[],p=off;for(a=0;a<nb;a++){if(a===hx)p++;X0.push(p);p+=cw[a]+1}p=off;for(b=0;b<nb;b++){if(b===hy)p++;Y0.push(p);p+=rh[b]+1}
  var W=p-1+off,cA=X0[hx]-2,cB=Y0[hy]-2;
  var Z=new Array(W*W).fill('g'),belegt=new Uint8Array(W*W),bauten=[],dinge=[],gesetzt={};
  var at=function(i,j){return j*W+i};
  // Gassen überall innen, Blöcke darüber als Hof; Ring an der Mauer; Mauer 2 breit mit 4 Toren in der Achse der Hauptstraßen
  for(var j=0;j<W;j++)for(var i=0;i<W;i++){var d=Math.min(i,j,W-1-i,W-1-j);if(d<wall){var tor=(i===cA||i===cA+1)||(j===cB||j===cB+1);Z[at(i,j)]=tor?'s':'g';belegt[at(i,j)]=1;
    if(!tor)bauten.push({rolle:'mauer',i:i,j:j,w:1,h:1,klasse:basis.klasse==='clay-wood'&&g>=5?'brick':basis.klasse,dach:'flach',achse:'i',wand:basis.wand,dachR:STEIN})}
   else Z[at(i,j)]=elend?'e':'s'}
  var cx=W/2,cy=W/2,bl=[];
  var bw=function(a0,k){return X0[a0+k-1]+cw[a0+k-1]-X0[a0]},bh=function(b0,k){return Y0[b0+k-1]+rh[b0+k-1]-Y0[b0]};
  for(a=0;a<nb;a++)for(b=0;b<nb;b++)bl.push({a:a,b:b,x:X0[a],y:Y0[b],w:cw[a],h:rh[b],d:Math.hypot(X0[a]+cw[a]/2-cx,Y0[b]+rh[b]/2-cy)+r()*P1*.6,frei:null,rest:cw[a]*rh[b]});
  var offen=function(q){q.frei=new Uint8Array(q.w*q.h).fill(1);for(var y=0;y<q.h;y++)for(var x=0;x<q.w;x++)Z[at(q.x+x,q.y+y)]=elend?'e':'g'};
  // Monumente in Gruppen aus k × k Blöcken (nicht über die Hauptstraße), nahe der Mitte; mit ungleichen Blöcken notfalls eine Gruppe größer
  var gruppen=[],benutzt={},fest={};
  var passt=function(it,gw,gh){return it.w<=gw&&it.h<=gh||it.h<=gw&&it.w<=gh};
  for(var m=0;m<mono.length;m++){var it=mono[m],k0=grpK(it),best=null,bd=1e9,bk=0;
   for(var q=0;q<bl.length;q++){var s=bl[q],kk=0;
    for(k=k0;k<=k0+(viel?1:0)&&!kk;k++){if(s.a+k>nb||s.b+k>nb)continue;if((s.a<hx)!==(s.a+k-1<hx)||(s.b<hy)!==(s.b+k-1<hy))continue;if(passt(it,bw(s.a,k),bh(s.b,k)))kk=k}
    if(!kk)continue;var frei=true;for(var u=0;u<kk&&frei;u++)for(var v=0;v<kk&&frei;v++)if(benutzt[(s.a+u)*nb+s.b+v])frei=false;if(!frei)continue;
    var dd=Math.hypot(s.x+bw(s.a,kk)/2-cx,s.y+bh(s.b,kk)/2-cy)+r()*P1;if(dd<bd){bd=dd;best=s;bk=kk}}
   if(!best)return null;for(var u2=0;u2<bk;u2++)for(var v2=0;v2<bk;v2++)benutzt[(best.a+u2)*nb+best.b+v2]=1;
   for(var f2=0;f2<bk;f2++){fest['c'+(best.a-1)+'_'+(best.b+f2)]=1;fest['c'+(best.a+bk-1)+'_'+(best.b+f2)]=1;fest['r'+(best.b-1)+'_'+(best.a+f2)]=1;fest['r'+(best.b+bk-1)+'_'+(best.a+f2)]=1}
   var gw2=bw(best.a,bk),gh2=bh(best.b,bk),grp={x:best.x,y:best.y,w:gw2,h:gh2,d:bd,rest:0,mono:true,it:it};gruppen.push(grp);if(!viel)platzieren(grp)}
  // Krumme und schräge Gassen: Verschiebung je Gasse und Block (Zeilengassen zuerst). Höchstens ±1 je Schritt, Blöcke bleiben mind. 3 breit,
  // an Monumenten gerade, an Kreuzungen nie gleichzeitig mit der Quergasse versetzt (sonst nur noch eine Ecke als Durchgang).
  var SC={},TR={};
  var sCol=function(k2,b2){return k2<0||k2>=nb-1||k2+1===hx?0:(SC[k2]?SC[k2][b2]:0)},tRow=function(k2,a2){return k2<0||k2>=nb-1||k2+1===hy?0:(TR[k2]?TR[k2][a2]:0)};
  var profil=function(L,lang,cap,frei2,fix){if(cap<1||rv()>=.32)return null;   // .32: dünne Blöcke bleiben gerade, so wird es insgesamt etwa jede 4. Gasse
   for(var vers=0;vers<6;vers++){var dir=rv()<.5?-1:1,schraeg=rv()<.5,ziel=1+Math.floor(rv()*Math.max(1,lang-1)),v=0,P=[],t2,bad=false,nz=false;
    for(t2=0;t2<lang&&!bad;t2++){if(t2>0&&frei2(t2-1)){if(schraeg?t2>=ziel&&Math.abs(v)<cap:t2===ziel)v+=dir}P.push(v);if(v)nz=true;if(fix(t2)&&v!==0)bad=true}
    if(!bad&&nz)return P}return null};
  if(viel){
   for(k=0;k<nb-1;k++){if(k+1===hy)continue;var capR=Math.min(2,Math.floor((Math.min(rh[k],rh[k+1])-3)/2));
    TR[k]=profil(TR,nb,capR,function(){return true},function(a3){return fest['r'+k+'_'+a3]})}
   for(k=0;k<nb-1;k++){if(k+1===hx)continue;var capC=Math.min(2,Math.floor((Math.min(cw[k],cw[k+1])-3)/2));
    SC[k]=profil(SC,nb,capC,function(b3){return tRow(b3,k)===tRow(b3,k+1)},function(b3){return fest['c'+k+'_'+b3]})}}
  bl.forEach(function(s){s.x=X0[s.a]+sCol(s.a-1,s.b);s.w=X0[s.a]+cw[s.a]+sCol(s.a,s.b)-s.x;s.y=Y0[s.b]+tRow(s.b-1,s.a);s.h=Y0[s.b]+rh[s.b]+tRow(s.b,s.a)-s.y;s.rest=s.w*s.h});
  if(viel)gruppen.forEach(platzieren);
  function platzieren(grp){offen(grp);var it=grp.it,gw2=grp.w,gh2=grp.h,rot=r()<.5;if(!(rot?it.h<=gw2&&it.w<=gh2:it.w<=gw2&&it.h<=gh2))rot=!rot;
   var mw=rot?it.h:it.w,mh=rot?it.w:it.h,px=grp.x+((gw2-mw)>>1),py=grp.y+((gh2-mh)>>1);
   for(var y1=0;y1<gh2;y1++)for(var x1=0;x1<gw2;x1++){var X=grp.x+x1,Y=grp.y+y1,inM=X>=px&&X<px+mw&&Y>=py&&Y<py+mh,
     mitte=(x1===(gw2>>1)||x1===((gw2-1)>>1)||y1===(gh2>>1)||y1===((gh2-1)>>1));
    if(inM||mitte){grp.frei[y1*gw2+x1]=0;if(!inM)Z[at(X,Y)]='o'}else{Z[at(X,Y)]='o';grp.rest++}}
   setzen(it,px,py,mw,mh,null)}
  var bloecke=bl.filter(function(s){return !benutzt[s.a*nb+s.b]});bloecke.forEach(offen);bloecke=bloecke.concat(gruppen);bloecke.sort(function(p,q){return p.d-q.d});
  // Übrige Gebäude: erstes freies Randstück im innersten Block (Zonen); Tür zur Gasse an der Seite, die am Blockrand liegt
  // Gleichmäßig füllen: zuerst nur bis zum Anteil je Block (alle Blöcke behalten einen Hof), dann frei; Reihenfolge der Blöcke nach Abstand = Zonen
  var vorn=0,summe=0,platzAll=0;rest.forEach(function(it){summe+=it.w*it.h});bloecke.forEach(function(s){s.voll=0;platzAll+=s.rest});var anteil=Math.min(1,summe/Math.max(1,platzAll)*1.1+.05);
  for(var n=0;n<rest.length;n++){var it2=rest[n],ok=false,dreh=r()<.5;
   while(vorn<bloecke.length&&bloecke[vorn].rest<=0)vorn++;
   for(var gang=0;gang<2&&!ok;gang++)for(var q2=vorn;q2<bloecke.length&&!ok;q2++){var s2=bloecke[q2],fa=it2.w*it2.h;if(s2.rest<fa)continue;
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
  return{W:W,Z:Z,bauten:bauten,dinge:dinge,tor:{i:cA,j:W-1},achse:{i:cA,j:cB},nb:nb,gesetzt:gesetzt,
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
 var E2=ergebnis,P={format:'at3-stadtplan',art:art,g:g,einw:einw,biom:opt.biom,stil:opt.stil||'',seed:seed,W:E2.W,block:Bm,nb:E2.nb,zellen:E2.Z.join(''),bauten:E2.bauten,dinge:E2.dinge,
  tor:E2.tor,gesetzt:E2.gesetzt,vielfalt:E2.vielfalt||null,gespiegelt:false,basis:basis,feld:B.feld,aussen:E2.aussen||null};
 if(F!==1)P=skalieren(P,F);
 if(rng(hashT([seed,art,einw,'sp'].join('|')))()<.5)P=spiegeln(P);
 return P}
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
 for(J=0;J<N;J++)for(I=0;I<N;I++)z+=P.zellen.charAt(Math.min(W-1,Math.floor(J/F))*W+Math.min(W-1,Math.floor(I/F)));
 var Q=JSON.parse(JSON.stringify(P));Q.W=N;Q.planW=W;Q.mass=F;Q.zellen=z;
 Q.bauten=P.bauten.map(function(b){var o=JSON.parse(JSON.stringify(b)),i=r(b.i),j=r(b.j),w=r(b.i+b.w)-i,h=r(b.j+b.h)-j;if(b.rund){w=h=Math.min(w,h)}
  o.i=i;o.j=j;o.w=w;o.h=h;if(b.tuer){var di=b.tuer[2],dj=b.tuer[3];o.tuer=dj>0?[i+(w>>1),j+h-1,0,1]:dj<0?[i+(w>>1),j,0,-1]:di>0?[i+w-1,j+(h>>1),1,0]:[i,j+(h>>1),-1,0]}return o});
 Q.dinge=P.dinge.map(function(d){var o=JSON.parse(JSON.stringify(d));o.i=r(d.i);o.j=r(d.j);return o});
 Q.tor={i:r(P.tor.i),j:r(P.tor.j+1)-1};return Q}
function spiegeln(P){var W=P.W,z='',i,j;for(j=0;j<W;j++)for(i=0;i<W;i++)z+=P.zellen[i*W+j];
 var N=JSON.parse(JSON.stringify(P));N.zellen=z;N.gespiegelt=!P.gespiegelt;
 N.bauten=P.bauten.map(function(b){var o=JSON.parse(JSON.stringify(b));o.i=b.j;o.j=b.i;o.w=b.h;o.h=b.w;o.achse=b.achse==='i'?'j':'i';if(b.tuer)o.tuer=[b.tuer[1],b.tuer[0],b.tuer[3],b.tuer[2]];return o});
 N.dinge=P.dinge.map(function(d){var o=JSON.parse(JSON.stringify(d));o.i=d.j;o.j=d.i;return o});N.tor={i:P.tor.j,j:P.tor.i};
 if(N.aussen){N.aussen.stinktor=SPIEGEL[N.aussen.stinktor];N.aussen.graebertor=SPIEGEL[N.aussen.graebertor]}return N}
// Drehen um 90° (Blick von der nächsten Seite, für First Person): Zelle (i, j) → (W−1−j, i), Richtung (di, dj) → (−dj, di)
function drehen(P){var W=P.W,z=new Array(W*W),i,j;for(j=0;j<W;j++)for(i=0;i<W;i++)z[i*W+(W-1-j)]=P.zellen[j*W+i];
 var N=JSON.parse(JSON.stringify(P));N.zellen=z.join('');
 N.bauten=P.bauten.map(function(b){var o=JSON.parse(JSON.stringify(b));o.i=W-b.j-b.h;o.j=b.i;o.w=b.h;o.h=b.w;o.achse=b.achse==='i'?'j':'i';
  if(b.tuer)o.tuer=[W-1-b.tuer[1],b.tuer[0],-b.tuer[3],b.tuer[2]];return o});
 N.dinge=P.dinge.map(function(d){var o=JSON.parse(JSON.stringify(d));o.i=W-1-d.j;o.j=d.i;return o});N.tor={i:W-1-P.tor.j,j:P.tor.i};return N}

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
var BODEN_ID={s:null,o:null,m:'bk-marmor-boden',f:null,w:'boden-wasser',e:'boden-erde',p:'boden-gras',x:'boden-fels'};
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
     RI[k]=i;RJ[k]=j;RW[k]=w;RH[k]=h;X0[k]=(i-j-h)*32;X1[k]=(i+w-j)*32;Y0[k]=(i+j)*16-hoch(b);Y1[k]=(i+w+j+h)*16;
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
 var gmax=1;P.bauten.forEach(function(b){if((b.g|0)>gmax)gmax=b.g|0});var TOP=176+HOCH_PLUS+(gmax-1)*GH;   // Platz oben für Geschosse (N6b2b1)
 var Zw=WT*64+64,Zh=WT*32+TOP+8,OX=WT*32+32,OY=TOP;
 // Bildlage eines Felds (i, j) im Plan (Umland hat negative bzw. zu große Zahlen): Ecke oben = ((i−j)·32, (i+j)·16)
 var bx=function(i,j){return OX+(i-j)*32},by=function(i,j){return OY+(i+U+j+U)*16};
 var weg=P.basis&&KURZ[P.basis.klasse]?'bk-'+KURZ[P.basis.klasse]+'-boden':'boden-weg';
 var bodenId=function(i,j){var innen=i>=0&&j>=0&&i<W&&j<W,c=innen?P.zellen.charAt(j*W+i):'g';
  if(c==='g'){var l=B.boden;return l[Math.floor(rausch(i,j,P.seed+1)*l.length*(l.length>1?.75:1))%l.length]}
  if(c==='s')return B.weg;if(c==='o')return weg;if(c==='f')return P.feld||'bk-feld';return BODEN_ID[c]||'boden-gras'};
 var O3=null,L=[],el=[],n=0,stufe=0,qs=-U,qi=-U,qk=0,uj=-U,ui=-U;
 // Liste füllen, auf Wunsch in Schritten: aus() → true, wenn der Zeitanteil um ist (Kachelbauer); bauer() füllt am Stück wie bisher
 var fuellen=function(aus){var c=0;while(stufe<5){
   if(stufe===0){for(;qs<=2*(W-1)+U;qs++,qi=-U){for(;qi<W+U;qi++){var j=qs-qi;if(j<-U||j>=W+U)continue;L.push({k:0,id:bodenId(qi,j),X:bx(qi,j),Y:by(qi,j)+16});
      if((++c&255)===0&&aus&&aus()){qi++;return false}}}stufe=1}
   else if(stufe===1){P.bauten.forEach(function(b){el.push({t:b.i+b.j+(b.w+b.h)/2,n:n++,b:b})});P.dinge.forEach(function(d){el.push({t:d.i+d.j+1.02,n:n++,d:d})});stufe=U?2:3;if(aus&&aus())return false}
   else if(stufe===2){for(;uj<W+U;uj++,ui=-U){for(;ui<W+U;ui++){if(ui>=0&&uj>=0&&ui<W&&uj<W)continue;
      if(rausch(ui,uj,P.seed+21)<B.dichte*(1+.15*Math.max(ui<0?-ui:ui-W+1,uj<0?-uj:uj-W+1)))el.push({t:ui+uj+1.02,n:n++,d:{id:B.baeume[Math.floor(rausch(ui,uj,P.seed+22)*B.baeume.length)],i:ui,j:uj}})}}stufe=3}
   else if(stufe===3){if(!O3)O3=ordner(el);if(!O3.weiter(aus))return false;el=O3.liste;O3=null;stufe=4;if(aus&&aus())return false}
   else{for(;qk<el.length;qk++){var e=el[qk];if(e.d)L.push({k:1,id:e.d.id,X:bx(e.d.i,e.d.j),Y:by(e.d.i,e.d.j)+16});
      else{var b=e.b,ox=b.rund?b.i-1:b.i,oy=b.rund?b.j-1:b.j,fw=b.w,fh=b.h;if(b.rund){var R=bk.bilde('rund',b.w,b.w,b.klasse);fw=R.w;fh=R.h}L.push({k:2,b:b,X:bx(ox,oy),Y:by(ox,oy),fw:fw,fh:fh})}
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
function kennungen(P){var bk=BK(),s={},B=BIOME[P.biom];B.boden.concat([B.weg,P.feld||'bk-feld','boden-wasser','boden-erde','boden-gras','boden-fels','bk-marmor-boden']).forEach(function(i){s[i]=1});
 bk.KLASSEN.forEach(function(k){s['bk-'+k.kurz+'-boden']=1});B.baeume.forEach(function(i){s[i]=1});for(var h in HAIN)s[HAIN[h]]=1;P.dinge.forEach(function(d){s[d.id]=1});return Object.keys(s)}

var SB={TOTE:TOTE,HOF_JE:HOF_JE,GRAB_JE:GRAB_JE,GRAB_MAX:GRAB_MAX,elemente:elemente,kachelBauer:kachelBauer,HOCH:HOCH,hoch:hoch,skalieren:skalieren,ARTEN:ARTEN,BIOME:BIOME,STILE:STILE,plan:plan,blockMass:blockMass,setzeDaten:setzeDaten,PROBE_EINW:PROBE_EINW,ART_G:ART_G,spiegeln:spiegeln,drehen:drehen,bauer:bauer,malen:malen,kacheln:kacheln,zaehle:zaehle,kennungen:kennungen,hashT:hashT};
if(typeof module!=='undefined'&&module.exports)module.exports=SB;else G.AT3_STADTBILD=SB;
})(typeof window!=='undefined'?window:globalThis);
