'use strict';
/* =====================================================================================================
   SCHNELL AUSRÜSTEN (Klappleiste in der Kaserne)
   · Alle Plätze kompakt untereinander. Antippen klappt die passenden freien Lagerstücke auf, nochmal Antippen klappt zu.
   · Bei Waffen steht der Talentwert des Gladiators je Waffenklasse dabei: IST (mit Ursprung) → SOLL.
   · AUTOMATISCH AUSRÜSTEN: nutzt die Verteilung des Spiels (M.army.autoEquip) für genau diesen Gladiator.
   · BEIM SCHMIED KAUFEN: nimmt alles aus der Tagesware des Schmieds, was dieser Gladiator tragen darf und was besser ist
     als das Angelegte. Ein Regler wählt zwischen dem billigsten und dem besten Satz, höchstens so weit, wie das Gold reicht.
     Ausnahme Waffe: immer die Waffenklasse mit dem höchsten SOLL-Wert des Gladiators (die Güte folgt dem Regler).
   Es werden nur vorhandene Funktionen des Spiels benutzt (M.equip, M.workshop.buy). Keine Balanceänderung.
   ===================================================================================================== */
(()=>{
const M=window.MG;if(!M)return;const S=M.s;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n).toLocaleString('de-DE');
const btn=(label,action,cls='',dis=false)=>`<button class="btn ${cls}" data-action="${action}"${dis?' disabled':''}>${label}</button>`;
const RANGED={Fernkämpfer:['bow','crossbow'],Soldat:['net'],Assassine:['javelin','throwaxe']};
const wdef=id=>M.weaponDefs.find(w=>w.id===id);
const wname=id=>wdef(id)?.name||id;
// Plätze in sinnvoller Reihenfolge: Hauptwaffe der Klasse zuerst
function slots(g){const melee={slot:'secondary',label:g.role==='Fernkämpfer'?'Nahkampf':'Hauptwaffe'},ranged={slot:'weapon',label:g.role==='Fernkämpfer'?'Fernwaffe':'Wurfwaffe'};
 const list=g.role==='Fernkämpfer'?[ranged,melee]:[melee,ranged];if(M.allowedShield(g))list.push({slot:'shield',label:'Schild'});
 for(const d of M.armorDefs)list.push({slot:d.id,label:d.name});return list;}
const cur=(g,slot)=>M.inventoryItem(['weapon','secondary','shield'].includes(slot)?g.equipment[slot]:g.equipment.armor?.[slot]);
const meleeIds=g=>M.weaponDefs.filter(w=>!w.ammo&&M.allowedMelee(g,w.id)).map(w=>w.id);
const rangedIds=g=>RANGED[g.role]||[];
function fits(g,i,slot){if(!i||i.durability<=0)return false;const d=M.definition(i);if(!d)return false;
 if(slot==='weapon')return i.kind==='weapon'&&!!d.ammo&&M.allowedRanged(g,i);
 if(slot==='secondary')return i.kind==='weapon'&&!d.ammo&&M.allowedMelee(g,i);
 if(slot==='shield')return i.kind==='shield'&&M.allowedShield(g);
 return i.kind==='armor'&&i.def===slot;}
const value=i=>i?(M.workshop?.offerPrice?.(i)??M.itemPrice(i.kind,i.def,i.q))*(i.durability/(i.maxDurability||100)):0;
// Talent je Waffenklasse
function talents(g,ids){const st=M.barracks?.startOf?.(g)?.mastery||{};return ids.map(id=>({id,ist:g.mastery[id]||1,pot:g.caps?.weapons?.[id]||1,st:st[id]})).sort((a,b)=>b.pot-a.pot);}
function talentChips(g,ids,mark){const T=talents(g,ids);return `<div class="eq-talents">${T.map((t,i)=>`<span class="${i===0?'best':''}${t.id===mark?' on':''}"><b>${esc(wname(t.id))}</b><small>${t.st!=null&&t.ist-t.st>=.5?'<s>'+Math.round(t.st)+'</s>▸':''}${Math.round(t.ist)} → <em>${Math.round(t.pot)}</em></small></span>`).join('')}</div>`;}
const tal=(g,id)=>{const t=talents(g,[id])[0];return `<small class="eq-tal">Talent ${Math.round(t.ist)} → <em>${Math.round(t.pot)}</em></small>`;};
// ---------- Zustand der Klappleiste ----------
let openSlot=null,smithOpen=false,level=null,forId=null;
function reset(id){if(forId!==id){forId=id;openSlot=null;smithOpen=false;level=null;}}
// ---------- Schmied: passende Tagesware und Sätze von billig bis gut ----------
function smithPlan(g){const F=M.workshop?.state;if(!F?.master)return {none:'Noch kein Schmied eingestellt.'};const offers=(F.offers||[]).filter(o=>o?.item);
 const groups=[];let twoHand=false;
 for(const {slot,label} of slots(g)){let cand=offers.filter(o=>fits(g,o.item,slot));if(!cand.length)continue;const c=cur(g,slot);
  if(slot==='weapon'||slot==='secondary'){// Waffe: Klasse mit dem höchsten SOLL-Wert unter den angebotenen
   const ids=[...new Set(cand.map(o=>o.item.def))],best=ids.sort((a,b)=>(g.caps.weapons[b]||0)-(g.caps.weapons[a]||0))[0];cand=cand.filter(o=>o.item.def===best);
   const curPot=c?(g.caps.weapons[c.def]||0):-1,bestPot=g.caps.weapons[best]||0;if(c&&curPot>bestPot)continue;if(c&&c.def===best)cand=cand.filter(o=>value(o.item)>value(c));}
  else cand=cand.filter(o=>value(o.item)>value(c));
  if(!cand.length)continue;cand.sort((a,b)=>a.price-b.price||value(a.item)-value(b.item));groups.push({slot,label,cand,prio:groups.length});}
 // Schild nur, wenn die gewählte Hauptwaffe einhändig bleibt
 const steps=Math.max(1,...groups.map(x=>x.cand.length))-1;
 const pick=L=>{const t=steps?L/steps:1;let set=groups.map(x=>({...x,o:x.cand[Math.round(t*(x.cand.length-1))]}));
  const main=set.find(x=>x.slot==='secondary')?.o.item||cur(g,'secondary');if(M.definition(main||{})?.twoHand)set=set.filter(x=>x.slot!=='shield');return set;};
 const cost=set=>set.reduce((n,x)=>n+x.o.price,0);
 let max=-1;for(let L=0;L<=steps;L++)if(cost(pick(L))<=S.gold)max=L;
 return {groups,steps,pick,cost,max};}
// Reicht das Gold nicht einmal für den billigsten Satz: wichtigste Plätze zuerst, solange das Gold reicht
function trimmed(P){let left=S.gold;return P.pick(0).filter(x=>{if(x.o.price<=left){left-=x.o.price;return true;}return false;});}
function currentSet(P){if(P.max<0)return trimmed(P);const L=Math.max(0,Math.min(P.max,level??P.max));return P.pick(L);}
function smithHtml(g){const P=smithPlan(g);if(P.none)return `<p class="tiny">${P.none}</p>`;if(!P.groups.length)return '<p class="tiny">Der Schmied hat heute nichts, was besser zu ihm passt als das, was er trägt.</p>';
 const set=currentSet(P),total=set.reduce((n,x)=>n+x.o.price,0),L=P.max<0?0:Math.max(0,Math.min(P.max,level??P.max));
 return `<div class="eq-smith" data-g="${g.id}"><div class="eq-range-row"><button type="button" class="btn small eq-step" data-d="-1" aria-label="Billiger">▼ BILLIGER</button><input type="range" class="eq-range" min="0" max="${Math.max(0,P.max)}" step="1" value="${L}" ${P.max<=0?'disabled':''} aria-label="Zwischen billigster und bester Ausrüstung wählen"><button type="button" class="btn small eq-step" data-d="1" aria-label="Besser">▲ BESSER</button></div>
 <p class="tiny">${P.max<0?'Für den ganzen billigsten Satz reicht das Gold nicht. Vorschlag: die wichtigsten Teile, die bezahlbar sind.':P.max<P.steps?`Weiter nach oben reicht dein Gold nicht (${P.max+1} von ${P.steps+1} Stufen).`:'Alle Stufen bezahlbar.'} Waffe: Klasse mit dem höchsten SOLL-Wert.</p>
 <ul class="eq-buylist">${set.map(x=>`<li><span>${esc(x.label)}</span><b>${esc(M.itemName(x.o.item))}</b>${x.o.item.kind==='weapon'?tal(g,x.o.item.def):''}<em>${fmt(x.o.price)} G</em></li>`).join('')||'<li class="tiny">Nichts bezahlbar.</li>'}</ul>
 <div class="eq-buyfoot"><span>Summe <b>${fmt(total)}</b> · Kasse ${fmt(S.gold)}</span>${btn('KAUFEN & ANLEGEN','eq:buy:'+g.id,'primary small',!set.length||total>S.gold)}</div></div>`;}
// ---------- Klappleiste ----------
function panel(g){reset(g.id);let kw='';try{const v=M.combatValues(g);kw=`KW mit Ausrüstung <b>${v.current}</b> · SOLL ${v.maximum}`;}catch{}
 const rows=slots(g).map(({slot,label})=>{const i=cur(g,slot),open=openSlot===slot,isW=slot==='weapon'||slot==='secondary';
  let body='';if(open){const free=S.inventory.filter(x=>!M.equippedBy(x.id)&&fits(g,x,slot)).sort((a,b)=>isW?((g.caps.weapons[b.def]||0)-(g.caps.weapons[a.def]||0)||value(b)-value(a)):value(b)-value(a));
   body=`<div class="eq-pick">${isW?talentChips(g,slot==='weapon'?rangedIds(g):meleeIds(g),i?.def):''}${free.slice(0,12).map(x=>`<button class="eq-item" data-action="eq:put:${g.id}:${x.id}:${slot}"><b>${esc(M.itemName(x))}</b>${isW?tal(g,x.def):''}<small>Zustand ${Math.round(x.durability/x.maxDurability*100)} %</small><em>ANLEGEN</em></button>`).join('')||'<p class="tiny">Nichts Passendes frei im Lager.</p>'}${free.length>12?`<p class="tiny">+ ${free.length-12} weitere in der Waffenkammer.</p>`:''}${i?btn('ABLEGEN','eq:clear:'+g.id+':'+slot,'small danger'):''}</div>`;}
  return `<li class="${i?'on':''}${open?' open':''}"><button class="eq-slot" data-action="eq:slot:${g.id}:${slot}" aria-expanded="${open}"><span>${esc(label)}</span><b>${i?esc(M.itemName(i)):'— leer —'}</b>${i&&isW?tal(g,i.def):i?`<small>${Math.round(i.durability/i.maxDurability*100)} %</small>`:''}<i>${open?'▴':'▾'}</i></button>${body}</li>`;}).join('');
 return `<div class="eq-panel"><div class="eq-head"><span>${kw}</span><span class="eq-gold">${fmt(S.gold)} Gold</span></div>
 <div class="eq-actions">${btn('⚙ AUTOMATISCH AUSRÜSTEN','eq:auto:'+g.id,'small primary')}${btn('⚒ BEIM SCHMIED KAUFEN '+(smithOpen?'▴':'▾'),'eq:smith:'+g.id,'small'+(smithOpen?' active':''))}${btn('WAFFENKAMMER','eq:doll:'+g.id,'small')}</div>
 ${smithOpen?smithHtml(g):''}
 <ul class="eq-slots">${rows}</ul></div>`;}
// ---------- Leiste in der Waffenkammer: nur die zwei Schnellknöpfe ----------
function freeFits(g){let n=0;for(const {slot} of slots(g))n+=S.inventory.filter(x=>!M.equippedBy(x.id)&&fits(g,x,slot)).length;return n;}
function bar(g){reset(g.id);const free=freeFits(g),hasSmith=!!M.workshop?.state?.master;
 return `<div class="eq-bar"><div class="eq-actions">${btn(free?'⚙ AUS DER WAFFENKAMMER AUSRÜSTEN · '+free+' frei':'WAFFENKAMMER LEER','eq:auto:'+g.id,'small primary',!free)}${btn('⚒ VOM SCHMIED AUSRÜSTEN '+(smithOpen?'▴':'▾'),'eq:smith:'+g.id,'small'+(smithOpen?' active':''),!hasSmith)}</div>${smithOpen?smithHtml(g):''}</div>`;}
// ---------- Aktionen ----------
function buy(g){const P=smithPlan(g);if(P.none||!P.groups.length)return P.none||'Nichts zu kaufen.';const set=currentSet(P);let n=0,spent=0;const msgs=[];
 M.batchSaving=true;try{for(const x of set){const before=S.gold,r=M.workshop.buy(x.o.item.id);if(S.gold<before){spent+=before-S.gold;const m=M.equip(g.id,x.o.item.id,x.slot==='secondary');n++;if(m&&/nicht|erforderlich|tragen keinen/i.test(m))msgs.push(m);}else msgs.push(r);}}finally{M.batchSaving=false;}
 if(g.role==='Fernkämpfer'||M.gear?.(g,'weapon')){const def=M.gear?.(g,'weapon')?.def;if(def==='bow'||def==='crossbow')g.ammoLoad=def==='crossbow'?8:12;}
 level=null;try{M.persist();}catch{}return n?`${n} ${n===1?'Teil':'Teile'} beim Schmied gekauft und angelegt · ${fmt(spent)} Gold.`+(msgs.length?' '+msgs[0]:''):(msgs[0]||'Nichts gekauft.');}
const base=M.schoolClick;
M.schoolClick=function(a){if(typeof a!=='string'||!a.startsWith('eq:'))return base?.apply(this,arguments);
 const [,k,id,x,y]=a.split(':'),g=S.roster.find(g=>g.id===id);if(!g)return true;reset(id);
 if(S.battle&&k!=='slot'&&k!=='smith'){M.ui.notify('Während eines Kampfes nicht möglich.');return true;}
 if(k==='slot'){openSlot=openSlot===x?null:x;}
 else if(k==='smith'){smithOpen=!smithOpen;level=null;}
 else if(k==='auto'){M.ui.notify(M.army.autoEquip([g],S.army?.equipPriority||'balanced'));}
 else if(k==='put'){if(M.equippedBy(x)){M.ui.notify('Dieser Gegenstand ist bereits angelegt.');}else{M.ui.notify(M.equip(g.id,x,y==='secondary'));openSlot=null;}}
 else if(k==='clear'){if(['weapon','secondary','shield'].includes(x))g.equipment[x]=null;else delete g.equipment.armor[x];try{M.persist();}catch{}}
 else if(k==='buy'){M.ui.notify(buy(g));}
 else if(k==='doll'){M.barracks?.close?.();return M.ui.click('loadout:'+id);}
 M.ui.render();return true;};
// Regler: nur die Liste neu zeichnen (ohne die Seite neu aufzubauen)
document.addEventListener('input',e=>{const r=e.target;if(!r.classList?.contains('eq-range'))return;const box=r.closest('.eq-smith'),g=S.roster.find(x=>x.id===box?.dataset.g);if(!g)return;level=+r.value;
 const tmp=document.createElement('div');tmp.innerHTML=smithHtml(g);const n=tmp.firstElementChild;box.querySelector('.eq-buylist').replaceWith(n.querySelector('.eq-buylist'));box.querySelector('.eq-buyfoot').replaceWith(n.querySelector('.eq-buyfoot'));box.querySelector('p.tiny').replaceWith(n.querySelector('p.tiny'));});
document.addEventListener('click',e=>{const b=e.target.closest?.('.eq-step');if(!b)return;e.preventDefault();e.stopPropagation();const r=b.closest('.eq-smith')?.querySelector('.eq-range');if(!r||r.disabled)return;const v=Math.max(+r.min,Math.min(+r.max,+r.value+(+b.dataset.d)));if(v===+r.value)return;r.value=v;r.dispatchEvent(new Event('input',{bubbles:true}));},true);
// Waffenwahl in der großen Waffenkammer: Talente je Waffenklasse über der Liste
const baseClick2=M.schoolClick;
M.schoolClick=function(a){const r=baseClick2.apply(this,arguments);if(typeof a==='string'&&/^pickslot:(weapon|secondary)$/.test(a)){const slot=a.split(':')[1];setTimeout(()=>{const md=document.getElementById('modal'),grid=md?.querySelector('.pick-grid');if(!grid||md.querySelector('.eq-talents'))return;
 const name=document.querySelector('.armory-head b')?.textContent||document.querySelector('.fighter-switch select option:checked')?.textContent?.split(' · ')[0]?.trim();const g=S.roster.find(x=>x.name===name&&!x.dead);if(!g)return;
 const box=document.createElement('div');box.className='eq-modal-talents';box.innerHTML=`<p class="eyebrow">TALENT JE WAFFENKLASSE · IST → SOLL</p>${talentChips(g,slot==='weapon'?rangedIds(g):meleeIds(g),cur(g,slot)?.def)}`;grid.before(box);
 grid.querySelectorAll('[data-action^="quickequip:"]').forEach(b=>{const it=M.inventoryItem(b.dataset.action.split(':')[1]);if(it?.kind==='weapon'){const h=b.closest('.box')?.querySelector('h3');if(h&&!h.querySelector('.eq-tal'))h.insertAdjacentHTML('beforeend',' '+tal(g,it.def));}});},0);}return r;};
// Ursprungswerte früh erfassen (neue Rekruten am Aufnahmetag)
setInterval(()=>{try{for(const g of S.roster)if(!g.startVals)M.barracks?.startOf?.(g);}catch{}},2000);
M.equipQuick={panel,bar,smithPlan,talents};
window.EQUIP_QUICK_READY=true;
})();
