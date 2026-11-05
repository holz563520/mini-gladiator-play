'use strict';
// =====================================================================================================
// BLOCK-EDITOR (block-editor.html): echter 1-gegen-1-Arenakampf (sim.js + arena.js über den Benchmark,
// isolierte Kopie, kein Speichern) mit eingeschaltetem block-contact.js. Nur diese Seite setzt
// M.blockContact.active = true. Kampf-Parameter (M.T) werden nur hier und nur für die Vorführung verstellt.
// =====================================================================================================
(()=>{
const M=window.MG,S=M.s,BC=M.blockContact,HC=M.hitContact,KS=window.KampfSound,$=id=>document.getElementById(id);
const cl=(x,a,b)=>Math.max(a,Math.min(b,x));
const RA=M.reachAI;BC.active=true;HC.active=true;if(RA)RA.active=true;
const MELEE=M.weaponDefs.filter(w=>!w.ammo&&w.id!=='net'),WD=Object.fromEntries(M.weaponDefs.map(w=>[w.id,w])),SH=M.shieldDefs,SD=Object.fromEntries(SH.map(s=>[s.id,s]));
const T0={...M.T};// Spielwerte zum Zurücksetzen

// ---------------------------------------------------------------- Ton (eigener Ausgang; Vorlagen aus kampfsound.js)
let ac=null,out=null;const bufs=new Map();
function audio(){if(ac)return ac;try{ac=new (window.AudioContext||window.webkitAudioContext)();out=ac.createGain();out.gain.value=.8;out.connect(ac.destination);}catch{ac=null;}return ac;}
function buf(k,v){const id=k+'|'+v;let b=bufs.get(id);if(b)return b;const t=KS?.get?.(k)||KS?.DEF?.[k];if(!t||!ac)return null;const d=KS.render(t,{seed:977+v*7919+k.length*13});b=ac.createBuffer(1,d.length,KS.SR);b.getChannelData(0).set(d);bufs.set(id,b);return b;}
function play(k,vol=1,pitch=1){if(!$('snd').checked||!audio()||ac.state!=='running')return;const b=buf(k,Math.floor(Math.random()*3));if(!b)return;const s=ac.createBufferSource(),g=ac.createGain();s.buffer=b;s.playbackRate.value=cl(pitch,.5,1.8);g.gain.value=vol;s.connect(g);g.connect(out);s.start();s.onended=()=>{s.disconnect();g.disconnect();};}
BC.play=play;HC.play=play;
const GAME_SND={swing:['swing',.45],swingHeavy:['swingHeavy',.5],slash:['hitBlade',.8],hit:['hitBlade',.8],heavy:['hitBlunt',.8],stick:['hitStab',.8],armorhit:['armorHit',.7],fall:['fall',.7],sever:['sever',.8]};
M.sound=type=>{const m=GAME_SND[type];if(m)play(m[0],m[1]);};
function unlock(){if(!audio())return;ac.resume?.();let i=0;const keys=[...Object.keys(BC.SOUNDS),...Object.keys(KS.DEF).filter(k=>k.startsWith('tr_')),'swing','swingHeavy','hitBlade','hitBlunt','hitStab','armorHit'];(function pre(){const k=keys[i++];if(!k)return;for(let v=0;v<3;v++)buf(k,v);setTimeout(pre,25);})();}
addEventListener('pointerdown',unlock,{once:true});addEventListener('keydown',unlock,{once:true});

// ---------------------------------------------------------------- Bedienung
const fill=(sel,list,none)=>{sel.innerHTML=(none?'<option value="none">kein Schild</option>':'')+list.map(x=>`<option value="${x.id}">${x.name}</option>`).join('');};
fill($('w0'),MELEE);fill($('w1'),MELEE);fill($('s0'),SH,true);fill($('s1'),SH,true);
$('w0').value='gladius';$('s0').value='roundshield';$('w1').value='long';$('s1').value='none';
function sync(){for(const t of [0,1]){const two=WD[$('w'+t).value].twoHand;$('s'+t).disabled=two;if(two)$('s'+t).value='none';}}
for(const id of ['b0','b1','st0','st1'])$(id).addEventListener('input',()=>{$(id+'v').textContent=$(id).value;applyStats();});
$('rReach').addEventListener('change',()=>{if(RA)RA.active=$('rReach').checked;});$('rHit').addEventListener('change',()=>{HC.active=$('rHit').checked;});
$('bindP').addEventListener('input',()=>{$('bindPv').textContent=$('bindP').value+' %';BC.bindChance=$('bindP').value/100;});
for(const id of ['w0','w1','s0','s1','r0','a0','a1'])$(id).addEventListener('change',()=>{sync();restart();});
for(const id of ['tech','often'])$(id).addEventListener('change',()=>{params();restart();});
$('speed').addEventListener('change',()=>{base=+$('speed').value;S.options.speed=base;});
$('labels').addEventListener('change',()=>BC.labels=$('labels').checked);
for(const [id,k] of [['rInit','initiative'],['rCombo','combo'],['rBroken','broken'],['rBind','bind'],['rArrows','arrows']])$(id).addEventListener('change',()=>BC.rules[k]=$(id).checked);
$('restart').onclick=()=>{tour=null;$('tour').classList.remove('on');restart();};
$('pause').onclick=()=>{if(!S.battle)return;S.battle.paused=!S.battle.paused;$('pause').textContent=S.battle.paused?'▶ Weiter':'⏸ Pause';};
let zoom=3;$('zoom').onclick=()=>{zoom=zoom>=3?1.9:zoom>=1.9?1:3;M.setZoom?.(zoom);$('zoom').textContent='Zoom '+String(zoom).replace('.',',')+'×';};
$('rand').onclick=()=>{tour=null;$('tour').classList.remove('on');const r=l=>l[Math.floor(Math.random()*l.length)];$('w0').value=r(MELEE).id;$('w1').value=r(MELEE).id;$('s0').value=Math.random()<.5?r(SH).id:'none';$('s1').value=Math.random()<.5?r(SH).id:'none';sync();restart();};
BC.labels=true;

// Vorführung: viele Blocks, kaum Ausweichen; gewählte Schlagart. Alles nur in M.T dieser Seite.
function params(){Object.assign(M.T,T0);const tech=$('tech').value;
 if($('often').value==='show'){M.T.blockStat=.009;M.T.dodgeRate=0;M.T.dmgMult=T0.dmgMult*.6;}
 if($('often').value==='hits'){M.T.blockStat=0;M.T.blockActive=0;M.T.blockWeapon=0;M.T.blockShieldMelee=.15;M.T.dodgeRate=0;M.T.dmgMult=T0.dmgMult*.5;}
 if(tech!=='all'){for(const k of ['wSlash','wThrust','wOverhead','wSpin'])M.T[k]=0;M.T[{slash:'wSlash',thrust:'wThrust',overhead:'wOverhead',spin:'wSpin'}[tech]]=3;M.T.shieldChooseRange=0;M.T.wKickNear=0;}}
function applyStats(){const b=S.battle;if(!b)return;for(const a of b.actors){a.g.stats.block=+$('b'+a.team).value;a.g.stats.strength=+$('st'+a.team).value;}}

// ---------------------------------------------------------------- Kampf starten
let base=.5,slowUntil=0,startedAt=0,tour=null,lastPair='';
function restart(){if(S.battle){try{M.endBenchmark(-1,'Test');}catch{}}BC.reset();HC.reset();params();sync();
 const rw=$('r0').value,cfg={count:1,count0:1,count1:1,role0:rw?'Fernkämpfer':'Soldat',role1:'Soldat',weapon0:rw||$('w0').value,weapon1:$('w1').value,shield0:rw&&WD[rw].twoHand?'none':$('s0').value,shield1:$('s1').value,armor0:$('a0').value,armor1:$('a1').value,quality0:2,quality1:2,seed:Math.floor(Math.random()*1e6)};
 const err=M.startBenchmark(cfg);if(err){log('Fehler: '+err);return;}
 const b=S.battle;M.benchmarkFinale=false;b.paused=false;base=+$('speed').value;S.options.speed=base;
 // nah beieinander in der Mitte starten
 const [p,q]=b.actors,mx=(p.x+q.x)/2,my=(p.y+q.y)/2,gap=rw?190:70;p.x=mx-gap;q.x=mx+70;p.y=q.y=my;
 applyStats();M.focus?.(rw?q.id:p.id);M.setZoom?.(rw?Math.min(zoom,2.4):zoom);
 counts={blocks:0,binds:0,hits:0,broken:0,glance:0,combo:0,arrows:0};startedAt=performance.now();lastPair=`${WD[cfg.weapon0].name}${rw?' (Fernkampf)':''}${cfg.shield0!=='none'?' + '+SD[cfg.shield0].name:''} gegen ${WD[cfg.weapon1].name}${cfg.shield1!=='none'?' + '+SD[cfg.shield1].name:''}`;
 $('pause').textContent='⏸ Pause';clearLog();log(`<b>${lastPair}</b> · ${$('tech').selectedOptions[0].text}`);markCell();}

// ---------------------------------------------------------------- Ereignisse
let counts={blocks:0,binds:0,hits:0,broken:0,glance:0,combo:0,arrows:0};
const ON={clean:'Sauber geblockt',glance:'Abgeglitten',bind:'Kraftprobe',broken:'Deckung durchschlagen'};
const SNAME=Object.fromEntries(Object.entries(BC.SOUNDS).map(([k,v])=>[k,v.name.replace(/^Block: |^Kraftprobe: /,'')]));
const wn=id=>WD[id]?.name||(id==='fist'?'Faust':id||'?');
const TN={slash:'Hieb',thrust:'Stich',overhead:'Überkopf',spin:'Wirbel'};
BC.onEvent=ev=>{
 if(ev.kind==='block'){counts.blocks++;if(ev.outcome==='broken')counts.broken++;if(ev.outcome==='glance')counts.glance++;
  const who=ev.def.team?'rechts':'links',r=ev.res,combo=ev.combo>0&&BC.rules.combo&&ev.init==='D';if(combo)counts.combo++;
  log(`<b>${ON[ev.outcome]}</b> · ${who} blockt ${wn(ev.weapon)} (${TN[ev.tech]||ev.tech}, ${r.ap.part}) mit ${ev.shield?SD[ev.shield]?.name:wn(ev.defWeapon)} (${r.dp.part}) · Klang: ${SNAME[r.snd]||r.snd} · Wucht ${r.force.toFixed(1)} / Halt ${r.hold.toFixed(1)}`+
   (ev.outcome==='bind'?'':` · Initiative: ${ev.init==='D'?'Blockender':'Angreifer'}`)+(combo?' · <span class="warn">Combo abgebrochen</span>':''));
  if($('slow').checked)slowUntil=performance.now()+380;}
 else if(ev.kind==='bindStart'){counts.binds++;log(`<b>Kraftprobe</b> · Klinge an Klinge, Kraft links ${Math.round(ev.att.team?ev.pb:ev.pa)} gegen rechts ${Math.round(ev.att.team?ev.pa:ev.pb)} · ${ev.winner.team?'rechts':'links'} setzt sich durch · ${ev.dur.toFixed(2)} s`);if($('slow').checked)slowUntil=performance.now()+ev.dur*1000*.8;}
 else if(ev.kind==='arrow'){counts.arrows++;log(`<b>Abgelenkt</b> · ${ev.def.team?'rechts':'links'} schlägt ${wn(ev.weapon)}-Geschoss mit ${wn(ev.defWeapon)} weg (sehr selten) · Klang: Pfeil an der Waffe`);if($('slow').checked)slowUntil=performance.now()+300;}
 else if(ev.kind==='bindEnd'){log(`<b>Weggedrückt</b> · ${ev.winner.team?'rechts':'links'} drückt weg, ${ev.loser.team?'rechts':'links'} taumelt zurück und ist als Zweiter dran.`);}
 if(tour){tour.blocks++;}
};
const R=M.combatResponses,origImpact=R.impact;R.impact=(a,b,d,p,w,part)=>{origImpact(a,b,d,p,w,part);if(!p&&S.battle?.benchmark)counts.hits++;};
const logBox=$('log');function clearLog(){logBox.innerHTML='';}
function log(h){const d=document.createElement('div');d.className='row';d.innerHTML=h;logBox.prepend(d);while(logBox.children.length>14)logBox.lastChild.remove();}


// ---------------------------------------------------------------- Treffer: Log und Klangprobe
const CLS={schwerklinge:'Langschwert/Zweihänder',klinge:'Kurzschwert/Gladius',dolch:'Dolch',axt:'Axt/Hellebarde',stich:'Stich (Speer, Dreizack, Klingenstich)',keule:'Keule/Faust',kolben:'Streitkolben',hammer:'Hammer'},MAT={null:'Haut',leather:'Leder',medium:'verstärkt',metal:'Metall'};
const PART={head:'Kopf',neck:'Hals',chest:'Brust',belly:'Bauch',ls:'l. Schulter',rs:'r. Schulter',lua:'l. Oberarm',rua:'r. Oberarm',lfa:'l. Unterarm',rfa:'r. Unterarm',lh:'l. Hand',rh:'r. Hand',lt:'l. Oberschenkel',rt:'r. Oberschenkel',lsh:'l. Unterschenkel',rsh:'r. Unterschenkel',lf:'l. Fuß',rf:'r. Fuß'};
HC.onEvent=ev=>{if(ev.kind==='hitSound'){log(`<b>Treffer</b> · ${ev.att.team?'rechts':'links'} trifft ${PART[ev.part]||ev.part} (${MAT[ev.mat]}) · ${CLS[ev.cls]} · Schaden ${Math.round(ev.dmg)}`);}};
(function soundBoard(){const mats=[null,'leather','medium','metal'];let h='<tr><th class="rowh">Waffe ↓ · Ziel →</th>'+mats.map(m=>`<th>${MAT[m]}</th>`).join('')+'</tr>';
 for(const [k,v] of Object.entries(CLS))h+=`<tr><th class="rowh">${v}</th>`+mats.map(m=>`<td data-c="${k}" data-m="${m}" style="color:#dfb66d">▶</td>`).join('')+'</tr>';
 $('sndBoard').innerHTML=h;$('sndBoard').style.minWidth='0';
 $('sndBoard').onclick=e=>{const td=e.target.closest('td');if(!td)return;unlock();const c=td.dataset.c,m=td.dataset.m==='null'?null:td.dataset.m,blunt=['keule','kolben','hammer','axt'].includes(c);
  setTimeout(()=>{let core=1;if(m==='metal'){core=.35;play(blunt?'tr_metallStumpf':'tr_metallKlinge',.9);}else if(m==='medium'){core=.6;play('tr_leder',.7);play(blunt?'tr_metallStumpf':'tr_metallKlinge',.4);}else if(m==='leather'){core=.75;play('tr_leder',.75);}play('tr_'+c,.9*core);},40);};})();

// ---------------------------------------------------------------- Takt: Zeitlupe, Neustart, Anzeige
function tick(){const b=S.battle,t=performance.now();
 // Vorführung: beide auf gleicher Tiefe halten, damit man die Waffen von der Seite sieht (nur diese Seite)
 if(b&&$('side').checked&&!b.paused){const [p,q]=b.actors;if(!p.down&&!q.down&&!M.weapon(p).ammo&&!M.weapon(q).ammo){const my=(p.y+q.y)/2;p.y+=(my-p.y)*.25;q.y+=(my-q.y)*.25;const dx=q.x-p.x,min=cl(Math.min(M.weapon(p).range||50,M.weapon(q).range||50)*.95,36,80);if(Math.abs(dx)<min){const s=dx>=0?1:-1,c=(p.x+q.x)/2;p.x+=((c-s*min/2)-p.x)*.6;q.x+=((c+s*min/2)-q.x)*.6;}}}
 if(b&&!b.paused)S.options.speed=t<slowUntil?Math.min(base,.18):base;
 if(b&&(b.result||b.finale||b.actors.some(a=>a.down||a.g.dead)||t-startedAt>45000)){if(!b.ended){b.ended=true;setTimeout(()=>{if(tour)tourNext();else restart();},1400);}}
 if(tour&&b&&!b.ended&&(tour.blocks>=4||t-startedAt>14000)){b.ended=true;setTimeout(tourNext,700);}
 if(b){const [p,q]=b.actors;$('hudL').innerHTML=`<b>links</b> ${WD[M.weapon(p).id]?.name||''} · Ausdauer ${Math.round(p.energy)}`;$('hudR').innerHTML=`${WD[M.weapon(q).id]?.name||''} · Ausdauer ${Math.round(q.energy)} <b>rechts</b>`;}
 $('counts').innerHTML=`<span>Blocks <b>${counts.blocks}</b></span><span>Kraftproben <b>${counts.binds}</b></span><span>durchschlagen <b>${counts.broken}</b></span><span>abgeglitten <b>${counts.glance}</b></span><span>Combos abgebrochen <b>${counts.combo}</b></span><span>Treffer <b>${counts.hits}</b></span><span>Geschosse abgelenkt <b>${counts.arrows}</b></span><span>Funken <b>${BC.stats.particles}</b></span><span>Wundbilder <b>${HC.stats.marks}</b></span>`;
 requestAnimationFrame(tick);}

// ---------------------------------------------------------------- Übersicht
let mxTech='slash';const SYM={clean:['■','#7fb3d8'],glance:['◢','#8dbb6a'],bindable:['✕','#e8d48a'],broken:['!','#e0634f']},MATC={metal:'#d8d0b0',wood:'#b68756',boss:'#f0c860'};
function buildMatrix(){let h='<tr><th class="rowh">Angreifer ↓ · Blockt →</th>'+MELEE.map(w=>`<th class="col">${w.name}</th>`).join('')+SH.map(s=>`<th class="col sh">${s.name}</th>`).join('')+'</tr>';
 const cells=[];
 for(const aw of MELEE){h+=`<tr><th class="rowh">${aw.name}</th>`;
  for(const dw of MELEE){cells.push([aw.id,dw.id,'none']);h+=cell(BC.classify(aw.id,mxTech,dw.id,null,50,'wood',55,55),aw.id,dw.id,'none');}
  for(const s of SH){cells.push([aw.id,'gladius',s.id]);h+=cell(BC.classify(aw.id,mxTech,'gladius',s.id,50,'wood',55,55),aw.id,'gladius',s.id);}
  h+='</tr>';}
 $('mx').innerHTML=h;mxCells=cells;markCell();}
let mxCells=[];
function cell(r,a,d,s){const [sym,col]=SYM[r.outcome],m=MATC[r.fx]||'#555',name={clean:'sauber geblockt',glance:'gleitet ab',bindable:'Kraftprobe möglich',broken:'Deckung durchschlagen'}[r.outcome];
 return `<td data-a="${a}" data-d="${d}" data-s="${s}" style="color:${col};background:${m}22;box-shadow:inset 0 -3px 0 ${m}66" title="${WD[a].name} → ${s!=='none'?SD[s].name:WD[d].name}: ${name} · ${r.ap.part} auf ${r.dp.part} · ${SNAME[r.snd]||r.snd}">${sym}</td>`;}
function markCell(){for(const td of document.querySelectorAll('#mx td.cur'))td.classList.remove('cur');const td=document.querySelector(`#mx td[data-a="${$('w0').value}"][data-d="${$('w1').value}"][data-s="${$('s1').value}"]`);if(td)td.classList.add('cur');}
$('mxTabs').innerHTML=Object.entries(TN).map(([k,v])=>`<button data-t="${k}" class="${k===mxTech?'on':''}">${v}</button>`).join('');
$('mxTabs').onclick=e=>{const b=e.target.closest('button');if(!b)return;mxTech=b.dataset.t;for(const x of $('mxTabs').children)x.classList.toggle('on',x===b);buildMatrix();};
function playCell(a,d,s){$('w0').value=a;$('s0').value='none';$('w1').value=d;$('s1').value=s;$('tech').value=mxTech;sync();restart();}
$('mx').onclick=e=>{const td=e.target.closest('td');if(!td)return;tour=null;$('tour').classList.remove('on');playCell(td.dataset.a,td.dataset.d,td.dataset.s);};
function tourNext(){if(!tour)return;const c=mxCells[tour.i++];if(!c){tour=null;$('tour').classList.remove('on');log('Alle Paarungen gezeigt.');return;}tour.blocks=0;playCell(...c);}
$('tour').onclick=()=>{tour={i:0,blocks:0};$('tour').classList.add('on');tourNext();};
$('legend').innerHTML=Object.entries(SYM).map(([k,[s,c]])=>`<span><i style="color:${c}">${s}</i>${{clean:'sauber geblockt',glance:'Stich gleitet ab',bindable:'Klinge an Klinge: Kraftprobe möglich',broken:'Deckung durchschlagen'}[k]}</span>`).join('')+
 `<span><i style="color:${MATC.metal}">▬</i>Metall: Funken</span><span><i style="color:${MATC.boss}">▬</i>Schildbuckel</span><span><i style="color:${MATC.wood}">▬</i>Holz: Splitter</span>`;

$('rules').innerHTML=`<ul>
<li><em>Im Spiel eingeschaltet (5.11.):</em> <code>block-contact.js</code>, <code>hit-contact.js</code> und <code>reach-ai.js</code> werden vom Spiel geladen und sind an. Dieser Editor zeigt denselben Stand; hier lassen sich die Regeln zum Vergleichen einzeln abschalten. Ausfallschritte je Schlagart (Stich am weitesten), Funken dezent.</li>
<li><em>Eingeschaltet</em> wird der Blockwurf beim Ausholen gezogen statt im Treffermoment. Die Blockchance ist dieselbe Formel wie heute (Schild, Blockwert, Waffe, Verletzung, Erschöpfung). So weiß der Verteidiger früh genug, ob er die Bahn trifft, und Schild oder Waffe stehen genau dort, wo die Klinge ankommt. Der Treffer- bzw. Blockzeitpunkt bleibt bei 55 % des Schlags.</li>
<li><em>Echte Figuren und Schläge:</em> Hieb (drei Varianten), Stich, Überkopf und Wirbel kommen unverändert aus dem Spiel. Das Modul biegt nur die Arme: Verteidiger zur Deckung, Angreifer endet an der Deckung und federt zurück.</li>
<li><em>Klänge</em> sind kurz und trocken (kein Nachklingen) und stehen im Kampfsound-Editor unter „Waffen“ (Block: …, Kraftprobe: …), dort weiter einstellbar.</li>
<li><em>Kraftprobe:</em> Zwei Schwerter (Kurzschwert, Gladius, Langschwert, Zweihänder) können sich binden. Beide drücken 0,45–0,95 s gegeneinander, der Kreuzpunkt wandert zum Schwächeren; Stärke, Gleichgewicht, Blockwert, Waffengewicht und Ausdauer entscheiden, ein knappes Duell auch mal der Zufall. Der Verlierer wird weggestoßen und taumelt, der Gewinner ist als Nächster dran.</li>
<li><em>Pfeile, Bolzen, Wurfwaffen:</em> Mit Schild wie bisher (Pfeil steckt im Schild). Ohne Schild wehrt heute die Waffe etwa jedes neunte Geschoss unsichtbar ab (gemessen: 11 % gegen Gladius, mit Rundschild 36 %). Neu: ohne Schild nur noch etwa ein Achtel davon (rund 1–2 %), dann sichtbar – Funken, leises Klirren, der Pfeil fliegt weggeschlagen davon.</li>
<li><em>Treffer:</em> eigener Klang je Waffengattung (Langschwert/Zweihänder hackt, Gladius schneidet, Dolch sticht, Axt hackt mit Knacken, Speer dringt ein, Keule dumpf, Streitkolben knirscht, Hammer kracht), darüber eine Schicht für Leder, verstärkte oder Metallrüstung. Die Waffe endet auf dem Körper bzw. in passender Tiefe und wird dann herausgezogen oder federt zurück, statt durch den Gegner zu schwingen. Das Wundbild passt zur Waffe: Kerbe (Langschwert, Zweihänder), Schnitt (Gladius, Kurzschwert), Stichloch (Dolch, Speer; Dreizack drei Löcher), Hackwunde mit Knochen bei schweren Treffern (Axt), Bluterguss (Keule), Quetschung (Streitkolben), Krater (Hammer); auf Metall Dellen und Kratzer, auf Leder Risse. Reine Darstellung, keine Regeländerung.</li>
<li><em>Drehschlag:</em> Die Figur wird nicht mehr flach gestaucht, sondern dreht sich (zweite Hälfte gespiegelt, nie schmaler als 84 %).</li>
<li><em>Abstand (KI):</em> Lange Waffen weichen zurück, wenn ein Kürzerer zu nah kommt (rückwärts langsamer als vorwärts). Kurze Waffen warten knapp außerhalb, bis der Gegner zugeschlagen hat, und stürmen dann hinein und bleiben dicht dran. <span class="warn">Regeländerung, nicht freigegeben.</span> Gemessen (je 40 Kämpfe 1 gegen 1, gleich starke Kämpfer): Lange Waffen gewinnen schon heute fast immer (Speer gegen Gladius 93 %, Hellebarde gegen Dolch 100 %) – daran ändert die KI wenig (93–100 %). Ausgeglichener würde es erst mit einer Balance-Änderung (z. B. lange Waffen innerhalb der halben Reichweite schwächer).</li>
<li><span class="warn">Noch nicht freigegeben</span> (Regeländerung): Initiative nach dem Block, Combo-Abbruch, Taumeln bei durchschlagener Deckung, die Kraftprobe und seltenere Pfeilabwehr ohne Schild. Jede ist einzeln abschaltbar. Kampfdauer gemessen (60 feste Kämpfe, Spiel-Blockchance): ohne Modul 23,3 s, mit Modul und allen Regeln 22,9 s – nicht länger.</li>
<li><em>Noch offen:</em> Zum Einschalten im Spiel <code>block-contact.js</code> in die Ladereihenfolge aufnehmen und <code>active</code> setzen. Die beiden Testfiguren-Zeichner (<code>?figures=v4</code>, <code>pixel2</code>) haben den Haken noch nicht.</li>
</ul>`;

sync();buildMatrix();restart();requestAnimationFrame(tick);
window.BlockEditor={BC,counts:()=>counts,restart};
})();
