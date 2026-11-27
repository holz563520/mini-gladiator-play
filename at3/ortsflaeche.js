// WAS DIE DATEI TUT: Ortsflächen in der Kartenansicht von Arena Theory 3.0 (Schritt N7a2a, Thomas 24.11.2026). Läuft im Bildkern: merkt sich die Pläne der Orte
// im Fenster (vom Ortskern), ebnet das Gelände darunter auf die Höhe des Ortspunkts ein (Rand mit Hängen ins Gelände, höchstens eine Stufe je Feld), hält die
// Natur von der Fläche fern und liefert dem Bodenbild das Ersatzbild (Regel 20): Boden je Planfeld in einer Farbe (Gasse, Platz, Feld, Wasser …) und jedes
// Gebäude als Klotz (Wand und Dach), bis N7a2b die echten Stadtbilder bringt.
// Entscheidungen Thomas 24.11.2026: Mauerring bzw. Ortsfläche = ganzes Planquadrat (W × W Weltfelder, Mitte = Ortspunkt); Einebnen erst nur für die Ansicht
// (Karte und First Person; Wegsuche folgt mit N7a4); **Park gewinnt**: ein Kartenstück, in dem der Spieler gebaut hat, gehört nicht zur Ortsfläche und wird
// nicht eingeebnet; die Startplatz-Wahl hält Abstand von allen Orten (imOrt, nach der größten möglichen Bildbreite aussenposten.halb, ohne Plan).
// Kosten (Regel 14): nur Orte, deren Fläche das Fenster des Bildkerns berührt (höchstens HALTEN), je Bodenbild nur die Orte, die es schneiden; nichts hängt an
// der Weltgröße. Wiederverwendet: Plan und Lage aus ortsbild.js/stadtbild.js, Höhenstufe und Bildraster aus bodenbild.js, Klötze wie das Ersatzbild des
// Kachelbauers (stadtbild.js umrisse, Editor-Fenster N6b2-0), Halbbreite der Orte aus aussenposten.js.
// N7a2b1: echte Böden in 1× (bilder(stadtbild, karteilader) einschalten): je Planfeld Boden und Säume wie im Stadtbild (elemente().boden), fehlt ein Kartei-Bild,
// bleibt die Ersatzfarbe und der Ort wartet (wartende() → Kartenstücke neu). Gebäude bleiben Klötze bis N7a2b2.
// N7a2b2 (Thomas 24.11.2026): in 1× kommen Häuser, Mauerteile, Türme, Burgberg und Dinge aus der Elementliste des Stadtbilds (stadtbild.js elemente, wie im
// Kachelbauer) einzeln mit Tiefe ins Bodenbild (Fach nach dem vordersten Feld, Reihenfolge der Stadt bleibt: Tiefe = laufendes Maximum der vordersten Felder).
// Die Liste wird in Zeitanteilen gefüllt (schritt), höchstens LISTEN Orte halten sie (Entscheidung Thomas: 4). Gebäudebilder (bauBild) entstehen in Zeitanteilen,
// höchstens HAUS Bytes gemerkt (2 MB), bis dahin steht der Klotz (Regel 20). Fertiges sammelt fertige() → Bildkern meldet gebündelt (Thomas: etwa alle 0,3 s).
// N7a2c (Thomas 24.11.2026): Außenposten und Gehöfte auf demselben Weg wie kleine Orte (Fläche, Einebnen, Ersatzbild, echte Bilder in 1×), Hang nur RAMPE_P
// Felder; eigene Grenzen (höchstens HALTEN_P Posten gemerkt, LISTEN_P mit Elementliste), damit viele kleine Posten die Städte nicht verdrängen. Die Postenlisten
// kommen je Ort vom Ortskern (Anfrage „posten“), werden je Ort gemerkt (höchstens PL_HALTEN Orte) und nur die Posten, die das Fenster berühren, aufgenommen.
// Startplatz meidet auch Posten (imPosten; die Postenpunkte rechnet der Bildkern selbst). Feldsuche (bei/frei) über ein Verzeichnis der Kartenstücke statt über alle Orte.
// N7a3a (Thomas 24.11.2026): Stufe ½ mit echten verkleinerten Böden, Häusern, Mauern und Dingen statt der Klötze. Jedes Bild wird einmal verkleinert (halb: je
// 2 × 2 Bildpunkte die häufigste Farbe, nur Palettenfarben, durchsichtig nur bei Mehrheit durchsichtig) und gemerkt, höchstens HALB_GR Bytes (1 MB, getrennt von
// den 2 MB 1×-Gebäudebildern und 4 MB Kartei), älteste fallen heraus. Gebäude: aus dem 1×-Bild verkleinert in Zeitanteilen (schritt), fehlt es, wird es zuerst
// gebaut; bis dahin der Klotz (Regel 20). Notausschalter opt.halb:false (?n7a3=0) = Klötze in ½ wie N7a2.
// N7a3b (Thomas 24.11.2026): Stufen ¼ und ⅛ genauso, Kette ¼ aus ½, ⅛ aus ¼ (häufigste Farbe). ¼ und ⅛ zusammen höchstens VIERTEL_GR Bytes (seit N7a5a3d 6 MB, vorher 0,5 MB), beide gemerkt;
// fehlt die nächstgrößere Fassung, wird das Gebäude einmal in 1× in Abschnitten gebaut und in Zeitanteilen bis zur Zielstufe verkleinert, 1× und ½ bleiben dabei nur,
// wenn diese Stufen sie selbst brauchen. Bis dahin der Klotz. Notausschalter opt.viertel:false (?n7a3b=0) = in ¼ und ⅛ nur Ersatzfarbe wie N7a3a.
(function(root){
'use strict';
var RMAX=128, RAMPE=24, HALTEN=12, ST=64, LISTEN=4, HAUS=2097152, HALB_GR=1048576, VIERTEL_GR=6291456, VIERTEL_GR_ALT=524288;   // N7a5a3d (Thomas 25.11.2026): ¼ + ⅛ zusammen 6 MB statt 0,5 MB, damit die größte Hauptstadt (~4,1 MB) ganz gemerkt bleibt; Notausschalter ?n7a5a3d=0 (bildkern.js) = 0,5 MB wie vorher
var RWX=64*9600, RAMPE_P=8, HALTEN_P=64, LISTEN_P=16, PL_HALTEN=48, PWEIT=2600;   // N7a2c: Hang, Posten gemerkt, Posten mit Liste, Orte mit Postenliste, größter Abstand Ortspunkt → Postenrand (gemessen 2.268 + 18 + Hang)   // N7a2b2: LISTEN Orte mit ganzer Elementliste, HAUS Bytes gemerkte Gebäudebilder
//  RAMPE: Felder Hang rund um die Fläche (eine Höhenstufe = 64 Einheiten je Feld, wie RollerCoaster Tycoon); HALTEN: Orte im Speicher
var CODES='gsomfwepxqyuh', FARBE_RGB=[[104,138,64],[150,128,96],[156,150,138],[216,210,198],[186,160,84],[56,98,150],[112,86,58],[124,154,78],[122,116,108],[140,134,122],[128,92,58],[214,194,146],[146,118,84]];
// N7a5d (26.11.2026): natürlicher Rand der eingeebneten Fläche. Statt des quadratischen Rings (Abstand = größere Achse, Hang 1 Stufe je Feld ab der Planfläche)
// zählt der echte Abstand zur Planfläche (abgerundete Ecken), davon geht ein gewellter Saum ab, der noch flach bleibt (R/8 … R/4 Felder, aus dem Ortspunkt,
// Stützwerte alle 16 Felder rund um die Fläche, weich verbunden), danach Hang höchstens 1 Stufe je Feld wie vorher, dem Gelände folgend (Klemmen an die Welt).
// Nur ganze Zahlen und Math.sqrt (überall gleich). Gleiche Rechnung in ortsflaeche.js und ortssperre.js (randE). Notausschalter ?n7a5d=0.
var N7A7=!(typeof self!=='undefined'&&self.location&&/[?&]n7a7=0/.test(self.location.search||''));   // N7a7: Notausschalter Hang wächst mit dem Gelände
var N7A5D=!(typeof self!=='undefined'&&self.location&&/[?&]n7a5d=0/.test(self.location.search||''));
function randHs(x,y,a){var h=Math.imul(x^0x5bd1e995,0x27d4eb2d)^Math.imul(y+0x165667b1,0x9e3779b1)^Math.imul(a+1,0x85ebca6b);h^=h>>>15;h=Math.imul(h,0xc2b2ae35);h^=h>>>13;return h&255}
function randE(x0,y0,i,j,R,W,S){if(S==null)S=R;var dx=i<R?R-i:i>=R+W?i-R-W+1:0,dy=j<R?R-j:j>=R+W?j-R-W+1:0;if(!N7A5D)return(dx>dy?dx:dy)*64;
 var W1=W-1,px=i-R,py=j-R;px=px<0?0:px>W1?W1:px;py=py<0?0:py>W1?W1:py;var t=py===0?px:px===W1?W1+py:py===W1?3*W1-px:4*W1-py,P=4*W1,n=P>>4;if(n<4)n=4;
 var u=Math.floor(t*n*256/P),a=(u>>8)%n,f=u&255,b=(a+1)%n;x0=((x0%RWX)+RWX)%RWX;var v=(randHs(x0,y0,a)*(256-f)+randHs(x0,y0,b)*f)>>8,w=S*8+((v*S*8)>>8),
 e=Math.floor(Math.sqrt(dx*dx+dy*dy)*64)-w;return e<0?0:e}
// N7a5e1 (26.11.2026): Boden nahtlos. Wiese (g) weit weg von Bebautem, Gärten und Flur (jede andere Zelle und jede Baufläche) zeigt den Boden der Welt
// (Farbe, Körnung, Bodenmuster wie draußen, kein Kartei-Wiesenbild). Ortsboden bleibt nur nahe den Häusern: Grenze 2–5 Felder, weich aus dem Weltfeld
// (Rauschen auf 6-Felder-Raster, Weltkoordinaten, also gleich über Nachbarorte) plus 0–1 je Feld (unregelmäßiges Auslaufen). Einmal je Ort, W² Byte.
// Notausschalter ?n7a5e=0.
var N7A5E=!(typeof self!=='undefined'&&self.location&&/[?&]n7a5e=0/.test(self.location.search||''));
function wbHs(x,y){var h=Math.imul(x,0x27d4eb2d)^Math.imul(y,0x165667b1)^0x5e1a;h^=h>>>15;h=Math.imul(h,0x85ebca6b);h^=h>>>13;return h>>>0}
function wbGrenze(X,Y){var gx=Math.floor(X/6),gy=Math.floor(Y/6),fx=X-gx*6,fy=Y-gy*6,a=wbHs(gx,gy)%3,b=wbHs(gx+1,gy)%3,c=wbHs(gx,gy+1)%3,d=wbHs(gx+1,gy+1)%3,
 v=((a*(6-fx)+b*fx)*(6-fy)+(c*(6-fx)+d*fx)*fy+18)/36|0;return 2+v+((wbHs(X+977,Y+331)>>>7)&1)}
function weltBoden(o){if(!N7A5E)return null;var W=o.W,Z=o.Z,N=W*W,D=new Uint8Array(N),Q=new Int32Array(N),qa=0,qe=0,k,i,j,z=0;D.fill(255);
 for(k=0;k<N;k++){var c=Z[k];if(c!==0&&c!==255){D[k]=0;Q[qe++]=k}}
 o.bauten.forEach(function(e){for(var y=e.j;y<e.j+e.h&&y<W;y++)for(var x=e.i;x<e.i+e.w&&x<W;x++){if(x<0||y<0)continue;var q=y*W+x;if(D[q]){D[q]=0;Q[qe++]=q}}});
 if(!qe)return null;
 while(qa<qe){k=Q[qa++];var dk=D[k];if(dk>=7)continue;i=k%W;j=(k-i)/W;for(var yy=j-1;yy<=j+1;yy++){if(yy<0||yy>=W)continue;for(var xx=i-1;xx<=i+1;xx++){if(xx<0||xx>=W)continue;var q2=yy*W+xx;if(D[q2]>dk+1){D[q2]=dk+1;Q[qe++]=q2}}}}
 var WB=new Uint8Array(N),X0=((o.x0%RWX)+RWX)%RWX;for(k=0;k<N;k++){if(Z[k]!==0)continue;i=k%W;j=(k-i)/W;if(D[k]>wbGrenze(X0+i,o.y0+j)){WB[k]=1;z++}}
 o.wbN=z;return z?WB:null}
function OSm(){return root.AT3ORTSSPERRE||(typeof module!=='undefined'&&module.exports?require('./ortssperre.js'):null)}
var NATD=new Map();function natD(id){var v=NATD.get(id);if(v===undefined){var O=OSm();v=!!(O&&O.naturDing(id));NATD.set(id,v)}return v}   // N7a5e2
var WELT_C={n:1,v:1,r:1,y:1};   // N7a5a2: Zellen, unter denen der Boden der Welt bleibt (nur in Plänen mit P.weltwasser)
var DACH_RGB=[150,66,48], WAND_RGB=[202,180,140], MAUER_RGB=[150,146,136];
function neu(G,BB){var WX=BB.WX,orte=new Map(),gefragt=new Set(),F=null,FB=null,sprite=new Map(),SBx=null,KL=null,EMS=[];
 var POSTEN=false,PL=new Map(),gefragtP=new Set(),LIP=[],IDX=new Map(),PST={listen:0,ms:0,maxMs:0};   // N7a2c
 var ECHT=true,HGR=HAUS,LI=[],HB=new Map(),HBB=0,AUF=[],AKT=null,ABSCHNITTE=true,INQ=new Set(),FERTIG=new Set(),GEB=new Set(),HST={wieder:0,gebaut:0,ms:0,maxMs:0,listen:0,listeMs:0,verworfen:0,pausen:0};   // N7a2b2   // N7a2b1: SBx = stadtbild.js, KL = Kartei-Lader (bilder())
 var HALBAN=true,K2=new Map(),K2B=0,K2GR=HALB_GR,AUF2=[],INQ2=new Set(),AKT2=null,GEB2=new Set(),HN=new Set(),H2ST={gebaut:0,ms:0,maxMs:0,verworfen:0,pausen:0};   // N7a3a: Stufe ½ (K2 = gemerkte halbe Bilder)
 var VIERAN=true,K4=[null,null,new Map(),new Map()],K4B=0,K4GR=VIERTEL_GR,AUF4=[],INQ4=new Set(),AKT4=null,GEB4=new Set(),SID=new WeakMap(),SIDN=0,LETZT=3,H4ST={gebaut:0,ms:0,maxMs:0,verworfen:0,pausen:0};   // N7a3b: Stufen ¼ und ⅛ (K4[2], K4[3], gemeinsamer Zähler K4B; Schlüssel 's' + Bildnummer bzw. 'h' + Gebäude)
 var jetzt=typeof performance!=='undefined'?function(){return performance.now()}:function(){return Date.now()};
 function um(x){x%=WX;return x<0?x+WX:x}
 function nah(p,c){var b=0,bd=1e9;for(var i=0;i<64;i++){var v=p[i],dr=(v&255)-c[0],dg=((v>>8)&255)-c[1],db=((v>>16)&255)-c[2],d=dr*dr*3+dg*dg*6+db*db;if(d<bd){bd=d;b=i}}return b}
 function farben(f){if(F===f&&FB)return FB;F=f;var o={boden:new Uint8Array(CODES.length),wasser:new Uint8Array(CODES.length)};
  for(var i=0;i<CODES.length;i++){o.boden[i]=nah(f.pal,FARBE_RGB[i]);o.wasser[i]=CODES.charAt(i)==='w'?1:0}
  o.dach=nah(f.pal,DACH_RGB);o.wand=nah(f.pal,WAND_RGB);o.wandD=f.du[o.wand];o.mauer=nah(f.pal,MAUER_RGB);o.mauerD=f.du[o.mauer];o.dachM=f.he[o.mauer];sprite.clear();return FB=o}
 // Lage eines Weltfelds im Ort (Planfeld i, j) oder −1
 function lok(o,X){var i=X-o.x0;if(i<0)i+=WX;else if(i>=WX)i-=WX;return i}
 function stk(X,Y){return(um(X)>>6)*8192+(Y>>6)}
 // Ort aufnehmen (Antwort des Ortskerns). bau(k) → true, wenn das Kartenstück k Gebautes des Spielers hat (Park gewinnt). Gibt die Kartenstücke, deren Bild sich ändert.
 function aufnehmen(m,bau){gefragt.delete(m.k);if(m.fehler||!m.P||!m.lage)return[];var L=m.lage,P=m.P,W=L.W,o={k:m.k,g:m.g,name:m.name,x0:L.x0,y0:L.y0,W:W,h0:m.h0,s0:BB.stufe(m.h0),
   Z:new Uint8Array(W*W),bauten:[],fach:new Map(),aus:new Set(),ms:m.ms,ersatz:m.ersatz,t:++zeit,P:P,E:null,wartet:false,posten:m.ort!=null,ort:m.ort,art:m.art,R:m.R||(m.ort!=null?RAMPE_P:RAMPE),RS:m.RS||(m.ort!=null?RAMPE_P:RAMPE),FS:!!m.FS},i,j;   // N7a7: Hangbreite aus dem Gelände (Ortskern), Saum nach der Grundbreite RS, FS = Felsstufe   // N7a2c: posten, Hang R   // N7a2b1: Plan für die echten Böden
  o.AN=m.an&&m.an.liste&&m.an.liste.length?m.an:null;   // N7a5b1: Anschluss der Weltstraßen im Hangring (ortsanschluss.js)
  o.ww=!!P.weltwasser;o.sk=P.senke||null;for(i=0;i<W*W;i++){var ch=P.zellen.charAt(i),c=CODES.indexOf(ch);o.Z[i]=o.ww&&WELT_C[ch]?255:c<0?0:c}   // N7a5a2: Weltwasser, Weltufer, Brücke, Steg → hier malt die Welt
  P.bauten.forEach(function(b){if(!(b.w>0&&b.h>0))return;var e={i:b.i,j:b.j,w:b.w,h:b.h,m:b.rolle==='mauer'},fi=b.i+b.w-1,fj=b.j+b.h-1,key=(fi>>3)*4096+(fj>>3);   // Fach nach dem vordersten Feld (8 × 8)
   o.bauten.push(e);var f=o.fach.get(key);if(!f)o.fach.set(key,f=[]);f.push(e)});
  o.WB=weltBoden(o);   // N7a5e1: Weltboden auf freier Wiese
  var OSx=OSm();o.WN=OSx&&o.WB&&OSx.weltNatur?OSx.weltNatur(P,o.WB):null;   // N7a5e2: dort wächst die Natur der Welt, die Plan-Natur fällt weg
  var R=o.R,X0=o.x0-R,Y0=o.y0-R,N=W+2*R;
  for(var cy=Math.max(0,Y0>>6);cy<=Math.min(BB.SY-1,(Y0+N-1)>>6);cy++)for(var cx=X0>>6;cx<=(X0+N-1)>>6;cx++){var k=((cx%BB.SX+BB.SX)%BB.SX)*8192+cy;if(bau(k))o.aus.add(k)}
  if(orte.has(m.k))raus(orte.get(m.k));orte.set(m.k,o);rein(o);halten();return stuecke(o)}
 // N7a2c: Verzeichnis Kartenstück → Orte/Posten, deren Fläche (ohne Hang) es berührt (für bei/frei)
 function rein(o){for(var cy=Math.max(0,o.y0>>6);cy<=Math.min(BB.SY-1,(o.y0+o.W-1)>>6);cy++)for(var cx=o.x0>>6;cx<=(o.x0+o.W-1)>>6;cx++){var k=((cx%BB.SX+BB.SX)%BB.SX)*8192+cy,a=IDX.get(k);if(!a)IDX.set(k,a=[]);a.push(o)}}
 function raus(o){IDX.forEach(function(a,k){var q=a.indexOf(o);if(q>=0){a.splice(q,1);if(!a.length)IDX.delete(k)}})}
 function weg(k){var o=orte.get(k);if(!o)return;raus(o);orte.delete(k);var a=LI.indexOf(k);if(a>=0)LI.splice(a,1);a=LIP.indexOf(k);if(a>=0)LIP.splice(a,1)}
 // Kartenstücke, die vom Ort berührt werden (Fläche + Hang, dazu je eines nach Westen und Norden: deren Bildrand liest unsere Ecken)
 function stuecke(o){var R=o.R,X0=o.x0-R-1,Y0=o.y0-R-1,N=o.W+2*R+1,L=[];
  for(var cy=Math.max(0,Y0>>6);cy<=Math.min(BB.SY-1,(Y0+N)>>6);cy++)for(var cx=X0>>6;cx<=(X0+N)>>6;cx++)L.push(((cx%BB.SX+BB.SX)%BB.SX)*8192+cy);return L}
 var zeit=0;
 function halten(){var L=[],LP=[];orte.forEach(function(o){(o.posten?LP:L).push(o)});[[L,HALTEN],[LP,HALTEN_P]].forEach(function(q){var X=q[0];if(X.length<=q[1])return;   // N7a2c: Orte und Posten getrennt
  X.sort(function(a,b){return a.t-b.t});for(var i=0;i<X.length-q[1];i++)weg(X[i].k)})}
 // Welche Orte braucht das Fenster um Stück (kx, ky) (halbe Breite HALB Stücke)? OR = orte.js, AP = aussenposten.js. Gibt neu zu planende Ortsnummern, nächste zuerst;
 // vergessen = Nummern, die weit weg sind (nicht mehr im Ortskern planen).
 function bedarf(A,seed,OR,AP,kx,ky,HALB,bau){var fx0=(kx-HALB)*ST,fy0=(ky-HALB)*ST,fn=(2*HALB+1)*ST,mx=fx0+(fn>>1),my=fy0+(fn>>1),L=[],da=new Set(),R=RMAX;   // N7a7: Hang kann bis RMAX wachsen
  var zx0=Math.floor((fx0-600)/G.ZF),zx1=Math.floor((fx0+fn+600)/G.ZF),zy0=Math.max(0,Math.floor((fy0-600)/G.ZF)),zy1=Math.min(G.GH-1,Math.floor((fy0+fn+600)/G.ZF));
  for(var zy=zy0;zy<=zy1;zy++)for(var zx=zx0;zx<=zx1;zx++){var X=((zx%G.GW)+G.GW)%G.GW,z=zy*G.GW+X;if(!(A.ort[z]&15))continue;var k=OR.ortNr(A,z);if(k==null)continue;
   var p=G.ortPunkt(seed,A,X,zy),h=AP.halb(OR.groesse(seed,A,k))+R+2,dx=p[0]-mx;if(dx>WX/2)dx-=WX;else if(dx<-WX/2)dx+=WX;var dy=p[1]-my;
   if(Math.abs(dx)>h+(fn>>1)||Math.abs(dy)>h+(fn>>1))continue;da.add(k);var o=orte.get(k);if(o){o.t=++zeit;continue}if(!gefragt.has(k))L.push([dx*dx+dy*dy,k])}
  L.sort(function(a,b){return a[0]-b[0]});var neuL=L.map(function(a){gefragt.add(a[1]);return a[1]}),weg=[];gefragt.forEach(function(k){if(!da.has(k)){weg.push(k)}});weg.forEach(function(k){gefragt.delete(k)});
  // N7a2c: Orte, deren Posten das Fenster erreichen können: gemerkte Liste → berührende Posten aufnehmen, sonst Liste beim Ortskern anfragen (nächste zuerst)
  var neuP=[],stu=[];if(POSTEN){var LP=[],daP=new Set(),WN={x0:fx0,y0:fy0,n:fn};
   zx0=Math.floor((fx0-PWEIT)/G.ZF);zx1=Math.floor((fx0+fn+PWEIT)/G.ZF);zy0=Math.max(0,Math.floor((fy0-PWEIT)/G.ZF));zy1=Math.min(G.GH-1,Math.floor((fy0+fn+PWEIT)/G.ZF));
   for(zy=zy0;zy<=zy1;zy++)for(zx=zx0;zx<=zx1;zx++){var X2=((zx%G.GW)+G.GW)%G.GW,z2=zy*G.GW+X2;if(!(A.ort[z2]&15))continue;var k2=OR.ortNr(A,z2);if(k2==null)continue;
    var p2=G.ortPunkt(seed,A,X2,zy),ex=p2[0]-mx;if(ex>WX/2)ex-=WX;else if(ex<-WX/2)ex+=WX;var ey=p2[1]-my;if(Math.abs(ex)>PWEIT+(fn>>1)||Math.abs(ey)>PWEIT+(fn>>1))continue;
    daP.add(k2);var pl=PL.get(k2);
    if(pl){PL.delete(k2);PL.set(k2,pl);pl.forEach(function(q){if(!schneidet(q,WN))return;var o=orte.get(q.k);if(o){o.t=++zeit;return}stu=stu.concat(aufnehmen(q,bau||nie))})}
    else if(!gefragtP.has(k2))LP.push([ex*ex+ey*ey,k2])}
   LP.sort(function(a,b){return a[0]-b[0]});LP.forEach(function(a){gefragtP.add(a[1]);neuP.push(a[1])});
   gefragtP.forEach(function(k){if(!daP.has(k)&&!PL.has(k))weg.push(-k-1)});weg.forEach(function(k){if(k<0)gefragtP.delete(-k-1)})}
  return{neu:neuL,vergessen:weg,neuP:neuP,stuecke:stu}}
 function nie(){return false}
 // N7a2c: berührt Posten q (Fläche + Hang) das Fenster WN?
 function schneidet(q,WN){var L=q.lage,R=q.R||RAMPE_P,dx=(L.x0-R)-WN.x0;dx%=WX;if(dx>WX/2)dx-=WX;else if(dx<-WX/2)dx+=WX;var dy=(L.y0-R)-WN.y0,N=L.W+2*R;
  return dx<WN.n&&dx+N>0&&dy<WN.n&&dy+N>0}
 // N7a2c: Antwort „posten“ des Ortskerns merken (höchstens PL_HALTEN Orte; wer herausfällt, darf neu gefragt werden)
 function postenListe(m){gefragtP.delete(m.k);var t=m.liste||[];PL.delete(m.k);PL.set(m.k,t);PST.listen++;if(m.ms!=null){PST.ms=m.ms;if(m.ms>PST.maxMs)PST.maxMs=m.ms}
  while(PL.size>PL_HALTEN){var a=PL.keys().next().value;PL.delete(a)}return t.length}
 // N7a2c Startplatz: liegt (x, y) in einem Posten (Fläche + Hang + rand)? punkte = [{x, y}] Postenpunkte (ohne Plan: halbe Fläche PMAX, größter Plan 18 × 18);
 // ohne punkte die gemerkten Postenlisten (mit echter Planbreite). Gibt {k, x, y, halb, dx, dy} wie imOrt oder null
 var PMAX=9;
 function imPosten(x,y,rand,punkte){rand=rand||8;var L=punkte||[];if(!punkte)PL.forEach(function(Q){Q.forEach(function(q){L.push({x:q.lage.punkt[0],y:q.lage.punkt[1],W:q.lage.W,k:q.k,R:q.R})})});
  for(var a=0;a<L.length;a++){var q=L[a],h=(q.W?q.W>>1:PMAX)+(q.R||RAMPE_P)+rand,dx=x-q.x;if(dx>WX/2)dx-=WX;else if(dx<-WX/2)dx+=WX;var dy=y-q.y;
   if(Math.abs(dx)<=h&&Math.abs(dy)<=h)return{k:q.k,x:q.x,y:q.y,halb:h,dx:dx,dy:dy}}return null}
 // N7a2c: Orte, deren Posten (x, y) erreichen könnten (ohne=true: nur die ohne gemerkte Liste)
 function orteUm(A,seed,OR,x,y,ohne){var L=[],zx0=Math.floor((x-PWEIT)/G.ZF),zx1=Math.floor((x+PWEIT)/G.ZF),zy0=Math.max(0,Math.floor((y-PWEIT)/G.ZF)),zy1=Math.min(G.GH-1,Math.floor((y+PWEIT)/G.ZF));
  for(var zy=zy0;zy<=zy1;zy++)for(var zx=zx0;zx<=zx1;zx++){var X=((zx%G.GW)+G.GW)%G.GW,z=zy*G.GW+X;if(!(A.ort[z]&15))continue;var k=OR.ortNr(A,z);if(k==null||ohne&&PL.has(k))continue;
   var p=G.ortPunkt(seed,A,X,zy),dx=p[0]-x;if(dx>WX/2)dx-=WX;else if(dx<-WX/2)dx+=WX;if(Math.abs(dx)<=PWEIT&&Math.abs(p[1]-y)<=PWEIT)L.push(k)}
  return L}
 // Ein frisch gerechnetes Kartenstück (b = weltgen-Puffer) einebnen; gibt true, wenn sich etwas geändert hat
 // N7a5a2: Orte mit Weltwasser (o.ww) lassen Meer, Fluss und See in Ruhe, Land am tieferen Wasser sinkt als Böschung um P.senke Stufen (gleich in ortssperre.js hoch)
 function flachen(b,cx,cy){if(!orte.size)return false;var s=BB.sicht(b),H=s.H,B=s.B,k=cx*8192+cy,ja=false;
  orte.forEach(function(o){if(o.aus.has(k))return;var R=o.R,W=o.W,N=W+2*R,i0=lok(o,cx*ST)+R,j0=cy*ST-o.y0+R;
   if((i0>=N&&i0<WX-ST)||j0>=N||j0+ST<=0)return;
   for(var y=0;y<ST;y++){var j=j0+y;if(j<0||j>=N)continue;for(var x=0;x<ST;x++){var i=i0+x;if(i>=WX)i-=WX;if(i<0||i>=N)continue;
     var d=Math.max(i<R?R-i:i>=R+W?i-R-W+1:0,j<R?R-j:j>=R+W?j-R-W+1:0),q=(y<<6)|x,h=H[q],z;
     if(d===0){var b0=B[q];if(o.ww&&(b0<2||b0===10||b0===11))continue;z=o.sk?o.h0-(o.sk.charCodeAt((j-R)*W+i-R)-48)*64:o.h0;if(z<0)z=0}else{var bb=B[q];if(bb<2||bb===10||bb===11)continue;var e=randE(o.x0,o.y0,i,j,R,W,o.RS),hb=o.h0;if(o.sk&&N7A7){var pi=i-R,pj=j-R;pi=pi<0?0:pi>=W?W-1:pi;pj=pj<0?0:pj>=W?W-1:pj;hb-=(o.sk.charCodeAt(pj*W+pi)-48)*64;if(hb<0)hb=0}var lo=hb-e,hi=hb+e;z=h<lo?lo:h>hi?hi:h;if(z<0)z=0;if(o.FS&&d>=R-2&&(h-z>128||z-h>128)&&B[q]!==8){B[q]=8;ja=true}}   // N7a7: über der Obergrenze Felsstufe mit Fels-Boden   // N7a7: Hang setzt am abgesenkten Rand an (sonst Wand zur Böschung)
     if(z!==h){H[q]=z;ja=true}}}});
  return ja}
 // Ort am Weltfeld (X, Y): {o, i, j} oder null
 function bei(X,Y){var k=stk(X,Y),a=IDX.get(k);if(!a)return null;for(var q=0;q<a.length;q++){var o=a[q],i=lok(o,X),j=Y-o.y0;if(i>=0&&i<o.W&&j>=0&&j<o.W&&!o.aus.has(k))return{o:o,i:i,j:j}}return null}
 function frei(X,Y){return !bei(X,Y)}
 // Klotz-Bild (Wand + Dach) für fw × fh Felder, Höhe hb, Stufe lod; Anker = obere Ecke des nördlichsten Felds auf dem Boden
 function klotz(fw,fh,hb,lod,mauer){var key=fw+':'+fh+':'+hb+':'+lod+':'+(mauer?1:0),sp=sprite.get(key);if(sp)return sp;var hw=32>>lod,hh=16>>lod,w=(fw+fh)*hw,h=(fw+fh)*hh+hb+1,ax=fh*hw,sx=fw*hw,px=new Uint8Array(w*h).fill(255);
  var dach=mauer?FB.dachM:FB.dach,wl=mauer?FB.mauer:FB.wand,wr=mauer?FB.mauerD:FB.wandD;
  for(var x=0;x<w;x++){var xm=x+.5,yT=Math.floor(Math.abs(xm-ax)*hh/hw),yB=Math.floor(xm<sx?fh*hh+xm*hh/hw:(fw+fh)*hh-(xm-sx)*hh/hw),y;
   for(y=yT;y<yB&&y<h;y++)px[y*w+x]=dach;for(;y<yB+hb&&y<h;y++)px[y*w+x]=xm<sx?wl:wr}
  sp={w:w,h:h,ax:ax,ay:hb,px:px};sprite.set(key,sp);if(sprite.size>256)sprite.delete(sprite.keys().next().value);return sp}
 // N7a2b1: Elementliste des Orts (stadtbild.js elemente, ohne sie zu füllen) erst beim ersten echten Bild; Boden und Säume je Planfeld wie im Stadtbild
 function bodenBilder(o,i,j,lod){var r0=bodenBilder1(o,i,j);if(!r0||!lod)return r0;var r2=[];for(var q=0;q<r0.length;q++)r2.push(klein(r0[q],lod));return r2}   // N7a3a: ½ = verkleinert   // N7a3b: auch ¼, ⅛
 function bodenBilder1(o,i,j){if(!o.E){var t0=jetzt();try{o.E=SBx.elemente(o.P,KL.hole,{inSchritten:true})}catch(x){o.E=false}EMS.push(jetzt()-t0);if(EMS.length>32)EMS.shift()}
  if(!o.E)return null;var e=o.E.boden(i,j),sp=SBx.malbild(KL.hole(e.id)),r,q;if(!sp){o.wartet=true;return null}r=[sp];
  if(e.su)for(q=0;q<e.su.length;q++){var s=e.su[q],so=SBx.malbild(SBx.saumObj(KL.hole(s[0]),s[1],s[2],s[3]));if(!so){o.wartet=true;return null}r.push(so)}return r}

 // N7a2b2: Elementliste des Orts (o.E wie bodenBilder) ganz füllen lassen; höchstens LISTEN Orte, der am längsten nicht gebrauchte gibt seine Liste ab
 function elem(o){if(!o.E&&o.E!==false){var t0=jetzt();try{o.E=SBx.elemente(o.P,KL.hole,{inSchritten:true})}catch(x){o.E=false}EMS.push(jetzt()-t0);if(EMS.length>32)EMS.shift()}return o.E||null}
 function listeWunsch(o){var Lx=o.posten?LIP:LI,MX=o.posten?LISTEN_P:LISTEN,a=Lx.indexOf(o.k);if(a>=0)Lx.splice(a,1);Lx.push(o.k);if(!o.EF&&!o.fuell)o.fuell={ix:0,t:0,R:0};   // N7a2c: Posten eigene Liste
  while(Lx.length>MX){var k=Lx.shift(),x=orte.get(k);if(x){x.EF=null;x.RT=null;x.fuell=null;x.E=null;HST.verworfen++}}}
 // Fach (8 × 8 nach dem vordersten Feld) → Liste der Elementnummern; RT = Tiefe je Element (laufendes Maximum von fi + fj, so bleibt die Reihenfolge der Stadt)
 function fuellen(o,aus){var E=elem(o);if(!E){o.fuell=null;o.EF=false;return true}var f=o.fuell,t0=jetzt();
  if(!E.voll()&&!E.fuellen(aus)){f.t+=jetzt()-t0;return false}
  var L=E.L,N=L.length;if(!f.F){f.F=new Map();f.RT=new Int32Array(N)}
  for(;f.ix<N;f.ix++){if((f.ix&1023)===0&&f.ix&&aus()){f.t+=jetzt()-t0;return false}var e=L[f.ix];if(!e.k)continue;var v=e.fi+e.fj;if(v>f.R)f.R=v;f.RT[f.ix]=f.R;
   var key=(e.fi>>3)*4096+(e.fj>>3),a=f.F.get(key);if(!a)f.F.set(key,a=[]);a.push(f.ix)}
  o.EF=f.F;o.RT=f.RT;o.fuell=null;f.t+=jetzt()-t0;HST.listen++;HST.listeMs=Math.max(HST.listeMs,f.t);stuecke(o).forEach(function(k){FERTIG.add(k)});return true}
 function hausKey(o,q){return o.k+':'+q}
 function hausRein(key,r){HB.set(key,r);HBB+=r.sp.px.length;while(HBB>HGR&&HB.size>1){var alt=HB.keys().next().value;HBB-=HB.get(alt).sp.px.length;HB.delete(alt)}}
 // N7a3a: halbe Bilder merken (Schlüssel = 1×-Bild oder Gebäude-Schlüssel), höchstens K2GR Bytes, älteste fallen heraus
 function k2Rein(key,r){var a=K2.get(key);if(a){K2B-=a.sp.px.length;K2.delete(key)}K2.set(key,r);K2B+=r.sp.px.length;while(K2B>K2GR&&K2.size>1){var alt=K2.keys().next().value;K2B-=K2.get(alt).sp.px.length;K2.delete(alt);H2ST.verworfen++}}
 function k2(key){var c=K2.get(key);if(c){K2.delete(key);K2.set(key,c)}return c}
 // halbes Bild eines kleinen 1×-Bilds (Boden, Saum, Ding) sofort, gemerkt
 function klein(sp,lod){if(lod>1)return klein4(sp,lod);var c=k2(sp);if(c)return c.sp;var r=halb(sp);k2Rein(sp,{sp:r});return r}
 // N7a3b: ¼ und ⅛ merken (K4, höchstens K4GR Bytes zusammen, älteste fallen heraus)
 // zuerst fallen die ältesten Bilder der Stufe heraus, die gerade nicht gezeigt wird (LETZT = zuletzt angefragte Stufe; sonst verdrängen die ¼-Zwischenstufen der Kette die sichtbaren ⅛-Bilder)
 function k4Rein(lod,key,r){var M=K4[lod],a=M.get(key);if(a){K4B-=a.sp.px.length;M.delete(key)}M.set(key,r);K4B+=r.sp.px.length;
  while(K4B>K4GR){var X=null,alt;for(var u=0;u<2&&!X;u++){var Y=K4[(LETZT===2)===(u===0)?3:2];if(!Y.size)continue;alt=Y.keys().next().value;if(Y!==M||alt!==key)X=Y}   // nie das gerade eingefügte Bild
   if(!X)break;K4B-=X.get(alt).sp.px.length;X.delete(alt);H4ST.verworfen++}}
 function k4(lod,key){var M=K4[lod],c=M.get(key);if(c){M.delete(key);M.set(key,c)}return c}
 function sid(sp){var v=SID.get(sp);if(v===undefined){v=++SIDN;SID.set(sp,v)}return v}
 // kleines Bild in ¼ (aus ½) oder ⅛ (aus ¼) sofort, gemerkt; ½ nur aus K2 genommen, nicht dort abgelegt
 var KZ=[null,null,[null,null,null,null],[null,null,null,null]];   // je Stufe die letzten zwei Treffer (Bild → kleine Fassung): benachbarte Felder haben meist dieselben Böden
 function klein4(sp,lod){var z=KZ[lod];if(z[0]===sp)return z[1];if(z[2]===sp)return z[3];var r=klein4b(sp,lod);z[2]=z[0];z[3]=z[1];z[0]=sp;z[1]=r;return r}
 function klein4b(sp,lod){LETZT=lod;var s='s'+sid(sp),c=k4(lod,s),r;if(c)return c.sp;
  if(lod===3){var c2=k4(2,s);if(c2){r=halb(c2.sp);k4Rein(3,s,{sp:r});return r}}
  var h=K2.get(sp);r=halb(h?h.sp:halb(sp));if(lod===3){k4Rein(2,s,{sp:r});r=halb(r)}k4Rein(lod,s,{sp:r});return r}
 // größte schon vorhandene Fassung eines Gebäudes für Zielstufe L (⅛: zuerst ¼, dann ½, dann 1×)
 function quelle(key,L){var c;if(L===3&&(c=K4[2].get('h'+key)))return{sp:c.sp,X:c.X,Y:c.Y,lod:2};if(c=K2.get(key))return{sp:c.sp,X:c.X,Y:c.Y,lod:1};if(c=HB.get(key))return{sp:c.sp,X:c.X,Y:c.Y,lod:0};return null}
 // Arbeit in Zeitanteilen (Bildkern, Regel 20): erst Listen füllen, dann Gebäudebilder bauen. Gibt true, wenn noch Arbeit übrig ist.
 function schritt(budget){budget=budget||4;var t0=jetzt(),aus=function(){return jetzt()-t0>=budget};
  for(var a=LI.length-1;a>=0;a--){var o=orte.get(LI[a]);if(!o||!o.fuell)continue;if(!fuellen(o,aus))return true;if(aus())return true}
  for(a=LIP.length-1;a>=0;a--){o=orte.get(LIP[a]);if(!o||!o.fuell)continue;if(!fuellen(o,aus))return true;if(aus())return true}   // N7a2c
  // N7a2b3 (Thomas 24.11.2026): ein Gebäudebild in Abschnitten (bauAuftrag), angefangene Arbeit (AKT) geht im nächsten Zeitanteil weiter, größter Schritt ≤ 8 ms gedrosselt
  while(AUF.length||AKT){if(aus())return true;var w,o2;
   if(AKT){w=AKT.w;o2=orte.get(w.k);if(!o2||!o2.EF||o2.E!==w.E||HB.has(w.key)){AKT=null;continue}}
   else{w=AUF.shift();INQ.delete(w.key);o2=orte.get(w.k);if(!o2||!o2.EF||o2.E!==w.E||HB.has(w.key))continue;
    try{AKT={w:w,A:ABSCHNITTE&&o2.E.bauAuftrag?o2.E.bauAuftrag(o2.E.L[w.q]):{weiter:function(){return true},ergebnis:(function(E,q){return function(){return E.bauBild(E.L[q])}})(o2.E,w.q)}}}catch(x){AKT=null;continue}}
   var t1=jetzt(),r=null,fertig=true;try{fertig=AKT.A.weiter(ABSCHNITTE?aus:null);if(fertig)r=AKT.A.ergebnis()}catch(x){r=null;fertig=true}var d=jetzt()-t1;HST.ms+=d;if(d>HST.maxMs)HST.maxMs=d;
   if(!fertig){HST.pausen++;return true}AKT=null;
   if(!r||!r.sp||!r.sp.w){if(r&&r.fehlt&&r.fehlt.length&&KL.wuensche())o2.wartet=true;continue}
   if(r.fehlt&&r.fehlt.length&&KL.wuensche()){o2.wartet=true;continue}   // Teile werden noch geladen: Klotz bleibt, nach dem Laden neu
   var nur=w.fern&&!w.halb&&!w.voll;   // N7a3b: nur für ¼/⅛ gebaut → 1× nicht merken
   if(!nur)hausRein(w.key,{sp:r.sp,X:r.X,Y:r.Y});HST.gebaut++;
   if(w.fern){INQ4.add(w.fern+'h'+w.key);AUF4.unshift({k:w.k,q:w.q,key:w.key,E:w.E,fi:w.fi,fj:w.fj,L:w.fern,src:{sp:r.sp,X:r.X,Y:r.Y,lod:0}})}   // als Nächstes verkleinern
   if(w.halb&&!K2.has(w.key)){INQ2.add(w.key);AUF2.unshift({k:w.k,q:w.q,key:w.key,E:w.E,fi:w.fi,fj:w.fj})}   // N7a3a: für ½ gebaut → als Nächstes verkleinern (vorn, sonst verdrängen sich die 1×-Bilder im Kreis)
   if(w.halb||w.fern){HN.delete(w.key);if(!w.voll)continue}   // nur für ½ gebaut: kein „ortNeu“ für 1× (erscheint mit dem halben Bild)
   // schon einmal gebaut und verdrängt: kein neues „ortNeu“ (sonst bauen und verdrängen sich zu viele Häuser im Bild gegenseitig immer wieder), erscheint beim nächsten Neuzeichnen
   if(GEB.has(w.key))HST.wieder++;else{GEB.add(w.key);if(GEB.size>65536)GEB.clear();FERTIG.add(stk(o2.x0+w.fi,o2.y0+w.fj))}}
  // N7a3a: Gebäudebilder für ½ verkleinern (aus dem gemerkten 1×-Bild in Zeitanteilen; fehlt es, zuerst bauen lassen)
  while(AUF2.length||AKT2){if(aus())return true;var w2,o3;
   if(AKT2){w2=AKT2.w;o3=orte.get(w2.k);if(!o3||!o3.EF||o3.E!==w2.E){AKT2=null;continue}}
   else{w2=AUF2.shift();INQ2.delete(w2.key);o3=orte.get(w2.k);if(!o3||!o3.EF||o3.E!==w2.E||K2.has(w2.key))continue;var c1=HB.get(w2.key);
    if(!c1){if(!INQ.has(w2.key)){INQ.add(w2.key);HN.add(w2.key);AUF.push({k:w2.k,q:w2.q,key:w2.key,E:w2.E,fi:w2.fi,fj:w2.fj,halb:true})}if(AUF.length)return true;continue}
    AKT2={w:w2,A:halbAuftrag(c1.sp),X:c1.X,Y:c1.Y}}
   var t2=jetzt(),fertig2=AKT2.A.weiter(ABSCHNITTE?aus:null),d2=jetzt()-t2;H2ST.ms+=d2;if(d2>H2ST.maxMs)H2ST.maxMs=d2;
   if(!fertig2){H2ST.pausen++;return true}var A2=AKT2;AKT2=null;k2Rein(w2.key,{sp:A2.A.ergebnis(),X:A2.X,Y:A2.Y});H2ST.gebaut++;
   if(!GEB2.has(w2.key)){GEB2.add(w2.key);if(GEB2.size>65536)GEB2.clear();FERTIG.add(stk(o3.x0+w2.fi,o3.y0+w2.fj))}}
  // N7a3b: Gebäudebilder für ¼ und ⅛ aus der größten vorhandenen Fassung verkleinern, Stufe für Stufe in Zeitanteilen (¼ und ⅛ gemerkt); fehlt jede, 1× bauen lassen
  while(AUF4.length||AKT4){if(aus())return true;var w4,o4,id4;
   if(AKT4){w4=AKT4.w;o4=orte.get(w4.k);if(!o4||!o4.EF||o4.E!==w4.E){AKT4=null;continue}}
   else{w4=AUF4.shift();id4=w4.L+'h'+w4.key;INQ4.delete(id4);o4=orte.get(w4.k);if(!o4||!o4.EF||o4.E!==w4.E||K4[w4.L].has('h'+w4.key))continue;
    var s4=w4.src||quelle(w4.key,w4.L);w4.src=null;
    if(!s4){if(!INQ.has(w4.key)){INQ.add(w4.key);HN.add(w4.key);AUF.push({k:w4.k,q:w4.q,key:w4.key,E:w4.E,fi:w4.fi,fj:w4.fj,fern:w4.L})}else fern(w4.key,w4.L);if(AUF.length||AKT)return true;continue}
    AKT4={w:w4,cur:s4.lod,X:s4.X,Y:s4.Y,A:halbAuftrag(s4.sp)}}
   var t4=jetzt(),f4=AKT4.A.weiter(ABSCHNITTE?aus:null),d4=jetzt()-t4;H4ST.ms+=d4;if(d4>H4ST.maxMs)H4ST.maxMs=d4;
   if(!f4){H4ST.pausen++;return true}var A4=AKT4,r4=A4.A.ergebnis();A4.cur++;if(A4.cur>=2)k4Rein(A4.cur,'h'+w4.key,{sp:r4,X:A4.X,Y:A4.Y});
   if(A4.cur<w4.L){A4.A=halbAuftrag(r4);continue}
   AKT4=null;H4ST.gebaut++;if(!GEB4.has(id4=w4.L+'h'+w4.key)){GEB4.add(id4);if(GEB4.size>65536)GEB4.clear();FERTIG.add(stk(o4.x0+w4.fi,o4.y0+w4.fj))}}
  return false}
 function arbeitOffen(){if(AUF.length||AKT||AUF2.length||AKT2||AUF4.length||AKT4)return true;var X=LI.concat(LIP);for(var a=0;a<X.length;a++){var o=orte.get(X[a]);if(o&&o.fuell)return true}return false}
 // Elemente eines Orts, deren vorderstes Feld in diesem Bild liegt (1×; N7a3a auch ½ = lod 1): Einträge wie natur.sammeln; fehlt ein Gebäudebild, der Klotz und ein Bauauftrag
 function elementeIns(o,aus,i0,j0,n,lod){lod=lod||0;var E=o.E,L=E.L,N=L.length,z=0,dx=E.ax+(i0-j0)*32,dy=E.ay+(i0+j0)*16+o.s0*8,hw=32>>lod,hh=16>>lod,st=8>>lod;
  for(var fj=Math.max(0,j0)>>3;fj<=Math.min(o.W-1,j0+n-1)>>3;fj++)for(var fi=Math.max(0,i0)>>3;fi<=Math.min(o.W-1,i0+n-1)>>3;fi++){var f=o.EF.get(fi*4096+fj);if(!f)continue;
   for(var a=0;a<f.length;a++){var q=f[a],e=L[q],vi=e.fi-i0,vj=e.fj-j0;if(vi<0||vj<0||vi>=n||vj>=n)continue;var tief=o.RT[q]-i0-j0+(q+1)/(N+2),sp,x,y;
    if(e.k===1&&o.WN&&o.WB[e.fj*o.W+e.fi]&&natD(e.id))continue;   // N7a5e2: Plan-Natur auf Weltboden fällt weg (dort wächst die Welt)
    if(e.k===1){sp=SBx.malbild(KL.hole(e.id));if(!sp){o.wartet=true;continue}if(lod)sp=klein(sp,lod);x=(e.X-dx)>>lod;y=(e.Y-dy)>>lod}
    else{var key=hausKey(o,q),c=lod===0?HB.get(key):lod===1?k2(key):k4(LETZT=lod,'h'+key);
     if(c){if(!lod){HB.delete(key);HB.set(key,c)}sp=c.sp;x=(c.X-dx)>>lod;y=(c.Y-dy)>>lod}
     else{var b=e.b,li=e.fi-e.fw+1-i0,lj=e.fj-e.fh+1-j0;sp=klotz(e.fw,e.fh,(b.rolle==='mauer'?20:28)>>lod,lod,b.rolle==='mauer');x=(li-lj)*hw;y=(li+lj)*hh-o.s0*st;
      if(!lod){if(!INQ.has(key)){INQ.add(key);AUF.push({k:o.k,q:q,key:key,E:E,fi:e.fi,fj:e.fj})}else if(HN.has(key))voll(key)}
      else if(lod===1){if(!INQ2.has(key)){INQ2.add(key);AUF2.push({k:o.k,q:q,key:key,E:E,fi:e.fi,fj:e.fj})}}
      else{var id=lod+'h'+key;if(!INQ4.has(id)){INQ4.add(id);AUF4.push({k:o.k,q:q,key:key,E:E,fi:e.fi,fj:e.fj,L:lod})}}}}   // N7a3b
    aus.push({tief:tief,i:vi,o:1,m:0,sp:sp,x:x,y:y});z++}}
  return z}
 // ein für ½ angestoßener 1×-Bau wird auch in 1× gebraucht: dann meldet er sich auch für 1× fertig
 function voll(key){for(var a=0;a<AUF.length;a++)if(AUF[a].key===key){AUF[a].voll=true;return}if(AKT&&AKT.w.key===key)AKT.w.voll=true}
 // N7a3b: ein laufender 1×-Bau wird auch für ¼/⅛ gebraucht: danach bis Stufe L verkleinern
 function fern(key,L){for(var a=0;a<AUF.length;a++)if(AUF[a].key===key){if((AUF[a].fern||0)<L)AUF[a].fern=L;return}if(AKT&&AKT.w.key===key&&(AKT.w.fern||0)<L)AKT.w.fern=L}
 function echtLod(lod){return lod===0||lod===1&&HALBAN||(lod===2||lod===3)&&VIERAN}
 // Für ein Bodenbild (Felder x0.., y0.., n je Seite): Zugriff fürs Bodenbild oder null, wenn kein Ort es schneidet
 // N7a5b1 (Thomas 25.11.2026): Weltwege im Hangring nach ortsanschluss.js: Kopie der Wegschicht des Bilds mit dem Anschluss (Weg weg, Bogen zum Ausgang),
 // dazu je Feld die Übergangsstufe (1 … UE) und die Farbe des Ortswegs am Ausgang. Gibt null, wenn kein Eintrag ins Bild fällt. Puffer einmal, je Bild neu gefüllt.
 var WEGK=new Uint8Array(4096),WEGU=new Uint8Array(4096),WEGC=new Uint8Array(4096),UEFELD=new Int32Array(4096),uen=0;
 function wegIns(LR,Wq,x0,y0,n,FBx){var neu=false;
  for(var a=0;a<LR.length;a++){var o=LR[a],AN=o.AN,nn=AN.n,l=AN.liste,dx0=x0-AN.x0;if(dx0<-WX/2)dx0+=WX;else if(dx0>WX/2)dx0-=WX;var dy0=y0-AN.y0;
   if(dx0>=nn||dy0>=nn||dx0+n<=0||dy0+n<=0)continue;
   for(var e=0;e<l.length;e+=2){var r=l[e],u=r%nn-dx0,v=((r/nn)|0)-dy0;if(u<0||v<0||u>=n||v>=n)continue;var X=x0+u,Y=y0+v,q=((Y&63)<<6)|(X&63),val=l[e+1];
    if(!neu){WEGK.set(Wq);neu=true;for(var z=0;z<uen;z++)WEGU[UEFELD[z]]=0;uen=0}
    WEGK[q]=val&7;var k=(val>>4)&7;if(k){var zc=(val>>8)-1,c=zc>=0&&zc<o.Z.length?o.Z[zc]:255;if(c!==255){WEGU[q]=k;WEGC[q]=FBx.boden[c];UEFELD[uen++]=q}}}}
  return neu?{W:WEGK,ue:WEGU,c:WEGC}:null}
 function fuerBild(x0,y0,n,lod,f){if(!orte.size)return null;var L=[],LR=[];orte.forEach(function(o){var i=lok(o,x0),j=y0-o.y0;if((i<o.W||i>WX-n)&&j<o.W&&j+n>0)L.push(o);
   else if(o.AN){var R=o.R,i2=i+R;if(i2>=WX)i2-=WX;if((i2<o.W+2*R||i2>WX-n)&&j+R<o.W+2*R&&j+R+n>0)LR.push(o)}});if(!L.length&&!LR.length)return null;
  var FBx=farben(f),k0=stk(x0,y0);L=L.filter(function(o){return !o.aus.has(k0)});LR=LR.concat(L.filter(function(o){return o.AN})).filter(function(o){return !o.aus.has(k0)});
  if(!L.length&&!LR.length)return null;
  var weg=LR.length?function(Wq){return wegIns(LR,Wq,x0,y0,n,FBx)}:null;
  if(!L.length)return{farbe:FBx.boden,wasser:FBx.wasser,zelle:function(){return -1},frei:function(){return true},boden:null,kloetze:function(){return 0},weg:weg};
  return{farbe:FBx.boden,wasser:FBx.wasser,weg:weg,
   zelle:function(X,Y){for(var a=0;a<L.length;a++){var o=L[a],i=lok(o,X),j=Y-o.y0;if(i>=0&&i<o.W&&j>=0&&j<o.W){var z=o.Z[j*o.W+i];return z===255?-1:z}}return -1},
   weltB:function(X,Y){for(var a=0;a<L.length;a++){var o=L[a],i=lok(o,X),j=Y-o.y0;if(i>=0&&i<o.W&&j>=0&&j<o.W)return !!(o.WB&&o.WB[j*o.W+i])}return false},   // N7a5e1
   frei:function(X,Y){for(var a=0;a<L.length;a++){var o=L[a],i=lok(o,X),j=Y-o.y0;if(i>=0&&i<o.W&&j>=0&&j<o.W)return !!(o.WN&&o.WN[j*o.W+i])}return true},   // N7a5e2: Weltnatur auf freien Ortsfeldern
   // N7a2b1: echter Boden des Planfelds unter (X, Y) als Liste von Bildern (Boden, dann Säume) oder null (Kartei-Bild fehlt noch → Ersatzfarbe, Ort wartet), nur in 1×
   boden:echtLod(lod)&&SBx&&KL?function(X,Y){for(var a=0;a<L.length;a++){var o=L[a],i=lok(o,X),j=Y-o.y0;if(i>=0&&i<o.W&&j>=0&&j<o.W)return bodenBilder(o,i,j,lod)}return null}:null,   // N7a3a: auch ½
   // Klötze, deren vorderstes Feld in diesem Bild liegt (Einträge wie natur.sammeln: tief, i, o, m, sp, x, y), nur in 1× und ½
   kloetze:function(aus){if(lod>3||lod>1&&!VIERAN)return 0;var z=0,hw=32>>lod,hh=16>>lod,st=8>>lod;
    L.forEach(function(o){var i0=lok(o,x0),j0=y0-o.y0;if(i0>=WX-n)i0-=WX;
     if(echtLod(lod)&&ECHT&&SBx&&KL&&o.E!==false){listeWunsch(o);if(o.EF&&o.E){z+=elementeIns(o,aus,i0,j0,n,lod);return}}   // N7a3a: ½ wie 1×, verkleinert   // N7a2b2: echte Häuser, Mauern, Dinge (bis die Liste da ist: Klötze)
     for(var fj=Math.max(0,j0)>>3;fj<=Math.min(o.W-1,j0+n-1)>>3;fj++)for(var fi=Math.max(0,i0)>>3;fi<=Math.min(o.W-1,i0+n-1)>>3;fi++){var f=o.fach.get(fi*4096+fj);if(!f)continue;
      for(var a=0;a<f.length;a++){var e=f[a],vi=e.i+e.w-1-i0,vj=e.j+e.h-1-j0;if(vi<0||vj<0||vi>=n||vj>=n)continue;
       var hb=(e.m?20:28)>>lod,sp=klotz(e.w,e.h,hb,lod,e.m),li=e.i-i0,lj=e.j-j0;
       aus.push({tief:vi+vj,i:vi,o:1,m:0,sp:sp,x:(li-lj)*hw,y:(li+lj)*hh-o.s0*st});z++}}});return z}}}
 // Startplatz: liegt das Weltfeld (x, y) in der größtmöglichen Fläche eines Orts (ohne Plan, nach aussenposten.halb)? Gibt {k, x, y, halb} oder null.
 function imOrt(A,seed,OR,AP,x,y,rand){rand=rand||8;var zx=Math.floor(x/G.ZF),zy=Math.floor(y/G.ZF),best=null;
  for(var v=-1;v<=1;v++)for(var u=-1;u<=1;u++){var Y=zy+v,X=((zx+u)%G.GW+G.GW)%G.GW;if(Y<0||Y>=G.GH)continue;var z=Y*G.GW+X;if(!(A.ort[z]&15))continue;var k=OR.ortNr(A,z);if(k==null)continue;
   var p=G.ortPunkt(seed,A,X,Y),h=AP.halb(OR.groesse(seed,A,k))+rand,dx=x-p[0];if(dx>WX/2)dx-=WX;else if(dx<-WX/2)dx+=WX;var dy=y-p[1];
   if(Math.abs(dx)<=h&&Math.abs(dy)<=h&&!best)best={k:k,x:p[0],y:p[1],halb:h,dx:dx,dy:dy}}
  return best}
 // Startplatz aus einer Fläche schieben: an den nächsten Rand (+ rand), x über die Naht
 function hinaus(t){var ax=Math.abs(t.dx),ay=Math.abs(t.dy);if(t.halb-ax<=t.halb-ay)return{x:um(t.x+(t.dx<0?-1:1)*(t.halb+1)),y:t.y+t.dy};
  return{x:um(t.x+t.dx),y:Math.max(0,Math.min(BB.WY-1,t.y+(t.dy<0?-1:1)*(t.halb+1)))}}
 return{RAMPE:RAMPE,HALTEN:HALTEN,orte:orte,postenListe:postenListe,imPosten:imPosten,orteUm:orteUm,postenFehlen:function(A,seed,OR,x,y){return orteUm(A,seed,OR,x,y,true)},PL:PL,
  ortBei:function(X,Y){var b=null;orte.forEach(function(o){if(b!=null||o.posten)return;var i=lok(o,X),j=Y-o.y0;if(i>=0&&i<o.W&&j>=0&&j<o.W)b=o.k});return b},   // N7b2: Ort (Nummer), dessen Planquadrat das Feld enthält (nur Orte, keine Posten)
  fpFarben:function(f){return farben(f)},   // N7b3: Boden-, Dach-, Wand- und Mauerfarben für die Kulisse in First Person (fpausschnitt.js)
  postenAn:function(an){POSTEN=!!an},   // N7a2c: Posten einschalten (Notausschalter ?n7a2c=0 lässt es aus)
  postenStand:function(){var n=0,b=0;orte.forEach(function(o){if(o.posten){n++;if(o.EF)b++}});return{posten:n,listen:LIP.length,orteMitListe:PL.size,anfragen:gefragtP.size,ms:PST.ms,maxMs:PST.maxMs}},aufnehmen:aufnehmen,stuecke:stuecke,bedarf:bedarf,flachen:flachen,bei:bei,frei:frei,fuerBild:fuerBild,imOrt:imOrt,hinaus:hinaus,
  // N7a2b1: echte Böden einschalten (sb = stadtbild.js, kl = karteilader.js neu(…)); wartende() → Kartenstücke der Orte, die auf Kartei-Bilder gewartet haben
  bilder:function(sb,kl,opt){SBx=sb||null;KL=kl||null;ECHT=!(opt&&opt.haeuser===false);HGR=opt&&opt.hausSpeicher||HAUS;ABSCHNITTE=!(opt&&opt.abschnitte===false);HALBAN=!(opt&&opt.halb===false);K2GR=opt&&opt.halbSpeicher||HALB_GR;VIERAN=!(opt&&opt.viertel===false);K4GR=opt&&opt.viertelSpeicher||VIERTEL_GR},   // N7a3b: opt.viertel:false (?n7a3b=0)   // N7a3a: opt.halb:false = ½ bleibt bei den Klötzen (?n7a3=0), halbSpeicher nur für Tests   // N7a2b3: opt.abschnitte:false = Gebäudebilder am Stück (Notausschalter ?n7a2b3=0)   // hausSpeicher: nur für Tests   // N7a2b2: opt.haeuser:false = Gebäude bleiben Klötze (Notausschalter ?n7a2b2=0)
  schritt:schritt,arbeitOffen:arbeitOffen,
  fertige:function(){var L=[];FERTIG.forEach(function(k){L.push(k)});FERTIG.clear();return L},fertigeZahl:function(){return FERTIG.size},
  messNeu:function(){HST.maxMs=0;HST.listeMs=0;HST.pausen=0;PST.maxMs=0;H2ST.maxMs=0;H2ST.pausen=0;H4ST.maxMs=0;H4ST.pausen=0},   // N7a2b3: Höchstwerte neu (Messfeld)
  haeuser:function(){return{listen:LI.length,bilder:HB.size,bytes:HBB,grenze:HGR,auftraege:AUF.length,gebaut:HST.gebaut,wieder:HST.wieder,ms:HST.ms,maxMs:HST.maxMs,listeMaxMs:HST.listeMs,listenVerworfen:HST.verworfen,pausen:HST.pausen,angefangen:!!AKT}},
  halbStand:function(){return{an:HALBAN,bilder:K2.size,bytes:K2B,grenze:K2GR,auftraege:AUF2.length,gebaut:H2ST.gebaut,ms:H2ST.ms,maxMs:H2ST.maxMs,verworfen:H2ST.verworfen,pausen:H2ST.pausen,angefangen:!!AKT2}},   // N7a3a
  viertelStand:function(){var n2=K4[2].size,n3=K4[3].size;return{an:VIERAN,bilder:n2+n3,viertel:n2,achtel:n3,bytes:K4B,grenze:K4GR,auftraege:AUF4.length,gebaut:H4ST.gebaut,ms:H4ST.ms,maxMs:H4ST.maxMs,verworfen:H4ST.verworfen,pausen:H4ST.pausen,angefangen:!!AKT4}},   // N7a3b
  wartende:function(){var L=[];orte.forEach(function(o){if(!o.wartet)return;o.wartet=false;L=L.concat(stuecke(o))});return L},
  elementeMs:function(){var m=0;EMS.forEach(function(v){if(v>m)m=v});return m},
  leeren:function(){orte.clear();gefragt.clear();PL.clear();gefragtP.clear();IDX.clear();LIP.length=0;LI.length=0;AUF.length=0;INQ.clear();FERTIG.clear();GEB.clear();AUF2.length=0;INQ2.clear();AKT2=null;GEB2.clear();HN.clear();AUF4.length=0;INQ4.clear();AKT4=null;GEB4.clear()},vergessenAlle:function(){gefragt.clear();gefragtP.clear()},vergessen:function(k){gefragt.delete(k)},
  // Park gewinnt: der Spieler hat im Kartenstück k neu gebaut → k gehört zu keiner Ortsfläche mehr; true, wenn k vorher eingeebnet war (Stück neu rechnen)
  bauGeaendert:function(k){var ja=false;orte.forEach(function(o){if(o.aus.has(k))return;if(stuecke(o).indexOf(k)>=0){o.aus.add(k);ja=true}});return ja}}}
// N7a3a: halbe Größe eines Bilds ({w, h, ax, ay, px}, 255 = durchsichtig): je 2 × 2 Bildpunkte die häufigste Farbe (gleich oft: die erste), nur Palettenfarben;
// durchsichtig nur, wenn mehr als die Hälfte der Punkte des Blocks durchsichtig ist. Anker halbiert (abgerundet).
function halbAuftrag(s){var W=s.w,H=s.h,P=s.px,w=(W+1)>>1,h=(H+1)>>1,px=new Uint8Array(w*h),y=0,v=[0,0,0,0];
 function zeile(y){var y0=2*y,y1=y0+1<H?y0+1:-1;for(var x=0;x<w;x++){var x0=2*x,x1=x0+1<W?x0+1:-1,m=0,t=0,n=0,c;
   c=P[y0*W+x0];n++;if(c===255)t++;else v[m++]=c;
   if(x1>=0){c=P[y0*W+x1];n++;if(c===255)t++;else v[m++]=c}
   if(y1>=0){c=P[y1*W+x0];n++;if(c===255)t++;else v[m++]=c;if(x1>=0){c=P[y1*W+x1];n++;if(c===255)t++;else v[m++]=c}}
   if(2*t>n||!m){px[y*w+x]=255;continue}var best=v[0],bn=0;for(var a=0;a<m;a++){var z=0;for(var b=0;b<m;b++)if(v[b]===v[a])z++;if(z>bn){bn=z;best=v[a]}}px[y*w+x]=best}}
 return{weiter:function(aus){var y0=y;for(;y<h;y++){if(aus&&y>y0&&((y-y0)&7)===0&&aus())return false;zeile(y)}return true},ergebnis:function(){return{w:w,h:h,ax:s.ax>>1,ay:s.ay>>1,px:px}}}}
function halb(s){var A=halbAuftrag(s);A.weiter(null);return A.ergebnis()}
var OF={RMAX:RMAX,RAMPE:RAMPE,HALB_GR:HALB_GR,VIERTEL_GR:VIERTEL_GR,VIERTEL_GR_ALT:VIERTEL_GR_ALT,halb:halb,halbAuftrag:halbAuftrag,RAMPE_P:RAMPE_P,weltBoden:weltBoden,wbGrenze:wbGrenze,HALTEN_P:HALTEN_P,LISTEN_P:LISTEN_P,PWEIT:PWEIT,HALTEN:HALTEN,LISTEN:LISTEN,HAUS:HAUS,CODES:CODES,FARBE_RGB:FARBE_RGB,neu:neu};
if(typeof module!=='undefined'&&module.exports)module.exports=OF;else root.AT3ORTSFLAECHE=OF;
})(typeof self!=='undefined'?self:this);
