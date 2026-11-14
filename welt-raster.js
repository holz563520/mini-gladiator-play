'use strict';
// =====================================================================================================================
// RASTERKARTE (welt-raster.js) · Große Karte in schrägen Quadraten wie bei RollerCoaster Tycoon. Wunsch Thomas 11.11.2026.
// Nur auf tageslauf-editor.html geladen (WELT_KARTE in weltkarte-boot.js), nicht im Spiel. Nichts wird gespeichert.
//
// · Karte: N × N Felder, jedes Feld eine Raute 64 × 32. feld[ty*N+tx] sagt, was dort liegt (Wiese, Wald, Weg, Fluss,
//   Brücke, Ludus-Boden, Gebäude, Übungsplatz). Darauf wird später gebaut.
// · Inhalt jetzt, mehr nicht: Wald links, ein Fluss, ein Weg über die ganze Karte, in der Mitte der Ludus mit den für
//   die Einführungen wichtigen Gebäuden als Skizze (Kästen mit Namen): Kaserne, Trainingshof, Schmiede, Medicus,
//   Sklavenmarkt, Hall of the Fallen, Beastrium. Das Arena-Tor ist durch eine baubare Arena ersetzt (welt-bau.js).
// · Einführungen: Die Gebäude liegen wie im alten Ludus (900 × 760), ein Feld = 50 alte Bildpunkte. vonLudus(x,y)
//   rechnet jede alte Ludus-Koordinate auf die Karte um; damit lassen sich die Intros später hierher verlegen.
// · Gladiatoren schlendern nur im Ludus herum (noch kein Tagesablauf). Uhr, Licht, Antippen und Pinzette hängen über
//   window.WeltHook an (welt-zeit.js, welt-leben.js).
// · Figuren: klein wie bei RollerCoaster Tycoon Classic. Normalansicht = die einfache Figur der großen Kämpfe (arena.js),
//   grob gepixelt. Die volle Figur erscheint erst beim Heranzoomen (ab DETAIL), und nur für die, die dann im Bild sind.
//   Ganz weit weg: zwei Rechtecke je Figur.
// · Leistung: Der Boden ist in Kacheln vorgezeichnet; weit herausgezoomt wird eine einmal gezeichnete Übersicht kopiert.
// =====================================================================================================================
(()=>{
const H=window.WeltHook=window.WeltHook||{};
const M=window.MG,S=M.s,$=id=>document.getElementById(id);
// Videosequenzen/Tutorial aus 1.0 und Startwerte des Test-Ludus: jetzt in welt-erzaehlung.js (Erzählsperre, vor der Karte geladen)

// ---------- Raster ----------
// Arena Theory 2.0: große Karte (960 × 960, gut fünfmal die Fläche der 432er-Karte) mit Höhen wie bei RollerCoaster Tycoon:
// Berge, Hügel, Seen, ein Fluss und Biome in Flecken verteilt; eben ist nur das Ludus-Gelände in der Mitte (um O verschoben).
// Der Tageslauf-Editor bleibt bei 96, flach und ohne Biome.
const GROSS=!!window.AT2,N=GROSS?960:96,O=GROSS?432:0,TW=64,TH=32,OX=N*TW/2,OY=GROSS?420:140,WW=N*TW,WH=N*TH+OY+(GROSS?120:60),TAU=Math.PI*2,clamp=(v,a,b)=>v<a?a:v>b?b:v;
const iso=(tx,ty)=>({x:(tx-ty)*TW/2+OX,y:(tx+ty)*TH/2+OY});// obere Ecke des Feldes; Mitte: iso(tx+.5,ty+.5)
const tileAt=(x,y)=>{const a=(x-OX)/(TW/2),b=(y-OY)/(TH/2);return {tx:(a+b)/2,ty:(b-a)/2};};
function hash(n){n=Math.imul(n^0x9e3779b9,0x85ebca6b);n^=n>>>13;n=Math.imul(n,0xc2b2ae35);n^=n>>>16;return (n>>>0)/4294967296;}
const h2=(x,y,s=0)=>hash(x*374761393+y*668265263+s*1442695);
const T={WIESE:0,WALD:1,WEG:2,FLUSS:3,BRUECKE:4,LUDUS:5,BAU:6,PLATZ:7,ARENA:8,TRIB:9,STR1:10,STR2:11,STR3:12,STR4:13,STR5:14,UNTERKUNFT:15,UNT_S:16,UNT_K:17,SCHM_S:18,SCHMIEDE:19,SCHM_K:20,SAND:21,DSCH:22,SUMPF:23,MOOR:24,FELS:25,SCHNEE:26,BST_S:27,BEAST:28,BST_K:29,KAS_S:30,KASERNE:31,KAS_K:32,MEDICUS:33,KRANK:34,MARKT:35,HALLE:36,GRAB:37,ERDE:38,KIES:39,SCHLAMM:40,GEROELL:41,TROCKEN:42,NADEL:43,VERWALTUNG:44,ARENA_BAU:45},NAMEN=['Wiese','Wald','Weg','Fluss','Brücke','Ludus','Gebäude','Übungsplatz','Kampffläche','Tribüne','Trampelpfad','Kiesweg','Pflasterweg','Steinstraße','Prachtstraße','Mannschaftsstube','Rattenloch','Fürstengemächer','Rostgrube','Waffenschmiede','Kaiserliche Waffenschmiede','Sand','Dschungelboden','Sumpf','Moorwasser','Fels','Schnee','Knochengrube','Beastrium','Kaiserliche Menagerie','Bretterbude','Kaserne','Prätorianerkaserne','Medicus','Krankenhaus','Sklavenmarkt','Halle der Toten','Gräberplatz','Erde','Kies','Schlamm','Geröll','Trockengras','Nadelstreu','Verwaltung','Arena'];
const feld=new Uint8Array(N*N),bauAuf=new Int8Array(N*N).fill(-1),ix=(tx,ty)=>ty*N+tx,inMap=(tx,ty)=>tx>=0&&ty>=0&&tx<N&&ty<N;
// Ludus in der Mitte: 18 × 16 Felder, ein Feld = 50 Bildpunkte des alten Ludus (900 × 760)
// Arena Theory 2.0, Schritt A3 (Thomas 13.11.2026): Karte neu angeordnet. An der großen Straße liegen nebeneinander das
// Gladiatorendorf (Westen, Palisade, Dorftor), der zentrale Platz mit den festen Gebäuden (Regel 12) und der Arena-Park
// (Osten, Zaun, genau ein Parktor). Besucher kommen nur durchs Parktor. LUD ist auf der großen Karte der Kern des Dorfes
// (Ludus-Boden, dort laufen die Gladiatoren herum); Dorf und Park haben viel freie Fläche zum Wachsen.
// Lagen relativ zu O: [x, y, Breite, Höhe] in Feldern. Die Straße liegt bei y 58/59.
// A3b (Thomas 13.11.2026): Dorf 38×78 → 92×110 (nach Westen und Norden), Park 59×56 → 100×110 (nach Osten und Norden); Platz, Tore,
// Halle, Start-Ludus und Start-Arena bleiben, wo sie sind (Intros). arenaPlatz: 50×50 für die große Arena (B0), eben, frei, gesperrt.
const ANORD=GROSS?{dorf:[-100,-52,92,110],platz:[-8,40,14,18],park:[6,-52,100,110],arenaPlatz:[36,-14,50,50],teich:[94,12,4.6],// teich: A3b natürlich (Thomas: „natürlich gewachsen“), [x, y, Halbmesser]
 kern:[-38,31,29,26],verwaltung:[-2,40,5,4],
 parktor:[14,3],dorftor:[-26,3],durchgang:[50,3],kaempfertor:[52,2],// Kämpfertor: vom Platz in den Park (Kämpfer, Karren), nicht für Besucher
// Tor: erstes Feld und Breite (an der Unterkante bzw. bei durchgang an der Ostkante des Dorfes)
 halle:[7,40],arena:{boden:[24,30,8,6],trib:[22,28,12,10],durch:[[27,36],[28,36],[27,37],[28,37]],ein:[27.5,38.5]},
 pfade:[[15,38,1,20],[15,38,46,1],[9,45,1,6],[9,50,7,1],// Kieswege im Park: Tor → Arena (A3b: weiter bis unter die Fläche der großen Arena), Halle → Hauptweg
  [61,38,8,1],[61,30,1,8],[68,17,1,21]],// B0: zur Warteschlange und vom Ausgang zurück zum Hauptweg
 schlange:[[61,20,1,2],[61,22,3,8]],// B0: Kiesfläche der Warteschlange (Zickzack mit Seilen vor dem Eingang, welt-arena.js)
 sandgrube:{c:[61.5,11.5],r:8.4},// B0 (Thomas 13.11.2026): feste Arena, Stufe 1 „Sandgrube“, Mitte und Halbmesser in Feldern (welt-arena.js)
 vorplatz:[37,2,8,20],gang:[45,11,8,2],// B0b (Thomas 13.11.2026): fester Vorplatz der Herausforderer im Westen, Kämpfergang zum Kämpfertor (Stufe 1; welt-arena.js passt ihn je Stufe an, welt-vorplatz.js zeichnet)
 orte:{lanista:[-16,48],orontes:[-24,50],huehner:[-33,50]}}:null;
const inR=(lx,ly,r,m=0)=>lx>=r[0]-m&&lx<r[0]+r[2]+m&&ly>=r[1]-m&&ly<r[1]+r[3]+m,imAnord=(lx,ly,m=0)=>!!ANORD&&inMap(lx+O,ly+O)&&nah[(ly+O)*N+lx+O]<=m;// A3b: nach den geschwungenen Rändern (ber, nah unten)
const LUD=ANORD?{tx:ANORD.kern[0]+O,ty:ANORD.kern[1]+O,w:ANORD.kern[2],h:ANORD.kern[3],px:50}:{tx:39+O,ty:40+O,w:18,h:16,px:50};
const vonLudus=(x,y)=>iso(LUD.tx+x/LUD.px,LUD.ty+y/LUD.px);
// Gebäude der Einführungen, Lage aus dem alten Ludus (ludus.js places, hs-art.js BEASTRIUM), auf ganze Felder gelegt
const BAU=[
 {id:'kaserne',name:'KASERNE',l:[45,50,235,133],p:[-20,33,5,3],hoch:44,wand:'#b9a27c',dach:'#a5553c',haus:T.KASERNE,haus2:T.KAS_S},
 {id:'hall',name:'HALL',l:[50,206,112,70],p:[8,40,2,1],hoch:36,wand:'#8d8a80',dach:'#5d5a54',weg:true},
 {id:'markt',name:'SKLAVENMARKT',l:[45,280,230,118],p:[-8,47,5,2],hoch:26,wand:'#a98458',dach:'#c9b27a',haus:T.MARKT},// offener Stand wie im Spiel, fest
 {id:'medicus',name:'MEDICUS',l:[34,447,250,163],p:[-8,41,5,3],hoch:40,wand:'#d2cbb8',dach:'#7e8a8c',haus:T.MEDICUS},// fest, nicht baubar und nicht abreißbar
 {id:'platz',name:'TRAININGSHOF',l:[310,247,275,343],p:[-19,40,6,7],hoch:0,wand:'#7a5a39',dach:'#d9c391',flach:true},
 {id:'schmiede',name:'SCHMIEDE',l:[638,86,215,150],p:[-36,33,4,3],hoch:42,wand:'#7d7468',dach:'#4b4640',haus:T.SCHMIEDE,haus2:T.SCHM_S},
 {id:'beastrium',name:'BEASTRIUM',l:[652,298,196,126],p:[-36,40,4,3],hoch:40,wand:'#96795a',dach:'#6b4a2c',haus:T.BEAST,haus2:T.BST_S},
 // Nur 2.0 (A3): Unterkunft der Gladiatoren, schäbigste Klasse
 ...(ANORD?[{id:'unterkunft',name:'UNTERKUNFT',l:[0,0,0,0],p:[-29,33,6,4],hoch:30,wand:'#8a6f4a',dach:'#6b4a2c',haus:T.UNT_S}]:[]),
 // A4 (Thomas 13.11.2026): Verwaltung, fest am zentralen Platz (Regel 12), weder baubar noch abreißbar
 ...(ANORD?[{id:'verwaltung',name:'VERWALTUNG',l:[0,0,0,0],p:[...ANORD.verwaltung],hoch:40,wand:'#e8e4da',dach:'#a5553c',haus:T.VERWALTUNG}]:[])
];
// 2.0: feste Lagen (p) im Dorf und am Platz, die Häuser des Start-Ludus in der schäbigsten Klasse (haus2; Thomas: „alles unterste Klasse,
// der Rest muss erforscht werden“). Editor (96er Karte): Lage aus dem alten Ludus wie bisher.
for(const [i,b] of BAU.entries()){if(ANORD){b.tx=O+b.p[0];b.ty=O+b.p[1];b.w=b.p[2];b.h=b.p[3];if(b.haus2!=null)b.haus=b.haus2;}
 else{b.tx=LUD.tx+Math.round(b.l[0]/LUD.px);b.ty=LUD.ty+Math.round(b.l[1]/LUD.px);b.w=Math.max(1,Math.round(b.l[2]/LUD.px));b.h=Math.max(1,Math.round(b.l[3]/LUD.px));}b.i=i;}
// Gelände. Editor: Wald links (linke Ecke der Raute), Fluss rechts vom Ludus, ein gerader Weg vor dem Ludus, alles flach.
// Große Karte: Höhen aus Rauschen (Grundform, Gebirgskämme, Hügel), Wasser überall, wo der Boden unter WL liegt (Seen), dazu
// ein Fluss über die ganze Karte. Biome nach Wärme und Feuchte in großen Flecken mit ausgefransten Rändern: Wüste (warm,
// trocken), Dschungel (warm, feucht), Sumpf (kühl, feucht, nur in Niederungen), Wald (kühl) und dazwischen Wiese mit Hainen.
// Hoch oben Fels, ganz oben Schnee. Eben ist nur das Ludus-Gelände; der Weg läuft dort gerade und schlängelt sich draußen.
const rampe=(x,a,b)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const flussX=ty=>O+(ANORD?122:72)+Math.round(3*Math.sin(ty/9)+2*Math.sin(ty/4.3)+(GROSS?rampe(Math.abs(ty-O-48),60,160)*(14*Math.sin(ty/37)+7*Math.sin(ty/17+1)):0)),WEG_TY=O+58;
function vn(x,y,s){const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),a=h2(xi,yi,s),b=h2(xi+1,yi,s),c=h2(xi,yi+1,s),d=h2(xi+1,yi+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
const fbm=(x,y,s)=>vn(x,y,s)*.65+vn(x*2.1,y*2.1,s+7)*.35;
const B_=window.WeltNatur?.BIOM||{KERN:0,WALD:1,WUESTE:2,DSCHUNGEL:3,SUMPF:4},biom=new Uint8Array(N*N);
// ---------- Bereiche mit natürlich gewachsenen Rändern (A3b, Thomas 13.11.2026) ----------
// Dorf und Park sind keine Rechtecke mehr: die Ränder schwingen sanft, der Park endet sechs Felder vor dem Fluss. Gerade bleiben
// die Ränder zur Straße, am Platz und an den Toren (sonst passen Tore und Videosequenzen nicht). Lagen aus ANORD (Dorf 92×110, Park 100×110). Zwischen Dorf und Park bleibt
// hinter dem Platz eine Gasse von mindestens 14 Feldern. ber[k]: 0 draußen, 1 Dorf, 2 Platz, 3 Park. nah[k]: Abstand in Feldern
// (Schachbrett) zum nächsten Bereichsfeld bis 4, sonst 255. pInnen[k]: Parkfeld mit 3 Feldern Abstand zum Rand (dort Hügel).
// bfrei[k]: in den Bereichen nichts Natürliches (Ludus-Kern, Gebäude, Wege, Tore, Halle, NPC-Plätze, Arena-Fläche B0, Rand innen).
const BER={DORF:1,PLATZ:2,PARK:3},ber=new Uint8Array(N*N),nah=new Uint8Array(N*N).fill(255),pInnen=new Uint8Array(N*N),bfrei=new Uint8Array(N*N);
const BX0=O-112,BX1=O+130,BY0=O-66,BY1=O+64;// Rahmen, in dem gerechnet wird (spart beim Laden)
const schwing=(i,s,a)=>Math.round((vn(i/9,.5,s)-.5)*2*a);
function bereichAt(lx,ly){const A=ANORD;if(inR(lx,ly,A.platz))return BER.PLATZ;if(ly>57)return 0;
 const P=A.park;if(lx>=P[0]+(ly<36?Math.max(0,schwing(ly,62,3)):0)&&lx<P[0]+P[2]-Math.max(0,schwing(ly,67,5))&&ly>=P[1]+schwing(lx,61,5)&&lx<=flussX(ly+O)-O-6)return BER.PARK;
 const D=A.dorf;if(lx<D[0]+D[2]-(ly<36?Math.max(0,schwing(ly,65,3)):0)&&lx>=D[0]+schwing(ly,63,5)&&ly>=D[1]+schwing(lx,64,5))return BER.DORF;
 return 0;}
if(ANORD){const A=ANORD;
 for(let ty=BY0;ty<BY1;ty++)for(let tx=BX0;tx<BX1;tx++)ber[ix(tx,ty)]=bereichAt(tx-O,ty-O);
 for(let ty=BY0;ty<BY1;ty++)for(let tx=BX0;tx<BX1;tx++)if(ber[ix(tx,ty)])nah[ix(tx,ty)]=0;
 for(let d=1;d<=4;d++)for(let ty=BY0-d;ty<BY1+d;ty++)for(let tx=BX0-d;tx<BX1+d;tx++){const k=ix(tx,ty);if(nah[k]!==255)continue;
  let hit=0;for(let j=-1;j<=1&&!hit;j++)for(let i=-1;i<=1;i++)if(nah[k+j*N+i]===d-1){hit=1;break;}if(hit)nah[k]=d;}
 // Parkinneres: dreimal abtragen
 let e=new Uint8Array(N*N);for(let ty=BY0;ty<BY1;ty++)for(let tx=BX0;tx<BX1;tx++)e[ix(tx,ty)]=ber[ix(tx,ty)]===BER.PARK?1:0;
 for(let r=0;r<3;r++){const f=new Uint8Array(N*N);for(let ty=BY0;ty<BY1;ty++)for(let tx=BX0;tx<BX1;tx++){const k=ix(tx,ty);if(!e[k])continue;let ok=1;
  for(let j=-1;j<=1&&ok;j++)for(let i=-1;i<=1;i++)if(!e[k+j*N+i]){ok=0;break;}f[k]=ok;}e=f;}
 pInnen.set(e);
 // Freihalten (relativ zu O): Rechteck mit Rand m
 const halte=(r,m)=>{for(let y=r[1]-m;y<r[1]+r[3]+m;y++)for(let x=r[0]-m;x<r[0]+r[2]+m;x++)if(inMap(x+O,y+O))bfrei[ix(x+O,y+O)]=1;};
 halte(A.kern,2);halte(A.platz,1);halte(A.arenaPlatz,0);halte(A.verwaltung,2);for(const p of A.pfade)halte(p,1);halte([A.halle[0],A.halle[1],5,5],2);
 for(const b of BAU)halte(b.p,2);for(const o of Object.values(A.orte))halte([o[0],o[1],1,1],2);
 halte([A.parktor[0]-3,50,A.parktor[1]+6,8],0);halte([A.dorftor[0]-3,50,A.dorftor[1]+6,8],0);halte([-12,48,4,6],0);halte([4,49,5,7],0);// Tore, Durchgang, Kämpfertor
 for(let ty=BY0;ty<BY1;ty++)for(let tx=BX0;tx<BX1;tx++){const k=ix(tx,ty),b=ber[k];if(!b)continue;// innen am Rand ein Feld frei, damit Zaun und Palisade sichtbar bleiben
  for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)if(ber[k+j*N+i]!==b)bfrei[k]=1;}}
// ---------- Höhen ----------
// Wie bei RollerCoaster Tycoon hat jedes Feld vier eigene Eckhöhen (hc; Stufen zu HZ Bildpunkten, 0 = Höhe des Ludus;
// Ecke 0 oben = (tx,ty), 1 rechts, 2 unten, 3 links). Im Feld unterscheiden sich Nachbarecken um höchstens eine Stufe (über
// Eck zwei = steiler Hang). Zwischen Feldern darf es Sprünge geben (Klippe mit Erdwand), wie nach dem Geländewerkzeug.
// Wasser steht überall auf WL; ein Feld, das tiefer reicht, ist Gewässer (feld = FLUSS, darunter grund).
const HZ=8,WL=-1,V=N+1,hc=new Int8Array(N*N*4),grund=new Uint8Array(N*N),eben=new Uint8Array(N*N),wy=new Int16Array(N).fill(WEG_TY),prof=new Int8Array(V),bruecke=new Uint8Array(N);let HMAX=0,HMIN=0;
const WEG_L=O-(ANORD?110:10),WEG_R=O+160;// dazwischen läuft der Weg gerade (Ludus-Gelände, Besucher)
// Ludus-Gelände: ebenR < EBEN, eben und Wiese. Thomas 12.11.: Freifläche um Arena und Ludus viel größer (vorher Radius 64 um 75/46)
// A3: Mitte der Freifläche zwischen Dorf und Park verschoben (vorher 58/42), damit beide ganz auf ebenem Boden liegen
// A3b: Mitte (3,3), Radius 140, damit das größere Dorf und der größere Park ganz eben liegen
const EM=ANORD?[3,3]:[58,42],ebenR=(x,y)=>Math.hypot(x-O-EM[0],(y-O-EM[1])*1.15)+(vn(x/9,y/9,31)-.5)*12,EBEN=ANORD?140:125,EBEN_RAND=ANORD?215:200;
// Großes Rauschen auf einem groben Gitter vorrechnen und dazwischen mitteln (spart beim Laden)
// T1 (Thomas 13.11.2026): sanfte Hügel und Senken nur im Arena-Park (−1 … +3 Stufen); Dorf, Platz, Zaun, Tore, Wege, Arena und
// Halle der Toten bleiben eben. Eckpunkt (x,y) → Höhe, oder null = eben und fest. Das Glätten unten hält die Hänge sanft.
const PARK_FREI=ANORD?[[ANORD.arenaPlatz,2],[ANORD.arena.trib,3],...ANORD.pfade.map(p=>[p,1]),[[ANORD.halle[0],ANORD.halle[1],5,5],2]]:[];
// A3b natürlich: Hügel im Parkinneren (pInnen, 3 Felder vom geschwungenen Rand), dazu ein Teich (−2 Stufen) mit ausgefranstem Ufer
function parkH(x,y){if(!ANORD)return null;const lx=x-O,ly=y-O;if(!pInnen[ix(Math.min(x,N-1),Math.min(y,N-1))]||!pInnen[ix(Math.max(x-1,0),Math.max(y-1,0))])return null;
 for(const [r,m] of PARK_FREI)if(lx>=r[0]-m&&lx<=r[0]+r[2]+m&&ly>=r[1]-m&&ly<=r[1]+r[3]+m)return null;
 const Te=ANORD.teich;if(Math.hypot(lx-Te[0],(ly-Te[1])*1.25)+(vn(x/3,y/3,66)-.5)*2.6<Te[2])return -2;
 return clamp(Math.round((fbm(x/10,y/10,27)-.47)*11),-1,3);}
const huegel=new Uint8Array(N*N);// Felder, die durch die Parkhügel nicht mehr flach sind (für alte Spielstände, welt-spielstand.js)
function grob(f,st){const n=Math.ceil(V/st)+2,a=new Float32Array(n*n);for(let j=0;j<n;j++)for(let i=0;i<n;i++)a[j*n+i]=f(i*st,j*st);
 return (x,y)=>{const fx=x/st,fy=y/st,i=fx|0,j=fy|0,u=fx-i,v=fy-j,o=j*n+i;return (a[o]*(1-u)+a[o+1]*u)*(1-v)+(a[o+n]*(1-u)+a[o+n+1]*u)*v;};}
const wrp=(x,y,s)=>[x+(vn(x/95,y/95,s)-.5)*70,y+(vn(x/95,y/95,s+1)-.5)*70];
const KONT=GROSS&&grob((x,y)=>{const [a,b]=wrp(x,y,11);return fbm(a/170,b/170,12);},4),
 BERG=GROSS&&grob((x,y)=>{const [a,b]=wrp(x,y,11),r=1-Math.abs(2*fbm(a/46,b/46,13)-1);return r*r;},3),
 WAERME=GROSS&&grob((x,y)=>{const [a,b]=wrp(x,y,15);return fbm(a/210,b/210,16);},8),
 FEUCHT=GROSS&&grob((x,y)=>{const [a,b]=wrp(x,y,17);return fbm(a/190,b/190,18);},8);
if(GROSS){
 // Weg: je Spalte höchstens eine Zeile weiter, draußen schlängelt er sich
 const ziel=tx=>{const d=tx<WEG_L?WEG_L-tx:tx-WEG_R;return WEG_TY+Math.round(rampe(d,0,70)*(20*Math.sin(tx/43)+9*Math.sin(tx/17+2)));};
 for(let tx=WEG_R+1;tx<N;tx++)wy[tx]=clamp(wy[tx-1]+clamp(ziel(tx)-wy[tx-1],-1,1),3,N-5);
 for(let tx=WEG_L-1;tx>=0;tx--)wy[tx]=clamp(wy[tx+1]+clamp(ziel(tx)-wy[tx+1],-1,1),3,N-5);
 // Eckhöhen auf dem gemeinsamen Punktgitter (V × V); fest: Ludus-Gelände (0) und Weg
 const hv=new Int8Array(V*V),fix=new Uint8Array(V*V);
 for(let y=0;y<V;y++)for(let x=0;x<V;x++){const r=ebenR(x,y),a=rampe(r,EBEN,EBEN_RAND),i=y*V+x;let h=0;
  if(a>0){const k=KONT(x,y),b=BERG(x,y),sumpf=rampe(FEUCHT(x,y),.53,.6)*rampe(.5-WAERME(x,y),0,.05);
   const see=rampe(fbm(x/38,y/38,19),.6,.74);// verstreute Seen
   h=Math.round((((k-.33)*24+Math.max(0,k-.5)*1.7*b*30+(fbm(x/15,y/15,14)-.5)*8-see*9)*(1-.7*sumpf)-sumpf*1.5)*a);}
  const fl=x-flussX(Math.min(N-1,y));if(fl>=-1&&fl<=2)h=Math.min(h,WL-1);else if(r<EBEN&&(fl<-4||fl>5)){const ph=parkH(x,y);if(ph==null)fix[i]=1;else h=ph;}
  hv[i]=clamp(h,-8,40);}
 const nass=(tx,ty)=>Math.min(hv[ty*V+tx],hv[ty*V+tx+1],hv[(ty+1)*V+tx],hv[(ty+1)*V+tx+1])<WL;
 for(let x=0;x<V;x++){let s=0;for(let d=-6;d<=6;d++){const xx=clamp(x+d,0,N);s+=hv[(wy[Math.min(xx,N-1)]+1)*V+xx];}prof[x]=x>=WEG_L&&x<=WEG_R+1?0:Math.max(0,Math.round(s/13));}
 for(let x=1;x<V;x++)prof[x]=Math.min(prof[x],prof[x-1]+1);for(let x=V-2;x>=0;x--)prof[x]=Math.min(prof[x],prof[x+1]+1);
 for(let tx=0;tx<N;tx++){bruecke[tx]=nass(tx,wy[tx])||nass(tx,wy[tx]+1)?1:0;if(bruecke[tx])continue;for(let yy=wy[tx];yy<=wy[tx]+2;yy++)for(let xx=tx;xx<=tx+1;xx++){const i=yy*V+xx;hv[i]=prof[xx];fix[i]=1;}}
 // Hänge glätten: Nachbarpunkte höchstens eine Stufe auseinander (erst Spitzen kappen, dann Gruben füllen; feste Punkte bleiben)
 for(let r=0;r<2;r++)for(const hoch of [0,1]){const f=hoch?(m,n)=>Math.max(m,n-1):(m,n)=>Math.min(m,n+1);
  for(let y=0;y<V;y++)for(let x=0;x<V;x++){const i=y*V+x;if(fix[i])continue;let m=hv[i];if(x)m=f(m,hv[i-1]);if(y)m=f(m,hv[i-V]);hv[i]=m;}
  for(let y=V-1;y>=0;y--)for(let x=V-1;x>=0;x--){const i=y*V+x;if(fix[i])continue;let m=hv[i];if(x<N)m=f(m,hv[i+1]);if(y<N)m=f(m,hv[i+V]);hv[i]=m;}}
 for(let ty=0;ty<N;ty++)for(let tx=0;tx<N;tx++){const k=(ty*N+tx)*4,i=ty*V+tx;hc[k]=hv[i];hc[k+1]=hv[i+1];hc[k+2]=hv[i+V+1];hc[k+3]=hv[i+V];}
 // Brücke nur, wo nach dem Glätten wirklich Wasser ist; sonst bleibt es Weg auf dem Boden
 for(let tx=0;tx<N;tx++)if(bruecke[tx]&&[wy[tx],wy[tx]+1].every(ty=>{const k=(ty*N+tx)*4;return Math.min(hc[k],hc[k+1],hc[k+2],hc[k+3])>=WL;}))bruecke[tx]=0;
 for(let tx=0;tx<N;tx++)if(bruecke[tx]){const L=Math.max(prof[tx],prof[tx+1],0);for(const ty of [wy[tx],wy[tx]+1])hc.fill(L,(ty*N+tx)*4,(ty*N+tx)*4+4);}
 for(let i=0;i<hc.length;i++){if(hc[i]>HMAX)HMAX=hc[i];if(hc[i]<HMIN)HMIN=hc[i];}
 if(ANORD){for(let ty=BY0;ty<BY1;ty++)for(let tx=BX0;tx<BX1;tx++){const k=ix(tx,ty);if(ber[k]===BER.PARK&&(hc[k*4]|hc[k*4+1]|hc[k*4+2]|hc[k*4+3]))huegel[k]=1;}}}
for(let ty=0;ty<N;ty++)for(let tx=0;tx<N;tx++){let t=T.WIESE,bi=0;const k=ix(tx,ty),lx=tx-O,ly=ty-O,innen=!GROSS||ebenR(tx+.5,ty+.5)<EBEN;
 const c0=hc[k*4],c1=hc[k*4+1],c2=hc[k*4+2],c3=hc[k*4+3],hm=(c0+c1+c2+c3)/4;eben[k]=innen?1:0;
 if(!innen){const cx=tx+.5,cy=ty+.5,w=WAERME(cx,cy)+(vn(tx/7,ty/7,41)-.5)*.05,f=FEUCHT(cx,cy)+(vn(tx/7,ty/7,42)-.5)*.05,q=fbm(tx/9,ty/9,5);
  bi=w>.54&&f<.48?B_.WUESTE:w>.52&&f>=.52?B_.DSCHUNGEL:f>.54&&w<.49&&hm<6?B_.SUMPF:w<.465?B_.WALD:0;
  // T3: mehrere Böden je Biom (q2, q3: kleinere Flecken), weich überblendet beim Malen (saum)
  const q2=fbm(tx/6,ty/6,57),q3=fbm(tx/13,ty/13,59);
  t=bi===B_.WALD?(q>.72?T.WIESE:q3>.6?T.NADEL:q2>.68?T.ERDE:T.WALD):bi===B_.WUESTE?(q>.8?T.WIESE:q3>.7?T.KIES:q2>.68?T.TROCKEN:T.SAND):
   bi===B_.DSCHUNGEL?(q>.8?T.MOOR:q2>.68?T.SCHLAMM:q3>.66?T.ERDE:T.DSCH):bi===B_.SUMPF?(q>.52?T.MOOR:q2>.62?T.SCHLAMM:T.SUMPF):
   (q>.68?T.WALD:q2>.66?T.TROCKEN:q3>.68?T.ERDE:q2<.3?T.KIES:T.WIESE);
  const fels=15+(vn(tx/5,ty/5,43)-.5)*4;if(hm>=fels){t=hm>=fels+8?(q2>.7?T.GEROELL:T.SCHNEE):q2>.58?T.GEROELL:T.FELS;bi=B_.GEBIRGE??5;}else if(hm>=fels-2&&q2>.5){t=T.GEROELL;bi=B_.GEBIRGE??5;}}
 else if(!imAnord(lx,ly,3)&&ly-lx>30+h2(tx>>2,ty>>2,5)*9)t=T.WALD;// A3: in Dorf, Platz und Park kein Wald
 // A3b: in Dorf und Park von allem ein bisschen, locker: kleine Wäldchen, Haine (Wiese mit Bäumen und Büschen), Sand- und Kiesflecken
 else if(ANORD&&nah[k]===0&&ber[k]!==BER.PLATZ&&!bfrei[k]){const g=fbm(tx/11,ty/11,51),sd=fbm(tx/8,ty/8,53),ek=fbm(tx/7,ty/7,55);if(g>.69)t=T.WALD;else if(g>.61)bi=B_.WALD;else if(sd>.755)t=T.SAND;else if(ek>.75)t=T.ERDE;else if(ek<.24)t=T.KIES;}// T3: Erd- und Kiesflecken
 if(!GROSS&&Math.abs(tx-flussX(ty))<=1)t=T.FLUSS;
 grund[k]=t;if(GROSS&&Math.min(c0,c1,c2,c3)<WL)t=T.FLUSS;
 if(ty===wy[tx]||ty===wy[tx]+1)t=(GROSS?bruecke[tx]:t===T.FLUSS)?T.BRUECKE:T.WEG;
 if(tx>=LUD.tx&&tx<LUD.tx+LUD.w&&ty>=LUD.ty&&ty<LUD.ty+LUD.h)t=T.LUDUS;
 if(ANORD&&inR(lx,ly,ANORD.platz))t=T.LUDUS;// zentraler Platz: festgetretener Boden
 if(t!==T.FLUSS)grund[k]=t;feld[k]=t;biom[k]=bi||(t===T.WALD?B_.WALD:0);}
// Kaserne, Schmiede, Beastrium, Medicus und Sklavenmarkt stehen als echte Gebäude der mittleren Klasse da (welt-gebaeude.js, Thomas 12.11.); Lage und bauAuf bleiben für die Intros.
for(const b of BAU)if(!b.weg)for(let y=b.ty;y<b.ty+b.h;y++)for(let x=b.tx;x<b.tx+b.w;x++){feld[ix(x,y)]=b.flach?T.PLATZ:b.haus??T.BAU;bauAuf[ix(x,y)]=b.i;}
const SKIZZE=BAU.filter(b=>b.haus==null&&!b.weg);
// A3: Kieswege im Park, Grenzen (Zaun um den Park, Palisade um das Dorf und hinter dem Platz) und feste Felder.
// Grenzen liegen auf den Kanten zwischen Feldern: zaunA[k] = Kante oben rechts von Feld k (Linie ty), zaunB[k] = Kante oben links
// (Linie tx); 1 = Parkzaun, 2 = Palisade. fest[k]: weder baubar noch abreißbar (Platz, Bauplatz der Verwaltung).
const zaunA=new Uint8Array(N*N),zaunB=new Uint8Array(N*N),fest=new Uint8Array(N*N),arenaPlatz=new Uint8Array(N*N),TORE=[];// arenaPlatz: A3b, Fläche der großen Arena (B0)
if(ANORD){const A=ANORD,setz=(arr,x,y,v)=>{if(inMap(x,y))arr[ix(x,y)]=v;};
 for(const [x0,y0,w,h] of A.pfade)for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)feld[ix(x+O,y+O)]=T.STR2;
 for(let y=A.platz[1];y<A.platz[1]+A.platz[3];y++)for(let x=A.platz[0];x<A.platz[0]+A.platz[2];x++){const k=ix(x+O,y+O);if(feld[k]===T.LUDUS)fest[k]=1;}
 {const [x0,y0,w,h]=A.verwaltung;for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)fest[ix(x+O,y+O)]=1;}// A4: Verwaltung fest
 {const [x0,y0,w,h]=A.arenaPlatz;for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){const k=ix(x+O,y+O);fest[k]=1;arenaPlatz[k]=1;}}// A3b: Fläche der großen Arena
 // B0: Felder unter der Sandgrube (rund, Mitte der Feldmitte näher als r): gesperrt für alle, gezeichnet von welt-arena.js
 for(const r of [A.vorplatz,A.gang])if(r)for(let y=r[1];y<r[1]+r[3];y++)for(let x=r[0];x<r[0]+r[2];x++){const k=ix(x+O,y+O);feld[k]=T.LUDUS;fest[k]=1;}// B0b: festgetretener Boden, nur für Gladiatoren (kein Weg für Besucher)
 if(A.schlange)for(const [x0,y0,w,h] of A.schlange)for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)feld[ix(x+O,y+O)]=T.KIES;
 if(A.sandgrube){const [cx,cy]=A.sandgrube.c,r=A.sandgrube.r;for(let y=Math.floor(cy-r);y<=Math.ceil(cy+r);y++)for(let x=Math.floor(cx-r);x<=Math.ceil(cx+r);x++)if(Math.hypot(x+.5-cx,y+.5-cy)<r&&inMap(x+O,y+O)){const k=ix(x+O,y+O);feld[k]=T.ARENA_BAU;fest[k]=1;}}
 // A3b: Grenzen folgen den geschwungenen Rändern. Jede Kante zwischen zwei Feldern verschiedener Bereiche bekommt Zaun (Park)
 // oder Palisade (Dorf, Rückseite des Platzes); offen bleiben die Tore und der Platz zur Straße hin.
 const imTor=(t,i)=>i>=t[0]&&i<t[0]+t[1],B=BER;
 const art=(a,b,waag,lx,ly)=>{const zu=x=>a===x||b===x;
  if(zu(B.PARK))return waag&&ly===58&&imTor(A.parktor,lx)||!waag&&lx===A.park[0]&&zu(B.PLATZ)&&imTor(A.kaempfertor,ly)?0:1;
  if(zu(B.DORF))return waag&&ly===58&&imTor(A.dorftor,lx)||!waag&&lx===A.platz[0]&&zu(B.PLATZ)&&imTor(A.durchgang,ly)?0:2;
  return waag&&ly===A.platz[1]?2:0;};// Platz: nur hinten eine Palisade
 for(let ty=BY0;ty<=BY1;ty++)for(let tx=BX0;tx<=BX1;tx++){const k=ix(tx,ty),b=ber[k],bo=ber[k-N],bl=ber[k-1];
  if(b!==bo){const v=art(b,bo,1,tx-O,ty-O);if(v)zaunA[k]=v;}if(b!==bl){const v=art(b,bl,0,tx-O,ty-O);if(v)zaunB[k]=v;}}
 TORE.push({art:'park',tx:A.parktor[0]+O,ty:A.park[1]+A.park[3]+O,w:A.parktor[1],dir:0},{art:'dorf',tx:A.dorftor[0]+O,ty:A.dorf[1]+A.dorf[3]+O,w:A.dorftor[1],dir:0},
  {art:'kaempfer',tx:A.park[0]+O,ty:A.kaempfertor[0]+O,w:A.kaempfertor[1],dir:1});}
// Naturobjekte (welt-natur.js): je Feld höchstens eines. Alles darauf ist entfernbar (obj = 0); nicht am Weg, nicht um den Ludus.
const NASS_OK=new Set(['Schilf','Seerosen','Moorhand']),NB=window.WeltNatur,obj=new Uint8Array(N*N),BODEN_NATUR=new Set([T.WIESE,T.WALD,T.SAND,T.DSCH,T.SUMPF,T.MOOR,T.FLUSS,T.FELS,T.SCHNEE,T.ERDE,T.KIES,T.SCHLAMM,T.GEROELL,T.TROCKEN,T.NADEL]),
 BODEN_NAME={[T.WIESE]:'wiese',[T.WALD]:'wald',[T.SAND]:'sand',[T.DSCH]:'dsch',[T.SUMPF]:'sumpf',[T.MOOR]:'moor',[T.FLUSS]:'wasser',[T.FELS]:'fels',[T.SCHNEE]:'schnee',[T.ERDE]:'erde',[T.KIES]:'kies',[T.SCHLAMM]:'schlamm',[T.GEROELL]:'geroell',[T.TROCKEN]:'trocken',[T.NADEL]:'nadel'};
// A3b: was in Dorf und Park wächst und liegt: locker verteilt, von allem ein bisschen (Thomas: „nichts zu dicht“).
const NA=NB&&{eiche:NB.nr('Eiche'),birke:NB.nr('Birke'),stein:NB.nr('Feldstein'),moos:NB.nr('Moosfels'),gras:NB.nr('Grasbüschel'),duerr:NB.nr('Dürrbusch'),schilf:NB.nr('Schilf'),rose:NB.nr('Seerosen')};
function naturBereich(k,t,tx,ty){const r=h2(tx,ty,71),q=h2(tx,ty,72),c=hc.subarray(k*4,k*4+4),hm=(c[0]+c[1]+c[2]+c[3])/4;
 if(t===T.FLUSS)return r<.22?(q<.6?NA.rose:NA.schilf):0;// Teich
 if(Math.min(c[0],c[1],c[2],c[3])<=WL)return r<.3?NA.schilf:0;// Ufer
 if(t===T.WALD||biom[k]===B_.WALD)return NB.waehle(B_.WALD,BODEN_NAME[t],tx,ty,fbm(tx/14,ty/14,6)*.6);// Wäldchen und Haine
 if(t===T.SAND)return r<.05?NA.stein:r<.11?NA.gras:r<.14?NA.duerr:0;// Sand- und Kiesflecken
 if(hm>=2&&r<.025)return q<.5?NA.stein:NA.moos;// Felsbrocken auf den Hügeln
 if(r<.006)return q<.6?NA.eiche:NA.birke;// Einzelbäume auf der Wiese
 return NB.waehle(0,'wiese',tx,ty,0);}
if(NB)for(let ty=0;ty<N;ty++)for(let tx=0;tx<N;tx++){const k=ix(tx,ty),t=feld[k],lx=tx-O,ly=ty-O;if(!BODEN_NATUR.has(t)||Math.abs(ty-wy[tx]-.5)<=1.6)continue;const inB=!!ANORD&&nah[k]===0;if(ANORD?(inB?bfrei[k]:nah[k]<=1):(lx>=24&&lx<=74&&ly>=20&&ly<=64))continue;
 let o=inB?naturBereich(k,t,tx,ty):!GROSS&&NB.waehleAlt?NB.waehleAlt(biom[k],BODEN_NAME[t],tx,ty,fbm(tx/14,ty/14,6)):NB.waehle(biom[k],BODEN_NAME[t],tx,ty,fbm(tx/14,ty/14,6),GROSS&&fbm(tx/24,ty/24,81)>.66);
 // Keine Bäume im Wasser (Thomas 12.11.): im Wasser, im Moor und am Ufer (eine Ecke auf Wasserhöhe) nur Schilf, Seerosen, Moorhand
 if(o&&!NASS_OK.has(NB.ARTEN[o].name)&&(t===T.FLUSS||t===T.MOOR||Math.min(hc[k*4],hc[k*4+1],hc[k*4+2],hc[k*4+3])<=WL))o=0;
 obj[k]=o;}
// Halle der Toten (Thomas 12.11.): nicht mehr im Ludus, sondern etwas abseits westlich davon am Waldrand. 5 × 3 Halle, davor
// ein Gräberplatz 5 × 2 (10 Grabstellen, welt-gebaeude.js), ein Kiespfad hinunter zum Weg. Fest: nicht baubar, nicht abreißbar.
// A3 (2.0): Die Halle steht im Park an der Seite des Platzes; Besucher kommen über den Kiesweg im Park (HALLE.unten), nicht von der Straße.
const HALLE=ANORD?{tx:ANORD.halle[0]+O,ty:ANORD.halle[1]+O,w:5,h:3,hofH:2}:{tx:LUD.tx-18,w:5,h:3,hofH:2};HALLE.pfadX=HALLE.tx+2;
if(ANORD){HALLE.unten={x:HALLE.pfadX+.5,y:ANORD.pfade[3][1]+O+.5};for(let y=HALLE.ty;y<HALLE.ty+HALLE.h+HALLE.hofH;y++)for(let x=HALLE.tx;x<HALLE.tx+HALLE.w;x++){const k=ix(x,y);obj[k]=0;feld[k]=y-HALLE.ty<HALLE.h?T.HALLE:T.GRAB;}}
else{HALLE.ty=Math.min(WEG_TY,wy[HALLE.pfadX])-13;// gut 8 Felder Pfad bis zum Weg
for(let y=HALLE.ty-1;y<Math.max(WEG_TY,wy[HALLE.pfadX]);y++)for(let x=HALLE.tx-1;x<=HALLE.tx+HALLE.w;x++){const k=ix(x,y),inR=x>=HALLE.tx&&x<HALLE.tx+HALLE.w,hy=y-HALLE.ty;obj[k]=0;
 if(inR&&hy>=0&&hy<HALLE.h)feld[k]=T.HALLE;else if(inR&&hy>=HALLE.h&&hy<HALLE.h+HALLE.hofH)feld[k]=T.GRAB;else if(x===HALLE.pfadX&&hy>=HALLE.h+HALLE.hofH)feld[k]=T.WEG;else if(feld[k]!==T.WEG&&feld[k]!==T.FLUSS)feld[k]=T.WIESE;}}
const ovar=(tx,ty)=>NB?(GROSS?NB.variante(tx,ty):NB.varianteAlt(tx,ty)):0;// Editor: Varianten wie vor T3
// ---------- Kleinzeug (T3, Thomas 13.11.2026) ----------
// kz[k]: wie viele kleine Sachen (Gras, Blumen, Kiesel, Laub, Knochen …) auf dem Feld liegen, 0…7. Welche und wo, wird beim
// Zeichnen eines Bodenstücks aus dem Feld berechnet (kleinMalen), nicht gespeichert. Bauen, Abreißen, Roden und Gelände setzen
// kz[k] = 0 (geräumt); nur das kommt in den Spielstand. Wildnis dicht, Dorf und Park mäßig, nicht am Weg, nicht im Wasser.
const kz=new Uint8Array(N*N),KLEIN_N={wald:[5,7],nadel:[5,7],dsch:[5,7],sumpf:[5,7],wiese:[5,7],trocken:[5,7],sand:[3,6],kies:[3,6],geroell:[3,6],erde:[3,6],schlamm:[3,6],fels:[3,6],schnee:[2,4],moor:[1,3]};
if(NB&&GROSS&&NB.kleinArt)for(let ty=0;ty<N;ty++)for(let tx=0;tx<N;tx++){const k=ix(tx,ty),t=feld[k];if(!BODEN_NATUR.has(t)||t===T.FLUSS||Math.abs(ty-wy[tx]-.5)<=1.6)continue;
 if(Math.min(hc[k*4],hc[k*4+1],hc[k*4+2],hc[k*4+3])<WL)continue;/* unter Wasser nichts, am Ufer schon */const inB=!!ANORD&&nah[k]===0,r=h2(tx,ty,301);
 if(inB){if(bfrei[k]||ber[k]===BER.PLATZ)continue;kz[k]=r<.35?0:r<.78?1:2;continue;}// Dorf und Park: mäßig
 if(ANORD&&nah[k]<=1)continue;const z=KLEIN_N[BODEN_NAME[t]];if(z)kz[k]=z[0]+Math.min(z[1]-z[0],(r*(z[1]-z[0]+1))|0);}
// Kleinzeug eines Feldes in ein Bodenstück malen (Weltkoordinaten; nur was im Stück liegt)
function kleinMalen(g,tx,ty,k,y0,y1){const n=kz[k];if(!n)return;const bo=BODEN_NAME[feld[k]];if(!bo)return;const bi=biom[k];
 for(let i=0;i<n;i++){const a=NB.kleinArt(bi,bo,h2(tx,ty,310+i),h2(tx,ty,320+i));if(!a)continue;const u=tx+.14+h2(tx,ty,330+i)*.72,v=ty+.14+h2(tx,ty,340+i)*.72,
  b=NB.bild(a,(h2(tx,ty,350+i)*NB.VARN*2)|0),X=(u-v)*TW/2+OX,Y=(u+v)*TH/2+OY-hoehe(u,v)*HZ;if(Y<y0-12||Y>y1+12)continue;g.drawImage(b.img,Math.round(X-b.ax),Math.round(Y-b.ay));}}

// ---------- Bildchen: Felder und Bäume ----------
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.imageSmoothingEnabled=false;return [c,g];}
const PAL=[
 [[86,114,60],[94,122,66],[78,104,55],[101,128,70]],// Wiese
 [[58,82,46],[64,90,50],[52,74,42],[70,96,54]],// Waldboden
 [[176,150,104],[188,162,114],[164,138,94],[198,174,128]],// Weg
 [[52,104,150],[60,116,162],[46,94,138],[86,142,182]],// Fluss
 [[122,90,57],[108,78,48],[134,100,64],[96,70,43]],// Brücke
 [[160,136,100],[168,144,106],[152,128,94],[174,150,112]],// Ludus-Boden
 [[112,106,96],[120,114,104],[104,98,90],[126,120,110]],// Gebäudefläche
 [[214,194,146],[222,202,154],[206,186,138],[226,208,162]],// Übungsplatz
 [[224,190,128],[232,200,140],[214,178,116],[238,210,154]],// Kampffläche der Arena (heller Sand)
 [[120,112,100],[128,120,108],[112,104,94],[134,126,114]],// Boden unter einer Tribüne
 [[134,104,70],[142,112,76],[124,96,64],[96,122,66]],// Straße 1: Trampelpfad (Erde, am Rand Gras)
 [[168,160,144],[184,176,160],[146,138,124],[204,198,184]],// Straße 2: Kiesweg
 [[150,142,130],[164,156,142],[136,128,116],[92,86,78]],// Straße 3: Pflasterweg (4. Farbe = Fugen)
 [[176,172,164],[188,184,176],[166,162,154],[104,100,94]],// Straße 4: Steinstraße (große Platten)
 [[232,226,214],[240,236,226],[222,214,200],[168,74,52]],// Straße 5: Prachtstraße (heller Marmor, rotes Band)
 [[150,112,70],[160,121,77],[140,103,63],[92,64,38]],// Mannschaftsstube: Dielenboden (4. Farbe = Fugen)
 [[104,86,60],[114,95,66],[92,76,52],[168,146,84]],// Rattenloch: gestampfter Dreck, dazwischen Strohhalme
 [[226,220,206],[60,66,84],[176,60,48],[206,168,74]],// Fürstengemächer: Mosaik (hell, dunkel, rot, gold)
 [[92,78,60],[80,68,52],[104,88,66],[34,30,28]],// Rostgrube: festgetretener Dreck mit Ruß
 [[132,126,116],[144,138,128],[120,114,106],[78,72,66]],// Waffenschmiede: Steinplatten (4. Farbe = Fugen)
 [[54,52,58],[64,62,68],[46,44,50],[184,140,72]],// Kaiserliche Waffenschmiede: dunkler Basalt mit Bronzeeinlage
 [[216,186,126],[224,196,136],[206,174,116],[186,152,98]],// Sand (4. Farbe = Rippel)
 [[42,80,38],[50,92,44],[36,70,34],[74,112,52]],// Dschungelboden (4. Farbe = Laub)
 [[84,90,56],[94,100,62],[74,80,50],[60,64,42]],// Sumpf (4. Farbe = Pfützen)
 [[46,68,56],[54,78,64],[40,60,50],[96,116,82]],// Moorwasser (4. Farbe = Algen)
 [[128,120,110],[140,132,120],[114,106,98],[100,94,88]],// Fels
 [[234,238,244],[222,228,236],[244,246,250],[204,212,226]],// Schnee
 [[96,80,62],[84,70,54],[108,90,70],[112,30,26]],// Knochengrube: Dreck (4. Farbe = altes Blut)
 [[118,112,92],[106,100,82],[130,124,104],[84,80,64]],// Beastrium: Bruchsteinboden (4. Farbe = Fugen)
 [[226,220,206],[150,40,38],[206,168,74],[176,168,156]],// Kaiserliche Menagerie: Marmor mit rotem Rautenband und Gold
 [[118,92,62],[104,80,54],[130,102,70],[58,44,30]],// Bretterbude: grobe Bretter (4. Farbe = Spalten)
 [[150,140,124],[138,128,112],[160,150,134],[96,88,76]],// Kaserne: Steinplatten (4. Farbe = Fugen)
 [[222,214,198],[132,36,34],[206,168,74],[92,84,78]],// Prätorianerkaserne: weiß-rotes Schachbrett mit Gold
 [[74,58,42],[68,53,38],[80,63,45],[94,31,28]],// Medicus: dunkle Dielen wie im Behandlungsraum des Spiels (4. Farbe = Blut)
 [[206,202,190],[196,192,180],[216,212,200],[150,146,134]],// Krankenhaus: helle Fliesen (4. Farbe = Fugen)
 [[154,131,88],[140,118,80],[171,148,106],[123,102,66]],// Sklavenmarkt: festgetretene Erde wie im Spiel
 [[46,50,48],[38,42,40],[56,60,57],[26,29,28]],// Halle der Toten: dunkler Stein wie im Spiel
 [[74,86,58],[66,78,52],[84,96,66],[132,128,112]],// Gräberplatz: dunkles Gras mit Kieswegen
 // T3: Böden je Biom
 [[112,84,56],[102,76,50],[124,94,62],[84,62,40]],// Erde (4. Farbe = Klumpen)
 [[150,144,132],[162,156,144],[138,132,122],[108,102,94]],// Kies (4. Farbe = Fugen)
 [[86,70,50],[76,62,44],[96,78,56],[112,118,104]],// Schlamm (4. Farbe = nasser Glanz)
 [[116,110,102],[130,124,114],[102,96,88],[78,74,68]],// Geröll (4. Farbe = Schatten)
 [[146,140,84],[158,150,92],[134,128,76],[118,108,62]],// Trockengras (4. Farbe = Halme)
 [[74,60,42],[84,68,46],[64,52,36],[104,80,46]],// Nadelstreu (4. Farbe = Nadeln)
 [[230,224,210],[216,208,192],[190,182,166],[118,30,28]],// A4 Verwaltung: Marmorplatten mit feinen Fugen (4. Farbe = alter Blutfleck)
 [[86,114,60],[94,122,66],[78,104,55],[101,128,70]]// B0 Arena: wie Wiese (sieht man nur an den Rändern der runden Fassade; welt-arena.js zeichnet darüber)
];
const VAR=3,sprites=[[],[]];// [ohne Raster, mit Raster][typ*VAR+v]
function tileSprite(t,v,grid){const [c,g]=mkCanvas(TW,TH+1),img=g.createImageData(TW,TH+1),d=img.data,P=PAL[t];
 for(let y=0;y<=TH;y++)for(let x=0;x<TW;x++){const e=Math.abs(x-31.5)/32+Math.abs(y-16)/16;if(e>1.001)continue;let n=h2(x>>1,y,t*17+v*5),col=P[n<.5?0:n<.72?1:n<.9?2:3];
  if(t===T.SAND){const a=(x-31.5)/32,b=(y-16)/16,ux=(a+b+1)/2,uy=(b-a+1)/2,wl=(ux*2.2+uy*.8+Math.sin(uy*6+v)*.12)%1;col=wl<.1?P[3]:P[n<.55?0:n<.85?1:2];if(n>.985)col=[168,140,96];}
  if(t===T.DSCH){col=P[n<.5?0:n<.8?1:2];if(h2(x>>1,y,v+51)>.9)col=P[3];if(h2(x,y,v+53)>.988)col=[120,70,40];}
  if(t===T.SUMPF){col=P[n<.5?0:n<.8?1:2];if(h2(x>>2,y>>1,v+61)>.82)col=P[3];if(h2(x,y,v+63)>.97)col=[110,130,70];}
  if(t===T.MOOR){col=P[n<.6?0:n<.88?1:2];if(h2(x>>1,y,v+71)>.94)col=P[3];}
  // T3: neue Böden
  if(t===T.ERDE){col=P[n<.5?0:n<.8?1:2];if(h2(x>>2,y>>1,v+101)>.9)col=P[3];}
  if(t===T.KIES){col=P[n<.4?0:n<.75?1:2];if(h2(x>>1,y,v+103)>.82)col=P[3];if(h2(x,y,v+104)>.97)col=[184,178,166];}
  if(t===T.SCHLAMM){col=P[n<.55?0:n<.85?1:2];if(h2(x>>3,y>>1,v+105)>.9)col=P[3];}
  if(t===T.GEROELL){const b2=h2(x>>2,y>>1,v+107);col=b2>.8?P[3]:b2<.3?P[2]:P[n<.5?0:1];if(h2(x,y,v+108)>.95)col=[150,144,134];}
  if(t===T.TROCKEN){col=P[n<.45?0:n<.8?1:2];if(h2(x,y>>1,v+109)>.88)col=P[3];}
  if(t===T.NADEL){col=P[n<.5?0:n<.8?1:2];if(h2(x,y,v+111)>.9)col=P[3];if(h2(x>>2,y>>1,v+112)>.95)col=[58,74,40];}
  if(t===T.SCHM_S){col=P[n<.5?0:n<.8?1:2];if(h2(x>>2,y>>1,v+41)>.84)col=P[3];if(h2(x,y,v+43)>.996)col=[176,92,40];}
  if(t===T.SCHMIEDE||t===T.SCHM_K){const a=(x-31.5)/32,b=(y-16)/16,ux=(a+b+1)/2,uy=(b-a+1)/2,k3=t===T.SCHMIEDE?3:2,cx=(ux*k3)%1,cy=((uy*k3)+(t===T.SCHMIEDE?(((ux*k3)|0)&1)*.5:0))%1;col=cx<.06||cy<.06?P[3]:P[n<.6?0:n<.86?1:2];if(t===T.SCHMIEDE&&n>.965)col=[64,60,56];}
  if(t===T.BST_S){col=P[n<.5?0:n<.8?1:2];if(h2(x>>2,y>>1,v+81)>.955||h2(x>>3,y>>2,v+83)>.97)col=P[3];if(h2(x,y,v+85)>.994)col=[220,212,190];}
  if(t===T.BEAST){const a=(x-31.5)/32,b=(y-16)/16,ux=(a+b+1)/2,uy=(b-a+1)/2,r=(uy*3)|0,cx=(ux*3+(r&1)*.5)%1,cy=(uy*3)%1;col=cx<.07||cy<.08?P[3]:P[(h2(r,(ux*3+(r&1)*.5)|0,v+87)*3)|0];if(h2(x>>1,y,v+89)>.95)col=[196,170,100];}
  if(t===T.HALLE){const a=(x-31.5)/32,b=(y-16)/16,ux=(a+b+1)/2,uy=(b-a+1)/2,cx=(ux*2)%1,cy=(uy*2)%1;col=cx<.06||cy<.06?P[3]:P[(h2((ux*2)|0,(uy*2)|0,v+93)*3)|0];}
  if(t===T.GRAB){const a=(x-31.5)/32,b=(y-16)/16,ux=(a+b+1)/2,uy=(b-a+1)/2;col=P[n<.45?0:n<.8?1:2];if(uy>.82||ux<.08||ux>.92)col=h2(x,y,v+94)>.4?P[3]:[118,114,98];}
  if(t===T.MEDICUS){const a=(x-31.5)/32,b=(y-16)/16,ux=(a+b+1)/2,uy=(b-a+1)/2,pl=(uy*6)|0;col=(uy*6)%1<.14?[58,44,31]:P[(h2(pl,v,95)*3)|0];if(h2(x>>2,y>>1,v+99)>.93||h2(x>>3,y>>2,v+98)>.96)col=P[3];}
  else if(t===T.KRANK){const a=(x-31.5)/32,b=(y-16)/16,ux=(a+b+1)/2,uy=(b-a+1)/2,cx=(ux*3)%1,cy=(uy*3)%1;col=cx<.05||cy<.05?(t===T.KRANK?P[3]:[150,144,132]):P[(h2((ux*3)|0,(uy*3)|0,v+97)*3)|0];if(t===T.MEDICUS&&(h2(x>>2,y>>1,v+99)>.95||h2(x>>3,y>>2,v+98)>.975))col=P[3];}
  if(t===T.KAS_S){const a=(x-31.5)/32,b=(y-16)/16,ux=(a+b+1)/2,uy=(b-a+1)/2,pl=(uy*5)|0;col=(uy*5)%1<.14?P[3]:P[(h2(pl,v,79)*3)|0];if(n>.95)col=P[3];}
  if(t===T.KASERNE){const a=(x-31.5)/32,b=(y-16)/16,ux=(a+b+1)/2,uy=(b-a+1)/2,cx=(ux*2)%1,cy=(uy*2)%1;col=cx<.06||cy<.06?P[3]:P[(h2((ux*2)|0,(uy*2)|0,v+91)*3)|0];}
  if(t===T.VERWALTUNG){const a=(x-31.5)/32,b=(y-16)/16,ux=(a+b+1)/2,uy=(b-a+1)/2,m=Math.min(ux,uy,1-ux,1-uy);const fu=(ux*2)%1<.04||(uy*2)%1<.04;col=m<.025||fu?P[2]:(((ux*2)|0)+((uy*2)|0))%2?P[1]:P[0];if(!fu&&m>=.025&&h2(x>>2,y>>1,v+113)>.992)col=P[3];}// A4: Marmor, feine Fugen, selten Blut
  if(t===T.KAS_K){const a=(x-31.5)/32,b=(y-16)/16,ux=(a+b+1)/2,uy=(b-a+1)/2,m=Math.min(ux,uy,1-ux,1-uy);col=m<.04?P[2]:(((ux*4)|0)+((uy*4)|0))%2?P[1]:P[0];if(m<.04&&n>.7)col=P[3];}
  if(t===T.BST_K){const a=(x-31.5)/32,b=(y-16)/16,ux=(a+b+1)/2,uy=(b-a+1)/2,m=Math.min(ux,uy,1-ux,1-uy),d=Math.abs(ux-.5)+Math.abs(uy-.5);col=m<.025?P[3]:m<.06?P[2]:Math.abs(d-.3)<.022?P[1]:P[0];if(col===P[0]&&n>.96)col=[212,208,200];}
  if(t===T.UNT_S){col=P[n<.45?0:n<.7?1:n<.9?2:0];if(h2(x>>1,y,v+31)>.93)col=P[3];if(h2(x>>3,y>>2,v+33)>.86)col=[70,58,40];}
  if(t===T.UNT_K){const a=(x-31.5)/32,b=(y-16)/16,ux=(a+b+1)/2,uy=(b-a+1)/2,m=Math.min(ux,uy,1-ux,1-uy),cx=(ux*4)|0,cy=(uy*4)|0;col=m<.06?P[3]:m<.14?P[2]:m<.18?P[3]:(cx+cy)%2?P[1]:P[0];if(Math.abs(ux-.5)+Math.abs(uy-.5)<.1)col=P[3];}
  if(t===T.UNTERKUNFT){const a=(x-31.5)/32,b=(y-16)/16,ux=(a+b+1)/2,uy=(b-a+1)/2,pl=(uy*4)|0,d=h2(pl,v,77);col=(uy*4)%1<.1||Math.abs(((ux+d)%1+1)%1-.5)<.02?P[3]:P[(h2(pl,(ux*3+d*3)|0,v+5)*3)|0];if(n>.93)col=P[2];}
  if(t===T.BRUECKE&&((x+y*2)>>2)%3===0)col=P[3];if(t===T.FLUSS&&((x+y*3+v*7)%23)<3&&n>.4)col=P[3];
  let k=1;if(grid&&e>.93)k=y>16?.8:.9;const o=(y*TW+x)*4;d[o]=col[0]*k;d[o+1]=col[1]*k;d[o+2]=col[2]*k;d[o+3]=255;}
 g.putImageData(img,0,0);return c;}
for(let gr=0;gr<2;gr++)for(let t=0;t<PAL.length;t++)for(let v=0;v<VAR;v++)sprites[gr][t*VAR+v]=tileSprite(t,v,!!gr);
// Straßen wie die Fußwege bei RollerCoaster Tycoon: Der Belag füllt das Feld nicht aus. In der Mitte liegt ein Stück Weg,
// und nur zu den Seiten, an denen eine weitere Straße (oder der alte Weg, eine Brücke) anschließt, läuft ein Arm bis zum Feldrand.
// So entstehen Geraden, Kurven, Abzweige und Kreuzungen von selbst. Ein Bild je Straßenart und Anschlussmuster (16), bei Bedarf gemalt,
// durchsichtig außerhalb des Belags; darunter liegt der normale Boden.
const STR_W=.3,strCache=new Map(),istStr=t=>t>=T.STR1&&t<=T.STR5,schliesstAn=t=>istStr(t)||t===T.WEG||t===T.BRUECKE;
// T2: Brücken auf Bodenhöhe (welt-bruecke.js, W.brueckeAnschluss) öffnen den Randstein wie ein Weg
const anB=(k,n)=>!!window.WeltKarte?.brueckeAnschluss?.(k,n),an=(k,n)=>schliesstAn(feld[n])||anB(k,n);
function strMaske(tx,ty){let m=0;const k=ix(tx,ty);if(tx+1<N&&an(k,k+1))m|=1;if(tx>0&&an(k,k-1))m|=2;if(ty+1<N&&an(k,k+N))m|=4;if(ty>0&&an(k,k-N))m|=8;return m;}
function strBild(t,m){const key=t*16+m;let c=strCache.get(key);if(c)return c;const [cv,g]=mkCanvas(TW,TH+1),img=g.createImageData(TW,TH+1),d=img.data,P=PAL[t];
 const innen=(ux,uy,w)=>{const dx=ux-.5,dy=uy-.5,ax=Math.abs(dx),ay=Math.abs(dy);return (ax<=w&&ay<=w)||(ay<=w&&((m&1)&&dx>0||(m&2)&&dx<0))||(ax<=w&&((m&4)&&dy>0||(m&8)&&dy<0));};
 for(let y=0;y<=TH;y++)for(let x=0;x<TW;x++){const a=(x-31.5)/32,b=(y-16)/16;if(Math.abs(a)+Math.abs(b)>1.001)continue;const ux=(a+b+1)/2,uy=(b-a+1)/2,n=h2(x>>1,y,t*17);let col=null;
  if(t===T.STR1){// Trampelpfad: schmaler, ausgefranster Erdstreifen ohne Randstein
   const w=STR_W-.07+(h2(x>>2,y>>1,91)-.5)*.09;if(innen(ux,uy,w))col=!innen(ux,uy,w-.05)&&n>.55?null:P[n<.5?0:n<.8?1:2];}
  else if(innen(ux,uy,STR_W)){
   if(!innen(ux,uy,STR_W-.045))col=t===T.STR5?[150,140,124]:[Math.round(P[2][0]*.62),Math.round(P[2][1]*.62),Math.round(P[2][2]*.62)];// Randstein
   else if(t===T.STR2)col=P[(h2(x,y,t)*4)|0];
   else if(t===T.STR3){const cx=(ux*6)%1,cy=((uy*6)+(((ux*6)|0)&1)*.5)%1;col=cx<.2||cy<.2?P[3]:P[n<.6?0:n<.85?1:2];}
   else if(t===T.STR4){const cx=((ux+.25)*2)%1,cy=((uy+.25)*2)%1;col=cx<.07||cy<.07?P[3]:P[n<.7?0:n<.9?1:2];}
   else col=!innen(ux,uy,STR_W-.11)?P[3]:Math.abs(ux-.5)+Math.abs(uy-.5)<.09?[215,178,74]:P[n<.7?0:n<.92?1:2];}
  if(!col)continue;const o=(y*TW+x)*4;d[o]=col[0];d[o+1]=col[1];d[o+2]=col[2];d[o+3]=255;}
 g.putImageData(img,0,0);strCache.set(key,cv);return cv;}
// Schräge Felder: das flache Bild auf die vier Eckhöhen verziehen, zwei Dreiecke mit eigener Helligkeit (Licht von links oben).
// Einmal je Bild und Form gemalt und gemerkt. Form f = Höhe jeder Ecke über der tiefsten (0…2), als Zahl zur Basis 3.
const HOB=2*HZ,hangCache=new Map();
const teilung=(a,b,c,d)=>Math.abs(a-c)>Math.abs(b-d);// wahr: Teilung entlang rechts–links, sonst oben–unten
function ebenen(a,b,c,d){return teilung(a,b,c,d)?[[a,b-a,d-a,0],[b+d-c,c-d,c-b,1]]:[[a,b-a,c-b,2],[a,c-d,d-a,3]];}// h = A + B·u + C·v
const imDreieck=(r,u,v)=>r===0?u+v<=1.0001:r===1?u+v>=.9999:r===2?u>=v-.0001:u<=v+.0001;
function hangBild(src,key){let cv=hangCache.get(key);if(cv)return cv;const f=+key.slice(key.lastIndexOf(':')+1),tr=ebenen(f%3,((f/3)|0)%3,((f/9)|0)%3,((f/27)|0)%3);
 if(!src._d)src._d=src.getContext('2d').getImageData(0,0,TW,TH+1).data;const s=src._d,HH=TH+1+HOB,[c,g]=mkCanvas(TW,HH),im=g.createImageData(TW,HH),d=im.data,kk=tr.map(e=>clamp(1+.075*(e[1]-e[2]),.8,1.2));
 for(let X=0;X<TW;X++){const dd=(X-31.5)/32;for(let Y=0;Y<HH;Y++)for(let r=0;r<2;r++){const [A,B,C,typ]=tr[r],sv=(Y-HOB+HZ*A+HZ*(B-C)/2*dd)/(16-HZ*(B+C)/2),u=(sv+dd)/2,v=(sv-dd)/2;
  if(u<-.001||v<-.001||u>1.001||v>1.001||!imDreieck(typ,u,v))continue;const so=(clamp(Math.round(16*sv),0,TH)*TW+X)*4;if(!s[so+3])break;const o=(Y*TW+X)*4,k=kk[r];
  d[o]=Math.min(255,s[so]*k);d[o+1]=Math.min(255,s[so+1]*k);d[o+2]=Math.min(255,s[so+2]*k);d[o+3]=s[so+3];break;}}
 g.putImageData(im,0,0);hangCache.set(key,c);return c;}
// Höhe an einer Stelle (Feldkoordinaten, in Stufen), wie die Dreiecke des Feldes sie zeigen
function hoehe(fx,fy){const tx=clamp(Math.floor(fx),0,N-1),ty=clamp(Math.floor(fy),0,N-1),u=clamp(fx-tx,0,1),v=clamp(fy-ty,0,1),k=(ty*N+tx)*4,a=hc[k],b=hc[k+1],c=hc[k+2],d=hc[k+3];
 if(teilung(a,b,c,d))return u+v<=1?a+(b-a)*u+(d-a)*v:b+d-c+(c-d)*u+(c-b)*v;return u>=v?a+(b-a)*u+(c-b)*v:a+(c-d)*u+(d-a)*v;}
const hz=(fx,fy)=>GROSS?hoehe(fx,fy)*HZ:0;
// T1 Hangtempo (Thomas 13.11.2026): bergauf bis 15 % langsamer, bergab bis 15 % schneller. (x,y) Bodenpunkt, (ux,uy) Laufrichtung (Einheit).
// Steigung = Stufen je Feld ein halbes Feld voraus; eine Stufe je Feld zählt voll. Zwei Höhen je Läufer und Bild, sonst nichts.
function hangF(x,y,ux,uy){if(!GROSS)return 1;const a=tileAt(x,y),b=tileAt(x+ux*16,y+uy*16),d=Math.hypot(b.tx-a.tx,b.ty-a.ty)||1;
 return 1-clamp((hoehe(b.tx,b.ty)-hoehe(a.tx,a.ty))/d,-1,1)*.15;}
const objHz=(tx,ty)=>GROSS?(feld[ix(tx,ty)]===T.FLUSS?Math.max(WL,hoehe(tx+.5,ty+.5)):hoehe(tx+.5,ty+.5))*HZ:0;
// Klippen: Erdwand an den beiden vorderen Kanten, wo das Nachbarfeld tiefer liegt; am Kartenrand bis zum Grund (BASIS)
const WANDF={fels:['#6c645c','#867e76'],sand:['#a58250','#bf9861'],erde:['#5c4027','#785533'],holz:['#47301e','#5c4028']};
const wandArt=t=>t===T.FELS||t===T.SCHNEE||t===T.GEROELL?WANDF.fels:t===T.SAND||t===T.KIES?WANDF.sand:t===T.BRUECKE?WANDF.holz:WANDF.erde,BASIS=()=>Math.min(HMIN,WL)-3;
function wand(g,x1,y1,ha,hb,na,nb,x2,y2,col){if(ha<=na&&hb<=nb)return;g.fillStyle=col;g.beginPath();g.moveTo(x1,y1-Math.max(ha,na)*HZ);g.lineTo(x2,y2-Math.max(hb,nb)*HZ);g.lineTo(x2,y2-nb*HZ);g.lineTo(x1,y1-na*HZ);g.closePath();g.fill();}
// Wasser: flach auf WL, nur wo der Boden darunter liegt (beide Dreiecke an WL abgeschnitten, ein Pfad, keine Naht)
function wasser(g,x,y,a,b,c,d,tx,ty){const P=[[0,0,a],[1,0,b],[1,1,c],[0,1,d]],tr=teilung(a,b,c,d)?[[0,1,3],[1,2,3]]:[[0,1,2],[0,2,3]],X=(u,v)=>x+32+(u-v)*32,Y=(u,v)=>y+(u+v)*16-WL*HZ;
 g.beginPath();for(const t of tr){const q=[];for(let i=0;i<3;i++){const p=P[t[i]],n=P[t[(i+1)%3]],pi=p[2]<WL;if(pi)q.push(p);if(pi!==(n[2]<WL)){const s=(WL-p[2])/(n[2]-p[2]);q.push([p[0]+(n[0]-p[0])*s,p[1]+(n[1]-p[1])*s]);}}
  if(q.length<3)continue;g.moveTo(X(q[0][0],q[0][1]),Y(q[0][0],q[0][1]));for(let i=1;i<q.length;i++)g.lineTo(X(q[i][0],q[i][1]),Y(q[i][0],q[i][1]));g.closePath();}
 g.fillStyle='#3d6f9c';g.fill();
 if(Math.max(a,b,c,d)<WL&&h2(tx,ty,7)>.62){g.fillStyle='#6d9cc4';const ox=(x+16+h2(tx,ty,8)*28)|0,oy=(y+10+h2(tx,ty,9)*12-WL*HZ)|0;g.fillRect(ox,oy,6,1);g.fillRect(ox+3,oy+3,5,1);}}
// T3: weiche Übergänge zwischen Naturböden. Grenzt ein Feld an einen Boden mit höherem Rang (SAUM_P), malt es an dieser Kante
// einen ausgefransten Saum aus dem Nachbarboden darüber. Ein Bild je Boden, Kante und Variante, einmal gemalt und gemerkt;
// am Hang wie der Boden verzogen (hangBild). Kante 0: Nachbar tx+1, 1: tx−1, 2: ty+1, 3: ty−1.
let saumAn=false;// nur beim Zeichnen naher Bodenstücke (lod 1); weit weg sieht man die Säume nicht
const SAUM_P={[T.SCHNEE]:13,[T.WIESE]:12,[T.TROCKEN]:11,[T.WALD]:10,[T.NADEL]:9,[T.DSCH]:8,[T.SUMPF]:7,[T.MOOR]:6,[T.SCHLAMM]:5,[T.ERDE]:4,[T.KIES]:3,[T.SAND]:2,[T.GEROELL]:1,[T.FELS]:0},saumCache=new Map();
function saumBild(sp,gr,nt,kante,v){const key=(gr*64+nt)*16+kante*4+v;let c=saumCache.get(key);if(c)return c;const src=sp[nt*VAR+v],sd=src.getContext('2d').getImageData(0,0,TW,TH+1).data,[cv,g]=mkCanvas(TW,TH+1),im=g.createImageData(TW,TH+1),d=im.data;
 for(let y=0;y<=TH;y++)for(let x=0;x<TW;x++){const o=(y*TW+x)*4;if(!sd[o+3])continue;const a=(x-31.5)/32,b=(y-16)/16,ux=(a+b+1)/2,uy=(b-a+1)/2,e=kante===0?1-ux:kante===1?ux:kante===2?1-uy:uy,
  w=.26+(vn((kante&1?uy:ux)*5+(kante>>1?7:0),v*3.1,77+kante)-.5)*.22;if(e>w+.12||(e>w-.06&&h2(x>>1,y,nt*7+kante)>(w+.12-e)/.18))continue;d[o]=sd[o];d[o+1]=sd[o+1];d[o+2]=sd[o+2];d[o+3]=255;}
 g.putImageData(im,0,0);saumCache.set(key,cv);return cv;}
function saeume(sp,gr,k,t,v,bild){const tx=k%N,ty=(k/N)|0,p=SAUM_P[t];
 for(let e=0;e<4;e++){const n=e===0?(tx+1<N?k+1:-1):e===1?(tx>0?k-1:-1):e===2?(ty+1<N?k+N:-1):(ty>0?k-N:-1);if(n<0)continue;const nt=feld[n],np=SAUM_P[nt];
  if(np==null||np<=p||Math.min(hc[n*4],hc[n*4+1],hc[n*4+2],hc[n*4+3])<WL)continue;bild(saumBild(sp,gr,nt,e,v),'u'+gr+'_'+nt+'_'+e+'_'+v);}}
// Ein Feld malen: Boden (bei Schräge verzogen), bei Straßen darüber der Belag, dann Klippenwände, dann Wasser
function maleFeld(g,sp,tx,ty,x,y){const k=ix(tx,ty),t=feld[k],v=Math.floor(h2(tx,ty,3)*VAR),a=hc[k*4],b=hc[k*4+1],c=hc[k*4+2],d=hc[k*4+3],m=Math.min(a,b,c,d),nass=t===T.FLUSS&&m<WL;
 const f=m===a&&m===b&&m===c&&m===d?0:Math.min(2,a-m)+Math.min(2,b-m)*3+Math.min(2,c-m)*9+Math.min(2,d-m)*27,gr=sp===sprites[1]?1:0,yo=y-m*HZ;
 const bild=(src,key)=>{if(f)g.drawImage(hangBild(src,key+':'+f),x,yo-HOB);else g.drawImage(src,x,yo);};
 if(!nass||Math.max(a,b,c,d)>WL){const i=(nass||istStr(t)?grund[k]:t)*VAR+v;bild(sp[i],gr+':'+i);if(saumAn&&!nass&&SAUM_P[t]!=null)saeume(sp,gr,k,t,v,bild);if(istStr(t)){const mk=strMaske(tx,ty);bild(strBild(t,mk),'s'+t+'_'+mk);}}
 if(GROSS){const r=tx+1<N?k+1:-1,l=ty+1<N?k+N:-1,B=BASIS(),col=wandArt(nass?grund[k]:t);
  wand(g,x+64,y+16,b,c,r<0?B:hc[r*4],r<0?B:hc[r*4+3],x+32,y+32,col[0]);wand(g,x,y+16,d,c,l<0?B:hc[l*4],l<0?B:hc[l*4+1],x+32,y+32,col[1]);}
 if(nass)wasser(g,x,y,a,b,c,d,tx,ty);}
// Bildschirmpunkt → Feld unter Berücksichtigung der Höhen: von oben nach unten suchen, wo der Boden den Sehstrahl trifft
function bodenPunkt(x,y){if(!GROSS)return tileAt(x,y);for(let L=HMAX;L>=Math.min(HMIN,WL);L-=.5){const q=tileAt(x,y+L*HZ);if(q.tx<0||q.ty<0||q.tx>=N||q.ty>=N)continue;let h=hoehe(q.tx,q.ty);if(feld[ix(q.tx|0,q.ty|0)]===T.FLUSS)h=Math.max(h,WL);if(h>=L-.25)return q;}return tileAt(x,y);}
// ---------- Übersicht (einmal gezeichnet, für die weite Ansicht) ----------
// OV: Verkleinerung, damit die Übersicht höchstens ~3500 Bildpunkte breit ist (große Karte: 8). Beim Bauen wird nur der geänderte
// Ausschnitt neu gemalt (rebake mit Feldliste).
const OV=Math.max(2,Math.ceil(WW/3500));let overview=null,raster=true;
function objekteMalen(g,x0,y0,x1,y1){if(!NB)return;for(let v=x0+y0;v<=x1+y1;v++)for(let tx=Math.max(x0,v-y1);tx<=Math.min(x1,v-y0);tx++){const ty=v-tx,o=obj[ix(tx,ty)];if(!o)continue;const b=NB.bild(o,ovar(tx,ty)),p=iso(tx+.5,ty+.5);g.drawImage(b.img,p.x-b.ax,p.y-b.ay);}}
// Große Karte: Übersicht Punkt für Punkt (je Feld seine Grundfarbe, schattiert nach Hang, Klippen dunkel, Bäume als Tupfen);
// das ist für 920 000 Felder viel schneller als Bildchen. Der Editor malt sie wie bisher aus den Feldbildern.
const rgb32=(r,g,b)=>((255<<24)|(clamp(b|0,0,255)<<16)|(clamp(g|0,0,255)<<8)|clamp(r|0,0,255))>>>0,objF=new Map();
function objFarbe(o,v){const key=o*16+v;let c=objF.get(key);if(c!=null)return c;const b=NB.bild(o,v),im=b.img.getContext('2d').getImageData(0,0,b.img.width,b.img.height).data;let r=0,g=0,bl=0,n=0;
 for(let i=0;i<im.length;i+=16)if(im[i+3]>200){r+=im[i];g+=im[i+1];bl+=im[i+2];n++;}c=n?rgb32(r/n*.85,g/n*.85,bl/n*.85):0;objF.set(key,c);return c;}
const hOv=k=>{const s=(hc[k*4]+hc[k*4+1]+hc[k*4+2]+hc[k*4+3])/4;return feld[k]===T.FLUSS?Math.max(s,WL):s;};
function ovMalen(x0,y0,x1,y1,R){const im=new ImageData(R.w,R.h),px=new Uint32Array(im.data.buffer);px.fill(rgb32(28,36,22));const H8=8;
 for(let v=x0+y0;v<=x1+y1;v++)for(let tx=Math.max(x0,v-y1);tx<=Math.min(x1,v-y0);tx++){const ty=v-tx,k=ty*N+tx,t=feld[k],hm=hOv(k),nass=t===T.FLUSS&&Math.min(hc[k*4],hc[k*4+1],hc[k*4+2],hc[k*4+3])<WL;
  const fh=Math.min(hm,tx+1<N?hOv(k+1):BASIS(),ty+1<N?hOv(k+N):BASIS()),P=PAL[t][0],sh=nass?1:clamp(1+.1*(hc[k*4+1]-hc[k*4+3]),.7,1.3);
  const col=nass?rgb32(61,111,156):rgb32(P[0]*sh,P[1]*sh,P[2]*sh),wc=rgb32(P[0]*.5,P[1]*.45,P[2]*.4),cx=(tx-ty)*32+OX,cy=(tx+ty+1)*16+OY,top=cy-hm*HZ;
  const X0=Math.max(0,Math.floor((cx-32)/OV)-R.x),X1=Math.min(R.w,Math.ceil((cx+32)/OV)-R.x),Y0=Math.max(0,Math.floor((top-H8)/OV)-R.y),Y1=Math.min(R.h,Math.ceil((top+H8)/OV)-R.y),Yw=Math.min(R.h,Math.ceil((cy-fh*HZ+H8)/OV)-R.y);
  if(X0>=X1)continue;for(let Y=Y0;Y<Y1;Y++)px.fill(col,Y*R.w+X0,Y*R.w+X1);for(let Y=Math.max(0,Y1);Y<Yw;Y++)px.fill(wc,Y*R.w+X0,Y*R.w+X1);
  const o=obj[k];if(o&&NB&&!NB.ARTEN[o].flach){const c=objFarbe(o,ovar(tx,ty)),X=Math.round(cx/OV)-R.x,Y=Math.round((top-6)/OV)-R.y;if(c&&X>=0&&X<R.w&&Y>=0&&Y<R.h){px[Y*R.w+X]=c;if(Y+1<R.h)px[(Y+1)*R.w+X]=c;}}}
 overview.getContext('2d').putImageData(im,R.x,R.y);}
function bake(){const [c,g]=mkCanvas(Math.ceil(WW/OV),Math.ceil(WH/OV));overview=c;chunks.clear();hangCache.clear();saumCache.clear();
 if(GROSS){ovMalen(0,0,N-1,N-1,{x:0,y:0,w:c.width,h:c.height});return;}
 g.imageSmoothingEnabled=true;g.fillStyle='#1c2416';g.fillRect(0,0,c.width,c.height);g.scale(1/OV,1/OV);const sp=sprites[raster?1:0];
 for(let ty=0;ty<N;ty++)for(let tx=0;tx<N;tx++){const p=iso(tx,ty);maleFeld(g,sp,tx,ty,p.x-TW/2,p.y);}
 objekteMalen(g,0,0,N-1,N-1);}
function rebake(ks){if(!ks||!ks.length||!overview){bake();return;}let x0=N,y0=N,x1=0,y1=0;
 for(const k of ks){const x=k%N,y=(k/N)|0;if(!BODEN_NATUR.has(feld[k])){obj[k]=0;kz[k]=0;}if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
 x0=Math.max(0,x0-1);y0=Math.max(0,y0-1);x1=Math.min(N-1,x1+1);y1=Math.min(N-1,y1+1);
 const hoch=GROSS?(HMAX+1)*HZ:0,tief=GROSS?(-BASIS()+1)*HZ:0,rx0=iso(x0,y1+1).x-2,rx1=iso(x1+1,y0).x+2,ry0=iso(x0,y0).y-140-hoch,ry1=iso(x1+1,y1+1).y+2+tief,sp=sprites[raster?1:0];
 if(GROSS){const M=Math.ceil((hoch+tief)/16)+3,ox=Math.max(0,Math.floor(rx0/OV)),oy=Math.max(0,Math.floor(ry0/OV)),R={x:ox,y:oy,w:Math.min(overview.width,Math.ceil(rx1/OV))-ox,h:Math.min(overview.height,Math.ceil(ry1/OV))-oy};
  if(R.w>0&&R.h>0)ovMalen(Math.max(0,x0-M),Math.max(0,y0-M),Math.min(N-1,x1+M),Math.min(N-1,y1+M),R);}
 else{const ax0=Math.max(0,x0-10),ay0=Math.max(0,y0-10),ax1=Math.min(N-1,x1+10),ay1=Math.min(N-1,y1+10),g=overview.getContext('2d');g.save();g.setTransform(1/OV,0,0,1/OV,0,0);g.imageSmoothingEnabled=true;g.beginPath();g.rect(rx0,ry0,rx1-rx0,ry1-ry0);g.clip();g.fillStyle='#1c2416';g.fillRect(rx0,ry0,rx1-rx0,ry1-ry0);
  for(let v=ax0+ay0;v<=ax1+ay1;v++)for(let tx=Math.max(ax0,v-ay1);tx<=Math.min(ax1,v-ay0);tx++){const ty=v-tx,p=iso(tx,ty);maleFeld(g,sp,tx,ty,p.x-TW/2,p.y);}
  objekteMalen(g,ax0,ay0,ax1,ay1);g.restore();}
 for(const [key,ch] of chunks)if(ch.x0<rx1&&ch.x0+ch.S+8>rx0&&ch.y0<ry1&&ch.y0+ch.S+8>ry0)chunks.delete(key);}

// ---------- Bodenkacheln: der Boden wird in Stücken vorgezeichnet und beim Bauen verworfen ----------
// lod 1: 512 × 512 Weltpunkte; lod 2/4 (nur große Karte, weit herausgezoomt): größere Stücke verkleinert.
// Reihe für Reihe von hinten nach vorn: erst die Böden einer Reihe, dann ihre Objekte; so verdecken Hügel, was hinter ihnen
// steht. Nur auf dem ebenen Ludus-Gelände bleiben stehende Objekte eigene Dinge (Tiefenreihenfolge mit Figuren).
// Höhen: auch Felder unterhalb des Stücks werden gemalt, weil sie (angehoben) hineinragen.
const CH=512,chunks=new Map();let frameNo=0;
// A3: Bilder der Grenzen, je Art (1 Parkzaun, 2 Palisade) und Richtung (0 Kante entlang tx, 1 entlang ty) einmal gemalt
const zaunBilder=new Map();
function zaunBild(art,dir){const key=art*2+dir;let b=zaunBilder.get(key);if(b)return b;const H=art===2?20:11,W2=36,ay=H+12,[c,g]=mkCanvas(W2,H+22);
 const pt=u=>{const x=2+u*32,y=ay-8+u*16;return dir?{x:W2-x,y}:{x,y};};
 if(art===1){// Holzzaun mit zwei Latten, Pfosten an Ecken und Mitte, weiß gekalkt wie ein ordentlicher Park
  for(const [hy,col] of [[H-3,'#8a6a42'],[5,'#8a6a42']])for(let u=0;u<=1;u+=1/32){const p=pt(u);g.fillStyle=col;g.fillRect(Math.round(p.x),Math.round(p.y-hy),1,2);}
  for(let i=0;i<=2;i++){const p=pt(i/2),x=Math.round(p.x)-1,y=Math.round(p.y);g.fillStyle='#5e4229';g.fillRect(x,y-H,3,H);g.fillStyle='#e8dcc0';g.fillRect(x,y-H,2,H-1);g.fillStyle='#6b4a2c';g.fillRect(x,y-H-1,3,1);}}
 else{// Palisade: angespitzte Stämme dicht an dicht
  for(let i=0;i<9;i++){const p=pt((i+.5)/9),x=Math.round(p.x)-2,y=Math.round(p.y),h=H-(i%3===1?2:0);
   g.fillStyle='#4a3420';g.fillRect(x,y-h,4,h);g.fillStyle=i%2?'#7a5a39':'#8a6a42';g.fillRect(x,y-h,3,h-1);g.fillStyle='#a07e52';g.fillRect(x+1,y-h-2,1,2);g.fillStyle='#5e4229';g.fillRect(x,y-Math.round(h*.4),4,1);}}
 b={img:c,ax:W2/2,ay};zaunBilder.set(key,b);return b;}
function chunk(cx,cy,lod=1){const S=CH*lod,key=(lod*1000+cy)*1000+cx;let ch=chunks.get(key);if(ch)return ch;saumAn=GROSS&&lod===1;const [c,g]=mkCanvas(CH+2,CH+2),x0=cx*S,y0=cy*S,sp=sprites[raster?1:0],stehen=[];
 g.fillStyle='#1c2416';g.fillRect(0,0,CH+2,CH+2);g.imageSmoothingEnabled=lod>1;g.scale(1/lod,1/lod);g.translate(-x0,-y0);
 const unten=GROSS?Math.ceil(((HMAX+1)*HZ+150)/(TH/2)):NB?10:0,oben=GROSS?Math.ceil((-BASIS()+1)*HZ/(TH/2))+1:0;
 const u0=Math.floor((x0-OX)/(TW/2))-3,u1=Math.ceil((x0+S+2*lod-OX)/(TW/2))+3,v0=Math.max(0,Math.floor((y0-OY)/(TH/2))-2-oben),v1=Math.min(2*N-2,Math.ceil((y0+S+2*lod-OY)/(TH/2))+1+unten);
 for(let v=v0;v<=v1;v++){const u00=u0+((u0+v)&1);
  for(let u=u00;u<=u1;u+=2){const tx=(u+v)>>1,ty=(v-u)>>1;if(tx<0||ty<0||tx>=N||ty>=N)continue;maleFeld(g,sp,tx,ty,(tx-ty)*TW/2+OX-TW/2,v*TH/2+OY);}
  if(NB&&GROSS&&lod===1)for(let u=u00;u<=u1;u+=2){const tx=(u+v)>>1,ty=(v-u)>>1;if(tx<0||ty<0||tx>=N||ty>=N)continue;const k=ix(tx,ty);if(kz[k])kleinMalen(g,tx,ty,k,y0,y0+S);}// T3: Kleinzeug, nur in der nahen Ansicht
  if(NB)for(let u=u00;u<=u1;u+=2){const tx=(u+v)>>1,ty=(v-u)>>1;if(tx<0||ty<0||tx>=N||ty>=N)continue;const k=ix(tx,ty),o=obj[k];if(!o)continue;const b=NB.bild(o,ovar(tx,ty)),x=(tx-ty)*TW/2+OX,y=v*TH/2+OY+TH/2,z=objHz(tx,ty);
   if(b.flach||lod>1||!eben[k])g.drawImage(b.img,x-b.ax,y-z-b.ay);else if(x>=x0&&x<x0+S&&y>=y0&&y<y0+S)stehen.push({x,y,oz:z,img:b.img,ax:b.ax,ay:b.ay});}
  // A3: Zaun und Palisade; Mitte der Kante als Fußpunkt, damit Figuren davor und dahinter richtig stehen
  if(ANORD)for(let u=u00;u<=u1;u+=2){const tx=(u+v)>>1,ty=(v-u)>>1;if(tx<0||ty<0||tx>=N||ty>=N)continue;const k=ix(tx,ty);
   for(const [arr,dir] of [[zaunA,0],[zaunB,1]]){const art=arr[k];if(!art)continue;const b=zaunBild(art,dir),m=dir?iso(tx,ty+.5):iso(tx+.5,ty),z=hz(tx,ty);
    if(lod>1)g.drawImage(b.img,m.x-b.ax,m.y-z-b.ay);else if(m.x>=x0&&m.x<x0+S&&m.y>=y0&&m.y<y0+S)stehen.push({x:m.x,y:m.y,oz:z,img:b.img,ax:b.ax,ay:b.ay});}}}
 ch={c,stehen,used:frameNo,x0,y0,S};chunks.set(key,ch);return ch;}

// ---------- Gebäude als Skizze ----------
function shade(hex,k){const n=parseInt(hex.slice(1),16);return 'rgb('+[n>>16,(n>>8)&255,n&255].map(v=>Math.round(clamp(v*k,0,255))).join(',')+')';}
function poly(g,pts,fill){g.beginPath();g.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);g.closePath();g.fillStyle=fill;g.fill();g.stroke();}
function drawBau(g,b){const A=iso(b.tx,b.ty),B=iso(b.tx+b.w,b.ty),C=iso(b.tx+b.w,b.ty+b.h),D=iso(b.tx,b.ty+b.h),up=p=>({x:p.x,y:p.y-b.hoch}),mid={x:(A.x+C.x)/2,y:(A.y+C.y)/2-b.hoch};
 g.lineWidth=1.5;g.strokeStyle='#20140c';g.lineJoin='round';
 if(b.flach){g.setLineDash([6,4]);g.strokeStyle=b.wand;g.lineWidth=2.5;g.beginPath();g.moveTo(A.x,A.y);g.lineTo(B.x,B.y);g.lineTo(C.x,C.y);g.lineTo(D.x,D.y);g.closePath();g.stroke();g.setLineDash([]);}
 else{poly(g,[D,C,up(C),up(D)],shade(b.wand,.72));poly(g,[C,B,up(B),up(C)],b.wand);poly(g,[up(A),up(B),up(C),up(D)],b.dach);}
 g.font=window.AT2_STIL?AT2_STIL.font(12):'bold 12px ui-monospace,Menlo,Consolas,monospace';g.textAlign='center';g.textBaseline='middle';const w=g.measureText(b.name).width+10;
 g.fillStyle='rgba(18,12,9,.8)';g.fillRect(Math.round(mid.x-w/2),Math.round(mid.y-9),Math.round(w),18);g.fillStyle='#f4d37a';g.fillText(b.name,Math.round(mid.x),Math.round(mid.y)+1);}
for(const b of BAU){const C=iso(b.tx+b.w,b.ty+b.h);b.key=b.flach?iso(b.tx,b.ty).y:C.y;}
// Reihenfolge der Gebäude untereinander: Wer ganz hinter einem anderen liegt, wird vor ihm gezeichnet
for(let pass=0;pass<BAU.length;pass++)for(const b of BAU)for(const a of BAU)if(a!==b&&!a.flach&&!b.flach&&(a.tx+a.w<=b.tx||a.ty+a.h<=b.ty)&&!(b.tx+b.w<=a.tx||b.ty+b.h<=a.ty)&&b.key<=a.key)b.key=a.key+.02;

// ---------- Gladiatoren: schlendern im Ludus ----------
// Figuren klein wie bei RollerCoaster Tycoon Classic. Normalansicht: die „einfache Figur“ der großen Kämpfe (arena.js,
// M.renderSimpleFigure; sieht aus wie die echte, nur gröber), auf ein Drittel verkleinert ohne Glätten, also grob gepixelt.
// Erst beim Heranzoomen (ab DETAIL) die volle Figur des Spiels, und nur für die, die dann im Bild sind.
// Schritte: Ein Schrittzyklus (WALK Bilder) gehört zu SCHRITT Bildpunkten Weg; das Bild richtet sich nach dem gelaufenen Weg,
// nicht nach der Uhr. So rutschen die Füße bei keinem Tempo über den Boden.
// T2-Rückmeldung (Thomas 13.11.2026): in 2.0 Figuren ein Stück kleiner (KW .46 → .40, einfache Figur 16 × 28 → 14 × 24); Schrittlänge
// im gleichen Maß kürzer (15 → 13 Bildpunkte je Schrittzyklus), damit die Füße nicht rutschen. Tempo unverändert.
const KW=GROSS?.40:.46,SPEED=15,FW=56,FH=72,FX=28,FY=62,WALK=8,DETAIL=2,HOEHE=GROSS?18:21,SCHRITT=GROSS?13:15,figs=new Map();let spriteBudget=0,workers=[];
function spriteOf(g){let s=figs.get(g.id);if(s)return s;if(spriteBudget<=0)return null;spriteBudget--;
 const [c,ctx]=mkCanvas(FW*(WALK+1),FH*2);const base={g,team:0,ammo:0,a:0,energy:100,index:0,baseX:0,baseY:0};
 try{ctx.fillStyle='rgba(15,20,10,.3)';for(let dir=0;dir<2;dir++)for(let f=0;f<=WALK;f++)ctx.fillRect(f*FW+FX-9,dir*FH+FY-1,18,3);
  for(let dir=0;dir<2;dir++){for(let f=0;f<WALK;f++){ctx.save();ctx.translate(f*FW,dir*FH);M.renderLudusActors(ctx,[{...base,x:FX,y:FY,a:dir?Math.PI:0,state:'move',moveSpeed:40,phase:f/WALK*TAU}]);ctx.restore();}
   ctx.save();ctx.translate(WALK*FW,dir*FH);M.renderLudusActors(ctx,[{...base,x:FX,y:FY,a:dir?Math.PI:0,state:'idle',moveSpeed:0,phase:0}]);ctx.restore();}}catch(e){console.warn(e);}
 s={c};figs.set(g.id,s);return s;}
// Einfache Figuren: groß gemalt (NW × NH), dann auf ein Drittel verkleinert (PW × PH) in gemeinsame Bildseiten gelegt.
// Je Figur eine Zeile: WALK Gehbilder und ein Standbild nach rechts, dann dasselbe nach links.
const NW=48,NH=84,NAX=24,NAY=78,PW=GROSS?14:16,PH=GROSS?24:28,PAX=GROSS?7:8,PAY=GROSS?22:26,PROW=240,pages=[],pof=new Map(),[scratch,sg]=mkCanvas(NW,NH),[klein,kg]=mkCanvas(PW,PH);let pBudget=0,pNext=0;
function simpleOf(g){let r=pof.get(g.id);if(r)return r;if(pBudget<=0||!M.renderSimpleFigure)return null;pBudget--;
 const page=(pNext/PROW)|0,row=pNext%PROW;pNext++;if(!pages[page])pages[page]=mkCanvas(PW*(WALK+1)*2,PH*PROW);const [pc,pg]=pages[page];
 for(let dir=0;dir<2;dir++)for(let f=0;f<=WALK;f++){sg.setTransform(1,0,0,1,0,0);sg.clearRect(0,0,NW,NH);
  try{M.renderSimpleFigure(sg,{g,team:0,ownCloth:true,x:NAX,y:NAY,z:0,a:dir?Math.PI:0,state:f<WALK?'move':'idle',moveSpeed:f<WALK?60:0,phase:f<WALK?f/WALK*TAU:0,energy:100,ammo:0,index:0,baseX:0,baseY:0});}catch(e){if(!simpleOf.warned){simpleOf.warned=true;console.warn('einfache Figur',e);}}
  const x=(dir*(WALK+1)+f)*PW,y=row*PH;// weich verkleinern, dann jeden Bildpunkt ganz deckend oder ganz leer machen: saubere grobe Pixel ohne Ausfälle
  kg.clearRect(0,0,PW,PH);kg.imageSmoothingEnabled=true;kg.imageSmoothingQuality='high';kg.drawImage(scratch,0,0,NW,NH,0,0,PW,PH);const im=kg.getImageData(0,0,PW,PH),d=im.data;
  for(let i=3;i<d.length;i+=4)d[i]=d[i]>96?255:0;for(let px=PAX-4;px<PAX+4;px++){const o=(PAY*PW+px)*4;if(!d[o+3]){d[o]=15;d[o+1]=20;d[o+2]=10;d[o+3]=77;}}pg.putImageData(im,x,y);}
 r={c:pc,y:row*PH};pof.set(g.id,r);return r;}
// Eine Figur zeichnen. f: 0…WALK−1 gehen, WALK stehen. Wählt selbst zwischen einfacher und voller Figur.
function drawFig(ctx,g,x,y,f,dir){if(detailV){const sp=spriteOf(g);if(sp){ctx.imageSmoothingEnabled=true;ctx.drawImage(sp.c,f*FW,dir*FH,FW,FH,x-FX*KW,y-FY*KW,FW*KW,FH*KW);ctx.imageSmoothingEnabled=false;return;}}
 const r=simpleOf(g);if(r)ctx.drawImage(r.c,(dir*(WALK+1)+f)*PW,r.y,PW,PH,x-PAX,y-PAY,PW,PH);else drawMini(ctx,g,x,y);}
const SITZ_H=PAY-10;// im Sitzen nur der Oberkörper, die Beine verschwinden hinter der Bank
function drawSit(ctx,g,x,y,dir){if(detailV){const sp=spriteOf(g),h=FY-22;if(sp){ctx.imageSmoothingEnabled=true;ctx.drawImage(sp.c,WALK*FW,dir*FH,FW,h,x-FX*KW,y-h*KW+1,FW*KW,h*KW);ctx.imageSmoothingEnabled=false;return;}}
 const r=simpleOf(g);if(r)ctx.drawImage(r.c,(dir*(WALK+1)+WALK)*PW,r.y,PW,SITZ_H,x-PAX,y-SITZ_H+2,PW,SITZ_H);else drawMini(ctx,g,x,y);}
const gehBild=dist=>((dist/SCHRITT*WALK)|0)%WALK;
function drawMini(ctx,g,x,y){const a=g.appearance||{};ctx.fillStyle=a.cloth||'#55938e';ctx.fillRect(x-2,y-7,4,6);ctx.fillStyle=a.skin||'#d9ac82';ctx.fillRect(x-1,y-10,3,3);}
const frei=(tx,ty)=>{tx=Math.floor(tx);ty=Math.floor(ty);if(!inMap(tx,ty))return false;const t=feld[ix(tx,ty)];return t!==T.BAU&&t!==T.FLUSS&&t!==T.UNTERKUNFT&&t!==T.UNT_S&&t!==T.UNT_K&&t!==T.SCHM_S&&t!==T.SCHMIEDE&&t!==T.SCHM_K&&t!==T.BST_S&&t!==T.BEAST&&t!==T.BST_K&&t!==T.KAS_S&&t!==T.KASERNE&&t!==T.KAS_K&&t!==T.MEDICUS&&t!==T.KRANK&&t!==T.MARKT&&t!==T.HALLE&&t!==T.VERWALTUNG&&t!==T.ARENA_BAU;};
const imLudus=(tx,ty)=>tx>=LUD.tx&&tx<LUD.tx+LUD.w&&ty>=LUD.ty&&ty<LUD.ty+LUD.h;
function makeRoster(n){const keep=S.roster.filter(g=>!g.dead);let list=keep.slice(0,n);const rng=S.rng;while(list.length<n){const g=M.makeGladiator(0);g.fatigue=0;list.push(g);}S.rng=rng;
 S.roster=list;try{M.army?.autoClasses?.(list);}catch(e){}for(const w of workers){figs.delete(w.g.id);pof.delete(w.g.id);}if(pNext>PROW*6){pof.clear();pNext=0;}
 workers=list.map((g,i)=>{let tx,ty,k=0;do{tx=LUD.tx+h2(i,k,21)*LUD.w;ty=LUD.ty+h2(i,k,22)*LUD.h;k++;}while(!frei(tx,ty)&&k<40);const p=iso(tx,ty);return {g,x:p.x,y:p.y,dist:h2(i,7,23)*60,seed:h2(i,7,23)*1000,wait:h2(i,3,24)*8,goal:null,dir:0,walk:false};});}
// T4 (Thomas 13.11.2026): Gibt es die Begehbarkeitskarte (welt-begehbar.js, nur 2.0), schlendern Gladiatoren über gesuchte Wege
// (nur freie Felder, Tempo je Boden, auch über Brücken) und weichen Änderungen aus; ohne sie wie bisher.
let bgHorcht=false;
function bgHorchen(G){bgHorcht=true;G.beiAenderung(r=>{for(const w of workers){const c=tileAt(w.x,w.y),tx=Math.floor(c.tx),ty=Math.floor(c.ty);if(tx<r[0]-1||tx>r[2]+1||ty<r[1]-1||ty>r[3]+1)continue;
  if(w.pobj?.kaputt){w.pfad=null;w.pobj=null;w.goal=null;}const k=ix(clamp(tx,0,N-1),clamp(ty,0,N-1));if(w.brA||w.br||G.frei(G.GL,k))continue;
  const z=G.naechstesFrei(G.GL,k,6);w.gen=(w.gen||0)+1;w.sucht=false;w.pobj=null;w.wait=0;w.goal=null;w.pfad=z>=0?[{x:z%N+.5,y:((z/N)|0)+.5,b:0}]:null;
  if(z<0||G.eingesperrt(G.GL,z))G.melde(G.GL,w.g.name);}});}
function wanderB(w,dt,G){if(!bgHorcht)bgHorchen(G);if(w.pobj?.kaputt&&!w.sucht){w.pfad=null;w.pobj=null;}
 if(w.wait>0){w.wait-=dt;w.walk=false;return;}
 if(!w.goal){if(w.pfad&&w.pfad.length){const q=w.pfad.shift();w.goal=iso(q.x,q.y);w.brA=w.br;w.br=q.b;}
  else{if(w.sucht){w.walk=false;return;}const c=tileAt(w.x,w.y),home=imLudus(c.tx,c.ty);let ziel=null;
   for(let k=0;k<6&&!ziel;k++){const tx=Math.floor(c.tx+(Math.random()-.5)*9),ty=Math.floor(c.ty+(Math.random()-.5)*9);if(!inMap(tx,ty)||!G.frei(G.GL,ix(tx,ty))||(home&&!imLudus(tx,ty)))continue;ziel={tx,ty};}
   if(!ziel){w.wait=1;w.walk=false;return;}w.sucht=true;const gen=w.gen=(w.gen||0)+1;
   G.weg(G.GL,{tx:c.tx,ty:c.ty,b:w.br},ziel,p=>{if(w.gen!==gen)return;w.sucht=false;if(!p){w.wait=1+Math.random()*2;return;}w.pobj=p;
    w.pfad=p.pts.slice(1).map((q,i,a)=>i===a.length-1||q.b||G.hindernis(ix(Math.floor(q.x),Math.floor(q.y)))?q:{x:q.x+(Math.random()-.5)*.2,y:q.y+(Math.random()-.5)*.2,b:0});},{max:900});w.walk=false;return;}}
 const dx=w.goal.x-w.x,dy=w.goal.y-w.y,d=Math.hypot(dx,dy),tp=G.tempoBei(G.GL,w.x,w.y,w.brA||w.br)||100,step=SPEED*dt*tp/100*(d&&!(w.brA||w.br)?hangF(w.x,w.y,dx/d,dy/d):1);w.walk=true;if(Math.abs(dx)>1)w.dir=dx<0?1:0;
 if(d<=step){w.x=w.goal.x;w.y=w.goal.y;w.goal=null;w.dist+=d;if(!w.pfad||!w.pfad.length){w.pfad=null;w.pobj=null;w.brA=w.br;w.wait=2+Math.random()*9;w.walk=false;}return;}w.x+=dx/d*step;w.y+=dy/d*step;w.dist+=step;}
const ozW=(w,c)=>{const z=hz(c.tx,c.ty);return (w.brA||w.br)&&M.weltBegehbar?M.weltBegehbar.deckHz(c.tx,c.ty,z):z;};
function wander(w,dt){const G=GROSS&&M.weltBegehbar;if(G)return wanderB(w,dt,G);if(w.wait>0){w.wait-=dt;w.walk=false;return;}// (schlendern)
 if(!w.goal){const c=tileAt(w.x,w.y),home=imLudus(c.tx,c.ty);for(let k=0;k<6&&!w.goal;k++){const tx=c.tx+(Math.random()-.5)*9,ty=c.ty+(Math.random()-.5)*9;if(!frei(tx,ty)||(home&&!imLudus(tx,ty)))continue;
   let ok=true;for(let s=1;s<8&&ok;s++)ok=frei(c.tx+(tx-c.tx)*s/8,c.ty+(ty-c.ty)*s/8);if(ok)w.goal=iso(tx,ty);}
  if(!w.goal){w.wait=1;return;}}
 const dx=w.goal.x-w.x,dy=w.goal.y-w.y,d=Math.hypot(dx,dy),step=SPEED*dt*(d?hangF(w.x,w.y,dx/d,dy/d):1);w.walk=true;if(Math.abs(dx)>1)w.dir=dx<0?1:0;
 if(d<=step){w.x=w.goal.x;w.y=w.goal.y;w.goal=null;w.wait=2+Math.random()*9;w.walk=false;return;}w.x+=dx/d*step;w.y+=dy/d*step;w.dist+=step;}
// T4-Rückmeldung (Thomas 13.11.2026): Steht eine Figur hinter einem Baum, Felsen oder Busch, der fest im Bodenbild steckt (außerhalb der
// ebenen Fläche oder herausgezoomt), wird das Objekt nach ihr noch einmal gezeichnet; davor stehende Figuren bleiben darüber. In der ebenen
// Fläche sind die Objekte ohnehin eigene Bildteile (stehen) und werden mit den Figuren nach der Tiefe sortiert.
// Leistung: je Figur nur die Felder davor (7 Reihen, 5 Spalten), jedes Objekt höchstens einmal je Bild.
let verdeckt=0;const vorSet=new Set();
function vorDran(items){verdeckt=0;if(!GROSS||!NB)return;vorSet.clear();const n=items.length,eb=cam.s>=NAH;
 for(let i=0;i<n;i++){const it=items[i];let fx,fy;if(it.w&&it.ps){fx=it.ps.x;fy=it.ps.y;}else if(it.g&&it.dx!=null){fx=it.dx;fy=it.dy;}else continue;
  const c=tileAt(fx,fy),ftx=Math.floor(c.tx),fty=Math.floor(c.ty),u=ftx-fty,v=ftx+fty;
  for(let dv=0;dv<=7;dv++)for(let du=-2;du<=2;du++){const U=u+du,V=v+dv;if((U+V)&1)continue;const tx=(U+V)/2,ty=(V-U)/2;if(!inMap(tx,ty))continue;const k=ix(tx,ty),o=obj[k];
   if(!o||(eb&&eben[k])||vorSet.has(k))continue;const b=NB.bild(o,ovar(tx,ty));if(b.flach)continue;const p=iso(tx+.5,ty+.5);if(p.y<=fy)continue;
   if(fx<p.x-b.ax-8||fx>p.x-b.ax+b.img.width+8)continue;vorSet.add(k);verdeckt++;items.push({x:p.x,y:p.y,oz:objHz(tx,ty),img:b.img,ax:b.ax,ay:b.ay});}}}
function pose0(w){return {x:w.x,y:w.y,dx:w.dir?-1:1,dy:0,state:w.walk?'schlendert durch den Ludus':'steht herum',work:false,top:!w.walk};}
function pose(w){const ps=pose0(w);return H.pose?H.pose(w,ps,clock):ps;}
function place(g,x,y){const w=workers.find(w=>w.g.id===g.id);if(!w)return;w.pfad=null;w.pobj=null;w.sucht=false;w.gen=(w.gen||0)+1;w.br=w.brA=0;if(GROSS){const q=bodenPunkt(x,y),p=iso(q.tx,q.ty);x=p.x;y=p.y;}w.x=x;w.y=y;w.goal=null;w.wait=2.5;w.walk=false;}

// ---------- Ansicht, Kamera, Bedienung ----------
const cv=$('weltCanvas'),ctx=cv.getContext('2d');let VW=1,VH=1,DPR=1;
const L0=ANORD?iso(O+ANORD.platz[0]+ANORD.platz[2]/2,O+ANORD.platz[1]+ANORD.platz[3]/2):iso(LUD.tx+LUD.w/2,LUD.ty+LUD.h/2),cam={x:L0.x,y:L0.y,s:1};// 2.0: Start mit Blick auf den Platz
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);VW=cv.clientWidth||innerWidth;VH=cv.clientHeight||innerHeight;cv.width=Math.round(VW*DPR);cv.height=Math.round(VH*DPR);clampCam();}
const minScale=()=>Math.min(VW/WW,VH/WH)*.95,maxScale=()=>4.5;
function clampCam(){cam.s=clamp(cam.s,minScale(),maxScale());cam.x=clamp(cam.x,0,WW);cam.y=clamp(cam.y,0,WH);}
const toWorld=(sx,sy)=>({x:cam.x+(sx-VW/2)/cam.s,y:cam.y+(sy-VH/2)/cam.s});
function zoomAt(sx,sy,f){const a=toWorld(sx,sy);cam.s=clamp(cam.s*f,minScale(),maxScale());const b=toWorld(sx,sy);cam.x+=a.x-b.x;cam.y+=a.y-b.y;clampCam();}
let fly=null;function flyTo(x,y,s){fly={x0:cam.x,y0:cam.y,s0:cam.s,x,y,s:s??Math.max(cam.s,1.2),t:0};}
const ptrs=new Map();let dragMoved=0,pinch=null,lastTap=0,grabbed=null;// grabbed: ein Anschluss (H.pointer, z. B. Bauen) führt den Zeiger statt der Kamera
const wp=e=>{const r=cv.getBoundingClientRect();return toWorld(e.clientX-r.left,e.clientY-r.top);};
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});dragMoved=0;fly=null;if(ptrs.size===1&&H.pointer?.('down',wp(e))){grabbed=e.pointerId;return;}if(ptrs.size===2){if(grabbed!=null){H.pointer?.('cancel',wp(e));grabbed=null;}const [a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),s:cam.s};}});
cv.addEventListener('pointermove',e=>{const p=ptrs.get(e.pointerId);if(!p)return;if(grabbed===e.pointerId){H.pointer?.('move',wp(e));return;}const r=cv.getBoundingClientRect();
 if(ptrs.size===2&&pinch){p.x=e.clientX;p.y=e.clientY;const [a,b]=[...ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y),mx=(a.x+b.x)/2-r.left,my=(a.y+b.y)/2-r.top;zoomAt(mx,my,(pinch.s*d/pinch.d)/cam.s);dragMoved=99;return;}
 const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;dragMoved+=Math.abs(dx)+Math.abs(dy);cam.x-=dx/cam.s;cam.y-=dy/cam.s;clampCam();});
const up=e=>{const was=ptrs.has(e.pointerId);ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;if(grabbed===e.pointerId){grabbed=null;H.pointer?.(e.type==='pointerup'?'up':'cancel',wp(e));return;}if(was&&ptrs.size===0&&dragMoved<8&&e.type==='pointerup'){const r=cv.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top,now=performance.now();
 if(now-lastTap<300&&!H.singleTap?.()){zoomAt(sx,sy,1.6);lastTap=0;return;}lastTap=now;tap(toWorld(sx,sy));}};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('wheel',e=>{e.preventDefault();const r=cv.getBoundingClientRect();zoomAt(e.clientX-r.left,e.clientY-r.top,Math.exp(-e.deltaY*.0016));},{passive:false});
addEventListener('resize',resize);
let shown=[];
function tap(p){const k=Math.max(1,1.4/cam.s),hit=[...shown].reverse().find(s=>p.x>s.x-6*k&&p.x<s.x+6*k&&p.y>s.y-10-8*k&&p.y<s.y+4*k);H.tap?.(p,hit?.w);}

// ---------- Leiste ----------
const ui=document.createElement('div');ui.id='weltUi';ui.innerHTML=`
<header class="w-bar"><div class="w-title"><b>RASTERKARTE</b><small>Testversion · nichts wird gespeichert</small></div>
<div class="w-chips"><span class="w-chip" id="wCount"></span><span class="w-chip" id="wClock"></span></div>
<div class="w-perf" title="Bildzeit"><i id="wPerfBar"></i><span id="wPerf"></span></div>
<span class="w-kader"></span></header>
<button id="wBack" class="w-btn w-back" hidden>◀ Zur Karte</button>`;
$('welt').appendChild(ui);document.body.appendChild($('wBack'));
$('wBack').onclick=()=>{try{M.ui.close?.();}catch(e){}M.ui.click('nav:home');};
setInterval(()=>{const page=M.ui.getPage?.(),modal=$('modal')&&!$('modal').hidden,admin=(page&&page!=='home')||modal||!!S.battle;document.body.classList.toggle('w-admin',!!admin);$('wBack').hidden=!admin||modal;},200);

// ---------- Zeichnen ----------
// unter NAH: Boden in größeren Stücken (lod 2/4), unter FERN: nur die Übersicht
const MINI=.6,NAH=.6,FERN=OV>2?.12:.6;let tempo=1,clock=0,last=performance.now(),perfAvg=4,perfWin=[],hudT=0,miniV=false,detailV=false;
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.1,(now-last)/1000);last=now;if(document.hidden||document.body.classList.contains('w-admin'))return;
 const t0=performance.now(),sd=dt*tempo;clock+=sd;H.tick?.(sd);for(const w of workers)wander(w,sd);// sd: Bildzeit im Spieltempo (A2), bei 3× größere Schritte, nicht mehr Rechnung
 if(fly){fly.t=Math.min(1,fly.t+dt*2.2);const e=1-Math.pow(1-fly.t,3);cam.x=fly.x0+(fly.x-fly.x0)*e;cam.y=fly.y0+(fly.y-fly.y0)*e;cam.s=fly.s0+(fly.s-fly.s0)*e;clampCam();if(fly.t>=1)fly=null;}
 ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#1c2416';ctx.fillRect(0,0,VW,VH);
 const view={x0:cam.x-VW/2/cam.s,y0:cam.y-VH/2/cam.s,x1:cam.x+VW/2/cam.s,y1:cam.y+VH/2/cam.s};
 ctx.setTransform(DPR*cam.s,0,0,DPR*cam.s,DPR*(VW/2-cam.x*cam.s),DPR*(VH/2-cam.y*cam.s));
 const items=[];miniV=cam.s<MINI;detailV=cam.s>=DETAIL;
 const lod=cam.s>=NAH?1:cam.s>=FERN?(cam.s>=.3?2:4):0;
 if(lod!==1){ctx.imageSmoothingEnabled=true;ctx.drawImage(overview,0,0,overview.width*OV,overview.height*OV);ctx.imageSmoothingEnabled=false;}
 if(lod){// Boden aus vorgezeichneten Stücken; weit draußen höchstens zwei neue Stücke je Bild, darunter liegt die Übersicht
  const S=CH*lod,cx0=Math.max(0,Math.floor(view.x0/S)),cx1=Math.min(Math.ceil(WW/S)-1,Math.floor(view.x1/S)),cy0=Math.max(0,Math.floor(view.y0/S)),cy1=Math.min(Math.ceil(WH/S)-1,Math.floor((view.y1+130)/S));let neu=lod>1?2:999;
  for(let cy=cy0;cy<=cy1;cy++)for(let cx=cx0;cx<=cx1;cx++){let ch=chunks.get((lod*1000+cy)*1000+cx);if(!ch){if(neu<=0)continue;neu--;ch=chunk(cx,cy,lod);}ch.used=frameNo;
   if(lod===1)ctx.drawImage(ch.c,cx*S,cy*S);else{ctx.imageSmoothingEnabled=true;ctx.drawImage(ch.c,cx*S,cy*S,(CH+2)*lod,(CH+2)*lod);ctx.imageSmoothingEnabled=false;}
   for(const t of ch.stehen)if(t.x>view.x0-50&&t.x<view.x1+50&&t.y>view.y0-10&&t.y<view.y1+130)items.push(t);}
  frameNo++;if(chunks.size>48)for(const [k,ch] of chunks)if(ch.used<frameNo-120){chunks.delete(k);if(chunks.size<=36)break;}}
 H.ground?.(ctx,view);
 for(const b of SKIZZE)items.push({y:b.key,bau:b});H.items?.(items,view);
 // Figuren; wer vor einem Gebäude steht, wird nach ihm gezeichnet
 shown=[];spriteBudget=Math.max(2,Math.round(12-perfAvg));pBudget=Math.max(3,Math.round(14-perfAvg));
 for(const w of workers){const ps=pose(w);if(ps.x==null||ps.x<view.x0-40||ps.x>view.x1+40||ps.y<view.y0-20||ps.y>view.y1+80)continue;let y=ps.y;const c=tileAt(ps.x,ps.y);
  for(const b of SKIZZE)if(!b.flach&&y<=b.key&&(c.tx>=b.tx+b.w||c.ty>=b.ty+b.h)&&c.tx>b.tx-2&&c.ty>b.ty-2)y=b.key+.01;if(H.vorne)y=H.vorne(c.tx,c.ty,y);items.push({y,w,ps,oz:ozW(w,c)});}
 vorDran(items);items.sort((a,b)=>a.y-b.y);
 for(const it of items){const z=it.oz||0;if(it.img){ctx.drawImage(it.img,it.x-it.ax,it.y-z-it.ay);continue;}if(it.bau){drawBau(ctx,it.bau);continue;}
  if(it.draw){if(z){ctx.save();ctx.translate(0,-z);it.draw(ctx);ctx.restore();}else it.draw(ctx);continue;}// oz: angehoben (Höhe des Bodens)
  const {w,ps}=it,x=Math.round(ps.x),y=Math.round(ps.y-z);
  if(miniV)drawMini(ctx,w.g,x,y);else drawFig(ctx,w.g,x,y,!ps.top?gehBild(w.dist):WALK,(ps.dx??1)<0?1:0);
  shown.push({w,x,y});}
 if(H.light){ctx.setTransform(DPR,0,0,DPR,0,0);H.light(ctx,VW,VH);ctx.setTransform(DPR*cam.s,0,0,DPR*cam.s,DPR*(VW/2-cam.x*cam.s),DPR*(VH/2-cam.y*cam.s));}
 H.world?.(ctx,view,dt);
 ctx.setTransform(1,0,0,1,0,0);
 const ms=performance.now()-t0;perfWin.push(ms);if(perfWin.length>30)perfWin.shift();perfAvg=perfWin.reduce((a,b)=>a+b,0)/perfWin.length;
 hudT+=dt;if(hudT>1){hudT=0;$('wCount').textContent=`${workers.length} Leute · ${shown.length} im Bild`;$('wClock').textContent=`Zoom ${cam.s.toFixed(2)}×${miniV?' · Miniaturansicht':detailV?' · Nahansicht':''}`;
  const bar=$('wPerfBar');bar.style.width=Math.round(clamp(perfAvg/16.7,0,1)*100)+'%';bar.style.background=perfAvg<8?'#6fae5a':perfAvg<13?'#d7b24a':'#c9483e';$('wPerf').textContent=perfAvg.toFixed(1)+' ms je Bild';}}

// ---------- Start ----------
try{window.ArenaUI?.close?.();}catch(e){}M.ui.click('nav:home');
// 2.0 (A3): echter Kader, kein Auffüllen auf 60 mehr. Ein neuer Platz startet einmalig mit START_KADER Gladiatoren (Vorschlag, Thomas bestätigt).
const START_KADER=8,lebend=S.roster.filter(g=>!g.dead).length,kader=window.AT2?(S.at2Kader?lebend:(S.at2Kader=1,Math.max(lebend,START_KADER))):60;
bake();makeRoster(kader);resize();cam.s=clamp(Math.max(.85,Math.min(VW/1100,VH/760)*1.1),minScale(),maxScale());clampCam();// am Handy nicht in der Miniaturansicht starten
$('weltBoot')?.remove();last=performance.now();requestAnimationFrame(frame);
// Für Bauen und Geländewerkzeug: angehobene Ecken eines Feldes, Felder einebnen, Bodenart nach Höhenänderung
function ecken(k){const x=k%N,y=(k/N)|0,P=[iso(x,y),iso(x+1,y),iso(x+1,y+1),iso(x,y+1)];return P.map((p,i)=>({x:p.x,y:p.y-(GROSS?hc[k*4+i]*HZ:0)}));}
function gelaendeTyp(k){obj[k]=0;kz[k]=0;const t=feld[k];if(!BODEN_NATUR.has(t))return;const m=Math.min(hc[k*4],hc[k*4+1],hc[k*4+2],hc[k*4+3]);if(m<WL)feld[k]=T.FLUSS;else if(t===T.FLUSS)feld[k]=grund[k];}
function ebnen(ks,L){for(const k of ks){hc.fill(L,k*4,k*4+4);gelaendeTyp(k);}if(L>HMAX)HMAX=L;if(L<HMIN)HMIN=L;}
const lamps=BAU.filter(b=>!b.flach).map(b=>{const p=iso(b.tx+b.w/2,b.ty+b.h+.3);return {x:p.x,y:p.y,r:120};});
window.WeltKarte={KW,HOEHE,DETAIL,SCHRITT,gehBild,drawFig,drawSit,drawMini,einfach:pof,cam,sprites:figs,get detail(){return detailV;},workers:()=>workers,shown:()=>shown,flyTo,pose,pose0,place,toWorld,spriteOf,FW,FH,FX,FY,WALK,SPEED,WW,WH,canvas:cv,lamps,
 N,TW,TH,T,NAMEN,feld,bauAuf,BAU,LUD,iso,tileAt,vonLudus,makeRoster,closeInfo(){},
 ANORD,fest,arenaPlatz,zaunA,zaunB,TORE,imAnord,inR,ber,BER,bfrei,// A3b natürlich: Bereiche mit geschwungenen Rändern
// A3: Dorf, Platz, Park (Lagen relativ zu O), feste Felder, Grenzen, Tore
 raster(on){raster=!!on;bake();},rebake,O,WEG_TY,HALLE,wegY:tx=>wy[clamp(tx|0,0,N-1)],HZ,WL,hc,grund,eben,hoehe,hz,hangF,huegel,bodenPunkt,ecken,ebnen,gelaendeTyp,get HMAX(){return HMAX;},get HMIN(){return HMIN;},merkeHoehe(h){if(h>HMAX)HMAX=h;if(h<HMIN)HMIN=h;},obj,klein:kz,biom,BODEN_NATUR,BODEN_NAME,kleinZahl:k=>kz[k],ix,inMap,imLudus,h2,get vw(){return VW;},get vh(){return VH;},get mini(){return miniV;},get clock(){return clock;},get tempo(){return tempo;},set tempo(v){tempo=Math.max(0,+v||0);},get perf(){return perfAvg;},get verdeckt(){return verdeckt;},
 // T3: Messung für Tests – Bodenstücke um (tx,ty) neu zeichnen, ms je Stück
 chunkZeit(tx,ty,n=4){const q=iso(tx,ty),cx=Math.floor(q.x/CH),cy=Math.floor(q.y/CH);let t=0,m=0;for(let j=0;j<n;j++)for(let i=0;i<n;i++){const key=(1000+cy+j)*1000+cx+i;chunks.delete(key);const a=performance.now();chunk(cx+i,cy+j,1);t+=performance.now()-a;m++;}return t/m;}};
window.WELT_READY=true;
})();
