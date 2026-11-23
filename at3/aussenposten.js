// WAS DIE DATEI TUT: Außenposten und Gehöfte von Arena Theory 3.0 (Schritt N5c): je Ort Minen, Steinbrüche, Holzfäller, Fischer, Jäger … an passenden
// Vorkommen im Umkreis (5 × 5 Erdzellen) und Gehöfte (G0) auf Ackerland, mit Feld, Leuten, Name und Anschluss an den Ort als Daten.
// Alles entsteht aus Seed und Erde, nichts davon liegt in der Erde (Erde und Fingerabdruck unverändert). Gleicher Seed + gleicher Ort = gleiche Posten.
// „Vorkommen“ = eine Erdzelle nahe dem Ort, deren Klimazone zum Biom des Gebäudes passt (daten/gebaeude.json, N5a); Küste = Land mit Wasser daneben,
// Fluss = Zelle mit Fluss. Ein Posten liegt nie in der Ortszelle, nie in einer anderen Ortszelle, nie im Wasser; jede Zelle höchstens ein Posten.
// Entscheidungen Thomas (21.11.2026): nur Vorkommen und Gehöfte (Fort, Zoll, Herberge mit N5d; Kloster, Schmuggler, fremder Ludus später), Anzahl nach
// Größe, Straßenanschluss jetzt als Daten (Pfad im Gelände mit N5d), Anzeige im Editor und im Spiel. Anzahl, Leute und Spitznamen von Thomas bestätigt (21.11.2026); die Feldlage prüft N6.
// Zwei Teile: umgebung() braucht nur die Erde (Bildkern beim Antippen, Master-Editor), posten() dazu die Daten (orte.js daten()) und die Ortsbilanz.
// Grenze: Das Feld in der Zelle ist fest aus dem Seed gewählt; ob dort im Gelände Fels oder ein Teich liegt, prüft erst N6 beim Setzen des Bilds.
// Kerne: reine Rechnung ohne Bildschirm, rund 25 µs je Ort (24 Zellen, Testmaschine). Kosten nur je angetipptem Ort, nie je Weltgröße.
// Notausschalter ?n5c=0: keine Außenposten (Editor ohne Einfärbung „Außenposten“, Ortskarte ohne Posten, Ortsbilanz ohne Posten).
// N6b4b1 Abstand (Thomas 23.11.2026): Ein Posten liegt mindestens ABST Felder vom Rand jedes fremden Ortsbilds, immer näher am eigenen Ort als an jedem
// fremden, und außerhalb des eigenen Ortsbilds (Rand + EIGEN). Halbe Bildbreite je Größe HALB (gemessen mit stadtbild.js, größte von 6 Biomen × 2 Seeds)
// plus Reserve RES für die Felder aus N6b4b2. Passt der alte Punkt in der Zelle nicht, probiert der Posten bis zu VERSUCHE weitere Punkte, sonst die nächste
// Zelle; findet er keine, fällt er weg. Fremde Orte kommen aus fremde() (Umkreis ±FERN Zellen); ohne sie gilt nur die Regel zum eigenen Bild.
(function(root){
'use strict';
var AUS=!!(root.location&&/[?&]n5c=0/.test(root.location.search||''));
var GW=600, GH=300, ZF=1024, UM=2;
// Arten: Gebäude-Kennung → Gruppe (für Spitznamen). Gehöfte stehen in HOF.
var VORK={'iron-mine':'mine','copper-mine':'mine','tin-mine':'mine','silver-mine':'mine','gold-wash':'mine','sulphur-pit':'mine',
 quarry:'stein','marble-quarry':'stein',woodcutter:'holz','resin-tapper':'holz',charcoal:'holz',
 fisher:'nass','sea-fishery':'nass','reed-cutter':'nass','peat-cut':'nass','salt-pan':'nass',hunter:'jagd',trapper:'jagd'};
var HOF={'wheat-farm':1,'barley-farm':1,'oat-farm':1,'sheep-farm':1,'cattle-ranch':1,'pig-farm':1,'goat-pen':1,'olive-grove':1,vineyard:1,orchard:1};
var SPITZ={mine:3,stein:3,holz:3,nass:3,jagd:3,hof:3};      // Zahl der Spitznamen je Gruppe (sprache/en.json posten.spitz.<gruppe>.<n>)
// Anzahl je Ortsgröße G0–G7 (Vorschlag): Außenposten, Gehöfte; höchste Gebäudestufe wie orte.js
var NV=[0,0,1,1,2,3,4,5], NH=[0,0,1,1,2,2,3,3], STUFE=[0,0,2,3,4,5,6,6], MAXP=8;
var ABST=300, EIGEN=40, HALB=[0,0,25,54,66,87,129,174], RES=[0,0,8,8,10,12,20,25], FERN=5, VERSUCHE=6;
function halb(g){return(HALB[g]||HALB[7])+(RES[g]||RES[7])}
function mix(a){a=a>>>0;a^=a>>>16;a=Math.imul(a,0x7feb352d);a^=a>>>15;a=Math.imul(a,0x846ca68b);a^=a>>>16;return a>>>0}
function zz(seed,zelle,salz){return mix((seed>>>0)^Math.imul(zelle+1,0x27d4eb2f)^Math.imul(salz+1,0x165667b1))}
function u01(h){return(h>>>8)/16777216}
function istLand(b){return b>=2&&b<=9||b>=13}

// Umgebung des Orts k: Landzellen im Umkreis ohne Ortszellen, je [zelle, zone, Bits (1 Ring 1, 2 Küste, 4 Fluss), dx, dy]
function umgebung(seed,A,k){var c=A.orte[k],z=c&0xffffff,x=z%GW,y=(z/GW)|0,L=[],dx,dy,u,v;
 for(dy=-UM;dy<=UM;dy++){var Y=y+dy;if(Y<0||Y>=GH)continue;for(dx=-UM;dx<=UM;dx++){if(!dx&&!dy)continue;var X=(x+dx+GW)%GW,i=Y*GW+X,b=A.bio[i];
  if(!istLand(b)||A.ort&&(A.ort[i]&15))continue;var f=Math.abs(dx)<=1&&Math.abs(dy)<=1?1:0;
  for(v=-1;v<=1&&!(f&2);v++){var Y2=Y+v;if(Y2<0||Y2>=GH)continue;for(u=-1;u<=1;u++)if(A.bio[Y2*GW+(X+u+GW)%GW]<2){f|=2;break}}
  if(A.flu&&A.flu[i]>0)f|=4;L.push([i,A.zon?A.zon[i]&15:0,f,dx,dy])}}
 return L}

// Fremde Orte um Ort k (N6b4b1): [[x, y, Radius des Ortsbilds]], punkt = weltgen.ortPunkt, O = orte.js (für die Größe; fehlt es, gilt die größte)
function fremde(seed,A,k,punkt,O){if(!punkt||!A.ort)return null;var c=A.orte[k],z=c&0xffffff,x=z%GW,y=(z/GW)|0,L=[],dx,dy;
 for(dy=-FERN;dy<=FERN;dy++){var Y=y+dy;if(Y<0||Y>=GH)continue;for(dx=-FERN;dx<=FERN;dx++){var X=(x+dx+GW)%GW,i=Y*GW+X;if(i===z||!(A.ort[i]&15))continue;
  var p=punkt(seed,A,X,Y),kk=O&&O.ortNr?O.ortNr(A,i):null,g=kk!=null&&O.groesse?O.groesse(seed,A,kk):7;L.push([p[0],p[1],halb(g)])}}
 return L}
function abst(ax,ay,bx,by){var ex=ax-bx,ey=ay-by;if(ex>GW*ZF/2)ex-=GW*ZF;else if(ex<-GW*ZF/2)ex+=GW*ZF;return Math.sqrt(ex*ex+ey*ey)}

// Daten vorbereiten (einmal, an D aus orte.js daten() gemerkt): Arten mit Zonenmaske, Küste, Fluss, Stufe
function arten(D){if(D._n5c)return D._n5c;var bz={},L=[];for(var q in D.zon)bz[D.zon[q]]=+q;
 D.G.forEach(function(g,nr){var gr=VORK[g.id]||(HOF[g.id]?'hof':null);if(!gr)return;var m=0,B=g.biom||[];B.forEach(function(id){if(bz[id]!=null)m|=1<<bz[id]});
  var nz=0;for(var w=m;w;w&=w-1)nz++;
  L.push({nr:nr,id:g.id,name:g.name,stufe:g.stufe||1,gruppe:gr,hof:gr==='hof',zonen:m,kueste:B.indexOf('coast')>=0,fluss:B.indexOf('river')>=0,eigen:Math.sqrt(2/(1+nz))})});
 try{Object.defineProperty(D,'_n5c',{value:L})}catch(x){}return L}
function passt(a,e){return !!(a.zonen&(1<<e[1]))||a.kueste&&(e[2]&2)||a.fluss&&(e[2]&4)}

// Posten des Orts: b = Ortsbilanz (orte.js bilanz), U = umgebung(), P = Ortspunkt [x, y] in Feldern (optional, sonst Zellmitte), F = fremde() (N6b4b1, optional)
// Ergebnis [{nr,id,name,gruppe,hof,g (0 Gehöft, 1 Außenposten),zelle,dx,dy,x,y,vor,arb,weg,spitz}]
function posten(seed,b,U,D,P,F){if(AUS||!U||!U.length)return[];var r=b.roh,g=r.g,z=r.zelle,A=arten(D),leit={},belegt={},aus=[];
 b.leit.forEach(function(l){leit[l.id]=1});
 var ox=P?P[0]:(z%GW)*ZF+ZF/2,oy=P?P[1]:((z/GW)|0)*ZF+ZF/2,rO=halb(g)+EIGEN;
 // Punkt in Zelle e für Art a: der alte Punkt (Versuch 0) oder ein weiterer; null = keiner hält die Abstände ein
 function punktIn(e,a){for(var t=0;t<VERSUCHE;t++){var h=zz(seed,e[0],500+a.nr+t*7919),fx=(e[0]%GW)*ZF+192+(h%640),fy=((e[0]/GW)|0)*ZF+192+((h>>>12)%640),dO=abst(fx,fy,ox,oy),ok=dO>=rO;
   if(ok&&F)for(var q=0;q<F.length&&ok;q++){var dF=abst(fx,fy,F[q][0],F[q][1]);if(dF<=dO||dF<F[q][2]+ABST)ok=false}
   if(ok)return[fx,fy,dO]}return null}
 function runde(hof,n){if(n<=0)return;var C=[];
  A.forEach(function(a){if(a.hof!==hof||a.stufe>STUFE[g])return;var s=0,bw=-1;
   U.forEach(function(e,j){if(!passt(a,e))return;var w=(e[2]&1?2:1)*(a.zonen&(1<<e[1])?1:.35);s+=w;      // nur über Küste/Fluss passend zählt schwächer
   var h=w*4+u01(zz(seed,e[0],300+a.nr));if(h>bw)bw=h});
   if(!s)return;s=s/12*a.eigen*(leit[a.id]?2:1)*(.55+.9*u01(zz(seed,z,400+a.nr)));C.push({a:a,s:s})});
  C.sort(function(p,q){return q.s-p.s||p.a.nr-q.a.nr});
  for(var i=0;i<C.length&&n>0;i++){var a=C[i].a,K=[];      // freie Zellen dieser Art nach Güte: Ring 1 zuerst, dann Zufall; erste mit gültigem Punkt
   U.forEach(function(e,k){if(belegt[e[0]]||!passt(a,e))return;K.push([(e[2]&1?2:1)*4+u01(zz(seed,e[0],300+a.nr)),k])});
   K.sort(function(p,q){return q[0]-p[0]||p[1]-q[1]});var j=-1,pt=null;for(var kq=0;kq<K.length&&!pt;kq++){pt=punktIn(U[K[kq][1]],a);if(pt)j=K[kq][1]}
   if(j<0)continue;var e=U[j],h=zz(seed,e[0],500+a.nr),fx=pt[0],fy=pt[1];
   belegt[e[0]]=1;n--;
   aus.push({nr:a.nr,id:a.id,name:a.name,gruppe:a.gruppe,hof:hof,g:hof?0:1,zelle:e[0],dx:e[3],dy:e[4],x:fx,y:fy,
    vor:1,arb:hof?1+(h>>>22)%4:3+(h>>>22)%6+(a.stufe>=4?4:0),weg:Math.round(pt[2]),
    spitz:(h>>>26)%3===0?(h>>>28)%SPITZ[a.gruppe]:-1})}}
 runde(false,NV[g]+(g===3?zz(seed,z,600)&1:0));runde(true,NH[g]);
 aus.length=Math.min(aus.length,MAXP);return aus}

// Anzeige (t = Übersetzer, ort = voller Ortsname ohne Zusatz)
function name(p,ort,t){return t('posten.name',{ort:ort,art:p.name})+(p.spitz>=0?t('posten.spitz.'+p.gruppe+'.'+p.spitz):'')}
function zeile(p,ort,t){return t(p.hof?'posten.zeile.hof':'posten.zeile',{name:name(p,ort,t),leute:p.vor+p.arb,weg:String(p.weg).replace(/\B(?=(\d{3})+(?!\d))/g,",")})}
function kurzListe(L,t){if(!L.length)return t('posten.keine');return t('posten.liste',{liste:L.map(function(p){return t(p.hof?'posten.kurz.hof':'posten.kurz',{art:p.name,leute:p.vor+p.arb})}).join(', ')})}

var P={AUS:AUS,VORK:VORK,HOF:HOF,SPITZ:SPITZ,NV:NV,NH:NH,MAXP:MAXP,ABST:ABST,EIGEN:EIGEN,HALB:HALB,RES:RES,FERN:FERN,halb:halb,fremde:fremde,abst:abst,umgebung:umgebung,arten:arten,posten:posten,name:name,zeile:zeile,kurzListe:kurzListe};
if(typeof module!=='undefined'&&module.exports)module.exports=P;else root.AT3POSTEN=P;
})(typeof self!=='undefined'?self:this);
