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
 CAST.kra=D.boss(1);M.registerFace?.(/krassus|knochenzins/i,()=>CAST.kra);
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
function say(who,text,mood='calm',o={}){return new Promise(res=>{const box=$('owTalk');if(!box)return res();box.hidden=false;F.speaker=o.actor||({L:'lan',K:'kra',G1:'g1',G2:'g2',SM:'smith',O:'oro'})[who]||null;M.speakLine?.(text,({K:'kra',SM:'smith',O:'oro'})[who]||who,F.actors[F.speaker]?.g||null);
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
const prevOverlay=M.ludusOverlay;// vorherige Ebenen (Halle der Gefallenen, Hühnerschule, Bogner) immer mitzeichnen
M.ludusOverlay=(g,t)=>{try{prevOverlay?.(g,t);}catch(e){console.warn(e);}const st=ST();if(!st.stage)return;
 const c=g.canvas;if(c&&c!==hoverCanvas&&c.id==='ludusCanvas'){hoverCanvas=c;c.addEventListener('mousemove',e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)*900/r.width,y=(e.clientY-r.top)*c.height/r.height,G=A.GATE,h=x>=G.x&&x<=G.x+G.w&&y>=G.y&&y<=G.y+G.h;if(h!==hot){hot=h;c.style.cursor=h?'pointer':'';}});}
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
// Art der Plünderung: zufällig Bandenjagd oder Wagenüberfall (seit 26.10.), bleibt beim Wechsel der Gegend erhalten
const WAGON_SHARE=.35,advMode=()=>Math.random()<WAGON_SHARE?'wagon':'band';
function newAdventure(biome,diff,mode){const b=biome||pickL(['dorf','dorf','wald','stadt']);return {seed:(Math.random()*1e9)>>>0,biome:b,diff:diff||2,mode:mode||advMode()};}
// Totenkopf im Pixelstil (9×9), für die Schwierigkeit der Plünderungen
const SKULL=['..XXXXX..','.XXXXXXX.','XXXXXXXXX','X..XXX..X','X..XXX..X','XXXX.XXXX','.XXXXXXX.','..X.X.X..','..XXXXX..'];
function skull(on,px=3){let r='';SKULL.forEach((row,y)=>[...row].forEach((c,x)=>{if(c==='X')r+=`<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`;}));return `<svg class="ow-skull ${on?'on':''}" viewBox="0 0 9 9" width="${9*px}" height="${9*px}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;}
function skulls(n,px=3){return `<span class="ow-skulls" title="${n} von 5 Totenköpfen">${[1,2,3,4,5].map(i=>skull(i<=n,px)).join('')}</span>`;}
const DIFF_CHANCE=['ca. 95 %','ca. 75 %','ca. 50 %','ca. 25 %','ca. 5 %'];
const adventureReady=()=>{const st=ST();return st.stage==='done'&&st.lastAdventure!==S.day;};
let sel=null,view='board',result=null,reportForResult=null;
function openBoard(){const st=ST();if(st.stage==='open')st.seenBoard=true;if(st.stage==='done')st.seenAdvDay=S.day===st.lastAdventure?st.seenAdvDay:true;view='board';M.ui.click('nav:outside');}
function fighters(){return S.roster.filter(g=>!g.dead&&!g.smithDuty);}
function selected(){const ids=sel||new Set();return fighters().filter(g=>ids.has(g.id)&&D.fit(g));}
function autoPick(n=5){const pool=fighters().filter(D.fit).sort((a,b)=>score(b)-score(a));sel=new Set(pool.slice(0,n).map(g=>g.id));}
function score(g){return M.health(g)*.5+(g.blood||0)*.2-(g.fatigue||0)*.3+(g.stats?.experience||0)+(g.kills||0)*.5;}
function statusLine(g){const hp=Math.round(M.health(g)),fit=D.fit(g);return fit?`Gesundheit ${hp} % · Blut ${Math.round(g.blood)}${g.fatigue>1?' · Erschöpfung '+Math.round(g.fatigue):''}`:`kampfunfähig (${hp} %)`;}
function weaponName(g){try{return M.itemName(M.gear(g,'weapon'))||'Fäuste';}catch(e){return '–';}}
function placeFor(kind){const st=ST();if(kind==='quest'){const P=D.generate(st.quest.seed,'dorf');P.name=st.quest.name;return P;}return advPreview()?.place||D.generate(st.adv.seed,st.adv.biome);}
function advPreview(){const st=ST(),team=selected(),party=team.length?team:fighters().filter(D.fit).slice(0,1);try{return st.adv.mode==='wagon'&&D.newWagonMission?D.newWagonMission(st.adv.seed,party,st.adv.biome,{diff:st.adv.diff||2}):D.newMission(st.adv.seed,party,st.adv.biome,{kind:'adventure',diff:st.adv.diff||2});}catch(e){console.error(e);return null;}}
function boardPage(){const st=ST();
 if(!st.stage)return `<section class="box ow-board"><p class="eyebrow">PLÜNDERUNGEN</p><h1>Das Tor ist zu</h1><p>Erst die Lehrjahre im Ludus. Danach geht es hinaus.</p><div class="buttons"><button class="btn" data-action="nav:home">‹ Zurück in den Ludus</button></div></section>`;
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
 else{const m=advPreview(),ready=adventureReady(),BI={dorf:'Dorf',wald:'Wald',stadt:'Stadt'},dv=st.adv.diff||2;
  const wag=st.adv.mode==='wagon';
  card=`<div class="box ow-card"><span class="ow-tag">${wag?'PLÜNDERUNG · WAGENÜBERFALL':'PLÜNDERUNG · BANDENJAGD'}</span><h2>${esc(P.label)} ${esc(P.name)}</h2>
  <p>${wag?`Auf dem Weg bei ${esc(P.name)} fahren Händler. Ihr legt euch am Wegesrand auf die Lauer, späht jeden Wagen durchs Fernglas aus und entscheidet, ob ihr zuschlagt. Vom Bauernkarren bis zum Geldwagen ist alles unterwegs.`:esc((D.ADV[st.adv.biome]?.intro||'').replace('{P}',P.name))}</p>
  <div class="buttons ow-biomes">${Object.entries(BI).map(([k,l])=>`<button class="btn ${st.adv.biome===k?'primary':''}" data-action="outside:biome:${k}">${l}</button>`).join('')}<button class="btn" data-action="outside:reroll">Anderes Ziel ↻</button></div>
  <div class="ow-diff"><b>Schwierigkeit</b><div class="ow-diff-row">${[1,2,3,4,5].map(d=>`<button type="button" class="ow-dbtn ${d===dv?'on':''}" data-action="outside:diff:${d}" aria-label="${d} Totenköpfe">${skulls(d,2)}</button>`).join('')}</div>
   <p class="tiny"><b>${esc(D.DIFF.names[dv-1])}</b> · Aussicht auf Erfolg ${DIFF_CHANCE[dv-1]} · Beute ×${String(D.DIFF.gold[dv-1]).replace('.',',')}${dv>=3?' · Grobiane und Veteranen möglich':''}${dv>=4?' · Anführer mit Spitzenwaffe':''}</p></div>
  <dl>${wag?`<dt>Gegner</dt><dd>Bis zu ${D.WAGON?.wagons||3} Wagen mit Wachen. Jeder Wagen hat seine eigenen Totenköpfe (um die gewählte Stufe herum), das Fernglas zeigt sie. Wachen nach eurer Gruppe (${n||1} Kämpfer).</dd><dt>Belohnung</dt><dd>Gold aus dem Wagen · ein Stück aus der Ladung (Rüstung, Waffe oder Schild) · alles, was die Wachen fallen lassen</dd>`
  :`<dt>Gegner</dt><dd>${m?`${D.ADV[st.adv.biome].band}: etwa ${m.total-1} ${esc(D.ADV[st.adv.biome].who)} in ${m.groups?.length||3} Gruppen, am Ende ihr berüchtigter Anführer mit Leibwache. Stärke richtet sich nach eurer Gruppe (${n||1} Kämpfer) und den Totenköpfen.`:'unbekannt'}</dd><dt>Belohnung</dt><dd>Die Truhe des Anführers (Gold) · alle Waffen und Schilde, die fallen</dd>`}<dt>Regel</dt><dd>${ready?'Eine Plünderung pro Tag.':'<b class="red">Heute wart ihr schon plündern. Morgen wieder.</b>'}</dd></dl>
  <canvas class="ow-map" data-owmap="adventure" width="480" height="270"></canvas><p class="tiny">Plünderungen bisher: ${st.adventures} · gewonnen: ${st.advWins}</p></div>`;}
 // Anführer ab 5 Kämpfern: gewählter (★) oder der mit dem besten Führungswert
 const ldr=L&&team.length>=L.CFG.minParty?(team.find(g=>g.id===st.leaderId)||L.pickLeader(team)):null,lq=ldr?L.quality(ldr):null;
 const rows=fighters().map(g=>{const fit=D.fit(g),on=sel.has(g.id)&&fit,isL=ldr&&ldr.id===g.id;return `<button type="button" class="ow-pick ${on?'on':''} ${fit?'':'off'}" data-action="outside:pick:${esc(g.id)}" ${fit?'':'disabled'}><i>${on?'✓':''}</i><span><b>${isL?'★ ':''}${ROLE_ICON[g.role]||''} ${esc(g.name)}</b><small>${esc(g.role)} · ${esc(weaponName(g))}${L?' · Führung '+L.quality(g).lead+' · Teamgeist '+Math.round(g.stats?.teamwork||0):''}</small><small>${esc(statusLine(g))}</small></span>${ldr&&on?`<span class="ow-star ${isL?'on':''}" role="button" title="Zum Anführer machen" data-action="outside:lead:${esc(g.id)}">★</span>`:''}</button>`;}).join('');
 const leadBox=!L?'':ldr?`<p class="ow-lead"><b>★ Anführer: ${esc(ldr.name)}</b> · Führungswert ${lq.lead} (Taktik, Erfahrung, Willenskraft, Moral) · sieht Gegner zu ${Math.round(lq.spot*100)} % zuerst · prüft die Lage alle ${lq.scan.toFixed(1).replace('.',',')} s. Mit ★ wählst du selbst.</p>`:`<p class="ow-lead tiny">Ab ${L.CFG.minParty} Kämpfern führt ein Anführer: Er entdeckt Gegner meist zuerst, hält eine Einsatzbesprechung und gibt im Kampf Befehle.</p>`;
 const can=n>=D.CFG.minParty&&n<=D.CFG.maxParty&&(quest||adventureReady());
 const hist=st.history.slice(0,6).map(h=>`<li><b>Tag ${h.day}</b> · ${h.diff?skulls(h.diff,1)+' ':''}${esc(h.place||'')} · ${esc(h.result)}${h.loot?` · ${h.loot} Beutestücke`:''}${h.gold?` · ${h.gold} Gold`:''}${h.deaths?` · <span class="red">${h.deaths} tot</span>`:''}</li>`).join('');
 requestAnimationFrame(paintBoard);
 return `<section class="ow-board"><div class="ow-head"><div><p class="eyebrow">PLÜNDERUNGEN · VOR DEM TOR</p><h1>${quest?'Krassus wartet':'Auf zum Plündern'}</h1></div><div class="buttons"><button class="btn" data-action="nav:home">‹ Ludus</button><button class="btn" data-action="outside:intro">▶ Szene „Der Schuldeneintreiber“</button></div></div>
 <div class="ow-cols"><div>${card}</div>
 <div class="box"><h2>Wer geht mit?</h2><p class="tiny">1 bis ${D.CFG.maxParty} Kämpfer. Kein Steuern unterwegs: nur Weiter oder Fliehen. Fliehen geht immer. Verletzungen bleiben, Tote bleiben tot. Nach jedem gesäuberten Ort eine kurze Rast.</p>
  <div class="buttons"><button class="btn" data-action="outside:auto:5">Beste 5</button><button class="btn" data-action="outside:auto:10">Beste 10</button><button class="btn" data-action="outside:none">Keiner</button><button class="btn" data-action="outside:equip" title="Verteilt die beste freie Ausrüstung aus dem Lager an die gewählten Kämpfer (gesperrte Plätze bleiben)">⚔ Gruppe ausrüsten</button></div>
  ${leadBox}<div class="ow-picks">${rows||'<p>Keine Kämpfer im Kader.</p>'}</div>
  <p class="ow-need ${can?'ok':''}">${n>D.CFG.maxParty?'Höchstens '+D.CFG.maxParty+' Kämpfer.':n<1?'Mindestens ein kampffähiger Kämpfer.':n+' von höchstens '+D.CFG.maxParty+' gewählt.'}</p>
  <div class="buttons"><button class="btn primary" data-action="outside:go" ${can?'':'disabled'}>Aufbrechen ▶</button></div>
  ${hist?`<h3>Unterwegs gewesen</h3><ul class="ow-hist">${hist}</ul>`:''}</div></div></section>`;}
function paintBoard(){const st=ST();for(const c of document.querySelectorAll('canvas[data-owmap]')){const kind=c.dataset.owmap;try{const P=kind==='quest'?placeFor('quest'):placeFor('adventure');A.map(c,P,{reveal:0,cleared:-1,progress:0,party:A.mapPoint(P,0)});}catch(e){console.error(e);}}void st;}
function resultPage(){const r=result,cls={won:'ok',fled:'',withdrawn:'',spared:'',passed:'',lost:'red'}[r.kind]||'';requestAnimationFrame(()=>{});
 return `<section class="ow-board"><div class="ow-head"><div><p class="eyebrow">PLÜNDERUNG · ZURÜCK IM LUDUS</p><h1 class="${cls}">${esc(r.title)}</h1></div><div class="buttons"><button class="btn primary" data-action="outside:board">Weiter</button><button class="btn" data-action="nav:home">‹ Ludus</button></div></div>
 <div class="box"><p class="ow-res-text">${esc(r.text)}</p><p class="tiny">${esc(r.stats)}</p></div>
 <div class="ow-cols"><div class="box"><h2>Beute</h2><ul class="ow-hist">${r.loot.length?r.loot.map(l=>`<li><b>${esc(l.name)}</b> <small>von ${esc(l.from)}</small></li>`).join(''):'<li>Keine Beute.</li>'}${r.gold?`<li><b class="gold">${r.gold} Gold</b> <small>${esc(r.goldFrom)}</small></li>`:''}${r.extra?`<li><b>${esc(r.extra)}</b></li>`:''}</ul>${r.loot.length?'<p class="tiny">Alles liegt im Lager (Waffenkammer).</p>':''}</div>
 <div class="box"><h2>Truppe</h2><ul class="ow-hist">${r.party.map(p=>`<li class="${p.dead?'red':''}"><b>${p.dead?'† ':''}${esc(p.name)}</b> <small>${esc(p.role)}</small><br><small>${esc(p.line)}</small></li>`).join('')}</ul></div></div>${reportBlock()}</section>`;}
// Gelernte Werte vorher → nachher (wie der Kampfbericht der Arena)
function valueOf(g,path){const [grp,key]=path.split(':');try{if(grp==='stats')return [g.stats[key],g.caps.stats[key]];if(grp==='moves')return [g.moves[key],g.caps.moves[key]];if(grp==='weapons')return [g.mastery[key],g.caps.weapons[key]];const [id,k]=key.split('.');return [g.body[id][k],g.caps.body[id][k]];}catch{return [null,null];}}
const f1=v=>(Math.round(v*10)/10).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1});
function reportBlock(){const rp=reportForResult;if(!rp)return '';
 const card=a=>{const g=S.roster.find(x=>x.id===a.id),learn=Object.entries(a.learning||{}).filter(([,v])=>v>.0001).sort((x,y)=>y[1]-x[1]);
  const rows=learn.map(([k,v])=>{const [now,cap]=g?valueOf(g,k):[null,null];return `<li><span>${esc(M.learningLabel?.(k)||k)}</span><b>${now!=null?f1(now-v)+' → '+f1(now):'+'+v.toFixed(2)}</b><small>${cap!=null?'SOLL '+Math.round(cap):''}</small></li>`;});
  const stat=(n,v)=>`<span><b>${v}</b>${n}</span>`;
  return `<div class="an-gain arp-man${a.dead?' dead':''}"><b>${a.dead?'✝ ':''}${esc(a.name)}</b><small class="arp-state">${a.dead?'gefallen':a.down?'kampfunfähig · überlebt':'überlebt'}</small><div class="arp-stats">${stat('Schaden',a.damage)}${stat('Erlitten',a.taken)}${stat('Kills',a.kills)}${stat('Krit.',a.crits)}${stat('Blocks',a.blocks)}${stat('Ausgew.',a.dodges)}</div>${rows.length?`<ul>${rows.slice(0,6).join('')}</ul>${rows.length>6?`<details><summary>${rows.length-6} weitere gelernte Werte</summary><ul>${rows.slice(6).join('')}</ul></details>`:''}`:'<p>Keine messbare Verbesserung.</p>'}</div>`;};
 return `<div class="box ow-report"><div class="an-gains arp"><h3>Kampfbericht · was deine Gladiatoren gelernt haben</h3>${rp.actors.map(card).join('')}${rp.recipes?.length?`<p class="arp-recipe">⚒ Schmiederezept erlernt: <b>${rp.recipes.map(esc).join(', ')}</b></p>`:''}<div class="arp-foot"><button type="button" class="btn" data-action="nav:report">VOLLER KAMPFBERICHT ▸</button></div></div></div>`;}
const prevPage=M.schoolPage;
M.schoolPage=p=>p==='outside'?boardPage():prevPage?prevPage(p):undefined;
const prevClick=M.schoolClick;
M.schoolClick=action=>{if(!action.startsWith('outside:'))return prevClick?prevClick(action):false;const [,k,v]=action.split(':');const st=ST();
 if(k==='pick'){sel??=new Set();if(sel.has(v))sel.delete(v);else if(sel.size<D.CFG.maxParty)sel.add(v);else notify('Höchstens '+D.CFG.maxParty+' Kämpfer.');M.ui.render();return true;}
 if(k==='auto'){autoPick(+v||5);M.ui.render();return true;}
 if(k==='lead'){st.leaderId=v;persist();M.ui.render();return true;}
 if(k==='none'){sel=new Set();M.ui.render();return true;}
 if(k==='equip'){const team=selected();let msg=team.length?M.army.autoEquip(team,S.army?.equipPriority||'balanced'):'Erst Kämpfer auswählen.';
  // Fernkämpfer und Assassinen nur in Leder/Mittel: Metall nimmt ihnen den Laufvorteil
  let off=0;for(const g of team)if(g.role!=='Soldat')for(const [slot,id] of Object.entries(g.equipment?.armor||{})){const it=id&&M.inventoryItem?.(id);if(it?.material==='metal'){g.equipment.armor[slot]=null;off++;}}
  if(off)msg+=` · ${off} Metallteil${off>1?'e':''} bei Schützen/Assassinen abgelegt (schneller zu Fuß)`;notify(msg);persist();M.ui.render();return true;}
 if(k==='biome'){st.adv=newAdventure(v,st.adv?.diff,st.adv?.mode);persist();M.ui.render();return true;}
 if(k==='diff'){st.adv??=newAdventure();st.adv.diff=Math.max(1,Math.min(5,+v||2));persist();M.ui.render();return true;}
 if(k==='reroll'){st.adv=newAdventure(st.adv?.biome,st.adv?.diff);persist();M.ui.render();return true;}
 if(k==='intro'){playIntro();return true;}
 if(k==='board'){view='board';result=null;M.ui.render();return true;}
 if(k==='open'){openBoard();return true;}
 if(k==='go'){startMission();return true;}
 return true;};

// =====================================================================================================
// MISSION: Marsch durch breite Abschnitte, Begegnungen, Kampf mit der echten Engine
// =====================================================================================================
const L=window.DebtLeader,LU=window.DebtLeaderUI,SH=window.DebtShow,NT=window.DebtNotorious;
const R={m:null,b:null,lastTime:0,awaiting:null,ended:false,fleeing:false,cam:{x:520,y:600,snap:true},progress:0,marching:false,nextRes:null,rows:[],rowKey:0,runId:null};const VH=760;
const speed=()=>Math.max(1,S.options?.speed||1);
function overlayDom(){const view=$('battleView');if(!view)return null;let o=$('owOver');if(o&&o.parentNode===view)return o;
 o=document.createElement('div');o.id='owOver';o.innerHTML=`<canvas id="owWx"></canvas><div id="owBubbles"></div><div class="ow-top"><div class="ow-title"><b id="owTitle"></b><small id="owSub"></small></div><div class="ow-chips"><span class="tag" id="owStation"></span><span class="tag" id="owCount"></span><span class="tag" id="owLoot"></span></div></div><div class="ow-mapbox" id="owMapBox"><canvas id="owMap" width="480" height="270"></canvas></div><div class="ow-logbox" id="owLogBox" hidden><div id="owLog"></div></div>
 <div class="ow-auto" id="owAuto" hidden><b id="owAutoText"></b><div><button type="button" class="btn primary" id="owNext">Weiter ▶</button><button type="button" class="btn" id="owHome">Heimkehren (ohne Beute)</button></div></div>
 <div class="ow-ctrl"><span id="owState"></span><button type="button" class="btn" id="owFlee">Fliehen</button><button type="button" class="btn" id="owSpdBtn">1×</button><button type="button" class="btn" id="owLogBtn">Bericht</button><button type="button" class="btn" id="owMapBtn">Karte</button><span class="ow-zoom"><button type="button" class="btn" id="owZoomOut" aria-label="Herauszoomen">−</button><b id="owZoomTxt">1×</b><button type="button" class="btn" id="owZoomIn" aria-label="Hineinzoomen">+</button></span><button type="button" class="btn" id="owFollow" hidden title="Kamera wieder der Truppe folgen lassen">◎ Folgen</button><button type="button" class="btn" id="owFogBtn" title="Kampfnebel an/aus">Nebel an</button></div>`;
 view.insertBefore(o,$('battleBottom'));if(innerWidth<600)$('owMapBox').hidden=true;LU?.mount(o);SH?.mount(o);
 // Bedienung liegt im Kampfbild (nicht ganz unten), damit man auf dem Handy nie scrollen muss
 $('owNext').onclick=next;$('owHome').onclick=flee;$('owFlee').onclick=flee;
 $('owLogBtn').onclick=()=>{const bx=$('owLogBox');bx.hidden=!bx.hidden;$('owLogBtn').classList.toggle('primary',!bx.hidden);if(!bx.hidden)$('owLog').scrollTop=1e9;};$('owMapBtn').onclick=()=>{const bx=$('owMapBox');bx.hidden=!bx.hidden;};
 $('owZoomOut').onclick=()=>setZoom((R.zoom||1)/1.25);$('owZoomIn').onclick=()=>setZoom((R.zoom||1)*1.25);setZoom(R.zoom||1);
 $('owFollow').onclick=()=>setFollow(true);setFollow(!R.manual);
 const showFog=()=>{$('owFogBtn').textContent=FOG.on?'Nebel an':'Nebel aus';};$('owFogBtn').onclick=()=>{FOG.on=!FOG.on;showFog();};showFog();
 const sb=$('owSpdBtn'),showSp=()=>{sb.textContent=clamp(Math.round(S.options?.speed||1),1,3)+'×';};showSp();sb.onclick=()=>{S.options.speed=clamp(Math.round(S.options.speed||1),1,3)%3+1;showSp();};
 setButtons(R.awaiting||'march');return o;}
function bottomDom(){const bb=$('battleBottom');if(!bb)return;if(bb.dataset.ow===R.runId)return;bb.dataset.ow=R.runId;
 bb.innerHTML=`<div class="fight-log" id="owLogShort"></div>`;
 for(const h of R.rows.slice(0,2).reverse())logShort(h);}
function missionHud(b){overlayDom();bottomDom();const top=$('battleTop');if(top&&top.innerHTML)top.innerHTML='';for(const id of ['finaleBanner','verdictSkip'])if($(id))$(id).hidden=true;if($('battleEvent')&&$('battleEvent').style.display!=='none')$('battleEvent').style.display='none';sizeFieldSoon();}
const prevArmyHud=M.armyBattleHUD;M.armyBattleHUD=function(b){if(b?.mission&&R.m){missionHud(b);return true;}return prevArmyHud?prevArmyHud.apply(this,arguments):false;};
const prevEnd=M.endBenchmark;M.endBenchmark=function(w,r){if(S.battle?.mission)return D.onEngineEnd(w,r);return prevEnd?.apply(this,arguments);};
// Kamera: füllt die Höhe, folgt der Truppe (bei Kampf allen Beteiligten)
const hudCam=M.battleCamera;
function missionCam(b,width,height,W,H){const ov=SH?.camera(b,width,height,W,H)||LU?.camera(b,width,height,W,H);if(ov){sizeFieldSoon();return ov;}const Z=R.zoom||1,fit=Math.min(width/W,height/H),k=height/VH*Z,view=width/k,vh=VH/Z;sizeFieldSoon();
 const all=b.actors.filter(a=>!a.down&&!a.g.dead),foes=all.some(a=>a.team===1&&b.encEnemies.includes(a));const pa=foes?all:partyActors(b);
 let tx=pa.length?pa.reduce((s,a)=>s+a.x,0)/pa.length:R.cam.x,ty=pa.length?pa.reduce((s,a)=>s+a.y,0)/pa.length-30:R.cam.y;if(!foes)tx+=view*.18;
 if(R.manual){tx=R.cam.x;ty=R.cam.y;}
 const fx=v=>view>=W?W/2:clamp(v,view/2,W-view/2),fy=v=>vh>=H?H/2:clamp(v,vh/2,H-vh/2);tx=fx(tx);ty=fy(ty);const q=R.cam.snap?1:.06;R.cam.x+=(tx-R.cam.x)*q;R.cam.y+=(ty-R.cam.y)*q;R.cam.snap=false;
 R.cam.x=fx(R.cam.x);R.cam.y=fy(R.cam.y);return {zoom:k/fit,x:R.cam.x,y:R.cam.y};}
// Zoom im Missionskampf: Mausrad am PC, zwei Finger auf dem Handy, Knöpfe − / + (0,5× bis 3×; unter 1× sieht man mehr vom Schauplatz)
const ZMIN=.5,ZMAX=3,setZoom=z=>{R.zoom=R.zoomPref=clamp(z,ZMIN,ZMAX);const e=$('owZoomTxt');if(e)e.textContent=(Math.round(R.zoom*10)/10).toString().replace('.',',')+'×';};
function inField(e){return !!R.m&&e.target?.closest?.('#battleView')&&!e.target.closest('button,.ow-logbox,.ow-mapbox');}
addEventListener('wheel',e=>{if(!inField(e))return;e.preventDefault();setZoom((R.zoom||1)*Math.exp(-e.deltaY*.0015));},{passive:false});
let pinch=null;const tdist=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
addEventListener('touchstart',e=>{if(e.touches.length===2&&inField(e)){pinch={d:tdist(e.touches),z:R.zoom||1};}},{passive:true});
addEventListener('touchmove',e=>{if(pinch&&e.touches.length===2){e.preventDefault();setZoom(pinch.z*tdist(e.touches)/Math.max(1,pinch.d));}},{passive:false});
addEventListener('touchend',e=>{if(e.touches.length<2)pinch=null;},{passive:true});
M.battleCamera=function(b,...r){return b?.mission?missionCam(b,...r):hudCam?hudCam.call(this,b,...r):null;};
// Spielfeld ziehen: ein Finger bzw. Maus gedrückt halten und ziehen verschiebt die Kamera frei (zwei Finger zoomen weiter).
// Danach bleibt sie stehen, bis man „◎ Folgen“ tippt oder ein neuer Abschnitt beginnt.
const drag={id:null,x:0,y:0,cx:0,cy:0,moved:false,n:0};
function setFollow(on){R.manual=!on;const f=$('owFollow');if(f)f.hidden=on;}
addEventListener('pointerdown',e=>{if(!inField(e)||!e.target.closest?.('#arenaCanvas'))return;drag.n++;if(drag.n>1||(e.pointerType==='mouse'&&e.button!==0)){drag.id=null;return;}Object.assign(drag,{id:e.pointerId,x:e.clientX,y:e.clientY,cx:R.cam.x,cy:R.cam.y,moved:false});},{passive:true});
addEventListener('pointermove',e=>{if(drag.id!==e.pointerId||pinch)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<7)return;drag.moved=true;const k=toScreen(0,0).k||1;setFollow(false);R.cam.x=drag.cx-dx/k;R.cam.y=drag.cy-dy/k;},{passive:true});
const dragEnd=e=>{drag.n=Math.max(0,drag.n-1);if(drag.id===e.pointerId)drag.id=null;};addEventListener('pointerup',dragEnd,{passive:true});addEventListener('pointercancel',dragEnd,{passive:true});
addEventListener('touchstart',e=>{if(e.touches.length>1)drag.id=null;},{passive:true});
// ---------- Kampfnebel ----------
// Sparsam: ein kleines Raster (1 Zelle = 16 Feldpunkte) wird nur alle 0,15 s neu gezeichnet (dunkel füllen, um jeden eigenen
// Kämpfer einen weichen Kreis freistechen) und dann vergrößert über das Feld gelegt. Gegner außerhalb jeder Sichtweite werden
// nicht gezeichnet. Die Kampf-KI sieht weiter alles (reine Darstellung, Simulation unverändert). Abschaltbar: FOG.on=false.
const FOG={on:true,cell:16,every:.15,alpha:.8,sight:{Soldat:300,Assassine:330,Fernkämpfer:400},sightOther:300,c:null,t:0,b:null,seen:new Set()};
function fogSight(a){return FOG.sight[a.g?.role]??FOG.sightOther;}
function fogUpdate(b){const W=b.width||1040,H=b.height||VH,cw=Math.ceil(W/FOG.cell),ch=Math.ceil(H/FOG.cell);if(!FOG.c)FOG.c=document.createElement('canvas');const c=FOG.c;if(c.width!==cw||c.height!==ch){c.width=cw;c.height=ch;}
 const g=c.getContext('2d'),eyes=b.actors.filter(a=>a.team===0&&!a.g.dead);g.globalCompositeOperation='source-over';g.clearRect(0,0,cw,ch);g.fillStyle='#0b1216';g.fillRect(0,0,cw,ch);g.globalCompositeOperation='destination-out';
 for(const a of eyes){const r=fogSight(a)/FOG.cell,x=a.x/FOG.cell,y=a.y/FOG.cell,gr=g.createRadialGradient(x,y,r*.55,x,y,r);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();}
 g.globalCompositeOperation='source-over';FOG.seen=new Set();for(const e of b.actors){if(e.team===0)continue;if(eyes.some(a=>Math.hypot(a.x-e.x,a.y-e.y)<fogSight(a)*.92))FOG.seen.add(e);}FOG.b=b;}
function fogActive(b){return FOG.on&&!!b?.mission&&!!R.m&&S.battle===b&&!(LU&&(LU.SPY?.on||LU.CLOSE?.on))&&!(SH&&(SH.SH.on||SH.SH.cine||SH.SH.free));}
const prevFogOverlay=M.battleOverlay;M.battleOverlay=function(ctx,b){prevFogOverlay?.(ctx,b);if(!fogActive(b))return;const now=performance.now()/1000;if(FOG.b!==b||now-FOG.t>FOG.every){FOG.t=now;fogUpdate(b);}
 ctx.save();ctx.imageSmoothingEnabled=true;ctx.globalAlpha=FOG.alpha;ctx.drawImage(FOG.c,0,0,FOG.c.width*FOG.cell,FOG.c.height*FOG.cell);ctx.restore();};
const prevFogHidden=M.battleHidden;M.battleHidden=function(a){if(prevFogHidden?.(a))return true;const b=S.battle;if(!fogActive(b)||a.team===0||FOG.b!==b)return false;return !FOG.seen.has(a)&&!a.g.dead;};
M.outsideFog=FOG;
// Kampf-HUD: Kopfzeile mit Schule und Gegnern
if(M.battleHud){const prevBuild=M.battleHud.onBuild;M.battleHud.onBuild=(panel,b)=>{prevBuild?.(panel,b);if(!b?.mission)return;const n=panel.querySelectorAll('.bh-name b'),m=b.mission;if(n[0])n[0].textContent='BLAU · '+school().toUpperCase();if(n[1])n[1].textContent=(m.kind==='quest'?(b.section===m.place.sections.length-1?'KRASSUS & BANDE':'KRASSUS’ SCHULDNER'):(m.texts?.band||'BANDE').toUpperCase())+' · ROT';};}
M.drawSprite=(ctx,o)=>A.drawSprite(ctx,o);

// Layout nur selten abfragen (jede Abfrage erzwingt eine Neuberechnung der Seite)
function sizeFieldSoon(){const n=performance.now();if(n-(R.szT||0)>500){R.szT=n;sizeField();}}
function sizeField(){const c=$('arenaCanvas'),o=$('owOver');if(!c||!o)return;R.cw=c.clientWidth;R.ch=c.clientHeight;const L=c.offsetLeft+'px',T0=c.offsetTop+'px',W0=c.clientWidth+'px',H0=c.clientHeight+'px';
 if(o.style.left!==L||o.style.top!==T0||o.style.width!==W0||o.style.height!==H0){Object.assign(o.style,{left:L,top:T0,width:W0,height:H0});const w=$('owWx');if(w){w.width=c.clientWidth;w.height=c.clientHeight;}}}
addEventListener('resize',()=>{if(R.m)sizeField();});
function mlog(html,cls=''){R.rows=[html,...R.rows].slice(0,7);R.rowKey++;const el=$('owLog');if(el){const p=document.createElement('p');p.className=cls;p.innerHTML=html;el.appendChild(p);el.scrollTop=el.scrollHeight;while(el.children.length>80)el.firstChild.remove();}
 (R.full??=[]).push([html,cls]);logShort(html,cls);}
function logShort(html,cls=''){const sh=$('owLogShort');if(!sh)return;const q=document.createElement('p');q.className=cls;q.innerHTML=html;sh.prepend(q);while(sh.children.length>2)sh.lastChild.remove();}
function toScreen(x,y){const f=$('arenaCanvas'),cw=R.cw||f.clientWidth,ch=R.ch||f.clientHeight,k=ch/VH*(LU&&(LU.SPY.on||LU.CLOSE.on)?1:(R.zoom||1));return {x:cw/2+(x-R.cam.x)*k,y:ch/2+(y-R.cam.y)*k,k,cw,ch};}
// Lesedauer: 2,2 s plus 65 ms je Zeichen (mind. 3,5 s), unabhängig vom Spieltempo
const readMs=text=>Math.max(3500,2200+String(text).length*65);
// Dialogpausen: höchstens auf zwei Drittel verkürzt, auch bei 3×
/* Besprechung und Ansagen: erst weiter, wenn ausgesprochen ist (Klick aufs Feld überspringt) */const talkPause=async ms=>{await sleep(Math.max(ms*.66,ms/speed()));for(let n=0;n<160&&M.speechHold?.();n++)await sleep(125);};
const LAYER=()=>$('owBubbles');
// Immer nur eine Sprechblase zugleich, damit sie lesbar bleibt (vorher konnten mehrere übereinander liegen und abgeschnitten werden).
// Wichtige (Anführer, Boss, laut) lösen die laufende ab; normale warten kurz (höchstens zwei in der Schlange); kleine Zurufe entfallen, solange eine Blase steht.
// Jede gezeigte Blase wird leise vorgelesen (M.speakLine soft: nur wenn gerade kein Gespräch läuft).
const BQ={until:0,prio:0,queue:[],timer:0};
function bubble(a,text,o={}){if(!a||!text)return;const prio=o.lead||o.boss||o.loud?2:o.small?0:1,now=performance.now();
 if(prio<2&&M.fieldTalk&&!M.fieldTalk.ok()&&now>=BQ.until)return;if(prio===2&&(M.speechHold?.()||M.fieldTalk?.speaking?.())){BQ.queue.push([a,text,o,prio]);if(BQ.queue.length>3)BQ.queue.splice(0,BQ.queue.length-3);bubbleNext();return;}
 if(now<BQ.until){if(prio===0)return;if(prio===2&&BQ.prio<2){bubbleShow(a,text,o,prio);return;}BQ.queue.push([a,text,o,prio]);if(BQ.queue.length>2)BQ.queue.splice(0,BQ.queue.length-2);bubbleNext();return;}
 bubbleShow(a,text,o,prio);}
function bubbleShow(a,text,o,prio){/* erst ausreden lassen, wer gerade spricht */if(M.speechHold?.()||M.fieldTalk?.speaking?.()){BQ.queue.unshift([a,text,o,prio]);if(BQ.queue.length>3)BQ.queue.length=3;BQ.until=Math.max(BQ.until,performance.now()+200);bubbleNext();return;}const lay=LAYER();if(lay)for(const old of [...lay.children]){if(old.classList.contains('out'))continue;old.classList.add('out');setTimeout(()=>old.remove(),300);old._a=null;}
 const ms=Math.max(o.ms||0,readMs(text));BQ.until=performance.now()+ms;M.fieldTalk?.mark(ms);BQ.prio=prio;bubbleNow(a,text,{...o,ms,small:false});M.speakLine?.(text,null,a.g||null,{name:o.name,soft:prio<1});bubbleNext();}
function bubbleNext(){clearTimeout(BQ.timer);if(!BQ.queue.length)return;BQ.timer=setTimeout(()=>{const n=BQ.queue.shift();if(n&&!n[0].g?.dead&&!n[0].down)bubbleShow(...n);else bubbleNext();},Math.max(60,BQ.until-performance.now()+180));}
function bubbleNow(a,text,o={}){const lay=$('owBubbles');if(!lay||!a)return;if(o.small&&[...lay.children].filter(e=>!e.classList.contains('out')).length>=3)return;for(const old of lay.children)if(old._a===a){old.classList.add('out');setTimeout(()=>old.remove(),300);old._a=null;}
 const el=document.createElement('div');el._a=a;el.className='ow-bubble'+(a.team?' foe':'')+(o.boss?' boss':'')+(o.lead?' lead':'')+(o.small?' small':'')+(o.loud||/!$/.test(text)&&text===text.toUpperCase()?' loud':'');el.innerHTML=(o.name?'<b>'+esc(o.name)+'</b>':'')+'<span>'+esc(text)+'</span>';lay.appendChild(el);
 el._w=el.offsetWidth;el._h=el.offsetHeight;// Größe einmal messen (Text ändert sich nicht)
 const upd=()=>{if(!el.isConnected)return;const p=toScreen(a.x,a.y-(a.down?40:96)),bw=el._w/2,bh=el._h;el.style.left=clamp(p.x,bw+4,p.cw-bw-4)+'px';el.style.top=clamp(p.y,bh+4,p.ch-40)+'px';el.classList.toggle('edge',p.x<0||p.x>p.cw);};upd();el._upd=upd;
 setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),400);},Math.max(o.ms||0,readMs(text)));}
// Blasen folgen ihren Sprechern; überlappen sich zwei, rutscht die jüngere nach oben
function updBubbles(){const l=$('owBubbles');if(!l)return;const placed=[];for(const el of l.children){if(el.classList.contains('out'))continue;el._upd?.();
 let x=parseFloat(el.style.left)||0,y=parseFloat(el.style.top)||0;const w=el._w||0,h=el._h||0;
 for(let k=0;k<6;k++){const hit=placed.find(r=>Math.abs(r.x-x)<(r.w+w)/2+4&&y>r.y-r.h-4&&y-h<r.y+4);if(!hit)break;y=hit.y-hit.h-6;}
 if(y-h<2)y=h+2;el.style.top=y+'px';placed.push({x,y,w,h});}}
// ---------- Vollständig vorlesen, Jubel, Gelächter (Plünderungen, 26.10.) ----------
// sayFull: wartet, bis niemand mehr spricht, zeigt die Blase und liest sie mit der Stimme der Figur ganz vor (Klick aufs Feld überspringt).
async function sayFull(a,text,o={}){if(!a||!text)return;const b=S.battle;
 for(let n=0;n<240&&M.speechHold?.();n++)await sleep(100);if(R.ended||S.battle!==b)return;
 const ms=Math.max(2400,1600+String(text).length*80);bubbleNow(a,text,{name:o.name,boss:o.boss,lead:o.lead,loud:o.loud,ms});BQ.until=performance.now()+ms;M.fieldTalk?.mark?.(ms);
 M.speakLine?.(text,null,a.g||null,{name:o.name||a.g?.name,keep:true});if(o.log!==false)mlog(`<b class="${a.team?'foe':o.lead?'ldr':''}">${esc(o.name||a.g?.name||'')}:</b> „${esc(text)}“`);
 const t0=performance.now(),min=Math.max(1100,Math.min(ms,900+String(text).length*45))/Math.min(2,speed());await sleep(200);
 while(!R.ended&&S.battle===b&&(performance.now()-t0<min||M.speechHold?.())&&performance.now()-t0<22000)await sleep(90);}
// Truppe feiert (Waffen hoch, Hüpfen, Jubel) oder lacht (Klatschen, Lachgesicht). Läuft auch, während der Kampf steht.
const ANIM={until:0,kind:null};
function partyAnim(kind,sec){ANIM.kind=kind;ANIM.until=performance.now()+sec*1000;}
function animStep(b,dt){if(!ANIM.kind)return;const on=performance.now()<ANIM.until;for(const a of partyActors(b)){if(a.to)continue;
  if(on){a.state='celebrate';a.phase=(a.phase||0)+dt*(ANIM.kind==='laugh'?9:6);if(ANIM.kind==='laugh'){a.practiceCheer=1;a.warCry=0;}else{a.warCry=1.4;a.practiceCheer=0;}}
  else{a.state='idle';a.practiceCheer=0;a.warCry=0;}}
 if(!on)ANIM.kind=null;}
const CHEER=['SIEG!','HA! Wer ist der Nächste?','Das war’s? Ich hab mich gerade erst aufgewärmt!','FÜR DEN LUDUS!','Tot, tot, und der da auch!','Hat jemand gezählt? Ich hab bei drei aufgehört!'];
const LAUGH=['HAHAHA!','Hahaha! Hast du sein Gesicht gesehen?','Hehehe. Der guckt immer noch überrascht.','HA! Der Nächste, bitte!','Hahaha! Gnade! Hat er gesagt! Gnade!'];
// erst Nahaufnahmen und Erzähler (z. B. der letzte Tod) ausreden lassen
async function waitShots(b,lim=16000){const t0=performance.now(),IS=M.injuryShots;while(live(b)&&performance.now()-t0<lim&&(IS?.arena||IS?.pending?.length||M.speechHold?.()))await sleep(120);}
async function celebrate(b){if(!live(b))return;await waitShots(b);if(!live(b))return;setButtons('after');partyAnim('cheer',3.2);try{M.audioEngine?.sound?.('partyCheer');M.voice?.('battlecry',1);}catch(e){}
 const pa=partyActors(b),c=[...CHEER].sort(()=>Math.random()-.5);if(pa[0])await sayFull(pa[0],c[0],{name:first(pa[0].g),loud:true});if(pa[1]&&live(b))await sayFull(pa[1],c[1],{name:first(pa[1].g)});
 while(live(b)&&performance.now()<ANIM.until)await sleep(80);}
async function laugh(b,who){if(!live(b))return;await waitShots(b,9000);if(!live(b))return;partyAnim('laugh',2.6);try{M.audioEngine?.sound?.('laugh');}catch(e){}const k=who||anyParty(b);if(k)await sayFull(k,pickL(LAUGH),{name:first(k.g),log:false});
 while(live(b)&&performance.now()<ANIM.until)await sleep(80);}
function partyActors(b){return b.actors.filter(a=>a.team===0&&!a.down&&!a.g.dead);}
function anyParty(b){const l=partyActors(b);return l[Math.floor(Math.random()*l.length)]||b.actors.find(a=>a.team===0);}
const first=g=>String(g?.name||'').split(' ')[0];
// Nach jeder Begegnung geht es von selbst weiter (Countdown). „Weiter ▶“ springt sofort, „Heimkehren (ohne Beute)“ beendet die Mission; Beute gibt es nur für die ganze Mission.
function setButtons(state){R.awaiting=state;clearInterval(R.autoT);const fl=$('owFlee'),au=$('owAuto');
 if(fl){fl.disabled=['flee','won','end','next'].includes(state);fl.textContent='Fliehen';}
 const boss=R.m?.kind==='quest'?'Krassus liegt am Boden.':R.m?.mode==='wagon'?'Der Wagen gehört euch.':'Der Anführer liegt am Boden.';
 const s=$('owState');if(s)s.textContent={march:'Die Truppe marschiert …',talk:'Jemand redet …',fight:'Kampf läuft',after:'Nach dem Kampf …',next:'',won:boss,flee:'Rückzug …',end:''}[state]||'';
 if(au){au.hidden=!['next','won'].includes(state);if(!au.hidden){let left=state==='won'?4:5;const tick=()=>{const t=$('owAutoText');if(t)t.textContent=(state==='won'?'Zum Ergebnis in ':'Weiter in ')+left+' …';if(left--<=0){clearInterval(R.autoT);next();}};
  $('owHome').hidden=state==='won';$('owNext').textContent=state==='won'?'Zum Ergebnis ▶':'Weiter ▶';tick();R.autoT=setInterval(tick,1000/Math.min(2,speed()));}}}
function renderInfo(){const m=R.m;if(!m)return;const b=S.battle;const live=b&&b.started&&!b.done?b.encEnemies.filter(a=>a.down||a.g.dead).length:0;
 const c=$('owCount');if(c)c.textContent=`Gegner ${m.killed+live} / ${m.total}`;const l=$('owLoot');if(l)l.textContent=m.loot.length?`Beute bei Sieg: ${m.loot.length}`:'Beute: –';}
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
 let k=s.k*(1+.12*Math.sin(s.t*.7+s.ph))*(s.slow>0?.4:1);if(grp&&grp.n>1)k*=clamp(1+(grp.x-a.x)/240,.7,1.4);if(d<60&&!a.path?.length)k*=.6+.4*d/60;
 const step=Math.max(4,sp*k)*dt;
 if(d<=step+.5){a.x=tx;a.y=ty;if(a.path?.length){a.to=a.path.shift();return;}a.to=null;a.path=[];a.state='idle';a.moveSpeed=0;a.gaitSpeed=0;if(a.face!==undefined)a.a=a.face;return;}
 const ux=dx/d,uy=dy/d,lat=a.path?.length?0:Math.cos(s.t*s.fr+s.ph)*s.amp*s.fr*dt*Math.min(1,d/90);// auf Umwegen nicht seitlich schlendern
 const ox=a.x,oy=a.y;a.x+=ux*step-uy*lat;a.y+=uy*step+ux*lat;a.state='move';
 // Schritte und Armschwung aus dem echten Tempo (wie in der Engine)
 if(M.updateLocomotion)M.updateLocomotion(a,ox,oy,a.phase||0,dt);else{a.moveSpeed=6+5*k;a.odo=(a.odo||0)+step;a.phase=a.odo*s.stride;}
 a.a=s.look>0?(dx>0?Math.PI:0):Math.abs(dx)>.5?(dx>0?0:Math.PI):a.a;}
function missionLoop(t){const b=S.battle;
 if(R.m&&!R.ended){
  if(!b||b.mission!==R.m){// Spielstand gewechselt oder Kampf verschwunden: Mission still beenden, nichts anwenden
   if(!R.ending){abortMission();}}
  else{if(M.ui.getPage()!=='profiles'){const dt=Math.max(0,b.time-R.lastTime);R.lastTime=b.time;D.tick(b,dt);
    if((b.paused&&!b.done)||R.fleeing){const dt=1/60*speed(),grp=groupCenter(b);for(const a of b.actors)if(a.to){if(R.fleeing||a.team!==0)walker(a,dt);else stroll(a,dt,grp);pushOut(a,b);}}
    {const now=performance.now(),dt=Math.min(.1,(now-(R.wT||now))/1000)*speed();R.wT=now;if(WAG)wagonTick(dt);animStep(b,dt);}
    while(b.events.length)onEvent(b,b.events.shift());
    if(b.started&&b.done&&!b.handled){b.handled=true;encounterEnd(b);}
    if(t-(loopT.cull||0)>200){loopT.cull=t;const c=$('arenaCanvas');D.cullObstacles(b,R.cam.x,c?c.clientWidth/(c.clientHeight/VH):1400);}
    updProgress();updBubbles();
    R.missionTime=(R.missionTime||0)+(b.started&&!b.paused?Math.max(0,b.time-(R.lastSeen??b.time)):0);R.lastSeen=b.time;
    if(t-loopT.map>120){loopT.map=t;paintMap(t/1000);}
    if(t-loopT.info>250){loopT.info=t;renderInfo();}
    A.weatherStep($('owWx'),R.m.place.mood,t/1000,R.cam.x);}}}
 requestAnimationFrame(missionLoop);}
requestAnimationFrame(missionLoop);
function onEvent(b,e){const m=R.m,adv=m.kind==='adventure';
 // Anführer: Rufe, Warnung vor dem Griff von hinten (Nahaufnahme), Ellbogen, Ansturm der Assassinen
 if(e.type==='lead'){const a=e.actor;if(!a)return;
  if(e.kind==='ack'||e.kind==='ignore'){bubble(a,e.text,{small:true,ms:1500});if(e.kind==='ignore')mlog(`<b>${esc(a.g.name)}</b> hört nicht sofort: „${esc(e.text)}“`);return;}
  if(e.kind==='foeAlert'){bubble(a,e.text,{name:first(a.g)});mlog(`<b class="foe">${esc(a.g.name)}:</b> „${esc(e.text)}“`);return;}
  bubble(a,e.text,{lead:true,name:LU.lname(a),ms:clamp(1400+e.text.length*45,1900,3400),loud:e.urgent});mlog(`<b class="ldr">★ ${esc(a.g.name)}:</b> „${esc(e.text)}“`);return;}
 if(e.type==='gripWarn')return;// keine Nahaufnahme (22.10.: entfernt); der Ruf des Anführers kommt als Sprechblase
 if(e.type==='elbow'){mlog(`<b>${esc(e.actor.g.name)}</b> schlägt <b class="foe">${esc(e.foe.g.name)}</b> den Ellbogen ins Gesicht. Griff abgewehrt.`);return;}
 if(e.type==='assassinCharge'){LU.chargeCine(e.actors);return;}
 if(e.type==='spawn'){const g=e.actor.g;if(g.debtBoss)return;bubble(e.actor,g.debtShout,{name:g.name});mlog(`<b class="foe">${esc(g.name)}</b> kommt aus ${esc(e.door||'dem Nichts')}. Er ${esc(g.debtOwes)}. Waffe: ${esc(M.itemName(M.gear(g,'weapon')))}.`);}
 if(e.type==='detour'&&e.actor.team===0&&Math.random()<.6){bubble(e.actor,pickL(['Kein freies Schussfeld!','Das Haus ist im Weg!','Moment, ich such mir eine Lücke.','Ich geh rum!']),{name:first(e.actor.g),ms:1800});}
 if(e.type==='gaveup'){const l=adv?pickL(['Ich hab genug! Ich geh heim!','Das ist mir zu blöd!','Mama! MAMA!','Ich ergebe mich! Ich ergebe mich ganz doll!']):pickL(D.TEXT.gaveup);bubble(e.actor,l,{name:first(e.actor.g)});mlog(`<b class="foe">${esc(e.actor.g.name)}</b> verliert die Nerven: „${esc(l)}“`);}
 if(e.type==='bossHurt'){const l=adv?pickL(['Das wirst du bereuen!','Ihr Hunde! Ihr räudigen Hunde!','Haltet sie auf, ihr Feiglinge!','Ich hab schon Bessere als euch begraben!']):pickL(D.TEXT.bossHurt);const nm=adv?first(e.actor.g):'Krassus';bubble(e.actor,l,{name:nm,boss:true});mlog(`<b class="boss">${esc(nm)}:</b> „${esc(l)}“`);}}

// Der Lade-Bildschirm der Arena (scene-loader.js) bereitet Arena-Grafik vor und wartet auf „Weiter“. Missionen zeichnen
// ihren eigenen Schauplatz und wechseln mehrmals den Abschnitt: dort nicht anhalten.
function bypassLoader(){const SL=M.sceneLoader;if(SL&&!SL.__ow){const g0=SL.gate;SL.gate=function(){if(S.battle?.mission)return !!SL.active;return g0.apply(this,arguments);};SL.__ow=true;}}
async function startMission(){if(S.battle||R.m)return;bypassLoader();const stateTxt=t=>{const e=$('owState');if(e)e.textContent=t;};LU?.install({bubble,mlog,toScreen,live,cam:()=>R.cam,VH,state:stateTxt,sayFull,laugh});SH?.install({bubble,mlog,live,cam:()=>R.cam,VH,state:stateTxt,talkPause,speaker:b=>LU?.leaderA?.(b)||anyParty(b)});const st=ST(),team=selected();if(team.length<D.CFG.minParty||team.length>D.CFG.maxParty)return;
 const quest=st.stage!=='done';if(!quest&&!adventureReady()){notify('Heute wart ihr schon draußen.');return;}
 let m;if(quest){st.quest??=newQuestPlace();m=D.newMission(st.quest.seed,team,'dorf',{kind:'quest'});m.place.name=st.quest.name;}
 else if(st.adv.mode==='wagon'&&D.newWagonMission){m=D.newWagonMission(st.adv.seed,team,st.adv.biome,{diff:st.adv.diff||2});}
 else{m=D.newMission(st.adv.seed,team,st.adv.biome,{kind:'adventure',diff:st.adv.diff||2,avoid:st.recentLeaders||[]});if(m.boss?.notorious)st.recentLeaders=[m.boss.notorious,...(st.recentLeaders||[]).filter(x=>x!==m.boss.notorious)].slice(0,8);}
 R.missionTime=0;R.lastSeen=null;R.m=m;R.zoom=R.zoomPref||1;R.ended=false;R.ending=false;R.fleeing=false;R.progress=0;R.rows=[];R.rowKey=0;R.full=[];R.lastTime=0;R.awaiting='march';R.runId='run'+Date.now();loopT={map:0,info:0};
 if(quest)st.tries++;else{st.lastAdventure=S.day;st.adventures++;}
 st.run={id:R.runId,kind:m.kind,place:m.place.name,day:S.day,party:team.map(g=>g.id)};persist();
 document.body.classList.add('ow-mission');
 const intro=quest?`<b>${esc(school())}</b> bricht nach <b>${esc(m.place.name)}</b> auf. ${team.length} ${team.length===1?'Kämpfer, ein improvisiertes Testament':'Kämpfer, '+team.length+' improvisierte Testamente'}. Zwei Tagesmärsche später: ${esc(D.moodText(m.place.mood))}`
  :`<b>${esc(school())}</b> zieht los: ${esc(m.place.label)} ${esc(m.place.name)}. ${esc((m.texts?.intro||'').replace('{P}',m.place.name))} ${esc(D.moodText(m.place.mood))}`;
 if(m.mode==='wagon'){await runWagon(`<b>${esc(school())}</b> zieht los: ${esc(m.place.label)} ${esc(m.place.name)}. Am Weg wird gehandelt. Und gleich auch geraubt. ${esc(D.moodText(m.place.mood))}`);return;}
 await runSection(0,intro);}
// Ladefenster (scene-loader.js): Schauplatz, Waffenbilder samt Blutstufen und alle Figuren dieses Abschnitts (eigene und
// kommende Gegner) werden vorab gezeichnet, damit der Kampf danach ohne Ruckler läuft. Erster Abschnitt wartet auf „Weiter“,
// spätere Abschnitte laufen nach dem Laden von selbst weiter. Ohne Ladefenster (?preload=off) wird nur der Schauplatz gebaut.
async function prepareSection(m,b,si){const SL=M.sceneLoader;let img=null;M.missionBackdrop=(ctx)=>{if(img)A.drawBackdrop(ctx,img,b);};
 const sec=m.place.sections[si],foes=sec.stations.flatMap(i=>m.queues?.[i]||[]),people=[...b.actors.map(a=>a.g),...foes];
 const jobs=[{label:'Schauplatz, Wege und Hindernisse',run:()=>{img=A.scene(b.L,m.place);}}];
 if(SL?.enabled){jobs.push(...SL.equipmentTasks(people.map(g=>({g})),true));const c=document.createElement('canvas');for(const g of people)jobs.push({label:'Kämpfer und Gegner zeichnen',run:()=>{try{M.renderTeamFigure?.(c,g);}catch(e){}}});
  jobs.push({label:'Startbild',run:()=>{try{if(S.battle===b)M.renderBattle?.();}catch(e){}}});
  try{await SL.run(si===0?'Abenteuer wird vorbereitet':'Nächster Abschnitt wird vorbereitet',jobs,{auto:si>0});}catch(e){console.warn(e);if(!img)img=A.scene(b.L,m.place);}}
 else jobs[0].run();
 return img;}
function clearPoint(b,x,y){for(let k=0;k<12;k++){const yy=y+(k%2?1:-1)*Math.ceil(k/2)*14;if(!b.obstacles.some(o=>o.hp>0&&Math.hypot(o.x-x,o.y-yy)<o.r+18))return yy;}return D.pathY(b.L,x);}
// Marsch mit Wegsuche: jeder bekommt einen Weg um Bäume, Häuser und Fässer herum (D.findPath). Wer trotzdem hängt (2,6 s ohne
// Fortschritt), plant neu. Alle brechen gemeinsam auf (nur kleine Verzögerung) und der Marsch endet erst, wenn alle da sind.
function freeSpot(b,x,y){for(let k=0;k<18;k++){const yy=y+(k%2?1:-1)*Math.ceil(k/2)*16;if(D.navFreeAt(b,x,yy))return yy;}return y;}
function routeTo(b,a,tx,ty,sp){const path=D.findPath(b,a.x,a.y,tx,ty);const pts=(path&&path.length?path:[{x:tx,y:ty}]).map(p=>[p.x,p.y,sp]);a.to=pts.shift();a.path=pts;a.goal=[tx,ty,sp];}
function marchTo(b,x,sp=58){if(!b.started)LU?.stow(b,true);const pa=partyActors(b);pa.forEach((a,k)=>{a.startDelay=Math.random()*.45;const col=k%3,line=Math.floor(k/3),tx=x-line*60-(col===1?0:26)+(Math.random()-.5)*44,y=freeSpot(b,tx,clamp(D.pathY(b.L,tx)+(col-1)*58+(Math.random()-.5)*20,b.L.mT+30,b.L.mB-30));routeTo(b,a,tx,y,sp);a.face=0;a.replan=0;});
 R.marching=true;setButtons('march');const start=performance.now(),prog=new Map();
 return new Promise(res=>{const chk=()=>{if(!live(b)){R.marching=false;return res(false);}const now=performance.now();
   if(M.ui.getPage()==='profiles'){setTimeout(chk,200);return;}
   for(const a of partyActors(b)){if(!a.to||!a.goal)continue;const d=Math.hypot(a.goal[0]-a.x,a.goal[1]-a.y),p=prog.get(a);
    if(!p||d<p.d-3)prog.set(a,{d,t:now});
    else if(now-p.t>2600/speed()){if(a.replan<5){a.replan++;routeTo(b,a,a.goal[0],a.goal[1],a.goal[2]);prog.set(a,{d,t:now});}else{a.to=null;a.path=[];a.state='idle';a.moveSpeed=0;}}}
   if(now-start>120000)for(const a of partyActors(b)){a.to=null;a.state='idle';a.moveSpeed=0;}
   if(partyActors(b).every(a=>!a.to)){R.marching=false;res(true);}else setTimeout(chk,80);};chk();});}
const live=b=>!R.ended&&!R.fleeing&&S.battle===b;
async function runSection(si,introLine){const m=R.m,sec=m.place.sections[si];
 const b=R.b=D.startSection(m,si);R.lastTime=0;b.handled=false;
 const img=await prepareSection(m,b,si);D.addObstacles(b,b.L.extraObstacles);M.missionBackdrop=(ctx)=>A.drawBackdrop(ctx,img,b);
 R.cam.x=0;R.cam.y=D.pathY(b.L,0);R.cam.snap=true;setFollow(true);
 M.ui.render();missionHud(b);$('battleView')?.classList.remove('ow-fade');const bl=$('owBubbles');if(bl)bl.innerHTML='';
 const tt=$('owTitle');if(tt)tt.textContent=m.place.name;const sb=$('owSub');if(sb)sb.textContent=`${m.kind==='adventure'?'Plünderung '+'☠'.repeat(m.diff||2)+' · ':''}${m.place.label} · ${D.moodText(m.place.mood)}`;
 const stn=$('owStation');if(stn)stn.textContent=`${si+1}. ${D.THEMES[sec.theme].name}${sec.boss?' · Ziel':''}`;
 if(introLine)mlog(introLine,'narr');
 mlog(esc(D.THEMES[sec.theme].text),'narr');
 for(const sti of sec.stations){if(!live(b))return;await encounter(b,sti);if(!live(b))return;
  if(sti!==sec.stations[sec.stations.length-1]||!sec.boss){await waitNext();if(!live(b))return;}}
 if(sec.boss)return;if(sec.single)await marchShort(b);else await marchTo(b,b.width-D.marginX(b.width)-40,70);if(!live(b))return;
 $('battleView')?.classList.add('ow-fade');await sleep(600);if(!R.m||R.ended)return;await runSection(si+1);}
function waitNext(){return new Promise(res=>{R.nextRes=res;});}
// Plünderung: nach dem Kampf nur ein paar Schritte weiter (höchstens gut 3 s), dann der nächste Kartenabschnitt
async function marchShort(b){const pa=partyActors(b);if(!pa.length)return;const x=Math.min(b.width-D.marginX(b.width)-40,pa.reduce((s,a)=>s+a.x,0)/pa.length+360);await Promise.race([marchTo(b,x,76),sleep(3200/Math.min(2,speed()))]);}
async function encounter(b,sti){const m=R.m,st=m.place.stations[sti],adv=m.kind==='adventure';m.idx=sti;
 // Ab 5 kampffähigen Kämpfern führt ein Anführer (DebtLeader): Entdecken, Fernrohr, Befehle, Rufe im Kampf
 const lead=L&&LU?L.attach(b,m,{leaderId:ST().leaderId}):null;if(st.boss&&m.place.oneFight){await bossEncounter(b,sti);return;}if(lead&&!st.boss){await leadEncounter(b,sti);return;}
 const grp=b.L.enc?.[sti]?.group,ok=await marchTo(b,grp&&st.kind==='idle'?grp.ex-430:st.fx-120,58);if(!ok)return;
 setButtons('talk');
 if(st.boss){const boss=m.queues[sti][0],bn=adv?first(boss):'Krassus';
  mlog(adv?`Vor euch wartet <b class="boss">${esc(boss.name)}</b>, ${esc(M.itemName(boss.enemyGear.weapon))} in der Hand.`:`Vor dem Kontor wartet <b class="boss">Krassus Knochenzins</b>, den Zweihänder „Zinseszins“ locker auf der Schulter.`);
  const firstA=D.beginEncounter(b,m,sti);b.paused=true;b.started=false;const k=firstA[0];
  for(const [w,l] of (adv?m.texts.leaderIntro:D.TEXT.bossIntro)){const me=w==='K'||w==='L',a=me?k:anyParty(b);bubble(a,l,{name:me?bn:first(a.g),boss:me,ms:2800});mlog(`<b class="${me?'boss':''}">${esc(me?bn:a.g.name)}:</b> „${esc(l)}“`);await talkPause(2500);if(!live(b))return;}
  LU?.stow(b,false);if(b.lead){b.lead.phase='fight';b.lead.alert=true;b.lead.alertAt=b.time;b.lead.fightAt=b.time;LU.leadSay(b,pickL(['Das ist er. Alle zusammen, keiner allein!','Der Große gehört uns. Umzingeln!','Schilde vorn, Klingen von der Seite. Los!']));}
  b.started=true;b.paused=false;setButtons('fight');return;}
 const [l1,l2]=D.pickBanter(st,st.banter,m);const a1=anyParty(b);let a2=anyParty(b);if(a2===a1)a2=partyActors(b).find(x=>x!==a1)||a1;
 if(a1!==a2||partyActors(b).length>1){bubble(a1,l1,{name:first(a1.g)});mlog(`<b>${esc(a1.g.name)}:</b> „${esc(l1)}“`);await talkPause(2000);if(!live(b))return;
  bubble(a2,l2,{name:first(a2.g)});mlog(`<b>${esc(a2.g.name)}:</b> „${esc(l2)}“`);await talkPause(1600);if(!live(b))return;}
 else{const solo=pickL(['Allein. Natürlich allein. Wer braucht schon Freunde.','Ich red mit mir selbst. Wenigstens widerspricht keiner.','Wenn ich sterbe, erzählt es keiner. Gut so.']);bubble(a1,solo,{name:first(a1.g)});mlog(`<b>${esc(a1.g.name)}:</b> „${esc(solo)}“`);await talkPause(2000);if(!live(b))return;}
 const q=m.queues[sti];
 if(st.kind==='idle'){const t=st.idle.text.replace('{A}',q[0]?.name||'Einer').replace('{B}',q[1]?.name||'ein anderer');mlog(esc(t),'narr');}
 else if(st.kind==='ambush')mlog('Hinter euch knackt ein Zweig. Vor euch auch.','narr');
 else if(st.kind==='ahead')mlog('Weiter vorn kommen zwei Gestalten den Weg herunter. Sie gehen schneller, als sie euch sehen.','narr');
 else mlog('Eine Tür quietscht.','narr');
 const firstA=D.beginEncounter(b,m,sti);b.paused=true;b.started=false;const evs=[...b.events];b.events.length=0;
 for(const a of firstA){const g=a.g;mlog(`<b class="foe">${esc(g.name)}</b>${st.kind==='idle'?'':' kommt aus '+esc(evs.find(e=>e.actor===a)?.door||'dem Nichts')}. Er ${esc(g.debtOwes)}. Waffe: ${esc(M.itemName(g.enemyGear.weapon))}.`);
  if(adv){a.a=Math.atan2((anyParty(b)?.y||a.y)-a.y,(anyParty(b)?.x||a.x)-a.x);await sayFull(a,g.debtShout,{name:first(g),loud:st.kind==='ambush',log:false});if(!live(b))return;}else{bubble(a,g.debtShout,{name:g.name});await sleep(500/speed());}}
 if(adv&&st.kind==='ambush'){const r=anyParty(b);if(r)await sayFull(r,pickL(['Hinterhalt! Rücken an Rücken!','Die kommen von überall! Schilde hoch!','Überfall! Na wartet!','Von hinten? Feiglinge! Na gut, wir auch nicht besser.']),{name:first(r.g),loud:true});if(!live(b))return;}
 b.events.length=0;LU?.stow(b,false);await sleep(900/speed());if(!live(b))return;
 for(const a of b.actors){a.to=null;a.path=null;}
 b.started=true;b.paused=false;setButtons('fight');}
// Begegnung mit Anführer: Er sieht die Gegner meist zuerst (Fernrohr, Lage, gestaffelte Aufstellung), sonst Überfall mit schnellen Rufen
async function leadEncounter(b,sti){const m=R.m,st=m.place.stations[sti],G=L.layoutGroup(b,m,sti),me=()=>LU.leaderA(b);
 if((m.place.oneFight&&st.kind==='idle')||L.spotRoll(b,st)){if(!await marchTo(b,G.hx))return;setButtons('talk');
  L.beginGroup(b,m,sti);b.events.length=0;b.paused=true;b.started=false;b.lead.stats.spotted++;b.lead.phase='brief';
  mlog(`<b class="ldr">★ ${esc(me().g.name)}</b> entdeckt ${b.encEnemies.length} Gegner, bevor sie euch sehen.`,'narr');
  const lines=L.briefLines(b);LU.leadSay(b,lines[0].text,{ms:1800});await talkPause(1100);if(!live(b))return;LU.drawWeapons(b);await talkPause(900);if(!live(b))return;
  await LU.spyShow(b,lines.slice(1));if(!live(b))return;
  // gestaffelt: Soldatenlinie, dann gehen die Assassinen in Deckung, erst danach laufen die Fernkämpfer los
  const {pts,lines:ord}=L.plan(b),by=job=>[...pts].filter(([,p])=>p.job===job),go=(list,sp)=>{for(const [a,p] of list){routeTo(b,a,p.x,freeSpot(b,p.x,p.y),sp);a.startDelay=0;a.face=p.face;}};
  const say1=async job=>{const o=ord.find(x=>x.job===job);if(o){LU.leadSay(b,o.text);await talkPause(Math.max(1700,800+o.text.length*36));}};
  go(by('line'),58);await say1('line');if(!live(b))return;
  const hid=by('hide');if(hid.length){go(hid,84);await say1('hide');await LU.walkSome(b,hid.map(([a])=>a),9000);if(!live(b))return;for(const [a] of hid){a.leadHide.x=a.x;a.leadHide.y=a.y;L.hideOne(b,a);}
   mlog(`${hid.map(([a])=>'<b>'+esc(first(a.g))+'</b>').join(' und ')} ${hid.length>1?'knien':'kniet'} in Deckung, Zweige vor dem Gesicht.`,'narr');await talkPause(700);}
  const ar=by('skirmish');if(ar.length){await say1('skirmish');go(ar,64);}
  const fin=ord.find(x=>!x.job);if(fin)LU.leadSay(b,fin.text);
  await LU.walkSome(b,partyActors(b),12000);if(!live(b))return;for(const [a,p] of pts){if(p.job!=='hide')a.a=0;}
  L.engage(b);b.started=true;b.paused=false;setButtons('fight');return;}
 // nicht entdeckt: Die Gegner sind schon da und sehen euch zuerst
 if(!await marchTo(b,G.hx+60))return;L.beginGroup(b,m,sti,{unaware:false});b.events.length=0;
 const pa=partyActors(b),px=pa.reduce((t,a)=>t+a.x,0)/Math.max(1,pa.length);for(const e of b.encEnemies)e.x=Math.max(px+170,e.x-220);
 mlog(`${esc(me().g.name)} sieht sie zu spät: ${b.encEnemies.map(e=>'<b class="foe">'+esc(e.g.name)+'</b>').join(', ')} stürmen heran.`,'narr');
 setButtons('talk');LU.stow(b,false);for(const a of b.actors){a.to=null;a.path=null;}
 const px2=pa.reduce((t,a)=>t+a.y,0)/Math.max(1,pa.length);for(const e of b.encEnemies)e.a=Math.atan2(px2-e.y,px-e.x);
 const shouters=b.encEnemies.slice(0,3),ov=['Überraschung!','Jetzt haben wir euch!','DRAUF!','Von hinten ist es am schönsten!',...(m.texts?.shout||[])];
 for(const [i,e] of shouters.entries()){await sayFull(e,i?(e.g.debtShout||pickL(ov)):pickL(ov.slice(0,4)),{name:first(e.g),loud:true});if(!live(b))return;}
 const ld=me();if(ld){await sayFull(ld,pickL(['Hinterhalt! Zusammenrücken!','Verdammt, die waren schneller! Rücken an Rücken!','Überfall! Schilde raus, Augen auf!']),{name:LU.lname(ld),lead:true,loud:true});if(!live(b))return;}
 b.started=true;b.paused=false;L.surprise(b,{quiet:true});setButtons('fight');}
// Plünderung: Am Ziel wartet der Berüchtigte mit seiner Bande. Vorstellung (Steckbrief, Bande, Wortwechsel), dann die Frage:
// kämpfen oder abziehen. Abziehen beendet die Plünderung ohne Beute (wie Heimkehren). Kämpfen: Kampfsequenz, dann der Kampf.
async function bossEncounter(b,sti){const m=R.m,st=m.place.stations[sti],G=b.L.enc[sti].group;
 if(!await marchTo(b,G.ex-620,58))return;setButtons('talk');
 const firstA=D.beginEncounter(b,m,sti);b.paused=true;b.started=false;b.events.length=0;const boss=firstA.find(a=>a.g===m.boss)||firstA[0];
 for(const a of firstA)a.a=Math.PI;for(const a of partyActors(b)){a.a=0;a.to=null;a.path=[];a.state='idle';a.moveSpeed=0;}
 mlog(`Vor euch wartet <b class="boss">${esc(boss.g.name)}</b> mit seiner Bande, ${esc(M.itemName(boss.g.enemyGear.weapon))} in der Hand.`,'narr');
 let choice='fight';if(SH){choice=await SH.present(b,m,boss,firstA.filter(a=>a!==boss));if(!live(b))return;}
 if(choice!=='fight'){const ty=NT?.typeOf(boss.g);bubble(boss,pickL(['Lauft nur! Lauft! Erzählt allen von mir!','Feiglinge! Ich wusste es!','Kommt wieder, wenn ihr erwachsen seid!',...(ty?.cry||[]).slice(0,0)]),{name:first(boss.g),boss:true});
  mlog(`Ihr zieht ab. <b class="boss">${esc(boss.g.name)}</b> lacht euch hinterher.`,'narr');await talkPause(1800);m.state='fled';finishMission('spared');return;}
 LU?.stow(b,false);if(SH)await SH.fightCine(b,boss);if(!live(b))return;
 if(b.lead){b.lead.phase='fight';b.lead.alert=true;b.lead.alertAt=b.time;b.lead.fightAt=b.time;LU.leadSay(b,pickL(['Das ist er. Alle zusammen, keiner allein!','Der Große gehört uns. Umzingeln!','Schilde vorn, Klingen von der Seite. Los!']));}
 b.started=true;b.paused=false;setButtons('fight');}
// =====================================================================================================
// WAGENÜBERFALL: am Wegesrand auf der Lauer liegen, bis zu drei Wagen ausspähen, überfallen oder vorbeiziehen lassen
// =====================================================================================================
const WG=window.DebtWagon;let WAG=null;if(WG)WG.cur=()=>WAG;
function spotter(b){return LU?.leaderA?.(b)||partyActors(b).sort((x,y)=>(y.g.stats?.tactics||0)-(x.g.stats?.tactics||0))[0]||null;}
function hookWagonDraw(){if(M.drawSprite?.__wagon)return;const d0=M.drawSprite;const f=(ctx,o)=>{if(o.wagonSprite){if(WAG&&!WAG.gone&&o.ref===WAG)WG.draw(ctx,WAG,performance.now()/1000);return;}
  if(o.driverRun){const r=o.driverRun;if(r.gone)return;try{ctx.save();ctx.translate(Math.round(r.x),Math.round(r.y));ctx.scale(1/.6,1/.6);M.renderLudusActors(ctx,[{id:'wagon-driver',g:r.g,team:1,x:0,y:0,a:r.vx>0?0:Math.PI,phase:r.ph,state:'move',moveSpeed:150,energy:100,ammo:0,bloodMarks:{}}]);}catch(e){}finally{ctx.restore();}return;}
  return d0?.(ctx,o);};f.__wagon=1;f.__lead=1;M.drawSprite=f;}
// Bewegung des Wagens und seiner Wachen (die Engine steht, bis der Überfall beginnt)
function wagonTick(dt){const w=WAG,b=S.battle;if(!w||w.gone||!b?.L||b!==w.b)return;const v=w.speed*(w.speedMul??1);
 if(w.state==='come'||w.state==='pass'){w.x+=w.dir*v*dt;w.y=D.pathY(b.L,w.x)+6;w.ang+=v*dt/20;w.ph+=v*dt*.11;w.mv=1;
  for(const s of w.guards){const a=s.a;if(a.down||a.g.dead)continue;const ox=a.x,oy=a.y;a.x=w.x+w.dir*s.dx;a.y=D.pathY(b.L,a.x)+s.dy;a.a=w.dir>0?0:Math.PI;a.state='move';if(M.updateLocomotion)M.updateLocomotion(a,ox,oy,a.phase||0,dt);else{a.moveSpeed=v;a.phase=(a.phase||0)+v*dt*.25;}}
  if(w.dir<0&&w.x<-W_OFF(w)||w.dir>0&&w.x>b.width+W_OFF(w))w.gone=true;}
 else{w.mv=0;w.rear=Math.max(0,(w.rear||0)-dt*.7);}
 if(w.o){w.o.x=w.x;w.o.y=w.y;}const r=w.run;if(r&&!r.gone){r.x+=r.vx*dt;r.y+=r.vy*dt;r.ph+=dt*13;r.o.x=r.x;r.o.y=r.y;if(r.x<-60||r.x>b.width+60||r.y<b.L.mT-40)r.gone=true;}}
const W_OFF=w=>WG.length(w.type)+120;
// Sätze durchs Fernglas: Wagen, Ladung, Wachen, Einschätzung in Totenköpfen
function wagonLines(b,w,focus){const T=WG.TYPES[w.type],gs=WAG.guards.map(s=>s.a),cap=gs.find(a=>a.g.wagonCaptain),best=gs.slice().sort((x,y)=>D.gearList(y.g).length-D.gearList(x.g).length)[0];
 const out=[{focus,text:T.look+' Gezogen von '+T.animals+'.'},{focus,text:'Ladung: '+T.cargo}];
 out.push({focus:gs[0]||focus,text:`${gs.length} ${gs.length===1?T.guard:T.guard+(T.guard.endsWith('e')?'n':'e')} als Begleitung.${best?' Der da hat '+M.itemName(best.g.enemyGear?.weapon)+'.':''}${gs.some(a=>a.g.brute)?' Und einer ist so groß wie ein Schrank. Mit Schrankinhalt.':''}`});
 if(cap)out.push({focus:cap,text:`${cap.g.name} führt die Wache. Helm, Brustpanzer und der Blick von einem, der schon mal gewonnen hat.`});
 out.push({focus,text:(WG.TEXT.rating.find(x=>x[0]===w.tier)||[0,''])[1]});return out;}
async function runWagon(introLine){const m=R.m,sec=m.place.sections[0];hookWagonDraw();
 const b=R.b=D.startSection(m,0);R.lastTime=0;b.handled=false;
 const img=await prepareSection(m,b,0);D.addObstacles(b,b.L.extraObstacles);M.missionBackdrop=(ctx)=>A.drawBackdrop(ctx,img,b);
 R.cam.x=0;R.cam.y=D.pathY(b.L,0);R.cam.snap=true;setFollow(true);
 M.ui.render();missionHud(b);$('battleView')?.classList.remove('ow-fade');const bl=$('owBubbles');if(bl)bl.innerHTML='';
 const tt=$('owTitle');if(tt)tt.textContent=m.place.name;const sb=$('owSub');if(sb)sb.textContent=`Wagenüberfall ${'☠'.repeat(m.diff||2)} · ${m.place.label} · ${D.moodText(m.place.mood)}`;
 const stn=$('owStation');if(stn)stn.textContent=`${D.THEMES[sec.theme].name} · auf der Lauer`;
 if(introLine)mlog(introLine,'narr');mlog(esc(D.THEMES[sec.theme].text),'narr');
 if(L&&LU)L.attach(b,m,{leaderId:ST().leaderId});
 // zum Hinterhalt und in Deckung (beidseits des Wegs, Zweige vor dem Gesicht)
 const hx=b.L.enc[0].hide.x;if(!await marchTo(b,hx-60,58))return;setButtons('talk');
 const sp=spotter(b);if(sp){bubble(sp,pickL(['Hier. Runter ins Gebüsch. Und keiner furzt.','Hier legen wir uns hin. Wer schnarcht, kriegt einen Stein in den Mund.','Gute Stelle. Der Weg ist eng, das Gebüsch dicht, die Moral fragwürdig.']),{name:first(sp.g),lead:!!b.lead,ms:2600});await talkPause(2200);if(!live(b))return;}
 const pa=partyActors(b);pa.forEach((a,k)=>{const side=k%2?1:-1,x=hx-70+Math.floor(k/2)*58+(k%2)*20,y=freeSpot(b,x,clamp(D.pathY(b.L,x)+side*(170+Math.floor(k/2)%2*36),b.L.mT+40,b.L.mB-30));routeTo(b,a,x,y,70);a.startDelay=0;a.face=0;});
 await LU.walkSome(b,pa,9000);if(!live(b))return;for(const a of pa){a.a=0;if(L)L.hideOne(b,a);}LU?.stow(b,false);
 mlog(`Die Truppe liegt beidseits des Wegs im Gebüsch, Zweige vor dem Gesicht. ${pa.length>1?'Keiner sagt etwas. Einer kratzt sich.':'Allein im Gebüsch. Sehr würdevoll.'}`,'narr');
 SH&&(SH.SH.free=true);R.manual=false;
 for(let i=0;i<m.wagons.length;i++){if(!live(b))return;const r=await wagonPass(b,m.wagons[i],i,hx);if(r==='fight'||!live(b))return;
  if(i<m.wagons.length-1){mlog(pickL(WG.TEXT.passGone),'narr');await talkPause(2600);}}
 if(!live(b))return;mlog(esc(WG.TEXT.noMore),'narr');await talkPause(2200);m.state='fled';finishMission('passed');}
async function wagonPass(b,w,i,hx){const m=R.m,dir=-1,x0=b.width+W_OFF(w)*.4;
 WAG={b,w,type:w.type,x:x0,y:D.pathY(b.L,Math.min(x0,b.width-1))+6,dir,ang:0,ph:0,mv:1,rear:0,driverGone:false,driverG:w.driver,coat:w.coat,horse:w.horse,speed:D.WAGON.speed[w.tier-1],speedMul:1.6,state:'come',guards:[],gone:false};
 WAG.o={type:'sprite',hp:0,r:0,x:WAG.x,y:WAG.y,sid:-1,wagonSprite:true,ref:WAG};D.addObstacles(b,[WAG.o]);
 // Wachen: vorn neben den Tieren, an den Seiten, hinten
 const half=WG.length(w.type)/2,slots=[[half*.9,-44],[half*.9,44],[0,-56],[0,56],[-half*.8,-34],[-half*.8,34],[-half-40,-10],[-half-40,30],[half*.4,-62],[half*.4,62]];
 w.guards.forEach((g,k)=>{const a=M.createCombatActor(g,1,k),[dx,dy]=slots[k%slots.length];a.r=12;a.cool=.8;a.x=WAG.x+dir*dx;a.y=D.pathY(b.L,Math.min(a.x,b.width-1))+dy;b.actors.push(a);WAG.guards.push({a,dx,dy});});
 setButtons('talk');const sp=spotter(b);mlog(`${pickL(WG.TEXT.approach)} <b>${esc(w.name)}</b> ${i?'(der '+(i+1)+'. heute)':''}`,'narr');if(sp)bubble(sp,pickL(WG.TEXT.approach),{name:first(sp.g),ms:2200});
 // Kamera auf den Wagen, bis er nah genug zum Ausspähen ist
 R.manual=true;const camTo=()=>{R.cam.x+=(WAG.x-160-R.cam.x)*.04;R.cam.y+=(WAG.y-60-R.cam.y)*.04;};
 const until=async(f,lim=60000)=>{const t0=performance.now();while(live(b)&&!f()&&performance.now()-t0<lim){camTo();await sleep(40);}return live(b);};
 if(!await until(()=>WAG.x<hx+820))return 'gone';
 // Fernglas (Zeitlupe für den Wagen)
 WAG.speedMul=.15;const focus={get x(){return WAG.x+40;},get y(){return WAG.y-20;},g:{dead:false},zoom:2.2};
 if(LU&&sp)await LU.spyShow(b,wagonLines(b,w,focus),{me:sp,zoom:2.6});if(!live(b))return 'gone';
 const loot=`Gold (etwa ${Math.round(w.gold*.8/10)*10}–${Math.round(w.gold*1.2/10)*10}) und ein Stück aus der Ladung`;
 const yes=SH?await SH.decide({q:`${esc(w.name)} überfallen?`,info:`<p>${SH.skullRow(w.tier)} <b>${esc((D.DIFF?.names||[])[w.tier-1]||'')}</b></p><p>Wachen: <b>${w.guards.length}</b>${w.guards.some(g=>g.wagonCaptain)?' mit Hauptmann':''} · Eure Truppe: <b>${partyActors(b).length}</b> kampffähig</p><p>Beute: ${loot}, dazu alles, was die Wachen fallen lassen.</p><p class="tiny">Vorbeiziehen lassen: Der Wagen fährt weiter${i<m.wagons.length-1?', ihr wartet auf den nächsten':', danach geht es heim'}.</p>`,yes:'⚔ Überfallen',no:'Vorbeiziehen lassen'}):true;
 if(!live(b))return 'gone';R.manual=false;
 if(!yes){if(sp)bubble(sp,pickL(WG.TEXT.pass),{name:first(sp.g),ms:2400});mlog(`Ihr lasst den <b>${esc(w.name)}</b> ziehen.`,'narr');WAG.speedMul=4;WAG.state='pass';
  await until(()=>WAG.gone,40000);for(const s of WAG.guards){const k=b.actors.indexOf(s.a);if(k>=0)b.actors.splice(k,1);}WAG.gone=true;WAG.o.hp=-1;R.manual=false;return 'pass';}
 // Überfall: warten, bis der Wagen auf Höhe des Hinterhalts ist, dann raus aus dem Gebüsch
 WAG.speedMul=1.8;mlog('Wartet … wartet …','narr');if(sp)bubble(sp,pickL(['Wartet … wartet …','Noch nicht … noch nicht …','Auf mein Zeichen.']),{name:first(sp.g),ms:1800,small:true});
 if(!await until(()=>WAG.x<hx+190,30000))return 'gone';
 R.manual=false;D.wagonTarget(m,w);WAG.state='stop';WAG.rear=1;WAG.driverGone=true;
 // Kutscher flieht
 const run={g:w.driver,x:WAG.x+dir*WG.length(w.type)*.3,y:WAG.y-20,vx:-dir*170,vy:-90,ph:0,gone:false};run.o={type:'sprite',hp:0,r:0,x:run.x,y:run.y,sid:-1,driverRun:run};D.addObstacles(b,[run.o]);WAG.run=run;
 D.addObstacles(b,WG.colliders(WAG));D.navInvalidate(b);
 for(const a of partyActors(b)){if(a.leadCover){a.leadCover.dropped=0;a.leadCover=null;}a.kneeTimer=0;a.kneeDuration=2.4;a.kneeRise=1;}
 const gs=WAG.guards.map(s=>s.a);for(const a of gs){a.state='idle';a.moveSpeed=0;}
 b.encounter=0;b.queue=[];b.encStart=b.time;b.encEnemies=gs;b.enemiesAll.push(...gs);b.spawns=[];b.spawnIndex=0;b.done=null;b.handled=false;b.triggered.add(0);b.timeLimitAt=b.time+D.CFG.timeLimit;b.events.length=0;
 mlog(`<b class="red">ÜBERFALL!</b> ${esc(pickL(WG.TEXT.driverFlee))}`,'narr');
 const cap=gs.find(a=>a.g.wagonCaptain)||gs[0];if(cap)setTimeout(()=>{if(live(b))bubble(cap,pickL(WG.TEXT.guardShout),{name:first(cap.g),loud:true});},900);
 if(SH)await SH.fightCine(b,cap,{title:'ÜBERFALL!',cry:WG.TEXT.guardShout,ours:WG.TEXT.ambush});if(!live(b))return 'fight';
 if(b.lead){b.lead.phase='fight';b.lead.alert=true;b.lead.alertAt=b.time;b.lead.fightAt=b.time;}
 b.started=true;b.paused=false;setButtons('fight');return 'fight';}
// Nach dem Sieg: Wagen durchsuchen (Truhe öffnen), Gold und Fundstück zur Beute
async function wagonLoot(b){const m=R.m,w=m.wagon;if(!w)return;const k=nearestParty(b,WAG||{x:b.width/2,y:b.height/2});
 if(k&&WAG){await walkTo(b,k,WAG.x+(k.x<WAG.x?-40:40),WAG.y+30);if(!live(b))return;k.a=k.x<WAG.x?0:Math.PI;bubble(k,pickL(WG.TEXT.openLoot),{name:first(k.g),ms:2200});}
 m.loot.push({item:w.item,from:'der Ladung ('+w.name+')'});mlog(`Im ${esc(w.name)}: <b class="gold">${m.gold} Gold</b> und <span class="ow-lootname">${esc(M.itemName(w.item))}</span>.`,'narr');
 if(SH)await SH.loot({title:`Der ${esc(w.name)} gehört euch`,gold:m.gold,item:M.itemName(w.item),line:pickL(WG.TEXT.openLoot)});}
// Schmiederezepte: Jeder getötete oder kampfunfähige Gegner bringt die Rezepte seiner Ausrüstung (M.workshop.defeated).
function learnRecipes(m,b){try{const n=M.workshop?.defeated?.(b,{force:true,id:'outside-'+m.seed})||[];if(n.length){(m.recipes??=[]).push(...n.filter(x=>!m.recipes.includes(x)));mlog('⚒ Schmiederezept erlernt: <b>'+n.map(esc).join(', ')+'</b>','narr');}}catch(e){console.warn(e);}}
async function encounterEnd(b){const m=R.m;if(R.ended)return;learnRecipes(m,b);const out=D.endEncounter(m,b);b.done=null;b.paused=true;renderInfo();const st=out.station,adv=m.kind==='adventure';
 for(const g of out.died)mlog(`<b class="red">† ${esc(g.name)}</b> ist tot. Death is permanent.${adv?'':' Krassus wird das als Ausfall verbuchen.'}`,'dead');
 for(const g of out.downed)mlog(`${esc(g.name)} kann nicht mehr und wird ab jetzt getragen.`);
 if(out.winner===0){
  if(out.loot.length)mlog('Beute: '+out.loot.map(l=>`<span class="ow-lootname">${esc(M.itemName(l.item))}</span>`).join(', '));
  if(adv){await celebrate(b);if(!live(b))return;}
  if(!st.boss){await (LU?LU.aftermath(b):aftermath(b));if(!live(b))return;}
  if(st.boss&&m.mode==='wagon'){setButtons('after');await (LU?LU.aftermath(b):aftermath(b));if(!live(b))return;await wagonLoot(b);if(!live(b))return;setButtons('won');return;}
  if(st.boss){setButtons('talk');const boss=b.encEnemies[0],bn=adv?first(boss.g):'Krassus';
   const ty=NT?.typeOf(boss.g);for(const [w,l] of (adv?(ty?.down||m.texts.leaderDown):D.TEXT.bossDown)){const me=w==='K'||w==='L',a=me?boss:anyParty(b);if(adv)await sayFull(a,l,{name:me?bn:first(a.g),boss:me});else{bubble(a,l,{name:me?bn:first(a.g),boss:me,ms:3000});mlog(`<b class="${me?'boss':''}">${esc(me?bn:a.g.name)}:</b> „${esc(l)}“`);await talkPause(2600);}if(!live(b))return;}
   await (LU?LU.aftermath(b):aftermath(b));if(!live(b))return;
   mlog(adv?`In der Truhe des Anführers: <b class="gold">${m.gold} Gold</b>.`:`In der Geldkassette: <b class="gold">${m.gold} Gold</b>. Der Schuldschein über ${D.CFG.debt.toLocaleString('de-DE')} Gold brennt sehr schön.`,'narr');setButtons('won');return;}
  const a=anyParty(b),l=pickL(adv?D.ADV.cleared:D.TEXT.cleared);if(a){if(adv)await sayFull(a,l,{name:first(a.g)});else{bubble(a,l,{name:first(a.g)});mlog(`<b>${esc(a.g.name)}:</b> „${esc(l)}“`);}}if(!live(b))return;
  if(out.rest>0)mlog(`Kurze Rast: Notverbände, ein Schluck Wasser. Blut +${D.CFG.restBlood}. Verletzungen bleiben.`,'narr');
  if(m.state==='lost'){finishMission('lost');return;}
  const nx=m.place.stations[st.i+1];mlog(`${m.party.filter(D.fit).length} von ${m.party.length} können noch kämpfen. Weiter Richtung ${nx?.boss?'<b>'+esc(D.THEMES[nx.theme].name)+'</b>':esc(nx?D.THEMES[nx.theme].name:'Ziel')}?`,'narr');
  setButtons('next');return;}
 if(m.state==='fled'){finishMission('fled');return;}
 finishMission('lost');}
// ---------- Nach dem Kampf: Überlebende Gegner erledigen (schwarzer Humor), Gefallene durchsuchen ----------
const PLEA=['Gnade! Ich hab Kinder!','Warte! Ich zahl! Ich zahl alles!','Ich wollte nur zum Brunnen!','Nicht ins Gesicht!','Ich kenn deine Mutter!','Ich bin doch schon fast tot!'];
const EXEC=['Nichts Persönliches. Doch, eigentlich schon.','Grüß den Fährmann. Sag ihm, die Münze kommt später.','Schlaf gut. Lange.','Tief durchatmen. Ach, lass es.','Keine Sorge, das tut nur kurz weh. Mir gar nicht.','Du hast da was am Hals. Gleich nicht mehr viel.','Der Lanista mag keine Zeugen. Ich mag keine Arbeit. Machen wir’s schnell.','Betrachte es als Schuldenerlass.','Halt still, dann wird’s ordentlich.','Ich zähl bis drei. Eins.'];
const EXEC_Q=['Zinsen sind fällig.','Krassus lässt grüßen. Ach nein, der ist ja als Nächstes dran.','Restschuld: beglichen.'];
const SEARCH=['Drei Kupferstücke und ein Zahn. Der Zahn ist seiner.','Ein Brief an seine Mutter. Den heben wir auf. Für den Ofen.','Die Schuhe passen nicht. Schade.','Nichts. Der war ärmer als wir.','Ein Glücksbringer. Hat offenbar nicht funktioniert.','Brot. Halb gegessen. Ich nehm die andere Hälfte.','Würfel. Gezinkt. Natürlich.','Ein Schuldschein. Er schuldet jetzt niemandem mehr was.','Eine Locke von seiner Liebsten. Oder von seinem Hund.'];
function nearestParty(b,e){const l=partyActors(b);return l.reduce((m,a)=>!m||Math.hypot(a.x-e.x,a.y-e.y)<Math.hypot(m.x-e.x,m.y-e.y)?a:m,null);}
function walkTo(b,a,x,y,sp=95){routeTo(b,a,x,y,sp);a.startDelay=0;const t0=performance.now();return new Promise(res=>{const chk=()=>{if(!live(b)||!a.to||performance.now()-t0>7000/Math.min(2,speed())){a.to=null;a.path=[];a.state='idle';a.moveSpeed=0;return res();}setTimeout(chk,60);};chk();});}
async function aftermath(b){const m=R.m;setButtons('after');
 const alive=b.encEnemies.filter(e=>!e.g.dead&&(e.down||e.surrendered));
 for(const e of alive){if(!live(b))return;const k=nearestParty(b,e);if(!k)break;const side=k.x<e.x?-1:1;
  await walkTo(b,k,e.x+side*30,e.y+4);if(!live(b))return;k.a=side<0?0:Math.PI;await sayFull(e,pickL(PLEA),{name:first(e.g)});if(!live(b))return;
  const line=pickL(m.kind==='quest'&&Math.random()<.35?EXEC_Q:EXEC);await sayFull(k,line,{name:first(k.g)});if(!live(b))return;
  try{M.death(e,'Gnadenstoß',k);}catch(err){e.g.dead=true;e.down=true;e.state='dead';}
  mlog(`<b>${esc(k.g.name)}</b> gibt <b class="foe">${esc(e.g.name)}</b> den Gnadenstoß.`);await talkPause(600);await laugh(b);}
 const bodies=b.encEnemies.filter(e=>e.g.dead);for(const e of bodies.slice(0,Math.min(3,bodies.length))){if(!live(b))return;const k=nearestParty(b,e);if(!k)break;
  await walkTo(b,k,e.x+(k.x<e.x?-26:26),e.y+6);if(!live(b))return;const line=pickL(SEARCH);mlog(`<b>${esc(k.g.name)}</b> durchsucht ${esc(e.g.name)}.`);await sayFull(k,line,{name:first(k.g)});}
 if(bodies.length>3)mlog(`Die übrigen Taschen werden schneller geleert. Alles Brauchbare kommt mit.`,'narr');
 D.collect(m,b);}
async function next(){clearInterval(R.autoT);if(R.awaiting==='won'){setButtons('end');finishMission('won');return;}if(R.awaiting!=='next')return;setButtons('march');const r=R.nextRes;R.nextRes=null;r?.();}
async function flee(){clearInterval(R.autoT);const m=R.m,b=S.battle;if(!m||R.ended||['flee','won','end'].includes(R.awaiting))return;
 if(R.awaiting==='next'){finishMission('withdrawn');return;}
 setButtons('flee');R.fleeing=true;const inFight=b&&b.started&&!b.done;
 if(b){b.paused=true;if(inFight){b.done={winner:-2,reason:'Flucht'};b.handled=true;}
  for(const a of b.actors)if(a.team===0&&!a.down&&!a.g.dead){a.to=[a.x-500,a.y,120];a.path=[];}
  const a=anyParty(b);if(a)bubble(a,pickL(['RENNT!','Taktischer Rückzug! Also: RENNT!','Ich hol schon mal die Pferde! Wir haben keine Pferde!','Wer zuletzt am Tor ist, zahlt die Zinsen!']),{name:first(a.g)});}
 await talkPause(1600);if(b&&inFight){learnRecipes(m,b);D.endEncounter(m,b,{fled:true});}m.state='fled';finishMission('fled');}
function cleanupBattle(){LU?.reset();SH?.reset();WAG=null;if(R.m?.boss)NT?.unregister(R.m.boss);const m=R.m;if(m&&m.prevLimit!==undefined){if(m.prevLimit===null)delete M.benchmarkTimeLimit;else M.benchmarkTimeLimit=m.prevLimit;}
 M.missionBackdrop=null;document.body.classList.remove('ow-mission');$('owOver')?.remove();const bb=$('battleBottom');if(bb){bb.innerHTML='';delete bb.dataset.ow;}$('battleView')?.classList.remove('ow-fade');}
function abortMission(){R.ending=true;R.ended=true;cleanupBattle();R.m=null;R.b=null;R.nextRes=null;}
function finishMission(kind){const m=R.m;if(R.ended)return;R.ended=true;R.ending=true;R.fleeing=false;R.marching=false;setButtons('end');R.nextRes=null;
 const b=S.battle;if(b)b.paused=true;
 setTimeout(()=>{try{applyResult(m,kind);}catch(e){console.error(e);}if(S.battle?.mission===m)S.battle=null;cleanupBattle();R.m=null;R.b=null;persist();view='result';M.ui.click('nav:outside');},kind==='won'?600:900);}
function applyResult(m,kind){const st=ST(),adv=m.kind==='adventure',keep=kind==='won';/* Beute nur, wenn die ganze Mission geschafft ist */
 if(st.run?.id!==R.runId)return;// anderer Spielstand: nichts anwenden
 const loot=[];if(keep)for(const l of m.loot){const item=M.copy(l.item);item.id=M.uid();item.durability=Math.max(1,Math.round(Math.min(item.durability??item.maxDurability,item.maxDurability??item.durability??1)));S.inventory.push(item);loot.push({name:M.itemName(item),from:l.from});}
 const gold=keep&&kind==='won'?m.gold:0;if(gold){S.gold+=gold;if(S.stats)S.stats.earned=(S.stats.earned||0)+gold;}
 if(!adv&&kind==='won'){st.stage='done';st.wins++;st.questDay=S.day;st.adv=newAdventure();st.lastAdventure=S.day;}
 if(adv&&kind==='won')st.advWins++;
 if(!adv&&kind!=='won')st.quest={...newQuestPlace(),name:st.quest?.name||m.place.name};
 const wag=m.mode==='wagon',wn=m.wagon?.name||'Wagen';
 const head=wag?{won:['ÜBERFALL GELUNGEN',`Der ${wn} gehört euch. Die Wachen liegen im Graben, der Kutscher ist irgendwo hinter dem dritten Hügel, und in der Kiste klimpert es. Ehrliche Arbeit ist das nicht. Aber Arbeit.`],
   passed:['NICHTS GEHOLT','Ihr habt alle Wagen ziehen lassen. Die Händler kommen heil an, die Truppe kommt heil heim, nur der Stolz hat Kratzer. Und die Knie. Vom Knien im Gebüsch.'],
   fled:['GEFLOHEN','Ihr rennt vom Wagen weg statt mit ihm. Die Wachen lachen. Die Beute bleibt liegen.'],
   withdrawn:['HEIMGEKEHRT','Ihr geht heim, bevor der nächste Wagen kommt.'],
   lost:['NIEDERLAGE',`Ihr wacht am Wegesrand auf. Der ${wn} ist weg, eure Würde auch. Die Wachen haben euch sogar die Zweige abgenommen.`]}[kind]
  :adv?{won:['SIEG',`${m.place.name} atmet auf. Oder hält die Luft an. Die ${m.texts.band} ist zerschlagen, ihr Anführer liegt im Dreck, seine Truhe gehört euch.`],
   fled:['GEFLOHEN','Ihr rennt. Würdevoll ist anders, aber lebendig ist auch was. Die Beute bleibt liegen – die gibt es nur für den ganzen Ort.'],
   withdrawn:['HEIMGEKEHRT','Ihr nehmt, was ihr habt, und geht. Die Bande zählt ihre Toten. Ihr zählt eure Beute.'],
   spared:['ABGEZOGEN',`${m.boss?.name||'Der Anführer'} lacht euch hinterher. Ihr geht ohne Beute, aber auf euren eigenen Beinen. In ${m.place.name} erzählt man sich ab heute, wie ihr gerannt seid. Mit jeder Runde Bier etwas schneller.`],
   lost:['NIEDERLAGE',`Ihr wacht im Straßengraben vor ${m.place.name} auf. Ohne Beute, ohne Würde. Die Bande hat sogar die Stiefel mitgenommen. Fast.`]}[kind]
  :{won:['SCHULDEN GETILGT',`Krassus Knochenzins liegt im Dreck von ${m.place.name}. Der Schuldschein ist Asche, die Dörfler jubeln. Nicht für euch. Sie jubeln, weil sie jetzt niemandem mehr etwas schulden. Außer dem Totengräber. Ab jetzt steht euch das Land offen: Ab jetzt schickt ihr eure Gladiatoren zum Plündern: Hinter dem Tor wartet jeden Tag ein neues Ziel.`],
   fled:['GEFLOHEN','Ihr rennt. Würdevoll ist anders, aber lebendig ist auch was. Die Beute bleibt liegen. Krassus wartet weiter.'],
   withdrawn:['ABGEZOGEN','Ihr nehmt, was ihr habt, und geht. Krassus wird es merken. Aber nicht heute.'],
   lost:['NIEDERLAGE',`Ihr wacht im Straßengraben vor ${m.place.name} auf. Ohne Beute, ohne Würde, aber mit einer frischen Mahnung im Gürtel.`]}[kind];
 for(const g of m.party){if(g.dead)continue;g.history?.unshift({day:S.day,text:(adv?'Plünderung':'Außenmission')+' '+m.place.name+': '+head[0].toLowerCase()+'.'});}
 try{M.log?.((adv?'Plünderung':'Der Schuldeneintreiber')+' · '+m.place.name+': '+head[0]+(loot.length?' · '+loot.length+' Beutestücke':'')+(gold?' · '+gold+' Gold':''));}catch(e){}
 // Kampfbericht wie nach einem Arenakampf (Seite „Kampfbericht“, Verlauf S.records): Werte und Gelerntes über die ganze Mission
 try{const b=S.battle;if(b?.mission===m)D.collect(m,b);const rep=m.rep||{};
  const report={id:'outside-'+m.seed+'-'+S.day,arenaName:(adv?'Plünderung '+'☠'.repeat(m.diff||2):'Außenmission')+' · '+m.place.label+' '+m.place.name,attackSummary:[],verdicts:[],loot:loot.map(l=>({name:l.name,condition:100})),day:S.day,won:kind==='won',draw:kind!=='won'&&kind!=='lost',reason:head[0],opponent:adv?(m.texts?.band||'Bande'):'Krassus Knochenzins',time:R.missionTime||0,gold,fame:0,league:S.league||0,tournament:'',
   actors:m.party.map(g=>{const r=rep[g.id]||{learning:{}};return {id:g.id,name:g.name,damage:Math.round(r.damage||0),taken:Math.round(r.taken||0),kills:r.kills||0,crits:r.crits||0,blocks:r.blocks||0,dodges:r.dodges||0,falls:r.falls||0,rearHits:r.rearHits||0,charges:r.charges||0,backsteps:r.backsteps||0,xpMultiplier:r.xpMultiplier||1,learning:r.learning||{},dead:!!g.dead,down:!g.dead&&!D.fit(g),injuries:Object.entries(g.body||{}).filter(([id,p])=>p.hp<85||p.missing).map(([id,p])=>M.partName(id)+': '+(p.missing?'abgetrennt':p.injury||'Verletzt')),blood:Math.round(g.blood)};}),
   log:(R.full||[]).slice(-60).reverse().map(([h])=>({time:0,text:String(h).replace(/<[^>]+>/g,'')}))};
  report.recipes=[...(m.recipes||[])];S.lastReport=report;S.records=[report,...(S.records||[])].slice(0,35);reportForResult=report;}catch(e){console.error(e);reportForResult=null;}
 st.history.unshift({day:S.day,kind:m.kind,diff:adv?m.diff:0,place:m.place.name,result:head[0].toLowerCase(),loot:loot.length,gold,deaths:m.deaths.length});st.history=st.history.slice(0,12);st.run=null;
 if(adv&&st.stage==='done'&&st.adv)st.adv=newAdventure(st.adv.biome,st.adv.diff);
 result={kind,title:head[0],text:head[1],loot,gold,goldFrom:wag?'aus dem '+wn:adv?'aus der Truhe des Anführers':'aus der Geldkassette',extra:!adv&&kind==='won'?'Schulden: −'+D.CFG.debt.toLocaleString('de-DE')+' Gold (Schuldschein verbrannt)':'',
  stats:`Gegner besiegt: ${m.killed} von ${m.total} · Begegnungen: ${m.cleared+1} von ${m.place.stations.length} · Tote: ${m.deaths.length}`,
  party:m.party.map(g=>{const hp=g.dead?0:Math.round(M.health(g)),inj=Object.entries(g.body||{}).filter(([k,p])=>p.missing||p.hp<85).sort((x,y)=>x[1].hp-y[1].hp).map(([k,p])=>p.missing?M.partName(k)+' fehlt':M.partName(k)+' '+Math.round(p.hp)+(p.fracture?' (Bruch)':'')).slice(0,4).join(', ');
   return {name:g.name,role:g.role,dead:g.dead,line:g.dead?'tot':'Gesundheit '+hp+' % · Blut '+Math.round(g.blood)+' · Erschöpfung '+Math.round(g.fatigue)+(inj?' · '+inj:'')};})};}
})();
