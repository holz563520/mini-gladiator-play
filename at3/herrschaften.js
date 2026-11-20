// WAS DIE DATEI TUT: Herrschaften von Arena Theory 3.0 für die Anzeige (Schritt N4c1): liest die Einheiten aus der Erde (weltgen.js, Teil „Herrschaften“),
// baut die Kette „Answers to“ (unterste Einheit zuerst, Vasallen bis zu ihrem Kaiser) und macht daraus Namen mit der Sprachdatei. Reichsfarben (Palette A).
// Kerne: reine Rechnung ohne Bildschirm, wenige Mikrosekunden je Kette. Im Bildkern (Fernbilder, Antippen in der Fernansicht) und im Master-Editor.
// Namen der Sitze sind Ortsnamen (ortsnamen.js, Eigennamen, in jeder Sprache gleich); alle übrigen Wörter kommen aus der Sprachdatei (Schlüssel reich.*).
// Einheit in der Erde (4 × 16 Bit): [Oberherr + 1, Sitz (Ortsnummer), System·4+Stufe | Volk << 8, Beiname | Farbe << 4 | Vasall << 8 | Kulturname << 9].
(function(root){
'use strict';
var FARBE=[57,20,6,53,30,62,25,36,19,47,16,9];   // Reichsfarbe 0–11 → Farbnummer der Palette A (wie die ersten zwölf Kulturfarben aus N4b)
var SYS=['empire','kingdom','principality','republic','merchant-league','theocracy','tribal-lands','robber-barony'];   // Reihenfolge wie daten/systeme.json
// Einheit u lesen (hs, vk: Sichten aus weltgen.ansicht)
function einheit(hs,vk,u){var T=hs.tab,a=T[u*4+2]&255,f=T[u*4+3],v=T[u*4+2]>>8;
 return{u:u,ober:T[u*4]-1,sitz:T[u*4+1],sys:a>>2,stufe:a&3,volk:v,kultur:vk&&v?vk.tab[v-1]>>>24:0,bei:f&15,farbe:f>>4&15,vasall:!!(f&256),kulturname:!!(f&512)}}
// Kette nach oben, unterste zuerst (Nummern)
function kette(hs,u){var L=[];while(u>=0&&L.length<8){L.push(u);u=hs.tab[u*4]-1}return L}
// Reich einer Einheit (Stufe 0; ein Vasall endet bei seinem eigenen Reich)
function reich(hs,u){var T=hs.tab,n=0;while(u>=0&&(T[u*4+2]&3)&&n++<8)u=T[u*4]-1;return u}
// Oberstes Reich (beim Vasallen der Kaiser)
function oben(hs,u){var T=hs.tab,n=0;while(u>=0&&T[u*4]&&n++<8)u=T[u*4]-1;return u}
// Oberstes Reich je Einheit als Tafel (einmal je Welt) und je Zelle mit Merkern: Bit 0–13 Reich + 1, Bit 14 Vasall
function tafel(hs){var n=hs.zahl[0],R=new Uint16Array(n),u;for(u=0;u<n;u++){var r=reich(hs,u);R[u]=r<0?0:(r+1)|(hs.tab[r*4+3]&256?16384:0)}return R}
// Farbnummer der Palette A je Reich (+1 = Vasall heller), −1 = niemand
function farbe(hs,r){if(r<0)return -1;return FARBE[hs.tab[r*4+3]>>4&15]}
// Anzeige-Daten der Kette ab Einheit u, Sitze mit Ortsnamen (ON = ortsnamen.js)
function info(hs,vk,orte,u,seed,ON){return kette(hs,u).map(function(v){var e=einheit(hs,vk,v),c=orte[e.sitz];e.sitzName=ON&&c!=null?ON.name(seed,c&0xffffff,c>>>24):'';return e})}
// Name mit t(schlüssel, werte) aus der Sprachdatei
function name(e,t){var s=e.stufe===0&&e.kulturname?t('reich.kultur.'+e.kultur):t('reich.name.'+e.sys+'.'+e.stufe,{sitz:e.sitzName});if(e.stufe===0&&e.bei)s+=' '+t('reich.bei.'+e.bei);return s}
function titel(e,t){return t('reich.titel.'+e.sys+'.'+e.stufe)}
// „County of A › Duchy of B › Kingdom of C, client of the Velarian Imperium“
function ketteText(L,t){var out=[];for(var i=0;i<L.length;i++){var e=L[i];if(e.stufe===0&&e.vasall&&i+1<L.length){out.push(t('reich.vasall',{name:name(e,t),herr:name(L[i+1],t)}));break}out.push(name(e,t))}return out.join(' › ')}
var H={FARBE:FARBE,SYS:SYS,einheit:einheit,kette:kette,reich:reich,oben:oben,tafel:tafel,farbe:farbe,info:info,name:name,titel:titel,ketteText:ketteText};
if(typeof module!=='undefined'&&module.exports)module.exports=H;else root.AT3HERRSCHAFT=H;
})(typeof self!=='undefined'?self:this);
