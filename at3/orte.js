// WAS DIE DATEI TUT: Orte von Arena Theory 3.0 (Schritt N5b): Größe G2–G7, Einwohner je Stufe, bis zu 6 Leitgebäude mit Anzahl, Name mit satirischem Zusatz
// und die kompakte Ortsbilanz (256 Byte, AT3_WIRTSCHAFT 13.2). Alles entsteht aus Seed und Erde (Orte, Klimazonen, Völker, Herrschaften), nichts davon liegt
// in der Erde (Erde und Fingerabdruck unverändert). Gleicher Seed + gleicher Ort = gleiche Bilanz auf jedem Gerät.
// Zwei Teile: roh() braucht nur die Erde (Bildkern beim Antippen, Master-Editor), bilanz() dazu die Daten (gebaeude, rezepte, kulturen; vorbereitet mit daten()).
// Entscheidungen Thomas (20.11.2026): Größe nach Herrschaft (Reichssitz G7, Sitz mittlerer Stufe und Vasallenreich G6, Sitz unterster Stufe G5, sonstige
// Städte G4, Dörfer G2/G3 je zur Hälfte, Häfen eine Stufe mehr bis G5), Namen ganz im Klang der Kultur (ortsnamen.js), jeder 4. Ort mit satirischem
// Zusatz (Texte im Chat freigegeben, sprache/en.json ort.zusatz.*), Anzeige im Editor und im Spiel. Einwohner nach AT3_WIRTSCHAFT 5.1 (Vorschlag),
// Anteile je Stufe, Zahl der Leitgebäude und ihre Anzahl sind Vorschläge (Regel 11).
// Kerne: reine Rechnung ohne Bildschirm. roh() rund 2 µs je Ort (25 Zellen), Sitztafel einmal je Welt (alle Einheiten), bilanz() rund 20 µs je Ort.
// Notausschalter ?n5b=0: keine Ortskarte im Spiel, Editor ohne Einfärbung „Ortsgrößen“, Namen wie W1b.
(function(root){
'use strict';
var AUS=!!(root.location&&/[?&]n5b=0/.test(root.location.search||''));
var GW=600, GH=300, N=GW*GH, UM=2;                    // Umkreis der Zonenmischung: 5 × 5 Erdzellen um den Ort
var GNAME=['','','hamlet','village','market-town','city','great-city','capital'];
// Einwohner je Größe (AT3_WIRTSCHAFT 5.1), höchste Stufe je Größe, Anteile je Stufe 1–6 (Wretches … Nobles) in Promille, Vorschlag
var EINW=[null,null,[30,150],[150,600],[600,3000],[3000,20000],[20000,150000],[150000,1000000]];
var HOCH=[0,0,2,3,4,5,6,6], ANTEIL=[200,450,200,100,40,10];
// Leitgebäude je Größe (Zahl), Grundmenge des ersten, höchste Gebäudestufe je Größe
var LEIT=[0,0,2,3,4,5,6,6], MENGE=[0,0,2,4,8,16,32,60], STUFE=[0,0,2,3,4,5,6,6];
// Zusätze: Zahl der Texte je Gruppe (sprache/en.json ort.zusatz.<gruppe>.<n>, muss passen, tests/at3-n5b.cjs)
var ZUS={kueste:3,fluss:2,gebirge:2,wueste:2,sumpf:2,schnee:2,wald:2,gras:2,mittelmeer:2,regenwald:2,
 wein:2,erz:2,gold:2,fisch:2,salz:2,holz:2,vieh:2,gerberei:2,oel:2,stein:2,tempel:2,handel:2,arena:2,getreide:2,jagd:2,
 reichssitz:2,sitz:2,klein:2,sonst:10};
// Leitgebäude → Gruppe des Zusatzes
var GEB_ZUS={vineyard:'wein',winepress:'wein','wine-cellar':'wein','iron-mine':'erz','copper-mine':'erz','tin-mine':'erz','sulphur-pit':'erz',
 'silver-mine':'gold','gold-wash':'gold',fisher:'fisch','sea-fishery':'fisch',garum:'fisch','oyster-bed':'fisch','murex-pens':'fisch','salt-pan':'salz',
 woodcutter:'holz',forester:'holz',sawmill:'holz','resin-tapper':'holz',charcoal:'holz','sheep-farm':'vieh','cattle-ranch':'vieh','pig-farm':'vieh',
 'goat-pen':'vieh','stud-farm':'vieh',meadow:'vieh','olive-grove':'oel','oil-press':'oel',quarry:'stein','marble-quarry':'stein',limekiln:'stein',
 harbour:'handel',shipyard:'handel','wheat-farm':'getreide','barley-farm':'getreide','oat-farm':'getreide',hunter:'jagd',trapper:'jagd',furrier:'jagd'};
// Biom-Kennung der Hauptzone → Gruppe der Lage
var BIOM_ZUS={tundra:'schnee',snow:'schnee',taiga:'wald',broadleaf:'wald',grassland:'gras',steppe:'gras',savanna:'gras',mediterranean:'mittelmeer',
 desert:'wueste',rainforest:'regenwald',swamp:'sumpf',mangroves:'sumpf',mountains:'gebirge'};

function mix(a){a=a>>>0;a^=a>>>16;a=Math.imul(a,0x7feb352d);a^=a>>>15;a=Math.imul(a,0x846ca68b);a^=a>>>16;return a>>>0}
function zz(seed,zelle,salz){return mix((seed>>>0)^Math.imul(zelle+1,0x85ebca6b)^Math.imul(salz+1,0xc2b2ae35))}
function u01(h){return(h>>>8)/16777216}
function istLand(b){return b>=2&&b<=9||b>=13}

// Höchster Sitz je Ort (Größe 5–7, 0 = kein Sitz), einmal je Welt, am Ortsfeld der Erde gemerkt
function sitze(A){var O=A.orte;if(O._n5bSitz)return O._n5bSitz;var nO=O.length,S=new Uint8Array(nO);
 if(A.hs){var T=A.hs.tab,n=A.hs.zahl[0],kind=new Uint8Array(n),u;for(u=0;u<n;u++){var ob=T[u*4];if(ob)kind[ob-1]=1}
  for(u=0;u<n;u++){var st=T[u*4+2]&3,g=st===0?(T[u*4+3]&256?6:7):kind[u]?6:5,s=T[u*4+1];if(s<nO&&g>S[s])S[s]=g}}
 try{Object.defineProperty(O,'_n5bSitz',{value:S})}catch(x){}return S}
// Größe 2–7 des Orts k
function groesse(seed,A,k){var c=A.orte[k],z=c&0xffffff,art=c>>>24,h=zz(seed,z,1)&1,g=art===2?4:art===4?5:art===3?3+h:2+h;return Math.max(g,sitze(A)[k])}
// Ort k (Nummer in A.orte) in Zelle suchen
function ortNr(A,zelle){var O=A.orte;if(!O._n5bNr){var M=new Map();for(var k=0;k<O.length;k++)M.set(O[k]&0xffffff,k);try{Object.defineProperty(O,'_n5bNr',{value:M})}catch(x){return M.get(zelle)}}return O._n5bNr.get(zelle)}

// Rohdaten aus der Erde: Größe, Kultur, Zonenmischung (bis 4 Zonen mit Anteil in %), Küste, Fluss, Sitz, Name (ON = ortsnamen.js, optional)
function roh(seed,A,k,ON){var c=A.orte[k],z=c&0xffffff,art=c>>>24,x=z%GW,y=(z/GW)|0,Z=new Uint16Array(16),n=0,kue=art>=3,flu=A.flu&&A.flu[z]>0,dx,dy;
 for(dy=-UM;dy<=UM;dy++){var Y=y+dy;if(Y<0||Y>=GH)continue;for(dx=-UM;dx<=UM;dx++){var X=(x+dx+GW)%GW,i=Y*GW+X,b=A.bio[i];
  if(Math.abs(dx)<=1&&Math.abs(dy)<=1){if(b<2)kue=true;if(A.flu&&A.flu[i]>=2)flu=true}
  if(!istLand(b)||!A.zon)continue;var w=dx===0&&dy===0?3:Math.abs(dx)<=1&&Math.abs(dy)<=1?2:1;Z[A.zon[i]&15]+=w;n+=w}}
 var L=[];for(var q=0;q<16;q++)if(Z[q])L.push([q,Z[q]]);L.sort(function(a,b){return b[1]-a[1]||a[0]-b[0]});L.length=Math.min(L.length,4);
 var zonen=L.map(function(e){return[e[0],Math.round(e[1]*100/Math.max(1,n))]});
 var kultur=A.vk&&A.vk.vol[z]?A.vk.tab[A.vk.vol[z]-1]>>>24:0;
 return{k:k,zelle:z,art:art,g:groesse(seed,A,k),sitz:sitze(A)[k],kultur:kultur,zonen:zonen,kueste:kue,fluss:!!flu,einheit:A.hs?A.hs.ort[k]:0,
  name:ON?ON.name(seed,z,art,A.vk):''}}

// Daten vorbereiten (einmal): Kandidaten für Leitgebäude (Wirtschaft, Biom nicht „alle“), Zonen, Lieblingswaren je Kultur
function daten(geb,rez,kul){var G=geb.gebaeude,zon={},bz={},aus={},K=[];
 (geb.biome||[]).forEach(function(b){if(b.zone!=null){zon[b.zone]=b.id;bz[b.id]=b.zone}});
 (rez.rezepte||[]).forEach(function(r){(r.aus||[]).forEach(function(a){if(!a.verkauf)(aus[r.geb]||(aus[r.geb]={}))[a.w]=1})});
 var kand=[];G.forEach(function(g,nr){var L=g.biom||[];if(!/^economy\//.test(g.zweig||'')||L.indexOf('alle')>=0||!L.length)return;
  var m=0;L.forEach(function(id){if(bz[id]!=null)m|=1<<bz[id]});
  var nz=0;for(var q=m;q;q&=q-1)nz++;
  kand.push({nr:nr,id:g.id,name:g.name,stufe:g.stufe||1,zonen:m,eigen:Math.sqrt(2/(1+nz)),kueste:L.indexOf('coast')>=0,fluss:L.indexOf('river')>=0,aus:aus[g.id]||{}})});
 ((kul&&kul.kulturkreise)||[]).forEach(function(c){K[c.nr]={id:c.id,waren:c.waren||[],werte:c.werte||{},system:c.system}});
 return{G:G,kand:kand,zon:zon,K:K}}

// Ortsbilanz aus Rohdaten und Daten: Einwohner je Stufe, Leitgebäude [{nr,id,name,n}], Zusatz {gruppe,n} oder null
function bilanz(seed,r,D){var g=r.g,z=r.zelle,K=D.K[r.kultur]||null,an={},s;
 r.zonen.forEach(function(e){an[e[0]]=e[1]/100});
 // Einwohner: gleichmäßig auf der Log-Skala in der Spanne der Größe, verteilt auf die Stufen bis zur höchsten
 var E=EINW[g],ges=Math.round(E[0]*Math.pow(E[1]/E[0],u01(zz(seed,z,2)))),hoch=HOCH[g],sum=0,i,je=[0,0,0,0,0,0];
 for(i=0;i<hoch;i++)sum+=ANTEIL[i];var rest=ges;for(i=hoch-1;i>0;i--){je[i]=Math.round(ges*ANTEIL[i]/sum);rest-=je[i]}je[0]=rest;
 // Leitgebäude: Punkte = Anteil der passenden Zonen + Küste + Fluss, mal Eigenart (Wurzel aus 2 / (1 + Zahl der Zonen)), mal Lieblingsware der Kultur, mal Zufall; Häfen setzen den Hafen nach vorn
 var C=[];D.kand.forEach(function(b){if(b.stufe>STUFE[g])return;s=0;for(var q in an)if(b.zonen&(1<<q))s+=an[q];
  if(s>0||!b.zonen){if(r.kueste&&b.kueste)s+=.3;if(r.fluss&&b.fluss)s+=.2}if(s<=0)return;   // Küste und Fluss zählen nur mit passender Zone (außer reinen Küsten- und Flussgebäuden)
  s*=b.eigen;if(K&&K.waren.some(function(w){return b.aus[w]}))s*=1.5;   // Allzweckgebäude (viele Zonen) zählen weniger als typische
  if(b.id==='harbour'&&r.art>=3)s+=10;
  C.push({b:b,s:s*(.55+.9*u01(zz(seed,z,100+b.nr)))})});
 C.sort(function(a,b){return b.s-a.s||a.b.nr-b.b.nr});C.length=Math.min(C.length,LEIT[g]);
 var leit=C.map(function(c,j){var n=Math.max(1,Math.round(MENGE[g]*(1-j*.14)*(.6+.8*u01(zz(seed,z,200+j)))));return{nr:c.b.nr,id:c.b.id,name:c.b.name,n:n}});
 leit.sort(function(a,b){return b.n-a.n||a.nr-b.nr});
 return{roh:r,einwohner:ges,stufen:je,leit:leit,zusatz:zusatz(seed,r,leit,K,D)}}
// Satirischer Zusatz: jeder 4. Ort; Wirtschaft (Leitgebäude, sonst Kultur) 5 von 10, Lage 3 von 10, Herrschaft und Geschichte 2 von 10; fehlt eine Gruppe, die nächste
function zusatz(seed,r,leit,K,D){var h=zz(seed,r.zelle,3);if(h%4)return null;
 var w=null,j;for(j=0;j<leit.length&&!w;j++)w=GEB_ZUS[leit[j].id]||null;
 if(!w&&K){if(K.waren.indexOf('leather')>=0||K.waren.indexOf('hides')>=0)w='gerberei';else if(K.waren.indexOf('incense')>=0)w='tempel';
  else if(K.werte['arena-love']>=5)w='arena';else if(K.system==='merchant-league')w='handel'}
 var bz=r.zonen.length?D.zon[r.zonen[0][0]]:null,l=r.kueste&&(h>>>4)%2?'kueste':r.fluss&&(h>>>5)%2?'fluss':BIOM_ZUS[bz]||(r.kueste?'kueste':r.fluss?'fluss':null);
 var ge=r.g===7?'reichssitz':r.sitz>=5&&(h>>>6)%2?'sitz':r.g===2&&(h>>>7)%2?'klein':'sonst';
 var x=(h>>>8)%10,L=x<5?[w,l,ge]:x<8?[l,w,ge]:[ge,w,l],gr=L[0]||L[1]||L[2];
 return{gruppe:gr,n:(h>>>12)%ZUS[gr]}}

// Anzeige (t = Übersetzer der Sprachdatei): voller Name, Größe, Kurzzeile
function voll(b,t){return b.roh.name+(b.zusatz?t('ort.zusatz.'+b.zusatz.gruppe+'.'+b.zusatz.n):'')}
function groesseName(g,t){return t('ort.groesse.'+GNAME[g])}
function zahl(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',')}
function zeile(b,t){return t('ort.zeile',{name:voll(b,t),groesse:groesseName(b.roh.g,t),leute:zahl(b.einwohner),
 leit:b.leit.map(function(l){return t('ort.leit',{n:l.n,name:l.name})}).join(', ')})}
function stufenText(b,t){var L=[];for(var i=b.stufen.length-1;i>=0;i--)if(b.stufen[i])L.push(t('ort.stufe.'+(i+1),{n:zahl(b.stufen[i])}));return L.join(' · ')}

// Kompakte Ortsbilanz, 256 Byte (Phase P speichert sie, wenn sich ein Ort ändert). Reihenfolge fest:
//  0 Format 1 · 1 Größe · 2 Kultur · 3 Ortsart · 4–7 Zelle · 8–9 Herrschaft (unterste Einheit + 1) · 10 Zusatz-Gruppe + 1 · 11 Zusatz-Nummer
// 12–35 Leitgebäude 6 × (Gebäude-Nummer + 1, Anzahl, je 2 Byte) · 36–59 Einwohner je Stufe 6 × 4 Byte
// frei für spätere Schritte (jetzt 0): 60–107 Vorräte 12 Warengruppen × 4 Byte · 108–111 Kasse · 112–113 Elendsviertel · 114–121 Abhängigkeit je Vice
// 122–125 Truppenstärke · 126 Kontrollstufe des Spielers · 127 Zufriedenheit · 128 Zahl der Außenposten (N5c, b.posten aus aussenposten.js)
// 129–160 Außenposten 8 × (Gebäude-Nummer + 1 je 2 Byte, Lage dx + 2 | dy + 2 << 4, 1 = Gehöft) · 161–255 Reserve. Alte Bilanzen haben hier 0 = keine Posten.
var BYTES=256, GRUPPEN=Object.keys(ZUS);
function pack(b){var a=new Uint8Array(BYTES),v=new DataView(a.buffer),r=b.roh,i;
 a[0]=1;a[1]=r.g;a[2]=r.kultur;a[3]=r.art;v.setUint32(4,r.zelle,true);v.setUint16(8,r.einheit||0,true);
 if(b.zusatz){a[10]=GRUPPEN.indexOf(b.zusatz.gruppe)+1;a[11]=b.zusatz.n}
 for(i=0;i<b.leit.length&&i<6;i++){v.setUint16(12+i*4,b.leit[i].nr+1,true);v.setUint16(14+i*4,Math.min(65535,b.leit[i].n),true)}
 for(i=0;i<6;i++)v.setUint32(36+i*4,b.stufen[i]>>>0,true);
 var P=b.posten||[];a[128]=Math.min(8,P.length);for(i=0;i<a[128];i++){v.setUint16(129+i*4,P[i].nr+1,true);a[131+i*4]=(P[i].dx+2)|(P[i].dy+2)<<4;a[132+i*4]=P[i].hof?1:0}return a}
function entpack(a,D){var v=new DataView(a.buffer,a.byteOffset,a.byteLength),leit=[],st=[],i,e=0;
 for(i=0;i<6;i++){var nr=v.getUint16(12+i*4,true);if(nr){var g=D&&D.G[nr-1];leit.push({nr:nr-1,id:g?g.id:'',name:g?g.name:'',n:v.getUint16(14+i*4,true)})}}
 for(i=0;i<6;i++){st.push(v.getUint32(36+i*4,true));e+=st[i]}
 var po=[];for(i=0;i<Math.min(8,a[128]);i++){var pn=v.getUint16(129+i*4,true)-1,pg=D&&D.G[pn],q=a[131+i*4];po.push({nr:pn,id:pg?pg.id:'',dx:(q&15)-2,dy:(q>>4)-2,hof:a[132+i*4]===1})}
 return{posten:po,format:a[0],g:a[1],kultur:a[2],art:a[3],zelle:v.getUint32(4,true),einheit:v.getUint16(8,true),zusatz:a[10]?{gruppe:GRUPPEN[a[10]-1],n:a[11]}:null,leit:leit,stufen:st,einwohner:e}}

var P={AUS:AUS,GNAME:GNAME,EINW:EINW,HOCH:HOCH,ANTEIL:ANTEIL,LEIT:LEIT,MENGE:MENGE,ZUS:ZUS,GEB_ZUS:GEB_ZUS,BYTES:BYTES,
 sitze:sitze,groesse:groesse,ortNr:ortNr,roh:roh,daten:daten,bilanz:bilanz,voll:voll,groesseName:groesseName,zeile:zeile,stufenText:stufenText,zahl:zahl,pack:pack,entpack:entpack};
if(typeof module!=='undefined'&&module.exports)module.exports=P;else root.AT3ORTE=P;
})(typeof self!=='undefined'?self:this);
