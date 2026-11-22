// WAS DIE DATEI TUT: Gebäudeliste eines Orts (AT3 N6b2c1): jedes Gebäude mit Anzahl, Grundfläche, Zweig und Lage aus Seed, Einwohnern, Ständen, Biom und Leitgebäuden.
// Grundlage ist die von Thomas freigegebene Skizze der 10.000er-Großstadt (prototypes/n6b2-skizze/stadt.py), mit den Einwohnern skaliert (Thomas 22.11.2026).
// Dieselbe Liste plant der Stadtplan (N6b2c2/c3) und zeigt später die Stadtübersicht N9b: gleiche Eingabe = gleiche Liste auf jedem Gerät.
// Alle Zahlen sind Vorschläge (Regel 11): Versorgung je 10.000 Einwohner (MEHR), Grundbedarf je Größe (GRUND), Bewohner je Haus (WOHNEN).
// Kerne: reine Rechnung ohne Bildschirm, rund 0,1 ms je Ort, nur beim Planen eines Ortsbilds bzw. beim Öffnen der Stadtübersicht. Kein Notausschalter nötig (Spiel nutzt sie noch nicht).
(function(root){
'use strict';
// Größe des Orts wie orte.js (2 Weiler … 7 Hauptstadt); 1 = Gehöft (Außenposten N5c). Höchste Gebäudestufe je Größe wie orte.js STUFE.
var GNAME=['','homestead','hamlet','village','market-town','city','great-city','capital'];
var STUFE=[0,1,2,3,4,5,6,6];
// Grundfläche in Planfeldern (Maßstab 1, stadtbild.js skaliert ×1,5). Aus der Skizze (FIX); alle anderen nach der Größe in gebaeude.json (fuss).
var FIX={market:[6,6],theatre:[6,7],medicus:[2,3],cemetery:[7,6],kitchen:[2,2],blacksmith:[3,3],lager:[3,3],forum:[9,9],governor:[6,6],senate:[5,6],bathhouse:[5,5],
 temple:[4,5],ropewalk:[2,6],aqueduct:[1,6],well:[1,1],shrine:[1,1],posca:[1,1],warehouse:[4,4],'cart-yard':[4,4],guildhall:[4,4],tenement:[2,3],townhouse:[2,2],
 domus:[3,3],villa:[4,4],palazzo:[6,6],shack:[1,1],cottage:[2,2],inn:[3,3],tavern:[3,3],school:[3,3],granary:[3,3],cistern:[3,3],'trading-post':[3,3],
 barracks:[4,5],'royal-palace':[10,10]};
// Versorgung: Anzahl je 10.000 Einwohner (Skizze MEHR); alle übrigen erlaubten Gebäude 1 je 10.000. Nachkommastellen entscheidet der Seed.
var MEHR={well:10,shrine:6,latrine:6,tavern:6,bakery:5,butcher:3,'porridge-kitchen':3,inn:3,medicus:2,blacksmith:3,posca:3,apothecary:2,cobbler:3,tailor:3,potter:2,
 granary:3,warehouse:2,'watch-house':4,temple:3,cistern:2,mill:2,kitchen:3,'firewood-yard':2,pawnshop:2,'vice-den':2,spinner:2,weaver:2,carpenter:2,mason:2,chandler:2,
 barracks:1};
// Höchstens eins je Ort (Sitz der Verwaltung)
var EINZEL={governor:1,senate:1,forum:1,'royal-palace':1};
// Grundbedarf: mindestens eins ab dieser Größe (Vorschlag, wie die Zusatzteile aus N6a), sofern im Biom erlaubt
var GRUND=[[2,['well','shrine']],[3,['tavern','market']],[4,['temple','watch-house','latrine']],[5,['bathhouse','barracks','forum','granary']],
 [6,['governor','theatre','aqueduct']],[7,['senate','royal-palace']]];
// Lage: Umland = Felder, Herden, Rohstoffe (Gehöfte und Posten, N6b2c3); Tor = stinkendes Gewerbe, Tote (vor den Toren); sonst innen
var NICHT_UMLAND={well:1,cistern:1,'firewood-yard':1,stable:1};
var UMLAND_EXTRA={'bacchant-grove':1};
var TOR={tannery:1,renderer:1,dyeworks:1,limekiln:1,brickworks:1,smelter:1,cemetery:1,undertaker:1,'coffin-maker':1,'tear-press':1,'smoke-curer':1,charcoal:1,'purple-works':1,garum:1};
// Wohnen je Stand 1–6 (Wretches … Nobles): Haus und Bewohner je Haus. Auf dem Land wie gebaeude.json (wohnt.n), in der 10.000er-Skizze dichter;
// dazwischen gleitend über die Einwohner (log, 250 → 10.000), damit eine große Stadt nie weniger Häuser hat als ein kleiner Marktflecken mit gleich vielen Leuten.
var WOHNEN=[{haus:'shack',land:6,stadt:10},{haus:'cottage',stadtHaus:'tenement',ab:1000,land:6,stadt:38},{haus:'townhouse',land:8,stadt:18},
 {haus:'domus',land:8,stadt:36},{haus:'villa',land:10,stadt:50},{haus:'palazzo',land:12,stadt:100}];
var WOHNHAUS={shack:1,cottage:1,townhouse:1,domus:1,villa:1,palazzo:1,tenement:1};
var EXTRA={barracks:{id:'barracks',name:'Barracks',zweig:'military/garrison',stufe:3,biom:['alle'],bereich:'dorf',groesse:{w:8,h:10}}};

function hashT(s){var h=2166136261>>>0;s=String(s);for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h}
function u01(seed,k){var h=Math.imul((seed>>>0)^hashT(k),2654435761)>>>0;h^=h>>>15;h=Math.imul(h,2246822519)>>>0;h^=h>>>13;return (h>>>0)/4294967296}
function fuss(g){if(FIX[g.id])return FIX[g.id].slice();var w=g.groesse.w,h=g.groesse.h,m=Math.max(w,h);
 if(m<=4)return[2,2];if(m<=6)return w!==h?[2,3]:[3,3];if(m<=8)return[3,3];if(m<=12)return[4,4];return[5,5]}
function lage(id,zweig){if(TOR[id])return 'tor';if(UMLAND_EXTRA[id]||(zweig==='economy/land'&&!NICHT_UMLAND[id]))return 'umland';return 'innen'}
function anteil(einw){var t=Math.log(Math.max(250,einw)/250)/Math.log(10000/250);return t<0?0:t>1?1:t}

// Daten einmal vorbereiten: gebaeude.json → nach Kennung
function daten(geb){var G={},L=(geb.gebaeude||geb);L.forEach(function(g){G[g.id]=g});for(var k in EXTRA)if(!G[k])G[k]=EXTRA[k];return{G:G,L:Object.keys(G).map(function(k){return G[k]})}}

// o: {seed, g (1–7), einw, stufen [6] (Einwohner je Stand, aus orte.bilanz), biom, leit [{id, n}]}. D aus daten().
function liste(o,D){var g=o.g|0,einw=Math.max(0,o.einw|0),biom=o.biom||'mediterranean',seed=o.seed>>>0,f=einw/10000,n={},quelle={};
 var erlaubt=function(x){return x&&x.bereich!=='arena'&&(x.biom.indexOf('alle')>=0||x.biom.indexOf(biom)>=0)&&(x.stufe||1)<=STUFE[g]&&(x.id!=='royal-palace'||g>=7)};
 var plus=function(id,k,q){if(k>0){n[id]=(n[id]||0)+k;if(!quelle[id])quelle[id]=q}};
 if(g>=2)D.L.forEach(function(x){if(!erlaubt(x)||WOHNHAUS[x.id])return;var l=lage(x.id,x.zweig);if(l==='umland')return;
  var e=(MEHR[x.id]||1)*f,k=Math.floor(e);if(u01(seed,'v|'+x.id)<e-k)k++;if(EINZEL[x.id])k=Math.min(1,k);plus(x.id,k,'versorgung')});
 GRUND.forEach(function(r){if(g>=r[0])r[1].forEach(function(id){if(erlaubt(D.G[id])&&!n[id]){n[id]=1;quelle[id]='grund'}})});
 (o.leit||[]).forEach(function(l){var x=D.G[l.id];if(!x)return;var k=Math.max(0,l.n|0);if(EINZEL[l.id])k=Math.min(1,k);if(k>(n[l.id]||0)){n[l.id]=k;quelle[l.id]='leit'}});
 // Wohnen
 var wohnen=[],t=anteil(einw),st=o.stufen||[];
 if(g<=1){n.cottage=1;quelle.cottage='wohnen'}
 else for(var s=0;s<6;s++){var leute=st[s]|0;if(!leute)continue;var W=WOHNEN[s],haus=W.stadtHaus&&einw>=W.ab?W.stadtHaus:W.haus,je=Math.max(1,Math.round(W.land+(W.stadt-W.land)*t)),k2=Math.ceil(leute/je);
  plus(haus,k2,'wohnen');wohnen.push({stand:s+1,leute:leute,haus:haus,je:je,n:k2})}
 var L=[],sum={gebaeude:0,innen:0,tor:0,umland:0,flaeche:0,flaecheTor:0},zw={};
 Object.keys(n).forEach(function(id){var x=D.G[id];if(!x||!n[id])return;var fs=fuss(x),l=WOHNHAUS[id]&&id==='shack'?'tor':lage(id,x.zweig),z=x.zweig.split('/')[0],e={id:id,name:x.name,n:n[id],w:fs[0],h:fs[1],
   zweig:x.zweig,haupt:z,lage:l,stufe:x.stufe||1,quelle:quelle[id]};
  // Elendsbuden stehen nur in Orten mit Mauer vor dem Tor (N6b2c3); in offenen Orten am Rand
  if(id==='shack'&&g<4)e.lage='innen';
  L.push(e);sum.gebaeude+=e.n;sum[e.lage]+=e.n;if(e.lage==='innen')sum.flaeche+=e.n*e.w*e.h;else if(e.lage==='tor')sum.flaecheTor+=e.n*e.w*e.h;
  zw[z]=(zw[z]||0)+e.n});
 var R={households:0,administration:1,faith:2,military:3,economy:4,underworld:5};
 L.sort(function(a,b){return (R[a.haupt]-R[b.haupt])||(b.w*b.h-a.w*a.h)||(a.id<b.id?-1:a.id>b.id?1:0)});
 return{g:g,art:GNAME[g],einw:einw,biom:biom,gebaeude:L,wohnen:wohnen,summe:sum,zweige:zw}}

// Für Orte aus orte.js: Bilanz (b) + Biom
function ausBilanz(b,biom,seed,D){return liste({seed:(seed>>>0)^b.roh.zelle,g:b.roh.g,einw:b.einwohner,stufen:b.stufen,biom:biom,leit:b.leit},D)}
// Probeort ohne Welt (Master-Editor, Tests): Einwohner und Stände nach orte.js ANTEIL und HOCH
var ANTEIL=[200,450,200,100,40,10],HOCH=[0,1,2,3,4,5,6,6];
function groesseFuer(einw){return einw<20?1:einw<60?2:einw<250?3:einw<1000?4:einw<3000?5:einw<10000?6:7}
function probe(einw,biom,seed,D,leit){var g=groesseFuer(einw),st=[0,0,0,0,0,0],sumA=0,i;for(i=0;i<HOCH[g];i++)sumA+=ANTEIL[i];
 var rest=einw;for(i=0;i<HOCH[g];i++){st[i]=i===HOCH[g]-1?rest:Math.round(einw*ANTEIL[i]/sumA);rest-=st[i]}
 return liste({seed:seed,g:g,einw:einw,stufen:st,biom:biom,leit:leit||[]},D)}

var P={GNAME:GNAME,STUFE:STUFE,FIX:FIX,MEHR:MEHR,EINZEL:EINZEL,GRUND:GRUND,TOR:TOR,WOHNEN:WOHNEN,daten:daten,liste:liste,ausBilanz:ausBilanz,probe:probe,groesseFuer:groesseFuer,fuss:fuss,lage:lage};
if(typeof module!=='undefined'&&module.exports)module.exports=P;else root.AT3_STADTLISTE=P;
})(typeof self!=='undefined'?self:this);
