'use strict';
// WELTKARTE · EIGENSTÄNDIGE TESTVERSION (wie die Aufstellungs-Testversion): lädt das unveränderte Spiel, aber ohne Zugriff
// auf echte Spielstände. Das Spiel schreibt nur in den Arbeitsspeicher dieser Seite; nichts wird dauerhaft gespeichert.
// Ausnahme Arena Theory 2.0 (window.AT2): eigener Spielstand in eigener Datenbank über welt-spielstand.js, nie die von 1.0.
var BUILD='97b3f6ad';
(()=>{
 let real=null;try{real=window.localStorage;}catch{}
 window.WELT_STORE={get(k){try{return real?real.getItem(k):null;}catch{return null;}},set(k,v){try{real&&real.setItem(k,v);return true;}catch{return false;}},del(k){try{real&&real.removeItem(k);}catch{}}};
 const mem=new Map(),fake={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>{mem.set(String(k),String(v));},removeItem:k=>{mem.delete(k);},clear:()=>mem.clear(),key:i=>[...mem.keys()][i]??null,get length(){return mem.size;}};
 try{Object.defineProperty(window,'localStorage',{configurable:true,get:()=>fake});}catch{}
 let shielded=false;try{shielded=window.localStorage===fake;}catch{}
 if(!shielded&&/github\.io$|chatgpt\.site$/.test(location.hostname)){document.title='Testversion gestoppt';throw Error('Die Testversion konnte den Speicher nicht abschotten und startet deshalb nicht.');}
 if(!crypto.randomUUID)crypto.randomUUID=()=>([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));
 const cache=new Map();
 window.MGSave={get:k=>cache.has(k)?cache.get(k):null,set(k,v){cache.set(k,v);},setMany(e){for(const [k,v] of e)cache.set(k,v);},removeProfile(key){for(const k of [...cache.keys()])if(k===key||String(k).startsWith(key+':'))cache.delete(k);},async flush(){},get error(){return '';}};
 window.ARENA_NEU_TEST=true;
 // Die Arena-Oberfläche des Spiels erwartet einen Gastgeber; hier bleibt sie geschlossen (startHidden) und bucht nichts
 window.ArenaCareer={test:true,startHidden:true,gold:0,fights:0,wins:0,roosters:[],lions:[],dogs:[],fallen:[],log:[],settle(){},record(){},addFallen(){},nextDay(){},close(){}};   // Anschluss der Arena an echte Spielstände (arena-game.js) bleibt aus
 window.ArenaTheoryIntro={active:()=>false,finish(){}};
 // Ladebild-Vorbereitung des Spiels (scene-loader.js) aus: sie bereitet beim Start den Ludus vor und hält bis zum Antippen
 // von „Weiter“ jede Simulation an – auch den Kampf. Vorhandener Schalter des Spiels: ?preload=off
 try{const u=new URL(location.href);if(u.searchParams.get('preload')!=='off'){u.searchParams.set('preload','off');history.replaceState(null,'',u.toString());}}catch{}
 // Spieldateien wie boot.js (ohne Pixel-Varianten und Aktualisierungshinweis), danach der Simulator
 const files=['profiles','data','household','management','scout','sim','benchmark','school','world','forge','spy','kampfsound','audio','sprechsound','sprech-game','weapon-art','arena','techniques','manager','school-ui','world-ui','mobile','medicus-art','ludus','intro','forge-ui','forge-party','forge-intro','scene-nav','barracks','trader','wanderer-talk','wanderers','village-life','practice-yard','smith-wrath','archer-plot','hall','lion','hahn-engine','hahn-shots','hahn-arena','arena-beasts','arena-core','injury-shots','medic','battle-hud','face-shots','doktor','moderator','arena-calibration','arena-challenges','arena-art','arena-game','arena-ui','box-engine','box-art','box-sfx','box-game','lesson','quality-odds','buy-odds-data','buy-odds','hahn-closeup','hs-career','hs-art','hs-sfx','huehnerschule','day-gold','equip-plus','wanderer-scene','beast-crypt','equip-quick','arena-report','outside-core','outside-art','outside-leader','outside-leader-ui','arena-leader-ui','relics','relic-masks','outside-notorious','bosses-1','bosses-2','bosses-3','bosses-4','bosses-5','outside-show','outside-wagon','outside','smith-quotes','scene-loader','bogner','hund','hund-sound','hund-shots','hund-zwinger','hundefang-texte','hundefang','hunderennen','netz-art','talent-tags',...(window.WELT_VOR||[]),window.WELT_KARTE||'welt-karte',...(window.WELT_EXTRA||[])];// WELT_EXTRA: weitere Module einer Testseite (z. B. tageslauf-editor.html)
 const fail=msg=>{const el=document.getElementById('weltBoot');if(el)el.innerHTML='<b>Testversion konnte nicht starten</b><br>'+String(msg).replace(/</g,'&lt;')+'<br><button onclick="location.reload()">Erneut laden</button>';};
 let done=0;const bar=()=>{const i=document.querySelector('#weltBoot i');if(i)i.style.width=Math.round(done/files.length*100)+'%';};
 const ctx={cache,mem};
 const laden=()=>{for(const name of files){const s=document.createElement('script');s.async=false;s.src=name+'.js?v='+BUILD;s.onload=()=>{done++;bar();if(done===files.length&&window.AT2)window.AT2Spielstand?.anschliessen(ctx);};s.onerror=()=>fail(name+' konnte nicht geladen werden.');document.body.appendChild(s);}};
 // Arena Theory 2.0 (A2): zuerst das Startbild mit den 3 Spielständen (welt-spielstand.js), es füllt Zwischenspeicher und
 // abgeschirmten localStorage mit dem gewählten Stand; erst danach wird das Spiel geladen. Andere Kartenseiten speichern nichts.
 // S1: davor der Sprachkern mit den Sprachdateien (welt-sprache.js, welt-text-de.js, welt-text-en.js).
 if(window.AT2){const vorab=['welt-sprache','welt-text-de','welt-text-en','welt-spielstand'];let n=0;
  for(const name of vorab){const s=document.createElement('script');s.async=false;s.src=name+'.js?v='+BUILD;s.onload=()=>{if(++n===vorab.length)window.AT2Spielstand.start(ctx).then(laden);};s.onerror=()=>fail(name+' konnte nicht geladen werden.');document.body.appendChild(s);}}
 else laden();
 window.addEventListener('error',e=>{if(!window.WELT_READY)fail(e.message);});
})();
