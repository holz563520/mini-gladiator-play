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
// Test-Ludus: alle Einführungen gelten als gesehen
S.started=true;S.schoolName='Ludus Probatus';
S.lanista={name:'Lanista',height:180,weight:85,veteran:true,appearance:{skin:'#d9ac82',shade:'#9c7353',hair:'#443025',style:1,beard:2,cloth:'#435e6a'}};
try{const W=M.workshop;if(!W.state.master)W.hireMaster(W.sketch());W.state.intro='done';}catch(e){}
try{M.trader.state.intro='done';}catch(e){}
if(S.hall)S.hall.tut='done';else S.hall={tut:'done',recruit:null,tag:{}};
S.lion={stage:'done',recruits:[],base:[]};S.medic=Object.assign(S.medic||{},{stage:'skip'});S.archerPlot={seen:0,asked:true,state:'declined'};
S.wanderers={version:1,next:(S.day||1)+99999,group:null,known:[]};

// ---------- Raster ----------
// Arena Theory 2.0: große Karte (432 × 432, fünfmal die Fläche der 192er-Karte) mit Biomen rundherum; der alte Teil liegt
// um O verschoben in der Mitte. Der Tageslauf-Editor bleibt bei 96 ohne Biome.
const GROSS=!!window.AT2,N=GROSS?432:96,O=GROSS?168:0,TW=64,TH=32,OX=N*TW/2,OY=140,WW=N*TW,WH=N*TH+OY+60,TAU=Math.PI*2,clamp=(v,a,b)=>v<a?a:v>b?b:v;
const iso=(tx,ty)=>({x:(tx-ty)*TW/2+OX,y:(tx+ty)*TH/2+OY});// obere Ecke des Feldes; Mitte: iso(tx+.5,ty+.5)
const tileAt=(x,y)=>{const a=(x-OX)/(TW/2),b=(y-OY)/(TH/2);return {tx:(a+b)/2,ty:(b-a)/2};};
function hash(n){n=Math.imul(n^0x9e3779b9,0x85ebca6b);n^=n>>>13;n=Math.imul(n,0xc2b2ae35);n^=n>>>16;return (n>>>0)/4294967296;}
const h2=(x,y,s=0)=>hash(x*374761393+y*668265263+s*1442695);
const T={WIESE:0,WALD:1,WEG:2,FLUSS:3,BRUECKE:4,LUDUS:5,BAU:6,PLATZ:7,ARENA:8,TRIB:9,STR1:10,STR2:11,STR3:12,STR4:13,STR5:14,UNTERKUNFT:15,UNT_S:16,UNT_K:17,SCHM_S:18,SCHMIEDE:19,SCHM_K:20,SAND:21,DSCH:22,SUMPF:23,MOOR:24},NAMEN=['Wiese','Wald','Weg','Fluss','Brücke','Ludus','Gebäude','Übungsplatz','Kampffläche','Tribüne','Trampelpfad','Kiesweg','Pflasterweg','Steinstraße','Prachtstraße','Mannschaftsstube','Rattenloch','Fürstengemächer','Rostgrube','Waffenschmiede','Kaiserliche Waffenschmiede','Sand','Dschungelboden','Sumpf','Moorwasser'];
const feld=new Uint8Array(N*N),bauAuf=new Int8Array(N*N).fill(-1),ix=(tx,ty)=>ty*N+tx,inMap=(tx,ty)=>tx>=0&&ty>=0&&tx<N&&ty<N;
// Ludus in der Mitte: 18 × 16 Felder, ein Feld = 50 Bildpunkte des alten Ludus (900 × 760)
const LUD={tx:39+O,ty:40+O,w:18,h:16,px:50};
const vonLudus=(x,y)=>iso(LUD.tx+x/LUD.px,LUD.ty+y/LUD.px);
// Gebäude der Einführungen, Lage aus dem alten Ludus (ludus.js places, hs-art.js BEASTRIUM), auf ganze Felder gelegt
const BAU=[
 {id:'kaserne',name:'KASERNE',l:[45,50,235,133],hoch:44,wand:'#b9a27c',dach:'#a5553c'},
 {id:'hall',name:'HALL',l:[50,206,112,70],hoch:36,wand:'#8d8a80',dach:'#5d5a54'},
 {id:'markt',name:'SKLAVENMARKT',l:[45,280,230,118],hoch:26,wand:'#a98458',dach:'#c9b27a'},
 {id:'medicus',name:'MEDICUS',l:[34,447,250,163],hoch:40,wand:'#d2cbb8',dach:'#7e8a8c'},
 {id:'platz',name:'TRAININGSHOF',l:[310,247,275,343],hoch:0,wand:'#7a5a39',dach:'#d9c391',flach:true},
 {id:'schmiede',name:'SCHMIEDE',l:[638,86,215,150],hoch:42,wand:'#7d7468',dach:'#4b4640'},
 {id:'beastrium',name:'BEASTRIUM',l:[652,298,196,126],hoch:40,wand:'#96795a',dach:'#6b4a2c'}
];
for(const [i,b] of BAU.entries()){b.tx=LUD.tx+Math.round(b.l[0]/LUD.px);b.ty=LUD.ty+Math.round(b.l[1]/LUD.px);b.w=Math.max(1,Math.round(b.l[2]/LUD.px));b.h=Math.max(1,Math.round(b.l[3]/LUD.px));b.i=i;}
// Gelände: Wald links (linke Ecke der Raute), Fluss rechts vom Ludus, ein Weg über die ganze Karte vor dem Ludus.
// Große Karte: außerhalb eines Kreises um den Ludus (Rand verrauscht) liegen die Biome, nach Richtung verteilt:
// rechts Wüste (mit Oasen), unten Dschungel (mit Tümpeln), links Wald (mit Lichtungen), oben Sumpf (viel Moorwasser).
const flussX=ty=>O+72+Math.round(3*Math.sin(ty/9)+2*Math.sin(ty/4.3)),WEG_TY=O+58;
function vn(x,y,s){const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),a=h2(xi,yi,s),b=h2(xi+1,yi,s),c=h2(xi,yi+1,s),d=h2(xi+1,yi+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
const fbm=(x,y,s)=>vn(x,y,s)*.65+vn(x*2.1,y*2.1,s+7)*.35;
const B_=window.WeltNatur?.BIOM||{KERN:0,WALD:1,WUESTE:2,DSCHUNGEL:3,SUMPF:4},biom=new Uint8Array(N*N),SEKTOR=[B_.WUESTE,B_.DSCHUNGEL,B_.WALD,B_.SUMPF];
for(let ty=0;ty<N;ty++)for(let tx=0;tx<N;tx++){let t=T.WIESE,bi=0;const lx=tx-O,ly=ty-O;
 if(GROSS){const dx=tx-O-48,dy=ty-O-48,d=Math.hypot(dx,dy)+(fbm(tx/22,ty/22,3)-.5)*44;
  if(d>112){const a=Math.atan2(dx+dy,dx-dy)+(fbm(tx/40,ty/40,4)-.5)*1.6;bi=SEKTOR[((Math.round(a/(Math.PI/2))%4)+4)%4];const w=fbm(tx/9,ty/9,5);
   t=bi===B_.WALD?(w>.72?T.WIESE:T.WALD):bi===B_.WUESTE?(w>.84?T.FLUSS:w>.77?T.WIESE:T.SAND):bi===B_.DSCHUNGEL?(w>.8?T.MOOR:T.DSCH):(w>.52?T.MOOR:T.SUMPF);}}
 if(!bi&&ly-lx>30+h2(tx>>2,ty>>2,5)*9)t=T.WALD;
 if(Math.abs(tx-flussX(ty))<=1)t=T.FLUSS;else if(bi===B_.SUMPF&&Math.abs(tx-flussX(ty))<=3)t=T.MOOR;
 if(ty===WEG_TY||ty===WEG_TY+1)t=t===T.FLUSS||t===T.MOOR?T.BRUECKE:T.WEG;
 if(tx>=LUD.tx&&tx<LUD.tx+LUD.w&&ty>=LUD.ty&&ty<LUD.ty+LUD.h)t=T.LUDUS;
 feld[ix(tx,ty)]=t;biom[ix(tx,ty)]=bi||(t===T.WALD?B_.WALD:0);}
for(const b of BAU)for(let y=b.ty;y<b.ty+b.h;y++)for(let x=b.tx;x<b.tx+b.w;x++){feld[ix(x,y)]=b.flach?T.PLATZ:T.BAU;bauAuf[ix(x,y)]=b.i;}
// Naturobjekte (welt-natur.js): je Feld höchstens eines. Alles darauf ist entfernbar (obj = 0); nicht am Weg, nicht um den Ludus.
const NB=window.WeltNatur,obj=new Uint8Array(N*N),BODEN_NATUR=new Set([T.WIESE,T.WALD,T.SAND,T.DSCH,T.SUMPF,T.MOOR,T.FLUSS]),
 BODEN_NAME={[T.WIESE]:'wiese',[T.WALD]:'wald',[T.SAND]:'sand',[T.DSCH]:'dsch',[T.SUMPF]:'sumpf',[T.MOOR]:'moor',[T.FLUSS]:'wasser'};
if(NB)for(let ty=0;ty<N;ty++)for(let tx=0;tx<N;tx++){const k=ix(tx,ty),t=feld[k],lx=tx-O,ly=ty-O;if(!BODEN_NATUR.has(t)||Math.abs(ty-WEG_TY-.5)<=1.6)continue;if(lx>=24&&lx<=74&&ly>=20&&ly<=64)continue;
 obj[k]=NB.waehle(biom[k],BODEN_NAME[t],tx,ty,fbm(tx/14,ty/14,6));}
const ovar=(tx,ty)=>NB?NB.variante(tx,ty):0;

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
 [[46,68,56],[54,78,64],[40,60,50],[96,116,82]]// Moorwasser (4. Farbe = Algen)
];
const VAR=3,sprites=[[],[]];// [ohne Raster, mit Raster][typ*VAR+v]
function tileSprite(t,v,grid){const [c,g]=mkCanvas(TW,TH+1),img=g.createImageData(TW,TH+1),d=img.data,P=PAL[t];
 for(let y=0;y<=TH;y++)for(let x=0;x<TW;x++){const e=Math.abs(x-31.5)/32+Math.abs(y-16)/16;if(e>1.001)continue;let n=h2(x>>1,y,t*17+v*5),col=P[n<.5?0:n<.72?1:n<.9?2:3];
  if(t===T.SAND){const a=(x-31.5)/32,b=(y-16)/16,ux=(a+b+1)/2,uy=(b-a+1)/2,wl=(ux*2.2+uy*.8+Math.sin(uy*6+v)*.12)%1;col=wl<.1?P[3]:P[n<.55?0:n<.85?1:2];if(n>.985)col=[168,140,96];}
  if(t===T.DSCH){col=P[n<.5?0:n<.8?1:2];if(h2(x>>1,y,v+51)>.9)col=P[3];if(h2(x,y,v+53)>.988)col=[120,70,40];}
  if(t===T.SUMPF){col=P[n<.5?0:n<.8?1:2];if(h2(x>>2,y>>1,v+61)>.82)col=P[3];if(h2(x,y,v+63)>.97)col=[110,130,70];}
  if(t===T.MOOR){col=P[n<.6?0:n<.88?1:2];if(h2(x>>1,y,v+71)>.94)col=P[3];}
  if(t===T.SCHM_S){col=P[n<.5?0:n<.8?1:2];if(h2(x>>2,y>>1,v+41)>.84)col=P[3];if(h2(x,y,v+43)>.996)col=[176,92,40];}
  if(t===T.SCHMIEDE||t===T.SCHM_K){const a=(x-31.5)/32,b=(y-16)/16,ux=(a+b+1)/2,uy=(b-a+1)/2,k3=t===T.SCHMIEDE?3:2,cx=(ux*k3)%1,cy=((uy*k3)+(t===T.SCHMIEDE?(((ux*k3)|0)&1)*.5:0))%1;col=cx<.06||cy<.06?P[3]:P[n<.6?0:n<.86?1:2];if(t===T.SCHMIEDE&&n>.965)col=[64,60,56];}
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
function strMaske(tx,ty){let m=0;if(tx+1<N&&schliesstAn(feld[ix(tx+1,ty)]))m|=1;if(tx>0&&schliesstAn(feld[ix(tx-1,ty)]))m|=2;if(ty+1<N&&schliesstAn(feld[ix(tx,ty+1)]))m|=4;if(ty>0&&schliesstAn(feld[ix(tx,ty-1)]))m|=8;return m;}
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
// Ein Feld malen: Boden, bei Straßen darüber der Belag mit seinen Anschlüssen
function maleFeld(g,sp,tx,ty,x,y){const t=feld[ix(tx,ty)],v=Math.floor(h2(tx,ty,3)*VAR);if(!istStr(t)){g.drawImage(sp[t*VAR+v],x,y);return;}
 const unten=tx>=LUD.tx&&tx<LUD.tx+LUD.w&&ty>=LUD.ty&&ty<LUD.ty+LUD.h?T.LUDUS:ty===WEG_TY||ty===WEG_TY+1?T.WEG:T.WIESE;g.drawImage(sp[unten*VAR+v],x,y);g.drawImage(strBild(t,strMaske(tx,ty)),x,y);}
// ---------- Übersicht (einmal gezeichnet, für die weite Ansicht) ----------
// OV: Verkleinerung, damit die Übersicht höchstens ~3500 Bildpunkte breit ist (große Karte: 8). Beim Bauen wird nur der geänderte
// Ausschnitt neu gemalt (rebake mit Feldliste).
const OV=Math.max(2,Math.ceil(WW/3500));let overview=null,raster=true;
function objekteMalen(g,x0,y0,x1,y1){if(!NB)return;for(let v=x0+y0;v<=x1+y1;v++)for(let tx=Math.max(x0,v-y1);tx<=Math.min(x1,v-y0);tx++){const ty=v-tx,o=obj[ix(tx,ty)];if(!o)continue;const b=NB.bild(o,ovar(tx,ty)),p=iso(tx+.5,ty+.5);g.drawImage(b.img,p.x-b.ax,p.y-b.ay);}}
function bake(){const [c,g]=mkCanvas(Math.ceil(WW/OV),Math.ceil(WH/OV));g.imageSmoothingEnabled=true;g.fillStyle='#1c2416';g.fillRect(0,0,c.width,c.height);g.scale(1/OV,1/OV);const sp=sprites[raster?1:0];
 for(let ty=0;ty<N;ty++)for(let tx=0;tx<N;tx++){const p=iso(tx,ty);maleFeld(g,sp,tx,ty,p.x-TW/2,p.y);}
 objekteMalen(g,0,0,N-1,N-1);overview=c;chunks.clear();}
function rebake(ks){if(!ks||!ks.length||!overview){bake();return;}let x0=N,y0=N,x1=0,y1=0;
 for(const k of ks){const x=k%N,y=(k/N)|0;if(!BODEN_NATUR.has(feld[k]))obj[k]=0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
 x0=Math.max(0,x0-1);y0=Math.max(0,y0-1);x1=Math.min(N-1,x1+1);y1=Math.min(N-1,y1+1);
 const rx0=iso(x0,y1+1).x-2,rx1=iso(x1+1,y0).x+2,ry0=iso(x0,y0).y-140,ry1=iso(x1+1,y1+1).y+2,ax0=Math.max(0,x0-10),ay0=Math.max(0,y0-10),ax1=Math.min(N-1,x1+10),ay1=Math.min(N-1,y1+10),sp=sprites[raster?1:0];
 const g=overview.getContext('2d');g.save();g.setTransform(1/OV,0,0,1/OV,0,0);g.imageSmoothingEnabled=true;g.beginPath();g.rect(rx0,ry0,rx1-rx0,ry1-ry0);g.clip();g.fillStyle='#1c2416';g.fillRect(rx0,ry0,rx1-rx0,ry1-ry0);
 for(let v=ax0+ay0;v<=ax1+ay1;v++)for(let tx=Math.max(ax0,v-ay1);tx<=Math.min(ax1,v-ay0);tx++){const ty=v-tx,p=iso(tx,ty);maleFeld(g,sp,tx,ty,p.x-TW/2,p.y);}
 objekteMalen(g,ax0,ay0,ax1,ay1);g.restore();
 for(const [key,ch] of chunks)if(ch.x0<rx1&&ch.x0+ch.S+8>rx0&&ch.y0<ry1&&ch.y0+ch.S+8>ry0)chunks.delete(key);}

// ---------- Bodenkacheln: der Boden wird in Stücken vorgezeichnet und beim Bauen verworfen ----------
// lod 1: 512 × 512 Weltpunkte, stehende Objekte bleiben eigene Dinge (Tiefenreihenfolge mit Figuren).
// lod 2/4 (nur große Karte, weit herausgezoomt): größere Stücke verkleinert, Objekte mit ins Bild gemalt.
const CH=512,chunks=new Map();let frameNo=0;
function chunk(cx,cy,lod=1){const S=CH*lod,key=(lod*1000+cy)*1000+cx;let ch=chunks.get(key);if(ch)return ch;const [c,g]=mkCanvas(CH+2,CH+2),x0=cx*S,y0=cy*S,sp=sprites[raster?1:0],stehen=[];
 g.fillStyle='#1c2416';g.fillRect(0,0,CH+2,CH+2);g.imageSmoothingEnabled=lod>1;g.scale(1/lod,1/lod);g.translate(-x0,-y0);
 const u0=Math.floor((x0-OX)/(TW/2))-2,u1=Math.ceil((x0+S+2*lod-OX)/(TW/2))+1,v0=Math.max(0,Math.floor((y0-OY)/(TH/2))-2),v1=Math.min(2*N-2,Math.ceil((y0+S+2*lod-OY)/(TH/2))+1);
 for(let v=v0;v<=v1;v++)for(let u=u0+((u0+v)&1);u<=u1;u+=2){const tx=(u+v)>>1,ty=(v-u)>>1;if(tx<0||ty<0||tx>=N||ty>=N)continue;maleFeld(g,sp,tx,ty,(tx-ty)*TW/2+OX-TW/2,v*TH/2+OY);}
 if(NB){const V1=Math.min(2*N-2,v1+(lod>1?10:0)),U0=u0-(lod>1?3:0),U1=u1+(lod>1?3:0);
  for(let v=v0;v<=V1;v++)for(let u=U0+((U0+v)&1);u<=U1;u+=2){const tx=(u+v)>>1,ty=(v-u)>>1;if(tx<0||ty<0||tx>=N||ty>=N)continue;const o=obj[ix(tx,ty)];if(!o)continue;const b=NB.bild(o,ovar(tx,ty)),x=(tx-ty)*TW/2+OX,y=v*TH/2+OY+TH/2;
   if(b.flach||lod>1)g.drawImage(b.img,x-b.ax,y-b.ay);else if(x>=x0&&x<x0+S&&y>=y0&&y<y0+S)stehen.push({x,y,img:b.img,ax:b.ax,ay:b.ay});}}
 ch={c,stehen,used:frameNo,x0,y0,S};chunks.set(key,ch);return ch;}

// ---------- Gebäude als Skizze ----------
function shade(hex,k){const n=parseInt(hex.slice(1),16);return 'rgb('+[n>>16,(n>>8)&255,n&255].map(v=>Math.round(clamp(v*k,0,255))).join(',')+')';}
function poly(g,pts,fill){g.beginPath();g.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);g.closePath();g.fillStyle=fill;g.fill();g.stroke();}
function drawBau(g,b){const A=iso(b.tx,b.ty),B=iso(b.tx+b.w,b.ty),C=iso(b.tx+b.w,b.ty+b.h),D=iso(b.tx,b.ty+b.h),up=p=>({x:p.x,y:p.y-b.hoch}),mid={x:(A.x+C.x)/2,y:(A.y+C.y)/2-b.hoch};
 g.lineWidth=1.5;g.strokeStyle='#20140c';g.lineJoin='round';
 if(b.flach){g.setLineDash([6,4]);g.strokeStyle=b.wand;g.lineWidth=2.5;g.beginPath();g.moveTo(A.x,A.y);g.lineTo(B.x,B.y);g.lineTo(C.x,C.y);g.lineTo(D.x,D.y);g.closePath();g.stroke();g.setLineDash([]);}
 else{poly(g,[D,C,up(C),up(D)],shade(b.wand,.72));poly(g,[C,B,up(B),up(C)],b.wand);poly(g,[up(A),up(B),up(C),up(D)],b.dach);}
 g.font='bold 12px ui-monospace,Menlo,Consolas,monospace';g.textAlign='center';g.textBaseline='middle';const w=g.measureText(b.name).width+10;
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
const KW=.46,SPEED=15,FW=56,FH=72,FX=28,FY=62,WALK=8,DETAIL=2,HOEHE=21,SCHRITT=15,figs=new Map();let spriteBudget=0,workers=[];
function spriteOf(g){let s=figs.get(g.id);if(s)return s;if(spriteBudget<=0)return null;spriteBudget--;
 const [c,ctx]=mkCanvas(FW*(WALK+1),FH*2);const base={g,team:0,ammo:0,a:0,energy:100,index:0,baseX:0,baseY:0};
 try{ctx.fillStyle='rgba(15,20,10,.3)';for(let dir=0;dir<2;dir++)for(let f=0;f<=WALK;f++)ctx.fillRect(f*FW+FX-9,dir*FH+FY-1,18,3);
  for(let dir=0;dir<2;dir++){for(let f=0;f<WALK;f++){ctx.save();ctx.translate(f*FW,dir*FH);M.renderLudusActors(ctx,[{...base,x:FX,y:FY,a:dir?Math.PI:0,state:'move',moveSpeed:40,phase:f/WALK*TAU}]);ctx.restore();}
   ctx.save();ctx.translate(WALK*FW,dir*FH);M.renderLudusActors(ctx,[{...base,x:FX,y:FY,a:dir?Math.PI:0,state:'idle',moveSpeed:0,phase:0}]);ctx.restore();}}catch(e){console.warn(e);}
 s={c};figs.set(g.id,s);return s;}
// Einfache Figuren: groß gemalt (NW × NH), dann auf ein Drittel verkleinert (PW × PH) in gemeinsame Bildseiten gelegt.
// Je Figur eine Zeile: WALK Gehbilder und ein Standbild nach rechts, dann dasselbe nach links.
const NW=48,NH=84,NAX=24,NAY=78,PW=16,PH=28,PAX=8,PAY=26,PROW=240,pages=[],pof=new Map(),[scratch,sg]=mkCanvas(NW,NH),[klein,kg]=mkCanvas(PW,PH);let pBudget=0,pNext=0;
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
const frei=(tx,ty)=>{tx=Math.floor(tx);ty=Math.floor(ty);if(!inMap(tx,ty))return false;const t=feld[ix(tx,ty)];return t!==T.BAU&&t!==T.FLUSS&&t!==T.UNTERKUNFT&&t!==T.UNT_S&&t!==T.UNT_K&&t!==T.SCHM_S&&t!==T.SCHMIEDE&&t!==T.SCHM_K;};
const imLudus=(tx,ty)=>tx>=LUD.tx&&tx<LUD.tx+LUD.w&&ty>=LUD.ty&&ty<LUD.ty+LUD.h;
function makeRoster(n){const keep=S.roster.filter(g=>!g.dead);let list=keep.slice(0,n);const rng=S.rng;while(list.length<n){const g=M.makeGladiator(0);g.fatigue=0;list.push(g);}S.rng=rng;
 S.roster=list;try{M.army?.autoClasses?.(list);}catch(e){}for(const w of workers){figs.delete(w.g.id);pof.delete(w.g.id);}if(pNext>PROW*6){pof.clear();pNext=0;}
 workers=list.map((g,i)=>{let tx,ty,k=0;do{tx=LUD.tx+h2(i,k,21)*LUD.w;ty=LUD.ty+h2(i,k,22)*LUD.h;k++;}while(!frei(tx,ty)&&k<40);const p=iso(tx,ty);return {g,x:p.x,y:p.y,dist:h2(i,7,23)*60,seed:h2(i,7,23)*1000,wait:h2(i,3,24)*8,goal:null,dir:0,walk:false};});}
function wander(w,dt){if(w.wait>0){w.wait-=dt;w.walk=false;return;}// (schlendern)
 if(!w.goal){const c=tileAt(w.x,w.y),home=imLudus(c.tx,c.ty);for(let k=0;k<6&&!w.goal;k++){const tx=c.tx+(Math.random()-.5)*9,ty=c.ty+(Math.random()-.5)*9;if(!frei(tx,ty)||(home&&!imLudus(tx,ty)))continue;
   let ok=true;for(let s=1;s<8&&ok;s++)ok=frei(c.tx+(tx-c.tx)*s/8,c.ty+(ty-c.ty)*s/8);if(ok)w.goal=iso(tx,ty);}
  if(!w.goal){w.wait=1;return;}}
 const dx=w.goal.x-w.x,dy=w.goal.y-w.y,d=Math.hypot(dx,dy),step=SPEED*dt;w.walk=true;if(Math.abs(dx)>1)w.dir=dx<0?1:0;
 if(d<=step){w.x=w.goal.x;w.y=w.goal.y;w.goal=null;w.wait=2+Math.random()*9;w.walk=false;return;}w.x+=dx/d*step;w.y+=dy/d*step;w.dist+=step;}
function pose0(w){return {x:w.x,y:w.y,dx:w.dir?-1:1,dy:0,state:w.walk?'schlendert durch den Ludus':'steht herum',work:false,top:!w.walk};}
function pose(w){const ps=pose0(w);return H.pose?H.pose(w,ps,clock):ps;}
function place(g,x,y){const w=workers.find(w=>w.g.id===g.id);if(!w)return;w.x=x;w.y=y;w.goal=null;w.wait=2.5;w.walk=false;}

// ---------- Ansicht, Kamera, Bedienung ----------
const cv=$('weltCanvas'),ctx=cv.getContext('2d');let VW=1,VH=1,DPR=1;
const L0=iso(LUD.tx+LUD.w/2,LUD.ty+LUD.h/2),cam={x:L0.x,y:L0.y,s:1};
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
const MINI=.6,NAH=.6,FERN=OV>2?.15:.6;let clock=0,last=performance.now(),perfAvg=4,perfWin=[],hudT=0,miniV=false,detailV=false;
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.1,(now-last)/1000);last=now;if(document.hidden||document.body.classList.contains('w-admin'))return;
 const t0=performance.now();clock+=dt;H.tick?.(dt);for(const w of workers)wander(w,dt);
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
 for(const b of BAU)items.push({y:b.key,bau:b});H.items?.(items,view);
 // Figuren; wer vor einem Gebäude steht, wird nach ihm gezeichnet
 shown=[];spriteBudget=Math.max(2,Math.round(12-perfAvg));pBudget=Math.max(3,Math.round(14-perfAvg));
 for(const w of workers){const ps=pose(w);if(ps.x==null||ps.x<view.x0-40||ps.x>view.x1+40||ps.y<view.y0-20||ps.y>view.y1+80)continue;let y=ps.y;const c=tileAt(ps.x,ps.y);
  for(const b of BAU)if(!b.flach&&y<=b.key&&(c.tx>=b.tx+b.w||c.ty>=b.ty+b.h)&&c.tx>b.tx-2&&c.ty>b.ty-2)y=b.key+.01;if(H.vorne)y=H.vorne(c.tx,c.ty,y);items.push({y,w,ps});}
 items.sort((a,b)=>a.y-b.y);
 for(const it of items){if(it.img){ctx.drawImage(it.img,it.x-it.ax,it.y-it.ay);continue;}if(it.bau){drawBau(ctx,it.bau);continue;}if(it.draw){it.draw(ctx);continue;}
  const {w,ps}=it,x=Math.round(ps.x),y=Math.round(ps.y);
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
bake();makeRoster(60);resize();cam.s=clamp(Math.max(.85,Math.min(VW/1100,VH/760)*1.1),minScale(),maxScale());// am Handy nicht in der Miniaturansicht startenclampCam();
$('weltBoot')?.remove();last=performance.now();requestAnimationFrame(frame);
const lamps=BAU.filter(b=>!b.flach).map(b=>{const p=iso(b.tx+b.w/2,b.ty+b.h+.3);return {x:p.x,y:p.y,r:120};});
window.WeltKarte={KW,HOEHE,DETAIL,SCHRITT,gehBild,drawFig,drawSit,drawMini,einfach:pof,cam,sprites:figs,get detail(){return detailV;},workers:()=>workers,shown:()=>shown,flyTo,pose,pose0,place,toWorld,spriteOf,FW,FH,FX,FY,WALK,SPEED,WW,WH,canvas:cv,lamps,
 N,TW,TH,T,NAMEN,feld,bauAuf,BAU,LUD,iso,tileAt,vonLudus,makeRoster,closeInfo(){},
 raster(on){raster=!!on;bake();},rebake,O,WEG_TY,obj,biom,BODEN_NATUR,ix,inMap,imLudus,h2,get vw(){return VW;},get vh(){return VH;},get mini(){return miniV;},get clock(){return clock;},get perf(){return perfAvg;}};
window.WELT_READY=true;
})();
