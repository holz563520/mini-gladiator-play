// WAS DIE DATEI TUT: Weltgenerator von Arena Theory 3.0 (Schritte W1a, W1a+, W1b). Reine Rechnung ohne Bildschirm, nur ganze Zahlen: gleicher Seed = gleiche Welt
// auf jedem Gerät. Welt 614.400 × 307.200 Felder (9.600 × 4.800 Kartenstücke zu 64 × 64 Feldern), ohne Weltarrays.
// W1c Runde Welt: Rechteck 2 : 1, Ost- und Westkante zusammengenäht (wer nach Osten fährt, kommt von Westen wieder an), oben und unten Eispole mit
//    ausgefranster Kante (Buchten, Zungen, Eisinseln, Packeis). Alles Rauschen passt an der Naht von selbst (pn, unten), ohne Mehrkosten an der Naht.
// 1) Ebene Erde: grobes Raster 600 × 300 Zellen (eine Zelle = 16 × 16 Kartenstücke = 1.024 Felder), einmal je Welt in 16 kleinen Teilaufträgen (N2a: Klimazonen eigener Teil):
//    8 Bänder Rauschen (Kontinente, Gebirgszüge, Feuchte, Eis der Pole), Ozean und Seen (Ozean = größtes zusammenhängendes eisfreies Wasser),
//    Senken auffüllen mit Fließrichtung, Flüsse (Wassermenge sammeln), Klima und Biome; seit W1b drei weitere Teile (siehe 3). Bleibend 9 Byte je Zelle (1,6 MB).
// 2) Kartenstück: entsteht erst bei Bedarf aus Seed und einem kleinen Ausschnitt des Erdrasters (5 × 5 Zellen, 400 Byte), den der Auftrag mitbringt.
//    Höhe = geglättete Erdhöhe + feines Rauschen über Weltkoordinaten (Ränder passen von selbst), Flusslauf über gemeinsame Punkte auf den Zellkanten,
//    Küste und Strand aus der endgültigen Höhe. N2c: neue Biome Grasland, Savanne, Mittelmeer-Buschland, Regenwald, Mangroven als Unterart je Zone (unten).
//    Biome als Flecken (W1a+, unten), seit N2b folgen sie den Klimazonen (Zonenbiom rund 60–85 %, 1–3 Nachbarn,
//    weiche Übergänge über einige Stücke); Hochland hebt Hügel mit Fels und Schneekuppen, Sumpf senkt, Teiche im Land. Format je Stück 16 KB: Höhe 16 Bit (1/16 Feld, Meeresspiegel = 2048), Biom 8 Bit, Weg 8 Bit (W1b).
// Kerne: rechnen(a) läuft in den Helferkernen (ohne Helfer im Weltkern in freien Scheiben), nie auf dem Hauptkern (Regel 13). Helfer haben keinen Zustand.
// Riesenwelt (Regel 14): Ein Kartenstück kostet überall gleich viel; das Erdraster ist ein fester Betrag.
// 3) W1b Orte, Straßen, Häfen, Seewege (unten): drei weitere Erd-Teile. Orte und Häfen aus dem Seed (Dichte dünn/mittel/dicht), jede Landmasse hat
//    mindestens einen Hafen; Straßen als Wegsuche von allen Orten zugleich über Gelände, Sumpf, Fels und Flussquerungen (gewunden, keine Geraden),
//    erst ein Netz, das jeden Ort erreicht, dann Querverbindungen; Seewege ebenso über den zusammenhängenden Ozean. Bleibend 2 Byte je Zelle mehr
//    (9 Byte je Zelle) und das Netz als Graph (Orte, Verbindungen mit Länge und Art). Im Kartenstück eine vierte Schicht (1 Byte je Feld):
//    Pfad, Straße, Brücke, Furt, Steg, Ortsplatz, Fähre. Stücke ohne Straße kosten nichts zusätzlich.
// 4) N4b Völker (unten): zwei weitere Erd-Teile. 24 Kulturen (mindestens je eine, dazu Ableger) breiten sich aus ihren Kernländern aus; 1 Byte je Zelle
//    (Volk), je Ort bis zu 3 Religionen mit Prozent, hinten an der fertigen Erde. Orte, Straßen und Klima bleiben Byte für Byte gleich (Notausschalter ?n4b=0).
// 5) N4c1 Herrschaften (unten): ein weiterer Erd-Teil. Reiche aus den Völkern mit dem System ihrer Kultur, Kaiser mit Vasallen, Stufen bis zum Ort;
//    je Einheit 8 Byte, je Zelle und je Ort 2 Byte, hinten an der fertigen Erde. Alles davor bleibt Byte für Byte gleich (Notausschalter ?n4c=0).
// Wiederverwendet: Ganzzahl-Rauschen (gitter/stufe) und mix aus riesenwelt.js und kern.js (MK1, G2); zustandslose Landschaft nach dem Vorbild von
// welt-gross-core.js (2.0); Höheneinheit wie fpwelt.js (M7: 1 Feld = 1 Geschoss).
(function(root){
'use strict';
var ST=64, FELDER=ST*ST, SEITE_X=9600, SEITE_Y=4800;   // Kartenstück 64 × 64 Felder, Welt 9.600 × 4.800 Stücke (W1c: 2 : 1, Ost- und Westkante zusammengenäht)
var GW=600, GH=300, N=GW*GH, ZP=16, ZF=1024;  // Erdraster 600 × 300 Zellen, Zelle = 16 Stücke = 1.024 Felder
var WF=GW*ZF, HF=GH*ZF;                       // Welt in Feldern: 614.400 × 307.200
var MEER=2048;                                // Meeresspiegel im Stück (Höhe in 1/16 Feld)
var ST_BYTES=FELDER*4, AUS=225;               // Stück: Höhe (2 Byte) + Biom (1 Byte) + Weg (1 Byte, W1b); Ausschnitt 5 × 5 Zellen × 9 Zahlen (N2b: + Klimazone)
var GEL_BYTES=ST_BYTES+AUS*2;                 // Auftragspuffer eines Kartenstücks
var ORT_MAX=32768, KANTE_MAX=65535, NETZ_KOPF=16, NETZ_MAX=NETZ_KOPF+ORT_MAX*4+KANTE_MAX*8;   // W1b: Obergrenzen des Netzes (Orte, Verbindungen)
var VOLK_MAX=64, VK_KOPF=4+VOLK_MAX*4, VK_MAX=VK_KOPF+N+ORT_MAX*6;   // N4b: Völker (Zahl, Tafel Volk → Kernzelle | Kultur << 24), Volk je Zelle, je Ort bis zu 3 Religionen mit Prozent
var ERD_ZELLEN=10*N, ERD_FEST=ERD_ZELLEN+NETZ_MAX+VK_MAX;   // Erdraster: bleibend 10 Byte je Zelle (N2a: + Klimazone) + Netz (höchstens; übernommen wird nur der belegte Teil)
var HS_MAX=16384, HS_KOPF=4, HS_BYTES=HS_KOPF+HS_MAX*8+N*2+ORT_MAX*2;   // N4c1: Herrschaften (Zahl, je Einheit 8 Byte, je Zelle und je Ort 2 Byte)
var TAB=131072, SC=ERD_FEST, VK0=SC+11*N+TAB*12, HS0=VK0+VK_MAX, ERD_BYTES=HS0+HS_BYTES;   // N4b: Völker beim Entstehen hinter den Arbeitsfeldern   // beim Entstehen zusätzlich Arbeitsfelder der Wegsuche
var N4B=!(root.location&&/[?&](n2b|n2c|n4b)=0/.test(root.location.search||''));   // N4b Notausschalter ?n4b=0 (auch mit ?n2b=0, ?n2c=0): kein Teil „Völker“, Erde Byte für Byte wie N4a
var N4C=N4B&&!(root.location&&/[?&]n4c=0/.test(root.location.search||''));   // N4c1 Notausschalter ?n4c=0 (auch mit ?n4b=0): kein Teil „Herrschaften“, Erde Byte für Byte wie N4b
var BAND=8, TEILE=BAND+(N4C?11:N4B?10:8);                     // Teilaufträge der Erde
var TEIL_NAME=['Rauschen 1','Rauschen 2','Rauschen 3','Rauschen 4','Rauschen 5','Rauschen 6','Rauschen 7','Rauschen 8','Ozean und Seen','Senken','Flüsse','Klima','Klimazonen','Orte und Häfen','Straßen','Seewege','Völker: Kernländer','Völker: Ausbreitung und Glaube','Herrschaften'];
var ORT_ART=['','Dorf','Stadt','Hafendorf','Hafenstadt'], WEG_ART=['','Pfad','Straße','Brücke','Furt','Steg','Ortsplatz','Fähre'];
var BIOM=['tiefes Meer','Meer','Strand','Wüste','Steppe','Wald','Sumpf','Tundra','Fels','Schnee','Fluss','See','Eis','Grasland','Savanne','Mittelmeer-Buschland','Regenwald','Mangroven'];   // 12 Eis: nur im Erdraster (Polkappe, gesperrt); im Kartenstück ist Eis Schnee (9). 13–17 seit N2c
// Land-Biom? (N2c: 2–9 und 13–17; Wasser 0, 1, 10, 11; Eis 12)
function istLand(b){return b>=2&&b<=9||b>=13}
var DX=[1,0,-1,0], DY=[0,1,0,-1];             // Richtungen: 0 Ost, 1 Süd, 2 West, 3 Nord; 4 = keine
var LAND_AB=3500, FLUSS_AB=48;                // Meeresanteil (W1c: ohne Randozean neu eingestellt, Land im Mittel weiter rund 31 %), Wassermenge für einen Fluss
// Nachbarzelle in Richtung r: in x läuft die Welt um (Naht), in y endet sie am Pol (−1 = keine Zelle)
function nb(i,r){if(r===0)return(i+1)%GW?i+1:i+1-GW;if(r===2)return i%GW?i-1:i-1+GW;if(r===1)return i+GW<N?i+GW:-1;return i>=GW?i-GW:-1}
function um(z){z%=GW;return z<0?z+GW:z}        // Zellspalte auf 0..GW−1

function mix(a){a=a>>>0;a^=a>>>16;a=Math.imul(a,0x7feb352d);a^=a>>>15;a=Math.imul(a,0x846ca68b);a^=a>>>16;return a>>>0}
function gitter(seed,o,lx,ly){return mix(seed^Math.imul(lx,0x27d4eb2d)^Math.imul(ly,0x165667b1)^Math.imul(o+1,0x9e3779b9))&255}

// Sichten auf den Erdpuffer (bleibend: Höhe, Biom, Fluss, Richtung, Feuchte, Wärme; nur beim Entstehen: Meeresnähe, Reihenfolge, Wassermenge)
function ansicht(buf){var a={E:new Int16Array(buf,0,N),bio:new Uint8Array(buf,2*N,N),flu:new Uint8Array(buf,3*N,N),dir:new Uint8Array(buf,4*N,N),
  feu:new Uint8Array(buf,5*N,N),tmp:new Uint8Array(buf,6*N,N)};
 if(buf.byteLength>=ERD_ZELLEN){a.zon=new Uint8Array(buf,9*N,N)}                                                  // N2a: Klimazone je Zelle (ZONE)
 if(buf.byteLength>=ERD_ZELLEN+NETZ_KOPF){a.ort=new Uint8Array(buf,7*N,N);a.weg=new Uint8Array(buf,8*N,N);a.kopf=new Uint32Array(buf,ERD_ZELLEN,4)}   // W1b
 if(buf.byteLength>=ERD_BYTES){a.meer=new Uint8Array(buf,7*N,N);a.ord=new Uint32Array(buf,8*N,N);a.acc=new Uint32Array(buf,12*N,N);  // nur beim Entstehen (Teile 0 bis 7 nutzen den Platz von ort, weg und Netz als Arbeitsfeld)
  a.orte=new Uint32Array(buf,ERD_ZELLEN+NETZ_KOPF,ORT_MAX);a.kanten=new Uint16Array(buf,ERD_ZELLEN+NETZ_KOPF+ORT_MAX*4,KANTE_MAX*4);
  a.lm=new Uint16Array(buf,SC,N);a.bes=new Uint16Array(buf,SC+2*N,N);a.dst=new Uint16Array(buf,SC+4*N,N);a.vor=new Uint8Array(buf,SC+6*N,N);a.hp=new Uint32Array(buf,SC+7*N,N);
  a.tk=new Uint32Array(buf,SC+11*N,TAB);a.tv=new Uint32Array(buf,SC+11*N+TAB*4,TAB);a.tc=new Uint32Array(buf,SC+11*N+TAB*8,TAB)}
 else if(a.kopf){a.orte=new Uint32Array(buf,ERD_ZELLEN+NETZ_KOPF,a.kopf[0]);a.kanten=new Uint16Array(buf,ERD_ZELLEN+NETZ_KOPF+a.kopf[0]*4,a.kopf[1]*4)}   // übernommen: nur der belegte Teil
 if(buf.byteLength>=ERD_BYTES){a.vk=vkSicht(buf,VK0,ORT_MAX);a.hs=hsSicht(buf,HS0,HS_MAX,ORT_MAX)}
 else if(a.kopf){var o=ERD_ZELLEN+NETZ_KOPF+a.kopf[0]*4+a.kopf[1]*8;if(buf.byteLength>=o+VK_KOPF+N+a.kopf[0]*6){a.vk=vkSicht(buf,o,a.kopf[0]);   // N4b: nur wenn die Erde Völker trägt
  var o2=o+VK_KOPF+N+a.kopf[0]*6;if(buf.byteLength>=o2+HS_KOPF){var nH=new Uint16Array(buf,o2,1)[0];if(buf.byteLength>=o2+HS_KOPF+nH*8+N*2+a.kopf[0]*2)a.hs=hsSicht(buf,o2,nH,a.kopf[0])}}}   // N4c1: nur wenn die Erde Herrschaften trägt   // N4b: nur wenn die Erde Völker trägt
 if(a.vk)a.vol=a.vk.vol;
 return a}
function hsSicht(buf,o,nH,n){return{zahl:new Uint16Array(buf,o,2),tab:new Uint16Array(buf,o+HS_KOPF,nH*4),zel:new Uint16Array(buf,o+HS_KOPF+nH*8,N),ort:new Uint16Array(buf,o+HS_KOPF+nH*8+N*2,n)}}
function vkSicht(buf,o,n){return{zahl:new Uint32Array(buf,o,1),tab:new Uint32Array(buf,o+4,VOLK_MAX),vol:new Uint8Array(buf,o+VK_KOPF,N),rel:new Uint8Array(buf,o+VK_KOPF+N,n*6)}}

// ── Ebene Erde ──
function glatt(u){return(u*u*(768-2*u))>>16}                                                     // 0..256 → 0..256, weich
// W1c: Wertrauschen auf einem gedrehten Quadratgitter, das an der Ost-West-Naht von selbst passt. Gittervektor (a, b) in ganzen Zahlen, Gitterabstand
// Wurzel(a² + b²). Die Weltbreite w ist ein Gittervektor, wenn a·w und b·w durch a² + b² teilbar sind; dann wird jeder Gitterpunkt vor dem Würfeln um
// diesen Nahtvektor (m, −n) zurückgerechnet (eine Division). Kosten wie vorher: vier Gitterwerte, an der Naht genauso wie überall. Nur ganze Zahlen.
function gv(a,b,w){var Q=a*a+b*b,m=a*w/Q,n=b*w/Q;if(a<1||m!==Math.floor(m)||n!==Math.floor(n)||(a+Math.abs(b))*(w+4096)>=2147483647)throw new Error('Gitter passt nicht an die Naht: '+a+','+b);return[a|0,b|0,Q|0,m|0,n|0]}
function gz(a,b){return gv(a,b,GW)}            // Gitter in Erdzellen
function gf(a,b){return gv(a,b,WF)}            // Gitter in Feldern
function g8(a,b){return gv(a,b,WF>>3)}         // Gitter in Achtelstücken (8 Felder): für die weiten Stufen des Eises, damit alles in 32 Bit bleibt
function pn(seed,o,x,y,g){var a=g[0],b=g[1],Q=g[2],m=g[3],n=g[4],U=(a*x+b*y)|0,V=(a*y-b*x)|0,lx=(U/Q)|0,ly=(V/Q)|0,fx=(U-lx*Q)|0,fy=(V-ly*Q)|0;   // alles in 32 Bit (gv prüft die Größe)
 if(fx<0){fx=(fx+Q)|0;lx=(lx-1)|0}if(fy<0){fy=(fy+Q)|0;ly=(ly-1)|0}
 var t=(lx/m)|0,l0=(lx-t*m)|0;if(l0<0){l0=(l0+m)|0;t=(t-1)|0}
 var y0=(ly+t*n)|0,l1=(l0+1)|0,y1=y0;if(l1===m){l1=0;y1=(y0+n)|0}
 var ux=glatt((fx*256/Q)|0),uy=glatt((fy*256/Q)|0);
 var A=gitter(seed,o,l0,y0),B=gitter(seed,o,l1,y1),C=gitter(seed,o,l0,(y0+1)|0),D=gitter(seed,o,l1,(y1+1)|0);
 return((A*(256-ux)+B*ux)*(256-uy)+(C*(256-ux)+D*ux)*uy)>>8}                                     // 0..65280
// Stufen der Erde: Gitter (in Zellen, Abstand rund 63, 30, 16, 8, 4, 2), Gewicht
var O_LAND=[[gz(60,20),96],[gz(18,24),64],[gz(5,15),40],[gz(6,-6),28],[gz(2,4),16],[gz(2,-1),12]], O_BERG=[[gz(24,-18),128],[gz(12,9),72],[gz(1,7),40],[gz(3,3),16]], O_FEU=[[gz(10,30),120],[gz(9,-12),80],[gz(7,-1),56]];
var G_NETZ=gz(3,-3);
function okt(seed,L,x,y){var s=0;for(var i=0;i<L.length;i++)s+=pn(seed,i,x,y,L[i][0])*L[i][1];return s>>8}

// ── W1c Eis der Pole ── Wert in Feldern: > 0 = Eis, < 0 = so weit bis zum Eis. Breite je Längengrad aus zwei weiten Stufen (rund 63 und 15 Zellen), dazu
// Buchten und Zungen (8 und 4 Zellen), Schollen (600 bis 110 Felder) und Packeis (feines Rauschen je Feld): Wo das Rauschen steiler ist als der Abstand zum Pol, entstehen von selbst Eisinseln
// und Löcher. Die drei Zellreihen am Pol sind immer Eis. Vor dem Eis liegt immer ein Polarmeer (das Land sinkt zum Eis hin ab, die letzten zwei Zellen sind Wasser):
// so hängen die Meere rund um die Welt zusammen, und unter dem Eis liegt Wasser (Schollen, keine vereisten Berge). Vorschlagswerte: EIS_B mittlere Breite, EIS_W Schwankung der Breite, EIS_A Ausfransen je Stufe.
var EIS_B=18000, EIS_W=[13000,5000], EIS_A=[6000,4500,900,400,250], EIS_MAX=12050, EIS_FEIN=260;    // EIS_MAX: Summe von EIS_A (größter Ausschlag der Kante); EIS_FEIN: Packeis (Schollen von 8 bis 16 Feldern vor der Kante)
var EIS_RING=10240, EIS_ZONE=58;               // Polarmeer: so weit vor dem Eis sinkt das Land ab (Felder); Zellreihen ab dem Pol, in denen Eis oder Polarmeer liegen kann
var G_EISB=[g8(60*128,-20*128),g8(12*128,9*128)], G_EIS=[g8(6*128,6*128),g8(2*128,-4*128),gf(576,192),gf(144,-192),gf(72,96)];   // x, y beim Eis immer Vielfache von 8 Feldern
function eisBreite(sI,x,pol){var y=pol?31250:6250;x>>=3;return EIS_B+(((pn(sI,0,x,y,G_EISB[0])-32640)*EIS_W[0])>>15)+(((pn(sI,1,x,y,G_EISB[1])-32640)*EIS_W[1])>>15)}
function eisSaum(sI,x,y,grob){var s=0;for(var k=0;k<(grob?2:5);k++)s+=((pn(sI,2+k,k<2?x>>3:x,k<2?y>>3:y,G_EIS[k])-32640)*EIS_A[k])>>15;return s}
function eisSeed(seed){return mix(seed^0x1ce5ca1e)}
function eis(sI,x,y,grob){var pol=y>=HF>>1?1:0,d=pol?HF-1-y:y,v=eisBreite(sI,x,pol)-d+eisSaum(sI,x,y,grob);return d<3072&&v<3072-d?3072-d:v}   // grob: nur die weiten Stufen (Erdraster)

function teilRauschen(A,seed,band){var y0=(band*GH/BAND)|0,y1=((band+1)*GH/BAND)|0,sB=mix(seed^0x3c6ef372),sF=mix(seed^0x6a09e667),sI=eisSeed(seed);
 for(var y=y0;y<y1;y++)for(var x=0;x<GW;x++){var i=y*GW+x;
  var dz=y<GH-1-y?y:GH-1-y,v=dz<EIS_ZONE?eis(sI,x*ZF+(ZF>>1),y*ZF+(ZF>>1),true):-1e9,c=okt(seed,O_LAND,x,y)-32640-LAND_AB,e;
  if(v>-EIS_RING){var u=(v>0?EIS_RING:EIS_RING+v)>>6;c-=(u*u*300)>>8;if(v>-2048&&c>-2000)c=-2000}                // Polarmeer vor und unter dem Eis
  if(c>0){var r=2200-Math.abs(okt(sB,O_BERG,x,y)-32640);if(r<0)r=0;var inl=c>5000?5000:c;
   e=((c/9)|0)+((((r*inl)/5000)|0)<<2)+1;if(e>9600)e=9600}
  else{e=(c/5)|0;if(e>-1)e=-1;if(e<-2048)e=-2048}
  A.E[i]=e;A.feu[i]=okt(sF,O_FEU,x,y)>>8;A.bio[i]=v>0?12:0}}                 // 12 = Eis (bleibt bis zum Schluss stehen)

// Ozean = das größte zusammenhängende eisfreie Wasser (über die Naht hinweg). Übriges Wasser = See. Eis sperrt. Dazu die Meeresnähe je Zelle.
function teilOzean(A){var E=A.E,bio=A.bio,q=A.ord,meer=A.meer,lab=A.acc,n=0,k=0,i,r,j,c,L=0,best=0,bn=0;
 for(i=0;i<N;i++){lab[i]=0;meer[i]=255;if(bio[i]!==12)bio[i]=E[i]<0?11:5}
 for(i=0;i<N;i++){if(bio[i]!==11||lab[i])continue;L++;n=0;k=0;q[n++]=i;lab[i]=L;
  while(k<n){c=q[k++];for(r=0;r<4;r++){j=nb(c,r);if(j>=0&&bio[j]===11&&!lab[j]){lab[j]=L;q[n++]=j}}}
  if(n>bn){bn=n;best=L}}
 n=0;for(i=0;i<N;i++)if(bio[i]===11&&lab[i]===best){bio[i]=1;meer[i]=0;q[n++]=i}
 k=0;                                                                                              // Meeresnähe: Schritte bis zum Ozean (höchstens 255)
 while(k<n){i=q[k++];var m=meer[i];if(m>=254)continue;
  for(r=0;r<4;r++){j=nb(i,r);if(j>=0&&meer[j]===255){meer[j]=m+1;q[n++]=j}}}}

// Senken auffüllen (vom Wasser und vom Eis her, niedrigste Zelle zuerst): jede Landzelle fließt zu der Zelle, von der aus sie erreicht wurde. Ohne Kreise.
function teilSenken(A){var E=A.E,bio=A.bio,dir=A.dir,hp=A.acc,ord=A.ord,n=0,cnt=0,i,r,j,v,p,e,c;
 // Haufen aus einer Zahl je Zelle: Höhe × Zellenzahl + Zellnummer (niedrigste zuerst, bei Gleichstand die kleinere Nummer)
 function rein(v){p=n++;while(p>0){e=(p-1)>>1;if(hp[e]<=v)break;hp[p]=hp[e];p=e}hp[p]=v}
 function raus(){var top=hp[0];v=hp[--n];p=0;for(;;){c=2*p+1;if(c>=n)break;if(c+1<n&&hp[c+1]<hp[c])c++;if(hp[c]>=v)break;hp[p]=hp[c];p=c}hp[p]=v;return top}
 for(i=0;i<N;i++)dir[i]=bio[i]===5?255:4;
 for(i=0;i<N;i++){if(dir[i]!==4)continue;
  for(r=0;r<4;r++){j=nb(i,r);if(j>=0&&dir[j]===255){rein(i);break}}}
 while(n){i=raus()%N;ord[cnt++]=i;var h=E[i]<0||bio[i]===12?0:E[i];
  for(r=0;r<4;r++){j=nb(i,r);if(j<0||dir[j]!==255)continue;
   dir[j]=r^2;if(E[j]<=h)E[j]=h+1;rein((E[j]>23000?23000:E[j])*N+j)}}
 for(i=cnt;i<N;i++)ord[i]=0xffffffff}                                                               // Rest der Reihenfolge leer

// Flüsse: Wassermenge von oben nach unten sammeln (umgekehrte Reihenfolge der Senken-Rechnung). Fluss ab fester Menge, fünf Breiten.
function teilFluesse(A){var dir=A.dir,flu=A.flu,acc=A.acc,ord=A.ord,feu=A.feu,i,k,m;
 for(i=0;i<N;i++){acc[i]=dir[i]<4?1+(feu[i]>>5):0;flu[i]=0}
 for(k=N-1;k>=0;k--){i=ord[k];if(i>=N||dir[i]>=4)continue;acc[nb(i,dir[i])]+=acc[i]}
 for(i=0;i<N;i++){if(dir[i]>=4)continue;m=acc[i];flu[i]=m<FLUSS_AB?0:m<FLUSS_AB*3?1:m<FLUSS_AB*9?2:m<FLUSS_AB*27?3:m<FLUSS_AB*81?4:5}}

function biomVon(h,t,f){return h>7000||(t<25&&h>4000)?9:h>3800?8:t<45?7:t>185&&f<95?3:f<110?4:f>175&&h<600?6:5}
// Klima: Wärme nach Breite (Äquator in der Mitte) und Höhe, Feuchte aus Rauschen, Meeresnähe und Flüssen; Biom; Wasserart für die Kartenstücke.
function teilKlima(A){var E=A.E,bio=A.bio,dir=A.dir,flu=A.flu,feu=A.feu,tmp=A.tmp,meer=A.meer,i,x,y;
 for(y=0;y<GH;y++){var warm=255-Math.abs((((y*510)/(GH-1))|0)-255);
  for(x=0;x<GW;x++){i=y*GW+x;var e=E[i],t=warm-(e>0?e>>6:0)+((feu[i]&15)-8),f=((feu[i]*3)>>2)+(meer[i]<16?(16-meer[i])<<2:0)+(flu[i]?24:0);
   t=t<0?0:t>255?255:t;f=f>255?255:f;tmp[i]=t;feu[i]=f;
   if(bio[i]===1)bio[i]=e<-600?0:1;else if(bio[i]<11)bio[i]=herrscht(e,t,f)}}
 for(y=0;y<GH;y++)for(x=0;x<GW;x++){i=y*GW+x;var see=bio[i]===11?1:bio[i]<2?0:1;                     // Bit 7: Wasser hier ist Binnenwasser (See), sonst Meer
  if(see&&bio[i]!==11)for(var dy=-1;dy<=1&&see;dy++)for(var dx=-1;dx<=1;dx++){var ny=y+dy;if(ny<0||ny>=GH)continue;if(bio[ny*GW+um(x+dx)]<2){see=0;break}}
  dir[i]=(dir[i]&7)|(see?128:0)}}

// ── N2a Großklima: Klimazonen wie auf der Erde (eigene Schicht zon, 1 Byte je Zelle; Kartenstücke, Orte und Straßen bleiben bis N2b unverändert) ──
// Wärme nach Breite und Höhe. Regen kommt mit dem Wind vom Meer: je Zellreihe zwei Läufe rund um die Welt (Wind von Westen und von Osten), Gewicht je
// Breite wie die Windgürtel der Erde (Passat von Osten in den Tropen, Westwind in den mittleren Breiten, Ostwind am Pol, Monsun an subtropischen
// Ostküsten). Über dem Meer saugt sich die Luft voll (warmes Meer mehr), über Land regnet sie ab, am Hang stark (Stauregen), dahinter Regenschatten.
// Dazu nasse und trockene Gürtel (Äquator nass, Wendekreise trocken, Sturmbahn der mittleren Breiten nass). Daraus je Zelle eine von 14 Zonen.
// Nur ganze Zahlen. Kosten fest (180.000 Zellen, im Teil „Klima“ im Helferkern), unabhängig von allem anderen. Der Master-Editor rechnet dieselbe
// Regel zeilenweise mit eigenen Reglern (zonenRegen, zonenKlasse), damit nie ein Bild hängt.
var ZONE=['Wasser','Eis','Schnee','Tundra','Nadelwald','Laubwald','Grasland','Steppe','Mittelmeer-Buschland','Wüste','Savanne','Regenwald','Sumpf','Mangroven','Gebirge'];
var ZONE_EN=['Water','Ice','Snow','Tundra','Taiga','Broadleaf Forest','Grassland','Steppe','Mediterranean Scrub','Desert','Savanna','Rainforest','Swamp','Mangroves','Mountains'];
// Stellschrauben (Vorschlagswerte, Weltansicht → Klimazonen hat Regler dafür). Wärme in Zehntel Grad, Höhe E in Erdeinheiten (1/16 Feld), Regen in eigenen Einheiten.
var ZK={T_AEQ:270,      // Wärme am Äquator auf Meereshöhe (27 °C)
 T_POL:560,             // so viel kälter am Pol (quadratisch über die Breite)
 T_HOEHE:27,            // Abkühlung je 1.024 Erdeinheiten Höhe
 REGEN:256,             // Regen insgesamt (256 = 1×)
 R_LAND:24,             // Anteil der Feuchte, der je Zelle über Land abregnet (von 1.024): kleiner = Regen reicht weiter ins Land
 R_BERG:256,            // Stauregen am Hang: Stärke des Regenschattens hinter Gebirgen
 TROCKEN:40,            // darunter Wüste
 STEPPE:80,             // darunter Steppe
 WALD:130,              // ab hier Wald
 REGENWALD:230,         // ab hier Regenwald (in den Tropen)
 G_FELS:3800,           // ab dieser Höhe Gebirge
 G_SCHNEE:7000};        // ab dieser Höhe Schnee (früher bei Kälte)
var Z_MEER=1000, Z_MEERW=9, Z_AUF=96, Z_LEE=150, Z_RUECK=160, Z_WAERME=96, Z_TR=25, Z_RR=40;   // Meeresfeuchte (Grund, je Zehntel Grad), Aufnahme über Meer, Lee, Rückverdunstung, Mehrbedarf an Wärme, Rauschen Wärme und Regen
// Gürtel je Breite (b = 0 Äquator … 256 Pol; 30° ≈ 85, 60° ≈ 171): Grundregen ohne Wind (Gewitter am Äquator, Fronten der mittleren Breiten), Regenfaktor, Gewicht Wind von Westen, Gewicht Wind von Osten (je von 256)
var Z_B=[0,32,64,85,110,140,171,210,256], Z_G=[200,150,20,5,45,90,70,25,10], Z_F=[420,330,140,110,220,280,230,150,90], Z_WW=[40,40,60,150,220,256,230,120,100], Z_WO=[256,256,230,140,110,50,60,180,200];
var G_ZT=gz(5,15), G_ZR=gz(3,-3), G_ZT2=gz(18,24), G_ZR2=gz(10,30), Z_TR2=45, Z_RR2=70;   // dazu weite Wellen (rund 30 Zellen), damit die Zonengrenzen nicht wie mit dem Lineal gezogen sind
function zIp(T,b){for(var k=1;k<Z_B.length;k++)if(b<=Z_B[k])return T[k-1]+(((T[k]-T[k-1])*(b-Z_B[k-1]))/(Z_B[k]-Z_B[k-1])|0);return T[T.length-1]}
function zBreite(y){var d=2*y-(GH-1);return((d<0?-d:d)*256/(GH-1))|0}                                  // 0 am Äquator, 256 am Pol
// Wärme einer Zelle in Zehntel Grad (e = Erdhöhe, nz = Rauschen schon eingerechnet, wenn seed gegeben)
function waerme(K,y,e,x,seed){var b=zBreite(y),t=K.T_AEQ-((b*b*K.T_POL)>>16)-(e>0?(e*K.T_HOEHE)>>10:0);
 if(seed!=null){var sT=mix(seed^0x7a3e5c11);t+=(((pn(sT,0,x,y,G_ZT)-32640)*Z_TR)>>15)+(((pn(sT,1,x,y,G_ZT2)-32640)*Z_TR2)>>15)}return t}
var zR=null, zW=null, zA=new Int32Array(GW), zB2=new Int32Array(GW);
function zonenSpeicher(){if(!zR){zR=new Uint16Array(N);zW=new Uint8Array(N)}return{R:zR,W:zW}}
// Ein Lauf entlang einer Zellreihe in Windrichtung d (+1: Wind von Westen). Regen je Zelle nach O.
function zLauf(A,K,y,d,O){var E=A.E,bio=A.bio,flu=A.flu,r0=y*GW,x0=-1,k,x,i,W,eV=0,t0=waerme(K,y,0),wo=Z_MEER+(t0>0?t0*Z_MEERW:0);
 for(k=0;k<GW;k++){x=d>0?GW-1-k:k;if(bio[r0+x]<2){x0=x;break}}                                       // letztes Meer gegen den Wind: dort beginnt die Luft
 var runden=x0<0?2:1;if(x0<0)x0=0;W=x0<0?Z_MEER>>1:wo;
 for(var rd=0;rd<runden;rd++)for(k=0;k<GW;k++){x=x0+d*k;x=x<0?x+GW:x>=GW?x-GW:x;i=r0+x;var b=bio[i];
  if(b<2){W+=((wo-W)*Z_AUF)>>8;eV=0;O[x]=0;continue}
  if(b===12){W-=(W*64)>>8;eV=0;O[x]=0;continue}
  if(b===11){if(W<wo>>1)W+=(((wo>>1)-W)*64)>>8;eV=0;O[x]=0;continue}
  var e=E[i]>0?E[i]:0,steig=e-eV,r=(W*K.R_LAND)>>10;
  if(steig>0)r+=((W>>4)*steig*K.R_BERG)>>16;else if(steig<0)r=(r*Z_LEE)>>8;
  if(r>(W*3)>>2)r=(W*3)>>2;
  W+=-r+((r*Z_RUECK)>>8)+(flu[i]<<3);eV=e;O[x]=r}}
// Regen der Reihen y0..y1−1 nach R (ungeglättet) und Westanteil nach WA (0..255)
function zonenRegen(A,seed,K,y0,y1,R,WA){var sR=mix(seed^0x51a7e3d9),bio=A.bio;
 for(var y=y0;y<y1;y++){var b=zBreite(y),f=zIp(Z_F,b),g=zIp(Z_G,b),ww=zIp(Z_WW,b),wo=zIp(Z_WO,b);zLauf(A,K,y,1,zA);zLauf(A,K,y,-1,zB2);
  for(var x=0;x<GW;x++){var i=y*GW+x,a=zA[x]*ww,c=zB2[x]*wo,s=((((a+c)>>8)*f)>>8)+(bio[i]>1?g:0);
   s=(s*K.REGEN)>>8;s=(s*(256+(((pn(sR,0,x,y,G_ZR)-32640)*Z_RR)>>15)+(((pn(sR,1,x,y,G_ZR2)-32640)*Z_RR2)>>15)))>>8;R[i]=s>65535?65535:s<0?0:s;WA[i]=a+c>0?((a*255)/(a+c))|0:128}}}
// Zone der Reihen y0..y1−1 nach Z (R 3 × 3 geglättet, über die Naht; braucht R der Nachbarreihen)
function zonenKlasse(A,seed,K,y0,y1,R,WA,Z){var E=A.E,bio=A.bio,flu=A.flu;
 for(var y=y0;y<y1;y++){var ya=y>0?y-1:y,yb=y<GH-1?y+1:y,b=zBreite(y);
  for(var x=0;x<GW;x++){var i=y*GW+x,bi=bio[i];
   if(bi<2||bi===11){Z[i]=0;continue}if(bi===12){Z[i]=1;continue}
   var xl=x?x-1:GW-1,xr=x<GW-1?x+1:0,s=(R[ya*GW+xl]+2*R[ya*GW+x]+R[ya*GW+xr]+2*R[y*GW+xl]+4*R[i]+2*R[y*GW+xr]+R[yb*GW+xl]+2*R[yb*GW+x]+R[yb*GW+xr])>>4;
   var e=E[i]>0?E[i]:0,t=waerme(K,y,e,x,seed),m=s-(t>0?(t*Z_WAERME)>>8:0)+(Z_WAERME*100>>8),z;   // m: Feuchte nach Abzug der Verdunstung (bei 10 °C = Regen)
   if(e>K.G_SCHNEE||(e>K.G_FELS&&t<-40))z=2;
   else if(e>K.G_FELS)z=14;
   else if(t<-160)z=2;
   else if(t<-60)z=3;
   else{var kueste=bio[ya*GW+x]<2||bio[yb*GW+x]<2||bio[y*GW+xl]<2||bio[y*GW+xr]<2;
    if(t>=220&&kueste&&e<150&&m>=K.WALD)z=13;
    else if(e<500&&flu[i]>=3&&m>=K.WALD&&t>=0)z=12;
    else if(t<40)z=m<K.STEPPE?(t<-20?3:7):4;
    else if(m<K.TROCKEN)z=9;
    else if(m<K.STEPPE)z=7;
    else if(t>=200)z=m>=K.REGENWALD?11:10;
    else if(m>=K.WALD)z=t<60?4:5;
    else z=t>=130&&b>=55&&b<=135&&WA[i]>=150?8:6}
   Z[i]=z;if(N2C&&Z===A.zon)bio[i]=zbio(z,bi)}}}                          // N2c: Land-Biom des Erdrasters = Hauptbiom der Zone (Orte, Straßen, Weltkarte); Regler-Vorschau im Editor ändert es nicht
// Ganze Erde (Generator, Tests): Zonen mit den Werten K (sonst ZK) nach A.zon
function zonen(A,seed,K){var S=zonenSpeicher();K=K||ZK;zonenRegen(A,seed,K,0,GH,S.R,S.W);zonenKlasse(A,seed,K,0,GH,S.R,S.W,A.zon);return S}

function erdTeil(a){var A=ansicht(a.daten.buffer),t=a.teil;
 if(t<BAND)teilRauschen(A,a.seed>>>0,t);else if(t===BAND)teilOzean(A);
 else if(t===BAND+1)teilSenken(A);else if(t===BAND+2)teilFluesse(A);
 else if(t===BAND+3)teilKlima(A);else if(t===BAND+4)zonen(A,a.seed>>>0,ZK);                         // N2a: Klimazonen als eigener Teil (kurze Aufträge)
 else if(t===BAND+5)teilOrte(A,a.seed>>>0,a.dichte==null?1:a.dichte);else if(t===BAND+10)teilHerrschaften(A,a.seed>>>0);else if(t>=BAND+8)teilVoelker(A,a.seed>>>0,t-BAND-8);else teilNetz(A,a.seed>>>0,t===BAND+7?1:0);
 return a.daten}
// Bleibender Teil der fertigen Erde: 10 Byte je Zelle, Kopf, belegte Orte, belegte Verbindungen (dicht hintereinander)
// N4b: dahinter die Völker (Zahl, Tafel, Volk je Zelle, Religionen je Ort), nur wenn der Teil „Völker“ gelaufen ist
function fest(d){var k=new Uint32Array(d.buffer,ERD_ZELLEN,4),nO=k[0],nK=k[1],mitV=N4B&&d.byteLength>=ERD_BYTES&&new Uint32Array(d.buffer,VK0,1)[0]>0,nV=mitV?VK_KOPF+N+nO*6:0,
 mitH=mitV&&N4C&&new Uint16Array(d.buffer,HS0,1)[0]>0,nH=mitH?new Uint16Array(d.buffer,HS0,1)[0]:0,nHB=mitH?HS_KOPF+nH*8+N*2+nO*2:0,
 p=ERD_ZELLEN+NETZ_KOPF,aus=new Uint8Array(p+nO*4+nK*8+nV+nHB);
 aus.set(d.subarray(0,p+nO*4));aus.set(d.subarray(ERD_ZELLEN+NETZ_KOPF+ORT_MAX*4,ERD_ZELLEN+NETZ_KOPF+ORT_MAX*4+nK*8),p+nO*4);
 if(mitV)aus.set(d.subarray(VK0,VK0+nV),p+nO*4+nK*8);
 if(mitH){var q=p+nO*4+nK*8+nV,z0=HS0+HS_KOPF+HS_MAX*8;aus.set(d.subarray(HS0,HS0+HS_KOPF+nH*8),q);q+=HS_KOPF+nH*8;aus.set(d.subarray(z0,z0+N*2),q);q+=N*2;aus.set(d.subarray(z0+N*2,z0+N*2+nO*2),q)}   // N4c1
 return aus}
// Ganze Erde in einem Stück (Tests und Werkzeuge). Liefert den bleibenden Teil.
function erde(seed,dichte){var d=new Uint8Array(ERD_BYTES);for(var t=0;t<TEILE;t++)erdTeil({seed:seed,teil:t,dichte:dichte,daten:d});return fest(d)}

// Ausschnitt 5 × 5 Zellen um das Kartenstück in den Auftragspuffer schreiben (Weltkern). In x über die Naht; jenseits des Pols: die Polreihe noch einmal, ohne Fluss und Weg.
function ausschnitt(A,cx,cy,daten){var X=new Int16Array(daten.buffer,ST_BYTES,AUS),zx=cx>>4,zy=cy>>4,p=0;
 for(var dy=-2;dy<=2;dy++)for(var dx=-2;dx<=2;dx++,p+=9){var x=um(zx+dx),y=zy+dy,i;
  if(y<0||y>=GH){i=(y<0?0:GH-1)*GW+x;X[p]=A.E[i];X[p+1]=A.feu[i];X[p+2]=A.tmp[i];X[p+3]=A.dir[i]&128?255:0;X[p+4]=0;X[p+5]=4;X[p+6]=0;X[p+7]=0;X[p+8]=zfuell(A,i);continue}
  i=y*GW+x;X[p]=A.E[i];X[p+1]=A.feu[i];X[p+2]=A.tmp[i];X[p+3]=A.dir[i]&128?255:0;X[p+4]=A.flu[i];X[p+5]=A.dir[i]&7;X[p+6]=A.weg?A.weg[i]:0;X[p+7]=A.ort?A.ort[i]:0;X[p+8]=zfuell(A,i)}
 return daten}

// ── Kartenstück ──
var hoch=new Uint16Array(FELDER), fein=new Uint16Array(FELDER), ecken=new Uint8Array(81);
// Wertrauschen einer Stufe über Weltkoordinaten (wie riesenwelt.js, hier mit weichem Übergang): Gitterabstand 2^ld Felder
var sx=new Int32Array(ST), su=new Int32Array(ST);
function stufe(seed,o,ld,gew,gx0,gy0,ziel,setzen){var S=1<<ld,c=ld>=6?1:ST>>ld,lx0=gx0>>ld,ly0=gy0>>ld,P=WF>>ld,x,y,t;   // P: Gitterspalten rund um die Welt (Naht)
 for(y=0;y<=c;y++)for(x=0;x<=c;x++)ecken[y*(c+1)+x]=gitter(seed,o,(lx0+x)%P,ly0+y);
 for(x=0;x<ST;x++){t=gx0+x-(lx0<<ld);sx[x]=t>>ld;su[x]=glatt(ld>=8?(t&(S-1))>>(ld-8):(t&(S-1))<<(8-ld))}
 for(y=0;y<ST;y++){t=gy0+y-(ly0<<ld);var r=(t>>ld)*(c+1),uy=glatt(ld>=8?(t&(S-1))>>(ld-8):(t&(S-1))<<(8-ld)),p=y*ST;
  for(x=0;x<ST;x++){var e=r+sx[x],ux=su[x],o1=ecken[e]*(256-ux)+ecken[e+1]*ux,o2=ecken[e+c+1]*(256-ux)+ecken[e+c+2]*ux,w=(o1*(256-uy)+o2*uy)>>16;
   if(setzen)ziel[p+x]=w*gew;else ziel[p+x]+=w*gew}}}
var O_FEIN=[[9,72],[8,56],[7,44],[6,34],[5,24],[4,16],[3,10]];                                       // Summe 256
var wx=new Int32Array(ST*3), wy=new Int32Array(ST*3), zeile=new Int32Array(ST*3), kanal=[new Int32Array(FELDER),new Int32Array(FELDER),new Int32Array(FELDER),new Int32Array(FELDER)];
var HW=[0,1,2,3,5,7], UFER=6, SUMPF_W=14;                                                                        // halbe Flussbreite je Klasse, Uferzone in Feldern
var segs=new Int32Array(5*5*8*5), nSeg=0, teiche=new Int32Array(5*3), nTeich=0;
var wurzel=(function(){var t=new Uint8Array(1024);for(var i=0;i<1024;i++){var r=0;while((r+1)*(r+1)<=i)r++;t[i]=r}return t})();

function X6(X,dx,dy,k){return X[((dy+2)*5+dx+2)*9+k]}
// Punkt, an dem ein Fluss die Kante einer Zelle quert: hängt nur von der Kante ab, beide Nachbarn rechnen denselben Punkt.
function kante(seed,zx,zy,q){var kx=um(q===0?zx+1:zx),ky=q===1?zy+1:zy,h=256+mix(seed^Math.imul(kx,0x632be5ab)^Math.imul(ky,0x7ed55d16)^((q&1)?0x51ed27:0x2c1b3c))%513;
 return q===0?[ZF,h]:q===2?[0,h]:q===1?[h,ZF]:[h,0]}
function bogen(x0,y0,x2,y2,kl,sd,ox,oy){var h=mix(sd),x1=((x0+x2)>>1)+(h%321)-160,y1=((y0+y2)>>1)+((h>>>9)%321)-160;
 x1=x1<32?32:x1>ZF-32?ZF-32:x1;y1=y1<32?32:y1>ZF-32?ZF-32:y1;
 var px=x0,py=y0,rand=HW[kl]+UFER+1;
 for(var i=1;i<=8;i++){var a=(8-i)*(8-i),b=2*i*(8-i),c=i*i,qx=(a*x0+b*x1+c*x2)>>6,qy=(a*y0+b*y1+c*y2)>>6;
  var ax=px+ox,ay=py+oy,bx=qx+ox,by=qy+oy;                                                            // in Feldern relativ zum Stück
  if(!((ax<-rand&&bx<-rand)||(ay<-rand&&by<-rand)||(ax>ST+rand&&bx>ST+rand)||(ay>ST+rand&&by>ST+rand))){var p=nSeg*5;segs[p]=ax;segs[p+1]=ay;segs[p+2]=bx;segs[p+3]=by;segs[p+4]=kl;nSeg++}
  px=qx;py=qy}}
// Flussläufe einer Zelle (dx, dy relativ zur Zelle des Stücks) einsammeln, soweit sie das Stück berühren
function zelleFluss(X,seed,zx,zy,dx,dy,cx,cy){var Zx=zx+dx,Zy=zy+dy,k=X6(X,dx,dy,4),d=X6(X,dx,dy,5),wasser=X6(X,dx,dy,0)<0,q,ein=0;
 var ox=Zx*ZF-cx*ST,oy=Zy*ZF-cy*ST,hz=mix(seed^Math.imul(um(Zx),0x1b873593)^Math.imul(Zy,0xcc9e2d51)),jx=362+hz%301,jy=362+(hz>>>10)%301;
 if(!wasser&&!k)return;
 for(q=0;q<4;q++){var nk=X6(X,dx+DX[q],dy+DY[q],4);if(!nk||X6(X,dx+DX[q],dy+DY[q],5)!==(q^2))continue;
  var P=kante(seed,Zx,Zy,q);bogen(P[0],P[1],jx,jy,nk,hz+q+1,ox,oy);ein++}
 if(wasser){if(ein&&nTeich<5){teiche[nTeich*3]=jx+ox;teiche[nTeich*3+1]=jy+oy;teiche[nTeich*3+2]=30;nTeich++}return}
 if(d<4){P=kante(seed,Zx,Zy,d);bogen(jx,jy,P[0],P[1],k,hz+7,ox,oy)}}

function gelaende(a){var d=a.daten,buf=d.buffer,H=new Uint16Array(buf,0,FELDER),B=new Uint8Array(buf,FELDER*2,FELDER),W=new Uint8Array(buf,FELDER*3,FELDER),X=new Int16Array(buf,ST_BYTES,AUS);
 var seed=a.seed>>>0,cx=a.cx,cy=a.cy,zx=cx>>4,zy=cy>>4,gx0=cx*ST,gy0=cy*ST,i,x,y,k,u;
 // geglättete Erdwerte (Höhe, Feuchte, Wärme, Wasserart): weicher Übergang über 3 × 3 Zellen, an Zellgrenzen stetig
 for(x=0;x<ST;x++){u=(cx&15)*ST+x;wx[x*3]=((ZF-u)*(ZF-u))>>6;wx[x*3+2]=(u*u)>>6;wx[x*3+1]=32768-wx[x*3]-wx[x*3+2];
  u=(cy&15)*ST+x;wy[x*3]=((ZF-u)*(ZF-u))>>6;wy[x*3+2]=(u*u)>>6;wy[x*3+1]=32768-wy[x*3]-wy[x*3+2]}
 for(k=0;k<4;k++){var K=kanal[k];
  for(var r=0;r<3;r++){var v0=X6(X,-1,r-1,k),v1=X6(X,0,r-1,k),v2=X6(X,1,r-1,k);for(x=0;x<ST;x++)zeile[r*ST+x]=(wx[x*3]*v0+wx[x*3+1]*v1+wx[x*3+2]*v2)>>15}
  for(y=0;y<ST;y++){var a0=wy[y*3],a1=wy[y*3+1],a2=wy[y*3+2];for(x=0;x<ST;x++)K[y*ST+x]=(a0*zeile[x]+a1*zeile[ST+x]+a2*zeile[2*ST+x])>>15}}
 // feines Rauschen über Weltkoordinaten
 for(i=0;i<O_FEIN.length;i++)stufe(seed,i+20,O_FEIN[i][0],O_FEIN[i][1],gx0,gy0,hoch,i===0);
 stufe(seed^0x5f356495,40,4,256,gx0,gy0,fein,true);
 // W1c Eis: 0 = weit weg vom Eis (kostet nichts), 1 = an der Eiskante (Eiswert auf dem groben Raster), 2 = tief im Eis (Biomkanäle und Flüsse entfallen)
 var sI=eisSeed(seed),pol=gy0+(ST>>1)>=HF>>1?1:0,dMin=pol?HF-gy0-ST:gy0,eb=eisBreite(sI,gx0+(ST>>1),pol),eisArt=dMin-eb>EIS_MAX+400&&dMin>=3072?0:eb-dMin-ST>EIS_MAX+400?2:1,gi,gj;
 if(eisArt===1)for(gj=0;gj<GN;gj++)for(gi=0;gi<GN;gi++)EP[gj*GN+gi]=eis(sI,gx0+gi*GRB,gy0+gj*GRB);
 // Flussläufe der eigenen Zelle und der Nachbarzelle hinter einer nahen Kante
 nSeg=0;nTeich=0;
 if(eisArt<2){zelleFluss(X,seed,zx,zy,0,0,cx,cy);
  if((cx&15)===0)zelleFluss(X,seed,zx,zy,-1,0,cx,cy);if((cx&15)===15)zelleFluss(X,seed,zx,zy,1,0,cx,cy);
  if((cy&15)===0)zelleFluss(X,seed,zx,zy,0,-1,cx,cy);if((cy&15)===15)zelleFluss(X,seed,zx,zy,0,1,cx,cy)}
 var KE=kanal[0],KF=kanal[1],KT=kanal[2],KS=kanal[3],PI=FK;
 // W1a+: Kanalwerte auf dem groben Raster (alle 8 Felder), Fransen
 var zonig=N2B&&X6(X,0,0,8)!==255;                                                                    // N2b: Zuschlag der Klimazonen auf dem groben Raster (statt Neigung je Feld)
 if(eisArt<2)for(gj=0;gj<GN;gj++)for(gi=0;gi<GN;gi++){var gq=(gj*GN+gi)*KP;punkt(seed,gx0+gi*GRB,gy0+gj*GRB,GP,gq);
  if(zonig){zonenX(X,seed,zx,zy,gx0+gi*GRB,gy0+gj*GRB,VZ);for(k=0;k<KP;k++)GP[gq+k]+=VZ[k];GZ[gj*GN+gi]=ZU}}
 for(y=0;y<ST;y++)for(x=0;x<ST;x++){i=y*ST+x;var b=KE[i],amp=b>0?48+((b*3)>>3):48+((-b)>>3),h=b+(((hoch[i]-32640)*amp)>>15),fl=0,best=255;
  if(nSeg){best=1<<30;
   for(k=0;k<nSeg;k++){var p=k*5,x1=segs[p],y1=segs[p+1],vx=segs[p+2]-x1,vy=segs[p+3]-y1,wxx=x-x1,wyy=y-y1,t=wxx*vx+wyy*vy,vv=vx*vx+vy*vy,d2=wxx*wxx+wyy*wyy;
    if(t>0){if(t>=vv){wxx=x-segs[p+2];wyy=y-segs[p+3];d2=wxx*wxx+wyy*wyy}else d2-=Math.floor(t*t/vv)}
    var hw=HW[segs[p+4]],gr=(hw+UFER+SUMPF_W)*(hw+UFER+SUMPF_W);if(d2<gr){var ab=wurzel[d2]-hw;if(ab<best)best=ab}}
   if(best>255)best=255}
  var fx=x&7,fy=y&7,qe=(y>>3)*GN+(x>>3),q=qe*KP,w00=(8-fx)*(8-fy),w10=fx*(8-fy),w01=(8-fx)*fy,w11=fx*fy,q2=q+GN*KP;
  // W1c Eis: Kante mit dem feinen Rauschen ausgefranst; Eis liegt als flache Decke knapp über dem Wasser (Land darunter bleibt, ohne Hügel der Biome), Biom Schnee
  if(eisArt===2||(eisArt===1&&((EP[qe]*w00+EP[qe+1]*w10+EP[qe+GN]*w01+EP[qe+GN+1]*w11)>>6)+(((fein[i]-32640)*EIS_FEIN)>>15)>0)){
   var es=40+(((hoch[i]-32640)*100)>>15);if(h<es)h=es;h+=MEER;H[i]=h>65535?65535:h;B[i]=9;continue}
  // Biom aus den Kanälen (weich zwischen den Rasterpunkten), Großklima, Fransen, Ufer
  for(k=0;k<KP;k++)PI[k]=(GP[q+k]*w00+GP[q+KP+k]*w10+GP[q2+k]*w01+GP[q2+KP+k]*w11)>>6;
  if(!zonig)neigung(KT[i],KF[i],b,VN);else ZU=GZ[qe+(fx+((fein[i]-32640)>>13)>=4?1:0)+(fy+((hoch[i]-32640)>>13)>=4?GN:0)];   // N2c: Zone der nächsten Rasterecke, Grenze ausgefranst
  var bk=klasse(PI,0,zonig?V0:VN,(fein[i]-32640)>>6,(hoch[i]-32640)>>6,best<UFER+SUMPF_W?(UFER+SUMPF_W-best)*48:0);
  // Gelände folgt dem Biom: Hochland hebt zu Hügeln und Gipfeln, Sumpf senkt zu Senken; an der Küste ausgeblendet
  if(b>0){var fk=b>=320?256:(b<<8)/320|0,hu=KL.d>-M_HUEGEL?KL.d+M_HUEGEL:0,se=KL.s>-M_SENKE?KL.s+M_SENKE:0,auf=(hu*hu)>>13,ab2=(se*se)>>14;
   if(ab2>h-48)ab2=h-48;if(ab2<0)ab2=0;h+=((auf-ab2)*fk)>>8}
  if(best<UFER&&h>=0){var ob=b-24;if(ob>h-8)ob=h-8;if(ob<4)ob=4;                                      // Wasserspiegel: glatte Erdhöhe, nie über dem Gelände (auch genau auf Meereshöhe: sonst reißt der Fluss an flachen Küsten ab)
   if(best<=0){h=ob;fl=1}else{var ufer=ob+best*20;if(ufer<h)h=((h*best+ufer*(UFER-best))/UFER)|0}}
  for(k=0;k<nTeich;k++){var tx=x-teiche[k*3],ty=y-teiche[k*3+1],tr=teiche[k*3+2];if(tx*tx+ty*ty<tr*tr&&h>-8){h=-8;fl=0}}   // Mündung: der Fluss endet sichtbar im Wasser
  var bi;
  if(fl)bi=10;
  else if(h<0)bi=KS[i]>127?11:h<-600?0:1;
  else if(h<24&&KS[i]<=127)bi=2;
  else{bi=bk;if(bi===11)h-=16}                                                                        // Teich: Spiegel ein Feld tiefer
  h+=MEER;H[i]=h<0?0:h>65535?65535:h;B[i]=bi}
 // W1b: Straßen, Brücken, Stege, Ortsplatz (nur wenn die Zelle oder die Nachbarzelle hinter einer nahen Kante etwas davon hat)
 for(i=0;i<FELDER;i++)W[i]=0;nStempel=0;pTyp=0;
 wegZelle(X,seed,zx,zy,0,0,cx,cy,W);
 if((cx&15)===0)wegZelle(X,seed,zx,zy,-1,0,cx,cy,W);if((cx&15)===15)wegZelle(X,seed,zx,zy,1,0,cx,cy,W);
 if((cy&15)===0)wegZelle(X,seed,zx,zy,0,-1,cx,cy,W);if((cy&15)===15)wegZelle(X,seed,zx,zy,0,1,cx,cy,W);
 if(nStempel||pTyp)wegFertig(X,H,B,W);
 return d}

// ── W1a+ Biome gemischt: jede Gegend enthält alle Land-Biome als Flecken, das Großklima verschiebt die Anteile nur leicht ──
// Sechs Kanäle (Wüste, Steppe, Wald, Sumpf, Tundra, Hochland) aus Rauschen in vier Größen (rund 30 bis 600 Felder), jede Stufe um einen eigenen
// Winkel gedreht und das Ganze verzerrt (keine Gitter, keine Kacheln, nichts wiederholt sich). Gewinner je Feld = Biom; Hochland trägt Fels,
// im Kern Schnee, und hebt das Gelände zu Hügeln und kleinen Gipfeln; Sumpf senkt es zu Senken und liebt Flussufer; ein siebter Kanal legt
// Teiche und Seen ins Land. Gerechnet auf einem groben Raster alle 4 Felder (17 × 17 Punkte über Weltkoordinaten, darum nahtlos), dazwischen
// weich verbunden, die Ränder mit feinem Rauschen ausgefranst.
var KAN=[3,4,5,6,7,8], KN=6, KP=KN+2, GRB=8, GN=ST/GRB+1;   // N2b: KP + 1 (Platz 7: Zuschlag der Schneeschwelle)
// W1c: statt frei gedrehter Gitter (passen nicht an die Naht) je Stufe sieben Gitter mit verschiedenen Winkeln, die alle an die Naht passen (pn oben).
// Je Kanal ein anderes Gitter: nichts liegt aufeinander. Gitterabstand in Feldern rund 570, 240, 113, 47.
var G_K=[[gf(512,256),gf(256,-512),gf(400,400),gf(192,576),gf(576,-192),gf(240,480),gf(384,-384)],
         [gf(144,192),gf(224,-32),gf(80,240),gf(192,-144),gf(160,160),gf(32,-224),gf(240,80)],
         [gf(80,-80),gf(16,112),gf(96,72),gf(48,-96),gf(112,-16),gf(72,96),gf(96,48)],
         [gf(45,15),gf(20,-40),gf(32,32),gf(15,45),gf(40,20),gf(16,-48),gf(48,-16)]];
var G_VX=[gf(256,256),gf(80,40)], G_VY=[gf(160,-320),gf(30,-90)], G_TEICH=[gf(80,160),gf(36,-48)], G_WEG=[gf(120,60),gf(64,-128),gf(32,16),gf(12,-36)];   // Verzerrung (rund 360 und 92 Felder), Teiche (179, 60), Straßenversatz (137, 37)
var M_OKT=[0,32,128,96], H_OKT=[0,0,104,152];   // Gewicht je Stufe (Summe 256); Hochland: mehr kleine Hügel, gleichmäßiger verteilt
var M_SCHNEE=1700, H_GRUND=800, M_HUEGEL=900, M_SENKE=700, M_TEICH=11900;                                          // Schwellen (Rauscheinheit = 64)
// Kanalwerte an einem Weltpunkt (Feld x, y) nach P[p..p+6]: 6 Biome und Teiche, je 0..16320
function punkt(seed,x,y,P,p){var c,k,s;
 var X=x+(((pn(seed,50,x,y,G_VX[0])-32640)*96)>>15)+(((pn(seed,51,x,y,G_VX[1])-32640)*30)>>15),
     Y=y+(((pn(seed,52,x,y,G_VY[0])-32640)*96)>>15)+(((pn(seed,53,x,y,G_VY[1])-32640)*30)>>15);
 for(c=0;c<KN;c++){var O=c===5?H_OKT:M_OKT;s=0;for(k=0;k<4;k++)if(O[k])s+=pn(seed,60+c*4+k,X,Y,G_K[k][(c+k*2)%7])*O[k];P[p+c]=s>>10}
 P[p+KN]=(pn(seed,90,X,Y,G_TEICH[0])*150+pn(seed,91,X,Y,G_TEICH[1])*106)>>10;P[p+KN+1]=0}
// Großklima → leichte Verschiebung je Kanal (höchstens ±4 Rauscheinheiten). t Wärme, f Feuchte 0..255, e Erdhöhe in 1/16 Feld.
function kl(v){return v<-280?-280:v>280?280:v|0}
function neigung(t,f,e,V){ZU=255;V[0]=kl((t-140)*2+(110-f)*2);V[1]=kl(60-Math.abs(f-110)*3-Math.abs(t-150)*2);V[2]=kl((f-110)*4-Math.abs(t-140)*2+80);
 V[3]=kl((f-140)*2+(e<800?60:-((e-800)>>3)));V[4]=kl((100-t)*3);V[5]=H_GRUND+(e>3800?120:0)}
// vorherrschendes Biom für die Weltkarte (nur Neigung, ohne Flecken)
var VN=new Int32Array(KN);
function herrscht(e,t,f){neigung(t,f,e,VN);VN[5]-=H_GRUND;var b=0;for(var c=1;c<KN;c++)if(VN[c]>VN[b])b=c;return b===5?(t<60||e>6000?9:8):KAN[b]}
var GP=new Int32Array(GN*GN*KP), GZ=new Uint8Array(GN*GN), FK=new Int32Array(FELDER*2), EP=new Int32Array(GN*GN);
// Anteile der Biome in einem Erdfeld schätzen (Weltansicht beim Antippen): 24 × 24 Stichproben, gleiche Regel wie im Kartenstück ohne Flüsse und Fransen
function anteile(seed,A,zx,zy){var Z=new Int32Array(18),P=new Int32Array(KP),V=new Int32Array(KP),i=zy*GW+zx,n=0;
 if(A.bio[i]<2||A.bio[i]===11||A.bio[i]===12){Z[A.bio[i]]=1;return Z}
 var zg=N2B&&A.zon;if(!zg)neigung(A.tmp[i],A.feu[i],A.E[i],V);
 for(var y=0;y<24;y++)for(var x=0;x<24;x++){var fx=zx*ZF+x*42+21,fy=zy*ZF+y*42+21;if(zg)zonenV(A,seed>>>0,fx,fy,V);punkt(seed>>>0,fx,fy,P,0);Z[klasse(P,0,V,0,0,0)]++;n++}
 return Z}
// Klasse aus Kanalwerten (dazu Großklima V, Fransen j1/j2, Uferbonus für Sumpf). Setzt KL.d (Vorsprung Hochland) und KL.s (Vorsprung Sumpf).
var KL={d:0,s:0}, KV=new Int32Array(KN), JA=[2,1,-1,-2,-1,1], JB=[0,2,2,0,-2,-2];                  // Fransen in sechs Richtungen: jede Grenze franst aus
function klasse(P,p,V,j1,j2,ufer){var c,b=0,v,oh=-1e9,os=-1e9;
 for(c=0;c<KN;c++){v=P[p+c]+V[c]+(c===3?ufer:0);if(c!==5&&v>oh)oh=v;if(c!==3&&v>os)os=v;KV[c]=v+((JA[c]*j1+JB[c]*j2)>>1);if(KV[c]>KV[b])b=c}   // Vorsprünge ohne Fransen: Hügel und Schnee bleiben glatt
 KV[5]=P[p+5]+V[5];KV[3]=P[p+3]+V[3]+ufer;
 KL.d=KV[5]-oh;KL.s=KV[3]-os;
 if(b===5)return KL.d>M_SCHNEE+(P[p+KN+1]|0)+(V[KN+1]|0)?9:8;                                           // Schnee auf den Kuppen (N2b: Schwelle je Zone)
 if(P[p+KN]+(V[KN]|0)+j1-(KL.d>-M_HUEGEL?KL.d+M_HUEGEL:0)+(KL.s>0?KL.s>>2:0)>M_TEICH)return 11;               // Teiche und Seen, nie am Hang, gern im Sumpf
 return unter(KAN[b])}

// ── N2b Kartenstücke folgen den Klimazonen (N2a) ──
// Die Flecken aus W1a+ bleiben, aber statt der leichten Neigung (±4 Rauscheinheiten) bekommt jeder Kanal einen kräftigen Zuschlag nach der Klimazone:
// das Biom der Zone macht in einem Ausschnitt von 1.024 Feldern rund 60–85 % aus, dazu 1–3 passende Nachbarbiome, alles andere ist gesperrt.
// Bis N2c gibt es im Kartenstück nur die alten Biome (Entscheidung Thomas): Nadel-, Laub- und Regenwald → Wald, Grasland, Steppe, Savanne und
// Mittelmeer-Buschland → Steppe mit wechselnden Nachbarn, Mangroven → Sumpf, Gebirge → Fels mit Schneekuppen. Übergänge: die Zonen der vier nächsten
// Erdzellen (Mittelpunkte) werden weich gemischt, gestaucht auf die mittlere Hälfte zwischen zwei Mittelpunkten (rund 8 Kartenstücke) und mit weitem
// Rauschen verzerrt, damit die Grenzen nicht dem Erdraster folgen. Wasser und Eis nehmen die Zone der ersten Landnachbarzelle (zfuell, nur Erdraster:
// beide Seiten einer Stücknaht rechnen dasselbe). Kosten: 289 Zuschläge je Kartenstück auf dem groben Raster statt 4.096 Neigungen je Feld.
// Orte, Straßen und das grobe Biom des Erdrasters (bio) bleiben unverändert (Entscheidung Thomas). Notausschalter: ?n2b=0 rechnet wie vor N2b.
var N2B=!(root.location&&/[?&]n2b=0/.test(root.location.search||''));
// ── N2c Neue Biome (Grasland 13, Savanne 14, Mittelmeer-Buschland 15, Regenwald 16, Mangroven 17), Entscheidungen Thomas 20.11.2026 ──
// Kartenstück: die Fleckenrechnung aus N2b bleibt, der Gewinner-Kanal Steppe, Wald oder Sumpf wird je nach der stärksten Zone an der Stelle zur
// Unterart (Steppe → Grasland, Savanne, Mittelmeer; Wald → Regenwald; Sumpf → Mangroven). Die Zone kommt vom groben Raster, die Grenze ist mit dem
// feinen Rauschen ausgefranst. Erdraster: das Land-Biom jeder Zelle ist das Hauptbiom ihrer Zone (Z_BIOM), darum folgen Orte und Straßen den Zonen.
// Notausschalter ?n2c=0 (oder ?n2b=0): rechnet wie N2b.
var N2C=N2B&&!(root.location&&/[?&]n2c=0/.test(root.location.search||''));
// Unterart je Zone: [Steppe-Kanal, Wald-Kanal, Sumpf-Kanal] → Biom
var Z_UNTER=[[4,5,6],[4,5,6],[4,5,6],[4,5,6],[4,5,6],
 [13,5,6],      // 5 Laubwald: Lichtungen sind Grasland
 [13,5,6],      // 6 Grasland
 [4,5,6],       // 7 Steppe
 [15,5,6],      // 8 Mittelmeer-Buschland (Wald bleibt Wald: Pinien, Eichen)
 [4,5,6],       // 9 Wüste
 [14,16,6],     // 10 Savanne: Galeriewald ist Regenwald
 [14,16,6],     // 11 Regenwald
 [13,5,6],      // 12 Sumpf: nasse Wiesen sind Grasland
 [14,16,17],    // 13 Mangroven
 [4,5,6]];      // 14 Gebirge
// Hauptbiom je Zone für das Erdraster (0 Wasser bleibt, wird nie gesetzt; 1 Eis an Land = Schnee; Gebirge = Fels, Schnee bleibt Schnee)
var Z_BIOM=[5,9,9,7,5,5,13,4,15,3,14,16,6,17,8];
// Erdraster-Biom aus Zone z und dem bisherigen Klimabiom bi: Hauptbiom der Zone; Fels und Schnee (Höhen) bleiben, wo die Zone Hochland kennt,
// Sumpf bleibt, wo die Zone Sumpf kennt. So behalten Orte und Straßen die Abwechslung im Gelände (keine Schneisen durch einheitliche Zonen).
function zbio(z,bi){if((bi===8||bi===9)&&ZV[z][5]>-9000)return bi;if(bi===6&&ZV[z][3]>-9000)return Z_UNTER[z][2];return Z_BIOM[z]}
var ZU=255;                    // stärkste Zone an der zuletzt gerechneten Stelle (zMisch), 255 = keine Unterart
function unter(k){if(ZU===255||!N2C)return k;var u=Z_UNTER[ZU];return k===4?u[0]:k===5?u[1]:k===6?u[2]:k}
var ZS_=-9000;                 // gesperrt
// Zuschlag je Zone und Kanal [Wüste, Steppe, Wald, Sumpf, Tundra, Hochland] in Rauscheinheiten (Hochland samt Grundwert, früher H_GRUND = 800)
// Zuschlag je Zone [Wüste, Steppe, Wald, Sumpf, Tundra, Hochland, Teiche, Schneeschwelle] in Rauscheinheiten (Hochland samt Grundwert, früher H_GRUND = 800;
// Teiche: + mehr Teiche und Seen; Schneeschwelle: + seltener Schnee auf den Kuppen). Vorschlagswerte, eingestellt auf 60–85 % Zonenbiom.
var ZV=[[0,0,0,0,0,800,0,0],[0,0,0,0,0,800,0,0],                         // 0 Wasser, 1 Eis (kommen nur über zfuell vor, Ersatz)
 [ZS_,ZS_,ZS_,ZS_,0,1400,-800,-500],      // 2 Schnee: Schneefelder auf Kuppen, dazwischen Tundra
 [ZS_,ZS_,-4500,-3500,0,-3800,0,0],         // 3 Tundra: Tundra, Flecken Wald und Moor, wenig Fels
 [ZS_,ZS_,0,-4000,-3500,-3700,0,0],         // 4 Nadelwald: Wald, Moore, Tundra
 [ZS_,-3500,0,-4000,ZS_,-3800,0,4000],      // 5 Laubwald: Wald, Lichtungen, Sumpf
 [ZS_,0,-2500,-4500,ZS_,-4300,0,4000],      // 6 Grasland: Steppe, Haine
 [-2800,0,-5500,ZS_,ZS_,-4300,-300,4000],  // 7 Steppe: Steppe, Wüstenflecken, Fels
 [-5500,0,-3500,ZS_,ZS_,-2800,-300,4000],  // 8 Mittelmeer-Buschland: Steppe, Wald, felsige Hügel
 [0,-3000,ZS_,ZS_,ZS_,-4300,-900,4000],  // 9 Wüste: Wüste, Steppe, Fels, selten Oasen
 [-4000,0,-3250,ZS_,ZS_,-5300,-200,4000],   // 10 Savanne: Steppe, Trockenflecken, Galeriewald
 [ZS_,ZS_,0,-2200,ZS_,-6300,0,4000],       // 11 Regenwald: Wald, Sumpf
 [ZS_,-5500,-2250,0,ZS_,ZS_,400,4000],    // 12 Sumpf: Sumpf, Wald, nasse Wiesen, viele Tümpel
 [ZS_,ZS_,-1250,0,ZS_,ZS_,300,4000],      // 13 Mangroven: Sumpf, Wald
 [ZS_,ZS_,-2500,ZS_,-4500,3000,-600,5000]];   // 14 Gebirge: Fels und Schnee, Bergwald, Tundra
var G_ZW=[gf(400,400),gf(192,576)], ZW_A=320, ZW_S=2;   // Verzerrung (rund 566 und 607 Felder, ±320 Felder), Stauchung der Übergänge
var VZ=new Int32Array(KP), V0=new Int32Array(KP), ZL=new Int32Array(4);
// Zone einer Erdzelle für die Mischung: Land wie N2a, Wasser und Eis die erste Landnachbarzelle (feste Reihenfolge), sonst Grasland. 255 = keine Zonen.
function zfuell(A,i){if(!A.zon)return 255;var z=A.zon[i];if(z>=2)return z;var x=i%GW,y=(i/GW)|0;
 for(var r=0;r<8;r++){var Y=y+ZFY[r];if(Y<0||Y>=GH)continue;var w=A.zon[Y*GW+um(x+ZFX[r])];if(w>=2)return w}return 6}
var ZFX=[1,0,-1,0,1,-1,-1,1], ZFY=[0,1,0,-1,1,1,-1,-1];
// Lage eines Weltpunkts zwischen den Zellmittelpunkten: ZL = linke obere Zelle (x, y) und gestauchte Anteile u, v (0..1024)
function zLage(seed,fx,fy){var gx=fx+(((pn(seed,56,fx,fy,G_ZW[0])-32640)*ZW_A)>>15)-512,gy=fy+(((pn(seed,57,fx,fy,G_ZW[1])-32640)*ZW_A)>>15)-512,u=gx&1023,v=gy&1023;
 u=((u-512)*ZW_S)+512;v=((v-512)*ZW_S)+512;ZL[0]=gx>>10;ZL[1]=gy>>10;ZL[2]=u<0?0:u>1024?1024:u;ZL[3]=v<0?0:v>1024?1024:v}
function zMisch(a,b,c,d,V){var u=ZL[2],v=ZL[3],A0=ZV[a],B0=ZV[b],C0=ZV[c],D0=ZV[d],w00=((1024-u)*(1024-v))>>10,w10=(u*(1024-v))>>10,w01=((1024-u)*v)>>10,w11=1024-w00-w10-w01;
 for(var k=0;k<KP;k++)V[k]=(A0[k]*w00+B0[k]*w10+C0[k]*w01+D0[k]*w11)>>10;
 var wa=w00+(b===a?w10:0)+(c===a?w01:0)+(d===a?w11:0),wb=w10+(c===b?w01:0)+(d===b?w11:0),wc=w01+(d===c?w11:0);ZU=a;              // N2c: stärkste Zone
 if(wb>wa){ZU=b;wa=wb}if(wc>wa){ZU=c;wa=wc}if(w11>wa&&d!==a&&d!==b&&d!==c)ZU=d}
// Zuschlag an Feld (fx, fy) aus dem Erdraster (Fernbild, Startplatz, Weltansicht) bzw. aus dem Ausschnitt des Kartenstücks (gleiches Ergebnis)
function zIdx(x,y){return(y<0?0:y>=GH?GH-1:y)*GW+um(x)}
function zonenV(A,seed,fx,fy,V){zLage(seed,fx,fy);var x=ZL[0],y=ZL[1];zMisch(zfuell(A,zIdx(x,y)),zfuell(A,zIdx(x+1,y)),zfuell(A,zIdx(x,y+1)),zfuell(A,zIdx(x+1,y+1)),V)}
function zonenX(X,seed,zx,zy,fx,fy,V){zLage(seed,fx,fy);var x=ZL[0]-zx,y=ZL[1]-zy;
 if(x>GW>>1)x-=GW;else if(x<-(GW>>1))x+=GW;                                                              // über die Naht
 zMisch(X6(X,x,y,8),X6(X,x+1,y,8),X6(X,x,y+1,8),X6(X,x+1,y+1,8),V)}

// ── W1b Orte, Häfen, Straßen, Seewege ──
// Ortsart je Zelle (ort, untere 4 Bit): 1 Dorf, 2 Stadt, 3 Hafendorf, 4 Hafenstadt; obere 4 Bit: Ausgänge des Seewegs (Ost, Süd, West, Nord).
// Straße je Zelle (weg): Bit 0–3 Ausgänge, Bit 4–5 Klasse (1 Pfad, 2 Straße), Bit 6 Fähre über einen Binnensee.
// Netz: Kopf (Orte, Verbindungen, Landmassen, Dichte), Orte (Zelle | Art << 24), Verbindungen (Ort a, Ort b, Länge, Art: 1 Pfad, 2 Straße, +4 mit Fähre, 8 Seeweg).
// Vorschlagswerte (Thomas sieht sie in der Weltansicht): Dichte = [Blockgröße in Zellen, Anteil von 256, Hafenblock, Hafenanteil von 256]
var DICHTE=[[5,180,12,110],[3,190,8,130],[2,256,5,170]], QUER=90;                  // QUER: Anteil der Querverbindungen (von 256)
var B_STRAF=[0,0,10,40,0,5,45,30,120,255,0,0,255,0,5,5,30,50], B_WEG=[0,0,4,6,0,3,14,4,16,40,0,0,40,0,2,3,10,16];   // Biom: Abzug als Siedlungsplatz, Aufschlag als Wegstück (N2c: 13–17 Vorschlag wie die Verwandten)
var JE=new Int32Array(9), JP=new Int32Array(3), EIMER=new Int32Array(256);
// Geglättete Erdhöhe an einem Punkt der Zelle (px, py in 0..1023), aus den 3 × 3 Erdhöhen in JE: dieselbe Formel wie im Kartenstück
function glattE(px,py){var a0=((ZF-px)*(ZF-px))>>6,a2=(px*px)>>6,a1=32768-a0-a2,b0=((ZF-py)*(ZF-py))>>6,b2=(py*py)>>6,b1=32768-b0-b2;
 return(b0*((a0*JE[0]+a1*JE[1]+a2*JE[2])>>15)+b1*((a0*JE[3]+a1*JE[4]+a2*JE[5])>>15)+b2*((a0*JE[6]+a1*JE[7]+a2*JE[8])>>15))>>15}
// Mittelpunkt einer Zelle für Ort und Straßenknoten: von fünf Punkten aus dem Seed der mit dem höchsten (trockensten) Grund. JE muss gefüllt sein.
function jWahl(seed,Zx,Zy){var h=mix(seed^Math.imul(um(Zx),0x2f0b4a71)^Math.imul(Zy,0x6c8e9cf5)),best=-1e9;
 for(var k=0;k<5;k++){var px=220+h%585;h=mix(h+k+1);var py=220+h%585;h=mix(h+0x9e37);var b=glattE(px,py);if(b>best){best=b;JP[0]=px;JP[1]=py}}
 JP[2]=best}
function jeFuell(E,x,y){var p=0;for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){var Y=y+dy;JE[p++]=E[(Y<0?0:Y>=GH?GH-1:Y)*GW+um(x+dx)]}}   // wie ausschnitt: über die Naht, am Pol die Polreihe
// Lage des Orts oder Straßenknotens einer Zelle in Feldern der Welt (Weltansicht, Tests)
function ortPunkt(seed,A,zx,zy){jeFuell(A.E,zx,zy);jWahl(seed>>>0,zx,zy);var x=zx*ZF+JP[0],y=zy*ZF+JP[1];versch(seed>>>0,x,y);return[x+VS[0],y+VS[1],JP[2]]}

// Teil „Orte und Häfen“: Landmassen (Land samt Binnenseen, über die Naht), je Landmasse ein Pflichthafen, weitere Häfen an der Küste, Dörfer und Städte je Gegend.
// W1c: Eis gehört zu keiner Landmasse; kein Ort und kein Hafen auf dem Eis oder näher als zwei Zellen daran (das Eis franst im Kartenstück weiter aus).
function teilOrte(A,seed,dichte){var E=A.E,bio=A.bio,flu=A.flu,dir=A.dir,ort=A.ort,weg=A.weg,lm=A.lm,q=A.hp,wert=A.dst,hafen=A.bes,bestZ=A.tv,bestW=A.tc,kopf=A.kopf,orte=A.orte;
 var D=DICHTE[dichte]||DICHTE[1],i,x,y,r,j,n,k,c,L=0,nO=0,nx,ny,s,bx,by;
 for(i=0;i<N;i++){ort[i]=0;weg[i]=0;lm[i]=0;wert[i]=0;hafen[i]=0}
 for(i=0;i<N;i++){if(bio[i]<2||bio[i]===12||lm[i])continue;if(L>=65535)break;L++;n=0;k=0;q[n++]=i;lm[i]=L;bestW[L]=0;bestZ[L]=0;
  while(k<n){c=q[k++];for(r=0;r<4;r++){j=nb(c,r);if(j>=0&&bio[j]>=2&&bio[j]!==12&&!lm[j]){lm[j]=L;q[n++]=j}}}}
 function eisNah(x,y){if(y>=EIS_ZONE&&y<GH-EIS_ZONE)return false;for(var dy=-2;dy<=2;dy++)for(var dx=-2;dx<=2;dx++){var Y=y+dy;if(Y<0||Y>=GH||bio[Y*GW+um(x+dx)]===12)return true}return false}
 // Eignung je Landzelle: wert = Siedlungsplatz, hafen = Hafenplatz (ab 1000: fester Grund)
 for(i=0;i<N;i++){var b=bio[i];if(b<2||b===11||b===12||!lm[i])continue;x=i%GW;y=(i/GW)|0;if(eisNah(x,y))continue;var kueste=0,see=0,muend=0;
  for(r=0;r<4;r++){j=nb(i,r);if(j<0)continue;if(bio[j]<2){kueste=1;if(flu[i]&&(dir[i]&7)===r)muend=1}else if(bio[j]===11)see=1}
  jeFuell(E,x,y);jWahl(seed,x,y);var bj=JP[2],h=mix(seed^Math.imul(i+1,0x9e3779b1)),fl=flu[i]>4?4:flu[i];
  s=300+(h&255)+fl*25+(kueste?50:0)+(see?20:0)+((bj<0?0:bj>400?400:bj)>>3)-B_STRAF[b]-(E[i]>>6);
  wert[i]=b===9||E[i]>5000||bj<48?0:s<1?1:s;
  if(kueste){s=300+((h>>>8)&127)+(muend?120:0)+fl*10+(((bj<-400?-400:bj>400?400:bj)+400)>>2)+(bj>=16?1000:0);hafen[i]=s;
   if(s>bestW[lm[i]]){bestW[lm[i]]=s;bestZ[lm[i]]=i}}}
 for(i=0;i<N;i++)if(wert[i]&&!bestW[lm[i]])wert[i]=0;                                                    // W1c: Landmasse ohne Hafenplatz (nur Eis oder See ringsum) bleibt leer, sonst wäre sie abgeschnitten
 function setz(i,typ){if(nO<ORT_MAX){ort[i]=typ;orte[nO++]=(i|typ<<24)>>>0}}
 function hafenArt(i){var m=flu[i]>=3&&hafen[i]%1000>=420;return m||(mix(seed^Math.imul(i+7,0x85ebca6b))&3)===0?4:3}
 function frei(i){x=i%GW;y=(i/GW)|0;for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){var Y=y+dy;if(Y>=0&&Y<GH&&ort[Y*GW+um(x+dx)])return false}return true}
 for(k=1;k<=L;k++)if(bestW[k])setz(bestZ[k],hafenArt(bestZ[k]));                                        // Pflichthafen je Landmasse
 function bloecke(K,anteil,feld,ab,salz,art){for(by=0;by<GH;by+=K)for(bx=0;bx<GW;bx+=K){var best=-1,bw=ab;       // 600 ist durch alle Blockgrößen teilbar: kein angeschnittener Block an der Naht
   for(y=by;y<by+K&&y<GH;y++)for(x=bx;x<bx+K&&x<GW;x++){i=y*GW+x;if(feld[i]>=bw&&!ort[i]&&(feld[i]>bw||best<0)){bw=feld[i];best=i}}
   if(best<0||(mix(seed^salz^Math.imul(by*GW+bx+1,0x27d4eb2d))&255)>=anteil||!frei(best))continue;setz(best,art(best))}}
 bloecke(D[2],D[3],hafen,1000,0x4a7c15,hafenArt);                                                        // weitere Häfen
 bloecke(D[0],D[1],wert,1,0x2c1b3c6d,function(i){var h=mix(seed^Math.imul(i+3,0xc2b2ae35))&255,lage=(flu[i]>4?4:flu[i])*25+(hafen[i]?50:0);
  var stadt=h<16+(lage>>2);return hafen[i]>=1000?(stadt?4:3):(stadt?2:1)});                              // Dörfer und Städte; an fester Küste mit Hafen
 kopf[0]=nO;kopf[1]=0;kopf[2]=L;kopf[3]=dichte}

// Teile „Straßen“ (see = 0) und „Seewege“ (see = 1): Wegsuche von allen Orten bzw. Häfen zugleich (niedrigste Kosten zuerst). Jede Zelle gehört dem
// Ort, von dem aus sie zuerst erreicht wird, und merkt sich die Richtung zurück. Wo sich zwei Gebiete berühren, entsteht eine mögliche Verbindung
// (die billigste je Paar). Daraus zuerst das Netz, das alle verbindet (billigste zuerst), dann günstige Querverbindungen. Kosten an Land: Steigung,
// Biom, Flussquerung, Fähre über Seen und weiches Rauschen, damit die Wege sich winden; auf See: Rauschen und etwas Abstand zur Küste.
function teilNetz(A,seed,see){var E=A.E,bio=A.bio,flu=A.flu,dir=A.dir,ort=A.ort,weg=A.weg,bes=A.bes,dst=A.dst,vor=A.vor,hp=A.hp,tk=A.tk,tv=A.tv,tc=A.tc,kopf=A.kopf,orte=A.orte,kanten=A.kanten;
 var nO=kopf[0],nK=see?kopf[1]:0,n=0,i,j,x,y,r,v,c,a,b,d,k,t,nx,ny,h,sR=mix(seed^(see?0x5ea1e5:0x57a55e)),uf=dst;
 // Warteschlange nach Kosten in 256 Eimern (jeder Schritt kostet 1 bis 250): hp[zelle] = nächste Zelle im selben Eimer + 1, eimer[k] = erste Zelle + 1
 var eimer=EIMER,jetzt=0,belegt=0;for(i=0;i<256;i++)eimer[i]=0;
 function rein(j,t){hp[j]=eimer[t&255];eimer[t&255]=j+1;n++}
 function kandidat(a,b,kosten,zelle,r){if(a>b){var w=a;a=b;b=w;if(r<4){zelle=nb(zelle,r);r^=2}}
  var key=a*32768+b+1,s=mix(key)&(TAB-1);while(tk[s]&&tk[s]!==key)s=(s+1)&(TAB-1);
  if(!tk[s]){if(belegt>=TAB-TAB/8)return;belegt++;tk[s]=key;tc[s]=kosten;tv[s]=zelle|r<<18}else if(kosten<tc[s]){tc[s]=kosten;tv[s]=zelle|r<<18}}   // Tabelle nie ganz voll (sonst endet die Suche nicht)
 for(i=0;i<N;i++)bes[i]=65535;for(i=0;i<TAB;i++)tk[i]=0;
 for(k=0;k<nO;k++){i=orte[k]&0xffffff;
  if(!see){bes[i]=k;dst[i]=0;vor[i]=4;rein(i,0);continue}
  if(orte[k]>>>24<3)continue;var r0=mix(seed^Math.imul(i+11,0x165667b1))&3,frei=-1,erst=-1;
  for(t=0;t<4;t++){r=(r0+t)&3;j=nb(i,r);if(j<0||bio[j]>=2)continue;if(erst<0)erst=r;if(bes[j]===65535){frei=r;break}}
  r=frei<0?erst:frei;j=nb(i,r);ort[i]|=16<<r;ort[j]|=16<<(r^2);                                 // Ausfahrt des Hafens
  if(frei<0)kandidat(k,bes[j],1,j,4);else{bes[j]=k;dst[j]=0;vor[j]=4;rein(j,0)}}
 while(n){while(!eimer[jetzt&255])jetzt++;i=eimer[jetzt&255]-1;eimer[jetzt&255]=hp[i];n--;d=dst[i];a=bes[i];
  for(r=0;r<4;r++){j=nb(i,r);if(j<0)continue;var bj=bio[j];if(see?bj>=2:bj<2||bj===12)continue;nx=j%GW;ny=(j/GW)|0;
   b=bes[j];if(b===a)continue;
   if(b!==65535){kandidat(a,b,d+dst[j]+10,i,r);continue}                                                // Gebiete berühren sich: mögliche Verbindung
   if(see)c=10+((pn(sR,0,nx,ny,G_NETZ)*12)>>16)+(E[j]>-100?6:0);                                             // Kosten nur einmal je Zelle (beim ersten Erreichen)
   else if(bj===11)c=70;
   else{c=Math.abs(E[j]-E[i])>>5;c=10+(c>120?120:c)+B_WEG[bj]+((pn(sR,0,nx,ny,G_NETZ)*24)>>16)+(mix(sR^j)&7)+(vor[i]===(r^2)?6:0);   // geradeaus kostet etwas extra (keine Schneisen); 16.11.2026 von 12 auf 6 gesenkt: weniger unnötiges Zickzack
    if(flu[j]&&(dir[j]&7)<4&&(dir[j]&3)!==r&&(dir[j]&3)!==(r^2))c+=6*flu[j]}
   bes[j]=a;vor[j]=r^2;t=d+c;if(t>65000)t=65000;dst[j]=t;rein(j,t)}}
 // Verbindungen wählen: billigste zuerst (Länge × 65536 + Platz in der Tabelle), erst das verbindende Netz, dann Querverbindungen
 var m=0,summe=0,zahl=0;for(h=0;h<TAB;h++)if(tk[h])hp[m++]=(tc[h]>32767?32767:tc[h])*TAB+h;                   // Länge (15 Bit) × Tabellengröße + Platz: passt in 32 Bit
 var L=hp.subarray(0,m);L.sort();
 for(k=0;k<nO;k++)uf[k]=k;
 function wurzelVon(k){while(uf[k]!==k){uf[k]=uf[uf[k]];k=uf[k]}return k}
 for(k=0;k<m;k++){h=L[k]&(TAB-1);v=tk[h]-1;a=wurzelVon((v/32768)|0);b=wurzelVon(v%32768);if(a!==b){uf[a]=b;tk[h]|=0x80000000;summe+=tc[h];zahl++}}
 var grenze=zahl?((summe/zahl)|0)*2:0,platz=(see?KANTE_MAX:KANTE_MAX-ORT_MAX)-nK-zahl;
 for(k=0;k<m&&platz>0;k++){h=L[k]&(TAB-1);if(tk[h]&0x80000000||tc[h]>grenze)continue;if((mix(seed^Math.imul(tk[h],0x2545f491))&255)<QUER){tk[h]|=0x40000000;platz--}}
 // Spur legen: von der Berührungsstelle auf beiden Seiten zurück bis zum Ort; Ausgänge und Klasse je Zelle merken
 var faehre=0;
 function marke(c,r,kl){if(see)ort[c]|=16<<r;else{weg[c]|=1<<r;if(((weg[c]>>4)&3)<kl)weg[c]=(weg[c]&0xcf)|kl<<4;if(bio[c]===11){weg[c]|=64;faehre=1}}}
 function spur(c,kl){for(;;){var d=vor[c];if(d>=4)return;marke(c,d,kl);c=nb(c,d);marke(c,d^2,kl)}}
 for(k=0;k<m;k++){h=L[k]&(TAB-1);if(!(tk[h]&0xc0000000))continue;v=(tk[h]&0x3fffffff)-1;a=(v/32768)|0;b=v%32768;c=tv[h]&0x3ffff;r=tv[h]>>>18;
  var ta=orte[a]>>>24,tb=orte[b]>>>24,kl=!see&&(tk[h]&0x80000000)&&(ta===2||ta===4||tb===2||tb===4)?2:1;faehre=0;
  if(r<4){j=nb(c,r);marke(c,r,kl);marke(j,r^2,kl);spur(c,kl);spur(j,kl)}
  kanten[nK*4]=a;kanten[nK*4+1]=b;kanten[nK*4+2]=tc[h]>65535?65535:tc[h];kanten[nK*4+3]=see?8:kl|(faehre?4:0);nK++}
 kopf[1]=nK}

// ── N4b Völker: Kulturen und Religionen in der Welt (Entscheidungen Thomas 20.11.2026) ──
// Zwei Teile „Völker“ nach den Seewegen (Helferkern, fester Betrag je Welt; Teil 0: Kernländer, Teil 1: Ausbreitung und Glaube). Jede der 24 Kulturen aus daten/kulturen.json kommt mindestens einmal vor; liegt
// ihre Heimatzone noch auf einem anderen Kontinent, bekommt sie dort einen Ableger (zusammen rund ein Volk je VK_JE Orte, höchstens VOLK_MAX). Ein Volk
// beginnt in einem Kernland seiner Zone (Zonengebiet = zusammenhängendes Land derselben Klimazone), dort an der Stelle, die zu seiner Lage passt (Küste,
// Fluss, Hang, Oase), möglichst an einem Ort und weit weg von anderen Völkern im selben Gebiet. Dann breiten sich alle Völker zugleich aus (Wegsuche wie
// die Straßen in W1b): fremdes Klima, Gebirge und Meer bremsen, Seefahrer kommen leichter übers Wasser. Wer eine Zelle zuerst erreicht, dem gehört sie.
// Religionen je Ort (bis zu 3, Prozent vom Ganzen, unter 3 % entfällt): die der eigenen Kultur, die der Nachbarvölker im Umkreis von 4 Zellen nach Nähe,
// in Häfen dazu der Tide Ledger, in Städten Zuwanderer eines zufälligen Volks. Der Rest sind verstreute Sekten (nicht gespeichert).
// VK_KUL je Kultur (Reihenfolge und Nummer wie kulturen.json): [Heimatzonen als Bitmaske der Zonen aus ZONE, Lage 0 überall 1 Küste 2 Fluss 3 Hang 4 Oase,
// Religion als Nummer in religionen.json ab 1]. Muss zu den Daten passen (geprüft in tests/at3-n4b.cjs).
var VK_KUL=[[256,0,1],[256,1,10],[256,0,8],[512,0,4],[512,4,4],[576,2,2],[128,0,6],[128,2,6],[64,2,5],[64,0,5],[32,0,7],[32,0,7],[16,1,12],[16,2,3],[8,1,12],[4,0,12],
 [1024,0,5],[1024,2,6],[2048,2,3],[2048,1,7],[4096,0,11],[8192,1,10],[16384,3,9],[16384,3,9]];
var VK_JE=150, VK_MIN=40*64, VK_FREMD=22, VK_BERG=20, VK_MEER=30, VK_KMEER=14, VK_TIDE=10, VK_R=4;   // Vorschlagswerte (Kosten je Zelle beim Ausbreiten)
function vkLand(b){return b>=2&&b!==11&&b!==12}
function teilVoelker(A,seed,teil){var V=A.vk,vol=V.vol,tab=V.tab,rel=V.rel,E=A.E,bio=A.bio,flu=A.flu,zon=A.zon,orte=A.orte,nO=A.kopf[0],kom=A.bes,dst=A.dst,hp=A.hp;
 var sV=mix(seed^0x7a11e5),i,j,k,r,x,y,c,n,q,K=0,nV=0;
 if(teil===1){vkAusbreiten(A,sV);return}
 for(i=0;i<N;i++){kom[i]=65535;vol[i]=0}for(i=0;i<VOLK_MAX;i++)tab[i]=0;for(i=0;i<rel.length;i++)rel[i]=0;
 // 1) Zonengebiete (über die Naht), Zone, Größe und Orte je Gebiet, Zellen je Gebiet hintereinander
 var cz=[];for(i=0;i<N;i++){if(!vkLand(bio[i])||kom[i]!==65535)continue;if(K>=65534)break;n=0;k=0;hp[n++]=i;kom[i]=K;
  while(k<n){c=hp[k++];for(r=0;r<4;r++){j=nb(c,r);if(j>=0&&kom[j]===65535&&vkLand(bio[j])&&zon[j]===zon[i]){kom[j]=K;hp[n++]=j}}}cz.push(zon[i]);K++}
 var cN=new Int32Array(K+1),cO=new Int32Array(K),cS=new Int32Array(K),cW=new Float64Array(K),inst=new Int32Array(24),VX=[],VY=[],VK=[],da=[];
 for(c=0;c<24;c++)da.push({});                                                                  // da[Kultur][Landmasse]: dort gibt es sie schon
 for(i=0;i<N;i++)if(kom[i]<K)cN[kom[i]+1]++;for(k=0;k<K;k++)cN[k+1]+=cN[k];
 var pos=cN.slice(0,K);for(i=0;i<N;i++)if(kom[i]<K)hp[pos[kom[i]]++]=i;                                      // Zellen von Gebiet k: hp[cN[k] .. cN[k+1]-1]
 for(k=0;k<nO;k++){i=orte[k]&0xffffff;if(kom[i]<K)cO[kom[i]]++}
 for(k=0;k<K;k++)cW[k]=cO[k]*64+cN[k+1]-cN[k];
 function passt(c,z){return(VK_KUL[c][0]>>z)&1}
 function kueste(i){for(var r=0;r<4;r++){var j=nb(i,r);if(j>=0&&bio[j]<2)return true}return false}
 function lage(c,i){var L=VK_KUL[c][1],s=0,r,j;if(L===1)s=kueste(i)?220:0;else if(L===2)s=flu[i]>=2?100+flu[i]*30:0;
  else if(L===3){s=zon[i]===14?120:0;for(r=0;r<4;r++){j=nb(i,r);if(j>=0&&zon[j]===14&&zon[i]!==14)s=200}}
  else if(L===4){s=flu[i]?220:0;for(r=0;r<4;r++){j=nb(i,r);if(j>=0&&bio[j]===11)s=220}}
  var o=A.ort[i]&15;return s+(o?150+(o===2||o===4?60:0):0)}
 function setzen(c,k){var best=-1,bs=-1e9,m,a=cN[k],b=cN[k+1];
  for(m=a;m<b;m++){i=hp[m];x=i%GW;y=(i/GW)|0;var s=lage(c,i)+(mix(sV^Math.imul(i+1,0x9e3779b1)^Math.imul(c+1,0x85ebca6b))&127);
   if(cS[k]){var dmin=1e9;for(var v=0;v<nV;v++){if(VK[v]!==k)continue;var dx=Math.abs(x-VX[v]);if(dx>GW-dx)dx=GW-dx;var d=Math.max(dx,Math.abs(y-VY[v]));if(d<dmin)dmin=d}s+=(dmin>60?60:dmin)*8}
   if(s>bs){bs=s;best=i}}
  tab[nV]=(best|(c+1)<<24)>>>0;VX.push(best%GW);VY.push((best/GW)|0);VK.push(k);nV++;cS[k]++;inst[c]++;da[c][A.lm[best]]=1}
 // 2) Kernländer: erst jede Kultur einmal (Reihenfolge aus dem Seed), dann Ableger in den größten Gebieten mit den wenigsten Völkern, bevorzugt auf
 //    Landmassen, wo es die Kultur noch nicht gibt (sonst nur ein Drittel so wichtig)
 var reihe=[];for(c=0;c<24;c++)reihe.push(c);for(c=23;c>0;c--){j=mix(sV^Math.imul(c,0x27d4eb2d))%(c+1);var w=reihe[c];reihe[c]=reihe[j];reihe[j]=w}
 for(q=0;q<24&&K;q++){c=reihe[q];var bk=-1,bw=-1,fb=-1,fw=-1;
  for(k=0;k<K;k++){var s=cW[k]/(1+cS[k])*(192+(mix(sV^Math.imul(k+1,0x632be5ab)^Math.imul(c+1,0x7ed55d16))&127));if(passt(c,cz[k])){if(s>bw){bw=s;bk=k}}else if(s>fw){fw=s;fb=k}}
  setzen(c,bk>=0?bk:fb)}                                                                                 // ohne passende Zone in dieser Welt: das größte freie Gebiet
 var ziel=Math.max(24,Math.min(VOLK_MAX,Math.round(nO/VK_JE)));
 while(nV<ziel){var bk2=-1,bc=-1,bw2=0;
  for(k=0;k<K;k++){var s2=cW[k]/(1+cS[k]);if(s2<VK_MIN)continue;var L2=A.lm[hp[cN[k]]];
   for(c=0;c<24;c++){if(!passt(c,cz[k]))continue;var s3=da[c][L2]?s2/3:s2;
    if(s3>bw2||s3===bw2&&bk2>=0&&(inst[c]<inst[bc]||inst[c]===inst[bc]&&(mix(sV^Math.imul(c+1,k+1))&1))){bw2=s3;bk2=k;bc=c}}}
  if(bk2<0)break;setzen(bc,bk2)}
 V.zahl[0]=nV}
function vkAusbreiten(A,sV){var V=A.vk,vol=V.vol,tab=V.tab,rel=V.rel,bio=A.bio,zon=A.zon,orte=A.orte,nO=A.kopf[0],dst=A.dst,hp=A.hp,nV=V.zahl[0],i,j,k,r,x,y,n,q;
 // 3) Ausbreiten: alle Völker zugleich, niedrigste Kosten zuerst (256 Eimer wie teilNetz), wer zuerst kommt, dem gehört die Zelle
 var eimer=EIMER,jetzt=0;n=0;for(i=0;i<256;i++)eimer[i]=0;
 function rein(j,t){hp[j]=eimer[t&255];eimer[t&255]=j+1;n++}
 for(var v2=0;v2<nV;v2++){i=tab[v2]&0xffffff;vol[i]=v2+1;dst[i]=0;rein(i,0)}
 while(n){while(!eimer[jetzt&255])jetzt++;i=eimer[jetzt&255]-1;eimer[jetzt&255]=hp[i];n--;var d0=dst[i],a=vol[i],K0=VK_KUL[(tab[a-1]>>>24)-1];
  for(r=0;r<4;r++){j=nb(i,r);if(j<0||vol[j])continue;var bj=bio[j],t;if(bj===12)continue;
   if(bj<2||bj===11)t=K0[1]===1?VK_KMEER:VK_MEER;
   else{x=j%GW;y=(j/GW)|0;t=10+(B_WEG[bj]>>1)+((K0[0]>>zon[j])&1?0:VK_FREMD)+(zon[j]===14&&K0[1]!==3?VK_BERG:0)+((pn(sV,0,x,y,G_NETZ)*10)>>16)}
   if(d0+t>65000)continue;vol[j]=a;dst[j]=d0+t;rein(j,d0+t)}}
 for(i=0;i<N;i++)if(!vkLand(bio[i]))vol[i]=0;                                                            // Wasser und Eis gehören niemandem
 // 4) Religionen je Ort
 var W=new Int32Array(13),R=new Int32Array(3);
 for(k=0;k<nO;k++){i=orte[k]&0xffffff;var typ=orte[k]>>>24,a2=vol[i];if(!a2)continue;var own=VK_KUL[(tab[a2-1]>>>24)-1][2],sum=0;W.fill(0);W[own]=100;
  x=i%GW;y=(i/GW)|0;
  for(var dy=-VK_R;dy<=VK_R;dy++){var Y=y+dy;if(Y<0||Y>=GH)continue;for(var dx=-VK_R;dx<=VK_R;dx++){if(!dx&&!dy)continue;var b=vol[Y*GW+um(x+dx)];if(!b)continue;
   var dd=Math.max(dx<0?-dx:dx,dy<0?-dy:dy);W[b===a2?own:VK_KUL[(tab[b-1]>>>24)-1][2]]+=VK_R+1-dd}}
  var h=mix(sV^Math.imul(i+1,0x2545f491));
  if(typ>=3)W[VK_TIDE]+=12+(h&7);
  if(typ===2||typ===4){var zu=(tab[((h>>>8)%nV)]>>>24)-1;W[VK_KUL[zu][2]]+=8+((h>>>4)&7)}
  for(j=1;j<13;j++)sum+=W[j];
  for(q=0;q<3;q++){var bj2=0;for(j=1;j<13;j++)if(W[j]>W[bj2])bj2=j;R[q]=bj2;if(bj2)W[bj2]=-W[bj2]}            // die drei stärksten (bei Gleichstand die kleinere Nummer)
  for(q=0;q<3;q++){var rr=R[q];if(!rr)continue;var pr=Math.round(-W[rr]*100/sum);if(pr<3)continue;rel[k*6+q*2]=rr;rel[k*6+q*2+1]=pr}}
 }

// ── N4c1 Herrschaften (ein Teil nach den Völkern, Helferkern, fester Betrag je Welt) ──
// Jedes Volk bildet ein Reich mit dem System seiner Kultur (HS_SYS, Reihenfolge wie systeme.json: 0 Empire, 1 Kingdom, 2 Principality, 3 Republic,
// 4 Merchant League, 5 Theocracy, 6 Tribal Lands, 7 Robber Barony). Große Völker (mehr als HS_TEIL Orte) zerfallen in mehrere Reiche zu rund HS_REICH Orten,
// Kaiserreiche nie. Kaiserreiche sind die höchstens HS_KAISER größten Völker der Velarier (weitere velarische Völker werden Königreiche); jedes nimmt
// 2–6 angrenzende Völker als Vasallen auf (längste Grenze zuerst; Größe egal, die Velarier sind oft kleiner als ihre Nachbarn) (alle Reiche des Volks, ihr System bleibt). Darunter Stufen je System (HS_G: Orte je Einheit):
// Empire Province ~30 → Prefecture ~6, Kingdom Duchy ~30 → County ~6, Principality County ~6, Republic District ~8, League Factorate ~8,
// Theocracy Diocese ~8, Tribal Lands Clanhold ~6, Robber Barony keine. Sitz jeder Einheit ist ein Ort, bevorzugt eine Stadt, mit Abstand zu den anderen
// Sitzen; der Sitz des Oberherrn ist auch Sitz einer seiner Einheiten. Zellen gehören zum Sitz, der sie zuerst erreicht (Wegsuche von allen Sitzen zugleich
// innerhalb des Elternteils, Rauschen je Zelle franst die Grenzen aus; Inseln ohne Landweg: nächster Sitz), Orte zur Einheit ihrer Zelle.
// Größtes Reich jeder Kultur trägt den Kulturnamen (Bit 9), jedes vierte andere Reich einen Beinamen (1–12), Reichsfarben 0–11 so, dass Nachbarn sich
// unterscheiden (Vasallen in der Farbe ihres Kaisers, heller gezeigt). Namen und Texte macht erst die Anzeige (herrschaften.js, Sprachdatei).
// Je Einheit 4 × 16 Bit: [Oberherr + 1, Sitz (Ortsnummer), System·4+Stufe | Volk << 8, Beiname | Farbe << 4 | Vasall << 8 | Kulturname << 9].
// Je Zelle und je Ort 16 Bit: unterste Einheit + 1 (0 = keine). Orte, Straßen, Klima und Völker bleiben Byte für Byte gleich (Notausschalter ?n4c=0).
var HS_SYS=[0,4,3,4,5,1,6,2,1,3,2,7,1,4,3,6,1,6,5,4,7,3,1,5];   // System je Kultur, muss zu kulturen.json passen (tests/at3-n4c.cjs)
var HS_G=[[30,6],[30,6],[6],[8],[8],[8],[6],[]], HS_TEIL=240, HS_REICH=160, HS_KAISER=3, HS_BEI=12, HS_FARBEN=12;
function teilHerrschaften(A,seed){var V=A.vk,H=A.hs,vol=V.vol,tab=V.tab,nV=V.zahl[0],orte=A.orte,nO=A.kopf[0],T=H.tab,Z=H.zel,OU=H.ort,K=A.bes,sH=mix(seed^0x4e4c3c1),i,j,k,u,v,p,x,y;
 for(i=0;i<N;i++){Z[i]=0;K[i]=0}for(k=0;k<nO;k++)OU[k]=0;for(i=0;i<T.length;i++)T[i]=0;var nH=0;
 if(!nV){H.zahl[0]=0;return}
 var vo=new Int32Array(nV+1),vc=new Int32Array(nV+1),sys=new Int32Array(nV+1);
 for(i=0;i<N;i++)if(vol[i])vc[vol[i]]++;
 for(k=0;k<nO;k++){v=vol[orte[k]&0xffffff];if(v)vo[v]++}
 function kul(v){return(tab[v-1]>>>24)-1}
 for(v=1;v<=nV;v++)sys[v]=HS_SYS[kul(v)];
 var vel=[];for(v=1;v<=nV;v++)if(sys[v]===0&&vo[v])vel.push(v);vel.sort(function(a,b){return vo[b]-vo[a]||a-b});for(j=HS_KAISER;j<vel.length;j++)sys[vel[j]]=1;
 function wert(k){var t=orte[k]>>>24;return t===2||t===4?2:t===3?1:0}
 var HX=new Uint32Array(nO);for(k=0;k<nO;k++)HX[k]=mix(sH^Math.imul((orte[k]&0xffffff)+1,0x9e3779b1));
 function hx(k){return HX[k]}
 // Eine Stufe: Eltern (Völker oder Einheiten) in Kinder teilen. P[q] = {nr: Schlüssel in K, o: Orte, c: Zellen, k: Zahl der Kinder, sitz: Ort des Elternsitzes oder −1,
 // art, volk}. Danach steht in K für jede Zelle eines geteilten Elternteils die Kindeinheit + 1.
 var SX=new Int32Array(nO+1),SY=new Int32Array(nO+1),SU=new Int32Array(nO+1),NEU=new Uint16Array(N),DS=A.dst,hp=A.hp,RS=A.vor;
 for(i=0;i<N;i++)RS[i]=mix(sH^Math.imul(i+1,0x2545f491))&7;                                          // Rauschen je Zelle für die Grenzen
 function stufe(P,map){var s0=new Int32Array(P.length+1),nS=0,q,m;
  for(q=0;q<P.length;q++){var E=P[q],L=E.o.slice(),kk=Math.max(1,Math.min(E.k,L.length,HS_MAX-nH-(P.length-q-1)));s0[q]=nS;
   L.sort(function(a,b){return(b===E.sitz)-(a===E.sitz)||wert(b)-wert(a)||(hx(a)-hx(b))});
   var D2=Math.floor(E.c*2/(5*kk)),n0=nS,gew=new Uint8Array(L.length);
   for(var pass=0;pass<2&&nS-n0<kk;pass++)for(m=0;m<L.length&&nS-n0<kk;m++){if(gew[m])continue;var c=orte[L[m]]&0xffffff;x=c%GW;y=(c/GW)|0;
    if(!pass){var ok=true;for(j=n0;j<nS;j++){var dx=Math.abs(x-SX[j]);if(dx>GW-dx)dx=GW-dx;var dy=y-SY[j];if(dx*dx+dy*dy<D2){ok=false;break}}if(!ok)continue}
    gew[m]=1;SX[nS]=x;SY[nS]=y;u=nH++;SU[nS]=u;T[u*4]=E.ober;T[u*4+1]=L[m];T[u*4+2]=E.art|E.volk<<8;nS++}}
  s0[P.length]=nS;
  // Zellen: Wegsuche von allen Sitzen zugleich (256 Eimer wie die Völker), nur innerhalb des eigenen Elternteils; Schritt 8 + Rauschen je Zelle (0–7),
  // damit die Grenzen ausfransen. Was so nicht erreichbar ist (Inseln desselben Elternteils), bekommt den nächsten Sitz nach Abstand.
  var eimer=EIMER,jetzt=0,n=0,c,r,dd;for(i=0;i<256;i++)eimer[i]=0;
  function rein(j,t){hp[j]=eimer[t&255];eimer[t&255]=j+1;n++}
  for(i=0;i<N;i++)NEU[i]=0;
  for(q=0;q<P.length;q++)for(j=s0[q];j<s0[q+1];j++){c=SY[j]*GW+SX[j];if(NEU[c])continue;NEU[c]=SU[j]+1;DS[c]=0;rein(c,0)}
  while(n){while(!eimer[jetzt&255])jetzt++;c=eimer[jetzt&255]-1;eimer[jetzt&255]=hp[c];n--;var pc=K[c],d0=DS[c];
   for(r=0;r<4;r++){j=nb(c,r);if(j<0||NEU[j]||K[j]!==pc)continue;dd=d0+8+RS[j];if(dd>65000)continue;NEU[j]=NEU[c];DS[j]=dd;rein(j,dd)}}
  for(i=0;i<N;i++){var kp=K[i];if(!kp)continue;q=map[kp];if(q<0)continue;if(NEU[i]){K[i]=NEU[i];continue}var a0=s0[q],a1=s0[q+1],b1=a0,d1=2e9;x=i%GW;y=(i/GW)|0;
   for(j=a0;j<a1;j++){var ex=Math.abs(x-SX[j]);if(ex>GW-ex)ex=GW-ex;var ey=y-SY[j];dd=ex*ex+ey*ey;if(dd<d1){d1=dd;b1=j}}
   K[i]=SU[b1]+1}}
 // 1) Reiche aus Völkern
 var P=[],map=new Int32Array(Math.max(nV,HS_MAX)+1),oL=[];for(v=0;v<=nV;v++)oL.push([]);
 for(k=0;k<nO;k++){v=vol[orte[k]&0xffffff];if(v)oL[v].push(k)}
 for(i=0;i<map.length;i++)map[i]=-1;
 for(v=1;v<=nV;v++){if(!vo[v])continue;var kr=sys[v]===0||vo[v]<=HS_TEIL?1:Math.ceil(vo[v]/HS_REICH);map[v]=P.length;P.push({o:oL[v],c:vc[v],k:kr,sitz:-1,ober:0,art:sys[v]*4,volk:v})}
 for(i=0;i<N;i++)K[i]=vol[i]&&vo[vol[i]]?vol[i]:0;
 stufe(P,map);var nR=nH;
 // Orte und Zellen je Reich
 var ro=new Int32Array(nR),rc=new Int32Array(nR);for(i=0;i<N;i++)if(K[i])rc[K[i]-1]++;for(k=0;k<nO;k++){u=K[orte[k]&0xffffff];if(u)ro[u-1]++}
 // Kulturname: größtes Reich jeder Kultur
 var best=new Int32Array(24).fill(-1);for(u=0;u<nR;u++){var cu=kul(T[u*4+2]>>8);if(best[cu]<0||ro[u]>ro[best[cu]])best[cu]=u}
 for(j=0;j<24;j++)if(best[j]>=0)T[best[j]*4+3]|=512;
 // Nachbarschaft der Völker und der Reiche (Kanten nach Osten und Süden, über die Naht)
 var VN=new Int32Array((nV+1)*(nV+1)),RN=new Int32Array(nR*nR);                     // Grenzlänge je Paar (nV ≤ 64, Reiche rund ein bis zwei je Volk)
 for(i=0;i<N;i++){var a=K[i];if(!a)continue;for(var r=0;r<2;r++){j=nb(i,r);if(j<0)continue;var b=K[j];if(!b||b===a)continue;
  RN[(a-1)*nR+b-1]++;RN[(b-1)*nR+a-1]++;var va=vol[i],vb=vol[j];if(va!==vb){VN[va*(nV+1)+vb]++;VN[vb*(nV+1)+va]++}}}
 // 2) Kaiser nehmen Vasallen: angrenzende Völker, längste Grenze zuerst, 2–6 je Kaiser
 var vasVon=new Int32Array(nV+1);
 for(var e=0;e<vel.length&&e<HS_KAISER;e++){var ev=vel[e],ru=-1;for(u=0;u<nR;u++)if((T[u*4+2]>>8)===ev){ru=u;break}if(ru<0)continue;
  var kand=[];for(var o=1;o<=nV;o++){var gn=VN[ev*(nV+1)+o];if(gn&&o!==ev&&sys[o]!==0&&!vasVon[o]&&vo[o])kand.push([o,gn])}
  kand.sort(function(a,b){return b[1]-a[1]||a[0]-b[0]});var mz=2+mix(sH^Math.imul(ev,0x2545f491))%5;
  for(j=0;j<kand.length&&j<mz;j++){var ov=kand[j][0];vasVon[ov]=ev;for(u=0;u<nR;u++)if((T[u*4+2]>>8)===ov){T[u*4]=ru+1;T[u*4+3]|=256}}}
 // Beinamen
 for(u=0;u<nR;u++){if(T[u*4+3]&512)continue;var hb=mix(sH^Math.imul(u+1,0x632be5ab)^T[u*4+1]);if(!(hb&3))T[u*4+3]|=1+(hb>>>2)%HS_BEI}
 // Farben: Kaiser, dann die übrigen Reiche nach Größe; Vasallen in der Farbe ihres Kaisers
 var nachb=[];for(u=0;u<nR;u++){var nl=[];for(j=0;j<nR;j++)if(RN[u*nR+j])nl.push(j);nachb.push(nl)}
 var fa=new Int32Array(nR).fill(-1),ord=[];for(u=0;u<nR;u++)ord.push(u);
 ord.sort(function(a,b){var ka=(T[a*4+2]&255)>>2===0?0:1,kb=(T[b*4+2]&255)>>2===0?0:1;return ka-kb||ro[b]-ro[a]||a-b});
 function wirk(u){return T[u*4+3]&256?fa[T[u*4]-1]:fa[u]}
 for(var oi=0;oi<ord.length;oi++){u=ord[oi];if(T[u*4+3]&256)continue;var frei=new Uint8Array(HS_FARBEN);
  for(j=0;j<nachb[u].length;j++){var f2=wirk(nachb[u][j]);if(f2>=0)frei[f2]=1}
  var fw=-1;for(j=0;j<HS_FARBEN;j++)if(!frei[j]){fw=j;break}if(fw<0)fw=mix(sH^u)%HS_FARBEN;fa[u]=fw}
 for(u=0;u<nR;u++){var f3=wirk(u);T[u*4+3]|=(f3<0?0:f3)<<4}
 // 3) Stufen darunter
 for(var st=1;st<=2;st++){var P2=[];for(i=0;i<map.length;i++)map[i]=-1;var cn=new Int32Array(nH),lo=[];
  for(i=0;i<N;i++)if(K[i])cn[K[i]-1]++;
  for(u=0;u<nH;u++){var art=T[u*4+2]&255,sy=art>>2;if((art&3)!==st-1||HS_G[sy].length<st){lo.push(null);continue}lo.push([])}
  for(k=0;k<nO;k++){u=K[orte[k]&0xffffff];if(u&&lo[u-1])lo[u-1].push(k)}
  for(u=0;u<nH;u++){if(!lo[u]||!lo[u].length)continue;var sy2=(T[u*4+2]&255)>>2;map[u+1]=P2.length;
   P2.push({o:lo[u],c:cn[u],k:Math.max(1,Math.round(lo[u].length/HS_G[sy2][st-1])),sitz:T[u*4+1],ober:u+1,art:sy2*4+st,volk:T[u*4+2]>>8})}
  if(P2.length)stufe(P2,map)}
 for(i=0;i<N;i++)Z[i]=K[i];for(k=0;k<nO;k++)OU[k]=K[orte[k]&0xffffff];
 H.zahl[0]=nH}
// Kette einer Einheit nach oben (unterste zuerst), z. B. für eine Zelle: kette(A, A.hs.zel[i] − 1)
function hsKette(A,u){var T=A.hs.tab,L=[];while(u>=0&&L.length<8){L.push(u);u=T[u*4]-1}return L}
// Oberstes Reich einer Einheit, Vasallen enden bei ihrem eigenen Reich (Stufe 0), nicht beim Kaiser
function hsReich(A,u){var T=A.hs.tab,n=0;while(u>=0&&(T[u*4+2]&3)&&n++<8)u=T[u*4]-1;return u}

// ── W1b im Kartenstück: Straßenlauf wie der Flusslauf (feste Querungspunkte auf den Zellkanten, Bögen zum Mittelpunkt der Zelle), dazu grob und fein
// seitlich verschoben, damit sich die Straße windet. Gezeichnet als dünne Linie (Pfad 1 Feld, Straße 2 Felder) nur dort, wo die Straße das Stück
// berührt: Stücke ohne Straße kosten nichts. Wegschicht je Feld: 1 Pfad, 2 Straße, 3 Brücke, 4 Furt, 5 Steg (flaches Wasser), 6 Ortsplatz, 7 Fähre.
var nStempel=0, pTyp=0, pX=0, pY=0, PLATZ=[0,5,9,6,10];
// Punkt, an dem eine Straße die Kante einer Zelle quert (hängt nur von der Kante ab); hält Abstand zur Flussquerung derselben Kante
function kanteW(seed,zx,zy,q){var kx=um(q===0?zx+1:zx),ky=q===1?zy+1:zy,h=200+mix(seed^Math.imul(kx,0x45d9f3b)^Math.imul(ky,0x2545f491)^((q&1)?0x7a3d11:0x1c9b57))%625;
 var f=256+mix(seed^Math.imul(kx,0x632be5ab)^Math.imul(ky,0x7ed55d16)^((q&1)?0x51ed27:0x2c1b3c))%513;if(Math.abs(h-f)<60)h=f<512?f+90:f-90;
 return q===0?[ZF,h]:q===2?[0,h]:q===1?[h,ZF]:[h,0]}
function stempel(x,y,kl,W){if(x>=0&&y>=0&&x<ST&&y<ST){var i=y*ST+x;if(W[i]<kl)W[i]=kl;nStempel++}}
function linie(x0,y0,x1,y1,kl,W){if((x0<-2&&x1<-2)||(y0<-2&&y1<-2)||(x0>ST+1&&x1>ST+1)||(y0>ST+1&&y1>ST+1))return;
 var dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,err=dx-dy,x=x0,y=y0;
 for(;;){stempel(x,y,kl,W);if(kl>1){stempel(x+1,y,kl,W);stempel(x,y+1,kl,W);stempel(x+1,y+1,kl,W)}
  if(x===x1&&y===y1)return;if(2*err>-dy){err-=dy;x+=sx}else{err+=dx;y+=sy}}}                           // immer nur ein Schritt in einer Achse: zusammenhängend begehbar
// Ein grobes Stück des Laufs (Weltfelder) fein unterteilen, jeden Punkt mit weichem Rauschen über Weltkoordinaten verschieben und zeichnen
// Seitliche Verschiebung eines Wegpunkts: weiches Rauschen über Weltkoordinaten in zwei Größen (weite Schlenker, kleine Krümmungen); an Zellkanten
// und Stücknähten rechnen beide Seiten denselben Wert.
var VS=new Int32Array(2), V_WEIT=30, V_NAH=8;
function versch(seed,x,y){var xw=x%WF;if(xw<0)xw+=WF;var h=mix(seed^Math.imul(xw,0x2c9277b5)^Math.imul(y,0x5bd1e995));   // dazu ein Feld Zufall je Punkt: nie wie mit dem Lineal gezogen (x über die Naht gleich)
 VS[0]=(((pn(seed,54,x,y,G_WEG[0])-32640)*V_WEIT)>>15)+(((pn(seed,56,x,y,G_WEG[2])-32640)*V_NAH)>>15)+h%3-1;VS[1]=(((pn(seed,55,x,y,G_WEG[1])-32640)*V_WEIT)>>15)+(((pn(seed,57,x,y,G_WEG[3])-32640)*V_NAH)>>15)+(h>>>8)%3-1}
function fein2(seed,x0,y0,x1,y1,gx0,gy0,kl,W){var dx=x1-x0,dy=y1-y0,len=Math.max(Math.abs(dx),Math.abs(dy)),m=(len+7)>>3||1,ux=0,uy=0;
 for(var k=0;k<=m;k++){var x=x0+Math.trunc(dx*k/m),y=y0+Math.trunc(dy*k/m);versch(seed,x,y);var vx=x+VS[0]-gx0,vy=y+VS[1]-gy0;
  if(k)linie(ux,uy,vx,vy,kl,W);ux=vx;uy=vy}}
// Grober Lauf eines Ausgangs: 13 Punkte in Feldern der Zelle (0..1024) von der Kantenquerung in einem Bogen zum Mittelpunkt, dazwischen seitlich versetzt
var GX=new Int32Array(13), GY=new Int32Array(13);
function grob(seed,Zx,Zy,q,jx,jy){var P=kanteW(seed,Zx,Zy,q),x0=P[0],y0=P[1],hs=mix(seed^Math.imul(um(Zx),0x3d4d51cb)^Math.imul(Zy,0x1f83d9ab)^Math.imul(q+1,0x9e3779b1));
 var mx=((x0+jx)>>1)+(hs%141)-70,my=((y0+jy)>>1)+((hs>>>10)%141)-70;                 // 16.11.2026: Bogen ±70 statt ±180 Felder (weniger Umwege)
 mx=mx<48?48:mx>ZF-48?ZF-48:mx;my=my<48?48:my>ZF-48?ZF-48:my;GX[0]=x0;GY[0]=y0;
 for(var i=1;i<=12;i++){var a=(12-i)*(12-i),b=2*i*(12-i),c=i*i,qx=((a*x0+b*mx+c*jx)/144)|0,qy=((a*y0+b*my+c*jy)/144)|0;
  if(i<12){var t=i<12-i?i:12-i,hh=mix(hs+Math.imul(i,0x632be5ab));if(t>3)t=3;qx+=((((hh%33)-16)*t)/3)|0;qy+=(((((hh>>>8)%33)-16)*t)/3)|0;
   qx=qx<8?8:qx>ZF-8?ZF-8:qx;qy=qy<8?8:qy>ZF-8?ZF-8:qy}
  GX[i]=qx;GY[i]=qy}}
// 16.11.2026 (Wunsch Thomas: Wege nicht unnötig stark im Zickzack): Zelle ohne Ort mit genau zwei Ausgängen führt die Straße nicht über den
// zufälligen Knoten, sondern nah an der Sehne zwischen den beiden Kantenquerungen vorbei (Knoten zu einem Viertel). Geradeaus bleibt fast gerade,
// eine Biegung schneidet die Ecke ab: Treppen im Erdraster werden zu schrägen Wegen. Orte, Kreuzungen und Häfen behalten ihren Knoten.
var ZWEI=[0,0,0,1,0,1,1,0,0,1,1,0,1,0,0,0];
function knoten(seed,Zx,Zy,ex,typ){if(typ||!ZWEI[ex&15])return;var a=-1,b=-1;for(var q=0;q<4;q++)if(ex>>q&1){if(a<0)a=q;else b=q}
 var P=kanteW(seed,Zx,Zy,a),Q=kanteW(seed,Zx,Zy,b),mx=(P[0]+Q[0])>>1,my=(P[1]+Q[1])>>1;JP[0]=mx+((JP[0]-mx)>>2);JP[1]=my+((JP[1]-my)>>2)}
function lauf(seed,Zx,Zy,q,jx,jy,kl,cx,cy,W){var ox=Zx*ZF-cx*ST,oy=Zy*ZF-cy*ST,g=V_WEIT+V_NAH+14;grob(seed,Zx,Zy,q,jx,jy);
 for(var i=1;i<=12;i++){var ax=GX[i-1]+ox,ay=GY[i-1]+oy,bx=GX[i]+ox,by=GY[i]+oy;
  if(!((ax<-g&&bx<-g)||(ay<-g&&by<-g)||(ax>ST+g&&bx>ST+g)||(ay>ST+g&&by>ST+g)))fein2(seed,Zx*ZF+GX[i-1],Zy*ZF+GY[i-1],Zx*ZF+GX[i],Zy*ZF+GY[i],cx*ST,cy*ST,kl,W)}}
// Läufe einer Zelle für die Weltansicht (Hauptkern, nur beim Neuzeichnen der Region): je Ausgang 13 Punkte in Weltfeldern, mit der weiten Verschiebung.
// Liefert [{x:[..],y:[..],kl,see}], see = Ausfahrt eines Hafens. A = ansicht der fertigen Erde.
function wegLinien(seed,A,zx,zy){var i=zy*GW+zx,wg=A.weg[i],og=A.ort[i],ex=wg&15,typ=og&15,sea=typ>=3?(og>>4)&15:0,L=[];seed=seed>>>0;if(!ex&&!sea)return L;
 jeFuell(A.E,zx,zy);jWahl(seed,zx,zy);knoten(seed,zx,zy,ex,typ);var jx=JP[0],jy=JP[1];
 for(var q=0;q<4;q++){if(!((ex|sea)>>q&1))continue;grob(seed,zx,zy,q,jx,jy);var X=[],Y=[];
  for(var k=0;k<=12;k++){var x=zx*ZF+GX[k],y=zy*ZF+GY[k];versch(seed,x,y);X.push(x+VS[0]);Y.push(y+VS[1])}
  L.push({x:X,y:Y,kl:ex>>q&1?(wg>>4)&3||1:typ===4?2:1,see:!(ex>>q&1),faehre:!!(wg&64)})}
 return L}
// Straßen und Ort einer Zelle (dx, dy relativ zur Zelle des Stücks), soweit sie das Stück berühren
function wegZelle(X,seed,zx,zy,dx,dy,cx,cy,W){var wg=X6(X,dx,dy,6),og=X6(X,dx,dy,7),ex=wg&15,typ=og&15,sea=typ>=3?(og>>4)&15:0,p=0,q;
 if(!ex&&!typ)return;
 for(var ey=-1;ey<=1;ey++)for(var ex2=-1;ex2<=1;ex2++)JE[p++]=X6(X,dx+ex2,dy+ey,0);
 var Zx=zx+dx,Zy=zy+dy;jWahl(seed,Zx,Zy);knoten(seed,Zx,Zy,ex,typ);var jx=JP[0],jy=JP[1],kl=(wg>>4)&3||1;
 for(q=0;q<4;q++){if(ex>>q&1)lauf(seed,Zx,Zy,q,jx,jy,kl,cx,cy,W);else if(sea>>q&1)lauf(seed,Zx,Zy,q,jx,jy,typ===4?2:1,cx,cy,W)}
 if(!dx&&!dy&&typ){var R=PLATZ[typ]+4;versch(seed,Zx*ZF+jx,Zy*ZF+jy);pX=Zx*ZF+jx-cx*ST+VS[0];pY=Zy*ZF+jy-cy*ST+VS[1];
  if(pX>=-R&&pY>=-R&&pX<ST+R&&pY<ST+R)pTyp=typ}}
// Art je Wegfeld nach dem Untergrund (Fluss: Brücke oder Furt, flaches Wasser: Steg, tiefes: Fähre); Ortsplatz: fester Grund, auch am Ufer
function wegFertig(X,H,B,W){var i,x,y,fk=0,b,h;
 for(i=0;i<5;i++){b=i===0?X6(X,0,0,4):X6(X,DX[i-1],DY[i-1],4);if(b>fk)fk=b}
 if(nStempel)for(i=0;i<FELDER;i++){if(!W[i])continue;b=B[i];if(b===10)W[i]=fk>=2?3:4;else if(b===11||b<2)W[i]=H[i]-MEER>=-32?5:7}
 if(!pTyp)return;var R=PLATZ[pTyp],G=R+4,y0=pY-G<0?0:pY-G,y1=pY+G>ST-1?ST-1:pY+G,x0=pX-G<0?0:pX-G,x1=pX+G>ST-1?ST-1:pX+G;
 for(y=y0;y<=y1;y++)for(x=x0;x<=x1;x++){var d2=(x-pX)*(x-pX)+(y-pY)*(y-pY);if(d2>G*G)continue;var d=wurzel[d2],t=d<=R?32:32-(d-R)*8;i=y*ST+x;b=B[i];h=H[i]-MEER;
  if(b===10){if(d<=R)W[i]=fk>=2?3:4;continue}
  if(b<2||b===11){if(d>R&&h>=t)continue;B[i]=2;if(W[i]===5||W[i]===7)W[i]=1}
  if(h<t)H[i]=MEER+t;if(d<=R)W[i]=6}}

function rechnen(a){return a.art==='erde'?erdTeil(a):gelaende(a)}
// Ein Kartenstück in einem Stück (Tests und Werkzeuge): A = ansicht(erde(seed).buffer)
function stueck(seed,A,cx,cy,daten){   // A muss ort und weg tragen (ansicht der fertigen Erde)
 daten=daten||new Uint8Array(GEL_BYTES);ausschnitt(A,cx,cy,daten);return gelaende({seed:seed,cx:cx,cy:cy,daten:daten})}

var WG={N4C:N4C,HS_SYS:HS_SYS,HS_G:HS_G,HS_MAX:HS_MAX,HS_FARBEN:HS_FARBEN,HS_BEI:HS_BEI,teilHerrschaften:teilHerrschaften,hsKette:hsKette,hsReich:hsReich,N4B:N4B,VK_KUL:VK_KUL,VOLK_MAX:VOLK_MAX,VK_KOPF:VK_KOPF,VK_JE:VK_JE,teilVoelker:teilVoelker,ORT_MAX:ORT_MAX,KANTE_MAX:KANTE_MAX,NETZ_MAX:NETZ_MAX,ERD_ZELLEN:ERD_ZELLEN,ORT_ART:ORT_ART,WEG_ART:WEG_ART,fest:fest,kanteW:kanteW,ortPunkt:ortPunkt,wegLinien:wegLinien,N2B:N2B,ZV:ZV,zonenV:zonenV,zfuell:zfuell,ST:ST,FELDER:FELDER,SEITE_X:SEITE_X,SEITE_Y:SEITE_Y,GW:GW,GH:GH,WF:WF,HF:HF,N:N,nb:nb,um:um,eis:eis,eisSeed:eisSeed,EIS_MAX:EIS_MAX,pn:pn,gv:gv,ZP:ZP,ZF:ZF,MEER:MEER,ST_BYTES:ST_BYTES,GEL_BYTES:GEL_BYTES,ERD_FEST:ERD_FEST,ERD_BYTES:ERD_BYTES,BAND:BAND,TEILE:TEILE,
 TEIL_NAME:TEIL_NAME,BIOM:BIOM,DX:DX,DY:DY,HW:HW,mix:mix,ansicht:ansicht,erdTeil:erdTeil,erde:erde,ausschnitt:ausschnitt,gelaende:gelaende,stueck:stueck,rechnen:rechnen,kante:kante,biomVon:biomVon,herrscht:herrscht,ZONE:ZONE,ZONE_EN:ZONE_EN,N2C:N2C,Z_UNTER:Z_UNTER,Z_BIOM:Z_BIOM,zbio:zbio,istLand:istLand,unter:unter,ZK:ZK,zonen:zonen,zonenRegen:zonenRegen,zonenKlasse:zonenKlasse,zonenSpeicher:zonenSpeicher,waerme:waerme,zBreite:zBreite,anteile:anteile,punkt:punkt,neigung:neigung,klasse:klasse,KAN:KAN};
if(typeof module!=='undefined'&&module.exports)module.exports=WG;else root.AT3WG=WG;
})(typeof self!=='undefined'?self:this);
