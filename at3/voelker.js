// WAS DIE DATEI TUT: Prüfer und Vergleich für Kulturkreise und Religionen von Arena Theory 3.0 (Schritt N4a). Prüft daten/kulturen.json (Format 2) und
// daten/religionen.json gegen Zonen, Systeme, Baustile, Waren und Palette, deckt jede Landzone und jede Religion ab, sucht verbotene Wörter (Prüfliste
// AT3_NEUAUSRICHTUNG.md 4.5) und rechnet den Vergleich „gleich viel Witz, gleich viel Würde“. Reine Rechnung, unter 1 ms; nur im Master-Editor und in Tests.
// Kerne: keiner im Spiel (das Spiel lädt diese Datei nicht; Verteilung in der Welt kommt mit N4b).
(function(root){
'use strict';
var WERTE=['greed','piety','honour','cruelty','arena-love'];
function ids(L){var m={};(L||[]).forEach(function(x){m[x.id]=x});return m}
function texte(k){var t=[k.en,k.spruch];if(k.arena)t.push(k.arena);if(k.klang)Object.keys(k.klang).forEach(function(a){t=t.concat(k.klang[a])});
 (k.goetter||[]).forEach(function(g){t.push(g.en,g.amt)});(k.feiertage||[]).forEach(function(f){t.push(f.en)});return t.concat(k.priester||[],k.geschaefte||[])}
// Verbotene Wörter: Wortanfang genügt („arab“ trifft „Arabian“, aber nicht „parable“).
function verboten(liste,text){var s=' '+String(text).toLowerCase().replace(/[^a-z' ]+/g,' ')+' ',treffer=[];
 (liste||[]).forEach(function(w){if(s.indexOf(' '+w.toLowerCase())>=0)treffer.push(w)});return treffer}
function woerter(s){return String(s||'').split(/\s+/).filter(Boolean).length}
function median(a){var b=a.slice().sort(function(x,y){return x-y});return b.length?b[b.length>>1]:0}

// ctx = {waren:[ids], systeme:[ids], baustile:[ids], hauptstaedte:Zahl, farben:Zahl}
function pruefen(K,R,ctx){
 ctx=ctx||{};var F=[],H=[],f=function(art,id,text){F.push({art:art,id:id,text:text})},h=function(art,id,text){H.push({art:art,id:id,text:text})};
 var Z=ids(K.zonen),LA=ids(K.lagen),KA=ids(K.kaempfe),RE=ids(R.religionen),W={},S={},B={},farben=ctx.farben||64;
 (ctx.waren||[]).forEach(function(x){W[x]=1});(ctx.systeme||[]).forEach(function(x){S[x]=1});(ctx.baustile||[]).forEach(function(x){B[x]=1});
 var gesehen={},namen={},zoneDa={},relDa={},haupt=0;
 if(K.format!==2)f('format','kulturen','kulturen.json braucht Format 2');
 (K.kulturkreise||[]).forEach(function(k){var id=k.id||'?';
  if(!/^[a-z0-9-]+$/.test(id))f('id',id,'Kennung nur a–z, 0–9, Bindestrich');if(gesehen[id])f('id',id,'Kennung doppelt');gesehen[id]=1;
  if(!k.en)f('name',id,'englischer Name fehlt');else{if(namen[k.en])f('name',id,'Name doppelt: '+k.en);namen[k.en]=1}
  if(!k.de)f('text',id,'deutsche Beschreibung fehlt');if(!k.spruch)f('text',id,'Spruch fehlt');
  if(!(k.heimat||[]).length)f('zone',id,'kein Heimatklima');
  (k.heimat||[]).forEach(function(z){if(!Z[z])f('zone',id,'unbekannte Zone '+z);else if(Z[z].zone<2)f('zone',id,'Zone '+z+' ist kein Land');else zoneDa[z]=1});
  if(!LA[k.lage])f('lage',id,'unbekannte Lage '+k.lage);
  if(ctx.systeme&&!S[k.system])f('system',id,'unbekanntes System '+k.system);
  if(ctx.baustile&&!B[k.baustil])f('baustil',id,'unbekannter Baustil '+k.baustil);
  if(!RE[k.religion])f('religion',id,'unbekannte Religion '+k.religion);else relDa[k.religion]=(relDa[k.religion]||0)+1;
  if(!(k.waren||[]).length)f('ware',id,'keine Lieblingswaren');
  if(ctx.waren)(k.waren||[]).forEach(function(w){if(!W[w])f('ware',id,'unbekannte Ware '+w)});
  if(!(k.kaempfe||[]).length)f('kampf',id,'keine Lieblingskämpfe');(k.kaempfe||[]).forEach(function(x){if(!KA[x])f('kampf',id,'unbekannter Kampf '+x)});
  if(!(k.kleider||[]).length)f('farbe',id,'keine Kleiderfarben');
  (k.kleider||[]).forEach(function(c){if(!(c>=0&&c<farben&&c%1===0))f('farbe',id,'Farbe '+c+' nicht in der Palette')});
  WERTE.forEach(function(w){var v=(k.werte||{})[w];if(!(v>=1&&v<=5&&v%1===0))f('wert',id,'Wert '+w+' muss 1–5 sein')});
  ['vorn','dorf','stadt','hafen'].forEach(function(a){if(!k.klang||!(k.klang[a]||[]).length)f('klang',id,'Namensklang „'+a+'“ fehlt')});
  if(k.hauptstadt)haupt++;
  verboten(K.verboten,texte(k).join(' ')).forEach(function(w){f('verboten',id,'verbotenes Wort „'+w+'“ (Prüfliste 4.5)')});
  if(!k.frei)h('frei',id,'noch nicht freigegeben');
 });
 (K.zonen||[]).forEach(function(z){if(z.zone>=2&&!zoneDa[z.id])f('abdeckung',z.id,'keine Kultur hat '+z.de+' als Heimat')});
 if(ctx.hauptstaedte!=null&&haupt!==ctx.hauptstaedte)f('hauptstadt','kulturen',haupt+' Kulturen mit Hauptstadt, Ortsbilder erwarten '+ctx.hauptstaedte);
 var rg={};(R.religionen||[]).forEach(function(r){var id=r.id||'?';
  if(!/^[a-z0-9-]+$/.test(id))f('id',id,'Kennung nur a–z, 0–9, Bindestrich');if(rg[id])f('id',id,'Kennung doppelt');rg[id]=1;
  if(!r.en||!r.spruch||!r.arena)f('text',id,'Name, Spruch oder Haltung zur Arena fehlt');
  if(!(r.goetter||[]).length)f('text',id,'keine Götter');if(!(r.priester||[]).length)f('text',id,'keine Priesterämter');
  if(!(r.geschaefte||[]).length)f('text',id,'keine Tempelgeschäfte');if(!(r.feiertage||[]).length)f('text',id,'keine Feiertage');
  (r.heimat||[]).forEach(function(z){if(!Z[z])f('zone',id,'unbekannte Zone '+z)});
  if(!relDa[id])f('abdeckung',id,'keine Kultur glaubt daran');
  verboten(K.verboten,texte(r).join(' ')).forEach(function(w){f('verboten',id,'verbotenes Wort „'+w+'“ (Prüfliste 4.5)')});
  if(!r.frei)h('frei',id,'noch nicht freigegeben');
 });
 return{fehler:F,hinweise:H,zahlen:{kulturen:(K.kulturkreise||[]).length,religionen:(R.religionen||[]).length,hauptstaedte:haupt}};
}
// Vergleich nach Prüfliste 4.5: gleich viel Witz (Spruchlänge), gleich viel Würde (Werte, Waren, Kämpfe, Hauptstadt). Ausreißer werden markiert.
function vergleich(L){
 var sp=L.map(function(k){return woerter(k.spruch)+woerter(k.arena)}),m=median(sp);
 var wsum=L.map(function(k){return WERTE.reduce(function(a,w){return a+((k.werte||{})[w]||0)},0)}),mw=median(wsum);
 return L.map(function(k,i){var aus=[];
  if(sp[i]>m*1.6)aus.push('Spruch viel länger als üblich');if(sp[i]<m*0.5)aus.push('Spruch viel kürzer als üblich');
  if(k.werte&&(wsum[i]<mw-5||wsum[i]>mw+5))aus.push('Werte zusammen '+wsum[i]+' (Mitte '+mw+')');
  return{id:k.id,woerter:sp[i],werte:k.werte?wsum[i]:null,auffaellig:aus}});
}
// Gleiche Schreibweise wie wirtschaft.js alsText: Listen von Objekten eine Zeile je Eintrag.
function alsText(d){
 function eins(v){return JSON.stringify(v)}
 function wert(v){if(Array.isArray(v)&&v.length&&v.some(function(x){return x&&typeof x==='object'}))return '[\n'+v.map(function(x){return '  '+eins(x)}).join(',\n')+'\n ]';return eins(v)}
 return '{\n'+Object.keys(d).map(function(k){return ' '+JSON.stringify(k)+':'+wert(d[k])}).join(',\n')+'\n}\n';
}
var V={WERTE:WERTE,pruefen:pruefen,vergleich:vergleich,verboten:verboten,alsText:alsText};
if(typeof module!=='undefined'&&module.exports)module.exports=V;else root.AT3VOELKER=V;
})(typeof self!=='undefined'?self:this);
