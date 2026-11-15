// WAS DIE DATEI TUT: Riesenwelt-Probe von Arena Theory 3.0 (Schritt MK1). Reine Rechnung ohne Bildschirm: Platzhalter-Nationen (je 256 Byte),
// die grob und reihum gerechnet werden, und Platzhalter-Kartenstücke (64 × 64 Felder), die erst bei Bedarf aus dem Seed entstehen.
// Hängt sich in kern.js ein (Befehle nationen, anteil, welt, reise; Auftragsarten nation und stueck) und läuft unverändert im Weltkern,
// in den Helfern und in Node-Tests. Wird nur geladen, wenn ein Riesenwelt-Befehl kommt: das Spiel lädt diese Datei nicht.
// Kerne: Rechnen (rechnen) in den Helferkernen, Vergeben und Übernehmen an festen Ticks im Weltkern, nichts auf dem Hauptkern (Regel 13).
// Riesenwelt (Regel 14): Je Tick wird ein fester Anteil Nationen vergeben, egal wie viele es gibt; bei mehr Nationen wächst nur der Abstand
// zwischen zwei Schritten einer Nation. Kartenstücke: höchstens 7 × 7 im Speicher, egal wie groß die Welt ist. Unberührtes Land = nur Seed.
// Gleichheit: nur ganze Zahlen; jede Nation schreibt nur sich selbst und liest von Nachbarn eine Momentaufnahme vom Vergabe-Tick.
// Platzhalter: Die Regeln der Nationen und das Gelände sind nur Messlast, kein Spielinhalt (Gelände kommt in W1, Nationen in K6).
// Wiederverwendet: Verteiler und Tickübernahme aus kern.js (G2); zustandslose Landschaft und begrenzter Zwischenspeicher nach dem Muster
// von welt-gross-core.js (2.0, nur Vorbild).
(function(root){
'use strict';
var R=64, NBZ=6, NBW=4;                // Zahlen je Nation (256 Byte), Nachbarn je Nation, Zahlen je Nachbar-Momentaufnahme
var MAX_NATIONEN=100000;               // 100.000 nur als Anschlag (Thomas, 15.11.2026); Stufen laut Fahrplan 10 bis 10.000
var ANTEILE=[64,256,1024,4096], JOBS=4;// Nationen je Tick, verteilt auf höchstens 4 Aufträge
var ST=64, ST_BYTES=ST*ST*2;           // Kartenstück 64 × 64 Felder: Höhe und Biom je Feld
var FENSTER=7, HALB=3, ST_JE_TICK=2;   // Stücke um die Probekamera, neue Aufträge je Tick (eigener kleiner Zeitanteil)
var SEITE_20=150, SEITE_AT3=4800;      // Seitenlänge in Kartenstücken: 2.0 (9.600 Felder) und AT3 (307.200 Felder, E9)
var BLOCK=64, FRIST=4;                 // Spielstand-Block (Nationen), Ticks bis zur Übernahme (wie kern.js)
var F={x:1,y:2,volk:3,stimmung:4,gold:5,nachbar:6,bez:12,vorrat:18,zufall:34,schritte:35,tick:36,krieg:37,herr:38};

function mix(a){a=a>>>0;a^=a>>>16;a=Math.imul(a,0x7feb352d);a^=a>>>15;a=Math.imul(a,0x846ca68b);a^=a>>>16;return a>>>0}
function dreh(z){z^=z<<13;z>>>=0;z^=z>>>17;z^=z<<5;return z>>>0}

// Reihenfolge der 49 Fensterplätze: nächste zuerst (Sichtbares zuerst)
var ORDNUNG=(function(){var L=[];for(var y=-HALB;y<=HALB;y++)for(var x=-HALB;x<=HALB;x++)L.push([x,y,x*x+y*y]);L.sort(function(a,b){return a[2]-b[2]||a[1]-b[1]||a[0]-b[0]});return L})();
var RICHT=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];

// ── Zustand ──
function neu(seed){return{n:new Int32Array(0),zahl:0,anteil:ANTEILE[0],zeiger:0,aus:0,gen:1,schritte:0,geaendert:new Uint8Array(0),lager:[],
 seite:0,reise:0,kx:0,ky:0,richt:0,zufall:mix(seed^0x51ed270b)||1,stuecke:new Map(),bestellt:new Map(),stLager:[],suche:false,stFertig:0,stSumme:0,stGen:1}}

function nationenSetzen(z,rw,n){var seed=z.seed,e=new Int32Array(n*R),g=Math.max(1,Math.ceil(Math.sqrt(n))),seite=rw.seite||SEITE_AT3,zelle=Math.max(1,(seite/g)|0);
 for(var i=0;i<n;i++){var p=i*R,h=mix(seed^Math.imul(i+1,0x9e3779b1)),gx=i%g,gy=(i/g)|0;
  e[p]=i;e[p+F.x]=Math.min(seite-1,gx*zelle+h%zelle);h=dreh(h);e[p+F.y]=Math.min(seite-1,gy*zelle+h%zelle);h=dreh(h);
  e[p+F.volk]=500+h%20000;h=dreh(h);e[p+F.stimmung]=300+h%500;h=dreh(h);e[p+F.gold]=h%5000;
  e[p+6]=gx>0?i-1:-1;e[p+7]=gx<g-1&&i+1<n?i+1:-1;e[p+8]=i>=g?i-g:-1;e[p+9]=i+g<n?i+g:-1;
  for(var k=4;k<NBZ;k++){h=dreh(h);var hp=n>1?h%n:-1;e[p+6+k]=hp===i?-1:hp}       // zwei ferne Handelspartner
  for(k=0;k<NBZ;k++){h=dreh(h);e[p+F.bez+k]=(h%1200)-600}
  for(k=0;k<16;k++){h=dreh(h);e[p+F.vorrat+k]=h%4000}
  e[p+F.zufall]=dreh(h)|0;e[p+F.tick]=z.tick;e[p+F.krieg]=-1;e[p+F.herr]=(mix(h)%1000000)|0}
 rw.n=e;rw.zahl=n;rw.zeiger=0;rw.aus=0;rw.gen++;rw.lager=[];rw.geaendert=new Uint8Array(Math.ceil(n/BLOCK))}

function fensterRaeumen(rw){rw.stuecke.forEach(function(b,k){var cx=(k/8192)|0,cy=k%8192;
 if(Math.abs(cx-rw.kx)>HALB||Math.abs(cy-rw.ky)>HALB){rw.stuecke.delete(k);if(rw.stLager.length<8)rw.stLager.push(b)}});rw.suche=true}

function befehl(z,art,wert){var rw=z.rw||(z.rw=neu(z.seed));
 if(art==='nationen')nationenSetzen(z,rw,wert);
 else if(art==='anteil'){rw.anteil=wert;rw.lager=[]}
 else if(art==='welt'){rw.seite=wert;rw.stGen++;rw.stuecke=new Map();rw.bestellt=new Map();rw.stLager=[];rw.kx=rw.ky=wert>>1;rw.suche=wert>0}
 else if(art==='reise')rw.reise=wert}
var ARTEN={
 nationen:function(w){return w===(w|0)&&w>=0&&w<=MAX_NATIONEN},
 anteil:function(w){return ANTEILE.indexOf(w)>=0},
 welt:function(w){return w===0||(w===(w|0)&&w>=16&&w<=SEITE_AT3)},
 reise:function(w){return w===0||w===1||w===2}};

// ── Vergeben (Weltkern, einmal je Tick): fester Anteil Nationen, höchstens zwei neue Kartenstücke ──
function ausgeben(z,neuL){var rw=z.rw,o=z.offen,i,k;
 if(rw.zahl){var s=rw.anteil/JOBS,brutto=s*(R+NBZ*NBW),e=rw.n;
  for(var j=0;j<JOBS;j++){var len=Math.min(s,rw.zahl-rw.zeiger);if(rw.aus+len>rw.zahl)break;       // nie dieselbe Nation zweimal unterwegs
   var b=rw.lager.pop()||new Int32Array(brutto),a0=rw.zeiger*R,q=len*R;
   b.set(e.subarray(a0,a0+q));
   for(i=0;i<len;i++){var p=a0+i*R+6;for(k=0;k<NBZ;k++){var id=e[p+k],m=id*R;
    if(id<0){b[q]=0;b[q+1]=0;b[q+2]=0;b[q+3]=0}else{b[q]=e[m+F.volk];b[q+1]=e[m+F.stimmung];b[q+2]=e[m+F.gold];b[q+3]=e[m+F.vorrat]+e[m+F.vorrat+1]}
    q+=NBW}}
   var nr=z.auftragNr++;o.push({nr:nr,art:'nation',ab:rw.zeiger,len:len,gen:rw.gen,faellig:z.tick+FRIST});
   neuL.push({nr:nr,version:z.version,vorrang:0,art:'nation',n:len,tick:z.tick,daten:b,faellig:z.tick+FRIST});
   rw.aus+=len;rw.zeiger=(rw.zeiger+len)%rw.zahl}}
 if(rw.seite){
  if(rw.reise&&z.tick%10===0){var v=rw.zufall=dreh(rw.zufall);
   if(rw.reise===2&&z.tick%200===0){rw.kx=v%rw.seite;v=rw.zufall=dreh(v);rw.ky=v%rw.seite}        // Sprung: Kamera weit weg
   else{if((v&7)===0)rw.richt=(v>>>3)&7;var d=RICHT[rw.richt],nx=rw.kx+d[0],ny=rw.ky+d[1];
    if(nx<0||nx>=rw.seite||ny<0||ny>=rw.seite){rw.richt=(rw.richt+4)&7;d=RICHT[rw.richt];nx=rw.kx+d[0];ny=rw.ky+d[1]}
    rw.kx=Math.max(0,Math.min(rw.seite-1,nx));rw.ky=Math.max(0,Math.min(rw.seite-1,ny))}
   fensterRaeumen(rw)}
  if(rw.suche){var gab=0,fehlt=false;
   for(i=0;i<ORDNUNG.length&&gab<ST_JE_TICK;i++){var cx=rw.kx+ORDNUNG[i][0],cy=rw.ky+ORDNUNG[i][1];if(cx<0||cy<0||cx>=rw.seite||cy>=rw.seite)continue;
    var key=cx*8192+cy;if(rw.stuecke.has(key))continue;fehlt=true;if(rw.bestellt.has(key))continue;
    var n2=z.auftragNr++;rw.bestellt.set(key,n2);o.push({nr:n2,art:'stueck',key:key,gen:rw.stGen,faellig:z.tick+FRIST});
    neuL.push({nr:n2,version:z.version,vorrang:1,art:'stueck',seed:z.seed,cx:cx,cy:cy,seite:rw.seite,daten:rw.stLager.pop()||null,faellig:z.tick+FRIST});gab++}
   if(!fehlt)rw.suche=false}}}

// ── Übernehmen (Weltkern, am festen Tick, in Reihenfolge der Auftragsnummer) ──
function uebernehmen(z,o,w){var rw=z.rw;if(!rw||!w)return;
 if(o.art==='nation'){if(o.gen!==rw.gen)return;rw.n.set(w.subarray(0,o.len*R),o.ab*R);rw.aus-=o.len;rw.schritte+=o.len;
  for(var b=(o.ab/BLOCK)|0,e=((o.ab+o.len-1)/BLOCK)|0;b<=e;b++)rw.geaendert[b]=1;
  if(w.length===(rw.anteil/JOBS)*(R+NBZ*NBW)&&rw.lager.length<2*JOBS*(FRIST+1))rw.lager.push(w)}
 else{if(o.gen!==rw.stGen)return;if(rw.bestellt.get(o.key)!==o.nr)return;rw.bestellt.delete(o.key);
  var s=0x811c9dc5;for(var i=0;i<ST_BYTES;i+=7)s=Math.imul(s^w[i],0x01000193);rw.stSumme=mix(rw.stSumme^s^o.key);rw.stFertig++;
  var cx=(o.key/8192)|0,cy=o.key%8192;
  if(Math.abs(cx-rw.kx)<=HALB&&Math.abs(cy-rw.ky)<=HALB)rw.stuecke.set(o.key,w);else if(rw.stLager.length<8)rw.stLager.push(w)}}

// ── Rechnen (Helferkern; ohne Helfer der Weltkern in freien Scheiben) ──
function nationRechnen(a){var b=a.daten,n=a.n,tick=a.tick,q=n*R,p,k,g;
 for(var i=0;i<n;i++){p=i*R;var dt=tick-b[p+F.tick];if(dt<1)dt=1;if(dt>1000)dt=1000;                  // grob nachführen: lange nicht gerechnet = größerer Schritt
  var volk=b[p+F.volk],st=b[p+F.stimmung],gold=b[p+F.gold],z=b[p+F.zufall]>>>0||1,krieg=b[p+F.krieg],sum=0,v,grenze=volk*4+1000;
  for(g=0;g<16;g++){z=dreh(z);v=b[p+F.vorrat+g]+((volk*(3+(g&3))*dt)>>12)-((volk*(2+((g*5)&3))*dt)>>12)+((((z&255)-128)*dt)>>4);
   v=v<0?0:v>grenze?grenze:v;b[p+F.vorrat+g]=v;sum+=v>>4}
  st+=b[p+F.vorrat]>volk>>2?(dt>20?20:dt):-(dt>40?40:dt);
  for(k=0;k<NBZ;k++,q+=NBW){if(b[p+6+k]<0)continue;var nv=b[q],ns=b[q+1],ng=b[q+2],nsum=b[q+3],bez=b[p+F.bez+k];
   bez+=((st+ns-1000)>>5)+(((z>>>(k*4))&15)-7);
   if(bez>0){var handel=(sum<nsum?sum:nsum)>>6;gold+=(handel*bez)>>10}
   else if(bez<-600&&krieg<0&&nv<volk*2&&((z>>>8)&1023)<dt*8)krieg=k;
   if(krieg===k){var verlust=(volk>>7)+1;volk-=verlust;gold-=gold>>6;st-=3;bez+=6;if(bez>-200||volk<200)krieg=-1}
   if(ng>gold*4&&bez>300)gold+=(ng-gold)>>9;                                                         // reiche Freunde geben ab
   b[p+F.bez+k]=bez<-1000?-1000:bez>1000?1000:bez}
  gold+=(volk*dt)>>10;gold=gold<0?0:gold>1000000000?1000000000:gold;
  volk+=(((volk>>6)*(st-400))>>10)*(dt>32?32:dt)>>3;volk=volk<100?100:volk>200000?200000:volk;
  st=st<0?0:st>1000?1000:st;
  b[p+F.volk]=volk;b[p+F.stimmung]=st;b[p+F.gold]=gold;b[p+F.zufall]=z|0;b[p+F.krieg]=krieg;b[p+F.tick]=tick;b[p+F.schritte]++}
 return b}

// Platzhalter-Gelände: Wertrauschen in 6 Stufen über Weltkoordinaten (Ränder passen dadurch von selbst), Klima nach Breite, Feuchte als eigene Stufe.
var OKT=[[14,96],[12,64],[10,40],[8,28],[6,16],[4,12]];                                              // [log2 Gitterabstand in Feldern, Gewicht], Summe 256
var hoch=new Uint16Array(ST*ST), ecken=new Uint8Array(25);
function gitter(seed,o,lx,ly){return mix(seed^Math.imul(lx,0x27d4eb2d)^Math.imul(ly,0x165667b1)^Math.imul(o+1,0x9e3779b9))&255}
function stufe(seed,o,ld,gew,gx0,gy0,ziel,setzen){var S=1<<ld,c=ld>=6?1:ST>>ld,lx0=gx0>>ld,ly0=gy0>>ld,x,y;
 for(y=0;y<=c;y++)for(x=0;x<=c;x++)ecken[y*(c+1)+x]=gitter(seed,o,lx0+x,ly0+y);
 for(y=0;y<ST;y++){var ty=gy0+y-(ly0<<ld),cyz=ty>>ld,uy=ld>=8?(ty&(S-1))>>(ld-8):(ty&(S-1))<<(8-ld),r=cyz*(c+1);
  for(x=0;x<ST;x++){var tx=gx0+x-(lx0<<ld),cxz=tx>>ld,ux=ld>=8?(tx&(S-1))>>(ld-8):(tx&(S-1))<<(8-ld),e=r+cxz;
   var o1=ecken[e]*(256-ux)+ecken[e+1]*ux,o2=ecken[e+c+1]*(256-ux)+ecken[e+c+2]*ux,w=(o1*(256-uy)+o2*uy)>>16;
   if(setzen)ziel[y*ST+x]=w*gew;else ziel[y*ST+x]+=w*gew}}}
function stueckRechnen(a){var out=a.daten&&a.daten.length===ST_BYTES?a.daten:new Uint8Array(ST_BYTES),seed=a.seed>>>0,gx0=a.cx*ST,gy0=a.cy*ST,i;
 for(i=0;i<OKT.length;i++)stufe(seed,i,OKT[i][0],OKT[i][1],gx0,gy0,hoch,i===0);
 for(i=0;i<ST*ST;i++)out[i]=hoch[i]>>8;
 stufe(seed^0x6a09e667,9,10,256,gx0,gy0,hoch,true);                                                   // Feuchte
 var breite=((a.cy*510)/a.seite)|0,warm=255-Math.abs(breite-255);
 for(i=0;i<ST*ST;i++){var h=out[i],f=hoch[i]>>8,t=warm-((h>130?h-130:0)),bi;
  if(h<96)bi=0;else if(h<118)bi=1;else if(h<122)bi=2;else if(h>205)bi=9;else if(h>180)bi=8;
  else if(t<50)bi=7;else if(t>190&&f<110)bi=3;else if(f<105)bi=4;else if(f>165&&h<132)bi=6;else bi=5;
  out[ST*ST+i]=bi}
 return out}
function rechnen(a){return a.art==='nation'?nationRechnen(a):stueckRechnen(a)}

// ── Fingerabdruck-Anteil, Speicherzähler, Spielstandgröße, Vorschau ──
function abdruck(rw,f){f(rw.zahl);f(rw.anteil);f(rw.zeiger);f(rw.aus);f(rw.schritte);f(rw.seite);f(rw.reise);f(rw.kx);f(rw.ky);f(rw.richt);f(rw.zufall);f(rw.stFertig);f(rw.stSumme);
 var e=rw.n,n=rw.zahl*R;for(var i=0;i<n;i++)f(e[i])}
function bytes(rw){return rw.n.byteLength+rw.geaendert.byteLength+rw.lager.length*(rw.anteil/JOBS)*(R+NBZ*NBW)*4+(rw.stuecke.size+rw.stLager.length)*ST_BYTES}
// Spielstand: roh = alle Nationen; gepackt = Schätzung mit kurzen Zahlen (1 bis 5 Byte je Zahl); geändert = nur Blöcke, die seit der letzten Frage neu gerechnet wurden.
// Kartenstücke kosten nichts: unberührtes Land ist nur Seed und Generatorversion. Es wird nichts geschrieben (Spielstände kommen in G3).
function stand(rw){var e=rw.n,n=rw.zahl*R,pack=0,i,v;
 for(i=0;i<n;i++){v=e[i];v=v<0?~v:v;pack+=v<64?1:v<8192?2:v<1048576?3:v<134217728?4:5}
 var bl=0;for(i=0;i<rw.geaendert.length;i++)if(rw.geaendert[i]){bl++;rw.geaendert[i]=0}
 return{roh:rw.zahl*R*4,gepackt:pack,bloecke:rw.geaendert.length,geaendert:bl,geaendertRoh:Math.min(rw.zahl,bl*BLOCK)*R*4,stuecke:0}}
function vorschau(rw,out){var S=FENSTER*8,i=0;
 for(var wy=0;wy<FENSTER;wy++)for(var wx=0;wx<FENSTER;wx++){var b=rw.stuecke.get((rw.kx+wx-HALB)*8192+(rw.ky+wy-HALB));
  for(var y=0;y<8;y++)for(var x=0;x<8;x++)out[(wy*8+y)*S+wx*8+x]=b?b[ST*ST+(y*8+4)*ST+x*8+4]:255}
 return out}

var RW={R:R,NBZ:NBZ,NBW:NBW,MAX_NATIONEN:MAX_NATIONEN,ANTEILE:ANTEILE,JOBS:JOBS,ST:ST,ST_BYTES:ST_BYTES,FENSTER:FENSTER,ST_JE_TICK:ST_JE_TICK,SEITE_20:SEITE_20,SEITE_AT3:SEITE_AT3,
 BLOCK:BLOCK,F:F,ARTEN:ARTEN,befehl:befehl,ausgeben:ausgeben,uebernehmen:uebernehmen,rechnen:rechnen,nationRechnen:nationRechnen,stueckRechnen:stueckRechnen,
 abdruck:abdruck,bytes:bytes,stand:stand,vorschau:vorschau};
if(typeof module!=='undefined'&&module.exports)module.exports=RW;else root.AT3RW=RW;
})(typeof self!=='undefined'?self:this);
