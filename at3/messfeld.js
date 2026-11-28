// WAS DIE DATEI TUT: Messfeld der Weltkarte von Arena Theory 3.0 (Schritt N7a2b3, Thomas 24.11.2026). Nur mit ?mess=1 in der Adresse: kleines Feld oben links
// mit den Messwerten der Karte (Bildrate und Ruckler des Hauptkerns, Zeichnen, Bodenbilder und Gebäudebilder im Bildkern, Orte, Speicher), Knopf „Reset“
// (Höchstwerte neu, z. B. nach dem Laden) und „Copy“ (Text für den Chat). Werkzeug zum Messen am echten Handy, kein Spielinhalt; kostet ohne ?mess=1 nichts.
// Kosten mit ?mess=1: ein requestAnimationFrame-Zähler und alle 0,5 s ein paar Zeilen Text (Hauptkern), nichts im Bildkern.
(function(){
'use strict';
if(!/[?&]mess=1\b/.test(location.search))return;
var RUCK=50,el=null,txt=null,zu=false,ft=[],worst=0,ruck=0,last=0,start=performance.now();
function frame(t){if(last){var d=t-last;ft.push(t);if(d>worst)worst=d;if(d>RUCK)ruck++}last=t;while(ft.length&&t-ft[0]>1000)ft.shift();requestAnimationFrame(frame)}
function mb(b){return((b||0)/1048576).toFixed(2)}
function ms(v){return v==null?'–':(+v).toFixed(1)}
function zeilen(){var K=window.AT3SPIEL&&AT3SPIEL.karte&&AT3SPIEL.karte(),M=K&&K.mess;if(!M)return['Map not running yet.'];
 var n=navigator,z=[];
 z.push('Frames: '+ft.length+' fps · worst '+ms(worst)+' ms · stutters >'+RUCK+' ms: '+ruck);
 z.push('Draw (main): max '+ms(M.maxZeichenMs)+' ms · Ø '+ms(M.zeichnen?M.zeichenMs/M.zeichnen:0)+' ms');
 z.push('Ground image (worker): max '+ms(M.maxRechenUs/1000)+' ms · Ø '+ms(M.gerechnet?M.rechenUs/M.gerechnet/1000:0)+' ms · '+(M.gerechnet||0)+' made');
 z.push('Towns: '+(M.orte||0)+' · plan max '+ms(M.ortMaxMs)+' ms · lists '+(M.listen==null?'–':M.listen)+'/4 · list total '+ms(M.listeMs)+' ms');
 z.push('Outposts: '+(M.posten||0)+' · lists of '+(M.postenListen||0)+' towns · biggest list '+ms(M.postenMs)+' ms');   // N7a2c
{var KZ=window.AT3SPIEL&&AT3SPIEL.kern&&AT3SPIEL.kern(),OWS=KZ&&KZ.zustand&&KZ.zustand.ow;   // N7a4a2: Sperrkarten der Orte für die Wegsuche (Weltkern)
  z.push(OWS?'Town masks: '+OWS.karten+' · '+mb(OWS.bytes)+' MB · '+OWS.modus+' · asked '+OWS.bestellt+' · slowest '+OWS.maxAntwortMs+' ms · world waited '+(OWS.warteMs/1000).toFixed(1)+' s ('+OWS.warteMal+'×)'+(OWS.an?'':' · off'):'Town masks: –')}
 z.push('Buildings: '+(M.haeuser||0)+' images '+mb(M.hausB)+'/2 MB · biggest step '+ms(M.hausMs)+' ms · pauses '+(M.hausPausen||0));
 z.push('Half (½): '+(M.halbN||0)+' images '+mb(M.halbB)+'/1 MB · biggest step '+ms(M.halbMs)+' ms');   // N7a3a
 z.push('Far (¼ ⅛): '+(M.fernN||0)+' images '+mb(M.fernB)+'/0.5 MB · biggest step '+ms(M.fernMs)+' ms');   // N7a3b
 z.push('Sharp world view: '+(M.scharfZahl||0)+' images '+mb(M.scharfB)+'/24 MB · last '+ms(M.scharfMs)+' ms in '+(M.scharfSchritte||0)+' steps · max '+ms(M.maxScharfMs)+' ms · dropped '+(M.scharfRaus||0));   // N7h1
 z.push('Sharp globe: '+(M.gKacheln||0)+' tiles '+mb(M.gBytes)+'/8 MB · last '+ms(M.gScharfMs)+' ms (tiles '+ms(M.gKMs)+' + picture '+ms(M.gGMs)+') in '+(M.gSchritte||0)+' steps, '+(M.gNeu||0)+' new, '+(M.gK||0)+'/cell · max '+ms(M.maxGScharfMs)+' ms · dropped '+(M.gRaus||0));   // N7h3
 z.push('Kartei: '+(M.kartei||0)+' images '+mb(M.karteiB)+'/4 MB');
 z.push('Map images: '+(M.bilder||0)+' · '+mb(M.bytes)+' MB (max '+mb(M.maxBytes)+') · visible '+(M.sichtbar||0)+' · placeholders '+(M.ersatz||0)+(M.fertig?' · done':' · working'));
 z.push('Device: '+(n.hardwareConcurrency||'?')+' cores · '+(n.deviceMemory?n.deviceMemory+' GB':'? GB')+' · '+innerWidth+'×'+innerHeight+' @'+(devicePixelRatio||1)+' · '+((performance.now()-start)/1000|0)+' s');
 return z}
function zeigen(){if(!el)return;txt.textContent=zu?'':zeilen().join('\n')}
function knopf(t,f){var b=document.createElement('button');b.type='button';b.textContent=t;b.style.cssText='font:inherit;margin:2px 4px 0 0;padding:4px 8px;background:var(--knopf,#c09a6c);color:var(--tinte,#24140a);border:1px solid var(--rand,#412614);border-radius:3px';
 b.addEventListener('click',function(e){e.stopPropagation();f(b)});return b}
function kopieren(b){var s='Arena Theory 3 – measurement '+new Date().toISOString().slice(0,16)+'\n'+zeilen().join('\n')+'\n'+navigator.userAgent;
 var ok=function(){b.textContent='Copied';setTimeout(function(){b.textContent='Copy'},1500)};
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(s).then(ok,function(){alt(s);ok()});else{alt(s);ok()}}
function alt(s){var a=document.createElement('textarea');a.value=s;a.style.cssText='position:fixed;left:0;top:0;opacity:0';document.body.appendChild(a);a.select();try{document.execCommand('copy')}catch(x){}a.remove()}
function bauen(){el=document.createElement('div');el.id='at3Mess';
 el.style.cssText='position:fixed;left:4px;top:4px;z-index:9999;max-width:calc(100vw - 8px);background:rgba(216,196,153,.92);color:#24140a;border:2px solid #412614;border-radius:4px;padding:4px 6px;font:11px/1.35 ui-monospace,monospace;white-space:pre-wrap;pointer-events:auto';
 txt=document.createElement('div');var leiste=document.createElement('div');
 leiste.appendChild(knopf('Reset',function(){worst=0;ruck=0;var K=window.AT3SPIEL&&AT3SPIEL.karte&&AT3SPIEL.karte();if(K&&K.messNeu)K.messNeu();zeigen()}));
 leiste.appendChild(knopf('Copy',kopieren));
 leiste.appendChild(knopf('Hide',function(b){zu=!zu;b.textContent=zu?'Measure':'Hide';zeigen()}));
 el.appendChild(txt);el.appendChild(leiste);document.body.appendChild(el);zeigen();setInterval(zeigen,500)}
requestAnimationFrame(frame);
if(document.body)bauen();else document.addEventListener('DOMContentLoaded',bauen);
window.AT3MESS={zeilen:zeilen};
})();
