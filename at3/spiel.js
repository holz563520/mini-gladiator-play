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
(function(){
'use strict';
var V='79919262', T_SKRIPT=performance.now(), S=window.AT3_64;
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
 var name=OBJTXT[hit.id+'.name']||hit.id,info=OBJTXT[hit.id+'.info']||'';
 k.innerHTML=hit.ersatz?'<b>'+esc(t('spiel.ersatzName'))+': '+esc(name)+'</b><br>'+esc(t('spiel.ersatzInfo')):'<b>'+esc(name)+'</b><br>'+esc(info);
 window.AT3SPIEL.angetippt=hit.id;
 if(hit.ersatz){sprich(t('spiel.ersatzName')+': '+name+'.'+(ersatzGesagt?'':' '+t('spiel.ersatzInfo')));ersatzGesagt=true}else sprich(name+'. '+info)}
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
var WAHL=null, SPIELSTAND=null, platzP=null;
function speicherAnzeige(x,schlecht){var e=$('speicherInfo');e.textContent=x;e.className=schlecht?'schlecht':'leise'}
function platzWaehlen(){platzP=window.AT3SPIELSTAND.start({t:t,imAntippen:function(k){if(k&&k.stimme&&!(STIMME&&STIMME.istAn()))stimmeUmschalten()}})
 .then(function(w){WAHL=w;var k=$('speicherKnopf');k.hidden=!w.platz;k.textContent=t('speicher.knopf');k.onclick=function(){k.disabled=true;k.textContent=t('speicher.beendet');SPIELSTAND.beenden().then(function(ok){if(!ok){k.disabled=false;k.textContent=t('speicher.knopf')}})};
  if(w.platz)$('unter').textContent=t('spiel.platz',{n:w.name,s:w.seed,d:t('dichte.'+['thin','medium','dense'][w.dichte])})+(w.wieder?' '+t('spiel.wieder'):'');return w});return platzP}
function kernStarten(){$('uhrInfo').textContent=t('uhr.wartet');uhrLage='wartet';platzP.then(kernLos)}
function kernLos(w){
 var s=document.createElement('script'),s2=document.createElement('script'),da=0;s.src='kernstart.js?v='+V;s2.src='weltkarte.js?v='+V;s.onerror=function(){kernAusfall('kernstart.js')};s2.onerror=function(){kernAusfall('weltkarte.js')};
 s.onload=s2.onload=function(){if(++da<2)return;KERN=window.AT3KERNE.starten({seed:w.seed,stand:w.daten&&w.daten.kern,beiBild:uhrZeigen,beiAusfall:kernAusfall,beiWs:function(d){if(KARTE)KARTE.beiWs(d)},
  beiBereit:function(){[].forEach.call(uhrKnoepfe(),function(k){k.disabled=false;k.onclick=function(){KERN.befehl('tempo',+k.dataset.tempo)}});
   SPIELSTAND=window.AT3SPIELSTAND.anschliessen(w,KERN,function(){return{stimme:stimmeGewuenscht,kam:KARTE?KARTE.kam():null}},speicherAnzeige);if(w.platz&&!w.daten)SPIELSTAND.speichern();
   karteStarten(w);
   window.AT3SPIEL_KERN=true}})};
 document.head.appendChild(s);document.head.appendChild(s2)}
// ── Karte (G4a): Bilder kommen aus dem Bildkern, hier nur Anschluss, Zoomknöpfe und die Auskunft beim Antippen ──
function karteStarten(w){var sp=w.daten&&w.daten.spiel,kw=w.daten&&w.daten.kern&&w.daten.kern.welt;$('weltInfo').textContent=t('welt.wartet');
 KARTE=window.AT3KARTE.starten({cv:$('weltCv'),S:S,kern:KERN,kam:sp&&sp.kam,
  beiAusfall:function(g){if(g)$('weltInfo').innerHTML='<span class="schlecht">'+esc(t('welt.ausfall',{e:g}))+'</span>'},
  beiZoom:function(l){$('weltInfo').textContent=t('welt.zoom',{z:['1×','½','¼','⅛'][l]})},
  beiFeld:function(f){window.AT3SPIEL.feld=f;$('weltInfo').textContent=f?t('welt.feld',{b:t('welt.bio.'+f.bio),w:f.weg?', '+t('welt.weg.'+f.weg):'',h:f.hoehe,x:f.x,y:f.y}):t('welt.leer')}});
 $('zoomRein').onclick=function(){KARTE.zoom(-1)};$('zoomRaus').onclick=function(){KARTE.zoom(1)};
 if(!(kw&&kw.an)){KERN.befehl('weltdichte',w.dichte==null?1:w.dichte);KERN.befehl('weltseed',w.seed>>>0)}      // neue Welt (oder Stand von vor G4a): aus dem Seed anlegen
 KERN.wsAn(true,true);var warte=setInterval(function(){if(KARTE.mess.fertig){clearInterval(warte);$('weltInfo').textContent=t('welt.tippen');window.AT3SPIEL_KARTE=true}},250)}
function karteText(){var m=KARTE&&KARTE.mess;if(!m)return t('mess.karteAus');var u=function(v){return(v/1000).toFixed(2)+' ms'};
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
 speicher:performance.memory?performance.memory.usedJSHeapSize:undefined,bilder:mess.bilder+(KARTE?KARTE.mess.maxBytes:0)}[id]}
function zahl(v,e){if(e==='B')return v<1048576?(v/1024).toFixed(1)+' KB':(v/1048576).toFixed(1)+' MB';return(v<100?v.toFixed(1):Math.round(v))+' ms'}
function budgetListe(){if(!BUDGETS)return[];return BUDGETS.budgets.map(function(b){var v=istWert(b.id),st;
 if(v===undefined)st='grau';else if(v===null)st='offen';else st=v<=b.ziel?'gut':'schlecht';return{id:b.id,was:t(b.text),ziel:zahl(b.ziel,b.einheit),ist:v==null?null:zahl(v,b.einheit),st:st,v:v,zielWert:b.ziel}})}
function messZeigen(){var L=budgetListe(),h='<table><tr><th>'+t('mess.spalteWas')+'</th><th>'+t('mess.spalteZiel')+'</th><th>'+t('mess.spalteIst')+'</th></tr>';
 L.forEach(function(r){var ist=r.st==='grau'?t('mess.nichtMessbar'):r.st==='offen'?t('mess.offen'):r.ist+' · '+t(r.st==='gut'?'mess.ok':'mess.drueber');
  h+='<tr data-budget="'+r.id+'"><td>'+esc(r.was)+'</td><td>'+r.ziel+'</td><td class="'+(r.st==='gut'?'gut':r.st==='schlecht'?'schlecht':'grau')+'">'+esc(ist)+'</td></tr>'});
 h+='</table><p class="'+(mess.fremd.length?'schlecht':'gut')+'">'+esc(t('mess.fremd',{n:mess.fremd.length}))+'</p>'+
  '<p class="'+(mess.geschrieben?'schlecht':'gut')+'">'+esc(t('mess.schreibt',{n:mess.geschrieben}))+'</p>'+
  '<p class="leise">'+esc(t('mess.kerne',{n:mess.kerne||'?'}))+' · '+mess.dateien+' files</p>'+'<p class="leise" id="messKern">'+esc(kernText())+'</p>'+'<p class="leise" id="messKarte">'+esc(karteText())+'</p>'+'<p class="leise" id="messSpeicher">'+esc(speicherText())+'</p>'+'<p class="leise" id="messStimme">'+esc(stimmeText())+'</p>'+(mess.fertig?'':'<p class="leise">'+esc(t('mess.laeuft'))+'</p>');
 $('messInhalt').innerHTML=h}
function speicherText(){var S=SPIELSTAND;if(!S||!S.platz)return t('mess.speicherAus');return t('mess.speicher',{n:S.platz,m:S.mal,b:(S.bytes/1024).toFixed(1)+' KB',h:S.ms.toFixed(1)+' ms',k:S.kernMs.toFixed(1)+' ms',g:S.ganz?'exact':'partial',f:S.fehler||'none'})}
function ms(v){return v==null?'-':Math.round(v)+' ms'}
function stimmeText(){var z=STIMME&&STIMME.zustand();if(!z||!z.geladen)return t('mess.stimmeAus');
 return t('mess.stimme',{lade:ms(z.ladeMs),rechen:ms(z.rechenMs),dauer:z.dauerS==null?'-':z.dauerS.toFixed(1)+' s',n:z.saetze,c:z.ausCache,a:z.akzent})}
function messText(){var L=budgetListe(),z=['AT3 '+V+' · '+navigator.userAgent,'cores '+(mess.kerne||'?')+' · files '+mess.dateien+' · foreign '+mess.fremd.length+' · saves written '+mess.geschrieben,
 'objects approved '+Object.keys(geladen.objekte).length+' · stand-ins '+zaehlErsatz()+' · frames '+(mess.bildzahl||0)];
 L.forEach(function(r){z.push(r.id+': '+(r.ist||'-')+' / '+r.ziel+' '+r.st)});if(mess.fremd.length)z.push('foreign files: '+mess.fremd.slice(0,8).join(' , '));z.push('core: '+kernText());z.push(karteText());z.push('save: '+speicherText());z.push('voice: '+stimmeText());return z.join('\n')}
function zaehlErsatz(){var s={};gezeichnet.forEach(function(g){if(g.ersatz)s[g.id]=1});return Object.keys(s).length}
function kopieren(){var x=messText(),ok=function(){$('messKopie').textContent=t('mess.kopiert')};
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(x).then(ok,alt);else alt();
 function alt(){var a=document.createElement('textarea');a.value=x;document.body.appendChild(a);a.select();try{document.execCommand('copy');ok()}catch(e){}a.remove()}}

// ── Start ──
function texteSetzen(){document.title=t('spiel.titel');$('titel').textContent=t('spiel.titel');$('unter').textContent=t('spiel.unter');
 $('weltTitel').textContent=t('welt.titel');$('bodenTitel').textContent=t('spiel.boden');$('bodenInfo').textContent=t('spiel.bodenInfo');$('karte').textContent=t('spiel.tippen');
 $('messTitel').textContent=t('mess.titel');$('messZu').textContent=t('mess.schliessen');$('messKopie').textContent=t('mess.kopieren');$('messAuf').textContent=t('mess.oeffnen');$('stimmeKnopf').textContent=t('stimme.aus');
 $('status').textContent=t('spiel.laedt');uhrKnoepfe()[0].textContent=t('uhr.pause');$('uhrZeit').textContent=t('uhr.zeit',{t:'–'})}
window.AT3SPIEL={karte:function(){return KARTE},spielstand:function(){return SPIELSTAND},wahl:function(){return WAHL},stimme:function(){return STIMME},kern:function(){return KERN},mess:mess,budgetListe:budgetListe,messText:messText,geladen:function(){return geladen},gezeichnet:function(){return gezeichnet},angetippt:null};

Promise.all([holeJson('sprache/en.json'),holeJson('kartei/text-en.json'),holeJson('kartei/objekte.json'),holeJson('kartei/budgets.json'),holeJson('spiel-budgets.json')])
.then(function(d){TXT=d[0].texte;OBJTXT=d[1].texte;kartei=d[2];B=d[3];BUDGETS=d[4];mess.datenMs=performance.now();texteSetzen();platzWaehlen();
 return S.ladeUebernommene(kartei,function(datei){return holeJson('kartei/'+datei)},B)})
.then(function(g){geladen=g;mess.objekteMs=performance.now();
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
