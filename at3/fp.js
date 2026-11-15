// WAS DIE DATEI TUT: First-Person-Zeichner für AT3 (M5-Nachbesserung, Wunsch Thomas 15.11.2026: „First Person direkt so, dass es gut aussieht“).
// Gemeinsam für Master-Editor und (ab FP1) Spiel. Festes Bild 320 × 180, nur Palettenfarben, keine Durchsichtigkeit:
// Himmel als geraster Farbverlauf, Sonne, zwei Hügelketten im Dunst, Wiese mit Tiefe und Grasbüscheln (alles EINMAL als Hintergrund vorbereitet),
// Objekte nach Blickrichtung (8 Seiten: 4 aus den Kartenrichtungen, 4 schräge automatisch oder eigens gezeichnet), Schatten, Dunst für ferne Objekte über eine Farbtabelle der Palette.
// Je Bild nur Kopieren fertiger Bilder; Vorbereitetes wird zwischengespeichert. Läuft im Browser (Canvas); die Bildfunktionen auch in Node (Tests).
(function(G){
'use strict';
var W=320,H=180,HORIZONT=96;
var BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];   // 4 × 4 Raster für Farbverläufe ohne Zwischenfarben
function S(){return G.AT3_64}

// Blickseite d (0–7, 45°-Schritte). Gerade Seiten = Kartenrichtung d/2; schräge = eigenes Zwischenbild oder automatisch die linke Nachbarrichtung.
function kartenR(o,d){var R=S().RICHTUNGEN[o.kat]||1;return R>1?((d>>1)%R):0}
// Bild des Objekts in First Person „nah“ für Seite d. Verweis aufs Kartenbild → folgt der Kartenrichtung.
function nahBild(o,d){var s=S(),f=o.fp;if(!f||!f.nah)return null;d=((d|0)%8+8)%8;
 if(d&1){var z=s.zwischenBild(o,d>>1);if(z)return z}
 if(!s.istVerweis(f.nah))return f.nah;return s.richtungsBild(o,kartenR(o,d))}
// „fern“: gespeichertes Bild für Richtung 1; andere Richtungen folgen dem Verweis (gespiegelt) oder werden beim Laden einmal verkleinert.
var fernCache={};
function fernBild(o,d){var s=S(),f=o.fp;if(!f||!f.fern)return null;d=((d|0)%8+8)%8;
 if(d&1){var z=s.zwischenBild(o,d>>1);if(z){var kz=o.id+'@'+o.version+'#z'+(d>>1);return fernCache[kz]||(fernCache[kz]=s.halbBild(z))}}
 var r=kartenR(o,d);
 if(!f.fernAuto||!s.istVerweis(f.nah)||!r)return f.fern;
 var e=o.richtungen&&o.richtungen[r-1];if(!e)return f.fern;if(s.istVerweis(e))return e.spiegel?s.spiegelBild(f.fern):f.fern;
 var k=o.id+'@'+o.version+'#'+r;return fernCache[k]||(fernCache[k]=s.halbBild(e))}

// Dunst: jede Palettenfarbe einmal zur Horizontfarbe gemischt und auf die nächste Palettenfarbe gerundet (Tabelle mit 64 Einträgen).
var dunstMerk={};
function dunstTabelle(pal,anteil){var key=pal+':'+anteil;return dunstMerk[key]||(dunstMerk[key]=dunstNeu(pal,anteil))}
// Einmal je Palette und Anteil (64 Farben), danach nur Nachschlagen.
function dunstNeu(pal,anteil){var s=S(),P=s.PALETTEN[pal].farben,ziel=s.farbe(P[s.nummer(6,5)]),t=[];
 for(var n=0;n<P.length;n++){var c=s.farbe(P[n]);t.push(s.naechste(c[0]+(ziel[0]-c[0])*anteil,c[1]+(ziel[1]-c[1])*anteil,c[2]+(ziel[2]-c[2])*anteil,pal))}return t}
function umfaerben(b,tab){var s=S();return{kat:b.kat,w:b.w,h:b.h,ax:b.ax,ay:b.ay,z:b.z.map(function(r){var o='';for(var i=0;i<r.length;i++){var c=r[i];o+=c===s.LEER?c:s.ZEICHEN[tab[s.ZEICHEN.indexOf(c)]]}return o})}}

// Hintergrund als Farbnummern (Uint8Array W × H), deterministisch, einmal je Palette.
function hintergrundNummern(pal){var s=S(),N=s.nummer,px=new Uint8Array(W*H),z=7;function zufall(){z=(z*1103515245+12345)&0x7fffffff;return z/0x7fffffff}
 function setz(x,y,n){if(x>=0&&y>=0&&x<W&&y<H)px[y*W+x]=n}
 function verlauf(y0,y1,stufen){for(var y=y0;y<y1;y++){var t=(y-y0)/Math.max(1,y1-y0-1)*(stufen.length-1),i=Math.min(stufen.length-2,Math.floor(t)),f=t-i;
  for(var x=0;x<W;x++)setz(x,y,f*16>BAYER[(y&3)*4+(x&3)]?stufen[i+1]:stufen[i])}}
 // Himmel: oben tiefer, am Horizont hell und dunstig
 verlauf(0,HORIZONT,[N(6,2),N(6,3),N(6,4),N(6,5)]);
 // Sonne mit Hof
 var sx=262,sy=26;for(var y=-11;y<=11;y++)for(var x=-11;x<=11;x++){var d=Math.sqrt(x*x+y*y);if(d<=6.5)setz(sx+x,sy+y,N(7,4));else if(d<=8.5)setz(sx+x,sy+y,N(7,3));else if(d<=11&&BAYER[((sy+y)&3)*4+((sx+x)&3)]<6)setz(sx+x,sy+y,N(6,5))}
 // Hügel: hinten im Dunst, vorne grün; Höhe aus überlagerten Wellen
 var dunst=dunstTabelle(pal,.6);
 function huegel(basis,hoch,f1,f2,farbe,kante){for(var x=0;x<W;x++){var h=Math.round(basis-hoch*(.55+.3*Math.sin(x*f1+1.3)+.15*Math.sin(x*f2+.4)));
  for(var y=h;y<HORIZONT;y++)setz(x,y,y===h&&kante>=0?kante:farbe)}}
 huegel(HORIZONT,22,.021,.067,dunst[N(2,3)],dunst[N(2,4)]);
 huegel(HORIZONT,11,.034,.11,dunstTabelle(pal,.35)[N(2,3)],dunstTabelle(pal,.35)[N(2,4)]);
 // Baumreihe am Horizont als kleine Kuppen
 for(var x=0;x<W;x+=3){var hh=2+Math.round(2*Math.abs(Math.sin(x*.37))+zufall()*2);for(var y=HORIZONT-hh;y<HORIZONT;y++)for(var k=0;k<3;k++)setz(x+k,y,dunstTabelle(pal,.2)[N(2,2)])}
 // Wiese: am Horizont heller (Dunst), vorne satt; Tiefe durch Verlauf mit Raster
 verlauf(HORIZONT,H,[dunstTabelle(pal,.3)[N(2,4)],N(2,4),N(2,3),N(2,3),N(2,2)]);
 // Grasbüschel, nach vorn größer und dichter (Perspektive)
 for(var i=0;i<900;i++){var y=HORIZONT+2+Math.floor(Math.pow(zufall(),.7)*(H-HORIZONT-2)),x=Math.floor(zufall()*W),t=(y-HORIZONT)/(H-HORIZONT),hoehe=1+Math.round(t*4);
  var hell=zufall()<.5?N(2,5):N(2,6),dunkel=N(2,1);if(t<.15){setz(x,y,N(2,5));continue}
  for(var k=0;k<hoehe;k++){setz(x,y-k,k===hoehe-1?hell:N(2,4));if(t>.5)setz(x+(k&1?1:-1)*(k>1?1:0),y-k,hell)}if(t>.4)setz(x,y+1,dunkel)}
 // Ein paar Blüten im Vordergrund
 for(var i=0;i<40;i++){var y=HORIZONT+30+Math.floor(zufall()*(H-HORIZONT-32)),x=Math.floor(zufall()*W);var c=[N(5,4),N(7,4),N(9,4)][i%3];setz(x,y,c);if(y>150){setz(x+1,y,c);setz(x,y-1,c)}}
 return px}
function nummernZuCanvas(px,pal){var s=S(),P=s.PALETTEN[pal].farben.map(s.farbe),c=document.createElement('canvas');c.width=W;c.height=H;var x=c.getContext('2d'),d=x.createImageData(W,H);
 for(var i=0;i<px.length;i++){var f=P[px[i]];d.data[i*4]=f[0];d.data[i*4+1]=f[1];d.data[i*4+2]=f[2];d.data[i*4+3]=255}x.putImageData(d,0,0);return c}

// Vorbereitete Bilder (Canvas) zwischenspeichern: Hintergrund je Palette, Schatten je Breite, Objektbilder je Objekt (WeakMap) und Richtung/nah/fern/Palette.
// Ändert der Editor ein Objekt, ruft er leeren(o). Im Spiel ändern sich Objekte nicht.
var cache={},cacheN=0,objCache=typeof WeakMap!=='undefined'?new WeakMap():null;
function bild(k,mach){if(!cache[k]){cache[k]=mach();cacheN++}return cache[k]}
function schatten(w){var s=S(),c=document.createElement('canvas'),b=Math.max(6,Math.round(w*.7)),h=Math.max(3,Math.round(b/5));c.width=b;c.height=h;var x=c.getContext('2d');
 x.fillStyle=s.PALETTEN[s.PALETTE].farben[s.nummer(2,1)];for(var y=0;y<h;y++){var t=(y+.5)/h*2-1,hw=Math.round(b/2*Math.sqrt(1-t*t));x.fillRect(b/2-hw,y,2*hw,1)}return c}

// Ein Bild zeichnen. szene = [{o, r (Blickseite 0–7, 45°-Schritte), x (Fußpunkt), y (Fußpunkt), fern:bool}] wird von hinten nach vorn gezeichnet.
function zeichne(ctx,szene,pal){var s=S();pal=pal||s.PALETTE;ctx.imageSmoothingEnabled=false;
 ctx.drawImage(bild('bg:'+pal,function(){return nummernZuCanvas(hintergrundNummern(pal),pal)}),0,0);
 szene.slice().sort(function(a,b){return a.y-b.y}).forEach(function(e){var o=e.o;
  if(o.kat==='boden')return;
  var m=objCache.get(o);if(!m){m={};objCache.set(o,m)}var k=(e.fern?'f':'n')+e.r+':'+pal,v=m[k];
  if(!v){var b=e.fern?fernBild(o,e.r):nahBild(o,e.r);if(!b)return;v=m[k]={b:b,cv:s.zuCanvas(e.fern?umfaerben(b,dunstTabelle(pal,.15)):b,pal)};cacheN++}
  var b=v.b,cv=v.cv;
  var sch=bild('sch:'+b.w,function(){return schatten(b.w)});
  ctx.drawImage(sch,Math.round(e.x-sch.width/2),Math.round(e.y-sch.height/2));
  ctx.drawImage(cv,Math.round(e.x-b.ax),Math.round(e.y-b.ay))});}
function leeren(o){if(o){objCache.delete(o);Object.keys(fernCache).forEach(function(k){if(k.indexOf(o.id+'@')===0)delete fernCache[k]});return}cache={};cacheN=0;fernCache={};objCache=new WeakMap()}
var FP={W:W,H:H,HORIZONT:HORIZONT,nahBild:nahBild,fernBild:fernBild,dunstTabelle:dunstTabelle,umfaerben:umfaerben,hintergrundNummern:hintergrundNummern,zeichne:zeichne,leeren:leeren,
 vorbereitet:function(){return cacheN}};
if(typeof module!=='undefined'&&module.exports)module.exports=FP;else G.AT3_FP=FP;
})(typeof window!=='undefined'?window:globalThis);
