// WAS DIE DATEI TUT: AT3-Objektkarte (Schritt M4): Typnummer, Gruppe, Fläche in Feldern, Kollision je Feld (frei · nur zu Fuß · gesperrt), gesperrte Feldkanten, Anker,
// englische Texte per Schlüssel aus kartei/text-en.json, Prüfer pruefeKarte, Trefferprüfung beim Antippen über ein Feldraster (Kosten unabhängig von der Weltgröße).
// Dazu das vorbereitete Format eines Stücks in der Riesenwelt (Typnummer, Rolle, Besitzer) – noch ohne Spiellogik, festgelegt wird es in G2/MK1.
(function(G){
'use strict';
// Gruppen der Kartei. Die Art (kat, aus at3-64.js) bestimmt Bildgröße, die Gruppe bestimmt später Verhalten im Spiel.
var GRUPPEN={natur:'Natur',boden:'Boden',bau:'Bau',einrichtung:'Einrichtung',ware:'Ware',person:'Person',tier:'Tier',fahrzeug:'Fahrzeug',zeichen:'Zeichen'};
var GRUPPE_VON={boden:'boden',blume:'natur',baum:'natur',wand:'bau',dach:'bau',einrichtung:'einrichtung',ware:'ware',figur:'person',tier:'tier',karren:'fahrzeug'};
// Kollision je Feld. Wird festgelegt, nie aus Bildpunkten geraten.
var KOLL={f:'frei',p:'nur zu Fuß',x:'gesperrt'};
// Gesperrte Feldkanten (Wände, Zäune) als Bitmaske je Feld, ein Hexzeichen. Draufsicht: i nach rechts, j nach unten.
var KANTE={links:1,oben:2,rechts:4,unten:8};
// Anker in Feldeinheiten (0 … Breite, 0 … Tiefe, in halben Schritten). Der Fußpunkt ist der Bildanker (bild.ax/ay).
var ANKER={tuer:'Tür',laden:'Ladepunkt',arbeit:'Arbeitsplatz',sitz:'Sitzplatz'};
var MAX_FLAECHE=8, TYP_MAX=65535, NAME_MAX=32, INFO_MAX=300;

// ---- Riesenwelt (Vorbereitung, Vorschlag) ----
// Ein Stück in der Welt speichert nie Name oder Beschreibung, nur:
//   typ u16 (Typnummer dieser Karte, bis 65.535 Arten) · Lage im Kartenstück · zustand u8 · rolle u8 · besitzer u32 (0 = niemand)
// Besitzer ist eine Kennung aus eigenen kleinen Datensätzen (Nation, Herrscher, Unterherrscher, Boss, Bande, Dorf, Stadt, Schule).
// Ein Baum kostet so rund 12 Byte, egal wie lang seine Beschreibung ist. Größe und Lage-Format werden in G2/MK1 gemessen und festgelegt.
var STUECK_BYTES=12;
var ROLLEN=['keine','herrscher','unterherrscher','boss','wegelagerer','gladiator','lanista','soldat','haendler','arbeiter','buerger'];
var BESITZER_ARTEN=['nation','herrscher','unterherrscher','boss','bande','dorf','stadt','schule'];

function schluessel(id){return{name:id+'.name',info:id+'.info'}}
function text(texte,id){var s=schluessel(id),t=(texte&&texte.texte)||texte||{};return{name:t[s.name]||'',info:t[s.info]||''}}
function saetze(t){var m=String(t).trim().match(/[^.!?]+[.!?]+(\s|$)/g);return m?m.length:(String(t).trim()?1:0)}
// Leere Karte passend zur Art.
function neueKarte(kat){return{gruppe:GRUPPE_VON[kat]||'natur',flaeche:{w:1,h:1},feld:kat==='boden'?'f':'x',kanten:'0',anker:[]}}
// Größte vergebene Typnummer. typMax in der Kartei verhindert, dass eine Nummer nach dem Löschen neu vergeben wird.
function typMax(kartei,weitere){var m=(kartei&&kartei.typMax)|0;((kartei&&kartei.objekte)||[]).concat(weitere||[]).forEach(function(o){if(o&&o.typ>m)m=o.typ});return m}

// Prüft Karte und Texte eines Objekts. texte = Inhalt von text-en.json (oder nur dessen Feld texte). Rückgabe: Fehlerliste.
function pruefeKarte(o,texte){
 var f=[];if(!o)return['kein Objekt'];
 if(!(o.typ>=1&&o.typ<=TYP_MAX&&o.typ%1===0))f.push('Typnummer fehlt oder ungültig (1–'+TYP_MAX+')');
 var k=o.karte;if(!k||typeof k!=='object')return f.concat('Karte fehlt');
 if(!GRUPPEN[k.gruppe])f.push('Gruppe ungültig');
 var w=k.flaeche&&k.flaeche.w,h=k.flaeche&&k.flaeche.h,n=w*h;
 if(!(w>=1&&h>=1&&w<=MAX_FLAECHE&&h<=MAX_FLAECHE&&w%1===0&&h%1===0))f.push('Fläche ungültig (1–'+MAX_FLAECHE+' Felder je Seite)');
 else{
  if(o.kat==='boden'&&(w!==1||h!==1))f.push('Boden belegt genau ein Feld');
  if(typeof k.feld!=='string'||k.feld.length!==n||/[^fpx]/.test(k.feld))f.push('Kollision fehlt: je Feld f, p oder x');
  if(typeof k.kanten!=='string'||(k.kanten.length!==n&&k.kanten!=='0')||/[^0-9a-f]/.test(k.kanten))f.push('Kanten ungültig');
  if(!Array.isArray(k.anker))f.push('Ankerliste fehlt');
  else k.anker.forEach(function(a,i){
   if(!ANKER[a&&a.art])f.push('Anker '+(i+1)+': Art unbekannt');
   else if(!(a.fx>=0&&a.fx<=w&&a.fy>=0&&a.fy<=h&&(a.fx*2)%1===0&&(a.fy*2)%1===0))f.push('Anker '+(i+1)+' liegt nicht auf der Fläche');
  });
 }
 var t=text(texte,o.id);
 if(!t.name)f.push('Name fehlt in der Sprachdatei');else if(t.name.length>NAME_MAX)f.push('Name zu lang (höchstens '+NAME_MAX+' Zeichen)');
 if(o.name&&t.name&&o.name!==t.name)f.push('Name in Objekt und Sprachdatei verschieden');
 if(!t.info)f.push('Beschreibung fehlt');
 else{if(t.info.length>INFO_MAX)f.push('Beschreibung zu lang (höchstens '+INFO_MAX+' Zeichen)');var s=saetze(t.info);if(s>3)f.push('Beschreibung hat '+s+' Sätze, erlaubt sind 1–3')}
 return f;
}
// Kollision eines Feldes der Fläche (i, j in Feldern ab der Ecke).
function kollision(o,i,j){var k=o.karte;if(!k||i<0||j<0||i>=k.flaeche.w||j>=k.flaeche.h)return null;return k.feld[j*k.flaeche.w+i]}
function kanten(o,i,j){var k=o.karte;if(!k||k.kanten==='0')return 0;return parseInt(k.kanten[j*k.flaeche.w+i],16)||0}

// ---- Antippen: Feldraster ----
// Bild eines Stücks auf Feld (i, j): Feld-Rechteck links oben bei ((i−j)·32, (i+j)·16), Bildanker liegt auf der Feldmitte (+32, +16).
// Antippen prüft nur die Felder, deren Stücke den Punkt überhaupt erreichen können (aus der größten erlaubten Bildgröße),
// dann die Bildpunkte. Die Kosten hängen nicht davon ab, wie groß die Welt ist oder wie viele Stücke sie hat.
function Raster(w,h,platz){
 this.w=w;this.h=h;this.kopf=new Int32Array(w*h).fill(-1);platz=platz||64;
 this.naechst=new Int32Array(platz);this.typ=new Uint16Array(platz);this.feld=new Int32Array(platz);this.n=0;
}
Raster.prototype.setze=function(typ,i,j){
 if(i<0||j<0||i>=this.w||j>=this.h)return -1;
 if(this.n===this.typ.length){var g=this.n*2,a=new Int32Array(g),b=new Uint16Array(g),c=new Int32Array(g);a.set(this.naechst);b.set(this.typ);c.set(this.feld);this.naechst=a;this.typ=b;this.feld=c}
 var s=this.n++,f=j*this.w+i;this.typ[s]=typ;this.feld[s]=f;this.naechst[s]=this.kopf[f];this.kopf[f]=s;return s;
};
// Größte Ausdehnung eines Bildes um seinen Anker (für die Suchfenster). Aus der Größentabelle, nicht aus den vorhandenen Bildern.
function reichweite(groessen){var w=0,h=0;Object.keys(groessen).forEach(function(k){if(groessen[k].w>w)w=groessen[k].w;if(groessen[k].h>h)h=groessen[k].h});return{w:w,h:h}}
// px, py: Weltbildpunkt. bild(typ) liefert das Kartenbild {w,h,ax,ay,z}. Ergebnis: {stueck, typ, i, j, felder} oder null; vorderstes Stück gewinnt.
Raster.prototype.treffer=function(px,py,bild,rw){
 var uMin=Math.floor((py-16-rw.h)/16)-1,uMax=Math.ceil((py-16+rw.h)/16)+1,vMin=Math.floor((px-32-rw.w)/32)-1,vMax=Math.ceil((px-32+rw.w)/32)+1,best=null,felder=0;
 for(var u=uMin;u<=uMax;u++)for(var v=vMin;v<=vMax;v++){
  if((u+v)&1)continue;var i=(u+v)/2,j=(u-v)/2;if(i<0||j<0||i>=this.w||j>=this.h)continue;felder++;
  for(var s=this.kopf[j*this.w+i];s>=0;s=this.naechst[s]){
   var b=bild(this.typ[s]);if(!b)continue;
   var x=Math.floor(px-((i-j)*32+32-b.ax)),y=Math.floor(py-((i+j)*16+16-b.ay));
   if(x<0||y<0||x>=b.w||y>=b.h||b.z[y][x]==='.')continue;
   // Zeichenreihenfolge (wie vor): hinten (kleines i+j) zuerst, dann kleines i, dann früher gesetzt. Das zuletzt Gezeichnete liegt vorne.
   if(!best||u>best.u||u===best.u&&(i>best.i||i===best.i&&s>best.stueck))best={stueck:s,typ:this.typ[s],i:i,j:j,u:u}
  }
 }
 if(best)best.felder=felder;return best||{stueck:-1,felder:felder};
};

var AT3_KARTE={GRUPPEN:GRUPPEN,GRUPPE_VON:GRUPPE_VON,KOLL:KOLL,KANTE:KANTE,ANKER:ANKER,MAX_FLAECHE:MAX_FLAECHE,TYP_MAX:TYP_MAX,NAME_MAX:NAME_MAX,INFO_MAX:INFO_MAX,
 STUECK_BYTES:STUECK_BYTES,ROLLEN:ROLLEN,BESITZER_ARTEN:BESITZER_ARTEN,
 schluessel:schluessel,text:text,saetze:saetze,neueKarte:neueKarte,typMax:typMax,pruefeKarte:pruefeKarte,kollision:kollision,kanten:kanten,Raster:Raster,reichweite:reichweite};
if(typeof module!=='undefined'&&module.exports)module.exports=AT3_KARTE;else G.AT3_KARTE=AT3_KARTE;
})(typeof window!=='undefined'?window:this);
