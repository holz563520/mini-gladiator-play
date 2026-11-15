// WAS DIE DATEI TUT: Grafikstandard AT3-32 (Schritt M2): Feldmaß 64 × 32, Höhenstufen, Größentabelle, Paletten (32 Farben in 8 Reihen à 4 Stufen),
// Speicherformat mit Farbnummern („.“ = ganz durchsichtig, 0–9 A–V = Farbe 0–31), Prüfer für Bilddaten und fertige Bildpunkte, Umwandlung in ein Canvas.
// Gemeinsam für Master-Editor und (ab G1) Spiel. Läuft im Browser und in Node (Tests).
(function(G){
'use strict';
var ZEICHEN='0123456789ABCDEFGHIJKLMNOPQRSTUV', LEER='.';
// Feste Farbreihen: Nummer = Reihe*4 + Stufe (0 dunkel … 3 hell). Gleiche Nummer = gleiche Bedeutung in jeder Palette.
var REIHEN=['Stein','Erde','Grün','Holz','Haut','Blut','Wasser','Sand'];
var PALETTEN={
 A:{name:'Rattenpergament',text:'warm, erdig, gedämpft (Vorschlag)',farben:[
  '#1a1412','#3e3631','#6b625a','#a39a8c', '#2e1a0e','#553420','#7d5434','#a87c52', '#1f2a12','#3a4a1c','#5d6e2a','#8c9a48', '#3a2410','#6a4420','#96682e','#c49650',
  '#4a2a1c','#7e4a32','#b07a56','#dcae84', '#2e0806','#6a0c06','#9a1e10','#c8482a', '#142028','#24404e','#3e6a78','#6e9ea6', '#6e5a3a','#a88c5c','#d8c08a','#f0e2bc']},
 B:{name:'Sonnenarena',text:'heller und bunter, nah an RollerCoaster Tycoon',farben:[
  '#101010','#4a4a52','#8a8a94','#cfcfd6', '#3c200c','#6e3e18','#a0602a','#cc8a48', '#18400c','#2e7018','#4ea02a','#86d048', '#4a2c0c','#7c4c14','#b07428','#e0a848',
  '#5a3020','#985a3a','#d08c60','#f8c498', '#400404','#880c08','#c8201a','#f05a3a', '#0c2a5a','#1a4e9a','#3482d0','#78c0f0', '#8a7040','#c8a868','#ecd496','#fff6dc']},
 C:{name:'Abenddämmerung',text:'dunkler und kühler, düster',farben:[
  '#0a0a10','#2a2a36','#4e4e5e','#82829a', '#1e140e','#3a281c','#5a402c','#7e6046', '#0e1a14','#1e3226','#34503a','#587858', '#24180e','#463018','#6a4a28','#927040',
  '#3a2420','#644034','#92664e','#c09478', '#200408','#4e0a10','#7e1a1c','#ac3a30', '#0a1428','#182c4a','#2c4c70','#5c7ea0', '#4a4234','#7a6c52','#ac9c78','#d6cab0']}
};
// Maße wie RollerCoaster Tycoon Classic. Höhenstufe 8 px, ein Geschoss = 4 Stufen = 32 px.
var FELD={w:64,h:32}, HOEHE=8, GESCHOSS=32;
// Größentabelle (Vorschlag M2): größtes erlaubtes Bild je Art, Anker = Fußpunkt auf der Feldmitte bzw. Feldkante.
var GROESSEN={
 boden: {w:64,h:32, text:'Bodenfeld, genau eine Raute 64 × 32'},
 blume: {w:32,h:32, text:'Blume, Busch, Kleinkram (1 Feld)'},
 baum:  {w:64,h:128,text:'Baum, Fels (1 Feld, bis 4 Geschosse hoch)'},
 wand:  {w:32,h:48, text:'Wandstück an einer Feldkante, 1 Geschoss'},
 dach:  {w:64,h:64, text:'Dachstück je Feld'},
 ware:  {w:32,h:32, text:'Ware, Stapel'},
 figur: {w:16,h:32, text:'Figur auf der Karte (Höhe nach Wahl: 16, 24 oder 32)'},
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
var AT3_32={ZEICHEN:ZEICHEN,LEER:LEER,REIHEN:REIHEN,PALETTEN:PALETTEN,FELD:FELD,HOEHE:HOEHE,GESCHOSS:GESCHOSS,GROESSEN:GROESSEN,
 nummer:function(reihe,stufe){return reihe*4+stufe},farbe:farbe,pruefe:pruefe,pruefePunkte:pruefePunkte,zuCanvas:zuCanvas,bytes:bytes};
if(typeof module!=='undefined'&&module.exports)module.exports=AT3_32;else G.AT3_32=AT3_32;
})(typeof window!=='undefined'?window:globalThis);
