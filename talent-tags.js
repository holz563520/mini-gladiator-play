'use strict';
// =====================================================================================================
// TALENT-ABZEICHEN (Wunsch Thomas 2.11.): Das Talent jedes eigenen Gladiators ist in fast allen Ansichten sichtbar,
// klein und unaufdringlich, damit man Talente schützen kann. Nur Anzeige, keine Spielwirkung, keine Speicherwerte.
// · Abzeichen „T82“ in der Farbe der Talentstufe (Stufen wie in der Kaserne: M.barracks.tierOf, g.potential 1–100);
//   Titel: Stufe und Zahl. Talente ab „Hochbegabt“ leuchten leicht.
// · Nur Gladiatoren aus dem eigenen Kader (S.roster). Kandidaten beim Sklavenhändler bleiben verdeckt („?“ bis zum Kauf).
// · Wirkt auf vorhandene Ansichten, ohne sie zu ändern: Elemente, die eine Gladiatoren-ID tragen (Porträts, Auswahl,
//   Kampf-HUD …), bekommen das Abzeichen neben den Namen. Aus: localStorage 'mg-talent-tags' = 'off'.
// =====================================================================================================
(()=>{
const M=window.MG;if(!M||window.MG_TALENT_TAGS)return;window.MG_TALENT_TAGS=true;
try{if(localStorage.getItem('mg-talent-tags')==='off')return;}catch{}
const S=M.s;
const FALLBACK=[[91,'Prodigy'],[88,'Elite-Talent'],[85,'Ausnahmetalent'],[81,'Hochbegabt'],[75,'Talentiert'],[69,'Begabt'],[63,'Brauchbar'],[57,'Mittelmaß'],[50,'Unbegabt'],[0,'Nichtsnutz']];
function tier(p){try{const t=M.barracks?.tierOf?.(p);if(t)return t;}catch{}const i=FALLBACK.findIndex(([m])=>p>=m);return {level:10-i,name:FALLBACK[i][1]};}
// Farben je Stufe 1–10: grau → grün → blau → gold → violett → rot
const COL=['#6f7774','#7d8580','#8f9a8f','#a3b58c','#88baa6','#7fb1d6','#dfb66d','#f0c46a','#c79cf0','#ff7a6a'];
function tagFor(g){const p=Math.round(g.potential||0),t=tier(p),lvl=Math.max(1,Math.min(10,t.level||1));
 const s=document.createElement('span');s.className='tal-b'+(lvl>=7?' tal-hi':'');s.dataset.tal=g.id;s.dataset.p=p;
 s.style.setProperty('--tal',COL[lvl-1]);s.textContent='T'+p;s.title='Talent '+p+' · '+t.name;s.setAttribute('aria-label','Talent '+p+', '+t.name);return s;}
// Kleine Hilfe für andere Bausteine (z. B. die Aufstellung): HTML des Abzeichens
M.talentTag=g=>{if(!g||g.potential==null)return '';const el=tagFor(g);return el.outerHTML;};

const style=document.createElement('style');
style.textContent=`.tal-b{display:inline-block;margin-left:4px;padding:0 3px;border:1px solid var(--tal);color:var(--tal);font:700 9px/12px 'Courier Prime',ui-monospace,monospace;letter-spacing:0;vertical-align:middle;border-radius:2px;background:#0006;opacity:.9;white-space:nowrap;text-transform:none;pointer-events:auto}
.tal-b.tal-hi{box-shadow:0 0 4px var(--tal)}`;
document.head.appendChild(style);

// Welche Elemente eine Gladiatoren- oder Kämpfer-ID tragen (Kandidaten beim Händler sind nicht im Kader und bleiben außen vor)
const SEL=['[data-portrait]','[data-teamfigure]','[data-face]','[data-g]','[data-body]','[data-pick-portrait]','[data-world-portrait]','[data-troop-drag]','[data-bportrait]','[data-hfface]','[data-dokface]',
 '[data-action^="detail:"]','[data-action^="loadout:"]','[data-action^="world:person:"]','[data-action^="world:pick:"]','[data-action^="inspect:"]','[data-action^="army:troopadd:"]','[data-action^="medic:"]','[data-dok^="man:"]','[data-bh^="pick:"]','[data-a*="g:"]'].join(',');
const ATTRS=['data-portrait','data-teamfigure','data-face','data-g','data-body','data-pick-portrait','data-world-portrait','data-troop-drag','data-bportrait','data-hfface','data-dokface','data-action','data-dok','data-bh','data-a'];
function own(id){if(!id)return null;const g=S.roster?.find(x=>x.id===id&&!x.dead);if(g)return g;
 const a=S.battle?.actors?.find(x=>x.id===id||String(x.id)===id);if(a&&a.team===0&&a.g&&S.roster?.includes(a.g))return a.g;return null;}
function gladOf(el){for(const n of ATTRS){const v=el.getAttribute(n);if(!v)continue;const parts=v.split(':');for(let i=parts.length-1;i>=0;i--){const g=own(parts[i]);if(g)return g;}}return null;}
const first=n=>{n=String(n||'');return n.length<=11?n:n.split(' ')[0];};
// Namensfeld in der Nähe suchen: ein Element, dessen eigener Text mit dem Namen beginnt
function nameNode(el,g){const full=g.name,short=first(g.name);let box=el;
 for(let up=0;up<4&&box;up++,box=box.parentElement){
  if(box.querySelector?.(`.tal-b[data-tal="${CSS.escape(g.id)}"]`))return 'done';
  const cands=box.querySelectorAll?.('b,strong,h2,h3,h4,h5,span,div,p,small,em,td,li,button,a')||[];
  for(const c of [box,...cands]){if(c.closest?.('#auf'))continue;
   let txt='';for(const ch of c.childNodes)if(ch.nodeType===3)txt+=ch.nodeValue;txt=txt.replace(/^[✝★☠⚔\s·]+/,'').trim();
   if(!txt)continue;if(txt===full||txt===short||txt.startsWith(full+' ')||txt.startsWith(full+' ·')||(txt.startsWith(short)&&txt.length<=short.length+3))return shown(c,g)?'done':c;}}
 return null;}
// Zeigt die Ansicht das Talent schon (Kaserne, Profil)? Dann kein zweites Abzeichen.
function shown(c,g){const card=c.closest('article,section,li,.bk-card')||c.parentElement;const t=card?.textContent||'';return t.length<4000&&(t.includes('Talent '+Math.round(g.potential))||t.includes('Lerntalent'));}
let timer=0;
function scan(){timer=0;if(!S.roster?.length)return;
 for(const rootId of ['app','battleView','modal','an']){const root=document.getElementById(rootId);if(!root||root.hidden)continue;
  for(const el of root.querySelectorAll(SEL)){const g=gladOf(el);if(!g||g.potential==null)continue;
   const n=nameNode(el,g);if(!n||n==='done')continue;
   const old=n.querySelector(':scope > .tal-b');if(old){if(old.dataset.tal===g.id&&+old.dataset.p===Math.round(g.potential))continue;old.remove();}
   n.appendChild(tagFor(g));}
  if(rootId!=='app')continue;
  // Auswahllisten (Ausrüstung, Werte): „ · T82“ an den Eintrag
  for(const o of root.querySelectorAll('select option')){const g=own(o.value);if(!g||g.potential==null)continue;const tag=' · T'+Math.round(g.potential);if(!o.textContent.includes(tag))o.textContent=o.textContent.replace(/ · T\d+$/,'')+tag;}
  // Überschriften ohne ID (Training): genau der Name eines eigenen Gladiators; nicht in Bericht und Arena (dort stehen auch Gegner)
  const pg=M.ui?.getPage?.();if(pg==='report'||pg==='arena'||pg==='openarenas')continue;
  const byName=new Map();for(const g of S.roster)if(!g.dead)byName.set(g.name,byName.has(g.name)?null:g);
  for(const h of root.querySelectorAll('h1,h2,h3,h4')){if(h.querySelector('.tal-b'))continue;let txt='';for(const ch of h.childNodes)if(ch.nodeType===3)txt+=ch.nodeValue;txt=txt.trim();
   const g=byName.get(txt);if(g&&g.potential!=null&&!shown(h,g))h.appendChild(tagFor(g));}}}
const obs=new MutationObserver(()=>{if(!timer)timer=setTimeout(scan,250);});
function start(){for(const id of ['app','battleView','modal'])if(document.getElementById(id))obs.observe(document.getElementById(id),{childList:true,subtree:true});
 const an=document.getElementById('an');if(an)obs.observe(an,{childList:true,subtree:true});scan();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else setTimeout(start,0);
// Die Arena-Oberfläche entsteht erst später: einmal nachziehen
setTimeout(()=>{const an=document.getElementById('an');if(an)obs.observe(an,{childList:true,subtree:true});},3000);
})();
