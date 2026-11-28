'use strict';
/* KATZEN-KAMPF-EDITOR (katze-kampf.html, Schritt KA3a): baut mit KATZE.K.build (katze-kampf.js) einen Kampf Katzen gegen Menschen,
   zeigt Zustand, Wunden, Kampfbericht, löst einzelne Angriffe aus und rechnet viele Kämpfe ohne Bild. Bedienung Deutsch, Katzeninhalte Englisch.
   Aufbau vom Bären-Kampf-Editor übernommen. Ändert keinen Spielstand: Der Speicher des Spiels wird hier gar nicht geladen, M.persist ist abgeschaltet. */
(()=>{
const M=window.MG,C=window.KATZE,K=C?.K,$=id=>document.getElementById(id);
if(!M||!K||!window.AN){window.onerror?.('Spielmodule unvollständig geladen','katze-kampf-editor',0);return;}
const S=M.s;M.persist=()=>true;S.options=S.options||{};S.options.sound=false;S.options.music=false;S.options.speed=1;
const nf=(v,d=1)=>Number(v).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d}),esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
const STUFEN=['0 · Gewöhnlich','1 · Erfahren','2 · Talentiert','3 · Elite','4 · Champion','5 · Ausnahmetalent','6 · Legende'];
const WAFFEN=[['gladius','Gladius'],['short','Kurzschwert'],['long','Langschwert'],['dagger','Dolch'],['spear','Speer'],['trident','Dreizack'],['axe','Axt'],['doubleaxe','Doppelaxt'],['club','Keule'],['mace','Streitkolben'],['hammer','Hammer'],['halberd','Hellebarde'],['greatsword','Zweihandschwert'],['fist','Fäuste']];
const RUEST=[['none','keine'],['leather','Leder'],['medium','Schienen'],['metal','Metall']];
const val=id=>$(id).value,REGLER=['schaden','haerte','maehne'];

// ---------- Auswahlfelder ----------
for(let i=1;i<=3;i++)$('zahlA').insertAdjacentHTML('beforeend',`<option value="${i}"${i===1?' selected':''}>${i}</option>`);
for(let i=1;i<=6;i++)$('zahlB').insertAdjacentHTML('beforeend',`<option value="${i}"${i===2?' selected':''}>${i}</option>`);
{let grp='';for(const b of C.BREEDS){if(b.group!==grp){grp=b.group;$('sorteA').insertAdjacentHTML('beforeend',`<optgroup label="${esc(grp)}"></optgroup>`);}
  $('sorteA').lastElementChild.insertAdjacentHTML('beforeend',`<option value="${b.id}"${b.id===C.FIRST?' selected':''}>${'☠'.repeat(b.skulls)} ${esc(b.name)} · ${b.kg0} kg${b.built?'':' *'}</option>`);}}
STUFEN.forEach((t,i)=>$('stufeB').insertAdjacentHTML('beforeend',`<option value="${i}"${i===2?' selected':''}>${t}</option>`));
for(const [id,n] of WAFFEN)$('waffeB').insertAdjacentHTML('beforeend',`<option value="${id}">${n}</option>`);
for(const [id,n] of RUEST)$('ruestB').insertAdjacentHTML('beforeend',`<option value="${id}"${id==='leather'?' selected':''}>${n}</option>`);
function sync(){for(const k of REGLER){K.OPT[k]=+val(k);$(k+'Text').textContent=nf(K.OPT[k],2)+'×';}K.OPT.sprung=$('sprung').checked?1:0;K.OPT.reakt=$('reakt').checked?1:0;}

// ---------- Aufstellung ----------
function mensch(i){const q=+val('stufeB'),rng=S.rng,g=M.makeGladiator(q,true);S.rng=rng;g.role='Soldat';
 const w=val('waffeB'),mat=val('ruestB'),armor={};if(mat!=='none')for(const d of M.armorDefs)armor[d.id]=M.makeItem('armor',d.id,Math.min(q,4),mat);
 g.enemyGear={weapon:w==='fist'?null:M.makeItem('weapon',w,Math.min(q,4),'metal'),secondary:null,shield:null,armor};g.equipment={weapon:null,secondary:null,shield:null,armor:{}};return {kind:'human',g,key:'B'+i};}
function katze(i){const id=val('sorteA'),D=C.create(id);if(val('werte')==='typisch')D.stats={...C.breed(id).werte};return {kind:'cat',D,key:'A'+i};}
const reihe=(n,f)=>Array.from({length:n},(_,i)=>f(i));
const spec=()=>({blue:reihe(+val('zahlA'),katze),red:reihe(+val('zahlB'),mensch),title:'Cat pit'});
let run=null,logLen=-1;
function build(){S.battle=null;M.shots?.forEach?.(p=>p.active=false);M.stains.length=0;if(M.limbs)M.limbs.length=0;
 const b=K.build(spec());b.time=b.startTime=0;S.battle=b;run={b,end:0};S.options.speed=+val('spd');$('pause').textContent='⏸ Pause';logLen=-1;}
$('go').onclick=build;
$('pause').onclick=()=>{const b=S.battle;if(!b)return;b.paused=!b.paused;$('pause').textContent=b.paused?'▶ Weiter':'⏸ Pause';};
$('einzel').onclick=()=>{const b=S.battle;if(!b)return;b.paused=false;K.fixed(1/60);b.paused=true;$('pause').textContent='▶ Weiter';};
$('spd').onchange=()=>{S.options.speed=+val('spd');};
for(const id of ['zahlA','zahlB','sorteA','stufeB','waffeB','ruestB','werte'])$(id).addEventListener('input',()=>{sync();build();});
for(const id of REGLER)$(id).addEventListener('input',sync);
$('sprung').checked=!!K.OPT.sprung;$('sprung').addEventListener('change',sync);$('reakt').checked=!!K.OPT.reakt;$('reakt').addEventListener('change',sync);
for(const [id,en,de,text] of K.ATTACKS)$('angriffe').insertAdjacentHTML('beforeend',`<button class="btn" type="button" data-angriff="${id}" title="${esc(text)}">${esc(de)}<br><small>${esc(en)}</small></button>`);
$('angriffe').onclick=e=>{const k=e.target.closest('[data-angriff]')?.dataset.angriff;if(!k)return;K.force=k;const b=S.battle?.actors.find(a=>a.katze&&a.team===0&&!a.g.dead);if(b)b.cool=0;};

// ---------- Zustand ----------
const MODE_DE={approach:'geht auf den Gegner zu',dead:'tot',gone:'geflohen',...Object.fromEntries(K.ATTACKS.map(a=>[a[0],a[2]+' ('+a[1]+')']))};
const bar=(v,rot)=>`<span class="bar${rot?' rot':''}"><i style="width:${Math.round(Math.max(0,Math.min(100,v)))}%"></i></span>`;
function karte(a){
 if(a.katze){const D=a.katze,Br=C.breed(D.breed);return `<div class="karte"><b>${esc(a.g.name)}</b> · ${esc(Br.name)} · ${D.weight} kg · Seite A<br>`+
  (a.g.dead?`<span class="tot">tot: ${esc(a.g.cause)}</span>`:a.fled?'<span class="tot">geflohen</span>':`${esc(MODE_DE[a.mode]||a.mode)}`+(K.fury(a)?' · <span class="tot">verwundet und wütend</span>':''))+
  `<br>Gesundheit ${bar(K.health(a))} Blut ${bar(a.blood,1)} Mut ${bar(a.morale)} Kraft ${bar(a.energy)}<div class="teile">`+K.PARTS.map(p=>`<span>${K.PART_DE[p]} ${Math.round(a.tissue[p]/a.max[p]*100)} %</span>`).join('')+
  `</div><small>Treffer ${a.hits} · getötet ${a.kills} · Ansprünge ${a.pounces} (gelandet ${a.landed}) · Würgebisse ${a.pins} (Nacken ${a.napes}) · Boxen ${a.boxes} · Festkrallen ${a.grabs} · Aufschlitzen ${a.rakes} · Wegzerren ${a.dragged} · Lauern ${a.lurks} · Scheinangriffe ${a.feints} · ausgewichen ${a.dodges} · zurückgeworfen ${a.recoils} · Gegenangriffe ${a.retorts}`+(K.lame(a)>0?` · lahmt ${Math.round(K.lame(a)*100)} %`:'')+`</small></div>`;}
 const g=a.g,weg=Object.entries(g.body).filter(([,p])=>p.missing).map(([id])=>M.partName?M.partName(id):id);
 return `<div class="karte"><b>${esc(g.name)}</b> · Mensch · Seite B<br>`+(g.dead?`<span class="tot">tot: ${esc(g.cause||'')}</span>`:a.pinnedBy?'<span class="tot">liegt unter der Katze</span>':a.down?'<span class="tot">am Boden</span>':`Gesundheit ${bar(M.health(g))} Blut ${bar(g.blood??100,1)}`)+
  (weg.length?`<br><small>fehlt: ${esc(weg.join(', '))}</small>`:'')+'</div>';}
function tick(){const r=run;if(!r||S.battle!==r.b)return;const b=r.b;
 let h=`<div class="karte">Zeit <b>${nf(b.time-b.startTime)} s</b> · Zeichenzeit je Katze <b>${nf(K.drawMs||0,2)} ms</b><br>`+(b.ende?`<b>${b.ende.winner<0?(b.ende.timeout?'Zeit abgelaufen':'Niemand steht mehr'):'Seite '+(b.ende.winner?'B':'A')+' gewinnt'}</b>`:'Kampf läuft')+'</div>';
 for(const a of b.actors)h+=karte(a);$('hud').innerHTML=h;
 if(b.log.length!==logLen||b.log[0]!==r.top){logLen=b.log.length;r.top=b.log[0];$('log').innerHTML=b.log.slice(0,40).map(l=>`<div><span>${l.time} s</span> ${esc(l.text)}</div>`).join('');}
 if(b.ende&&!r.end)r.end=performance.now();
 if(r.end&&performance.now()-r.end>3500&&$('loop').checked)build();}
setInterval(tick,150);

// Kamera: auf die Mitte aller Lebenden (folgt weich)
const cam={x:520,y:390};M.battleCamera=b=>{if(!b?.katze||!run)return null;const z=+val('zoom');if(z<=1.01)return null;const L=b.actors.filter(a=>!a.g.dead&&!a.fled);const P=L.length?L:b.actors;
 const tx=P.reduce((n,a)=>n+a.x,0)/P.length,ty=P.reduce((n,a)=>n+a.y,0)/P.length-30;cam.x+=(tx-cam.x)*.06;cam.y+=(ty-cam.y)*.06;return {zoom:z,x:cam.x,y:cam.y};};

// ---------- Viele Kämpfe ----------
$('serieGo').onclick=()=>{$('serie').textContent='Rechnet …';setTimeout(()=>{const alt=S.battle,p=alt?.paused;if(alt)alt.paused=true;let R;try{R=K.series(spec,30);}catch(e){$('serie').textContent='Fehler: '+e.message;return;}finally{S.battle=alt;if(alt)alt.paused=p;}
 $('serie').innerHTML=`Seite A (Katzen) gewinnt <b>${R.wins[0]}</b> · Seite B (Menschen) gewinnt <b>${R.wins[1]}</b> · ohne Sieger <b>${R.draw}</b> (von ${R.n})<br>mittlere Kampfdauer ${nf(R.time)} s · tote Katzen ${R.deadCats} · geflohene Katzen ${R.fled} · Ansprünge ${R.pounces} (gelandet ${R.landed}) · Haltebisse ${R.pins} (Nacken ${R.napes}) · Anschleichen ${R.stalks} · Scheinangriffe ${R.feints} · Boxen ${R.boxes} · Festkrallen ${R.grabs} · Aufschlitzen ${R.rakes} · Wegzerren ${R.dragged} · ausgewichen ${R.dodges} · zurückgeworfen ${R.recoils} · Gegenangriffe ${R.retorts}<br>Rechenzeit ${nf(R.ms/R.n,0)} ms je Kampf`;},30);};
if(K.OPT.maehne===0)$('maehne').value='0';// Notausschalter aus der Adresse
sync();build();
window.KATZE_KAMPF_ED={build,spec};
})();
