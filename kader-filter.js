'use strict';
// =====================================================================================================
// KADER-FILTER (Wunsch Thomas 6.11.): gemeinsame Filterleiste für Gladiatorenlisten
// · Medicus: Krankenbetten (Scope 'ward') und Behandlungstisch ('dok'); Boxkämpfe ('box'); seit 10.11. auch Arenakämpfe manuell ('arena'),
//   Apfelschuss (Schützen 'apfelA', Zielscheiben 'apfelR', im Rahmen über set/reset) und Hundefang (Lockvogel 'hfbait', Kämpfer 'hfmen').
// · Filter: Einordnung des Medicus (Vorfilter: Supertalent / Talent / Müll / nicht eingeordnet, g.sortTag aus sortierung.js),
//   Wuchs (normal, Kleinwuchs, Riesenwuchs, Sumo; g.stature aus besondere.js), Talent ab einer Grenze, Sortierung nach
//   Talent oder Kampfwert (auf- oder absteigend), dazu je Ansicht eigene Schalter (z. B. „nur mit Dauerschaden“).
// · Nur Anzeige: ändert keine Spielwerte. Gemerkt wird die Auswahl je Ansicht im Browser (localStorage 'mg-kader-filter'),
//   nicht im Spielstand.
// API: M.kaderFilter.bar(scope,opts) → HTML · apply(scope,list,opts) → gefilterte, sortierte Liste · on(scope,fn) → bei Änderung
//   opts: {kw:g=>Zahl, sorts:[{key,label,cmp}], flags:[{key,label,pred}], defSort:'talent-', noTag:true (Seite hat eigene Einordnungs-Knöpfe)}
// =====================================================================================================
(()=>{
const M=window.MG;if(!M||M.kaderFilter)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='mg-kader-filter';
let store={};try{store=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{store={};}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(store));}catch{}};
const cbs={};
const TAGS=[['all','Einordnung: alle'],['super','👑 Supertalent'],['talent','💎 Talent'],['muell','🗑 Müll'],['none','nicht eingeordnet']];
const WUCHS=[['all','Wuchs: alle'],['normal','Normalwuchs'],['dwarf','▼ Kleinwuchs (Zwerg)'],['giant','▲ Riesenwuchs'],['sumo','● Sumo']];
const TMIN=[[0,'Talent: alle'],[50,'Talent ab 50'],[57,'Talent ab 57'],[63,'Talent ab 63'],[69,'Talent ab 69'],[75,'Talent ab 75'],[81,'Talent ab 81'],[88,'Talent ab 88']];
const BASE_SORTS=[['talent-','Talent ↓ (beste zuerst)'],['talent+','Talent ↑ (schwächste zuerst)'],['kw-','Kampfwert ↓'],['kw+','Kampfwert ↑'],['name','Name A–Z']];
const talentOf=g=>Math.round(g?.potential??0);
const kwDefault=g=>{try{return +M.power?.(g)||0;}catch{return 0;}};
function state(scope,opts={}){const s=store[scope]??={};s.tag??='all';s.wuchs??='all';s.tmin??=0;s.sort??=opts.defSort||'talent-';s.flags??={};return s;}
function sorts(opts){return [...(opts.sorts||[]).map(x=>[x.key,x.label]),...BASE_SORTS];}
function apply(scope,list,opts={}){const s=state(scope,opts),kw=opts.kw||kwDefault,tagOf=g=>M.sortTag?.get?.(g)||null;
 let out=(list||[]).filter(g=>{if(!g)return false;
  if(s.tag!=='all'&&!opts.noTag){const t=tagOf(g);if(s.tag==='none'?!!t:t!==s.tag)return false;}
  if(s.wuchs!=='all'){const w=g.stature||'normal';if(w!==s.wuchs)return false;}
  if(s.tmin&&talentOf(g)<s.tmin)return false;
  for(const f of opts.flags||[])if(s.flags[f.key]&&!f.pred(g))return false;
  return true;});
 const own=(opts.sorts||[]).find(x=>x.key===s.sort);
 const kwMap=new Map();const K=g=>{if(!kwMap.has(g))kwMap.set(g,kw(g));return kwMap.get(g);};
 const cmp=own?own.cmp:s.sort==='talent+'?(a,b)=>talentOf(a)-talentOf(b)||K(a)-K(b):s.sort==='kw-'?(a,b)=>K(b)-K(a)||talentOf(b)-talentOf(a):s.sort==='kw+'?(a,b)=>K(a)-K(b)||talentOf(a)-talentOf(b):s.sort==='name'?(a,b)=>String(a.name).localeCompare(String(b.name),'de'):(a,b)=>talentOf(b)-talentOf(a)||K(b)-K(a);
 return out.sort(cmp);}
function active(scope,opts={}){const s=state(scope,opts);return s.tag!=='all'||s.wuchs!=='all'||!!s.tmin||Object.values(s.flags).some(Boolean);}
function bar(scope,opts={}){const s=state(scope,opts),sel=(f,list,cur)=>`<select class="kf-sel" data-kf="${esc(scope)}:${f}" aria-label="${esc(f)}">${list.map(([v,l])=>`<option value="${esc(v)}"${String(v)===String(cur)?' selected':''}>${esc(l)}</option>`).join('')}</select>`;
 const n=opts.total!=null?`<span class="kf-n">${opts.shown??'?'} von ${opts.total}</span>`:'';
 return `<div class="kf-bar" data-kfscope="${esc(scope)}"><span class="kf-t">FILTER</span>${opts.noTag?'':sel('tag',TAGS,s.tag)}${sel('wuchs',WUCHS,s.wuchs)}${sel('tmin',TMIN,s.tmin)}${sel('sort',sorts(opts),s.sort)}${(opts.flags||[]).map(f=>`<label class="kf-flag"><input type="checkbox" data-kf="${esc(scope)}:flag:${esc(f.key)}"${s.flags[f.key]?' checked':''}> ${esc(f.label)}</label>`).join('')}${active(scope,opts)?`<button type="button" class="kf-reset" data-kfreset="${esc(scope)}">✕ zurücksetzen</button>`:''}${n}</div>`;}
function on(scope,fn){cbs[scope]=fn;}
function changed(scope){save();try{cbs[scope]?.();}catch(e){console.warn(e);}}
// set: für Seiten in einem Rahmen (Apfelschuss), deren Auswahlfelder nicht in diesem Dokument liegen
function set(kf,value){const [scope,f,k]=String(kf).split(':'),s=state(scope);if(f==='flag')s.flags[k]=!!value;else if(f==='tmin')s.tmin=+value||0;else s[f]=value;changed(scope);}
function reset(scope){const s=state(scope);s.tag='all';s.wuchs='all';s.tmin=0;s.flags={};changed(scope);}
document.addEventListener('change',e=>{const el=e.target.closest?.('[data-kf]');if(!el)return;e.stopPropagation();set(el.dataset.kf,el.type==='checkbox'?el.checked:el.value);},true);
document.addEventListener('click',e=>{const el=e.target.closest?.('[data-kfreset]');if(!el)return;e.preventDefault();e.stopPropagation();reset(el.dataset.kfreset);},true);
const style=document.createElement('style');
style.textContent=`.kf-bar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0 8px;padding:6px 8px;border:1px solid #ffffff1f;background:#0003;border-radius:4px;font:12px 'Courier Prime',ui-monospace,monospace}
.kf-t{font-weight:700;letter-spacing:.08em;opacity:.7;font-size:11px}
.kf-sel{background:#1b2326;color:#e8dcc0;border:1px solid #ffffff2e;border-radius:3px;padding:3px 4px;font:inherit;max-width:100%}
.kf-flag{display:inline-flex;gap:4px;align-items:center;white-space:nowrap}
.kf-reset{background:none;border:1px solid #d5766866;color:#f29b83;border-radius:3px;padding:2px 6px;font:inherit;cursor:pointer}
.kf-n{margin-left:auto;opacity:.75;white-space:nowrap}
@media (max-width:520px){.kf-sel{flex:1 1 45%}.kf-n{margin-left:0}}`;
document.head.appendChild(style);
M.kaderFilter={bar,apply,on,state,active,talentOf,set,reset};
})();
