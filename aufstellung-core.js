'use strict';
// =====================================================================================================
// AUFSTELLUNGS-SIMULATOR (nur Testseite aufstellung-test.html, nicht im Spiel eingebunden)
// Rechnet echte Kämpfe mit der unveränderten Arena-Engine (AN.build + M.fixedStep, wie AN.headlessRun),
// misst dabei Spannung und Blut und bewertet daraus das Gold. Ändert keine Spieldateien und keinen Spielstand.
//
// Gold = Grundbörse × Risiko × Spektakel × Gelübde × Ruhm ÷ Verlustteiler
//   Grundbörse  = 210 × (KW-Summe Gegner / 30)^0,9   (2.11. nachmittags verdreifacht, Wunsch Thomas)                     (stärkere Gegner = größere Bühne)
//   Ansage      = 1 / (1 + (KW-Summe Gegner / KW-Summe eigen × (Köpfe Gegner / Köpfe eigen)^0,7)^3)
//                 (Siegchance laut Buchmacher; Überzahl zählt, gemessen in echten Kämpfen, balance.cjs)
//   Risiko      = (2·(1 − Ansage))^1,3, höchstens 2,5                  (sichere Kämpfe ≈ 0)
//   Spektakel   = aus dem echten Kampf gemessen (Führungswechsel, Aufholjagd, knappes Ende, Gefallene, Heldentaten)
//   Spektakel   = Führungswechsel + enges Ringen + Aufholjagd + knappes Ende + Blut auf BEIDEN Seiten (Tote, Schwer-, Leichtverletzte)
//                 + Heldentaten (steigend je Kill: 2 → 0,15 · 3 → 0,45 · 4 → 0,9 · 5 → 1,5 · 6 → 2,25) + Außenseiter + Schaubild
//   Verlustteiler (lossC) seit 2.11. mittags 0 = aus: eigene Verluste bringen Spektakel statt Abzug (Wunsch Thomas)
//   Niederlage: 30 % davon (die Menge zahlt für einen großen Kampf auch dem Verlierer etwas)
// =====================================================================================================
(G=>{
const M=G.MG,CH=G.Challenges,AN=G.AN,cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const A={};G.Aufstellung=A;

A.P={G0:210,bExp:.9,k:3,nExp:.7,riskExp:1.3,riskMax:2.5,lossC:0,severeW:.5,loseShare:.3,
 sBase:.3,sSwing:.3,sSwingMax:5,sTight:.6,sSevere:.06,sInjured:.02,sComeback:1.6,sClose:.7,sBlood:.12,sBloodMax:1.6,sUnder:.25,sHero:.15,sHeroMax:2.4,
 fameStep:10,fameMul:.006,sForm:.1,sFormMax:.3};

A.ROLES=['Soldat','Assassine','Fernkämpfer'];
A.ROWS=['vorne','mitte','hinten'];A.LANES=['oben','mitte','unten'];

// ---------- Kämpfer ----------
const NAMES=['Varro','Sextus','Crixus','Flamma','Spiculus','Tetraites','Priscus','Verus','Carpophorus','Hermes','Celadus','Marcus','Attilius','Oenomaus','Gannicus','Castus','Agron','Nasica','Rufus','Draco','Felix','Brennus','Lucan','Tiro','Aquila','Bato','Corax','Durio','Ennius','Galba'];
let nameIdx=0;
A.kw=g=>Math.round(M.power(g));
A.fighter=(r,role,kw,id)=>{
 const g=CH.gladiator(r,{q:cl((kw-33)/14,0,6),role,kwTarget:kw,enemy:false});
 // Rüstung nach Klasse wie im Spiel (Fernkämpfer Leder, Assassine verstärkt, Soldat Metall)
 {const mat=M.classArmor?.[role];if(mat&&g.enemyGear?.armor)for(const [id,it] of Object.entries(g.enemyGear.armor))if(it&&it.material!==mat)g.enemyGear.armor[id]=M.makeItem('armor',id,it.q??1,mat);}
 g.name=NAMES[nameIdx++%NAMES.length]+(nameIdx>NAMES.length?' '+Math.ceil(nameIdx/NAMES.length):'');
 return {id,role,name:g.name,g,kw:A.kw(g)};
};
// Test-Kader: je Klasse ein Held, einige Erfahrene, viele Rekruten
A.ROSTER_PLAN={Soldat:[118,74,56,44,36,28,22,18],Assassine:[96,61,43,33,25,19],Fernkämpfer:[82,52,38,27,20]};
A.roster=seed=>{const r=CH.rngOf(seed);nameIdx=0;const out=[];let n=0;
 for(const role of A.ROLES)for(const k of A.ROSTER_PLAN[role])out.push(A.fighter(r,role,k,'f'+(n++)));
 return out;};
A.recruit=(seed,role,n)=>{const r=CH.rngOf(seed);nameIdx=n;return A.fighter(r,role,Math.round(15+r()*25),'f'+n+'x'+seed);};

// ---------- Gegner-Angebote ----------
// Zusammensetzungen: wer gegen wen antritt, ändert die Taktik (Horde vs. Champion vs. Schützen)
A.KINDS={
 gemischt:{label:'Gladiatorenschule',n:N=>N,roles:(r,i)=>i===0?'Soldat':r()<.3?(r()<.5?'Assassine':'Fernkämpfer'):'Soldat',spread:.35},
 champion:{label:'Ein Champion',n:()=>1,roles:()=>'Soldat',spread:0},
 duo:{label:'Zwei Veteranen',n:()=>2,roles:(r,i)=>i?'Assassine':'Soldat',spread:.1},
 horde:{label:'Sklavenhorde',n:N=>Math.min(10,N*2+1),roles:(r,i)=>r()<.15?'Assassine':'Soldat',spread:.2},
 schuetzen:{label:'Schützen & Schilde',n:N=>Math.max(2,N),roles:(r,i)=>i%2?'Fernkämpfer':'Soldat',spread:.2},
 meuchler:{label:'Meuchlerbande',n:N=>Math.max(2,N),roles:(r,i)=>i===0?'Soldat':'Assassine',spread:.25},
 anfuehrer:{label:'Anführer mit Gefolge',n:N=>Math.max(3,N+1),roles:(r,i)=>i===0?'Soldat':r()<.3?'Fernkämpfer':'Soldat',spread:0,lead:true}};
// Fünf Angebote, eins je Totenkopf: Ziel-Ansage 90 / 72 / 55 / 37 / 20 %
A.SKULL_P=[.9,.72,.55,.37,.2];
A.skulls=pA=>pA>=.82?1:pA>=.63?2:pA>=.46?3:pA>=.29?4:5;
function enemyGroup(r,kind,kwSum,N){
 const K=A.KINDS[kind],n=K.n(N);let w=Array.from({length:n},()=>1+(r()*2-1)*K.spread);
 if(K.lead)w=w.map((v,i)=>i===0?n*.9:v);
 const tot=w.reduce((a,b)=>a+b,0);
 const units=w.map((v,i)=>{const kw=cl(Math.round(kwSum*v/tot),10,190),role=K.roles(r,i);
  const g=CH.gladiator(r,{q:cl((kw-33)/14,0,6),role,kwTarget:kw,enemy:true});
  return {kind:'human',key:'e'+i,row:role==='Fernkämpfer'||(n>=6&&i>=Math.ceil(n/2))?'back':'front',g};});
 return units;}
A.offers=(own,seed)=>{const r=CH.rngOf(seed),sum=own.reduce((a,f)=>a+f.kw,0),N=own.length,kinds=Object.keys(A.KINDS),out=[];
 A.SKULL_P.forEach((p,i)=>{let kind;const eff=Math.pow((1-p)/p,1/A.P.k);
  for(let t=0;t<10;t++){kind=kinds[Math.floor(r()*kinds.length)];if(!(N===1&&kind==='champion'&&i>=3)&&!out.some(o=>o.kind===kind))break;}
  const heads=A.KINDS[kind].n(N),enemy=enemyGroup(r,kind,sum*eff*(.97+r()*.06)/Math.pow(heads/N,A.P.nExp),N);
  out.push(A.describe({kind,label:A.KINDS[kind].label,enemy,id:'o'+seed+'-'+i,level:i+1},own));});
 return out;};
A.describe=(o,own)=>{const ownKW=own.reduce((a,f)=>a+f.kw,0),enKW=o.enemy.reduce((a,u)=>a+A.kw(u.g),0);
 const eff=enKW/Math.max(1,ownKW)*Math.pow(o.enemy.length/Math.max(1,own.length),A.P.nExp),pA=1/(1+Math.pow(eff,A.P.k)),base=A.P.G0*Math.pow(enKW/30,A.P.bExp),risk=Math.min(A.P.riskMax,Math.pow(2*(1-pA),A.P.riskExp));
 return Object.assign(o,{ownKW,enKW,eff,pA,base,risk,quote:1/Math.max(.02,pA),skulls:A.skulls(pA),
  roster:o.enemy.map(u=>({name:u.g.name,role:u.g.role,kw:A.kw(u.g)}))});};

// ---------- Aufstellung: 3 Reihen × 3 Bahnen ----------
// slot = {row:'vorne'|'mitte'|'hinten', lane:'oben'|'mitte'|'unten'}; Engine kennt nur Front/Rückreihe:
// hinten = Rückreihe (wartet, bis es ernst wird), vorne/mitte = Front; die Position setzen wir selbst.
const ROW_X={vorne:70,mitte:5,hinten:-80},LANE_Y={oben:250,mitte:390,unten:530};
A.autoSlot=role=>role==='Fernkämpfer'?{row:'hinten',lane:'mitte'}:role==='Assassine'?{row:'mitte',lane:'oben'}:{row:'vorne',lane:'mitte'};
function placeOwn(b,lineup){
 /* große Arena (sim.js growArena): Plätze gelten im alten 1040×720-Feld und werden wie dort in die Mitte des größeren Feldes geschoben */
 const G=b.view||1,F=G>1&&M.fieldGeom?M.fieldGeom(b):null,dx=F?F.cx*(1-1/G):0,dy=F?F.cy*(1-1/G):0;
 const cells={};for(const L of lineup){const k=L.slot.row+L.slot.lane;(cells[k]=cells[k]||[]).push(L);}
 for(const list of Object.values(cells))list.forEach((L,i)=>{const a=b.actors.find(x=>x.team===0&&x.unitKey===L.id);if(!a)return;
  a.x=dx+260+ROW_X[L.slot.row]+(i%2)*-22;a.y=dy+cl(LANE_Y[L.slot.lane]+(i-(list.length-1)/2)*46,170,610);a.row=L.slot.row==='hinten'?'back':'front';M.fieldPt?.(a,(a.r||14)+6,b);});}

// ---------- Kampf mit Messung ----------
// Der Messer läuft neben dem Kampf her: headless (A.fight) oder sichtbar in der Kampfansicht (tick je Simulationsschritt)
const alive=a=>!a.g.dead&&!a.down&&!a.surrendered&&!a.fled&&!a.submit;
function hp(a){try{return a.unit.kind==='human'?cl(M.health(a.g)/100,0,1):1;}catch{return 1;}}
A.spec=(lineup,offer,copy=true)=>{const blue=lineup.map(L=>({kind:'human',key:L.id,row:L.slot.row==='hinten'?'back':'front',g:L.g}));
 const spec={title:offer.label,blue,red:offer.enemy};return copy?JSON.parse(JSON.stringify(spec)):spec;};
A.place=placeOwn;
A.tracker=(b,lineup,offer,opt={})=>{
 const kwOf={};for(const a of b.actors)kwOf[a.unitKey+'|'+a.team]=a.team===0?(lineup.find(L=>L.id===a.unitKey)||{}).kw||A.kw(a.g):A.kw(a.g);
 const K=a=>kwOf[a.unitKey+'|'+a.team]||30,curve=[],events=[],dead=new Set();
 const strength=t=>b.actors.filter(a=>a.team===t&&alive(a)).reduce((s,a)=>s+K(a)*(.35+.65*hp(a)),0);
 const s0=[Math.max(1,strength(0)),Math.max(1,strength(1))];let n=0;
 const sample=()=>{const t=Math.round((b.time-b.startTime)*10)/10,s=[strength(0),strength(1)];curve.push([t,s[0]/s0[0],s[1]/s0[1]]);
  for(const a of b.actors){const key=a.team+'|'+a.unitKey;
   if(!dead.has(key)&&(a.g.dead||a.down||a.surrendered||a.fled||a.submit)){dead.add(key);
    events.push({t,type:a.g.dead?'tot':'kampfunfaehig',team:a.team,name:a.g.name,kw:K(a),by:a.g.killer||''});}}};
 return {b,tick(){if(++n%15===0)sample();},
  done(out){sample();const actorKW={};for(const a of b.actors)actorKW[a.team+'|'+a.unitKey]={kw:K(a),name:a.g.name,team:a.team,id:a.unitKey};
   return A.judge({out,curve,events,actorKW,s0,lineup,offer,vows:opt.vows||[],hero:opt.hero||null,fame:opt.fame||0});}};
};
A.fight=(lineup,offer,opt={})=>{
 const S=M.s;S.battle=AN.build(A.spec(lineup,offer));M.stains=[];M.limbs=[];M.swings=[];M.floaters=[];M.shake=0;
 const b=S.battle;placeOwn(b,lineup);const T=A.tracker(b,lineup,offer,opt);
 let out=null;AN.listeners.push(o=>{out=o;});
 const dt=1/60,limit=Math.ceil((AN.TMAX+60)/dt)+5400;let n=0;
 while(S.battle&&!out&&n<limit){M.fixedStep(dt);n++;T.tick();}
 if(!out){out=AN.outcome(b,-1);out.stuck=true;}
 const res=T.done(out);S.battle=null;S.records=[];S.inventory=[];return res;
};

// ---------- Bewertung ----------
A.judge=({out,curve,events,actorKW,s0,lineup,offer,vows,hero,fame})=>{
 const P=A.P,won=out.winner===0,N=lineup.length;
 const own=out.units.filter(u=>u.team===0),foe=out.units.filter(u=>u.team===1);
 const deaths=own.filter(u=>u.dead).length,severe=own.filter(u=>!u.dead&&u.severe).length,injured=own.filter(u=>!u.dead&&!u.severe&&u.injured).length;
 // Spannung: Anteil der eigenen Restkraft an der Gesamtkraft, Führungswechsel mit Schwelle
 let lead=0,swings=0,minShare=1,maxShare=0,tightN=0,allN=0;const swingT=[];
 for(const [t,a,e] of curve){const sh=a/(a+e||1);if(t>2){minShare=Math.min(minShare,sh);maxShare=Math.max(maxShare,sh);}
  if(t>2){allN++;if(Math.abs(sh-.5)<.1)tightN++;}const now=sh>.56?1:sh<.44?-1:lead;if(lead&&now!==lead){swings++;swingT.push(t);}lead=now;}
 const last=curve[curve.length-1]||[0,1,1],rest=won?last[1]:last[2];
 const comeback=won?cl((.42-minShare)/.42,0,1):0,choke=!won&&out.winner===1?cl((maxShare-.58)/.42,0,1):0;
 const close=out.winner===-1?.5:cl(1-rest,0,1);
 const fallen=events.filter(e=>e.type==='tot').length,tight=allN?tightN/allN:0;
 // Blut auf beiden Seiten: Tote, Schwer- und Leichtverletzte – eigene zählen genauso wie die des Gegners
 const all=out.units,deadAll=all.filter(u=>u.dead).length,sevAll=all.filter(u=>!u.dead&&u.severe).length,injAll=all.filter(u=>!u.dead&&!u.severe&&u.injured).length;
 // Heldentaten: Kills je Kämpfer, Außenseiter-Kills (Opfer stärker als Täter)
 let heroBonus=0,underBonus=0;const heroes=[];
 const ownAvg=lineup.reduce((a,L)=>a+L.kw,0)/Math.max(1,N);
 for(const u of out.units){const me=actorKW[u.team+'|'+u.key];if(!me)continue;
  if(u.kills>=2)heroBonus+=P.sHero*u.kills*(u.kills-1)/2*(u.team===0?1:.5);
  if(u.kills>=3)heroes.push({name:me.name,kills:u.kills,team:u.team,id:u.key});}
 for(const e of events){if(e.type!=='tot'&&e.type!=='kampfunfaehig')continue;const killer=Object.values(actorKW).find(x=>x.name===e.by&&x.team!==e.team);
  if(killer&&e.kw>killer.kw*1.15){underBonus+=P.sUnder*Math.min(2,e.kw/killer.kw-1);e.under=true;}}
 const dur=out.time;const tempo=dur<12?.7:out.timeout?.8:1;
 const parts={grund:P.sBase,spannung:P.sSwing*Math.min(swings,P.sSwingMax),aufholjagd:P.sComeback*comeback*.5+P.sComeback*choke*.25,knapp:P.sClose*close,
  enge:P.sTight*tight,
  blut:Math.min(P.sBloodMax,P.sBlood*deadAll+P.sSevere*sevAll+P.sInjured*injAll),aussenseiter:Math.min(1,underBonus),helden:Math.min(P.sHeroMax,heroBonus),
  schaubild:Math.min(P.sFormMax,P.sForm*A.formations(lineup,hero).length)};
 let spect=Object.values(parts).reduce((a,b)=>a+b,0)*tempo;spect=Math.round(spect*100)/100;
 // Gelübde
 const vowRes=[];let vowMul=1;
 for(const v of vows){const V=A.VOWS[v];if(!V)continue;const ok=V.test({won,deaths,severe,dur,out,hero,heroes,N,spect});vowMul*=ok?V.win:V.fail;vowRes.push({key:v,label:V.label,ok,mul:ok?V.win:V.fail});}
 const lossRate=(deaths+P.severeW*severe)/Math.max(1,N),divisor=1+P.lossC*lossRate;
 const fameMul=cl(1+fame*P.fameMul,.5,2);
 const raw=offer.base*offer.risk*spect*vowMul*fameMul/divisor*(won?1:P.loseShare);
 const gold=Math.max(0,Math.round(raw/5)*5);
 const fameDelta=Math.round((spect-1)*P.fameStep)-(offer.pA>.9&&won?3:0);
 return {won,draw:out.winner===-1,winner:out.winner,time:dur,timeout:!!out.timeout,deaths,severe,injured,N,lossRate,divisor,
  swings,swingT,minShare,comeback,close,fallen,heroes,parts,tempo,spect,vowRes,vowMul,fameMul,fameDelta,gold,
  base:offer.base,risk:offer.risk,pA:offer.pA,curve,events,
  units:out.units.map(u=>({key:u.key,team:u.team,name:u.name,dead:u.dead,severe:u.severe,injured:u.injured,health:u.health,kills:u.kills,injuries:u.injuries||[],cause:u.cause||'',killer:u.killer||''}))};
};

// ---------- Schaubilder: benannte Formationen, die das Publikum erkennt (+Spektakel, ändern den Kampf nicht) ----------
const at=(L,row,lane,role)=>L.filter(x=>(!row||x.slot.row===row)&&(!lane||x.slot.lane===lane)&&(!role||x.role===role));
A.FORMATIONS=[
 {key:'schildwall',label:'Schildwall',hint:'3+ Soldaten in der vorderen Reihe',test:L=>at(L,'vorne',null,'Soldat').length>=3},
 {key:'zange',label:'Zange',hint:'Assassinen auf der oberen und der unteren Bahn',test:L=>at(L,null,'oben','Assassine').length>0&&at(L,null,'unten','Assassine').length>0},
 {key:'pfeilhagel',label:'Pfeilhagel',hint:'2+ Fernkämpfer in der hinteren Reihe',test:L=>at(L,'hinten',null,'Fernkämpfer').length>=2},
 {key:'keil',label:'Keil',hint:'★-Held vorne Mitte, dahinter oben und unten je einer',test:(L,h)=>at(L,'vorne','mitte').some(x=>x.id===h)&&at(L,'mitte','oben').length>0&&at(L,'mitte','unten').length>0},
 {key:'dreiklang',label:'Drei Klassen',hint:'Soldat, Assassine und Fernkämpfer dabei',test:L=>A.ROLES.every(r=>L.some(x=>x.role===r))},
 {key:'allein',label:'Einer gegen alle',hint:'Nur ein einziger Kämpfer',test:L=>L.length===1}];
A.formations=(L,hero)=>A.FORMATIONS.filter(F=>{try{return F.test(L,hero);}catch{return false;}}).map(F=>F.key);

// ---------- Gelübde vor dem Kampf (Wette auf sich selbst, ändern den Kampf nicht) ----------
A.VOWS={
 keiner:{label:'Niemand fällt',hint:'Kein eigener Toter: ×1,5 · sonst ×0,6',win:1.5,fail:.6,test:x=>x.deaths===0&&x.won},
 held:{label:'Der Held',hint:'Dein ★-Held schafft 3+ Gegner: ×1,7 · sonst ×0,7',win:1.7,fail:.7,test:x=>!!x.hero&&x.heroes.some(h=>h.team===0&&h.id===x.hero)},
 blitz:{label:'Blitzsieg',hint:'Sieg in unter 25 s: ×1,4 · sonst ×0,75',win:1.4,fail:.75,test:x=>x.won&&x.dur<25},
 menge:{label:'Vor vollen Rängen',hint:'Spektakel 1,5 oder mehr: ×1,5 · sonst ×0,7',win:1.5,fail:.7,test:x=>x.spect>=1.5}};

// ---------- Vorhersage ohne Kampf (für die Karte): erreichbares Gold bei gutem Kampf ----------
A.preview=o=>({sicher:o.pA>.9,typisch:Math.round(o.base*o.risk*1.0/5)*5,episch:Math.round(o.base*o.risk*2.4/5)*5});
})(typeof globalThis!=='undefined'?globalThis:self);
