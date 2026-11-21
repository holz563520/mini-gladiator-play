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
 var W=A.W,seed=opt.seed>>>0,r=rng(hashT([seed,opt.art,opt.biom,opt.stil||''].join('|'))),zus={};
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
  bauten.push({rolle:e?'shack':'house',i:i,j:j,w:w,h:h,klasse:kl,dach:e?'flach':basis.dach,achse:w>h?'i':h>w?'j':(r()<.5?'i':'j'),wand:kl===basis.klasse&&!e&&!satz?basis.wand:null,dachR:kl===basis.klasse&&!e&&!satz?basis.dachR:e?HOLZ:null,tuer:tuerVon(i,j,w,h),satz:satz})});
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
 if(r()<.5)P=spiegeln(P);
 return P}
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
// Bauer: P = Plan, hole(id) → Kartei-Objekt, opt {umland: Felder Landschaft ringsum (Nachbarschaftsbild)}. schritt(ms) → true, wenn fertig; bild() → {w,h,ax,ay,px,…}
function bauer(P,hole,opt){opt=opt||{};var bk=BK(),B=BIOME[P.biom],W=P.W,U=Math.max(0,opt.umland|0),WT=W+2*U,TOP=176,dt=hole,teil=holer(hole),fehlt={};
 var Zb={w:WT*64+64,h:WT*32+TOP+8,px:null},OX=WT*32+32-U*0,OY=TOP;Zb.px=new Uint8Array(Zb.w*Zb.h).fill(LEER);
 // Bildlage eines Felds (i, j) im Plan (Umland hat negative bzw. zu große Zahlen): Ecke oben = ((i−j)·32, (i+j)·16)
 var bx=function(i,j){return OX+(i-j)*32},by=function(i,j){return OY+(i+U+j+U)*16};
 var weg=P.basis&&KURZ[P.basis.klasse]?'bk-'+KURZ[P.basis.klasse]+'-boden':'boden-weg';
 var bodenId=function(i,j){var innen=i>=0&&j>=0&&i<W&&j<W,c=innen?P.zellen.charAt(j*W+i):'g';
  if(c==='g'){var l=B.boden;return l[Math.floor(rausch(i,j,P.seed+1)*l.length*(l.length>1?.75:1))%l.length]}
  if(c==='s')return B.weg;if(c==='o')return weg;if(c==='f')return P.feld||'bk-feld';return BODEN_ID[c]||'boden-gras'};
 var auftraege=[],n=0,teile=0,el=[];
 // 1) Boden je Feld (hinten zuerst)
 for(var s=-U;s<=2*(W-1)+U;s++)for(var i=-U;i<W+U;i++){var j=s-i;if(j<-U||j>=W+U)continue;(function(i,j){auftraege.push(function(){var o=hole(bodenId(i,j)),sp=malbild(o);
   if(!sp){fehlt[bodenId(i,j)]=1;return}blit(Zb,sp,bx(i,j)+0,by(i,j)+16);teile++})})(i,j)}
 // 2) Häuser, Mauerstücke, Rundbauten, Dinge, Umland-Bäume: nach Tiefe (Mitte i + j) sortiert
 P.bauten.forEach(function(b){el.push({t:b.i+b.j+(b.w+b.h)/2,n:n++,b:b})});
 P.dinge.forEach(function(d){el.push({t:d.i+d.j+1.02,n:n++,d:d})});
 if(U)for(var uj=-U;uj<W+U;uj++)for(var ui=-U;ui<W+U;ui++){if(ui>=0&&uj>=0&&ui<W&&uj<W)continue;var rd=Math.min(Math.abs(ui<0?ui:ui-W+1),Math.abs(uj<0?uj:uj-W+1));
  if(rausch(ui,uj,P.seed+21)<B.dichte*(1+.15*Math.max(ui<0?-ui:ui-W+1,uj<0?-uj:uj-W+1)))el.push({t:ui+uj+1.02,n:n++,d:{id:B.baeume[Math.floor(rausch(ui,uj,P.seed+22)*B.baeume.length)],i:ui,j:uj}})}
 el.sort(function(a,b){return a.t-b.t||a.n-b.n});
 el.forEach(function(e){auftraege.push(function(){
  if(e.d){var o=hole(e.d.id),sp=malbild(o);if(!sp){fehlt[e.d.id]=1;return}blit(Zb,sp,bx(e.d.i,e.d.j),by(e.d.i,e.d.j)+16);teile++;return}
  var b=e.b,L;
  if(b.rund){L=bk.bilde('rund',b.w,b.w,b.klasse);L.dinge=[];L.tueren=[];var ox=b.i-1,oy=b.j-1}
  else{L={w:b.w,h:b.h,c:new Array(b.w*b.h).fill('b'),klasse:b.klasse,achse:b.achse,dach:b.dach||'sattel',offen:false,tueren:b.tuer?[[b.tuer[0]-b.i,b.tuer[1]-b.j,b.tuer[2],b.tuer[3]]]:[],spina:[],dinge:[]};ox=b.i;oy=b.j}
  var vs=b.satz?'bk-'+KURZ[b.klasse]+'-':null;   // N6b: Teile des Biom-Satzes (bk-putz-…) vor den Klassenteilen, fehlt eins, gilt das Klassenteil
  var r=bk.setzen(L,function(id){if(vs&&id.indexOf(vs)===0){var o=hole('bk-'+b.satz+'-'+id.slice(vs.length));if(o)return o}return teil(id,b.klasse,b.wand,b.dachR)},b.dach||'',true);r.fehlt.forEach(function(f){fehlt[f]=1});teile+=r.teile;
  blit(Zb,{w:r.w,h:r.h,ax:r.ax,ay:r.ay,px:r.px},bx(ox,oy),by(ox,oy))})});
 var k=0,ms=0,maxMs=0,schritte=0;
 var jetzt=typeof performance!=='undefined'?function(){return performance.now()}:function(){var t=process.hrtime();return t[0]*1e3+t[1]/1e6};
 return{auftraege:auftraege.length,
  schritt:function(budget){var t0=jetzt();if(k>=auftraege.length)return true;do{auftraege[k++]()}while(k<auftraege.length&&jetzt()-t0<(budget||4));var d=jetzt()-t0;ms+=d;if(d>maxMs)maxMs=d;schritte++;return k>=auftraege.length},
  fertig:function(){return k>=auftraege.length},
  bild:function(){var x0=Zb.w,x1=-1,y0=Zb.h,y1=-1,x,y;for(y=0;y<Zb.h;y++){var o=y*Zb.w;for(x=0;x<Zb.w;x++)if(Zb.px[o+x]!==LEER){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}
   if(x1<0)return{w:0,h:0,ax:0,ay:0,px:new Uint8Array(0),teile:0,fehlt:Object.keys(fehlt),ms:ms,maxMs:maxMs,schritte:schritte};
   var w=x1-x0+1,h=y1-y0+1,px=new Uint8Array(w*h);for(y=0;y<h;y++)px.set(Zb.px.subarray((y+y0)*Zb.w+x0,(y+y0)*Zb.w+x0+w),y*w);
   // Anker: obere Ecke des Felds (0, 0) im Plan; tor: Bildpunkt vor dem Tor (Ziel der Straßen, N7a)
   var T=P.tor;return{w:w,h:h,ax:bx(0,0)-x0,ay:by(0,0)-y0,px:px,teile:teile,fehlt:Object.keys(fehlt),ms:ms,maxMs:maxMs,schritte:schritte,
    tor:{x:bx(T.i,T.j)-x0,y:by(T.i,T.j)+32-y0},W:W,umland:U}}}}
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

var SB={ARTEN:ARTEN,BIOME:BIOME,STILE:STILE,ZUSATZ:ZUSATZ,plan:plan,spiegeln:spiegeln,drehen:drehen,bauer:bauer,malen:malen,kacheln:kacheln,zaehle:zaehle,kennungen:kennungen,hashT:hashT};
if(typeof module!=='undefined'&&module.exports)module.exports=SB;else G.AT3_STADTBILD=SB;
})(typeof window!=='undefined'?window:globalThis);
