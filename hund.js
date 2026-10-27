'use strict';
// =====================================================================================================
// ARENA THEORY · HUNDE (eigenständige Testversion, ändert keine Spieldatei)
// · Hunde-Modell: jede Rasse hat eigene Sollwerte je Wert (werte), Einzelwerte 1–100 über Bernoulli-Versuche darum (wie bei Menschen),
//   Istwerte 20 Punkte darunter. Rassen-Soll (B.soll) = Kampf-Soll, das gewichtete Mittel der Sollwerte (Totenköpfe, Zielstufe)
// · Zeichner: Pixel-Hund in Seitenansicht (Arena und 1:1-Nahansicht), Wunden, Blut im Fell, Blutlachen, Spritzer
// · Kampf: KI wie beim Löwen (dist/lion.js, dist/arena-beasts.js) als „rex“-Kämpfer im Spiel:
//   Menschen treffen den Hund über M.rexReceive, der Hund trifft Menschen über M.hit, gezeichnet über M.drawRex.
//   Hund gegen Hund läuft über ein eigenes Gewebemodell (Kopf, Hals, Brust, Flanke, Vorder-, Hinterläufe).
// Maßstab wie im Spiel: 81 Einheiten = 180 cm → 2,22 cm je Einheit.
// =====================================================================================================
(()=>{
const M=window.MG,S=M.s,cl=M.clamp,dist=M.dist,TAU=Math.PI*2;
const DOG={fx:true};window.DOG=DOG;
const CM=180/81;

// ---------------------------------------------------------------- Zufall
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
// Wie bernoulliValue in dist/data.js: 64 Versuche mit p aus dem Sollwert, Ergebnis wieder 1–100
function bern(r,mean,n=64){let hits=0;const p=cl((mean-1)/99,.01,.98);for(let i=0;i<n;i++)if(r()<p)hits++;return Math.round(1+99*hits/n);}

// ---------------------------------------------------------------- Rassen (nach Kampf-Soll, Wölfe vorn)
// werte: Sollwerte je Wert (Anlage, Obergrenze fürs Training), seit 27.10.2026 je Rasse einzeln und möglichst wirklichkeitsnah:
// Windhunde am schnellsten (Greyhound 97), Schlittenhunde am ausdauerndsten, Molosser am kräftigsten; die Wölfe sind im Kampf am stärksten.
const BREEDS=[
 {id:'wolf',wolf:true,cm0:80,kg0:45,name:'Wolf',active:true,look:'hochbeinig, schmale tiefe Brust, langer Kopf mit Stehohren, Halskrause, buschige hängende Rute',fur:'Grau, heller Bauch und Kehle, dunkler Sattel, helle Maske um das Maul',werte:{kraft:74,biss:92,tempo:66,ausdauer:94,zaeh:74,wild:92,mut:72},
  // Eigene Gestalt: kein Hund, ein Wolf. Lange Beine, schmaler Rumpf, schmale tiefe Brust, aufgezogener Bauch, Halskrause, langer schmaler Kopf, Stehohren, buschige Rute hängt gerade, nie Halsband
  shape:{head:'wo',L:31,leg:1.18,thick:.82,chest:.9,tuck:1.9,withers:.4,crest:7.8,dew:3.2,tailW:4.8,tailSeg:2.6,tailUp:.3,tailCurl:-.02,bushy:1,legW:.86,hindW:.9,neckX:1.4,neckY:-.6,ruff:1,saddle:1,mouth:{x:12.6,y:1.6},eye:{x:4.2,y:-4.6},whiteChest:0,earCut:0,collar:0},
  // Lautpaket: bellt kaum (kurzes Wuffen), dafür kehliges Knurren und Fauchen, Jaulen hoch
  sound:{barkF:150,barkF1:[760,560,430],barkF2:[1280,1000,820],barkLen:.22,barkRate:.08,huff:.4,growlF:60,growlLp:2300,yelpF:640,whineF:760,vol:.8},
  coats:[{id:'grau',name:'Grau',w:1,base:'#8a857a',light:'#b5afa2',shade:'#5f5a51',dark:'#3a3630',saddle:'#4a463f',belly:'#cfc8b7'}],tier:'Legende'},
 {id:'polarwolf',wolf:true,cm0:82,kg0:55,name:'Polarwolf',active:true,look:'Wolf aus dem hohen Norden: groß und schwer, dichter weißer Pelz, kurze runde Ohren, kürzere Schnauze, breite Pfoten, buschige Rute',fur:'Weiß, leicht cremefarben überhaucht',werte:{kraft:76,biss:84,tempo:60,ausdauer:92,zaeh:74,wild:84,mut:66},
  // Eigene Gestalt: wie der Wolf, aber massiger im dicken Winterpelz, kleine runde Ohren, kurze Schnauze
  shape:{head:'wo',wolfEar:.72,wolfMz:.9,L:31,leg:1.12,thick:.94,chest:.9,tuck:1.4,withers:.4,crest:8.2,dew:3.6,tailW:5.2,tailSeg:2.6,tailUp:.3,tailCurl:-.02,bushy:1,legW:.94,hindW:.96,neckX:1.2,neckY:-.4,ruff:1,saddle:.6,rough:1,mouth:{x:12,y:1.6},eye:{x:4.2,y:-4.6},whiteChest:0,earCut:0,collar:0},
  sound:{barkF:140,barkF1:[720,540,420],barkF2:[1240,980,800],barkLen:.24,barkRate:.06,huff:.45,growlF:56,growlLp:2100,yelpF:600,whineF:720,vol:.85},
  coats:[{id:'weiss',name:'Weiß',w:1,base:'#e6e2d8',light:'#f6f4ee',shade:'#bcb6a8',dark:'#8a8478',saddle:'#d2ccc0',belly:'#f4f0e8',tailTip:'#d8d2c6'}]},
 {id:'schwarzwolf',wolf:true,cm0:80,kg0:48,name:'Schwarzer Wolf',active:true,look:'großer schwarzer Waldwolf: hochbeinig und kräftig, schwarzer Pelz mit grauem Schimmer an Kehle und Bauch, gelbe Augen, große Stehohren, buschige Rute',fur:'Schwarz, an Kehle und Bauch grau überhaucht',werte:{kraft:72,biss:88,tempo:64,ausdauer:88,zaeh:70,wild:90,mut:68},
  // Eigene Gestalt: Wolf in Schwarz, größer und schwerer als der graue Wolf; die gelben Augen leuchten im Dunkel
  shape:{head:'wo',wolfEar:1,wolfMz:1.04,L:32,leg:1.2,thick:.88,chest:1,tuck:1.8,withers:.5,crest:8,dew:3.4,tailW:5,tailSeg:2.6,tailUp:.3,tailCurl:-.02,bushy:1,legW:.9,hindW:.94,neckX:1.4,neckY:-.6,ruff:1,saddle:1,mouth:{x:12.9,y:1.6},eye:{x:4.2,y:-4.6},whiteChest:0,earCut:0,collar:0},
  sound:{barkF:130,barkF1:[680,500,400],barkF2:[1160,920,760],barkLen:.24,barkRate:.06,huff:.45,growlF:52,growlLp:2000,yelpF:580,whineF:700,vol:.9},
  coats:[{id:'schwarz',name:'Schwarz',w:1,base:'#2e2c2a',light:'#4c4844',shade:'#1e1c1b',dark:'#121110',saddle:'#1a1817',belly:'#55504a',tailTip:'#141312'}]},
 {id:'apenninwolf',wolf:true,cm0:70,kg0:32,name:'Apenninwolf',active:true,look:'Italienischer Wolf: kleiner und schlanker als der Nordwolf, graubraun mit rötlichem Hauch, dunkler Sattel, schwarzer Strich vorn an den Vorderläufen, helle Maske',fur:'Graubraun mit rötlichem Hauch, dunkler Sattel, helle Kehle',werte:{kraft:66,biss:86,tempo:66,ausdauer:90,zaeh:64,wild:88,mut:66},
  // Eigene Gestalt: der Wolf Roms – kleiner, schmaler und brauner als der graue Wolf, etwas kürzere Ohren
  shape:{head:'wo',wolfEar:.9,wolfMz:.98,L:30,leg:1.16,thick:.78,chest:.9,tuck:2,withers:.3,crest:7.6,dew:3,tailW:4.4,tailSeg:2.6,tailUp:.3,tailCurl:-.02,bushy:1,legW:.84,hindW:.88,neckX:1.4,neckY:-.6,ruff:1,saddle:1,mouth:{x:12.4,y:1.6},eye:{x:4.2,y:-4.6},whiteChest:0,earCut:0,collar:0},
  sound:{barkF:156,barkF1:[780,580,440],barkF2:[1300,1020,840],barkLen:.2,barkRate:.08,huff:.4,growlF:62,growlLp:2300,yelpF:660,whineF:780,vol:.8},
  coats:[{id:'graubraun',name:'Graubraun',w:1,base:'#94826a',light:'#b8a688',shade:'#6a5c4a',dark:'#3e352a',saddle:'#4c4236',belly:'#d8cab0'}]},
 {id:'aethiopwolf',wolf:true,cm0:60,kg0:16,name:'Äthiopischer Wolf',active:true,look:'roter Wolf aus dem Hochland Aethiopias: schlank und hochbeinig, leuchtend rotes Fell, weiße Kehle und Brust, sehr lange schmale Schnauze, große spitze Ohren, buschige Rute mit schwarzer Spitze',fur:'Rot mit weißer Kehle, Brust und Innenseite der Läufe, schwarze Rutenspitze',werte:{kraft:58,biss:86,tempo:68,ausdauer:88,zaeh:62,wild:90,mut:70},
  // Eigene Gestalt: kleiner roter Wolf wie ein großer Fuchs, sehr lange Schnauze und große Ohren, weiße Kehle, schwarze Rutenspitze
  shape:{head:'wo',wolfEar:1.22,wolfMz:1.22,L:29,leg:1.22,thick:.72,chest:.8,tuck:2.2,withers:.2,crest:7.2,dew:2.4,tailW:4.2,tailSeg:2.6,tailUp:.3,tailCurl:-.02,bushy:1,legW:.78,hindW:.84,neckX:1.6,neckY:-1,ruff:0,saddle:.5,mouth:{x:14.2,y:1.6},eye:{x:4.2,y:-4.6},whiteChest:0,earCut:0,collar:0},
  sound:{barkF:190,barkF1:[860,650,500],barkF2:[1440,1130,920],barkLen:.18,barkRate:.2,huff:.3,growlF:70,growlLp:2500,yelpF:720,whineF:860,vol:.75},
  coats:[{id:'rot',name:'Rot',w:1,base:'#b8642e',light:'#d4844c',shade:'#8a4620',dark:'#4e2812',saddle:'#9e5226',belly:'#f0e6d6',tailTip:'#1c1814'}]},
 {id:'owtscharka',cm0:72,kg0:75,name:'Kaukasischer Owtscharka',active:true,look:'riesig, bärenhaft, dichtes langes Fell mit Mähne, breiter Kopf, kurze Ohren (meist kupiert), buschige Sichelrute',fur:'Grau (wolfsfarben), Falb oder Rot, oft helle Abzeichen',werte:{kraft:80,biss:86,tempo:44,ausdauer:66,zaeh:80,wild:66,mut:74},
  // Eigene Gestalt: Herdenschutzhund aus dem Kaukasus, Wolfsjäger. Massig, dichtes langes Fell (Zotteln, Mähne, Hosen), dicke Läufe, buschige Rute leicht sichelförmig, breiter Bärenkopf
  shape:{head:'ow',L:30.5,leg:1,thick:1.16,chest:1.1,tuck:.3,withers:.5,crest:11.2,dew:6,tailW:5.4,tailSeg:2.5,tailUp:.15,tailCurl:.05,bushy:1,legW:1.18,hindW:1.14,neckX:.2,neckY:-.4,rough:1,ruff:1,mouth:{x:11.2,y:2},eye:{x:4.3,y:-4.4},whiteChest:.25,earCut:.7,collar:.3},
  // Lautpaket: sehr tief und dröhnend, warnt oft (Wachhund), Knurren tief und lang
  sound:{barkF:108,barkF1:[600,410,330],barkF2:[1020,800,680],barkLen:.4,barkRate:.5,huff:.5,growlF:47,growlLp:1650,yelpF:420,whineF:550,vol:.9},
  coats:[
   {id:'grau',name:'Grau (wolfsfarben)',w:.5,base:'#8d8478',light:'#b7ad9e',shade:'#625a50',dark:'#3a342e'},
   {id:'falb',name:'Falb',w:.3,base:'#b8935e',light:'#d6b585',shade:'#8a6a40',dark:'#544028'},
   {id:'rot',name:'Rot',w:.2,base:'#9a5a34',light:'#bb7a4e',shade:'#6c3c20',dark:'#3e2212'}]},
 {id:'tosa',cm0:66,kg0:68,name:'Tosa Inu',active:true,look:'japanischer Kampfhund, muskulös, kurzes glattes Fell, breiter Kopf mit deutlichem Stop, kleine hoch angesetzte Hängeohren, Wamme, dicke hängende Rute',fur:'Rot, auch Falb, Schwarz oder gestromt',werte:{kraft:76,biss:73,tempo:48,ausdauer:54,zaeh:79,wild:52,mut:85},
  // Eigene Gestalt: Ringkampfhund aus Tosa (Japan), kämpft stumm. Muskulös und gerade, breite tiefe Brust, Wamme, kräftige Läufe, Rute am Ansatz dick und lang hängend
  shape:{head:'to',L:31,leg:1.03,thick:1.02,chest:1.1,tuck:1,withers:.6,crest:10.4,dew:6,tailW:5,tailSeg:2.6,tailUp:.25,tailCurl:-.04,legW:1.1,hindW:1.06,neckX:.3,neckY:-.6,mouth:{x:11.6,y:2},eye:{x:4.4,y:-4.6},whiteChest:.25,earCut:0,collar:.5},
  // Lautpaket: kämpft stumm, bellt sehr selten, tief; Knurren tief
  sound:{barkF:116,barkF1:[620,430,340],barkF2:[1040,820,700],barkLen:.34,barkRate:.12,huff:.45,growlF:50,growlLp:1750,yelpF:450,whineF:580,vol:.85},
  coats:[
   {id:'rot',name:'Rot',w:.6,base:'#a0532c',light:'#c0714a',shade:'#72381a',dark:'#44200e'},
   {id:'falb',name:'Falb',w:.18,base:'#c09862',light:'#dab886',shade:'#906c40',dark:'#5a4226'},
   {id:'gestromt',name:'Gestromt',w:.12,base:'#8a5a36',light:'#a8764e',shade:'#603c22',dark:'#3a2414',stripe:'#24160c'},
   {id:'schwarz',name:'Schwarz',w:.1,base:'#2e2824',light:'#4a423c',shade:'#1e1a17',dark:'#110e0c'}]},
 {id:'molosser',cm0:78,kg0:85,name:'Molosser',active:true,look:'massig, riesiger Schädel mit Falten, schwere Hängelefzen, tiefe Wamme, Hängeohren (oft kupiert), Stachelhalsband',fur:'Dunkel gestromt',werte:{kraft:85,biss:79,tempo:42,ausdauer:46,zaeh:79,wild:64,mut:70},
  // Eigene Gestalt: Kriegshund aus Epirus, schwerer als der Mastiff, breite Brust, dicker Nacken, tiefe Wamme, kräftige Läufe, dicke Rute
  shape:{head:'mo',L:31.5,leg:1.02,thick:1.1,chest:1.5,tuck:.8,withers:.8,crest:10.8,dew:7,tailW:5,tailSeg:2.4,tailUp:.1,tailCurl:-.06,legW:1.14,hindW:1.08,neckX:.2,neckY:-.2,mouth:{x:11.8,y:2.2},eye:{x:4.4,y:-4.3},whiteChest:.12,earCut:.35,collar:.9},
  // Lautpaket: sehr tief und dröhnend, bellt selten, schnaubt viel, Knurren sehr tief
  sound:{barkF:104,barkF1:[590,400,320],barkF2:[1000,790,670],barkLen:.42,barkRate:.22,huff:.85,growlF:46,growlLp:1600,yelpF:410,whineF:540,vol:.9},
  coats:[{id:'gestromt',name:'Dunkel gestromt',w:1,base:'#5e4632',light:'#7c6046',shade:'#3e2d20',dark:'#241a12',stripe:'#1a120c'}]},
 {id:'fila',cm0:70,kg0:56,name:'Fila Brasileiro',active:true,look:'groß, lose Haut, tiefe Wamme bis zur Brust, Kruppe höher als der Widerrist, birnenförmiger Kopf, schwere Hängelefzen, große V-Hängeohren',fur:'Falb oder gestromt, oft schwarze Maske; auch Schwarz',werte:{kraft:67,biss:70,tempo:56,ausdauer:60,zaeh:73,wild:79,mut:76},
  // Eigene Gestalt: brasilianischer Treib- und Wachhund (Fährte, Festhalten), misstrauisch gegen Fremde. Lose Haut, sehr tiefe Wamme, Widerrist tiefer als die Kruppe, kräftige Hinterhand, Rute breit am Ansatz, hängt, Spitze leicht gebogen
  shape:{head:'fi',L:31.5,leg:1.05,thick:.98,chest:1.1,tuck:.9,withers:-.5,crest:9.4,dew:7.6,tailW:5,tailSeg:2.6,tailUp:.35,tailCurl:.03,legW:1.04,hindW:1.08,neckX:.6,neckY:.5,mouth:{x:12,y:2.4},eye:{x:4.3,y:-4.3},whiteChest:.2,earCut:0,collar:.3,whiteFeet:.15},
  // Lautpaket: tief, dumpf und drohend, bellt mäßig, Knurren tief und lang
  sound:{barkF:114,barkF1:[600,420,330],barkF2:[1020,800,680],barkLen:.38,barkRate:.35,huff:.6,growlF:49,growlLp:1700,yelpF:440,whineF:570,vol:.88},
  coats:[
   {id:'falb',name:'Falb',w:.5,base:'#b8874e',light:'#d4a672',shade:'#8a6034',dark:'#563a1e'},
   {id:'gestromt',name:'Gestromt',w:.35,base:'#8e6640',light:'#ac8258',shade:'#64462a',dark:'#3c2a18',stripe:'#2a1c10'},
   {id:'schwarz',name:'Schwarz',w:.15,base:'#2c2622',light:'#463e38',shade:'#1c1815',dark:'#100d0b'}]},
 {id:'dogge',cm0:82,kg0:68,name:'Deutsche Dogge',active:true,look:'riesig und elegant, sehr hochbeinig, kurzes glattes Fell, langer rechteckiger Kopf mit deutlichem Stop, Lefzen, Ohren oft kupiert (hohe Stehohren), lange dünne Rute',fur:'Gelb oder gestromt mit schwarzer Maske, Schwarz, Blau oder Harlekin (weiß mit gerissenen schwarzen Platten)',werte:{kraft:67,biss:58,tempo:60,ausdauer:46,zaeh:52,wild:37,mut:58},
  // Eigene Gestalt: deutscher Saupacker und Hatzrüde, der „Apollo unter den Hunden“. Sehr groß und hochbeinig, quadratisch, tiefe Brust, aufgezogener Bauch, langer Hals, Kopf hoch getragen; Harlekin über Platten (patch)
  shape:{head:'dd',L:32,leg:1.2,thick:.94,chest:1.4,tuck:2,withers:.7,crest:9.4,dew:3.6,tailW:3.8,tailSeg:3,tailUp:-.15,tailCurl:.04,legW:1.04,hindW:1.04,neckX:1.8,neckY:-2.2,piebald:1,mouth:{x:13.2,y:2},eye:{x:4.3,y:-4.6},whiteChest:.12,earCut:.55,collar:.5},
  // Lautpaket: sehr tief, dröhnend und hallend, bellt selten, Knurren tief
  sound:{barkF:108,barkF1:[600,420,330],barkF2:[1020,800,680],barkLen:.42,barkRate:.2,huff:.45,growlF:48,growlLp:1700,yelpF:430,whineF:560,vol:.9},
  coats:[
   {id:'gelb',name:'Gelb',w:.3,base:'#c69a5e',light:'#ddb886',shade:'#966e3c',dark:'#5e4424'},
   {id:'gestromt',name:'Gestromt',w:.2,base:'#a87c4c',light:'#c49864',shade:'#7a5632',dark:'#46321c',stripe:'#24180e'},
   {id:'schwarz',name:'Schwarz',w:.2,base:'#262321',light:'#423c38',shade:'#181615',dark:'#0e0d0c'},
   {id:'blau',name:'Blau',w:.15,base:'#5a606a',light:'#787e88',shade:'#3e434c',dark:'#24272e'},
   {id:'harlekin',name:'Harlekin',w:.15,base:'#ece8e0',light:'#faf8f2',shade:'#c4beb2',dark:'#9a9488',patch:'#1e1c1a',patchHi:'#3a3632'}]},
 {id:'dogo',cm0:64,kg0:42,name:'Dogo Argentino',active:true,look:'reinweiß, athletisch und muskulös, kurzes glattes Fell, breiter gewölbter Schädel, kräftige Schnauze, enge Lefzen, Ohren meist kupiert (Stehohren), lange tief getragene Rute',fur:'Reinweiß, rosa Haut an Lefzen und Ohren, selten ein dunkler Fleck am Kopf',werte:{kraft:64,biss:76,tempo:64,ausdauer:66,zaeh:64,wild:73,mut:82},
  // Eigene Gestalt: argentinischer Großwildjäger (Puma, Wildschwein). Athletisch, tiefe Brust, deutliche Taille, muskulöser Nacken, kräftige Läufe, lange dünne Rute tief getragen
  shape:{head:'dg',L:30,leg:1.06,thick:.92,chest:1.1,tuck:1.7,withers:.7,crest:10.2,dew:3.6,tailW:3.8,tailSeg:2.6,tailUp:.15,tailCurl:-.04,legW:1.02,hindW:1.04,neckX:.6,neckY:-.8,mouth:{x:11.4,y:1.8},eye:{x:4.4,y:-4.6},whiteChest:0,earCut:.8,collar:.3},
  // Lautpaket: mitteltief, kräftig und hart, bellt selten (jagt stumm), Knurren rau
  sound:{barkF:132,barkF1:[700,510,400],barkF2:[1180,920,760],barkLen:.3,barkRate:.25,huff:.3,growlF:56,growlLp:2100,yelpF:500,whineF:640,vol:.88},
  coats:[{id:'weiss',name:'Reinweiß',w:1,base:'#e4ded2',light:'#f4f0e8',shade:'#b8b0a2',dark:'#8c8476',patch:'#2a2622',patchHi:'#48413a'}]},
 {id:'alaunt',cm0:72,kg0:60,name:'Alaunt',active:true,look:'kurzhaarig, athletisch, kurze breite Schnauze, gestutzte Stehohren',fur:'Weiß mit schwarzen Platten (gescheckt), oft schwarzer Kopffleck',werte:{kraft:61,biss:67,tempo:70,ausdauer:64,zaeh:58,wild:70,mut:67},
  // Eigene Gestalt: Kampf- und Hetzhund der Alanen, athletisch zwischen Mastiff und Windhund, tiefe Brust, Taille, muskulöser Nacken, kurze breite Schnauze, Ohren fast immer gestutzt
  shape:{head:'al',L:30,leg:1.07,thick:.94,chest:1.2,tuck:1.9,withers:.6,crest:10,dew:4,tailW:3.6,tailSeg:2.5,tailUp:.05,tailCurl:-.08,legW:1.02,hindW:1.04,neckX:.7,neckY:-1.2,piebald:1,mouth:{x:11.2,y:1.7},eye:{x:4.4,y:-4.6},whiteChest:0,earCut:.85},
  // Lautpaket: mitteltief, hart und kräftig, bellt oft (Hetz- und Kampfhund), wenig Schnauben, Knurren rau
  sound:{barkF:134,barkF1:[720,520,400],barkF2:[1200,940,770],barkLen:.3,barkRate:.65,huff:.25,growlF:56,growlLp:2100,yelpF:500,whineF:640,vol:.9},
  coats:[{id:'gescheckt',name:'Weiß, schwarz gescheckt',w:1,base:'#d8d2c4',light:'#efe9dc',shade:'#a8a194',dark:'#2a2622',patch:'#2a2622',patchHi:'#48413a'}]},
 {id:'presa',cm0:62,kg0:50,name:'Presa Canario',active:true,look:'kompakt und rechteckig, breite Brust, dicker Nacken, massiger würfelförmiger Kopf, kurze breite Schnauze, schwarze Maske, Ohren oft kupiert (sonst Rosenohren)',fur:'Gestromt oder Falb, immer schwarze Maske, manchmal weißer Brustfleck',werte:{kraft:73,biss:79,tempo:54,ausdauer:56,zaeh:73,wild:73,mut:82},
  // Eigene Gestalt: Hofhund und Viehpacker der Kanaren. Länger als hoch, breite tiefe Brust, wenig Taille, sehr dicker Nacken, kräftige Läufe, dicke mittellange Rute hängend
  shape:{head:'pc',L:31.5,leg:.98,thick:1.04,chest:1,tuck:.9,withers:.4,crest:10.6,dew:4.6,tailW:4.6,tailSeg:2.5,tailUp:.2,tailCurl:-.05,legW:1.1,hindW:1.08,neckX:.2,neckY:-.3,mouth:{x:10.8,y:2},eye:{x:4.4,y:-4.6},whiteChest:.3,earCut:.55,collar:.4},
  // Lautpaket: tief, kurz und hart, bellt mäßig, Knurren tief und rau
  sound:{barkF:124,barkF1:[660,470,370],barkF2:[1120,880,730],barkLen:.3,barkRate:.4,huff:.5,growlF:52,growlLp:1850,yelpF:470,whineF:600,vol:.88},
  coats:[
   {id:'gestromt',name:'Gestromt',w:.5,base:'#8a6440',light:'#a88058',shade:'#62452a',dark:'#3a2818',stripe:'#24180e'},
   {id:'falb',name:'Falb',w:.3,base:'#bc9460',light:'#d8b484',shade:'#8c6a3e',dark:'#563f24'},
   {id:'dunkel',name:'Dunkel gestromt',w:.2,base:'#4a3a2c',light:'#64503e',shade:'#30251c',dark:'#1c1610',stripe:'#120d09'}]},
 {id:'boerboel',cm0:65,kg0:70,name:'Boerboel',active:true,look:'blockig und sehr muskulös, starke Knochen, breite Brust, kurzer Rücken, breiter kantiger Kopf, fleischige Lefzen, hoch angesetzte V-Hängeohren',fur:'Falb, Rot, Braun oder gestromt, schwarze Maske',werte:{kraft:82,biss:79,tempo:48,ausdauer:54,zaeh:76,wild:58,mut:79},
  // Eigene Gestalt: Farm- und Wachhund der Buren (Südafrika). Blockig, kurzer Rücken, breite tiefe Brust, sehr dicker Nacken, starke Knochen, kräftige Hinterhand, dicke Rute hängend
  shape:{head:'bo',L:30,leg:1,thick:1.1,chest:1.1,tuck:.8,withers:.6,crest:11,dew:4.8,tailW:4.8,tailSeg:2.5,tailUp:.2,tailCurl:-.05,legW:1.16,hindW:1.12,neckX:.2,neckY:-.4,mouth:{x:11.2,y:2},eye:{x:4.4,y:-4.5},whiteChest:.15,earCut:0,collar:.4},
  // Lautpaket: tief und voll, bellt mäßig (Wachhund), Knurren tief
  sound:{barkF:118,barkF1:[630,440,350],barkF2:[1060,830,700],barkLen:.34,barkRate:.38,huff:.55,growlF:50,growlLp:1750,yelpF:450,whineF:580,vol:.88},
  coats:[
   {id:'falb',name:'Falb',w:.45,base:'#c49a5e',light:'#ddb986',shade:'#946f3e',dark:'#5e4626'},
   {id:'rot',name:'Rot',w:.3,base:'#a86a3a',light:'#c48856',shade:'#7a4a24',dark:'#4a2c14'},
   {id:'gestromt',name:'Gestromt',w:.15,base:'#94704a',light:'#b28c62',shade:'#684e32',dark:'#3e2e1c',stripe:'#281c10'},
   {id:'braun',name:'Braun',w:.1,base:'#6e4a30',light:'#8a6246',shade:'#4c321e',dark:'#2c1c10'}]},
 {id:'baerenbeisser',cm0:68,kg0:55,name:'Bärenbeißer',active:true,look:'gedrungen, massiger Kiefer, Vorbiss, kurze Schnauze, Rosenohren (oft kupiert)',fur:'Rotbraun, weiße Brust, schwarze Maske',werte:{kraft:67,biss:76,tempo:52,ausdauer:52,zaeh:67,wild:64,mut:70},
  // Eigene Gestalt: kürzerer Rumpf, tiefe Brust mit Taille, breiter Kopf, kurze Schnauze, Unterkiefer steht vor
  shape:{head:'bb',L:28,chest:1.3,tuck:1.1,withers:.8,crest:9.6,dew:4.4,tailW:3.6,tailSeg:2.2,tailUp:.35,legW:1.08,mouth:{x:10.4,y:1.8},eye:{x:4.3,y:-4.6},whiteChest:.92,earCut:.45,whiteFeet:.4},
  // Lautpaket: mitteltief, hart und kurz, bellt öfter als der Mastiff, Knurren rauer
  sound:{barkF:138,barkF1:[700,500,390],barkF2:[1180,920,760],barkLen:.29,barkRate:.55,huff:.35,growlF:58,growlLp:2000,yelpF:500,whineF:640,vol:.9},
  coats:[{id:'rotbraun',name:'Rotbraun',w:1,base:'#8e4e2c',light:'#ad6a42',shade:'#64341c',dark:'#3e1f10'}]},
 {id:'corso',cm0:64,kg0:46,name:'Cane Corso',active:true,look:'athletisch und muskulös, kurzes glattes Fell, breiter Kopf mit eckiger Schnauze, Ohren meist kupiert (Dreiecke), dicke Rute',fur:'Schwarz, Grau (Blei), Falb oder gestromt; Falb mit dunkler Maske',werte:{kraft:67,biss:79,tempo:58,ausdauer:60,zaeh:67,wild:64,mut:76},
  // Eigene Gestalt: italienischer Treib- und Wachhund (Nachfahre der römischen Molosser). Athletisch, etwas länger als hoch, tiefe Brust, deutliche Taille, kräftiger Nacken, gerader Rücken
  shape:{head:'co',L:30.5,leg:1.05,thick:.98,chest:1.1,tuck:1.4,withers:.6,crest:10.4,dew:3.8,tailW:4.2,tailSeg:2.6,tailUp:.1,tailCurl:-.04,legW:1.06,hindW:1.06,neckX:.5,neckY:-.8,mouth:{x:11.4,y:2},eye:{x:4.4,y:-4.6},whiteChest:.15,earCut:.7,collar:.4},
  // Lautpaket: tief und kräftig, bellt mäßig, Knurren tief
  sound:{barkF:126,barkF1:[660,470,370],barkF2:[1120,880,730],barkLen:.32,barkRate:.38,huff:.4,growlF:52,growlLp:1850,yelpF:470,whineF:600,vol:.88},
  coats:[
   {id:'schwarz',name:'Schwarz',w:.35,base:'#2a2624',light:'#46403c',shade:'#1a1716',dark:'#0e0c0b'},
   {id:'grau',name:'Grau (Blei)',w:.3,base:'#5c5c5e',light:'#7c7c7e',shade:'#3e3e40',dark:'#242426'},
   {id:'gestromt',name:'Gestromt',w:.2,base:'#6a5038',light:'#846850',shade:'#4a3624',dark:'#2c2016',stripe:'#1a120c'},
   {id:'falb',name:'Falb',w:.15,base:'#b48c5c',light:'#d0aa7c',shade:'#86643c',dark:'#523c22'}]},
 {id:'leonberger',cm0:76,kg0:62,name:'Leonberger',active:true,look:'groß und kräftig, langes wasserabweisendes Fell, Löwenmähne an Hals und Brust, schwarze Maske, Hängeohren, buschige hängende Rute, Hosen an den Hinterläufen',fur:'Löwengelb, Rot, Rotbraun oder Sand, oft schwarze Haarspitzen, immer schwarze Maske',werte:{kraft:64,biss:52,tempo:46,ausdauer:60,zaeh:61,wild:22,mut:55},
  // Eigene Gestalt: Zuchtziel war ein „Löwe“ als Stadtwappen von Leonberg. Groß, kräftig, langes Fell (rough), Mähne (ruff), buschige tief hängende Rute (bushy)
  shape:{head:'lb',L:32,leg:1.06,thick:1.06,chest:1.1,tuck:.8,withers:.5,crest:10.8,dew:4.6,tailW:5.2,tailSeg:2.7,tailUp:.4,tailCurl:.06,bushy:1,legW:1.08,hindW:1.08,neckX:.8,neckY:-1,rough:1,ruff:1,mouth:{x:12,y:1.8},eye:{x:4.3,y:-4.5},whiteChest:.15,earCut:0,collar:.35},
  // Lautpaket: tief und voll, bellt mäßig, Knurren tief
  sound:{barkF:118,barkF1:[620,440,350],barkF2:[1040,820,700],barkLen:.38,barkRate:.3,huff:.4,growlF:50,growlLp:1700,yelpF:450,whineF:580,vol:.86},
  coats:[
   {id:'loewengelb',name:'Löwengelb',w:.4,base:'#c4924e',light:'#dcb070',shade:'#946a30',dark:'#2e2014'},
   {id:'rot',name:'Rot',w:.25,base:'#a8603a',light:'#c47e56',shade:'#7a4224',dark:'#2a1810'},
   {id:'rotbraun',name:'Rotbraun',w:.2,base:'#8a4e2e',light:'#a86a46',shade:'#62361e',dark:'#24140c'},
   {id:'sand',name:'Sand',w:.15,base:'#c8aa7a',light:'#dec49a',shade:'#987c50',dark:'#3a2e1e'}]},
 {id:'mastino',cm0:70,kg0:68,name:'Mastino Napoletano',active:true,look:'massig und schwer, sehr lose Haut mit tiefen Falten am ganzen Kopf, riesige Wamme in Lagen, schwere Hängelefzen, hängende Augenlider, Ohren oft kupiert',fur:'Grau (Blei), Schwarz, Mahagoni oder Falb',werte:{kraft:76,biss:64,tempo:32,ausdauer:36,zaeh:85,wild:40,mut:70},
  // Eigene Gestalt: Wachhund aus Neapel, direkter Nachfahre der römischen Molosser. Lang und schwer, sehr tiefe Brust, kaum Taille, lose Hautfalten an Hals und Schultern, riesige Wamme, schwere Knochen, Rute dick und tief getragen
  shape:{head:'mn',L:32,leg:.98,thick:1.12,chest:1.4,tuck:.4,withers:.4,crest:10,dew:8.6,tailW:5,tailSeg:2.5,tailUp:.35,tailCurl:-.03,legW:1.14,hindW:1.08,neckX:.2,neckY:.4,folds:1,mouth:{x:11.6,y:2.8},eye:{x:4.3,y:-4.1},whiteChest:.12,earCut:.5,collar:.3},
  // Lautpaket: sehr tief und dröhnend, bellt selten, schnaubt und sabbert, Knurren sehr tief
  sound:{barkF:102,barkF1:[580,400,320],barkF2:[980,780,660],barkLen:.44,barkRate:.18,huff:.9,growlF:45,growlLp:1550,yelpF:400,whineF:530,vol:.9},
  coats:[
   {id:'grau',name:'Grau (Blei)',w:.5,base:'#5e6064',light:'#7e8084',shade:'#404246',dark:'#26272a'},
   {id:'schwarz',name:'Schwarz',w:.2,base:'#2a2828',light:'#444040',shade:'#1a1919',dark:'#0e0d0d'},
   {id:'mahagoni',name:'Mahagoni',w:.2,base:'#6e3e2a',light:'#8c5640',shade:'#4c2a1c',dark:'#2c180f'},
   {id:'falb',name:'Falb',w:.1,base:'#a88458',light:'#c4a278',shade:'#7c5e38',dark:'#4a3820'}]},
 {id:'tibet',cm0:66,kg0:58,name:'Tibetdogge',active:true,look:'groß, dichtes langes Doppelfell, Löwenmähne um Hals und Schultern, breiter schwerer Kopf, V-Hängeohren, buschige Rute über dem Rücken geringelt',fur:'Schwarz mit Lohfarbe, Schwarz, Gold oder Braun',werte:{kraft:64,biss:64,tempo:44,ausdauer:64,zaeh:73,wild:55,mut:64},
  // Eigene Gestalt: Wachhund der Klöster und Nomaden im Himalaya (Do Khyi). Dichtes langes Fell, mächtige Mähne, Hosen an den Hinterläufen, buschige Rute hoch über dem Rücken geringelt
  shape:{head:'tb',L:30.5,leg:1.02,thick:1.12,chest:1.1,tuck:.4,withers:.5,crest:11.6,dew:5.6,tailW:5.4,tailSeg:2.5,tailUp:-1.5,tailCurl:.3,bushy:1,legW:1.14,hindW:1.12,neckX:.4,neckY:-.8,rough:1,ruff:1,mouth:{x:11.2,y:2},eye:{x:4.3,y:-4.5},whiteChest:.1,earCut:0,collar:.35},
  // Lautpaket: sehr tief, voll und hallend (berühmtes Bellen), bellt mäßig, nachts mehr; Knurren tief
  sound:{barkF:106,barkF1:[600,410,330],barkF2:[1010,800,680],barkLen:.46,barkRate:.4,huff:.4,growlF:48,growlLp:1650,yelpF:430,whineF:560,vol:.9},
  coats:[
   {id:'schwarzloh',name:'Schwarz mit Lohfarbe',w:.45,base:'#2a2420',light:'#463c34',shade:'#1a1613',dark:'#0f0c0a',tan:'#a8683a'},
   {id:'schwarz',name:'Schwarz',w:.2,base:'#262220',light:'#423a36',shade:'#181514',dark:'#0e0c0b'},
   {id:'gold',name:'Gold',w:.2,base:'#c08a48',light:'#dcaa6c',shade:'#905e2c',dark:'#5a3a18'},
   {id:'braun',name:'Braun',w:.15,base:'#5a3a26',light:'#765038',shade:'#3e2818',dark:'#24160c'}]},
 {id:'mastiff',name:'Alter Mastiff',active:true,look:'breiter Kopf, schwere Brust, Hängelefzen, Schlappohren',fur:'Falb, Apricot oder gestromt, schwarze Maske',
  cm0:76,kg0:80,sound:{barkF:112,barkF1:[620,420,340],barkF2:[1050,820,700],barkLen:.38,barkRate:.25,huff:.75,growlF:50,growlLp:1700,yelpF:430,whineF:560,vol:.85},werte:{kraft:79,biss:70,tempo:36,ausdauer:40,zaeh:76,wild:31,mut:67},
  coats:[
   {id:'falb',name:'Falb',w:.58,base:'#c49b5d',light:'#ddbc86',shade:'#946f3f',dark:'#644827'},
   {id:'apricot',name:'Apricot',w:.26,base:'#c4834b',light:'#dea56c',shade:'#925c31',dark:'#61381c'},
   {id:'gestromt',name:'Gestromt',w:.16,base:'#93714a',light:'#b08e5f',shade:'#664b31',dark:'#3d2c1d',stripe:'#2c1f15'}]},
 {id:'bernhardiner',cm0:76,kg0:74,name:'Bernhardiner',active:true,look:'sehr groß und massig, mächtiger Kopf, kurze Schnauze, Hängelefzen, dunkle Maske um die Augen, weiße Blesse, Hängeohren, langes oder kurzes Fell, buschige hängende Rute',fur:'Weiß mit rotbraunen Platten oder rotbraunem Mantel, weiße Brust, Pfoten, Blesse und Rutenspitze',werte:{kraft:73,biss:49,tempo:36,ausdauer:52,zaeh:70,wild:22,mut:52},
  // Eigene Gestalt: Hospizhund vom Großen St. Bernhard, Lawinenhund. Sehr massig, breite tiefe Brust, schwere Knochen, Wamme, langes Fell, buschige tief hängende Rute; Platten (patch) oder Mantel (saddle)
  shape:{head:'bh2',L:32,leg:1,thick:1.12,chest:1.3,tuck:.5,withers:.5,crest:10.4,dew:6.4,tailW:5.4,tailSeg:2.6,tailUp:.4,tailCurl:.04,bushy:1,legW:1.16,hindW:1.1,neckX:.3,neckY:-.2,rough:1,piebald:1,saddle:2.6,mouth:{x:11.2,y:2.6},eye:{x:4.3,y:-4.3},whiteChest:1,earCut:0,collar:.25,whiteFeet:.9},
  // Lautpaket: sehr tief und dröhnend, bellt selten, schnaubt, Knurren tief
  sound:{barkF:104,barkF1:[580,400,320],barkF2:[990,780,660],barkLen:.44,barkRate:.18,huff:.7,growlF:46,growlLp:1600,yelpF:420,whineF:550,vol:.88},
  coats:[
   {id:'platten',name:'Weiß mit Platten',w:.55,base:'#ece6da',light:'#faf6ee',shade:'#c4bcae',dark:'#8e6040',patch:'#9a5a30',patchHi:'#b8764a',tailTip:'#f2ece2'},
   {id:'mantel',name:'Rotbrauner Mantel',w:.45,base:'#ece6da',light:'#faf6ee',shade:'#c4bcae',dark:'#6e3e20',saddle:'#94522a',belly:'#ece6da',tailTip:'#f2ece2'}]},
 {id:'malamute',cm0:63,kg0:39,name:'Alaskan Malamute',active:true,look:'kräftiger Schlittenhund, dichtes Doppelfell, breiter Kopf mit Gesichtsmaske, kleine dreieckige Stehohren, buschige Federrute über dem Rücken, weiße Unterseite',fur:'Grau-Weiß, Schwarz-Weiß, Sable-Weiß oder Rot-Weiß; weißes Gesicht mit Kappe und Brille, weiße Unterseite und Läufe',werte:{kraft:67,biss:52,tempo:52,ausdauer:88,zaeh:64,wild:40,mut:49},
  // Eigene Gestalt: arktischer Lastschlittenhund. Kräftig, tiefe Brust, schwere Knochen, dichtes Fell mit Halskrause, buschige Federrute locker über dem Rücken; weiße Unterseite über urajiro/belly
  shape:{head:'mm',L:30.5,leg:1.04,thick:1.04,chest:1.1,tuck:.8,withers:.5,crest:10.4,dew:4,tailW:5.4,tailSeg:2.6,tailUp:-1.3,tailCurl:.22,bushy:1,legW:1.1,hindW:1.08,neckX:.4,neckY:-1,ruff:1,urajiro:1,mouth:{x:11.6,y:1.8},eye:{x:4.3,y:-4.6},whiteChest:0,earCut:0,collar:.35,whiteFeet:1},
  // Lautpaket: bellt kaum, „wuuu“-Heulen und Plappern (tief), Knurren mittel
  sound:{barkF:128,barkF1:[640,470,370],barkF2:[1080,860,720],barkLen:.5,barkRate:.12,huff:.4,growlF:54,growlLp:1900,yelpF:500,whineF:620,vol:.82},
  coats:[
   {id:'grau',name:'Grau-Weiß',w:.45,base:'#7c7a76',light:'#9c9a94',shade:'#58564f',dark:'#34322e',belly:'#ece8e0',tailTip:'#ece8e0'},
   {id:'schwarz',name:'Schwarz-Weiß',w:.25,base:'#2e2c2a',light:'#4a4642',shade:'#1e1c1b',dark:'#121110',belly:'#ece8e0',tailTip:'#ece8e0'},
   {id:'sable',name:'Sable-Weiß',w:.2,base:'#7a5a3e',light:'#987656',shade:'#563e28',dark:'#2e2014',belly:'#ece6d8',tailTip:'#ece6d8'},
   {id:'rot',name:'Rot-Weiß',w:.1,base:'#a8683c',light:'#c48658',shade:'#7a4624',dark:'#4a2a14',belly:'#efe8da',tailTip:'#efe8da'}]},
 {id:'bordeaux',cm0:63,kg0:52,name:'Bordeauxdogge',active:true,look:'gedrungen und kräftig, riesiger breiter Kopf mit tiefen Falten, kurze aufgeworfene Schnauze mit Vorbiss, schwere Lefzen, kleine Hängeohren, Wamme',fur:'Falb von Mahagoni bis Isabell, rotbraune oder schwarze Maske',werte:{kraft:70,biss:70,tempo:38,ausdauer:40,zaeh:73,wild:46,mut:70},
  // Eigene Gestalt: französischer Wach- und Kampfhund. Gedrungen, kurze Läufe, breite tiefe Brust, Wamme, sehr dicker Nacken, Rute dick und tief getragen; der Kopf ist im Verhältnis der größte aller Hunde
  shape:{head:'bx',L:30,leg:.94,thick:1.1,chest:1.3,tuck:.6,withers:.5,crest:10.6,dew:6.6,tailW:4.8,tailSeg:2.5,tailUp:.35,tailCurl:-.04,legW:1.12,hindW:1.06,neckX:.1,neckY:0,mouth:{x:10.6,y:2.4},eye:{x:4.3,y:-4.4},whiteChest:.15,earCut:0,collar:.35},
  // Lautpaket: tief, rau und kurz, bellt selten, schnaubt viel (kurze Schnauze), Knurren tief
  sound:{barkF:112,barkF1:[620,430,340],barkF2:[1040,820,690],barkLen:.32,barkRate:.25,huff:.85,growlF:49,growlLp:1700,yelpF:440,whineF:570,vol:.88},
  coats:[
   {id:'mahagoni',name:'Mahagoni',w:.45,base:'#9a4e2c',light:'#b86a44',shade:'#6c341a',dark:'#401e0e'},
   {id:'rotfalb',name:'Rotfalb',w:.35,base:'#b8743e',light:'#d4925a',shade:'#884e24',dark:'#522e12'},
   {id:'isabell',name:'Isabell',w:.2,base:'#c8a070',light:'#e0bc90',shade:'#987448',dark:'#5e4628'}]},
 {id:'bullmastiff',cm0:65,kg0:54,name:'Bullmastiff',active:true,look:'kräftig und ebenmäßig, kurzes Fell, großer quadratischer Kopf, kurze breite Schnauze, schwarze Maske, dunkle V-Ohren, Stirnfalten bei Aufmerksamkeit',fur:'Falb, Rot oder gestromt, immer schwarze Maske und dunkle Ohren',werte:{kraft:67,biss:64,tempo:48,ausdauer:46,zaeh:67,wild:46,mut:70},
  // Eigene Gestalt: englischer Wildhüterhund (stellt Wilderer), aus Mastiff und Bulldogge. Kräftig, fast quadratisch, gerader kurzer Rücken, breite tiefe Brust, Rute hoch angesetzt und hängend
  shape:{head:'bm',L:30,leg:1,thick:1.04,chest:1.1,tuck:1.1,withers:.5,crest:10.4,dew:4.4,tailW:4.4,tailSeg:2.6,tailUp:.1,tailCurl:-.05,legW:1.08,hindW:1.06,neckX:.3,neckY:-.5,mouth:{x:10.8,y:2},eye:{x:4.4,y:-4.6},whiteChest:.1,earCut:0,collar:.4},
  // Lautpaket: tief, bellt selten (stellt stumm), schnaubt, Knurren tief
  sound:{barkF:116,barkF1:[630,440,350],barkF2:[1060,830,700],barkLen:.34,barkRate:.2,huff:.65,growlF:50,growlLp:1750,yelpF:450,whineF:580,vol:.86},
  coats:[
   {id:'falb',name:'Falb',w:.4,base:'#c09660',light:'#dab684',shade:'#906c3e',dark:'#584026'},
   {id:'rot',name:'Rot',w:.35,base:'#a8603a',light:'#c47e56',shade:'#7a4224',dark:'#482614'},
   {id:'gestromt',name:'Gestromt',w:.25,base:'#8c6844',light:'#aa845c',shade:'#644a2e',dark:'#3a2a1a',stripe:'#24180e'}]},
 {id:'wolfshund',cm0:86,kg0:60,name:'Irischer Wolfshund',active:true,look:'riesig, hochbeinig, zottelig, langer Kopf mit Bart, kleine Rosenohren, lange Rute',fur:'Graues Rauhaar',werte:{kraft:55,biss:49,tempo:84,ausdauer:54,zaeh:40,wild:22,mut:49},
  // Eigene Gestalt: lange Beine, schlanker Rumpf, tiefe Brust, stark aufgezogener Bauch, langer Hals, Rauhaar
  shape:{head:'wh',L:33,leg:1.2,thick:.84,chest:1.6,tuck:2.6,withers:0,crest:7.2,dew:4,tailW:3.2,tailSeg:3.3,tailUp:-.2,tailCurl:-.13,legW:.84,hindW:.86,neckX:2.2,neckY:-2.6,rough:1,mouth:{x:13,y:1.7},eye:{x:4,y:-4.1},whiteChest:.1,earCut:0},
  // Lautpaket: tief, aber weicher und länger als der Mastiff, bellt selten, kaum Schnauben, Knurren leise und dunkel
  sound:{barkF:122,barkF1:[600,440,350],barkF2:[1000,800,680],barkLen:.42,barkRate:.22,huff:.3,growlF:54,growlLp:1700,yelpF:470,whineF:600,vol:.8},
  coats:[{id:'grau',name:'Graues Rauhaar',w:1,base:'#8c8a84',light:'#aeaba3',shade:'#64625c',dark:'#3e3d39'}]},
 {id:'neufundlaender',cm0:70,kg0:64,name:'Neufundländer',active:true,look:'groß und massig, dichtes langes wasserabweisendes Fell, breiter massiver Kopf, kurze quadratische Schnauze, kleine Hängeohren dicht am Kopf, lange buschige hängende Rute',fur:'Schwarz, Braun oder Landseer (weiß mit schwarzen Platten, schwarzer Kopf)',werte:{kraft:67,biss:43,tempo:40,ausdauer:58,zaeh:67,wild:22,mut:49},
  // Eigene Gestalt: Arbeits- und Wasserrettungshund aus Neufundland. Groß, massig, breiter Rücken, tiefe Brust, schwere Knochen, langes dichtes Fell, Schwimmhäute; Landseer über Platten (patch)
  shape:{head:'nf',L:31.5,leg:1,thick:1.14,chest:1.2,tuck:.4,withers:.4,crest:10.6,dew:5,tailW:5.6,tailSeg:2.7,tailUp:.45,tailCurl:.05,bushy:1,legW:1.16,hindW:1.1,neckX:.3,neckY:-.4,rough:1,piebald:1,mouth:{x:11.2,y:2.2},eye:{x:4.3,y:-4.4},whiteChest:.15,earCut:0,collar:.25},
  // Lautpaket: sehr tief und weich, bellt selten, Knurren tief
  sound:{barkF:106,barkF1:[580,400,320],barkF2:[980,780,660],barkLen:.44,barkRate:.15,huff:.5,growlF:46,growlLp:1600,yelpF:420,whineF:550,vol:.85},
  coats:[
   {id:'schwarz',name:'Schwarz',w:.6,base:'#262321',light:'#423c38',shade:'#181615',dark:'#0e0d0c'},
   {id:'braun',name:'Braun',w:.25,base:'#4e3324',light:'#6a4834',shade:'#342218',dark:'#1e140c'},
   {id:'landseer',name:'Landseer',w:.15,base:'#ece8e0',light:'#faf8f2',shade:'#c4beb2',dark:'#262321',patch:'#262321',patchHi:'#423c38',tailTip:'#ece8e0'}]},
 {id:'ridgeback',cm0:65,kg0:36,name:'Rhodesian Ridgeback',active:true,look:'schlank und athletisch, kurzes Fell mit dem „Ridge“ (Haarkamm gegen den Strich auf dem Rücken, vorn zwei Wirbel), tiefe Brust, flacher Schädel, lange Schnauze, hoch angesetzte Hängeohren',fur:'Weizenfarben von hell bis rot, manchmal dunkle Schnauze',werte:{kraft:46,biss:49,tempo:70,ausdauer:76,zaeh:55,wild:52,mut:70},
  // Eigene Gestalt: afrikanischer Löwenhund (stellt Löwen, bis der Jäger kommt). Schlank, hochbeinig, tiefe Brust, deutlich aufgezogener Bauch, lange leicht gebogene Rute; neuer Gestaltwert ridge: Haarkamm auf dem Rücken
  shape:{head:'rr',L:31,leg:1.1,thick:.88,chest:1.1,tuck:2,withers:.4,crest:8.6,dew:3,tailW:3.8,tailSeg:2.6,tailUp:-.1,tailCurl:.03,legW:.94,hindW:.96,neckX:1,neckY:-1,ridge:1,mouth:{x:12.6,y:1.7},eye:{x:4.3,y:-4.4},whiteChest:.15,earCut:0,collar:.3},
  // Lautpaket: mittlere Stimme, bellt selten (ruhiger Jäger), Knurren mittel
  sound:{barkF:140,barkF1:[700,510,400],barkF2:[1180,920,760],barkLen:.3,barkRate:.25,huff:.25,growlF:58,growlLp:2100,yelpF:520,whineF:660,vol:.82},
  coats:[
   {id:'weizenrot',name:'Rot-Weizen',w:.45,base:'#b07440',light:'#cc925e',shade:'#824f26',dark:'#4e2e14'},
   {id:'weizenhell',name:'Hell-Weizen',w:.35,base:'#c8a064',light:'#e0bc86',shade:'#987440',dark:'#5e4424'},
   {id:'rot',name:'Rot',w:.2,base:'#9c5a30',light:'#ba7a4c',shade:'#6e3c1c',dark:'#40220e'}]},
 {id:'komondor',cm0:72,kg0:52,name:'Komondor',active:true,look:'groß und kräftig, ganzer Körper in langen weißen Filzschnüren (Zotteln) bis zum Boden, Kopf verschwindet unter den Schnüren, Augen kaum sichtbar, buschige hängende Rute',fur:'Weiß (cremeweiß), dunkle Haut, schwarze Nase',werte:{kraft:58,biss:55,tempo:46,ausdauer:64,zaeh:76,wild:61,mut:73},
  // Eigene Gestalt: ungarischer Herdenschutzhund. Groß, kräftig, ganzer Körper mit langen Filzschnüren bedeckt (neuer Gestaltwert cords), die bis über die Läufe hängen; tiefe Brust, buschige hängende Rute
  shape:{head:'ko',L:31,leg:1.02,thick:1.12,chest:1,tuck:.2,withers:.5,crest:10.8,dew:5,tailW:5.6,tailSeg:2.6,tailUp:.45,tailCurl:.06,bushy:1,legW:1.18,hindW:1.14,neckX:.4,neckY:-.6,cords:1,mouth:{x:11.6,y:2},eye:{x:4.3,y:-4.4},whiteChest:0,earCut:0,collar:0},
  // Lautpaket: tief und laut, warnt oft (Herdenschutz), Knurren tief
  sound:{barkF:114,barkF1:[610,430,340],barkF2:[1030,810,690],barkLen:.38,barkRate:.5,huff:.35,growlF:50,growlLp:1750,yelpF:450,whineF:580,vol:.86},
  coats:[{id:'weiss',name:'Cremeweiß',w:1,base:'#e6dfcf',light:'#f4efe4',shade:'#bdb3a0',dark:'#8e8472',tailTip:'#e6dfcf'}]},
 {id:'akita',cm0:66,kg0:40,name:'Akita Inu',active:true,look:'kräftig, dichtes Doppelfell, breiter Kopf, kleine dreieckige Stehohren nach vorn geneigt, kleine tiefliegende Augen, große Ringelrute über dem Rücken, weiße Abzeichen (Urajiro)',fur:'Rot-Falb, Sesam, gestromt oder Weiß; Urajiro (weiß an Backen, Schnauzenseiten, Brust, Bauch, Innenseite der Läufe)',werte:{kraft:52,biss:55,tempo:56,ausdauer:66,zaeh:61,wild:58,mut:70},
  // Eigene Gestalt: japanischer Jagd- und Wachhund (Bär, Wildschwein). Kräftig, dichtes Fell, tiefe Brust, große buschige Rute in einem Ring über dem Rücken; neuer Gestaltwert urajiro: weiße Unterseite
  shape:{head:'ak',L:30,leg:1.04,thick:1.02,chest:1,tuck:1,withers:.5,crest:10,dew:3.6,tailW:5.2,tailSeg:2.5,tailUp:-1.6,tailCurl:.34,bushy:1,legW:1.04,hindW:1.06,neckX:.4,neckY:-1,urajiro:1,mouth:{x:11.6,y:1.8},eye:{x:4.4,y:-4.6},whiteChest:0,earCut:0,collar:.3},
  // Lautpaket: bellt selten (still und würdevoll), dafür murmelnde Laute, Knurren mittel-tief
  sound:{barkF:136,barkF1:[700,510,400],barkF2:[1180,920,760],barkLen:.3,barkRate:.15,huff:.45,growlF:56,growlLp:2000,yelpF:520,whineF:660,vol:.82},
  coats:[
   {id:'rot',name:'Rot-Falb',w:.5,base:'#c07a3e',light:'#dc985c',shade:'#905624',dark:'#583212',belly:'#efe6d6'},
   {id:'sesam',name:'Sesam',w:.2,base:'#a86e3a',light:'#c48c56',shade:'#704622',dark:'#2c1c10',belly:'#efe6d6',stripe:'#3a281a'},
   {id:'gestromt',name:'Gestromt',w:.15,base:'#6e5440',light:'#8a6c56',shade:'#4c3828',dark:'#2c2018',belly:'#e6dccb',stripe:'#1e160e'},
   {id:'weiss',name:'Weiß',w:.15,base:'#ece6da',light:'#faf6ee',shade:'#c4bcae',dark:'#948c7e',belly:'#f6f2ea'}]},
 {id:'dobermann',cm0:68,kg0:38,name:'Dobermann',active:true,look:'schlank, elegant und muskulös, fast quadratisch, kurzes glänzendes Fell, langer Hals, langer keilförmiger Kopf, Ohren meist kupiert (hohe Stehohren), stark aufgezogener Bauch',fur:'Schwarz oder Braun mit rostroten Abzeichen (Schnauze, Backen, Brauenpunkte, Kehle, Brust, Läufe, unter der Rute); selten Blau',werte:{kraft:46,biss:52,tempo:74,ausdauer:70,zaeh:46,wild:55,mut:70},
  // Eigene Gestalt: deutscher Schutzhund (Steuereintreiber Dobermann). Fast quadratisch, hochbeinig, schmal, sehr stark aufgezogener Bauch, langer Hals, Kopf hoch getragen, dünne Rute
  shape:{head:'db',L:29,leg:1.12,thick:.86,chest:.9,tuck:2.2,withers:.7,crest:8.4,dew:2.6,tailW:3.4,tailSeg:2.6,tailUp:-.4,tailCurl:.02,legW:.92,hindW:.96,neckX:1.6,neckY:-2,mouth:{x:12.8,y:1.6},eye:{x:4.3,y:-4.6},whiteChest:0,earCut:.7,collar:.3},
  // Lautpaket: mittel bis hell, scharf und kurz, bellt mäßig oft, Knurren mittel
  sound:{barkF:150,barkF1:[760,560,430],barkF2:[1280,1000,820],barkLen:.26,barkRate:.5,huff:.25,growlF:60,growlLp:2300,yelpF:560,whineF:700,vol:.82},
  coats:[
   {id:'schwarzrot',name:'Schwarz-Rost',w:.6,base:'#262120',light:'#423936',shade:'#181514',dark:'#0e0c0b',tan:'#a85a2c'},
   {id:'braunrot',name:'Braun-Rost',w:.3,base:'#5a2e1c',light:'#784432',shade:'#3e1e12',dark:'#24100a',tan:'#b8703c'},
   {id:'blau',name:'Blau-Rost',w:.1,base:'#4e5258',light:'#6a6e74',shade:'#36393e',dark:'#202226',tan:'#b07448'}]},
 {id:'sharpei',cm0:48,kg0:24,name:'Shar-Pei',active:true,look:'mittelgroß und kompakt, lose Haut mit tiefen Falten an Kopf, Hals und Schultern, borstiges kurzes Fell, breite „Nilpferd“-Schnauze, kleine tiefliegende Augen, winzige anliegende Ohren, dicke Ringelrute hoch getragen, blauschwarze Zunge',fur:'Rehbraun, Rot, Schwarz, Creme oder Blau',werte:{kraft:37,biss:46,tempo:46,ausdauer:54,zaeh:70,wild:46,mut:58},
  // Eigene Gestalt: chinesischer Wach- und Kampfhund; die lose Haut lässt ihn sich im Griff des Gegners drehen. Kompakt, quadratisch, kurzer Rücken, Falten (folds 2: auch an Flanke und Hals), dicke Ringelrute
  shape:{head:'sp2',L:27,leg:.96,thick:1.06,chest:1,tuck:1,withers:.6,crest:10.4,dew:5.6,tailW:4.6,tailSeg:2.2,tailUp:-1.5,tailCurl:.32,legW:1.06,hindW:1.04,neckX:.2,neckY:-.4,folds:2,mouth:{x:10.6,y:2},eye:{x:4.3,y:-4.3},whiteChest:0,earCut:0,collar:.4},
  // Lautpaket: mitteltief, bellt selten, schnaubt, Knurren tief und rau
  sound:{barkF:140,barkF1:[700,500,400],barkF2:[1160,910,750],barkLen:.26,barkRate:.2,huff:.6,growlF:56,growlLp:2000,yelpF:520,whineF:660,vol:.8},
  coats:[
   {id:'rehbraun',name:'Rehbraun',w:.4,base:'#b8824e',light:'#d29e6a',shade:'#885a30',dark:'#563618'},
   {id:'rot',name:'Rot',w:.2,base:'#a05a34',light:'#bc764e',shade:'#723e20',dark:'#422210'},
   {id:'schwarz',name:'Schwarz',w:.15,base:'#2a2624',light:'#46403c',shade:'#1a1716',dark:'#0e0c0b'},
   {id:'creme',name:'Creme',w:.15,base:'#d8c098',light:'#ecd8b4',shade:'#a8906a',dark:'#6a5638'},
   {id:'blau',name:'Blau',w:.1,base:'#5e646c',light:'#7c828a',shade:'#42474e',dark:'#272a30'}]},
 {id:'schaeferhund',cm0:62,kg0:35,name:'Deutscher Schäferhund',active:true,look:'mittelgroß, länger als hoch, abfallende Rückenlinie, große Stehohren, keilförmiger Kopf, buschige Säbelrute',fur:'Schwarzer Sattel auf Lohfarbe, Schwarz oder Grau (wolfsfarben); dunkle Maske',werte:{kraft:43,biss:52,tempo:66,ausdauer:80,zaeh:52,wild:49,mut:67},
  // Eigene Gestalt: Hüte- und Diensthund. Länger als hoch, hoher Widerrist, abfallende Rückenlinie, tiefe Brust, buschige tief hängende Säbelrute, Stockhaar mit Sattel
  shape:{head:'sh',L:32,leg:1.04,thick:.9,chest:1,tuck:1.6,withers:1.2,crest:9,dew:3,tailW:4.6,tailSeg:2.6,tailUp:.3,tailCurl:.03,bushy:1,legW:.98,hindW:1.02,neckX:1,neckY:-1.4,saddle:1,mouth:{x:12.4,y:1.6},eye:{x:4.3,y:-4.5},whiteChest:0,earCut:0,collar:.4},
  // Lautpaket: mittlere Stimme, kräftiges Bellen, bellt oft (Wach- und Hütehund), Knurren mittel
  sound:{barkF:146,barkF1:[740,540,420],barkF2:[1240,970,800],barkLen:.28,barkRate:.6,huff:.25,growlF:58,growlLp:2200,yelpF:540,whineF:680,vol:.82},
  coats:[
   {id:'sattel',name:'Schwarz-Loh (Sattel)',w:.55,base:'#a8703c',light:'#c48e58',shade:'#7a4e24',dark:'#2a1e14',saddle:'#211c19',belly:'#c89a66'},
   {id:'grau',name:'Grau (wolfsfarben)',w:.3,base:'#8a7a62',light:'#a8987e',shade:'#625644',dark:'#2c2620',saddle:'#3a342c',belly:'#b2a284'},
   {id:'schwarz',name:'Schwarz',w:.15,base:'#272321',light:'#423b37',shade:'#191615',dark:'#0f0d0c',saddle:'#1d1a18',belly:'#3a332e'}]},
 {id:'chow',cm0:52,kg0:27,name:'Chow-Chow',active:true,look:'kompakt und kräftig, dichtes abstehendes Fell mit Löwenmähne, breiter flacher Schädel, kurze breite Schnauze, finsterer Blick, kleine dicke runde Stehohren, gerade steife Hinterläufe, Ringelrute flach auf dem Rücken, blauschwarze Zunge',fur:'Rot, Schwarz, Blau, Zimt oder Creme',werte:{kraft:43,biss:49,tempo:38,ausdauer:48,zaeh:58,wild:55,mut:64},
  // Eigene Gestalt: chinesischer Wach- und Jagdhund. Kompakt, quadratisch, tiefe Brust, dichtes Fell (rough), Löwenmähne (ruff), buschige Rute flach über dem Rücken
  shape:{head:'ch',L:27.5,leg:.98,thick:1.14,chest:1,tuck:.6,withers:.4,crest:11.4,dew:4.6,tailW:5.6,tailSeg:2.4,tailUp:-1.75,tailCurl:.34,bushy:1,legW:1.12,hindW:1.08,neckX:.2,neckY:-.6,rough:1,ruff:1,mouth:{x:10.8,y:1.8},eye:{x:4.3,y:-4.5},whiteChest:0,earCut:0,collar:.3},
  // Lautpaket: tief und kurz, bellt selten (zurückhaltend), Knurren tief
  sound:{barkF:132,barkF1:[680,490,390],barkF2:[1140,900,740],barkLen:.28,barkRate:.2,huff:.45,growlF:54,growlLp:1900,yelpF:510,whineF:650,vol:.8},
  coats:[
   {id:'rot',name:'Rot',w:.5,base:'#b06a34',light:'#cc8a52',shade:'#80461c',dark:'#4c280e',tailTip:'#cc8a52'},
   {id:'schwarz',name:'Schwarz',w:.2,base:'#272321',light:'#433c38',shade:'#191615',dark:'#0f0d0c',tailTip:'#433c38'},
   {id:'blau',name:'Blau',w:.1,base:'#5a606a',light:'#787e88',shade:'#3e434c',dark:'#24272e',tailTip:'#787e88'},
   {id:'zimt',name:'Zimt',w:.1,base:'#a07a58',light:'#bc9674',shade:'#74563c',dark:'#463222',tailTip:'#bc9674'},
   {id:'creme',name:'Creme',w:.1,base:'#e0cca8',light:'#f0e2c6',shade:'#b49c78',dark:'#7a6648',tailTip:'#f0e2c6'}]},
 {id:'malinois',cm0:62,kg0:28,name:'Malinois',active:true,look:'leicht und drahtig, quadratisch, kurzes Fell, schwarze Maske, große dreieckige Stehohren, schmaler Kopf, hängende Rute',fur:'Falb (rehbraun) mit schwarzen Haarspitzen, schwarze Maske und schwarze Ohren',werte:{kraft:37,biss:55,tempo:76,ausdauer:84,zaeh:49,wild:70,mut:76},
  // Eigene Gestalt: belgischer Schäferhund, sehr schnell und wendig. Quadratisch, schlank, leicht, kurzhaarig, waagerechter Rücken, mittellange hängende Rute
  shape:{head:'ml',L:29.5,leg:1.08,thick:.84,chest:.9,tuck:1.9,withers:.6,crest:8.6,dew:2.6,tailW:3.8,tailSeg:2.6,tailUp:.25,tailCurl:.04,legW:.9,hindW:.94,neckX:1.2,neckY:-1.6,mouth:{x:12.2,y:1.6},eye:{x:4.3,y:-4.5},whiteChest:.1,earCut:0,collar:.4},
  // Lautpaket: hell, scharf, bellt oft (sehr lebhaft), Knurren mittel
  sound:{barkF:160,barkF1:[780,580,450],barkF2:[1320,1030,840],barkLen:.24,barkRate:.65,huff:.2,growlF:62,growlLp:2400,yelpF:600,whineF:740,vol:.8},
  coats:[
   {id:'falb',name:'Falb, schwarz überflammt',w:.75,base:'#b8824a',light:'#d4a068',shade:'#885a2c',dark:'#2a1e14'},
   {id:'rotfalb',name:'Rotfalb',w:.25,base:'#a8683a',light:'#c48656',shade:'#78461e',dark:'#26180e'}]},
 {id:'saupacker',cm0:66,kg0:40,name:'Saupacker',active:true,look:'mittelschwer, athletisch, kräftiger Nacken, mittellange Schnauze, Ohren meist kupiert',fur:'Schwarz-braun gestromt',werte:{kraft:52,biss:58,tempo:62,ausdauer:64,zaeh:58,wild:67,mut:67},
  // Eigene Gestalt: Packer für die Saujagd, etwas hochbeiniger als der Mastiff, schlanker, dicker Nacken, Taille
  shape:{head:'sp',L:30,leg:1.08,thick:.92,chest:.6,tuck:1.6,withers:.5,crest:10.4,dew:4.6,tailW:3.4,tailSeg:2.6,tailUp:.1,tailCurl:-.09,legW:.95,hindW:.95,neckX:.6,neckY:-1,mouth:{x:11.9,y:1.6},eye:{x:4.4,y:-4.4},whiteChest:.2,earCut:.6},
  // Lautpaket: mittlere Stimme, helles, scharfes Bellen und oft (Hetzhund), wenig Schnauben, Knurren mittel
  sound:{barkF:162,barkF1:[800,580,450],barkF2:[1350,1040,850],barkLen:.27,barkRate:.75,huff:.2,growlF:66,growlLp:2400,yelpF:610,whineF:730,vol:.85},
  coats:[{id:'gestromt',name:'Schwarz-braun gestromt',w:1,base:'#4e3a2a',light:'#6a503a',shade:'#33261b',dark:'#1e1610',stripe:'#14100b'}]},
 {id:'barsoi',cm0:78,kg0:40,name:'Barsoi',active:true,look:'Windhund der russischen Wolfsjagd: groß und hochbeinig, gewölbte Rückenlinie, sehr langer schmaler Kopf mit leicht gewölbtem Nasenrücken, kleine Rosenohren, seidiges gewelltes Fell mit Halskrause, Hosen und langer befederter Säbelrute',fur:'Weiß mit goldenen, roten, gestromten oder schwarzen Platten, selten ganz weiß',werte:{kraft:37,biss:37,tempo:90,ausdauer:56,zaeh:25,wild:43,mut:43},
  // Eigene Gestalt: größter Windhund, Wolfsjäger. Hochbeinig, gewölbter Rücken, Halskrause, langes welliges Fell an Bauch, Läufen und Rute
  shape:{head:'bz',L:33,leg:1.26,thick:.78,chest:2.2,tuck:3,withers:.6,crest:7.6,dew:2.2,tailW:2.8,tailSeg:3.4,tailUp:-.3,tailCurl:.14,legW:.8,hindW:.88,neckX:2.4,neckY:-1.6,mouth:{x:15,y:1.4},eye:{x:4.2,y:-4.2},whiteChest:0,earCut:0,collar:.45,piebald:1,ruff:1,silk:.8,legFeather:.9,tailFeather:1.8},
  // Lautpaket: bellt selten, tiefer als die kleinen Windhunde, kurzes heiseres Knurren
  sound:{barkF:132,barkF1:[640,480,380],barkF2:[1100,880,720],barkLen:.3,barkRate:.1,huff:.3,growlF:56,growlLp:2000,yelpF:540,whineF:700,vol:.8},
  coats:[
   {id:'gold',name:'Weiß mit goldenen Platten',w:.4,base:'#ece6da',light:'#faf6ee',shade:'#c4bcae',dark:'#8e8678',patch:'#c08a50',patchHi:'#d8a870'},
   {id:'gestromt',name:'Weiß mit gestromten Platten',w:.2,base:'#ece6da',light:'#faf6ee',shade:'#c4bcae',dark:'#8e8678',patch:'#6a5038',patchHi:'#86684c'},
   {id:'rot',name:'Weiß mit roten Platten',w:.15,base:'#ece6da',light:'#faf6ee',shade:'#c4bcae',dark:'#8e8678',patch:'#a8603a',patchHi:'#c47e56'},
   {id:'schwarz',name:'Weiß mit schwarzen Platten',w:.1,base:'#ece6da',light:'#faf6ee',shade:'#c4bcae',dark:'#8e8678',patch:'#2a2622',patchHi:'#46403a'},
   {id:'weiss',name:'Weiß',w:.15,base:'#ece8e0',light:'#faf8f2',shade:'#c8c2b6',dark:'#948e82'}]},
 {id:'deerhound',cm0:76,kg0:42,name:'Deerhound',active:true,look:'Schottischer Hirschhund: sehr groß und hochbeinig, rauhes drahtiges Fell, Bart und Augenbrauen, langer Kopf, kleine dunkle Rosenohren, lange tief getragene Rute',fur:'Dunkelblaugrau, Grau, Gestromt-Grau oder Sandrot',werte:{kraft:37,biss:34,tempo:86,ausdauer:60,zaeh:31,wild:28,mut:40},
  // Eigene Gestalt: wie ein Greyhound in zotteligem Rauhaar, schlanker als der Irische Wolfshund, Bart und Brauen
  shape:{head:'dh',L:33,leg:1.22,thick:.82,chest:1.8,tuck:2.6,withers:.5,crest:7.6,dew:2.4,tailW:3,tailSeg:3.3,tailUp:-.3,tailCurl:.12,legW:.86,hindW:.92,neckX:2.2,neckY:-1.8,mouth:{x:14,y:1.4},eye:{x:4.2,y:-4.2},whiteChest:.15,earCut:0,collar:.4,rough:1},
  sound:{barkF:120,barkF1:[600,450,360],barkF2:[1020,820,680],barkLen:.34,barkRate:.12,huff:.4,growlF:52,growlLp:1900,yelpF:520,whineF:680,vol:.85},
  coats:[
   {id:'blaugrau',name:'Dunkelblaugrau',w:.45,base:'#5e646a',light:'#7c8288',shade:'#42474c',dark:'#282b2e'},
   {id:'grau',name:'Grau',w:.25,base:'#8a8680',light:'#a8a49c',shade:'#646058',dark:'#3a3834'},
   {id:'gestromt',name:'Gestromt-Grau',w:.15,base:'#6e6458',light:'#8a8072',shade:'#4e463c',dark:'#2e2a24',stripe:'#2a241e'},
   {id:'sandrot',name:'Sandrot',w:.15,base:'#b08458',light:'#c8a074',shade:'#845e3a',dark:'#503822'}]},
 {id:'taigan',cm0:66,kg0:30,name:'Taigan',active:true,look:'Bergwindhund aus Kirgisien: kräftiger als die Steppenwindhunde, dichtes langes Fell gegen die Kälte, befederte Hängeohren, Fransen an den Läufen, Rute mit Ring am Ende',fur:'Schwarz-Loh, Grau, Falb, Weiß oder Gestromt',werte:{kraft:31,biss:37,tempo:84,ausdauer:80,zaeh:43,wild:40,mut:43},
  // Eigene Gestalt: Windhund im Winterpelz, Ringelrute, hängt mit Fransenohren, jagt in den Bergen Wölfe und Steinböcke
  shape:{head:'tg',L:31,leg:1.14,thick:.88,chest:1.4,tuck:2,withers:.3,crest:7.8,dew:2.6,tailW:2.8,tailSeg:2.8,tailUp:.5,tailCurl:.14,tailRing:.6,legW:.88,hindW:.96,neckX:1.8,neckY:-2,mouth:{x:13.4,y:1.4},eye:{x:4.2,y:-4.2},whiteChest:.3,earCut:0,collar:.3,silk:.9,legFeather:.8,tailFeather:.8},
  sound:{barkF:138,barkF1:[660,500,390],barkF2:[1140,900,740],barkLen:.3,barkRate:.25,huff:.35,growlF:56,growlLp:2000,yelpF:560,whineF:720,vol:.8},
  coats:[
   {id:'schwarzloh',name:'Schwarz-Loh',w:.3,base:'#2a2420',light:'#463c34',shade:'#1a1613',dark:'#0f0c0a',tan:'#b07a48'},
   {id:'grau',name:'Grau',w:.2,base:'#8a8680',light:'#aaa69e',shade:'#646058',dark:'#3a3834'},
   {id:'falb',name:'Falb',w:.2,base:'#c49a64',light:'#dcb886',shade:'#946e3c',dark:'#5a4224'},
   {id:'weiss',name:'Weiß',w:.15,base:'#ece6da',light:'#faf6ee',shade:'#c4bcae',dark:'#8e8678'},
   {id:'gestromt',name:'Gestromt',w:.15,base:'#8a6a48',light:'#a88660',shade:'#624a30',dark:'#3a2a1a',stripe:'#24180e'}]},
 {id:'lurcher',cm0:66,kg0:30,name:'Lurcher',active:true,look:'Wildererhund: Windhund gekreuzt mit Terrier oder Hütehund, kräftiger als ein reiner Windhund, struppiges Rauhaar, Bart, halb aufgestellte Ohren',fur:'Grau-Gestromt, Sand, Schwarz, Blaugrau oder Rot',werte:{kraft:34,biss:37,tempo:84,ausdauer:70,zaeh:40,wild:46,mut:46},
  // Eigene Gestalt: Mischling – Windhundbeine, kräftigerer Rumpf, Rauhaar, kurzer Bart, Kopf etwas breiter
  shape:{head:'lu',L:30,leg:1.12,thick:.92,chest:1.2,tuck:1.8,withers:.2,crest:7.8,dew:2.8,tailW:3.2,tailSeg:3,tailUp:-.1,tailCurl:.12,legW:.92,hindW:.98,neckX:1.6,neckY:-1.4,mouth:{x:13,y:1.4},eye:{x:4.2,y:-4.2},whiteChest:.35,whiteFeet:.2,earCut:0,collar:.6,rough:1},
  sound:{barkF:146,barkF1:[700,530,410],barkF2:[1200,940,780],barkLen:.24,barkRate:.5,huff:.4,growlF:60,growlLp:2200,yelpF:600,whineF:760,vol:.85},
  coats:[
   {id:'graugestromt',name:'Grau-Gestromt',w:.35,base:'#7a7064',light:'#968c7e',shade:'#585046',dark:'#34302a',stripe:'#2e2822'},
   {id:'sand',name:'Sand',w:.2,base:'#c4a476',light:'#dcbe94',shade:'#967a50',dark:'#5c4a30'},
   {id:'schwarz',name:'Schwarz',w:.2,base:'#2a2624',light:'#46403c',shade:'#1a1716',dark:'#0e0c0b'},
   {id:'blaugrau',name:'Blaugrau',w:.15,base:'#626870',light:'#80868e',shade:'#454a50',dark:'#2a2d30'},
   {id:'rot',name:'Rot',w:.1,base:'#a8643a',light:'#c4825a',shade:'#7a4424',dark:'#482814'}]},
 {id:'husky',cm0:56,kg0:23,name:'Siberian Husky',active:true,look:'mittelgroß, leicht und flink, dichtes Doppelfell, Gesichtsmaske, blaue oder braune Augen (auch zweifarbig), dreieckige Stehohren dicht beieinander, buschige Sichelrute',fur:'Grau-Weiß, Schwarz-Weiß, Rot-Weiß oder Agouti; weißes Gesicht mit Maske, weiße Unterseite',werte:{kraft:28,biss:37,tempo:68,ausdauer:95,zaeh:49,wild:34,mut:31},
  // Eigene Gestalt: Schlittenhund der Tschuktschen, leicht, schnell und ausdauernd. Mittellang, mäßig tiefe Brust, gerader Rücken, schlanke Läufe, buschige Sichelrute; weiße Unterseite über urajiro/belly
  shape:{head:'hk',L:29.5,leg:1.04,thick:.92,chest:.9,tuck:1.4,withers:.4,crest:9.2,dew:2.8,tailW:4.8,tailSeg:2.6,tailUp:-1,tailCurl:.16,bushy:1,legW:.94,hindW:.96,neckX:.8,neckY:-1.2,urajiro:1,mouth:{x:11.8,y:1.6},eye:{x:4.3,y:-4.6},whiteChest:0,earCut:0,collar:.4,whiteFeet:1},
  // Lautpaket: bellt kaum, heult und „redet“ (hell, lang), Knurren mittel-hell
  sound:{barkF:168,barkF1:[800,600,460],barkF2:[1360,1060,860],barkLen:.5,barkRate:.1,huff:.3,growlF:62,growlLp:2400,yelpF:640,whineF:780,vol:.78},
  coats:[
   {id:'grau',name:'Grau-Weiß',w:.4,base:'#86847e',light:'#a6a49e',shade:'#605e58',dark:'#3a3834',belly:'#eeeae2',tailTip:'#eeeae2'},
   {id:'schwarz',name:'Schwarz-Weiß',w:.3,base:'#2c2a28',light:'#484440',shade:'#1c1a19',dark:'#121110',belly:'#eeeae2',tailTip:'#eeeae2'},
   {id:'rot',name:'Rot-Weiß',w:.2,base:'#b06a3a',light:'#cc8856',shade:'#804620',dark:'#4e2810',belly:'#f0e8da',tailTip:'#f0e8da'},
   {id:'agouti',name:'Agouti',w:.1,base:'#5e5446',light:'#7a6e5e',shade:'#403a30',dark:'#26221c',belly:'#d8cfbf',tailTip:'#26221c'}]},
 {id:'bullterrier',cm0:53,kg0:27,name:'Bullterrier',active:true,look:'sehr muskulös und rund, kurzes glattes Fell, eiförmiger Kopf ohne Stop mit gebogenem Nasenrücken, kleine schmale dreieckige Augen, kleine Stehohren dicht beieinander, kurze waagerecht getragene Rute',fur:'Weiß (oft mit farbigem Fleck am Kopf), gestromt, rot, schwarz-gestromt oder dreifarbig mit weißen Abzeichen',werte:{kraft:52,biss:58,tempo:54,ausdauer:58,zaeh:67,wild:61,mut:85},
  // Eigene Gestalt: englischer Kampfhund (Bulldogge × Terrier). Rund und muskulös, breite tiefe Brust, kurzer Rücken, kräftige Läufe, kurze dicke waagerecht getragene Rute
  shape:{head:'bt',L:28,leg:.98,thick:1.08,chest:1.1,tuck:1.2,withers:.6,crest:10.2,dew:2.6,tailW:3.8,tailSeg:2.1,tailUp:.6,tailCurl:-.06,legW:1.1,hindW:1.08,neckX:.6,neckY:-.6,mouth:{x:12.2,y:2},eye:{x:4.6,y:-4.2},whiteChest:.6,earCut:0,collar:.45,whiteFeet:.5},
  // Lautpaket: mittlere Stimme, bellt selten, knurrt viel, Knurren rau
  sound:{barkF:150,barkF1:[740,540,420],barkF2:[1240,970,800],barkLen:.26,barkRate:.2,huff:.45,growlF:60,growlLp:2200,yelpF:580,whineF:720,vol:.8},
  coats:[
   {id:'weiss',name:'Weiß',w:.45,base:'#ece6dc',light:'#faf6ee',shade:'#c4bcae',dark:'#8e8678'},
   {id:'gestromt',name:'Gestromt',w:.2,base:'#8a6444',light:'#a8805c',shade:'#62462c',dark:'#3a2818',stripe:'#24160c'},
   {id:'rot',name:'Rot',w:.15,base:'#a8603a',light:'#c47e56',shade:'#7a4224',dark:'#482614'},
   {id:'dreifarbig',name:'Dreifarbig',w:.1,base:'#2a2422',light:'#463e3a',shade:'#1a1615',dark:'#0e0c0b',tan:'#a8683a'},
   {id:'schwarzgestromt',name:'Schwarz-gestromt',w:.1,base:'#3a2e26',light:'#56463a',shade:'#261e18',dark:'#16110d',stripe:'#100c09'}]},
 {id:'boxer',cm0:60,kg0:30,name:'Boxer',active:true,look:'quadratisch und muskulös, kurzes glattes Fell, kurze nach oben gerichtete Schnauze, Vorbiss, schwarze Maske, Stirnfalten, Ohren oft kupiert (Stehohren)',fur:'Gelb (Falb) oder gestromt, schwarze Maske, oft weiße Abzeichen an Brust, Pfoten und Schnauze',werte:{kraft:46,biss:49,tempo:62,ausdauer:62,zaeh:49,wild:40,mut:67},
  // Eigene Gestalt: deutscher Gebrauchshund, Nachfahre des Bullenbeißers. Quadratisch, breite tiefe Brust, kurzer gerader Rücken, Taille, kurze hoch getragene Rute
  shape:{head:'bx2',L:28,leg:1.04,thick:.98,chest:1.1,tuck:1.6,withers:.7,crest:9.6,dew:3,tailW:3.6,tailSeg:2.2,tailUp:-.2,tailCurl:-.02,legW:1.02,hindW:1.02,neckX:.8,neckY:-1.2,mouth:{x:10.4,y:1.8},eye:{x:4.4,y:-4.6},whiteChest:.6,earCut:.5,collar:.4,whiteFeet:.45},
  // Lautpaket: mittlere Stimme, kurzes kräftiges Bellen, bellt mäßig, schnaubt (kurze Schnauze), Knurren mittel
  sound:{barkF:144,barkF1:[720,520,410],barkF2:[1200,940,780],barkLen:.26,barkRate:.45,huff:.7,growlF:58,growlLp:2100,yelpF:540,whineF:680,vol:.82},
  coats:[
   {id:'gelb',name:'Gelb',w:.6,base:'#c08a4e',light:'#dcaa6e',shade:'#906030',dark:'#5a3a1a'},
   {id:'gestromt',name:'Gestromt',w:.4,base:'#9a6c40',light:'#b88858',shade:'#6c4a28',dark:'#3e2a16',stripe:'#24180c'}]},
 {id:'amstaff',cm0:46,kg0:28,name:'American Staffordshire Terrier',active:true,look:'klein, gedrungen und sehr muskulös, breiter Schädel mit kräftigen Backen, mittellange Schnauze, enge Lefzen, Rosenohren oder kupierte Stehohren, kurze dünne Rute',fur:'Jede Farbe: Blau, Rot, Falb, Schwarz, gestromt, oft mit weißen Abzeichen',werte:{kraft:55,biss:61,tempo:58,ausdauer:58,zaeh:64,wild:61,mut:82},
  // Eigene Gestalt: Terrier vom Bulldoggen-Typ, klein und gedrungen, sehr breite Brust, kurzer Rücken, stämmige weit gestellte Läufe, dicker Nacken, kurze dünne Rute (tief getragen)
  shape:{head:'as',L:27,leg:.9,thick:1.06,chest:1.2,tuck:1.4,withers:.6,crest:10.2,dew:2.8,tailW:3.4,tailSeg:2,tailUp:.25,tailCurl:-.04,legW:1.14,hindW:1.08,neckX:.2,neckY:-.6,mouth:{x:10.8,y:1.8},eye:{x:4.4,y:-4.6},whiteChest:.6,earCut:.35,collar:.5,whiteFeet:.35},
  // Lautpaket: mittlere bis helle Stimme, bellt selten (Terrier, aber eher still), Knurren rau
  sound:{barkF:158,barkF1:[760,560,440],barkF2:[1280,1000,820],barkLen:.24,barkRate:.3,huff:.45,growlF:62,growlLp:2300,yelpF:600,whineF:740,vol:.8},
  coats:[
   {id:'blau',name:'Blau',w:.3,base:'#5e646c',light:'#7c828a',shade:'#42474e',dark:'#272a30'},
   {id:'rot',name:'Rot',w:.2,base:'#a8603a',light:'#c47e56',shade:'#7a4224',dark:'#462612'},
   {id:'gestromt',name:'Gestromt',w:.2,base:'#7c5c40',light:'#9a7858',shade:'#563e28',dark:'#322216',stripe:'#1e140c'},
   {id:'falb',name:'Falb',w:.15,base:'#c09a68',light:'#dab888',shade:'#90703e',dark:'#584226'},
   {id:'schwarz',name:'Schwarz',w:.15,base:'#2a2624',light:'#46403c',shade:'#1a1716',dark:'#0e0c0b'}]},
 {id:'metzgerhund',cm0:62,kg0:45,name:'Metzgerhund',active:true,look:'kompakt, muskulös, breite Brust, mittellange Schnauze, dreieckige Hängeohren',fur:'Schwarz mit rotbraunen Abzeichen (Schnauze, Backen, Brauenpunkte, Brust, Läufe)',werte:{kraft:55,biss:49,tempo:50,ausdauer:64,zaeh:55,wild:37,mut:55},
  // Eigene Gestalt: Treib- und Wachhund der Metzger, kurz und massig, breite Brust, wenig Taille, kurze kräftige Rute
  shape:{head:'mg',L:28.5,thick:1.06,chest:.9,tuck:.6,withers:.6,crest:9.8,dew:4.8,tailW:4,tailSeg:2,tailUp:.3,tailCurl:-.08,legW:1.06,hindW:1.03,neckX:.2,neckY:-.5,mouth:{x:11.5,y:1.6},eye:{x:4.4,y:-4.4},whiteChest:0,earCut:.1},
  // Lautpaket: mitteltief, voll, bellt mäßig, schnaubt, Knurren tief und lang
  sound:{barkF:142,barkF1:[690,500,400],barkF2:[1160,900,750],barkLen:.34,barkRate:.45,huff:.55,growlF:58,growlLp:1950,yelpF:520,whineF:660,vol:.85},
  coats:[{id:'schwarzrot',name:'Schwarz mit Abzeichen',w:1,base:'#2c2420',light:'#463a32',shade:'#1c1714',dark:'#120e0b',tan:'#8a4c26'}]},
 {id:'hirtenhund',cm0:74,kg0:55,name:'Hirtenhund',active:true,look:'schwer, wachsam, hochbeinig, dichter Halskragen, breiter Kopf, schwarze Hängeohren (oft kupiert), Rute hoch geringelt',fur:'Sandfarben, schwarze Maske',werte:{kraft:55,biss:52,tempo:52,ausdauer:72,zaeh:58,wild:52,mut:61},
  // Eigene Gestalt: Herdenschutzhund, groß und hochbeinig, tiefe Brust, aufgezogener Bauch, dichter Halskragen gegen Wolfsbisse, Kopf wachsam hoch, Rute über dem Rücken geringelt
  shape:{head:'hh',L:32,leg:1.1,thick:.96,chest:1.1,tuck:1.5,withers:.2,crest:9.8,dew:5.2,tailW:4.4,tailSeg:2.5,tailUp:-1.55,tailCurl:.3,legW:.98,hindW:.98,neckX:.8,neckY:-1.6,ruff:1,mouth:{x:12.2,y:1.6},eye:{x:4.3,y:-4.5},whiteChest:.15,earCut:.5,collar:.85},
  // Lautpaket: tief und voll, kräftiges Warnbellen in Salven (Wachhund), wenig Schnauben, Knurren tief und lang
  sound:{barkF:126,barkF1:[640,460,370],barkF2:[1080,850,720],barkLen:.36,barkRate:.6,huff:.3,growlF:52,growlLp:1800,yelpF:460,whineF:600,vol:.85},
  coats:[{id:'sand',name:'Sandfarben',w:1,base:'#c2a77a',light:'#dcc59c',shade:'#937a52',dark:'#5e4c32'}]},
 {id:'bulldogge',cm0:38,kg0:24,name:'Englische Bulldogge',active:true,look:'niedrig, breit und schwer, kurze stämmige Läufe, sehr breite Brust und Schultern, schmalere Hüften, großer breiter Kopf mit Falten, sehr kurze Schnauze, starker Vorbiss, hängende Lefzen, Rosenohren, kurze Korkenzieher-Rute',fur:'Rot, Falb, gestromt, Weiß oder gescheckt (weiß mit farbigen Platten)',werte:{kraft:46,biss:46,tempo:26,ausdauer:26,zaeh:67,wild:37,mut:70},
  // Eigene Gestalt: Nachfahre der englischen Bullenbeißer. Sehr niedrig (leg .78), breit (thick 1.18), tiefe Brust, Karpfenrücken, Falten an Hals und Schultern, Wamme, sehr kurze tief angesetzte Rute; Schecken über Platten (patch)
  shape:{head:'eb',L:26,leg:.78,thick:1.18,chest:1.6,tuck:.6,withers:.2,crest:10.4,dew:6.4,tailW:3.4,tailSeg:1.5,tailUp:.9,tailCurl:-.3,legW:1.2,hindW:1.04,neckX:-.4,neckY:.6,folds:1,piebald:1,mouth:{x:9.4,y:2.6},eye:{x:4.2,y:-4.2},whiteChest:.5,earCut:0,collar:.4,whiteFeet:.4},
  // Lautpaket: tief, rau und kurz, bellt selten, schnauft und schnarcht viel, Knurren rau
  sound:{barkF:130,barkF1:[660,470,370],barkF2:[1100,860,720],barkLen:.24,barkRate:.15,huff:.95,growlF:54,growlLp:1900,yelpF:500,whineF:640,vol:.82},
  coats:[
   {id:'rot',name:'Rot',w:.25,base:'#a8603a',light:'#c47e56',shade:'#7a4224',dark:'#482614'},
   {id:'falb',name:'Falb',w:.25,base:'#c49a68',light:'#dcb888',shade:'#946e3e',dark:'#5a4226'},
   {id:'gestromt',name:'Gestromt',w:.2,base:'#8a6444',light:'#a8805c',shade:'#62462c',dark:'#3a2818',stripe:'#24160c'},
   {id:'gescheckt',name:'Gescheckt',w:.2,base:'#ece6dc',light:'#faf6ee',shade:'#c4bcae',dark:'#8e8678',patch:'#a8603a',patchHi:'#c47e56'},
   {id:'weiss',name:'Weiß',w:.1,base:'#ece6dc',light:'#faf6ee',shade:'#c4bcae',dark:'#8e8678'}]},
 {id:'dalmatiner',cm0:58,kg0:27,name:'Dalmatiner',active:true,look:'elegant und ausdauernd, kurzes glattes Fell, weiß mit runden Tupfen, mittellange Schnauze, hoch angesetzte Hängeohren, lange leicht gebogene Rute',fur:'Weiß mit schwarzen oder leberbraunen Tupfen',werte:{kraft:31,biss:31,tempo:74,ausdauer:88,zaeh:37,wild:28,mut:37},
  // Eigene Gestalt: Kutschenhund (lief neben Pferden und Wagen). Schlank, ausdauernd, gerader Rücken, tiefe Brust, lange Rute; neuer Gestaltwert spots: runde Tupfen über den ganzen Körper
  shape:{head:'dm',L:30,leg:1.06,thick:.88,chest:.9,tuck:1.7,withers:.5,crest:8.4,dew:2.6,tailW:3.4,tailSeg:2.7,tailUp:-.15,tailCurl:.05,legW:.92,hindW:.96,neckX:1,neckY:-1.4,spots:1,mouth:{x:12.4,y:1.6},eye:{x:4.3,y:-4.5},whiteChest:0,earCut:0,collar:.4},
  // Lautpaket: mittlere Stimme, bellt mäßig, Knurren mittel-hell
  sound:{barkF:156,barkF1:[760,560,440],barkF2:[1280,1000,820],barkLen:.26,barkRate:.4,huff:.25,growlF:62,growlLp:2300,yelpF:580,whineF:720,vol:.8},
  coats:[
   {id:'schwarz',name:'Weiß mit schwarzen Tupfen',w:.75,base:'#ece8e0',light:'#faf8f2',shade:'#c4beb2',dark:'#9a9488',spot:'#1c1a18'},
   {id:'leber',name:'Weiß mit leberbraunen Tupfen',w:.25,base:'#ece8e0',light:'#faf8f2',shade:'#c4beb2',dark:'#9a9488',spot:'#5a2e1c'}]},
 {id:'greyhound',cm0:72,kg0:32,name:'Greyhound',active:true,look:'Windhund: sehr hochbeinig und schlank, extrem tiefe Brust, stark aufgezogener Bauch, gewölbter Rücken, langer schmaler Kopf, kleine nach hinten gefaltete Rosenohren, lange dünne Rute',fur:'Gestromt, Falb, Schwarz, Blau oder Weiß mit Platten',werte:{kraft:28,biss:22,tempo:97,ausdauer:50,zaeh:22,wild:22,mut:22},
  // Eigene Gestalt: Windhund, schnellster Hund. Sehr lange Beine, sehr schmaler Rumpf, extrem tiefe Brust, Wespentaille, gewölbte Lende, langer Hals, lange dünne Rute tief getragen mit leichtem Haken
  shape:{head:'gh',L:31,leg:1.24,thick:.76,chest:2,tuck:3.2,withers:.2,crest:7.4,dew:2,tailW:2.8,tailSeg:3.2,tailUp:-.25,tailCurl:.12,legW:.8,hindW:.88,neckX:2,neckY:-1.8,mouth:{x:13.4,y:1.4},eye:{x:4.2,y:-4.2},whiteChest:.3,earCut:0,collar:.6,whiteFeet:.25},
  // Lautpaket: bellt kaum (stiller Hetzhund), helles Jaulen, leises Knurren
  sound:{barkF:164,barkF1:[780,580,450],barkF2:[1320,1030,840],barkLen:.22,barkRate:.08,huff:.2,growlF:64,growlLp:2400,yelpF:640,whineF:780,vol:.75},
  coats:[
   {id:'gestromt',name:'Gestromt',w:.3,base:'#8a6a48',light:'#a88660',shade:'#624a30',dark:'#3a2a1a',stripe:'#24180e'},
   {id:'falb',name:'Falb',w:.25,base:'#c8a070',light:'#e0bc90',shade:'#987448',dark:'#5e4628'},
   {id:'schwarz',name:'Schwarz',w:.2,base:'#262321',light:'#423c38',shade:'#181615',dark:'#0e0d0c'},
   {id:'blau',name:'Blau',w:.1,base:'#5c626a',light:'#7a8088',shade:'#40454c',dark:'#26292e'},
   {id:'weiss',name:'Weiß mit Platten',w:.15,base:'#e8e2d6',light:'#f6f2ea',shade:'#bfb8aa',dark:'#8e8678',patch:'#3a2c20',patchHi:'#584434'}]},
 {id:'afghane',cm0:70,kg0:27,name:'Afghanischer Windhund',active:true,look:'Windhund aus den Bergen: langes seidiges Fell, das den ganzen Körper und die Läufe bedeckt, Haarschopf auf dem Kopf, lange behaarte Hängeohren, feiner langer Kopf, oft dunkle Maske, hoch getragene Rute mit Ring am Ende',fur:'Gold mit dunkler Maske, Creme, Schwarz, Silber (Domino) oder Rot',werte:{kraft:22,biss:22,tempo:88,ausdauer:68,zaeh:31,wild:34,mut:22},
  // Eigene Gestalt: ganz in langes Haar gehüllt (Fransen bis fast zum Boden, behaarte Läufe), Schopf, Ohren wie Vorhänge, Ringelrute hoch getragen
  shape:{head:'af',L:32,leg:1.2,thick:.82,chest:1.4,tuck:2.4,withers:.4,crest:7.6,dew:2.4,tailW:2.6,tailSeg:3,tailUp:.5,tailCurl:.1,tailRing:.55,legW:.86,hindW:.94,neckX:2,neckY:-2.4,mouth:{x:13.5,y:1.4},eye:{x:4.2,y:-4.2},whiteChest:0,earCut:0,collar:.35,silk:1.6,legFeather:1.6,tailFeather:.5},
  // Lautpaket: hochnäsig, bellt selten und dann gedehnt, jault und mault gern
  sound:{barkF:150,barkF1:[720,540,420],barkF2:[1220,960,800],barkLen:.32,barkRate:.12,huff:.3,growlF:60,growlLp:2200,yelpF:600,whineF:760,vol:.75},
  coats:[
   {id:'gold',name:'Gold mit Maske',w:.4,base:'#d0a868',light:'#e8c88e',shade:'#a07c44',dark:'#5e4626',muzzle:'#2a201a'},
   {id:'creme',name:'Creme',w:.2,base:'#e6d6b4',light:'#f4e8d0',shade:'#bca886',dark:'#7e6c50',muzzle:'#3a2e24'},
   {id:'schwarz',name:'Schwarz',w:.15,base:'#2a2624',light:'#46403c',shade:'#1a1716',dark:'#0e0c0b'},
   {id:'silber',name:'Silber (Domino)',w:.15,base:'#b0aca4',light:'#d0ccc4',shade:'#86827a',dark:'#4a4640',muzzle:'#2a2826'},
   {id:'rot',name:'Rot mit Maske',w:.1,base:'#b06a3a',light:'#cc8a58',shade:'#80461e',dark:'#4a2812',muzzle:'#2a1a12'}]},
 {id:'saluki',cm0:64,kg0:22,name:'Saluki',active:true,look:'Windhund der Wüste: schlank und anmutig, langer schmaler Kopf, lange Hängeohren mit seidigen Fransen, glattes Fell, Fransen an Rute und Läufen, Rute tief mit Bogen',fur:'Creme, Gold, Rot, Schwarz-Loh oder Grizzle',werte:{kraft:22,biss:22,tempo:92,ausdauer:86,zaeh:22,wild:28,mut:25},
  // Eigene Gestalt: wie ein Greyhound, aber leichter und mit befederten Ohren, Rute und Läufen; ausdauerndster Windhund (Gazellenjagd)
  shape:{head:'sl',L:31,leg:1.24,thick:.74,chest:1.8,tuck:3.2,withers:.2,crest:7.4,dew:2,tailW:2.6,tailSeg:3.2,tailUp:-.1,tailCurl:.16,legW:.78,hindW:.86,neckX:2.2,neckY:-2,mouth:{x:13.4,y:1.4},eye:{x:4.2,y:-4.2},whiteChest:.25,earCut:0,collar:.5,tailFeather:1.6,legFeather:.6},
  // Lautpaket: stiller Hetzhund wie der Greyhound, etwas tiefer, langes helles Jaulen
  sound:{barkF:170,barkF1:[800,600,460],barkF2:[1340,1050,860],barkLen:.24,barkRate:.06,huff:.2,growlF:66,growlLp:2400,yelpF:660,whineF:820,vol:.7},
  coats:[
   {id:'creme',name:'Creme',w:.3,base:'#e2cfa8',light:'#f0e2c4',shade:'#b8a27a',dark:'#7a6848'},
   {id:'gold',name:'Gold',w:.3,base:'#c89a5c',light:'#e0b880',shade:'#9a703a',dark:'#5e4424'},
   {id:'rot',name:'Rot',w:.15,base:'#a8643a',light:'#c4825a',shade:'#7a4424',dark:'#482814'},
   {id:'schwarzloh',name:'Schwarz-Loh',w:.15,base:'#2a2420',light:'#463c34',shade:'#1a1613',dark:'#0f0c0a',tan:'#c08a52'},
   {id:'grizzle',name:'Grizzle',w:.1,base:'#8a7a68',light:'#a89880',shade:'#625646',dark:'#3a3228'}]},
 {id:'whippet',cm0:48,kg0:13,name:'Whippet',active:true,look:'kleiner Windhund: wie ein Greyhound im Kleinformat, sehr schlank, tiefe Brust, stark aufgezogener Bauch, kurze Schnauze im Verhältnis, große dunkle Augen, Rosenohren',fur:'Falb, Gestromt, Blau, Schwarz oder Weiß mit Platten',werte:{kraft:22,biss:22,tempo:90,ausdauer:52,zaeh:22,wild:22,mut:22},
  // Eigene Gestalt: Greyhound im Kleinformat, leichter, etwas kürzere Schnauze, große Augen
  shape:{head:'wp',L:29,leg:1.18,thick:.74,chest:1.6,tuck:3,withers:.2,crest:7.2,dew:1.8,tailW:2.6,tailSeg:3,tailUp:-.25,tailCurl:.12,legW:.76,hindW:.84,neckX:1.8,neckY:-1.6,mouth:{x:12.4,y:1.4},eye:{x:4.2,y:-4.2},whiteChest:.45,earCut:0,collar:.5,whiteFeet:.35,piebald:1},
  // Lautpaket: klein und hell, kurzes Kläffen, Fiepen
  sound:{barkF:210,barkF1:[900,680,520],barkF2:[1500,1180,960],barkLen:.18,barkRate:.1,huff:.15,growlF:78,growlLp:2600,yelpF:760,whineF:900,vol:.6},
  coats:[
   {id:'falb',name:'Falb',w:.3,base:'#c8a070',light:'#e0bc90',shade:'#987448',dark:'#5e4628'},
   {id:'gestromt',name:'Gestromt',w:.25,base:'#8a6a48',light:'#a88660',shade:'#624a30',dark:'#3a2a1a',stripe:'#24180e'},
   {id:'blau',name:'Blau',w:.15,base:'#5c626a',light:'#7a8088',shade:'#40454c',dark:'#26292e'},
   {id:'schwarz',name:'Schwarz',w:.1,base:'#262321',light:'#423c38',shade:'#181615',dark:'#0e0d0c'},
   {id:'weiss',name:'Weiß mit Platten',w:.2,base:'#e8e2d6',light:'#f6f2ea',shade:'#bfb8aa',dark:'#8e8678',patch:'#b88a58',patchHi:'#d0a474'}]},
 {id:'podenco',cm0:68,kg0:23,name:'Podenco Ibicenco',active:true,look:'Jagdhund von den Balearen: hochbeinig und schlank, rot und weiß gefleckt, riesige Stehohren, langer kegelförmiger Kopf, fleischfarbene Nase, Bernsteinaugen, Sichelrute',fur:'Rot-Weiß, Weiß oder Rot mit weißen Abzeichen',werte:{kraft:22,biss:22,tempo:82,ausdauer:76,zaeh:25,wild:37,mut:31},
  // Eigene Gestalt: größer und hochbeiniger als der Pharaonenhund, rot-weiß gescheckt, springt hoch aus dem Stand
  shape:{head:'pi',L:31,leg:1.24,thick:.78,chest:1.4,tuck:2.6,withers:.1,crest:7.6,dew:2.2,tailW:2.8,tailSeg:3,tailUp:.3,tailCurl:.2,legW:.8,hindW:.88,neckX:2,neckY:-2.6,mouth:{x:13.6,y:1.4},eye:{x:4.2,y:-4.2},whiteChest:.8,whiteFeet:.7,earCut:0,collar:.35,piebald:1},
  sound:{barkF:180,barkF1:[840,630,490],barkF2:[1400,1100,900],barkLen:.2,barkRate:.4,huff:.25,growlF:70,growlLp:2400,yelpF:690,whineF:850,vol:.75},
  coats:[
   {id:'rotweiss',name:'Rot-Weiß',w:.55,base:'#ece6da',light:'#faf6ee',shade:'#c4bcae',dark:'#8e8678',patch:'#b0603a',patchHi:'#cc7e56'},
   {id:'rot',name:'Rot mit weißen Abzeichen',w:.3,base:'#b0603a',light:'#cc7e56',shade:'#80421e',dark:'#4a2610'},
   {id:'weiss',name:'Weiß',w:.15,base:'#ece8e0',light:'#faf8f2',shade:'#c8c2b6',dark:'#948e82'}]},
 {id:'galgo',cm0:66,kg0:27,name:'Galgo Español',active:true,look:'spanischer Windhund: wie ein Greyhound, aber leichter und länger, flachere Brust, stark abfallende Kruppe, lange Rute tief mit Haken am Ende, Rosenohren, ruhiger Blick',fur:'Gestromt, Schwarz, Falb, Rot oder Weiß mit Platten',werte:{kraft:22,biss:22,tempo:92,ausdauer:72,zaeh:22,wild:22,mut:25},
  // Eigene Gestalt: länger und flacher als der Greyhound, Kruppe abfallend, Rute mit Haken, Schnauze etwas länger
  shape:{head:'ga',L:33,leg:1.2,thick:.74,chest:1.2,tuck:2.6,withers:-.2,crest:7.2,dew:1.8,tailW:2.6,tailSeg:3.4,tailUp:-.4,tailCurl:.2,legW:.78,hindW:.86,neckX:2.2,neckY:-1.6,mouth:{x:13.8,y:1.4},eye:{x:4.2,y:-4.2},whiteChest:.3,whiteFeet:.25,earCut:0,collar:.5,piebald:1},
  sound:{barkF:160,barkF1:[770,580,450],barkF2:[1300,1020,840],barkLen:.22,barkRate:.08,huff:.2,growlF:64,growlLp:2400,yelpF:640,whineF:800,vol:.72},
  coats:[
   {id:'gestromt',name:'Gestromt',w:.35,base:'#8a6a48',light:'#a88660',shade:'#624a30',dark:'#3a2a1a',stripe:'#24180e'},
   {id:'schwarz',name:'Schwarz',w:.2,base:'#262321',light:'#423c38',shade:'#181615',dark:'#0e0d0c'},
   {id:'falb',name:'Falb',w:.2,base:'#c8a070',light:'#e0bc90',shade:'#987448',dark:'#5e4628'},
   {id:'rot',name:'Rot',w:.1,base:'#a8643a',light:'#c4825a',shade:'#7a4424',dark:'#482814'},
   {id:'weiss',name:'Weiß mit Platten',w:.15,base:'#e8e2d6',light:'#f6f2ea',shade:'#bfb8aa',dark:'#8e8678',patch:'#6a4e34',patchHi:'#86684c'}]},
 {id:'pharao',cm0:58,kg0:22,name:'Pharaonenhund',active:true,look:'schlanker rotbrauner Laufhund, sehr große Stehohren, fleischfarbene Nase und bernsteinfarbene Augen, weiße Rutenspitze, oft weißer Brustfleck; errötet an Nase und Ohren',fur:'Lohfarben oder Kastanie mit weißer Rutenspitze',werte:{kraft:22,biss:22,tempo:80,ausdauer:72,zaeh:25,wild:34,mut:28},
  // Eigene Gestalt: kantiger Jagdhund mit riesigen Stehohren, Rute hoch und gebogen mit weißer Spitze, rosa Nase
  shape:{head:'ph',L:30,leg:1.14,thick:.84,chest:1.2,tuck:2,withers:.1,crest:7.6,dew:2.4,tailW:3,tailSeg:2.9,tailUp:.6,tailCurl:.2,legW:.86,hindW:.92,neckX:1.8,neckY:-2.4,mouth:{x:12.8,y:1.4},eye:{x:4.2,y:-4.2},whiteChest:.7,earCut:0,collar:.4,tipWhite:1},
  sound:{barkF:176,barkF1:[820,620,480],barkF2:[1380,1080,880],barkLen:.2,barkRate:.35,huff:.25,growlF:70,growlLp:2400,yelpF:680,whineF:840,vol:.75},
  coats:[
   {id:'loh',name:'Lohfarben',w:.7,base:'#b8683a',light:'#d4885a',shade:'#8a4a24',dark:'#522a12',tailTip:'#f2ece0'},
   {id:'kastanie',name:'Kastanie',w:.3,base:'#9a5230',light:'#b66e4a',shade:'#70381c',dark:'#40200e',tailTip:'#f2ece0'}]},
 {id:'sloughi',cm0:68,kg0:25,name:'Sloughi',active:true,look:'nordafrikanischer Windhund: glattes kurzes Fell, schlank, langer Kopf mit kräftigerem Schädel, flach anliegende Hängeohren, große dunkle melancholische Augen',fur:'Sand, Rotsand, Sand mit schwarzer Maske oder gestromt',werte:{kraft:22,biss:22,tempo:90,ausdauer:72,zaeh:22,wild:31,mut:31},
  // Eigene Gestalt: glatter Windhund wie der Greyhound, etwas kräftiger, Hängeohren statt Rosenohren, trauriger Blick
  shape:{head:'sg',L:31,leg:1.24,thick:.76,chest:1.8,tuck:3,withers:.3,crest:7.4,dew:2,tailW:2.6,tailSeg:3.2,tailUp:-.2,tailCurl:.16,legW:.8,hindW:.86,neckX:2.2,neckY:-2,mouth:{x:13.1,y:1.4},eye:{x:4.2,y:-4.2},whiteChest:.2,earCut:0,collar:.4},
  sound:{barkF:160,barkF1:[760,580,450],barkF2:[1300,1020,840],barkLen:.24,barkRate:.08,huff:.2,growlF:62,growlLp:2300,yelpF:620,whineF:780,vol:.72},
  coats:[
   {id:'sand',name:'Sand',w:.4,base:'#d2b080',light:'#e6c89c',shade:'#a88a5c',dark:'#6a5638'},
   {id:'rotsand',name:'Rotsand',w:.25,base:'#bc8650',light:'#d4a26e',shade:'#8e6034',dark:'#56381c'},
   {id:'maske',name:'Sand mit schwarzer Maske',w:.2,base:'#d2b080',light:'#e6c89c',shade:'#a88a5c',dark:'#6a5638',muzzle:'#2a201a'},
   {id:'gestromt',name:'Gestromt',w:.15,base:'#a07a50',light:'#bc966a',shade:'#765634',dark:'#463220',stripe:'#2a1c10'}]},
 {id:'azawakh',cm0:68,kg0:20,name:'Azawakh',active:true,look:'Wüstenwindhund der Sahelzone: extrem dürr und hochbeinig, jede Rippe und die Hüftknochen sichtbar, sehr kurzes Fell, hoch angesetzte flache Hängeohren, weiße Pfoten und Brustlatz',fur:'Falb, Sand, Rot oder gestromt, fast immer mit weißen Abzeichen',werte:{kraft:22,biss:22,tempo:92,ausdauer:74,zaeh:22,wild:43,mut:40},
  // Eigene Gestalt: das dürrste Tier im Buch – sehr lange Beine, schmaler Rumpf, sichtbare Rippen, weiße Strümpfe
  shape:{head:'az',L:30,leg:1.36,thick:.66,chest:1.6,tuck:3.8,withers:.1,crest:7.2,dew:1.6,tailW:2.2,tailSeg:3.2,tailUp:-.1,tailCurl:.18,legW:.7,hindW:.78,neckX:2.4,neckY:-2.6,mouth:{x:13.6,y:1.4},eye:{x:4.2,y:-4.2},whiteChest:.85,whiteFeet:.85,earCut:0,collar:.6,ribs:1},
  sound:{barkF:168,barkF1:[800,600,460],barkF2:[1340,1050,860],barkLen:.2,barkRate:.25,huff:.2,growlF:66,growlLp:2400,yelpF:660,whineF:820,vol:.72},
  coats:[
   {id:'falb',name:'Falb',w:.4,base:'#c89a62',light:'#e0b884',shade:'#9a7040',dark:'#5e4426'},
   {id:'sand',name:'Sand',w:.25,base:'#d8bc8e',light:'#ecd4ac',shade:'#ac9268',dark:'#6e5a3c'},
   {id:'rot',name:'Rot',w:.2,base:'#a85e34',light:'#c47c52',shade:'#7a401e',dark:'#46240e'},
   {id:'gestromt',name:'Gestromt',w:.15,base:'#8e6a44',light:'#aa865c',shade:'#644a2e',dark:'#3a2a1a',stripe:'#2a1c10'}]},
 {id:'cirneco',cm0:48,kg0:11,name:'Cirneco dell’Etna',active:true,look:'kleiner Jagdhund vom Ätna: wie ein Pharaonenhund im Kleinformat, große Stehohren, fleischfarbene Nase, bernsteinfarbene Augen, kurzes Fell',fur:'Lohfarben, Isabell oder Hell-Loh',werte:{kraft:22,biss:22,tempo:72,ausdauer:70,zaeh:22,wild:31,mut:31},
  // Eigene Gestalt: klein, kompakter als die Windhunde, riesige Ohren im Verhältnis
  shape:{head:'ci',L:28,leg:1.1,thick:.82,chest:1,tuck:1.8,withers:.1,crest:7.4,dew:2.2,tailW:2.8,tailSeg:2.8,tailUp:.5,tailCurl:.18,legW:.84,hindW:.9,neckX:1.6,neckY:-2.2,mouth:{x:12.4,y:1.4},eye:{x:4.2,y:-4.2},whiteChest:.4,whiteFeet:.25,earCut:0,collar:.45},
  sound:{barkF:200,barkF1:[880,660,510],barkF2:[1460,1140,920],barkLen:.18,barkRate:.45,huff:.25,growlF:76,growlLp:2600,yelpF:740,whineF:880,vol:.65},
  coats:[
   {id:'loh',name:'Lohfarben',w:.6,base:'#c08050',light:'#d8a070',shade:'#906038',dark:'#583820'},
   {id:'isabell',name:'Isabell',w:.25,base:'#d4b088',light:'#e8caa6',shade:'#a8865e',dark:'#6a543a'},
   {id:'hell',name:'Hell-Loh',w:.15,base:'#d8a878',light:'#ecc49a',shade:'#ac7e50',dark:'#6c4e30'}]},
 {id:'windspiel',cm0:36,kg0:4.5,name:'Italienisches Windspiel',active:true,look:'winziger Windhund der feinen Damen: Greyhound im Taschenformat, sehr dünne Beine, tiefe Brust, Wespentaille, kurzer feiner Kopf, große Augen, Rosenohren',fur:'Grau, Schwarz, Falb, Isabell oder Blau, oft mit weißer Brust',werte:{kraft:12,biss:12,tempo:84,ausdauer:40,zaeh:12,wild:12,mut:12},
  // Eigene Gestalt: kleinster Hund im Buch, Beine wie Stöckchen, großer Kopf im Verhältnis
  shape:{head:'iw',L:27,leg:1.22,thick:.66,chest:1.4,tuck:3.2,withers:.3,crest:7,dew:1.4,tailW:2,tailSeg:2.9,tailUp:-.3,tailCurl:.14,legW:.62,hindW:.7,neckX:2.2,neckY:-2.4,mouth:{x:11.6,y:1.4},eye:{x:4.2,y:-4.2},whiteChest:.5,whiteFeet:.4,earCut:0,collar:.7},
  sound:{barkF:300,barkF1:[1100,860,660],barkF2:[1800,1420,1160],barkLen:.14,barkRate:.6,huff:.1,growlF:96,growlLp:3000,yelpF:900,whineF:1100,vol:.5},
  coats:[
   {id:'grau',name:'Grau',w:.35,base:'#7c7a78',light:'#9c9a96',shade:'#5a5856',dark:'#343332'},
   {id:'schwarz',name:'Schwarz',w:.2,base:'#262321',light:'#423c38',shade:'#181615',dark:'#0e0d0c'},
   {id:'falb',name:'Falb',w:.2,base:'#c8a070',light:'#e0bc90',shade:'#987448',dark:'#5e4628'},
   {id:'isabell',name:'Isabell',w:.15,base:'#d8c4a2',light:'#ecdcc0',shade:'#ac9a78',dark:'#6e6048'},
   {id:'blau',name:'Blau',w:.1,base:'#5c626a',light:'#7a8088',shade:'#40454c',dark:'#26292e'}]},
 {id:'bluthund',cm0:66,kg0:45,name:'Bluthund',active:true,look:'Spürhund, lange tiefe Schnauze, sehr lange Hängeohren, lose Haut mit Falten, Hängelefzen, Kopf tief, Rute säbelförmig hoch',fur:'Schwarzer Sattel, lohfarbener Kopf, Brust und Läufe',werte:{kraft:40,biss:25,tempo:44,ausdauer:82,zaeh:40,wild:22,mut:22},
  // Eigene Gestalt: Spürhund, lang, lose Haut, Wamme, Kopf tief zur Fährte, sehr lange Ohren, Rute hoch wie ein Säbel
  shape:{head:'bh',L:31.5,leg:1.02,thick:.9,chest:.9,tuck:.9,withers:.2,crest:7.8,dew:6.8,tailW:4,tailSeg:2.6,tailUp:-1.15,tailCurl:.08,legW:.96,hindW:.96,neckX:1.4,neckY:1.4,mouth:{x:12.4,y:2.6},eye:{x:4.2,y:-4},whiteChest:.08,earCut:0,collar:.4},
  // Lautpaket: tiefes, langes, klagendes Geläut (Baying), bellt mäßig, schnaubt beim Schnüffeln, Knurren leise
  sound:{barkF:118,barkF1:[560,420,330],barkF2:[940,760,640],barkLen:.55,barkRate:.4,huff:.7,growlF:52,growlLp:1600,yelpF:440,whineF:580,vol:.85},
  coats:[{id:'schwarzloh',name:'Schwarz-lohfarben',w:1,base:'#2e231c',light:'#4a3a2e',shade:'#1d1612',dark:'#130e0b',tan:'#9a6236'}]}];
const STATS=[['kraft','Kraft'],['biss','Bisskraft'],['tempo','Schnelligkeit'],['ausdauer','Ausdauer'],['zaeh','Zähigkeit'],['wild','Wildheit'],['mut','Mut']];
// Kampfgewicht je Wert (Summe 7): Biss, Kraft und Zähigkeit zählen im Kampf am meisten, Schnelligkeit und Ausdauer weniger
// (die zählen bei Hunderennen). Kampf-Soll = gewichtetes Mittel; daraus Zielstufe, Totenköpfe, Kampfwert.
const KAMPF={kraft:1.3,biss:1.5,tempo:.6,ausdauer:.4,zaeh:1.2,wild:1,mut:1};
const kampfOf=v=>STATS.reduce((n,[k])=>n+(v[k]||0)*KAMPF[k],0)/7;
for(const B of BREEDS)B.soll=Math.round(kampfOf(B.werte)*10)/10;
// Ausgleich je Rasse (Körpergewicht, Bauweise): eingemessen, sodass ein frischer Hund gegen den Menschen seiner Zielstufe ≈ 50 % gewinnt
const BAL={wolf:1.06,polarwolf:0.85,schwarzwolf:0.87,apenninwolf:0.89,aethiopwolf:0.87,owtscharka:0.76,tosa:0.7,molosser:0.77,fila:0.74,dogge:0.82,dogo:0.88,alaunt:0.86,presa:0.76,boerboel:0.79,baerenbeisser:0.79,corso:0.79,leonberger:1,mastino:0.71,tibet:0.8,mastiff:0.71,bernhardiner:0.91,malamute:0.96,bordeaux:0.79,bullmastiff:0.81,wolfshund:0.92,neufundlaender:1,ridgeback:1.07,komondor:0.84,akita:0.94,dobermann:1.08,sharpei:1.25,schaeferhund:1.01,chow:1.22,malinois:1.03,saupacker:0.92,barsoi:1.2,deerhound:0.97,taigan:1.19,lurcher:1.18,husky:1.13,bullterrier:0.92,boxer:1.24,amstaff:1,metzgerhund:1.19,hirtenhund:0.95,bulldogge:1.43,dalmatiner:0.97,greyhound:1.35,afghane:1.07,saluki:1.18,whippet:1.69,podenco:1.06,galgo:1.45,pharao:1.2,sloughi:1.13,azawakh:0.9,cirneco:1.52,windspiel:2.32,bluthund:0.87};
for(const B of BREEDS)B.bal=BAL[B.id]??1;
// Alte Rassenwerte bis 26.10.2026 (Soll und Zuschläge kraft…mut) – nur zum Umrechnen gefangener Hunde aus alten Spielständen
const OLD={"wolf":[70,-4,6,10,10,0,4,-2],"polarwolf":[68,2,6,6,10,4,4,0],"schwarzwolf":[66,2,6,8,8,2,6,2],"apenninwolf":[60,-4,5,10,10,-1,5,-1],"aethiopwolf":[56,-6,4,12,8,-3,5,0],"owtscharka":[69,7,5,-6,3,8,3,6],"tosa":[67,6,6,-4,0,6,2,7],"molosser":[66,4,5,-6,-3,4,2,4],"fila":[64,4,5,0,2,6,7,6],"dogge":[63,4,3,2,-2,2,0,4],"dogo":[62,3,6,4,4,2,6,7],"alaunt":[61,2,5,4,0,0,6,3],"presa":[60,5,6,0,2,5,5,6],"boerboel":[58,7,5,-2,0,6,3,6],"baerenbeisser":[57,5,8,-2,-2,4,4,4],"corso":[56,4,5,2,2,4,4,6],"leonberger":[55,4,2,0,4,5,-2,4],"mastino":[54,6,4,-8,-4,8,0,5],"tibet":[53,4,3,-2,4,6,2,4],"mastiff":[52,6,4,-8,-5,7,-3,5],"bernhardiner":[51,5,2,-6,2,6,-4,4],"malamute":[50,4,3,1,9,4,2,3],"bordeaux":[50,5,4,-4,-3,6,2,5],"bullmastiff":[49,5,4,0,0,5,2,5],"wolfshund":[48,2,0,6,4,-2,-6,2],"neufundlaender":[47,5,0,-4,5,6,-8,3],"ridgeback":[46,1,3,6,6,2,3,5],"komondor":[45,4,2,-2,3,6,4,6],"akita":[45,2,3,3,4,3,4,5],"dobermann":[44,1,3,7,5,1,4,5],"sharpei":[42,2,3,0,2,5,2,4],"schaeferhund":[41,1,3,4,6,2,3,5],"chow":[40,2,3,-3,1,4,4,5],"malinois":[40,-2,4,9,7,0,6,6],"saupacker":[43,2,4,2,2,2,5,4],"barsoi":[41,-1,2,10,-2,-3,3,4],"deerhound":[44,1,1,8,2,0,1,3],"taigan":[42,0,1,6,6,3,2,3],"lurcher":[39,2,3,6,3,2,4,4],"husky":[38,-1,1,7,12,2,2,1],"bullterrier":[38,4,5,1,3,5,4,8],"boxer":[37,2,3,3,2,2,2,5],"amstaff":[36,4,6,2,3,3,4,8],"metzgerhund":[39,4,2,0,2,2,0,2],"hirtenhund":[34,2,0,-2,4,2,-2,4],"bulldogge":[33,4,5,-8,-6,6,0,6],"dalmatiner":[32,-2,0,5,9,0,0,2],"greyhound":[31,-4,-2,12,-2,-3,0,0],"afghane":[35,-3,-1,8,3,2,2,-3],"saluki":[33,-4,-2,11,8,-3,1,-1],"whippet":[30,-6,-3,14,0,-5,-2,-2],"podenco":[37,-2,0,9,4,-1,2,1],"galgo":[33,-3,-1,10,5,-2,0,0],"pharao":[36,-2,0,7,3,-1,2,0],"sloughi":[34,-3,-1,10,5,-2,1,1],"azawakh":[32,-5,-1,12,6,-5,3,2],"cirneco":[30,-5,-2,8,4,-2,2,1],"windspiel":[30,-14,-10,10,-4,-12,-4,-6],"bluthund":[30,-2,-2,-2,6,0,-6,-2]};
const NAMES=['Brutus','Ferox','Saevus','Molossus','Cerberus','Nero','Hektor','Furia','Lupa','Tyrann','Grimm','Asch','Rabe','Morro','Bärbeiß','Kaltzahn','Titus','Vulkan','Sturm','Mörser','Ajax','Bruna','Scylla','Gorgo'];
const PARTS={kopf:'Kopf',hals:'Hals',brust:'Brust',bauch:'Flanke',vl:'Vorderlauf',hl:'Hinterlauf'};
const PART_MAX={kopf:105,hals:95,brust:150,bauch:110,vl:70,hl:70};
// GEPLANT, NOCH NICHT VERWENDET – Hundefang-Abenteuer (siehe README „Geplant: Hundefang“). Nur hinterlegt, keine Spielwirkung.
// Sichtung mit dem Fernglas in der Waldmission: Wahrscheinlichkeit je Rasse in Prozent (Summe 100). Vorschlag, Zahlen legt Thomas fest:
// am schwächsten Hund am höchsten, dann deutlich absteigend, Wolf nur 1 %.
DOG.SIGHTING={bluthund:25,hirtenhund:20,metzgerhund:16,saupacker:12,wolfshund:9,mastiff:7,baerenbeisser:5,alaunt:3,molosser:2,wolf:1};
DOG.sightBreed=(r=Math.random())=>{let a=0;for(const [id,p] of Object.entries(DOG.SIGHTING)){a+=p/100;if(r<a)return id;}return 'bluthund';};
DOG.BREEDS=BREEDS;DOG.STATS=STATS;DOG.KAMPF=KAMPF;DOG.kampfOf=kampfOf;DOG.BAL=BAL;DOG.PARTS=PARTS;DOG.POW={dmg:2.88,res:5.4,exp:1.3,resExp:1.3,off:.15,ref:42};// eingemessen: Rasse gegen Menschen ihrer Zielstufe ≈ 50 % (Wolf gegen Legende Stufe 6); ref = Bezugs-Istwert (Kampfmittel)
const breed=id=>BREEDS.find(b=>b.id===id)||BREEDS.find(b=>b.id==='mastiff');

function shadeHex(h,f){const n=parseInt(h.slice(1),16),c=[n>>16,n>>8&255,n&255].map(v=>cl(Math.round(v*f),0,255));return '#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');}
// Größe → Schulterhöhe und Gewicht: Faktor 0,88–1,12 um die Grundgröße der Rasse; Gewicht wächst mit der Größe hoch 2,6 und etwas mit der Kraft-Anlage
function sizeOf(B,groesse,kraftCap,bulk=.5){const f=cl(1+(groesse-50)*.004,.88,1.12);return {height:Math.round(B.cm0*f),weight:Math.round(B.kg0*Math.pow(f,2.6)*(.94+.12*bulk)*(1+((kraftCap??B.werte.kraft)-B.werte.kraft)*.003))};}
DOG.resize=function(D,groesse){const B=breed(D.breed);D.groesse=cl(Math.round(groesse),1,100);Object.assign(D,sizeOf(B,D.groesse,D.caps?.kraft,D.bulk??.5));return D;};
// Ein einzelner Hund (reines JSON wie ein Gladiator)
DOG.create=function(breedId='mastiff',seed=(Math.random()*4294967296)>>>0){
 const B=breed(breedId),r=mulberry(seed);
 // Sollwerte (Anlage, Obergrenze fürs Training) um den Sollwert der Rasse je Wert; Istwerte etwa 20 Punkte darunter, beide Bernoulli-verteilt
 const caps={},stats={};for(const [k] of STATS){const m=B.werte[k];caps[k]=bern(r,m);stats[k]=Math.min(caps[k],bern(r,m-20));}
 let x=r()*B.coats.reduce((n,c)=>n+c.w,0),coat=B.coats[0];for(const c of B.coats){x-=c.w;if(x<=0){coat=c;break;}}
 const f=.93+r()*.14,col={};for(const k of ['base','light','shade','dark','stripe','tan','patch','patchHi','saddle','belly','spot','tailTip','muzzle'])if(coat[k])col[k]=shadeHex(coat[k],f);
 // Größe: eigene Bernoulli-Streuung, leicht an die Kraft-Anlage gekoppelt; Gewicht folgt Größe und Kraft
 const groesse=bern(r,50,12),bulk=r();const {height,weight}=sizeOf(B,groesse,caps.kraft,bulk);
 return {id:'hund-'+seed.toString(36),seed,wv:2,breed:B.id,breedName:B.name,soll:B.soll,name:NAMES[Math.floor(r()*NAMES.length)],sex:r()<.6?'Rüde':'Hündin',ageYears:2+Math.floor(r()*6),
  groesse,bulk,height,weight,stats,caps,appearance:{coat:coat.id,coatName:coat.name,colors:col,mask:'#1e1611',whiteChest:r()<(B.shape?.whiteChest??.3),earCut:r()<(B.shape?.earCut??.15),scarSeed:Math.floor(r()*1e6),collar:r()<(B.shape?.collar??.55),scars:Math.floor(r()*3),...(B.shape?.whiteFeet?{whiteFeet:r()<B.shape.whiteFeet}:{})},
  wins:0,losses:0,kills:0,dead:false};};

// ---------------------------------------------------------------- Kampfparameter aus den Werten
function params(D){const s=D.stats,W=DOG.POW,ref=W.ref,f=v=>v/ref,B=breed(D.breed),rel=D.weight/(B.kg0||80);
 // Stärke: Kampfmittel der Istwerte (gewichtet wie das Kampf-Soll, Bezug ref) hoch einem Exponenten; Größe innerhalb der Rasse über rel
 const lvl=kampfOf(s)/ref,bal=B.bal??1,pw=bal*Math.pow((lvl+W.off)/(1+W.off),W.exp),pr=bal*Math.pow((lvl+W.off)/(1+W.off),W.resExp),sr=Math.sqrt(rel);
 return {lvl,snap:W.dmg*pw*22*(.55+.45*f(s.biss))*sr,throat:W.dmg*pw*34*(.55+.45*f(s.biss))*sr,shake:W.dmg*pw*12*(.5+.5*f(s.biss))*(.6+.4*f(s.kraft))*sr,lunge:W.dmg*pw*18*(.5+.5*f(s.kraft))*rel,
  run:250*(.62+.38*f(s.tempo)),circle:118*(.7+.3*f(s.tempo)),res:W.res*pr*1.55*(.62+.38*f(s.zaeh))*sr,hold:2.6+1.55*(f(s.kraft)+f(s.wild))/2,interrupt:30*pr*(.7+.3*f(s.zaeh))*(.8+.2*f(s.wild)),
  mass:D.weight*(.6+.4*f(s.kraft)),stam:.75+.25*f(s.ausdauer),wild:cl(f(s.wild)*.47,0,1),mut:cl(f(s.mut)*.52,0,1),evade:cl(.08+f(s.tempo)*.22,.05,.55),sz:D.height/75};}
DOG.params=params;

// ---------------------------------------------------------------- Hund als Kämpfer im Spiel
DOG.makeActor=function(D,team,x,y){
 const rng=S.rng,g=M.makeGladiator(0,team===1);S.rng=rng;
 g.name=D.name;g.id='hund-'+D.id+'-'+Math.floor(Math.random()*1e6).toString(36);g.role='Soldat';g.traits=[];g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};g.equipment={weapon:null,secondary:null,shield:null,armor:{}};
 for(const k in g.stats)g.stats[k]=45;Object.assign(g.stats,{will:100,morale:100,agility:cl(D.stats.tempo,15,95),reflex:cl(D.stats.tempo,15,95),dexterity:cl(D.stats.biss,15,95),strength:D.stats.kraft,toughness:D.stats.zaeh});g.weight=D.weight;g.height=D.height;
 const P=params(D),l=M.createCombatActor(g,team,0),k=D.weight/(breed(D.breed).kg0||80)*(.7+.3*D.stats.zaeh/DOG.POW.ref);
 const tissue={},max={};for(const [p,v] of Object.entries(PART_MAX)){max[p]=v*k;tissue[p]=max[p];}
 Object.assign(l,{rex:true,dog:D,P,x,y,r:16*P.sz,tissue,max,wounds:[],blood:100,bleed:{},trauma:0,morale:100,energy:100,gore:{},mouthBlood:0,spray:[],pool:null,
  velocity:0,heading:team?Math.PI:0,a:team?Math.PI:0,mode:'circle',clock:0,duration:0,cool:.9+Math.random()*.8,side:Math.random()<.5?-1:1,z:0,hit:0,phase:Math.random()*6,
  victim:null,heldBy:null,deathAt:0,cyc:Math.random(),bites:0,grips:0,kills:0,attacks:{},hurtTaken:0});
 return l;};
const isDog=a=>!!a?.dog;
const out=a=>a.g.dead||a.surrendered||(a.dog?(a.fled||a.submit):a.down);
const nameOf=a=>a.g.name;
function log(t){const b=S.battle;if(!b)return;b.log.unshift({time:Math.floor(b.time),text:t});b.log.length=Math.min(60,b.log.length);DOG.onLog?.(t);}
function state(d,mode,dur=0){d.mode=mode;d.clock=0;d.duration=dur;}
DOG.health=d=>cl(Math.min(...['kopf','hals','brust'].map(p=>d.tissue[p]/d.max[p]),(d.tissue.bauch+d.tissue.vl+d.tissue.hl)/(d.max.bauch+d.max.vl+d.max.hl))*100*Math.min(1,d.blood/75),0,100);
function lame(d,p){return 1-d.tissue[p]/d.max[p];}
function condition(d){const h=DOG.health(d)/100;return cl((.45+.55*h)*(1-lame(d,'hl')*.35-lame(d,'vl')*.3)*(d.energy<25?.7:1),.25,1);}

// ---------------------------------------------------------------- Blut
function spray(d,x,y,z,n,force=1,dir=null){for(let i=0;i<n;i++){const an=dir==null?rnd(0,TAU):dir+rnd(-.7,.7),v=rnd(15,70)*force;d.spray.push({x,y,z,vx:Math.cos(an)*v,vy:Math.sin(an)*v*.55,vz:rnd(10,60)*force,s:Math.random()<.3?2:1});}
 if(d.spray.length>220)d.spray.splice(0,d.spray.length-220);}
function stain(x,y,r){M.stains.push({x:x+rnd(-3,3),y:y+rnd(-2,2),r});if(M.stains.length>420)M.stains.shift();}
function stepSpray(d,dt){for(let i=d.spray.length-1;i>=0;i--){const p=d.spray[i];p.vz-=170*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.z<=0){d.spray.splice(i,1);if(Math.random()<.55)stain(p.x,p.y,p.s+Math.random()*1.4);}}}
// ---------------------------------------------------------------- Wunde am Hund
const WOUND_AT={kopf:[[-2,4],[-3,3]],hals:[[-4,4],[-4,4]],brust:[[-6,5],[-4,5]],bauch:[[-9,9],[-4,4]],vl:[[-2,2],[-5,6]],hl:[[-3,3],[-5,6]]};
function addWound(d,part,size,kind){const [u,v]=WOUND_AT[part]||[[-3,3],[-3,3]];d.wounds.push({part,u:rnd(u[0],u[1]),v:rnd(v[0],v[1]),size:cl(size,1,6),kind,seed:Math.random()*1e4,t:S.battle?.time||0});if(d.wounds.length>40)d.wounds.shift();d.gore[part]=Math.min(1,(d.gore[part]||0)+size*.07);}
// Schaden am Hund. kind: bite | tear | cut | stab | blunt | crush
function dogHurt(d,part,dmg,kind,att){if(d.g.dead||dmg<=0)return 0;const P=d.P,wd=dmg/P.res;d.tissue[part]=Math.max(0,d.tissue[part]-wd);d.trauma+=wd;d.hurtTaken+=wd;
 const bleedK={bite:.034,tear:.05,cut:.045,stab:.04,blunt:.008,crush:.012}[kind]??.02,partK={hals:1.8,kopf:1.1,brust:1,bauch:1.2,vl:.8,hl:.8}[part];
 d.bleed[part]=(d.bleed[part]||0)+wd*bleedK*partK;d.blood=Math.max(0,d.blood-wd*{bite:.09,tear:.13,cut:.12,stab:.1,blunt:.03,crush:.05}[kind]*partK);
 d.morale-=wd*(.85-P.mut*.5)*(part==='kopf'?1.2:1);d.hit=.26;d.yelpT=.35;if(wd>3&&(S.battle?.time||0)-(d.lastYelp||-9)>.5){d.lastYelp=S.battle?.time||0;DOG.sound?.('yelp',d);}
 addWound(d,part,wd/4.5,kind);const w=partWorld(d,part);spray(d,w.x,w.y,w.z,Math.min(26,3+wd*1.3),kind==='blunt'?.6:1,att?Math.atan2(d.y-att.y,d.x-att.x):null);if(wd>6)stain(w.x,w.y,2+wd*.15);
 if(att){d.lastAttacker=att.id;att.damage=(att.damage||0)+wd;}
 d.taken=(d.taken||0)+wd;
 if(d.tissue.hals<=0||d.tissue.kopf<=0||d.tissue.brust<=0)dieDog(d,att,{hals:'Kehle zerrissen',kopf:'Schädel zertrümmert',brust:'Brustkorb zerfetzt'}[d.tissue.hals<=0?'hals':d.tissue.kopf<=0?'kopf':'brust']);
 return wd;}
DOG.hurt=dogHurt;
function dieDog(d,a,cause){if(d.g.dead)return;DOG.sound?.('death',d);releaseAll(d);d.g.dead=true;d.down=true;d.death=true;d.z=0;d.deathAt=S.battle?.time||0;d.g.cause=cause||'An den Wunden verendet';d.g.killer=a?nameOf(a):'';if(a){a.kills=(a.kills||0)+1;}state(d,'dead',99);
 log(a?nameOf(a)+' tötet '+d.g.name+'. ('+d.g.cause+')':d.g.name+' verblutet im Sand.');}

// ---------------------------------------------------------------- Treffer eines Menschen am Hund (über M.rexReceive)
function receive(a,d,projectile,snapshot){if(d.g.dead)return;const ef=snapshot||M.effective(a),w=ef.w;if(!projectile&&dist(a,d)>ef.range+d.r+14)return;
 /* Wurfnetz (27.10.): fängt den Hund ein, er lässt los, steht fest und zerrt sich frei; solange leicht zu treffen */
 if(projectile&&w.id==='net'){const fast0=d.mode==='lunge'||d.mode==='leap'?.3:d.velocity>140?.18:0;if(Math.random()>cl(.86+(a.g.stats.precision||48)*.0015-fast0*.5,.35,.97)){M.floater?.(d.x,d.y-30,'NETZ VERFEHLT','#c5c5a0');return;}
  const pw=cl(20+d.dog.weight*.6+((d.dog.stats.kraft||32)-32)*.8,10,90),t=M.netDuration?M.netDuration(w.item,pw):2.5;releaseAll(d);d.z=0;d.netTimer=Math.max(d.netTimer||0,t);d.netMax=d.netTimer;d.netQ=w.item?.q??1;d.netBy=a.id;d.velocity=0;d.netFace=Math.cos(d.a)>=0?1:-1;d.a=d.netFace>0?0:Math.PI;state(d,'threat',t);
  M.recordDamage?.(a,'throw:net',0);M.floater?.(d.x,d.y-30,'IM NETZ','#e9d1a2');log(d.g.name+' verheddert sich im Netz.');DOG.sound?.('whine',d);return;}
 const fast=d.mode==='lunge'?.32:['approach','evade','flee'].includes(d.mode)&&d.velocity>120?.22:d.mode==='circle'?.1:0;
 const ag=a.g.stats,acc=cl(-.24+(projectile?ag.precision:ag.dexterity||48)*.022+(ag.experience||0)*.01-(d.netTimer>0?0:fast)+(d.mode==='grip'?.18:0)+(d.down||d.heldBy?.25:0)+(d.netTimer>0?.3:0),.12,.95);
 if(Math.random()>acc){if(!projectile&&!d.down&&!(d.netTimer>0)&&d.mode!=='grip'&&Math.random()<d.P.evade){state(d,'evade',.4);d.escapeAngle=M.angle(a,d)+rnd(-.6,.6);}return;}
 let dmg=ef.damage*rnd(.8,1.2)*(projectile?1:M.spacingFactor(w,dist(a,d),ef.range))*(a.energy<15?.6:1);if(w.id==='fist')dmg*=.45;else if(w.bladed)dmg*=1.1;
 const rel=Math.abs(M.angleDiff(M.angle(d,a),d.a)),r=Math.random();
 const part=rel<.9?(r<.28?'kopf':r<.45?'hals':r<.78?'brust':'vl'):rel<2.2?(r<.1?'hals':r<.35?'brust':r<.7?'bauch':r<.85?'vl':'hl'):(r<.5?'hl':r<.9?'bauch':'hals');
 const kind=w.bladed?(w.attack==='thrust'||/spear|trident|dagger|javelin/.test(w.id||'')?'stab':'cut'):projectile?'stab':'blunt';
 const wd=dogHurt(d,part,dmg,kind,a);DOG.shotNote?.({kind:'weapon',victim:d,attacker:a,part,dmg:wd,wid:w.id,wname:w.name,wound:d.wounds[d.wounds.length-1],kill:d.g.dead});a.damage=(a.damage||0);M.recordDamage?.(a,ef.attackKey||a.lastAttackKey||'slash',dmg);a.contactPoint={x:d.x,y:d.y-24};if(w.item)w.item.blood=Math.min(1,(w.item.blood||0)+dmg/55);
 if(wd>9)log(nameOf(a)+' trifft '+d.g.name+' '+{kopf:'am Kopf',hals:'am Hals',brust:'an der Brust',bauch:'in die Flanke',vl:'am Vorderlauf',hl:'am Hinterlauf'}[part]+'.');
 if(d.g.dead)return;
 if(d.mode==='grip'){d.interruptDamage=(d.interruptDamage||0)+wd;if(d.interruptDamage>=d.P.interrupt*.35||wd>d.P.interrupt*.25&&Math.random()<.5){release(d);d.escapeAngle=M.angle(a,d);state(d,'evade',.6);d.cool=.8;log(nameOf(a)+' schlägt '+d.g.name+' los.');}}
 else if(wd>7&&!['leap','rear'].includes(d.mode)){d.escapeAngle=M.angle(a,d)+rnd(-.5,.5);state(d,'evade',.45+Math.random()*.3);d.cool=.4;}}
const baseReceive=M.rexReceive;M.rexReceive=function(a,d){if(d?.dog)return receive.apply(this,arguments);return baseReceive?.apply(this,arguments);};

// ---------------------------------------------------------------- Bewegung
const BX=[140,900],BY=[188,598];// Laufbereich des Hundes: Arena minus Körperlänge, damit Kopf und Rute nicht an den Rand stoßen
// Gangarten: Fußfolge [VL nah, HL nah, VL fern, HL fern], Standphase, Schrittlänge, Fußhub (Einheiten vor Größe)
const GAITS=[null,{name:'Schritt',off:[.25,0,.75,.5],duty:.62,stride:9,lift:2.6},{name:'Trab',off:[.5,0,0,.5],duty:.5,stride:13,lift:3.6},{name:'Galopp',off:[.55,0,.45,.1],duty:.36,stride:21,lift:5.5},
 // Renngalopp (nur Modus 'race', Hunderennen): doppelte Schwebephase wie beim Windhund – kurze Bodenkontakte, weit gestreckte Läufe
 {name:'Renngalopp',off:[.58,0,.5,.07],duty:.24,stride:30,lift:7.5}];
const gaitOf=sp=>sp<6?0:sp<100?1:sp<185?2:3;
const cycLen=g=>GAITS[g]?GAITS[g].stride/GAITS[g].duty:1;
DOG.gaitOf=gaitOf;DOG.cycLen=cycLen;
function advance(d,step,dt){d.moveSpeed=step/Math.max(dt,1e-4);const g=gaitOf(d.moveSpeed);if(g)d.cyc=(d.cyc||0)+(step/d.P.sz)/cycLen(g);}
// Freiraum bis zur Wand in einer Richtung (Einheiten, höchstens lim)
function clearance(x,y,an,lim=160){const cx=Math.cos(an),cy=Math.sin(an);let t=lim;if(cx>1e-3)t=Math.min(t,(BX[1]-x)/cx);if(cx<-1e-3)t=Math.min(t,(BX[0]-x)/cx);if(cy>1e-3)t=Math.min(t,(BY[1]-y)/cy);if(cy<-1e-3)t=Math.min(t,(BY[0]-y)/cy);return Math.max(0,t);}
// Beste freie Richtung nahe der gewünschten (für Flucht, Rückzug, Umkreisen an der Wand)
function freeDir(d,want){let best=want,bs=-1e9;for(let i=-6;i<=6;i++){const an=want+i*.3,sc=Math.min(clearance(d.x,d.y,an),130)-Math.abs(i)*9;if(sc>bs){bs=sc;best=an;}}return best;}
DOG.freeDir=freeDir;
function walk(d,tx,ty,v,dt,face=null){if(S.battle?.flat)ty=d.y+(ty-d.y)*.3;
 // Ziel liegt immer innen; nahe der Wand wird rechtzeitig weggelenkt
 tx=cl(tx,BX[0]+25,BX[1]-25);ty=cl(ty,BY[0]+18,BY[1]-18);
 let dx=tx-d.x,dy=ty-d.y;const dd=Math.hypot(dx,dy);let des=Math.atan2(dy,dx);
 if(dd>1&&clearance(d.x,d.y,des,90)<Math.min(dd,90)-1)des=freeDir(d,des);
 d.velocity+=(v-d.velocity)*Math.min(1,dt*(v>d.velocity?5:9));
 const free=clearance(d.x,d.y,d.heading,120);if(free<40)d.velocity*=Math.max(.3,free/40);// bremst vor der Wand statt hineinzulaufen
 const step=Math.min(dd,d.velocity*dt);
 d.heading+=cl(M.angleDiff(des,d.heading),-dt*7,dt*7);const ox=d.x,oy=d.y;d.x=cl(d.x+Math.cos(d.heading)*step,BX[0],BX[1]);d.y=cl(d.y+Math.sin(d.heading)*step,BY[0],BY[1]);
 advance(d,Math.hypot(d.x-ox,d.y-oy),dt);// Beine laufen nur so weit, wie der Hund wirklich vorankommt
 const fa=face?M.angle(d,face):d.heading,da=cl(M.angleDiff(fa,d.a),-dt*8,dt*8);d.a+=da;d.turnStep=Math.max((d.turnStep||0)-dt,Math.abs(da)/dt>1.5?.4:0);}
function away(d,from,dt,v){const an=freeDir(d,Math.atan2(d.y-from.y,d.x-from.x)+(d.side||1)*.35);walk(d,d.x+Math.cos(an)*120,d.y+Math.sin(an)*120,v,dt,d.mode==='flee'||d.mode==='backoff'?null:from);}

// ---------------------------------------------------------------- Angriffe
const DEF={snap:{name:'Schnappbiss',reach:30,hitAt:.16,dur:.34,energy:6},leg:{name:'Beinbiss',reach:30,hitAt:.2,dur:.38,energy:7},throat:{name:'Kehlbiss',reach:30,hitAt:.18,dur:.36,energy:9},leap:{name:'Ansprung',dur:.4,energy:16},rear:{name:'Aufsteigen und Ringen',dur:1,energy:14}};
DOG.ATTACKS=[['stalk','Lauern','Umkreist den Gegner auf Abstand, Kopf tief, Nackenhaare hoch, knurrt. Sucht die Lücke.'],['charge','Anlauf','Galoppiert aus 150–250 Einheiten Abstand gerade auf den Gegner zu.'],['leap','Ansprung','Springt aus vollem Lauf ab (etwa 1,5 m). Packt Arm, Bein oder Brust; mit genug Gewicht wirft er den Menschen um.'],['grip','Verbeißen','Der Kopf bleibt am gepackten Körperteil. Am Arm steigt der Hund hoch und hängt sich hinein, am Bein geht er tief und stemmt sich nach hinten. Schüttelt den Kopf um den Bisspunkt, zerrt und reißt Wunden.'],['arm','Waffenarm gepackt','Hängt der Hund am Schwertarm, kann der Mensch nicht zuschlagen. Am Schildarm schlägt er mit der Waffe zu.'],['throat','Kehle am Boden','Liegt der Gegner, wechselt der Hund an die Kehle und zerrt ihn.'],['snap','Schnappbiss / Beinbiss','Kurze Bisse aus der Nähe, danach Rücksprung.'],['rear','Aufsteigen und Ringen','Nur Hund gegen Hund: Brust an Brust auf den Hinterbeinen. Der Stärkere wirft den anderen um.'],['evade','Ausweichen und neuer Anlauf','Springt beim Ausholen zurück. Nach dem Loslassen weicht er zurück und nimmt neuen Anlauf.'],['flee','Flucht oder Unterwerfung','Bei gebrochenem Mut: Rute eingeklemmt, flieht oder wirft sich auf den Rücken.']];
function hurtHuman(d,t,kind,partId,dmg){const old=t.taken,wasDead=t.g.dead;
 const ef={...M.effective(d),damage:dmg,range:40,attackKey:'dog-'+kind,partId,w:{id:'dog-'+kind,name:{leap:'Ansprung',grip:'Verbeißen',snap:'Biss',leg:'Beinbiss',throat:'Kehlbiss'}[kind]||'Biss',damage:dmg,range:40,weight:kind==='leap'?7:2,pen:.35,crit:1.2,bladed:false,ammo:0,block:0}};
 M.hit(d,t,false,ef);const landed=t.taken>old;
 if(landed){d.bites++;d.mouthBlood=Math.min(1,d.mouthBlood+.16);if(kind!=='leap')DOG.shotNote?.({kind:'human',victim:t,attacker:d,part:partId,dmg:t.taken-old,kill:!wasDead&&t.g.dead});const p=t.g.body[partId];if(p)p.bleed=(p.bleed||0)+.5+dmg*.02;
  try{const pt=M.contactAnchor(t,partId||'chest');spray(d,pt.x,pt.y+8,Math.max(4,t.y-pt.y),7+dmg*.4,1,d.a);}catch{}
  if(!wasDead&&t.g.dead)d.kills++;}
 return landed;}
function hitDog(d,t,kind,part,dmg){if(t.g.dead)return false;
 const dodge=!t.down&&!t.heldBy&&t.mode!=='grip'&&!['leap','rear'].includes(t.mode)&&Math.random()<t.P.evade*(t.energy>30?1:.4)*(kind==='leap'?.7:1)*(kind==='grip'?0:1);
 if(dodge){state(t,'evade',.35);t.escapeAngle=M.angle(d,t);return false;}
 const wd2=dogHurt(t,part,dmg,kind==='leap'?'blunt':kind==='grip'?'tear':'bite',d);d.bites++;if(kind!=='leap')DOG.shotNote?.({kind:'bite',victim:t,attacker:d,part,dmg:wd2,wound:t.wounds[t.wounds.length-1],kill:t.g.dead});d.mouthBlood=Math.min(1,d.mouthBlood+.14);
 if(t.mode==='grip'&&kind!=='leap')t.interruptDamage=(t.interruptDamage||0)+dmg/t.P.res;
 return true;}

// ---------------------------------------------------------------- Bisspunkt am Opfer (Bildschirm-/Weltkoordinaten der Arena)
// Hund: aus seinem Skelett; Mensch: M.contactAnchor des Spiels (stehend oder liegend)
function anchorOf(v,part,t){if(!v)return null;if(isDog(v)){const R=rig(v,t),a=R.anchors[part]||R.anchors.hals,f=Math.cos(v.a)>=0?1:-1,s=v.P.sz;return {x:v.x+f*s*a.x,y:v.y+s*a.y-(v.z||0),ground:v.y};}
 let p;try{const lying=v.down||v.fallTimer>0||v.draggedBy||v.g.dead;
  const vv=lying?{...v,down:true}:v;
  if(lying&&!['head','neck','chest','belly'].includes(part)){const ch=M.contactAnchor(vv,'chest'),be=M.contactAnchor(vv,'belly'),dx=be.x-ch.x,dy=be.y-ch.y,k={lt:1.6,rt:1.6,lsh:2.8,rsh:2.8}[part];
   p=k?{x:be.x+dx*k,y:be.y+dy*k+(part[0]==='l'?-1:1)}:{x:ch.x-dx*.3,y:ch.y-dy*.3+(part[0]==='l'?-3:3)};}
  else p=M.contactAnchor(vv,part);}catch{p={x:v.x,y:v.y-40};}return {x:p.x,y:p.y,ground:v.y};}
DOG.anchorOf=anchorOf;
const ARM=['rfa','lfa','rua','lua','rh','lh'],LEG=['lt','rt','lsh','rsh'];
const weaponArm=p=>['rfa','rua','rh'].includes(p);
// Verbeißen beginnen
function beginGrip(d,t,part){d.victim=t.id;d.gripPart=part;d.grips++;d.interruptDamage=0;d.shakeT=.25;d.gripT=0;d.gripFace=t.x>=d.x?1:-1;d.a=d.gripFace>0?0:Math.PI;
 const hold=d.P.hold*(isDog(t)?.75:ARM.includes(part)?1.5:1.2)*(t.down||t.fallTimer>0?1.25:1);state(d,'grip',hold);
 if(isDog(t)){t.heldBy=d.id;if(!t.down)state(t,'held',99);log(d.g.name+' verbeißt sich '+{hals:'in die Kehle von ',kopf:'im Kopf von ',vl:'im Vorderlauf von ',hl:'im Hinterlauf von ',brust:'in der Brust von ',bauch:'in der Flanke von '}[part]+t.g.name+'!');}
 else{const lying=t.fallTimer>0||t.down;t.grabbedBy=d.id;if(lying){t.draggedBy=d.id;t.fallTimer=Math.max(2.3,t.fallTimer||0);t.fallDuration=Math.max(t.fallDuration||0,t.fallTimer);}
  t.wind=0;t.pendingStrike=null;log(d.g.name+' verbeißt sich in '+({rfa:'den Schwertarm',rua:'den Schwertarm',rh:'die Schwerthand',lfa:'den Schildarm',lua:'den Schildarm',lh:'die linke Hand',lt:'den Oberschenkel',rt:'den Oberschenkel',lsh:'das Bein',rsh:'das Bein',neck:'die Kehle',head:'das Gesicht',chest:'die Brust'}[part]||part)+' von '+nameOf(t)+'!');}}
function release(d){const b=S.battle,t=b?.actors.find(a=>a.id===d.victim);if(t){if(isDog(t)){if(t.heldBy===d.id){t.heldBy=null;if(t.mode==='held'&&!t.g.dead)state(t,'evade',.4);}}else{if(t.grabbedBy===d.id)delete t.grabbedBy;if(t.draggedBy===d.id){delete t.draggedBy;if(!t.g.dead)t.fallTimer=Math.max(t.fallTimer||0,1.1);}t.kx=t.ky=0;}}d.victim=null;d.gripPart=null;d.gripTarget=null;}
function releaseAll(d){release(d);const b=S.battle;if(!b)return;for(const a of b.actors)if(isDog(a)&&a.victim===d.id){release(a);if(!a.g.dead)state(a,'backoff',.6);}d.heldBy=null;}
// Kommt das Maul von hier aus an den Körperteil? (kein Springen an weit entfernte Punkte)
function reachable(d,t,part){const an=anchorOf(t,part,S.battle?.time||0);if(!an)return false;const s=d.P.sz,dx=Math.abs(an.x-d.x)/s,dy=Math.abs(an.ground-d.y);return dx>=6&&dx<=46&&dy<=24*s;}
// Schwacher Moment des Menschen: nur dann kann ein Hund ihn umreißen
function weakMoment(d,t){const legs=Math.min(...['lt','rt','lsh','rsh'].map(id=>t.g.body[id]?.missing?0:t.g.body[id]?.hp??100));const behind=Math.cos(M.angleDiff(M.angle(t,d),t.a))<-.3;
 return (t.energy??100)<25||t.stagger>0||t.wind>0||(t.kneeTimer||0)>0||behind||legs<45||M.health(t.g)<40;}
// Hund bleibt mit dem Maul am Bisspunkt: Körper stellt sich seitlich daneben, Opfer wird gezerrt
function holdOn(d,v,dt){const P=d.P,f=d.gripFace||1,an=anchorOf(v,d.gripPart,S.battle.time);if(!an)return;
 const h=an.ground-an.y,reach=(h>44?17:h<20?27:23)*P.sz;// gehoben am Arm näher dran, tief am Bein weiter weg
 const wx=an.x-f*reach,wy=an.ground+2.5,gx=wx-d.x,gy=wy-d.y,gap=Math.hypot(gx,gy),cap=(d.gripT<.4?55:190)*dt*condition(d),k=gap>cap?cap/gap:1;
 d.x=cl(d.x+gx*k,BX[0],BX[1]);d.y=cl(d.y+gy*k,BY[0],BY[1]);d.a=f>0?0:Math.PI;d.gripTarget={x:(an.x-d.x)*f/P.sz,y:(an.y-d.y)/P.sz};
 // Reißt der Abstand ab (Opfer zu schnell weg), verliert der Hund den Griff, statt hinterherzuspringen
 if(gap-cap>20*P.sz&&d.gripT>.4){release(d);state(d,'backoff',.6);log(d.g.name+' verliert den Griff.');return;}
 // Zerren nach hinten
 if(!isDog(v)&&!v.g.dead&&(v.fallTimer>0||v.down)&&!v.draggedBy){v.draggedBy=d.id;v.fallTimer=Math.max(2.3,v.fallTimer||0);}
 let lying=isDog(v)?v.down:(v.draggedBy||v.down||v.fallTimer>0),ratio=d.dog.weight/(isDog(v)?v.dog.weight:(v.g.weight||80)),pull=(lying?26:isDog(v)?10:5)*ratio*(d.shaking>0?1.7:1)*condition(d);
 {const back=clearance(d.x,d.y,f>0?Math.PI:0,120);if(back<70)pull*=Math.max(0,(back-20)/50);}// nicht in die Wand zerren
 v.x=cl(v.x-f*pull*dt,BX[0]+10,BX[1]-10);if(!isDog(v)){v.kx=v.ky=0;}d.moveSpeed=pull*.8;d.cyc=(d.cyc||0)-pull*dt/P.sz/cycLen(1)*.6;}
DOG.holdOn=holdOn;
// Mensch am Waffenarm gepackt: kann nicht zuschlagen
DOG.humanPre=function(a){const b=S.battle;if(!a.grabbedBy)return false;const d=b.actors.find(x=>x.id===a.grabbedBy);if(!d||d.g.dead||d.victim!==a.id){delete a.grabbedBy;return false;}
 if(weaponArm(d.gripPart)){a.wind=0;a.pendingStrike=null;a.swing=0;a.cool=Math.max(a.cool||0,.2);return true;}return false;};

// ---------------------------------------------------------------- KI-Schritt
function stepBlood(d,dt){let bleed=0;for(const p in d.bleed){d.bleed[p]*=Math.exp(-dt*.035);bleed+=d.bleed[p];}
 d.blood=Math.max(0,d.blood-bleed*dt*.5);d.bleedSum=bleed;
 if(bleed>.25){d.drip=(d.drip||0)-dt;if(d.drip<=0){d.drip=.25+.9/(bleed+.6);const ps=Object.entries(d.bleed).sort((a,b)=>b[1]-a[1])[0][0],w=partWorld(d,ps);stain(w.x,w.y,1+Math.min(3,bleed*.6));if(ps==='hals'&&d.tissue.hals<d.max.hals*.55&&!d.g.dead)spray(d,w.x,w.y,w.z,4+bleed*1.5,.7,d.a);}}
 if((d.down||d.g.dead||d.submit)&&bleed>.1){d.pool??={r:1};d.pool.r=Math.min(26*d.P.sz,d.pool.r+dt*(.25+bleed*.5)*(d.g.dead?1.4:1));}}
function pickHumanPart(d,t){if(t.fallTimer>0||t.down||t.draggedBy)return 'neck';const facing=Math.cos(M.angleDiff(M.angle(t,d),t.a)),r=Math.random();
 // von vorn: Arme (Schild vorne links, Schwert rechts), Brust; von der Seite/hinten: Beine
 if(facing>.3)return r<.45?'rfa':r<.68?'lfa':r<.82?'chest':pick(['rt','lt']);return r<.45?pick(['rt','lt','rsh','lsh']):r<.75?pick(['rfa','lfa']):'chest';}
function step(d,dt){const b=S.battle;d.hit=Math.max(0,d.hit-dt);d.yelpT=Math.max(0,(d.yelpT||0)-dt);d.clock+=dt;d.cool-=dt;d.shaking=Math.max(0,(d.shaking||0)-dt);stepSpray(d,dt);stepBlood(d,dt);if(d.mode!=='leap'&&d.z>0)d.z=Math.max(0,d.z-dt*140);
 if(d.g.dead){if(d.clock<3&&d.bleedSum>.2&&Math.random()<dt*3){const w=partWorld(d,'hals');spray(d,w.x,w.y,4,3,.4);}d.moveSpeed=0;return;}
 if(d.blood<=14){dieDog(d,b.actors.find(a=>a.id===d.lastAttacker),'Verblutet');return;}
 d.energy=Math.min(100,d.energy+dt*(['stalk','circle','threat'].includes(d.mode)?9:3)*d.P.stam);d.morale=Math.min(100,d.morale+dt*.6);
 const P=d.P,cond=condition(d),foes=b.actors.filter(a=>a.team!==d.team&&!a.g.dead&&!a.surrendered&&!(isDog(a)&&a.fled)),live=foes.filter(a=>!out(a));
 d.moveSpeed=0;
 if(!['grip','leap','held','rear'].includes(d.mode)&&!d.down)for(const a of b.actors){if(a===d||a.g.dead&&!a.down)continue;const dx=d.x-a.x,dy=d.y-a.y,dl=Math.hypot(dx,dy)||1,min=(d.r+(a.r||12))*.85;if(dl<min){const mv=Math.min(min-dl,70*dt);d.x=cl(d.x+dx/dl*mv,BX[0],BX[1]);d.y=cl(d.y+dy/dl*mv,BY[0],BY[1]);}}
 if(!d.fled&&!d.submit&&d.morale<12&&(DOG.health(d)<55||d.blood<60)&&!d.heldBy&&d.mode!=='grip'){if(P.mut<.45||Math.random()<.5){d.submit=true;state(d,'submit',99);log(d.g.name+' wirft sich winselnd auf den Rücken.');}else{d.fled=true;state(d,'flee',99);log(d.g.name+' klemmt die Rute ein und flieht!');}releaseAll(d);return;}
 if(d.submit){d.velocity=0;return;}
 /* im Netz: steht fest, wirft sich hin und her (Kopfschütteln), reißt sich nach Ablauf los */
 if(d.netTimer>0){d.netTimer-=dt;d.velocity=0;d.moveSpeed=0;d.energy=Math.max(0,d.energy-dt*4);d.a=(d.netFace??1)>0?0:Math.PI;/* nicht drehen (sah wie Springen aus), nur Kopf schütteln */if(Math.random()<dt*1.6)d.shaking=.32;if(Math.random()<dt*.9)DOG.sound?.('growl',d);
  if(d.netTimer<=0){d.netTimer=0;d.netFree=b.time;M.floater?.(d.x,d.y-30,'LOSGERISSEN','#d8c79a');M.netArt?.drop?.(d);log(d.g.name+' reißt sich aus dem Netz.');state(d,'backoff',.5);d.escapeAngle=d.a+Math.PI;}return;}
 if(d.fled||d.submit){if(Math.random()<dt*.7)DOG.sound?.('whine',d);}
 if(d.fled){const t=foes[0];if(t)away(d,t,dt,P.run*.85*cond);d.energy=Math.max(0,d.energy-dt*6);return;}
 if(d.down){d.velocity=0;if(d.clock>=d.duration&&!d.heldBy){d.down=false;state(d,'backoff',.5);d.escapeAngle=d.a+Math.PI;}return;}
 if(d.mode==='held'){const h=b.actors.find(a=>a.id===d.heldBy);if(!h||h.g.dead||h.victim!==d.id){d.heldBy=null;state(d,'backoff',.4);return;}
  d.velocity=0;d.struggle=(d.struggle||0)-dt;// zieht weg, dreht sich, beißt zurück
  const f=h.gripFace||1;d.x=cl(d.x+f*dt*9*(d.energy>20?1:.3),BX[0],BX[1]);d.a=Math.cos(d.a)*f>0?d.a:d.a;
  if(d.struggle<=0){d.struggle=.45+Math.random()*.4;d.energy-=5;d.twist=.35;
   if(h.gripPart!=='hals'&&Math.random()<.35+P.wild*.4)hitDog(d,h,'snap',pick(['kopf','hals','vl','brust']),P.snap*.8);
   if(Math.random()<.24*(d.P.mass/h.P.mass)*(d.energy>20?1:.4)*(h.gripPart==='hals'?.7:1)){release(h);state(h,'backoff',.45);h.escapeAngle=M.angle(d,h);log(d.g.name+' reißt sich von '+h.g.name+' los.');}}
  d.twist=Math.max(0,(d.twist||0)-dt);return;}
 if(!live.length){d.velocity*=Math.exp(-dt*6);if(d.mode!=='threat')state(d,'threat',3);const t=foes[0];if(t)d.a=M.angle(d,t);return;}
 // Laute: Bellsalven beim Lauern und Umkreisen, Knurren beim Drohen
 d.growlT=Math.max(0,(d.growlT||0)-dt);const loud=['stalk','threat','circle','backoff','approach'].includes(d.mode);
 const SND=breed(d.dog.breed).sound||{};
 if(loud&&!d.barkLeft&&d.energy>25&&Math.random()<dt*(.22+P.wild*.35)*(SND.barkRate??1)){d.barkLeft=1+Math.floor(Math.random()*(SND.barkRate<.5?2:4));d.barkNext=0;}
 if(loud&&!d.barkLeft&&Math.random()<dt*.18*(SND.huff??0)){d.barkAt=b.time-.12;DOG.sound?.('huff',d);}// Schnauben statt Kläffen
 if(d.barkLeft>0&&loud){d.barkNext-=dt;if(d.barkNext<=0){d.barkAt=b.time;d.barkLeft--;d.barkNext=.5+Math.random()*.35;d.energy-=.6;DOG.sound?.('bark',d);}}else if(!loud)d.barkLeft=0;
 if((d.mode==='threat'||d.mode==='stalk')&&d.growlT<=0&&!d.barkLeft&&Math.random()<dt*(d.mode==='threat'?1.6:.45)){d.growlT=.9+Math.random()*1.1;DOG.sound?.('growl',d);}
 let t=b.actors.find(a=>a.id===d.target);
 if(!t||out(t)||t.team===d.team||d.clock>3&&['circle','stalk'].includes(d.mode)){t=live.map(a=>({a,s:dist(d,a)-(a.fallTimer>0||a.down?120:0)+(isDog(a)?0:(M.usableShield?.(a)?40:0))})).sort((x,y)=>x.s-y.s)[0].a;d.target=t.id;}
 const dd=dist(d,t),human=!isDog(t),lying=human?(t.fallTimer>0||t.down||t.kneeTimer>0||!!t.draggedBy):t.down;
 const rel=Math.abs(M.angleDiff(M.angle(t,d),t.a)),behind=rel>2.05;// 0 = vor ihm, π = genau hinter ihm
 const busy=human?(t.target&&t.target!==d.id&&b.actors.some(a=>a.id===t.target&&!out(a))&&(t.engagedUntil>b.time||t.wind>0)):(t.mode==='grip'&&t.victim!==d.id||t.mode==='held'||t.mode==='rear'&&t.wrestle!==d.id);
 // Liegt der Gegner, nicht kreisen: hin und hineinbeißen
 if(lying&&d.energy>3&&!['throat','snap','leg','grip','leap','held','rear'].includes(d.mode)){d.groundPart=null;d.throatSide=null;d.apT=0;state(d,'throat',human?0:DEF.throat.dur);d.struck=false;}
 // Rückzug vor einem ausholenden Menschen
 if(human&&['stalk','circle','threat','snap','leg'].includes(d.mode)){const sw=live.find(a=>!isDog(a)&&a.wind>0&&a.target===d.id&&dist(a,d)<85);if(sw&&sw.wind!==d.seenWind){d.seenWind=sw.wind;if(Math.random()<P.evade*.8){state(d,'backoff',.3);d.escapeAngle=M.angle(sw,d)+rnd(-.5,.5);}}}
 switch(d.mode){
 case 'grip':{const v=b.actors.find(a=>a.id===d.victim);if(!v||v.g.dead&&d.clock>1||v.surrendered){release(d);state(d,'backoff',.6);d.cool=.6;return;}
  d.velocity=0;d.energy-=dt*6;d.shakeT-=dt;d.gripT+=dt;
  if(d.shakeT<=0){d.shakeT=.42+Math.random()*.3;d.shaking=.32;DOG.sound?.('shake',d);
   const throat=d.gripPart==='hals'||d.gripPart==='neck',vLying=isDog(v)?v.down:(v.fallTimer>0||v.down||v.draggedBy),dmg=P.shake*(throat&&vLying?1.6:1)*rnd(.75,1.25);
   if(isDog(v)){hitDog(d,v,'grip',d.gripPart,dmg*.5);if((d.gripPart==='vl'||d.gripPart==='hl')&&!v.down&&Math.random()<.22*(d.P.mass/v.P.mass)){v.down=true;state(v,'down',1.1);log(d.g.name+' reißt '+v.g.name+' von den Beinen.');}}
   else{hurtHuman(d,v,'grip',d.gripPart,dmg*1.4);
    if(!v.g.dead&&!vLying){const ratio=d.dog.weight/(v.g.weight||80),weak=weakMoment(d,v);
     if(LEG.includes(d.gripPart)&&Math.random()<.025*ratio*(weak?4:1)*(1+P.wild*.5)){M.knockdown(v,'Von '+d.g.name+' am Bein umgerissen',2.4);log(d.g.name+' reißt '+nameOf(v)+' am Bein von den Füßen!');}
     else if(Math.random()<.25)log(d.g.name+(ARM.includes(d.gripPart)?' zerrt am Arm von ':LEG.includes(d.gripPart)?' zerrt am Bein von ':' reißt an ')+nameOf(v)+'.');}
    if(!v.g.dead&&throat&&v.g.body.neck.hp<8)M.death(v,'Kehle durchgebissen',d);
    // Abschütteln: Kraft des Menschen gegen den Griff
    if(!v.g.dead&&!vLying&&Math.random()<.045*((v.g.stats.strength||50)/50)*(1.25-P.wild)*(weaponArm(d.gripPart)?.8:1)){release(d);state(d,'backoff',.7);d.escapeAngle=M.angle(v,d);d.cool=.9;log(nameOf(v)+' schüttelt '+d.g.name+' ab.');return;}}}
  if(d.clock>=d.duration||d.energy<8){release(d);state(d,'backoff',.6);d.cool=.6;}
  return;}
 case 'leap':{const p=cl(d.clock/d.duration,0,1),q=p*(2-p);d.x=d.sx+(d.ex-d.sx)*q;d.y=d.sy+(d.ey-d.sy)*q;d.z=Math.sin(p*Math.PI)*(human?15:11)*P.sz;d.moveSpeed=P.run;
  if(!d.leapHit&&p>.45&&dist(d,t)<34*P.sz+t.r){d.leapHit=true;
   if(isDog(t)){if(hitDog(d,t,'leap','brust',P.lunge*.6)){const knock=P.mass*rnd(.6,1.3)>t.P.mass*rnd(.85,1.35)*(t.energy>30?1:.75);if(knock){t.down=true;releaseAll(t);state(t,'down',.9+Math.random()*.7);log(d.g.name+' springt '+t.g.name+' an und wirft ihn um!');}d.leapPart=knock?'hals':pick(['hals','kopf','vl']);}}
   else{const part=pickHumanPart(d,t),ok=hurtHuman(d,t,'leap',part,P.lunge*.45+P.snap*.5);
    if(ok){d.leapPart=part;if(part==='chest'){const weak=weakMoment(d,t),mass=d.dog.weight*rnd(.8,1.25),stand=(t.g.weight||80)*(.6+(t.g.stats.balance||50)/125);
      if(Math.random()<(weak?.45:.06)&&mass>stand*.7){M.knockdown(t,'Von '+d.g.name+' angesprungen',2.6);t.kx+=Math.cos(d.a)*35;t.ky+=Math.sin(d.a)*35;d.leapPart=null;log(d.g.name+' springt '+nameOf(t)+' im falschen Moment an und reißt ihn um!');}
      else{d.leapPart=pick(['rfa','lfa']);log(d.g.name+' prallt gegen '+nameOf(t)+', der Mann hält stand.');}}}
    else log(nameOf(t)+' wehrt den Sprung von '+d.g.name+' ab.');}}
  if(p>=1){d.z=0;d.cool=.3;if(d.leapPart&&!out(t)&&reachable(d,t,d.leapPart)){beginGrip(d,t,d.leapPart);}else{state(d,'recover',.45+Math.random()*.3);}d.leapPart=null;}
  return;}
 case 'recover':{d.velocity*=Math.exp(-dt*5);walk(d,d.x-Math.cos(d.a)*30,d.y,40,dt,t);if(d.clock>=d.duration){state(d,'backoff',.7);d.escapeAngle=M.angle(t,d)+rnd(-.6,.6);}return;}
 case 'throat':if(human&&lying){if(!d.groundPart){const opts=[['neck',45],['chest',10],['rfa',18],['lfa',12],['lt',14],['rt',14],['lsh',8],['rsh',8]];let best=null;for(const [pt,bonus] of opts){const a2=anchorOf(t,pt,b.time);if(!a2)continue;const side=a2.x>=d.x?1:-1,ax2=a2.x-side*28*P.sz;if(ax2<BX[0]+4||ax2>BX[1]-4)continue;const c2=Math.hypot(a2.x-d.x,a2.ground-d.y)-bonus*P.sz-Math.random()*20-(reachable(d,t,pt)?80:0);if(!best||c2<best[1])best=[pt,c2];}d.groundPart=best?best[0]:'chest';}
   const part=d.groundPart,an=anchorOf(t,part,b.time);if(!an){state(d,'backoff',.5);return;}const f=d.throatSide??(d.throatSide=an.x>=d.x?1:-1),gx=an.x-f*28*P.sz,gy=an.ground+2;
   if(Math.hypot(gx-d.x,gy-d.y)>5*P.sz&&!(reachable(d,t,part)&&d.clock>.25)){walk(d,gx,gy,P.run*.8*cond,dt,null);d.a=f>0?(Math.abs(M.angleDiff(d.heading,0))<1.6?d.a:d.a):d.a;if(d.clock>3.5){d.throatSide=null;d.groundPart=null;state(d,'backoff',.6);}return;}
   d.a=f>0?0:Math.PI;d.velocity=0;d.throatSide=null;d.groundPart=null;const ok=hurtHuman(d,t,'throat',part,part==='neck'?P.throat:P.snap*1.1);if(ok&&!out(t)&&reachable(d,t,part)){beginGrip(d,t,part);log(d.g.name+' beißt sich in den Liegenden.');}else state(d,'backoff',.5);return;}
 // fällt durch
 case 'snap':case 'leg':{if(d.mode==='throat'&&human&&!lying){state(d,'leg',DEF.leg.dur);d.struck=false;}const A=DEF[d.mode];
  if(!d.struck&&dist(d,t)>A.reach*P.sz+t.r+6){walk(d,t.x,t.y,P.run*(lying?.85:.65)*cond,dt,t);d.clock=0;d.apT=(d.apT||0)+dt;if(d.apT>2.8){d.apT=0;state(d,isDog(t)?'circle':'stalk',0);}return;}
  d.apT=0;d.velocity*=Math.exp(-dt*7);d.a+=cl(M.angleDiff(M.angle(d,t),d.a),-dt*9,dt*9);
  if(!d.struck&&d.clock>=A.hitAt){d.struck=true;if(dist(d,t)<=A.reach*P.sz+t.r+12){
   let part,dmg=d.mode==='throat'?P.throat:P.snap;
   if(isDog(t))part=d.mode==='throat'?'hals':d.mode==='leg'?pick(['vl','vl','hl']):pick(['kopf','hals','brust','brust','vl']);
   else part=d.mode==='throat'?'neck':d.mode==='leg'?pick(['lsh','rsh','lt','rt']):pick(['rfa','lfa','rt','lt']);
   const ok=isDog(t)?hitDog(d,t,d.mode,part,dmg):hurtHuman(d,t,d.mode,part,dmg);
   const gripChance=d.mode==='throat'?.9:(d.mode==='leg'?.5+P.wild*.3:.25+P.wild*.25);
   if(ok&&!out(t)&&Math.random()<gripChance&&(isDog(t)||reachable(d,t,part))){beginGrip(d,t,part);return;}}}
  if(d.clock>=A.dur){state(d,'backoff',.35+Math.random()*.3);d.escapeAngle=M.angle(t,d)+rnd(-.7,.7);d.cool=.5+Math.random()*.6*(1.2-P.wild);}
  return;}
 case 'rear':{const o=b.actors.find(a=>a.id===d.wrestle);if(!o||o.g.dead||o.mode!=='rear'&&d.clock>.1){state(d,'backoff',.4);return;}
  d.velocity=0;d.a=M.angle(d,o);const f=Math.cos(d.a)>=0?1:-1,mid=(d.x+o.x)/2;d.x+=(mid-f*15*P.sz-d.x)*Math.min(1,dt*6);d.y+=((d.y+o.y)/2-d.y)*Math.min(1,dt*6);d.energy-=dt*12;
  if(d.wrestleLead&&d.clock>=d.duration){const me=P.mass*(d.energy/100+.4)*rnd(.6,1.4),him=o.P.mass*(o.energy/100+.4)*rnd(.6,1.4);const [win,lose]=me>=him?[d,o]:[o,d];
   lose.down=true;state(lose,'down',1+Math.random()*.6);log(win.g.name+' wirft '+lose.g.name+' im Ringen um!');hitDog(win,lose,'snap','brust',win.P.snap*.5);
   if(win.energy>15&&Math.random()<.65+win.P.wild*.3){win.cool=0;state(win,'throat',DEF.throat.dur);win.struck=false;win.target=lose.id;}else state(win,'backoff',.3);
   d.wrestle=o.wrestle=null;}
  return;}
 case 'backoff':case 'evade':{let an=d.escapeAngle??M.angle(t,d);if(clearance(d.x,d.y,an,90)<70){an=freeDir(d,an);d.escapeAngle=an;}walk(d,d.x+Math.cos(an)*90,d.y+Math.sin(an)*90,P.run*.75*cond,dt,human&&d.clock>.35?t:null);d.energy-=dt*5;if(d.clock>=d.duration){state(d,human?'stalk':'circle',0);d.stalkT=(human?.5:.4)+Math.random()*(human?.9:.8)*(1.3-P.wild);}return;}
 case 'threat':{d.velocity*=Math.exp(-dt*6);d.a+=cl(M.angleDiff(M.angle(d,t),d.a),-dt*6,dt*6);if(d.clock>=d.duration)state(d,human?'stalk':'circle',0);if(dd<50&&Math.random()<dt*2){state(d,'snap',DEF.snap.dur);d.struck=false;}return;}
 case 'charge':{// Anlauf im Galopp, dann Absprung
  walk(d,t.x,t.y,P.run*1.08*cond,dt,t);d.energy-=dt*14;
  const leapAt=(human?82:70)*P.sz+t.r;
  if(dd<leapAt&&dd>28*P.sz&&d.velocity>P.run*.55){d.sx=d.x;d.sy=d.y;const an=M.angle(d,t),len=Math.max(10,dd-(human?30:20)*P.sz);d.ex=cl(d.x+Math.cos(an)*len,BX[0],BX[1]);d.ey=cl(d.y+Math.sin(an)*len,BY[0],BY[1]);d.leapHit=false;d.leapPart=null;d.energy-=DEF.leap.energy;state(d,'leap',DEF.leap.dur*(.9+dd/400));d.a=an;DOG.sound?.('snarl',d);return;}
  if(lying&&human){state(d,'throat',0);d.throatSide=null;return;}
  if(dd<=28*P.sz+t.r){state(d,human?'leg':'snap',DEF.snap.dur);d.struck=false;return;}
  if(d.clock>2.4)state(d,'stalk',0);return;}
 case 'approach':{walk(d,t.x,t.y,P.run*cond,dt,t);d.energy-=dt*10;const A=DEF[d.next];
  if(d.next==='rear'&&isDog(t)&&dd<44*P.sz&&!['grip','leap','rear','held'].includes(t.mode)&&!t.down){state(d,'rear',.9+Math.random()*.5);d.wrestle=t.id;d.wrestleLead=true;t.wrestle=d.id;t.wrestleLead=false;state(t,'rear',d.duration+.2);releaseAll(t);d.energy-=DEF.rear.energy;return;}
  if(A&&d.next!=='rear'&&dd<(A.reach||30)*P.sz+t.r+4){d.energy-=A.energy||6;state(d,d.next,A.dur);d.struck=false;return;}
  if(d.clock>2.2||d.next==='rear'&&(t.down||t.mode==='grip'))state(d,'circle',0);return;}
 case 'stalk':{// lauern: Abstand halten, seitlich ziehen, dann Anlauf
  if(lying&&dd<300){state(d,human?'throat':'charge',0);d.throatSide=null;d.groundPart=null;return;}
  // Gelegenheit: hinter ihm, oder er ist mit einem anderen beschäftigt
  if((behind||busy&&rel>1.2)&&d.energy>30&&dd<270&&dd>40&&d.cool<=0){d.fromBehind=behind;state(d,'charge',0);log(d.g.name+(behind?' greift '+nameOf(t)+' von hinten an!':' nutzt die Lücke und stürmt auf '+nameOf(t)+' zu!'));return;}
  const R=(150+60*(1-P.wild))*(isDog(t)?.6:1);d.orbit=(d.orbit??M.angle(t,d))+d.side*dt*.32;
  // klug: beim Umkreisen in den Rücken des Gegners arbeiten
  d.orbit+=cl(M.angleDiff(t.a+Math.PI,d.orbit),-1,1)*dt*(.35+P.wild*.25+(busy?.6:0));
  walk(d,t.x+Math.cos(d.orbit)*R,t.y+Math.sin(d.orbit)*R*.75,(Math.abs(dd-R)>40?P.run*.55:P.circle*.6)*cond,dt,t);
  if(Math.random()<dt*.25)d.side*=-1;
  {const ox=t.x+Math.cos(d.orbit)*R,oy=t.y+Math.sin(d.orbit)*R*.75;if((ox<BX[0]+20||ox>BX[1]-20||oy<BY[0]+15||oy>BY[1]-15)&&(d.wallFlip||0)<b.time){d.side*=-1;d.wallFlip=b.time+1.2;}}
  d.stalkT=(d.stalkT??1.2)-dt;
  if(dd<60*P.sz&&d.cool<=0){state(d,human?pick(['leg','snap']):'snap',DEF.snap.dur);d.struck=false;return;}
  if(d.stalkT<=0&&d.energy>35&&d.cool<=0&&dd>110){state(d,'charge',0);log(d.g.name+' nimmt Anlauf.');return;}
  if(d.stalkT<=0&&dd<=110){if(dd>45&&d.energy>35&&Math.random()<.55){state(d,'charge',0);log(d.g.name+' stürmt los.');}else{d.escapeAngle=M.angle(t,d)+rnd(-.5,.5);state(d,'backoff',.9);d.stalkT=.6;}}
  return;}
 default:{// Hund gegen Hund: dichtes Umkreisen, Bisse, Ringen, ab und zu Anlauf
  if(human){state(d,'stalk',0);return;}
  if(d.mode!=='circle')state(d,'circle',0);
  if(d.energy<18){d.velocity*=Math.exp(-dt*5);d.a+=cl(M.angleDiff(M.angle(d,t),d.a),-dt*5,dt*5);return;}// erschöpft: stehen, hecheln, Gegner ansehen
  const R=78*(.9+P.mut*.2);d.orbit=(d.orbit??M.angle(t,d))+d.side*dt*.55;d.orbit+=cl(M.angleDiff(t.a+Math.PI,d.orbit),-1,1)*dt*(.25+P.wild*.2+(busy?.8:0));
  walk(d,t.x+Math.cos(d.orbit)*R,t.y+Math.sin(d.orbit)*R*.8,P.circle*cond,dt,t);
  if(Math.random()<dt*.35)d.side*=-1;
  if(d.clock>.6&&Math.random()<dt*.22){state(d,'threat',.6+Math.random()*.6);return;}
  if(d.cool<=0&&d.energy>(22-P.wild*12)){
   if(t.down||t.mode==='held'){state(d,'throat',DEF.throat.dur);d.struck=false;return;}
   if((behind||busy)&&dd<120){d.next=Math.random()<.6?'leg':'snap';state(d,'approach',0);log(d.g.name+(busy?' fällt '+t.g.name+' in die Flanke!':' packt '+t.g.name+' von hinten!'));return;}
   const r=Math.random();if(dd>70&&r<.22){state(d,'charge',0);return;}d.next=dd<60&&r<.45+P.wild*.15&&!t.down?'rear':r<.75?'snap':'leg';state(d,'approach',0);}
 }}}
DOG.step=step;DOG.release=release;DOG.out=out;

// =====================================================================================================
// SKELETT · Seitenansicht, Kopf nach +x, Ursprung = Boden unter der Körpermitte, 1 Einheit = 2,22 cm (vor Größe)
// Vier getrennte Beine mit Gelenken (Schulter–Ellbogen–Pfote, Hüfte–Knie–Sprunggelenk–Pfote), Füße stehen fest.
// =====================================================================================================
function rr(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));}
function poly(c,pts,col){c.fillStyle=col;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();}
function seg(c,x,y,xx,yy,w,col){const n=Math.max(1,Math.ceil(Math.hypot(xx-x,yy-y)/Math.max(.5,Math.min(1.5,w*.7))));for(let i=0;i<=n;i++)rr(c,x+(xx-x)*i/n-w/2,y+(yy-y)*i/n-w/2,w,w,col);}
// Glied als Viereck mit runden Enden (wirkt wie Muskel statt Pixelkette)
function limb(c,x,y,xx,yy,w1,w2,col){const dx=xx-x,dy=yy-y,l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;poly(c,[[x+nx*w1/2,y+ny*w1/2],[xx+nx*w2/2,yy+ny*w2/2],[xx-nx*w2/2,yy-ny*w2/2],[x-nx*w1/2,y-ny*w1/2]],col);disk(c,x,y,w1/2,col);disk(c,xx,yy,w2/2,col);}
function disk(c,x,y,r,col){c.fillStyle=col;c.beginPath();c.arc(Math.round(x),Math.round(y),Math.max(.5,r),0,TAU);c.fill();}
function hrand(s){const x=Math.sin(s*12.9898)*43758.5453;return x-Math.floor(x);}
function ik(jx,jy,fx,fy,a,b,dir){let dx=fx-jx,dy=fy-jy,dd=Math.hypot(dx,dy);const mx=a+b-.05;if(dd>mx){fx=jx+dx/dd*mx;fy=jy+dy/dd*mx;dx=fx-jx;dy=fy-jy;dd=mx;}dd=Math.max(dd,Math.abs(a-b)+.1);
 const th=Math.atan2(dy,dx),al=Math.acos(cl((a*a+dd*dd-b*b)/(2*a*dd),-1,1)),an=th+dir*al;return {kx:jx+Math.cos(an)*a,ky:jy+Math.sin(an)*a,fx,fy};}
const HS=1.22,MOUTH={x:11.6,y:1.3};
// Gestalt je Rasse (Standard = Mastiff). Rassen ohne eigenes shape werden in Mastiff-Gestalt gezeichnet.
const SHAPE0={head:'mastiff',L:31,leg:1,thick:1,chest:0,tuck:0,withers:0,crest:8.5,dew:5.5,tailW:4.6,tailSeg:2.5,tailUp:0,tailCurl:-.07,legW:1,hindW:1,neckX:0,neckY:0,rough:0,ruff:0,piebald:0,bushy:0,saddle:0,folds:0,ridge:0,urajiro:0,spots:0,cords:0,silk:0,legFeather:0,tailFeather:0,tailRing:0,ribs:0,tipWhite:0,wolfEar:1,wolfMz:1,mouth:MOUTH,eye:{x:4.6,y:-4.2}},SHAPES=new Map();
function shapeOf(d){const id=(d?.dog||d)?.breed||'mastiff';let s=SHAPES.get(id);if(!s){s={...SHAPE0,...(breed(id).shape||{})};SHAPES.set(id,s);}return s;}
DOG.shapeOf=shapeOf;
// Stimmung: Kopf, Ohren, Rute, Lefzen
function mood(d,t){const m=d.mode,dead=d.g?.dead;const o={head:0,headX:0,headY:0,jaw:0,lips:0,hackle:0,ears:0,tail:.15,tuck:0,tongue:0,pant:0,blink:0,eyeWhite:0,lick:0,sniff:0,earFlick:0,quiver:0,drool:0,yawn:0};
 if(m==='threat'){o.head=.2;o.headY=3;o.hackle=1;o.jaw=.18;o.lips=1;o.tail=.6;}
 else if(m==='stalk'){o.head=.28;o.headY=4;o.hackle=.9;o.lips=.7;o.tail=.35;}
 else if(m==='circle'||m==='approach'){o.hackle=.7;o.head=.1;o.headY=1.5;o.tail=.45;o.lips=.6;}
 else if(m==='race'){o.head=-.12;o.headX=3;o.headY=1.5;o.ears=1;o.tail=-.05;o.jaw=.42;o.lips=0;o.tongue=.75;o.pant=1;o.drool=.4;}
 else if(m==='charge'){o.head=.05;o.headX=2;o.headY=1;o.ears=.8;o.tail=.2;o.hackle=.4;o.jaw=.35;o.lips=.6;o.tongue=.3;}
 else if(m==='snap'||m==='leg'||m==='throat'){const p=cl(d.clock/.18,0,1),back=d.clock>.22?cl((d.clock-.22)/.15,0,1):0;o.headX=6*p*(1-back);o.headY=(m==='leg'?10:m==='throat'?7:1)*p*(1-back);o.head=(m==='leg'?.55:m==='throat'?.4:-.05)*p;o.jaw=p<.85?.95:.05;o.lips=1;o.hackle=.8;o.ears=.3;}
 else if(m==='leap'){o.jaw=.95;o.lips=1;o.headX=3;o.hackle=1;o.tail=.1;o.ears=.7;}
 else if(m==='grip'){o.jaw=.06;o.lips=1;o.hackle=1;o.tail=.2;o.quiver=.6;o.ears=.4;}
 else if(m==='held'){o.head=-.35;o.headY=-2;o.jaw=.65+.25*Math.sin(t*11);o.lips=1;o.ears=1;o.tail=-.2;o.tuck=.4;}
 else if(m==='rear'){o.jaw=.75+.2*Math.sin(t*9);o.lips=1;o.hackle=1;o.head=-.3;o.tail=.3;}
 else if(m==='backoff'||m==='evade'||m==='recover'){o.ears=.6;o.tail=-.05;o.head=.05;o.hackle=.5;o.lips=.4;}
 else if(m==='flee'){o.ears=1;o.tail=-.7;o.tuck=1;o.head=.3;o.headY=3;}
 else if(m==='submit'){o.ears=1;o.tuck=1;o.jaw=.2+.1*Math.sin(t*3);}
 if(m==='sleep'){o.blink=1;o.ears=.3;o.tail=-.2;o.jaw=0;o.lips=0;o.hackle=0;}
 if(m==='rest'){o.ears=.1;o.tail=-.1;o.lips=0;o.hackle=0;}
 if(m==='gnaw'){o.jaw=.25+.25*Math.max(0,Math.sin(t*8));o.lips=.6;o.bone=d.chew==='skull'?0:1;}
 if(m==='drink'){o.jaw=.2;o.tongue=.4+.4*Math.max(0,Math.sin(t*9));o.lips=0;}
 if(m==='scratch'){o.blink=Math.sin(t*3)>0?1:0;o.ears=.5;}
 if(m==='sit'){o.lips=0;o.hackle=0;o.tail=.05;}
 if(m==='stretch'){const q=(d.clock%2.8);o.hackle=0;o.lips=0;o.tail=q<1.4?.9:.2;o.ears=.5;o.jaw=q>.35&&q<1.1?.9*Math.sin((q-.35)/.75*Math.PI):0;o.yawn=o.jaw;o.tongue=o.jaw*.6;o.blink=q>.4&&q<1?1:0;}
 if(m==='scent'){o.sniff=1;o.ears=-.3;o.hackle=0;o.lips=0;o.tail=.35+.1*Math.sin(t*4);o.head=-.55+.08*Math.sin(t*1.7);o.headY=-5;o.headX=1;}
 if(m==='bars'){o.jaw=Math.max(o.jaw,.2);o.hackle=1;o.lips=1;}
 if(m==='shakeoff'){o.ears=.5+.6*Math.sin(t*26);o.jaw=.15;}
 if(d.down&&!dead&&m!=='submit'){o.ears=.7;o.jaw=.45+.2*Math.sin(t*7);o.tail=-.3;}
 if(dead){o.jaw=.35;o.tongue=1;o.tail=-.4;o.ears=.5;}
 // Bellen: Kopf ruckt vor und hoch, Maul springt auf, Brust stößt
 const bk=d.barkAt!=null?t-d.barkAt:9;
 if(bk>=0&&bk<.24&&!dead){const q=bk<.05?bk/.05:Math.max(0,1-(bk-.05)/.19);o.jaw=Math.max(o.jaw,.95*q);o.headX+=2.4*q;o.head-=.22*q;o.lips=Math.max(o.lips,.7);o.hackle=Math.max(o.hackle,.8);o.ears=Math.min(o.ears,.1);o.bark=q;}
 // Knurren: Lefzen hoch und zitternd, Maul einen Spalt offen, Kopf tief
 if((d.growlT||0)>0&&!dead&&!o.bark){o.lips=1;o.quiver=1;o.jaw=Math.max(o.jaw,.14+.05*Math.sin(t*38));o.hackle=1;o.head+=.1;o.headY+=1.5;}
 if((d.energy??100)<35&&!['grip','leap'].includes(m)&&!dead&&!o.bark){o.pant=1;o.jaw=Math.max(o.jaw,.38+.12*Math.sin(t*15));o.tongue=Math.max(o.tongue,.75);o.drool=1;}
 // Gesten in ruhigen Momenten: Schnüffeln, Lefzen lecken, Ohrenzucken, Kopf schief, Gähnen
 const idle=['stand','circle','stalk','backoff','threat','sit','rest','pace'].includes(m)&&!d.down&&!dead&&!o.bark&&!(d.growlT>0);
 if(idle){const sd=(d.dog?.seed||0)%997,w=Math.floor(t/1.8+sd*.01),ph=((t/1.8+sd*.01)%1+1)%1,r=hrand(w*3.7+sd),on=Math.sin(Math.PI*cl(ph/.55,0,1));
  if(r<.2&&m!=='threat'){o.sniff=on;o.head+=.5*on;o.headY+=6*on;o.headX+=2*on;}
  else if(r<.36){o.lick=on;}
  else if(r<.52)o.earFlick=on;
  else if(r<.6&&(m==='stand'||m==='backoff')){o.yawn=on;o.jaw=Math.max(o.jaw,.95*on);o.head-=.3*on;o.tongue=Math.max(o.tongue,.4*on);}
  else if(r<.75)o.head+=.14*Math.sin(ph*TAU);}
 if(d.forceSniff&&!dead){o.sniff=1;o.head+=.5;o.headY+=6;o.headX+=2;}
 if(((t*.31+((d.dog?.seed||0)%13)*.11)%1)<.035&&!dead)o.blink=1;
 if(['flee','submit','held'].includes(m)||d.yelpT>0)o.eyeWhite=1;
 if(d.yelpT>0){o.ears=1;o.head-=.25;o.jaw=.75;}
 if(d.intro){const I=d.intro;o.lips=I.lips;o.jaw=I.jaw;o.quiver=I.quiver;o.ears=I.ears;o.head=I.head;o.headX=0;o.headY=0;o.hackle=1;o.drool=1;o.blink=0;o.eyeWhite=0;o.sniff=0;o.lick=0;o.yawn=0;o.tongue=0;o.pant=0;o.bark=0;}
 return o;}
DOG.mood=mood;
// Skelett berechnen. target: Bisspunkt in lokalen Einheiten (Verbeißen)
function rig(d,t,target=null){const o=mood(d,t),dead=!!d.g?.dead,m=d.mode,SH=shapeOf(d),MO=SH.mouth;
 const rest=m==='rest'||m==='gnaw',sleep=m==='sleep',sit=m==='sit'||m==='scratch',lie=dead||d.down||m==='submit'||d.submit||sleep,low=lie||rest,sp=d.moveSpeed||0,gi=m==='race'?4:low||sit||m==='leap'||m==='rear'||m==='bars'||m==='grip'||m==='drink'?0:gaitOf(sp),G=GAITS[gi],c=d.cyc||0,ph=c*TAU;
 const breathe=dead?0:Math.sin(t*(o.pant?15:sleep?1.6:3))*(o.pant?.8:sleep?.7:.4);
 let p=0,L=SH.L,LG=SH.leg,hipX=-17+(31-SH.L)*.5,hipY=-27-(LG-1)*21+breathe*.3,bend=0,shake=d.shaking>0?Math.sin(t*44)*(d.shaking/.32):0;
 let nod=0;
 if(gi===4){const e=d.raceStretch??1;L+=4.6*e*Math.cos(ph);p=.06*Math.sin(ph)-.03;hipY-=(3.2*Math.abs(Math.sin(ph))+1.2)*e;bend=-3.6*e*Math.cos(ph);nod=1.4*Math.sin(ph+.6);}
 else if(gi===3){L+=2.6*Math.cos(ph);p=.08*Math.sin(ph);hipY-=1.8*Math.abs(Math.sin(ph));bend=-2.4*Math.cos(ph);nod=2.4*Math.sin(ph+.6);}
 else if(gi>0){hipY+=Math.sin(ph*2)*.7*(gi===2?1.5:1);p+=.035*Math.sin(ph*2+1.2)*(gi===2?1.3:1);nod=(gi===2?1.2:1.6)*Math.sin(ph*2+.9);}
 // Gewicht verlagern im Stand
 if(!gi&&!low&&!sit&&!['leap','rear','bars','grip'].includes(m)){p+=.012*Math.sin(t*.9+(d.dog?.seed||0));hipY+=.4*Math.sin(t*.7);}
 if(o.bark)p+=.05*o.bark;
 if(m==='stalk'||m==='threat'){hipY+=1.5;p=-.03;}
 if(m==='snap'||m==='leg'||m==='throat'){const q=cl(d.clock/.2,0,1)*(d.clock>.25?1-cl((d.clock-.25)/.12,0,1):1);p=-.05*q;hipX+=2*q;}
 if(m==='held'){p=.04*Math.sin(t*8)+(d.twist||0)*.15;}
 if(m==='leap'){const q=cl(d.clock/(d.duration||.4),0,1);p=.14-.32*q;L+=2;}
 if(m==='rear'){p=.88+.04*Math.sin(t*12);hipX+=4;hipY+=5;}
 if(m==='bars'){p=1+.03*Math.sin(t*9);hipX+=6;hipY+=6;}// Vorderpfoten am Gitter
 if(sit){p=.62;hipX+=2;hipY=-9.5+breathe*.2;}
 if(m==='scratch'){p=.55+.02*Math.sin(t*28);}
 if(m==='drink'){p=-.12;hipY+=1;}
 if(m==='shakeoff'){p+=.05*Math.sin(t*26);}
 if(rest){hipY=-10.5;p=.02;}
 if(m==='stretch'){const q=(d.clock%2.8),bow=q<1.4?Math.sin(Math.min(1,q/.5)*Math.PI/2)*(q>1.1?1-(q-1.1)/.3:1):0,back=q>=1.4&&q<2.6?Math.sin((q-1.4)/1.2*Math.PI):0;p=-.34*bow+.06*back;hipY+=3*bow-2.5*back;hipX+=-1.5*bow+3*back;d._bow=bow;d._back=back;}
 if(m==='scent'){p=.05;hipY-=.5;}
 if(lie){hipY=-9;p=0;}
 // Verbeißen: Mund genau auf den Bisspunkt, Körper richtet sich danach
 const T=m==='grip'?(target||d.gripTarget):null;
 if(T){const hReq=-T.y;if(hReq>40)p=Math.min(1.12,Math.asin(cl((hReq-35)/(L+9),0,.98)));else if(hReq<27)p=-Math.min(.3,(27-hReq)/40);
  p+=shake*.03;if(p>0){hipX+=p*5;hipY+=Math.sin(p)*5;}else hipY+=p*7;}
 const cp=Math.cos(p),spn=Math.sin(p),body=(bx,by)=>({x:hipX+bx*cp+by*spn,y:hipY-bx*spn+by*cp});
 const hip=body(0,0),sh=body(L,bend*.0),N=body(L+1.5,-4.5);
 // Kopf
 let Hp,ha;
 if(T){ha=cl(Math.atan2(T.y-N.y,T.x-N.x)*.55,-.95,.95)+shake*.34-(p>0?p*.5:0);const ca=Math.cos(ha),sa=Math.sin(ha);Hp={x:T.x-(ca*MO.x-sa*MO.y)*HS,y:T.y-(sa*MO.x+ca*MO.y)*HS};const nx=Hp.x-N.x,ny=Hp.y-N.y,nl=Math.hypot(nx,ny);if(nl>19){Hp={x:N.x+nx/nl*19,y:N.y+ny/nl*19};}}
 else if(lie){ha=dead?.42:m==='submit'?-.5:sleep?.32:.25;Hp={x:N.x+8,y:Math.min(-6,N.y+4)+(m==='submit'?-2:0)};}
 else if(rest){const g2=m==='gnaw';ha=g2?.55+.06*Math.sin(t*7):o.head*.6+.05;Hp={x:N.x+(g2?9:7.5)+SH.neckX*.5,y:N.y-(g2?-3:5.5)+o.headY*.5};}
 else if(m==='drink'){ha=.95;Hp={x:N.x+8,y:N.y+11+Math.sin(t*9)*.6};}
 else if(m==='scratch'){ha=-.25+.05*Math.sin(t*28);Hp={x:N.x+6,y:N.y-7};}
 else if(m==='shakeoff'){ha=.35*Math.sin(t*26);Hp={x:N.x+7.5,y:N.y-6.5+Math.sin(t*26)};}
 else{ha=o.head-p*.6+(m==='held'?Math.sin(t*9)*.25:0)+nod*.03;Hp={x:N.x+7.5+SH.neckX+o.headX,y:N.y-6.5+SH.neckY+o.headY+nod};}
 // Beine: Gelenke am Körper, Füße aus Gangzyklus oder Haltung
 const JF=body(L-3,6.5),JH=body(1.5,5.5),legs=[];
 const sd=(d.dog?.seed||0)%997,still=!gi&&!low&&!sit&&!T&&!['leap','rear','bars','held','drink','shakeoff','stretch','scent'].includes(m);
 const cyc2=(G2,cc,i,stride,lift)=>{const u=((cc+G2.off[i])%1+1)%1;if(u<G2.duty)return {dx:stride*(.5-u/G2.duty),dy:0,fold:0};const v=(u-G2.duty)/(1-G2.duty);return {dx:stride*(-.5+v),dy:-lift*Math.sin(Math.PI*v),fold:Math.sin(Math.PI*v)};};
 const foot=(i,front,near)=>{const J=front?JF:JH,depth=near?0:-1.6,base=front?J.x-3:J.x-1.5;let fx=base+(near?0:-2),fy=-1.5,fold=0,special=false;
  if(m==='stretch'&&((d._bow||0)>.05&&front||(d._back||0)>.05&&!front)){special=true;if(front){fx=J.x+6+d._bow*11+(near?0:-2);fy=-1.2;fold=0;}else{fx=J.x-4-d._back*13+(near?0:2);fy=-1.5;}}
  else if(rest){special=true;if(front){fx=J.x+10+(near?0:-2);fy=-1;fold=0;}else{fx=J.x+9+(near?0:-2);fy=-1;}}
  else if(sit){if(front){fx=J.x-1+(near?0:-2);fy=-1.5;}else if(m==='scratch'&&near){special=true;fx=J.x+16+Math.sin(t*28)*2.5;fy=J.y-14+Math.cos(t*28)*2;}else{special=true;fx=J.x+8+(near?0:-2);fy=-1;}}
  else if(m==='bars'){if(front){special=true;fx=J.x+7+(near?0:-2)+Math.sin(t*9+i)*1.2;fy=J.y-5+Math.sin(t*11+i)*2;fold=.5;}else{fx=hip.x+(near?5:2);fy=-1.5;}}
  else if(m==='drink'){fx=front?base+3+(near?0:-2):base-2+(near?0:-2);}
  else if(lie){special=true;if(m==='submit'){fx=J.x+(front?3:-2)+(near?0:2)+Math.sin(t*5+i)*1.2;fy=J.y-13-(near?1:0);}else{const scr=d.down&&!dead?Math.sin(t*9+i*1.7)*2:0;fx=J.x+(front?13:-14)+(near?1:-2)+scr;fy=(near?-2.5:-5)+scr*.3;}}
  else if(m==='leap'){special=true;fx=front?J.x+12+(near?0:-2):J.x-15+(near?0:2);fy=front?J.y+11:J.y+12;}
  else if(m==='rear'){if(front){special=true;fx=J.x+9+(near?0:-2)+Math.sin(t*14+i)*1.5;fy=J.y-1+Math.sin(t*14+i)*2.5;fold=.6;}else{const s2=cyc2(GAITS[1],t*1.2,i,4,2);fx=hip.x+(near?5:2)+s2.dx;fy=-1.5+s2.dy;fold=s2.fold;}}
  else if(T&&p>.35&&front){special=true;fx=T.x-6-(near?0:3)+Math.sin(t*8+i)*1.2;fy=T.y+9+(near?0:2);fold=.7;}// Vorderpfoten kratzen am Opfer
  else if(T){// gestemmt: tritt beim Zerren nach hinten nach
   const s2=cyc2(GAITS[1],(d.cyc||0)*1.8,i,6,2.2);fx=(front?J.x+5:J.x-6)+(near?0:-2)+s2.dx;fy=-1.5+s2.dy;fold=s2.fold;}
  else if(m==='held'){const s2=cyc2(GAITS[2],t*2.4,i,7,3);fx=base+(near?0:-2)+s2.dx;fy=-1.5+s2.dy;fold=s2.fold;}// zappelt, sucht Halt
  else if(G){const s2=cyc2(G,c,i,G.stride,G.lift);fx=base+(near?0:-2)+s2.dx;fy=-1.5+s2.dy;fold=s2.fold;}
  else{const brace=(o.hackle>.85?2:0);fx=front?base+brace+(near?0:-2):base-brace+(near?0:-2);if(o.tuck&&!front)fx+=2;
   // Nachtreten im Stand (Drehen, Gewicht verlagern), ab und zu Scharren mit der Vorderpfote
   const tw=(d.turnStep||0),w=Math.floor(t/1.1+i*.27+sd*.013),ph2=((t/1.1+i*.27+sd*.013)%1+1)%1,r=hrand(w*5.3+i*11+sd);
   if(still&&(r<.2||tw>0)&&ph2<.32){const q=Math.sin(Math.PI*ph2/.32);fx+=(r-.1)*22*(tw>0?.5:1);fy=-1.5-2.4*q;fold=q;}
   if(still&&front&&near&&o.hackle>.85&&r>.92&&ph2<.5){const q=Math.sin(Math.PI*ph2/.5*2);fx-=3*q;fy=-1.5-1.5*Math.max(0,q);fold=Math.abs(q);}}
  fy=Math.min(fy,lie?0:-1.5);
  if(front){// Pfote, Fessel (kippt in der Schwungphase nach hinten), Unterarm, Oberarm
   const fa=fold*1.45,w2=special&&!fold?{x:fx-1,y:fy-3.6*LG}:{x:fx-.6+3.7*LG*Math.sin(fa),y:fy-3.8*LG*Math.cos(fa)};
   const k=ik(J.x,J.y+depth,w2.x,w2.y,8*LG,9.6*LG,1);legs.push({i,front,near,j:{x:J.x,y:J.y+depth},k:{x:k.kx,y:k.ky},w:{x:k.fx,y:k.fy},f:{x:fx,y:fy}});}
  else{let ang=.44-1.4*fold,hock={x:fx-7.9*LG*Math.sin(ang),y:fy-7.9*LG*Math.cos(ang)};if(lie||m==='leap'){hock={x:fx+(m==='leap'?4:3),y:fy-2};}else if((rest||sit)&&!(m==='scratch'&&near)){hock={x:fx-9*LG,y:fy-1.5};}const k=ik(J.x,J.y+depth,hock.x,hock.y,8.8*LG,8*LG,-1);legs.push({i,front,near,j:{x:J.x,y:J.y+depth},k:{x:k.kx,y:k.ky},h:{x:k.fx,y:k.fy},f:{x:fx,y:fy}});}};
 foot(0,true,true);foot(1,false,true);foot(2,true,false);foot(3,false,false);
 const nearF=legs[0],nearH=legs[1],ca=Math.cos(ha),sa=Math.sin(ha),hp=(x,y)=>({x:Hp.x+(ca*x-sa*y)*HS,y:Hp.y+(sa*x+ca*y)*HS});
 const anchors={kopf:hp(2,-2),hals:{x:(N.x+Hp.x)/2,y:(N.y+Hp.y)/2+2},brust:body(L-1,4),bauch:body(L*.45,5),vl:{x:(nearF.j.x+nearF.k.x)/2,y:(nearF.j.y+nearF.k.y)/2},hl:{x:(nearH.j.x+nearH.k.x)/2,y:(nearH.j.y+nearH.k.y)/2}};
 return {o,p,L,hip,sh,N,Hp,ha,legs,body,bend,lie,dead,anchors,mouth:hp(MO.x,MO.y),eye:hp(SH.eye.x,SH.eye.y),hipX,hipY,breathe};}
DOG.rig=rig;
// Weltpunkt eines Körperteils (für Blut)
function partWorld(d,part){const t=S.battle?.time||0,R=rig(d,t),a=R.anchors[part]||R.anchors.brust,f=Math.cos(d.a)>=0?1:-1,s=d.P.sz;return {x:d.x+f*s*a.x,y:d.y,z:-a.y*s+(d.z||0)};}

// =====================================================================================================
// ZEICHNEN
// =====================================================================================================
function lerpObj(a,b,f){if(typeof b==='number')return typeof a==='number'?a+(b-a)*f:b;if(Array.isArray(b))return b.map((v,i)=>lerpObj(a?.[i],v,f));if(b&&typeof b==='object'){const o={};for(const k in b)o[k]=typeof b[k]==='function'?b[k]:lerpObj(a?.[k],b[k],f);return o;}return b;}
const TRANS=new Map();
function sigOf(d,R){const m=d.mode;return d.g?.dead||d.down||d.submit||m==='sleep'?'lie':m==='rest'||m==='gnaw'?'rest':m==='sit'||m==='scratch'?'sit':m==='rear'||m==='bars'?'rear':m==='grip'?'grip':m==='leap'?'leap':m==='drink'?'drink':'stand';}
function smoothRig(d,R,t,key){if(!key)return R;let s=TRANS.get(key);const sig=sigOf(d,R);
 if(!s||t<s.t||t-s.t>2){s={sig,from:null,t0:t,last:R,t};TRANS.set(key,s);return R;}
 if(sig!==s.sig){const instant=sig==='grip'||sig==='leap'||s.sig==='leap';s.from=instant?null:s.last;s.t0=t;s.sig=sig;s.dur=(sig==='lie'||s.sig==='lie'||sig==='rest'||s.sig==='rest'||sig==='sit'||s.sig==='sit')?.6:.32;}
 let out=R;if(s.from&&t-s.t0<s.dur){const f=cl((t-s.t0)/s.dur,0,1),e=f*f*(3-2*f);out=lerpObj(s.from,R,e);const cp=Math.cos(out.p),sp2=Math.sin(out.p);out.body=(bx,by)=>({x:out.hipX+bx*cp+by*sp2,y:out.hipY-bx*sp2+by*cp});out.o=R.o;out.lie=R.lie;out.dead=R.dead;}
 s.last=out;s.t=t;return out;}
DOG.forgetPose=key=>TRANS.delete(key);
// ---- Kopf des Bärenbeißers: breiter Schädel, Kaumuskeln, kurze breite Schnauze, Unterkiefer steht vor (Vorbiss, untere Eckzähne sichtbar), kleine Rosenohren oder kupiert
function headBB(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,mask=A.mask;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 if(A.earCut)poly(c,[[-3.6,-8.2],[-2.2-ear*.8,-14.2+ear*.6],[-.6,-13.4+ear*.6],[.6,-8.8]],dark);// kupiert: kurze Spitzohren, stehen
 else poly(c,[[-4.4-ear,-8.2],[-.8-ear,-9.8],[.2-ear*2,-7.4-ear],[-1.4-ear*2.6,-5.4-ear*1.6],[-3.6-ear*2.4,-5.8-ear]],dark);// Rosenohr, nach hinten gefaltet
 poly(c,[[-6.4,-5.6],[-4.4,-8.8],[.8,-10.2],[5,-9.5],[7.2,-6.8],[7.6,2.8],[3.4,6.4],[-3,6.4],[-6.9,2.8]],base);
 if(A.earCut)poly(c,[[-2.8,-9.2],[-2,-12.8+ear*.6],[-1,-12.2+ear*.6],[-.6,-9.4]],shade);
 seg(c,-3.4,-9.4,4.4,-9.7,1,light);// Scheitel
 const fr=Math.max(o.lips||0,o.hackle>.7?.6:0);for(let i=0;i<3;i++)seg(c,.4+i*.2,-8.4+i*1.15,4.4-i*.3,-8.6+i*1.15-fr*.4,.55,shade+(fr>.3?'':'88'));// Stirnfalten
 poly(c,[[-4,.2],[3.2,-.6],[4.6,5.6],[-2.6,6]],shade+'b0');seg(c,-2.6,.8,2.8,.2,.8,light+'a0');disk(c,.2,2.6,2.6,shade+'60');// Kaumuskel
 poly(c,[[3.6,-7.4],[7.6,-6.9],[7.6,-.4],[4.4,-2.2]],mask+'c0');// Maske bis über die Augen
 const jaw=o.jaw||0,jA=jaw*.6,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(4.6,2.8);c.rotate(jA);poly(c,[[-1.2,-.2],[7.6,-.6],[7.8,2.4],[6.6,3.6],[-.4,4]],mask);rr(c,6.8,-.4,1,2.6,'#2a1d18');if(jaw>.2){rr(c,4.6,-.4,.8,.8,'#f0eadb');rr(c,3,-.3,.8,.8,'#f0eadb');rr(c,1,0,5,.9,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.3,5.4,1.4,'#c8606a');if(o.tongue>.6)rr(c,5.6,1.1,2,2.5+o.tongue*2.5,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.6,6.4*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.4,-6.4],[9.6,-6.2],[10.8,-5],[11.3,-2.8],[11,.9],[10,1.6],[6.4,2.2]],mask);seg(c,7,-5.8,10.2,-5.6,.8,'#4a3a30');seg(c,7.2,-4,10.6,-3.9,.5,'#33261f');// kurze, breite Schnauze
 poly(c,[[9.8,-7],[11.5,-7],[12.1,-5.6],[11.6,-4.3],[9.9,-4.5]],'#0d0907');rr(c,11,-6.6,.8,.7,'#5a4f49');if(o.sniff)rr(c,11.6,-5.1+Math.sin(t*34)*.3,.8,.8,'#2a2420');// Nase, leicht aufgestülpt
 if(o.lick>.05)poly(c,[[9.8,1.2],[11.6,1.2],[12.2,1.2-3.2*o.lick],[10.8,1.2-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.2+i*1.1,-6.2,7.9+i*1.1,-5,.5,'#2a1d18');seg(c,4.6,-6.8,6.4,-7.2,.5,'#3a2a20');}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6.2,1.1],[8.4,1.2],[7.8,2.8],[6.2,2.8]],mask);rr(c,9.6,1.2,1,2.3,'#f2ecdd');rr(c,8.4,1.4,.7,1.1,'#f2ecdd');rr(c,10.6,1.4,.6,.9,'#f2ecdd');seg(c,6.6,-.4,10.8,-1,.9,'#2a1d18');c.translate(0,-qv);}
 else{poly(c,[[6.4,1],[10.9,1],[10.4,3],[8.6,3.8],[6.6,3.6]],mask);seg(c,7.6,3.3,10.2,2.4,.5,'#3e2f27');}// kurze Lefzen
 {c.save();c.translate(4.6,2.8);c.rotate(jA);rr(c,6.3,-1.9,.9,2,'#f0eadb');rr(c,4.9,-1.4,.8,1.5,'#f0eadb');rr(c,7.1,-.9,.7,1,'#e6dfcf');c.restore();}// Vorbiss: untere Eckzähne vor der Oberlippe
 if(o.drool&&!dead)rr(c,7,4.4,.5,2.2+Math.sin(t*3)*1.3,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6.2,1.4,5.4,1.4*mb+.4,'#7d1a12');rr(c,8.6,3,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,10.4,3,.9,1+mb*4,'#8f2017');rr(c,6.8,4.6,.9,1+mb*3,'#7d1a12');}}
 seg(c,2.2,-6+(o.lips>.6?.4:0),5.8,-6.3-(o.lips>.6?.6:0),1,shade);// schwerer Brauenwulst
 if(dead||o.blink)seg(c,3.2,-4.6,5.2,-4.4,.6,'#1a120d');else{if(o.eyeWhite)rr(c,2.6,-5.4,1,1.6,'#e9e2d0');rr(c,3.2,-5.3,2,1.6,'#1b120b');rr(c,4.3,-5.1,.8,.7,(o.lips||0)>.6?'#e9d27a':'#b88f5a');seg(c,2.6,-6,5.6,-6.2-(o.lips>.6?.5:0),.6,mask);}
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,7,3.4,9,1.6,'#e7dcc2');disk(c,7,4.2,1.4,'#e7dcc2');disk(c,16,4.2,1.4,'#e7dcc2');rr(c,8,4.6,7,.6,'#b8ab8c');}}
// ---- Kopf des Irischen Wolfshunds: lang und flach, lange spitz zulaufende Schnauze ohne Maske, Bart und Augenbrauen aus Rauhaar, kleine Rosenohren
function headWH(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,D=d.dog,sd=(D?.seed||0)%53;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-6.2,-4.6],[-4,-7.4],[1,-8.2],[5,-7.6],[7.6,-5.6],[7.8,1.6],[3,4.2],[-3,4.4],[-6.6,1.8]],base);
 for(let i=0;i<6;i++){const x=-4+i*1.9,h=hrand(i+sd);seg(c,x,-7.6-(i>1&&i<5?.5:0),x-1.4,-8.8-h,.7,h>.5?light:base);}// Zotteln auf dem Schädel
 poly(c,[[-3.6,.4],[3,0],[4,4],[-2.4,4.2]],shade+'90');
 const jaw=o.jaw||0,jA=jaw*.62,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.6,1.9);c.rotate(jA);poly(c,[[-1,0],[8.6,-.3],[8.8,1.4],[7,2.4],[0,2.9]],shade);
 if(jaw>.2){rr(c,7.6,-.9,.8,1.3,'#f0eadb');rr(c,5.4,-.5,.7,.7,'#f0eadb');rr(c,3.2,-.5,.7,.7,'#f0eadb');rr(c,1,0,6,.8,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,7,1.3,'#c8606a');if(o.tongue>.6)rr(c,7.4,.9,2,2.6+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.2,7.6*d.mouthBlood,1,'#7a1a12');
 for(let i=0;i<5;i++){const x=2+i*1.6,h=hrand(i*3+sd);seg(c,x,2.2,x-.5+h,4.2+h*1.8,.8,h>.45?light:base);}// Bart am Unterkiefer
 c.restore();
 poly(c,[[6.6,-5.7],[11,-5],[14.2,-3.9],[15.1,-2.3],[14.9,.3],[13.8,1.1],[6.6,2]],base);seg(c,7.4,-5.2,13.6,-3.9,.8,light);seg(c,7.8,-.2,14,.2,.7,shade);// lange Schnauze
 poly(c,[[14,-4.4],[15.4,-4.1],[15.8,-2.7],[15.3,-1.8],[14,-2.2]],'#0d0907');rr(c,15,-3.9,.7,.6,'#5a4f49');if(o.sniff)rr(c,15.5,-2.9+Math.sin(t*34)*.3,.7,.7,'#2a2420');
 if(o.lick>.05)poly(c,[[13.4,1],[15.2,1],[15.8,1-3.2*o.lick],[14.4,1-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,8.6+i*1.4,-5.4+i*.2,9.2+i*1.4,-4.3+i*.2,.5,shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);rr(c,12.6,1.1,.9,2.2,'#f2ecdd');rr(c,11.2,1.3,.7,1.1,'#f2ecdd');rr(c,14,1.3,.6,.9,'#f2ecdd');seg(c,7,-.2,14.6,-.8,.8,'#2a1d18');c.translate(0,-qv);}
 else seg(c,7.4,1.7,14.6,.9,.6,'#3e2f27');// enge Lefzen
 for(let i=0;i<6;i++){const x=8+i*1.3,h=hrand(i*7+sd);seg(c,x,1.2,x-.4+h*.6,3.2+h*1.8,.8,h>.5?light:base);}// Schnauzbart
 if(o.drool&&!dead)rr(c,9,3.4,.5,2.2+Math.sin(t*3)*1.3,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,7,1.2,7.6,1.4*mb+.4,'#7d1a12');rr(c,10.6,2.6,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,13.4,2.4,.9,1+mb*4,'#8f2017');rr(c,8,3.8,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,3,-4,5,-3.8,.6,'#1a120d');else{if(o.eyeWhite)rr(c,2.6,-4.8,1,1.5,'#e9e2d0');rr(c,3.2,-4.7,1.9,1.5,'#1b120b');rr(c,4.3,-4.5,.7,.6,(o.lips||0)>.6?'#e9d27a':'#a58a62');}
 for(let i=0;i<4;i++){const h=hrand(i*11+sd);seg(c,2.4+i*.9,-5.6,3.6+i*1.1,-6.8-h*.9+((o.lips||0)>.6?.6:0),.7,light);}// buschige Augenbrauen
 if(ear>.6)poly(c,[[-3.8,-7],[-1.6,-11.4+ear],[.2,-10.6+ear],[-.6,-7.6]],dark);// gespitzt: halb aufgestellt
 else poly(c,[[-4.6-ear,-6.8],[-1.2-ear,-7.9],[-.4-ear*2,-5.4-ear],[-3.2-ear*2.2,-3.8-ear*1.4]],dark);// Rosenohr, nach hinten gefaltet
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,10,2.6,9,1.6,'#e7dcc2');disk(c,10,3.4,1.4,'#e7dcc2');disk(c,19,3.4,1.4,'#e7dcc2');rr(c,11,3.8,7,.6,'#b8ab8c');}}
// ---- Kopf des Saupackers: breiter, flacher Schädel mit starken Backen, mittellange tiefe Schnauze, Scherengebiss, mäßige Lefzen, gestromt; Ohren kupiert (Spitzen) oder kleine Hängeohren
function headSP(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,mask=A.mask,D=d.dog,sd=(D?.seed||0)%61;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 if(A.earCut)poly(c,[[-3.8,-7.8],[-2.6-ear*.7,-12.6+ear*.5],[-1.2,-12+ear*.5],[.2,-8.4]],dark);
 poly(c,[[-6.2,-5],[-4.2,-8.2],[1,-9.3],[5,-8.6],[7.4,-6],[7.6,2.2],[3.2,5.6],[-3,5.6],[-6.6,2.4]],base);
 if(col.stripe)for(let i=0;i<4;i++){const x=-4.6+i*1.6+hrand(i+sd)*.5;seg(c,x,-7.2+hrand(i*3+sd),x-.9,-1.2+hrand(i*5+sd)*2,.5,col.stripe+'70');}// Stromung an den Backen
 seg(c,-3.2,-8.7,4.2,-8.9,.9,light);poly(c,[[-3.8,.4],[3.2,-.3],[4.4,5],[-2.4,5.2]],shade+'b0');seg(c,-2.4,1,2.8,.4,.7,light+'90');// Backen
 if(A.earCut)poly(c,[[-2.9,-8.8],[-2.3-ear*.4,-11.4+ear*.5],[-1.6,-11+ear*.5],[-1,-8.8]],shade);
 poly(c,[[3.6,-6.8],[7.4,-6.4],[7.4,-.6],[4.2,-2]],mask+'80');
 const jaw=o.jaw||0,jA=jaw*.62,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.4,2.1);c.rotate(jA);poly(c,[[-1,0],[7.4,0],[7.4,2],[0,3]],mask);
 if(jaw>.2){rr(c,6.2,-.9,.9,1.4,'#f0eadb');rr(c,4.2,-.5,.8,.8,'#f0eadb');rr(c,2.4,-.5,.8,.8,'#f0eadb');rr(c,1,0,4.8,.8,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,5.8,1.4,'#c8606a');if(o.tongue>.6)rr(c,6,1,2,2.5+o.tongue*2.5,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.3,6.6*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6,-5.9],[10.4,-5.5],[12,-4.4],[12.7,-2.5],[12.5,1],[11.4,1.8],[6,2.2]],mask);seg(c,6.8,-5.3,11,-5,.8,light+'80');seg(c,7.2,-3.6,11.4,-3.4,.5,'#33261f');// Schnauze
 poly(c,[[11,-6.3],[12.7,-6.3],[13.4,-4.9],[13,-3.6],[11.2,-3.8]],'#0d0907');rr(c,12.1,-5.9,.8,.7,'#5a4f49');if(o.sniff)rr(c,12.8,-4.7+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[11,1],[12.9,1],[13.5,1-3.3*o.lick],[12,1-3.9*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.2+i*1.3,-5.8,7.9+i*1.3,-4.6,.5,'#2a1d18');seg(c,4.6,-6.6,6.4,-7,.5,'#3a2a20');}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1],[8.8,1.2],[8,2.9],[6,2.9]],mask);rr(c,10.6,1.2,1,2.4,'#f2ecdd');rr(c,9.3,1.4,.7,1.2,'#f2ecdd');rr(c,11.8,1.4,.7,1,'#f2ecdd');seg(c,6.4,-.4,12.2,-1.1,.9,'#2a1d18');c.translate(0,-qv);}
 else{poly(c,[[6,1],[12.3,1],[11.7,3.2],[9.2,4.2],[6.8,3.9],[6,2.9]],mask);seg(c,7.8,3.5,11.4,2.5,.5,'#3e2f27');}
 if(o.drool&&!dead)rr(c,7.2,4,.5,2.3+Math.sin(t*3)*1.4,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.4,7,1.4*mb+.4,'#7d1a12');rr(c,9,3,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,11.4,3,.9,1+mb*4,'#8f2017');rr(c,7,4.4,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,3.2,-4.4,5.2,-4.2,.6,'#1a120d');else{if(o.eyeWhite)rr(c,2.6,-5.2,1,1.6,'#e9e2d0');rr(c,3.2,-5.1,2,1.6,'#1b120b');rr(c,4.4,-4.9,.8,.7,(o.lips||0)>.6?'#e9d27a':'#c49a5c');seg(c,2.6,-5.9+(o.lips>.6?.3:0),5.6,-6.1-(o.lips>.6?.5:0),.7,mask);}
 if(!A.earCut){poly(c,[[-3.4-ear,-8.2],[-.6-ear*1.6,-8.9],[-.1-ear*2.6,-5.2-ear*2.2],[-2-ear*2.8,-4.4-ear*1.8]],dark);seg(c,-3-ear,-8.1,-.8-ear*1.6,-8.6,.5,light+'90');}// kleines Hängeohr, nach vorn gekippt
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,8,3,9,1.6,'#e7dcc2');disk(c,8,3.8,1.4,'#e7dcc2');disk(c,17,3.8,1.4,'#e7dcc2');rr(c,9,4.2,7,.6,'#b8ab8c');}}
// ---- Kopf des Metzgerhunds: breiter Schädel, mittellange kräftige Schnauze, schwarz mit rotbraunen Abzeichen an Schnauze, Backen und über den Augen, dreieckige Hängeohren
function headMG(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,tan=col.tan||'#8a4c26',tanD=shadeHex(tan,.78);
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-6.2,-5],[-4.2,-8.4],[1,-9.5],[5,-8.8],[7.4,-6.2],[7.6,2.2],[3.2,5.6],[-3,5.6],[-6.6,2.4]],base);
 seg(c,-3.2,-8.9,4.2,-9.1,.9,light);poly(c,[[-3.8,.4],[3.2,-.3],[4.4,5],[-2.4,5.2]],shade+'b0');
 poly(c,[[1.6,1.2],[5.6,.6],[6.6,4.4],[2.6,5.2]],tanD);// Backenabzeichen
 const jaw=o.jaw||0,jA=jaw*.62,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.4,2.1);c.rotate(jA);poly(c,[[-1,0],[7.2,0],[7.2,2],[0,3]],tanD);rr(c,0,2.4,6.6,.6,dark);
 if(jaw>.2){rr(c,6,-.9,.9,1.4,'#f0eadb');rr(c,4,-.5,.8,.8,'#f0eadb');rr(c,2.2,-.5,.8,.8,'#f0eadb');rr(c,1,0,4.6,.8,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,5.6,1.4,'#c8606a');if(o.tongue>.6)rr(c,5.8,1,2,2.5+o.tongue*2.5,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.3,6.4*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6,-6],[10.2,-5.6],[11.8,-4.5],[12.4,-2.6],[12.2,1],[11.2,1.8],[6,2.2]],tan);seg(c,6.8,-5.4,10.8,-5.1,.8,shadeHex(tan,1.18));seg(c,7.2,-3.6,11.2,-3.4,.5,tanD);// rotbraune Schnauze
 poly(c,[[5.6,-6.4],[8.4,-6],[7.4,-4.4],[6,-3.6]],base);// schwarzer Nasenrücken-Ansatz (Stop)
 poly(c,[[10.6,-6.4],[12.4,-6.4],[13.1,-5],[12.7,-3.7],[10.8,-3.9]],'#0d0907');rr(c,11.8,-6,.8,.7,'#5a4f49');if(o.sniff)rr(c,12.5,-4.8+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[10.8,1],[12.6,1],[13.2,1-3.3*o.lick],[11.8,1-3.9*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.2+i*1.3,-5.9,7.9+i*1.3,-4.7,.5,tanD);seg(c,4.6,-6.8,6.4,-7.2,.5,shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1],[8.8,1.2],[8,2.9],[6,2.9]],'#1a1310');rr(c,10.4,1.2,1,2.4,'#f2ecdd');rr(c,9.1,1.4,.7,1.2,'#f2ecdd');rr(c,11.6,1.4,.7,1,'#f2ecdd');seg(c,6.4,-.4,12,-1.1,.9,'#1a1310');c.translate(0,-qv);}
 else{poly(c,[[6,1],[12,1],[11.4,3.1],[9,4],[6.8,3.8],[6,2.9]],tanD);seg(c,6.4,1.2,11.8,1.1,.7,'#1a1310');seg(c,7.8,3.4,11.2,2.4,.5,'#2a1d18');}// Lefzen mit schwarzem Rand
 if(o.drool&&!dead)rr(c,7.2,4,.5,2.3+Math.sin(t*3)*1.4,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.4,6.8,1.4*mb+.4,'#7d1a12');rr(c,9,3,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,11.2,3,.9,1+mb*4,'#8f2017');rr(c,7,4.4,.9,1+mb*3,'#7d1a12');}}
 disk(c,3.9,-6.6,1,tan);// rotbrauner Brauenpunkt
 if(dead||o.blink)seg(c,3.2,-4.4,5.2,-4.2,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.6,-5.2,1,1.6,'#e9e2d0');rr(c,3.2,-5.1,2,1.6,'#0d0907');rr(c,4.4,-4.9,.8,.7,(o.lips||0)>.6?'#e9d27a':'#9a6a3a');}
 if(A.earCut)poly(c,[[-3.8,-7.8],[-2.6-ear*.7,-12.4+ear*.5],[-1.2,-11.8+ear*.5],[.2,-8.4]],shade);
 else{poly(c,[[-3.6-ear,-8.4],[.4-ear*1.6,-9],[.6-ear*2.8,-3.6-ear*2.4],[-2.4-ear*2.6,-5.6-ear*1.6]],shade);seg(c,-3.2-ear,-8.3,.2-ear*1.6,-8.8,.6,light);}// dreieckiges Hängeohr
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,8,3,9,1.6,'#e7dcc2');disk(c,8,3.8,1.4,'#e7dcc2');disk(c,17,3.8,1.4,'#e7dcc2');rr(c,9,4.2,7,.6,'#b8ab8c');}}
// ---- Kopf der Englischen Bulldogge: sehr großer breiter Kopf, tiefe Falten, „Nasenwulst“ über der sehr kurzen zurückliegenden Schnauze, starker Vorbiss (Unterkiefer weit vor, untere Zähne sichtbar), schwere hängende Lefzen weit über den Kiefer, runde dunkle Augen weit auseinander und tief, kleine Rosenohren hoch angesetzt
function headEB(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,D=d.dog,ps=(D?.seed||0)%9973,sd=ps%167,fl=shadeHex(base,.68),pied=A.coat==='gescheckt',pc=col.patch,eyeP=pied&&hrand(ps*.53)<.6,mk=A.coat==='rot'||A.coat==='falb'||A.coat==='gestromt'?A.mask:shadeHex(base,.82);
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-4.8-ear,-9.2],[-1.4-ear,-10.6],[-.4-ear*2,-8.4-ear],[-2-ear*2.6,-6.6-ear*1.6],[-4.2-ear*2.4,-7-ear]],eyeP?pc:shade);// kleines Rosenohr, hoch angesetzt
 poly(c,[[-7.2,-5.8],[-5.2,-10],[1,-11.4],[6,-10.6],[8.4,-7.6],[8.6,3.6],[4.4,8.4],[-3.8,8.6],[-7.6,3.6]],base);// sehr großer breiter Kopf
 if(col.stripe)for(let i=0;i<5;i++){const x=-5.2+i*1.7+hrand(i+sd)*.5;seg(c,x,-8.4+hrand(i*3+sd),x-1,-1+hrand(i*5+sd)*2,.55,col.stripe+'80');}
 if(eyeP)poly(c,[[1,-9.4],[6.4,-10],[8,-7],[7.2,-3],[3,-2.6],[.6,-5.4]],pc);// farbiger Fleck am Auge (gescheckt)
 seg(c,-4,-11,5,-11.4,1,light);
 for(let i=0;i<4;i++)seg(c,-1.4+i*.3,-9.8+i*1.15,5.6-i*.1,-10.2+i*1.15-((o.lips||0)>.6?.5:0),.7,fl);// tiefe Stirnfalten
 poly(c,[[-4.8,.2],[3.8,-.8],[5.8,7.6],[-3.2,8]],shade+'a0');for(let i=0;i<3;i++)seg(c,-4+i*.3,1.6+i*1.9,4.8+i*.3,.8+i*2,.7,fl);// Backenfalten
 poly(c,[[3.4,-7.8],[8.6,-7.4],[8.6,0],[4.2,-1.8]],mk+'b0');
 const jaw=o.jaw||0,jA=jaw*.5,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(4.2,3.4);c.rotate(jA);poly(c,[[-1.2,-.4],[7.4,-1.4],[7.8,2.4],[6.6,4],[-.4,4.4]],mk);// Unterkiefer weit vor
 rr(c,6.4,-2.4,1,2.8,'#f0eadb');rr(c,5,-2,.8,2.2,'#f0eadb');for(let i=0;i<4;i++)rr(c,1.4+i*1,-1.1,.7,1,'#f0eadb');// untere Zähne immer sichtbar (starker Vorbiss)
 if(jaw>.2)rr(c,1,0,5,1,'#9a3b42');
 if(o.tongue||o.pant){rr(c,1.4,.4,5.6,1.6,'#c8606a');if(o.tongue>.6)rr(c,5.6,1.2,2.4,2.8+o.tongue*2.8,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.9,6.4*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.8,-6.8],[9.2,-7],[10.2,-6],[10.4,-3.6],[10.2,-.4],[9.4,.4],[6.8,.8]],mk);seg(c,7,-6.6,9.6,-6.8,1.2,fl);seg(c,7.2,-5.6,9.8,-5.6,.6,shadeHex(base,1.1));// Nasenwulst, sehr kurze Schnauze
 poly(c,[[8.6,-8.6],[10.4,-8.8],[11,-7.3],[10.6,-5.9],[8.8,-6.1]],'#0d0907');rr(c,9.8,-8.4,.9,.8,'#5a4f49');if(o.sniff)rr(c,10.5,-6.8+Math.sin(t*34)*.3,.8,.8,'#2a2420');// Nase weit oben, zurückliegend
 if(o.lick>.05)poly(c,[[8.6,1],[10.6,1],[11.2,1-3*o.lick],[9.6,1-3.6*o.lick]],'#c8606a');
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6.6,.6],[9,.7],[8.4,2.4],[6.6,2.4]],mk);seg(c,6.8,-.6,10.2,-1,.9,'#1a1410');c.translate(0,-qv);}
 else{const sw=dead?0:Math.sin(t*2+sd)*.3;poly(c,[[6.6,.6],[10.4,.6],[10.4,3],[9.4,5.6+sw],[7.4,6.2+sw],[6.4,5]],mk);seg(c,7,5.6+sw,9.8,5+sw,.6,shadeHex(base,.5));}// schwere hängende Lefzen über den Kiefer
 if(o.drool&&!dead)rr(c,7.6,6,.6,3+Math.sin(t*3)*1.8,'#e6e1d6cc');else if(!dead&&hrand(sd*.43)<.5)rr(c,8.4,6,.5,1.4+Math.sin(t*1.3+sd)*.8,'#e6e1d6aa');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6.6,1,4.6,1.4*mb+.4,'#7d1a12');rr(c,8.4,3.4,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,9.8,3,.9,1+mb*4,'#8f2017');rr(c,7,5,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,3,-4.4,5,-4.2,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.4,-5.2,1,1.6,'#e9e2d0');rr(c,3,-5.1,2,1.7,'#110c09');rr(c,4.1,-4.9,.7,.6,(o.lips||0)>.6?'#e9d27a':'#5a3a20');seg(c,2.6,-3.2,5.4,-3,.7,fl);}// runde dunkle Augen, Falte darunter
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,6.6,4,9,1.6,'#e7dcc2');disk(c,6.6,4.8,1.4,'#e7dcc2');disk(c,15.6,4.8,1.4,'#e7dcc2');rr(c,7.6,5.2,7,.6,'#b8ab8c');}}
// ---- Kopf des Bullterriers: langer eiförmiger Kopf ohne Stop, Profil von der Stirn bis zur Nase ein gleichmäßiger Bogen (gebogener Nasenrücken), kräftiger Unterkiefer, enge Lefzen, kleine schmale dreieckige tiefliegende Augen, kleine Stehohren dicht beieinander; weiße Hunde oft mit farbigem Fleck über einem Auge
function headBT(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,D=d.dog,ps=(D?.seed||0)%9973,sd=ps%163,white=A.coat==='weiss',patch=white&&hrand(ps*.61)<.55,pc=hrand(ps*.37)<.5?'#3a2a20':'#9a5a30',tan=col.tan,wh='#ece6dc',nonWhite=!white;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-2.4,-9.4],[-1.4-ear*2,-14.4+ear*3.8],[.6-ear*1.2,-9.8]],patch?pc:base);poly(c,[[-1.8,-9.8],[-1.2-ear*1.6,-12.8+ear*3.2],[0-ear*.9,-10]],shadeHex(patch?pc:base,1.3));// kleine Stehohren dicht beieinander
 poly(c,[[-5.6,-4.6],[-4.6,-8],[-1.6,-10],[2.6,-10.4],[6.8,-9.6],[10.4,-7.6],[12.6,-5.4],[13.6,-3.2],[13.6,.8],[12.2,2.6],[7.6,4.4],[2,5.6],[-3,5.4],[-6,2.4]],base);// eiförmiger Kopf, Profil als Bogen bis zur Nase
 if(col.stripe)for(let i=0;i<5;i++){const x=-4+i*2.2+hrand(i+sd)*.5;seg(c,x,-8.4+hrand(i*3+sd),x-.8,-1+hrand(i*5+sd)*2,.55,col.stripe+'80');}
 if(patch)poly(c,[[1.4,-8.4],[5.6,-9],[7.2,-6.6],[6.4,-3.2],[3.4,-2.6],[1.2,-4.6]],pc);// farbiger Fleck über dem Auge
 if(nonWhite){poly(c,[[6.4,-9.4],[9.4,-8],[11,-5],[10.4,-2],[8.6,-3.4],[7.4,-6.6]],wh);poly(c,[[6,-1],[13.4,-.6],[13.4,.8],[12.2,2.6],[7.6,4.4],[5.6,3]],wh);}// weiße Blesse und weiße Schnauze
 if(tan){disk(c,4.4,-7,.9,tan);poly(c,[[1,.6],[5.4,.2],[6,3.6],[1.8,4.4]],tan);}// Loh-Abzeichen (dreifarbig)
 seg(c,-2.4,-9.8,6.4,-9.6,.9,white?light:shadeHex(base,1.2));seg(c,7,-9,12.6,-5.2,.7,white?light:'#faf6ee');// Bogenlinie Stirn–Nase
 poly(c,[[-4,.4],[3.2,-.4],[5,5.2],[-2.6,5.4]],shade+'80');
 const jaw=o.jaw||0,jA=jaw*.62,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.6,2.6);c.rotate(jA);poly(c,[[-1,0],[7.8,0],[7.6,2.2],[0,3.2]],nonWhite?'#d8d0c2':shade);
 if(jaw>.2){rr(c,6.6,-.9,1,1.5,'#f0eadb');rr(c,4.5,-.5,.8,.8,'#f0eadb');rr(c,2.6,-.5,.8,.8,'#f0eadb');rr(c,1,0,5.2,.9,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,6.2,1.4,'#c8606a');if(o.tongue>.6)rr(c,6.4,1,2,2.4+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.4,7*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[12.4,-4.4],[14,-3.8],[14.4,-2.4],[14,-1.2],[12.6,-1.4]],'#0d0907');rr(c,13.4,-3.6,.7,.6,'#5a4f49');if(o.sniff)rr(c,14,-2.2+Math.sin(t*34)*.3,.8,.8,'#2a2420');// Nase am Ende des Bogens
 if(o.lick>.05)poly(c,[[12,1.4],[13.8,1.4],[14.4,1.4-3.2*o.lick],[13,1.4-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,8+i*1.3,-5+i*.4,8.6+i*1.3,-3.8+i*.4,.5,shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1.2],[9.4,1.3],[8.6,3],[6,3]],'#2a201c');rr(c,11.4,1.2,1,2.4,'#f2ecdd');rr(c,10,1.4,.7,1.2,'#f2ecdd');rr(c,12.6,1.4,.6,1,'#f2ecdd');seg(c,6.4,-.4,13.2,-.9,.8,'#1a1410');c.translate(0,-qv);}
 else{poly(c,[[6,1.2],[13.2,1.2],[12.4,3],[9.2,4],[6.8,3.6],[6,3]],nonWhite?wh:base);seg(c,6.4,1.3,13,1.2,.6,'#1a1410');}// enge Lefzen
 if(o.drool&&!dead)rr(c,7.4,3.8,.5,2+Math.sin(t*3)*1.2,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.4,7.6,1.4*mb+.4,'#7d1a12');rr(c,9.6,3,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,12,2.8,.9,1+mb*4,'#8f2017');rr(c,7.4,4,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,3.8,-4.4,5.6,-4.2,.6,'#0d0907');else{if(o.eyeWhite)rr(c,3.4,-4.8,.8,.9,'#e9e2d0');poly(c,[[3.8,-4.9],[5.8,-4.6],[4.6,-3.8]],'#0d0907');}// kleines schmales Dreiecksauge, schräg
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,8.6,3.4,9,1.6,'#e7dcc2');disk(c,8.6,4.2,1.4,'#e7dcc2');disk(c,17.6,4.2,1.4,'#e7dcc2');rr(c,9.6,4.6,7,.6,'#b8ab8c');}}
// ---- Kopf des Siberian Husky: mittelgroßer, etwas runder Kopf, weißes Gesicht mit Maske (Kappe, Brille), mittellange Schnauze, mandelförmige Augen: blau, braun oder zweifarbig, dreieckige Stehohren dicht beieinander, enge schwarze Lefzen
function headHK(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,bel=col.belly||'#eeeae2',D=d.dog,ps=(D?.seed||0)%9973,er=hrand(ps*.83),eyeC=er<.45?'#6aa8d8':er<.8?'#7a4c28':(hrand(ps*.29)<.5?'#6aa8d8':'#7a4c28'),ag=A.coat==='agouti';
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-3.6,-7.8],[-1.8-ear*2.6,-14.4+ear*5],[.8-ear*1.4,-8.8]],base);poly(c,[[-2.8,-8.4],[-1.6-ear*2.2,-12.8+ear*4.4],[-.2-ear*1.2,-9]],bel);// Stehohren dicht beieinander, innen hell
 poly(c,[[-6,-4.4],[-4.2,-8.2],[.8,-9.4],[4.8,-8.6],[7.2,-6],[7.4,2],[3.2,5.2],[-3,5.2],[-6.4,2]],base);
 poly(c,[[-5,-.6],[-1,-2],[1.6,-3],[3.4,-6.2],[7.2,-5.8],[7.4,2],[3.2,5.2],[-3,5.2],[-5.8,2]],ag?shadeHex(bel,.85):bel);// weißes Gesicht
 poly(c,[[1.4,-6],[4.8,-6.4],[5.4,-3.8],[3.2,-3],[1.2,-3.6]],base);// Brille um das Auge
 seg(c,-3,-8.7,4.2,-8.9,.9,light);
 const jaw=o.jaw||0,jA=jaw*.65,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.2,1.9);c.rotate(jA);poly(c,[[-1,0],[7.8,0],[7.6,1.8],[0,2.7]],bel);rr(c,0,2,7.2,.5,shadeHex(bel,.78));
 if(jaw>.2){rr(c,6.6,-.9,.9,1.4,'#f0eadb');rr(c,4.5,-.5,.8,.8,'#f0eadb');rr(c,2.6,-.5,.8,.8,'#f0eadb');rr(c,1,0,5.2,.8,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,6.2,1.3,'#c8606a');if(o.tongue>.6)rr(c,6.4,1,1.8,2.4+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2,7*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6,-5.6],[10.8,-5.1],[12.4,-4.1],[13,-2.3],[12.8,.8],[11.6,1.5],[6,1.9]],bel);seg(c,6.8,-5,11.2,-4.5,.8,'#faf6ee');if(ag)poly(c,[[5.8,-6],[10.6,-5.4],[10.4,-4.2],[6,-4.6]],base);// weiße Schnauze, bei Agouti dunkler Nasenrücken
 poly(c,[[11,-5.6],[12.7,-5.4],[13.4,-4.1],[13,-2.9],[11.2,-3.1]],ag?'#0d0907':A.coat==='rot'?'#6a3a24':'#0d0907');rr(c,12.1,-5.2,.8,.6,'#5a4f49');if(o.sniff)rr(c,12.8,-3.9+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[11,.9],[12.8,.9],[13.4,.9-3.2*o.lick],[12,.9-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.2+i*1.3,-5.4,7.9+i*1.3,-4.2,.5,shadeHex(bel,.7));}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,.9],[9,1],[8.2,2.6],[6,2.6]],'#2a201c');rr(c,10.8,.9,.9,2.4,'#f2ecdd');rr(c,9.5,1.1,.7,1.2,'#f2ecdd');rr(c,12,1.1,.6,1,'#f2ecdd');seg(c,6.4,-.6,12.6,-1,.8,'#1a1410');c.translate(0,-qv);}
 else{poly(c,[[6,.9],[12.8,.9],[12.2,2.6],[9.2,3.4],[6.8,3.2],[6,2.6]],bel);seg(c,6.4,1,12.6,.9,.6,'#1a1410');}// enge schwarze Lefzenlinie
 if(o.drool&&!dead)rr(c,7.2,3.4,.5,2+Math.sin(t*3)*1.2,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.1,7.2,1.4*mb+.4,'#7d1a12');rr(c,9.2,2.6,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,11.6,2.4,.9,1+mb*4,'#8f2017');rr(c,7.2,3.6,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,2.8,-4.9,5,-4.6,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.4,-5.5,1,1.3,'#e9e2d0');poly(c,[[2.8,-5.4],[5.2,-5.4],[4.9,-4.2],[3.1,-4.1]],'#1a1410');rr(c,3.4,-5.2,1.3,.9,(o.lips||0)>.6?'#e9d27a':eyeC);rr(c,3.9,-5,.4,.5,'#0d0907');}// mandelförmiges Auge, blau, braun oder zweifarbig (Gegenseite)
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,8.2,2.6,9,1.6,'#e7dcc2');disk(c,8.2,3.4,1.4,'#e7dcc2');disk(c,17.2,3.4,1.4,'#e7dcc2');rr(c,9.2,3.8,7,.6,'#b8ab8c');}}
// ---- Kopf des Chow-Chow: breiter flacher Schädel in großer Löwenmähne, kurze breite Schnauze, finsterer Blick (Stirnfalten, tiefliegende Augen), kleine dicke runde Stehohren nach vorn geneigt, blauschwarze Zunge und dunkles Maul
function headCH(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,D=d.dog,sd=(D?.seed||0)%157,tg='#3a3550',tgD='#2a2640',nose=A.coat==='blau'?'#3a3e44':A.coat==='creme'?'#5a4030':'#0d0907';
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-9.6,-2.6],[-8.2,-9.6],[-3.4,-12.4],[2.4,-12.2],[6,-10.4],[8,-7],[8.2,3],[4,8.2],[-3.8,9.8],[-9.2,5.8]],base);// Löwenmähne
 for(let i=0;i<11;i++){const a=-2.8+i*.5,h=hrand(i*3.1+sd);seg(c,-1.6+Math.cos(a)*8.4,.6+Math.sin(a)*9.2,-1.6+Math.cos(a)*(10.4+h*1.6),.6+Math.sin(a)*(11+h*1.6),1.1,h>.5?light:base);}// Mähnenzotteln
 poly(c,[[-3.4,-9.6],[-2.6-ear*1.6,-13+ear*3],[-.8-ear*1,-13.2+ear*3],[.4-ear*.6,-10]],base);poly(c,[[-2.6,-10],[-2.2-ear*1.2,-12.2+ear*2.6],[-1-ear*.8,-12.4+ear*2.6],[-.4,-10.2]],shade);// kleine dicke runde Stehohren
 poly(c,[[-5.6,-5],[-3.8,-8.6],[1,-9.8],[5,-9],[7.4,-6.4],[7.6,2.4],[3.4,6],[-2.8,6],[-6,2.4]],base);seg(c,-3,-9.2,4.2,-9.4,.9,light);
 for(let i=0;i<3;i++)seg(c,.6+i*.3,-8.4+i*1.1,4.6-i*.2,-8.6+i*1.1-.4,.6,shade);// Stirnfalten (finsterer Blick)
 poly(c,[[-4,.4],[3.2,-.4],[4.6,5.6],[-2.6,6]],shade+'90');
 const jaw=o.jaw||0,jA=jaw*.6,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.2,2.5);c.rotate(jA);poly(c,[[-1,0],[6.6,0],[6.6,2.2],[0,3.2]],tgD);
 if(jaw>.2){rr(c,5.4,-.9,1,1.5,'#f0eadb');rr(c,3.6,-.5,.8,.8,'#f0eadb');rr(c,2,-.5,.8,.8,'#f0eadb');rr(c,1,0,4.2,.9,tgD);}
 if(o.tongue||o.pant){rr(c,1.4,.2,5.2,1.5,tg);if(o.tongue>.6)rr(c,5.2,1,2.2,2.6+o.tongue*2.6,tgD);}// blauschwarze Zunge
 if(d.mouthBlood>.1)rr(c,1,2.5,6*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.2,-6.4],[9.8,-6.2],[11.1,-5],[11.6,-2.8],[11.4,1.1],[10.2,2],[6.2,2.4]],base);seg(c,6.8,-5.8,10.2,-5.6,.8,light);seg(c,7,-3.8,10.8,-3.6,.5,shade);// kurze breite Schnauze
 poly(c,[[10.1,-7],[11.9,-7],[12.6,-5.6],[12.2,-4.2],[10.3,-4.4]],nose);rr(c,11.2,-6.6,.9,.8,'#5a4f49');if(o.sniff)rr(c,11.9,-5.1+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[10,1.2],[11.9,1.2],[12.5,1.2-3.2*o.lick],[11,1.2-3.8*o.lick]],tg);
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.2+i*1.1,-6.1,7.9+i*1.1,-4.9,.5,shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6.2,1.1],[8.6,1.3],[8,3.1],[6.2,3.1]],tgD);rr(c,9.6,1.3,1.1,2.5,'#f2ecdd');rr(c,8.4,1.5,.7,1.2,'#f2ecdd');rr(c,10.6,1.5,.6,1,'#f2ecdd');seg(c,6.6,-.4,11,-1.1,.9,'#1a1410');c.translate(0,-qv);}
 else{poly(c,[[6.2,1],[11.4,1],[11,3.4],[8.8,4.4],[6.8,4]],base);seg(c,6.6,1.1,11.2,1,.6,tgD);}// schwarze Lefzen
 if(o.drool&&!dead)rr(c,7.2,4.2,.5,2.2+Math.sin(t*3)*1.3,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6.2,1.4,5.6,1.4*mb+.4,'#7d1a12');rr(c,8.8,3.2,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,10.4,3,.9,1+mb*4,'#8f2017');rr(c,7,4.6,.9,1+mb*3,'#7d1a12');}}
 seg(c,2.4,-5.9,5.8,-6.3,1,shade);// schwere Braue
 if(dead||o.blink)seg(c,3.3,-4.6,5.1,-4.4,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.8,-5.1,1,1.1,'#e9e2d0');poly(c,[[3.2,-5.1],[5.2,-5.1],[4.6,-4.1]],'#0d0907');}// kleines tiefliegendes Dreiecksauge
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,7.2,3.4,9,1.6,'#e7dcc2');disk(c,7.2,4.2,1.4,'#e7dcc2');disk(c,16.2,4.2,1.4,'#e7dcc2');rr(c,8.2,4.6,7,.6,'#b8ab8c');}}
// ---- Kopf des Shar-Pei: großer Kopf voller tiefer Falten (Stirn, Backen, Hals), breite gepolsterte „Nilpferd“-Schnauze, Lefzen gepolstert, kleine tiefliegende dreieckige Augen, winzige dreieckige Ohren flach am Kopf, blauschwarze Zunge
function headSP2(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,D=d.dog,fl=shadeHex(base,.68),fh=shadeHex(base,1.12),nose=A.coat==='creme'?'#8a5a3a':A.coat==='blau'?'#3a3e44':'#1a1210',tg='#3a3550',tgD='#2a2640';
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-7,-5.4],[-5,-9.6],[1,-10.8],[5.6,-10],[8,-7],[8.2,3],[4,7.4],[-3.6,7.6],[-7.4,3.2]],base);
 seg(c,-3.8,-10.3,4.8,-10.6,1,fh);
 for(let i=0;i<5;i++){seg(c,-2.4+i*.4,-9.4+i*1.05,5.2-i*.1,-9.8+i*1.1-((o.lips||0)>.6?.4:0),.7,fl);seg(c,-2.2+i*.4,-9.9+i*1.05,5-i*.1,-10.3+i*1.1,.4,fh+'99');}// tiefe Stirnfalten
 poly(c,[[-4.6,.2],[3.6,-.8],[5.6,7],[-3,7.4]],shade+'a0');for(let i=0;i<4;i++){seg(c,-4.2+i*.2,1+i*1.6,4.6+i*.3,.2+i*1.7,.7,fl);seg(c,-4+i*.2,.5+i*1.6,4.4+i*.3,-.3+i*1.7,.4,fh+'80');}// Backenfalten
 const jaw=o.jaw||0,jA=jaw*.6,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5,2.8);c.rotate(jA);poly(c,[[-1,0],[6.8,0],[6.8,2.4],[0,3.4]],shadeHex(base,.8));
 if(jaw>.2){rr(c,5.6,-.9,1,1.5,'#f0eadb');rr(c,3.8,-.5,.8,.8,'#f0eadb');rr(c,2.1,-.5,.8,.8,'#f0eadb');rr(c,1,0,4.4,.9,tgD);}// dunkles Maul
 if(o.tongue||o.pant){rr(c,1.4,.2,5.4,1.5,tg);if(o.tongue>.6)rr(c,5.4,1,2.2,2.6+o.tongue*2.6,tgD);}// blauschwarze Zunge
 if(d.mouthBlood>.1)rr(c,1,2.6,6.2*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6,-6.6],[10.2,-6.6],[11.8,-5.4],[12.4,-3],[12.2,1.6],[10.8,2.6],[6,3]],base);seg(c,6.6,-6,10.6,-6,.9,fh);for(let i=0;i<3;i++)seg(c,7+i*.2,-4.6+i*1.6,11.6,-4.4+i*1.6,.6,fl);// breite gepolsterte Nilpferd-Schnauze
 poly(c,[[10.4,-7.4],[12.4,-7.4],[13.1,-5.9],[12.7,-4.4],[10.6,-4.6]],nose);rr(c,11.6,-7,.9,.8,'#5a4f49');if(o.sniff)rr(c,12.4,-5.4+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[10.4,1.6],[12.4,1.6],[13,1.6-3.3*o.lick],[11.4,1.6-3.9*o.lick]],tg);
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1.4],[8.8,1.6],[8.1,3.4],[6,3.4]],tgD);rr(c,10,1.6,1.1,2.4,'#f2ecdd');rr(c,8.8,1.8,.7,1.2,'#f2ecdd');rr(c,11.2,1.8,.6,1,'#f2ecdd');seg(c,6.4,-.2,12,-.9,1,fl);c.translate(0,-qv);}
 else{poly(c,[[6,1.4],[12.2,1.4],[12,4],[10.4,5.6],[7.8,5.6],[6.2,4.6]],base);seg(c,7,5,11.4,4.4,.6,fl);seg(c,6.6,3.2,11.6,2.8,.5,fl);}// gepolsterte Lefzen mit Falten
 if(o.drool&&!dead)rr(c,7.6,5.4,.5,2.4+Math.sin(t*3)*1.4,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.6,6.6,1.4*mb+.4,'#7d1a12');rr(c,9,4,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,11,3.6,.9,1+mb*4,'#8f2017');rr(c,7,5,.9,1+mb*3,'#7d1a12');}}
 seg(c,2,-5.6,6,-6,1,fl);seg(c,2.2,-3.6,5.8,-3.4,.8,fl);// Falten ober- und unterhalb des Auges
 if(dead||o.blink)seg(c,3,-4.6,5,-4.4,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.8,-5,1,1,'#e9e2d0');poly(c,[[3.2,-5],[5,-5],[4.4,-4]],'#0d0907');}// kleines tiefliegendes Dreiecksauge
 poly(c,[[-3-ear*.4,-9.8],[-.6-ear*.6,-10.2],[-1.6-ear*1.4,-7.8-ear*.8]],dark);// winziges Ohr, flach anliegend
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,7.2,3.8,9,1.6,'#e7dcc2');disk(c,7.2,4.6,1.4,'#e7dcc2');disk(c,16.2,4.6,1.4,'#e7dcc2');rr(c,8.2,5,7,.6,'#b8ab8c');}}
// ---- Kopf des Komondors: runder Kopf ganz unter Filzschnüren, Schnüre hängen über Stirn, Augen und Schnauze, nur Nasenspiegel und (bei offenem Maul) Zähne sichtbar; Augen blitzen zwischen den Schnüren
function headKO(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,D=d.dog,ps=(D?.seed||0)%9973,sw=Math.sin(t*1.6+ps)*.25;
 const jaw=o.jaw||0,jA=jaw*.6,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.4,2.4);c.rotate(jA);poly(c,[[-1,0],[7,0],[7,2.2],[0,3.2]],'#2a2420');
 if(jaw>.2){rr(c,5.8,-.9,1,1.5,'#f0eadb');rr(c,3.9,-.5,.8,.8,'#f0eadb');rr(c,2.2,-.5,.8,.8,'#f0eadb');rr(c,1,0,4.6,.9,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,5.8,1.5,'#c8606a');if(o.tongue>.6)rr(c,5.8,1,2.2,2.7+o.tongue*2.7,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.5,6.4*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[-7.6,-3.4],[-6,-9.6],[-1,-11.6],[4.6,-11.2],[8,-8.6],[10.4,-5.4],[11.6,-2],[11.4,2],[8,4],[3,5.6],[-3.6,6],[-7.8,3.2]],base);// runder Schnurkopf
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;rr(c,10,1.2+qv,1,2.3,'#f2ecdd');rr(c,8.7,1.4+qv,.7,1.1,'#f2ecdd');}
 for(let i=0;i<13;i++){const x=-6.8+i*1.45,h=hrand(ps+i*2.3),y0=-11+Math.abs(i-6)*.35,len=7.4+h*5.6-(i>9?(i-9)*2:0);seg(c,x,y0,x+.4+sw,y0+len,1.5,i%2?light:base);seg(c,x+.8,y0+1,x+1+sw,y0+len-1.2,.6,shade);}// Schnüre über den ganzen Kopf
 for(let i=0;i<4;i++){const x=7.6+i*1.1,h=hrand(ps+i*3.9);seg(c,x,-6+i*.6,x+.3+sw,-1+h*3,1.3,i%2?base:light);}// Schnüre über der Schnauze
 poly(c,[[10.4,-4.6],[12,-4.6],[12.6,-3.3],[12.2,-2.1],[10.6,-2.3]],'#0d0907');rr(c,11.4,-4.2,.8,.6,'#5a4f49');if(o.sniff)rr(c,12.1,-3+Math.sin(t*34)*.3,.8,.8,'#2a2420');// Nasenspiegel schaut heraus
 if(o.lick>.05)poly(c,[[10.2,2],[12,2],[12.6,2-3*o.lick],[11.2,2-3.6*o.lick]],'#c8606a');
 if(!dead&&!o.blink){rr(c,3.6,-5.2,1.2,.9,'#0d0907');if((o.lips||0)>.6||o.eyeWhite)rr(c,3.9,-5,.5,.5,'#e9d27a');}// Auge blitzt zwischen den Schnüren
 if(o.drool&&!dead)rr(c,7.4,5.2,.5,2.4+Math.sin(t*3)*1.4,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,7,3.2,4,1.4*mb+.4,'#7d1a12');rr(c,9.2,4.4,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,6.6,5,.9,1+mb*4,'#8f2017');}}
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,8,3.4,9,1.6,'#e7dcc2');disk(c,8,4.2,1.4,'#e7dcc2');disk(c,17,4.2,1.4,'#e7dcc2');rr(c,9,4.6,7,.6,'#b8ab8c');}}
// ---- Kopf des Neufundländers: breiter massiver Kopf mit gewölbtem Schädel, kurze tiefe quadratische Schnauze, weiche Lefzen, kleine tiefliegende dunkle Augen, kleine dreieckige Hängeohren dicht am Kopf; bei Landseer schwarzer Kopf mit weißer Blesse und weißer Schnauze
function headNF(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,D=d.dog,sd=(D?.seed||0)%151,ls=A.coat==='landseer',hc=ls?col.patch:base,hl=ls?col.patchHi:light,hs=ls?shadeHex(col.patch,.7):shade,mz=ls?'#ece8e0':shadeHex(base,1.05);
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-7.4,-4.2],[-5.6,-9.4],[.6,-11],[5.4,-10.2],[7.8,-7],[8,2.8],[4,7.6],[-3.6,8.2],[-7.8,3.8]],hc);// massiver Kopf im Fell
 for(let i=0;i<7;i++){const a=-2.2+i*.55,h=hrand(i*2.9+sd);seg(c,-1.4+Math.cos(a)*7.4,.6+Math.sin(a)*8,-1.4+Math.cos(a)*(8.8+h),.6+Math.sin(a)*(9.4+h),.9,h>.5?hl:hc);}// Fellzotteln
 seg(c,-3.8,-10.4,4.6,-10.6,1,hl);
 if(ls)poly(c,[[3.2,-10.6],[5,-10.2],[5.8,-7],[5.2,-4],[4,-6.6]],'#ece8e0');// weiße Blesse (Landseer)
 poly(c,[[-4.4,.6],[3.4,-.2],[5,6.2],[-2.8,6.6]],hs+'90');seg(c,-3,1.2,3,.6,.8,hl+'90');
 const jaw=o.jaw||0,jA=jaw*.6,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.2,2.6);c.rotate(jA);poly(c,[[-1,0],[7,0],[7,2.3],[0,3.3]],ls?'#cfc8bb':hs);
 if(jaw>.2){rr(c,5.8,-.9,1,1.5,'#f0eadb');rr(c,3.9,-.5,.8,.8,'#f0eadb');rr(c,2.2,-.5,.8,.8,'#f0eadb');rr(c,1,0,4.6,.9,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,5.8,1.5,'#c8606a');if(o.tongue>.6)rr(c,5.8,1,2.2,2.7+o.tongue*2.7,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.6,6.4*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.2,-6.4],[10.2,-6.2],[11.6,-5],[12.2,-2.8],[12,1.2],[10.8,2],[6.2,2.4]],mz);seg(c,6.8,-5.8,10.6,-5.6,.8,ls?'#faf8f2':hl);seg(c,7,-3.8,11.4,-3.6,.5,ls?'#c4beb2':hs);// kurze tiefe quadratische Schnauze
 poly(c,[[10.4,-7],[12.3,-7],[13,-5.6],[12.6,-4.2],[10.6,-4.4]],A.coat==='braun'?'#3a2014':'#0d0907');rr(c,11.6,-6.6,.9,.8,'#5a4f49');if(o.sniff)rr(c,12.3,-5.1+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[10.4,1.3],[12.3,1.3],[12.9,1.3-3.2*o.lick],[11.4,1.3-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.2+i*1.2,-6.1,7.9+i*1.2,-4.9,.5,ls?'#a8a092':hs);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1.1],[8.8,1.3],[8.1,3.1],[6,3.1]],'#2a201c');rr(c,10,1.3,1.1,2.5,'#f2ecdd');rr(c,8.7,1.5,.7,1.2,'#f2ecdd');rr(c,11.1,1.5,.6,1,'#f2ecdd');seg(c,6.4,-.4,11.6,-1.1,.9,'#140e0b');c.translate(0,-qv);}
 else{const sw=dead?0:Math.sin(t*2+sd)*.25;poly(c,[[6,1],[12,1],[11.8,3.4],[10.4,5.2+sw],[8.2,5.6+sw],[6.6,4.8],[6,3.2]],mz);seg(c,6.4,1.1,11.8,1,.6,'#1a1410');}// weiche Lefzen
 if(o.drool&&!dead)rr(c,7.8,5.4,.6,2.8+Math.sin(t*3)*1.6,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.4,6.6,1.4*mb+.4,'#7d1a12');rr(c,9.2,3.6,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,11.2,3.2,.9,1+mb*4,'#8f2017');rr(c,7.2,4.8,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,3.3,-4.6,5.1,-4.4,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.8,-5.3,1,1.3,'#e9e2d0');rr(c,3.4,-5.2,1.7,1.3,'#0d0907');rr(c,4.3,-5,.6,.5,(o.lips||0)>.6?'#e9d27a':'#5a3a20');}// kleines tiefliegendes Auge
 poly(c,[[-4-ear*.7,-9.2],[-.6-ear*1,-9.8],[-1-ear*2,-5.6-ear*1.4],[-3-ear*2.2,-5.2-ear*1]],hs);for(let i=0;i<3;i++)seg(c,-3.4-ear*2+i*.9,-5.6-ear*1.2,-3.6-ear*2+i*.9,-4.4-ear*1.2,.5,hc);// kleines Hängeohr dicht am Kopf, mit Fransen
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,7.4,3.6,9,1.6,'#e7dcc2');disk(c,7.4,4.4,1.4,'#e7dcc2');disk(c,16.4,4.4,1.4,'#e7dcc2');rr(c,8.4,4.8,7,.6,'#b8ab8c');}}
// ---- Kopf des Alaskan Malamute: breiter Kopf, weißes Gesicht mit dunkler Kappe, dunkler Brille um die Augen und Strich über den Nasenrücken (Gesichtsmaske), mittellange kräftige Schnauze, mandelförmige braune Augen, kleine dreieckige Stehohren weit auseinander, Halskrause
function headMM(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,bel=col.belly||'#ece8e0',D=d.dog,ps=(D?.seed||0)%9973,bar=hrand(ps*.47)<.6;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-4.4,-8.4],[-2.8-ear*2.4,-13.8+ear*4.4],[0-ear*1.2,-9]],base);poly(c,[[-3.6,-8.8],[-2.6-ear*2,-12.4+ear*3.8],[-.8-ear*1,-9.2]],bel);// kleine Stehohren, innen hell
 poly(c,[[-7,-4.6],[-5,-8.8],[.8,-10],[5,-9.2],[7.4,-6.4],[7.6,2.4],[3.4,6.4],[-3.4,6.6],[-7.4,2.8]],base);// breiter Kopf mit Krause
 for(let i=0;i<6;i++){const a=.6+i*.4,h=hrand(i*2.7+ps);seg(c,-1.4+Math.cos(a)*6.8,1+Math.sin(a)*7,-1.4+Math.cos(a)*(8.2+h),1+Math.sin(a)*(8.4+h),.9,bel);}// helle Halskrause unten
 poly(c,[[-5,-1],[-1,-2.6],[2,-3.4],[4,-6.6],[7.4,-6.2],[7.6,2.4],[3.4,6.4],[-3.4,6.6],[-6.6,2.6]],bel);// weißes Gesicht
 poly(c,[[1.4,-6.4],[5,-6.8],[5.6,-4],[3.4,-3.2],[1.2,-3.8]],base);// dunkle Brille um das Auge
 seg(c,-3.4,-9.4,4.4,-9.6,.9,light);
 const jaw=o.jaw||0,jA=jaw*.64,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.4,2.2);c.rotate(jA);poly(c,[[-1,0],[7.6,0],[7.4,1.9],[0,2.8]],bel);rr(c,0,2.1,7,.5,shadeHex(bel,.78));
 if(jaw>.2){rr(c,6.4,-.9,.9,1.4,'#f0eadb');rr(c,4.3,-.5,.8,.8,'#f0eadb');rr(c,2.4,-.5,.8,.8,'#f0eadb');rr(c,1,0,5,.8,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,6.2,1.4,'#c8606a');if(o.tongue>.6)rr(c,6.2,1,2,2.4+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.2,7*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6,-6],[10.6,-5.6],[12.2,-4.6],[12.8,-2.6],[12.6,1],[11.4,1.8],[6,2.2]],bel);seg(c,6.8,-5.4,11,-5,.8,'#faf6ee');if(bar)poly(c,[[5.6,-6.4],[10.4,-5.8],[10.2,-4.6],[5.8,-5]],base);// weiße Schnauze, oft dunkler Strich
 poly(c,[[10.8,-6.4],[12.6,-6.4],[13.3,-5],[12.9,-3.7],[11,-3.9]],'#0d0907');rr(c,12,-6,.8,.7,'#5a4f49');if(o.sniff)rr(c,12.7,-4.6+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[10.8,1],[12.6,1],[13.2,1-3.2*o.lick],[11.8,1-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.2+i*1.3,-5.8,7.9+i*1.3,-4.6,.5,shadeHex(bel,.7));}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1],[8.8,1.1],[8,2.7],[6,2.7]],'#2a201c');rr(c,10.6,1,.9,2.4,'#f2ecdd');rr(c,9.3,1.2,.7,1.2,'#f2ecdd');rr(c,11.8,1.2,.6,1,'#f2ecdd');seg(c,6.4,-.5,12.4,-1,.8,'#1a1410');c.translate(0,-qv);}
 else{poly(c,[[6,1],[12.6,1],[12,2.8],[9.2,3.6],[6.8,3.4],[6,2.7]],bel);seg(c,6.4,1.1,12.4,1,.6,'#1a1410');}// enge schwarze Lefzenlinie
 if(o.drool&&!dead)rr(c,7.2,3.6,.5,2+Math.sin(t*3)*1.2,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.2,7,1.4*mb+.4,'#7d1a12');rr(c,9.2,2.8,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,11.4,2.6,.9,1+mb*4,'#8f2017');rr(c,7.2,3.8,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,2.8,-4.9,5,-4.6,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.4,-5.5,1,1.3,'#e9e2d0');poly(c,[[2.8,-5.4],[5.2,-5.4],[4.9,-4.2],[3.1,-4.1]],'#0d0907');rr(c,4,-5.2,.7,.5,(o.lips||0)>.6?'#e9d27a':'#7a4c28');}// mandelförmiges braunes Auge
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,8,3,9,1.6,'#e7dcc2');disk(c,8,3.8,1.4,'#e7dcc2');disk(c,17,3.8,1.4,'#e7dcc2');rr(c,9,4.2,7,.6,'#b8ab8c');}}
// ---- Kopf des Bernhardiners: mächtiger breiter Kopf, Stirnfalten, kurze breite Schnauze, weiße Blesse über Stirn und Schnauze, rotbraune Kopfseiten, dunkle Maske um die Augen, schwere Hängelefzen, rotes Unterlid, mittelgroße hoch angesetzte Hängeohren (rotbraun)
function headSB(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,mask=A.mask,D=d.dog,sd=(D?.seed||0)%149,red=col.patch||col.saddle||'#9a5a30',redD=shadeHex(red,.75),redL=shadeHex(red,1.15);
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-7,-5.4],[-5,-9.6],[1,-11],[5.8,-10.2],[8,-7.2],[8.2,3],[4,8],[-3.4,8.2],[-7.4,3.4]],red);// mächtiger Kopf, rotbraun
 for(let i=0;i<3;i++)seg(c,-1+i*.3,-9.4+i*1.1,4.8-i*.1,-9.8+i*1.15-((o.lips||0)>.6?.5:0),.6,redD);// Stirnfalten
 poly(c,[[2.6,-11],[5.6,-10.4],[6.8,-7],[6.4,-2],[4.4,-2.4],[3.6,-7]],base);// weiße Blesse
 poly(c,[[-6.6,1.6],[-1,1],[4.4,1],[5.8,7.6],[-3,8.2],[-7,3.4]],base);seg(c,-4.6,2.6,3.6,2.2,.6,shade);// weiße Kehle und Backenunterseite
 poly(c,[[1.4,-7.2],[3.6,-7.6],[4,-3],[1.8,-2.6]],mask+'e0');// dunkle Maske um die Augen
 const jaw=o.jaw||0,jA=jaw*.58,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.2,3);c.rotate(jA);poly(c,[[-1,0],[7,0],[7,2.2],[0,3.2]],shade);
 if(jaw>.2){rr(c,5.8,-.9,1,1.5,'#f0eadb');rr(c,3.9,-.5,.8,.8,'#f0eadb');rr(c,2.2,-.5,.8,.8,'#f0eadb');rr(c,1,0,4.6,.9,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,5.8,1.6,'#c8606a');if(o.tongue>.6)rr(c,5.8,1,2.2,2.8+o.tongue*2.8,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.5,6.6*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.2,-6.6],[10.2,-6.4],[11.6,-5.2],[12.2,-3],[12,1.2],[10.8,2.2],[6.2,2.6]],base);seg(c,6.8,-6,10.6,-5.8,.8,light);seg(c,7,-4,11.4,-3.8,.5,shade);// kurze breite weiße Schnauze
 poly(c,[[10.4,-7.2],[12.4,-7.2],[13.1,-5.7],[12.7,-4.2],[10.6,-4.4]],'#0d0907');rr(c,11.6,-6.8,.9,.8,'#5a4f49');if(o.sniff)rr(c,12.4,-5.2+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[10.4,1.6],[12.4,1.6],[13,1.6-3.3*o.lick],[11.4,1.6-3.9*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.2+i*1.2,-6.3,7.9+i*1.2,-5.1,.5,shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1.4],[9,1.6],[8.2,3.6],[6,3.6]],'#2a201c');rr(c,10.4,1.6,1.1,2.5,'#f2ecdd');rr(c,9,1.8,.7,1.2,'#f2ecdd');rr(c,11.6,1.8,.7,1,'#f2ecdd');seg(c,6.4,-.2,12.2,-1,1,'#1a1410');c.translate(0,-qv);}
 else{const sw=dead?0:Math.sin(t*2+sd)*.35;poly(c,[[6,1.2],[12.2,1.2],[12.2,3.8],[11.2,6.6+sw],[9,7.4+sw],[6.8,6.6],[6,3.8]],base);seg(c,6.4,1.3,12,1.2,.6,'#2a201c');seg(c,7.4,6.4+sw,11,5.8+sw,.6,shade);}// schwere Hängelefzen
 if(o.drool&&!dead)rr(c,8.4,7,.6,3.4+Math.sin(t*3)*2,'#e6e1d6cc');else if(!dead&&hrand(sd*.37)<.6)rr(c,9.6,7,.5,1.6+Math.sin(t*1.1+sd)*1,'#e6e1d6aa');// Sabber
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.6,7.2,1.4*mb+.4,'#7d1a12');rr(c,9.4,4.4,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,11.4,4,.9,1+mb*4,'#8f2017');rr(c,7.2,5.8,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,2.2,-4.4,4,-4.2,.6,'#1a120d');else{if(o.eyeWhite)rr(c,1.8,-5.1,1,1.3,'#e9e2d0');rr(c,2.2,-5,1.8,1.3,'#140e0a');rr(c,3.1,-4.8,.6,.5,(o.lips||0)>.6?'#e9d27a':'#7a5230');rr(c,2,-3.6,2.2,.7,'#9a3a34');}// Auge mit rotem Unterlid
 poly(c,[[-4.4-ear*.8,-9],[-.8-ear*1.2,-9.8],[-1.2-ear*2.4,-3.8-ear*2],[-3.8-ear*2.6,-3.4-ear*1.4]],redD);seg(c,-4-ear*.8,-8.8,-1-ear*1.2,-9.6,.6,redL);// Hängeohr
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,7.8,3.8,9,1.6,'#e7dcc2');disk(c,7.8,4.6,1.4,'#e7dcc2');disk(c,16.8,4.6,1.4,'#e7dcc2');rr(c,8.8,5,7,.6,'#b8ab8c');}}
// ---- Kopf des Leonbergers: tiefer länglicher Kopf, Schädel leicht gewölbt, schwarze Maske über Schnauze und um die Augen, mäßige Lefzen, mittelbraune Augen, mittelgroße Hängeohren dicht am Kopf, Fellkragen um den Kopf mit dunklen Spitzen
function headLB(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,mask=A.mask,D=d.dog,sd=(D?.seed||0)%139;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-8,-3.6],[-6.4,-9],[-2,-10.8],[3,-10.4],[6,-8.8],[7.8,-6],[8,2.6],[4,7.4],[-3.4,8.6],[-8,4.6]],base);// Fellkragen
 for(let i=0;i<9;i++){const a=-2.4+i*.5,h=hrand(i*3.3+sd);seg(c,-1+Math.cos(a)*7.4,.6+Math.sin(a)*8,-1+Math.cos(a)*(9+h*1.4),.6+Math.sin(a)*(9.6+h*1.4),1,h>.6?dark:light);}// Zotteln, dunkle Spitzen
 poly(c,[[-5.8,-4.8],[-4,-8.4],[1,-9.6],[5,-8.8],[7.4,-6.2],[7.6,2.4],[3.4,6],[-2.8,6],[-6.2,2.4]],base);seg(c,-3,-9,4.2,-9.2,.9,light);
 poly(c,[[-4,.4],[3.2,-.4],[4.6,5.6],[-2.6,6]],light+'90');
 poly(c,[[2.4,-7.4],[7.6,-7],[7.8,-.2],[4,-1.6],[2,-3.8]],mask+'d0');// Maske um die Augen
 const jaw=o.jaw||0,jA=jaw*.62,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.4,2.3);c.rotate(jA);poly(c,[[-1,0],[7.6,0],[7.6,2.1],[0,3.1]],mask);
 if(jaw>.2){rr(c,6.4,-.9,1,1.5,'#f0eadb');rr(c,4.3,-.5,.8,.8,'#f0eadb');rr(c,2.4,-.5,.8,.8,'#f0eadb');rr(c,1,0,5,.9,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,6.2,1.5,'#c8606a');if(o.tongue>.6)rr(c,6.2,1,2.2,2.7+o.tongue*2.7,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.4,7*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.2,-6.2],[11,-5.8],[12.6,-4.6],[13.2,-2.6],[13,1.2],[11.8,2],[6.2,2.4]],mask);seg(c,6.8,-5.6,11.4,-5.2,.8,'#3a2e26');seg(c,7.2,-3.6,12.2,-3.4,.5,'#2a201a');// tiefe Schnauze, schwarze Maske
 poly(c,[[11.4,-6.6],[13.3,-6.6],[14,-5.2],[13.6,-3.8],[11.6,-4]],'#0d0907');rr(c,12.6,-6.2,.9,.8,'#5a4f49');if(o.sniff)rr(c,13.3,-4.7+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[11.4,1.3],[13.3,1.3],[13.9,1.3-3.2*o.lick],[12.4,1.3-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.4+i*1.3,-5.9,8.1+i*1.3,-4.7,.5,'#3a2e26');seg(c,4.6,-7,6.4,-7.4,.5,shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1.1],[9,1.3],[8.2,3.1],[6,3.1]],mask);rr(c,11,1.3,1.1,2.5,'#f2ecdd');rr(c,9.6,1.5,.7,1.2,'#f2ecdd');rr(c,12.2,1.5,.6,1,'#f2ecdd');seg(c,6.4,-.4,12.8,-1.1,.9,'#140e0b');c.translate(0,-qv);}
 else{poly(c,[[6,1],[13,1],[12.6,3.4],[9.8,4.6],[7,4.2],[6,3]],mask);seg(c,8,3.9,12,2.8,.5,'#2a201a');}// mäßige Lefzen
 if(o.drool&&!dead)rr(c,7.4,4.4,.5,2.4+Math.sin(t*3)*1.4,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.4,7.4,1.4*mb+.4,'#7d1a12');rr(c,9.6,3.2,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,12,3,.9,1+mb*4,'#8f2017');rr(c,7.4,4.6,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,3.2,-4.6,5.2,-4.4,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.6,-5.3,1,1.4,'#e9e2d0');rr(c,3.2,-5.2,1.9,1.4,'#110c09');rr(c,4.3,-5,.7,.6,(o.lips||0)>.6?'#e9d27a':'#7a5230');}
 poly(c,[[-3.8-ear*.8,-8.8],[-.4-ear*1.2,-9.4],[-.6-ear*2.4,-3.4-ear*2],[-3-ear*2.6,-3-ear*1.4]],shade);for(let i=0;i<3;i++)seg(c,-3.4-ear*2.4+i*1,-3.4-ear*1.8,-3.6-ear*2.4+i*1,-2-ear*1.8,.6,dark);// Hängeohr mit dunklen Fransen
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,8,3.2,9,1.6,'#e7dcc2');disk(c,8,4,1.4,'#e7dcc2');disk(c,17,4,1.4,'#e7dcc2');rr(c,9,4.4,7,.6,'#b8ab8c');}}
// ---- Kopf der Deutschen Dogge: langer schmaler rechteckiger Kopf, deutlicher Stop, Nasenrücken parallel zur Stirn, tiefe stumpfe Schnauze, Lefzen, dunkle Maske (bei Gelb/Gestromt), mandelförmige Augen; kupierte hohe Stehohren oder hoch angesetzte Kippohren; Harlekin mit gerissenen Platten am Kopf
function headDD(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,D=d.dog,ps=(D?.seed||0)%9973,sd=ps%137,harl=A.coat==='harlekin',mk=(A.coat==='gelb'||A.coat==='gestromt')?A.mask:shadeHex(base,.7),pt=col.patch;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 if(A.earCut)poly(c,[[-3.6,-8.2],[-2.6-ear*1.4,-16+ear*1.4],[-.8-ear*.5,-15.2+ear*1.2],[.4,-8.6]],harl&&hrand(ps*.3)<.5?pt:base);// kupiert: hohe spitze Stehohren
 poly(c,[[-5.8,-4.6],[-4,-8.2],[1,-9.2],[5,-8.6],[7.4,-6.2],[7.6,2.2],[3.2,5.4],[-3,5.4],[-6.2,2]],base);
 if(col.stripe)for(let i=0;i<4;i++){const x=-4.4+i*1.6+hrand(i+sd)*.5;seg(c,x,-7.4+hrand(i*3+sd),x-.8,-1+hrand(i*5+sd)*2,.5,col.stripe+'80');}
 if(harl)for(let i=0;i<3;i++){const cx=-3+hrand(ps+i*2.3)*8,cy=-6.6+hrand(ps+i*3.1)*8,r=1.2+hrand(ps+i*4.7)*1.6,pts=[];for(let j=0;j<7;j++){const a=j/7*TAU,w=.6+hrand(ps+i*5+j)*.6;pts.push([cx+Math.cos(a)*r*w,cy+Math.sin(a)*r*w*.8]);}poly(c,pts,pt);}// gerissene Harlekin-Platten
 seg(c,-3,-8.7,4.2,-8.9,.9,light);seg(c,4,-7.6,6.6,-7.4,.6,shade);// Stop
 poly(c,[[-4,.2],[3.2,-.6],[4.6,5.2],[-2.6,5.6]],shade+'80');
 const jaw=o.jaw||0,jA=jaw*.62,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.6,2.4);c.rotate(jA);poly(c,[[-1,0],[8.4,0],[8.4,2.2],[0,3.2]],mk);
 if(jaw>.2){rr(c,7.2,-.9,1,1.5,'#f0eadb');rr(c,5,-.5,.8,.8,'#f0eadb');rr(c,3,-.5,.8,.8,'#f0eadb');rr(c,1,0,5.6,.9,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,6.8,1.5,'#c8606a');if(o.tongue>.6)rr(c,7,1,2.2,2.8+o.tongue*2.8,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.5,7.6*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.2,-6.6],[12.2,-6.4],[13.6,-5.4],[14,-3],[13.8,1.4],[12.6,2.2],[6.2,2.6]],harl?base:mk);seg(c,6.8,-6,12.6,-5.8,.8,harl?light:shadeHex(mk,1.4));seg(c,7,-4,13.2,-3.8,.5,harl?shade:shadeHex(mk,.7));// lange tiefe stumpfe Schnauze, Nasenrücken parallel
 poly(c,[[12.4,-7],[14.2,-7],[14.9,-5.6],[14.5,-4.2],[12.6,-4.4]],harl&&hrand(ps*.9)<.3?'#7a5a54':'#0d0907');rr(c,13.6,-6.6,.9,.8,'#5a4f49');if(o.sniff)rr(c,14.3,-5.1+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[12.2,1.4],[14.2,1.4],[14.8,1.4-3.3*o.lick],[13.2,1.4-3.9*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<4;i++)seg(c,7.2+i*1.4,-6.2+i*.1,7.9+i*1.4,-5+i*.1,.5,'#2a1d18');seg(c,4.6,-7.2,6.4,-7.6,.5,shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1.2],[9.6,1.4],[8.7,3.3],[6,3.3]],harl?'#3a2e2a':mk);rr(c,11.8,1.4,1.1,2.6,'#f2ecdd');rr(c,10.4,1.6,.7,1.3,'#f2ecdd');rr(c,13,1.6,.7,1.1,'#f2ecdd');seg(c,6.4,-.4,13.6,-1.1,.9,'#1a1410');c.translate(0,-qv);}
 else{poly(c,[[6,1],[13.8,1],[13.4,3.6],[10.6,5],[7.2,4.6],[6,3.2]],harl?base:mk);seg(c,6.4,1.1,13.6,1,.6,'#1a1410');seg(c,8,4.3,12.8,3.2,.5,harl?shade:'#3e2f27');}// Lefzen
 if(o.drool&&!dead)rr(c,7.6,4.8,.5,2.6+Math.sin(t*3)*1.5,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.4,7.8,1.4*mb+.4,'#7d1a12');rr(c,10,3.4,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,12.6,3.2,.9,1+mb*4,'#8f2017');rr(c,7.6,4.8,.9,1+mb*3,'#7d1a12');}}
 seg(c,2.4,-6.1+(o.lips>.6?.4:0),5.8,-6.3-(o.lips>.6?.6:0),.9,shade);
 if(dead||o.blink)seg(c,3.2,-4.7,5.2,-4.5,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.6,-5.4,1,1.4,'#e9e2d0');poly(c,[[3,-5.3],[5.4,-5.4],[5.2,-4.1],[3.4,-4]],'#110c09');rr(c,4.3,-5.1,.7,.5,(o.lips||0)>.6?'#e9d27a':(A.coat==='blau'?'#8a7a5a':'#6a4426'));}
 if(!A.earCut){poly(c,[[-3.8-ear*.8,-8.6],[-.4-ear*1.2,-9.4],[-.8-ear*2.2,-4.8-ear*1.6],[-2.8-ear*2.2,-4.4-ear*1.2]],harl&&hrand(ps*.3)<.5?pt:shade);seg(c,-3.4-ear*.8,-8.4,-.6-ear*1.2,-9.2,.6,base);}// hoch angesetztes Kippohr
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,8.8,3.4,9,1.6,'#e7dcc2');disk(c,8.8,4.2,1.4,'#e7dcc2');disk(c,17.8,4.2,1.4,'#e7dcc2');rr(c,9.8,4.6,7,.6,'#b8ab8c');}}
// ---- Kopf des Greyhounds: sehr langer schmaler Kopf, flacher Schädel fast ohne Stop, lange spitze Schnauze, enge Lefzen, dunkle Augen, kleine Rosenohren nach hinten gefaltet (bei Aufmerksamkeit halb aufgestellt)
function headGH(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,D=d.dog,sd=(D?.seed||0)%131,pt=col.patch,ps=(D?.seed||0)%9973,headP=pt&&hrand(ps*.53)<.6;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-5.4,-3.8],[-3.8,-7.2],[1,-8.2],[5,-7.6],[7.4,-5.4],[7.6,1.4],[3.2,4],[-2.8,4],[-5.8,1.4]],base);// schmaler flacher Schädel
 if(col.stripe)for(let i=0;i<4;i++){const x=-4+i*1.6+hrand(i+sd)*.5;seg(c,x,-6.6+hrand(i*3+sd),x-.8,-.6+hrand(i*5+sd)*2,.5,col.stripe+'80');}
 if(headP)poly(c,[[-5,-3.6],[-3.6,-7],[1.4,-8],[4.6,-7.4],[6,-4.6],[4,-2.6],[.6,-3],[-3,-1.4]],pt);// Platte über Auge und Ohr (weiß mit Platten)
 seg(c,-2.8,-7.7,4.2,-7.9,.8,headP?(col.patchHi||shade):light);
 poly(c,[[-3.6,0],[3.2,-.6],[4.2,3.8],[-2.2,4]],shade+'80');
 const jaw=o.jaw||0,jA=jaw*.68,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.6,1.6);c.rotate(jA);poly(c,[[-1,0],[9,0],[8.8,1.5],[0,2.3]],shade);
 if(jaw>.2){rr(c,7.8,-.9,.9,1.5,'#f0eadb');rr(c,5.4,-.5,.8,.8,'#f0eadb');rr(c,3.2,-.5,.8,.8,'#f0eadb');rr(c,1,0,6,.8,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,7,1.2,'#c8606a');if(o.tongue>.6)rr(c,7.2,1,1.8,2.4+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,1.8,7.8*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6,-5],[11.8,-4],[13.8,-3],[14.6,-1.8],[14.4,.6],[13,1.2],[6,1.6]],base);seg(c,6.8,-4.4,12.2,-3.6,.7,light);seg(c,7.2,-2.6,13.6,-2.2,.5,shade);// lange spitze Schnauze
 poly(c,[[13.4,-3.9],[15,-3.5],[15.5,-2.4],[15.1,-1.4],[13.6,-1.6]],A.coat==='blau'?'#3a3e44':'#0d0907');rr(c,14.4,-3.4,.7,.5,'#5a4f49');if(o.sniff)rr(c,15,-2.2+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[13,.8],[14.8,.8],[15.4,.8-3*o.lick],[14,.8-3.6*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<4;i++)seg(c,7.2+i*1.4,-4.6+i*.25,7.8+i*1.4,-3.4+i*.25,.5,shade);seg(c,4.4,-5.8,6.4,-6.2,.5,shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,.8],[9.8,.9],[9,2.3],[6,2.3]],'#2a201c');rr(c,12.4,.8,.8,2.4,'#f2ecdd');rr(c,11,1,.6,1.2,'#f2ecdd');rr(c,13.6,1,.6,1,'#f2ecdd');seg(c,6.4,-.7,14,-1.1,.7,'#1a1410');c.translate(0,-qv);}
 else{poly(c,[[6,.8],[14.2,.8],[13.6,2.2],[9.8,3],[6.8,2.8],[6,2.3]],base);seg(c,6.4,.9,14,.8,.5,'#1a1410');}// enge Lefzen
 if(o.drool&&!dead)rr(c,7.4,3,.5,2+Math.sin(t*3)*1.2,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1,8.4,1.4*mb+.4,'#7d1a12');rr(c,9.8,2.4,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,13,2.2,.9,1+mb*4,'#8f2017');rr(c,7.6,3.2,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,3.1,-4.3,5,-4.1,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.6,-5,1,1.3,'#e9e2d0');poly(c,[[3,-4.9],[5.2,-4.9],[5,-3.8],[3.2,-3.7]],'#0d0907');rr(c,4.2,-4.7,.6,.5,(o.lips||0)>.6?'#e9d27a':'#5a3a20');}// dunkles ovales Auge
 const fold=1-cl(ear,0,1);poly(c,[[-3.6,-7],[-.8,-7.6],[-1.6-ear*1.2,-9.4+fold*2.6-ear*1.4],[-4.8-ear*.8,-8.6+fold*2.4-ear*.8]],headP?pt:shade);seg(c,-3.2,-7.2,-1-ear*.8,-8.4+fold*2-ear*1.2,.5,headP?(col.patchHi||base):base);// kleines Rosenohr, nach hinten gefaltet, bei Aufmerksamkeit halb aufgestellt
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,9.4,2.2,9,1.6,'#e7dcc2');disk(c,9.4,3,1.4,'#e7dcc2');disk(c,18.4,3,1.4,'#e7dcc2');rr(c,10.4,3.4,7,.6,'#b8ab8c');}}
// ---- Köpfe der Windhunde Whippet, Saluki, Afghane, Barsoi: ein Zeichner mit Rassen-Varianten (Schnauzenlänge mz, Ramsnase rom, Ohrform, Haarschopf, Augengröße)
// wp Whippet: kürzere Schnauze, große runde Augen, Rosenohren · sl Saluki: lange Hängeohren mit Seidenfransen · af Afghane: Haarschopf, Ohren wie Vorhänge aus Haar, dunkle Maske, leichte Ramsnase · bz Barsoi: sehr lange Schnauze mit gewölbtem Nasenrücken, kleine Rosenohren
const WIND={wp:{mz:.86,rom:0,ear:'rose',eye:1.3},sl:{mz:1,rom:.2,ear:'silk',len:8,eye:1},af:{mz:1.02,rom:.5,ear:'hair',len:12,top:1,eye:.9},bz:{mz:1.2,rom:1,ear:'rose',eye:.9},
 // sg Sloughi: flach anliegende Hängeohren, trauriger Blick · az Azawakh: hoch angesetzte flache Hängeohren · ph Pharaonenhund / ci Cirneco: riesige Stehohren, rosa Nase, Bernsteinaugen · iw Windspiel: sehr kurze Schnauze, große Augen
 sg:{mz:.96,rom:.1,ear:'drop',eye:.95,sad:1},az:{mz:1.03,rom:0,ear:'drop',high:1,eye:1},ph:{mz:.92,rom:0,ear:'prick',ps:9,eye:1,nose:'#c48470',iris:'#c8902a'},ci:{mz:.88,rom:0,ear:'prick',ps:9.6,eye:1,nose:'#b87a62',iris:'#b88a3a'},iw:{mz:.78,rom:0,ear:'rose',eye:1.35},
 // dh Deerhound / lu Lurcher: Bart und Brauen aus Rauhaar · ga Galgo: etwas längere Schnauze · pi Podenco: sehr große Stehohren, rosa Nase · tg Taigan: befederte Hängeohren
 dh:{mz:1.08,rom:.2,ear:'rose',eye:.95,beard:1},lu:{mz:.98,rom:.1,ear:'semi',eye:1,beard:.6},ga:{mz:1.06,rom:.1,ear:'rose',eye:1},pi:{mz:1.04,rom:.2,ear:'prick',ps:10.5,eye:1,nose:'#c48470',iris:'#c8962e'},tg:{mz:1,rom:.2,ear:'silk',len:6.5,eye:1}};
function headWind(c,d,o,A,col,t,dead,gore,woundsOn,V){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,D=d.dog,sd=(D?.seed||0)%131,pt=col.patch,ps=(D?.seed||0)%9973,headP=pt&&hrand(ps*.53)<.55,mzC=col.muzzle||null;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3),sw=(d.moveSpeed||0)>8?Math.sin((d.cyc||0)*TAU*2)*.8:Math.sin(t*1.4)*.25,mz=V.mz,r=V.rom;
 // Hängeohren (Saluki, Afghane) hängen hinter dem Schädel: erst die ferne Seite andeuten
 if(V.ear==='silk'||V.ear==='hair')poly(c,[[-4.6,-6.6],[-2.2,-7.4],[-2.6+sw*.3,-6.8+V.len],[-5.6+sw*.5,-7.4+V.len]],dark);
 poly(c,[[-5.4,-3.8],[-3.8,-7.2],[1,-8.2],[5,-7.6],[7.4,-5.4],[7.6,1.4],[3.2,4],[-2.8,4],[-5.8,1.4]],base);// schmaler flacher Schädel
 if(col.stripe)for(let i=0;i<4;i++){const x=-4+i*1.6+hrand(i+sd)*.5;seg(c,x,-6.6+hrand(i*3+sd),x-.8,-.6+hrand(i*5+sd)*2,.5,col.stripe+'80');}
 if(headP)poly(c,[[-5,-3.6],[-3.6,-7],[1.4,-8],[4.6,-7.4],[6,-4.6],[4,-2.6],[.6,-3],[-3,-1.4]],pt);// Platte über Auge und Ohr
 seg(c,-2.8,-7.7,4.2,-7.9,.8,headP?(col.patchHi||shade):light);
 poly(c,[[-3.6,0],[3.2,-.6],[4.2,3.8],[-2.2,4]],shade+'80');
 if(V.beard)for(let i=0;i<7;i++){const x=-4.4+i*1.6,h=hrand(i*3.7+sd);seg(c,x,-7.6+h,x-1.2,-6+h*2.4,.6,i%2?light:shade);seg(c,x-.6,2.6+h,x-1,4.6+h,.6,i%2?base:shade);}// zottiger Schädel und Backen
 if(col.tan){poly(c,[[3.6,-6.4],[5.2,-6.4],[5,-5.6],[3.8,-5.6]],col.tan);poly(c,[[-2,1.4],[3.6,.4],[4.4,3.8],[-1.4,4]],col.tan);}// Brauenpunkte und Backen (Schwarz-Loh)
 const jaw=o.jaw||0,jA=jaw*.68,snarl=jaw>.15||(o.lips||0)>.6;
 // Schnauze und Kiefer: Länge je Rasse (mz), Ansatz bleibt am Auge
 c.save();c.translate(6,0);c.scale(mz,1);c.translate(-6,0);
 c.save();c.translate(5.6,1.6);c.rotate(jA);poly(c,[[-1,0],[9,0],[8.8,1.5],[0,2.3]],shade);if(mzC)poly(c,[[4,0],[9,0],[8.8,1.5],[4,2]],mzC+'b0');
 if(jaw>.2){rr(c,7.8,-.9,.9,1.5,'#f0eadb');rr(c,5.4,-.5,.8,.8,'#f0eadb');rr(c,3.2,-.5,.8,.8,'#f0eadb');rr(c,1,0,6,.8,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,7,1.2,'#c8606a');if(o.tongue>.6)rr(c,7.2,1,1.8,2.4+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,1.8,7.8*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6,-5],[9,-4.6-r*.9],[11.8,-4-r*.7],[13.8,-3],[14.6,-1.8],[14.4,.6],[13,1.2],[6,1.6]],base);seg(c,6.8,-4.4,12.2,-3.6-r*.6,.7,light);seg(c,7.2,-2.6,13.6,-2.2,.5,shade);// lange spitze Schnauze, beim Barsoi mit gewölbtem Nasenrücken
 if(mzC){poly(c,[[10.6,-3.9-r*.6],[12.4,-3.6-r*.4],[13.8,-3],[14.6,-1.8],[14.4,.6],[13,1.2],[10.2,1.2]],mzC+'c0');poly(c,[[8,-4.2-r*.7],[10.6,-3.9-r*.6],[10.2,1.2],[8,1.4]],mzC+'60');}// dunkle Maske, nach hinten auslaufend
 poly(c,[[13.4,-3.9],[15,-3.5],[15.5,-2.4],[15.1,-1.4],[13.6,-1.6]],V.nose?(snarl||(o.lips||0)>.3?shadeHex(V.nose,1.12):V.nose):A.coat==='blau'?'#3a3e44':'#0d0907');rr(c,14.4,-3.4,.7,.5,V.nose?'#e0b0a0':'#5a4f49');if(o.sniff)rr(c,15,-2.2+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[13,.8],[14.8,.8],[15.4,.8-3*o.lick],[14,.8-3.6*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<4;i++)seg(c,7.2+i*1.4,-4.6+i*.25,7.8+i*1.4,-3.4+i*.25,.5,shade);seg(c,4.4,-5.8,6.4,-6.2,.5,shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,.8],[9.8,.9],[9,2.3],[6,2.3]],'#2a201c');rr(c,12.4,.8,.8,2.4,'#f2ecdd');rr(c,11,1,.6,1.2,'#f2ecdd');rr(c,13.6,1,.6,1,'#f2ecdd');seg(c,6.4,-.7,14,-1.1,.7,'#1a1410');c.translate(0,-qv);}
 else{poly(c,[[6,.8],[14.2,.8],[13.6,2.2],[9.8,3],[6.8,2.8],[6,2.3]],base);if(mzC)poly(c,[[10,.8],[14.2,.8],[13.6,2.2],[10,2.9]],mzC+'b0');seg(c,6.4,.9,14,.8,.5,'#1a1410');}// enge Lefzen
 if(o.drool&&!dead)rr(c,7.4,3,.5,2+Math.sin(t*3)*1.2,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1,8.4,1.4*mb+.4,'#7d1a12');rr(c,9.8,2.4,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,13,2.2,.9,1+mb*4,'#8f2017');rr(c,7.6,3.2,.9,1+mb*3,'#7d1a12');}}
 if(V.beard){const bl=V.beard;for(let i=0;i<6;i++){const x=7.4+i*1.3,h=hrand(i*2.1+sd);seg(c,x,1.6+jaw*1.2,x+.4,2.8+jaw*1.4+bl*(1.4+h*1.4),.8,i%2?base:light);}for(let i=0;i<4;i++){const x=9.6+i*1.2;seg(c,x,-4.4,x+.8,-5.4-hrand(i+sd)*.6,.6,i%2?light:base);}seg(c,13.8,-1,15,.6+bl,.8,light);}// Bart und Schnauzenhaar (Rauhaar)
 c.restore();
 // Auge: Whippet groß und rund, Afghane schmal und schräg (mandelförmig)
 const ey=V.eye;if(dead||o.blink)seg(c,3.1,-4.3,5,-4.1,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.6,-5,1,1.3,'#e9e2d0');if(ey>1.1)poly(c,[[2.8,-5.4],[5.4,-5.3],[5.3,-3.5],[3,-3.4]],'#0d0907');else if(ey<1)poly(c,[[2.8,-4.4],[5.4,-5.2],[5,-4],[3.2,-3.8]],'#0d0907');else poly(c,[[3,-4.9],[5.2,-4.9],[5,-3.8],[3.2,-3.7]],'#0d0907');rr(c,4.2,-4.7,.6,.5,(o.lips||0)>.6?'#e9d27a':V.iris||'#5a3a20');if(mzC)seg(c,2.4,-4.2,5.8,-5.4,.5,mzC+'90');if(V.sad)seg(c,2.6,-5.4,5,-5.8,.5,shade);if(V.beard){seg(c,2.4,-5.6,5.6,-6.6,.9,light);seg(c,3,-5.8,5,-6.2,.5,base);}}// Sloughi: schwere Lidfalte, trauriger Blick
 // Ohren
 if(V.ear==='rose'){const fold=1-cl(ear,0,1),ec=headP?pt:shade;poly(c,[[-3.6,-7],[-.8,-7.6],[-1.6-ear*1.2,-9.4+fold*2.6-ear*1.4],[-4.8-ear*.8,-8.6+fold*2.4-ear*.8]],ec);seg(c,-3.2,-7.2,-1-ear*.8,-8.4+fold*2-ear*1.2,.5,headP?(col.patchHi||base):base);}// kleines Rosenohr
 else if(V.ear==='drop'){const lift=cl(ear,0,1),hy=V.high?-1.2:0,ec=headP?pt:shade;poly(c,[[-3.8,-7.2+hy],[-.4,-7.8+hy],[-.8-lift*.6,-3.2+hy-lift*1.4],[-2.8,-1.6+hy-lift*1.6],[-4.2,-3.4+hy-lift]],ec);seg(c,-3.2,-7+hy,-1.4,-3+hy-lift*1.4,.5,headP?(col.patchHi||base):base);}// flach anliegendes Hängeohr
 else if(V.ear==='semi'){const up=cl(ear,0,1),ec=headP?pt:shade;poly(c,[[-4,-6.8],[-.4,-7.6],[-1.2,-11.4-up*.8],[-3.6,-10.6-up*.6]],ec);poly(c,[[-1.2,-11.4-up*.8],[-3.6,-10.6-up*.6],[-.6+up*.4,-9.4+up*.2]],ec);seg(c,-3.4,-7,-1.6,-10.8,.5,base);}// halb aufgestelltes Ohr, Spitze kippt nach vorn
 else if(V.ear==='prick'){const up=cl(ear,0,1),P=V.ps,back=(1-up)*2.4,ec=headP?pt:base,tip=[-2.6-back,-7.6-P+back*.4],pink=V.nose?shadeHex(V.nose,1.05):'#c89080';poly(c,[[-4.4,-6.6],[.6,-7.8],tip],ec);poly(c,[[-3.2,-7],[-.4,-7.6],[tip[0]+.3,tip[1]+2.2]],pink);seg(c,-4.2,-6.8,tip[0],tip[1],.6,shade);}// große Stehohren, innen fleischfarben
 else{const L=V.len*(1-cl(ear,0,1)*.25),lift=cl(ear,0,1)*1.6,ec=headP?pt:(V.ear==='hair'?base:shade),hc=headP?(col.patchHi||base):light;
  poly(c,[[-3.8,-7.2],[-.6,-7.8],[.2-lift,-6.6+L*.45],[-.6+sw*.4,-7+L],[-4.6+sw*.6,-7.4+L],[-5.2,-6.4+L*.5]],ec);// Hängeohr, bei Aufmerksamkeit etwas gehoben
  const n=V.ear==='hair'?6:4;for(let i=0;i<n;i++){const x=-4.6+i*(4.2/(n-1)),h=hrand(i*2.7+sd);seg(c,x,-6+L*.4,x-.4+sw*.6,-7+L+h*1.6,.8,i%2?hc:ec);}// Fransen bzw. Haarsträhnen
  seg(c,-3.4,-7,-1,-7.4+L*.5,.5,hc+'b0');}
 if(V.top){// Haarschopf (Afghane): lange Strähnen von der Stirn nach hinten über den Kopf
  const hc=headP?(col.patchHi||base):light;for(let i=0;i<6;i++){const x=-2.6+i*1.2,h=hrand(i*3.3+sd);seg(c,x,-8.4-h*.8,x-3.4+sw*.4,-6.4+h*1.4,.9,i%2?hc:base);}seg(c,-2.4,-9,2.8,-9.2,.8,base);}
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,9.4,2.2,9,1.6,'#e7dcc2');disk(c,9.4,3,1.4,'#e7dcc2');disk(c,18.4,3,1.4,'#e7dcc2');rr(c,10.4,3.4,7,.6,'#b8ab8c');}}
// ---- Kopf des Dalmatiners: langer schlanker Kopf, flacher Schädel, mittellange Schnauze, weiß mit kleinen Tupfen, Nase und Lidrand schwarz (bei leberbraunen Tupfen braun), runde Augen, hoch angesetzte Hängeohren mit Tupfen
function headDM(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,D=d.dog,ps=(D?.seed||0)%9973,spot=col.spot||'#1c1a18',liver=A.coat==='leber',nose=liver?'#5a2e1c':'#0d0907';
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-5.8,-4.4],[-4,-8],[1,-9],[5,-8.4],[7.4,-6],[7.6,1.8],[3.2,4.8],[-3,4.8],[-6.2,1.8]],base);
 seg(c,-3,-8.5,4.2,-8.7,.9,light);
 for(let i=0;i<9;i++){const x=-4.8+hrand(ps+i*1.7)*11,y=-7.6+hrand(ps+i*2.9)*11;if(x>3&&x<6&&y>-6&&y<-3.6)continue;disk(c,x,y,.4+hrand(ps+i*4.1)*.5,spot);}// kleine Tupfen am Kopf
 poly(c,[[-4,0],[3.2,-.8],[4.4,4.6],[-2.4,4.8]],shade+'70');
 const jaw=o.jaw||0,jA=jaw*.66,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.4,1.9);c.rotate(jA);poly(c,[[-1,0],[8.2,0],[8,1.7],[0,2.6]],shade);
 if(jaw>.2){rr(c,7,-.9,.9,1.5,'#f0eadb');rr(c,4.8,-.5,.8,.8,'#f0eadb');rr(c,2.8,-.5,.8,.8,'#f0eadb');rr(c,1,0,5.4,.8,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,6.4,1.3,'#c8606a');if(o.tongue>.6)rr(c,6.6,1,1.8,2.4+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2,7.2*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6,-5.6],[11.2,-4.9],[13,-3.8],[13.6,-2.1],[13.4,.8],[12.2,1.4],[6,2]],base);seg(c,6.8,-5,11.6,-4.4,.8,light);seg(c,7.2,-3.2,12.6,-2.8,.5,shade);
 for(let i=0;i<4;i++)disk(c,7.6+hrand(ps+i*5.3)*4.6,-3+hrand(ps+i*6.1)*3.4,.35,spot);// Tupfen auf der Schnauze
 poly(c,[[12.2,-5],[13.8,-4.7],[14.4,-3.5],[14,-2.4],[12.4,-2.6]],nose);rr(c,13.2,-4.5,.8,.6,'#6a5a52');if(o.sniff)rr(c,13.9,-3.3+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[12,1],[13.8,1],[14.4,1-3.2*o.lick],[13,1-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<4;i++)seg(c,7+i*1.3,-5.4+i*.2,7.6+i*1.3,-4.2+i*.2,.5,shade);seg(c,4.4,-6.4,6.4,-6.8,.5,shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1],[9.4,1.1],[8.6,2.6],[6,2.6]],'#3a2a26');rr(c,11.6,1,.9,2.5,'#f2ecdd');rr(c,10.2,1.2,.7,1.3,'#f2ecdd');rr(c,12.8,1.2,.6,1.1,'#f2ecdd');seg(c,6.4,-.6,13.2,-1,.8,nose);c.translate(0,-qv);}
 else{poly(c,[[6,1],[13.2,1],[12.6,2.6],[9.4,3.4],[6.8,3.2],[6,2.6]],base);seg(c,6.4,1.1,13,1,.6,nose);}// enge Lefzen, dunkler Rand
 if(o.drool&&!dead)rr(c,7.4,3.4,.5,2+Math.sin(t*3)*1.2,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.2,7.6,1.4*mb+.4,'#7d1a12');rr(c,9.4,2.6,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,12,2.4,.9,1+mb*4,'#8f2017');rr(c,7.4,3.6,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,3.2,-4.7,5.2,-4.5,.6,nose);else{if(o.eyeWhite)rr(c,2.6,-5.5,1,1.5,'#f2ece0');rr(c,3.2,-5.4,1.9,1.5,'#1a120c');rr(c,4.3,-5.2,.7,.6,(o.lips||0)>.6?'#e9d27a':(liver?'#b0783c':'#6a4426'));seg(c,3,-5.8,5.4,-5.9,.5,nose);}// runde Augen, dunkler Lidrand
 poly(c,[[-3.6-ear*.8,-8.6],[-.2-ear*1.2,-9.2],[-.6-ear*2.2,-4-ear*1.8],[-2.6-ear*2.4,-3.6-ear*1.2]],base);for(let i=0;i<3;i++)disk(c,-2.6-ear*1.6+hrand(ps+i*7.7)*2,-7+hrand(ps+i*8.3)*3.6,.55,spot);seg(c,-3.2-ear*.8,-8.4,-.4-ear*1.2,-9,.6,light);// Hängeohr mit Tupfen
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,8.8,2.6,9,1.6,'#e7dcc2');disk(c,8.8,3.4,1.4,'#e7dcc2');disk(c,17.8,3.4,1.4,'#e7dcc2');rr(c,9.8,3.8,7,.6,'#b8ab8c');}}
// ---- Kopf des American Staffordshire Terriers: breiter tiefer Schädel, sehr kräftige Kaumuskeln (Backen), deutlicher Stop, mittellange Schnauze mit kräftigem Unterkiefer, enge Lefzen, runde dunkle Augen weit auseinander, Rosenohren oder kupierte Stehohren; oft weiße Blesse
function headAS(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,D=d.dog,ps=(D?.seed||0)%9973,sd=ps%127,blaze=hrand(ps*.71)<.35,nose=A.coat==='blau'?'#3a3e44':A.coat==='rot'?'#5a2e1c':'#0d0907',mz=shadeHex(base,.85);
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 if(A.earCut)poly(c,[[-3.6,-8.4],[-2.6-ear*1,-14+ear*.8],[-.8-ear*.4,-13.4+ear*.8],[.4,-8.8]],base);
 else poly(c,[[-4.6-ear,-8.4],[-1-ear,-10],[0-ear*2,-7.6-ear],[-1.6-ear*2.6,-5.6-ear*1.6],[-3.8-ear*2.4,-6-ear]],shade);// Rosenohr
 poly(c,[[-6.6,-5.4],[-4.6,-9.4],[1,-10.6],[5.4,-9.8],[7.6,-6.8],[7.8,2.6],[3.6,6.2],[-3.2,6.2],[-7,2.6]],base);// breiter Schädel
 if(col.stripe)for(let i=0;i<4;i++){const x=-4.8+i*1.7+hrand(i+sd)*.5;seg(c,x,-7.8+hrand(i*3+sd),x-1,-1+hrand(i*5+sd)*2,.55,col.stripe+'80');}
 seg(c,-3.6,-10.1,4.6,-10.4,1,light);seg(c,1.6,-9.4,2,-7,.6,shade);
 if(blaze)poly(c,[[3.8,-10],[6,-9.6],[7.4,-6.4],[7,-3.4],[5.6,-6.2]],'#ece4d4');
 poly(c,[[-4.4,-.2],[3.4,-1],[5.2,5.8],[-2.8,6.2]],shade+'b0');seg(c,-3,.6,3,-.2,1,light+'a0');disk(c,0,2.6,3.2,shade+'60');seg(c,-1.6,4.6,3.6,4,.6,shade);// sehr kräftige Kaumuskeln
 const jaw=o.jaw||0,jA=jaw*.62,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.2,2.4);c.rotate(jA);poly(c,[[-1,0],[7,0],[7,2.4],[0,3.4]],shadeHex(mz,.8));
 if(jaw>.2){rr(c,5.8,-.9,1,1.5,'#f0eadb');rr(c,3.9,-.5,.8,.8,'#f0eadb');rr(c,2.2,-.5,.8,.8,'#f0eadb');rr(c,1,0,4.6,.9,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,5.6,1.5,'#c8606a');if(o.tongue>.6)rr(c,5.6,1,2.2,2.6+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.6,6.4*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.2,-6.4],[10.4,-6],[11.8,-4.8],[12.2,-2.6],[12,1.2],[10.8,2],[6.2,2.4]],mz);seg(c,6.8,-5.8,10.8,-5.4,.8,shadeHex(mz,1.15));seg(c,7,-3.6,11.4,-3.4,.5,shadeHex(mz,.75));// mittellange kräftige Schnauze
 if(blaze)poly(c,[[6.4,-6.2],[9,-6],[8.6,-3.6],[6.4,-3.4]],'#ece4d4');
 poly(c,[[10.6,-6.8],[12.5,-6.8],[13.2,-5.4],[12.8,-4],[10.8,-4.2]],nose);rr(c,11.8,-6.4,.9,.8,'#6a5a52');if(o.sniff)rr(c,12.5,-4.9+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[10.6,1.2],[12.5,1.2],[13.1,1.2-3.2*o.lick],[11.6,1.2-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.2+i*1.2,-6,7.9+i*1.2,-4.8,.5,shade);seg(c,4.6,-7.2,6.4,-7.6,.5,shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1.1],[8.8,1.3],[8,3.1],[6,3.1]],'#2a201c');rr(c,10.2,1.3,1.1,2.5,'#f2ecdd');rr(c,8.9,1.5,.7,1.2,'#f2ecdd');rr(c,11.4,1.5,.6,1,'#f2ecdd');seg(c,6.4,-.4,11.8,-1.1,.9,'#1a1410');c.translate(0,-qv);}
 else{poly(c,[[6,1],[12,1],[11.6,3.2],[9.2,4.2],[6.9,3.9],[6,2.9]],shadeHex(mz,.85));seg(c,6.4,1.1,11.8,1,.6,'#1a1410');}// enge Lefzen
 if(o.drool&&!dead)rr(c,7.2,4,.5,2.2+Math.sin(t*3)*1.3,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.4,6.4,1.4*mb+.4,'#7d1a12');rr(c,9,3.2,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,11,3,.9,1+mb*4,'#8f2017');rr(c,7,4.4,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,3.3,-4.9,5.2,-4.7,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.7,-5.7,1,1.6,'#e9e2d0');rr(c,3.3,-5.6,1.9,1.6,'#140e0a');rr(c,4.4,-5.4,.7,.6,(o.lips||0)>.6?'#e9d27a':'#5a3a20');seg(c,2.6,-6.3,5.8,-6.5-(o.lips>.6?.5:0),.7,shade);}// runde dunkle Augen
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,7.6,3.2,9,1.6,'#e7dcc2');disk(c,7.6,4,1.4,'#e7dcc2');disk(c,16.6,4,1.4,'#e7dcc2');rr(c,8.6,4.4,7,.6,'#b8ab8c');}}
// ---- Kopf des Boxers: würfeliger Kopf, Stirnfalten, sehr kurze breite nach oben gerichtete Schnauze, Vorbiss (Unterkiefer steht vor), schwarze Maske, gepolsterte Lefzen; oft weiße Blesse; kupierte Stehohren oder hoch angesetzte Kippohren
function headBXR(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,mask=A.mask,D=d.dog,ps=(D?.seed||0)%9973,sd=ps%113,blaze=hrand(ps*.43)<.4;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 if(A.earCut)poly(c,[[-3.4,-8.2],[-2.2-ear*1.2,-15.2+ear*1],[-.6-ear*.4,-14.4+ear*.9],[.6,-8.6]],base);// kupiert: lange spitze Stehohren
 poly(c,[[-6,-5.2],[-4.2,-9],[1,-10.2],[5.2,-9.4],[7.4,-6.6],[7.6,2.4],[3.4,5.8],[-2.8,5.8],[-6.4,2.4]],base);
 if(col.stripe)for(let i=0;i<4;i++){const x=-4.4+i*1.6+hrand(i+sd)*.5;seg(c,x,-7.6+hrand(i*3+sd),x-1,-1+hrand(i*5+sd)*2,.55,col.stripe+'80');}
 seg(c,-3.4,-9.7,4.4,-10,1,light);
 for(let i=0;i<3;i++)seg(c,.2+i*.2,-8.8+i*1.05,4.6-i*.2,-9+i*1.05-((o.lips||0)>.6?.4:0),.55,shade+((o.lips||0)>.6?'':'99'));// Stirnfalten
 if(blaze)poly(c,[[4.2,-9.6],[6.2,-9.4],[7.4,-6.4],[6.8,-4],[5.8,-6.4]],'#ece4d4');// weiße Blesse
 poly(c,[[-3.8,.2],[3.2,-.6],[4.6,5.4],[-2.4,5.8]],shade+'a0');seg(c,-2.6,.8,2.8,.2,.8,light+'a0');
 poly(c,[[3.6,-7.2],[7.6,-6.8],[7.6,-.2],[4.2,-1.8]],mask+'c0');
 const jaw=o.jaw||0,jA=jaw*.6,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(4.6,2.8);c.rotate(jA);poly(c,[[-1.2,-.2],[7.2,-.8],[7.4,2.4],[6.2,3.6],[-.4,4]],mask);rr(c,6.4,-.6,1,2.6,'#2a1d18');if(jaw>.2){rr(c,4.4,-.4,.8,.8,'#f0eadb');rr(c,2.8,-.3,.8,.8,'#f0eadb');rr(c,1,0,4.8,.9,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.3,5.4,1.5,'#c8606a');if(o.tongue>.6)rr(c,5.4,1.1,2.2,2.6+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.7,6.2*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.4,-6.6],[9.4,-6.8],[10.6,-5.8],[11,-3.4],[10.8,.8],[9.8,1.6],[6.4,2.2]],mask);seg(c,7,-6,9.8,-6.2,.8,'#4a3a30');seg(c,7.2,-4.4,10.4,-4.2,.5,'#33261f');// sehr kurze, nach oben gerichtete Schnauze
 poly(c,[[9.4,-8],[11.2,-8.2],[11.8,-6.7],[11.4,-5.3],[9.6,-5.5]],'#0d0907');rr(c,10.6,-7.8,.9,.8,'#5a4f49');if(o.sniff)rr(c,11.3,-6.2+Math.sin(t*34)*.3,.8,.8,'#2a2420');// Nase höher als der Nasenrücken
 if(o.lick>.05)poly(c,[[9.6,1.2],[11.4,1.2],[12,1.2-3.2*o.lick],[10.6,1.2-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.2+i*1,-6.6,7.9+i*1,-5.4,.5,'#2a1d18');}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6.2,1.1],[8.2,1.2],[7.6,2.9],[6.2,2.9]],mask);rr(c,9.2,1.2,1,2.3,'#f2ecdd');rr(c,8.1,1.4,.7,1.1,'#f2ecdd');rr(c,10.2,1.4,.6,.9,'#f2ecdd');seg(c,6.6,-.4,10.6,-1,.9,'#1a1410');c.translate(0,-qv);}
 else{poly(c,[[6.4,1],[10.8,1],[10.6,3.4],[9.2,4.8],[7.2,4.8],[6.4,4]],mask);seg(c,7.4,4.4,10,3.6,.5,'#3e2f27');}// gepolsterte Lefzen
 {c.save();c.translate(4.6,2.8);c.rotate(jA);rr(c,6.1,-1.9,.9,2,'#f0eadb');rr(c,4.7,-1.4,.8,1.5,'#f0eadb');c.restore();}// Vorbiss
 if(o.drool&&!dead)rr(c,7.2,4.8,.5,2.4+Math.sin(t*3)*1.4,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6.2,1.4,5,1.4*mb+.4,'#7d1a12');rr(c,8.6,3.4,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,10,3,.9,1+mb*4,'#8f2017');rr(c,7,4.6,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,3.3,-4.8,5.2,-4.6,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.7,-5.6,1,1.5,'#e9e2d0');rr(c,3.3,-5.5,1.9,1.5,'#140e0a');rr(c,4.4,-5.3,.7,.6,(o.lips||0)>.6?'#e9d27a':'#6a4426');seg(c,2.6,-6.2,5.8,-6.4-(o.lips>.6?.5:0),.7,shade);}
 if(!A.earCut){poly(c,[[-3.8-ear*.8,-9],[-.4-ear*1.2,-9.8],[-.8-ear*2.2,-5.4-ear*1.6],[-2.8-ear*2.2,-5-ear*1.2]],shade);seg(c,-3.4-ear*.8,-8.8,-.6-ear*1.2,-9.6,.6,base);}// hoch angesetztes Kippohr
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,7,3.6,9,1.6,'#e7dcc2');disk(c,7,4.4,1.4,'#e7dcc2');disk(c,16,4.4,1.4,'#e7dcc2');rr(c,8,4.8,7,.6,'#b8ab8c');}}
// ---- Kopf des Malinois: schmaler, fein gemeißelter Kopf, schwarze Maske über Schnauze und um die Augen, enge Lefzen, mandelförmige braune Augen, große schwarze dreieckige Stehohren, hoch angesetzt
function headML(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,mask=A.mask;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-3.4,-7.6],[-2-ear*2.6,-15.6+ear*5],[1.2-ear*1.4,-8.8]],mask);poly(c,[[-2.4,-8.4],[-1.8-ear*2.2,-13.6+ear*4.4],[.2-ear*1.2,-9]],'#4a3a2e');// große schwarze Stehohren
 poly(c,[[-5.6,-4.4],[-3.8,-7.8],[1,-8.8],[4.8,-8.2],[7.2,-5.8],[7.4,1.6],[3.2,4.6],[-2.8,4.6],[-6,1.8]],base);// schmaler Kopf
 seg(c,-2.8,-8.3,4,-8.5,.9,light);for(let i=0;i<4;i++){const x=-3+i*1.8;seg(c,x,-7.8,x-.6,-6.6,.5,dark+'aa');}// schwarze Haarspitzen (überflammt)
 poly(c,[[2.6,-6.8],[7.2,-6.4],[7.4,-.4],[3.8,-1.6],[2.2,-3.6]],mask+'d0');// Maske um die Augen
 const jaw=o.jaw||0,jA=jaw*.66,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.2,1.9);c.rotate(jA);poly(c,[[-1,0],[8,0],[7.8,1.7],[0,2.6]],mask);
 if(jaw>.2){rr(c,6.8,-.9,.9,1.5,'#f0eadb');rr(c,4.6,-.5,.8,.8,'#f0eadb');rr(c,2.7,-.5,.8,.8,'#f0eadb');rr(c,1,0,5.2,.8,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,6.2,1.3,'#c8606a');if(o.tongue>.6)rr(c,6.4,1,1.8,2.4+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2,7*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6,-5.4],[11,-4.7],[12.8,-3.6],[13.4,-2],[13.2,.8],[12,1.4],[6,1.9]],mask);seg(c,6.8,-4.8,11.4,-4.2,.8,'#3a2e26');seg(c,7.2,-3.1,12.4,-2.7,.5,'#2a201a');// schwarze Schnauze
 poly(c,[[12,-4.8],[13.6,-4.5],[14.2,-3.3],[13.8,-2.2],[12.2,-2.4]],'#0d0907');rr(c,13,-4.3,.8,.6,'#5a4f49');if(o.sniff)rr(c,13.7,-3.1+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[11.8,1],[13.6,1],[14.2,1-3.2*o.lick],[12.8,1-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<4;i++)seg(c,7+i*1.3,-5.2+i*.2,7.6+i*1.3,-4+i*.2,.5,'#3a2e26');seg(c,4.4,-6.2,6.4,-6.6,.5,shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1],[9.2,1.1],[8.4,2.6],[6,2.6]],'#2a201c');rr(c,11.4,1,.9,2.5,'#f2ecdd');rr(c,10,1.2,.7,1.3,'#f2ecdd');rr(c,12.6,1.2,.6,1.1,'#f2ecdd');seg(c,6.4,-.6,13,-1,.8,'#140e0b');c.translate(0,-qv);}
 else{poly(c,[[6,1],[13,1],[12.4,2.6],[9.2,3.4],[6.8,3.2],[6,2.6]],mask);seg(c,7.6,3,12,2.2,.5,'#2a201a');}// enge Lefzen
 if(o.drool&&!dead)rr(c,7.4,3.4,.5,2+Math.sin(t*3)*1.2,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.2,7.4,1.4*mb+.4,'#7d1a12');rr(c,9.2,2.6,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,11.8,2.4,.9,1+mb*4,'#8f2017');rr(c,7.4,3.6,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,3,-4.7,5.2,-4.4,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.4,-5.4,1,1.3,'#e9e2d0');poly(c,[[3,-5.3],[5.4,-5.3],[5.1,-4],[3.3,-3.9]],'#0d0907');rr(c,4.2,-5.1,.7,.5,(o.lips||0)>.6?'#e9d27a':'#8a5a2c');}// mandelförmiges Auge
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,8.6,2.6,9,1.6,'#e7dcc2');disk(c,8.6,3.4,1.4,'#e7dcc2');disk(c,17.6,3.4,1.4,'#e7dcc2');rr(c,9.6,3.8,7,.6,'#b8ab8c');}}
// ---- Kopf des Deutschen Schäferhunds: keilförmiger Kopf, dunkle Stirn und Maske, helle (lohfarbene) Backen, mittellange Schnauze, enge Lefzen, mandelförmige Augen, große spitze Stehohren (nie kupiert)
function headSH(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,sad=col.saddle||dark,bel=col.belly||light;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-3.8,-7.8],[-2.6-ear*2.6,-16.2+ear*5],[.8-ear*1.4,-9]],sad);poly(c,[[-2.8,-8.6],[-2.4-ear*2.2,-14.2+ear*4.4],[-.2-ear*1.2,-9.2]],shade);// große spitze Stehohren (bei Angst flach angelegt)
 poly(c,[[-6,-4.6],[-4.2,-8],[1,-9.2],[5,-8.4],[7.4,-5.8],[7.6,1.8],[3.2,5],[-3,5],[-6.4,2]],base);
 seg(c,-3.2,-8.5,4.2,-8.7,.9,sad);poly(c,[[-1.4,-8.6],[4.6,-8.4],[6.4,-6.6],[2.4,-5.6]],sad+'d0');// dunkle Stirn
 poly(c,[[-4.4,-1],[2.4,-1.8],[4.8,4.8],[-2.4,5]],bel+'d0');seg(c,-5.6,-3,-5.2,2.6,1,light);// helle Backen
 const jaw=o.jaw||0,jA=jaw*.66,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.4,1.9);c.rotate(jA);poly(c,[[-1,0],[8.2,0],[8,1.7],[0,2.6]],sad);
 if(jaw>.2){rr(c,7,-.9,.9,1.5,'#f0eadb');rr(c,4.8,-.5,.8,.8,'#f0eadb');rr(c,2.8,-.5,.8,.8,'#f0eadb');rr(c,1,0,5.4,.8,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,6.4,1.3,'#c8606a');if(o.tongue>.6)rr(c,6.6,1,1.8,2.4+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2,7.2*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6,-5.6],[11.2,-4.9],[13,-3.8],[13.6,-2.1],[13.4,.8],[12.2,1.4],[6,2]],sad);seg(c,6.8,-5,11.6,-4.4,.8,shadeHex(sad,1.6));seg(c,7.2,-3.2,12.6,-2.8,.5,shadeHex(sad,.8));// Schnauze mit dunkler Maske
 poly(c,[[12.2,-5],[13.8,-4.7],[14.4,-3.5],[14,-2.4],[12.4,-2.6]],'#0d0907');rr(c,13.2,-4.5,.8,.6,'#5a4f49');if(o.sniff)rr(c,13.9,-3.3+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[12,1],[13.8,1],[14.4,1-3.2*o.lick],[13,1-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<4;i++)seg(c,7+i*1.3,-5.4+i*.2,7.6+i*1.3,-4.2+i*.2,.5,shadeHex(sad,1.4));seg(c,4.4,-6.4,6.4,-6.8,.5,sad);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1],[9.4,1.1],[8.6,2.6],[6,2.6]],'#2a201c');rr(c,11.6,1,.9,2.5,'#f2ecdd');rr(c,10.2,1.2,.7,1.3,'#f2ecdd');rr(c,12.8,1.2,.6,1.1,'#f2ecdd');seg(c,6.4,-.6,13.2,-1,.8,'#1a1410');c.translate(0,-qv);}
 else{poly(c,[[6,1],[13.2,1],[12.6,2.6],[9.4,3.4],[6.8,3.2],[6,2.6]],shadeHex(sad,1.3));seg(c,6.4,1.1,13,1,.6,'#1a1410');}// enge Lefzen
 if(o.drool&&!dead)rr(c,7.4,3.4,.5,2+Math.sin(t*3)*1.2,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.2,7.6,1.4*mb+.4,'#7d1a12');rr(c,9.4,2.6,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,12,2.4,.9,1+mb*4,'#8f2017');rr(c,7.4,3.6,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,3,-4.7,5.2,-4.4,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.4,-5.4,1,1.3,'#e9e2d0');poly(c,[[3,-5.3],[5.4,-5.3],[5.1,-4],[3.3,-3.9]],'#0d0907');rr(c,4.2,-5.1,.7,.5,(o.lips||0)>.6?'#e9d27a':'#7a4c28');seg(c,2.6,-6.1,5.8,-6.1-(o.lips>.6?.6:0),.6,bel);}// mandelförmiges Auge, helle Braue
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,8.8,2.6,9,1.6,'#e7dcc2');disk(c,8.8,3.4,1.4,'#e7dcc2');disk(c,17.8,3.4,1.4,'#e7dcc2');rr(c,9.8,3.8,7,.6,'#b8ab8c');}}
// ---- Kopf des Dobermanns: langer keilförmiger Kopf, flacher Schädel, rostrote Schnauze und Backen, rostrote Brauenpunkte, enge Lefzen, mandelförmige dunkle Augen, kupierte hohe Stehohren oder Hängeohren
function headDB(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,tan=col.tan||'#a85a2c',tanD=shadeHex(tan,.75),tanL=shadeHex(tan,1.15),brown=A.coat==='braunrot',nose=brown?'#4a2214':A.coat==='blau'?'#3a3c40':'#0d0907';
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 if(A.earCut){poly(c,[[-3.6,-8.2],[-2.8-ear*1.6,-16.4+ear*1.6],[-1-ear*.6,-15.6+ear*1.4],[.4,-8.6]],base);seg(c,-2.6,-9,-2.2-ear*1.2,-14.6+ear*1.4,.6,shade);}// kupiert: hohe spitze Stehohren
 poly(c,[[-5.8,-4.4],[-4,-8],[1,-9],[5,-8.4],[7.4,-6],[7.6,1.8],[3.2,4.8],[-3,4.8],[-6.2,1.8]],base);// flacher Schädel
 seg(c,-3,-8.5,4.2,-8.7,.9,light);
 poly(c,[[1.4,.4],[5.6,-.2],[6.6,3.6],[2.4,4.4]],tanD);// rostrote Backen
 const jaw=o.jaw||0,jA=jaw*.66,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.4,1.9);c.rotate(jA);poly(c,[[-1,0],[8.4,0],[8.2,1.7],[0,2.6]],tanD);
 if(jaw>.2){rr(c,7.2,-.9,.9,1.5,'#f0eadb');rr(c,5,-.5,.8,.8,'#f0eadb');rr(c,3,-.5,.8,.8,'#f0eadb');rr(c,1,0,5.6,.8,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,6.6,1.3,'#c8606a');if(o.tongue>.6)rr(c,6.8,1,1.8,2.4+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2,7.4*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6,-5.6],[11.4,-4.8],[13.4,-3.6],[14,-2],[13.8,.8],[12.4,1.4],[6,2]],tan);seg(c,6.8,-5,11.8,-4.4,.8,tanL);seg(c,7.2,-3.2,13,-2.8,.5,tanD);// lange keilförmige rostrote Schnauze
 poly(c,[[5.8,-6],[9,-5.4],[8.4,-3.6],[6,-3.2]],base);// dunkler Nasenrücken-Ansatz
 poly(c,[[12.6,-4.9],[14.2,-4.6],[14.8,-3.4],[14.4,-2.3],[12.8,-2.5]],nose);rr(c,13.6,-4.4,.8,.6,'#6a5a52');if(o.sniff)rr(c,14.3,-3.2+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[12.4,1],[14.2,1],[14.8,1-3.2*o.lick],[13.4,1-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<4;i++)seg(c,7+i*1.3,-5.4+i*.2,7.6+i*1.3,-4.2+i*.2,.5,tanD);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1],[9.4,1.1],[8.6,2.6],[6,2.6]],'#2a1810');rr(c,12,1,.9,2.5,'#f2ecdd');rr(c,10.6,1.2,.7,1.3,'#f2ecdd');rr(c,13.2,1.2,.6,1.1,'#f2ecdd');seg(c,6.4,-.6,13.6,-1,.8,'#1a1410');c.translate(0,-qv);}
 else{poly(c,[[6,1],[13.6,1],[13,2.6],[9.4,3.4],[6.8,3.2],[6,2.6]],tanD);seg(c,6.4,1.1,13.4,1,.6,'#1a1410');}// enge Lefzen
 if(o.drool&&!dead)rr(c,7.4,3.4,.5,2+Math.sin(t*3)*1.2,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.2,8,1.4*mb+.4,'#7d1a12');rr(c,9.4,2.6,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,12.4,2.4,.9,1+mb*4,'#8f2017');rr(c,7.4,3.6,.9,1+mb*3,'#7d1a12');}}
 disk(c,3.9,-6.6,.9,tan);// Brauenpunkt
 if(dead||o.blink)seg(c,3.2,-4.7,5.2,-4.5,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.6,-5.4,1,1.3,'#e9e2d0');poly(c,[[3,-5.3],[5.4,-5.4],[5.2,-4.2],[3.4,-4]],'#0d0907');rr(c,4.3,-5.1,.7,.5,(o.lips||0)>.6?'#e9d27a':(brown?'#9a6a3a':'#6a4426'));}// mandelförmiges Auge
 if(!A.earCut){poly(c,[[-3.6-ear,-8.4],[.2-ear*1.4,-9],[-.2-ear*2.6,-4.2-ear*2],[-2.4-ear*2.4,-4.8-ear*1.4]],shade);seg(c,-3.2-ear,-8.2,0-ear*1.4,-8.8,.6,base);}// Hängeohr
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,9,2.6,9,1.6,'#e7dcc2');disk(c,9,3.4,1.4,'#e7dcc2');disk(c,18,3.4,1.4,'#e7dcc2');rr(c,10,3.8,7,.6,'#b8ab8c');}}
// ---- Kopf des Akita Inu: breiter flacher Schädel, dicke Fellbacken mit Urajiro (weiß an Backen, Schnauzenseiten und Kehle), mittellange kräftige Schnauze, kleine tiefliegende dreieckige Augen, kleine dreieckige Stehohren nach vorn geneigt
function headAK(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,D=d.dog,sd=(D?.seed||0)%109,bel=col.belly||light;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-3.2,-8.6],[-.6-ear*2.6,-14.6+ear*4.6],[2-ear*1.4,-9.4]],base);poly(c,[[-2.2,-9.2],[-.6-ear*2.2,-13+ear*4],[1-ear*1.2,-9.6]],shadeHex(base,.8));// kleine dreieckige Stehohren, nach vorn geneigt (bei Angst angelegt)
 poly(c,[[-7,-4.4],[-5,-8.6],[.8,-9.8],[5,-9],[7.4,-6.2],[7.6,2.2],[3.4,6.2],[-3.4,6.4],[-7.4,2.6]],base);// breiter Kopf, volle Fellbacken
 if(col.stripe)for(let i=0;i<5;i++){const x=-4.6+i*1.6+hrand(i+sd)*.5;seg(c,x,-8.6+hrand(i*3+sd),x-.6,-6+hrand(i*5+sd),.5,col.stripe+'90');}// Sesam/Stromung auf dem Scheitel
 seg(c,-3.4,-9.2,4.4,-9.4,.9,light);
 poly(c,[[-6.4,-1],[-1,-2.4],[3.6,-1.4],[5,4.4],[2.6,6.2],[-3.4,6.4],[-7,3]],bel);for(let i=0;i<4;i++)seg(c,-7.2+i*.7,1.6+i*.9,-8.6+i*.6,3.4+i*.8,.8,bel);// Urajiro an Backen und Kehle, Fellkrause
 const jaw=o.jaw||0,jA=jaw*.64,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.4,2.2);c.rotate(jA);poly(c,[[-1,0],[7.2,0],[7,1.9],[0,2.8]],bel);rr(c,0,2.1,6.6,.5,shadeHex(bel,.75));
 if(jaw>.2){rr(c,6,-.9,.9,1.4,'#f0eadb');rr(c,4,-.5,.8,.8,'#f0eadb');rr(c,2.2,-.5,.8,.8,'#f0eadb');rr(c,1,0,4.8,.8,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,5.8,1.4,'#c8606a');if(o.tongue>.6)rr(c,6,1,2,2.4+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.2,6.6*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6,-6],[10.4,-5.6],[11.8,-4.6],[12.4,-2.6],[12.2,1],[11,1.8],[6,2.2]],base);seg(c,6.8,-5.4,10.8,-5,.8,light);poly(c,[[6.6,-2.4],[12.2,-1.8],[12,1],[11,1.8],[6.4,2]],bel);// kräftige Schnauze, Seiten weiß
 poly(c,[[10.6,-6.4],[12.4,-6.4],[13.1,-5],[12.7,-3.7],[10.8,-3.9]],'#0d0907');rr(c,11.8,-6,.8,.7,'#5a4f49');if(o.sniff)rr(c,12.5,-4.6+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[10.6,1],[12.4,1],[13,1-3.2*o.lick],[11.6,1-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.2+i*1.3,-5.8,7.9+i*1.3,-4.6,.5,shade);seg(c,4.6,-6.8,6.4,-7.2,.5,shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1],[8.8,1.1],[8,2.7],[6,2.7]],'#2a201c');rr(c,10.4,1,.9,2.4,'#f2ecdd');rr(c,9.1,1.2,.7,1.2,'#f2ecdd');rr(c,11.6,1.2,.6,1,'#f2ecdd');seg(c,6.4,-.5,12,-1,.8,'#1a1410');c.translate(0,-qv);}
 else{poly(c,[[6,1],[12.2,1],[11.6,2.8],[9,3.6],[6.8,3.4],[6,2.7]],bel);seg(c,6.4,1.1,12,1,.6,'#1a1410');}// enge schwarze Lefzenlinie
 if(o.drool&&!dead)rr(c,7.2,3.6,.5,2+Math.sin(t*3)*1.2,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.2,6.6,1.4*mb+.4,'#7d1a12');rr(c,9,2.8,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,11.2,2.6,.9,1+mb*4,'#8f2017');rr(c,7.2,3.8,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,3.3,-4.8,5.1,-4.5,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.8,-5.4,1,1.2,'#e9e2d0');poly(c,[[3.2,-5.4],[5.3,-5.4],[4.6,-4.2]],'#0d0907');rr(c,4.2,-5.2,.5,.5,(o.lips||0)>.6?'#e9d27a':'#6a4426');}// kleines tiefliegendes Dreiecksauge
 seg(c,2.8,-6.2,5.8,-6.3-(o.lips>.6?.5:0),.7,bel);// helle Braue
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,7.8,3,9,1.6,'#e7dcc2');disk(c,7.8,3.8,1.4,'#e7dcc2');disk(c,16.8,3.8,1.4,'#e7dcc2');rr(c,8.8,4.2,7,.6,'#b8ab8c');}}
// ---- Kopf des Rhodesian Ridgeback: flacher breiter Schädel, lange tiefe Schnauze (manchmal dunkel), schwarze oder leberbraune Nase, enge Lefzen, runde helle Augen, mittelgroße hoch angesetzte Hängeohren dicht am Kopf
function headRR(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,D=d.dog,ps=(D?.seed||0)%9973,dm=hrand(ps*.37)<.4,mz=dm?shadeHex(base,.6):base,liver=hrand(ps*.59)<.25,nose=liver?'#5a2e1c':'#0d0907';
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-6,-4.6],[-4.2,-8.2],[1,-9.2],[5,-8.6],[7.4,-6],[7.6,2],[3.2,5.2],[-3,5.2],[-6.4,2]],base);// flacher Schädel
 seg(c,-3.2,-8.7,4.2,-8.9,.9,light);seg(c,1.4,-8.2,4.6,-8.4,.5,shade+'88');
 poly(c,[[-4,0],[3.2,-.8],[4.4,4.8],[-2.4,5]],shade+'90');seg(c,-2.4,.6,2.8,0,.7,light+'a0');
 const jaw=o.jaw||0,jA=jaw*.65,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.4,2);c.rotate(jA);poly(c,[[-1,0],[8.2,0],[8,1.8],[0,2.8]],shadeHex(mz,.8));
 if(jaw>.2){rr(c,7,-.9,.9,1.5,'#f0eadb');rr(c,4.8,-.5,.8,.8,'#f0eadb');rr(c,2.8,-.5,.8,.8,'#f0eadb');rr(c,1,0,5.4,.8,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,6.4,1.4,'#c8606a');if(o.tongue>.6)rr(c,6.6,1,2,2.4+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.2,7.2*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6,-5.8],[11.4,-5.2],[13.2,-4],[13.8,-2.2],[13.6,1],[12.4,1.6],[6,2]],mz);seg(c,6.8,-5.2,11.8,-4.6,.8,shadeHex(mz,1.15));seg(c,7.2,-3.4,12.8,-3,.5,shadeHex(mz,.8));// lange tiefe Schnauze
 poly(c,[[12.4,-5.4],[14.1,-5.1],[14.7,-3.8],[14.3,-2.6],[12.6,-2.8]],nose);rr(c,13.4,-4.9,.8,.6,'#6a5a52');if(o.sniff)rr(c,14.2,-3.6+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[12.2,1],[14,1],[14.6,1-3.2*o.lick],[13.2,1-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.4+i*1.4,-5.4+i*.15,8+i*1.4,-4.2+i*.15,.5,shade);seg(c,4.4,-6.6,6.4,-7,.5,shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1],[9.4,1.1],[8.6,2.7],[6,2.7]],'#3a2418');rr(c,11.6,1,.9,2.4,'#f2ecdd');rr(c,10.2,1.2,.7,1.2,'#f2ecdd');rr(c,12.8,1.2,.6,1,'#f2ecdd');seg(c,6.4,-.5,13.4,-1,.8,'#2a1a12');c.translate(0,-qv);}
 else{poly(c,[[6,1],[13.4,1],[12.8,2.8],[9.6,3.6],[6.8,3.4],[6,2.7]],mz);seg(c,6.4,1.1,13.2,1,.6,shadeHex(base,.5));}// enge Lefzen
 if(o.drool&&!dead)rr(c,7.4,3.6,.5,2+Math.sin(t*3)*1.2,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.2,7.8,1.4*mb+.4,'#7d1a12');rr(c,9.6,2.8,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,12.2,2.6,.9,1+mb*4,'#8f2017');rr(c,7.4,3.8,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,3.2,-4.6,5.2,-4.4,.6,'#1a120d');else{if(o.eyeWhite)rr(c,2.6,-5.3,1,1.5,'#e9e2d0');rr(c,3.2,-5.2,1.9,1.5,'#2a180c');rr(c,4.3,-5,.7,.6,(o.lips||0)>.6?'#e9d27a':(liver?'#c48a4a':'#a8743c'));seg(c,2.6,-6,5.6,-6.2-(o.lips>.6?.5:0),.6,shade);}// runde helle Augen (bernstein, bei leberbrauner Nase heller)
 poly(c,[[-3.6-ear*.8,-8.6],[-.2-ear*1.2,-9.2],[-.6-ear*2.2,-4-ear*1.8],[-2.6-ear*2.4,-3.6-ear*1.2]],shade);seg(c,-3.2-ear*.8,-8.4,-.4-ear*1.2,-9,.6,base);// hoch angesetztes Hängeohr, dicht am Kopf
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,8.6,2.8,9,1.6,'#e7dcc2');disk(c,8.6,3.6,1.4,'#e7dcc2');disk(c,17.6,3.6,1.4,'#e7dcc2');rr(c,9.6,4,7,.6,'#b8ab8c');}}
// ---- Kopf des Bullmastiffs: großer quadratischer Kopf, flache breite Stirn mit Falten bei Aufmerksamkeit, kurze breite tiefe Schnauze, schwarze Maske bis um die Augen, dunkle hoch angesetzte V-Ohren
function headBM(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,mask=A.mask,D=d.dog,sd=(D?.seed||0)%107,ew=shadeHex(mask,1.4);
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3),alert=Math.max(o.lips||0,o.hackle||0,(o.ears||0)<.2?.6:0);
 poly(c,[[-6.6,-5.6],[-4.8,-9.6],[1,-10.8],[5.6,-10],[7.8,-7],[8,2.8],[3.8,6.6],[-3.4,6.6],[-7,2.8]],base);// großer quadratischer Kopf
 if(col.stripe)for(let i=0;i<4;i++){const x=-4.8+i*1.7+hrand(i+sd)*.5;seg(c,x,-7.8+hrand(i*3+sd),x-1,-1+hrand(i*5+sd)*2,.55,col.stripe+'80');}
 seg(c,-3.8,-10.3,4.8,-10.6,1,light);
 for(let i=0;i<3;i++)seg(c,.4+i*.2,-9+i*1.1,4.6-i*.2,-9.2+i*1.1-alert*.4,.6,shade+(alert>.5?'':'77'));// Stirnfalten (deutlicher bei Aufmerksamkeit)
 poly(c,[[-4.4,.2],[3.4,-.6],[5,6],[-2.8,6.2]],shade+'a0');seg(c,-3,.8,3,.2,.9,light+'a0');disk(c,0,2.8,2.8,shade+'50');
 poly(c,[[2.8,-7.6],[8,-7.2],[8,-.2],[4,-1.4],[2.4,-3.6]],mask+'d0');// Maske bis um die Augen
 const jaw=o.jaw||0,jA=jaw*.6,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.2,2.6);c.rotate(jA);poly(c,[[-1,0],[6.6,0],[6.6,2.3],[0,3.3]],mask);
 if(jaw>.2){rr(c,5.4,-.9,1,1.5,'#f0eadb');rr(c,3.6,-.5,.8,.8,'#f0eadb');rr(c,2,-.5,.8,.8,'#f0eadb');rr(c,1,0,4.2,.9,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,5.2,1.5,'#c8606a');if(o.tongue>.6)rr(c,5.2,1,2.2,2.6+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.6,6*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.4,-6.6],[9.8,-6.4],[11,-5.2],[11.5,-3],[11.3,1],[10.2,1.9],[6.4,2.4]],mask);seg(c,7,-6,10.2,-5.8,.8,ew);seg(c,7.2,-4,10.8,-3.8,.5,'#33261f');// kurze breite tiefe Schnauze
 poly(c,[[10,-7.2],[11.8,-7.2],[12.4,-5.8],[12,-4.4],[10.2,-4.6]],'#0d0907');rr(c,11.1,-6.8,.9,.8,'#5a4f49');if(o.sniff)rr(c,11.8,-5.3+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[10,1.2],[11.8,1.2],[12.4,1.2-3.2*o.lick],[11,1.2-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.2+i*1.1,-6.3,7.9+i*1.1,-5.1,.5,'#2a1d18');}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6.2,1.1],[8.6,1.3],[8,3.1],[6.2,3.1]],mask);rr(c,9.6,1.3,1.1,2.5,'#f2ecdd');rr(c,8.4,1.5,.7,1.2,'#f2ecdd');rr(c,10.6,1.5,.6,1,'#f2ecdd');seg(c,6.6,-.4,11,-1.1,.9,'#1a1410');c.translate(0,-qv);}
 else{poly(c,[[6.4,1],[11.3,1],[10.9,3.6],[8.8,4.8],[6.8,4.4]],mask);seg(c,7.8,4.1,10.6,3,.5,'#3e2f27');}
 if(o.drool&&!dead)rr(c,7.2,4.6,.5,2.3+Math.sin(t*3)*1.4,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6.2,1.4,5.6,1.4*mb+.4,'#7d1a12');rr(c,8.8,3.3,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,10.4,3.1,.9,1+mb*4,'#8f2017');rr(c,7,4.7,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,3.3,-4.8,5.2,-4.6,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.7,-5.6,1,1.5,'#e9e2d0');rr(c,3.3,-5.5,1.9,1.5,'#110c09');rr(c,4.4,-5.3,.7,.6,(o.lips||0)>.6?'#e9d27a':'#8a6034');}
 poly(c,[[-4-ear*.7,-9.4],[-.2-ear*.9,-10],[-.8-ear*2,-5.2-ear*1.6],[-2.6-ear*2.2,-4.6-ear*1.2]],mask);seg(c,-3.6-ear*.7,-9.2,-.4-ear*.9,-9.8,.6,ew);// dunkle V-Ohren, hoch angesetzt
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,7.2,3.4,9,1.6,'#e7dcc2');disk(c,7.2,4.2,1.4,'#e7dcc2');disk(c,16.2,4.2,1.4,'#e7dcc2');rr(c,8.2,4.6,7,.6,'#b8ab8c');}}
// ---- Kopf der Bordeauxdogge: riesiger, sehr breiter Kopf, tiefe symmetrische Falten auf Stirn und um die Schnauze, kurze breite aufgeworfene Schnauze, Vorbiss (untere Eckzähne sichtbar), schwere Lefzen, rotbraune oder schwarze Maske, kleine Hängeohren
function headBX(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,D=d.dog,ps=(D?.seed||0)%9973,mk=hrand(ps*.47)<.6?shadeHex(base,.58):A.mask,fl=shadeHex(base,.68);
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-7,-5.8],[-5,-10],[1,-11.4],[6,-10.6],[8.2,-7.4],[8.4,3],[4.2,7.6],[-3.6,7.6],[-7.6,3.2]],base);// riesiger, sehr breiter Kopf
 seg(c,-4,-10.8,5,-11.2,1,light);
 for(let i=0;i<4;i++)seg(c,-.8+i*.3,-9.8+i*1.15,5.4-i*.2,-10.2+i*1.15-((o.lips||0)>.6?.5:0),.7,fl);seg(c,1.6,-10,2,-6.6,.7,fl);// tiefe Stirnfalten, Stirnfurche
 poly(c,[[-4.6,.2],[3.6,-.8],[5.4,7],[-3,7.2]],shade+'b0');seg(c,-3.2,1,3.2,.2,.9,light+'a0');disk(c,0,3,3,shade+'50');for(let i=0;i<2;i++)seg(c,2.6+i*1.2,-3.6,3.4+i*1.2,3.4,.6,fl);// Backen, Falten um die Schnauze
 poly(c,[[3.4,-7.6],[8.2,-7.2],[8.2,-.2],[4.2,-1.8]],mk+'c0');
 const jaw=o.jaw||0,jA=jaw*.58,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(4.8,3);c.rotate(jA);poly(c,[[-1.2,-.2],[7.2,-.8],[7.4,2.4],[6.2,3.6],[-.4,4]],mk);rr(c,6.4,-.6,1,2.6,'#2a1d18');if(jaw>.2){rr(c,4.4,-.4,.8,.8,'#f0eadb');rr(c,2.8,-.3,.8,.8,'#f0eadb');rr(c,1,0,4.8,.9,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.3,5.4,1.5,'#c8606a');if(o.tongue>.6)rr(c,5.4,1.1,2.2,2.6+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.7,6.2*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.6,-6.6],[9.6,-6.6],[10.8,-5.6],[11.2,-3.2],[11,.9],[10,1.7],[6.6,2.2]],mk);seg(c,7.2,-6,10,-6,.8,shadeHex(mk,1.3));seg(c,7.4,-4.4,10.6,-4.2,.5,shadeHex(mk,.7));// kurze breite Schnauze
 poly(c,[[9.6,-7.6],[11.4,-7.8],[12,-6.3],[11.6,-4.9],[9.8,-5.1]],'#1a1010');rr(c,10.8,-7.4,.9,.8,'#5a4a46');if(o.sniff)rr(c,11.5,-5.8+Math.sin(t*34)*.3,.8,.8,'#2a2420');// Nase aufgeworfen
 if(o.lick>.05)poly(c,[[9.8,1.2],[11.6,1.2],[12.2,1.2-3.2*o.lick],[10.8,1.2-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.4+i*1,-6.4,8.1+i*1,-5.2,.5,'#2a1d18');}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6.4,1.1],[8.4,1.2],[7.8,2.9],[6.4,2.9]],mk);rr(c,9.4,1.2,1,2.3,'#f2ecdd');rr(c,8.3,1.4,.7,1.1,'#f2ecdd');rr(c,10.4,1.4,.6,.9,'#f2ecdd');seg(c,6.8,-.4,10.8,-1,.9,'#2a1d18');c.translate(0,-qv);}
 else{const sw=dead?0:Math.sin(t*2.2+ps)*.3;poly(c,[[6.6,1],[11,1],[10.8,3.4],[9.6,5.4+sw],[7.8,5.8+sw],[6.6,4.6]],mk);seg(c,7.6,5.2+sw,10.2,4.6+sw,.6,shadeHex(mk,.6));}// schwere Lefzen
 {c.save();c.translate(4.8,3);c.rotate(jA);rr(c,6.1,-1.9,.9,2,'#f0eadb');rr(c,4.7,-1.4,.8,1.5,'#f0eadb');c.restore();}// Vorbiss: untere Eckzähne sichtbar
 if(o.drool&&!dead)rr(c,7.6,5.6,.6,2.6+Math.sin(t*3)*1.6,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6.4,1.4,5,1.4*mb+.4,'#7d1a12');rr(c,8.8,3.6,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,10.2,3.2,.9,1+mb*4,'#8f2017');rr(c,7.2,4.8,.9,1+mb*3,'#7d1a12');}}
 seg(c,2.2,-6.2+(o.lips>.6?.4:0),6,-6.5-(o.lips>.6?.6:0),1.1,fl);
 if(dead||o.blink)seg(c,3.2,-4.5,5.2,-4.3,.6,'#1a120d');else{if(o.eyeWhite)rr(c,2.6,-5.3,1,1.5,'#e9e2d0');rr(c,3.2,-5.2,2,1.5,'#140e0a');rr(c,4.3,-5,.7,.6,(o.lips||0)>.6?'#e9d27a':'#8a5a30');}
 poly(c,[[-4.2-ear*.8,-9.4],[-.8-ear*1.2,-10],[-1.2-ear*2.2,-6-ear*1.6],[-3.2-ear*2.2,-5.6-ear*1.2]],dark);seg(c,-3.8-ear*.8,-9.2,-1-ear*1.2,-9.8,.6,shade);// kleines Hängeohr
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,7,3.8,9,1.6,'#e7dcc2');disk(c,7,4.6,1.4,'#e7dcc2');disk(c,16,4.6,1.4,'#e7dcc2');rr(c,8,5,7,.6,'#b8ab8c');}}
// ---- Kopf der Tibetdogge: breiter schwerer Kopf in einer großen Löwenmähne, kurze breite eckige Schnauze, Lohfarbe an Schnauze und Brauenpunkten (bei Schwarz-Loh), tiefliegende Augen, V-förmige pelzige Hängeohren
function headTB(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,mask=A.mask,D=d.dog,sd=(D?.seed||0)%103,tan=col.tan,mz=tan||shadeHex(base,.78),mzD=shadeHex(mz,.75);
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-9.4,-3],[-7.6,-9.6],[-3,-12],[2.6,-11.6],[6,-10],[8,-6.6],[8.2,3],[4,8],[-3.6,9.4],[-9,5.6]],base);// Löwenmähne um den Kopf
 for(let i=0;i<10;i++){const a=-2.6+i*.5,h=hrand(i*3.1+sd);seg(c,-1.4+Math.cos(a)*8.2,.4+Math.sin(a)*9,-1.4+Math.cos(a)*(10+h*1.6),.4+Math.sin(a)*(10.6+h*1.6),1,h>.55?light:base);}// Mähnenzotteln
 poly(c,[[-5.6,-5],[-3.8,-8.6],[1,-9.8],[5,-9],[7.4,-6.2],[7.6,2.4],[3.4,6],[-2.8,6],[-6,2.4]],base);seg(c,-3,-9.2,4.2,-9.4,.9,light);
 poly(c,[[-4,.4],[3.2,-.4],[4.6,5.6],[-2.6,6]],shade+'b0');seg(c,-2.6,1,2.8,.4,.8,light+'90');
 if(tan){disk(c,3.9,-6.8,1,tan);poly(c,[[1.6,1],[5.6,.4],[6.6,4.6],[2.6,5.4]],shadeHex(tan,.8));}// Brauenpunkt, Backenabzeichen
 const jaw=o.jaw||0,jA=jaw*.6,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.2,2.6);c.rotate(jA);poly(c,[[-1,0],[6.8,0],[6.8,2.2],[0,3.2]],mzD);
 if(jaw>.2){rr(c,5.6,-.9,1,1.5,'#f0eadb');rr(c,3.8,-.5,.8,.8,'#f0eadb');rr(c,2.1,-.5,.8,.8,'#f0eadb');rr(c,1,0,4.4,.9,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,5.4,1.5,'#c8606a');if(o.tongue>.6)rr(c,5.4,1,2.2,2.6+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.5,6.2*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.2,-6.4],[10,-6.2],[11.3,-5],[11.8,-2.8],[11.6,1.1],[10.4,2],[6.2,2.4]],mz);seg(c,6.8,-5.8,10.4,-5.6,.8,shadeHex(mz,1.15));seg(c,7,-3.8,11,-3.6,.5,mzD);// kurze breite Schnauze
 poly(c,[[6,-6.6],[8.4,-6.2],[7.4,-4.4],[6,-3.8]],base);// Stop dunkel
 poly(c,[[10.2,-7],[12.1,-7],[12.8,-5.6],[12.4,-4.2],[10.4,-4.4]],'#0d0907');rr(c,11.4,-6.6,.9,.8,'#5a4f49');if(o.sniff)rr(c,12.1,-5.1+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[10.2,1.2],[12.1,1.2],[12.7,1.2-3.2*o.lick],[11.2,1.2-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.2+i*1.2,-6.1,7.9+i*1.2,-4.9,.5,mzD);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1.1],[8.6,1.3],[7.9,3.1],[6,3.1]],'#1a1410');rr(c,9.8,1.3,1.1,2.5,'#f2ecdd');rr(c,8.5,1.5,.7,1.2,'#f2ecdd');rr(c,10.9,1.5,.6,1,'#f2ecdd');seg(c,6.4,-.4,11.4,-1.1,.9,'#1a1410');c.translate(0,-qv);}
 else{poly(c,[[6,1],[11.6,1],[11.2,3.6],[9,4.8],[6.8,4.4],[6,3.1]],mzD);seg(c,6.4,1.1,11.4,1,.6,'#1a1410');}
 if(o.drool&&!dead)rr(c,7.2,4.5,.5,2.3+Math.sin(t*3)*1.4,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.4,6.2,1.4*mb+.4,'#7d1a12');rr(c,8.8,3.3,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,10.6,3.1,.9,1+mb*4,'#8f2017');rr(c,7,4.6,.9,1+mb*3,'#7d1a12');}}
 seg(c,2.4,-6.1+(o.lips>.6?.4:0),5.8,-6.3-(o.lips>.6?.6:0),1,light);
 if(dead||o.blink)seg(c,3.3,-4.6,5.1,-4.4,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.8,-5.3,1,1.4,'#e9e2d0');rr(c,3.4,-5.2,1.7,1.4,'#0d0907');rr(c,4.3,-5,.7,.6,(o.lips||0)>.6?'#e9d27a':'#7a5230');}// tiefliegendes Auge
 poly(c,[[-4.4-ear,-8.6],[-.2-ear*1.6,-9.4],[-.8-ear*3,-2.6-ear*2.6],[-3.2-ear*3,-2-ear*2],[-5-ear*2.4,-4.6-ear*1.4]],shade);for(let i=0;i<3;i++)seg(c,-4.4-ear*2.6+i*1.2,-2.6-ear*2.2,-4.8-ear*2.6+i*1.2,-1-ear*2.2,.6,base);// pelziges V-Hängeohr mit Fransen
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,7.4,3.4,9,1.6,'#e7dcc2');disk(c,7.4,4.2,1.4,'#e7dcc2');disk(c,16.4,4.2,1.4,'#e7dcc2');rr(c,8.4,4.6,7,.6,'#b8ab8c');}}
// ---- Kopf des Mastino Napoletano: riesiger Kopf voller tiefer Falten (Stirn, über den Augen, Backen bis zum Kiefer), kurze breite Schnauze, sehr schwere Hängelefzen, hängende Lider mit rotem Unterlid, Wamme in Lagen, kleine Dreiecks-Hängeohren oder kupiert
function headMN(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,D=d.dog,sd=(D?.seed||0)%101,mk=shadeHex(base,.62),fl=shadeHex(base,.7);
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 if(A.earCut)poly(c,[[-4,-8.8],[-3-ear*.5,-11.8+ear*.4],[-1.4,-11.4+ear*.4],[-.2,-9.2]],dark);
 poly(c,[[-7,-5.6],[-5,-9.6],[.8,-11],[5.6,-10.2],[8,-7],[8.2,3],[4,8.2],[-3.4,8.4],[-7.4,3.4]],base);// riesiger Kopf, Backen hängen tief
 seg(c,-3.8,-10.4,4.8,-10.7,1,light);
 for(let i=0;i<4;i++)seg(c,-1.4+i*.4,-9.4+i*1.1,5-i*.1,-9.8+i*1.15-((o.lips||0)>.6?.5:0),.7,fl);// tiefe Stirnfalten
 seg(c,1.6,-6.2,6.4,-6.8,.9,fl);seg(c,1.8,-5.6,6.2,-6.2,.5,light+'70');// Falte über den Augen
 poly(c,[[-4.6,.2],[3.6,-.8],[5.6,7.6],[-3,8]],shade+'b0');for(let i=0;i<4;i++){seg(c,-3.8+i*.3,1.4+i*1.7,4.6+i*.3,.6+i*1.8,.7,fl);seg(c,-3.6+i*.3,.9+i*1.7,4.4+i*.3,.1+i*1.8,.4,light+'60');}// Backenfalten bis zum Kiefer
 const jaw=o.jaw||0,jA=jaw*.58,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.4,3);c.rotate(jA);poly(c,[[-1,0],[7.2,0],[7.2,2.2],[0,3.2]],mk);
 if(jaw>.2){rr(c,6,-.9,1,1.5,'#f0eadb');rr(c,4,-.5,.8,.8,'#f0eadb');rr(c,2.2,-.5,.8,.8,'#f0eadb');rr(c,1,0,4.8,.9,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,6,1.6,'#c8606a');if(o.tongue>.6)rr(c,6,1,2.2,2.8+o.tongue*2.8,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.5,6.8*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.4,-6.4],[10.2,-6.2],[11.6,-5],[12.2,-2.8],[12,1.2],[10.8,2.2],[6.4,2.6]],mk);seg(c,7,-5.8,10.6,-5.6,.8,shadeHex(base,.85));for(let i=0;i<2;i++)seg(c,7.4,-4.4+i*1.4,11.4,-4.2+i*1.4,.5,shadeHex(base,.45));// kurze breite faltige Schnauze
 poly(c,[[10.4,-7.2],[12.4,-7.2],[13.1,-5.7],[12.7,-4.2],[10.6,-4.4]],'#1a1616');rr(c,11.6,-6.8,.9,.8,'#5a5450');if(o.sniff)rr(c,12.4,-5.2+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[10.4,1.6],[12.4,1.6],[13,1.6-3.3*o.lick],[11.4,1.6-3.9*o.lick]],'#c8606a');
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1.4],[9,1.6],[8.2,3.6],[6,3.6]],mk);rr(c,10.4,1.6,1.1,2.5,'#f2ecdd');rr(c,9,1.8,.7,1.2,'#f2ecdd');rr(c,11.6,1.8,.7,1,'#f2ecdd');seg(c,6.4,-.2,12.2,-1,1,'#1a1414');c.translate(0,-qv);}
 else{const sw=dead?0:Math.sin(t*2+sd)*.35;poly(c,[[6,1.2],[12.2,1.2],[12.2,3.8],[11.2,6.8+sw],[9,7.8+sw],[6.8,7],[6,3.8]],mk);seg(c,7.4,6.6+sw,11,6+sw,.6,shadeHex(base,.45));seg(c,7.2,4.4,11.6,3.8,.5,shadeHex(base,.45));}// sehr schwere Hängelefzen
 if(o.drool&&!dead)rr(c,8.4,7.4,.6,3.4+Math.sin(t*3)*2,'#e6e1d6cc');else if(!dead)rr(c,9.6,7.2,.5,1.6+Math.sin(t*1.1+sd)*1,'#e6e1d6aa');// Sabber
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.6,7.2,1.4*mb+.4,'#7d1a12');rr(c,9.4,4.6,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,11.4,4,.9,1+mb*4,'#8f2017');rr(c,7.2,6,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,3.2,-4.2,5.2,-4,.6,'#1a120d');else{if(o.eyeWhite)rr(c,2.6,-4.9,1,1.2,'#e9e2d0');rr(c,3.2,-4.8,2,1.1,'#140e0a');rr(c,4.3,-4.7,.7,.5,(o.lips||0)>.6?'#e9d27a':'#8a6a48');seg(c,2.8,-5,5.6,-5.2,.8,fl);rr(c,3,-3.6,2.6,.8,'#9a3a34');}// hängendes Lid, rotes Unterlid
 if(!A.earCut){poly(c,[[-4.4-ear*.8,-9],[-1-ear*1.2,-9.6],[-1.4-ear*2.2,-5.4-ear*1.6],[-3.4-ear*2.2,-5-ear*1.2]],dark);seg(c,-4-ear*.8,-8.8,-1.2-ear*1.2,-9.4,.6,shade);}// kleines Dreiecks-Hängeohr
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,8,4,9,1.6,'#e7dcc2');disk(c,8,4.8,1.4,'#e7dcc2');disk(c,17,4.8,1.4,'#e7dcc2');rr(c,9,5.2,7,.6,'#b8ab8c');}}
// ---- Kopf des Cane Corso: breiter Schädel, leicht gewölbte Stirn mit Furche, Schnauze ein Drittel der Kopflänge, breit und eckig (wie abgeschnitten), mäßige Lefzen, dunkle Maske; kupierte Dreiecksohren oder dreieckige Hängeohren
function headCO(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,D=d.dog,sd=(D?.seed||0)%97,mk=A.coat==='falb'||A.coat==='gestromt'?A.mask:shadeHex(base,.6);
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 if(A.earCut)poly(c,[[-3.6,-8.6],[-2.4-ear*.9,-14+ear*.7],[-.6,-13.2+ear*.7],[.6,-9]],shade);// kupiert: Dreiecke, stehen
 poly(c,[[-6.4,-5.2],[-4.4,-9.2],[.9,-10.4],[5.2,-9.6],[7.4,-6.8],[7.6,2.6],[3.4,6.2],[-3.1,6.2],[-6.8,2.6]],base);
 if(col.stripe)for(let i=0;i<4;i++){const x=-4.6+i*1.7+hrand(i+sd)*.5;seg(c,x,-7.6+hrand(i*3+sd),x-1,-.8+hrand(i*5+sd)*2,.55,col.stripe+'80');}
 if(A.earCut)poly(c,[[-2.7,-9.4],[-1.9-ear*.6,-12.6+ear*.7],[-1,-12.2+ear*.7],[-.4,-9.6]],dark);
 seg(c,-3.6,-9.9,4.4,-10.2,1,light);seg(c,1.6,-9.2,2,-6.8,.6,shade);// Stirn, Furche
 poly(c,[[-4,.2],[3.2,-.6],[4.6,5.6],[-2.6,6]],shade+'a0');seg(c,-2.6,.8,2.8,.2,.8,light+'a0');disk(c,0,2.6,2.4,shade+'50');
 poly(c,[[3.6,-7.2],[7.6,-6.8],[7.6,-.4],[4.2,-1.8]],mk+'a0');
 const jaw=o.jaw||0,jA=jaw*.6,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.2,2.5);c.rotate(jA);poly(c,[[-1,0],[7,0],[7,2.2],[0,3.2]],mk);
 if(jaw>.2){rr(c,5.8,-.9,1,1.5,'#f0eadb');rr(c,3.9,-.5,.8,.8,'#f0eadb');rr(c,2.2,-.5,.8,.8,'#f0eadb');rr(c,1,0,4.6,.9,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,5.6,1.5,'#c8606a');if(o.tongue>.6)rr(c,5.6,1,2.2,2.6+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.5,6.4*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.2,-6.4],[10.6,-6.2],[11.9,-5.4],[12,-2.6],[11.9,1.2],[11,2],[6.2,2.4]],mk);seg(c,6.8,-5.8,11,-5.6,.8,shadeHex(mk,1.5));seg(c,7,-3.8,11.5,-3.6,.5,shadeHex(mk,.7));// breite eckige Schnauze, vorn wie abgeschnitten
 poly(c,[[10.6,-7],[12.4,-7],[13,-5.6],[12.6,-4.2],[10.8,-4.4]],'#0d0907');rr(c,11.7,-6.6,.9,.8,'#5a4f49');if(o.sniff)rr(c,12.4,-5.1+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[10.6,1.2],[12.4,1.2],[13,1.2-3.2*o.lick],[11.6,1.2-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.2+i*1.3,-6.1,7.9+i*1.3,-4.9,.5,'#2a1d18');seg(c,4.6,-7.2,6.4,-7.6,.5,shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1.1],[8.8,1.3],[8.1,3.1],[6,3.1]],mk);rr(c,10.2,1.3,1.1,2.5,'#f2ecdd');rr(c,8.9,1.5,.7,1.2,'#f2ecdd');rr(c,11.3,1.5,.6,1,'#f2ecdd');seg(c,6.4,-.4,11.8,-1.1,.9,'#1a1410');c.translate(0,-qv);}
 else{poly(c,[[6,1],[11.9,1],[11.6,3.6],[9.4,4.6],[7,4.3],[6,3.1]],mk);seg(c,8,3.9,11.3,2.9,.5,'#1a1410');}// mäßige Lefzen
 if(o.drool&&!dead)rr(c,7.3,4.4,.5,2.3+Math.sin(t*3)*1.4,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.4,6.6,1.4*mb+.4,'#7d1a12');rr(c,9.2,3.3,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,11.1,3.1,.9,1+mb*4,'#8f2017');rr(c,7.2,4.6,.9,1+mb*3,'#7d1a12');}}
 seg(c,2.4,-6.2+(o.lips>.6?.4:0),6,-6.5-(o.lips>.6?.6:0),1,shade);
 if(dead||o.blink)seg(c,3.3,-4.7,5.2,-4.5,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.7,-5.5,1,1.5,'#e9e2d0');rr(c,3.3,-5.4,1.9,1.5,'#110c09');rr(c,4.4,-5.2,.7,.6,(o.lips||0)>.6?'#e9d27a':'#9a6a38');}// bernsteinbraunes Auge
 if(!A.earCut){poly(c,[[-4.2-ear,-8.8],[-.2-ear*1.6,-9.4],[-.6-ear*2.8,-4.2-ear*2],[-2.8-ear*2.6,-4.8-ear*1.4]],shade);seg(c,-3.8-ear,-8.6,-.4-ear*1.6,-9.2,.6,base);}// dreieckiges Hängeohr
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,7.8,3.4,9,1.6,'#e7dcc2');disk(c,7.8,4.2,1.4,'#e7dcc2');disk(c,16.8,4.2,1.4,'#e7dcc2');rr(c,8.8,4.6,7,.6,'#b8ab8c');}}
// ---- Kopf des Boerboel: breiter kantiger Kopf, flache breite Stirn, volle Backen, kurze breite tiefe Schnauze mit schwarzer Maske (nur Schnauze und Lefzen), fleischige aber nicht hängende Lefzen, hoch angesetzte V-Hängeohren dicht am Kopf
function headBO(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,mask=A.mask,D=d.dog,sd=(D?.seed||0)%89;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-6.8,-5.4],[-4.8,-9.4],[1,-10.6],[5.6,-9.8],[7.8,-6.8],[8,2.8],[3.8,6.8],[-3.4,6.8],[-7.2,2.8]],base);// breiter kantiger Kopf
 if(col.stripe)for(let i=0;i<4;i++){const x=-4.8+i*1.7+hrand(i+sd)*.5;seg(c,x,-7.6+hrand(i*3+sd),x-1,-.8+hrand(i*5+sd)*2,.55,col.stripe+'80');}
 seg(c,-3.8,-10.1,4.8,-10.3,1,light);seg(c,1.4,-9.2,1.8,-6.8,.6,shade+'aa');// flache breite Stirn, Furche
 poly(c,[[-4.4,.2],[3.4,-.6],[5,6.2],[-2.8,6.4]],shade+'a0');seg(c,-3,.8,3,.2,.9,light+'a0');disk(c,0,2.8,3,shade+'50');// volle Backen
 const jaw=o.jaw||0,jA=jaw*.6,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.2,2.6);c.rotate(jA);poly(c,[[-1,0],[7,0],[7,2.3],[0,3.3]],mask);
 if(jaw>.2){rr(c,5.8,-.9,1,1.5,'#f0eadb');rr(c,3.9,-.5,.8,.8,'#f0eadb');rr(c,2.2,-.5,.8,.8,'#f0eadb');rr(c,1,0,4.6,.9,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,5.6,1.5,'#c8606a');if(o.tongue>.6)rr(c,5.6,1,2.2,2.6+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.6,6.4*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.2,-6.4],[10.2,-6.2],[11.5,-5],[12,-2.8],[11.8,1.1],[10.6,2],[6.2,2.4]],mask);seg(c,6.8,-5.8,10.6,-5.6,.8,'#4a3a30');seg(c,7,-3.8,11.2,-3.6,.5,'#33261f');// kurze breite tiefe Schnauze
 poly(c,[[10.4,-7],[12.3,-7],[13,-5.6],[12.6,-4.2],[10.6,-4.4]],'#0d0907');rr(c,11.6,-6.6,.9,.8,'#5a4f49');if(o.sniff)rr(c,12.3,-5.1+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[10.4,1.2],[12.3,1.2],[12.9,1.2-3.2*o.lick],[11.4,1.2-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.2+i*1.2,-6.1,7.9+i*1.2,-4.9,.5,'#2a1d18');seg(c,4.6,-7.2,6.4,-7.6,.5,shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1.1],[8.8,1.3],[8.1,3.2],[6,3.2]],mask);rr(c,10,1.3,1.1,2.5,'#f2ecdd');rr(c,8.7,1.5,.7,1.2,'#f2ecdd');rr(c,11.1,1.5,.7,1,'#f2ecdd');seg(c,6.4,-.4,11.6,-1.1,.9,'#2a1d18');c.translate(0,-qv);}
 else{poly(c,[[6,1],[11.8,1],[11.4,3.8],[9.2,5],[6.9,4.6],[6,3.2]],mask);seg(c,7.9,4.2,11.1,3,.5,'#3e2f27');}// fleischige Lefzen
 if(o.drool&&!dead)rr(c,7.3,4.7,.5,2.4+Math.sin(t*3)*1.4,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.4,6.4,1.4*mb+.4,'#7d1a12');rr(c,9,3.4,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,10.9,3.2,.9,1+mb*4,'#8f2017');rr(c,7.1,4.8,.9,1+mb*3,'#7d1a12');}}
 seg(c,2.4,-6.2+(o.lips>.6?.4:0),6,-6.5-(o.lips>.6?.6:0),1,shade);
 if(dead||o.blink)seg(c,3.3,-4.7,5.2,-4.5,.6,'#1a120d');else{if(o.eyeWhite)rr(c,2.7,-5.5,1,1.5,'#e9e2d0');rr(c,3.3,-5.4,1.9,1.5,'#140e0a');rr(c,4.4,-5.2,.7,.6,(o.lips||0)>.6?'#e9d27a':'#8a6034');seg(c,3,-6,5.6,-6.1,.6,mask+'90');}// dunkler Lidrand
 poly(c,[[-3.8-ear*.7,-9.4],[-.2-ear*.9,-9.8],[-.6-ear*2,-5-ear*1.6],[-2.4-ear*2.2,-4.2-ear*1.2]],shade);seg(c,-3.4-ear*.7,-9.2,-.4-ear*.9,-9.6,.6,base);// hoch angesetzte V-Hängeohren
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,7.6,3.4,9,1.6,'#e7dcc2');disk(c,7.6,4.2,1.4,'#e7dcc2');disk(c,16.6,4.2,1.4,'#e7dcc2');rr(c,8.6,4.6,7,.6,'#b8ab8c');}}
// ---- Kopf des Presa Canario: massiger, fast würfelförmiger Kopf, breiter flacher Schädel, starke Kaumuskeln, kurze breite eckige Schnauze, schwarze Maske bis über die Augen, mäßige Lefzen, kupierte Spitzohren oder Rosenohren
function headPC(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,mask=A.mask,D=d.dog,sd=(D?.seed||0)%83;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 if(A.earCut)poly(c,[[-3.8,-8.6],[-2.6-ear*.8,-13.8+ear*.6],[-1,-13.2+ear*.6],[.4,-9]],dark);
 else poly(c,[[-4.6-ear,-8.6],[-1-ear,-10],[0-ear*2,-7.6-ear],[-1.6-ear*2.6,-5.6-ear*1.6],[-3.8-ear*2.4,-6-ear]],dark);// Rosenohr
 poly(c,[[-6.8,-5.6],[-5,-9.4],[1,-10.6],[5.6,-10],[7.8,-7],[8,2.8],[3.8,6.6],[-3.4,6.6],[-7.2,2.8]],base);// würfelförmiger Kopf
 if(col.stripe)for(let i=0;i<5;i++){const x=-5.2+i*1.6+hrand(i+sd)*.5;seg(c,x,-8+hrand(i*3+sd),x-1,-1+hrand(i*5+sd)*2,.55,col.stripe+'80');}
 if(A.earCut)poly(c,[[-2.9,-9.6],[-2.1-ear*.5,-12.4+ear*.6],[-1.2,-12+ear*.6],[-.7,-9.8]],shade);
 seg(c,-3.8,-10.1,4.8,-10.4,1,light);for(let i=0;i<2;i++)seg(c,.6,-8.4+i*1.2,4.4,-8.6+i*1.2-((o.lips||0)>.6?.4:0),.55,shade+((o.lips||0)>.6?'':'88'));
 poly(c,[[-4.4,.2],[3.4,-.6],[5,6],[-2.8,6.2]],shade+'b0');seg(c,-3,.8,3,.2,.8,light+'a0');disk(c,0,2.8,2.8,shade+'60');// starke Kaumuskeln
 poly(c,[[3.2,-7.8],[8,-7.2],[8,-.2],[4.2,-1.8],[2.8,-4]],mask+'d0');// Maske bis über die Augen
 const jaw=o.jaw||0,jA=jaw*.6,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.2,2.6);c.rotate(jA);poly(c,[[-1,0],[6.6,0],[6.6,2.3],[0,3.3]],mask);
 if(jaw>.2){rr(c,5.4,-.9,1,1.5,'#f0eadb');rr(c,3.6,-.5,.8,.8,'#f0eadb');rr(c,2,-.5,.8,.8,'#f0eadb');rr(c,1,0,4.2,.9,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,5.2,1.5,'#c8606a');if(o.tongue>.6)rr(c,5.2,1,2.2,2.6+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.6,6*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.4,-6.6],[9.8,-6.4],[11,-5.2],[11.5,-3],[11.3,1],[10.2,1.9],[6.4,2.4]],mask);seg(c,7,-6,10.2,-5.8,.8,'#4a3a30');seg(c,7.2,-4,10.8,-3.8,.5,'#33261f');// kurze breite eckige Schnauze
 poly(c,[[10,-7.2],[11.8,-7.2],[12.4,-5.8],[12,-4.4],[10.2,-4.6]],'#0d0907');rr(c,11.1,-6.8,.9,.8,'#5a4f49');if(o.sniff)rr(c,11.8,-5.3+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[10,1.2],[11.8,1.2],[12.4,1.2-3.2*o.lick],[11,1.2-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.2+i*1.1,-6.3,7.9+i*1.1,-5.1,.5,'#2a1d18');seg(c,4.6,-7.4,6.4,-7.8,.5,'#3a2a20');}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6.2,1.1],[8.6,1.3],[8,3.1],[6.2,3.1]],mask);rr(c,9.6,1.3,1.1,2.5,'#f2ecdd');rr(c,8.4,1.5,.7,1.2,'#f2ecdd');rr(c,10.6,1.5,.6,1,'#f2ecdd');seg(c,6.6,-.4,11,-1.1,.9,'#2a1d18');c.translate(0,-qv);}
 else{poly(c,[[6.4,1],[11.3,1],[10.9,3.4],[8.8,4.6],[6.8,4.2]],mask);seg(c,7.8,3.9,10.6,2.9,.5,'#3e2f27');}// mäßige Lefzen
 if(o.drool&&!dead)rr(c,7.2,4.4,.5,2.3+Math.sin(t*3)*1.4,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6.2,1.4,5.6,1.4*mb+.4,'#7d1a12');rr(c,8.8,3.2,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,10.4,3,.9,1+mb*4,'#8f2017');rr(c,7,4.6,.9,1+mb*3,'#7d1a12');}}
 seg(c,2.2,-6.4+(o.lips>.6?.4:0),6,-6.7-(o.lips>.6?.6:0),1.1,shade);// schwerer Brauenwulst
 if(dead||o.blink)seg(c,3.3,-4.8,5.2,-4.6,.6,'#1a120d');else{if(o.eyeWhite)rr(c,2.7,-5.6,1,1.5,'#e9e2d0');rr(c,3.3,-5.5,1.9,1.5,'#140e0a');rr(c,4.4,-5.3,.7,.6,(o.lips||0)>.6?'#e9d27a':'#8a6034');}
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,7.2,3.4,9,1.6,'#e7dcc2');disk(c,7.2,4.2,1.4,'#e7dcc2');disk(c,16.2,4.2,1.4,'#e7dcc2');rr(c,8.2,4.6,7,.6,'#b8ab8c');}}
// ---- Kopf des Dogo Argentino: breiter gewölbter Schädel, kräftige Kaumuskeln, Schnauze so lang wie der Schädel, rosa Haut an Lefzen und Ohren, enge Lefzen, Scherengebiss, kupierte Stehohren (sonst kleine Hängeohren); selten dunkler Fleck am Auge
function headDG(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,D=d.dog,ps=(D?.seed||0)%9973,pink='#d8a49a',pinkD='#b37e74',eyeP=hrand(ps*.61)<.12;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 if(A.earCut){poly(c,[[-3.8,-8.4],[-2.6-ear*.9,-14.4+ear*.7],[-1,-13.6+ear*.7],[.4,-8.8]],base);poly(c,[[-2.8,-9.2],[-2.2-ear*.5,-12.6+ear*.7],[-1.4,-12.2+ear*.7],[-.8,-9.4]],pink);}// kupierte Stehohren, innen rosa
 poly(c,[[-6.4,-5.4],[-4.4,-9.2],[.9,-10.6],[5.2,-9.8],[7.4,-6.8],[7.6,2.6],[3.3,6.2],[-3,6.2],[-6.8,2.6]],base);// breiter, gewölbter Schädel
 if(eyeP)poly(c,[[1.8,-7.4],[5.8,-8],[7.2,-6.4],[6.6,-3],[3.6,-2.6],[1.8,-4.4]],col.patch);
 seg(c,-3.6,-10,4.4,-10.4,1,light);poly(c,[[-4,.2],[3.2,-.6],[4.6,5.6],[-2.6,6]],shade+'90');seg(c,-2.6,.8,2.8,.2,.8,light);disk(c,0,2.6,2.4,shade+'50');// Kaumuskel
 const jaw=o.jaw||0,jA=jaw*.62,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.2,2.3);c.rotate(jA);poly(c,[[-1,0],[7,0],[7,2.1],[0,3]],shade);rr(c,0,2.3,6.6,.6,pinkD);
 if(jaw>.2){rr(c,5.8,-.9,.9,1.4,'#f0eadb');rr(c,3.9,-.5,.8,.8,'#f0eadb');rr(c,2.2,-.5,.8,.8,'#f0eadb');rr(c,1,0,4.6,.8,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,5.6,1.4,'#c8606a');if(o.tongue>.6)rr(c,5.8,1,2,2.5+o.tongue*2.5,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.3,6.2*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.2,-6.4],[10.3,-6.2],[11.6,-5],[12.1,-2.8],[11.9,1],[10.8,1.8],[6.2,2.2]],base);seg(c,6.8,-5.8,10.6,-5.6,.8,light);seg(c,7,-3.8,11.2,-3.6,.5,shade);// kräftige weiße Schnauze, Nasenrücken leicht nach oben
 poly(c,[[10.4,-6.9],[12.3,-6.9],[13,-5.5],[12.6,-4.1],[10.6,-4.3]],'#14100d');rr(c,11.6,-6.5,.8,.7,'#5a4f49');if(o.sniff)rr(c,12.3,-5+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[10.4,1],[12.3,1],[12.9,1-3.2*o.lick],[11.4,1-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.2+i*1.2,-6.1,7.9+i*1.2,-4.9,.5,shade);seg(c,4.6,-7.1,6.4,-7.5,.5,shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1],[8.6,1.2],[7.9,2.9],[6,2.9]],pinkD);rr(c,10,1.2,1,2.4,'#f2ecdd');rr(c,8.8,1.4,.7,1.2,'#f2ecdd');rr(c,11.2,1.4,.6,1,'#f2ecdd');seg(c,6.4,-.4,11.6,-1.1,.9,'#3a2622');c.translate(0,-qv);}
 else{poly(c,[[6,1],[11.8,1],[11.3,2.9],[8.9,3.8],[6.7,3.6],[6,2.8]],base);seg(c,6.4,1.1,11.6,1,.6,pink);seg(c,7.6,3.3,11,2.5,.5,shade);}// enge Lefzen, rosa Rand
 if(o.drool&&!dead)rr(c,7.2,3.9,.5,2.2+Math.sin(t*3)*1.3,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.4,6,1.4*mb+.4,'#7d1a12');rr(c,8.8,3,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,10.8,3,.9,1+mb*4,'#8f2017');rr(c,6.8,4.3,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,3.3,-4.7,5.3,-4.5,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.7,-5.5,1,1.6,'#f2ece0');rr(c,3.3,-5.4,1.9,1.5,'#140e0a');rr(c,4.4,-5.2,.7,.6,(o.lips||0)>.6?'#e9d27a':'#7a5230');rr(c,3,-3.8,2.4,.5,pink);seg(c,2.7,-6.1+(o.lips>.6?.3:0),5.7,-6.3-(o.lips>.6?.5:0),.7,shade);}// dunkles Auge, rosa Lidrand
 if(!A.earCut){poly(c,[[-4-ear,-8.6],[0-ear*1.4,-9.4],[-.2-ear*2.6,-5-ear*2],[-2.8-ear*2.4,-5.8-ear*1.4]],shade);seg(c,-3.6-ear,-8.4,-.2-ear*1.4,-9.2,.6,base);}// kleines Hängeohr
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,7.6,3.2,9,1.6,'#e7dcc2');disk(c,7.6,4,1.4,'#e7dcc2');disk(c,16.6,4,1.4,'#e7dcc2');rr(c,8.6,4.4,7,.6,'#b8ab8c');}}
// ---- Kopf des Fila Brasileiro: schwerer birnenförmiger Kopf, Schädel breit, lange tiefe Schnauze, viel lose Haut (Hautfalten an Backen und Kehle), schwere Hängelefzen, tiefliegende Mandelaugen, große V-förmige Hängeohren
function headFI(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,mask=A.mask,D=d.dog,sd=(D?.seed||0)%79;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-6.4,-5],[-4.6,-8.8],[.6,-9.8],[5,-9],[7.4,-6.2],[7.8,2.8],[3.8,7.4],[-3,7.6],[-6.8,3]],base);// birnenförmig: oben schmaler, unten breite Backen
 if(col.stripe)for(let i=0;i<4;i++){const x=-4.6+i*1.7+hrand(i+sd)*.5;seg(c,x,-7.4+hrand(i*3+sd),x-1,-.6+hrand(i*5+sd)*2,.55,col.stripe+'80');}
 seg(c,-3.2,-9.3,4.2,-9.5,.9,light);
 poly(c,[[-4,.6],[3.6,-.4],[5.4,7],[-2.6,7.4]],shade+'b0');for(let i=0;i<3;i++)seg(c,-3.4+i*.3,2+i*1.7,4.2+i*.3,1.4+i*1.8,.6,dark+'aa');// lose Haut: Backenfalten
 poly(c,[[3.6,-7],[7.6,-6.6],[7.8,-.2],[4.2,-1.6]],mask+'b0');
 const jaw=o.jaw||0,jA=jaw*.6,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.4,2.6);c.rotate(jA);poly(c,[[-1,0],[7.6,0],[7.6,2.2],[0,3.2]],mask);
 if(jaw>.2){rr(c,6.4,-.9,1,1.5,'#f0eadb');rr(c,4.3,-.5,.8,.8,'#f0eadb');rr(c,2.4,-.5,.8,.8,'#f0eadb');rr(c,1,0,5,.9,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,6.2,1.6,'#c8606a');if(o.tongue>.6)rr(c,6.2,1,2.2,2.8+o.tongue*2.8,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.5,7*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.2,-6.2],[10.8,-5.9],[12.4,-4.7],[13,-2.6],[12.8,1.2],[11.6,2],[6.2,2.4]],mask);seg(c,6.8,-5.6,11.2,-5.3,.8,'#4a3a30');seg(c,7.2,-3.7,11.9,-3.5,.5,'#33261f');// lange tiefe Schnauze
 poly(c,[[11.2,-6.6],[13.1,-6.6],[13.8,-5.2],[13.4,-3.8],[11.4,-4]],'#0d0907');rr(c,12.4,-6.2,.9,.8,'#5a4f49');if(o.sniff)rr(c,13.1,-4.7+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[11.2,1.4],[13.1,1.4],[13.7,1.4-3.2*o.lick],[12.2,1.4-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.4+i*1.3,-5.9,8.1+i*1.3,-4.7,.5,'#2a1d18');seg(c,4.6,-7,6.4,-7.4,.5,shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1.2],[9.2,1.4],[8.4,3.3],[6,3.3]],mask);rr(c,10.9,1.4,1.1,2.5,'#f2ecdd');rr(c,9.5,1.6,.7,1.2,'#f2ecdd');rr(c,12.1,1.6,.7,1,'#f2ecdd');seg(c,6.4,-.4,12.8,-1.1,.9,'#2a1d18');c.translate(0,-qv);}
 else{const sw=dead?0:Math.sin(t*2.1+sd)*.3;poly(c,[[6,1],[12.8,1],[12.6,3.4],[11.4,5.8+sw],[9.2,6.6+sw],[7,5.8],[6,3.4]],mask);seg(c,7.6,5.6+sw,11.2,5+sw,.6,'#3e2f27');}// schwere Hängelefzen
 if(o.drool&&!dead)rr(c,8.6,6.4,.6,3+Math.sin(t*3)*1.8,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.4,7.4,1.4*mb+.4,'#7d1a12');rr(c,9.6,4.2,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,11.8,3.6,.9,1+mb*4,'#8f2017');rr(c,7.4,5.4,.9,1+mb*3,'#7d1a12');}}
 seg(c,2.4,-6.1+(o.lips>.6?.4:0),5.8,-6.3-(o.lips>.6?.6:0),.9,shade);
 if(dead||o.blink)seg(c,3.2,-4.4,5.2,-4.2,.6,'#1a120d');else{if(o.eyeWhite)rr(c,2.6,-5.1,1,1.4,'#e9e2d0');poly(c,[[3,-5],[5.2,-5.2],[5.4,-4],[3.4,-3.8]],'#140e0a');rr(c,4.3,-4.9,.7,.6,(o.lips||0)>.6?'#e9d27a':'#8a5a30');rr(c,3.2,-3.4,2,.5,'#8a3a34');}// tiefliegendes Mandelauge
 poly(c,[[-4.6-ear,-8.4],[.4-ear*2,-9.2],[-.2-ear*3.6,-.6-ear*3],[-2.2-ear*3.4,.6-ear*2.6],[-4.6-ear*2.8,-3-ear*2]],shade);seg(c,-4.2-ear,-8.2,0-ear*2,-9,.6,base);// große V-Hängeohren
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,8,3.6,9,1.6,'#e7dcc2');disk(c,8,4.4,1.4,'#e7dcc2');disk(c,17,4.4,1.4,'#e7dcc2');rr(c,9,4.8,7,.6,'#b8ab8c');}}
// ---- Kopf des Tosa Inu: breiter Schädel mit deutlichem Stop und Stirnfurche, mittellange kräftige eckige Schnauze, mäßige Lefzen, kleine dunkle Augen, kleine hoch angesetzte Hängeohren dicht am Kopf
function headTO(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,mask=A.mask,D=d.dog,sd=(D?.seed||0)%73,dk=shadeHex(base,.55);
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-6.6,-5.4],[-4.6,-9.2],[.8,-10.4],[5.2,-9.6],[7.6,-6.6],[7.8,2.6],[3.4,6.4],[-3.2,6.4],[-7,2.6]],base);
 seg(c,-3.4,-9.8,4.4,-10,1,light);seg(c,1.6,-9,2.2,-6.4,.6,shade);// Scheitel, Stirnfurche
 for(let i=0;i<2;i++)seg(c,.6,-8+i*1.2,4.2,-8.2+i*1.2-((o.lips||0)>.6?.4:0),.55,shade+((o.lips||0)>.6?'':'88'));// leichte Stirnfalten
 poly(c,[[-4,.2],[3.4,-.6],[4.8,5.6],[-2.6,6]],shade+'b0');seg(c,-2.8,.8,3,.2,.8,light+'a0');disk(c,.2,2.6,2.4,shade+'60');// kräftige Kaumuskeln
 poly(c,[[3.8,-7.2],[7.6,-6.8],[7.6,-.4],[4.4,-2]],dk+'b0');// dunkler Stop / Maske
 const jaw=o.jaw||0,jA=jaw*.6,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.2,2.4);c.rotate(jA);poly(c,[[-1,0],[7.2,0],[7.2,2.2],[0,3.1]],dk);
 if(jaw>.2){rr(c,6,-.9,1,1.5,'#f0eadb');rr(c,4,-.5,.8,.8,'#f0eadb');rr(c,2.2,-.5,.8,.8,'#f0eadb');rr(c,1,0,4.8,.9,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,5.8,1.5,'#c8606a');if(o.tongue>.6)rr(c,5.8,1,2.2,2.6+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.5,6.6*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.2,-6.4],[10.4,-6.2],[11.8,-5],[12.3,-2.8],[12.1,1.2],[10.9,2],[6.2,2.4]],dk);seg(c,6.8,-5.8,10.8,-5.6,.8,shadeHex(base,.75));seg(c,7,-3.8,11.4,-3.6,.5,shadeHex(base,.42));// eckige Schnauze, dunkel
 poly(c,[[10.6,-7],[12.5,-7],[13.2,-5.6],[12.8,-4.2],[10.8,-4.4]],'#0d0907');rr(c,11.8,-6.6,.9,.8,'#5a4f49');if(o.sniff)rr(c,12.5,-5.1+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[10.6,1.2],[12.5,1.2],[13.1,1.2-3.2*o.lick],[11.6,1.2-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.2+i*1.3,-6.1,7.9+i*1.3,-4.9,.5,'#2a1d18');seg(c,4.6,-7.2,6.4,-7.6,.5,shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1.1],[8.8,1.3],[8,3.1],[6,3.1]],dk);rr(c,10.2,1.3,1.1,2.5,'#f2ecdd');rr(c,8.9,1.5,.7,1.2,'#f2ecdd');rr(c,11.4,1.5,.7,1,'#f2ecdd');seg(c,6.4,-.4,12,-1.1,.9,'#2a1d18');c.translate(0,-qv);}
 else{poly(c,[[6,1],[12.1,1],[11.7,3.6],[9.4,4.9],[7,4.5],[6,3.2]],dk);seg(c,8,4,11.4,2.9,.5,'#2a1d18');}// mäßige Lefzen
 if(o.drool&&!dead)rr(c,7.4,4.6,.5,2.4+Math.sin(t*3)*1.4,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.4,6.8,1.4*mb+.4,'#7d1a12');rr(c,9.2,3.4,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,11.2,3.2,.9,1+mb*4,'#8f2017');rr(c,7.2,4.8,.9,1+mb*3,'#7d1a12');}}
 seg(c,2.4,-6.3+(o.lips>.6?.4:0),6,-6.5-(o.lips>.6?.6:0),1,shade);// kräftige Braue
 if(dead||o.blink)seg(c,3.3,-4.8,5.2,-4.6,.6,'#1a120d');else{if(o.eyeWhite)rr(c,2.8,-5.5,1,1.4,'#e9e2d0');rr(c,3.4,-5.4,1.8,1.4,'#140e0a');rr(c,4.4,-5.2,.7,.6,(o.lips||0)>.6?'#e9d27a':'#7a4c28');}// kleines dunkles Auge
 poly(c,[[-3.6-ear*.6,-9.2],[-.4-ear*.8,-9.6],[-.4-ear*1.6,-6.4-ear*1.2],[-2.4-ear*1.8,-5.6-ear*.8]],shade);seg(c,-3.2-ear*.6,-9,-.6-ear*.8,-9.4,.6,base);// kleines hoch angesetztes Hängeohr
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,7.6,3.4,9,1.6,'#e7dcc2');disk(c,7.6,4.2,1.4,'#e7dcc2');disk(c,16.6,4.2,1.4,'#e7dcc2');rr(c,8.6,4.6,7,.6,'#b8ab8c');}}
// ---- Kopf des Kaukasischen Owtscharkas: breiter Bärenkopf, dicke Fellbacken, kurze kräftige Schnauze mit dunkler Maske, kleine tiefliegende Augen im Fell, kurze kupierte oder kleine pelzige Hängeohren
function headOW(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,mask=A.mask,D=d.dog,sd=(D?.seed||0)%71;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 if(A.earCut)poly(c,[[-3.6,-8.6],[-2.6-ear*.4,-11.2+ear*.4],[-1,-11+ear*.4],[0,-8.8]],shade);// kupiert: kurze Stummel
 poly(c,[[-7.2,-4.6],[-5.2,-9],[.6,-10.6],[5.2,-9.6],[7.6,-6.6],[7.8,2.6],[3.6,7],[-3.6,7.2],[-8,3.2]],base);// breiter Kopf mit Fellkranz
 for(let i=0;i<7;i++){const a=-2.4+i*.55,h=hrand(i*3.3+sd);seg(c,-1.4+Math.cos(a)*7,1+Math.sin(a)*7.6,-1.4+Math.cos(a)*(8.6+h*1.4),1+Math.sin(a)*(9+h*1.4),.9,h>.5?light:base);}// Fellkranz (Zotteln um Kopf und Backen)
 seg(c,-3.6,-9.8,4.6,-10,1,light);for(let i=0;i<5;i++){const x=-5+i*2.2,h=hrand(i+sd);seg(c,x,-9.4+h*.6,x-1,-10.8-h,.7,i%2?light:base);}// Scheitelfell
 poly(c,[[-5,0],[2.8,-.8],[4.8,6.4],[-3.4,6.8]],light+'b0');seg(c,-3,2.6,3,2,.7,shade+'90');seg(c,-2.2,4.4,3.6,4,.7,shade+'80');// dicke Fellbacken
 poly(c,[[3.8,-7],[7.8,-6.6],[7.8,-.4],[4.4,-1.8]],mask+'90');
 const jaw=o.jaw||0,jA=jaw*.6,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5,2.6);c.rotate(jA);poly(c,[[-1,0],[7,0],[7,2.2],[0,3.2]],mask);
 if(jaw>.2){rr(c,5.8,-.9,1,1.5,'#f0eadb');rr(c,3.9,-.5,.8,.8,'#f0eadb');rr(c,2.2,-.5,.8,.8,'#f0eadb');rr(c,1,0,4.6,.9,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,5.6,1.5,'#c8606a');if(o.tongue>.6)rr(c,5.6,1,2.2,2.7+o.tongue*2.7,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.5,6.4*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.2,-6.4],[9.8,-6.2],[11.2,-5],[11.8,-2.8],[11.6,1],[10.4,1.9],[6.2,2.4]],mask);seg(c,6.8,-5.8,10.2,-5.6,.8,'#4a3a30');seg(c,7,-3.9,10.8,-3.7,.5,'#33261f');// kurze kräftige Schnauze, dunkel
 poly(c,[[10,-7],[11.9,-7],[12.6,-5.6],[12.2,-4.2],[10.2,-4.4]],'#0d0907');rr(c,11.2,-6.6,.9,.8,'#5a4f49');if(o.sniff)rr(c,12,-5.1+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[10,1.2],[11.9,1.2],[12.5,1.2-3.2*o.lick],[11,1.2-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.2+i*1.2,-6.1,7.9+i*1.2,-4.9,.5,'#2a1d18');seg(c,4.6,-7,6.4,-7.4,.5,shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1.1],[8.6,1.3],[7.9,3.1],[6,3.1]],mask);rr(c,9.8,1.3,1.1,2.5,'#f2ecdd');rr(c,8.5,1.5,.7,1.2,'#f2ecdd');rr(c,10.9,1.5,.7,1,'#f2ecdd');seg(c,6.4,-.4,11.4,-1.1,.9,'#2a1d18');c.translate(0,-qv);}
 else{poly(c,[[6,1],[11.6,1],[11.1,3.3],[8.8,4.4],[6.7,4],[6,3]],mask);seg(c,7.7,3.7,10.9,2.7,.5,'#3e2f27');}
 if(o.drool&&!dead)rr(c,7.2,4.3,.5,2.4+Math.sin(t*3)*1.4,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.4,6.2,1.4*mb+.4,'#7d1a12');rr(c,8.8,3.2,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,10.6,3,.9,1+mb*4,'#8f2017');rr(c,7,4.6,.9,1+mb*3,'#7d1a12');}}
 seg(c,2.2,-6.2+(o.lips>.6?.4:0),6,-6.4-(o.lips>.6?.6:0),1.2,light);// buschige Braue
 if(dead||o.blink)seg(c,3.3,-4.5,5.1,-4.3,.6,'#1a120d');else{if(o.eyeWhite)rr(c,2.8,-5.2,1,1.4,'#e9e2d0');rr(c,3.4,-5.1,1.6,1.3,'#140e0a');rr(c,4.3,-4.9,.6,.6,(o.lips||0)>.6?'#e9d27a':'#6a4a2c');}// kleines dunkles Auge
 if(!A.earCut){poly(c,[[-4,-8.6],[-.6-ear*1.2,-9.2],[-.6-ear*2.2,-5.4-ear*1.6],[-2.8-ear*2.2,-4.8-ear*1.2]],shade);seg(c,-3.6,-8.4,-.8-ear*1.2,-9,.6,base);}// kleines pelziges Hängeohr
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,7.6,3.4,9,1.6,'#e7dcc2');disk(c,7.6,4.2,1.4,'#e7dcc2');disk(c,16.6,4.2,1.4,'#e7dcc2');rr(c,8.6,4.6,7,.6,'#b8ab8c');}}
// ---- Kopf des Bluthunds: langer schmaler Schädel mit Hinterhauptstachel, lange tiefe lohfarbene Schnauze, lose Haut mit Stirn- und Backenfalten, schwere Hängelefzen, rotes hängendes Unterlid, sehr lange Hängeohren bis unter den Kiefer
function headBH(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,tan=col.tan||'#9a6236',tanD=shadeHex(tan,.74),tanL=shadeHex(tan,1.16),D=d.dog,sd=(D?.seed||0)%59;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 poly(c,[[-6,-4.8],[-5.4,-8.4],[-1,-9.6],[4.6,-9],[7.2,-6.4],[7.6,2.6],[3.4,6.6],[-3,6.6],[-6.4,2.4]],tanD);// Schädel (lohfarben, tief im Schatten)
 poly(c,[[-6,-6.4],[-5.4,-8.8],[-1.4,-9.8],[2.6,-9.4],[1,-7.6],[-2.8,-7]],base);// schwarze Kappe hinten am Schädel
 disk(c,-5.8,-8.6,1,base);// Hinterhauptstachel
 for(let i=0;i<4;i++)seg(c,-.6+i*.3,-8.2+i*1.15,5-i*.2,-8.6+i*1.15-(o.lips>.6?.4:0),.6,shade+'cc');// Stirnfalten (lose Haut)
 poly(c,[[-3.8,.6],[3.6,-.6],[5.6,6.4],[-2.4,7]],tan);for(let i=0;i<3;i++)seg(c,-2.6+i*.4,2+i*1.6,4.4+i*.2,1.2+i*1.7,.6,tanD);// Backen mit Falten, hängen tief
 disk(c,3.8,-6.6,.9,tanL);// Brauenpunkt
 const jaw=o.jaw||0,jA=jaw*.6,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.4,2.6);c.rotate(jA);poly(c,[[-1,0],[7.8,0],[7.8,2.2],[0,3.2]],tanD);
 if(jaw>.2){rr(c,6.6,-.9,.9,1.4,'#f0eadb');rr(c,4.4,-.5,.8,.8,'#f0eadb');rr(c,2.4,-.5,.8,.8,'#f0eadb');rr(c,1,0,5,.8,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,6.4,1.5,'#c8606a');if(o.tongue>.6)rr(c,6.4,1,2.2,2.8+o.tongue*2.8,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.5,7*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6,-5.8],[11.4,-5.4],[13,-4.4],[13.6,-2.4],[13.4,1.2],[12.2,2],[6,2.4]],tan);seg(c,6.8,-5.2,11.8,-4.8,.8,tanL);seg(c,7.2,-3.4,12.4,-3.2,.5,tanD);// lange tiefe Schnauze
 poly(c,[[11.8,-6],[13.6,-6],[14.4,-4.6],[14,-3.2],[12,-3.4]],'#0d0907');rr(c,13,-5.6,.9,.8,'#5a4f49');if(o.sniff)rr(c,13.8,-4.2+Math.sin(t*34)*.3,.9,.9,'#2a2420');// große Nase
 if(o.lick>.05)poly(c,[[11.8,1.4],[13.8,1.4],[14.4,1.4-3.2*o.lick],[12.8,1.4-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.4+i*1.4,-5.6,8.1+i*1.4,-4.4,.5,tanD);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1.2],[9.4,1.4],[8.6,3.2],[6,3.2]],'#3a2418');rr(c,11.4,1.4,1,2.3,'#f2ecdd');rr(c,10,1.6,.7,1.1,'#f2ecdd');rr(c,12.6,1.6,.6,.9,'#f2ecdd');seg(c,6.4,-.4,13,-1,.9,'#2a1a12');c.translate(0,-qv);}
 else{const sw=dead?0:Math.sin(t*2+sd)*.3;poly(c,[[6,1],[13.4,1],[13.2,3.6],[11.8,6+sw],[9.4,6.8+sw],[7.2,6],[6,3.4]],tan);seg(c,7.6,5.8+sw,11.6,5.2+sw,.6,tanD);rr(c,9.4,6+sw,1.8,.8,'#3a2418');}// schwere Hängelefzen
 if(o.drool&&!dead)rr(c,8.6,6.6,.6,3+Math.sin(t*3)*1.8,'#e6e1d6cc');else if(!dead&&hrand(sd*.41)<.5)rr(c,10,6.4,.5,1.4+Math.sin(t*1.2+sd)*.8,'#e6e1d6aa');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.4,7.6,1.4*mb+.4,'#7d1a12');rr(c,9.8,4.4,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,12,3.6,.9,1+mb*4,'#8f2017');rr(c,7.6,5.6,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,3,-4.2,5,-4,.6,'#1a120d');else{if(o.eyeWhite)rr(c,2.4,-5,1,1.6,'#e9e2d0');rr(c,3,-4.9,2,1.4,'#1b120b');rr(c,4.1,-4.7,.8,.6,(o.lips||0)>.6?'#e9d27a':'#8a5a30');rr(c,2.8,-3.5,2.6,.8,'#9a3a34');seg(c,2.6,-3,5.6,-2.6,.5,tanD);}// tiefliegendes Auge, rotes hängendes Unterlid
 seg(c,2.2,-5.8+(o.lips>.6?.3:0),5.6,-6-(o.lips>.6?.5:0),.8,tanD);
 const sw2=dead?0:Math.sin(t*2.6+sd)*.4,hang=1-cl(ear,0,1)*.45;// sehr lange Hängeohren (bei Aufmerksamkeit etwas angehoben), schwingen leicht
 const eC=shadeHex(tan,.6),eL=shadeHex(tan,.82);
 poly(c,[[-4.6,-8.2],[-1,-8.8],[.6-ear*1.4,-5],[1.2-ear*2+sw2,3*hang],[.8-ear*2.4+sw2,8.6*hang],[-.8-ear*2.6+sw2,11.4*hang],[-3-ear*2.6+sw2,11.6*hang],[-4.8-ear*2.2+sw2,8*hang],[-5.4-ear*1.6,-1.6]],eC);// sehr langes, weiches Hängeohr, dunkel lohfarben
 seg(c,-4.6,-7.4,-4.4-ear*2.2+sw2,8.4*hang,.8,eL);seg(c,-.4,-7.6,.8-ear*2+sw2,5*hang,.6,'#1d140e');for(let i=0;i<3;i++)seg(c,-4.2-ear*2+sw2*.6,-1.6+i*3.4,-.2-ear*2+sw2*.6,-.8+i*3.2,.5,'#2a1c13');seg(c,-3-ear*2.6+sw2,11.4*hang,-.8-ear*2.6+sw2,11.2*hang,.7,'#1d140e');// Kante, Falten im Ohr
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,8.6,3.6,9,1.6,'#e7dcc2');disk(c,8.6,4.4,1.4,'#e7dcc2');disk(c,17.6,4.4,1.4,'#e7dcc2');rr(c,9.6,4.8,7,.6,'#b8ab8c');}}
// ---- Kopf des Wolfs: langer schmaler Schädel, lange spitze Schnauze, helle Maske um Maul und Backen, gelbe Augen mit dunklem Strich, große Stehohren, dunkle Stirn
function headWO(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,sad=col.saddle||dark,bel=col.belly||light,SW=shapeOf(d),eF=SW.wolfEar,mz=SW.wolfMz;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 // Ohrgröße je Wolf (Polarwolf klein und rund, Äthiopischer Wolf groß), Schnauzenlänge über mz
 c.save();c.translate(-1.6,-8.4);c.scale(.85+eF*.15,eF);c.translate(1.6,8.4);
 poly(c,[[-3.6,-7.8],[-2.6-ear*2.4,-14.8+ear*4.2],[.6-ear*1.4,-9]],sad);poly(c,[[-2.8,-8.4],[-2.4-ear*2,-12.8+ear*3.6],[-.2-ear*1.2,-9.2]],eF<.8?bel:shade);if(eF<.8)disk(c,-2.4-ear*1.6,-13.2+ear*3.6,1.2,sad);c.restore();// große Stehohren (flach angelegt bei Angst); Polarwolf mit runder Spitze
 poly(c,[[-6,-4.6],[-4.2,-8],[1,-9.2],[5,-8.4],[7.4,-5.8],[7.6,1.8],[3.2,5],[-3,5],[-6.4,2]],base);
 seg(c,-3.2,-8.5,4.2,-8.7,.9,sad);seg(c,-1,-7.2,4.6,-7.6,.8,sad+'aa');// dunkle Stirn
 poly(c,[[-3.4,.6],[.6,-.6],[3.4,.4],[5,3.4],[3.2,5],[-2.6,5],[-4.6,2.6]],bel);seg(c,-2.4,.4,2.6,-.2,.7,base);seg(c,-5.6,-3,-5.2,2.6,1,light);for(let i=0;i<4;i++)seg(c,-5.8+i*.6,1+i,-7.4+i*.4,2.6+i*.9,.7,bel);// helle Backen, Backenbart
 const jaw=o.jaw||0,jA=jaw*.66,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(6,0);c.scale(mz,1);c.translate(-6,0);
 c.save();c.translate(5.4,1.9);c.rotate(jA);poly(c,[[-1,0],[8.4,0],[8.2,1.6],[0,2.6]],bel);rr(c,0,2,7.8,.5,shade);
 if(jaw>.2){rr(c,7.2,-.9,.9,1.5,'#f0eadb');rr(c,5,-.5,.8,.8,'#f0eadb');rr(c,3,-.5,.8,.8,'#f0eadb');rr(c,1,0,5.6,.8,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,6.6,1.3,'#c8606a');if(o.tongue>.6)rr(c,6.8,1,1.8,2.4+o.tongue*2.6,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2,7.4*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6,-5.6],[11.4,-4.8],[13.4,-3.6],[14,-2],[13.8,.8],[12.4,1.4],[6,2]],base);seg(c,6.8,-5,12,-4.2,.8,sad);seg(c,7.4,-.4,13.2,.2,1,bel);// lange spitze Schnauze, heller Unterkiefer
 poly(c,[[12.6,-4.9],[14.2,-4.6],[14.8,-3.4],[14.4,-2.3],[12.8,-2.5]],'#0d0907');rr(c,13.6,-4.4,.8,.6,'#5a4f49');if(o.sniff)rr(c,14.3,-3.2+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[12.4,1],[14.2,1],[14.8,1-3.2*o.lick],[13.4,1-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<4;i++)seg(c,7+i*1.3,-5.4+i*.2,7.6+i*1.3,-4.2+i*.2,.5,sad);seg(c,4.4,-6.4,6.4,-6.8,.5,sad);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1],[9.4,1.1],[8.6,2.6],[6,2.6]],'#2a201c');rr(c,12,1,.9,2.6,'#f2ecdd');rr(c,10.6,1.2,.7,1.3,'#f2ecdd');rr(c,13.2,1.2,.6,1.2,'#f2ecdd');rr(c,8.6,1.3,.6,1,'#f2ecdd');seg(c,6.4,-.6,13.6,-1,.8,'#1a1410');c.translate(0,-qv);}
 else{poly(c,[[6,1],[13.6,1],[13,2.6],[9.4,3.4],[6.8,3.2],[6,2.6]],bel);seg(c,6.4,1.1,13.4,1,.6,'#1a1410');}// enge schwarze Lefzenlinie
 if(o.drool&&!dead)rr(c,7.4,3.4,.5,2+Math.sin(t*3)*1.2,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.2,8,1.4*mb+.4,'#7d1a12');rr(c,9.4,2.6,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,12.4,2.4,.9,1+mb*4,'#8f2017');rr(c,7.4,3.6,.9,1+mb*3,'#7d1a12');}}
 c.restore();
 if(dead||o.blink)seg(c,3,-4.8,5.2,-4.4,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.4,-5.6,1,1.4,'#e9e2d0');poly(c,[[3,-5.6],[5.4,-5.2],[5,-3.8],[3.2,-4.2]],'#0d0907');rr(c,3.8,-5.2,1.2,.9,(o.lips||0)>.6?'#f2d84a':'#d8b03c');rr(c,4.1,-5,.5,.5,'#0d0907');seg(c,5.4,-4.4,7.2,-3.6,.5,'#1a1410');seg(c,2.6,-6.2,5.8,-6.1-(o.lips>.6?.6:0),.6,bel);}// schräges gelbes Auge, dunkler Augenstrich, helle Braue
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,9,2.6,9,1.6,'#e7dcc2');disk(c,9,3.4,1.4,'#e7dcc2');disk(c,18,3.4,1.4,'#e7dcc2');rr(c,10,3.8,7,.6,'#b8ab8c');}}
// ---- Kopf des Molossers: riesiger breiter Schädel mit tiefen Stirn- und Backenfalten, kurze tiefe Schnauze, schwere Hängelefzen weit unter den Unterkiefer, Augenlid hängt (rotes Unterlid), Hängeohren, gestromt
function headMO(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,mask=A.mask,D=d.dog,sd=(D?.seed||0)%67;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 if(A.earCut)poly(c,[[-4,-8.6],[-2.8-ear*.6,-12.6+ear*.5],[-1.2,-12.2+ear*.5],[.2,-9]],dark);
 poly(c,[[-6.8,-5.6],[-4.8,-9.4],[.8,-10.8],[5.4,-10],[7.8,-7],[8,2.6],[3.6,6.6],[-3.2,6.8],[-7.2,2.8]],base);// massiger Schädel
 if(col.stripe)for(let i=0;i<5;i++){const x=-5+i*1.6+hrand(i+sd)*.5;seg(c,x,-8+hrand(i*3+sd),x-1,-1+hrand(i*5+sd)*2,.55,col.stripe+'80');}// Stromung am Kopf
 seg(c,-3.6,-10,4.6,-10.3,1,light);
 const fr=Math.max(o.lips||0,o.hackle>.7?.6:0);for(let i=0;i<3;i++)seg(c,.2+i*.3,-9+i*1.1,4.6-i*.2,-9.2+i*1.1-fr*.5,.6,shade+(fr>.3?'':'99'));seg(c,1.2,-7.6,1.6,-5.4,.5,shade+'99');// Stirnfalten, Stirnfurche
 poly(c,[[-4.2,.4],[3.4,-.6],[5,6.2],[-2.8,6.6]],shade+'b0');seg(c,-3.2,1.2,3,.4,.8,light+'90');seg(c,-1.4,2.6,3.6,2.2,.6,dark+'aa');seg(c,-.6,4.2,4.2,3.8,.6,dark+'99');// Backenfalten
 poly(c,[[3.4,-7.6],[8,-7.2],[8,-.2],[4.2,-1.8]],mask+'b0');
 const jaw=o.jaw||0,jA=jaw*.6,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.2,2.6);c.rotate(jA);poly(c,[[-1,0],[7.4,0],[7.4,2.2],[0,3.2]],mask);
 if(jaw>.2){rr(c,6.2,-.9,1,1.5,'#f0eadb');rr(c,4.2,-.5,.8,.8,'#f0eadb');rr(c,2.4,-.5,.8,.8,'#f0eadb');rr(c,1,0,4.8,.9,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,6,1.6,'#c8606a');if(o.tongue>.6)rr(c,6,1,2.2,2.8+o.tongue*2.8,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.5,6.8*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.4,-6.6],[10.4,-6.4],[11.8,-5.2],[12.4,-3],[12.2,1],[11,1.9],[6.4,2.4]],mask);seg(c,7,-6,10.8,-5.8,.8,'#4a3a30');seg(c,7.4,-4,11.4,-3.8,.5,'#33261f');// kurze, tiefe Schnauze
 poly(c,[[10.6,-7.2],[12.6,-7.2],[13.3,-5.7],[12.9,-4.2],[10.8,-4.4]],'#0d0907');rr(c,11.8,-6.8,.9,.8,'#5a4f49');if(o.sniff)rr(c,12.6,-5.2+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[10.6,1.4],[12.6,1.4],[13.2,1.4-3.3*o.lick],[11.6,1.4-3.9*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<4;i++)seg(c,7+i*1.2,-6.4+i*.1,7.8+i*1.2,-5+i*.1,.55,'#2a1d18');seg(c,4.4,-7.3,6.4,-7.8,.6,'#3a2a20');}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1.2],[9,1.4],[8.2,3.4],[6,3.4]],mask);rr(c,10.6,1.4,1.1,2.6,'#f2ecdd');rr(c,9.2,1.6,.7,1.3,'#f2ecdd');rr(c,11.8,1.6,.7,1.1,'#f2ecdd');seg(c,6.4,-.4,12.4,-1.2,1,'#2a1d18');c.translate(0,-qv);}
 else{const sw=dead?0:Math.sin(t*2.2+sd)*.3;poly(c,[[6,1],[12.4,1],[12.2,3.4],[11,5.6+sw],[9,6.4+sw],[7,5.8],[6,3.4]],mask);seg(c,7.6,5.4+sw,11,4.8+sw,.6,'#3e2f27');rr(c,9.2,5.6+sw,1.6,.8,'#2a1d18');}// schwere Hängelefzen weit unter dem Kiefer
 if(o.drool&&!dead)rr(c,8.4,6.2,.6,3+Math.sin(t*3)*1.8,'#e6e1d6cc');else if(!dead&&hrand(sd*.3)<.6)rr(c,9.4,6,.5,1.4+Math.sin(t*1.3+sd)*.8,'#e6e1d6aa');// Sabberfaden
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.4,7.4,1.4*mb+.4,'#7d1a12');rr(c,9.4,4,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,11.4,3.6,.9,1+mb*4,'#8f2017');rr(c,7.4,5.4,.9,1+mb*3,'#7d1a12');}}
 seg(c,2.2,-6.1+(o.lips>.6?.4:0),6,-6.4-(o.lips>.6?.6:0),1.1,shade);// schwerer Brauenwulst
 if(dead||o.blink)seg(c,3.2,-4.4,5.2,-4.2,.6,'#1a120d');else{if(o.eyeWhite)rr(c,2.6,-5.2,1,1.6,'#e9e2d0');rr(c,3.2,-5,2,1.4,'#1b120b');rr(c,4.3,-4.9,.8,.6,(o.lips||0)>.6?'#e9d27a':'#9a7448');rr(c,3.2,-3.6,2.2,.6,'#8a3a34');}// kleines tiefliegendes Auge, rotes Unterlid
 if(!A.earCut){poly(c,[[-4.4-ear,-8.6],[.2-ear*2,-9.6],[-.6-ear*4,-1.6-ear*3],[-4.2-ear*3,-3-ear*2]],dark);seg(c,-4-ear,-8.5,-.2-ear*2,-9.4,.6,shade);}// großes Hängeohr
 else poly(c,[[-3.2,-9.4],[-2.4-ear*.4,-11.6+ear*.5],[-1.6,-11.2+ear*.5],[-1,-9.4]],shade);
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,8,3.4,9,1.6,'#e7dcc2');disk(c,8,4.2,1.4,'#e7dcc2');disk(c,17,4.2,1.4,'#e7dcc2');rr(c,9,4.6,7,.6,'#b8ab8c');}}
// ---- Kopf des Alaunts: breiter Schädel, kurze breite Schnauze, enge Lefzen, Scherengebiss, gestutzte Stehohren; Scheckung: oft schwarzer Fleck über Auge und Ohr
function headAL(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,D=d.dog,ps=(D?.seed||0)%9973,pt=col.patch||dark,ptH=col.patchHi||shade,eyeP=hrand(ps*.53)<.65,earC=eyeP||hrand(ps*.71)<.5?pt:shade;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 if(A.earCut)poly(c,[[-3.8,-8.2],[-2.4-ear*.9,-14.6+ear*.7],[-.8,-13.8+ear*.7],[.6,-8.8]],earC);// gestutzt: hohe Spitzohren, stehen
 else poly(c,[[-4.2-ear,-8.4],[.2-ear*1.4,-9.4],[.2-ear*2.6,-4.6-ear*2],[-2.6-ear*2.4,-5.6-ear*1.4]],earC);// ungestutzt: Hängeohr
 poly(c,[[-6.3,-5.4],[-4.3,-8.7],[.9,-10],[5,-9.2],[7.3,-6.6],[7.6,2.6],[3.3,6],[-3,6],[-6.8,2.6]],base);
 if(eyeP)poly(c,[[-5.4,-6],[-3.6,-8.6],[1.4,-9.8],[5,-9],[7.2,-6.6],[7,-2.4],[4.4,-1.4],[1.6,-2.6],[-.6,-1.2],[-3.8,-1.8]],pt);// schwarzer Kopffleck über Auge und Ohr
 if(A.earCut)poly(c,[[-2.9,-9.2],[-2.1-ear*.5,-12.8+ear*.7],[-1.2,-12.3+ear*.7],[-.7,-9.4]],eyeP?ptH:shade);
 seg(c,-3.3,-9.3,4.3,-9.5,.9,eyeP?ptH:light);poly(c,[[-3.9,.4],[3.2,-.4],[4.5,5.4],[-2.5,5.7]],shade+'90');seg(c,-2.5,.9,2.8,.3,.8,light+'a0');// Backen
 const jaw=o.jaw||0,jA=jaw*.62,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5,2.4);c.rotate(jA);poly(c,[[-1,0],[6.8,0],[6.8,2.1],[0,3]],shade);rr(c,0,2.3,6.4,.6,'#3a2e28');
 if(jaw>.2){rr(c,5.6,-.9,.9,1.4,'#f0eadb');rr(c,3.8,-.5,.8,.8,'#f0eadb');rr(c,2.1,-.5,.8,.8,'#f0eadb');rr(c,1,0,4.4,.8,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,5.4,1.4,'#c8606a');if(o.tongue>.6)rr(c,5.6,1,2,2.5+o.tongue*2.5,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.3,6*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6.2,-6.2],[9.8,-6],[11,-4.8],[11.6,-2.7],[11.4,1],[10.4,1.8],[6.2,2.2]],base);seg(c,6.8,-5.6,10.2,-5.4,.8,light);seg(c,7,-3.8,10.8,-3.6,.5,shade);// kurze, breite Schnauze, hell
 if(hrand(ps*.29)<.4)poly(c,[[8.2,-1.4],[11.4,-1.8],[11.3,1],[9,1.4]],'#d3a49a');// fleischfarbene Fleckung an der Lefze
 poly(c,[[10,-6.7],[11.8,-6.7],[12.4,-5.3],[12,-4],[10.1,-4.2]],'#0d0907');rr(c,11.2,-6.3,.8,.7,'#5a4f49');if(o.sniff)rr(c,11.9,-4.9+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[10,1],[11.8,1],[12.4,1-3.2*o.lick],[11,1-3.8*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7+i*1.2,-6,7.7+i*1.2,-4.8,.5,shade);seg(c,4.6,-6.9,6.4,-7.3,.5,eyeP?ptH:shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1],[8.4,1.2],[7.7,2.9],[6,2.9]],'#2a201c');rr(c,9.8,1.2,1,2.4,'#f2ecdd');rr(c,8.6,1.4,.7,1.2,'#f2ecdd');rr(c,10.9,1.4,.6,1,'#f2ecdd');seg(c,6.4,-.4,11.2,-1.1,.9,'#2a201c');c.translate(0,-qv);}
 else{poly(c,[[6,1],[11.3,1],[10.8,2.9],[8.6,3.7],[6.6,3.5],[6,2.8]],base);seg(c,6.4,1.1,11.1,1,.6,'#3a2e28');seg(c,7.6,3.2,10.6,2.4,.5,shade);}// enge Lefzen mit dunklem Rand
 if(o.drool&&!dead)rr(c,7.1,3.9,.5,2.2+Math.sin(t*3)*1.3,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.4,5.8,1.4*mb+.4,'#7d1a12');rr(c,8.6,3,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,10.4,3,.9,1+mb*4,'#8f2017');rr(c,6.8,4.3,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,3.3,-4.7,5.3,-4.5,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.7,-5.5,1,1.6,'#e9e2d0');rr(c,3.3,-5.4,2,1.6,'#0d0907');rr(c,4.4,-5.2,.8,.7,(o.lips||0)>.6?'#e9d27a':'#a87a45');seg(c,2.7,-6.1+(o.lips>.6?.3:0),5.7,-6.3-(o.lips>.6?.5:0),.7,eyeP?ptH:shade);}// harte Braue
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,7.6,3.2,9,1.6,'#e7dcc2');disk(c,7.6,4,1.4,'#e7dcc2');disk(c,16.6,4,1.4,'#e7dcc2');rr(c,8.6,4.4,7,.6,'#b8ab8c');}}
// ---- Kopf des Hirtenhunds: breiter Schädel, mittellange tiefe Schnauze, schwarze Maske über Schnauze und um die Augen, schwarze dreieckige Hängeohren (oft kupiert)
function headHH(c,d,o,A,col,t,dead,gore,woundsOn){const light=col.light,shade=col.shade,dark=col.dark,base=col.base,mask=A.mask;
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);
 if(A.earCut)poly(c,[[-3.6,-7.8],[-2.4-ear*.6,-11.8+ear*.5],[-1,-11.4+ear*.5],[.4,-8.4]],mask);
 poly(c,[[-6.4,-5],[-4.4,-8.6],[1,-9.8],[5.2,-9],[7.6,-6.2],[7.8,2.4],[3.4,5.8],[-3.2,5.8],[-6.8,2.4]],base);
 seg(c,-3.4,-9.1,4.4,-9.3,.9,light);seg(c,-5.4,-4,-5.6,2,1.2,light+'a0');poly(c,[[-3.8,.6],[3.4,-.2],[4.6,5.2],[-2.6,5.4]],shade+'a0');// helle Backenwolle, Schatten
 poly(c,[[2.8,-6.8],[5.4,-7.4],[7.6,-6.6],[7.8,-.6],[4.6,-2.2],[2.6,-3.6]],mask+'a8');// schwarze Maske um die Augen
 const jaw=o.jaw||0,jA=jaw*.62,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.4,2.1);c.rotate(jA);poly(c,[[-1,0],[7.8,0],[7.8,2.1],[0,3.1]],mask);
 if(jaw>.2){rr(c,6.5,-.9,.9,1.4,'#f0eadb');rr(c,4.4,-.5,.8,.8,'#f0eadb');rr(c,2.4,-.5,.8,.8,'#f0eadb');rr(c,1,0,5,.8,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.4,.2,6.1,1.4,'#c8606a');if(o.tongue>.6)rr(c,6.3,1,2,2.5+o.tongue*2.5,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.3,6.9*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6,-6.1],[10.8,-5.7],[12.4,-4.6],[13,-2.6],[12.8,1],[11.7,1.8],[6,2.2]],mask);seg(c,6.8,-5.5,11.2,-5.2,.8,'#3a2e26');seg(c,7.2,-3.6,11.6,-3.4,.5,'#2a201a');// schwarze Schnauze
 poly(c,[[11.2,-6.5],[13,-6.5],[13.7,-5],[13.3,-3.7],[11.4,-3.9]],'#0d0907');rr(c,12.4,-6.1,.8,.7,'#5a4f49');if(o.sniff)rr(c,13.1,-4.8+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[11.3,1],[13.2,1],[13.8,1-3.3*o.lick],[12.3,1-3.9*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.3+i*1.3,-5.9,8+i*1.3,-4.7,.5,'#3a2e26');seg(c,4.6,-6.9,6.4,-7.3,.5,shade);}
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1],[9,1.2],[8.1,3],[6,3]],mask);rr(c,10.9,1.2,1,2.4,'#f2ecdd');rr(c,9.6,1.4,.7,1.2,'#f2ecdd');rr(c,12.1,1.4,.7,1,'#f2ecdd');seg(c,6.4,-.4,12.5,-1.1,.9,'#140e0b');c.translate(0,-qv);}
 else{poly(c,[[6,1],[12.6,1],[12,3.4],[9.4,4.5],[6.9,4.1],[6,3]],mask);seg(c,7.9,3.7,11.7,2.6,.5,'#2a201a');}
 if(o.drool&&!dead)rr(c,7.2,4.1,.5,2.4+Math.sin(t*3)*1.4,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.4,7.2,1.4*mb+.4,'#7d1a12');rr(c,9,3,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,11.6,3,.9,1+mb*4,'#8f2017');rr(c,7,4.5,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,3.2,-4.6,5.2,-4.4,.6,'#0d0907');else{if(o.eyeWhite)rr(c,2.6,-5.4,1,1.6,'#e9e2d0');rr(c,3.2,-5.3,2,1.6,'#0d0907');rr(c,4.4,-5.1,.8,.7,(o.lips||0)>.6?'#e9d27a':'#b88a4e');seg(c,2.6,-6.1+(o.lips>.6?.3:0),5.6,-6.3-(o.lips>.6?.5:0),.7,'#2a201a');}// bernsteinfarbenes Auge, wachsame Braue
 if(!A.earCut){poly(c,[[-3.8-ear,-8.6],[.6-ear*1.6,-9.2],[.4-ear*2.8,-3.2-ear*2.4],[-2.8-ear*2.6,-5-ear*1.6]],mask);seg(c,-3.4-ear,-8.5,.2-ear*1.6,-9,.6,'#3a2e26');}// schwarzes dreieckiges Hängeohr
 else poly(c,[[-2.8,-8.8],[-2.2-ear*.4,-11+ear*.5],[-1.4,-10.6+ear*.5],[-.8,-8.8]],'#3a2e26');
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,8,3,9,1.6,'#e7dcc2');disk(c,8,3.8,1.4,'#e7dcc2');disk(c,17,3.8,1.4,'#e7dcc2');rr(c,9,4.2,7,.6,'#b8ab8c');}}
function drawDog(c,d,px,py,k,face,opt={}){const D=d.dog,col=D.appearance.colors,A=D.appearance,P=d.P||params(D),sz=P.sz,t=opt.time??(S.battle?.time??performance.now()/1000);
 const R=smoothRig(d,rig(d,t,opt.target),t,opt.key??(d.id||null)),o=R.o,dead=R.dead,{p,L,body,legs}=R;
 const base=col.base,light=col.light,shade=col.shade,dark=col.dark,mask=A.mask,SH=shapeOf(D),lw=SH.legW,hw=SH.hindW;
 c.save();c.translate(px,py);c.scale(k,k);
 if(d.pool&&opt.pool!==false){c.fillStyle='#4f100c';c.beginPath();c.ellipse(-2*face*sz,1,d.pool.r*1.25,d.pool.r*.42,0,0,TAU);c.fill();c.fillStyle='#6e1912';c.beginPath();c.ellipse(-3*face*sz,.6,d.pool.r*.9,d.pool.r*.28,0,0,TAU);c.fill();}
 if(!opt.noShadow){const zz=(d.z||0);c.fillStyle='#1c140c55';c.beginPath();c.ellipse(0,1.5,(R.lie?30:26)*sz*(1-zz/60),(R.lie?5:4)*sz,0,0,TAU);c.fill();}
 c.translate(0,-(d.z||0));c.scale(face*sz,sz);
 const recoil=d.hit>0?Math.sin(d.hit/.26*Math.PI)*2:0;c.translate(-recoil,0);if(d.mode==='shakeoff'){c.translate(0,-20);c.rotate(Math.sin(t*26)*.07);c.translate(0,20);}
 // ---- Wunden und Blut im Fell
 function gore(part,x,y,r){const gv=Math.min(1,d.gore?.[part]||0);if(gv<=.02)return;const n=Math.ceil(gv*10);for(let i=0;i<n;i++){const a=hrand(i*7.3+part.length*13+(D.seed%97))*TAU,rad=hrand(i*3.1+part.length)*r;
  rr(c,x+Math.cos(a)*rad-1.5,y+Math.sin(a)*rad*.7-1,2+hrand(i+9)*2.5,1.2+hrand(i+3)*1.4,i%3?'#5e1510b8':'#7a1d15a8');if(gv>.4&&i%2===0)rr(c,x+Math.cos(a)*rad,y+Math.sin(a)*rad*.7+1,.9,1.5+gv*3.5,'#6a1611aa');}}
 function woundsOn(part,x,y){if(!d.wounds?.length)return;for(const w of d.wounds){if(w.part!==part)continue;const wx=x+w.u,wy=y+w.v,n=w.size*.72+.6,s=w.seed;
  const blob=(sc,cc)=>{for(let i=0;i<5;i++){const a=hrand(s+i)*TAU,r=hrand(s+i*2.7)*n*.45*sc;rr(c,wx+Math.cos(a)*r-n*.55*sc,wy+Math.sin(a)*r*.55-n*.3*sc,n*1.1*sc,Math.max(.8,n*.6*sc),cc);}};
  if(w.kind==='bite'||w.kind==='tear'){blob(1.3,'#3d0b08');blob(1,'#8e2219');if(w.kind==='tear'||n>2.4){blob(.5,'#c45b4c');rr(c,wx-n*.2,wy-.2,n*.4,.6,'#e8b4a6');}
   for(let i=0;i<4;i++){rr(c,wx-n*1.1+i*n*.65,wy-n*.62,.8,.8,'#1c0504');rr(c,wx-n*.9+i*n*.6,wy+n*.5,.8,.8,'#1c0504');}if(w.kind==='tear')rr(c,wx+n*.5,wy+n*.3,1.2,n*.9,base);}
  else if(w.kind==='cut'){seg(c,wx-n*1.5,wy+n*.4,wx+n*1.5,wy-n*.5,1.5,'#3d0b08');seg(c,wx-n*1.3,wy+n*.32,wx+n*1.3,wy-n*.42,.8,'#c4483a');if(n>2.4)rr(c,wx-n*.3,wy-.3,n*.6,.6,'#e48e7f');}
  else if(w.kind==='stab'){rr(c,wx-1.1,wy-1.1,2.2,2.2,'#2e0806');rr(c,wx-.5,wy-.5,1,1,'#b23426');}
  else blob(1,'#4a2a2a55');
  const fresh=cl(1-((t-(w.t||0))/25),0,1),bl=(d.bleed?.[part]||0);if(!dead&&(fresh>0||bl>.3)){const LL=(n*1.6+3)*Math.max(fresh,cl(bl*.6,0,1))*(.7+.3*Math.sin(t*2+s));rr(c,wx+((s%3)-1)*.8,wy+n*.35,.9,LL,'#8d2219');if(bl>.5)rr(c,wx+((s%3)-1)*.8,wy+n*.35+LL+((t*12+s)%6),.9,1.3,'#a3291e');}}}
 // ---- ein Bein: getrennte Glieder mit Gelenken
 function drawLeg(l){const cc=l.near?base:shade,hi=l.near?light:base,lo=l.near?shade:dark,tanC=col.tan?(l.near?col.tan:shadeHex(col.tan,.72)):null;
  if(l.front){limb(c,l.j.x,l.j.y-2,l.k.x,l.k.y,9.5*lw,6.2*lw,cc);limb(c,l.k.x,l.k.y,l.w.x,l.w.y,5.6*lw,4.6*lw,cc);limb(c,l.w.x,l.w.y,l.f.x,l.f.y-1.6,4.4,4.2,tanC||cc);
   if(l.near){seg(c,l.j.x+3,l.j.y-1.5,l.k.x+2,l.k.y-.5,1.4,hi);seg(c,l.k.x-2.2,l.k.y+.5,l.w.x-1.8,l.w.y,1,lo);disk(c,l.k.x-2.2,l.k.y+.5,1,lo);disk(c,l.w.x-.4,l.w.y,1.1,lo);}}
  else{limb(c,l.j.x,l.j.y-3,l.k.x,l.k.y,14*hw,7.5*hw,cc);limb(c,l.k.x,l.k.y,l.h.x,l.h.y,6.8*hw,4.4*hw,cc);limb(c,l.h.x,l.h.y,l.f.x,l.f.y-1.6,4.4,4.2,tanC||cc);
   if(l.near){seg(c,l.j.x-5.5,l.j.y-2,l.k.x-2.5,l.k.y,1.1,lo);seg(c,l.j.x+3,l.j.y-5,l.k.x+2.6,l.k.y-1,1.2,hi);disk(c,l.h.x-1.6,l.h.y,1.2,lo);}}
  const fx=l.f.x+(l.front?.8:.4),fy=l.f.y,up=l.front?Math.atan2(l.f.x-l.w.x,l.w.y-l.f.y):Math.atan2(l.f.x-l.h.x,l.h.y-l.f.y),lift=cl((-1.5-fy)/2.5,0,1);c.save();c.translate(fx,fy-1.4+(1-lift));c.rotate(cl(-up*.6,-1.3,.4)*lift);c.translate(-fx,-fy+1.4);// Pfote mit Zehen und Krallen: steht der Fuß am Boden (y −1,5), liegt sie flach auf; erst beim Anheben kippt sie mit dem Mittelfuß
  poly(c,[[fx-3.2,fy-.3],[fx-2.8,fy-2.9],[fx+2.2,fy-3],[fx+3.6,fy-1.2],[fx+3.4,fy+.3]],A.whiteFeet&&l.front?(l.near?'#e9dfcb':'#bdb3a0'):tanC||cc);rr(c,fx-3.2,fy-.3,6.6,1,lo);
  if(l.near){rr(c,fx-.9,fy-2.8,.7,2,lo);rr(c,fx+1.2,fy-2.6,.7,1.8,lo);rr(c,fx+3.3,fy-.4,.8,.8,'#ddd4bf');rr(c,fx+1.7,fy+.1,.7,.7,'#ddd4bf');}c.restore();
  if(SH.spots&&col.spot&&l.near){const ps=(D.seed||0)%9973+(l.front?11:23);for(let i=0;i<4;i++){const u=.15+hrand(ps+i*1.9)*.75,a=l.front?l.k:l.h,b=l.front?l.w:l.k,x=(l.j.x+(a.x-l.j.x)*u)*(i<2?1:0)+(a.x+(b.x-a.x)*u)*(i<2?0:1),y=(l.j.y+(a.y-l.j.y)*u)*(i<2?1:0)+(a.y+(b.y-a.y)*u)*(i<2?0:1);disk(c,x+(hrand(ps+i)-.5)*2,y,.6+hrand(ps+i*2.3)*.6,col.spot);}}// Tupfen an den Läufen
  if(SH.head==='wo'&&D.breed==='apenninwolf'&&l.front){const a=l.k,b=l.w;seg(c,a.x+1.6,a.y-1,b.x+1,b.y-.6,l.near?1.2:.9,'#1e1a16');}// Apenninwolf: schwarzer Strich vorn am Vorderlauf
  if(SH.legFeather){// Befederung (Windhunde mit langem Haar): Fransen an der Rückseite der Läufe, beim Afghanen bis über die Pfoten
   const fl=SH.legFeather,ps=(D.seed||0)%9973+(l.front?5:17),hc=l.near?light:base,sw=(d.moveSpeed||0)>8?Math.sin((d.cyc||0)*TAU*2+(l.front?0:1.6))*.6:0;
   const pts=l.front?[l.j,l.k,l.w]:[l.j,l.k,l.h],n=fl>1.2?9:6;for(let i=0;i<n;i++){const u=(i+.5)/n*(pts.length-1),a=pts[Math.floor(u)],b=pts[Math.min(pts.length-1,Math.floor(u)+1)],f=u-Math.floor(u),x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f,h=hrand(ps+i*1.7),len=fl*(1.6+h*1.6)*(l.front&&u<1?.5:1);
    seg(c,x-1,y,x-1.4-len*.7+sw,y+len*.9,.9,i%2?hc:cc);if(l.near&&i%2===0)seg(c,x-.6,y+.6,x-1-len*.5+sw,y+len*.8,.5,lo);}
   if(fl>1.2){const f2=l.f;for(let i=0;i<3;i++)seg(c,f2.x-2+i*1.6,f2.y-6,f2.x-2.4+i*1.6+sw*.5,f2.y-1.2,1,i%2?hc:cc);}}// Haar fällt über die Pfote
  if(l.near)woundsOn(l.front?'vl':'hl',(l.j.x+l.k.x)/2,(l.j.y+l.k.y)/2);}
 // ---- ferne Beine
 drawLeg(legs[2]);drawLeg(legs[3]);
 // ---- Rute
 {const wag=dead?0:(R.legs&&d.moveSpeed>8?Math.sin((d.cyc||0)*TAU*2)*.12:Math.sin(t*(o.tail>.4?6:2))*.1);const tb=body(-5,-5);let th=R.lie?2.95:(o.tuck?1.05:1.95+o.tail*1.25-SH.tailUp)+wag-p,tx=tb.x,ty=tb.y;
  for(let i=1;i<=8;i++){const nx=tx+Math.cos(th)*SH.tailSeg;let ny=ty+Math.sin(th)*SH.tailSeg;if(SH.tailSeg>2.6&&ny>-.8){ny=-.8;th=Math.PI+.05;}// lange Rute liegt auf dem Boden auf
   if(SH.bushy){const w=SH.tailW*(.55+.55*Math.sin(Math.PI*cl((i-.5)/8,0,1)));seg(c,tx,ty,nx,ny,w,i>6?(col.tailTip||col.saddle||dark):i===1?base:shade);seg(c,tx+Math.sin(th)*w*.25,ty-Math.cos(th)*w*.25,nx+Math.sin(th)*w*.25,ny-Math.cos(th)*w*.25,w*.45,i>6?(col.tailTip||col.saddle||dark):base);if(i>1&&i<8)seg(c,nx,ny,nx-Math.sin(th)*w*.6-.6,ny+Math.cos(th)*w*.6,.7,light+'aa');}// buschige Rute, dunkle Spitze
   else seg(c,tx,ty,nx,ny,cl(SH.tailW-i*.42*SH.tailW/4.6,1.5*SH.tailW/4.6,SH.tailW),i>6?(SH.tipWhite&&col.tailTip?col.tailTip:shade):base);if(SH.rough&&i>1&&i<8&&i%2===0)seg(c,nx,ny,nx-Math.sin(th)*1.8-.6,ny+Math.cos(th)*1.8,.7,i%4?light:shade);if(SH.tailFeather&&i>1){const fl=SH.tailFeather*(i<7?1:.6)*(.8+hrand(i*2.9+(D.seed||0)%29)*.5);seg(c,(tx+nx)/2,(ty+ny)/2,(tx+nx)/2-Math.sin(th)*fl*2.2-.8,(ty+ny)/2+Math.cos(th)*fl*2.2,.9,i%2?light:base);}tx=nx;ty=ny;th+=R.lie?0:(o.tuck?.12:SH.tailCurl+(SH.tailRing&&i>5?SH.tailRing:0));}
  }
 // ---- Rumpf im Körperrahmen (Becken bei 0,0; Schulter bei L,0), geneigt um p
 c.save();c.translate(R.hipX,R.hipY);c.rotate(-p);
 {const top=[],bot=[];for(let i=0;i<=16;i++){const u=i/16,x=-4+(L+9)*u,yb=R.bend*Math.sin(Math.PI*u)+(R.breathe*.3)*u;
   const rt=(u<.1?7+u*10:u<.5?8.2-(u-.1)*3:7+(u-.5)*5+o.hackle*.6)*SH.thick,rb=(u<.15?7+u*5:u<.42?7.8-(u-.15)*7:u<.62?5.9+(u-.42)*18:9.5+Math.sin((u-.62)/.38*Math.PI*.5)*1.5-(u>.95?(u-.95)*40:0))*SH.thick;
   const sb=Math.sin(Math.PI*cl((u-.15)/.45,0,1)),sw=Math.sin(Math.PI*cl((u-.55)/.45,0,1));
   top.push([x,yb-rt-SH.withers*sw]);bot.push([x,yb+rb+SH.chest*cl((u-.55)/.1,0,1)-SH.tuck*sb+(d.submit||d.mode==='submit'?-2:0)]);}
  poly(c,[[-7.2,-1],[-6.3,-4.6],...top,[L+6,4],...[...bot].reverse(),[-6.6,3.4]],base);
  poly(c,bot.slice(0,12).map(([x,y])=>[x,y-2.4]).concat(bot.slice(0,12).reverse()),shade);
  poly(c,top.slice(1,15).concat(top.slice(1,15).reverse().map(([x,y])=>[x,y+1.6])),light+'d0');
  if(o.hackle>.7)for(let i=10;i<17;i+=2){const [x,y]=top[i];poly(c,[[x-1.2,y+.5],[x+.2,y-o.hackle*1.4],[x+1,y+.5]],base);}
  if(SH.rough){// Rauhaar: Zotteln auf dem Rücken, Fransen am Bauch
   for(let i=1;i<16;i++){const [x,y]=top[i],h=hrand(i*3.7+D.seed%31);seg(c,x,y+.5,x-2.2-h*1.2,y-.3-h*.9,.8,h>.5?light:base);if(i%2)seg(c,x+.6,y+1.4,x-.8,y+.6,.6,shade+'aa');}
   for(let i=2;i<15;i++){const [x,y]=bot[i],h=hrand(i*5.1+D.seed%17);seg(c,x,y-.6,x-1+h*.6,y+1.2+h*1.6,.8,h>.6?shade:base);}
   for(let i=0;i<14;i++){const x=1+hrand(i*2.3+D.seed%7)*(L+2),y=-4+hrand(i*4.1)*7;seg(c,x,y,x-1.4,y+1.2,.55,i%3?shade+'99':light+'aa');}}
   if((SH.piebald||D.breed==='greyhound')&&col.patch){// Scheckung: schwarze Platten, je Hund eigene Lage (aus der Saat, kein zusätzlicher Wurf)
   const ol=[[-7.2,-1],[-6.3,-4.6],...top,[L+6,4],...[...bot].reverse(),[-6.6,3.4]],ps=(D.seed||0)%9973;c.save();c.beginPath();ol.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.clip();
   const n=2+Math.floor(hrand(ps*.37)*3);for(let i=0;i<n;i++){const cx=-5+hrand(ps+i*1.7)*(L+10),cy=-9+hrand(ps+i*2.3)*9,rx=4+hrand(ps+i*3.1)*6.5,ry=3.5+hrand(ps+i*4.7)*4,pts=[];
    for(let j=0;j<9;j++){const a=j/9*TAU,w=.75+hrand(ps+i*5.3+j*.91)*.45;pts.push([cx+Math.cos(a)*rx*w,cy+Math.sin(a)*ry*w]);}poly(c,pts,col.patch);seg(c,cx-rx*.6,cy-ry*.55,cx+rx*.5,cy-ry*.6,.8,col.patchHi);}
   c.restore();}
  if(SH.silk){// langes seidiges Fell (Afghane, Barsoi): Strähnen über die Seite, Fransen unter Brust und Bauch, schwingen beim Laufen
   const sk=SH.silk,ps=(D.seed||0)%9973,sw=(d.moveSpeed||0)>8?Math.sin((d.cyc||0)*TAU*2)*.9:Math.sin(t*1.2)*.2;
   for(let i=2;i<15;i++){const [x,y]=top[i],[,yb]=bot[i],h=hrand(ps+i*3.1);if(i%2===0)seg(c,x+.4,y+2+h,x-1.2+sw*.4,yb-1,.6,(i%4?light:shade)+'70');}
   for(let i=1;i<16;i++){const [x,y]=bot[i],h=hrand(ps+i*2.3),len=sk*(2.4+h*2.2)*(i>10?1.25:1);seg(c,x,y-2.2,x-1.4+sw,y+len,1.5,i%2?light:base);seg(c,x+.8,y-1,x-.4+sw,y+len-1.2,.7,shade);}}
  if(SH.ribs){// sichtbare Rippen und Hüftknochen (Azawakh): Bögen hinter der Schulter, Hüfthöcker an der Kruppe
   for(let i=0;i<5;i++){const k=9+i,[x,y]=top[k],[,yb]=bot[k];seg(c,x+.6,y+3.2,x-.4,yb-1.8,.6,shade+'c0');seg(c,x+1.3,y+3.6,x+.3,yb-2.2,.4,light+'70');}
   const [hx,hy]=top[2];disk(c,hx+1,hy+1.6,1.2,light+'a0');seg(c,hx-.4,hy+3,hx+2.4,hy+3.2,.5,shade+'b0');}
  if(SH.saddle&&col.saddle){// Wolfszeichnung: dunkler Sattel über Rücken und Schultern, heller Bauch
   poly(c,bot.slice(1,16).map(([x,y],j)=>[x,y-3.4-1.2*Math.sin(j*.45)]).concat(bot.slice(1,16).reverse().map(([x,y])=>[x,y])),col.belly);
   const sa=top.slice(2,15),sw=SH.saddle;poly(c,sa.concat(sa.slice().reverse().map(([x,y],j)=>[x,y+(3.2+1.4*Math.sin(j*.9+((D.seed||0)%7)))*sw])),col.saddle);
   for(let i=3;i<14;i+=2){const [x,y]=top[i];seg(c,x,y+3.4,x-1.4,y+5.2,.7,col.saddle);}}
  if(SH.folds){// lose Haut: Falten über Schulter und Brustansatz, eine Falte an der Flanke
   for(let i=0;i<4;i++){const x=L-1-i*2.2;seg(c,x,-6+i*.4,x+1.8,3.6+i*.6,.9,shade);seg(c,x+.8,-6.2+i*.4,x+2.4,3+i*.6,.5,light+'90');}
   seg(c,L*.4,5.6,L*.62,6.4,.8,shade);seg(c,L*.42,5,L*.6,5.8,.5,light+'80');
   if(SH.folds>1)for(let i=0;i<4;i++){const x=L*.18+i*L*.14;seg(c,x,-5.6+i*.3,x+1.2,4.4,.8,shade);seg(c,x+.6,-5.8+i*.3,x+1.7,3.8,.45,light+'80');}}// mehr Falten an der Flanke (Shar-Pei)
  if(SH.ridge){// Ridge: Haarkamm gegen den Strich längs des Rückens (Kruppe bis Schulter), vorn zwei Wirbel
   for(let i=4;i<=12;i++){const [x,y]=top[i];seg(c,x,y+.7,x+1.4,y-.2,.8,shade);if(i%2===0)seg(c,x+.4,y+1.3,x+1.6,y+.5,.5,light+'90');}
   const [wx,wy]=top[12];disk(c,wx+.6,wy+.9,1,shade);disk(c,wx+.6,wy+.9,.5,light+'aa');disk(c,wx+2.4,wy+1,1,shade);disk(c,wx+2.4,wy+1,.5,light+'aa');}
  if(SH.urajiro&&col.belly){// Urajiro: weiße Unterseite (Bauch, Brust), weich abgesetzt
   poly(c,bot.slice(1,16).map(([x,y],j)=>[x,y-2.8-1.4*Math.sin(j*.4)]).concat(bot.slice(1,16).reverse()),col.belly);
   poly(c,[[L+.5,.6],[L+6.6,3],[L+5.6,10],[L,9]],col.belly);}
  if(SH.spots&&col.spot){// Dalmatiner-Tupfen: runde Flecken, auf die Rumpfform zugeschnitten, Lage je Hund aus der Saat
   const ol=[[-7.2,-1],[-6.3,-4.6],...top,[L+6,4],...[...bot].reverse(),[-6.6,3.4]],ps=(D.seed||0)%9973;c.save();c.beginPath();ol.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.clip();
   for(let i=0;i<34;i++){const x=-6+hrand(ps+i*1.37)*(L+12),y=-10+hrand(ps+i*2.11)*20,r=.7+hrand(ps+i*3.7)*1.1;disk(c,x,y,r,col.spot);}
   c.restore();}
  if(SH.cords){// Filzschnüre: vom Rücken bis weit unter den Bauch hängend, schwingen leicht beim Laufen
   const sw=(d.moveSpeed||0)>8?Math.sin((d.cyc||0)*TAU*2)*.8:Math.sin(t*1.3)*.2,ps=(D.seed||0)%9973;
   for(let i=0;i<=16;i++){const [x,y]=top[i],[,yb]=bot[i],h=hrand(ps+i*1.9),len=(yb-y)+5+h*4;seg(c,x+.3,y+.4,x-.6+sw,y+len,1.5,i%2?col.light:col.base);seg(c,x+1.1,y+1.4,x+.6+sw,y+len-1.4,.7,col.shade);rr(c,x-1+sw,y+len-.4,1.6,1,col.shade);}}
 if(col.stripe)for(let i=0;i<13;i++){const x=-2+(L+3)*(.06+i*.07);seg(c,x,-6+hrand(i+D.seed%13)*2,x-2.5,5,.9,col.stripe+'a0');}
  seg(c,L-7,-6,L-3,5,.8,shade+'aa');seg(c,L*.55+3,-1,L*.55+6,5,.7,shade+'77');seg(c,5,-6,6,4,.8,shade+'aa');
  if(A.whiteChest)poly(c,[[L+3,2],[L+7,5],[L+5,10],[L+1,9]],'#e9dfcb');
  if(col.tan){poly(c,[[L+1.5,1.5],[L+6.5,3.5],[L+5.5,9.5],[L+.5,8.5]],col.tan);rr(c,-6,-1,2,2.2,col.tan);}// rotbraune Brustabzeichen, Fleck unter der Rute
  for(let i=0;i<A.scars;i++){const x=5+hrand(A.scarSeed+i)*24,y=-4+hrand(A.scarSeed+i*3)*6;seg(c,x,y,x+3,y+2,.7,shade);seg(c,x+.3,y-.4,x+3.3,y+1.6,.45,light);}
  gore('bauch',L*.45,2,9);gore('brust',L+1,3,7);woundsOn('bauch',L*.45,1);woundsOn('brust',L+1,3);}
 c.restore();
 // ---- Hals (dick, Wamme)
 const {N,Hp,ha}=R,sh=R.sh,top=body(L-2,-SH.crest-o.hackle*1.2),bot=body(L+6,SH.dew),ca=Math.cos(ha),sa=Math.sin(ha),hp=(x,y)=>({x:Hp.x+(ca*x-sa*y)*HS,y:Hp.y+(sa*x+ca*y)*HS});
 const ht=hp(-3.5,-6.5),hb=hp(-2,5);poly(c,[[top.x,top.y],[ht.x,ht.y],[hp(0,0).x,hp(0,0).y],[hb.x,hb.y],[bot.x,bot.y]],base);
 poly(c,[[(top.x+bot.x)/2+2,(top.y+bot.y)/2+3],[hp(-2,2).x,hp(-2,2).y],[hb.x,hb.y],[bot.x,bot.y]],shade);
 if(SH.ruff){// dichter Halskragen: volle Wolle um Nacken und Kehle, kurze Zotteln nach hinten unten, hellere Unterwolle
  const mt={x:top.x*.5+ht.x*.5,y:top.y*.5+ht.y*.5},mb={x:bot.x*.5+hb.x*.5,y:bot.y*.5+hb.y*.5};
  poly(c,[[top.x+1,top.y-1.2],[mt.x,mt.y-1.6],[ht.x+.4,ht.y-.6],[hp(-1,0).x,hp(-1,0).y],[hb.x,hb.y+1.2],[mb.x,mb.y+2],[bot.x+.6,bot.y+1.4]],base);
  poly(c,[[mt.x+.6,mt.y+1.4],[hp(-2.6,-2).x,hp(-2.6,-2).y],[hp(-2,2.6).x,hp(-2,2.6).y],[mb.x,mb.y]],light+'70');
  for(let i=0;i<6;i++){const u=(i+.5)/6,x=top.x+(ht.x-top.x)*u,y=top.y+(ht.y-top.y)*u-1,h=hrand(i*2.9+D.seed%23);seg(c,x,y,x-1.4-h*.8,y+.6+h*.6,.8,h>.5?light:shade+'cc');}
  for(let i=0;i<5;i++){const u=(i+.5)/5,x=bot.x+(hb.x-bot.x)*u,y=bot.y+(hb.y-bot.y)*u+1.4,h=hrand(i*4.3+D.seed%19);seg(c,x,y,x-1+h*.4,y+1.2+h*.8,.8,h>.55?shade:base);}}
 if(A.collar&&!dead){const m1={x:top.x*.55+ht.x*.45,y:top.y*.55+ht.y*.45},m2={x:bot.x*.55+hb.x*.45,y:bot.y*.55+hb.y*.45};seg(c,m1.x,m1.y,m2.x,m2.y,2.4,'#4b3020');for(let i=1;i<5;i++)rr(c,m1.x+(m2.x-m1.x)*i/5-.5,m1.y+(m2.y-m1.y)*i/5-.5,1,1,'#c7c1aa');}
 const nm=R.anchors.hals;gore('hals',nm.x,nm.y,5);woundsOn('hals',nm.x,nm.y);
 // ---- Kopf
 c.save();c.translate(Hp.x,Hp.y);c.rotate(ha);c.scale(HS,HS);
 if(SH.head==='eb')headEB(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='bt')headBT(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='hk')headHK(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='ch')headCH(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='sp2')headSP2(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='ko')headKO(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='nf')headNF(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='mm')headMM(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='bh2')headSB(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='lb')headLB(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='dd')headDD(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='gh')headGH(c,d,o,A,col,t,dead,gore,woundsOn);else if(WIND[SH.head])headWind(c,d,o,A,col,t,dead,gore,woundsOn,WIND[SH.head]);else if(SH.head==='dm')headDM(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='as')headAS(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='bx2')headBXR(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='ml')headML(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='sh')headSH(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='db')headDB(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='ak')headAK(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='rr')headRR(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='bm')headBM(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='bx')headBX(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='tb')headTB(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='mn')headMN(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='co')headCO(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='bo')headBO(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='pc')headPC(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='dg')headDG(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='fi')headFI(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='to')headTO(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='ow')headOW(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='bh')headBH(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='wo')headWO(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='mo')headMO(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='al')headAL(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='hh')headHH(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='bb')headBB(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='mg')headMG(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='sp')headSP(c,d,o,A,col,t,dead,gore,woundsOn);else if(SH.head==='wh')headWH(c,d,o,A,col,t,dead,gore,woundsOn);else{
 poly(c,[[-6,-5],[-4,-8],[1,-9.2],[5,-8.4],[7.5,-5.5],[7.5,2],[3,5],[-3,5],[-6.5,2]],base);
 seg(c,-3,-8.5,4,-8.6,.9,light);seg(c,0,-6.6,4,-6.9,.6,shade);seg(c,.5,-5.5,4.5,-5.7,.6,shade);
 poly(c,[[-4,1],[3,.5],[4,4.6],[-2.5,4.8]],shade+'aa');poly(c,[[3,-6.2],[7.5,-6],[7.5,-.5],[4,-1.8]],mask+'90');
 const jaw=o.jaw||0,jA=jaw*.62,snarl=jaw>.15||(o.lips||0)>.6;
 c.save();c.translate(5.5,2);c.rotate(jA);poly(c,[[-1,0],[8,0],[8,2.2],[0,3.2]],mask);
 if(jaw>.2){rr(c,6.6,-.9,.9,1.4,'#f0eadb');rr(c,4.5,-.5,.8,.8,'#f0eadb');rr(c,2.5,-.5,.8,.8,'#f0eadb');rr(c,1,0,5,.8,'#9a3b42');}
 if(o.tongue||o.pant){rr(c,1.5,.2,6,1.4,'#c8606a');if(o.tongue>.6)rr(c,6.5,1,2,2.5+o.tongue*2.5,'#b9505a');}
 if(d.mouthBlood>.1)rr(c,1,2.4,7*d.mouthBlood,1,'#7a1a12');c.restore();
 poly(c,[[6,-5.8],[11,-5.6],[12.6,-4.6],[13.3,-2.6],[13.1,1],[12,1.8],[6,2.2]],mask);seg(c,7,-5.2,11.5,-5,.8,'#4a3a30');seg(c,7.5,-3.6,12,-3.4,.5,'#33261f');
 poly(c,[[11.4,-6.2],[13.2,-6.4],[14,-5],[13.6,-3.6],[11.6,-3.8]],'#0d0907');rr(c,12.6,-5.9,.8,.7,'#5a4f49');if(o.sniff)rr(c,13.3,-4.6+Math.sin(t*34)*.3,.8,.8,'#2a2420');
 if(o.lick>.05)poly(c,[[11.5,1],[13.6,1],[14.2,1-3.4*o.lick],[12.6,1-4*o.lick]],'#c8606a');
 if((o.lips||0)>.6){for(let i=0;i<3;i++)seg(c,7.4+i*1.4,-5.9+i*.1,8.2+i*1.4,-4.6+i*.1,.5,'#2a1d18');seg(c,4.8,-6.4,6.6,-6.9,.5,'#3a2a20');}// Falten auf dem Nasenrücken beim Zähnefletschen
 if(snarl){const qv=o.quiver?Math.sin(t*46)*.45*o.quiver:0;c.translate(0,qv);poly(c,[[6,1],[9.2,1.2],[8.2,3],[6,3]],mask);rr(c,11.2,1.2,1,2.4,'#f2ecdd');rr(c,9.8,1.4,.7,1.2,'#f2ecdd');rr(c,12.6,1.4,.7,1,'#f2ecdd');seg(c,6.5,-.4,12.8,-1.2,.9,'#2a1d18');c.translate(0,-qv);}
 else{poly(c,[[6,1],[13,1],[12.3,3.6],[9.5,4.8],[7,4.4],[6,3]],mask);seg(c,8,3.9,12,2.8,.5,'#3e2f27');}
 if(o.drool&&!dead)rr(c,7.2,4.2,.5,2.5+Math.sin(t*3)*1.5,'#e6e1d6cc');
 if(d.mouthBlood>.05){const mb=d.mouthBlood;rr(c,6,1.4,7.5,1.4*mb+.4,'#7d1a12');rr(c,9,3,.9,2+mb*5,'#8f2017');if(mb>.4){rr(c,12,3,.9,1+mb*4,'#8f2017');rr(c,7,4.6,.9,1+mb*3,'#7d1a12');}}
 if(dead||o.blink)seg(c,3,-4,5,-3.8,.6,'#1a120d');else{if(o.eyeWhite)rr(c,2.4,-4.9,1,1.6,'#e9e2d0');rr(c,3,-4.8,2.1,1.7,'#1b120b');rr(c,4.2,-4.6,.8,.7,(o.lips||0)>.6?'#e9d27a':'#cdbb93');seg(c,2.4,-5.6+(o.lips>.6?.3:0),5.4,-5.8-(o.lips>.6?.5:0),.7,mask);}
 const ear=cl((o.ears||0)+(o.earFlick?Math.sin(t*38)*.35*o.earFlick:0),-.4,1.3);if(A.earCut)poly(c,[[-3,-8],[0,-9],[-1,-5]],dark);else poly(c,[[-4-ear,-8],[0-ear*2,-8.8],[-1-ear*4,-1.5-ear*3],[-4-ear*3,-3-ear*2]],dark);
 gore('kopf',3,-2,5);woundsOn('kopf',2,-3);
 if(o.bone){rr(c,8,3,9,1.6,'#e7dcc2');disk(c,8,3.8,1.4,'#e7dcc2');disk(c,17,3.8,1.4,'#e7dcc2');rr(c,9,4.2,7,.6,'#b8ab8c');}}
 c.restore();
 // ---- nahe Beine
 drawLeg(legs[1]);drawLeg(legs[0]);
 c.restore();}
DOG.draw=drawDog;

// ---------------------------------------------------------------- Anschluss an das Spiel: Zeichnen in der Arena
// Beim Verbeißen wird der Bisspunkt jedes Bild neu am Opfer gemessen: der Kopf sitzt genau dort.
function targetFor(d,px,py,k,face,proj){if(d.mode!=='grip'||!d.victim)return null;const b=S.battle,v=b?.actors.find(a=>a.id===d.victim);if(!v)return null;const t=b.time;
 let P;if(proj)P=proj(v,d.gripPart,t);else{const an=anchorOf(v,d.gripPart,t);P={x:an.x,y:an.y};}
 const s=d.P.sz;return {x:(P.x-px)*face/(k*s),y:((P.y-py)/k+(d.z||0))/s};}
const baseDraw=M.drawRex;
M.drawRex=function(ctx,a){if(!a?.dog)return baseDraw?.apply(this,arguments);
 const face=a.mode==='grip'&&a.gripFace?a.gripFace:Math.cos(a.a||0)>=0?1:-1,px=Math.round(a.x),py=Math.round(a.y);
 drawDog(ctx,a,px,py,1,face,{target:targetFor(a,px,py,1,face)});
 if(a.spray?.length)for(const p of a.spray){ctx.fillStyle='#8d1c13';ctx.fillRect(Math.round(p.x),Math.round(p.y-p.z),p.s,p.s);}
 if((a.fled||a.submit)&&!a.g.dead){ctx.fillStyle='#e9d6a2';ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillText(a.submit?'unterwirft sich':'flieht',a.x,a.y-46*a.P.sz);}};

// =====================================================================================================
// 1:1-NAHANSICHT: dieselbe Simulation, zwei Hunde groß von der Seite
// =====================================================================================================
const CU={crowd:null};DOG.closeup=CU;
function crowdSeed(w){const r=mulberry(77),o=[];for(let i=0;i<46;i++)o.push({x:r()*w,h:22+r()*14,c:['#5a4430','#3e3226','#6a4e36','#4a3a2e','#7a5a3c'][Math.floor(r()*5)],skin:['#c99a72','#a8754f','#e0b48c','#8a5c3c'][Math.floor(r()*4)],ph:r()*6,row:i%2});return o;}
CU.draw=function(cv,b){const c=cv.getContext('2d'),W=cv.width,H=cv.height,t=b.time;c.imageSmoothingEnabled=false;
 const dogs=b.actors.filter(isDog);if(dogs.length<2)return;const [A,B]=dogs;
 const ax={x:1,y:0},pp={x:0,y:1};
 const mid={x:(A.x+B.x)/2,y:(A.y+B.y)/2};CU.mid=CU.mid??{...mid};CU.mid.x+=(mid.x-CU.mid.x)*.08;CU.mid.y+=(mid.y-CU.mid.y)*.08;
 const span=Math.abs((B.x-A.x)*ax.x+(B.y-A.y)*ax.y)+(A.P.sz+B.P.sz)*55;const kT=cl(W*.8/span,2.6,6.5);CU.k=CU.k??kT;CU.k+=(kT-CU.k)*.05;const k=Math.round(CU.k*4)/4;
 const gy=Math.round(H*.8),proj=p=>{const u=p.x-CU.mid.x,v=p.y-CU.mid.y;return {x:W/2+u*k,y:gy+v*k*.32,u,v};};
 const faceOf=d=>d.mode==='grip'&&d.gripFace?(d.gripFace*(ax.x>=0?1:-1)):(Math.cos(d.a)*ax.x+Math.sin(d.a)*ax.y>=0?1:-1);
 c.fillStyle='#1b1410';c.fillRect(0,0,W,H);
 CU.crowd??=crowdSeed(W);const ex=Math.max(...[A,B].map(d=>d.g.dead||d.fled||d.submit?0:(d.mode==='grip'||d.mode==='rear'||d.mode==='leap'?1:.4)));
 for(const p of CU.crowd){const y=H*.15+p.row*H*.075,bob=Math.abs(Math.sin(t*(3+ex*6)+p.ph))*ex*4;c.fillStyle=p.c;c.fillRect(Math.round(p.x),Math.round(y-bob),14,p.h+20);c.fillStyle=p.skin;c.fillRect(Math.round(p.x+3),Math.round(y-bob-8),8,8);if(ex>.6&&p.ph>3)c.fillRect(Math.round(p.x+(p.ph>4.5?-3:12)),Math.round(y-bob-14),3,10);}
 c.fillStyle='#3d2a1c';c.fillRect(0,H*.34,W,H*.32);for(let x=((-CU.mid.x*ax.x*k*.3)%46+46)%46-46;x<W;x+=46){c.fillStyle='#2c1e14';c.fillRect(Math.round(x),H*.34,3,H*.32);}c.fillStyle='#57402c';c.fillRect(0,H*.34,W,5);
 for(const fx of [W*.12,W*.88]){const fl=Math.sin(t*13+fx)*2;c.fillStyle='#3a2a1a';c.fillRect(fx-2,H*.25,4,26);c.fillStyle='#f0a032';c.fillRect(fx-4,H*.22+fl,8,9);c.fillStyle='#ffe28a';c.fillRect(fx-2,H*.23+fl,4,5);}
 const sand=c.createLinearGradient(0,H*.66,0,H);sand.addColorStop(0,'#7d6340');sand.addColorStop(1,'#a3845a');c.fillStyle=sand;c.fillRect(0,H*.66,W,H*.34);
 for(let i=0;i<70;i++){const x=((hrand(i)*W*1.5-CU.mid.x*ax.x*k*.6)%W+W)%W,y=H*.68+hrand(i+3)*H*.3;c.fillStyle=i%2?'#6b5435':'#b29466';c.fillRect(Math.round(x),Math.round(y),2+(i%3),1);}
 for(const s of M.stains){const q=proj(s);if(q.x<-20||q.x>W+20||Math.abs(q.v)>90)continue;c.fillStyle=s.r>3?'#5d140f':'#741c14';const rw=Math.max(2,s.r*k*.55),rh=Math.max(1,s.r*k*.16);c.fillRect(Math.round(q.x-rw/2),Math.round(q.y-rh/2+4),Math.round(rw),Math.round(rh));}
 // Projektion eines Bisspunkts am anderen Hund in die Nahansicht
 const scr=d=>{const q=proj(d);return {q,f:faceOf(d)};};
 const anchorScr=(v,part,tt)=>{const {q,f}=scr(v),Rv=rig(v,tt),a=Rv.anchors[part]||Rv.anchors.hals,s=v.P.sz;return {x:q.x+f*s*k*a.x,y:q.y+k*(-(v.z||0)+s*a.y)};};
 const order=[A,B].map(d=>({d,...scr(d)})).sort((x,y)=>(x.d.mode==='grip')-(y.d.mode==='grip')||x.q.v-y.q.v);
 for(const {d,q,f} of order){if(d.pool){c.fillStyle='#4c0f0b';c.beginPath();c.ellipse(q.x-2*f*k,q.y+4,d.pool.r*k*1.2,d.pool.r*k*.2,0,0,TAU);c.fill();}
  const tg=targetFor(d,Math.round(q.x),Math.round(q.y),k,f,anchorScr);drawDog(c,{...d,pool:null},Math.round(q.x),Math.round(q.y),k,f,{spray:false,target:tg});}
 for(const d of [A,B])for(const p of d.spray){const q=proj(p);c.fillStyle=p.s>1?'#7d150e':'#a3261b';const s=Math.max(2,Math.round(k*.55*p.s));c.fillRect(Math.round(q.x),Math.round(q.y-p.z*k),s,s);}
 const vign=c.createRadialGradient(W/2,H*.6,H*.3,W/2,H*.6,W*.75);vign.addColorStop(0,'#0000');vign.addColorStop(1,'#000a');c.fillStyle=vign;c.fillRect(0,0,W,H);
 c.font='bold 15px Georgia,serif';for(const {d,q} of order){const h=DOG.health(d),yy=d===A?0:30;c.fillStyle='#0008';c.fillRect(q.x-56,22+yy,112,24);c.fillStyle=d.team?'#e58b6d':'#7fc4bc';c.textAlign='center';c.fillText(d.g.name+(d.g.dead?' †':d.submit?' (unterwirft sich)':d.fled?' (flieht)':''),q.x,38+yy);c.fillStyle='#3a1510';c.fillRect(q.x-40,42+yy,80,3);c.fillStyle='#c7432f';c.fillRect(q.x-40,42+yy,80*h/100,3);}
};

// =====================================================================================================
// HUNDE IM SPIELSTAND (Hundefang, Arena): Zustand zwischen den Kämpfen, Kämpfer bauen, Ergebnis zurückschreiben
// D.cond = {blood, t:{kopf,hals,brust,bauch,vl,hl} als Anteil 0–1, wounds:[…]}; fehlt cond, ist der Hund unverletzt.
// =====================================================================================================
const PARTKEYS=Object.keys(PART_MAX);
DOG.cond=D=>D.cond??={blood:100,t:Object.fromEntries(PARTKEYS.map(p=>[p,1])),wounds:[]};
// Gesundheit in Prozent wie DOG.health, aber aus dem gespeicherten Zustand
DOG.condHealth=D=>{const c=DOG.cond(D),t=c.t;return cl(Math.min(t.kopf,t.hals,t.brust,(t.bauch*PART_MAX.bauch+t.vl*PART_MAX.vl+t.hl*PART_MAX.hl)/(PART_MAX.bauch+PART_MAX.vl+PART_MAX.hl))*100*Math.min(1,c.blood/75),0,100);};
DOG.fit=D=>!D.dead&&DOG.condHealth(D)>=45&&DOG.cond(D).blood>=50;
DOG.makeFighter=function(D,team,x,y){const a=DOG.makeActor(D,team,x,y),c=DOG.cond(D);for(const p of PARTKEYS)a.tissue[p]=a.max[p]*cl(c.t[p]??1,.05,1);a.blood=cl(c.blood,15,100);a.wounds=(c.wounds||[]).map(w=>({...w,t:-1e9}));a.morale=100;return a;};
// Nach dem Kampf: Zustand, Bilanz, Tod; Lernen: jeder überstandene Kampf rückt die Istwerte 4 % der Lücke zum Sollwert heran (Sieg 7 %)
DOG.writeBack=function(a,won){const D=a.dog?._src||a.dog;if(!D)return;const c=DOG.cond(D);c.blood=Math.round(cl(a.blood,0,100));for(const p of PARTKEYS)c.t[p]=Math.round(cl(a.tissue[p]/a.max[p],0,1)*100)/100;c.wounds=(a.wounds||[]).slice(-24).map(({part,u,v,size,kind,seed})=>({part,u,v,size,kind,seed}));
 D.fights=(D.fights||0)+1;if(won)D.wins=(D.wins||0)+1;else D.losses=(D.losses||0)+1;D.kills=(D.kills||0)+(a.kills||0);
 if(a.g.dead){D.dead=true;D.cause=a.g.cause||'Im Kampf gestorben';D.killer=a.g.killer||'';D.deathDay=S.day;return;}
 const f=won?.07:.04;for(const [k] of STATS){const gap=(D.caps[k]||0)-(D.stats[k]||0);if(gap>0)D.stats[k]=Math.round((D.stats[k]+gap*f)*10)/10;}};
// Heilung je Tag: Blut +20, jedes Körperteil +15 % (höchstens voll), alte Wunden verblassen
DOG.heal=function(D,days=1){if(D.dead)return;const c=DOG.cond(D);for(let i=0;i<days;i++){c.blood=Math.min(100,c.blood+20);for(const p of PARTKEYS)c.t[p]=Math.min(1,Math.round((c.t[p]+.15)*100)/100);if(c.wounds.length)c.wounds.splice(0,Math.max(1,Math.ceil(c.wounds.length/3)));}};
// Kampfwert (Skala der Arena): ein frisch gewürfelter Hund (Ist ≈ Soll − 20) entspricht dem Menschen seiner Zielstufe
// (Kampf-Soll 37 → Stufe 0, Mastiff 62 → Stufe 3,4, Wolf 82 → Stufe 6; Kampfwert eines Gegners der Stufe q ≈ 33 + 14·q). Stärkere Istwerte zählen mit.
DOG.targetQ=soll=>cl((soll-37)/7.4,-1,6);
// Totenköpfe (Hundefang) nach Kampf-Soll: 1 unter 38 · 2 bis 50 · 3 bis 60 · 4 bis 70 · 5 ab 70
DOG.SKULLS=[38,50,60,70];
DOG.skullsOf=soll=>1+DOG.SKULLS.filter(x=>soll>=x).length;
DOG.kw=function(D,withCond=true){const B=breed(D.breed),fresh=kampfOf(Object.fromEntries(STATS.map(([k])=>[k,Math.max(1,B.werte[k]-20)]))),now=kampfOf(D.stats);
 const base=Math.max(18,33+14*DOG.targetQ(B.soll))*Math.pow(Math.max(.3,now/fresh),1.1)*Math.pow(D.weight/(B.kg0||80),.25);
 return Math.max(5,Math.round(base*(withCond?Math.pow(Math.max(.05,DOG.condHealth(D)/100),.6):1)));};
// Gefangene Hunde aus alten Spielständen (vor 27.10.2026) auf die neuen Rassenwerte umrechnen: jeder Ist- und Sollwert
// wandert um den Unterschied zwischen altem und neuem Sollwert der Rasse; eigene Abweichung und Trainingsfortschritt bleiben.
DOG.migrate=function(D){if(!D||D.wv>=2)return D;const B=breed(D.breed),o=OLD[B.id];
 if(o){STATS.forEach(([k],i)=>{const d=B.werte[k]-(o[0]+o[i+1]);if(D.caps&&k in D.caps)D.caps[k]=cl(Math.round(D.caps[k]+d),1,100);if(D.stats&&k in D.stats)D.stats[k]=cl(Math.round((D.stats[k]+d)*10)/10,1,D.caps?.[k]??100);});}
 D.soll=B.soll;D.wv=2;return D;};
window.DOG_LOADED=true;
})();
