// WAS DIE DATEI TUT: Ortsnamen für Arena Theory 3.0 (Schritt W1b, N5b). Gleicher Seed und gleiche Zelle ergeben immer denselben Namen, es wird nichts
// gespeichert. N5b (Thomas 20.11.2026: ganz ersetzen): jeder Ort klingt nach der Kultur seines Volks (Silben aus daten/kulturen.json, Feld „klang“, hier als
// Tafel KLANG, muss dazu passen, tests/at3-n5b.cjs), dazu Mittelsilben und ab und zu Upper, Old, New … Ohne Volk (Niemandsland, ?n4b=0) und mit dem
// Notausschalter ?n5b=0 die englischen Silbennamen aus W1b. Der satirische Zusatz („… the Tipsy“) kommt aus orte.js, nur in der Ortskarte.
// Kerne: reine Rechnung, wenige Mikrosekunden je Name; geladen erst beim ersten Antippen eines Orts (Weltansicht, Bildkern), später vom Spiel bei Bedarf.
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
function name0(seed,zelle,art){var h=mix((seed>>>0)^Math.imul(zelle+1,0x9e3779b1)),a=h%VORN.length,b=mix(h+1),c=mix(h+2),E=art>=3?HAFEN:art===2?STADT:DORF;
 if(art!==2&&art!==4&&c%11===0)return WESSEN[b%WESSEN.length]+WAS[(b>>>8)%WAS.length];
 return(c%4===0?LAGE[(c>>>4)%LAGE.length]:'')+VORN[a]+E[b%E.length]}
// N5b: Silben je Kultur 1–24: Vorsilben | Dorf | Stadt | Hafen
var AUS=!!(root.location&&/[?&]n5b=0/.test(root.location.search||''));
var KLANG=[
 'Vel,Aurel,Cassi,Maxen,Tullar,Sever|ium,ana,etum|aria,opolis,um Magnum|ia Portus,ostia',
 'Thal,Mari,Perid,Coral,Nauk,Salen|ea,os,is|assa,ion,amos|ira,eon,anchor',
 'Soph,Logi,Theor,Dial,Axi,Paradox|ia,on,eum|opolis,eia,ikon|ia Limen,os Bay',
 'Zer,Qum,Sabb,Duner,Tolm,Karr|eth,ah,un|abad,esh,ar|eth Wharf,uq',
 'Amm,Ossa,Wel,Palm,Shim,Rash|erash,ir,aun|eret,oth,assim|ir Quay',
 'Neh,Sobe,Ankh,Mer,Tef,Kheb|et,ut,ep|opet,enhet,eru|et Landing,ut Ferry',
 'Karv,Tor,Ulg,Bator,Hask,Yur|an,ul,ek|anar,ugai,ak|an Ford',
 'Ulm,Dar,Ost,Ravel,Kesh,Bann|or,ak,in|orath,ekh,anor|or Crossing',
 'Hald,Barl,Corn,Wheat,Sheaf,Ambr|mere,stead,field|crown,bury,hold|mere Quay,haven',
 'Brenn,Moot,Hurd,Kine,Dall,Torr|ock,ley,by|ock Moot,wick,garth|ock Strand',
 'Wend,Oak,Ashen,Bram,Hazel,Thorn|el,holt,wood|eldom,hall,grove|el Landing',
 'Gorr,Hog,Mast,Swill,Rook,Tusk|ow,den,mire|ow Keep,hold|ow Wharf',
 'Skarn,Pine,Ulf,Hrim,Brenn,Tjal|holt,vik,ard|hold,gard,stead|vik,fjord',
 'Vostr,Sabl,Ermin,Kovr,Lynx,Petr|el,ovo,ka|elgrad,ansk,ovar|el Pier',
 'Ilv,Frost,Rime,Taig,Sno,Hael|ar,um,ik|arheim,ost|ar Floe,ik Bay',
 'Ice,Glac,Wyrm,Hoar,Brum,Sleet|mark,post|watch|floe',
 'Sarr,Kopje,Thorn,Lion,Acac,Umber|ow,kral,ane|owgate,ane Royal|ow Strand',
 'Tamar,Herd,Bova,Dunn,Rath,Calv|el,ow,ane|elhold|el Ford',
 'Olo,Verd,Quell,Zigg,Ixa,Pyr|th,al,ep|othec,alam|oth Steps',
 'Pell,Dye,Indi,Carm,Lacq,Vermi|ucar,ia,oso|ucara,ana|ucar Docks,ia Moor',
 'Fen,Bog,Murk,Leech,Wall,Slough|wallow,mire,sump|wallow Hall|wallow Jetty',
 'Call,Root,Brack,Tidal,Keel,Snag|oo,ey,ock|oo Free|oo,ey Cove,anchorage',
 'Durr,Slate,Gran,Basalt,Ore,Krag|ak,ar,um|akhold,arak,undeep|ak Gorge',
 'Hesk,Nimb,Cirr,Peak,Vapor,Alt|spire,ar|eskar,ima|esk Ledge'

].map(function(s){return s.split('|').map(function(g){return g.split(',')})});
var MITTE=['an','ar','el','en','is','on','or','ul','ad','em','ir','ot'], BIND=['l','n','r','v','t','d','s','m'], VOKAL=['a','e','i','o','u','a','e','o'], SILBE=['la','ri','to','ma','ne','sa','vo','di'], ZWISCHEN=['lar','ven','dor','mis','tel','ran','sol','mer'];   // Zwischensilbe vor Endungen mit Selbstlaut (jeder 3. Name)   // Mittelsilbe nach Mitlaut, Bindelaut nach Selbstlaut, Selbstlaut zwischen zwei Mitlauten
// Kultur 1–24 des Volks in der Zelle (vk wie weltgen.js vkSicht), 0 = keines
function kultur(vk,zelle){if(!vk)return 0;var v=vk.vol[zelle];return v?vk.tab[v-1]>>>24:0}
function kulturName(seed,zelle,art,c){var K=KLANG[c-1],h=mix((seed>>>0)^Math.imul(zelle+1,0x9e3779b1)^0x5b5b),b=mix(h+1),d=mix(h+2),V=K[0][h%K[0].length],E=art===4?K[3].concat(K[2]):art===3?K[3].concat(K[1]):art===2?K[2]:K[1],e=E[b%E.length];   // Häfen: Hafen- oder Orts-Endung
 var vo=/^[aeiouy]/.test(e),zw=vo&&(d>>>20)%3===0?ZWISCHEN[(d>>>24)%ZWISCHEN.length]:'',vv=!zw&&/[aeiouy]$/.test(V),m;   // vv: endet das Stück vor der Mitte auf Selbstlaut
 if(vo)m=vv?BIND[(d>>>4)%BIND.length]:d%4?MITTE[(d>>>4)%MITTE.length]:'';
 else m=d%3?(vv?SILBE[(d>>>4)%SILBE.length]:VOKAL[(d>>>4)%VOKAL.length]+(d%7<3?BIND[(d>>>12)%BIND.length]:'')):'';
 return(d%4===0?LAGE[(d>>>8)%LAGE.length]:'')+V+zw+m+e}
// vk (optional, N5b): Völker der Erde; ohne vk oder mit ?n5b=0 der Name aus W1b
function name(seed,zelle,art,vk){var c=AUS?0:kultur(vk,zelle);return c?kulturName(seed,zelle,art,c):name0(seed,zelle,art)}
var ON={name:name,name0:name0,kultur:kultur,KLANG:KLANG,AUS:AUS};
if(typeof module!=='undefined'&&module.exports)module.exports=ON;else root.AT3ORTSNAMEN=ON;
})(typeof self!=='undefined'?self:this);
