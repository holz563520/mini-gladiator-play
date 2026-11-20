// WAS DIE DATEI TUT: Objektkarten des AT3-Master-Editors (Schritt M4, im Menü Grafik, erst beim Antippen geladen). Editor-Szene mit Objekten der Kartei:
// Antippen öffnet die Karte (Name und Beschreibung englisch aus kartei/text-en.json, Gruppe, Fläche, Kollision je Feld, gesperrte Kanten, Anker, Typnummer).
// Prüfen & speichern als Entwurf (gleicher Browser-Speicher wie die Werkstatt), Export von Objekt-, Kartei- und Sprachdatei. Riesenwelt-Probe: Antippen bei 1.000.000 Stück.
(function(){
'use strict';
var S=window.AT3_64,K=window.AT3_KARTE,PAL=S.PALETTE,OBJ='at3-werkstatt-v1',TXT='at3-texte-v1',RW=K.reichweite(S.GROESSEN);
var N=6,OX=(N-1)*32,OY=RW.h-16,CW=N*64,CH=OY+N*32+4;
var Z={el:null,repo:{},texte:{},liste:[],raster:null,stuecke:[],offen:null,E:null,T:null,modus:'koll',ankerArt:'tuer',zoom:1};
function lies(k){try{return JSON.parse(localStorage.getItem(k))||{}}catch(e){return{}}}
function schreib(k,d){try{localStorage.setItem(k,JSON.stringify(d));return true}catch(e){return false}}
function entwuerfe(){return lies(OBJ).objekte||{}}
function entwurfTexte(){return lies(TXT).texte||{}}
function alleTexte(){var t={},a=Z.texte,b=entwurfTexte();Object.keys(a).forEach(function(k){t[k]=a[k]});Object.keys(b).forEach(function(k){t[k]=b[k]});return t}
function $(s){return Z.el.querySelector(s)}
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function meld(t,schlecht){var m=$('#kMeld');m.textContent=t;m.className=schlecht?'witz':'leise'}
function rgb(n){return S.PALETTEN[PAL].farben[n]}
function kopie(o){return JSON.parse(JSON.stringify(o))}

function aufbauen(el){
 Z.el=el;el.innerHTML='<h2>Objektkarten</h2><p class="leise">Tippe ein Objekt in der Szene an, dann öffnet sich seine Karte. Name und Beschreibung sind englisch, so wie sie im Spiel stehen.</p>'+
  '<div class="wZeile"><select id="kListe"><option value="">Karte öffnen …</option></select><button class="knopf klein" id="kNeuSzene">Szene neu würfeln</button></div>'+
  '<div class="kSzene"><canvas id="kCv" class="pixel" width="'+CW+'" height="'+CH+'"></canvas></div><p class="leise" id="kTreff"></p>'+
  '<div id="kKarte"></div><p id="kMeld" class="leise"></p>'+
  '<p><button class="knopf klein" id="kRiese">Riesenwelt-Probe<small>1.000.000 Stück, Antippen messen</small></button></p><p class="leise" id="kRieseErg"></p>';
 var k=AT3ED.kartei()||{objekte:[]};
 return AT3ED.lade('grafik','kartei/text-en.json').then(function(t){Z.texte=(t&&t.texte)||{}},function(){Z.texte={}}).then(function(){
  // Für die Szene höchstens 36 Objekte aus dem Repository laden (so viele Felder hat sie; seit M9 hat die Kartei 31).
  return Promise.all((k.objekte||[]).slice(0,36).map(function(r){return AT3ED.lade('grafik','kartei/'+r.datei).then(function(o){Z.repo[o.id]=o},function(){})}));
 }).then(function(){
  $('#kListe').onchange=function(){var v=this.value;this.value='';if(v)oeffne(v)};
  $('#kNeuSzene').onclick=function(){Z.saat=(Z.saat||1)+1;szene()};
  $('#kRiese').onclick=riese;
  var cv=$('#kCv');cv.addEventListener('pointerup',antippen);
  window.addEventListener('resize',passend);
  szene();
 });
}
// Alle bekannten Objekte: Repository, darüber Entwürfe aus diesem Browser.
function objekte(){var m={},d=entwuerfe();Object.keys(Z.repo).forEach(function(id){m[id]=Z.repo[id]});Object.keys(d).forEach(function(id){m[id]=d[id]});
 return Object.keys(m).sort().map(function(id){return m[id]}).filter(function(o){return o&&o.bild})}
function listeFuellen(){var t=alleTexte();$('#kListe').innerHTML='<option value="">Karte öffnen …</option>'+Z.liste.map(function(o){
 var n=K.text(t,o.id).name||o.name||o.id;return'<option value="'+esc(o.id)+'">'+esc(n)+' · '+esc(o.id)+(entwuerfe()[o.id]?' (Entwurf)':'')+'</option>'}).join('')}
// Szene: N × N Felder Gras, Objekte der Kartei verstreut. Im Raster steht je Stück die Nummer in Z.liste (+1), im Spiel wird es die Typnummer sein.
function szene(){
 Z.liste=objekte();listeFuellen();
 var r=new K.Raster(N,N),zz=(Z.saat||1)*7919;function zufall(){zz=(zz*1103515245+12345)&0x7fffffff;return zz/0x7fffffff}
 if(Z.liste.length){var frei=[];for(var j=0;j<N;j++)for(var i=0;i<N;i++)frei.push([i,j]);
  for(var a=frei.length-1;a>0;a--){var b=Math.floor(zufall()*(a+1)),t=frei[a];frei[a]=frei[b];frei[b]=t}
  var zahl=Math.max(Z.liste.length,10);for(var s=0;s<zahl&&s<frei.length;s++)r.setze(1+s%Z.liste.length,frei[s][0],frei[s][1])}
 Z.raster=r;malen();passend();
 $('#kTreff').textContent=Z.liste.length?r.n+' Stück in der Szene. Antippen!':'Die Kartei ist leer. Erst in der Skizzen-Werkstatt etwas zeichnen.';
}
function bildVon(nr){var o=Z.liste[nr-1];return o&&o.bild}
var GRAS=null;
function gras(){if(GRAS)return GRAS;var c=document.createElement('canvas');c.width=64;c.height=32;var x=c.getContext('2d'),hell=rgb(S.nummer(2,4)),dunkel=rgb(S.nummer(2,2));
 for(var y=0;y<32;y++){var h=y<16?y:31-y,b=2*h+2;x.fillStyle=hell;x.fillRect(32-b,y,2*b,1);x.fillStyle=dunkel;x.fillRect(32-b,y,1,1);x.fillRect(32+b-1,y,1,1)}return GRAS=c}
function malen(){
 var cv=$('#kCv'),x=cv.getContext('2d'),r=Z.raster;x.imageSmoothingEnabled=false;x.clearRect(0,0,CW,CH);
 for(var j=0;j<N;j++)for(var i=0;i<N;i++)x.drawImage(gras(),OX+(i-j)*32,OY+(i+j)*16);
 // Zeichenreihenfolge wie im Raster: i+j aufsteigend, dann i, dann Setzreihenfolge
 var L=[];for(var s=0;s<r.n;s++){var f=r.feld[s];L.push({s:s,i:f%N,j:(f/N)|0})}
 L.sort(function(a,b){return(a.i+a.j)-(b.i+b.j)||a.i-b.i||a.s-b.s});
 L.forEach(function(e){var b=bildVon(r.typ[e.s]);if(!b)return;x.drawImage(S.zuCanvas(b,PAL),OX+(e.i-e.j)*32+32-b.ax,OY+(e.i+e.j)*16+16-b.ay);
  if(Z.offen&&Z.liste[r.typ[e.s]-1]&&Z.liste[r.typ[e.s]-1].id===Z.offen.id&&e.s===Z.offenStueck){x.strokeStyle=rgb(S.nummer(5,4));x.lineWidth=1;
   x.strokeRect(OX+(e.i-e.j)*32+32-b.ax+.5,OY+(e.i+e.j)*16+16-b.ay+.5,b.w-1,b.h-1)}});
}
function passend(){var cv=$('#kCv');if(!cv)return;var b=(cv.parentNode.clientWidth||CW)-4;Z.zoom=Math.max(1,Math.floor(b/CW))||1;
 var s=Math.min(1,b/CW)*Z.zoom;cv.style.width=Math.floor(CW*s)+'px';cv.style.height=Math.floor(CH*s)+'px'}
function antippen(e){
 var cv=$('#kCv'),r=cv.getBoundingClientRect(),px=(e.clientX-r.left)/r.width*CW-OX,py=(e.clientY-r.top)/r.height*CH-OY;
 var t0=performance.now(),t=Z.raster.treffer(px,py,bildVon,RW),ms=performance.now()-t0;
 if(t.stueck<0){$('#kTreff').textContent='Daneben. Nur Gras, und Gras hat keine Meinung. ('+t.felder+' Felder geprüft, '+ms.toFixed(3).replace('.',',')+' ms)';return}
 Z.offenStueck=t.stueck;var o=Z.liste[t.typ-1];oeffne(o.id);
 $('#kTreff').textContent='Getroffen auf Feld '+t.i+', '+t.j+' · '+t.felder+' Felder geprüft · '+ms.toFixed(3).replace('.',',')+' ms. Mehr als rund 80 Felder werden es nie, egal wie groß die Welt ist.';
}

// ---- Karte ----
function oeffne(id){
 var o=null;Z.liste.forEach(function(x){if(x.id===id)o=x});if(!o)return;
 Z.offen=o;Z.E=kopie(o);if(!Z.E.karte)Z.E.karte=K.neueKarte(o.kat);var kt=Z.E.karte;if(kt.kanten==='0')kt.kanten=new Array(kt.flaeche.w*kt.flaeche.h+1).join('0');
 var t=K.text(alleTexte(),id);Z.T={name:t.name||o.name||'',info:t.info};
 var gr=Object.keys(K.GRUPPEN).map(function(g){return'<option value="'+g+'"'+(g===kt.gruppe?' selected':'')+'>'+K.GRUPPEN[g]+'</option>'}).join('');
 var an=Object.keys(K.ANKER).map(function(a){return'<option value="'+a+'"'+(a===Z.ankerArt?' selected':'')+'>'+K.ANKER[a]+'</option>'}).join('');
 var typ=o.typ?String(o.typ):'wird beim Speichern vergeben (nächste: '+(naechsterTyp())+')';
 $('#kKarte').innerHTML='<div class="kKarte papier"><div class="kKopf"><canvas id="kBild" class="pixel"></canvas><div><h3 id="kTitel"></h3>'+
  '<p class="leise">'+esc(o.id)+' · Version '+o.version+' · Typ-Nr. '+typ+'<br>Art '+esc(o.kat)+' · Status '+esc(o.status)+' · Herkunft '+esc(o.herkunft||'skizze')+'</p></div></div>'+
  '<div class="wForm"><label>Name (englisch) <input id="kName" maxlength="'+K.NAME_MAX+'"></label><label>Gruppe <select id="kGruppe">'+gr+'</select></label></div>'+
  '<label class="kInfo">Beschreibung (englisch, 1–3 Sätze) <textarea id="kInfo" rows="3" maxlength="'+K.INFO_MAX+'"></textarea></label><p class="leise" id="kZahl"></p>'+
  '<div class="wForm"><label>Breite (Felder) <input id="kW" type="number" min="1" max="'+K.maxFlaeche(Z.E.kat)+'" inputmode="numeric" value="'+kt.flaeche.w+'"></label>'+
  '<label>Tiefe (Felder) <input id="kH" type="number" min="1" max="'+K.maxFlaeche(Z.E.kat)+'" inputmode="numeric" value="'+kt.flaeche.h+'"></label></div>'+
  '<div class="wZeile"><button class="knopf klein" data-km="koll">Kollision</button><button class="knopf klein" data-km="kante">Kanten</button><button class="knopf klein" data-km="anker">Anker</button>'+
  '<select id="kAnkerArt">'+an+'</select></div>'+
  '<p class="leise" id="kHilfe"></p><div class="kFlaeche"><canvas id="kFl"></canvas></div><p class="leise" id="kAnkerListe"></p>'+
  '<p class="leise">Im Spiel trägt jedes Stück dieser Art nur Typnummer, Lage, Zustand, Rolle und Besitzer (rund '+K.STUECK_BYTES+' Byte). Name und Beschreibung stehen einmal hier, nicht millionenfach in der Welt.</p>'+
  '<p id="kPruef" class="leise"></p>'+
  '<div class="wZeile"><button class="knopf klein haupt" id="kSpeich">Prüfen &amp; speichern</button></div>'+
  '<div class="wZeile"><button class="knopf klein" id="kExObj">Objekt-Datei</button><button class="knopf klein" id="kExKar">Kartei-Datei</button><button class="knopf klein" id="kExTxt">Sprachdatei</button><button class="knopf klein" id="kKopier">Karte kopieren</button></div></div>';
 $('#kName').value=Z.T.name;$('#kInfo').value=Z.T.info;
 $('#kName').oninput=function(){Z.T.name=this.value.trim();titel();pruefen()};
 $('#kInfo').oninput=function(){Z.T.info=this.value.trim();pruefen()};
 $('#kGruppe').onchange=function(){Z.E.karte.gruppe=this.value;pruefen()};
 $('#kW').onchange=$('#kH').onchange=function(){flaeche(+$('#kW').value,+$('#kH').value)};
 [].forEach.call(Z.el.querySelectorAll('[data-km]'),function(b){b.onclick=function(){Z.modus=b.dataset.km;modusZeigen()}});
 $('#kAnkerArt').onchange=function(){Z.ankerArt=this.value;Z.modus='anker';modusZeigen()};
 $('#kFl').addEventListener('pointerup',flaecheTippen);
 $('#kSpeich').onclick=speichern;$('#kExObj').onclick=function(){exportiere('objekt')};$('#kExKar').onclick=function(){exportiere('kartei')};
 $('#kExTxt').onclick=function(){exportiere('text')};$('#kKopier').onclick=kopieren;
 var bc=$('#kBild'),b=o.bild,f=Math.max(1,Math.min(2,Math.floor(96/b.h)||1));bc.width=b.w;bc.height=b.h;bc.style.width=b.w*f+'px';bc.style.height=b.h*f+'px';
 var bx=bc.getContext('2d');bx.imageSmoothingEnabled=false;bx.drawImage(S.zuCanvas(b,PAL),0,0);
 titel();modusZeigen();malen();meld('');
 if(Z.el.querySelector('.kKarte').scrollIntoView)Z.el.querySelector('.kKarte').scrollIntoView({block:'nearest'});
}
function titel(){$('#kTitel').textContent=Z.T.name||'(noch namenlos)'}
function naechsterTyp(){var d=entwuerfe();return K.typMax(AT3ED.kartei(),Object.keys(d).map(function(i){return d[i]}))+1}
function modusZeigen(){[].forEach.call(Z.el.querySelectorAll('[data-km]'),function(b){b.classList.toggle('an',b.dataset.km===Z.modus)});
 $('#kHilfe').textContent=Z.modus==='koll'?'Feld antippen: frei → nur zu Fuß → gesperrt. Karren fahren nur über freie Felder.':
  Z.modus==='kante'?'Nahe an einer Feldkante antippen: Kante sperren oder öffnen (Wand, Zaun).':'Anker „'+K.ANKER[Z.ankerArt]+'“: auf einen Punkt tippen (halbe Felder). Auf einen vorhandenen Anker tippen: weg damit.';
 flaecheMalen();pruefen()}
function flaeche(w,h){var k=Z.E.karte,ow=k.flaeche.w,oh=k.flaeche.h;var mx=K.maxFlaeche(Z.E.kat);w=Math.max(1,Math.min(mx,w|0));h=Math.max(1,Math.min(mx,h|0));
 var feld='',kan='';for(var j=0;j<h;j++)for(var i=0;i<w;i++){var alt=i<ow&&j<oh;feld+=alt?k.feld[j*ow+i]:'x';kan+=alt?k.kanten[j*ow+i]:'0'}
 k.flaeche={w:w,h:h};k.feld=feld;k.kanten=kan;k.anker=k.anker.filter(function(a){return a.fx<=w&&a.fy<=h});$('#kW').value=w;$('#kH').value=h;flaecheMalen();pruefen()}
// Feldgröße der Draufsicht: groß genug zum Antippen der Kanten, die ganze Fläche passt auf den Bildschirm.
function zelle(){var k=Z.E.karte;return Math.max(32,Math.min(96,Math.floor(300/Math.max(k.flaeche.w,k.flaeche.h))))}
var FARBE={f:[2,4],p:[10,3],x:[5,2]};
function flaecheMalen(){
 var k=Z.E.karte,w=k.flaeche.w,h=k.flaeche.h,cv=$('#kFl'),Zl=zelle(),x;cv.width=w*Zl+12;cv.height=h*Zl+12;x=cv.getContext('2d');x.font='16px "AT3 Text",monospace';x.textAlign='center';x.textBaseline='middle';
 x.translate(6,6);
 for(var j=0;j<h;j++)for(var i=0;i<w;i++){var c=k.feld[j*w+i],q=FARBE[c];x.fillStyle=rgb(S.nummer(q[0],q[1]));x.fillRect(i*Zl,j*Zl,Zl,Zl);
  x.strokeStyle=rgb(S.nummer(0,1));x.lineWidth=1;x.strokeRect(i*Zl+.5,j*Zl+.5,Zl-1,Zl-1);x.fillStyle=rgb(S.nummer(0,0));x.textAlign='left';x.textBaseline='top';x.fillText(c==='f'?'frei':c==='p'?'Fuß':'zu',i*Zl+6,j*Zl+5);x.textAlign='center';x.textBaseline='middle';
  var m=parseInt(k.kanten[j*w+i],16)||0;x.fillStyle=rgb(S.nummer(3,0));
  if(m&1)x.fillRect(i*Zl-2,j*Zl,5,Zl);if(m&4)x.fillRect((i+1)*Zl-3,j*Zl,5,Zl);if(m&2)x.fillRect(i*Zl,j*Zl-2,Zl,5);if(m&8)x.fillRect(i*Zl,(j+1)*Zl-3,Zl,5)}
 k.anker.forEach(function(a){var ax=a.fx*Zl,ay=a.fy*Zl;x.fillStyle=rgb(S.nummer(8,4));x.beginPath();x.arc(ax,ay,9,0,7);x.fill();x.fillStyle=rgb(S.nummer(0,0));x.fillText(K.ANKER[a.art][0],ax,ay+1)});
 $('#kAnkerListe').textContent=k.anker.length?'Anker: '+k.anker.map(function(a){return K.ANKER[a.art]+' ('+a.fx+', '+a.fy+')'}).join(' · '):'Noch keine Anker. Der Fußpunkt kommt aus dem Bild.';
}
function flaecheTippen(e){
 var cv=$('#kFl'),r=cv.getBoundingClientRect(),fx=((e.clientX-r.left)/r.width*cv.width-6)/zelle(),fy=((e.clientY-r.top)/r.height*cv.height-6)/zelle(),k=Z.E.karte,w=k.flaeche.w,h=k.flaeche.h;
 if(Z.modus==='anker'){var ax=Math.max(0,Math.min(w,Math.round(fx*2)/2)),ay=Math.max(0,Math.min(h,Math.round(fy*2)/2)),weg=-1;
  k.anker.forEach(function(a,n){if(a.fx===ax&&a.fy===ay)weg=n});if(weg>=0)k.anker.splice(weg,1);else k.anker.push({art:Z.ankerArt,fx:ax,fy:ay})}
 else{var i=Math.floor(fx),j=Math.floor(fy);if(i<0||j<0||i>=w||j>=h)return;var n=j*w+i;
  if(Z.modus==='koll'){var c=k.feld[n],z={f:'p',p:'x',x:'f'}[c];k.feld=k.feld.slice(0,n)+z+k.feld.slice(n+1)}
  else{var lx=fx-i,ly=fy-j,d=[[lx,1],[ly,2],[1-lx,4],[1-ly,8]].sort(function(a,b){return a[0]-b[0]})[0];if(d[0]>.3)return;
   var m=(parseInt(k.kanten[n],16)||0)^d[1];k.kanten=k.kanten.slice(0,n)+m.toString(16)+k.kanten.slice(n+1)}}
 flaecheMalen();pruefen()}
// Das Objekt so, wie es gespeichert würde (Typnummer vergeben, Kanten ohne Sperre als '0', Version nach Änderung).
function fertig(){
 var o=kopie(Z.E),d=entwuerfe(),r=Z.repo[o.id],alt=d[o.id]||Z.offen;o.name=Z.T.name;if(!o.typ)o.typ=naechsterTyp();
 if(/^0+$/.test(o.karte.kanten))o.karte.kanten='0';
 var sig=function(x){return JSON.stringify([x.name,x.kat,x.typ,x.karte,x.bild,x.richtungen,x.fp])};
 if(alt&&sig(alt)!==sig(o))o.version=r&&alt.version<=r.version?r.version+1:alt.version;
 // Reihenfolge der Felder wie in der Repository-Datei
 S.nachAenderung(alt,o);   // M6: Karte, Name oder Typ geändert → wieder Skizze (Messung bleibt gültig)
 return S.ordne(o)}
function texteMit(o){var t=alleTexte(),s=K.schluessel(o.id);t[s.name]=Z.T.name;t[s.info]=Z.T.info;return t}
function pruefen(){if(!Z.E)return[];var o=fertig(),f=S.pruefeObjekt(o).concat(K.pruefeKarte(o,texteMit(o)));
 var s=K.saetze(Z.T.info);$('#kZahl').textContent=Z.T.info.length+' / '+K.INFO_MAX+' Zeichen · '+s+(s===1?' Satz':' Sätze');
 $('#kPruef').innerHTML=f.length?'<span class="witz">Prüfer: '+esc(f.join('; '))+'.</span>':'Prüfer: Karte vollständig.';return f}
function speichern(){var f=pruefen();if(f.length){meld('Abgelehnt: '+f.join('; ')+'.',1);return null}
 var o=fertig(),d=lies(OBJ),t=lies(TXT),s=K.schluessel(o.id);d.objekte=d.objekte||{};d.objekte[o.id]=o;t.texte=t.texte||{};t.texte[s.name]=Z.T.name;t.texte[s.info]=Z.T.info;
 if(!schreib(OBJ,d)||!schreib(TXT,t)){meld('Browser lässt nicht speichern (privates Fenster?). Gleich exportieren.',1);return null}
 var id=o.id,st=Z.offenStueck;Z.liste=objekte();listeFuellen();Z.offenStueck=st;
 Z.liste.forEach(function(x){if(x.id===id)Z.offen=x});Z.E=kopie(o);if(Z.E.karte.kanten==='0')Z.E.karte.kanten=new Array(o.karte.flaeche.w*o.karte.flaeche.h+1).join('0');malen();
 meld('Gespeichert: „'+id+'“ Version '+o.version+', Typ-Nr. '+o.typ+', als Entwurf in diesem Browser. Fürs Repository: Objekt-, Kartei- und Sprachdatei exportieren.');return o}
function kartei(){var k=AT3ED.kartei()||{format:'at3-kartei',version:1,objekte:[]},m={},d=entwuerfe(),tm=k.typMax|0;
 (k.objekte||[]).forEach(function(o){m[o.id]=o});Object.keys(d).forEach(function(id){var o=d[id];m[id]={id:id,version:o.version,typ:o.typ,kat:o.kat,name:o.name,status:o.status,datei:'obj/'+id+'.json'};if(!o.typ)delete m[id].typ});
 Object.keys(m).forEach(function(id){if(m[id].typ>tm)tm=m[id].typ});
 return{format:'at3-kartei',version:1,palette:PAL,typMax:tm,objekte:Object.keys(m).sort().map(function(id){return m[id]})}}
function sprachdatei(){var t=alleTexte(),n={};Object.keys(t).sort().forEach(function(k){n[k]=t[k]});return{format:'at3-text',sprache:'en',texte:n}}
function datei(name,text){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();
 setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000)}
function exportiere(was){var o=speichern();if(!o)return;
 if(was==='objekt'){datei(o.id+'.json',JSON.stringify(o)+'\n');meld('Objekt-Datei „'+o.id+'.json“ erzeugt. Gehört nach dist/at3/kartei/obj/.')}
 else if(was==='kartei'){datei('objekte.json',JSON.stringify(kartei(),null,1)+'\n');meld('Kartei-Datei „objekte.json“ erzeugt. Ersetzt dist/at3/kartei/objekte.json.')}
 else{datei('text-en.json',JSON.stringify(sprachdatei(),null,1)+'\n');meld('Sprachdatei „text-en.json“ erzeugt. Ersetzt dist/at3/kartei/text-en.json.')}}
function kopieren(){var o=speichern();if(!o)return;var s=K.schluessel(o.id),t={};t[s.name]=Z.T.name;t[s.info]=Z.T.info;var x=JSON.stringify({objekt:o,texte:t});
 (navigator.clipboard?navigator.clipboard.writeText(x):Promise.reject()).then(function(){meld('Karte „'+o.id+'“ kopiert. In den Chat einfügen, dann legt Claude Objekt und Texte ins Repository.')},function(){meld('Kopieren nicht erlaubt. Bitte die Dateien exportieren.',1)})}

// ---- Riesenwelt-Probe: 1000 × 1000 Felder, 1.000.000 Stück, in Scheiben aufgebaut (kein langes Bild), dann 2.000 zufällige Antipper ----
function riese(){
 var aus=$('#kRieseErg');if(!Z.liste.length){aus.textContent='Ohne Objekte gibt es nichts zu verteilen.';return}
 if(Z.rieseLaeuft)return;Z.rieseLaeuft=true;
 var G=1000,r=new K.Raster(G,G,G*G),n=0,zz=12345,t0=performance.now(),laengste=0,arten=Z.liste.length;
 function zufall(){zz=(zz*1103515245+12345)&0x7fffffff;return zz/0x7fffffff}
 aus.textContent='Die Welt wird aufgeforstet …';
 (function scheibe(){var a=performance.now();while(n<G*G&&performance.now()-a<8){var e=Math.min(G*G,n+20000);for(;n<e;n++)r.setze(1+n%arten,n%G,(n/G)|0)}
  laengste=Math.max(laengste,performance.now()-a);
  if(n<G*G){aus.textContent='Die Welt wird aufgeforstet … '+Math.round(n/G/G*100)+' %';return setTimeout(scheibe,0)}
  var bau=performance.now()-t0,M=2000,felder=0,treffer=0,a2=performance.now();
  for(var k=0;k<M;k++){var i=zufall()*G,j=zufall()*G,px=(i-j)*32+32,py=(i+j)*16+16-zufall()*80,t=r.treffer(px,py,bildVon,RW);felder+=t.felder;if(t.stueck>=0)treffer++}
  var je=(performance.now()-a2)/M,mb=(r.kopf.byteLength+r.naechst.byteLength+r.typ.byteLength+r.feld.byteLength)/1048576;
  aus.innerHTML='1.000.000 Stück auf 1000 × 1000 Feldern. Aufbau '+Math.round(bau)+' ms in Scheiben, längste Scheibe '+laengste.toFixed(1).replace('.',',')+' ms. '+
   'Raster '+mb.toFixed(1).replace('.',',')+' MB (Probe-Raster, im Spiel kommen Kartenstücke). Antippen im Schnitt <b>'+(je*1000).toFixed(1).replace('.',',')+' µs</b>, je '+Math.round(felder/M)+
   ' Felder geprüft, '+treffer+' von '+M+' Antippern trafen etwas. Die Szene oben prüft gleich viele Felder: Die Welt darf wachsen, das Antippen merkt es nicht.';
  Z.riese={stueck:r.n,bauMs:bau,laengsteMs:laengste,jeUs:je*1000,felder:felder/M,treffer:treffer,mb:mb};Z.rieseLaeuft=false;r=null})();
}

window.AT3_KARTEN={aufbauen:aufbauen,zustand:function(){return Z},oeffne:oeffne,fertig:fertig,kartei:kartei,sprachdatei:sprachdatei};
})();
