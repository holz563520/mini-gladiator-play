'use strict';
/* =====================================================================================================
   AUSSENWELT · ANFÜHRER (Testversion, 22.10.2026)
   Ab 5 kampffähigen Kämpfern wird ein Anführer gewählt. Er entdeckt Gegner meist zuerst, hält eine kurze
   Einsatzbesprechung (Fernglas, Lage mit schwarzem Humor, Befehle) und gibt im Kampf Anweisungen.
   Läuft ohne DOM (auch headless in Node): Die Oberfläche bekommt nur Ereignisse über b.events
   ({type:'lead', ...}) und Positionen/Ziele über die Rückgabewerte. Die Arena nutzt das (noch) nicht.

   Wie es an die Engine andockt (ohne sim.js zu ändern):
   · M.fixedStep wird umhüllt (nur wenn S.battle.lead aktiv ist): vor dem Schritt werden versteckte Assassinen aus
     b.actors genommen (Gegner sehen sie nicht, sie handeln nicht), nach dem Schritt wieder eingesetzt; haltende
     Soldaten und ahnungslose Gegner bleiben stehen; Fernkämpfer werden beim Plänkeln geführt; Befehle gesetzt.
   · M.worldPriority (Haken in chooseTarget) bevorzugt befohlene Ziele und meidet „erledigte“ Gegner.

   Fähigkeiten, die schon im Spiel sind und hier wirken:
   · Anführer (Führung): Taktik (45 %), Erfahrung (30 %), Willenskraft (15 %), Moral (10 %); Eigenschaften Taktiker,
     Diszipliniert, Gelassen, Mutig (+) / Feige, Berserker, Egoistisch, Blutrünstig (−); Ruhm/Siege geben etwas Autorität.
     → wie oft er die Lage prüft, ob er eine Gefahr bemerkt, wie schnell er ruft, ob er Gegner vorher entdeckt
       (dazu Reflexe), wie genau die Einschätzung in der Besprechung ist.
   · Befolgen (jeder Kämpfer): Teamgeist (Hauptwert), Reflexe (bei Warnungen), Taktik; Eigenschaften Diszipliniert,
     Teamspieler, Loyal (+) / Egoistisch, Berserker, Blutrünstig (−) → wie schnell und ob er einen Befehl umsetzt.
   ===================================================================================================== */
(()=>{
const M=window.MG,S=M.s,D=window.Debt;
const L=window.DebtLeader={};M.outsideLeader=L;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,hyp=Math.hypot,rnd=(a,b)=>a+Math.random()*(b-a),pick=l=>l[Math.floor(Math.random()*l.length)];
const first=g=>String(g?.name||'').split(' ')[0];
const dist=(a,b)=>hyp(a.x-b.x,a.y-b.y),ang=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const adiff=(x,y)=>{let d=(y-x)%(2*Math.PI);if(d>Math.PI)d-=2*Math.PI;if(d<-Math.PI)d+=2*Math.PI;return d;};
const names=list=>{const n=list.map(a=>first(a.g||a));return n.length<2?n.join(''):n.slice(0,-1).join(', ')+' und '+n[n.length-1];};
const fill=(t,o)=>t.replace(/\{(\w+)\}/g,(_,k)=>o[k]??'');

// ---------- Zahlen ----------
L.CFG={
 minParty:5,        // ab so vielen kampffähigen Kämpfern gibt es einen Anführer
 groupMax:6,        // so viele Gegner einer Begegnung stehen zusammen (Rest kommt als Nachschub)
 haltDist:1000,      // so weit vor der Gruppe bleibt die Truppe stehen, wenn sie die Gegner entdeckt (größer = mehr Zeit für Taktik)
 noticeDist:240,    // ahnungslose Gegner merken etwas, wenn einer von uns so nah kommt
 alertAfter:12,      // spätestens nach so vielen Sekunden hören sie die Truppe
 holdRelease:160,   // haltende Soldaten lösen sich, wenn ein Gegner so nah ist
 holdMax:11,        // oder spätestens so viele Sekunden nach dem Alarm
 hideMax:22,        // Assassinen warten höchstens so lange nach dem Alarm
 sayGap:1.5,        // Mindestabstand zwischen zwei Rufen (Spielsekunden), Warnungen ausgenommen
 orderTime:6,       // so lange gilt ein Zielbefehl
 skirmishRun:1.4,   // Fernkämpfer laufen beim Plänkeln so viel schneller als ihr normales Kampftempo
 gripSave:.9,       // so oft warnt der Anführer rechtzeitig vor dem Griff von hinten (der Gewarnte schlägt ihn mit dem Ellbogen weg)
 gripElbow:.42      // Sekunden nach dem Ansetzen des Griffs kommt der Ellbogen
};

// ---------- Fähigkeiten ----------
const has=(g,t)=>(g.traits||[]).includes(t);
L.SKILLS={
 leader:[['tactics','Taktik',.45],['experience','Erfahrung',.30],['will','Willenskraft',.15],['morale','Moral',.10]],
 leaderTraits:{Taktiker:12,Diszipliniert:5,Gelassen:5,Mutig:3,Feige:-10,Berserker:-8,Egoistisch:-6,'Blutrünstig':-4},
 follow:[['teamwork','Teamgeist'],['reflex','Reflexe'],['tactics','Taktik']],
 followTraits:{Diszipliniert:'+',Teamspieler:'+',Loyal:'+',Egoistisch:'−',Berserker:'−','Blutrünstig':'−'}
};
// Führungswert 0–100 und was daraus folgt
L.quality=function(g){const st=g.stats||{};let v=0;for(const [k,,w] of L.SKILLS.leader)v+=(st[k]||0)*w;
 for(const [t,b] of Object.entries(L.SKILLS.leaderTraits))if(has(g,t))v+=b;v+=Math.min(8,(g.wins||0)*.5+(g.fame||0)/40);v=clamp(v,1,100);
 const spot=clamp(.5+((st.tactics||0)*.4+(st.experience||0)*.4+(st.reflex||0)*.2)*.0065,.5,.95);
 return {lead:Math.round(v),scan:clamp(1.35-v*.011,.35,1.35),notice:clamp(.4+v*.0065,.4,.97),spot,react:clamp(.75-v*.005,.2,.75),sharp:v};};
// Befolgen: Reaktionszeit (s) und Gehorsam (0–1)
L.follow=function(g,kind='order'){const st=g.stats||{};
 let react=1.55-(st.teamwork||0)*.009-(st.tactics||0)*.003-(kind==='warn'?(st.reflex||0)*.008:(st.reflex||0)*.002);
 let obey=.58+(st.teamwork||0)*.004;
 if(has(g,'Diszipliniert')){react-=.2;obey+=.15;}if(has(g,'Teamspieler')){react-=.15;obey+=.1;}if(has(g,'Loyal')){react-=.08;obey+=.08;}
 if(has(g,'Egoistisch')){react+=.35;obey-=.22;}if(has(g,'Berserker')){react+=.25;obey-=.15;}
 if(kind==='leave'&&has(g,'Blutrünstig'))obey-=.3;if(kind==='warn')obey=Math.max(obey,.9);
 return {react:clamp(react,.18,1.6),obey:clamp(obey,.25,.98)};};
L.leaderScore=g=>L.quality(g).lead+(M.health?M.health(g)/20:0);
L.pickLeader=party=>{const live=party.filter(g=>D.fit(g));if(live.length<L.CFG.minParty)return null;return live.slice().sort((a,b)=>L.leaderScore(b)-L.leaderScore(a))[0];};
L.eligible=party=>party.filter(g=>D.fit(g)).length>=L.CFG.minParty;

// ---------- Hilfen ----------
const fit=a=>a&&!a.down&&!a.g.dead&&!a.surrendered;
const isRanged=a=>{const w=M.gear(a.g,'weapon');return !!w&&['bow','crossbow'].includes(w.def)&&a.ammo>0;};
const role=a=>a.g.role;
const party=b=>b.actors.filter(a=>a.team===0);
const foes=b=>b.actors.filter(a=>a.team===1&&fit(a));
function lowThreat(e){if(!fit(e))return true;if(M.harmless?.(e))return true;const ls=M.limbState?.(e.g),hp=M.health(e.g);
 return hp<26||e.g.blood<34||(ls&&(ls.lostLeg||Math.max(ls.left,ls.right)<.3))||(e.kneeTimer>0&&hp<40);}
L.lowThreat=lowThreat;
const say=(b,a,text,kind,o={})=>{const ld=b.lead;if(!a)return;ld.lastSay=b.time;ld.stats.calls++;b.events.push({type:'lead',actor:a,text,kind,leader:a.id===ld.leaderId,...o});};
const leaderActor=b=>b.actors.find(a=>a.id===b.lead?.leaderId);
// Befehle mit Verzögerung (Spielzeit): erst ruft der Anführer, dann setzt der Kämpfer um
const later=(b,delay,fn)=>b.lead.pending.push({at:b.time+delay,fn});
function order(b,a,target,o={}){if(!fit(a)||!target)return;a.leadOrder={target:target.id,avoid:o.avoid?.id||null,until:b.time+(o.time||L.CFG.orderTime)};a.target=target.id;a.decision=0;a.engagedUntil=0;}

// ---------- Aufbau ----------
// b: Abschnitt (D.startSection). Anführer wird für die ganze Mission gemerkt (m.leaderId), damit er über Abschnitte gleich bleibt.
L.attach=function(b,m,o={}){const live=m.party.filter(g=>D.fit(g));if(o.off||live.length<L.CFG.minParty){b.lead=null;return null;}
 let g=live.find(x=>x.id===m.leaderId);if(!g){g=(o.leaderId&&live.find(x=>x.id===o.leaderId))||L.pickLeader(m.party);m.leaderId=g.id;}
 const q=L.quality(g);b.lead={on:true,leaderId:g.id,q,phase:'idle',pending:[],cd:{},lastSay:-9,nextScan:0,hidden:[],holds:new Map(),unaware:new Set(),alert:false,stats:m.leadStats??={calls:0,spotted:0,surprised:0,warnings:0,helps:0,switches:0,ignored:0,ambushHits:0,successions:0}};
 b.leaders=[g.id,b.leaders?.[1]??null];return b.lead;};
L.active=b=>!!b?.lead?.on;

// ---------- Entdecken ----------
L.spotRoll=function(b,st){const g=leaderActor(b)?.g;if(!g)return false;let p=b.lead.q.spot;if(st.kind==='ambush')p*=.45;else if(st.kind==='door')p*=.85;return Math.random()<p;};

// ---------- Gegnergruppe aufstellen (alle Gegner einer Begegnung stehen zusammen vor der Truppe) ----------
// so viele stehen zusammen: im Spiel so viele, wie die Schwierigkeit gleichzeitig angreifen lässt (m.maxActive), sonst nach Gruppengröße
L.groupSize=(b,m,sti)=>Math.min(m.queues[sti].length,m.maxActive?Math.max(2,m.maxActive):clamp(2+Math.floor(m.party.filter(D.fit).length*.5),2,L.CFG.groupMax));
L.layoutGroup=function(b,m,sti){const st=m.place.stations[sti],W=b.width,mx=D.marginX(W);
 const ex=clamp(st.fx+140,mx+L.CFG.haltDist+120,W-mx-70),ey=D.pathY(b.L,ex);return {ex,ey,hx:Math.max(mx+90,ex-L.CFG.haltDist)};};
// Begegnung mit entdeckter Gruppe beginnen: Gegner stehen ahnungslos beisammen. unaware=false: Sie merken es sofort (ohne Anführer).
L.beginGroup=function(b,m,sti,o={}){const G=L.layoutGroup(b,m,sti),n=L.groupSize(b,m,sti);
 const firstA=D.beginEncounter(b,m,sti);b.events.length=0;
 while(b.encEnemies.length<n&&b.queue.length)D.spawn(b,{instant:true,quiet:true,pos:{x:G.ex,y:G.ey}});
 const k=b.encEnemies.length,rows=Math.ceil(k/2);
 b.encEnemies.forEach((e,i)=>{const col=i%2,row=Math.floor(i/2);let x=G.ex+col*55+(Math.random()-.5)*24,y=G.ey+(row-(rows-1)/2)*62+(col?24:0)+(Math.random()-.5)*16;
  y=clamp(y,b.L.mT+30,b.L.mB-24);for(let t=0;t<10&&!D.navFreeAt(b,x,y);t++)y+=(t%2?1:-1)*t*14;e.x=x;e.y=y;e.a=Math.PI+(Math.random()-.5)*1.6;e.cool=.8;});
 if(b.lead&&o.unaware!==false){for(const e of b.encEnemies)b.lead.unaware.add(e.id);b.lead.alert=false;}
 b.group=G;void firstA;return G;};

// ---------- Einsatzbesprechung: Lage ----------
const WJ={club:['Ein Knüppel. Vermutlich vom Zaun seiner Schwiegermutter.','Knüppel. Primitiv. Aber Kopfweh ist Kopfweh.'],
 trident:['Ein Dreizack. Entweder Fischer oder größenwahnsinnig.','Dreizack. Drei Löcher zum Preis von einem.'],
 axe:['Eine Axt. Sonst hackt er Holz. Heute hackt er uns.','Axt. Nicht mit dem Arm blocken, außer ihr wollt ihn loswerden.'],
 spear:['Ein Speer. Langer Arm, kurzer Verstand. Nicht frontal reinlaufen.','Speer. Der hält euch auf Abstand. Also: näher ran.'],
 short:['Kurz wie seine Lebenserwartung.','Billig, aber spitz.'],
 hammer:['Ein Hammer. Wenn der trifft, sind wir einen Kopf kürzer. Also nicht treffen lassen.','Hammer. Langsam. Aber endgültig.'],
 mace:['Streitkolben. Macht aus Helmen Suppenschüsseln.','Ein Kolben mit Stacheln. Der hat Gefühle, aber keine Hemmungen.'],
 gladius:['Ein Gladius. Hat er bestimmt einem Toten abgenommen. Vielleicht wird er heute selbst einer.','Gladius. Der weiß, wo vorne ist.'],
 long:['Langschwert. Der hält sich für was Besseres.','Langschwert. Reichweite. Schilde hoch, wenn er ausholt.'],
 greatsword:['Ein Zweihänder. Groß, langsam, tödlich. Wie meine Schwiegermutter.','Zweihänder. Wenn der ausholt, ist Zeit für ein Gebet. Ein kurzes.'],
 doubleaxe:['Doppelaxt. Zwei Seiten, beide schlecht für uns.'],halberd:['Hellebarde. Der Mann hat Ambitionen.'],
 dagger:['Ein Dolch. Der sticht von hinten. Lasst ihn nicht aus den Augen.'],javelin:['Wurfspeere. Duckt euch, wenn er wirft.'],throwaxe:['Wurfäxte. Der wirft mit Werkzeug. Respektlos.'],
 net:['Ein Netz. Der will uns fangen wie Fische. Wir beißen.'],bow:['Ein Bogen. Der schießt. Den will ich zuerst am Boden sehen.'],crossbow:['Armbrust. Ein Schuss, dann lädt er ewig. Dann ist er dran.']};
function weaponLine(g,sharp){const w=g.enemyGear?.weapon||M.gear(g,'weapon');if(!w)return 'Unbewaffnet. Der will reden. Wir nicht.';
 if(sharp<28&&Math.random()<.6)return pick(['Der hat … irgendwas in der Hand. Spitz oder stumpf, eins von beiden.','Irgendeine Waffe. Ich seh schlecht ohne Brille. Wir haben keine Brillen.']);
 const nm=M.itemName(w);return nm+'. '+pick(WJ[w.def]||['Irgendwas Scharfes. Reicht auch.']);}
function armorLine(g,sharp){const e=g.enemyGear||{},ar=e.armor||{},parts=Object.keys(ar).filter(k=>ar[k]);
 if(sharp<35&&Math.random()<.5)return '';
 const sh=e.shield?' Mit Schild. Den müsst ihr aufmachen wie eine Auster.':'';
 if(!parts.length)return 'Keine Rüstung. Nur Hemd und Hoffnung.'+sh;
 if(parts.includes('chestplate')&&parts.includes('helm'))return 'Helm und Brustpanzer. Zielt auf Arme und Beine.'+sh;
 if(parts.includes('chestplate'))return 'Brustpanzer. Dann eben in die Beine.'+sh;
 if(parts.includes('helm'))return 'Ein Helm. Schützt den Kopf, den er nicht benutzt.'+sh;
 return 'Ein bisschen Leder. Hält Regen ab, keine Klingen.'+sh;}
function powerOf(g){const st=g.stats||{},k=['strength','agility','reflex','block','experience','toughness'];return k.reduce((s,x)=>s+(st[x]||0),0)/k.length;}
// Zeilen für die Besprechung: [{focus:actor|null, text}]
L.briefLines=function(b){const ld=b.lead,me=leaderActor(b),E=b.encEnemies.filter(fit),P=party(b).filter(fit),sharp=ld.q.sharp,out=[];
 const avgP=P.reduce((s,a)=>s+powerOf(a.g),0)/Math.max(1,P.length);
 out.push({focus:null,text:fill(pick(['Halt. Runter. Da vorn sind {n}.','Stopp! Köpfe runter. Ich zähl {n} Stück.','Wartet. Da vorn steht das Abendessen der Krähen. {n} Portionen.','Leise. Da vorn. {n} Mann, und keiner hat uns gesehen. Noch nicht.']),{n:E.length})});
 const boss=E.find(e=>e.g.debtBoss);
 const shown=E.filter(e=>e!==boss).slice(0,sharp>=55?4:sharp>=35?3:2);
 for(const e of shown){const g=e.g,rel=powerOf(g)/Math.max(1,avgP);
  let t=first(g)+': '+weaponLine(g,sharp);const arm=armorLine(g,sharp);if(arm)t+=' '+arm;
  if(sharp>=40){if(rel>1.15)t+=' Der ist gefährlich. Den nehmen zwei von uns.';else if(rel<.7)t+=' Den pustet der Wind um. Nicht lachen, er merkt das.';}
  out.push({focus:e,text:t});}
 const rest=E.length-shown.length-(boss?1:0);if(rest>0)out.push({focus:null,text:rest===1?'Und noch einer. Sieht aus wie die anderen, nur hässlicher.':'Und noch '+rest+' mehr vom selben Kaliber. Kanonenfutter. Ohne Kanonen.'});
 if(boss)out.push({focus:boss,text:'Und der Große da hinten, '+first(boss.g)+', das ist ihr Anführer. '+weaponLine(boss.g,sharp)+' Den heben wir uns auf. Wie Nachtisch.'});
 out.push({focus:null,text:E.length>P.length?'Die sind mehr als wir. Gut. Dann trifft man leichter.':E.length===P.length?'Gleich viele. Fair ist langweilig, also machen wir es unfair.':'Wir sind mehr. Das ist nicht feige, das ist Planung.'});
 void me;return out;};

// ---------- Einsatzbesprechung: Plan und Befehle ----------
// Liefert Zielpunkte je Kämpfer und die Sätze des Anführers. Positionen werden von der Oberfläche abgelaufen (headless: gesetzt).
L.plan=function(b){const ld=b.lead,G=b.group,P=party(b).filter(fit),W=b.width,mT=b.L.mT,mB=b.L.mB;
 const sold=P.filter(a=>role(a)==='Soldat'&&!isRanged(a)),assa=P.filter(a=>role(a)==='Assassine'&&!isRanged(a)),arch=P.filter(isRanged),other=P.filter(a=>!sold.includes(a)&&!assa.includes(a)&&!arch.includes(a));
 const line=[...sold,...other],lx=G.hx+40,pts=new Map(),lines=[];
 line.forEach((a,i)=>{const y=clamp(G.ey+(i-(line.length-1)/2)*54,mT+30,mB-24);pts.set(a,{x:lx+(i%2?-10:0),y,face:0,job:'line'});ld.holds.set(a.id,{x:lx,y});});
 const half=Math.max(60,(line.length-1)/2*54);
 // Fernkämpfer: nur ein Stück vor die Linie (gerade in Schussweite), beim Anrücken zurück hinter die Schilde, dann außen herum
 arch.forEach((a,i)=>{const rg=M.effective?.(a)?.range||330,x=Math.max(lx+100,G.ex-rg*.9),y=clamp(G.ey+(i-(arch.length-1)/2)*70,mT+30,mB-24);
  pts.set(a,{x,y,face:0,job:'skirmish'});a.leadSkirmish={mode:'fwd',side:y>=G.ey?1:-1};});
 // Assassinen: seitlich verstecken (abwechselnd oben/unten), zwischen Linie und Gegnern
 assa.forEach((a,i)=>{const side=i%2?1:-1,x=(lx+G.ex)/2-30+(Math.floor(i/2))*40;let y=clamp(G.ey+side*(half+150),mT+40,mB-30);
  for(let t=0;t<12&&!D.navFreeAt(b,x,y);t++)y-=side*14;pts.set(a,{x,y,face:0,job:'hide'});a.leadHide={x,y,side};});
 if(line.length)lines.push({actor:'L',text:fill(pick(['{N}: Schilde nach vorn, ihr seid die Mauer. Mauern laufen nicht weg. Auch nicht, wenn sie weinen.','{N}: Aufstellen, Schulter an Schulter. Wer zurückweicht, kriegt meinen Stiefel.','{N}: Ihr steht. Ihr haltet. Wenn nötig, sterbt ihr im Stehen. Sieht besser aus.']),{N:names(line)}),job:'line'});
 if(assa.length)lines.push({actor:'L',text:fill(pick(['{N}: Ab an den Rand, ins Gebüsch. Ihr seid Luft. Wenn die an unseren Schilden kleben, kommt ihr von hinten.','{N}: Versteckt euch seitlich. Erst wenn ich JETZT schreie. Nicht vorher. Auch nicht, wenn es juckt.']),{N:names(assa)}),job:'hide'});
 if(arch.length)lines.push({actor:'L',text:fill(pick(['{N}: Nach vorn, anfüttern. Schießen, wegrennen, schießen. Lockt sie zu unseren Schilden.','{N}: Ihr plänkelt. Ein Pfeil, dann Beine in die Hand. Wenn sie bei uns sind, außen rum.']),{N:names(arch)}),job:'skirmish'});
 lines.push({actor:'L',text:pick(['Fragen? Keine? Gut. Ich hätte eh keine Antworten.','Wer stirbt, ist selber schuld. Los.','Und denkt dran: Wir sind die Guten. Glaube ich.','Wenn das schiefgeht, war es eure Idee.'])});
 ld.planned={sold:line.map(a=>a.id),assa:assa.map(a=>a.id),arch:arch.map(a=>a.id)};return {pts,lines};};
// Kampf beginnt nach der Besprechung: Assassinen verschwinden, Soldaten halten, Gegner ahnungslos
L.engage=function(b){const ld=b.lead;if(!ld)return;ld.phase='fight';ld.fightAt=b.time;ld.hidden=party(b).filter(a=>a.leadHide&&fit(a)).map(a=>a.id);
 // in Deckung: knien (die Engine bewegt Versteckte nicht, der Knie-Zähler läuft also nicht ab) und Zweige vor sich halten
 for(const a of party(b))if(a.leadHide&&!a.leadCover)L.hideOne(b,a);
 for(const e of foes(b))e.leadHits=e.hitsTaken||0;};
L.hideOne=function(b,a){if(a.leadCover||!fit(a))return;const c={type:'sprite',hp:0,r:0,x:a.x+9,y:a.y+5,leadCover:true,sid:-1,seed:Math.random()*6};D.addObstacles(b,[c]);a.leadCover=c;a.kneeDuration=999;a.kneeTimer=500;a.kneeRise=1;a.a=0;a.state='idle';a.moveSpeed=0;a.gaitSpeed=0;};
// Überraschung (nicht entdeckt): kein Plan, nur schnelle Rufe
L.surprise=function(b){const ld=b.lead;if(!ld)return;ld.phase='fight';ld.fightAt=b.time;ld.alert=true;ld.alertAt=b.time;ld.stats.surprised++;const me=leaderActor(b);
 if(me)say(b,me,pick(['Hinterhalt! Zusammenrücken!','Verdammt, die waren schneller! Rücken an Rücken!','Überfall! Schilde raus, Augen auf!']),'surprise',{urgent:true});
 let k=0;for(const a of party(b))if(isRanged(a)){a.leadSkirmish={mode:'fwd',side:k++%2?1:-1};toRally(b,a);}};

// ---------- Engine-Haken ----------
const prevPrio=M.worldPriority;
M.worldPriority=function(a,t){let v=prevPrio?prevPrio.apply(this,arguments)||0:0;const o=a.leadOrder;
 if(o&&S.battle?.lead&&o.until>S.battle.time){if(t.id===o.target)v+=900;if(t.id===o.avoid)v-=420;}
 if(a.team===0&&S.battle?.lead&&lowThreat(t)&&S.battle.lead.q.sharp>30)v-=60;return v;};
const prevStep=M.fixedStep;
M.fixedStep=function(dt){const b=S.battle;if(!b?.lead?.on||b.paused||!(b.started||b.lead.arena)||b.done||b.result)return prevStep.apply(this,arguments);
 if(b.lead.arena&&!(b.lead.unaware instanceof Set))L.repairArena(b);
 const ld=b.lead,keep=[];
 // ahnungslose Gegner und haltende Soldaten bleiben stehen; versteckte Assassinen sind nicht auf dem Feld
 for(const a of b.actors){if(ld.unaware.has(a.id)||(a.team===0&&holding(b,a)))keep.push([a,a.x,a.y,a.a]);}
 const ctl=party(b).filter(a=>steered(a)).map(a=>[a,a.x,a.y]),rtr=party(b).filter(a=>a.leadRetreat&&fit(a)&&!a.grabbedBy&&!a.rearFinish&&!(a.fallTimer>0)&&!(a.kneeTimer>0)&&a.state!=='dodge').map(a=>[a,a.x,a.y]);
 const hid=ld.hidden.length?b.actors.filter(a=>ld.hidden.includes(a.id)):[];
 if(hid.length){if(party(b).filter(a=>fit(a)&&!ld.hidden.includes(a.id)).length===0)release(b,'alone');else b.actors=b.actors.filter(a=>!ld.hidden.includes(a.id));}
 let r;try{r=prevStep.apply(this,arguments);}finally{for(const a of hid)if(!b.actors.includes(a))b.actors.push(a);}
 for(const [a,x,y,an] of keep){if(!fit(a))continue;if(a.state==='dodge'&&a.team===0)continue;a.x=x;a.y=y;a.kx=0;a.ky=0;a.detour=null;a.stuck={x,y,t:b.time};a.moveSpeed=0;if(a.state==='move'||a.state==='charge')a.state='idle';a.chargeTimer=0;
  if(a.team===1)a.a=an;else{const f=nearest(a,foes(b));if(f)a.a=ang(a,f);}}
 for(const a of hid){a.detour=null;a.stuck={x:a.x,y:a.y,t:b.time};a.state='idle';a.moveSpeed=0;a.wind=0;}
 for(const [a,x,y] of ctl)steer(b,a,x,y,dt);
 for(const [a,x,y] of rtr)retreatStep(b,a,x,y,dt);
 gripGuard(b);
 if(!b.done&&!b.paused)think(b,dt);return r;};
// ---------- Griff von hinten: Warnung und Ellbogen ----------
// Setzt ein Gegner bei einem von uns den Griff von hinten an, brüllt der Anführer in 90 % der Fälle „Name, pass auf deinen Rücken!“.
// Der Gewarnte schlägt den Griff mit dem Ellbogen weg: Der Angreifer taumelt mit schmerzendem Gesicht zurück, der Gewarnte dreht sich zu ihm.
// In den übrigen 10 % (oder ohne kampffähigen Anführer) läuft der Griff wie in der Engine.
function gripGuard(b){const ld=b.lead;
 for(const v of party(b)){if(!v.grabbedBy||v.g.dead)continue;const a=b.actors.find(x=>x.id===v.grabbedBy);if(!a?.rearFinish||a.rearFinish.target!==v.id)continue;
  const f=a.rearFinish;if(f.leadSeen)continue;f.leadSeen=true;const me=leaderActor(b);if(!fit(me))continue;
  ld.stats.grips=(ld.stats.grips||0)+1;if(Math.random()>L.CFG.gripSave)continue;ld.stats.gripsSaved=(ld.stats.gripsSaved||0)+1;
  f.left=Math.max(f.left,L.CFG.gripElbow+.25);// der Schnitt kommt sicher erst nach dem Ellbogen
  const self=me===v;say(b,me,self?pick(['Nicht mit mir, Freundchen!','Hinter mir?! Falsche Idee!']):fill(pick(['{V}, PASS AUF DEINEN RÜCKEN!','{V}! RÜCKEN! Ellbogen!','{V}, hinter dir! Der will an deinen Hals!']),{V:first(v.g)}),'gripWarn',{urgent:true,subject:v.id,foe:a.id});
  b.events.push({type:'gripWarn',actor:v,foe:a});
  later(b,L.CFG.gripElbow,()=>elbow(b,v,a));}}
function elbow(b,v,a){if(v.grabbedBy!==a.id||!a.rearFinish||v.g.dead||a.g.dead)return;
 delete v.grabbedBy;a.rearFinish=null;const an=ang(v,a);
 v.state='idle';v.a=an;v.guardTime=.7;v.wind=0;v.cool=Math.max(0,Math.min(v.cool||0,.25));
 a.state='stagger';a.stagger=.85;a.staggerMax=.85;a.staggerDir=an;a.staggerSeed=Math.random()*6;a.stun=Math.max(a.stun||0,.55);a.wind=0;a.swing=0;a.pendingStrike=null;
 a.kx=(a.kx||0)+Math.cos(an)*70;a.ky=(a.ky||0)+Math.sin(an)*70;a.cool=Math.max(a.cool||0,1.4);a.rearFinishCD=Math.max(a.rearFinishCD||0,6);
 const h=a.g.body.head;if(h&&!h.missing){h.hp=Math.max(1,h.hp-4);h.pain=Math.min(100,(h.pain||0)+25);}a.facePain=1.4;a.hit=.23;a.daze=Math.min(1,(a.daze||0)+.25);
 M.emit?.(a.x,a.y-62,5,'#a14337',55);M.sound?.('hit');M.learn?.(v,'stats','reflex',.02);
 order(b,v,a,{time:4});b.events.push({type:'elbow',actor:v,foe:a});}
// ---------- Plänkeln: Fernkämpfer werden geführt ----------
// fwd: kurz vor der Linie stehen und schießen · back: zurück hinter die Schilde laufen · wait: dort stehen und schießen
// flank: seitlich an den Nahkampf heranlaufen · shoot: dort stehen und schießen · free: Engine (Gegner zu nah, Nahkampf)
const RUN={back:1,flank:1},STAND={fwd:1,wait:1,shoot:1};
function steered(a){const s=a.leadSkirmish;return !!s&&s.mode!=='free'&&fit(a)&&isRanged(a)&&!a.grabbedBy&&!a.rearFinish&&!(a.fallTimer>0)&&!(a.kneeTimer>0)&&!(a.stun>0)&&!(a.stagger>0)&&a.state!=='dodge';}
function runSpeed(a){const ef=M.effective?.(a);return clamp((ef?.speed||80)*L.CFG.skirmishRun,60,180);}
function steer(b,a,x,y,dt){const s=a.leadSkirmish;if(!s||!fit(a))return;
 if(STAND[s.mode]){if(a.state==='dodge')return;a.x=x;a.y=y;a.kx=0;a.ky=0;a.detour=null;a.stuck={x,y,t:b.time};a.moveSpeed=0;if(a.state==='move'||a.state==='charge')a.state='idle';const f=nearest(a,foes(b));if(f)a.a=ang(a,f);return;}
 if(!RUN[s.mode]||!s.goal)return;const gx=s.goal.x,gy=s.goal.y,d=hyp(gx-x,gy-y),step=Math.min(d,runSpeed(a)*dt*(M.combatStepRate||1));
 if(d<14){a.x=gx;a.y=gy;s.mode=s.mode==='back'?'wait':'shoot';s.at=b.time;a.moveSpeed=0;a.state='idle';return;}
 a.x=x+(gx-x)/d*step;a.y=y+(gy-y)/d*step;a.kx=0;a.ky=0;a.detour=null;a.stuck={x:a.x,y:a.y,t:b.time};a.a=Math.atan2(gy-y,gx-x);a.state='move';if(M.updateLocomotion)M.updateLocomotion(a,x,y,a.phase||0,dt*(M.combatStepRate||1));else{a.moveSpeed=runSpeed(a);a.odo=(a.odo||0)+step;a.phase=a.odo*.267;}
 a.wind=0;a.cool=Math.max(a.cool||0,.2);}
function spotNear(b,x,y,side){const mT=b.L.mT+30,mB=b.L.mB-24;for(let k=0;k<14;k++){const yy=clamp(y-side*k*16,mT,mB);if(D.navFreeAt(b,x,yy))return {x,y:yy};}return {x,y:clamp(y,mT,mB)};}
// Sammelpunkt hinter den Schilden (seitlich versetzt), Flankenpunkt seitlich vom Nahkampf
function toRally(b,a){const s=a.leadSkirmish,sold=party(b).filter(x=>fit(x)&&role(x)==='Soldat'&&!b.lead.hidden.includes(x.id));
 const c=sold.length?{x:sold.reduce((t,x)=>t+x.x,0)/sold.length,y:sold.reduce((t,x)=>t+x.y,0)/sold.length}:{x:a.x-160,y:a.y};
 const spread=sold.length?Math.max(...sold.map(x=>Math.abs(x.y-c.y))):0;s.goal=spotNear(b,Math.min(c.x-90,a.x-40),c.y+s.side*Math.min(spread+20,120),-s.side);s.mode='back';}
function toFlank(b,a,eng){const s=a.leadSkirmish,c={x:eng.reduce((t,x)=>t+x.x,0)/eng.length,y:eng.reduce((t,x)=>t+x.y,0)/eng.length};
 let side=s.side,y=c.y+side*215;if(y<b.L.mT+40||y>b.L.mB-30){side=-side;y=c.y+side*215;}s.side=side;s.goal=spotNear(b,c.x-30,y,side);s.mode='flank';}
function nearest(a,l){let m=null,d=1e9;for(const o of l){const k=dist(a,o);if(k<d){d=k;m=o;}}return m;}
function holding(b,a){const ld=b.lead,h=ld.holds.get(a.id);if(!h||!fit(a))return false;
 if(ld.alert){const f=nearest(a,foes(b).filter(e=>!ld.unaware.has(e.id)));if((f&&dist(a,f)<L.CFG.holdRelease)||b.time-ld.alertAt>L.CFG.holdMax||a.hit>0){ld.holds.delete(a.id);return false;}}
 return true;}
function alert(b,why){const ld=b.lead;if(ld.alert)return;ld.alert=true;ld.alertAt=b.time;ld.unaware.clear();
 const E=foes(b),e=why.e||E[0];if(e)b.events.push({type:'lead',actor:e,text:why.kind==='shot'?pick(['Da! Die schießen auf uns!','AU! Wer war das?!','Pfeile! Da drüben sind sie!']):pick(['Da! Da sind welche!','Angriff! Die schleichen hier rum!','HEY! Ihr da!']),kind:'foeAlert'});
 const me=leaderActor(b);if(me&&fit(me))later(b,.5,()=>say(b,me,pick(['Sie kommen! Haltet die Linie!','Jetzt kommen sie! Schilde hoch!','Da sind sie! Lockt sie zu uns!']),'alert'));}
function release(b,why){const ld=b.lead;if(!ld.hidden.length)return;const hid=b.actors.filter(a=>ld.hidden.includes(a.id));ld.hidden=[];
 const me=leaderActor(b),E=foes(b);
 if(me&&fit(me)&&why!=='seen')say(b,me,fill(pick(['JETZT! {N}, in den Rücken!','{N}! Jetzt! Von hinten rein!','Assassinen! JETZT!']),{N:names(hid)}),'release',{urgent:true});
 for(const a of hid){if(!b.actors.includes(a))b.actors.push(a);a.kneeTimer=0;a.kneeDuration=0;if(a.leadCover){a.leadCover.dropped=b.time;a.leadCover.x=a.x+14;}const f=L.follow(a.g),eng=E.filter(e=>{const t=b.actors.find(x=>x.id===e.target);return t&&t.team===0&&dist(e,t)<90;}),tg=nearest(a,eng.length?eng:E);
  a.warCry=3.5;if(why==='seen'){if(tg)order(b,a,tg);continue;}later(b,f.react*.7,()=>{if(tg&&fit(tg))order(b,a,tg,{time:8});a.leadRelease=b.time;});}
 if(hid.length)b.events.push({type:'assassinCharge',actors:hid,why});}

// ---------- Anweisungen im Kampf ----------
function cool(b,key,s){const c=b.lead.cd;if((c[key]||-1e9)>b.time)return false;c[key]=b.time+s;return true;}
function think(b,dt){const ld=b.lead;
 // fällige Umsetzungen
 if(ld.pending.length){const now=b.time,due=ld.pending.filter(p=>p.at<=now);ld.pending=ld.pending.filter(p=>p.at>now);for(const p of due){try{p.fn();}catch(e){console.warn(e);}}}
 // Kriegsgeschrei der Assassinen (Waffe hoch) endet beim ersten Schlag oder nach 3,5 s
 for(const a of party(b))if(a.warCry>0){a.warCry-=dt;const t=b.actors.find(x=>x.id===a.target);if(a.wind>0||a.swing>0||!fit(a)||(t&&dist(a,t)<55))a.warCry=0;}
 // Zielbefehle durchsetzen (die Engine wählt sonst manchmal den Liegenden, der gerade am Boden zappelt)
 for(const a of party(b)){const o=a.leadOrder;if(!o)continue;if(o.until<b.time||!fit(a)){a.leadOrder=null;continue;}const t=b.actors.find(x=>x.id===o.target);if(!fit(t)){a.leadOrder=null;continue;}if(a.target!==t.id&&!(a.rearFinish||a.grabbedBy)){a.target=t.id;a.decision=Math.max(a.decision||0,.4);}}
 // Alarm der ahnungslosen Gegner
 if(!ld.alert&&ld.phase==='fight'){const E=b.actors.filter(e=>ld.unaware.has(e.id));
  for(const e of E){if((e.hitsTaken||0)>(e.leadHits||0)||e.hit>0){alert(b,{kind:'shot',e});ld.stats.ambushHits++;break;}
   const near=party(b).find(a=>fit(a)&&!ld.hidden.includes(a.id)&&dist(a,e)<L.CFG.noticeDist);if(near){alert(b,{kind:'seen',e});break;}}
  if(!ld.alert&&b.time-ld.fightAt>L.CFG.alertAfter)alert(b,{kind:'heard'});}
 // Anführer da? Sonst übernimmt der Nächste
 let me=leaderActor(b);
 if(!fit(me)){if(!ld.succT){ld.succT=b.time+1.4;}else if(b.time>=ld.succT){ld.succT=0;const live=party(b).filter(a=>fit(a)&&!ld.hidden.includes(a.id));const ng=live.map(a=>a.g).sort((x,y)=>L.leaderScore(y)-L.leaderScore(x))[0];
   if(ng){const old=me;ld.leaderId=ng.id;ld.q=L.quality(ng);b.mission&&(b.mission.leaderId=ng.id);b.leaders[0]=ng.id;ld.stats.successions++;me=leaderActor(b);say(b,me,fill(pick(['{L} ist gefallen! Ich übernehme! Hört auf mich!','{L} liegt! Ab jetzt hört ihr auf mich!','Ohne {L} mach ich das jetzt. Keine Widerrede!']),{L:first(old?.g)}),'succession',{urgent:true});}}
  return;}
 // versteckte Assassinen: Einsatz, wenn die Gegner an den Soldaten kleben (oder es eng wird / sie entdeckt werden)
 if(ld.hidden.length&&ld.alert){const E=foes(b),hid=b.actors.filter(a=>ld.hidden.includes(a.id));
  const engaged=E.some(e=>{const t=b.actors.find(x=>x.id===e.target);return t&&t.team===0&&dist(e,t)<80&&!ld.hidden.includes(t.id);});
  const seen=hid.some(a=>E.some(e=>dist(a,e)<70));const vis=party(b).filter(a=>fit(a)&&!ld.hidden.includes(a.id)).length;
  if(seen){release(b,'seen');}else if(engaged&&b.time-ld.alertAt>1.2)release(b,'go');else if(vis<=1||b.time-ld.alertAt>L.CFG.hideMax)release(b,'late');}
 // Fernkämpfer beim Plänkeln führen
 skirmish(b,dt,me);
 if(ld.arena)arenaWatch(b,me);
 // Lage prüfen
 if(b.time<ld.nextScan)return;const pressed=foes(b).some(e=>e.target===me.id&&dist(e,me)<90);ld.nextScan=b.time+ld.q.scan*(pressed?1.5:1)*rnd(.85,1.15);
 if(Math.random()>ld.q.notice*(pressed?.75:1))return;
 const urgentOk=true,talkOk=b.time-ld.lastSay>=L.CFG.sayGap;
 if(urgentOk&&rearWarning(b,me))return;
 if(talkOk&&helpCall(b,me))return;
 if(talkOk&&switchCall(b,me))return;
 if(ld.arena&&ld.phase==='fight')arenaThink(b,me,talkOk);}
function rearWarning(b,me){const ld=b.lead;
 for(const m of party(b)){if(!fit(m)||ld.hidden.includes(m.id)||m.state==='dodge')continue;
  for(const f of foes(b)){if(f.target!==m.id||lowThreat(f))continue;const d=dist(f,m);if(d>115)continue;
   const behind=Math.abs(adiff(m.a||0,ang(m,f)))>1.95;if(!behind||m.target===f.id&&Math.abs(adiff(m.a||0,ang(m,f)))<1)continue;
   if(!cool(b,'rear'+m.id,6))continue;ld.stats.warnings++;
   const self=m===me;const txt=self?pick(['Verdammt, hinter mir!','Wer kriecht mir da in den Rücken?!']):fill(pick(['{M}, HINTER DIR! {F}!','{M}! Rücken! {F} kommt!','{M}, dreh dich um! {F} will dich von hinten!']),{M:first(m.g),F:first(f.g)});
   say(b,me,txt,'rear',{urgent:true,subject:m.id,foe:f.id});
   const fl=L.follow(m.g,'warn'),delay=(self?0:ld.q.react*.5)+fl.react*rnd(.8,1.2);
   later(b,delay,()=>{if(!fit(m)||!fit(f))return;const behindNow=Math.abs(adiff(m.a||0,ang(m,f)))>1.6;
    if(behindNow&&!(m.stun>0)&&!(m.fallTimer>0)&&!(m.kneeTimer>0)&&!m.grabbedBy&&m.energy>6){m.dodgeAngle=ang(f,m)+(Math.random()<.5?-.5:.5);m.dodgeTimer=.26;m.dodgeCD=Math.max(m.dodgeCD||0,1.2);m.energy=Math.max(0,m.energy-7);m.state='dodge';m.wind=0;}
    m.a=ang(m,f);order(b,m,f,{time:4});ack(b,m,.25);});
   return true;}}return false;}
function helpCall(b,me){const ld=b.lead,P=party(b).filter(a=>fit(a)&&!ld.hidden.includes(a.id)),E=foes(b);
 for(const m of P){const att=E.filter(e=>e.target===m.id&&dist(e,m)<105&&!lowThreat(e));const hp=M.health(m.g);
  if(!(att.length>=2||(att.length>=1&&(hp<42||m.g.blood<45))))continue;
  const busy=h=>E.some(e=>e.target===h.id&&dist(e,h)<85&&!lowThreat(e));
  const helpers=P.filter(h=>h!==m&&!busy(h)&&!att.some(e=>h.target===e.id)).sort((x,y)=>dist(x,m)-dist(y,m)).slice(0,att.length>=2?2:1);
  if(!helpers.length||!cool(b,'help'+m.id,7))continue;ld.stats.helps++;
  say(b,me,fill(pick(['Helft {M}! {H}, sofort, sonst fällt er!','{H}! Zu {M}, schnell! Der macht es nicht mehr lange!','{M} ist in Not! {H}, hin da, sofort!']),{M:me===m?'mir':first(m.g),H:names(helpers)}),'help',{subject:m.id,helpers:helpers.map(h=>h.id)});
  for(const h of helpers){const fl=L.follow(h.g);if(Math.random()>fl.obey){ignored(b,h);continue;}const tg=nearest(h,att);later(b,ld.q.react*.5+fl.react*rnd(.8,1.2),()=>{if(fit(h)&&fit(tg)){order(b,h,tg,{time:7});ack(b,h,.35);}});}
  return true;}return false;}
function switchCall(b,me){const ld=b.lead,P=party(b).filter(a=>fit(a)&&!ld.hidden.includes(a.id)),E=foes(b);if(ld.q.sharp<25)return false;
 const danger=E.filter(e=>!lowThreat(e));if(!danger.length)return false;
 for(const e of E){if(!lowThreat(e))continue;const beaters=P.filter(a=>a.target===e.id&&dist(a,e)<100&&!isRanged(a));
  if(beaters.length<2&&!(beaters.length===1&&danger.some(d=>{const t=b.actors.find(x=>x.id===d.target);return t&&t.team===0&&!P.some(h=>h!==t&&h.target===d.id);})))continue;
  if(!cool(b,'sw'+e.id,8))continue;
  const keep=beaters.length>=2?beaters.slice().sort((x,y)=>dist(x,e)-dist(y,e))[0]:null,go=beaters.filter(a=>a!==keep);if(!go.length)continue;
  // gefährlichster: greift einen von uns an und hat die wenigsten Gegner
  const d=danger.slice().sort((x,y)=>score(x)-score(y))[0];function score(t){const att=P.filter(h=>h.target===t.id).length,hits=b.actors.find(x=>x.id===t.target)?.team===0?-1:0;return att*2+hits+dist(go[0],t)/300;}
  ld.stats.switches++;
  say(b,me,fill(pick(['{B}! Lasst {E} liegen, der ist erledigt! Geht auf {D}!','{B}, {E} stirbt auch ohne euch! Nehmt {D}!','Hört auf, {E} zu verprügeln! {D} ist gefährlicher! {B}, los!']),{B:names(go),E:first(e.g),D:first(d.g)}),'switch',{subject:e.id,target:d.id});
  for(const a of go){const fl=L.follow(a.g,'leave');if(Math.random()>fl.obey){ignored(b,a);continue;}later(b,ld.q.react*.5+fl.react*rnd(.8,1.2),()=>{if(fit(a)&&fit(d)){order(b,a,d,{avoid:e,time:7});ack(b,a,.3);}});}
  return true;}return false;}
function skirmish(b,dt,me){const ld=b.lead;if(!ld.alert)return;const E=foes(b);if(!E.length)return;
 const engaged=E.filter(e=>{const t=b.actors.find(x=>x.id===e.target);return t&&t.team===0&&!isRanged(t)&&!ld.hidden.includes(t.id)&&dist(e,t)<95;});
 const loose=E.filter(e=>!engaged.includes(e)),arch=party(b).filter(x=>x.leadSkirmish&&fit(x)&&isRanged(x)),half=engaged.length>=Math.max(1,Math.ceil(E.length/2));
 const call=(key,lines)=>{if(fit(me)&&cool(b,key,5))say(b,me,fill(pick(lines),{N:names(arch)}),key);};
 for(const a of arch){const s=a.leadSkirmish,f=nearest(a,loose),fd=f?dist(a,f):1e9;
  if(s.mode==='fwd'){if(fd<250){toRally(b,a);call('back',['{N}, zurück hinter die Schilde!','Schützen, Rückzug! Lockt sie zu uns!','{N}! Weg da, die kommen! Hinter die Mauer!']);}}
  else if(s.mode==='wait'){if(fd<85&&f.target===a.id)s.mode='free';else if(half){toFlank(b,a,engaged);call('flank',['{N}, jetzt außen rum! In die Flanke schießen!','Schützen, raus an die Seite! Von außen!','{N}, die kleben an der Mauer! Flanke!']);}}
  else if(s.mode==='flank'||s.mode==='shoot'){if(fd<170&&f.target===a.id){toRally(b,a);if(fit(me)&&cool(b,'kite'+a.id,5))say(b,me,fill(pick(['{N}, der will dich! Zurück zu uns!','{N}, lauf! Hinter die Schilde!']),{N:first(a.g)}),'back');}
   else if(s.mode==='shoot'&&engaged.length){const c=engaged.reduce((t,x)=>t+x.y,0)/engaged.length;if(Math.abs(a.y-c)<120||hyp(a.x-engaged[0].x,a.y-engaged[0].y)>(M.effective?.(a)?.range||330)*.9)toFlank(b,a,engaged);}}
  else if(s.mode==='free'){if(fd>150){if(half&&engaged.length)toFlank(b,a,engaged);else toRally(b,a);}}}}
function ack(b,a,p){if(Math.random()>p)return;const ld=b.lead;if(b.time-(ld.lastAck||-9)<2.4)return;ld.lastAck=b.time;b.events.push({type:'lead',actor:a,text:pick(['Verstanden!','Bin dran!','Ja, ja!','Schon unterwegs!','Mach ich!','Hab ihn!']),kind:'ack'});}
function ignored(b,a){const ld=b.lead;ld.stats.ignored++;if(b.time-(ld.lastAck||-9)<2)return;ld.lastAck=b.time;b.events.push({type:'lead',actor:a,text:pick(['Gleich! Der zappelt noch!','Erst den hier!','Moment, ich bin beschäftigt!','Ja, gleich!']),kind:'ignore'});}

// ---------- ohne Bild (Messungen, Tests): Besprechung überspringen, Positionen direkt setzen ----------
// mode: 'lead' (mit Anführer), 'none' (gleiche Gegnergruppe, ohne Anführer). Gibt zurück, ob entdeckt wurde.
L.headlessEncounter=function(b,m,sti,mode='lead'){
 if(mode!=='lead'||!b.lead){L.beginGroup(b,m,sti,{unaware:false});const G=b.group;party(b).filter(fit).forEach((a,k)=>{a.x=G.hx+40-(k%2)*40;a.y=clamp(G.ey+((k%5)-2)*55,b.L.mT+30,b.L.mB-24);});b.started=true;b.paused=false;return false;}
 const spotted=L.spotRoll(b,m.place.stations[sti]);L.beginGroup(b,m,sti,{unaware:spotted});const G=b.group;
 party(b).filter(fit).forEach((a,k)=>{a.x=G.hx-(k%2)*40;a.y=clamp(G.ey+((k%5)-2)*55,b.L.mT+30,b.L.mB-24);});
 if(spotted){b.lead.stats.spotted++;const {pts}=L.plan(b);for(const [a,p] of pts){a.x=p.x;a.y=p.y;a.a=p.face;}L.engage(b);}
 else{for(const e of b.encEnemies){e.x-=200;}L.surprise(b);}
 b.started=true;b.paused=false;return spotted;};
// Testtruppe mit gemischten Rollen (Soldaten, Fernkämpfer, Assassinen), sonst wie D.makeParty (frische Rekruten, improvisiert ausgerüstet)
const MIX=['Soldat','Soldat','Fernkämpfer','Assassine','Soldat','Fernkämpfer','Assassine','Soldat','Soldat','Fernkämpfer'];
const RW={Soldat:['gladius','short','long','axe','mace','club','hammer','spear','trident'],Assassine:['dagger','short'],Fernkämpfer:['bow','crossbow']};
const SPARE=['Aulus','Brutus','Cassius','Drusus','Fabius','Gnaeus','Horatius','Junius','Kaeso','Lentulus','Nero','Otho','Publius','Quintus','Septimus','Titus','Vibius'];
L.makeParty=function(seed,n=7){const p=D.makeParty(seed,n),used=new Set();p.forEach((g,i)=>{let f=first(g);if(used.has(f)){f=SPARE.find(x=>!used.has(x))||f;g.name=f+' '+String(g.name).split(' ').slice(1).join(' ');}used.add(f);const r=MIX[i%MIX.length];if(g.role===r)return;g.role=r;
 const w=RW[r].reduce((a,c)=>(g.mastery[c]||0)>(g.mastery[a]||0)?c:a,RW[r][0]),ranged=r==='Fernkämpfer';
 g.enemyGear={weapon:M.makeItem('weapon',w,0),secondary:ranged?M.makeItem('weapon','dagger',0):null,shield:r==='Soldat'?M.makeItem('shield','roundshield',0):r==='Assassine'?M.makeItem('shield','buckler',0):null,armor:{}};
 for(const d of M.armorDefs)g.enemyGear.armor[d.id]=M.makeItem('armor',d.id,0,r==='Soldat'?'metal':'leather');for(const it of D.gearList(g))it.durability=it.maxDurability;});return p;};
// Eine ganze Mission ohne Bild. mode 'lead' oder 'none' (gleiche Gegnergruppen, kein Anführer). partyFactory(seed) → Gladiatoren.
L.simulate=function(seed,partyFactory,o={}){const mode=o.mode||'lead',party=partyFactory(seed),m=D.newMission(seed,party,o.biome||'wald',{kind:o.kind||'adventure',learn:false,diff:o.diff,s:o.s});
 const prevEnd=M.endBenchmark;M.endBenchmark=(w,r)=>D.onEngineEnd(w,r);let spotted=0,enc=0;
 try{outer:for(let si=0;si<m.place.sections.length;si++){if(!party.some(D.fit)){m.state='lost';break;}
   const b=D.startSection(m,si,{headless:true});
   for(const sti of m.place.sections[si].stations){if(mode==='lead')L.attach(b,m);else b.lead=null;
    enc++;if(L.headlessEncounter(b,m,sti,b.lead?'lead':'none'))spotted++;let steps=0;
    while(!b.done&&steps<60*(D.CFG.timeLimit+5)){D.tick(b,1/60);M.fixedStep(1/60);steps++;if(b.events.length>200)b.events.length=0;}
    if(!b.done)b.done={winner:-1,reason:'Zeitlimit'};D.endEncounter(m,b);if(m.state!=='ready')break outer;b.done=null;}
   S.battle=null;}}
 finally{M.endBenchmark=prevEnd;S.battle=null;if(m.prevLimit!==undefined){if(m.prevLimit===null)delete M.benchmarkTimeLimit;else M.benchmarkTimeLimit=m.prevLimit;}}
 return {seed,mode,won:m.state==='won',state:m.state,deaths:m.deaths.length,fit:party.filter(D.fit).length,reached:m.cleared+1,total:m.place.stations.length,spotted,enc,stats:m.leadStats||null,taken:Math.round(Object.values(m.rep||{}).reduce((t,r)=>t+(r.taken||0),0)),dealt:Math.round(Object.values(m.rep||{}).reduce((t,r)=>t+(r.damage||0),0)),leader:party.find(g=>g.id===m.leaderId)?.name||null};};
// =====================================================================================================
// ARENA: Anführer ab 5 Kämpfern (keine Hinterhalte, kein Verstecken). Aufstellung und Lagebesprechung vor dem Gong (arena-leader-ui.js),
// verteilte Pfeile vor dem Nahkampf, Sammelziele, Ratschläge, Warnungen, Rückzug und Ablösung, Verbinden, Taktikwechsel,
// Anführerduell, Publikum anheizen, Helden werden gefeiert. Alle Rufe mit Namen.
// =====================================================================================================
L.arenaEligible=b=>!!b&&!b.mission&&!b.benchmark&&!b.army&&!b.lesson&&!b.neu&&!b.finale&&!b.actors.some(a=>a.rex||a.hahn||a.lion)&&b.actors.filter(a=>a.team===0&&fit(a)).length>=L.CFG.minParty;
L.attachArena=function(b,o={}){if(!L.arenaEligible(b)){if(b)b.lead=null;return null;}const mine=b.actors.filter(a=>a.team===0&&fit(a)),foes0=b.actors.filter(a=>a.team===1&&fit(a));
 const g=(o.leaderId&&mine.find(a=>a.g.id===o.leaderId)?.g)||mine.map(a=>a.g).sort((x,y)=>L.leaderScore(y)-L.leaderScore(x))[0];
 const eg=foes0.length>=3?foes0.map(a=>a.g).sort((x,y)=>L.leaderScore(y)-L.leaderScore(x))[0]:null;
 b.lead={on:true,arena:true,leaderId:g.id,foeLeaderId:eg?.id||null,q:L.quality(g),phase:'intro',pending:[],cd:{},lastSay:-9,nextScan:0,hidden:[],holds:new Map(),unaware:new Set(),alert:true,alertAt:0,fightAt:0,
  stats:{calls:0,spotted:0,surprised:0,warnings:0,helps:0,switches:0,ignored:0,ambushHits:0,successions:0,focus:0,advice:0,retreats:0,bandages:0,tactics:0,crowd:0,heroes:0,volleys:0},heroes:new Set(),kills:{}};
 b.leaders=[g.id,eg?.id||null];b.moraleBonus??=[0,0];b.events??=[];return b.lead;};
// Aufstellung: Schilde vorn, Fernkämpfer dahinter, Assassinen an den Flügeln (Ziele in Feldkoordinaten; die Oberfläche läuft sie ab)
L.arenaFormation=function(b){const me=party(b).filter(fit),cx=me.reduce((t,a)=>t+a.x,0)/me.length,cy=me.reduce((t,a)=>t+a.y,0)/me.length,dir=Math.sign(foes(b).reduce((t,a)=>t+a.x,0)/Math.max(1,foes(b).length)-cx)||1;
 const sold=me.filter(a=>role(a)==='Soldat'&&!isRanged(a)),assa=me.filter(a=>role(a)==='Assassine'&&!isRanged(a)),arch=me.filter(isRanged),other=me.filter(a=>!sold.includes(a)&&!assa.includes(a)&&!arch.includes(a)),line=[...sold,...other];
 const front=cx+dir*130,pts=new Map(),gap=Math.min(86,380/Math.max(1,line.length-1)),half=(line.length-1)/2*gap;
 line.forEach((a,i)=>pts.set(a,{x:front+(i%2?-dir*8:0),y:cy+(i-(line.length-1)/2)*gap,job:'line'}));
 arch.forEach((a,i)=>pts.set(a,{x:front-dir*110,y:cy+(i-(arch.length-1)/2)*90,job:'archer'}));
 assa.forEach((a,i)=>{const side=i%2?1:-1;pts.set(a,{x:front-dir*10,y:cy+side*(half+70+Math.floor(i/2)*50),job:'wing'});});
 return {pts,dir,line,arch,assa};};
const powerScore=e=>{const g=e.g,w=M.gear(g,'weapon');return powerOf(g)+(w?(w.q||0)*6:0)+(isRanged(e)?18:0)+(g.kills||0)*2;};
const sideOf=(e,part)=>part[0]==='l'?'links':'rechts';
// Lagebesprechung vor dem Gong: zwei, drei Ratschläge zu bestimmten Gegnern, mit Namen; Ziele gelten ab dem Gong
L.arenaBrief=function(b){const ld=b.lead,me=leaderActor(b),E=foes(b),P=party(b).filter(fit),out=[],sharp=ld.q.sharp;if(!me||!E.length)return out;
 const opp=b.opponent||'die da drüben';out.push({who:me,text:fill(pick(['{T}. {n} Mann. Die sehen hungrig aus. Wir sind das Essen nicht.','Da drüben: {T}, {n} Stück. Hört zu, ich sag das nur einmal.','{n} von {T}. Ich hab mir die angesehen. Sie haben sich uns nicht angesehen. Fehler.']),{T:opp,n:E.length})});
 const ranked=E.slice().sort((x,y)=>powerScore(y)-powerScore(x)),top=ranked[0],slow=E.find(e=>{const w=M.gear(e.g,'weapon');return w&&['hammer','greatsword','doubleaxe','halberd'].includes(w.def);}),shooter=E.find(isRanged);
 const pickPair=ex=>P.filter(a=>!isRanged(a)&&!ex.includes(a)).sort((x,y)=>powerOf(y.g)-powerOf(x.g)).slice(0,2);
 const used=[];ld.briefOrders=[];
 if(top){const two=pickPair(used);used.push(...two);if(two.length){ld.briefOrders.push({who:two,target:top});out.push({who:me,text:fill(pick(two.length<2?['{E} ist ihr Bester. {W}. {N}, du hältst ihn beschäftigt. Nicht stehen bleiben.','Seht ihr {E}? {W}. {N}: Der gehört dir. Pass auf, der hat Erfahrung.']:['{E} ist ihr Bester. {W}. {N}, ihr zwei nehmt ihn euch. Zusammen, nicht nacheinander.','Seht ihr {E}? {W}. {N}: Der gehört euch. Keiner geht allein auf den.']),{E:first(top.g),W:sharp>=35?(top.g&&M.gear(top.g,'weapon')?'Trägt '+String(M.itemName(M.gear(top.g,'weapon'))).split(' · ')[0]:'Kämpft mit den Fäusten'):'Hat irgendwas Großes in der Hand',N:names(two)})});}}
 if(slow&&slow!==top&&sharp>=30){const one=pickPair(used).slice(0,1);used.push(...one);if(one.length){ld.briefOrders.push({who:one,target:slow});out.push({who:me,text:fill(pick(['{E} hat {W}. Langsam wie ein Ochse. {N}, lass ihn ausholen, dann rein in die Seite.','{E} mit {W}: Wenn der trifft, ist Feierabend. {N}, nicht stehen bleiben, um ihn herum.']),{E:first(slow.g),W:String(M.itemName(M.gear(slow.g,'weapon'))).split(' · ')[0],N:names(one)})});}}
 const arch=P.filter(isRanged);if(shooter&&P.length){const by=arch.length?arch:pickPair(used).slice(0,1);ld.briefOrders.push({who:by,target:shooter});const one=by.length<2;out.push({who:me,text:fill(pick(one?['{E} hat einen Bogen. Den will ich zuerst im Sand sehen. {N}, kümmer dich.','Der Schütze, {E}: {N}, der ist deiner. Sonst sind wir bald ein Nadelkissen.']:['{E} hat einen Bogen. Den will ich zuerst im Sand sehen. {N}, kümmert euch.','Der Schütze, {E}: {N}, der ist eurer. Sonst sind wir bald ein Nadelkissen.']),{E:first(shooter.g),N:names(by)})});}
 else if(arch.length>=2)out.push({who:me,text:fill(pick(['{N}: Verteilt die Pfeile. Jeder einen anderen. Ich will, dass sie alle bluten, bevor sie bei uns sind.','Schützen, {N}: nicht alle auf einen. Jeder bekommt einen eigenen Pfeil. Gerechtigkeit muss sein.']),{N:names(arch)})});
 const foeL=b.actors.find(a=>a.id===ld.foeLeaderId);if(foeL)out.push({who:foeL,foe:true,text:pick(['Seid ihr die Schule, die mir heute ihr Geld schenkt?','Ich hab eure Namen schon auf meinen Grabsteinen bestellt.','Euer Anführer da sieht aus, als würde er gleich weinen.'])},{who:me,text:pick(['Red nur. Gleich hast du Sand im Mund.','Bestell lieber einen für dich. Groß. Du brauchst Platz.','Das ist Vorfreude. Auf dich.'])});
 return out;};
// Gong: Ziele aus der Besprechung setzen, Pfeile verteilen
L.arenaStart=function(b){const ld=b.lead;if(!ld)return;ld.phase='fight';ld.fightAt=b.time;for(const o of ld.briefOrders||[])for(const a of o.who)if(fit(a)&&fit(o.target))order(b,a,o.target,{time:7});ld.briefOrders=null;volley(b,true);};
function volley(b,start){const ld=b.lead,me=leaderActor(b),arch=party(b).filter(a=>fit(a)&&isRanged(a)),E=foes(b);if(arch.length<2||E.length<2)return false;
 // Gleichmäßig verteilen: jeder Schütze ein anderer Gegner, die gefährlichsten zuerst, die schon Getroffenen zuletzt
 const pool=E.slice().sort((x,y)=>(x.hitsTaken||0)-(y.hitsTaken||0)||powerScore(y)-powerScore(x)),pairs=[];arch.forEach((a,i)=>{const t=pool[i%pool.length];pairs.push([a,t]);});
 if(!start&&!cool(b,'volley',14))return false;ld.stats.volleys++;
 if(fit(me))say(b,me,pairs.length<=3?pairs.map(([a,t])=>first(a.g)+' auf '+first(t.g)).join(', ')+'! Verteilt die Pfeile!':'Schützen, verteilt euch! Jeder einen anderen! '+pairs.slice(0,2).map(([a,t])=>first(a.g)+' auf '+first(t.g)).join(', ')+'!','volley');
 for(const [a,t] of pairs){const fl=L.follow(a.g);later(b,ld.q.react*.4+fl.react*rnd(.6,1),()=>{if(fit(a)&&fit(t))order(b,a,t,{time:6});});}return true;}
const melee=b=>foes(b).some(e=>party(b).some(a=>fit(a)&&!isRanged(a)&&dist(a,e)<110));
function arenaWatch(b,me){const ld=b.lead,E=foes(b);
 // Helden: Anführer der Gegner erledigt, zwei Gegner zu Boden, Kamerad aus höchster Not gerettet
 for(const x of b.actors){if(x.team!==1||!(x.down||x.g.dead)||ld.seenDown?.has(x.id))continue;(ld.seenDown??=new Set()).add(x.id);const a=b.actors.find(y=>y.id===x.lastAttackerId&&y.team===0);if(!a)continue;
  const k=ld.kills[a.id]=(ld.kills[a.id]||0)+1,vic=b.actors.find(y=>y.id===x.target&&y.team===0);
  if(x.id===ld.foeLeaderId)hero(b,a,'leader');else if(vic&&vic!==a&&(vic.down||M.health(vic.g)<40))hero(b,a,'rescue',vic);else if(k>=2)hero(b,a,'double');}
 // Gegnerischer Anführer liegt: Moral hoch
 const foeL=b.actors.find(x=>x.id===ld.foeLeaderId);if(foeL&&!fit(foeL)&&!ld.foeLeaderCalled){ld.foeLeaderCalled=true;b.moraleBonus[0]=(b.moraleBonus[0]||0)+2;if(fit(me))say(b,me,fill(pick(['{E} liegt! Ihr Anführer ist erledigt! JETZT DRAUF!','Ihr Kopf ist ab! {E} ist erledigt! Hinterher!']),{E:first(foeL.g)}),'duel',{urgent:true});}
 }
function arenaThink(b,me,talkOk){const ld=b.lead,P=party(b).filter(a=>fit(a)),E=foes(b);
 if(!talkOk)return;
 // Verbinden: Liegt einer von uns blutend, schickt der Anführer einen freien Soldaten
 for(const t of party(b)){if(!t.down||t.g.dead||!Object.values(t.g.body).some(p=>p.bleed>0)||b.actors.some(x=>x.aid?.target===t.id))continue;
  const h=P.filter(a=>a!==t&&role(a)==='Soldat'&&!a.aid&&a.energy>=16&&!E.some(e=>e.target===a.id&&dist(e,a)<120)).sort((x,y)=>dist(x,t)-dist(y,t))[0];if(!h||!cool(b,'aid'+t.id,9))continue;
  ld.stats.bandages++;say(b,me,fill(pick(['{H}, verbind {P}! Sonst verblutet er uns!','{P} läuft aus! {H}, Verband, sofort!','{H}! Zu {P}, abbinden! Der braucht sein Blut noch!']),{H:first(h.g),P:first(t.g)}),'aid');
  const fl=L.follow(h.g);if(Math.random()>fl.obey+.15){ignored(b,h);return;}later(b,ld.q.react*.5+fl.react*rnd(.7,1.1),()=>{if(fit(h)&&t.down&&!t.g.dead&&!h.aid){h.aid={target:t.id,left:2.4,taken:h.taken};h.wind=0;h.chargeTimer=0;ack(b,h,.4);}});return;}
 // Rückzug und Ablösung: Schwer Verletzte raus, ein Frischer übernimmt
 for(const a of P){if(a.leadRetreat||isRanged(a))continue;const hp=M.health(a.g),att=E.filter(e=>e.target===a.id&&dist(e,a)<100);if(!(att.length&&(hp<36||a.g.blood<45)))continue;if(!cool(b,'rt'+a.id,12))continue;
  const fresh=P.filter(x=>x!==a&&!x.leadRetreat&&!isRanged(x)&&M.health(x.g)>65&&!E.some(e=>e.target===x.id&&dist(e,x)<90)).sort((x,y)=>dist(x,a)-dist(y,a))[0];
  const back={x:a.x-Math.sign((att[0].x-a.x)||1)*170,y:a.y+(Math.random()<.5?-40:40)};
  ld.stats.retreats++;say(b,me,fresh?fill(pick(['{A}, raus da! Zurück hinter die Schilde! {F}, übernimm {E}!','{A}, du blutest wie ein Schwein! Zurück! {F}, rein für ihn!']),{A:first(a.g),F:first(fresh.g),E:first(att[0].g)}):fill(pick(['{A}, zurück! Atme! Wir brauchen dich lebend!']),{A:first(a.g)}),'retreat');
  const fl=L.follow(a.g,'leave');if(Math.random()>fl.obey||has(a.g,'Berserker')){ignored(b,a);b.events.push({type:'lead',actor:a,text:pick(['Ich lauf nicht weg!','Niemals! Ich steh!','Erst stirbt der!']),kind:'ignore'});}
  else later(b,ld.q.react*.4+fl.react*rnd(.7,1),()=>{if(fit(a)){a.leadRetreat={goal:back,until:b.time+3.5};a.target=null;a.leadOrder=null;}});
  if(fresh){const ff=L.follow(fresh.g);later(b,ld.q.react*.5+ff.react*rnd(.7,1.1),()=>{if(fit(fresh)&&fit(att[0])){order(b,fresh,att[0],{time:7});ack(b,fresh,.4);}});}return;}
 // Duell der Anführer: Kommen sich beide nahe, fordert unserer den anderen heraus (Rufe hin und her, Nahaufnahme in der Oberfläche)
 const fl0=b.actors.find(x=>x.id===ld.foeLeaderId);if(fl0&&fit(fl0)&&!ld.duel&&!isRanged(me)&&dist(me,fl0)<170&&M.health(me.g)>45&&!E.some(e=>e!==fl0&&e.target===me.id&&dist(e,me)<80)){
  ld.duel={at:b.time};ld.stats.duels=(ld.stats.duels||0)+1;say(b,me,fill(pick(['{E}! Du und ich! Lass die Kinder spielen!','{E}! Hier bin ich! Komm her, wenn du dich traust!','{E}! Nur wir zwei! Das Publikum will es so!']),{E:first(fl0.g)}),'duel',{urgent:true});
  later(b,1.1,()=>{if(fit(fl0))b.events.push({type:'lead',actor:fl0,text:pick(['Endlich! Ich dachte, du versteckst dich ewig!','Mit Vergnügen. Ich nehm dir das Grinsen ab.','Ich hab auf dich gewartet!']),kind:'duel',foe:true});});
  order(b,me,fl0,{time:12});if(fl0.target!==me.id){fl0.target=me.id;fl0.decision=.6;}b.events.push({type:'duel',actor:me,foe:fl0});
  for(const a of P)if(a!==me&&a.target===fl0.id&&!isRanged(a)){const o2=E.filter(e=>e!==fl0).sort((x,y)=>dist(a,x)-dist(a,y))[0];if(o2)order(b,a,o2,{time:6,avoid:fl0});}
  M.cheer=Math.max(M.cheer||0,.8);return;}
 // Publikum anheizen (einmal, wenn es ruhig ist)
 if(!ld.crowdDone&&b.time-ld.fightAt>5&&Math.random()<.35&&!E.some(e=>e.target===me.id&&dist(e,me)<120)){ld.crowdDone=true;ld.stats.crowd++;const g=me.g,ch=clamp(.25+((g.stats.will||0)*.004+(g.stats.experience||0)*.003+Math.min(.2,(g.fame||0)/2000)),.2,.9),ok=Math.random()<ch;
  say(b,me,pick(['DAS IST FÜR EUCH, ROM!','HÖRT IHR MICH?! LAUTER!','WER WILL BLUT SEHEN?!','FÜR DEN LUDUS! UND FÜR EUREN WEIN!'])+' '+fill(pick(['{A} holt euch gleich einen Kopf!','Schaut auf {A}!','{A} kämpft für euch!']),{A:first((P.filter(a=>a!==me)[0]||me).g)}),'crowd',{urgent:true});
  if(ok){b.moraleBonus[0]=(b.moraleBonus[0]||0)+2;}b.events.push({type:'crowd',actor:me,ok});return;}
 // Pfeile verteilen, solange noch kein Nahkampf läuft (manchmal auch später wieder)
 if(!melee(b)&&volley(b,false))return;
 // Sammelziel: der gefährlichste Gegner (Schütze, Spitzenwaffe, oder einer, der einen von uns gerade zerlegt)
 if(cool(b,'focusChk',4)){const beating=E.find(e=>{const t=b.actors.find(x=>x.id===e.target);return t&&t.team===0&&M.health(t.g)<55&&dist(e,t)<90;}),cand=beating||E.find(isRanged)||E.slice().sort((x,y)=>powerScore(y)-powerScore(x))[0];
  if(cand&&cool(b,'focus',12)){const go=P.filter(a=>a.target!==cand.id&&!a.leadRetreat&&!E.some(e=>e!==cand&&e.target===a.id&&dist(e,a)<70)).sort((x,y)=>dist(x,cand)-dist(y,cand)).slice(0,3);
   if(go.length){ld.stats.focus++;say(b,me,fill(pick(['Alle auf {E}! {N}, los!','{N}: {E}! Den zuerst!','{E} ist der Gefährlichste! {N}, macht ihn fertig!']),{E:first(cand.g),N:names(go)}),'focus');
    for(const a of go){const fl=L.follow(a.g);if(Math.random()>fl.obey){ignored(b,a);continue;}later(b,ld.q.react*.5+fl.react*rnd(.8,1.2),()=>{if(fit(a)&&fit(cand)){order(b,a,cand,{time:7});ack(b,a,.3);}});}return;}}}
 // Ratschlag an einen Einzelnen: Schwäche seines Gegners
 if(cool(b,'adv',9)&&ld.q.sharp>=25){for(const a of P){const e=b.actors.find(x=>x.id===a.target);if(!e||e.team!==1||!fit(e)||dist(a,e)>110)continue;
   const hurt=Object.entries(e.g.body).filter(([,p])=>!p.missing&&p.hp<60).sort((x,y)=>x[1].hp-y[1].hp)[0],noHelm=!(M.armorItems?.(e.g)||[]).some(i=>i.def==='helm'),tired=e.energy<25,shield=M.usableShield?.(e);
   let txt=null;if(hurt)txt=fill(pick(['{A}, {E}s {P} ist hin! Genau da rein!','{A}! {E} hält sich die {P}. Mach weiter da!']),{A:first(a.g),E:first(e.g),P:M.partName(hurt[0])});
   else if(tired)txt=fill(pick(['{A}, {E} ist platt! Jetzt drauf, der kriegt keine Luft mehr!','{A}! {E} pfeift aus dem letzten Loch! Nachsetzen!']),{A:first(a.g),E:first(e.g)});
   else if(noHelm)txt=fill(pick(['{A}, {E} hat keinen Helm! Auf den Kopf!','{A}! Kein Helm bei {E}. Du weißt, was zu tun ist.']),{A:first(a.g),E:first(e.g)});
   else if(shield)txt=fill(pick(['{A}, {E} versteckt sich hinter dem Schild. Geh um ihn herum!','{A}! Nicht auf den Schild hauen, auf die Beine!']),{A:first(a.g),E:first(e.g)});
   if(!txt)continue;ld.stats.advice++;say(b,me,txt,'advice');const fl=L.follow(a.g);later(b,fl.react,()=>{if(fit(a)){order(b,a,e,{time:6});M.learn?.(a,'stats','tactics',.01);if(hurt||tired)a.leadTip={target:e.id,until:b.time+6};ack(b,a,.35);}});return;}}
 // Taktikwechsel nach Lage
 if(cool(b,'tac',15)&&b.time-ld.fightAt>6){const nP=P.length,nE=E.length,eTired=E.reduce((t,e)=>t+(e.energy||0),0)/Math.max(1,nE)<30,base=b.teamTactics?.[0]||{...(S.tactics||{})};let next=null,txt='';
  if(nP>=nE+2||eTired){if(base.aggression!=='Aggressiv'){next={...base,aggression:'Aggressiv'};txt=eTired?'Die werden müde! Jetzt Druck! Alle nach vorn!':'Wir sind mehr! Drauf, keine Pause!';}}
  else if(nE>=nP+2){if(base.aggression!=='Defensiv'){next={...base,aggression:'Defensiv'};txt='Zusammenbleiben! Halten! Rücken an Rücken, keiner geht allein vor!';}}
  else if(E.some(isRanged)&&base.priority!=='Fernkämpfer'){next={...base,priority:'Fernkämpfer'};txt='Holt mir die Schützen da raus! Die zuerst!';}
  if(next){b.teamTactics=[next,b.teamTactics?.[1]];ld.stats.tactics++;const nm=names(P.filter(a=>a!==me).sort(()=>Math.random()-.5).slice(0,2));say(b,me,(nm?nm+'! ':'')+txt,'tactic');return;}}}
function hero(b,a,why,saved){const ld=b.lead;if(ld.heroes.has(a.id+why))return;ld.heroes.add(a.id+why);ld.stats.heroes++;b.moraleBonus[0]=(b.moraleBonus[0]||0)+1;b.events.push({type:'hero',actor:a,why,saved});}
function retreatStep(b,a,x,y,dt){const r=a.leadRetreat;if(!r||b.time>r.until||!fit(a)){a.leadRetreat=null;return;}const d=hyp(r.goal.x-x,r.goal.y-y);if(d<16){a.leadRetreat=null;return;}
 const sp=clamp((M.effective?.(a)?.speed||60)*1.1,45,150)*dt*(M.combatStepRate||1),k=Math.min(d,sp);a.x=x+(r.goal.x-x)/d*k;a.y=y+(r.goal.y-y)/d*k;a.a=Math.atan2(r.goal.y-y,r.goal.x-x);a.state='move';a.wind=0;a.cool=Math.max(a.cool||0,.3);
 if(M.updateLocomotion)M.updateLocomotion(a,x,y,a.phase||0,dt*(M.combatStepRate||1));}
L.repairArena=b=>{const ld=b.lead;b.events??=[];ld.unaware=new Set();ld.holds=new Map();ld.heroes=new Set(Array.isArray(ld.heroes)?ld.heroes:[]);ld.seenDown=new Set(b.actors.filter(a=>a.team===1&&(a.down||a.g.dead)).map(a=>a.id));ld.pending=[];ld.hidden=[];ld.cd={};ld.kills=ld.kills||{};ld.stats=ld.stats||{};b.moraleBonus??=[0,0];};
L.version='2026-10-22';
})();
