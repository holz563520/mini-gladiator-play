// WAS DIE DATEI TUT: Kern des AT3-Master-Editors (Schritt M1). Menüliste, Nachladen eines Menüs erst beim Öffnen, leere Objektkartei zählen,
// eigene Startlast messen und anzeigen (Dateien, Bytes, Zeit, Fremddateien aus 1.0/2.0). Bedienung deutsch. Lädt nichts außerhalb von at3/.
(function(){
'use strict';
var V='67fb899d', T0=performance.now();
// Reihenfolge und Inhalt nach AT3_PLAN 9.2. „kommt“ = Schritt, mit dem der Inhalt kommt.
var MENUES=[
 {id:'grafik',  name:'Grafik',          kurz:'Boden, Natur, Gebäude, Figuren …', kommt:'M2, M3, M9'},
 {id:'ansichten',name:'Ansichten',      kurz:'Karte und First Person',            kommt:'M5, M7'},
 {id:'pruefen', name:'Prüfen & Kosten', kurz:'Prüfer, Lastszene, Übernahme',      kommt:'M6, MK1'},
 {id:'welt',    name:'Welt & Bau',      kurz:'Gelände, Bauvorschau, Kollision',   kommt:'G4, G5'},
 {id:'taetigkeiten',name:'Tätigkeiten', kurz:'Arbeit, Fähigkeiten, Training',   kommt:'G8 (Regel 19)'},
 {id:'kampf',   name:'Kampf',           kurz:'Kampfmechanik und alte Labore',     kommt:'M8, G9'},
 {id:'ton',     name:'Ton & Sprache',   kurz:'Voice Lab English, Geräusche',      kommt:'M8, V1'},
 {id:'alt',     name:'Altbestand',      kurz:'Figurenlabore, Galerien, Tests',    kommt:'M8'}
];
var geladen={}, laedt={}, offen=null, menueLast={}, dateien={};
var $=function(id){return document.getElementById(id)};
var basis=location.pathname.replace(/[^/]*$/,'');           // …/at3/

function bytes(n){return n<1024?n+' B':(n/1024).toFixed(1).replace('.',',')+' KB'}
function ressourcen(){
 var n=performance.getEntriesByType('navigation')[0], r=performance.getEntriesByType('resource'), L=[];
 if(n)L.push({url:location.href,b:n.encodedBodySize||0,d:n.decodedBodySize||0});
 r.forEach(function(e){L.push({url:e.name,b:e.encodedBodySize||0,d:e.decodedBodySize||0})});
 return L;
}
function fremd(u){try{var p=new URL(u,location.href);return p.origin!==location.origin||p.pathname.indexOf(basis)!==0}catch(e){return true}}
function summe(L){var s={n:L.length,b:0,d:0,fremd:[]};L.forEach(function(e){s.b+=e.b;s.d+=e.d;if(fremd(e.url))s.fremd.push(e.url)});return s}

var start=null;
function lastZeigen(){
 if(!start)return;
 var s=start, h='<b>Startlast:</b> '+s.n+' Dateien · '+bytes(s.b)+' übertragen ('+bytes(s.d)+' entpackt) · bereit nach '+Math.round(s.ms)+' ms · '+
  '<span class="'+(s.fremd.length?'schlecht':'gut')+'">Fremddateien: '+s.fremd.length+'</span>';
 var m=Object.keys(menueLast);
 if(m.length)h+='<br><b>Nachgeladen:</b> '+m.map(function(id){var x=menueLast[id];return name(id)+' '+x.n+' Datei'+(x.n===1?'':'en')+', '+bytes(x.b)+', '+Math.round(x.ms)+' ms'}).join(' · ');
 $('last').innerHTML=h;
}
function name(id){for(var i=0;i<MENUES.length;i++)if(MENUES[i].id===id)return MENUES[i].name;return id}

function knoepfe(){
 var nav=$('menues');
 MENUES.forEach(function(m){
  var b=document.createElement('button');b.className='knopf';b.dataset.menue=m.id;
  b.innerHTML=m.name+'<small>'+m.kurz+'</small>';b.onclick=function(){oeffnen(m.id)};nav.appendChild(b);
 });
}
// Menü erst beim Öffnen laden: menue/<id>.js registriert sich über AT3ED.menue(id, zeichne)
function oeffnen(id){
 var m=MENUES.filter(function(x){return x.id===id})[0];if(!m)return Promise.reject(new Error('Unbekanntes Menü '+id));
 offen=id;$('fTitel').textContent=m.name;$('fenster').hidden=false;
 try{$('fenster').scrollIntoView({block:'nearest'})}catch(e){}
 [].forEach.call(document.querySelectorAll('#menues .knopf'),function(b){b.classList.toggle('an',b.dataset.menue===id)});
 if(geladen[id]){zeichnen(m);return Promise.resolve()}
 $('fInhalt').innerHTML='<p class="leise">Wird geholt … die Ratten tragen es gerade die Treppe hoch.</p>';
 if(!laedt[id])laedt[id]=new Promise(function(ok,nein){
  var vor=performance.getEntriesByType('resource').length, t=performance.now(), s=document.createElement('script');
  s.src='menue/'+id+'.js?v='+V;
  s.onload=function(){
   var neu=performance.getEntriesByType('resource').slice(vor).map(function(e){return{url:e.name,b:e.encodedBodySize||0,d:e.decodedBodySize||0}});
   var x=summe(neu);x.ms=performance.now()-t;menueLast[id]=x;lastZeigen();ok();
  };
  s.onerror=function(){delete laedt[id];nein(new Error('Menü '+id+' nicht geladen'))};
  document.head.appendChild(s);
 });
 return laedt[id].then(function(){if(offen===id)zeichnen(m)},function(e){if(offen===id)$('fInhalt').innerHTML='<p class="witz">Menü nicht gefunden. Vermutlich gefressen. Seite neu laden.</p>';throw e});
}
function zeichnen(m){
 var el=$('fInhalt');el.innerHTML='';
 try{geladen[m.id](el,{menue:m,kartei:kartei})}catch(e){el.innerHTML='<p class="witz">Fehler im Menü: '+String(e.message).replace(/</g,'&lt;')+'</p>'}
}
function schliessen(){offen=null;$('fenster').hidden=true;[].forEach.call(document.querySelectorAll('#menues .knopf'),function(b){b.classList.remove('an')})}

// Objektkartei (in M1 leer). Format: {format:'at3-kartei', version:1, objekte:[]}
var kartei=null;
function karteiLaden(){
 return fetch('kartei/objekte.json?v='+V).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(function(k){
  if(!k||k.format!=='at3-kartei'||!Array.isArray(k.objekte))throw new Error('Format');
  kartei=k;var n=k.objekte.length;
  $('karteiInfo').textContent='Objektkartei: '+n+' Objekt'+(n===1?'':'e')+(n?'':' – leer wie eine Arena nach der Pest.');
 }).catch(function(){$('karteiInfo').textContent='Objektkartei nicht lesbar.'});
}

window.AT3ED={
 MENUES:MENUES,
 menue:function(id,fn){geladen[id]=fn},
 // Weitere Datei für ein Menü nachladen (Skript oder JSON), Last wird dem Menü zugerechnet. Jede Datei nur einmal.
 lade:function(id,url){
  if(dateien[url])return dateien[url];
  var vor=performance.getEntriesByType('resource').length,t=performance.now(),u=url+(url.indexOf('?')<0?'?v='+V:'');
  var p=/\.json$/.test(url)?fetch(u).then(function(r){if(!r.ok)throw new Error(url+' '+r.status);return r.json()}):new Promise(function(ok,nein){
   var s=document.createElement('script');s.src=u;s.onload=function(){ok()};s.onerror=function(){nein(new Error(url+' nicht geladen'))};document.head.appendChild(s)});
  dateien[url]=p.then(function(x){
   var neu=summe(performance.getEntriesByType('resource').slice(vor).map(function(e){return{url:e.name,b:e.encodedBodySize||0,d:e.decodedBodySize||0}}));
   var m=menueLast[id]||(menueLast[id]={n:0,b:0,d:0,fremd:[],ms:0});m.n+=neu.n;m.b+=neu.b;m.d+=neu.d;m.ms+=performance.now()-t;m.fremd=m.fremd.concat(neu.fremd);lastZeigen();return x;
  },function(e){delete dateien[url];throw e});
  return dateien[url];
 },
 // M8: Liste vorhandener Seiten aus 1.0/2.0 (unverändert). Nur Links, nichts wird vorgeladen; Öffnen im neuen Tab, Editor bleibt offen.
 // gruppen = [{titel, seiten:[[datei, name, beschreibung, gross?]]}]
 liste:function(el,gruppen){
  var esc=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')};
  el.insertAdjacentHTML('beforeend',gruppen.map(function(g){
   return '<h3 class="aTitel">'+esc(g.titel)+'</h3><ul class="aListe">'+g.seiten.map(function(s){
    return '<li><a class="aLink" data-seite="'+esc(s[0])+'" href="../'+esc(s[0])+'" target="_blank" rel="noopener">'+esc(s[1])+'</a>'+
     (s[3]?' <span class="aGross">groß, lädt lange</span>':'')+'<small>'+esc(s[2])+'</small></li>'}).join('')+'</ul>'}).join(''));
 },
 oeffnen:oeffnen, schliessen:schliessen,
 geladen:function(){return Object.keys(geladen)},
 kartei:function(){return kartei},
 last:function(){return{start:start,menues:menueLast}}
};

knoepfe();
$('fZu').onclick=schliessen;
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&offen)schliessen()});
var kp=karteiLaden();
function messen(){
 // Schrift gehört zur Startlast: auf sie warten (höchstens 3 s), dann zählen.
 var f=document.fonts&&document.fonts.load?document.fonts.load('18px "AT3 Text"').catch(function(){}):Promise.resolve();
 Promise.all([kp,Promise.race([f,new Promise(function(r){setTimeout(r,3000)})])]).then(function(){
  start=summe(ressourcen());start.ms=performance.now();   // ab Seitenaufruf gemessen (inkl. Schrift und Kartei)
  start.skriptMs=performance.now()-T0;
  lastZeigen();window.AT3ED_BEREIT=true;
 });
}
if(document.readyState==='complete')messen();else addEventListener('load',messen);
})();
