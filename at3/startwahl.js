// WAS DIE DATEI TUT: Startplatz-Wahl von Arena Theory 3.0 (Schritt G4c). Nach „New world“ (oder bei einem Spielstand ohne Kameraort) zeigt sie die Erde;
// Antippen öffnet die vergrößerte Region (30 × 30 Erdzellen) mit Orten und Straßen, dort tippt man den Platz. Nur trockenes Land wird genommen
// (der Bildkern sucht im echten Kartenstück das nächste trockene Feld), die Auskunft nennt Biom und den nächsten Ort mit Namen. „Surprise me“ wählt
// einen zufälligen Platz an Land (Zahl aus crypto, kein Spielzufall). „Start here“ gibt {x, y} zurück; Speichern macht spiel.js.
// Kerne: alles Rechnen im Bildkern (weltkarte.frage → bildkern.js → startplatz.js); hier nur zwei kleine Bilder einmal auf ein Canvas legen und das Kreuz malen.
// W1c Runde Welt: Erdbild 600 × 300; die Region darf über die Naht reichen (rx negativ oder über den rechten Rand, der Bildkern rechnet um); Eis: Absage.
// G4d: Statt der flachen Erde ein drehbarer Globus (Norden oben, gerechnet im Bildkern wie in der Kartenansicht): Wischen dreht, Antippen öffnet die Region an der Stelle.
// Englisch (Regel 10), Rattenpergament wie das Startbild (spiel.css #at3Wahl). Wiederverwendet: Aufbau und Stil des Startbilds aus spielstand.js (G3).
(function(){
'use strict';
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
var WF=614400, GB=320, GR=150;   // Weltbreite in Feldern (600 Erdzellen); Globus: Bildgröße und Halbmesser in Bildpunkten
function zahl(){try{return crypto.getRandomValues(new Uint32Array(1))[0]}catch(e){return(Math.random()*4294967296)>>>0}}

// o = {t, karte, name}. Ergebnis: Promise {x, y, bio, ort}
function zeigen(o){var T=o.t, K=o.karte;
 return new Promise(function(fertig){
  var el=document.createElement('div');el.id='at3Wahl';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');document.body.appendChild(el);
  el.innerHTML='<div class="papier s-box"><h1>'+esc(T('wahl.titel'))+'</h1><p class="unter" id="wUnter"></p>'+
   '<div class="w-bild"><canvas id="wCv" width="320" height="320"></canvas><p class="leise w-laedt" id="wLaedt"></p></div>'+
   '<p id="wInfo" class="w-info" aria-live="polite"></p>'+
   '<div class="s-knoepfe quer"><button class="knopf" id="wLos" disabled></button><button class="knopf klein weg" id="wZufall"></button><button class="knopf klein weg" id="wZurueck" hidden></button></div></div>';
  var cv=el.querySelector('#wCv'),g=cv.getContext('2d'),$=function(id){return el.querySelector('#'+id)};
  $('wLos').textContent=T('wahl.los');$('wZufall').textContent=T('wahl.zufall');$('wZurueck').textContent=T('wahl.zurueck');
  var stufe=0, erde=null, region=null, wahl=null, beschaeftigt=false, lon=Math.PI, lat=.3, gKey='', gOffen=false;
  window.AT3WAHL={richte:function(a,b){lon=a;lat=b;return erdeHolen()},globus:function(){return{lon:lon,lat:lat,fertig:gKey===lon+','+lat}},dreh:function(dx,dy){drehen(dx,dy)},stufe:function(){return stufe},wahl:function(){return wahl},region:function(){return region&&{rx:region.rx,ry:region.ry}},tippe:tippe};
  function bildAus(a){var c=document.createElement('canvas');c.width=a.w;c.height=a.h;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(a.buf.buffer),a.w,a.h),0,0);return c}
  function laedt(x){$('wLaedt').textContent=x||'';$('wLaedt').hidden=!x}
  function info(x,schlecht){var e=$('wInfo');e.textContent=x;e.className='w-info'+(schlecht?' schlecht':'')}
  function malen(){var b=stufe?region:erde;cv.style.touchAction=stufe?'manipulation':'none';if(!b)return;cv.width=b.c.width;cv.height=b.c.height;g.imageSmoothingEnabled=false;g.drawImage(b.c,0,0);
   if(stufe===1&&wahl){var s=region.c.width/(30*1024),dx=(((wahl.x-region.rx*1024)%WF)+WF)%WF,x=Math.round(dx*s),y=Math.round((wahl.y-region.ry*1024)*s);   // Platz in der Lage der Region (über die Naht)
    g.fillStyle='#2a0604';g.fillRect(x-6,y-2,13,5);g.fillRect(x-2,y-6,5,13);g.fillStyle='#f4c8a0';g.fillRect(x-5,y-1,11,3);g.fillRect(x-1,y-5,3,11)}}
  function stufeZeigen(){$('wZurueck').hidden=stufe!==1;$('wUnter').textContent=T(stufe?'wahl.unterRegion':'wahl.unterErde');$('wLos').disabled=!(stufe===1&&wahl);malen()}
  // Globus: immer nur ein Bild in Arbeit; was beim Drehen dazwischenkommt, holt das nächste Bild nach
  function erdeHolen(){if(gOffen)return Promise.resolve();var k=lon+','+lat;if(k===gKey)return Promise.resolve();gOffen=true;if(!erde)laedt(T('wahl.malt'));
   return K.frage('globus',{W:GB,H:GB,R:GR,lon:lon,lat:lat,s:1}).then(function(a){gOffen=false;if(a.fehlt){laedt(T('wahl.fehlt'));return}erde={c:bildAus(a)};gKey=k;laedt('');if(stufe===0)malen();if(lon+','+lat!==gKey)erdeHolen()})}
  function drehen(dx,dy){lon=((lon-dx/GR)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);lat=Math.max(-1.35,Math.min(1.35,lat+dy/GR));erdeHolen()}
  function aufGlobus(fx,fy){var x=(fx*GB-GB/2)/GR,y=-(fy*GB-GB/2)/GR,q=x*x+y*y;if(q>=1)return null;var z=Math.sqrt(1-q),cl=Math.cos(lat),sl=Math.sin(lat),la=Math.asin(y*cl+z*sl),lo=lon+Math.atan2(x,z*cl-y*sl);
   return{zx:Math.floor((((lo/(2*Math.PI))%1+1)%1)*600)%600,zy:Math.max(0,Math.min(299,Math.floor((.5-la/Math.PI)*300)))}}
  function regionHolen(zx,zy){beschaeftigt=true;laedt(T('wahl.maltRegion'));
   return K.frage('region',{zx:zx,zy:zy}).then(function(a){beschaeftigt=false;if(a.fehlt){laedt(T('wahl.fehlt'));return}region={c:bildAus(a),rx:a.rx,ry:a.ry,ms:a.us/1000};laedt('');stufe=1;stufeZeigen()})}
  function platzText(p){var b=T('welt.bio.'+p.bio),o=p.ort;
   return o?T('wahl.platz',{b:b,n:o.name,a:T('wahl.art.'+o.art),d:o.weit}):T('wahl.platzLeer',{b:b})}
  function platzNehmen(p){if(!p||!p.ok){wahl=null;info(T(p&&p.eis?'wahl.eis':'wahl.nass'),true);stufeZeigen();return}wahl=p;info(platzText(p)+(p.weit>48?' '+T('wahl.verschoben'):''),false);stufeZeigen()}
  function platzHolen(x,y){beschaeftigt=true;return K.frage('platz',{x:x,y:y}).then(function(a){beschaeftigt=false;if(a.fehlt){info(T('wahl.fehlt'),true);return}platzNehmen(a.platz)})}
  // Antippen: Erde → Region um die Zelle; Region → Platz
  function tippe(fx,fy){if(beschaeftigt)return Promise.resolve();fx=Math.max(0,Math.min(.9999,fx));fy=Math.max(0,Math.min(.9999,fy));
   if(stufe===0){wahl=null;info('');var z=aufGlobus(fx,fy);if(!z)return Promise.resolve();return regionHolen(z.zx,z.zy)}
   return platzHolen(region.rx*1024+Math.floor(fx*30*1024),region.ry*1024+Math.floor(fy*30*1024))}
  var zug=null;   // Wischen auf dem Globus dreht ihn; kurzes Antippen wählt
  cv.addEventListener('pointerdown',function(e){zug={x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,weit:false};try{cv.setPointerCapture(e.pointerId)}catch(x){}});
  cv.addEventListener('pointermove',function(e){if(!zug||stufe!==0)return;if(!zug.weit&&Math.abs(e.clientX-zug.x0)+Math.abs(e.clientY-zug.y0)<8)return;zug.weit=true;
   var r=cv.getBoundingClientRect(),f=GB/(r.width||1);drehen((e.clientX-zug.x)*f,(e.clientY-zug.y)*f);zug.x=e.clientX;zug.y=e.clientY});
  cv.addEventListener('pointerup',function(e){var w=zug&&zug.weit;zug=null;if(w)return;var r=cv.getBoundingClientRect();tippe((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height)});
  cv.addEventListener('pointercancel',function(){zug=null});
  $('wZurueck').onclick=function(){stufe=0;wahl=null;info('');stufeZeigen()};
  $('wZufall').onclick=function(){if(beschaeftigt)return;beschaeftigt=true;wahl=null;info('');stufeZeigen();
   K.frage('zufall',{r1:zahl(),r2:zahl()}).then(function(a){beschaeftigt=false;var p=a.platz;if(a.fehlt||!p||!p.ok){info(T('wahl.keinLand'),true);return}
    var rx=(p.x>>10)-15,ry=Math.max(0,Math.min(270,(p.y>>10)-15));
    (region&&region.rx===rx&&region.ry===ry?Promise.resolve():regionHolen(p.x>>10,p.y>>10)).then(function(){stufe=1;platzNehmen(p)})})};
  $('wLos').onclick=function(){if(!wahl)return;var w=wahl;delete window.AT3WAHL;el.remove();fertig({x:w.x,y:w.y,bio:w.bio,ort:w.ort?w.ort.name:''})};
  stufeZeigen();erdeHolen()})}

window.AT3STARTWAHL={zeigen:zeigen};
})();
