// WAS DIE DATEI TUT: FP1 First Person im Spiel (erst beim ersten Antippen von „First person“ geladen, zusammen mit fp.js und fpwelt.js).
// Man schlüpft in einen Gladiator dort, wo die Karte gerade hinschaut (Entscheidung Thomas 16.11.2026), läuft durch die echte Welt, sieht sich um und tippt
// Objekte an (englische Objektkarte, vorgelesen wie auf der Karte). Nur ansehen, nichts bauen. Zurück zur Karte: die Karte steht dort, wo der Gladiator steht.
// Werte aus M7 (Entscheidung Thomas 16.11.2026): Bild 320 × 180, Sichtweite 24 Felder, Bodenmuster an; Gladiator wie in der Probe (Augen ≈ 1,75 m, Laufen ≈ 3,6 m/s, Rennen × 2,2).
// Wasser sperrt wie in M7 (Brücken, Stege und Furten tragen), Objekte mit Kollision „gesperrt“ sperren ihr Feld.
// Kerne: Den Ausschnitt (96 × 96 Felder) baut der Bildkern aus seinen Kartenstücken (fpausschnitt.js); läuft der Gladiator mehr als 20 Felder von der Mitte weg,
// kommt der nächste Ausschnitt, ohne anzuhalten. Der Hauptkern nimmt nur Eingaben an und zeichnet das kleine Bild (fpwelt.zeichne, Kosten fest, unabhängig von der Weltgröße).
// FP2a: Gebäude sind begehbar (durch Türen und Tore), Wände verdecken, Antippen einer Wand zeigt ihre Objektkarte; beim Bauen kommt der Ausschnitt neu (bauNeu).
// FP2b: Walmdach über fertigen Häusern, innen Decke und eine Stufe dunkler, Hof hell; Dach/Decke antippen zeigt die Objektkarte dach-ziegel.
// FP3: Arbeiter und Karren (später Tiere) laufen auch in First Person: Lage und Infos holt sich die Ansicht je Bild von der Karte (KARTE.bewegte, gleitend
// wie dort, nur Rechnen im Hauptkern, kein neuer Kern-Verkehr), Blickrichtung aus der Bewegung, Arbeiter mit Laufbildern (Stehen, Lauf 1, Stehen, Lauf 2).
// Antippen zeigt dieselbe Karte wie auf der Karte. Läuft jemand in Sichtweite, wird weiter gezeichnet; sonst schaut ein kleiner Wecker alle 0,25 s nach.
// Gezeichnet wird nur, wenn sich etwas bewegt hat, und nur solange die Ansicht offen und sichtbar ist.
// AR2c2: Zuschauer kommen mit (KARTE.bewegte, Lage wie auf der Karte), Bild je nach Blick von vorn, hinten oder der Seite; fehlende Blätter bestellt die Karte nach. Notausschalter ?ar2c2=0.
var AT3FP=(function(){
'use strict';
var AUGE=0.58,TEMPO=1.2,RENNEN=2.2,DREH=1.9,N=96,MITTE=48,NACHLADEN=20,OPT={W:320,H:180,sicht:24,muster:true};
var P={an:false,o:null,w:null,cam:null,arten:null,holt:false,lauf:false,neu:true,zeiten:[],tasten:{},stick:null,letzt:null,ts:0,
 ausschnitte:0,ausschnittMs:[],stueckeNeu:0,buf:null,img:null,d32:null,P32:null,ctx:null,eing:false,drossel:1};
var BEW={},SCHRITT=.25,FOLGE=[1,0,2,0],wecker=0,WX=614400,WAENDE=['wand-stein','wand-tuer','wand-tor'],DACH='dach-ziegel';
// FP2b: Tiefe von Dach/Decke, wenn der Bildpunkt Dach oder Decke zeigt (sonst 0)
function dachVor(X,Y){var r=P.letzt&&P.letzt.dach;if(!r||!r.an)return 0;Y=Math.floor(Y);if(X<0||Y<0||X>=OPT.W||Y>=OPT.H)return 0;var p=Y*r.W+X;
 return r.zs[p]===r.zf&&r.zk[p]===1?r.zb[p]:0}
function S(){return window.AT3_64}
function el(id){return document.getElementById(id)}

// Graues Ersatzbild für nicht übernommene Naturobjekte (Regel 20: Ersatz statt Lücke), wie auf der Karte
function ersatz(id){var s=S(),g=s.naechste(132,128,122,s.PALETTE),r=s.dunkler(g),G=s.ZEICHEN[g],R=s.ZEICHEN[r],z=[];
 for(var y=0;y<40;y++){var t='';for(var x=0;x<12;x++)t+=(x===0||x===11||y===0)?R:G;z.push(t)}
 return{id:id,version:0,ersatz:true,fp:{nah:{w:12,h:40,ax:6,ay:39,z:z}}}}

// Ausschnitt beim Bildkern holen; ist der noch nicht bereit, kurz warten und nochmal fragen
// AR1c2: Arena in voller Größe (Höhenfeld daten/arena-fp.json, einmal geladen; Notausschalter ?ar1c2=0: wie AR1c1, nur Häuschen und Schild)
// AR4: je Art der Anlage ein eigenes Höhenfeld (Sandgrube daten/arena-fp.json, Great Amphitheatre daten/arena-fp-amphitheater.json), jedes einmal geladen
var ANL_AUS=/[?&]ar1c2=0/.test(location.search),ANFP=null,ANFPS={},ANFP_LS={},ANFP_DATEI={'arena-amphitheater':'daten/arena-fp-amphitheater.json'};
function anlFp(){if(ANL_AUS||!P.o.anlage)return Promise.resolve(null);var A=P.o.anlage(),id=A&&A.id||'arena-sandgrube',datei=ANFP_DATEI[id]||'daten/arena-fp.json';ANFP=ANFPS[id]||null;if(ANFP_LS[id])return ANFP_LS[id];
 ANFP_LS[id]=(P.o.json?P.o.json(datei):fetch(datei).then(function(r){return r.ok?r.json():null})).then(function(j){ANFPS[id]=j&&j.format==='at3-arena-fp'?j:null;var B=P.o.anlage();if((B&&B.id||'arena-sandgrube')===id)ANFP=ANFPS[id];return ANFPS[id]}).catch(function(){return null});return ANFP_LS[id]}
function anlDaten(){if(!P.o.anlage)return null;var A=P.o.anlage();if(!A||A.x<0)return null;ANFP=ANFPS[A.id||'arena-sandgrube']||null;if(!ANFP){anlFp();return null}var H=[];if(A.ein)H.push([A.ein[0],A.ein[1]]);if(A.aus)H.push([A.aus[0],A.aus[1]]);
 return{x:A.x,y:A.y,w:A.w,h:A.h,haus:H,fp:ANFP}}
// AR4: In einer sehr großen Anlage (Great Amphitheatre, Ø 47 Felder) reicht die übliche Sichtweite (24 Felder) nicht bis zur Gegenseite. Solange man in der Anlage
// oder dicht davor steht, liegt der Ausschnitt (96 Felder) mittig auf der Anlage statt auf der Kamera, es wird dort nicht nachgeladen, und die Sichtweite reicht
// über die ganze Anlage (SICHT_ANL). Kleine Anlagen (Sandgrube) und alles draußen: wie bisher. Kosten: gemessen in tests/at3-ar4-browser.cjs.
var SICHT=24,SICHT_ANL=47,ANL_ZONE=4;
function anlMitte(wx,wy){if(ANL_AUS||!P.o||!P.o.anlage)return null;var A=P.o.anlage();if(!A||A.x<0||A.w<=30)return null;var mx=A.x+A.w/2,my=A.y+A.h/2,dx=mx-wx;dx-=Math.round(dx/WX)*WX;
 return Math.hypot(dx,my-wy)<A.w/2+ANL_ZONE?{ox:Math.floor(wx+dx)-MITTE,oy:Math.floor(my)-MITTE}:null}
function holen(ox,oy){var o=P.o,sperr=[];for(var id in o.objekte){var k=o.objekte[id].karte;if(k&&k.feld==='x')sperr.push(id)}
 return new Promise(function(ok,no){var n=0;(function frag(){o.karte.frage('fp',{ox:ox,oy:oy,sperr:sperr,anl:anlDaten()}).then(function(r){
   if(r.fehlt||!r.welt){if(++n>40)return no(new Error('picture core not ready'));return setTimeout(frag,250)}ok(r)})})()})}
function annehmen(r){var w=r.welt,F=window.AT3_FPW,L=[],ids=r.arten;
 if(!P.arten){P.arten={};ids.forEach(function(id){P.arten[id]=P.o.objekte[id]||ersatz(id)});['figur-arbeiter','karren-ochse','tier-reh','markt-stand','arena-sand','arena-eingang','arena-ausgang','schild-closed','medicus','leiche'].forEach(function(id){P.arten[id]=P.o.objekte[id]||ersatz(id)})}
 w.obj=L;for(var i=0;i<w.objN;i++){var o={art:ids[w.objArt[i]],x:w.objX[i],y:w.objY[i],r:0,z:0};o.z=F.hoehe(w,o.x,o.y);L.push(o)}
 if(w.anl&&!P.arten[w.anl.id||'arena-sandgrube'])P.arten['arena-sandgrube']=P.o.objekte['arena-sandgrube']||ersatz('arena-sandgrube');
 P.ausschnitte++;P.ausschnittMs.push(r.us/1000);if(P.ausschnittMs.length>20)P.ausschnittMs.shift();P.stueckeNeu+=r.neu||0;return w}

// Begehbaren Platz nahe der Mitte suchen (Kartenmitte kann im Wasser oder in einem Baum liegen)
function platz(w,x,y){var F=window.AT3_FPW;for(var r=0;r<30;r++)for(var dy=-r;dy<=r;dy++)for(var dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
  var px=Math.floor(x)+dx+.5,py=Math.floor(y)+dy+.5;if(F.frei(w,px,py,px+.01,py)&&F.frei(w,px,py,px,py+.01))return{x:px,y:py}}
 return null}

// o: {karte, objekte (übernommene Objekte), cv (Canvas), rahmen, stick, beiObjekt(id, ersatz), beiText(schlüssel)}
function an(o){P.o=o;var k=o.karte.kamera();
 if(!k||k.globus)return Promise.reject(new Error('globe'));
 var ox=Math.floor(k.x)-MITTE,oy=Math.floor(k.y)-MITTE,am=anlMitte(k.x,k.y);if(am){ox=am.ox;oy=am.oy}P.holt=true;
 return anlFp().then(function(){return holen(ox,oy)}).then(function(r){var w=annehmen(r),lx=k.x-w.ox,ly=k.y-w.oy;if(lx<0)lx+=WX;var p=platz(w,lx,ly);P.holt=false;
  if(!p)throw new Error('no ground');
  P.w=w;P.cam={x:p.x,y:p.y,a:-Math.PI/2,z:null};window.AT3_FPW.bewegen(w,P.cam,0,0,1,AUGE);
  groesse();if(!P.eing)eingaben(o.cv);P.an=true;P.neu=true;P.zeiten=[];BEW={};weckerAn();starten();return position()})
 .catch(function(e){P.holt=false;throw e})}
function aus(){P.an=false;P.stick=null;P.tasten={};if(P.o&&P.o.stick)P.o.stick.hidden=true;return position()}
function position(){if(!P.w)return null;var x=(P.w.ox+P.cam.x)%WX;return{x:x<0?x+WX:x,y:P.w.oy+P.cam.y,a:P.cam.a}}

function groesse(){var cv=P.o.cv,W=OPT.W,H=OPT.H;if(cv.width!==W)cv.width=W;if(cv.height!==H)cv.height=H;P.ctx=cv.getContext('2d');P.img=P.ctx.createImageData(W,H);P.buf=new Uint8Array(W*H);
 P.d32=new Uint32Array(P.img.data.buffer);var s=S(),pal=s.PALETTEN[s.PALETTE].farben.map(s.farbe);P.P32=new Uint32Array(64);
 for(var i=0;i<64;i++)P.P32[i]=(255<<24)|(pal[i][2]<<16)|(pal[i][1]<<8)|pal[i][0]}

// ---------- Eingaben (wie in der Probe M7) ----------
function eingaben(cv){P.eing=true;
 window.addEventListener('keydown',function(e){if(!P.an)return;var k=e.key.toLowerCase();if('wasdqe'.indexOf(k)>=0&&k.length===1||/^arrow/.test(k)||k==='shift'){P.tasten[k]=true;starten();if(/^arrow/.test(k))e.preventDefault()}});
 window.addEventListener('keyup',function(e){P.tasten[e.key.toLowerCase()]=false});
 var zeiger={};
 cv.addEventListener('pointerdown',function(e){if(!P.an)return;try{cv.setPointerCapture(e.pointerId)}catch(x){}var r=cv.getBoundingClientRect(),links=e.clientX-r.left<r.width/2&&e.pointerType!=='mouse';
  zeiger[e.pointerId]={x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,t:performance.now(),weit:0};
  if(links&&!P.stick){P.stick={id:e.pointerId,x0:e.clientX,y0:e.clientY,dx:0,dy:0};var st=P.o.stick,rr=P.o.rahmen.getBoundingClientRect();if(st){st.style.left=(e.clientX-rr.left)+'px';st.style.top=(e.clientY-rr.top)+'px';st.hidden=false}starten()}
  e.preventDefault()});
 cv.addEventListener('pointermove',function(e){var z=zeiger[e.pointerId];if(!z||!P.an)return;z.weit=Math.max(z.weit,Math.hypot(e.clientX-z.x0,e.clientY-z.y0));
  if(P.stick&&P.stick.id===e.pointerId){P.stick.dx=e.clientX-P.stick.x0;P.stick.dy=e.clientY-P.stick.y0}
  else{P.cam.a+=(e.clientX-z.x)*0.0065;P.neu=true}z.x=e.clientX;z.y=e.clientY;starten()});
 function ende(e){var z=zeiger[e.pointerId];if(!z)return;delete zeiger[e.pointerId];
  if(P.stick&&P.stick.id===e.pointerId){P.stick=null;if(P.o.stick)P.o.stick.hidden=true}
  if(P.an&&z.weit<8&&performance.now()-z.t<400)antippen(e)}
 cv.addEventListener('pointerup',ende);cv.addEventListener('pointercancel',ende)}
function antippen(e){var cv=P.o.cv,r=cv.getBoundingClientRect(),sx=(e.clientX-r.left)/r.width*OPT.W,sy=(e.clientY-r.top)/r.height*OPT.H,best=null;
 (P.letzt&&P.letzt.treffer||[]).forEach(function(t){if(sx>=t.x0&&sx<t.x1&&sy>=t.y0&&sy<t.y1&&(!best||t.d<best.d))best=t});
 // FP2b: Dach (außen) oder Decke (innen) unter dem Finger: der Bildpunkt zeigt genau, was vorn ist (Stempel des Zeichners)
 var X0=Math.floor(sx),dd=dachVor(X0,sy);if(dd){var wd=P.o.objekte[DACH];if(P.o.beiObjekt)P.o.beiObjekt(DACH,!wd,dd*3);return}
 // FP2a: Wand, Tür oder Tor unter dem Finger, wenn sie näher ist als das Objekt
 var wa=P.letzt&&P.letzt.wand,X=Math.floor(sx);
 if(wa&&X>=0&&X<OPT.W&&wa.d[X]<1e8&&sy>=wa.y0[X]&&sy<wa.y1[X]&&(!best||wa.d[X]<best.d)){var id=WAENDE[wa.typ[X]-1],wo=P.o.objekte[id];
  if(P.o.beiObjekt)P.o.beiObjekt(id,!wo,wa.d[X]*3);return}
 // AR1c2: Arena (Ring, Ränge, Sand) unter dem Finger, wenn sie näher ist als das Objekt: Arena-Karte wie auf der Karte
 var an=P.letzt&&P.letzt.anl;if(an&&X>=0&&X<OPT.W&&an.d[X]<1e8&&sy>=an.y0[X]&&sy<an.y1[X]&&(!best||an.d[X]<best.d)&&P.o.beiBewegt){P.o.beiBewegt('fest',{art:'arena-sandgrube',anl:1},an.d[X]*3);return}
 if(best&&best.o.bew&&P.o.beiBewegt){P.o.beiBewegt(best.o.typ,best.o.karte,best.d*3);return}   // FP3: Arbeiter, Karren
 var ob=best&&P.arten[best.o.art];if(P.o.beiObjekt)P.o.beiObjekt(ob?ob.id:null,ob?!!ob.ersatz:false,best?best.d*3:0)}

// ---------- FP3: bewegte Objekte ----------
// Je Bild: Lage aus der Karte in Ausschnitt-Felder umrechnen, nur was im Ausschnitt liegt. Blickrichtung = letzte Bewegung (sonst Kartenrichtung),
// Pose der Arbeiter nach gelaufener Strecke. Gibt zurück, ob sich in Sichtweite etwas bewegt (dann weiterzeichnen).
var RICHT=[[1,0],[0,1],[0,-1],[-1,0]];   // Kartenrichtung 0 = +x, 1 = +y, 2 = −y, 3 = −x (karren.js richtung)
function bewegte(){var w=P.w,K=P.o.karte;if(!w||!K||!K.bewegte){if(w)w.bew=[];return false}
 var L=K.bewegte(),F=window.AT3_FPW,aus=[],neu={},c=P.cam,r2=(OPT.sicht+2)*(OPT.sicht+2),geht=false;
 for(var i=0;i<L.length;i++){var e=L[i],x=e.x-w.ox,y=e.y-w.oy;if(x<-WX/2)x+=WX;else if(x>WX/2)x-=WX;if(x<0||y<0||x>=N||y>=N)continue;
  var key=e.typ+e.id,a=BEW[key],R=RICHT[e.dir&3]||RICHT[0];
  if(!a)a={hx:R[0],hy:R[1],x:x,y:y,weg:0};else{var dx=x-a.x,dy=y-a.y,l=Math.hypot(dx,dy);if(l>1e-4&&l<2){a.hx=dx/l;a.hy=dy/l;a.weg+=l}else if(!e.geht){a.hx=a.hx*.8+R[0]*.2;a.hy=a.hy*.8+R[1]*.2;var n=Math.hypot(a.hx,a.hy)||1;a.hx/=n;a.hy/=n}}
  a.x=x;a.y=y;neu[key]=a;var nah=(x-c.x)*(x-c.x)+(y-c.y)*(y-c.y)<r2;if(nah&&(e.geht||a.pose))geht=true;
  if(e.typ==='besucher'){if(e.sitzt){a.hx=e.hx;a.hy=e.hy}aus.push({art:'besucher',x:x,y:y,z:F.hoehe(w,x,y),r:0,bew:true,hx:a.hx,hy:a.hy,nb:besBild(e,a,x,y,c),typ:'besucher',karte:e.karte});continue}      // AR2c2
  var pose=(e.typ==='person'||e.typ==='tier')&&e.geht?FOLGE[Math.floor(a.weg/SCHRITT)&3]:0;if(nah&&pose!==a.pose)geht=true;a.pose=pose;
  aus.push({art:e.art,x:x,y:y,z:F.hoehe(w,x,y),r:0,bew:true,hx:a.hx,hy:a.hy,pose:pose,typ:e.typ,karte:e.karte})}
 BEW=neu;besWunsch();if(P.probe&&P.probe.n){probeDazu(aus,w,F);geht=true}w.bew=aus;return geht}
// AR2c2: Zuschauer. Bild je nach Blick: schaut er zur Kamera oder von ihr weg (mehr als 45°), das Bild von vorn bzw. hinten (AR2c1, Stehen, Gehen 1/2, Sitzen),
// sonst die Seitenansicht aus dem Kartenblatt (Reihe 0 schaut nach rechts, 1 nach links; Gehen 8 Bilder, Stehen; Sitzende nur Oberkörper wie auf der Karte).
// Die Bilder liegen schon als Farbnummern vor: Ausschnitt einmal je Typ und Bild gemerkt, nichts Neues je Bild. Fehlt das Blatt: Ersatzbild, Typ wird nachbestellt.
var VB=new Map(),BFEHLT={},bwT=0,bwN=0,ERS=null;
function besNr(typ,B,art,i){var c=VB.get(typ);if(!c||c.B.p64!==B.p64){c={B:B};VB.set(typ,c)}var k=art+i;if(c[k])return c[k];
 var w=B.fw,h=B.fh,hh=h,ay=B.ay,src,sw,x0,y0;if(art==='v'){src=B.vh.p64;sw=B.vh.w;x0=i*w;y0=0}else{src=B.p64;sw=B.w;x0=(i&15)*w;y0=(i>>4)*h;if(art==='k'){hh=B.ay-7;ay=hh}}
 var px=new Uint8Array(w*hh);for(var y=0;y<hh;y++)for(var x=0;x<w;x++)px[y*w+x]=src[(y0+y)*sw+x0+x];return c[k]={w:w,h:hh,ax:B.ax,ay:ay,px:px,k:k}}
function ersatz2(){if(!ERS){var s=S(),n=s.naechste(62,57,52,s.PALETTE),px=new Uint8Array(4*14).fill(n);ERS={w:4,h:14,ax:2,ay:13,px:px,k:'e'}}return ERS}
function besBild(e,a,x,y,c){var K=P.o.karte,B=K.besucherBild?K.besucherBild(e.btyp):null;if(!B){BFEHLT[e.btyp]=1;return ersatz2()}
 var dx=c.x-x,dy=c.y-y,d=Math.hypot(dx,dy)||1,zu=(a.hx*dx+a.hy*dy)/d,re=-a.hx*Math.sin(c.a)+a.hy*Math.cos(c.a),l=Math.hypot(zu,re)||1,lauf=e.geht&&!e.sitzt;
 if(B.vh&&Math.abs(zu)/l>.7071)return besNr(e.btyp,B,'v',(zu<0?4:0)+(e.sitzt?3:lauf?FOLGE[Math.floor(a.weg/SCHRITT)&3]:0));
 var row=re>=0?0:1;if(e.sitzt)return besNr(e.btyp,B,'k',row*16+B.stehen);
 return besNr(e.btyp,B,'s',row*16+(lauf?B.gehen+((Math.floor(a.weg*2/SCHRITT)+(e.id|0))%8):B.stehen))}
// fehlende Blätter höchstens alle 0,3 s an die Karte melden (die bestellt beim Kampfkern wie für die Karte)
function besWunsch(){var L=Object.keys(BFEHLT).map(Number),t=performance.now();BFEHLT={};if(!L.length&&!bwN)return;if(L.length&&t-bwT<300)return;bwT=t;bwN=L.length;
 if(P.o.karte.besucherWunsch)P.o.karte.besucherWunsch(L)}
// FP3-Probe (nur mit ?nosave&fpprobe): n gedachte Arbeiter und Karren (jeder fünfte ein Karren) laufen im Kreis um den Startpunkt, nur zum Messen der Zeichenzeit.
// Nichts davon gelangt in den Weltkern oder den Spielstand.
function probeDazu(aus,w,F){var p=P.probe,t=(performance.now()-p.t0)/1000;
 for(var i=0;i<p.n;i++){var kar=i%5===4,r=2+(i%12)*1.6,v=(kar?1.4:1)/r*(i&1?1:-1),a=i*2.399+t*v,x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r,hx=-Math.sin(a)*(v>0?1:-1),hy=Math.cos(a)*(v>0?1:-1);
  if(x<1||y<1||x>=N-1||y>=N-1)continue;var weg=t*Math.abs(v)*r;
  aus.push({art:kar?'karren-ochse':'figur-arbeiter',x:x,y:y,z:F.hoehe(w,x,y),r:0,bew:true,hx:hx,hy:hy,pose:kar?0:FOLGE[Math.floor(weg/SCHRITT)&3],typ:kar?'karren':'person',karte:{id:9000+i,zust:1,auf:0,darf:3,grund:0,last:0,f0:0,f1:0,warte:0}})}}
// Ablauf: je Stufe (0, 20, 100 Stück) 3 s mit langsam drehender Kamera (jedes Bild neu), Bildzeit p95 je Stufe.
function probe(stufen){stufen=stufen||[0,20,100];if(!P.an)return Promise.reject(new Error('fp off'));var erg=[];
 P.probe={n:0,t0:performance.now(),x:P.cam.x,y:P.cam.y,dreh:.5};
 return stufen.reduce(function(q,n){return q.then(function(){P.probe.n=n;P.zeiten=[];P.neu=true;starten();
   return new Promise(function(ok){setTimeout(function(){erg.push({n:n,bilder:P.zeiten.length,p95:p95(P.zeiten),gezeigt:P.letzt?P.letzt.objekte:0});ok()},3000)})})},Promise.resolve())
 .then(function(){P.probe=null;P.neu=true;starten();return erg})}
// Wecker: steht die Ansicht still, alle 0,25 s nachsehen, ob sich in Sichtweite etwas bewegt
function weckerAn(){if(wecker)return;wecker=setInterval(function(){if(!P.an){clearInterval(wecker);wecker=0;return}if(!P.lauf&&!document.hidden&&bewegte()){P.neu=true;starten()}},250)}

// ---------- Schleife ----------
function starten(){if(P.lauf||!P.an||!P.w)return;P.lauf=true;P.ts=performance.now();requestAnimationFrame(bild)}
function bild(t){if(!P.an||document.hidden){P.lauf=false;return}
 var dt=Math.min(.1,(t-P.ts)/1000);P.ts=t;var c=P.cam,vx=c.x,vy=c.y,va=c.a,vz=c.z;steuern(dt);
 if(c.x!==vx||c.y!==vy||c.a!==va||Math.abs((c.z||0)-(vz||0))>1e-4)P.neu=true;nachladen();var si=P.anlSicht?SICHT_ANL:SICHT;if(si!==OPT.sicht){OPT.sicht=si;P.neu=true}var bw=bewegte();if(bw)P.neu=true;
 if(P.neu){P.neu=false;var F=window.AT3_FP,W=window.AT3_FPW,s=S(),t0=performance.now(),r;
  for(var i=0;i<P.drossel;i++)r=W.zeichne(P.buf,P.w,P.cam,OPT,P.arten,s,F);
  var b=P.buf,d=P.d32,pp=P.P32;for(var k=0;k<b.length;k++)d[k]=pp[b[k]];P.ctx.putImageData(P.img,0,0);
  P.letzt=r;P.zeiten.push(performance.now()-t0);if(P.zeiten.length>120)P.zeiten.shift()}
 var aktiv=bw||!!P.probe||P.stick||Object.keys(P.tasten).some(function(k){return P.tasten[k]})||Math.abs((c.z||0)-(vz||0))>1e-4;
 if(aktiv)requestAnimationFrame(bild);else P.lauf=false}
function steuern(dt){var T=P.tasten,vor=0,seit=0,dreh=0,renn=T.shift;
 if(T.w||T.arrowup)vor+=1;if(T.s||T.arrowdown)vor-=1;if(T.a)seit-=1;if(T.d)seit+=1;if(T.q||T.arrowleft)dreh-=1;if(T.e||T.arrowright)dreh+=1;
 if(P.stick){var dx=P.stick.dx/40,dy=-P.stick.dy/40,l=Math.hypot(dx,dy);if(l>.15){var q=Math.min(1,l);vor+=dy/l*q;seit+=dx/l*q;if(l>1.6)renn=true}}
 if(P.probe)dreh+=P.probe.dreh;P.cam.a+=dreh*DREH*dt;var v=TEMPO*(renn?RENNEN:1);window.AT3_FPW.bewegen(P.w,P.cam,vor*v,seit*v*.8,dt,AUGE)}
// Weiter als NACHLADEN Felder von der Mitte: nächsten Ausschnitt um den Gladiator holen; bis er da ist, läuft man im alten weiter
function nachladen(){if(P.holt||!P.w)return;var c=P.cam,am=anlMitte(P.w.ox+c.x,P.w.oy+c.y);
 if(am&&P.anlNie===am.ox+','+am.oy)am=null;      // am Weltrand lässt sich der Ausschnitt nicht mittig legen: dort wie bisher
 if(am){var ddx=am.ox-P.w.ox;ddx-=Math.round(ddx/WX)*WX;P.anlSicht=!ddx&&am.oy===P.w.oy;if(P.anlSicht)return;if(P.anlVer===am.ox+','+am.oy){P.anlNie=P.anlVer;return}P.anlVer=am.ox+','+am.oy}else{P.anlSicht=false;if(Math.abs(c.x-MITTE)<=NACHLADEN&&Math.abs(c.y-MITTE)<=NACHLADEN)return}
 var alt=P.w,ox=am?alt.ox+ddx:alt.ox+Math.floor(c.x)-MITTE,oy=am?am.oy:alt.oy+Math.floor(c.y)-MITTE;P.holt=true;
 holen(ox,oy).then(function(r){var w=annehmen(r);P.holt=false;if(P.w!==alt)return;var dx=w.ox-alt.ox;if(dx>WX/2)dx-=WX;if(dx<-WX/2)dx+=WX;
  P.cam.x-=dx;P.cam.y-=w.oy-alt.oy;P.w=w;P.neu=true;starten()},function(){P.holt=false})}

// FP2a: Der Weltkern hat gebaut (Baustelle weiter, Tür gesetzt, Abriss): denselben Ausschnitt neu holen, höchstens alle 0,5 s, man läuft dabei weiter.
var bauT=0,bauWart=false;
function bauNeu(){if(!P.an||!P.w)return;if(P.holt||performance.now()-bauT<500){if(!bauWart){bauWart=true;setTimeout(function(){bauWart=false;bauNeu()},500)}return}
 bauT=performance.now();var alt=P.w;P.holt=true;
 holen(alt.ox,alt.oy).then(function(r){var w=annehmen(r);P.holt=false;if(P.w!==alt)return;
  if(!window.AT3_FPW.frei(w,P.cam.x,P.cam.y,P.cam.x+.01,P.cam.y)){var p=platz(w,P.cam.x,P.cam.y);if(p){P.cam.x=p.x;P.cam.y=p.y}}   // eingemauert: zum nächsten freien Platz
  P.w=w;P.neu=true;starten()},function(){P.holt=false})}
function p95(a){var s=a.slice().sort(function(x,y){return x-y});return s.length?s[Math.min(s.length-1,Math.floor(s.length*.95))]:null}
function mess(){var z=P.zeiten;return{an:P.an,bilder:z.length,mittel:z.length?z.reduce(function(a,b){return a+b},0)/z.length:null,p95:p95(z),objekte:P.letzt?P.letzt.objekte:0,bewegte:P.w&&P.w.bew?P.w.bew.length:0,
 ausschnitte:P.ausschnitte,ausschnittP95:p95(P.ausschnittMs),stueckeNeu:P.stueckeNeu,opt:OPT,drossel:P.drossel}}
return{an:an,aus:aus,position:position,mess:mess,probe:probe,bauNeu:bauNeu,zustand:function(){return P},OPT:OPT,AUGE:AUGE};
})();
