'use strict';
// Der Sklavenhändler: einzige Quelle neuer Gladiatoren. Jeden Spieltag genau fünf fertig erzeugte Kandidaten,
// die er angekettet durch das Südtor auf den Sklavenmarkt führt. Die fünf werden einmal pro Tag erzeugt und
// im Spielstand gehalten; Laden zeigt dieselben. Zeichnung und Bewegung laufen im vorhandenen Ludus-Takt mit.
(()=>{
const M=window.MG,S=M.s,A=M.army,B=M.barracks,$=id=>typeof document==='undefined'?null:document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PRICE=100,LOT=5,rand=(lo,hi)=>lo+Math.random()*(hi-lo),pick=a=>a[Math.floor(Math.random()*a.length)];
// ---------- Person ----------
const FIRST=['Gaius','Titus','Spurius','Aulus','Quintus','Manius','Servius','Decimus','Publius','Numerius','Vibius','Sextus'],
 CLAN=['Lucrius','Avarius','Catenius','Nummius','Rapacius','Vorenus','Mercatius','Gurgius','Crassius','Bullatius'],
 NICK=['Vorax','Pinguis','Rapax','Lucrio','Gurges','Crassipes','Bulla','Catenatus','Aurifex','Bucco'];
function sketch(){const skin=pick(M.skinPalette);return {name:pick(FIRST)+' '+pick(CLAN)+' '+pick(NICK),height:Math.round(rand(164,180)),weight:Math.round(rand(112,130)),appearance:{skin:skin[0],shade:skin[1],hair:pick(M.hairPalette),style:Math.floor(rand(0,3)),beard:Math.floor(rand(1,4)),cloth:'#6d3f80',voice:1}};}
const fresh=()=>({v:1,person:sketch(),day:0,lot:[],gone:false,arrived:0,intro:(S.roster.length||S.day>1||S.wins||S.losses)?'done':''});
S.trader??=fresh();const T=S.trader;T.person??=sketch();T.lot??=[];
const who=()=>T.person.name,short=()=>T.person.name.split(' ').pop();
let avatar=null;
function figure(){if(avatar?.p===T.person)return avatar.g;const rng=S.rng,g=M.makeGladiator(0);S.rng=rng;const p=T.person;Object.assign(g,{id:'slave-trader',name:p.name,height:p.height,weight:p.weight,age:51,fame:0,scars:[],muscle:38});g.appearance={...g.appearance,...p.appearance};g.stats.morale=90;g.equipment={weapon:null,secondary:null,shield:null,armor:{}};g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};avatar={p,g};return g;}
// ---------- Tagesware ----------
const left=()=>T.lot.filter(Boolean).length,started=()=>!!S.lanista&&(T.intro==='active'||T.intro==='done'),here=()=>started()&&T.day===S.day&&!T.gone&&left()>0;
function stock(){if(T.day===S.day&&T.lot.length===LOT)return false;T.lot=Array.from({length:LOT},()=>M.makeGladiator(0));T.day=S.day;T.gone=false;T.arrived=0;T.soldToday=0;M.persist();return true;}
function buy(i){const g=T.lot[i];if(!g||T.day!==S.day||T.gone)return false;if(S.gold<PRICE)return false;T.lot[i]=null;if(!A.buyCandidate(g,who())){T.lot[i]=g;return false;}T.soldToday=(T.soldToday||0)+1;if(!left())T.gone=true;M.persist();return g;}
// ---------- Sprüche ----------
const L={
 pitch:['FÜNF FRISCHE! Und diesmal können sogar vier davon laufen!','Hundert Gold! Dafür bekommst du anderswo nicht mal einen ordentlichen Esel!','Schau dir die Schultern an! Geboren für den Sand!','Ich beraube mich praktisch selbst! Meine Kinder werden hungern!','Reines Championblut! Vermutlich.','Zähne haben sie noch! Fast alle! Was willst du mehr?','Jeder einzelne ein künftiger Liebling der Massen. Ich habe ein Auge dafür!','Frisch vom Schiff! Riech mal! … Nein, lieber nicht.','Hundert das Stück, und die Kette schenke ich dir. Nein. Die Kette nicht.','Anderswo zahlst du das Dreifache! Anderswo lügen sie nämlich!','Keiner hustet! Seit heute Morgen!','Handverlesen! Von mir persönlich! Im Dunkeln, aber handverlesen!','Der Senat würde mich um diese Ware beneiden, wenn er wüsste, dass es mich gibt!','Garantie? Natürlich! Bis zum Tor!','Ich habe schon Kaisern verkauft! Also … einem Vetter. Von einem Koch.','Greif zu, bevor die Konkurrenz aufwacht!','Jeder davon frisst wenig und beschwert sich leise. Traumware!','Wer heute nicht kauft, weint morgen in der Arena!','So billig ist der Tod sonst nur im Krieg!','Qualität erkennt man am Preis. Hundert Gold. Also: Spitzenqualität!','Alle gesund! Ich habe sie selbst gefragt!','Ich bin der beste Menschenkenner des Imperiums. Frag jeden, den ich bezahle!','Fünf Stück! Wer alle nimmt, bekommt mein aufrichtiges Lächeln dazu!','Die laufen von allein! Meistens in die richtige Richtung!','Kaum gebraucht! Vorbesitzer leider verstorben. Ganz andere Sache.','Bei mir kauft man Zukunft! Manchmal eine kurze, aber Zukunft!','Hab ich dir schon von meinem Rabatt erzählt? Es gibt keinen!','Sieh dir diese Waden an. Die tragen dich bis in die Hauptstadt!','Meine Ware stirbt grundsätzlich erst nach dem Verkauf!','Hundert Gold. So ehrlich war ich die ganze Woche nicht!'],
 scold:['LOS! Gerade stehen! Wir sind hier schließlich bei Kundschaft!','Bauch rein, Brust raus! Wer krumm steht, schläft heute beim Esel!','Lächeln! Ihr sollt aussehen wie Sieger, nicht wie mein Frühstück!','Wer umfällt, zahlt mir die Reise zurück!','Du da! Hör auf zu atmen wie ein Fisch!','Nicht kratzen! Das drückt den Preis!','Augen geradeaus! Der Herr will Kämpfer sehen, keine Trauerweiden!','Wenn noch einer gähnt, verkaufe ich ihn an die Galeeren!','Kinn hoch! Für hundert Gold steht man stramm!','Wehe, einer erwähnt das Fieber!','Stillgestanden! Und keiner zählt laut seine Zähne!','Ihr blamiert mich vor dem besten Kunden, den ich heute habe!'],
 hello:['AH! Mein Lieblingskunde! Fünf Frische, wie versprochen!','Da bin ich wieder! Hast du mich vermisst? Dein Goldbeutel sicher nicht!','Neuer Tag, neue Ware! Die von gestern? Frag nicht.','Platz da! Qualität kommt durch!','Fünf neue! Besser als gestern! Das sage ich jeden Tag, und jeden Tag stimmt es!','Guten Morgen, Lanista! Rate, wer wieder die besten Preise des Imperiums hat!','Ich komme direkt vom Hafen. Die Guten habe ich für dich zurückgehalten! Alle fünf!'],
 offended:['Was?! Du gehst einfach? Vor MEINER Ware?','Zögern kostet! Also … morgen. Morgen kostet es!','Pah! Dann eben nicht. Ich habe drei andere Lanisten an der Hand. Fast.','Überleg nicht so lange, davon werden die nicht jünger!','Beleidige mich nicht mit deinem Blick! Das ist erste Wahl!','Ich merke mir das. Ich merke mir ALLES.','Gut, gut. Schau nur. Schauen ist noch umsonst. NOCH.','Du verletzt mich. Hier, im Geldbeutel.','So sieht ein Mann aus, der gleich bereut!','Feilschen? Mit MIR? Hundert bleibt hundert!'],
 sold:['Verkauft! Kette ab! Lauf, Junge, bevor er es sich anders überlegt!','HA! Ein Kenner! Der wird dir Freude machen. Oder ein Begräbnis.','Hundert Gold! Hörst du das Klimpern? Das ist Musik!','Weg mit ihm! Umtausch ausgeschlossen!','Gute Wahl! Das sage ich bei jedem, aber diesmal meine ich es fast!','Ab in die Kaserne mit dir! Und mach mir keine Schande!','Ein Geschäft unter Ehrenmännern! Zähl ruhig nach, ich tu es auch.','Der gehört jetzt dir! Die Flöhe auch!','Verkauft! Der Nächste, bitte, die Kette wird leichter!','So macht man Geschäfte! Schnell, bevor einer nachdenkt!'],
 empty:['HAHA! Endlich jemand mit Geschmack! Morgen bringe ich dir fünf neue!','Ausverkauft! Ich liebe diesen Ludus! Bis morgen, mein Freund!','Alle fünf! Du bist mein Lieblingsmensch! Morgen wieder, gleiche Zeit!','Leere Kette, voller Beutel. So mag ich das! Bis morgen!'],
 broke:['Kein Gold? Dann schau nicht so hungrig auf meine Ware!','Ohne Gold bist du für mich Luft. Schlechte Luft!','Hundert Gold oder weitergehen. Kredit gebe ich nur Toten!','Dein Beutel klingt wie mein Gewissen: leer!'],
 // Schlechte Werte werden schamlos zu Vorzügen.
 low:{tactics:['Denkt nicht viel nach. Hervorragende Eigenschaft für einen Kämpfer!','Der grübelt nicht, der schlägt zu. Meistens richtig herum!'],strength:['Schwach? Der schont nur seine Kräfte!','Nicht stark, aber leicht zu tragen, wenn es schiefgeht!'],stamina:['Kämpft kurz. Spart Zuschauern die Zeit!','Schnell außer Atem. Dann sind die Kämpfe wenigstens rasch vorbei!'],condition:['Schnauft ein wenig. Das schüchtert Gegner ein!'],agility:['Bewegt sich kaum. Ein Fels in der Brandung!','Langsam? Bedächtig! Würdevoll!'],dexterity:['Zwei linke Hände. Doppelt so viele linke Haken!'],reflex:['Reagiert spät. Dafür überrascht ihn nichts lange!','Lässt sich nicht hetzen. Ein Mann mit Ruhe!'],precision:['Trifft selten. Der Gegner weiß nie, wohin er zielt!'],block:['Braucht keinen Schild. Spart dir Geld!'],balance:['Fällt leicht hin. Unten trifft ihn keiner am Kopf!'],toughness:['Zart gebaut. Blutet sehr dekorativ!'],pain:['Schreit laut. Das Publikum liebt Gefühl!'],will:['Gibt schnell auf. Lebt dadurch länger. Kluger Junge!'],aggression:['Friedfertig. Fängt wenigstens keinen Streit in der Kaserne an!'],teamwork:['Einzelgänger. Teilt den Ruhm mit niemandem!'],experience:['Lernt langsam. Dafür vergisst er auch nichts, weil er nichts weiß!']},
 thin:['Schmal? Unsinn! Aerodynamisch!','Dünn wie ein Speer. Und ein Speer ist eine Waffe!'],fat:['Das ist kein Fett, das ist Rüstung von innen!','Vorräte für den Winter, alles dabei!'],small:['Der Kleine? Unterschätz ihn nicht. Der hat schon drei Männer überlebt. Wie, verrate ich nicht.','Klein! Kleines Ziel! Reine Mathematik!'],tall:['Den siehst du noch vom letzten Rang! Die Zuschauer danken es dir!','Lang wie ein Wachturm. Fällt auch so, aber erst später!'],old:['Reifer Jahrgang! Erfahrung kann man nicht kaufen. Doch. Hier. Für hundert.','Alt? Der hat alle überlebt, die jünger waren!'],young:['Jung und formbar! Hat noch keine eigenen Ideen!','Blutjung! Hält ewig! Wahrscheinlich.'],
 weak:['Unbeschriebenes Pergament! Genau dafür bezahlt man doch!','Kann noch nichts. Also macht er auch nichts falsch!','Roh wie frischer Marmor. Du bist der Bildhauer!'],
 trait:{Feige:['Weiß genau, wann man rennt. Ein Überlebenskünstler!'],Egoistisch:['Denkt zuerst an sich. Also an dein Eigentum!'],Verletzungsanfällig:['Kennt bald jeden Medicus mit Vornamen. Beziehungen sind alles!'],Spätentwickler:['Der kommt noch. Irgendwann. Ganz bestimmt!'],Berserker:['Beißt. Aber nur, wenn man ihn ansieht!'],Blutrünstig:['Hat Freude an der Arbeit. Selten heutzutage!'],Aggressiv:['Temperament! Den musst du nicht anfeuern, nur loslassen!'],Gelassen:['Die Ruhe selbst. Hat sogar die Überfahrt verschlafen!'],Mutig:['Mutig! Hat mir zweimal widersprochen. Lebt trotzdem!'],Loyal:['Treu wie ein Hund. Frisst auch so!'],Diszipliniert:['Steht stramm, sobald man hustet!'],Taktiker:['Ein Denker! Hat dreimal versucht, die Kette zu öffnen. Fast geschafft!'],Teamspieler:['Verträgt sich mit jedem. Sogar mit mir!'],Zäh:['Zäh wie altes Leder. Schmeckt vermutlich auch so!'],'Schneller Lerner':['Lernt schnell! Kannte nach einem Tag alle meine Flüche!']},
 // Bei echten Ausnahmetalenten kippt sein Ton: gierig, nervös, überschwänglich.
 gem:['Der da? Äh. Nichts Besonderes. Wirklich nicht. Hundert Gold, schnell, bevor ich nachdenke!','Hm. Den wollte ich eigentlich selbst behalten. … Hundert. Aber SOFORT!','Starr ihn nicht so an! Das ist ein ganz gewöhnlicher … hrm … Hundert Gold, wie alle!','Bei dem juckt mir die Nase. Die juckt nur bei Gold. Nimm ihn, ehe ich den Preis verdopple!','Ich sollte tausend verlangen. Ich SOLLTE tausend verlangen! … Hundert. Ich hasse mich.'],
 jewel:['BEI ALLEN GÖTTERN, nicht so laut! Der da ist … egal. Hundert. Meine Hände zittern nur vom Wetter!','Den habe ich einem König versprochen! Zwei Königen! Hundert Gold, und du hast mich nie gesehen!','Schau weg! Nein, schau hin! Nein … hundert Gold, und ich weine heute Nacht in meinen Beutel!'],
 talk:['AH! Der neue Ludus! Genau der Mann, den ich gesucht habe!','{N}, bester Menschenkenner des Imperiums! Fünf Frische. Jeden Tag fünf neue!','Hundert Gold das Stück. Ich beraube mich praktisch selbst!']
};
const bags={};function draw(key,list){let b=bags[key];if(!b||!b.length){b=bags[key]=list.map((_,i)=>i).sort(()=>Math.random()-.5);}return list[b.pop()];}
const hash=id=>{let n=7;for(const c of String(id))n=(n*31+c.charCodeAt(0))>>>0;return n;};
// Was er über genau diesen Kandidaten behaupten kann. Der erste Eintrag ist fest pro Person (für die Karte).
function claims(g){const d=B.info(g),out=[];
 if(d.tier.level>=8)out.push(...L.jewel);else if(d.tier.level>=6)out.push(...L.gem);
 const stats=Object.entries(g.stats).filter(([k])=>L.low[k]).sort((a,b)=>a[1]-b[1]);
 const spins=[];for(const [k] of stats.slice(0,2))spins.push(...L.low[k]);
 const bmi=g.weight/((g.height/100)**2);if(bmi<21.5)spins.push(...L.thin);if(bmi>26.5)spins.push(...L.fat);if(g.height<170)spins.push(...L.small);if(g.height>191)spins.push(...L.tall);if(g.age>=32)spins.push(...L.old);if(g.age<=19)spins.push(...L.young);
 for(const t of g.traits||[])if(L.trait[t])spins.push(...L.trait[t]);
 const ranks=T.lot.filter(Boolean).map(x=>B.info(x).kw).sort((a,b)=>a-b);if(ranks.length>1&&d.kw<=ranks[0])spins.push(...L.weak);
 const h=hash(g.id);if(spins.length){const first=spins[h%spins.length];out.push(first,...spins.filter(s=>s!==first));}
 if(!out.length)out.push(L.pitch[h%L.pitch.length]);return out;}
const pitchFor=g=>claims(g)[0];
// ---------- Szene im Ludus ----------
const ROW_Y=432,WALK_Y=441,slotX=i=>78+i*36,POST=[250,419],
 IN=[[610,694],[610,607],[301,607],[301,420],[226,420],[222,ROW_Y],[slotX(0),ROW_Y]],T_IN=[[610,694],[610,607],[301,607],[301,WALK_Y],[268,WALK_Y]],DOOR=[[301,420],[301,214],[172,214]];
const plen=p=>{let n=0;for(let i=1;i<p.length;i++)n+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);return n;};
function along(p,d){if(d<=0)return {x:p[0][0],y:p[0][1],a:Math.atan2(p[1][1]-p[0][1],p[1][0]-p[0][0]),end:false};for(let i=1;i<p.length;i++){const dx=p[i][0]-p[i-1][0],dy=p[i][1]-p[i-1][1],l=Math.hypot(dx,dy);if(d<=l)return {x:p[i-1][0]+dx*d/l,y:p[i-1][1]+dy*d/l,a:Math.atan2(dy,dx),end:false};d-=l;}const q=p[p.length-1];return {x:q[0],y:q[1],a:0,end:true};}
const actor=(g,x,y,extra)=>({g,team:0,x,y,a:0,state:'idle',phase:0,moveSpeed:0,energy:100,ammo:0,...extra});
let sc=null,tut=null,bar=null,cardOpen=-1,boughtSinceOpen=false,settle=0,soundGap=0;
const page=()=>M.ui?.getPage?.(),onHome=()=>page()==='home'&&!S.battle;
function sound(kind){if(soundGap>0||!onHome())return;soundGap=.35;M.sound?.(kind);}
function build(){const march=T.arrived!==T.day,t=actor(figure(),268,WALK_Y,{trader:true,index:40});
 sc={day:T.day,mode:march?'march':'stand',lead:0,clock:0,trader:t,row:T.lot.map((g,i)=>g?actor(g,slotX(i),ROW_Y,{slot:i,shackled:true,unarmored:true,index:41+i}):null),walkers:[],say:null,act:null,next:1.2,quote:march?1:3,hidden:new Set()};
 if(march){place();sound('block');}else t.a=Math.PI;}
function place(){const t=sc.trader,p=along(T_IN,sc.lead);t.x=p.x;t.y=p.y;const moving=!p.end;t.a=moving?(Math.cos(p.a)<-.3?Math.PI:Math.cos(p.a)>.3?0:t.a):Math.PI;t.state=moving?'move':'idle';t.moveSpeed=moving?10:0;t.phase=sc.clock*7;let done=p.end;
 const total=plen(IN);sc.row.forEach((c,j)=>{if(!c)return;const goal=total-(slotX(j)-slotX(0)),d=Math.min(sc.lead-34*(j+1),goal),q=along(IN,d),still=d>=goal;c.x=q.x;c.y=q.y;c.a=still?0:Math.cos(q.a)<-.3?Math.PI:Math.cos(q.a)>.3?0:c.a;c.state=still||d<=0?'idle':'move';c.moveSpeed=still?0:10;c.phase=sc.clock*7+j*1.3;if(!still)done=false;});return done;}
function say(text,dur){if(!sc||!text)return;sc.say={text:text.replaceAll('{N}',who()),t:dur||Math.min(10,3.6+text.length*.08)};sc.quote=sc.say.t+rand(4,8);}
function near(c,side=1){return {x:c.x+22*side,y:WALK_Y};}
function begin(kind,target){const t=sc.trader,c=target!=null?sc.row[target]:null;sc.act={kind,target,t:0,dur:{pace:9,point:1.9,rant:2,coins:2.6,inspect:2.4,pat:1.5,pull:1.6,shout:2.2,whip:.95}[kind],goal:kind==='pace'?{x:rand(70,266),y:WALK_Y}:c?near(c):null,started:!c&&kind!=='pace'};
 if(kind==='shout'){t.a=0;say(draw('pitch',L.pitch));}else if(kind==='rant'){t.a=Math.PI;say(draw('scold',L.scold));}else if(kind==='whip'){t.a=Math.PI;}else if(kind==='coins')t.a=0;}
function idle(dt){const t=sc.trader,a=sc.act;if(!a){sc.next-=dt;t.state='idle';t.moveSpeed=0;t.traderPose=null;if(sc.next>0)return;const alive=sc.row.filter(Boolean),quiet=tut&&tut.step!=='buy',kinds=quiet?['pace','coins','whip']:['pace','pace','shout','shout','rant','coins','whip'];if(alive.length&&!quiet)kinds.push('point','point','inspect','pat','pull');const kind=pick(kinds);begin(kind,['point','inspect','pat','pull'].includes(kind)?pick(alive).slot:null);return;}
 if(a.goal&&!a.started){const dx=a.goal.x-t.x,dist=Math.abs(dx),step=46*dt;t.y=WALK_Y;if(dist<=step){t.x=a.goal.x;if(a.kind==='pace'){finish();return;}a.started=true;t.a=Math.PI;t.state='idle';t.moveSpeed=0;const g=sc.row[a.target]?.g;if(!g){finish();return;}if(a.kind!=='pull')say(draw('c'+g.id,claims(g)));}else{t.x+=Math.sign(dx)*step;t.a=dx>0?0:Math.PI;t.state='move';t.moveSpeed=10;t.phase=sc.clock*7;}return;}
 a.t+=dt;t.traderPose=a.kind;t.poseK=Math.min(1,a.t/a.dur);t.gest=sc.clock;const c=a.target!=null?sc.row[a.target]:null;
 if(a.kind==='whip'&&!a.cracked&&t.poseK>=.62){a.cracked=true;sound('slash');for(const r of sc.row)if(r)r.jolt=.35;if(!tut&&Math.random()<.5)say(draw('scold',L.scold));}
 if(c&&a.kind==='pull')c.x=slotX(c.slot)+Math.sin(t.poseK*Math.PI)*9;if(c&&a.kind==='pat')c.jolt=.12;
 if(a.t>=a.dur){if(c)c.x=slotX(c.slot);finish();}}
function finish(){sc.act=null;sc.next=rand(.6,2.2);sc.trader.traderPose=null;}
function update(dt){if(soundGap>0)soundGap-=dt;if(!sc)return;sc.clock+=dt;const t=sc.trader;t.gest=sc.clock;
 if(sc.say){sc.say.t-=dt;if(sc.say.t<=0)sc.say=null;}
 for(const c of sc.row)if(c&&c.jolt>0)c.jolt-=dt;
 if(sc.mode==='march'){sc.lead+=64*dt;if(!sc.cue1&&sc.lead>70){sc.cue1=true;sound('slash');say(draw('hello',tut?['HE DA! Platz für Qualität!']:L.hello));}if(!sc.cue2&&sc.lead>330){sc.cue2=true;sound('block');}
  if(place()){sc.mode='stand';T.arrived=T.day;M.persist();t.a=Math.PI;begin('whip');}}
 else if(sc.mode==='stand'){idle(dt);sc.quote-=dt;if(sc.quote<=0&&!sc.say&&!sc.act&&!tut)say(draw('pitch',L.pitch));}
 else if(sc.mode==='leave'){sc.wait-=dt;if(sc.wait>0){t.state='celebrate';t.traderPose=null;}else{sc.lead+=78*dt;const p=along(sc.out,sc.lead);t.x=p.x;t.y=p.y;t.state='move';t.moveSpeed=10;t.phase=sc.clock*7;t.a=Math.cos(p.a)<-.3?Math.PI:0;if(p.end){sc=null;return;}}}
 for(const w of sc.walkers){w.d+=70*dt;const p=along(w.path,w.d);w.a.x=p.x;w.a.y=p.y;w.a.a=Math.cos(p.a)<-.3?Math.PI:Math.cos(p.a)>.3?0:w.a.a;w.a.state='move';w.a.moveSpeed=10;w.a.phase=sc.clock*7+w.d*.01;if(p.end)w.done=true;}
 if(sc.walkers.some(w=>w.done)){for(const w of sc.walkers)if(w.done)sc.hidden.delete(w.a.g.id);sc.walkers=sc.walkers.filter(w=>!w.done);M.ludus?.refresh?.();}}
function release(i,g){if(!sc)return;const c=sc.row[i];sc.row[i]=null;if(!c)return;if(sc.act?.target===i)finish();sc.hidden.add(g.id);sc.walkers.push({a:actor(g,c.x,c.y,{index:50+i}),d:0,path:[[c.x,ROW_Y],[c.x+6,420],...DOOR]});
 if(!left()){say(tut?L.empty[0]:draw('empty',L.empty),6);sc.mode='leave';sc.act=null;sc.wait=5;sc.lead=0;sc.out=[[sc.trader.x,WALK_Y],[301,WALK_Y],[301,607],[610,607],[610,700]];}else say(draw('sold',L.sold));}
function ensureScene(){const want=here()||(sc&&(sc.mode==='leave'||sc.walkers.length));if(!want){sc=null;return;}if(!sc||(sc.day!==T.day&&here()))build();}
// ---------- Zeichnen: Figuren über die vorhandene Ludus-Darstellung, dazu Kette, Markierung und Sprechblase ----------
function chain(ctx,a,b,sag){const n=Math.max(2,Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])/4));for(let k=0;k<=n;k++){const u=k/n,x=a[0]+(b[0]-a[0])*u,y=a[1]+(b[1]-a[1])*u+Math.sin(u*Math.PI)*sag;ctx.fillStyle=k%2?'#2c3031':'#7d8687';ctx.fillRect(Math.round(x)-1,Math.round(y),2,2);}}
const wrist=c=>[c.x+(Math.cos(c.a)>=0?5:-5),c.y-21-(c.jolt>0?1:0)];
function bubble(ctx,text,x,y){ctx.font='700 13px "Courier Prime","Courier New",monospace';ctx.textAlign='left';ctx.textBaseline='top';const words=text.split(' '),lines=[];let cur='';for(const w of words){const next=cur?cur+' '+w:w;if(ctx.measureText(next).width>214&&cur){lines.push(cur);cur=w;}else cur=next;}if(cur)lines.push(cur);
 const w=Math.ceil(Math.max(...lines.map(l=>ctx.measureText(l).width)))+16,h=lines.length*16+11,bx=Math.round(Math.max(6,Math.min(894-w,x-w/2))),by=Math.round(Math.max(6,y-h));
 ctx.fillStyle='#10181a';ctx.fillRect(bx-2,by-2,w+4,h+4);ctx.fillStyle='#e0b565';ctx.fillRect(bx-1,by-1,w+2,h+2);ctx.fillStyle='#1f2b25';ctx.fillRect(bx,by,w,h);const tx=Math.round(Math.max(bx+8,Math.min(bx+w-14,x)));ctx.fillStyle='#e0b565';ctx.fillRect(tx-1,by+h,8,3);ctx.fillRect(tx+1,by+h+3,4,3);ctx.fillStyle='#1f2b25';ctx.fillRect(tx,by+h-1,6,3);ctx.fillRect(tx+2,by+h+2,2,2);
 ctx.fillStyle='#f1e3b8';lines.forEach((l,i)=>ctx.fillText(l,bx+8,by+6+i*16));}
function overlay(ctx){const row=sc.row.filter(Boolean),t=sc.trader;
 for(let i=1;i<row.length;i++)chain(ctx,wrist(row[i-1]),wrist(row[i]),5);
 if(row.length){if(sc.mode==='march'&&t.state==='move')chain(ctx,[t.x+(Math.cos(t.a)>=0?-7:7),t.y-22],wrist(row[0]),4);else if(sc.mode!=='march')chain(ctx,wrist(row[row.length-1]),POST,6);}
 if(tut?.step==='buy'&&sc.mode==='stand'){const c=sc.row[tut.index];if(c){const p=(Math.sin(sc.clock*5)+1)/2;ctx.fillStyle='#f4d37a';for(let n=0;n<3;n++)ctx.fillRect(Math.round(c.x-7+n*2),Math.round(c.y-76-p*6+n*4),14-n*4,4);ctx.globalAlpha=.55+p*.45;ctx.strokeStyle='#f4d37a';ctx.lineWidth=2;ctx.strokeRect(Math.round(c.x-15)-.5,Math.round(c.y-62)-.5,30,68);ctx.globalAlpha=1;}}
 if(sc.say&&t.y<672)bubble(ctx,sc.say.text,t.x,t.y-74);}
const drawActors=M.renderLudusActors;
M.renderLudusActors=(ctx,list)=>{if(!sc||ctx.canvas?.id!=='ludusCanvas')return drawActors(ctx,list);const mine=[sc.trader,...sc.row.filter(Boolean),...sc.walkers.map(w=>w.a)].filter(a=>a.y<690);drawActors(ctx,[...list,...mine].sort((a,b)=>a.y-b.y));overlay(ctx);};
M.ludusHidden=g=>!!sc?.hidden.has(g.id);
M.ludusHit=(x,y)=>{if(!sc||sc.mode==='leave')return false;const hit=a=>a&&x>a.x-17&&x<a.x+17&&y>a.y-64&&y<a.y+10,c=[...sc.row].reverse().find(hit);if(c){open(c.slot);return true;}if(hit(sc.trader)){open();return true;}return false;};
// ---------- Kandidatenkarte ----------
const ICON={Soldat:'🛡',Assassine:'🗡',Fernkämpfer:'🏹'},stars=n=>'★'.repeat(Math.round(n/2))+'☆'.repeat(5-Math.round(n/2)),weapon=id=>M.weaponDefs.find(w=>w.id===id)?.name||id;
function cardHtml(i){const g=T.lot[i],d=B.info(g),an=B.analysis(g,d),marks=[...an.plus.slice(0,3).map(x=>`<span class="tr-plus">＋ ${esc(x.text)}</span>`),...an.minus.slice(0,2).map(x=>`<span class="tr-minus">− ${esc(x.text)}</span>`)],locked=tut?.step==='buy';
 return `<div class="tr-card bk-t${d.tier.level}"><p class="tr-quote"><b>${esc(short())}:</b> „${esc(pitchFor(g))}“</p>
<nav class="tr-tabs" aria-label="Heutige Ware">${T.lot.map((x,n)=>x?`<button class="btn small${n===i?' active':''}" data-action="trader:show:${n}" aria-pressed="${n===i}"${locked&&n!==i?' disabled':''}>${['I','II','III','IV','V'][n]}</button>`:`<span class="tr-gone" title="Verkauft">${['I','II','III','IV','V'][n]}</span>`).join('')}</nav>
<div class="tr-head"><canvas id="traderPortrait" width="80" height="100" aria-label="${esc(g.name)}"></canvas><div><h3>${esc(g.name)}</h3><p>${g.age} Jahre · ${esc(g.origin)}<br>${g.height} cm · ${g.weight} kg</p><p class="tr-kw">Kampfwert <b>${d.kw}</b></p><p class="bk-talent"><span class="bk-stars" aria-hidden="true">${stars(d.tier.level)}</span> <strong>${d.tier.name.toUpperCase()}</strong> · Talent ${d.talent}</p></div></div>
<div class="tr-classes">${M.roles.map(r=>{const c=d.classes[r];return `<div class="tr-class${d.best===r?' best':''}"><span>${ICON[r]} ${r.toUpperCase()}</span><span>${Math.round(c.ist)} → <b>${Math.round(c.pot)}</b></span><small>${esc(weapon(c.weapon))} ★${Math.round(c.weaponPot)}</small></div>`;}).join('')}</div>
<p class="tr-traits">${[...(g.traits||[]).map(t=>`<span>${esc(t)}</span>`),...marks].join('')||'<span>Nichts Auffälliges</span>'}</p>
<div class="tr-buy"><span>Preis <b>${PRICE} Gold</b> · du hast ${Math.round(S.gold).toLocaleString('de-DE')}</span><button class="btn primary" data-action="trader:buy:${i}"${S.gold<PRICE?' disabled':''}>KAUFEN – ${PRICE} GOLD</button></div></div>`;}
function open(i){if(!here()){M.ui.notify(started()?short()+' ist für heute fort. Morgen bringt er fünf neue.':'Noch ist kein Händler da.');return false;}
 if(tut&&tut.step!=='buy')return false;if(tut)i=tut.index;if(i==null||!T.lot[i])i=T.lot.findIndex(Boolean);const first=cardOpen<0||$('modal')?.hidden!==false;cardOpen=i;if(first)boughtSinceOpen=false;
 M.ui.modal(`HEUTIGE WARE – ${left()}/${LOT} NOCH VERFÜGBAR`,cardHtml(i));const c=$('traderPortrait');if(c)M.renderPortrait(c,T.lot[i],{unarmored:true});hideBar();return true;}
function purchase(i){if(S.gold<PRICE){M.ui.notify('Nicht genug Gold.');say(draw('broke',L.broke));return;}const g=buy(i);if(!g){M.ui.notify('Dieser Kandidat ist nicht mehr zu haben.');return;}
 boughtSinceOpen=true;cardOpen=-1;M.sound?.('gold');M.ui.close();if(sc)sc.hidden.add(g.id);M.ui.render();release(i,g);M.ui.notify(g.name+' gehört jetzt zu deinem Ludus · −'+PRICE+' Gold');
 if(tut){if(left()&&S.gold>=PRICE){tut.index=T.lot.findIndex(Boolean);tut.pause=2.2;}else endTutorial(!left());}}
// ---------- Erste Begegnung: kurze gescriptete Szene nach der Schmied-Einführung ----------
function showBar(html){if(typeof document==='undefined')return;if(!bar){bar=document.createElement('div');bar.id='traderBar';bar.className='smith-intro-bar trader-bar';bar.setAttribute?.('role','status');document.body.appendChild(bar);}if(bar._html!==html){bar.innerHTML=html;bar._html=html;}}
function hideBar(){bar?.remove?.();bar=null;}
function startTutorial(){T.intro='active';stock();M.persist();tut={step:'march',line:0,t:0,index:0};M.ui.close();if(page()!=='home')M.ui.click('nav:home');else M.ui.render();$('ludusCanvas')?.scrollIntoView?.({block:'center'});M.ludus?.focus?.(330,470);}
function endTutorial(all){T.intro='done';M.persist();tut={step:'bye',t:0,all};}
function tutorial(dt){if(!tut)return;if(!onHome()){hideBar();return;}if(cardOpen>=0&&$('modal')?.hidden===false)return;const skip='';
 if(tut.step==='march'){showBar(`<p class="hint">Kettenrasseln am Tor. Eine Peitsche knallt.</p><div class="buttons">${skip}</div>`);if(!sc||sc.mode==='stand'){tut.step='talk';tut.line=0;tut.t=0;say(L.talk[0],6.5);}}
 else if(tut.step==='talk'){tut.t+=dt;showBar(`<p><b>${esc(who())}</b></p><p>„${esc(L.talk[tut.line].replaceAll('{N}',who()))}“</p><div class="buttons"><button class="btn primary" data-action="trader:next">WEITER →</button>${skip}</div>`);if(tut.t>7)nextLine();}
 else if(tut.step==='buy'){if(tut.pause>0){tut.pause-=dt;return;}const n=LOT-left()+1;showBar(`<p>Jeden Tag fünf neue. <b>${PRICE} Gold</b> pro Kopf.</p><p class="hint">Klicke auf den markierten Kandidaten · ${n}/${LOT}</p><div class="buttons">${skip}</div>`);}
 else if(tut.step==='bye'){tut.t+=dt;showBar(`<p>${tut.all?'Ab morgen kaufst du nur, wen du willst.':'Für heute reicht das Gold nicht weiter.'}</p><p class="hint">${esc(short())} kommt jeden Tag mit fünf neuen. Wer bleibt, ist am Abend fort.</p><div class="buttons"><button class="btn primary" data-action="trader:ok">VERSTANDEN</button></div>`);if(tut.t>22){tut=null;hideBar();}}}
function nextLine(){if(!tut||tut.step!=='talk')return;tut.line++;tut.t=0;if(tut.line>=L.talk.length){tut.step='buy';tut.index=T.lot.findIndex(Boolean);tut.pause=0;if(sc?.act)finish();return;}say(L.talk[tut.line],6.5);}
function resume(){if(T.intro==='active'&&!tut){if(!here()){T.intro='done';M.persist();return;}tut={step:T.arrived===T.day?'buy':'march',line:0,t:0,index:Math.max(0,T.lot.findIndex(Boolean)),pause:0};}}
// ---------- Einhängen: Takt, Klicks, Tageswechsel ----------
const tick=M.ludusTick;M.ludusTick=dt=>{const step=Math.min(dt,.1);
 if(typeof document==='undefined'||!document.hidden){const busy=S.battle||M.intro?.active?.()||window.ArenaTheoryIntro?.active?.(),F=M.workshop?.state;
  if(T.intro===''&&S.lanista&&!busy&&page()!=='profiles'&&(!F||F.intro==='done'||!F.intro)&&!M.forgeIntro?.scene){settle+=step;if(settle>.9)startTutorial();}else settle=0;
  if(!busy){resume();if(onHome()){ensureScene();update(step);}else if(sc){if(sc.mode==='march'){T.arrived=T.day;}sc=null;}tutorial(step);}else hideBar();}
 tick?.(dt);};
const click=M.schoolClick;M.schoolClick=action=>{
 if(action.startsWith('trader:')){const [,key,n]=action.split(':');if(key==='show')open(+n);else if(key==='buy')purchase(+n);else if(key==='next')nextLine();else if(key==='skip'){T.intro='done';M.persist();tut=null;hideBar();}else if(key==='ok'){tut=null;hideBar();}return true;}
 if(action==='close'&&cardOpen>=0){cardOpen=-1;if(!boughtSinceOpen&&sc&&!tut)say(draw('offended',L.offended));return click(action);}
 if(action==='nav:market'){if(tut&&tut.step!=='buy')return true;if(page()!=='home'){M.ui.close();M.ui.click('nav:home');}open();return true;}
 if(tut&&tut.step!=='bye'&&!S.battle&&((action.startsWith('nav:')&&action!=='nav:home')||action.startsWith('detail:')||action==='ludus:owner')){M.ui.notify(tut.step==='buy'?'Erst die Ware: Klicke auf den markierten Kandidaten.':short()+' redet gerade.');return true;}
 if(action.startsWith('nav:'))cardOpen=-1;return click(action);};
const nextDay=A.nextDay;A.nextDay=(...a)=>{const day=S.day,out=nextDay(...a);if(S.day!==day&&started()){sc=null;cardOpen=-1;stock();}return out;};M.advanceDay=A.nextDay;
if(started()&&T.day!==S.day)stock();
M.trader={state:T,price:PRICE,size:LOT,lines:L,left,here,stock,buy,open,claims,pitchFor,figure,get scene(){return sc;},get tutorial(){return tut;},skipMarch(){if(sc?.mode==='march'){sc.lead=9999;}},startTutorial};
})();
