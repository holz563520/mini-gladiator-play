'use strict';
// =====================================================================================================
// GANG-EDITOR (gang-editor.html): echte Figuren (sim.js + arena.js über den Benchmark, isolierte Kopie,
// kein Speichern) mit eingeschaltetem gangarten.js. Nur diese Seite setzt M.gait.active = true.
// Vorführung: zwei gesteuerte Figuren (a.puppet) – oben neu, unten bisher – plus ein stehender Gegner.
// Echter Kampf: 1 gegen 1 mit der Spiel-KI, die Gangarten wählt das Modul.
// =====================================================================================================
(()=>{
const M=window.MG,S=M.s,G=M.gait,$=id=>document.getElementById(id),cl=(x,a,b)=>Math.max(a,Math.min(b,x));
const MELEE=M.weaponDefs.filter(w=>!w.ammo&&w.id!=='net'),WD=Object.fromEntries(M.weaponDefs.map(w=>[w.id,w])),SH=M.shieldDefs;
G.active=true;M.benchmarkTimeLimit=1e9;const CHARGE0=M.T.chargeRate,T0={...M.T},RAM0=G.P.ramCharge,RUN0=G.P.ramRun;
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
let mode='show';
const ATKS=[['pierce','Stich mit Durchstich'],['slash','Hieb im Lauf'],['thrust','Stich im Lauf'],['overhead','Überkopf im Lauf'],['spin','Wirbel im Lauf'],['charge','Ansturm (Soldat)'],['ground','Abstechen am Boden'],['knee','Gegner auf den Knien'],['stagger','Gegner taumelt']];const SITU=new Set(['ground','knee','stagger']);let atkI=0,atkAll=true,atkT=0,atkHit=0;
$('atks').innerHTML=`<button data-a="all"><i style="background:linear-gradient(90deg,#dfb66d,#e0703f,#ff4a3a)"></i>Alle nacheinander</button>`+ATKS.map(([k,n],i)=>`<button data-a="${i}"><i style="background:${k==='charge'?'#ff4a3a':SITU.has(k)?'#c23b3b':'#e0703f'}"></i>${n}</button>`).join('');
function markAtk(){for(const b of $('atks').children)b.classList.toggle('on',atkAll?b.dataset.a==='all':b.dataset.a===String(atkI));}
$('atks').onclick=e=>{const b=e.target.closest('button');if(!b)return;atkAll=b.dataset.a==='all';atkI=atkAll?0:+b.dataset.a;markAtk();if(mode==='atk')stage();};markAtk();
$('mAtk').onclick=()=>{mode='atk';restart();};$('aAgain').onclick=()=>stage();
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
function restart(){if(S.battle){try{M.endBenchmark(-1,'Test');}catch{}}G.P.sprintGap=G.DEF.sprintGap;sync();hist=[];params();cnt={cry:0,charge:0,runAttack:0,ram:0,shove:0,block:0,bind:0,seize:0,finisher:0,pierce:0};$('evlog').innerHTML='';
 $('mShow').classList.toggle('on',mode==='show');$('mFight').classList.toggle('on',mode==='fight');$('mAtk').classList.toggle('on',mode==='atk');$('pAtk').style.display=mode==='atk'?'':'none';
 $('pShow').style.display=mode==='show'?'':'none';$('pFight').style.display=mode==='fight'?'':'none';$('pEv').style.display=mode!=='show'?'':'none';
 const show=mode==='show',atk=mode==='atk',cfg={count:1,count0:show?2:1,count1:1,role0:'Soldat',role1:'Soldat',weapon0:$('w0').value,weapon1:show||atk?'gladius':$('w1').value,shield0:$('s0').value,shield1:atk?($('aShield').checked?'roundshield':'none'):show?'none':$('s1').value,armor0:$('a0').value,armor1:show?'none':'leather',quality0:2,quality1:2,seed:show?4242:Math.floor(Math.random()*1e6)};
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
 const done=atkHit&&atkT-atkHit>(q.fallTimer>0||q.down||q.g.dead?3.6:1.8)||atkT>(SITU.has(ATKS[atkI][0])?7:9);
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
 $('hud').style.visibility=liveShot?'hidden':'';
 if(liveShot){const t=(performance.now()-liveT0)/1000*Math.max(.5,+$('speed').value);if(t>liveShot.dur){liveShot=null;if(livePaused&&S.battle){S.battle.paused=false;}livePaused=false;}else{M.pierceFx.draw(lx,lab.width,lab.height,liveShot,t,{names:true});return;}}
 const b=S.battle;if(!b||!V)return;
 const fs=Math.max(11,Math.round(lab.width/70));lx.font=`700 ${fs}px "Courier Prime",monospace`;lx.textAlign='center';
 for(const a of fighters){if(!a||a.g.dead||mode==='atk'&&a!==fighters[0])continue;const sx=(a.x-V.cx)*V.scale+V.width/2,sy=(a.y-V.cy)*V.scale+V.height/2-a.g.height/180*1.14*84*V.scale;const m=gaitOf(a),old=a.gaitOff;
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
 const [p,q]=fighters;if(mode==='atk')return;$('hudL').innerHTML=mode==='show'?'<b>oben</b> neu · <b>unten</b> bisher':`<b>links</b> ${WD[M.weapon(p).id]?.name||''}`;$('hudR').innerHTML=mode==='show'?'':`${WD[M.weapon(q).id]?.name||''} <b>rechts</b>`;}
function table(){const a=fighters[0];if(!a)return;const ef=M.effective(a),base=ef.speed,P=G.P;
 const rows=[['walk','Gehen','außerhalb des Kampfes, erschöpft, verletzt','cWalk'],['guard','Kampfschritt','die letzten Schritte zum Gegner, Waffe und Schild vorn','cGuard'],['jog','Laufen','mittlerer Abstand (bisheriges Tempo)','cJog'],['sprint','Sprinten','großer Abstand, Verfolgen; kostet Ausdauer, braucht Anlauf','cSprint'],['side','Seitschritt','Umkreisen, Deckung oben, Füße setzen bei','cSide'],['back','Rückwärts','Zurückweichen mit Blick zum Gegner (weiter weg: '+Math.round(P.backFar*100)+' %)','cBack']];
 $('tbl').innerHTML='<tr><th>Gangart</th><th>Tempo</th><th>Anteil</th><th>bisher</th><th>Rhythmus</th><th>wann</th></tr>'+rows.map(([k,n,w,c])=>`<tr><td style="color:${G.color(k)}">${n}</td><td>${Math.round(base*P[k])}</td><td>${Math.round(P[k]*100)} %</td><td>${Math.round(base*({walk:1,guard:.63,jog:1,sprint:1.45,side:.5,back:1})[k])}</td><td>${(P[c]*2).toFixed(1).replace('.',',')} Schritte/s</td><td>${w}</td></tr>`).join('')+
 `<tr><td>Anlaufen</td><td colspan="5">aus dem Stand bis Laufen ${(1/(P.acc*.95/base)).toFixed(2).replace('.',',')} s, weiter bis Sprint ${(base*(P.sprint-1)/(P.acc*.95*P.accSprint)).toFixed(2).replace('.',',')} s · Bremsen aus dem Sprint ${(base*P.sprint/(P.acc*.95*P.dec)).toFixed(2).replace('.',',')} s · bisher sofort</td></tr>`;}

// ---------------------------------------------------------------- Ereignisse (Kampfschrei, Ansturm, Angriff im Lauf, Umrennen)
let cnt={cry:0,charge:0,runAttack:0,ram:0,shove:0,block:0,bind:0,seize:0,finisher:0,pierce:0};let slowUntil=0,closeUp=null,liveShot=null,liveT0=0,livePaused=false,cntShots=1;
// Nahaufnahme beim Abstechen (im Spiel macht das die Kinokamera; der Benchmark schaltet sie ab)
function camera(base){return (bb,width,height,W,H,zoom,target)=>{const now=performance.now();if(closeUp&&now<closeUp.until){const k=Math.min(1,(closeUp.until-now)/400,(now-(closeUp.until-2600))/250),b0=base?.(bb,width,height,W,H,zoom,target)||{zoom:Math.max(1,zoom),x:target?.x??W/2,y:target?.y??H/2},z=b0.zoom+(3.6-b0.zoom)*k;return {zoom:z,x:cl(b0.x+(closeUp.x-b0.x)*k,W/(z*2),W-W/(z*2)),y:cl(b0.y+(closeUp.y-b0.y)*k,H/(z*2),H-H/(z*2))};}return base?.(bb,width,height,W,H,zoom,target)||null;};}const TN={slash:'Hieb',thrust:'Stich',overhead:'Überkopf',spin:'Wirbel'};
const who=a=>a?.team?'Gegner':'Kämpfer';
const WK={ground:'am Boden',knee:'auf den Knien',stagger:'taumelt',back:'dreht den Rücken zu'},WH={pierced:'durchbohrt',beheaded:'schlägt den Kopf ab',severed:'schlägt ab',pierced:'durchbohrt',hacked:'hackt hinein',crushed:'zerschmettert'};
G.onEvent=e=>{if((e.kind==='pierce'||e.kind==='finisher'&&(e.what==='pierced'||e.what==='crushed'))&&$('cu').checked&&M.pierceFx&&S.battle){liveShot=M.pierceFx.make({part:e.part,weapon:e.weapon||M.weapon(e.a).id,down:!!e.down,kind:e.what==='crushed'?'crush':'pierce',def:e.b.g,attName:e.a.g.name,defName:e.b.g.name,seed:(cntShots++)*7919+e.part.length});liveT0=performance.now();if(!S.battle.paused){S.battle.paused=true;livePaused=true;}}
 if(e.kind==='finisher'&&!$('cu').checked){if($('aSlow').checked)slowUntil=performance.now()+1300;closeUp={x:e.b.x,y:e.b.y-20,until:performance.now()+2600};}if(!(e.kind in cnt))return;cnt[e.kind]++;const pct=x=>Math.round(x*100)+' %';
 const t={cry:`<b>Kampfschrei</b> · ${who(e.a)} stürmt mit erhobener Waffe los`,charge:`<b>Ansturm</b> · ${who(e.a)} · Schaden ×${e.boost?.toFixed(2).replace('.',',')}`,
  runAttack:`<b>Ausholen im Lauf</b> · ${who(e.a)} · ${TN[e.tech]||e.tech} bei Tempo ${Math.round(e.v)} · Schaden ×${e.boost?.toFixed(2).replace('.',',')}`,
  ram:`<b style="color:#ff8a5a">Umgerannt</b> · ${who(e.a)} rennt ${who(e.b)} um (Chance ${pct(e.chance)})`,pierce:`<b style="color:#ff5a4a">Durchstich</b> · ${who(e.a)} sticht ${who(e.b)} durch (${M.partName?.(e.part)||e.part}, Schaden ${Math.round(e.dmg)})`,seize:`<b>Initiative</b> · ${who(e.b)} ${WK[e.why]} – ${who(e.a)} stürzt sofort darauf zu`,finisher:`<b style="color:#ff5a4a">Abgestochen</b> · ${who(e.a)} ${WH[e.what]} (${M.partName?.(e.part)||e.part}, Schaden ${Math.round(e.dmg)})`,shove:`<b>Zurückgestoßen</b> · ${who(e.b)} bleibt stehen (Umrenn-Chance war ${pct(e.chance)})`}[e.kind];
 const d=document.createElement('div');d.className='row';d.innerHTML=t;$('evlog').prepend(d);while($('evlog').children.length>12)$('evlog').lastChild.remove();};
const BC=M.blockContact;if(BC){BC.labels=false;const ON={clean:'Sauber geblockt',glance:'Abgeglitten',bind:'Kraftprobe',broken:'Deckung durchschlagen'};
 BC.onEvent=e=>{let t='';if(e.kind==='block'){cnt.block++;t=`<b>${ON[e.outcome]||'Geblockt'}</b> · ${who(e.def)} wehrt mit ${e.shield?'Schild':'der Waffe'} ab`;}
  else if(e.kind==='bindStart'){cnt.bind++;t=`<b>Kraftprobe</b> · Klinge an Klinge, ${who(e.winner)} drückt weg`;}else return;
  const d=document.createElement('div');d.className='row';d.innerHTML=t;$('evlog').prepend(d);while($('evlog').children.length>12)$('evlog').lastChild.remove();};}
function counts(){$('counts').innerHTML=`<div class="row"><span>Kampfschreie</span><b>${cnt.cry}</b></div><div class="row"><span>Ansturm</span><b>${cnt.charge}</b></div><div class="row"><span>Ausholen im Lauf</span><b>${cnt.runAttack}</b></div><div class="row"><span>Umgerannt / zurückgestoßen</span><b>${cnt.ram} / ${cnt.shove}</b></div><div class="row"><span>Durchstiche</span><b>${cnt.pierce}</b></div><div class="row"><span>Initiative genutzt / abgestochen</span><b>${cnt.seize} / ${cnt.finisher}</b></div><div class="row"><span>Geblockt / Kraftproben</span><b>${cnt.block} / ${cnt.bind}</b></div>`;}

// ---------------------------------------------------------------- Galerie der Nahaufnahmen
const GAL=[['chest','Brust'],['belly','Bauch'],['head','Kopf'],['neck','Hals'],['ls','Schulter'],['rua','Oberarm'],['lfa','Unterarm'],['rh','Hand'],['lt','Oberschenkel'],['rsh','Unterschenkel'],['lf','Fuß'],['crush','Schädel zertrümmert'],['all','Alle nacheinander']];
fill($('gW'),MELEE);$('gW').value='spear';
$('galParts').innerHTML=GAL.map(([k,n])=>`<button data-p="${k}">${n}</button>`).join('');
let galShot=null,galT0=0,galAll=-1,galSeed=1;const gcv=$('galCv'),gcx=gcv.getContext('2d');
// Rüstungswahl der Galerie nur für die Darstellung: Kopie des Gegners mit Merker __armor
const armorItems0=M.armorItems;M.armorItems=g=>g&&g.__armor!==undefined?(g.__armor==='none'?[]:[{material:g.__armor,def:'x'}]):armorItems0(g);
function galDef(){const src=(fighters[1]||fighters[0])?.g;const g=src?JSON.parse(JSON.stringify(src)):{appearance:{}};g.__armor=$('gA').value;return g;}
function galPlay(k){const w=$('gW').value,down=$('gDown').value==='1',crushK=k==='crush';
 galShot=M.pierceFx.make({part:crushK?'head':k,weapon:crushK&&M.pierceFx.WTYPE(w)!=='blunt'?'mace':w,down:crushK?true:down,kind:crushK?'crush':'pierce',def:galDef(),seed:galSeed++*7919+k.length*31});galT0=performance.now();
 for(const b of $('galParts').children)b.classList.toggle('on',b.dataset.p===(galAll>=0?'all':k));}
$('galParts').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.p==='all'){galAll=0;galPlay(GAL[0][0]);}else{galAll=-1;galPlay(b.dataset.p);}};
for(const id of ['gW','gDown','gA'])$(id).onchange=()=>{if(galShot)galPlay(galAll>=0?GAL[galAll][0]:galShot.kind==='crush'?'crush':galShot.part);};
function gallery(){if(!galShot){gcx.fillStyle='#000';gcx.fillRect(0,0,gcv.width,gcv.height);gcx.fillStyle='#97aaa8';gcx.font='16px "Courier Prime",monospace';gcx.textAlign='center';gcx.fillText('Stelle wählen ▸',gcv.width/2,gcv.height/2);return;}
 const t=(performance.now()-galT0)/1000;if(t>galShot.dur+.4){if(galAll>=0){galAll++;if(galAll>=GAL.length-1)galAll=0;galPlay(GAL[galAll][0]);}else galT0=performance.now();return;}
 M.pierceFx.draw(gcx,gcv.width,gcv.height,galShot,Math.min(t,galShot.dur-.01),{});}

// ---------------------------------------------------------------- Schleife
let last=performance.now();
function tick(){const t=performance.now(),dt=Math.min(.1,(t-last)/1000);last=t;const b=S.battle;
 if(b&&!b.paused)S.options.speed=t<slowUntil?Math.min(+$('speed').value,.22):+$('speed').value;
 if(mode==='show')steerShow(dt);
 else if(mode==='atk')stepAtk(dt);
 else if(mode==='fight'&&b&&(b.result||b.finale||b.actors.some(a=>a.down||a.g.dead)||t-startedAt>40000)){if(!b.ended){b.ended=true;setTimeout(restart,1800);}}
 sample();labels();graph();live();counts();gallery();requestAnimationFrame(tick);}

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
<li><span class="warn">Regeländerung, nicht freigegeben:</span> Im Kampf ändert das Anlaufen und der langsamere Kampfschritt das Tempo, mit dem die Gegner aufeinander zukommen. Im Spiel ist noch nichts eingeschaltet: <code>gangarten.js</code> wird nur hier geladen, die Haken in <code>sim.js</code> und <code>arena.js</code> tun ohne das Modul nichts.</li>
<li><em>Noch offen:</em> Zum Einschalten <code>gangarten.js</code> in die Ladereihenfolge aufnehmen und <code>M.gait.active</code> setzen; die Massenfiguren großer Schlachten bekommen bisher nur die Armhaltung, nicht den Schritt. Danach als Folgeschritte: neue Verletzungsarten, Durchstich, filmische Einblendungen.</li></ul>`;

sync();restart();requestAnimationFrame(tick);
window.GangEditor={G,restart,fighters:()=>fighters};
})();
