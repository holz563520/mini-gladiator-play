'use strict';
// SPIELFELD-ANSICHT (index.html und spielfeld.html): Es erscheint nur noch das Spielfeld. Verwaltungsseiten öffnen sich über die Gebäude
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
<h4>LUDUS</h4>${item('ludus:owner','Lanista')}${item('nav:profiles','Spielstände')}${item('nav:stats','Chronik')}${item('nav:options','Optionen')}</nav></div>`;}
 document.addEventListener('click',e=>{const m=e.target.closest?.('[data-mapui]');if(m){e.preventDefault();e.stopPropagation();if(m.dataset.mapui==='menu'){sheet.innerHTML=menu();sheet.hidden=false;}else sheet.hidden=true;return;}
  if(!sheet.hidden&&(e.target===sheet||e.target.closest?.('#mapuiMenu [data-action]')))setTimeout(()=>{sheet.hidden=true;},0);},true);
 // ---------- Aufräumen doppelter Menüs (Vorschläge 1–10) ----------
 const LUDUS_TABS='nav:profiles',CHRONIK=['stats','fallen','report'],REDIRECT={openarenas:'arena',league:'arena',scout:'gladiators',barracks:'gladiators'};
 function tidy(){const app=document.getElementById('app');if(!app)return;const page=M.ui.getPage();
  // 4/6: doppelte Seiten auf ihre eine Hauptseite umleiten
  if(REDIRECT[page]&&!S.battle){M.ui.click('nav:'+REDIRECT[page]);return;}
  const tabs=app.querySelector('.section-tabs'),sel=app.querySelector('.mobile-section');
  // 3: Reiter „Ludus · Spielstände · Statistik · Optionen“ weg (nur noch im Menü)
  if(tabs?.querySelector(`[data-action="${LUDUS_TABS}"]`)){tabs.remove();sel?.remove();}
  // 10: Chronik = Statistik + Gefallene + Kampfbericht mit eigenen Reitern; dort nicht mehr in Mehr/Arena
  else if(tabs){for(const b of tabs.querySelectorAll('[data-action="nav:fallen"],[data-action="nav:report"]'))b.remove();if(sel)for(const o of sel.querySelectorAll('option'))if(/fallen|report/.test(o.value))o.remove();}
  if(CHRONIK.includes(page)&&!app.querySelector('.mapui-chronik')){app.querySelector('.section-tabs')?.remove();app.querySelector('.mobile-section')?.remove();const nav=document.createElement('nav');nav.className='section-tabs mapui-chronik';nav.setAttribute('aria-label','Chronik');nav.innerHTML=[['stats','Statistik'],['fallen','Gefallene'],['report','Kampfbericht']].map(([id,l])=>`<button class="${page===id?'active':''}" data-action="nav:${id}">${l}</button>`).join('');const bb=app.querySelector('.backbar');bb?bb.after(nav):app.querySelector('.content')?.prepend(nav);}
  // 5/7: doppelte Sprungknöpfe im Inhalt (zeigen auf die eigene Seite oder auf einen Reiter, der oben schon steht; Testkämpfe nur in der Arena)
  const tabTargets=new Set([...app.querySelectorAll('.section-tabs [data-action]')].map(b=>b.dataset.action));
  for(const b of app.querySelectorAll('.content [data-action^="nav:"]')){if(b.closest('.section-tabs,.backbar,.mobile-section'))continue;const a=b.dataset.action;if(a==='nav:'+page||tabTargets.has(a)||(a==='nav:benchmark'&&page!=='arena'&&page!=='benchmark'))b.remove();}
  // 8: ein Zurück-Knopf (führt von einer Hauptseite aufs Spielfeld), Ludus-Name daneben weg
  const back=app.querySelector('.backbar');if(back){back.querySelector('span')?.remove();const btn=back.querySelector('[data-action="back"]');if(btn)btn.textContent='‹ Zurück';}}
 new MutationObserver(()=>{if(!document.getElementById('app')?.querySelector('.mapui-tidied')){const m=document.createElement('i');m.className='mapui-tidied';m.hidden=true;document.getElementById('app')?.appendChild(m);tidy();}}).observe(document.getElementById('app'),{childList:true});tidy();
 // Zustand nachführen: Spielfeld oder Verwaltungsseite, Kampf und Intros blenden die Knöpfe aus
 let last='';setInterval(()=>{const page=M.ui.getPage(),busy=!!S.battle||!!M.intro?.active?.()||!!window.ArenaTheoryIntro?.active?.()||!!document.querySelector('.smith-ceremony,#introView,#brandIntro');const key=page+'|'+busy+'|'+S.day;
  document.body.classList.toggle('mapui-on-home',page==='home'&&!S.battle);document.body.classList.toggle('mapui-start',(page==='profiles'||!S.lanista)&&!S.battle);document.body.classList.toggle('mapui-hidden',busy);const d=document.getElementById('mapuiDay');if(d)d.textContent='Tag '+S.day;
  if(key!==last){last=key;if(page==='home')requestAnimationFrame(()=>M.ludus?.zoom?.(M.ludus.zoomLevel||1));}},200);};
if(typeof window!=='undefined')start();
})();
