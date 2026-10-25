'use strict';
// =====================================================================================================
// ARENA-NEU · HERAUSFORDERUNGEN, KAMPFWERT UND GOLD (nur Testversion)
// · Kampfwert (KW) aller Kämpfer auf einer Skala: Menschen = M.power (Kampfwert des Spiels),
//   Hähne, Löwen und Hunde als „gleich starker Mensch“ (in Probekämpfen mit dem echten Kampfsystem geeicht, tests/calibrate.cjs)
// · Gruppenstärke E = Σ (KW/30)^γ, Siegchance-Schätzung p = 1 / (1 + (E_Gegner/E_eigen)^k)
// · Herausforderungen je Schwierigkeitsstufe: Gegner werden so gebaut, dass E_Gegner ≈ Faktor × E_eigen
// · Gold: Siegprämie aus Gegnerstärke, Siegchance und Tödlichkeit; Antrittsgeld nur anteilig nach geleistetem Kampf
// =====================================================================================================
(()=>{
const M=window.MG,S=M.s,CF=window.CF,AN=window.AN,cl=M.clamp;
// Eichung (tests/calibrate.cjs): Menschen γ, Steilheit k, Hähne c·(Wert)^g, Löwen c·(Wert)^g
const P=Object.assign({gamma:1.6,k:2.2,cr:.12,gr:1.5,cl:2.6,gl:1.6},window.ARENA_CALIBRATION||{});
const CH={P};window.Challenges=CH;
const rnd=(r,a,b)=>a+r()*(b-a),pick=(r,a)=>a[Math.floor(r()*a.length)];
function rngOf(seed){let s=Math.imul((seed>>>0)^0x9e3779b9,0x85ebca6b)>>>0||1;const n=()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};for(let i=0;i<8;i++)n();return n;}
CH.rngOf=rngOf;

// ---------- Kampfwert ----------
const roosterScore=R=>Math.max(.05,CF.power(R)/20*Math.pow(Math.max(.4,R.weight)/2.6,.35));
// Löwen: in 1056 Probekämpfen gegen 1–6 Menschen zählen vor allem Tempo und Zähigkeit, dann Zustand (Hinterlauf, Gesundheit, Hunger)
const lionScore=L=>{const s=L.stats,c=L.condition;return Math.max(.05,Math.pow((2.62*s.tempo+2.42*s.zaeh)/5.04/50,.369)*Math.pow(cl(c.health/100,.05,1),.109)*Math.pow(.5+.5*cl(c.rear/100,0,1),.276)*Math.pow(1-cl(c.hunger,0,100)/400,.128));};
function strength(u){
 if(u.kind==='human')return Math.pow(Math.max(.1,M.power(u.g))/30,P.gamma)*cl(u.g.blood/100,.005,1)*cl(1-u.g.fatigue/125,.2,1);
 if(u.kind==='rooster')return P.cr*Math.pow(roosterScore(u.R),P.gr)*cl(u.R.blood/100,.005,1)*cl(1-u.R.fatigue/125,.2,1);
 if(u.kind==='dog')return Math.pow(window.DOG.kw(u.D)/30,P.gamma);// Hunde: Kampfwert aus hund.js (DOG.kw, geschätzt aus der Abstimmung des Hunde-Prototyps)
 return P.cl*Math.pow(lionScore(u.L),P.gl)*cl(u.L.condition.blood/100,.05,1);}
const kwOf=e=>Math.round(30*Math.pow(Math.max(1e-4,e),1/P.gamma));
function kw(u){return kwOf(strength(u));}
const teamE=units=>units.reduce((n,u)=>n+strength(u),0);
const teamKW=units=>units.reduce((n,u)=>n+kw(u),0);
const pWin=(own,enemy)=>1/(1+Math.pow(teamE(enemy)/Math.max(1e-6,teamE(own)),P.k));
Object.assign(CH,{strength,kw,kwOf,teamE,teamKW,pWin,roosterScore,lionScore});

// ---------- Gegner bauen ----------
const ROLE_GEAR={
 Soldat:[['gladius','smallshield'],['spear','roundshield'],['club',null],['axe','buckler'],['mace','smallshield'],['long',null],['trident','buckler']],
 Assassine:[['dagger',null],['short',null],['dagger','buckler']],
 Fernkämpfer:[['bow',null],['javelin',null]]};
function gladiator(r,{q=1,role='Soldat',kwTarget=null,armor=null,enemy=true}={}){
 const g=M.makeGladiator(cl(Math.round(q),0,6),enemy);g.role=role;g.traits=g.traits.filter(t=>t!=='Feige'||r()<.5);
 const [w,sh]=pick(r,ROLE_GEAR[role]),gq=cl(Math.round(q+rnd(r,-1,.6)),0,6);
 const main=M.makeItem('weapon',w,gq),ranged=['bow','javelin'].includes(w);
 g.enemyGear={weapon:main,secondary:ranged?M.makeItem('weapon','dagger',gq):null,shield:sh?M.makeItem('shield',sh,gq):null,armor:{}};
 const arm=armor??(q>=4?'metal':q>=2?'medium':q>=1?'leather':null);
 if(arm){const parts=q>=4?['helm','chestplate','leftarm','rightarm','leftleg','rightleg']:q>=2?['helm','chestplate']:['chestplate'];for(const id of parts)g.enemyGear.armor[id]=M.makeItem('armor',id,gq,role==='Soldat'?arm:'leather');}
 if(kwTarget)tune(g,kwTarget);
 return g;}
// Werte gleichmäßig strecken, bis der Kampfwert des Spiels passt (Talente, Bewegungen und Waffenkunst mit)
function tune(g,target){for(let i=0;i<6;i++){const now=M.power(g);if(Math.abs(now-target)<1)break;const avg=Object.values(g.stats).reduce((a,b)=>a+b,0)/17,base=now-avg*(.5+M.health(g)/200),want=(target-base)/(.5+M.health(g)/200),f=cl(want/Math.max(1,avg),.35,2.4);
 for(const k in g.stats)g.stats[k]=cl(Math.round(g.stats[k]*f),1,100);for(const k in g.moves)g.moves[k]=cl(Math.round(g.moves[k]*f),1,100);if(g.mastery)for(const k in g.mastery)g.mastery[k]=cl(Math.round(g.mastery[k]*f),1,100);if(g.caps){for(const grp of ['stats','moves'])for(const k in g.caps[grp])g.caps[grp][k]=Math.max(g.caps[grp][k],g[grp][k]);}}
 return g;}
const LION_NAMES=['Sultan','Nubia','Septimus','Mago','Kleopatra','Brutus','Leta','Hasdrubal','Atlas','Sabra','Tullia','Massinissa','Zama','Juba','Cyrene','Draco','Ferox','Aurora'];
const LION_KINDS=[
 {key:'koenig',label:'Königslöwe aus Numidien',mean:66,health:[95,100],rear:[95,100],hunger:[0,20]},
 {key:'jung',label:'Junger Löwe, unberechenbar',mean:48,health:[90,100],rear:[90,100],hunger:[10,40]},
 {key:'hunger',label:'Ausgehungerte Bestie',mean:52,health:[70,90],rear:[80,100],hunger:[60,95]},
 {key:'verletzt',label:'Verletzter Löwe',mean:50,health:[42,70],rear:[30,70],hunger:[20,60]},
 {key:'alt',label:'Ausgemusterter Arenaveteran',mean:44,health:[60,85],rear:[35,65],hunger:[40,80]},
 {key:'menschen',label:'Menschenfresser',mean:72,health:[85,100],rear:[85,100],hunger:[30,70]}];
function lion(r,{kind=null,score=null,name=null}={}){
 const K=kind?LION_KINDS.find(k=>k.key===kind)||LION_KINDS[1]:pick(r,LION_KINDS);
 const bern=m=>{let h=0;const p=cl((m-1)/99,.02,.98);for(let i=0;i<48;i++)if(r()<p)h++;return Math.round(1+99*h/48);};
 const L={id:'lw'+Math.floor(r()*1e9).toString(36),schema:'arena-theory.animal/0.1',species:'loewe',name:name||pick(r,LION_NAMES),kind:K.key,epithet:K.label,ageYears:Math.round(K.key==='alt'?rnd(r,11,15):K.key==='jung'?rnd(r,3,5):rnd(r,5,10)),
  stats:{kraft:bern(K.mean),tempo:bern(K.mean-(K.key==='alt'?8:0)),zaeh:bern(K.mean),wild:bern(K.mean+(K.key==='hunger'||K.key==='menschen'?15:0))},
  condition:{health:Math.round(rnd(r,...K.health)),blood:100,rear:Math.round(rnd(r,...K.rear)),hunger:Math.round(rnd(r,...K.hunger))},wounds:[],scars:Math.floor(r()*(K.key==='alt'?6:3)),wins:0,kills:Math.floor(r()*(K.key==='menschen'?9:3)),fights:0,dead:false};
 L.condition.blood=Math.round(cl(L.condition.health+15,40,100));
 if(score)scaleLion(L,score);
 return L;}
function scaleLion(L,score){for(let i=0;i<10;i++){const now=lionScore(L);if(Math.abs(now-score)<.01)break;const f=cl(Math.pow(score/now,2.7),.5,2);for(const k in L.stats)L.stats[k]=cl(Math.round(L.stats[k]*f),12,99);if(lionScore(L)<score*.9&&L.condition.health<100)L.condition.health=Math.min(100,L.condition.health+10);}return L;}
function rooster(r,{tierMin=1,tierMax=9}={}){return CF.createRooster({seed:Math.floor(r()*4294967295),minQuality:tierMin,maxQuality:tierMax});}
Object.assign(CH,{gladiator,tune,lion,scaleLion,rooster,LION_KINDS});

// ---------- Vorlagen der Gegnergruppen ----------
// Jede Vorlage baut aus der Zielstärke E eine Gruppe; null, wenn das mit dieser Tierart nicht sinnvoll geht.
const unit=(kind,data,i)=>({kind,key:'e'+i+'-'+Math.floor(Math.random()*1e6).toString(36),row:'front',[kind==='human'?'g':kind==='rooster'?'R':kind==='dog'?'D':'L']:data});
// Hunde (Hundefang): Rasse nach Zielstärke wählen, frisch gewürfelt, dann Istwerte strecken, bis der Kampfwert passt
function dog(r,kwTarget){const B=window.DOG.BREEDS,q=cl((kwTarget-33)/14,-1,6),pool=B.filter(b=>Math.abs(window.DOG.targetQ(b.soll)-q)<=1.2),b=pick(r,pool.length?pool:B),D=window.DOG.create(b.id,Math.floor(r()*4294967295));
 for(let i=0;i<8;i++){const now=window.DOG.kw(D,false);if(Math.abs(now-kwTarget)<1.5)break;const f=cl(Math.pow(kwTarget/now,.9),.6,1.6);for(const k in D.stats)D.stats[k]=cl(Math.round(D.stats[k]*f),3,99);for(const k in D.caps)D.caps[k]=Math.max(D.caps[k],D.stats[k]);}
 return D;}
function dogGroup(r,E,n){if(!window.DOG)return null;const k=kwForE(E/n);if(k<10||k>170)return null;return Array.from({length:n},(_,i)=>unit('dog',dog(r,k),i));}
const kwForE=e=>30*Math.pow(e,1/P.gamma);
const qForKW=k=>cl((k-33)/14,0,6);
function humanGroup(r,E,n,roles){const out=[];for(let i=0;i<n;i++){const k=kwForE(E/n);if(n!==10&&(k<16||k>160))return null;const role=roles?roles[i%roles.length]:(i>0&&r()<.25?pick(r,['Assassine','Fernkämpfer']):'Soldat');out.push(unit('human',gladiator(r,{q:qForKW(k),role,kwTarget:k}),i));}
 out.forEach((u,i)=>{if(u.g.role==='Fernkämpfer'||n===10&&i>=5)u.row='back';});return out;}
function roosterGroup(r,E,n){const per=E/n,score=Math.pow(per/P.cr,1/P.gr);// gesuchte Hahnenstärke
 const out=[];for(let i=0;i<n;i++){let best=null,bd=1e9;for(let t=0;t<14;t++){const R=rooster(r,{tierMin:score<.7?1:score<1?2:3,tierMax:score<.7?5:score<1.1?7:9}),d=Math.abs(roosterScore(R)-score);if(d<bd){bd=d;best=R;}}
  if(bd>score*.45)return null;out.push(unit('rooster',best,i));}return out;}
function lionGroup(r,E,n,kind){const score=Math.pow(E/n/P.cl,1/P.gl);if(score<.08||score>2.4)return null;return Array.from({length:n},(_,i)=>unit('lion',lion(r,{kind:kind||(score<.6?pick(r,['verletzt','alt','hunger']):score>1.25?pick(r,['koenig','menschen']):null),score}),i));}
const TEMPLATES={
  gladiatoren:{label:'Gladiatoren',beast:false,build:(r,E,N)=>{const ns=N===10?[10]:[N-1,N,N,N+1,N+2].filter(n=>n>=1&&n<=6);return humanGroup(r,E,pick(r,ns));}},
 champion:{label:'Ein Einzelner',beast:false,build:(r,E,N)=>N>=2?humanGroup(r,E,1,['Soldat']):null},
  schuetzen:{label:'Schützen & Schilde',beast:false,build:(r,E,N)=>{const n=N===10?10:Math.max(2,Math.min(6,N+(r()<.5?0:1)));return humanGroup(r,E,n,['Soldat','Fernkämpfer','Soldat','Fernkämpfer','Assassine']);}},
 loewe:{label:'Ein Löwe',beast:true,build:(r,E)=>lionGroup(r,E,1)},
 rudel:{label:'Löwenrudel',beast:true,build:(r,E,N)=>N>=2?lionGroup(r,E,2):null},
 haehne:{label:'Kampfhähne',beast:true,build:(r,E)=>{for(const n of [3,4,5,2,6,7,8]){const g=roosterGroup(r,E,n);if(g)return g;}return null;}},
 hund:{label:'Ein Hund',beast:true,build:(r,E)=>dogGroup(r,E,1)},
 meute:{label:'Hundemeute',beast:true,build:(r,E,N)=>N>=2?dogGroup(r,E,Math.min(5,N+(r()<.5?0:1))):dogGroup(r,E,2)},
 baendiger:{label:'Tierbändiger',beast:true,build:(r,E)=>{const h=humanGroup(r,E*.55,1,['Soldat']);if(!h)return null;const t=r()<.5?lionGroup(r,E*.45,1,null):(()=>{for(const n of [2,3,4,5]){const g=roosterGroup(r,E*.45,n);if(g)return g;}return null;})();return t?[...h,...t.map((u,i)=>({...u,key:'t'+i+u.key}))]:null;}}};
CH.TEMPLATES=TEMPLATES;CH.dog=dog;

// ---------- Fünf Schwierigkeitsstufen ----------
const LEVELS=[
 {key:'sehrleicht',label:'Extrem einfach',ratio:.22,color:'#7fb49b',skulls:0},
 {key:'leicht',label:'Leicht',ratio:.63,color:'#a9c27a',skulls:1},
 {key:'ausgeglichen',label:'Ausgeglichen',ratio:1.05,color:'#dfb66d',skulls:2},
 {key:'schwer',label:'Schwer',ratio:1.7,color:'#d98a52',skulls:3},
 {key:'extrem',label:'Extrem schwer',ratio:2.85,color:'#d0473e',skulls:4}];
CH.LEVELS=LEVELS;
// Four distinct offers per level, twenty offers in the existing two views.
const RATIOS=[[.12,.18,.25,.33],[.45,.57,.70,.84],[.94,1.02,1.10,1.18],[1.35,1.55,1.78,2.02],[2.30,2.60,3.00,3.50]];
CH.levelRatio=(level,variant)=>RATIOS[LEVELS.indexOf(level)]?.[variant]??level.ratio;
CH.signature=units=>JSON.stringify(units.map(u=>[u.key,u.row,u.kind==='human'?[u.g.stats,u.g.moves,u.g.mastery,u.g.body,u.g.blood,u.g.fatigue,u.g.height,u.g.weight,['weapon','secondary','shield'].map(k=>M.gear(u.g,k)),M.armorItems(u.g)]:u.kind==='rooster'?u.R:u.kind==='dog'?u.D:u.L]));

// Welche Gegner zu welcher eigenen Gruppe passen (Tierkämpfe sollen nicht überwiegen)
// Gegner meist von derselben Art wie die eigene Gruppe; Mensch gegen Tier (und umgekehrt) nur als Ausnahme (CH.CROSS = 5 % je Herausforderung)
CH.CROSS=.05;
function weights(ownKind,cross){
 if(ownKind==='human')return cross?{loewe:1.4,rudel:.4,haehne:1,baendiger:.9,...(window.DOG?{hund:1,meute:.8}:{})}:{gladiatoren:5,champion:1.4,schuetzen:2};
 // Hunde kämpfen gegen Hunde und Menschen (nicht gegen Hähne oder Löwen: deren Kampfsysteme kennen keine Hunde)
 if(ownKind==='dog')return cross?{gladiatoren:1.2,champion:1.4}:{hund:2,meute:1.2,champion:1,gladiatoren:.6};
 if(ownKind==='rooster')return cross?{gladiatoren:1,champion:1.2,baendiger:.8,loewe:.6}:{haehne:1};
 return cross?{gladiatoren:2,schuetzen:1,champion:1,haehne:.6,baendiger:.6}:{loewe:2,rudel:1};}
function weighted(r,w){let s=0;for(const v of Object.values(w))s+=v;let x=r()*s;for(const [k,v] of Object.entries(w)){x-=v;if(x<=0)return k;}return Object.keys(w)[0];}

// ---------- Gold ----------
// G0: eine ausgeglichene Dreiergruppe Rekruten (E≈3) bringt bei Sieg etwa die Prämie der Straßenarena (132 Gold).
const G0=50;
function gold(own,enemy,p){
 const Ee=teamE(enemy),Eo=teamE(own),beasts=enemy.filter(u=>u.kind!=='human').length/enemy.length;
 const lethal=1+.18*enemy.filter(u=>u.kind==='lion').length/enemy.length-.15*enemy.filter(u=>u.kind==='rooster').length/enemy.length*(own.some(u=>u.kind==='human')?1:0);
 const risk=.45+1.1*Math.pow(1-p,1.2);
 const win=Math.max(10,Math.round(G0*Math.pow(Ee,.9)*risk*lethal/5)*5);
 // Antrittsgeld: höchstens ein kleiner Teil der Prämie und nie mehr als ein Drittel dessen, was ein ausgeglichener Kampf dieser Gruppe einbringt
 const lossMax=Math.round(Math.min(win*.18*(.6+.4*(1-p)),G0*Math.pow(Eo,.9)*.35)/5)*5;
 return {win,lossMax,risk,lethal,beasts};}
CH.gold=gold;CH.G0=G0;
// Ausgezahltes Antrittsgeld: 30 % sicher, der Rest nach zerstörter gegnerischer Kampfkraft
CH.payout=(c,out)=>{const won=out.winner===0;if(won)return c.gold.win;let tot=0,done=0;for(const u of out.units.filter(u=>u.team===1)){const s=c.enemyE[u.key]??1;tot+=s;done+=s*(u.loss||0);}const perf=tot?done/tot:0;return Math.round(c.gold.lossMax*(.3+.7*perf));};

// ---------- Texte ----------
const NAMES={
 gladiatoren:['Die Söhne des Staubs','Bruderschaft der Narben','Die Hungrigen aus Capua','Kohorte der Verschuldeten','Die letzten Ehrlichen','Männer ohne Morgen','Die Gerber von Ostia','Söldner auf Abruf'],
 champion:['Der Einzelne','Ein Mann, eine Legende','Der Henker von Puteoli','Der Unbesiegte','Der Mann mit dem Grabstein'],
 schuetzen:['Pfeile und Schilde','Die Fernkampf-Kohorte','Regen aus Eisen','Die Schützen von Kreta'],
 loewe:['Das Tier','Mahlzeit für einen','Hunger aus Numidien','Brüllen im Sand'],
 rudel:['Das Rudel','Zwei Mäuler, ein Hunger','Familientreffen','Königliche Hoheiten'],
 haehne:['Federn und Wut','Der Hühnerhof','Krallen im Morgengrauen','Die Gefiederten','Sonntagsbraten mit Sporen'],
 baendiger:['Der Bändiger','Herr und Hund – ähm, Hahn','Mensch und Bestie','Der Wärter und sein Liebling'],
 hund:['Der Köter','Ein Maul voll Zähne','Der Hof hat Hunger','Bester Freund des Totengräbers'],
 meute:['Die Meute','Rudel ohne Herrchen','Bellen im Sand','Futterneid']};
const DESC={
 0:['Das Publikum gähnt schon bei der Ankündigung.','Ein Aufwärmen. Für die Gegner eher ein Abschied.','Der Veranstalter nennt es „Schaukampf“. Die Gegner nennen es Pech.'],
 1:['Machbar, wenn niemand stolpert.','Eine ehrliche Prüfung mit ehrlichem Lohn.','Gute Gelegenheit, Narben zu sammeln, die man vorzeigen kann.'],
 2:['Auf Messers Schneide. Die Buchmacher streiten noch.','Gleich gegen gleich. Der Sand entscheidet.','Ein fairer Kampf – also einer, bei dem beide Seiten bluten.'],
 3:['Die Gegner sind besser. Die Prämie auch.','Wer hier gewinnt, wird besungen. Wer verliert, beerdigt.','Mutig. Oder dumm. Die Grenze ist im Sand nicht markiert.'],
 4:['Selbstmord mit Eintrittskarten.','Die Totengräber haben heute Überstunden angemeldet.','Hier gewinnt man Ruhm – oder einen Platz in der Hall of the Fallen.']};
const BEAST_DESC={hund:'Ein Hund. Wer ihn unterschätzt, zählt danach seine Finger.',meute:'Mehrere Hunde. Sie greifen von hinten an, wenn vorn jemand beschäftigt ist.',loewe:'Ein Löwe kennt keine Regeln, nur Hunger.',rudel:'Mehrere Löwen. Ein einzelner wäre schon genug Ärger.',haehne:'Klein, gemein und erstaunlich gut bewaffnet.',baendiger:'Ein Mensch mit einem Tier an der Kette. Fragt sich, wer wen führt.'};

// ---------- Target-matched fallback, using actual opponent stats and condition ----------
function matchedGroup(r,target,N,kind){
 let count=Math.max(1,N),best=null,error=Infinity;
 for(let pass=0;pass<5;pass++){
  const per=target/count,k=kwForE(per);
  const enemy=Array.from({length:count},(_,i)=>{
   const data=kind==='human'?gladiator(r,{q:qForKW(k),role:i%4===3?'Assassine':'Soldat'}):kind==='rooster'?rooster(r,{}):kind==='dog'?dog(r,k):lion(r,{});
   if(kind==='human'&&k<20)data.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};
   return {...unit(kind,data,i),row:count>6&&i>=Math.ceil(count/2)?'back':'front'};
  });
  function set(t){const healthy=Math.min(1,t/.2),stat=1+Math.max(0,(t-.2)/.8)*99;
   for(const u of enemy){
    if(u.kind==='human'){const g=u.g;for(const group of [g.stats,g.moves,g.mastery])for(const key in group)group[key]=stat;
     for(const p of Object.values(g.body)){p.strength=stat;p.agility=stat;}
     g.blood=1+99*healthy;g.fatigue=100*(1-healthy);
     if(g.caps){for(const group of ['stats','moves'])for(const key in g[group])g.caps[group][key]=Math.max(g.caps[group][key]||0,g[group][key]);for(const key in g.mastery)g.caps.weapons[key]=Math.max(g.caps.weapons[key]||0,g.mastery[key]);}
    }else if(u.kind==='rooster'){const R=u.R;for(const group of ['stats','moves'])for(const key in R[group]){R[group][key]=stat;R.caps[group][key]=Math.max(R.caps[group][key],stat);}R.blood=1+99*healthy;R.fatigue=100*(1-healthy);
    }else if(u.kind==='dog'){const D=u.D,c=window.DOG.cond(D);for(const key in D.stats){D.stats[key]=Math.min(99,stat);D.caps[key]=Math.max(D.caps[key],D.stats[key]);}c.blood=5+95*healthy;
    }else{const L=u.L;for(const key in L.stats)L.stats[key]=Math.min(99,stat);Object.assign(L.condition,{blood:5+95*healthy,health:10+90*healthy,rear:20+80*healthy,hunger:90*(1-healthy)});}
   }
   return teamE(enemy);
  }
  const low=set(0),high=set(1);
  if(target>high*1.01&&count<60){count=Math.min(60,Math.max(count+1,Math.ceil(count*target/high)));continue;}
  if(target<low*.99&&count>1){count=Math.max(1,Math.min(count-1,Math.floor(count*target/low)));continue;}
  let lo=0,hi=1,chosen=0,above=null,aboveE=Infinity;
  for(let i=0;i<26;i++){const mid=(lo+hi)/2,E=set(mid),d=Math.abs(Math.log(E/target));if(d<error){error=d;chosen=mid;}if(E>=target&&E<aboveE){above=mid;aboveE=E;}if(E<target)lo=mid;else hi=mid;}
  const current=set(above??chosen),factor=Math.min(1,target/current);
  for(const u of enemy){if(u.kind==='lion')u.L.condition.blood*=factor;else if(u.kind==='dog')window.DOG.cond(u.D).blood*=factor;else{const g=u.kind==='human'?u.g:u.R;g.fatigue=cl(125*(1-(1-g.fatigue/125)*factor),0,100);}}
  best=enemy;break;
 }
 if(!best)throw Error('Keine passende Gegnergruppe erzeugt');
 return best;
}
CH.matchedGroup=matchedGroup;
let serial=0;
function make(own,mode,seed,levels=LEVELS,options={}){
 if(!own.length)return [];
 const savedRng=S.rng;
 try{
 const r=rngOf(seed||Date.now()),Eo=Math.max(1e-6,teamE(own)),N=own.length,ownKind=own.some(u=>u.kind==='lion')?'lion':own.some(u=>u.kind==='rooster')?'rooster':own.some(u=>u.kind==='dog')?'dog':'human',used={},out=[];
 let previous=options.previous;
 for(const L of levels){
  const requested=options.variant==null?L.ratio:CH.levelRatio(L,options.variant),target=Eo*Math.max(requested,previous?previous.ratio*1.05:0);
  let best=null;const cross=N===10?false:r()<CH.CROSS;
  for(let attempt=0;attempt<(N===10?2:6)&&!best;attempt++){
   const ww=N===10?{gladiatoren:5,schuetzen:2}:weights(ownKind,cross);for(const key in used)if(Object.keys(ww).length>1)ww[key]*=.3;
   const tpl=weighted(r,ww);let enemy=null;try{enemy=TEMPLATES[tpl].build(r,target,N);}catch(e){console.warn(e);}
   if(enemy?.length&&Math.abs(Math.log(teamE(enemy)/target))<.035)best={tpl,enemy};
  }
  if(!best){const enemy=matchedGroup(r,target,N,ownKind);best={tpl:ownKind==='human'?'gladiatoren':ownKind==='rooster'?'haehne':ownKind==='dog'?(enemy.length>1?'meute':'hund'):enemy.length>1?'rudel':'loewe',enemy};}
  used[best.tpl]=(used[best.tpl]||0)+1;
  const p=pWin(own,best.enemy),g=gold(own,best.enemy,p),enemyE={};for(const u of best.enemy)enemyE[u.key]=strength(u);
  if(previous){g.win=Math.max(g.win,previous.gold.win+5);g.lossMax=Math.max(g.lossMax,previous.gold.lossMax);}
  const c={id:'c'+(++serial)+'-'+Math.floor(r()*1e6).toString(36),level:L,variant:options.variant??null,targetRatio:requested,tpl:best.tpl,label:TEMPLATES[best.tpl].label,name:pick(r,NAMES[best.tpl]),desc:(BEAST_DESC[best.tpl]?BEAST_DESC[best.tpl]+' ':'')+pick(r,DESC[LEVELS.indexOf(L)]),enemy:best.enemy,enemyE,ownKW:teamKW(own),enemyKW:teamKW(best.enemy),ratio:teamE(best.enemy)/Eo,p,gold:g};
  out.push(c);previous=c;
 }
 return out;
 }finally{S.rng=savedRng;}
}
CH.make=make;

// ---------- Vorstellungstexte (schwarzer Humor erlaubt) ----------
CH.threat=(u,ownE)=>{const s=strength(u),rel=s/Math.max(.05,ownE);
 if(u.kind==='human'){const g=u.g,k=M.power(g);
  if(k<24)return pick(Math.random,['Seine größte Leistung bisher: den Weg in die Arena lebend gefunden zu haben.','Hat sein Schwert gestern zum ersten Mal von der richtigen Seite gehalten.','Seine Mutter hat ihm verboten zu kämpfen. Er hätte auf sie hören sollen.','Kämpft für Brot. Hat heute noch nicht gefrühstückt.']);
  if(k<40)return pick(Math.random,['Ein ehrlicher Handwerker des Todes. Nichts Besonderes, aber gründlich.','Hat schon geblutet und weitergemacht. Das unterscheidet ihn von den meisten.','Zäh wie altes Leder, und ungefähr so hübsch.']);
  if(k<65)return pick(Math.random,['Erfahren. Wer ihn unterschätzt, wird es nur kurz bereuen.','Die Menge kennt seinen Namen. Seine Gegner meist nur noch seinen Schatten.','Hat mehr Gegner begraben als die meisten Priester.']);
  return pick(Math.random,['Eine lebende Legende. Die Betonung liegt auf „lebend“ – im Gegensatz zu seinen Gegnern.','Wenn er die Arena betritt, rechnen die Totengräber schon mal vor.','Unsere Spione weigerten sich, näher als hundert Schritte heranzugehen.']);}
 if(u.kind==='rooster'){const t=u.R.quality.tier;return t<=2?'Selbst die anderen Hühner haben Mitleid mit ihm.':t<=5?'Ein Hahn. Unterschätzen Sie nie, was Sporen an einem Knöchel anrichten.':'Kein Hahn, ein Gerücht mit Federn. Die Sporen sind gewetzt.';}
 if(u.kind==='dog'){const D=u.D,T=window.HF_TEXT?.RASSEN?.[D.breed];return T?T.notiz:'Ein Hund. Mehr Zähne als Manieren.';}
 const L=u.L;return L.kind==='verletzt'?'Humpelt. Blutet. Ist trotzdem ein Löwe.':L.kind==='alt'?'Alt, müde und schlecht gelaunt – eine gefährliche Mischung.':L.kind==='hunger'?'Seit Tagen nichts gefressen. Sie sind sein Menü.':L.kind==='menschen'?'Hat Geschmack an Menschen gefunden. Er bevorzugt sie lebend.':L.kind==='koenig'?'Ein König der Wüste. Er verneigt sich vor niemandem – auch nicht vor dem Kaiser.':'Jung, schnell und völlig ohne Respekt.';};
window.CHALLENGES_LOADED=true;
})();

