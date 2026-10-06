'use strict';
(()=>{const M=window.MG;
// Runs once per menu render, never in the combat animation loop.
M.mobileEnhance=()=>{
 for(const table of document.querySelectorAll('.content table')){const headers=[...table.querySelectorAll('thead th')].map(h=>h.textContent.trim());if(!headers.length)continue;table.classList.add('mobile-cards');for(const row of table.querySelectorAll('tbody tr'))[...row.children].forEach((cell,i)=>{cell.dataset.label=headers[i]||'';});}
 const field=document.getElementById('armyQuery'),filters=field?.closest?.('.toolbar');if(filters&&!filters.parentElement?.classList.contains('filter-drawer')){const drawer=document.createElement('details');drawer.className='box filter-drawer';const summary=document.createElement('summary');summary.textContent='Suche & Filter';drawer.appendChild(summary);filters.before(drawer);drawer.appendChild(filters);if(field.value)drawer.open=true;}
};
// Tastatur offen: ein fokussiertes Textfeld darf nicht unter der festen Menüleiste oder außerhalb des sichtbaren Bereichs liegen.
const reveal=el=>{if(!el?.matches?.('input:not([type=checkbox]):not([type=radio]),textarea')||document.activeElement!==el)return;const bar=document.querySelector('.sidebar'),r=el.getBoundingClientRect(),vh=window.visualViewport?.height||innerHeight,limit=bar&&getComputedStyle(bar).position==='fixed'?Math.min(vh,bar.getBoundingClientRect().top):vh;if(r.bottom>limit||r.top<0)el.scrollIntoView({block:'center'});};
document.addEventListener('focusin',e=>setTimeout(()=>reveal(e.target),350));window.visualViewport?.addEventListener?.('resize',()=>reveal(document.activeElement));
M.ui.render();
})();
