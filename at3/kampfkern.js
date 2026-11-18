// WAS DIE DATEI TUT: Kampfkern von Arena Theory 3.0 (Schritt G9a, G9b: erzeugt auch die Laborkämpfer Mensch, Hund, Löwe; G9d3: Arenakampf „nur Ergebnis“, tägliche Heilung wie 1.0). Eigener Hintergrundkern, der die UNVERÄNDERTEN Kampfdateien aus 1.0 lädt
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
 laufe(n);
 // G9d3: der Tageswechsel aus data.js, bevor andere 1.0-Teile ihn umhüllen (Welt, Händler, Haushalt …). Er enthält die Heilung von 1.0 (Erschöpfung, Blut,
 // Körperteile, Brüche, innere Verletzungen, Behandlung, Moral, Alter). AT3 nutzt ihn unverändert für die tägliche Heilung (KK.heile).
 if(n==='data')KK.tagRoh=G.MG.advanceDay;});};
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

// ---------- G9c2: Kandidatenkarte (Thomas 17.11.2026: wie 1.0) ----------
// Liest die Gladiatoren nur mit den unveränderten 1.0-Teilen: barracks.js info/analysis (Kampfwert, Talentstufe, Klassen, Plus/Minus), buy-odds.js
// (Seltenheit, erst beim ersten Aufruf geladen) und das Porträt aus arena.js renderPortrait auf einer OffscreenCanvas (ohne OffscreenCanvas, z. B. in Node:
// kein Bild). Verbraucht keinen Spielzufall und schreibt nichts. Texte bleiben deutsch (1.0), das Spiel übersetzt sie mit sprache/handel-en.json.
// wunsch: {lot:[g|null …]}. Ergebnis: {karten:[…|null], bilder:[ImageBitmap|null …]}
KK.ZUSATZ_KARTE='buy-odds';
var LOWKEYS=['tactics','strength','stamina','condition','agility','dexterity','reflex','precision','block','balance','toughness','pain','will','aggression','teamwork','experience'];
KK.karten=function(w){vorbereiten();var M=G.MG,B=M.barracks,rng=M.s.rng;try{return karten(w,M,B);}finally{M.s.rng=rng;}};      // 1.0 würfelt beim Lesen teils mit MG.s.rng: danach zurücksetzen
function karten(w,M,B){
 if(!M.buyOdds&&imWorker){try{importScripts('../'+KK.ZUSATZ_KARTE+'.js?v='+v);}catch(e){}}
 var karten=[],bilder=[];
 (w.lot||[]).forEach(function(g){if(!g){karten.push(null);bilder.push(null);return;}
  var d=B.info(g),an=B.analysis(g,d),o=M.buyOdds?M.buyOdds.human(g):null,klein=function(x){return {g:x.group,m:x.m,text:x.text};};
  var tief=Object.keys(g.stats||{}).filter(function(k){return LOWKEYS.indexOf(k)>=0;}).sort(function(a,b){return g.stats[a]-g.stats[b];}).slice(0,2);
  karten.push({id:g.id,name:g.name,alter:g.age|0,groesse:g.height|0,gewicht:g.weight|0,wuchs:g.stature||'',traits:(g.traits||[]).slice(),
   talent:d.talent,stufe:d.tier.level,stufeName:d.tier.name,kw:d.kw,best:d.best,
   klassen:M.roles.map(function(r){var c=d.classes[r];return {rolle:r,ist:Math.round(c.ist),pot:Math.round(c.pot),waffe:(M.weaponDefs.find(function(x){return x.id===c.weapon;})||{}).name||c.weapon,wpot:Math.round(c.weaponPot)};}),
   plus:an.plus.slice(0,3).map(klein),minus:an.minus.slice(0,2).map(klein),tief:tief,
   odds:o?{atLeast:o.atLeast,better:o.better}:null});
  var bild=null;if(typeof G.OffscreenCanvas==='function'){try{var c=new G.OffscreenCanvas(80,100);M.renderPortrait(c,g,{unarmored:true});bild=c.transferToImageBitmap?c.transferToImageBitmap():null;}catch(e){bild=null;}}
  bilder.push(bild);});
 return {karten:karten,bilder:bilder};};

// ---------- G9d3: Arenakampf „nur Ergebnis“ (Thomas 17.11.2026) ----------
// Genau wie der angesehene Kampf im Kampffenster (aufstellung-ui.js fight() im Spielmodus), nur ohne Bildschirm: dieselbe Gruppe, dasselbe Angebot, derselbe Seed,
// Aufstellung mit A.place, Anführer ab 5 Kämpfern (outside-leader.js attachArena), Messung mit A.tracker (Gelübde, Held, Ruhm), Bewertung A.judge, danach dasselbe
// wie settle() der Aufstellung (Ruhm, Gefallene, Kampfbuch). Gerechnet wird mit der unveränderten 1.0-Engine wie im Aufstellungs-Worker (aufstellung-worker.js).
// Die zusätzlichen 1.0-Dateien werden erst beim ersten Arenakampf geladen und ändern an den anderen Kämpfen nichts (der Anführer greift nur, wenn er angehängt ist).
// wunsch: {id, seed, kader:[g …], auf (Aufstellung, Format S.aufstellung), offer, heute}. Ergebnis wie die Nachricht „ergebnis“ des Kampffensters (Modus kampf),
// dazu spekt (Spektakel) und ruhmMul (Ruhmfaktor) aus A.judge für die Tickets, kills/ursache je Einheit für den Ergebnisbericht.
KK.ZUSATZ_ARENA=['arena-calibration','arena-challenges','aufstellung-core','outside-leader'];
function zusatzArena(){if(imWorker){if(!G.ARENA_CALIBRATION)importScripts('../arena-calibration.js?v='+v);zusatz();if(!G.Aufstellung)importScripts('../aufstellung-core.js?v='+v);
  if(!(G.MG&&G.MG.outsideLeader))importScripts('../outside-leader.js?v='+v);}
 if(!G.Aufstellung)throw new Error('aufstellung-core.js fehlt');}
KK.arena=function(w){
 vorbereiten();zusatzArena();
 var M=G.MG,S=M.s,A=G.Aufstellung,AN=G.AN,altZufall=Math.random,z=(w.seed>>>0)^0x9e3779b9,altRoster=S.roster;
 var st=JSON.parse(JSON.stringify(w.auf||{}));['lineup','vows','fallen','log'].forEach(function(k){if(!Array.isArray(st[k]))st[k]=[];});if(typeof st.fame!=='number')st.fame=0;if(st.hero===undefined)st.hero=null;
 S.roster=(w.kader||[]).map(function(g){g=JSON.parse(JSON.stringify(g));g.enemy=false;return g;});S.day=(w.heute|0)+1;S.rng=(w.seed>>>0)||1;S.battle=null;
 var GG=function(id){return S.roster.find(function(g){return g.id===id;});};
 var VOR={};S.roster.forEach(function(g){VOR[g.id]=g;});var GV=function(id){return GG(id)||VOR[id]||null;};      // K0: 1.0 nimmt Tote nach dem Kampf aus dem Kader; ihre Daten kommen aus VOR
 var fit=function(g){try{return M.lineupEligibility?M.lineupEligibility(g):M.army&&M.army.eligibility?M.army.eligibility(g):{ok:!g.dead,causes:[]};}catch(e){return {ok:!g.dead,causes:[]};}};
 try{
  var L=st.lineup.filter(function(x){return GG(x.id);}).map(function(x){var g=GG(x.id);return {id:g.id,g:g,kw:A.kw(g),role:g.role,slot:{row:x.row,lane:x.lane}};});
  if(!L.length)return {auftrag:w.id,arena:1,fehler:'nobody'};
  var bad=L.filter(function(x){return !fit(x.g).ok;});if(bad.length)return {auftrag:w.id,arena:1,fehler:'unfit',name:bad[0].g.name};
  var o=JSON.parse(JSON.stringify(w.offer)),kwBefore={};L.forEach(function(x){kwBefore[x.id]={kw:x.kw,role:x.role};});
  Math.random=function(){z=(z+0x6D2B79F5)|0;var t=Math.imul(z^z>>>15,1|z);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
  M.stains=[];M.limbs=[];M.swings=[];M.floaters=[];M.shake=0;
  var b=AN.build(A.spec(L,o,false));b.league=0;A.place(b,L);S.battle=b;var bid=KK.letzteKennung;KK.letzteKennung=null;KK.letzteSpec=null;
  b.aufForm=true;try{var LD=M.outsideLeader;if(LD&&LD.attachArena){b.neu=false;try{LD.attachArena(b,{leaderId:S.arenaLeaderId});}finally{b.neu=true;}}}catch(e){}
  var T=A.tracker(b,L,o,{vows:st.vows,hero:st.hero,fame:st.fame}),out=null;AN.listeners.push(function(x){out=x;});
  var dt=1/60,limit=Math.ceil((AN.TMAX+60)/dt)+5400,n=0;while(S.battle&&!out&&n<limit){M.fixedStep(dt);n++;T.tick();}
  if(!out){out=AN.outcome(b,-1);out.stuck=true;}
  var r=T.done(out);S.battle=null;S.records=[];S.inventory=[];
  // wie settle() in aufstellung-ui.js
  st.fame=Math.max(-50,Math.min(150,st.fame+r.fameDelta));
  r.units.filter(function(u){return u.team===0;}).forEach(function(u){var g=GV(u.key);
   if(g){g.auf=g.auf||{};g.auf.fights=(g.auf.fights||0)+1;g.auf.kills=(g.auf.kills||0)+(u.kills||0);}
   if(u.dead||(g&&g.dead)){st.fallen.push({name:u.name,kw:(kwBefore[u.key]||{}).kw||0,role:(kwBefore[u.key]||{}).role||'',day:S.day||1,cause:u.cause});if(st.hero===u.key)st.hero=null;}});
  st.lineup=st.lineup.filter(function(x){return GG(x.id)&&!GG(x.id).dead;});st.log.push({day:S.day||1,label:o.label,skulls:o.skulls,won:r.won,gold:r.gold});if(st.log.length>60)st.log.shift();
  var ersetze=function(x){if(!x)return null;var t=JSON.stringify(x);return JSON.parse(bid?t.split(JSON.stringify(bid)).join(JSON.stringify('at3:'+w.id)):t);};
  return {auftrag:w.id,arena:1,praemie:Math.max(0,Math.round(+r.gold||0)),gewonnen:r.won?1:0,auf:st,angesehen:false,spekt:+r.spect||0,ruhmMul:+r.fameMul||1,
   sieger:out.winner,zeit:out.time,einheiten:out.units.map(function(u){return {key:String(u.key),art:u.kind,name:u.name,team:u.team,tot:!!u.dead,unten:!!u.down,leben:u.health,verletzt:!!u.injured,schwer:!!u.severe,
    verletzungen:u.injuries||[],kills:u.kills||0,ursache:u.cause||'',toeter:u.killer||'',g:u.team===0?ersetze(GV(u.key)):null};})};
 }finally{Math.random=altZufall;S.battle=null;S.roster=altRoster;}};

// ---------- G9d3: tägliche Heilung wie 1.0 (Thomas 17.11.2026: „Heilen wie 1.0“) ----------
// Ruft den unveränderten Tageswechsel aus data.js (KK.tagRoh, siehe KK.lade) für die übergebenen Gladiatoren auf. Was der Tageswechsel sonst noch anfasst
// (Markt, Sponsor, Verkäufe, Haushalt), ist für diese Dauer abgeschaltet und wird danach zurückgesetzt. Kein Spital, keine Behandlung (gibt es in AT3 noch nicht).
// wunsch {tag (AT3-Spieltag), tage (1–30), gs:[g …]} → [{g, hp (Gesundheit 0–100 wie 1.0 health), ruht (schwer verletzt nach den Kasernenregeln aus 1.0)}]
// Schwer verletzt = 1.0 M.army.eligibility meldet eine Verletzungsursache (Körperteil, Gesundheit, Schwere, Blutung, Bruch); Erschöpfung, Reserve usw. zählen nicht.
var NICHT_VERLETZT=/Erschöpfung|Reserve|geschont|Schmiedelehre|nicht aktiv/;
KK.verletzt=function(g){var M=G.MG;try{var e=M.army&&M.army.eligibility?M.army.eligibility(g):{ok:true,causes:[]};return (e.causes||[]).some(function(c){return !NICHT_VERLETZT.test(c);});}catch(e){return false;}};
KK.heile=function(w){
 vorbereiten();if(!KK.tagRoh)throw new Error('Tageswechsel aus data.js fehlt');
 var M=G.MG,S=M.s,tage=Math.max(1,Math.min(30,w.tage|0)),alt={roster:S.roster,day:S.day,lastMarket:S.lastMarket,sponsor:S.sponsor,battle:S.battle,rng:S.rng},cs=M.chargeSold,hd=M.householdDay;
 try{M.chargeSold=null;M.householdDay=null;S.battle=null;S.sponsor=null;S.day=Math.max(0,(w.tag|0)-tage);S.lastMarket=S.day+1e9;
  S.roster=(w.gs||[]).map(function(g){return JSON.parse(JSON.stringify(g));});KK.tagRoh(tage);
  return S.roster.map(function(g){return {g:g,hp:Math.max(0,Math.min(100,Math.round(M.health(g)))),ruht:g.dead?0:KK.verletzt(g)?1:0};});}
 finally{M.chargeSold=cs;M.householdDay=hd;S.roster=alt.roster;S.day=alt.day;S.lastMarket=alt.lastMarket;S.sponsor=alt.sponsor;S.battle=alt.battle;S.rng=alt.rng;}};

// ---------- K0: Medicus wie 1.0 (Thomas 18.11.2026: Stufen und Kosten wie 1.0, Gebäude am festen Platz, keine Automatik) ----------
// Unverändertes treat() und medicalCost() aus data.js: Stufe 1 „Medicus“, 2 „Premium“, 3 „Special care“ (medic.js TIER), danach heilt der Tageswechsel (KK.heile)
// vier Tage schneller wie in 1.0. Ohne Spital und ohne Medicus-Ausbau (buildings.hospital/medic = 0). Gold und Speichern von 1.0 sind dabei abgeschaltet.
// wunsch {gs:[g …]} → [{id, kosten:[k1,k2,k3], hp, ruht, laeuft (Stufe der laufenden Behandlung, 0 = keine), tage (Resttage)}]
// wunsch {gs:[g], tier 1–3} → {g, kosten, hp, ruht}
KK.behandle=function(w){
 vorbereiten();var M=G.MG,S=M.s,alt={roster:S.roster,gold:S.gold,stats:S.stats,batch:M.batchSaving,hosp:S.buildings.hospital,med:S.buildings.medic};
 try{M.batchSaving=true;S.buildings.hospital=0;S.buildings.medic=0;
  var gs=(w.gs||[]).map(function(g){return JSON.parse(JSON.stringify(g));});S.roster=gs;
  if(!w.tier)return gs.map(function(g){return {id:String(g.id),kosten:[1,2,3].map(function(t){return M.medicalCost(g,t);}),hp:Math.max(0,Math.min(100,Math.round(M.health(g)))),
   ruht:KK.verletzt(g)?1:0,laeuft:g.healing&&g.healing.days>0?g.healing.tier|0:0,tage:g.healing?g.healing.days|0:0};});
  var g=gs[0],t=w.tier|0;if(!g||t<1||t>3)throw new Error('Behandlung: Gladiator oder Stufe fehlt');
  var k=M.medicalCost(g,t);S.gold=k+1;S.stats={spent:0};M.treat(g.id,t);
  return {g:g,kosten:k,hp:Math.max(0,Math.min(100,Math.round(M.health(g)))),ruht:KK.verletzt(g)?1:0};}
 finally{S.roster=alt.roster;S.gold=alt.gold;S.stats=alt.stats;M.batchSaving=alt.batch;S.buildings.hospital=alt.hosp;S.buildings.medic=alt.med;}};

// F1a (Thomas 18.11.2026): Kartenfiguren wie 2.0 für das Musterblatt im Master-Editor. figurbild.js und at3-64.js erst beim ersten Auftrag laden.
// wunsch {seed, n, besucher, palette} → siehe figurbild.js. Verbraucht keinen Spielzufall (MG.s.rng wird zurückgesetzt).
KK.figuren=function(w){vorbereiten();if(imWorker){if(!G.AT3_64)importScripts('at3-64.js?v='+v);if(!G.AT3Figurbild)importScripts('figurbild.js?v='+v);}
 return G.AT3Figurbild.figuren(G.MG,G.AT3_64,w||{});};

// F1b (Thomas 18.11.2026): Kartenblätter der Personen fürs Spiel (AT3-64). wunsch {gs:[{pid,g}], lasten, palette} → siehe figurbild.js karte
KK.kfiguren=function(w){vorbereiten();if(imWorker){if(!G.AT3_64)importScripts('at3-64.js?v='+v);if(!G.AT3Figurbild)importScripts('figurbild.js?v='+v);}
 return G.AT3Figurbild.karte(G.MG,G.AT3_64,w||{});};

// F1c (Thomas 18.11.2026): Nahblätter (volle 1.0-Figur, AT3-64) für die Zoomstufe 2×. wunsch wie kfiguren → siehe figurbild.js nahKarte
KK.knah=function(w){vorbereiten();if(imWorker){if(!G.AT3_64)importScripts('at3-64.js?v='+v);if(!G.AT3Figurbild)importScripts('figurbild.js?v='+v);}
 return G.AT3Figurbild.nahKarte(G.MG,G.AT3_64,w||{});};

if(imWorker){
 G.onmessage=function(e){var d=e.data;if(d.art==='kfiguren'||d.art==='knah'){try{var r=d.art==='knah'?KK.knah(d.wunsch):KK.kfiguren(d.wunsch),tr=[];r.blaetter.forEach(function(x){tr.push(x.p64.buffer);});if(r.lasten)tr.push(r.lasten.p64.buffer);G.postMessage({nr:d.nr,ergebnis:r},tr);}
   catch(err){G.postMessage({nr:d.nr,fehler:String(err&&err.stack||err)});}return;}
  if(d.art==='figuren'){try{var r=KK.figuren(d.wunsch),tr=[];r.figuren.forEach(function(x){tr.push(x.voll.buffer,x.p64.buffer);});G.postMessage({nr:d.nr,ergebnis:r},tr);}
   catch(err){G.postMessage({nr:d.nr,fehler:String(err&&err.stack||err)});}return;}
  var f=d.art==='kampf'?function(){return KK.rechne(d.auftrag);}:d.art==='erzeuge'?function(){return KK.erzeuge(d.wunsch);}:d.art==='wuerfle'?function(){return KK.wuerfle(d.wunsch);}:d.art==='karten'?function(){return KK.karten(d.wunsch);}:
  d.art==='arena'?function(){return KK.arena(d.wunsch);}:d.art==='heile'?function(){return KK.heile(d.wunsch);}:d.art==='behandle'?function(){return KK.behandle(d.wunsch);}:null;if(!f)return;
  try{G.postMessage({nr:d.nr,ergebnis:f()});}catch(err){G.postMessage({nr:d.nr,fehler:String(err&&err.stack||err)});}};
 // G9b: Ladezeit und geladene Dateien des Kampfkerns melden (eigene Zeitleiste des Kerns)
 var res=[];try{res=G.performance.getEntriesByType('resource');}catch(e){}
 G.postMessage({bereit:true,ladeMs:Math.round(G.performance.now()),dateien:res.length,bytes:res.reduce(function(a,x){return a+(x.encodedBodySize||x.transferSize||0);},0),
  entpackt:res.reduce(function(a,x){return a+(x.decodedBodySize||0);},0)});}
})(typeof self!=='undefined'?self:globalThis);
