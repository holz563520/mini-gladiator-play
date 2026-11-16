// WAS DIE DATEI TUT: Startplatz-Wahl von Arena Theory 3.0 (Schritt G4c). Nach „New world“ (oder bei einem Spielstand ohne Kameraort) zeigt sie die Erde;
// Antippen öffnet die vergrößerte Region (30 × 30 Erdzellen) mit Orten und Straßen, dort tippt man den Platz. Nur trockenes Land wird genommen
// (der Bildkern sucht im echten Kartenstück das nächste trockene Feld), die Auskunft nennt Biom und den nächsten Ort mit Namen. „Surprise me“ wählt
// einen zufälligen Platz an Land (Zahl aus crypto, kein Spielzufall). „Start here“ gibt {x, y} zurück; Speichern macht spiel.js.
// Kerne: alles Rechnen im Bildkern (weltkarte.frage → bildkern.js → startplatz.js); hier nur zwei kleine Bilder einmal auf ein Canvas legen und das Kreuz malen.
// W1c Runde Welt: Erdbild 600 × 300; die Region darf über die Naht reichen (rx negativ oder über den rechten Rand, der Bildkern rechnet um); Eis: Absage.
// Englisch (Regel 10), Rattenpergament wie das Startbild (spiel.css #at3Wahl). Wiederverwendet: Aufbau und Stil des Startbilds aus spielstand.js (G3).
(function(){
'use strict';
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
var WF=614400;   // Weltbreite in Feldern (600 Erdzellen)
function zahl(){try{return crypto.getRandomValues(new Uint32Array(1))[0]}catch(e){return(Math.random()*4294967296)>>>0}}

// o = {t, karte, name}. Ergebnis: Promise {x, y, bio, ort}
function zeigen(o){var T=o.t, K=o.karte;
 return new Promise(function(fertig){
  var el=document.createElement('div');el.id='at3Wahl';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');document.body.appendChild(el);
  el.innerHTML='<div class="papier s-box"><h1>'+esc(T('wahl.titel'))+'</h1><p class="unter" id="wUnter"></p>'+
   '<div class="w-bild"><canvas id="wCv" width="600" height="300"></canvas><p class="leise w-laedt" id="wLaedt"></p></div>'+
   '<p id="wInfo" class="w-info" aria-live="polite"></p>'+
   '<div class="s-knoepfe quer"><button class="knopf" id="wLos" disabled></button><button class="knopf klein weg" id="wZufall"></button><button class="knopf klein weg" id="wZurueck" hidden></button></div></div>';
  var cv=el.querySelector('#wCv'),g=cv.getContext('2d'),$=function(id){return el.querySelector('#'+id)};
  $('wLos').textContent=T('wahl.los');$('wZufall').textContent=T('wahl.zufall');$('wZurueck').textContent=T('wahl.zurueck');
  var stufe=0, erde=null, region=null, wahl=null, beschaeftigt=false;
  window.AT3WAHL={stufe:function(){return stufe},wahl:function(){return wahl},region:function(){return region&&{rx:region.rx,ry:region.ry}},tippe:tippe};
  function bildAus(a){var c=document.createElement('canvas');c.width=a.w;c.height=a.h;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(a.buf.buffer),a.w,a.h),0,0);return c}
  function laedt(x){$('wLaedt').textContent=x||'';$('wLaedt').hidden=!x}
  function info(x,schlecht){var e=$('wInfo');e.textContent=x;e.className='w-info'+(schlecht?' schlecht':'')}
  function malen(){var b=stufe?region:erde;if(!b)return;cv.width=b.c.width;cv.height=b.c.height;g.imageSmoothingEnabled=false;g.drawImage(b.c,0,0);
   if(stufe===1&&wahl){var s=region.c.width/(30*1024),dx=(((wahl.x-region.rx*1024)%WF)+WF)%WF,x=Math.round(dx*s),y=Math.round((wahl.y-region.ry*1024)*s);   // Platz in der Lage der Region (über die Naht)
    g.fillStyle='#2a0604';g.fillRect(x-6,y-2,13,5);g.fillRect(x-2,y-6,5,13);g.fillStyle='#f4c8a0';g.fillRect(x-5,y-1,11,3);g.fillRect(x-1,y-5,3,11)}}
  function stufeZeigen(){$('wZurueck').hidden=stufe!==1;$('wUnter').textContent=T(stufe?'wahl.unterRegion':'wahl.unterErde');$('wLos').disabled=!(stufe===1&&wahl);malen()}
  function erdeHolen(){laedt(T('wahl.malt'));return K.frage('erdbild').then(function(a){if(a.fehlt){laedt(T('wahl.fehlt'));return}erde={c:bildAus(a)};laedt('');stufeZeigen()})}
  function regionHolen(zx,zy){beschaeftigt=true;laedt(T('wahl.maltRegion'));
   return K.frage('region',{zx:zx,zy:zy}).then(function(a){beschaeftigt=false;if(a.fehlt){laedt(T('wahl.fehlt'));return}region={c:bildAus(a),rx:a.rx,ry:a.ry,ms:a.us/1000};laedt('');stufe=1;stufeZeigen()})}
  function platzText(p){var b=T('welt.bio.'+p.bio),o=p.ort;
   return o?T('wahl.platz',{b:b,n:o.name,a:T('wahl.art.'+o.art),d:o.weit}):T('wahl.platzLeer',{b:b})}
  function platzNehmen(p){if(!p||!p.ok){wahl=null;info(T(p&&p.eis?'wahl.eis':'wahl.nass'),true);stufeZeigen();return}wahl=p;info(platzText(p)+(p.weit>48?' '+T('wahl.verschoben'):''),false);stufeZeigen()}
  function platzHolen(x,y){beschaeftigt=true;return K.frage('platz',{x:x,y:y}).then(function(a){beschaeftigt=false;if(a.fehlt){info(T('wahl.fehlt'),true);return}platzNehmen(a.platz)})}
  // Antippen: Erde → Region um die Zelle; Region → Platz
  function tippe(fx,fy){if(beschaeftigt)return Promise.resolve();fx=Math.max(0,Math.min(.9999,fx));fy=Math.max(0,Math.min(.9999,fy));
   if(stufe===0){wahl=null;info('');return regionHolen((fx*600)|0,(fy*300)|0)}
   return platzHolen(region.rx*1024+Math.floor(fx*30*1024),region.ry*1024+Math.floor(fy*30*1024))}
  cv.addEventListener('pointerup',function(e){var r=cv.getBoundingClientRect();tippe((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height)});
  $('wZurueck').onclick=function(){stufe=0;wahl=null;info('');stufeZeigen()};
  $('wZufall').onclick=function(){if(beschaeftigt)return;beschaeftigt=true;wahl=null;info('');stufeZeigen();
   K.frage('zufall',{r1:zahl(),r2:zahl()}).then(function(a){beschaeftigt=false;var p=a.platz;if(a.fehlt||!p||!p.ok){info(T('wahl.keinLand'),true);return}
    var rx=(p.x>>10)-15,ry=Math.max(0,Math.min(270,(p.y>>10)-15));
    (region&&region.rx===rx&&region.ry===ry?Promise.resolve():regionHolen(p.x>>10,p.y>>10)).then(function(){stufe=1;platzNehmen(p)})})};
  $('wLos').onclick=function(){if(!wahl)return;var w=wahl;delete window.AT3WAHL;el.remove();fertig({x:w.x,y:w.y,bio:w.bio,ort:w.ort?w.ort.name:''})};
  stufeZeigen();erdeHolen()})}

window.AT3STARTWAHL={zeigen:zeigen};
})();
