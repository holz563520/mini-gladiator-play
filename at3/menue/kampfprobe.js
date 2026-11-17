// WAS DIE DATEI TUT: Probekampf im AT3-Master-Editor (Menü Kampf, Schritt G9d1; wird erst beim Antippen geladen, zusammen mit kampfanschluss.js).
// Gladiatoren frisch gewürfelt wie am Sklavenmarkt (1.0 unverändert im Kampfkern, KA.wuerfle), je Team 1–5, Seed. „Würfeln & ansehen“ öffnet das
// Kampffenster (KA.fenster: unverändertes 1.0 im abgeschotteten Rahmen). Danach: was zurückkam (Sieger, Tod, Verletzungen, Gelerntes) und die Probe,
// dass das Ergebnis genau einmal zurückgeschrieben wird (zweiter Versuch abgelehnt).
// Kerne: Würfeln im Kampfkern, der Kampf selbst im Rahmen (1.0 wie im Hauptspiel). Der Editor lädt nichts aus 1.0.
(function(){
'use strict';
var KA=window.AT3Kampf, el=null, E={ergebnis:null,zeilen:null,geschrieben:null,zweiter:null,fehler:''};
var V=((document.currentScript&&document.currentScript.src||'').match(/[?&]v=([^&]*)/)||[])[1]||'';
function q(s){return el.querySelector(s)}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}
function kom(v){return (Math.round(v*10)/10).toFixed(1).replace('.',',')}
function wurf(){var a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%1000000}
function wahl(id,soll){var h='<select id="'+id+'" aria-label="'+id+'">';for(var i=1;i<=5;i++)h+='<option value="'+i+'"'+(i===soll?' selected':'')+'>'+i+' Kämpfer</option>';return h+'</select>'}
// Gelerntes: Summe der Zuwächse in Werten, Manövern und Waffen (die Lernpfade des 1.0-Kampfberichts)
function gelernt(a,b){var n=0,s=0;['stats','moves','mastery'].forEach(function(gr){var x=a&&a[gr]||{},y=b&&b[gr]||{};for(var k in y){var d=(+y[k]||0)-(+x[k]||0);if(d>.0001){n++;s+=d}}});return {n:n,summe:s}}

function aufbauen(z){el=z;
 el.innerHTML='<div><h3>Probekampf im Kampffenster</h3><p class="leise">Gladiatoren wie am Sklavenmarkt gewürfelt, Kampf 1:1 aus Arena Theory 1.0 (deutsch). Die Weltuhr steht im Spiel währenddessen still.</p>'+
  '<p>Blau '+wahl('kpB',1)+' gegen Rot '+wahl('kpR',1)+'</p><p>Seed <input id="kpSeed" inputmode="numeric" size="8" value="'+wurf()+'"> <button class="knopf klein" id="kpWurf">🎲</button></p>'+
  '<p><button class="knopf" id="kpLos">Würfeln &amp; ansehen<small>öffnet das Kampffenster</small></button></p><div id="kpErg"></div></div>';
 q('#kpWurf').onclick=function(){q('#kpSeed').value=wurf()};
 q('#kpLos').onclick=los;}

function los(){var nb=+q('#kpB').value,nr=+q('#kpR').value,seed=(+q('#kpSeed').value>>>0)||1,z=q('#kpErg');
 q('#kpLos').disabled=true;E.ergebnis=E.zeilen=E.geschrieben=E.zweiter=null;E.fehler='';z.innerHTML='<p class="leise">Der Händler treibt frische Ware herein …</p>';
 KA.wuerfle({seed:seed,n:nb+nr},'',V).then(function(L){
  var k={},teams={blau:[],rot:[]};
  L.forEach(function(g,i){var blau=i<nb,id=(blau?'blau-':'rot-')+(blau?i:i-nb)+'-'+(g.id||i);
   k[id]={id:id,name:g.name,art:'human',herkunft:KA.laborHerkunft(),g:g};
   (blau?teams.blau:teams.rot).push({kaempfer:k[id],reihe:g.role==='Fernkämpfer'?'back':'front'});});
  var vorher={};for(var id in k)vorher[id]=JSON.parse(JSON.stringify(k[id].g));
  var a=KA.auftrag('probe-'+seed+'-'+Date.now().toString(36),seed,teams,'Probekampf');
  z.innerHTML='<p class="leise">Die Tore öffnen sich …</p>';
  return KA.fenster(a,{basis:'',v:V}).then(function(erg){
   E.ergebnis=erg;var buch={};
   E.geschrieben=KA.zurueckschreiben(buch,a,erg,k);E.zweiter=KA.zurueckschreiben(buch,a,erg,k);
   E.zeilen=erg.einheiten.map(function(u){var kk=k[u.key],l=gelernt(vorher[u.key],kk&&kk.g);
    return {name:u.name,team:u.team,tot:u.tot,unten:u.unten,leben:u.leben,verletzungen:u.verletzungen,kills:u.kills,ursache:u.ursache,gelernt:l,zustand:kk&&kk.zustand}});
   zeigen();});
 }).catch(function(e){E.fehler=String(e&&e.message||e);z.innerHTML='<p class="witz">'+(E.fehler==='abgebrochen'?'Abgebrochen. Die Löwen gehen hungrig schlafen.':'Kampffenster eingestürzt: '+esc(E.fehler))+'</p>'})
 .then(function(){q('#kpLos').disabled=false});}

function zeigen(){var e=E.ergebnis,z=q('#kpErg');
 var sieger=e.sieger===0?'Blau siegt':e.sieger===1?'Rot siegt':'Unentschieden';
 var h='<p><b>'+sieger+'</b> · Kampfzeit '+kom(e.zeit)+' s · angesehen '+Math.round(e.dauerMs/1000)+' s</p>'+
  '<table><tr><th>Kämpfer</th><th>Zustand</th><th>Kills</th><th>Gelernt</th></tr>'+
  E.zeilen.map(function(r){var zst=r.tot?'tot'+(r.ursache?' ('+esc(r.ursache)+')':''):r.unten?'am Boden':'Leben '+r.leben;
   return '<tr><td>'+(r.team?'🟥 ':'🟦 ')+esc(r.name)+'</td><td>'+zst+(r.verletzungen.length?'<br><small>'+r.verletzungen.map(esc).join(' · ')+'</small>':'')+'</td><td>'+r.kills+'</td><td>'+
    (r.gelernt.n?r.gelernt.n+' Werte, +'+kom(r.gelernt.summe):'–')+'</td></tr>'}).join('')+'</table>'+
  '<p id="kpEinmal">'+(E.geschrieben&&E.zweiter===false?'✅ Genau einmal zurückgeschrieben (zweiter Versuch abgelehnt).':'❌ Zurückschreiben nicht einmalig')+'</p>';
 z.innerHTML=h;window.AT3_KAMPFPROBE_ERGEBNIS=e;}

window.AT3_KAMPFPROBE={aufbauen:aufbauen,get ergebnis(){return E}};
})();
