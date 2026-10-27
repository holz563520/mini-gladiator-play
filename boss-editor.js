'use strict';
/* Berüchtigte & Trophäen · Editor (boss-editor.html). Nur Ansicht: erzeugt Anführer mit D.leader wie in einer echten Plünderung
   und zeigt sie mit dem Figurenzeichner (M.renderLudusActors) und den Großaufnahmen (M.faceShot) des Spiels. Kein Spielstand. */
(()=>{const M=window.MG,D=window.Debt,N=window.DebtNotorious,R=window.MGRelics;const $=id=>document.getElementById(id);
if(!M||!D||!N||!R){window.onerror?.('Spielmodule fehlen','boss-editor',0);return;}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const W=M.weaponDefs.map(w=>w.id),WN=id=>M.weaponDefs.find(w=>w.id===id)?.name||id;
const NAMES=(D.DIFF?.names)||['Spaziergang','Rauferei','Ernst','Gemetzel','Selbstmord'];
const skulls=n=>'☠'.repeat(n);
const state={tier:0,wpn:'',view:'cards',sel:null,seed:1,mood:0,turn:false,helm:false,armor:false};
const MOODS=(M.faceShot?.moods||['grin','confident']).slice();
// Anführer wie in der Plünderung (Stufe = Totenköpfe), festgelegt auf einen Typ
const cache=new Map();
function leader(id,seed=1){const key=id+':'+seed;if(cache.has(key))return cache.get(key);const ty=N.byId[id];
 const g=D.leader(7000+seed*131+N.TYPES.indexOf(ty),'dorf',.55+ty.tier*.22,1,{diff:ty.tier,avoid:N.TYPES.filter(t=>t.id!==id).map(t=>t.id)});cache.set(key,g);return g;}
// gewöhnlicher Gladiator als Träger
let wearer=null;function baseWearer(){if(wearer)return wearer;const g=D.henchman(4242,1);g.id='editor-wearer';g.name='Dein Gladiator';g.enemyGear.weapon=M.makeItem('weapon','gladius',2);g.enemyGear.shield=null;g.enemyGear.armor={};wearer=g;return g;}
function wearerWith(id){const g=baseWearer();g.relic={id:'editor',type:id,w:N.byId[id].weapon};g.enemyGear.armor=state.armor?{chestplate:M.makeItem('armor','chestplate',2,'medium'),leftshoulder:M.makeItem('armor','leftshoulder',2,'medium'),rightshoulder:M.makeItem('armor','rightshoulder',2,'medium')}:{};
 if(state.helm)g.enemyGear.armor.helm=M.makeItem('armor','helm',2,'metal');const wt=N.byId[id].weapon;g.enemyGear.weapon=M.makeItem('weapon',['bow','crossbow','net','javelin','throwaxe'].includes(wt)?'gladius':wt,2);
 if(M.faceOverlays)delete M.faceOverlays[g.id];R.registerFace(g);return g;}
const actor=(g,t,o={})=>({id:'ed-'+g.id,g,team:o.team??1,x:0,y:0,a:o.turn?Math.PI:0,phase:t*.6,state:o.state||'idle',energy:100,ammo:8,moveSpeed:0,noNav:true,bloodMarks:{},stagger:0,facePain:0,shoutTimer:o.shout?.5:0});
function drawFigure(cv,g,t,o={}){const c=cv.getContext('2d'),w=cv.width,h=cv.height;c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;
 const bg=c.createRadialGradient(w/2,h*.62,10,w/2,h*.62,w*.8);bg.addColorStop(0,o.bg0||'#3a3426');bg.addColorStop(1,'#141c1f');c.fillStyle=bg;c.fillRect(0,0,w,h);
 c.fillStyle='#4a3e2c';c.fillRect(w*.2,h-34,w*.6,10);c.fillStyle='#6b5a3e';c.fillRect(w*.2,h-34,w*.6,2);
 const k=(o.scale||2.6)*Math.min(1.25,Math.max(.8,(g.height||180)/180*.95));c.save();c.translate(w/2-(o.offset||8),h-34);c.scale(k,k);try{M.renderLudusActors(c,[actor(g,t,o)]);}catch(e){}c.restore();}
function drawFace(cv,g,t,o={}){const c=cv.getContext('2d');c.imageSmoothingEnabled=false;try{M.faceShot.paint(c,cv.width,cv.height,{g,team:o.team??1,mood:o.mood||'grin',yaw:Math.sin(t*.5)*.25,zoom:1.06,armor:g.enemyGear?.armor||{},talk:o.talk},t+2);}catch(e){}}

// ---------- Liste ----------
function filtered(){return N.TYPES.filter(t=>(!state.tier||t.tier===state.tier)&&(!state.wpn||t.weapon===state.wpn)).sort((a,b)=>a.tier-b.tier||W.indexOf(a.weapon)-W.indexOf(b.weapon));}
function card(t){return `<button class="card${state.sel===t.id?' on':''}" type="button" data-id="${t.id}"><canvas class="face" width="150" height="98" data-face="${t.id}"></canvas><canvas class="ico" width="34" height="34" data-relic="${t.id}"></canvas><div><b>${esc(t.title.replace(/^(der|die|das) /,m=>m))}</b><small><span class="skull">${skulls(t.tier)}</span> ${esc(WN(t.weapon))}</small><small><i>${esc(t.relic.name)}</i></small></div></button>`;}
function renderList(){const box=$('list'),L=filtered();if(state.view==='table'){const rows=[1,2,3,4,5].filter(n=>!state.tier||n===state.tier);
  box.innerHTML=`<div class="tblwrap"><table class="tbl"><tr><th>Waffe</th>${rows.map(n=>`<th>${skulls(n)} ${esc(NAMES[n-1])}</th>`).join('')}</tr>${W.filter(w=>!state.wpn||w===state.wpn).map(w=>`<tr><th>${esc(WN(w))}</th>${rows.map(n=>{const t=N.TYPES.find(x=>x.tier===n&&x.weapon===w);return `<td>${t?`<a href="#" data-id="${t.id}">${esc(t.title)}</a><br><small class="muted">${esc(t.relic.name)}</small>`:'–'}</td>`;}).join('')}</tr>`).join('')}</table></div>`;
  for(const a of box.querySelectorAll('[data-id]'))a.onclick=e=>{e.preventDefault();select(a.dataset.id);};return;}
 let html='';for(let n=1;n<=5;n++){const part=L.filter(t=>t.tier===n);if(!part.length)continue;html+=`<div class="tierhead"><b><span class="skull">${skulls(n)}</span> ${esc(NAMES[n-1])}</b><small>${part.length} Anführer</small></div><div class="cards">${part.map(card).join('')}</div>`;}
 box.innerHTML=html||'<p class="sub">Keine Treffer.</p>';
 for(const b of box.querySelectorAll('.card'))b.onclick=()=>select(b.dataset.id);
 // Vorschaubilder nach und nach zeichnen (Handy: nicht alles auf einmal)
 const faces=[...box.querySelectorAll('canvas[data-face]')];let i=0;const step=()=>{const t0=performance.now();while(i<faces.length&&performance.now()-t0<12){const cv=faces[i++];drawFace(cv,leader(cv.dataset.face),2,{mood:'grin'});}if(i<faces.length)requestAnimationFrame(step);};requestAnimationFrame(step);
 R.paintIcons(box);}

// ---------- Einzelansicht ----------
function select(id){state.sel=id;state.seed=1;state.mood=0;state.turn=false;const t=N.byId[id];$('detail').hidden=false;
 for(const b of document.querySelectorAll('.card'))b.classList.toggle('on',b.dataset.id===id);fill();$('detail').scrollIntoView({behavior:'smooth',block:'start'});}
function fill(){const t=N.byId[state.sel];if(!t)return;const g=leader(t.id,state.seed),e=g.enemyGear||{},arm=Object.values(e.armor||{});
 $('dName').innerHTML=`${esc(g.name)} <small class="skull">${skulls(t.tier)}</small>`;
 const q=it=>it?esc(M.itemName(it)):'–';const gq=it=>it?(['Improvisiert','Einfach','Solide','Gut','Hochwertig','Meisterhaft','Legendär'][it.q]||it.q):'';
 $('dFacts').innerHTML=[['Titel',esc(t.title)],['Bande',esc(t.crew)],['Stufe',`${skulls(t.tier)} ${esc(NAMES[t.tier-1])}`],['Klasse',esc(g.role)],['Waffe',`${q(e.weapon)} <small class="muted">(Gattung ${esc(WN(t.weapon))}, Beinamen: ${esc(t.nick.join(', '))})</small>`],
  ['Zweitwaffe',q(e.secondary)],['Schild',q(e.shield)],['Rüstung',`${arm.length} Teile · ${arm[0]?(arm[0].material==='metal'?'Metall':arm[0].material):'–'} · Güte ${esc(gq(arm[0]))}${t.noHelm?' · ohne Helm':''}`],
  ['Größe/Gewicht',`${g.height} cm · ${g.weight} kg`],['Opfer (Beispiel)',String(g.notoriousKills||'')]].map(([a,b])=>`<dt>${a}</dt><dd>${b}</dd>`).join('');
 $('rName').textContent=t.relic.name;$('rText').textContent=t.relic.text||'';$('rBonus').textContent=`Getragen: +${R.BONUS} Fertigkeit ${WN(t.weapon)}`;
 const P='Velitrae';const L=(who,l)=>`<p class="q"><b>${who==='L'?esc(g.name.split(' ')[0]):'Einer von euch'}:</b> „${esc(l)}“</p>`;
 $('dTexts').innerHTML=`<p><b class="gold">Opfer:</b> ${esc(t.kills.replace(/\{P\}/g,P))}</p>${t.why.map(w=>`<p><b class="gold">Berüchtigt, weil …</b> ${esc(w.replace(/\{P\}/g,P))}</p>`).join('')}
  <h3 style="margin-top:10px">Wortwechsel</h3>${t.intro.map(([w,l])=>L(w,l)).join('')}<h3 style="margin-top:10px">Rufe im Kampf</h3><p>${t.cry.map(esc).join(' · ')}</p><h3 style="margin-top:10px">Verletzt</h3><p>${t.hurt.map(esc).join(' · ')}</p>
  <h3 style="margin-top:10px">Am Boden</h3>${t.down.map(([w,l])=>L(w,l)).join('')}`;
 R.icon($('dIco'),t.id,0);}
// Lebendige Bilder
let t0=performance.now();function loop(now){requestAnimationFrame(loop);const t=(now-t0)/1000;const id=state.sel;if(!id||$('detail').hidden)return;
 const g=leader(id,state.seed),mood=MOODS[state.mood%MOODS.length];
 drawFigure($('dFig'),g,t,{turn:state.turn,state:Math.sin(t*.7)>.93?'celebrate':'idle'});drawFigure($('dSmall'),g,t,{turn:state.turn,scale:1.1,bg0:'#2a3a30'});drawFace($('dFace'),g,t,{mood:(t%7)<1.4?'confident':mood,talk:(t%3)<1.2});
 const w=wearerWith(id);drawFigure($('wFig'),w,t,{team:0});drawFace($('wFace'),w,t,{team:0,mood:'confident'});
 if((t%1)<.05)R.icon($('dIco'),id,t);}
requestAnimationFrame(loop);

// ---------- Bedienung ----------
$('tabs').innerHTML=[0,1,2,3,4,5].map(n=>`<button class="btn small${n===state.tier?' on':''}" type="button" data-tier="${n}">${n?`<span class="skull">${skulls(n)}</span>`:'Alle Stufen'}</button>`).join('');
for(const b of $('tabs').querySelectorAll('button'))b.onclick=()=>{state.tier=+b.dataset.tier;for(const x of $('tabs').querySelectorAll('button'))x.classList.toggle('on',x===b);renderList();};
$('wpn').insertAdjacentHTML('beforeend',W.map(w=>`<option value="${w}">${esc(WN(w))}</option>`).join(''));$('wpn').onchange=e=>{state.wpn=e.target.value;renderList();};
$('view').onchange=e=>{state.view=e.target.value;renderList();};
$('closeD').onclick=()=>{$('detail').hidden=true;state.sel=null;for(const b of document.querySelectorAll('.card'))b.classList.remove('on');};
$('bMood').onclick=()=>{state.mood++;};$('bTurn').onclick=()=>{state.turn=!state.turn;};$('bReroll').onclick=()=>{state.seed++;fill();};
$('bHelm').onclick=e=>{state.helm=!state.helm;e.target.textContent=state.helm?'Ohne Helm':'Mit Helm';};$('bArmor').onclick=e=>{state.armor=!state.armor;e.target.textContent=state.armor?'Ohne Rüstung':'Mit Rüstung';};
renderList();
const want=(location.hash||'').slice(1);if(want&&N.byId[want])select(want);
window.READY=true;
})();
