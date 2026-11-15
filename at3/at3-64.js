// WAS DIE DATEI TUT: Grafikstandard AT3-64 (Schritt M2, Wunsch Thomas 15.11.2026: 64 statt 32 Farben): Feldmaß 64 × 32, Höhenstufen, Größentabelle, Paletten (64 Farben in 11 Farbreihen),
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
 wand:  {w:32,h:56, text:'Wandstück an einer Feldkante, 1 Geschoss, mit Oberkante'},
 dach:  {w:64,h:64, text:'Dachstück je Feld'},
 ware:  {w:32,h:32, text:'Ware, Stapel'},
 figur: {w:16,h:32, text:'Figur auf der Karte (Höhe nach Wahl: 16, 24 oder 32), hinter Wänden als Umriss sichtbar'},
 tier:  {w:32,h:32, text:'Tier auf der Karte'},
 karren:{w:48,h:40, text:'Karren, Fahrzeug'}
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
// Speicherbedarf als Farbnummern (1 Byte je Bildpunkt) für Messungen.
function bytes(b){return b.w*b.h}
var AT3_64={ZEICHEN:ZEICHEN,LEER:LEER,REIHEN:REIHEN,PALETTEN:PALETTEN,FELD:FELD,HOEHE:HOEHE,GESCHOSS:GESCHOSS,GROESSEN:GROESSEN,
 START:START,nummer:function(reihe,stufe){return START[reihe]+stufe},
 dunkler:function(n){for(var r=REIHEN.length-1;r>=0;r--)if(n>=START[r])return n>START[r]?n-1:n;return n},farbe:farbe,pruefe:pruefe,pruefePunkte:pruefePunkte,zuCanvas:zuCanvas,bytes:bytes};
if(typeof module!=='undefined'&&module.exports)module.exports=AT3_64;else G.AT3_64=AT3_64;
})(typeof window!=='undefined'?window:globalThis);
