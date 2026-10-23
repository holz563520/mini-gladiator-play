'use strict';
/* =====================================================================================================
   KAMPFBERICHT IN DER NEUEN ARENA
   Nach jedem Gladiatorenkampf der neuen Arena erscheint auf dem Ergebnisbild wieder der Kampfbericht des Spiels:
   je Gladiator Zustand, Schaden, Kills, Blocks … und vor allem, was er gelernt hat (Wert vorher → nachher, SOLL).
   Die Zahlen stammen unverändert aus dem Bericht des Spiels (S.lastReport). „VOLLER KAMPFBERICHT“ öffnet die
   gewohnte Berichtsseite mit Kampfverlauf. Keine neuen Speicherwerte, keine Spielwirkung.
   ===================================================================================================== */
(()=>{
const M=window.MG,C=window.ArenaCareer;if(!M||!C)return;const S=M.s;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f1=v=>(Math.round(v*10)/10).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1});
let last=null,lastAt=0;
const baseFinish=M.onFinish;
M.onFinish=function(report){if(report&&String(report.id||'').startsWith('arena-neu')){last=report;lastAt=Date.now();}const r=baseFinish?.apply(this,arguments);
 /* Nach dem Kampf: Klingen abgewischt, auf dem Spielfeld/Ludus kein Blut an den Waffen */setTimeout(()=>{try{for(const g of S.roster)for(const k of ['weapon','secondary']){const i=M.gear(g,k);if(i&&i.blood)i.blood=0;}}catch{}},0);return r;};
// Wert und SOLL zu einem Lernpfad (stats:strength · moves:dodge · weapons:gladius · body:lua.strength)
function valueOf(g,path){const [grp,key]=path.split(':');try{
 if(grp==='stats')return [g.stats[key],g.caps.stats[key]];if(grp==='moves')return [g.moves[key],g.caps.moves[key]];if(grp==='weapons')return [g.mastery[key],g.caps.weapons[key]];
 const [id,k]=key.split('.');return [g.body[id][k],g.caps.body[id][k]];}catch{return [null,null];}}
function block(a){const g=S.roster.find(x=>x.id===a.id)||null,learn=Object.entries(a.learning||{}).filter(([,v])=>v>.0001).sort((x,y)=>y[1]-x[1]);
 const rows=learn.map(([k,v])=>{const [now,cap]=g?valueOf(g,k):[null,null];return `<li><span>${esc(M.learningLabel?.(k)||k)}</span><b>${now!=null?f1(now-v)+' → '+f1(now):'+'+v.toFixed(2)}</b><small>${cap!=null?'SOLL '+Math.round(cap):''}</small></li>`;});
 const stat=(n,v)=>`<span><b>${v}</b>${n}</span>`;
 return `<div class="an-gain arp-man${a.dead?' dead':''}"><b>${a.dead?'✝ ':''}${esc(a.name)}</b><small class="arp-state">${a.dead?'gefallen':a.down?'kampfunfähig · überlebt':'überlebt'}${a.xpMultiplier>1?' · LERNFORTSCHRITT ×'+String(a.xpMultiplier).replace('.',','):''}</small>
  <div class="arp-stats">${stat('Schaden',a.damage)}${stat('Erlitten',a.taken)}${stat('Kills',a.kills)}${stat('Krit.',a.crits)}${stat('Blocks',a.blocks)}${stat('Ausgew.',a.dodges)}</div>
  ${rows.length?`<ul>${rows.slice(0,6).join('')}</ul>${rows.length>6?`<details><summary>${rows.length-6} weitere gelernte Werte</summary><ul>${rows.slice(6).join('')}</ul></details>`:''}`:'<p>Keine messbare Verbesserung in diesem Kampf.</p>'}
  ${a.injuries?.length?`<p class="arp-inj">${a.injuries.slice(0,3).map(esc).join(' · ')}${a.injuries.length>3?' …':''}</p>`:''}</div>`;}
const baseResult=C.onResult;
C.onResult=function(R){const r=baseResult?.apply(this,arguments);
 try{if(last&&Date.now()-lastAt<60000&&!(R?.mine||[]).every(u=>u.kind==='rooster'||u.kind==='lion')){const box=document.querySelector('#an .an-res');if(box&&!box.querySelector('.arp')){
  const el=document.createElement('div');el.className='an-gains arp';el.innerHTML=`<h3>Kampfbericht · was deine Gladiatoren gelernt haben</h3>${last.actors.map(block).join('')}${(()=>{const f=M.workshop?.state?.lastFound,n=last.recipes?.length?last.recipes:f&&f.battle===last.id?f.names:[];return n.length?`<p class="arp-recipe">⚒ Schmiederezept erlernt: <b>${n.map(esc).join(', ')}</b></p>`:'';})()}<div class="arp-foot"><button type="button" class="arp-full">VOLLER KAMPFBERICHT ▸</button></div>`;
  const anchor=box.querySelector('.an-foes')||box.querySelector('.an-actions');anchor?anchor.before(el):box.appendChild(el);
  el.querySelector('.arp-full').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.ArenaUI?.close?.();try{M.ui.click('nav:report');}catch{}});}}}catch(e){console.warn(e);}
 return r;};
window.ARENA_REPORT_READY=true;
})();
