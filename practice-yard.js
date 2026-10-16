'use strict';
// Cosmetic sparring. Only detached display figures move; never run hit(), learn(),
// fixedStep(), an arena battle, or any injury/equipment transaction here.
(()=>{
const M=window.MG,S=M.s,cl=M.clamp;
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
const lines={
 welcome:['Holz statt Stahl. Heute stirbt höchstens mein Ruf.','Der Medicus hat frei. Enttäuscht ihn nicht mit Kundschaft.','Wer umfällt, wischt danach den Hof. Das nennt sich Bodenpflege.','Endlich eine Waffe aus demselben Material wie dein Kopf.','Übungskampf! Die Erben dürfen wieder nach Hause.','Die Särge bleiben zu. Wir haben nur den Hof gemietet.'],
 reply:['Gut. Mein Testament ist noch voller Rechtschreibfehler.','Ich liege nur Probe. Man muss die Zukunft planen.','Mein Ruf wurde schon gestern ohne Angehörige beerdigt.','Der Medicus verlangt jetzt sogar Eintritt für Gesunde.','Ich habe auf dich gewettet. Gegen meine Lebenserfahrung.'],
 cheer:['Deck den Kopf! Leerstand ist keine Verteidigung!','Los! Zeig ihm, wofür der Totengräber schon angezahlt hat!','Mehr Haltung! Du siehst aus wie ein Nachlass mit Beinen!','Triff ihn! Der Boden bekommt hier schon genug Aufmerksamkeit!','Ich setze zwei Denare auf den Stock. Der hat Talent.','Der Schild ist kein Tablett! Hier serviert keiner Gnade!','Der Medicus hört Holz klappern und weint um seinen Umsatz.','Schlag zu! Sonst setzt der Stock vor Langeweile Wurzeln!','Beeil dich! Ich möchte vor meinem eigenen Begräbnis dran sein.','Saubere Deckung! Fast schade um die vorbestellte Urne.','Du kämpfst wie meine Großmutter. Die ist seit acht Jahren tot.','Ein Schritt zurück ist Taktik. Sechs sind ein Nachsendeauftrag.'],
 block:['Blockiert! Der Sargbauer streicht gerade eine Überstunde.','Gut abgefangen. Ausnahmsweise musste das nicht dein Gesicht übernehmen.','Der Schild hat mehr Überlebenswillen als sein Besitzer.'],
 hit:['Das klang hohl. Wir haben den Kopf gefunden.','Ein Treffer! Schreib das auf, sonst glaubt es keiner.','Der Stock hat gerade eine längere Rede gehalten als dein Trainer.'],
 ko:['Er lebt noch. Streicht die Trauerfeier, behaltet das Buffet.','Nicht tot, nur vorübergehend von seinen Entscheidungen befreit.','So sieht Feierabend aus, wenn ihn jemand anderes genehmigt.','Der Boden gewinnt schon wieder. Vielleicht sollten wir ihn ausrüsten.','Keine Sorge. Sein Stolz liegt schon länger dort.','Endlich Ruhe. Kann der Medicus das als Behandlung abrechnen?','Er prüft die Bodenqualität. Mit allen verfügbaren Gesichtsteilen.','Atmet noch. Die Erben sollen aufhören zu klatschen.'],
 owner:['Ich bezahle euch fürs Kämpfen. Das Umfallen war nicht ausgeschrieben.','Seht genau hin. Diese Lektion kommt ohne Rechnung vom Medicus.','Eine Hand reicht. Die zweite würde euch nur falsche Hoffnungen machen.','Ich führe die Schule. Der Stock führt das Personalgespräch.'],
 ownerKo:['Befördert. Vom Personal zum Bodenbelag.','Eine Beschwerde? Bitte schriftlich, sobald die Buchstaben stillstehen.','So. Jetzt kennt auch dein Hinterkopf die Hausordnung.','Das war kein Schlag. Das war eine Leistungsbeurteilung.'],
 rise:['Da ist er wieder. Die Erbschaft war wohl zu klein.','Willkommen zurück. Dein Ruf hat es leider nicht geschafft.','Aufstehen. Wer liegen bleibt, wird als Inventar gezählt.','Gut geschlafen? Der Weckdienst trägt Holz.']
};
let clock=0,next=3,list=null,roster=null,day=null,bout=null,speech=null,captionOwned=false;
const views=new Map(),lastUsed=new Map(),bags=new Map();let rounds=0,lastOwner=-4;
const events={rounds:0,owner:0,block:0,dodge:0,hit:0,ko:0,rise:0,cheer:0,combo:0,counter:0,techniques:{},steps:0};
const take=kind=>{let b=bags.get(kind);if(!b?.length){b=[...lines[kind]];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}bags.set(kind,b);}return b.pop();};
function busy(){return S.battle||M.ui.getPage()!=='home'||document.hidden||window.ArenaUI?.isOpen?.()||M.sceneLoader?.gate?.()||M.intro?.active?.()||window.ArenaTheoryIntro?.active?.()||M.forgeIntro?.scene||M.forgeVisuals?.scene||M.trader?.tutorial||['pending','scene','tutorial'].includes(M.forgeIntro?.stage?.())||document.getElementById('modal')?.hidden===false||document.querySelector?.('.mg-dawn,.medic-night,.medic-film,.lesson-film,.lion-film,.smith-ceremony,.lesson-start,.medic-start,.hs-market,.hs-present,.hs-village,.lesson-end,.medic-end,.ws-scene');}
function available(a){return !a.hurt&&!a.g.dead&&!a.g.retired&&!a.g.smithDuty&&M.health(a.g)>=75&&a.g.blood>=65&&M.limbState(a.g).canBurst&&!M.ludusHidden?.(a.g);}
function held(a){return M.weapon({...a,closeCombat:true,ammo:0});}
function say(a,kind,seconds=4.2,force=false){if(speech&&!force)return;const text=take(kind);speech={a,text,left:seconds};a.shoutTimer=.5;if(a.practiceSpectator){a.practiceCheer=1.4;events.cheer++;}}
function snapshot(source,spectator=false){
 const g=M.copy(source.g),wood=i=>i?{...M.copy(i),blood:0,trainingWood:true}:null;
 g.enemyGear={weapon:wood(M.gear(source.g,'weapon')),secondary:wood(M.gear(source.g,'secondary')),shield:M.copy(M.gear(source.g,'shield')||null),armor:Object.fromEntries(M.armorItems(source.g).map(i=>[i.def,M.copy(i)]))};
 if(source.lanista){for(const map of [g.stats,g.moves,g.mastery])for(const k in map)map[k]=90;for(const p of Object.values(g.body)){p.strength=p.agility=90;}g.enemyGear.weapon=null;g.enemyGear.secondary={id:'practice-lanista',kind:'weapon',def:'gladius',q:1,durability:110,maxDurability:110,up:{sharp:0,durable:0,balance:0,penetration:0},blood:0,trainingWood:true};}
 if(spectator){g.enemyGear.weapon=g.enemyGear.secondary=g.enemyGear.shield=null;}
 const a={...source,g,practice:true,practiceSpectator:spectator,practiceCheer:0,energy:100,practicePoise:55,practiceChain:0,kickTimer:0,shieldBashTimer:0,closeCombat:true,ammo:0,r:12,state:'idle',phase:source.phase||0,moveSpeed:0,wind:0,swing:0,hit:0,facePain:0,guardTime:0,block:false,kx:0,ky:0,cool:0,stun:0,dodgeTimer:0,shoutTimer:0,down:false,fallTimer:0,fallSide:-1};
 views.set(source,{a,saved:{...source},entry:{x:source.x<445?325:575,y:495},route:[]});
 if(!spectator){const item=held(a).item;if(item&&M.weaponArt?.supports(item.def))M.weaponArt.sprite(item,0,0);}
 return a;
}
function restore(){for(const [source,v]of views){for(const k of Object.keys(source))if(!(k in v.saved))delete source[k];Object.assign(source,v.saved);}views.clear();}
function cancel(){restore();bout=null;speech=null;particles=[];next=clock+3;if(captionOwned){const el=document.getElementById('villageChatter');if(el)el.textContent='Im Hof: Schritte, Stahl und zweifelhafte Lebensweisheiten.';captionOwned=false;}}
function score(a){const s=a.g.stats;return (s.strength+s.reflex+s.agility+s.block+s.experience)/5;}
function move(a,p,dt,speed=42){const x=a.x,y=a.y,phase=a.phase||0;const dx=p.x-a.x,dy=p.y-a.y,d=Math.hypot(dx,dy),step=Math.min(d,speed*dt);a.moveSpeed=d>.5?speed:0;a.state=a.moveSpeed?'move':'idle';if(d>.1){a.x+=dx/d*step;a.y+=dy/d*step;a.a=Math.atan2(dy,dx);M.updateLocomotion(a,x,y,phase,dt,a.lanista?.7:.6);}return d<step+.6;}
function route(v,dt){const p=v.route[0];if(!p){v.a.moveSpeed=0;return true;}if(move(v.a,p,dt))v.route.shift();return !v.route.length;}
function start(){
 const free=list.filter(a=>available(a)&&!a.lanista&&held(a).id!=='fist'&&!M.villageLife?.state.chat?.pair.includes(a)&&M.villageLife?.state.dog.target!==a);
 const owner=list.find(a=>a.lanista&&available(a));
 const withOwner=owner&&free.length&&(free.length===1||rounds-lastOwner>=3&&(Math.random()<.24||rounds-lastOwner>=6));
 if(free.length<2&&!withOwner){next=clock+3;return;}
 // Prefer people who did not just fight. The stable IDs survive scene refreshes.
 const ordered=free.map(a=>({a,n:(lastUsed.get(a.g.id)??-10)+Math.random()*.5})).sort((a,b)=>a.n-b.n).map(v=>v.a);
 const sources=withOwner?[ordered[0],owner]:ordered.slice(0,2),pair=sources.map(a=>snapshot(a));
 const spacing=cl((Math.max(...pair.map(a=>held(a).range))+22)*.68,46,82),slots=[{x:445-spacing/2,y:470},{x:445+spacing/2,y:470}];
 const crowd=[];if(Math.random()<.72){const rest=list.filter(a=>!sources.includes(a)&&available(a)&&!a.lanista&&!a.archer&&!M.villageLife?.state.chat?.pair.includes(a)&&M.villageLife?.state.dog.target!==a);const n=Math.min(rest.length,1+Math.floor(Math.random()*3));for(let i=0;i<n;i++)crowd.push(snapshot(rest[i],true));}
 for(const [source,v]of views){const i=pair.indexOf(v.a),watch=crowd.indexOf(v.a);v.route=[v.entry,i>=0?slots[i]:{x:365+watch*77,y:watch===1?550:524}];}
 const weight=pair.map(a=>Math.max(10,score(a))),winner=withOwner?1:Math.random()<weight[0]/(weight[0]+weight[1])?0:1;
 bout={pair,crowd,sources,slots,owner:!!withOwner,winner,stage:'approach',left:0,round:0,target:withOwner?2:Math.floor(rnd(12,19)),turn:withOwner?0:Math.floor(Math.random()*2),contact:false,reply:false,nextCheer:clock+8};
 rounds++;events.rounds++;if(withOwner){lastOwner=rounds;events.owner++;}for(const a of sources)lastUsed.set(a.g.id,rounds);
}
function face(){const [a,b]=bout.pair;a.a=Math.atan2(b.y-a.y,b.x-a.x);b.a=a.a+Math.PI;}
function stand(a){a.moveSpeed=0;a.wind=a.swing=a.kickTimer=a.shieldBashTimer=0;a.state='idle';a.block=false;}
// Match the arena's melee repertoire and physical prerequisites, using only
// temporary energy and display poses. Never invoke damaging combat actions.
function chooseTechnique(a,w){
 const mobile=M.limbState(a.g).canBurst,choices=a.energy<20?['slash','thrust']:['slash','thrust','thrust','overhead','overhead','spin','spin'];
 if(!mobile)for(let i=choices.length-1;i>=0;i--)if(choices[i]==='spin')choices.splice(i,1);
 if(mobile&&a.energy>22)choices.push('kick');
 if(M.usableShield(a)&&!w.twoHand&&a.energy>22)choices.push('shieldBash');
 const varied=choices.filter(k=>k!==a.lastTechnique),pool=varied.length?varied:choices;
 // Skilled techniques are preferred without excluding an unfamiliar movement.
 const weighted=pool.flatMap(k=>Array(1+Math.floor((a.g.moves[k]||0)/35)).fill(k));
 return pick(weighted);
}
function beginStrike(){
 const f=bout;f.round++;f.final=f.round>=f.target;
 if(f.final){if(!f.owner&&Math.abs(f.pair[0].practicePoise-f.pair[1].practicePoise)>1)f.winner=f.pair[0].practicePoise>f.pair[1].practicePoise?0:1;f.turn=f.winner;}
 const a=f.pair[f.turn],b=f.pair[1-f.turn],w=held(a);face();stand(a);stand(b);
 a.technique=f.final?'overhead':chooseTechnique(a,w);a.lastTechnique=a.technique;a.attackVariant=((a.attackVariant??-1)+1)%3;
 events.techniques[a.technique]=(events.techniques[a.technique]||0)+1;
 const special=['kick','shieldBash'].includes(a.technique),chain=a.practiceChain>0;
 a.windMax=a.lanista?.12:cl((special?.2:(.20+w.weight*.035)*(1-a.g.stats.reflex*.003)+(a.technique==='overhead'?.14:0))*(chain?.6:1)*.68,.09,.38);
 a.wind=0;a.state='guard';f.contact=false;f.followup=null;
 // Close the distance for a kick or shield, and allow long weapons more room.
 const gap=special?27:cl((w.range+18)*.62,36,76);
 f.orbit=cl((f.orbit||0)+rnd(-.24,.24),-.4,.4);
 f.slots=[-1,1].map(side=>({x:445+Math.cos(f.orbit)*gap/2*side,y:470+Math.sin(f.orbit)*gap/2*side}));
 f.stage='position';f.left=.32;events.steps++;
 b.block=true;b.guardTime=a.windMax+.35;
}
function releaseStrike(){
 const f=bout,a=f.pair[f.turn],w=held(a),kind=a.technique;
 a.moveSpeed=0;a.wind=0;a.energy=Math.max(0,a.energy-(kind==='kick'?12:kind==='shieldBash'?16:kind==='spin'?15:5+w.weight*.7));
 f.duration=kind==='kick'?.48:kind==='shieldBash'?.44:kind==='overhead'?.36:kind==='spin'?.38:w.weight>=5?.32:.24;
 f.left=f.duration;f.stage='swing';a.swingKind=kind;
 if(kind==='kick'){a.kickTimer=.48;a.state='kick';}
 else if(kind==='shieldBash'){a.shieldBashTimer=.44;a.state='shieldbash';}
 else{a.swing=a.swingMax=f.duration;a.state='attack';}
}
function dust(a,big=false){const n=big?7:3;for(let i=0;i<n;i++)particles.push({x:a.x+rnd(-6,6),y:a.y+rnd(-2,2),vx:rnd(-10,10),vy:rnd(-12,-3),left:big?.65:.35,max:big?.65:.35});if(particles.length>24)particles.splice(0,particles.length-24);}
let particles=[];
function cheer(){for(const a of bout.crowd){a.practiceCheer=1.5;a.state='celebrate';a.shoutTimer=.4;}}
function practiceKO(a,b){
 const f=bout;f.winner=f.turn;b.block=false;b.guardTime=0;b.wind=b.swing=b.kickTimer=b.shieldBashTimer=0;b.hit=.23;b.facePain=.3;b.fallDuration=4.5;b.fallTimer=4.5;b.riseDuration=1.25;b.state='falling';b.fallSide=Math.cos(a.a)>=0?1:-1;f.loser=b;f.stage='ko';f.left=4.5;events.ko++;dust(b,true);cheer();say(a.lanista?a:pick(f.crowd.length?f.crowd:[a]),a.lanista?'ownerKo':'ko',4.4,true);
}
function contact(){
 const f=bout,a=f.pair[f.turn],b=f.pair[1-f.turn],w=held(a);f.contact=true;
 if(f.final){practiceKO(a,b);return;}
 const special=['kick','shieldBash'].includes(a.technique),def=b.g.stats,skill=a.g.moves[a.technique]||0;
 const blockChance=cl(.20+def.block*.003+(M.usableShield(b)?.13:0)-skill*.0015,.12,.62);
 const dodgeChance=cl(.12+def.reflex*.002+def.agility*.001-skill*.001,.08,.40);
 const roll=Math.random(),outcome=f.owner&&b.lanista?'block':roll<blockChance?'block':roll<blockChance+(1-blockChance)*dodgeChance?'dodge':'hit';
 const impact=special?{...w,weight:a.technique==='kick'?1.5:3,bladed:false}:w;
 f.outcome=outcome;
 if(outcome==='block'){M.combatResponses.block(a,b,false,impact);b.guardTime=.5;b.block=true;events.block++;if(Math.random()<cl(.20+def.reflex*.003+def.experience*.002,.2,.7)){f.followup='counter';events.counter++;}if(Math.random()<.3)say(pick(f.crowd.length?f.crowd:[b]),'block');}
 else if(outcome==='dodge'){b.guardTime=0;b.block=false;b.dodgeTimer=.22;b.dodgeAngle=Math.atan2(b.y-a.y,b.x-a.x)+(Math.random()<.5?0:pick([-1,1])*Math.PI/2);M.combatResponses.evade(a,b,false);events.dodge++;}
 else{b.guardTime=0;b.block=false;b.hit=.23;b.facePain=.3;const power=8+a.g.stats.strength*.10+skill*.04;b.practicePoise=Math.max(0,b.practicePoise-power*(a.technique==='overhead'?1.2:1));if(!f.owner&&b.practicePoise===0){practiceKO(a,b);return;}M.combatResponses.impact(a,b,power,false,impact);M.combatResponses.push(a,b,M.combatResponses.force(a,b,power,impact)*.5,false);events.hit++;if(a.energy>25&&a.practiceChain<2&&Math.random()<cl(.18+a.g.stats.dexterity*.002+a.g.stats.experience*.001,.18,.52)){f.followup='combo';events.combo++;}dust(b);if(Math.random()<.35)say(pick(f.crowd.length?f.crowd:[a]),'hit');cheer();}
}
function tickPose(a,dt){
 for(const k of ['hit','facePain','guardTime','dodgeTimer','shoutTimer','practiceCheer','kickTimer','shieldBashTimer'])a[k]=Math.max(0,(a[k]||0)-dt);
 a.block=a.guardTime>0;a.energy=Math.min(100,a.energy+dt*6);M.combatResponses.tick(a,dt);if(a.moveSpeed<=1)a.phase+=dt*(a.practiceCheer>0?8:2);
 if(a.swing>0)a.swing=Math.max(0,a.swing-dt);
 if(!a.fallTimer){a.x+=a.kx*dt;a.y+=a.ky*dt;a.kx*=Math.exp(-10*dt);a.ky*=Math.exp(-10*dt);if(a.dodgeTimer>0){a.x+=Math.cos(a.dodgeAngle)*16*dt;a.y+=Math.sin(a.dodgeAngle)*16*dt;}}
}
function update(actors,dt){
 dt=cl(dt,0,.1);if(list!==actors||roster!==S.roster||day!==S.day){cancel();list=actors;roster=S.roster;day=S.day;}
 if(busy()){cancel();return;}clock+=dt;
 if(speech&&(speech.left-=dt)<=0)speech=null;
 particles=particles.filter(p=>{p.left-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;return p.left>0;});
 if(!bout){if(clock>=next)start();return;}
 if([...views.keys()].some(a=>!list.includes(a)||!available(a)||!a.lanista&&!S.roster.includes(a.g))){cancel();return;}
 const f=bout;for(const {a}of views.values())tickPose(a,dt);
 if(f.stage==='approach'){
  let ready=true;for(const v of views.values())if(!route(v,dt))ready=false;
  if(ready){face();for(const a of f.crowd)a.a=Math.atan2(470-a.y,445-a.x);f.stage='greet';f.left=3.8;say(f.owner?f.pair[1]:f.pair[0],f.owner?'owner':'welcome',3.4,true);}
 }else if(f.stage==='greet'){
  f.left-=dt;if(f.left<=0){if(!f.owner&&!f.reply){f.reply=true;say(pick(f.crowd.length?f.crowd:[f.pair[1]]),'reply',3.3,true);f.left=1.8;}else beginStrike();}
 }else if(f.stage==='position'){
  f.left-=dt;let ready=true;for(let i=0;i<2;i++)if(!move(f.pair[i],f.slots[i],dt,65))ready=false;face();
  if(ready||f.left<=0){for(const a of f.pair){a.moveSpeed=0;a.state='guard';}f.pair[f.turn].state='attack';f.pair[f.turn].wind=f.pair[f.turn].windMax;f.stage='wind';}
 }else if(f.stage==='wind'){
  const a=f.pair[f.turn];a.wind=Math.max(0,a.wind-dt);if(!a.wind)releaseStrike();
 }else if(f.stage==='swing'){
  f.left=Math.max(0,f.left-dt);if(!f.contact&&f.left<=f.duration*.52)contact();
  if(f.stage==='swing'&&f.left===0){f.stage='recover';f.left=f.followup==='counter'?.08:f.followup==='combo'?.06:rnd(.12,.22);}
 }else if(f.stage==='recover'){
  f.left-=dt;for(let i=0;i<2;i++)move(f.pair[i],f.slots[i],dt,13);face();
  if(clock>=f.nextCheer&&f.crowd.length&&!speech){say(pick(f.crowd),'cheer');f.nextCheer=clock+rnd(4.5,7);}
  if(f.left<=0){
   const attacker=f.pair[f.turn];if(f.followup==='combo')attacker.practiceChain++;else{attacker.practiceChain=0;f.turn=1-f.turn;}
   beginStrike();
  }
 }else if(f.stage==='ko'){
  f.left=Math.max(0,f.left-dt);const a=f.loser;a.fallTimer=f.left;a.state=f.left<1.25?'rising':f.left<4.2?'fallen':'falling';a.down=f.left<4.2&&f.left>=1.25;
  if(f.left<1.25&&!f.rose){f.rose=true;events.rise++;}
  if(f.left===0){a.down=false;a.fallTimer=0;stand(a);f.stage='after';f.left=2.2;say(pick(f.crowd.length?f.crowd:[f.pair[f.winner]]),'rise',3.7,true);}
 }else if(f.stage==='after'){
  f.left-=dt;if(f.left<=0){f.stage='leave';for(const v of views.values()){stand(v.a);v.route=[v.entry,{x:v.saved.x,y:v.saved.y}];}}
 }else if(f.stage==='leave'){
  let done=true;for(const v of views.values())if(!route(v,dt))done=false;
  if(done){restore();bout=null;speech=null;next=clock+rnd(2,5);}
 }
 for(const [source,v]of views){source.x=v.a.x;source.y=v.a.y;source.a=v.a.a;}
}
function draw(ctx){
 if(!bout)return;ctx.save();for(const p of particles){ctx.globalAlpha=p.left/p.max*.6;ctx.fillStyle='#c7ad78';ctx.fillRect(Math.round(p.x),Math.round(p.y),2,2);}ctx.globalAlpha=1;
 if(speech){const a=speech.a;ctx.font='bold 13px monospace';const rows=[];let row='';for(const word of speech.text.split(' ')){const next=row?row+' '+word:word;if(row&&ctx.measureText(next).width>214){rows.push(row);row=word;}else row=next;}if(row)rows.push(row);const w=Math.min(238,Math.max(...rows.map(s=>ctx.measureText(s).width))+18),h=rows.length*16+12,x=cl(a.x-w/2,8,892-w),y=cl(Math.min(a.y-62-h,410-h),8,650-h);ctx.fillStyle='#182720f2';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#bca77b';ctx.strokeRect(x+.5,y+.5,w-1,h-1);ctx.fillStyle='#f0e3c4';rows.forEach((s,i)=>ctx.fillText(s,x+9,y+19+i*16));const el=document.getElementById('villageChatter'),text=a.g.name+': „'+speech.text+'“';if(el&&el.textContent!==text)el.textContent=text;captionOwned=true;}
 ctx.restore();
}
const click=M.schoolClick;M.schoolClick=action=>{if(action.startsWith('nav:')&&action!=='nav:home'||action.startsWith('profile:'))cancel();return click(action);};
document.addEventListener?.('visibilitychange',()=>{if(document.hidden)cancel();});
M.practiceYard={update,draw,cancel,owns:a=>views.has(a),visual:a=>views.get(a)?.a,speaking:()=>!!speech,get state(){return {clock,bout,events,actors:[...views.values()].map(v=>v.a)};}};
})();
