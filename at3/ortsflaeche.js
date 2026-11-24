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
(function(root){
'use strict';
var RAMPE=24, HALTEN=12, ST=64, LISTEN=4, HAUS=2097152, HALB_GR=1048576;
var RAMPE_P=8, HALTEN_P=64, LISTEN_P=16, PL_HALTEN=48, PWEIT=2600;   // N7a2c: Hang, Posten gemerkt, Posten mit Liste, Orte mit Postenliste, größter Abstand Ortspunkt → Postenrand (gemessen 2.268 + 18 + Hang)   // N7a2b2: LISTEN Orte mit ganzer Elementliste, HAUS Bytes gemerkte Gebäudebilder
//  RAMPE: Felder Hang rund um die Fläche (eine Höhenstufe = 64 Einheiten je Feld, wie RollerCoaster Tycoon); HALTEN: Orte im Speicher
var CODES='gsomfwepxqyuh', FARBE_RGB=[[104,138,64],[150,128,96],[156,150,138],[216,210,198],[186,160,84],[56,98,150],[112,86,58],[124,154,78],[122,116,108],[140,134,122],[128,92,58],[214,194,146],[146,118,84]];
var DACH_RGB=[150,66,48], WAND_RGB=[202,180,140], MAUER_RGB=[150,146,136];
function neu(G,BB){var WX=BB.WX,orte=new Map(),gefragt=new Set(),F=null,FB=null,sprite=new Map(),SBx=null,KL=null,EMS=[];
 var POSTEN=false,PL=new Map(),gefragtP=new Set(),LIP=[],IDX=new Map(),PST={listen:0,ms:0,maxMs:0};   // N7a2c
 var ECHT=true,HGR=HAUS,LI=[],HB=new Map(),HBB=0,AUF=[],AKT=null,ABSCHNITTE=true,INQ=new Set(),FERTIG=new Set(),GEB=new Set(),HST={wieder:0,gebaut:0,ms:0,maxMs:0,listen:0,listeMs:0,verworfen:0,pausen:0};   // N7a2b2   // N7a2b1: SBx = stadtbild.js, KL = Kartei-Lader (bilder())
 var HALBAN=true,K2=new Map(),K2B=0,K2GR=HALB_GR,AUF2=[],INQ2=new Set(),AKT2=null,GEB2=new Set(),HN=new Set(),H2ST={gebaut:0,ms:0,maxMs:0,verworfen:0,pausen:0};   // N7a3a: Stufe ½ (K2 = gemerkte halbe Bilder)
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
   Z:new Uint8Array(W*W),bauten:[],fach:new Map(),aus:new Set(),ms:m.ms,ersatz:m.ersatz,t:++zeit,P:P,E:null,wartet:false,posten:m.ort!=null,ort:m.ort,art:m.art,R:m.ort!=null?RAMPE_P:RAMPE},i,j;   // N7a2c: posten, Hang R   // N7a2b1: Plan für die echten Böden
  for(i=0;i<W*W;i++){var c=CODES.indexOf(P.zellen.charAt(i));o.Z[i]=c<0?0:c}
  P.bauten.forEach(function(b){if(!(b.w>0&&b.h>0))return;var e={i:b.i,j:b.j,w:b.w,h:b.h,m:b.rolle==='mauer'},fi=b.i+b.w-1,fj=b.j+b.h-1,key=(fi>>3)*4096+(fj>>3);   // Fach nach dem vordersten Feld (8 × 8)
   o.bauten.push(e);var f=o.fach.get(key);if(!f)o.fach.set(key,f=[]);f.push(e)});
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
 function bedarf(A,seed,OR,AP,kx,ky,HALB,bau){var fx0=(kx-HALB)*ST,fy0=(ky-HALB)*ST,fn=(2*HALB+1)*ST,mx=fx0+(fn>>1),my=fy0+(fn>>1),L=[],da=new Set(),R=RAMPE;
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
 function schneidet(q,WN){var L=q.lage,R=RAMPE_P,dx=(L.x0-R)-WN.x0;dx%=WX;if(dx>WX/2)dx-=WX;else if(dx<-WX/2)dx+=WX;var dy=(L.y0-R)-WN.y0,N=L.W+2*R;
  return dx<WN.n&&dx+N>0&&dy<WN.n&&dy+N>0}
 // N7a2c: Antwort „posten“ des Ortskerns merken (höchstens PL_HALTEN Orte; wer herausfällt, darf neu gefragt werden)
 function postenListe(m){gefragtP.delete(m.k);var t=m.liste||[];PL.delete(m.k);PL.set(m.k,t);PST.listen++;if(m.ms!=null){PST.ms=m.ms;if(m.ms>PST.maxMs)PST.maxMs=m.ms}
  while(PL.size>PL_HALTEN){var a=PL.keys().next().value;PL.delete(a)}return t.length}
 // N7a2c Startplatz: liegt (x, y) in einem Posten (Fläche + Hang + rand)? punkte = [{x, y}] Postenpunkte (ohne Plan: halbe Fläche PMAX, größter Plan 18 × 18);
 // ohne punkte die gemerkten Postenlisten (mit echter Planbreite). Gibt {k, x, y, halb, dx, dy} wie imOrt oder null
 var PMAX=9;
 function imPosten(x,y,rand,punkte){rand=rand||8;var L=punkte||[];if(!punkte)PL.forEach(function(Q){Q.forEach(function(q){L.push({x:q.lage.punkt[0],y:q.lage.punkt[1],W:q.lage.W,k:q.k})})});
  for(var a=0;a<L.length;a++){var q=L[a],h=(q.W?q.W>>1:PMAX)+RAMPE_P+rand,dx=x-q.x;if(dx>WX/2)dx-=WX;else if(dx<-WX/2)dx+=WX;var dy=y-q.y;
   if(Math.abs(dx)<=h&&Math.abs(dy)<=h)return{k:q.k,x:q.x,y:q.y,halb:h,dx:dx,dy:dy}}return null}
 // N7a2c: Orte, deren Posten (x, y) erreichen könnten (ohne=true: nur die ohne gemerkte Liste)
 function orteUm(A,seed,OR,x,y,ohne){var L=[],zx0=Math.floor((x-PWEIT)/G.ZF),zx1=Math.floor((x+PWEIT)/G.ZF),zy0=Math.max(0,Math.floor((y-PWEIT)/G.ZF)),zy1=Math.min(G.GH-1,Math.floor((y+PWEIT)/G.ZF));
  for(var zy=zy0;zy<=zy1;zy++)for(var zx=zx0;zx<=zx1;zx++){var X=((zx%G.GW)+G.GW)%G.GW,z=zy*G.GW+X;if(!(A.ort[z]&15))continue;var k=OR.ortNr(A,z);if(k==null||ohne&&PL.has(k))continue;
   var p=G.ortPunkt(seed,A,X,zy),dx=p[0]-x;if(dx>WX/2)dx-=WX;else if(dx<-WX/2)dx+=WX;if(Math.abs(dx)<=PWEIT&&Math.abs(p[1]-y)<=PWEIT)L.push(k)}
  return L}
 // Ein frisch gerechnetes Kartenstück (b = weltgen-Puffer) einebnen; gibt true, wenn sich etwas geändert hat
 function flachen(b,cx,cy){if(!orte.size)return false;var s=BB.sicht(b),H=s.H,B=s.B,k=cx*8192+cy,ja=false;
  orte.forEach(function(o){if(o.aus.has(k))return;var R=o.R,W=o.W,N=W+2*R,i0=lok(o,cx*ST)+R,j0=cy*ST-o.y0+R;
   if((i0>=N&&i0<WX-ST)||j0>=N||j0+ST<=0)return;
   for(var y=0;y<ST;y++){var j=j0+y;if(j<0||j>=N)continue;for(var x=0;x<ST;x++){var i=i0+x;if(i>=WX)i-=WX;if(i<0||i>=N)continue;
     var d=Math.max(i<R?R-i:i>=R+W?i-R-W+1:0,j<R?R-j:j>=R+W?j-R-W+1:0),q=(y<<6)|x,h=H[q],z;
     if(d===0)z=o.h0;else{var bb=B[q];if(bb<2||bb===10||bb===11)continue;var lo=o.h0-d*64,hi=o.h0+d*64;z=h<lo?lo:h>hi?hi:h;if(z<0)z=0}
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
 function bodenBilder(o,i,j,lod){var r0=bodenBilder1(o,i,j);if(!r0||!lod)return r0;var r2=[];for(var q=0;q<r0.length;q++)r2.push(klein(r0[q]));return r2}   // N7a3a: ½ = verkleinert
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
 function klein(sp){var c=k2(sp);if(c)return c.sp;var r=halb(sp);k2Rein(sp,{sp:r});return r}
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
   hausRein(w.key,{sp:r.sp,X:r.X,Y:r.Y});HST.gebaut++;
   if(w.halb&&!K2.has(w.key)){INQ2.add(w.key);AUF2.unshift({k:w.k,q:w.q,key:w.key,E:w.E,fi:w.fi,fj:w.fj})}   // N7a3a: für ½ gebaut → als Nächstes verkleinern (vorn, sonst verdrängen sich die 1×-Bilder im Kreis)
   if(w.halb){HN.delete(w.key);if(!w.voll)continue}   // nur für ½ gebaut: kein „ortNeu“ für 1× (erscheint mit dem halben Bild)
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
  return false}
 function arbeitOffen(){if(AUF.length||AKT||AUF2.length||AKT2)return true;var X=LI.concat(LIP);for(var a=0;a<X.length;a++){var o=orte.get(X[a]);if(o&&o.fuell)return true}return false}
 // Elemente eines Orts, deren vorderstes Feld in diesem Bild liegt (1×; N7a3a auch ½ = lod 1): Einträge wie natur.sammeln; fehlt ein Gebäudebild, der Klotz und ein Bauauftrag
 function elementeIns(o,aus,i0,j0,n,lod){lod=lod||0;var E=o.E,L=E.L,N=L.length,z=0,dx=E.ax+(i0-j0)*32,dy=E.ay+(i0+j0)*16+o.s0*8,hw=32>>lod,hh=16>>lod,st=8>>lod;
  for(var fj=Math.max(0,j0)>>3;fj<=Math.min(o.W-1,j0+n-1)>>3;fj++)for(var fi=Math.max(0,i0)>>3;fi<=Math.min(o.W-1,i0+n-1)>>3;fi++){var f=o.EF.get(fi*4096+fj);if(!f)continue;
   for(var a=0;a<f.length;a++){var q=f[a],e=L[q],vi=e.fi-i0,vj=e.fj-j0;if(vi<0||vj<0||vi>=n||vj>=n)continue;var tief=o.RT[q]-i0-j0+(q+1)/(N+2),sp,x,y;
    if(e.k===1){sp=SBx.malbild(KL.hole(e.id));if(!sp){o.wartet=true;continue}if(lod)sp=klein(sp);x=(e.X-dx)>>lod;y=(e.Y-dy)>>lod}
    else{var key=hausKey(o,q),c=lod?k2(key):HB.get(key);
     if(c){if(!lod){HB.delete(key);HB.set(key,c)}sp=c.sp;x=(c.X-dx)>>lod;y=(c.Y-dy)>>lod}
     else{var b=e.b,li=e.fi-e.fw+1-i0,lj=e.fj-e.fh+1-j0;sp=klotz(e.fw,e.fh,(b.rolle==='mauer'?20:28)>>lod,lod,b.rolle==='mauer');x=(li-lj)*hw;y=(li+lj)*hh-o.s0*st;
      if(!lod){if(!INQ.has(key)){INQ.add(key);AUF.push({k:o.k,q:q,key:key,E:E,fi:e.fi,fj:e.fj})}else if(HN.has(key))voll(key)}
      else if(!INQ2.has(key)){INQ2.add(key);AUF2.push({k:o.k,q:q,key:key,E:E,fi:e.fi,fj:e.fj})}}}
    aus.push({tief:tief,i:vi,o:1,m:0,sp:sp,x:x,y:y});z++}}
  return z}
 // ein für ½ angestoßener 1×-Bau wird auch in 1× gebraucht: dann meldet er sich auch für 1× fertig
 function voll(key){for(var a=0;a<AUF.length;a++)if(AUF[a].key===key){AUF[a].voll=true;return}if(AKT&&AKT.w.key===key)AKT.w.voll=true}
 // Für ein Bodenbild (Felder x0.., y0.., n je Seite): Zugriff fürs Bodenbild oder null, wenn kein Ort es schneidet
 function fuerBild(x0,y0,n,lod,f){if(!orte.size)return null;var L=[];orte.forEach(function(o){var i=lok(o,x0),j=y0-o.y0;if((i<o.W||i>WX-n)&&j<o.W&&j+n>0)L.push(o)});if(!L.length)return null;
  var FBx=farben(f),k0=stk(x0,y0);L=L.filter(function(o){return !o.aus.has(k0)});if(!L.length)return null;
  return{farbe:FBx.boden,wasser:FBx.wasser,
   zelle:function(X,Y){for(var a=0;a<L.length;a++){var o=L[a],i=lok(o,X),j=Y-o.y0;if(i>=0&&i<o.W&&j>=0&&j<o.W)return o.Z[j*o.W+i]}return -1},
   frei:function(X,Y){for(var a=0;a<L.length;a++){var o=L[a],i=lok(o,X),j=Y-o.y0;if(i>=0&&i<o.W&&j>=0&&j<o.W)return false}return true},
   // N7a2b1: echter Boden des Planfelds unter (X, Y) als Liste von Bildern (Boden, dann Säume) oder null (Kartei-Bild fehlt noch → Ersatzfarbe, Ort wartet), nur in 1×
   boden:(lod===0||lod===1&&HALBAN)&&SBx&&KL?function(X,Y){for(var a=0;a<L.length;a++){var o=L[a],i=lok(o,X),j=Y-o.y0;if(i>=0&&i<o.W&&j>=0&&j<o.W)return bodenBilder(o,i,j,lod)}return null}:null,   // N7a3a: auch ½
   // Klötze, deren vorderstes Feld in diesem Bild liegt (Einträge wie natur.sammeln: tief, i, o, m, sp, x, y), nur in 1× und ½
   kloetze:function(aus){if(lod>1)return 0;var z=0,hw=32>>lod,hh=16>>lod,st=8>>lod;
    L.forEach(function(o){var i0=lok(o,x0),j0=y0-o.y0;if(i0>=WX-n)i0-=WX;
     if((lod===0||lod===1&&HALBAN)&&ECHT&&SBx&&KL&&o.E!==false){listeWunsch(o);if(o.EF&&o.E){z+=elementeIns(o,aus,i0,j0,n,lod);return}}   // N7a3a: ½ wie 1×, verkleinert   // N7a2b2: echte Häuser, Mauern, Dinge (bis die Liste da ist: Klötze)
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
  postenAn:function(an){POSTEN=!!an},   // N7a2c: Posten einschalten (Notausschalter ?n7a2c=0 lässt es aus)
  postenStand:function(){var n=0,b=0;orte.forEach(function(o){if(o.posten){n++;if(o.EF)b++}});return{posten:n,listen:LIP.length,orteMitListe:PL.size,anfragen:gefragtP.size,ms:PST.ms,maxMs:PST.maxMs}},aufnehmen:aufnehmen,stuecke:stuecke,bedarf:bedarf,flachen:flachen,bei:bei,frei:frei,fuerBild:fuerBild,imOrt:imOrt,hinaus:hinaus,
  // N7a2b1: echte Böden einschalten (sb = stadtbild.js, kl = karteilader.js neu(…)); wartende() → Kartenstücke der Orte, die auf Kartei-Bilder gewartet haben
  bilder:function(sb,kl,opt){SBx=sb||null;KL=kl||null;ECHT=!(opt&&opt.haeuser===false);HGR=opt&&opt.hausSpeicher||HAUS;ABSCHNITTE=!(opt&&opt.abschnitte===false);HALBAN=!(opt&&opt.halb===false);K2GR=opt&&opt.halbSpeicher||HALB_GR},   // N7a3a: opt.halb:false = ½ bleibt bei den Klötzen (?n7a3=0), halbSpeicher nur für Tests   // N7a2b3: opt.abschnitte:false = Gebäudebilder am Stück (Notausschalter ?n7a2b3=0)   // hausSpeicher: nur für Tests   // N7a2b2: opt.haeuser:false = Gebäude bleiben Klötze (Notausschalter ?n7a2b2=0)
  schritt:schritt,arbeitOffen:arbeitOffen,
  fertige:function(){var L=[];FERTIG.forEach(function(k){L.push(k)});FERTIG.clear();return L},fertigeZahl:function(){return FERTIG.size},
  messNeu:function(){HST.maxMs=0;HST.listeMs=0;HST.pausen=0;PST.maxMs=0;H2ST.maxMs=0;H2ST.pausen=0},   // N7a2b3: Höchstwerte neu (Messfeld)
  haeuser:function(){return{listen:LI.length,bilder:HB.size,bytes:HBB,grenze:HGR,auftraege:AUF.length,gebaut:HST.gebaut,wieder:HST.wieder,ms:HST.ms,maxMs:HST.maxMs,listeMaxMs:HST.listeMs,listenVerworfen:HST.verworfen,pausen:HST.pausen,angefangen:!!AKT}},
  halbStand:function(){return{an:HALBAN,bilder:K2.size,bytes:K2B,grenze:K2GR,auftraege:AUF2.length,gebaut:H2ST.gebaut,ms:H2ST.ms,maxMs:H2ST.maxMs,verworfen:H2ST.verworfen,pausen:H2ST.pausen,angefangen:!!AKT2}},   // N7a3a
  wartende:function(){var L=[];orte.forEach(function(o){if(!o.wartet)return;o.wartet=false;L=L.concat(stuecke(o))});return L},
  elementeMs:function(){var m=0;EMS.forEach(function(v){if(v>m)m=v});return m},
  leeren:function(){orte.clear();gefragt.clear();PL.clear();gefragtP.clear();IDX.clear();LIP.length=0;LI.length=0;AUF.length=0;INQ.clear();FERTIG.clear();GEB.clear();AUF2.length=0;INQ2.clear();AKT2=null;GEB2.clear();HN.clear()},vergessenAlle:function(){gefragt.clear();gefragtP.clear()},vergessen:function(k){gefragt.delete(k)},
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
var OF={RAMPE:RAMPE,HALB_GR:HALB_GR,halb:halb,halbAuftrag:halbAuftrag,RAMPE_P:RAMPE_P,HALTEN_P:HALTEN_P,LISTEN_P:LISTEN_P,PWEIT:PWEIT,HALTEN:HALTEN,LISTEN:LISTEN,HAUS:HAUS,CODES:CODES,neu:neu};
if(typeof module!=='undefined'&&module.exports)module.exports=OF;else root.AT3ORTSFLAECHE=OF;
})(typeof self!=='undefined'?self:this);
