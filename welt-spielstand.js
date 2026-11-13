'use strict';
// SPIELSTAND ARENA THEORY 2.0 (welt-spielstand.js) · Eigener Spielstand mit 3 Plätzen, laufend von selbst gespeichert. Wunsch Thomas 13.11.2026 (AT2_FAHRPLAN.md, A2).
// Nur auf arena-theory-2.html geladen (weltkarte-boot.js lädt es zuerst, wenn window.AT2 gesetzt ist). Nichts davon kommt in 1.0.
//
// · Eigene IndexedDB-Datenbank „arena-theory-2“ (Ablage „plaetze“): Platz n = ganzer Stand, „k“+n = kleiner Kopf fürs Startbild.
//   Datenbank und Schlüssel von 1.0 werden weder gelesen noch beschrieben. 2.0 startet immer frisch, ohne Übernahme aus 1.0.
// · Versionsnummer V in jedem Stand. Unlesbare oder fremde Stände werden nicht geladen und nicht überschrieben (nur Löschen).
// · Inhalt: was das Spiel ohnehin in seinen Zwischenspeicher schreibt (MGSave-Ersatz aus weltkarte-boot.js, fertige Texte),
//   der abgeschirmte localStorage der Seite, Uhrzeit, Tempo und die Karte nur als Unterschiede (Felder, die seit dem Start
//   über W.rebake verändert wurden: Feldart, Grund, Objekt, bauAuf, 4 Eckhöhen). Die Karte selbst entsteht immer gleich.
// · Kein Speichern oder Laden von Hand (Wunsch Thomas: nichts zurückholen können). Gespeichert wird höchstens alle ABSTAND ms
//   in einer Leerlaufpause, sofort beim Tageswechsel, beim Verlassen der Seite und beim Knopf „Platz n“ (zurück zum Startbild).
// · Texte aus der Sprachdatei (welt-sprache.js, S1): Startbild mit Sprachwahl, Leiste mit Knopf 🇩🇪/🇬🇧 zum Umschalten im Spiel.
// · Leistung: Speichern misst sich selbst (M.at2Spielstand.ms, Zeit auf dem Hauptfaden; mit dem Spielstand des Spiels ~6 ms wie in 1.0, sonst < 2 ms). Test: tests/welt-spielstand-browser.cjs.
// =====================================================================================================================
(()=>{
const DB='arena-theory-2',ABL='plaetze',V=4,// V2: neue Karte (A3, Dorf/Platz/Park); V3: Dorf und Park größer (A3b); V4: Flächen natürlich gewachsen (A3b). Stände mit älterer Version gehören zur alten Karte
 PLAETZE=[1,2,3],ABSTAND=10000;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// ---------- IndexedDB ----------
let dbP=null;
const db=()=>dbP||(dbP=new Promise((ok,no)=>{let r;try{r=indexedDB.open(DB,1);}catch(e){no(e);return;}
 r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(ABL))d.createObjectStore(ABL);};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);r.onblocked=()=>no(Error('Speicher blockiert'));}));
const tx=(mode,fn)=>db().then(d=>new Promise((ok,no)=>{const t=d.transaction(ABL,mode),s=t.objectStore(ABL),out=[];fn(s,out);t.oncomplete=()=>ok(out);t.onerror=t.onabort=()=>no(t.error);}));
const lies=keys=>tx('readonly',(s,out)=>keys.forEach((k,i)=>{const r=s.get(k);r.onsuccess=()=>{out[i]=r.result;};}));
const schreib=(n,stand)=>tx('readwrite',s=>{s.put(stand,n);s.put(stand.kopf,'k'+n);});
const loesch=n=>tx('readwrite',s=>{s.delete(n);s.delete('k'+n);});
// Stand prüfen: Version, Aufbau, und der Spielstand des Spiels muss sich lesen lassen (data.js verlangt version 2)
function lesbar(r){if(!r||r.v!==V||!r.kopf||!Array.isArray(r.cache)||!Array.isArray(r.mem)||!r.welt||typeof r.welt.stunde!=='number')return false;
 if(!r.cache.every(e=>Array.isArray(e)&&typeof e[0]==='string'&&typeof e[1]==='string'))return false;
 const k=r.welt.schluessel,e=r.cache.find(x=>x[0]===k);if(!e)return false;try{return JSON.parse(e[1])?.version===2;}catch{return false;}}

// ---------- Startbild ----------
const CSS=`#at2Start{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:radial-gradient(ellipse at 50% 30%,#3a2416,#120c09 70%);color:#eadfc8;font-family:'Courier Prime',ui-monospace,Menlo,Consolas,monospace;overflow:auto}
#at2Start .s-box{width:min(460px,100%)}
#at2Start h1{margin:0;text-align:center;font-size:28px;letter-spacing:.16em;color:#f4d37a;text-shadow:0 3px 0 #000}#at2Start .s-sub{text-align:center;margin:4px 0 18px;font-size:13px;opacity:.8}
#at2Start .s-platz{display:flex;align-items:center;gap:10px;margin:10px 0;padding:12px;background:linear-gradient(#2a1c12,#1a110b);border:2px solid #8a6a42;box-shadow:0 3px 0 #000}
#at2Start .s-nr{flex:0 0 40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;color:#120c09;background:#c9a55a;border:2px solid #000}
#at2Start .s-info{flex:1;min-width:0}#at2Start .s-info b{display:block;font-size:15px;color:#f4d37a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#at2Start .s-info small{display:block;font-size:12px;opacity:.8}
#at2Start .s-info .kaputt{color:#f29b83;opacity:1}
#at2Start .s-knoepfe{display:flex;flex-direction:column;gap:6px}
#at2Start button{font:inherit;font-size:14px;min-height:40px;padding:6px 12px;cursor:pointer;color:#120c09;background:#e2c27a;border:2px solid #000;box-shadow:0 2px 0 #000;touch-action:manipulation}
#at2Start button.weg{background:#7a3a2e;color:#f4e4d0;min-height:32px;font-size:12px}#at2Start button:active{transform:translateY(2px);box-shadow:none}
#at2Start .s-frage{margin-top:8px;padding:10px;background:#120c09;border:2px solid #7a3a2e;font-size:13px}#at2Start .s-frage div{display:flex;gap:8px;margin-top:8px}
#at2Start .s-fuss{text-align:center;margin-top:16px;font-size:13px}#at2Start a{color:#f4d37a}#at2Start .s-warn{color:#f29b83;text-align:center;font-size:13px}
#at2Start .s-sprache{display:flex;justify-content:center;gap:8px;margin:0 0 6px}#at2Start .s-sprache button{min-height:34px;font-size:13px;background:#3a2a1c;color:#eadfc8}#at2Start .s-sprache button.an{background:#e2c27a;color:#120c09}
#wPlatz,#wSprache{white-space:nowrap}`;
const L=window.AT2Sprache,t=(k,v)=>L?L.t(k,v):k;
const tag=d=>{try{return new Date(d).toLocaleString(L?L.locale():'de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch{return '';}};
function start(ctx){return new Promise(fertig=>{
 const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
 const el=document.createElement('div');el.id='at2Start';document.body.appendChild(el);
 let koepfe=[],kaputt=new Set(),frage=null,ohneSpeicher=false;
 const zeige=()=>{const sp=L?L.sprache:'de';el.innerHTML=`<div class="s-box"><div class="s-sprache" title="${esc(t('sprache.titel'))}">${(L?L.SPRACHEN:[]).map(l=>`<button data-sprache="${l}" class="${l===sp?'an':''}">${l==='de'?'🇩🇪':'🇬🇧'} ${esc(t('sprache.'+l))}</button>`).join('')}</div><h1>ARENA THEORY 2.0</h1><p class="s-sub">${esc(t('start.sub'))}</p>
  ${ohneSpeicher?`<p class="s-warn">${esc(t('start.keinSpeicher'))}</p>`:''}
  ${PLAETZE.map((n,i)=>{const k=koepfe[i],bad=kaputt.has(n),alt=!!k&&k.v!==V;let info,kn;
   if(alt&&!bad){info=`<b>${esc(k.name||t('start.ludus'))}</b><small class="kaputt">${esc(t('start.alt'))}</small>`;kn=`<button class="weg" data-loesch="${n}">${esc(t('start.loeschen'))}</button>`;}
   else if(bad){info=`<b>${esc(t('start.platz',{n}))}</b><small class="kaputt">${esc(t('start.kaputt'))}</small>`;kn=`<button class="weg" data-loesch="${n}">${esc(t('start.loeschen'))}</button>`;}
   else if(k){info=`<b>${esc(k.name||t('start.ludus'))}</b><small>${esc(t('start.info',{tag:k.tag,gold:Math.floor(k.gold||0),zeit:tag(k.zeit)}))}</small>`;kn=`<button data-weiter="${n}">${esc(t('start.fortsetzen'))}</button><button class="weg" data-neu="${n}">${esc(t('start.neu'))}</button><button class="weg" data-loesch="${n}">${esc(t('start.loeschen'))}</button>`;}
   else{info=`<b>${esc(t('start.platz',{n}))}</b><small>${esc(t('start.leer'))}</small>`;kn=`<button data-neu="${n}">${esc(t('start.neu'))}</button>`;}
   const f=frage&&frage.n===n?`<div class="s-frage">${esc(t(frage.art==='loesch'?'start.frageLoeschen':'start.frageNeu'))}<div><button data-ja="${n}">${esc(t(frage.art==='loesch'?'start.jaLoeschen':'start.jaNeu'))}</button><button class="weg" data-nein>${esc(t('start.nein'))}</button></div></div>`:'';
   return `<div class="s-platz"><span class="s-nr">${['I','II','III'][i]}</span><div class="s-info">${info}${f}</div><div class="s-knoepfe">${kn}</div></div>`;}).join('')}
  <p class="s-fuss"><a href="index.html">${esc(t('start.hauptspiel'))}</a></p></div>`;};
 const los=(n,r)=>{window.AT2_PLATZ=ohneSpeicher?0:n;if(r){for(const [k,v] of r.cache)ctx.cache.set(k,v);for(const [k,v] of r.mem)ctx.mem.set(k,v);}
  geladen={n:window.AT2_PLATZ,r:r||null};el.remove();fertig();};
 el.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
  if(d.sprache){L?.setze(d.sprache);zeige();return;}
  if(d.nein!=null){frage=null;zeige();return;}
  if(d.loesch){frage={n:+d.loesch,art:'loesch'};zeige();return;}
  if(d.neu){const n=+d.neu;if(koepfe[n-1]&&!(frage&&frage.n===n)){frage={n,art:'neu'};zeige();return;}if(!ohneSpeicher)try{await loesch(n);}catch(e){}los(n,null);return;}
  if(d.ja){const n=+d.ja,art=frage?.art;frage=null;try{await loesch(n);}catch(e){}if(art==='neu'){los(n,null);return;}koepfe[n-1]=null;kaputt.delete(n);zeige();return;}
  if(d.weiter){const n=+d.weiter;let r=null;try{r=(await lies([n]))[0];}catch(e){}if(!lesbar(r)){kaputt.add(n);zeige();return;}los(n,r);}});
 const sp=L?L.laden():Promise.resolve();// gemerkte Sprache zuerst (S1)
 lies(PLAETZE.map(n=>'k'+n)).then(k=>sp.then(()=>{koepfe=k;zeige();})).catch(()=>sp.then(()=>{ohneSpeicher=true;zeige();}));
 zeige();});}

// ---------- Im Spiel: laden, mitschreiben, speichern ----------
let geladen=null;
function anschliessen(ctx){const M=window.MG,W=window.WeltKarte,H=window.WeltHook,T=M?.weltTag;
 if(!M||!W||!H||!T||!M.weltBau||(!M.weltBruecke&&(anschliessen.n||0)<40)){/* T2: kurz auf die Brücken warten (welt-bruecke.js) */if((anschliessen.n=(anschliessen.n||0)+1)<200)setTimeout(()=>anschliessen(ctx),50);return;}
 const S=M.s,N=W.N,n=geladen?.n||0,geaendert=new Set();
 // Karte: gespeicherte Unterschiede einsetzen, dann neu zeichnen und Bauten (Arenen, Felder, Häuser) neu berechnen
 const r=geladen?.r;
 if(r){const w=r.welt,ks=w.ks||[];for(let i=0;i<ks.length;i++){const k=ks[i];if(k<0||k>=N*N)continue;W.feld[k]=w.feld[i];W.grund[k]=w.grund[i];W.obj[k]=w.obj[i];W.bauAuf[k]=w.bauAuf[i];for(let c=0;c<4;c++){W.hc[k*4+c]=w.hc[i*4+c];W.merkeHoehe(w.hc[i*4+c]);}geaendert.add(k);}
  // T1: Stände von vor den Parkhügeln behalten ihren flachen Park (sonst Klippen neben schon Gebautem)
  if(!w.gel&&W.huegel){const hat=new Set(ks);for(let k=0;k<N*N;k++)if(W.huegel[k]&&!hat.has(k)){W.hc.fill(0,k*4,k*4+4);geaendert.add(k);}}
  if(geaendert.size){W.rebake([...geaendert]);M.weltBau.neuRechnen?.();}
  M.weltBruecke?.laden?.(w.bruecken);// T2: Brücken und Hochwege
  T.setze(w.stunde);if(w.pause)T.pause(true);T.tempo(w.tempo||1);}
 // mitschreiben, was sich auf der Karte ändert
 const rb=W.rebake;W.rebake=ks=>{if(ks)for(const k of ks)geaendert.add(k);dirty=sDirty=true;return rb(ks);};
 let dirty=false,sDirty=true,laeuft=null,letzt=performance.now(),letztS=0;
 // Der Spielstand des Spiels (M.persist, ~6 ms wie in 1.0 nach jeder Handlung) wird nur neu geschrieben, wenn der Spieler
 // etwas getan hat (Antippen, Taste, Bauen), beim Tageswechsel, beim Verlassen und spätestens jede Minute. Sonst nur Uhr und Karte.
 const tat=()=>{sDirty=dirty=true;};document.addEventListener('pointerup',tat,true);document.addEventListener('keyup',tat,true);
 const tick0=H.tick;H.tick=dt=>{tick0?.(dt);if(dt>0)dirty=true;};
 const schluessel=window.GladiatorProfiles?.key||'mini-gladiator-manager-v2';
 const A=M.at2Spielstand={platz:n,ms:0,mal:0,fehler:'',speichern,get geaendert(){return geaendert.size;}};
 function speichern(alles){if(!n)return Promise.resolve(false);if(laeuft)return laeuft.then(()=>speichern(alles));
  const t0=performance.now(),mitS=alles||sDirty||t0-letztS>60000;if(mitS){try{M.persist?.();}catch(e){console.error(e);}sDirty=false;letztS=t0;}
  const ks=Int32Array.from(geaendert),m=ks.length,feld=new Uint8Array(m),grund=new Uint8Array(m),obj=new Uint8Array(m),bauAuf=new Int8Array(m),hc=new Int8Array(m*4);
  for(let i=0;i<m;i++){const k=ks[i];feld[i]=W.feld[k];grund[i]=W.grund[k];obj[i]=W.obj[k];bauAuf[i]=W.bauAuf[k];for(let c=0;c<4;c++)hc[i*4+c]=W.hc[k*4+c];}
  const stand={v:V,build:window.BUILD||'',kopf:{v:V,name:S.schoolName,tag:S.day,gold:S.gold,zeit:Date.now()},cache:[...ctx.cache],mem:[...ctx.mem],
   welt:{gel:1,schluessel,stunde:T.stunde,tempo:T.st.tempo||1,pause:!!T.st.pause,ks,feld,grund,obj,bauAuf,hc,bruecken:M.weltBruecke?.daten?.()||[]}};
  dirty=false;letzt=performance.now();
  laeuft=schreib(n,stand).then(()=>{A.fehler='';return true;}).catch(e=>{A.fehler=String(e?.message||e);dirty=true;return false;}).finally(()=>{laeuft=null;});
  A.ms=performance.now()-t0;A.mitS=mitS;A.mal++;return laeuft;}
 if(n){
  const leer=window.requestIdleCallback?f=>requestIdleCallback(f,{timeout:2000}):f=>setTimeout(f,0);let wartet=false;
  setInterval(()=>{if(dirty&&!wartet&&performance.now()-letzt>=ABSTAND){wartet=true;leer(()=>{wartet=false;speichern();});}},1000);
  T.beiWechsel(()=>speichern(true));
  const weg=()=>{if(dirty)speichern(true);};addEventListener('pagehide',weg);document.addEventListener('visibilitychange',()=>{if(document.hidden)weg();});
  if(!r)speichern(true);// neues Spiel: Platz sofort belegen
 }
 // Leiste: Untertitel und Knopf „Platz n“ (speichert und führt zum Startbild)
 const sub=document.querySelector('.w-title small'),bar=document.querySelector('#weltUi .w-bar');let bP=null,bS=null;
 const texte=()=>{if(sub)sub.innerHTML=esc(n?t('leiste.platz',{n}):t('leiste.ohne'))+' · <a href="index.html" style="color:#f4d37a">'+esc(t('leiste.hauptspiel'))+'</a>';
  if(bP&&!bP.disabled){bP.textContent=t('leiste.knopf',{n});bP.title=t('leiste.knopfTitel');}
  if(bS){const en=L.sprache==='en';bS.textContent=en?'🇬🇧 EN':'🇩🇪 DE';bS.title=t('sprache.titel');}};
 if(bar&&n){bP=document.createElement('button');bP.id='wPlatz';bP.className='w-btn';
  bP.onclick=async()=>{bP.disabled=true;bP.textContent='💾 …';await speichern(true);location.reload();};const u=document.getElementById('wUhr');bar.insertBefore(bP,u?u.nextSibling:bar.firstChild);}
 // Sprache umschalten mitten im Spiel (S1): Texte werden neu gesetzt, der Spielstand bleibt, wie er ist
 if(bar&&L){bS=document.createElement('button');bS.id='wSprache';bS.className='w-btn';bS.onclick=()=>L.setze(L.sprache==='en'?'de':'en');
  const nach=bP||document.getElementById('wUhr');bar.insertBefore(bS,nach?nach.nextSibling:bar.firstChild);L.beiWechsel(texte);}
 texte();
 window.AT2_BEREIT=true;}

window.AT2Spielstand={start,anschliessen,V,DB,lesbar,_lies:lies,_loesch:loesch};
})();
