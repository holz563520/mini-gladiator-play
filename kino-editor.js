'use strict';
// =====================================================================================================
// KINO-EDITOR (Wunsch Thomas 10.11.2026): Möglichkeiten für den Kino-Moment bei schweren Verletzungen anschauen.
// Wer den Schaden zufügt und wer ihn empfängt groß, der Rest ausgeblendet, schwarzer Hintergrund, Nahaufnahme im Takt.
// Läuft auf dem echten Spiel (boot.js) mit echten Testkämpfen im Kampf-HUD. Der Spielstand wird hier NICHT gespeichert
// (Schreiben in den Browserspeicher ist gesperrt, außer der gewählten Kino-Einstellung 'mg-kino-look').
// =====================================================================================================
(()=>{
/* Spielstand schützen: nur die Kino-Einstellung darf geschrieben werden */
try{const set=Storage.prototype.setItem,rem=Storage.prototype.removeItem;
 Storage.prototype.setItem=function(k,v){if(String(k).startsWith('mg-kino')||k==='mg-tempo2')return set.call(this,k,v);};
 Storage.prototype.removeItem=function(k){if(String(k).startsWith('mg-kino'))return rem.call(this,k);};}catch{}
const $=id=>document.getElementById(id);
const OPT={
 layout:['Aufteilung',[['split','Geteilt (nebeneinander)'],['pip','Kämpfer groß + Nahaufnahme klein'],['piprev','Nahaufnahme groß + Kämpfer klein'],['cut','Schnittfolge (Kämpfer → Wunde → beide)'],['alt','Bisher']]],
 frame:['Bildgröße',[['schirm','Ganzer Bildschirm'],['feld','Nur das Kampffeld']]],
 bg:['Hintergrund',[['schwarz','Schwarz'],['spot','Scheinwerfer'],['dunkel','Abgedunkelt'],['arena','Arena wie immer']]],
 others:['Andere Kämpfer',[['0','Unsichtbar'],['0.12','Schatten'],['0.32','Durchsichtig']]],
 who:['Im Bild',[['paar','Nur Schläger und Getroffener'],['gruppe','Alle, die gerade zuschlagen (bis 3)']]],
 slow:['Zeitlupe',[['2','1/2 (Kämpfer laufen mit der Nahaufnahme)'],['4','1/4'],['8','1/8'],['16','1/16'],['0','Standbild']]],
 sync:['Takt',[['gemeinsam','Gemeinsam: Blitz, Wackeln, Herzschlag in beiden Bildern'],['frei','Frei (ohne)']]],
 grade:['Farbe',[['normal','Normal'],['warm','Warm'],['rot','Blutrot'],['kalt','Kalt'],['blass','Ausgeblichen']]],
 bars:['Kinobalken',[['0','Aus'],['7','Schmal'],['9','Mittel'],['12','Breit']]]};
const WEAP=[['gladius','Gladius'],['axe','Axt'],['mace','Streitkolben'],['hammer','Hammer'],['spear','Speer'],['greatsword','Zweihandschwert'],['doubleaxe','Doppelaxt'],['trident','Dreizack'],['dagger','Dolch'],['bow','Bogen'],['mix','Gemischt']];
let M=null,look=null,fights=0,moments=0,auto=true;
function css(){const st=document.createElement('style');st.textContent=`
#kinoEd{position:fixed;left:8px;top:8px;z-index:10000;width:min(330px,calc(100vw - 16px));max-height:calc(100vh - 16px);overflow:auto;background:rgba(14,10,8,.94);border:2px solid #b08a4a;box-shadow:0 6px 30px #000;font:12px 'Courier Prime',monospace;color:#efe3c4;padding:8px 10px 10px}
#kinoEd.zu{width:auto;padding:4px 8px}#kinoEd.zu .ke-body{display:none}
#kinoEd h3{margin:0;font-size:13px;letter-spacing:.12em;color:#f4d37a;display:flex;justify-content:space-between;align-items:center;gap:8px;cursor:pointer}
#kinoEd .ke-pre{display:flex;flex-wrap:wrap;gap:4px;margin:8px 0}
#kinoEd button{font:inherit;font-size:11px;color:#efe3c4;background:#2a1f17;border:1px solid #6d5636;padding:4px 7px;cursor:pointer}
#kinoEd button.on{background:#7a5320;border-color:#f4d37a;color:#fff6dc}
#kinoEd label{display:grid;grid-template-columns:96px 1fr;align-items:center;gap:6px;margin:4px 0}
#kinoEd select,#kinoEd input[type=range]{font:inherit;font-size:11px;width:100%;background:#1c1510;color:#efe3c4;border:1px solid #6d5636}
#kinoEd .ke-st{margin:8px 0 6px;padding:5px 7px;background:#1c1510;border-left:3px solid #6d5636;min-height:2.4em}
#kinoEd .ke-st.live{border-color:#e0524a;color:#ffd9c8}
#kinoEd .ke-row{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}
#kinoEd .ke-use{background:#3b5a2a;border-color:#8bc06a}
#kinoEd small{color:#b9a27a}
#kinoEd.film:not(:hover){opacity:.22;transition:opacity .3s}
#kinoEd hr{border:0;border-top:1px solid #4a3b28;margin:8px 0}`;document.head.appendChild(st);}
function sel(key){const [name,list]=OPT[key];return `<label><span>${name}</span><select data-k="${key}">${list.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label>`;}
function panel(){const P=M.kinoCam.presets,el=document.createElement('div');el.id='kinoEd';
 el.innerHTML=`<h3><span>🎬 KINO-EDITOR</span><small class="ke-tog">einklappen</small></h3><div class="ke-body">
 <div class="ke-pre">${Object.entries(P).map(([k,p])=>`<button data-p="${k}">${p.name}</button>`).join('')}</div>
 ${Object.keys(OPT).map(sel).join('')}
 <label><span>Nähe</span><input type="range" data-k="fill" min="0.5" max="0.97" step="0.01"></label>
 <label><span>Bewegungs&shy;tempo</span><input type="range" id="keTempo" min="0.7" max="1" step="0.05"></label><div style="text-align:right;margin-top:-4px"><small id="keTempoV"></small></div>
 <label><span>Kino-Ton</span><select id="keTon"><option value="1">An (Zeitlupe, Herzschlag, Dröhnen)</option><option value="0">Aus</option></select></label>
 <div class="ke-st" id="keSt">Testkampf wird vorbereitet …</div>
 <hr><label><span>Waffen</span><select id="keW">${WEAP.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label>
 <label><span>Kämpfer</span><select id="keN"><option value="1">1 gegen 1</option><option value="2">2 gegen 2</option><option value="3" selected>3 gegen 3</option><option value="5">5 gegen 5</option></select></label>
 <label><span>Rüstung</span><select id="keA"><option value="none">Keine</option><option value="leather">Leder</option><option value="metal">Metall</option></select></label>
 <div class="ke-row"><button id="keNew">Neuer Kampf</button><button id="kePause">Pause</button><button id="keSkip">Moment überspringen</button></div>
 <hr><div class="ke-row"><button id="keUse" class="ke-use">Im Spiel verwenden</button><button id="keOld">Spiel: „Bisher“</button></div>
 <div style="margin-top:6px"><small id="keGame"></small></div></div>`;
 document.body.appendChild(el);if(innerWidth<600){el.classList.add('zu');el.querySelector('.ke-tog').textContent='aufklappen';}
 el.querySelector('h3').onclick=()=>{el.classList.toggle('zu');el.querySelector('.ke-tog').textContent=el.classList.contains('zu')?'aufklappen':'einklappen';};
 el.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{setLook(P[b.dataset.p].look);});
 el.querySelectorAll('[data-k]').forEach(i=>i.oninput=()=>{const k=i.dataset.k,v=i.value;setLook({...look,[k]:['others','slow','bars','fill'].includes(k)?+v:v});});
 {const r=$('keTempo'),v=$('keTempoV'),show=()=>{v.textContent=Math.round(M.battleTempo*100)+' % (gilt auch im Spiel)';};r.value=String(M.battleTempo);show();r.oninput=()=>{M.setBattleTempo(+r.value);show();};}
 $('keTon').value=M.kinoCam.sound?'1':'0';$('keTon').onchange=()=>{M.kinoCam.sound=$('keTon').value==='1';};
 $('keNew').onclick=()=>newFight();$('kePause').onclick=()=>{const b=M.s.battle;if(b){b.paused=!b.paused;$('kePause').classList.toggle('on',b.paused);}};
 $('keSkip').onclick=()=>M.injuryShots.skip?.();
 $('keW').onchange=$('keN').onchange=$('keA').onchange=()=>newFight();
 $('keUse').onclick=()=>{M.kinoCam.setLook(look,true);gameInfo();};
 $('keOld').onclick=()=>{M.kinoCam.setLook(M.kinoCam.presets.bisher.look,true);setLook(look);gameInfo();};}
function gameInfo(){let j=null;try{j=JSON.parse(localStorage.getItem('mg-kino-look')||'null');}catch{}const P=M.kinoCam.presets,norm=o=>JSON.stringify({...M.kinoCam.defaults,...o}),cur=j||M.kinoCam.gameDefault,hit=Object.entries(P).find(([,p])=>norm(p.look)===norm(cur));$('keGame').textContent='Im Spiel (auf diesem Gerät): '+(hit?hit[1].name:'eigene Einstellung')+(j?'':' (Standard)');}
function setLook(v){look={...M.kinoCam.defaults,...v};M.kinoCam.setLook(look,false);
 document.querySelectorAll('#kinoEd [data-k]').forEach(i=>{i.value=String(look[i.dataset.k]);});
 const P=M.kinoCam.presets;document.querySelectorAll('#kinoEd [data-p]').forEach(b=>b.classList.toggle('on',JSON.stringify({...M.kinoCam.defaults,...P[b.dataset.p].look})===JSON.stringify(look)));}
function newFight(){const S=M.s;try{if(S.battle)M.endBenchmark(-1,'Kino-Editor');}catch{}const n=+$('keN').value,w=$('keW').value,a=$('keA').value,mix=['gladius','axe','mace','spear','hammer','bow','greatsword','trident'];
 /* jeder Kämpfer einzeln (Thomas 10.11.: „gemischt“ wurde nicht übernommen); die gespeicherten Vorgaben der Testkampf-Seite (Rüstung, Rollen, Einzelwerte) gelten hier nicht */
 const off=Math.floor(Math.random()*mix.length),wOf=(t,i)=>w==='mix'?mix[(off+i*2+t*3)%mix.length]:w,shOf=wid=>['greatsword','doubleaxe','halberd','bow','spear','trident','hammer'].includes(wid)?'none':'roundshield';
 const entries=[0,1].map(t=>Array.from({length:n},(_,i)=>{const wid=wOf(t,i);return {role:wid==='bow'?'Fernkämpfer':'Soldat',weapon:wid,armor:a,shield:shOf(wid),quality:2};}));
 const err=M.startBenchmark({count:n,count0:n,count1:n,role0:'Soldat',role1:'Soldat',weapon0:wOf(0,0),weapon1:wOf(1,0),armor0:a,armor1:a,shield0:'auto',shield1:'auto',quality0:2,quality1:2,entries,gen:null,bodyHp:null,bodyHp0:null,bodyHp1:null,teamTactics:null,leaderIndices:null,scatter:false,varied:false,selfFight:null,fighters:null,seed:(Math.random()*4294967295>>>0)||7});
 if(err){$('keSt').textContent='Fehler: '+err;return;}fights++;M.ui.render();$('kePause').classList.remove('on');}
function tick(){const S=M.s,b=S.battle,st=$('keSt');
 /* Ladebild „Weiter“ selbst drücken */const go=document.querySelector('.smith-loading-continue');if(go&&!go.hidden&&go.offsetParent)go.click();
 if(!b){if(auto)newFight();return;}if(b.result){if(auto&&!b.kinoEdEnd){b.kinoEdEnd=performance.now();}if(b.kinoEdEnd&&performance.now()-b.kinoEdEnd>2500)newFight();st.textContent='Kampf vorbei – neuer Kampf startet …';st.classList.remove('live');return;}
 $('kinoEd')?.classList.toggle('film',M.kinoCam.on);if(M.kinoCam.on){if(!tick.on)moments++;tick.on=true;st.classList.add('live');st.textContent='Kino-Moment läuft ('+(M.kinoCam.state().split||'')+') · Nr. '+moments;}
 else{tick.on=false;st.classList.remove('live');st.textContent='Warte auf die nächste schwere Verletzung … (Kampf '+fights+', bisher '+moments+' Momente). Änderungen gelten ab dem nächsten Moment.';}}
function ready(){M=window.MG;if(!M?.kinoCam?.setLook||!M.ui||!M.startBenchmark){setTimeout(ready,150);return;}
 /* Spielstand nicht speichern (IndexedDB) */try{if(window.MGSave){MGSave.set=()=>{};MGSave.setMany=()=>{};}}catch{}
 try{M.persist=()=>{};}catch{}
 const o=M.s.options;o.closeups='all';/* Stufe wie im Spiel: Standard (injury-shots.js) */
 css();panel();setLook(M.kinoCam.look.layout==='alt'?M.kinoCam.presets.buehne.look:M.kinoCam.look);gameInfo();
 try{M.ui.click('nav:benchmark');}catch{}newFight();setInterval(tick,250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
