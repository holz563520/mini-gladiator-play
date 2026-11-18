// WAS DIE DATEI TUT: Musterblatt „Figuren wie 2.0“ im Menü Grafik des AT3-Master-Editors (Schritt F1a, Thomas 18.11.2026). Zeigt die Kartenfiguren aus 2.0
// (einfache 1.0-Figur je Gladiator, im Kampfkern gezeichnet, figurbild.js) in beiden Fassungen nebeneinander: „voll“ wie 2.0 und „AT3-64“ (Palette A).
// Posen: Gehen, Stehen, Tragen, Arbeiten. Gruppen: Gladiatoren vom Sklavenmarkt (wie 1.0 gewürfelt) und die 60 Besuchertypen aus 2.0.
// Messen: Zeichenzeit im Kern je Figur, Blattgröße, Farben, und auf dem Hauptkern das Zeichnen vieler laufender Figuren je Fassung (p95 je Bild).
// Ins Spiel kommt hier nichts; die Wahl trifft Thomas am Handy (F1b baut die gewählte Fassung ein).
var AT3_FIGUREN=(function(){
'use strict';
var S=window.AT3_64,KA=window.AT3Kampf,V=((document.currentScript&&document.currentScript.src||'').match(/[?&]v=([^&]*)/)||[])[1]||'',E={};
var kb=function(b){return (b/1024).toFixed(1).replace('.',',')+' KB'};
var esc=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')};
var POSE_DE={gehen:'Gehen',stehen:'Stehen',tragen:'Tragen',arbeiten:'Arbeiten'};
function leinwand(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c}
// Blatt in zwei Leinwände: voll (RGBA wie 2.0) und AT3-64 (Paletten-Nummern → Palettenfarbe, ganz deckend oder leer)
function blaetter(r,f){var a=leinwand(f.w,f.h),b=leinwand(f.w,f.h),ia=new ImageData(new Uint8ClampedArray(f.voll),f.w,f.h),ib=new ImageData(f.w,f.h),farben=S.PALETTEN[r.palette].farben,rgb=farben.map(S.farbe),genutzt={};
 for(var i=0;i<f.p64.length;i++){var n=f.p64[i];if(n===255)continue;genutzt[n]=1;var c=rgb[n],o=i*4;ib.data[o]=c[0];ib.data[o+1]=c[1];ib.data[o+2]=c[2];ib.data[o+3]=255}
 a.getContext('2d').putImageData(ia,0,0);b.getContext('2d').putImageData(ib,0,0);f.cv={voll:a,p64:b};f.farben64=Object.keys(genutzt).length;
 var d=ia.data,fv={};for(var j=0;j<d.length;j+=4)if(d[j+3]===255)fv[(d[j]<<16)|(d[j+1]<<8)|d[j+2]]=1;f.farbenVoll=Object.keys(fv).length}
function grasFeld(){if(E.gras)return E.gras;var c=leinwand(64,32),x=c.getContext('2d'),f=S.PALETTEN[E.r.palette].farben,g1=f[S.naechste(104,138,68,E.r.palette)],g2=f[S.naechste(86,118,56,E.r.palette)];
 x.fillStyle=g1;x.beginPath();x.moveTo(32,0);x.lineTo(64,16);x.lineTo(32,32);x.lineTo(0,16);x.closePath();x.fill();x.fillStyle=g2;for(var i=0;i<26;i++){var px=8+((i*37)%48),py=6+((i*23)%20);if(Math.abs(px-32)/32+Math.abs(py-16)/16<.9)x.fillRect(px,py,1,1)}
 return E.gras=c}
// Vorschau einer Figur: je Fassung eine Zeile je Pose, alle Bilder nebeneinander (×3) und ein laufendes Bild auf einem Kartenfeld (×3)
function vorschau(z){var f=E.wahl,r=E.r;if(!f)return;var Z=3,h='<div class="f1Kopf"><b>'+esc(f.name)+'</b> · '+(f.art==='besucher'?esc(f.stand):'Gladiator')+' · '+f.groesse+' cm'+
  ' <span class="leise">Kern '+f.ms.toFixed(1)+' ms · Farben voll '+f.farbenVoll+', AT3-64 '+f.farben64+'</span></div><div class="f1Spalten">';
 ['voll','p64'].forEach(function(k){h+='<div class="f1Spalte"><h4>'+(k==='voll'?'Volle Farben (wie 2.0)':'AT3-64 (Palette A)')+'</h4>';
  r.posen.forEach(function(p){h+='<div class="f1Pose"><span>'+POSE_DE[p.id]+'</span><canvas data-k="'+k+'" data-p="'+p.id+'"></canvas></div>'});
  h+='<div class="f1Lauf"><canvas data-lauf="'+k+'" width="'+(64*Z)+'" height="'+(48*Z)+'"></canvas></div></div>'});
 z.innerHTML=h+'</div>';
 [].forEach.call(z.querySelectorAll('canvas[data-p]'),function(cv){var k=cv.dataset.k,p=r.posen.filter(function(x){return x.id===cv.dataset.p})[0],w=p.n*r.fw,q=f.cv[k];
  cv.width=(w+r.fw)*Z;cv.height=r.fh*2*Z;var x=cv.getContext('2d');x.imageSmoothingEnabled=false;x.fillStyle='#e9dcbc';x.fillRect(0,0,cv.width,cv.height);
  for(var d=0;d<2;d++)x.drawImage(q,p.ab*r.fw,d*r.fh,w,r.fh,0,d*r.fh*Z,w*Z,r.fh*Z);cv.style.width=Math.round(cv.width/2)+'px'});
 E.lauf=[].map.call(z.querySelectorAll('canvas[data-lauf]'),function(cv){cv.style.width=Math.round(cv.width/2)+'px';return {cv:cv,k:cv.dataset.lauf}})}
var POSE_LAUF=['gehen','tragen','arbeiten','stehen'];
function laufBild(t){if(!E.lauf||!E.wahl||!document.body.contains(E.lauf[0].cv)){E.lauft=false;return}var r=E.r,f=E.wahl,Z=3,gras=grasFeld(),pi=Math.floor(t/3000)%4,p=r.posen.filter(function(x){return x.id===POSE_LAUF[pi]})[0],
  bild=p.ab+Math.floor(t/(p.id==='arbeiten'?140:110))%p.n,dir=Math.floor(t/6000)%2;
 E.lauf.forEach(function(L){var x=L.cv.getContext('2d');x.imageSmoothingEnabled=false;x.fillStyle='#e9dcbc';x.fillRect(0,0,L.cv.width,L.cv.height);x.drawImage(gras,0,16*Z,64*Z,32*Z);
  x.drawImage(f.cv[L.k],bild*r.fw,dir*r.fh,r.fw,r.fh,(32-r.ax)*Z,(32-r.ay)*Z,r.fw*Z,r.fh*Z);x.fillStyle='#3b2a1a';x.font=(10*Z/2|0)+'px sans-serif';x.fillText(POSE_DE[p.id],4,12)});
 requestAnimationFrame(laufBild)}
function liste(z){var r=E.r,h='';[['gladiator','Gladiatoren vom Sklavenmarkt (wie 1.0 gewürfelt)'],['besucher','Besucher: 60 Typen aus 2.0']].forEach(function(gr){
  h+='<h4>'+gr[1]+'</h4><div class="f1Liste">';r.figuren.forEach(function(f,i){if(f.art!==gr[0])return;h+='<button class="f1Kn'+(f===E.wahl?' an':'')+'" data-i="'+i+'" title="'+esc(f.name+(f.stand?' · '+f.stand:''))+'"><canvas width="'+(r.fw*2)+'" height="'+(r.fh*2)+'"></canvas></button>'});h+='</div>'});
 z.innerHTML=h;[].forEach.call(z.querySelectorAll('.f1Kn'),function(b){var f=r.figuren[+b.dataset.i],x=b.firstChild.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(f.cv[E.fass],8*r.fw,0,r.fw,r.fh,0,0,r.fw*2,r.fh*2);
  b.onclick=function(){E.wahl=f;liste(z);vorschau(E.el.querySelector('#f1Vor'))}})}
// Gewimmel messen: viele laufende Figuren auf dem Hauptkern zeichnen (drawImage aus dem Blatt, wie das Spiel es täte), je Fassung; p95 der Bildzeit
function gewimmel(n,k,fertig){var r=E.r,cv=E.el.querySelector('#f1Gew'),x=cv.getContext('2d'),W=cv.width,H=cv.height,L=[],zeiten=[],bild=0,gras=grasFeld();
 for(var i=0;i<n;i++){var f=r.figuren[i%r.figuren.length],a=Math.random()*Math.PI*2;L.push({f:f,x:Math.random()*W,y:20+Math.random()*(H-20),vx:Math.cos(a)*.6,vy:Math.sin(a)*.3,p:i%3===0?'tragen':i%7===0?'arbeiten':'gehen',w:Math.random()*99})}
 var P={};r.posen.forEach(function(p){P[p.id]=p});
 function schritt(){var t0=performance.now();x.imageSmoothingEnabled=false;x.fillStyle='#e9dcbc';x.fillRect(0,0,W,H);for(var gy=-16;gy<H;gy+=32)for(var gx=-32;gx<W;gx+=64){x.drawImage(gras,gx+((gy/32)&1?32:0),gy)}
  L.sort(function(a,b){return a.y-b.y});
  for(var i=0;i<L.length;i++){var e=L[i],p=P[e.p];if(e.p!=='arbeiten'){e.x+=e.vx;e.y+=e.vy;if(e.x<0||e.x>W)e.vx=-e.vx;if(e.y<20||e.y>H)e.vy=-e.vy;e.w+=.25}else e.w+=.12;
   var fb=p.ab+(Math.floor(e.w)%p.n),dir=e.vx<0?1:0;x.drawImage(e.f.cv[k],fb*r.fw,dir*r.fh,r.fw,r.fh,Math.round(e.x-r.ax),Math.round(e.y-r.ay),r.fw,r.fh)}
  zeiten.push(performance.now()-t0);if(++bild<120)requestAnimationFrame(schritt);else{zeiten.sort(function(a,b){return a-b});fertig({p50:zeiten[60],p95:zeiten[Math.floor(zeiten.length*.95)]})}}
 requestAnimationFrame(schritt)}
function messen(){var z=E.el.querySelector('#f1Mess'),n=+E.el.querySelector('#f1Zahl').value||500,aus={};z.innerHTML='<p class="leise">Die Menge drängelt …</p>';
 gewimmel(n,'voll',function(a){aus.voll=a;gewimmel(n,'p64',function(b){aus.p64=b;E.messung={n:n,voll:aus.voll,p64:aus.p64};
  z.innerHTML='<table class="tab"><tr><th>'+n+' laufende Figuren</th><th>p50 je Bild</th><th>p95 je Bild</th></tr>'+['voll','p64'].map(function(k){return '<tr><td>'+(k==='voll'?'Volle Farben':'AT3-64')+'</td><td>'+aus[k].p50.toFixed(2)+' ms</td><td>'+aus[k].p95.toFixed(2)+' ms</td></tr>'}).join('')+
   '</table><p class="leise">Gemessen auf diesem Gerät, Hauptkern, nur Zeichnen. Für das Handy mit gedrosselter CPU messen oder direkt am Handy öffnen.</p>'})})}
function zeigen(){var r=E.r,el=E.el,sum=0,b=r.fw*r.n*r.fh*2;r.figuren.forEach(function(f){blaetter(r,f);sum+=f.ms});
 var bis=E.bisher?'<canvas id="f1Bisher" title="bisher: figur-arbeiter"></canvas>':'';
 el.querySelector('#f1Inhalt').innerHTML='<p>'+bis+' Bisher sehen alle Arbeiter gleich aus (Bild figur-arbeiter, 9 × 21). Jetzt bekommt jede Person ihr eigenes Aussehen aus ihren 1.0-Daten, wie in 2.0 (einfache Figur, '+r.fw+' × '+r.fh+').</p>'+
  '<table class="tab"><tr><th>Figuren</th><th>Bilder je Figur</th><th>Kern je Figur</th><th>Blatt je Figur</th><th>Farben gesamt (Paletten-Nr.)</th></tr><tr><td>'+r.figuren.length+'</td><td>'+r.n+' × 2 Richtungen</td><td>'+(sum/Math.max(1,r.figuren.length)).toFixed(1)+' ms</td><td>'+(r.fw*r.n)+' × '+(r.fh*2)+' · AT3-64 '+kb(b)+', voll '+kb(b*4)+'</td><td>'+r.farben+' Töne → '+r.palette+'</td></tr></table>'+
  '<p>Liste zeigt: <label><input type="radio" name="f1F" value="voll"'+(E.fass==='voll'?' checked':'')+'> volle Farben</label> <label><input type="radio" name="f1F" value="p64"'+(E.fass==='p64'?' checked':'')+'> AT3-64</label> · <button class="knopf klein" id="f1Neu">Neu würfeln</button></p>'+
  '<div id="f1Liste"></div><div id="f1Vor"></div>'+
  '<h4>Gewimmel</h4><p><select id="f1Zahl"><option>100</option><option selected>500</option><option>1000</option><option>2000</option></select> <button class="knopf klein" id="f1Mess">Messen (beide Fassungen)</button></p>'+
  '<canvas id="f1Gew" width="400" height="260"></canvas><div id="f1Mess"></div>'+
  '<p class="leise">Schatten: voll wie 2.0 (halbdurchsichtig unter den Füßen); in AT3-64 entfällt er, weil der Standard nur „ganz durchsichtig“ kennt. Arbeiten = Schlag von oben mit Axt (1.0-Hieb), Tragen = Holzbündel auf der Schulter.</p>'+
  '<p class="witz">Deine Wahl, Lanista: Farbe oder Ordnung. Die Leute sterben in beiden gleich hübsch.</p>';
 if(E.bisher){var cv=el.querySelector('#f1Bisher'),q=S.zuCanvas(E.bisher.bild,r.palette);cv.width=q.width*2;cv.height=q.height*2;var x=cv.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(q,0,0,cv.width,cv.height);cv.style.verticalAlign='middle'}
 E.wahl=E.wahl&&r.figuren.indexOf(E.wahl)>=0?E.wahl:r.figuren[0];liste(el.querySelector('#f1Liste'));vorschau(el.querySelector('#f1Vor'));
 [].forEach.call(el.querySelectorAll('input[name="f1F"]'),function(i){i.onchange=function(){E.fass=i.value;liste(el.querySelector('#f1Liste'))}});
 el.querySelector('#f1Neu').onclick=function(){E.seed=(Math.random()*1e9)>>>0;E.wahl=null;holen()};el.querySelector('#f1Mess').onclick=messen;
 if(!E.lauft){E.lauft=true;requestAnimationFrame(laufBild)}}
function holen(){var z=E.el.querySelector('#f1Inhalt');z.innerHTML='<p class="leise">Der Sklavenhändler treibt Ware herbei, das Dorf schickt Gaffer …</p>';
 var t=performance.now();return KA.figuren({seed:E.seed,n:8,besucher:true,palette:S.PALETTE},'',V).then(function(r){r.gesamtMs=performance.now()-t;E.r=r;E.gras=null;zeigen();return r},
  function(e){z.innerHTML='<p class="witz">Die Figuren sind weggelaufen: '+esc(e.message)+'</p>'})}
function aufbauen(el){E.el=el;E.seed=E.seed||20261118;E.fass=E.fass||'p64';
 el.innerHTML='<style>.f1Liste{display:flex;flex-wrap:wrap;gap:3px}.f1Kn{padding:2px;background:#e9dcbc;border:1px solid #a08a5a}.f1Kn.an{outline:2px solid #7a2b1a}.f1Kn canvas{display:block;image-rendering:pixelated}'+
  '.f1Spalten{display:flex;flex-wrap:wrap;gap:12px}.f1Spalte{flex:1 1 300px;min-width:0}.f1Pose{display:flex;align-items:center;gap:6px;margin:2px 0}.f1Pose span{width:62px;font-size:12px}.f1Pose canvas,.f1Lauf canvas,#f1Gew{image-rendering:pixelated;max-width:100%}'+
  '#f1Gew{width:100%;border:1px solid #a08a5a}.f1Kopf{margin:8px 0 4px}</style><div id="f1Inhalt"></div>';
 if(!E.bisher)AT3ED.lade('grafik','kartei/obj/figur-arbeiter.json').then(function(o){E.bisher=o;if(E.r)zeigen()},function(){});
 return holen()}
return {aufbauen:aufbauen,E:E};
})();
