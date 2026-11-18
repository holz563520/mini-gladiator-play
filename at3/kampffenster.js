'use strict';
// WAS DIE DATEI TUT: Kampffenster von Arena Theory 3.0 (Schritt G9d1, läuft nur im Rahmen kampffenster.html). Lädt das UNVERÄNDERTE Spiel 1.0 wie die
// Testversionen Aufstellung/Lanista (aufstellung-boot.js): Speicher abgeschottet, 1.0 schreibt nur in den Arbeitsspeicher dieses Rahmens, keine 1.0-Spielstände.
// Ablauf: Rahmen meldet „bereit“ → AT3 schickt einen Kampfauftrag (kampfanschluss.js KA.auftrag) → Kampf genau wie in 1.0 (arena-ui.js fight():
// AN.build, S.battle, Kampfansicht, Synchronisation, Minibilder, Nahaufnahmen, Urteil, Kampfbericht mit Lernfortschritt) → „Back to the world“ →
// Ergebnis im Format von kampfkern.js KK.rechne genau einmal an AT3 zurück. Der Rahmen wird danach entladen (Speicher am Handy).
// Kerne: 1.0 zeichnet und rechnet hier wie im Hauptspiel. AT3 hält seine Weltuhr während des Kampfs an (Entscheidung Thomas 17.11.2026).
// G9d2 Arena: Modus „wahl“ zeigt die Aufstellung 1:1 aus 1.0 (aufstellung-ui.js im Spielmodus: 3×3-Raster, ★-Held, fünf Gegner mit 1–5 Totenköpfen, Gelübde)
// mit den AT3-Gladiatoren als Kader; „KAMPF!“ setzt nur den Termin (Nachricht „termin“). Modus „kampf“ stellt am Termin dieselbe Gruppe und dasselbe Angebot
// wieder her und startet den Kampf über denselben Knopf (fight() aus 1.0: Prämie, Gelübde, Gunst, Anführer, Kampfbericht). Gegner bekommen ihre Herkunft aus
// benannten Orten der Welt (leichte aus der Nähe, 4–5 Totenköpfe aus fernen Städten). Ergebnis mit Prämie und Aufstellung genau einmal an AT3.
// Sprache (G9d4): Texte und Stimme werden beim Laden englisch (kampf-en.js, Wörterbücher in sprache/kampf-en/), 1.0 bleibt unverändert. Was noch nicht übersetzt ist, bleibt deutsch.
var BUILD='163a42d6';
(()=>{
 const V=(location.search.match(/[?&]v=([^&]*)/)||[])[1]||BUILD;
 const eltern=window.parent!==window?window.parent:null;
 const melde=m=>{try{eltern&&eltern.postMessage(Object.assign({kf:1},m),location.origin);}catch(e){}};
 // ---------- Abschotten wie aufstellung-boot.js ----------
 const mem=new Map(),fake={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>{mem.set(String(k),String(v));},removeItem:k=>{mem.delete(k);},clear:()=>mem.clear(),key:i=>[...mem.keys()][i]??null,get length(){return mem.size;}};
 try{Object.defineProperty(window,'localStorage',{configurable:true,get:()=>fake});}catch{}
 let dicht=false;try{dicht=window.localStorage===fake;}catch{}
 const fehler=t=>{const b=document.getElementById('kfBoot');if(b)b.innerHTML='<b>ARENA THEORY</b><em>The arena would not open: '+String(t).replace(/</g,'&lt;')+'</em><button id="kfAbbruch">Back to the world</button>';
  const k=document.getElementById('kfAbbruch');if(k)k.onclick=()=>melde({art:'abbruch',text:String(t)});melde({art:'fehler',text:String(t)});};
 if(!dicht){fehler('Speicher ließ sich nicht abschotten');throw Error('Kampffenster: Speicher nicht abgeschottet');}
 // IndexedDB von 1.0 (boot.js „mini-gladiator-saves“) wird nie geöffnet: MGSave liegt nur im Arbeitsspeicher
 const cache=new Map();
 window.MGSave={get:k=>cache.has(k)?cache.get(k):null,set(k,v){cache.set(k,v);},setMany(e){for(const [k,v] of e)cache.set(k,v);},removeProfile(key){for(const k of [...cache.keys()])if(k===key||String(k).startsWith(key+':'))cache.delete(k);},async flush(){},get error(){return '';}};
 if(!crypto.randomUUID)crypto.randomUUID=()=>([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));
 window.ARENA_NEU_TEST=true;   // Anschlüsse an echte 1.0-Spielstände (arena-game, aufstellung-game, box-game, hunderennen) bleiben aus
 window.ArenaCareer={test:true,startHidden:true,gold:0,fights:0,wins:0,roosters:[],lions:[],dogs:[],fallen:[],log:[],settle(){},record(){},addFallen(){},nextDay(){},close(){}};
 window.ArenaTheoryIntro={active:()=>false,finish(){}};
 // ---------- Spieldateien: dieselbe Liste wie boot.js (ohne Pixel-Varianten), ohne die Teile, die 1.0-Spielstände oder Seiten von 1.0 ansteuern ----------
 // Test at3-g9d1 prüft, dass diese Liste mit boot.js übereinstimmt (bis auf AUSSER).
 const DATEIEN=['profiles','data','household','management','scout','sim','begleithund','benchmark','school','world','forge','spy','kampfsound','zuschauer','audio','sprechsound','stimme','schreie','sprech-game','weapon-art','schild-art','arena','block-contact','hit-contact','reach-ai','techniques','manager','school-ui','world-ui','mobile','medicus-art','ludus','intro','forge-ui','forge-party','forge-intro','scene-nav','barracks','besondere','trader','wanderer-talk','wanderers','village-life','practice-yard','smith-wrath','archer-plot','hall','lion','hahn-engine','hahn-shots','hahn-arena','arena-beasts','arena-core','injury-shots','schaedelbruch','kader-filter','medic','battle-hud','face-shots','todes-fx','sturz-fx','gangarten','sortierung','doktor','annaehen','moderator','kino-kamera','arena-calibration','arena-challenges','arena-art','arena-game','arena-ui','box-engine','box-art','box-sfx','box-game','lesson','quality-odds','buy-odds-data','buy-odds','hahn-closeup','hs-career','hs-art','hs-sfx','huehnerschule','day-gold','equip-plus','wanderer-scene','beast-crypt','equip-quick','arena-report','outside-core','outside-art','outside-leader','outside-leader-ui','arena-leader-ui','relics','relic-masks','outside-notorious','bosses-1','bosses-2','bosses-3','bosses-4','bosses-5','outside-show','outside-wagon','outside','smith-quotes','scene-loader','bogner','hund','hund-sound','hund-shots','hund-zwinger','hundefang-texte','hundefang','hunderennen','netz-art','aufstellung-core','aufstellung-ui','talent-tags'];
 const AUSSER=['lanista-gier','aufstellung-game','ludus-render-test'];
 window.AT3_KAMPFFENSTER={DATEIEN,AUSSER};
 let fertig=0;const balken=()=>{const i=document.querySelector('#kfBoot i');if(i)i.style.width=Math.round(fertig/DATEIEN.length*100)+'%';};
 window.addEventListener('error',e=>{if(!window.AT3_KF_BEREIT)fehler(e.message);});
 // ---------- G9d4: Englisch beim Laden (kampf-en.js). Dateien aus sprache/kampf-en/index.json werden geholt, übersetzt und als Blob geladen. ----------
 // 1.0 bleibt unverändert. Fehlt etwas oder geht etwas schief, lädt die Datei einfach deutsch. ?de=1 schaltet die Übersetzung ab (zum Vergleichen).
 const EN=window.AT3_KF_EN={an:!/[?&]de=1/.test(location.search),dateien:0,ersetzt:0,code:0,ms:0,fehler:[]},blob={};
 // G9d4d Begriffe: Schlüsseltexte aus 1.0-Daten erst bei der Anzeige englisch (Seitentext, title, Canvas-Schrift, Stimme). Der Code rechnet weiter deutsch.
 // Kosten: nur geänderte Textstücke, jedes Wort einmal (Zwischenspeicher); gemessen in AT3_KF_EN.begriffeMs.
 let BG=null;
 function begriffeAn(tr){if(!tr||!tr.zahl)return;BG=tr;EN.begriffe=tr.zahl;EN.begriffeMs=0;
  const tx=n=>{const v=n.nodeValue,r=tr(v);if(r!==v)n.nodeValue=r;};
  const ti=e=>{const v=e.getAttribute&&e.getAttribute('title');if(v){const r=tr(v);if(r!==v)e.setAttribute('title',r);}};
  const lauf=root=>{if(root.nodeType===3){tx(root);return;}if(root.nodeType!==1||root.tagName==='SCRIPT'||root.tagName==='STYLE')return;ti(root);
   const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);let n;while((n=w.nextNode())){if(n.nodeType===3){const p=n.parentNode;if(p&&p.tagName!=='SCRIPT'&&p.tagName!=='STYLE')tx(n);}else ti(n);}};
  new MutationObserver(ms=>{const t0=performance.now();for(const m of ms){if(m.type==='characterData')tx(m.target);else if(m.type==='attributes')ti(m.target);else for(const n of m.addedNodes)lauf(n);}EN.begriffeMs+=performance.now()-t0;})
   .observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title']});
  lauf(document.body);
  const P=window.CanvasRenderingContext2D&&CanvasRenderingContext2D.prototype;
  if(P)for(const k of ['fillText','strokeText','measureText']){const o=P[k];P[k]=function(t){if(typeof t==='string'){const r=tr(t);if(r!==t){const a=[...arguments];a[0]=r;return o.apply(this,a);}}return o.apply(this,arguments);};}}
 async function englisch(){const KE=window.AT3KampfEN,t0=performance.now();if(!EN.an||!KE)return;
  const bgP=fetch('sprache/kampf-en/begriffe.json?v='+V).then(r=>r.json()).then(b=>{if(KE.begriffe)begriffeAn(KE.begriffe(b));}).catch(e=>EN.fehler.push('begriffe: '+e.message));
  try{const idx=await (await fetch('sprache/kampf-en/index.json?v='+V)).json();
   await Promise.all((idx.dateien||[]).filter(d=>DATEIEN.includes(d)).map(async d=>{try{
    const [src,w]=await Promise.all([fetch('../'+d+'.js?v='+V).then(r=>{if(!r.ok)throw Error(r.status);return r.text();}),fetch('sprache/kampf-en/'+d+'.json?v='+V).then(r=>{if(!r.ok)throw Error(r.status);return r.json();})]);
    const r=KE.uebersetze(src,w);blob[d]=URL.createObjectURL(new Blob([r.src+'\n//# sourceURL=en/'+d+'.js'],{type:'text/javascript'}));EN.dateien++;EN.ersetzt+=r.ersetzt;EN.code+=r.code;
   }catch(e){EN.fehler.push(d+': '+e.message);}}));
  }catch(e){EN.fehler.push('index: '+e.message);}
  await bgP;EN.ms=Math.round(performance.now()-t0);}
 englisch().then(()=>DATEIEN.forEach((n,i)=>{const s=document.createElement('script');s.async=false;s.src=blob[n]||'../'+n+'.js?v='+V;
  s.onload=()=>{fertig++;balken();if(blob[n])URL.revokeObjectURL(blob[n]);if(i===DATEIEN.length-1)setTimeout(bereit,0);};s.onerror=()=>fehler(n+' konnte nicht geladen werden');document.body.appendChild(s);}));

 // ---------- Nach dem Laden: Ludus wie die Testversionen (aufstellung-ui.js, Testteil), dann „bereit“ ----------
 let auftrag=null,bid=null,spec=null,aus=null,gesendet=false,t0=0;
 function bereit(){
  const M=window.MG,S=M&&M.s;if(!M||!window.AN){fehler('1.0 nicht vollständig geladen');return;}
  S.started=true;S.schoolName=S.schoolName||'Ludus';S.lanista=S.lanista||{name:'Lanista',height:180,weight:85,veteran:true,appearance:{skin:'#d9ac82',shade:'#9c7353',hair:'#443025',style:1,beard:2,cloth:'#435e6a'}};
  try{const W=M.workshop;if(!W.state.master)W.hireMaster(W.sketch());W.state.intro='done';}catch(e){}
  try{M.trader.state.intro='done';}catch(e){}
  if(S.hall)S.hall.tut='done';else S.hall={tut:'done',recruit:null,tag:{}};
  S.lion={stage:'done',recruits:[],base:[]};S.medic=Object.assign(S.medic||{},{stage:'skip'});S.archerPlot={seen:0,asked:true,state:'declined'};S.wanderers={version:1,next:(S.day||1)+99999,group:null,known:[]};
  // G9d4c (Thomas 17.11.2026): Anführer wie in 1.0 aktiv (ab 5 eigenen Kämpfern), Texte englisch über arena-leader-ui/outside-leader.json
  // Kampfbericht von 1.0 abwarten: manager.js zeigt nach jedem Kampf die gewohnte Berichtsseite (M.onFinish → page 'report')
  const fin=M.onFinish;M.onFinish=function(report){const r=fin?fin.apply(this,arguments):undefined;if(report&&bid&&report.id===bid)setTimeout(zurueckKnopf,0);return r;};
  // G9d4d: Gesprochenes ebenfalls mit englischen Begriffen (Moderator-Sätze mit Verletzungen, Körperteilen aus 1.0-Daten)
  if(BG&&typeof M.speakLine==='function'){const sp=M.speakLine;M.speakLine=function(t){if(typeof t==='string'){const a=[...arguments];a[0]=BG(t);return sp.apply(this,a);}return sp.apply(this,arguments);};}
  window.AT3_KF_BEREIT=true;melde({art:'bereit'});}
 window.addEventListener('message',e=>{if(e.source!==eltern||e.origin!==location.origin)return;const d=e.data||{};if(d.kf&&d.art==='auftrag'&&!auftrag){if(d.auftrag&&d.auftrag.modus)arena(d.auftrag);else starte(d.auftrag);}});

 // ---------- Kampf genau wie arena-ui.js fight() (Kampfansicht des Spiels) ----------
 function starte(a){
  const M=window.MG,S=M.s,AN=window.AN;auftrag=a;
  try{
   spec=JSON.parse(JSON.stringify(a.spec));
   // Die eigenen Gladiatoren sind der Kader dieses abgeschotteten Ludus (Kampfbericht und Lernen wie im Spiel)
   S.roster=spec.blue.filter(u=>u.kind==='human'&&u.g).map(u=>{u.g.enemy=false;return u.g;});
   for(const u of spec.red)if(u.g)u.g.enemy=true;
   S.rng=(a.seed>>>0)||1;S.gold=S.gold|0;
   S.battle=null;try{M.ui.click('nav:home');}catch(e){console.warn(e);}
   try{window.HahnArena?.resetScene?.();}catch(e){}
   M.stains=[];M.limbs=[];M.swings=[];M.floaters=[];M.shake=0;for(const p of [...(M.fx||[]),...(M.shots||[])])p.active=false;
   spec.league=0;const b=AN.build(spec);b.league=0;S.battle=b;bid=b.id;
   AN.listeners.push(o=>{if(S.battle===b||b.id===bid)aus=o;});
   document.getElementById('kfBoot')?.remove();t0=performance.now();
   M.ui.render();melde({art:'laeuft'});
  }catch(e){console.error(e);fehler(e&&e.message||e);}}


 // ---------- G9d2: Arena mit der Aufstellung aus 1.0 ----------
 let modus='',praemie=0,gewonnen=0,bewertung=null,offersZuletzt=[],festOffer=null,arenaBid=null,gestartet=false,vorKampf=null;
 // Herkunft der Gegner (Thomas 17.11.2026): ☠–☠☠ aus den drei nächsten Orten, ☠☠☠ aus den übrigen nahen Orten, ☠☠☠☠ aus der näheren, ☠☠☠☠☠ aus der ferneren Hälfte der fernen Städte
 function herkunft(o,orte){const N=(orte&&orte.nah)||[],F=(orte&&orte.fern)||[],sk=o.skulls|0;
  let L=sk<=2?N.slice(0,3):sk===3?N.slice(3):sk===4?F.slice(0,Math.ceil(F.length/2)):F.slice(Math.floor(F.length/2));if(!L.length)L=sk>=4&&F.length?F:N;if(!L.length)return;
  let h=2166136261;for(const c of String(o.id))h=Math.imul(h^c.charCodeAt(0),16777619);const ort=L[(h>>>0)%L.length];
  o.at3Ort={name:ort.name,art:ort.art,ortId:ort.ortId};o.label=o.label+' · from '+ort.name;  // G9d4c: Herkunft englisch
  for(const u of o.enemy||[])if(u.g)u.g.at3Herkunft={art:ort.art,ortId:ort.ortId,name:ort.name};}
 function hinweis(t){let h=document.getElementById('kfHinweis');if(!h){h=document.createElement('div');h.id='kfHinweis';document.body.appendChild(h);}h.textContent=t;clearTimeout(hinweis.z);hinweis.z=setTimeout(()=>h.remove(),9000);}
 function arena(a){
  const M=window.MG,S=M.s,A=window.Aufstellung,UI=window.AufstellungUI,AN=window.AN;auftrag=a;modus=a.modus==='kampf'?'kampf':'wahl';
  try{
   if(!A||!UI)throw Error('Aufstellung aus 1.0 fehlt');
   const l=document.createElement('link');l.rel='stylesheet';l.href='../aufstellung.css?v='+V;document.head.appendChild(l);document.body.classList.add('at3-arena');
   S.roster=(a.kader||[]).map(k=>{k.g.enemy=false;return k.g;});
   vorKampf=new Map(S.roster.map(g=>[String(g.id),g]));      // K0: 1.0 nimmt Tote nach dem Kampf aus dem Kader; ihre Daten (dead) kommen von hier
   S.aufstellung=JSON.parse(JSON.stringify((modus==='kampf'?a.termin&&a.termin.auf:a.auf)||{}));
   S.gold=a.gold|0;S.day=(a.heute|0)+1;S.rng=(a.seed>>>0)||1;S.battle=null;
   festOffer=modus==='kampf'?JSON.parse(JSON.stringify(a.termin.offer)):null;
   const orig=A.offers;A.offers=function(){if(festOffer)return [festOffer];const o=orig.apply(this,arguments);o.forEach(x=>herkunft(x,a.orte));offersZuletzt=o;return o;};
   const C=window.ArenaCareer;C.settle=g=>{praemie=Math.max(0,Math.round(+g||0));};C.record=w=>{gewonnen=w?1:0;};
   // G9d3: Bewertung des Kampfs (A.judge: Spektakel, Ruhmfaktor) für die Tickets abgreifen; 1.0 bleibt unverändert, nur umhüllt
   const tr0=A.tracker;A.tracker=function(){const T=tr0.apply(this,arguments),d0=T.done;T.done=function(){const r=d0.apply(this,arguments);if(modus==='kampf')bewertung=r;return r;};return T;};
   const b0=AN.build;AN.build=function(){const b=b0.apply(this,arguments);if(modus==='kampf'&&!arenaBid){arenaBid=b.id;gestartet=true;t0=performance.now();
     AN.listeners.push(o=>{aus=o;setTimeout(zurueckKnopf,1800);});document.getElementById('kfHinweis')?.remove();melde({art:'laeuft'});}return b;};
   document.getElementById('kfBoot')?.remove();
   UI.open();
   if(modus==='wahl'){hinweis('Pick your men and an opponent. FIGHT! books the fight for tomorrow at noon; your men stop working in time and walk to the arena.');return;}
   const klick=q=>{const el=document.querySelector('#auf '+q);if(el)el.click();return !!el;};
   klick('[data-act="ready"]');klick('[data-offer="0"]');klick('[data-act="fight"]');
   if(!gestartet)hinweis('Someone in the group is not fit to fight. Change the group, choose the opponent again and press FIGHT!.');
  }catch(e){console.error(e);fehler(e&&e.message||e);}}
 // Knöpfe der 1.0-Aufstellung: Probe ×10, Menü, Reparieren, Ausrüsten, Nächster Tag, Bericht gibt es hier nicht (gehören zum 1.0-Ludus); ◀ schließt das Fenster;
 // „KAMPF!“ setzt im Modus „wahl“ den Termin; nach dem Kampf führt „Nochmal“ zurück in die Welt
 document.addEventListener('click',e=>{if(!modus)return;const el=e.target.closest&&e.target.closest('#auf [data-act]');if(!el)return;const act=el.dataset.act;
  const halt=()=>{e.preventDefault();e.stopPropagation();};
  if(['probe','menu','classic','report','repair','equip','nextday'].includes(act)){halt();return;}
  if(act==='exit'){halt();if(!gestartet)melde({art:'abbruch',text:'closed'});else sende();return;}
  if(act==='again'&&modus==='kampf'){halt();sende();return;}
  if(act==='fight'&&modus==='wahl'){halt();const s=document.querySelector('#auf .a-offer.a-sel'),o=s?offersZuletzt[+s.dataset.offer]:null;if(!o)return;
   const st=JSON.parse(JSON.stringify(window.AufstellungUI.state||{}));
   melde({art:'termin',termin:{gids:(st.lineup||[]).map(x=>String(x.id)),offer:JSON.parse(JSON.stringify(o)),auf:st,label:o.label,skulls:o.skulls|0,ort:o.at3Ort||null}});}},true);
 function sendeArena(){if(gesendet||!aus)return;gesendet=true;const k=document.getElementById('kfZurueck');if(k){k.disabled=true;k.textContent='…';}
  const S=window.MG.s,ersetze=x=>{if(!x)return null;const t=JSON.stringify(x);return JSON.parse(arenaBid?t.split(JSON.stringify(arenaBid)).join(JSON.stringify('at3:'+auftrag.id)):t);};
  const G=id=>S.roster.find(g=>String(g.id)===String(id))||(vorKampf&&vorKampf.get(String(id)))||null;      // K0: Tote aus dem gemerkten Kader
  melde({art:'ergebnis',ergebnis:{auftrag:auftrag.id,arena:1,praemie,gewonnen,spekt:bewertung?+bewertung.spect||1:1,ruhmMul:bewertung?+bewertung.fameMul||1:1,auf:JSON.parse(JSON.stringify(S.aufstellung||{})),angesehen:true,dauerMs:Math.round(performance.now()-t0),
   sieger:aus.winner,zeit:aus.time,einheiten:aus.units.map(u=>({key:String(u.key),art:u.kind,name:u.name,team:u.team,tot:!!u.dead,unten:!!u.down,leben:u.health,verletzt:!!u.injured,schwer:!!u.severe,
    verletzungen:u.injuries||[],kills:u.kills||0,ursache:u.cause||'',toeter:u.killer||'',g:u.team===0?ersetze(G(u.key)):null}))}});}
 function zurueckKnopf(){if(document.getElementById('kfZurueck'))return;const k=document.createElement('button');k.id='kfZurueck';k.type='button';
  k.innerHTML='Back to the world ▸<small>Survivors carry their lessons home. The rest carry nothing.</small>';k.onclick=sende;document.body.appendChild(k);}

 // ---------- Ergebnis wie kampfkern.js KK.rechne, genau einmal ----------
 function sende(){if(modus){sendeArena();return;}if(gesendet||!auftrag)return;const o=aus||window.AN.last;if(!o){return;}gesendet=true;
  const k=document.getElementById('kfZurueck');if(k){k.disabled=true;k.textContent='…';}
  // 1.0 schreibt seine Kampfkennung (Uhrzeit + Zufall) in Wunden und Narben: durch die Auftragskennung ersetzen (wie der Kampfkern)
  const ersetze=x=>{if(!x)return null;const t=JSON.stringify(x);return JSON.parse(bid?t.split(JSON.stringify(bid)).join(JSON.stringify('at3:'+auftrag.id)):t);};
  const nachher={};for(const u of [...spec.blue,...spec.red])nachher[u.key]=ersetze(u.g||u.D||u.L);
  const erg={auftrag:auftrag.id,seed:auftrag.seed>>>0,sieger:o.winner,zeit:o.time,zeitAus:!!o.timeout,haengt:!!o.stuck,angesehen:true,
   dauerMs:Math.round(performance.now()-t0),
   einheiten:o.units.map(u=>({key:u.key,art:u.kind,name:u.name,team:u.team,tot:!!u.dead,unten:!!u.down,leben:u.health,verletzt:!!u.injured,schwer:!!u.severe,
    verletzungen:u.injuries||[],kills:u.kills||0,ursache:u.cause||'',toeter:u.killer||'',verlust:u.loss,g:nachher[u.key]||null}))};
  melde({art:'ergebnis',ergebnis:erg});}
})();
