// WAS DIE DATEI TUT: Bauen im Weltkern von Arena Theory 3.0 (Schritt G5a). Reine Rechnung ohne Bildschirm, nur ganze Zahlen: Gebäudefelder (Lager, Werkstatt,
// Unterkunft), Räume (orthogonal zusammenhängende Felder gleicher Art), Wände, Türen und Tore auf Feldkanten, Dach je Feld, Baustellen mit Bauzuständen, Gold.
// Hängt sich in kern.js ein (Befehle bauBoden, bauEntfernen, bauWand, bauTuer, bauDach, bauHuelle, bauPause, bauAbbruch; G5c: bauWaende, bauTuerWechsel). Gezeichnet wird hier nichts:
// G5b zeichnet nur, was hier steht (keine zweite Kollisionswahrheit), G5c ruft pruefen() für die Vorschau und sackgasse() vor dem Wändeziehen.
// Kerne: nur Weltkern (und Node-Tests), nie auf dem Hauptkern (Regel 13). Wird erst mit dem ersten Bau-Befehl oder einem Spielstand mit Bau geladen;
// ohne Bau bleibt z.bau leer und der Fingerabdruck des Kerns unverändert.
// Riesenwelt (Regel 14): Daten nur für Kartenstücke, in denen etwas gebaut ist (dünn), Kosten je Befehl begrenzt (Auswahl höchstens 1.024 Felder, Raum
// höchstens 4.096 Felder), je Tick höchstens 64 Baustellen einen Schritt weiter. Nichts hängt von der Weltgröße ab.
// Runde Welt (W1c): In x läuft die Welt um (Feld 614.399 liegt neben 0), Räume und Wände gehen über Stückgrenzen und über die Naht.
// Regeln (AT3_PLAN 5.1–5.3): Neuanlage schlägt Außenwände, Dach und eine Tür vor; automatische Wände entstehen nur bei Neuanlage oder „Hülle neu erzeugen“;
// eine von Hand entfernte Wand wächst nicht nach (Herkunft je Kante); Hof ohne Wände und Wand ohne Raum sind gültig; beim Zusammenlegen bleibt die kleinste
// Raum-Nummer, beim Teilen behält der Teil mit dem Hauptfeld die Nummer.
// Entscheidungen Thomas (16.11.2026): alles kostet 1 (Feld, Wand, Tür/Tor), Startkapital 10.000, Abriss gibt nichts zurück (nur noch nicht Begonnenes wird
// erstattet), nur auf ebenem Boden, Büsche und Blumen werden gerodet, Bäume und Fels sperren, Bauzeit 2 s je Feld. Vorschlag: Wand/Tür 1 s.
// Bis G7 (Arbeiter, Material): feste Bauzeit, je Baustelle ein Ziel nach dem anderen; die Zustände „Material reserviert/geliefert“ und „blockiert“ sind
// vorgesehen (Nummern unten), werden aber noch nicht benutzt.
// G6a Wege (Thomas 16.11.2026): vier Wegarten wie 2.0 welt-bau.js (Trampelpfad, Kiesweg, Pflasterweg, Steinstraße), alles kostet 1, Rechteck ziehen.
// Wege liegen je Feld in einer eigenen Schicht (Bits 0–2 Art, Bits 4–5 Bauzustand), nie auf Gebäudefeldern, nur auf Land, Hang höchstens eine Stufe
// (Vorschlag, wie RollerCoaster Tycoon), Bäume und Fels sperren, Büsche und Blumen werden gerodet. Bauzeit 1 s je Feld (Vorschlag). Andere Art darüber = umbauen.
// Wiederverwendet: Rechteck-Auswahl, Preis je Feld und „Abriss gibt nichts zurück“ aus 2.0 welt-bau.js; „gleiche Art nebeneinander wächst zusammen“
// (Flutfüllung) aus 2.0 welt-gebaeude.js; Ebenen-Regel und Stückformat aus bodenbild.js; Naturregel aus natur.js; Einhäng-Muster aus weltstrom.js.
(function(root){
'use strict';
function WAR(){return root.AT3WAREN||(typeof module!=='undefined'&&module.exports?require('./waren.js'):null)}   // G7: Material und Bauarbeiter (nur wenn die Wirtschaft läuft)
function NAT(){return root.AT3NATUR||(typeof module!=='undefined'&&module.exports?require('./natur.js'):null)}
var ST=64, FELDER=ST*ST, SX=9600, SY=4800, WX=ST*SX, WY=ST*SY, MEER=2048, LS=6;
var START_GOLD=2000, PREIS=1;                           // K0 (Thomas 18.11.2026): Startgold wie 1.0 (data.js gold:2000) statt 10.000 Testgold; Bauen kostet bis Phase B weiter 1
var FELD_TICKS=40, KANTE_TICKS=20;                      // Bauzeit: 2 s je Feld (Thomas), 1 s je Wand/Tür (Vorschlag)
var MAX_AUSWAHL=1024, MAX_RAUM=4096, MAX_BAUSTELLEN=256, JE_TICK=64, WEG_SUCHE=16, MAX_MELD=256, MAX_ZIELE=16384, MAX_LINIE=256;   // G5c: Wandlinie höchstens 256 Kanten (Vorschlag)
var ART_NAME=['','lager','werkstatt','unterkunft','kueche','jagdhuette'], ART={lager:1,werkstatt:2,unterkunft:3,kueche:4,jagdhuette:5};   // G8: Werkstatt = Sägewerkstatt, neu Küche und Jägerhütte
var WEG_NAME=['','trampelpfad','kiesweg','pflaster','steinstrasse'], WEG={trampelpfad:1,kiesweg:2,pflaster:3,steinstrasse:4}, WEG_TICKS=20;   // G6a: 1 s je Wegfeld (Vorschlag)
// Kante (ein Byte): Bits 0–1 Typ, Bits 2–3 Herkunft, Bits 4–5 Bauzustand. Typ 0 mit Herkunft „entfernt“ = von Hand geöffnet, wächst nicht nach.
var K_WAND=1, K_TUER=2, K_TOR=3, H_AUTO=1, H_HAND=2, H_WEG=3;
// Bauzustand von Feld und Kante. 4/5 (Material reserviert/geliefert) kommen mit G7 zwischen „geplant“ und „in Arbeit“ in die Baustelle.
var Z_PLAN=1, Z_ARBEIT=2, Z_FERTIG=3;
// Feld-Merker (ein Byte): Bit 0 Dach, Bit 1 gerodet (Busch/Blume entfernt, bleibt auch nach Abriss), Bit 2 getrennt halten, Bits 4–5 Bauzustand
var F_DACH=1, F_ROD=2, F_GETRENNT=4, F_STUMPF=8;      // G8: Bit 3 = Baum gefällt (Stumpf, Feld frei; wächst nach, ketten.js)
// Baustelle: 0 läuft, 1 pausiert, 2 blockiert (ab G7), 3 abgebrochen (wird sofort entfernt)
var B_LAEUFT=0, B_PAUSE=1, B_BLOCK=2;
var N_=1, W_=2;                                          // Kantenart im Speicher: Nordkante, Westkante eines Felds (Süd/Ost = Nord/West des Nachbarn)
var DX=[0,-1,0,1], DY=[-1,0,1,0];                        // Seiten 0 Nord, 1 West, 2 Süd, 3 Ost

function um(X){return X<0?X+WX:X>=WX?X-WX:X}
function fk(X,Y){return Y*WX+X}                          // Feldschlüssel (passt in eine ganze Zahl)
function qi(X,Y){return((Y&63)<<6)|(X&63)}
function neu(){return{gold:START_GOLD,id:1,nr:1,zaehler:0,st:new Map(),raeume:new Map(),auf:[],meld:[],neu:new Set(),wt:new Map(),tk:0}}
// G5b: geänderte Kartenstücke merken (nicht im Spielstand, nicht im Fingerabdruck); der Weltkern schickt sie der Karte (stueck()).
// G6b: dazu die Wegversion je Kartenstück (wt: Tick der letzten Änderung). Gehört nicht in den Fingerabdruck, steht aber im Spielstand, damit eine
// laufende Wegsuche nach dem Laden genauso als veraltet erkannt wird. Einträge älter als WT_ALT Ticks werden verworfen (Wege leben nur FRIST Ticks).
var WT_ALT=200, WT_MAX=4096;
function merk(b,X,Y){var k=(X>>6)*8192+(Y>>6);if(b.neu)b.neu.add(k);if(b.wt)b.wt.set(k,b.tk)}
function wtAlt(b,tick){if(b.wt.size<=WT_MAX)return;b.wt.forEach(function(t,k){if(t<tick-WT_ALT)b.wt.delete(k)})}
var LEER=neu();

// ── Speicher je Kartenstück (dünn) ──
function stk(b,X,Y,anlegen){var k=(X>>6)*8192+(Y>>6),s=b.st.get(k);
 if(!s&&anlegen){s=leerStk();b.st.set(k,s)}return s}
function leerStk(){return{art:new Uint8Array(FELDER),raum:new Uint32Array(FELDER),kn:new Uint8Array(FELDER),kw:new Uint8Array(FELDER),flag:new Uint8Array(FELDER),weg:new Uint8Array(FELDER)}}
function wegAt(b,X,Y){var s=stk(b,X,Y);return s?s.weg[qi(X,Y)]:0}
function artAt(b,X,Y){var s=stk(b,X,Y);return s?s.art[qi(X,Y)]:0}
function raumAt(b,X,Y){var s=stk(b,X,Y);return s?s.raum[qi(X,Y)]:0}
function flagAt(b,X,Y){var s=stk(b,X,Y);return s?s.flag[qi(X,Y)]:0}
function kGet(b,t,X,Y){var s=stk(b,X,Y);return s?(t===N_?s.kn:s.kw)[qi(X,Y)]:0}
function kSet(b,t,X,Y,v){var s=stk(b,X,Y,v!==0);merk(b,X,Y);if(s)(t===N_?s.kn:s.kw)[qi(X,Y)]=v}
// Kante an Seite s des Felds X,Y → [Kantenart, X, Y] des Speicherorts. Null, wenn es die Kante nicht gibt (hinter dem Pol).
function kante(X,Y,s){if(s===0)return[N_,X,Y];if(s===1)return[W_,X,Y];if(s===2)return Y+1<WY?[N_,X,Y+1]:null;return[W_,um(X+1),Y]}
function leerRaeumen(b,X,Y){var k=(X>>6)*8192+(Y>>6),s=b.st.get(k);if(!s)return;
 for(var i=0;i<FELDER;i++)if(s.art[i]||s.kn[i]||s.kw[i]||s.flag[i]||s.weg[i])return;b.st.delete(k);if(b.neu)b.neu.add(k)}
function melden(b,nr,grund,mehr){var m=mehr||{};m.nr=nr;m.ok=grund?0:1;m.grund=grund||'';if(b.meld.length>=MAX_MELD)b.meld.shift();b.meld.push(m);return grund||null}

// ── Boden prüfen: eben (alle vier Ecken auf derselben Höhenstufe), kein Wasser, kein Weg, kein Baum oder Fels ──
// Liefert 0 (frei), 1 (frei, Busch/Blume wird gerodet) oder einen Ablehnungsgrund. Kartenstücke kommen aus dem Fenster des Weltgenerators (7 × 7 um den Blick).
function sicht(z,cx,cy,C){var k=cx*8192+cy,v=C.get(k);if(v!==undefined)return v;
 var p=z.wg&&z.wg.ans?z.wg.stuecke.get(k):null;
 v=p?{H:new Uint16Array(p.buffer,p.byteOffset,FELDER),B:new Uint8Array(p.buffer,p.byteOffset+FELDER*2,FELDER),W:new Uint8Array(p.buffer,p.byteOffset+FELDER*3,FELDER)}:null;C.set(k,v);return v}
function stufe(h){h=(h-MEER)>>LS;return h<0?0:h}
function boden(z,X,Y,C){if(Y<0||Y>=WY-1)return'edge';
 var s=sicht(z,X>>6,Y>>6,C);if(!s)return'too_far';
 var q=qi(X,Y),h0=stufe(s.H[q]);
 for(var k=1;k<4;k++){var x=um(X+(k&1)),y=Y+(k>>1),t=sicht(z,x>>6,y>>6,C);if(!t)return'too_far';if(stufe(t.H[qi(x,y)])!==h0)return'not_flat'}
 var bio=s.B[q];if(bio<2||bio>9)return'water';if(s.W[q]||(z.bau&&wegAt(z.bau,X,Y)))return'road';
 var n=NAT().art(z.wg.seed,X,Y,bio,0,0);if(n<0)return 0;if(n<=5&&z.bau&&(flagAt(z.bau,X,Y)&F_STUMPF))return 1;return n<=5||n===12?'nature':1}      // natur.js: 0–5 Bäume, 12 Fels sperren; Büsche und Blumen werden gerodet; G8: ein Stumpf wird gerodet

// ── Flutfüllung eines Raums ab einem Feld. Gibt die Felder als flache Liste [X,Y,…] zurück (höchstens MAX_RAUM+1 Felder). ──
function fluten(b,X,Y,id,gesehen){var L=[X,Y],i=0;gesehen.add(fk(X,Y));
 while(i<L.length&&L.length<=2*MAX_RAUM){var x=L[i++],y=L[i++];
  for(var s=0;s<4;s++){var nx=um(x+DX[s]),ny=y+DY[s];if(ny<0||ny>=WY)continue;var k=fk(nx,ny);if(gesehen.has(k)||raumAt(b,nx,ny)!==id)continue;gesehen.add(k);L.push(nx,ny)}}
 return L}

// ── Tür wählen: an der neuen Außenkante, die dem nächsten Weg/Ortsplatz am nächsten liegt; ohne Weg in der Nähe Südseite, mittig. ──
// K = Kandidaten {i,j,s} (Feld in Auswahl-Koordinaten, Seite). Gibt den Index in K zurück oder −1.
function tuerWahl(z,w,K,C){if(!K.length)return -1;var best=-1,bd=1e9,tx=0,ty=0,i,j,d;
 if((w.w+2*WEG_SUCHE)*(w.h+2*WEG_SUCHE)<=65536)for(j=-WEG_SUCHE;j<w.h+WEG_SUCHE;j++){var Y=w.y+j;if(Y<0||Y>=WY)continue;
  for(i=-WEG_SUCHE;i<w.w+WEG_SUCHE;i++){var X=um(w.x+i),s=sicht(z,X>>6,Y>>6,C);if(!s||!(s.W[qi(X,Y)]||(z.bau&&wegAt(z.bau,X,Y))))continue;
   d=(i<0?-i:i>=w.w?i-w.w+1:0)+(j<0?-j:j>=w.h?j-w.h+1:0);if(d<bd){bd=d;tx=i;ty=j}}}
 if(bd<1e9){bd=1e9;for(i=0;i<K.length;i++){d=Math.abs(K[i].i+DX[K[i].s]-tx)+Math.abs(K[i].j+DY[K[i].s]-ty);if(d<bd){bd=d;best=i}}return best}
 var mj=-1;for(i=0;i<K.length;i++)if(K[i].s===2&&K[i].j>mj)mj=K[i].j;if(mj<0)return 0;
 for(i=0;i<K.length;i++)if(K[i].s===2&&K[i].j===mj){d=Math.abs(2*K[i].i-(w.w-1));if(d<bd){bd=d;best=i}}return best}

// ── Neuanlage planen (ändert nichts). Gibt {fehler} oder den Plan zurück: neue Felder, Gruppen (künftige Räume), neue Wände, Tür, Kosten. ──
function planBoden(z,w){var b=z.bau||LEER,C=new Map(),art=ART[w.art],getr=w.getrennt?1:0,neuL=[],nm=new Map(),i,j,s,X,Y;
 if(!z.wg||!z.wg.ans)return{fehler:'no_world'};
 if(w.y+w.h>WY-1)return{fehler:'edge'};
 for(j=0;j<w.h;j++)for(i=0;i<w.w;i++){X=um(w.x+i);Y=w.y+j;var a=artAt(b,X,Y);
  if(a){if(a!==art)return{fehler:'occupied',x:X,y:Y};continue}
  var g=boden(z,X,Y,C);if(typeof g==='string')return{fehler:g,x:X,y:Y};
  nm.set(fk(X,Y),neuL.length);neuL.push({X:X,Y:Y,i:i,j:j,rod:g,g:-1})}
 if(!neuL.length)return{fehler:'nothing'};
 // Gruppen: neue Felder untereinander, dazu angrenzende Räume gleicher Art (außer „getrennt halten“)
 var gruppen=[],alt=new Map();
 for(i=0;i<neuL.length;i++){if(neuL[i].g>=0)continue;var G={n:0,ids:[],alte:[]},gi=gruppen.length,Q=[i,-1,-1],p=0;neuL[i].g=gi;gruppen.push(G);
  while(p<Q.length){var qn=Q[p++],x=Q[p++],y=Q[p++],id=0,fl=0;G.n++;if(G.n>MAX_RAUM)return{fehler:'room_too_big'};
   if(qn>=0){x=neuL[qn].X;y=neuL[qn].Y}else{id=raumAt(b,x,y);fl=flagAt(b,x,y)}
   for(s=0;s<4;s++){var nx=um(x+DX[s]),ny=y+DY[s];if(ny<0||ny>=WY)continue;var k=fk(nx,ny),e=nm.get(k);
    if(e!==undefined){if(neuL[e].g<0&&(qn>=0||(!getr&&!(fl&F_GETRENNT)))){neuL[e].g=gi;Q.push(e,-1,-1)}continue}
    if(alt.has(k)||artAt(b,nx,ny)!==art)continue;var rid=raumAt(b,nx,ny);
    if(qn>=0?(getr||(flagAt(b,nx,ny)&F_GETRENNT)):rid!==id)continue;
    alt.set(k,gi);Q.push(-1,nx,ny);G.alte.push(nx,ny);if(G.ids.indexOf(rid)<0)G.ids.push(rid)}}}
 // Hülle: Kanten der neuen Felder. Innen liegende automatische Wände fallen weg, freie Außenkanten bekommen eine Wand.
 var wand=[],weg=[],kand=gruppen.map(function(){return[]});
 for(i=0;i<neuL.length;i++){var f=neuL[i];for(s=0;s<4;s++){var k2=kante(f.X,f.Y,s);if(!k2)continue;
   var ox=um(f.X+DX[s]),oy=f.Y+DY[s],ok=fk(ox,oy),og=nm.has(ok)?neuL[nm.get(ok)].g:alt.has(ok)?alt.get(ok):-1,v=kGet(b,k2[0],k2[1],k2[2]);
   if(og===f.g){if(((v>>2)&3)===H_AUTO&&!(nm.has(ok)&&s>1))weg.push(k2)}
   else if(v===0){kand[f.g].push({i:f.i,j:f.j,s:s,w:wand.length});wand.push({t:k2[0],X:k2[1],Y:k2[2],typ:K_WAND})}}}
 var tueren=[];for(i=0;i<gruppen.length;i++){if(gruppen[i].ids.length)continue;var t=tuerWahl(z,w,kand[i],C);if(t>=0){wand[kand[i][t].w].typ=K_TUER;tueren.push(wand[kand[i][t].w])}}
 return{w:w,art:art,getr:getr,felder:neuL,gruppen:gruppen,alt:alt,wand:wand,weg:weg,tueren:tueren,kosten:(neuL.length+wand.length)*PREIS}}
// Vorschau für G5c: darf gebaut werden, was kostet es, wo entstehen Wände und Tür? Ändert nichts.
function pruefen(z,w){if(!ARTEN.bauBoden(w))return{ok:false,grund:'invalid'};var p=planBoden(z,w);if(p.fehler)return{ok:false,grund:p.fehler,x:p.x,y:p.y};
 var gold=(z.bau||LEER).gold;return{ok:p.kosten<=gold,grund:p.kosten<=gold?'':'no_gold',kosten:p.kosten,felder:p.felder.length,
  waende:p.wand.map(function(k){return[k.t,k.X,k.Y,k.typ]}),raeume:p.gruppen.length}}

function baustelle(b,raum,ziele){var a={nr:b.nr++,raum:raum,zu:B_LAEUFT,i:0,rest:0,ziele:ziele};b.auf.push(a);return a.nr}
function kanteWeg(b,k,stattdessen){var v=kGet(b,k[0],k[1],k[2]);if(!v)return;if((v&3)&&((v>>4)&3)===Z_PLAN)b.gold+=PREIS;kSet(b,k[0],k[1],k[2],stattdessen||0)}

function bauBoden(z,w,bnr){var b=z.bau,p=planBoden(z,w),i,j;
 if(p.fehler)return melden(b,bnr,p.fehler,{x:p.x,y:p.y});
 if(p.kosten>b.gold)return melden(b,bnr,'no_gold',{kosten:p.kosten});
 if(b.auf.length>=MAX_BAUSTELLEN)return melden(b,bnr,'too_many_sites');
 var ids=p.gruppen.map(function(G){var id=0;for(var k=0;k<G.ids.length;k++)if(!id||G.ids[k]<id)id=G.ids[k];return id||b.id++});
 for(i=0;i<p.felder.length;i++){var f=p.felder[i],s=stk(b,f.X,f.Y,true),q=qi(f.X,f.Y);
  merk(b,f.X,f.Y);s.art[q]=p.art;s.raum[q]=ids[f.g];s.flag[q]=(s.flag[q]&F_ROD)|F_DACH|(f.rod?F_ROD:0)|(p.getr?F_GETRENNT:0)|(Z_PLAN<<4)}
 for(i=0;i<p.gruppen.length;i++){var G=p.gruppen[i],id=ids[i],r=b.raeume.get(id);
  if(!r){var e=null;for(j=0;j<p.felder.length;j++)if(p.felder[j].g===i){e=p.felder[j];break}r={id:id,art:p.art,felder:0,hx:e.X,hy:e.Y};b.raeume.set(id,r)}
  r.felder=G.n;
  for(j=0;j<G.alte.length;j+=2){var s2=stk(b,G.alte[j],G.alte[j+1]),q2=qi(G.alte[j],G.alte[j+1]);if(s2.raum[q2]!==id){s2.raum[q2]=id;merk(b,G.alte[j],G.alte[j+1])}}
  for(j=0;j<G.ids.length;j++)if(G.ids[j]!==id){b.raeume.delete(G.ids[j]);for(var a=0;a<b.auf.length;a++)if(b.auf[a].raum===G.ids[j])b.auf[a].raum=id}}
 for(i=0;i<p.weg.length;i++)kanteWeg(b,p.weg[i]);
 var ziele=[];for(i=0;i<p.felder.length;i++)ziele.push(0,p.felder[i].X,p.felder[i].Y);
 for(i=0;i<p.wand.length;i++){var k=p.wand[i];kSet(b,k.t,k.X,k.Y,k.typ|(H_AUTO<<2)|(Z_PLAN<<4));ziele.push(k.t,k.X,k.Y)}
 b.gold-=p.kosten;b.zaehler++;
 return melden(b,bnr,null,{kosten:p.kosten,baustelle:baustelle(b,ids[0],ziele),raum:ids[0]})}

// ── Felder entfernen (Liste [X,Y,…] bebauter Felder): Räume schrumpfen, teilen sich oder verschwinden. Nur noch nicht Begonnenes wird erstattet. ──
var beiEntfernen=null;                                   // Haken für später (G7+): Ware und Personen auf dem Feld umlagern, bevor es verschwindet. Entfernen löscht nie Ware oder Personen.
function entfernen(z,L){var b=z.bau,betroffen=[],i,s,X,Y;
 for(i=0;i<L.length;i+=2){X=L[i];Y=L[i+1];var st=stk(b,X,Y),q=qi(X,Y),id=st.raum[q];
  if(beiEntfernen)beiEntfernen(z,X,Y);
  if(((st.flag[q]>>4)&3)===Z_PLAN)b.gold+=PREIS;
  merk(b,X,Y);st.art[q]=0;st.raum[q]=0;st.flag[q]&=F_ROD;if(betroffen.indexOf(id)<0)betroffen.push(id);
  var r=b.raeume.get(id);if(r)r.felder--}
 for(i=0;i<L.length;i+=2){X=L[i];Y=L[i+1];
  for(s=0;s<4;s++){var k=kante(X,Y,s);if(!k)continue;var oy=Y+DY[s];if(oy>=0&&oy<WY&&artAt(b,um(X+DX[s]),oy))continue;      // Nachbar bebaut: Kante bleibt, wie sie ist
   var v=kGet(b,k[0],k[1],k[2]);if(((v>>2)&3)!==H_HAND)kanteWeg(b,k)}                                                         // Wand von Hand bleibt stehen (Wand ohne Raum ist gültig)
  leerRaeumen(b,X,Y)}
 for(i=0;i<betroffen.length;i++){var id2=betroffen[i],r2=b.raeume.get(id2);if(!r2)continue;
  if(r2.felder<=0){b.raeume.delete(id2);continue}
  var gesehen=new Set(),teile=[],haupt=-1;
  if(raumAt(b,r2.hx,r2.hy)===id2){teile.push(fluten(b,r2.hx,r2.hy,id2,gesehen));haupt=0}
  for(var j=0;j<L.length;j+=2)for(s=0;s<4;s++){var nx=um(L[j]+DX[s]),ny=L[j+1]+DY[s];if(ny<0||ny>=WY||raumAt(b,nx,ny)!==id2||gesehen.has(fk(nx,ny)))continue;teile.push(fluten(b,nx,ny,id2,gesehen))}
  if(haupt<0){var T=teile[0],bk=1e18;for(j=0;j<T.length;j+=2)if(fk(T[j],T[j+1])<bk){bk=fk(T[j],T[j+1]);r2.hx=T[j];r2.hy=T[j+1]}}
  r2.felder=teile[0].length>>1;
  for(var t=1;t<teile.length;t++){var T2=teile[t],nid=b.id++,nk=1e18,nr={id:nid,art:r2.art,felder:T2.length>>1,hx:0,hy:0};
   for(j=0;j<T2.length;j+=2){stk(b,T2[j],T2[j+1]).raum[qi(T2[j],T2[j+1])]=nid;merk(b,T2[j],T2[j+1]);if(fk(T2[j],T2[j+1])<nk){nk=fk(T2[j],T2[j+1]);nr.hx=T2[j];nr.hy=T2[j+1]}}
   b.raeume.set(nid,nr)}}
 b.zaehler++}

function bauEntfernen(z,w,bnr){var b=z.bau,L=[],i,j,n=0;if(w.y+w.h>WY)return melden(b,bnr,'edge');
 for(j=0;j<w.h;j++)for(i=0;i<w.w;i++){var X=um(w.x+i),Y=w.y+j;if(artAt(b,X,Y))L.push(X,Y);if(wegAt(b,X,Y)){wegWeg(b,X,Y);n++}}
 if(L.length)entfernen(z,L);
 // frei stehende Wände in der Auswahl (beide Seiten unbebaut) gehen mit weg
 for(j=0;j<w.h;j++)for(i=0;i<w.w;i++){var x=um(w.x+i),y=w.y+j;
  for(var s=0;s<4;s++){var k=kante(x,y,s);if(!k||!kGet(b,k[0],k[1],k[2]))continue;var oy=y+DY[s];if(artAt(b,x,y)||(oy>=0&&oy<WY&&artAt(b,um(x+DX[s]),oy)))continue;kanteWeg(b,k);n++}
  leerRaeumen(b,x,y)}
 if(!L.length&&!n)return melden(b,bnr,'nothing');
 b.zaehler++;return melden(b,bnr,null,{felder:L.length>>1})}

// ── G6a Wege: Feld prüfen (Land, Hang höchstens eine Stufe, kein Gebäude, kein Baum/Fels), planen, bauen, entfernen ──
function bodenWeg(z,X,Y,C){if(Y<0||Y>=WY-1)return'edge';
 var s=sicht(z,X>>6,Y>>6,C);if(!s)return'too_far';
 var q=qi(X,Y),mn=stufe(s.H[q]),mx=mn;
 for(var k=1;k<4;k++){var x=um(X+(k&1)),y=Y+(k>>1),t=sicht(z,x>>6,y>>6,C);if(!t)return'too_far';var h=stufe(t.H[qi(x,y)]);if(h<mn)mn=h;if(h>mx)mx=h}
 if(mx-mn>1)return'too_steep';
 var bio=s.B[q];if(bio<2||bio>9)return'water';
 if(s.W[q])return 0;                                                                     // Weltstraße: darf überbaut werden, Natur gibt es dort nicht
 var n=NAT().art(z.wg.seed,X,Y,bio,0,0);if(n<0)return 0;if(n<=5&&z.bau&&(flagAt(z.bau,X,Y)&F_STUMPF))return 1;return n<=5||n===12?'nature':1}
function planWeg(z,w){var b=z.bau||LEER,C=new Map(),art=WEG[w.art],L=[],i,j,X,Y;
 if(!z.wg||!z.wg.ans)return{fehler:'no_world'};if(w.y+w.h>WY-1)return{fehler:'edge'};
 for(j=0;j<w.h;j++)for(i=0;i<w.w;i++){X=um(w.x+i);Y=w.y+j;
  if(artAt(b,X,Y))return{fehler:'occupied',x:X,y:Y};
  var v=wegAt(b,X,Y);if((v&7)===art)continue;
  var g=bodenWeg(z,X,Y,C);if(typeof g==='string')return{fehler:g,x:X,y:Y};L.push(X,Y,g)}
 if(!L.length)return{fehler:'nothing'};
 return{art:art,felder:L,kosten:(L.length/3)*PREIS}}
function pruefenWeg(z,w){if(!ARTEN.bauWeg(w))return{ok:false,grund:'invalid'};var p=planWeg(z,w);if(p.fehler)return{ok:false,grund:p.fehler,x:p.x,y:p.y};
 var gold=(z.bau||LEER).gold;return{ok:p.kosten<=gold,grund:p.kosten<=gold?'':'no_gold',kosten:p.kosten,felder:p.felder.length/3}}
function wegWeg(b,X,Y){var s=stk(b,X,Y),q=qi(X,Y);if(!s||!s.weg[q])return;if(((s.weg[q]>>4)&3)===Z_PLAN)b.gold+=PREIS;merk(b,X,Y);s.weg[q]=0;leerRaeumen(b,X,Y)}
function bauWeg(z,w,bnr){var b=z.bau,p=planWeg(z,w),i;
 if(p.fehler)return melden(b,bnr,p.fehler,{x:p.x,y:p.y});
 if(p.kosten>b.gold)return melden(b,bnr,'no_gold',{kosten:p.kosten});
 if(b.auf.length>=MAX_BAUSTELLEN)return melden(b,bnr,'too_many_sites');
 var ziele=[],L=p.felder;
 for(i=0;i<L.length;i+=3){var X=L[i],Y=L[i+1],s=stk(b,X,Y,true),q=qi(X,Y);
  if(s.weg[q]&&((s.weg[q]>>4)&3)===Z_PLAN)b.gold+=PREIS;                                  // geplante andere Art wird ersetzt und erstattet
  merk(b,X,Y);s.weg[q]=p.art|(Z_PLAN<<4);if(L[i+2])s.flag[q]|=F_ROD;ziele.push(3,X,Y)}
 b.gold-=p.kosten;b.zaehler++;
 return melden(b,bnr,null,{kosten:p.kosten,felder:L.length/3,baustelle:baustelle(b,0,ziele)})}

// ── Wand, Tür, Tor von Hand ──
function kanteVon(w){return w.seite===2&&w.y+1>=WY?null:kante(w.x,w.y,w.seite)}
function bauWand(z,w,bnr){var b=z.bau,k=kanteVon(w);if(!k)return melden(b,bnr,'edge');
 var v=kGet(b,k[0],k[1],k[2]),ox=um(w.x+DX[w.seite]),oy=w.y+DY[w.seite],bebaut=artAt(b,w.x,w.y)||(oy>=0&&oy<WY&&artAt(b,ox,oy));
 if(!w.an){if(!(v&3))return melden(b,bnr,'nothing');kanteWeg(b,k,bebaut?H_WEG<<2:0);leerRaeumen(b,k[1],k[2]);b.zaehler++;return melden(b,bnr,null)}
 if((v&3)===K_WAND)return melden(b,bnr,'nothing');
 if(bebaut&&zumauern(z,b,[k]))return melden(b,bnr,'dead_end');               // G5c: einziger Zugang wird nicht zugemauert
 if(!bebaut){var C=new Map(),g=boden(z,w.x,w.y,C);if(typeof g==='string'){var g2=oy>=0&&oy<WY-1?boden(z,ox,oy,C):'edge';if(typeof g2==='string')return melden(b,bnr,g==='too_far'||g2==='too_far'?'too_far':g)}}
 var neuZiel=!(v&3)||((v>>4)&3)!==Z_PLAN;
 if(neuZiel){if(b.gold<PREIS)return melden(b,bnr,'no_gold',{kosten:PREIS});if(b.auf.length>=MAX_BAUSTELLEN)return melden(b,bnr,'too_many_sites');b.gold-=PREIS}
 kSet(b,k[0],k[1],k[2],K_WAND|(H_HAND<<2)|(Z_PLAN<<4));b.zaehler++;
 return melden(b,bnr,null,neuZiel?{kosten:PREIS,baustelle:baustelle(b,0,[k[0],k[1],k[2]])}:{kosten:0})}
function bauTuer(z,w,bnr){var b=z.bau,k=kanteVon(w);if(!k)return melden(b,bnr,'edge');
 var v=kGet(b,k[0],k[1],k[2]),typ=w.typ==='tor'?K_TOR:K_TUER;
 if(!(v&3))return melden(b,bnr,'no_wall');if((v&3)===typ)return melden(b,bnr,'nothing');
 var neuZiel=((v>>4)&3)!==Z_PLAN;
 if(neuZiel){if(b.gold<PREIS)return melden(b,bnr,'no_gold',{kosten:PREIS});if(b.auf.length>=MAX_BAUSTELLEN)return melden(b,bnr,'too_many_sites');b.gold-=PREIS}
 kSet(b,k[0],k[1],k[2],typ|(H_HAND<<2)|(Z_PLAN<<4));b.zaehler++;
 return melden(b,bnr,null,neuZiel?{kosten:PREIS,baustelle:baustelle(b,0,[k[0],k[1],k[2]])}:{kosten:0})}
// Dach öffnen oder schließen (abgeleitet je Feld, kostet nichts)
function bauDach(z,w,bnr){var b=z.bau,n=0;if(w.y+w.h>WY)return melden(b,bnr,'edge');
 if(w.zu===2){var zu=-1;for(var j0=0;j0<w.h&&zu<0;j0++)for(var i0=0;i0<w.w;i0++){var X0=um(w.x+i0),Y0=w.y+j0;if(artAt(b,X0,Y0)){zu=flagAt(b,X0,Y0)&F_DACH?0:1;break}}   // G5c: erstes Feld entscheidet
  if(zu<0)return melden(b,bnr,'nothing');w={x:w.x,y:w.y,w:w.w,h:w.h,zu:zu}}
 for(var j=0;j<w.h;j++)for(var i=0;i<w.w;i++){var X=um(w.x+i),Y=w.y+j,s=stk(b,X,Y);if(!s)continue;var q=qi(X,Y);if(!s.art[q]||!!(s.flag[q]&F_DACH)===!!w.zu)continue;s.flag[q]^=F_DACH;merk(b,X,Y);n++}
 if(!n)return melden(b,bnr,'nothing');b.zaehler++;return melden(b,bnr,null,{felder:n})}
// Hülle neu erzeugen: alle offenen Außenkanten des Raums bekommen eine Wand (auch von Hand geöffnete), innen liegende automatische Wände fallen weg, ohne Tür kommt eine dazu.
function bauHuelle(z,w,bnr){var b=z.bau,r=b.raeume.get(w.raum);if(!r)return melden(b,bnr,'no_room');
 var L=fluten(b,r.hx,r.hy,r.id,new Set()),wand=[],weg=[],tuer=false,K=[],x0=L[0],y0=L[1],i,s;
 for(i=0;i<L.length;i+=2)for(s=0;s<4;s++){var X=L[i],Y=L[i+1],k=kante(X,Y,s);if(!k)continue;var oy=Y+DY[s],innen=oy>=0&&oy<WY&&raumAt(b,um(X+DX[s]),oy)===r.id,v=kGet(b,k[0],k[1],k[2]);
  if(innen){if(((v>>2)&3)===H_AUTO&&s<2)weg.push(k)}
  else if(!(v&3)){var dx=X-x0;if(dx>WX/2)dx-=WX;else if(dx<-WX/2)dx+=WX;K.push({i:dx,j:Y-y0,s:s,w:wand.length});wand.push(k)}
  else if((v&3)>=K_TUER)tuer=true}
 if(!wand.length&&!weg.length)return melden(b,bnr,'nothing');
 if(wand.length*PREIS>b.gold)return melden(b,bnr,'no_gold',{kosten:wand.length*PREIS});
 if(wand.length&&b.auf.length>=MAX_BAUSTELLEN)return melden(b,bnr,'too_many_sites');
 var t=-1;if(!tuer&&K.length){var mnx=0,mxx=0,mny=0,mxy=0;for(i=0;i<K.length;i++){if(K[i].i<mnx)mnx=K[i].i;if(K[i].i>mxx)mxx=K[i].i;if(K[i].j<mny)mny=K[i].j;if(K[i].j>mxy)mxy=K[i].j}
  for(i=0;i<K.length;i++){K[i].i-=mnx;K[i].j-=mny}t=tuerWahl(z,{x:um(x0+mnx),y:y0+mny,w:mxx-mnx+1,h:mxy-mny+1},K,new Map())}
 for(i=0;i<weg.length;i++)kanteWeg(b,weg[i]);
 var ziele=[];for(i=0;i<wand.length;i++){var k2=wand[i];kSet(b,k2[0],k2[1],k2[2],(t>=0&&K[t].w===i?K_TUER:K_WAND)|(H_AUTO<<2)|(Z_PLAN<<4));ziele.push(k2[0],k2[1],k2[2])}
 b.gold-=wand.length*PREIS;b.zaehler++;
 return melden(b,bnr,null,{kosten:wand.length*PREIS,baustelle:wand.length?baustelle(b,r.id,ziele):0,raum:r.id})}

// ── G5c: Wandlinie, Tür wechseln, Sackgassen-Schutz für mehrere Wände zusammen ──
// Felder zu beiden Seiten einer gespeicherten Kante [Kantenart, X, Y]
function seiten(k){return k[0]===N_?[k[1],k[2],k[1],k[2]-1]:[k[1],k[2],um(k[1]-1),k[2]]}
// true, wenn diese Kanten (sollen Wand werden) zusammen einem Raum den einzigen Zugang nehmen; jeder betroffene Raum wird einmal geprüft
function zumauern(z,b,K){var R=new Set(),L=[],i;for(i=0;i<K.length;i++){var f=seiten(K[i]);L.push([K[i][0],K[i][1],K[i][2]]);
  if(f[1]>=0&&f[1]<WY){var r1=raumAt(b,f[0],f[1]);if(r1)R.add(r1)}if(f[3]>=0&&f[3]<WY){var r2=raumAt(b,f[2],f[3]);if(r2)R.add(r2)}}
 var hit=false;R.forEach(function(r){if(!hit&&sackgasse(z,r,L))hit=true});return hit}
// Linie auf dem Feldraster: r 0 = waagerecht (Nordkanten der Felder x … x+n−1 in Zeile y), r 1 = senkrecht (Westkanten der Felder y … y+n−1 in Spalte x)
function linie(w){var L=[];for(var i=0;i<w.n;i++)L.push(w.r===0?[N_,um(w.x+i),w.y]:[W_,w.x,w.y+i]);return L}
// Plan einer Wandlinie (ändert nichts): an = bauen, sonst abreißen; Türen und Tore bleiben in beiden Fällen
function planWaende(z,w){var b=z.bau||LEER,L=linie(w),neuK=[],C=new Map(),i;
 if(w.an===2){var luecke=0;for(i=0;i<L.length&&!luecke;i++)if(!(kGet(b,L[i][0],L[i][1],L[i][2])&3))luecke=1;w={r:w.r,x:w.x,y:w.y,n:w.n,an:luecke}}   // 2 = von selbst: Lücken werden zugemauert, eine schon ganz geschlossene Linie wird abgerissen
 for(i=0;i<L.length;i++){var k=L[i],v=kGet(b,k[0],k[1],k[2]);
  if(!w.an){if((v&3)===K_WAND)neuK.push(k);continue}                          // Türen und Tore bleiben (die ändert das Tür-Werkzeug)
  if(v&3)continue;var f=seiten(k),bebaut=artAt(b,f[0],f[1])||(f[3]>=0&&f[3]<WY&&artAt(b,f[2],f[3]));
  if(!bebaut){var g=boden(z,f[0],f[1],C);if(typeof g==='string'){var g2=f[3]>=0&&f[3]<WY-1?boden(z,f[2],f[3],C):'edge';if(typeof g2==='string')return{fehler:g==='too_far'||g2==='too_far'?'too_far':g,x:f[0],y:f[1]}}}
  neuK.push(k)}
 if(!neuK.length)return{fehler:'nothing'};
 if(w.an){if(zumauern(z,b,neuK))return{fehler:'dead_end'};if(neuK.length*PREIS>b.gold)return{fehler:'no_gold',kosten:neuK.length*PREIS};if(b.auf.length>=MAX_BAUSTELLEN)return{fehler:'too_many_sites'}}
 return{kanten:neuK,kosten:w.an?neuK.length*PREIS:0,an:w.an}}
function pruefenWaende(z,w){if(!ARTEN.bauWaende(w))return{ok:false,grund:'invalid'};var p=planWaende(z,w);
 if(p.fehler)return{ok:false,grund:p.fehler,kosten:p.kosten||0,x:p.x,y:p.y};return{ok:true,grund:'',kosten:p.kosten,waende:p.kanten.length,an:p.an}}
function bauWaende(z,w,bnr){var b=z.bau,p=planWaende(z,w),K=p.kanten,i;if(p.fehler)return melden(b,bnr,p.fehler,{kosten:p.kosten||0});
 if(!p.an){for(i=0;i<K.length;i++){var f=seiten(K[i]),beb=artAt(b,f[0],f[1])||(f[3]>=0&&f[3]<WY&&artAt(b,f[2],f[3]));kanteWeg(b,K[i],beb?H_WEG<<2:0);leerRaeumen(b,K[i][1],K[i][2])}
  b.zaehler++;return melden(b,bnr,null,{waende:K.length,kosten:0})}
 var ziele=[];for(i=0;i<K.length;i++){kSet(b,K[i][0],K[i][1],K[i][2],K_WAND|(H_HAND<<2)|(Z_PLAN<<4));ziele.push(K[i][0],K[i][1],K[i][2])}
 b.gold-=p.kosten;b.zaehler++;return melden(b,bnr,null,{waende:K.length,kosten:p.kosten,baustelle:baustelle(b,0,ziele)})}
// Antippen mit dem Tür-Werkzeug: Wand → Tür → Tor → Wand (zurück zur Wand mit Sackgassen-Schutz)
function bauTuerWechsel(z,w,bnr){var b=z.bau,k=kanteVon(w);if(!k)return melden(b,bnr,'edge');var t=kGet(b,k[0],k[1],k[2])&3;
 if(!t)return melden(b,bnr,'no_wall');var e=t===K_WAND?bauTuer(z,{x:w.x,y:w.y,seite:w.seite,typ:'tuer'},bnr):t===K_TUER?bauTuer(z,{x:w.x,y:w.y,seite:w.seite,typ:'tor'},bnr):bauWand(z,{x:w.x,y:w.y,seite:w.seite,an:1},bnr);
 var m=b.meld[b.meld.length-1];if(m&&m.nr===bnr&&m.ok)m.typ=t===K_WAND?'tuer':t===K_TUER?'tor':'wand';return e}   // typ: was jetzt dort steht

// ── Baustellen: pausieren, abbrechen, je Tick fortschreiben ──
function finde(b,nr){for(var i=0;i<b.auf.length;i++)if(b.auf[i].nr===nr)return i;return -1}
function bauPause(z,w,bnr){var b=z.bau,n=0;for(var i=0;i<b.auf.length;i++){var a=b.auf[i];if((w.nr&&a.nr===w.nr)||(w.raum&&a.raum===w.raum)){if(a.zu!==B_BLOCK)a.zu=w.an?B_PAUSE:B_LAEUFT;n++}}
 if(!n)return melden(b,bnr,'no_site');b.zaehler++;return melden(b,bnr,null)}
// Abbruch: alles noch nicht Fertige der Baustelle verschwindet; erstattet wird nur, was noch nicht begonnen war. Fertiges bleibt stehen.
function bauAbbruch(z,w,bnr){var b=z.bau,p=finde(b,w.nr);if(p<0)return melden(b,bnr,'no_site');
 var a=b.auf[p],Z=a.ziele,L=[],i;b.auf.splice(p,1);
 for(i=a.i*3;i<Z.length;i+=3){var t=Z[i],X=Z[i+1],Y=Z[i+2];
  if(t===0){var zu=(flagAt(b,X,Y)>>4)&3;if(artAt(b,X,Y)&&(zu===Z_PLAN||zu===Z_ARBEIT))L.push(X,Y)}
  else{var v=kGet(b,t,X,Y),kz=(v>>4)&3;if((v&3)&&(kz===Z_PLAN||kz===Z_ARBEIT))kanteWeg(b,[t,X,Y])}}
 if(L.length)entfernen(z,L);
 for(i=a.i*3;i<Z.length;i+=3)leerRaeumen(b,Z[i+1],Z[i+2]);
 b.zaehler++;return melden(b,bnr,null,{felder:L.length>>1})}

function zielZu(b,t,X,Y){if(t===3){var v=wegAt(b,X,Y);return v?(v>>4)&3:0}return t===0?(artAt(b,X,Y)?(flagAt(b,X,Y)>>4)&3:0):((kGet(b,t,X,Y)&3)?(kGet(b,t,X,Y)>>4)&3:0)}
function zielSetzen(b,t,X,Y,zu){var s=stk(b,X,Y),q=qi(X,Y);merk(b,X,Y);if(t===3)s.weg[q]=(s.weg[q]&0xCF)|(zu<<4);else if(t===0)s.flag[q]=(s.flag[q]&0xCF)|(zu<<4);else{var A=t===N_?s.kn:s.kw;A[q]=(A[q]&0xCF)|(zu<<4)}}
// Ein Tick: höchstens JE_TICK laufende Baustellen kommen einen Schritt weiter (Reihenfolge = Baustellennummer). Entferntes oder Geändertes wird übersprungen.
function schritt(z){var b=z.bau,A=b.auf;b.tk=z.tick;wtAlt(b,z.tick);if(!A.length)return;var n=0,fertig=false,H=z.war?WAR():null;
 for(var i=0;i<A.length&&n<JE_TICK;i++){var a=A[i],Z=a.ziele;if(a.zu!==B_LAEUFT)continue;n++;
  if(!a.rest){var spr=0;
   while(a.i*3<Z.length&&spr<64&&zielZu(b,Z[a.i*3],Z[a.i*3+1],Z[a.i*3+2])!==Z_PLAN){a.i++;spr++}
   if(a.i*3>=Z.length){a.zu=-1;fertig=true;continue}
   if(spr>=64)continue;
   if(H&&!H.bauStart(z,a,Z[a.i*3],Z[a.i*3+1],Z[a.i*3+2]))continue;      // G7: ohne Bauarbeiter vor Ort oder ohne Material beginnt kein Ziel
   zielSetzen(b,Z[a.i*3],Z[a.i*3+1],Z[a.i*3+2],Z_ARBEIT);a.rest=Z[a.i*3]===0?FELD_TICKS:Z[a.i*3]===3?WEG_TICKS:KANTE_TICKS;b.zaehler++}
  var takt=H?H.bauTakt(z,a):1;if(!takt)continue;a.rest=a.rest>takt?a.rest-takt:0;      // G7: Fortschritt nur mit Bauarbeiter (geübte bauen schneller)
  if(a.rest===0){var p=a.i*3;if(zielZu(b,Z[p],Z[p+1],Z[p+2])===Z_ARBEIT){zielSetzen(b,Z[p],Z[p+1],Z[p+2],Z_FERTIG);b.zaehler++;if(H)H.bauFertig(z,a)}
   a.i++;if(a.i*3>=Z.length){a.zu=-1;fertig=true}}}
 if(fertig){b.auf=A.filter(function(a){return a.zu>=0});b.zaehler++}}

// ── Sackgassen-Schutz (reine Prüfung, G5c ruft sie vor dem Wändeziehen): Schließt diese Wandmenge einem Teil des Raums den einzigen Zugang? ──
// kanten = [[Kantenart 1 Nord | 2 West, X, Y], …] sollen Wand werden. Zugang = offene Kante, Tür oder Tor nach draußen. true = danach gibt es mehr eingeschlossene Felder als vorher.
function sackgasse(z,raum,kanten){var b=z.bau||LEER,r=b.raeume.get(raum);if(!r)return false;
 var L=fluten(b,r.hx,r.hy,r.id,new Set()),zu=new Set(),i;for(i=0;i<kanten.length;i++)zu.add(kanten[i][0]+':'+kanten[i][1]+':'+kanten[i][2]);
 function gefangen(mit){var gesehen=new Set(),n=0;
  for(var i=0;i<L.length;i+=2){if(gesehen.has(fk(L[i],L[i+1])))continue;var Q=[L[i],L[i+1]],p=0,frei=false;gesehen.add(fk(L[i],L[i+1]));
   while(p<Q.length){var x=Q[p++],y=Q[p++];for(var s=0;s<4;s++){var k=kante(x,y,s);if(!k)continue;var v=kGet(b,k[0],k[1],k[2])&3;
     if(v===K_WAND||(mit&&zu.has(k[0]+':'+k[1]+':'+k[2])))continue;var nx=um(x+DX[s]),ny=y+DY[s];
     if(ny<0||ny>=WY||raumAt(b,nx,ny)!==r.id){frei=true;continue}
     if(!gesehen.has(fk(nx,ny))){gesehen.add(fk(nx,ny));Q.push(nx,ny)}}}
   if(!frei)n+=Q.length>>1}
  return n}
 return gefangen(true)>gefangen(false)}

// ── Befehle: Form prüfen (beim Annehmen), anwenden (an der Tickgrenze, Reihenfolge der Laufnummer). Ergebnis jedes Befehls steht in z.bau.meld. ──
function G(v,min,max){return typeof v==='number'&&v===Math.floor(v)&&v>=min&&v<=max}
function rechteck(w){return w&&typeof w==='object'&&G(w.x,0,WX-1)&&G(w.y,0,WY-1)&&G(w.w,1,MAX_AUSWAHL)&&G(w.h,1,MAX_AUSWAHL)&&w.w*w.h<=MAX_AUSWAHL}
function kantenwert(w){return w&&typeof w==='object'&&G(w.x,0,WX-1)&&G(w.y,0,WY-1)&&G(w.seite,0,3)}
var ARTEN={
 bauBoden:function(w){return rechteck(w)&&ART[w.art]>0&&(w.getrennt===undefined||w.getrennt===0||w.getrennt===1)},
 bauEntfernen:rechteck,
 bauWand:function(w){return kantenwert(w)&&(w.an===0||w.an===1)},
 bauTuer:function(w){return kantenwert(w)&&(w.typ==='tuer'||w.typ==='tor')},
 bauDach:function(w){return rechteck(w)&&(w.zu===0||w.zu===1||w.zu===2)},                // 2 = umschalten nach dem ersten bebauten Feld (G5c)
 bauWaende:function(w){return w&&typeof w==='object'&&G(w.x,0,WX-1)&&G(w.y,0,WY-1)&&(w.r===0||w.r===1)&&G(w.n,1,MAX_LINIE)&&(w.an===0||w.an===1||w.an===2)&&(w.r===0||w.y+w.n<=WY)},
 bauTuerWechsel:kantenwert,
 bauWeg:function(w){return rechteck(w)&&WEG[w.art]>0},
 bauHuelle:function(w){return w&&typeof w==='object'&&G(w.raum,1,4294967295)},
 bauPause:function(w){return w&&typeof w==='object'&&(w.an===0||w.an===1)&&(G(w.nr,1,2147483647)||G(w.raum,1,4294967295))},
 bauAbbruch:function(w){return w&&typeof w==='object'&&G(w.nr,1,2147483647)}};
var TUN={bauBoden:bauBoden,bauEntfernen:bauEntfernen,bauWand:bauWand,bauTuer:bauTuer,bauDach:bauDach,bauHuelle:bauHuelle,bauPause:bauPause,bauAbbruch:bauAbbruch,bauWaende:bauWaende,bauTuerWechsel:bauTuerWechsel,bauWeg:bauWeg};
function befehl(z,art,wert,nr){if(!z.bau)z.bau=neu();z.bau.tk=z.tick;return TUN[art](z,wert,nr)}

// ── Fingerabdruck und Spielstand ──
function schluessel(M){var L=[];M.forEach(function(v,k){L.push(k)});L.sort(function(a,b){return a-b});return L}
function abdruck(b,f){f(b.gold);f(b.id);f(b.nr);f(b.zaehler);
 schluessel(b.st).forEach(function(k){var s=b.st.get(k),da=false;for(var i=0;i<FELDER;i++)if(s.art[i]||s.kn[i]||s.kw[i]||s.flag[i]||s.weg[i]){if(!da){da=true;f(k)}f(i);f(s.art[i]|(s.flag[i]<<8)|(s.kn[i]<<16)|(s.kw[i]<<24));f(s.raum[i]);if(s.weg[i])f(s.weg[i]|1<<30)}});   // G6a: ohne Wege wie bisher
 schluessel(b.raeume).forEach(function(k){var r=b.raeume.get(k);f(r.id);f(r.art);f(r.felder);f(r.hx);f(r.hy)});
 for(var i=0;i<b.auf.length;i++){var a=b.auf[i];f(a.nr);f(a.raum);f(a.zu);f(a.i);f(a.rest);f(a.ziele.length);for(var j=0;j<a.ziele.length;j++)f(a.ziele[j])}}
var STAND=2;                                             // G6a: 2 = je Feld sieben Werte (mit Weg); Stände der Form 1 (sechs Werte) werden weiter gelesen
function stand(b){
 return{format:STAND,gold:b.gold,id:b.id,nr:b.nr,zaehler:b.zaehler,
  st:schluessel(b.st).map(function(k){var s=b.st.get(k),L=[];for(var i=0;i<FELDER;i++)if(s.art[i]||s.kn[i]||s.kw[i]||s.flag[i]||s.weg[i])L.push(i,s.art[i],s.raum[i],s.kn[i],s.kw[i],s.flag[i],s.weg[i]);return[k,L]}).filter(function(e){return e[1].length}),
  raeume:schluessel(b.raeume).map(function(k){var r=b.raeume.get(k);return[r.id,r.art,r.felder,r.hx,r.hy]}),
  auf:b.auf.map(function(a){return[a.nr,a.raum,a.zu,a.i,a.rest,a.ziele.slice()]}),
  wt:schluessel(b.wt).map(function(k){return[k,b.wt.get(k)]})}}
// Prüft streng; null = Stand ungültig.
function ausStand(d){var i,j;
 var FW=d&&d.format===1?6:7;
 if(!d||(d.format!==STAND&&d.format!==1)||!G(d.gold,0,2147483647)||!G(d.id,1,4294967295)||!G(d.nr,1,2147483647)||!G(d.zaehler,0,2147483647)||!Array.isArray(d.st)||!Array.isArray(d.raeume)||!Array.isArray(d.auf)||d.auf.length>MAX_BAUSTELLEN)return null;
 var b=neu();b.gold=d.gold;b.id=d.id;b.nr=d.nr;b.zaehler=d.zaehler;
 for(i=0;i<d.st.length;i++){var e=d.st[i];if(!Array.isArray(e)||e.length!==2||!G(e[0],0,SX*8192)||((e[0]/8192)|0)>=SX||e[0]%8192>=SY||b.st.has(e[0])||!Array.isArray(e[1])||e[1].length%FW||!e[1].length)return null;
  var s=leerStk(),L=e[1];
  for(j=0;j<L.length;j+=FW){var wv=FW===7?L[j+6]:0;if(!G(wv,0,52)||(wv&&(!(wv&7)||(wv&7)>4||!((wv>>4)&3)||(wv&8)||L[j+1])))return null;s.weg[L[j]]=wv;var q=L[j];if(!G(q,0,FELDER-1)||!G(L[j+1],0,5)||!G(L[j+2],0,4294967295)||!G(L[j+3],0,63)||!G(L[j+4],0,63)||!G(L[j+5],0,63)||(!L[j+1])!==(!L[j+2]))return null;
   s.art[q]=L[j+1];s.raum[q]=L[j+2];s.kn[q]=L[j+3];s.kw[q]=L[j+4];s.flag[q]=L[j+5]}
  b.st.set(e[0],s);b.neu.add(e[0])}
 for(i=0;i<d.raeume.length;i++){var r=d.raeume[i];if(!Array.isArray(r)||r.length!==5||!G(r[0],1,d.id-1)||!G(r[1],1,5)||!G(r[2],1,MAX_RAUM)||!G(r[3],0,WX-1)||!G(r[4],0,WY-1)||b.raeume.has(r[0])||raumAt(b,r[3],r[4])!==r[0])return null;
  b.raeume.set(r[0],{id:r[0],art:r[1],felder:r[2],hx:r[3],hy:r[4]})}
 var vor=0;for(i=0;i<d.auf.length;i++){var a=d.auf[i];if(!Array.isArray(a)||a.length!==6||!G(a[0],vor+1,d.nr-1)||!G(a[1],0,4294967295)||!G(a[2],0,2)||!Array.isArray(a[5])||a[5].length%3||!a[5].length||a[5].length>MAX_ZIELE*3||!G(a[3],0,a[5].length/3-1)||!G(a[4],0,FELD_TICKS))return null;
  for(j=0;j<a[5].length;j+=3)if(!G(a[5][j],0,3)||!G(a[5][j+1],0,WX-1)||!G(a[5][j+2],0,WY-1))return null;
  vor=a[0];b.auf.push({nr:a[0],raum:a[1],zu:a[2],i:a[3],rest:a[4],ziele:a[5].slice()})}
 if(d.wt!==undefined){if(!Array.isArray(d.wt)||d.wt.length>WT_MAX*2)return null;for(i=0;i<d.wt.length;i++){var w=d.wt[i];if(!Array.isArray(w)||w.length!==2||!G(w[0],0,SX*8192)||!G(w[1],0,2147483647))return null;b.wt.set(w[0],w[1])}}   // G6b, fehlt in älteren Ständen
 return b}

// ── Auskunft (für Tests, G5b und G5c) ──
function feld(z,X,Y){var b=z.bau||LEER,s=stk(b,X,Y),q=qi(X,Y);if(!s||!s.art[q])return null;return{art:ART_NAME[s.art[q]],raum:s.raum[q],zustand:(s.flag[q]>>4)&3,dach:!!(s.flag[q]&F_DACH),gerodet:!!(s.flag[q]&F_ROD),getrennt:!!(s.flag[q]&F_GETRENNT)}}
function kanteAn(z,X,Y,seite){var b=z.bau||LEER,k=kante(X,Y,seite);if(!k)return null;var v=kGet(b,k[0],k[1],k[2]);return{typ:v&3,herkunft:(v>>2)&3,zustand:(v>>4)&3}}
// G8: Stumpf setzen (Baum gefällt) oder wegnehmen (Baum wächst nach). Ändert nur den Merker; Karte, Begehbarkeit und Wegversion erfahren es wie jede Bauänderung.
function stumpf(z,X,Y,an){var b=z.bau;if(!b)return false;var s=stk(b,X,Y,!!an);if(!s)return false;var q=qi(X,Y),v=s.flag[q],n=an?v|F_STUMPF:v&~F_STUMPF;if(n===v)return false;
 b.tk=z.tick;merk(b,X,Y);s.flag[q]=n;if(!an)leerRaeumen(b,X,Y);b.zaehler++;return true}
function stumpfAn(z,X,Y){return !!(z.bau&&(flagAt(z.bau,X,Y)&F_STUMPF))}
// Ist das Feld für einen nachwachsenden Baum frei (nichts gebaut, kein Weg, nicht gerodet)?
function baumFrei(z,X,Y){var b=z.bau;if(!b)return true;return !artAt(b,X,Y)&&!wegAt(b,X,Y)&&!(flagAt(b,X,Y)&F_ROD)}
function wegAn(z,X,Y){var v=wegAt(z.bau||LEER,X,Y);return v?{art:WEG_NAME[v&7],nr:v&7,zustand:(v>>4)&3}:null}
function bytes(b){return b.st.size*FELDER*9}
// G5b: Bau eines Kartenstücks für die Karte (Bildkern) als ein Puffer: art, kn, kw, flag je 4.096 Byte, danach raum (4.096 × 4 Byte), G6a: danach weg (4.096 Byte).
var PACK=FELDER*9;
function stueck(b,k){var s=b.st.get(k);if(!s)return null;var a=new Uint8Array(PACK);a.set(s.art,0);a.set(s.kn,FELDER);a.set(s.kw,FELDER*2);a.set(s.flag,FELDER*3);
 new Uint32Array(a.buffer,FELDER*4,FELDER).set(s.raum);a.set(s.weg,FELDER*8);return a}
function geaendert(b){var L=[];b.neu.forEach(function(k){L.push(k)});b.neu.clear();return L}

var B={neu:neu,START_GOLD:START_GOLD,PREIS:PREIS,FELD_TICKS:FELD_TICKS,KANTE_TICKS:KANTE_TICKS,MAX_AUSWAHL:MAX_AUSWAHL,MAX_RAUM:MAX_RAUM,MAX_BAUSTELLEN:MAX_BAUSTELLEN,JE_TICK:JE_TICK,WEG:WEG,WEG_NAME:WEG_NAME,WEG_TICKS:WEG_TICKS,pruefenWeg:pruefenWeg,weg:wegAn,
 ART:ART,ART_NAME:ART_NAME,K_WAND:K_WAND,K_TUER:K_TUER,K_TOR:K_TOR,H_AUTO:H_AUTO,H_HAND:H_HAND,H_WEG:H_WEG,Z_PLAN:Z_PLAN,Z_ARBEIT:Z_ARBEIT,Z_FERTIG:Z_FERTIG,B_LAEUFT:B_LAEUFT,B_PAUSE:B_PAUSE,B_BLOCK:B_BLOCK,
 ARTEN:ARTEN,befehl:befehl,schritt:schritt,abdruck:abdruck,stand:stand,ausStand:ausStand,pruefen:pruefen,pruefenWaende:pruefenWaende,sackgasse:sackgasse,boden:function(z,X,Y){return boden(z,X,Y,new Map())},
 feld:feld,kante:kanteAn,ziel:zielZu,bytes:bytes,stueck:stueck,geaendert:geaendert,PACK:PACK,F_DACH:F_DACH,F_ROD:F_ROD,F_STUMPF:F_STUMPF,stumpf:stumpf,stumpfAn:stumpfAn,baumFrei:baumFrei,haken:function(f){beiEntfernen=f}};
if(typeof module!=='undefined'&&module.exports)module.exports=B;else root.AT3BAU=B;
})(typeof self!=='undefined'?self:this);
