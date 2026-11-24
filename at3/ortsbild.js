// WAS DIE DATEI TUT: Ort der Welt → Ortsbild (AT3 Schritt N7a1, Thomas 24.11.2026). Bindeglied zwischen Seed-Welt (weltgen.js, orte.js, aussenposten.js) und
// Stadtplan (stadtbild.js plan/postenPlan): wahl() macht aus einem echten Ort die Planwahl (Gebäudeliste aus der Ortsbilanz, Biom aus der Hauptzone, Fluss, Küste,
// Burgberg, Religion, Plan-Seed), lage() legt den fertigen Plan in Weltfelder (Mitte = Ortspunkt, 1 Bildfeld = 1 Weltfeld, j wie y nach Süden) und nennt Tore
// der Mauer und Ausgänge der Straßen am Bildrand; posten() und postenLage() dasselbe für Außenposten und Gehöfte. Reine Rechnung ohne Bildschirm, läuft in
// Bildkern (ab N7a2), Master-Editor (Reiter „Stadtbilder“, Wahl „Echter Ort“) und Node. Gleicher Seed + gleicher Ort = gleiche Wahl auf jedem Gerät.
// Baustil der Kultur wird nur genannt (stilKultur), nicht angewendet: die Baustile kommen mit N6d, bis dahin baut jeder Ort „nach Biom“.
// Kosten: Wahl unter 1 ms (Bilanz und Gebäudeliste), der Plan selbst wie in stadtbild.js (Großstadt bis 0,7 s, darum im Hintergrund, N7a2). Erde unverändert.
(function(G){
'use strict';
// Hauptzone (daten/gebaeude.json biome, Nummer wie A.zon) → Biom der Ortsbilder (daten/ortsbilder.json). Steppe baut wie Grasland, Taiga wie Nadelwald.
// Schnee hat nur Außenposten (stadtbild.js nurAussenposten): Orte dort bauen wie Tundra. Küste und Fluss sind Lagen: dann zählt die nächste Zone.
var ZONE_BIOM={tundra:'tundra',taiga:'conifer',broadleaf:'broadleaf',grassland:'grassland',steppe:'grassland',mediterranean:'mediterranean',desert:'desert',
 savanna:'savanna',rainforest:'rainforest',swamp:'swamp',mangroves:'mangrove',mountains:'mountain',snow:'tundra'},ERSATZ='grassland';
var SEITE=['south','north','east','west'];
function zz(seed,z,k){var h=Math.imul((seed>>>0)^Math.imul(z+1,2654435761),2246822519)^Math.imul(k+1,3266489917);h^=h>>>15;h=Math.imul(h,2246822519);h^=h>>>13;return h>>>0}
// zonen = [[Zonennummer, Anteil], …] wie orte.roh, ZON = Zonennummer → Kennung (orte.daten().zon); posten: Schnee bleibt Schnee
function biomVon(zonen,ZON,posten){for(var i=0;i<zonen.length;i++){var id=ZON[zonen[i][0]];if(posten&&id==='snow')return 'snow';if(ZONE_BIOM[id])return ZONE_BIOM[id]}return ERSATZ}
// Plan-Seed je Ort (Zelle), unabhängig von der Nummer des Orts in der Liste
function planSeed(seed,zelle){return zz(seed,zelle,7001)}
// Religion des Orts: erste der bis zu 3 Religionen (A.vk.rel, Nummer in religionen.json ab 1) → Kennung; ohne Völker null (stadtbild.js nimmt die des Bioms)
function religion(A,k,REL){if(!A.vk||!A.vk.rel||!REL)return null;var n=A.vk.rel[k*6];return n&&REL[n-1]?REL[n-1].id:null}
// D = {O: orte.js, DD: orte.daten(), SL: stadtliste.js, SLD: stadtliste.daten(), REL: religionen.json religionen, KK: kulturen.json kulturkreise}
// Ergebnis {opt (für stadtbild.plan), roh, bilanz, name, stilKultur}
function wahl(seed,A,k,D,ON){var O=D.O,r=O.roh(seed,A,k,ON),b=O.bilanz(seed,r,D.DD),biom=biomVon(r.zonen,D.DD.zon,false);
 var opt={liste:D.SL.ausBilanz(b,biom,seed,D.SLD),biom:biom,seed:planSeed(seed,r.zelle)};
 var fa=O.flussAchse(seed,A,k);if(fa)opt.fluss=fa;
 if(r.kueste){var ks=O.kuesteSeite(seed,A,k);if(ks)opt.kueste=ks}
 if(O.huegel(seed,A,k))opt.huegel=true;
 var rel=religion(A,k,D.REL);if(rel)opt.religion=rel;
 var kk=D.KK&&r.kultur?D.KK.filter(function(c){return c.nr===r.kultur})[0]:null;
 return{opt:opt,roh:r,bilanz:b,name:r.name,stilKultur:kk?kk.baustil:null}}
// Plan sicher bauen: SB = stadtbild.js. Echte Orte treffen Lagen, die im Editor selten vorkommen; scheitert der Plan (z. B. „Außenring passt nicht“) auch mit
// den Ausweich-Seeds, plant er ohne Vor-den-Toren-Ring und Umland (opt.aussen:false) und meldet das in ersatz. Nie ohne Bild, nie ein Absturz im Bildkern.
// N7a1b (Thomas 24.11.2026): vorher bis zu AUSWEICH andere Plan-Seeds (gleicher Ort, gleiche Liste, nur anders angelegt; z. B. Küste + Fluss ließen am
// Stinktor keinen Platz für die Elendsbuden). ausweich = Nummer des genommenen Seeds (0 = eigener). Gleicher Ort = gleiches Ergebnis auf jedem Gerät.
var AUSWEICH=4;
function planen(SB,opt){var f1=null;for(var a=0;a<=AUSWEICH;a++){var o=a?Object.assign({},opt,{seed:(opt.seed+a*7919)>>>0}):opt;
  try{var r={P:SB.plan(o),ersatz:null};if(a){r.ausweich=a;r.fehler=f1}return r}catch(e){if(!f1)f1=e.message}}
 var o2=Object.assign({},opt,{aussen:false});return{P:SB.plan(o2),ersatz:'ohne-aussen',fehler:f1}}
// Ortspunkt in Weltfeldern (weltgen.ortPunkt)
function punkt(WG,seed,A,k){var z=A.orte[k]&0xffffff;return WG.ortPunkt(seed,A,z%WG.GW,(z/WG.GW)|0)}
function welt(WG,x){var w=WG.GW*WG.ZF;x%=w;return x<0?x+w:x}
// Mauertore: zusammenhängende Torfelder des Wehrs (P.wehr: k Feldnummern, f je Feld 4 Zeichen, Art 't'); Seite = Richtung von der Bildmitte
function toreAus(P){var Wh=P.wehr;if(!Wh||!Wh.k||!Wh.k.length)return[];var W=P.W,ist={},L=[],i,q;
 for(i=0;i<Wh.k.length;i++)if(Wh.f.charAt(i*4)==='t')ist[Wh.k[i]]=1;
 var seen={};Object.keys(ist).forEach(function(s){var k0=+s;if(seen[k0])return;var st=[k0],n=0,si=0,sj=0;seen[k0]=1;
  while(st.length){q=st.pop();var qi=q%W,qj=(q/W)|0;n++;si+=qi;sj+=qj;[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){var ni=qi+d[0],nj=qj+d[1],nk=nj*W+ni;if(ni>=0&&nj>=0&&ni<W&&nj<W&&ist[nk]&&!seen[nk]){seen[nk]=1;st.push(nk)}})}
  L.push({i:si/n,j:sj/n,felder:n})});
 var m=(W-1)/2;L.forEach(function(t){var di=t.i-m,dj=t.j-m;t.seite=Math.abs(dj)>=Math.abs(di)?(dj>0?'south':'north'):(di>0?'east':'west');t.i=Math.round(t.i);t.j=Math.round(t.j)});
 L.sort(function(a,b){return SEITE.indexOf(a.seite)-SEITE.indexOf(b.seite)||a.i-b.i||a.j-b.j});return L}
// Ausgänge am Bildrand: Läufe aus Straße (s) oder Feldweg (h) auf der äußersten Feldreihe je Seite → Mitte, Breite, Art
function ausgaenge(P){var W=P.W,Z=P.zellen,L=[],seiten=[['north',function(n){return n}],['south',function(n){return(W-1)*W+n}],['west',function(n){return n*W}],['east',function(n){return n*W+W-1}]];
 seiten.forEach(function(s){var a=-1,c='';for(var n=0;n<=W;n++){var z=n<W?Z.charAt(s[1](n)):'';var weg=z==='s'||z==='h';
  if(weg&&a<0){a=n;c=z}else if(a>=0&&(!weg||z!==c)){var mi=(a+n-1)/2,k=s[1](Math.round(mi));L.push({seite:s[0],i:k%W,j:(k/W)|0,breite:n-a,art:c==='s'?'strasse':'feldweg'});a=-1;if(weg){a=n;c=z}}}});
 return L}
// Lage des fertigen Plans in der Welt: x0, y0 = Weltfeld der Bildecke (Feld i = 0, j = 0), W Felder je Seite; Tore und Ausgänge zusätzlich mit x, y in Weltfeldern
function lage(WG,seed,A,k,P){var p=punkt(WG,seed,A,k),h=P.W>>1,x0=welt(WG,p[0]-h),y0=p[1]-h,an=function(t){t.x=welt(WG,x0+t.i);t.y=y0+t.j;return t};
 return{punkt:[p[0],p[1]],x0:x0,y0:y0,W:P.W,mauer:!!(P.wehr&&P.wehr.k&&P.wehr.k.length),tore:toreAus(P).map(an),ausgaenge:ausgaenge(P).map(an)}}
// Außenposten und Gehöfte des Orts (aussenposten.js posten) mit Planwahl (planOpt, Biom aus der Zone der Postenzelle); D wie wahl(), dazu AP = aussenposten.js
function posten(WG,seed,A,k,D,AP,w){w=w||wahl(seed,A,k,D);var P0=punkt(WG,seed,A,k),U=AP.umgebung(seed,A,k),F=AP.fremde?AP.fremde(seed,A,k,WG.ortPunkt,D.O):null;
 return AP.posten(seed,w.bilanz,U,D.DD,P0,F).map(function(p){var u=U.filter(function(q){return q[0]===p.zelle})[0],biom=u?biomVon([[u[1],100]],D.DD.zon,true):w.opt.biom;
  return{p:p,opt:AP.planOpt(seed,p,P0,biom)}})}
// Lage eines Postenplans: Mitte = Postenpunkt (p.x, p.y), Ausgang = Anschluss des Feldwegs zum eigenen Ort
function postenLage(WG,p,P){var h=P.W>>1,x0=welt(WG,p.x-h),y0=p.y-h,Q=P.posten,r=Q&&Q.weg&&Q.weg.rand;
 return{punkt:[p.x,p.y],x0:x0,y0:y0,W:P.W,tore:[],ausgaenge:r?[{seite:Q.anschluss.seite,i:r.i,j:r.j,breite:1,art:'feldweg',x:welt(WG,x0+r.i),y:y0+r.j}]:[]}}
// N7a5a1 (Thomas 24.11.2026): Wassermaske aus der Welt. Je Ort einmal die echten Felder aus dem Weltgenerator (gleiche Kartenstücke wie das Bodenbild),
// quadratisch um den Ortspunkt: Seite N = größte Planseite der Ortsgröße (gemessen Seed 563520: Weiler ≤ 69, Dorf ≤ 101, Marktflecken ≤ 168, Stadt ≤ 213,
// mit Reserve) plus Hangring 24 Felder je Seite. 1 Byte je Feld: Bit 0–1 Wasser (0 Land, 1 Meer, 2 Fluss, 3 See), Bit 2 Strand, Bit 3–7 Höhe in Zeichenstufen
// (64 = 4 Felder) gegen die Höhe am Ortspunkt, −16 … +15 (Wert + 16, Ränder abgeschnitten). Außerhalb der Welt (Pole) Land auf Ortshöhe.
// Lage: Feld (u, v) der Maske = Weltfeld (x0 + u, y0 + v); Planfeld (i, j) = Maske (i + N/2 − W/2, j + N/2 − W/2), maskeBei(). Reine Rechnung, Erde unverändert.
// Kosten: (N/64 + 1)² Kartenstücke, Großstadt rund 36 (Messung im Test at3-n7a5a1); läuft im Ortskern (Hintergrund), nie auf dem Hauptkern.
// N7a5a1 nur die Maske (opt.welt); der Plan nutzt sie ab N7a5a2/N7a5a3, Sperrkarte und Wegsuche ab N7a5a4.
var MASKE_S=[96,96,96,128,192,240,288,320], MASKE_R=24, M_MEER=1, M_FLUSS=2, M_SEE=3, M_STRAND=4;
function maskeSeite(g){g=g|0;return MASKE_S[g<0?0:g>7?7:g]+2*MASKE_R}
// WG = weltgen.js, A = Ansicht der fertigen Erde (mit Orten und Wegen), g = Ortsgröße, h0 = Höhe am Ortspunkt (1/16 Feld), puf = Auftragspuffer (WG.GEL_BYTES) oder nichts
function wasserMaske(WG,seed,A,k,g,h0,puf){var t0=Date.now(),p=punkt(WG,seed,A,k),N=maskeSeite(g),x0=welt(WG,p[0]-(N>>1)),y0=p[1]-(N>>1),m=new Uint8Array(N*N),
  ST=64,F=WG.FELDER,WY=WG.GH*WG.ZF,SX=WG.GW*WG.ZF/ST,nW=0,nS=0,cx,cy,u,v;
 puf=puf||new Uint8Array(WG.GEL_BYTES);m.fill(16<<3);
 var c0=Math.floor(x0/ST),c1=Math.floor((x0+N-1)/ST),r0=Math.floor(Math.max(0,y0)/ST),r1=Math.floor((Math.min(WY,y0+N)-1)/ST);
 for(cy=r0;cy<=r1;cy++)for(var c=c0;c<=c1;c++){cx=((c%SX)+SX)%SX;var b=WG.ausschnitt(A,cx,cy,puf);WG.gelaende({seed:seed,cx:cx,cy:cy,daten:b});nS++;
  var H=new Uint16Array(b.buffer,b.byteOffset,F),B=new Uint8Array(b.buffer,b.byteOffset+F*2,F),gx=c*ST-x0,gy=cy*ST-y0;
  for(var y=0;y<ST;y++){v=gy+y;if(v<0||v>=N)continue;for(var x=0;x<ST;x++){u=gx+x;if(u<0||u>=N)continue;var q=(y<<6)|x,bb=B[q],
    w=bb<2?M_MEER:bb===10?M_FLUSS:bb===11?M_SEE:0,s=(H[q]-h0)>>6;if(s<-16)s=-16;else if(s>15)s=15;if(w)nW++;m[v*N+u]=w|(bb===2?M_STRAND:0)|((s+16)<<3)}}}
 return{x0:x0,y0:y0,N:N,m:m,wasser:nW,stuecke:nS,ms:Date.now()-t0}}
// Feld der Maske zum Planfeld (i, j) eines Plans mit Seite W (Mitte auf dem Ortspunkt wie lage()); außerhalb der Maske −1
function maskeBei(M,W,i,j){var o=(M.N>>1)-(W>>1),u=i+o,v=j+o;return u<0||v<0||u>=M.N||v>=M.N?-1:M.m[v*M.N+u]}
var M={AUSWEICH:AUSWEICH,ZONE_BIOM:ZONE_BIOM,biomVon:biomVon,planSeed:planSeed,religion:religion,wahl:wahl,planen:planen,punkt:punkt,lage:lage,toreAus:toreAus,ausgaenge:ausgaenge,posten:posten,postenLage:postenLage,MASKE_S:MASKE_S,MASKE_R:MASKE_R,M_MEER:M_MEER,M_FLUSS:M_FLUSS,M_SEE:M_SEE,M_STRAND:M_STRAND,maskeSeite:maskeSeite,wasserMaske:wasserMaske,maskeBei:maskeBei};
if(typeof module!=='undefined'&&module.exports)module.exports=M;else G.AT3ORTSBILD=M})(typeof self!=='undefined'?self:this);
