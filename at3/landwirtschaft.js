// WAS DIE DATEI TUT: Landwirtschaft im Umland von Arena Theory 3.0 (Schritt N6b4a, AT3_NEUAUSRICHTUNG.md 4.3a). Liest daten/landwirtschaft.json
// (Feldarten-Katalog, Hofarten, Ertrag je Biom, Nahrungskorb) zusammen mit gebaeude.json, waren.json und rezepte.json, prüft den Katalog (jede
// landwirtschaftliche Ware hat einen Erzeuger, Kulturen mit Biom, bekannte Gebäude und Waren) und rechnet je Ort Bedarf, Ernte, nötige Felder,
// Fehlmenge und Überschuss als Summe je Ware (nie je Feld). Ertrag nur nach Biom-Stufe (Entscheidung Thomas 23.11.2026), Fluss hebt eine Stufe.
// Reine Rechnung ohne Bildschirm: läuft im Master-Editor (menue/landwirtschaft.js), in Node (tests/at3-n6b4a.cjs) und per importScripts in jedem
// Hintergrundkern (Regel 13). Kosten: daten() einmal je Datenstand (< 1 ms), ort() rund 10–30 µs je Ort, unabhängig von der Weltgröße (Regel 14).
// Gespeichert wird nichts; ein Ort rechnet seine Landwirtschaft bei Bedarf aus Bilanz und Daten neu. Alle Zahlen sind Vorschläge (Regel 11).
(function(root){
'use strict';
var ERZ_GRUPPEN=['crops','animals'];

// Daten vorbereiten: LW = landwirtschaft.json, geb/waren/rez = die Wirtschaftsdateien. Liefert Index für pruefen() und ort().
function daten(LW,geb,waren,rez){
 var G={},W={},S={},erz={},K=[],kw={},i;
 (geb.gebaeude||geb).forEach(function(g){G[g.id]=g});
 (waren.waren||waren).forEach(function(w){W[w.id]=w});
 (LW.stufen||[]).forEach(function(s){S[s.id]=s});
 (rez.rezepte||rez).forEach(function(r){(r.aus||[]).forEach(function(a){if(!a.verkauf)(erz[a.w]||(erz[a.w]=[])).push(r.geb)})});
 var biomAlle=((geb.biome)||[]).map(function(b){return b.id});
 (LW.kulturen||[]).forEach(function(k){var g=k.geb?G[k.geb]:null,b=(k.biome||(g&&g.biom)||[]).slice();
  if(b.indexOf('alle')>=0)b=biomAlle.slice();
  (k.biomeDazu||[]).forEach(function(x){if(b.indexOf(x)<0)b.push(x)});   // nur Umland (Terrassen, Oasen, Auen), Leitgebäude der Orte bleiben
  var x={id:k.id,k:k,g:g,biome:b,waren:k.waren||[]};K.push(x);
  if(!k.aussenposten)x.waren.forEach(function(w){(kw[w]||(kw[w]=[])).push(x)})});
 var tag=(rez.tag_sek)||600,rezGeb={},halb={};
 (rez.rezepte||rez).forEach(function(r){(rezGeb[r.geb]||(rezGeb[r.geb]=[])).push(r);(r.aus||[]).forEach(function(a){if(!a.verkauf&&!halb[a.w])halb[a.w]=r})});
 var zon={};((geb.biome)||[]).forEach(function(b){if(b.zone!=null)zon[b.zone]=b.id});
 return{LW:LW,G:G,W:W,S:S,erz:erz,K:K,kw:kw,tag:tag,rezGeb:rezGeb,halb:halb,biomAlle:biomAlle,zon:zon}}

// Stufe eines Orts: Biom-Stufe, am Fluss eine besser (höchstens „reich“). Rückgabe {id, faktor, ertrag je Feld und Spieltag}
function stufe(D,biom,fluss){var L=D.LW.stufen,id=D.LW.biomStufe[biom]||'nichts',j=0;
 for(var i=0;i<L.length;i++)if(L[i].id===id)j=i;
 if(fluss&&j<L.length-1&&L[j].faktor>0)j=Math.max(0,j-(D.LW.flussHebt|0));
 return{id:L[j].id,faktor:L[j].faktor,ertrag:D.LW.ertragJeFeld*L[j].faktor}}

// Kann eine Kultur im Biom wachsen?
function waechst(x,biom){return x.biome.indexOf(biom)>=0}
// Kulturen, die eine Ware im Biom liefern
function erzeugerIm(D,ware,biom){return(D.kw[ware]||[]).filter(function(x){return waechst(x,biom)})}

// Bedarf eines Orts je Ware und Spieltag. o = {einw, biom, leit:[{id,n}]}: Nahrungskorb (Anteile auf die im Biom wachsenden Waren der Gruppe verteilt,
// sonst auf die erste Ware der Gruppe als Zukauf) plus landwirtschaftliche Eingänge der Leitgebäude (Rezepte, Takte je Spieltag, volle Besetzung).
function bedarf(D,o){var B={},LW=D.LW,kopf=(o.einw||0)*LW.nahrungJeKopf;
 function dazu(w,n,q){if(n<=0)return;var b=B[w]||(B[w]={ware:w,n:0,quelle:{}});b.n+=n;b.quelle[q]=(b.quelle[q]||0)+n}
 (LW.korb||[]).forEach(function(k){var L=k.waren.filter(function(w){return erzeugerIm(D,w,o.biom).length});
  if(!L.length)L=[k.waren[0]];L.forEach(function(w){dazu(w,kopf*k.anteil/L.length,'food')})});
 // Eingänge eines Rezepts (takte Durchläufe); Halbzeug (z. B. Malz) wird über das erste Rezept, das es herstellt, bis zur Feldware zurückverfolgt (Tiefe 4)
 function eingaenge(r,takte,q,tiefe,weg){(r.ein||[]).forEach(function(e){if(e.opt)return;var L=e.oder||[e.w],n=takte*(e.n||1);
   // „oder“: die erste Ware, die hier wächst, sonst die erste landwirtschaftliche, sonst die erste
   var w=null;L.forEach(function(x){if(!w&&erzeugerIm(D,x,o.biom).length)w=x});
   if(!w)L.forEach(function(x){if(!w&&D.kw[x])w=x});
   if(w){dazu(w,n,q);return}
   if(tiefe>=4)return;var x=L[0],rq=D.halb[x];if(!rq||weg[x])return;
   var aus=0;(rq.aus||[]).forEach(function(a){if(a.w===x)aus+=a.n||1});if(!aus)return;
   var w2={};for(var k in weg)w2[k]=1;w2[x]=1;eingaenge(rq,n/aus,q,tiefe+1,w2)})}
 (o.leit||[]).forEach(function(l){(D.rezGeb[l.id]||[]).forEach(function(r){eingaenge(r,D.tag/(r.sek||D.tag)*(l.n||1),l.id,0,{})})});
 return B}

// Landwirtschaft eines Orts: o = {einw, biom, fluss, leit}. Rückgabe {stufe, zeilen:[{ware, bedarf, kulturen, felder, ernte, fehl, ueber}],
// felder (Summe), fehl (Summe), ueber (Summe)}. Felder werden aufgerundet (der Rest ist Überschuss für den Markt); was im Biom nicht wächst, ist Fehlmenge.
function ort(D,o){var st=stufe(D,o.biom,o.fluss),B=bedarf(D,o),Z=[],sf=0,sfe=0,su=0;
 Object.keys(B).sort().forEach(function(w){var b=B[w],ks=erzeugerIm(D,w,o.biom),z={ware:w,name:D.W[w]?D.W[w].name:w,bedarf:b.n,quelle:b.quelle,
   kulturen:ks.map(function(x){return x.id}),felder:0,ernte:0,fehl:0,ueber:0};
  if(ks.length&&st.ertrag>0){z.felder=Math.ceil(b.n/st.ertrag-1e-9);z.ernte=z.felder*st.ertrag;z.ueber=z.ernte-b.n}else z.fehl=b.n;
  sf+=z.felder;sfe+=z.fehl;su+=z.ueber;Z.push(z)});
 return{stufe:st,zeilen:Z,felder:sf,fehl:sfe,ueber:su}}

// Aus einer Ortsbilanz (orte.js bilanz): Hauptbiom aus der stärksten Zone, Fluss aus den Rohdaten
function ausBilanz(D,b){var r=b.roh,z=r.zonen&&r.zonen.length?r.zonen[0][0]:null;
 return ort(D,{einw:b.einwohner,biom:D.zon[z]||'mediterranean',fluss:!!r.fluss,leit:b.leit})}

// Hofarten, die in einem Biom vorkommen
function hofarten(D,biom){return(D.LW.hofarten||[]).filter(function(h){return h.biome.indexOf('alle')>=0?biom!=='snow':h.biome.indexOf(biom)>=0})}

// Prüfer: Fehler und Hinweise wie im Reiter „Wirtschaft“ ({art, ziel, text})
function pruefen(D){var F=[],H=[],LW=D.LW,gr={},ids={},S=D.S;
 (LW.gruppen||[]).forEach(function(g){gr[g.id]=1});
 D.K.forEach(function(x){var k=x.k;
  if(ids[k.id])F.push({art:'doppelt',ziel:k.id,text:'Kennung doppelt'});ids[k.id]=1;
  if(!gr[k.gruppe])F.push({art:'gruppe',ziel:k.id,text:'unbekannte Gruppe „'+k.gruppe+'“'});
  if(k.geb&&!x.g)F.push({art:'gebaeude',ziel:k.id,text:'Gebäude „'+k.geb+'“ fehlt in gebaeude.json'});
  if(!x.biome.length)F.push({art:'biom',ziel:k.id,text:'Kultur ohne Biom'});
  x.biome.forEach(function(b){if(D.biomAlle.indexOf(b)<0)F.push({art:'biom',ziel:k.id,text:'unbekanntes Biom „'+b+'“'})});
  x.waren.forEach(function(w){if(!D.W[w])F.push({art:'ware',ziel:k.id,text:'unbekannte Ware „'+w+'“'})});
  if(k.geb&&x.g)x.waren.forEach(function(w){if((D.erz[w]||[]).indexOf(k.geb)<0)F.push({art:'ware',ziel:k.id,text:'„'+w+'“ kommt in keinem Rezept von '+k.geb+' heraus'})});
  if(!k.geb&&!x.waren.length)H.push({art:'spaeter',ziel:k.id,text:'noch ohne Ware'+(k.kommt?' – kommt mit '+k.kommt:'')});
  (k.partner||[]).forEach(function(p){if(!D.K.some(function(y){return y.id===p}))F.push({art:'partner',ziel:k.id,text:'Fruchtwechsel-Partner „'+p+'“ fehlt im Katalog'})})});
 // Stufe 1: jede Ware der Gruppen crops und animals und jede pflanzliche Vice hat einen Erzeuger; Pflanzen und Vices zusätzlich eine Kultur im Katalog
 var pv=LW.pflanzlicheVice||[];
 Object.keys(D.W).forEach(function(w){var g=D.W[w].gruppe,pfl=pv.indexOf(w)>=0;if(ERZ_GRUPPEN.indexOf(g)<0&&!pfl)return;
  if(!(D.erz[w]||[]).length)F.push({art:'erzeuger',ziel:w,text:'Ware ohne Erzeuger (kein Rezept liefert sie)'});
  else if((g==='crops'||pfl)&&!(D.kw[w]||[]).length)F.push({art:'katalog',ziel:w,text:'Pflanze ohne Kultur im Katalog'})});
 pv.forEach(function(w){if(!D.W[w])F.push({art:'ware',ziel:w,text:'pflanzliche Vice unbekannt'})});
 // Feld- und Hofgebäude ohne Katalogeintrag
 Object.keys(D.G).forEach(function(id){var g=D.G[id];if((g.gruppe==='felder'||g.gruppe==='vieh')&&!D.K.some(function(x){return x.k.geb===id}))
  H.push({art:'katalog',ziel:id,text:'Feld- oder Viehgebäude ohne Eintrag im Katalog'})});
 // Ertrag je Biom, Korb, Hofarten
 D.biomAlle.forEach(function(b){var s=LW.biomStufe[b];if(!s)F.push({art:'stufe',ziel:b,text:'Biom ohne Ertragsstufe'});else if(!S[s])F.push({art:'stufe',ziel:b,text:'unbekannte Stufe „'+s+'“'})});
 var summe=0;(LW.korb||[]).forEach(function(k){summe+=k.anteil;k.waren.forEach(function(w){if(!D.W[w])F.push({art:'korb',ziel:k.id,text:'unbekannte Ware „'+w+'“'});
  else if(!(D.kw[w]||[]).length)F.push({art:'korb',ziel:k.id,text:'„'+w+'“ hat keine Kultur'})})});
 if(Math.abs(summe-1)>1e-6)F.push({art:'korb',ziel:'korb',text:'Anteile ergeben '+Math.round(summe*100)+' % statt 100 %'});
 (LW.hofarten||[]).forEach(function(h){h.biome.forEach(function(b){if(b!=='alle'&&D.biomAlle.indexOf(b)<0)F.push({art:'hofart',ziel:h.id,text:'unbekanntes Biom „'+b+'“'})});
  h.gruppen.forEach(function(g){if(!gr[g])F.push({art:'hofart',ziel:h.id,text:'unbekannte Gruppe „'+g+'“'})});
  if(!(h.felder[0]<=h.felder[1]))F.push({art:'hofart',ziel:h.id,text:'Felder von–bis vertauscht'})});
 // Biome ohne Grundnahrung (Hinweis: diese Orte kaufen Getreide zu)
 var korn=(LW.korb||[])[0];if(korn)D.biomAlle.forEach(function(b){if(!korn.waren.some(function(w){return erzeugerIm(D,w,b).length}))H.push({art:'zukauf',ziel:b,text:'keine Grundnahrung im Biom: Orte kaufen '+korn.waren[0]+' zu'})});
 return{fehler:F,hinweise:H,zahlen:{kulturen:D.K.length,hofarten:(LW.hofarten||[]).length,waren:Object.keys(D.kw).length}}}

function alsText(LW){var keys=Object.keys(LW),L=['{'];
 keys.forEach(function(k,i){var v=LW[k],sep=i<keys.length-1?',':'';
  if(Array.isArray(v)&&v.length&&typeof v[0]==='object'){L.push(' '+JSON.stringify(k)+': [');L.push(v.map(function(x){return '  '+JSON.stringify(x)}).join(',\n'));L.push(' ]'+sep)}
  else L.push(' '+JSON.stringify(k)+': '+JSON.stringify(v)+sep)});
 return L.join('\n')+'\n}\n'}

var API={daten:daten,stufe:stufe,bedarf:bedarf,ort:ort,ausBilanz:ausBilanz,hofarten:hofarten,erzeugerIm:erzeugerIm,pruefen:pruefen,alsText:alsText};
root.AT3LANDW=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof self!=='undefined'?self:this);
