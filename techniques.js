'use strict';
(()=>{const M=window.MG;let preview=null;
function startTechniquePreview(canvas,g,key){if(!canvas||!M.moveNames[key])return;const copy=JSON.parse(JSON.stringify(g));copy.enemyGear={weapon:JSON.parse(JSON.stringify(M.gear(g,'weapon')||null)),secondary:JSON.parse(JSON.stringify(M.gear(g,'secondary')||null)),shield:JSON.parse(JSON.stringify(M.gear(g,'shield')||null)),armor:Object.fromEntries(M.armorItems(g).map(i=>[i.def,JSON.parse(JSON.stringify(i))]))};const melee=[copy.enemyGear.secondary,copy.enemyGear.weapon].find(i=>i&&!M.definition(i).ammo);copy.enemyGear.weapon=melee||null;copy.enemyGear.secondary=null;let farmer=null;if(['rearFinish','groundFinish','pierce','sand'].includes(key)){farmer=JSON.parse(JSON.stringify(copy));farmer.id='preview-farmer';farmer.name=key==='groundFinish'?'Trainingspartner':'Bauer';farmer.age=35;farmer.height=175;farmer.weight=72;farmer.fame=0;farmer.dead=false;farmer.bisected=false;farmer.fatigue=0;farmer.blood=100;farmer.scars=[];farmer.appearance={...farmer.appearance,cloth:'#8c7955',style:1,beard:2};farmer.equipment={weapon:null,secondary:null,shield:null,armor:{}};farmer.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};for(const part of Object.values(farmer.body)){Object.assign(part,{hp:100,pain:0,bleed:0,missing:false,fracture:null,internal:null,wounds:[]});}}const skill=g.moves[key]||0;const combo=key==='combo'?[]:null;if(combo){const length=2+Math.floor(Math.random()*3);for(let n=0;n<length;n++){const pool=['slash','thrust','overhead','spin'].filter(k=>k!==combo[n-1]);combo.push(pool[Math.floor(Math.random()*pool.length)]);}}preview={canvas,g:copy,farmer,key,combo,t:0,speed:M.combatStepRate||1.12,done:false};tick(0);}
function tick(dt){const p=preview;if(!p||p.canvas.isConnected===false)return;if(p.done)return;p.t+=Math.min(dt,.05)*p.speed;const t=p.t,a={g:p.g,x:230,y:218,a:0,team:0,phase:t*10,animationClock:t,worldMotion:true,energy:100,ammo:0,state:'idle',moveSpeed:0},dummy=p.farmer?{g:p.farmer,x:316,y:218,a:0,team:1,energy:100,state:'idle',phase:0,moveSpeed:0}:{x:316,y:218};let contact=0,endTime=2.5;const timing=M.meleeTiming(p.g,M.weapon(a),p.key),windStart=.12,strikeStart=windStart+timing.wind,strikeEnd=strikeStart+timing.swing;
const swing=M.clamp((t-strikeStart)/timing.swing,0,1),active=t>=strikeStart&&t<strikeEnd;
if(p.key==='groundFinish'){
 a.previewVictim=dummy;a.x=285;dummy.x=340;dummy.down=true;dummy.state='down';dummy.fallSide=-1;dummy.energy=20;a.technique='groundFinish';a.contactPoint=M.contactAnchor(dummy,'chest');
 if(t>=windStart&&t<strikeStart){a.windMax=timing.wind;a.wind=strikeStart-t;}
 if(active){a.swingKind='groundFinish';a.swingMax=timing.swing;a.swing=strikeEnd-t;contact=swing>.55?(swing-.55)/.45:0;}endTime=strikeEnd+.5;
}
else if(p.key==='pierce'){
 const timing=M.meleeTiming(p.g,M.weapon(a),'thrust'),start=windStart+timing.wind,contactAt=start+timing.swing*.55;
 a.x=270;a.previewVictim=dummy;a.technique='thrust';a.contactPoint=M.contactAnchor(dummy,'chest');
 if(t>=windStart&&t<start){a.windMax=timing.wind;a.wind=start-t;}
 if(t>=start&&t<start+timing.swing){a.swingKind='thrust';a.swingMax=timing.swing;a.swing=start+timing.swing-t;}
 if(t>=contactAt&&t<contactAt+.5){a.pierceContact={target:dummy.g.id,part:'chest',left:contactAt+.5-t};a.swing=0;contact=1;}endTime=contactAt+.9;
}
else if(p.key==='combo'){
 let begin=windStart;for(let i=0;i<p.combo.length;i++){
  const kind=p.combo[i],timing=M.meleeTiming(p.g,M.weapon(a),kind),wind=timing.wind*(i?.6:1),end=begin+wind+timing.swing;
  if(t>=begin&&t<end){a.technique=kind;if(t<begin+wind){a.windMax=wind;a.wind=begin+wind-t;}else{a.swingKind=kind;a.swingMax=timing.swing;a.swing=end-t;contact=(t-begin-wind)/timing.swing>.55?1:0;}}
  begin=end+.06;
 }dummy.x=a.x+M.clamp((M.weapon(a).range+15)*.75,42,90);a.contactPoint={x:dummy.x,y:dummy.y-48};a.previewCombo=p.combo.length;endTime=begin+.4;
}
else if(['slash','overhead','thrust','spin'].includes(p.key)){
 a.technique=p.key;dummy.x=a.x+M.clamp((M.weapon(a).range+15)*.75,42,90);a.contactPoint={x:dummy.x,y:dummy.y-48};if(t>=windStart&&t<strikeStart){a.windMax=timing.wind;a.wind=strikeStart-t;}
 if(active){a.swingKind=p.key;a.swingMax=timing.swing;a.swing=strikeEnd-t;a.x+=p.key==='thrust'?Math.sin(swing*Math.PI)*14:0;contact=swing>.55?(swing-.55)/.45:0;}endTime=strikeEnd+.4;
}
else if(p.key==='shieldBash'||p.key==='kick'){
 const shield=p.key==='shieldBash';a.x+=shield?16:12;dummy.x=a.x+42;a.technique=p.key;
 if(t>=windStart&&t<strikeStart){a.windMax=timing.wind;a.wind=strikeStart-t;}
 if(active){if(shield)a.shieldBashTimer=timing.swing*(1-swing);else a.kickTimer=timing.swing*(1-swing);a.state=shield?'shieldbash':'kick';contact=swing>.5?(swing-.5)*2:0;}endTime=strikeEnd+.4;
}
else if(p.key==='charge'){a.x=160+M.clamp((t-.3)/.85,0,1)*90;if(t>.3&&t<1.15){a.state='charge';a.moveSpeed=90/.85;a.gaitStride=M.walkStride(a.g,a.moveSpeed);a.phase=(a.x-160)*Math.PI*2/a.gaitStride;a.gaitForward=1;a.gaitDepth=0;}if(t>=1.15&&t<1.65){a.swingKind='overhead';a.swingMax=.5;a.swing=1.65-t;contact=t>1.42?(t-1.42)*4:0;}}
else if(p.key==='sand'){const swing=M.clamp((t-.12)/.62,0,1),active=t>=.12&&t<.74;if(active){a.sandKick=.62*(1-swing);a.state='sandkick';a.previewSand=swing;contact=swing>.5?(swing-.5)*2:0;}if(t>.44&&t<1.65){dummy.wipeTimer=1.65-t;dummy.blindTimer=1.65-t;dummy.state='wipe';}}
else if(p.key==='backstep'){const swing=M.clamp((t-.12)/.26,0,1),active=t>=.12&&t<.38;if(active){a.jumpTimer=.26*(1-swing);a.x-=swing*48;a.state='backstep';}}
else if(p.key==='dodge'){const swing=M.clamp((t-.12)/.22,0,1),active=t>=.12&&t<.34;if(active){a.dodgeTimer=.22*(1-swing);a.y+=Math.sin(swing*Math.PI)*23;a.x-=Math.sin(swing*Math.PI)*14;}}
else if(p.key==='recover'){if(t>.5&&t<1.25){a.stagger=(1.25-t)*.7;a.hit=.12;a.state='stagger';}}
else if(p.key==='rise'){a.fallSide=-1;if(t<.8){a.state='fallen';a.fallTimer=2;a.fallDuration=2.5;}else if(t<2.15){a.state='rising';a.riseDuration=1.35;a.fallTimer=2.15-t;a.fallDuration=2.6;}}
else if(p.key==='rearFinish'){
a.x=296;a.y=221;dummy.x=316;
const gripStart=.5,contactTime=gripStart+.85;
if(t>=gripStart&&t<contactTime){a.state='reargrab';dummy.state='grabbed';a.rearFinish={target:'dummy',left:contactTime-t};a.previewVictim=dummy;}
if(t>=contactTime&&p.farmer){const elapsed=t-contactTime,pose=M.rearFollowPose(elapsed);dummy.finishReaction=elapsed;dummy.down=true;dummy.fallSide=-1;dummy.x+=pose.slide;
if(elapsed<.7){a.state='finishpush';a.finishPush={elapsed};a.postKickPose=M.limb(a.g,['rt','rsh','rf'])>.45?pose.kick:0;}
}
}
M.renderTechnique(p.canvas,a,dummy,contact);if(t>(p.key==='rearFinish'?2.9:endTime))p.done=true;}
Object.assign(M,{startTechniquePreview,stopTechniquePreview:()=>preview=null,previewTick:tick});})();
