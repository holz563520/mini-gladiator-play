// WAS DIE DATEI TUT: Grafikstandard AT3-64 (Schritt M2, Wunsch Thomas 15.11.2026: 64 statt 32 Farben): Feldmaß 64 × 32, Höhenstufen, Größentabelle, Paletten (64 Farben in 11 Farbreihen),
// M5: Kartenrichtungen je Art, Verweise (gespiegelt), First-Person-Bilder nah und fern, Prüfer pruefeAnsichten.
// M6: Bildsignatur, Bewertung einer Messung gegen die Budgetliste, Statuswechsel nach Änderungen, Ladesperre (nur „übernommen“ mit gültiger Messung).
// Speicherformat mit Farbnummern („.“ = ganz durchsichtig, 0–9 A–Z a–z + * = Farbe 0–63), Prüfer für Bilddaten und fertige Bildpunkte, Umwandlung in ein Canvas.
// Gemeinsam für Master-Editor und (ab G1) Spiel. Läuft im Browser und in Node (Tests).
(function(G){
'use strict';
var ZEICHEN='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+*', LEER='.';
// Feste Farbreihen unterschiedlicher Länge (dunkel → hell), zusammen 64 Farben. Gleiche Nummer = gleiche Bedeutung in jeder Palette.
var REIHEN=[{name:'Stein',n:7},{name:'Erde',n:6},{name:'Grün',n:8},{name:'Holz',n:6},{name:'Haut',n:6},{name:'Blut',n:5},{name:'Wasser',n:6},{name:'Sand',n:5},
 {name:'Bronze',n:5},{name:'Purpur',n:5},{name:'Ocker',n:5}];
var START=[];(function(){var o=0;REIHEN.forEach(function(r){START.push(o);o+=r.n})})();
// Jede Reihe aus drei festen Farben (dunkel, Mitte, hell) als gleichmäßige Kurve berechnet. Ergebnis ist fest und wird getestet.
var STUETZEN={
 A:['#0e0c0b #5c5650 #d2cbbe','#24140a #6e4a2c #c09a6c','#0c1606 #46621e #b4cc6c','#2a180a #7a5024 #d8ac64','#3e2016 #a8704c #f4c8a0','#2a0604 #8c1a10 #e05a34',
    '#0c1a24 #2e5a74 #8ec0cc','#5a4a30 #b49c6c #f6ecd0','#3a2408 #9c6a20 #f0c868','#1e0a1a #5e2250 #b46aa0','#3a2a08 #9a7a28 #e8cc70'],
 B:['#080808 #6a6a74 #ececf2','#2c1606 #8a5428 #e0aa6c','#062002 #3a8a18 #b8f070','#2c1806 #94601c #f0c060','#4a2414 #c47c50 #ffdcb4','#400404 #c41810 #ff7a50',
    '#081e4c #2a6cc4 #a0dcff','#786440 #d4bc88 #fffaea','#4a2c04 #c08820 #ffe680','#2a0830 #8a2a90 #e88ae0','#4a3404 #c09a24 #fff07a'],
 C:['#060609 #464658 #b4b4cc','#140c08 #4e3a28 #a08868','#060c08 #2a4430 #849c78','#160e08 #5a4026 #b0905c','#2a1812 #84584a #d8b098','#1a0406 #6e1418 #c0504a',
    '#060c1c #2a4468 #84a0c4','#3a3428 #8a7e64 #e0d6bc','#201408 #7a5a2a #c8a868','#12081a #4a2a5c #9a78b0','#201a08 #7a6630 #c8b478']
};
function hex(n){return('0'+Math.max(0,Math.min(255,Math.round(n))).toString(16)).slice(-2)}
function reihe(def,n){var p=def.split(' ').map(function(h){return[1,3,5].map(function(i){return parseInt(h.substr(i,2),16)})}),D=p[0],M=p[1],L=p[2],out=[];
 for(var i=0;i<n;i++){var t=i/(n-1),c=[0,1,2].map(function(k){var C=2*M[k]-(D[k]+L[k])/2;return(1-t)*(1-t)*D[k]+2*t*(1-t)*C+t*t*L[k]});out.push('#'+c.map(hex).join(''))}return out}
function palette(k){var f=[];STUETZEN[k].forEach(function(d,r){f=f.concat(reihe(d,REIHEN[r].n))});return f}
var PALETTEN={
 A:{name:'Rattenpergament',text:'warm, erdig, gedämpft (Vorschlag)',farben:palette('A')},
 B:{name:'Sonnenarena',text:'heller und bunter, nah an RollerCoaster Tycoon',farben:palette('B')},
 C:{name:'Abenddämmerung',text:'dunkler und kühler, düster',farben:palette('C')}
};
// Maße wie RollerCoaster Tycoon Classic. Höhenstufe 8 px, ein Geschoss = 4 Stufen = 32 px.
var FELD={w:64,h:32}, HOEHE=8, GESCHOSS=32;
// Größentabelle (Vorschlag M2): größtes erlaubtes Bild je Art, Anker = Fußpunkt auf der Feldmitte bzw. Feldkante.
var GROESSEN={
 boden: {w:64,h:32, text:'Bodenfeld, genau eine Raute 64 × 32'},
 blume: {w:32,h:32, text:'Blume, Busch, Kleinkram (1 Feld)'},
 baum:  {w:64,h:128,text:'Baum, Fels (1 Feld, bis 4 Geschosse hoch)'},
 wand:  {w:32,h:96, text:'Wandstück an einer Feldkante, 1 Geschoss, mit Oberkante (Baukasten seit N6b2b1: 51 hoch, Maßstab 1,5×)'},
 dach:  {w:64,h:64, text:'Dachstück je Feld'},
 einrichtung:{w:64,h:64, text:'Einrichtung, Arbeitsplatz, Lagerstelle (1 Feld)'},
 ware:  {w:32,h:32, text:'Ware, Stapel'},
 figur: {w:16,h:32, text:'Figur auf der Karte, so groß wie in 2.0 (rund 22 Bildpunkte hoch, Thomas 15.11.2026), hinter Wänden als Umriss sichtbar'},
 tier:  {w:32,h:32, text:'Tier auf der Karte'},
 karren:{w:48,h:40, text:'Karren, Fahrzeug'},
 anlage:{w:1280,h:768,text:'Große Anlage (Arena, Rennbahn): ein großes vorgezeichnetes Bild je Ausbaustufe, Anker = Mitte des Mittelfelds (AR1a)'}
};

function farbe(hex){return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]}
// Prüft ein Bild im Speicherformat {kat,w,h,ax,ay,z:[Zeilen]}. Rückgabe: Liste von Fehlern (leer = in Ordnung).
function pruefe(b){
 var f=[];
 if(!b||typeof b!=='object')return ['kein Bild'];
 var g=GROESSEN[b.kat];if(!g)f.push('unbekannte Art „'+b.kat+'“');
 if(!(b.w>0&&b.h>0&&b.w%1===0&&b.h%1===0))f.push('Maße ungültig');
 if(g&&(b.w>g.w||b.h>g.h))f.push('zu groß: '+b.w+' × '+b.h+', erlaubt '+g.w+' × '+g.h);
 if(b.kat==='boden'&&(b.w!==FELD.w||b.h!==FELD.h))f.push('Boden muss genau '+FELD.w+' × '+FELD.h+' sein');
 if(!(b.ax>=0&&b.ax<=b.w&&b.ay>=0&&b.ay<=b.h))f.push('Anker außerhalb des Bildes');
 if(!Array.isArray(b.z)||b.z.length!==b.h)f.push('Zeilenzahl passt nicht zur Höhe');
 else{var falsch=0,laenge=0,voll=0;
  for(var y=0;y<b.z.length;y++){var r=b.z[y];if(typeof r!=='string'||r.length!==b.w){laenge++;continue}
   for(var x=0;x<r.length;x++){var c=r[x];if(c===LEER)continue;if(ZEICHEN.indexOf(c)<0)falsch++;else voll++}}
  if(laenge)f.push(laenge+' Zeilen mit falscher Länge');
  if(falsch)f.push(falsch+' Bildpunkte mit Farbe außerhalb der Palette');
  if(!voll)f.push('Bild ist leer');
 }
 return f;
}
// Prüft fertige Bildpunkte (RGBA, z. B. aus einem Canvas oder einem fremden Bild) gegen eine Palette.
function pruefePunkte(d,palette){
 var p={},fremd=0,halb=0,beispiel=null;(PALETTEN[palette]||palette).farben.forEach(function(h){var c=farbe(h);p[(c[0]<<16)|(c[1]<<8)|c[2]]=1});
 for(var i=0;i<d.length;i+=4){var a=d[i+3];if(a===0)continue;if(a!==255){halb++;continue}
  if(!p[(d[i]<<16)|(d[i+1]<<8)|d[i+2]]){fremd++;if(!beispiel)beispiel='rgb('+d[i]+','+d[i+1]+','+d[i+2]+')'}}
 var f=[];if(fremd)f.push(fremd+' Bildpunkte in fremder Farbe (z. B. '+beispiel+')');if(halb)f.push(halb+' Bildpunkte halb durchsichtig');return f;
}
// Bild → Canvas in einer Palette. Einmal vorbereitet, danach nur noch kopiert (kein Umrechnen beim Zeichnen).
var cache=typeof WeakMap!=='undefined'?new WeakMap():null;
function zuCanvas(b,palette){
 var pal=PALETTEN[palette]||palette, k=cache&&cache.get(b);if(k&&k[pal.name])return k[pal.name];
 var c=document.createElement('canvas');c.width=b.w;c.height=b.h;var x2=c.getContext('2d'),im=x2.createImageData(b.w,b.h),d=im.data,rgb=pal.farben.map(farbe);
 for(var y=0;y<b.h;y++){var r=b.z[y];for(var x=0;x<b.w;x++){var n=ZEICHEN.indexOf(r[x]);if(n<0)continue;var o=(y*b.w+x)*4,q=rgb[n];d[o]=q[0];d[o+1]=q[1];d[o+2]=q[2];d[o+3]=255}}
 x2.putImageData(im,0,0);if(cache){if(!k){k={};cache.set(b,k)}k[pal.name]=c}return c;
}
// Nächste Palettenfarbe (gewichteter Abstand, Grün zählt am meisten). Nur zum einmaligen Umrechnen vorhandener Bilder im Editor, nie im Spiel.
function naechste(r,g,b,palette){var f=(PALETTEN[palette]||palette).farben,best=0,bd=1e9;
 for(var i=0;i<f.length;i++){var c=farbe(f[i]),dr=r-c[0],dg=g-c[1],db=b-c[2],rm=(r+c[0])/2,d=(2+rm/256)*dr*dr+4*dg*dg+(2+(255-rm)/256)*db*db;if(d<bd){bd=d;best=i}}return best}
// Objekt der Kartei: {format:'at3-objekt', id, version, kat, name, status, herkunft, bild}. Kennung: a–z, 0–9, Bindestrich.
var STATUS=['skizze','geprueft','uebernommen'];
function pruefeObjekt(o){var f=[];if(!o||o.format!=='at3-objekt')return ['kein AT3-Objekt'];
 if(!/^[a-z0-9][a-z0-9-]{1,39}$/.test(o.id||''))f.push('Kennung ungültig (a–z, 0–9, Bindestrich, 2–40 Zeichen)');
 if(!(o.version>=1&&o.version%1===0))f.push('Version ungültig');if(!o.name)f.push('Name fehlt');if(STATUS.indexOf(o.status)<0)f.push('Status ungültig');
 if(o.bild&&o.bild.kat!==o.kat)f.push('Art von Objekt und Bild verschieden');
 return f.concat(pruefe(o.bild).map(function(x){return'Bild: '+x}),o.bild?pruefeAnsichten(o):[])}
// Speicherbedarf als Farbnummern (1 Byte je Bildpunkt) für Messungen.
function bytes(b){return b&&b.z?b.w*b.h:0}

// ── M5: Zwei Ansichten ─────────────────────────────────────────────────────────────────────────────
// Kartenrichtungen je Art (Thomas 15.11.2026: Natur 4 wie Gebäude). Richtung 1 = o.bild, Richtungen 2… in o.richtungen.
// Ein Eintrag ist ein eigenes Bild oder ein Verweis {von:0, spiegel:true}: kostet keinen Speicher, wird beim Laden einmal aufgelöst.
// First Person: o.fp = {nah: Bild oder {von:0} (= Kartenbild Richtung 1), fern: Bild, fernAuto: true (aus nah verkleinert)}.
var RICHTUNGEN={boden:1,blume:4,baum:4,wand:1,dach:4,einrichtung:4,ware:1,figur:4,tier:4,karren:4,anlage:1};   // AR1a: große Anlagen nur eine Richtung (rund bzw. fest ausgerichtet)
function spiegelBild(b){return{kat:b.kat,w:b.w,h:b.h,ax:Math.max(0,b.w-1-b.ax),ay:b.ay,z:b.z.map(function(r){return r.split('').reverse().join('')})}}
// Halbe Größe, nur Palettenfarben: je 2 × 2 Bildpunkte die häufigste Farbe; weniger als 2 gefüllte Punkte = durchsichtig. Einmal im Editor, nie im Spiel.
function halbBild(b){var w=Math.ceil(b.w/2),h=Math.ceil(b.h/2),z=[];
 for(var y=0;y<h;y++){var r='';for(var x=0;x<w;x++){var n={},voll=0,best=LEER,bn=0;
  for(var dy=0;dy<2;dy++)for(var dx=0;dx<2;dx++){var zz=b.z[2*y+dy],c=zz&&zz[2*x+dx];if(!c||c===LEER)continue;voll++;n[c]=(n[c]||0)+1;if(n[c]>bn){bn=n[c];best=c}}
  r+=voll>=2?best:LEER}z.push(r)}
 return{kat:b.kat,w:w,h:h,ax:Math.floor(b.ax/2),ay:Math.floor(b.ay/2),z:z}}
function istVerweis(e){return !!e&&!e.z&&typeof e.von==='number'}
// Bild der Kartenrichtung r (0-basiert) mit aufgelösten Verweisen. Verweise zeigen nur auf Richtung 1 (keine Ketten).
function richtungsBild(o,r){if(!r)return o.bild;var e=o.richtungen&&o.richtungen[r-1];if(!e)return null;
 if(!istVerweis(e))return e;var b=e.von===0?o.bild:null;return b?(e.spiegel?spiegelBild(b):b):null}
// First Person in 8 Seiten (Thomas 15.11.2026, wie Doom/Dungeon Keeper): gerade Seiten 0,2,4,6 = Kartenrichtungen 1–4,
// schräge Seiten 1,3,5,7 = o.fp.zwischen[0–3]. Fehlt ein Eintrag (Standard), zeigt die Seite automatisch das Bild der linken Nachbarrichtung: 0 Byte, keine Datenänderung.
// Arten mit nur 1 Kartenrichtung (Boden, Wand, Ware) haben 1 Seite.
var FP_SEITEN=8;
function fpSeiten(o){return (RICHTUNGEN[o.kat]||1)>1?FP_SEITEN:1}
function zwischenBild(o,i){var e=o.fp&&o.fp.zwischen&&o.fp.zwischen[i];return e&&e.z?e:null}
function fpBild(o,was){var f=o.fp;if(!f)return null;var e=f[was];if(!e)return null;if(istVerweis(e))return e.von===0?o.bild:null;return e}
function haeufigste(b){var n={},best=0,bn=-1;b.z.forEach(function(r){for(var i=0;i<r.length;i++){var c=r[i];if(c===LEER)continue;n[c]=(n[c]||0)+1;if(n[c]>bn){bn=n[c];best=ZEICHEN.indexOf(c)}}});return best}
// Fehlende Ansichten mit sparsamen Startfassungen füllen (Thomas: nah aus Kartenbild, fern automatisch). Ändert nur Fehlendes.
function ansichtenErgaenzen(o){var R=RICHTUNGEN[o.kat]||1,neu=0;o.richtungen=o.richtungen||[];
 for(var r=1;r<R;r++)if(!o.richtungen[r-1]){o.richtungen[r-1]={von:0,spiegel:r%2===1};neu++}
 o.richtungen.length=R-1;if(!o.richtungen.length)delete o.richtungen;
 o.fp=o.fp||{};
 if(o.kat==='boden'){if(!(o.fp.farbe>=0)){o.fp={farbe:haeufigste(o.bild)};neu++}return neu}   // Boden in First Person = Farbfläche (AT3_PLAN 9.5)
 if(!o.fp.nah){o.fp.nah={von:0};neu++}
 if(!o.fp.fern||o.fp.fernAuto){var alt=JSON.stringify(o.fp.fern||null);o.fp.fern=halbBild(fpBild(o,'nah'));o.fp.fernAuto=true;if(alt!==JSON.stringify(o.fp.fern))neu++}
 return neu}
// Prüfer M5: alle Kartenrichtungen und beide First-Person-Bilder vorhanden und gültig. Ohne beide Ansichten keine Übernahme (Regel 7).
function pruefeAnsichten(o){var f=[],R=RICHTUNGEN[o.kat]||1,n=(o.richtungen||[]).length;
 if(n!==R-1)f.push('Kartenansicht braucht '+R+' Richtung'+(R>1?'en':'')+', vorhanden '+(o.bild?n+1:0));
 for(var r=1;r<R;r++){var e=o.richtungen&&o.richtungen[r-1];if(!e)continue;
  if(istVerweis(e)){if(e.von!==0)f.push('Richtung '+(r+1)+': Verweis nur auf Richtung 1 erlaubt')}
  else pruefe(e).forEach(function(x){f.push('Richtung '+(r+1)+': '+x)});
  var b=richtungsBild(o,r);if(b&&b.kat!==o.kat)f.push('Richtung '+(r+1)+': falsche Art')}
 if(o.kat==='boden'){if(!o.fp||!(o.fp.farbe>=0&&o.fp.farbe<64&&o.fp.farbe%1===0))f.push('First Person: Bodenfarbe (Farbnummer 0–63) fehlt');return f}
 if(!o.fp)f.push('First-Person-Ansicht fehlt');
 else ['nah','fern'].forEach(function(w){var e=o.fp[w];if(!e){f.push('First Person '+w+' fehlt');return}
  if(istVerweis(e)){if(e.von!==0)f.push('First Person '+w+': Verweis nur auf Richtung 1 erlaubt');return}
  pruefe(e).forEach(function(x){f.push('First Person '+w+': '+x)});if(e.kat!==o.kat)f.push('First Person '+w+': falsche Art')});
 if(o.fp&&o.fp.zwischen){var zw=o.fp.zwischen;if(fpSeiten(o)<8||!Array.isArray(zw)||zw.length>4)f.push('First Person schräg: höchstens 4 Bilder, nur bei Arten mit 4 Kartenrichtungen');
  else zw.forEach(function(e,i){if(!e)return;if(!e.z){f.push('First Person schräg '+(i+1)+': nur eigenes Bild oder leer (= automatisch)');return}
   pruefe(e).forEach(function(x){f.push('First Person schräg '+(i+1)+': '+x)});if(e.kat!==o.kat)f.push('First Person schräg '+(i+1)+': falsche Art')})}
 pruefeBewegt(o,f);
 var nah=fpBild(o,'nah'),fern=fpBild(o,'fern');
 if(nah&&fern&&fern.z&&(fern.w>Math.ceil(nah.w/2)+1||fern.h>Math.ceil(nah.h/2)+1))f.push('First Person fern muss etwa halb so groß wie nah sein');
 return f}
// FP3 (Thomas 17.11.2026): bewegte Objekte (Figur, Tier, Karren) in First Person. Wenige Richtungen und Posen (AT3_PLAN 9.4):
//  · Figur/Tier: vorn (schaut zur Kamera) oder hinten, Bild nach rechts gewandt, nach links gespiegelt. Pose 0 = Stehen (Kartenbild Richtung 1 und 3),
//    Posen 1… = o.fp.posen[i] {vorn, hinten} (Laufbilder). Tiere bekommen später dieselbe Form.
//  · Karren: Seite = Kartenbild (nach rechts, links gespiegelt), dazu o.fp.vorn / o.fp.hinten für „kommt auf mich zu“ / „fährt weg“.
var BEWEGT={figur:1,tier:1,karren:1};
function istBewegt(o){return !!(o&&BEWEGT[o.kat])}
// Welches Bild? zu: Anteil der Blickrichtung zur Kamera hin, re: Anteil nach rechts (Bildschirm). Ergebnis {b, spiegel} oder null.
function bewegtWahl(o,pose,zu,re){var sp=re<0,f=o.fp||{};
 if(o.kat==='karren'){var l=Math.hypot(zu,re)||1;if(zu/l>.7071&&f.vorn&&f.vorn.z)return{b:f.vorn,spiegel:false};if(-zu/l>.7071&&f.hinten&&f.hinten.z)return{b:f.hinten,spiegel:false};return{b:o.bild,spiegel:sp}}
 var vorn=zu>=0,P=pose>0&&f.posen&&f.posen[pose-1];if(P){var e=vorn?P.vorn:P.hinten;if(e&&e.z)return{b:e,spiegel:sp}}
 var b=vorn?o.bild:(richtungsBild(o,2)||o.bild);return{b:b,spiegel:sp}}
function posenZahl(o){return 1+((o&&o.fp&&o.fp.posen)||[]).length}
function pruefeBewegt(o,f){var p=o.fp;if(!p)return;
 if(p.posen){if(!istBewegt(o)||o.kat==='karren'||!Array.isArray(p.posen)||p.posen.length>4)f.push('First Person Posen: höchstens 4, nur bei Figuren und Tieren');
  else p.posen.forEach(function(e,i){['vorn','hinten'].forEach(function(w){var b=e&&e[w];if(!b||!b.z){f.push('First Person Pose '+(i+1)+' '+w+' fehlt');return}
   pruefe(b).forEach(function(x){f.push('First Person Pose '+(i+1)+' '+w+': '+x)});if(b.kat!==o.kat)f.push('First Person Pose '+(i+1)+' '+w+': falsche Art')})})}
 ['vorn','hinten'].forEach(function(w){var b=p[w];if(!b)return;if(o.kat!=='karren'||!b.z){f.push('First Person '+w+': nur eigenes Bild, nur bei Karren');return}
  pruefe(b).forEach(function(x){f.push('First Person '+w+': '+x)});if(b.kat!==o.kat)f.push('First Person '+w+': falsche Art')})}
// Speicher aller Ansichten eines Objekts (Verweise zählen 0).
function ansichtenBytes(o){var k=bytes(o.bild),fp=0;(o.richtungen||[]).forEach(function(e){if(!istVerweis(e))k+=bytes(e)});
 if(o.fp){['nah','fern'].forEach(function(w){var e=o.fp[w];if(e&&!istVerweis(e))fp+=bytes(e)});(o.fp.zwischen||[]).forEach(function(e){if(e&&e.z)fp+=bytes(e)});(o.fp.posen||[]).forEach(function(e){fp+=bytes(e&&e.vorn)+bytes(e&&e.hinten)});fp+=bytes(o.fp.vorn)+bytes(o.fp.hinten)}return{karte:k,fp:fp,summe:k+fp}}

// ── M6: Prüfstand und Übernahme ────────────────────────────────────────────────────────────────────
// Feldreihenfolge der Objekt-Datei. messung = gedrosselte Messung, geraet = Messung auf einem echten Gerät (beide mit Bildsignatur).
var FELDER=['format','id','version','typ','kat','name','status','herkunft','karte','bild','richtungen','schilder','zeremonie','fp','messung','geraet'];   // schilder: Wechselschilder eines Ganzbilds (N6b3b1/b2); zeremonie: Zeremonienfeld der Tempel (N6b3b3)
function ordne(o){var n={};FELDER.forEach(function(k){if(o[k]!==undefined)n[k]=o[k]});return n}
// Signatur über alles, was gezeichnet wird (Art und alle Ansichten). Ändert sich ein Bildpunkt, ist jede alte Messung ungültig.
function signatur(o){var t=JSON.stringify([o.kat,o.bild||null,o.richtungen||null,o.fp||null]),h=0x811c9dc5;
 for(var i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return('0000000'+h.toString(16)).slice(-8)+'-'+t.length.toString(36)}
// Dateigröße wie exportiert, ohne die Messberichte (die gehören nicht zum Bild).
function dateiBytes(o){var n={};FELDER.forEach(function(k){if(o[k]!==undefined&&k!=='messung'&&k!=='geraet')n[k]=o[k]});return JSON.stringify(n).length+1}
// Status nach einer Änderung (Entscheidung Thomas 15.11.2026): neues Bild → zurück auf Skizze, Messung verworfen.
// Nur Karte, Name oder Typnummer geändert → zurück auf Skizze, Messung bleibt gültig (nur neu prüfen und übernehmen). Sonst bleibt alles.
function nachAenderung(alt,neu){if(!alt)return neu;
 if(signatur(alt)!==signatur(neu)){neu.status='skizze';delete neu.messung;delete neu.geraet;return neu}
 if(alt.messung)neu.messung=alt.messung;if(alt.geraet)neu.geraet=alt.geraet;
 neu.status=JSON.stringify([alt.karte,alt.name,alt.typ])===JSON.stringify([neu.karte,neu.name,neu.typ])?(alt.status||'skizze'):'skizze';return neu}
function budgetGruppe(B,kat){if(!B||!B.gruppen)return null;for(var k in B.gruppen)if(B.gruppen[k].kats.indexOf(kat)>=0){var g=B.gruppen[k];g.id=k;return g}return null}
// Messung gegen Budget: rot = über Budget (keine Übernahme), gelb = über 75 % des Budgets, grün = darunter.
// m = {datei, bildspeicher, karte:[{n,p95}], fp:[{n,p95}]}; bewertet wird die größte Stufe. Budgets wirken auch auf alte Messungen.
function bewerte(m,B,kat){var g=budgetGruppe(B,kat),r=[],gelb=[];
 if(!g)return{ampel:'rot',gruende:['keine Budgetgruppe für Art „'+kat+'“']};
 if(!m)return{ampel:'keine',gruende:['noch nicht gemessen']};
 if(m.datei>g.datei)r.push('Datei '+m.datei+' B über '+g.datei+' B');else if(m.datei>.75*g.datei)gelb.push('Datei knapp');
 var bs=g.bildspeicher||B.bildspeicher;   // AR1a: Gruppe darf eigenen Bildspeicher haben (große Anlagen)
 if(m.bildspeicher>bs)r.push('Bildspeicher '+m.bildspeicher+' B über '+bs+' B');
 ['karte','fp'].forEach(function(a){var b=g[a];if(!b||b.gilt)return;   // gilt: Wert zählt anderswo (backzeit = Bildkern im Spiel, „ab FP1“ = erst mit First Person im Spiel; Thomas 16.11.2026)
 var L=m[a]||[],s=L[L.length-1],nm=a==='karte'?'Karte':'First Person';
  if(!s||s.n<b.stufen[b.stufen.length-1]){r.push(nm+': Messung mit '+b.stufen[b.stufen.length-1]+' Stück fehlt');return}
  if(s.p95>b.ms)r.push(nm+' '+s.n+' Stück: '+s.p95.toFixed(1)+' ms über '+b.ms+' ms');else if(s.p95>.75*b.ms)gelb.push(nm+' knapp ('+s.p95.toFixed(1)+' von '+b.ms+' ms)')});
 return r.length?{ampel:'rot',gruende:r}:{ampel:gelb.length?'gelb':'gruen',gruende:gelb}}
// Ladesperre: Gründe, warum das Spiel ein Objekt NICHT laden darf (leer = ladbar). Bildfehler, Ansichten, Status, veraltete oder rote Messung.
function ladbar(o,B){var f=pruefeObjekt(o);if(!o||o.format!=='at3-objekt')return f;var sig=signatur(o);
 if(o.status!=='uebernommen')f.push('Status ist „'+o.status+'“, nicht „übernommen“');
 if(!o.messung)f.push('keine Messung');else if(o.messung.sig!==sig)f.push('Messung veraltet (Bild geändert)');
 else if(B){var b=bewerte(o.messung,B,o.kat);if(b.ampel==='rot')f=f.concat(b.gruende);if(dateiBytes(o)>(budgetGruppe(B,o.kat)||{datei:0}).datei)f.push('Datei über Budget')}
 if(o.geraet&&o.geraet.sig===sig&&B&&bewerte(o.geraet,B,o.kat).ampel==='rot')f.push('auf dem Gerät über Budget');
 return f}
// Lader fürs Spiel (ab G1): holt nur Kartei-Einträge mit Status „übernommen“ und prüft jedes Objekt noch einmal mit ladbar.
// holen(datei) → Promise mit dem Objekt. Ergebnis {objekte:{id:o}, abgelehnt:[{id,gruende}]}.
function ladeUebernommene(kartei,holen,B){var aus={objekte:{},abgelehnt:[]},L=(kartei&&kartei.objekte)||[];
 return Promise.all(L.map(function(e){if(e.status!=='uebernommen'){aus.abgelehnt.push({id:e.id,gruende:['in der Kartei nicht übernommen']});return null}
  return Promise.resolve(holen(e.datei)).then(function(o){var f=ladbar(o,B);if(o&&o.id!==e.id)f.push('Kennung passt nicht zur Kartei');
   if(f.length)aus.abgelehnt.push({id:e.id,gruende:f});else aus.objekte[o.id]=o},function(){aus.abgelehnt.push({id:e.id,gruende:['Datei nicht lesbar']})})})).then(function(){return aus})}
var PALETTE='A';   // Entscheidung Thomas 15.11.2026 (E5)
var AT3_64={PALETTE:PALETTE,STATUS:STATUS,naechste:naechste,pruefeObjekt:pruefeObjekt,ZEICHEN:ZEICHEN,LEER:LEER,REIHEN:REIHEN,PALETTEN:PALETTEN,FELD:FELD,HOEHE:HOEHE,GESCHOSS:GESCHOSS,GROESSEN:GROESSEN,
 START:START,nummer:function(reihe,stufe){return START[reihe]+stufe},
 dunkler:function(n){for(var r=REIHEN.length-1;r>=0;r--)if(n>=START[r])return n>START[r]?n-1:n;return n},farbe:farbe,pruefe:pruefe,pruefePunkte:pruefePunkte,zuCanvas:zuCanvas,bytes:bytes,
 RICHTUNGEN:RICHTUNGEN,FELDER:FELDER,ordne:ordne,signatur:signatur,dateiBytes:dateiBytes,nachAenderung:nachAenderung,budgetGruppe:budgetGruppe,bewerte:bewerte,ladbar:ladbar,ladeUebernommene:ladeUebernommene,spiegelBild:spiegelBild,istBewegt:istBewegt,bewegtWahl:bewegtWahl,posenZahl:posenZahl,halbBild:halbBild,istVerweis:istVerweis,richtungsBild:richtungsBild,fpBild:fpBild,FP_SEITEN:FP_SEITEN,fpSeiten:fpSeiten,zwischenBild:zwischenBild,ansichtenErgaenzen:ansichtenErgaenzen,pruefeAnsichten:pruefeAnsichten,ansichtenBytes:ansichtenBytes};
if(typeof module!=='undefined'&&module.exports)module.exports=AT3_64;else G.AT3_64=AT3_64;
})(typeof window!=='undefined'?window:globalThis);
