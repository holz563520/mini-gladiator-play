// WAS DIE DATEI TUT: Herrscher, Vorsteher und Vorgeschichte von Arena Theory 3.0 (Schritt N4c2): jede Person entsteht beim Antippen aus Seed und Nummer
// (Einheit aus weltgen.js „Herrschaften“ bzw. Ortsnummer), nichts davon liegt in der Erde. Gleicher Seed + gleiche Nummer = gleiche Person auf jedem Gerät.
// Kerne: reine Rechnung ohne Bildschirm, wenige Mikrosekunden je Person. Im Hauptkern beim Antippen (Spiel, Fernansicht) und im Master-Editor (Weltansicht).
// Entscheidungen Thomas (20.11.2026): eigene Namensliste je Kultur (8 Vornamen, 6 Familiennamen), nur Männer, Charakter = ein Zug aus 1.0 + ein Laster,
// Haltung zur Arena nach dem Kulturwert „arena-love“ mit Streuung, Vermögen nach Stufe × Gier der Kultur (Vorschlag), Vorgeschichte aus Bausteinen;
// alle Texte im Chat freigegeben, sie liegen in sprache/en.json (person.*, chronik.*); Namen sind Eigennamen und stehen hier (wie ortsnamen.js).
// Person (Datensatz, gepackt 16 Byte, siehe pack): {kultur, vor, fam, alter, zug 0–15, laster 0–11, arena 1–5, gold}. Notausschalter ?n4c2=0 (Anzeige wie N4c1).
(function(root){
'use strict';
var AUS=!!(root.location&&/[?&]n4c2=0/.test(root.location.search||''));
// Namen je Kultur (Nummer 1–24 wie kulturen.json): Vornamen | Familiennamen
var NAMEN=[
 'Aurelius Cassivus Maxentius Tullarius Severan Velius Octavan Lucretan|Cassivel Maxenta Tullaris Aurelan Severinus Velicor',
 'Thalon Marios Peridas Naukles Salenos Coralis Doros Pontikos|Thalassides Naukratos Salenides Coralakis Peridotes Ankyros',
 'Sophronos Logikles Theorus Dialektes Axion Paradoxos Syllogas Premisios|Thesides Antithon Synthos Dialogos Aporides Ergon',
 'Zerrin Qumar Sabbad Tolmek Karrun Dunar Hassek Mirrab|Tollbar Qumarri Sabbeth Karrdun Tolmesh Dunerak',
 'Ammerel Ossan Welrun Palmyr Shimmar Rashet Oasan Cuprah|Ossaru Shimmerak Palmerash Rashuun Cisternos Dropwell',
 'Nehetep Soberon Ankhet Merenef Tefnar Khebu Floodmet Silthotep|Nehetari Merkheb Tefanu Ankhesu Silthos Inundar',
 'Karvak Torgul Ulgar Haskar Yurten Torvan Hoofrik Bator|Ulgaskar Batorin Yurtek Haskvan Saddlebek Torhoof',
 'Ulmar Darek Ostrin Ravel Keshmir Bannoch Feudan Vexil|Ulmorin Darkesh Ostbann Ravellan Grudgehold Standarov',
 'Haldric Barlow Cornell Wheaton Ambrel Sheafric Tillan Harrow|Barleygrave Sheafwright Haldane Furrowby Chaffton Stubblefield',
 'Brenric Hurdan Dallach Torrin Kinwald Mootley Hornbert Grazeling|Cowell Herdsby Dallock Torrhorn Moothall Calvering',
 'Wendric Oakley Ashcombe Bramwell Hazelric Thornwald Elmer Rowan|Oakenshaw Ashgrove Brambleton Hazelwood Rootsworth Barkley',
 'Gorrik Hogarth Mastric Swillan Rookard Tuskin Grunwald Trotter|Hogsbane Mastbelly Swillmore Rookhollow Tusker Sowerby',
 'Skarni Ulfgar Hrimolf Tjalvar Pinrik Brennulf Grimvald Sulkar|Pinewall Hrimsbane Tjalgard Skarnholt Frostbeard Longwinter',
 'Vostrik Sablon Ermin Kovrin Lynxar Petrel Minkel Pelton|Vostrane Sablemont Erminhall Peltmark Lynxwood Hideborne',
 'Ilvaro Rimund Haelric Snorvald Frostan Taigon Thawn Shiveric|Rimeholt Frostvote Haelborn Icemoot Thawsby Coldspeech',
 'Glacor Wyrmund Hoarvik Brumal Sleetan Icarn Frostfang Whitmar|Glacierward Wyrmwatch Hoarstone Brumgard Sleetborne Endmark',
 'Sarrowen Kopjan Thornel Lionel Acacion Umbero Maneric Prideval|Thornfence Kopjestone Acaciamere Lionsgate Umberline Dustcrown',
 'Tamarin Bovan Dunnor Rathel Calvero Herdric Hornwald Lowan|Hornwright Bovalis Dunnhide Rathmoor Calvaro Tenhorns',
 'Olothec Verdan Quellix Ziggur Ixamar Pyrran Stepward Altoc|Highstep Verdanix Quelloth Zigguran Templeton Ixqual',
 'Pellan Dyer Indigar Carmine Lacquan Vermillo Tinctor Ochren|Purplehand Dyewright Indigrove Carmindo Lacquerley Stainsworth',
 'Fenric Boggart Murkin Leechard Wallis Sloughan Quagmund Reedley|Mirebottom Bogsworth Murkwater Leechmore Fenwick Damplow',
 'Callorin Rootan Brackley Tidan Keelan Snagwell Barnabus Driftan|Rootwalker Brackwater Tidemark Keelhaul Saltknot Driftley',
 'Durrin Slaton Granbor Basaltar Orrik Kragmund Flint Hammrik|Stonebrow Slatebeard Granitehand Oredeep Kragsplitter Quarrymaw',
 'Heskel Nimbus Cirran Peakard Vaporin Altus Ascendo Stratos|Highcell Cloudmere Nimbaro Thinair Cirrostan Summitson'
].map(function(s){var a=s.split('|');return[a[0].split(' '),a[1].split(' ')]});
// Kulturwerte 1–5 je Kultur 1–24 (muss zu kulturen.json passen, tests/at3-n4c2.cjs), fest hier, damit Spiel und Editor dieselbe Vorgeschichte zeigen
var GIER =[5,5,3,5,4,3,2,3,3,3,3,5,3,5,2,1,4,3,3,5,5,5,3,2];
var ARENA=[5,3,4,3,3,4,4,4,3,3,3,4,4,3,3,2,5,3,4,3,3,3,4,2];
var GRAUSAM=[4,2,2,3,3,3,4,4,2,2,2,4,4,3,3,3,3,3,4,2,4,3,3,2], FROMM=[3,2,1,3,5,5,3,3,4,3,4,2,3,2,3,4,3,3,5,2,2,2,4,5], EHRE=[3,2,4,2,3,3,5,5,4,4,4,2,5,2,4,5,4,5,3,2,1,2,5,3];
var TIEF=[2,2,1,1,1,1,1,0];          // tiefste Stufe je System (wie weltgen.HS_G[sys].length)
var KOLLEKTIV={'3.0':1,'4.0':1};     // Republik und Händlerbund: das Reich führt ein Gremium, der Herrscher führt es an
var ZUEGE=16, LASTER=12, EREIGNISSE=12, HEUTE=8;
// Vermögen in Gold je Rang (Vorschlag, Regel 11): 0 Reich, 1 mittlere Einheit, 2 unterste Einheit, 3 Stadt- oder Hafen-Vorsteher, 4 Dorf-Vorsteher
var GOLD=[[100000,1000000],[20000,100000],[2000,20000],[500,5000],[50,1000]];
var ALTER=[[16,78],[25,75]];
// 32-Bit-Mischung (wie überall in AT3: gleiche Zahl auf jedem Gerät)
function mix(a){a=Math.imul(a^a>>>16,0x7feb352d);a=Math.imul(a^a>>>15,0x846ca68b);return(a^a>>>16)>>>0}
function zz(seed,art,n,k){return mix((seed>>>0)^mix(art*0x9e3779b1+n*0x85ebca77+k*0xc2b2ae3d))}
function wahl(r,n){return r%n}
function rund(g){var s=g<1000?10:g<10000?50:g<100000?500:5000;return Math.max(s,Math.round(g/s)*s)}
// Person aus Seed, Art (1 Herrscher einer Einheit, 2 Vorsteher eines Orts, 3 Gründer eines Reichs), Nummer, Kultur 1–24 und Rang 0–4
function person(seed,art,n,kultur,rang){var c=Math.max(1,Math.min(24,kultur|0)),r=function(k){return zz(seed,art,n,k)},A=ALTER[rang?1:0];
 var f=(r(6)%1000)/1000,lo=GOLD[rang][0],hi=GOLD[rang][1],g=lo*Math.pow(hi/lo,f)*(0.6+0.2*GIER[c-1]);
 var sp=[-2,-1,-1,0,0,0,0,1,1,2][r(5)%10],ar=Math.max(1,Math.min(5,ARENA[c-1]+sp));
 return{kultur:c,vor:wahl(r(1),8),fam:wahl(r(2),6),alter:A[0]+r(3)%(A[1]-A[0]+1),zug:r(4)%ZUEGE,laster:r(7)%LASTER,arena:ar,gold:rund(g)}}
function rangEinheit(e){return e.stufe===0?0:e.stufe>=TIEF[e.sys]?2:1}
// Herrscher einer Einheit (e aus AT3HERRSCHAFT.einheit/info)
function herrscher(seed,e){if(!e||!e.kultur)return null;var p=person(seed,1,e.u,e.kultur,rangEinheit(e));p.sys=e.sys;p.stufe=e.stufe;p.amt='h';return p}
// Vorsteher eines Orts (k Ortsnummer, art 1 Dorf, 2 Stadt, 3 Hafendorf, 4 Hafenstadt; e Einheit des Orts)
function vorsteher(seed,k,art,e){if(!e||!e.kultur)return null;var p=person(seed,2,k,e.kultur,art===1?4:3);p.sys=e.sys;p.art=art;p.amt='v';return p}
function name(p){var N=NAMEN[p.kultur-1];return N[0][p.vor]+' '+N[1][p.fam]}
function amt(p,t){return p.amt==='v'?t('person.vorsteher.'+p.sys+'.'+(p.art===1?0:p.art===2?1:2)):t('reich.titel.'+p.sys+'.'+p.stufe)}
// „King Haldric Barleygrave“ bzw. beim Gremium „the Consuls: Sophronos Thesides“
function titelName(p,t){return p.amt==='h'&&KOLLEKTIV[p.sys+'.'+p.stufe]?t('person.kollektiv',{titel:amt(p,t),name:name(p)}):amt(p,t)+' '+name(p)}
function steckbrief(p,t){return t('person.zeile',{name:titelName(p,t),alter:p.alter,zug:t('person.zug.'+p.zug),laster:t('person.laster.'+p.laster),gold:String(p.gold).replace(/\B(?=(\d{3})+(?!\d))/g,','),arena:t('person.arena.'+p.arena)})}
function arenaSatz(p,t){return t('person.arenaSatz.'+p.arena)}
// Datensatz gepackt (für spätere Spielstände, Phase P): 16 Byte
function pack(p){var b=new Uint8Array(16),v=new DataView(b.buffer);b[0]=p.kultur;b[1]=p.vor|p.fam<<4;b[2]=p.alter;b[3]=p.zug|p.laster<<4;b[4]=p.arena|(p.amt==='v'?8:0);b[5]=p.sys|p.stufe<<4;b[6]=p.art||0;v.setUint32(8,p.gold);return b}
// Vorgeschichte eines Reichs: L = Kette ab dem Reich (info von herrschaften.js, L[0] mit Stufe 0); HN(e) = Name einer Einheit (herrschaften.name)
function chronik(seed,L,t,HN){var e=L[0];if(!e||e.stufe!==0||!e.kultur)return '';var c=e.kultur,r=function(k){return zz(seed,4,e.u,k)};
 var h=herrscher(seed,e),g=person(seed,3,e.u,c,0),w={founder:name(g),seat:e.sitzName||'',ruler:KOLLEKTIV[e.sys+'.0']?name(h):titelName(h,t)};
 // Ereignis: alle zwölf, dazu Häufung nach den stärksten Werten der Kultur (Gier: 4, 8, 11 · Grausamkeit: 5, 7, 10 · Frömmigkeit: 3, 7 · Arenaliebe: 10 · Ehre: 2, 9)
 var pool=[1,2,3,4,5,6,7,8,9,10,11,12];
 if(GIER[c-1]>=4)pool.push(4,8,11);if(ARENA[c-1]>=4)pool.push(10);if(GRAUSAM[c-1]>=4)pool.push(5,7,10);if(FROMM[c-1]>=4)pool.push(3,7);if(EHRE[c-1]>=4)pool.push(2,9);
 var s=[t('chronik.gruendung.'+e.sys,w),t('chronik.ereignis.'+pool[r(1)%pool.length],w)];
 if(e.vasall&&L[1]&&HN)s.push(t('chronik.vasall',{lord:HN(L[1],t)}));   // Vasallen: vor der Lage heute
 s.push(t('chronik.heute.'+(1+r(2)%HEUTE),w));
 return s.join(' ')}
var P={AUS:AUS,NAMEN:NAMEN,GIER:GIER,ARENA:ARENA,TIEF:TIEF,GOLD:GOLD,ALTER:ALTER,ZUEGE:ZUEGE,LASTER:LASTER,EREIGNISSE:EREIGNISSE,HEUTE:HEUTE,
 person:person,herrscher:herrscher,vorsteher:vorsteher,name:name,amt:amt,titelName:titelName,steckbrief:steckbrief,arenaSatz:arenaSatz,pack:pack,chronik:chronik,GRAUSAM:GRAUSAM,FROMM:FROMM,EHRE:EHRE};
if(typeof module!=='undefined'&&module.exports)module.exports=P;else root.AT3HERRSCHER=P;
})(typeof self!=='undefined'?self:this);
