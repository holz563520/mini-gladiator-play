'use strict';
/* =====================================================================================================
   PLÜNDERUNGEN · INSZENIERUNG (Vorstellung des Anführers, Entscheidung, Kampfsequenz, Fernglas am Wegesrand)
   · present(): Steckbrief des Berüchtigten mit lebendiger Großaufnahme. Der Erzähler liest: wer er ist, wie viele er auf dem
     Gewissen hat, welche Waffe, welche Rüstung, warum er berüchtigt ist; danach seine Bande (bis zu vier mit Gesicht und Spruch).
     Die Kamera fährt dabei auf ihn bzw. die Vorgestellten. Dann Wortwechsel auf dem Feld, dann die Frage: kämpfen oder abziehen.
   · decide(): Entscheidungsfenster (auch für den Wagenüberfall).
   · fightCine(): Kampfsequenz: Kinobalken, Zeitlupe, Gebrüll, Waffen hoch, Ansturm.
   Reine Darstellung und Ablauf; Regeln und Zahlen stehen in outside-core.js. outside.js ruft DebtShow.install(ctx) auf.
   ===================================================================================================== */
(()=>{
const M=window.MG,S=M.s,$=id=>document.getElementById(id),N=()=>window.DebtNotorious;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>v<a?a:v>b?b:v,sleep=ms=>new Promise(r=>setTimeout(r,ms)),pick=l=>l[Math.floor(Math.random()*l.length)];
const first=g=>String(g?.name||'').split(' ')[0];
let C=null;const spd=()=>Math.max(1,S.options?.speed||1),live=b=>C.live(b);
const SH={on:false,focus:null,zoom:1,fx:0,fy:0,skip:false,all:false,cine:null,face:null,raf:0};

// ---------- Texte ----------
const WEAPON={club:'Ein Knüppel. Einfach, ehrlich, tödlich. Wie ein Steuereintreiber.',trident:'Ein Dreizack. Drei Löcher zum Preis von einem.',axe:'Eine Axt. Sonst spaltet er Holz. Heute Familien.',
 spear:'Ein Speer. Lang genug, um euch zu erreichen, bevor ihr „Gnade“ sagen könnt.',short:'Ein Kurzschwert. Kurz wie das Gebet, das ihr gleich sprecht.',hammer:'Ein Kriegshammer. Wer den abbekommt, wird in Raten begraben.',
 mace:'Ein Streitkolben. Macht aus Helmen Suppenschüsseln und aus Köpfen Suppe.',gladius:'Ein Gladius. Er hat ihn einem toten Gladiator abgenommen. Der Gladiator hat nicht protestiert.',
 long:'Ein Langschwert. Lang, scharf und eitel. Wie sein Besitzer.',greatsword:'Ein Zweihänder. Groß wie eine Tür, und er öffnet damit Leute.',doubleaxe:'Eine Doppelaxt. Zwei Klingen, damit er nicht umdrehen muss.',
 halberd:'Eine Hellebarde. Der Mann hat Ambitionen.',dagger:'Ein Dolch. Klein, gemein und immer da, wo man nicht hinschaut.',
 javelin:'Wurfspeere. Er wirft sie, holt sie sich zurück und wirft sie wieder. Meistens durch jemanden hindurch.',throwaxe:'Wurfäxte. Er hat sie an Scheunentoren geübt. Die Scheunen stehen noch. Die Bauern nicht.',
 net:'Ein Wurfnetz und ein Dreizack. Erst fängt er dich, dann piekst er dich. Fischer nennen das Handwerk.',bow:'Ein Bogen. Er trifft eine Fliege auf hundert Schritt. Ihr seid größer als Fliegen.',
 crossbow:'Eine Armbrust. Spannt langsam, trifft schnell. Das Nachladen ist eure einzige Gelegenheit zu beten.'};
const ARMOR={leather:'Leder. Riecht nach Pferd und hält nach Hoffnung.',medium:'Verstärktes Leder mit Eisenplatten. Eine Klasse besser als seine Leute. Bezahlt hat er dafür natürlich nicht.',metal:'Eisen, zwei Klassen über dem Leder seiner Leute, und zwei Güteklassen besser geschmiedet. Wer ihn aufmachen will, braucht einen Dosenöffner.'};
const TRAINER=['Und denkt dran: Wer ihn umbringt, kriegt die Truhe. Wer stirbt, kriegt ein Lied. Ein kurzes.','Die Bande wartet. Der Anführer grinst. Die Krähen auch.','Entscheidet euch. Er hat Zeit. Ihr eher nicht.'];

// ---------- Kamera ----------
function camera(b,width,height,W,H){if(!SH.on&&!SH.cine)return null;const k=height/C.VH,fit=Math.min(width/W,height/H);
 const tg=SH.focus?(typeof SH.focus==='function'?SH.focus():{x:SH.focus.x,y:SH.focus.y-46}):null;if(tg){SH.fx+=(tg.x-SH.fx)*.08;SH.fy+=(tg.y-SH.fy)*.08;}
 SH.zoom+=((SH.zoomTo||1)-SH.zoom)*.06;const Z=SH.zoom,vw=width/(k*Z),vh=C.VH/Z,oy=SH.on&&$('shWrap')&&!$('shWrap').hidden?vh*.17:0;return {zoom:k/fit*Z,x:clamp(SH.fx,vw/2,W-vw/2),y:clamp(SH.fy+oy,vh/2,H-vh/2)};}
function camStart(x,y){const c=C.cam();SH.fx=c.x;SH.fy=c.y;SH.zoom=1;if(x!=null){SH.focus={x,y};}}

// ---------- Oberfläche ----------
const MARKUP='<div id="shWrap" hidden><div class="sh-card"><div class="sh-left"><canvas id="shFace" width="240" height="156"></canvas><div class="sh-plate"><small id="shTag">BERÜCHTIGT</small><b id="shName"></b><i id="shSkulls"></i></div></div>'
 +'<div class="sh-right"><dl id="shFacts"></dl><p id="shLine"></p><div class="sh-crew" id="shCrew"></div></div><div class="sh-btns"><button class="btn" type="button" id="shNext">Weiter ▶</button><button class="btn" type="button" id="shAll">Überspringen ▶▶</button></div></div></div>'
 +'<div id="shDecide" hidden><b id="shQ"></b><div id="shInfo"></div><div class="sh-dbtn"><button class="btn primary" type="button" id="shYes"></button><button class="btn" type="button" id="shNo"></button></div></div>'
 +'<div id="shCine" hidden><div class="sh-bar top"></div><div class="sh-bar bot"></div><b id="shCineT"></b></div>';
function mount(host){if(!host||host.querySelector('#shWrap'))return;host.insertAdjacentHTML('beforeend',MARKUP);$('shNext').onclick=()=>{SH.skip=true;};$('shAll').onclick=()=>{SH.skip=true;SH.all=true;};}
// Großaufnahme im Steckbrief (lebendig: leichte Kameradrehung, Mund spricht mit, Stimmung wechselt)
function faceLoop(){if(!SH.face){SH.raf=0;return;}const cv=$('shFace');if(!cv){SH.raf=0;return;}const t=(performance.now()-SH.face.t0)/1000,c=cv.getContext('2d');c.imageSmoothingEnabled=false;
 try{M.faceShot.paint(c,cv.width,cv.height,{g:SH.face.g,team:1,mood:SH.face.mood||((t%7)<1.6?'confident':'grin'),yaw:Math.sin(t*.5)*.3,zoom:1.06},t+2);}catch(e){}
 SH.raf=requestAnimationFrame(faceLoop);}
function showFace(g,mood){SH.face={g,mood,t0:performance.now()};if(!SH.raf)SH.raf=requestAnimationFrame(faceLoop);}
function crewFace(cv,g){const c=cv.getContext('2d');c.imageSmoothingEnabled=false;try{M.faceShot.paint(c,cv.width,cv.height,{g,team:1,mood:pick(['grin','confident','dumb','determined']),yaw:-.25,zoom:1.04},3);}catch(e){}}
// Satz zeigen und vom Erzähler lesen lassen; weiter, wenn gelesen (oder Klick)
async function narrate(text,o={}){const el=$('shLine');if(el){el.textContent='';el.classList.toggle('quote',!!o.quote);}
 /* erst ausreden lassen, wer gerade spricht, dann diesen Satz ganz lesen */for(let n=0;n<250&&!SH.all&&M.speechHold?.();n++)await sleep(100);
 if(!SH.all){M.speakLine?.(text,o.who||'erzaehler',o.g||null,{name:o.name||'',keep:true});C.mlog(`<i>${esc(text)}</i>`,'narr');}
 SH.skip=false;for(let i=0;i<=text.length&&!SH.skip&&!SH.all;i+=2){if(el)el.textContent=text.slice(0,i);await sleep(14);}if(el)el.textContent=text;if(SH.all)return;
 const t0=performance.now(),min=Math.max(1300,700+text.length*38)/Math.min(2,spd());while(!SH.skip&&!SH.all&&(performance.now()-t0<min||M.speechHold?.())&&performance.now()-t0<20000)await sleep(80);
 if(SH.skip&&!SH.all)M.speakStop?.();}
function fact(dt,dd){const dl=$('shFacts');if(!dl)return;dl.insertAdjacentHTML('beforeend',`<dt>${esc(dt)}</dt><dd>${dd}</dd>`);}
function skullRow(n){const SK=['..XXXXX..','.XXXXXXX.','XXXXXXXXX','X..XXX..X','X..XXX..X','XXXX.XXXX','.XXXXXXX.','..X.X.X..','..XXXXX..'];const one=on=>{let r='';SK.forEach((row,y)=>[...row].forEach((c,x)=>{if(c==='X')r+=`<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`;}));return `<svg class="ow-skull ${on?'on':''}" viewBox="0 0 9 9" width="18" height="18" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;};return `<span class="ow-skulls">${[1,2,3,4,5].map(i=>one(i<=n)).join('')}</span>`;}


// ---------- Vorstellung des Anführers und seiner Bande ----------
// b: Kampf, m: Mission, boss: Akteur des Anführers, crew: Akteure vorn (ohne ihn). Liefert 'fight' oder 'leave'.
async function present(b,m,boss,crew){const g=boss.g,ty=N()?.typeOf(g),place=m.place.name,w=g.enemyGear?.weapon,armor=Object.values(g.enemyGear?.armor||{}),mat=armor.find(a=>a.material==='metal')?'metal':armor.find(a=>a.material==='medium')?'medium':'leather';
 const all=[...crew];const reserve=(m.queues[m.place.stations.length-1]||[]).length-1-all.length;
 SH.on=true;SH.all=false;SH.zoomTo=1.9;camStart();SH.focus=boss;$('shWrap').hidden=false;$('shFacts').innerHTML='';$('shCrew').innerHTML='';$('shCrew').hidden=true;
 $('shName').textContent=g.name;$('shTag').textContent=ty?'BERÜCHTIGT · '+(m.texts?.band||'BANDE').toUpperCase():'ANFÜHRER';$('shSkulls').innerHTML=skullRow(m.diff||2);showFace(g);
 C.state('Wer ist das …');
 const kills=g.notoriousKills||Math.round(20+Math.random()*60),crewName=ty?.crew||('seine '+(m.texts?.band||'Bande'));
 await narrate(`${g.name}. Anführer der ${m.texts?.band||'Bande'} von ${place}. Seine Leute nennen sich ${crewName}.`);if(!live(b))return end('leave');
 fact('Auf dem Gewissen',`<b class="red">${kills}</b> Menschen`);await narrate(`Auf dem Gewissen: ${kills} Menschen. ${ty?.kills?.replace('{P}',place)||'Er zählt sie nicht mehr. Er wiegt sie.'}`);if(!live(b))return end('leave');
 if(w){fact('Waffe',esc(M.itemName(w)));await narrate(`${w.nickname?`Seine Waffe heißt „${w.nickname}“. `:''}${WEAPON[w.def]||'Scharf genug.'}`);if(!live(b))return end('leave');}
 const parts=armor.length;fact('Rüstung',`${mat==='metal'?'Metall':mat==='medium'?'Verstärkt':'Leder'} · ${parts} Teile${g.enemyGear?.shield?' · Schild':''}`);await narrate(ARMOR[mat]);if(!live(b))return end('leave');
 if(ty){const why=pick(ty.why).replace(/\{P\}/g,place);fact('Berüchtigt',esc(why));await narrate(`Berüchtigt, weil … ${why}`);if(!live(b))return end('leave');}
 if(ty?.relic){const RL=window.MGRelics,wn=RL?.weaponName(ty.weapon)||'';fact('Trophäe',`${esc(ty.relic.name)} · <b class="gold">+${RL?.bonusOf?.(ty.id)||2} ${esc(wn)}</b>`);await narrate(`Und wer ihn erledigt, nimmt ihm das ab: ${ty.relic.name}. Wer es trägt, führt ${wn==='Wurfnetz'?'das':'die'} ${wn} besser. Um ${RL?.bonusOf?.(ty.id)||2} Punkte.`);if(!live(b))return end('leave');}
 // Die Bande: bis zu vier mit Gesicht und Spruch, Kamera fährt mit
 if(all.length){const box=$('shCrew');box.hidden=false;showFace(g,'grin');const lines=[...N()?.CREW||[]].sort(()=>Math.random()-.5);
  await narrate(`Mit ihm: ${crewName}. ${all.length+Math.max(0,reserve)} Mann${reserve>0?`, ${reserve} davon in der zweiten Reihe`:''}.`);
  for(const [i,a] of all.slice(0,4).entries()){if(!live(b)||SH.all)break;SH.focus=a;const cv=document.createElement('canvas');cv.width=120;cv.height=78;const it=document.createElement('div');it.className='sh-mate';it.appendChild(cv);it.insertAdjacentHTML('beforeend',`<b>${esc(a.g.name)}</b>`);box.appendChild(it);crewFace(cv,a.g);
   const wn=M.itemTitle?M.itemTitle(a.g.enemyGear?.weapon):M.itemName(a.g.enemyGear?.weapon);await narrate((lines[i%lines.length]||'{N} mit {W}.').replace('{N}',a.g.name).replace('{W}',wn||'bloßen Fäusten'));}
  SH.focus=boss;}
 if(!live(b))return end('leave');
 $('shWrap').hidden=true;SH.zoomTo=1.35;
 // Wortwechsel auf dem Feld (er, einer von uns, er)
 C.state('Jemand redet …');const me=C.speaker(b),bn=first(g);
 for(const [who,l] of (ty?.intro||m.texts?.leaderIntro||[])){if(!live(b))return end('leave');const isL=who==='L',a=isL?boss:me;if(!a)continue;SH.focus=a;C.bubble(a,l,{name:isL?bn:first(a.g),boss:isL,ms:2800});C.mlog(`<b class="${isL?'boss':''}">${esc(isL?g.name:a.g.name)}:</b> „${esc(l)}“`);await C.talkPause(2400);}
 if(!live(b))return end('leave');
 // Entscheidung
 const fit=b.actors.filter(a=>a.team===0&&!a.down&&!a.g.dead),hp=Math.round(fit.reduce((s,a)=>s+M.health(a.g),0)/Math.max(1,fit.length)),foes=1+Math.max(0,(m.queues[m.place.stations.length-1]||[]).length-1);
 const quip=pick(TRAINER);const shape=hp>=80?'frisch':hp>=60?'angeschlagen':hp>=40?'schwer angeschlagen':'am Ende';SH.focus=boss;SH.zoomTo=1.15;
 const ch=await decide({q:`Gegen ${esc(g.name)} kämpfen?`,info:`<p>${skullRow(m.diff||2)} <b>${esc(D_NAME(m.diff))}</b></p><p>Eure Truppe: <b>${fit.length}</b> kampffähig von ${m.party.length} · Gesundheit ⌀ ${hp} % (${shape})</p><p>Gegner: <b>${esc(first(g))}</b> und ${foes-1} Mann · Rüstung ${mat==='metal'?'Metall':mat==='medium'?'verstärkt':'Leder'}</p><p class="tiny">Kampf: Wer ihn besiegt, bekommt seine Truhe und alle Beute. Abziehen: Alle kommen heim, die Beute bleibt liegen.</p><p class="tiny"><i>${esc(quip)}</i></p>`,say:`Gegen ${g.name} kämpfen? ${quip}`,yes:'⚔ Angreifen',no:'Abziehen (ohne Beute)'});
 return end(ch?'fight':'leave');}
const D_NAME=d=>(window.Debt?.DIFF?.names||[])[clamp(Math.round(d||2),1,5)-1]||'';
function end(r){SH.on=false;SH.face=null;SH.focus=null;SH.zoomTo=1;const w=$('shWrap');if(w)w.hidden=true;return r;}
// Entscheidung: Fenster mit zwei Knöpfen, liefert true (ja) oder false (nein)
function decide(o){return new Promise(res=>{const box=$('shDecide');if(!box)return res(true);$('shQ').innerHTML=o.q;$('shInfo').innerHTML=o.info||'';$('shYes').textContent=o.yes||'Ja';$('shNo').textContent=o.no||'Nein';box.hidden=false;C.state(o.state||'Eure Entscheidung …');
 /* Frage (und Spruch) vom Erzähler vorlesen */M.speakLine?.(o.say||String(o.q||'').replace(/<[^>]*>/g,''),'erzaehler',null,{keep:true});
 const done=v=>{box.hidden=true;$('shYes').onclick=$('shNo').onclick=null;res(v);};$('shYes').onclick=()=>done(true);$('shNo').onclick=()=>done(false);});}

// ---------- Kampfsequenz ----------
// Kinobalken, Zeitlupe, Gebrüll beider Seiten, Waffen hoch (a.warCry), dann Ansturm
async function fightCine(b,boss,o={}){const old=S.options.speed||1,t0=performance.now();SH.cine={t0};const el=$('shCine');if(el){el.hidden=false;el.classList.remove('go');void el.offsetWidth;el.classList.add('go');$('shCineT').textContent=o.title||pick(N()?.START||['Und los!']);}
 const party=b.actors.filter(a=>a.team===0&&!a.down&&!a.g.dead),foes=b.actors.filter(a=>a.team===1&&!a.down&&!a.g.dead);
 const mid={x:(party.reduce((s,a)=>s+a.x,0)/Math.max(1,party.length)+(boss?boss.x:foes.reduce((s,a)=>s+a.x,0)/Math.max(1,foes.length)))/2,y:(party.reduce((s,a)=>s+a.y,0)/Math.max(1,party.length)+(boss?boss.y:0))/(boss?2:1)};
 camStart();SH.focus={x:mid.x,y:mid.y+40};SH.zoomTo=1.25;S.options.speed=.35;
 for(const a of [...party,...foes])a.warCry=2.2;
 const ty=N()?.typeOf(boss?.g);if(boss){C.bubble(boss,pick(o.cry||ty?.cry||['Auf sie!']),{name:first(boss.g),boss:true,loud:true,ms:2000});}
 try{M.voice?.('battlecry',M.voicePitch?.(boss?.g)??1);setTimeout(()=>{try{M.voice?.('battlecry',1.05);M.sound?.('rush');}catch(e){}},420);}catch(e){}
 const me=C.speaker(b);if(me)setTimeout(()=>C.bubble(me,pick(o.ours||['FÜR DEN LUDUS!','DRAUF!','KEINE GNADE!','HOLT EUCH DIE TRUHE!']),{name:first(me.g),loud:true,ms:1800}),700);
 // warCry selbst herunterzählen (die Engine tut es außerhalb des Anführer-Moduls nicht)
 const tick=()=>{const dt=1/60;for(const a of b.actors)if(a.warCry>0)a.warCry=Math.max(0,a.warCry-dt*.5);if(SH.cine)requestAnimationFrame(tick);};requestAnimationFrame(tick);
 await sleep(o.ms||2300);S.options.speed=old;SH.cine=null;SH.focus=null;SH.zoomTo=1;if(el){el.hidden=true;el.classList.remove('go');}}

// Beute aus dem Wagen: Truhe öffnet sich (Pixelbild), Gold und Fundstück; weiter nach Klick oder von selbst
function chestPaint(cv,t){const g=cv.getContext('2d'),W=cv.width,H=cv.height,P=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};g.imageSmoothingEnabled=false;
 g.fillStyle='#171512';g.fillRect(0,0,W,H);const o=clamp(t/1.1,0,1),cx=W/2,by=H*.82,cw=W*.5,ch=H*.34;
 for(let i=0;i<14;i++){const a=i/14*Math.PI*2+t*.4;g.globalAlpha=.12*o;g.fillStyle='#f4d37a';g.beginPath();g.moveTo(cx,by-ch);g.lineTo(cx+Math.cos(a)*W,by-ch+Math.sin(a)*W);g.lineTo(cx+Math.cos(a+.12)*W,by-ch+Math.sin(a+.12)*W);g.fill();}g.globalAlpha=1;
 P(cx-cw/2,by-ch,cw,ch,'#5a3a1c');P(cx-cw/2,by-ch,cw,4,'#7a5230');for(const x of [.1,.5,.9])P(cx-cw/2+cw*x-3,by-ch,6,ch,'#3a3a3a');P(cx-6,by-ch+8,12,14,'#d8a838');
 // Gold im Kasten
 for(let i=0;i<40;i++){const x=cx-cw/2+8+((i*37)%(cw-16)),y=by-ch-2-((i*13)%10)*o*1.4;P(x,y,6,4,i%3?'#e6b42a':'#fff0a0');}
 // Deckel klappt auf
 g.save();g.translate(cx-cw/2,by-ch);g.rotate(-o*1.9);P(0,-ch*.55,cw,ch*.55,'#6a4a22');P(0,-ch*.55,cw,4,'#8a6a3a');for(const x of [.1,.5,.9])P(cw*x-3,-ch*.55,6,ch*.55,'#3a3a3a');g.restore();
 for(let i=0;i<6;i++){const ph=((t*1.3+i/6)%1);g.globalAlpha=1-ph;P(cx-30+i*12,by-ch-10-ph*50,3,3,'#fff6d0');}g.globalAlpha=1;}
function loot(o){return new Promise(res=>{const box=$('shDecide');if(!box)return res();$('shQ').innerHTML=o.title||'Beute!';
 $('shInfo').innerHTML=`<canvas id="shChest" width="240" height="120" style="width:100%;max-width:300px;image-rendering:pixelated;display:block;margin:0 auto"></canvas><p><b class="gold">${o.gold} Gold</b></p><p>Aus der Ladung: <b>${esc(o.item)}</b></p>${o.line?`<p class="tiny"><i>${esc(o.line)}</i></p>`:''}`;
 $('shYes').textContent='Einpacken ▶';$('shNo').hidden=true;box.hidden=false;const t0=performance.now();let on=true;const fr=()=>{if(!on)return;const cv=$('shChest');if(cv)chestPaint(cv,(performance.now()-t0)/1000);requestAnimationFrame(fr);};fr();
 try{M.sound?.('coin');}catch(e){}if(o.line)M.speakLine?.(o.line,'erzaehler',null,{});
 const done=()=>{on=false;clearTimeout(tm);box.hidden=true;$('shNo').hidden=false;$('shYes').onclick=null;res();};$('shYes').onclick=done;const tm=setTimeout(done,(o.ms||6500)/Math.min(2,spd()));});}
function reset(){end();SH.cine=null;SH.free=false;for(const id of ['shWrap','shDecide','shCine']){const e=$(id);if(e)e.hidden=true;}}
window.DebtShow={install(ctx){C=ctx;},mount,camera,present,decide,fightCine,loot,reset,skullRow,SH};
})();
