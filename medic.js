'use strict';
// KAPITEL „DER MEDIKUS“ · folgt im Spiel direkt auf das Löwen-Kapitel (Start, sobald dieses in der laufenden Sitzung endet).
// Die eigenständige Testversion (prototypes/medikus) lädt dieselbe Datei mit window.MEDIC_TEST: nur dort gibt es Szenenwahl und Startkarte.
// Ablauf: neuer Tag, fünf Rekruten vom echten Sklavenhändler, Talent, die Kiste des Schmieds,
// Verletzungen an den fünf (Schnitt, stumpf, Stich, Bruch, Amputation), Erste Hilfe, echtes Krankenhausmenü.
// Figuren, Waffen, Körpermodell, Wundnamen, Narben, Historie, Heilung und Behandlung stammen aus dem Spiel.
// Die Treffer selbst sind festgelegte Testereignisse: gleiche Zustandsänderungen wie hit()/hammerCrush()/sever() in sim.js, aber ohne Zufall.
(()=>{
const M=window.MG,S=M.s,A=M.army,B=M.barracks,cl=M.clamp,TEST=!!window.MEDIC_TEST;
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const K=.6; // Maßstab der Figuren in der Ludus-Kulisse (wie renderLudusActors)
const Wk=()=>M.workshop.state,smithName=()=>Wk().master?.name||'Der Schmied';
const Tr=()=>M.trader.state,traderName=()=>Tr().person.name,traderShort=()=>traderName().split(' ').pop();
const fresh=()=>({stage:'',ids:[],order:[],ev:{},vis:{},chained:0,crate:false,treated:{},seen:{}});
const st=()=>S.medic??=fresh();
const byId=id=>S.roster.find(g=>g.id===id);
const recs=()=>st().order.map(byId).filter(Boolean);
const first=g=>String(g?.name||'Rekrut').split(' ')[0];
const vis=g=>st().vis[g.id]??={};
const fmt=(n,d=0)=>Number(n).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d});
const items={};const item=def=>items[def]??=M.makeItem('weapon',def,1);
const wdef=id=>M.weaponDefs.find(w=>w.id===id);
const GRADE=['Kratzer','Leicht','Mittel','Schwer','Kritisch','Verloren'];
let bgCache=null;const backdrop=()=>bgCache??=M.ludus.background();

// =====================================================================================================
// 1 · VERLETZUNGEN: festgelegte Testereignisse mit den Regeln des Kampfsystems
// =====================================================================================================
// Entspricht dem Kern von hit() in sim.js (Blut, Zustand, Schmerz, Grad, Bruchregel, Wundname über M.woundType,
// Historie über M.recordWound/M.noteInjury, Narbe ab Grad 3, Blutung bei Klingen). Kein Zufall, kein Kampf nötig.
function wound(g,part,wid,dmg,o={}){
 const p=g.body[part],def=wdef(wid),it=item(wid),arrow=M.arrowHit(def,!!o.projectile),w={...M.itemStats(it),attackKey:o.thrust?'thrust':undefined},attacker={g:{name:smithName()},technique:o.thrust?'thrust':null},before={hp:p.hp,grade:M.injuryGrade(p),blood:g.blood};
 g.blood=cl(g.blood-dmg*.025,0,100);p.hp=Math.max(0,p.hp-dmg);p.pain=cl(p.pain+dmg*(1-g.stats.toughness*.005),0,100);p.grade=M.injuryGrade(p);
 if(!def.bladed&&!arrow&&p.grade>=3&&!['head','neck','chest','belly'].includes(part)&&!p.fracture)p.fracture={days:p.hp<20?42:21,severe:p.hp<20};
 if(o.crush){/* hammerCrush() */p.hp=Math.min(p.hp,18);p.fracture={days:54,total:54,severe:true,crushed:true};p.pain=Math.max(p.pain,85);p.chronic=Math.max(p.chronic,8);p.grade=M.injuryGrade(p);M.noteInjury(g,part,'Trümmerbruch');M.addScar(g,part,'Schwerer Trümmerbruch');}
 const v=vis(g);if(def.bladed||arrow){v.marks??={};v.marks[part]=Math.min(1,(v.marks[part]||0)+dmg/65);}
 const injury=M.woundType(attacker,part,w,dmg,p,!!o.projectile);M.recordWound(g,part,injury,smithName(),M.itemTitle(it),dmg);
 if(p.injury!==injury){M.noteInjury(g,part,injury);if(p.grade>=3)M.addScar(g,part,injury);}
 if(injury==='Gehirnerschütterung')p.pain=Math.min(100,p.pain+8);if(injury==='Sehnenverletzung'||injury==='Gelenkverletzung')p.pain=Math.min(100,p.pain+6);
 p.bleed+=def.bladed||arrow?dmg*.035*(1+p.grade*.35):0;
 if(o.projectile&&['bow','crossbow'].includes(wid)){v.embedded??=[];v.embedded.push({kind:wid,part,angle:.25,offset:1});}
 return {g,part,injury,dmg,weapon:M.itemTitle(it),wid,before};}
// Entspricht sever() in sim.js: Zweig abtrennen, Narbe „Amputation“, Blutung 18 am Stumpf, Eintrag in Wundhistorie.
function sever(g,part,wid){const it=item(wid);for(const k of M.branches[part]){const p=g.body[k];p.missing=true;p.hp=0;p.bleed=0;p.grade=5;p.injury='Abgetrennt';M.addScar(g,k,'Amputation');}
 g.body[part].bleed=18;g.stump='blood';g.blood=cl(g.blood-6,0,100);M.noteInjury(g,part,'Abgetrennt',smithName(),M.itemTitle(it));return {g,part,injury:'Abgetrennt',dmg:0,weapon:M.itemTitle(it),wid,severed:true};}
// Entspricht dem Abschluss von fieldAid() in sim.js: jede blutende Stelle bekommt einen Verband, die Blutung endet.
function dress(g){const v=vis(g);v.dressings??={};let n=0;for(const [id,p] of Object.entries(g.body))if(p.bleed>0){v.dressings[id]=true;p.bleed=0;n++;}if(g.stump==='blood')g.stump='bandage';return n;}
const bleedOf=g=>Object.values(g.body).reduce((n,p)=>n+p.bleed,0);
// Heilprognose je Behandlungsstufe: rechnet treat() und die Heilung aus advanceDay() (data.js) auf einer Kopie Tag für Tag durch.
function forecast(g0,tier){const g=M.copy(g0),H=S.buildings.hospital;let treat=tier?{tier,days:4}:null;
 for(const p of Object.values(g.body)){p.bleed=0;if(p.missing)continue;p.hp=Math.min(p.fracture?64:p.internal?60:100-p.chronic,p.hp+[0,8,20,35][tier]);if(tier>0&&p.chronic>0)p.chronic=Math.min(p.chronic,Math.max(1,Math.round(p.chronic*(1-[0,.03,.08,.18][tier])*100)/100));}
 g.blood=Math.min(100,g.blood+tier*15);
 const open=()=>g.blood<100||Object.values(g.body).some(p=>!p.missing&&(p.fracture||p.internal||p.hp<100-p.chronic));let days=0;
 const X=M.HEAL_SPEED||1;while(open()&&days<400){days++;g.blood=Math.min(100,g.blood+12*X);for(const p of Object.values(g.body)){if(p.missing)continue;let heal=(3+H+(treat?[0,7,16,26][treat.tier]:0))*X;if(p.fracture){p.fracture.days=Math.min(p.fracture.days,20*X);p.fracture.days=Math.max(0,p.fracture.days-(treat?1+treat.tier*.2:1)*X);heal=Math.min(heal,2.5*X);if(p.fracture.days>0)p.hp=Math.min(p.hp,64);else p.fracture=null;}if(p.internal){p.internal.days=Math.max(0,p.internal.days-X);heal=Math.min(heal,2*X);if(!p.internal.days)p.internal=null;}p.hp=Math.min(p.fracture?64:p.internal?60:100-p.chronic,p.hp+heal);}if(treat&&--treat.days<=0)treat=null;}
 const chronic=Object.values(g.body).reduce((n,p)=>n+(p.missing?0:p.chronic),0),lost=Object.entries(g.body).filter(([,p])=>p.missing).length;
 return {days,chronic,lost,cost:M.medicalCost(g0,tier),kw:M.power(g)};}
const partLine=(g,id)=>{const p=g.body[id];return p.missing?'Amputation':p.injury||'Verletzt';};
const partDays=p=>{const X=M.HEAL_SPEED||1;return p.missing?null:Math.max(Math.ceil((100-p.chronic-p.hp)/((3+S.buildings.hospital)*X)),Math.ceil((p.fracture?.days||0)/X),Math.ceil((p.internal?.days||0)/X),0);};
const limbText=g=>{const l=M.limbState(g),pc=v=>Math.round(v*100)+' %';return `Arme L ${pc(l.left)} · R ${pc(l.right)} · Beine L ${pc(l.ll)} · R ${pc(l.rl)} · Beweglichkeit ${pc(l.mobility)}`;};

// ---------- Die Ereignisse der Lektion (Reihenfolge = Talent-Rang 1 bis 5) ----------
const R=i=>recs()[i];
const EV={
 r1a:()=>wound(R(0),'lfa','dagger',6),r1b:()=>wound(R(0),'lfa','dagger',12),
 r2a:()=>wound(R(1),'lua','club',8),r2b:()=>wound(R(1),'lua','club',14),r2c:()=>{const r=wound(R(1),'lua','club',22);return r;},r2d:()=>wound(R(1),'rs','mace',18),r2e:()=>wound(R(1),'head','club',19),
 r3a:()=>wound(R(2),'rt','spear',16,{thrust:true}),r3b:()=>{const r=wound(R(2),'rt','spear',30,{thrust:true});vis(R(2)).kneel=true;return r;},r3c:()=>wound(R(2),'ls','bow',15,{projectile:true}),r3d:()=>{vis(R(2)).net=true;return {g:R(2),net:true};},r3e:()=>{vis(R(2)).net=false;},
 r4a:()=>wound(R(3),'lfa','mace',34),r4b:()=>wound(R(3),'lfa','mace',30),r4c:()=>{const r=wound(R(3),'rsh','hammer',68,{crush:true});Object.assign(vis(R(3)),{down:true,agony:'leg',at:[388,446]});return r;},
 r5a:()=>wound(R(4),'rt','long',26),r5b:()=>wound(R(4),'lh','gladius',61),r5c:()=>{const r=sever(R(4),'lua','axe');Object.assign(vis(R(4)),{down:true,agony:'arm',at:[378,486]});return r;},
 aid3a:()=>{Object.assign(vis(R(2)),{down:true,kneel:false,agony:'leg'});},aid3:()=>dress(R(2)),aid5:()=>dress(R(4)),
 free:()=>{vis(R(0)).free=true;}
};
const SCENE_EV={5:['r1a','r1b'],6:['r2a','r2b','r2c','r2d','r2e'],7:['r3a','r3b','r3c','r3d','r3e'],8:['r4a','r4b','r4c'],9:['r5a','r5b','r5c'],10:['free','aid3a','aid3','aid5']};
function fire(key){const s=st();if(s.ev[key])return null;s.ev[key]=true;return EV[key]();}

// =====================================================================================================
// 2 · FILMBÜHNE (wie in lion.js: Takte mit Text, Kamera, Figuren; dazu Karten zum Antippen)
// =====================================================================================================
let film=null,clock=0;
function play(o){stopFilm();const v=document.createElement('div');v.className='smith-ceremony smith-intro lion-film medic-film no-smith-song';
 v.innerHTML='<div><div class="medic-top"><span>'+esc(o.label||'')+'</span><button class="btn small" type="button" data-medic="skip">SZENE ÜBERSPRINGEN ›</button></div><div class="scene-bubble-slot"><div class="scene-bubble" id="medicBubble" hidden></div></div><canvas id="medicCanvas" width="660" height="420"></canvas><p id="medicText" aria-live="polite"></p><div id="medicInfo" hidden></div></div>';
 document.body.appendChild(v);
 v.addEventListener('click',e=>{if(!film)return;if(e.target.closest?.('[data-medic="skip"]')){e.stopPropagation();skipScene();return;}if(film.shot){film.shot.skip();return;}if(film.line||film.hold){if(film.bt>.25)film.ack=true;}else if(film.beats[film.i]?.tapSkip)film.skip=true;});
 film={floats:[],fx:[],stains:[],limbs:[],props:[],...o,view:v,i:-1,t:0,bt:0,line:null,shown:0,cam:{...(o.cam||{x:450,y:410,vw:300})},camTo:null};next();}
function stopFilm(){film?.view?.remove();film=null;}
const need=t=>Math.max(2.3,1.1+t.length*.062);
function next(){const f=film;f.i++;f.bt=0;f.shown=0;f.ack=false;f.skip=false;const b=f.beats[f.i];if(!b){const done=f.done;stopFilm();done?.();return;}b.do?.(f);if(!film||film!==f)return;f.line=b.say?{who:b.who||'s',text:typeof b.say==='function'?b.say(f):b.say}:null;f.hold=!!b.hold;if(b.cam)f.camTo={...b.cam};if('card' in b)setCard(typeof b.card==='function'?b.card(f):b.card,f.hold);}
// ---------- Nahaufnahmen der Verletzungen (injury-shots.js) · abschaltbar; fehlt das Modul, läuft der Film wie zuvor ----------
let shotsOn=true;
function shotFor(r,o={}){const g=r.g,p=g.body[r.part],gr=M.injuryGrade(p),cons=p.missing?'für immer verloren':p.fracture?.crushed?'Dauerschaden: heilt nie ganz':p.fracture?'Bruch: mindestens '+Math.ceil(p.fracture.days/(M.HEAL_SPEED||1))+' Tage':p.chronic>0?'Dauerschaden':p.bleed>0?'blutet weiter':'';
 return {g,part:r.part,injury:r.injury,wid:r.wid,line1:smithName()+' ('+r.weapon+') fügt '+g.name+' zu:',title:r.injury,line3:[p.missing?'':'Grad '+gr+' ('+GRADE[gr]+')',cons].filter(Boolean).join(' · '),color:gr>=3?'#f29b83':'#f4d37a',...o};}
// Stellt die Nahaufnahme in die Warteschlange; „after“ (Reaktion im Hof) läuft danach. Ohne Nahaufnahmen sofort.
function closeup(f,o,after){if(!shotsOn||!M.injuryShots||S.options?.closeups==='off'){after?.(f);return;}(f.shots??=[]).push({o,after});}
function stepShot(f,dt){if(!f.shot){f.shotJob=f.shots.shift();f.shot=M.injuryShots.start(f.shotJob.o);}
 if(!f.shot.step(dt)){const j=f.shotJob;f.shot=null;f.shotJob=null;j.after?.(f);if(film===f&&!f.shots.length)paintFilm();return;}
 const c=$('medicCanvas');if(c?.getContext)f.shot.paint(c.getContext('2d'),c.width,c.height);}
function stepFilm(dt){const f=film;if(f.shot||f.shots?.length){stepShot(f,dt);return;}f.t+=dt;f.bt+=dt;const b=f.beats[f.i];if(!b)return;b.each?.(f,dt,f.bt);if(film!==f)return;f.tick?.(f,dt);if(f.camTo){const k=Math.min(1,dt*(f.camTo.rate||2));for(const key of ['x','y','vw'])if(f.camTo[key]!=null)f.cam[key]+=(f.camTo[key]-f.cam[key])*k;}
 if(f.line)f.shown+=dt;const busy=b.until?!b.until(f):false,read=f.hold?f.ack:(!f.line||f.ack||f.shown>=need(f.line.text));
 if(read&&!busy&&(f.hold||f.bt>=(b.dur||0)||f.skip))next();else paintFilm();}
function speaker(who){const f=film;if(who==='s')return {name:smithName(),a:f.smith};if(who==='t')return {name:traderName(),a:f.trader};if(who&&who[0]==='r'){const a=f.rec?.[+who.slice(1)-1];return {name:first(a?.g),a};}return {name:''};}
function paintFilm(){const f=film;if(!f)return;const c=$('medicCanvas');if(!c?.getContext)return;const g=c.getContext('2d');g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;f.paint(g,c.width,c.height,f);
 const el=$('medicBubble');if(el){if(!f.line||f.line.who==='cap'){if(!el.hidden)el.hidden=true;}else{const s=speaker(f.line.who),key=s.name+'|'+f.line.text;if(el._key!==key){el._key=key;el.innerHTML='<b>'+esc(s.name)+'</b><span>'+esc(f.line.text)+'</span><i aria-hidden="true">▼</i>';el.classList.toggle('loud',/!$/.test(f.line.text)&&f.line.text===f.line.text.toUpperCase());}if(el.hidden)el.hidden=false;const tail=Math.round(f.tailX?.(s.a)??50),wait=!!(f.hold||f.shown>=need(f.line.text)*.6);/* nur bei Änderung anfassen, sonst rechnet der Browser jedes Bild neu */if(el._tail!==tail){el._tail=tail;el.style.setProperty('--tail',tail+'%');}if(el._wait!==wait){el._wait=wait;el.classList.toggle('waiting',wait);}}}
 const t=$('medicText'),s=f.line?speaker(f.line.who):null,txt=f.line?(f.line.who==='cap'?f.line.text:s.name+': „'+f.line.text+'“'):'';if(t&&t.textContent!==txt)t.textContent=txt;}
function setCard(html,hold){const el=$('medicInfo');if(!el)return;if(!html){el.hidden=true;el.innerHTML='';return;}el.hidden=false;el.innerHTML=html+(hold?'<small class="medic-tap">TIPPEN ▸</small>':'');for(const c of el.querySelectorAll('canvas[data-w]'))M.renderGear(c,item(c.dataset.w));for(const c of el.querySelectorAll('canvas[data-body]')){const g=byId(c.dataset.body);if(g)M.renderBody(c,g,c.dataset.part||'chest',true);}for(const c of el.querySelectorAll('canvas[data-face]')){const g=byId(c.dataset.face);if(g)M.renderPortrait(c,g,{unarmored:true});}el.scrollIntoView?.({block:'nearest'});}

// ---------- Figuren ----------
function smithActor(x,y){const p=Wk().master,rng=S.rng,g=M.makeGladiator(0);S.rng=rng;Object.assign(g,{id:'medic-smith',name:p.name,height:p.height,weight:p.weight,muscle:58,fame:0,scars:[]});g.appearance={...p.appearance};g.equipment={weapon:null,secondary:null,shield:null,armor:{}};g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};
 return {id:'medic-smith',g,team:0,x,y,a:0,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,forgeWorker:true,forgeHold:'beer',bloodMarks:{},noNav:true};}
function traderActor(x,y){return {id:'medic-trader',g:M.trader.figure(),team:0,x,y,a:0,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,trader:true,noNav:true};}
function recActor(g,i){const v=vis(g),at=v.at||ROW[i];return {id:'mr-'+g.id,g,slot:i,team:0,x:at[0],y:at[1],a:Math.PI,phase:i*1.7,state:'idle',energy:100,ammo:0,moveSpeed:0,unarmored:true,noNav:true,seed:i*2.3};}
const pose=(a,o)=>Object.assign(a,{state:'idle',moveSpeed:0,traderPose:null,forgePose:'',...o});
const RANGED={bow:'Fernkämpfer',crossbow:'Fernkämpfer',net:'Soldat',javelin:'Assassine',throwaxe:'Assassine'};
const hold=(a,def)=>{a.role0??=a.g.role;a.g.role=RANGED[def]||a.role0;a.g.enemyGear.secondary=def&&!RANGED[def]?item(def):null;a.g.enemyGear.weapon=def&&RANGED[def]?item(def):null;a.ammo=a.g.enemyGear.weapon?3:0;a.forgeHold=def?null:'beer';a.held=def||null;};
function walker(a,dt){if(!a.to)return false;const dx=a.to[0]-a.x,dy=a.to[1]-a.y,d=Math.hypot(dx,dy),s=(a.to[2]||40)*dt;if(d<=s){a.x=a.to[0];a.y=a.to[1];if(a.to[3]!=null)a.a=a.to[3];a.to=null;a.state='idle';a.moveSpeed=0;return false;}a.x+=dx/d*s;a.y+=dy/d*s;a.state='move';a.moveSpeed=10;a.odo=(a.odo||0)+s;a.phase=a.odo*.267;if(Math.abs(dx)>.5)a.a=dx>0?0:Math.PI;return true;}
// Sichtbarer Zustand eines Rekruten aus dem gemerkten Szenenzustand (übersteht Überspringen und Szenenwahl)
function applyVis(a,dt){const v=vis(a.g),s=st();a.shackled=s.chained>a.slot&&!v.free;if(a.fallT>0){a.fallT-=dt;a.fallDuration=2.1;a.fallTimer=1.3+Math.max(0,a.fallT);a.down=false;}else{a.fallTimer=0;a.down=!!v.down;}
 if(a.down){a.fallSide=-1;a.agony={pose:v.agony==='arm'?2:1,part:v.agony||'leg',rate:7,live:.8,lie:1.35};}else a.agony=null;
 a.kneeDuration=99;a.kneeTimer=v.kneel&&!a.down&&!(a.fallT>0)?97:0;a.embedded=v.embedded||[];a.dressings=v.dressings||{};a.bloodMarks=v.marks||{};a.netTimer=v.net?9:0;
 a.hit=Math.max(0,(a.hit||0)-dt);a.facePain=Math.max(v.down||v.kneel?.6:0,(a.facePain||0)-dt*.5);a.stagger=Math.max(0,(a.stagger||0)-dt);a.jumpTimer=Math.max(0,(a.jumpTimer||0)-dt);}
// Körperstelle einer Figur in Kulissen-Koordinaten (M.contactAnchor rechnet im Arenamaßstab)
const anchor=(a,part)=>{const p=M.contactAnchor({...a,x:0,y:0},part);return {x:a.x+p.x*K,y:a.y+p.y*K};};
function drawActor(g,a){const d={...a};if(a.cp)d.contactPoint={x:(a.cp.x-a.x)/K,y:(a.cp.y-a.y)/K};if(a.pv)d.previewVictim={...a.pv,x:(a.pv.x-a.x)/K,y:(a.pv.y-a.y)/K};M.renderForgeActors(g,[d]);}
// Angriff mit sichtbarem Kontakt: ausholen, schlagen, im Moment der Berührung trifft das Ereignis
function attack(a,vic,part,o){a.atk={vic,part,t:0,wind:o.wind??.5,swing:o.swing??.32,tech:o.tech||'slash',onHit:o.onHit,pierce:o.pierce,variant:o.variant||0};a.a=vic.x>=a.x?0:Math.PI;}
function stepAttack(a,dt,f){if(a.pierceContact){a.pierceContact.left-=dt;if(a.pierceContact.left<=0){a.pierceContact=null;a.pv=null;const done=a.pierceDone;a.pierceDone=null;done?.(f);}}
 const k=a.atk;if(!k){if(a.pierceContact)a.state='piercing';return;}k.t+=dt;a.attackVariant=k.variant;
 if(k.t<k.wind){a.state='attack';a.technique=k.tech;a.windMax=k.wind;a.wind=k.wind-k.t;a.swing=0;}
 else if(k.t<k.wind+k.swing){a.wind=0;a.swingKind=k.tech;a.swingMax=k.swing;a.swing=Math.max(.001,k.wind+k.swing-k.t);if(k.tech!=='shoot')a.cp=anchor(k.vic,k.part);if((k.t-k.wind)/k.swing>=.55&&!k.hit){k.hit=true;k.onHit?.(f);if(k.pierce){a.pierceContact={target:k.vic.id,part:k.part,left:.5};a.pv=k.vic;a.pierceDone=k.pierce;}}}
 else{a.swing=0;a.cp=null;a.technique=null;a.state='idle';a.atk=null;}}
// ---------- Blut, Trefferzahlen, Körperteile ----------
function blood(f,x,y,z,n,dir=0,v=1){for(let i=0;i<n;i++)f.fx.push({x,y,z,vx:(dir?dir*(14+Math.random()*40):(Math.random()-.5)*50)*v,vy:Math.random()*14-7,vz:(14+Math.random()*46)*v,life:.5+Math.random()*.6,size:1,color:i%3?'#aa3c36':'#87352e',stain:true});}
function dust(f,x,y,n,color='#c9b586'){for(let i=0;i<n;i++)f.fx.push({x:x+Math.random()*10-5,y,z:1+Math.random()*4,vx:(Math.random()-.5)*46,vy:(Math.random()-.5)*8,vz:10+Math.random()*22,life:.4+Math.random()*.4,size:1,color});}
const float=(f,a,text,color='#eee2c1',dy=0)=>f.floats.push({a,text,color,t:0,dy});
function stepFx(f,dt){for(const p of f.fx){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=150*dt;if(p.z<=0&&p.vz<0){if(p.stain&&f.stains.length<140)f.stains.push({x:p.x,y:p.y,r:1});p.life=0;}}f.fx=f.fx.filter(p=>p.life>0);
 for(const q of f.floats)q.t+=dt;f.floats=f.floats.filter(q=>q.t<1.5);f.shake=Math.max(0,(f.shake||0)-dt*18);
 for(const p of f.limbs){if(p.z>0||p.vz>0){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vz-=260*dt;p.z=Math.max(0,p.z+p.vz*dt);p.angle+=dt*p.spin;if(!p.z){if(p.vz<-60){p.vz=-p.vz*.35;p.vx*=.5;p.spin*=.4;M.sound?.('land');dust(f,p.x,p.y,5);}else{p.vz=0;p.vx=p.vy=0;p.spin=0;}}}}}
// Laufende Blutung wie im Kampf: Blutverlust = Summe der Blutungen × 0,036 pro Sekunde, dazu Tropfen und Flecken.
function stepBleed(f,dt){for(const a of f.rec||[]){const b=bleedOf(a.g);if(!(b>0))continue;if(f.bleedLive)a.g.blood=Math.max(30,a.g.blood-b*dt*.036);a.drip=(a.drip||0)-dt;if(a.drip<=0){a.drip=b>8?.18:.8;const part=Object.entries(a.g.body).sort((x,y)=>y[1].bleed-x[1].bleed)[0][0],p=a.down?{x:a.x+(a.g.stump?10:4),y:a.y-3}:anchor(a,part.endsWith('a')||part.endsWith('h')?'chest':part);blood(f,p.x,a.y+1,Math.max(1,a.y-p.y),b>8?3:1,0,b>8?.8:.3);if(b>8&&a.down)(a.pool??={x:a.x+12,y:a.y+2,r:1}).r=Math.min(15,a.pool.r+.16);}}}

// ---------- Hof: Kulisse, Reihe, Kette, Kiste ----------
const ROW=[0,1,2,3,4].map(i=>[425+i*28,396]),POST=[556,397],HOME=[374,402],CRATE=[340,407],DEMO=[388,446],DEMO2=[378,486];
function chainLine(g,a,b,sag){const n=Math.max(2,Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])/3));for(let k=0;k<=n;k++){const u=k/n,x=a[0]+(b[0]-a[0])*u,y=a[1]+(b[1]-a[1])*u+Math.sin(u*Math.PI)*sag;g.fillStyle=k%2?'#2c3031':'#7d8687';g.fillRect(Math.round(x)-1,Math.round(y),2,2);}}
// Kette mit fester Länge: hängt vom Handgelenk zum Boden, liegt dort, und was übrig ist, liegt als Rolle im Sand.
// Wird einer nach vorn gezogen, rollt sie sich ab, statt sich zu dehnen; erst wenn nichts mehr übrig ist, spannt sie sich.
const LINK=165;
function chainPlan(pa,ga,pb,gb){const drop=(pa[1]<ga[1]?ga[1]-pa[1]:0)+(pb[1]<gb[1]?gb[1]-pb[1]:0),run=Math.hypot(gb[0]-ga[0],gb[1]-ga[1]),slack=LINK-drop-run;return {pa,ga,pb,gb,slack,taut:slack<0};}
function chainGround(g,c){if(c.taut)return;chainLine(g,c.ga,c.gb,0);const loops=Math.min(5,Math.floor(c.slack/18));if(loops<1)return;const u=.38,mx=c.ga[0]+(c.gb[0]-c.ga[0])*u,my=c.ga[1]+(c.gb[1]-c.ga[1])*u+1;
 for(let i=0;i<loops;i++){const rx=6.5-i*.7,ry=2.6-i*.25,cx=mx+(i%2?1.5:-1.5),cy=my-i*.9,n=Math.round(rx*3.2);for(let k=0;k<n;k++){const t=k/n*Math.PI*2;g.fillStyle=(k+i)%2?'#2c3031':'#7d8687';g.fillRect(Math.round(cx+Math.cos(t)*rx)-1,Math.round(cy+Math.sin(t)*ry),2,2);}}}
function chainDrops(g,c){if(c.taut){chainLine(g,c.pa,c.pb,3);return;}if(c.pa[1]<c.ga[1])chainLine(g,c.pa,c.ga,0);if(c.pb[1]<c.gb[1])chainLine(g,c.pb,c.gb,0);}
const foot=a=>[wrist(a)[0],a.y+2];
const wrist=a=>a.down?[a.x+3,a.y-5]:[a.x+(Math.cos(a.a)>=0?4:-4),a.y-21+(a.kneeTimer>0?11:0)];
function drawCrate(g,f,x,y){const r=(a,b,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x+a),Math.round(y+b),w,h);},open=f.crateOpen;
 g.fillStyle='#30271c55';g.beginPath();g.ellipse(x,y+2,17,4,0,0,Math.PI*2);g.fill();
 if(open){/* Deckel lehnt hinten, Waffen ragen heraus */r(-15,-24,30,4,'#5a4128');r(-15,-25,30,1,'#7b5a38');
  r(-9,-34,2,16,'#8b6b45');r(-11,-36,6,3,'#b9c1b2');r(-10,-33,4,1,'#e2e6d6');/* Axt */r(-3,-37,1,19,'#9aa392');r(-4,-39,3,3,'#dfe4d2');/* Speer */r(3,-31,2,13,'#c8cdbd');r(2,-19,4,1,'#8a6a3a');/* Schwert */r(8,-30,2,12,'#7a5a3a');r(6,-34,6,5,'#6a726b');r(6,-34,6,1,'#a9b4aa');/* Hammer */r(12,-27,1,9,'#8b6b45');r(11,-29,3,3,'#8d9892');}
 r(-15,-18,30,18,'#3a2a1b');r(-14,-17,28,16,'#6b4c2e');r(-14,-17,28,2,'#8a6540');r(-14,-10,28,1,'#4d3620');r(-14,-4,28,1,'#4d3620');r(-15,-18,3,18,'#3f3f3a');r(12,-18,3,18,'#3f3f3a');r(-15,-18,3,1,'#7d8687');r(12,-18,3,1,'#7d8687');r(-2,-13,4,5,'#2b2b27');r(-1,-12,2,2,'#c9a85e');
 if(!open){r(-16,-21,32,4,'#5a4128');r(-16,-21,32,1,'#7b5a38');}}
function drawPost(g,x,y){g.fillStyle='#30271c55';g.fillRect(x-3,y+1,7,2);g.fillStyle='#3f3526';g.fillRect(x-2,y-24,4,25);g.fillStyle='#6b563a';g.fillRect(x-1,y-24,2,25);g.fillStyle='#34393a';g.fillRect(x-3,y-21,6,3);g.fillStyle='#7d8687';g.fillRect(x-3,y-21,6,1);}
function paintYard(g,w,h,f){const VW=f.cam.vw,VH=VW*h/w,k=w/VW,cx=Math.max(VW/2,Math.min(900-VW/2,f.cam.x)),cy=Math.max(VH/2,Math.min(670-VH/2,f.cam.y)),sh=f.shake||0;
 g.fillStyle='#101b20';g.fillRect(0,0,w,h);g.save();g.translate((Math.random()-.5)*sh,(Math.random()-.5)*sh*.6);g.scale(k,k);g.translate(-(cx-VW/2),-(cy-VH/2));g.drawImage(f.bg,0,0);M.ludusOverlay?.(g,f.t);
 for(const s of f.stains){g.fillStyle='#7b2f2a';g.fillRect(Math.round(s.x),Math.round(s.y),s.r,1);}
 for(const a of f.rec||[])if(a.pool){g.fillStyle='#5e1f1c';g.beginPath();g.ellipse(Math.round(a.pool.x),Math.round(a.pool.y),a.pool.r,a.pool.r*.32,0,0,Math.PI*2);g.fill();g.fillStyle='#8f2f28';g.beginPath();g.ellipse(Math.round(a.pool.x)+1,Math.round(a.pool.y),a.pool.r*.6,a.pool.r*.18,0,0,Math.PI*2);g.fill();}
 const s=st(),all=[f.smith,f.trader,...(f.rec||[])].filter(a=>a&&!a.hidden),draws=all.map(a=>({y:a.y,fn:()=>drawActor(g,a)}));
 if(f.crate)draws.push({y:f.crate.y,fn:()=>drawCrate(g,f,f.crate.x,f.crate.y)});if(s.chained||f.post)draws.push({y:POST[1],fn:()=>drawPost(g,POST[0],POST[1])});for(const p of f.props)draws.push(p);
 // Kette: am Boden liegende Stücke und Rollen zuerst (unter den Figuren), die hängenden Enden danach
 const tied=(f.rec||[]).filter(a=>a.shackled),chains=[];for(let i=1;i<tied.length;i++)chains.push(chainPlan(wrist(tied[i-1]),foot(tied[i-1]),wrist(tied[i]),foot(tied[i])));
 if(tied.length&&s.chained>=5){const t=tied[tied.length-1];chains.push(chainPlan(wrist(t),foot(t),[POST[0],POST[1]-19],[POST[0],POST[1]+1]));}
 if(f.chainHand&&tied.length){const t=tied[tied.length-1],h=[f.smith.x+(Math.cos(f.smith.a)>=0?7:-7),f.smith.y-22];chains.push(chainPlan(h,[h[0],f.smith.y+2],wrist(t),foot(t)));}
 for(const c of chains)chainGround(g,c);
 draws.sort((a,b)=>a.y-b.y);for(const d of draws)d.fn();
 for(const c of chains)chainDrops(g,c);
 for(const a of f.rec||[])for(const e of vis(a.g).embedded||[]){if(a.hidden||a.g.body[e.part]?.missing)continue;const q=anchor(a,e.part),L=e.kind==='crossbow'?11:16,dx=-L,dy=-L*.08,px=(x,y,c,w=1,h=1)=>{g.fillStyle=c;g.fillRect(Math.round(q.x+x),Math.round(q.y+y),w,h);};for(let i=0;i<=L;i++){px(dx*i/L,dy*i/L+1,'#4a3620');px(dx*i/L,dy*i/L,i%2?'#d8ae68':'#a07c48');}px(dx-2,dy-3,'#f6f0de',3,2);px(dx-3,dy-1,'#f6f0de',3,1);px(dx-2,dy+1,'#cfc6b0',3,2);px(dx+2,dy-1,'#b8423a',1,2);px(0,0,'#8f2f28',1,2);}
 M.renderForgeEffects(g,f.limbs,f.fx);f.over?.(g,f);g.restore();
 // Trefferzahlen und Wundnamen in Bildschirmkoordinaten
 for(const q of f.floats){const u=q.t/1.5,x=w/2+(q.a.x-cx)*k,y=h/2+(q.a.y-(q.a.down?20:58)-cy)*k-u*26+q.dy;g.globalAlpha=u<.75?1:1-(u-.75)/.25;g.font="bold 25px 'Courier Prime',monospace";g.textAlign='center';g.textBaseline='middle';g.fillStyle='#17201c';g.fillText(q.text,Math.max(110,Math.min(w-110,x))+2,y+2);g.fillStyle=q.color;g.fillText(q.text,Math.max(110,Math.min(w-110,x)),y);g.globalAlpha=1;}
 f.screen?.(g,w,h,f);}
const tailX=a=>a&&film?Math.max(5,Math.min(95,((a.x-film.cam.x)/film.cam.vw+.5)*100)):50;
// Hof-Szene: Schmied, die fünf in ihrer Reihe (oder dort, wo sie liegen geblieben sind), auf Wunsch der Händler
function yardFilm(beats,o={}){const sm=smithActor(...(o.smithAt||HOME)),rs=o.noRecruits?[]:recs().map((g,i)=>recActor(g,i));if(o.held)hold(sm,o.held);
 play({...o,smith:sm,rec:rs,trader:o.trader?traderActor(...o.trader):null,bg:backdrop(),beats,paint:paintYard,tailX,crate:st().crate||o.crate?{x:CRATE[0],y:CRATE[1]}:null,crateOpen:st().crate,cam:o.cam||{x:452,y:412,vw:300},
  tick:(f,dt)=>{for(const a of [f.smith,f.trader,...f.rec])if(a){walker(a,dt);}for(const a of f.rec)applyVis(a,dt);stepAttack(f.smith,dt,f);stepFx(f,dt);stepBleed(f,dt);o.tick?.(f,dt);}});
 for(const a of film.rec)applyVis(a,0);return film;}

// =====================================================================================================
// 3 · KARTEN (Erklärungen unter dem Bild)
// =====================================================================================================
const stars=n=>'★'.repeat(Math.round(n/2))+'☆'.repeat(5-Math.round(n/2));
function woundCard(r){if(!r)return '';const g=r.g;if(r.net)return `<div class="medic-card"><h4>IM NETZ · ${esc(first(g))}</h4><p>Kein Schaden, keine Wunde. Wer im Netz hängt, kann nicht ausholen und nicht ausweichen, bis er sich befreit hat.</p></div>`;
 const p=g.body[r.part],days=partDays(p),est=A.hospitalEstimate(g);
 return `<div class="medic-card"><h4>${esc(M.partName(r.part).toUpperCase())} · ${esc(first(g))}</h4><p class="medic-inj">${esc(partLine(g,r.part))} <span class="medic-g${M.injuryGrade(p)}">Grad ${M.injuryGrade(p)} · ${GRADE[M.injuryGrade(p)]}</span></p>
<dl><dt>Waffe</dt><dd>${esc(r.weapon)}</dd><dt>Zustand der Stelle</dt><dd>${p.missing?'verloren':fmt(r.before?.hp??100)+' → <b>'+fmt(p.hp)+' %</b>'}</dd><dt>Schmerz</dt><dd>${fmt(p.pain)}</dd><dt>Blutung</dt><dd>${p.bleed>0?'<b class="medic-red">'+fmt(p.bleed,1)+'</b> (Blut '+fmt(g.blood)+' %)':'keine'}</dd>
<dt>Heilung der Stelle</dt><dd>${p.missing?'<b class="medic-red">wächst nicht nach</b>':days+' Tage natürlich'+(p.fracture?' · Bruch':'')}</dd>${p.chronic?`<dt>Dauerschaden</dt><dd><b class="medic-red">−${fmt(p.chronic)} % für immer</b></dd>`:''}<dt>Ganzer Mann</dt><dd>${est.days} Tage bis akute Genesung${est.permanent?' · Dauerfolgen':''}</dd></dl>
<p class="tiny">${esc(limbText(g))}</p></div>`;}
function recruitCard(g,rank){const d=B.info(g),an=B.analysis(g,d),c=d.classes[d.best],plus=an.plus.slice(0,3).map(x=>esc(x.text)).join(' · ')||'nichts Auffälliges',minus=an.minus.slice(0,3).map(x=>esc(x.text)).join(' · ')||'nichts Auffälliges';
 return `<div class="medic-card medic-rec bk-t${d.tier.level}"><canvas data-face="${g.id}" width="80" height="100"></canvas><div><h4>${rank?'#'+rank+' · ':''}${esc(g.name)}</h4><p><span class="bk-stars">${stars(d.tier.level)}</span> <b>${esc(d.tier.name.toUpperCase())}</b> · Talent ${d.talent}</p>
<dl><dt>Beste Klasse</dt><dd>${esc(d.best)}</dd><dt>Kampfwert jetzt</dt><dd><b>${d.kw}</b></dd><dt>Klassenwert</dt><dd>${Math.round(c.ist)} → <b>${Math.round(c.pot)}</b> möglich</dd><dt>Waffe</dt><dd>${esc(wdef(c.weapon)?.name||c.weapon)} ★${Math.round(c.weaponPot)}</dd></dl>
<p class="medic-plus">＋ ${plus}</p><p class="medic-minus">− ${minus}</p></div></div>`;}
// Die 18 Waffengattungen des Spiels, nach der Art der Verletzung, die sie laut woundType()/hit() verursachen
const GROUPS=[
 {t:'DOLCHE UND SCHWERTER',w:['dagger','short','gladius','long'],inj:'Schürfwunde → Schnittwunde → Tiefe Schnittwunde. Als Stoß: Stichverletzung. An Hand, Fuß, Unterarm, Unterschenkel ab Grad 3: Sehnenverletzung.',say:'Klingen. Schnell, sauber, blutig. Je tiefer der Schnitt, desto länger läuft der Mann aus.'},
 {t:'ÄXTE UND SCHWERE KLINGEN',w:['axe','doubleaxe','greatsword','halberd'],inj:'Tiefe Schnittwunden. Ist ein Arm oder Bein fast zerstört (unter 7 %), kann der nächste schwere Hieb es abtrennen. Am Rumpf selten: Durchtrennung.',say:'Äxte. Für alle Gelegenheiten, bei denen der Gegner hinterher weniger wiegen soll.'},
 {t:'SPEERE UND DREIZACKE',w:['spear','trident'],inj:'Stichverletzung → Tiefe Stichverletzung. Durch geschwächte Stellen: Tiefe Stichwunde mit Extrablutung. Zerstört: Durchstochen (Dauerschaden, an Brust und Bauch innere Verletzung).',say:'Spitzen. Ein kleines Loch außen. Innen sieht es aus wie nach einem Erdrutsch.'},
 {t:'KEULE, STREITKOLBEN, HAMMER',w:['club','mace','hammer'],inj:'Bluterguss → Prellung → Muskelquetschung. Kopf: Gehirnerschütterung. Hand, Fuß, Schulter: Gelenkverletzung. Ab Grad 3 am Arm oder Bein: Knochenbruch (7 bis 14 Tage). Hammer und Co.: Trümmerbruch (20 Tage, Dauerschaden).',say:'Stumpfe Waffen. Bluten kaum. Dafür klappert der Mann hinterher.'},
 {t:'BOGEN UND ARMBRUST',w:['bow','crossbow'],inj:'Stichverletzung oder Tiefe Stichverletzung, mit Blutung. Der Pfeil bleibt stecken. Pfeile brechen keine Knochen und trennen nichts ab.',say:'Pfeile. Man hört sie nicht kommen. Das ist für den Getroffenen die gute Nachricht.'},
 {t:'WURFSPEER UND WURFAXT',w:['javelin','throwaxe'],inj:'Zählen als Klingen im Flug: Stichverletzung oder Tiefe Stichverletzung, mit Blutung. Bleiben gern im Schild stecken.',say:'Wurfwaffen. Wie Nahkampf, nur dass man dabei nicht außer Atem kommt.'},
 {t:'WURFNETZ',w:['net'],inj:'Kein Schaden. Der Getroffene hängt mehrere Sekunden fest und kann nicht ausholen.',say:'Das Netz. Tut nicht weh. Es sorgt nur dafür, dass alles andere in Ruhe wehtun kann.'}];
function groupCard(G,i){return `<div class="medic-card"><h4>${i+1} / ${GROUPS.length} · ${G.t}</h4><div class="medic-weapons">${G.w.map(id=>{const d=wdef(id);return `<figure><canvas data-w="${id}" width="120" height="76"></canvas><figcaption><b>${esc(d.name)}</b><br>Schaden ${d.damage} · Reichw. ${d.range}<br>Durchschlag ${Math.round(d.pen*100)} % · ${fmt(d.delay,2)} s</figcaption></figure>`;}).join('')}</div><p><b>Verletzungen:</b> ${esc(G.inj)}</p></div>`;}
const gradeCard=()=>`<div class="medic-card"><h4>SCHWEREGRADE · SO RECHNET DAS SPIEL</h4><table class="medic-grades"><tr><th>Grad</th><th>Zustand der Stelle</th><th>Bedeutung</th></tr>${[['0','90–100 %','Kratzer, kaum Folgen'],['1','65–89 %','leicht, heilt in Tagen'],['2','40–64 %','mittel, einige Tage'],['3','20–39 %','schwer: Narbe, Bruch möglich, 10 % Risiko auf Dauerschaden je Treffer'],['4','unter 20 %','kritisch: Zerstörung, Abtrennung, Tod am Kopf/Hals/Brust möglich'],['5','verloren','Amputation, bleibt für immer']].map((r,i)=>`<tr class="medic-g${i}"><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table><p class="tiny">18 Körperstellen je Gladiator, jede mit eigenem Zustand, Schmerz, Blutung, Bruch, Dauerschaden und Wundhistorie.</p></div>`;
function bodyCard(g,part){const p=g.body[part];return `<div class="medic-card medic-body"><canvas data-body="${g.id}" data-part="${part}" width="150" height="240"></canvas><div><h4>KÖRPERANSICHT · ${esc(first(g))}</h4><p class="medic-inj">${esc(M.partName(part))}: ${esc(partLine(g,part))}</p><p><b>Wundhistorie</b></p><ul>${(p.wounds||[]).slice(0,4).map(w=>`<li>Tag ${w.day}: ${esc(w.type)}<br><small>Verursacher: ${esc(w.attacker)} · Waffe: ${esc(w.weapon||'–')}${w.hits>1?' · '+w.hits+' Treffer':''}</small></li>`).join('')}</ul><p><b>Narben</b>: ${g.scars.map(s=>esc(M.partName(s.part)+' – '+s.reason)).join(' · ')||'keine'}</p>${p.chronic?`<p><b class="medic-red">Dauerschaden −${fmt(p.chronic)} %</b>: Diese Stelle heilt höchstens noch auf ${fmt(100-p.chronic)} %.</p>`:''}</div></div>`;}
function bloodCard(g,note){const b=bleedOf(g);return `<div class="medic-card"><h4>BLUT · ${esc(first(g))}</h4><div class="medic-bar"><i style="width:${Math.round(g.blood)}%"></i><b>${fmt(g.blood)} %</b></div><dl><dt>Blutung</dt><dd>${b>0?'<b class="medic-red">'+fmt(b,1)+'</b> · −'+fmt(b*.036,2)+' % Blut pro Sekunde':'gestoppt'}</dd><dt>Kampfunfähig ab</dt><dd>unter 28 % Blut</dd><dt>Tod</dt><dd>am Boden bei 0 %</dd></dl>${note?`<p class="tiny">${esc(note)}</p>`:''}</div>`;}

// =====================================================================================================
// 4 · FÜHRUNG AN DER ECHTEN OBERFLÄCHE (Aufgabenleiste wie im Löwen-Kapitel), Sperre, Tagesübergang
// =====================================================================================================
let guide=null;
const bodyClass=(n,on)=>document.body.classList.toggle(n,!!on);
function showGuide(o){hideGuide();const box=document.createElement('div');box.className='hall-guide lion-guide';box.setAttribute('role','status');document.body.appendChild(box);guide={...o,box,i:0,t:0};bodyClass('lion-lock',!!o.lock);renderGuide();
 box.addEventListener('click',()=>{if(!guide)return;if(guide.i>=(guide.lines||[]).length&&guide.task&&!guide.taskDone)return;if(guide.t<.35)return;guide.i++;guide.t=0;renderGuide();});}
function hideGuide(){guide?.box?.remove();guide=null;for(const c of ['lion-lock','lion-lock-back','lion-task'])bodyClass(c,false);}
function renderGuide(){const G=guide;if(!G)return;const lines=G.lines||[];if(G.i>=lines.length){if(G.task&&!G.taskDone){G.box.classList.add('lion-taskbar');bodyClass('lion-task',true);G.box.innerHTML=`<b>Aufgabe · ${esc(smithName())}</b><span>${esc(G.task.text)}</span><div class="lion-taskrow"><em class="lion-progress">${esc(G.task.progress?.()||'')}</em></div>`;fitGuide();return;}const done=G.done;hideGuide();done?.();return;}
 G.box.classList.remove('lion-taskbar');bodyClass('lion-task',false);G.box.innerHTML=`<b>${esc(smithName())}</b><span>${esc(lines[G.i])}</span><small>Tippen für weiter</small>`;}
function fitGuide(){const h=guide?.box?.offsetHeight;if(h)document.documentElement.style.setProperty('--lion-guide-h',h+'px');}
function guideTick(dt){const G=guide;if(!G)return;G.t+=dt;const m=$('modal'),away=!!m&&m.hidden===false&&!G.overModal;if(G.away!==away){G.away=away;G.box.classList.toggle('lion-away',away);}
 if(G.lock&&!S.battle&&!G.lock.includes(M.ui.getPage())){M.ui.click('nav:'+G.lock[0]);M.ui.notify('Erst die Aufgabe des Schmieds erledigen.');}bodyClass('lion-lock-back',!!G.lock&&M.ui.getPage()!==G.lock[0]);
 if(G.i>=(G.lines||[]).length&&G.task&&!G.taskDone){fitGuide();const p=G.task.progress?.()||'',em=G.box.querySelector('.lion-progress');if(em&&em.textContent!==p)em.textContent=p;if(G.task.check()){G.taskDone=true;G.lines=[...(G.lines||[]),...(G.task.after||[])];renderGuide();}}}
// Tagesübergang: Abend, Nacht, Morgen. Der Tag selbst wird über den echten Tageswechsel des Spiels fortgeschrieben.
function nightfall(then){const v=document.createElement('div');v.className='medic-night';v.innerHTML='<div><span class="medic-sun"></span><b id="medicNightDay">TAG '+S.day+'</b><small id="medicNightSub">Die Sonne geht unter …</small></div>';document.body.appendChild(v);M.sound?.('heavy');
 setTimeout(()=>{const out=A.nextDay();M.ui.close();M.ui.render();const b=$('medicNightDay'),s=$('medicNightSub');if(b)b.textContent='TAG '+S.day;if(s)s.textContent='… und wieder auf. '+(typeof out==='string'?out.replace(/Herumtreiber.*$/,''):'');v.classList.add('morning');M.sound?.('rise');},1900);
 setTimeout(()=>{v.classList.add('out');},3700);setTimeout(()=>{v.remove();then?.();},4500);}

// =====================================================================================================
// 5 · DIE SZENEN
// =====================================================================================================
const setStage=s=>{st().stage=s;M.persist?.();};
// Sortierung nach echten Profilwerten: Talent (g.potential), bei Gleichstand das Klassenpotenzial der besten Klasse
function rankOrder(){const list=st().ids.map(byId).filter(Boolean).map(g=>({g,d:B.info(g)}));list.sort((a,b)=>b.d.talent-a.d.talent||b.d.classes[b.d.best].pot-a.d.classes[a.d.best].pot||b.d.kw-a.d.kw);return list.map(x=>x.g.id);}
const tierLine=(d,pos)=>{const L=d.tier.level;
 if(pos===0)return L>=6?['Seht euch diesen Mann an. Noch kämpft er wie ein betrunkener Gemüsehändler. Aber seine Anlagen sind ausgezeichnet.','Gebt ihm eine vernünftige Waffe und ein paar Jahre … dann könnte er uns sehr reich machen.']:L>=4?['Das ist unser Bester. Noch kämpft er wie ein betrunkener Gemüsehändler. Aber die Anlagen sind brauchbar.','Gebt ihm eine vernünftige Waffe und ein paar Jahre … dann könnte er uns zumindest nicht arm machen.']:['Das ist also unser Bester.','Das sagt weniger über ihn aus als über die anderen vier.'];
 if(pos===1)return [L>=5?'Auch nicht schlecht. Ordentliche Kraft, passable Reflexe. Aus dem wird etwas.':'Auch … nun ja. Zwei Arme, zwei Beine. Aus dem wird etwas. Was, lasse ich offen.'];
 if(pos===2)return [L>=5?'Solide Mitte. Der Mann, den man aufstellt, wenn der Gute verletzt ist und der Schlechte tot.':'Die Mitte. Fällt nicht auf. In der Arena ist das die längste Lebenserwartung.'];
 if(pos===3)return [L>=5?'Der hier hat Anlagen, zeigt sie aber niemandem. Bescheidenheit. Gefährliche Eigenschaft.':'Hm. Der hier ist der Grund, warum wir Lederrüstungen in Übergrößen führen: zum Verstecken.'];
 return [];};

// ---------- SZENE 1 · EIN NEUER TAG ----------
function scene1(){setStage('s1');M.ui.click('nav:home');const sm=smithActor(330,214);sm.to=[420,214,44];
 play({label:'1 · Ein neuer Tag',smith:sm,rec:[],bg:backdrop(),paint:paintYard,tailX,cam:{x:400,y:190,vw:260},tick:(f,dt)=>{walker(f.smith,dt);stepFx(f,dt);},beats:[
  {until:f=>!f.smith.to,each:f=>{f.camTo={x:f.smith.x+20,y:186,vw:250,rate:3};}},
  {dur:1.1,do:f=>{pose(f.smith,{a:0,forgePose:'inspect'});M.sound?.('crowd');}},
  {say:'Nun gut. Ich würde sagen, das war ein voller Erfolg.',do:f=>pose(f.smith,{a:0})},
  {say:'Jedenfalls für diejenigen, die noch zählen können. Und zwar ihre Gliedmaßen.',do:f=>{f.smith.forgePose='sip';}},
  {dur:1},
  {say:'Für unsere nächste Lektion brauchen wir einen frischen Tag. Und frische Männer.',do:f=>pose(f.smith,{a:Math.PI})},
  {say:'Beides hat die unangenehme Eigenschaft, viel zu schnell verbraucht zu sein.'},
  {say:'Also, Herr der Arena. Lassen wir einen Tag verstreichen.',do:f=>pose(f.smith,{traderPose:'point',gest:0,a:0})}
 ],done:()=>stepDay()});}
function stepDay(){setStage('day');M.ui.click('nav:home');showGuide({task:{text:'Lass einen Tag verstreichen: Tippe oben rechts auf „NÄCHSTER TAG ▸“.',progress:()=>'Tag '+S.day,check:()=>st().stage!=='day'}});guide.box.classList.add('medic-low');}
function scene1b(){setStage('s1b');hideGuide();const sm=smithActor(748,246);sm.to=[716,268,40];
 play({label:'1 · Ein neuer Tag',smith:sm,rec:[],bg:backdrop(),paint:paintYard,tailX,cam:{x:730,y:250,vw:240},tick:(f,dt)=>{walker(f.smith,dt);stepFx(f,dt);},beats:[
  {until:f=>!f.smith.to},
  {say:'Ah, ein neuer Tag!',do:f=>pose(f.smith,{a:Math.PI,state:'celebrate'})},
  {say:'Die Sonne scheint, die Vögel singen und irgendwo hat ein Sklavenhändler bereits fünf schlechte Lebensentscheidungen vorbereitet.',do:f=>pose(f.smith,{a:Math.PI,forgePose:'sip'})},
  {say:'Kauf mir fünf frische Rekruten. Alle fünf.',do:f=>pose(f.smith,{a:Math.PI,traderPose:'point',gest:0})},
  {say:'Ich brauche sie für meine nächste Lektion: den Medikus.',do:f=>pose(f.smith,{a:Math.PI})}
 ],done:()=>stepBuy()});}
// ---------- SZENE 2 · FÜNF FRISCHE REKRUTEN (echter Händler, echtes Kaufsystem) ----------
let rosterBefore=null;
function stepBuy(){setStage('buy');const s=st();if(!M.trader.here()||M.trader.left()<5){restock();}S.gold=Math.max(S.gold,TEST?1200:500);s.before??=S.roster.map(g=>g.id);rosterBefore=new Set(s.before);M.ui.click('nav:home');setTimeout(()=>M.ludus?.focus?.(190,430),300);
 showGuide({lock:['home'],lines:[traderShort()+' ist da. Fünf Stück, angekettet am Sklavenmarkt. Hundert Gold pro Kopf.'],task:{text:'Kaufe alle fünf: Tippe am Sklavenmarkt (unten links) auf einen Angeketteten, dann „KAUFEN“.',progress:()=>bought().length+' / 5 gekauft · '+fmt(S.gold)+' Gold',check:()=>bought().length>=5&&$('modal')?.hidden!==false}, done:()=>{const ids=bought().slice(0,5);s.ids=ids;s.order=[...ids];scene2();}});guide.box.classList.add('medic-low');}
const bought=()=>rosterBefore?S.roster.filter(g=>!rosterBefore.has(g.id)).map(g=>g.id):[];
// Ware des Tages bereitstellen. Für die Vorführung wird so lange neu gezogen, bis die fünf deutlich verschieden talentiert sind (echte, zufällig erzeugte Rekruten).
function restock(){const T=Tr();let best=null;for(let n=0;n<40;n++){T.lot=[];T.day=-1;M.trader.stock();const lv=T.lot.map(g=>B.info(g).tier.level),spread=Math.max(...lv)-Math.min(...lv);if(!best||spread>best.spread)best={spread,lot:T.lot};if(spread>=4&&Math.min(...lv)<=3)break;}T.lot=best.lot;T.day=S.day;T.gone=false;T.arrived=0;T.soldToday=0;}
function scene2(){setStage('s2');M.ui.close();const say=(who,text,o)=>({who,say:text,...o});
 const f=yardFilm([
  {dur:.5,do:f=>{f.smith.x=300;f.smith.y=402;f.smith.to=[HOME[0],HOME[1],46,0];f.trader.x=262;f.trader.y=410;f.trader.to=[352,410,40,0];}},
  {until:f=>!f.smith.to&&!f.trader.to},
  say('s','Wunderbar. Fünf neue Hoffnungsträger. Noch vollkommen unverbraucht.',{do:f=>pose(f.smith,{a:0,forgePose:'inspect'})}),
  say('s','Fast schade.',{do:f=>{f.smith.forgePose='sip';}}),{dur:.8},
  say('s','Jetzt brauche ich allerdings noch eine Kleinigkeit.',{do:f=>pose(f.smith,{a:0})}),
  say('s','Mein guter Mann, könnte ich mir wohl kurz eine Ihrer Ketten ausleihen?',{do:f=>pose(f.smith,{a:Math.PI})}),
  say('t','LEIHEN? … Zwei Gold am Tag. Und sie kommt sauber zurück. Sauberer als meine Ware.',{do:f=>pose(f.trader,{a:0,traderPose:'coins',gest:0})}),
  say('r1','Eine Kette? Wozu braucht Ihr eine Kette? Wir sind doch jetzt Gladiatoren!',{do:f=>{f.rec[0].facePain=.8;}}),
  say('r2','Gib ihm die Kette! Vielleicht nimmt er uns wieder mit! Bei diesem Händler wurden wir wenigstens nur ausgepeitscht!',{do:f=>{f.rec[1].state='mercy';}}),
  say('r3','Ich glaube langsam, wir haben hier etwas ganz grundlegend falsch verstanden.',{do:f=>{f.rec[1].state='idle';}}),
  say('s','Meine Herren, beruhigt euch. Ihr überlebt das schon.',{do:f=>pose(f.smith,{a:0,traderPose:'shout',gest:0})}),{dur:1.2,do:f=>pose(f.smith,{a:0})},
  say('s','Also … zumindest wird das heute nicht für jeden von euch ein Problem.',{do:f=>{f.smith.forgePose='sip';}}),
  {dur:1.6,do:f=>{f.rec.forEach((a,i)=>{a.facePain=1.2;a.a=i%2?0:Math.PI;});}},
  {dur:.9,do:f=>{f.rec.forEach(a=>{a.a=Math.PI;});pose(f.trader,{a:0,traderPose:'pull',gest:0,poseK:.5});M.sound?.('block');f.chainHand=false;}},
  say('t','Bis morgen, mein Freund! Morgen bringe ich fünf neue. Du wirst sie brauchen.',{do:f=>{pose(f.trader,{a:Math.PI});f.trader.to=[250,414,46];}})
 ],{label:'2 · Fünf frische Rekruten',trader:[262,410],smithAt:[300,402],done:()=>scene3()});
 f.rec.forEach((a,i)=>{a.x=ROW[i][0]+60;a.y=ROW[i][1];a.to=[ROW[i][0],ROW[i][1],36+i*3,Math.PI];});}
// ---------- SZENE 3 · WAS IST TALENT? ----------
function scene3(){setStage('s3');const s=st(),say=(who,text,o)=>({who,say:text,...o}),g0=recs()[0],d0=B.info(g0),c0=d0.classes[d0.best];
 const concept=[
  ['1 · AKTUELLES KAMPFVERMÖGEN',`Der <b>Kampfwert</b> sagt, was ein Mann heute kann: Durchschnitt seiner 17 Grundwerte, gewichtet mit seiner Gesundheit, plus Waffe und Rüstung. <br>Beispiel ${esc(first(g0))}: Kampfwert <b>${d0.kw}</b> ohne Ausrüstung.`,'Das ist, was er heute kann. Also: nichts. Aber messbar nichts.'],
  ['2 · LANGFRISTIGES POTENZIAL',`<b>Talent</b> (1 bis 100) ist seine Obergrenze. Kein Training hebt sie an. Jeder Wert wächst nur durch echte Aktionen im Kampf in Richtung dieser Grenze. <br>${esc(first(g0))}: Talent <b>${d0.talent}</b> · ${esc(d0.tier.name)}.`,'Das ist, was er werden kann, wenn er lange genug lebt. Großes Wenn.'],
  ['3 · KÖRPER',`Jeder hat eigene Maße (Größe, Gewicht, Armlänge, Muskeln) und 18 Körperstellen mit eigener Kraft und Beweglichkeit. <br>${esc(first(g0))}: ${g0.height} cm · ${g0.weight} kg · ${esc(g0.build)}.`,'Größe, Gewicht, Reichweite. Ein langer Arm ist ein Vorteil. Bis er ab ist.'],
  ['4 · WAFFENBEGABUNG UND KLASSE',`Für jede der 18 Waffen hat er ein eigenes Potenzial. Die Klasse (Soldat, Assassine, Fernkämpfer) bestimmt, wie er kämpft. <br>${esc(first(g0))}: beste Klasse <b>${esc(d0.best)}</b> ${Math.round(c0.ist)} → ${Math.round(c0.pot)}, beste Waffe ${esc(wdef(c0.weapon)?.name)} ★${Math.round(c0.weaponPot)}.`,'Gib einem Speerträger eine Keule und du hast einen schlechten Keulenträger mit Heimweh.'],
  ['5 · VERLETZUNGEN',`Jede verletzte Stelle bremst: Ein Arm mit 50 % schlägt halb so gut, ein gebrochenes Bein läuft kaum. <b>Dauerschäden</b> senken die Obergrenze einer Stelle für immer, auch wenn das Talent auf dem Papier bleibt.`,'Und das hier ist der Grund, warum wir heute hier stehen. Dazu kommen wir gleich. Ausführlich.']];
 const order=rankOrder(),walk=[];
 order.forEach((id,pos)=>{const g=byId(id),d=B.info(g),lines=tierLine(d,pos);
  walk.push({dur:.2,do:f=>{const a=f.rec.find(x=>x.g.id===id);f.smith.to=[a.x-24,a.y+9,44,0];f.camTo={x:Math.max(430,a.x+10),y:404,vw:250,rate:2};}},{until:f=>!f.smith.to});
  if(pos<4){lines.forEach((t,n)=>walk.push(say('s',t,{card:n?undefined:recruitCard(g,pos+1),do:f=>pose(f.smith,{a:0,forgePose:n?'':'inspect'})})));if(!lines.length)walk.push({dur:1,card:recruitCard(g,pos+1)});}
  else{walk.push(say('s','Oh.',{card:recruitCard(g,pos+1),do:f=>pose(f.smith,{a:0,forgePose:'inspect'})}),say('s','Meine Güte.'),{dur:1.8,do:f=>{f.smith.forgePose='sip';}},
   say('r5','Was? Was stimmt denn nicht mit mir?',{do:f=>{f.rec[4].facePain=1;}}),say('s','Nichts, mein Junge. Absolut nichts.',{do:f=>pose(f.smith,{a:0})}),say('s','Für den Preis einer frischen Leiche warst du sogar ausgesprochen günstig.'));}});
 yardFilm([
  {dur:.6},
  say('s','Bevor wir beginnen: Stellt euch der Reihe nach auf. Der Talentierteste nach vorne.',{do:f=>pose(f.smith,{a:0,traderPose:'shout',gest:0})}),
  say('s','Das größte wirtschaftliche Missverständnis nach hinten.',{do:f=>pose(f.smith,{a:0})}),
  say('r3','Und woher sollen wir wissen, wer von uns Talent hat?',{do:f=>{f.rec.forEach((a,i)=>{a.a=i%2?0:Math.PI;});}}),
  say('s','Gar nicht. Dafür habt ihr mich. Und der Lanista hat dafür die Kaserne.',{do:f=>{f.rec.forEach(a=>{a.a=Math.PI;});f.smith.forgePose='sip';}}),
  ...concept.map(([t,html,line])=>say('s',line,{hold:true,card:`<div class="medic-card"><h4>${t}</h4><p>${html}</p></div>`,do:f=>pose(f.smith,{a:0})})),
  {dur:.3,card:null,do:f=>{/* umstellen: echte Rangfolge */s.order=order;const now=f.rec;f.rec=order.map(id=>now.find(a=>a.g.id===id));f.rec.forEach((a,i)=>{a.slot=i;a.to=[ROW[i][0],ROW[i][1]+(i%2?5:-5),38+i*4,Math.PI];});M.sound?.('block');pose(f.smith,{a:0,traderPose:'point',gest:0});}},
  {until:f=>f.rec.every(a=>!a.to)},{dur:.5,do:f=>{f.rec.forEach((a,i)=>{a.to=[ROW[i][0],ROW[i][1],30,Math.PI];});pose(f.smith,{a:0});f.rank=true;}},{until:f=>f.rec.every(a=>!a.to)},
  ...walk,
  {dur:.3,card:null,do:f=>{f.smith.to=[HOME[0],HOME[1],46,0];f.camTo={x:452,y:412,vw:300,rate:2};}},{until:f=>!f.smith.to},
  say('s','Merke dir: Ein wertvoller Gladiator ist eine Investition.',{do:f=>pose(f.smith,{a:0,traderPose:'coins',gest:0})}),
  say('s','Ein untalentierter Gladiator ist … nun ja … eine Betriebsausgabe.',{do:f=>pose(f.smith,{a:0})}),
  {dur:.4,do:f=>{f.smith.to=[ROW[0][0]-20,ROW[0][1]+8,46,0];f.post=true;}},{until:f=>!f.smith.to},
  ...[0,1,2,3,4].flatMap(i=>[{dur:.55,do:f=>{s.chained=i+1;f.chainHand=true;M.sound?.('block');f.rec[i].jumpTimer=.2;f.rec[i].facePain=1;pose(f.smith,{a:0,traderPose:'pull',gest:0,poseK:.6});f.smith.to=[ROW[Math.min(4,i+1)][0]-(i<4?20:-16),ROW[0][1]+8,60,0];}},{until:f=>!f.smith.to}]),
  {dur:.7,do:f=>{f.chainHand=false;M.sound?.('heavy');pose(f.smith,{a:Math.PI});f.shake=2;}},
  say('r2','Das ist jetzt aber wirklich nur zur Sicherheit, oder?'),
  say('s','Selbstverständlich. Zu meiner.',{do:f=>{f.smith.to=[HOME[0],HOME[1],46,0];}}),{until:f=>!f.smith.to}
 ],{label:'3 · Was ist Talent?',over:(g,f)=>{if(!f.rank)return;f.rec.forEach((a,i)=>{g.fillStyle='#17201c';g.fillRect(Math.round(a.x)-4,Math.round(a.y)+4,9,8);g.fillStyle='#f4d37a';g.font="bold 7px 'Courier Prime',monospace";g.textAlign='center';g.textBaseline='middle';g.fillText(String(i+1),Math.round(a.x)+.5,Math.round(a.y)+8.5);});},done:()=>{s.order=order;s.chained=5;scene4();}});}
// ---------- SZENE 4 · DIE KISTE DES SCHMIEDS ----------
function scene4(){setStage('s4');const s=st(),say=(who,text,o)=>({who,say:text,...o});s.chained=5;
 yardFilm([
  say('s','Einen winzigen Augenblick. Ich muss nur kurz etwas aus meiner Schmiede holen.',{do:f=>pose(f.smith,{a:0})}),
  {dur:.3,do:f=>{f.smith.to=[322,372,50];}},{until:f=>!f.smith.to,each:f=>{if(f.smith.x<332)f.smith.hidden=true;}},
  {dur:1.2,do:f=>{f.smith.hidden=true;f.rec[1].traderPose='pull';f.rec[1].gest=0;f.rec[3].a=0;},each:(f,dt,bt)=>{f.rec[1].poseK=(bt*1.4)%1;f.rec[0].x=ROW[0][0]+Math.sin(bt*9)*1.2;}},
  say('r3','Was glaubt ihr, was er holt?',{do:f=>{f.rec[2].a=0;}}),say('r2','Vielleicht einen Schlüssel?',{do:f=>{f.rec[1].traderPose=null;f.rec[1].a=0;}}),say('r5','Ich hoffe, es ist ein Schlüssel.',{do:f=>{f.rec[4].state='mercy';}}),
  {dur:.4,do:f=>{f.rec.forEach(a=>{a.a=Math.PI;a.state='idle';});f.smith.hidden=false;f.smith.x=318;f.smith.y=380;f.smith.forgeHold=null;f.smith.to=[CRATE[0]+22,CRATE[1]-2,26,Math.PI];f.crate={x:330,y:384};f.carry=true;}},
  {until:f=>!f.smith.to,each:f=>{f.crate.x=f.smith.x-17;f.crate.y=f.smith.y-6+Math.sin(f.t*9)*.6;pose(f.smith,{state:'move',moveSpeed:6,traderPose:'pull',poseK:.7,gest:f.t,a:Math.PI});f.smith.phase=f.t*5;}},
  {dur:.9,do:f=>{f.carry=false;f.crate={x:CRATE[0],y:CRATE[1]};pose(f.smith,{a:Math.PI});M.sound?.('heavy');f.shake=5;dust(f,CRATE[0],CRATE[1],16);f.rec.forEach(a=>{a.jumpTimer=.26;a.facePain=1;});float(f,{x:CRATE[0]+20,y:CRATE[1]+20},'RUMMS','#f4d37a');}},
  {dur:.9,do:f=>{f.crateOpen=true;s.crate=true;M.sound?.('block');pose(f.smith,{a:Math.PI,forgePose:'inspect'});}},
  say('s','Meine Herren! Heute befassen wir uns mit einem der interessantesten Themen der Arena: Verletzungen!',{do:f=>{f.smith.to=[HOME[0],HOME[1],40,0];pose(f.smith,{traderPose:'shout',gest:0});}}),
  say('s','Denn verschiedene Waffen richten verschiedene Schäden an. Klingen schneiden. Spitzen stechen. Hämmer zertrümmern.',{do:f=>pose(f.smith,{a:0})}),
  say('s','Und manche Waffen sorgen dafür, dass du deinen Gegner anschließend in zwei verschiedenen Kisten nach Hause schicken musst.'),
  say('s','Achtzehn Waffengattungen. Sieben Arten, einen Tag zu ruinieren. Der Reihe nach.',{do:f=>pose(f.smith,{a:Math.PI,traderPose:'point',gest:0})}),
  ...GROUPS.map((G,i)=>say('s',G.say,{hold:true,card:groupCard(G,i),do:f=>pose(f.smith,{a:i%2?0:Math.PI,forgePose:i%3===2?'sip':''})})),
  say('s','Und so schlimm, wie es wird, so zählt es auch. Sechs Stufen. Von „stell dich nicht so an“ bis „such es dir im Sand zusammen“.',{hold:true,card:gradeCard(),do:f=>pose(f.smith,{a:0})}),
  say('s','Aber weißt du was? Ich könnte dir das jetzt alles stundenlang erklären.',{card:null,do:f=>pose(f.smith,{a:Math.PI})}),
  {dur:1.2,do:f=>pose(f.smith,{a:0,forgePose:'inspect'})},
  say('s','Oder … wir machen etwas Pädagogisches.',{do:f=>pose(f.smith,{a:0})}),
  {dur:1,do:f=>{f.rec.forEach(a=>{a.facePain=1.2;});}},
  say('r1','Was meint Ihr mit pädagogisch?'),
  say('s','Praktischen Anschauungsunterricht.',{do:f=>pose(f.smith,{a:0,state:'charge'})}),
  say('r4','NEIN! NEIN, DAS IST NICHT EUER ERNST!',{do:f=>{f.rec[3].state='mercy';f.rec.forEach(a=>{a.stagger=.8;});}}),
  say('s','Ich liebe begeisterte Schüler.',{do:f=>pose(f.smith,{a:0,forgePose:'sip'})})
 ],{label:'4 · Die Kiste des Schmieds',done:()=>{s.crate=true;scene5();}});film.crate=null;film.crateOpen=false;}

// ---------- Bausteine der Vorführung ----------
const REACH={dagger:35,short:38,gladius:40,long:45,axe:40,club:39,mace:40,hammer:44,spear:60};
// Waffe aus der Kiste holen: hingehen, hineingreifen, Waffe in der Hand
const grab=def=>[{dur:.2,do:f=>{f.smith.to=[CRATE[0]+20,CRATE[1]+1,56,Math.PI];}},{until:f=>!f.smith.to},{dur:.55,do:f=>{pose(f.smith,{a:Math.PI,traderPose:'bow'});M.sound?.('stick');}},{dur:.35,do:f=>{pose(f.smith,{a:Math.PI});hold(f.smith,def);}}];
// Den Rekruten an der Kette nach vorn holen (die Nachbarn rucken mit) und sich davor aufstellen
const bring=(i,def,spot=DEMO)=>[{dur:.2,do:f=>{const a=f.rec[i];f.smith.to=[a.x-18,a.y+10,56,0];}},{until:f=>!f.smith.to},
 {dur:.5,do:f=>{const a=f.rec[i];pose(f.smith,{a:0,traderPose:'pull',gest:0,poseK:.4});a.facePain=1;a.stagger=.5;M.sound?.('block');for(const b of f.rec)if(Math.abs(b.slot-i)===1)b.jumpTimer=.2;}},
 {dur:.2,do:f=>{const a=f.rec[i];pose(f.smith,{});a.to=[spot[0],spot[1],48,Math.PI];f.smith.to=[spot[0]-REACH[def],spot[1],52,0];f.camTo={x:440,y:spot[1]-22,vw:250,rate:2};}},{until:f=>!f.smith.to&&!f.rec[i].to},{dur:.25,do:f=>{f.rec[i].a=Math.PI;pose(f.smith,{a:0});}}];
const back=i=>[{dur:.2,do:f=>{const a=f.rec[i];a.to=[ROW[i][0],ROW[i][1],vis(a.g).kneel?16:30,Math.PI];f.smith.to=[HOME[0],HOME[1],46,0];f.camTo={x:452,y:412,vw:300,rate:2};}},{until:f=>!f.rec[i].to&&!f.smith.to}];
// Ein Treffer: Ausholen, Kontakt, im Kontakt entsteht die Wunde (Ereignis), Reaktion, Karte mit den echten Werten
function strike(i,key,part,o={}){return {dur:(o.wind??.5)+(o.swing??.32)+(o.after??.75),card:null,do:f=>{const a=f.rec[i];f.last=null;attack(f.smith,a,part,{...o,onHit:f=>{const r=fire(key)||{g:a.g,part,injury:partLine(a.g,part),dmg:0,weapon:M.itemTitle(item(f.smith.held)),before:{hp:a.g.body[part].hp}};f.last=r;closeup(f,shotFor(r),f=>{
   const p=anchor(a,part),heavy=r.dmg>=25||r.severed;a.hit=.23;a.facePain=1.6;a.stagger=heavy?.9:.35;if(wdef(r.wid)?.bladed){blood(f,p.x,a.y+1,a.y-p.y,Math.min(22,4+Math.round(r.dmg/2)),-1);M.sound?.(o.tech==='thrust'?'stick':'slash');}else{dust(f,p.x,p.y,4,'#e8dcc0');M.sound?.(heavy?'heavy':'hit');}
   M.voice?.('pain',a.g.appearance.voice,r.dmg>24);float(f,a,r.dmg?String(Math.round(r.dmg)):'',heavy?'#f7da88':'#eee2c1');float(f,a,r.injury.toUpperCase(),M.injuryGrade(a.g.body[part])>=3?'#f29b83':'#e9d1a2',-26);f.shake=Math.max(f.shake||0,heavy?5:r.dmg>12?2:0);o.then?.(f,r);setCard(woundCard(r));});}});}};}
const show=()=>({card:f=>woundCard(f.last)});

// ---------- SZENE 5 · DER ERSTE: LEICHTE VERLETZUNG (Klinge) ----------
function scene5(){setStage('s5');const say=(who,text,o)=>({who,say:text,...o});
 yardFilm([
  ...grab('dagger'),
  say('s','Beginnen wir mit etwas völlig Harmlosem. Einer oberflächlichen Schnittwunde.',{do:f=>pose(f.smith,{a:0,forgePose:'inspect'})}),
  ...bring(0,'dagger'),
  say('r1','Moment. Ich bin der Talentierte. Ihr habt es selbst gesagt!',{do:f=>{f.rec[0].state='mercy';}}),
  say('s','Eben. Deshalb fangen wir bei dir klein an.',{do:f=>{f.rec[0].state='idle';}}),
  strike(0,'r1a','lfa',{wind:.4,swing:.26,after:.9}),
  say('r1','Au! … Das war alles?',show()),
  say('s','Das war eine Schürfwunde. Grad null. Dafür steht ein Gladiator nicht einmal vom Essen auf.',show()),
  say('s','Und jetzt dieselbe Stelle, derselbe Dolch, etwas mehr Überzeugung.'),
  strike(0,'r1b','lfa',{wind:.5,swing:.28,after:1}),
  say('r1','AAAAH! WAS SOLL DER SCHEISS?!',{...show(),do:f=>{f.rec[0].stagger=.8;}}),
  say('s','Eine ausgezeichnete Frage! Und die Antwort lautet: Ausbildung.',show()),
  say('s','Kleine Schürf- und Schnittwunden sind meistens schnell verheilt. Ein paar Tage Ruhe, etwas Behandlung, und unser kleiner Schreihals ist wieder einsatzbereit.',{hold:true,...show()}),
  say('r1','DAS HÄTTET IHR MIR AUCH SAGEN KÖNNEN!'),
  say('s','Und dir diese wunderbare Lernerfahrung nehmen? Niemals.',{do:f=>{f.smith.forgePose='shake';}}),
  ...back(0)
 ],{label:'5 · Leichte Verletzung',held:null,done:()=>scene6()});}
// ---------- SZENE 6 · DER ZWEITE: STUMPFE VERLETZUNGEN ----------
function scene6(){setStage('s6');const say=(who,text,o)=>({who,say:text,...o});
 yardFilm([
  ...grab('club'),
  say('s','Nicht jede Wunde muss bluten. Manche Schäden liegen unter der Haut. Blutergüsse, Prellungen und Muskelquetschungen.',{do:f=>pose(f.smith,{a:0,forgePose:'inspect'})}),
  ...bring(1,'club'),
  {dur:.9,do:f=>{const a=f.rec[1];a.to=[DEMO[0]+12,DEMO[1],60];a.stagger=.6;M.sound?.('block');},each:f=>{const a=f.rec[1];if(a.x>DEMO[0]+10){a.to=null;a.x=DEMO[0]+10;a.a=Math.PI;a.state='idle';}}},
  say('s','Die Kette ist genau so lang, wie sie sein muss. Ich habe nachgemessen.',{do:f=>{f.rec[1].to=[DEMO[0],DEMO[1],30,Math.PI];}}),
  strike(1,'r2a','lua',{wind:.35,swing:.26,after:.7}),
  say('s','Bluterguss. Wird blau, dann gelb, dann vergessen.',show()),
  strike(1,'r2b','lua',{wind:.45,swing:.28,after:.7}),
  say('s','Prellung. Dieselbe Stelle, etwas mehr Schwung.',show()),
  strike(1,'r2c','lua',{wind:.6,swing:.3,after:1.1,tech:'overhead',then:f=>{vis(f.rec[1].g).kneel=true;}}),
  say('r2','MEIN ARM! ICH GLAUBE, ER IST KAPUTT!',show()),
  say('s','Unsinn! Er hängt doch noch dran.',show()),
  say('s','Muskelquetschung. Grad zwei. Stärkere stumpfe Schäden heilen deutlich länger als kleine oberflächliche Wunden.',{hold:true,...show()}),
  {dur:.5,do:f=>{vis(f.rec[1].g).kneel=false;}},
  ...fetchInPlace('mace'),
  say('s','Der Streitkolben. Für Stellen, an denen sich etwas dreht.'),
  strike(1,'r2d','rs',{wind:.55,swing:.3,after:1,tech:'overhead'}),
  say('s','Gelenkverletzung. Schulter, Hand, Fuß. Tut bei jeder Bewegung weh. Also bei jeder.',{hold:true,...show()}),
  ...fetchInPlace('club'),
  say('r2','Nicht den Kopf. Bitte. Ich brauche den noch.'),
  say('s','Wofür?',{do:f=>pose(f.smith,{a:0})}),
  strike(1,'r2e','head',{wind:.5,swing:.28,after:1.2,tech:'overhead',then:f=>{f.rec[1].stagger=2.2;f.stars=f.t;}}),
  say('r2','Ich sehe … zwei Schmiede. Das ist das Schlimmste, was ich je gesehen habe.',show()),
  say('s','Gehirnerschütterung. Wer so getroffen wird, zielt schlechter und blockt schlechter. Beide Schmiede bestätigen das.',{hold:true,...show()}),
  say('s','Besonders die Beine solltest du im Blick behalten. Wer nicht mehr vernünftig laufen kann, wird in der Arena erstaunlich schnell zum Einrichtungsgegenstand.'),
  ...back(1)
 ],{label:'6 · Stumpfe Verletzungen',over:(g,f)=>{if(f.stars&&f.t-f.stars<3.2){const a=f.rec[1];for(let n=0;n<3;n++){const u=f.t*5+n*2.1;g.fillStyle='#f4d37a';g.fillRect(Math.round(a.x+Math.cos(u)*8),Math.round(a.y-50+Math.sin(u)*3),2,2);}}},done:()=>scene7()});}
// Waffe wechseln, ohne den Mann loszulassen: kurzer Gang zur Kiste und zurück an denselben Platz
function fetchInPlace(def){return [{dur:.2,do:f=>{f.spot=[f.smith.x,f.smith.y];}},...grab(def),{dur:.2,do:f=>{const v=f.rec.find(a=>Math.abs(a.y-f.spot[1])<4&&a.x>f.spot[0]);f.smith.to=[(v?v.x:f.spot[0]+30)-REACH[def],f.spot[1],56,0];}},{until:f=>!f.smith.to}];}
// ---------- SZENE 7 · DER DRITTE: STICH, PFEIL, NETZ ----------
function scene7(){setStage('s7');const say=(who,text,o)=>({who,say:text,...o});
 yardFilm([
  ...grab('spear'),
  say('s','Jetzt kommen wir zu den schönen Dingen. Tiefen Stichverletzungen.',{do:f=>pose(f.smith,{a:0,forgePose:'inspect'})}),
  say('r3','NEIN! ICH HABE DAS SCHON VERSTANDEN! ICH SCHWÖRE!',{do:f=>{f.rec[2].state='mercy';}}),
  say('s','Wunderbar! Dann wird die Wiederholung ja besonders effektiv.',{do:f=>{f.rec[2].state='idle';}}),
  ...bring(2,'spear'),
  strike(2,'r3a','rt',{wind:.45,swing:.3,after:.9,tech:'thrust',variant:2}),
  say('s','Stichverletzung. Kleines Loch. Grad eins. Der Speer war noch höflich.',show()),
  strike(2,'r3b','rt',{wind:.7,swing:.34,after:1.5,tech:'thrust',variant:2,pierce:f=>{const a=f.rec[2],p=anchor(a,'rt');blood(f,p.x,a.y+1,a.y-p.y,26,-1,1.3);M.sound?.('sever');f.shake=3;}}),
  say('r3','AAAAAH! DANN HOL ENDLICH EINEN ARZT!',{...show(),do:f=>{f.bleedLive=true;}}),
  say('s','Geduld. Der Arzt kommt im nächsten Kapitel.',show()),
  say('s','Tiefe Stichverletzungen können unangenehm lange heilen. Und wie du siehst: Blut ist ein ausgesprochen begrenzter Rohstoff.',{hold:true,card:f=>bloodCard(f.rec[2].g,'Jede offene Klingenwunde blutet weiter. Fällt das Blut unter 28 %, bricht der Mann zusammen und ist für diesen Kampf verloren.')}),
  ...back(2),
  ...grab('bow'),
  say('s','Und weil er gerade so schön stillhält: Fernwaffen.',{do:f=>pose(f.smith,{a:0})}),
  {dur:1.6,card:null,do:f=>{const a=f.rec[2];attack(f.smith,a,'ls',{wind:.8,swing:.3,tech:'shoot',onHit:f=>{f.arrow={t:0,from:{x:f.smith.x+14,y:f.smith.y-30},to:anchor(a,'ls')};M.sound?.('throw');}});}},
  say('r3','IHR HABT AUF MICH GESCHOSSEN!',show()),
  say('s','Getroffen. Bitte genau bleiben. Und sieh hin: Der Pfeil bleibt im Körper stecken. Die Wunde darunter ist ein Stich, und sie blutet weiter.',show()),
  say('s','Ein Pfeil ist eine Stichverletzung auf Entfernung. Kleines Loch, blutet trotzdem. Und der Schütze muss dafür nicht einmal aufstehen.',{hold:true,...show()}),
  ...grab('net'),
  {dur:1.5,card:null,do:f=>{const a=f.rec[2];attack(f.smith,a,'chest',{wind:.6,swing:.3,tech:'shoot',onHit:f=>{f.netFly={t:0,from:{x:f.smith.x+12,y:f.smith.y-34},to:{x:a.x,y:a.y-24}};M.sound?.('throw');}});}},
  say('r3','Was … was soll das jetzt wieder?',{card:f=>woundCard(f.last)}),
  say('s','Das Netz. Kein Schaden. Du kannst dich nur ein paar Sekunden lang nicht wehren. In der Arena nennt man diese Sekunden: den Rest deines Lebens.',{hold:true,card:f=>woundCard(f.last)}),
  {dur:.8,card:null,do:f=>{fire('r3e');hold(f.smith,null);M.sound?.('slash');}}
 ],{label:'7 · Stich, Pfeil und Netz',tick:(f,dt)=>{if(f.arrow){f.arrow.t+=dt/.16;if(f.arrow.t>=1){f.arrow=null;const a=f.rec[2],r=fire('r3c');f.last=r;const react=()=>{a.hit=.23;a.facePain=1.6;a.stagger=.5;M.sound?.('stick');M.voice?.('pain',a.g.appearance.voice,false);{const q=anchor(a,'ls');blood(f,q.x,a.y+1,a.y-q.y,8,1);}if(r){float(f,a,String(r.dmg));float(f,a,r.injury.toUpperCase(),'#e9d1a2',-16);setCard(woundCard(r));}};if(r)closeup(f,shotFor(r,{kind:'arrow',line3:'Der Pfeil bleibt stecken · blutet weiter'}),react);else react();}}
   if(f.netFly){f.netFly.t+=dt/.3;if(f.netFly.t>=1){f.netFly=null;const a=f.rec[2],r=fire('r3d');f.last=r;a.stagger=.6;float(f,a,'IM NETZ','#e9d1a2');setCard(woundCard(r));}}},
  over:(g,f)=>{if(f.arrow){const u=f.arrow.t,x=f.arrow.from.x+(f.arrow.to.x-f.arrow.from.x)*u,y=f.arrow.from.y+(f.arrow.to.y-f.arrow.from.y)*u;g.fillStyle='#b8a17a';g.fillRect(Math.round(x)-7,Math.round(y),8,1);g.fillStyle='#d1c5a1';g.fillRect(Math.round(x)-8,Math.round(y)-1,2,3);g.fillStyle='#dfe4d2';g.fillRect(Math.round(x),Math.round(y),2,1);}
   if(f.netFly){const u=f.netFly.t,x=f.netFly.from.x+(f.netFly.to.x-f.netFly.from.x)*u,y=f.netFly.from.y+(f.netFly.to.y-f.netFly.from.y)*u-Math.sin(u*Math.PI)*16,r=3+u*8;g.strokeStyle='#e0c697';g.lineWidth=1;for(let n=-1;n<=1;n++){g.beginPath();g.moveTo(x-r,y+n*r*.6);g.lineTo(x+r,y+n*r*.6);g.stroke();g.beginPath();g.moveTo(x+n*r*.6,y-r);g.lineTo(x+n*r*.6,y+r);g.stroke();}}},done:()=>scene8()});}
// ---------- SZENE 8 · DER VIERTE: BRUCH, TRÜMMERBRUCH, DAUERSCHADEN ----------
function scene8(){setStage('s8');const say=(who,text,o)=>({who,say:text,...o});
 yardFilm([
  ...grab('mace'),
  say('s','Knochen. Die halten viel aus. Aber nicht alles, und vor allem nicht zweimal.',{do:f=>{pose(f.smith,{a:0,forgePose:'inspect'});f.bleedLive=true;}}),
  ...bring(3,'mace'),
  say('r4','BITTE! ICH HABE KINDER!',{do:f=>{f.rec[3].state='mercy';}}),
  say('s','Ausgezeichnet. Dann bleibt deine Familie wenigstens nicht ohne Nachwuchs.',{do:f=>{f.rec[3].state='idle';}}),
  strike(3,'r4a','lfa',{wind:.55,swing:.3,after:.9,tech:'overhead'}),
  say('s','Muskelquetschung. Der Knochen hat sich nur gebogen. Braver Knochen.',show()),
  strike(3,'r4b','lfa',{wind:.6,swing:.3,after:1.2,tech:'overhead',then:f=>{M.sound?.('fall');}}),
  say('r4','ER IST DURCH! ICH HABE ES GEHÖRT!',show()),
  say('s','Knochenbruch. Grad drei. Ab hier heilt nichts mehr in ein paar Tagen: einundzwanzig Tage Schiene, und so lange bleibt der Arm bei höchstens 64 %.',{hold:true,...show()}),
  ...fetchInPlace('hammer'),
  say('s','Jetzt kommen wir zu meinem persönlichen Liebling: dem Hammer.',{do:f=>pose(f.smith,{a:0,forgePose:'inspect'})}),
  say('s','Keine überflüssige Eleganz. Keine unnötigen Schnörkel. Nur ein überzeugendes Argument aus Metall.'),
  say('r4','Nicht das Bein. Ich brauche es zum Weglaufen!',{do:f=>{f.rec[3].state='mercy';}}),
  strike(3,'r4c','rsh',{wind:.95,swing:.34,after:1.6,tech:'overhead',then:f=>{const a=f.rec[3];a.state='idle';a.fallT=.8;vis(a.g).at=[a.x,a.y];M.sound?.('fall');f.shake=9;dust(f,a.x,a.y,14);float(f,a,'TRÜMMERBRUCH','#edbf88',-32);}}),
  say('r4','AAAAAAH! DU BIST EIN VERDAMMTES MONSTER!',show()),
  say('s','Das steht so nicht in meiner Berufsbezeichnung.',show()),
  say('s','Manche Knochen brechen. Manche Knochen zerbrechen. Und manche Knochen sind hinterher eher eine Sammlung schlechter Entscheidungen.',show()),
  say('s','Trümmerbruch. Sechzig Tage. Und selbst wenn alles verheilt ist, kommt dieses Bein nie wieder auf hundert. Das nennt man Dauerschaden.',{hold:true,...show()}),
  say('s','Sieh ihn dir ohne Kleider an. Jede Wunde steht in seiner Akte: wer, womit, wie oft.',{hold:true,card:f=>bodyCard(f.rec[3].g,'rsh'),do:f=>{f.smith.forgePose='sip';}}),
  say('s','Eine Narbe ist übrigens nichts Schlimmes. Sie erzählt eine Geschichte. Und in diesem Fall bin ich der Held darin.',{card:f=>bodyCard(f.rec[3].g,'rsh')}),
  {dur:.3,card:null,do:f=>{f.smith.to=[HOME[0],HOME[1],46,0];f.camTo={x:452,y:412,vw:300,rate:2};}},{until:f=>!f.smith.to}
 ],{label:'8 · Bruch und Dauerschaden',done:()=>scene9()});}
// ---------- SZENE 9 · DER FÜNFTE: AMPUTATION ----------
function scene9(){setStage('s9');const say=(who,text,o)=>({who,say:text,...o});
 yardFilm([
  ...grab('long'),
  say('s','Und zuletzt betrachten wir die Verletzungen, bei denen selbst der beste Medikus gelegentlich an seine Grenzen stößt.',{do:f=>{pose(f.smith,{a:0,forgePose:'inspect'});f.bleedLive=true;}}),
  {dur:1.2,do:f=>{const a=f.rec[4];a.traderPose='pull';a.gest=0;M.sound?.('block');},each:(f,dt,bt)=>{const a=f.rec[4];a.poseK=(bt*2)%1;a.x=ROW[4][0]+Math.sin(bt*14)*1.5;}},
  say('r5','ICH WILL NICHT! ICH WILL ZURÜCK ZUM SKLAVENHÄNDLER!',{do:f=>{f.rec[4].traderPose=null;f.rec[4].state='mercy';}}),
  say('s','Aber mein Junge! Dort warst du doch nur ein Sklave. Hier bist du Teil eines Bildungsprojekts!',{do:f=>{f.rec[4].state='idle';}}),
  ...bring(4,'long',DEMO2),
  say('s','Erst das Handwerk. Ein tiefer Schnitt.'),
  strike(4,'r5a','rt',{wind:.55,swing:.3,after:1,variant:2}),
  say('s','Tiefe Schnittwunde. Blutet ordentlich, heilt aber. Bis hierhin ist er noch reparabel.',show()),
  ...fetchInPlace('gladius'),
  strike(4,'r5b','lh',{wind:.6,swing:.3,after:1.2,variant:2}),
  say('r5','MEINE HAND! ICH KANN DIE FINGER NICHT MEHR BEWEGEN!',show()),
  say('s','Sehnenverletzung. Grad drei, mit Narbe. Hände, Füße, Unterarme. Der Mann lebt, aber die Hand hält nichts mehr fest.',{hold:true,...show()}),
  say('s','Eine kaputte Hand an einem gesunden Arm. Das ist Verschwendung. Das lösen wir.',{do:f=>pose(f.smith,{a:0})}),
  ...fetchInPlace('axe'),
  {dur:.9,do:f=>{pose(f.smith,{a:0,state:'charge'});}},
  say('r5','BITTE NICHT DEN ARM!',{do:f=>{f.rec[4].state='mercy';}}),
  say('s','Gut aufgepasst! Du lernst schneller, als dein Talentwert vermuten lässt.',{do:f=>pose(f.smith,{a:0})}),
  {dur:.95+.34+2.4,card:null,do:f=>{const a=f.rec[4];a.state='idle';attack(f.smith,a,'lua',{wind:.95,swing:.34,tech:'overhead',onHit:f=>{const p=anchor(a,'lua'),r=fire('r5c');f.last=r;const react=()=>{a.hit=.23;a.facePain=2.4;a.stagger=1.1;vis(a.g).at=[a.x,a.y];
     f.limbs.push({x:p.x,y:a.y+2,z:a.y-p.y,vx:34,vy:9,vz:70,spin:9,angle:.4,part:'lua',skin:a.g.appearance.skin,hair:a.g.appearance.hair,g:a.g});blood(f,p.x,a.y+1,a.y-p.y,46,1,1.4);blood(f,p.x,a.y+1,a.y-p.y,20,-1);M.sound?.('sever');f.shake=10;float(f,a,'ABGETRENNT','#f29b83',-16);f.lateFall=f.t+1.15;if(r)setCard(woundCard(r));};if(r){closeup(f,shotFor(r));closeup(f,{g:a.g,part:'chest',kind:'collapse',line1:a.g.name+' bricht zusammen',title:'Geht blutend zu Boden',line3:'Arm verloren · der Stumpf blutet weiter · Blut '+Math.round(a.g.blood)+' %',color:'#f29b83'},react);}else react();}});}},
  say('s','Siehst du? Dieser Mann kann theoretisch eines Tages wieder kämpfen.',show()),
  say('s','Nur beim beidhändigen Waffentraining würde ich ihn nicht mehr anmelden.',{do:f=>{pose(f.smith,{a:0,traderPose:'point',gest:0});f.camTo={x:440,y:462,vw:210,rate:1.5};}}),
  say('s','Aufgepasst. Das ist wichtig. Wenn ein Gladiator schwer blutet, läuft ihm die Zeit davon.',{hold:true,card:f=>bloodCard(f.rec[4].g,'Ein Stumpf blutet mit 18. Das ist das Zehnfache einer Schnittwunde.'),do:f=>pose(f.smith,{a:0})}),
  say('s','Ist der Kampf schnell genug vorbei, kann er überleben. Manchmal eilt auch ein Kamerad zu Hilfe und versucht, die Blutung zu stoppen.',{card:f=>bloodCard(f.rec[4].g)}),
  say('s','Tut niemand etwas und der Mann verblutet, findest du ihn anschließend nur noch in der Halle der Gefallenen.',{card:f=>bloodCard(f.rec[4].g)})
 ],{label:'9 · Amputation',tick:(f,dt)=>{if(f.lateFall&&f.t>=f.lateFall){f.lateFall=0;const a=f.rec[4];a.fallT=.8;M.sound?.('fall');dust(f,a.x,a.y,10);M.voice?.('pain',a.g.appearance.voice,true);}},done:()=>hallShot(()=>scene10())});}
// Kurzer Blick in die echte Halle der Gefallenen (vorhandene Darstellung, vorhandene Einträge)
function hallShot(then){const list=M.hall.entries();if(!list.length){then();return;}
 play({label:'Halle der Gefallenen',rec:[],beats:[{dur:.6},{who:'cap',say:'Halle der Gefallenen · '+list.length+' Namen. Wer hier steht, kommt nicht wieder.',dur:3.2},{dur:.4}],cam:{x:0,y:0,vw:300},paint:(g,w,h,f)=>{g.fillStyle='#0b0807';g.fillRect(0,0,w,h);const b=f.buf||(f.buf=Object.assign(document.createElement('canvas'),{width:330,height:210})),q=b.getContext('2d');try{M.hall.paintHall(q,list,f.t,{cam:Math.min(40,f.t*9)});}catch(e){q.fillStyle='#1a1512';q.fillRect(0,0,330,210);}g.imageSmoothingEnabled=false;g.drawImage(b,0,0,w,h);},tailX:()=>50,done:then});}
// ---------- SZENE 10 · ERSTE HILFE UND KAMERADSCHAFT ----------
function scene10(){setStage('s10');const say=(who,text,o)=>({who,say:text,...o});
 yardFilm([
  {dur:.6,do:f=>{f.bleedLive=true;}},
  say('s','Wenn Männer viele Kämpfe gemeinsam überstehen, entsteht manchmal etwas Wunderschönes: Freundschaft.',{do:f=>pose(f.smith,{a:0})}),
  say('s','Und Freundschaft bedeutet, dass einer von ihnen sogar seine wertvolle Freizeit opfert, um den anderen am Verbluten zu hindern.',{do:f=>{f.smith.forgePose='sip';}}),
  {dur:1.3,do:f=>{const a=f.rec[2];fire('aid3a');a.fallT=.8;M.sound?.('fall');dust(f,a.x,a.y,8);float(f,a,'BLUTVERLUST','#f29b83');f.camTo={x:470,y:404,vw:230,rate:2};}},
  say('r3','Mir wird … so komisch schwarz vor Augen.',{card:f=>bloodCard(f.rec[2].g,'Im Kampf verbindet ein Soldat einen am Boden liegenden, blutenden Kameraden, wenn kein Gegner in der Nähe ist. Das dauert 2,4 Sekunden.')}),
  say('s','Du. Der Talentierte. Mach dich nützlich.',{do:f=>{pose(f.smith,{a:0,traderPose:'point',gest:0});}}),
  {dur:.6,do:f=>{fire('free');M.sound?.('block');f.rec[0].jumpTimer=.2;}},
  {dur:.2,do:f=>{const a=f.rec[0],t=f.rec[2];a.to=[t.x-22,t.y+7,52,0];}},{until:f=>!f.rec[0].to},
  {dur:2.4,do:f=>{const a=f.rec[0];a.state='bandage';a.aid={target:f.rec[2].id,left:2.4};a.a=0;M.sound?.('stick');}},
  {dur:.9,do:f=>{const a=f.rec[0];a.state='idle';a.aid=null;fire('aid3');float(f,f.rec[2],'BLUTUNG GESTOPPT','#9dd2c2');M.sound?.('rise');setCard(bloodCard(f.rec[2].g,'Verbunden. Die Blutung ist gestoppt; der Verwundete bleibt für diesen Kampf am Boden.'));}},
  say('r1','Halt durch. Ich … ich kenne dich seit heute Morgen, aber halt durch.'),
  say('s','Rührend. Der eine blutet nicht mehr, der andere hat etwas gelernt. So sieht Teamwork aus.',{do:f=>{pose(f.smith,{a:0});f.rec[0].to=[ROW[0][0],ROW[0][1],40,Math.PI];}}),
  {dur:.3,card:null,do:f=>{const t=f.rec[4];f.smith.forgeHold=null;f.smith.to=[t.x-24,t.y+3,56,0];f.camTo={x:440,y:462,vw:210,rate:2};}},{until:f=>!f.smith.to},
  {dur:2.4,do:f=>{const a=f.smith;a.state='bandage';a.aid={target:f.rec[4].id,left:2.4};a.a=0;M.sound?.('stick');setCard(bloodCard(f.rec[4].g));}},
  {dur:.8,do:f=>{const a=f.smith;a.state='idle';a.aid=null;fire('aid5');float(f,f.rec[4],'BLUTUNG GESTOPPT','#9dd2c2');M.sound?.('rise');f.bleedLive=false;setCard(bloodCard(f.rec[4].g,'Der Stumpf ist verbunden. Der Arm bleibt fort.'));}},
  say('s','So! Blutung gestoppt. Patient lebt. Hervorragende Bilanz.',{do:f=>pose(f.smith,{a:0})}),
  say('r5','Mein … Arm …'),
  say('s','Ja, ja. Wir haben alle Opfer gebracht. Ich zum Beispiel einen völlig neuen Verband.',{do:f=>{f.smith.forgeHold='beer';f.smith.forgePose='sip';}}),
  say('s','Der Mann wird in dieser Arenarunde nicht mehr aufstehen. Aber wir haben wenigstens sein Leben gerettet.',{do:f=>pose(f.smith,{a:0})}),
  {dur:.3,card:null,do:f=>{f.smith.to=[HOME[0],HOME[1],46,0];f.camTo={x:452,y:412,vw:300,rate:2};}},{until:f=>!f.smith.to},
  say('s','So. Und jetzt, da alle fünf etwas gelernt haben, bringen wir sie dorthin, wo sie hingehören.',{do:f=>pose(f.smith,{a:0,traderPose:'shout',gest:0})}),
  say('r3','ENDLICH! ZUM MEDIKUS!'),
  say('s','Nein, zunächst hätte ich an den Müllplatz gedacht. Aber gut, nehmen wir den Medikus.',{do:f=>pose(f.smith,{a:0,forgePose:'sip'})}),
  {dur:.7,do:f=>{st().chained=0;M.sound?.('heavy');f.rec.forEach(a=>{a.jumpTimer=.2;});}}
 ],{label:'10 · Erste Hilfe und Kameradschaft',done:()=>scene11()});}
// ---------- SZENE 11 · ALLE VERLETZUNGEN IM ÜBERBLICK ----------
const INJ=[
 {t:'KLINGEN UND SPITZEN · BLUTEN',say:'Alles, was schneidet oder sticht, blutet. Und was blutet, hat es eilig.',rows:[
  ['Schürfwunde · Schnittwunde · Tiefe Schnittwunde','Dolch, Schwert, Axt','blutet; je tiefer, desto länger'],
  ['Stichverletzung · Tiefe Stichverletzung','Stoß, Speer, Pfeil, Wurfwaffen','kleines Loch, starke Blutung'],
  ['Sehnenverletzung','Klinge an Hand, Fuß, Unterarm, Unterschenkel ab Grad 3','Narbe; das Glied taugt kaum noch'],
  ['Tiefe Bauchwunde · innere Verletzung','Klinge in den Bauch ab Grad 3','10 Tage, blutet nach, kann töten'],
  ['Durchstochen','Speer durch eine zerstörte Stelle','Dauerschaden 10 %']]},
 {t:'STUMPFE WAFFEN · BRECHEN',say:'Alles Stumpfe blutet nicht. Es sorgt nur dafür, dass du den Mann wochenlang durchfütterst.',rows:[
  ['Bluterguss · Prellung · Muskelquetschung','Keule, Streitkolben, Hammer','Schmerz, heilt in Tagen bis Wochen'],
  ['Gehirnerschütterung','Schlag auf den Kopf','trifft und blockt schlechter'],
  ['Gelenkverletzung','Hand, Fuß, Schulter','Schmerz bei jeder Bewegung'],
  ['Knochenbruch · Schwerer Knochenbruch','stumpf auf Arm oder Bein ab Grad 3','7 oder 14 Tage; das Glied leistet nur ein Viertel'],
  ['Trümmerbruch · Zertrümmert','Hammer, Streitkolben, Keule','20 oder 24 Tage; Dauerschaden 8 oder 18 %']]},
 {t:'WAS BLEIBT · FÜR IMMER',say:'Und das hier ist der Teil, den dir kein Medikus zurückgibt. Lies ihn zweimal.',rows:[
  ['Dauerhafte Einschränkung','jeder Treffer ab Grad 3, mit 10 % Risiko','die Stelle heilt nie wieder auf 100 %'],
  ['Amputation','Klinge auf ein fast zerstörtes Glied','Arm: kein Schild, keine Zweihandwaffe. Bein: kaum Bewegung'],
  ['Blutverlust','jede offene Wunde','unter 28 % kampfunfähig; am Boden bei 0 % tot'],
  ['Tod','Enthauptung, Durchtrennung, Halsschnitt, Kopf- oder Brusttreffer','endgültig; Halle der Gefallenen']]}];
const injCard=(G,i)=>`<div class="medic-card"><h4>${i+1} / ${INJ.length} · ${G.t}</h4><table class="medic-inj-table"><tr><th>Verletzung</th><th>Woher</th><th>Folge</th></tr>${G.rows.map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table></div>`;
function scene11(){setStage('s11');st().chained=0;const say=(who,text,o)=>({who,say:text,...o});
 yardFilm([
  {dur:.5},
  say('s','Bevor wir hineingehen: einmal alles zusammen. Damit später keiner sagen kann, er habe es nicht gewusst.',{do:f=>pose(f.smith,{a:0,traderPose:'shout',gest:0})}),
  ...INJ.map((G,i)=>say('s',G.say,{hold:true,card:injCard(G,i),do:f=>pose(f.smith,{a:i%2?Math.PI:0,forgePose:i===1?'sip':''})})),
  say('r2','Das hättet Ihr auch einfach AUFSCHREIBEN können!',{card:null,do:f=>{f.rec[1].stagger=.8;}}),
  say('s','Habe ich. Auf euch.',{do:f=>pose(f.smith,{a:0,forgePose:'sip'})})
 ],{label:'11 · Alle Verletzungen im Überblick',done:()=>stepMedic()});}
// ---------- SZENE 12 · BEIM MEDIKUS (echtes Krankenhausmenü, nur zum Ansehen) ----------
const billFor=tier=>recs().reduce((n,g)=>n+M.medicalCost(g,tier),0);
function stepMedic(){setStage('medic');const s=st();s.chained=0;M.ui.click('nav:medic');
 showGuide({lock:['medic','detail'],lines:['Willkommen beim Medikus. Hier liegen alle, die heute etwas gelernt haben.',
  'Oben die Akten der fünf. Für jede Behandlung steht dort: was sie kostet, wann der Mann wieder bereit ist und was von ihm übrig bleibt.',
  'Natürliche Heilung kostet nichts, dauert aber am längsten: drei Punkte je Stelle und Tag.',
  'Medicus, Premium, Spezialbehandlung: sofort bessere Werte, mehr Blut, vier Tage schnellere Heilung. Je kaputter der Mann, desto teurer.',
  'Brüche heilen trotzdem kaum schneller. Dauerschäden werden nur etwas kleiner. Und ein Arm wächst nicht nach, egal was du zahlst.',
  'Du könntest jetzt also jeden der fünf behandeln lassen. Theoretisch.'],done:()=>scene12()});}
// ---------- SZENE 13 · DIE RECHNUNG ----------
function scene12(){setStage('s12');hideGuide();M.ui.click('nav:home');const say=(who,text,o)=>({who,say:text,...o}),bill=billFor(3),angry=(f,i)=>{const a=f.rec[i];a.stagger=1.2;a.facePain=1.5;if(!a.down)a.state='celebrate';};
 yardFilm([
  {dur:.6},
  say('s','Spezialbehandlung für alle fünf: '+fmt(bill)+' Gold. Fünf neue Rekruten: fünfhundert.',{do:f=>pose(f.smith,{a:0,traderPose:'coins',gest:0})}),
  say('s','Die Behandlung sparen wir uns also. Das kostet echt einen Haufen Geld.',{do:f=>pose(f.smith,{a:0,forgePose:'sip'})}),
  {dur:1.1,do:f=>{f.rec.forEach(a=>{a.facePain=1.5;});}},
  say('r1','WIE BITTE?!',{do:f=>angry(f,0)}),
  say('r2','IHR HABT UNS DAS ANGETAN! IHR! MIT EINER KISTE!',{do:f=>angry(f,1)}),
  say('r3','ICH BLUTE EUCH DEN GANZEN HOF VOLL, WENN ES SEIN MUSS!',{do:f=>angry(f,2)}),
  say('r4','MEIN BEIN IST EINE SAMMLUNG SCHLECHTER ENTSCHEIDUNGEN! EURER!',{do:f=>angry(f,3)}),
  say('r5','ICH HABE NUR NOCH EINEN ARM, UND DER ZEIGT AUF EUCH!',{do:f=>angry(f,4)}),
  say('s','Seht ihr? Die Lungen funktionieren bei allen fünf. Natürliche Heilung. Kostet nichts, dauert nur.',{do:f=>{pose(f.smith,{a:0,traderPose:'point',gest:0});f.rec.forEach(a=>{if(!a.down)a.state='idle';});}}),
  say('s','Merke dir: Dein Gold gehört den Besten. Ein großes Talent verdient dir über viele Kämpfe Ruhm und Gold. Solche Männer schützt und behandelst du.',{do:f=>pose(f.smith,{a:Math.PI})}),
  say('s','Für aussichtslose Herausforderungen haben wir die Untalentierten. Davon bringt uns der Sklavenhändler morgen wieder fünf neue.',{do:f=>pose(f.smith,{a:0})}),
  say('r5','WAS?!',{do:f=>angry(f,4)}),
  say('s','Willkommen in der Wirtschaft, mein Junge.',{do:f=>{f.smith.forgePose='sip';}}),
  {dur:1.6,do:f=>{for(let i=0;i<5;i++)angry(f,i);M.sound?.('crowd');f.shake=2;float(f,f.rec[1],'UNVERSCHÄMTHEIT!','#f29b83');float(f,f.rec[3],'MONSTER!','#f29b83',-20);}},
  say('s','Selten hatte ich eine aufmerksamere Klasse.',{do:f=>{pose(f.smith,{a:Math.PI});f.smith.to=[330,392,30];}}),
  {dur:1.2,do:f=>{for(let i=0;i<5;i++)angry(f,i);float(f,f.rec[0],'KOMMT ZURÜCK!','#f29b83');}},
  say('s','Ruhe bitte. Der Unterricht ist beendet.',{do:f=>{f.smith.to=null;pose(f.smith,{a:0});}}),
  {dur:.9,do:f=>{f.smith.to=[300,380,44];}}
 ],{label:'13 · Die Rechnung',done:()=>finale()});}
// Akten der fünf im echten Krankenhausmenü: Zusatz der Testversion, rechnet mit den Heilregeln des Spiels
const TIER=['Natürlich','Medicus','Premium','Spezialbehandlung'];
function dossier(g,rank){const d=B.info(g),parts=Object.entries(g.body).filter(([,p])=>p.hp<100-p.chronic||p.missing||p.fracture||p.internal||p.bleed),done=(st().treated||{})[g.id],now=M.power(g),fc=[0,1,2,3].map(t=>forecast(g,t)),lost=parts.filter(([,p])=>p.missing).length;
 return `<section class="box medic-file bk-t${d.tier.level}"><header><canvas data-face="${g.id}" width="80" height="100"></canvas><div><h3>#${rank} · ${esc(g.name)}</h3><p><span class="bk-stars">${stars(d.tier.level)}</span> ${esc(d.tier.name)} · Talent ${d.talent}</p><div class="medic-bar"><i style="width:${Math.round(g.blood)}%"></i><b>Blut ${fmt(g.blood)} %</b></div><p>Gesundheit ${fmt(M.health(g))} % · Kampfwert jetzt <b>${now}</b> (gesund: ${fc[0].kw}${fc[0].chronic||lost?', mit Dauerfolgen':''})</p></div></header>
<ul>${parts.map(([id,p])=>`<li><b>${esc(M.partName(id))}</b>: ${esc(partLine(g,id))} · <span class="medic-g${M.injuryGrade(p)}">Grad ${M.injuryGrade(p)}</span>${p.fracture?' · Bruch, noch '+Math.ceil(p.fracture.days/(M.HEAL_SPEED||1))+' Tage':''}${p.chronic?' · <b class="medic-red">Dauerschaden −'+fmt(p.chronic)+' %</b>':''}${p.missing?' · <b class="medic-red">bleibt verloren</b>':''}</li>`).join('')||'<li>Keine offene Verletzung.</li>'}</ul>
<table class="medic-plan"><tr><th>Behandlung</th><th>Kosten</th><th>Bereit in</th><th>Danach</th></tr>${fc.map((x,t)=>`<tr class="${done===t?'chosen':''}"><td>${TIER[t]}</td><td>${x.cost?fmt(x.cost)+' G':'kostenlos'}</td><td><b>${x.days} ${x.days===1?'Tag':'Tagen'}</b><br><small>Tag ${S.day+x.days}</small></td><td>KW ${x.kw}${x.chronic?'<br><small class="medic-red">Dauer −'+fmt(x.chronic,1)+' %</small>':''}${x.lost?'<br><small class="medic-red">Arm fehlt</small>':''}</td></tr>`).join('')}</table>
<p class="tiny">${esc(limbText(g))}</p></section>`;}
function finale(){setStage('end');hideGuide();M.ui.click('nav:home');const v=document.createElement('div');v.className='medic-end';v.innerHTML=`<div><p class="eyebrow">WAS DU JETZT WEISST</p><ul>
<li>Leichte Verletzungen heilen vergleichsweise schnell.</li><li>Schwere Verletzungen können lange Behandlungen erfordern. Ein Bruch bindet einen Mann für Wochen.</li><li>Manche Verletzungen hinterlassen Narben. Jede Wunde steht mit Verursacher und Waffe in der Akte.</li><li>Kameraden können unter passenden Bedingungen Erste Hilfe leisten.</li><li>Gute Gladiatoren sind langfristige Investitionen.</li><li>Im Medikus siehst du für jeden Mann Kosten, Dauer und Folgen jeder Behandlung. Ob sie sich lohnt, entscheidest du.</li></ul>
<div class="medic-warn"><b>DAUERHAFT HEISST DAUERHAFT.</b><p>Dauerschäden senken die Obergrenze einer Körperstelle für immer. Amputationen bleiben bestehen. Schwerer Blutverlust kann tödlich sein. Und der Tod ist endgültig.</p><p>Sei vorsichtig, wen du wohin schickst. Kein Medikus und kein Gold holen zurück, was einmal fehlt.</p></div>
<div class="medic-sim"><b>ARENA THEORY IST EINE HOCHKOMPLEXE SIMULATION.</b><p>Jeder Gladiator hat 18 Körperstellen mit eigenem Zustand, Schmerz, Blutung, Bruch und Dauerschaden. 18 Waffengattungen verletzen auf ihre eigene Art. Über zwanzig Verletzungsarten, sechs Schweregrade, Narben und eine lückenlose Wundhistorie. Nichts davon ist Dekoration: Alles zählt im nächsten Kampf.</p></div>
<h2>TUTORIAL ABGESCHLOSSEN – DER MEDIKUS</h2><div class="buttons">${TEST?'<button class="btn primary" type="button" data-medic="again">NOCH EINMAL VON VORN</button><button class="btn" type="button" data-medic="menu">SZENE WÄHLEN</button><button class="btn" type="button" data-medic="free">FREI WEITERSPIELEN</button>':'<button class="btn primary" type="button" data-medic="finish">WEITER</button>'}</div>${TEST?'<p class="tiny">Testversion. Nichts hiervon wird gespeichert oder ins Hauptspiel übernommen.</p>':'<p class="tiny">Die fünf bleiben mit ihren Verletzungen in deinem Kader. Behandeln kannst du sie jederzeit beim Medikus.</p>'}</div>`;document.body.appendChild(v);}

// =====================================================================================================
// 6 · ABLAUF, SZENENWAHL, ÜBERSPRINGEN
// =====================================================================================================
const SCENES=[['Ein neuer Tag',scene1],['Fünf frische Rekruten',()=>stepBuy()],['Was ist Talent?',scene3],['Die Kiste des Schmieds · alle 18 Waffen',scene4],['Leichte Verletzung (Dolch)',scene5],['Stumpfe Verletzungen (Keule, Streitkolben)',scene6],['Stich, Pfeil und Netz',scene7],['Bruch und Dauerschaden (Hammer)',scene8],['Amputation (Axt)',scene9],['Erste Hilfe und Kameradschaft',scene10],['Alle Verletzungen im Überblick',scene11],['Beim Medikus',()=>stepMedic()],['Die Rechnung',scene12],['Abschluss',()=>finale()]];
function clearAll(){stopFilm();hideGuide();M.ui.close();for(const el of document.querySelectorAll('.medic-end,.medic-night,.medic-menu,.medic-start'))el.remove();}
// Zustand für den Einstieg in Szene n herstellen: frische fünf Rekruten über den echten Händler, danach alle Ereignisse der früheren Szenen ohne Animation
function prepare(n){const old=st().ids;S.roster=S.roster.filter(g=>!old.includes(g.id));S.teams=S.teams.map(t=>t.filter(id=>!old.includes(id)));S.medic=fresh();const s=st();S.gold=Math.max(S.gold,3000);rosterBefore=null;
 if(n>=3){restock();for(let i=0;i<5;i++){S.gold+=100;const g=M.trader.buy(i);if(g)s.ids.push(g.id);}s.order=[...s.ids];}
 if(n>=4){s.order=rankOrder();s.chained=5;}if(n>=5)s.crate=true;
 for(let k=5;k<Math.min(n,11);k++)for(const key of SCENE_EV[k]||[])fire(key);
 if(n>=11)s.chained=0;}
function jump(n){clearAll();prepare(n);M.ui.click('nav:home');M.ui.render();SCENES[n-1][1]();}
function skipScene(){const f=film;if(!f)return;const stage=st().stage,k=+stage.replace(/\D/g,'');const done=f.done;stopFilm();if(stage==='s3'){st().order=rankOrder();st().chained=5;}if(stage==='s4')st().crate=true;for(const key of SCENE_EV[k]||[])fire(key);if(stage==='s10'){st().chained=0;}done?.();}
function menu(){document.querySelector('.medic-menu')?.remove();const v=document.createElement('div');v.className='medic-menu';v.innerHTML=`<div><header><b>SZENENWAHL · TESTVERSION</b><button class="btn small" type="button" data-medic="closemenu">✕</button></header><ol>${SCENES.map(([t],i)=>`<li><button class="btn" type="button" data-medic="jump:${i+1}">${i+1} · ${esc(t)}</button></li>`).join('')}</ol>${M.injuryShots?`<div class="medic-shotmenu"><button class="btn" type="button" data-medic="gallery">GALERIE · ALLE NAHAUFNAHMEN ANSEHEN</button><button class="btn" type="button" data-medic="shots">NAHAUFNAHMEN IM TUTORIAL: ${shotsOn?'AN':'AUS'}</button></div>`:''}<p class="tiny">Jede Szene beginnt mit fünf neuen, echten Rekruten; frühere Verletzungen werden ohne Animation nachgestellt. Nichts wird gespeichert.</p></div>`;document.body.appendChild(v);}
// ---------- Galerie: jede Nahaufnahme einzeln antippen (Körperstelle × Verletzung, am gewählten Gladiator) ----------
const GAL_PARTS=[['head','Kopf'],['neck','Hals'],['chest','Brust'],['belly','Bauch'],['ls','Schulter'],['lua','Oberarm'],['lfa','Unterarm'],['lh','Hand'],['lt','Oberschenkel'],['lsh','Unterschenkel'],['lf','Fuß']];
const GAL_W={scrape:'gladius',cut:'gladius',deepcut:'long',stab:'dagger',deepstab:'spear',arrow:'bow',sinew:'gladius',gut:'spear',pierce:'spear',bruise:'club',contusion:'club',crush:'mace',concussion:'club',joint:'mace',fracture:'mace',badfracture:'hammer',shatter:'hammer',pulp:'hammer',sever:'axe'};
let gal={who:0,right:false,men:null};
function galleryMen(){if(recs().length)return recs();if(!gal.men){const rng=S.rng;gal.men=[0,1,2,3,4].map(()=>M.makeGladiator(0));S.rng=rng;}return gal.men;}
function gallery(cmd,arg){const S2=M.injuryShots;if(!S2)return;const men=galleryMen();
 if(cmd==='who')gal.who=+arg;else if(cmd==='side')gal.right=!gal.right;
 else if(cmd==='play'){const [part0,kind]=arg.split('|'),part=gal.right&&part0[0]==='l'?'r'+part0.slice(1):part0,g=men[gal.who%men.length],name=S2.kinds.find(k=>k[1]===kind)[0],wid=GAL_W[kind],it=wid?item(wid):null,bleeds=['cut','deepcut','stab','deepstab','arrow','sinew','gut','pierce','sever'].includes(kind);
  S2.play(kind==='collapse'?{g,part,kind,line1:g.name+' verliert zu viel Blut',title:'Geht blutend zu Boden',line3:'Blut unter 28 % · für diesen Kampf verloren',color:'#f29b83'}:kind==='scar'?{g,part,kind,line1:g.name+' behält davon:',title:'Dauerhafte Einschränkung',line3:'heilt nie mehr ganz',color:'#f29b83'}:{g,part,kind,wid,line1:smithName()+(it?' ('+M.itemTitle(it)+')':'')+' fügt '+g.name+' zu:',title:name,line3:[kind==='arrow'?'der Pfeil bleibt stecken':'',kind==='sever'?'für immer verloren':bleeds?'blutet weiter':''].filter(Boolean).join(' · '),color:['sever','shatter','pulp','badfracture','gut','pierce'].includes(kind)?'#f29b83':'#f4d37a'});return;}
 let v=document.querySelector('.medic-gallery');const top=v?.scrollTop||0;v?.remove();v=document.createElement('div');v.className='medic-gallery';
 v.innerHTML=`<div><header><b>GALERIE · NAHAUFNAHMEN</b><button class="btn small" type="button" data-medic="closegallery">✕</button></header><p class="tiny">Antippen spielt die Nahaufnahme ab, nochmal tippen bricht sie ab. Aussehen (Haut, Haar, Bart, Porträt) kommt vom gewählten Gladiator.</p><div class="medic-galmen">${men.map((g,i)=>`<button class="btn${i===gal.who?' primary':''}" type="button" data-medic="gal:who" data-arg="${i}"><canvas data-galface="${i}" width="80" height="100"></canvas><span>${esc(first(g))}</span></button>`).join('')}</div><button class="btn" type="button" data-medic="gal:side">KÖRPERSEITE: ${gal.right?'RECHTS':'LINKS'}</button>${GAL_PARTS.map(([id,label])=>`<section><h4>${label.toUpperCase()}</h4><div>${S2.kinds.filter(k=>k[2](id)).map(k=>`<button class="btn small" type="button" data-medic="gal:play" data-arg="${id}|${k[1]}">${esc(k[0])}</button>`).join('')}</div></section>`).join('')}</div>`;
 document.body.appendChild(v);v.scrollTop=top;for(const c of v.querySelectorAll('canvas[data-galface]'))M.renderPortrait(c,men[+c.dataset.galface],{unarmored:true});}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-medic]');if(!b)return;const [k,n]=b.dataset.medic.split(':');if(k==='skip')return;e.preventDefault();e.stopPropagation();
 if(k==='menu'){if(TEST)menu();}else if(k==='shots'){shotsOn=!shotsOn;menu();}else if(k==='gallery'||k==='gal')gallery(n,b.dataset.arg);else if(k==='closegallery')document.querySelector('.medic-gallery')?.remove();else if(k==='closemenu')document.querySelector('.medic-menu')?.remove();else if(k==='finish'){clearAll();setStage('done');M.ui.render();}else if(!TEST)return;else if(k==='jump')jump(+n);else if(k==='again'||k==='start')jump(1);else if(k==='free'){clearAll();setStage('free');}},true);
// ---------- Einhängen: Takt, Klicks, Krankenhausseite ----------
const tick=M.ludusTick;M.ludusTick=dt=>{if(film){stepFilm(Math.min(dt,.05));return;}tick?.(dt);guideTick(dt);if(!TEST)autoStart(dt);};
// Im Spiel: Start, sobald das Löwen-Kapitel in dieser Sitzung endet. Spielstände, in denen es schon früher vorbei war, überspringen das Kapitel.
// Nach Neuladen setzt die laufende Szene von vorn an; bereits gefallene Treffer bleiben bestehen (fire() löst jedes Ereignis nur einmal aus).
if(!TEST&&S.lion?.stage&&['done','skip'].includes(S.lion.stage)&&!st().stage&&!st().armed)st().stage='skip';
let wait=0,lastLion=S.lion?.stage;
const busy=()=>!!S.battle||!!film||!!M.lionChapter?.film||!!M.lionChapter?.guide||!!M.smithWrath?.scene||!!M.archerPlot?.scene||!!M.hall?.film||!!M.intro?.active?.()||!!window.ArenaTheoryIntro?.active?.()||!!M.trader?.tutorial||!!document.querySelector('.smith-ceremony,#introView,#brandIntro,.medic-night,.medic-end')||($('modal')&&!$('modal').hidden);
function resume(){const s=st().stage;({s1:scene1,day:stepDay,night:scene1b,s1b:scene1b,buy:()=>stepBuy(),s2:scene2,s3:scene3,s4:scene4,s5:scene5,s6:scene6,s7:scene7,s8:scene8,s9:scene9,s10:scene10,s11:scene11,medic:()=>stepMedic(),s12:scene12,end:()=>finale()})[s]?.();}
function autoStart(dt){if(document.hidden||M.benchmarkActive)return;const s=st(),lion=S.lion?.stage;
 if(!s.stage){if(lastLion!=='done'&&lion==='done'){s.armed=true;M.persist?.();}lastLion=lion;if(!s.armed)return;if(M.ui.getPage()!=='home'||busy()){wait=0;return;}wait+=dt;if(wait>1.5){wait=0;scene1();}return;}
 if(['done','skip','free'].includes(s.stage)||guide||film)return;if(busy()){wait=0;return;}if(M.ui.getPage()!=='home'&&!['buy','medic'].includes(s.stage))return;wait+=dt;if(wait>1.2){wait=0;resume();}}
const click=M.schoolClick;M.schoolClick=a=>{const stage=st().stage,[p,b,c]=a.split(':');
 if(stage==='day'){if(p==='rest'){setStage('night');hideGuide();nightfall(()=>scene1b());return true;}if((p==='nav'&&b!=='home')||p==='detail'||a==='ludus:owner'){M.ui.notify('Erst einen Tag verstreichen lassen: „NÄCHSTER TAG ▸“.');return true;}}
 if(guide?.lock&&(['rest','rest3','familyrest'].includes(p)||a==='ludus:owner'||a==='army:treatall'||(p==='nav'&&!guide.lock.includes(b)&&b!=='market'))){M.ui.notify('Erst die Aufgabe des Schmieds erledigen.');return true;}
 if(stage==='medic'&&p==='treat'){const g=byId(b);if(g&&st().ids.includes(b)&&S.gold>=M.medicalCost(g,+c))st().treated[b]=+c;setTimeout(()=>M.ui.render(),0);return click(a);}
 return click(a);};
// Nach dem Tutorial: das ganze Krankenhaus als Akten wie im Tutorial (Porträt, Blut, Verletzungen mit Grad, Behandlungstabelle
// mit Kosten, verbleibenden Tagen bis einsatzbereit und Kampfwert danach) – mit den echten Behandlungsknöpfen des Spiels.
// Die Tage werden jeden Tag aus dem aktuellen Zustand neu berechnet und zählen so herunter.
const ward=()=>['','done','skip'].includes(st().stage||'');
function patients(){return S.roster.filter(g=>!g.dead&&(Object.values(g.body).some(p=>p.hp<100-p.chronic||p.missing||p.fracture||p.internal||p.bleed)||g.blood<100)).map(g=>({g,d:forecast(g,0).days})).sort((a,b)=>b.d-a.d).map(x=>x.g);}
function wardFile(g,rank){let html=dossier(g,rank);
 const heal=g.healing?`<p class="medic-now">Behandlung läuft · noch ${g.healing.days} ${g.healing.days===1?'Tag':'Tage'} verstärkte Heilung</p>`:'';
 const btns=`<div class="medic-acts">${[1,2,3].map(t=>{const c=M.medicalCost(g,t),no=S.gold<c;return `<button class="btn small${no?'':' primary'}" data-action="treat:${g.id}:${t}"${no?' disabled':''}>${TIER[t].toUpperCase()} · ${fmt(c)} G</button>`;}).join('')}</div>`;
 return html.replace('<table class="medic-plan">',heal+'<table class="medic-plan">').replace('</table>','</table>'+btns+smithBtn(g));}
// Abschieben in die Schmiedelehre direkt vom Krankenbett (nutzt die vorhandene Lehre des Schmieds: Warteschlange, 10 Tage,
// kein Sold mehr ab dem Abschicken). Der Medicus gibt jedes Mal einen üblen Spruch mit.
const SMITH_LINES=['Der Arm hält nie wieder ein Schwert. Für eine Zange reicht es. Knapp.','Ich flicke keine Ruinen. Der Schmied schon – mit Hammer und Glut.','Kämpfen kann er nicht mehr. Schreien schon. Das passt gut zum Amboss.','Spar dir den Sold. Der Schmied bezahlt ihn mit Ruß und Prügel.','Ich habe Ziegen gesehen, die besser heilen. Ab in die Esse mit ihm.','Sein Knie knackt lauter als das Feuer. Er wird sich dort wie zu Hause fühlen.','Für die Arena zu kaputt, fürs Grab zu stur. Bleibt nur die Schmiede.','Gib ihm eine Lederschürze. Die verdeckt wenigstens die Narben.','Der Schmied braucht jemanden, den er anbrüllen kann. Der hier hört eh schlecht.','Sag ihm, es ist eine Beförderung. Er glaubt dir bestimmt.','Ich würde ihn ja einschläfern, aber das kostet extra. Die Schmiede ist umsonst.','Zehn Tage am Blasebalg. Danach braucht er mich nie wieder. Niemand braucht mich dann.','Wenn er dort stirbt, ist es wenigstens warm.','Seine Hände zittern. Gut, dann schmiedet er Kettenhemden.','Das Bein ist hin. Am Amboss steht man ohnehin nur rum und weint.','Ich habe ihn genäht wie einen Mehlsack. Soll der Schmied den Rest zusammenhämmern.','Bring ihn weg, bevor er mir noch auf den Tisch blutet. Der war frisch geschrubbt.','Er fragt, ob es weh tun wird. Ich habe gelacht. Er nicht.'];
const smithLine=()=>SMITH_LINES[Math.floor(Math.random()*SMITH_LINES.length)];
function smithBtn(g){const W=M.workshop;if(!W)return '';if(g.smithDuty)return `<p class="medic-now">⚒ ${g.smithDuty==='queue'?'Wartet auf die Schmiedelehre':'In der Schmiedelehre'} · kein Sold</p>`;const no=!W.state?.master;return `<div class="medic-acts"><button class="btn small" data-action="medic:smith:${g.id}"${no?' disabled title="Erst einen Hauptschmied einstellen"':''}>⚒ ZUM SCHMIED IN DIE LEHRE${no?' · KEIN SCHMIED':''}</button></div>`;}
const clickBase=M.schoolClick;M.schoolClick=function(action){const [k,a,id]=String(action||'').split(':');if(k!=='medic'||(a!=='smith'&&a!=='smithgo'))return clickBase?.apply(this,arguments);if(S.battle)return true;const g=byId(id);if(!g){M.ui.render();return true;}
 if(a==='smith'){M.ui.modal('Ab in die Schmiede?',`<p class="medic-quip"><b>Medicus:</b> „${esc(smithLine())}“</p><p class="tiny">${esc(g.name)} geht zehn Tage in die Lehre beim Schmied. Ab sofort zahlst du keinen Sold mehr für ihn. Er kämpft nicht mehr. Die Lehre überlebt kein Lehrling.</p>`,`<button class="btn primary" data-action="medic:smithgo:${g.id}">IN DIE LEHRE SCHICKEN</button>`);return true;}
 const msg=M.workshop.sendGladiator(g.id);M.ui.close();M.ui.notify(msg);M.ui.render();return true;};
function wardPage(){const list=patients();setTimeout(()=>{for(const c of document.querySelectorAll('.medic-files canvas[data-face]')){const g=byId(c.dataset.face);if(g)M.renderPortrait(c,g,{unarmored:true});}},0);
 return `<div class="page-head"><h1>Krankenhaus</h1><p class="sub">${list.length?list.length+' Patienten · Tage = verbleibend bis einsatzbereit, jeden Tag neu gerechnet':'Niemand liegt hier. Noch.'}</p></div>
 <section class="box"><div class="toolbar"><button class="btn" data-action="army:treatall">ALLE BEHANDELN · MEDICUS</button><button class="btn" data-action="army:replace">TEAM VERLETZTE ERSETZEN</button><button class="btn" data-action="nav:automation">EINSATZREGELN</button></div><p class="tiny">Kasse ${fmt(S.gold)} Gold · Natürlich heilt am Ruhetag, Behandlungen wirken sofort und vier Tage lang. Verlorenes wächst nicht nach.</p></section>
 <div class="medic-files medic-ward">${list.map((g,i)=>wardFile(g,i+1)).join('')}</div>`;}
const page=M.schoolPage;M.schoolPage=p=>{if(p==='medic'&&ward()&&!TEST)return wardPage();const html=page(p);if(p!=='medic'||!['medic','s12','end','free'].includes(st().stage)||!recs().length)return html;setTimeout(()=>{for(const c of document.querySelectorAll('.medic-files canvas[data-face]')){const g=byId(c.dataset.face);if(g)M.renderPortrait(c,g,{unarmored:true});}},0);
 return `<div class="medic-files"><p class="eyebrow">AKTEN DER FÜNF · WAS EINE BEHANDLUNG BRINGEN WÜRDE</p>${recs().map((g,i)=>dossier(g,i+1)).join('')}<p class="tiny">Darunter folgt das unveränderte Krankenhausmenü des Spiels. Die Behandlungsknöpfe dort sind die echten.</p></div>`+html;};

// ---------- Testumgebung: eigener, flüchtiger Spielstand direkt nach dem Löwenkampf ----------
function setup(){const W=M.workshop;S.started=true;S.schoolName='Ludus Test';S.lanista={name:'Lanista',height:180,weight:85,veteran:true,appearance:{skin:'#d9ac82',shade:'#9c7353',hair:'#443025',style:1,beard:2,cloth:'#435e6a'}};S.gold=2000;
 if(!W.state.master)W.hireMaster(W.sketch());W.state.intro='done';Tr().intro='done';if(S.hall)S.hall.tut='done';else S.hall={tut:'done',recruit:null,tag:{}};S.lion={stage:'done',recruits:[],base:[]};S.archerPlot={seen:0,asked:true,state:'declined'};S.wanderers={version:1,next:S.day+9999,group:null,known:[]};
 // Die fünf vom Löwenkampf: gekauft, gefallen, in der Halle
 for(let i=0;i<5;i++){const g=M.makeGladiator(0);S.roster.push(g);M.kill(g,'Von Rex Vetus zerfleischt','Rex Vetus');}S.gold=1500;M.ui.click('nav:home');M.ui.render();}
function startCard(){const v=document.createElement('div');v.className='medic-start';v.innerHTML=`<div><p class="eyebrow">ARENA THEORY · TESTVERSION</p><h1>DER MEDIKUS</h1><p>Story-Tutorial nach dem Löwenkampf: neuer Tag, fünf frische Rekruten, die Kiste des Schmieds, Verletzungen von der Schürfwunde bis zur Amputation, Erste Hilfe und das Krankenhaus.</p><div class="buttons"><button class="btn primary" type="button" data-medic="start">TUTORIAL STARTEN</button><button class="btn" type="button" data-medic="menu">SZENE WÄHLEN</button><button class="btn" type="button" data-medic="gallery">GALERIE DER NAHAUFNAHMEN</button></div><p class="tiny">Eigenständige Vorschau mit eigenem, flüchtigem Spielstand. Das Hauptspiel und deine Spielstände bleiben unberührt. Enthält derben schwarzen Humor und Pixelblut.</p></div>`;document.body.appendChild(v);
 const b=document.createElement('button');b.className='btn small medic-fab';b.type='button';b.dataset.medic='menu';b.textContent='☰ SZENEN';document.body.appendChild(b);}
M.medic={resume,gallery,shots:v=>{if(v!=null)shotsOn=!!v;return shotsOn;},billFor,state:st,jump,menu,skipScene,prepare,forecast,wound,sever,dress,scenes:SCENES,events:EV,sceneEvents:SCENE_EV,fire,get film(){return film;},get guide(){return guide;},stepFilm,rankOrder,recs};
if(window.MEDIC_TEST){setup();startCard();}
})();
