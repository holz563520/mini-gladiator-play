'use strict';
// SPIELFELD-ANSICHT (Simulation, nur auf spielfeld.html): Es erscheint nur noch das Spielfeld. Verwaltungsseiten öffnen sich über die Gebäude
// (wie bisher), Hauptmenü und Tageswechsel sind eigene Knöpfe. Gleicher Spielstand wie im normalen Spiel; Spielregeln unverändert.
(()=>{
const start=()=>{const M=window.MG;if(!M?.ui?.getPage||!M.s){setTimeout(start,150);return;}const S=M.s,esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]),fmt=n=>Math.round(n||0).toLocaleString('de-DE');
 document.body.classList.add('mapui');
 const bar=document.createElement('div');bar.id='mapuiBar';
 bar.innerHTML='<button class="btn mapui-menu" type="button" data-mapui="menu" aria-label="Hauptmenü öffnen">☰ Menü</button><button class="btn mapui-home" type="button" data-action="nav:home">✕ Zum Spielfeld</button><button class="btn primary mapui-day" type="button" data-action="rest">NÄCHSTER TAG ▸<small id="mapuiDay"></small></button>';
 document.body.appendChild(bar);
 const sheet=document.createElement('div');sheet.id='mapuiMenu';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-label','Hauptmenü');document.body.appendChild(sheet);
 const item=(action,label)=>`<button class="btn" type="button" data-action="${action}">${label}</button>`;
 function menu(){return `<div class="mapui-sheet"><header><div><strong>${esc((S.schoolName||'Ludus').toUpperCase())}</strong><small>Hauptmenü</small></div><button class="btn" type="button" data-mapui="close" aria-label="Schließen">✕</button></header>
<div class="mapui-res"><div>Gold<b>◈ ${fmt(S.gold)}</b></div><div>Ruhm<b>${fmt(S.fame)}</b></div><div>Tag<b>${fmt(S.day)}</b></div><div>Sold/Tag<b>${fmt(M.dailySold?.())} G</b></div></div>
<nav aria-label="Hauptmenü">${item('nav:home','⌂ Spielfeld')}${item('nav:arena','⚔ Arena')}${item('nav:team','♜ Kader')}${item('nav:equipment','⚒ Ausrüstung')}${item('nav:automation','▥ Mehr')}
<h4>LUDUS</h4>${item('ludus:owner','Lanista')}${item('nav:profiles','Spielstände')}${item('nav:stats','Statistik')}${item('nav:options','Optionen')}</nav></div>`;}
 document.addEventListener('click',e=>{const m=e.target.closest?.('[data-mapui]');if(m){e.preventDefault();e.stopPropagation();if(m.dataset.mapui==='menu'){sheet.innerHTML=menu();sheet.hidden=false;}else sheet.hidden=true;return;}
  if(!sheet.hidden&&(e.target===sheet||e.target.closest?.('#mapuiMenu [data-action]')))setTimeout(()=>{sheet.hidden=true;},0);},true);
 // Zustand nachführen: Spielfeld oder Verwaltungsseite, Kampf und Intros blenden die Knöpfe aus
 let last='';setInterval(()=>{const page=M.ui.getPage(),busy=!!S.battle||!!M.intro?.active?.()||!!window.ArenaTheoryIntro?.active?.()||!!document.querySelector('.smith-ceremony,#introView,#brandIntro');const key=page+'|'+busy+'|'+S.day;
  document.body.classList.toggle('mapui-on-home',page==='home'&&!S.battle);document.body.classList.toggle('mapui-hidden',busy);const d=document.getElementById('mapuiDay');if(d)d.textContent='Tag '+S.day;
  if(key!==last){last=key;if(page==='home')requestAnimationFrame(()=>M.ludus?.zoom?.(M.ludus.zoomLevel||1));}},200);};
if(typeof window!=='undefined')start();
})();
