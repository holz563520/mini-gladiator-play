'use strict';
(()=>{
const M=window.MG,S=M.s;
let career=null,metrics=null;
M.benchmarkConfig={count:3,role0:'Soldat',role1:'Soldat',seed:1701,league:0,weapon0:'gladius',weapon1:'gladius',armor0:'leather',armor1:'leather',quality0:2,quality1:2,shield0:'smallshield',shield1:'smallshield'};
M.benchmarkResults=[];
function averageFighter(team,index,c){
 const custom=c.entries?.[team]?.[index];if(custom){c={...c};for(const k of ['role','weapon','armor','shield','quality'])if(custom[k]!==undefined)c[k+team]=custom[k];}
 const g=M.makeGladiator(0,true);g.id='benchmark-'+team+'-'+index;g.name=(team?'Rot ':'Blau ')+(index+1);g.enemy=team===1;g.traits=[];g.role=c['role'+team]==='mixed'?M.roles[index%3]:(M.roles.includes(c['role'+team])?c['role'+team]:'Soldat');g.height=180;g.weight=80;g.arm=77;g.leg=88;g.fat=16;g.muscle=40;g.age=25;g.potential=50;g.fatigue=0;g.blood=100;g.fame=0;g.scars=[];g.healing=null;
 for(const key in g.stats){g.stats[key]=50;g.caps.stats[key]=50;}
 for(const key in g.moves){g.moves[key]=50;g.caps.moves[key]=50;}
 for(const key in g.mastery){g.mastery[key]=50;g.caps.weapons[key]=50;}
 for(const key in g.skills)g.skills[key]=50;
 for(const key in g.smith){g.smith[key]={current:50,potential:50};}
 for(const [key,p]of Object.entries(g.body)){Object.assign(p,{hp:100,max:100,strength:50,agility:50,pain:0,bleed:0,grade:0,chronic:0,missing:false,injury:'',wounds:[]});g.caps.body[key]={strength:50,agility:50};}
 const classWeapon={Soldat:'gladius',Assassine:'dagger',Fernkämpfer:'bow'}[g.role],def=c['weapon'+team]==='class'?M.weaponDefs.find(w=>w.id===classWeapon):c['weapon'+team]==='mixed'?M.weaponDefs[index%M.weaponDefs.length]:M.weaponDefs.find(w=>w.id===c['weapon'+team])||M.weaponDefs.find(w=>w.id==='gladius'),q=c['quality'+team];
 const main=M.makeItem('weapon',def.id,q);main.id=g.id+'-main';main.blood=0;
 g.enemyGear={weapon:def.ammo?main:null,secondary:def.ammo?M.makeItem('weapon','dagger',q):main,shield:c['shield'+team]==='auto'?(g.role==='Fernkämpfer'?null:M.makeItem('shield',g.role==='Soldat'?'roundshield':'buckler',q)):c['shield'+team]==='none'?null:M.makeItem('shield',c['shield'+team],q),armor:{}};
 if(c['armor'+team]!=='none')for(const d of M.armorDefs)g.enemyGear.armor[d.id]=M.makeItem('armor',d.id,q,c['armor'+team]==='auto'?(g.role==='Soldat'?'metal':'leather'):c['armor'+team]);
 return g;
}
function startBenchmark(config=M.benchmarkConfig){
 if(S.battle||career)return 'Beende zuerst den laufenden Kampf.';
 const c={...M.benchmarkConfig,...config};if(Object.hasOwn(config,'count'))for(const t of [0,1])if(!Object.hasOwn(config,'count'+t))c['count'+t]=config.count;c.count=M.clamp(Math.round(+c.count)||1,1,100);c.seed=(Number(c.seed)||1701)>>>0;c.league=M.clamp(Math.round(+c.league)||0,0,6);
 for(const team of [0,1]){c['quality'+team]=M.clamp(Math.round(+c['quality'+team])||0,0,6);if(!['none','metal','medium','leather','auto'].includes(c['armor'+team]))c['armor'+team]='none';if(c['shield'+team]!=='auto'&&!M.shieldDefs.some(d=>d.id===c['shield'+team]))c['shield'+team]='none';}
 for(const t of [0,1])c['count'+t]=M.clamp(Math.round(+c['count'+t]||c.count),1,100);M.benchmarkConfig=c;
 // Preserve original references. All writes, deaths and RNG changes happen in a detached clone.
 const isolated=M.copy(S);career={...S};M.benchmarkActive=true;Object.assign(S,isolated);
 S.rng=c.seed;S.inventory=[];S.roster=[];S.fallen=[];S.records=[];S.trainers=[];S.tournament=null;S.challenge=null;S.sponsor=null;S.event=null;S.league=c.league;S.schoolName='BENCHMARK · BLAU';S.options={...S.options,speed:1};S.tactics={aggression:'Ausgeglichen',formation:'Normal',priority:'Nächster Gegner',ranged:'Abstand halten',help:'Normal'};
 const actors=[];for(const team of [0,1])for(let i=0;i<c['count'+team];i++){const g=averageFighter(team,i,c),a=M.createCombatActor(g,team,i);const rows=Math.min(5,c['count'+team]),col=Math.floor(i/rows);a.x=(team?780+col*42:260-col*42)+(g.role==='Soldat'?(team?-35:35):g.role==='Fernkämpfer'?(team?50:-50):0);a.y=385+(i%rows-(rows-1)/2)*(c.teamTactics?.[team]?.formation==='Eng'?52:c.teamTactics?.[team]?.formation==='Breit'?96:78);a.r=12;a.cool=.6+(i%3)*.12;actors.push(a);if(!team)S.roster.push(g);}
 S.battle={id:'benchmark-'+Date.now(),benchmark:true,actors,opponent:'BENCHMARK · ROT',champion:false,time:0,type:'benchmark',league:c.league,log:[],paused:false,result:null,lastSave:0,obstacles:[],fee:0};
 if(c.teamTactics)S.battle.teamTactics=M.copy(c.teamTactics);S.battle.leaders=[0,1].map(t=>actors.find(a=>a.team===t&&a.id==='benchmark-'+t+'-'+c.leaderIndices?.[t])?.id);S.battle.moraleBonus=S.battle.leaders.map(id=>id?2.5:0);
 metrics={wall:0,frames:0,simMs:0,renderMs:0,steps:0,dropped:0,samples:new Float32Array(600),sampleCount:0,sampleIndex:0};
 M.stains=[];M.limbs=[];M.swings=[];M.floaters=[];M.shake=0;M.cheer=0;for(const p of [...M.fx,...M.shots])p.active=false;
 M.focus?.(null);M.arrangeBattle(S.battle);M.resetBenchmarkRender?.();M.sound?.('gong');M.onBattleStart?.();return '';
}
function benchmarkSample(wallMs,simMs,renderMs,painted,steps,dropped=0){if(!metrics||!S.battle?.benchmark||S.battle.paused)return;metrics.wall+=wallMs/1000;metrics.simMs+=simMs;metrics.steps+=steps;metrics.dropped+=dropped;if(painted){metrics.frames++;metrics.renderMs+=renderMs;metrics.samples[metrics.sampleIndex++%600]=simMs+renderMs;metrics.sampleCount=Math.min(600,metrics.sampleCount+1);}}
function benchmarkMetrics(){if(!metrics)return null;const m=metrics,values=Array.from(m.samples.subarray(0,m.sampleCount)).sort((a,b)=>a-b);return {fps:m.wall?m.frames/m.wall:0,frameMs:m.frames?(m.simMs+m.renderMs)/m.frames:0,stepMs:m.steps?m.simMs/m.steps:0,p95:values[Math.floor(values.length*.95)]||0,simRate:m.wall?(S.battle?.time||0)/m.wall:0,wall:m.wall,dropped:m.dropped,renderQuality:M.renderMetrics?.().quality??1};}
function endBenchmark(winner=-1,reason='Manuell beendet'){
 if(!career||!S.battle?.benchmark)return;const b=S.battle,result={...benchmarkMetrics(),config:M.copy(M.benchmarkConfig),time:b.time,winner,reason,teams:[0,1].map(team=>{const a=b.actors.filter(a=>a.team===team);const attackRows={};for(const fighter of a){for(const [key,count]of Object.entries(fighter.attacks||{})){(attackRows[key]??={key,count:0,hits:0,damage:0}).count+=count;}for(const [key,v]of Object.entries(fighter.attackDamage||{})){const row=attackRows[key]??={key,count:0,hits:0,damage:0};row.hits+=v.hits;row.damage+=v.damage;}}return {alive:a.filter(a=>!a.down&&!a.g.dead&&!a.surrendered).length,damage:a.reduce((n,x)=>n+x.damage,0),attacks:a.reduce((n,x)=>n+Object.values(x.attacks||{}).reduce((v,k)=>v+k,0),0),combos:[2,3,4].map(n=>({length:n,count:a.reduce((v,f)=>v+(f.comboChains?.[n]||0),0)})),attackRows:Object.values(attackRows).sort((x,y)=>y.damage-x.damage),classes:M.roles.map(role=>{const group=a.filter(x=>x.g.role===role);return {role,count:group.length,damage:group.reduce((n,x)=>n+x.damage,0),taken:group.reduce((n,x)=>n+x.taken,0),kills:group.reduce((n,x)=>n+x.kills,0)};})};})};
 for(const key of Object.keys(S))delete S[key];Object.assign(S,career);career=null;metrics=null;M.benchmarkActive=false;M.benchmarkResults.unshift(result);M.benchmarkResults=M.benchmarkResults.slice(0,10);
 M.stains=[];M.limbs=[];M.swings=[];M.floaters=[];M.shake=0;M.cheer=0;for(const p of [...M.fx,...M.shots])p.active=false;M.focus?.(null);M.onBenchmarkEnd?.(result);return result;
}
Object.assign(M,{startBenchmark,endBenchmark,benchmarkSample,benchmarkMetrics});
})();
