'use strict';
// =====================================================================================================
// TODES-EDITOR (todes-editor.html): echter Arenakampf (Benchmark, isolierte Kopie, kein Speichern).
// Jede Todesart wird inszeniert: Angreifer mit passender Waffe, Opfer ohne Block/Ausweichen; beim ersten
// Treffer stirbt das Opfer an genau dieser Ursache (über die Spielfunktionen M.sever, M.bisect, M.death).
// Darunter: Todes-Nahaufnahme je Todesart und alle Verletzungs-Nahaufnahmen (injury-shots.js).
// Kampfwerte (M.T) werden nur auf dieser Seite und nur für die Vorführung verstellt.
// =====================================================================================================
(()=>{
const M=window.MG,S=M.s,DF=M.deathFx,IS=M.injuryShots,$=id=>document.getElementById(id);
if(M.blockContact)M.blockContact.active=true;if(M.hitContact)M.hitContact.active=true;if(M.reachAI)M.reachAI.active=true;
const T0={...M.T},WD=Object.fromEntries(M.weaponDefs.map(w=>[w.id,w]));
const cl=(x,a,b)=>Math.max(a,Math.min(b,x));

// ---------------------------------------------------------------- Ton (Vorlagen aus kampfsound.js)
const KS=window.KampfSound;let ac=null,out=null;const bufs=new Map();
function audio(){if(ac)return ac;try{ac=new (window.AudioContext||window.webkitAudioContext)();out=ac.createGain();out.gain.value=.8;out.connect(ac.destination);}catch{ac=null;}return ac;}
function buf(k,v){const id=k+'|'+v;let b=bufs.get(id);if(b)return b;const t=KS?.get?.(k)||KS?.DEF?.[k];if(!t||!ac)return null;const d=KS.render(t,{seed:977+v*7919+k.length*13});b=ac.createBuffer(1,d.length,KS.SR);b.getChannelData(0).set(d);bufs.set(id,b);return b;}
function play(k,vol=1){if(!audio()||ac.state!=='running')return;const b=buf(k,Math.floor(Math.random()*3));if(!b)return;const s=ac.createBufferSource(),g=ac.createGain();s.buffer=b;g.gain.value=vol;s.connect(g);g.connect(out);s.start();s.onended=()=>{s.disconnect();g.disconnect();};}
if(M.blockContact)M.blockContact.play=play;if(M.hitContact)M.hitContact.play=play;
const SND={swing:['swing',.45],swingHeavy:['swingHeavy',.5],slash:['hitBlade',.8],hit:['hitBlade',.8],heavy:['hitBlunt',.8],stick:['hitStab',.8],armorhit:['armorHit',.7],fall:['fall',.7],sever:['sever',.9],die:['fall',.5]};
M.sound=type=>{const m=SND[type];if(m)play(m[0],m[1]);};
addEventListener('pointerdown',()=>{audio();ac?.resume?.();},{once:true});

// ---------------------------------------------------------------- Inszenierungen
// kill(a,b): tödlicher Ausgang über die Spielfunktionen; setup(b): Zustand vorher; w: Waffe des Angreifers
const hurt=(b,id,hp,bleed,inj,a)=>{const p=b.g.body[id];p.hp=hp;p.bleed=(p.bleed||0)+bleed;p.injury=inj;p.grade=M.injuryGrade?.(p)??4;try{M.noteInjury?.(b.g,id,inj,a?.g.name||'?',M.weapon(a||b).name);}catch{}};
const SCEN=[
 {type:'decap',w:'long',tech:'slash',kill:(a,b)=>M.sever(a,b,'head')},
 {type:'bisect',w:'greatsword',tech:'slash',kill:(a,b)=>M.bisect(a,b)},
 {type:'throat',w:'dagger',tech:'slash',kill:(a,b)=>{hurt(b,'neck',0,25,'Tödliche Schnittwunde',a);M.death(b,'Halsschnitt',a);}},
 {type:'skull',w:'mace',tech:'overhead',kill:(a,b)=>{hurt(b,'head',0,12,'Schädelbruch',a);M.death(b,'Tödliche Schädelverletzung durch '+M.weapon(a).name,a);}},
 {type:'heart',w:'gladius',tech:'thrust',kill:(a,b)=>{hurt(b,'chest',0,18,'Tiefe Stichwunde',a);M.death(b,'Tödlicher Stich: Brust',a);}},
 {type:'gut',w:'spear',tech:'thrust',kill:(a,b)=>{hurt(b,'belly',0,14,'Schwere innere Verletzung',a);b.g.body.belly.internal=true;M.death(b,'Innere Verletzungen',a);}},
 {type:'arrow',w:'bow',ranged:true,kill:(a,b)=>{hurt(b,'chest',0,10,'Pfeil steckt',a);M.death(b,'Tödlicher Pfeiltreffer: Brust',a);}},
 {type:'bleed',w:'axe',tech:'slash',setup:b=>{for(const id of ['rua','chest','belly'])hurt(b,id,40,6,'Tiefe Schnittwunde');b.g.blood=34;},delay:1.6,kill:(a,b)=>{b.g.blood=6;M.death(b,'Massive Blutung',a);}},
 {type:'ground',w:'trident',tech:'thrust',setup:b=>{M.knockdown?.(b,'Gestürzt',8);},kill:(a,b)=>{hurt(b,'chest',0,20,'Tiefe Stichwunde',a);M.death(b,'Gnadenstoß',a);}},
 {type:'maul',w:'club',beast:true,delay:1.2,kill:(a,b)=>{hurt(b,'neck',0,30,'Abgetrennt',a);M.death(b,'Tödlicher Kehlbiss',null);}}];
const SC=Object.fromEntries(SCEN.map(s=>[s.type,s]));
const TN={slash:'Hieb',thrust:'Stich',overhead:'Überkopf'};
$('deaths').innerHTML=SCEN.map(s=>`<button data-t="${s.type}">${DF.types[s.type].name}<small>${s.beast?'Bestie, Biss in die Kehle':WD[s.w]?.name||s.w}${s.tech?' · '+TN[s.tech]:''}</small></button>`).join('');
$('deaths').onclick=e=>{const t=e.target.closest('button')?.dataset.t;if(t){tour=null;$('tour').classList.remove('on');stage(t);}};

// Kampfende abfangen: nach dem Tod läuft das Bild weiter (Todesablauf), statt die Vorführung zu beenden
const realEnd=M.endBenchmark;let mine=false;M.endBenchmark=(w,r)=>{if(mine)return realEnd(w,r);return null;};
function stop(){if(S.battle?.benchmark){mine=true;try{realEnd(-1,'Editor');}catch{}mine=false;}}

let cur=null,pend=null,tour=null,base=.6,zoom=3,slowUntil=0;
function params(sc){Object.assign(M.T,T0);M.T.blockStat=0;M.T.blockActive=0;M.T.blockWeapon=0;M.T.blockShieldMelee=0;M.T.dodgeRate=0;M.T.dmgMult=T0.dmgMult*.02;
 if(sc.tech){for(const k of ['wSlash','wThrust','wOverhead','wSpin'])M.T[k]=0;M.T[{slash:'wSlash',thrust:'wThrust',overhead:'wOverhead'}[sc.tech]]=3;M.T.shieldChooseRange=0;M.T.wKickNear=0;}}
function stage(type){const sc=SC[type];cur=type;stop();DF.clearLens();params(sc);
 const cfg={count:1,count0:1,count1:1,role0:sc.ranged?'Fernkämpfer':'Soldat',role1:'Soldat',weapon0:sc.w,weapon1:'gladius',shield0:'none',shield1:'none',armor0:'leather',armor1:$('arm').value,quality0:2,quality1:2,seed:Math.floor(Math.random()*1e6)};
 const err=M.startBenchmark(cfg);if(err){log('Fehler: '+err);return;}
 const b=S.battle;M.benchmarkFinale=false;b.paused=false;S.options.speed=base;S.options.closeups='off';
 const [p,q]=b.actors,mx=(p.x+q.x)/2,my=(p.y+q.y)/2;p.x=mx-(sc.ranged?330:44);q.x=mx+(sc.ranged?60:44);p.y=q.y=my;p.a=0;q.a=Math.PI;
 // Opfer wehrt sich nicht (nur auf dieser Seite)
 q.g.stats.block=0;q.g.stats.dodge=0;q.energy=100;sc.setup?.(q);
 M.focus?.(q.id);M.setZoom?.(sc.ranged?2.2:zoom);
 pend={sc,a:p,b:q,at:performance.now(),fire:false};
 for(const btn of $('deaths').children)btn.classList.toggle('on',btn.dataset.t===type);
 clearLog();log(`<b>${DF.types[type].name}</b> · ${sc.beast?'Bestie (Biss)':WD[sc.w].name+' gegen Gladius'} · Opfer: ${$('arm').selectedOptions[0].text}`);}

// erster Treffer des Angreifers am Opfer → tödlicher Ausgang
const RS=M.combatResponses,origImpact=RS?.impact;if(RS&&origImpact)RS.impact=function(a,b){const r=origImpact.apply(this,arguments);if(pend&&a===pend.a&&b===pend.b)pend.fire=true;return r;};
function fire(){const {sc,a,b}=pend;pend=null;if(!S.battle||b.g.dead)return;try{sc.kill(a,b);}catch(e){log('Fehler: '+e.message);console.error(e);}
 if($('slow').checked&&!S.battle.cinematic)S.battle.cinematic={x:b.x,y:b.y-25,left:1.2,duration:1.2};
 startShot(b,sc.type);if(tour)tour.next=performance.now()+9000;}

DF.onEvent=ev=>{if(ev.kind!=='death')return;const P=DF.types[ev.type];log(`<b>Tod</b> · Ursache „${ev.cause}“ → Ablauf <b>${P.name}</b>${ev.wasDown?' (lag schon)':''} · Stelle: ${M.partName(ev.part)}`+
 ` · ${P.stand?'steht noch '+P.stand.toFixed(2)+' s, ':''}${P.knee?'kniet '+P.knee.toFixed(2)+' s, ':''}${P.fall?'fällt '+(P.dir>0?'vornüber':'nach hinten')+' ('+P.fall.toFixed(2)+' s), ':''}${P.jet?'Fontäne '+P.jet.dur+' s, ':''}${P.twitch?'Zuckungen '+P.twitch.dur+' s, ':''}Kamera-Blut ${Math.round(P.lens*100)} %`);};

// ---------------------------------------------------------------- Bedienung
$('again').onclick=()=>{tour=null;$('tour').classList.remove('on');stage(cur||'decap');};
$('tour').onclick=()=>{if(tour){tour=null;$('tour').classList.remove('on');return;}tour={i:0,next:0};$('tour').classList.add('on');stage(SCEN[0].type);};
$('pause').onclick=()=>{if(!S.battle)return;S.battle.paused=!S.battle.paused;$('pause').textContent=S.battle.paused?'▶ Weiter':'⏸ Pause';};
$('zoom').onclick=()=>{zoom=zoom>=3?1.9:zoom>=1.9?1:3;M.setZoom?.(zoom);$('zoom').textContent='Zoom '+String(zoom).replace('.',',')+'×';};
$('newfx').onchange=()=>{DF.active=$('newfx').checked;stage(cur||'decap');};
$('lens').onchange=()=>{DF.lens=$('lens').checked;DF.clearLens();};
$('arm').onchange=()=>stage(cur||'decap');
$('speed').onchange=()=>{base=+$('speed').value;S.options.speed=base;};
const logBox=$('log');function clearLog(){logBox.innerHTML='';}
function log(h){const d=document.createElement('div');d.className='row';d.innerHTML=h;logBox.prepend(d);while(logBox.children.length>10)logBox.lastChild.remove();}

// ---------------------------------------------------------------- Todes-Nahaufnahme
const dsC=$('deathShot'),dsX=dsC.getContext('2d');let ds=null;
$('dsType').innerHTML=Object.entries(DF.types).map(([k,v])=>`<option value="${k}">${v.name}</option>`).join('');
const CAUSE={decap:'Enthauptung',bisect:'Durchtrennung',throat:'Halsschnitt',skull:'Tödliche Schädelverletzung durch Streitkolben',heart:'Tödlicher Stich: Brust',gut:'Innere Verletzungen',arrow:'Tödlicher Pfeiltreffer: Kopf',bleed:'Massive Blutung',ground:'Gnadenstoß',maul:'Tödlicher Kehlbiss',generic:'Tödlicher Treffer'};
let dummy=null;function victim(){if(S.battle?.actors?.[1])return S.battle.actors[1].g;if(!dummy){try{dummy=M.makeGladiator(0);}catch{}}return dummy;}
function startShot(b,type){const g=b?.g||victim();if(!g)return;const killer=g.killer&&g.killer!=='Unbekannt'?g.killer:'';
 ds={o:{g,team:1,part:'head',kind:'death',cls:'none',variant:0,deathType:type,dramatic:$('dsDram').checked,line1:killer?killer+' tötet '+g.name:g.name+' stirbt',title:'† '+g.name+' fällt',line3:b?g.cause:CAUSE[type],color:'#f29b83'},t:0,at:performance.now(),play:true};$('dsType').value=type;}
$('dsPlay').onclick=()=>{startShot(null,$('dsType').value);ds.o.g=victim();};
$('dsType').onchange=()=>{startShot(null,$('dsType').value);};
$('dsDram').onchange=()=>{if(ds)ds.o.dramatic=$('dsDram').checked;};
let dsTour=null;$('dsAll').onclick=()=>{dsTour=dsTour?null:{i:0};$('dsAll').classList.toggle('on',!!dsTour);if(dsTour)startShot(null,Object.keys(DF.types)[0]);};
$('dsT').oninput=()=>{if(!ds)startShot(null,$('dsType').value);ds.play=false;ds.t=$('dsT').value/100;};
function paintDs(now){if(!ds)return;const len=ds.o.dramatic?6:4.2;if(ds.play){ds.t=(now-ds.at)/1000;if(ds.t>len){if(dsTour){const keys=Object.keys(DF.types);dsTour.i=(dsTour.i+1)%keys.length;startShot(null,keys[dsTour.i]);return;}ds.t=len;ds.play=false;}$('dsT').value=Math.round(ds.t*100);}
 $('dsTv').textContent=ds.t.toFixed(1).replace('.',',')+' s';try{IS.paint(dsX,660,420,ds.o,ds.t);}catch(e){if(!paintDs.err){paintDs.err=1;console.error(e);}}}

// ---------------------------------------------------------------- Verletzungs-Nahaufnahmen
const PARTS=['head','neck','chest','belly','ls','rs','lua','rua','lfa','rfa','lh','rh','lt','rt','lsh','rsh','lf','rf'];
const inC=$('injShot'),inX=inC.getContext('2d');let inj=null,inTour=null;
$('inPart').innerHTML=PARTS.map(p=>`<option value="${p}">${M.partName(p)}</option>`).join('');
$('inW').innerHTML=['gladius','long','dagger','axe','greatsword','mace','hammer','club','spear','trident','bow'].map(w=>`<option value="${w}">${WD[w].name}</option>`).join('');
function kindsFor(p){return IS.injuriesFor(p);}
function fillKinds(){const p=$('inPart').value,v=$('inKind').value;$('inKind').innerHTML=kindsFor(p).map(k=>`<option>${k}</option>`).join('');if([...$('inKind').options].some(o=>o.value===v))$('inKind').value=v;}
$('inPart').onchange=()=>{fillKinds();playInj();};$('inKind').onchange=playInj;$('inW').onchange=playInj;$('inPlay').onclick=playInj;
function playInj(){const g=victim();if(!g)return;const part=$('inPart').value,injury=$('inKind').value,wid=$('inW').value;
 inj={o:{g,team:1,part,injury,kind:IS.kindOf(injury),wid,cls:IS.weaponClass(wid),line1:'Angreifer trifft mit '+WD[wid].name,mute:true},at:performance.now()};
 $('inInfo').textContent=`${M.partName(part)} · ${injury}`;for(const td of document.querySelectorAll('#mx td.cur'))td.classList.remove('cur');document.querySelector(`#mx td[data-p="${part}"][data-k="${injury}"]`)?.classList.add('cur');}
$('inAll').onclick=()=>{inTour=inTour?null:{list:PARTS.flatMap(p=>kindsFor(p).map(k=>[p,k])),i:0};$('inAll').classList.toggle('on',!!inTour);if(inTour)nextInj();};
function nextInj(){const [p,k]=inTour.list[inTour.i%inTour.list.length];inTour.i++;$('inPart').value=p;fillKinds();$('inKind').value=k;playInj();}
(function matrix(){const all=IS.kinds.map(k=>k[0]);let h='<tr><th class="rowh">Verletzung ↓ · Stelle →</th>'+PARTS.map(p=>`<th class="col">${M.partName(p)}</th>`).join('')+'</tr>';
 for(const k of all)h+=`<tr><th class="rowh">${k}</th>`+PARTS.map(p=>kindsFor(p).includes(k)?`<td data-p="${p}" data-k="${k}">●</td>`:'<td class="no">·</td>').join('')+'</tr>';
 $('mx').innerHTML=h;$('mx').onclick=e=>{const td=e.target.closest('td[data-p]');if(!td)return;inTour=null;$('inAll').classList.remove('on');$('inPart').value=td.dataset.p;fillKinds();$('inKind').value=td.dataset.k;playInj();};})();
function paintInj(now){if(!inj)return;const t=(now-inj.at)/1000,len=IS.LEN+.6;if(t>len&&inTour){nextInj();return;}try{IS.paint(inX,660,420,inj.o,Math.min(t,len));}catch(e){if(!paintInj.err){paintInj.err=1;console.error(e);}}}

// ---------------------------------------------------------------- Takt
function tick(now){requestAnimationFrame(tick);
 if(pend){const P=pend.sc;/* Treffer auch an der Trefferreaktion erkennen (Geschosse, Bodenangriffe) */if(!P.delay&&(pend.b.hit>0||(pend.b.taken||0)>(pend.taken0??(pend.taken0=pend.b.taken||0))))pend.fire=true;if(pend.fire||(P.delay&&(now-pend.at)/1000>P.delay)||(now-pend.at)/1000>7)fire();}
 if(tour&&tour.next&&now>tour.next){tour.i=(tour.i+1)%SCEN.length;tour.next=0;stage(SCEN[tour.i].type);}
 const b=S.battle;if(b){const v=b.actors[1];$('hudL').innerHTML=cur?`<b>${DF.types[cur].name}</b>`:'';$('hudR').innerHTML=v?`${v.g.name} · Blut ${Math.round(v.g.blood??100)} %${v.g.dead?' · <b>tot</b>':''}`:'';}
 paintDs(now);paintInj(now);}
$('rules').innerHTML=[
 '<em>Jede Todesart hat ihren eigenen Ablauf</em> (Ursache aus dem Kampf, z. B. „Halsschnitt“, „Tödlicher Stich: Brust“). Wer enthauptet wird, bleibt kurz stehen und zuckt mit den Armen, während das Blut aus dem Hals schießt. Dann knickt er ein und fällt vornüber. Bei durchschnittener Kehle greift er sich an den Hals, sinkt auf die Knie und kippt nach vorn. Ein zertrümmerter Schädel lässt ihn sofort schlaff nach hinten fallen, mit Knochen- und Hirnsplittern und gestreckten Zuckungen. Wer einen Stich ins Herz bekommt, fasst sich an die Brust, geht in die Knie und fällt nach hinten. Bei einer Bauchwunde hält er sich den Bauch, hustet Blut und fällt vornüber. Ein Pfeil reißt ihn zurück. Wer verblutet, schwankt lange, sinkt auf die Knie und fällt langsam. Der Gnadenstoß am Boden lässt ihn noch einmal aufbäumen und mit den Beinen schlagen. Ein Biss reißt die Kehle auf.',
 '<em>Blutfontänen im Herzschlag</em> aus der tödlichen Wunde. Die Schläge werden langsamer und schwächer, und das Blut landet als Flecken auf dem Sand. Dazu kommt Blut aus dem Mund. Die Blutlache wächst unter der Wunde, nicht unter der Körpermitte.',
 '<em>Todeszuckungen</em> nach dem Aufprall, die abklingen und mit einzelnen Krämpfen wieder aufflammen. Danach liegt die Leiche mit den Händen an der Wunde.',
 '<em>Blut auf der Kamera</em>: Spritzer auf der Linse, mehr bei schweren Toden und nahem Zoom. Sie laufen langsam herunter, und solange das Blut frisch ist, liegt ein roter Schleier über dem Bild. Das gilt auch in den Nahaufnahmen.',
 '<em>Todes-Nahaufnahme je Todesart</em>: Bei der Enthauptung fährt eine Klinge durch, der Kopf kippt weg und aus dem Bild, und der Stumpf spritzt. Die Kehle klafft auf und das Blut schießt in Stößen heraus. Die Schädeldecke bricht ein und Blut läuft in Strähnen übers Gesicht. Bei Stich und Bauchwunde hustet er Blut, ein Pfeil steckt sichtbar, und bei der Durchtrennung geht ein Schnitt quer durch.',
 '<em>Verletzungs-Nahaufnahmen</em>: Spritzer um die Wunde, bei schweren Wunden pulsierende Stöße, dazu Rinnsale und bei den schwersten Blut auf der Linse.',
 'Alles ist nur Darstellung. Würfel, Schaden, Todeschancen und Kampfablauf bleiben unverändert. Im Spiel ist das eingeschaltet, <code>boot.js</code> lädt <code>todes-fx.js</code>.'].map(x=>`<li>${x}</li>`).join('');
fillKinds();stage('decap');requestAnimationFrame(tick);
})();
