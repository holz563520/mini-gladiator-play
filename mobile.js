'use strict';
(()=>{const M=window.MG;
// Runs once per menu render, never in the combat animation loop.
M.mobileEnhance=()=>{
 for(const table of document.querySelectorAll('.content table')){const headers=[...table.querySelectorAll('thead th')].map(h=>h.textContent.trim());if(!headers.length)continue;table.classList.add('mobile-cards');for(const row of table.querySelectorAll('tbody tr'))[...row.children].forEach((cell,i)=>{cell.dataset.label=headers[i]||'';});}
 const field=document.getElementById('armyQuery'),filters=field?.closest?.('.toolbar');if(filters&&!filters.parentElement?.classList.contains('filter-drawer')){const drawer=document.createElement('details');drawer.className='box filter-drawer';const summary=document.createElement('summary');summary.textContent='Suche & Filter';drawer.appendChild(summary);filters.before(drawer);drawer.appendChild(filters);if(field.value)drawer.open=true;}
};M.ui.render();
})();
