'use strict';
// Testreihe Sonderattacken (Wunsch Thomas 10.11.): viele echte 1-gegen-1-Kämpfe mit spielgleichen Gladiatoren verschiedener Stärke und Rüstung.
// Kämpfer entstehen wie die Gladiatoren der gegnerischen Schulen (world.js recruitNpc): alle Grundwerte, Waffenfertigkeiten, Manöver
// (auch die Sonderattacken) und Körperwerte ≈ Schulstärke, Ausrüstungsgüte wie dort aus der Schulstärke. Die Kämpfe laufen als Benchmark
// (gleiche Kampfregeln wie im Spiel, nichts wird gelernt oder gespeichert). Gezählt werden Durchstiche und Sonderattacken.
(()=>{const M=window.MG,S=M.s,C=M.clamp;
const TIERS=[{id:'rookie',name:'Rekrut',mean:12},{id:'mid',name:'Erfahren',mean:35},{id:'strong',name:'Stark',mean:60},{id:'elite',name:'Elite',mean:85}];
const ARMORS=[{id:'none',name:'ohne Rüstung'},{id:'leather',name:'Leder'},{id:'medium',name:'verstärkt'},{id:'metal',name:'Metall'}];
const MELEE=()=>M.weaponDefs.filter(w=>!w.ammo&&!['net','throwaxe','javelin'].includes(w.id)).map(w=>w.id);
// wie im Spiel bei den Schulen (world.js gearNpc): Soldat Gladius/Speer/Streitkolben/Hammer (oft mit Schild), Assassine Kurzschwert/Gladius/Axt
const GAME_W={Soldat:['gladius','spear','mace','hammer'],Assassine:['short','gladius','axe']};
const qualityOf=mean=>C(Math.floor((mean-4)/15),0,6);
let seed=1;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;},pick=a=>a[Math.floor(rnd()*a.length)];
function fighter(mean,role,wid,mat,q,shield){const g=M.makeGladiator(0,true);g.enemy=true;g.role=role;
 const bv=()=>C(M.bernoulliValue(mean),1,99);
 for(const k in g.stats){g.stats[k]=bv();g.caps.stats[k]=C(Math.max(g.stats[k],mean+5),1,100);}
 for(const k in g.mastery){g.mastery[k]=bv();g.caps.weapons[k]=C(Math.max(g.mastery[k],mean+8),1,100);}
 for(const k of Object.keys(M.moveNames)){g.moves[k]=bv();g.caps.moves[k]=Math.min(100,Math.max(g.moves[k],mean+8));}
 for(const [id,p] of Object.entries(g.body)){p.strength=bv();p.agility=bv();g.caps.body[id]={strength:Math.min(100,p.strength+10),agility:Math.min(100,p.agility+10),robust:g.caps.body[id]?.robust??30};}
 g.stats.morale=C(40+mean*.5,1,100);g.caps.stats.morale=Math.max(g.caps.stats.morale,g.stats.morale);g.traits=[];g.fatigue=0;g.blood=100;
 const def=M.weaponDefs.find(w=>w.id===wid);g.enemyGear={weapon:null,secondary:M.makeItem('weapon',wid,q),shield:shield&&!def?.twoHand?M.makeItem('shield','roundshield',q):null,armor:{}};
 if(mat!=='none')for(const d of M.armorDefs)g.enemyGear.armor[d.id]=M.makeItem('armor',d.id,q,mat);return g;}
// ein Kampf; gibt Zählung zurück
function fight(cfg,i){const tier=cfg.tier,mat=cfg.armor,q=cfg.quality??qualityOf(tier.mean);seed=(cfg.seed||1)*7919+i*104729+tier.mean*31+(mat.length*17);
 const side=()=>{const role=cfg.weapons==='game'?(rnd()<.6?'Soldat':'Assassine'):(rnd()<.5?'Soldat':'Assassine'),wid=cfg.weapons==='game'?pick(GAME_W[role]):cfg.weapons==='all'?pick(MELEE()):cfg.weapons;return {role,wid,shield:role==='Soldat'&&rnd()<(cfg.weapons==='game'?1:.5)};};
 const s0=side(),s1=side();const keepRng=S.rng;S.rng=(seed>>>0)||1;const g0=fighter(tier.mean,s0.role,s0.wid,mat,q,s0.shield),g1=fighter(tier.mean,s1.role,s1.wid,mat,q,s1.shield);S.rng=keepRng;
 const out={pierce:0,specials:{},elig:{},exp:{},deaths:0,deathBy:{},time:0,hits:0,weapons:[s0.wid,s1.wid]};
 const G=M.gait,prevEv=G.onEvent,prevCfg=M.benchmarkConfig,wasActive=G.active;G.active=true;G.trace=out;
 G.onEvent=e=>{if(e.kind==='pierce')out.pierce++;else if(e.kind==='special'){out.specials[e.key]=(out.specials[e.key]||0)+1;if(e.result==='death'){out.deaths++;out.deathBy[e.key]=(out.deathBy[e.key]||0)+1;}}};
 try{const err=M.startBenchmark({count:1,seed:(seed%100000)+1,selfFight:{name:'Testreihe'},fighters:[g0,g1],shield0:'none',shield1:'none',armor0:'none',armor1:'none'});if(err)throw new Error(err);
  const b=S.battle;let n=0;const lim=60*(cfg.limit||90);for(;n<lim&&S.battle===b&&!b.result&&!b.finale;n++)M.fixedStep(1/60);out.time=n/60;out.end=b.result?'result':n>=lim?'time':'finale';
  if(S.battle===b)M.endBenchmark();}
 finally{G.onEvent=prevEv;G.trace=null;G.active=wasActive;M.benchmarkConfig=prevCfg;M.selfFightResult=null;}
 return out;}
// ganze Reihe in Häppchen (Browser bleibt bedienbar); onStep(fortschritt), onDone(ergebnis)
function run(cfg,onStep,onDone){const cells=[];for(const t of cfg.tiers)for(const a of cfg.armors)cells.push({tier:TIERS.find(x=>x.id===t),armor:a});
 const res=cells.map(c=>({tier:c.tier,armor:c.armor,fights:0,time:0,pierce:0,specials:{},elig:{},exp:{},deaths:0,deathBy:{},hits:0}));let ci=0,fi=0,stop=false;const total=cells.length*cfg.fights;
 const step=()=>{if(stop)return;const t0=Date.now();while(ci<cells.length&&Date.now()-t0<(cfg.budget||120)){const c=cells[ci],r=res[ci],o=fight({...cfg,tier:c.tier,armor:c.armor},fi);r.fights++;r.time+=o.time;r.pierce+=o.pierce;r.deaths+=o.deaths;r.hits+=o.hits;
   for(const [k,v] of Object.entries(o.specials))r.specials[k]=(r.specials[k]||0)+v;for(const [k,v] of Object.entries(o.elig))r.elig[k]=(r.elig[k]||0)+v;for(const [k,v] of Object.entries(o.exp))r.exp[k]=(r.exp[k]||0)+v;for(const [k,v] of Object.entries(o.deathBy))r.deathBy[k]=(r.deathBy[k]||0)+v;
   if(++fi>=cfg.fights){fi=0;ci++;}}
  const done=ci*cfg.fights+fi;onStep?.(done/total,res);if(ci>=cells.length)onDone?.(res);else if(cfg.sync)step();else setTimeout(step,0);};
 step();return {stop:()=>{stop=true;}};}
M.testreihe={TIERS,ARMORS,MELEE,GAME_W,qualityOf,fighter,fight,run};
})();
