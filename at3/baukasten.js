// WAS DIE DATEI TUT: Gebäudebaukasten von Arena Theory 3.0 (Schritt W2a2, Entscheidungen Thomas 18.11.2026: Gebäude aus Teilen, Muster für alle 9 Grundformen
// je Bauklasse = 27, Kulturen nur als Schalter ohne Muster, Platz im Master-Editor unter Grafik). Gemeinsam für Master-Editor und Werkzeug (tools/at3-baukasten.cjs),
// läuft im Browser und in Node.
// 1) Teile je Bauklasse (Lehm/Holz, Ziegel, Marmor wie die drei Klassen in 2.0, welt-gebaeude.js: Lehm mit Rissen und Flechtwerk, Putz mit rotem Sockel und
//    Ziegel, Marmor mit Pilastern und Gold): Wand, Tür, Giebel (Block, steigend, fallend), Dachplatten (flach, vier Neigungen), Boden, Ränge, Schild; dazu ein
//    Acker für Höfe. Jedes Teil ist ein eigenes Objekt der Kartei (Regel 14 AT3_WIRTSCHAFT: auch Erzeugtes geht durch den Prüfstand). Nur Palettenfarben.
// 2) Grundformen (masse.json): winzig, klein, Werkstatt, Halle, Hof mit Feldern, lang, groß (mit Innenhof), rund (Arena, Theater), Bahn (Rennbahn) als Raster
//    von Zellen. Daraus entstehen Wände auf den Rändern, Türen, Dach mit Neigung (Sattel mit Giebeln, Walm oder flach), Böden und die Dinge vor der Tür
//    (Schild, Einrichtung, Ausgabestapel aus der Kartei). Ein Gebäude jeder Größe braucht so nur die wenigen Teile seiner Klasse (kein großes Einzelbild).
// 3) Zusammensetzen ins Bodenbild (Regel 20): dieselbe Feldgeometrie wie baubild.js (Wände an Nord- und Westkante, gespiegelt für Nord), gemalt mit
//    AT3BAUBILD.malen. Je Gebäude einmal, danach nur Kopieren. Kosten hängen nur an der Zahl der Felder des Gebäudes, nie an der Welt.
// 4) Kultur-Schalter: Dachform und Farbtausch (Dach- und Wandfarbe auf eine andere Farbreihe) für dieselben Teile; Muster gibt es nur in der Grundkultur (W2h).
// Kerne: im Editor auf dem Hauptkern (nur auf Knopfdruck, wenige ms); im Spiel ab W2c im Bildkern wie baubild.js.
(function(G){
'use strict';
function S(){return G.AT3_64}
function BB(){return G.AT3BAUBILD||(typeof require!=='undefined'?require('./baubild.js'):null)}
var STEIN=0,ERDE=1,GRUEN=2,HOLZ=3,BLUT=5,SAND=7,BRONZE=8,PURPUR=9,OCKER=10;
var LEER=255, STEP=8, TRAUFE=32, WANDH=34, DMAX=6;
var KLASSEN=[
 {id:'clay-wood',kurz:'lehm',de:'Lehm/Holz',en:'Mud-and-Timber',dachEn:'Thatched',wandReihe:ERDE,dachReihe:OCKER},
 {id:'brick',kurz:'ziegel',de:'Ziegel',en:'Brick',dachEn:'Tiled',wandReihe:SAND,dachReihe:BLUT},
 {id:'marble',kurz:'marmor',de:'Marmor',en:'Marble',dachEn:'Marble-Slab',wandReihe:STEIN,dachReihe:STEIN}];
var DACHFORMEN=[{id:'sattel',de:'Satteldach'},{id:'walm',de:'Walmdach'},{id:'flach',de:'Flachdach'}];
var PLATTEN=['dach-flach','dach-auf-j','dach-ab-j','dach-auf-i','dach-ab-i'];
var TEILE=['wand','tuer','giebel','giebel-auf','giebel-ab'].concat(PLATTEN,['boden','rang','schild']);

function kl(v,a,b){return Math.max(a,Math.min(b,v))}
function T(r,v){var s=S();return s.nummer(r,kl(Math.round(v*(s.REIHEN[r].n-1)),0,s.REIHEN[r].n-1))}
function rausch(x,y,s){var h=(x*374761393+y*668265263+s*982451653)>>>0;h=Math.imul(h^(h>>>13),1274126177)>>>0;return((h^(h>>>16))>>>0)/4294967296}
function glatt(x,y,k,s){var gx=Math.floor(x/k),gy=Math.floor(y/k),fx=x/k-gx,fy=y/k-gy,a=rausch(gx,gy,s),b=rausch(gx+1,gy,s),c=rausch(gx,gy+1,s),d=rausch(gx+1,gy+1,s);
 var u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function raster(w,h){return{w:w,h:h,px:new Uint8Array(w*h).fill(LEER)}}
function setz(g,x,y,n){x=Math.floor(x);y=Math.floor(y);if(n>=0&&n<64&&x>=0&&y>=0&&x<g.w&&y<g.h)g.px[y*g.w+x]=n}
// Rasterbild → Speicherformat {kat,w,h,ax,ay,z} (zugeschnitten, Anker bleibt an derselben Stelle)
function alsBild(kat,g,ax,ay,schneiden){var x0=0,y0=0,x1=g.w-1,y1=g.h-1,x,y;
 if(schneiden){x0=g.w;y0=g.h;x1=-1;y1=-1;for(y=0;y<g.h;y++)for(x=0;x<g.w;x++)if(g.px[y*g.w+x]!==LEER){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  x0=Math.min(x0,ax);x1=Math.max(x1,ax);y0=Math.min(y0,ay);y1=Math.max(y1,ay)}
 var Z=S().ZEICHEN,z=[];for(y=y0;y<=y1;y++){var r='';for(x=x0;x<=x1;x++){var c=g.px[y*g.w+x];r+=c===LEER?S().LEER:Z[c]}z.push(r)}
 return{kat:kat,w:x1-x0+1,h:y1-y0+1,ax:ax-x0,ay:ay-y0,z:z}}
// Speicherformat → Malbild {w,h,ax,ay,px,unten} (unten: unterste deckende Zeile je Spalte, für kniehohe Wände)
function malbild(b){var Z=S().ZEICHEN,px=new Uint8Array(b.w*b.h),u=new Int16Array(b.w).fill(-1);
 for(var y=0;y<b.h;y++){var r=b.z[y];for(var x=0;x<b.w;x++){var c=r[x];px[y*b.w+x]=c===S().LEER?LEER:Z.indexOf(c)}}
 for(var x2=0;x2<b.w;x2++)for(var y2=b.h-1;y2>=0;y2--)if(px[y2*b.w+x2]!==LEER){u[x2]=y2;break}
 var s={w:b.w,h:b.h,ax:b.ax,ay:b.ay,px:px,unten:u};laeufe(s);return s}
// Deckende Läufe je Zeile (Zeile, Anfang, Ende): ganze Teile werden als Läufe kopiert statt Bildpunkt für Bildpunkt (Böden und Wände sind fast nur Läufe)
function laeufe(s){var l=[];for(var y=0;y<s.h;y++){var x=0;while(x<s.w){while(x<s.w&&s.px[y*s.w+x]===LEER)x++;var a=x;while(x<s.w&&s.px[y*s.w+x]!==LEER)x++;if(x>a)l.push(y,a,x)}}s.lauf=new Int32Array(l)}
function kopiere(px,w,ox,oy,it){var sp=it.sp,L=sp.lauf,sx=ox+it.x-sp.ax,sy=oy+it.y-sp.ay;
 for(var k=0;k<L.length;k+=3){var y=L[k],o=y*sp.w;px.set(sp.px.subarray(o+L[k+1],o+L[k+2]),(sy+y)*w+sx+L[k+1])}}
function spiegel(s){var px=new Uint8Array(s.w*s.h),u=new Int16Array(s.w);for(var y=0;y<s.h;y++)for(var x=0;x<s.w;x++)px[y*s.w+x]=s.px[y*s.w+s.w-1-x];
 for(var k=0;k<s.w;k++)u[k]=s.unten[s.w-1-k];var m={w:s.w,h:s.h,ax:s.w-s.ax,ay:s.ay,px:px,unten:u};laeufe(m);return m}

// ---------- Teile zeichnen ----------
// Wandfläche: x 0–31 entlang der Kante (Westkante, links = Westecke), z Höhe über der Kante in Bildpunkten.
function wandFarbe(K,x,z){var n=rausch(x,z,11)-.5,g=glatt(x,z,5,12);
 if(K==='clay-wood'){
  if(x<=1||x>=30)return T(HOLZ,x===1||x===30?.42:.25);
  if(z>=WANDH-2)return T(SAND,z===WANDH-1?.72:.5);
  if(z===28||z===29)return T(HOLZ,z===29?.42:.28);
  if(z<3)return T(ERDE,.3+n*.15);
  if(g>.86)return T(HOLZ,(x+z)%3===0?.25:.5);                                   // abgeplatzter Lehm, darunter Flechtwerk
  if((x*7+z*3)%23===0&&rausch(x,z,13)<.6)return T(ERDE,.18);                    // Riss
  return T(ERDE,.62+(g-.5)*.2+n*.1)}
 if(K==='brick'){
  if(z<6)return T(BLUT,(x+((z>>1)&1)*2)%4===0||z%2===0?.22:.42);                 // roter Sockel aus Ziegeln
  if(z===6)return T(STEIN,.55);
  if(z>=WANDH-3)return T(BLUT,z===WANDH-1?.55:z===WANDH-2?.38:.22);              // Mauerkrone
  if(g>.93)return T(BLUT,(z%3===0||(x+((z/3|0)&1)*2)%4===0)?.25:.45);              // Putz abgeplatzt, Ziegel darunter
  return T(SAND,.8+(g-.5)*.12+n*.08)}
 if(x<=2||x>=29)return T(STEIN,x===2||x===29?.72:1);                             // Marmor: Pilaster
 if(z<5)return T(STEIN,.78+n*.06);if(z===5)return T(BRONZE,.92);
 if(z===WANDH-3)return T(OCKER,.88);if(z>WANDH-3)return T(STEIN,.88);
 if(g>.82&&rausch(x>>1,z,14)<.5)return T(STEIN,.68);                             // Adern
 return T(STEIN,.94+n*.05)}
function tuerFarbe(K,x,z){var u=x-10;
 if(K==='clay-wood'){if(x===10||x===21||z===20)return T(HOLZ,.15);if(x===19&&z===10)return T(BRONZE,.6);return T(HOLZ,u%3===0?.3:.48+(rausch(x,z,21)-.5)*.12)}
 if(K==='brick'){if(z>=21)return T(BLUT,z===22?.5:.28);if(x===10||x===21)return T(STEIN,.5);if(z===6||z===15)return T(BRONZE,.42);if(x===19&&z===11)return T(BRONZE,.85);
  return T(HOLZ,u%4===0?.22:.38)}
 if(z>=23)return T(OCKER,z===24?.95:.7);if(x===10||x===21)return T(STEIN,1);
 if(x===15||x===16)return T(BRONZE,.3);if(u%3===1&&z%4===2)return T(BRONZE,.98);return T(BRONZE,.55)}
function wandTeil(K,tuer){var g=raster(32,56),hoch=K==='marble'?25:K==='brick'?23:21;
 for(var x=0;x<32;x++)for(var z=0;z<WANDH;z++){var t=tuer&&x>=10&&x<=21&&z<hoch;setz(g,x,55-(x>>1)-z,t?tuerFarbe(K,x,z):wandFarbe(K,x,z))}
 return alsBild('wand',g,0,55,false)}
// Giebel an der Westkante: Block (volle STEP-Höhe) oder Spitze, „auf“ steigt zur Westecke (Richtung +j bzw. gespiegelt +i), „ab“ fällt dorthin.
function giebelTeil(K,art){var h=16+STEP,B=h-1,g=raster(32,h);
 for(var x=0;x<32;x++){var t=art==='block'?STEP:Math.round(STEP*(art==='auf'?(31-x):x)/31);
  for(var z=0;z<t;z++){var c,oben=z===t-1&&art!=='block';
   if(K==='clay-wood')c=oben?T(HOLZ,.15):T(HOLZ,x%4===0?.3:.5+(rausch(x,z,31)-.5)*.15);
   else if(K==='brick')c=oben?T(BLUT,.3):T(SAND,.74+(rausch(x,z,32)-.5)*.1);
   else c=oben?T(OCKER,.9):T(STEIN,.9+(rausch(x,z,33)-.5)*.08);
   setz(g,x,B-(x>>1)-z,c)}}
 return alsBild('wand',g,0,B,false)}
// Dachplatte über einem Feld, Anker = Nordecke auf Traufhöhe der unteren Kante. Neigung: Höhe über der Platte je Feldanteil (u entlang i, v entlang j).
var NEIG={'dach-flach':function(){return 0},'dach-auf-j':function(u,v){return v},'dach-ab-j':function(u,v){return 1-v},'dach-auf-i':function(u){return u},'dach-ab-i':function(u){return 1-u}};
var LICHT={'dach-flach':.55,'dach-auf-j':.3,'dach-ab-j':.72,'dach-auf-i':.62,'dach-ab-i':.38};
function dachFarbe(K,typ,u,v){var l=LICHT[typ],q=typ.slice(-1)==='i'?u:v,r=typ.slice(-1)==='i'?v:u,reihe=Math.floor(q*8),n=rausch(Math.floor(u*64),Math.floor(v*64),41)-.5;
 if(K==='clay-wood'){var halm=(q*8)%1<.2;return T(OCKER,l+(halm?-.22:0)+n*.18)}
 if(K==='brick'){var fuge=(q*8)%1<.16||((r*6+(reihe&1)*.5)%1)<.12;return T(BLUT,l+(fuge?-.25:.02)+n*.06)}
 var naht=(q*4)%1<.07||(r*3)%1<.06;return naht?T(OCKER,.75):T(STEIN,.62+l*.38+n*.05)}
function dachTeil(K,typ){var g=raster(64,32+STEP+1),st=1/96,f=NEIG[typ];
 for(var u=0;u<1;u+=st)for(var v=0;v<1;v+=st){var x=32+(u-v)*32,y=STEP+(u+v)*16-f(u,v)*STEP;if(x>=0&&x<64)setz(g,x,y,dachFarbe(K,typ,u,v))}
 return alsBild('dach',g,32,STEP,true)}
// Böden: eine Raute 64 × 32, Anker in der Mitte (wie boden-gras). u, v = Lage im Feld.
function raute(f){var g=raster(64,32);for(var y=0;y<32;y++){var hw=2*(y<16?y+1:32-y);for(var x=32-hw;x<32+hw;x++){var X=x-31.5,Y=y+.5,u=(X/32+Y/16)/2,v=(Y/16-X/32)/2;setz(g,x,y,f(u,v,x,y))}}
 return alsBild('boden',g,32,16,false)}
function bodenTeil(K){return raute(function(u,v,x,y){var n=rausch(x,y,51)-.5;
 if(K==='clay-wood')return rausch(x,y,52)<.04?T(SAND,.75):T(ERDE,.5+(glatt(x,y*2,7,53)-.5)*.2+n*.1);
 if(K==='brick'){if((u*4)%1<.09||(v*4)%1<.09)return T(BLUT,.18);return((Math.floor(u*4)+Math.floor(v*4))&1)?T(BLUT,.48+n*.06):T(OCKER,.42+n*.06)}
 if((u*2)%1<.05||(v*2)%1<.05)return T(STEIN,.66);if(Math.abs(u-.5)+Math.abs(v-.5)<.09)return T(PURPUR,.55);return T(STEIN,.9+n*.06)})}
function rangTeil(K){return raute(function(u,v,x,y){var b=(v*4)%1,sitz=b<.6,n=rausch(x,y,61)-.5;
 if(K==='clay-wood')return sitz?T(HOLZ,.55+n*.1):T(HOLZ,.22);
 if(K==='brick')return sitz?T(SAND,.68+n*.08):T(STEIN,.4);
 return sitz?T(STEIN,.95):T(STEIN,.62)})}
function feldTeil(){return raute(function(u,v,x,y){var r=(v*6)%1,n=rausch(x,y,71);return r<.45?T(ERDE,.3+n*.1):n<.35?T(GRUEN,.75):T(GRUEN,.45+(n-.5)*.2)})}
// Schild vor der Tür: Fußpunkt = Feldmitte (Anker), Brett ohne Schrift (Zeichen statt Buchstaben, die Kundschaft kann ohnehin nicht lesen).
function schildTeil(K){var g=raster(64,64),ax=32,ay=48,x,y;
 if(K==='marble'){for(y=0;y<14;y++)for(x=-3;x<=3;x++)setz(g,ax+x,ay-y,T(STEIN,x<0?.98:.75));
  for(y=14;y<24;y++)for(x=-8;x<=8;x++)setz(g,ax+x,ay-y,(Math.abs(x)===8||y===14||y===23)?T(OCKER,.92):(Math.abs(x)<3&&y>16&&y<21)?T(OCKER,.75):T(BRONZE,.5))}
 else{for(y=0;y<22;y++)setz(g,ax+(K==='clay-wood'&&y>12?1:0),ay-y,T(HOLZ,.25));setz(g,ax+1,ay,T(HOLZ,.15));
  for(y=13;y<23;y++)for(x=-8;x<=8;x++){var schief=K==='clay-wood'?Math.round(x/5):0,yy=ay-y+schief,rand=Math.abs(x)===8||y===13||y===22;
   setz(g,ax+x,yy,K==='brick'?(rand?T(BLUT,.35):(Math.abs(x)<3&&y>15&&y<20)?T(BLUT,.55):T(SAND,.88)):(rand?T(HOLZ,.2):(rausch(x,y,81)<.12)?T(ERDE,.15):T(HOLZ,.55)))}}
 return alsBild('einrichtung',g,ax,ay,true)}

// Texte (englisch, 1–3 Sätze) und Zeichenhinweis (deutsch) je Teil
var INFO={
 'wand':{'clay-wood':'Clay packed over a timber frame. Cracks come free of charge, draughts are included.','brick':'Plastered brick on a red plinth. Respectable enough to have debts.','marble':'Polished marble with a gilded band, paid for with somebody else\'s blood. Marble always is.'},
 'tuer':{'clay-wood':'A plank door that sticks in summer and in winter. In spring it merely creaks.','brick':'A wooden door under a brick lintel. Knock twice; the third knock is always the debt collector.','marble':'A bronze door with gilded studs. Heavy enough to keep out the mob and, on a good day, the creditors.'},
 'giebel':{'clay-wood':'Boards nailed up under the end of the roof. They hold, mostly.','brick':'A plastered gable wall. Pigeons rent it by the day.','marble':'A marble gable, straight as a senator claims to be.'},
 'giebel-auf':{'clay-wood':'The pointed end of a timber gable. The birds nest here and pay no rent.','brick':'The peak of a plastered gable. The highest point of the house and of the landlord\'s ambitions.','marble':'A gilded pediment edge. The gods look down from here, the owner looks down on everyone else.'},
 'giebel-ab':{'clay-wood':'The other half of the timber gable. Nobody remembers which half was built first.','brick':'The falling half of a plastered gable. Rain runs down it and into the neighbour\'s window.','marble':'The other gilded pediment edge. Symmetry costs extra and the owner paid.'},
 'dach-flach':{'clay-wood':'A flat bed of thatch. Good for drying fish and hiding from tax men.','brick':'A flat tiled roof. In summer the family sleeps up here, in winter the cat.','marble':'Flat marble slabs on top. Ideal for a terrace and for looking down on the street.'},
 'boden':{'clay-wood':'Stamped clay with straw in it. Spill something and it becomes part of the floor.','brick':'Terracotta tiles, red and buff. They hide wine stains well and blood even better.','marble':'Marble slabs with a purple inlay. Slippery when wet, and it is always wet with something.'},
 'rang':{'clay-wood':'Rows of plank benches. Splinters are free and so is the view of the killing.','brick':'Tiers of stone seats. Bring a cushion, or rent one at a price that hurts more than the stone.','marble':'White marble tiers for people who never sit on anything cheaper. The blood looks better from here.'},
 'schild':{'clay-wood':'A crooked board on a stick with a daub of paint. Nobody can read, so a picture of a sausage does the job.','brick':'A painted signboard with a red frame. It promises quality and is right about half the time.','marble':'A bronze plaque on a marble pedestal. Whatever it advertises, you cannot afford it.'}};
var NAME={'wand':'Wall','tuer':'Door','giebel':'Gable','giebel-auf':'Gable Peak (up)','giebel-ab':'Gable Peak (down)','boden':'Floor','rang':'Tiers','schild':'Sign',
 'dach-flach':'Roof, Flat','dach-auf-j':'Roof Slope, Rear','dach-ab-j':'Roof Slope, Front','dach-auf-i':'Roof Slope, Left','dach-ab-i':'Roof Slope, Right'};
var HINWEIS={'wand':'Wandstück an einer Feldkante, 1 Geschoss','tuer':'Tür mitten im Wandstück, eine Person breit','giebel':'Giebelwand-Block, eine Neigungsstufe hoch, wird gestapelt',
 'giebel-auf':'Giebelspitze, steigt zur Westecke','giebel-ab':'Giebelspitze, fällt zur Westecke','boden':'Fußboden im Gebäude','rang':'Sitzreihen in Arena, Theater, Rennbahn','schild':'Schild vor der Tür, ohne Schrift',
 'dach-flach':'Dachplatte flach (Flachdach, First bei ungerader Breite)','dach-auf-j':'Dachplatte, steigt nach Süden (+j)','dach-ab-j':'Dachplatte, fällt nach Süden (+j)','dach-auf-i':'Dachplatte, steigt nach Osten (+i)','dach-ab-i':'Dachplatte, fällt nach Osten (+i)'};
function dachInfo(K,typ){var m={'clay-wood':'Bundled straw over rafters. It keeps out most of the rain and none of the mice.','brick':'Red clay tiles in neat rows. One loose tile per storm, one dead passer-by per decade.','marble':'Thin marble slabs with gilded seams. Nobody needs a marble roof, which is exactly why it is bought.'};return m[K]}
function karte(kat,feld,extra){var g={wand:'bau',dach:'bau',einrichtung:'einrichtung',boden:'boden'}[kat];var k={gruppe:g,flaeche:{w:1,h:1},feld:feld,kanten:'0',anker:[]};for(var e in extra||{})k[e]=extra[e];return k}

// Kennung eines Teils. kultur = '' (Grundkultur) oder ein Kürzel (a–z, 0–9, höchstens 6 Zeichen).
function kennung(K,teil,kultur){var k=klasse(K);return 'bk-'+k.kurz+'-'+teil+(kultur?'-'+kultur:'')}
function klasse(K){for(var i=0;i<KLASSEN.length;i++)if(KLASSEN[i].id===K||KLASSEN[i].kurz===K)return KLASSEN[i];return null}
// Alle Teile einer Bauklasse als Objektrohlinge {id, kat, name, info, hinweis, bild, karte} (ohne Typnummer, Status, Ansichten: das ergänzt die Kartei).
// tausch: {dach: Farbreihe, wand: Farbreihe} oder null (Grundkultur).
function teile(K,kultur,tausch){var k=klasse(K),aus=[];
 TEILE.forEach(function(t){var b,kat,feld='f',ex=null,name=k.en+' '+NAME[t],info=INFO[t]&&INFO[t][k.id];
  if(t==='wand'){b=wandTeil(k.id,false);kat='wand';ex={kanten:'1'}}
  else if(t==='tuer'){b=wandTeil(k.id,true);kat='wand';ex={anker:[{art:'tuer',fx:0,fy:.5}]}}
  else if(t.indexOf('giebel')===0){b=giebelTeil(k.id,t==='giebel'?'block':t.slice(7));kat='wand'}
  else if(t.indexOf('dach')===0){b=dachTeil(k.id,t);kat='dach';name=k.dachEn+' '+NAME[t];info=info||dachInfo(k.id,t)}
  else if(t==='boden'){b=bodenTeil(k.id);kat='boden'}
  else if(t==='rang'){b=rangTeil(k.id);kat='boden';feld='p'}
  else{b=schildTeil(k.id);kat='einrichtung';feld='p'}
  if(tausch)b=umfaerben(b,t.indexOf('dach')===0?[k.dachReihe,tausch.dach]:t==='wand'||t==='tuer'||t.indexOf('giebel')===0?[k.wandReihe,tausch.wand]:null);
  if(kultur)name=name.slice(0,32-kultur.length-3)+' ('+kultur+')';
  aus.push({id:kennung(k.id,t,kultur),kat:kat,name:name.slice(0,32),info:info,hinweis:HINWEIS[t]+' · Bauklasse '+k.de+(kultur?' · Kultur „'+kultur+'“':''),bild:b,karte:karte(kat,feld,ex)})});
 return aus}
function feldObjekt(){return{id:'bk-feld',kat:'boden',name:'Ploughed Field',info:'Furrows of dark earth with green shoots. Somebody sweated here so somebody else can eat in the stands.',
 hinweis:'Acker für Höfe mit Feldern, flach ins Bodenbild',bild:feldTeil(),karte:karte('boden','f')}}
// Farbtausch: alle Farben der Reihe von → gleiche Helligkeit in Reihe nach (gerundet auf deren Stufen)
function umfaerben(b,paar){if(!paar||paar[1]==null||paar[0]===paar[1])return b;var s=S(),Z=s.ZEICHEN,von=paar[0],nach=paar[1],a=s.START[von],n=s.REIHEN[von].n;
 return{kat:b.kat,w:b.w,h:b.h,ax:b.ax,ay:b.ay,z:b.z.map(function(r){var o='';for(var i=0;i<r.length;i++){var c=r[i];if(c===s.LEER){o+=c;continue}var x=Z.indexOf(c);
  o+=(x>=a&&x<a+n)?Z[T(nach,(x-a)/(n-1))]:c}return o})}}

// ---------- Grundformen ----------
// Zellen: g Wiese, b Gebäude mit Dach, o offener Innenhof, f Acker, r Ränge, s Sand. Umfasst (Wände am Rand): b, r, s.
function neuL(w,h,K){return{w:w,h:h,c:new Array(w*h).fill('g'),klasse:K,achse:'i',dach:'sattel',offen:false,tueren:[],spina:[],dinge:[]}}
function feldSetz(L,i,j,ch){if(i>=0&&j>=0&&i<L.w&&j<L.h)L.c[j*L.w+i]=ch}
function zelle(L,i,j){return i<0||j<0||i>=L.w||j>=L.h?'g':L.c[j*L.w+i]}
function rechteck(L,i0,j0,w,h,ch){for(var j=j0;j<j0+h;j++)for(var i=i0;i<i0+w;i++)feldSetz(L,i,j,ch)}
// Dinge vor der Tür: Schild links, Einrichtung und Stapel rechts davon
function vorTuer(L,ti,tj,ein,stapel){var K=klasse(L.klasse);L.tueren.push([ti,tj,0,1]);L.dinge.push({id:kennung(K.id,'schild',''),i:ti-1,j:tj+1,r:0},{id:ein,i:ti+1,j:tj+1,r:0},{id:stapel,i:ti+2,j:tj+1,r:0})}
// Ein Haus bw × bh (Rand 1 Feld, vorn 2 Reihen für die Dinge). Breiter als tief: First entlang i.
function haus(w,h,K,ein,stapel){var L=neuL(Math.max(w+2,(w>>1)+5),h+4,K);rechteck(L,1,1,w,h,'b');L.achse=w>=h?'i':'j';vorTuer(L,1+(w>>1),h,ein,stapel);return L}
function bilde(form,w,h,K){var L,i,j;
 if(form==='hof'){L=neuL(w+2,h+4,K);rechteck(L,1,1,w,h,'f');var hw=Math.min(4,w-4),hh=Math.min(4,h-4);rechteck(L,1,1,hw+1,hh+1,'g');rechteck(L,1,1,hw,hh,'b');
  for(j=1;j<=h;j++)feldSetz(L,1+hw+1+((w-hw-1)>>1),j,'g');                                    // Weg durchs Feld
  L.achse='i';L.tueren.push([1+(hw>>1),hh,0,1]);var K2=klasse(K);L.dinge.push({id:kennung(K2.id,'schild',''),i:hw+2,j:h+2,r:0},{id:'lager-platz',i:hw+4,j:h+2,r:0},{id:'ware-stamm',i:hw+5,j:h+2,r:0});return L}
 if(form==='gross'){L=haus(w,h,K,'lager-platz','ware-bretter');var aw=Math.max(2,Math.round(w*.42)),ah=Math.max(2,Math.round(h*.42));rechteck(L,1+((w-aw)>>1),1+((h-ah)>>1),aw,ah,'o');L.dach='walm';return L}
 if(form==='rund'){var d=w,m=(d-1)/2,R=d/2;L=neuL(d+2,d+4,K);L.dach=null;L.offen=true;
  for(j=0;j<d;j++)for(i=0;i<d;i++){var r=Math.sqrt((i-m)*(i-m)+(j-m)*(j-m));if(r<=R-.25)feldSetz(L,i+1,j+1,r>R-Math.max(2,Math.round(d*.18))-.25?'r':'s')}
  var unten=d;while(zelle(L,1+(d>>1),unten)==='g')unten--;vorTuer(L,1+(d>>1),unten,'markt-stand','ware-fleisch');return L}
 if(form==='bahn'){L=neuL(w+2,h+4,K);L.dach=null;L.offen=true;var rr=Math.min(4,h>>2);
  for(j=0;j<h;j++)for(i=0;i<w;i++){var di=Math.max(0,rr-Math.min(i,w-1-i)),dj=Math.max(0,rr-Math.min(j,h-1-j));if(di*di+dj*dj<=rr*rr)feldSetz(L,i+1,j+1,'s')}
  for(var k=0;k<2;k++){var rand=[],nb=k?'r':'g';for(j=0;j<L.h;j++)for(i=0;i<L.w;i++)if(zelle(L,i,j)==='s'&&(zelle(L,i-1,j)===nb||zelle(L,i+1,j)===nb||zelle(L,i,j-1)===nb||zelle(L,i,j+1)===nb))rand.push([i,j]);
   rand.forEach(function(p){feldSetz(L,p[0],p[1],'r')})}                                                       // zwei Reihen Ränge am Rand
  var mj=1+(h>>1);for(i=1+Math.round(w*.25);i<=w-Math.round(w*.25);i++)L.spina.push([i,mj,0,-1]);                 // Mittelmauer (Spina) auf der Nordkante der mittleren Reihe
  vorTuer(L,1+(w>>1),h,'markt-stand','ware-fleisch');return L}
 var ein={winzig:'lager-platz',klein:'werk-bank',werkstatt:'werk-bank',halle:'lager-platz',lang:'werk-bank'}[form]||'werk-bank',st={winzig:'ware-stamm',klein:'ware-bretter',werkstatt:'ware-bretter',halle:'ware-fleisch',lang:'ware-stamm'}[form]||'ware-bretter';
 return haus(w,h,K,ein,st)}
// Musterbeispiele: je Grundform eine Größe (masse.json), je Bauklasse eins = 27
var MUSTER=[{form:'winzig',w:2,h:2,was:'Schrein, Brunnenhaus'},{form:'klein',w:4,h:4,was:'Haus'},{form:'werkstatt',w:6,h:6,was:'Werkstatt'},{form:'halle',w:10,h:10,was:'Halle'},
 {form:'hof',w:12,h:12,was:'Hof mit Feldern'},{form:'lang',w:16,h:3,was:'Seilerbahn, Lagerhalle'},{form:'gross',w:14,h:14,was:'Villa mit Innenhof'},
 {form:'rund',w:17,h:17,was:'Theater, Arena'},{form:'bahn',w:36,h:12,was:'Rennbahn'}];
function muster(){var l=[];MUSTER.forEach(function(m){KLASSEN.forEach(function(k){l.push({id:'muster-'+m.form+'-'+k.kurz,form:m.form,w:m.w,h:m.h,klasse:k.id,was:m.was})})});return l}

// Um 90° drehen (Blick von der nächsten Seite): Zelle (i, j) → (h−1−j, i), Richtung (di, dj) → (−dj, di)
function drehe(L){var N=neuL(L.h,L.w,L.klasse),i,j;N.achse=L.achse==='i'?'j':'i';N.dach=L.dach;N.offen=L.offen;N.kultur=L.kultur;
 for(j=0;j<L.h;j++)for(i=0;i<L.w;i++)N.c[i*N.w+(L.h-1-j)]=L.c[j*L.w+i];
 var k=function(e){return[L.h-1-e[1],e[0],-e[3],e[2]]};N.tueren=L.tueren.map(k);N.spina=L.spina.map(k);
 N.dinge=L.dinge.map(function(d){return{id:d.id,i:L.h-1-d.j,j:d.i,r:(d.r+1)&3}});return N}

// ---------- Zusammensetzen ----------
// Dach je Feld: Höhenstufe d (Anzahl Felder bis zur Traufe) und Platte. Sattel: nur quer zur Firstachse; Walm: alle vier Seiten; flach: überall 0.
function weit(L,i,j,di,dj){var n=0;while(zelle(L,i+(n+1)*di,j+(n+1)*dj)==='b')n++;return n}
function dachFeld(L,form,i,j){if(form==='flach')return{d:0,t:'dach-flach'};
 var dn=weit(L,i,j,0,-1),ds=weit(L,i,j,0,1),dw=weit(L,i,j,-1,0),de=weit(L,i,j,1,0),r;
 if(form==='sattel'){if(L.achse==='i')r=dn<ds?{d:dn,t:'dach-auf-j'}:ds<dn?{d:ds,t:'dach-ab-j'}:{d:dn,t:'dach-flach'};
  else r=dw<de?{d:dw,t:'dach-auf-i'}:de<dw?{d:de,t:'dach-ab-i'}:{d:dw,t:'dach-flach'}}
 else{var m=Math.min(dn,ds,dw,de);
  if(dn===m&&ds!==m)r={d:m,t:'dach-auf-j'};else if(ds===m&&dn!==m)r={d:m,t:'dach-ab-j'};else if(dw===m&&de!==m)r={d:m,t:'dach-auf-i'};else if(de===m&&dw!==m)r={d:m,t:'dach-ab-i'};else r={d:m,t:'dach-flach'}}
 if(r.d>=DMAX)r={d:DMAX,t:'dach-flach'};return r}
// L: Grundform (bilde/drehe), hole(id) → Speicherbild oder null, dachform: 'sattel'|'walm'|'flach' (leer = wie die Grundform), ohneWiese: Wiesenfelder weglassen
// (für First Person, das Gebäude steht dort auf der eigenen Wiese). Ergebnis: {w,h,ax,ay,px,teile,fehlt}
function setzen(L,hole,dachform,ohneWiese){
 var K=klasse(L.klasse),gemerkt={},fehlt={},stueck=[],bod=[],seq=0,i,j,form=L.dach?(dachform||L.dach):null;
 function sp(id,gesp,r){var key=id+(gesp?'|m':'')+(r?'|'+r:'');if(gemerkt[key]!==undefined)return gemerkt[key];var o=hole(id),b=null;
  if(o){var m=MALMERK&&MALMERK.get(o),k2=(gesp?'m':'')+(r|0);if(!m&&MALMERK){m={};MALMERK.set(o,m)}b=m&&m[k2];                     // Malbild je Teil nur einmal umrechnen
   if(!b){b=(r&&S().richtungsBild(o,r))||o.bild;b=b?malbild(b):null;if(b&&gesp)b=spiegel(b);if(m&&b)m[k2]=b}}if(!b)fehlt[id]=1;return(gemerkt[key]=b)}
 function teil(t){return kennung(K.id,t,L.kultur||'')}
 function dazu(s,x,y,tief,m){if(s)stueck.push({sp:s,x:x,y:y,tief:tief,n:seq++,m:m|0})}
 var BODEN={g:'boden-gras',b:teil('boden'),o:teil('boden'),f:'bk-feld',r:teil('rang'),s:'boden-sand'};
 for(j=0;j<L.h;j++)for(i=0;i<L.w;i++){if(ohneWiese&&zelle(L,i,j)==='g')continue;var s0=sp(BODEN[zelle(L,i,j)]);if(s0)bod.push({sp:s0,x:(i-j)*32,y:(i+j)*16+16,m:0})}
 var um=function(c){return c==='b'||c==='r'||c==='s'},tuer={};L.tueren.forEach(function(e){tuer[e.join(',')]=1});
 // Kante zwischen Zelle (i, j) und (i+di, j+dj): gehört der Nord- bzw. Westkante der Zelle mit dem größeren Index
 function kante(i,j,di,dj,id,hub,vorn){var oi=di>0?i+1:i,oj=dj>0?j+1:j,m=vorn&&L.offen?3:0;
  if(di)dazu(sp(id),(oi-oj-1)*32,(oi+oj+1)*16-hub,oi+oj,m);else dazu(sp(id,true),(oi+1-oj)*32,(oi+oj+1)*16-hub,oi+oj,m)}
 var R=[[-1,0],[1,0],[0,-1],[0,1]];
 for(j=0;j<L.h;j++)for(i=0;i<L.w;i++){if(!um(zelle(L,i,j)))continue;
  R.forEach(function(d){if(um(zelle(L,i+d[0],j+d[1])))return;kante(i,j,d[0],d[1],teil(tuer[[i,j,d[0],d[1]].join(',')]?'tuer':'wand'),0,d[0]>0||d[1]>0)})}
 L.spina.forEach(function(e){kante(e[0],e[1],e[2],e[3],teil('wand'),0,false)});
 if(form)for(j=0;j<L.h;j++)for(i=0;i<L.w;i++){if(zelle(L,i,j)!=='b')continue;var D=dachFeld(L,form,i,j);
  dazu(sp(teil(D.t)),(i-j)*32,(i+j)*16-(TRAUFE+D.d*STEP),i+j+1.5);
  if(form!=='sattel')continue;
  var quer=L.achse==='i'?[[-1,0],[1,0]]:[[0,-1],[0,1]],spitze=D.t==='dach-auf-j'||D.t==='dach-auf-i'?'giebel-auf':D.t==='dach-flach'?null:'giebel-ab';
  quer.forEach(function(d){if(zelle(L,i+d[0],j+d[1])==='b')return;kante(i,j,d[0],d[1],teil('giebel'),TRAUFE-STEP+2);for(var k=0;k<D.d;k++)kante(i,j,d[0],d[1],teil('giebel'),TRAUFE+k*STEP);
   if(spitze)kante(i,j,d[0],d[1],teil(spitze),TRAUFE+D.d*STEP)})}
 L.dinge.forEach(function(d){dazu(sp(d.id,false,d.r),(d.i-d.j)*32,(d.i+d.j)*16+16,d.i+d.j+.9)});
 stueck.sort(function(a,b){return a.tief-b.tief||a.n-b.n});
 var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;bod.concat(stueck).forEach(function(e){var a=e.x-e.sp.ax,b=e.y-e.sp.ay;if(a<x0)x0=a;if(b<y0)y0=b;if(a+e.sp.w>x1)x1=a+e.sp.w;if(b+e.sp.h>y1)y1=b+e.sp.h});
 var w=x1-x0,h=y1-y0,px=new Uint8Array(w*h).fill(LEER),pal=ID,bb=BB();
 bod.forEach(function(e){kopiere(px,w,-x0,-y0,e)});stueck.forEach(function(e){if(e.m)bb.malen(px,w,-x0,-y0,pal,e,0);else kopiere(px,w,-x0,-y0,e)});   // kniehohe Vorderwände wie baubild.js
 return{w:w,h:h,ax:-x0,ay:-y0,px:px,teile:bod.length+stueck.length,fehlt:Object.keys(fehlt)}}
var MALMERK=typeof WeakMap!=='undefined'?new WeakMap():null;
var ID=(function(){var a=[];for(var i=0;i<256;i++)a.push(i);return a})();
// Fertiges Bild → Speicherformat (für First Person, Prüfer), Anker unten in der Mitte
function zuBild(r,kat){var g={w:r.w,h:r.h,px:r.px};return alsBild(kat||'einrichtung',g,r.w>>1,r.h-1,false)}

var BK={KLASSEN:KLASSEN,DACHFORMEN:DACHFORMEN,TEILE:TEILE,PLATTEN:PLATTEN,MUSTER:MUSTER,STEP:STEP,TRAUFE:TRAUFE,DMAX:DMAX,
 klasse:klasse,kennung:kennung,teile:teile,feldObjekt:feldObjekt,umfaerben:umfaerben,bilde:bilde,drehe:drehe,muster:muster,setzen:setzen,zuBild:zuBild,dachFeld:dachFeld,zelle:zelle};
if(typeof module!=='undefined'&&module.exports)module.exports=BK;else G.AT3_BAUKASTEN=BK;
})(typeof window!=='undefined'?window:globalThis);
