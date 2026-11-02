'use strict';
// =====================================================================================================
// AUFSTELLUNG · Oberfläche (Testversion aufstellung-test.html)
// Schritt 1: Gruppe per Ziehen und Ablegen auf ein 3×3-Feld stellen (Kader in drei Klassenspalten, nach KW sortiert)
// Schritt 2: erst danach fünf Gegner, je Schwierigkeit 1–5 Totenköpfe, dazu Gelübde
// Schritt 3: echter Kampf in der Kampfansicht des Spiels (Verletzungen und Tod wirken auf den Test-Kader), dann Abrechnung
// Für eine spätere Einbindung: alles hängt an window.AufstellungUI (open/close) und nutzt nur Spielfunktionen
// (AN.build, ArenaArt.portrait, M.army.eligibility, M.advanceDay). Gold und Ruhm führt hier der Simulator selbst.
// =====================================================================================================
(()=>{
const M=window.MG,S=M.s,A=window.Aufstellung,AN=window.AN,ART=window.ArenaArt,store=window.AUF_STORE||{get:()=>null,set:()=>false,del(){}};
const KEY='aufstellung-sim-v2',ROLES=['Soldat','Assassine','Fernkämpfer'],ICON={Soldat:'🛡',Assassine:'🗡',Fernkämpfer:'🏹'},PLURAL={Soldat:'Soldaten',Assassine:'Assassinen',Fernkämpfer:'Schützen'};
const ROWS=['hinten','mitte','vorne'],LANES=['oben','mitte','unten'];
const SKULL=[null,{label:'Leicht',color:'#a9c27a'},{label:'Machbar',color:'#cfc173'},{label:'Großer Kampf',color:'#dfb66d'},{label:'Gefährlich',color:'#d98a52'},{label:'Todesmut',color:'#d0473e'}];
const VOWS={keiner:['Niemand fällt','Sieg ohne eigenen Toten ×1,5 · sonst ×0,6'],held:['Der Held','★ schafft 3+ Gegner ×1,7 · sonst ×0,7'],blitz:['Blitzsieg','Sieg unter 25 s ×1,4 · sonst ×0,75'],menge:['Volle Ränge','Spektakel ≥ 1,5 ×1,5 · sonst ×0,7']};
const FORMS={schildwall:['Schildwall','3+ Soldaten vorne'],zange:['Zange','Assassinen oben und unten'],pfeilhagel:['Pfeilhagel','2+ Schützen hinten'],keil:['Keil','★ vorne Mitte, dahinter oben und unten je einer'],dreiklang:['Drei Klassen','alle drei Klassen'],allein:['Einer gegen alle','nur ein Kämpfer']};
const PART={grund:'Grundlage',spannung:'Führungswechsel',aufholjagd:'Aufholjagd',knapp:'Knappes Ende',blut:'Gefallene',aussenseiter:'Außenseiter',helden:'Heldentaten',schaubild:'Schaubild'};
const PARAMS=[['G0','Grundbörse je 30 KW Gegner',20,300,5],['riskExp','Risiko-Steilheit (höher = leichte Kämpfe zahlen weniger)',.5,3,.1],['k','Buchmacher: Steilheit der Ansage',1,8,.25],['nExp','Buchmacher: Gewicht der Überzahl',0,1.5,.05],
 ['lossC','Verlustteiler-Stärke',0,6,.25],['severeW','Schwerverletzte zählen als … Tote',0,1,.05],['loseShare','Anteil bei Niederlage',0,1,.05],['sBlood','Spektakel je Gefallenem',0,.4,.02],['sHero','Spektakel je Kill ab dem 3.',0,1,.05],['sSwing','Spektakel je Führungswechsel',0,1,.05],['sClose','Spektakel für knappes Ende',0,2,.05],['sForm','Spektakel je Schaubild',0,.4,.02]];
const P0=JSON.parse(JSON.stringify(A.P));
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),fmt=n=>Math.round(n).toLocaleString('de-DE'),f2=v=>v.toFixed(2).replace('.',',');
const root=document.getElementById('auf');

// ---------- Test-Ludus wie in der Arena-Testversion ----------
S.started=true;S.schoolName='Ludus Probatus';S.lanista={name:'Lanista',height:180,weight:85,veteran:true,appearance:{skin:'#d9ac82',shade:'#9c7353',hair:'#443025',style:1,beard:2,cloth:'#435e6a'}};
try{const W=M.workshop;if(!W.state.master)W.hireMaster(W.sketch());W.state.intro='done';}catch(e){}
try{M.trader.state.intro='done';}catch(e){}
if(S.hall)S.hall.tut='done';else S.hall={tut:'done',recruit:null,tag:{}};
S.lion={stage:'done',recruits:[],base:[]};S.medic=Object.assign(S.medic||{},{stage:'skip'});S.archerPlot={seen:0,asked:true,state:'declined'};S.wanderers={version:1,next:(S.day||1)+99999,group:null,known:[]};
M.leaderArena=false; // Die Aufstellung kommt aus diesem Simulator, nicht aus der Anführer-Aufstellung

let st=null,offers=[],sel=null,step='group',selChip=null,busy=false,tracker=null,lastRes=null;
const blank=()=>({gold:300,fame:0,lineup:[],hero:null,vows:[],fallen:[],log:[],P:{},seed:1});
function save(){store.set(KEY,JSON.stringify({st,roster:S.roster,day:S.day}));}
function load(){try{const d=JSON.parse(store.get(KEY)||'null');if(d&&d.st&&d.roster?.length){st=Object.assign(blank(),d.st);S.roster=d.roster;if(d.day)S.day=d.day;return true;}}catch(e){console.warn(e);}return false;}
function fresh(){st=blank();nameReset();const R=A.roster(Math.floor(Math.random()*1e9));S.roster=R.map(f=>{f.g.enemy=false;f.g.fatigue=0;return f.g;});
 const pick=(r,i)=>alive().filter(g=>g.role===r).sort((a,b)=>A.kw(b)-A.kw(a))[i];
 for(const g of [pick('Soldat',1),pick('Soldat',2),pick('Assassine',1),pick('Fernkämpfer',1)])if(g)st.lineup.push(Object.assign({id:g.id},auto(g.role)));save();}
function nameReset(){}
const alive=()=>S.roster.filter(g=>!g.dead);
const G=id=>S.roster.find(g=>g.id===id);
const fit=g=>{try{return M.army?.eligibility?M.army.eligibility(g):{ok:!g.dead,causes:[]};}catch{return {ok:!g.dead,causes:[]};}};
const inL=id=>st.lineup.some(x=>x.id===id);
function auto(role){const n=r=>st.lineup.filter(x=>G(x.id)?.role===r).length;
 return role==='Fernkämpfer'?{row:'hinten',lane:['mitte','oben','unten'][n(role)%3]}:role==='Assassine'?{row:'mitte',lane:n(role)%2?'unten':'oben'}:{row:'vorne',lane:['mitte','oben','unten'][n(role)%3]};}
const lineup=()=>st.lineup.map(x=>{const g=G(x.id);return {id:g.id,g,kw:A.kw(g),role:g.role,slot:{row:x.row,lane:x.lane}};});
const forms=()=>A.formations(lineup(),st.hero);
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function params(){A.P=Object.assign(JSON.parse(JSON.stringify(P0)),st.P||{});}

// ---------- Porträts (Zeichner des Spiels) ----------
const pc=new Map();
function portrait(g){const k=g.id+(g.dead?'d':'');let p=pc.get(k);if(!p){try{p=ART.portrait(g);}catch(e){p=null;}pc.set(k,p);}return p;}
function paint(scope){for(const cv of scope.querySelectorAll('canvas[data-por]')){const g=G(cv.dataset.por)||enemyG(cv.dataset.por);if(!g)continue;const p=portrait(g);const ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,cv.width,cv.height);if(p)ctx.drawImage(p,0,0,80,90,0,0,cv.width,cv.height);if(g.dead){ctx.fillStyle='#000a';ctx.fillRect(0,0,cv.width,cv.height);}}}
function enemyG(id){const k=lastRes?.gs&&Object.values(lastRes.gs).find(x=>x.g.id===id);if(k)return k.g;for(const o of offers)for(const u of o.enemy)if(u.g.id===id)return u.g;return null;}
const por=(g,w=40,h=45)=>`<canvas class="px" width="${w}" height="${h}" data-por="${esc(g.id)}"></canvas>`;

// ---------- Darstellung ----------
function top(title,sub){return `<header class="a-top"><div class="a-title"><small>${sub}</small><b>${title}</b></div><div class="a-pill"><small>GOLD</small><b>${fmt(st.gold)}</b></div><div class="a-pill"><small>RUHM</small><b>${st.fame}</b></div><div class="a-pill"><small>TAG</small><b>${S.day||1}</b></div><button class="a-ico" data-act="menu" aria-label="Menü">☰</button></header>`;}
const steps=n=>`<div class="steps">${['1 · AUFSTELLUNG','2 · GEGNER ☠','3 · KAMPF'].map((s,i)=>`<span class="${i===n?'on':''}">${s}</span>`).join('')}</div>`;
function render(){params();if(step==='group')viewGroup();else if(step==='offers')viewOffers();else if(step==='result')viewResult();paint(root);}
function viewGroup(){
 const L=lineup(),sum=L.reduce((a,x)=>a+x.kw,0),fs=forms();
 const cols=ROLES.map(r=>{const list=alive().filter(g=>g.role===r).sort((a,b)=>A.kw(b)-A.kw(a));
  return `<div class="col" data-r="${r}"><h3><span>${ICON[r]} ${PLURAL[r]}</span><span>${list.length}</span></h3><div class="list" data-roster>${list.map(g=>{const f=fit(g),cls=['card'];if(inL(g.id))cls.push('in');if(!f.ok)cls.push('out');if(st.hero===g.id)cls.push('hero');
   const sub=!f.ok?esc((f.causes||[])[0]||'nicht einsatzbereit'):(g.auf?.kills?g.auf.kills+' Kills · ':'')+(g.auf?.fights?g.auf.fights+' Kämpfe':'frisch');
   return `<div class="${cls.join(' ')}" data-drag="${esc(g.id)}" data-from="roster">${por(g)}<div class="nm">${esc(g.name)}<small><b class="kw">${A.kw(g)}</b> ${sub}</small></div></div>`;}).join('')}</div><button class="buy" data-buy="${r}">+ Rekrut · 100</button></div>`;}).join('');
 let grid='<div></div>'+ROWS.map(r=>`<div class="gh">${r}</div>`).join('');
 for(const lane of LANES){grid+=`<div class="gl">${lane}</div>`;for(const row of ROWS){const here=st.lineup.filter(x=>x.row===row&&x.lane===lane);
  grid+=`<div class="cell" data-cell="${row}|${lane}">${here.map(x=>{const g=G(x.id);return `<div class="chip${selChip===g.id?' sel':''}${st.hero===g.id?' hero':''}" data-r="${g.role}" data-drag="${esc(g.id)}" data-from="grid">${por(g,24,27)}<span class="n">${st.hero===g.id?'★':''}${esc(g.name)}</span><b>${A.kw(g)}</b></div>`;}).join('')}</div>`;}}
 grid+='<div></div><div class="foe">GEGNER ▶</div>';
 root.innerHTML=top('AUFSTELLUNG','ARENA THEORY · TESTVERSION')+`<main>${steps(0)}
 <section class="box"><div class="bh"><h2>Kader</h2><span>nach Kampfwert · ziehen oder antippen</span></div><div class="cols">${cols}</div></section>
 <section class="box"><div class="bh"><h2>Aufstellung</h2><span>${L.length}/10</span></div><div class="grid${selChip?' picking':''}">${grid}</div>
  <div class="sum">${L.length?`<span>Köpfe <b>${L.length}</b></span><span>KW-Summe <b>${sum}</b></span>${ROLES.map(r=>`<span>${ICON[r]} <b>${L.filter(x=>x.role===r).length}</b></span>`).join('')}<span>${st.hero?'★ <b>'+esc(G(st.hero)?.name)+'</b>':'kein ★-Held'}</span>`:'<span>Zieh Kämpfer aus dem Kader auf ein Feld.</span>'}</div>
  <div class="forms">${Object.entries(FORMS).map(([k,[l,h]])=>`<span class="badge${fs.includes(k)?' on':''}" title="${esc(h)}">${l}</span>`).join('')}</div>
  ${selChip?`<div class="acts"><button data-act="hero">${st.hero===selChip?'★ Held weg':'★ Held'}</button><button data-act="remove">Abziehen</button><button data-act="unsel">Fertig</button></div>`:''}
  <p class="hint">${selChip?esc(G(selChip)?.name)+': Feld antippen zum Versetzen.':'Karten seitlich aus dem Kader ziehen (oder antippen). Zurück in den Kader ziehen = abziehen. Hinten wartet, bis es ernst wird. Schaubilder mag das Publikum.'}</p></section>
 ${st.fallen.length?`<section class="box fallen"><b>Gefallen:</b> ${st.fallen.slice(-12).map(f=>`✝ ${esc(f.name)} (${f.kw}, Tag ${f.day})`).join(' · ')}</section>`:''}
 </main><div class="go"><button class="main" data-act="ready" ${L.length?'':'disabled'}>GRUPPE STEHT · GEGNER ☠</button></div>`;}
function offerCard(o,i){const sk=SKULL[o.skulls],typ=Math.round(o.base*o.risk/5)*5,epic=Math.round(o.base*o.risk*2.4/5)*5,shown=o.enemy.slice(0,10);
 return `<div class="offer${sel===i?' sel':''}" data-offer="${i}"><p class="sk" style="color:${sk.color}">${'☠'.repeat(o.skulls)}<small>${sk.label.toUpperCase()}</small></p><h3>${esc(o.label)}</h3>
 <div class="foes">${shown.map(u=>`<span class="f">${por(u.g,40,45)}${A.kw(u.g)}</span>`).join('')}${o.enemy.length>10?`<span class="f">+${o.enemy.length-10}</span>`:''}</div>
 <div class="meta"><span>Köpfe <b>${o.enemy.length}</b> gegen ${st.lineup.length}</span><span>KW-Summe <b>${o.enKW}</b> gegen ${o.ownKW}</span><span>Ansage <b>${Math.round(o.pA*100)} %</b></span></div>
 <div class="meta"><span class="g">Siegprämie: gewöhnlich <b>${fmt(typ)}</b> · großer Kampf bis <b>${fmt(epic)}</b></span></div></div>`;}
function viewOffers(){
 const L=lineup();
 root.innerHTML=top('GEGNER','ARENA THEORY · TESTVERSION')+`<main>${steps(1)}
 <section class="box"><div class="bh"><h2>Deine Gruppe</h2><button class="a-ico" style="width:auto;padding:0 10px;height:30px;font-size:11px" data-act="back">◀ ÄNDERN</button></div>
  <div class="mine">${L.map(x=>por(x.g,40,45)).join('')}<span style="font-size:12px;color:#97aaa8;margin-left:6px">${L.length} Köpfe · KW ${L.reduce((a,x)=>a+x.kw,0)}</span></div></section>
 <p class="eyebrow">Je mehr Totenköpfe, desto größer das Risiko – und die Börse. Leichte Kämpfe zahlen fast nichts.</p>
 ${offers.length?offers.map(offerCard).join(''):'<div class="box">Gegner werden ausgesucht …</div>'}
 <section class="box"><div class="bh"><h2>Gelübde</h2><span>höchstens zwei</span></div><div class="vows">${Object.entries(VOWS).map(([k,[l,h]])=>`<button class="vow${st.vows.includes(k)?' on':''}" data-vow="${k}"><b>${l}</b>${h}</button>`).join('')}</div></section>
 </main><div class="go"><button data-act="probe" ${sel==null||busy?'disabled':''}>PROBE ×10</button><button class="main" data-act="fight" ${sel==null||busy?'disabled':''}>KAMPF!</button></div>`;}
function chart(r){const W=340,H=130,p=16,T=Math.max(5,r.curve[r.curve.length-1][0]),X=t=>p+(W-2*p)*t/T,Y=v=>H-p-(H-2*p)*Math.max(0,Math.min(1,v));
 const line=i=>r.curve.map(c=>X(c[0]).toFixed(1)+','+Y(c[i]).toFixed(1)).join(' ');
 return `<svg class="chart" viewBox="0 0 ${W} ${H}"><line x1="${p}" x2="${W-p}" y1="${H-p}" y2="${H-p}" stroke="#394b4d"/>${r.swingT.map(t=>`<line x1="${X(t)}" x2="${X(t)}" y1="${p}" y2="${H-p}" stroke="#dfb66d" stroke-dasharray="3 3" opacity=".6"/>`).join('')}
 <polyline fill="none" stroke="#88baa6" stroke-width="2.5" points="${line(1)}"/><polyline fill="none" stroke="#d57668" stroke-width="2.5" points="${line(2)}"/>${r.events.map(e=>`<line x1="${X(e.t)}" x2="${X(e.t)}" y1="${H-p}" y2="${H-p+6}" stroke="${e.team?'#d57668':'#88baa6'}" stroke-width="2"/>`).join('')}
 <text x="${W-p}" y="${H-3}" fill="#97aaa8" font-size="9" text-anchor="end">${Math.round(T)} s</text><text x="${p}" y="11" fill="#97aaa8" font-size="9">Restkraft</text></svg>
 <div class="legend"><span><i style="background:#88baa6"></i>deine Gruppe</span><span><i style="background:#d57668"></i>Gegner</span><span><i style="background:#dfb66d"></i>Führungswechsel</span></div>`;}
function viewResult(){const r=lastRes.r,o=lastRes.o,maxP=Math.max(.5,...Object.values(r.parts));
 const verdict=r.spect>=1.8?'Die Ränge toben!':r.spect>=1.2?'Ein Kampf, über den man spricht.':r.spect>=.8?'Ordentlicher Kampf.':'Die Menge gähnt und pfeift.';
 const own=r.units.filter(u=>u.team===0).map(u=>{const g=G(u.key)||lastRes.gs?.[u.key]?.g;return `<div class="${u.dead?'dead':''}">${g?por(g,40,45):''}<span>${u.dead?'✝ ':''}${esc(u.name)}${u.kills?` · ${u.kills}×`:''}<small>${u.dead?esc(u.cause||'gefallen'):(u.injuries||[]).length?esc(u.injuries.slice(0,2).join(', ')):u.injured?'leicht verletzt':'unverletzt'}</small></span></div>`;}).join('');
 const ev=r.events.map(e=>`<div><span class="t">${e.t.toFixed(1)} s</span><span class="${e.team?'e':'o'}">${e.type==='tot'?'✝':'⤓'} ${esc(e.name)} (${e.kw})</span>${e.by?' ← '+esc(e.by):''}${e.under?' <span class="x">Außenseiter!</span>':''}</div>`).join('')||'<div>Keine Gefallenen.</div>';
 const vow=r.vowRes.map(v=>`${v.ok?'✔':'✘'} ${v.label} ×${String(v.mul).replace('.',',')}`).join(' · ');
 root.innerHTML=top('ABRECHNUNG','ARENA THEORY · TESTVERSION')+`<main>${steps(2)}<section class="box res">
 <p class="eyebrow" style="color:${SKULL[o.skulls].color}">${'☠'.repeat(o.skulls)} ${esc(o.label)}</p><h2 class="${r.won?'won':'lost'}">${r.draw?'UNENTSCHIEDEN':r.won?'SIEG':'NIEDERLAGE'}</h2><div class="gold">+${fmt(r.gold)} Gold</div><p class="sub">${r.time} s · ${verdict}</p>${chart(r)}
 <h2 style="margin-top:12px;font-size:13px">Spektakel ${f2(r.spect)}${r.tempo<1?' <small style="color:#97aaa8">(×'+String(r.tempo).replace('.',',')+' Dauer)</small>':''}</h2>
 <div class="bars">${Object.entries(r.parts).filter(([,v])=>v>.004).map(([k,v])=>`<div class="bar"><span>${PART[k]||k}</span><span class="bg"><i style="width:${v/maxP*100}%"></i></span><span>${f2(v)}</span></div>`).join('')}</div>
 <div class="formula">${fmt(r.base)} Grundbörse × ${f2(r.risk)} Risiko × ${f2(r.spect)} Spektakel${r.vowRes.length?' × '+f2(r.vowMul)+' Gelübde':''} × ${f2(r.fameMul)} Ruhm ÷ ${f2(r.divisor)} Verlustteiler${r.won?'':' × '+String(A.P.loseShare).replace('.',',')+' Niederlage'} = <b>${fmt(r.gold)}</b><br>
 Verlustteiler: ${r.deaths} Tote, ${r.severe} Schwerverletzte bei ${r.N} Köpfen · Ruhm ${r.fameDelta>=0?'+':''}${r.fameDelta}${vow?'<br>Gelübde: '+vow:''}${r.heroes.length?'<br>Heldentaten: '+r.heroes.map(h=>esc(h.name)+' '+h.kills+'×'+(h.team?' (Gegner)':'')).join(', '):''}</div>
 <h2 style="margin:12px 0 6px;font-size:13px;text-align:left">Deine Kämpfer</h2><div class="fighters">${own}</div>
 <h2 style="margin:12px 0 0;font-size:13px;text-align:left">Verlauf</h2><div class="ticker">${ev}</div></section></main>
 <div class="go"><button data-act="nextday">NEUER TAG</button><button class="main" data-act="again">WEITER</button></div>`;}
function toast(m){const d=document.createElement('div');d.className='toast';d.textContent=m;root.appendChild(d);setTimeout(()=>d.remove(),1900);}
function overlay(h){let o=root.querySelector('.a-ov');if(!o){o=document.createElement('div');o.className='a-ov';o.style.cssText='position:fixed;inset:0;z-index:150;background:#0b0705e6;overflow:auto';root.appendChild(o);}o.innerHTML=`<main><section class="box">${h}</section></main>`;return o;}
const closeOverlay=()=>root.querySelector('.a-ov')?.remove();

// ---------- Gegner erst, wenn die Gruppe steht ----------
function showOffers(){const L=lineup();if(!L.length)return;const bad=L.filter(x=>!fit(x.g).ok);if(bad.length){toast(bad[0].g.name+' ist nicht einsatzbereit.');return;}
 params();const seed=hash((S.day||1)+'|'+L.map(x=>x.id).sort().join(',')+'|'+st.seed);offers=A.offers(L,seed);sel=null;step='offers';render();root.scrollTop=0;}

// ---------- Ziehen und Ablegen (Maus sofort, Finger nach kurzem Halten) ----------
let drag=null;
function place(id,row,lane){const x=st.lineup.find(x=>x.id===id);if(x){x.row=row;x.lane=lane;}else{const g=G(id);if(!g||!fit(g).ok)return toast((g?.name||'')+' ist nicht einsatzbereit.');if(st.lineup.length>=10)return toast('Höchstens 10 Kämpfer.');st.lineup.push({id,row,lane});}save();render();}
function remove(id){st.lineup=st.lineup.filter(x=>x.id!==id);if(st.hero===id)st.hero=null;if(selChip===id)selChip=null;save();render();}
function tap(id,from){if(from==='roster'){if(inL(id))return remove(id);const g=G(id);const s=auto(g.role);place(id,s.row,s.lane);}else{selChip=selChip===id?null:id;render();}}
root.addEventListener('pointerdown',e=>{if(step!=='group'||busy)return;const el=e.target.closest('[data-drag]');if(!el||e.button>0)return;
 drag={id:el.dataset.drag,from:el.dataset.from,el,x0:e.clientX,y0:e.clientY,mouse:e.pointerType==='mouse',on:false,dead:false};
 if(!drag.mouse)drag.timer=setTimeout(()=>{if(drag&&!drag.dead&&!drag.on)start(drag.x0,drag.y0);},230);});
function start(x,y){if(!drag)return;const g=G(drag.id);if(drag.from==='roster'&&g&&!fit(g).ok){drag.dead=true;toast(g.name+' ist nicht einsatzbereit.');return;}
 drag.on=true;try{navigator.vibrate?.(12);}catch{}const gh=document.createElement('div');gh.className='chip ghost';gh.dataset.r=g.role;gh.innerHTML=por(g,24,27)+`<span class="n">${esc(g.name)}</span><b>${A.kw(g)}</b>`;root.appendChild(gh);paint(gh);drag.ghost=gh;move(x,y);}
function target(x,y){const el=document.elementFromPoint(x,y);return {cell:el?.closest?.('[data-cell]'),roster:el?.closest?.('[data-roster]')};}
function move(x,y){if(!drag?.ghost)return;drag.ghost.style.left=x+'px';drag.ghost.style.top=y+'px';const t=target(x,y);
 root.querySelectorAll('.cell.hot,.list.drop').forEach(c=>c.classList.remove('hot','drop'));if(t.cell)t.cell.classList.add('hot');else if(t.roster&&drag.from==='grid')t.roster.classList.add('drop');}
window.addEventListener('pointermove',e=>{if(!drag||drag.dead)return;const d=Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0);
 if(!drag.on){const dx=Math.abs(e.clientX-drag.x0),dy=Math.abs(e.clientY-drag.y0);
  // Maus und Raster-Figuren: sofort. Kader-Karten am Finger: seitlich herausziehen (senkrecht scrollt die Seite)
  if((drag.mouse||drag.from==='grid')&&d>6)start(e.clientX,e.clientY);
  else if(!drag.mouse&&dx>8&&dx>dy*1.1)start(e.clientX,e.clientY);
  else if(!drag.mouse&&dy>10){drag.dead=true;clearTimeout(drag.timer);}return;}move(e.clientX,e.clientY);});
// Blockierende Touch-Listener: nur so darf das Ziehen nach dem Halten das Scrollen verhindern
root.addEventListener('touchstart',()=>{},{passive:false});
window.addEventListener('touchmove',e=>{if(drag?.on&&e.cancelable)e.preventDefault();},{passive:false});
function end(e,cancel){if(!drag)return;const d=drag;drag=null;clearTimeout(d.timer);d.ghost?.remove();root.querySelectorAll('.cell.hot,.list.drop').forEach(c=>c.classList.remove('hot','drop'));
 if(cancel)return;if(d.on){const t=target(e.clientX,e.clientY);if(t.cell){const [row,lane]=t.cell.dataset.cell.split('|');place(d.id,row,lane);}else if(t.roster&&d.from==='grid')remove(d.id);}
 else if(!d.dead){d.tapped=true;tap(d.id,d.from);}}
window.addEventListener('pointerup',e=>end(e,false));window.addEventListener('pointercancel',e=>end(e,true));
root.addEventListener('contextmenu',e=>{if(e.target.closest('[data-drag]'))e.preventDefault();});

// ---------- Klicks ----------
root.addEventListener('click',e=>{const t=e.target.closest('[data-act],[data-cell],[data-buy],[data-vow],[data-offer]');if(!t||busy)return;
 if(t.dataset.cell){if(selChip&&!e.target.closest('[data-drag]')){const [row,lane]=t.dataset.cell.split('|');place(selChip,row,lane);}return;}
 if(false){const [row,lane]=t.dataset.cell.split('|');place(selChip,row,lane);return;}
 if(t.dataset.buy){if(st.gold<100)return toast('Zu wenig Gold.');st.gold-=100;const f=A.recruit(hash('r'+Date.now()+S.roster.length),t.dataset.buy,S.roster.length+st.fallen.length);f.g.enemy=false;f.g.fatigue=0;S.roster.push(f.g);save();render();toast(`${f.g.name} (${A.kw(f.g)} KW) gekauft.`);return;}
 if(t.dataset.vow){const v=t.dataset.vow;if(st.vows.includes(v))st.vows=st.vows.filter(x=>x!==v);else{if(st.vows.length>=2)st.vows.shift();st.vows.push(v);}save();render();return;}
 if(t.dataset.offer){sel=+t.dataset.offer;render();return;}
 const a=t.dataset.act;
 if(a==='hero'){st.hero=st.hero===selChip?null:selChip;save();render();}
 else if(a==='remove')remove(selChip);
 else if(a==='unsel'){selChip=null;render();}
 else if(a==='ready'){selChip=null;showOffers();}
 else if(a==='back'){step='group';offers=[];sel=null;render();}
 else if(a==='fight')fight();
 else if(a==='probe')probe();
 else if(a==='again'){step='group';offers=[];sel=null;st.seed++;save();render();root.scrollTop=0;}
 else if(a==='nextday'){nextDay();}
 else if(a==='menu')menu();
});
function nextDay(){try{M.advanceDay(1);}catch(e){console.warn(e);}pc.clear();st.lineup=st.lineup.filter(x=>G(x.id)&&!G(x.id).dead);save();step='group';offers=[];sel=null;render();toast('Tag '+(S.day||1)+' · Verletzte erholen sich');}

// ---------- Echter Kampf in der Kampfansicht des Spiels ----------
const fs0=M.fixedStep;
M.fixedStep=function(){const r=fs0.apply(this,arguments);if(tracker&&S.battle===tracker.b)tracker.tick();return r;};
function fight(){const o=offers[sel];if(!o)return;const L=lineup();busy=true;const kwBefore={};for(const x of L)kwBefore[x.id]={kw:x.kw,role:x.role,g:x.g};
 const spec=A.spec(L,o,false);
 S.battle=null;try{M.ui.click('nav:home');}catch(e){}try{window.HahnArena?.resetScene?.();}catch(e){}
 M.stains=[];M.limbs=[];M.swings=[];M.floaters=[];M.shake=0;for(const p of [...(M.fx||[]),...(M.shots||[])])p.active=false;
 const b=AN.build(spec);b.league=0;A.place(b,L);S.battle=b;
 tracker=A.tracker(b,L,o,{vows:st.vows,hero:st.hero,fame:st.fame});
 document.body.classList.add('auf-fighting');
 AN.listeners.push(out=>{const T=tracker;tracker=null;let r;try{r=T.done(out);}catch(e){console.error(e);}
  setTimeout(()=>{S.battle=null;try{M.ui.render();}catch(e){}document.body.classList.remove('auf-fighting');busy=false;try{ART.clearFigures?.();}catch(e){}pc.clear();if(r)settle(r,o,kwBefore);else{step='group';render();}},1400);});
 try{M.ui.render();}catch(e){console.error(e);}}
function settle(r,o,kwBefore={}){st.gold+=r.gold;st.fame=Math.max(-50,Math.min(150,st.fame+r.fameDelta));
 for(const u of r.units.filter(u=>u.team===0)){const g=G(u.key);
  if(g){g.auf=g.auf||{};g.auf.fights=(g.auf.fights||0)+1;g.auf.kills=(g.auf.kills||0)+(u.kills||0);}
  if(u.dead||g?.dead){st.fallen.push({name:u.name,kw:kwBefore[u.key]?.kw||0,role:kwBefore[u.key]?.role||'',day:S.day||1,cause:u.cause});if(st.hero===u.key)st.hero=null;}}
 st.lineup=st.lineup.filter(x=>G(x.id)&&!G(x.id).dead);st.log.push({day:S.day||1,label:o.label,skulls:o.skulls,won:r.won,gold:r.gold});if(st.log.length>60)st.log.shift();
 lastRes={r,o,gs:kwBefore};step='result';save();render();root.scrollTop=0;}

// ---------- Probe ×10 (Rechenwerk im Hintergrund, Kopien – ändert nichts) ----------
let W=null,wid=0;
function worker(){if(W)return W;W=new Worker('aufstellung-worker.js?v='+encodeURIComponent(typeof BUILD!=='undefined'?BUILD:''));return W;}
function probe(){const o=offers[sel];if(!o)return;busy=true;render();const n=10,all=[];const id=++wid;
 const L=JSON.parse(JSON.stringify(lineup().map(x=>({id:x.id,g:x.g,kw:x.kw,role:x.role,slot:x.slot}))));
 const draw=()=>overlay(`<div class="bh"><h2>Probekämpfe</h2><span>${all.length} / ${n}</span></div><p class="hint">Kopien deiner Gruppe · zählt nicht für Gold, Ruhm, Verletzungen</p><div class="prog"><i style="width:${all.length/n*100}%"></i></div>${all.length?table(all):''}<div class="row"><button data-x="close">${all.length<n?'Abbrechen':'Schließen'}</button></div>`);
 const ov=draw();ov.onclick=e=>{if(e.target.closest('[data-x=close]')){W?.postMessage({cmd:'stop'});closeOverlay();busy=false;render();}};
 const w=worker();w.onmessage=e=>{const d=e.data;if(d.ready||d.id!==id)return;if(d.error){toast('Fehler: '+d.error.slice(0,80));busy=false;closeOverlay();render();return;}
  if(d.result){all.push(d.result);const ov2=draw();ov2.onclick=ov.onclick;}if(d.done){busy=false;}};
 w.postMessage({cmd:'fight',id,P:st.P,lineup:L,offer:JSON.parse(JSON.stringify(o)),vows:st.vows,hero:st.hero,fame:st.fame,n});}
function table(a){const n=a.length,avg=f=>a.reduce((s,r)=>s+f(r),0)/n,gs=a.map(r=>r.gold).sort((x,y)=>x-y);
 return `<table><tr><td>Siege</td><td>${a.filter(r=>r.won).length} / ${n}</td></tr><tr><td>Ø Gold</td><td>${fmt(avg(r=>r.gold))}</td></tr><tr><td>Gold-Spanne</td><td>${fmt(gs[0])} – ${fmt(gs[n-1])}</td></tr><tr><td>Ø Tote</td><td>${f2(avg(r=>r.deaths))}</td></tr><tr><td>Ø Schwerverletzte</td><td>${f2(avg(r=>r.severe))}</td></tr><tr><td>Ø Spektakel</td><td>${f2(avg(r=>r.spect))}</td></tr><tr><td>Ø Dauer</td><td>${Math.round(avg(r=>r.time))} s</td></tr><tr><td>Gold − 100 je Toten</td><td>${fmt(avg(r=>r.gold-100*r.deaths))}</td></tr></table>`;}

// ---------- Menü ----------
function menu(){const P=Object.assign({},P0,st.P);
 const ov=overlay(`<div class="bh"><h2>Menü</h2></div><div class="row"><button data-x="day">Neuer Tag</button><button data-x="new">Neu beginnen</button></div>
 <div class="set"><h2 style="margin-top:14px;font-size:13px">Stellschrauben</h2><p class="hint">Nur für diese Testversion.</p>${PARAMS.map(([k,l,a,b,s])=>`<label>${l}<output id="ao_${k}">${P[k]}</output><input type="range" min="${a}" max="${b}" step="${s}" value="${P[k]}" data-p="${k}"></label>`).join('')}</div>
 <p class="hint">Gold = Grundbörse × Risiko × Spektakel × Gelübde × Ruhm ÷ Verlustteiler. Verlustteiler = 1 + 2 × (Tote + ½ Schwerverletzte) / Köpfe – jeder Kopf zählt gleich.</p>
 <h2 style="margin-top:12px;font-size:13px">Letzte Kämpfe</h2><table>${st.log.slice(-10).reverse().map(l=>`<tr><td>Tag ${l.day} · ${'☠'.repeat(l.skulls||0)} ${esc(l.label)} · ${l.won?'Sieg':'Niederlage'}</td><td>${fmt(l.gold)}</td></tr>`).join('')||'<tr><td>noch keine</td><td></td></tr>'}</table>
 <div class="row"><button data-x="reset">Standardwerte</button><button data-x="close">Schließen</button></div>`);
 ov.oninput=e=>{const i=e.target.closest('[data-p]');if(!i)return;st.P[i.dataset.p]=+i.value;ov.querySelector('#ao_'+i.dataset.p).textContent=i.value;save();};
 ov.onclick=e=>{const x=e.target.closest('[data-x]')?.dataset.x;if(!x)return;
  if(x==='close'){closeOverlay();render();}else if(x==='reset'){st.P={};save();closeOverlay();render();}
  else if(x==='day'){closeOverlay();nextDay();}
  else if(x==='new'){if(!confirm('Testversion neu beginnen? Kader, Gold und Ruhm werden zurückgesetzt.'))return;closeOverlay();store.del(KEY);fresh();step='group';offers=[];render();}};}

// ---------- Start ----------
try{window.ArenaUI?.close?.();}catch(e){}
window.AufstellungUI={open(){root.hidden=false;render();},close(){root.hidden=true;},get state(){return st;}};
try{M.ui.click('nav:home');}catch(e){}
if(!load())fresh();
window.AUF_READY=true;render();
})();
