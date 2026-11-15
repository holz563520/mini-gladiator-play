// WAS DIE DATEI TUT: Menü „Grafik“ des AT3-Master-Editors (wird erst beim Öffnen geladen). M2: Grafikstandard AT3-32 mit drei Paletten am selben
// Musterblatt, Figurengrößen, Größentabelle und Prüfer. at3-32.js und das Musterblatt werden erst beim Antippen von „Grafikstandard“ geholt.
AT3ED.menue('grafik',function(el,c){
 var n=c.kartei&&c.kartei.objekte?c.kartei.objekte.length:0;
 el.innerHTML='<p>Hier entsteht jede Grafik, die ins Spiel darf. Am Editor vorbei kommt nichts hinein, nicht einmal eine Ratte.</p>'+
  '<p class="leise">Objekte in der Kartei: '+n+'.</p>'+
  '<p><button class="knopf" id="gStd">Grafikstandard AT3-32 und Musterblatt<small>Paletten A, B, C · Figurengröße · Prüfer</small></button></p>'+
  '<div id="gStdInhalt"></div>'+
  '<ul><li>Skizzen zeichnen, Objektkartei, Export <span class="leise">(M3)</span></li>'+
  '<li>Boden, Natur, Gebäude und Wände, Einrichtung, Waren, Figuren, Tiere, Fahrzeuge, Zeichen <span class="leise">(Startset M9, danach jeder Inhaltsschritt)</span></li></ul>';
 el.querySelector('#gStd').onclick=function(){standard(el.querySelector('#gStdInhalt'))};
});
function standard(ziel){
 ziel.innerHTML='<p class="leise">Pinsel werden gewaschen …</p>';
 Promise.all([AT3ED.lade('grafik','at3-32.js'),AT3ED.lade('grafik','standard/musterblatt.json')]).then(function(r){zeigen(ziel,r[1])})
  .catch(function(e){ziel.innerHTML='<p class="witz">Konnte den Standard nicht laden: '+e.message+'</p>'});
}
// Musterblatt: 4 × 4 Felder, Wand an der hinteren Kante, Baum, Blumen, drei Figurengrößen. Gezeichnet nur durch Kopieren fertiger Bilder auf ganze Bildpunkte.
function blatt(B,pal){
 var S=AT3_32,W=256,H=232,ox=96,oy=96,c=document.createElement('canvas');c.width=W;c.height=H;var x=c.getContext('2d');x.imageSmoothingEnabled=false;
 var feld=function(i,j){return{x:(i-j)*32+ox,y:(i+j)*16+oy}};
 var dinge=[];
 for(var i=0;i<4;i++)for(var j=0;j<4;j++){var f=feld(i,j);x.drawImage(S.zuCanvas(i===1&&j===2||i===2&&j===2?B.erde:B.gras,pal),f.x,f.y)}
 [0,1,2].forEach(function(j){dinge.push({t:j-.5,b:B.wand,f:feld(0,j),dx:0,dy:16})});
 var mitte=function(b,i,j,t){dinge.push({t:t==null?i+j:t,b:b,f:feld(i,j),dx:32,dy:16})};
 mitte(B.baum,2,0);mitte(B.blume,3,0);mitte(B.blume,0,3);mitte(B.blume,3,1);
 mitte(B.figur16,1,1);mitte(B.figur24,2,1);mitte(B.figur32,3,2);mitte(B.figur24,1,2);
 dinge.sort(function(a,b){return a.t-b.t});
 dinge.forEach(function(d){x.drawImage(S.zuCanvas(d.b,pal),d.f.x+d.dx-d.b.ax,d.f.y+d.dy-d.b.ay)});
 return c;
}
function zeigen(ziel,M){
 var S=AT3_32,B=M.bilder,h='';
 // Prüfer: jedes Musterbild, dazu zwei Gegenproben, die abgelehnt werden müssen
 var fehler=Object.keys(B).map(function(k){var f=S.pruefe(B[k]);return f.length?B[k].name+': '+f.join(', '):''}).filter(Boolean);
 var falsch={kat:'blume',name:'Gegenprobe',w:2,h:1,ax:1,ay:0,z:['0X']}, gross={kat:'figur',name:'Riese',w:16,h:40,ax:8,ay:39,z:Array(40).fill('0'.repeat(16))};
 var gegen=S.pruefe(falsch).length>0&&S.pruefe(gross).length>0;
 h+='<h2>Grafikstandard AT3-32</h2><p>Feld 64 × 32 wie RollerCoaster Tycoon Classic · Höhenstufe '+S.HOEHE+' px · Geschoss '+S.GESCHOSS+' px · eine Palette mit 32 Farben in 8 Reihen à 4 Stufen, dazu „ganz durchsichtig“. Gespeichert werden nur Farbnummern.</p>';
 h+='<p>Prüfer: '+(fehler.length?'<span class="witz">'+fehler.join('; ')+'</span>':'alle '+Object.keys(B).length+' Musterbilder in Ordnung')+
  ' · Gegenproben (fremde Farbe, zu große Figur): '+(gegen?'abgelehnt, wie es sich gehört':'<span class="witz">NICHT abgelehnt</span>')+'.</p>';
 ['A','B','C'].forEach(function(k){
  var P=S.PALETTEN[k];
  h+='<div class="palette" data-pal="'+k+'"><h2>'+k+' · '+P.name+'</h2><p class="leise">'+P.text+'</p><div class="farben">';
  for(var r=0;r<8;r++){h+='<div class="reihe"><span>'+S.REIHEN[r]+'</span>';for(var s=0;s<4;s++)h+='<i style="background:'+P.farben[r*4+s]+'" title="'+S.ZEICHEN[r*4+s]+' '+P.farben[r*4+s]+'"></i>';h+='</div>'}
  h+='</div><div class="blatt" data-blatt="'+k+'"></div><p class="pruef leise" data-pruef="'+k+'"></p></div>';
 });
 h+='<h2>Figurengröße auf der Karte</h2><p>Im Musterblatt stehen Figuren mit 16, 24 und 32 px Höhe (Feld = 64 × 32). Vorschlag: <b>24 px</b>. RollerCoaster Tycoon nutzt eher kleine Figuren, groß heißt: mehr Bildpunkte je Gladiator, weniger Platz auf dem Bildschirm.</p>';
 h+='<div class="figuren"></div>';
 h+='<h2>Größentabelle</h2><table class="tabelle"><tr><th>Art</th><th>höchstens</th><th></th></tr>';
 Object.keys(S.GROESSEN).forEach(function(k){var g=S.GROESSEN[k];h+='<tr><td>'+k+'</td><td>'+g.w+' × '+g.h+'</td><td>'+g.text+'</td></tr>'});
 h+='</table><p class="witz">Wähle eine Palette (A, B oder C) und eine Figurengröße und sag es im Chat. Danach ist beides fest, wie ein Gladiator nach dem Urteil.</p>';
 ziel.innerHTML=h;
 ['A','B','C'].forEach(function(k){
  var cv=blatt(B,k);cv.className='pixel';ziel.querySelector('[data-blatt="'+k+'"]').appendChild(cv);
  var d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data,f=S.pruefePunkte(d,k);
  ziel.querySelector('[data-pruef="'+k+'"]').textContent='Prüfer am fertigen Blatt: '+(f.length?f.join(', '):'nur Palettenfarben, nichts halb durchsichtig');
 });
 var fz=ziel.querySelector('.figuren');['figur16','figur24','figur32'].forEach(function(k){var cv=S.zuCanvas(B[k],'A');var w=document.createElement('canvas');w.width=cv.width;w.height=cv.height;
  w.getContext('2d').drawImage(cv,0,0);w.className='pixel';w.style.width=cv.width*4+'px';w.style.height=cv.height*4+'px';var s=document.createElement('span');s.textContent=B[k].h+' px';var d=document.createElement('div');d.appendChild(w);d.appendChild(s);fz.appendChild(d)});
}
