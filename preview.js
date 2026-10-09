'use strict';
// Szenen-Vorschau: baut einen Wegwerf-Spielstand im Arbeitsspeicher und spielt die Ereignis-Videos auf Knopfdruck ab.
// Wird nur von preview.html geladen. Nichts davon landet in echten Spielständen.
(()=>{if(!window.ARENA_PREVIEW)return;
const wait=(test,ms=60)=>new Promise(res=>{const id=setInterval(()=>{if(test()){clearInterval(id);res();}},ms);});
let M,S,panel,info;
async function setup(){await wait(()=>window.MG?.smithWrath&&window.MG?.archerPlot&&window.MG?.ui);M=window.MG;S=M.s;
 window.ArenaTheoryIntro?.finish?.();await wait(()=>!window.ArenaTheoryIntro?.active?.());
 if(!S.lanista){await wait(()=>document.getElementById('lanistaName')&&document.querySelector('[data-action="ludus:start"]'));document.getElementById('lanistaName').value='Marcus';document.querySelector('[data-action="ludus:start"]').click();}
 await new Promise(r=>setTimeout(r,500));if(M.intro?.active?.())M.intro.skip();await wait(()=>S.lanista&&!M.intro?.active?.());
 const W=M.workshop;S.gold=1e6;if(!W.state.master){W.hireMaster({...W.sketch(),name:'Aurifex'});}W.setIntro('done');if(M.trader)M.trader.state.intro='done';S.lion={...(S.lion||{}),stage:'skip'};
 M.forgeIntro?.skipScene?.();
 fill();M.ui.close();M.ui.click('nav:home');build();}
function fill(){S.gold=1e6;const need=7-S.roster.filter(g=>!g.dead).length;if(need>0)M.army.recruitMany(need);for(const g of S.roster){g.fatigue=0;g.blood=100;}const soldiers=S.roster.filter(g=>g.role!=='Fernkämpfer');soldiers.slice(0,2).forEach(g=>g.role='Soldat');}
function archer(cross){fill();let a=S.roster.find(g=>g.role==='Fernkämpfer'&&['bow','crossbow'].includes(M.gear(g,'weapon')?.def));if(!a){a=S.roster.find(g=>g.role!=='Soldat')||M.army.recruitMany(1)[0];a.role='Fernkämpfer';}const item=M.makeItem('weapon',cross?'crossbow':'bow',1);S.inventory.push(item);a.equipment.weapon=item.id;return a;}
function wrath(size,outcome){if(busy())return;fill();const Z=M.smithWrath,WD=M.wanderers,st=WD.state();let g=null;for(let i=0;i<300&&!g;i++){st.group=null;const c=WD.spawn();if(c&&c.size===size)g=c;}if(!g)return note('Keine Gruppe der Größe '+size+' möglich.');
 const base=g.id;for(let i=0;i<20000;i++){g.id=base+'-v'+i;if(Z.eligible(g)&&Z.outcomeOf(g)===outcome)break;}g.talk={tone:'schmied',outcome};M.ui.close();M.ui.click('nav:home');Z.start();}
function plot(mode){if(busy())return;const P=M.archerPlot,st=P.state();st.state='';st.asked=0;st.seen=S.day-10;const a=archer(mode==='cross');M.ui.close();M.ui.click('nav:home');
 if(mode==='video'||mode==='cross')P.start(a);else{P.ask();if(!P.talk)return note('Gespräch konnte nicht starten (drei einsatzfähige Gladiatoren nötig).');}}
const busy=()=>{const b=!!(M.smithWrath.scene||M.archerPlot.scene||M.archerPlot.talk||M.forgeIntro?.scene);if(b)note('Es läuft bereits eine Szene.');return b;};
function note(t){if(info)info.textContent=t;}
function build(){panel=document.createElement('section');panel.id='previewPanel';panel.innerHTML=`<h2>Szenen-Vorschau</h2><p class="pv-sub">Eigener Wegwerf-Spielstand · nichts wird gespeichert · Neu laden = frischer Stand</p>
<h3>Der Zorn des Schmieds</h3><div class="pv-row"><button class="btn primary" data-pv="w5">5 Herumtreiber</button><button class="btn" data-pv="w3">3</button><button class="btn" data-pv="w2">2</button><button class="btn" data-pv="w1">1</button><button class="btn" data-pv="wf">Flucht (25 %)</button></div>
<h3>Pfeil im Hinterkopf</h3><div class="pv-row"><button class="btn primary" data-pv="pt">Gespräch + Video</button><button class="btn" data-pv="pv">Nur Video (Bogen)</button><button class="btn" data-pv="pc">Nur Video (Armbrust)</button></div>
<p class="pv-info" id="pvInfo">Bereit.</p>`;
 document.body.appendChild(panel);info=panel.querySelector('#pvInfo');
 panel.addEventListener('click',e=>{const k=e.target.closest('[data-pv]')?.dataset.pv;if(!k)return;M.audioStart?.();({w5:()=>wrath(5,'WRATH'),w3:()=>wrath(3,'WRATH'),w2:()=>wrath(2,'WRATH'),w1:()=>wrath(1,'WRATH'),wf:()=>wrath(5,'FLEE'),pt:()=>plot('talk'),pv:()=>plot('video'),pc:()=>plot('cross')})[k]?.();});
 const css=document.createElement('style');css.textContent='#previewPanel{position:fixed;left:12px;right:12px;bottom:12px;z-index:9000;max-width:560px;margin:0 auto;padding:12px 14px;background:#142429f5;border:2px solid #e0b565;color:#efe0b3;box-shadow:0 6px 24px #000a}#previewPanel h2{margin:0;font-size:18px}#previewPanel h3{margin:10px 0 6px;font-size:15px;color:#f2d38c}#previewPanel .pv-sub,#previewPanel .pv-info{margin:4px 0 0;font-size:13px;opacity:.85}#previewPanel .pv-row{display:flex;flex-wrap:wrap;gap:6px}#previewPanel .btn{min-height:40px}body.pv-hide #previewPanel{display:none}';document.head.appendChild(css);
 setInterval(()=>{const run=!!(M.smithWrath.scene||M.archerPlot.scene||M.archerPlot.talk);document.body.classList.toggle('pv-hide',run);},300);}
setup();
})();
