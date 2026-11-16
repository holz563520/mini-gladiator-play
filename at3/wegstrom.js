// WAS DIE DATEI TUT: Wegsuche im Weltkern von Arena Theory 3.0 (Schritt G6b): Befehl wegProbe, Vergabe als Helferauftrag „weg“, Übernahme an der
// Tickgrenze, Wegversion je Kartenstück, Spielstand. Die Rechnung selbst steht in wegsuche.js (Helferkerne, ohne Helfer im Weltkern).
// Ablauf: Anfrage → (höchstens 2 je Tick) Auftrag mit Paket des Fensters (5 × 5 Kartenstücke um den Start) → Ergebnis nach FRIST Ticks in fester Reihenfolge
// der Auftragsnummer übernommen. Wegversion je Kartenstück = Tick der letzten begehbaren Änderung (bau.js wt). Hat sich ein Stück des Fensters nach dem
// Paket geändert, ist der Weg veraltet und wird neu bestellt (höchstens 4-mal, nie in jedem Tick von selbst). So ist das Ergebnis gleich bei 0/1/2/4/6
// Helfern und nach Speichern und Laden mitten in der Suche.
// Zustand (z.weg): anf (wartende Anfragen), erg (letzte Ergebnisse, kurz: Nummer, Code, Kosten, Felder, Prüfsumme; geht in den Fingerabdruck).
// meld (nur Nachricht an den Hauptkern, nicht im Zustand): ganze Feldliste und Orte für die Wegprobe auf der Karte.
// Kerne: nur Weltkern (Regel 13). Kosten je Anfrage fest (ein Fenster), unabhängig von der Weltgröße (Regel 14).
(function(root){
'use strict';
function WG(){return root.AT3WG||(typeof module!=='undefined'&&module.exports?require('./weltgen.js'):null)}
function SU(){return root.AT3WEG||(typeof module!=='undefined'&&module.exports?require('./wegsuche.js'):null)}
function BG(){return root.AT3BEGEH||(typeof module!=='undefined'&&module.exports?require('./begehbar.js'):null)}
function BAU(){return root.AT3BAU||(typeof module!=='undefined'&&module.exports?require('./bau.js'):null)}
var ST=64, SX=9600, SY=4800, WX=ST*SX, WY=ST*SY, STAND=1;
var FRIST=20, JE_TICK=2, MAX_ANF=16, MAX_ERG=8, MAX_VERSUCH=4, WARTE=200, MAX_MELD=8;   // Vorschlagswerte: 1 s bis zur Übernahme, 10 s Warten auf die Welt
// Zusätzliche Codes (wegsuche.js: 0–6): 7 busy (zu viele Anfragen), 8 changed (Fenster änderte sich zu oft), 9 no_world (Welt nicht bereit)
var CODE=['ok','no_path','no_map','start_blocked','goal_blocked','no_road','no_town','busy','changed','no_world'];
function G(v,min,max){return typeof v==='number'&&v===Math.floor(v)&&v>=min&&v<=max}
var ARTEN={wegProbe:function(w){return !!w&&typeof w==='object'&&(w.p===0||w.p===1)&&G(w.x0,0,WX-1)&&G(w.y0,0,WY-1)&&G(w.x1,0,WX-1)&&G(w.y1,0,WY-1)}};
function neu(){return{anf:[],erg:[],meld:[]}}
function umS(c){return c<0?c+SX:c>=SX?c-SX:c}
function ab(a,b){var d=Math.abs(a-b);return d>SX-d?SX-d:d}

function befehl(z,art,w,nr){var g=z.weg||(z.weg=neu());
 if(g.anf.length>=MAX_ANF){fertig(g,{id:nr,p:w.p},7,null);return}
 g.anf.push({id:nr,p:w.p,x0:w.x0,y0:w.y0,x1:w.x1,y1:w.y1,seit:z.tick,versuch:0})}

// Ergebnis ablegen: kurz im Zustand, ganz in der Nachricht
function pruef(r){var h=0x811c9dc5;for(var i=0;i<r.length;i++){h=Math.imul(h^(r[i]&0xFFFF),0x01000193);h=Math.imul(h^(r[i]>>>16),0x01000193)}return h>>>0}
function fertig(g,e,code,r,o){var K=SU().KOPF,nF=r?r[2]:0,nO=r?r[4]:0;
 var s={id:e.id,code:code,kosten:r?r[3]:0,felder:nF,summe:r?pruef(r):0};g.erg.push(s);if(g.erg.length>MAX_ERG)g.erg.shift();
 var m={id:e.id,p:e.p,code:code,grund:CODE[code],modus:r?r[1]:0,felder:nF,kosten:r?r[3]:0,knoten:r?r[5]:0,netzKosten:r?r[6]:0,teil:r?r[7]:0,nr:o?o.nr:-1,
  punkte:r?r.slice(K,K+nF*2):null,orte:null};
 if(r&&nO){var N=SU().netz();m.orte=new Int32Array(nO*2);for(var i=0;i<nO;i++){var q=r[K+nF*2+i];m.orte[i*2]=N?N.pkt[q*2]:0;m.orte[i*2+1]=N?N.pkt[q*2+1]:0}}
 if(g.meld.length>=MAX_MELD)g.meld.shift();g.meld.push(m)}

// Fenster eines Starts (Stück links oben) und seine Schlüssel
function fenster(e){var H=SU().HALB,cx0=umS((e.x0>>6)-H),cy0=(e.y0>>6)-H,k=[];
 for(var j=0;j<SU().FEN;j++)for(var i=0;i<SU().FEN;i++){var cy=cy0+j;if(cy>=0&&cy<SY)k.push(umS(cx0+i)*8192+cy)}return{cx0:cx0,cy0:cy0,keys:k}}
function nah(e){var H=SU().HALB;return ab(e.x0>>6,e.x1>>6)<=H&&Math.abs((e.y0>>6)-(e.y1>>6))<=H}
function auftrag(z,e,nr,faellig){var w=z.wg,f=fenster(e),fern=!nah(e),b=z.bau;
 var pk=SU().paket(f.cx0,f.cy0,function(k){return w.stuecke.get(k)||null},b?function(k){return BAU().stueck(b,k)}:null,w.ans);
 if(fern&&!SU().netzHat(w.gen)&&w.ans&&w.ans.kopf)SU().netzSetzen(SU().netzBauen(w.seed,w.ans,w.gen));     // Netz des Weltkerns (für die eigene Rechnung und die Helfer)
 var o={nr:nr,art:'weg',id:e.id,p:e.p,x0:e.x0,y0:e.y0,x1:e.x1,y1:e.y1,faellig:faellig,ab:z.tick,versuch:e.versuch,gen:w.gen,keys:f.keys};
 var a={nr:nr,version:z.version,vorrang:0,art:'weg',faellig:faellig,p:e.p,x0:e.x0,y0:e.y0,x1:e.x1,y1:e.y1,cx0:f.cx0,cy0:f.cy0,seed:w.seed>>>0,gen:w.gen,fern:fern,daten:pk.daten,tab:pk.tab};
 return{o:o,a:a}}

// Je Tick (nach Bau und Welt): höchstens JE_TICK Anfragen vergeben. Ohne fertige Welt warten, nach WARTE Ticks aufgeben.
function ausgeben(z,neuL){var g=z.weg,w=z.wg;if(!g.anf.length)return;
 if(!w||!w.ans){for(var i=g.anf.length-1;i>=0;i--)if(z.tick-g.anf[i].seit>WARTE)fertig(g,g.anf.splice(i,1)[0],9,null);return}
 for(var n=0;n<JE_TICK&&g.anf.length;n++){var e=g.anf.shift(),j=auftrag(z,e,z.auftragNr++,z.tick+FRIST);z.offen.push(j.o);neuL.push(j.a)}}

// Übernahme an der Tickgrenze: veraltet, wenn sich ein Stück des Fensters nach dem Paket geändert hat
function uebernehmen(z,o,r){var g=z.weg;if(!g||!z.wg||o.gen!==z.wg.gen)return;
 var wt=z.bau&&z.bau.wt,alt=false;if(wt)for(var i=0;i<o.keys.length;i++){var t=wt.get(o.keys[i]);if(t!==undefined&&t>o.ab){alt=true;break}}
 var e={id:o.id,p:o.p,x0:o.x0,y0:o.y0,x1:o.x1,y1:o.y1,seit:z.tick,versuch:o.versuch+1};
 if(alt&&!(r&&r[0]===0&&r[2]>0&&gilt(z,o.p,r))){if(e.versuch<=MAX_VERSUCH)g.anf.unshift(e);else fertig(g,e,8,null);return}   // gefundener Weg, der noch begehbar ist, gilt weiter
 if(!r||!r.length){fertig(g,e,2,null);return}
 fertig(g,e,r[0],r,o)}

// Ist der gefundene Weg im jetzigen Zustand noch begehbar? Jeder Schritt wie in wegsuche.js (schräg nur über beide Nachbarfelder). Fehlt ein Kartenstück: nein.
function gilt(z,p,r){var K=SU().KOPF,n=r[2],w=z.wg,B=BG(),M=new Map(),seed=w.seed>>>0,i;
 function hole(cx,cy){return w.stuecke.get(umS(cx)*8192+cy)||null}
 function holeB(cx,cy){if(!z.bau)return null;var k=umS(cx)*8192+cy;if(!M.has(k))M.set(k,BAU().stueck(z.bau,k));return M.get(k)}
 function sch(X,Y,s){return B.schritt(hole,holeB,seed,X,Y,s,p)>0}
 for(i=1;i<n;i++){var X=r[K+i*2-2],Y=r[K+i*2-1],dx=r[K+i*2]-X,dy=r[K+i*2+1]-Y;if(dx>1)dx=-1;else if(dx<-1)dx=1;
  var sx=dx<0?1:3,sy=dy<0?0:2,X2=X+dx<0?X+dx+WX:X+dx>=WX?X+dx-WX:X+dx;
  if(dx&&dy){if(!(sch(X,Y,sx)&&sch(X,Y,sy)&&sch(X2,Y,sy)&&sch(X,Y+dy,sx)))return false}else if(!sch(X,Y,dx?sx:sy))return false}
 return true}
function abdruck(g,f){var i,e;f(g.anf.length);for(i=0;i<g.anf.length;i++){e=g.anf[i];f(e.id);f(e.p);f(e.x0);f(e.y0);f(e.x1);f(e.y1);f(e.seit);f(e.versuch)}
 f(g.erg.length);for(i=0;i<g.erg.length;i++){e=g.erg[i];f(e.id);f(e.code);f(e.kosten);f(e.felder);f(e.summe)}}
function meld(g){return g.meld.splice(0)}

// ── Spielstand: Anfragen, laufende Aufträge (werden nach dem Laden mit gleicher Nummer und Fälligkeit neu gepackt), letzte Ergebnisse ──
function stand(g,z){var lauf=[];for(var i=0;i<z.offen.length;i++){var o=z.offen[i];if(o.art==='weg'&&z.wg&&o.gen===z.wg.gen)lauf.push([o.nr,o.id,o.p,o.x0,o.y0,o.x1,o.y1,o.faellig,o.ab,o.versuch])}
 return{format:STAND,anf:g.anf.map(function(e){return[e.id,e.p,e.x0,e.y0,e.x1,e.y1,e.seit,e.versuch]}),lauf:lauf,
  erg:g.erg.map(function(e){return[e.id,e.code,e.kosten,e.felder,e.summe]})}}
// Nach dem Laden der Welt (weltstrom.ausStand) aufrufen. Gibt die neu zu vergebenden Aufträge zurück oder null (ungültig).
function ausStand(d,z){var M=2147483647,i;
 function pos(e,o){return G(e[o],0,WX-1)&&G(e[o+1],0,WY-1)&&G(e[o+2],0,WX-1)&&G(e[o+3],0,WY-1)}
 if(!d||d.format!==STAND||!Array.isArray(d.anf)||d.anf.length>MAX_ANF||!Array.isArray(d.lauf)||d.lauf.length>64||!Array.isArray(d.erg)||d.erg.length>MAX_ERG)return null;
 var g=neu();
 for(i=0;i<d.anf.length;i++){var e=d.anf[i];if(!Array.isArray(e)||e.length!==8||!G(e[0],0,M)||!G(e[1],0,1)||!pos(e,2)||!G(e[6],0,M)||!G(e[7],0,MAX_VERSUCH))return null;
  g.anf.push({id:e[0],p:e[1],x0:e[2],y0:e[3],x1:e[4],y1:e[5],seit:e[6],versuch:e[7]})}
 for(i=0;i<d.erg.length;i++){var s=d.erg[i];if(!Array.isArray(s)||s.length!==5||!G(s[0],0,M)||!G(s[1],0,CODE.length-1)||!G(s[2],0,M)||!G(s[3],0,1<<20)||!G(s[4],0,4294967295))return null;
  g.erg.push({id:s[0],code:s[1],kosten:s[2],felder:s[3],summe:s[4]})}
 var neuL=[];
 for(i=0;i<d.lauf.length;i++){var l=d.lauf[i];if(!Array.isArray(l)||l.length!==10||!G(l[0],0,z.auftragNr-1)||!G(l[1],0,M)||!G(l[2],0,1)||!pos(l,3)||!G(l[7],0,M)||!G(l[8],0,M)||!G(l[9],0,MAX_VERSUCH))return null;
  if(!z.wg||!z.wg.ans)return null;
  var j=auftrag(z,{id:l[1],p:l[2],x0:l[3],y0:l[4],x1:l[5],y1:l[6],versuch:l[9]},l[0],l[7]);j.o.ab=l[8];z.offen.push(j.o);neuL.push(j.a)}
 z.weg=g;return neuL}

var W={ARTEN:ARTEN,CODE:CODE,FRIST:FRIST,befehl:befehl,ausgeben:ausgeben,uebernehmen:uebernehmen,abdruck:abdruck,meld:meld,stand:stand,ausStand:ausStand,nah:nah,fenster:fenster};
if(typeof module!=='undefined'&&module.exports)module.exports=W;else root.AT3WEGSTROM=W;
})(typeof self!=='undefined'?self:this);
