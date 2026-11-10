'use strict';
// =====================================================================================================
// GANG-EDITOR (gang-editor.html): echte Figuren (sim.js + arena.js über den Benchmark, isolierte Kopie,
// kein Speichern) mit eingeschaltetem gangarten.js. Diese Seite setzt M.gait.active = true; im Spiel schaltet die Einstellung „Natürliche Kampfbewegungen“.
// Vorführung: zwei gesteuerte Figuren (a.puppet) – oben neu, unten bisher – plus ein stehender Gegner.
// Echter Kampf: 1 gegen 1 mit der Spiel-KI, die Gangarten wählt das Modul.
// =====================================================================================================
(()=>{
const M=window.MG,S=M.s,G=M.gait,$=id=>document.getElementById(id),cl=(x,a,b)=>Math.max(a,Math.min(b,x));
const MELEE=M.weaponDefs.filter(w=>!w.ammo&&w.id!=='net'),WD=Object.fromEntries(M.weaponDefs.map(w=>[w.id,w])),SH=M.shieldDefs;
G.active=true;M.benchmarkTimeLimit=1e9;
// Speer und Dreizack einhändig wie im Spiel (Schild möglich), Stichfolge über gangarten.js
const CHARGE0=M.T.chargeRate,T0={...M.T},RAM0=G.P.ramCharge,RUN0=G.P.ramRun;
// Ton: Spiel-Klangmaschine (audio.js) nach dem ersten Antippen starten
function unlock(){try{M.audioEngine?.start?.();}catch{}}addEventListener('pointerdown',unlock,{once:true});addEventListener('keydown',unlock,{once:true});
function params(){Object.assign(M.T,T0);G.P.ramCharge=RAM0;G.P.ramRun=RUN0;S.options.sound=$('snd').checked;
 if(mode!=='atk'){G.P.pierceForce=0;M.T.chargeRate=$('chg').checked?CHARGE0:0;G.P.runAttack=$('runA').checked?1:0;return;}
 // Angriffs-Vorführung: gewählte Technik erzwingen (nur M.T dieser Seite)
 const k=ATKS[atkI][0];M.T.dodgeRate=0;M.T.wKickNear=0;M.T.shieldChooseRange=0;M.T.kickChooseRange=0;M.T.sandRate=0;M.T.sandMelee=0;M.T.rearGripAny=0;
 if(M.reachAI?.amp)M.reachAI.amp.chance=k==='knee'?.75:.25;
 G.P.pierceForce=$('aPierce').checked?1:0;
 if(SITU.has(k)){M.T.chargeRate=0;G.P.runAttack=1;}else if(k==='charge'){M.T.chargeRate=60;M.T.chargeMinDist=24;G.P.runAttack=0;}else{M.T.chargeRate=0;G.P.runAttack=1;for(const w of ['wSlash','wThrust','wOverhead','wSpin'])M.T[w]=0;M.T[{slash:'wSlash',thrust:'wThrust',pierce:'wThrust',overhead:'wOverhead',spin:'wSpin'}[k]]=3;}
 if($('aRam').checked){G.P.ramCharge=.85;G.P.ramRun=.85;}
 if($('aDef').value==='many'){M.T.blockStat=.009;}M.T.bsAfterPressure=0;M.T.bsAfterFree=0;M.T.jumpBase=0;}

// ---------------------------------------------------------------- Bedienung
const fill=(sel,list,none)=>{sel.innerHTML=(none?'<option value="none">kein Schild</option>':'')+list.map(x=>`<option value="${x.id}">${x.name}</option>`).join('');};
fill($('w0'),MELEE);fill($('w1'),MELEE);fill($('s0'),SH,true);fill($('s1'),SH,true);
$('w0').value='gladius';$('s0').value=SH.some(s=>s.id==='roundshield')?'roundshield':SH[0].id;$('w1').value='spear';$('s1').value='none';
function sync(){for(const t of [0,1]){const two=WD[$('w'+t).value].twoHand;$('s'+t).disabled=two;if(two)$('s'+t).value='none';}}
const SEQ=[['stand',1.2],['walk',3.5],['jog',3],['sprint',3.6],['stand',1.4],['side',3],['back',2.6],['guard',2.4]];
const GAITS=[['auto','Ablauf (alle)'],['stand','Stehen'],['walk','Gehen'],['guard','Kampfschritt'],['jog','Laufen'],['sprint','Sprinten'],['side','Seitschritt'],['back','Rückwärts']];
let gait='auto',seqI=0,seqT=0;
$('gaits').innerHTML=GAITS.map(([k,n])=>`<button data-g="${k}"><i style="background:${k==='auto'?'linear-gradient(90deg,#7fb3d5,#dfb66d,#e0703f)':G.color(k)}"></i>${n}</button>`).join('');
function markGait(){for(const b of $('gaits').children)b.classList.toggle('on',b.dataset.g===gait);}
$('gaits').onclick=e=>{const b=e.target.closest('button');if(!b)return;gait=b.dataset.g;seqI=0;seqT=0;markGait();};markGait();
let mode='show';const ST=()=>mode==='studio'||mode==='ground'||mode==='back';
const ATKS=[['pierce','Stich mit Durchstich'],['slash','Hieb im Lauf'],['thrust','Stich im Lauf'],['overhead','Überkopf im Lauf'],['spin','Wirbel im Lauf'],['charge','Ansturm (Soldat)'],['ground','Abstechen am Boden'],['knee','Gegner auf den Knien'],['stagger','Gegner taumelt']];const SITU=new Set(['ground','knee','stagger']);let atkI=0,atkAll=true,atkT=0,atkHit=0;
$('atks').innerHTML=`<button data-a="all"><i style="background:linear-gradient(90deg,#dfb66d,#e0703f,#ff4a3a)"></i>Alle nacheinander</button>`+ATKS.map(([k,n],i)=>`<button data-a="${i}"><i style="background:${k==='charge'?'#ff4a3a':SITU.has(k)?'#c23b3b':'#e0703f'}"></i>${n}</button>`).join('');
function markAtk(){for(const b of $('atks').children)b.classList.toggle('on',atkAll?b.dataset.a==='all':b.dataset.a===String(atkI));}
$('atks').onclick=e=>{const b=e.target.closest('button');if(!b)return;atkAll=b.dataset.a==='all';atkI=atkAll?0:+b.dataset.a;markAtk();if(mode==='atk')stage();};markAtk();
$('mAtk').onclick=()=>{mode='atk';restart();};$('mStudio').onclick=()=>{mode='studio';queue=[];studioFill(true);restart();};$('mGround').onclick=()=>{mode='ground';queue=[];studioFill(true);restart();};$('mBack').onclick=()=>{mode='back';queue=[];studioFill(true);restart();};$('aAgain').onclick=()=>stage();
for(const id of ['aRun','aRam','aDef','aPierce'])$(id).addEventListener('change',()=>{if(mode==='atk')stage();});$('aShield').addEventListener('change',()=>{if(mode==='atk')restart();});
$('mShow').onclick=()=>{mode='show';restart();};$('mFight').onclick=()=>{mode='fight';restart();};
$('restart').onclick=()=>restart();
$('pause').onclick=()=>{if(!S.battle)return;S.battle.paused=!S.battle.paused;$('pause').textContent=S.battle.paused?'▶ Weiter':'⏸ Pause';};
const ZOOMS=[1.3,2,3];let zi=0;$('zoom').onclick=()=>{zi=(zi+1)%ZOOMS.length;$('zoom').textContent='Zoom '+String(ZOOMS[zi]).replace('.',',')+'×';if(mode==='fight')M.setZoom?.(ZOOMS[zi]);};
$('speed').onchange=()=>{S.options.speed=+$('speed').value;};
for(const id of ['w0','s0','a0','cond','w1','s1','gap'])$(id).addEventListener('change',()=>{sync();restart();});
for(const id of ['chg','runA','snd'])$(id).addEventListener('change',params);
$('gOn').onchange=()=>{const b=S.battle;if(b)for(const a of b.actors){a.gaitOff=!$('gOn').checked;if(a.gaitOff){a.gaitW=null;}}};

// Stellgrößen
const KNOBS=[['walk','Gehen',.2,.8,.01,'%'],['guard','Kampfschritt',.3,.9,.01,'%'],['jog','Laufen',.7,1.2,.01,'%'],['sprint','Sprinten',1.1,1.8,.01,'%'],['side','Seitschritt',.25,.8,.01,'%'],['back','Rückwärts (nah)',.3,.9,.01,'%'],
 ['chargeDmg','Ansturm-Schaden',1,2.5,.05,'×'],['runHit','Lauf-Angriff: Bonus bei vollem Sprint',0,.8,.05,'%'],['ramCharge','Umrennen beim Ansturm (Grundchance)',0,.8,.01,'%'],
 ['acc','Anlaufen (Beschleunigung)',80,500,5,'/s²'],['dec','Abbremsen (× Anlaufen)',1,4,.1,'×'],['accSprint','Sprint baut sich auf (× Anlaufen)',.2,1,.05,'×'],['turnFast','Wenden im Sprint (Bogen)',1,10,.5,'/s'],['sprintGap','Sprint ab Abstand',80,400,10,''],['jogGap','Laufen ab Abstand',20,200,5,'']];
function fmt(k,v,u){return u==='%'?Math.round(v*100)+' %':u==='×'?v.toFixed(2).replace('.',',')+'×':Math.round(v)+(u?' '+u:'');}
function buildKnobs(){$('knobs').innerHTML=KNOBS.map(([k,n,a,b,s,u])=>`<label>${n} <input type="range" id="k_${k}" min="${a}" max="${b}" step="${s}" value="${G.P[k]}"><span class="val" id="k_${k}v">${fmt(k,G.P[k],u)}</span></label>`).join('');
 for(const [k,,,,,u] of KNOBS)$('k_'+k).addEventListener('input',()=>{G.P[k]=+$('k_'+k).value;$('k_'+k+'v').textContent=fmt(k,G.P[k],u);table();});}
$('resetP').onclick=()=>{G.reset();buildKnobs();table();};buildKnobs();

// ---------------------------------------------------------------- Zustand
function condition(a,c){const g=a.g,B=g.body;
 if(c==='limp'){B.lsh.hp=30;B.lt.hp=58;B.lsh.injury='Tiefe Schnittwunde';}
 if(c==='break'){B.rsh.hp=38;B.rsh.fracture={days:21,total:21};B.rsh.injury='Schienbeinbruch';}
 if(c==='tired'){g.fatigue=85;a.energy=9;}
 if(c==='hurt'){for(const id of ['chest','belly','lua','rt','lsh','ls'])B[id].hp=42;g.blood=58;a.energy=30;}}

// ---------------------------------------------------------------- Start
let startedAt=0,fighters=[];
let carry=null;
function restart(){if(trBusy)return;/* Studio: Verletzungen des Getroffenen in den nächsten Durchgang mitnehmen */{const v=fighters[1];carry=(ST())&&$('sKeep')?.checked&&v&&!v.g.dead&&S.battle&&v.g.__who===$('sWho').value?{body:JSON.parse(JSON.stringify(v.g.body)),marks:[...(v.g.gaitMarks||[])],blood:v.g.blood,scars:v.g.scars}:null;}
 if(S.battle){try{M.endBenchmark(-1,'Test');}catch{}}G.P.sprintGap=G.DEF.sprintGap;sync();hist=[];params();cnt={cry:0,charge:0,runAttack:0,ram:0,shove:0,block:0,bind:0,seize:0,finisher:0,pierce:0,backRun:0,grab:0,special:0};$('evlog').innerHTML='';
 $('mShow').classList.toggle('on',mode==='show');$('mFight').classList.toggle('on',mode==='fight');$('mAtk').classList.toggle('on',mode==='atk');$('pAtk').style.display=mode==='atk'?'':'none';$('mStudio').classList.toggle('on',mode==='studio');$('mGround').classList.toggle('on',mode==='ground');$('mBack').classList.toggle('on',mode==='back');$('pStudio').style.display=ST()?'':'none';$('cuWrap').style.display=ST()?'':'none';
 $('pShow').style.display=mode==='show'?'':'none';$('pFight').style.display=mode==='fight'?'':'none';$('pEv').style.display=mode==='fight'||mode==='atk'?'':'none';
 const show=mode==='show',atk=mode==='atk',studio=ST(),cfg={count:1,count0:show?2:1,count1:1,role0:studio&&SHOOT.includes($('sW').value)?'Fernkämpfer':studio&&THROWN.includes($('sW').value)?'Assassine':'Soldat',role1:'Soldat',weapon0:studio?$('sW').value:$('w0').value,weapon1:show||atk||studio?'gladius':$('w1').value,shield0:studio?'none':$('s0').value,shield1:atk?($('aShield').checked?'roundshield':'none'):show||studio?'none':$('s1').value,armor0:$('a0').value,armor1:show?'none':'leather',quality0:2,quality1:2,seed:show?4242:studio?(+$('sWho').value||5151):Math.floor(Math.random()*1e6)};
 const err=M.startBenchmark(cfg);if(err){$('live').textContent='Fehler: '+err;return;}
 const b=S.battle;M.benchmarkFinale=false;b.paused=false;S.options.speed=+$('speed').value;$('pause').textContent='⏸ Pause';startedAt=performance.now();
 const F=M.roundField?.()?M.fieldGeom():{cx:M.arenaSize().width/2,cy:M.arenaSize().height/2,rx:M.arenaSize().width*.42,ry:M.arenaSize().height*.36};
 const team0=b.actors.filter(a=>a.team===0),foe=b.actors.find(a=>a.team===1);
 if(show){const [nu,old]=team0,L={x0:F.cx-F.rx*.6,x1:F.cx+F.rx*.6,dy:Math.min(48,F.ry*.2)};
  // gleiche Person in beiden Bahnen (gleiche Werte, gleiche Ausrüstung) – nur die Bewegung unterscheidet sich
  old.g=JSON.parse(JSON.stringify(nu.g));old.g.id=(nu.g.id||'g')+'-alt';
  for(const [a,y,isOld] of [[nu,F.cy-F.ry*.18,false],[old,F.cy+F.ry*.34,true]]){a.x=L.x0+30;a.y=y;a.a=0;a.puppet={mode:'stand',lane:{...L,y},dir:1,old:isOld,combat:true};a.gaitOff=isOld;condition(a,$('cond').value);if($('cond').value==='tired')a.puppet.energy=9;}
  foe.x=F.cx+F.rx*.84;foe.y=F.cy+F.ry*.06;foe.a=Math.PI;foe.puppet={mode:'stand',lane:{x0:foe.x,x1:foe.x,y:foe.y,dy:0},dir:-1,old:true,face:Math.PI};foe.gaitOff=true;
  fighters=[nu,old];M.focus?.(nu.id);
  M.battleCamera=(bb,width,height,W,H)=>{const z=ZOOMS[zi];if(z<=1.3)return {zoom:z,x:F.cx+F.rx*.12,y:F.cy+F.ry*.08};const t=bb.actors.find(a=>a.puppet&&!a.puppet.old);return {zoom:z,x:cl(t.x,W/(z*2),W-W/(z*2)),y:cl((t.y+(zi===1?F.cy+F.ry*.34:t.y))/2,H/(z*2),H-H/(z*2))};};}
 else if(ST()){studioSetup(b,F,team0[0],foe);}
 else if(atk){const [p]=team0;fighters=[p,foe];condition(p,$('cond').value);stage();
  M.battleCamera=(bb,width,height,W,H)=>{const z=Math.max(2,ZOOMS[zi]),[a,t]=fighters;const x=(a.x+t.x)/2,y=(a.y+t.y)/2-10;return {zoom:z,x:cl(x,W/(z*2),W-W/(z*2)),y:cl(y,H/(z*2),H-H/(z*2))};};}
 else{M.battleCamera=null;const [p]=team0,q=foe,gap=+$('gap').value;p.x=F.cx-gap/2;q.x=F.cx+gap/2;p.y=q.y=F.cy;p.a=0;q.a=Math.PI;condition(p,$('cond').value);
  for(const a of b.actors)a.gaitOff=!$('gOn').checked;fighters=[p,q];M.focus?.(p.id);M.setZoom?.(Math.max(1.3,ZOOMS[zi]));}
 M.battleCamera=camera(M.battleCamera);table();}

// ---------------------------------------------------------------- Angriffe: Aufstellung und Ablauf
let F0=null;
function heal(a){const g=a.g;for(const p of Object.values(g.body)){p.hp=100;p.bleed=0;p.fracture=null;p.pain=0;p.deepStabs=0;p.injury='';if(p.wounds)p.wounds.length=0;}g.blood=100;g.fatigue=0;Object.assign(a,{down:false,fallTimer:0,kneeTimer:0,stagger:0,stun:0,hit:0,daze:0,kx:0,ky:0,wind:0,swing:0,pendingStrike:null,surrendered:false,riseHold:0,state:'idle'});}
function stage(){const b=S.battle;if(!b||mode!=='atk')return;params();const [p,q]=fighters,F=M.roundField?.()?M.fieldGeom():{cx:520,cy:392,rx:440,ry:250},k=ATKS[atkI][0],sprint=$('aRun').value==='sprint'||k==='charge';
 heal(q);if($('cond').value==='ok')heal(p);Object.assign(p,{seizeOn:null,finisher:null,finHold:0,x:F.cx-(sprint?300:150),y:F.cy,a:0,energy:p.g?M.effective(p).maxEnergy:100,cool:0,chargeCD:0,gv:0,gaitT:null,gaitW:null,gaitMode:null,cried:false,runAttack:null,rushHit:null,comboReady:false,comboCount:0,retreat:0,flankTimer:0,flankCD:9,decision:0});
 if($('cond').value!=='ok'){p.energy=Math.max(p.energy,40);}
 q.x=F.cx+130;q.y=F.cy;q.a=Math.PI;q.gaitOff=true;q.cool=99;q.pin={x:q.x,y:q.y};q.energy=M.effective(q).maxEnergy;q.block=false;q.guardTime=0;
 // keine Abwehr: steif stehende Puppe; sonst echte KI, die nur abwehrt (greift nie an, bleibt an ihrem Platz)
 q.puppet=$('aDef').value==='none'?{mode:'stand',lane:{x0:q.x,x1:q.x,y:q.y,dy:0},dir:-1,old:true,face:Math.PI}:null;M.blockContact?.reset?.();M.hitContact?.reset?.();
 if(k==='ground'){q.puppet=null;M.knockdown(q,'Vorführung',6);q.fallTimer=q.fallDuration=Math.max(q.fallDuration||0,7);q.state='fallen';}
 if(k==='knee'){q.puppet=null;M.kneel(q);q.kneeTimer=q.kneeDuration=4.5;}
 if(k==='stagger'){q.puppet=null;q.stagger=q.staggerMax=2.6;q.staggerDir=0;q.staggerSeed=1;q.state='stagger';}
 if(SITU.has(k))p.x=F.cx-170;
 p.target=q.id;b.paused=false;atkT=0;atkHit=0;$('hudL').innerHTML=`<b>${ATKS[atkI][1]}</b>${k!=='charge'?' · Anlauf '+(sprint?'Sprint':'Laufen'):''}`;$('hudR').innerHTML=atkAll?`${atkI+1} / ${ATKS.length}`:'';
 // Laufen statt Sprint: Sprint erst ab sehr großem Abstand
 G.P.sprintGap=sprint?G.DEF.sprintGap:9999;}
function stepAtk(dt){const b=S.battle;if(!b||b.paused)return;const [p,q]=fighters;atkT+=dt*(S.options.speed||1);
 // Gegner steht still; fällt er (umgerannt), läuft sein normales Aufstehen
 const lying=q.down||q.fallTimer>0||q.kneeTimer>0||q.stagger>0,none=$('aDef').value==='none';if(lying&&q.puppet){q.puppet=null;}
 if(!q.puppet){q.cool=Math.max(q.cool||0,9);/* steht in Deckung und bewegt sich nicht (Blocken über block-contact bleibt) */if(!lying)q.drawTimer=Math.max(q.drawTimer||0,.3);q.chargeTimer=0;q.target=p.id;q.retreat=0;q.energy=Math.max(q.energy,40);
  if(!lying&&!(q.jumpTimer>0)){q.x+=(q.pin.x-q.x)*.25;q.y+=(q.pin.y-q.y)*.25;q.a=Math.atan2(p.y-q.y,p.x-q.x);}
  if(none&&!lying&&atkHit){q.puppet={mode:'stand',lane:{x0:q.x,x1:q.x,y:q.y,dy:0},dir:-1,old:true,face:Math.PI};}}
 if(q.g.dead||q.g.blood<40)heal(q);
 if(p.swing>0||p.pendingStrike)atkHit=atkHit||atkT;
 const done=!p.pierceContact&&!(p.finHold>0)&&atkHit&&atkT-atkHit>(q.fallTimer>0||q.down||q.g.dead?3.6:1.8)||atkT>(SITU.has(ATKS[atkI][0])?7:9);
 if(done){if(atkAll){atkI=(atkI+1)%ATKS.length;markAtk();}if(q.g.dead||p.g.dead||Object.values(q.g.body).some(x=>x.missing))restart();else stage();}}

// ---------------------------------------------------------------- Vorführung: Ablauf steuern
function steerShow(dtReal){const b=S.battle;if(!b||b.paused)return;const sp=S.options.speed||1;
 let g=gait;if(gait==='auto'){seqT+=dtReal*sp;if(seqT>SEQ[seqI][1]){seqT=0;seqI=(seqI+1)%SEQ.length;}g=SEQ[seqI][0];}
 for(const a of b.actors){const p=a.puppet;if(!p||a.team!==0)continue;p.combat=$('combat').checked;
  if(p.old&&!$('cmp').checked){p.mode='stand';continue;}
  if(g==='back'&&p.mode!=='back')p.bdir=-1;p.mode=g;}}

// ---------------------------------------------------------------- Anzeige: Beschriftung, Live-Werte, Kurve
let hist=[];const lab=$('labels'),lx=lab.getContext('2d'),gr=$('graph'),gx=gr.getContext('2d');
function gaitOf(a){if(a.puppet)return a.gaitShown||'stand';if(a.state==='charge')return 'charge';if(a.gaitOff||!a.gaitW){const v=a.moveSpeed||0;return v<3?'stand':a.sprinting?'sprint':a.state==='circle'?'side':a.state==='retreat'?'back':'jog';}return v0(a)<3?'stand':G.current(a);}
function v0(a){return a.puppet?(a.gaitV||0):(a.moveSpeed||0);}
function labels(){const c=$('arenaCanvas'),V=M.arenaView;if(lab.width!==c.width||lab.height!==c.height){lab.width=c.width;lab.height=c.height;}lx.clearRect(0,0,lab.width,lab.height);
 if(liveShot){const now=performance.now(),dt=Math.min(.05,(now-liveT0)/1000)*Math.max(.5,+$('speed').value);liveT0=now;$('cuWrap').style.display='';if(!liveShot.step(dt)){liveShot=null;cuHold=performance.now()+700;}else liveShot.paint(cux,cuv.width,cuv.height);}
 else if(performance.now()>cuHold&&!ST())$('cuWrap').style.display='none';
 const b=S.battle;if(!b||!V)return;
 const fs=Math.max(11,Math.round(lab.width/70));lx.font=`700 ${fs}px "Courier Prime",monospace`;lx.textAlign='center';
 for(const a of fighters){if(!a||a.g.dead||ST()||mode==='atk'&&a!==fighters[0])continue;const sx=(a.x-V.cx)*V.scale+V.width/2,sy=(a.y-V.cy)*V.scale+V.height/2-a.g.height/180*1.14*84*V.scale;const m=gaitOf(a),old=a.gaitOff;
  const t=(mode==='show'?(old?'BISHER · ':'NEU · '):'')+G.name(m).toUpperCase()+' '+Math.round(v0(a));
  lx.fillStyle='#000a';const w=lx.measureText(t).width+10;lx.fillRect(sx-w/2,sy-fs,w,fs+6);lx.fillStyle=old?'#c9c3ad':G.color(m);lx.fillText(t,sx,sy);}}
function sample(){const b=S.battle;if(!b||b.paused)return;const t=b.time;for(const [i,a] of fighters.entries())if(a)hist.push({i,t,v:v0(a),m:gaitOf(a),old:!!a.gaitOff});while(hist.length&&hist[0].t<t-12)hist.shift();}
function graph(){const W=gr.width,H=gr.height,b=S.battle;gx.fillStyle='#10181a';gx.fillRect(0,0,W,H);if(!b)return;const t1=b.time,t0=t1-12,top=Math.max(150,...hist.map(h=>h.v))*1.08,X=t=>40+(t-t0)/12*(W-50),Y=v=>H-18-v/top*(H-30);
 gx.strokeStyle='#26353a';gx.fillStyle='#97aaa8';gx.font='11px "Courier Prime",monospace';gx.lineWidth=1;for(let v=0;v<=top;v+=40){gx.beginPath();gx.moveTo(40,Y(v));gx.lineTo(W-10,Y(v));gx.stroke();gx.fillText(String(v),6,Y(v)+4);}
 gx.fillText('−12 s',40,H-4);gx.fillText('jetzt',W-44,H-4);
 for(const i of [0,1]){const pts=hist.filter(h=>h.i===i);gx.lineWidth=i===0?3:2;for(let k=1;k<pts.length;k++){const p=pts[k-1],q=pts[k];gx.setLineDash(q.old?[5,4]:[]);gx.strokeStyle=q.old?'#c9c3ad':G.color(q.m);gx.beginPath();gx.moveTo(X(p.t),Y(p.v));gx.lineTo(X(q.t),Y(q.v));gx.stroke();}}gx.setLineDash([]);
 let x=48;for(const m of G.MODES){gx.fillStyle=G.color(m);gx.fillRect(x,6,9,9);gx.fillStyle='#c9c3ad';gx.fillText(G.name(m),x+12,14);x+=gx.measureText(G.name(m)).width+26;}}
function live(){const b=S.battle;if(!b)return;const rows=[];for(const a of fighters){if(!a)continue;const ef=M.effective(a),m=gaitOf(a),v=v0(a),base=ef.speed;
 const who=mode==='show'?(a.gaitOff?'Bisher':'Neu'):(a.team?'Gegner':'Kämpfer')+(a.gaitOff?' (bisher)':'');
 rows.push(`<div class="row"><span>${who}</span><b style="color:${a.gaitOff?'#c9c3ad':G.color(m)}">${G.name(m)}</b></div>`,
  `<div class="row"><span>Tempo</span><b>${Math.round(v)} (${Math.round(v/Math.max(1,base)*100)} % vom Lauftempo ${Math.round(base)})</b></div>`,
  `<div class="row"><span>Schritt</span><b>${a.gaitStride?Math.round(a.gaitStride)+' · '+(v/Math.max(1,a.gaitStride)*2).toFixed(1).replace('.',',')+' Schritte/s':'–'}</b></div>`,
  `<div class="row"><span>Ausdauer</span><b>${Math.round(a.energy)} / ${Math.round(ef.maxEnergy)}</b></div>`);}
 $('live').innerHTML=rows.join('');
 const [p,q]=fighters;if(mode==='atk'||ST())return;$('hudL').innerHTML=mode==='show'?'<b>oben</b> neu · <b>unten</b> bisher':`<b>links</b> ${WD[M.weapon(p).id]?.name||''}`;$('hudR').innerHTML=mode==='show'?'':`${WD[M.weapon(q).id]?.name||''} <b>rechts</b>`;}
function table(){const a=fighters[0];if(!a)return;const ef=M.effective(a),base=ef.speed,P=G.P;
 const rows=[['walk','Gehen','außerhalb des Kampfes, erschöpft, verletzt','cWalk'],['guard','Kampfschritt','die letzten Schritte zum Gegner, Waffe und Schild vorn','cGuard'],['jog','Laufen','mittlerer Abstand (bisheriges Tempo)','cJog'],['sprint','Sprinten','großer Abstand, Verfolgen; kostet Ausdauer, braucht Anlauf','cSprint'],['side','Seitschritt','Umkreisen, Deckung oben, Füße setzen bei','cSide'],['back','Rückwärts','Zurückweichen mit Blick zum Gegner (weiter weg: '+Math.round(P.backFar*100)+' %)','cBack']];
 $('tbl').innerHTML='<tr><th>Gangart</th><th>Tempo</th><th>Anteil</th><th>bisher</th><th>Rhythmus</th><th>wann</th></tr>'+rows.map(([k,n,w,c])=>`<tr><td style="color:${G.color(k)}">${n}</td><td>${Math.round(base*P[k])}</td><td>${Math.round(P[k]*100)} %</td><td>${Math.round(base*({walk:1,guard:.63,jog:1,sprint:1.45,side:.5,back:1})[k])}</td><td>${(P[c]*2).toFixed(1).replace('.',',')} Schritte/s</td><td>${w}</td></tr>`).join('')+
 `<tr><td>Anlaufen</td><td colspan="5">aus dem Stand bis Laufen ${(1/(P.acc*.95/base)).toFixed(2).replace('.',',')} s, weiter bis Sprint ${(base*(P.sprint-1)/(P.acc*.95*P.accSprint)).toFixed(2).replace('.',',')} s · Bremsen aus dem Sprint ${(base*P.sprint/(P.acc*.95*P.dec)).toFixed(2).replace('.',',')} s · bisher sofort</td></tr>`;}

// ---------------------------------------------------------------- Ereignisse (Kampfschrei, Ansturm, Angriff im Lauf, Umrennen)
let cnt={cry:0,charge:0,runAttack:0,ram:0,shove:0,block:0,bind:0,seize:0,finisher:0,pierce:0,backRun:0,grab:0,special:0};let slowUntil=0,closeUp=null,liveShot=null,liveT0=0,livePaused=false,cntShots=1,cuHold=0;const cuv=$('cuCv'),cux=cuv.getContext('2d');
// Nahaufnahme beim Abstechen (im Spiel macht das die Kinokamera; der Benchmark schaltet sie ab)
function camera(base){return (bb,width,height,W,H,zoom,target)=>{const now=performance.now();if(closeUp&&now<closeUp.until){const k=Math.min(1,(closeUp.until-now)/400,(now-(closeUp.until-2600))/250),b0=base?.(bb,width,height,W,H,zoom,target)||{zoom:Math.max(1,zoom),x:target?.x??W/2,y:target?.y??H/2},z=b0.zoom+(3.6-b0.zoom)*k;return {zoom:z,x:cl(b0.x+(closeUp.x-b0.x)*k,W/(z*2),W-W/(z*2)),y:cl(b0.y+(closeUp.y-b0.y)*k,H/(z*2),H-H/(z*2))};}return base?.(bb,width,height,W,H,zoom,target)||null;};}const TN={slash:'Hieb',thrust:'Stich',overhead:'Überkopf',spin:'Wirbel'};
const who=a=>a?.team?'Gegner':'Kämpfer';
const WK={ground:'am Boden',knee:'auf den Knien',stagger:'taumelt',back:'dreht den Rücken zu'},WH={pierced:'durchbohrt',beheaded:'schlägt den Kopf ab',severed:'schlägt ab',pierced:'durchbohrt',hacked:'hackt hinein',crushed:'zerschmettert'};
G.onEvent=e=>{if((e.kind==='pierce'||e.kind==='finisher'&&(e.what==='pierced'||e.what==='crushed'))&&$('cu').checked&&M.pierceFx&&S.battle){liveShot=shotFor({part:e.part,wq:M.weapon(e.a).item?.q,weapon:e.weapon||M.weapon(e.a).id,down:!!e.down,crush:e.what==='crushed',g:e.b.g,team:e.b.team,attName:e.a.g.name,seed:(cntShots++)*7919+e.part.length,fromBack:!!e.back});liveT0=performance.now();}
 if(e.kind==='backFinish'&&$('cu').checked&&!ST()&&S.battle){const BT={throat:'Kehle durchgeschnitten',kidney:'Von hinten in die Niere',neck:'Genick gebrochen'};liveShot=IS.start({g:e.b.g,team:e.b.team,part:e.part,kind:e.kind,injury:{throat:'Tiefe Schnittwunde',kidney:'Nierenverletzung',neck:'Genickbruch'}[e.mode],title:BT[e.mode],wid:e.weapon,wq:M.weapon(e.a).item?.q,attacker:e.a.g.name,weaponName:WN(e.weapon),dramatic:true,fromBack:true,throat:e.mode==='throat',cls:e.mode==='kidney'?(POLE.includes(e.weapon)?'spear':'stab'):undefined});liveT0=performance.now();if($('aSlow').checked)slowUntil=performance.now()+1500;}
 /* Sonderattacke im Kampf: Nahaufnahme wie im Spiel (Verletzungsart, anatomische Zeile) */if(e.kind==='special'&&$('cu').checked&&!ST()&&S.battle){liveShot=IS.start({g:e.b.g,team:e.b.team,part:e.part,kind:e.inj,injury:IS.kinds&&({heart:'Herzstich',lung:'Lungendurchstich',liver:'Leberriss',spleen:'Milzriss',gutted:'Ausgeweidet',ribs:'Rippenbruch',ribseries:'Rippenserienfraktur',sternum:'Brustbeinbruch',pelvis:'Beckenbruch',larynx:'Kehlkopfbruch',collarbone:'Schlüsselbeinbruch',neckbreak:'Genickbruch'})[e.inj],wid:e.weapon,wq:M.weapon(e.a).item?.q,attacker:e.a.g.name,weaponName:WN(e.weapon),dramatic:true,fromBack:!!G.isBack?.(e.a,e.b)});liveT0=performance.now();if($('aSlow').checked)slowUntil=performance.now()+1300;}
 if(e.kind==='finisher'&&!$('cu').checked){if($('aSlow').checked)slowUntil=performance.now()+1300;closeUp={x:e.b.x,y:e.b.y-20,until:performance.now()+2600};}if(!(e.kind in cnt))return;cnt[e.kind]++;const pct=x=>Math.round(x*100)+' %';
 const t={cry:`<b>Kampfschrei</b> · ${who(e.a)} stürmt mit erhobener Waffe los`,charge:`<b>Ansturm</b> · ${who(e.a)} · Schaden ×${e.boost?.toFixed(2).replace('.',',')}`,
  runAttack:`<b>Ausholen im Lauf</b> · ${who(e.a)} · ${TN[e.tech]||e.tech} bei Tempo ${Math.round(e.v)} · Schaden ×${e.boost?.toFixed(2).replace('.',',')}`,
  ram:`<b style="color:#ff8a5a">Umgerannt</b> · ${who(e.a)} rennt ${who(e.b)} um (Chance ${pct(e.chance)})`,pierce:`<b style="color:#ff5a4a">Durchstich</b> · ${who(e.a)} sticht ${who(e.b)} durch (${M.partName?.(e.part)||e.part}, Schaden ${Math.round(e.dmg)})`,seize:`<b>Initiative</b> · ${who(e.b)} ${WK[e.why]} – ${who(e.a)} stürzt sofort darauf zu`,finisher:`<b style="color:#ff5a4a">Abgestochen</b> · ${who(e.a)} ${WH[e.what]} (${M.partName?.(e.part)||e.part}, Schaden ${Math.round(e.dmg)})`,backRun:`<b style="color:#ff5a4a">Von hinten im Lauf</b> · ${who(e.a)} erwischt ${who(e.b)} von hinten: ${({through:'Durchstich in den Rücken',throat:'Griff, Kehle',kidney:'Griff, Niere',neck:'Würgegriff, Genick',skull:'Schlag auf den Hinterkopf',chop:'Hieb in den Rücken'})[e.mode]} (Schaden ${Math.round(e.dmg)})`,grab:`<b style="color:#ffcf6a">Gepackt</b> · ${who(e.a)} packt ${who(e.b)} von hinten`,special:`<b style="color:#ff5a4a">Sonderattacke ${G.SPECIALS?.[e.key]?.name||e.key}</b> · ${who(e.a)} → ${who(e.b)} (${M.partName?.(e.part)||e.part}${e.result==='death'?', tödlich':e.result==='down'?', bricht zusammen':''})`,shove:`<b>Zurückgestoßen</b> · ${who(e.b)} bleibt stehen (Umrenn-Chance war ${pct(e.chance)})`}[e.kind];
 const d=document.createElement('div');d.className='row';d.innerHTML=t;$('evlog').prepend(d);while($('evlog').children.length>12)$('evlog').lastChild.remove();};
const BC=M.blockContact;if(BC){BC.labels=false;const ON={clean:'Sauber geblockt',glance:'Abgeglitten',bind:'Kraftprobe',broken:'Deckung durchschlagen'};
 BC.onEvent=e=>{let t='';if(e.kind==='block'){cnt.block++;t=`<b>${ON[e.outcome]||'Geblockt'}</b> · ${who(e.def)} wehrt mit ${e.shield?'Schild':'der Waffe'} ab`;}
  else if(e.kind==='bindStart'){cnt.bind++;t=`<b>Kraftprobe</b> · Klinge an Klinge, ${who(e.winner)} drückt weg`;}else return;
  const d=document.createElement('div');d.className='row';d.innerHTML=t;$('evlog').prepend(d);while($('evlog').children.length>12)$('evlog').lastChild.remove();};}
function counts(){$('counts').innerHTML=`<div class="row"><span>Kampfschreie</span><b>${cnt.cry}</b></div><div class="row"><span>Ansturm</span><b>${cnt.charge}</b></div><div class="row"><span>Ausholen im Lauf</span><b>${cnt.runAttack}</b></div><div class="row"><span>Umgerannt / zurückgestoßen</span><b>${cnt.ram} / ${cnt.shove}</b></div><div class="row"><span>Durchstiche</span><b>${cnt.pierce}</b></div><div class="row"><span>Initiative genutzt / abgestochen</span><b>${cnt.seize} / ${cnt.finisher}</b></div><div class="row"><span>Geblockt / Kraftproben</span><b>${cnt.block} / ${cnt.bind}</b></div><div class="row"><span>Von hinten im Lauf / gepackt</span><b>${cnt.backRun} / ${cnt.grab}</b></div><div class="row"><span>Sonderattacken</span><b>${cnt.special}</b></div>`;}

// ---------------------------------------------------------------- Nahaufnahmen über injury-shots.js (gewohnte Qualität)
const IS=M.injuryShots,WN=id=>WD[id]?.name||id;
function shotFor(o){// o: {part, weapon, crush, g (Getroffener), team, attName, down}
 const lab=M.pierceFx.labelFor(M.pierceFx.make({part:o.crush?'head':o.part,weapon:o.weapon,kind:o.crush?'crush':'pierce',down:o.down,seed:o.seed||7}));
 const base={g:o.g,team:o.team,part:o.crush?'head':o.part,wid:o.weapon,wq:o.wq,cls:o.crush?'blunt':undefined,attacker:o.attName,weaponName:WN(o.weapon),dramatic:true,line3:lab.de,color:'#ff6a5a'};
 return IS.start(o.crush?{...base,kind:'skullfracture',injury:'Schädelbruch',title:'Schädel zertrümmert',helm:null}:{...base,kind:'through',injury:'Durchstochen',fromBack:!!o.fromBack,title:o.down?'Abgestochen – durchbohrt':o.fromBack?'Von hinten durchbohrt':'Durchstich'});}

// ---------------------------------------------------------------- Nahaufnahmen-Studio und „Am Boden“: alle Nahaufnahmen, mit kleiner Szene davor
// Oben fügt eine Figur der anderen die Verletzung mit einer passenden Waffe zu (Hieb, Stich, Überkopf, Schuss, Abstechen);
// im Treffermoment läuft unten die Nahaufnahme des Spiels (injury-shots.js, Gesichter und Rüstung aus face-shots.js), oben in Zeitlupe weiter.
const BLADE=['dagger','short','gladius','long','axe','doubleaxe','halberd','greatsword','throwaxe'],POINT=['dagger','short','gladius','long','greatsword','spear','trident','javelin','halberd'],BLUNT=['club','mace','hammer'],HEAVY=['axe','doubleaxe','halberd','greatsword'],CHOP=['axe','doubleaxe','halberd','greatsword','long','gladius','short'],ALLM=MELEE.map(w=>w.id),
 POLE=['spear','trident','javelin','halberd'],SHOOT=['bow','crossbow'],THROWN=['javelin','throwaxe'],RANGED=[...SHOOT,...THROWN],ALLW=[...ALLM,...RANGED],GRAB=['dagger','short','gladius'],ONEH=MELEE.filter(w=>!w.twoHand).map(w=>w.id);
const KW={scrape:[...BLADE,...SHOOT],cut:[...BLADE,...SHOOT],deepcut:BLADE,stab:[...POINT,...SHOOT],deepstab:[...POINT,...SHOOT],arrow:SHOOT,sinew:[...BLADE,...SHOOT],gut:[...new Set([...BLADE,...POINT])],pierce:[...POINT,...SHOOT],through:['spear','trident','javelin','dagger','gladius','short','long','greatsword','halberd',...SHOOT],
 bruise:BLUNT,contusion:BLUNT,crush:BLUNT,concussion:BLUNT,skullfracture:[...ALLM,'crossbow','throwaxe','javelin'],joint:BLUNT,fracture:[...BLUNT,...HEAVY],badfracture:[...BLUNT,...HEAVY],shatter:BLUNT,pulp:['hammer','mace'],sever:CHOP,scar:ALLW,collapse:ALLW,
 ribs:BLUNT,ribseries:['hammer','mace','club'],sternum:BLUNT,lung:[...POINT,...BLUNT,...SHOOT],heart:[...POINT,...SHOOT],liver:[...POINT,...BLUNT,...SHOOT],spleen:[...BLUNT,...POINT,...SHOOT],kidney:[...POINT,...SHOOT],gutted:[...HEAVY,'long'],pelvis:BLUNT,neckbreak:[...BLUNT,...HEAVY],larynx:BLUNT,collarbone:[...BLUNT,'axe','doubleaxe']};
const STAB_K=['stab','deepstab','pierce','through','heart','kidney'],BLUNT_K=['bruise','contusion','crush','concussion','joint','fracture','badfracture','shatter','pulp','skullfracture','ribs','ribseries','sternum','pelvis','neckbreak','larynx','collarbone'];
const TECH=(k,w)=>k==='arrow'||SHOOT.includes(w)?'shoot':THROWN.includes(w)?'throw':STAB_K.includes(k)||(['lung','liver','spleen'].includes(k)&&POINT.includes(w)&&!BLUNT.includes(w))?'thrust':BLUNT_K.includes(k)||(['lung','liver','spleen'].includes(k))?'overhead':'slash';
const P1=p=>()=>p,ONLY=list=>p=>list.includes(p);
const NEWK=[['Rippenbruch','ribs',['chest']],['Rippenserienfraktur','ribseries',['chest']],['Brustbeinbruch','sternum',['chest']],['Lungendurchstich (Pneumothorax)','lung',['chest']],['Herzstich','heart',['chest']],['Leberriss','liver',['belly']],['Milzriss','spleen',['belly']],['Nierenverletzung','kidney',['belly']],['Ausgeweidet','gutted',['belly']],['Beckenbruch','pelvis',['belly']],['Genickbruch','neckbreak',['neck']],['Kehlkopfbruch','larynx',['neck']],['Schlüsselbeinbruch','collarbone',['ls','rs']]];
const STAND_K=[...IS.kinds.map(([n,k])=>({name:n,kind:k,parts:p=>IS.injuriesFor(p).includes(n)})),{name:'Durchstochen (Durchstich ganz durch)',kind:'through',parts:()=>true},...NEWK.map(([n,k,ps])=>({name:'NEU · '+n,inj:n,kind:k,parts:ONLY(ps)}))];
const LIMB=['lua','rua','lfa','rfa','lt','rt','lsh','rsh'];
const GROUND_K=[
 {name:'Abstechen – Stichwaffe durchbohrt',kind:'through',parts:ONLY(['chest','belly','head','neck']),ws:KW.through,tech:'groundFinish',pose:'lying',title:'Abgestochen'},
 {name:'Abstechen – Herzstich',inj:'Herzstich',kind:'heart',parts:ONLY(['chest']),ws:POINT,tech:'groundFinish',pose:'lying'},
 {name:'Abstechen – Kopf zertrümmern',kind:'skullfracture',inj:'Schädelbruch',parts:ONLY(['head']),ws:BLUNT,tech:'groundFinish',pose:'lying',title:'Schädel zertrümmert'},
 {name:'Abstechen – Kopf abschlagen',kind:'sever',inj:'Abgetrennt',parts:ONLY(['neck']),ws:CHOP,tech:'groundFinish',pose:'lying',title:'Kopf ab'},
 {name:'Am Boden – Glied abschlagen',kind:'sever',inj:'Abgetrennt',parts:ONLY(['lua','rua','lt','rt']),ws:CHOP,tech:'groundFinish',pose:'lying'},
 {name:'Am Boden – Genickbruch (Schlag in den Nacken)',inj:'Genickbruch',kind:'neckbreak',parts:ONLY(['neck']),ws:[...BLUNT,...HEAVY],tech:'groundFinish',pose:'lying'},
 {name:'Am Boden – Rippen eintreten / zertrümmern',inj:'Rippenserienfraktur',kind:'ribseries',parts:ONLY(['chest']),ws:BLUNT,tech:'groundFinish',pose:'lying'},
 {name:'Am Boden – Pfeil oder Bolzen aus nächster Nähe',inj:'Pfeil steckt',kind:'deepstab',parts:ONLY(['chest','belly','neck','lt','rt']),ws:SHOOT,tech:'shoot',pose:'lying',title:'Aus nächster Nähe'},
 {name:'Am Boden – Wurfspeer in den Liegenden',kind:'through',parts:ONLY(['chest','belly']),ws:['javelin'],tech:'throw',pose:'lying',title:'Festgenagelt'},
 {name:'Am Boden – Wurfaxt in den Liegenden',inj:'Tiefe Schnittwunde',kind:'deepcut',parts:ONLY(['chest','belly','lt','rt']),ws:['throwaxe'],tech:'throw',pose:'lying'},
 {name:'Am Boden – Bauch aufschlitzen',inj:'Ausgeweidet',kind:'gutted',parts:ONLY(['belly']),ws:[...HEAVY,'long','gladius'],tech:'groundFinish',pose:'lying'},
 {name:'Kniend – Amputationsschlag',kind:'sever',inj:'Abgetrennt',parts:ONLY(['lua','rua','lt','rt','lfa','rfa']),ws:CHOP,tech:'overhead',pose:'kneel'},
 {name:'Kniend – Kehle durchschneiden (von hinten)',kind:'deepcut',inj:'Tiefe Schnittwunde',parts:ONLY(['neck']),ws:['dagger','gladius','short'],tech:'grab',grab:'throat',pose:'kneelBack',title:'Kehle durchgeschnitten'},
 {name:'Kniend – Genickbruch von hinten',inj:'Genickbruch',kind:'neckbreak',parts:ONLY(['neck']),ws:[...BLUNT,'axe','doubleaxe'],tech:'overhead',pose:'kneelBack'},
 {name:'Kniend – Stich in die Niere (von hinten)',inj:'Nierenverletzung',kind:'kidney',parts:ONLY(['belly']),ws:GRAB,tech:'grab',grab:'kidney',pose:'kneelBack'},
 {name:'Kniend – Kopf zertrümmern',kind:'skullfracture',inj:'Schädelbruch',parts:ONLY(['head']),ws:BLUNT,tech:'overhead',pose:'kneel'}];
// Von hinten im Lauf: Sonderangriffe, wenn der Gegner den Rücken zudreht (Vorschlag)
const BACK_K=[
 {name:'Im Lauf – Durchstich in den Rücken',kind:'through',parts:ONLY(['chest','belly']),ws:['spear','trident','gladius','short','long','greatsword','dagger','halberd'],tech:'thrust',pose:'standBack',run:true,title:'Von hinten durchbohrt'},
 {name:'Im Lauf – Griff von hinten: Kehle durchschneiden',inj:'Kehle durchgeschnitten',kind:'deepcut',parts:ONLY(['neck']),ws:GRAB,tech:'grab',grab:'throat',pose:'standBack',run:true,title:'Kehle durchgeschnitten'},
 {name:'Im Lauf – Griff von hinten: Stiche in die Niere',inj:'Nierenverletzung',kind:'kidney',parts:ONLY(['belly']),ws:GRAB,tech:'grab',grab:'kidney',pose:'standBack',run:true},
 {name:'Im Lauf – Würgegriff: Genickbruch',inj:'Genickbruch',kind:'neckbreak',parts:ONLY(['neck']),ws:ONEH,tech:'grab',grab:'neck',pose:'standBack',run:true},
 {name:'Im Lauf – Hieb in den Rücken',inj:'Tiefe Schnittwunde',kind:'deepcut',parts:ONLY(['chest','belly']),ws:['axe','doubleaxe','long','greatsword','halberd','gladius'],tech:'slash',pose:'standBack',run:true,title:'Rücken aufgehackt'},
 {name:'Im Lauf – Schlag auf den Hinterkopf',kind:'skullfracture',inj:'Schädelbruch',parts:ONLY(['head']),ws:BLUNT,tech:'overhead',pose:'standBack',run:true,title:'Hinterkopf zertrümmert'},
 {name:'Im Lauf – Rammstoß in den Rücken (umgerannt)',inj:'Rippenbruch',kind:'ribs',parts:ONLY(['chest']),ws:ALLM,tech:'ram',pose:'standBack',run:true,title:'Umgerannt'},
 {name:'Von hinten – Pfeil oder Bolzen in den Rücken',kind:'arrow',inj:'Pfeil steckt',parts:ONLY(['chest','belly','neck','ls','rs','lt','rt']),ws:SHOOT,tech:'shoot',pose:'standBack'},
 {name:'Von hinten – Wurfspeer in den Rücken',kind:'through',parts:ONLY(['chest','belly']),ws:['javelin'],tech:'throw',pose:'standBack',title:'Von hinten durchbohrt'},
 {name:'Von hinten – Wurfaxt in den Rücken',inj:'Tiefe Schnittwunde',kind:'deepcut',parts:ONLY(['chest','belly','head']),ws:['throwaxe'],tech:'throw',pose:'standBack'}];
const KL=()=>mode==='ground'?GROUND_K:mode==='back'?BACK_K:STAND_K;
const PARTS=['head','neck','chest','belly','ls','rs','lua','rua','lfa','rfa','lh','rh','lt','rt','lsh','rsh','lf','rf'];
const ROM=['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
$('sWho').innerHTML=[5151,77,1701,4242,9001,313].map((s,i)=>`<option value="${s}">Gladiator ${i+1}</option>`).join('');
let kindsFor=null;
function studioFill(reset){const L=KL();if(reset||kindsFor!==L){kindsFor=L;$('sKind').innerHTML=L.map((k,i)=>`<option value="${i}">${k.name}</option>`).join('');$('sKind').value=String(mode==='ground'||mode==='back'?0:L.findIndex(k=>k.kind==='through'));$('sTitle').textContent=mode==='ground'?'Angriffe am Boden':mode==='back'?'Von hinten (im Lauf)':'Nahaufnahmen-Studio';}
 const K=L[+$('sKind').value]||L[0],parts=PARTS.filter(K.parts),ws=(K.ws||KW[K.kind]||ALLM).filter(id=>WD[id]);const pv=$('sPart').value,wv=$('sW').value;
 $('sPart').innerHTML=parts.map(p=>`<option value="${p}">${M.partName(p)}</option>`).join('');$('sPart').value=parts.includes(pv)?pv:parts.includes('chest')?'chest':parts[0];
 $('sW').innerHTML=ws.map(id=>`<option value="${id}">${WN(id)}</option>`).join('');$('sW').value=ws.includes(wv)?wv:ws[0];
 const tech=K.tech||TECH(K.kind,$('sW').value);$('sInfo').textContent=`${ws.length} Waffen können das auslösen · ${parts.length} Stelle(n) · ${({slash:'Hieb',thrust:'Stich',overhead:'Überkopf',shoot:'Schuss',throw:'Wurf',groundFinish:'Abstechen',grab:'Griff von hinten',ram:'Rammstoß'})[tech]}${K.run?' · aus dem Lauf':''}${K.pose?' · Gegner '+({lying:'liegt',kneel:'kniet',kneelBack:'kniet, von hinten',standBack:'dreht den Rücken zu'})[K.pose]:''}`;}
$('sKind').onchange=()=>{studioFill();if(ST())restart();};$('sPart').onchange=()=>{if(ST())stage2();};
fill($('sSh'),SH,true);$('sSh').value='none';
for(const id of ['sW','sA','sQ','sHelm','sWho','sPose','sSh'])$(id).onchange=()=>{studioFill();if(ST())restart();};
$('sHeal').onclick=()=>{queue=[];const v=fighters[1];if(v)v.g.__who=null;restart();};
$('sPlay').onclick=()=>{queue=[];if(!ST()){mode='studio';studioFill(true);restart();}else stage2();};
$('sParts').onclick=()=>{const L=KL(),K=+$('sKind').value;queue=PARTS.filter(L[K].parts).map(p=>[K,p]);next();};
$('sAll').onclick=()=>{const L=KL();queue=L.map((k,i)=>{const ps=PARTS.filter(k.parts);return [i,ps.includes('chest')?'chest':ps[0]];});next();};
let queue=[],scene=null;
function next(){const it=queue.shift();if(!it)return;$('sKind').value=String(it[0]);studioFill();$('sPart').value=it[1];restart();}
function armorSet(){const m=$('sA').value,q=+$('sQ').value;if(m==='none')return $('sHelm').checked?{helm:M.makeItem('armor','helm',q,'leather')}:{};const ids=['chestplate','leftarm','rightarm','leftleg','rightleg','leftshoulder','rightshoulder',...($('sHelm').checked?['helm']:[])];return Object.fromEntries(ids.map(d=>[d,M.makeItem('armor',d,q,m)]));}
function studioSetup(b,F,p,q){fighters=[p,q];M.battleCamera=(bb,width,height,W,H)=>{const z=5,x=(p.x+q.x)/2,y=(p.y+q.y)/2-30;return {zoom:z,x:cl(x,W/(z*2),W-W/(z*2)),y:cl(y,H/(z*2),H-H/(z*2))};};
 q.g.enemyGear={...(q.g.enemyGear||{}),armor:armorSet(),shield:$('sSh').value==='none'?null:M.makeItem('shield',$('sSh').value,+$('sQ').value)};q.g.__who=$('sWho').value;if(carry){q.g.body=carry.body;q.g.gaitMarks=carry.marks;q.g.blood=carry.blood;if(carry.scars)q.g.scars=carry.scars;}p.g.enemyGear={...(p.g.enemyGear||{}),shield:null};for(const a of [p,q]){a.gaitOff=true;a.puppet={hold:true};a.energy=200;}
 q.x=F.cx+40;q.y=F.cy;p.y=F.cy;p.ammo=99;p.closeCombat=false;stage2();}
// gleiche Rechnung wie injury-shots.js (V.seed), damit Beschriftung und Bild (Rippe, Seite, Halswirbel) übereinstimmen
const vseed=(part,kind,g)=>[...(part+kind+(g?.id||g?.name||''))].reduce((n,c)=>(n*31+c.charCodeAt(0))%9973,7);
function anat(kind,part,g){const sd=vseed(part,kind,g),side=sd%2?'links':'rechts',lat=sd%2?'sinistra':'dextra',n=3+sd%6;
 return {ribs:`${n}. Rippe ${side} gebrochen · Costa ${ROM[n]} ${lat}`,ribseries:`${n}. bis ${n+2}. Rippe ${side} gebrochen · Costae ${ROM[n]}–${ROM[n+2]} ${lat}`,sternum:'Brustbein quer gebrochen · Corpus sterni',lung:`Lunge ${side} angestochen, fällt zusammen · Pneumothorax`,heart:'Herz durchstochen · Ventriculus sinister cordis',
  liver:'Leber eingerissen · Ruptura hepatis',spleen:'Milz geplatzt · Ruptura lienis',kidney:`Niere ${side} durchstochen · Ren ${sd%2?'sinister':'dexter'}`,gutted:'Bauchdecke aufgeschlitzt, Darm tritt aus · Prolapsus intestini',pelvis:'Becken gebrochen · Fractura ossis ilii',
  neckbreak:`${3+sd%3}. Halswirbel gebrochen (C${3+sd%3}) · Vertebra cervicalis ${ROM[3+sd%3]}`,larynx:'Kehlkopf zertrümmert · Cartilago thyroidea',collarbone:`Schlüsselbein ${part==='ls'?'links':'rechts'} gebrochen · Clavicula ${part==='ls'?'sinistra':'dextra'}`}[kind]||null;}
function stage2(){const b=S.battle;if(!b||(!ST()))return;const [p,q]=fighters,K=KL()[+$('sKind').value],w=M.weapon(p),tech=K.tech||TECH(K.kind,w.id),pose=K.pose||($('sPose')?.value==='kneel'?'kneel':'stand');
 if(!$('sKeep').checked||q.g.dead){for(const pt of Object.values(q.g.body)){pt.hp=100;pt.bleed=0;pt.missing=false;pt.fracture=null;pt.internal=false;pt.deepStabs=0;pt.skullFracture=false;}q.g.blood=100;q.g.gaitMarks=[];}else{for(const pt of Object.values(q.g.body))pt.bleed=Math.min(pt.bleed||0,1.5);q.g.blood=Math.max(q.g.blood,70);}
 const ranged=tech==='shoot'||tech==='throw',reach=ranged?(pose==='lying'?(tech==='shoot'?64:90):tech==='shoot'?200:140):tech==='groundFinish'?38:tech==='grab'||tech==='ram'?17:pose==='kneelBack'?26:Math.max(40,(M.effective(p).range||60)*.82+10);
 Object.assign(q,{grabbedBy:null,a:pose==='kneelBack'||pose==='standBack'?0:Math.PI,state:'idle',hit:0,facePain:0,fallTimer:0,fallDuration:0,kneeTimer:0,down:false});
 if(pose==='lying')Object.assign(q,{fallTimer:9,fallDuration:10,riseDuration:1.25,state:'fallen',fallSide:-1});
 if(pose==='kneel'||pose==='kneelBack')Object.assign(q,{kneeTimer:3,kneeDuration:4,kneeRise:1,state:'kneeling'});
 Object.assign(p,{ammo:99,closeCombat:false,x:q.x-reach-(K.run?240:0),y:q.y,a:0,gaitOff:true,moveSpeed:0,gaitSpeed:0,state:'idle',wind:0,swing:0,pierceContact:null,technique:null,finisher:null,finFix:null,finHold:0});b.paused=false;liveShot=null;if(p.puppet)p.puppet.drive=null;
 /* Zeichenreihenfolge: von vorn steht der Angreifer einen Hauch näher zur Kamera (Waffe trifft sichtbar auf), von hinten dahinter (Klinge verschwindet im Rücken) */p.y=q.y+(pose==='kneelBack'||pose==='standBack'?-1:1);
 if(tech==='groundFinish'){const part=$('sPart').value;p.finisher={target:q.id,part,started:true};const sp=G.finSpot(p,q,part);if(sp){p.x=sp.x-sp.face*34;p.y=sp.y;p.a=sp.face>0?0:Math.PI;}}
 const tm=M.meleeTiming?.(p.g,w,['shoot','throw','grab','ram'].includes(tech)?'thrust':tech==='groundFinish'?'groundFinish':tech)||{wind:.4,swing:.3};scene={t:0,tech,ranged,run:!!K.run,runT:1.3,x0:q.x-reach-240,x1:q.x-reach,wind:Math.max(.32,tm.wind*(tech==='groundFinish'?1.6:K.run?.7:1.25)),swing:Math.max(.22,tm.swing),hit:false,K,part:$('sPart').value,done:0,pose};
 $('hudL').innerHTML=`<b>${K.name}</b> · ${M.partName(scene.part)} · ${WN(w.id)}`;$('hudR').innerHTML=queue.length?`noch ${queue.length}`:'';}
function stepStudio(dtReal){const b=S.battle;if(!b||!scene)return;const [p,q]=fighters,sp=+$('speed').value||1,s=scene;
 /* Trefferaufhellung in Echtzeit abklingen lassen (Zeitlupe der Nahaufnahme hielt den Rumpf sonst lange hell) */if(q.hit>0)q.hit=Math.max(0,q.hit-dtReal);
 const slow=liveShot?.15:1,dt=dtReal*sp*slow;
 if(s.fell&&q.fallTimer>(q.riseDuration||1.25)+.05){q.fallTimer=Math.max((q.riseDuration||1.25)+.05,q.fallTimer-dt);if(s.knock){q.x+=s.knock*dt;s.knock*=Math.max(0,1-dt*5);}}
 if(s.proj&&!s.hit)s.proj.t+=dt;
 if(p.pierceContact?.grab){const f=p.pierceContact;f.left-=dt;G.grabStep(p,q,f,dt);if(f.cut&&!s.hit)hitScene(p,q,s,f.result);if(f.left<=0){p.pierceContact=null;q.grabbedBy=null;p.state='idle';q.stun=0;}}
 else if(p.pierceContact){const f=p.pierceContact;f.t+=dt;f.left-=dt;G.pierceLunge(p,q,f,dt);G.pierceBlood(p,q,f,f.t/(f.len||1),dt,Math.atan2(q.y-p.y,q.x-p.x));if(f.left<=0){p.pierceContact=null;p.y=q.y+1;for(const m of q.g.gaitMarks||[])if(m.lx!=null)m.fixed=true;}}
 if(s.hit&&!liveShot&&s.after&&!p.pierceContact?.grab){const r=s.after;s.after=null;if(r==='sever'&&!q.g.body[s.part]?.missing)M.sever?.(p,q,s.part);else if(r==='death'){M.death?.(q,s.K.inj||s.K.name,p);s.fell=true;}else if(r==='down'){M.knockdown?.(q,s.K.inj||s.K.name,6);s.fell=true;}s.done=r==='death'||r==='down'?2.4:1.4;}
 if(s.hit&&!liveShot){s.done-=dtReal;if(s.done<=0){scene=null;const dead=q.g.dead||!q.g.body.head||q.g.body.head.missing;if(queue.length)next();else setTimeout(()=>{if((ST())&&!scene&&!queue.length){if(dead||S.battle?.finale||S.battle?.result)restart();else stage2();}},600);}}
 s.t+=dt;const t0=s.run?s.runT:.45,tw=t0+s.wind,ts=tw+s.swing;
 if(s.run&&s.t<t0){/* Anlauf: Sprint mit Kampfschrei, Waffe hoch */const f=cl(s.t/t0,0,1),e=f**1.6;p.puppet.drive={x:s.x0+(s.x1-s.x0)*e,y:s.y0??p.y,face:0};p.a=0;p.state='move';p.gaitOff=false;p.gaitW={stand:0,walk:0,guard:0,jog:f<.25?1:0,sprint:f<.25?0:1,side:0,back:0};p.gaitBase=80;
  if(!s.cried&&f>.12){s.cried=true;p.shoutTimer=1;p.cried=true;M.voice?.('battlecry',M.voicePitch?.(p.g)??1,true);M.floater?.(p.x,p.y-66,'HAAA!','#ffcf6a');}return;}
 if((s.run||s.tech==='grab')&&!s.arrived&&s.t>=t0){s.arrived=true;p.puppet.drive=null;p.x=s.x1;p.gaitOff=true;p.state='idle';
  if(s.tech==='grab'){G.grab(p,q,s.K.grab);p.pierceContact.studio=true;return;}
  if(s.tech==='ram'){q.hit=.4;q.facePain=1.4;M.shake=6;M.sound?.('heavy');M.knockdown?.(q,'Umgerannt',6);s.fell=true;s.knock=90;M.floater?.(q.x,q.y-62,'UMGERANNT!','#ff8a5a');hitScene(p,q,s);return;}}
 if(s.tech==='grab'||s.tech==='ram')return;
 if(!s.run&&s.t<t0){p.state='idle';return;}
 const techR=TR(s.tech);
 if(s.t<tw){p.state='attack';p.technique=techR;p.windMax=s.wind;p.wind=Math.max(.001,tw-s.t);p.swing=0;if(s.tech==='groundFinish'){if(p.finisher?.target!==q.id||!p.finisher.started)p.finisher={target:q.id,part:s.part,started:true};G.finStep(p,dt);if(!s.cried){s.cried=true;p.shoutTimer=1;M.voice?.('battlecry',M.voicePitch?.(p.g)??1,true);}}return;}
 if((s.t<ts||p.finHold>0||s.ranged&&!s.hit)&&!p.pierceContact){p.wind=0;p.swingKind=techR;p.swingMax=s.swing;p.swing=Math.max(.001,ts-s.t);if(p.finHold>0){p.finHold-=dt;p.swing=Math.max(p.swing,s.swing*.5);}p.state='attack';
  if(s.ranged&&!s.proj){/* Schuss oder Wurf: Geschoss fliegt sichtbar zur Stelle */const sc=p.g.height/180*1.14,face=Math.cos(p.a)>=0?1:-1,T=G.anchor(q,s.part)||{x:q.x,y:q.y-40},x0=p.x+face*14*sc,y0=p.y-(s.tech==='throw'?52:44)*sc,d=Math.hypot(T.x-x0,T.y-y0),sp={bow:520,crossbow:640,javelin:330,throwaxe:300}[M.weapon(p).id]||400;s.proj={x0,y0,x1:T.x,y1:T.y,t:0,dur:Math.max(.08,d/sp),type:M.weapon(p).id,arc:s.tech==='throw'?d*.14:d*.04};M.sound?.(s.tech==='throw'?'swing':'shoot');if(s.tech==='throw')p.ammo=0;/* geworfen: Hand ist leer, er zieht die Nebenwaffe */}
  if(!s.hit&&(s.ranged?s.proj.t>=s.proj.dur:s.t>tw+s.swing*.45)){hitScene(p,q,s);}
  return;}
 p.swing=0;p.state=p.pierceContact?'piercing':'idle';p.finisher=null;}
// Geschoss im Flug (nur Studio): Pfeil, Bolzen, Wurfspeer, sich drehende Wurfaxt – in Feldkoordinaten über der Szene
{const prevOv=M.battleOverlay;M.battleOverlay=(ctx,b)=>{prevOv?.(ctx,b);const s=scene,P=s?.proj;if(!P||s.hit||!ST())return;const f=cl(P.t/P.dur,0,1),x=P.x0+(P.x1-P.x0)*f,y=P.y0+(P.y1-P.y0)*f-P.arc*4*f*(1-f);
 const vx=P.x1-P.x0,vy=P.y1-P.y0-P.arc*4*(1-2*f),ang=Math.atan2(vy,vx),R=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};ctx.save();
 ctx.globalAlpha=.25;ctx.strokeStyle='#fff';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(ang)*18,y-Math.sin(ang)*18);ctx.stroke();ctx.globalAlpha=1;ctx.translate(x,y);
 if(P.type==='throwaxe'){ctx.rotate(P.t*22);R(-7,-.6,13,1.4,'#6e5230');R(4,-3.5,3,6,'#7d8687');R(6,-3.5,1,6,'#dfe4d2');}
 else{ctx.rotate(ang);if(P.type==='javelin'){R(-28,-.7,26,1.5,'#7a5232');R(-3,-1,5,2,'#a3b2ac');R(1,-.5,2,1,'#dfe4d2');}
  else if(P.type==='crossbow'){R(-9,-.7,8,1.4,'#6a4a28');R(-1,-1,3,2,'#7d8687');R(-9,-1.6,3,1,'#4a3a2a');R(-9,.8,3,1,'#4a3a2a');}
  else{R(-15,-.5,14,1,'#8a6a3c');R(-1,-1,3,2,'#a3b2ac');R(-15,-1.6,4,1,'#f0ead8');R(-15,.7,4,1,'#b8423a');}}
 ctx.restore();};}
const TR=t=>t==='shoot'||t==='grab'||t==='ram'?'thrust':t==='throw'?'overhead':t;
function hitScene(p,q,s,given){const techR=TR(s.tech);{s.hit=true;q.hit=.35;q.facePain=1.4;const cp=G.anchor(q,s.part)||M.contactAnchor(q,'chest');M.emit?.(cp.x,cp.y,16,'#aa3c36',90);M.shake=4;M.sound?.(BLUNT.includes(M.weapon(p).id)?'heavy':'hit');
   if(s.K.kind==='through'&&!s.ranged){const TH=G.throughOf(M.weapon(p).id);if(s.tech==='groundFinish')p.finHold=.7;else{p.pierceContact={target:q.id,part:s.part,left:1.1,len:1.1,t:0,through:true,exit:TH.exit,depthMul:TH.depth,weaponId:M.weapon(p).item?.id};p.y=q.y+1;}if(M.weapon(p).item)M.weapon(p).item.blood=.9;}
   const kind=s.K.kind,lab=kind==='through'?M.pierceFx?.labelFor(M.pierceFx.make({part:s.part,weapon:M.weapon(p).id,kind:'pierce',seed:7,down:s.pose==='lying'})):null,wid=M.weapon(p).id;
   liveShot=IS.start({g:q.g,team:1,part:s.part,kind,injury:wid==='crossbow'&&s.K.inj==='Pfeil steckt'?'Bolzen steckt':s.K.inj||(kind==='through'?'Durchstochen':s.K.name),title:s.K.title||(kind==='through'?(s.pose==='lying'?'Abgestochen':s.pose==='standBack'?'Von hinten durchbohrt':'Durchstich'):undefined),wid,wq:M.weapon(p).item?.q,cls:wid==='throwaxe'&&s.tech==='throw'?'throwaxe':SHOOT.includes(wid)&&kind!=='through'?'arrow':kind==='through'?undefined:(techR==='thrust'||s.tech==='throw')&&POLE.includes(wid)?'spear':(techR==='thrust'||s.tech==='grab'||s.tech==='groundFinish')&&POINT.includes(wid)&&!(kind==='deepcut')?'stab':undefined,thrown:s.tech==='throw',fromBack:s.pose==='standBack'||s.pose==='kneelBack',from:.42,/* gleichzeitig mit dem Treffer der Figur: nur ein kurzer Anflug */lastHit:{ax:p.x,bx:q.x,tech:s.tech==='groundFinish'?'groundFinish':techR,wid,part:s.part,back:s.pose==='standBack'||s.pose==='kneelBack'},throat:kind==='deepcut'&&s.part==='neck',attacker:p.g.name,weaponName:WN(wid),dramatic:true,line3:lab?.de||anat(kind,s.part,q.g)||undefined});liveT0=performance.now();s.done=1;s.after=given!==undefined?given:s.tech==='grab'?null:G.applyInjury(p,q,kind,s.part,wid,s.K.inj||s.K.name,{back:s.pose==='standBack',thrown:s.ranged});}}
studioFill(true);

// ---------------------------------------------------------------- Neue Verletzungen (Vorschlag)
const NEWINJ=[
 ['Rippenbruch','Costa I–XII links/rechts (z. B. „5. Rippe links, Costa V sinistra“)','Keule, Streitkolben, Hammer, Tritt, Schildstoß, Ansturm','Atmen schmerzt: Ausdauer −15 %, Erholung −20 %; weiterer Treffer kann die Lunge anstechen','21 Tage'],
 ['Rippenserienfraktur','mehrere Rippen hintereinander, instabiler Brustkorb','Hammer, Streitkolben, Umrennen mit Sturz','Ausdauer −35 %, Taumeln, kann nicht sprinten','35 Tage'],
 ['Lungendurchstich (Pneumothorax)','Pulmo, nach Rippenbruch oder Stich zwischen den Rippen','Stichwaffen, gebrochene Rippe','Atemnot: Ausdauer fällt laufend, ohne Behandlung tödlich','28 Tage, Medikus'],
 ['Herzstich','Cor, Herzbeutel (Pericardium)','Speer, Dreizack, Dolch, Gladius (Stich in die Brust links)','sofort tödlich oder Zusammenbruch in Sekunden','—'],
 ['Brustbeinbruch','Sternum','Hammer, Streitkolben, Ansturm frontal','Ausdauer −20 %, Blocken schwächer','28 Tage'],
 ['Schlüsselbeinbruch','Clavicula links/rechts','Überkopfschlag Keule/Axt, Sturz','Arm auf der Seite kaum zu heben: Schildarm/Waffenarm −50 %','28 Tage'],
 ['Schulter ausgekugelt','Articulatio humeri','Kraftprobe verloren, Sturz, Griff von hinten','Arm hängt, bis eingerenkt (Medikus); Waffe fällt evtl.','7 Tage'],
 ['Genickbruch','Halswirbel C1–C7 (z. B. „C2, Axis“)','Hieb in den Nacken von hinten, Hammer, Sturz auf den Kopf','meist tödlich; sonst gelähmt (Karriereende)','—'],
 ['Halswirbel angebrochen','Vertebra cervicalis III–V','stumpfer Schlag gegen den Hals','Kopf steif: Ausweichen −30 %','42 Tage'],
 ['Kehlkopfbruch','Larynx, Schildknorpel','Keule, Schildrand, Tritt gegen den Hals','keine Kampfschreie, Atemnot, Ausdauer −25 %','30 Tage'],
 ['Kehle durchgeschnitten','A. carotis, V. jugularis','Dolch, Gladius, Griff von hinten','verblutet in Sekunden','—'],
 ['Kieferbruch','Mandibula','Keule, Faust, Schildstoß','kein Kampfschrei, Schmerz, Benommenheit','28 Tage'],
 ['Nasenbeinbruch','Os nasale','Faust, Knauf, Schildstoß','Blut läuft, Sicht kurz schlechter','10 Tage'],
 ['Jochbeinbruch','Os zygomaticum','Keule, Streitkolben','Auge schwillt zu: Trefferchance −10 %','21 Tage'],
 ['Auge verloren','Bulbus oculi','Dolch, Speer, Pfeil, Sandwurf mit Splitter','dauerhaft: Trefferchance −8 %, Narbe/Augenklappe','bleibend'],
 ['Ohr abgetrennt','Auricula','Hieb seitlich an den Kopf','nur Narbe, Publikum johlt','bleibend'],
 ['Zähne ausgeschlagen','Dentes (Schneidezähne)','Faust, Knauf, Schildrand, Keule','Aussehen, Sprache','bleibend'],
 ['Skalpiert','Kopfhaut (Galea)','Axt, Langschwert flach über den Kopf','starke Blutung im Gesicht: Sicht −','14 Tage, Narbe'],
 ['Schädelbasisbruch','Basis cranii','Hammer, Sturz auf den Hinterkopf','Blut aus Ohren, schwer benommen, oft tödlich','45 Tage'],
 ['Hirnblutung','Haematoma epidurale','nach Schädelbruch oder schwerem Kopftreffer','zuerst wach, dann plötzlicher Zusammenbruch','—'],
 ['Leberriss','Hepar (rechts unter den Rippen)','Speer, Gladius, Hammer gegen rechts unten','starke innere Blutung','35 Tage'],
 ['Milzriss','Splen (links unter den Rippen)','Keule, Tritt, Stich links unten','innere Blutung, Zusammenbruch später','30 Tage'],
 ['Niere getroffen','Ren (Lende)','Stich von hinten, Dolch','Schmerz, Blut, Ausdauer −20 %','28 Tage'],
 ['Ausgeweidet','Darm tritt aus (Prolaps)','Axt, Langschwert, Zweihänder quer über den Bauch','hält sich die Gedärme, kampfunfähig','45 Tage oder tödlich'],
 ['Beckenbruch','Os coxae','Hammer, Umrennen, Sturz','kann nicht mehr stehen','60 Tage'],
 ['Oberschenkelhalsbruch','Collum femoris','Hammer, Sturz aus dem Sprint','Bein trägt nicht','60 Tage'],
 ['Kniescheibe zertrümmert','Patella','Keule, Hammer, Tritt','Humpeln stark, kein Sprint','45 Tage, bleibend möglich'],
 ['Kreuzband gerissen','Lig. cruciatum','Wenden im Sprint, Tritt gegen das Knie','Knie knickt weg (Sturzgefahr)','40 Tage'],
 ['Achillessehne durchtrennt','Tendo calcaneus','Hieb von hinten in die Ferse','kein Laufen, nur Humpeln','50 Tage'],
 ['Sprunggelenk gebrochen','Malleolus','Sturz, Tritt, Hammer am Boden','Humpeln','35 Tage'],
 ['Kniekehle durchtrennt','A. poplitea','Hieb in die Kniekehle','Bein knickt ein, starke Blutung','30 Tage'],
 ['Oberschenkelschlagader','A. femoralis','Stich in die Leiste/innen am Oberschenkel','verblutet schnell ohne Abbinden','—'],
 ['Elle/Speiche gebrochen','Ulna, Radius','Block gegen Hammer/Axt, Parade mit dem Arm','Waffe fällt, Arm unbrauchbar','35 Tage'],
 ['Handgelenk durchtrennt','Articulatio radiocarpalis','Hieb auf die Waffenhand','Waffe fällt, Hand hängt','bleibend möglich'],
 ['Finger abgetrennt','Phalanges (einzelne Finger)','Hieb auf die Griffhand, Kraftprobe','Griff schwächer: Waffe verlieren +','bleibend'],
 ['Oberarmbruch','Humerus','Hammer, Keule, Sturz','Arm unbrauchbar','42 Tage'],
 ['Ellenbogen ausgerenkt','Articulatio cubiti','Kraftprobe, Griff','Arm schwach bis eingerenkt','10 Tage'],
 ['Wirbelsäule (Lendenwirbel)','Vertebra lumbalis L1–L5','Hammer von hinten, Sturz rückwärts','Lähmung möglich (Karriereende)','—'],
 ['Gepfählt','Speer/Dreizack durch den Rumpf, steckt fest','Speer, Dreizack, Wurfspeer','Waffe steckt, Opfer hängt daran (siehe Durchstich), tödlich','—'],
 ['Doppelter Durchstich','zwei Stichkanäle (Dreizack)','Dreizack','zwei Wunden, starke Blutung','30 Tage'],
 ['Gesicht aufgeschlitzt','Wange, Lippe (Bucca)','Dolch, Gladius, Axt seitlich','Narbe quer übers Gesicht, Publikum','14 Tage, Narbe'],
 ['Gehirnerschütterung schwer','Commotio cerebri','Keule, Hammer, Kopf gegen Schild','Taumeln, Doppelbilder, Zielen schwach','10 Tage'],
 ['Hoden getroffen','Regio inguinalis','Tritt, Knauf','kurz kampfunfähig, Publikum lacht','3 Tage'],
 ['Brandwunde (Fackel)','Haut, Gesicht oder Arm','Fackel/Feuer (später)','Schmerz, Narbe','21 Tage, Narbe'],
 ['Knochensplitter im Fleisch','Fragmenta ossis','nach Trümmerbruch','Blutung hört nicht auf','+14 Tage'],
 ['Pfeil im Knochen','Pfeilspitze im Knochen steckend','Bogen, Armbrust','Medikus muss schneiden, Blutung','+10 Tage']];
$('newInj').innerHTML='<tr><th>Verletzung</th><th>Stelle (anatomisch)</th><th>Auslöser / Waffen</th><th>Wirkung im Kampf (Vorschlag)</th><th>Heilung</th></tr>'+NEWINJ.map(r=>`<tr>${r.map((c,i)=>i?`<td>${c}</td>`:`<td style="color:#dfb66d">${c}</td>`).join('')}</tr>`).join('');

// ---------------------------------------------------------------- Schleife
let last=performance.now();
function tick(){if(trBusy){last=performance.now();requestAnimationFrame(tick);return;}const t=performance.now(),dt=Math.min(.1,(t-last)/1000);last=t;const b=S.battle;
 if(b&&!b.paused)S.options.speed=liveShot?Math.min(+$('speed').value,.15):t<slowUntil?Math.min(+$('speed').value,.22):+$('speed').value;
 if(ST())stepStudio(dt);
 else if(mode==='show')steerShow(dt);
 else if(mode==='atk')stepAtk(dt);
 else if(mode==='fight'&&b&&(b.result||b.finale||b.actors.some(a=>a.down||a.g.dead)||t-startedAt>40000)){if(!b.ended){b.ended=true;setTimeout(restart,1800);}}
 sample();labels();graph();live();counts();requestAnimationFrame(tick);}

$('rules').innerHTML=`<ul>
<li><em>Sechs Gangarten statt einer:</em> Gehen (${Math.round(G.P.walk*100)} % des bisherigen Tempos), Kampfschritt (${Math.round(G.P.guard*100)} %), Laufen (wie bisher), Sprinten (${Math.round(G.P.sprint*100)} %, wie der bisherige Sprint), Seitschritt (${Math.round(G.P.side*100)} %), Rückwärts (${Math.round(G.P.back*100)} %, weiter weg ${Math.round(G.P.backFar*100)} %). Jede hat einen eigenen Schrittrhythmus: Gehen langsam mit langem Bodenkontakt, Laufen mit kurzer Flugphase, Sprinten mit hohen Knien, weit vorgebeugt und schnellem Rhythmus.</li>
<li><em>Anlaufen und Abbremsen:</em> Niemand ist sofort auf vollem Tempo. Beschleunigung hängt von Beinen, Beweglichkeit und Metallrüstung ab, der Sprint baut sich langsamer auf. Bremsen geht schneller als Anlaufen. Wer im vollen Lauf umkehrt, bremst erst ab und dreht dann; enge Bögen kosten Tempo.</li>
<li><em>Arme passend zur Bewegung:</em> Gehen ohne Gegner: Waffe hängt locker, Arme schwingen. In Gegnernähe: Waffe und Schild kommen vor den Körper. Laufen: Waffe getragen, Arme gebeugt. Sprinten: Arme pumpen, Waffe nach vorn oben. Seitschritt, Kampfschritt und Rückwärts: volle Deckung, Spitze zum Gegner, Schild vorn.</li>
<li><em>Welche Gangart die KI nimmt:</em> großer Abstand Sprint, mittlerer Laufen, die letzten Schritte Kampfschritt, Umkreisen Seitschritt, Zurückweichen Rückwärts. Erschöpft (unter ${Math.round(G.P.tiredNoSprint*100)} % Ausdauer) kein Sprint, ganz erschöpft (unter ${Math.round(G.P.tiredWalk*100)} %) nur Gehen; verletzte Beine ebenso, gebrochenes oder fehlendes Bein nur Gehen bzw. Humpeln. Humpeln und erschöpfte Haltung bleiben wie bisher und kommen obendrauf.</li>
<li><em>Kampfschrei:</em> Wer mit der Waffe auf seinen Gegner zusprintet (ab ${G.P.cryDist} Punkten vor der Schlagdistanz) oder zum Ansturm ansetzt, hebt die Waffe über den Kopf (Speer: eingelegt nach vorn, Schild vorn) und schreit – einmal je Ansturm.</li>
<li><em>Ausholen im Lauf:</em> Wer laufend oder sprintend ankommt und zuschlagen kann, holt schon im Lauf aus, läuft während des Ausholens weiter heran und trifft bei der Ankunft, statt erst stehen zu bleiben. Der Schwung gibt bis zu ×${(1+G.P.runHit).toFixed(1).replace('.',',')} Schaden (voller Sprint), im normalen Lauf etwa ×1,1. Wer gerade nicht zuschlagen kann, bremst wie bisher vorausschauend ab.</li>
<li><em>Ansturm:</em> Schaden ×${G.P.chargeDmg.toFixed(1).replace('.',',')} plus Ansturm-Übung (bisher ×1,12 plus Übung, etwa ×1,2). Trifft der Ansturm (oder ein Sprint-Angriff), kann er den Gegner umrennen: Grundchance ${Math.round(G.P.ramCharge*100)} % (Sprint-Angriff ${Math.round(G.P.ramRun*100)} %), mehr bei schwererem und stärkerem Angreifer und höherem Tempo, weniger bei gutem Gleichgewicht und Schild (5–85 %). Sonst wird der Getroffene ein Stück zurückgestoßen. Geblockt wird wie bisher geblockt.</li>
<li><em>Angriffe (Vorführung):</em> Hieb, Stich, Überkopf und Wirbel aus dem Lauf sowie der Ansturm, einzeln oder alle nacheinander, gegen einen Gegner, der an seinem Platz bleibt und mit den Spiel-Modulen abwehrt (sichtbares Blocken mit Schild oder Waffe, Abgleiten, Kraftprobe Klinge an Klinge, durchschlagene Deckung). Ein Ansturm in die Deckung kann trotzdem umwerfen (60 % der Umrenn-Chance), sonst stößt er zurück.</li>
<li><em>Initiative nutzen:</em> Liegt ein Gegner am Boden, kniet er, taumelt er oder dreht er einem den Rücken zu (weil er mit jemand anderem kämpft), stürzt der Gladiator sofort darauf zu (bis ${G.P.seizeRange} Punkte, Sprint mit Schrei) und ist sofort schlagbereit – außer ein anderer Gegner schlägt gerade auf ihn ein.</li>
<li><em>Abstechen am Boden:</em> Weit ausholen (${G.P.finWind.toFixed(1).replace('.',',')}× so lang) mit Schrei, dann die Waffe mit voller Wucht hinein (Schaden ×${G.P.finDmg.toFixed(1).replace('.',',')}), Erschütterung, Blut, Nahaufnahme und Zeitlupe. Je nach Waffe: Axt, Doppelaxt, Hellebarde, Zweihänder, Langschwert zielen auf Hals oder Arm/Bein und schlagen ab (etwa ${Math.round(G.P.finSever*100)} % plus Wucht; Hals = Kopf ab); Speer, Dreizack, Dolch, Gladius und andere Klingen durchbohren Kopf, Brust oder Bauch, die Waffe steckt ${G.P.finHold.toFixed(1).replace('.',',')} s fest und wird herausgerissen; Keule, Streitkolben, Hammer zerschmettern. Gegen Kniende: Amputationsschlag häufiger (75 % statt 25 % in dieser Vorführung).</li>
<li><em>Abstechen genau an der Stelle:</em> Die Stelle (Kopf, Hals, Brust, Bauch, Arm, Bein) wird schon beim Ausholen gewählt. Der Angreifer geht während des Ausholens neben diese Stelle (etwas hinter den Liegenden), so dass er sie mit seiner Waffe erreicht, und haut senkrecht von oben hinein (Stichwaffen genau senkrecht, Hiebwaffen steil). Die Waffe bleibt kurz unten stecken. Treffer, Blut und Nahaufnahme sitzen an derselben Stelle.</li>
<li><em>Durchstich-Chance (je Stich, der trifft):</em> ${(()=>{const P=G.P,B=G.PIERCE_BASE||{},row=(id,n)=>`${n} ${[0,12.9,19.8,34.5].map(a=>(Math.max(.001,B[id]*P.pierceRate*G.armorF(a,P.pierceArmor,15))*100).toFixed(1).replace('.',',')+' %').join(' / ')}`;return [row('spear','Speer'),row('trident','Dreizack'),row('gladius','Gladius/Dolch/Kurzschwert'),row('long','Langschwert')].join(' · ');})()} – ohne Rüstung / Leder (Güte 2) / Metall (Güte 2) / Metall (Güte 4) an der Brust, Fertigkeit „Durchstich“ 50, Schaden 15. Fertigkeit wirkt ×0,3 (0) bis ×1,7 (100), mehr Wucht bis ×1,6, Glieder und Hals ×1,25, von hinten im Lauf ×${G.P.pierceBack}. Rüstung der getroffenen Stelle wirkt stark: e^(−Schutz/k), k = ${G.P.pierceArmor}·(1+Schaden/30) – wuchtige Treffer kommen eher durch.</li>
<li><em>Sonderattacken (einzeln erlernbar):</em> ${Object.entries(G.SPECIALS||{}).map(([k,S])=>`<b>${S.name}</b> (${S.ws.map(WN).join(', ')}; ${S.techs.map(t=>({thrust:'Stich',slash:'Hieb',overhead:'Überkopf',spin:'Drehschlag',charge:'Ansturm'})[t]||t).join('/')} gegen ${S.parts.map(p=>M.partName(p)).join('/')}${S.rear?', nur von hinten':''}; Grundwert ${(S.base*100).toFixed(1).replace('.',',')} %, Rüstung ${S.arm<12?'stark':'mäßig'})`).join(' · ')}. Jede ist ein eigenes Kampfmanöver mit Ist/Soll, wächst nur durch passende Treffer, wird nicht gewählt, sondern ergibt sich aus dem Treffer. Chance = Grundwert × Fertigkeit (×0,3–1,7) × Wucht × Rüstung der Stelle; jede Verletzung höchstens einmal je Stelle. Abgestimmt mit der Testreihe unten: zusammen etwa jeder 7. Kampf eine Sonderattacke, dazu Durchstiche; Herzstich und Genickbruch sehr selten.</li>
<li><em>Von hinten im Lauf:</em> Wer im Lauf (Sprint, Ansturm, Initiative auf einen zugedrehten Rücken) von hinten trifft, macht Schaden ×${G.P.backDmg.toFixed(1).replace('.',',')} und bekommt eine Sonderattacke: Stichwaffen stechen durch den Rücken (dreifache Durchstich-Chance, Rüstung zählt); Dolch, Kurzschwert, Gladius packen von hinten (${Math.round(G.P.backGrab*100)} %) und schneiden die Kehle durch (nicht durch einen Halsschutz) oder stechen in die Niere; Starke packen manchmal im Würgegriff und brechen das Genick; Keulen schlagen auf den Hinterkopf (Schädelbruch möglich, oft umgeworfen); Äxte und große Schwerter hacken in den Rücken (oft umgeworfen).</li>
<li><em>Alle Waffen im Editor:</em> Bogen, Armbrust, Wurfspeer und Wurfaxt sind bei allen passenden Verletzungen wählbar. Das Geschoss fliegt sichtbar, bleibt auf der kleinen Figur stecken (Pfeil, Bolzen, Wurfspeer, Wurfaxt) und erscheint in der Nahaufnahme. Pfeil und Bolzen gehen nur durch Arme, Beine und Hals ganz durch.</li>
<li><span class="warn">Regeländerung, von Thomas am 09.11. freigegeben und im Spiel eingeschaltet:</span> Anlaufen, Kampfschritt, Ansturm (Schaden ×1,5, Umrennen), Durchstich, Abstechen am Boden und Angriffe von hinten (Schaden ×1,6) gelten jetzt auch in echten Kämpfen. Abschaltbar in den Einstellungen („Natürliche Kampfbewegungen“).</li>
<li><em>Im Spiel eingeschaltet (09.11.):</em> <code>gangarten.js</code> lädt im Spiel; an/aus über die Einstellung „Natürliche Kampfbewegungen“ (Standard an). Wunden aus dem echten Kampf erscheinen auf der Figur, heilen über die Tage (frisch → Schorf → Narbe) und bleiben gespeichert. Speer und Dreizack einhändig wie im Spiel. Die Massenfiguren großer Schlachten bekommen nur die Armhaltung, nicht den Schritt.</li></ul>`;


// ---------------------------------------------------------------- Testreihe Sonderattacken (testreihe.js)
// Viele echte Kämpfe mit spielgleichen Gladiatoren (wie die Schulen im Spiel) je Stärke und Rüstung; zählt Durchstiche und Sonderattacken.
var trBusy=false;{const TR=M.testreihe,KEYS=['pierce',...Object.keys(G.SPECIALS||{})],NM=k=>k==='pierce'?'Durchstich':G.SPECIALS[k].name;
 $('trTiers').innerHTML=TR.TIERS.map(t=>`<label class="chk"><input type="checkbox" value="${t.id}" checked> ${t.name} (Schulstärke ${t.mean}, Güte ${TR.qualityOf(t.mean)})</label>`).join('');
 $('trArm').innerHTML=TR.ARMORS.map(a=>`<label class="chk"><input type="checkbox" value="${a.id}" checked> ${a.name}</label>`).join('');
 $('trW').innerHTML=`<option value="game">wie die Schulen im Spiel (Gladius, Speer, Streitkolben, Hammer, Kurzschwert, Axt)</option><option value="all">alle Nahkampfwaffen gemischt</option>`+TR.MELEE().map(id=>`<option value="${id}">nur ${WN(id)}</option>`).join('');
 // Zielbereich je Kampf (beide Kämpfer zusammen, über alle Rüstungen): so oft soll es vorkommen
 const AIM={pierce:[.08,.25],heartStab:[.002,.01],lungStab:[.008,.035],organStab:[.008,.035],gutting:[.008,.035],ribBreaker:[.015,.06],pelvisBreaker:[.004,.02],throatBlow:[.008,.035],collarBreaker:[.006,.03],neckBreaker:[0,.01]};
 const fmt=x=>x>=.995?x.toFixed(1).replace('.',','):x.toFixed(3).replace('.',','),one=x=>x>0?'1 in '+Math.round(1/x).toLocaleString('de-DE'):'–';
 let job=null;
 function show(res,done){const tot=res.reduce((n,r)=>n+r.fights,0);if(!tot)return;const sum=(k,f)=>res.reduce((n,r)=>n+f(r,k),0),exp=k=>sum(k,(r,k)=>r.exp[k]||0)/tot,real=k=>sum(k,(r,k)=>k==='pierce'?r.pierce:r.specials[k]||0);
  const cols=res.filter(r=>r.fights);
  let h=`<tr><th>Attacke</th><th>gesamt je Kampf</th><th>also</th><th>Ziel</th><th>gezählt</th><th>passende Treffer je Kampf</th>${cols.map(r=>`<th>${r.tier.name}<br>${TR.ARMORS.find(a=>a.id===r.armor).name}</th>`).join('')}</tr>`;
  for(const k of KEYS){const e=exp(k),A=AIM[k]||[0,1],ok=e>=A[0]&&e<=A[1];
   h+=`<tr><td><b>${NM(k)}</b></td><td style="color:${ok?'#7fd07f':'#ff8a5a'}">${fmt(e)}</td><td>${one(e)} Kämpfen</td><td>${fmt(A[0])}–${fmt(A[1])}</td><td>${real(k)}</td><td>${(sum(k,(r,k)=>r.elig[k]||0)/tot).toFixed(1).replace('.',',')}</td>${cols.map(r=>`<td>${fmt((r.exp[k]||0)/r.fights)}</td>`).join('')}</tr>`;}
  const all=KEYS.reduce((n,k)=>n+exp(k),0);
  h+=`<tr><td><b>alle zusammen</b></td><td><b>${fmt(all)}</b></td><td>${one(all)} Kämpfen</td><td></td><td>${KEYS.reduce((n,k)=>n+real(k),0)}</td><td></td>${cols.map(r=>`<td>${fmt(KEYS.reduce((n,k)=>n+(r.exp[k]||0),0)/r.fights)}</td>`).join('')}</tr>`;
  h+=`<tr><td>Kampfdauer (s) / Treffer</td><td colspan="5"></td>${cols.map(r=>`<td>${Math.round(r.time/r.fights)} / ${Math.round(r.hits/r.fights)}</td>`).join('')}</tr>`;
  h+=`<tr><td>Tote durch Sonderattacken</td><td colspan="5"></td>${cols.map(r=>`<td>${r.deaths}</td>`).join('')}</tr>`;
  $('trTbl').innerHTML=h;$('trInfo').textContent=`${tot} Kämpfe${done?'':' … läuft'} · Werte = erwartete Anzahl je Kampf (Summe der Chancen aller passenden Treffer, ruhiger als das Zählen), „gezählt“ = wirklich eingetreten.`;}
 $('trRun').onclick=()=>{if(job){job.stop();job=null;trBusy=false;$('trRun').textContent='▶ Testreihe starten';restart();return;}
  const tiers=[...$('trTiers').querySelectorAll('input:checked')].map(i=>i.value),armors=[...$('trArm').querySelectorAll('input:checked')].map(i=>i.value);if(!tiers.length||!armors.length)return;
  trBusy=true;if(S.battle){try{M.endBenchmark(-1,'Test');}catch{}}liveShot=null;$('trRun').textContent='■ Abbrechen';$('trBar').style.width='0%';
  job=TR.run({tiers,armors,fights:+$('trN').value,weapons:$('trW').value,seed:+$('trSeed').value||1,budget:60},(f,res)=>{$('trBar').style.width=Math.round(f*100)+'%';show(res,false);},res=>{show(res,true);job=null;trBusy=false;$('trRun').textContent='▶ Testreihe starten';restart();});};}
sync();restart();requestAnimationFrame(tick);
window.GangEditor={G,restart,fighters:()=>fighters,shotFor:o=>shotFor(o),scene:()=>scene};
})();
