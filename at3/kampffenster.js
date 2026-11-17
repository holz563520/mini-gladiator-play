'use strict';
// WAS DIE DATEI TUT: Kampffenster von Arena Theory 3.0 (Schritt G9d1, läuft nur im Rahmen kampffenster.html). Lädt das UNVERÄNDERTE Spiel 1.0 wie die
// Testversionen Aufstellung/Lanista (aufstellung-boot.js): Speicher abgeschottet, 1.0 schreibt nur in den Arbeitsspeicher dieses Rahmens, keine 1.0-Spielstände.
// Ablauf: Rahmen meldet „bereit“ → AT3 schickt einen Kampfauftrag (kampfanschluss.js KA.auftrag) → Kampf genau wie in 1.0 (arena-ui.js fight():
// AN.build, S.battle, Kampfansicht, Synchronisation, Minibilder, Nahaufnahmen, Urteil, Kampfbericht mit Lernfortschritt) → „Back to the world“ →
// Ergebnis im Format von kampfkern.js KK.rechne genau einmal an AT3 zurück. Der Rahmen wird danach entladen (Speicher am Handy).
// Kerne: 1.0 zeichnet und rechnet hier wie im Hauptspiel. AT3 hält seine Weltuhr während des Kampfs an (Entscheidung Thomas 17.11.2026).
// Sprache: Der Kampf ist wie 1.0 deutsch (Entscheidung Thomas 17.11.2026, Übersetzung später als eigener Schritt). Nur Lade- und Zurück-Knopf sind englisch.
var BUILD='1426653a';
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
 DATEIEN.forEach((n,i)=>{const s=document.createElement('script');s.async=false;s.src='../'+n+'.js?v='+V;
  s.onload=()=>{fertig++;balken();if(i===DATEIEN.length-1)setTimeout(bereit,0);};s.onerror=()=>fehler(n+' konnte nicht geladen werden');document.body.appendChild(s);});

 // ---------- Nach dem Laden: Ludus wie die Testversionen (aufstellung-ui.js, Testteil), dann „bereit“ ----------
 let auftrag=null,bid=null,spec=null,aus=null,gesendet=false,t0=0;
 function bereit(){
  const M=window.MG,S=M&&M.s;if(!M||!window.AN){fehler('1.0 nicht vollständig geladen');return;}
  S.started=true;S.schoolName=S.schoolName||'Ludus';S.lanista=S.lanista||{name:'Lanista',height:180,weight:85,veteran:true,appearance:{skin:'#d9ac82',shade:'#9c7353',hair:'#443025',style:1,beard:2,cloth:'#435e6a'}};
  try{const W=M.workshop;if(!W.state.master)W.hireMaster(W.sketch());W.state.intro='done';}catch(e){}
  try{M.trader.state.intro='done';}catch(e){}
  if(S.hall)S.hall.tut='done';else S.hall={tut:'done',recruit:null,tag:{}};
  S.lion={stage:'done',recruits:[],base:[]};S.medic=Object.assign(S.medic||{},{stage:'skip'});S.archerPlot={seen:0,asked:true,state:'declined'};S.wanderers={version:1,next:(S.day||1)+99999,group:null,known:[]};
  M.leaderArena=false;
  // Kampfbericht von 1.0 abwarten: manager.js zeigt nach jedem Kampf die gewohnte Berichtsseite (M.onFinish → page 'report')
  const fin=M.onFinish;M.onFinish=function(report){const r=fin?fin.apply(this,arguments):undefined;if(report&&bid&&report.id===bid)setTimeout(zurueckKnopf,0);return r;};
  window.AT3_KF_BEREIT=true;melde({art:'bereit'});}
 window.addEventListener('message',e=>{if(e.source!==eltern||e.origin!==location.origin)return;const d=e.data||{};if(d.kf&&d.art==='auftrag'&&!auftrag)starte(d.auftrag);});

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

 function zurueckKnopf(){if(document.getElementById('kfZurueck'))return;const k=document.createElement('button');k.id='kfZurueck';k.type='button';
  k.innerHTML='Back to the world ▸<small>Survivors carry their lessons home. The rest carry nothing.</small>';k.onclick=sende;document.body.appendChild(k);}

 // ---------- Ergebnis wie kampfkern.js KK.rechne, genau einmal ----------
 function sende(){if(gesendet||!auftrag)return;const o=aus||window.AN.last;if(!o){return;}gesendet=true;
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
