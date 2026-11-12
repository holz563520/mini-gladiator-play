'use strict';
// =====================================================================================================================
// TAGESLAUF-EDITOR (tageslauf-editor.html) · Werkzeuge zum Prüfen von Uhr, Licht, Tageswechsel, Nahaufnahme und Pinzette.
// Lädt die Weltkarten-Testversion (abgeschirmt, nichts wird gespeichert) mit welt-zeit.js, welt-saetze.js, welt-leben.js.
// Nur Prüfwerkzeuge: Uhrzeit springen, Tempo, Tageslänge, Licht an/aus, Testkader mit Verletzungen, Liste aller Sätze.
// =====================================================================================================================
(()=>{
const M=window.MG,W=window.WeltKarte,T=M?.weltTag,L=M?.weltLeben,Z=window.WeltSaetze;if(!T||!L)return;const S=M.s,$=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// AT2 (arena-theory-2.html): dieselbe Karte als „Arena Theory 2.0“, erreichbar aus dem Hauptmenü des Spiels; Werkzeuge anfangs eingeklappt
const AT2=!!window.AT2,sub=document.querySelector('.w-title');if(sub)sub.innerHTML=AT2?'<b>ARENA THEORY 2.0</b><small>Vorschau · nichts wird gespeichert · <a href="index.html" style="color:#f4d37a">zum Hauptspiel</a></small>':'<b>RASTERKARTE</b><small>Editor · nichts wird gespeichert</small>';
const ed=document.createElement('aside');ed.id='wEdit';ed.innerHTML=`<header><b>EDITOR</b><button class="w-x" data-fold aria-label="Einklappen">▾</button></header><div class="ed-body">
<p class="ed-h">Uhrzeit</p><div class="ed-row" data-zeit><button class="w-btn" data-h="5.6">kurz vor Tageswechsel</button><button class="w-btn" data-h="7">Morgen</button><button class="w-btn" data-h="12">Mittag</button><button class="w-btn" data-h="18.4">Abend</button><button class="w-btn" data-h="20.6">Dämmerung</button><button class="w-btn" data-h="23">Nacht</button></div>
<p class="ed-h">Tempo (nur zum Prüfen)</p><div class="ed-row" data-tempo><button class="w-btn" data-t="0">⏸</button><button class="w-btn on" data-t="1">1×</button><button class="w-btn" data-t="4">4×</button><button class="w-btn" data-t="20">20×</button></div>
<p class="ed-h">Tag</p><div class="ed-row"><label class="w-sel">Länge <select data-len><option value="120">2 Minuten</option><option value="240" selected>4 Minuten</option><option value="360">6 Minuten</option></select></label><label class="w-sel"><input type="checkbox" data-licht checked> Licht</label><label class="w-sel"><input type="checkbox" data-raster checked> Raster</label></div>
<div class="ed-row"><button class="w-btn" data-feier>Tageswechsel-Animation zeigen</button></div>
<p class="ed-h">Bauen</p><div class="ed-row"><button class="w-btn" data-gold>+1000 Gold</button></div>
<p class="ed-h">Leistung prüfen: wie viele Figuren?</p>
<label class="ed-reg">Gladiatoren <b data-gv>60</b><input type="range" data-gz min="10" max="1000" step="10" value="60"></label>
<label class="ed-reg">Besucher <b data-bv>100</b><input type="range" data-besucher min="0" max="3000" step="50" value="100"></label><span data-bz class="w-tiny"></span>
<p class="ed-h">Gladiatoren</p><div class="ed-row"><button class="w-btn" data-wund>Verletzungen und Kampfgeschichte geben</button><button class="w-btn" data-rand>Zufälligen ansprechen</button><button class="w-btn" data-alle>Alle Sätze des Gewählten</button></div>
<div class="ed-list" data-list hidden></div>
<p class="w-tiny">Figur antippen: Nahaufnahme. „Hochnehmen“: Pinzette, dann Karte antippen zum Absetzen (Esc stellt zurück). Weit herauszoomen: Miniaturansicht.</p></div>`;
document.getElementById('weltUi').appendChild(ed);if(AT2){ed.classList.add('zu');ed.querySelector('[data-fold]').textContent='▸';ed.querySelector('header b').textContent='TEST-WERKZEUGE';}
ed.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.fold!=null){ed.classList.toggle('zu');b.textContent=ed.classList.contains('zu')?'▸':'▾';}
 else if(b.dataset.h){T.setze(+b.dataset.h);}
 else if(b.dataset.t){const t=+b.dataset.t;T.pause(t===0);if(t)T.tempo(t);for(const x of ed.querySelectorAll('[data-t]'))x.classList.toggle('on',x===b);}
 else if(b.dataset.feier!=null)T.feier(S.day-1,S.day);
 else if(b.dataset.gold!=null){S.gold=(S.gold||0)+1000;}
 else if(b.dataset.wund!=null){wunden();}
 else if(b.dataset.rand!=null){const sh=W.shown();const pick=sh[Math.floor(Math.random()*sh.length)]||null;if(pick){W.flyTo(pick.x,pick.y,Math.max(W.cam.s,1.3));L.open(pick.w.g);}}
 else if(b.dataset.alle!=null){const box=ed.querySelector('[data-list]'),g=L.sel;if(!g){box.hidden=false;box.textContent='Erst eine Figur antippen.';return;}
  const all=Z.alle(g,{stunde:T.stunde,partName:M.partName,andere:S.roster.map(x=>x.name)});box.hidden=false;
  box.innerHTML='<b>'+esc(g.name)+' · '+all.length+' mögliche Sätze</b>'+all.map(x=>'<p><i>'+esc(x.art)+'</i> '+esc(x.t)+'</p>').join('')+'<p><i>pinzette</i> '+[...Z.UP,...Z.DOWN].map(x=>esc(x[0])).join('</p><p><i>pinzette</i> ')+'</p>';}});
const gz=ed.querySelector('[data-gz]'),bz=ed.querySelector('[data-besucher]');
gz.oninput=()=>ed.querySelector('[data-gv]').textContent=gz.value;gz.onchange=()=>W.makeRoster(+gz.value);
bz.oninput=()=>{ed.querySelector('[data-bv]').textContent=bz.value;M.weltBesucher?.setze(+bz.value);};setInterval(()=>{const V=M.weltBesucher;if(V)ed.querySelector('[data-bz]').textContent=(V.sitze().length-V.freie())+' Plätze vergeben, '+V.freie()+' frei';},1000);
ed.querySelector('[data-len]').onchange=e=>T.laenge(+e.target.value);ed.querySelector('[data-licht]').onchange=e=>T.lichtAn(e.target.checked);ed.querySelector('[data-raster]').onchange=e=>W.raster(e.target.checked);
// Testdaten: Verletzungen, fehlende Glieder, Siege und Niederlagen. Nur auf den Kopien dieser Seite (Speicher abgeschirmt).
const FOES=['die Wölfe von Capua','Ludus Sanguis','die Schlächter aus Ostia','Haus Corvus','die Brüder vom Schindanger'],INJ=['Tiefe Schnittwunde','Durchstochen','Trümmerbruch','Prellung bis auf den Knochen'],LIMB=['lua','rua','lfa','rfa','lt','rt','lsh','rsh','ls','rs'];
function wunden(){const list=S.roster.filter(g=>!g.dead);list.forEach((g,i)=>{const r=(i*7+3)%10;g.fights=2+(i%9);g.wins=Math.round(g.fights*((i%4)/3.5));g.losses=g.fights-g.wins;g.kills=i%5===0?5+(i%4):i%3;g.fame=(i*13)%40;g.history=g.history||[];
  g.history.unshift({day:S.day,text:(i%3?'Sieg':'Niederlage')+' gegen '+FOES[i%FOES.length]+' · '+(20+i%60)+' Schaden.'});
  if(r<4){const id=LIMB[(i*3)%LIMB.length],foe=list[(i+5)%list.length].name;try{M.noteInjury(g,id,INJ[i%INJ.length],'Brutus der Schlächter','Gladius');}catch(e){g.body[id].injury=INJ[i%INJ.length];}g.body[id].hp=28+(i%30);g.body[id].grade=M.injuryGrade?.(g.body[id])??2;}
  if(r===5||r===8){const id=['lh','rh','lfa','lf'][i%4];for(const k of M.branches?.[id]||[id]){const p=g.body[k];p.missing=true;p.hp=0;p.bleed=0;p.grade=5;p.injury='Abgetrennt';}}
  if(r===6){g.fatigue=75;}if(r===7)g.blood=68;});
 W.sprites?.clear?.();M.ui.notify?.('Testkader: Verletzungen, fehlende Glieder und Kampfgeschichte verteilt.');}
window.TAGESLAUF_READY=true;
})();
