'use strict';
// WAS DIE DATEI TUT: ARENA THEORY · BÄREN-KAMPF (B3a, B3b1; eigenständige Testversion; wird nur vom Bären-Kampf-Editor dist/baer-kampf.html geladen)
// =====================================================================================================
// · Bär als Kämpfer nach dem Muster der Hunde (dist/hund.js): Menschen treffen den Bären über M.rexReceive, der Bär trifft Menschen über M.hit,
//   Hunde über DOG.hurt, andere Bären direkt; gezeichnet über M.drawRex mit BAER.draw (Skelett aus dist/baer.js).
// · Gewebe je Körperstelle (kopf, hals, brust, bauch, vl, hl), Blut, Wunden an der getroffenen Stelle, Mut, Flucht.
// · Angriffe (Texte Englisch): Drohen, Scheinangriff, Anrennen, Prankenhieb, Hieb von oben, Biss mit Schütteln, Niederdrücken,
//   Ablassen (Braunbär), Flucht, Gliedmaße abreißen, Kopfbiss. Seit B3b1: Packen und Ringen (hält den Stehenden über den vorhandenen
//   Griff des Spiels fest: grabbedBy/rearFinish aus sim.js), Wegschleudern, Wegzerren, Lahmen bei verletzten Läufen, Abreißen am Gepackten
//   und (ab ☠4) am Stehenden.
// · Eigener Simulationsschritt für Kämpfe mit Bären (K.build, M.fixedStep nur für battle.baer), aus denselben Bausteinen wie arena-core.js.
// · B3c1 (Rückmeldung Thomas 27.11.2026): Pranke und Maul zielen auf die Trefferstelle am Gegner (Abschnitt „Zielen“), am Liegenden beißt der Bär
//   direkt in den Körperteil; die Stelle steht vor dem Ausholen fest. Schalter K.OPT.ziel, Adresse ?baerZiel=0.
// · B3c2 (Rückmeldung Thomas 27.11.2026): Drohen als Folge (volle Höhe, Tatzen schlagen durch die Luft, Brüllen, Schlag auf den Boden, Kieferklappern),
//   Anrennen im gestreckten Galopp mit echtem Tempo (K.OPT.tempo × Galopp, BAER.sprint), Sand unter den Pranken, Umspringen: der letzte Sprung geht
//   mit Brust und Vorderpranken in den Gegner, der fliegt nach Gewichtsverhältnis, der Bär landet bei ihm und drückt sofort nieder.
//   Schalter K.OPT.sturm, Adresse ?baerSturm=0 (dann alles wie vor B3c2).
// · B3b2: Übungsmodus für den Editor-Reiter Attacken (K.OPT.ueben: der Bär der Seite A greift nur auf Knopfdruck an; a.puppe: Übungsfigur steht still und
//   schlägt nicht), Anzeige von Reichweite und Treffpunkt (K.OPT.zeigen), Wunden von Hand (K.wound, K.heal), Leichenansicht für den zerdrückten Kopf
//   (K.OPT.brei, Adresse ?baerBrei=0: Kopf fehlt, am Boden Knochenbrei und der zerdrückte Helm), offener und geschlossener Helm beim Kopfbiss (K.helm).
// Keine Spieldatei wird geändert; die Werte sind vorläufig (Einmessen in B28). Schalter: K.OPT.
// =====================================================================================================
(()=>{
const M=window.MG,B=window.BAER,AN=window.AN;if(!M||!B||!AN)return;
const S=M.s,H=window.HahnArena,DG=()=>window.DOG,cl=M.clamp,TAU=Math.PI*2;
const rnd=(a,b)=>a+Math.random()*(b-a),sm=u=>{u=u<0?0:u>1?1:u;return u*u*(3-2*u);},dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const K={SCALE:1.08,TMAX:180,OPT:{tear:1,head:1,schaden:1,haerte:1,ringen:1,ziel:1,sturm:1,tempo:1.75,reakt:1,wucht:1.9,ueben:0,zeigen:0,brei:1},force:null};B.K=K;

// ---------------------------------------------------------------- Angriffe (Name im Spiel Englisch, Bedienung Deutsch)
K.ATTACKS=[['threat','Threat display','Drohen','Richtet sich auf, brüllt, zeigt die Zähne.'],['bluff','Bluff charge','Scheinangriff','Stürmt heran und bricht kurz vorher ab.'],
 ['charge','Charge','Anrennen','Galoppiert in den Gegner und rennt ihn um.'],['swipe','Paw swipe','Prankenhieb','Hieb von der Seite, die Krallen reißen Furchen.'],
 ['slam','Overhead slam','Hieb von oben','Richtet sich auf und lässt sich mit beiden Pranken auf den Gegner fallen.'],['bite','Bite and shake','Biss mit Schütteln','Beißt zu und schüttelt.'],
 ['grapple','Grab and wrestle','Packen und Ringen','Richtet sich auf, klammert den Stehenden mit beiden Vorderpranken fest, beißt und ringt ihn zu Boden.'],
 ['fling','Throw aside','Wegschleudern','Packt den Gegner mit dem Maul und schleudert ihn mit einem Ruck von Kopf und Nacken weg.'],
 ['pin','Pin down','Niederdrücken','Steht über dem Liegenden, beißt und reißt.'],['drag','Drag away','Wegzerren','Zerrt den Liegenden im Maul von den anderen Gegnern weg.'],['tear','Tear off limb','Gliedmaße abreißen','Verbeißt sich in Arm oder Bein und reißt es ab (am Liegenden, wenn das Glied schon schwer verletzt ist).'],
 ['crush','Head bite','Kopfbiss','Zerdrückt den Kopf des Liegenden zwischen den Zähnen. Tödlich.'],
 ['back','Back away','Zurückweichen','Geht rückwärts, Kopf tief zum Gegner, Ohren angelegt.'],['dodge','Jerk back','Ausweichen','Rumpf und Kopf zucken zurück, der Schlag geht vorbei, dann Gegenangriff. Knopf: dem nächsten Schlag weicht er sicher aus.'],
 ['recoil','Knocked back','Zurückgeworfen','Ein schwerer Treffer wirft ihn einen Schritt zurück. Knopf: der nächste Treffer wirft ihn zurück.'],['leave','Lose interest','Ablassen','Braunbären lassen von einem reglosen Opfer ab.'],['flee','Flee','Flucht','Hat genug.']];
const NAME=Object.fromEntries(K.ATTACKS.map(a=>[a[0],a[1]]));
const HOLD=['pin','tear','crush','grapple','drag'];// der Bär hat ein Opfer fest

// ---------------------------------------------------------------- Kampfparameter aus den Istwerten (vorläufig, B28 misst ein)
const PART_MAX={kopf:30,hals:26,brust:44,bauch:40,vl:24,hl:24},PARTS=Object.keys(PART_MAX);K.PARTS=PARTS;
K.PART_DE={kopf:'Kopf',hals:'Hals',brust:'Brust',bauch:'Flanke',vl:'Vorderpranke',hl:'Hinterlauf'};
const PART_EN={kopf:'head',hals:'neck',brust:'chest',bauch:'flank',vl:'forepaw',hl:'hind leg'};
function params(D){const s=D.stats,f=v=>v/50,wf=Math.pow(D.weight/250,.6),Br=B.breed(D.breed);
 const swipe=100*(.5+.5*f(s.pranke))*(.7+.3*f(s.kraft))*wf,bite=85*(.5+.5*f(s.biss))*(.8+.2*f(s.kraft))*wf;
 return {swipe,slam:swipe*1.5,bite,shake:bite*.4,ram:30*(.5+.5*f(s.kraft))*wf*wf,res:32*(.6+.4*f(s.zaeh))*wf,mass:D.weight*(.6+.4*f(s.kraft)),
  pace:cl(.7+.3*f(s.tempo),.6,1.25),stam:.7+.3*f(s.ausdauer),wild:cl(s.wild/100,0,1),mut:cl(s.mut/100,0,1),interrupt:26*(.7+.3*f(s.zaeh))*wf,
  evade:cl(.3*(.4+.6*f(s.tempo))/Math.sqrt(Math.max(.3,D.weight/250)),.04,.45),// Ausweichen (B3c3, vorläufig): aus Schnelligkeit, schwere Bären weichen seltener aus; der Zustand zählt beim Schlag dazu
  sz:B.params(D).sz,bauart:Br.bauart||Br.type||'G',skulls:B.skullsOf(Br)};}
K.params=params;

// ---------------------------------------------------------------- Bär als Kämpfer
K.makeFighter=function(D,team,x,y){
 const rng=S.rng,g=M.makeGladiator(0,team===1);S.rng=rng;
 g.name=D.name;g.id='baer-'+D.id+'-'+Math.floor(Math.random()*1e6).toString(36);g.role='Soldat';g.traits=[];g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};g.equipment={weapon:null,secondary:null,shield:null,armor:{}};
 for(const k in g.stats)g.stats[k]=48;Object.assign(g.stats,{will:100,morale:100,agility:cl(D.stats.tempo,15,95),reflex:cl(D.stats.tempo,15,95),strength:cl(D.stats.kraft,15,99),toughness:cl(D.stats.zaeh,15,99)});g.weight=D.weight;g.height=D.height;
 const P=params(D),a=M.createCombatActor(g,team,0),fig=B.actor(D,'stand'),tissue={},max={};for(const p of PARTS){max[p]=PART_MAX[p];tissue[p]=max[p];}
 fig.rate=2.6;fig.facing=team?-1:1;fig.wounds=[];
 Object.assign(a,{rex:true,bear:D,fig,P,x,y,r:20*P.sz,tissue,max,wounds:fig.wounds,blood:100,bleed:{},morale:100,energy:100,spray:[],pool:null,velocity:0,a:team?Math.PI:0,
  mode:'approach',clock:0,duration:0,cool:rnd(.3,1),z:0,hit:0,dirx:0,diry:0,victim:null,kills:0,hits:0,attacks:{},taken:0,threatDone:false,bluffs:0,grapples:0,flung:0,dragged:0,dodges:0,recoils:0,backs:0,retorts:0});
 return a;};
const out=a=>a.bear?a.g.dead||a.fled:a.dog?DG().out(a):a.down||a.surrendered||a.g.dead;K.out=out;
K.health=b=>cl(Math.min(...['kopf','hals','brust'].map(p=>b.tissue[p]/b.max[p]),(b.tissue.bauch+b.tissue.vl+b.tissue.hl)/(b.max.bauch+b.max.vl+b.max.hl))*100*Math.min(1,b.blood/70),0,100);
function log(t){const b=S.battle;if(!b)return;b.log.unshift({time:Math.floor(b.time),text:t});b.log.length=Math.min(60,b.log.length);K.onLog?.(t);}
function state(b,mode,dur=0){if(mode!=='pin')b.rush=false;if(b.mode==='threat'||mode==='threat'){b.phase=0;b.clacked=false;b.thrForce=false;}b.leap=null;b.mode=mode;b.clock=0;b.duration=dur;b.struck=false;b.ticks=0;b.aimPt=null;if(NAME[mode])b.attacks[mode]=(b.attacks[mode]||0)+1;}

// ---------------------------------------------------------------- Blut (wie beim Hund)
function spray(b,x,y,z,n,dir=null){for(let i=0;i<n;i++){const an=dir==null?rnd(0,TAU):dir+rnd(-.7,.7),v=rnd(15,75);b.spray.push({x,y,z,vx:Math.cos(an)*v,vy:Math.sin(an)*v*.55,vz:rnd(10,70),s:Math.random()<.3?2:1});}
 if(b.spray.length>240)b.spray.splice(0,b.spray.length-240);}
function stain(x,y,r){M.stains.push({x:x+rnd(-3,3),y:y+rnd(-2,2),r});if(M.stains.length>420)M.stains.shift();}
function stepSpray(b,dt){for(let i=b.spray.length-1;i>=0;i--){const p=b.spray[i];p.vz-=170*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.z<=0){b.spray.splice(i,1);if(Math.random()<.55)stain(p.x,p.y,p.s+Math.random()*1.4);}}}
// Stelle am Bären in Arenakoordinaten (für Blut)
function partWorld(b,part){const R=b.fig._R,f=B.facing(b.fig),s=b.P.sz*K.SCALE;if(!R)return {x:b.x,y:b.y,z:20*s};const [ax,ay]=B.anchor(R,part);return {x:b.x+f*ax*s,y:b.y,z:-ay*s};}

// ---------------------------------------------------------------- Sand (B3c2): spritzt unter den Pranken beim Anrennen, beim Schlag auf den Boden und beim Aufprall.
// Höchstens 40 Körner je Bär, jedes ein Kästchen, kein Fleck am Boden, nach einer halben Sekunde weg (Zeichenarbeit bleibt klein).
function sand(b,x,y,n,vx,pow){const L=b.dust||(b.dust=[]);for(let i=0;i<n&&L.length<40;i++)L.push({x:x+rnd(-3,3),y:y+rnd(-2,2),z:0,vx:vx*rnd(.3,1)+rnd(-14,14),vy:rnd(-9,9),vz:rnd(34,78)*pow,s:Math.random()<.35?2:1,l:rnd(.3,.55)});}
function stepDust(b,dt){const L=b.dust;if(!L||!L.length)return;for(let i=L.length-1;i>=0;i--){const p=L[i];p.vz-=260*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.l-=dt;if(p.z<0||p.l<=0)L.splice(i,1);}}
// ---------------------------------------------------------------- Schaden am Bären. kind: bite | claw | cut | stab | blunt
const WOUND_AT={kopf:[[-3,4],[-3,3]],hals:[[-4,4],[-4,4]],brust:[[-5,5],[-6,5]],bauch:[[-10,10],[-5,5]],vl:[[-2,2],[-5,5]],hl:[[-2,3],[-5,5]]};
function hurt(b,part,dmg,kind,att){if(b.g.dead||!(dmg>0))return 0;const P=b.P;
 // dickes Fell und Speck: Schnitte und stumpfe Schläge kommen schlechter durch als Stiche
 const wd=dmg*({cut:.85,blunt:.7,stab:1,bite:.9,claw:.95}[kind]??1)/(P.res*K.OPT.haerte);
 b.tissue[part]=Math.max(0,b.tissue[part]-wd);b.taken+=wd;b.hit=.3;if(K.OPT.reakt)b.fl={part,t:S.battle?.time||0,w:cl(wd/1.8,.4,1),front:!att||(att.x-b.x)*B.facing(b.fig)>=0,roar:wd>1.2};
 const bk={bite:.03,claw:.045,cut:.04,stab:.04,blunt:.006}[kind]??.02,pk={hals:1.7,kopf:1,brust:1,bauch:1.2,vl:.8,hl:.8}[part];
 b.bleed[part]=(b.bleed[part]||0)+wd*bk*pk;b.blood=Math.max(0,b.blood-wd*({bite:.07,claw:.1,cut:.1,stab:.09,blunt:.02}[kind]??.05)*pk);
 b.morale-=wd*1.3*(1-P.mut)*(part==='kopf'?1.2:1)*(1.1-P.wild*.5);
 const [u,v]=WOUND_AT[part];b.wounds.push({part,u:rnd(u[0],u[1]),v:rnd(v[0],v[1]),size:cl(wd/3.5,1,6),kind,seed:Math.random()*1e4});if(b.wounds.length>48)b.wounds.shift();
 const w=partWorld(b,part);spray(b,w.x,w.y,w.z,Math.min(26,3+wd*1.4),att?Math.atan2(b.y-att.y,b.x-att.x):null);if(wd>5)stain(w.x,w.y,2+wd*.15);
 if(att){b.lastAttacker=att.id;att.damage=(att.damage||0)+wd;if(wd>5&&!HOLD.includes(b.mode))b.grudge=att.id;}
 if(wd>3&&(S.battle?.time||0)-(b.lastRoar||-9)>1.2){b.lastRoar=S.battle?.time||0;B.sound?.('pain',b);}
 if(b.tissue.hals<=0||b.tissue.kopf<=0||b.tissue.brust<=0)die(b,att,{hals:'Throat opened',kopf:'Skull broken',brust:'Chest caved in'}[b.tissue.hals<=0?'hals':b.tissue.kopf<=0?'kopf':'brust']);
 return wd;}
K.hurt=hurt;
// Wunden von Hand (B3b2, Editor-Reiter Wunden): wd = Gewebepunkte, die die Stelle verliert (unabhängig von Härte und Fell)
K.wound=function(b,part,kind,wd){return hurt(b,part,wd*b.P.res*K.OPT.haerte/({cut:.85,blunt:.7,stab:1,bite:.9,claw:.95}[kind]??1),kind,null);};
K.heal=function(b){if(b.g.dead)return;for(const p of PARTS){b.tissue[p]=b.max[p];b.bleed[p]=0;}b.blood=100;b.morale=100;b.energy=100;b.wounds.length=0;b.fig.mouthBlood=0;b.fl=null;};
function die(b,a,cause){if(b.g.dead)return;releaseVictim(b);b.g.dead=true;b.down=true;b.death=true;b.g.cause=cause||'Bled out';b.g.killer=a?a.g.name:'';if(a)a.kills=(a.kills||0)+1;state(b,'dead',99);
 B.go(b.fig,null);b.fig.rate=1.2;B.pose(b.fig,'lie');B.sound?.('death',b);log(a?a.g.name+' kills '+b.g.name+'. ('+b.g.cause+')':b.g.name+' bleeds out in the sand.');}

// ---------------------------------------------------------------- Treffer am Bären (Mensch, Hund, Löwe) über M.rexReceive
const HPART={head:'kopf',neck:'hals',chest:'brust',belly:'bauch',ls:'brust',rs:'brust',lua:'vl',rua:'vl',lfa:'vl',rfa:'vl',lh:'vl',rh:'vl',lt:'hl',rt:'hl',lsh:'hl',rsh:'hl',lf:'hl',rf:'hl'};
function receive(a,d,projectile,snapshot){if(d.g.dead)return;const ef=snapshot||M.effective(a),w=ef.w||{};
 if(a.dog||a.lion||a.rex){// Tier beißt den Bären: der Schaden steht schon im Paket
  const part=HPART[ef.partId]||(Math.random()<.4?'hl':Math.random()<.5?'bauch':'hals'),wd=hurt(d,part,(ef.damage||w.damage||10)*rnd(.85,1.15),'bite',a);d.taken+=0;afterHit(d,a,wd);return;}
 if(!projectile&&dist(a,d)>ef.range+d.r+18)return;
 if(projectile&&w.id==='net'){M.floater?.(d.x,d.y-60,'TEARS THE NET','#e9d1a2');log(d.g.name+' tears through the net.');return;}
 if(K.OPT.reakt&&!projectile&&dodge(d,a))return;// Ausweichen (B3c3): der Schlag geht vorbei
 const ag=a.g.stats,fast=d.mode==='charge'||d.mode==='bluff'?.25:0,acc=cl(.2+(projectile?ag.precision:ag.dexterity||48)*.014+(ag.experience||0)*.01-fast+(HOLD.includes(d.mode)?.2:0),.25,.97);
 if(Math.random()>acc)return;
 let dmg=ef.damage*rnd(.8,1.2)*(projectile?1:M.spacingFactor?M.spacingFactor(w,dist(a,d)-d.r*.5,ef.range):1)*(a.energy<15?.6:1);if(w.id==='fist')dmg*=.3;else if(w.bladed)dmg*=1.1;
 const rel=Math.abs(M.angleDiff(M.angle(d,a),d.a)),r=Math.random();
 const part=rel<.9?(r<.3?'kopf':r<.45?'hals':r<.75?'brust':'vl'):rel<2.2?(r<.08?'hals':r<.3?'brust':r<.72?'bauch':r<.85?'vl':'hl'):(r<.5?'hl':r<.92?'bauch':'hals');
 const kind=w.bladed?(w.attack==='thrust'||/spear|trident|dagger|javelin/.test(w.id||'')?'stab':'cut'):projectile?'stab':'blunt';
 const wd=hurt(d,part,dmg,kind,a);M.recordDamage?.(a,ef.attackKey||a.lastAttackKey||'slash',dmg);a.contactPoint={x:d.x,y:d.y-30*d.P.sz};if(w.item)w.item.blood=Math.min(1,(w.item.blood||0)+dmg/55);
 if(wd>5)log(a.g.name+' hits '+d.g.name+' in the '+PART_EN[part]+'.');afterHit(d,a,wd);}
// Ausweichen (B3c3): Nur wenn der Bär den Schlag kommen sieht (Gegner vorn) und nicht selbst mitten im Angriff oder im Drohen ist. Rumpf und Kopf zucken zurück,
// die Pranken bleiben stehen; danach schlägt er sofort zurück (b.retort). Chance: P.evade mal Zustand (Gesundheit, Lahmen, Erschöpfung), kurz nacheinander seltener.
function dodge(d,a){if(d.mode==='dodge'&&(a.x-d.x)*B.facing(d.fig)>0)return true;// mitten im Zurückzucken geht auch der Nachschlag vorbei
 if(d.g.dead||!['approach','back'].includes(d.mode)||(d.fig.v||0)>25&&(d.fig.bdir||1)>0||d.fig.turn||d.fig.turnWant||(a.x-d.x)*B.facing(d.fig)<=0)return false;const t=S.battle?.time||0;
 const p=d.dodgeNext?1:d.P.evade*(.4+.6*K.health(d)/100)*(1-.6*K.lame(d))*(d.energy<20?.5:1)*(t-(d.dodgeAt||-9)<1.5?.4:1)*(d.mode==='back'?2:1);/* im Zurückweichen ist er schon auf dem Weg nach hinten */if(Math.random()>=p)return false;
 d.dodgeNext=false;d.dodgeAt=t;d.dodges++;d.energy-=3;d.from=a.id;state(d,'dodge',.5);d.retort=a.id;d.retortUntil=t+1.6;log(d.g.name+' jerks back. '+a.g.name+"'s blow parts the air and a few hairs.");return true;}
function afterHit(d,a,wd){if(d.g.dead)return;
 if(K.OPT.reakt&&!HOLD.includes(d.mode)&&!d.leap){const t=S.battle?.time||0;
  // schwerer Treffer: wirft ihn einen Schritt zurück (nicht mitten im eigenen Angriff, nicht im Lauf), danach Gegenangriff
  if((d.recoilNext||wd>=K.OPT.wucht)&&t-(d.recoilAt||-9)>2&&(d.fig.v||0)<60&&['approach','back','dodge'].includes(d.mode)){d.recoilNext=false;d.recoilAt=t;d.recoils++;d.from=a.id;state(d,'recoil',.6);d.retort=a.id;d.retortUntil=t+1.8;
   log('The blow knocks '+d.g.name+' back a step. It roars and comes right back.');}
  // sonst: Kopf schnellt zum Angreifer, er schnappt oder schlägt zurück, sobald er kann
  else if(wd>.6&&(d.mode==='approach'||d.mode==='back')&&Math.random()<.45+.4*d.P.wild){d.retort=a.id;d.retortUntil=t+1.2;}}
 if(HOLD.includes(d.mode)){d.interrupt=(d.interrupt||0)+wd;if(d.interrupt>=d.P.interrupt*.3){releaseVictim(d);d.grudge=a.id;state(d,'approach');d.cool=.3;log(a.g.name+' drives '+d.g.name+' off its victim.');}}}
const baseReceive=M.rexReceive;M.rexReceive=function(a,d){if(d?.bear)return receive.apply(this,arguments);return baseReceive?.apply(this,arguments);};

// ---------------------------------------------------------------- Der Bär trifft
const pick=L=>{let x=Math.random()*L.reduce((n,e)=>n+e[1],0);for(const e of L){x-=e[1];if(x<=0)return e[0];}return L[0][0];};
const SWIPE_AT=[['head',.2],['chest',.3],['belly',.12],['lua',.09],['rua',.09],['lfa',.06],['rfa',.06],['ls',.04],['rs',.04]];
const BITE_AT=[['head',.13],['neck',.13],['ls',.12],['rs',.12],['lua',.1],['rua',.1],['lfa',.06],['rfa',.06],['lt',.09],['rt',.09]];
const PIN_AT=[['head',.16],['neck',.14],['chest',.15],['belly',.11],['ls',.04],['rs',.04],['lua',.06],['rua',.06],['lfa',.05],['rfa',.05],['lh',.02],['rh',.02],['lt',.03],['rt',.03],['lsh',.03],['rsh',.03],['lf',.01],['rf',.01]];
// Abreißen und Kopfbiss: Startwerte aus BAER_FAHRPLAN.md (Thomas, 27.11.2026), Ausgleich in B28. K.OPT.tear / K.OPT.head sind Vielfache (0 = aus;
// Notausschalter auch über die Adresse: ?baerAbriss=0, ?baerKopfbiss=0; ?baerRingen=0 schaltet Packen, Schleudern und Zerren ab).
const CHAIN={lua:['lua','lfa','lh'],lfa:['lfa','lh'],lh:['lh'],rua:['rua','rfa','rh'],rfa:['rfa','rh'],rh:['rh'],ls:['lua','lfa','lh'],rs:['rua','rfa','rh'],
 lt:['lt','lsh','lf'],lsh:['lsh','lf'],lf:['lf'],rt:['rt','rsh','rf'],rsh:['rsh','rf'],rf:['rf']};
const LIMB_MIN={lh:1,rh:1,lf:1,rf:1,lfa:2,rfa:2,lsh:2,rsh:2,lua:3,rua:3,lt:4,rt:4};// ab welcher Klasse (Gefahrenköpfe) welches Glied abreißt
const TEAR_P=[0,.02,.04,.06,.09,.12];
const LIMB_EN={lh:'left hand',rh:'right hand',lfa:'left forearm',rfa:'right forearm',lua:'left arm',rua:'right arm',lf:'left foot',rf:'right foot',lsh:'left leg below the knee',rsh:'right leg below the knee',lt:'left leg',rt:'right leg'};
// Welches Glied reißt bei einem Biss in diese Stelle ab (null = keins)? Das größte Glied, das die Klasse des Bären schafft.
function limbFor(b,V,part){const L=CHAIN[part];if(!L)return null;for(const id of L)if(LIMB_MIN[id]<=b.P.skulls&&!V.g.body[id]?.missing)return id;return null;}
function tearChance(b,V,part){if(V.tornOnce||!limbFor(b,V,part))return 0;const hp=V.g.body[part]?.hp??100;if(hp>50)return 0;// nur wenn das Glied schon schwer verletzt ist; höchstens ein Abriss je Opfer
 return TEAR_P[cl(b.P.skulls,1,5)]*cl(b.bear.stats.biss/70,0,1.3)*(DG()?.armorMat?.(V,part)?.5:1)*K.OPT.tear;}
// Helm beim Kopfbiss (B3b2): 1.0 kennt nur einen Helm in drei Materialien. Leder und Schienen gelten als offener Helm (halbiert die Chance),
// Metall als geschlossener Helm (hält bei ☠3 stand, halbiert ab ☠4 und wird dabei zerdrückt). Liefert null | {art:'open'|'closed',m}.
function helmOf(V){const h=V&&!V.bear&&!V.dog?DG()?.armorMat?.(V,'head'):null;return h?{art:h.m==='metal'?'closed':'open',m:h.m}:null;}
K.helm=helmOf;
function headChance(b,V){if(b.P.skulls<3||b.bear.stats.biss<70||V.g.body.head?.missing)return 0;if((V.g.body.head?.hp??100)>40&&!V.down)return 0;
 const helm=helmOf(V);if(helm&&helm.art==='closed'&&b.P.skulls===3)return 0;// geschlossener Helm hält bei ☠3 stand
 return (b.P.bauart==='H'?.2:.15)*(helm?.5:1)*K.OPT.head;}
K.tearChance=tearChance;K.headChance=headChance;
try{const q=new URLSearchParams(location.search);if(q.get('baerAbriss')==='0')K.OPT.tear=0;if(q.get('baerKopfbiss')==='0')K.OPT.head=0;if(q.get('baerRingen')==='0')K.OPT.ringen=0;if(q.get('baerZiel')==='0')K.OPT.ziel=0;if(q.get('baerSturm')==='0')K.OPT.sturm=0;if(q.get('baerReakt')==='0')K.OPT.reakt=0;if(q.get('baerBrei')==='0')K.OPT.brei=0;}catch{}
const DOG_AT=[['kopf',.15],['hals',.15],['brust',.25],['bauch',.25],['vl',.1],['hl',.1]];
function humanPart(b,t,kind){const A=b.P.bauart;let L=kind==='pin'?PIN_AT:kind==='bite'?BITE_AT:SWIPE_AT;
 if(kind==='swipe'&&A==='B')L=[['head',.6],...L.slice(1)];// Lippenbär: Sichelkrallen ins Gesicht
 if(kind==='bite'&&A==='H')L=[['head',.5],...L.slice(1)];// Eisbär: beißt in den Kopf
 let p=pick(L);if(t.g.body[p]?.missing)p='chest';return p;}
// Rüstung: Zähne wie beim Hund (DOG.biteFactor), Krallen und Wucht kommen besser durch
function armorF(t,part,kind){const bf=DG()?.biteFactor?.(t,part,kind==='ram'?'leap':'bite')?.f??1;return kind==='bite'||kind==='pin'?Math.min(1,bf*1.35):kind==='ram'||kind==='slam'?.6+.4*bf:.4+.6*bf;}
function hurtHuman(b,t,kind,partId,dmg){const old=t.taken,wasDead=t.g.dead,f=armorF(t,partId,kind);dmg*=f*K.OPT.schaden;
 const rg=fallen(t)?Math.max(70,dist(b,t)+20):70;/* am Liegenden steht der Bär am Rumpf, nicht an den Füßen (B3c1) */
 const ef={...M.effective(b),damage:dmg,range:rg,attackKey:'bear-'+kind,partId,w:{id:'bear-'+kind,name:NAME[kind]||'Mauling',damage:dmg,range:rg,weight:kind==='ram'?14:kind==='slam'?12:kind==='swipe'?8:4,pen:.3,crit:1.2,bladed:false,ammo:0,block:0}};
 M.hit(b,t,false,ef);const landed=t.taken>old;
 if(landed){b.hits++;if(kind!=='ram')b.fig.mouthBlood=Math.min(1,(b.fig.mouthBlood||0)+(kind==='swipe'||kind==='slam'?.03:.2));const p=t.g.body[partId];if(p&&kind!=='ram')p.bleed=(p.bleed||0)+(.6+dmg*.025)*f;
  try{const pt=M.contactAnchor(t,partId||'chest');spray(b,pt.x,pt.y+8,Math.max(4,t.y-pt.y),8+dmg*.35,b.a);}catch{}
  if(!wasDead&&t.g.dead){b.kills++;}}
 return landed;}
function strike(b,t,kind,dmg,at){if(!t||t.g.dead)return false;
 if(t.bear){const part=pick(DOG_AT),wd=hurt(t,part,dmg*K.OPT.schaden,kind==='bite'||kind==='pin'?'bite':kind==='ram'?'blunt':'claw',b);b.hits++;if(kind==='bite')b.fig.mouthBlood=Math.min(1,(b.fig.mouthBlood||0)+.15);if(t.g.dead)b.kills++;afterHit(t,b,wd);return true;}
 if(t.dog){const D=DG(),dodge=!t.down&&t.mode!=='grip'&&Math.random()<(t.P.evade||.2)*(kind==='ram'?.6:.9);if(dodge){D.state?.(t,'evade',.35);t.escapeAngle=M.angle(b,t);return false;}
  const dead0=t.g.dead;D.hurt(t,pick(DOG_AT),dmg*2.2*K.OPT.schaden,kind==='bite'||kind==='pin'?'bite':kind==='ram'?'crush':'tear',b);b.hits++;if(t.mode==='grip'&&t.victim===b.id)D.release?.(t);if(!dead0&&t.g.dead)b.kills++;return true;}
 const part=at||humanPart(b,t,kind);return hurtHuman(b,t,kind,part,dmg);}
function fell(b,t,why,dur,push){if(t.bear||t.dog||t.g.dead)return;M.knockdown(t,why,dur);t.kx=(t.kx||0)+Math.cos(b.a)*push;t.ky=(t.ky||0)+Math.sin(b.a)*push*.3;}
function releaseVictim(b){const t=S.battle?.actors.find(a=>a.id===b.victim);if(t){if(t.pinnedBy===b.id)delete t.pinnedBy;if(t.grabbedBy===b.id)delete t.grabbedBy;}delete b.rearFinish;b.held=false;b.victim=null;b.interrupt=0;b.pinPart=b.pinLast=b.grPart=b.grLast=null;}
// Packen (B3b1): Der Stehende wird über den vorhandenen Griff des Spiels gehalten (sim.js: grabbedBy am Opfer, rearFinish am Halter).
// Solange das gilt, handelt das Opfer nicht; lässt der Bär los oder stirbt er, löst sim.js den Griff von selbst.
function hold(b,V){V.grabbedBy=b.id;V.state='grabbed';V.wind=0;V.pendingStrike=null;V.swing=0;V.kx=V.ky=0;b.rearFinish={target:V.id,left:.85,bear:true};b.held=true;}
function unhold(b,V){if(V&&V.grabbedBy===b.id)delete V.grabbedBy;delete b.rearFinish;b.held=false;}
const human=t=>t&&!t.bear&&!t.dog,mouthAt=b=>Math.abs(partWorld(b,'kopf').x-b.x);// Abstand des Mauls von der Mitte des Bären
// Wie viel schwerer als das Opfer der Bär sein muss: Packen ab 0,9-fach, Schleudern ab 1,5-fach (ein Malaienbär schleudert keinen Mann)
const heavier=(b,t,f)=>b.P.mass>=(t.g.weight||80)*f;
// Schlussangriff am Stehenden oder Gepackten: Der Bär reißt das Opfer erst zu Boden, dann läuft derselbe Abriss oder Kopfbiss wie am Liegenden.
function finisher(b,V,kind,limb){unhold(b,V);if(!fallen(V))fell(b,V,'Pulled down by '+b.g.name,2.6,10);b.victim=V.id;b.interrupt=0;V.pinnedBy=b.id;b.swat=false;b.phase=0;
 if(kind==='tear'){b.limb=limb;V.tornOnce=true;state(b,'tear',1.9);log(b.g.name+' wrenches '+V.g.name+' to the ground by the '+LIMB_EN[limb]+'.');}
 else{state(b,'crush',2.2);log(b.g.name+' drags '+V.g.name+' down and closes its jaws around his head.');}}
// Lahmen (B3b1): ab 40 % Verlust an Vorderpranke oder Hinterlauf, 0 gesund … 1 Lauf unbrauchbar. Langsamer, kein Galopp mehr ab 0,45.
const lameOf=(b,p)=>cl((.6-b.tissue[p]/b.max[p])/.6,0,1);
K.lame=b=>Math.max(lameOf(b,'vl'),lameOf(b,'hl'));

// ---------------------------------------------------------------- Bewegung: der Körper kommt nur so weit voran, wie die Beine laufen (BAER.step)
const BX=[110,930],BY=[190,605];
function brake(fig){const v=fig.v||0,hs=Math.sqrt(cl(fig.bear.weight/400,.3,2));return v*v/(2*(30+.6*v)/hs*1.3);}
function head(b,tx,ty,gait,durch){const fig=b.fig,dx=tx-b.x,dy=ty-b.y,d=Math.hypot(dx,dy)||1,want=dx>=0?1:-1;
 fig.back=0;if((fig.bdir||1)<0&&(fig.v||0)>1){B.go(fig,null);return d;}// kommt er aus dem Rückwärtsgang, hält er erst an
 if(K.OPT.sturm&&(fig.v||0)>70&&b.dirx*dx+b.diry*dy<0){B.go(fig,null);return d;}// Schwung: liegt das Ziel hinter ihm, läuft er erst aus, statt im vollen Lauf rückwärts zu gleiten
 if(Math.abs(dx)>12&&want!==B.facing(fig)&&!fig.turn&&!fig.turnWant)B.turn(fig);
 if(fig.turn||fig.turnWant||fig.mode!=='stand'&&!fig.go){B.go(fig,null);if(fig.mode!=='stand'&&!fig.want)B.pose(fig,'stand');}
 else if(!durch&&d<=brake(fig)*b.P.sz*(b.rush?1.3:1)+2)B.go(fig,null);
 else{const lame=K.lame(b);if(lame>.45&&gait==='run')gait='walk';B.go(fig,gait);fig.pace=(gait==='run'?b.P.pace*(fig.sprint?K.OPT.tempo:1):1.9*b.P.pace)*(1-.5*lame)*(b.mode==='drag'?.55:1);}
 b.dirx=dx/d;b.diry=dy/d;return d;}
function halt(b){B.go(b.fig,null);}
// Rückwärts gehen (B3c3): Blick bleibt, wo er ist; der Körper geht nach hinten (BAER a.back). Läuft er noch vorwärts, hält er erst an.
function backTo(b,tx,ty,pf=1){const fig=b.fig,dx=tx-b.x,dy=ty-b.y,d=Math.hypot(dx,dy)||1;
 if(fig.turn||fig.turnWant||fig.mode!=='stand'){B.go(fig,null);if(fig.mode!=='stand'&&!fig.want&&!fig.turn)B.pose(fig,'stand');return d;}
 if((fig.bdir||1)>0&&(fig.v||0)>1){B.go(fig,null);return d;}
 fig.back=1;B.go(fig,'walk');fig.pace=1.5*b.P.pace*pf*(1-.5*K.lame(b));b.dirx=dx/d;b.diry=dy/d;return d;}
function faceTo(b,t){const fig=b.fig,want=t.x>=b.x?1:-1;if(want!==B.facing(fig)&&!fig.turn&&!fig.turnWant){B.turn(fig);return false;}return !fig.turn&&!fig.turnWant;}
// Platz vor dem Gegner: der Bär steht seitlich daneben, Kopf und Pranken reichen hin
const reachOf=b=>40*b.P.sz*K.SCALE;K.reach=b=>reachOf(b)+22;
// Leichenansicht für den zerdrückten Kopf (B3b2): Der Kopf fehlt an der Figur (vorhandener Weg des Spiels für fehlende Körperteile), an seiner Stelle
// liegt Knochenbrei im Sand, dazu der zerdrückte Helm. Einmal je Opfer, gemerkt am Kampf (battle.pulp), gezeichnet mit wenigen Kästchen.
function pulp(b,V){const bt=S.battle;if(!K.OPT.brei||!bt||V.pulped||V.bear||V.dog)return;V.pulped=true;const w=groundPoint(V,'head'),helm=helmOf(V),h=V.g.body.head;if(h)h.missing=true;
 const seed=Math.random()*1e4,bits=[];for(let i=0;i<18;i++){const an=hr(seed+i)*TAU,d=1+hr(seed+i*7.3)*9;bits.push({x:Math.cos(an)*d,y:Math.sin(an)*d*.45,k:i<8?0:i<12?1:i<15?2:3,s:hr(seed+i*3.1)<.35?2:1});}
 (bt.pulp=bt.pulp||[]).push({x:w.x,y:w.y,helm,bits});for(let i=0;i<7;i++)stain(w.x+rnd(-9,9),w.y+rnd(-4,4),i?rnd(1.5,3.5):6);
 if(helm)log(helm.art==='closed'?'The helmet comes out flat. So does what was in it.':'The '+(helm.m==='leather'?'leather cap':'helmet')+' was never going to help.');}
const hr=n=>{const x=Math.sin(n*127.1)*43758.5453;return x-Math.floor(x);};
const PULP_C=['#f1e6c8','#cbb48c','#b0443a','#e8dcc0'],HELM_C={leather:['#6b4a2c','#4a3220'],medium:['#8a8676','#5c5a50'],metal:['#9aa0a2','#5d6468']};
function drawPulp(ctx,L){for(const q of L){const x=Math.round(q.x),y=Math.round(q.y);
  ctx.fillStyle='#4c0f0b';ctx.fillRect(x-8,y-2,16,5);ctx.fillRect(x-5,y-3,10,7);ctx.fillStyle='#7d150e';ctx.fillRect(x-5,y-1,9,3);ctx.fillStyle='#a3261b';ctx.fillRect(x-2,y-1,4,2);
  for(const p of q.bits){ctx.fillStyle=PULP_C[p.k];ctx.fillRect(x+Math.round(p.x),y+Math.round(p.y),p.k===3?1:p.s,p.k===1?1:p.s>1&&p.k===0?1:p.s);}
  if(q.helm){const [c1,c2]=HELM_C[q.helm.m]||HELM_C.metal,hx=x+7,hy=y-1;/* flach gedrückt, eingedellt, aufgerissen */
   ctx.fillStyle=c2;ctx.fillRect(hx-5,hy,11,3);ctx.fillStyle=c1;ctx.fillRect(hx-4,hy-1,9,2);ctx.fillRect(hx-5,hy+1,3,1);ctx.fillStyle=c2;ctx.fillRect(hx-1,hy-1,2,2);ctx.fillRect(hx+3,hy,1,1);ctx.fillStyle='#7d150e';ctx.fillRect(hx-2,hy+2,4,1);}}}
// Reichweite und Treffpunkt (B3b2, Editor-Reiter Attacken): Zone am Boden, in der ein Gegner getroffen wird; Kreuz = Stelle, auf die gezielt wird;
// nach dem Treffer: Punkt = wo Krallen oder Maul im Trefferbild waren, Kreuz = die Trefferstelle.
function drawAim(ctx,a,t){const f=B.facing(a.fig),s=a.P.sz*K.SCALE,x0=Math.round(a.x+f*10),x1=Math.round(a.x+f*K.reach(a)),y=Math.round(a.y),lo=Math.min(x0,x1),w=Math.abs(x1-x0);
 ctx.fillStyle='#f3d27a';for(let x=lo;x<lo+w;x+=6){ctx.fillRect(x,y-22,3,1);ctx.fillRect(x,y+22,3,1);}for(let v=-22;v<22;v+=6){ctx.fillRect(x0,y+v,1,3);ctx.fillRect(x1,y+v,1,3);}
 const kreuz=(px,py,c)=>{ctx.fillStyle=c;ctx.fillRect(px-4,py,9,1);ctx.fillRect(px,py-4,1,9);};
 const m=a.mark,frisch=m&&t-m.t<2.5;if(a.aimPt&&!frisch)kreuz(Math.round(a.x+f*a.aimPt.x*s),Math.round(a.y+a.aimPt.y*s),'#f3d27a');
 if(frisch){kreuz(Math.round(a.x+m.f*m.tx*s),Math.round(a.y+m.ty*s),'#ffffff');ctx.fillStyle='#ff4a3a';ctx.fillRect(Math.round(a.x+m.f*m.x*s)-1,Math.round(a.y+m.y*s)-1,3,3);}}
const inReach=(b,t)=>(t.x-b.x)*B.facing(b.fig)>10&&Math.abs(t.x-b.x)<reachOf(b)+(t.r||14)+8&&Math.abs(t.y-b.y)<22&&!b.fig.turn;
function spot(b,t){const side=b.x<=t.x?-1:1;return {x:t.x+side*(reachOf(b)+(t.r||14)*.5),y:t.y+1};}

// ---------------------------------------------------------------- Zielen (B3c1, Rückmeldung Thomas 27.11.2026): Pranke und Maul treffen die Stelle
// Die Trefferstelle am Gegner wird ins Maß des Bärenskeletts umgerechnet (x nach vorn, y nach oben negativ). Der Rumpf lehnt sich so weit,
// dass Vorderpranke bzw. Hals und Kopf hinreichen (hoch: Vorderkörper hebt sich, tief: er knickt vorn ein), dann greifen Pranke und Maul den Punkt.
// Schalter: K.OPT.ziel (0 = alte feste Bewegungen), Adresse ?baerZiel=0.
const HY={head:-62,neck:-56,chest:-47,belly:-35,ls:-49,rs:-49,lua:-43,rua:-43,lfa:-35,rfa:-35,lh:-35,rh:-35,lt:-23,rt:-23,lsh:-11,rsh:-11,lf:-2,rf:-2};
// Stelle am Liegenden in Arenakoordinaten: dieselbe Lage wie contactAnchor in sim.js, aber für jedes Körperteil
function groundPoint(V,part){const sc=(V.g.height||180)/180*1.14,face=Math.cos(V.a||0)>=0?1:-1,rot=(V.fallSide||-1)*1.35,xs=part[0]==='l'?-8:part[0]==='r'?8:0,ys=HY[part]??-45;
 return {x:V.x+(12+Math.cos(rot)*xs-Math.sin(rot)*ys)*sc*face,y:V.y+(5+Math.sin(rot)*xs+Math.cos(rot)*ys)*sc};}
function worldPoint(V,part){if(V.bear)return {x:V.x,y:V.y-34*V.P.sz*K.SCALE};if(V.dog)return {x:V.x,y:V.y-14};part=part||'chest';
 if(fallen(V))return groundPoint(V,part);try{return M.contactAnchor(V,part);}catch{return {x:V.x,y:V.y-50};}}
function aimPoint(b,V,part){const w=worldPoint(V,part),s=b.P.sz*K.SCALE;return {x:cl((w.x-b.x)*B.facing(b.fig)/s,8,84),y:cl((w.y-b.y)/s,-100,-3)};}
K.aimPoint=aimPoint;
// Bis zum Treffer folgt der Punkt dem Gegner, danach bleibt er stehen (der Getroffene fällt oder fliegt weg)
function aimNow(b,V,part){if(V&&!V.g.dead&&!(b.struck&&b.aimPt))b.aimPt=aimPoint(b,V,part);return b.aimPt;}
// Platz beim Niederdrücken: neben dem Rumpf des Liegenden (nicht neben seinen Füßen), damit das Maul Kopf, Brust und Arme erreicht
function pinSpot(b,V){if(!K.OPT.ziel||!human(V))return {x:V.x+(b.x<=V.x?-1:1)*(reachOf(b)-6*b.P.sz),y:V.y-2};const c=groundPoint(V,'chest');return {x:cl(c.x+(b.x<=c.x?-1:1)*31*b.P.sz*K.SCALE,BX[0],BX[1]),y:V.y+3};}// ein Stück vor dem Liegenden: Kopf und Pranke des Bären liegen sichtbar auf ihm
// Stelle für den Biss am Liegenden: nur was das Maul vom Platz am Rumpf aus erreicht (ein Bein unter dem eigenen Bauch beißt er nicht)
const pinOk=(b,V,p)=>{const x=(groundPoint(V,p).x-b.x)*B.facing(b.fig)/(b.P.sz*K.SCALE);return x>=12&&x<=66;};
function pinPick(b,V){if(!K.OPT.ziel||!human(V))return humanPart(b,V,'pin');const s=b.P.sz*K.SCALE,f=B.facing(b.fig);
 for(let i=0;i<6;i++){const p=humanPart(b,V,'pin'),x=(groundPoint(V,p).x-b.x)*f/s;if(x>=14&&x<=64)return p;}return V.g.body.chest?.missing?'belly':'chest';}
const grPick=b=>pick(b.P.bauart==='H'?[['head',.5],['neck',.2],['ls',.15],['rs',.15]]:[['head',.22],['neck',.2],['ls',.2],['rs',.2],['lua',.09],['rua',.09]]);// Biss beim Ringen
const curOf=fig=>fig.pose?.cur||B.poseSet(fig.mode,fig.SH||B.shapeOf(fig.bear));
const shoulder=(C,SH,p,hx)=>({x:hx+SH.L*Math.cos(p),y:C.hy-SH.L*Math.sin(p)});
// Rumpf lehnen: liefert {p,hx} als Zugabe zur Haltung, sodass ein Glied der Länge len von der Schulter den Punkt T erreicht
function lean(C,SH,T,len){const L=SH.L;let p=C.p,hx=C.hx,s=shoulder(C,SH,p,hx);
 const want=cl(s.y,T.y-len*.8,T.y+len*.7);if(want!==s.y)p=cl(Math.asin(cl((C.hy-want)/L,-1,1)),C.p-.45,C.p+.75);
 s=shoulder(C,SH,p,hx);const hr=Math.sqrt(Math.max(1,len*len*.9-(T.y-s.y)*(T.y-s.y)));const up=C.p>.7;hx+=up?cl(T.x-s.x-hr,-3,3):cl(T.x-s.x-hr,-12,16);// aufgerichtet stehen die Hinterbeine fast gestreckt: das Becken kann nicht vor, der Bär beugt sich vor
 if(up)for(let i=0;i<14;i++){s=shoulder(C,SH,p,hx);if(Math.hypot(T.x-s.x,T.y-s.y)<=len*.9||p<C.p-.95||s.x>T.x-9)break;p-=.07;}
 return {p:p-C.p,hx:hx-C.hx};}
// Hals und Kopf so stellen, dass das Maul am Punkt T ist (zwei Glieder: Hals, Schädel bis zur Schnauze). O: schon gesetzte Zugaben für den Rumpf.
function mouthTo(C,O,SH,T){const p=C.p+(O.p||0),hx=C.hx+(O.hx||0),hy=C.hy+(O.hy||0),L=SH.L,cp=Math.cos(p),sp=Math.sin(p),nbx=hx+L*cp+3*cp-3*sp,nby=hy-L*sp-3*sp-3*cp,a=SH.neck,m=11*SH.headS;
 let dx=Math.max(2,T.x-nbx),dy=nby-T.y,d=Math.hypot(dx,dy)||1;/* der Punkt liegt immer vor dem Halsansatz: kein Umklappen des Halses */const dd=cl(d,Math.abs(a-m)+.5,a+m-.3);dx*=dd/d;dy*=dd/d;
 const ne=Math.atan2(dy,dx)+Math.acos(cl((a*a+dd*dd-m*m)/(2*a*dd),-1,1)),he=Math.atan2(dy-a*Math.sin(ne),dx-a*Math.cos(ne));
 return {ne:cl(ne,-1.3,2.3)-C.ne,he:cl(he,-1.57,2.2)-C.he};}
const L2=(a,b,t)=>a+(b-a)*t;
// ---------------------------------------------------------------- Überlagerte Bewegung je Angriff (Zahlen für BAER.over)
function over(b,t){const m=b.mode,u=b.duration?cl(b.clock/b.duration,0,1):0,O={},hr=b.hit>0?b.hit/.3:0,fig=b.fig,Z=K.OPT.ziel&&!b.g.dead&&!fig.turn,act=id=>S.battle?.actors.find(a=>a.id===id);
 let A=null,V=null;
 if(Z&&(m==='swipe'||m==='bite'||m==='slam'&&b.phase===1))A=aimNow(b,act(b.aim),b.at);
 if(Z&&HOLD.includes(m)&&m!=='drag'){V=act(b.victim);if(!human(V))V=null;}
 const PZ=V&&m==='pin'&&fig.mode==='stand'&&(fig.v||0)<6;
 if(A&&m==='swipe'){// Gewicht auf die andere Seite, Pranke holt nach hinten oben aus, schlägt im Bogen durch die Trefferstelle, schwingt nach unten durch
  const C=curOf(fig),SH=fig.SH||B.shapeOf(fig.bear),w=sm(u/.34),s=sm((u-.34)/.12),f=sm((u-.46)/.16),r=sm((u-.62)/.38),k=1-r,Bd=lean(C,SH,A,26*SH.leg);
  const hx=A.x-5-C.wx,hy=A.y-C.wy,wx=hx*.3-9,wy=Math.min(hy-9,-17),fx=hx+8,fy=Math.min(0,hy+15);
  const px=u<.34?wx*w:u<.46?L2(wx,hx,s):L2(hx,fx,f),py=u<.34?wy*w:u<.46?L2(wy,hy,s):L2(hy,fy,f);
  O.nx=px*k;O.ny=py*k;O.na=(-1.0*w*(1-s)+.8*s*(1-f)-.5*f)*k;O.p=Bd.p*w*k+.04*s*k;O.hx=(Bd.hx*(.25*w+.75*s)-3*w*(1-s))*k;O.bend=1.2*w*(1-s)*k;
  O.ne=(.2*w-.12*s)*k;O.he=(.14*s-.08*w)*k;O.lip=.9*k;O.mouth=(.15*w+.4*s)*k;O.ear=-.8*k;if(Bd.p>.12)O.fy=-3*Bd.p*w*k;}
 else if(A&&m==='bite'){// Hals streckt sich, Maul auf, Kopf schnappt an die Stelle, Kiefer zu, Schütteln mit Kopf und Nacken
  const C=curOf(fig),SH=fig.SH||B.shapeOf(fig.bear),back=sm(u/.12)*(1-sm((u-.12)/.14)),l=sm((u-.1)/.22),r=sm((u-.82)/.18),k=1-r,held=b.struck&&b.landed&&u>.36,sh=held?Math.sin(t*44)*k:0;
  const Bd=lean(C,SH,A,(SH.neck+11*SH.headS)*.92);O.p=Bd.p*l*k+.03*sh;O.hx=(Bd.hx*l-3*back)*k;const q=mouthTo(C,{p:Bd.p,hx:Bd.hx},SH,A);
  O.ne=(q.ne*l+.12*back)*k+.05*sh;O.he=(q.he*l+.1*back)*k+.2*sh;O.mouth=u<.34?.95*sm(u/.2):.22*k;O.lip=k;O.ear=-.9*k;O.nx=3*l*k;}
 else if(A&&m==='slam'){// lässt sich mit dem ganzen Gewicht fallen, beide Pranken schlagen auf die Stelle
  const C=curOf(fig),s=sm(u/.6),r=sm((u-.66)/.34),k=s*(1-r);O.nx=(A.x-5-C.wx)*k;O.ny=(A.y-C.wy)*k;O.fx=(A.x-2-C.wx)*k;O.fy=(A.y+2-C.wy)*k;O.na=.5*k;O.mouth=.6*(1-r);O.lip=1-r;O.ear=-.8;O.he=-.15*k;}
 else if(PZ){// steht über dem Liegenden, eine Pranke auf ihm; der Kopf geht hinunter bis an den Körperteil, beißt, reißt nach oben
  const C=curOf(fig),SH=fig.SH||B.shapeOf(fig.bear),e0=b.ticks?1:sm(b.clock/.45),c=(b.clock%.75)/.75,nx=aimPoint(b,V,b.pinPart||'chest'),la=b.pinLast?aimPoint(b,V,b.pinLast):nx,up=8;let T,mo,sh=0;
  if(c>=.7){const e=sm((c-.7)/.3);T={x:nx.x,y:nx.y-up*(1-e*e)};mo=.95;}// stößt hinunter, im Takt des Bisses ist das Maul an der Stelle
  else if(b.pinLast&&c<.3){const e=sm(c/.3);T={x:la.x-2*e,y:la.y-up*e};mo=.08;sh=Math.sin(t*42)*(1-e*.6);}// Kiefer zu, reißt nach oben und schüttelt
  else{const e=b.pinLast?sm((c-.3)/.4):1;T={x:L2(la.x-2,nx.x,e),y:L2(la.y-up,nx.y-up,e)};mo=.9*(b.pinLast?e:sm(c/.6));}// Kopf wandert zur nächsten Stelle, Maul geht auf
  const len=(SH.neck+11*SH.headS)*.92,Bd=lean(C,SH,T,len);O.p=Bd.p*e0+.02*sh;O.hx=Bd.hx*e0;const q=mouthTo(C,{p:Bd.p,hx:Bd.hx},SH,T);O.ne=q.ne*e0+.04*sh;O.he=q.he*e0+.16*sh;
  const bl=aimPoint(b,V,'belly');O.nx=cl(bl.x-4-C.wx,-10,14)*e0;O.ny=cl(bl.y-1-C.wy,-9,0)*e0;O.mouth=mo*e0;O.lip=e0;O.ear=-.7*e0;}
 else if(V&&(m==='tear'||m==='crush')){// Abreißen: verbeißt sich im Glied, stemmt die Pranke auf den Körper, reißt mit Kopf und Nacken zurück. Kopfbiss: Maul schließt sich um den Kopf.
  const C=curOf(fig),SH=fig.SH||B.shapeOf(fig.bear),g=sm(u/(m==='tear'?.2:.2)),r=sm((u-(m==='tear'?.85:.9))/.12),k=1-r,y=m==='tear'?sm((u-.45)/.27):0,P0=aimPoint(b,V,m==='tear'?b.limb:'head');
  const T={x:P0.x-13*y,y:P0.y-13*y},sh=m==='tear'?(u>.72?Math.sin(t*40):.3*y*Math.sin(t*31)):(u>.7?Math.sin(t*38):.25*Math.sin(t*60)),len=(SH.neck+11*SH.headS)*.92,Bd=lean(C,SH,T,len);
  O.p=Bd.p*g*k+.02*sh*k;O.hx=(Bd.hx*g-4*y)*k;const q=mouthTo(C,{p:Bd.p,hx:Bd.hx-4*y},SH,T);O.ne=(q.ne*g+.04*sh)*k;O.he=(q.he*g+.18*sh)*k;O.bend=2*y*k;
  const ch=aimPoint(b,V,'chest');O.nx=cl(ch.x-4-C.wx,-10,14)*g*k;O.ny=cl(ch.y-1-C.wy,-9,0)*g*k;O.mouth=m==='tear'?(u<.2?.9*sm(u/.15):.3):(u<.2?sm(u/.15):cl(.95-(u-.2)*1.25,.08,1));O.lip=1;O.ear=-1;}
 else if(V&&m==='grapple'&&b.phase===1){// klammert mit beiden Pranken; vor jedem Biss hebt sich der Kopf, dann schnappt er an die Stelle und schüttelt
  const C=curOf(fig),SH=fig.SH||B.shapeOf(fig.bear),e=sm(b.clock/.35),c=(b.clock%.7)/.7,nx=aimPoint(b,V,b.grPart||'head'),la=b.grLast?aimPoint(b,V,b.grLast):nx,up=7;let T,mo,sh=0;
  if(c>=.72){const q=sm((c-.72)/.28);T={x:nx.x,y:nx.y-up*(1-q*q)};mo=.95;}
  else if(b.grLast&&c<.3){const q=sm(c/.3);T={x:la.x,y:la.y-up*q};mo=.1;sh=Math.sin(t*42)*(1-q*.5);}
  else{const q=b.grLast?sm((c-.3)/.42):1;T={x:L2(la.x,nx.x,q),y:L2(la.y-up,nx.y-up,q)};mo=.85*(b.grLast?q:sm(c/.6));}
  if(fallen(V)&&b.grT)T=b.grT;else b.grT=T;// sackt der Gepackte weg, bleibt das Maul, wo es war (der Wechsel zum Niederdrücken läuft weich)
  const Bd=lean(C,SH,T,(SH.neck+11*SH.headS)*.92);O.p=Bd.p*e+.02*sh;O.hx=Bd.hx*e;const q=mouthTo(C,{p:Bd.p,hx:Bd.hx},SH,T);O.ne=q.ne*e+.03*sh;O.he=q.he*e+.16*sh;
  O.nx=7*e;O.fx=7*e;O.ny=2.5*e;O.fy=2.5*e;O.mouth=mo*e;O.lip=e;O.ear=-.9*e;}
 else if(m==='swipe'){const w=sm(u/.36),s=sm((u-.36)/.12),r=sm((u-.58)/.42),k=1-r;O.nx=(-7*w+26*s)*k;O.ny=(-13*w-5*s)*k;O.na=-.9*w*k+.7*s*k;O.p=.05*s*k;O.hx=3.5*s*k;O.ne=.16*w*k;O.he=.1*s*k;O.lip=.9*k;O.mouth=.35*s*k;O.ear=-.8*k;}
 else if(m==='bite'){const l=sm(u/.3),r=sm((u-.82)/.18),k=1-r,held=b.struck&&b.landed&&u>.36;O.hx=4*l*k;O.ne=.32*l*k;O.he=.22*l*k+(held?.2*Math.sin(t*44)*k:0);O.p=(held?.03*Math.sin(t*44+1):0);
  O.mouth=u<.33?.95*sm(u/.22):.25*k;O.lip=k;O.ear=-.9*k;}
 else if(m==='slam'&&b.phase===1){const s=sm(u/.55),r=sm((u-.6)/.4);O.nx=9*s*(1-r);O.fx=9*s*(1-r);O.ny=-5*(1-s);O.fy=-5*(1-s);O.mouth=.6*(1-r);O.lip=1-r;O.ear=-.8;}
 else if(m==='threat'&&K.OPT.sturm){const ph=b.phase||0,c=b.clock;O.ear=-.9;
  if(ph===0){const e=sm(c/.5);O.lip=e;O.mouth=.35*e;O.ear=-.8*e;}// richtet sich auf
  else if(ph===1){// steht in voller Höhe: die Tatzen schlagen abwechselnd durch die Luft, Kopf vor, Maul weit auf, der ganze Körper bebt vom Brüllen
   const k=sm(c/.2)*(1-sm((c-1.7)/.2)),pr=x=>{const u=(c-x)/.6;return u>0&&u<1?u:0;},un=Math.max(pr(.1),pr(1.2)),uf=pr(.65);
   const X=u=>-5*sm(u/.4)+16*sm((u-.4)/.22)-11*sm((u-.62)/.38),Y=u=>-13*sm(u/.4)+23*sm((u-.4)/.22)-10*sm((u-.62)/.38);// hoch über die Schulter, dann im Bogen nach vorn unten
   O.nx=(5+X(un))*k;O.ny=(-13+Y(un))*k;O.fx=(5+X(uf))*k;O.fy=(-13+Y(uf))*k;O.na=(-.6*sm(un/.4)+1.1*sm((un-.4)/.25)-.5*sm((un-.65)/.35))*k;
   O.ne=-.3*k;O.he=.1*k;O.mouth=.95*k*(.86+.14*Math.sin(t*31));O.lip=1;O.p=(-.07+.012*Math.sin(t*53))*k;O.hx=.5*Math.sin(t*47)*k;}
  else if(ph===2){O.lip=1;O.mouth=.6;O.he=.05;}// lässt sich nach vorn fallen
  else{const d=Math.exp(-c*7),st=c>.34&&c<.62?Math.sin(Math.PI*(c-.34)/.28):0;// Pranken schlagen auf, der Rumpf federt nach, die Kiefer klappern, eine Pranke stampft nach
   O.hy=1.6*d;O.p=-.03*d;O.lip=1;O.mouth=c>.1&&c<.7?(Math.sin(t*38)>0?.5:.04):.15;O.ne=-.08;O.he=.08*(1-d);O.ny=-4.5*st;}}
 else if(m==='slam'||m==='threat'){const e=sm(b.clock/.5);O.lip=e;O.mouth=m==='threat'?.85*e*(.8+.2*Math.sin(t*23)):.3*e;O.ear=-.8*e;if(m==='threat'){O.nx=3*Math.sin(t*5)*e;O.he=.12*e;}}
 else if(m==='pin'){const e=sm(b.clock/.5),bob=Math.sin(t*9);O.ne=-.22*e;O.he=(-.42+.1*bob)*e;O.mouth=(.45+.4*bob)*e;O.lip=e;O.nx=5*e;O.ny=0;O.hy=1.2*e;O.ear=-.7*e;}
 else if(m==='tear'){const g=sm(u/.25),y=sm((u-.45)/.3),r=sm((u-.85)/.15),k=1-r;O.ne=(-.2*g+.6*y)*k;O.he=(-.4*g+.5*y)*k+(u>.72?.22*Math.sin(t*40)*k:0);O.hx=(2*g-7*y)*k;O.mouth=u<.2?.9*sm(u/.15):.3;O.lip=1;O.ear=-1;O.nx=5*g*k;}
 else if(m==='crush'){const g=sm(u/.2),r=sm((u-.9)/.1),k=1-r;O.ne=-.2*g*k;O.he=(-.42*g+(u>.7?.2*Math.sin(t*38):.04*Math.sin(t*60)))*k;O.mouth=u<.2?sm(u/.15):cl(.95-(u-.2)*1.25,.08,1);O.lip=1;O.ear=-1;O.nx=5*g*k;O.hy=1.2*g*k;}
 else if(m==='grapple'&&b.phase===1){// klammert: beide Pranken nach vorn um den Gegner, Kopf senkt sich auf Kopf und Schulter, nach jedem Biss ein Schütteln
  const e=sm(b.clock/.35),tk=(b.clock%.7)/.7,bit=b.clock>.7&&tk<.4?1-tk/.4:0;O.nx=7*e;O.fx=7*e;O.ny=2.5*e;O.fy=2.5*e;O.ne=-.28*e;O.he=-.3*e+.16*bit*Math.sin(t*42);
  O.p=.02*bit*Math.sin(t*42+1);O.mouth=(.3+.6*sm(1-Math.abs(tk-.92)/.08))*e;O.lip=e;O.ear=-.9*e;}
 else if(m==='grapple'){const e=sm(b.clock/.5);O.lip=e;O.mouth=.35*e;O.ear=-.8*e;}
 else if(m==='fling'){// zubeißen, Kopf senken, dann Ruck mit Kopf und Nacken nach oben und zur Seite
  const l=sm(u/.26),w=sm((u-.5)/.14),r=sm((u-.74)/.26),k=1-r,lo=b.held?0:1;O.hx=(4*l*lo-3*w)*k;O.ne=(.3*l*lo-.45*sm((u-.3)/.15)*(1-w)+.8*w)*k;O.he=(.2*l*lo+.55*w)*k;O.p=.07*w*k;
  O.mouth=u<.28&&lo?.95*sm(u/.2):u<.56?.22:.5*k;O.lip=k;O.ear=-.9*k;if(b.held){O.nx=7*(1-w);O.fx=7*(1-w);O.ny=2.5*(1-w);O.fy=2.5*(1-w);}}
 else if(m==='drag'){const e=sm(b.clock/.4);O.ne=-.3*e;O.he=-.4*e+.05*Math.sin(t*7)*e;O.mouth=.22*e;O.lip=e;O.ear=-.8*e;O.hy=.8*e;}
 else if(m==='bluff'||m==='charge'){O.lip=.7;O.mouth=.25;O.ear=-.8;
  if(b.leap){// der letzte Galoppsprung: Brust und Vorderpranken voraus, Hinterläufe strecken sich nach hinten, Maul auf
   const u=cl(b.leap.t/.26,0,1),sn=Math.sin(Math.PI*u*.9),e=sm(u/.5);O.hy=-6*sn;O.p=.2*sn;O.nx=11*e;O.fx=11*e;O.ny=-8*sn-2*e;O.fy=-8*sn-2*e;O.ax=-5*e;O.ay=-5*sn;O.mouth=.3+.6*e;O.lip=1;O.ne=.15*e;}}
 else if(m==='dodge'){const e=sm(u/.22)*(1-sm((u-.5)/.5));O.hx=-8*e;O.p=.1*e;O.ne=.3*e;O.he=.24*e;O.ear=-1;O.lip=e;O.mouth=.3*e;}// Rumpf und Kopf zucken zurück, die Pranken bleiben stehen
 else if(m==='recoil'){const e=sm(u/.2)*(1-sm((u-.45)/.55));O.hx=-4*e;O.p=.06*e;O.ne=.16*e;O.ear=-1;O.lip=e;O.mouth=.75*e;}// zurückgeworfen, Schmerzbrüllen
 else if(m==='back'){const e=sm(b.clock/.3);O.ne=-.16*e;O.he=.12*e;O.ear=-e;O.lip=.6*e;O.mouth=.12*e;O.hy=e;}// Kopf tief zum Gegner, Ohren angelegt
 else if(m==='dead'){const e=sm(b.clock/1.2);O.he=-.3*e;O.ne=-.15*e;O.mouth=.25*e;}
 // Treffer (B3c3): Der Bär zuckt an der getroffenen Stelle zusammen (e), dann schnellt der Kopf zum Angreifer (s), bei spürbaren Treffern brüllt er.
 const fl=K.OPT.reakt&&b.fl&&!b.g.dead?b.fl:null;
 if(fl){const q=(t-fl.t)/.55;if(q>=1||q<0)b.fl=null;else{const kl=m==='approach'||m==='back'||m==='recoil'||m==='dodge'||m==='flee'?1:HOLD.includes(m)?.15:.35;/* mitten im eigenen Angriff nur ein kleines Zucken: Pranke und Maul bleiben am Ziel (B3c1) */
   const e=Math.sin(Math.PI*.5*Math.min(1,q/.3))*(1-sm((q-.3)/.7))*fl.w*kl,s=fl.front&&(m==='approach'||m==='back'||m==='recoil')?sm((q-.2)/.25)*(1-sm((q-.65)/.35))*fl.w:0,g=Math.max(e,s),ad=(k,v)=>{O[k]=(O[k]||0)+v;},p=fl.part;
   if(p==='kopf'){ad('he',.3*e);ad('ne',.12*e);ad('hx',-2.5*e);}else if(p==='hals'){ad('ne',-.22*e);ad('he',.18*e);ad('hx',-2*e);}
   else if(p==='brust'){ad('hx',-3*e);ad('p',.07*e);ad('bend',1.2*e);}else if(p==='vl'){ad('hx',-1.5*e);ad('p',.04*e);if(!(fig.v>2)){ad('ny',-5*e);ad('nx',-3*e);}}
   else if(p==='bauch'){ad('bend',2.4*e);ad('hy',-1.2*e);}else{ad('hy',2.6*e);ad('p',.07*e);}
   O.ear=Math.max(-1,(O.ear||0)-.9*g);if(fl.roar){O.mouth=Math.max(O.mouth||0,.75*g);O.lip=Math.max(O.lip||0,g);}
   if(s>0){ad('ne',.1*s);ad('he',-.12*s);ad('hx',2*s);}}}
 else if(hr>0&&!K.OPT.reakt){O.he=(O.he||0)+.14*hr;O.hx=(O.hx||0)-1.5*hr;O.ear=(O.ear||0)-.5*hr;}
 // Lahmen: Tritt die kranke Pranke auf, geht der Kopf hoch (der Bär nimmt Last von ihr); lahmt er hinten, sackt die Kruppe weg.
 // Im Stand hält er die kranke Vorderpranke angehoben. Die Füße bleiben dabei stehen (nur Rumpf, Hals und Kopf bewegen sich).
 const lv=lameOf(b,'vl'),lh=lameOf(b,'hl'),fg=b.fig;if((lv>0||lh>0)&&!b.g.dead&&fg.mode==='stand'&&!fg.turn){const gs=fg.gs||0,c=fg.cyc||0,sv=Math.max(0,Math.sin(TAU*(c-.5))),sh=Math.max(0,Math.sin(TAU*(c-.6)));
  O.ne=(O.ne||0)+.24*lv*gs*sv;O.he=(O.he||0)-.1*lv*gs*sv;O.p=(O.p||0)+.05*lv*gs*sv-.06*lh*gs*sh;O.hy=(O.hy||0)+1.8*lh*gs*sh;
  if(lv>.5&&gs<.2&&(m==='approach'||m==='threat'))O.ny=(O.ny||0)-5*(lv-.5)*(1-gs*5);}
 // Wechselt die Bewegung (anderer Angriff, andere Phase), läuft die alte Haltung in 0,2 s weich in die neue über (kein Ruck)
 const key=m+(b.phase||0)+(b.leap?'L':'')+(A?'a':V?(m==='pin'&&!PZ?'w':'v'):'');if(b.ovKey!==key){b.ovKey=key;b.ovFrom=b.ovLast||{};b.ovT=t;}
 const xe=Z?sm((t-b.ovT)/.2):1;if(xe<1){const F0=b.ovFrom;for(const k in F0)if(!(k in O))O[k]=0;for(const k in O)O[k]=L2(F0[k]||0,O[k],xe);}
 b.ovLast=O;b.fig.over=O;}

// ---------------------------------------------------------------- Ein Schritt des Bären
function foes(b){return S.battle.actors.filter(a=>a.team!==b.team&&!a.g.dead&&!a.surrendered&&!(a.dog&&DG().out(a))&&!(a.bear&&a.fled));}
function chooseTarget(b){const L=foes(b);if(!L.length)return null;
 const dog=L.find(a=>a.dog&&a.mode==='grip'&&a.victim===b.id);if(dog)return dog;// der Hund, der an ihm hängt, zuerst
 const g=b.grudge&&L.find(a=>a.id===b.grudge);if(g&&dist(g,b)<260)return g;
 const up=L.filter(a=>a.bear||a.dog||!(a.down&&M.health(a.g)<25));
 return (up.length?up:L).sort((p,q)=>dist(p,b)-dist(q,b))[0];}
const fallen=t=>!t.bear&&!t.dog&&((t.fallTimer||0)>0||t.down||t.state==='fallen');
function chooseAttack(b,t){const f=K.force;if(f&&b.team===0){K.force=null;if(['tear','crush','pin'].includes(f)&&!t.bear&&!t.dog){if(!fallen(t))fell(b,t,'Pulled down by '+b.g.name,2.6,10);b.wantSpecial=f==='pin'?null:f;return 'pin';}if(f==='drag'&&human(t)){if(!fallen(t))fell(b,t,'Pulled down by '+b.g.name,2.6,10);b.wantSpecial='drag';return 'pin';}
  if((f==='grapple'||f==='fling')&&human(t)&&!fallen(t))return f;if(['swipe','slam','bite','charge','threat','bluff'].includes(f))return f;}
 if(fallen(t))return 'pin';
 const A=b.P.bauart,w={swipe:A==='D'?.25:A==='B'?.75:.5,bite:A==='D'?.65:A==='H'||A==='A'?.4:.28,slam:t.dog?.05:.2};
 // Packen und Schleudern nur gegen Menschen, die der Bär vom Gewicht her halten kann; Schleudern eher, wenn mehrere Gegner nah sind (schafft Platz)
 if(human(t)&&K.OPT.ringen){if(heavier(b,t,.9))w.grapple=A==='D'?.08:A==='H'?.14:.2;if(heavier(b,t,1.5))w.fling=foes(b).filter(a=>a!==t&&dist(a,b)<130).length?.2:.08;}
 if(b.tissue.vl/b.max.vl<.35){w.swipe*=.3;w.slam*=.3;if(w.grapple)w.grapple*=.2;}return pick(Object.entries(w));}
// Umspringen (B3c2): Aufprall mit Brust und Vorderpranken. Der Schaden ist der alte Rammstoß (wächst nicht mit dem höheren Tempo). Menschen fliegen
// nach Gewichtsverhältnis (Flug über b.toss wie beim Wegschleudern), der Bär verliert am Gegner den größten Teil seines Tempos, landet bei ihm und drückt nieder.
function pounce(b,T){const fig=b.fig,P=b.P,v=fig.v||0,f=B.facing(fig);b.leap=null;b.energy-=12;sand(b,b.x+f*22*P.sz*K.SCALE,b.y+1,12,f*v*.2,1.3);
 const ok=strike(b,T,'ram',P.ram*(v/K.OPT.tempo/250)*rnd(.85,1.15));
 if(!ok||T.bear||T.dog){if(ok&&T.dog)T.kbx=(T.kbx||0)+Math.cos(b.a)*90;if(!ok&&human(T)){T.ky=(T.ky||0)+(T.y>=b.y?1:-1)*70;/* er wirft sich zur Seite, der Bär schiebt ihn nicht vor sich her */}if(!ok&&human(T))log(T.g.name+' gets out of the way. '+b.g.name+' thunders past, taking the breeze with it.');state(b,'approach');b.cool=.5;return;}
 const D=cl(40+20*P.mass/(T.g.weight||80),50,170),l=Math.hypot(b.dirx,b.diry*.5)||1,tt=.3+D/400;
 M.knockdown(T,'Run down by '+b.g.name,3);
 {let best=null,bx=-1e9;for(const fs of [-1,1]){T.fallSide=fs;const x=(groundPoint(T,'head').x-T.x)*f;if(x>bx){bx=x;best=fs;}}T.fallSide=best;}// von vorn umgerissen: er fällt nach hinten, der Kopf zeigt vom Bären weg
 b.toss={id:T.id,vx:b.dirx/l*2*D/tt,vy:b.diry*.5/l*2*D/tt,left:tt,T:tt};fig.v=v*.45;b.pounces=(b.pounces||0)+1;b.pounceD=D;b.rush=true;
 if(T.g.dead){log(b.g.name+' goes through '+T.g.name+' at full gallop. There is no second act.');state(b,'approach');b.cool=.6;return;}
 log(b.g.name+' leaps into '+T.g.name+' chest first. He is still flying when the bear lands on him.');b.victim=T.id;b.interrupt=0;state(b,'pin');b.pinPart=null;b.stoodOver=T.id;}
function stepBear(b,dt){const bt=S.battle,fig=b.fig,P=b.P,t=bt.time;b.clock+=dt;b.cool=Math.max(0,b.cool-dt);b.hit=Math.max(0,b.hit-dt);stepSpray(b,dt);stepDust(b,dt);
 fig.sprint=K.OPT.sturm&&(b.mode==='charge'||b.mode==='bluff')&&!b.g.dead?1:0;
 // Geschleuderter fliegt aus: schnell los, läuft aus (sim.js bremst Stöße zu früh für einen Wurf)
 if(b.toss){const q=b.toss,V=bt.actors.find(a=>a.id===q.id);if(V&&q.left>0){const v=q.left/q.T;V.x=cl(V.x+q.vx*v*dt,BX[0],BX[1]);V.y=cl(V.y+q.vy*v*dt,BY[0],BY[1]);q.left-=dt;}else b.toss=null;}
 if(!b.g.dead){let bl=0;for(const p of PARTS){const v=b.bleed[p]||0;if(v>0){bl+=v;b.bleed[p]=v*Math.exp(-dt*.1);/* Wunden schließen sich langsam */}}b.blood=Math.max(0,b.blood-bl*dt);
  if(bl>.25&&Math.random()<dt*6){const w=partWorld(b,PARTS[Math.floor(Math.random()*6)]);stain(w.x,w.y,1+Math.random()*2);}
  b.energy=Math.min(100,b.energy+dt*5*P.stam);if(b.blood<=16)die(b,bt.actors.find(a=>a.id===b.lastAttacker)||null,'Bled out');}
 if(b.g.dead){b.pool=b.pool||{r:0};b.pool.r=Math.min(26*P.sz,b.pool.r+dt*5);b.dirx=b.diry=0;animate(b,dt,t);return;}
 let T=bt.actors.find(a=>a.id===b.victim);if(T&&T.g.dead&&(HOLD.includes(b.mode)||b.mode==='fling')){
  if(T.g.dead&&b.mode==='crush'&&!b.struck){T.headCrushed=true;pulp(b,T);T.g.cause='Head crushed in the jaws of '+b.g.name;b.crushed=(b.crushed||0)+1;const h=T.g.body.head;if(h){h.hp=0;h.grade=5;h.injury='Crushed';}log(b.g.name+' bites down until nothing in '+T.g.name+"'s head holds together.");}
  if(T.g.dead)log(b.g.name+' lets go of what is left of '+T.g.name+'.');releaseVictim(b);state(b,'approach');b.cool=.8;T=null;}
 if(b.morale<=0&&b.mode!=='flee'&&!['tear','crush'].includes(b.mode)){releaseVictim(b);state(b,'flee',5);log(b.g.name+' has had enough and runs.');}
 if(K.OPT.reakt&&b.team===0&&(K.force==='dodge'||K.force==='recoil')){b[K.force+'Next']=true;K.force=null;}
 const m=b.mode;
 if(m==='flee'){const L=foes(b),n=L.sort((p,q)=>dist(p,b)-dist(q,b))[0];const ax=n?b.x-n.x:(b.team?1:-1),ay=n?b.y-n.y:0,l=Math.hypot(ax,ay)||1;head(b,cl(b.x+ax/l*200,BX[0],BX[1]),cl(b.y+ay/l*200,BY[0],BY[1]),'run');
  if(b.clock>b.duration||!n){b.fled=true;b.surrendered=true;halt(b);}}
 else if(m==='dodge'||m==='recoil'){const A=bt.actors.find(a=>a.id===b.from);if(fig.mode!=='stand'&&!fig.want)B.pose(fig,'stand');
  // zurückgeworfen: ein Schritt vom Angreifer weg (rückwärts, wenn der vorn steht), Ausweichen bleibt auf der Stelle
  if(m==='recoil'&&A&&b.clock<b.duration*.65){const away=A.x>=b.x?-1:1,tx=cl(b.x+away*40,BX[0],BX[1]);if(away===-B.facing(fig))backTo(b,tx,b.y,1.6);else head(b,tx,b.y,'walk');}else halt(b);
  if(b.clock>=b.duration){state(b,'approach');b.cool=m==='dodge'?0:.2;}}
 else if(m==='back'){const A=bt.actors.find(a=>a.id===b.from),F=B.facing(fig);
  // rückwärts vom Gegner weg, Kopf zu ihm; kommt er in Reichweite und der Bär ist bereit, greift er an
  if(!A||A.g.dead||b.clock>=b.duration||dist(A,b)>175||b.cool<=0&&inReach(b,A)||F>0&&b.x<=BX[0]+6||F<0&&b.x>=BX[1]-6){b.backUntil=t+4;halt(b);state(b,'approach');}
  else if((A.x>=b.x?1:-1)!==F){if(!fig.turn&&!fig.turnWant){halt(b);if((fig.v||0)<8)B.turn(fig);}else halt(b);}
  else{const l=dist(A,b)||1;backTo(b,cl(b.x-(A.x-b.x)/l*60,BX[0],BX[1]),cl(b.y-(A.y-b.y)/l*25,BY[0],BY[1]));}}
 else if(m==='swipe'||m==='bite'){halt(b);const tg=bt.actors.find(a=>a.id===b.aim),hitAt=m==='swipe'?.46:.34;
  if(!b.struck&&b.clock>=b.duration*hitAt){b.struck=true;const ok=tg&&!tg.g.dead&&(b.swat&&tg.mode==='grip'&&tg.victim===b.id||Math.abs(tg.x-b.x)<reachOf(b)+(tg.r||14)+16&&Math.abs(tg.y-b.y)<26);
   // Abreißen am Stehenden (Startwerte: erst ab ☠4): entschieden vor dem Biss, am schon schwer verletzten Glied
   const at=ok&&human(tg)?(b.at&&!tg.g.body[b.at]?.missing?b.at:humanPart(b,tg,m)):null,rip=m==='bite'&&at&&!fallen(tg)&&P.skulls>=4&&Math.random()<tearChance(b,tg,at)?limbFor(b,tg,at):null;
   b.landed=ok&&strike(b,tg,m,m==='swipe'?P.swipe*rnd(.85,1.15):P.bite*rnd(.85,1.15),at);if(ok)b.chk={kind:m};
   if(b.landed&&b.swat&&tg.dog){tg.kbx=(tg.kbx||0)+(tg.x>=b.x?1:-1)*70;log(b.g.name+' swats '+tg.g.name+' off.');}
   if(b.landed&&m==='swipe'&&!tg.bear&&!tg.dog&&Math.random()<cl(P.mass/(tg.g.weight||80)/9,.1,.75)){fell(b,tg,'Swatted down by '+b.g.name,2.2,60);log(b.g.name+' swats '+tg.g.name+' off his feet.');}
   if(!b.landed&&m==='bite')b.duration=Math.min(b.duration,b.clock+.35);
   if(rip&&b.landed&&!tg.g.dead&&!tg.g.body[rip]?.missing){finisher(b,tg,'tear',rip);animate(b,dt,t);return;}}// der Bär reißt den Mann am Glied zu Boden
  if(m==='bite'&&b.landed&&b.struck&&tg&&!tg.g.dead){const n=Math.floor((b.clock-b.duration*.34)/.22);if(n>b.ticks&&b.ticks<3&&b.clock<b.duration*.82){b.ticks=n;strike(b,tg,'bite',P.shake*rnd(.8,1.2));if(!tg.bear&&!tg.dog){tg.kx=(tg.kx||0)+(Math.random()<.5?-1:1)*18;}}}
  if(b.clock>=b.duration){b.swat=false;state(b,'approach');b.cool=rnd(.3,.75)*(b.energy<25?1.6:1)*(1.3-P.wild*.5);}}
 else if(m==='slam'){halt(b);const tg=bt.actors.find(a=>a.id===b.aim);
  if(b.phase===0){if(fig.mode!=='rear'&&!fig.want)B.pose(fig,'rear');if(fig.mode==='rear'&&!B.moving(fig)&&b.clock>.5||b.clock>3.2){b.phase=1;b.clock=0;b.duration=(1.5+.45*cl(b.bear.weight/400,.3,2))/fig.rate;B.pose(fig,'stand');}}
  else{if(!b.struck&&b.clock>=b.duration*.62){b.struck=true;const ok=tg&&!tg.g.dead&&Math.abs(tg.x-b.x)<reachOf(b)+(tg.r||14)+20&&Math.abs(tg.y-b.y)<28;
    if(ok)b.chk={kind:'slam'};if(ok&&strike(b,tg,'slam',P.slam*rnd(.85,1.15),human(tg)&&b.at&&!tg.g.body[b.at]?.missing?b.at:null)){if(!tg.bear&&!tg.dog&&Math.random()<cl(P.mass/(tg.g.weight||80)/5,.3,.95)){fell(b,tg,'Crushed under '+b.g.name,2.6,25);log(b.g.name+' drops on '+tg.g.name+' with both paws.');}}}
   if(b.clock>=b.duration+.15){b.phase=0;state(b,'approach');b.cool=rnd(.6,1.2);}}}
 else if(m==='grapple'){halt(b);const V=bt.actors.find(a=>a.id===b.victim),near=V&&Math.abs(V.x-b.x)<reachOf(b)+(V.r||14)+18&&Math.abs(V.y-b.y)<28;
  if(!V||V.g.dead||b.phase===0&&fallen(V)){releaseVictim(b);state(b,'approach');b.cool=.4;}
  else if(b.phase===0){// aufrichten; bis die Pranken zugreifen, kann der Gegner noch weg
   if(fig.mode!=='rear'&&!fig.want)B.pose(fig,'rear');
   if(fig.mode==='rear'&&!B.moving(fig)&&b.clock>.4||b.clock>3.2){const duck=cl(.1+((V.g.stats.agility||50)-50)*.004,.04,.3);
    if(!near||Math.random()<duck){log(V.g.name+(near?' ducks out of ':' steps back from ')+b.g.name+"'s reach.");releaseVictim(b);state(b,'approach');b.cool=.7;}
    else{b.phase=1;b.clock=0;b.ticks=0;b.duration=2.9;hold(b,V);b.grapples++;b.grLast=null;b.grPart=grPick(b);b.hx=V.x;log(b.g.name+' clamps both paws around '+V.g.name+'.');}}}
  else if(fallen(V)||!V.grabbedBy){// liegt schon (Blutverlust, Treffer): weiter am Boden
   unhold(b,V);state(b,'pin');b.ticks=0;}
  else{if(fig.mode!=='rear'&&!fig.want)B.pose(fig,'rear');
   // der Gepackte steht an der Brust des Bären (ein Stück dahinter gezeichnet, die Pranken liegen über ihm)
   const hx=b.x+B.facing(fig)*(15*P.sz*K.SCALE+(V.r||14)*.5),k=Math.min(1,dt*9);V.x+=(hx-V.x)*k;V.y+=(b.y-1-V.y)*k;V.kx=V.ky=0;V.state='grabbed';
   const n=Math.floor(b.clock/.7);if(n>b.ticks){b.ticks=n;const gp=()=>grPick(b),part=b.grPart||gp(),pid=V.g.body[part]?.missing?'chest':part;b.grLast=pid;b.grPart=gp();b.chk={kind:'grapple',V,part:pid};
    const limb=Math.random()<tearChance(b,V,pid)?limbFor(b,V,pid):null,kopf=!limb&&pid==='head'&&Math.random()<headChance(b,V);// Schlussangriffe: entschieden vor dem Biss
    hurtHuman(b,V,'bite',pid,P.bite*.55*rnd(.8,1.2));
    if(!V.g.dead){
     if(limb&&!V.g.body[limb]?.missing){finisher(b,V,'tear',limb);}
     else if(kopf){finisher(b,V,'crush');}
     else if(Math.random()<.1*((V.g.stats.strength||50)/50)*(M.health(V.g)/100)*Math.sqrt(cl((V.g.weight||80)/P.mass,.05,1))){log(V.g.name+' twists out of '+b.g.name+"'s grip.");releaseVictim(b);state(b,'approach');b.cool=1;}}}
   if(b.mode==='grapple'&&b.clock>=b.duration){// Ende des Ringens: wegschleudern oder zu Boden ringen
    if(heavier(b,V,1.5)&&Math.random()<(foes(b).length>1?.45:.25)){state(b,'fling',.85);b.struck=true;b.landed=true;b.held=true;}
    else{unhold(b,V);fell(b,V,'Wrestled down by '+b.g.name,2.8,8);log(b.g.name+' wrestles '+V.g.name+' to the ground.');state(b,'pin');b.ticks=0;b.interrupt=0;}}}}
 else if(m==='fling'){halt(b);const V=bt.actors.find(a=>a.id===b.victim);
  if(b.held&&fig.mode!=='rear'&&!fig.want&&b.ticks<1)B.pose(fig,'rear');
  if(!b.struck&&b.clock>=b.duration*.28){b.struck=true;const ok=V&&!V.g.dead&&!fallen(V)&&Math.abs(V.x-b.x)<reachOf(b)+(V.r||14)+16&&Math.abs(V.y-b.y)<26;
   b.landed=ok&&hurtHuman(b,V,'bite',pick([['ls',.3],['rs',.3],['lua',.15],['rua',.15],['chest',.1]]),P.bite*.7*rnd(.85,1.15));
   if(b.landed&&!V.g.dead&&!fallen(V))hold(b,V),b.held=false;else if(!b.landed)b.duration=Math.min(b.duration,b.clock+.35);}
  if(b.landed&&V&&V.grabbedBy===b.id&&b.ticks<1){const hx=b.x+B.facing(fig)*(b.rearFinish&&fig.mode==='rear'?15*P.sz*K.SCALE+(V.r||14)*.5:Math.max(reachOf(b),mouthAt(b)-2)),k=Math.min(1,dt*9);V.x+=(hx-V.x)*k;V.kx=V.ky=0;V.state='grabbed';}
  if(b.landed&&b.ticks<1&&b.clock>=b.duration*.6){b.ticks=1;if(V&&!V.g.dead){unhold(b,V);
    // der Wurf: weit in Blickrichtung, etwas zur Seite; der Aufprall zählt als Wucht (Rüstung hilft kaum)
    const far=cl(45+40*Math.sqrt(P.mass/(V.g.weight||80)),70,150),T=.5;M.knockdown(V,'Thrown aside by '+b.g.name,2.9);V.kx=V.ky=0;b.toss={id:V.id,vx:B.facing(fig)*far*2/T,vy:rnd(-1,1)*far*.5/T,left:T,T};
    hurtHuman(b,V,'ram',pick([['chest',.4],['belly',.2],['head',.15],['ls',.12],['rs',.13]]),P.ram*1.1*rnd(.85,1.15));b.flung++;b.shun=null;log(b.g.name+' throws '+V.g.name+' aside like a wet sack.');}}
  if(b.clock>=b.duration){releaseVictim(b);state(b,'approach');b.cool=rnd(.5,.9);}}
 else if(m==='drag'){const V=bt.actors.find(a=>a.id===b.victim);if(!V){state(b,'approach');}
  else{V.pinnedBy=b.id;if(!(V.fallTimer>0)&&!V.down)M.knockdown(V,'Dragged by '+b.g.name,2.6);
   if(!fig.turn)b.dragOff=Math.max(reachOf(b)-8*P.sz,mouthAt(b)-8);// das gepackte Bein am Maul, der Körper schleift neben dem Bären nach
   // Wegziehen wie Rex Vetus (B3c3): Der Bär geht rückwärts, das Opfer im Maul vor sich, Kopf zu den Helfern. Steht er falsch herum, dreht er erst (das Opfer schwenkt mit).
   let d;if(K.OPT.reakt){const Fw=Math.abs(b.dragTo.x-b.x)>25?(b.dragTo.x<b.x?1:-1):B.facing(fig);
    if(fig.turn||fig.turnWant){halt(b);d=99;}else if(B.facing(fig)!==Fw){halt(b);if((fig.v||0)<8)B.turn(fig);d=99;}else d=backTo(b,b.dragTo.x,b.dragTo.y,.8);}
   else d=head(b,b.dragTo.x,b.dragTo.y,'walk');
   const Y=B.yaw(fig,t),off=b.dragOff||reachOf(b)-8*P.sz,ox=V.x,oy=V.y;
   // das Opfer hängt im Maul: liegt vor den Vorderpranken unter dem Kopf und schwenkt beim Wenden mit dem Kopf herum
   V.x=cl(b.x+(Y?Y.F*Math.cos(Y.h):B.facing(fig))*off,BX[0],BX[1]);V.y=cl(b.y+2+(Y?4*Math.sin(Y.h):0),BY[0],BY[1]);V.kx=V.ky=0;b.dragLen=(b.dragLen||0)+Math.hypot(V.x-ox,V.y-oy);
   V.fallSide=-(Y?(Math.cos(Y.h)>=0?Y.F:-Y.F):B.facing(fig))*(Math.cos(V.a)>=0?1:-1);// der Liegende zeigt mit dem Kopf nach hinten (Lage der Figur wie in arena.js)
   if(K.OPT.reakt){// die gepackte Schulter liegt am Maul, Kopf beim Bären, die Beine schleifen nach; das Opfer rutscht weich in den Griff
    const F=Y?(Math.cos(Y.h)>=0?Y.F:-Y.F):B.facing(fig);let best=1,bx=-1e9;for(const fs of [-1,1]){V.fallSide=fs;const x=-(groundPoint(V,'head').x-V.x)*F;if(x>bx){bx=x;best=fs;}}V.fallSide=best;
    if(!Y){const gp=groundPoint(V,'chest');V.x=cl(b.x+F*31*P.sz*K.SCALE-(gp.x-V.x),BX[0],BX[1]);b.dragOff=Math.abs(V.x-b.x);}// Abstand wie beim Niederdrücken (pinSpot): nach dem Zerren steht der Bär schon richtig am Liegenden
    const lim=(220+(fig.v||0)*P.sz*K.SCALE)*dt;V.x=ox+cl(V.x-ox,-lim,lim);V.y=oy+cl(V.y-oy,-lim,lim);}// der Körper schleift nach, er springt nie
   if(Math.random()<dt*9&&(fig.v||0)>4)stain(V.x,V.y,1.2+Math.random()*1.6);
   const n=Math.floor(b.clock/.8);if(n>b.ticks){b.ticks=n;hurtHuman(b,V,'pin',b.dragPart,P.bite*(K.OPT.reakt?.5:.22)*rnd(.8,1.2));/* B3c3: er zieht öfter weg, dafür reißt das Zerren mehr auf (Siegquote wie vorher, gemessen) */}
   if(d<14&&!fig.turn||b.clock>=b.duration){b.dragUntil=bt.time+(K.OPT.reakt?4.5:7);state(b,'pin');b.ticks=0;if(K.OPT.reakt)b.pinPart=null;/* neue Stelle suchen: das Opfer liegt jetzt anders */}}}
 else if(m==='threat'&&K.OPT.sturm){halt(b);const nah=!b.thrForce&&foes(b).some(a=>!fallen(a)&&dist(a,b)<115);// kommt ihm einer zu nah, bricht er das Drohen ab
  if(b.phase===0){if(nah){b.phase=2;b.clock=0;B.pose(fig,'stand');}else{if(fig.mode!=='rear'&&!fig.want)B.pose(fig,'rear');if(fig.mode==='rear'&&!B.moving(fig)&&b.clock>.4||b.clock>3.2){b.phase=1;b.clock=0;B.sound?.('roar',b);}}}
  else if(b.phase===1){if(b.clock>=1.9||nah){b.phase=2;b.clock=0;B.pose(fig,'stand');}}
  else if(b.phase===2){if(fig.mode==='stand'&&!B.moving(fig)||b.clock>2.6){b.phase=3;b.clock=0;const f=B.facing(fig),R=fig._R;sand(b,b.x+f*(R?R.legs[3].px:25)*P.sz*K.SCALE,b.y+1,16,f*45,1.5);B.sound?.('slam',b);
    log(b.g.name+' drops and slams both paws into the sand. The front row reconsiders its seats.');}}
  else{if(!b.clacked&&b.clock>.12){b.clacked=true;B.sound?.('clack',b);}if(b.clock>=.8||nah&&b.clock>.25){state(b,'approach');b.cool=.3;}}}
 else if(m==='threat'){halt(b);if(fig.mode!=='rear'&&!fig.want&&b.clock<1)B.pose(fig,'rear');if(b.clock>.9&&!b.roared){b.roared=true;B.sound?.('roar',b);}
  if(b.clock>=b.duration){B.pose(fig,'stand');state(b,'approach');b.cool=.4;}}
 else if(m==='bluff'||m==='charge'){T=bt.actors.find(a=>a.id===b.aim);if(!T||T.g.dead||out(T)){state(b,'approach');}
  else{const d=dist(b,T),stopAt=m==='bluff'?95:0;
   if(m==='bluff'&&d<stopAt+brake(fig)*P.sz){halt(b);if((fig.v||0)<8){log(b.g.name+' charges and stops short. Just checking.');state(b,'approach');b.cool=rnd(.4,.9);}}
   else{const sturm=m==='charge'&&K.OPT.sturm,reach=26*P.sz*K.SCALE+(T.r||14);head(b,T.x,T.y,'run',sturm);
    if(sturm){// Umspringen: rund eine Viertelsekunde vor dem Gegner springt der Bär ab; in der Luft bremst nichts
     if(!b.leap&&(fig.v||0)>110&&!fig.turn&&d<reach+(fig.v||0)*P.sz*K.SCALE*.26){b.leap={t:0,v:fig.v};B.sound?.('huff',b);}
     if(b.leap){b.leap.t+=dt;fig.v=Math.max(fig.v||0,b.leap.v);
      if(d<reach){pounce(b,T);animate(b,dt,t);return;}
      if(b.leap.t>.55){log(b.g.name+' lands where '+T.g.name+' no longer is.');state(b,'approach');b.cool=.6;b.energy-=8;}}
     else if(b.clock>6)state(b,'approach');}
    else if(m==='charge'&&d<reach&&(fig.v||0)>110){const v=fig.v;if(strike(b,T,'ram',P.ram*(v/250)*rnd(.85,1.15))){if(!T.bear&&!T.dog){fell(b,T,'Run down by '+b.g.name,2.6,95);log(b.g.name+' runs '+T.g.name+' down.');}else if(T.dog){T.kbx=(T.kbx||0)+Math.cos(b.a)*90;}}state(b,'approach');b.cool=.5;b.energy-=12;}
    else if(b.clock>6)state(b,'approach');}}}
 else if(m==='pin'||m==='tear'||m==='crush'){const V=bt.actors.find(a=>a.id===b.victim);if(!V){state(b,'approach');}
  else{const sp=pinSpot(b,V),d=Math.hypot(sp.x-b.x,sp.y-b.y);if(m==='pin'&&!fig.turn&&(!b.pinPart||K.OPT.ziel&&human(V)&&!pinOk(b,V,b.pinPart)))b.pinPart=pinPick(b,V);if(d>10&&m==='pin')head(b,sp.x,sp.y,b.rush&&d>45?'run':'walk');else{b.rush=false;halt(b);if(fig.mode==='rear'&&!fig.want)B.pose(fig,'stand');faceTo(b,K.OPT.ziel&&human(V)?groundPoint(V,'chest'):V);}
   V.pinnedBy=b.id;if(!(V.fallTimer>0)&&!V.down)M.knockdown(V,'Held down by '+b.g.name,2.6);
   if(m==='pin'&&d<=14&&!(K.OPT.ziel&&human(V)&&(fig.turn||fig.turnWant))){const n=Math.floor(b.clock/.75);if(n>b.ticks){b.ticks=n;let sp0=b.wantSpecial;b.wantSpecial=null;if(!sp0&&b.team===0&&(K.force==='tear'||K.force==='crush'||K.force==='drag')){sp0=K.force;K.force=null;}
     // Wegzerren: Stören andere Gegner in der Nähe, zerrt der Bär seine Beute von ihnen weg (höchstens alle 7 s)
     const stoer=foes(b).filter(a=>a!==V&&!fallen(a)&&dist(a,b)<(K.OPT.reakt?210:150)).sort((p,q)=>dist(p,b)-dist(q,b))[0];
     if(sp0==='drag'||!sp0&&K.OPT.ringen&&stoer&&heavier(b,V,1.2)&&t>(b.dragUntil||0)&&Math.random()<(K.OPT.reakt?(b.dragged?.45:.85):.22)){const ax=stoer?b.x-stoer.x:B.facing(fig),ay=stoer?b.y-stoer.y:0,l=Math.hypot(ax,ay)||1;
      b.dragTo={x:cl(b.x+ax/l*130,BX[0]+30,BX[1]-30),y:cl(b.y+ay/l*90,BY[0]+10,BY[1]-10)};b.dragPart=K.OPT.reakt?(Math.random()<.5?'ls':'rs'):(Math.random()<.5?['lt','rt']:['rt','lt']).find(id=>!V.g.body[id]?.missing)||'belly';/* B3c3: an der Schulter gepackt wie Rex Vetus, die Beine schleifen nach */
      b.dragged++;state(b,'drag',K.OPT.reakt?4.4:3.4);log(b.g.name+' drags '+V.g.name+' away by the '+(b.dragPart==='belly'?'belt':b.dragPart[1]==='s'?'shoulder':'leg')+'.');animate(b,dt,t);return;}
     // Biss am Liegenden: erst die Stelle wählen, dann entscheidet sich, ob daraus ein Abriss oder ein Kopfbiss wird (Schlussangriffe)
     const part=b.pinPart&&!V.g.body[b.pinPart]?.missing?b.pinPart:pinPick(b,V),forced=sp0==='tear'?(['lfa','rfa','lua','rua','lsh','rsh','lh','rh','lf','rf'].map(x=>limbFor(b,V,x)).find(Boolean)||null):null;
     const limb=sp0==='tear'?forced:!sp0&&Math.random()<tearChance(b,V,part)?limbFor(b,V,part):null;
     if(limb){b.limb=limb;V.tornOnce=true;state(b,'tear',1.9);log(b.g.name+' sinks its teeth into '+V.g.name+"'s "+LIMB_EN[b.limb]+'.');}
     else if(sp0==='crush'||!sp0&&part==='head'&&Math.random()<headChance(b,V)){state(b,'crush',2.2);log(b.g.name+' closes its jaws around '+V.g.name+"'s head."+(helmOf(V)?' The helmet starts to fold.':''));}
     else{hurtHuman(b,V,'pin',part,P.bite*.6*rnd(.8,1.2));b.pinLast=part;b.pinPart=pinPick(b,V);b.chk={kind:'pin',V,part};
      // Ablassen: Braunbären (und Höhlenbären) verlieren das Interesse an einem reglosen Opfer, wenn es noch andere Gegner gibt
      if(!V.g.dead&&['G','I','C'].includes(P.bauart)&&M.health(V.g)<38&&b.ticks>=3&&foes(b).length>1&&Math.random()<.3){log(b.g.name+' loses interest in '+V.g.name+'. Playing dead works. Mostly.');state(b,'leave');releaseVictim(b);b.shun=V.id;state(b,'approach');b.cool=.6;}
      else if(!V.g.dead&&Math.random()<.05*((V.g.stats.strength||50)/50)*(M.health(V.g)/100)){log(V.g.name+' rolls out from under '+b.g.name+'.');releaseVictim(b);state(b,'approach');b.cool=1;}}}}
   else if(m==='tear'){if(!b.struck&&b.clock>=b.duration*.2){b.struck=true;hurtHuman(b,V,'bite',b.limb,P.bite*rnd(.9,1.1));}
    if(b.ticks<1&&b.clock>=b.duration*.72){b.ticks=1;if(!V.g.body[b.limb]?.missing){M.sever?.(b,V,b.limb);}if(V.g.body[b.limb]?.missing&&!b.tornNow){b.tornNow=true;fig.mouthBlood=1;spray(b,V.x,V.y,14,26,b.a+Math.PI);b.torn=(b.torn||0)+1;log(b.g.name+' tears off '+V.g.name+"'s "+LIMB_EN[b.limb]+' and shakes it.');}}
    if(b.clock>=b.duration){b.tornNow=false;state(b,'pin');b.ticks=0;}}
   else if(m==='crush'){if(b.ticks<3&&b.clock>=b.duration*(.3+.2*b.ticks)){b.ticks++;hurtHuman(b,V,'bite','head',P.bite*.5);fig.mouthBlood=1;}
    if(!b.struck&&b.clock>=b.duration*.88){b.struck=true;if(!V.g.dead){const h=V.g.body.head;if(h){h.hp=0;h.grade=5;h.injury='Crushed';}V.headCrushed=true;M.death(V,'Head crushed in the jaws of '+b.g.name,b);b.kills++;b.crushed=(b.crushed||0)+1;pulp(b,V);}spray(b,V.x,V.y,12,30,null);log(b.g.name+' bites down until nothing in '+V.g.name+"'s head holds together.");}
    if(b.clock>=b.duration){releaseVictim(b);state(b,'approach');b.cool=1;}}}}
 else{// approach: Ziel wählen, hingehen, angreifen
  T=K.OPT.ueben&&b.team===0&&!K.force?null:chooseTarget(b);// Übungsmodus (B3b2): der Bär der Seite A greift nur auf Knopfdruck an
  // Zurückschnappen (B3c3): wer ihn eben getroffen hat oder wessen Schlag er ausgewichen ist und vorn in Reichweite steht, bekommt sofort Biss oder Hieb
  if(b.retort){const r=t<(b.retortUntil||0)&&foes(b).find(a=>a.id===b.retort);if(!r){b.retort=null;b.snap=false;}else if(inReach(b,r)&&!fallen(r)){T=r;b.cool=0;b.snap=true;}else b.snap=false;}else b.snap=false;
  // steht schon ein Gegner vorn in Reichweite, bekommt der den Hieb (der Bär dreht sich nicht erst zu einem anderen um)
  if(T&&b.cool<=0&&!inReach(b,T)){const nah=foes(b).filter(a=>inReach(b,a)&&a.id!==b.shun).sort((p,q)=>dist(p,b)-dist(q,b))[0];if(nah)T=nah;}
  if(T&&T.id===b.shun&&foes(b).length>1)T=foes(b).filter(a=>a.id!==b.shun).sort((p,q)=>dist(p,b)-dist(q,b))[0]||T;
  if(!T){halt(b);if(fig.mode!=='stand'&&!fig.want)B.pose(fig,'stand');if(!fig.expr&&Math.random()<dt*.3)B.express(fig,'sniff',t);}
  else{const d=dist(b,T),sp=spot(b,T),ds=Math.hypot(sp.x-b.x,sp.y-b.y),f=K.force&&b.team===0?K.force:null;
   // Hängt ein Hund am Bären, schlägt er ihn sofort weg (dafür muss er sich nicht erst hindrehen)
   const hang=b.cool<=0&&bt.actors.find(a=>a.dog&&!a.g.dead&&a.mode==='grip'&&a.victim===b.id);
   if(hang){b.aim=hang.id;b.at=null;state(b,'swipe',.7);b.swat=true;b.energy-=4;animate(b,dt,t);return;}
   // Zurückweichen (B3c3): zwischen den eigenen Angriffen geht er rückwärts, eher wenn er verletzt ist, der Mut sinkt oder mehrere Gegner vor ihm stehen
   if(K.OPT.reakt&&!b.snap&&(fig.v||0)<30&&(f==='back'||!f&&b.cool>.25&&t>(b.backUntil||0)&&!fallen(T)&&d<120&&(T.x-b.x)*B.facing(fig)>0&&!fig.turn&&!fig.turnWant&&fig.mode==='stand'&&Math.random()<dt*(.1+.9*(1-K.health(b)/100)+(b.morale<50?.4:0)+.3*foes(b).filter(a=>a!==T&&!fallen(a)&&dist(a,b)<120).length))){
    if(f)K.force=null;b.from=T.id;b.backs++;state(b,'back',f?1.6:rnd(.8,1.5));if(t-(b.backLog||-99)>12){b.backLog=t;log(b.g.name+' backs off, head low, ears flat. Nobody mistakes it for an apology.');}animate(b,dt,t);return;}
   if(!b.threatDone&&(f==='threat'||!f&&d>150)){b.threatDone=true;if(f==='threat'||Math.random()<.35+.4*P.wild){if(f)K.force=null;b.roared=false;state(b,'threat',2.3);b.thrForce=!!f;log(b.g.name+(K.OPT.sturm?' rises to its full height, claws the air and roars.':' rises on its hind legs and roars.'));animate(b,dt,t);return;}}
   if(b.cool<=0&&(f==='charge'||f==='bluff'||!f&&d>170&&b.energy>30&&!fallen(T)&&K.lame(b)<=.45)){const bl=f==='bluff'||!f&&b.bluffs<1&&Math.random()<.3*(1.1-P.wild);if(f)K.force=null;if(bl)b.bluffs++;b.aim=T.id;state(b,bl?'bluff':'charge');animate(b,dt,t);return;}
   if(fallen(T)&&d<70*P.sz+20){b.victim=T.id;b.interrupt=0;state(b,'pin');if(b.stoodOver!==T.id){b.stoodOver=T.id;log(b.g.name+' stands over '+T.g.name+'.');}}
   else if(ds>12&&!(b.cool<=0&&inReach(b,T)&&!(K.OPT.ueben&&b.team===0)))head(b,sp.x,sp.y,ds>70?'run':'walk');// im Übungsmodus geht er immer erst an seinen Platz vor dem Gegner
   else{halt(b);if(faceTo(b,T)&&b.cool<=0&&(fig.v||0)<45&&!B.moving(fig)){const sn=b.snap;b.snap=false;if(sn){b.retort=null;b.retorts++;log(b.g.name+' snaps back at '+T.g.name+'.');}const k=sn?(Math.random()<(T.dog?.3:.5)?'swipe':'bite'):chooseAttack(b,T);b.aim=T.id;b.at=human(T)&&(k==='swipe'||k==='bite'||k==='slam')?humanPart(b,T,k):null;/* die Stelle steht vor dem Ausholen fest: Pranke und Maul zielen darauf */b.energy-=k==='slam'?10:6;
     if(k==='pin'){b.victim=T.id;b.interrupt=0;state(b,'pin');}else if(k==='slam'){state(b,'slam');b.phase=0;}
     else if(k==='grapple'){b.victim=T.id;b.interrupt=0;state(b,'grapple');b.phase=0;}else if(k==='fling'){b.victim=T.id;b.interrupt=0;b.held=false;state(b,'fling',1.2);}else if(k==='charge'||k==='bluff'||k==='threat'){state(b,k,k==='threat'?2.3:0);if(k==='threat')b.thrForce=true;}
     else state(b,k,(k==='swipe'?.95+.25*cl(b.bear.weight/400,.3,2):1.25)*(sn?.8:1));}}}}
 animate(b,dt,t);}
function animate(b,dt,t){const fig=b.fig,P=b.P;over(b,t);B.step(fig,dt,t);fig._R=B.rig(fig,t);if(b.chk)contactCheck(b);// rechnet auch ohne Bild die Haltung weiter (Reihenrechnung)
 // Sand spritzt, wo im Sturm eine Pranke aufsetzt oder abdrückt (B3c2)
 if((fig.spr||0)>.3&&(fig.v||0)>150){const R=fig._R,f=B.facing(fig),k=P.sz*K.SCALE;let bits=0;for(let i=0;i<4;i++)if(R.legs[i].st)bits|=1<<i;const ch=bits^(b.ftBits==null?bits:b.ftBits);b.ftBits=bits;
  if(ch)for(let i=0;i<4;i++)if(ch>>i&1)sand(b,b.x+f*R.legs[i].px*k,b.y+(R.legs[i].near?2:-2),2,-f*fig.v*.22,1);}else b.ftBits=null;
 const v=(fig.v||0)*P.sz*K.SCALE;b.velocity=v;b.moveSpeed=v;if(v>.5){b.x=cl(b.x+b.dirx*v*dt,BX[0],BX[1]);b.y=cl(b.y+b.diry*v*dt*.8,BY[0],BY[1]);}
 b.a=B.facing(fig)>0?0:Math.PI;b.face=B.facing(fig);fig.mouthBlood=Math.max(0,(fig.mouthBlood||0)-dt*.004);}
// Prüfwert (B3c1): Abstand von Maul bzw. Pranke zur Trefferstelle im Bild des Treffers, in Einheiten des Skeletts (K.contacts, für den Test)
K.contacts=[];
function contactCheck(b){const q=b.chk,R=b.fig._R;b.chk=null;if(!R||!K.OPT.ziel)return;const T=q.V?(q.V.g.dead&&!fallen(q.V)?null:aimPoint(b,q.V,q.part)):b.aimPt;if(!T)return;const SH=b.fig.SH||B.shapeOf(b.bear),l=R.legs[3];
 const paw=q.kind==='swipe'||q.kind==='slam',x=paw?l.fx+5:R.hcx+11*SH.headS*Math.cos(R.he),y=paw?l.fy:R.hcy-11*SH.headS*Math.sin(R.he);
 K.contacts.push({kind:q.kind,d:Math.hypot(x-T.x,y-T.y),tx:T.x,ty:T.y});b.mark={kind:q.kind,x,y,tx:T.x,ty:T.y,d:Math.hypot(x-T.x,y-T.y),f:B.facing(b.fig),t:S.battle?.time||0};if(K.contacts.length>200)K.contacts.shift();}
K.stepBear=stepBear;

// ---------------------------------------------------------------- Zeichnen in der Arena (über M.drawRex)
const baseDraw=M.drawRex;
M.drawRex=function(ctx,a){if(!a?.bear)return baseDraw?.apply(this,arguments);const px=Math.round(a.x),py=Math.round(a.y),t=S.battle?.time||0;
 const bt=S.battle;if(bt?.pulp&&bt.actors.find(x=>x.bear)===a)drawPulp(ctx,bt.pulp);
 if(a.pool&&a.pool.r>1){ctx.fillStyle='#4c0f0b';ctx.beginPath();ctx.ellipse(px,py+2,a.pool.r*1.3,a.pool.r*.32,0,0,TAU);ctx.fill();}
 const t0=performance.now();a.fig._R=B.draw(ctx,a.fig,px,py,K.SCALE,1,{time:t});K.drawMs=(K.drawMs||0)*.95+(performance.now()-t0)*.05;
 if(a.dust&&a.dust.length)for(const p of a.dust){ctx.fillStyle=p.s>1?'#b08a52':'#dcc08a';ctx.fillRect(Math.round(p.x),Math.round(p.y-p.z),p.s,p.s);}
 if(a.spray.length)for(const p of a.spray){ctx.fillStyle='#8d1c13';ctx.fillRect(Math.round(p.x),Math.round(p.y-p.z),p.s,p.s);}
 if(K.OPT.zeigen&&a.team===0&&!a.g.dead&&!a.fled)drawAim(ctx,a,t);
 if(a.fled&&!a.g.dead){ctx.fillStyle='#e9d6a2';ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillText('flees',a.x,a.y-62*a.P.sz);}};

// ---------------------------------------------------------------- Kampf bauen und rechnen (Bausteine wie arena-core.js, dazu der Zweig für Bären)
// Einheit: {kind:'bear',D,key} oder wie in AN.build ({kind:'human',g,key} · {kind:'dog',D,key})
K.build=function(spec){const nb=u=>u.kind!=='bear';
 const b=AN.build({blue:spec.blue.filter(nb),red:spec.red.filter(nb),title:spec.title||'Bear pit',small:true});b.baer=true;b.editor=true;
 [spec.blue,spec.red].forEach((list,team)=>{const L=list.filter(u=>!nb(u)),others=list.length-L.length;L.forEach((u,i)=>{
   const a=K.makeFighter(u.D,team,team?800-(others?70:0):240+(others?70:0),cl(395+(i-(L.length-1)/2)*120,220,580));a.unit={kind:'bear',key:u.key,L:{name:u.D.name},row:'front'};a.unitKey=u.key;a.row='front';b.actors.push(a);});});
 b.hasDogs=b.actors.some(a=>a.dog);return b;};
const live=(b,t)=>b.actors.filter(a=>a.team===t&&!out(a));
function fixed(dt){const b=S.battle;if(!b||b.paused)return;if(b.ende&&b.time-b.ende.at>4)return;if(H?.shots?.active)return;if(DG()?.paused?.())return;
 M.groundPools?.(dt);b.time+=dt;H?.setSim?.(true);
 try{for(const a of b.actors){
   if(a.bear){stepBear(a,dt);continue;}
   if(a.dog){DG().step(a,dt);a._px=a.x;a._py=a.y;continue;}
   const x=a.x,y=a.y,p=a.phase||0,pin=a.pinnedBy&&b.actors.find(l=>l.id===a.pinnedBy&&!l.g.dead&&l.victim===a.id);
   if(pin&&!a.g.dead){// liegt unter dem Bären: fällt zu Ende, steht aber nicht auf und schlägt nicht
    a.wind=0;a.pendingStrike=null;M.updateActor(a,dt*1.12);if(!a.g.dead&&!a.down)a.fallTimer=Math.max(a.fallTimer||0,(a.riseDuration||1)+.45);a.wind=0;a.pendingStrike=null;}
   else if(a.puppe&&!a.g.dead){// Übungsfigur (B3b2): steht still und schlägt nicht; fällt, fliegt und wird gepackt wie jeder andere
    if(a.pinnedBy)delete a.pinnedBy;a.cool=Math.max(a.cool||0,1);M.updateActor(a,dt*1.12);a.wind=0;a.pendingStrike=null;
    if(!(a.fallTimer>0)&&!a.down&&!a.grabbedBy&&a.state!=='fallen'&&Math.abs(a.kx||0)+Math.abs(a.ky||0)<.5&&!b.actors.some(l=>l.bear&&l.toss&&l.toss.id===a.id)){a.x=x;a.y=y;}}
   else{if(a.pinnedBy)delete a.pinnedBy;const held=b.hasDogs&&DG().humanPre(a);if(!held)M.resolveStrike(a,dt*1.12);M.updateActor(a,dt*1.12);if(held){a.wind=0;a.pendingStrike=null;}}
   M.updateLocomotion(a,x,y,p,dt*1.12);}
  if(b.hasDogs)for(const d of b.actors)if(d.dog&&d.mode==='grip'&&d.victim){const v=b.actors.find(a=>a.id===d.victim);if(v)DG().holdOn(d,v,dt);}
  M.collisionPairs({actors:b.actors.filter(a=>!a.dog&&!a.bear&&!a.grabbedBy?.startsWith?.('hund-'))});
  // Menschen stehen nicht im Bären: der Schwerere bleibt, der Leichtere weicht
  for(const br of b.actors)if(br.bear&&!br.g.dead)for(const a of b.actors)if(!a.bear&&!a.dog&&!a.g.dead&&!a.pinnedBy&&!a.grabbedBy&&!(a.fallTimer>0)){const dx=a.x-br.x,dy=a.y-br.y,d=Math.hypot(dx,dy*1.6)||1,min=(br.r+(a.r||14))*.8;if(d<min){a.x+=dx/d*(min-d)*.5;a.y+=dy/d*(min-d)*.3;}}
  M.stepProjectiles(dt);
  if(b.hasDogs)for(const a of b.actors)if(a.dog&&a._px!=null&&a.mode!=='leap'){const jx=a.x-a._px,jy=a.y-a._py,jl=Math.hypot(jx,jy);if(jl>4){a.x=a._px+jx/jl*4;a.y=a._py+jy/jl*4;}}
  for(const a of b.actors)if(a.g.dead&&!a.death)a.death=true;
 }finally{H?.setSim?.(false);}
 H?.post?.(b,dt);
 if(b.ende)return;const L=[live(b,0).length,live(b,1).length],late=b.time-b.startTime>=K.TMAX;if(L[0]&&L[1]&&!late)return;
 b.endAt??=b.time;if(b.time-b.endAt<1)return;
 b.ende={winner:L[0]&&L[1]?-1:L[0]?0:L[1]?1:-1,at:b.time,timeout:late&&!!(L[0]&&L[1])};K.onEnd?.(b);}
K.fixed=fixed;
const inner=M.fixedStep;M.fixedStep=function(dt){const b=S.battle;if(!b?.baer)return inner.apply(this,arguments);return fixed(dt);};

// Viele Kämpfe derselben Aufstellung ohne Bild rechnen (make: liefert je Kampf eine frische Aufstellung)
K.series=function(make,n=20,maxSeconds=K.TMAX+5){const old=S.battle,R={n,wins:[0,0],draw:0,time:0,torn:0,crushed:0,grapples:0,flung:0,dragged:0,dodges:0,recoils:0,backs:0,retorts:0,deadBears:0,fled:0,ms:0},t0=performance.now();
 for(let i=0;i<n;i++){const b=K.build(make());b.time=b.startTime=0;S.battle=b;M.stains.length=0;let k=0;while(!b.ende&&k++<maxSeconds*60)fixed(1/60);
  const w=b.ende?b.ende.winner:-1;if(w<0)R.draw++;else R.wins[w]++;R.time+=b.time;for(const a of b.actors)if(a.bear){R.torn+=a.torn||0;R.crushed+=a.crushed||0;R.grapples+=a.grapples||0;R.flung+=a.flung||0;R.dragged+=a.dragged||0;R.dodges+=a.dodges||0;R.recoils+=a.recoils||0;R.backs+=a.backs||0;R.retorts+=a.retorts||0;if(a.g.dead)R.deadBears++;if(a.fled)R.fled++;}}
 R.time/=n;R.ms=performance.now()-t0;S.battle=old;return R;};
})();
