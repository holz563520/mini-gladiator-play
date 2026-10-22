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
 haltDist:520,      // so weit vor der Gruppe bleibt die Truppe stehen, wenn sie die Gegner entdeckt
 noticeDist:240,    // ahnungslose Gegner merken etwas, wenn einer von uns so nah kommt
 alertAfter:9,      // spätestens nach so vielen Sekunden hören sie die Truppe
 holdRelease:160,   // haltende Soldaten lösen sich, wenn ein Gegner so nah ist
 holdMax:11,        // oder spätestens so viele Sekunden nach dem Alarm
 hideMax:22,        // Assassinen warten höchstens so lange nach dem Alarm
 sayGap:1.5,        // Mindestabstand zwischen zwei Rufen (Spielsekunden), Warnungen ausgenommen
 orderTime:6        // so lange gilt ein Zielbefehl
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
L.groupSize=(b,m,sti)=>Math.min(m.queues[sti].length,clamp(2+Math.floor(m.party.filter(D.fit).length*.5),2,L.CFG.groupMax));
L.layoutGroup=function(b,m,sti){const st=m.place.stations[sti],W=b.width,mx=D.marginX(W);
 const ex=clamp(st.fx+140,mx+L.CFG.haltDist+120,W-mx-70),ey=D.pathY(b.L,ex);return {ex,ey,hx:ex-L.CFG.haltDist};};
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
 // Fernkämpfer: nach vorn in Schussweite; Sammelpunkt hinter den Schilden, später außen herum
 arch.forEach((a,i)=>{const rg=Math.min((M.effective?.(a)?.range||330)*.78,380),x=Math.max(lx+80,G.ex-rg),y=clamp(G.ey+(i-(arch.length-1)/2)*70,mT+30,mB-24);
  pts.set(a,{x,y,face:0,job:'skirmish'});a.leadSkirmish={rally:{x:lx-80,y:clamp(G.ey+(i%2?1:-1)*(half+50),mT+30,mB-24)},flank:{x:G.ex-40,y:clamp(G.ey+(i%2?1:-1)*(half+170),mT+30,mB-24)},mode:'fwd'};});
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
 for(const a of party(b))if(a.leadHide){const c={type:'sprite',hp:0,r:0,x:a.leadHide.x+(a.leadHide.side>0?6:-4),y:a.leadHide.y+10,leadCover:true,sid:-1};D.addObstacles(b,[c]);a.leadCover=c;}
 for(const e of foes(b))e.leadHits=e.hitsTaken||0;};
// Überraschung (nicht entdeckt): kein Plan, nur schnelle Rufe
L.surprise=function(b){const ld=b.lead;if(!ld)return;ld.phase='fight';ld.fightAt=b.time;ld.alert=true;ld.alertAt=b.time;ld.stats.surprised++;const me=leaderActor(b);
 if(me)say(b,me,pick(['Hinterhalt! Zusammenrücken!','Verdammt, die waren schneller! Rücken an Rücken!','Überfall! Schilde raus, Augen auf!']),'surprise',{urgent:true});
 for(const a of party(b))if(isRanged(a)){const sold=party(b).filter(x=>fit(x)&&role(x)==='Soldat');const c=sold.length?{x:sold.reduce((s,x)=>s+x.x,0)/sold.length,y:sold.reduce((s,x)=>s+x.y,0)/sold.length}:{x:a.x-80,y:a.y};a.leadSkirmish={rally:{x:c.x-80,y:c.y+(Math.random()<.5?-90:90)},flank:{x:c.x+60,y:c.y+(Math.random()<.5?-220:220)},mode:'back'};}};

// ---------- Engine-Haken ----------
const prevPrio=M.worldPriority;
M.worldPriority=function(a,t){let v=prevPrio?prevPrio.apply(this,arguments)||0:0;const o=a.leadOrder;
 if(o&&S.battle?.lead&&o.until>S.battle.time){if(t.id===o.target)v+=900;if(t.id===o.avoid)v-=420;}
 if(a.team===0&&S.battle?.lead&&lowThreat(t)&&S.battle.lead.q.sharp>30)v-=60;return v;};
const prevStep=M.fixedStep;
M.fixedStep=function(dt){const b=S.battle;if(!b?.lead?.on||b.paused||!b.started||b.done||b.result)return prevStep.apply(this,arguments);
 const ld=b.lead,keep=[];
 // ahnungslose Gegner und haltende Soldaten bleiben stehen; versteckte Assassinen sind nicht auf dem Feld
 for(const a of b.actors){if(ld.unaware.has(a.id)||(a.team===0&&holding(b,a)))keep.push([a,a.x,a.y,a.a]);}
 const hid=ld.hidden.length?b.actors.filter(a=>ld.hidden.includes(a.id)):[];
 if(hid.length){if(party(b).filter(a=>fit(a)&&!ld.hidden.includes(a.id)).length===0)release(b,'alone');else b.actors=b.actors.filter(a=>!ld.hidden.includes(a.id));}
 let r;try{r=prevStep.apply(this,arguments);}finally{for(const a of hid)if(!b.actors.includes(a))b.actors.push(a);}
 for(const [a,x,y,an] of keep){if(!fit(a))continue;if(a.state==='dodge'&&a.team===0)continue;a.x=x;a.y=y;a.kx=0;a.ky=0;a.detour=null;a.stuck={x,y,t:b.time};a.moveSpeed=0;if(a.state==='move'||a.state==='charge')a.state='idle';a.chargeTimer=0;
  if(a.team===1)a.a=an;else{const f=nearest(a,foes(b));if(f)a.a=ang(a,f);}}
 for(const a of hid){a.detour=null;a.stuck={x:a.x,y:a.y,t:b.time};a.state='idle';a.moveSpeed=0;a.wind=0;}
 if(!b.done&&!b.paused)think(b,dt);return r;};
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
 for(const a of hid){if(!b.actors.includes(a))b.actors.push(a);const f=L.follow(a.g),eng=E.filter(e=>{const t=b.actors.find(x=>x.id===e.target);return t&&t.team===0&&dist(e,t)<90;}),tg=nearest(a,eng.length?eng:E);
  if(why==='seen'){if(tg)order(b,a,tg);continue;}later(b,f.react*.7,()=>{if(tg&&fit(tg))order(b,a,tg,{time:8});a.leadRelease=b.time;});}}

// ---------- Anweisungen im Kampf ----------
function cool(b,key,s){const c=b.lead.cd;if((c[key]||-1e9)>b.time)return false;c[key]=b.time+s;return true;}
function think(b,dt){const ld=b.lead;
 // fällige Umsetzungen
 if(ld.pending.length){const now=b.time,due=ld.pending.filter(p=>p.at<=now);ld.pending=ld.pending.filter(p=>p.at>now);for(const p of due){try{p.fn();}catch(e){console.warn(e);}}}
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
 // Lage prüfen
 if(b.time<ld.nextScan)return;const pressed=foes(b).some(e=>e.target===me.id&&dist(e,me)<90);ld.nextScan=b.time+ld.q.scan*(pressed?1.5:1)*rnd(.85,1.15);
 if(Math.random()>ld.q.notice*(pressed?.75:1))return;
 const urgentOk=true,talkOk=b.time-ld.lastSay>=L.CFG.sayGap;
 if(urgentOk&&rearWarning(b,me))return;
 if(talkOk&&helpCall(b,me))return;
 if(talkOk&&switchCall(b,me))return;}
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
 const sold=party(b).filter(a=>fit(a)&&role(a)==='Soldat'&&!ld.hidden.includes(a.id));
 const engaged=E.filter(e=>{const t=b.actors.find(x=>x.id===e.target);return t&&t.team===0&&!isRanged(t)&&dist(e,t)<90;});
 const loose=E.filter(e=>!engaged.includes(e));
 for(const a of party(b)){const s=a.leadSkirmish;if(!s||!fit(a)||!isRanged(a))continue;
  if(s.mode!=='flank'&&engaged.length&&engaged.length>=Math.ceil(E.length/2)){s.mode='flank';if(cool(b,'flank',6)&&fit(me)){const arch=party(b).filter(x=>x.leadSkirmish&&fit(x)&&isRanged(x));say(b,me,fill(pick(['{N}, jetzt außen rum! In die Flanke schießen!','Schützen, raus an die Seite! Von außen!']),{N:names(arch)}),'flank');}}
  if(s.mode==='fwd'){const f=nearest(a,loose);if(f&&dist(a,f)<260){s.mode='back';if(cool(b,'back',6)&&fit(me)){const arch=party(b).filter(x=>x.leadSkirmish&&fit(x)&&isRanged(x));say(b,me,fill(pick(['{N}, zurück hinter die Schilde!','Schützen, Rückzug! Lockt sie zu uns!']),{N:names(arch)}),'back');}}}
  const goal=s.mode==='back'?s.rally:s.mode==='flank'?s.flank:null;if(!goal)continue;
  if(s.mode==='back'){const f=nearest(a,loose);if(!f||dist(a,f)>330)continue;}
  if(a.wind>0||a.pendingStrike||a.state==='dodge'||a.grabbedBy||a.fallTimer>0||a.kneeTimer>0)continue;
  const d=hyp(goal.x-a.x,goal.y-a.y);if(d<18)continue;const fl=L.follow(a.g),sp=(s.mode==='back'?82:58)*(1.15-fl.react*.25)*dt*(M.combatStepRate||1);
  a.x+=(goal.x-a.x)/d*Math.min(d,sp);a.y+=(goal.y-a.y)/d*Math.min(d,sp);a.moveSpeed=Math.max(a.moveSpeed||0,9);if(a.state==='idle')a.state='move';}
 void sold;}
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
L.simulate=function(seed,partyFactory,o={}){const mode=o.mode||'lead',party=partyFactory(seed),m=D.newMission(seed,party,o.biome||'wald',{kind:o.kind||'adventure',learn:false});
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
L.version='2026-10-22';
})();
