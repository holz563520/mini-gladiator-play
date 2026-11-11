'use strict';
// =====================================================================================================================
// WELTKARTE · TESTVERSION (Schritt 1 aus prototypes/grosse-karte/README.md). Nur auf weltkarte-test.html geladen,
// nicht im Spiel. Spielstand nur im Arbeitsspeicher der Seite (weltkarte-boot.js schirmt den Speicher ab).
//
// · Große Karte 3840 × 2560. In der Mitte liegt der unveränderte Ludus (900 × 760) als Hof: Er wird nicht nachgebaut,
//   sondern jedes Bild aus der echten Ludus-Leinwand des Spiels (#ludusCanvas) übernommen. Gebäude, Händler, Intros und
//   alle Koordinaten im Hof bleiben damit genau wie im Spiel. Antippen im Hof wird an den Ludus weitergereicht.
// · Gelände in Kacheln (512 × 512) vorgezeichnet, nur sichtbare Kacheln werden kopiert; Kacheln außer Sicht werden
//   verworfen und bei Bedarf neu gezeichnet. Ganz herausgezoomt zeichnet eine Übersicht (¼ Auflösung).
// · Figuren: Jede Tätigkeit läuft als feste Zeitrechnung (Position = Funktion der Uhr), nicht als Wegsuche. Gezeichnet
//   werden nur so viele, wie der Regler erlaubt; jede Figur einmal als Bildbogen vorbereitet (echter Figurenzeichner).
// · Noch keine Spielwirkung: keine Erträge, kein Lernen, kein Tageswechsel, keine Kämpfe (spätere Schritte).
// =====================================================================================================================
(()=>{
const H=window.WeltHook=window.WeltHook||{};// Anschlüsse für spätere Schritte (welt-zeit.js, welt-leben.js); leer = Verhalten wie Schritt 1
const M=window.MG,S=M.s,$=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const WW=3840,WH=2560,CH=512,HOF={x:1470,y:880,w:900,h:760};
const TAU=Math.PI*2,clamp=(v,a,b)=>v<a?a:v>b?b:v;

// ---------- Test-Ludus (wie die Aufstellungs-Testversion): alle Einführungen gelten als gesehen ----------
S.started=true;S.schoolName='Ludus Probatus';
S.lanista={name:'Lanista',height:180,weight:85,veteran:true,appearance:{skin:'#d9ac82',shade:'#9c7353',hair:'#443025',style:1,beard:2,cloth:'#435e6a'}};
try{const W=M.workshop;if(!W.state.master)W.hireMaster(W.sketch());W.state.intro='done';}catch(e){}
try{M.trader.state.intro='done';}catch(e){}
if(S.hall)S.hall.tut='done';else S.hall={tut:'done',recruit:null,tag:{}};
S.lion={stage:'done',recruits:[],base:[]};S.medic=Object.assign(S.medic||{},{stage:'skip'});S.archerPlot={seen:0,asked:true,state:'declined'};
S.wanderers={version:1,next:(S.day||1)+99999,group:null,known:[]};

// ---------- kleine Hilfen ----------
function hash(n){n=Math.imul(n^0x9e3779b9,0x85ebca6b);n^=n>>>13;n=Math.imul(n,0xc2b2ae35);n^=n>>>16;return (n>>>0)/4294967296;}
const h2=(x,y,s=0)=>hash(Math.imul(x|0,73856093)^Math.imul(y|0,19349663)^Math.imul(s,83492791));
function vnoise(x,y,s){const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
 const a=h2(xi,yi,s),b=h2(xi+1,yi,s),c=h2(xi,yi+1,s),d=h2(xi+1,yi+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
const fbm=(x,y,s)=>vnoise(x,y,s)*.55+vnoise(x*2.1,y*2.1,s+7)*.3+vnoise(x*4.3,y*4.3,s+13)*.15;
function segDist(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy||1;let t=((px-ax)*dx+(py-ay)*dy)/l;t=clamp(t,0,1);const x=ax+dx*t-px,y=ay+dy*t-py;return Math.sqrt(x*x+y*y);}
function lineDist(px,py,pts){let d=1e9;for(let i=1;i<pts.length;i++){const q=segDist(px,py,pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1]);if(q<d)d=q;}return d;}
function path(pts){const seg=[];let len=0;for(let i=1;i<pts.length;i++){const l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push(l);len+=l;}
 return {pts,seg,len,at(d){d=clamp(d,0,len);for(let i=0;i<seg.length;i++){if(d<=seg[i]||i===seg.length-1){const t=seg[i]?d/seg[i]:0,a=pts[i],b=pts[i+1];return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,dx:b[0]-a[0],dy:b[1]-a[1]};}d-=seg[i];}return {x:pts[0][0],y:pts[0][1],dx:1,dy:0};},
  rev(){return path([...pts].reverse());}};}
// Hof-Koordinaten → Welt
const hx=x=>HOF.x+x,hy=y=>HOF.y+y;

// ---------- Landschaft: Fluss, Straßen, Gebiete ----------
const RIVER=[[930,-20],[985,360],[900,760],[800,1180],[770,1560],[720,1900],[690,2240],[640,2600]];
const ROAD=[[-20,1935],[420,1915],[720,1900],[1080,1912],[1460,1892],[2080,1880],[2620,1858],[3020,1842],[3380,1880],[3600,1990],[3860,2060]];
const GATE={x:hx(610),y:hy(757)},JOIN=[2080,1880];
const PATHS=[
 [[GATE.x,GATE.y],[2080,1760],JOIN],                                                     // Südtor → Straße
 [[1300,1902],[1290,1640],[1270,1360],[1300,1060],[1360,860],[1500,700],[1640,650]],       // Westweg: Friedhof, Wald
 [[1325,960],[1300,800],[1262,705]],                                                        // zum Köhlermeiler
 [[1300,1150],[1240,1150]],                                                                  // Friedhofstor
 [[2620,1858],[2600,1560],[2560,1260],[2520,1100],[2640,960],[2860,900],[3000,880]],       // Ostweg: Schmelze, Mine
 [[3380,1880],[3470,2060],[3520,2200]],                                                    // zur Arena
 [[1460,1892],[1420,2030],[1500,2120],[1760,2140],[2200,2130],[2460,2140]],                // Feldweg: Hühnerhof, Zwinger
 [[420,1915],[420,2080],[380,2240]]                                                         // ins Dorf
];
const inHof=(x,y,m=0)=>x>HOF.x-m&&x<HOF.x+HOF.w+m&&y>HOF.y-m&&y<HOF.y+HOF.h+m;
const mountain=(x,y)=>{const edge=2800+fbm(y/260,1,3)*260-Math.max(0,(y-900))*.05;return x>edge&&y<1420+fbm(x/300,2,4)*120&&y>-40;};
const forestEdge=x=>640+fbm(x/420,5,9)*170;
const forest=(x,y)=>y<forestEdge(x)&&!mountain(x,y);
const fieldRects=[[1330,1990,330,190],[1700,1990,250,110],[1330,2210,300,150],[1680,2240,260,130],[2550,1990,260,170]];
const inField=(x,y)=>fieldRects.find(r=>x>=r[0]&&x<r[0]+r[2]&&y>=r[1]&&y<r[1]+r[3]);

// ---------- Gebäude und Orte (Weltkoordinaten; x,y = linke obere Ecke der Grundfläche) ----------
const SITES=[
 {id:'holz',name:'Holzfällerlager',sub:'Holz fällen · Holz hacken',x:1500,y:560,w:210,h:150,later:'Holz fällen und hacken (Schritt 4–5).'},
 {id:'meiler',name:'Köhlermeiler',sub:'Holzkohle',x:1160,y:600,w:170,h:120,later:'Holzkohle aus Holz (Schritt 4).'},
 {id:'mine',name:'Erzmine',sub:'Erz abbauen',x:2930,y:760,w:240,h:170,later:'Erz abbauen. Erz braucht der Schmied für jede Waffe (Schritt 4).'},
 {id:'schmelze',name:'Schmelze',sub:'Erz zu Eisen',x:2400,y:960,w:190,h:160,later:'Erz schmelzen. Der Schmied schmiedet daraus, verkauft aber weiter (Schritt 4).'},
 {id:'stand',name:'Verkaufsstand',sub:'Überflüssiges verkaufen',x:2150,y:1720,w:150,h:90,later:'Überflüssige Beute verkaufen (Schritt 7).'},
 {id:'turm',name:'Wachturm',sub:'Wachen',x:2640,y:1650,w:70,h:110,later:'Wachen sehen Karren und fremde Wegelagerer früher (Schritt 8).'},
 {id:'hall',name:'Hall of the Fallen',sub:'Friedhof der Gefallenen',x:985,y:870,w:230,h:150,later:'Die Halle bleibt über das Tor im Hof erreichbar; hier steht sie sichtbar am Friedhof (Schritt 10).',route:'fallen'},
 {id:'friedhof',name:'Friedhof',sub:'Gräber der Gefallenen',x:950,y:1040,w:290,h:240,later:'Gräber wachsen mit der Halle mit (Schritt 10).',route:'fallen'},
 {id:'huehner',name:'Hühnerhof',sub:'Hähne',x:2060,y:2160,w:170,h:110,later:'Hühnerschule und Hähne wie bisher.'},
 {id:'zwinger',name:'Zwinger',sub:'Hunde',x:2360,y:2160,w:200,h:110,later:'Zwinger und Hundefang wie bisher.'},
 {id:'dorf',name:'Dorf',sub:'Bauern, Kunden',x:160,y:2080,w:420,h:330,later:'Kunden für den Verkaufsstand kommen von hier (Schritt 7).'},
 {id:'arena',name:'Stadt-Arena',sub:'Kämpfe wie bisher',x:3330,y:2180,w:420,h:300,later:'Arenakämpfe bleiben im Hof über das Arena-Tor.',route:'arena'},
 {id:'p-bruecke',name:'Posten Brücke',sub:'Wegelagerer',x:680,y:1850,w:90,h:90,post:true,later:'Wegelagerer platzieren und Karren ausspähen (Schritt 8).'},
 {id:'p-hecke',name:'Posten Hecke',sub:'Wegelagerer',x:1040,y:1945,w:120,h:60,post:true,later:'Wegelagerer platzieren und Karren ausspähen (Schritt 8).'},
 {id:'p-wald',name:'Posten Waldrand',sub:'Wegelagerer',x:2900,y:1745,w:110,h:70,post:true,later:'Wegelagerer platzieren und Karren ausspähen (Schritt 8).'},
 {id:'p-felsen',name:'Posten Felsen',sub:'Wegelagerer',x:3230,y:1800,w:110,h:70,post:true,later:'Wegelagerer platzieren und Karren ausspähen (Schritt 8).'},
 {id:'hof',name:'Ludus (Hof)',sub:'unverändert aus dem Spiel',x:HOF.x,y:HOF.y,w:HOF.w,h:HOF.h,hof:true}
];
const SITE=Object.fromEntries(SITES.map(s=>[s.id,s]));
const center=s=>({x:s.x+s.w/2,y:s.y+s.h/2});

// ---------- Bäume, Felsen, Deko (fest gesät) ----------
const TREES=[],ROCKS=[],BUSH=[];
(()=>{const blocked=(x,y,m)=>inHof(x,y,m+30)||SITES.some(s=>!s.hof&&x>s.x-m&&x<s.x+s.w+m&&y>s.y-m-20&&y<s.y+s.h+m)||lineDist(x,y,RIVER)<46+m||lineDist(x,y,ROAD)<34+m||PATHS.some(p=>lineDist(x,y,p)<20+m)||inField(x,y);
 for(let gy=0;gy<WH;gy+=26)for(let gx=0;gx<WW;gx+=26){const j=h2(gx,gy,1),x=gx+(h2(gx,gy,2)-.5)*22,y=gy+(h2(gx,gy,3)-.5)*22;
  if(mountain(x,y)){if(j<.05&&!blocked(x,y,6))ROCKS.push({x,y,s:.7+h2(gx,gy,4)*.9,v:Math.floor(h2(gx,gy,5)*3)});continue;}
  if(forest(x,y)){const edge=forestEdge(x)-y,dense=edge>60?.5:.22;if(j<dense&&!blocked(x,y,4))TREES.push({x,y,v:h2(gx,gy,6)<.72?0:1,s:.85+h2(gx,gy,7)*.4});continue;}
  if(j<.012&&!blocked(x,y,14))TREES.push({x,y,v:2+Math.floor(h2(gx,gy,8)*2),s:.8+h2(gx,gy,9)*.35});
  else if(j<.03&&!blocked(x,y,6))BUSH.push({x,y,v:Math.floor(h2(gx,gy,10)*3)});
  else if(j<.036&&!blocked(x,y,4))ROCKS.push({x,y,s:.35+h2(gx,gy,11)*.3,v:Math.floor(h2(gx,gy,12)*3)});}
 TREES.sort((a,b)=>a.y-b.y);ROCKS.sort((a,b)=>a.y-b.y);})();
// Bäume rund ums Holzfällerlager, an denen gearbeitet wird (Stümpfe und Fällbäume)
const CHOP=[];for(let i=0;i<14;i++){const a=-Math.PI*.95+i/13*Math.PI*.9,r=150+(i%3)*28;CHOP.push({x:1605+Math.cos(a)*r*1.2,y:640+Math.sin(a)*r*.55});}

// ---------- Farbtafel ----------
const P={grass:[[85,112,60],[95,122,66],[76,102,54],[103,128,71],[70,95,50]],forest:[[56,78,44],[62,86,48],[49,70,40],[68,92,52]],
 dirt:[[154,131,88],[141,118,80],[166,141,96],[131,108,73]],path:[[139,121,82],[128,110,75],[150,131,90]],
 water:[[47,90,110],[56,106,128],[42,80,100],[74,125,144]],bank:[[116,104,70],[104,94,62]],rock:[[110,106,98],[125,120,110],[93,89,82],[140,134,122]],
 field:[[138,122,62],[124,108,52],[150,134,70]],fieldG:[[96,118,52],[84,104,46]]};

// ---------- Kachel zeichnen ----------
// Für jede Kachel nur die Wegstücke in der Nähe (sonst ~50 Abstandsrechnungen je Bildpunkt)
const segsOf=pts=>{const o=[];for(let i=1;i<pts.length;i++)o.push([pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1]]);return o;};
const SEG={river:segsOf(RIVER),road:segsOf(ROAD),paths:PATHS.flatMap(segsOf)};let NEAR=SEG;
function nearSegs(x0,y0,x1,y1,m){const f=a=>a.filter(([ax,ay,bx,by])=>Math.max(ax,bx)>x0-m&&Math.min(ax,bx)<x1+m&&Math.max(ay,by)>y0-m&&Math.min(ay,by)<y1+m);return {river:f(SEG.river),road:f(SEG.road),paths:f(SEG.paths)};}
function sd(x,y,list){let d=1e9;for(const q of list){const v=segDist(x,y,q[0],q[1],q[2],q[3]);if(v<d)d=v;}return d;}
function groundAt(x,y){
 const n=fbm(x/180,y/180,1),k0=h2(x>>1,y>>1,21),k=fbm(x/22,y/22,22)*.75+k0*.25;
 const rd=sd(x,y,NEAR.river);if(rd<30){const w=P.water[(k*3|0)+(Math.sin(x*.05+y*.03)>.85?1:0)];return rd>24?P.water[2]:w;}if(rd<38)return P.bank[k<.5?0:1];
 const road=sd(x,y,NEAR.road);if(road<24){if(road>20)return P.path[2];return P.dirt[(n*2+k*2)|0];}
 if(NEAR.paths.length){const d=sd(x,y,NEAR.paths);if(d<16&&d<12+fbm(x/40,y/40,5)*4)return P.path[(k*3)|0];}
 if(mountain(x,y)){const r=fbm(x/90,y/90,7);return P.rock[Math.min(3,(r*3.2+k*.6)|0)];}
 const f=inField(x,y);if(f){const row=((y-f[1])>>3)&1;return row?P.field[(k*2.5)|0]:P.fieldG[(k*1.8)|0];}
 if(forest(x,y))return P.forest[Math.min(3,(n*2.2+k*1.5)|0)];
 const v=n*2.2+k*1.6+(k0>.97?1:0);return P.grass[v<1.5?2:v<2.1?0:v<2.6?1:v<3.1?3:4];}
// Kleine Figuren für die Deko, einmal vorgezeichnet
const SPR={};
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.imageSmoothingEnabled=false;return [c,g];}
function px(g,x,y,w,h,col){g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function blob(g,cx,cy,rx,ry,cols,seed){for(let y=-ry;y<=ry;y+=2)for(let x=-rx;x<=rx;x+=2){const d=(x*x)/(rx*rx)+(y*y)/(ry*ry);if(d>1-h2(x+seed,y,31)*.18)continue;const lit=(-x-y*1.3)/(rx+ry);const i=clamp(Math.floor((lit*.5+.5)*cols.length+h2(x,y+seed,32)*.8-.4),0,cols.length-1);px(g,cx+x,cy+y,2,2,cols[i]);}}
function makeSprites(){
 // Laubbaum, Nadelbaum, Olivenbaum, Zypresse
 {const [c,g]=mkCanvas(56,74);px(g,24,48,8,22,'#5b4029');px(g,26,48,3,22,'#6e5033');blob(g,28,30,24,22,['#2f4a26','#3a5a2d','#466b34','#56803d','#6a9446'],1);SPR.oak=c;}
 {const [c,g]=mkCanvas(40,80);px(g,18,62,5,16,'#5a3f28');for(let i=0;i<5;i++){const w=6+i*3.6,y=6+i*11;blob(g,20,y+6,w,7,['#233d25','#2c4a2c','#365a33','#43683b'],i*7);}SPR.pine=c;}
 {const [c,g]=mkCanvas(44,52);px(g,19,32,5,18,'#6e5a44');blob(g,22,22,19,15,['#59633f','#6b7549','#7d8756','#929b66'],3);SPR.olive=c;}
 {const [c,g]=mkCanvas(20,66);px(g,9,54,3,10,'#5b4632');blob(g,10,30,8,27,['#24382a','#2d4632','#38563b','#45663f'],5);SPR.cypress=c;}
 {const [c,g]=mkCanvas(26,16);blob(g,13,9,12,7,['#3f5a30','#4b6a37','#5a7c41'],9);SPR.bush0=c;}
 {const [c,g]=mkCanvas(26,16);blob(g,13,9,12,7,['#4a5a2e','#5b6d37','#6d8043'],11);px(g,8,6,2,2,'#c94f4f');px(g,15,9,2,2,'#c94f4f');SPR.bush1=c;}
 {const [c,g]=mkCanvas(26,16);blob(g,13,9,12,7,['#3c5532','#486538','#58773f'],13);px(g,10,5,2,2,'#e6d27a');SPR.bush2=c;}
 for(let v=0;v<3;v++){const [c,g]=mkCanvas(40,30);blob(g,20,17,18-v*3,12-v*2,['#4d4a45','#615d56','#77726a','#8d877c','#a39c8f'],v*17);SPR['rock'+v]=c;}
 {const [c,g]=mkCanvas(18,12);px(g,1,4,16,7,'#5a3f28');px(g,3,2,12,4,'#6d5033');px(g,4,3,10,2,'#9c7a4c');px(g,7,3,4,1,'#b39462');SPR.stump=c;}
}
function drawTree(g,t){const s=t.v===0?SPR.pine:t.v===1?SPR.oak:t.v===2?SPR.olive:SPR.cypress,w=s.width*t.s,h=s.height*t.s;
 g.fillStyle='rgba(20,30,15,.28)';g.beginPath();g.ellipse(t.x+4,t.y,w*.42,w*.16,0,0,TAU);g.fill();g.drawImage(s,Math.round(t.x-w/2),Math.round(t.y-h+4),Math.round(w),Math.round(h));}
// ---------- Gebäude malen (Pixelstil wie im Ludus) ----------
function roof(g,x,y,w,h,c1,c2,c3){for(let i=0;i<h;i+=3)px(g,x-2+i*.15,y+i,w+4-i*.3,3,i%6?c1:c2);px(g,x-3,y+h-2,w+6,3,c3);}
function wallWood(g,x,y,w,h){px(g,x,y,w,h,'#7a5a39');for(let i=0;i<h;i+=6)px(g,x,y+i,w,1,'#5e4229');for(let i=8;i<w;i+=22)px(g,x+i,y,2,h,'#634630');}
function wallStone(g,x,y,w,h,base='#8d8172'){px(g,x,y,w,h,base);for(let r=0;r*7<h;r++)for(let c=0;c*14<w+14;c++){const ox=(r%2)*7;px(g,x+c*14-ox,y+r*7,13,6,['#9b8f7e','#857a6b','#a39784','#7c7163'][(c*3+r*5)%4]);}px(g,x,y,w,2,'#b3a690');}
function shadow(g,x,y,w,h){g.fillStyle='rgba(15,20,10,.3)';g.fillRect(Math.round(x+6),Math.round(y+h-4),Math.round(w),8);}
function door(g,x,y,w,h){px(g,x,y,w,h,'#3a2617');px(g,x+2,y+2,w-4,h-2,'#4b3220');px(g,x+w-5,y+h/2,2,2,'#c9a55a');}
function sign(g,x,y,text){g.font='bold 9px monospace';const w=Math.ceil(g.measureText(text).width)+8;px(g,x-w/2,y,w,13,'#5e4229');px(g,x-w/2+1,y+1,w-2,11,'#8a6a42');px(g,x-1,y+13,2,10,'#5e4229');g.fillStyle='#f1dfb4';g.fillText(text,Math.round(x-w/2+4),y+10);}
function logs(g,x,y,n,rows=3){for(let r=0;r<rows;r++)for(let i=0;i<n-r;i++){const cx=x+i*12+r*6,cy=y-r*9;px(g,cx,cy,11,9,'#6b4a2c');px(g,cx+2,cy+2,7,5,'#b18c58');px(g,cx+4,cy+4,3,1,'#8c6a40');}}
function crate(g,x,y,col='#8a6a42'){px(g,x,y,16,14,'#5e4229');px(g,x+1,y+1,14,12,col);px(g,x+1,y+6,14,2,'#5e4229');}
function orePile(g,x,y,s=1){blob(g,x,y,18*s,9*s,['#4a3a34','#5c463c','#7a5544','#9a6848'],x|0);for(let i=0;i<7;i++)px(g,x-12*s+h2(i,x|0,3)*24*s,y-6*s+h2(i,y|0,4)*10*s,3,2,'#c9824e');}
function grave(g,x,y,v){if(v===0){px(g,x,y,10,14,'#8d8a80');px(g,x+1,y,8,2,'#a6a398');px(g,x+2,y+5,6,1,'#6d6a62');}else if(v===1){px(g,x+4,y,3,16,'#7d6a52');px(g,x,y+4,11,3,'#7d6a52');}else{px(g,x,y+4,12,10,'#7a776e');px(g,x+1,y+2,10,3,'#8e8b81');}px(g,x-2,y+15,15,3,'#4f5f36');}
function paintSites(g){
 // Holzfällerlager: Hütte, Holzstapel, Sägebock, Hackklotz
 {const s=SITE.holz;shadow(g,s.x+20,s.y+20,110,70);wallWood(g,s.x+20,s.y+40,110,60);roof(g,s.x+20,s.y+10,110,32,'#6b4a2c','#5a3d24','#3f2a18');door(g,s.x+64,s.y+70,20,30);
  logs(g,s.x+140,s.y+92,5);logs(g,s.x+26,s.y+128,6,2);px(g,s.x+150,s.y+120,26,4,'#6b4a2c');px(g,s.x+152,s.y+124,3,12,'#5e4229');px(g,s.x+170,s.y+124,3,12,'#5e4229');px(g,s.x+152,s.y+114,22,6,'#b18c58');
  px(g,s.x+110,s.y+128,16,10,'#6b4a2c');px(g,s.x+111,s.y+126,14,4,'#b18c58');px(g,s.x+116,s.y+116,2,12,'#7a5a39');px(g,s.x+112,s.y+114,8,4,'#9aa1a6');sign(g,s.x+40,s.y+108,'HOLZ');}
 for(const c of CHOP)if(h2(c.x|0,c.y|0,40)<.5)g.drawImage(SPR.stump,Math.round(c.x-9),Math.round(c.y-6));
 // Köhlermeiler: Erdhügel, Holzstapel
 {const s=SITE.meiler;blob(g,s.x+80,s.y+70,56,30,['#2c2420','#3b302a','#4c3d33','#5d4b3d'],77);px(g,s.x+76,s.y+40,8,6,'#1d1714');logs(g,s.x+8,s.y+110,4,2);logs(g,s.x+120,s.y+112,3,2);px(g,s.x+60,s.y+104,40,6,'#22201c');sign(g,s.x+150,s.y+30,'KOHLE');}
 // Erzmine: Felswand, Holzstollen, Schienen, Lore, Erzhaufen
 {const s=SITE.mine,mx=s.x+90,my=s.y+30;blob(g,mx+30,my+10,95,55,['#4d4a45','#5e5a53','#706b62','#857f74'],91);px(g,mx,my+4,60,62,'#1a1512');px(g,mx+6,my+10,48,56,'#0e0b09');
  px(g,mx-6,my-2,72,8,'#6b4a2c');px(g,mx-6,my-2,8,70,'#6b4a2c');px(g,mx+58,my-2,8,70,'#6b4a2c');px(g,mx-6,my-2,72,2,'#8c6a40');
  for(let i=0;i<9;i++){px(g,mx+10+i*2,my+66+i*9,40,2,'#5e4229');}px(g,mx+14,my+66,2,84,'#7d7c78');px(g,mx+44,my+66,2,84,'#7d7c78');
  px(g,mx+16,my+112,30,16,'#4a3a2c');px(g,mx+18,my+108,26,6,'#7a5544');px(g,mx+18,my+128,6,6,'#2a2a2a');px(g,mx+38,my+128,6,6,'#2a2a2a');orePile(g,mx+26,my+108,.6);
  orePile(g,s.x+28,s.y+140,1.1);orePile(g,s.x+200,s.y+138,.9);crate(g,s.x+170,s.y+100,'#7a5a39');sign(g,s.x+40,s.y+96,'ERZ');px(g,s.x+212,s.y+60,3,30,'#6b4a2c');px(g,s.x+200,s.y+60,26,3,'#6b4a2c');}
 // Schmelze: Rennofen aus Stein, Kamin, Blasebalg, Kohle, Erz
 {const s=SITE.schmelze;shadow(g,s.x+10,s.y+40,170,100);px(g,s.x+10,s.y+60,170,4,'#5e4229');for(let i=0;i<4;i++)px(g,s.x+14+i*52,s.y+60,5,70,'#634630');roof(g,s.x+4,s.y+30,182,32,'#8a5a3a','#744a30','#4e3220');
  wallStone(g,s.x+70,s.y+68,56,64,'#7c6d5c');px(g,s.x+84,s.y+108,28,24,'#1a100a');px(g,s.x+88,s.y+112,20,18,'#7a2b12');px(g,s.x+92,s.y+116,12,12,'#d5692a');
  wallStone(g,s.x+84,s.y+2,28,40,'#6f6252');px(g,s.x+82,s.y,32,4,'#3b3229');
  px(g,s.x+130,s.y+110,30,14,'#5e4229');px(g,s.x+132,s.y+104,24,8,'#8a6a42');px(g,s.x+156,s.y+108,14,4,'#3b3229');
  blob(g,s.x+34,s.y+132,22,10,['#141210','#1f1c19','#2b2723'],401);orePile(g,s.x+164,s.y+140,.8);px(g,s.x+20,s.y+92,30,22,'#6e6a62');for(let i=0;i<4;i++)px(g,s.x+22+i*7,s.y+94,5,18,'#8c8f93');sign(g,s.x+30,s.y+70,'EISEN');}
 // Verkaufsstand: gestreiftes Sonnendach, Tisch mit Waren
 {const s=SITE.stand;shadow(g,s.x+10,s.y+30,130,50);px(g,s.x+10,s.y+52,130,22,'#6b4a2c');px(g,s.x+12,s.y+50,126,4,'#8c6a40');
  for(let i=0;i<4;i++)px(g,s.x+12+i*40,s.y+16,4,60,'#5e4229');for(let i=0;i<13;i++)px(g,s.x+4+i*11,s.y+6,11,14,i%2?'#e9dfc8':'#a8332f');for(let i=0;i<13;i++)px(g,s.x+4+i*11,s.y+20,11,4,i%2?'#cdbf9f':'#7d2421');
  px(g,s.x+20,s.y+44,18,4,'#9aa1a6');px(g,s.x+22,s.y+40,2,10,'#6b4a2c');px(g,s.x+48,s.y+40,14,10,'#8a6a42');px(g,s.x+50,s.y+38,10,4,'#b59a6a');px(g,s.x+72,s.y+42,16,8,'#7f8a90');px(g,s.x+96,s.y+38,6,12,'#b8862e');px(g,s.x+106,s.y+40,22,6,'#6e5236');
  crate(g,s.x+132,s.y+62);crate(g,s.x-6,s.y+64,'#7a5a39');sign(g,s.x+75,s.y-20,'MARKT');}
 // Wachturm
 {const s=SITE.turm;shadow(g,s.x,s.y+60,60,50);for(const dx of [6,54])px(g,s.x+dx,s.y+30,6,80,'#5e4229');for(let i=0;i<5;i++)px(g,s.x+6,s.y+40+i*14,54,2,'#6b4a2c');px(g,s.x,s.y+22,70,12,'#7a5a39');px(g,s.x+2,s.y+12,66,10,'#8a6a42');roof(g,s.x,s.y-6,70,18,'#6b4a2c','#5a3d24','#3f2a18');px(g,s.x+32,s.y-14,2,10,'#5e4229');px(g,s.x+34,s.y-14,12,7,'#a8332f');}
 // Hall of the Fallen: Säulenhalle mit dunklem Dach, Feuerbecken
 {const s=SITE.hall;shadow(g,s.x+6,s.y+40,220,110);px(g,s.x+6,s.y+128,218,14,'#8d8a80');px(g,s.x+12,s.y+122,206,8,'#a29f94');wallStone(g,s.x+24,s.y+52,182,72,'#77746b');
  for(let i=0;i<6;i++){px(g,s.x+26+i*34,s.y+46,12,78,'#c9c4b4');px(g,s.x+28+i*34,s.y+46,3,78,'#e6e1d0');px(g,s.x+24+i*34,s.y+44,16,4,'#b3ad9c');}
  for(let i=0;i<20;i++)px(g,s.x+14+i*5,s.y+44-i*1.6,206-i*10,2,i%2?'#3b3442':'#2e2834');px(g,s.x+10,s.y+40,210,6,'#4a4253');door(g,s.x+101,s.y+84,28,40);px(g,s.x+103,s.y+84,24,3,'#c9a55a');
  for(const dx of [-4,222]){px(g,s.x+dx,s.y+108,12,18,'#5d5952');px(g,s.x+dx-2,s.y+104,16,6,'#3b3229');}}
 // Friedhof: Zaun, Gräber, Zypressen
 {const s=SITE.friedhof;for(let i=0;i<s.w;i+=8){px(g,s.x+i,s.y,2,12,'#5e4229');px(g,s.x+i,s.y+s.h-12,2,12,'#5e4229');}px(g,s.x,s.y+3,s.w,2,'#6b4a2c');px(g,s.x,s.y+s.h-9,s.w,2,'#6b4a2c');for(let j=0;j<s.h;j+=8){px(g,s.x,s.y+j,2,8,'#5e4229');px(g,s.x+s.w-2,s.y+j,2,8,'#5e4229');}
  for(let r=0;r<5;r++)for(let c=0;c<9;c++){if(h2(r,c,51)<.25)continue;grave(g,s.x+18+c*31+(r%2)*8,s.y+26+r*40,Math.floor(h2(r,c,52)*3));}}
 // Hühnerhof: Stall, Zaun
 {const s=SITE.huehner;shadow(g,s.x+10,s.y+10,80,60);wallWood(g,s.x+10,s.y+30,80,44);roof(g,s.x+10,s.y+8,80,24,'#a0553a','#8a4630','#5e2f20');door(g,s.x+42,s.y+52,16,22);for(let i=0;i<s.w;i+=7)px(g,s.x+96+i*.4,s.y+30+((i*3)%80),2,10,'#6b4a2c');
  for(let i=0;i<70;i+=7){px(g,s.x+96+i,s.y+28,2,12,'#7a5a39');px(g,s.x+96+i,s.y+96,2,12,'#7a5a39');}px(g,s.x+96,s.y+31,70,2,'#8c6a40');px(g,s.x+96,s.y+99,70,2,'#8c6a40');px(g,s.x+96,s.y+28,2,80,'#7a5a39');px(g,s.x+166,s.y+28,2,80,'#7a5a39');}
 // Zwinger: Steinbau mit Gittern
 {const s=SITE.zwinger;shadow(g,s.x+6,s.y+20,190,70);wallStone(g,s.x+6,s.y+30,190,56,'#7b7062');roof(g,s.x+6,s.y+12,190,20,'#5c5248','#4b433b','#332d27');for(let i=0;i<5;i++){px(g,s.x+18+i*36,s.y+52,24,30,'#1d1714');for(let b=0;b<5;b++)px(g,s.x+20+i*36+b*5,s.y+52,2,30,'#7d7c78');}px(g,s.x+6,s.y+86,190,4,'#5d5952');}
 // Dorf: Häuser mit Ziegeldach, Brunnen
 {const s=SITE.dorf,H=[[20,20,90,60],[150,10,100,64],[290,40,90,58],[40,150,110,66],[200,140,80,56],[300,190,100,62],[120,250,90,56]];
  for(const [x,y,w,h] of H){shadow(g,s.x+x,s.y+y+10,w,h);wallStone(g,s.x+x,s.y+y+h*.4,w,h*.6,'#c2b08c');roof(g,s.x+x,s.y+y,w,h*.42,'#a8533a','#934531','#5e2f20');door(g,s.x+x+w/2-7,s.y+y+h-20,14,20);px(g,s.x+x+12,s.y+y+h*.55,10,8,'#3a2a20');px(g,s.x+x+w-22,s.y+y+h*.55,10,8,'#3a2a20');}
  wallStone(g,s.x+250,s.y+110,30,18,'#7c7163');px(g,s.x+254,s.y+112,22,6,'#2f5a6e');px(g,s.x+248,s.y+96,3,16,'#5e4229');px(g,s.x+279,s.y+96,3,16,'#5e4229');px(g,s.x+246,s.y+94,38,4,'#6b4a2c');}
 // Stadt-Arena in der Ferne
 {const s=SITE.arena,cx=s.x+s.w/2,cy=s.y+s.h/2;g.fillStyle='rgba(15,20,10,.3)';g.beginPath();g.ellipse(cx+10,cy+20,200,130,0,0,TAU);g.fill();
  for(let ring=0;ring<4;ring++){g.fillStyle=['#a89a82','#bcae94','#cfc2a6','#ded2b6'][ring];g.beginPath();g.ellipse(cx,cy-ring*10,200-ring*8,130-ring*8,0,0,TAU);g.fill();}
  for(let i=0;i<40;i++){const a=i/40*TAU,x=cx+Math.cos(a)*182,y=cy-30+Math.sin(a)*112;if(Math.sin(a)>-.2){px(g,x-5,y-8,10,14,'#6b5f4e');px(g,x-4,y-7,8,10,'#2b241d');}}
  g.fillStyle='#c9a86a';g.beginPath();g.ellipse(cx,cy-36,110,62,0,0,TAU);g.fill();g.fillStyle='#b8965a';g.beginPath();g.ellipse(cx,cy-36,100,54,0,0,TAU);g.fill();
  for(let i=0;i<6;i++){const a=i/6*TAU;px(g,cx+Math.cos(a)*190-1,cy-90+Math.sin(a)*120,3,26,'#5e4229');px(g,cx+Math.cos(a)*190+2,cy-90+Math.sin(a)*120,12,8,i%2?'#a8332f':'#d7b24a');}}
 // Posten der Wegelagerer: Brücke, Hecke, Waldrand, Felsen
 {const b=SITE['p-bruecke'];px(g,b.x+4,b.y+26,82,38,'#6b4a2c');for(let i=0;i<10;i++)px(g,b.x+6+i*8,b.y+28,6,34,i%2?'#8a6a42':'#7a5a39');px(g,b.x+2,b.y+22,86,4,'#5e4229');px(g,b.x+2,b.y+64,86,4,'#5e4229');for(let i=0;i<6;i++){px(g,b.x+4+i*16,b.y+14,3,12,'#5e4229');px(g,b.x+4+i*16,b.y+66,3,12,'#5e4229');}}
 {const h=SITE['p-hecke'];for(let i=0;i<6;i++)g.drawImage(SPR['bush'+(i%3)],h.x+i*19,h.y+10+(i%2)*6,32,20);}
 {const w=SITE['p-wald'];for(let i=0;i<3;i++)drawTree(g,{x:w.x+20+i*34,y:w.y+40+(i%2)*14,v:1,s:.9});for(let i=0;i<3;i++)g.drawImage(SPR['bush'+i],w.x+10+i*30,w.y+44,30,18);}
 {const f=SITE['p-felsen'];for(let i=0;i<4;i++)g.drawImage(SPR['rock'+(i%3)],f.x+i*24,f.y+20+(i%2)*10,40+(i%2)*10,30);}
 // Wegweiser
 sign(g,2120,1835,'LUDUS');sign(g,1300,1840,'WALD');sign(g,2650,1820,'MINE');sign(g,3420,1846,'ARENA');sign(g,440,1870,'DORF');
}
// Kachel bauen: Boden per Bildpunktfeld (2-px-Raster), dann alle Dinge, die in die Kachel ragen (nach Tiefe)
const STATIC=[];// {y,draw(g)} – Bäume, Felsen, Büsche, Gebäude (Gebäude als ein Eintrag je Kachel gezeichnet)
function buildStatic(){for(const t of TREES)STATIC.push({x:t.x,y:t.y,r:46,draw:g=>drawTree(g,t)});for(const r of ROCKS){const s=SPR['rock'+r.v];STATIC.push({x:r.x,y:r.y,r:30,draw:g=>g.drawImage(s,Math.round(r.x-20*r.s),Math.round(r.y-24*r.s),Math.round(40*r.s),Math.round(30*r.s))});}
 for(const b of BUSH)STATIC.push({x:b.x,y:b.y,r:16,draw:g=>g.drawImage(SPR['bush'+b.v],Math.round(b.x-13),Math.round(b.y-12))});STATIC.sort((a,b)=>a.y-b.y);}
function bakeChunk(cx,cy){const out=bakeFull(cx,cy),k=cx+','+cy;if(!half.has(k)){const [hc,hg]=mkCanvas(CH/2,CH/2);hg.imageSmoothingEnabled=true;hg.drawImage(out,0,0,CH/2,CH/2);half.set(k,hc);}return out;}
function bakeFull(cx,cy){const [c,g]=mkCanvas(CH,CH),x0=cx*CH,y0=cy*CH,img=g.createImageData(CH,CH),d=img.data;NEAR=nearSegs(x0,y0,x0+CH,y0+CH,60);
 for(let y=0;y<CH;y+=2)for(let x=0;x<CH;x+=2){const col=groundAt(x0+x,y0+y);for(let k=0;k<4;k++){const i=((y+(k>>1))*CH+x+(k&1))*4;d[i]=col[0];d[i+1]=col[1];d[i+2]=col[2];d[i+3]=255;}}
 NEAR=SEG;g.putImageData(img,0,0);g.save();g.translate(-x0,-y0);
 // Grashalme und Kiesel (fein, zufällig fest)
 for(let i=0;i<180;i++){const x=x0+h2(i,cx*31+cy,61)*CH,y=y0+h2(i,cy*17+cx,62)*CH;if(inHof(x,y)||lineDist(x,y,ROAD)<26||lineDist(x,y,RIVER)<40||mountain(x,y))continue;px(g,x,y,2,2,forest(x,y)?'#2f4426':'#6f8f4b');px(g,x+2,y-2,1,2,'#7e9d55');}
 // Uferkante und Straßenrand
 for(const o of STATIC){if(o.x<x0-o.r*2||o.x>x0+CH+o.r*2||o.y<y0-10||o.y>y0+CH+o.r*2)continue;o.draw(g);}
 paintSites(g);g.restore();return c;}

// ---------- Kachelspeicher (begrenzt) und Übersicht ----------
const NCX=Math.ceil(WW/CH),NCY=Math.ceil(WH/CH),chunks=new Map(),half=new Map(),OV=4;let overview=null,ovG=null,baked=0;const MAXCH=30;
function chunk(cx,cy,allowBake){const k=cx+','+cy;let c=chunks.get(k);if(c){chunks.delete(k);chunks.set(k,c);return c;}if(!allowBake)return null;c=bakeChunk(cx,cy);chunks.set(k,c);baked++;
 if(!ovDone.has(k)){ovDone.add(k);ovG.drawImage(c,cx*CH/OV,cy*CH/OV,CH/OV,CH/OV);}while(chunks.size>MAXCH)chunks.delete(chunks.keys().next().value);return c;}
const ovDone=new Set();function ovStep(){for(let cy=0;cy<NCY;cy++)for(let cx=0;cx<NCX;cx++){const k=cx+','+cy;if(ovDone.has(k))continue;ovDone.add(k);const c=chunks.get(k)||bakeChunk(cx,cy);if(!chunks.has(k)&&chunks.size<MAXCH)chunks.set(k,c);ovG.drawImage(c,cx*CH/OV,cy*CH/OV,CH/OV,CH/OV);return true;}return false;}

// ---------- Tätigkeiten (Schritt 1: nur Anzeige, keine Erträge) ----------
const JOBS=[
 {id:'holz',name:'Holz fällen',site:'holz',kind:'chop',tool:'axe',icon:'🪓'},
 {id:'hacken',name:'Holz hacken',site:'holz',kind:'stay',tool:'axe',icon:'🪵'},
 {id:'kohle',name:'Köhlern',site:'meiler',kind:'stay',tool:'shovel',icon:'⚫'},
 {id:'erz',name:'Erz abbauen',site:'mine',kind:'mine',tool:'pick',icon:'⛏'},
 {id:'tragen',name:'Erz tragen',site:'mine',kind:'carry',tool:'load',icon:'🧺'},
 {id:'schmelzen',name:'Erz schmelzen',site:'schmelze',kind:'stay',tool:'hammer',icon:'🔥'},
 {id:'stand',name:'Verkaufsstand',site:'stand',kind:'stay',tool:null,icon:'⚖'},
 {id:'wache',name:'Wache',site:'turm',kind:'patrol',tool:null,icon:'🛡'},
 {id:'lager',name:'Wegelagerer',site:'post',kind:'post',tool:null,icon:'🗡'},
 {id:'training',name:'Training im Hof',site:'hof',kind:'hof',tool:null,icon:'⚔'},
 {id:'ruhe',name:'Ruhe / Medicus',site:'hof',kind:'hof',tool:null,icon:'✚'}
];
const JOB=Object.fromEntries(JOBS.map(j=>[j.id,j]));
const POSTS=SITES.filter(s=>s.post);
const roleOf=g=>g.role||(['bow','crossbow'].includes(M.gear?.(g,'weapon')?.def)?'Fernkämpfer':'Soldat');
let workers=[];// {g,job,i,seed,post,route...}
const manual=new Map();// g.id → {job,post} von Hand gewählt (gilt bis zum neuen Testkader)
function assign(){const list=S.roster.filter(g=>!g.dead);const by={};workers=list.map((g,i)=>{let job;const hurt=(M.health?.(g)??100)<75||(g.blood??100)<65,r=roleOf(g),u=hash(i*7+3);
  if(hurt)job='ruhe';else if(r==='Fernkämpfer')job=u<.45?'wache':u<.75?'lager':u<.88?'stand':'training';else if(r==='Assassine')job=u<.4?'lager':u<.6?'tragen':u<.75?'stand':u<.9?'kohle':'training';
  else job=u<.32?'holz':u<.5?'erz':u<.62?'schmelzen':u<.72?'hacken':u<.82?'tragen':u<.9?'lager':'training';
  const m=manual.get(g.id);if(m)job=m.job;
  const n=by[job]=(by[job]||0)+1;return {g,job,n:n-1,seed:hash(i*13+5)*1000,post:m?.post?POSTS.find(p=>p.id===m.post):POSTS[(n-1)%POSTS.length]};});
 const per={};for(const w of workers)if(w.job==='lager'){w.n=per[w.post.id]=(per[w.post.id]??-1)+1;}for(const w of workers)w.count=by[w.job];hidden=new Set(workers.filter(w=>JOB[w.job].kind!=='hof').map(w=>w.g.id));try{M.ludus?.refresh?.();}catch(e){}tableDirty=true;}
let hidden=new Set();const prevHidden=M.ludusHidden;M.ludusHidden=g=>hidden.has(g.id)||!!prevHidden?.(g);
// Wege zwischen Hoftor und Arbeitsort
const ROUTE={
 holz:path([[GATE.x,GATE.y],[2080,1760],JOIN,[1460,1892],[1300,1902],[1290,1640],[1270,1360],[1300,1060],[1360,860],[1500,700],[1640,650]]),
 meiler:path([[GATE.x,GATE.y],[2080,1760],JOIN,[1460,1892],[1300,1902],[1290,1640],[1270,1360],[1300,1060],[1325,960],[1300,800],[1262,705]]),
 mine:path([[GATE.x,GATE.y],[2080,1760],JOIN,[2620,1858],[2600,1560],[2560,1260],[2520,1100],[2640,960],[2860,900],[3010,905]]),
 schmelze:path([[GATE.x,GATE.y],[2080,1760],JOIN,[2620,1858],[2600,1560],[2560,1260],[2540,1140]]),
 carry:path([[3010,905],[2860,900],[2640,960],[2560,1110]]),
 stand:path([[GATE.x,GATE.y],[2120,1745],[2200,1792]]),
 turm:path([[GATE.x,GATE.y],[2080,1760],JOIN,[2620,1858],[2676,1772]])
};
const postRoute=p=>p._r??=path([[GATE.x,GATE.y],[2080,1760],JOIN,...(p.x<2080?[[p.x+45,1895]]:[[p.x+55,1860]]),[p.x+p.w/2,p.y+p.h/2+(p.id==='p-bruecke'?-30:8)]]);
const SPEED=42;// Weltpunkte je Sekunde beim Gehen
// Position und Tätigkeit zu einer Uhrzeit: feste Rechnung, für sichtbare und unsichtbare Figuren gleich
function pose(w,t){const ps=pose0(w,t);return H.pose?H.pose(w,ps,t):ps;}
function pose0(w,t){const J=JOB[w.job],sd=w.seed;
 if(J.kind==='hof')return {x:null,y:null,state:J.id==='ruhe'?'liegt beim Medicus':'trainiert im Hof',work:false};
 const lead=(r,dt)=>{const len=r.len/SPEED;return dt<len?r.at(dt*SPEED):null;};
 const T0=40+((sd*7)%30);// gestaffelter Arbeitsbeginn: in den ersten Sekunden laufen alle aus dem Tor
 if(J.kind==='chop'){const tree=CHOP[w.n%CHOP.length],base=ROUTE.holz,go=lead(base,t-((sd%20)));if(go)return {...go,state:'geht zum Wald',work:false};
  const cyc=(t+sd)%32,cx=tree.x+((w.n/CHOP.length|0)%2)*14-7,cy=tree.y+8,camp=center(SITE.holz);
  if(cyc<10)return {x:cx,y:cy,dx:camp.x-cx,dy:0,state:'fällt einen Baum',work:true,tool:'axe'};
  const f=cyc<21?(cyc-10)/11:1-(cyc-21)/11,x=cx+(camp.x+40-cx)*f,y=cy+(camp.y+50-cy)*f;return {x,y,dx:(cyc<21?1:-1)*(camp.x-cx),dy:0,state:cyc<21?'trägt Holz ins Lager':'geht zum nächsten Baum',work:false,tool:cyc<21?'log':null};}
 const site=J.site==='post'?w.post:SITE[J.site];
 const r=J.site==='post'?postRoute(w.post):J.id==='tragen'?ROUTE.mine:J.id==='kohle'?ROUTE.meiler:J.id==='schmelzen'?ROUTE.schmelze:J.id==='stand'?ROUTE.stand:J.id==='wache'?ROUTE.turm:J.id==='erz'?ROUTE.mine:ROUTE.holz;
 const go=lead(r,t-(sd%20));if(go)return {...go,state:'geht zur Arbeit',work:false};
 const end=r.at(r.len),ang=(w.n*2.39996)%TAU,rad=14+(w.n%5)*9;
 if(J.kind==='carry'){const c=ROUTE.carry,d=c.len,cyc=(t*SPEED+sd*9)%(2*d+180);if(cyc<60)return {x:c.pts[0][0]+Math.cos(ang)*8,y:c.pts[0][1]+12,state:'lädt Erz',work:true,tool:'load'};
  if(cyc<60+d){const p=c.at(cyc-60);return {...p,state:'trägt Erz zur Schmelze',work:false,tool:'ore'};}if(cyc<120+d){const q=c.at(d);return {x:q.x+Math.cos(ang)*10,y:q.y+8,state:'lädt ab',work:true};}const p=c.at(2*d+120-cyc);return {...p,dx:-p.dx,dy:-p.dy,state:'geht zurück zur Mine',work:false};}
 if(J.kind==='mine'){const inside=(Math.floor((t+sd)/25)+w.n)%3===0;if(inside)return {x:null,y:null,state:'unter Tage',work:true};const x=site.x+40+((w.n*37)%160),y=site.y+120+((w.n*23)%40);return {x,y,dx:1,dy:0,state:'bricht Erz',work:true,tool:'pick'};}
 if(J.kind==='patrol'){if((w.n%3)===0)return {x:site.x+35,y:site.y+23,dx:1,dy:0,state:'hält Ausschau auf dem Turm',work:false,top:true};
  const loop=path([[2400,1660],[2400,900],[1440,900],[1440,1660],[2040,1660]]).rev(),d=(t*SPEED*.7+sd*31+w.n*400)%loop.len,p=loop.at(d);return {...p,state:'geht Streife um den Hof',work:false};}
 if(J.kind==='post'){const x=site.x+site.w/2+Math.cos(ang)*rad*1.4,y=site.y+site.h/2+Math.sin(ang)*rad*.6+4;return {x,y,dx:-1,dy:0,state:'lauert am '+site.name.replace('Posten ',''),work:false,crouch:true};}
 // ortsfeste Arbeit (Hacken, Köhlern, Schmelzen, Stand)
 const spots={hacken:[1700,745],kohle:[1245,720],schmelzen:[2495,1160],stand:[2225,1792]}[J.id]||[end.x,end.y],R=J.id==='stand'?1:1+Math.floor(w.n/7)*.55;
 const sx=spots[0]+Math.cos(ang)*rad*(J.id==='stand'?2.2:2.4)*R,sy=spots[1]+Math.abs(Math.sin(ang))*rad*.7*R,wob=Math.sin((t+sd)*.5)*(J.id==='stand'?6:3);
 return {x:sx+wob,y:sy,dx:J.id==='stand'?0:spots[0]-sx,dy:1,state:{hacken:'hackt Holz',kohle:'schichtet den Meiler',schmelzen:'tritt den Blasebalg',stand:'bietet Ware an'}[J.id],work:J.id!=='stand',tool:J.tool};}

// ---------- Figuren-Bildbögen (echter Figurenzeichner des Spiels) ----------
const FW=56,FH=72,FX=28,FY=62,WALK=6;const sprites=new Map();let spriteBudget=0;
function spriteOf(g){let s=sprites.get(g.id);if(s)return s;if(spriteBudget<=0)return null;spriteBudget--;
 const [c,ctx]=mkCanvas(FW*(WALK+2),FH*2);const base={g,team:0,ammo:0,a:0,energy:100,index:0,baseX:0,baseY:0};
 try{for(let dir=0;dir<2;dir++){for(let f=0;f<WALK;f++){ctx.save();ctx.translate(f*FW,dir*FH);M.renderLudusActors(ctx,[{...base,x:FX,y:FY,a:dir?Math.PI:0,state:'move',moveSpeed:40,phase:f/WALK*TAU}]);ctx.restore();}
  for(let f=0;f<2;f++){ctx.save();ctx.translate((WALK+f)*FW,dir*FH);M.renderLudusActors(ctx,[{...base,x:FX,y:FY,a:dir?Math.PI:0,state:'idle',moveSpeed:0,phase:f*1.3}]);ctx.restore();}}}catch(e){console.warn(e);}
 s={c};sprites.set(g.id,s);return s;}
// Werkzeuge und Lasten, über die Figur gelegt
function tool(g,kind,x,y,dir,t){const sw=Math.sin(t*7);
 if(kind==='axe'||kind==='pick'){const a=-1.1+sw*1.2;g.save();g.translate(x+dir*6,y-24);g.scale(dir,1);g.rotate(a);px(g,0,-1,16,2,'#7a5a39');if(kind==='axe'){px(g,13,-4,5,8,'#a9b0b4');px(g,13,-4,2,8,'#d6dde0');}else{px(g,12,-6,3,12,'#a9b0b4');}g.restore();}
 else if(kind==='hammer'){const a=-.8+Math.max(0,sw)*1.4;g.save();g.translate(x+dir*6,y-22);g.scale(dir,1);g.rotate(a);px(g,0,-1,12,2,'#7a5a39');px(g,10,-3,5,6,'#6e6a62');g.restore();}
 else if(kind==='shovel'){g.save();g.translate(x+dir*5,y-20);g.scale(dir,1);g.rotate(.6+sw*.3);px(g,0,-1,16,2,'#7a5a39');px(g,15,-3,6,6,'#8c8f93');g.restore();}
 else if(kind==='log'){px(g,x-10,y-38,20,6,'#6b4a2c');px(g,x+8,y-38,3,6,'#b18c58');}
 else if(kind==='ore'||kind==='load'){px(g,x-7,y-40,14,9,'#5e4229');px(g,x-6,y-43,12,4,'#7a5544');px(g,x-3,y-44,3,2,'#c9824e');}}

// ---------- Karren auf der Handelsstraße (Schritt 1: fahren nur vorbei) ----------
const CARTS=[{name:'Händlerkarren',skulls:2,load:'Stoffe, Öl, Wein',col:'#8a6a42',cover:'#d8cba4'},{name:'Erzkarren',skulls:1,load:'Erz, Werkzeug',col:'#6b4a2c',cover:'#8f8574'},{name:'Steuerwagen',skulls:4,load:'Silbermünzen, Siegel',col:'#5e4229',cover:'#7d2a26'},{name:'Bauernkarren',skulls:1,load:'Getreide, Hühner',col:'#7a5a39',cover:null},{name:'Weinhändler',skulls:3,load:'Amphoren, Gold',col:'#6e5236',cover:'#6f3a4e'}];
const ROADP=path(ROAD),CART_EVERY=48,CART_TIME=95;
function cartsAt(t){const out=[];for(let k=Math.floor((t-CART_TIME)/CART_EVERY);k<=Math.floor(t/CART_EVERY);k++){if(k<0)continue;const t0=k*CART_EVERY+hash(k*3+1)*14,dt=t-t0;if(dt<0||dt>CART_TIME)continue;const east=hash(k*5+2)<.5,d=(dt/CART_TIME)*ROADP.len,p=ROADP.at(east?d:ROADP.len-d);out.push({k,x:p.x,y:p.y+(east?6:-6),dir:east?1:-1,def:CARTS[Math.floor(hash(k*7+9)*CARTS.length)],guards:1+Math.floor(hash(k*11+4)*3)});}return out;}
const GUARDS=[];function guardPool(){if(GUARDS.length)return GUARDS;const rng=S.rng;for(let i=0;i<6;i++){const g=M.makeGladiator(0,true);g.id='welt-wache-'+i;g.appearance={...g.appearance,cloth:['#7d2a26','#5c4a36','#435e6a'][i%3]};GUARDS.push(g);}S.rng=rng;return GUARDS;}
function drawCart(g0,c,t){const g=g0;g.save();g.translate(Math.round(c.x),Math.round(c.y));g.scale(1.6,1.6);const x=0,y=0,d=c.dir,D=c.def,bob=Math.sin(t*6)*.6;
 g.fillStyle='rgba(15,20,10,.3)';g.fillRect(x-30,y-2,64,6);
 // Ochse vorn
 const ox=x+d*34;px(g,ox-12,y-16+bob,24,11,'#6e4f35');px(g,ox+d*10-3,y-20+bob,8,8,'#5e4229');px(g,ox+d*14-1,y-22+bob,2,3,'#d8cba4');for(const lx of [-9,-3,4,9])px(g,ox+lx,y-6,3,7,'#4e3a28');
 px(g,x-24,y-22,48,14,D.col);px(g,x-24,y-22,48,2,'#b18c58');if(D.cover){px(g,x-22,y-36,44,15,D.cover);for(let i=0;i<4;i++)px(g,x-20+i*12,y-36,2,15,'rgba(0,0,0,.18)');}else{px(g,x-18,y-28,10,7,'#c9a55a');px(g,x-4,y-27,9,6,'#e0d6b0');px(g,x+8,y-29,10,8,'#b39462');}
 for(const wx of [-15,13]){const sp=Math.floor(t*4)%2;px(g,x+wx-6,y-12,12,12,'#3b2a1b');px(g,x+wx-4,y-10,8,8,'#7a5a39');px(g,x+wx-1+(sp?1:-1),y-7,2,2,'#3b2a1b');}px(g,x+d*24,y-14,d*10,2,'#5e4229');g.restore();}

// ---------- Ansicht, Kamera, Bedienung ----------
const cv=$('weltCanvas'),ctx=cv.getContext('2d');let VW=1,VH=1,DPR=1;
const cam={x:HOF.x+HOF.w/2,y:HOF.y+HOF.h/2+60,s:1};
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);VW=cv.clientWidth||innerWidth;VH=cv.clientHeight||innerHeight;cv.width=Math.round(VW*DPR);cv.height=Math.round(VH*DPR);clampCam();}
const minScale=()=>Math.max(VW/WW,VH/WH),maxScale=()=>3.2;
function clampCam(){cam.s=clamp(cam.s,minScale(),maxScale());const hw=VW/2/cam.s,hh=VH/2/cam.s;cam.x=clamp(cam.x,hw,WW-hw);cam.y=clamp(cam.y,hh,WH-hh);}
const toWorld=(sx,sy)=>({x:cam.x+(sx-VW/2)/cam.s,y:cam.y+(sy-VH/2)/cam.s});
function zoomAt(sx,sy,f){const a=toWorld(sx,sy);cam.s=clamp(cam.s*f,minScale(),maxScale());const b=toWorld(sx,sy);cam.x+=a.x-b.x;cam.y+=a.y-b.y;clampCam();}
let fly=null;function flyTo(x,y,s){fly={x0:cam.x,y0:cam.y,s0:cam.s,x,y,s:s??Math.max(cam.s,1.2),t:0};}
const ptrs=new Map();let dragMoved=0,pinch=null,lastTap=0;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});dragMoved=0;fly=null;if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),s:cam.s};}});
cv.addEventListener('pointermove',e=>{const p=ptrs.get(e.pointerId);if(!p)return;const r=cv.getBoundingClientRect();
 if(ptrs.size===2&&pinch){p.x=e.clientX;p.y=e.clientY;const [a,b]=[...ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y),mx=(a.x+b.x)/2-r.left,my=(a.y+b.y)/2-r.top;zoomAt(mx,my,(pinch.s*d/pinch.d)/cam.s);dragMoved=99;return;}
 const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;dragMoved+=Math.abs(dx)+Math.abs(dy);cam.x-=dx/cam.s;cam.y-=dy/cam.s;clampCam();});
const up=e=>{const was=ptrs.has(e.pointerId);ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;if(was&&ptrs.size===0&&dragMoved<8&&e.type==='pointerup'){const r=cv.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top,now=performance.now();
 if(now-lastTap<300){zoomAt(sx,sy,1.6);lastTap=0;return;}lastTap=now;tap(toWorld(sx,sy),e);}};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('wheel',e=>{e.preventDefault();const r=cv.getBoundingClientRect();zoomAt(e.clientX-r.left,e.clientY-r.top,Math.exp(-e.deltaY*.0016));},{passive:false});
addEventListener('resize',resize);

// ---------- Antippen: Hof an den Ludus weiterreichen, sonst Figur, Karren, Gebäude ----------
let shown=[],info=null;
function tap(p,e){
 const hitF=[...shown].reverse().find(s=>p.x>s.x-12&&p.x<s.x+12&&p.y>s.y-40&&p.y<s.y+6);if(H.tap&&H.tap(p,hitF?.w))return;if(hitF){openInfo({fig:hitF.w});return;}
 const cart=cartsAt(clock).find(c=>Math.abs(p.x-c.x)<70&&p.y>c.y-64&&p.y<c.y+10);if(cart){openInfo({cart});return;}
 if(inHof(p.x,p.y)){const lc=$('ludusCanvas');if(lc?.onclick){const r=lc.getBoundingClientRect(),lx=p.x-HOF.x,ly=p.y-HOF.y;lc.onclick({clientX:r.left+lx*r.width/900,clientY:r.top+ly*r.height/lc.height});}return;}
 const s=SITES.find(s=>!s.hof&&p.x>=s.x-6&&p.x<=s.x+s.w+6&&p.y>=s.y-30&&p.y<=s.y+s.h+6);if(s){openInfo({site:s});return;}closeInfo();}

// ---------- Oberfläche: Leiste, Regler, Liste, Minikarte, Infokarte ----------
const LIMITS=[0,10,25,50,100,200,500,Infinity];let limitIx=3,auto=true;
const ui=document.createElement('div');ui.id='weltUi';ui.innerHTML=`
<header class="w-bar"><div class="w-title"><b>WELTKARTE</b><small>Testversion · Schritt 1 · nichts wird gespeichert</small></div>
<div class="w-chips"><span class="w-chip" id="wCount"></span><span class="w-chip" id="wClock"></span></div>
<div class="w-perf" title="Bildzeit"><i id="wPerfBar"></i><span id="wPerf"></span></div>
<label class="w-sel"><span class="w-lab">Figuren sichtbar</span><select id="wLimit" title="Wie viele Figuren gezeichnet werden"><option value="auto">Automatisch</option>${LIMITS.map((v,i)=>`<option value="${i}">${v===Infinity?'Alle':v===0?'Keine (nur Liste)':v}</option>`).join('')}</select></label>
<button class="w-btn" id="wTable">☰ Wer macht was</button>
<label class="w-sel w-kader"><span class="w-lab">Testkader</span><select id="wKader" title="Größe des Testkaders">${[12,60,200,500].map(n=>`<option value="${n}"${n===60?' selected':''}>${n} Gladiatoren</option>`).join('')}</select></label></header>
<canvas id="wMini" width="240" height="160" aria-label="Übersicht"></canvas>
<aside id="wTablePanel" hidden><header><b>Wer macht was</b><button class="w-x" id="wTableX">✕</button></header><div class="w-filter" id="wFilter"></div><div class="w-list" id="wList"></div></aside>
<div id="wInfo" hidden></div>
<button id="wBack" class="w-btn w-back" hidden>◀ Zur Weltkarte</button>`;
document.getElementById('welt').appendChild(ui);document.body.appendChild($('wBack'));// liegt über den Verwaltungsseiten des Spiels
const sel=$('wLimit');sel.value='auto';sel.onchange=()=>{if(sel.value==='auto')auto=true;else{auto=false;limitIx=+sel.value;}};
$('wKader').onchange=e=>makeRoster(+e.target.value);
$('wTable').onclick=()=>{const p=$('wTablePanel');p.hidden=!p.hidden;tableDirty=true;};$('wTableX').onclick=()=>{$('wTablePanel').hidden=true;};
$('wBack').onclick=()=>{try{M.ui.close?.();}catch(e){}M.ui.click('nav:home');};
const mini=$('wMini'),mg=mini.getContext('2d');
mini.addEventListener('pointerdown',e=>{const r=mini.getBoundingClientRect();flyTo((e.clientX-r.left)/r.width*WW,(e.clientY-r.top)/r.height*WH,cam.s);});
function openInfo(o){info=o;const el=$('wInfo');let h='';
 if(o.site){const s=o.site,list=workers.filter(w=>(JOB[w.job].site===s.id)||(s.post&&w.job==='lager'&&w.post===s));
  h=`<header><b>${esc(s.name)}</b><small>${esc(s.sub)}</small><button class="w-x" data-x>✕</button></header><p>${esc(s.later||'')}</p>${list.length?`<p class="w-tiny">${list.length} ${list.length===1?'Person':'Leute'} hier:</p><ul>${list.slice(0,12).map(w=>`<li>${JOB[w.job].icon} ${esc(w.g.name)}</li>`).join('')}${list.length>12?`<li>… und ${list.length-12} weitere</li>`:''}</ul>`:'<p class="w-tiny">Gerade niemand hier.</p>'}${s.post?`<p><button class="w-btn" data-add>＋ Wegelagerer hierher</button> <button class="w-btn" data-sub>− einen abziehen</button></p>`:''}${s.route?`<button class="w-btn" data-route="${s.route}">Öffnen</button>`:''}`;}
 else if(o.cart){const c=o.cart;h=`<header><b>${esc(c.def.name)}</b><small>auf der Handelsstraße</small><button class="w-x" data-x>✕</button></header><p>${'☠'.repeat(c.def.skulls)}<span class="w-dim">${'☠'.repeat(5-c.def.skulls)}</span> · ${c.guards} Wachen · Ladung: ${esc(c.def.load)}</p><p class="w-tiny">Ausspähen, Überfallen (bis zu 10 Kämpfer) und Beute kommen in Schritt 8. Stärke wie beim Wagenüberfall der Plünderungen.</p>`;}
 else if(o.fig){const w=o.fig,ps=pose(w,clock);h=`<header><b>${esc(w.g.name)}</b><small>${esc(roleOf(w.g))}</small><button class="w-x" data-x>✕</button></header><p>${JOB[w.job].icon} ${esc(ps.state)}</p>
  <p><label class="w-sel">Tätigkeit <select data-job>${JOBS.map(j=>`<option value="${j.id}"${j.id===w.job?' selected':''}>${j.icon} ${esc(j.name)}</option>`).join('')}</select></label>${w.job==='lager'?` <label class="w-sel">Posten <select data-post>${POSTS.map(p=>`<option value="${p.id}"${p===w.post?' selected':''}>${esc(p.name.replace('Posten ',''))}</option>`).join('')}</select></label>`:''}</p>
  <button class="w-btn" data-detail="${w.g.id}">Profil öffnen</button>`;}
 el.innerHTML=h;el.hidden=false;el.querySelector('[data-x]')?.addEventListener('click',closeInfo);
 el.querySelector('[data-route]')?.addEventListener('click',ev=>{M.ui.click('nav:'+ev.target.dataset.route);closeInfo();});
 el.querySelector('[data-detail]')?.addEventListener('click',ev=>{M.ui.click('detail:'+ev.target.dataset.detail);closeInfo();});
 el.querySelector('[data-job]')?.addEventListener('change',ev=>{const w=o.fig;manual.set(w.g.id,{job:ev.target.value,post:manual.get(w.g.id)?.post||w.post?.id});assign();const nw=workers.find(x=>x.g.id===w.g.id);if(nw)openInfo({fig:nw});});
 el.querySelector('[data-post]')?.addEventListener('change',ev=>{const w=o.fig;manual.set(w.g.id,{job:'lager',post:ev.target.value});assign();const nw=workers.find(x=>x.g.id===w.g.id);if(nw)openInfo({fig:nw});});
 el.querySelector('[data-add]')?.addEventListener('click',()=>{const free=workers.filter(w=>w.job!=='lager'&&w.job!=='ruhe'&&!manual.has(w.g.id)).sort((a,b)=>(roleOf(b.g)==='Assassine')-(roleOf(a.g)==='Assassine'))[0]||workers.find(w=>w.job!=='lager'&&w.job!=='ruhe');if(!free){M.ui.notify?.('Niemand frei.');return;}manual.set(free.g.id,{job:'lager',post:o.site.id});assign();openInfo({site:o.site});});
 el.querySelector('[data-sub]')?.addEventListener('click',()=>{const w=workers.find(w=>w.job==='lager'&&w.post===o.site);if(!w)return;manual.set(w.g.id,{job:'training'});assign();openInfo({site:o.site});});}
function closeInfo(){info=null;$('wInfo').hidden=true;}
let tableDirty=true,filter='alle',tableT=0;
function renderTable(){const p=$('wTablePanel');if(p.hidden)return;const counts={};for(const w of workers)counts[w.job]=(counts[w.job]||0)+1;
 $('wFilter').innerHTML=[`<button data-f="alle" class="${filter==='alle'?'on':''}">Alle ${workers.length}</button>`,...JOBS.filter(j=>counts[j.id]).map(j=>`<button data-f="${j.id}" class="${filter===j.id?'on':''}">${j.icon} ${esc(j.name)} ${counts[j.id]}</button>`)].join('');
 $('wFilter').querySelectorAll('button').forEach(b=>b.onclick=()=>{filter=b.dataset.f;tableDirty=true;renderTable();});
 const vis=new Set(shown.map(s=>s.w)),list=workers.filter(w=>filter==='alle'||w.job===filter);
 $('wList').innerHTML=`<table><thead><tr><th>Name</th><th>Tätigkeit</th><th>Gerade</th><th></th></tr></thead><tbody>${list.map((w,i)=>{const ps=pose(w,clock);return `<tr data-i="${workers.indexOf(w)}"><td>${esc(w.g.name)}<small>${esc(roleOf(w.g))}</small></td><td>${JOB[w.job].icon} ${esc(JOB[w.job].name)}</td><td>${esc(ps.state)}</td><td>${ps.x!=null?(vis.has(w)?'<span class="w-eye" title="sichtbar">●</span>':'<span class="w-eye off" title="nicht gezeichnet">○</span>'):''}</td></tr>`;}).join('')}</tbody></table>`;
 $('wList').querySelectorAll('tr[data-i]').forEach(tr=>tr.onclick=()=>{const w=workers[+tr.dataset.i],ps=pose(w,clock);if(ps.x!=null){focusW=w;flyTo(ps.x,ps.y-20,1.8);}else{const s=SITE[JOB[w.job].site]||SITE.mine;flyTo(center(s).x,center(s).y,1.2);}});
 tableDirty=false;}
let focusW=null;

// ---------- Testkader ----------
function makeRoster(n){const keep=S.roster.filter(g=>!g.dead);let list=keep.slice(0,n);const rng=S.rng;while(list.length<n){const g=M.makeGladiator(0);g.fatigue=0;list.push(g);}S.rng=rng;
 // ein paar Verletzte, damit Medicus und Liste etwas zeigen
 S.roster=list;try{M.army?.autoClasses?.(list);}catch(e){}if(list.every(g=>g.role==='Soldat'))list.forEach((g,i)=>{g.role=['Soldat','Soldat','Assassine','Fernkämpfer'][i%4];try{M.normalizeClassGear?.(g);}catch(e){}});
 sprites.clear();manual.clear();assign();}

// ---------- Zeichnen ----------
let clock=900,last=performance.now(),perfMs=0,perfAvg=8,perfWin=[],autoT=0,smoke=[];
function limit(){return LIMITS[limitIx];}
const MINI=.5;let miniV=false;
function allIn(view){const out=[];for(const w of workers){const ps=pose(w,clock);if(ps.x==null)continue;if(ps.x>view.x0-40&&ps.x<view.x1+40&&ps.y>view.y0-20&&ps.y<view.y1+80)out.push({w,ps,on:true});}return out;}
function chooseShown(view){const L=limit(),cands=[];for(const w of workers){const ps=pose(w,clock);if(ps.x==null)continue;const on=ps.x>view.x0-40&&ps.x<view.x1+40&&ps.y>view.y0-20&&ps.y<view.y1+80;cands.push({w,ps,on});}
 if(L===Infinity)return cands.filter(c=>c.on);
 // gleichmäßig über die Tätigkeiten verteilen, damit überall Leben ist; sichtbare Ausschnitte zuerst
 const by=new Map();for(const c of cands){const k=c.w.job;if(!by.has(k))by.set(k,[]);by.get(k).push(c);}const pick=[];let round=0,added=true;
 while(pick.length<L&&added){added=false;for(const arr of by.values()){if(arr[round]){pick.push(arr[round]);added=true;if(pick.length>=L)break;}}round++;}
 return pick.filter(c=>c.on);}
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.1,(now-last)/1000);last=now;if(document.hidden)return;
 if(document.body.classList.contains('w-admin'))return;
 const t0=performance.now();clock+=dt;H.tick?.(dt);let bakedNow=0;
 if(fly){fly.t=Math.min(1,fly.t+dt*2.2);const e=1-Math.pow(1-fly.t,3);cam.x=fly.x0+(fly.x-fly.x0)*e;cam.y=fly.y0+(fly.y-fly.y0)*e;cam.s=fly.s0+(fly.s-fly.s0)*e;clampCam();if(fly.t>=1)fly=null;}
 ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#4a6435';ctx.fillRect(0,0,VW,VH);
 const view={x0:cam.x-VW/2/cam.s,y0:cam.y-VH/2/cam.s,x1:cam.x+VW/2/cam.s,y1:cam.y+VH/2/cam.s};
 ctx.setTransform(DPR*cam.s,0,0,DPR*cam.s,DPR*(VW/2-cam.x*cam.s),DPR*(VH/2-cam.y*cam.s));
 // Gelände: nah die Kacheln (höchstens eine neue je Bild), fern die Übersicht
 if(cam.s<.34){ctx.imageSmoothingEnabled=true;ctx.drawImage(overview,0,0,WW,WH);ctx.imageSmoothingEnabled=false;}
 else if(cam.s<.7){ctx.imageSmoothingEnabled=true;for(let cy=Math.max(0,Math.floor(view.y0/CH));cy<=Math.min(NCY-1,Math.floor(view.y1/CH));cy++)for(let cx=Math.max(0,Math.floor(view.x0/CH));cx<=Math.min(NCX-1,Math.floor(view.x1/CH));cx++){const h=half.get(cx+','+cy);if(h)ctx.drawImage(h,cx*CH,cy*CH,CH,CH);else ctx.drawImage(overview,cx*CH/OV,cy*CH/OV,CH/OV,CH/OV,cx*CH,cy*CH,CH,CH);}ctx.imageSmoothingEnabled=false;}
 else{for(let cy=Math.max(0,Math.floor(view.y0/CH));cy<=Math.min(NCY-1,Math.floor(view.y1/CH));cy++)for(let cx=Math.max(0,Math.floor(view.x0/CH));cx<=Math.min(NCX-1,Math.floor(view.x1/CH));cx++){
  const had=chunks.has(cx+','+cy),c=chunk(cx,cy,bakedNow<1);if(!had&&c)bakedNow++;if(c){ctx.drawImage(c,cx*CH,cy*CH);}else{ctx.imageSmoothingEnabled=true;ctx.drawImage(overview,cx*CH/OV,cy*CH/OV,CH/OV,CH/OV,cx*CH,cy*CH,CH,CH);ctx.imageSmoothingEnabled=false;}}}
 if(bakedNow===0&&ovDone.size<NCX*NCY)ovStep();
 // Hof: das echte Ludus-Bild des Spiels
 const lc=$('ludusCanvas');if(lc&&lc.width)ctx.drawImage(lc,HOF.x,HOF.y);else{ctx.fillStyle='#6b5a44';ctx.fillRect(HOF.x,HOF.y,HOF.w,HOF.h);}
 ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=3;ctx.strokeRect(HOF.x-1,HOF.y-1,HOF.w+2,HOF.h+2);
 // bewegte Kulisse: Rauch über Meiler und Schmelze, Glut, Fackeln an der Halle
 animProps(ctx,view);
 // Figuren und Karren nach Tiefe
 spriteBudget=Math.max(2,Math.round(12-perfAvg));shown=[];
 // Miniaturansicht (weit herausgezoomt): alle Figuren als winzige Männchen aus zwei Rechtecken statt als Bildbogen
 miniV=cam.s<MINI;const pick=miniV?(limit()===0?[]:allIn(view)):chooseShown(view);
 const items=pick.map(c=>({y:c.ps.y,c})),carts=cartsAt(clock).filter(c=>c.x>view.x0-80&&c.x<view.x1+80&&c.y>view.y0-60&&c.y<view.y1+60);for(const c of carts)items.push({y:c.y,cart:c});items.sort((a,b)=>a.y-b.y);
 for(const it of items){if(it.cart){drawCart(ctx,it.cart,clock);const pool=guardPool();for(let i=0;i<it.cart.guards;i++){const gx=Math.round(it.cart.x-it.cart.dir*(62+i*20)),gy=Math.round(it.cart.y+(i%2?9:-5)),sp=spriteOf(pool[(it.cart.k+i)%pool.length]),f=Math.floor((clock*SPEED/9+i*2)%WALK);if(sp)ctx.drawImage(sp.c,f*FW,(it.cart.dir<0?1:0)*FH,FW,FH,gx-FX,gy-FY,FW,FH);}continue;}
  const {w,ps}=it.c,x=Math.round(ps.x),y=Math.round(ps.y);
  if(miniV){const a=w.g.appearance||{},b=!ps.work&&!ps.crouch&&!ps.top&&((clock*4+w.seed)|0)%2?2:0;ctx.fillStyle='rgba(15,20,10,.35)';ctx.fillRect(x-5,y-1,10,3);ctx.fillStyle=a.cloth||'#7a6448';ctx.fillRect(x-4,y-13-b,8,12);ctx.fillStyle=a.skin||'#d9ac82';ctx.fillRect(x-3,y-19-b,6,6);shown.push({w,x,y});continue;}
  const sp=spriteOf(w.g),dir=(ps.dx??1)<0?1:0;
  ctx.fillStyle='rgba(15,20,10,.3)';ctx.fillRect(x-8,y-1,16,3);
  if(sp){const walking=!ps.work&&!ps.crouch&&!ps.top,f=walking?Math.floor((clock*SPEED/9+w.seed)%WALK):WALK+(ps.work?Math.floor((clock*2+w.seed)%2):0);ctx.drawImage(sp.c,f*FW,dir*FH,FW,FH,x-FX,y-FY+(ps.crouch?4:0)+0,FW,FH);}
  else{px(ctx,x-4,y-26,8,22,'#7a6448');px(ctx,x-3,y-32,6,6,'#d9ac82');}
  if(ps.tool)tool(ctx,ps.tool,x,y,dir?-1:1,clock+w.seed);
  shown.push({w,x,y});
  if(focusW===w){ctx.strokeStyle='#f4d37a';ctx.lineWidth=2;ctx.strokeRect(x-12,y-46,24,50);}}
 // Anschlüsse: Tageslicht über allem (Bildschirmkoordinaten), danach Leuchten und getragene Figur (Weltkoordinaten)
 if(H.light){ctx.setTransform(DPR,0,0,DPR,0,0);H.light(ctx,VW,VH);ctx.setTransform(DPR*cam.s,0,0,DPR*cam.s,DPR*(VW/2-cam.x*cam.s),DPR*(VH/2-cam.y*cam.s));}
 H.world?.(ctx,view,dt);
 // Namen der Gebäude bei mittlerem Zoom
 if(cam.s>.42&&cam.s<1.6)labels(ctx,view);
 ctx.setTransform(1,0,0,1,0,0);
 // Minikarte, Leiste
 if(((now/100)|0)%2===0)drawMini(view,carts);
 perfMs=performance.now()-t0;if(!bakedNow)perfWin.push(perfMs);if(perfWin.length>30)perfWin.shift();perfAvg=perfWin.reduce((a,b)=>a+b,0)/perfWin.length;
 autoT+=dt;if(autoT>1){autoT=0;if(auto&&clock>903){if(perfAvg>12&&limitIx>1)limitIx--;else if(perfAvg<6&&limitIx<LIMITS.length-1&&shown.length>=Math.min(limit(),visibleCount())*0.9)limitIx++;}hud();}
 tableT+=dt;if(tableT>1||tableDirty){tableT=0;renderTable();}}
let visCache=0;function visibleCount(){return visCache;}
function hud(){const outside=workers.filter(w=>JOB[w.job].kind!=='hof').length;visCache=outside;
 $('wCount').textContent=`${workers.length} Leute · ${shown.length} gezeichnet`;$('wClock').textContent=`Zoom ${cam.s.toFixed(2)}×${miniV?' · Miniaturansicht':''}`;
 const ms=perfAvg,pct=clamp(ms/16.7,0,1);const bar=$('wPerfBar');bar.style.width=Math.round(pct*100)+'%';bar.style.background=ms<8?'#6fae5a':ms<13?'#d7b24a':'#c9483e';
 $('wPerf').textContent=`${ms.toFixed(1)} ms · ${auto?'auto: ':''}${limit()===Infinity?'alle':limit()} Figuren`;}
function labels(g,view){g.font='bold 11px monospace';for(const s of SITES){if(s.hof)continue;const x=s.x+s.w/2,y=s.y-12;if(x<view.x0||x>view.x1||y<view.y0||y>view.y1)continue;const w=Math.ceil(g.measureText(s.name).width)+10;g.fillStyle='rgba(18,12,9,.72)';g.fillRect(Math.round(x-w/2),Math.round(y-12),w,16);g.fillStyle=s.post?'#e6a15a':'#f1dfb4';g.fillText(s.name,Math.round(x-w/2+5),Math.round(y));}}
function animProps(g,view){const t=clock;
 const puff=(x,y,k)=>{for(let i=0;i<6;i++){const a=((t*.35+i/6+k)%1),r=4+a*12;g.fillStyle=`rgba(${190-a*40},${185-a*40},${180-a*40},${.45*(1-a)})`;g.beginPath();g.arc(x+Math.sin(t+i*2+k)*6*a+a*18,y-a*70,r,0,TAU);g.fill();}};
 const m=SITE.meiler,sm=SITE.schmelze;if(m.x<view.x1&&m.x+m.w>view.x0&&m.y-80<view.y1&&m.y+m.h>view.y0){puff(m.x+80,m.y+40,0);puff(m.x+60,m.y+50,.4);}
 if(sm.x<view.x1&&sm.x+sm.w>view.x0&&sm.y-80<view.y1&&sm.y+sm.h>view.y0){puff(sm.x+98,sm.y,0.2);const f=.6+Math.sin(t*9)*.2+Math.sin(t*23)*.1;g.fillStyle=`rgba(255,${150+f*60|0},60,${.55*f})`;g.fillRect(sm.x+90,sm.y+114,16,14);g.fillStyle=`rgba(255,160,60,${.12*f})`;g.beginPath();g.arc(sm.x+98,sm.y+124,30,0,TAU);g.fill();}
 const h=SITE.hall;if(h.x<view.x1&&h.x+h.w>view.x0&&h.y<view.y1&&h.y+h.h>view.y0)for(const dx of [2,228]){const f=Math.sin(t*11+dx)*.5+.5;px(g,h.x+dx-2,h.y+96-f*3,8,8,'#e8792f');px(g,h.x+dx,h.y+94-f*4,4,6,'#f4d37a');}
 // Wasserglitzern
 for(let i=0;i<24;i++){const k=(i/24+t*.02)%1,p=path(RIVER).at(k*path(RIVER).len);if(p.x<view.x0||p.x>view.x1||p.y<view.y0||p.y>view.y1)continue;if(Math.sin(t*3+i*7)>.6)px(g,p.x-6+(i%3)*5,p.y+(i%4)*4-6,4,1,'#a9cfd9');}}
const RIVERP=path(RIVER);
function drawMini(view,carts){mg.imageSmoothingEnabled=true;mg.drawImage(overview,0,0,240,160);const k=240/WW;
 mg.fillStyle='rgba(107,90,68,.9)';mg.fillRect(HOF.x*k,HOF.y*k,HOF.w*k,HOF.h*k);
 for(const c of carts)void c;for(const c of cartsAt(clock)){mg.fillStyle='#e04a3a';mg.fillRect(c.x*k-2,c.y*k-2,4,4);}
 mg.strokeStyle='#f4d37a';mg.lineWidth=1.5;mg.strokeRect(view.x0*k,view.y0*k,(view.x1-view.x0)*k,(view.y1-view.y0)*k);}

// ---------- Verwaltungsseiten des Spiels über der Karte (Hof antippen, „Öffnen“, Profil) ----------
setInterval(()=>{const page=M.ui.getPage?.(),modal=$('modal')&&!$('modal').hidden,admin=(page&&page!=='home')||modal||!!S.battle;document.body.classList.toggle('w-admin',!!admin);$('wBack').hidden=!admin||modal;},200);

// ---------- Start ----------
makeSprites();buildStatic();[overview,ovG]=mkCanvas(WW/OV,WH/OV);ovG.fillStyle='#55703c';ovG.fillRect(0,0,WW/OV,WH/OV);
try{window.ArenaUI?.close?.();}catch(e){}M.ui.click('nav:home');
makeRoster(60);resize();cam.s=clamp(Math.min(VW/1100,VH/900)*1.05,minScale(),maxScale());clampCam();
// Ladebild: Übersicht ganz und die Kacheln rund um den Hof vorbereiten (danach höchstens eine Kachel je Bild)
(function prep(){const em=document.querySelector('#weltBoot em'),bar=document.querySelector('#weltBoot i'),t=performance.now();while(performance.now()-t<40&&ovStep());
 if(em)em.textContent='Karte wird vorbereitet …';if(bar)bar.style.width=Math.round(ovDone.size/(NCX*NCY)*100)+'%';
 if(ovDone.size<NCX*NCY){setTimeout(prep,0);return;}
 for(let cy=0;cy<NCY;cy++)for(let cx=0;cx<NCX;cx++){const x=cx*CH+CH/2,y=cy*CH+CH/2;if(Math.abs(x-cam.x)<VW/cam.s/2+CH&&Math.abs(y-cam.y)<VH/cam.s/2+CH)chunk(cx,cy,true);}
 $('weltBoot')?.remove();last=performance.now();requestAnimationFrame(frame);})();
window.WeltKarte={cam,sprites,workers:()=>workers,shown:()=>shown,flyTo,SITES,pose:w=>pose(w,clock),pose0:w=>pose0(w,clock),toWorld,spriteOf,FW,FH,FX,FY,WALK,SPEED,JOBS,JOB,POSTS,manual,assign,inHof,HOF,WW,WH,openInfo,closeInfo,canvas:cv,px,get vw(){return VW;},get vh(){return VH;},get mini(){return miniV;},get clock(){return clock;},get perf(){return perfAvg;},bakeAll(){while(ovStep());},makeRoster};
window.WELT_READY=true;
})();
