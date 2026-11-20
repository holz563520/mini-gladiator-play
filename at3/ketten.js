// WAS DIE DATEI TUT: Erste Ketten im Weltkern von Arena Theory 3.0 (Schritt G8): Holz (Baum → Stamm → Bretter), Nahrung (Reh → Fleisch → Mahlzeit), Wasser,
// Essen und Trinken der Arbeiter, einfache Wildtiere (Reh), Stümpfe, die nachwachsen, und die Automatik mit Sollbeständen. Reine Rechnung, nur ganze Zahlen.
// Entscheidungen Thomas (17.11.2026): Holzfäller fällt (Rolle, kein Gebäude), Sägewerkstatt sägt, Küche kocht, Jägerhütte nötig, gejagt wird von normalen
// Arbeitern/Gladiatoren, Wasser aus Fluss und See, Arbeiter essen und trinken, gefällter Baum wird Stumpf und wächst nach. Alle Zahlen unten sind Vorschläge
// (so freigegeben, Thomas setzt sie später).
// Ablauf: Die Automatik (Regel 18) sieht einmal je Sekunde auf die Bestände. Liegt eine Ware unter ihrem Sollbestand, bekommt eine freie Person mit passender
// Rolle die Tätigkeit: Wasser schöpfen (nächstes Fluss-/Seefeld bis 32 Felder vom Lager, 5 Wasser, trägt sie selbst ins Lager), Kochen (Küche: 1 Fleisch +
// 1 Wasser → 3 Mahlzeiten), Jagen (Jägerhütte: zum Reh pirschen, erlegen, 8 Fleisch als Stapel), Sägen (Sägewerkstatt: 1 Stamm → 4 Bretter), Fällen (nächster
// Baum bis 24 Felder vom Lager, 4 Stämme als Stapel, Baum wird Stumpf). Stapel sammeln die Träger von selbst ein (waren.js). Arbeitsstätten haben einen eigenen
// Bestand (T_WERK): die Automatik bestellt Zutaten als Lieferauftrag hin und Erzeugnisse als Lieferauftrag ins Lager; getragen wird wie alles andere (G7).
// Essen und Trinken: je Person und Spieltag 1 Mahlzeit und 2 Wasser, geholt im nächsten Lager, das etwas hat. Wer länger als einen Vierteltag nichts bekommt,
// ist hungrig oder durstig und läuft und arbeitet halb so schnell. Niemand stirbt (G8). Später: Proteine und Kalorien (Thomas), nicht hier.
// Rollen von Hand: Befehl personRolle {id, darf} (Bit 0 tragen, 1 bauen, 2 fällen, 3 sägen, 4 kochen, 5 jagen, 6 Wasser), sonst verteilt die Automatik.
// Training (Thomas, wichtig): je Tätigkeit eine eigene Fähigkeit (0–100, bis +50 % Tempo) und ein Zähler der erledigten Arbeitsgänge. Welche Körperwerte
// und Fähigkeiten eine Tätigkeit trainiert und nutzt, steht nur in daten/taetigkeiten.json (Master-Editor, Reiter „Tätigkeiten“, Regel 19); gezählt wird ab
// G8 hier, wirken tut es mit den Gladiatorenwerten aus 1.0 (G9).
// Einschalten: Befehl „ketten {an:1}“ (das Spiel schickt ihn nach „wirtschaft“ und für ältere Stände beim Laden). Ohne ihn bleibt z.ket leer und alles ist
// wie in G7 (Tests bis G7 unverändert).
// Kerne: nur Weltkern (Regel 13), Wege auf den Helfern (Auftrag pweg der Personen). Kosten: Rehe je Tick ein paar Zahlen, alles andere einmal je Sekunde;
// Baum- und Wassersuche nur, wenn die Ware fehlt, im festen Umkreis ums Lager, mit 10 s Pause nach einem Fehlschlag. Nichts hängt von der Weltgröße ab (Regel 14).
// Wiederverwendet: Bestände, Lieferaufträge und Stapel (waren.js, G7), Arbeiter, Laufen und Wegsuche (personen.js, G7), Natur aus Seed (natur.js, G4b),
// Feld-Merker und Kartenstück-Versand (bau.js, G5), Begehbarkeit (begehbar.js, G6a). Aus 1.0: Reh (outside-art.js) und Baumstumpf (2.0 welt-natur.js) als Bilder.
(function(root){
'use strict';
function W(){return root.AT3WAREN||(typeof module!=='undefined'&&module.exports?require('./waren.js'):null)}
function P(){return root.AT3PERS||(typeof module!=='undefined'&&module.exports?require('./personen.js'):null)}
function BAU(){return root.AT3BAU||(typeof module!=='undefined'&&module.exports?require('./bau.js'):null)}
function NAT(){return root.AT3NATUR||(typeof module!=='undefined'&&module.exports?require('./natur.js'):null)}
var ST=64, FF=ST*ST, SX=9600, WX=ST*SX, WY=ST*4800, MEER=2048, LS=6, M31=2147483647, STAND=1;
// ── Vorschlagswerte (Ticks: 20 = 1 s bei 1×) ──
var TAG=12000;                                   // 1 Spieltag = 10 Minuten bei 1×
var SOLL=[100,0,50,30,10,10];                    // Sollbestand je Ware (Bretter, Stein, Wasser, Mahlzeit, Stamm, Fleisch); 0 = wird nicht erzeugt
var FAELL_R=24, FAELL_T=400, FAELL_M=4, WACHS=3*TAG, FAELL_MAX=2;
var SAEG_T=300, SAEG_M=4, KOCH_T=400, KOCH_M=3, PUFFER=5;
var WASSER_R=32, WASSER_T=60, WASSER_M=5;
var JAGD_R=32, JAGD_T=200, JAGD_M=8, REH_MAX=6, REH_FELD=40, REH_PAUSE=40, REH_NAH=3, JAGD_VERSUCH=6, REH_ERST=200;
var ESS_MAHL=TAG, ESS_WASSER=TAG/2, GNADE=TAG/4, TAKT=20, PHASE=3, WIEDER=200, LEERLAUF=40, MAX_STUMPF=4096, MAX_REH=256, MAX_SPERR=16;
// Tätigkeiten (Nummer = Fähigkeit f0…f6, Zähler n0…n6, Rollen-Bit): 0 tragen, 1 bauen, 2 fällen, 3 sägen, 4 kochen, 5 jagen, 6 Wasser. Aufgabe = Nummer + 3.
var AKT=['haul','build','fell','saw','cook','hunt','water'], T_FAELLEN=2, T_SAEGEN=3, T_KOCHEN=4, T_JAGEN=5, T_WASSER=6;
var A_FAELLEN=5, A_SAEGEN=6, A_KOCHEN=7, A_JAGEN=8, A_WASSER=9, A_ESSEN=10;
var H_BAUM=1, H_WASSER=2, H_WILD=4, H_SAEGE=8, H_KUECHE=16, H_HUETTE=32, H_VOLL=64, H_HUNGER=128;      // Hinweise an den Spieler (nur Anzeige)
var DX=[0,-1,0,1], DY=[-1,0,1,0];
function umX(X){return X<0?X+WX:X>=WX?X-WX:X}
function ab(a,b){var d=Math.abs(a-b);return d>WX/2?WX-d:d}
function weit(x,y,x2,y2){return Math.max(ab(x,x2),Math.abs(y-y2))}
function wuerfel(z){var v=z.zufall[1];v^=v<<13;v>>>=0;v^=v>>>17;v^=v<<5;v>>>=0;z.zufall[1]=v||1;return v}      // Strom „wirtschaft“ (kern.js), Stand liegt im Zustand
function neu(tick){return{tag0:tick,st:[],rev:[],reh:[],rnr:1,wa:[0,0,0,0,0,0,0],sperr:[],soll:SOLL.slice(),hin:0}}
function start(z){if(z.ket||!z.war)return;z.ket=neu(z.tick);var g=z.per;if(g)for(var i=0;i<g.p.length;i++){var c=g.p[i];c.em=z.tick+ESS_MAHL;c.ew=z.tick+ESS_WASSER;c.et=0;c.hu=0}z.war.bz=-1}

// ── Gelände lesen (Kartenstück des Weltgenerators, wie begehbar.js) ──
function stueck(z,X,Y){var w=z.wg;return w&&w.stuecke?w.stuecke.get((X>>6)*8192+(Y>>6))||null:null}
function hoehe(z,X,Y){if(Y>=WY)Y=WY-1;var p=stueck(z,X,Y);if(!p)return -1;var h=((p[(((Y&63)<<6)|(X&63))*2]|(p[(((Y&63)<<6)|(X&63))*2+1]<<8))-MEER)>>LS;return h<0?0:h}
function biom(z,X,Y){var p=stueck(z,X,Y);return p?p[FF*2+(((Y&63)<<6)|(X&63))]:-1}
// Naturobjekt auf dem Feld (natur.js: 0–5 Bäume) oder −1
function natur(z,X,Y){var p=stueck(z,X,Y);if(!p||Y<0||Y>=WY-1)return -1;var q=((Y&63)<<6)|(X&63),h0=hoehe(z,X,Y),mn=h0,mx=h0;
 for(var k=1;k<4;k++){var h=hoehe(z,umX(X+(k&1)),Y+(k>>1));if(h<0)return -1;if(h<mn)mn=h;if(h>mx)mx=h}
 return NAT().art(z.wg.seed>>>0,X,Y,p[FF*2+q],p[FF*3+q],mx-mn)}
function istBaum(z,X,Y){if(!BAU().baumFrei(z,X,Y)||BAU().stumpfAn(z,X,Y))return false;return NAT().baum(natur(z,X,Y))}   // N2d: Bäume laut natur.js (auch Palmen, Akazie, Olive …)
function istWasser(z,X,Y){var b=biom(z,X,Y);return b===10||b===11}
// Freies, begehbares Feld neben X,Y (das der Person nächste) oder null
function standFeld(z,X,Y,px,py){var best=null,bd=0;for(var s=0;s<4;s++){var x=umX(X+DX[s]),y=Y+DY[s];if(y<0||y>=WY||!P().gangbar(z,x,y))continue;var d=weit(x,y,px,py);if(!best||d<bd){best=[x,y];bd=d}}return best}
function gesperrt(k,X,Y,tick){for(var i=0;i<k.sperr.length;i++)if(k.sperr[i][0]===X&&k.sperr[i][1]===Y&&k.sperr[i][2]>tick)return true;return false}
function vergeben(z,X,Y,auf){var g=z.per;for(var i=0;i<g.p.length;i++)if(g.p[i].auf===auf&&g.p[i].kx===X&&g.p[i].ky===Y)return true;return false}
// Ringe um einen Punkt, innen zuerst: erstes Feld, das passt und einen Standplatz hat. Gibt [Feld x, y, Stand x, y] oder null.
function ringSuche(z,cx,cy,R,passt){for(var r=1;r<=R;r++)for(var i=-r;i<=r;i++)for(var s=0;s<4;s++){if((s>=2)&&(i===-r||i===r))continue;
   var X=umX(cx+(s===0?i:s===1?i:s===2?-r:r)),Y=cy+(s===0?-r:s===1?r:i);if(Y<0||Y>=WY||!passt(X,Y))continue;var f=standFeld(z,X,Y,cx,cy);if(f)return[X,Y,f[0],f[1]]}
 return null}
function lager(z){var L=[],Wn=W();z.war.inv.forEach(function(i){if(i.t===Wn.T_LAGER&&L.length<16&&Wn.lagerOk(z,i))L.push(i)});return L}

// ── Bestände für die Automatik: alles, was es gibt (Lager, Stapel, Arbeitsstätten, unterwegs), ohne Material auf Baustellen. Einmal je Tick gerechnet. ──
function lage(z){var k=z.ket;if(k._t===z.tick)return k._tot;var Wn=W(),T=[0,0,0,0,0,0];z.war.inv.forEach(function(i){if(i.t===Wn.T_BAU)return;for(var w=0;w<Wn.NW;w++)T[w]+=i.p[w]});k._t=z.tick;k._tot=T;return T}
function fehlt(z,w,unterwegs){return lage(z)[w]+(unterwegs||0)<z.ket.soll[w]}
function zaehle(z,auf){var g=z.per,n=0;for(var i=0;i<g.p.length;i++)if(g.p[i].auf===auf)n++;return n}
function inWerk(z,auf,id){var g=z.per;for(var i=0;i<g.p.length;i++)if(g.p[i].auf===auf&&g.p[i].kr===id)return g.p[i];return null}
function xp(c,akt){c['n'+akt]++;if(c['f'+akt]<100&&++c['e'+akt]>=c['f'+akt]+1){c['e'+akt]=0;c['f'+akt]++}}
function jaegerVon(k,rev){for(var i=0;i<k.reh.length;i++)if(k.reh[i].rev===rev&&k.reh[i].j)return true;return false}
function reh(k,id){for(var i=0;i<k.reh.length;i++)if(k.reh[i].id===id)return k.reh[i];return null}

// ── Je Tick: Rehe gleiten; einmal je Sekunde: Stümpfe, Jagdreviere, Bestellungen der Arbeitsstätten, Hunger ──
function wild(z,X,Y){var b=biom(z,X,Y);if(b!==4&&b!==5)return false;if(!P().gangbar(z,X,Y))return false;return !BAU().feld(z,X,Y)&&!BAU().weg(z,X,Y)}
function rehe(z,k){for(var i=0;i<k.reh.length;i++){var d=k.reh[i];
  if(d.nx>=0){if(++d.sub>=REH_FELD){d.x=d.nx;d.y=d.ny;d.nx=-1;d.ny=-1;d.sub=0;d.t=z.tick+REH_PAUSE+wuerfel(z)%60}continue}
  if(d.halt||z.tick<d.t)continue;var r=wuerfel(z)%6;if(r>3){d.t=z.tick+REH_PAUSE;continue}
  var X=umX(d.x+DX[r]),Y=d.y+DY[r];if(Y<0||Y>=WY||weit(X,Y,d.hx,d.hy)>JAGD_R||!wild(z,X,Y)){d.t=z.tick+REH_PAUSE;continue}
  d.nx=X;d.ny=Y;d.sub=0;d.dir=DX[r]>0?0:DX[r]<0?3:DY[r]>0?1:2}}
function reviere(z,k){var Wn=W(),g=z.war,da=new Set(),i,q;
 g.inv.forEach(function(v){if(v.t!==Wn.T_WERK||Wn.werkArt(z,v.id)!==5)return;da.add(v.id);for(q=0;q<k.rev.length;q++)if(k.rev[q].id===v.id){k.rev[q].x=v.x;k.rev[q].y=v.y;return}if(k.rev.length<64)k.rev.push({id:v.id,x:v.x,y:v.y,t:z.tick+REH_ERST})});
 for(i=k.rev.length-1;i>=0;i--)if(!da.has(k.rev[i].id)){var weg=k.rev[i].id;k.rev.splice(i,1);k.reh=k.reh.filter(function(d){return d.rev!==weg})}      // Hütte weg: ihr Wild zieht fort
 for(i=0;i<k.rev.length;i++){var r=k.rev[i],n=0;if(z.tick<r.t)continue;for(q=0;q<k.reh.length;q++)if(k.reh[q].rev===r.id)n++;
  if(n>=REH_MAX||k.reh.length>=MAX_REH){r.t=z.tick+WIEDER;continue}r.t=z.tick+WIEDER;
  for(q=0;q<8;q++){var X=umX(r.x+wuerfel(z)%(2*JAGD_R+1)-JAGD_R),Y=r.y+wuerfel(z)%(2*JAGD_R+1)-JAGD_R;if(Y<0||Y>=WY||!wild(z,X,Y))continue;
   k.reh.push({id:k.rnr++,x:X,y:Y,nx:-1,ny:-1,sub:0,dir:wuerfel(z)&3,rev:r.id,hx:r.x,hy:r.y,j:0,halt:0,t:z.tick+REH_PAUSE});r.t=z.tick+TAG;break}}
 for(i=0;i<k.reh.length;i++){var d=k.reh[i];if(!d.j)continue;var c=P().finde(z.per,d.j);if(!c||c.auf!==A_JAGEN||c.kr!==d.id){d.j=0;d.halt=0}}}
function stuempfe(z,k){while(k.st.length&&z.tick-k.st[0][2]>=WACHS){var s=k.st.shift();BAU().stumpf(z,s[0],s[1],0)}}      // nachgewachsen (auf bebautem oder gerodetem Feld bleibt der Baum unsichtbar weg)
function offeneVon(g,t,id,w){var n=0;for(var i=0;i<g.auf.length;i++){var o=g.auf[i];if(o.vt===t&&o.vi===id&&o.w===w)n++}return n}
function bestellen(z,k){var Wn=W(),g=z.war,L=[];g.inv.forEach(function(i){if(i.t===Wn.T_WERK)L.push(i)});if(!L.length)return;
 function hin(i,w){var want=PUFFER-(i.p[w]+i.e[w]);if(want<=0||Wn.frei(z,i)<=0)return;
  var v=Wn.naechstes(z,i.x,i.y,function(q){return(q.t===Wn.T_LAGER||q.t===Wn.T_STAPEL)&&Wn.verf(q,w)>0});if(v)Wn.anlegen(z,v,i,w,Math.min(want,Wn.TRAG,Wn.verf(v,w),Wn.frei(z,i)),Wn.ART_KETTE,0)}
 function weg(i,w,auf){var m=Wn.verf(i,w);if(m<=0||(m<Wn.TRAG&&inWerk(z,auf,i.id))||offeneVon(g,i.t,i.id,w)>=2)return;
  var n=Wn.naechstes(z,i.x,i.y,function(q){return q.t===Wn.T_LAGER&&Wn.frei(z,q)>0&&Wn.lagerOk(z,q)});if(!n){k.hin|=H_VOLL;return}Wn.anlegen(z,i,n,w,Math.min(m,Wn.TRAG,Wn.frei(z,n)),Wn.ART_KETTE,0)}
 for(var j=0;j<L.length;j++){var i=L[j],art=Wn.werkArt(z,i.id);
  if(art===2){if(fehlt(z,Wn.BRETT))hin(i,Wn.STAMM);weg(i,Wn.BRETT,A_SAEGEN)}
  else if(art===4){if(fehlt(z,Wn.MAHL)){hin(i,Wn.FLEISCH);hin(i,Wn.WASSER)}weg(i,Wn.MAHL,A_KOCHEN)}}}
function hunger(z,k){var g=z.per,n=0;if(!g)return;for(var i=0;i<g.p.length;i++){var c=g.p[i];c.hu=(z.tick>c.em+GNADE?1:0)|(z.tick>c.ew+GNADE?2:0);if(c.hu)n++}if(n)k.hin|=H_HUNGER}
function schritt(z){var k=z.ket;if(!k||!z.war||!z.per)return;if(k.reh.length)rehe(z,k);
 if(z.tick%TAKT!==PHASE)return;k.hin=0;
 for(var i=k.sperr.length-1;i>=0;i--)if(k.sperr[i][2]<=z.tick)k.sperr.splice(i,1);
 stuempfe(z,k);reviere(z,k);bestellen(z,k);hunger(z,k)}

// ── Zuteilung (aus personen.js zuteilen): erst Essen und Trinken, zum Schluss die Arbeit der Ketten. F = freie Personen (vergeben = null). ──
function durstig(z,c){return z.tick>=c.ew}
function hungrig(z,c){return z.tick>=c.em}
function essen(z,g,F){var Wn=W();for(var j=0;j<F.length;j++){var c=F[j];if(!c||z.tick<c.et||(!hungrig(z,c)&&!durstig(z,c)))continue;var hm=hungrig(z,c),hw=durstig(z,c);
  var v=Wn.naechstes(z,c.x,c.y,function(i){return i.t===Wn.T_LAGER&&((hm&&Wn.verf(i,Wn.MAHL)>0)||(hw&&Wn.verf(i,Wn.WASSER)>0))&&Wn.lagerOk(z,i)});
  if(!v){c.et=z.tick+WIEDER;continue}F[j]=null;c.auf=A_ESSEN;c.kr=v.id;P().geh(z,c,v.x,v.y)}}
function mahlzeit(z,c){var Wn=W(),i=Wn.hole(z.war,Wn.T_LAGER,c.kr);if(!i){c.et=z.tick+WIEDER;return}
 if(z.tick>=c.em-GNADE&&Wn.verbrauchen(z,i,Wn.MAHL,1))c.em=(z.tick<c.em?c.em:z.tick)+ESS_MAHL;      // früher essen verschiebt die nächste Mahlzeit nicht nach vorn
 if(z.tick>=c.ew-GNADE&&Wn.verbrauchen(z,i,Wn.WASSER,1))c.ew=(z.tick<c.ew?c.ew:z.tick)+ESS_WASSER;
 if(hungrig(z,c)||durstig(z,c))c.et=z.tick+WIEDER;c.hu=(z.tick>c.em+GNADE?1:0)|(z.tick>c.ew+GNADE?2:0)}
// beste(x,y,bit,fk) → Index der besten freien Person in F oder −1 (aus personen.js). Gibt die Zahl der neu vergebenen Aufgaben zurück.
function arbeit(z,g,F,beste,frei){var k=z.ket,Wn=W(),war=z.war,n=0,L=null,j,q,c,i;if(z.tick%TAKT!==PHASE||frei<=0)return 0;
 function nimm(x,y,akt,auf){var b=beste(x,y,1<<akt,'f'+akt);if(b<0)return null;var p=F[b];F[b]=null;p.auf=auf;n++;return p}
 function werke(art){var R=[];war.inv.forEach(function(v){if(v.t===Wn.T_WERK&&Wn.werkArt(z,v.id)===art)R.push(v)});return R}
 // Wasser: schöpfen und selbst ins Lager tragen
 if(n<frei&&k.wa[T_WASSER]<=z.tick&&fehlt(z,Wn.WASSER,zaehle(z,A_WASSER)*WASSER_M)&&zaehle(z,A_WASSER)<1){L=L||lager(z);var f=null;
  for(j=0;j<L.length&&!f;j++)f=ringSuche(z,L[j].x,L[j].y,WASSER_R,function(X,Y){return istWasser(z,X,Y)&&!gesperrt(k,X,Y,z.tick)});
  if(!f){k.wa[T_WASSER]=z.tick+WIEDER;if(L.length)k.hin|=H_WASSER}else if((c=nimm(f[2],f[3],T_WASSER,A_WASSER))){c.kx=f[0];c.ky=f[1];P().geh(z,c,f[2],f[3])}}
 if(k.wa[T_WASSER]>z.tick&&fehlt(z,Wn.WASSER))k.hin|=H_WASSER;
 // Kochen: je Küche eine Person, wenn Zutaten da sind
 if(n<frei&&fehlt(z,Wn.MAHL)){var KU=werke(4);if(!KU.length)k.hin|=H_KUECHE;
  for(j=0;j<KU.length&&n<frei;j++){i=KU[j];if(i.p[Wn.FLEISCH]<1||i.p[Wn.WASSER]<1||inWerk(z,A_KOCHEN,i.id))continue;if((c=nimm(i.x,i.y,T_KOCHEN,A_KOCHEN))){c.kr=i.id;P().geh(z,c,i.x,i.y)}}}
 // Jagen: je Jägerhütte eine Person, zum nächsten freien Reh des Reviers
 if(n<frei&&k.wa[T_JAGEN]<=z.tick&&fehlt(z,Wn.FLEISCH,zaehle(z,A_JAGEN)*JAGD_M)){var HU=werke(5),da=false;if(!HU.length)k.hin|=H_HUETTE;
  for(j=0;j<HU.length&&n<frei;j++){i=HU[j];if(jaegerVon(k,i.id)){da=true;continue}var best=null,bd=0;
   for(q=0;q<k.reh.length;q++){var d=k.reh[q];if(d.rev!==i.id||d.j)continue;var e=weit(d.x,d.y,i.x,i.y);if(!best||e<bd){best=d;bd=e}}
   if(!best)continue;da=true;if((c=nimm(best.x,best.y,T_JAGEN,A_JAGEN))){c.kr=best.id;best.j=c.id;P().geh(z,c,best.x,best.y)}}
  if(HU.length&&!da&&!zaehle(z,A_JAGEN)){k.hin|=H_WILD;k.wa[T_JAGEN]=z.tick+WIEDER}}
 // Sägen: je Sägewerkstatt eine Person, wenn ein Stamm da ist
 if(n<frei&&fehlt(z,Wn.BRETT)){var SA=werke(2);if(!SA.length)k.hin|=H_SAEGE;
  for(j=0;j<SA.length&&n<frei;j++){i=SA[j];if(i.p[Wn.STAMM]<1||inWerk(z,A_SAEGEN,i.id))continue;if((c=nimm(i.x,i.y,T_SAEGEN,A_SAEGEN))){c.kr=i.id;P().geh(z,c,i.x,i.y)}}}
 // Fällen: nächster Baum ums Lager
 if(n<frei&&k.wa[T_FAELLEN]<=z.tick&&fehlt(z,Wn.STAMM,zaehle(z,A_FAELLEN)*FAELL_M)&&zaehle(z,A_FAELLEN)<FAELL_MAX){L=L||lager(z);var t=null;
  for(j=0;j<L.length&&!t;j++)t=ringSuche(z,L[j].x,L[j].y,FAELL_R,function(X,Y){return istBaum(z,X,Y)&&!gesperrt(k,X,Y,z.tick)&&!vergeben(z,X,Y,A_FAELLEN)});
  if(!t){k.wa[T_FAELLEN]=z.tick+WIEDER;if(L.length)k.hin|=H_BAUM}else if((c=nimm(t[2],t[3],T_FAELLEN,A_FAELLEN))){c.kx=t[0];c.ky=t[1];P().geh(z,c,t[2],t[3])}}
 if(k.wa[T_FAELLEN]>z.tick&&fehlt(z,Wn.STAMM))k.hin|=H_BAUM;
 return n}

// ── Ankunft am Arbeitsort, Arbeit je Tick, Fehlschlag (aus personen.js) ──
function ankunft(z,c){var k=z.ket,Wn=W(),Pn=P(),g=z.per;
 if(c.auf===A_ESSEN){mahlzeit(z,c);Pn.los(g,c);return}
 if(c.auf===A_FAELLEN){if(!istBaum(z,c.kx,c.ky)){Pn.los(g,c);return}c.zust=Pn.Z_ARBEITET;c.kt=FAELL_T*200;return}
 if(c.auf===A_WASSER){if(!istWasser(z,c.kx,c.ky)){Pn.los(g,c);return}c.zust=Pn.Z_ARBEITET;c.kt=WASSER_T*200;return}
 if(c.auf===A_SAEGEN||c.auf===A_KOCHEN){if(!Wn.hole(z.war,Wn.T_WERK,c.kr)){Pn.los(g,c);return}c.zust=Pn.Z_ARBEITET;c.kt=0;c.leer=0;return}
 if(c.auf===A_JAGEN){var d=reh(k,c.kr);if(!d||d.j!==c.id){Pn.los(g,c);return}
  var x=d.nx>=0?d.nx:d.x,y=d.nx>=0?d.ny:d.y;
  if(weit(c.x,c.y,x,y)<=REH_NAH){d.halt=1;c.zust=Pn.Z_ARBEITET;c.kt=JAGD_T*200;return}      // nah genug: das Reh hält still (es ahnt nichts), anpirschen und erlegen
  if(++c.leer>JAGD_VERSUCH){d.j=0;Pn.los(g,c);return}Pn.geh(z,c,x,y);return}      // das Reh ist weitergezogen: hinterher
 Pn.los(g,c)}
function werk(z,c){var k=z.ket,Wn=W(),Pn=P(),g=z.per,i,d;if(c.hu&&(z.tick&1))return;if(Pn.langsam(z,c))return;/* G9d3: Verletzte arbeiten langsamer */var tempo=200+c['f'+(c.auf-3)];
 if(c.auf===A_SAEGEN||c.auf===A_KOCHEN){i=Wn.hole(z.war,Wn.T_WERK,c.kr);var art=c.auf===A_SAEGEN?2:4;if(!i||Wn.werkArt(z,i.id)!==art){Pn.los(g,c);return}
  var aus=art===2?Wn.BRETT:Wn.MAHL,m=art===2?SAEG_M:KOCH_M;
  if(c.kt>0){c.kt-=tempo;if(c.kt<=0){c.kt=0;Wn.erzeugen(z,i,aus,m);xp(c,c.auf-3)}return}
  if(z.tick>=c.em||z.tick>=c.ew){if(z.tick>=c.et){Pn.los(g,c);return}}                                 // erst essen
  var kann=art===2?Wn.verf(i,Wn.STAMM)>=1:(Wn.verf(i,Wn.FLEISCH)>=1&&Wn.verf(i,Wn.WASSER)>=1);
  if(kann&&fehlt(z,aus)&&Wn.kap(z,i)-Wn.summe(i.p)>=m){if(art===2)Wn.verbrauchen(z,i,Wn.STAMM,1);else{Wn.verbrauchen(z,i,Wn.FLEISCH,1);Wn.verbrauchen(z,i,Wn.WASSER,1)}
   c.kt=(art===2?SAEG_T:KOCH_T)*200;c.leer=0;return}
  if(++c.leer>LEERLAUF)Pn.los(g,c);return}
 c.kt-=tempo;if(c.kt>0)return;c.kt=0;
 if(c.auf===A_FAELLEN){if(istBaum(z,c.kx,c.ky)&&BAU().stumpf(z,c.kx,c.ky,1)){if(k.st.length>=MAX_STUMPF){var s0=k.st.shift();BAU().stumpf(z,s0[0],s0[1],0)}k.st.push([c.kx,c.ky,z.tick]);Wn.stapelNeu(z,c.x,c.y,Wn.STAMM,FAELL_M);xp(c,T_FAELLEN)}Pn.los(g,c);return}
 if(c.auf===A_WASSER){Wn.erzeugen(z,Wn.mach(z.war,Wn.T_PERSON,c.id,c.x,c.y),Wn.WASSER,WASSER_M);xp(c,T_WASSER);Pn.zurueck(z,c);return}
 if(c.auf===A_JAGEN){d=reh(k,c.kr);if(d&&d.j===c.id){k.reh.splice(k.reh.indexOf(d),1);Wn.stapelNeu(z,d.x,d.y,Wn.FLEISCH,JAGD_M);xp(c,T_JAGEN)}Pn.los(g,c);return}
 Pn.los(g,c)}
// Kein Weg zum Arbeitsort: Ziel eine Weile meiden (Baum, Wasserstelle), Reh freigeben
function gescheitert(z,c){var k=z.ket;if(c.auf===A_FAELLEN||c.auf===A_WASSER){if(k.sperr.length>=MAX_SPERR)k.sperr.shift();k.sperr.push([c.kx,c.ky,z.tick+TAG])}
 else if(c.auf===A_JAGEN){var d=reh(k,c.kr);if(d&&d.j===c.id){d.j=0;d.halt=0}}else if(c.auf===A_ESSEN)c.et=z.tick+WIEDER}
// Soll ein Bauarbeiter die Baustelle verlassen, um zu essen? (nur wenn es irgendwo etwas gibt)
function essPause(z,c){return(z.tick>=c.em||z.tick>=c.ew)&&z.tick>=c.et}

// ── Fingerabdruck, Nachrichten an den Hauptkern, Spielstand ──
var RF=['id','x','y','nx','ny','sub','dir','rev','hx','hy','j','halt','t'];
function abdruck(k,f){var i,j;f(k.tag0);f(k.rnr);for(i=0;i<7;i++)f(k.wa[i]);for(i=0;i<6;i++)f(k.soll[i]);
 f(k.st.length);for(i=0;i<k.st.length;i++){f(k.st[i][0]);f(k.st[i][1]);f(k.st[i][2])}
 f(k.sperr.length);for(i=0;i<k.sperr.length;i++){f(k.sperr[i][0]);f(k.sperr[i][1]);f(k.sperr[i][2])}
 f(k.rev.length);for(i=0;i<k.rev.length;i++){f(k.rev[i].id);f(k.rev[i].x);f(k.rev[i].y);f(k.rev[i].t)}
 f(k.reh.length);for(i=0;i<k.reh.length;i++)for(j=0;j<RF.length;j++)f(k.reh[i][RF[j]])}
// Für die Liste „Goods“ und die Karte des Arbeiters (nur bei Änderung der Waren, höchstens 4× je Sekunde)
function meld(z){var k=z.ket,Wn=W(),g=z.per,WK=[],PE=[];
 z.war.inv.forEach(function(i){if(i.t===Wn.T_WERK&&WK.length<32)WK.push([i.id,Wn.werkArt(z,i.id),i.x,i.y].concat(i.p))});
 if(g)for(var i=0;i<g.p.length&&i<64;i++){var c=g.p[i];PE.push([c.id,c.n0,c.n1,c.n2,c.n3,c.n4,c.n5,c.n6])}
 return{tag:Math.floor((z.tick-k.tag0)/TAG)+1,soll:k.soll.slice(),hin:k.hin,rehe:k.reh.length,stuempfe:k.st.length,werk:WK,pers:PE}}
// Rehe für die Karte: je Reh 5 Zahlen (Nummer, Lage x und y in 1/256 Feld, Richtung, Zustand 0 steht, 1 geht, 2 hält still)
var MELD=5;
function tiere(z){var k=z.ket,n=k.reh.length,a=new Int32Array(1+n*MELD);a[0]=n;
 for(var i=0;i<n;i++){var d=k.reh[i],o=1+i*MELD,px=d.x*256+128,py=d.y*256+128;
  if(d.nx>=0){var f=Math.floor(d.sub*256/REH_FELD),dx=d.nx-d.x;if(dx>1)dx-=WX;else if(dx<-1)dx+=WX;px+=dx*f;py+=(d.ny-d.y)*f;if(px<0)px+=WX*256;else if(px>=WX*256)px-=WX*256}
  a[o]=d.id;a[o+1]=px;a[o+2]=py;a[o+3]=d.dir;a[o+4]=d.halt?2:d.nx>=0?1:0}
 return a}
function stand(k){return{format:STAND,tag0:k.tag0,rnr:k.rnr,wa:k.wa.slice(),soll:k.soll.slice(),st:k.st.map(function(s){return s.slice()}),sperr:k.sperr.map(function(s){return s.slice()}),
 rev:k.rev.map(function(r){return[r.id,r.x,r.y,r.t]}),reh:k.reh.map(function(d){return RF.map(function(f){return d[f]})})}}
function G(v,min,max){return typeof v==='number'&&v===Math.floor(v)&&v>=min&&v<=max}
function drei(L,max){if(!Array.isArray(L)||L.length>max)return false;for(var i=0;i<L.length;i++){var s=L[i];if(!Array.isArray(s)||s.length!==3||!G(s[0],0,WX-1)||!G(s[1],0,WY-1)||!G(s[2],0,M31))return false}return true}
// Prüft streng; null = Stand ungültig.
function ausStand(d){var i,j;
 if(!d||d.format!==STAND||!G(d.tag0,0,M31)||!G(d.rnr,1,M31)||!Array.isArray(d.wa)||d.wa.length!==7||!Array.isArray(d.soll)||d.soll.length!==6||!drei(d.st,MAX_STUMPF)||!drei(d.sperr,MAX_SPERR)||
  !Array.isArray(d.rev)||d.rev.length>64||!Array.isArray(d.reh)||d.reh.length>MAX_REH)return null;
 var k=neu(d.tag0);k.rnr=d.rnr;for(i=0;i<7;i++){if(!G(d.wa[i],0,M31))return null;k.wa[i]=d.wa[i]}for(i=0;i<6;i++){if(!G(d.soll[i],0,100000))return null;k.soll[i]=d.soll[i]}
 k.st=d.st.map(function(s){return s.slice()});k.sperr=d.sperr.map(function(s){return s.slice()});
 for(i=0;i<d.rev.length;i++){var r=d.rev[i];if(!Array.isArray(r)||r.length!==4||!G(r[0],1,4294967295)||!G(r[1],0,WX-1)||!G(r[2],0,WY-1)||!G(r[3],0,M31))return null;k.rev.push({id:r[0],x:r[1],y:r[2],t:r[3]})}
 var GR={id:[1,d.rnr-1],x:[0,WX-1],y:[0,WY-1],nx:[-1,WX-1],ny:[-1,WY-1],sub:[0,REH_FELD],dir:[0,3],rev:[1,4294967295],hx:[0,WX-1],hy:[0,WY-1],j:[0,M31],halt:[0,1],t:[0,M31]};
 for(i=0;i<d.reh.length;i++){var a=d.reh[i],o={};if(!Array.isArray(a)||a.length!==RF.length)return null;for(j=0;j<RF.length;j++){var gr=GR[RF[j]];if(!G(a[j],gr[0],gr[1]))return null;o[RF[j]]=a[j]}
  if(i&&o.id<=k.reh[i-1].id)return null;k.reh.push(o)}
 return k}

var K={TAG:TAG,SOLL:SOLL,AKT:AKT,FAELL_R:FAELL_R,FAELL_T:FAELL_T,FAELL_M:FAELL_M,WACHS:WACHS,SAEG_T:SAEG_T,SAEG_M:SAEG_M,KOCH_T:KOCH_T,KOCH_M:KOCH_M,WASSER_R:WASSER_R,WASSER_T:WASSER_T,WASSER_M:WASSER_M,
 JAGD_R:JAGD_R,JAGD_T:JAGD_T,JAGD_M:JAGD_M,REH_MAX:REH_MAX,ESS_MAHL:ESS_MAHL,ESS_WASSER:ESS_WASSER,GNADE:GNADE,TAKT:TAKT,MELD:MELD,
 A_FAELLEN:A_FAELLEN,A_SAEGEN:A_SAEGEN,A_KOCHEN:A_KOCHEN,A_JAGEN:A_JAGEN,A_WASSER:A_WASSER,A_ESSEN:A_ESSEN,
 start:start,schritt:schritt,essen:essen,arbeit:arbeit,ankunft:ankunft,werk:werk,gescheitert:gescheitert,essPause:essPause,abdruck:abdruck,meld:meld,tiere:tiere,stand:stand,ausStand:ausStand,
 istBaum:istBaum,istWasser:istWasser,lage:lage};
if(typeof module!=='undefined'&&module.exports)module.exports=K;else root.AT3KETTEN=K;
})(typeof self!=='undefined'?self:this);

