'use strict';
/* BÄREN-KAMPF-EDITOR (baer-kampf.html, Schritte B3a und B3b1): baut mit BAER.K.build (baer-kampf.js) einen Kampf Bär gegen Mensch, Hund oder Bär,
   zeigt Zustand, Wunden, Kampfbericht, löst einzelne Angriffe aus und rechnet viele Kämpfe ohne Bild. Bedienung Deutsch, Bäreninhalte Englisch.
   Ändert keinen Spielstand: Der Speicher des Spiels wird hier gar nicht geladen, M.persist ist abgeschaltet. */
(()=>{
const M=window.MG,B=window.BAER,K=B?.K,DOG=window.DOG,$=id=>document.getElementById(id);
if(!M||!K||!window.AN){window.onerror?.('Spielmodule unvollständig geladen','baer-kampf-editor',0);return;}
const S=M.s;M.persist=()=>true;S.options=S.options||{};S.options.sound=false;S.options.music=false;S.options.speed=1;
const nf=(v,d=1)=>Number(v).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d}),esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
const STUFEN=['0 · Gewöhnlich','1 · Erfahren','2 · Talentiert','3 · Elite','4 · Champion','5 · Ausnahmetalent','6 · Legende'];
const WAFFEN=[['gladius','Gladius'],['short','Kurzschwert'],['long','Langschwert'],['dagger','Dolch'],['spear','Speer'],['trident','Dreizack'],['axe','Axt'],['doubleaxe','Doppelaxt'],['club','Keule'],['mace','Streitkolben'],['hammer','Hammer'],['halberd','Hellebarde'],['greatsword','Zweihandschwert'],['fist','Fäuste']];
const RUEST=[['none','keine'],['leather','Leder'],['medium','Schienen'],['metal','Metall']];
const val=id=>$(id).value;

// ---------- Auswahlfelder ----------
for(const s of ['A','B']){
 for(let i=1;i<=6;i++)$('zahl'+s).insertAdjacentHTML('beforeend',`<option value="${i}"${(s==='B'?i===2:i===1)?' selected':''}>${i}</option>`);
 let grp='';for(const b of B.BREEDS){if(b.group!==grp){grp=b.group;$('sorte'+s).insertAdjacentHTML('beforeend',`<optgroup label="${esc(grp)}"></optgroup>`);}
  $('sorte'+s).lastElementChild.insertAdjacentHTML('beforeend',`<option value="${b.id}"${b.id==='brown'?' selected':''}>${'☠'.repeat(b.skulls)} ${esc(b.name)} · ${b.kg0} kg${b.built?'':' *'}</option>`);}
 for(const b of (DOG?.BREEDS||[]))$('rasse'+s).insertAdjacentHTML('beforeend',`<option value="${b.id}"${b.id==='mastiff'?' selected':''}>${esc(b.name||b.id)}</option>`);
 STUFEN.forEach((t,i)=>$('stufe'+s).insertAdjacentHTML('beforeend',`<option value="${i}"${i===2?' selected':''}>${t}</option>`));
 for(const [id,n] of WAFFEN)$('waffe'+s).insertAdjacentHTML('beforeend',`<option value="${id}">${n}</option>`);
 for(const [id,n] of RUEST)$('ruest'+s).insertAdjacentHTML('beforeend',`<option value="${id}"${id==='leather'?' selected':''}>${n}</option>`);
}
function sync(){for(const s of ['A','B']){const art=val('art'+s);for(const l of $('art'+s).closest('.team').querySelectorAll('[data-fuer]'))l.hidden=l.dataset.fuer!==art;}
 for(const k of ['tear','head','schaden','haerte']){K.OPT[k]=+val(k);$(k+'Text').textContent=nf(K.OPT[k],2)+'×';}}

// ---------- Aufstellung ----------
function mensch(team,s,i){const q=+val('stufe'+s),rng=S.rng,g=M.makeGladiator(q,team===1);S.rng=rng;g.role='Soldat';
 const w=val('waffe'+s),mat=val('ruest'+s),armor={};if(mat!=='none')for(const d of M.armorDefs)armor[d.id]=M.makeItem('armor',d.id,Math.min(q,4),mat);
 g.enemyGear={weapon:w==='fist'?null:M.makeItem('weapon',w,Math.min(q,4),'metal'),secondary:null,shield:null,armor};g.equipment={weapon:null,secondary:null,shield:null,armor:{}};return {kind:'human',g,key:s+i};}
function baer(s,i){const id=val('sorte'+s);let D;if(val('werte')==='typisch'){D=B.typical(id);D.stats={...B.breed(id).werte};D.id='t'+s+i+Date.now().toString(36);D.name=B.create(id).name;}else D=B.create(id);return {kind:'bear',D,key:s+i};}
function hund(s,i){const D=DOG.create(val('rasse'+s));D.name=D.name||'Dog';return {kind:'dog',D,key:s+i};}
function seite(s,team){const n=+val('zahl'+s),art=val('art'+s),L=[];for(let i=0;i<n;i++)L.push(art==='bear'?baer(s,i):art==='dog'?hund(s,i):mensch(team,s,i));return L;}
const spec=()=>({blue:seite('A',0),red:seite('B',1),title:'Bear pit'});
let run=null;
function build(){S.battle=null;M.shots?.forEach?.(p=>p.active=false);M.stains.length=0;if(M.limbs)M.limbs.length=0;
 const b=K.build(spec());b.time=b.startTime=0;S.battle=b;run={b,end:0};S.options.speed=+val('spd');$('pause').textContent='⏸ Pause';logLen=-1;}
$('go').onclick=build;
$('pause').onclick=()=>{const b=S.battle;if(!b)return;b.paused=!b.paused;$('pause').textContent=b.paused?'▶ Weiter':'⏸ Pause';};
$('einzel').onclick=()=>{const b=S.battle;if(!b)return;b.paused=false;K.fixed(1/60);b.paused=true;$('pause').textContent='▶ Weiter';};
$('spd').onchange=()=>{S.options.speed=+val('spd');};
for(const id of ['artA','artB','zahlA','zahlB','sorteA','sorteB','rasseA','rasseB','stufeA','stufeB','waffeA','waffeB','ruestA','ruestB','werte'])$(id).addEventListener('input',()=>{sync();build();});
for(const id of ['tear','head','schaden','haerte'])$(id).addEventListener('input',sync);
for(const [id,en,de,text] of K.ATTACKS)if(!['leave','flee'].includes(id))$('angriffe').insertAdjacentHTML('beforeend',`<button class="btn" type="button" data-angriff="${id}" title="${esc(text)}">${esc(de)}<br><small>${esc(en)}</small></button>`);
$('angriffe').onclick=e=>{const k=e.target.closest('[data-angriff]')?.dataset.angriff;if(!k)return;K.force=k;const b=S.battle?.actors.find(a=>a.bear&&a.team===0&&!a.g.dead);if(b){b.cool=0;if(k==='threat')b.threatDone=false;}};

// ---------- Zustand ----------
const MODE_DE={approach:'geht auf den Gegner zu',dead:'tot',...Object.fromEntries(K.ATTACKS.map(a=>[a[0],a[2]+' ('+a[1]+')']))};
const bar=(v,rot)=>`<span class="bar${rot?' rot':''}"><i style="width:${Math.round(Math.max(0,Math.min(100,v)))}%"></i></span>`;
function karte(a){
 if(a.bear){const D=a.bear,Br=B.breed(D.breed);return `<div class="karte"><b>${esc(a.g.name)}</b> · ${esc(Br.name)} · ${D.weight} kg · Seite ${a.team?'B':'A'}<br>`+
  (a.g.dead?`<span class="tot">tot: ${esc(a.g.cause)}</span>`:a.fled?'<span class="tot">geflohen</span>':`${esc(MODE_DE[a.mode]||a.mode)}`)+
  `<br>Gesundheit ${bar(K.health(a))} Blut ${bar(a.blood,1)} Mut ${bar(a.morale)}<div class="teile">`+K.PARTS.map(p=>`<span>${K.PART_DE[p]} ${Math.round(a.tissue[p]/a.max[p]*100)} %</span>`).join('')+
  `</div><small>Treffer ${a.hits} · getötet ${a.kills} · abgerissen ${a.torn||0} · Kopfbisse ${a.crushed||0} · gepackt ${a.grapples||0} · geschleudert ${a.flung||0} · weggezerrt ${a.dragged||0}`+(K.lame(a)>0?` · lahmt ${Math.round(K.lame(a)*100)} %`:'')+`</small></div>`;}
 if(a.dog){return `<div class="karte"><b>${esc(a.g.name)}</b> · ${esc(a.dog.breedName||'Hund')} · ${a.dog.weight} kg · Seite ${a.team?'B':'A'}<br>`+(a.g.dead?'<span class="tot">tot</span>':a.fled?'<span class="tot">geflohen</span>':a.submit?'<span class="tot">unterwirft sich</span>':`Gesundheit ${bar(DOG.health(a))} Blut ${bar(a.blood,1)}`)+'</div>';}
 const g=a.g,weg=Object.entries(g.body).filter(([,p])=>p.missing).map(([id])=>M.partName?M.partName(id):id);
 return `<div class="karte"><b>${esc(g.name)}</b> · Mensch · Seite ${a.team?'B':'A'}<br>`+(g.dead?`<span class="tot">tot: ${esc(g.cause||'')}</span>`:a.pinnedBy?'<span class="tot">liegt unter dem Bären</span>':a.grabbedBy?'<span class="tot">vom Bären gepackt</span>':a.down?'<span class="tot">am Boden</span>':`Gesundheit ${bar(M.health(g))} Blut ${bar(g.blood??100,1)}`)+
  (weg.length?`<br><small>fehlt: ${esc(weg.join(', '))}</small>`:'')+'</div>';}
let logLen=-1;
function tick(){const r=run;if(!r||S.battle!==r.b)return;const b=r.b;
 let h=`<div class="karte">Zeit <b>${nf(b.time-b.startTime)} s</b> · Zeichenzeit je Bär <b>${nf(K.drawMs||0,2)} ms</b><br>`+(b.ende?`<b>${b.ende.winner<0?(b.ende.timeout?'Zeit abgelaufen':'Niemand steht mehr'):'Seite '+(b.ende.winner?'B':'A')+' gewinnt'}</b>`:'Kampf läuft')+'</div>';
 for(const a of b.actors)h+=karte(a);$('hud').innerHTML=h;
 if(b.log.length!==logLen||b.log[0]!==r.top){logLen=b.log.length;r.top=b.log[0];$('log').innerHTML=b.log.slice(0,40).map(l=>`<div><span>${l.time} s</span> ${esc(l.text)}</div>`).join('');}
 if(b.ende&&!r.end)r.end=performance.now();
 if(r.end&&performance.now()-r.end>3500&&$('loop').checked)build();}
setInterval(tick,150);

// Kamera: auf die Mitte aller Lebenden (folgt weich)
const cam={x:520,y:390};M.battleCamera=b=>{if(!b?.baer||!run)return null;const z=+val('zoom');if(z<=1.01)return null;const L=b.actors.filter(a=>!a.g.dead&&!a.fled);const P=L.length?L:b.actors;
 const tx=P.reduce((n,a)=>n+a.x,0)/P.length,ty=P.reduce((n,a)=>n+a.y,0)/P.length-30;cam.x+=(tx-cam.x)*.06;cam.y+=(ty-cam.y)*.06;return {zoom:z,x:cam.x,y:cam.y};};

// ---------- Viele Kämpfe ----------
$('serieGo').onclick=()=>{$('serie').textContent='Rechnet …';setTimeout(()=>{const alt=S.battle,p=alt?.paused;if(alt)alt.paused=true;let R;try{R=K.series(spec,30);}catch(e){$('serie').textContent='Fehler: '+e.message;return;}finally{S.battle=alt;if(alt)alt.paused=p;}
 $('serie').innerHTML=`Seite A gewinnt <b>${R.wins[0]}</b> · Seite B gewinnt <b>${R.wins[1]}</b> · ohne Sieger <b>${R.draw}</b> (von ${R.n})<br>mittlere Kampfdauer ${nf(R.time)} s · tote Bären ${R.deadBears} · geflohene Bären ${R.fled} · abgerissene Gliedmaßen ${R.torn} · Kopfbisse ${R.crushed} · gepackt ${R.grapples} · geschleudert ${R.flung} · weggezerrt ${R.dragged} · Rechenzeit ${nf(R.ms/R.n,0)} ms je Kampf`;},30);};
for(const k of ['tear','head'])if(K.OPT[k]===0)$(k).value='0';// Notausschalter aus der Adresse
sync();build();
window.BAER_KAMPF_ED={build,spec};
})();
