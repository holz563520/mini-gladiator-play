// WAS DIE DATEI TUT: Wirtschaftsdaten von Arena Theory 3.0 (Schritt W2a1) lesen und prüfen: Verzeichnis „Made by / Used for“, Weg jeder Ware bis in die
// Arena (Regel 1 in AT3_WIRTSCHAFT.md), Prüfer (Arena-Ende, Maße gegen die Maßtabelle, Eigenständigkeit, unbekannte Waren und Tätigkeiten, Berufe) und die
// Ertragstabelle je Gebäude und Warengruppe für die mittlere und ferne Ebene (AT3_WIRTSCHAFT.md 13.4). Reine Rechnung ohne Bildschirm.
// Daten: daten/gebaeude.json, waren.json, rezepte.json, stufen.json, masse.json, eigenstaendigkeit.json, taetigkeiten.json (alle gepflegt im Master-Editor,
// Reiter „Wirtschaft“). Benutzt vom Master-Editor (menue/wirtschaft.js), vom Werkzeug tools/at3-wirtschaft.cjs und vom Test tests/at3-wirtschaft.cjs.
// Kerne: läuft dort, wo es gebraucht wird; im Spiel einmal beim Laden im Weltkern (Regel 13). Kosten: einmal je Datenstand, rund 1–3 ms, nichts hängt von
// der Weltgröße ab (Regel 14).
(function(root){
'use strict';
var BEREICH_ARENA='arena';

// Rezept-Eingang: {w,n} oder {oder:[…],n}; optional {opt:true}. Ausgang: {w,n}, verkauf=true heißt: an Besucher verkauft.
function einWaren(e){return e.oder?e.oder:[e.w]}

// Verzeichnis aufbauen: Gebäude, Waren, wer macht was, wer braucht was.
function index(d){
 var I={geb:{},ware:{},stufe:{},rez:d.rezepte.rezepte,made:{},used:{},verkauf:{},bedarf:{}};
 d.gebaeude.gebaeude.forEach(function(g){I.geb[g.id]=g});
 d.waren.waren.forEach(function(w){I.ware[w.id]=w;I.made[w.id]=[];I.used[w.id]=[];I.verkauf[w.id]=[];I.bedarf[w.id]=[]});
 function auf(t,w,x){(t[w]||(t[w]=[])).push(x)}
 I.rez.forEach(function(r,ri){
  (r.ein||[]).forEach(function(e){einWaren(e).forEach(function(w){auf(I.used,w,ri);if(r.verkauf)auf(I.verkauf,w,ri)})});
  (r.aus||[]).forEach(function(a){auf(I.made,a.w,ri);if(a.verkauf)auf(I.verkauf,a.w,ri)});
 });
 if(d.stufen)d.stufen.stufen.forEach(function(s){
  ['grund','zusatz'].forEach(function(k){(s[k]||[]).forEach(function(b){
   if(b.w)auf(I.bedarf,b.w,s.id);
   if(b.oder)b.oder.forEach(function(w){auf(I.bedarf,w,s.id)});
   if(b.gruppe)d.waren.waren.forEach(function(w){if(w.gruppe===b.gruppe)auf(I.bedarf,w.id,s.id)});
  })});
 });
 return I;
}

// Endet die Ware direkt in der Arena? Rückgabe {art, wo} oder null.
//  verkauf: an einer Bude des Arena-Geländes verkauft · verbrauch: ein Gebäude des Arena-Geländes verbraucht sie · bau: Baustoff (Arena und Buden
//  werden daraus gebaut) · transport: Karren, Zugtiere, Schiffe bringen die übrigen Waren hin · bedarf: eine Bevölkerungsstufe braucht sie (jede Stufe besucht die Arena mit eigenem Geldbeutel, AT3_WIRTSCHAFT.md 4).
function direkt(I,w){
 var W=I.ware[w];if(!W)return null;
 var i,r,g;
 for(i=0;i<(I.verkauf[w]||[]).length;i++){r=I.rez[I.verkauf[w][i]];g=I.geb[r.geb];if(g&&g.bereich===BEREICH_ARENA)return{art:'verkauf',wo:g.id}}
 for(i=0;i<(I.used[w]||[]).length;i++){r=I.rez[I.used[w][i]];g=I.geb[r.geb];if(g&&g.bereich===BEREICH_ARENA)return{art:'verbrauch',wo:g.id}}
 if(W.baustoff)return{art:'bau',wo:'arena'};
 if(W.transport)return{art:'transport',wo:'arena'};
 if((I.bedarf[w]||[]).length)return{art:'bedarf',wo:I.bedarf[w][0]};
 return null;
}
// Kürzester Weg einer Ware bis in die Arena: Liste [{w, ueber (Gebäude), art}], letzter Eintrag hat art und wo. Breitensuche über die Rezepte.
function arenaWege(I){
 var weg={},offen=[];
 Object.keys(I.ware).forEach(function(w){var x=direkt(I,w);if(x){weg[w]={w:w,art:x.art,wo:x.wo,n:0,nach:null};offen.push(w)}});
 // rückwärts: wer zu einer Ware mit Weg verarbeitet wird, hat auch einen Weg
 while(offen.length){var ziel=offen.shift();
  (I.made[ziel]||[]).forEach(function(ri){var r=I.rez[ri];(r.ein||[]).forEach(function(e){einWaren(e).forEach(function(w){
   if(!weg[w]&&I.ware[w]){weg[w]={w:w,ueber:r.geb,nach:ziel,n:weg[ziel].n+1};offen.push(w)}})})});
 }
 return weg;
}
function wegListe(weg,w){var L=[],x=weg[w],sicher=0;while(x&&sicher++<64){L.push(x);x=x.nach?weg[x.nach]:null}return L}
// Englischer Text „Ends up at the arena …“ aus dem Weg (für Waren ohne eigenen Text).
function arenaText(I,weg,w){
 var L=wegListe(weg,w);if(!L.length)return '';
 var ende=L[L.length-1],nm=function(id){return I.ware[id]?I.ware[id].name:id},gn=function(id){return I.geb[id]?I.geb[id].name:id};
 var ueber=L.slice(1).map(function(x){return nm(x.w)});
 var als=ueber.length?' as '+ueber[ueber.length-1]+(ueber.length>1?' (via '+ueber.slice(0,-1).join(', ')+')':''):'';
 if(ende.art==='verkauf')return 'Ends up at the arena'+als+', sold at the '+gn(ende.wo)+'.';
 if(ende.art==='verbrauch')return 'Ends up at the arena'+als+', used by the '+gn(ende.wo)+'.';
 if(ende.art==='transport')return 'Ends up at the arena'+als+', hauling everything else there.';
 if(ende.art==='bau')return 'Ends up at the arena'+als+': the stands and stalls are built from it.';
 var st=I.stufe&&I.stufe[ende.wo];
 return 'Ends up at the arena'+als+': the '+(st?st.name:ende.wo)+' who need it spend their coins on tickets.';
}

// Größe eines Gebäudes in Feldern als Liste von Fassungen [{w,h}] oder [{d}] (rund); frei/fest → [].
function fassungen(gr){
 if(!gr)return[];
 if(gr.stufen)return gr.stufen.map(function(s){return s.d?{d:s.d}:{w:s.w,h:s.h}});
 if(gr.d)return[{d:gr.d}];
 if(gr.w)return[{w:gr.w,h:gr.h}];
 return[];
}
// Passt eine Fassung in eine Form der Maßtabelle? Form: {kurz:[min,max], lang:[min,max]} oder {rund:[min,max]}.
function passt(f,F){
 if(F.frei||F.fest)return false;
 if(f.d)return !!F.rund&&f.d>=F.rund[0]&&f.d<=F.rund[1];
 if(F.rund)return false;
 var k=Math.min(f.w,f.h),l=Math.max(f.w,f.h);
 return k>=F.kurz[0]&&k<=F.kurz[1]&&l>=F.lang[0]&&l<=F.lang[1];
}
function formFuer(masse,g){
 var gr=g.groesse||{};
 if(gr.frei)return 'frei';
 if(gr.fest)return 'fest';
 var f=fassungen(gr);if(!f.length)return null;
 function eine(L){for(var i=0;i<masse.formen.length;i++){var F=masse.formen[i];if(!!F.hof!==!!g.hof)continue;if(L.every(function(x){return passt(x,F)}))return F.id}return null}
 var ganz=eine(f);if(ganz||f.length<2)return ganz;
 // feste Ausbaustufen (Markt, Friedhof): jede Stufe in ihrer eigenen Form, z. B. „halle→gross“
 var je=f.map(function(x){return eine([x])});
 if(je.some(function(x){return !x}))return null;
 return je.filter(function(x,i){return je.indexOf(x)===i}).join('→');
}

// Prüfer. Rückgabe {fehler:[{art,id,text}], hinweise:[…], weg, zahlen}.
function pruefen(d){
 var I=index(d),F=[],H=[],weg=arenaWege(I);
 if(d.stufen)d.stufen.stufen.forEach(function(s){I.stufe[s.id]=s});
 function f(art,id,t){F.push({art:art,id:id,text:t})}
 function h(art,id,t){H.push({art:art,id:id,text:t})}
 var akt={};(d.taetigkeiten?d.taetigkeiten.taetigkeiten:[]).forEach(function(t){akt[t.id]=t});
 var formen={};d.masse.formen.forEach(function(x){formen[x.id]=x});
 // doppelte Kennungen und Namen
 var seh={},nam={};
 d.gebaeude.gebaeude.forEach(function(g){if(seh[g.id])f('doppelt',g.id,'Gebäude-Kennung doppelt');seh[g.id]=1;
  var n=String(g.name).toLowerCase();if(nam[n])f('doppelt',g.id,'Name „'+g.name+'“ auch bei '+nam[n]);nam[n]=g.id});
 var sw={},nw={};
 d.waren.waren.forEach(function(w){if(sw[w.id])f('doppelt',w.id,'Waren-Kennung doppelt');sw[w.id]=1;
  var n=String(w.name).toLowerCase();if(nw[n])f('doppelt',w.id,'Warenname „'+w.name+'“ auch bei '+nw[n]);nw[n]=w.id});
 var gruppen={};d.waren.gruppen.forEach(function(x){gruppen[x.id]=x});
 // Gebäude: Maße, Form, Tätigkeit, Beruf, Text
 d.gebaeude.gebaeude.forEach(function(g){
  var fm=formFuer(d.masse,g);
  if(!fm)f('masse',g.id,'Größe '+groesseText(g.groesse)+(g.hof?' (mit Feldern)':'')+' passt in keine Form der Maßtabelle');
  else if(g.form&&g.form!==fm)f('masse',g.id,'Form „'+g.form+'“ eingetragen, nach der Maßtabelle aber „'+fm+'“');
  if(!g.form)h('masse',g.id,'keine Form eingetragen (wäre „'+fm+'“)');
  if(fm&&fm.split('→').some(function(x){return formen[x]&&formen[x].nurFuer&&formen[x].nurFuer.indexOf(g.id)<0}))f('masse',g.id,'Form „'+fm+'“ ist für dieses Gebäude nicht freigegeben');
  (g.arbeit||[]).forEach(function(a){if(!akt[a.t])f('taetigkeit',g.id,'Tätigkeit „'+a.t+'“ fehlt in taetigkeiten.json')});
  var plaetze=(g.arbeit||[]).reduce(function(s,a){return s+a.n},0);
  if((plaetze>0||g.rolle)&&!g.beruf)f('beruf',g.id,'Gebäude mit Arbeitsplätzen ohne Beruf');
  if(!g.text&&!g.vorhanden)h('text',g.id,'keine Beschreibung');
  if(g.bereich!==BEREICH_ARENA&&!(g.stufe>=1&&g.stufe<=6))f('stufe',g.id,'Bevölkerungsstufe fehlt oder ist nicht 1–6');
 });
 // Rezepte: bekannte Gebäude und Waren
 I.rez.forEach(function(r){
  if(!I.geb[r.geb])f('rezept',r.id,'Gebäude „'+r.geb+'“ unbekannt');
  (r.ein||[]).forEach(function(e){einWaren(e).forEach(function(w){if(!I.ware[w])f('ware',r.id,'Eingang „'+w+'“ ist keine Ware')})});
  (r.aus||[]).forEach(function(a){if(!I.ware[a.w])f('ware',r.id,'Ausgang „'+a.w+'“ ist keine Ware')});
  if(!(r.sek>0))f('rezept',r.id,'Takt fehlt');
 });
 // Stufen: Bedarf und Wohnhaus bekannt
 if(d.stufen)d.stufen.stufen.forEach(function(s){
  if(s.haus&&!I.geb[s.haus])f('stufe',s.id,'Wohnhaus „'+s.haus+'“ unbekannt');
  ['grund','zusatz'].forEach(function(k){(s[k]||[]).forEach(function(b){
   (b.w?[b.w]:b.oder||[]).forEach(function(w){if(!I.ware[w])f('stufe',s.id,'Bedarf „'+w+'“ ist keine Ware')});
   if(b.g&&!I.geb[b.g])f('stufe',s.id,'Bedarf „'+b.g+'“ ist kein Gebäude');
   if(b.gruppe&&!gruppen[b.gruppe])f('stufe',s.id,'Warengruppe „'+b.gruppe+'“ unbekannt')})});
 });
 // Waren: Gruppe, hergestellt, Arena-Ende
 d.waren.waren.forEach(function(w){
  if(!gruppen[w.gruppe])f('ware',w.id,'Gruppe „'+w.gruppe+'“ unbekannt');
  if(!w.fern&&!(I.made[w.id]||[]).length)f('herkunft',w.id,'wird nirgends hergestellt (und ist kein Fernhandel)');
  if(!weg[w.id])f('arena',w.id,'kein Weg in die Arena: weder verkauft, verbraucht, verbaut noch von einer Stufe gebraucht, auch nicht über eine Verarbeitung');
  if(!w.arena)f('arena',w.id,'kein Arena-Ende eingetragen („Ends up at the arena as …“)');
 });
 // Eigenständigkeit: Sperrliste (Namen und Texte, die erkennbar aus anderen Spielen stammen)
 var E=d.eigen||{sperrliste:[]};
 (E.sperrliste||[]).forEach(function(s){var re=new RegExp('\\b'+String(s.wort).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i');
  d.gebaeude.gebaeude.forEach(function(g){if(re.test(g.name)||re.test(g.text||''))f('eigen',g.id,'„'+s.wort+'“ steht auf der Sperrliste'+(s.warum?' ('+s.warum+')':''))});
  d.waren.waren.forEach(function(w){if(re.test(w.name))f('eigen',w.id,'„'+s.wort+'“ steht auf der Sperrliste'+(s.warum?' ('+s.warum+')':''))})});
 (E.pruefliste||[]).forEach(function(p){if(!p.geprueft)h('eigen',p.etappe,'Prüffrage noch nicht abgehakt: '+p.frage)});
 // Biom und Zweig (N5a): jedes Gebäude braucht mindestens ein bekanntes Biom (oder „alle“) und einen bekannten Zweig/Unterzweig
 var BI={},ZW={},zon={};(d.gebaeude.biome||[]).forEach(function(b){if(BI[b.id])f('biom',b.id,'Biom-Kennung doppelt');BI[b.id]=b;
  if(!b.lage){if(!(b.zone>=0))f('biom',b.id,'Biom ohne Klimazone');else if(zon[b.zone])f('biom',b.id,'Klimazone '+b.zone+' auch bei '+zon[b.zone]);zon[b.zone]=b.id}});
 (d.gebaeude.zweige||[]).forEach(function(z){ZW[z.id]={};(z.unter||[]).forEach(function(u){ZW[z.id][u.id]=1})});
 if(!d.gebaeude.biome)f('biom','gebaeude','Tabelle „biome“ fehlt in gebaeude.json');
 if(!d.gebaeude.zweige)f('zweig','gebaeude','Tabelle „zweige“ fehlt in gebaeude.json');
 d.gebaeude.gebaeude.forEach(function(g){
  var b=g.biom;
  if(!Array.isArray(b)||!b.length)f('biom',g.id,'kein Biom: kommt in keinem Biom vor');
  else if(b.indexOf(BIOM_ALLE)>=0&&b.length>1)f('biom',g.id,'„alle“ zusammen mit einzelnen Biomen');
  else b.forEach(function(x){if(x!==BIOM_ALLE&&!BI[x])f('biom',g.id,'Biom „'+x+'“ unbekannt')});
  var z=String(g.zweig||'').split('/');
  if(!g.zweig)f('zweig',g.id,'kein Zweig');
  else if(!ZW[z[0]])f('zweig',g.id,'Zweig „'+z[0]+'“ unbekannt');
  else if(z[1]&&!ZW[z[0]][z[1]])f('zweig',g.id,'Unterzweig „'+z[1]+'“ gibt es im Zweig „'+z[0]+'“ nicht');
  else if(!z[1]&&Object.keys(ZW[z[0]]).length)f('zweig',g.id,'Unterzweig fehlt (Zweig „'+z[0]+'“ hat Unterzweige)');
 });
 if(d.gebaeude.biome&&!F.some(function(x){return x.art==='biom'})){var BT=biomTafel(d);
  BT.forEach(function(r){if(r.lage)return;
   if(!r.eigen.length)h('biom',r.id,'kein Gebäude nur für '+r.de+' (nur „alle“)');
   if(!r.fehlt.length)h('biom',r.id,r.de+' kann alles selbst herstellen (kein Handel nötig)')})}
 var zahlen={gebaeude:d.gebaeude.gebaeude.length,waren:d.waren.waren.length,rezepte:I.rez.length,
  arenaArt:{verkauf:0,verbrauch:0,bau:0,transport:0,bedarf:0,kette:0}};
 Object.keys(weg).forEach(function(w){var x=weg[w];zahlen.arenaArt[x.n?'kette':x.art]++});
 return{fehler:F,hinweise:H,weg:weg,index:I,zahlen:zahlen};
}
// Biom-Tafel (N5a, Plan 4.3): je Biom die Gebäude nur für dieses Biom („eigen“), die Waren, die dort ohne Handel entstehen können (Rezepte von
// Gebäuden mit diesem Biom oder „alle“, ohne Arena-Gelände und ohne Verkauf an Buden, nur wenn alle Pflicht-Eingänge vor Ort entstehen), und die
// hergestellten Waren, die dort fehlen („fehlt“, also Handel). Lagen (Küste, Fluss) zählen nur ihre eigenen Gebäude. Reine Rechnung, einmal je Aufruf; gebraucht vom Prüfer, dem Editor und später N5b.
var BIOM_ALLE='alle';
function biomTafel(d){
 var I=index(d),G=d.gebaeude.gebaeude.filter(function(g){return g.bereich!==BEREICH_ARENA}),je={};
 I.rez.forEach(function(r){(je[r.geb]||(je[r.geb]=[])).push(r)});
 var alleWaren={};I.rez.forEach(function(r){var g=I.geb[r.geb];if(!g||g.bereich===BEREICH_ARENA)return;(r.aus||[]).forEach(function(a){if(!a.verkauf)alleWaren[a.w]=1})});
 return(d.gebaeude.biome||[]).map(function(b){
  var eigen=[],alle=[],w={};
  G.forEach(function(g){var L=g.biom||[],hier=L.indexOf(b.id)>=0,ueberall=L.indexOf(BIOM_ALLE)>=0&&!b.lage;
   if(!hier&&!ueberall)return;(hier?eigen:alle).push(g.id)});
  // Waren ohne Handel: Rezepte so lange durchgehen, bis nichts Neues entsteht; ein Rezept läuft, wenn jeder Pflicht-Eingang schon da ist
  var R=[];eigen.concat(alle).forEach(function(gid){(je[gid]||[]).forEach(function(r){R.push(r)})});
  for(var neu=true,runde=0;neu&&runde<50;runde++){neu=false;R.forEach(function(r){
   if(!(r.ein||[]).every(function(e){return e.opt||einWaren(e).some(function(x){return w[x]})}))return;
   (r.aus||[]).forEach(function(a){if(!a.verkauf&&!w[a.w]){w[a.w]=1;neu=true}})})}
  return{id:b.id,de:b.de,name:b.name,lage:!!b.lage,zone:b.zone,typisch:b.typisch,eigen:eigen,alle:alle,waren:Object.keys(w),
   fehlt:b.lage?[]:Object.keys(alleWaren).filter(function(x){return !w[x]})};
 });
}
// Zweig eines Gebäudes als Namen ({zweig, unter}), für Editor und Stadtansicht.
function zweigName(d,g){var z=String(g&&g.zweig||'').split('/'),Z=(d.gebaeude.zweige||[]).filter(function(x){return x.id===z[0]})[0];if(!Z)return null;
 var U=(Z.unter||[]).filter(function(u){return u.id===z[1]})[0];return{zweig:Z.name,unter:U?U.name:Z.jeReligion?'(per religion)':Z.jeStufe?'(per class)':'',de:Z.de}}

function groesseText(gr){
 if(!gr)return '?';if(gr.frei)return 'frei';if(gr.fest)return 'fest ('+gr.fest+')';
 return fassungen(gr).map(function(f){return f.d?'Ø '+f.d:f.w+'×'+f.h}).join(' → ');
}

// Ertragstabelle (AT3_WIRTSCHAFT.md 13.4): je Gebäude und Warengruppe die Menge je Spieltag bei voller Besetzung, wenn sich die Arbeit gleich auf die
// Rezepte des Gebäudes verteilt. Ganze Zahlen ×100 (Hundertstel), damit fern und mittel ohne Kommazahlen rechnen. Eingänge negativ.
function ertragstabelle(d){
 var I=index(d),T={},tag=d.rezepte.tag_sek||600,je={};
 I.rez.forEach(function(r){(je[r.geb]||(je[r.geb]=[])).push(r)});
 Object.keys(je).forEach(function(gid){var g=I.geb[gid];if(!g)return;
  var plaetze=Math.max(1,(g.arbeit||[]).reduce(function(s,a){return s+a.n},0)),L=je[gid],t=T[gid]={};
  L.forEach(function(r){var laeufe=tag/r.sek*plaetze/L.length;
   function buch(w,n){var W=I.ware[w];if(!W)return;t[W.gruppe]=(t[W.gruppe]||0)+Math.round(n*laeufe*100)}
   (r.aus||[]).forEach(function(a){if(!a.verkauf)buch(a.w,a.n)});
   (r.ein||[]).forEach(function(e){if(!e.opt)buch(einWaren(e)[0],-e.n)});
  });
 });
 return T;
}

// Datei-Text wie bisher in taetigkeiten.json: oberste Schlüssel je Zeile, Listen und Verzeichnisse mit einem Eintrag je Zeile. Für Export und Werkzeug.
function alsText(d){
 function eins(v){return JSON.stringify(v)}
 function wert(v,ein){
  if(Array.isArray(v)&&v.length&&v.some(function(x){return x&&typeof x==='object'}))return '[\n'+v.map(function(x){return ein+' '+eins(x)}).join(',\n')+'\n'+ein+']';
  if(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length>3&&Object.keys(v).every(function(k){return v[k]&&typeof v[k]==='object'}))
   return '{\n'+Object.keys(v).map(function(k){return ein+' '+JSON.stringify(k)+': '+eins(v[k])}).join(',\n')+'\n'+ein+'}';
  return eins(v);
 }
 return '{\n'+Object.keys(d).map(function(k){return ' '+JSON.stringify(k)+': '+wert(d[k],' ')}).join(',\n')+'\n}\n';
}

var API={alsText:alsText,index:index,direkt:direkt,arenaWege:arenaWege,wegListe:wegListe,arenaText:arenaText,fassungen:fassungen,formFuer:formFuer,pruefen:pruefen,
 groesseText:groesseText,ertragstabelle:ertragstabelle,einWaren:einWaren,biomTafel:biomTafel,zweigName:zweigName,BIOM_ALLE:BIOM_ALLE};
root.AT3WIRT=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof self!=='undefined'?self:this);
