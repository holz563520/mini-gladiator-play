// WAS DIE DATEI TUT: Menü „Grafik“ des AT3-Master-Editors (wird erst beim Öffnen geladen). M4: Objektkarten & Antippen (menue/karten.js). M3: Skizzen-Werkstatt (menue/werkstatt.js). M2: Grafikstandard AT3-64 mit drei Paletten am selben
// Musterblatt (Stil RollerCoaster Tycoon Classic), Figurengrößen, Durchscheinen verdeckter Figuren, Größentabelle und Prüfer.
// at3-64.js und das Musterblatt werden erst beim Antippen von „Grafikstandard“ geholt.
AT3ED.menue('grafik',function(el,c){
 var n=c.kartei&&c.kartei.objekte?c.kartei.objekte.length:0;
 el.innerHTML='<p>Hier entsteht jede Grafik, die ins Spiel darf. Am Editor vorbei kommt nichts hinein, nicht einmal eine Ratte.</p>'+
  '<p class="leise">Objekte in der Kartei: '+n+'.</p>'+
  '<p><button class="knopf" id="gStd">Grafikstandard AT3-64 und Musterblatt<small>Paletten A, B, C · Figurengröße · Prüfer</small></button></p>'+
  '<div id="gStdInhalt"></div>'+
  '<p><button class="knopf" id="gWerk">Skizzen-Werkstatt<small>zeichnen · Bild umrechnen · Objekt speichern · Export</small></button></p>'+
  '<div id="gWerkInhalt"></div>'+
  '<p><button class="knopf" id="gKarten">Objektkarten &amp; Antippen<small>Name · Beschreibung · Fläche · Kollision · Anker</small></button></p>'+
  '<div id="gKartenInhalt"></div>'+
  '<ul>'+
  '<li>Boden, Natur, Gebäude und Wände, Einrichtung, Waren, Figuren, Tiere, Fahrzeuge, Zeichen <span class="leise">(Startset M9, danach jeder Inhaltsschritt)</span></li></ul>';
 el.querySelector('#gStd').onclick=function(){standard(el.querySelector('#gStdInhalt'))};
 el.querySelector('#gKarten').onclick=function(){var z=el.querySelector('#gKartenInhalt');z.innerHTML='<p class="leise">Die Karteikarten werden abgestaubt …</p>';
  AT3ED.lade('grafik','at3-64.js').then(function(){return AT3ED.lade('grafik','karte.js')}).then(function(){return AT3ED.lade('grafik','menue/karten.js')})
   .then(function(){return AT3_KARTEN.aufbauen(z)}).catch(function(e){z.innerHTML='<p class="witz">Karteikasten klemmt: '+e.message+'</p>'})};
 el.querySelector('#gWerk').onclick=function(){var z=el.querySelector('#gWerkInhalt');z.innerHTML='<p class="leise">Die Werkstatt wird aufgeschlossen …</p>';
  AT3ED.lade('grafik','at3-64.js').then(function(){return AT3ED.lade('grafik','menue/werkstatt.js')}).then(function(){AT3_WERKSTATT.aufbauen(z)},function(e){z.innerHTML='<p class="witz">Werkstatt klemmt: '+e.message+'</p>'})};
});
function standard(ziel){
 ziel.innerHTML='<p class="leise">Pinsel werden gewaschen …</p>';
 Promise.all([AT3ED.lade('grafik','at3-64.js'),AT3ED.lade('grafik','standard/musterblatt.json')]).then(function(r){zeigen(ziel,r[1])})
  .catch(function(e){ziel.innerHTML='<p class="witz">Konnte den Standard nicht laden: '+e.message+'</p>'});
}
// Musterblatt: 4 × 4 Felder, Wand an der hinteren Kante, Baum, Blumen, Figuren in drei Größen, je eine Figur hinter Wand und Baum.
// Gezeichnet nur durch Kopieren fertiger Bilder auf ganze Bildpunkte. Danach Durchscheinen: verdeckte Teile von Figuren als Punktmuster in heller Palettenfarbe.
function blatt(B,pal){
 var S=AT3_64,W=256,H=232,ox=96,oy=96,c=document.createElement('canvas');c.width=W;c.height=H;var x=c.getContext('2d');x.imageSmoothingEnabled=false;
 var feld=function(i,j){return{x:(i-j)*32+ox,y:(i+j)*16+oy}};
 var dinge=[];
 for(var i=0;i<4;i++)for(var j=0;j<4;j++){var f=feld(i,j);x.drawImage(S.zuCanvas(i===1&&j===2||i===2&&j===2?B.erde:B.gras,pal),f.x,f.y)}
 [0,1,2].forEach(function(j){dinge.push({t:j-.5,b:B.wand,f:feld(0,j),dx:0,dy:16})});
 var setze=function(b,i,j,t,fig){var f=feld(i,j);dinge.push({t:t==null?i+j:t,b:b,f:f,dx:32,dy:16,fig:fig})};
 setze(B.baum,2,0);setze(B.blume,3,0);setze(B.blume,0,3);setze(B.blume,3,1);
 setze(B.figur16,1,1,null,1);setze(B.figur24,2,1,null,1);setze(B.figur32,3,2,null,1);setze(B.figur24,1,2,null,1);
 setze(B.figur24,-0.6,1.1,-1,1);   // hinter der Wand
 setze(B.figur24,1.55,-0.35,1.1,1); // hinter dem Baum
 dinge.sort(function(a,b){return a.t-b.t});
 var figs=[];
 dinge.forEach(function(d){var px=Math.round(d.f.x+d.dx-d.b.ax),py=Math.round(d.f.y+d.dy-d.b.ay),q=S.zuCanvas(d.b,pal);
  x.drawImage(q,px,py);if(d.fig)figs.push({x:px,y:py,b:d.b,soll:x.getImageData(px,py,d.b.w,d.b.h)})});
 durchscheinen(x,figs,S.farbe(S.PALETTEN[pal].farben[S.nummer(7,4)]));
 return c;
}
// Figuren immer sichtbar: Wo das fertige Bild nicht mehr die Figur zeigt, liegt etwas davor. Dort jeder zweite Bildpunkt in heller Farbe (keine Durchsichtigkeit).
function durchscheinen(x,figs,rgb){
 figs.forEach(function(f){var jetzt=x.getImageData(f.x,f.y,f.b.w,f.b.h),a=f.soll.data,d=jetzt.data,geaendert=0;
  for(var yy=0;yy<f.b.h;yy++){var r=f.b.z[yy];for(var xx=0;xx<f.b.w;xx++){if(r[xx]==='.')continue;var o=(yy*f.b.w+xx)*4;
   if(d[o]!==a[o]||d[o+1]!==a[o+1]||d[o+2]!==a[o+2]){if((xx+yy+f.x+f.y)%2===0){d[o]=rgb[0];d[o+1]=rgb[1];d[o+2]=rgb[2];d[o+3]=255;geaendert++}}}}
  if(geaendert)x.putImageData(jetzt,f.x,f.y)});
}
function zeigen(ziel,M){
 var S=AT3_64,B=M.bilder,h='';
 // Prüfer: jedes Musterbild, dazu zwei Gegenproben, die abgelehnt werden müssen
 var fehler=Object.keys(B).map(function(k){var f=S.pruefe(B[k]);return f.length?B[k].name+': '+f.join(', '):''}).filter(Boolean);
 var falsch={kat:'blume',name:'Gegenprobe',w:2,h:1,ax:1,ay:0,z:['0#']}, gross={kat:'figur',name:'Riese',w:16,h:40,ax:8,ay:39,z:Array(40).fill('0'.repeat(16))};
 var gegen=S.pruefe(falsch).length>0&&S.pruefe(gross).length>0;
 h+='<h2>Grafikstandard AT3-64</h2><p>Stil und Maße wie RollerCoaster Tycoon Classic: Feld 64 × 32 · Höhenstufe '+S.HOEHE+' px · Geschoss '+S.GESCHOSS+' px · eine Palette mit 64 Farben in '+S.REIHEN.length+
  ' Farbreihen, dazu „ganz durchsichtig“. Gespeichert werden nur Farbnummern (1 Byte je Bildpunkt, egal wie viele Farben).</p>';
 h+='<p>Prüfer: '+(fehler.length?'<span class="witz">'+fehler.join('; ')+'</span>':'alle '+Object.keys(B).length+' Musterbilder in Ordnung')+
  ' · Gegenproben (fremde Farbe, zu große Figur): '+(gegen?'abgelehnt, wie es sich gehört':'<span class="witz">NICHT abgelehnt</span>')+'.</p>';
 h+='<p class="leise">Skizzen-Qualität. Zwei Figuren stehen absichtlich hinter Wand und Baum: Sie scheinen als helles Punktmuster durch. Bild antippen: größer.</p>';
 ['A','B','C'].forEach(function(k){
  var P=S.PALETTEN[k];
  h+='<div class="palette" data-pal="'+k+'"><h2>'+k+' · '+P.name+'</h2><p class="leise">'+P.text+'</p><div class="farben">';
  S.REIHEN.forEach(function(R,r){h+='<div class="reihe"><span>'+R.name+'</span>';for(var s=0;s<R.n;s++){var n=S.nummer(r,s);h+='<i style="background:'+P.farben[n]+'" title="'+S.ZEICHEN[n]+' '+P.farben[n]+'"></i>'}h+='</div>'});
  h+='</div><div class="blatt" data-blatt="'+k+'"></div><p class="pruef leise" data-pruef="'+k+'"></p></div>';
 });
 h+='<h2>Figurengröße auf der Karte</h2><p>Im Musterblatt stehen Figuren mit 16, 24 und 32 px Höhe (Feld = 64 × 32). Vorschlag: <b>24 px</b>. Groß heißt: mehr Bildpunkte je Gladiator, weniger Platz auf dem Bildschirm.</p>';
 h+='<div class="figuren"></div>';
 h+='<h2>Größentabelle</h2><table class="tabelle"><tr><th>Art</th><th>höchstens</th><th></th></tr>';
 Object.keys(S.GROESSEN).forEach(function(k){var g=S.GROESSEN[k];h+='<tr><td>'+k+'</td><td>'+g.w+' × '+g.h+'</td><td>'+g.text+'</td></tr>'});
 h+='</table><p class="witz">Wähle eine Palette (A, B oder C) und eine Figurengröße und sag es im Chat. Danach ist beides fest, wie ein Gladiator nach dem Urteil.</p>';
 ziel.innerHTML=h;
 ['A','B','C'].forEach(function(k){
  var cv=blatt(B,k);cv.className='pixel';ziel.querySelector('[data-blatt="'+k+'"]').appendChild(cv);ganz(cv,0);
  cv.onclick=function(){ganz(cv,cv._plus?0:1)};cv.title='Antippen: größer/kleiner';
  var d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data,f=S.pruefePunkte(d,k);
  ziel.querySelector('[data-pruef="'+k+'"]').textContent='Prüfer am fertigen Blatt: '+(f.length?f.join(', '):'nur Palettenfarben, nichts halb durchsichtig');
 });
 var fz=ziel.querySelector('.figuren');['figur16','figur24','figur32'].forEach(function(k){var cv=S.zuCanvas(B[k],'A');var w=document.createElement('canvas');w.width=cv.width;w.height=cv.height;
  w.getContext('2d').drawImage(cv,0,0);w.className='pixel';var s=document.createElement('span');s.textContent=B[k].h+' px';var d=document.createElement('div');d.appendChild(w);d.appendChild(s);fz.appendChild(d);ganz(w,0,cv.width*4)});
}
// Ganzzahlig vergrößern: jeder Bildpunkt wird genau k Gerätepunkte breit (sonst wirkt Pixelgrafik krumm und unscharf).
function ganz(cv,plus,ziel){var dpr=window.devicePixelRatio||1,box=cv.parentNode.clientWidth||320,soll=ziel||box;
 var k=Math.max(1,Math.floor(soll*dpr/cv.width))+(plus||0);cv._plus=plus;cv.style.width=(cv.width*k/dpr)+'px';cv.style.height=(cv.height*k/dpr)+'px';
 cv.parentNode.style.overflowX=plus?'auto':'';}
