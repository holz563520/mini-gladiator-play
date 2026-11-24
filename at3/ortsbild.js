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
// Plan sicher bauen: SB = stadtbild.js. Echte Orte treffen Lagen, die im Editor selten vorkommen; scheitert der Plan (z. B. „Außenring passt nicht“),
// plant er ohne Vor-den-Toren-Ring und Umland (opt.aussen:false) und meldet das in ersatz. Nie ohne Bild, nie ein Absturz im Bildkern.
function planen(SB,opt){try{return{P:SB.plan(opt),ersatz:null}}catch(e){var o=Object.assign({},opt,{aussen:false});return{P:SB.plan(o),ersatz:'ohne-aussen',fehler:e.message}}}
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
var M={ZONE_BIOM:ZONE_BIOM,biomVon:biomVon,planSeed:planSeed,religion:religion,wahl:wahl,planen:planen,punkt:punkt,lage:lage,toreAus:toreAus,ausgaenge:ausgaenge,posten:posten,postenLage:postenLage};
if(typeof module!=='undefined'&&module.exports)module.exports=M;else G.AT3ORTSBILD=M})(typeof self!=='undefined'?self:this);
