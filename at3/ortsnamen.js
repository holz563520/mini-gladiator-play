// WAS DIE DATEI TUT: Ortsnamen für Arena Theory 3.0 (Schritt W1b). Englisch klingende Namen aus Silben; gleicher Seed und gleiche Zelle ergeben
// immer denselben Namen, es wird nichts gespeichert. Dörfer, Städte und Häfen haben eigene Endungen; ab und zu ein Name mit Galgenhumor.
// Kerne: reine Rechnung, wenige Mikrosekunden je Name; geladen erst beim ersten Antippen eines Orts (Weltansicht), später vom Spiel bei Bedarf.
// Hinweis Regel 10: Die Namen sind Eigennamen und bleiben in jeder Sprache gleich; die Silbenlisten stehen deshalb hier und nicht in der Sprachdatei.
(function(root){
'use strict';
var VORN=['Ash','Black','Bleak','Bone','Carrion','Cinder','Crow','Dire','Dust','Fen','Gallow','Grave','Grim','Hollow','Iron','Lame','Mire','Mold','Mud','Nettle','Pale','Pox','Rat','Raven','Red','Rot','Rust',
 'Salt','Scab','Sour','Stone','Thorn','Wane','Weep','Wither','Wolf','Worm','Old','Low','High','Long','Cold','Gray','Oak','Elm','Barley','Goat','Ox','Mill','King','Bishop','Widow','Tanner','Hang','Dead','Lost'];
var DORF=['ford','wick','ham','stead','thorpe','by','ton','field','well','brook','moor','ley','den','combe','hurst','cross','gate','end','rest','pit','hollow','marsh'];
var STADT=['bury','chester','minster','market','bridge','castle','borough','wall','court','hold'];
var HAFEN=['mouth','haven','port','quay','sands','hook','ness','wharf','reach','bay'];
var LAGE=['Upper ','Lower ','Great ','Little ','Old ','New ','East ','West ','North ','South '];
var WESSEN=["Hangman's","Widow's","Beggar's","Leper's","Gravedigger's","Taxman's","Drowned Man's","Last Man's","Nobody's","Butcher's"];
var WAS=[' Rest',' End',' Ford',' Cross',' Reach',' Folly',' Hope',' Luck'];
function mix(a){a=a>>>0;a^=a>>>16;a=Math.imul(a,0x7feb352d);a^=a>>>15;a=Math.imul(a,0x846ca68b);a^=a>>>16;return a>>>0}
// seed = Weltseed, zelle = Nummer der Erdzelle, art = 1 Dorf, 2 Stadt, 3 Hafendorf, 4 Hafenstadt
function name(seed,zelle,art){var h=mix((seed>>>0)^Math.imul(zelle+1,0x9e3779b1)),a=h%VORN.length,b=mix(h+1),c=mix(h+2),E=art>=3?HAFEN:art===2?STADT:DORF;
 if(art!==2&&art!==4&&c%11===0)return WESSEN[b%WESSEN.length]+WAS[(b>>>8)%WAS.length];
 return(c%4===0?LAGE[(c>>>4)%LAGE.length]:'')+VORN[a]+E[b%E.length]}
var ON={name:name};
if(typeof module!=='undefined'&&module.exports)module.exports=ON;else root.AT3ORTSNAMEN=ON;
})(typeof self!=='undefined'?self:this);
