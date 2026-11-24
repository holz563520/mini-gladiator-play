// WAS DIE DATEI TUT: N7a5a0 Wasser immer waagrecht: Eckhöhe des Bodennetzes am Wasser (eine Regel für Bild, Natur, First Person und Begehbarkeit).
// Das Bodennetz rechnet „Ecke = Feld“: die Kachel des Felds x,y nimmt die Ecken der Felder x,y · x+1,y · x,y+1 · x+1,y+1. Eine Wasserkachel würde so
// zum höheren Ufer hochkippen. Regel (Thomas 24.11.2026): Berührt eine Ecke eine Wasserkachel (die Kacheln x,y · x−1,y · x,y−1 · x−1,y−1 benutzen sie),
// liegt sie auf dem tiefsten Wasserspiegel dieser Wasserkacheln (Meer und See auf Meereshöhe). Sonst bleibt sie die Höhe des Felds.
// Folge: jede Kachel eines Gewässers liegt flach, das Ufer senkt sich als Böschung zum Wasser, eine Flussstufe zeigt sich als eine schräge Reihe
// (Stromschnelle). Notausschalter ?n7a5a0=0 (Ecke = Feld wie vorher). Kostet je Ecke vier Vergleiche mit Feldern, die ohnehin geholt werden.
(function(root){
var MEER=2048, WX=614400, WY=307200;
var AN=!(root.location&&/[?&]n7a5a0=0/.test(root.location.search||''));
function wasser(b){return b<2||b===10||b===11}
function spiegel(h,b){return wasser(b)&&h<MEER?MEER:h}
// Eckhöhe (Rohwert wie H) am Feld X,Y. hole(cx,cy) → Kartenstück, sicht(p) → {H,B}. streng: fehlt ein Nachbarstück links oder oben → −1,
// sonst wird es übergangen. Fehlt das eigene Stück → −1. f(X,Y,h,b) (frei): Höhe je Feld vorher umrechnen (Einebnen der Orte wie im Bild, begehbar.js).
function eck(hole,sicht,X,Y,streng,f){if(Y>=WY)Y=WY-1;var p=hole(X>>6,Y>>6);if(!p)return -1;var s=sicht(p),q=((Y&63)<<6)|(X&63),b0=s.B[q],h=f?f(X,Y,s.H[q],b0):s.H[q];
 if(!AN)return h;var m=wasser(b0)?spiegel(h,b0):1e9;
 var innen=(X&63)>0&&(Y&63)>0;   // Nachbarn im selben Stück: ohne hole()
 for(var k=1;k<4;k++){var x=X-(k&1),y=Y-(k>>1);if(y<0)continue;if(x<0)x+=WX;var t=innen?p:hole(x>>6,y>>6);if(!t){if(streng)return -1;continue}
  var u=innen?s:sicht(t),r=((y&63)<<6)|(x&63),b=u.B[r];if(wasser(b)){var w=spiegel(f?f(x,y,u.H[r],b):u.H[r],b);if(w<m)m=w}}
 return m<1e9?m:h}
// Dieselbe Regel auf einem Raster aus Höhen Hr und Biomen Br mit Zeilenlänge L: e = Feld der Ecke, e−1 links, e−L oben (der Rufer legt eine Reihe
// und Spalte links oben dazu).
function eckRaster(Hr,Br,L,e){var h=Hr[e];if(!AN)return h;var m=1e9,b,w;
 b=Br[e];if(wasser(b))m=spiegel(h,b);
 b=Br[e-1];if(wasser(b)){w=spiegel(Hr[e-1],b);if(w<m)m=w}
 b=Br[e-L];if(wasser(b)){w=spiegel(Hr[e-L],b);if(w<m)m=w}
 b=Br[e-L-1];if(wasser(b)){w=spiegel(Hr[e-L-1],b);if(w<m)m=w}
 return m<1e9?m:h}
var UF={wasser:wasser,spiegel:spiegel,eck:eck,eckRaster:eckRaster,an:function(v){if(v!=null)AN=!!v;return AN}};
if(typeof module!=='undefined'&&module.exports)module.exports=UF;else root.AT3UFER=UF;
})(typeof self!=='undefined'?self:this);
