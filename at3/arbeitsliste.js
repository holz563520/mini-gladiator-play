// WAS DIE DATEI TUT: Grafik-Arbeitsliste von Arena Theory 3.0 (Schritt W2a3, AT3_WIRTSCHAFT.md 13.7). Jedes Bild der Kartei und jedes geplante Bild
// (Gebäude aus daten/gebaeude.json, Waren aus daten/waren.json) als Eintrag zum Abarbeiten: Gruppe, Stand (fehlt / aus Teilen / Skizze / überarbeitet / fertig),
// Stand je Ansicht, Grundbild und Varianten, Teile eines Gebäudes, Etappe, Wichtigkeit (geschätzt, von Hand überschreibbar), Zeichenhinweis (deutsch).
// Abgeleitetes (Name, Beschreibung, Maße, Anker, Fläche, Kollision, Status, letzte Messung, Budget) steht als „info“ dabei, damit die Liste ohne die
// 77+ Objektdateien auskommt. Gespeichert in kartei/arbeitsliste.json; erzeugt und abgeglichen von tools/at3-arbeitsliste.cjs, gezeigt im Master-Editor
// (Grafik → Grafik-Arbeitsliste, menue/arbeitsliste.js). Reine Rechnung ohne Bildschirm, nur im Editor und im Werkzeug; das Spiel lädt nichts davon.
// N1 (Neuausrichtung, AT3_NEUAUSRICHTUNG.md 3, 5, 6): Gebäude, die nur in Städten stehen, brauchen kein Bild (Stand „kein Bild nötig“); neu sind Ortsbilder,
// Stadt-Zusatzteile, Außenposten, Straßen und Marktstände aus daten/ortsbilder.json. Ortsbilder und Zusatzteile warten auf das Werkzeug N6a.
(function(root){
'use strict';
var STAND=['fehlt','teile','skizze','ueberarbeitet','fertig','keinbild'];
var STAND_DE={fehlt:'fehlt noch',teile:'aus Teilen',skizze:'Skizze',ueberarbeitet:'überarbeitet',fertig:'fertig',keinbild:'kein Bild nötig'};
var ANSICHT_STAND=['auto','skizze','ueberarbeitet','fertig'];
var GRUPPEN=['Gebäude','Bauteil','Boden','Einrichtung','Ware','Figur','Tier','Natur','Fahrzeug','Variante','Ortsbild','Stadtteil','Außenposten','Straße','Marktstand'];
var KAT_GRUPPE={wand:'Bauteil',dach:'Bauteil',boden:'Boden',einrichtung:'Einrichtung',ware:'Ware',figur:'Figur',tier:'Tier',baum:'Natur',blume:'Natur',karren:'Fahrzeug'};
var ETAPPEN=['vorhanden','W2a2','N5a','N6b','N6c','N6d','N6e','N6f','N7d','N7e','N7f','N8a','N12','B'];
// Früher W2c (AT3_WIRTSCHAFT.md 14): was davon auf dem Arena-Gelände steht, kommt mit dem ersten Kreislauf N12, das übrige Arena-Gelände mit Phase B.
var W2C=['woodcutter','forester','sawmill','firewood-yard','quarry','well','latrine','shrine','wheat-farm','mill','bakery','barley-farm','malthouse','brewery','oat-farm',
 'porridge-kitchen','pig-farm','butcher','sausage-maker','fisher','tavern','stall-porridge','stall-fish','stall-sausage','stall-beer','public-latrine','market'];
// Vorhandene Spielwaren und Gebäude, die schon ein Bild in der Kartei haben
var WARE_BILD={log:'ware-stamm',boards:'ware-bretter',meat:'ware-fleisch'};
var GEB_BILD={medicus:'medicus',lager:'lager-platz',arena:'arena-sand',market:'markt-stand'};
var TEIL_DE={wand:'Wand',tuer:'Tür',giebel:'Giebelstück','giebel-auf':'Giebelspitze (steigend)','giebel-ab':'Giebelspitze (fallend)','dach-flach':'flache Dachplatte',
 'dach-auf-j':'Dachplatte, steigt nach Süden','dach-ab-j':'Dachplatte, fällt nach Süden','dach-auf-i':'Dachplatte, steigt nach Osten','dach-ab-i':'Dachplatte, fällt nach Osten',
 boden:'Innenboden',rang:'Sitzstufen (Ränge)',schild:'Schild vor der Tür'};
var KLASSE_DE={lehm:['Lehm/Holz','arm und geflickt: Lehm mit Rissen, Flechtwerk, Stroh; sieht aus, als hielte es nur aus Gewohnheit'],
 ziegel:['Ziegel','bürgerlich: Putz mit rotem Sockel, ordentliche Ziegel, ein bisschen Stolz'],
 marmor:['Marmor','reich: Marmor, Pilaster, Gold, eine Spur zu protzig']};

function esc(t){return String(t==null?'':t)}
function klemm(v){return Math.max(1,Math.min(5,Math.round(v)))}
function stufeN(n){return n>=100?5:n>=40?4:n>=10?3:n>=1?2:1}

// Ansichten eines Objekts der Kartei: Karte je Richtung, First Person nah/fern, schräge Seiten. auto = Kopie, Spiegel oder automatisch verkleinert.
function ansichtenVon(S,o){var R=S.RICHTUNGEN[o.kat]||1,a={},r,e;
 a.k1='skizze';
 for(r=1;r<R;r++){e=o.richtungen&&o.richtungen[r-1];a['k'+(r+1)]=e&&e.z?'skizze':'auto'}
 if(o.kat==='boden'){a.fp='auto';return a}
 e=o.fp&&o.fp.nah;a.nah=e&&e.z?'skizze':'auto';
 a.fern=o.fp&&o.fp.fernAuto===false&&o.fp.fern&&o.fp.fern.z?'skizze':'auto';
 if(R>1)for(r=0;r<4;r++){e=o.fp&&o.fp.zwischen&&o.fp.zwischen[r];a['z'+(r+1)]=e&&e.z?'skizze':'auto'}
 return a}
function ansichtenLeer(S,kat){var R=S.RICHTUNGEN[kat]||1,a={k1:'auto'},r;for(r=1;r<R;r++)a['k'+(r+1)]='auto';if(kat==='boden'){a.fp='auto';return a}
 a.nah='auto';a.fern='auto';if(R>1)for(r=0;r<4;r++)a['z'+(r+1)]='auto';return a}
function ansichtName(k){if(k==='fp')return'First Person (Farbfläche)';if(k==='nah')return'First Person nah';if(k==='fern')return'First Person fern';
 if(k[0]==='k')return'Karte Richtung '+k.slice(1);return'First Person schräg '+k.slice(1)}

// Letzte Messung kurz: Ampel gegen das Budget, Datum, Datei, größte Stufe je Ansicht
function messKurz(S,B,o){var m=o.messung,g=S.budgetGruppe(B,o.kat),r={budget:g?g.id:null};
 if(g)r.soll={datei:g.datei,karte:g.karte&&!g.karte.gilt?g.karte.ms:null,fp:g.fp&&!g.fp.gilt?g.fp.ms:null};
 if(!m){r.ampel='keine';return r}
 var bw=S.bewerte(m,B,o.kat);r.ampel=m.sig===S.signatur(o)?bw.ampel:'veraltet';r.datum=m.datum;r.datei=m.datei;
 ['karte','fp'].forEach(function(a){var L=m[a]||[],s=L[L.length-1];if(s)r[a]={n:s.n,ms:Math.round(s.p95*10)/10}});return r}

// Welche Teile setzt ein Gebäude zusammen? Baukasten mit einem leeren 1 × 1-Bild für jedes Teil: setzen() fragt jede Kennung ab, gemalt wird fast nichts.
// Baukastenteile werden ohne Bauklasse notiert (bk-*-wand), jede Bauklasse nutzt dieselben.
var LEERTEIL=null;
// Lage-Varianten und Randteile (baukasten.js: wahl, rand), z. B. bk-lehm-dach-ab-j-c, -r, -ks, -k-a: nur wenn der Rest ein echtes Teil ist und die Kennung selbst keins.
var LAGE=/^(bk-.+?)-(?:[rk]?[sn]|[rk]|[a-f])(?:-[a-f])?$/;
function echtesTeil(id){return id==='bk-feld'||!!TEIL_DE[id.replace(/^bk-[a-z]+-/,'')]}
function lageVariante(id){var m=LAGE.exec(id);return!!(m&&echtesTeil(m[1])&&!echtesTeil(id))}
// Größen eines Gebäudes: fest {w,h}, rund {d} oder in Stufen {stufen:[{w,h}]} (Friedhof, Rennbahn)
function groessen(g){var G=g.groesse,eins=function(x){return x.d?{w:x.d,h:x.d}:x.w&&x.h?{w:x.w,h:x.h}:null};if(!G)return[];
 return(G.stufen||[G]).map(eins).filter(Boolean)}
function groesseText(g){var L=groessen(g);if(!L.length)return'Größe frei';var t=function(x){return x.w+' × '+x.h};return L.length>1?t(L[0])+' bis '+t(L[L.length-1])+' Felder ('+L.length+' Stufen)':t(L[0])+' Felder'}
function formFuer(g,gr){var f=g.form;if(f==='halle→gross'){gr=gr||groessen(g)[0];f=gr&&Math.min(gr.w,gr.h)>=14?'gross':'halle'}return f}
function teileVon(BK,g,S){if(g.form==='frei'||g.form==='fest')return null;var L=groessen(g);if(!L.length)return null;
 if(!LEERTEIL)LEERTEIL={kat:'einrichtung',bild:{kat:'einrichtung',w:1,h:1,ax:0,ay:0,z:[S.LEER]}};
 var n={},ok=0;L.forEach(function(gr){try{BK.setzen(BK.bilde(formFuer(g,gr),gr.w,gr.h,'clay-wood'),function(id){if(lageVariante(id))return null;n[id.replace(/^bk-lehm-/,'bk-*-')]=1;return LEERTEIL});ok++}catch(e){}});
 return ok?Object.keys(n).sort():null}

// Zeichenhinweis-Vorschlag (deutsch), nur aus dem Eintrag selbst gerechnet; gespeichert wird ein Hinweis nur, wenn er von Hand geschrieben ist.
function vorschlag(e){var i=e.info||{},id=e.id,m=/^bk-(lehm|ziegel|marmor)-(.+)$/.exec(id),t;
 if(e.quelle==='gebaeude'&&e.stand==='keinbild')return '„'+i.name+'“ steht nur in Städten und zählt dort als Zahl (AT3_NEUAUSRICHTUNG.md 3, 5.4). Kein eigenes Bild nötig; sichtbar wird es höchstens als Teil eines Ortsbilds.';
 if(e.quelle==='ort'){t=i.art+(i.biom?' im Biom '+i.biom:'')+(i.groesse?', '+i.groesse:'')+'. Zeigt: '+i.bild+'. ';
  if(i.bauweise)t+='Bauweise im Biom: '+i.bauweise+'. Wirklich passend zum Biom, nicht nur eine Auflage über demselben Haus (5.3a). ';
  if(i.wo)t+='Steht an: '+i.wo+'. ';
  if(e.gruppe==='Ortsbild'||e.gruppe==='Stadtteil')t+='Rauch, Wäsche, Tiere und Boote ins Bild malen, nichts animieren; geht weich in die Landschaft über; Varianten gegen Wiederholung benachbarter Orte. ';
  if(e.gruppe==='Straße')t+='Wird ins Bodenbild gebacken: ausgefranste Ränder, saubere Kreuzungen und Kurven, kein Raster-Look (5.5). ';
  return t+(e.wartet?'Wird erst mit dem Werkzeug '+e.wartet+' (Reiter „Stadtbilder“) zusammengesetzt.':'Abnahme durch Thomas nach AT3_GRAFIK_AUFTRAG.md.')}
 if(e.quelle==='gebaeude'){t='„'+i.name+'“ ('+(i.bereich==='arena'?'Arena-Gelände':'Stadt')+', '+i.groesse+(i.stufe?', Stufe '+i.stufe:'')+'). ';
  t+=e.teile?'Entsteht aus Baukastenteilen (Grundform '+i.form+', alle drei Bauklassen). Zu zeichnen bleibt, was den Zweck zeigt: Schild und Einrichtung'+(i.plan?' für „'+i.plan+'“':'')+'. ':
   'Eigenes Bild nötig (Grundform '+i.form+', nicht aus dem Baukasten)'+(i.plan?': „'+i.plan+'“':'')+'. ';
  return t+(i.text?'Schwarzer Humor im Bild, passend zu: „'+i.text+'“':'')}
 if(e.quelle==='ware')return 'Ware „'+i.name+'“ ('+i.warengruppe+'): kleines Bild für Lager, Karren und Last auf der Schulter, auf einen Blick erkennbar. '+(i.text?'Weg in die Arena: '+i.text:'');
 if(e.grundbild&&m&&lageVariante(id))return 'Lage-Variante bzw. Randteil von '+e.grundbild+' (Grafik-Auftrag Regeln 16–17): gleiche Maße, Fugen und Licht wie das Grundbild, wird mit ihm gezeichnet, gemessen und übernommen.';
 if(e.grundbild&&m)return 'Kultur-Variante von '+e.grundbild+': gleiche Form und Kanten wie das Grundbild, nur Farben und Dach der Kultur. Wird das Grundbild besser, hier nachziehen.';
 if(m){var kl=KLASSE_DE[m[1]];
  return 'Baukastenteil „'+(TEIL_DE[m[2]]||m[2])+'“ der Bauklasse '+kl[0]+'. Stimmung: '+kl[1]+'. Muss nahtlos an die Nachbarteile anschließen (Feld 64 × 32, Kanten und Höhe wie die Skizze), '+
   'sonst klaffen in jedem Gebäude Fugen. Aus einem Teil entstehen hunderte Gebäude: sauber vor verspielt.'}
 if(id==='bk-feld')return 'Acker im Hof: Furchen dunkler Erde mit Grün. Kachelt nahtlos in alle Richtungen, ohne sichtbares Muster.';
 switch(i.kat){
  case 'boden':return 'Bodenfliese „'+i.name+'“: kachelt nahtlos, ohne sichtbare Wiederholung über viele Felder; ruhig halten, damit Figuren davor lesbar bleiben. In First Person nur eine Farbfläche.';
  case 'baum':case 'blume':return '„'+i.name+'“ in der Natur, 4 Kartenrichtungen: die Umrisse müssen auch klein und aus der Ferne erkennbar sein, Einzelheiten sind zweitrangig. Wird ins Bodenbild gebacken, kommt tausendfach vor.';
  case 'figur':return 'Steuerbare Figur „'+i.name+'“: muss auf jedem Boden lesbar sein und scheint hinter Verdeckendem als Punktmuster durch. Posen (Gehen, Stehen, Tragen, Arbeiten) kommen aus F1, das Grundbild gibt Maß und Farben vor.';
  case 'tier':return 'Tier „'+i.name+'“: Umriss sofort erkennbar, Größe im Verhältnis zur Kartenfigur (14 × 24) stimmig. Jagbar und anklickbar, darf ruhig etwas ahnungslos dreinschauen.';
  case 'karren':return 'Fahrzeug „'+i.name+'“ in 4 Richtungen: Ladefläche gut sichtbar, weil Lasten darauf gelegt werden. Ochse und Karren müssen zusammen wie ein Gespann wirken.';
  case 'ware':return 'Ware „'+i.name+'“: klein, auf einen Blick erkennbar im Lager, auf dem Karren und als Last auf der Schulter.';
  case 'wand':case 'dach':return 'Bauteil „'+i.name+'“ aus dem Bauen (G5): fügt sich nahtlos an Nachbarteile, wird ins Bodenbild gebacken.';
  default:return 'Einrichtung „'+i.name+'“: zeigt, wozu der Ort da ist. '+(i.text?'Stimmung wie im Text: „'+i.text+'“':'')}}
function hinweis(e){return e.hinweis||vorschlag(e)}

// Wichtigkeit (1–5) schätzen: wie oft man es im Spiel sieht. Boden und Figuren überall, Natur sehr oft, Bauteile nach Zahl der Arena-Gebäude, die sie nutzen
// (Marmor eine Stufe seltener), Gebäude nach Stufe (Arena-Gelände +1, sieht jeder Besucher), Waren nach Zahl der Rezepte.
// Seit N1 zählen nur noch die 45 Gebäude des Arena-Geländes (Stadtgebäude haben kein Bild), daher eigene Stufen.
function stufeArena(n){return n>=30?5:n>=10?4:n>=3?3:n>=1?2:1}
function wichtigKartei(o,nutz){var g=KAT_GRUPPE[o.kat],id=o.id,m=/^bk-(lehm|ziegel|marmor)-(.+)$/.exec(id);
 if(m){var n=nutz['bk-*-'+m[2]]||0;return klemm(stufeArena(n)-(m[1]==='marmor'?1:0))}
 if(id==='bk-feld')return stufeArena(nutz[id]||0);
 if(nutz[id])return klemm(Math.max(stufeN(nutz[id]),3));
 return {Boden:5,Figur:5,Natur:4,Fahrzeug:4,Bauteil:4,Tier:3,Einrichtung:3,Ware:3}[g]||2}
function wichtigGebaeude(g){var w=g.stufe==null?3:g.stufe<=1?4:g.stufe===2?3:g.stufe<=4?2:1;if(g.bereich==='arena')w++;return klemm(w)}

function etappeGebaeude(g){if(g.vorhanden)return'vorhanden';if(g.bereich!=='arena')return'N5a';return W2C.indexOf(g.id)>=0?'N12':'B'}

// ctx: {S, BK, kartei, obj:{id:objekt}, texte, budgets, gebaeude, waren, rezepte}. Ergebnis: Einträge nur mit abgeleiteten Angaben.
function ableiten(ctx){
 var S=ctx.S,K=(ctx.texte&&ctx.texte.texte)||{},L=[],nutz={},teileGeb={};
 var geb=(ctx.gebaeude&&ctx.gebaeude.gebaeude)||[],war=(ctx.waren&&ctx.waren.waren)||[],rez=(ctx.rezepte&&ctx.rezepte.rezepte)||[];
 geb.forEach(function(g){if(g.bereich!=='arena')return;var t=teileVon(ctx.BK,g,S);teileGeb[g.id]=t;(t||[]).forEach(function(id){nutz[id]=(nutz[id]||0)+1})});
 // Kartei
 var ids=ctx.kartei.objekte.map(function(e){return e.id}),hat={};ids.forEach(function(i){hat[i]=1});
 ids.forEach(function(id){var o=ctx.obj[id];if(!o)return;
  var grund=null,m=/^(bk-(?:lehm|ziegel|marmor)-.+)-([a-z]{1,6})$/.exec(id);if(m&&hat[m[1]]&&!TEIL_DE[id.replace(/^bk-[a-z]+-/,'')])grund=m[1];
  var b=o.bild||{},k=o.karte||{};
  L.push({id:id,quelle:'kartei',gruppe:grund?'Variante':(KAT_GRUPPE[o.kat]||'Einrichtung'),etappe:o.herkunft==='baukasten'?'W2a2':'vorhanden',stand:'skizze',
   ansichten:ansichtenVon(S,o),grundbild:grund,varianten:[],wichtigAuto:wichtigKartei(o,nutz),
   info:{name:K[id+'.name']||o.name,text:K[id+'.info']||'',kat:o.kat,version:o.version,status:o.status,w:b.w,h:b.h,anker:[b.ax,b.ay],
    flaeche:k.flaeche?[k.flaeche.w,k.flaeche.h]:null,kollision:'Feld '+(k.feld||'?')+' · Kanten '+(k.kanten||'0')+(k.anker&&k.anker.length?' · Anker '+k.anker.map(function(a){return a.art||'?'}).join(', '):''),
    genutzt:(id.indexOf('bk-')===0?nutz['bk-*-'+id.replace(/^bk-[a-z]+-/,'')]:nutz[id])||0,messung:messKurz(S,ctx.budgets,o)}})});
 var nachId={};L.forEach(function(e){nachId[e.id]=e});
 L.forEach(function(e){if(e.grundbild&&nachId[e.grundbild])nachId[e.grundbild].varianten.push(e.id)});
 // Geplante Gebäude
 geb.forEach(function(g){var t=teileGeb[g.id],bild=GEB_BILD[g.id]&&hat[GEB_BILD[g.id]]?GEB_BILD[g.id]:null;
  var stadt=g.bereich!=='arena';
  L.push({id:'geb-'+g.id,quelle:'gebaeude',gruppe:'Gebäude',etappe:etappeGebaeude(g),stand:bild?'skizze':stadt?'keinbild':t?'teile':'fehlt',grundbild:bild,
   teile:t||undefined,wichtigAuto:stadt&&!bild?1:wichtigGebaeude(g),
   info:{name:g.name,text:g.text||'',form:formFuer(g),groesse:groesseText(g),stufe:g.stufe==null?null:g.stufe,bereich:g.bereich,plan:g.plan||''}})});
 // Geplante Waren: Etappe N12, wenn ein Arena-Gebäude sie herstellt oder verbraucht oder das Spiel sie schon kennt (kommt mit Karawanen
 // vom Markt, N12b), sonst Phase B; Wichtigkeit nach Zahl der Rezepte
 var gebNach={};geb.forEach(function(g){gebNach[g.id]=g});var frueh={},zahl={};
 rez.forEach(function(r){var g=gebNach[r.geb],arena=g&&g.bereich==='arena';
  (r.aus||[]).forEach(function(a){if(arena)frueh[a.w]='N12';zahl[a.w]=(zahl[a.w]||0)+1});
  (r.ein||[]).forEach(function(a){(a.oder||[a.w]).forEach(function(w){if(arena)frueh[w]='N12';zahl[w]=(zahl[w]||0)+1})})});
 var grDe={};((ctx.waren&&ctx.waren.gruppen)||[]).forEach(function(g){grDe[g.id]=g.de||g.name});
 war.forEach(function(w){var bild=w.spiel&&WARE_BILD[w.spiel]&&hat[WARE_BILD[w.spiel]]?WARE_BILD[w.spiel]:null;if(bild){nachId[bild].info.ware=w.id;return}
  var id='ware-'+w.id;if(hat[id])return;var n=zahl[w.id]||0;
  L.push({id:id,quelle:'ware',gruppe:'Ware',etappe:w.spiel?'N12':frueh[w.id]||'B',stand:'fehlt',ansichten:ansichtenLeer(S,'ware'),
   wichtigAuto:klemm((n>=10?4:n>=4?3:n>=1?2:1)+(w.spiel?1:0)),
   info:{name:w.name,text:w.arena||'',ware:w.id,warengruppe:grDe[w.gruppe]||w.gruppe}})});
 if(ctx.orte)ortsbilder(ctx,L,hat);
 L.forEach(function(e){if(e.varianten&&!e.varianten.length)delete e.varianten;if(!e.grundbild)delete e.grundbild;if(e.teile===undefined)delete e.teile});
 return sortiere(L)}

// Bilder der Welt außerhalb des Arena-Geländes (daten/ortsbilder.json): Kennung, Gruppe, Etappe, Wichtigkeit, Ansichten wie Einrichtung (Boden bei Straßenbelägen).
// Liegt ein Bild mit derselben Kennung schon in der Kartei, gilt der Kartei-Eintrag. „wartet“ = Werkzeug fehlt noch, „nächste Grafik“ überspringt es.
function ortsEintraege(O,gruppen){var R=[],W=O.werkzeug||{},bi=(O.biome||[]).filter(function(b){return!b.nurAussenposten});
 var neu=function(id,gruppe,etappe,w,info,kat,wartet){var e={id:id,quelle:'ort',gruppe:gruppe,etappe:etappe,stand:'fehlt',kat:kat||'einrichtung',wichtigAuto:klemm(w),info:info};
  if(wartet&&!W[wartet])e.wartet=wartet;R.push(e)};
 var fl=function(n){return n+' × '+n+' Felder'};
 (O.siedlungen||[]).forEach(function(s){bi.forEach(function(b){neu('ort-'+s.id+'-'+b.id,'Ortsbild',b.id==='mediterranean'?'N6b':'N6c',s.wichtig,
  {name:s.en+' ('+b.en+')',art:s.de,biom:b.de,groesse:fl(s.felder)+' ('+s.groesse+')',bild:s.bild,bauweise:b.bauweise},null,'N6a')})});
 (O.auflagen||[]).forEach(function(a){(O.siedlungen||[]).forEach(function(s){neu('ort-auflage-'+a.id+'-'+s.id,'Ortsbild','N6c',2,
  {name:s.en+', '+a.en,art:'Auflage „'+a.de+'“ für '+s.de,groesse:fl(s.felder)+' ('+s.groesse+')',bild:a.bild},null,'N6a')})});
 (O.baustile||[]).forEach(function(b){neu('ort-stil-'+b.id,'Ortsbild','N6d',2,{name:'Building style: '+b.id,art:'Baustil einer Kultur',bild:b.de},null,'N6a')});
 var H=O.hauptstaedte;if(H)for(var i=1;i<=H.zahl;i++)neu('ort-capital-'+(i<10?'0':'')+i,'Ortsbild','N6f',1,{name:'Capital '+i+' (placeholder)',art:'Hauptstadt eines Kulturkreises (Platzhalter bis N4a)',groesse:fl(H.felder)+' ('+H.groesse+')',bild:H.bild},null,'N6a');
 (O.zusatzteile||[]).forEach(function(z){neu('ort-teil-'+z.id,'Stadtteil','N6e',z.wichtig,{name:z.en,art:'Zusatzteil „'+z.de+'“ für Ortsbilder',bild:z.bild},null,'N6a')});
 (O.aussenposten||[]).forEach(function(a){neu('posten-'+a.id,'Außenposten',a.etappe,a.wichtig,{name:a.en,art:'Außenposten „'+a.de+'“',groesse:fl(a.felder),wo:a.wo,bild:a.bild})});
 (O.strassen||[]).forEach(function(w){neu('weg-'+w.id,'Straße',w.art==='amweg'?'N7e':'N7d',w.wichtig,{name:w.en,art:{belag:'Straßenbelag',bauweise:'Straßenbauweise',bruecke:'Brücke',amweg:'am Weg'}[w.art]+' „'+w.de+'“',bild:w.bild},w.art==='belag'||w.art==='bauweise'?'boden':'einrichtung')});
 var M=O.marktstaende;if(M)(gruppen||[]).forEach(function(g){neu('marktstand-'+g.id,'Marktstand','N7f',M.wichtig,{name:'Market Stall: '+(g.name||g.id),art:'Marktstand „'+(g.de||g.id)+'“',bild:M.bild})});
 return R}
function ortsbilder(ctx,L,hat){var S=ctx.S;ortsEintraege(ctx.orte,ctx.waren&&ctx.waren.gruppen).forEach(function(e){if(hat[e.id])return;
 e.ansichten=ansichtenLeer(S,e.kat);delete e.kat;L.push(e)})}

function sortiere(L){var q={kartei:0,ware:1,gebaeude:2,ort:3};return L.sort(function(a,b){return(q[a.quelle]-q[b.quelle])||(a.id<b.id?-1:a.id>b.id?1:0)})}

// Gepflegte Liste mit neu Abgeleitetem zusammenführen. Von Hand Gesetztes bleibt: Stand (überarbeitet/fertig), Stand je Ansicht (überarbeitet/fertig),
// Wichtigkeit von Hand, eigener Zeichenhinweis, Etappe von Hand. Ein Eintrag „fehlt“, dessen Bild inzwischen in der Kartei liegt, wird zur Skizze.
// Neue Fassung (Version in der Kartei größer): Stand bleibt, die Messung zeigt „keine“ bzw. „veraltet“, bis der Prüfstand neu misst (wie M6).
function zusammen(alt,neu){var A={},weg=[],L;(alt&&alt.eintraege||[]).forEach(function(e){A[e.id]=e});
 L=neu.map(function(n){var a=A[n.id];if(!a)return n;delete A[n.id];var e=JSON.parse(JSON.stringify(n));
  if(a.stand==='ueberarbeitet'||a.stand==='fertig')e.stand=n.stand==='fehlt'||n.stand==='teile'||n.stand==='keinbild'?n.stand:a.stand;
  if(e.ansichten&&a.ansichten)Object.keys(e.ansichten).forEach(function(k){var v=a.ansichten[k];if(v==='ueberarbeitet'||v==='fertig')e.ansichten[k]=v});
  if(a.wichtigHand)e.wichtigHand=a.wichtigHand;if(a.hinweis&&a.hinweis!==vorschlag(e))e.hinweis=a.hinweis
  if(a.etappeHand)e.etappeHand=a.etappeHand;return e});
 // Kartei-Eintrag ersetzt den geplanten (z. B. ware-xyz gezeichnet): Handangaben wandern mit, das passiert über dieselbe Kennung oben.
 Object.keys(A).forEach(function(k){weg.push(k)});return{eintraege:L,weg:weg}}

function wichtig(e){return e.wichtigHand||e.wichtigAuto}
function etappe(e){return e.etappeHand||e.etappe}
function zeichenbar(e){return e.stand!=='teile'&&e.stand!=='fertig'&&e.stand!=='keinbild'}
var STAND_RANG={fehlt:0,skizze:1,ueberarbeitet:2};
// Nächstes Objekt: das wichtigste noch nicht fertige, das man selbst zeichnen kann (Gebäude aus Teilen werden über ihre Teile besser; „wartet“ erst mit dem Werkzeug).
function naechstes(L,ohne){ohne=ohne||{};var best=null;
 L.forEach(function(e){if(!zeichenbar(e)||e.wartet||ohne[e.id])return;
  if(!best||wichtig(e)>wichtig(best)||wichtig(e)===wichtig(best)&&(STAND_RANG[e.stand]<STAND_RANG[best.stand]||STAND_RANG[e.stand]===STAND_RANG[best.stand]&&e.id<best.id))best=e});return best}
function filtern(L,f){f=f||{};return L.filter(function(e){return(!f.stand||e.stand===f.stand)&&(!f.gruppe||e.gruppe===f.gruppe)&&(!f.etappe||etappe(e)===f.etappe)&&
 (!f.wichtig||wichtig(e)>=f.wichtig)&&(!f.text||(e.id+' '+(e.info&&e.info.name||'')).toLowerCase().indexOf(f.text.toLowerCase())>=0)})}

// Prüfer: passt die Liste zur Kartei und zu den Daten? Ergebnis: Liste von Fehlertexten (leer = in Ordnung).
function pruefen(L,ctx){var f=[],ids={},kart={},S=ctx.S;
 ctx.kartei.objekte.forEach(function(e){kart[e.id]=e});
 L.forEach(function(e){if(ids[e.id])f.push(e.id+': doppelt');ids[e.id]=e;
  if(STAND.indexOf(e.stand)<0)f.push(e.id+': Stand „'+e.stand+'“ unbekannt');if(GRUPPEN.indexOf(e.gruppe)<0)f.push(e.id+': Gruppe „'+e.gruppe+'“ unbekannt');
  if(ETAPPEN.indexOf(etappe(e))<0)f.push(e.id+': Etappe „'+etappe(e)+'“ unbekannt');
  [e.wichtigAuto,e.wichtigHand].forEach(function(w,i){if((i===0||w!=null&&w!==undefined)&&!(w>=1&&w<=5&&w%1===0))f.push(e.id+': Wichtigkeit '+w+' nicht 1–5')});
  if(!hinweis(e))f.push(e.id+': Zeichenhinweis fehlt');
  if(e.ansichten)Object.keys(e.ansichten).forEach(function(k){if(ANSICHT_STAND.indexOf(e.ansichten[k])<0)f.push(e.id+': Ansicht '+k+' „'+e.ansichten[k]+'“ unbekannt')});
  if(e.quelle==='kartei'){var o=ctx.obj[e.id];if(!kart[e.id]||!o)f.push(e.id+': nicht in der Kartei');
   else{var soll=Object.keys(ansichtenVon(S,o)).sort().join(),ist=Object.keys(e.ansichten||{}).sort().join();if(soll!==ist)f.push(e.id+': Ansichten '+ist+' statt '+soll)}}
  if(e.grundbild&&!kart[e.grundbild])f.push(e.id+': Grundbild „'+e.grundbild+'“ nicht in der Kartei');
  (e.varianten||[]).forEach(function(v){if(!kart[v])f.push(e.id+': Variante „'+v+'“ nicht in der Kartei')});
  (e.teile||[]).forEach(function(t){if(t.indexOf('bk-*-')===0){if(!kart['bk-lehm-'+t.slice(5)])f.push(e.id+': Teil „'+t+'“ fehlt im Baukasten')}else if(!kart[t])f.push(e.id+': Teil „'+t+'“ nicht in der Kartei')});
  if(e.stand==='teile'&&!(e.teile&&e.teile.length))f.push(e.id+': „aus Teilen“ ohne Teile');
  if(e.stand==='keinbild'&&e.quelle!=='gebaeude')f.push(e.id+': „kein Bild nötig“ nur für Stadtgebäude')});
 Object.keys(kart).forEach(function(id){if(!ids[id])f.push(id+': steht in der Kartei, fehlt in der Liste')});
 ((ctx.gebaeude&&ctx.gebaeude.gebaeude)||[]).forEach(function(g){if(!ids['geb-'+g.id])f.push('Gebäude '+g.id+' fehlt in der Liste')});
 if(ctx.orte)ortsEintraege(ctx.orte,ctx.waren&&ctx.waren.gruppen).forEach(function(e){if(!ids[e.id])f.push('Ortsbild '+e.id+' fehlt in der Liste')});
 return f}

// Datei fürs Repository: ein Eintrag je Zeile (kleine Unterschiede im Git), Kopf vorn.
function alsText(d){var k=Object.keys(d).filter(function(x){return x!=='eintraege'});
 return '{\n'+k.map(function(x){return ' '+JSON.stringify(x)+': '+JSON.stringify(d[x])}).join(',\n')+',\n "eintraege": [\n'+
  d.eintraege.map(function(e){return '  '+JSON.stringify(e)}).join(',\n')+'\n ]\n}\n'}
function datei(L,stand){return{format:'at3-arbeitsliste',version:1,stand:stand||'',
 hinweis:'Grafik-Arbeitsliste (AT3_WIRTSCHAFT.md 13.7). Erzeugt mit tools/at3-arbeitsliste.cjs, gepflegt im Master-Editor (Grafik → Grafik-Arbeitsliste, Export → --aus). info = abgeleitet, wird bei jedem Lauf neu geschrieben.',
 eintraege:L}}

// Für Zeichner und andere Sitzungen: Text mit allem, was man ohne Rückfrage braucht, wichtigstes zuerst.
function alsMarkdown(L){var Z=L.filter(zeichenbar).sort(function(a,b){return(wichtig(b)-wichtig(a))||(STAND_RANG[a.stand]-STAND_RANG[b.stand])||(a.id<b.id?-1:1)});
 var t='# Grafik-Arbeitsliste Arena Theory 3.0\n\nWichtigstes zuerst. Stand: '+STAND.map(function(s){return s+' = '+STAND_DE[s]}).join(', ')+'. Bilder im Standard AT3-64 (Feld 64 × 32, Palette A, 64 Farben), '+
  'neue Fassung unter derselben Kennung, danach im Prüfstand neu messen. Gebäude aus Teilen stehen nicht einzeln hier: sie werden über ihre Baukastenteile besser. '+
  'Gebäude, die nur in Städten stehen, brauchen kein Bild. „Wartet auf …“ = erst mit diesem Werkzeug zeichnen.\n\n';
 Z.forEach(function(e){var i=e.info||{};t+='## '+e.id+' · '+esc(i.name)+'\n\n- Gruppe '+e.gruppe+' · Stand '+STAND_DE[e.stand]+' · Wichtigkeit '+wichtig(e)+' · Etappe '+etappe(e)+(e.wartet?' · wartet auf '+e.wartet:'')+'\n';
  if(i.groesse)t+='- Größe '+i.groesse+(i.form?', Grundform '+i.form:'')+'\n';if(i.w)t+='- Maße '+i.w+' × '+i.h+' Bildpunkte'+(i.anker?', Anker '+i.anker.join(', '):'')+(i.flaeche?', Fläche '+i.flaeche.join(' × ')+' Felder':'')+(i.kollision?', '+i.kollision:'')+'\n';
  if(e.ansichten)t+='- Ansichten: '+Object.keys(e.ansichten).map(function(k){return ansichtName(k)+' '+e.ansichten[k]}).join(', ')+'\n';
  if(e.grundbild)t+='- Grundbild '+e.grundbild+'\n';if(e.varianten&&e.varianten.length)t+='- Varianten '+e.varianten.join(', ')+'\n';
  if(i.messung&&i.messung.ampel!=='keine')t+='- Letzte Messung '+i.messung.ampel+(i.messung.datum?' ('+i.messung.datum+')':'')+', Budget-Gruppe '+i.messung.budget+'\n';
  if(i.text)t+='- Beschreibung (englisch): '+i.text+'\n';t+='- Zeichenhinweis'+(e.hinweis?'':' (Vorschlag)')+': '+hinweis(e)+'\n\n'});
 return t}

var API={STAND:STAND,STAND_DE:STAND_DE,ANSICHT_STAND:ANSICHT_STAND,GRUPPEN:GRUPPEN,ETAPPEN:ETAPPEN,ableiten:ableiten,zusammen:zusammen,pruefen:pruefen,naechstes:naechstes,
 filtern:filtern,ortsEintraege:ortsEintraege,wichtig:wichtig,etappe:etappe,zeichenbar:zeichenbar,ansichtenVon:ansichtenVon,ansichtName:ansichtName,teileVon:teileVon,vorschlag:vorschlag,hinweis:hinweis,alsText:alsText,datei:datei,alsMarkdown:alsMarkdown};
root.AT3_ARBEITSLISTE=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof self!=='undefined'?self:this);
