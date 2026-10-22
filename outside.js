'use strict';
/* =====================================================================================================
   AUSSENWELT · Einbindung ins Spiel
   · Quest „Der Schuldeneintreiber“: startet von selbst, sobald alle Tutorials durch sind (Hühnerschule beendet,
     Box-Tutorial abgeschlossen, falls vorhanden Bogenhändler-Kapitel erledigt) und nichts anderes läuft. Szene im Ludus, danach Tor in der rechten Mauer.
   · Nach der Quest: zufällige Abenteuer (Dorf, Wald, Stadt), höchstens eins pro Spieltag.
   · Gruppe: 1 bis 10 echte Gladiatoren aus dem Kader. Verletzungen, Erschöpfung, Lernen und Tod gelten wirklich.
     Beute (fallengelassene Waffen und Schilde der Gegner) und Gold kommen ins Lager bzw. in die Kasse.
   · Speicher: S.outside = {stage,tries,wins,adventures,advWins,lastAdventure,quest,adv,history,run,seenBoard}
     stage: '' (gesperrt) → 'intro' (Szene ausstehend) → 'open' (Quest offen) → 'done' (Quest erledigt, Abenteuer frei).
     Der laufende Missionskampf wird nicht gespeichert (S.battle.toJSON → null). Lädt man mitten in einer Mission neu,
     ist die Truppe einfach zurück (Eintrag „abgebrochen“), Verletzungen bleiben.
   · Anschlüsse: M.ludusOverlay (Tor zeichnen), M.ludusHit (Tor anklicken), M.ludusTick (Szene starten),
     M.schoolPage/M.schoolClick (Seite „outside“), M.armyBattleHUD (Missionsleiste statt Arena-Leiste),
     M.endBenchmark (Missionskampf-Ende), M.battleCamera (Kamera folgt der Truppe), M.missionBackdrop/M.drawSprite (arena.js).
   Logik: outside-core.js (window.Debt), Grafik: outside-art.js (window.DebtArt). Testseite: aussenwelt-test.html.
   ===================================================================================================== */
(()=>{
const M=window.MG,S=M.s,D=window.Debt,A=window.DebtArt;if(!M||!D||!A)return;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,k)=>a+(b-a)*k,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ROLE_ICON={Soldat:'🛡',Assassine:'🗡',Fernkämpfer:'🏹'};
const pickL=l=>l[Math.floor(Math.random()*l.length)];
const ST=()=>{const o=S.outside??={stage:'',tries:0,wins:0,adventures:0,advWins:0,lastAdventure:0,quest:null,adv:null,history:[],run:null,seenBoard:false};o.history??=[];return o;};
const persist=()=>{try{M.persist();}catch(e){}};
const notify=t=>{try{M.ui.notify?.(t);}catch(e){}};
const school=()=>S.schoolName||'Ludus';

// ---------- Freischaltung: nach allen Tutorials ----------
// Gibt es das Bogenhändler-Kapitel (bogner.js, S.bowyer), gehört es auch dazu.
const tutorialsDone=()=>S.huehner?.stage==='end'&&!!S.box?.tutDone&&(!M.bowyer||S.bowyer?.stage==='done');
const busy=()=>!!S.battle||!!F.running||!!M.bowyerFilm?.active||[...document.querySelectorAll('[aria-modal="true"]')].some(e=>e.id!=='owFilm'&&!e.hidden&&e.getClientRects?.().length>0)||!!M.boxGame?.introActive||!!M.medic?.film||!!M.medic?.guide||!!M.lionChapter?.film||!!M.lionChapter?.guide||!!M.smithWrath?.scene||!!M.archerPlot?.scene||!!M.archerPlot?.ready?.()||!!M.hall?.film||!!M.doktor?.film||!!M.intro?.active?.()||!!window.ArenaTheoryIntro?.active?.()||!!M.trader?.tutorial||!!M.forgeIntro?.scene||
 !!document.querySelector('.smith-ceremony,#introView,#brandIntro,.medic-night,.medic-end,.medic-start,.lesson-start,.lesson-end,.hs-end,.hs-film,.dok-card-end,.an-pres,#an:not([hidden]),#boxIntro,.ws-scene')||($('modal')&&!$('modal').hidden);
M.outside={state:ST,tutorialsDone,get running(){return !!R.m;},get film(){return F.running;},open:()=>openBoard(),intro:()=>playIntro(),adventureReady:()=>adventureReady()};

// =====================================================================================================
// SZENE IM LUDUS: Der Schuldeneintreiber
// =====================================================================================================
const actor=(g,o={})=>({id:g.id,g,team:0,x:0,y:0,a:0,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,bloodMarks:{},...o});
const CAST={};
function smithG(){const p=M.workshop?.state?.master;if(!p)return D.makeG(1312,g=>{Object.assign(g,{id:'ow-smith',name:'Der Schmied',height:186,weight:104,muscle:58});g.appearance={...g.appearance,style:0,beard:2,hair:'#3a2a1e',cloth:'#4a3a2a'};g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};});
 return D.makeG(1312,g=>{Object.assign(g,{id:'ow-smith',name:p.name,height:p.height||186,weight:p.weight||104,muscle:58,fame:0,scars:[]});if(p.appearance)g.appearance={...p.appearance};g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};});}
function buildCast(){
 CAST.lan=S.lanista?M.ludus.ownerFigure(S.lanista):D.makeG(4242,g=>{g.name='Lanista';g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};});
 CAST.smith=smithG();
 CAST.oro=D.makeG(70707,g=>{Object.assign(g,{id:'ow-oro',name:'Orontes Pfeilkopf',height:167,weight:60,age:63,muscle:22});g.appearance={...g.appearance,skin:'#c08a5c',shade:'#83553a',hair:'#d5d0ba',style:5,beard:2,cloth:'#6b2f73',voice:1};g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};});
 CAST.kra=D.boss(1);
 CAST.g1=D.henchman(4711,1);CAST.g1.name='Titus der Zahnlose';CAST.g1.enemyGear.weapon=M.makeItem('weapon','club',0);CAST.g1.enemyGear.shield=null;CAST.g1.teeth={missing:[1,2,4,5,6],gold:[]};
 CAST.g2=D.henchman(4712,2);CAST.g2.name='Gnaeus Brecheisen';CAST.g2.enemyGear.weapon=M.makeItem('weapon','mace',1);CAST.g2.enemyGear.shield=null;
 CAST.party=S.roster.filter(g=>!g.dead&&!g.smithDuty).slice(0,5);}
const WHO={L:()=>CAST.lan,K:()=>CAST.kra,G1:()=>CAST.g1,G2:()=>CAST.g2,SM:()=>CAST.smith,O:()=>CAST.oro};
const NAME=w=>({L:S.lanista?.name||'Lanista',K:'Krassus Knochenzins',G1:'Titus der Zahnlose',G2:'Gnaeus Brecheisen',SM:M.workshop?.state?.master?.name||'Der Schmied',O:'Orontes Pfeilkopf',N:''})[w]??'';
function paintFace(cv,g,mood='calm',o={}){if(!cv)return;const ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,cv.width,cv.height);if(!g)return;
 try{M.faceShot.paint(ctx,cv.width,cv.height,{g,team:o.team??0,mood,yaw:o.yaw??-.25,zoom:o.zoom||1.05,lines:0,clear:true,crossEyes:g===CAST.oro,...o},o.t??60);}catch(e){}
 if(g===CAST.kra||g.debtBoss&&!g.advLeader)A.krassusFace(ctx,cv.width,cv.height);if(g===CAST.oro)A.oroFace(ctx,cv.width,cv.height);}

const F={t:0,actors:{},cam:{x:450,y:335,vw:900},camTo:null,shake:0,speaker:null,running:false,bg:null,skip:false,raf:0};
const LW=900,LH=670;
function walker(a,dt){if(!a.to)return false;const [tx,ty,sp]=a.to,dx=tx-a.x,dy=ty-a.y,d=Math.hypot(dx,dy),s=(sp||40)*dt;
 if(d<=s){a.x=tx;a.y=ty;a.state='idle';a.moveSpeed=0;if(a.path?.length)a.to=a.path.shift();else{a.to=null;if(a.face!==undefined)a.a=a.face;}return false;}
 a.x+=dx/d*s;a.y+=dy/d*s;a.state='move';a.moveSpeed=10;a.odo=(a.odo||0)+s;a.phase=a.odo*.267;if(Math.abs(dx)>.5)a.a=dx>0?0:Math.PI;return true;}
function go(a,pts,sp=42,face){const P=pts.map(p=>[p[0],p[1],sp]);a.to=P.shift();a.path=P;a.face=face;}
function setupFilm(){F.bg=M.ludus.background();const A0=F.actors={};
 A0.lan=actor(CAST.lan,{id:'lan',x:440,y:548,lanista:true});
 CAST.party.forEach((g,i)=>{const P=[[352,438],[404,462],[468,438],[522,462],[384,500]][i];A0['p'+i]=actor(g,{id:'p'+i,x:P[0],y:P[1],a:i%2?0:Math.PI});});
 A0.kra=actor(CAST.kra,{id:'kra',x:618,y:720,a:Math.PI,team:1,hidden:true});
 A0.g1=actor(CAST.g1,{id:'g1',x:600,y:745,team:1,hidden:true});A0.g2=actor(CAST.g2,{id:'g2',x:636,y:760,team:1,hidden:true});
 A0.smith=actor(CAST.smith,{id:'smith',x:756,y:246,hidden:true,forgeWorker:true,forgeHold:'beer'});
 A0.oro=actor(CAST.oro,{id:'oro',x:150,y:420,hidden:true});}
function headY(a){const k=a.lanista?.7:.6;return a.y-(a.g.height/180)*k*86;}
function paintFilm(){const cv=$('owStage');if(!cv)return;const g=cv.getContext('2d'),W=cv.width,H=cv.height,c=F.cam,vw=c.vw,k=W/vw,vh=H/k;
 g.imageSmoothingEnabled=false;g.fillStyle='#101b20';g.fillRect(0,0,W,H);
 const cx=clamp(c.x,vw/2,LW-vw/2),cy=vh>=LH?LH/2:clamp(c.y,vh/2,LH-vh/2),sh=F.shake>0?(Math.random()-.5)*F.shake*2:0;
 g.save();g.scale(k,k);g.translate(-(cx-vw/2)+sh,-(cy-vh/2)+sh*.6);g.drawImage(F.bg,0,0);A.ludusGate(g,F.t,{});
 const list=Object.values(F.actors).filter(a=>!a.hidden).sort((a,b)=>a.y-b.y);
 try{M.renderLudusActors(g,list);}catch(e){console.warn(e);}
 for(const a of list){if(a.g===CAST.oro)A.oroOverlay(g,a,1);if(a.g===CAST.kra)A.krassusOverlay(g,a,1);}
 const sp=F.speaker&&F.actors[F.speaker];if(sp&&!sp.hidden){const y=headY(sp)-10+Math.sin(F.t*6)*2;A.px(g,sp.x-3,y,7,2,'#f1d48a');A.px(g,sp.x-2,y+2,5,2,'#f1d48a');A.px(g,sp.x-1,y+4,3,2,'#f1d48a');}
 g.restore();}
let lastT=0;
function filmLoop(t){if(!F.running){F.raf=0;return;}const dt=Math.min(.05,(t-(lastT||t))/1000);lastT=t;F.t+=dt;
 for(const a of Object.values(F.actors))walker(a,dt);
 if(F.camTo){F.cam.x=lerp(F.cam.x,F.camTo.x,Math.min(1,dt*2.2));F.cam.y=lerp(F.cam.y,F.camTo.y,Math.min(1,dt*2.2));F.cam.vw=lerp(F.cam.vw,F.camTo.vw,Math.min(1,dt*2.2));}
 F.shake=Math.max(0,F.shake-dt*14);paintFilm();
 if(talk.g&&talk.live&&(F.t-talk.last>.09)){talk.last=F.t;paintFace($('owFace'),talk.g,talk.mood,{t:60+F.t*12});}
 F.raf=requestAnimationFrame(filmLoop);}
const talk={g:null,mood:'calm',live:false,last:0,resolve:null,full:'',shown:0,timer:0};
function say(who,text,mood='calm',o={}){return new Promise(res=>{const box=$('owTalk');if(!box)return res();box.hidden=false;F.speaker=o.actor||({L:'lan',K:'kra',G1:'g1',G2:'g2',SM:'smith',O:'oro'})[who]||null;
 talk.g=WHO[who]?.()||null;talk.mood=mood;talk.live=!!talk.g;$('owFace').hidden=!talk.g;$('owName').textContent=o.name??NAME(who);
 const el=$('owText');$('owBox').className='scene-bubble'+(o.roar?' loud':'')+(who==='N'?' narr':'');talk.full=text;talk.shown=0;el.textContent='';
 if(o.roar)F.shake=Math.max(F.shake,7);if(talk.g)paintFace($('owFace'),talk.g,mood,{t:60});
 clearInterval(talk.timer);talk.timer=setInterval(()=>{talk.shown+=2;el.textContent=talk.full.slice(0,talk.shown);if(talk.shown>=talk.full.length)clearInterval(talk.timer);},18);
 talk.resolve=()=>{clearInterval(talk.timer);talk.resolve=null;res();};
 if(F.skip)talk.resolve();});}
function talkClick(){if(!talk.resolve)return;if(talk.shown<talk.full.length){talk.shown=talk.full.length;$('owText').textContent=talk.full;return;}talk.resolve();}
const waitWalk=(...ids)=>new Promise(res=>{const chk=()=>{if(F.skip||!F.running||ids.every(id=>!F.actors[id]?.to))res();else setTimeout(chk,60);};chk();});
const pause=ms=>F.skip?Promise.resolve():sleep(ms);
function filmDom(){let v=$('owFilm');if(v)return v;v=document.createElement('div');v.id='owFilm';v.className='ow-film';v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');v.setAttribute('aria-label','Der Schuldeneintreiber');
 v.innerHTML=`<canvas id="owStage" width="1350" height="844"></canvas><div class="ow-talk" id="owTalk" hidden><canvas id="owFace" width="160" height="104"></canvas><div class="scene-bubble" id="owBox"><b id="owName"></b><span id="owText"></span><i>▼</i></div></div><div class="ow-film-bar"><button type="button" class="btn" id="owSkip">Szene überspringen ⏭</button></div>`;
 document.body.appendChild(v);v.addEventListener('click',e=>{if(e.target.closest('#owSkip')){F.skip=true;talk.resolve?.();return;}talkClick();});return v;}
async function playIntro(){if(F.running||S.battle)return;const st=ST();buildCast();filmDom();F.running=true;F.skip=false;F.t=0;setupFilm();
 if(st.stage===''||st.stage==='intro')st.stage='intro';
 st.quest??=newQuestPlace();const dorf=st.quest.name,A0=F.actors;F.cam={x:450,y:335,vw:900};F.camTo=null;lastT=0;F.raf=requestAnimationFrame(filmLoop);
 document.body.classList.add('ow-film-on');
 try{
 await say('N','Ein ganz normaler Tag im '+school()+'. Bis es klopft. Dreimal. Dann ein viertes Mal, mit einem Schädel.');
 A0.kra.hidden=A0.g1.hidden=A0.g2.hidden=false;
 go(A0.kra,[[618,640],[600,600],[548,552]],34,Math.PI);go(A0.g1,[[606,650],[592,612],[586,520]],34,Math.PI);go(A0.g2,[[634,660],[628,620],[596,590]],34,Math.PI);
 F.camTo={x:510,y:540,vw:430};
 await pause(1200);await say('N','Drei Männer kommen durchs Tor. Der vorderste ist breit wie ein Kleiderschrank und trägt einen Zweihänder wie andere Leute einen Regenschirm.');
 await waitWalk('kra','g1','g2');A0.lan.a=0;
 await say('K','Schöner Ludus. Wirklich. Es wäre ein Jammer, wenn er schon wieder den Besitzer wechselt.','grin');
 await say('L','Wer zum Hades bist du denn?','determined');
 await say('K','Krassus Knochenzins. Inkasso, Mahnwesen und kleinere Amputationen.','confident');
 await say('G1','Die Amputationen machen wir. Er macht nur die Mahnungen.','dumb');
 await say('K','Dein Vorgänger hat sich bei mir 10.000 Goldmünzen geliehen. Dann ist er gestorben. Ohne zu zahlen. Sehr unhöflich.','calm');
 await say('G2','Wir haben ihn noch gefragt. Er hat nur gegurgelt.','grin');
 await say('K','Schulden sterben nicht, Lanista. Sie werden vererbt. Zahl die 10.000, oder die Schule gehört mir. Mit allem, was drin atmet.','confident');
 for(const k of Object.keys(A0))if(/^p\d/.test(k))A0[k].a=0;
 await say('L','ZEHNTAUSEND?! FÜR DIESEN HAUFEN STROH, SCHWEISS UND PFERDESCHEISSE?!','roar',{roar:true});
 go(A0.lan,[[468,548]],60,0);
 await say('L',S.lanista?.lostArm?'DU KRIEGST KEINEN EINZIGEN KUPFERLING, DU AUFGEBLASENER GELDSACK! ICH HAB FÜR DIESEN LADEN EINEN ARM GEGEBEN! WILLST DU DEN ANDEREN AUCH? KOMM HER UND HOL IHN DIR!':'DU KRIEGST KEINEN EINZIGEN KUPFERLING, DU AUFGEBLASENER GELDSACK! ICH HAB FÜR DIESEN LADEN BLUT GELASSEN! WILLST DU MEHR DAVON SEHEN? KOMM HER UND HOL ES DIR!','roar',{roar:true});
 await say('K','Interessant. Die meisten fangen an dieser Stelle an zu weinen.','calm');
 await say('K','Dann eben die teure Variante. Meine Männer kommen dich besuchen. Sie bringen Messer mit. Und eine Quittung.','grin');
 A0.smith.hidden=false;go(A0.smith,[[756,300],[650,400],[512,580]],48,0);F.camTo={x:560,y:470,vw:560};
 await say('SM','WER BRÜLLT HIER SO RUM?! Ich hör mein eigenes Hämmern nicht mehr!','roar',{roar:true});
 await waitWalk('smith');F.camTo={x:520,y:550,vw:430};
 await say('G1','Chef … Chef! Das ist der Schmied!','scared');
 await say('G2','Der hat meinem Vetter den Kopf auf dem Amboss flachgeklopft! Der benutzt seine Hüte jetzt als Teller!','terror');
 go(A0.g1,[[606,515]],30,Math.PI);go(A0.g2,[[618,598]],30,Math.PI);
 await say('K',S.lanista?.lostArm?'Ach, so läuft das hier. Der einarmige Herr versteckt sich hinter seinem Kampfhund.':'Ach, so läuft das hier. Der Herr Lanista versteckt sich hinter seinem Kampfhund.','confident');
 await say('SM','Kampfhund? Hunde beißen. Ich mach Hufeisen aus Leuten.','grin');
 await say('K','Pfeif ihn ruhig zurück, Lanista. Aber dein Hund wird nicht immer da sein. Hunde schlafen. Hunde saufen.','calm');
 await say('K','Und irgendwann stehst du allein auf deinem Hof. Dann erwischen wir dich. Und dann ist die Schule dran.','grin');
 go(A0.kra,[[600,600],[618,640],[618,720]],36);go(A0.g1,[[600,610],[612,650],[612,730]],40);go(A0.g2,[[630,640],[626,740]],40);
 await say('G2','Schönen Tag noch! Wir kommen wieder! Mit mehr Leuten! Und mit Hüten!','nervous');
 await waitWalk('kra','g1','g2');A0.kra.hidden=A0.g1.hidden=A0.g2.hidden=true;
 A0.lan.a=0;A0.smith.a=Math.PI;
 await say('L','Du hättest ihn erschlagen können!','determined');
 await say('SM','Hätte. Ich hab aber ein Bier in der Hand. Man muss Prioritäten setzen.','calm');
 go(A0.smith,[[650,400],[770,300]],44,Math.PI);
 A0.oro.hidden=false;go(A0.oro,[[300,440],[330,500],[400,545]],40,0);F.camTo={x:440,y:520,vw:460};A0.lan.a=Math.PI;
 await say('O','Krassus Knochenzins. Lange nicht gesehen. Also, ihn nicht. Mich hat er gesehen. Leider.','grin');
 await waitWalk('oro');
 await say('L','Du kennst diesen Geldsack?','calm');
 await say('O','Er hat mir mal einen Pfeil abgekauft und nie bezahlt. Dann hat er ihn mir zurückgegeben. Mit Schwung.','grin');
 await say('O','Er haust in '+dorf+'. Zwei Tagesmärsche flussaufwärts. Ein Drecksnest voller Trottel, die ihm alle Geld schulden. Die kämpfen für ihn, weil er ihnen sonst die Zinsen aus den Knochen bricht.','calm');
 await say('O','Zehn Mann vielleicht. Mistgabeln, rostige Klingen, ein paar halbwegs brauchbare Waffen. Und Krassus selbst mit seinem Zweihänder. Den nennt er übrigens „Zinseszins“.','dumb');
 await say('O','Statt zu warten, bis die dir einen Besuch abstatten: Statte du ihnen einen ab. Das Tor da drüben in der Mauer führt raus. Einer allein ist mutig. Fünf sind vernünftig. Zehn sind ein Fest.','confident');
 await say('L','Und was willst du dafür?','calm');
 await say('O','Den Pfeil zurück.','grin');
 await say('L','Der steckt doch in deinem Kopf.','dumb');
 await say('O','Eben. Ich will einen neuen.','grin');
 await say('L','Also gut. '+school()+'! Waffen holen. Wir gehen Schulden eintreiben. Rückwärts.','determined');
 }catch(e){console.error(e);}
 endFilm();
 if(st.stage==='intro')st.stage='open';st.seenBoard=false;persist();
 notify('Neu: Am Tor in der rechten Mauer geht es in die Außenwelt. Krassus wartet in '+dorf+'.');
 try{M.ludus?.refresh?.();}catch(e){}}
function endFilm(){F.running=false;F.skip=false;F.speaker=null;clearInterval(talk.timer);talk.resolve=null;cancelAnimationFrame(F.raf);F.raf=0;$('owFilm')?.remove();document.body.classList.remove('ow-film-on');}

// ---------- Ludus: Tor zeichnen, anklicken, Szene starten ----------
let hot=false,hoverCanvas=null,wait=0;
M.ludusOverlay=(g,t)=>{const st=ST();if(!st.stage)return;
 const c=g.canvas;if(c&&c!==hoverCanvas&&c.id==='ludusCanvas'){hoverCanvas=c;c.addEventListener('mousemove',e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)*900/r.width,y=(e.clientY-r.top)*670/r.height,G=A.GATE,h=x>=G.x&&x<=G.x+G.w&&y>=G.y&&y<=G.y+G.h;if(h!==hot){hot=h;c.style.cursor=h?'pointer':'';}});}
 A.ludusGate(g,t,{fresh:(st.stage==='open'&&!st.seenBoard)||(st.stage==='done'&&adventureReady()&&!st.seenAdvDay),hot});};
const prevHit=M.ludusHit;
M.ludusHit=(x,y)=>{const st=ST(),G=A.GATE;if(st.stage&&x>=G.x&&x<=G.x+G.w&&y>=G.y&&y<=G.y+G.h){if(st.stage==='intro')playIntro();else openBoard();return true;}return prevHit?prevHit(x,y):false;};
const prevTick=M.ludusTick;
M.ludusTick=dt=>{if(F.running)return;prevTick?.(dt);try{tick(dt);}catch(e){console.error(e);}};
function tick(dt){const st=ST();
 if(st.run&&!R.m){st.history.unshift({day:S.day,kind:st.run.kind,place:st.run.place,result:'abgebrochen',text:'Die Truppe ist zurück. Was unterwegs geschah, weiß nur noch der Wind.'});st.history=st.history.slice(0,12);st.run=null;persist();}
 if(!st.stage&&tutorialsDone()){st.stage='intro';persist();}
 if(st.stage==='intro'&&!busy()&&M.ui.getPage()==='home'&&!document.hidden){wait+=dt;if(wait>2.5){wait=0;playIntro();}}else wait=0;}

// =====================================================================================================
// TOR / AUSWAHL (Seite „outside“)
// =====================================================================================================
function newQuestPlace(){const seed=(Math.random()*1e9)>>>0,P=D.generate(seed,'dorf');return {seed,name:P.name};}
function newAdventure(biome){const b=biome||pickL(['dorf','dorf','wald','stadt']);return {seed:(Math.random()*1e9)>>>0,biome:b};}
const adventureReady=()=>{const st=ST();return st.stage==='done'&&st.lastAdventure!==S.day;};
let sel=null,view='board',result=null;
function openBoard(){const st=ST();if(st.stage==='open')st.seenBoard=true;if(st.stage==='done')st.seenAdvDay=S.day===st.lastAdventure?st.seenAdvDay:true;view='board';M.ui.click('nav:outside');}
function fighters(){return S.roster.filter(g=>!g.dead&&!g.smithDuty);}
function selected(){const ids=sel||new Set();return fighters().filter(g=>ids.has(g.id)&&D.fit(g));}
function autoPick(n=5){const pool=fighters().filter(D.fit).sort((a,b)=>score(b)-score(a));sel=new Set(pool.slice(0,n).map(g=>g.id));}
function score(g){return M.health(g)*.5+(g.blood||0)*.2-(g.fatigue||0)*.3+(g.stats?.experience||0)+(g.kills||0)*.5;}
function statusLine(g){const hp=Math.round(M.health(g)),fit=D.fit(g);return fit?`Gesundheit ${hp} % · Blut ${Math.round(g.blood)}${g.fatigue>1?' · Erschöpfung '+Math.round(g.fatigue):''}`:`kampfunfähig (${hp} %)`;}
function weaponName(g){try{return M.itemName(M.gear(g,'weapon'))||'Fäuste';}catch(e){return '–';}}
function placeFor(kind){const st=ST();if(kind==='quest'){const P=D.generate(st.quest.seed,'dorf');P.name=st.quest.name;return P;}return D.generate(st.adv.seed,st.adv.biome);}
function advPreview(){const st=ST(),team=selected();try{const m=D.newMission(st.adv.seed,team.length?team:fighters().filter(D.fit).slice(0,1),st.adv.biome,{kind:'adventure'});return m;}catch(e){console.error(e);return null;}}
function boardPage(){const st=ST();
 if(!st.stage)return `<section class="box ow-board"><p class="eyebrow">AUSSENWELT</p><h1>Das Tor ist zu</h1><p>Erst die Lehrjahre im Ludus. Danach geht es hinaus.</p><div class="buttons"><button class="btn" data-action="nav:home">‹ Zurück in den Ludus</button></div></section>`;
 if(view==='result'&&result)return resultPage();
 if(st.stage==='open'||st.stage==='intro')st.quest??=newQuestPlace();
 if(st.stage==='done')st.adv??=newAdventure();
 if(!sel){autoPick(Math.min(5,fighters().filter(D.fit).length));}
 for(const id of [...sel])if(!fighters().some(g=>g.id===id&&D.fit(g)))sel.delete(id);
 const team=selected(),n=team.length,quest=st.stage!=='done',P=placeFor(quest?'quest':'adventure');
 let card='';
 if(quest){card=`<div class="box ow-card"><span class="ow-tag">HAUPTAUFTRAG</span><h2>Der Schuldeneintreiber</h2>
  <p>Krassus Knochenzins verlangt 10.000 Gold, die der alte Besitzer des Ludus schuldig geblieben ist. Orontes weiß, wo er haust: <b>${esc(P.name)}</b>. Wer zuerst Besuch bekommt, muss nicht zahlen.</p>
  <dl><dt>Ziel</dt><dd>${esc(P.label)} ${esc(P.name)} · ${P.stations.length-1} Begegnungen auf dem Weg zum Kontor</dd><dt>Gegner</dt><dd>10 Dorftrottel (manche lungern herum, manche kommen aus Türen oder fallen euch in den Rücken) · am Ende Krassus mit seinem soliden Zweihänder „Zinseszins“</dd><dt>Belohnung</dt><dd>Schulden getilgt · die Geldkassette · alle Waffen und Schilde, die fallen</dd></dl>
  <canvas class="ow-map" data-owmap="quest" width="480" height="270"></canvas>${st.tries?`<p class="tiny">Bisherige Versuche: ${st.tries}</p>`:''}</div>`;}
 else{const m=advPreview(),ready=adventureReady(),BI={dorf:'Dorf',wald:'Wald',stadt:'Stadt'};
  card=`<div class="box ow-card"><span class="ow-tag">ABENTEUER</span><h2>${esc(P.label)} ${esc(P.name)}</h2>
  <p>${esc((D.ADV[st.adv.biome]?.intro||'').replace('{P}',P.name))}</p>
  <div class="buttons ow-biomes">${Object.entries(BI).map(([k,l])=>`<button class="btn ${st.adv.biome===k?'primary':''}" data-action="outside:biome:${k}">${l}</button>`).join('')}<button class="btn" data-action="outside:reroll">Anderes Ziel ↻</button></div>
  <dl><dt>Gegner</dt><dd>${m?`${D.ADV[st.adv.biome].band}: etwa ${m.total-1} ${esc(D.ADV[st.adv.biome].who)} und ihr Anführer. Stärke passt sich eurer Gruppe an (${n||1} ${n===1?'Kämpfer':'Kämpfer'}).`:'unbekannt'}</dd><dt>Belohnung</dt><dd>Die Truhe des Anführers (Gold) · alle Waffen und Schilde, die fallen</dd><dt>Regel</dt><dd>${ready?'Ein Abenteuer pro Tag.':'<b class="red">Heute wart ihr schon draußen. Morgen wieder.</b>'}</dd></dl>
  <canvas class="ow-map" data-owmap="adventure" width="480" height="270"></canvas><p class="tiny">Abenteuer bisher: ${st.adventures} · gewonnen: ${st.advWins}</p></div>`;}
 const rows=fighters().map(g=>{const fit=D.fit(g),on=sel.has(g.id)&&fit;return `<button type="button" class="ow-pick ${on?'on':''} ${fit?'':'off'}" data-action="outside:pick:${esc(g.id)}" ${fit?'':'disabled'}><i>${on?'✓':''}</i><span><b>${ROLE_ICON[g.role]||''} ${esc(g.name)}</b><small>${esc(g.role)} · ${esc(weaponName(g))}</small><small>${esc(statusLine(g))}</small></span></button>`;}).join('');
 const can=n>=D.CFG.minParty&&n<=D.CFG.maxParty&&(quest||adventureReady());
 const hist=st.history.slice(0,6).map(h=>`<li><b>Tag ${h.day}</b> · ${esc(h.place||'')} · ${esc(h.result)}${h.loot?` · ${h.loot} Beutestücke`:''}${h.gold?` · ${h.gold} Gold`:''}${h.deaths?` · <span class="red">${h.deaths} tot</span>`:''}</li>`).join('');
 requestAnimationFrame(paintBoard);
 return `<section class="ow-board"><div class="ow-head"><div><p class="eyebrow">AUSSENWELT · VOR DEM TOR</p><h1>${quest?'Krassus wartet':'Hinaus ins Land'}</h1></div><div class="buttons"><button class="btn" data-action="nav:home">‹ Ludus</button><button class="btn" data-action="outside:intro">▶ Szene „Der Schuldeneintreiber“</button></div></div>
 <div class="ow-cols"><div>${card}</div>
 <div class="box"><h2>Wer geht mit?</h2><p class="tiny">1 bis ${D.CFG.maxParty} Kämpfer. Kein Steuern unterwegs: nur Weiter oder Fliehen. Fliehen geht immer. Verletzungen bleiben, Tote bleiben tot. Nach jedem gesäuberten Ort eine kurze Rast.</p>
  <div class="buttons"><button class="btn" data-action="outside:auto:5">Beste 5</button><button class="btn" data-action="outside:auto:10">Beste 10</button><button class="btn" data-action="outside:none">Keiner</button></div>
  <div class="ow-picks">${rows||'<p>Keine Kämpfer im Kader.</p>'}</div>
  <p class="ow-need ${can?'ok':''}">${n>D.CFG.maxParty?'Höchstens '+D.CFG.maxParty+' Kämpfer.':n<1?'Mindestens ein kampffähiger Kämpfer.':n+' von höchstens '+D.CFG.maxParty+' gewählt.'}</p>
  <div class="buttons"><button class="btn primary" data-action="outside:go" ${can?'':'disabled'}>Aufbrechen ▶</button></div>
  ${hist?`<h3>Unterwegs gewesen</h3><ul class="ow-hist">${hist}</ul>`:''}</div></div></section>`;}
function paintBoard(){const st=ST();for(const c of document.querySelectorAll('canvas[data-owmap]')){const kind=c.dataset.owmap;try{const P=kind==='quest'?placeFor('quest'):placeFor('adventure');A.map(c,P,{reveal:0,cleared:-1,progress:0,party:A.mapPoint(P,0)});}catch(e){console.error(e);}}void st;}
function resultPage(){const r=result,cls={won:'ok',fled:'',withdrawn:'',lost:'red'}[r.kind]||'';requestAnimationFrame(()=>{});
 return `<section class="ow-board"><div class="ow-head"><div><p class="eyebrow">AUSSENWELT · ZURÜCK IM LUDUS</p><h1 class="${cls}">${esc(r.title)}</h1></div><div class="buttons"><button class="btn primary" data-action="outside:board">Weiter</button><button class="btn" data-action="nav:home">‹ Ludus</button></div></div>
 <div class="box"><p class="ow-res-text">${esc(r.text)}</p><p class="tiny">${esc(r.stats)}</p></div>
 <div class="ow-cols"><div class="box"><h2>Beute</h2><ul class="ow-hist">${r.loot.length?r.loot.map(l=>`<li><b>${esc(l.name)}</b> <small>von ${esc(l.from)}</small></li>`).join(''):'<li>Keine Beute.</li>'}${r.gold?`<li><b class="gold">${r.gold} Gold</b> <small>${esc(r.goldFrom)}</small></li>`:''}${r.extra?`<li><b>${esc(r.extra)}</b></li>`:''}</ul>${r.loot.length?'<p class="tiny">Alles liegt im Lager (Waffenkammer).</p>':''}</div>
 <div class="box"><h2>Truppe</h2><ul class="ow-hist">${r.party.map(p=>`<li class="${p.dead?'red':''}"><b>${p.dead?'† ':''}${esc(p.name)}</b> <small>${esc(p.role)}</small><br><small>${esc(p.line)}</small></li>`).join('')}</ul></div></div></section>`;}
const prevPage=M.schoolPage;
M.schoolPage=p=>p==='outside'?boardPage():prevPage?prevPage(p):undefined;
const prevClick=M.schoolClick;
M.schoolClick=action=>{if(!action.startsWith('outside:'))return prevClick?prevClick(action):false;const [,k,v]=action.split(':');const st=ST();
 if(k==='pick'){sel??=new Set();if(sel.has(v))sel.delete(v);else if(sel.size<D.CFG.maxParty)sel.add(v);else notify('Höchstens '+D.CFG.maxParty+' Kämpfer.');M.ui.render();return true;}
 if(k==='auto'){autoPick(+v||5);M.ui.render();return true;}
 if(k==='none'){sel=new Set();M.ui.render();return true;}
 if(k==='biome'){st.adv=newAdventure(v);persist();M.ui.render();return true;}
 if(k==='reroll'){st.adv=newAdventure(st.adv?.biome);persist();M.ui.render();return true;}
 if(k==='intro'){playIntro();return true;}
 if(k==='board'){view='board';result=null;M.ui.render();return true;}
 if(k==='open'){openBoard();return true;}
 if(k==='go'){startMission();return true;}
 return true;};

// =====================================================================================================
// MISSION: Marsch durch breite Abschnitte, Begegnungen, Kampf mit der echten Engine
// =====================================================================================================
const R={m:null,b:null,lastTime:0,awaiting:null,ended:false,fleeing:false,cam:{x:520,y:600,snap:true},progress:0,marching:false,nextRes:null,rows:[],rowKey:0,runId:null};const VH=760;
const speed=()=>Math.max(1,S.options?.speed||1);
function overlayDom(){const view=$('battleView');if(!view)return null;let o=$('owOver');if(o&&o.parentNode===view)return o;
 o=document.createElement('div');o.id='owOver';o.innerHTML=`<canvas id="owWx"></canvas><div id="owBubbles"></div><div class="ow-top"><div class="ow-title"><b id="owTitle"></b><small id="owSub"></small></div><div class="ow-chips"><span class="tag" id="owStation"></span><span class="tag" id="owCount"></span><span class="tag" id="owLoot"></span></div></div><div class="ow-mapbox" id="owMapBox"><canvas id="owMap" width="480" height="270"></canvas></div><div class="ow-logbox" id="owLogBox" hidden><div id="owLog"></div></div>`;
 view.insertBefore(o,$('battleBottom'));if(innerWidth<600)$('owMapBox').hidden=true;return o;}
function bottomDom(){const bb=$('battleBottom');if(!bb)return;if(bb.dataset.ow===R.runId)return;bb.dataset.ow=R.runId;
 bb.innerHTML=`<div class="fight-log" id="owLogShort"></div><div class="fight-controls ow-controls"><button type="button" class="btn primary" id="owNext" disabled>Weiter ▶</button><button type="button" class="btn" id="owFlee">Fliehen</button><button type="button" class="btn" id="owLogBtn">Bericht</button><button type="button" class="btn" id="owMapBtn">Karte</button><select class="select" id="owSpd"><option value="1">1×</option><option value="2">2×</option><option value="3">3×</option></select><span id="owState"></span></div>`;
 $('owNext').onclick=next;$('owFlee').onclick=flee;$('owLogBtn').onclick=()=>{const bx=$('owLogBox');bx.hidden=!bx.hidden;$('owLogBtn').classList.toggle('primary',!bx.hidden);if(!bx.hidden)$('owLog').scrollTop=1e9;};$('owMapBtn').onclick=()=>{const bx=$('owMapBox');bx.hidden=!bx.hidden;};
 const sp=$('owSpd');sp.value=String(clamp(Math.round(S.options?.speed||1),1,3));sp.onchange=()=>{S.options.speed=+sp.value;};
 setButtons(R.awaiting||'march');
 for(const h of R.rows.slice(0,2).reverse())logShort(h);}
function missionHud(b){overlayDom();bottomDom();const top=$('battleTop');if(top&&top.innerHTML)top.innerHTML='';for(const id of ['finaleBanner','verdictSkip'])if($(id))$(id).hidden=true;if($('battleEvent'))$('battleEvent').style.display='none';sizeField();}
const prevArmyHud=M.armyBattleHUD;M.armyBattleHUD=function(b){if(b?.mission&&R.m){missionHud(b);return true;}return prevArmyHud?prevArmyHud.apply(this,arguments):false;};
const prevEnd=M.endBenchmark;M.endBenchmark=function(w,r){if(S.battle?.mission)return D.onEngineEnd(w,r);return prevEnd?.apply(this,arguments);};
// Kamera: füllt die Höhe, folgt der Truppe (bei Kampf allen Beteiligten)
const hudCam=M.battleCamera;
function missionCam(b,width,height,W,H){const fit=Math.min(width/W,height/H),k=height/VH,view=width/k;sizeField();
 const all=b.actors.filter(a=>!a.down&&!a.g.dead),foes=all.some(a=>a.team===1&&b.encEnemies.includes(a));const pa=foes?all:partyActors(b);
 let tx=pa.length?pa.reduce((s,a)=>s+a.x,0)/pa.length:R.cam.x,ty=pa.length?pa.reduce((s,a)=>s+a.y,0)/pa.length-30:R.cam.y;if(!foes)tx+=view*.18;
 tx=clamp(tx,view/2,W-view/2);ty=clamp(ty,VH/2,H-VH/2);const q=R.cam.snap?1:.06;R.cam.x+=(tx-R.cam.x)*q;R.cam.y+=(ty-R.cam.y)*q;R.cam.snap=false;
 R.cam.x=clamp(R.cam.x,view/2,W-view/2);R.cam.y=clamp(R.cam.y,VH/2,H-VH/2);return {zoom:k/fit,x:R.cam.x,y:R.cam.y};}
M.battleCamera=function(b,...r){return b?.mission?missionCam(b,...r):hudCam?hudCam.call(this,b,...r):null;};
// Kampf-HUD: Kopfzeile mit Schule und Gegnern
if(M.battleHud){const prevBuild=M.battleHud.onBuild;M.battleHud.onBuild=(panel,b)=>{prevBuild?.(panel,b);if(!b?.mission)return;const n=panel.querySelectorAll('.bh-name b'),m=b.mission;if(n[0])n[0].textContent='BLAU · '+school().toUpperCase();if(n[1])n[1].textContent=(m.kind==='quest'?(b.section===m.place.sections.length-1?'KRASSUS & BANDE':'KRASSUS’ SCHULDNER'):(m.texts?.band||'BANDE').toUpperCase())+' · ROT';};}
M.drawSprite=(ctx,o)=>A.drawSprite(ctx,o);

function sizeField(){const c=$('arenaCanvas'),o=$('owOver');if(!c||!o)return;const L=c.offsetLeft+'px',T0=c.offsetTop+'px',W0=c.clientWidth+'px',H0=c.clientHeight+'px';
 if(o.style.left!==L||o.style.top!==T0||o.style.width!==W0||o.style.height!==H0){Object.assign(o.style,{left:L,top:T0,width:W0,height:H0});const w=$('owWx');if(w){w.width=c.clientWidth;w.height=c.clientHeight;}}}
addEventListener('resize',()=>{if(R.m)sizeField();});
function mlog(html,cls=''){R.rows=[html,...R.rows].slice(0,7);R.rowKey++;const el=$('owLog');if(el){const p=document.createElement('p');p.className=cls;p.innerHTML=html;el.appendChild(p);el.scrollTop=el.scrollHeight;while(el.children.length>80)el.firstChild.remove();}
 (R.full??=[]).push([html,cls]);logShort(html,cls);}
function logShort(html,cls=''){const sh=$('owLogShort');if(!sh)return;const q=document.createElement('p');q.className=cls;q.innerHTML=html;sh.prepend(q);while(sh.children.length>2)sh.lastChild.remove();}
function toScreen(x,y){const f=$('arenaCanvas'),cw=f.clientWidth,ch=f.clientHeight,k=ch/VH;return {x:cw/2+(x-R.cam.x)*k,y:ch/2+(y-R.cam.y)*k,k,cw,ch};}
function bubble(a,text,o={}){const lay=$('owBubbles');if(!lay||!a)return;const el=document.createElement('div');el.className='ow-bubble'+(a.team?' foe':'')+(o.boss?' boss':'')+(o.loud||/!$/.test(text)&&text===text.toUpperCase()?' loud':'');el.innerHTML=(o.name?'<b>'+esc(o.name)+'</b>':'')+'<span>'+esc(text)+'</span>';lay.appendChild(el);
 const upd=()=>{if(!el.isConnected)return;const p=toScreen(a.x,a.y-96),bw=el.offsetWidth/2;el.style.left=clamp(p.x,bw+4,p.cw-bw-4)+'px';el.style.top=Math.max(el.offsetHeight+4,p.y)+'px';el.style.opacity=p.x<-40||p.x>p.cw+40?0:'';};upd();el._upd=upd;
 setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),400);},(o.ms||Math.max(2600,text.length*55))/Math.max(1,speed()*.7));}
function updBubbles(){const l=$('owBubbles');if(l)for(const el of l.children)el._upd?.();}
function partyActors(b){return b.actors.filter(a=>a.team===0&&!a.down&&!a.g.dead);}
function anyParty(b){const l=partyActors(b);return l[Math.floor(Math.random()*l.length)]||b.actors.find(a=>a.team===0);}
const first=g=>String(g?.name||'').split(' ')[0];
function setButtons(state){R.awaiting=state;const nx=$('owNext'),fl=$('owFlee');if(!nx||!fl)return;
 nx.disabled=!['next','won'].includes(state);fl.disabled=['flee','won','end'].includes(state);
 nx.textContent=state==='won'?'Zum Ergebnis ▶':'Weiter ▶';fl.textContent=state==='next'?'Mit Beute heim':'Fliehen';
 const boss=R.m?.kind==='quest'?'Krassus liegt am Boden.':'Der Anführer liegt am Boden.';
 const s=$('owState');if(s)s.textContent={march:'Die Truppe marschiert …',talk:'Jemand hat etwas zu sagen …',fight:'Kampf läuft. Eingreifen unmöglich, Fliehen jederzeit.',next:'Begegnung überstanden. Weiter oder heim?',won:boss,flee:'Rückzug …',end:''}[state]||'';}
function renderInfo(){const m=R.m;if(!m)return;const b=S.battle;const live=b&&b.started&&!b.done?b.encEnemies.filter(a=>a.down||a.g.dead).length:0;
 const c=$('owCount');if(c)c.textContent=`Gegner ${m.killed+live} / ${m.total}`;const l=$('owLoot');if(l)l.textContent=m.loot.length?`Beute: ${m.loot.length}`:'Beute: –';}
function paintMap(t=0){const m=R.m,c=$('owMap');if(!m||!c||$('owMapBox')?.hidden)return;A.map(c,m.place,{reveal:m.idx,cleared:m.cleared,progress:R.progress,party:A.mapPoint(m.place,R.progress),t});}
function updProgress(){const m=R.m,b=S.battle;if(!m||!b?.L)return;const sec=m.place.sections[b.section],pa=partyActors(b);if(!pa.length)return;const x=pa.reduce((s,a)=>s+a.x,0)/pa.length;
 const f=sec.stations[0],l=sec.stations[sec.stations.length-1];const p0=f*3+.4,p1=(l+1)*3+(sec.boss?0:1.4);R.progress=Math.max(R.progress,p0+(p1-p0)*clamp(x/sec.W,0,1));}
function pushOut(a,b){for(const o of b.obstacles){if(o.hp<=0)continue;const dx=a.x-o.x,dy=a.y-o.y,d=Math.hypot(dx,dy),min=(a.r||12)+o.r;if(d<min&&d>.01){a.x=o.x+dx/d*min;a.y=o.y+dy/d*min;}}}
let loopT={map:0,info:0};
// Marsch als lockere Gruppe: jeder hat sein eigenes Tempo, schlendert etwas seitlich, bleibt mal kurz stehen oder schaut sich um;
// Nachzügler holen auf, wer vorneweg läuft, bummelt. Schrittlänge je Person verschieden.
function groupCenter(b){const l=b.actors.filter(a=>a.team===0&&a.to&&!a.down&&!a.g.dead);return l.length?{x:l.reduce((s,a)=>s+a.x,0)/l.length,n:l.length}:null;}
function strollInit(a){return a.stroll??={k:.86+Math.random()*.28,ph:Math.random()*6.28,amp:5+Math.random()*10,fr:.5+Math.random()*.7,stride:.23+Math.random()*.07,pause:3+Math.random()*9,slow:0,look:0,t:0};}
function stroll(a,dt,grp){const s=strollInit(a);const [tx,ty,sp]=a.to;
 if(a.startDelay>0){a.startDelay-=dt;a.state='idle';a.moveSpeed=0;return;}
 s.t+=dt;s.pause-=dt;if(s.pause<=0){s.slow=.6+Math.random()*1.1;s.look=Math.random()<.5?s.slow:0;s.pause=5+Math.random()*10;}if(s.slow>0)s.slow-=dt;if(s.look>0)s.look-=dt;
 const dx=tx-a.x,dy=ty-a.y,d=Math.hypot(dx,dy);
 let k=s.k*(1+.12*Math.sin(s.t*.7+s.ph))*(s.slow>0?.4:1);if(grp&&grp.n>1)k*=clamp(1+(grp.x-a.x)/240,.7,1.4);if(d<60)k*=.6+.4*d/60;
 const step=Math.max(4,sp*k)*dt;
 if(d<=step+.5){a.x=tx;a.y=ty;a.to=null;a.path=[];a.state='idle';a.moveSpeed=0;if(a.face!==undefined)a.a=a.face;return;}
 const ux=dx/d,uy=dy/d,lat=Math.cos(s.t*s.fr+s.ph)*s.amp*s.fr*dt*Math.min(1,d/90);
 a.x+=ux*step-uy*lat;a.y+=uy*step+ux*lat;a.state='move';a.moveSpeed=6+5*k;a.odo=(a.odo||0)+step;a.phase=a.odo*s.stride;
 a.a=s.look>0?(dx>0?Math.PI:0):Math.abs(dx)>.5?(dx>0?0:Math.PI):a.a;}
function missionLoop(t){const b=S.battle;
 if(R.m&&!R.ended){
  if(!b||b.mission!==R.m){// Spielstand gewechselt oder Kampf verschwunden: Mission still beenden, nichts anwenden
   if(!R.ending){abortMission();}}
  else{if(M.ui.getPage()!=='profiles'){const dt=Math.max(0,b.time-R.lastTime);R.lastTime=b.time;D.tick(b,dt);
    if((b.paused&&!b.done)||R.fleeing){const dt=1/60*speed(),grp=groupCenter(b);for(const a of b.actors)if(a.to){if(R.fleeing||a.team!==0)walker(a,dt);else stroll(a,dt,grp);pushOut(a,b);}}
    while(b.events.length)onEvent(b,b.events.shift());
    if(b.started&&b.done&&!b.handled){b.handled=true;encounterEnd(b);}
    updProgress();updBubbles();
    if(t-loopT.map>120){loopT.map=t;paintMap(t/1000);}
    if(t-loopT.info>250){loopT.info=t;renderInfo();}
    const w=$('owWx');if(w)A.weather(w.getContext('2d'),w.width,w.height,R.m.place.mood,t/1000,R.cam.x);}}}
 requestAnimationFrame(missionLoop);}
requestAnimationFrame(missionLoop);
function onEvent(b,e){const m=R.m,adv=m.kind==='adventure';
 if(e.type==='spawn'){const g=e.actor.g;if(g.debtBoss)return;bubble(e.actor,g.debtShout,{name:g.name});mlog(`<b class="foe">${esc(g.name)}</b> kommt aus ${esc(e.door||'dem Nichts')}. Er ${esc(g.debtOwes)}. Waffe: ${esc(M.itemName(M.gear(g,'weapon')))}.`);}
 if(e.type==='gaveup'){const l=adv?pickL(['Ich hab genug! Ich geh heim!','Das ist mir zu blöd!','Mama! MAMA!','Ich ergebe mich! Ich ergebe mich ganz doll!']):pickL(D.TEXT.gaveup);bubble(e.actor,l,{name:first(e.actor.g)});mlog(`<b class="foe">${esc(e.actor.g.name)}</b> verliert die Nerven: „${esc(l)}“`);}
 if(e.type==='bossHurt'){const l=adv?pickL(['Das wirst du bereuen!','Ihr Hunde! Ihr räudigen Hunde!','Haltet sie auf, ihr Feiglinge!','Ich hab schon Bessere als euch begraben!']):pickL(D.TEXT.bossHurt);const nm=adv?first(e.actor.g):'Krassus';bubble(e.actor,l,{name:nm,boss:true});mlog(`<b class="boss">${esc(nm)}:</b> „${esc(l)}“`);}}

// Der Lade-Bildschirm der Arena (scene-loader.js) bereitet Arena-Grafik vor und wartet auf „Weiter“. Missionen zeichnen
// ihren eigenen Schauplatz und wechseln mehrmals den Abschnitt: dort nicht anhalten.
function bypassLoader(){const SL=M.sceneLoader;if(SL&&!SL.__ow){const g0=SL.gate;SL.gate=function(){if(S.battle?.mission)return false;return g0.apply(this,arguments);};SL.__ow=true;}}
async function startMission(){if(S.battle||R.m)return;bypassLoader();const st=ST(),team=selected();if(team.length<D.CFG.minParty||team.length>D.CFG.maxParty)return;
 const quest=st.stage!=='done';if(!quest&&!adventureReady()){notify('Heute wart ihr schon draußen.');return;}
 let m;if(quest){st.quest??=newQuestPlace();m=D.newMission(st.quest.seed,team,'dorf',{kind:'quest'});m.place.name=st.quest.name;}
 else{m=D.newMission(st.adv.seed,team,st.adv.biome,{kind:'adventure'});}
 R.m=m;R.ended=false;R.ending=false;R.fleeing=false;R.progress=0;R.rows=[];R.rowKey=0;R.full=[];R.lastTime=0;R.awaiting='march';R.runId='run'+Date.now();loopT={map:0,info:0};
 if(quest)st.tries++;else{st.lastAdventure=S.day;st.adventures++;}
 st.run={id:R.runId,kind:m.kind,place:m.place.name,day:S.day,party:team.map(g=>g.id)};persist();
 document.body.classList.add('ow-mission');
 const intro=quest?`<b>${esc(school())}</b> bricht nach <b>${esc(m.place.name)}</b> auf. ${team.length} ${team.length===1?'Kämpfer, ein improvisiertes Testament':'Kämpfer, '+team.length+' improvisierte Testamente'}. Zwei Tagesmärsche später: ${esc(D.moodText(m.place.mood))}`
  :`<b>${esc(school())}</b> zieht los: ${esc(m.place.label)} ${esc(m.place.name)}. ${esc((m.texts?.intro||'').replace('{P}',m.place.name))} ${esc(D.moodText(m.place.mood))}`;
 await runSection(0,intro);}
function clearPoint(b,x,y){for(let k=0;k<12;k++){const yy=y+(k%2?1:-1)*Math.ceil(k/2)*14;if(!b.obstacles.some(o=>o.hp>0&&Math.hypot(o.x-x,o.y-yy)<o.r+18))return yy;}return D.pathY(b.L,x);}
function marchTo(b,x,sp=58){const pa=partyActors(b);pa.forEach((a,k)=>{a.startDelay=Math.random()*.9;const col=k%3,line=Math.floor(k/3),tx=x-line*60-(col===1?0:26)+(Math.random()-.5)*44,y=clearPoint(b,tx,clamp(D.pathY(b.L,tx)+(col-1)*58+(Math.random()-.5)*20,b.L.mT+30,b.L.mB-30));a.to=[tx,y,sp];a.path=[];a.face=0;});
 R.marching=true;setButtons('march');const start=performance.now(),prog=new Map();
 return new Promise(res=>{const chk=()=>{if(!live(b)){R.marching=false;return res(false);}const now=performance.now();
   if(M.ui.getPage()==='profiles'){setTimeout(chk,200);return;}
   for(const a of partyActors(b)){if(!a.to)continue;const d=Math.hypot(a.to[0]-a.x,a.to[1]-a.y),p=prog.get(a);if(!p||d<p.d-3)prog.set(a,{d,t:now});else if(now-p.t>2600/speed()){a.to=null;a.path=[];a.state='idle';a.moveSpeed=0;}}
   if(now-start>90000)for(const a of partyActors(b)){a.to=null;a.state='idle';a.moveSpeed=0;}
   if(partyActors(b).every(a=>!a.to)){R.marching=false;res(true);}else setTimeout(chk,80);};chk();});}
const live=b=>!R.ended&&!R.fleeing&&S.battle===b;
async function runSection(si,introLine){const m=R.m,sec=m.place.sections[si];
 const b=R.b=D.startSection(m,si);R.lastTime=0;b.handled=false;
 const img=A.scene(b.L,m.place);M.missionBackdrop=(ctx)=>{ctx.save();ctx.scale(1040/b.width*D.ART,720/b.height*D.ART);ctx.drawImage(img,0,0);ctx.restore();};
 R.cam.x=0;R.cam.y=D.pathY(b.L,0);R.cam.snap=true;
 M.ui.render();missionHud(b);$('battleView')?.classList.remove('ow-fade');const bl=$('owBubbles');if(bl)bl.innerHTML='';
 const tt=$('owTitle');if(tt)tt.textContent=m.place.name;const sb=$('owSub');if(sb)sb.textContent=`${m.place.label} · ${D.moodText(m.place.mood)}`;
 const stn=$('owStation');if(stn)stn.textContent=`${si+1}. ${D.THEMES[sec.theme].name}${sec.boss?' · Ziel':''}`;
 if(introLine)mlog(introLine,'narr');
 mlog(esc(D.THEMES[sec.theme].text),'narr');
 for(const sti of sec.stations){if(!live(b))return;await encounter(b,sti);if(!live(b))return;
  if(sti!==sec.stations[sec.stations.length-1]||!sec.boss){await waitNext();if(!live(b))return;}}
 if(sec.boss)return;await marchTo(b,b.width-D.marginX(b.width)-40,70);if(!live(b))return;
 $('battleView')?.classList.add('ow-fade');await sleep(600);if(!R.m||R.ended)return;await runSection(si+1);}
function waitNext(){return new Promise(res=>{R.nextRes=res;});}
async function encounter(b,sti){const m=R.m,st=m.place.stations[sti],adv=m.kind==='adventure';m.idx=sti;
 const ok=await marchTo(b,st.fx-120,58);if(!ok)return;
 setButtons('talk');
 if(st.boss){const boss=m.queues[sti][0],bn=adv?first(boss):'Krassus';
  mlog(adv?`Vor euch wartet <b class="boss">${esc(boss.name)}</b>, ${esc(M.itemName(boss.enemyGear.weapon))} in der Hand.`:`Vor dem Kontor wartet <b class="boss">Krassus Knochenzins</b>, den Zweihänder „Zinseszins“ locker auf der Schulter.`);
  const firstA=D.beginEncounter(b,m,sti);b.paused=true;b.started=false;const k=firstA[0];
  for(const [w,l] of (adv?m.texts.leaderIntro:D.TEXT.bossIntro)){const me=w==='K'||w==='L',a=me?k:anyParty(b);bubble(a,l,{name:me?bn:first(a.g),boss:me,ms:2800});mlog(`<b class="${me?'boss':''}">${esc(me?bn:a.g.name)}:</b> „${esc(l)}“`);await sleep(2500/speed());if(!live(b))return;}
  b.started=true;b.paused=false;setButtons('fight');return;}
 const [l1,l2]=D.pickBanter(st,st.banter,m);const a1=anyParty(b);let a2=anyParty(b);if(a2===a1)a2=partyActors(b).find(x=>x!==a1)||a1;
 if(a1!==a2||partyActors(b).length>1){bubble(a1,l1,{name:first(a1.g)});mlog(`<b>${esc(a1.g.name)}:</b> „${esc(l1)}“`);await sleep(2000/speed());if(!live(b))return;
  bubble(a2,l2,{name:first(a2.g)});mlog(`<b>${esc(a2.g.name)}:</b> „${esc(l2)}“`);await sleep(1600/speed());if(!live(b))return;}
 else{const solo=pickL(['Allein. Natürlich allein. Wer braucht schon Freunde.','Ich red mit mir selbst. Wenigstens widerspricht keiner.','Wenn ich sterbe, erzählt es keiner. Gut so.']);bubble(a1,solo,{name:first(a1.g)});mlog(`<b>${esc(a1.g.name)}:</b> „${esc(solo)}“`);await sleep(2000/speed());if(!live(b))return;}
 const q=m.queues[sti];
 if(st.kind==='idle'){const t=st.idle.text.replace('{A}',q[0]?.name||'Einer').replace('{B}',q[1]?.name||'ein anderer');mlog(esc(t),'narr');}
 else if(st.kind==='ambush')mlog('Hinter euch knackt ein Zweig. Vor euch auch.','narr');
 else if(st.kind==='ahead')mlog('Weiter vorn kommen zwei Gestalten den Weg herunter. Sie gehen schneller, als sie euch sehen.','narr');
 else mlog('Eine Tür quietscht.','narr');
 const firstA=D.beginEncounter(b,m,sti);b.paused=true;b.started=false;const evs=[...b.events];b.events.length=0;
 for(const a of firstA){const g=a.g;bubble(a,g.debtShout,{name:g.name});mlog(`<b class="foe">${esc(g.name)}</b>${st.kind==='idle'?'':' kommt aus '+esc(evs.find(e=>e.actor===a)?.door||'dem Nichts')}. Er ${esc(g.debtOwes)}. Waffe: ${esc(M.itemName(g.enemyGear.weapon))}.`);await sleep(500/speed());}
 b.events.length=0;await sleep(900/speed());if(!live(b))return;
 for(const a of b.actors){a.to=null;a.path=null;}
 b.started=true;b.paused=false;setButtons('fight');}
async function encounterEnd(b){const m=R.m;if(R.ended)return;const out=D.endEncounter(m,b);b.done=null;b.paused=true;renderInfo();const st=out.station,adv=m.kind==='adventure';
 for(const g of out.died)mlog(`<b class="red">† ${esc(g.name)}</b> ist tot. Death is permanent.${adv?'':' Krassus wird das als Ausfall verbuchen.'}`,'dead');
 for(const g of out.downed)mlog(`${esc(g.name)} kann nicht mehr und wird ab jetzt getragen.`);
 if(out.winner===0){
  if(out.loot.length)mlog('Beute: '+out.loot.map(l=>`<span class="ow-lootname">${esc(M.itemName(l.item))}</span>`).join(', '));
  if(st.boss){setButtons('talk');const boss=b.encEnemies[0],bn=adv?first(boss.g):'Krassus';
   for(const [w,l] of (adv?m.texts.leaderDown:D.TEXT.bossDown)){const me=w==='K'||w==='L',a=me?boss:anyParty(b);bubble(a,l,{name:me?bn:first(a.g),boss:me,ms:3000});mlog(`<b class="${me?'boss':''}">${esc(me?bn:a.g.name)}:</b> „${esc(l)}“`);await sleep(2600/speed());}
   mlog(adv?`In der Truhe des Anführers: <b class="gold">${m.gold} Gold</b>.`:`In der Geldkassette: <b class="gold">${m.gold} Gold</b>. Der Schuldschein über ${D.CFG.debt.toLocaleString('de-DE')} Gold brennt sehr schön.`,'narr');setButtons('won');return;}
  const a=anyParty(b),l=pickL(adv?D.ADV.cleared:D.TEXT.cleared);if(a){bubble(a,l,{name:first(a.g)});mlog(`<b>${esc(a.g.name)}:</b> „${esc(l)}“`);}
  if(out.rest>0)mlog(`Kurze Rast: Notverbände, ein Schluck Wasser. Blut +${D.CFG.restBlood}. Verletzungen bleiben.`,'narr');
  if(m.state==='lost'){finishMission('lost');return;}
  const nx=m.place.stations[st.i+1];mlog(`${m.party.filter(D.fit).length} von ${m.party.length} können noch kämpfen. Weiter Richtung ${nx?.boss?'<b>'+esc(D.THEMES[nx.theme].name)+'</b>':esc(nx?D.THEMES[nx.theme].name:'Ziel')}?`,'narr');
  setButtons('next');return;}
 if(m.state==='fled'){finishMission('fled');return;}
 finishMission('lost');}
async function next(){if(R.awaiting==='won'){finishMission('won');return;}if(R.awaiting!=='next')return;setButtons('march');const r=R.nextRes;R.nextRes=null;r?.();}
async function flee(){const m=R.m,b=S.battle;if(!m||R.ended||['flee','won','end'].includes(R.awaiting))return;
 if(R.awaiting==='next'){finishMission('withdrawn');return;}
 setButtons('flee');R.fleeing=true;const inFight=b&&b.started&&!b.done;
 if(b){b.paused=true;if(inFight){b.done={winner:-2,reason:'Flucht'};b.handled=true;}
  for(const a of b.actors)if(a.team===0&&!a.down&&!a.g.dead){a.to=[a.x-500,a.y,120];a.path=[];}
  const a=anyParty(b);if(a)bubble(a,pickL(['RENNT!','Taktischer Rückzug! Also: RENNT!','Ich hol schon mal die Pferde! Wir haben keine Pferde!','Wer zuletzt am Tor ist, zahlt die Zinsen!']),{name:first(a.g)});}
 await sleep(1600/speed());if(b&&inFight)D.endEncounter(m,b,{fled:true});m.state='fled';finishMission('fled');}
function cleanupBattle(){const m=R.m;if(m&&m.prevLimit!==undefined){if(m.prevLimit===null)delete M.benchmarkTimeLimit;else M.benchmarkTimeLimit=m.prevLimit;}
 M.missionBackdrop=null;document.body.classList.remove('ow-mission');$('owOver')?.remove();const bb=$('battleBottom');if(bb){bb.innerHTML='';delete bb.dataset.ow;}$('battleView')?.classList.remove('ow-fade');}
function abortMission(){R.ending=true;R.ended=true;cleanupBattle();R.m=null;R.b=null;R.nextRes=null;}
function finishMission(kind){const m=R.m;if(R.ended)return;R.ended=true;R.ending=true;R.fleeing=false;R.marching=false;setButtons('end');R.nextRes=null;
 const b=S.battle;if(b)b.paused=true;
 setTimeout(()=>{try{applyResult(m,kind);}catch(e){console.error(e);}if(S.battle?.mission===m)S.battle=null;cleanupBattle();R.m=null;R.b=null;persist();view='result';M.ui.click('nav:outside');},kind==='won'?600:900);}
function applyResult(m,kind){const st=ST(),adv=m.kind==='adventure',keep=kind!=='lost';
 if(st.run?.id!==R.runId)return;// anderer Spielstand: nichts anwenden
 const loot=[];if(keep)for(const l of m.loot){const item=M.copy(l.item);item.id=M.uid();item.durability=Math.max(1,Math.round(Math.min(item.durability??item.maxDurability,item.maxDurability??item.durability??1)));S.inventory.push(item);loot.push({name:M.itemName(item),from:l.from});}
 const gold=keep&&kind==='won'?m.gold:0;if(gold){S.gold+=gold;if(S.stats)S.stats.earned=(S.stats.earned||0)+gold;}
 if(!adv&&kind==='won'){st.stage='done';st.wins++;st.questDay=S.day;st.adv=newAdventure();st.lastAdventure=S.day;}
 if(adv&&kind==='won')st.advWins++;
 if(!adv&&kind!=='won')st.quest={...newQuestPlace(),name:st.quest?.name||m.place.name};
 const head=adv?{won:['SIEG',`${m.place.name} atmet auf. Oder hält die Luft an. Die ${m.texts.band} ist zerschlagen, ihr Anführer liegt im Dreck, seine Truhe gehört euch.`],
   fled:['GEFLOHEN','Ihr rennt. Würdevoll ist anders, aber lebendig ist auch was. Die Beute bis hierher habt ihr behalten.'],
   withdrawn:['HEIMGEKEHRT','Ihr nehmt, was ihr habt, und geht. Die Bande zählt ihre Toten. Ihr zählt eure Beute.'],
   lost:['NIEDERLAGE',`Ihr wacht im Straßengraben vor ${m.place.name} auf. Ohne Beute, ohne Würde. Die Bande hat sogar die Stiefel mitgenommen. Fast.`]}[kind]
  :{won:['SCHULDEN GETILGT',`Krassus Knochenzins liegt im Dreck von ${m.place.name}. Der Schuldschein ist Asche, die Dörfler jubeln. Nicht für euch. Sie jubeln, weil sie jetzt niemandem mehr etwas schulden. Außer dem Totengräber. Ab jetzt steht euch das Land offen: Hinter dem Tor warten jeden Tag neue Abenteuer.`],
   fled:['GEFLOHEN','Ihr rennt. Würdevoll ist anders, aber lebendig ist auch was. Die Beute bis hierher habt ihr behalten. Krassus wartet weiter.'],
   withdrawn:['ABGEZOGEN','Ihr nehmt, was ihr habt, und geht. Krassus wird es merken. Aber nicht heute.'],
   lost:['NIEDERLAGE',`Ihr wacht im Straßengraben vor ${m.place.name} auf. Ohne Beute, ohne Würde, aber mit einer frischen Mahnung im Gürtel.`]}[kind];
 for(const g of m.party){if(g.dead)continue;g.history?.unshift({day:S.day,text:(adv?'Abenteuer':'Außenmission')+' '+m.place.name+': '+head[0].toLowerCase()+'.'});}
 try{M.log?.((adv?'Abenteuer':'Der Schuldeneintreiber')+' · '+m.place.name+': '+head[0]+(loot.length?' · '+loot.length+' Beutestücke':'')+(gold?' · '+gold+' Gold':''));}catch(e){}
 st.history.unshift({day:S.day,kind:m.kind,place:m.place.name,result:head[0].toLowerCase(),loot:loot.length,gold,deaths:m.deaths.length});st.history=st.history.slice(0,12);st.run=null;
 result={kind,title:head[0],text:head[1],loot,gold,goldFrom:adv?'aus der Truhe des Anführers':'aus der Geldkassette',extra:!adv&&kind==='won'?'Schulden: −'+D.CFG.debt.toLocaleString('de-DE')+' Gold (Schuldschein verbrannt)':'',
  stats:`Gegner besiegt: ${m.killed} von ${m.total} · Begegnungen: ${m.cleared+1} von ${m.place.stations.length} · Tote: ${m.deaths.length}`,
  party:m.party.map(g=>{const hp=g.dead?0:Math.round(M.health(g)),inj=Object.entries(g.body||{}).filter(([k,p])=>p.missing||p.hp<85).sort((x,y)=>x[1].hp-y[1].hp).map(([k,p])=>p.missing?M.partName(k)+' fehlt':M.partName(k)+' '+Math.round(p.hp)+(p.fracture?' (Bruch)':'')).slice(0,4).join(', ');
   return {name:g.name,role:g.role,dead:g.dead,line:g.dead?'tot':'Gesundheit '+hp+' % · Blut '+Math.round(g.blood)+' · Erschöpfung '+Math.round(g.fatigue)+(inj?' · '+inj:'')};})};}
})();
