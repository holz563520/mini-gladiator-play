// WAS DIE DATEI TUT: Kartei-Lader für Hintergrundkerne von Arena Theory 3.0 (Schritt N7a2b1, Thomas 24.11.2026). Lädt Kartei-Objekte (kartei/obj/<id>.json) nur,
// wenn ein Bild sie braucht, und hält höchstens GRENZE Bytes Bildpunkte (Standard 4 MB, Entscheidung Thomas); die am längsten nicht gebrauchten fallen zuerst heraus.
// hole(id) ist synchron (für stadtbild.js und bodenbild.js): fehlt das Objekt, merkt es sich den Wunsch und gibt null (dann zeigt das Bild sein Ersatzbild, Regel 20).
// laden() holt alle Wünsche auf einmal (Promise). Was nicht ladbar ist, wird nicht wieder versucht. Kosten nur nach Zahl der gebrauchten Bilder, nie nach Weltgröße.
// Kerne: läuft im Bildkern (bildkern.js), nie auf dem Hauptkern (Regel 13). In Node mit eigener Ladefunktion (Tests).
(function(root){
'use strict';
var GRENZE=4194304;
function bytes(o){var b=o&&o.bild;return b?Math.max(1,(b.w|0)*(b.h|0)):0}
// holen(id) → Promise des Kartei-Objekts (oder null); grenze in Bytes
function neu(holen,grenze){grenze=grenze||GRENZE;var M=new Map(),wunsch=new Set(),offen=new Set(),kaputt=new Set(),B=0,st={geladen:0,verworfen:0,fehler:0};
 function rein(id,o){var alt=M.get(id);if(alt){B-=alt.b;M.delete(id)}var e={o:o,b:bytes(o)};M.set(id,e);B+=e.b;st.geladen++;
  while(B>grenze&&M.size>1){var k=M.keys().next().value;if(k===id)break;B-=M.get(k).b;M.delete(k);st.verworfen++}}
 return{
  hole:function(id){var e=M.get(id);if(e){M.delete(id);M.set(id,e);return e.o}if(id&&!kaputt.has(id)&&!offen.has(id))wunsch.add(id);return null},
  hat:function(id){return M.has(id)},
  wuensche:function(){return wunsch.size},
  laden:function(){var L=[];wunsch.forEach(function(id){L.push(id);offen.add(id)});wunsch.clear();
   return Promise.all(L.map(function(id){return Promise.resolve().then(function(){return holen(id)}).then(function(o){offen.delete(id);if(!o||!o.bild){kaputt.add(id);st.fehler++;return}rein(id,o)},
    function(){offen.delete(id);kaputt.add(id);st.fehler++})})).then(function(){return L.length})},
  setze:rein,
  stand:function(){return{anzahl:M.size,bytes:B,grenze:grenze,offen:offen.size,kaputt:kaputt.size,geladen:st.geladen,verworfen:st.verworfen,fehler:st.fehler}}}}
var KL={GRENZE:GRENZE,neu:neu};
if(typeof module!=='undefined'&&module.exports)module.exports=KL;else root.AT3KARTEILADER=KL;
})(typeof self!=='undefined'?self:this);
