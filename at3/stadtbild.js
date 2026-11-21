// WAS DIE DATEI TUT: Stadtbilder von Arena Theory 3.0 (Schritt N6a, Entscheidungen Thomas 21.11.2026: Bauplan + Teile, Flächen wie AT3_NEUAUSRICHTUNG 5.2,
// Bild im Bildkern bauen statt fertige Bilder speichern, 12 Baustile als Achse). Gemeinsam für Master-Editor (Reiter „Stadtbilder“) und später Bildkern (N7a);
// läuft im Browser und in Node.
// 1) plan(): aus Siedlungsart × Biom × Baustil × Seed × Zusatzteilen ein Bauplan (Felder): Boden je Feld, Häuser als Rechtecke mit Bauklasse, Dach, Firstachse,
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

// Siedlungsarten (Fläche wie 5.2, daten/ortsbilder.json): Dichte der Häuser, Gassenabstand, Mauerringe, Standard-Zusatzteile.
var ARTEN={
 homestead:{W:2,dichte:0,gasse:0,ringe:0,std:['fields']},
 hamlet:{W:4,dichte:.4,gasse:0,ringe:0,std:['fields','pastures']},
 village:{W:6,dichte:.55,gasse:0,ringe:0,std:['market-square','temple','fields']},
 'market-town':{W:9,dichte:.75,gasse:4,ringe:1,std:['wall','gate','market-square','temple','bath']},
 city:{W:13,dichte:.85,gasse:4,ringe:1,std:['wall','gate','forum','market-square','temple','theatre','arena','slum-quarter']},
 'great-city':{W:18,dichte:.88,gasse:4,ringe:2,std:['wall','gate','palace','forum','market-square','temple','theatre','arena','barracks','granary','slum-quarter']},
 slum:{W:6,dichte:.8,gasse:0,ringe:0,std:[]}};
// Zusatzteile, die das Werkzeug in N6a als Skizze setzen kann (die übrigen aus ortsbilder.json kommen mit N6e).
var ZUSATZ=['wall','gate','market-square','temple','forum','theatre','arena','palace','bath','granary','barracks','cemetery','harbour','slum-quarter','fields','pastures',
 'vineyards','olive-grove','ruins'];
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
function plan(opt){
 var A=ARTEN[opt.art];if(!A)throw new Error('Unbekannte Siedlungsart: '+opt.art);var B=BIOME[opt.biom];if(!B)throw new Error('Unbekanntes Biom: '+opt.biom);
 var ST=opt.stil?STILE[opt.stil]:null;if(opt.stil&&!ST)throw new Error('Unbekannter Baustil: '+opt.stil);
 var F=opt.mass==null?BK().MASS:+opt.mass,pw=opt.probeW?Math.round(opt.probeW/F):0,W=pw>A.W?pw:A.W,seed=opt.seed>>>0,r=rng(hashT([seed,opt.art,opt.biom,opt.stil||''].join('|'))),zus={};
 (opt.zusatz||A.std).forEach(function(z){if(ZUSATZ.indexOf(z)>=0)zus[z]=1});
 if(zus.gate&&!zus.wall)delete zus.gate;if(W<9){delete zus.wall;delete zus.gate}
 var basis={klasse:(ST||B).klasse,dach:(ST||B).dach,wand:(ST||B).wand,dachR:(ST||B).dachR};
 var Z=new Array(W*W).fill('g'),belegt=new Uint8Array(W*W),bauten=[],dinge=[];
 var at=function(i,j){return i>=0&&j>=0&&i<W&&j<W?j*W+i:-1};
 var setz=function(i,j,c){var k=at(i,j);if(k>=0)Z[k]=c};
 var frei=function(i,j,w,h,rand){for(var y=j;y<j+h;y++)for(var x=i;x<i+w;x++){var k=at(x,y);if(k<0||belegt[k]||(Z[k]!=='g'&&Z[k]!=='e'))return false;
  if(rand&&(x<rand||y<rand||x>=W-rand||y>=W-rand))return false}return true};
 var nimm=function(i,j,w,h,c){for(var y=j;y<j+h;y++)for(var x=i;x<i+w;x++){var k=at(x,y);belegt[k]=1;if(c)Z[k]=c}};
 var c=W>>1,gi=Math.max(1,Math.min(W-2,c-(r()<.5?1:0))),innen=A.ringe?1:0,tor=null;
 // Hafen: Ostrand wird Wasser (vor der Mauer, dort keine Mauer)
 var hafen=!!zus.harbour&&W>=6,ost=W-(hafen?(W>=13?2:1):0);
 if(hafen)for(var j0=0;j0<W;j0++)for(var i0=ost;i0<W;i0++){setz(i0,j0,'w');belegt[at(i0,j0)]=1}
 // Mauerringe: Feldstücke 1 × 1 mit Flachdach, Tor in der Südkante (zur Straße)
 var mauer=function(k){var a=k,b=Math.min(ost,W)-1-k,bt=W-1-k,i,j,stueck=function(i,j){var q=at(i,j);if(q<0||belegt[q])return;if(i===gi&&j===bt){Z[q]='s';belegt[q]=1;return}
   belegt[q]=1;Z[q]='g';bauten.push({rolle:'mauer',i:i,j:j,w:1,h:1,klasse:basis.klasse==='clay-wood'&&W>=13?'brick':basis.klasse,dach:'flach',achse:'i',wand:basis.wand,dachR:STEIN})};
  for(i=a;i<=b;i++){stueck(i,a);stueck(i,bt)}for(j=a+1;j<bt;j++){stueck(a,j);if(!hafen)stueck(b,j)}return {i:gi,j:bt}};
 if(zus.wall){tor=mauer(0);if(A.ringe>1)mauer(Math.floor(W*.22))}
 // Gassen: Hauptgasse vom Tor zur Mitte, Quergasse, bei Märkten und Städten ein versetztes Raster
 var gasse=function(i,j){var q=at(i,j);if(q<0||belegt[q])return;Z[q]='s'};
 if(W>=4){for(var j1=W-1-(zus.wall?0:0);j1>=c-1;j1--)gasse(gi,j1)}
 if(W>=6)for(var i1=innen;i1<ost-innen;i1++)gasse(i1,c);
 if(!tor)tor={i:gi,j:W-1};
 // Besondere Bauten und Plätze: nahe am Wunschort, Lage aus dem Seed
 var suche=function(w,h,wi,wj,rand){var best=null,bd=1e9;for(var j=0;j<=W-h;j++)for(var i=0;i<=W-w;i++){if(!frei(i,j,w,h,rand))continue;
   var d=Math.abs(i+w/2-wi)+Math.abs(j+h/2-wj)+r()*1.5;if(d<bd){bd=d;best={i:i,j:j}}}return best};
 var ecke=function(){var a=r()*Math.PI*2,rr=W*.22;return[c+Math.cos(a)*rr,c+Math.sin(a)*rr]};
 var groesser=W>=13,riesig=W>=18,mittel=W>=9;
 var bau=function(rolle,w,h,klasse,dach,wo,extra){var p=suche(w,h,wo[0],wo[1],innen);if(!p)return null;nimm(p.i,p.j,w,h,null);
  var o={rolle:rolle,i:p.i,j:p.j,w:w,h:h,klasse:klasse,dach:dach,achse:w>=h?'i':'j',wand:klasse===basis.klasse?basis.wand:null,dachR:klasse===basis.klasse?basis.dachR:null};
  for(var k in extra||{})o[k]=extra[k];bauten.push(o);return o};
 var platz=function(rolle,w,h,zelle,wo){var p=suche(w,h,wo[0],wo[1],innen);if(!p)return null;nimm(p.i,p.j,w,h,zelle);return{i:p.i,j:p.j,w:w,h:h,rolle:rolle}};
 var edel=mittel?'marble':basis.klasse;
 if(zus.forum){var fo=platz('forum',3,3,'m',[c+.5,c-1.5]);if(fo)dinge.push({id:'markt-stand',i:fo.i+1,j:fo.j+1})}
 if(zus['market-square']){var mw=groesser?3:mittel?2:2,mh=groesser?3:mittel?3:2,mk=platz('market-square',mw,mh,'o',ecke());
  if(mk)for(var y2=mk.j;y2<mk.j+mh;y2++)for(var x2=mk.i;x2<mk.i+mw;x2++)if(rausch(x2,y2,seed)<.6)dinge.push({id:'markt-stand',i:x2,j:y2})}
 if(zus.palace)bau('palace',riesig?3:2,riesig?3:2,'marble','walm',[c-W*.2,c-W*.2]);
 if(zus.temple){var tw=W>=18?3:mittel?2:1;bau('temple',tw,mittel?2:1,edel,mittel?'walm':'sattel',ecke())}
 if(zus.theatre&&groesser)bau('theatre',riesig?4:3,riesig?4:3,edel,null,ecke(),{rund:true});
 if(zus.arena&&groesser)bau('arena',riesig?5:4,riesig?5:4,edel,null,ecke(),{rund:true});
 if(zus.bath&&W>=6)bau('bath',2,1,edel,'flach',ecke());
 if(zus.granary&&W>=6)bau('granary',2,2,basis.klasse,'sattel',ecke());
 if(zus.barracks&&W>=9)bau('barracks',3,2,basis.klasse,'sattel',[c,W*.8]);
 if(zus.cemetery&&W>=6){var ce=platz('cemetery',2,2,null,[W*.85,W*.15]);if(ce)for(var y3=ce.j;y3<ce.j+2;y3++)for(var x3=ce.i;x3<ce.i+2;x3++)dinge.push({id:'fels-block',i:x3,j:y3})}
 if(opt.art==='village')bau('tavern',2,2,basis.klasse,basis.dach,[c+1,c+1]);
 if(W<=6&&W>=4){var br=suche(1,1,c-.5+(r()-.5),c-.5,0);if(br){nimm(br.i,br.j,1,1,'s');dinge.push({id:'ware-water',i:br.i,j:br.j,rolle:'well'})}}
 if(zus.ruins){var ru=platz('ruins',2,1,'x',ecke());if(ru)dinge.push({id:'fels-block',i:ru.i,j:ru.j},{id:'fels-block',i:ru.i+1,j:ru.j})}
 // Gassenraster erst nach den großen Bauten (es weicht ihnen aus)
 if(A.gasse){var sh=Math.floor(r()*2);for(var gx=c%A.gasse+sh;gx<ost-innen;gx+=A.gasse)if(Math.abs(gx-gi)>1)for(var y1=innen;y1<W-innen;y1++)gasse(gx,y1);
  for(var gy=c%A.gasse+sh;gy<W-innen;gy+=A.gasse)if(Math.abs(gy-c)>1)for(var x1=innen;x1<ost-innen;x1++)gasse(x1,gy)}
 // Elendsviertel: Südwestecke (innen an der Mauer) bzw. die ganze Elendssiedlung
 var elend=opt.art==='slum',eck=zus['slum-quarter']&&W>=9?{i0:innen,i1:innen+Math.ceil(W*.3),j0:W-innen-Math.ceil(W*.3),j1:W-innen}:null;
 var imElend=function(i,j){return elend||(eck&&i>=eck.i0&&i<eck.i1&&j>=eck.j0&&j<eck.j1)};
 if(eck)for(var y4=eck.j0;y4<eck.j1;y4++)for(var x4=eck.i0;x4<eck.i1;x4++){var q4=at(x4,y4);if(!belegt[q4]&&Z[q4]==='g')Z[q4]='e'}
 if(elend)for(var q5=0;q5<W*W;q5++)if(Z[q5]==='g'||Z[q5]==='s')Z[q5]='e';
 // Felder, Weiden, Weinberge, Olivenhaine am Rand der offenen Orte (ummauerte Orte haben ihre Felder vor dem Tor, das zeigt N6e)
 var randFeld=function(i,j){return !zus.wall&&W>=2&&(i===0||j===0||i===ost-1||j===W-1)};
 // Häuser: Zellen in zufälliger Reihenfolge, an Gassen und Plätzen (in Weilern und Gehöften frei), Größe nach Art
 var zellen=[];for(var q6=0;q6<W*W;q6++)zellen.push(q6);for(var a6=zellen.length-1;a6>0;a6--){var b6=Math.floor(r()*(a6+1)),t6=zellen[a6];zellen[a6]=zellen[b6];zellen[b6]=t6}
 var anWeg=function(i,j,w,h){for(var y=j-1;y<=j+h;y++)for(var x=i-1;x<=i+w;x++){if(x>=i&&x<i+w&&y>=j&&y<j+h)continue;if((x<i||x>=i+w)&&(y<j||y>=j+h))continue;var k=at(x,y);if(k>=0&&/[som]/.test(Z[k]))return true}return false};
 var tuerVon=function(i,j,w,h){var S2=[[i+(w>>1),j+h-1,0,1,i+(w>>1),j+h],[i+w-1,j+(h>>1),1,0,i+w,j+(h>>1)],[i,j+(h>>1),-1,0,i-1,j+(h>>1)],[i+(w>>1),j,0,-1,i+(w>>1),j-1]];
  for(var k=0;k<4;k++){var q=at(S2[k][4],S2[k][5]);if(q>=0&&/[somep]/.test(Z[q]))return S2[k].slice(0,4)}return S2[0].slice(0,4)};
 var nurWiese=function(i,j,w,h){for(var y=j;y<j+h;y++)for(var x=i;x<i+w;x++)if(Z[at(x,y)]!=='g')return false;return true};   // Häuser nie ins Elendsviertel
 var haeuser=0,ziel=opt.art==='homestead'?1:opt.art==='hamlet'?3+Math.floor(r()*2):1e9;
 var MIN={homestead:1,hamlet:3,village:3,'market-town':6,city:12,'great-city':20,slum:5}[opt.art]||0;
 for(var pass=0;pass<3;pass++){var voll=pass>0;   // zweiter und dritter Durchgang ohne Dichte-Würfel, bis die Mindestzahl steht
 if(pass&&haeuser>=MIN)break;zellen.forEach(function(q){if(haeuser>=ziel)return;var i=q%W,j=(q/W)|0;if(belegt[q]||!/[ge]/.test(Z[q]))return;if(randFeld(i,j)&&W>=6&&!voll)return;
  var e=imElend(i,j),dicht=e?.8:A.dichte;if(W>=6&&!voll&&r()>dicht)return;var w=1,h=1,u=r();
  // Häuser 2 Felder tief, damit Sattel- und Walmdach einen First bekommen (1 Feld tief = flach); lange Häuser im Langhaus-Stil, Hütten im Elend 1 × 1
  if(!e&&W>=4){var lang=ST&&ST.lang?3:2;if(u<.45){w=2;h=2}else if(u<.75){w=lang;h=2}else{w=2;h=lang}}
  var tries=[[w,h],[2,2],[2,1],[1,2],[1,1]],ok=false;for(var tz=0;tz<tries.length&&!ok;tz++){if(frei(i,j,tries[tz][0],tries[tz][1],innen)&&(e||nurWiese(i,j,tries[tz][0],tries[tz][1]))&&(W<6||e||anWeg(i,j,tries[tz][0],tries[tz][1]))){w=tries[tz][0];h=tries[tz][1];ok=true}}
  if(!ok)return;
  if(e){var nb=0;[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){var k=at(i+d[0],j+d[1]);if(k>=0&&belegt[k]&&/[ge]/.test(Z[k]))nb++});if(nb>1||(nb===1&&r()<.6))return}   // Bretterbuden mit Lücken
  if(W<6){for(var y=j-1;y<=j+h;y++)for(var x=i-1;x<=i+w;x++){var k=at(x,y);if(k>=0&&belegt[k]&&!(x>=i&&x<i+w&&y>=j&&y<j+h)&&Z[k]==='g')return}}   // Weiler: Hütten mit Abstand
  nimm(i,j,w,h,null);haeuser++;
  var zentrum=W>=13&&!ST&&Math.abs(i+w/2-c)+Math.abs(j+h/2-c)<W*.28,kl=e?'clay-wood':zentrum?STUFE[basis.klasse]:basis.klasse;
  var satz=!e&&!ST&&B.satz&&kl===basis.klasse?B.satz:null;   // N6b: eigener Teilesatz des Bioms (fertig gemalt, kein Farbtausch)
  var u2=rausch(i,j,seed+31),gs=e||opt.stil==='tents'||W<9?1:opt.art==='market-town'?2:zentrum?1+(u2<.5?1:0):2+Math.floor(u2*3);   // N6b2b1: Bürgerhaus 2, Mietshaus 2–4, Domus 1–2
  if(Math.min(w,h)<2)gs=Math.min(gs,2);
  bauten.push({rolle:e?'shack':'house',i:i,j:j,w:w,h:h,g:gs,klasse:kl,dach:e?'flach':basis.dach,achse:w>h?'i':h>w?'j':(r()<.5?'i':'j'),wand:kl===basis.klasse&&!e&&!satz?basis.wand:null,dachR:kl===basis.klasse&&!e&&!satz?basis.dachR:e?HOLZ:null,tuer:tuerVon(i,j,w,h),satz:satz})});
 }
 // Rest: Felder, Weiden, Bäume, Kram
 for(var q7=0;q7<W*W;q7++){if(belegt[q7])continue;var i7=q7%W,j7=(q7/W)|0,z7=Z[q7];
  if(z7==='g'&&(randFeld(i7,j7)||opt.art==='homestead')){var u7=rausch(i7,j7,seed+5);
   if(zus.vineyards&&u7<.3){Z[q7]='f';dinge.push({id:'busch-gruen',i:i7,j:j7})}else if(zus['olive-grove']&&u7<.55){dinge.push({id:'baum-olive',i:i7,j:j7})}
   else if(zus.pastures&&u7<.75){Z[q7]='p';if(rausch(i7,j7,seed+6)<.5)dinge.push({id:'tier-reh',i:i7,j:j7,rolle:'vieh'})}else if(zus.fields)Z[q7]='f';continue}
  if(z7==='g'&&rausch(i7,j7,seed+7)<(B.dichte*.6+.04))dinge.push({id:B.baeume[Math.floor(rausch(i7,j7,seed+8)*B.baeume.length)],i:i7,j:j7});
  else if(z7==='e'&&rausch(i7,j7,seed+9)<.35)dinge.push({id:rausch(i7,j7,seed+10)<.15?'leiche':'lager-platz',i:i7,j:j7});
  else if(z7==='g'&&rausch(i7,j7,seed+11)<.05)dinge.push({id:'lager-platz',i:i7,j:j7})}
 if(opt.art==='homestead'){var hb=bauten.filter(function(b){return b.rolle==='house'})[0];if(hb)dinge.push({id:'ware-stamm',i:Math.min(W-1,hb.i+1),j:hb.j})}
 if(hafen)for(var j8=1;j8<W-1;j8+=3)dinge.push({id:'lager-platz',i:ost-1,j:j8,rolle:'kai'});
 // Spiegeln (Variante): links ↔ rechts in der Kartenansicht = i ↔ j tauschen; Tor bleibt auf der Vorderseite
 var P={format:'at3-stadtplan',art:opt.art,biom:opt.biom,stil:opt.stil||'',seed:seed,W:W,zellen:Z.join(''),bauten:bauten,dinge:dinge,tor:tor,zusatz:Object.keys(zus),gespiegelt:false,
  basis:basis,feld:B.feld};
 if(F!==1)P=skalieren(P,F);
 if(r()<.5)P=spiegeln(P);
 return P}
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
 N.dinge=P.dinge.map(function(d){var o=JSON.parse(JSON.stringify(d));o.i=d.j;o.j=d.i;return o});N.tor={i:P.tor.j,j:P.tor.i};return N}
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
 bk.KLASSEN.forEach(function(k){s['bk-'+k.kurz+'-boden']=1});B.baeume.forEach(function(i){s[i]=1});P.dinge.forEach(function(d){s[d.id]=1});return Object.keys(s)}

var SB={elemente:elemente,kachelBauer:kachelBauer,HOCH:HOCH,hoch:hoch,skalieren:skalieren,ARTEN:ARTEN,BIOME:BIOME,STILE:STILE,ZUSATZ:ZUSATZ,plan:plan,spiegeln:spiegeln,drehen:drehen,bauer:bauer,malen:malen,kacheln:kacheln,zaehle:zaehle,kennungen:kennungen,hashT:hashT};
if(typeof module!=='undefined'&&module.exports)module.exports=SB;else G.AT3_STADTBILD=SB;
})(typeof window!=='undefined'?window:globalThis);
