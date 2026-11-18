'use strict';
// WAS DIE DATEI TUT: Englischer Kampf in Arena Theory 3.0 (Schritt G9d4). Übersetzt Dateien von Arena Theory 1.0 BEIM LADEN im Kampffenster,
// ohne 1.0 zu ändern: Ein kleiner Zerleger findet die Textstücke im Quelltext (Zeichenketten '…' "…" und die festen Teile von `…${…}…`),
// ersetzt die aus dem Wörterbuch (at3/sprache/kampf-en/<datei>.json) und das Kampffenster lädt die übersetzte Fassung.
// Wörterbuch: {"t":{"deutsch roh":"englisch roh" | null (bleibt)}, "code":[["genau so im Quelltext","ersetzt durch"]]}. Schlüssel sind die
// Textstücke genau wie im Quelltext (mit Escapes). Ändert sich ein Text in 1.0, bleibt er einfach deutsch, nichts geht kaputt.
// Dieselben Funktionen nutzt das Werkzeug tools/at3-kampf-en.cjs (Liste, Abdeckung, Prüfung), daher läuft die Datei in Node und im Browser.
// Kerne: läuft nur einmal beim Öffnen des Kampffensters (etwa 10–30 ms), nicht während des Kampfs.
(function(G){
// Zerlegt Quelltext in Textstücke: {a,e,roh,q} a/e = Grenzen ohne Anführungszeichen, q = ' " oder ` (Vorlagenteil).
const ID=/[A-Za-z_$0-9]/,ID_Y=/[A-Za-z_$0-9]+/y;
function stuecke(src){
 const out=[],n=src.length;let i=0,prev='';// prev: letztes bedeutsames Zeichen/Wort, entscheidet „/“ = Teilung oder RegExp
 const stack=[];// offene ${ in Vorlagen: Klammertiefe je Ebene
 let tiefe=0;
 const regexDarf=()=>prev===''||/[(,=:\[!&|?{};+\-*%<>~^]$/.test(prev)||/^(return|typeof|case|do|else|in|of|new|delete|void|throw|instanceof|yield|await)$/.test(prev);
 function vorlage(){// i steht hinter dem öffnenden `
  let a=i;
  while(i<n){const c=src[i];
   if(c==='\\'){i+=2;continue;}
   if(c==='`'){out.push({a,e:i,roh:src.slice(a,i),q:'`'});i++;return true;}
   if(c==='$'&&src[i+1]==='{'){out.push({a,e:i,roh:src.slice(a,i),q:'`'});i+=2;stack.push(tiefe);tiefe=0;return false;}
   i++;}
  return true;}
 while(i<n){const c=src[i];
  if(c===' '||c==='\t'||c==='\n'||c==='\r'){i++;continue;}
  if(c==='/'&&src[i+1]==='/'){while(i<n&&src[i]!=='\n')i++;continue;}
  if(c==='/'&&src[i+1]==='*'){const e=src.indexOf('*/',i+2);i=e<0?n:e+2;continue;}
  if(c==='\''||c==='"'){const a=i+1;i++;while(i<n&&src[i]!==c){if(src[i]==='\\')i++;else if(src[i]==='\n')break;i++;}
   out.push({a,e:i,roh:src.slice(a,i),q:c});i++;prev='"';continue;}
  if(c==='`'){i++;vorlage();prev='"';continue;}
  if(c==='{'){tiefe++;i++;prev='{';continue;}
  if(c==='}'){if(stack.length&&tiefe===0){tiefe=stack.pop();i++;vorlage();prev='"';continue;}tiefe--;i++;prev='}';continue;}
  if(c==='/'&&regexDarf()){i++;let klasse=false;while(i<n){const d=src[i];if(d==='\\'){i+=2;continue;}if(d==='\n')break;if(klasse){if(d===']')klasse=false;}else if(d==='[')klasse=true;else if(d==='/')break;i++;}
   i++;while(i<n&&/[a-z]/.test(src[i]))i++;prev='"';continue;}
  if(ID.test(c)){ID_Y.lastIndex=i;ID_Y.test(src);const a=i;i=ID_Y.lastIndex;prev=src.slice(a,i);continue;}
  prev=c;i++;}
 return out;}
// Sieht das Stück nach deutschem Text aus? (für Liste und Abdeckung; Ersetzen geht immer nur über das Wörterbuch)
const DE=/[äöüÄÖÜß]|\b(der|die|das|den|dem|des|und|oder|ist|sind|nicht|kein|keine|mit|ohne|für|ein|eine|einen|auf|aus|bei|nach|vor|von|zum|zur|im|wird|hat|sich|noch|schon|nur|auch|wie|alle|Kampf|Kämpfe|Sieg|Siege|Tod|Tote|Held|Arena|Gegner|Treffer|Kopf|Bein|Arm|Hand|Fuß|Wunde|Blut|Gnade|Urteil|Daumen|links|rechts|tot|Schild|Schwert|Speer|Bogen|Pfeil|Axt|Keule|Netz)\b/;
function deutsch(roh){const t=roh.replace(/\$\{[^}]*\}|<[^>]*>|&[a-z#0-9]+;|\\[nrt'"`\\]/g,' ');if(!/[A-Za-zÄÖÜäöü]{3}/.test(t))return false;return DE.test(t);}
// Übersetzt eine Datei. w = Wörterbuch. Gibt {src,ersetzt,code} zurück.
function uebersetze(src,w){
 let s=src,code=0;
 for(const [von,zu] of (w&&w.code)||[]){const p=s.indexOf(von);if(p<0)continue;s=s.slice(0,p)+zu+s.slice(p+von.length);code++;}
 const t=(w&&w.t)||{},teile=[];let pos=0,ersetzt=0;
 for(const st of stuecke(s)){const en=t[st.roh];if(en==null||en===st.roh)continue;teile.push(s.slice(pos,st.a),en);pos=st.e;ersetzt++;}
 teile.push(s.slice(pos));
 return {src:teile.join(''),ersetzt,code};}
// G9d4d Begriffe: Schlüsseltexte aus 1.0-Daten (Verletzungen, Ursachen, Körperteile, Werte, Rollen, Talentstufen, Waffen …) bleiben im Code
// deutsch und werden erst bei der Anzeige übersetzt. b = begriffe.json ({gruppen:{Name:{deutsch:englisch}}}). Ganze Wörter, längste zuerst,
// Großschreibung ab 5 Zeichen mit. Gibt eine Funktion text→text zurück (mit Zwischenspeicher, damit Wiederholtes nichts kostet).
function begriffe(b){
 const m=new Map();for(const g of Object.values((b&&b.gruppen)||{}))for(const [de,en] of Object.entries(g)){if(en==null||en===de)continue;m.set(de,en);
  if(de.length>=5){const U=de.toUpperCase();if(U!==de&&!m.has(U))m.set(U,en.toUpperCase());}}
 if(!m.size)return s=>s;
 const re=new RegExp('(?<![\\p{L}\\d])(?:'+[...m.keys()].sort((a,b)=>b.length-a.length).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')(?![\\p{L}\\d])','gu');
 const cache=new Map();
 const tr=s=>{if(typeof s!=='string'||s.length<3)return s;let r=cache.get(s);if(r!==undefined)return r;re.lastIndex=0;r=s.replace(re,x=>m.get(x));if(cache.size>5000)cache.clear();cache.set(s,r);return r;};
 tr.zahl=m.size;return tr;}
const KE={stuecke,deutsch,uebersetze,begriffe};
if(typeof module!=='undefined'&&module.exports)module.exports=KE;else G.AT3KampfEN=KE;
})(typeof window!=='undefined'?window:globalThis);
