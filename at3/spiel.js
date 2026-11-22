// WAS DIE DATEI TUT: Eigener Einstieg von Arena Theory 3.0 (Schritt G1). Englische Sprachdatei, Objektkartei, nur übernommene Objekte
// laden (AT3_64.ladeUebernommene, Regel 3), kleiner Probeboden mit Ersatzbildern für alles noch nicht Übernommene (Regel 20: Ersatzbild statt Lücke),
// Antippen zeigt die Objektkarte. Messstellen und Budgetliste (AT3_PLAN 11.1). Lädt nichts außerhalb von at3/, liest und schreibt keine Spielstände.
// Kerne: G1 hat noch keine Spielwelt; alles hier ist Laden und ein einziges Zeichnen auf dem Hauptkern (Welt-Hintergrundkern kommt mit G2).
// V1: Knopf „Voice“. Erst beim Einschalten wird at3/stimme.js geladen, die den vorhandenen englischen Sprachgenerator im Hintergrundkern startet
// (../sprech-worker-en.js, ../stimme-en.js, ../stimme-en-lex.js: die einzigen Dateien außerhalb von at3/, eine Quelle mit dem Voice Lab). Ein/Aus wird nicht gespeichert (Spielstände ab G3).
// G2: Uhr-Leiste (Pause, 1×, 2×, 3×). Nach dem ersten Bild wird kernstart.js geladen; die Welt rechnet im Weltkern (weltkern.js) und in den Helferkernen (helfer.js),
// der Hauptkern schickt nur Befehle und zeigt die Uhr. Fällt ein Kern aus oder gibt es keine Hintergrundkerne, hält das Spiel mit Meldung an.
// G4a: Kartenansicht (weltkarte.js): startet mit dem Kern, schickt weltdichte/weltseed (neue Welt) bzw. übernimmt die Welt aus dem Spielstand; Kameraort im Spielstand.
// G3: Startbild mit drei Spielständen (spielstand.js). Der Kern startet erst nach der Wahl, mit Seed und Zustand aus dem Spielstand; automatisch gespeichert,
// Knopf „Save & quit“. Ein/Aus der Stimme steht im Spielstand. ?nosave = ohne Spielstand (Seed 1).
// G4c: Neue Welt (oder Spielstand ohne Kameraort): Startplatz-Wahl (startwahl.js, erst dann geladen); die Uhr steht so lange, danach Kamera an den Platz,
// Platz im Spielstand (spiel.start) und sofort gespeichert. Continue startet am gespeicherten Kameraort. ?nosave startet wie bisher am ersten Dorf.
// FP1: Knopf „First person“ in der Karte. Erst beim ersten Antippen werden fp.js, fpwelt.js und fpspiel.js geladen; der Gladiator steht dort, wo die Karte hinschaut,
// Antippen zeigt und spricht die Objektkarte, „Map“ führt zurück, die Karte steht dann beim Gladiator. Den Ausschnitt baut der Bildkern (fpausschnitt.js).
// G5b: Knopf „Build“ (wie 2.0 welt-bau.js): Art wählen (Storage, Workshop, Lodging, Demolish), mit einem Finger ein Rechteck ziehen, die Vorschau fragt den Weltkern
// (bauPruefen, ändert nichts), loslassen schickt bauBoden/bauEntfernen. Bis eine Art gewählt ist, lässt sich die Karte frei verschieben. Gebäude antippen zeigt Teil,
// Art und Bauzustand und schaltet in 1× das Dach auf/zu. Die Werkzeugleiste mit Wänden, Türen und Dach kommt mit G5c.
(function(){
'use strict';
var V='4f3dd09d', T_SKRIPT=performance.now(), S=window.AT3_64;
var $=function(id){return document.getElementById(id)};
var basis=location.pathname.replace(/[^/]*$/,'');
var TXT={}, OBJTXT={}, kartei=null, B=null, BUDGETS=null, geladen={objekte:{},abgelehnt:[]};
var mess={skriptMs:T_SKRIPT, datenMs:null, objekteMs:null, erstesBildMs:null, download:null, dateien:0, fremd:[], bilder:0, p95:null, p99:null,
 langMs:null, langGemeldet:false, speicher:null, kerne:navigator.hardwareConcurrency||null, geschrieben:0, fertig:false, stimmDateien:0};

function t(k,w){var s=TXT[k];if(s==null)s=k;if(w)for(var n in w)s=s.replace('{'+n+'}',w[n]);return s}
function holeJson(u){return fetch(u+(u.indexOf('?')<0?'?v='+V:'')).then(function(r){if(!r.ok)throw new Error(u+' '+r.status);return r.json()})}

// ── Spielstände aus 1.0/2.0 schützen: Momentaufnahme der Schlüssel, am Ende vergleichen (G1 schreibt nichts) ──
function speicherBild(){var o={};try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);o['l:'+k]=localStorage.getItem(k)}}catch(e){}
 try{for(var j=0;j<sessionStorage.length;j++){var q=sessionStorage.key(j);o['s:'+q]=sessionStorage.getItem(q)}}catch(e){}return o}
var SPEICHER_VOR=speicherBild();

// ── Längste Aufgabe auf dem Hauptkern (wo der Browser es meldet) ──
try{new PerformanceObserver(function(l){l.getEntries().forEach(function(e){mess.langMs=Math.max(mess.langMs||0,e.duration)})}).observe({type:'longtask',buffered:true});mess.langGemeldet=true}catch(e){}

// ── Probeboden: 6 × 6 Felder, Feld 64 × 32 (AT3-64). Fest, nur zum Ansehen. ──
var N=6, FW=64, FH=32, OX=192, OY=40;
var BODEN=function(x,y){return x===3?'boden-weg':'boden-gras'};
var STELLEN=[['wand-stein',0,0],['wand-stein',1,0],['wand-stein',2,0],['wand-tor',3,0],['wand-stein',4,0],['wand-stein',5,0],
 ['lager-platz',1,1],['ware-stamm',2,2],['busch-gruen',4,2],['baum-eiche-skizze',1,3],['figur-arbeiter',3,3],['blume-wiese',0,4],['baum-tanne',5,4],['karren-ochse',3,5]];
var ERSATZ=['#7f7870','#5c5650','#3e3934'];   // Palette A, Graureihe
var gezeichnet=[];   // für Antippen: {id, ersatz, x, y, w, h}

function feldPos(x,y){return{sx:OX+(x-y)*FW/2, sy:OY+(x+y)*FH/2}}
function raute(c,sx,sy,f){c.fillStyle=f;c.beginPath();c.moveTo(sx,sy);c.lineTo(sx+FW/2,sy+FH/2);c.lineTo(sx,sy+FH);c.lineTo(sx-FW/2,sy+FH/2);c.closePath();c.fill()}
function bildVon(id){var o=geladen.objekte[id];if(!o)return null;var c=S.zuCanvas(o.bild,S.PALETTE);if(!c._gezaehlt){c._gezaehlt=1;mess.bilder+=c.width*c.height*4}return{o:o,c:c}}

function zeichnen(){
 var cv=$('boden'),c=cv.getContext('2d');c.imageSmoothingEnabled=false;mess.bilder+=cv.width*cv.height*4;
 c.fillStyle='#0e0c0b';c.fillRect(0,0,cv.width,cv.height);gezeichnet=[];
 for(var y=0;y<N;y++)for(var x=0;x<N;x++){var p=feldPos(x,y),id=BODEN(x,y),b=bildVon(id);
  if(b)c.drawImage(b.c,p.sx-b.o.bild.ax,p.sy+FH/2-b.o.bild.ay);else raute(c,p.sx,p.sy,ERSATZ[(x+y)%2]);
  gezeichnet.push({id:id,ersatz:!b,boden:true,x:p.sx-FW/2,y:p.sy,w:FW,h:FH})}
 STELLEN.slice().sort(function(a,b){return(a[1]+a[2])-(b[1]+b[2])}).forEach(function(s){var p=feldPos(s[1],s[2]),ax=p.sx,ay=p.sy+FH/2,b=bildVon(s[0]);
  if(b){var bx=ax-b.o.bild.ax,by=ay-b.o.bild.ay;c.drawImage(b.c,bx,by);gezeichnet.push({id:s[0],x:bx,y:by,w:b.c.width,h:b.c.height});return}
  // Ersatzbild: grauer Block mit Fragezeichen, gleiche Stelle, damit nichts fehlt
  c.fillStyle=ERSATZ[1];c.fillRect(ax-8,ay-22,16,22);c.fillStyle=ERSATZ[0];c.fillRect(ax-8,ay-22,16,4);
  c.fillStyle=ERSATZ[2];c.fillRect(ax-1,ay-17,3,3);c.fillRect(ax+1,ay-14,2,3);c.fillRect(ax-1,ay-8,3,3);
  gezeichnet.push({id:s[0],ersatz:true,x:ax-8,y:ay-22,w:16,h:22})});
}

function karteZeigen(e){var cv=$('boden'),r=cv.getBoundingClientRect(),x=(e.clientX-r.left)*cv.width/r.width,y=(e.clientY-r.top)*cv.height/r.height,hit=null;
 for(var i=gezeichnet.length-1;i>=0;i--){var g=gezeichnet[i];if(x>=g.x&&x<g.x+g.w&&y>=g.y&&y<g.y+g.h){
  if(g.boden){var dx=Math.abs(x-(g.x+FW/2))/(FW/2),dy=Math.abs(y-(g.y+FH/2))/(FH/2);if(dx+dy>1)continue}hit=g;break}}
 var k=$('karte');if(!hit){k.textContent=t('spiel.tippen');window.AT3SPIEL.angetippt=null;return}
 objektKarte(hit.id,hit.ersatz)}
// Objektkarte zeigen und vorlesen (G1; seit G4b auch für Naturobjekte auf der Weltkarte)
function objektKarte(id,ersatz){var k=$('karte'),name=OBJTXT[id+'.name']||id,info=OBJTXT[id+'.info']||'';
 k.innerHTML=ersatz?'<b>'+esc(t('spiel.ersatzName'))+': '+esc(name)+'</b><br>'+esc(t('spiel.ersatzInfo')):'<b>'+esc(name)+'</b><br>'+esc(info);
 window.AT3SPIEL.angetippt=id;
 if(ersatz){sprich(t('spiel.ersatzName')+': '+name+'.'+(ersatzGesagt?'':' '+t('spiel.ersatzInfo')));ersatzGesagt=true}else sprich(name+'. '+info)}
// ── Stimme (V1): erst beim Einschalten laden, Rechnen im Hintergrundkern, hier nur Knopf und Anzeige ──
var STIMME=null, stimmeLaedt=null, tonCtx=null, ersatzGesagt=false, stimmeGewuenscht=false;
function sprich(x){if(STIMME&&STIMME.istAn())STIMME.sag(x)}
function stimmeKnopf(){var z=STIMME&&STIMME.zustand(),an=!!(STIMME&&STIMME.istAn()),k=$('stimmeKnopf');k.textContent=t(an?'stimme.an':'stimme.aus');k.setAttribute('aria-pressed',an?'true':'false');
 if(z&&z.fehler)$('status').innerHTML='<span class="schlecht">'+esc(t('stimme.fehlt',{e:z.fehler}))+'</span>';
 if(!$('mess').hidden)messZeigen()}
function stimmeLaden(){if(stimmeLaedt)return stimmeLaedt;stimmeLaedt=new Promise(function(ja,nein){var s=document.createElement('script');s.src='stimme.js?v='+V;
  s.onload=function(){STIMME=window.AT3STIMME;STIMME.beiAenderung(stimmeKnopf);ja(STIMME)};s.onerror=function(){stimmeLaedt=null;nein(new Error('stimme.js'))};document.head.appendChild(s)});return stimmeLaedt}
function stimmeUmschalten(){
 if(STIMME&&STIMME.istAn()){STIMME.aus();stimmeGewuenscht=false;$('status').textContent=t('spiel.bereit');return}
 // Tonausgang direkt im Antippen erzeugen (Handy erlaubt Ton nur nach einem Tippen)
 if(!tonCtx){var AC=window.AudioContext||window.webkitAudioContext;if(!AC){$('status').innerHTML='<span class="schlecht">'+esc(t('stimme.fehlt',{e:'no audio output'}))+'</span>';return}tonCtx=new AC()}
 if(tonCtx.state==='suspended')tonCtx.resume();stimmeGewuenscht=true;
 var erstes=!STIMME||!STIMME.zustand().geladen;if(erstes)$('status').textContent=t('stimme.laedt');
 stimmeLaden().then(function(S){if(!S.ein(tonCtx))return;return S.sag(t('stimme.gruss')).then(function(ok){if(ok||!S.zustand().fehler)$('status').textContent=t('spiel.bereit');dateienZaehlen();stimmeKnopf()})})
 .catch(function(e){$('status').innerHTML='<span class="schlecht">'+esc(t('stimme.fehlt',{e:e.message}))+'</span>'})}

// ── Spielkern (G2): Welt im Hintergrundkern, hier nur Uhr-Leiste und Befehle ──
var KARTE=null, KERN=null, kernAbdruck=null, uhrSek=-1, uhrTempo=-1, uhrLage='';
function zeitText(sek){var h=Math.floor(sek/3600),m=Math.floor(sek/60)%60,s=sek%60;return h+':'+(m<10?'0':'')+m+':'+(s<10?'0':'')+s}
function uhrKnoepfe(){return document.querySelectorAll('#uhr [data-tempo]')}
function uhrZeigen(Z){var sek=Math.floor(Z.tick/20);if(sek!==uhrSek){uhrSek=sek;$('uhrZeit').textContent=t('uhr.zeit',{t:zeitText(sek)})}
 if(Z.tempo!==uhrTempo){uhrTempo=Z.tempo;[].forEach.call(uhrKnoepfe(),function(k){k.setAttribute('aria-pressed',+k.dataset.tempo===Z.tempo?'true':'false')})}
 var lage=Z.tempo===0?'uhr.pausiert':Z.ueber?'uhr.ueberlast':'';if(lage!==uhrLage){uhrLage=lage;$('uhrInfo').textContent=lage?t(lage):''}}
function kernAusfall(g){[].forEach.call(uhrKnoepfe(),function(k){k.disabled=true});$('uhrInfo').innerHTML='<span class="schlecht">'+esc(t('uhr.ausfall',{e:g}))+'</span>';uhrLage='aus';window.AT3SPIEL_KERN_AUS=g;if(!$('mess').hidden)messZeigen()}
// ── Spielstände (G3): Wahl im Startbild, danach Kern mit Seed und Zustand, automatisch speichern ──
var WAHL=null, SPIELSTAND=null, platzP=null, START=null;
function speicherAnzeige(x,schlecht){var e=$('speicherInfo');e.textContent=x;e.className=schlecht?'schlecht':'leise'}
function platzWaehlen(){platzP=window.AT3SPIELSTAND.start({t:t,imAntippen:function(k){if(k&&k.stimme&&!(STIMME&&STIMME.istAn()))stimmeUmschalten()}})
 .then(function(w){WAHL=w;var k=$('speicherKnopf');k.hidden=!w.platz;k.textContent=t('speicher.knopf');k.onclick=function(){k.disabled=true;k.textContent=t('speicher.beendet');SPIELSTAND.beenden().then(function(ok){if(!ok){k.disabled=false;k.textContent=t('speicher.knopf')}})};
  if(w.platz)$('unter').textContent=t('spiel.platz',{n:w.name,s:w.seed,d:t('dichte.'+['thin','medium','dense'][w.dichte])})+(w.wieder?' '+t('spiel.wieder'):'');return w});return platzP}
function kernStarten(){$('uhrInfo').textContent=t('uhr.wartet');uhrLage='wartet';platzP.then(kernLos)}
function kernLos(w){WSEED=w.seed>>>0;
 var s=document.createElement('script'),s2=document.createElement('script'),da=0;s.src='kernstart.js?v='+V;s2.src='weltkarte.js?v='+V;s.onerror=function(){kernAusfall('kernstart.js')};s2.onerror=function(){kernAusfall('weltkarte.js')};
 s.onload=s2.onload=function(){if(++da<2)return;KERN=window.AT3KERNE.starten({seed:w.seed,stand:w.daten&&w.daten.kern,beiBild:uhrZeigen,beiAusfall:kernAusfall,beiWs:function(d){if(KARTE)KARTE.beiWs(d)},beiBau:beiBau,beiWeg:beiWeg,beiKarren:function(d){if(KARTE)KARTE.karren(d)},beiPersonen:function(d){if(KARTE)KARTE.personen(d)},beiTiere:function(d){if(KARTE)KARTE.tiere(d)},beiBesucher:function(d){if(KARTE&&KARTE.besucher)KARTE.besucher(d)},beiWaren:beiWaren,beiGladiatoren:beiGladiatoren,
  beiBereit:function(){[].forEach.call(uhrKnoepfe(),function(k){k.disabled=false;k.onclick=function(){KERN.befehl('tempo',+k.dataset.tempo)}});
   SPIELSTAND=window.AT3SPIELSTAND.anschliessen(w,KERN,function(){return{stimme:stimmeGewuenscht,kam:KARTE?KARTE.kam():null,start:START}},speicherAnzeige);if(w.platz&&!w.daten)SPIELSTAND.speichern();
   karteStarten(w);
   window.AT3SPIEL_KERN=true}})};
 document.head.appendChild(s);document.head.appendChild(s2)}
// ── Karte (G4a): Bilder kommen aus dem Bildkern, hier nur Anschluss, Zoomknöpfe und die Auskunft beim Antippen ──
// N4c1: Reiche in den Fernstufen (Knopf „Realms“, Grundstellung an, gemerkt im Browser) und Antippen dort: „Answers to: County › Duchy › Kingdom“.
// Namen baut herrschaften.js (erst beim ersten Antippen geladen) aus den Daten des Bildkerns und der Sprachdatei. N4c2: dazu herrscher.js (Herrscher, Vorgeschichte).
var REICHE=true, HRL=null, ORL=null, ORT_HTML='', REICH_HTML='';   // N5b: Ortskarte (orte.js und Daten erst beim ersten Antippen eines Orts)
function reicheAnschliessen(){try{REICHE=localStorage.getItem('at3.reiche')!=='0'}catch(x){}var k=$('reicheKnopf');k.textContent=t('reich.knopf');k.setAttribute('aria-pressed',REICHE?'true':'false');
 if(!REICHE)KARTE.reiche(false);
 k.onclick=function(){REICHE=!REICHE;k.setAttribute('aria-pressed',REICHE?'true':'false');try{localStorage.setItem('at3.reiche',REICHE?'1':'0')}catch(x){}KARTE.reiche(REICHE)}}
// N5b: Ort neben dem angetippten Punkt: voller Name, Größe, Einwohner, Leitgebäude (Notausschalter ?n5b=0: der Bildkern schickt keinen Ort)
// N5c: dazu seine Außenposten und Gehöfte aus der Umgebung, die der Bildkern mitschickt (aussenposten.js; Notausschalter ?n5c=0)
function infoZeigen(){$('weltInfo').innerHTML=REICH_HTML+STR_HTML+ORT_HTML}
// N5d: Straße unter dem Finger: Rang, beide Orte, Bauweise, Haltepunkt mit Spruch, Zoll an die unterste Herrschaft (Notausschalter ?n5d=0: der Bildkern schickt keine)
var STR_HTML='';
function strasseHtml(s,L){if(!s)return '';window.AT3SPIEL.strasse={rang:s.rang,a:s.an,b:s.bn,bau:s.bau,halt:s.halt,zelle:s.zelle};
 var h='<br><b>'+esc(t('strasse.zeile',{rang:t('strasse.rang.'+s.rang),a:s.an,b:s.bn,bau:t('strasse.bau.'+s.bau)}))+'</b>';
 if(s.halt)h+='<br><span class="leise">'+esc(t('strasse.halt.'+s.halt))+'</span>';
 var H=window.AT3HERRSCHAFT;if(H&&L&&L.length&&s.einheit)h+='<br><span class="leise">'+esc(t('strasse.besitz',{herr:H.name(L[0],t)}))+'</span>';return h}
function ortTipp(r){ORT_HTML='';if(!r)return;var tip=r;
 (ORL||(ORL=new Promise(function(ok,no){if(window.AT3ORTE)return ok();var s=document.createElement('script');s.src='orte.js?v='+V;s.onload=ok;s.onerror=function(){ORL=null;no(new Error('orte.js'))};document.head.appendChild(s)})
  .then(function(){return window.AT3POSTEN?null:new Promise(function(ok){var s=document.createElement('script');s.src='aussenposten.js?v='+V;s.onload=s.onerror=ok;document.head.appendChild(s)})})   // N5c: Außenposten (fehlt die Datei, bleibt die Ortskarte wie N5b)
  .then(function(){return Promise.all(['daten/gebaeude.json','daten/rezepte.json','daten/kulturen.json'].map(holeJson))}).then(function(d){return window.AT3ORTE.daten(d[0],d[1],d[2])}).catch(function(e){ORL=null;throw e})))
 .then(function(D){if(tip!==ORT_LETZT)return;var O=window.AT3ORTE,b=O.bilanz(WSEED,r,D),AP=window.AT3POSTEN,PO=AP&&!AP.AUS&&r.umg?AP.posten(WSEED,b,r.umg,D,r.punkt):null;b.posten=PO||[];
  window.AT3SPIEL.ort={name:O.voll(b,t),g:r.g,einwohner:b.einwohner,leit:b.leit.map(function(l){return l.id}),posten:PO?PO.map(function(p){return p.id}):null};
  ORT_HTML='<br><b>'+esc(O.zeile(b,t))+'</b>'+(PO?'<br>'+esc(AP.kurzListe(PO,t)):'');infoZeigen()},function(){})}
var ORT_LETZT=null;
function reichTipp(L,hat,ort,str){ORT_LETZT=ort||null;ORT_HTML='';STR_HTML=strasseHtml(str,null);if(!str)window.AT3SPIEL.strasse=null;ortTipp(ort);
 if(!hat){REICH_HTML=esc(t('welt.leer'));infoZeigen();return}if(!L||!L.length){REICH_HTML=esc(t('reich.niemand'));infoZeigen();return}
 (HRL||(HRL=Promise.all([['herrschaften.js','AT3HERRSCHAFT'],['herrscher.js','AT3HERRSCHER']].map(function(q){return new Promise(function(ok,no){if(window[q[1]])return ok();var s=document.createElement('script');s.src=q[0]+'?v='+V;s.onload=ok;s.onerror=function(){HRL=null;no(new Error(q[0]))};document.head.appendChild(s)})}))))
 .then(function(){var H=window.AT3HERRSCHAFT,P=window.AT3HERRSCHER,el=$('weltInfo');window.AT3SPIEL.reich=L;STR_HTML=strasseHtml(str,L);REICH_HTML=esc(t('reich.antwortet',{kette:H.ketteText(L,t)}));infoZeigen();
  if(!P||P.AUS)return;var ri=0;while(ri<L.length-1&&L[ri].stufe)ri++;   // N4c2: Herrscher der untersten Stufe und des Reichs, Vorgeschichte des Reichs (Notausschalter ?n4c2=0)
  var wer=(ri?[L[0],L[ri]]:[L[0]]).map(function(e){return P.titelName(P.herrscher(WSEED,e),t)}).join(' › '),ch=P.chronik(WSEED,L.slice(ri),t,H.name);
  window.AT3SPIEL.herrscher={wer:wer,chronik:ch};
  REICH_HTML=esc(t('reich.antwortet',{kette:H.ketteText(L,t)}))+'<br><span class="leise">'+esc(t('person.herrscht',{wer:wer}))+'</span>'+(ch?'<br><span class="leise">'+esc(ch)+'</span>':'');infoZeigen()},function(){})}
function karteStarten(w){var sp=w.daten&&w.daten.spiel,kw=w.daten&&w.daten.kern&&w.daten.kern.welt,waehlen=!/[?&]nosave\b/.test(location.search)&&!(sp&&sp.kam);$('weltInfo').textContent=t('welt.wartet');
 if(sp&&sp.start)START=sp.start;
 KARTE=window.AT3KARTE.starten({cv:$('weltCv'),S:S,kern:KERN,kam:sp&&sp.kam,waehlen:waehlen,beiErde:startWaehlen,
  beiAusfall:function(g){if(g)$('weltInfo').innerHTML='<span class="schlecht">'+esc(t('welt.ausfall',{e:g}))+'</span>'},
  beiNahFehlt:function(){figurenNahPflegen()},
  beiZoom:function(l,z){$('weltInfo').textContent=l<0?t('welt.globus'):t('welt.zoom',{z:z});$('reicheKnopf').hidden=!(l<0||l>=4)},   // N4c1: Knopf „Realms“ nur in den Fernstufen und am Globus
  beiReich:reichTipp,
  beiKarren:function(k){if(BAUW&&!fpAn)return false;karrenKarte(k);return true},
  beiPerson:function(k){if(BAUW&&!fpAn)return false;personKarte(k);return true},
  beiTier:function(k){if(BAUW&&!fpAn)return false;tierKarte(k);return true},      // G8: Reh antippen
  beiBesucher:function(k){if(BAUW&&!fpAn)return false;besucherKarte(k);return true},      // AR2b: Zuschauer antippen
  beiBesFehlt:function(){besucherPflegen()},
  beiFest:function(e){if(BAUW&&!fpAn)return false;return festKarte(e)},      // G9d3: Leiche      // G9c1: Marktstand antippen, G9d2: Arena
  beiFeld:function(f){window.AT3SPIEL.feld=f;if(BAUW&&BAUWZ[BAUW].form==='tipp'&&!fpAn){if(BAUW==='pfadFuss'||BAUW==='pfadKarren')pfadTipp(f);else if(ATT_WZ[BAUW])attTipp(f);else bauTipp(f);return}if(f&&f.bau){bauFeld(f);return}if(f&&f.obj){objektKarte(f.obj.id,f.obj.ersatz);if(f.bio==null)return}else if(f)window.AT3SPIEL.angetippt=null;
   $('weltInfo').textContent=f&&f.bio!=null?t('welt.feld',{b:t('welt.bio.'+f.bio),w:f.bweg?', '+t('welt.bweg.'+f.bweg[0])+(f.bweg[1]<3?' ('+t('bau.zustand.'+f.bweg[1])+')':''):f.weg?', '+t('welt.weg.'+f.weg):'',h:f.hoehe,x:f.x,y:f.y}):t('welt.leer')}});
 if(mess.objekteMs)KARTE.natur(geladen.objekte);      // G4b: Naturbilder an den Bildkern (sonst, sobald die Objekte geladen sind)
 bauAnschliessen();warenAnschliessen();
 if(sp&&sp.start&&!(w.daten.kern&&w.daten.kern.war))KERN.befehl('wirtschaft',{x:sp.start[0],y:sp.start[1]});      // G7: Spielstand von vor G7 → Wirtschaft am Startplatz einschalten
 if(sp&&sp.start&&!(w.daten.kern&&w.daten.kern.ket))KERN.befehl('ketten',{an:1});
 if(sp&&sp.start&&!(w.daten.kern&&w.daten.kern.gla))KERN.befehl('gladiatoren',{an:1});      // G9c1: Stand von vor G9c1 → Gladiatoren und Marktstand      // G8: Stand von vor G8 → erste Ketten einschalten (ohne Wirtschaft tut der Befehl nichts)
 $('zoomRein').onclick=function(){KARTE.zoom(-1)};reicheAnschliessen();$('zoomRaus').onclick=function(){KARTE.zoom(1)};$('fpKnopf').onclick=fpUmschalten;$('fpKnopf').disabled=fpWahl;
 if(!(kw&&kw.an)){KERN.befehl('weltdichte',w.dichte==null?1:w.dichte);KERN.befehl('weltseed',w.seed>>>0)}      // neue Welt (oder Stand von vor G4a): aus dem Seed anlegen
 KERN.wsAn(true,true);var warte=setInterval(function(){if(KARTE.mess.fertig){clearInterval(warte);$('weltInfo').textContent=t('welt.tippen');window.AT3SPIEL_KARTE=true;
  var bp=/[?&]nosave\b/.test(location.search)&&/[?&]bauprobe(?:=(\d+))?/.exec(location.search);if(bp)bauprobe(Math.min(200,+(bp[1]||50)));
  if(/[?&]nosave\b/.test(location.search)&&/[?&]karrenprobe\b/.test(location.search))karrenprobe();
  if(/[?&]nosave\b/.test(location.search)&&/[?&]warenprobe\b/.test(location.search))warenprobe();
  if(/[?&]nosave\b/.test(location.search)&&/[?&]fpprobe\b/.test(location.search))fpprobe()}},250)}
// FP3-Probe (nur mit ?nosave&fpprobe): First person einschalten, dann 0, 20 und 100 gedachte Arbeiter und Karren je 3 s um den Gladiator laufen lassen
// (Kamera dreht sich langsam, jedes Bild neu) und die Bildzeit p95 je Stufe zeigen. Budget wie in der Kartei: Figuren in First Person (budgets.json „figuren“).
function fpprobe(){var P=window.AT3SPIEL.fpprobe={fertig:false,stufen:null};$('weltInfo').textContent=t('probe.fpLaeuft');
 var warte=setInterval(function(){if(fpBusy)return;if(!fpAn){fpUmschalten();return}clearInterval(warte);$('weltInfo').textContent=t('probe.fpLaeuft');
  window.AT3FP.probe([0,20,100]).then(function(e){P.stufen=e;P.fertig=true;var u=function(v){return v==null?'-':v.toFixed(1)+' ms'},b0=e[0].p95||0;
   $('weltInfo').textContent=t('probe.fpFertig',{a:u(e[0].p95),b:u(e[1].p95),c:u(e[2].p95),d:u(Math.max(0,(e[2].p95||0)-b0))})},function(x){P.fertig=true;P.fehler=String(x&&x.message||x)})},300)}
// G6c2: Karren antippen → Karte mit Zustand, Grund und Wartezeit (englisch); die Stimme liest sie vor
function karrenKarte(k){var z=t('karren.zust.'+k.zust),g=k.grund&&TXT['karren.grund.'+k.grund]!=null?t('karren.grund.'+k.grund):'',s=Math.floor((k.warte||0)/20),name=t('karren.name',{n:k.id});
 var fr=null;if(WAREN)WAREN.karren.forEach(function(e){if(e[0]===k.id)fr=e});if(WAREN&&WAREN.an)z=fr?t('karren.fracht',{m:fr[2],w:t('ware.'+fr[1])}):k.zust===2?t('karren.leer'):z;      // G7: Ladung statt „leer, aber stolz“
 $('karte').innerHTML='<b>'+esc(name)+'</b><br>'+esc(z)+(g?'<br>'+esc(g):'')+(s>=3?'<br>'+esc(t('karren.warte',{s:s})):'');window.AT3SPIEL.angetippt='karren:'+k.id;window.AT3SPIEL.karrenKarte=k;
 sprich(name+'. '+(g||z))}
// G6c2 Karrenprobe (nur mit ?nosave&karrenprobe): sucht nahe beim Kartenort ein Feld der Weltstraße oder des Ortsplatzes, baut davon weg eine 1 Feld breite Gasse (Kiesweg), dahinter
// einen Platz 2 Felder tief und 4 Lager mit Tor zum Platz; alle Karren müssen durch die Gasse (Gegenverkehr, Tore, Ausweichen). Tempo 3×.
function karrenprobe(){var k=KARTE.kam();if(!k)return;var LN=6,NL=4,U=[[0,-1],[1,0],[0,1],[-1,0]],SEITE={'0,-1':0,'-1,0':1,'0,1':2,'1,0':3},P=window.AT3SPIEL.karrenprobe={fertig:false,teile:0,gruende:{},strassen:0};
 function rect(L){var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(var i=0;i<L.length;i++){x0=Math.min(x0,L[i][0]);y0=Math.min(y0,L[i][1]);x1=Math.max(x1,L[i][0]);y1=Math.max(y1,L[i][1])}return{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1}}
 function plan(R,u){var v=[-u[1],u[0]],at=function(kk,vv){return[R[0]+u[0]*kk+v[0]*vv,R[1]+u[1]*kk+v[1]*vv]},L=[],i,j,gaps=[];
  var gasse=[];for(i=1;i<=LN;i++)gasse.push(at(i,0));var platz=[];for(i=LN+1;i<=LN+2;i++)for(j=-8;j<=6;j++)platz.push(at(i,j));
  var lager=[],tore=[];for(var n=0;n<NL;n++){var v0=-8+n*4,c=[];for(i=LN+3;i<=LN+5;i++)for(j=v0;j<=v0+2;j++)c.push(at(i,j));lager.push(rect(c));var tt=at(LN+3,v0+1);tore.push({x:tt[0],y:tt[1],seite:SEITE[(-u[0])+','+(-u[1])],typ:'tor'})}
  return{gasse:rect(gasse),platz:rect(platz),lager:lager,tore:tore,mitte:at(LN+2,-1)}}
 function pruefe(p){var L=[{art:'kiesweg',x:p.gasse.x,y:p.gasse.y,w:p.gasse.w,h:p.gasse.h},{art:'kiesweg',x:p.platz.x,y:p.platz.y,w:p.platz.w,h:p.platz.h}];
  p.lager.forEach(function(r){L.push({art:'lager',x:r.x,y:r.y,w:r.w,h:r.h})});return Promise.all(L.map(function(w){return KERN.bauPruefen(w)})).then(function(E){var ok=true;E.forEach(function(e){if(!(e&&e.ok)){ok=false;var g=e?e.grund:'?';P.gruende[g]=(P.gruende[g]||0)+1}});return ok})}
 // Weltstraße in der Nähe: Ringe um den Kartenort, je Ring alle Fragen auf einmal
 var R=[],ring=0;$('weltInfo').textContent=t('probe.karrenSucht');
 (function suche(){if(ring>40){$('weltInfo').textContent=t('probe.karrenKeinPlatz');P.fertig=true;P.fehler='kein_platz';return}var F=[];
  for(var dy=-ring;dy<=ring;dy+=2)for(var dx=-ring;dx<=ring;dx+=2)if(Math.max(Math.abs(dx),Math.abs(dy))===ring)F.push([k[0]+dx,k[1]+dy]);
  ring+=2;Promise.all(F.map(function(q){return KARTE.feldAn(q[0]+.5,q[1]+.5)})).then(function(E){for(var i=0;i<E.length;i++){var f=E[i];if(f&&(f.weg===2||f.weg===6)&&!f.bau&&f.x!=null)R.push([f.x,f.y])}
   P.strassen=R.length;if(R.length<6&&ring<=40)return suche();versuch(0,0)})})();
 function versuch(i,d){if(i>=R.length){$('weltInfo').textContent=t('probe.karrenKeinPlatz');P.fertig=true;P.fehler='kein_platz';return}
  var p=plan(R[i],U[d]);pruefe(p).then(function(ok){if(ok)bauen(p);else if(d<3)versuch(i,d+1);else versuch(i+1,0)})}
 function bauen(p){KERN.befehl('tempo',3);P.plan=p;p.lager.forEach(function(r){KERN.befehl('bauBoden',{art:'lager',x:r.x,y:r.y,w:r.w,h:r.h})});P.teile=NL;
  KARTE.geh(p.mitte[0],p.mitte[1],0);$('weltInfo').textContent=t('probe.karren',{n:P.teile,m:NL*2+2});
  var w=setInterval(function(){if(KERN.zustand.baustellen>0)return;clearInterval(w);
   p.tore.forEach(function(q){KERN.befehl('bauTuer',q)});KERN.befehl('bauWeg',{art:'kiesweg',x:p.gasse.x,y:p.gasse.y,w:p.gasse.w,h:p.gasse.h});
   KERN.befehl('bauWeg',{art:'kiesweg',x:p.platz.x,y:p.platz.y,w:p.platz.w,h:p.platz.h});P.teile=NL*2+2;P.fertig=true;$('weltInfo').textContent=t('probe.karrenFertig',{l:NL})},500)}}
// FP2b: Messprobe „viele Häuser“ (Entscheidung Thomas 16.11.2026): nur mit ?nosave&bauprobe[=n] (n Häuser 4 × 3, Standard 50, höchstens 200). Baut rund um den Kartenort
// Lager, Werkstatt und Unterkunft im Wechsel mit 2 Feldern Abstand (wo der Weltkern es erlaubt), Tempo 3×; danach First person und „Load & budgets“ → Copy measurements.
function bauprobe(n){var k=KARTE.kam();if(!k)return;var L=[],r,gx,gy,i=0,gebaut=0,ARTN=['lager','werkstatt','unterkunft'];
 for(r=0;r<16;r++)for(gy=-r;gy<=r;gy++)for(gx=-r;gx<=r;gx++)if(Math.max(Math.abs(gx),Math.abs(gy))===r)L.push([k[0]+gx*6-2,k[1]+gy*5-1]);
 KERN.befehl('tempo',3);window.AT3SPIEL.bauprobe={soll:n,gebaut:0,fertig:false};
 (function weiter(){var bp=window.AT3SPIEL.bauprobe;if(gebaut>=n||i>=L.length){bp.fertig=true;$('weltInfo').textContent=t('probe.fertig',{n:gebaut});return}
  var p=L[i++],w={art:ARTN[gebaut%3],x:p[0],y:p[1],w:4,h:3};
  KERN.bauPruefen(w).then(function(e){if(e&&e.ok){KERN.befehl('bauBoden',w);gebaut++;bp.gebaut=gebaut}$('weltInfo').textContent=t('probe.bau',{n:gebaut,m:n});weiter()})})()}
// ── Bauen (G5b/G5c): Bauleiste wie 2.0 (welt-bau.js, T2: Gruppen mit Bild und Preis), Ergebnis kommt mit der Nachricht „bau“ vom Weltkern ──
// Formen: rechteck = mit einem Finger ziehen, linie = Wand an den Feldkanten ziehen, tipp = antippen (die Karte bleibt dabei verschiebbar).
var BAUWZ={lager:{gr:'haus',bild:'📦',form:'rechteck',preis:1},werkstatt:{gr:'haus',bild:'🪚',form:'rechteck',preis:1},unterkunft:{gr:'haus',bild:'🛏',form:'rechteck',preis:1},
 kueche:{gr:'haus',bild:'🍲',form:'rechteck',preis:1},jagdhuette:{gr:'haus',bild:'🏹',form:'rechteck',preis:1},      // G8: Werkstatt = Sägewerkstatt, neu Küche und Jägerhütte
 trampelpfad:{gr:'weg',bild:'👣',form:'rechteck',preis:1},kiesweg:{gr:'weg',bild:'∴',form:'rechteck',preis:1},pflaster:{gr:'weg',bild:'▦',form:'rechteck',preis:1},
 steinstrasse:{gr:'weg',bild:'▣',form:'rechteck',preis:1},                                    // G6a: vier Wegarten wie 2.0 (Thomas 16.11.2026)
 warteweg:{gr:'weg',bild:'⋯',form:'rechteck',preis:1},      // AR1c1: Queue Path (nur zu Fuß, Schlange vor dem Eingang)
 arena:{gr:'attraktion',bild:'🏟',form:'tipp',preis:0},eingang:{gr:'attraktion',bild:'🎟',form:'tipp',preis:0},ausgang:{gr:'attraktion',bild:'🚶',form:'tipp',preis:0},      // AR1c1: Attraktionen (Regel 20), kostenlos
 tuer:{gr:'werkzeug',bild:'🚪',form:'tipp',preis:1},pfadFuss:{gr:'werkzeug',bild:'🚶',form:'tipp',preis:0},pfadKarren:{gr:'werkzeug',bild:'🐂',form:'tipp',preis:0},abriss:{gr:'werkzeug',bild:'💥',form:'rechteck',preis:0}};   // G6b: Wegprobe (pfadFuss, pfadKarren)
// Thomas 16.11.2026: wie 2.0 nur Boden ziehen, Wände, Dach und Tür kommen von selbst; von Hand nur Türen. Wandlinie, Dach und „Wände neu“ bleiben im Weltkern
// (bauWaende, bauDach, bauHuelle) und in der Karte (Form „linie“), haben aber keinen Knopf.
var BAUW=null, bauNr={}, bauVor=null, bauVorLaeuft=false, bauStand={gold:null,s:0}, ART_NR={lager:1,werkstatt:2,unterkunft:3,kueche:4,jagdhuette:5}, WEG_NR={trampelpfad:1,kiesweg:2,pflaster:3,steinstrasse:4,warteweg:5}, ATT_WZ={arena:1,eingang:1,ausgang:1}, MAXA=1024, MAXL=256;
// ── G7 Waren und Arbeiter: Knopf „Goods“ (Bestände, Aufträge, stehende Baustellen mit Grund), Arbeiter antippen (Aufgabe, Last, Fähigkeiten, Rollen von Hand).
// Alles kommt als fertige Zahlen vom Weltkern (Nachricht waren nur bei Änderung), der Hauptkern füllt nur die Liste, und nur wenn sie offen ist. ──
var WAREN=null, PERSON=null;
function personName(id){var G2=GLAD&&GLAD.per&&GLAD.per[id];if(G2&&G2.name)return G2.name;return personName0(id)}
function personName0(id){var N=t('person.namen').split('|');return N[(id-1)%N.length]+(id>N.length?' '+(Math.floor((id-1)/N.length)+1):'')}
function beiWaren(d){WAREN=d.meld||null;window.AT3SPIEL.waren=WAREN;var k=$('warenKnopf');k.disabled=!(WAREN&&WAREN.an);if(k.disabled)$('warenLeiste').hidden=true;if(!$('warenLeiste').hidden)warenZeigen()}
function warenAnschliessen(){var k=$('warenKnopf');k.textContent=t('waren.knopf');k.onclick=function(){var an=!!$('warenLeiste').hidden;$('warenLeiste').hidden=!an;k.setAttribute('aria-pressed',an?'true':'false');if(an){warenZeigen();try{$('warenLeiste').scrollIntoView({block:'nearest'})}catch(x){}}}}
// G8: Warenliste aus den Zahlen ab Stelle o (nw Waren), Nullen von Stamm und Fleisch weggelassen
function warenListe(a,o,nw){var L=[];for(var w=0;w<nw;w++){var v=a[o+w];if(v||w<4)L.push(t('ware.'+w)+' '+v)}return L.join(' · ')}
function warenListeVoll(a,o,nw){var L=[];for(var w=0;w<nw;w++)if(a[o+w])L.push(t('ware.'+w)+' '+a[o+w]);return L.length?L.join(' · '):t('ketten.leer')}
// G8: Reh antippen (Name, Zustand, Beschreibung aus der Kartei)
function tierKarte(k){var name=t('tier.reh'),z=t('tier.zust.'+(k.zust|0)),info=OBJTXT['tier-reh.info']||'';$('karte').innerHTML='<b>'+esc(name)+'</b><br>'+esc(z)+(info?'<br><span class="leise">'+esc(info)+'</span>':'');
 window.AT3SPIEL.angetippt='tier:'+k.id;window.AT3SPIEL.tierKarte=k;sprich(name+'. '+z)}
function warenZeigen(){var W=WAREN,e=$('warenLeiste');if(!W||!W.an){e.textContent='';return}var h='',i,w,NW=W.nw||4;
 if(!W.start)h+='<p class="karte">'+esc(t('waren.leer'))+'</p>';
 else{h+='<table><tr><th></th><th>'+esc(t('waren.da'))+'</th><th>'+esc(t('waren.res'))+'</th><th>'+esc(t('waren.unterwegs'))+'</th></tr>';
  for(w=0;w<NW;w++)h+='<tr><td>'+esc(t('ware.'+w))+'</td><td>'+W.summe[0][w]+'</td><td>'+W.summe[1][w]+'</td><td>'+W.summe[2][w]+'</td></tr>';h+='</table>';
  h+='<p class="leise">'+esc(t('waren.zahl',{l:W.lager.length,s:W.stapel.length,a:W.auf,g:W.gel,v:W.verbr}))+'</p>';
  for(i=0;i<W.lager.length&&i<6;i++){var L=W.lager[i];h+='<p class="leise"><a href="#" data-geh="'+L[1]+','+L[2]+'">'+esc(t('waren.lager',{n:L[0]}))+'</a> '+esc(t('waren.inhalt',{liste:warenListe(L,4,NW),k:L[3]}))+'</p>'}
  for(i=0;i<W.stapel.length&&i<4;i++){var S2=W.stapel[i];h+='<p class="leise"><a href="#" data-geh="'+S2[1]+','+S2[2]+'">'+esc(t('waren.stapel'))+'</a> '+esc(t('waren.inhalt0',{liste:warenListe(S2,3,NW)}))+'</p>'}
  var KT=W.ket;if(KT){var AN=['','','werkstatt','','kueche','jagdhuette'];h+='<p class="leise">'+esc(t('ketten.tag',{n:KT.tag}))+' · '+esc(t('ketten.ziel',{a:KT.soll[0],c:KT.soll[2],d:KT.soll[3],e:KT.soll[4],f:KT.soll[5]}))+'</p>';
   for(i=0;i<KT.werk.length&&i<6;i++){var Wk=KT.werk[i];h+='<p class="leise"><a href="#" data-geh="'+Wk[2]+','+Wk[3]+'">'+esc(t('ketten.werk',{name:t('bau.art.'+AN[Wk[1]]),n:Wk[0]}))+'</a> '+esc(warenListeVoll(Wk,4,NW))+'</p>'}
   var ez=[];for(w=0;w<NW;w++)if(W.erz[w])ez.push(t('ware.'+w)+' '+W.erz[w]);if(ez.length)h+='<p class="leise">'+esc(t('ketten.erz',{liste:ez.join(' · ')}))+'</p>';
   for(var bit=1;bit<=128;bit*=2)if(KT.hin&bit)h+='<p class="karte">'+esc(t('ketten.hin.'+bit))+'</p>'}}
 for(i=0;i<W.block.length&&i<6;i++){var b=W.block[i];h+='<p class="karte"><a href="#" data-geh="'+b[2]+','+b[3]+'">'+esc(t('waren.baustelle',{n:b[0]}))+'</a> '+esc(t('waren.block.'+b[1]))+'</p>'}
 e.innerHTML=h;[].forEach.call(e.querySelectorAll('[data-geh]'),function(a){a.onclick=function(ev){ev.preventDefault();var q=a.dataset.geh.split(',');KARTE.geh(+q[0]+.5,+q[1]+.5,0)}})}
// Arbeiter antippen: Name, Aufgabe, Last, Fähigkeiten; zwei Schalter für die Rollen (Eingreifen von Hand, sonst Automatik)
// G8: Fähigkeiten f2–f6 und hungrig/durstig kommen gepackt (fa, fb) aus dem Weltkern
function personKarte(k){PERSON=k;var name=personName(k.id),auf=t('person.auf.'+(k.zust===4?'w':k.zust===0?0:k.auf)),fa=k.fa|0,fb=k.fb|0,hu=fb>>7,last=k.last?t('person.last',{m:k.last>>4,w:t('ware.'+((k.last&15)-1))}):'';
 var gl=GLAD&&GLAD.per&&GLAD.per[k.id],her=gl?herkunftText(gl):'';
 $('karte').innerHTML='<b>'+esc(name)+'</b>'+(gl?' <span class="leise">'+esc(t('glad.kurz',{a:gl.alter,h:gl.groesse}))+'</span>':'')+(her?'<br><span class="leise">'+esc(her)+'</span>':'')+'<br>'+esc(auf)+(last?'<br>'+esc(last):'')+(hu?'<br><span class="schlecht">'+esc(t('person.hunger.'+hu))+'</span>':'')+(gl&&gl.ruht?'<br><span class="schlecht">'+esc(t('person.ruht'))+'</span>':gl&&gl.hp<100?'<br><span class="schlecht">'+esc(t('person.gesund',{h:gl.hp,v:Math.max(50,gl.hp)}))+'</span>':'')+'<br>'+esc(t('person.faehig',{a:k.f0,b:k.f1,c:fa&127,d:(fa>>7)&127,e:(fa>>14)&127,f:(fa>>21)&127,g:fb&127}))+'<br>'+
  [1,2,4,8,16,32,64].map(function(bit,i){return '<button class="knopf klein" id="pRolle'+bit+'" aria-pressed="'+(k.darf&bit?'true':'false')+'">'+esc(t('person.rolle.'+(i+1)))+'</button>'}).join(' ')+
  (gl&&gl.hp<100&&GLAD&&GLAD.medicus?' <button class="knopf klein" id="pMedicus">'+esc(t('med.hin'))+'</button>':'');      // K0: zum Medicus
 [1,2,4,8,16,32,64].forEach(function(bit){$('pRolle'+bit).onclick=function(){k.darf^=bit;KERN.befehl('personRolle',{id:k.id,darf:k.darf});personKarte(k)}});
 if($('pMedicus'))$('pMedicus').onclick=function(){medicusKarte()};
 window.AT3SPIEL.angetippt='person:'+k.id;window.AT3SPIEL.personKarte=k;if(!personKarte.still)sprich(name+'. '+auf);personKarte.still=false}
// ── G9c1 Gladiatoren und Sklavenmarkt: Übersicht vom Weltkern (gladiatoren.js meld, nur bei Änderung). Braucht der Markt Kandidaten (neuer Spieltag) oder
// haben Personen noch keine Gladiatordaten, würfelt der Kampfkern (kampfkern.js, unverändertes 1.0, wie trader.js stock) und das Ergebnis geht mit glaLot zurück.
// Würfeln läuft im Kampfkern (eigener Hintergrundkern), hier nur Laden des Anschlusses, Befehl und Liste. Gewürfelt wird je Spieltag nur einmal. ──
var GLAD=null, glaWarte='', heilWarte=-1, KAL=null, WSEED=1;
function anschluss(){if(KAL)return KAL;KAL=new Promise(function(ok,no){if(window.AT3Kampf)return ok(window.AT3Kampf);var s=document.createElement('script');s.src='kampfanschluss.js?v='+V;
 s.onload=function(){ok(window.AT3Kampf)};s.onerror=function(){KAL=null;no(new Error('kampfanschluss.js'))};document.head.appendChild(s)});return KAL}
function herkunftText(g){var h=g.her,b=g.geb;if(!h)return '';var a=t('glad.ort.'+h.art);return b&&b.ortId!==h.ortId?t('glad.her2',{o:h.name,a:a,b:b.name}):t('glad.her1',{o:h.name,a:a})}
function beiGladiatoren(d){GLAD=d.meld||null;window.AT3SPIEL.glad=GLAD;
 var AR=GLAD&&GLAD.arena;if(KARTE)KARTE.fest(GLAD&&GLAD.platz?[{art:'markt-stand',x:GLAD.markt[0],y:GLAD.markt[1]}].concat(AR&&AR.platz?(AR.gross?anlageFest(AR.anlage):[{art:'arena-sand',x:AR.x,y:AR.y}]):[]).concat(GLAD.medicus?[{art:'medicus',x:GLAD.medicus[0],y:GLAD.medicus[1]}]:[])
  .concat(AR&&AR.leichen?AR.leichen.map(function(l){return{art:'leiche',x:l.x,y:l.y,info:l}}):[]):[]);      // G9d2: feste Arena; G9d3: Leichen einen Spieltag
 // G9d3 Heilung wie 1.0: neuer Spieltag → alle Lebenden im Kampfkern heilen (KA.heile, Tageswechsel aus data.js), Ergebnis mit glaHeil zurück. Einmal je Spieltag.
 var h=GLAD&&GLAD.heil;if(h&&heilWarte!==h.tag){heilWarte=h.tag;
  Promise.all([anschluss(),KERN.glaDaten({heil:1})]).then(function(r){var KA=r[0],D=r[1];if(!D||D.tag!==h.tag||!D.liste.length){if(D&&D.tag===h.tag)KERN.befehl('glaHeil',{tag:h.tag,liste:[]});return null}
   return KA.heile({tag:h.tag,tage:h.tage,gs:D.liste.map(function(e){return e.g})},'',V).then(function(H){var nach={};H.forEach(function(x){if(x&&x.g)nach[String(x.g.id)]=x});
    KERN.befehl('glaHeil',{tag:h.tag,liste:D.liste.map(function(e){var x=nach[String(e.g.id)];return x?{pid:e.pid,gv:e.gv,g:x.g,hp:x.hp,ruht:x.ruht}:null}).filter(Boolean)})})})
   .catch(function(e){heilWarte=-1;console.warn('Heilung:',e)})}
 var b=GLAD&&GLAD.braucht;if(b){var key=b.tag+':'+b.lot+':'+b.start;if(glaWarte!==key){glaWarte=key;
  anschluss().then(function(KA){return KA.wuerfle({seed:((WSEED>>>0)^Math.imul(b.tag+1,0x9e3779b1))>>>0,n:b.lot+b.start},'',V)}).then(function(L){
   KERN.befehl('glaLot',{tag:b.tag,lot:L.slice(0,b.lot),start:L.slice(b.lot)})},function(e){glaWarte='';console.warn('Sklavenmarkt:',e)})}}
 var M=GLAD&&GLAD.meld,m=M&&M[M.length-1];if(m&&m.tick!==beiGladiatoren.letzt){beiGladiatoren.letzt=m.tick;if(m.med){MED.warte=0;$('weltInfo').textContent=m.ok?t('med.ok',{n:m.name,s:t('med.tier.'+m.tier),k:m.kosten}):t('med.nein.'+m.grund)}else if(window.AT3SPIEL.angetippt==='markt'){$('weltInfo').textContent=m.ok?t('markt.gekauft',{n:m.name}):t('markt.nein.'+m.grund);
   if(m.ok)aufdecken(m);else if(m.grund==='no_gold'&&HANDEL){MK.quote=zieh('broke');sprich(MK.quote)}}}
 if(window.AT3SPIEL.angetippt==='markt')marktKarte(true);
 if(window.AT3SPIEL.angetippt==='medicus')medicusKarte(true);
 if(PERSON&&window.AT3SPIEL.angetippt==='person:'+PERSON.id){personKarte.still=true;personKarte(PERSON)}
 arenaMeld();figurenPflegen();besArenaPflegen()}
// ── AR2b Zuschauer auf der Karte (Thomas 21.11.2026): Lage kommt je Takt vom Weltkern (beiBesucher → KARTE.besucher). Für die Wege drinnen braucht die Karte
// Arena und Sitzplätze (arena-sitze.js, erst beim ersten Zuschauer geladen); Blätter der 60 Besuchertypen zeichnet der Kampfkern (KA.kfiguren btypen),
// nur für Typen, die gerade im Bild fehlen, höchstens 8 je Auftrag, ein Auftrag unterwegs. Antippen: Name im Klang der Kultur des Herkunftsorts (herrscher.js
// Namenstafel, fest aus Termin und Nummer), Stand, Herkunft, Zustand. Kerne: hier nur Nachfrage und Text. Notausschalter ?ar2b=0 (auch im Weltkern) ──
var BESL=null, BESW=false, AR2B_AUS=/[?&]ar2b=0/.test(location.search);
// AR2c1: die Blätter kommen gleich mit den Bildern von vorn und hinten (für First Person, figurbild.js vornHinten). Notausschalter ?ar2c=0
var AR2C_AUS=/[?&]ar2c=0/.test(location.search);
function skript(src,glob){return new Promise(function(ok,no){if(window[glob])return ok();var s=document.createElement('script');s.src=src+'?v='+V;s.onload=ok;s.onerror=function(){no(new Error(src))};document.head.appendChild(s)})}
function besArenaPflegen(){if(AR2B_AUS||!KARTE||!KARTE.besucherArena)return;var A=GLAD&&GLAD.arena,B=A&&A.gross&&A.anlage&&A.bes;if(!B){if(besArenaPflegen.an){besArenaPflegen.an=false;KARTE.besucherArena(null)}return}
 if(!window.AT3SITZE||!window.AT3HERRSCHER){if(!BESL)BESL=Promise.all([skript('arena-sitze.js','AT3SITZE'),skript('herrscher.js','AT3HERRSCHER')]).then(besArenaPflegen,function(e){BESL=null;console.warn('Zuschauer:',e)});return}
 besArenaPflegen.an=true;KARTE.besucherArena(A.anlage,window.AT3SITZE)}
// Z4b: danach die Nahblätter für 2× und 4× (KA.knah btypen, volle 1.0-Figur ohne Waffen), auf 2× höchstens 4 je Auftrag, auf 4× einer; gezeichnet im Kampfkern
function besucherNahPflegen(){var N=KARTE.besucherNahFehlt&&KARTE.besucherNahFehlt();if(!N)return;BESW=true;var teil=N.typen.slice(0,N.stufe===4?1:4);
 anschluss().then(function(KA){return KA.knah({btypen:teil,bseed:WSEED>>>0,ohneArbeit:true,stufe:N.stufe,lasten:false},'',V)}).then(function(R){if(KARTE)KARTE.besucherNahBlaetter(R)})
  .catch(function(e){console.warn('Zuschauer nah:',e)}).then(function(){BESW=false;if(KARTE)KARTE.plan()})}
function besucherPflegen(){if(AR2B_AUS||BESW||!KARTE||!KARTE.besucherFehlt)return;var fehlt=KARTE.besucherFehlt();if(!fehlt.length)return besucherNahPflegen();BESW=true;var mehr=fehlt.length>8;
 anschluss().then(function(KA){return KA.kfiguren({btypen:fehlt.slice(0,8),bseed:WSEED>>>0,ohneArbeit:true,vh:!AR2C_AUS},'',V)}).then(function(R){if(KARTE)KARTE.besucherBlaetter(R)})
  .catch(function(e){mehr=false;console.warn('Zuschauerfiguren:',e)}).then(function(){BESW=false;if(mehr)setTimeout(besucherPflegen,50)})}
function besHash(s,n){var h=0x811c9dc5;s=String(s)+'#'+n;for(var i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0}
var BES_STAND=[0,0,0,0,0,1,1,1,2,2,3,3,3,4,4,5,5,6,6,6];      // wie figurbild.js STAND (Typ % 20 → Stand)
function besucherInfo(k){var B=GLAD&&GLAD.arena&&GLAD.arena.bes,her=B&&B.her&&B.her[k.sp]||[0,''],ku=her[0]>=1&&her[0]<=24?her[0]:0,P=window.AT3HERRSCHER,h=besHash(B?B.id:'',k.id),name;
 if(P&&ku)name=P.name({kultur:ku,vor:h%8,fam:(h>>>3)%6});else{var N=t('person.namen').split('|');name=N[h%N.length]}
 var st=t('bes.stand.'+BES_STAND[k.typ%20]);return{name:name,stand:st,ort:her[1],zeile:her[1]?t('bes.zeile',{stand:st,ort:her[1]}):t('bes.zeileOhne',{stand:st}),zust:t('bes.zust.'+k.st)}}
function besucherKarte(k){var I=besucherInfo(k);$('karte').innerHTML='<b>'+esc(I.name)+'</b><br>'+esc(I.zeile)+'<br><span class="leise">'+esc(I.zust)+'</span>';
 window.AT3SPIEL.angetippt='besucher:'+k.id;window.AT3SPIEL.besucherKarte=Object.assign({},k,I);sprich(I.name+'. '+I.zeile+'. '+I.zust)}
// ── F1b Kartenfiguren wie 2.0 (Thomas 18.11.2026): fehlt einer Person ihr Posenblatt (neu oder Datenstand gv geändert), holt das Spiel ihr Aussehen vom Weltkern
// (glaDaten figur) und lässt den Kampfkern das Blatt in AT3-64 zeichnen (KA.kfiguren). Höchstens 8 je Auftrag, immer nur ein Auftrag unterwegs; bis dahin Ersatzbild.
// Kerne: Hauptkern nur Nachfrage und einmal ins Canvas legen, gezeichnet wird im Kampfkern. Notausschalter: ?f1=0 ──
var FIGW=false, F1AUS=/[?&]f1=0/.test(location.search);
function figurenPflegen(){if(F1AUS||FIGW||!KARTE||!KARTE.figurHat||!GLAD||!GLAD.per)return;var da={},fehlt=[];
 for(var id in GLAD.per){da[id]=1;if(!KARTE.figurHat(+id,GLAD.per[id].gv|0))fehlt.push(+id)}KARTE.figurVergessen(da);if(!fehlt.length)return;
 FIGW=true;var teil=fehlt.slice(0,8),mehr=fehlt.length>8;
 Promise.all([anschluss(),KERN.glaDaten({figur:teil})]).then(function(r){var KA=r[0],D=r[1];if(!D||!D.length){mehr=false;return null}
  return KA.kfiguren({gs:D.map(function(e){return{pid:e.pid,g:e.g}}),lasten:true},'',V).then(function(R){R.blaetter.forEach(function(b,i){b.gv=D[i].gv});if(KARTE)KARTE.figurBlaetter(R)})})
  .catch(function(e){mehr=false;console.warn('Kartenfiguren:',e)}).then(function(){FIGW=false;if(mehr)setTimeout(figurenPflegen,50)})}
// ── F1c Nahansicht (Thomas 18.11.2026): meldet die Karte auf 1× oder 2× Personen im Bild ohne Nahblatt, holt das Spiel ihr Aussehen (glaDaten figur) und lässt
// den Kampfkern die volle 1.0-Figur in AT3-64 zeichnen (KA.knah). Stück für Stück: höchstens 2 je Auftrag, ein Auftrag unterwegs. Notausschalter: ?f1c=0 (Karte) ──
var NAHW=false;
function figurenNahPflegen(){if(F1AUS||NAHW||!KARTE||!KARTE.nahSichtbar||!GLAD||!GLAD.per)return;var fehlt=KARTE.nahSichtbar().filter(function(id){var p=GLAD.per[id];return p&&!KARTE.nahHat(id,p.gv|0)});
 if(!fehlt.length)return;NAHW=true;var teil=fehlt.slice(0,KARTE.nahStufe&&KARTE.nahStufe()===4?1:2);   // Z4a: 4×-Blätter einzeln (4-mal so groß)
 Promise.all([anschluss(),KERN.glaDaten({figur:teil})]).then(function(r){var KA=r[0],D=r[1];if(!D||!D.length)return null;
  var st=KARTE.nahStufe?KARTE.nahStufe():2;   // Z4a: Stufe 4 = Detailblatt für 4×
  return KA.knah({gs:D.map(function(e){return{pid:e.pid,g:e.g}}),stufe:st,lasten:KARTE.nahLastFehlt?KARTE.nahLastFehlt(st):!(KARTE.nahTest&&KARTE.mess.nah)},'',V).then(function(R){R.blaetter.forEach(function(b,i){b.gv=D[i].gv});if(KARTE)KARTE.figurBlaetter(R)})})
  .catch(function(e){console.warn('Nahfiguren:',e)}).then(function(){NAHW=false;if(KARTE)KARTE.plan()})}
// ── G9d2 Arena (Thomas 17.11.2026): feste Arena am Startplatz (Weltkern arena.js). Antippen zeigt Termin oder „Plan a fight“. Planen öffnet das Kampffenster mit der
// Aufstellung 1:1 aus 1.0 (kampffenster.js, Modus wahl); „KAMPF!“ dort bucht den Termin am nächsten Spieltag (Befehl arenaTermin). Ist er fällig (alle an der Arena
// oder spät genug), öffnet das Spiel das Kampffenster von selbst (Modus kampf); das Ergebnis geht genau einmal mit arenaErgebnis in den Weltkern. Die Weltuhr steht,
// solange das Kampffenster offen ist. Kerne: hier nur Anzeige und Befehle; gerechnet wird im Weltkern und im Kampffenster (1.0). ──
var ARENA_OFFEN=false, arenaAuto='', arenaTempo=0;
// ── AR1c1 Arena als große Anlage (Thomas 20.11.2026): Bild aus der Kartei (arena-sandgrube, Anker Mitte), Häuschen je ein Feld (Richtung nach der Seite zur Anlage:
// Anlage nördlich/südlich → Bild wie gezeichnet, westlich/östlich → gespiegelt), Schild „closed“ auf dem Feld vor dem Eingangshäuschen (ohne Häuschen am Südrand).
// Werkzeuge in der Gruppe „Attractions“: antippen setzt die Arena (Mitte) oder ein Häuschen; Antwort kommt als Meldung vom Weltkern (arenaMeld). Neue Spiele starten
// ohne Arena, ein Hinweis zeigt den Weg ins Baumenü. Alles nur Liste und Text im Hauptkern, gerechnet wird im Weltkern (attraktion.js). ──
var DXS=[0,-1,0,1], DYS=[-1,0,1,0], attHinweis=false;
function anlageFest(A){if(!A||A.x<0)return[];var L=[{art:A.id,x:A.x+(A.w>>1),y:A.y+(A.h>>1),anl:1}];
 if(A.ein)L.push({art:'arena-eingang',x:A.ein[0],y:A.ein[1],r:A.ein[2]&1});if(A.aus)L.push({art:'arena-ausgang',x:A.aus[0],y:A.aus[1],r:A.aus[2]&1});
 if(!A.offen){var e=A.ein,sx=e?e[0]-DXS[e[2]]:A.x+(A.w>>1),sy=e?e[1]-DYS[e[2]]:A.y+A.h;L.push({art:'schild-closed',x:sx,y:sy})}
 return L}
function attTipp(f){if(!f||f.x==null){$('bauInfo').textContent=t('weg.tippLand');return}var AR=GLAD&&GLAD.arena;
 if(!AR){$('bauInfo').textContent=t('att.grund.no_world');return}
 if(BAUW==='arena'){var A=AR.anlage,w=A?A.w:17,h=A?A.h:17;KARTE.rahmen({x:f.x-(w>>1),y:f.y-(h>>1),w:w,h:h},null);KERN.befehl('arenaSetzen',{x:f.x,y:f.y})}
 else KERN.befehl('arenaHaus',{art:BAUW==='eingang'?'ein':'aus',x:f.x,y:f.y});
 $('bauInfo').textContent=t('att.wartet');window.AT3SPIEL.attBefehl={art:BAUW,x:f.x,y:f.y}}
function attText(g){var k='att.grund.'+g;return TXT[k]!=null?t(k):grundText(g)}
function attZustand(A){return A.offen?t('att.offen',{n:A.schlange}):t('att.zu.'+A.grund)}
function arenaPause(){arenaTempo=KERN.zustand.tempo;if(arenaTempo)KERN.befehl('tempo',0)}
function arenaWeiter(){if(arenaTempo)KERN.befehl('tempo',arenaTempo);arenaTempo=0}
function arenaMeld(){var A=GLAD&&GLAD.arena,T=A&&A.termin,M=GLAD&&GLAD.meld,m=M&&M[M.length-1];
 if(m&&m.arena&&m.tick!==arenaMeld.letzt){arenaMeld.letzt=m.tick;
  if(m.art){KARTE.rahmen(null);window.AT3SPIEL.attMeld=m;$('bauInfo').textContent=m.ok?(m.haus?t('att.ok.'+m.haus)+' ':t('att.ok.arena')+' ')+(A&&A.anlage?attZustand(A.anlage):''):attText(m.grund)}      // AR1c1
  else if(!m.ok)$('weltInfo').textContent=t('arena.nein.'+m.grund)}
 if(A&&A.gross&&!A.platz&&GLAD.platz&&!attHinweis){attHinweis=true;$('weltInfo').textContent=t('att.hinweis')}      // AR1c1: neues Spiel ohne Arena
 if(A&&A.platz&&attHinweis===true){attHinweis=2;if($('weltInfo').textContent===t('att.hinweis'))$('weltInfo').textContent=''}
 if(T&&T.zu===2&&!ARENA_OFFEN&&arenaAuto!==T.id){arenaAuto=T.id;arenaFrage()}      // G9d3: ansehen oder nur Ergebnis
 if(window.AT3SPIEL.angetippt==='arena')arenaKarte(true);if(BERICHT&&window.AT3SPIEL.angetippt==='bericht')arenaBericht()}
function arenaGeld(L){return L.bonus==null?t('arena.tickets',{z:L.zuschauer,t:L.tickets|0}):L.ohne?t('arena.ohne'):t('arena.tickets2',{z:L.zuschauer|0,t:L.tickets|0,b:L.bonus|0})}      // AR2a: echte Zuschauer mit Bonus
// AR2a: Zuschauer während des Termins (Weltkern besucher.js kurz)
function arenaZuschauer(B){if(!B)return'';if(B.ohne)return t('arena.bes.ohne');if(B.ende)return B.kommen?t('arena.bes.geht',{n:B.drin+B.schlange+B.hin+B.gehen}):'';
 return t('arena.bes',{s:B.sitzen,i:B.drin-B.sitzen,q:B.schlange,h:B.hin+Math.max(0,B.soll-B.kommen),t:B.tickets,p:B.plaetze})}
function arenaLetzt(L){var w={s:'☠'.repeat(L.skulls|0),l:L.label,g:L.praemie|0};return t(L.abgesagt?'arena.letzt.ab':L.gewonnen?'arena.letzt.sieg':'arena.letzt.niederlage',w)+
 (L.abgesagt?'':(L.zuschauer!=null?' '+arenaGeld(L):'')+(L.tote&&L.tote.length?' '+t('arena.letzt.tote',{n:L.tote.join(', ')}):''))}      // G9d3: Tickets, Gefallene
function arenaKarte(still){var A=GLAD&&GLAD.arena,e=$('karte'),info=OBJTXT['arena-sand.info']||'',T=A&&A.termin,h;window.AT3SPIEL.angetippt='arena';
 if(!A||!A.platz){e.textContent=t('arena.zu');return}
 if(A.gross&&A.anlage)info=OBJTXT[A.anlage.id+'.info']||info;
 h='<b>'+esc(t('arena.titel'))+'</b>'+(info&&!still?'<br><span class="leise">'+esc(info)+'</span>':'')+(A.gross&&A.anlage?'<br><span class="'+(A.anlage.offen?'leise':'schlecht')+'">'+esc(attZustand(A.anlage))+'</span>':'');      // AR1c1: offen/zu
 if(T)h+='<br>'+esc(t('arena.termin',{tag:T.tag+1,s:'☠'.repeat(T.skulls),l:T.label}))+'<br><span class="leise">'+esc(t('arena.kaempfer',{n:T.ids.map(personName).join(', ')}))+'</span><br><span class="leise">'+
  esc(t('arena.zu'+T.zu,{da:A.da|0,n:T.ids.length}))+'</span>'+(A.bes?'<br><span class="'+(A.bes.ohne?'schlecht':'leise')+'">'+esc(arenaZuschauer(A.bes))+'</span>':'')+'<br>'+(T.zu===2?'<button class="knopf klein" data-arena="kampf">'+esc(t('arena.ansehen'))+'</button> <button class="knopf klein" data-arena="ergebnis">'+esc(t('arena.nurerg'))+'</button> ':'')+'<button class="knopf klein" data-arena="absage">'+esc(t('arena.absage'))+'</button>';
 else h+='<br><span class="leise">'+esc(A.letzt?arenaLetzt(A.letzt):t('arena.frei'))+'</span>'+(A.bes&&A.bes.ende&&arenaZuschauer(A.bes)?'<br><span class="leise">'+esc(arenaZuschauer(A.bes))+'</span>':'')+'<br><button class="knopf klein" data-arena="wahl">'+esc(t('arena.planen'))+'</button>';
 if(A.gefallen)h+='<br><span class="leise">'+esc(t('arena.gefallen.zahl',{n:A.gefallen}))+'</span>';
 e.innerHTML=h;[].forEach.call(e.querySelectorAll('[data-arena]'),function(b){b.disabled=ARENA_OFFEN;b.onclick=function(){var w=b.dataset.arena;if(w==='absage'){KERN.befehl('arenaAbsage',{id:T.id});return}if(w==='ergebnis'){arenaNurErgebnis();return}arenaFenster(w)}});
 if(!still)sprich(t('arena.titel')+'. '+(T?t('arena.termin.kurz',{tag:T.tag+1}):t('arena.frei')))}
function arenaFenster(modus){if(ARENA_OFFEN)return;var q=$('arenaFrage');if(q){q.remove();arenaWeiter()}ARENA_OFFEN=true;$('weltInfo').textContent=t('arena.laedt');var D=null;
 function fin(){ARENA_OFFEN=false;if(window.AT3SPIEL.angetippt==='arena')arenaKarte(true)}
 Promise.all([anschluss(),KERN.glaDaten({arena:1})]).then(function(r){var KA=r[0];D=r[1];if(!D||(modus==='kampf'&&!D.termin))throw new Error('no data');
  var a={id:modus==='kampf'?'arena-'+D.termin.id:'arena-wahl-'+Date.now(),modus:modus,kader:D.kader.map(function(k){return{g:k.g}}),auf:D.auf,orte:D.orte,heute:D.heute,gold:D.gold,
   seed:modus==='kampf'?D.termin.seed:1,termin:D.termin};
  return KA.fenster(a,{basis:'',v:V,pause:arenaPause,weiter:arenaWeiter})}).then(function(erg){
  if(modus==='wahl'&&erg&&erg.termin){var T=erg.termin,P={};D.kader.forEach(function(k){P[String(k.g.id)]=k.pid});
   var ids=(T.gids||[]).map(function(g){return P[g]}).filter(Boolean);if(!ids.length)return;
   KERN.befehl('arenaTermin',{ids:ids,offer:T.offer,auf:T.auf||null,seed:crypto.getRandomValues(new Uint32Array(1))[0]>>>0,label:String(T.label||'').slice(0,200),skulls:Math.min(5,Math.max(1,T.skulls|0)),ort:T.ort||null});
   $('weltInfo').textContent=t('arena.gebucht',{tag:D.heute+2});sprich(t('arena.termin.kurz',{tag:D.heute+2}))}
  else if(modus==='kampf'&&erg&&erg.arena){
   arenaSenden(D,erg);var txt=t(erg.gewonnen?'arena.sieg':'arena.niederlage',{g:erg.praemie|0});$('weltInfo').textContent=txt;sprich(txt)}
  fin()},function(e){fin();var x=e&&e.message||'';if(x!=='abgebrochen'&&x!=='closed'){console.warn('Arena:',e);$('weltInfo').textContent=t('arena.fehler',{e:x})}})}
// ── G9d3 Ergebnis und Folgen (Thomas 17.11.2026). Ergebnis genau einmal mit arenaErgebnis in den Weltkern, dazu Spektakel (×100) und Ruhmfaktor (×1000) aus 1.0 für die
// Tickets (arena.js). Ist der Kampf fällig, fragt das Spiel: ansehen (Kampffenster wie G9d2) oder nur Ergebnis (KA.arena im Kampfkern, ohne Fenster, die Weltuhr läuft
// weiter, danach kurzer Ergebnisbericht). Solange die Frage offen ist, steht die Weltuhr. ──
function arenaSenden(D,erg){KERN.befehl('arenaErgebnis',{id:D.termin.id,praemie:Math.max(0,erg.praemie|0),gewonnen:erg.gewonnen?1:0,auf:erg.auf||null,
  spekt:Math.max(0,Math.min(100000,Math.round((+erg.spekt||1)*100))),ruhm:Math.max(0,Math.min(10000,Math.round((+erg.ruhmMul||1)*1000))),angesehen:erg.angesehen===false?0:1,
  einheiten:erg.einheiten.map(function(u){return{key:u.key,g:u.g||null,tot:u.tot,unten:u.unten,leben:u.leben,verletzt:u.verletzt,schwer:u.schwer,verletzungen:u.verletzungen,ursache:u.ursache}})})}
function arenaFrage(){var A=GLAD&&GLAD.arena,T=A&&A.termin;if(!T||ARENA_OFFEN||$('arenaFrage'))return;arenaPause();
 var d=document.createElement('div');d.id='arenaFrage';d.className='arena-frage';
 d.innerHTML='<div class="arena-frage-box"><b>'+esc(t('arena.frage'))+'</b><br><span class="leise">'+esc(t('arena.termin',{tag:T.tag+1,s:'☠'.repeat(T.skulls),l:T.label}))+'</span><br><span class="leise">'+esc(t('arena.frage.leise'))+'</span><br>'+
  '<button class="knopf" data-wahl="kampf">'+esc(t('arena.ansehen'))+'</button> <button class="knopf" data-wahl="ergebnis">'+esc(t('arena.nurerg'))+'</button></div>';
 document.body.appendChild(d);sprich(t('arena.frage')+' '+t('arena.frage.leise'));
 [].forEach.call(d.querySelectorAll('[data-wahl]'),function(b){b.onclick=function(){d.remove();arenaWeiter();if(b.dataset.wahl==='kampf')arenaFenster('kampf');else arenaNurErgebnis()}})}
function arenaNurErgebnis(){if(ARENA_OFFEN)return;var q=$('arenaFrage');if(q){q.remove();arenaWeiter()}ARENA_OFFEN=true;$('weltInfo').textContent=t('arena.rechnet');var D=null;
 function fin(){ARENA_OFFEN=false;if(window.AT3SPIEL.angetippt==='arena')arenaKarte(true)}
 Promise.all([anschluss(),KERN.glaDaten({arena:1})]).then(function(r){var KA=r[0];D=r[1];if(!D||!D.termin)throw new Error('no data');
  return KA.arena({id:'arena-'+D.termin.id,seed:D.termin.seed,kader:D.kader.map(function(k){return k.g}),auf:D.termin.auf||D.auf,offer:D.termin.offer,heute:D.heute},'',V)}).then(function(erg){fin();
  if(!erg)return;if(erg.fehler){$('weltInfo').textContent=erg.fehler==='unfit'?t('arena.unfit',{n:erg.name}):t('arena.nein.nobody2');arenaAuto='';return}
  arenaSenden(D,erg);BERICHT={erg:erg,id:D.termin.id,label:D.termin.label,skulls:D.termin.skulls};arenaBericht();
  var txt=t(erg.gewonnen?'arena.sieg':'arena.niederlage',{g:erg.praemie|0});$('weltInfo').textContent=txt;sprich(txt)},
  function(e){fin();arenaAuto='';console.warn('Arena:',e);$('weltInfo').textContent=t('arena.fehler',{e:e&&e.message||''})})}
// Kurzer englischer Ergebnisbericht nach „Result only“: Sieg/Niederlage, Prämie und Tickets (sobald der Weltkern sie gebucht hat), je Kämpfer Zustand und Kills
var BERICHT=null;
function arenaBericht(){var B=BERICHT;if(!B)return;var e=$('karte'),erg=B.erg,A=GLAD&&GLAD.arena,L=A&&A.letzt&&A.letzt.id===B.id?A.letzt:null;window.AT3SPIEL.angetippt='bericht';
 var h='<b>'+esc(t(erg.gewonnen?'arena.bericht.sieg':'arena.bericht.niederlage',{s:'☠'.repeat(B.skulls|0),l:B.label}))+'</b>';
 if(L)h+='<br>'+esc(L.bonus==null?t('arena.bericht.geld',{g:L.praemie|0,z:L.zuschauer|0,t:L.tickets|0}):t('arena.bericht.geld2',{g:L.praemie|0,z:L.zuschauer|0,t:L.tickets|0,b:L.bonus|0})+(L.ohne?' '+t('arena.ohne'):''));
 erg.einheiten.filter(function(u){return u.team===0}).forEach(function(u){var z=u.tot?(u.ursache?t('arena.bericht.tot',{u:u.ursache}):t('arena.bericht.tot0')):u.schwer?t('arena.bericht.schwer'):u.verletzt?t('arena.bericht.leicht'):t('arena.bericht.heil');
  h+='<br><span class="'+(u.tot||u.schwer?'schlecht':'leise')+'">'+esc(u.name+': '+z+(u.kills?' · '+t('arena.bericht.kills',{k:u.kills}):''))+'</span>'});
 if(L&&L.tote&&L.tote.length)h+='<br><span class="leise">'+esc(t('arena.gefallen',{n:L.tote.join(', ')}))+'</span>';
 h+='<br><button class="knopf klein" id="berichtZu">'+esc(t('arena.bericht.weiter'))+'</button>';e.innerHTML=h;$('berichtZu').onclick=function(){BERICHT=null;e.textContent='';window.AT3SPIEL.angetippt=''}}
// Leiche antippen (liegt einen Spieltag neben der Arena)
// ── K0 Medicus (Thomas 18.11.2026: Gebäude am festen Platz, Stufen und Kosten wie 1.0, keine Automatik). Antippen zeigt alle Verletzten mit Gesundheit und den drei
// Stufen aus 1.0 (Medicus, Premium, Special care) samt Preis. Preis und Behandlung rechnet der Kampfkern (KA.behandle, unverändertes treat()/medicalCost() aus data.js),
// das Gold bucht der Weltkern (glaBehandle, nur wenn Datenstand gv und Kasse passen). Preise einmal je Datenstand gerechnet und gemerkt. ──
var MED={key:'',liste:null,laeuft:false,warte:0};
function medGold(){return bauStand&&bauStand.gold!=null?bauStand.gold|0:GLAD&&GLAD.gold|0}      // Kasse: neuester Stand (Bau meldet öfter als der Markt)
function medicusKarte(still){var e=$('karte'),info=OBJTXT['medicus.info']||'';window.AT3SPIEL.angetippt='medicus';
 if(!GLAD||!GLAD.medicus){e.textContent=t('med.zu');return}
 var per=GLAD.per||{},ids=Object.keys(per).filter(function(id){var g=per[id];return g&&(g.hp<100||g.ruht)}).sort(function(a,b){return per[a].hp-per[b].hp||a-b}),
  key=ids.map(function(id){return id+':'+per[id].gv}).join(','),h='<b>'+esc(t('med.titel'))+'</b>'+(info&&!still?'<br><span class="leise">'+esc(info)+'</span>':'')+'<br>'+esc(t('med.gold',{g:medGold()}));
 if(!ids.length){e.innerHTML=h+'<br><span class="leise">'+esc(t('med.keiner'))+'</span>';if(!still)sprich(t('med.titel')+'. '+t('med.keiner'));return}
 if(key!==MED.key&&!MED.laeuft){MED.laeuft=true;var k0=key;
  Promise.all([anschluss(),KERN.glaDaten({figur:ids.map(Number)})]).then(function(r){return r[0].behandle({gs:r[1].map(function(x){return x.g})},'',V).then(function(L){
   var nach={};L.forEach(function(x){nach[x.id]=x});MED.liste=r[1].map(function(x){var c=nach[String(x.g.id)];return c?{pid:x.pid,gv:x.gv,kosten:c.kosten,laeuft:c.laeuft,tage:c.tage}:null}).filter(Boolean);MED.key=k0})})
   .catch(function(err){console.warn('Medicus:',err);$('weltInfo').textContent=t('med.fehler')}).then(function(){MED.laeuft=false;if(window.AT3SPIEL.angetippt==='medicus')medicusKarte(true)})}
 if(key!==MED.key){e.innerHTML=h+'<br><span class="leise">'+esc(t('med.laedt'))+'</span>';return}
 var preis={};MED.liste.forEach(function(x){preis[x.pid]=x});
 h+='<br><span class="leise">'+esc(t('med.hilfe'))+'</span>';
 ids.forEach(function(id){var g=per[id],p=preis[id];if(!p)return;
  h+='<br><b>'+esc(personName(+id))+'</b> <span class="schlecht">'+esc(t('med.hp',{h:g.hp}))+(g.ruht?' · '+esc(t('med.ruht')):'')+'</span>'+(p.laeuft?' <span class="leise">'+esc(t('med.laeuft',{s:t('med.tier.'+p.laeuft),d:p.tage}))+'</span>':'')+'<br>'+
   [1,2,3].map(function(s){return '<button class="knopf klein" data-med="'+id+':'+s+'"'+(medGold()<p.kosten[s-1]||MED.warte?' disabled':'')+'>'+esc(t('med.knopf',{s:t('med.tier.'+s),k:p.kosten[s-1]}))+'</button>'}).join(' ')});
 e.innerHTML=h;[].forEach.call(e.querySelectorAll('[data-med]'),function(b){b.onclick=function(){var q=b.dataset.med.split(':');medBehandle(+q[0],+q[1])}});
 if(!still)sprich(t('med.titel')+'. '+t('med.hilfe'))}
function medBehandle(pid,tier){if(MED.warte)return;MED.warte=1;medicusKarte(true);
 Promise.all([anschluss(),KERN.glaDaten({figur:[pid]})]).then(function(r){var x=r[1]&&r[1][0];if(!x)throw new Error('gone');
  return r[0].behandle({gs:[x.g],tier:tier},'',V).then(function(B){setTimeout(function(){if(MED.warte){MED.warte=0;if(window.AT3SPIEL.angetippt==='medicus')medicusKarte(true)}},5000);KERN.befehl('glaBehandle',{pid:pid,gv:x.gv,tier:tier,kosten:B.kosten,g:B.g,hp:B.hp,ruht:B.ruht})})})
  .catch(function(err){console.warn('Medicus:',err);MED.warte=0;$('weltInfo').textContent=t('med.fehler');if(window.AT3SPIEL.angetippt==='medicus')medicusKarte(true)})}
function festKarte(e){if(e.art==='markt-stand'){marktKarte();return true}if(e.art==='arena-sand'||e.anl||e.art==='arena-eingang'||e.art==='arena-ausgang'||e.art==='schild-closed'){arenaKarte();return true}if(e.art==='medicus'){medicusKarte();return true}if(e.art==='leiche'&&e.info){leicheKarte(e.info);return true}return false}      // K0: Karte und First Person
function leicheKarte(l){var e=$('karte');window.AT3SPIEL.angetippt='leiche';
 e.innerHTML='<b>'+esc(t('leiche.titel',{n:l.name}))+'</b>'+(l.her?'<br><span class="leise">'+esc(t('leiche.her',{o:l.her}))+'</span>':'')+(l.ursache?'<br>'+esc(t('leiche.ursache',{u:l.ursache})):'')+'<br><span class="leise">'+esc(t('leiche.info'))+'</span>';
 sprich(t('leiche.titel',{n:l.name}))}
// ── G9c2 Kandidatenkarte wie in 1.0 (Thomas 17.11.2026): Reiter I–V, Porträt aus 1.0, vor dem Kauf verdeckt (Kampfwert, Talent, Klassen, Eigenschaften „?“),
// nach dem Kauf Aufdeckkarte mit Kampfwert, Talentstufe, Klassen, Eigenschaften, Plus/Minus und Seltenheit (Fortuna); dazu die Händlersprüche aus 1.0, englisch.
// Rechnen im Kampfkern (KA.karten: barracks info/analysis, buy-odds, Porträt auf OffscreenCanvas), volle Daten nur auf Nachfrage vom Weltkern (glaDaten).
// Texte: sprache/handel-en.json, erst beim ersten Öffnen geladen. Einmal je Spieltag gerechnet und gemerkt; Hauptkern zeichnet nur die fertigen Bilder.
var HANDEL=null, HANDEL_L=null, MK={i:-1,tag:-1,karten:null,bilder:null,laedt:'',kauf:null,rev:null,quote:''};
var ROLLE_ICON={Soldat:'🛡',Assassine:'🗡',Fernkämpfer:'🏹'};
function handel(){if(HANDEL)return Promise.resolve(HANDEL);if(!HANDEL_L)HANDEL_L=holeJson('sprache/handel-en.json').then(function(d){HANDEL=d;return d},function(e){HANDEL_L=null;throw e});return HANDEL_L}
function hw(w){return (HANDEL&&HANDEL.woerter[w])||w}
function hm(k,w){var s=HANDEL.muster[k];for(var n in w)s=s.replace('{'+n+'}',w[n]);return s}
function analyseText(x){var s=x.text,r;if(HANDEL.woerter[s])return HANDEL.woerter[s];
 if((r=/^(.+) · (Kraft|Beweglichkeit)$/.exec(s)))return hm('teil',{t:hw(r[1]),w:hw(r[2])});
 if((r=/^(enormes|gutes) (.+)-Potenzial$/.exec(s)))return hm(r[1]==='enormes'?'potenzial2':'potenzial1',{w:hw(r[2])});
 if((r=/^(außergewöhnliche|starke|sehr schlechte|schlechte) (.+)-Eignung$/.exec(s)))return hm({'außergewöhnliche':'eignung2','starke':'eignung1','sehr schlechte':'eignung-2','schlechte':'eignung-1'}[r[1]],{k:hw(r[2])});
 return s}
var hashId=function(id){var n=7,s=String(id);for(var i=0;i<s.length;i++)n=(n*31+s.charCodeAt(i))>>>0;return n};
var ziehT={};function zieh(k){var L=HANDEL.haendler[k],b=ziehT[k];if(!b||!b.length){b=ziehT[k]=L.map(function(_,i){return i}).sort(function(){return Math.random()-.5})}return L[b.pop()]}
// Wie trader.js claims(g)[0]: was der Händler über genau diesen Kandidaten behauptet (fest je Person; „schwächster“ zählt unter den noch Verfügbaren)
function anpreisen(k){var H=HANDEL.haendler,h=hashId(k.id),out=[],sp=[],pu=function(L){if(L)sp.push.apply(sp,L)};
 if(k.stufe>=8)out=H.jewel.slice();else if(k.stufe>=6)out=H.gem.slice();
 k.tief.forEach(function(s){pu(H.low[s])});var bmi=k.gewicht/Math.pow(k.groesse/100,2);if(bmi<21.5)pu(H.thin);if(bmi>26.5)pu(H.fat);if(k.groesse<170)pu(H.small);if(k.groesse>191)pu(H.tall);if(k.alter>=32)pu(H.old);if(k.alter<=19)pu(H.young);
 k.traits.forEach(function(x){pu(H.trait[x])});
 var r=(MK.karten||[]).filter(function(x,i){return x&&GLAD&&GLAD.lot&&GLAD.lot[i]}).map(function(x){return x.kw}).sort(function(a,b){return a-b});if(r.length>1&&k.kw<=r[0])pu(H.weak);
 var spec=H.special[k.wuchs]||[];if(spec.length)out.unshift(spec[h%spec.length]);
 if(sp.length)out.push(sp[h%sp.length]);if(!out.length)out.push(H.pitch[h%H.pitch.length]);return out[0]}
function sterne(n){var v=Math.round(n/2);return '★★★★★'.slice(0,v)+'☆☆☆☆☆'.slice(0,5-v)}
function oddsText(o){var O=HANDEL.odds,n=1/o.atLeast,f=function(v,d){return v.toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0})},r=function(v){var e=Math.pow(10,Math.floor(Math.log10(v))-1);return Math.round(v/e)*e};
 var ein=n<1.05?O.jeder:n<10?O.von.replace('{n}',f(n,1)):n<1000?O.von.replace('{n}',f(Math.round(n))):n<1e6?O.von.replace('{n}',f(r(n))):n<1e9?O.mio.replace('{n}',f(r(n)/1e6,1).replace(/\.0$/,'')):O.mrd.replace('{n}',f(r(n)/1e9,1).replace(/\.0$/,''));
 var p=o.better*100,pc=p>=99.5?O.fast100:p>=10?f(Math.round(p)):p>=1?f(p,1):p>=.01?f(p,2):O.unter;
 var b=n<1.25?0:n<2?1:n<5?2:n<20?3:n<100?4:n<1000?5:n<10000?6:7;return {band:b,name:O.namen[b],ein:ein,besser:pc}}
function kopfHtml(k,c,offen){var K=HANDEL.karte,ber=c?herkunftText(c):'',ba=k.wuchs&&HANDEL.badge[k.wuchs];
 return '<div class="mk-kopf"><canvas class="mk-bild" width="80" height="100" data-bild="'+MK.zeige+'"></canvas><div><b class="mk-name">'+esc(k.name)+'</b><br><span class="leise">'+esc(K.jahre.replace('{a}',k.alter))+' · '+k.groesse+' cm · '+k.gewicht+' kg</span>'+
  (ba?'<br><span class="mk-badge">'+esc(ba)+'</span>':'')+(ber?'<br><span class="leise">'+esc(ber)+'</span>':'')+
  '<br>'+esc(K.kw)+' <b>'+(offen?k.kw:'?')+'</b><br><span class="mk-sterne">'+(offen?sterne(k.stufe):'?????')+'</span> <b>'+(offen?esc(hw(k.stufeName).toUpperCase()):'???')+'</b> · '+esc(K.talent)+' '+(offen?k.talent:'?')+'</div></div>'+
  '<div class="mk-klassen">'+k.klassen.map(function(x){return '<div class="mk-klasse'+(offen&&k.best===x.rolle?' best':'')+'"><span>'+(ROLLE_ICON[x.rolle]||'')+' '+esc(hw(x.rolle).toUpperCase())+'</span><span>'+(offen?x.ist+' → <b>'+x.pot+'</b>':'? → <b>?</b>')+'</span><small>'+(offen?esc(hw(x.waffe))+' ★'+x.wpot:esc(K.waffe)+' ? ★?')+'</small></div>'}).join('')+'</div>'}
function zeichneBild(e){[].forEach.call(e.querySelectorAll('canvas[data-bild]'),function(c){var b=MK.bilder&&MK.bilder[+c.dataset.bild];var x=c.getContext('2d');x.fillStyle='#202d2f';x.fillRect(0,0,80,100);if(b)x.drawImage(b,0,0)})}
// Karten des heutigen Angebots holen (einmal je Spieltag): volle 1.0-Daten vom Weltkern, Karten und Porträts aus dem Kampfkern
function kartenHolen(){var G2=GLAD;if(!G2||!G2.lot||!G2.lot.length)return;var key=G2.tag+':'+G2.heute;if(MK.tag===key&&(MK.karten||MK.laedt))return;MK.tag=key;MK.karten=null;MK.bilder=null;MK.laedt=key;
 Promise.all([handel(),Promise.all(G2.lot.map(function(c,i){return KERN.glaDaten({i:i})}))]).then(function(r){var gs=r[1].map(function(d){return d&&d.g||null});
  return anschluss().then(function(KA){return KA.karten({lot:gs},'',V)})}).then(function(e){if(MK.laedt!==key)return;MK.laedt='';MK.karten=e.karten;MK.bilder=e.bilder;if(window.AT3SPIEL.angetippt==='markt')marktKarte(true,true)},
  function(e){if(MK.laedt===key){MK.laedt='';MK.tag=-1}console.warn('Kandidatenkarte:',e)})}
function aufdecken(m){var k=MK.kauf&&MK.karten&&MK.karten[MK.kauf.i];sprich(HANDEL?zieh('sold'):'');if(!k||!HANDEL){MK.kauf=null;return}
 var L=HANDEL.haendler.reveal[k.stufe]||HANDEL.haendler.reveal[5],z=L[Math.floor(Math.random()*L.length)].split('{N}').join(k.name.split(' ')[0]),o=k.odds?oddsText(k.odds):null;
 MK.rev={i:MK.kauf.i,k:k,c:MK.kauf.c,quote:z,o:o,fort:o?HANDEL.odds.human[o.band][Math.floor(Math.random()*HANDEL.odds.human[o.band].length)]:''};MK.kauf=null;sprich(z)}
function marktKarte(still,neuBild){var G2=GLAD,e=$('karte'),info=OBJTXT['markt-stand.info']||'';window.AT3SPIEL.angetippt='markt';if(!G2){e.textContent=t('markt.zu');return}
 kartenHolen();if(!HANDEL){if(!still)handel().then(function(){if(window.AT3SPIEL.angetippt==='markt')marktKarte(true)},function(){});}
 var K=HANDEL&&HANDEL.karte,H=HANDEL&&HANDEL.haendler,rv=MK.rev,h,lot=G2.lot||[],n=lot.filter(Boolean).length;
 if(rv&&K){if(still&&!neuBild&&e.querySelector('.mk-rev'))return;MK.zeige=rv.i;var k=rv.k;
  h='<div class="mk-karte mk-rev"><b>'+esc(K.gekauft.replace('{n}',k.name.toUpperCase()))+'</b><p class="mk-quote"><b>'+esc(H.name)+':</b> “'+esc(rv.quote)+'”</p>'+
   (rv.o?'<div class="mk-odds mk-b'+rv.o.band+'"><b>'+esc(HANDEL.odds.kopf.replace('{name}',rv.o.name).replace('{t}',k.talent).replace('{n}',rv.o.ein))+'</b><br><span class="leise">'+esc(HANDEL.odds.besser.replace('{p}',rv.o.besser))+'</span><br><i>'+esc(HANDEL.odds.fortuna)+': “'+esc(rv.fort)+'”</i></div>':'')+
   kopfHtml(k,rv.c,true)+'<p class="mk-traits">'+([].concat(k.traits.map(function(x){return '<span>'+esc(hw(x))+'</span>'}),k.plus.map(function(x){return '<span class="gut">＋ '+esc(analyseText(x))+'</span>'}),k.minus.map(function(x){return '<span class="schlecht">− '+esc(analyseText(x))+'</span>'})).join('')||'<span>'+esc(K.nichts)+'</span>')+'</p>'+
   '<button class="knopf klein" data-weiter="1">'+esc(K.weiter)+'</button></div>';
  e.innerHTML=h;zeichneBild(e);e.querySelector('[data-weiter]').onclick=function(){MK.rev=null;MK.quote=n?'':zieh('empty');if(MK.quote)sprich(MK.quote);marktKarte(true,true)};return}
 h='<b>'+esc(t('markt.titel'))+'</b> <span class="leise">'+esc(t('markt.kopf',{p:G2.preis,g:G2.gold,tag:G2.heute+1}))+'</span>'+(info&&!still?'<br><span class="leise">'+esc(info)+'</span>':'');
 if(!n){e.innerHTML=h+(MK.quote&&H?'<p class="mk-quote"><b>'+esc(H.name)+':</b> “'+esc(MK.quote)+'”</p>':'')+'<p class="leise">'+esc(t(lot.length?'markt.leer':'markt.unterwegs'))+'</p>';if(!still)sprich(t('markt.titel')+'. '+t('markt.unterwegs'));return}
 if(MK.i<0||!lot[MK.i])MK.i=lot.findIndex(Boolean);var i=MK.i,c=lot[i],k=MK.karten&&MK.karten[i];
 if(!k||!K){e.innerHTML=h+'<p class="leise">'+esc(K?K.laedt:'…')+'</p>';return}
 if(still&&!neuBild&&e.dataset.mk===G2.tag+':'+i+':'+n+':'+G2.gold+':'+MK.quote)return;e.dataset.mk=G2.tag+':'+i+':'+n+':'+G2.gold+':'+MK.quote;MK.zeige=i;
 var spruch=MK.quote||anpreisen(k);
 h+='<div class="mk-karte"><b class="leise">'+esc(K.kopf.replace('{n}',n).replace('{m}',lot.length))+'</b><p class="mk-quote"><b>'+esc(H.name)+':</b> “'+esc(spruch)+'”</p>'+
  '<div class="mk-reiter">'+lot.map(function(x,j){var r=['I','II','III','IV','V'][j]||String(j+1);return x?'<button class="knopf klein" data-zeig="'+j+'" aria-pressed="'+(j===i)+'">'+r+'</button>':'<span class="mk-weg" title="'+esc(K.verkauft)+'">'+r+'</span>'}).join('')+'</div>'+
  kopfHtml(k,c,false)+'<p class="mk-traits"><span>'+esc(K.eigenschaften)+': ?</span></p><p class="leise">'+esc(K.verdeckt)+'</p>'+
  '<div class="mk-kauf"><span class="leise">'+esc(K.preis.replace('{p}',G2.preis).replace('{g}',G2.gold))+'</span><button class="knopf klein" data-kauf="'+i+'"'+(G2.gold<G2.preis?' disabled':'')+'>'+esc(K.kaufen.replace('{p}',G2.preis))+'</button></div></div>';
 e.innerHTML=h;zeichneBild(e);
 [].forEach.call(e.querySelectorAll('[data-zeig]'),function(b){b.onclick=function(){MK.i=+b.dataset.zeig;MK.quote='';marktKarte(true,true);var k2=MK.karten&&MK.karten[MK.i];if(k2)sprich(anpreisen(k2))}});
 [].forEach.call(e.querySelectorAll('[data-kauf]'),function(b){b.onclick=function(){b.disabled=true;MK.quote='';MK.kauf={i:+b.dataset.kauf,c:lot[+b.dataset.kauf]};KERN.befehl('glaKauf',{i:+b.dataset.kauf,tag:G2.tag})}});
 if(!still)sprich(t('markt.titel')+'. '+spruch)}
// G8: mit &ketten zusätzlich Küche und Jägerhütte und die ersten Ketten (Befehl ketten), damit Holz, Wasser, Rehe und Mahlzeiten zu sehen sind.
// Warenprobe (nur mit ?nosave&warenprobe): schaltet die Wirtschaft ein, sucht nahe beim Kartenort Platz, baut ein Lager (ohne Material), danach eine Werkstatt und
// ein zweites Lager (mit Material aus dem Startvorrat), Tore und einen Kiesweg dazwischen; Arbeiter tragen und bauen, die Karren gleichen aus. Tempo 3×.
function warenprobe(){var k=KARTE.kam();if(!k)return;var P=window.AT3SPIEL.warenprobe={fertig:false,stufe:0},L=[],r,gx,gy,i=0;
 for(r=0;r<14;r++)for(gy=-r;gy<=r;gy++)for(gx=-r;gx<=r;gx++)if(Math.max(Math.abs(gx),Math.abs(gy))===r)L.push([Math.floor(k[0])+gx*3,Math.floor(k[1])+gy*3]);
 $('weltInfo').textContent=t('probe.warenSucht');
 (function suche(){if(i>=L.length){$('weltInfo').textContent=t('probe.warenKeinPlatz');P.fertig=true;P.fehler='kein_platz';return}var q=L[i++],x=q[0],y=q[1];
  var T=[{art:'lager',x:x,y:y,w:3,h:3},{art:'werkstatt',x:x+5,y:y,w:4,h:3},{art:'lager',x:x+11,y:y,w:3,h:3},{art:'kiesweg',x:x+1,y:y+3,w:12,h:2}];
  var KT=/[?&]ketten\b/.test(location.search);if(KT)T.push({art:'kueche',x:x,y:y+6,w:3,h:3},{art:'jagdhuette',x:x+5,y:y+6,w:3,h:3});
  Promise.all(T.map(function(w){return KERN.bauPruefen(w)})).then(function(E){if(!E.every(function(e){return e&&e.ok}))return suche();
   P.plan={x:x,y:y};KERN.befehl('wirtschaft',{x:x-1,y:y+4});if(/[?&]markt\b/.test(location.search))KERN.befehl('gladiatoren',{an:1});KERN.befehl('tempo',3);KERN.befehl('bauBoden',T[0]);KARTE.geh(x+7,y+2,0);P.stufe=1;$('weltInfo').textContent=t('probe.waren1');
   var w=setInterval(function(){if(P.stufe===1&&WAREN&&WAREN.start){P.stufe=2;KERN.befehl('bauBoden',T[1]);KERN.befehl('bauBoden',T[2]);$('weltInfo').textContent=t('probe.waren2')}
    else if(P.stufe===2&&WAREN&&WAREN.lager.length>=2&&KERN.zustand.baustellen===0){P.stufe=3;clearInterval(w);KERN.befehl('bauTuer',{x:x+1,y:y+2,seite:2,typ:'tor'});KERN.befehl('bauTuer',{x:x+12,y:y+2,seite:2,typ:'tor'});KERN.befehl('bauWeg',T[3]);
     if(KT){KERN.befehl('ketten',{an:1});KERN.befehl('bauBoden',T[4]);KERN.befehl('bauBoden',T[5])}
     P.fertig=true;$('weltInfo').textContent=t('probe.waren3')}},500)})})()}
function bauAnschliessen(){var k=$('bauKnopf');k.disabled=false;k.textContent=t('bau.knopf');
 var G={},h='<div class="bauGruppen">';Object.keys(BAUWZ).forEach(function(id){var w=BAUWZ[id];(G[w.gr]=G[w.gr]||[]).push(id)});
 ['haus','weg','attraktion','werkzeug'].forEach(function(g){h+='<div class="bauGruppe"><b>'+esc(t('bau.gruppe.'+g))+'</b><div>'+G[g].map(function(id){var w=BAUWZ[id];
   return '<button class="knopf klein" data-bau="'+id+'" aria-pressed="false"><i>'+w.bild+'</i> '+esc(t('bau.art.'+id))+(w.preis?' <small>'+w.preis+' G</small>':'')+'</button>'}).join('')+'</div></div>'});
 h+='<button class="knopf klein weg bauFertig" id="bauZu">'+esc(t('bau.zu'))+'</button></div>';$('bauWerkzeuge').innerHTML=h;
 [].forEach.call(document.querySelectorAll('#bauLeiste [data-bau]'),function(b){b.onclick=function(){bauWahl(BAUW===b.dataset.bau?null:b.dataset.bau)}});
 k.onclick=function(){bauOffen(!!$('bauLeiste').hidden)};$('bauZu').onclick=function(){bauOffen(false)};
 addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('bauLeiste').hidden){if(BAUW)bauWahl(null);else bauOffen(false)}});   // wie 2.0
 KARTE.werkzeug({aktiv:function(){return !!BAUW&&!fpAn},form:function(){return BAUW?BAUWZ[BAUW].form:'rechteck'},zieht:bauZieht,fertig:bauFertig,weg:function(){KARTE.rahmen(null);bauHilfe()}})}
function bauOffen(an){$('bauLeiste').hidden=!an;$('bauKnopf').setAttribute('aria-pressed',an?'true':'false');if(!an)bauWahl(null);else{bauWahl(null);bauGoldZeigen();try{$('bauLeiste').scrollIntoView({block:'nearest'})}catch(x){}}}
function bauWahl(a){BAUW=a;pfadA=null;if(KARTE)KARTE.pfad(null);[].forEach.call(document.querySelectorAll('#bauLeiste [data-bau]'),function(b){b.setAttribute('aria-pressed',b.dataset.bau===a?'true':'false')});KARTE.rahmen(null);bauVor=null;bauHilfe()}
function bauHilfe(){$('bauInfo').textContent=t(BAUW?'bau.hilfe.'+BAUW:'bau.wahl')}
function bauGoldZeigen(){$('bauGold').textContent=bauStand.gold==null?'':t('bau.gold',{g:bauStand.gold.toLocaleString('en'),s:bauStand.s})}
function grundText(g){var k='bau.grund.'+g;return TXT[k]!=null?t(k):t('bau.grund.sonst',{g:g})}
// Vorschau beim Ziehen: Boden und Wände fragt der Weltkern (ändert nichts), immer nur eine Frage zugleich; Abriss und Dach brauchen keine Frage
function bauZieht(R){bauVor=R;if(R.n!=null){if(R.n>MAXL){KARTE.rahmen(R,false);$('bauInfo').textContent=t('bau.zuLang',{n:MAXL});return}}
 else if(R.w*R.h>MAXA){KARTE.rahmen(R,false);$('bauInfo').textContent=t('bau.zuGross',{n:MAXA});return}
 if(BAUW==='abriss'){KARTE.rahmen(R,null);$('bauInfo').textContent=t('bau.vorschauAb',{n:R.w,m:R.h});return}
 if(BAUW==='dach'){KARTE.rahmen(R,null);$('bauInfo').textContent=t('bau.vorschauDach',{n:R.w,m:R.h});return}
 KARTE.rahmen(R,null);if(!bauVorLaeuft)bauFrage()}
function bauFrage(){var R=bauVor,W=BAUW;if(!R||!W||(W!=='wand'&&!ART_NR[W]&&!WEG_NR[W]))return;var lin=R.n!=null;if(lin!==(W==='wand'))return;bauVorLaeuft=true;
 KERN.bauPruefen(lin?{r:R.r,x:R.x,y:R.y,n:R.n,an:2}:{art:W,x:R.x,y:R.y,w:R.w,h:R.h}).then(function(p){bauVorLaeuft=false;if(!p||bauVor!==R||BAUW!==W){if(bauVor&&bauVor!==R)bauFrage();return}
  KARTE.rahmen(R,!!p.ok,p.x,p.y);
  $('bauInfo').textContent=!p.ok?grundText(p.grund):lin?(p.an?t('bau.vorschauWand',{n:p.waende,g:p.kosten}):t('bau.vorschauWandAb',{n:p.waende})):t('bau.vorschau',{n:p.felder,g:p.kosten})})}
function bauFertig(R){bauVor=null;var W=BAUW;if(!W)return;
 if(R.n!=null?R.n>MAXL:R.w*R.h>MAXA){KARTE.rahmen(null);$('bauInfo').textContent=R.n!=null?t('bau.zuLang',{n:MAXL}):t('bau.zuGross',{n:MAXA});return}
 var nr=W==='abriss'?KERN.befehl('bauEntfernen',{x:R.x,y:R.y,w:R.w,h:R.h}):W==='dach'?KERN.befehl('bauDach',{x:R.x,y:R.y,w:R.w,h:R.h,zu:2}):
  W==='wand'?KERN.befehl('bauWaende',{r:R.r,x:R.x,y:R.y,n:R.n,an:2}):KERN.befehl(WEG_NR[W]?'bauWeg':'bauBoden',{art:W,x:R.x,y:R.y,w:R.w,h:R.h});
 bauNr[nr]=W;KARTE.rahmen(R,null);window.AT3SPIEL.bauBefehl=nr}
// G5c: Antippen mit Tür- oder Hüllen-Werkzeug (die Karte meldet das angetippte Feld mit dem vordersten Bauteil)
function bauTipp(f){var o=f&&f.obj,raum=(o&&o.raum)||(f&&f.bau&&f.bau.raum),nr;
 if(BAUW==='tuer'){if(!o||o.teil!=='wand'){$('bauInfo').textContent=t('bau.tippWand');return}nr=KERN.befehl('bauTuerWechsel',{x:o.x,y:o.y,seite:o.seite})}
 else{if(!raum){$('bauInfo').textContent=t('bau.tippHaus');return}nr=KERN.befehl('bauHuelle',{raum:raum})}
 bauNr[nr]=BAUW;window.AT3SPIEL.bauBefehl=nr}
 // G6b: Wegprobe (Entscheidung Thomas 16.11.2026): Start antippen, Ziel antippen, der Weltkern sucht (Helferkerne), die Karte zeigt die Linie. Ziel weiter als
// 2 Kartenstücke: naher Weg bis zur Netzstraße oder zum Fensterrand (gelb gestrichelt: Route über das Straßennetz von Ort zu Ort). Läuft mit der Uhr.
var pfadA=null, pfadNr={};
function pfadTipp(f){if(!f||f.x==null){$('bauInfo').textContent=t('weg.tippLand');return}
 if(!pfadA){pfadA=[f.x,f.y];KARTE.pfad({a:pfadA});$('bauInfo').textContent=t('weg.ziel');return}
 var p=BAUW==='pfadKarren'?1:0,nr=KERN.befehl('wegProbe',{p:p,x0:pfadA[0],y0:pfadA[1],x1:f.x,y1:f.y});pfadNr[nr]={a:pfadA,t:performance.now()};
 $('bauInfo').textContent=t(KERN.zustand.tempo?'weg.sucht':'weg.pause');pfadA=null;window.AT3SPIEL.wegBefehl=nr}
function beiWeg(d){(d.meld||[]).forEach(function(m){window.AT3SPIEL.wegLetzt=m;var w=pfadNr[m.id];if(!w)return;delete pfadNr[m.id];window.AT3SPIEL.wegMeld=m;
  KARTE.pfad({punkte:m.punkte,orte:m.orte,a:w.a,ok:m.code===0});var ms=(m.us/1000).toFixed(1);
  $('bauInfo').textContent=m.code!==0?(TXT['weg.grund.'+m.grund]!=null?t('weg.grund.'+m.grund):t('weg.grund.sonst',{g:m.grund}))+' '+t('weg.zeit',{ms:ms,k:m.knoten,h:m.helfer}):
   (m.modus?t(m.teil?'weg.okTeil':'weg.okFern',{n:m.felder,o:m.orte?m.orte.length/2:0}):t('weg.ok',{n:m.felder,s:(m.kosten/10000).toFixed(0)}))+' '+t('weg.zeit',{ms:ms,k:m.knoten,h:m.helfer})})}
function beiBau(d){if(KARTE)KARTE.beiBau(d);if(fpAn&&d.stuecke&&d.stuecke.length&&window.AT3FP)window.AT3FP.bauNeu();bauStand.gold=d.gold;bauStand.s=d.baustellen;if(!$('bauLeiste').hidden)bauGoldZeigen();
 (d.meld||[]).forEach(function(m){var a=bauNr[m.nr];if(!a)return;delete bauNr[m.nr];KARTE.rahmen(null);window.AT3SPIEL.bauMeld=m;
  $('bauInfo').textContent=!m.ok?grundText(m.grund):a==='abriss'?t('bau.okAb'):a==='dach'?t('bau.okDach',{n:m.felder||0}):a==='wand'?(m.kosten?t('bau.okWand',{n:m.waende,g:m.kosten}):t('bau.okWandAb',{n:m.waende})):
   a==='tuer'?t('bau.okTuer.'+(m.typ||'tuer')):WEG_NR[a]?t('bau.okWeg',{n:m.felder||0,g:m.kosten||0}):a==='huelle'?(m.kosten?t('bau.okHuelle',{g:m.kosten}):t('bau.okHuelleLeer')):t('bau.ok',{g:(m.kosten||0)})})}
// Gebäude angetippt: vorderstes Teil (Wand, Tür, Tor, Dach) oder Boden, dazu Art und Bauzustand; Dach auf/zu meldet die Karte
function bauFeld(f){var b=f.bau,o=f.obj,art=b&&b.art?t('bau.art.'+['','lager','werkstatt','unterkunft','kueche','jagdhuette'][b.art]):t('bau.ohneArt'),zu=t('bau.zustand.'+((o&&o.zustand)||b.zustand||3));
 var d=f.dachOffen===true?t('bau.dachOffen'):f.dachOffen===false&&KARTE.kamera().lod===0?t('bau.dachZu'):'';
 if(o&&o.id){objektKarte(o.id,o.ersatz)}else{window.AT3SPIEL.angetippt=null}
 $('weltInfo').textContent=t('bau.feld',{a:(o&&o.id?(OBJTXT[o.id+'.name']||o.id)+' · ':'')+art,z:zu,d:d})}
// ── Startplatz (G4c): Uhr anhalten, Wahl zeigen, dann Kamera hin, Platz merken, sofort speichern ──
var wahlLaeuft=false;
function startWaehlen(){if(wahlLaeuft)return;wahlLaeuft=true;fpWahl=true;$('fpKnopf').disabled=true;var tempo=KERN.zustand.tempo;if(tempo)KERN.befehl('tempo',0);$('weltInfo').textContent=t('welt.wahl');
 new Promise(function(ok,no){if(window.AT3STARTWAHL)return ok();var s=document.createElement('script');s.src='startwahl.js?v='+V;s.onload=ok;s.onerror=function(){no(new Error('startwahl.js'))};document.head.appendChild(s)})
 .then(function(){return window.AT3STARTWAHL.zeigen({t:t,karte:KARTE,name:WAHL&&WAHL.name})})
 .then(function(p){fpWahl=false;$('fpKnopf').disabled=false;START=[p.x,p.y];KERN.befehl('wirtschaft',{x:p.x,y:p.y});KERN.befehl('ketten',{an:1});KERN.befehl('gladiatoren',{an:1});KARTE.geh(p.x+.5,p.y+.5,0);$('weltInfo').textContent=t('welt.tippen');if(tempo)KERN.befehl('tempo',tempo);window.AT3SPIEL_START=START;if(SPIELSTAND&&SPIELSTAND.platz)SPIELSTAND.speichern()})
 .catch(function(e){$('weltInfo').innerHTML='<span class="schlecht">'+esc(t('welt.ausfall',{e:e.message}))+'</span>'})}
function karteText(){var m0=KARTE&&KARTE.mess;return karteText0()+(m0?' · nature '+m0.naturArten+' kinds, '+m0.naturErsatz+' grey, '+m0.natur+' baked':'')}
function karteText0(){var m=KARTE&&KARTE.mess;if(!m)return t('mess.karteAus');var u=function(v){return(v/1000).toFixed(2)+' ms'};
 return t('mess.karte',{s:m.stuecke,n:m.bilder,b:zahl(m.bytes,'B'),g:m.gerechnet,a:u(m.gerechnet?m.rechenUs/m.gerechnet:0),m:u(m.maxRechenUs),z:(m.zeichnen?m.zeichenMs/m.zeichnen:0).toFixed(2)+' ms',x:m.maxZeichenMs.toFixed(2)+' ms',e:m.ersatz})}
function kernText(){var Z=KERN&&KERN.zustand;if(!Z||!Z.laeuft)return t('mess.kernAus')+(Z&&Z.fehler?' ('+Z.fehler+')':'');
 return t('mess.kern',{h:Z.helfer,m:(Z.mittelUs/1000).toFixed(2)+' ms',p:(Z.p95Us/1000).toFixed(2)+' ms',n:Z.gesamt,v:Z.verloren,f:kernAbdruck||'-'})}
function kernAbdruckHolen(){if(!KERN||!KERN.zustand.laeuft)return;KERN.abdruck().then(function(d){if(!d)return;kernAbdruck=d.wert+' at tick '+d.tick;if(!$('mess').hidden)messZeigen()})}

function esc(s){return String(s).replace(/[&<>]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})}

// ── Messung: Dateien, Bildintervall 3 s, Budgetliste ──
var OBEN=basis.replace(/[^/]+\/$/,''), STIMMDATEIEN=['sprech-worker-en.js','stimme-en.js','stimme-en-lex.js'];   // V1: englischer Sprachgenerator, eine Quelle mit dem Voice Lab
function stimmDatei(u){try{var p=new URL(u,location.href);return p.origin===location.origin&&p.pathname.indexOf(OBEN)===0&&STIMMDATEIEN.indexOf(p.pathname.slice(OBEN.length))>=0}catch(e){return false}}
function fremd(u){try{var p=new URL(u,location.href);return !stimmDatei(u)&&(p.origin!==location.origin||p.pathname.indexOf(basis)!==0)}catch(e){return true}}
function dateienZaehlen(){var n=performance.getEntriesByType('navigation')[0],r=performance.getEntriesByType('resource'),b=n?(n.encodedBodySize||0):0,f=[],sd=0;
 r.forEach(function(e){b+=e.encodedBodySize||0;if(fremd(e.name))f.push(e.name);if(stimmDatei(e.name))sd++});mess.download=b;mess.dateien=r.length+1;mess.fremd=f;mess.stimmDateien=sd}
function quantil(L,q){if(!L.length)return null;var s=L.slice().sort(function(a,b){return a-b});return s[Math.min(s.length-1,Math.floor(q*s.length))]}
function bilderMessen(){var L=[],letzt=null,ende=performance.now()+3000;
 return new Promise(function(ok){function f(ts){if(letzt!=null)L.push(ts-letzt);letzt=ts;if(ts<ende)requestAnimationFrame(f);else ok(L)}requestAnimationFrame(f)})
  .then(function(L){mess.p95=quantil(L,.95);mess.p99=quantil(L,.99);mess.bildzahl=L.length})}
function istWert(id){return{download:mess.download,erstesBild:mess.erstesBildMs,bildPc:mess.p95,bildHandy:mess.p95,bild99:mess.p99,lang:mess.langGemeldet?(mess.langMs||0):undefined,weltTick:KERN&&KERN.zustand.laeuft&&KERN.zustand.gesamt>=20?KERN.zustand.p95Us/1000:null,spielstand:SPIELSTAND&&SPIELSTAND.mal?SPIELSTAND.bytes:null,
 speicher:performance.memory?performance.memory.usedJSHeapSize:undefined,bilder:mess.bilder+(KARTE?KARTE.mess.maxBytes:0),backzeit:KARTE&&KARTE.mess.rechenN>=10?quantil(KARTE.mess.rechenL,.95)/1000:null,fpBild:window.AT3FP&&window.AT3FP.mess().bilder>=10?window.AT3FP.mess().p95:null}[id]}
function zahl(v,e){if(e==='B')return v<1048576?(v/1024).toFixed(1)+' KB':(v/1048576).toFixed(1)+' MB';return(v<100?v.toFixed(1):Math.round(v))+' ms'}
function budgetListe(){if(!BUDGETS)return[];return BUDGETS.budgets.map(function(b){var v=istWert(b.id),st;
 if(v===undefined)st='grau';else if(v===null)st='offen';else st=v<=b.ziel?'gut':'schlecht';return{id:b.id,was:t(b.text),ziel:zahl(b.ziel,b.einheit),ist:v==null?null:zahl(v,b.einheit),st:st,v:v,zielWert:b.ziel}})}
function messZeigen(){var L=budgetListe(),h='<table><tr><th>'+t('mess.spalteWas')+'</th><th>'+t('mess.spalteZiel')+'</th><th>'+t('mess.spalteIst')+'</th></tr>';
 L.forEach(function(r){var ist=r.st==='grau'?t('mess.nichtMessbar'):r.st==='offen'?t('mess.offen'):r.ist+' · '+t(r.st==='gut'?'mess.ok':'mess.drueber');
  h+='<tr data-budget="'+r.id+'"><td>'+esc(r.was)+'</td><td>'+r.ziel+'</td><td class="'+(r.st==='gut'?'gut':r.st==='schlecht'?'schlecht':'grau')+'">'+esc(ist)+'</td></tr>'});
 h+='</table><p class="'+(mess.fremd.length?'schlecht':'gut')+'">'+esc(t('mess.fremd',{n:mess.fremd.length}))+'</p>'+
  '<p class="'+(mess.geschrieben?'schlecht':'gut')+'">'+esc(t('mess.schreibt',{n:mess.geschrieben}))+'</p>'+
  '<p class="leise">'+esc(t('mess.kerne',{n:mess.kerne||'?'}))+' · '+mess.dateien+' files</p>'+'<p class="leise" id="messKern">'+esc(kernText())+'</p>'+'<p class="leise" id="messKarte">'+esc(karteText())+'</p>'+'<p class="leise" id="messFp">'+esc(fpText())+'</p>'+'<p class="leise" id="messSpeicher">'+esc(speicherText())+'</p>'+'<p class="leise" id="messStimme">'+esc(stimmeText())+'</p>'+(mess.fertig?'':'<p class="leise">'+esc(t('mess.laeuft'))+'</p>');
 $('messInhalt').innerHTML=h}
function speicherText(){var S=SPIELSTAND;if(!S||!S.platz)return t('mess.speicherAus');return t('mess.speicher',{n:S.platz,m:S.mal,b:(S.bytes/1024).toFixed(1)+' KB',h:S.ms.toFixed(1)+' ms',k:S.kernMs.toFixed(1)+' ms',g:S.ganz?'exact':'partial',f:S.fehler||'none'})}
function ms(v){return v==null?'-':Math.round(v)+' ms'}
function stimmeText(){var z=STIMME&&STIMME.zustand();if(!z||!z.geladen)return t('mess.stimmeAus');
 return t('mess.stimme',{lade:ms(z.ladeMs),rechen:ms(z.rechenMs),dauer:z.dauerS==null?'-':z.dauerS.toFixed(1)+' s',n:z.saetze,c:z.ausCache,a:z.akzent})}
function messText(){var L=budgetListe(),z=['AT3 '+V+' · '+navigator.userAgent,'cores '+(mess.kerne||'?')+' · files '+mess.dateien+' · foreign '+mess.fremd.length+' · saves written '+mess.geschrieben,
 'objects approved '+Object.keys(geladen.objekte).length+' · stand-ins '+zaehlErsatz()+' · frames '+(mess.bildzahl||0)];
 L.forEach(function(r){z.push(r.id+': '+(r.ist||'-')+' / '+r.ziel+' '+r.st)});if(mess.fremd.length)z.push('foreign files: '+mess.fremd.slice(0,8).join(' , '));z.push('core: '+kernText());z.push(karteText());z.push(fpText());z.push('save: '+speicherText());z.push('voice: '+stimmeText());return z.join('\n')}
function zaehlErsatz(){var s={};gezeichnet.forEach(function(g){if(g.ersatz)s[g.id]=1});return Object.keys(s).length}
function kopieren(){var x=messText(),ok=function(){$('messKopie').textContent=t('mess.kopiert')};
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(x).then(ok,alt);else alt();
 function alt(){var a=document.createElement('textarea');a.value=x;document.body.appendChild(a);a.select();try{document.execCommand('copy');ok()}catch(e){}a.remove()}}

// ── Start ──
// ── First Person (FP1): Dateien erst beim ersten Mal laden, dann nur umschalten ──
var fpLaedt=null, fpAn=false, fpBusy=false, fpWahl=false;
function fpLaden(){if(fpLaedt)return fpLaedt;fpLaedt=['fp.js','fpwelt.js','fpspiel.js'].reduce(function(p,d){return p.then(function(){return new Promise(function(ok,no){
  var s=document.createElement('script');s.src=d+'?v='+V;s.onload=ok;s.onerror=function(){fpLaedt=null;no(new Error(d))};document.head.appendChild(s)})})},Promise.resolve());return fpLaedt}
function fpUmschalten(){if(fpBusy||!KARTE)return;var k=$('fpKnopf');
 if(fpAn){var p=window.AT3FP.aus();fpAn=false;$('fpRahmen').hidden=true;$('weltCv').hidden=false;$('zoomRein').disabled=$('zoomRaus').disabled=false;
  k.textContent=t('fp.knopf');k.setAttribute('aria-pressed','false');if(p)KARTE.geh(p.x,p.y);$('weltInfo').textContent=t('welt.tippen');return}
 fpBusy=true;k.disabled=true;$('weltInfo').textContent=t('fp.laedt');
 fpLaden().then(function(){return window.AT3FP.an({karte:KARTE,objekte:geladen.objekte,cv:$('fpCv'),rahmen:$('fpRahmen'),stick:$('fpStick'),beiObjekt:fpObjekt,beiBewegt:fpBewegt,json:holeJson,anlage:function(){var AR=GLAD&&GLAD.arena;return AR&&AR.gross&&AR.anlage&&AR.anlage.x>=0?AR.anlage:null}})})
 .then(function(){fpAn=true;$('weltCv').hidden=true;$('fpRahmen').hidden=false;try{$('fpRahmen').scrollIntoView({block:'nearest'})}catch(x){}$('zoomRein').disabled=$('zoomRaus').disabled=true;k.textContent=t('fp.zurueck');k.setAttribute('aria-pressed','true');$('weltInfo').textContent=t('fp.tippen')})
 .catch(function(e){var m=e&&e.message;$('weltInfo').textContent=m==='globe'?t('fp.globus'):m==='no ground'?t('fp.keinBoden'):t('fp.fehler',{e:m})})
 .then(function(){fpBusy=false;k.disabled=fpWahl})}
// FP3: Arbeiter oder Karren in First Person angetippt: dieselbe Karte wie auf der Karte (mit Schaltern unten), oben kurz ohne Schalter mit Entfernung
function fpBewegt(typ,k,m){if(typ==='besucher')besucherKarte(k);else if(typ==='person')personKarte(k);else if(typ==='tier')tierKarte(k);else if(typ==='fest')festKarte(k);else karrenKarte(k);var c=$('karte').cloneNode(true);c.querySelectorAll('button').forEach(function(b){b.remove()});
 $('weltInfo').innerHTML=c.innerHTML.replace(/(<br>\s*)+$/,'')+' <span class="leise">· '+esc(t('fp.entfernt',{m:Math.round(m)}))+'</span>'}
function fpObjekt(id,ersatz,m){if(!id){$('weltInfo').textContent=t('fp.nichts');return}objektKarte(id,ersatz);$('weltInfo').innerHTML=$('karte').innerHTML+' <span class="leise">· '+esc(t('fp.entfernt',{m:Math.round(m)}))+'</span>'}
function fpText(){var f=window.AT3FP&&window.AT3FP.mess();if(!f||!f.bilder)return t('mess.fpAus');var u=function(v){return v==null?'-':v.toFixed(1)+' ms'};
 return t('mess.fp',{w:f.opt.W,h:f.opt.H,s:f.opt.sicht,n:f.bilder,m:u(f.mittel),p:u(f.p95),o:f.objekte,a:u(f.ausschnittP95),k:f.ausschnitte,c:f.stueckeNeu})}
function texteSetzen(){document.title=t('spiel.titel');$('titel').textContent=t('spiel.titel');$('unter').textContent=t('spiel.unter');
 $('weltTitel').textContent=t('welt.titel');$('bodenTitel').textContent=t('spiel.boden');$('bodenInfo').textContent=t('spiel.bodenInfo');$('karte').textContent=t('spiel.tippen');
 $('messTitel').textContent=t('mess.titel');$('messZu').textContent=t('mess.schliessen');$('messKopie').textContent=t('mess.kopieren');$('messAuf').textContent=t('mess.oeffnen');$('stimmeKnopf').textContent=t('stimme.aus');$('fpKnopf').textContent=t('fp.knopf');
 $('status').textContent=t('spiel.laedt');uhrKnoepfe()[0].textContent=t('uhr.pause');$('uhrZeit').textContent=t('uhr.zeit',{t:'–'})}
window.AT3SPIEL={medicus:function(){return{key:MED.key,liste:MED.liste,warte:MED.warte}},zeigePerson:function(k){personKarte(k)},besucherInfo:besucherInfo,ladeSitze:function(){return Promise.all([skript('arena-sitze.js','AT3SITZE'),skript('herrscher.js','AT3HERRSCHER')])},      // AR2b: Prüfhaken
 fp:function(){return fpAn},      // K0: Prüfhaken Medicus
 arena:function(m){arenaFenster(m)},arenaFrage:function(){arenaFrage()},      // G9d3: Prüfhaken
 tempo:function(){return KERN&&KERN.zustand?KERN.zustand.tempo:null},fpUmschalten:fpUmschalten,karte:function(){return KARTE},spielstand:function(){return SPIELSTAND},wahl:function(){return WAHL},stimme:function(){return STIMME},kern:function(){return KERN},mess:mess,budgetListe:budgetListe,messText:messText,geladen:function(){return geladen},gezeichnet:function(){return gezeichnet},angetippt:null};

Promise.all([holeJson('sprache/en.json'),holeJson('kartei/text-en.json'),holeJson('kartei/objekte.json'),holeJson('kartei/budgets.json'),holeJson('spiel-budgets.json')])
.then(function(d){TXT=d[0].texte;OBJTXT=d[1].texte;kartei=d[2];B=d[3];BUDGETS=d[4];mess.datenMs=performance.now();texteSetzen();platzWaehlen();
 return S.ladeUebernommene(kartei,function(datei){return holeJson('kartei/'+datei)},B)})
.then(function(g){geladen=g;mess.objekteMs=performance.now();if(KARTE)KARTE.natur(g.objekte);
 var f=document.fonts&&document.fonts.load?document.fonts.load('18px "AT3 Text"').catch(function(){}):Promise.resolve();
 return Promise.race([f,new Promise(function(r){setTimeout(r,3000)})])})
.then(function(){zeichnen();
 $('zaehler').textContent=t('spiel.objekte',{n:Object.keys(geladen.objekte).length})+' · '+t('spiel.ersatz',{n:zaehlErsatz()})+' · '+t('spiel.abgelehnt',{n:geladen.abgelehnt.filter(function(a){return !/nicht übernommen/.test(a.gruende[0])}).length});
 return new Promise(function(r){requestAnimationFrame(function(){requestAnimationFrame(r)})})})
.then(function(){mess.erstesBildMs=performance.now();dateienZaehlen();$('status').textContent=t('spiel.bereit');window.AT3SPIEL_BEREIT=true;
 $('boden').addEventListener('pointerup',karteZeigen);if(!$('mess').hidden)messZeigen();kernStarten();
 return bilderMessen()})
.then(function(){var nach=speicherBild(),n=0,k;for(k in nach)if(SPEICHER_VOR[k]!==nach[k])n++;for(k in SPEICHER_VOR)if(!(k in nach))n++;mess.geschrieben=n;
 dateienZaehlen();mess.fertig=true;if(!$('mess').hidden)messZeigen();kernAbdruckHolen();window.AT3SPIEL_GEMESSEN=true})
.catch(function(e){$('status').innerHTML='<span class="schlecht">'+esc('The gods dropped something: '+e.message)+'</span>';window.AT3SPIEL_FEHLER=e.message});

$('messAuf').onclick=function(){$('mess').hidden=false;kernAbdruckHolen();messZeigen();$('mess').scrollIntoView({block:'start'})};
$('messZu').onclick=function(){$('mess').hidden=true};
$('messKopie').onclick=kopieren;
$('stimmeKnopf').onclick=stimmeUmschalten;
})();
