// WAS DIE DATEI TUT: Menü „Ansichten“ des AT3-Master-Editors (wird erst beim Öffnen geladen). M5: je Objekt alle Kartenrichtungen und das First-Person-Bild
// (nah und fern) nebeneinander, Prüfer verlangt beide Ansichten, fehlende Ansichten als sparsame Startfassung ergänzen (Richtungen gespiegelt/kopiert als Verweis,
// nah = Kartenbild, fern automatisch halb so groß), Speicher je Ansicht, Entwurf speichern und Objekt-Datei exportieren. M7 (begehbare Probe) folgt.
// Zeichnet nur auf Knopfdruck durch Kopieren fertiger Bilder, keine Dauerschleife.
AT3ED.menue('ansichten',function(el,c){
 el.innerHTML='<p>Jedes Objekt braucht zwei Gesichter: eins für die Karte, eins für die Augenhöhe. Wie ein guter Lanista.</p>'+
  '<p><button class="knopf" id="aAuf">Kartenansicht und First Person<small>alle Richtungen · nah und fern · Prüfer · Speicher</small></button></p>'+
  '<div id="aInhalt"></div>'+
  '<ul><li>Begehbare First-Person-Probe <span class="leise">(M7: man schlüpft in eine Figur, wie bei Dungeon Keeper)</span></li></ul>';
 el.querySelector('#aAuf').onclick=function(){var z=el.querySelector('#aInhalt');z.innerHTML='<p class="leise">Spiegel werden geputzt …</p>';
  AT3ED.lade('ansichten','at3-64.js').then(function(){return AT3ED.lade('ansichten','fp.js')}).then(function(){return ANS.aufbauen(z,c)}).catch(function(e){z.innerHTML='<p class="witz">Spiegel zerbrochen: '+e.message+'</p>'})};
});
var ANS=(function(){
'use strict';
var OBJ='at3-werkstatt-v1',FPW=320,FPH=180,HORIZONT=96;
var A={el:null,repo:{},o:null,S:null,r:0};
function S(){return window.AT3_64}
function $(s){return A.el.querySelector(s)}
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function meld(t,schlecht){var m=$('#aMeld');m.textContent=t;m.className=schlecht?'witz':'leise'}
function lies(){try{return JSON.parse(localStorage.getItem(OBJ))||{objekte:{}}}catch(e){return{objekte:{}}}}
function schreib(d){try{localStorage.setItem(OBJ,JSON.stringify(d));return true}catch(e){return false}}
function kopie(o){return JSON.parse(JSON.stringify(o))}
function rgb(n){var s=S();return s.PALETTEN[s.PALETTE].farben[n]}
function bild(b){return S().zuCanvas(b,S().PALETTE)}

function aufbauen(el,c){
 A.el=el;
 el.innerHTML='<h2>Zwei Ansichten</h2><p class="leise">Links die Karte in allen Richtungen, rechts die Augenhöhe: nah und in der Ferne. Fehlt eine Ansicht, wird nichts übernommen.</p>'+
  '<div class="wZeile"><select id="aListe"><option value="">Objekt wählen …</option></select></div>'+
  '<div id="aObj" hidden>'+
  '<div class="aPaar"><div><b>Kartenansicht</b><div class="kSzene"><canvas id="aKarte" class="pixel"></canvas></div></div>'+
  '<div><b>First Person</b><div class="kSzene"><canvas id="aFp" class="pixel" width="'+FPW+'" height="'+FPH+'"></canvas></div>'+
  '<div class="wZeile"><button class="knopf klein" id="aLinks">◀ herumgehen</button><span class="leise" id="aSeite"></span><button class="knopf klein" id="aRechts">herumgehen ▶</button></div>'+
  '<p class="leise" id="aZeit"></p></div></div>'+
  '<p class="leise" id="aInfo"></p><p id="aPruef"></p>'+
  '<div class="wZeile"><button class="knopf klein" id="aErg">Fehlende Ansichten ergänzen</button><button class="knopf klein" id="aFern">Fern neu verkleinern</button></div>'+
  '<div class="wZeile"><button class="knopf klein haupt" id="aSpeich">Prüfen &amp; speichern</button><button class="knopf klein" id="aEx">Objekt-Datei</button></div>'+
  '<p class="leise">Nachzeichnen: Grafik → Skizzen-Werkstatt → Objekt öffnen → „Ansicht“ wählen. Gezeichnete Richtungen ersetzen den Verweis, „fern“ wird beim Speichern neu verkleinert.</p></div>'+
  '<p id="aMeld" class="leise"></p>';
 var k=c.kartei||{objekte:[]};
 return Promise.all((k.objekte||[]).slice(0,40).map(function(r){return AT3ED.lade('ansichten','kartei/'+r.datei).then(function(o){A.repo[o.id]=o},function(){})})).then(function(){
  liste();
  $('#aListe').onchange=function(){if(this.value)waehle(this.value)};
  $('#aErg').onclick=function(){if(!A.o)return;var n=S().ansichtenErgaenzen(A.o);AT3_FP.leeren(A.o);zeigen();meld(n?n+' Ansicht'+(n===1?'':'en')+' ergänzt. Noch nicht gespeichert.':'Nichts zu ergänzen. Das Objekt ist schon vollständig angezogen.')};
  $('#aFern').onclick=function(){if(!A.o)return;A.o.fp=A.o.fp||{};A.o.fp.fernAuto=true;S().ansichtenErgaenzen(A.o);AT3_FP.leeren(A.o);zeigen();meld('Fern-Bild neu verkleinert. Noch nicht gespeichert.')};
  $('#aLinks').onclick=function(){A.r=(A.r+3)%4;fp()};$('#aRechts').onclick=function(){A.r=(A.r+1)%4;fp()};
  $('#aSpeich').onclick=speichern;$('#aEx').onclick=exportiere;
  var ids=Object.keys(alle());if(ids.length===1)waehle(ids[0]);
 });
}
function alle(){var m={},d=lies().objekte||{};Object.keys(A.repo).forEach(function(i){m[i]=A.repo[i]});Object.keys(d).forEach(function(i){m[i]=d[i]});return m}
function liste(){var m=alle(),d=lies().objekte||{};$('#aListe').innerHTML='<option value="">Objekt wählen …</option>'+Object.keys(m).sort().map(function(i){
 var f=S().pruefeAnsichten(m[i]).length;return'<option value="'+esc(i)+'">'+(f?'✗ ':'✓ ')+esc(m[i].name||i)+' ('+esc(i)+(d[i]?', Entwurf':'')+')</option>'}).join('')}
function waehle(id){var o=alle()[id];if(!o)return;A.o=kopie(o);A.r=0;$('#aObj').hidden=false;$('#aListe').value=id;zeigen();meld('')}

// Kartenansicht: jede Richtung auf eigenem Grasfeld, nebeneinander.
function grasFeld(x,ox,oy){var hell=rgb(S().nummer(2,4)),dunkel=rgb(S().nummer(2,2));
 for(var y=0;y<32;y++){var h=y<16?y:31-y,b=2*h+2;x.fillStyle=hell;x.fillRect(ox+32-b,oy+y,2*b,1);x.fillStyle=dunkel;x.fillRect(ox+32-b,oy+y,1,1);x.fillRect(ox+32+b-1,oy+y,1,1)}}
function karte(){var s=S(),o=A.o,R=s.RICHTUNGEN[o.kat]||1,bs=[],hoch=0;
 for(var r=0;r<R;r++){var b=s.richtungsBild(o,r);bs.push(b);if(b&&b.ay>hoch)hoch=b.ay}
 var cv=$('#aKarte'),W=72,top=hoch+4;cv.width=W*R;cv.height=top+30;var x=cv.getContext('2d');x.imageSmoothingEnabled=false;
 x.fillStyle=rgb(s.nummer(0,1));x.fillRect(0,0,cv.width,cv.height);
 bs.forEach(function(b,r){var ox=r*W+4;grasFeld(x,ox,top-16);
  if(b)x.drawImage(bild(b),ox+32-b.ax,top-b.ay);else{x.fillStyle=rgb(s.nummer(5,3));x.fillRect(ox+26,top-24,12,12)}});
 groesse(cv,2)}
// First Person mit dem gemeinsamen Zeichner (fp.js): vorbereiteter Hintergrund, Objekt nah mit Schatten, zwei Stück in der Ferne im Dunst.
// Blickrichtung per Pfeil (4 Seiten aus den Kartenrichtungen). Gemessen wird die Zeit für ein ganzes Bild (Mittel aus 30, nach dem Vorbereiten).
var SEITEN=['von vorn','von rechts','von hinten','von links'];
function fp(){var s=S(),F=window.AT3_FP,o=A.o,cv=$('#aFp'),x=cv.getContext('2d'),H=F.HORIZONT,
  szene=[{o:o,r:A.r,x:112,y:F.H-8},{o:o,r:(A.r+1)%4,x:226,y:H+38,fern:true},{o:o,r:(A.r+3)%4,x:286,y:H+33,fern:true}];
 if(o.kat==='boden'){var bf=o.fp&&o.fp.farbe>=0;F.zeichne(x,[]);x.fillStyle=bf?rgb(o.fp.farbe):rgb(s.nummer(5,3));x.fillRect(0,H+40,FPW,FPH-H-40);groesse(cv,1);
  $('#aSeite').textContent='';$('#aZeit').textContent='Boden: in First Person nur Farbfläche.';return}
 var v=performance.now();F.zeichne(x,szene);var vor=performance.now()-v,t=performance.now();for(var i=0;i<30;i++)F.zeichne(x,szene);var ms=(performance.now()-t)/30;
 if(!s.fpBild(o,'nah')||!s.fpBild(o,'fern')){x.fillStyle=rgb(s.nummer(5,3));x.fillRect(150,80,20,20)}
 $('#aSeite').textContent=SEITEN[A.r];
 $('#aZeit').textContent='Ein Bild: '+ms.toFixed(2).replace('.',',')+' ms (erstes mit Vorbereiten '+Math.round(vor)+' ms). Budget je Bild bei 60 fps: 16 ms.';
 groesse(cv,1)}
function groesse(cv,min){var b=(cv.parentNode.clientWidth||cv.width)-4,f=Math.max(min,Math.floor(b/cv.width))||1;if(cv.width*f>b&&f>1)f--;cv.style.width=cv.width*f+'px';cv.style.height=cv.height*f+'px'}

function zeigen(){var s=S(),o=A.o,f=s.pruefeObjekt(o),by=s.ansichtenBytes(o),R=s.RICHTUNGEN[o.kat]||1,ref=0,eig=0;
 (o.richtungen||[]).forEach(function(e){if(s.istVerweis(e))ref++;else eig++});
 karte();fp();
 var nah=o.fp&&o.fp.nah,txt=o.kat==='boden'?'Karte: 1 Bild · First Person: Bodenfarbe '+(o.fp&&o.fp.farbe>=0?'Nr. '+o.fp.farbe:'fehlt')+' · Speicher '+by.summe+' Byte.':'Karte: '+R+' Richtung'+(R>1?'en':'')+' (1 Bild'+(eig?' + '+eig+' eigene':'')+(ref?' + '+ref+' Verweis'+(ref>1?'e':'')+', gespiegelt oder kopiert':'')+') · '+
  'First Person nah: '+(!nah?'fehlt':s.istVerweis(nah)?'Kartenbild':'eigenes Bild')+' · fern: '+(o.fp&&o.fp.fern?(o.fp.fernAuto?'automatisch':'eigenes Bild'):'fehlt')+
  ' · Speicher '+by.karte+' + '+by.fp+' = '+by.summe+' Byte.';
 $('#aInfo').textContent=txt;
 $('#aPruef').innerHTML=f.length?'<span class="witz">Prüfer: '+esc(f.join('; '))+'.</span>':'<span class="leise">Prüfer: beide Ansichten vollständig.</span>'}

function fertig(){var o=kopie(A.o),r=A.repo[o.id],d=lies().objekte||{},alt=d[o.id]||r;
 var sig=function(x){return JSON.stringify([x.bild,x.richtungen,x.fp])};
 if(alt&&sig(alt)!==sig(o))o.version=r&&alt.version<=r.version?r.version+1:alt.version;
 S().nachAenderung(alt,o);   // M6: neues Bild → zurück auf Skizze, Messung verworfen
 return S().ordne(o)}
function speichern(){if(!A.o)return null;var f=S().pruefeObjekt(A.o);if(f.length){meld('Abgelehnt: '+f.join('; ')+'.',1);return null}
 var o=fertig(),d=lies();d.objekte=d.objekte||{};d.objekte[o.id]=o;if(!schreib(d)){meld('Browser lässt nicht speichern (privates Fenster?). Gleich exportieren.',1);return null}
 A.o=kopie(o);liste();$('#aListe').value=o.id;meld('Gespeichert: „'+o.id+'“ Version '+o.version+' als Entwurf. Fürs Repository: Objekt-Datei exportieren (Kartei-Datei in der Werkstatt).');return o}
function exportiere(){var o=speichern();if(!o)return;var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(o)+'\n'],{type:'application/json'}));
 a.download=o.id+'.json';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000);meld('Objekt-Datei „'+o.id+'.json“ erzeugt. Gehört nach dist/at3/kartei/obj/.')}
return{aufbauen:aufbauen,zustand:function(){return A}};
})();
