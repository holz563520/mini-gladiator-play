// WAS DIE DATEI TUT: Kampfkern von Arena Theory 3.0 (Schritt G9a, G9b: erzeugt auch die Laborkämpfer Mensch, Hund, Löwe). Eigener Hintergrundkern, der die UNVERÄNDERTEN Kampfdateien aus 1.0 lädt
// (wie der Spionage-Worker arena-spy-worker.js) und Kampfaufträge aus kampfanschluss.js rechnet: gleicher Seed + gleiche Kämpfer = gleicher Kampf.
// Kerne: läuft nur als Worker, getrennt vom Weltkern; wird erst gestartet, wenn ein Kampf gebraucht wird. Ein Kampf zur Zeit.
// Gleichheit: 1.0 rechnet mit Kommazahlen. Auf demselben Gerät ist das Ergebnis immer gleich; die Welt übernimmt nur das fertige Ergebnis
// (Kampfanschluss, genau einmal) und rechnet den Kampf nie nach.
// In Node-Tests wird diese Datei nach den 1.0-Dateien geladen (ohne importScripts), dann steht KK.rechne direkt bereit.
'use strict';
(function(G){
var DATEIEN=['arena-headless','data','household','management','scout','sim','benchmark','school','world','forge','spy','arena','techniques','manager','school-ui','world-ui','mobile','ludus','intro','forge-ui','forge-intro','scene-nav','barracks','trader','wanderer-talk','wanderers','smith-wrath','archer-plot','hall','lion','hahn-engine','hahn-arena','arena-beasts','hund','arena-core'];
var imWorker=typeof importScripts==='function'&&typeof G.document==='undefined';
var KK={DATEIEN:DATEIEN,bereit:false};G.AT3Kampfkern=KK;
// Laden: die 1.0-Dateien in fester Reihenfolge. Vor world.js bekommt 1.0 eine leere Schulwelt, sonst erzeugt world.js beim Laden 30 Schulen
// mit 540 Gladiatoren (rund 10 s), die AT3 nie braucht: AT3-Kämpfer kommen aus der AT3-Welt. Die Kampfrechnung selbst bleibt unverändert.
KK.lade=function(laufe){DATEIEN.forEach(function(n){if(n==='world'){var S=G.MG.s;
  S.world={version:1,schools:[{id:'at3-leer',name:'',roster:[],teams:[],history:[],strength:1,rankPoints:0,fame:0,wins:0,losses:0}],people:{},teams:{},weapons:{},names:{},lastDay:S.day,log:[],spyReports:[]};}
 laufe(n);});};
var v='';if(imWorker){G.window=G;v=(G.location.search.match(/[?&]v=([^&]*)/)||[])[1]||'';KK.lade(function(n){importScripts('../'+n+'.js?v='+v);});}
// G9b: Erzeugung der Laborkämpfer braucht zusätzlich arena-challenges.js aus 1.0 (Bausteine der Herausforderungen: Gladiator mit Ausrüstung nach
// Stufe, Löwe nach Stärke, Kampfwert). Erst bei der ersten Erzeugung geladen; ändert an der Kampfrechnung nichts. In Node lädt der Test die Datei vorher.
KK.ZUSATZ='arena-challenges';
function zusatz(){if(!G.Challenges&&imWorker)importScripts('../'+KK.ZUSATZ+'.js?v='+v);if(!G.Challenges)throw new Error('arena-challenges.js fehlt');}

function vorbereiten(){
 if(KK.bereit)return;
 var M=G.MG,S=M.s;S.started=true;S.lion={stage:'done',recruits:[],base:[]};S.medic={stage:'skip'};M.persist=function(){return true;};
 G.AN.headless=true;G.HahnArena.headless=true;G.Beasts.fx=false;
 // Die Kopie, die AN.headlessRun baut, abgreifen, um die Kämpferdaten nach dem Kampf zurückzugeben (1.0 bleibt unverändert, nur umhüllt)
 var bau=G.AN.build;G.AN.build=function(spec){KK.letzteSpec=spec;var b=bau.apply(this,arguments);KK.letzteKennung=b&&b.id;return b;};
 KK.bereit=true;}

// Auftrag aus kampfanschluss.js → Ergebnis {auftrag, sieger:0 blau|1 rot|-1 keiner, zeit, zeitAus, haengt, rechenMs, einheiten:[…]}
KK.rechne=function(auftrag){
 vorbereiten();
 var M=G.MG,AN=G.AN,t0=(G.performance||Date).now();
 M.s.rng=auftrag.seed>>>0;
 // G9b: Hunde und Löwen würfeln in 1.0 mit Math.random (Menschen mit MG.s.rng). Damit gleicher Seed auch bei Tieren denselben Kampf ergibt,
 // bekommt der Kampfkern für die Dauer eines Kampfs einen Math.random aus dem Seed. 1.0 bleibt unverändert; nur dieser Kern ist betroffen.
 var altZufall=Math.random,z=(auftrag.seed>>>0)^0x9e3779b9;
 Math.random=function(){z=(z+0x6D2B79F5)|0;var t=Math.imul(z^z>>>15,1|z);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
 var o;try{o=AN.headlessRun(auftrag.spec);}finally{Math.random=altZufall;}
 var nachher={};var sp=KK.letzteSpec;KK.letzteSpec=null;
 // Die Kampfkennung von 1.0 (Uhrzeit + Zufall) steht in Wunden und Narben; sie wird durch die Auftragskennung ersetzt (gleicher Auftrag = gleiche Daten)
 var bid=sp&&KK.letzteKennung,ersetze=function(x){if(!x)return null;var t=JSON.stringify(x);return JSON.parse(bid?t.split(JSON.stringify(bid)).join(JSON.stringify('at3:'+auftrag.id)):t);};
 KK.letzteKennung=null;
 if(sp)[].concat(sp.blue,sp.red).forEach(function(u){nachher[u.key]=ersetze(u.g||u.D||u.L);});
 return {auftrag:auftrag.id,seed:auftrag.seed>>>0,sieger:o.winner,zeit:o.time,zeitAus:!!o.timeout,haengt:!!o.stuck,
  rechenMs:Math.round(((G.performance||Date).now()-t0)*10)/10,
  einheiten:o.units.map(function(u){return {key:u.key,art:u.kind,name:u.name,team:u.team,tot:!!u.dead,unten:!!u.down,leben:u.health,verletzt:!!u.injured,schwer:!!u.severe,
   verletzungen:u.injuries||[],kills:u.kills||0,ursache:u.cause||'',toeter:u.killer||'',verlust:u.loss,g:nachher[u.key]||null};})};};

// ---------- G9b: Laborkämpfer erzeugen (Kampf-Labor im Master-Editor) ----------
// wunsch: {seed, teams:{blau:{art:'human'|'dog'|'lion', n:1–10, stufe:0–6}, rot:{…}}}. Stufe heißt bei allen Arten: so stark wie ein Mensch dieser
// Stufe (Kampfwert 33 + 14 × Stufe, die Umrechnung der 1.0-Herausforderungen). Gleicher Seed = gleiche Kämpfer. Ergebnis: {blau:[{kaempfer, reihe}], rot:[…]}
var FELD={human:'g',dog:'D',lion:'L'};KK.FELD=FELD;
KK.erzeuge=function(w){
 vorbereiten();zusatz();
 var M=G.MG,CH=G.Challenges,DOG=G.DOG,P=CH.P,r=CH.rngOf(w.seed>>>0),cl=function(x,a,b){return Math.max(a,Math.min(b,x));};
 var pick=function(a){return a[Math.floor(r()*a.length)];};
 M.s.rng=(w.seed>>>0)^0x5bd1e995;   // 1.0-Erzeugung (makeGladiator, Ausrüstung) würfelt mit MG.s.rng
 // 1.0 vergibt Kennungen mit crypto.randomUUID, und das Aussehen hängt an der Kennung (ensureIdentity). Für gleiche Kämpfer bei gleichem Seed
 // bekommt die Erzeugung kurz eigene, aus dem Seed gewürfelte Kennungen; danach gilt wieder die echte Funktion.
 var c=G.crypto,eigen=Object.prototype.hasOwnProperty.call(c,'randomUUID'),altUUID=c.randomUUID,ru=CH.rngOf((w.seed>>>0)^0x2545f491);
 var hex=function(n){var t='';for(var i=0;i<n;i++)t+=Math.floor(ru()*16).toString(16);return t;};
 c.randomUUID=function(){return hex(8)+'-'+hex(4)+'-4'+hex(3)+'-'+'89ab'[Math.floor(ru()*4)]+hex(3)+'-'+hex(12);};
 try{return erzeugeTeams(w,M,CH,DOG,P,r,cl,pick);}finally{if(eigen)c.randomUUID=altUUID;else delete c.randomUUID;}};
function erzeugeTeams(w,M,CH,DOG,P,r,cl,pick){
 var out={};
 ['blau','rot'].forEach(function(seite){var t=(w.teams&&w.teams[seite])||{},art=FELD[t.art]?t.art:'human',n=cl(t.n|0,1,10),q=cl(+t.stufe||0,0,6),kw=33+14*q,L=[];
  for(var i=0;i<n;i++){var daten,reihe='front';
   if(art==='human'){ // wie humanGroup in arena-challenges.js
    var rolle=i>0&&r()<.25?pick(['Assassine','Fernkämpfer']):'Soldat';daten=CH.gladiator(r,{q:q,role:rolle,kwTarget:kw});
    if(rolle==='Fernkämpfer'||n===10&&i>=5)reihe='back';}
   else if(art==='dog'){ // wie dog() in arena-challenges.js (dort nicht ausgeführt): Rasse nach Stufe, frisch gewürfelt, Istwerte bis zum Kampfwert strecken
    var B=DOG.BREEDS,qq=cl((kw-33)/14,-1,6),pool=B.filter(function(b){return Math.abs(DOG.targetQ(b.soll)-qq)<=1.2;}),b=pick(pool.length?pool:B);
    daten=DOG.create(b.id,Math.floor(r()*4294967295));
    for(var j=0;j<8;j++){var jetzt=DOG.kw(daten,false);if(Math.abs(jetzt-kw)<1.5)break;var f=cl(Math.pow(kw/jetzt,.9),.6,1.6);
     for(var k in daten.stats)daten.stats[k]=cl(Math.round(daten.stats[k]*f),3,99);for(k in daten.caps)daten.caps[k]=Math.max(daten.caps[k],daten.stats[k]);}}
   else{ // wie lionGroup: Löwenstärke aus der Gruppenstärke eines gleich starken Menschen
    var E=Math.pow(kw/30,P.gamma),score=cl(Math.pow(E/P.cl,1/P.gl),.08,2.4);daten=CH.lion(r,{score:score});}
   var einheit={kind:art};einheit[FELD[art]]=daten;
   L.push({reihe:reihe,kaempfer:{id:seite[0]+(i+1),name:daten.name||'?',art:art,herkunft:{art:'labor',ortId:null,name:'Kampf-Labor (Testkämpfer)'},geburtsort:null,
    kw:Math.round(CH.kw(einheit)*10)/10,rolle:art==='human'?daten.role:(art==='dog'?daten.breedName:daten.epithet)||'',g:JSON.parse(JSON.stringify(daten))}});}
  out[seite]=L;});
 return out;};

// ---------- G9c1: Sklavenmarkt (Thomas 17.11.2026: genau so ausgewürfelt wie in 1.0) ----------
// Wie trader.js stock() in 1.0: je Kandidat makeGladiator(0), danach special.roll (besondere.js: ab und zu Klein-/Riesenwuchs). 1.0 bleibt unverändert;
// besondere.js wird erst beim ersten Würfeln geladen und ändert an der Kampfrechnung nichts. MG.s.rng kommt aus dem Wunsch (Weltseed und Spieltag),
// Math.random (besondere.js, Kennungen) bleibt wie in 1.0 frei. wunsch: {seed, n:1–64}. Ergebnis: Liste fertiger 1.0-Gladiatoren (Kopien).
KK.ZUSATZ_MARKT='besondere';
KK.wuerfle=function(w){vorbereiten();if(!G.MG.special&&imWorker)importScripts('../'+KK.ZUSATZ_MARKT+'.js?v='+v);
 var M=G.MG,n=Math.max(0,Math.min(64,w.n|0)),out=[];M.s.rng=(w.seed>>>0)||1;
 for(var i=0;i<n;i++){var g=M.makeGladiator(0);out.push(JSON.parse(JSON.stringify(M.special?M.special.roll(g):g)));}
 return out;};

if(imWorker){
 G.onmessage=function(e){var d=e.data,f=d.art==='kampf'?function(){return KK.rechne(d.auftrag);}:d.art==='erzeuge'?function(){return KK.erzeuge(d.wunsch);}:d.art==='wuerfle'?function(){return KK.wuerfle(d.wunsch);}:null;if(!f)return;
  try{G.postMessage({nr:d.nr,ergebnis:f()});}catch(err){G.postMessage({nr:d.nr,fehler:String(err&&err.stack||err)});}};
 // G9b: Ladezeit und geladene Dateien des Kampfkerns melden (eigene Zeitleiste des Kerns)
 var res=[];try{res=G.performance.getEntriesByType('resource');}catch(e){}
 G.postMessage({bereit:true,ladeMs:Math.round(G.performance.now()),dateien:res.length,bytes:res.reduce(function(a,x){return a+(x.encodedBodySize||x.transferSize||0);},0),
  entpackt:res.reduce(function(a,x){return a+(x.decodedBodySize||0);},0)});}
})(typeof self!=='undefined'?self:globalThis);
