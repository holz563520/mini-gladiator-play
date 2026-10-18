'use strict';
// =====================================================================================================
// KAPITEL „DIE TEUERSTE LEKTION DES LANISTERS“ · folgt auf „Der Medikus“ (nur Testversion, nicht im Hauptspiel)
// Krankenhaus → der Lanister ist pleite → er geht selbst gegen Rex → Vorstellung → echter Kampf → die Menge tobt →
// die Lektion des Schmieds → Schwarzblende.
// Figuren, Körper, Waffen, Gesichter (M.renderForgeActors, M.faceShot), Rex (M.drawRex) und der Kampf (Kampfsystem des
// Spiels über arena-core/arena-beasts) stammen aus dem Spiel. Der Lanister hat für diesen Kampf Werte um 90 – nur in
// seiner Kampfkopie, nichts anderes ändert sich. Rex ist ausgehungert und lahmt (Hinterlauf zerstört: kein Ansprung).
// =====================================================================================================
(()=>{
const M=window.MG,S=M.s,AN=window.AN,ART=window.ArenaArt,cl=M.clamp,TEST=!!window.LESSON_TEST;
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const K=.6,W=900,H=670;
const st=()=>(S.lesson??={stage:''});
const setStage=s=>{st().stage=s;try{M.persist();}catch{}};
const smithName=()=>M.workshop.state.master?.name||'Der Schmied';
const lanName=()=>S.lanista?.name||'Lanister';
const recs=()=>M.medic?.recs?.()||[];
const first=g=>String(g?.name||'Rekrut').split(' ')[0];
const items={};const item=def=>items[def]??=M.makeItem('weapon',def,1);

// ---------- Figuren ----------
function smithActor(x,y){const p=M.workshop.state.master||{name:'Der Schmied',height:182,weight:96,appearance:{}},rng=S.rng,g=M.makeGladiator(0);S.rng=rng;Object.assign(g,{id:'les-smith',name:p.name,height:p.height,weight:p.weight,muscle:58,fame:0,scars:[]});g.appearance={...p.appearance};g.equipment={weapon:null,secondary:null,shield:null,armor:{}};g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};
 return {id:'les-smith',g,team:0,x,y,a:0,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,forgeWorker:true,forgeHold:'beer',bloodMarks:{},noNav:true};}
// Eigene Kopie der Lanister-Figur (das Spiel zwischenspeichert seine Figur; die bleibt unberührt)
function lanFigure(){const g=JSON.parse(JSON.stringify(M.ludus.ownerFigure(S.lanista)));g.id='les-lanista';g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};g.equipment={weapon:null,secondary:null,shield:null,armor:{}};return g;}
function lanActor(x,y){return {id:'les-lan',g:lanFigure(),lanista:true,team:0,x,y,a:Math.PI,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,noNav:true,bloodMarks:{}};}
function arm(a,def){a.g.enemyGear.weapon=def?item(def):null;a.held=def||null;}
function extraActor(id,opts={}){const rng=S.rng,g=M.makeGladiator(0);S.rng=rng;g.id=id;g.name=opts.name||'';g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};g.equipment={weapon:null,secondary:null,shield:null,armor:{}};if(opts.appearance)Object.assign(g.appearance,opts.appearance);return {id,g,team:0,x:0,y:0,a:0,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,noNav:true,unarmored:true};}
const pose=(a,o)=>Object.assign(a,{state:'idle',moveSpeed:0,traderPose:null,forgePose:'',...o});
function walker(a,dt){if(!a.to)return;const dx=a.to[0]-a.x,dy=a.to[1]-a.y,d=Math.hypot(dx,dy),s=(a.to[2]||40)*dt;if(d<=s){a.x=a.to[0];a.y=a.to[1];if(a.to[3]!=null)a.a=a.to[3];a.to=null;a.state='idle';a.moveSpeed=0;return;}a.x+=dx/d*s;a.y+=dy/d*s;a.state='move';a.moveSpeed=10;a.odo=(a.odo||0)+s;a.phase=a.odo*.267;if(Math.abs(dx)>.5)a.a=dx>0?0:Math.PI;}
function drawActor(g,a){M.renderForgeActors(g,[{...a}]);}
// Verletzte aus dem Medikus-Kapitel: Lage im Bett, Knien, Verbände, Blutflecken wie dort gemerkt
const HOSP_SPOT=[[420,404,'bed'],[506,404,'bed'],[592,404,'bed'],[660,418,'kneel'],[706,426,'crutch']];
function recActor(g,i){const v=S.medic?.vis?.[g.id]||{},[x0,y0,mode]=HOSP_SPOT[i],x=mode==='bed'?x0-8:x0,y=mode==='bed'?y0+14:y0; // Liegende: Figur auf dem Strohsack
 return {id:'les-r'+i,g,slot:i,team:0,x,y,a:Math.PI,phase:i*1.7,state:'idle',energy:100,ammo:0,moveSpeed:0,unarmored:true,noNav:true,seed:i*2.3,mode,dressings:v.dressings||{},bloodMarks:v.marks||{},embedded:v.embedded||[]};}
function applyRec(a,dt){const lying=a.mode==='bed'&&!a.sitUp;a.down=lying;a.fallSide=-1;a.agony=lying?{pose:a.slot===1?2:1,part:a.slot===1?'arm':'leg',rate:1.6,live:.25,lie:1.35}:null;
 a.kneeDuration=99;a.kneeTimer=a.mode==='kneel'&&!a.standTry?97:0;a.hit=Math.max(0,(a.hit||0)-dt);a.facePain=Math.max(.6,(a.facePain||0)-dt*.5);a.stagger=Math.max(0,(a.stagger||0)-dt);
 if(a.mode==='crutch'){a.stagger=Math.max(a.stagger,.15);a.moveSpeed=0;}}

// ---------- Kulissen ----------
let hospBg=null;
function hospital(){if(hospBg)return hospBg;const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.imageSmoothingEnabled=false;const R=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 const h=n=>{const s=Math.sin(n*127.1)*43758.5;return s-Math.floor(s);};
 R(0,0,W,H,'#1b1512');
 // Rückwand: Bruchstein, unten verputzt
 for(let y=150;y<340;y+=9)for(let x=((y/9)%2)*11;x<W;x+=22){const n=h(x*.7+y);R(x,y,21,8,n<.33?'#5b4a3c':n<.66?'#64523f':'#54443a');R(x,y+8,21,1,'#2c231d');}
 R(0,340,W,42,'#8a7a62');for(let i=0;i<60;i++)R(h(i*3.7)*W,342+h(i*1.3)*38,6+h(i)*10,2,'#7a6a54');R(0,338,W,3,'#4a3a2c');R(0,380,W,4,'#3a2d24');
 // Fenster mit Lichtbahnen
 for(const wx of [330,610]){R(wx-24,248,48,58,'#2a211b');R(wx-20,252,40,50,'#d9c9a0');R(wx-1,252,2,50,'#2a211b');R(wx-20,276,40,2,'#2a211b');g.fillStyle='rgba(255,236,190,.08)';g.beginPath();g.moveTo(wx-20,302);g.lineTo(wx+20,302);g.lineTo(wx+80,500);g.lineTo(wx,500);g.fill();}
 // Regal mit Tiegeln und Kräutern
 R(430,282,110,4,'#4a3424');R(430,312,110,4,'#4a3424');for(let i=0;i<9;i++){const n=h(i*3.1);R(434+i*12,270+(n>.5?2:0),8,12-(n>.5?2:0),['#9b7d55','#6c8a70','#a65f45','#cfc2a0'][i%4]);R(436+i*12,300,7,12,['#7d6a52','#8f2f2a','#b9a77c'][i%3]);}
 for(let i=0;i<6;i++){R(690+i*9,258,2,26+i%3*4,'#5e7a3e');R(688+i*9,256,6,4,'#7d9a52');}
 // Holzboden
 for(let y=384;y<H;y+=7){R(0,y,W,7,((y/7)%2)?'#5a4130':'#634733');R(0,y+6,W,1,'#3a2a1e');for(let x=((y*7)%60);x<W;x+=60+((y*3)%40))R(x,y,1,6,'#3a2a1e');}
 for(let i=0;i<9;i++){const x=180+h(i*5.3)*560,y=440+h(i*7.1)*160;g.fillStyle='rgba(94,31,28,.7)';g.beginPath();g.ellipse(x,y,4+h(i)*7,1.6+h(i*2)*2,0,0,7);g.fill();}
 // Tisch des Medikus mit Schüssel, Binden, Säge
 R(196,402,84,8,'#6b4a30');R(202,410,6,34,'#4a3424');R(268,410,6,34,'#4a3424');R(210,394,22,8,'#c9c2a8');R(212,396,18,4,'#8f2f2a');R(240,396,24,6,'#efe6d0');R(262,398,16,2,'#a9a9a0');for(let i=0;i<6;i++)R(262+i*3,400,2,2,'#a9a9a0');
 // Strohsäcke für die Liegenden
 for(const [x,y] of HOSP_SPOT.slice(0,3)){g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(x,y+4,40,6,0,0,7);g.fill();R(x-38,y-4,76,9,'#b99d62');R(x-38,y-4,76,2,'#d4bb80');R(x-38,y+4,76,1,'#7a6438');for(let i=0;i<12;i++)R(x-36+i*6,y-1+(i%2),3,1,'#e0c98e');R(x+24,y-6,13,6,'#e6dcc4');}
 // Kerzen
 for(const [x,y] of [[200,392],[560,278],[760,400]]){R(x,y,3,8,'#efe6d0');R(x,y-3,3,3,'#f0a13c');}
 return hospBg=c;}
let yardBg=null;const yard=()=>yardBg??=M.ludus.background();

// ---------- Filmbühne (wie medic.js / lion.js: Takte mit Text, Kamera, Figuren, Karten) ----------
let film=null;
const need=t=>Math.max(2.1,1+t.length*.058);
function play(o){stopFilm();const v=document.createElement('div');v.className='smith-ceremony smith-intro lion-film medic-film lesson-film no-smith-song';
 v.innerHTML='<div><div class="medic-top"><span>'+esc(o.label||'')+'</span><button class="btn small" type="button" data-les="skip">SZENE ÜBERSPRINGEN ›</button></div><div class="scene-bubble-slot"><div class="scene-bubble" id="medicBubble" hidden></div></div><canvas id="medicCanvas" width="660" height="420"></canvas><p id="medicText" aria-live="polite"></p><div id="medicInfo" hidden></div></div>';
 document.body.appendChild(v);
 v.addEventListener('click',e=>{if(!film)return;if(e.target.closest?.('[data-les="skip"]')){e.stopPropagation();skipScene();return;}if(e.target.closest?.('[data-les]'))return;if(film.line||film.hold){if(film.bt>.2)film.ack=true;}else film.skip=true;});
 film={floats:[],fx:[],props:[],...o,view:v,i:-1,t:0,bt:0,line:null,shown:0,cam:{...(o.cam||{x:470,y:420,vw:300})},camTo:null,scene:o.scene||'hosp',dark:0,face:null};next();}
function stopFilm(){film?.view?.remove();film=null;}
function next(){const f=film;f.i++;f.bt=0;f.shown=0;f.ack=false;f.skip=false;const b=f.beats[f.i];if(!b){const done=f.done;stopFilm();done?.();return;}
 if(b.scene)f.scene=b.scene;if('face' in b)f.face=b.face?{...b.face,t0:f.t}:null;b.do?.(f);if(!film||film!==f)return;
 f.line=b.say?{who:b.who||'s',text:typeof b.say==='function'?b.say(f):b.say}:null;f.hold=!!b.hold;if(b.cam)f.camTo={...b.cam};if('card' in b)setCard(typeof b.card==='function'?b.card(f):b.card,f.hold);}
function stepFilm(dt){const f=film;if(!f)return;f.t+=dt;f.bt+=dt;const b=f.beats[f.i];if(!b)return;b.each?.(f,dt,f.bt);if(film!==f)return;f.tick?.(f,dt);
 if(f.camTo){const k=Math.min(1,dt*(f.camTo.rate||2));for(const key of ['x','y','vw'])if(f.camTo[key]!=null)f.cam[key]+=(f.camTo[key]-f.cam[key])*k;}
 f.dark+=((b.dark??0)-f.dark)*Math.min(1,dt*(b.darkRate||3));
 stepFx(f,dt);if(f.line)f.shown+=dt;const busy=b.until?!b.until(f):false,read=f.hold?f.ack:(!f.line||f.ack||f.shown>=need(f.line.text));
 if(read&&!busy&&(f.hold||f.bt>=(b.dur||0)||f.skip))next();else paint();}
function setCard(html,hold){const el=$('medicInfo');if(!el)return;if(!html){el.hidden=true;el.innerHTML='';return;}el.hidden=false;el.innerHTML=html+(hold?'<small class="medic-tap">TIPPEN ▸</small>':'');}
// Sprecher: Name und Figur (für die Spitze der Sprechblase)
function speaker(who){const f=film;if(f.cast?.[who])return typeof f.cast[who]==='function'?f.cast[who](f):f.cast[who];if(who==='s')return {name:smithName(),a:f.smith};if(who==='l')return {name:lanName(),a:f.lan};if(who==='m')return {name:'Arenamoderator',a:f.mod};
 if(who&&who[0]==='r'){const a=f.rec?.[+who.slice(1)-1];return {name:a?first(a.g):'Gladiator',a};}if(who==='rb')return {name:'Gladiator aus dem Hintergrund',a:f.rec?.[2]};
 if(who&&who[0]==='z'){const z=ZUSCH[+who.slice(1)-1];return {name:z?.[0]||'Zuschauer',a:{x:z?.[1]??470}};}return {name:''};}
function tailX(a){const f=film;if(!a)return 50;if(f.scene==='arena'||f.scene==='crowd')return Math.max(6,Math.min(94,(a.sx??a.x)/660*100));return Math.max(6,Math.min(94,((a.x-f.cam.x)/f.cam.vw+.5)*100));}
function paint(){const f=film;if(!f)return;const c=$('medicCanvas');if(!c?.getContext)return;const g=c.getContext('2d');g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;
 if(f.face)paintFace(g,c.width,c.height,f);else if(f.scene==='arena'||f.scene==='crowd')paintArena(g,c.width,c.height,f);else paintRoom(g,c.width,c.height,f);
 if(f.dark>.01){g.fillStyle='rgba(0,0,0,'+Math.min(1,f.dark)+')';g.fillRect(0,0,c.width,c.height);}
 const el=$('medicBubble');if(el){if(!f.line||f.line.who==='cap'){if(!el.hidden)el.hidden=true;}else{const s=speaker(f.line.who),key=s.name+'|'+f.line.text;if(el._key!==key){el._key=key;el.innerHTML='<b>'+esc(s.name)+'</b><span>'+esc(f.line.text)+'</span><i aria-hidden="true">▼</i>';el.classList.toggle('loud',/[!?]$/.test(f.line.text)&&f.line.text===f.line.text.toUpperCase());}
  if(el.hidden)el.hidden=false;const tail=Math.round(f.face?50:tailX(s.a)),wait=!!(f.hold||f.shown>=need(f.line.text)*.6);if(el._tail!==tail){el._tail=tail;el.style.setProperty('--tail',tail+'%');}if(el._wait!==wait){el._wait=wait;el.classList.toggle('waiting',wait);}}}
 const t=$('medicText'),s=f.line?speaker(f.line.who):null,txt=f.line?(f.line.who==='cap'?f.line.text:s.name+': „'+f.line.text+'“'):'';if(t&&t.textContent!==txt)t.textContent=txt;}
// Innenräume und Hof: Kamera über die 900 × 670 große Kulisse
function paintRoom(g,w,h,f){const VW=f.cam.vw,VH=VW*h/w,k=w/VW,cx=Math.max(VW/2,Math.min(W-VW/2,f.cam.x)),cy=Math.max(VH/2,Math.min(H-VH/2,f.cam.y)),sh=f.shake||0;
 g.fillStyle='#101b20';g.fillRect(0,0,w,h);g.save();g.translate((Math.random()-.5)*sh,(Math.random()-.5)*sh*.6);g.scale(k,k);g.translate(-(cx-VW/2),-(cy-VH/2));
 g.drawImage(f.bg?f.bg(f):f.scene==='yard'?yard():hospital(),0,0);if(f.scene==='yard'&&!f.bg)M.ludusOverlay?.(g,f.t);
 const list=[f.smith,f.lan,...(f.scene==='hosp'?f.rec||[]:[]),...(f.extras||[])].filter(a=>a&&!a.hidden),draws=list.map(a=>({y:a.y+(a.down?-6:0),fn:()=>drawActor(g,a)}));
 for(const p of f.props)if(!p.scene||p.scene===f.scene)draws.push(p);draws.sort((a,b)=>a.y-b.y);for(const d of draws)d.fn(g,f);
 drawFx(g,f);drawFloats(g,f,k);g.restore();}
// Arena: Ränge und Sand aus dem Spielstil, Figuren groß im Vordergrund
const ARENA_K=2.15;
function paintArena(g,w,h,f){const sh=f.shake||0;g.save();g.translate((Math.random()-.5)*sh,(Math.random()-.5)*sh*.6);
 const zoom=f.cam.vw?300/f.cam.vw:1,zx=f.cam.ax??330,zy=f.cam.ay??300;g.translate(zx,zy);g.scale(zoom,zoom);g.translate(-zx,-zy);
 ART.arena(g,w,h,f.t,{cheer:f.cheer,blood:f.blood});
 if(f.mod){const m=f.mod;g.fillStyle='#3b2c20';g.fillRect(304,148,52,26);g.fillStyle='#8f2f2a';g.fillRect(306,150,48,6);g.fillStyle='#b78d3c';for(let i=0;i<5;i++)g.fillRect(308+i*10,151,4,4);g.save();g.translate(330,150);g.scale(1.1,1.1);drawActor(g,{...m,x:0,y:0});g.restore();}
 const draws=[];if(f.rex)draws.push({y:f.rex.y,fn:()=>{const L=f.rex;ART.lion(g,L.L,{t:f.t,mood:L.mood||'focus',x:L.x,y:L.y,scale:L.scale||1.3,face:L.face||-1,actor:L.actor,seed:1});}});
 if(f.lan&&!f.lan.hidden){const a=f.lan;a.sx=a.ax;draws.push({y:a.ay,fn:()=>{g.save();g.translate(a.ax,a.ay);g.scale(ARENA_K,ARENA_K);drawActor(g,{...a,x:0,y:0});g.restore();}});}
 for(const p of f.props)if(p.scene==='arena')draws.push(p);draws.sort((a,b)=>a.y-b.y);for(const d of draws)d.fn(g,f);
 drawFx(g,f);g.restore();drawFloats(g,f,1);}
// Großaufnahme: Gesicht mit Mimik (M.faceShot), langsame Fahrt, Schrei-Linien
function paintFace(g,w,h,f){const F=f.face;if(F.paint){F.paint(g,w,h,f,f.t-F.t0);return;}const a=F.who==='s'?f.smith:F.who==='l'?f.lan:F.who==='m'?f.mod:F.actor,t=f.t-F.t0;if(!a){paintRoom(g,w,h,f);return;}
 M.faceShot.paint(g,w,h,{g:a.g,mood:F.mood||'calm',team:F.team||0,lines:F.lines||0,cheer:F.cheer,zoom:(F.zoom||1)*(1+(F.push||0)*Math.min(1,t/3)),shake:F.shake||0,yaw:F.yaw},t);}
// Partikel, Wurfgeschosse, Schriftzüge
function stepFx(f,dt){for(const p of f.fx){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=150*dt;if(p.z<=0&&p.vz<0)p.life=0;}f.fx=f.fx.filter(p=>p.life>0);for(const fl of f.floats)fl.t+=dt;f.floats=f.floats.filter(fl=>fl.t<1.8);f.shake=Math.max(0,(f.shake||0)-dt*6);for(const p of f.props)p.step?.(dt,f);f.props=f.props.filter(p=>!p.gone);}
function drawFx(g,f){for(const p of f.fx){g.fillStyle=p.color;g.fillRect(Math.round(p.x),Math.round(p.y-p.z),p.size||1,p.size||1);}}
function drawFloats(g,f,k){g.save();g.font='bold '+Math.round(14/Math.max(.5,k))+'px "Courier Prime",monospace';g.textAlign='center';for(const fl of f.floats){const a=fl.a,x=a?(a.ax??a.x):fl.x,y=(a?(a.ay??a.y)-(a.ay?130:62):fl.y)-fl.t*20+fl.dy;g.globalAlpha=Math.max(0,1-fl.t/1.8);g.fillStyle='#000';g.fillText(fl.text,x+1,y+1);g.fillStyle=fl.color;g.fillText(fl.text,x,y);}g.restore();}
const float=(f,a,text,color='#eee2c1',dy=0,x,y)=>f.floats.push({a,text,color,t:0,dy,x,y});
function dust(f,x,y,n,color='#c9b586'){for(let i=0;i<n;i++)f.fx.push({x:x+Math.random()*10-5,y,z:1+Math.random()*4,vx:(Math.random()-.5)*46,vy:(Math.random()-.5)*8,vz:10+Math.random()*22,life:.4+Math.random()*.4,size:1,color});}
// Eine Münze, die aus dem Beutel fällt und unter das Bett rollt
function coin(f,x,y,toX){const p={scene:'hosp',x,y,z:10,vz:30,vx:0,y0:y,phase:0,y:y,step(dt){if(this.z>0||this.vz>0){this.vz-=160*dt;this.z=Math.max(0,this.z+this.vz*dt);if(this.z===0&&this.vz<0){this.vz=-this.vz*.4;if(this.vz<6)this.vz=0;M.sound?.('coin');}}else if(this.x<toX){this.x+=34*dt;this.phase+=dt*14;}else this.gone=this.x>=toX&&this.t>4;this.t=(this.t||0)+dt;},fn(g){const w=Math.max(1,Math.round(Math.abs(Math.cos(this.phase))*3));g.fillStyle='#5a3f17';g.fillRect(Math.round(this.x)-1,Math.round(this.y-this.z)-2,w+2,4);g.fillStyle='#f0c94a';g.fillRect(Math.round(this.x),Math.round(this.y-this.z)-2,w,3);}};f.props.push(p);return p;}
// Ein Wurf im Bogen (Schwert zum Lanister, fauler Apfel aus den Rängen)
function toss(f,o){const p={scene:o.scene,t:0,y:o.y1,step(dt){this.t+=dt;const k=Math.min(1,this.t/o.dur);this.x=o.x0+(o.x1-o.x0)*k;this.y=o.y1;this.yy=o.y0+(o.y1-o.y0)*k-Math.sin(k*Math.PI)*o.arc;this.rot=k*(o.spin||10);if(k>=1&&!this.done){this.done=true;o.hit?.(f,this);if(!o.stay)this.gone=true;}},fn(g){g.save();g.translate(Math.round(this.x),Math.round(this.yy));g.rotate(this.rot);o.draw(g,this);g.restore();}};p.x=o.x0;p.yy=o.y0;f.props.push(p);return p;}
const drawSword=g=>{g.fillStyle='#c2cbc0';g.fillRect(-1,-14,3,18);g.fillStyle='#f4f6ea';g.fillRect(0,-14,1,16);g.fillStyle='#6e5230';g.fillRect(-4,4,9,2);g.fillRect(-1,6,3,6);};
const drawApple=g=>{g.fillStyle='#5a6b2a';g.fillRect(-4,-4,8,8);g.fillStyle='#7a5a2a';g.fillRect(-3,-3,3,3);g.fillStyle='#3e2a14';g.fillRect(0,-6,1,3);};

// ---------- Führung (Hinweis des Schmieds im Spiel) ----------
let guide=null;
function showGuide(lines,task){hideGuide();const box=document.createElement('div');box.className='hall-guide lion-guide lesson-guide';box.setAttribute('role','status');document.body.appendChild(box);guide={lines,task,i:0,box};renderGuide();
 box.addEventListener('click',()=>{if(!guide)return;if(guide.i<guide.lines.length){guide.i++;renderGuide();}});}
function renderGuide(){const G=guide;if(!G)return;if(G.i<G.lines.length){G.box.classList.remove('lion-taskbar');G.box.innerHTML=`<b>${esc(smithName())}</b><span>${esc(G.lines[G.i])}</span><small>Tippen für weiter</small>`;return;}
 G.box.classList.add('lion-taskbar');G.box.innerHTML=`<b>Aufgabe · ${esc(smithName())}</b><span>${esc(G.task)}</span>`;}
function hideGuide(){guide?.box?.remove();guide=null;document.body.classList.remove('lesson-goarena');}

// =====================================================================================================
// SZENEN
// =====================================================================================================
const say=(who,text,o)=>({who,say:text,...o});
// Verteilung der Rollen auf die fünf (passend zu dem, was der Medikus angerichtet hat)
function cast(){const list=recs();const legs=g=>['lt','rt','lsh','rsh','lf','rf'].some(k=>g.body[k].fracture||g.body[k].hp<60),armless=g=>['lua','rua','lfa','rfa','ls','rs'].some(k=>g.body[k].missing);
 const order=[...list];const pick=fn=>{const i=order.findIndex(fn);return i>=0?order.splice(i,1)[0]:order.shift();};
 const g1=pick(legs),g5=pick(armless),rest=order;return [g1,...rest.slice(0,3),g5].filter(Boolean);}
function hospFilm(beats,o={}){const gs=cast(),rec=gs.map((g,i)=>recActor(g,i)),sm=smithActor(372,450),ln=lanActor(436,456);if(o.lanArmed)arm(ln,'gladius');
 play({...o,scene:'hosp',smith:sm,lan:ln,rec,beats,cam:o.cam||{x:500,y:405,vw:300},tick:(f,dt)=>{for(const a of [f.smith,f.lan,...f.rec])walker(a,dt);for(const a of f.rec)applyRec(a,dt);o.tick?.(f,dt);}});
 for(const a of film.rec)applyRec(a,0);return film;}
const rage=(a,t=1.2)=>{a.shoutTimer=t;a.stagger=.4;};

// 1 · Der Lanister will endlich Kohle verdienen
function scene1(){setStage('s1');hospFilm([
 {dur:.8,cam:{x:470,y:418,vw:300}},
 say('l','So! Genug Unterricht! Genug Knochen! Genug Geschrei! Ich will jetzt endlich KOHLE verdienen!',{do:f=>{pose(f.lan,{a:Math.PI,traderPose:'rant',gest:0});rage(f.lan,2);},cam:{x:420,y:420,vw:200}}),
 say('s','Eine ausgezeichnete Idee. Ich bin sicher, die Jungs brennen darauf.',{do:f=>pose(f.smith,{a:0,forgePose:'sip'}),cam:{x:400,y:420,vw:190}}),
 say('l','Dann schick sie endlich in die Arena! Ich hab nicht fünf Männer gekauft, damit die hier den ganzen Tag faul herumliegen!',{do:f=>{pose(f.lan,{a:0,traderPose:'point',gest:0});rage(f.lan,2);},cam:{x:450,y:420,vw:230}}),
 {dur:1.8,cam:{x:580,y:400,vw:300,rate:1.2},do:f=>{pose(f.lan,{a:0});}},
 say('r1','Herr … ich kann meine Beine nicht bewegen.',{cam:{x:420,y:398,vw:150},do:f=>{f.rec[0].facePain=2;}}),
 say('r2','Ich schon. Aber nur, weil ich seine habe.',{cam:{x:506,y:398,vw:150},do:f=>{f.rec[1].sitUp=true;setTimeout(()=>{if(f.rec[1])f.rec[1].sitUp=false;},1600);}}),
 say('r3','Mir wurde vorhin erklärt, ich hätte eine fünfzigprozentige Überlebenschance.',{cam:{x:592,y:398,vw:150}}),
 say('s','Hattest du auch. Vorhin.',{cam:{x:400,y:420,vw:170},do:f=>pose(f.smith,{a:0,forgePose:'sip'})}),
 {dur:1.4,cam:{x:660,y:408,vw:150},do:f=>{const a=f.rec[3];a.standTry=true;a.stagger=1;setTimeout(()=>{if(a){a.standTry=false;a.hit=.3;a.facePain=2;dust(f,a.x,a.y,6);}},800);}},
 say('r4','Wir können doch so nicht kämpfen!',{cam:{x:660,y:408,vw:160}}),
 say('r5','Ich wäre schon froh, wenn ich wieder alleine scheißen könnte.',{cam:{x:700,y:414,vw:150},do:f=>{f.rec[4].stagger=.8;}}),
 {dur:.9,cam:{x:400,y:420,vw:170},do:f=>pose(f.smith,{a:0,traderPose:'inspect',gest:0})},
 say('s','Seht ihr? Alle noch bei Bewusstsein. Medizinisch betrachtet ein ausgesprochen enttäuschendes Ergebnis.',{do:f=>pose(f.smith,{a:0,forgePose:'sip'})}),
 {dur:.5}
],{label:'1 · Der Lanister will Kohle verdienen',done:scene2});}

// 2 · Der Lanister bemerkt, dass er pleite ist
function scene2(){setStage('s2');if(!st().keepGold)S.gold=Math.min(S.gold,1);hospFilm([
 {dur:.4,cam:{x:420,y:420,vw:200}},
 say('l','Dann kaufe ich eben fünf neue Idioten! Die Welt ist schließlich voll davon!',{do:f=>{pose(f.lan,{a:0,traderPose:'rant'});rage(f.lan,1.6);}}),
 {dur:1.3,cam:{x:440,y:440,vw:140},do:f=>pose(f.lan,{a:0,traderPose:'coins',gest:0})},
 {dur:3.2,cam:{x:480,y:430,vw:190,rate:1.4},do:f=>{coin(f,f.lan.x+8,f.lan.y+2,520);}},
 {dur:1.6,cap:1,do:f=>pose(f.lan,{a:0})},
 say('l','Wo … ist mein verdammtes Gold?',{cam:{x:436,y:430,vw:150},do:f=>{f.lan.facePain=1;}}),
 say('s','Ausgegeben.',{cam:{x:404,y:430,vw:150},do:f=>pose(f.smith,{a:0,forgePose:'sip'})}),
 {face:{who:'l',mood:'roar',lines:.7,zoom:1.15,shake:2},...say('l','WOFÜR?!')},
 {face:null,...say('s','Für fünf Gladiatoren, einen Haufen überteuerter Waffen und eine medizinische Vorführung, bei der du deine gesamte Belegschaft hast zerlegen lassen.',{cam:{x:410,y:425,vw:190},do:f=>pose(f.smith,{a:0,traderPose:'point',gest:0})})},
 say('l','Das war doch DEINE Idee!',{do:f=>{pose(f.lan,{a:Math.PI,traderPose:'point',gest:0});rage(f.lan);}}),
 say('s','Natürlich. Ich wollte sehen, was passiert. Du warst der Idiot, der dafür bezahlt hat.',{do:f=>pose(f.smith,{a:0,forgePose:'sip'})}),
 {dur:.8,do:f=>{f.smith.to=[402,452,26,0];}},
 {face:{who:'s',mood:'determined',zoom:1.1},...say('s','Hör zu, du kolossaler Vollidiot. Du kannst vielleicht selbst kämpfen. Aber ein Lanister muss vor allem eines können: RECHNEN!')},
 {face:null,...say('l','Ich kann rechnen!',{cam:{x:430,y:428,vw:170}})},
 say('s','Dann rechne mir das hier aus: Fünf Männer gekauft. Fünf Männer ausgerüstet. Fünf Männer ins Krankenhaus geprügelt.',{do:f=>pose(f.smith,{a:0,traderPose:'point',gest:0}),card:'<div class="medic-card lesson-ledger"><h4>RECHNUNG DES LANISTERS</h4><dl><dt>Fünf Gladiatoren</dt><dd>gekauft</dd><dt>Waffen</dt><dd>überteuert</dd><dt>Belegschaft</dt><dd>zerlegt</dd><dt>Arenasiege</dt><dd>0</dd><dt>Einnahmen</dt><dd>0 Gold</dd></dl></div>'}),
 say('s','Null Arenakämpfe gewonnen. Null Gold verdient. Wie nennt man das?'),
 say('l','Pech?',{card:null,do:f=>pose(f.lan,{a:Math.PI})}),
 {face:{who:'s',mood:'confident',zoom:1.05},...say('s','Wirklich beeindruckend. In einer Branche, in der selbst der Tod Gewinn bringt, hast du es geschafft, alles zu verlieren.')},
 {face:null,...say('s','Und jetzt liegen diese nutzlosen Säcke hier herum und brauchen eine Ewigkeit, bis sie wieder auf den Beinen sind.',{cam:{x:520,y:405,vw:280},do:f=>pose(f.smith,{a:0,traderPose:'point',gest:0})})},
 say('rb','Ich hab gehört, was du gesagt hast!',{cam:{x:592,y:398,vw:170},do:f=>{f.rec[2].facePain=2;f.rec[2].hit=.3;}}),
 say('s','Ausgezeichnet. Dann funktioniert wenigstens noch ein Körperteil.',{cam:{x:420,y:420,vw:200},do:f=>pose(f.smith,{a:0,forgePose:'sip'})}),
 {dur:.4}
],{label:'2 · Pleite',done:scene3,tick:(f,dt)=>{}});}

// 3 · Der Lanister verliert die Geduld
function scene3(){setStage('s3');hospFilm([
 {dur:.5,cam:{x:420,y:425,vw:200},do:f=>{pose(f.smith,{a:0});pose(f.lan,{a:Math.PI});f.smith.x=402;}},
 {dur:1.1,do:f=>{rage(f.lan,1.2);f.lan.facePain=.3;}},
 {face:{who:'l',mood:'roar',lines:1,zoom:1.25,push:.25,shake:3},...say('l','WEISST DU WAS?! DANN MACHE ICH ES EBEN SELBST!')},
 {face:null,...say('s','Eine hervorragende Idee. Soll ich schon ein Bett freimachen?',{cam:{x:410,y:425,vw:180},do:f=>pose(f.smith,{a:0,forgePose:'sip'})})},
 say('l','Ich brauche keine fünf neuen Idioten, um Gold zu verdienen! Ich gehe selbst in diese verdammte Arena!',{do:f=>{pose(f.lan,{a:Math.PI,traderPose:'rant'});rage(f.lan,2);}}),
 say('l','Da wartet doch noch dieser halb verhungerte, verkrüppelte Löwe!',{do:f=>pose(f.lan,{a:0,traderPose:'point',gest:0})}),
 say('s','Rex.',{do:f=>pose(f.smith,{a:0,forgePose:'sip'})}),
 say('l','Mir scheißegal, wie die Katze heißt! Ich hacke das Vieh in Stücke, kassiere mein Gold und kaufe mir eine neue Ladung dieser Nichtsnutze!',{do:f=>{pose(f.lan,{a:Math.PI,traderPose:'rant'});rage(f.lan,2);}}),
 say('l','Leih mir ein Schwert.',{cam:{x:425,y:430,vw:160},do:f=>pose(f.lan,{a:Math.PI,traderPose:'pull',gest:0})}),
 {dur:1,do:f=>pose(f.smith,{a:0,traderPose:'inspect',gest:0})},
 say('s','Wie du meinst.',{do:f=>pose(f.smith,{a:0,forgePose:'throw'})}),
 {dur:1.4,do:f=>{toss(f,{scene:'hosp',x0:f.smith.x+6,y0:f.smith.y-40,x1:f.lan.x-4,y1:f.lan.y,arc:36,dur:.8,spin:12,draw:drawSword,hit:(f)=>{arm(f.lan,'gladius');pose(f.lan,{a:Math.PI,state:'celebrate'});M.sound?.('block');f.shake=1.5;float(f,f.lan,'GEFANGEN','#f4d37a');}});pose(f.smith,{a:0});}},
 {dur:.6,do:f=>pose(f.lan,{a:Math.PI})},
 say('s','Pass nur auf. Du hast nicht mehr besonders viele Arme übrig, die du verlieren könntest.',{do:f=>pose(f.smith,{a:0,traderPose:'point',gest:0})}),
 {face:{who:'l',mood:'roar',lines:.8,zoom:1.2,shake:2},...say('l','HALT DIE FRESSE!')},
 {face:null,...say('s','Schon gut. Ich wollte nur verhindern, dass du später behauptest, ich hätte dich nicht ausreichend beraten.',{cam:{x:410,y:425,vw:200},do:f=>pose(f.smith,{a:0,forgePose:'sip'})})},
 {dur:.4}
],{label:'3 · Dann mache ich es eben selbst',lanArmed:false,done:stepArena});}

// 4 · Steuerung zurück: selbst in die Arena gehen und Rex auswählen
function stepArena(){setStage('go');try{M.ui.click('nav:home');}catch{}document.body.classList.add('lesson-goarena');
 showGuide(['Na los, großer Geschäftsmann. Die Arena wartet.','Und diesmal versuchst du vielleicht, etwas zu verdienen, bevor du wieder jemanden ruinierst.'],'Gehe in die ARENA (auf der Karte oben rechts) und wähle die Herausforderung REX.');}
const basePage=M.schoolPage;
M.schoolPage=function(p){const html=basePage?.apply(this,arguments);if(p!=='arena'||st().stage!=='go')return html;
 if(guide&&guide.i>=guide.lines.length){guide.box.querySelector('span').textContent='Wähle die Herausforderung REX. Du trittst allein an.';}
 return `<section class="box lion-card lesson-card"><p class="eyebrow">HERAUSFORDERUNG · NUR FÜR DEN LANISTER</p><h2>REX · DER AUSGEMUSTERTE KÖNIG</h2><p>Einst der Stolz königlicher Arenen. Jetzt ausgemustert, halb verhungert, der Hinterlauf zerschlagen. Der Veranstalter sucht jemanden, der dem Tier einen letzten Kampf liefert.</p><dl class="lesson-terms"><dt>Antreten</dt><dd>${esc(lanName())} allein · ohne Rüstung · ein Arm · ein geliehenes Schwert</dd><dt>Prämie</dt><dd>nach Laune des Publikums</dd></dl><div class="buttons"><button class="btn primary" type="button" data-action="lesson:rex">GEGEN REX ANTRETEN</button></div></section>`;};/* nur Rex: die alte Arena-Seite darunter ist ausgeblendet */
const baseClick=M.schoolClick;
M.schoolClick=function(a){if(a==='lesson:rex'&&st().stage==='go'){hideGuide();scene5();return true;}return baseClick?.apply(this,arguments);};

// 5 · Die monumentale Vorstellung
const REX={id:'rex-vetus',name:'Rex',kind:'alt',crippled:true,epithet:'Der ausgemusterte König',ageYears:15,stats:{kraft:40,tempo:40,zaeh:40,wild:62},condition:{health:60,blood:72,rear:30,hunger:90},wounds:[],scars:9,kills:613,fights:214};
function arenaFilm(beats,o={}){const lan=lanActor(0,0);arm(lan,'gladius');lan.ax=o.lanAt?.[0]??220;lan.ay=o.lanAt?.[1]??392;lan.a=0;
 const mod=extraActor('les-mod',{name:'Arenamoderator',appearance:{skin:'#d9b08a',hair:'#d8d4c8',style:3,beard:3,cloth:'#e6dccb'}});mod.sx=330;
 const rex=o.rex===false?null:{L:{...REX,condition:{...REX.condition}},x:470,y:392,scale:1.32,mood:'focus',face:-1};
 const smith=smithActor(0,0);
 play({...o,scene:'arena',lan,mod,rex,smith,beats,cam:{vw:300},tick:(f,dt)=>{o.tick?.(f,dt);}});return film;}
function scene5(){setStage('s5');arenaFilm([
 {dur:1.4,do:f=>{f.cheer=1;M.sound?.('crowd');f.rex.hidden=true;}},
 {face:{who:'l',mood:'confident',zoom:1,push:.2,cheer:1},...say('cap','Kein Panzer. Kein Schild. Ein Arm. Ein geliehenes Schwert.')},
 {face:null,...say('m','BÜRGER DER ARENA!',{do:f=>{f.cheer=1;f.cam={vw:300};},cam:{vw:300}})},
 say('m','HEUTE SEHT IHR EINEN MANN, DESSEN NAME EINST GANZE SCHLACHTFELDER ERZITTERN LIESS!',{do:f=>{f.cam.ax=220;f.cam.ay=330;},cam:{vw:230,rate:.8}}),
 say('m','EIN KRIEGER, DER ÜBER TAUSEND MÄNNER AUF DEM GEWISSEN HAT!',{do:f=>pose(f.lan,{a:0,state:'celebrate'})}),
 say('m','EIN MANN, DER SEINE FREIHEIT MIT BLUT ERKAUFTE!'),
 say('m','EIN MANN, DEM MAN EINEN ARM NAHM …',{do:f=>{f.cheer=0;pose(f.lan,{a:0});},cam:{vw:200,rate:1}}),
 {dur:1.3,cap:1},
 say('m','… ABER OFFENBAR NICHT SEINE ABSOLUTE UNFÄHIGKEIT, EIN VERNÜNFTIGES GESCHÄFT ZU FÜHREN!',{cam:{vw:300},do:f=>{f.cheer=1;M.sound?.('crowd');float(f,null,'HAHAHA!','#f4d37a',0,180,150);float(f,null,'HAHA!','#f4d37a',0,470,160);}}),
 {face:{who:'l',mood:'determined',zoom:1.1},...say('cap','Der Lanister blickt verärgert zum Moderator.')},
 {face:null,...say('m','HEUTE TRITT ER OHNE RÜSTUNG, MIT NUR EINEM ARM UND EINEM EINFACHEN SCHWERT GEGEN DIE BESTIE REX AN!',{cam:{vw:300},do:f=>{f.cheer=1;}})},
 say('m','DER GEFÜRCHTETE EINARMIGE LANISTER!',{do:f=>{pose(f.lan,{a:0,state:'celebrate'});M.sound?.('crowd');}}),
 {dur:1.2,do:f=>{f.rex.hidden=false;f.rex.x=560;f.rex.mood='walk';f.cam.ax=470;f.cam.ay=330;pose(f.lan,{a:0});},each:(f,dt)=>{f.rex.x=Math.max(470,f.rex.x-60*dt);},cam:{vw:210,rate:1}},
 say('m','UND IHM GEGENÜBER …',{do:f=>{f.rex.mood='fear';f.cheer=0;}}),
 say('m','EINST DER STOLZ KÖNIGLICHER ARENEN!'),
 say('m','EIN LÖWE, DER GENERATIONEN VON ZUSCHAUERN IN ANGST UND STAUNEN VERSETZTE!',{do:f=>{f.rex.mood='focus';}}),
 say('m','EINST EIN KÖNIG DER ARENA!'),
 say('m','JETZT AUSGEMUSTERT, HALB VERHUNGERT UND MIT EINEM BEIN SCHON IM GRAB!',{do:f=>{f.rex.mood='fear';}}),
 say('m','REX!',{cam:{vw:170,rate:1.5},do:f=>{f.rex.mood='proud';f.shake=4;M.sound?.('roar');}}),
 {dur:2.4,do:f=>{f.cheer=1;f.shake=3;M.sound?.('crowd');for(const [x,y] of [[120,140],[260,120],[420,135],[560,125]])float(f,null,'REX! REX!','#f29b83',0,x,y);},cam:{vw:300,rate:1}},
 say('m','MÖGEN DIE GÖTTER UNS EINEN UNVERGESSLICHEN KAMPF SCHENKEN!',{do:f=>{f.cam.ax=330;}}),
 {dur:.6}
],{label:'5 · Die Vorstellung',done:startFight});}

// 6 · Der Kampf: echtes Kampfsystem, Lanister mit Werten um 90 (nur in diesem Kampf)
function fighter(){const g=lanFigure();g.id='les-fighter-'+Date.now();g.name=lanName();g.role='Soldat';g.traits=[];g.enemy=false;const V=90;
 for(const k in g.stats)g.stats[k]=V;g.stats.morale=100;g.stats.will=100;for(const k in g.moves)g.moves[k]=V;if(g.mastery)for(const k in g.mastery)g.mastery[k]=V;for(const p of Object.values(g.body)){p.strength=V;p.agility=V;}
 g.fatigue=0;g.blood=100;g.enemyGear={weapon:item('gladius'),secondary:null,shield:null,armor:{}};g.history=[];g.lessonFighter=true;return g;}
let fightOut=null;
function startFight(){setStage('fight');fightOut=null;S.battle=null;try{M.ui.click('nav:home');}catch{}
 window.HahnArena?.resetScene?.();M.stains=[];M.limbs=[];M.swings=[];M.floaters=[];M.shake=0;for(const p of [...(M.fx||[]),...(M.shots||[])])p.active=false;
 const spec={title:'Rex',blue:[{kind:'human',key:'lan',row:'front',g:fighter()}],red:[{kind:'lion',key:'rex',row:'front',L:{...REX,condition:{...REX.condition}}}]};
 const b=AN.build(spec);b.lesson=true;b.opponent='Rex';b.league=0;S.battle=b;goldBefore=S.gold;
 AN.listeners.push(out=>{fightOut=out;pendingPay=true;});
 M.ui.render();}
let goldBefore=0,pendingPay=false;const PAY=3;
// Nach dem Kampf bucht das Spiel seine Prämie – hier zählt die Laune des Publikums
const baseFinish=M.onFinish;M.onFinish=function(report){if(pendingPay){pendingPay=false;S.gold=goldBefore+PAY;if(report)report.gold=PAY;if(S.lastReport)S.lastReport.gold=PAY;try{M.persist();}catch{}
 setTimeout(()=>{S.battle=null;try{M.ui.click('nav:home');}catch{}scene7();},400);return;}return baseFinish?.apply(this,arguments);};
// Den „Helden des Kampfes“ des Moderators lassen wir aus – gleich folgt die eigene Szene
{const base=M.fixedStep;M.fixedStep=function(){const b=S.battle;if(!b?.lesson||!b.finale)return base.apply(this,arguments);const had=document.body.classList.contains('bhud');document.body.classList.remove('bhud');try{return base.apply(this,arguments);}finally{if(had)document.body.classList.add('bhud');}};}

// 7 · Die Menge ist empört
const ZUSCH=[['Alter Zuschauer',140],['Zuschauer',250],['Zuschauer',420],['Zuschauer',530],['Zuschauer',190],['Zuschauerin',470],['Zuschauer',330],['Zuschauer',110],['Zuschauer',560],['Zuschauer',240],['Zuschauerin',390],['Zuschauer',600],['Zuschauer',170],['Zuschauer',450],['Zuschauerin',300],['Zuschauer',520]];
const fans=[];function fan(i){return fans[i]??=extraActor('les-fan'+i,{appearance:i===0?{hair:'#d8d4c8',beard:3,style:3}:{}});}
const zface=(i,mood,o={})=>({face:{actor:fan(i),mood,zoom:o.zoom||1.05,lines:o.lines||0,shake:o.shake||0,team:1},...say('z'+(i+1),o.text)});
function scene7(){setStage('s7');const won=!fightOut||fightOut.winner===0;arenaFilm([
 {dur:1.4,cam:{vw:220},do:f=>{f.cam.ax=300;f.cam.ay=330;deadRex(f);pose(f.lan,{a:0,state:'celebrate'});f.cheer=0;f.blood=1;}},
 {face:{who:'l',mood:'grin',zoom:1.05},...say('cap','Der Lanister reckt das Schwert. Er erwartet Jubel.')},
 {face:null,dur:2.4,...say('cap','Stille.'),cam:{vw:300}},
 zface(0,'shock',{text:'Das … das war REX?'}),
 zface(1,'scared',{text:'Der große Rex … der Schrecken der königlichen Arenen …'}),
 zface(2,'shock',{text:'Ich hab gesehen, wie dieses Tier einst zehn Gladiatoren gleichzeitig in die Flucht geschlagen hat!'}),
 zface(3,'roar',{text:'UND SO LÄSST MAN IHN ENDEN?!',lines:.5}),
 {face:null,dur:1,cam:{vw:300},do:f=>{boo(f,4);}},
 zface(4,'roar',{text:'DAS WAR KEIN KAMPF! DAS WAR EINE HINRICHTUNG!',lines:.6}),
 zface(5,'roar',{text:'EIN KÖNIG DER ARENA! UND IHR LASST IHN WIE EIN KRANKES STÜCK VIEH ABSCHLACHTEN?!',lines:.6}),
 zface(6,'roar',{text:'DIESER LÖWE HAT MEHR EHRE ALS DU, DU EINARMIGER BASTARD!',lines:.8,shake:2}),
 {face:null,dur:1.6,do:f=>{boo(f,8);M.sound?.('crowd');f.shake=2;}},
 {face:{who:'l',mood:'shock',zoom:1.05},...say('l','WAS ZUM TEUFEL IST EUER PROBLEM?! ICH HAB GEWONNEN!')},
 {face:null,...say('z8','DU HAST EINEN HALB TOTEN LÖWEN ERSCHLAGEN!'),do:f=>{boo(f,3);pose(f.lan,{a:0,traderPose:'rant'});rage(f.lan);}},
 say('l','ICH HAB AUCH NUR EINEN ARM!',{do:f=>{pose(f.lan,{a:0,traderPose:'point',gest:0});rage(f.lan);}}),
 say('z9','JA, ABER DER LÖWE HATTE WENIGSTENS ANSTAND!',{do:f=>{boo(f,5);}}),
 {dur:1.4,do:f=>{boo(f,6);toss(f,{scene:'arena',x0:520,y0:120,x1:f.lan.ax+6,y1:f.lan.ay-112,arc:40,dur:.9,spin:14,draw:drawApple,hit:(f)=>{f.shake=3;f.lan.hit=.3;f.lan.facePain=2;float(f,f.lan,'PATSCH','#9bb36a');M.sound?.('block');for(let i=0;i<8;i++)f.fx.push({x:f.lan.ax+Math.random()*12-6,y:f.lan.ay-104,z:0,vx:(Math.random()-.5)*60,vy:(Math.random()-.5)*20,vz:20+Math.random()*30,life:.6,size:2,color:i%2?'#5a6b2a':'#a58a4a'});}});}},
 say('z10','DER GROSSE REX HÄTTE EINEN EHRENHAFTEN LETZTEN KAMPF VERDIENT!'),
 say('z11','EIN WÜRDIGES ENDE FÜR EINE LEGENDE!'),
 say('z12','UND KEINEN SELBSTVERLIEBTEN IDIOTEN, DER EINEN KRANKEN LÖWEN VERPRÜGELT!',{do:f=>boo(f,4)}),
 {face:{who:'l',mood:'roar',lines:1,zoom:1.2,shake:3},...say('l','IHR SEID DOCH ALLE VOLLKOMMEN BESCHEUERT! DAS IST EINE VERDAMMTE ARENA! HIER STERBEN STÄNDIG LEUTE!')},
 zface(12,'roar',{text:'JA! ABER DOCH NICHT SO!',lines:.5}),
 zface(13,'roar',{text:'UND DAFÜR HABEN WIR GOLD BEZAHLT?!',lines:.5}),
 {face:null,...say('z15','TIERQUÄLER!'),do:f=>boo(f,4)},
 say('z16','ARSCHLOCH!',{do:f=>boo(f,4)}),
 {dur:3,do:f=>{f.chant=1;f.shake=2;M.sound?.('crowd');},each:(f,dt,t)=>{if(Math.floor(t*1.6)!==Math.floor((t-dt)*1.6))for(const x of [100,230,360,490,600])float(f,null,'SCHANDE!','#f29b83',0,x+Math.random()*30,150+Math.random()*30);},...say('cap','„SCHANDE! SCHANDE! SCHANDE!“')},
 say('l','SAG DENEN ENDLICH, DASS ICH GEWONNEN HABE!',{do:f=>{pose(f.lan,{a:0,traderPose:'point',gest:0});rage(f.lan);f.cam.ax=330;},cam:{vw:260}}),
 {dur:1.1,do:f=>pose(f.lan,{a:0})},
 say('m','Meine Damen und Herren … der Sieger dieses Kampfes ist …'),
 {dur:1.2,cap:1},
 say('m','… technisch gesehen der Lanister.',{do:f=>boo(f,6)}),
 {dur:1.2,do:f=>{boo(f,5);M.sound?.('crowd');}},
 say('m','Ein wahrhaft historischer Moment. Der legendäre Rex ist gefallen.'),
 {dur:1,cap:1},
 say('m','Nicht im heldenhaften Kampf gegen eine Armee …'),
 say('m','Nicht gegen einen ebenbürtigen Gegner …'),
 say('m','Sondern gegen einen arbeitslosen Einarmigen, der dringend Geld brauchte.',{do:f=>boo(f,8)}),
 {face:{who:'l',mood:'roar',lines:.9,zoom:1.25,push:.2,shake:2},...say('l','ICH HASSE EUCH ALLE!')},
 {face:null,...say('m','Aufgrund der außergewöhnlich niedrigen Spannung und der allgemeinen Empörung beträgt die Auszahlung …'),cam:{vw:300}},
 {dur:1.4,cap:1,card:`<div class="medic-card lesson-scroll"><h4>AUSZAHLUNG</h4><p>Siegprämie für ${esc(lanName())}</p><b>${PAY} GOLD</b><small>abzüglich der Würde des Veranstalters</small></div>`},
 say('m','… praktisch nichts.'),
 {face:{who:'l',mood:'shock',zoom:1.15,shake:1},...say('l','WAS?!')},
 {face:null,...say('m','Sie können sich glücklich schätzen. Normalerweise müssten Sie für diese Vorstellung das Eintrittsgeld zurückzahlen.'),card:null},
 {dur:2.6,do:f=>{boo(f,10);pose(f.lan,{a:Math.PI});f.lan.to=null;},each:(f,dt)=>{f.lan.ax-=28*dt;f.lan.state='move';f.lan.moveSpeed=10;f.lan.phase+=dt*6;},...say('cap',won?'Gedemütigt verlässt der Lanister die Arena. Hinter ihm: Buhrufe.':'Der Lanister verlässt die Arena.')},
 {dur:.8,dark:1,darkRate:3}
],{label:'7 · Schande!',rex:true,done:scene8});}
function deadRex(f){if(!f.rex)return;const a=ART.lionActor(f.rex.L);a.g.dead=true;a.deathAt=-10;a.wounds=[{part:'chest',x:22,y:-40,size:6,cut:true,phase:1},{part:'belly',x:-8,y:-33,size:5,cut:true,phase:2},{part:'head',x:42,y:-49,size:4,cut:true,phase:3}];f.rex.actor=a;f.rex.mood='idle';f.rex.x=500;}
function boo(f,n){for(let i=0;i<n;i++)float(f,null,['BUUUH!','BUH!','PFUI!','SCHANDE!'][i%4],i%2?'#f29b83':'#eee2c1',0,60+Math.random()*540,120+Math.random()*60);}

// 8 · Zurück beim Schmied: die wichtigste Lektion
function yardFilm(beats,o={}){const sm=smithActor(392,418),ln=lanActor(478,424);arm(ln,'gladius');ln.a=Math.PI;
 play({...o,scene:'yard',smith:sm,lan:ln,rec:cast().map((g,i)=>recActor(g,i)),beats,cam:o.cam||{x:430,y:410,vw:220},tick:(f,dt)=>{for(const a of [f.smith,f.lan,...f.rec])walker(a,dt);for(const a of f.rec)applyRec(a,dt);if(f.boos&&Math.random()<dt*1.4)float(f,null,['buuuh …','Schande …','Tierquäler!'][Math.floor(Math.random()*3)],'rgba(242,155,131,.8)',0,f.cam.x+(Math.random()-.5)*f.cam.vw*.8,f.cam.y-60);o.tick?.(f,dt);}});
 for(const a of film.rec)applyRec(a,0);return film;}
function scene8(){setStage('s8');yardFilm([
 {dur:.9,dark:0,do:f=>{f.dark=1;f.boos=true;f.lan.x=540;f.lan.to=[478,424,40,Math.PI];pose(f.smith,{a:0,forgePose:'sip'});}},
 {face:{who:'s',mood:'grin',zoom:1.05},...say('s','Na? Wie lief dein großer Geschäftsplan?')},
 {face:null,...say('l','ICH HAB DEN VERDAMMTEN LÖWEN BESIEGT!',{do:f=>{pose(f.lan,{a:Math.PI,traderPose:'rant'});rage(f.lan);}})},
 say('s','Hab ich gehört. Die Menge ist begeistert.',{do:f=>pose(f.smith,{a:0,forgePose:'sip'})}),
 {dur:1.4,cap:1,do:f=>{for(let i=0;i<3;i++)float(f,null,'BUUUH!','#f29b83',0,f.cam.x-60+i*60,f.cam.y-70);}},
 say('l','DIESE UNDANKBAREN BASTARDE!',{do:f=>{rage(f.lan);pose(f.lan,{a:Math.PI,traderPose:'rant'});}}),
 say('s','Du hast gerade die wichtigste Lektion des Arenageschäfts gelernt.',{do:f=>{f.smith.to=[414,420,24,0];}}),
 {face:{who:'s',mood:'determined',zoom:1.08},...say('s','Die Leute zahlen nicht dafür, dass du gewinnst.')},
 {face:{who:'s',mood:'confident',zoom:1.14,push:.15},...say('s','Sie zahlen dafür, dass sie nicht wissen, OB du gewinnst.')},
 {face:null,...say('l','Was soll das heißen?',{do:f=>pose(f.lan,{a:Math.PI})})},
 say('s','Wenn du einen legendären Veteranen gegen fünf Bauerntrampel antreten lässt, die gestern noch versucht haben, ihre Stiefel zu melken, interessiert das kein Schwein.',{do:f=>pose(f.smith,{a:0,traderPose:'rant',gest:0})}),
 say('s','Und wenn du eine alte, verletzte Legende wie Rex abschlachtest, bekommst du nicht mal Applaus. Du bekommst einen schlechten Ruf und einen faulen Apfel an den Kopf.',{do:f=>pose(f.smith,{a:0,traderPose:'point',gest:0})}),
 say('l','ICH HAB GEWONNEN!',{do:f=>rage(f.lan)}),
 say('s','Ja. Und wirtschaftlich war es trotzdem eine Niederlage. Beeindruckend, nicht wahr?',{do:f=>pose(f.smith,{a:0,forgePose:'sip'})}),
 say('s','Die Leute wollen Spannung. Gefahr. Helden. Und gelegentlich jemanden, der den Rest seines Lebens durch einen Strohhalm essen muss.',{cam:{x:440,y:405,vw:260},do:f=>pose(f.smith,{a:Math.PI,traderPose:'point',gest:0})}),
 say('l','Ich soll also absichtlich meine eigenen Männer verheizen?!',{do:f=>{rage(f.lan);pose(f.lan,{a:Math.PI,traderPose:'rant'});}}),
 {face:{who:'s',mood:'grin',zoom:1.08},...say('s','Nicht absichtlich. Wirtschaftlich.')},
 {face:null,dur:2.4,cam:{x:440,y:410,vw:220},do:f=>{f.smith.to=[500,440,24];},each:(f,dt,t)=>{if(t>1.2&&!f.smith.to&&f.smith.x>480)f.smith.to=[420,422,24,0];}},
 say('s','Natürlich musst du auf deine besten Kämpfer aufpassen. Einen legendären Veteranen ersetzt du schließlich nicht mit einem Sack Gold und drei Idioten vom Sklavenmarkt.'),
 say('s','Aber wenn du ausschließlich sichere Kämpfe bestreitest, verdient hier niemand etwas.',{do:f=>pose(f.smith,{a:0,traderPose:'coins',gest:0})}),
 say('l','Und wenn meine Leute sterben?',{do:f=>pose(f.lan,{a:Math.PI})}),
 {face:{who:'s',mood:'calm',zoom:1.05},...say('s','Dann war es wenigstens spannend.')},
 {face:null,dur:1.2,cap:1},
 say('s','Pass auf: Ein guter Lanister muss Risiken berechnen. Ein großartiger Lanister weiß, wie viel Gold ein Risiko wert ist.',{do:f=>pose(f.smith,{a:0,traderPose:'point',gest:0})}),
 say('s','Du musst lernen, welche Kämpfe du dir leisten kannst, welche du gewinnen kannst und bei welchen du besser rechtzeitig einen neuen Sklavenhändler bestellst.'),
 {dur:.9,do:f=>{f.smith.to=[452,424,22,0];}},
 say('s','Und glaub mir: Ein paar Opfer halten die Menge bei Laune.',{do:f=>pose(f.smith,{a:0,traderPose:'pat',gest:0}),cam:{x:462,y:412,vw:160}}),
 say('l','Du bist ein krankes Schwein.',{do:f=>pose(f.lan,{a:Math.PI})}),
 {face:{who:'s',mood:'grin',zoom:1.1},...say('s','Und trotzdem der Einzige hier, der rechnen kann.')},
 {face:null,dur:.5}
],{label:'8 · Die wichtigste Lektion',done:scene9});}

// 9 · Vollständig pleite – und der Schmied hat eine Idee
function scene9(){setStage('s9');yardFilm([
 {dur:1.2,do:f=>{f.boos=false;pose(f.smith,{a:0,forgePose:'sip'});f.smith.x=420;pose(f.lan,{a:Math.PI,traderPose:'coins',gest:0});},cam:{x:478,y:420,vw:150}},
 {dur:1.4,...say('cap','Der Lanister blickt auf seinen fast leeren Geldbeutel.'),card:`<div class="medic-card lesson-scroll"><h4>KASSE</h4><b>${'{GOLD}'} GOLD</b><small>alles, was übrig ist</small></div>`.replace('{GOLD}',String(Math.max(0,S.gold)))},
 {scene:'hosp',card:null,dur:1.4,cam:{x:560,y:400,vw:300,rate:1},...say('cap','Dann in Richtung Krankenhaus. Dort liegen weiterhin seine fünf schwer verletzten Gladiatoren.')},
 say('r2','Herr … bekommen wir heute noch etwas zu essen?',{cam:{x:506,y:398,vw:150},do:f=>{f.rec[1].sitUp=true;}}),
 {scene:'yard',...say('s','Nur wenn du deine Suppe selbst halten kannst.'),cam:{x:440,y:415,vw:170},do:f=>pose(f.smith,{a:0,forgePose:'sip'})},
 {scene:'hosp',dur:1.4,cam:{x:506,y:398,vw:150},do:f=>{f.rec[1].sitUp=false;},...say('cap','Der Gladiator lässt den Arm wieder sinken.')},
 {scene:'yard',dur:1.1,cam:{x:452,y:418,vw:170},do:f=>{pose(f.lan,{a:Math.PI,traderPose:'inspect',gest:0});f.lan.facePain=1.5;}},
 say('l','Also … ich bin komplett pleite.',{do:f=>pose(f.lan,{a:Math.PI})}),
 say('l','Meine Gladiatoren sind schwer verletzt.',{do:f=>pose(f.lan,{a:0,traderPose:'point',gest:0})}),
 say('l','Ich kann keine neuen Männer kaufen.',{do:f=>pose(f.lan,{a:Math.PI,traderPose:'coins',gest:0})}),
 {face:{who:'l',mood:'terror',zoom:1.1,shake:1},...say('l','WIE ZUM TEUFEL SOLL ICH JETZT WEITERMACHEN?!')},
 {face:null,dur:2,cam:{x:430,y:410,vw:150},do:f=>pose(f.smith,{a:0})},
 {face:{who:'s',mood:'calm',zoom:1.05},dur:1.2,...say('cap','Der Schmied schaut ihn schweigend an.')},
 {face:{who:'s',mood:'grin',zoom:1.1,push:.3},dur:2,...say('cap','Langsam formt sich ein breites, hinterhältiges Grinsen.')},
 {face:{who:'s',mood:'grin',zoom:1.25,push:.3},...say('s','Tja …')},
 {face:{who:'s',mood:'grin',zoom:1.45,push:.4},dur:1.4,cap:1},
 {face:{who:'s',mood:'grin',zoom:1.6,push:.6},...say('s','Da hätte ich vielleicht eine Idee.')},
 {face:{who:'s',mood:'grin',zoom:1.9,push:.6},dur:2.4,dark:1,darkRate:1.2}
],{label:'9 · Pleite',done:theEnd});}
function theEnd(){setStage('end');hideGuide();const v=document.createElement('div');v.className='medic-end lesson-end';
 v.innerHTML=`<div><p class="eyebrow">ENDE DIESES TUTORIALABSCHNITTS</p><h2>DIE TEUERSTE LEKTION DES LANISTERS</h2><ul><li>Das Publikum zahlt für Spannung, nicht für sichere Siege.</li><li>Wer nur sichere Kämpfe bestreitet, verdient kaum etwas.</li><li>Wer alles riskiert, verliert seine besten Männer.</li><li>Ein guter Lanister rechnet: Welche Kämpfe kann ich mir leisten, welche gewinnen, welche nicht?</li></ul><p class="tiny">Fortsetzung folgt.</p><div class="buttons">${TEST&&M.huehner?'<button class="btn primary" type="button" data-les="ch2">WEITER: DIE HÜHNERSCHULE DES GRAUENS ▸</button>':''}${TEST?'<button class="btn'+(M.huehner?'':' primary')+'" type="button" data-les="again">NOCH EINMAL VON VORN</button><button class="btn" type="button" data-les="menu">SZENE WÄHLEN</button>':'<button class="btn primary" type="button" data-les="close">WEITER: DIE HÜHNERSCHULE DES GRAUENS ▸</button>'}</div></div>`;document.body.appendChild(v);}

// =====================================================================================================
// ABLAUF, ÜBERSPRINGEN, SZENENWAHL (Testversion)
// =====================================================================================================
const SCENES=[['Der Lanister will Kohle verdienen',scene1],['Pleite',scene2],['Dann mache ich es eben selbst',scene3],['Selbst in die Arena gehen',stepArena],['Die Vorstellung',scene5],['Der Kampf gegen Rex',startFight],['Schande!',scene7],['Die wichtigste Lektion',scene8],['Pleite – und eine Idee',scene9]];
function skipScene(){const f=film;if(!f)return;const done=f.done;stopFilm();done?.();}
function clearAll(){stopFilm();hideGuide();document.querySelectorAll('.lesson-end,.lesson-menu,.lesson-start').forEach(e=>e.remove());if(S.battle?.lesson){S.battle=null;}}
function jump(n){clearAll();try{M.ui.click('nav:home');}catch{}SCENES[n-1][1]();}
function menu(){document.querySelector('.lesson-menu')?.remove();const v=document.createElement('div');v.className='medic-menu lesson-menu';v.innerHTML=`<div><header><b>SZENENWAHL · TESTVERSION</b><button class="btn small" type="button" data-les="closemenu">✕</button></header><p class="eyebrow">KAPITEL 1 · DIE TEUERSTE LEKTION</p><ol>${SCENES.map(([t],i)=>`<li><button class="btn" type="button" data-les="jump:${i+1}">${i+1} · ${esc(t)}</button></li>`).join('')}</ol>${M.huehner?`<p class="eyebrow">KAPITEL 2 · DIE HÜHNERSCHULE DES GRAUENS</p><ol>${M.huehner.scenes.map(([t],i)=>`<li><button class="btn" type="button" data-les="jump2:${i+1}">${i+1} · ${esc(t)}</button></li>`).join('')}</ol>`:''}<p class="tiny">Jede Szene startet mit den fünf Verletzten aus dem Medikus-Kapitel. Nichts wird gespeichert.</p></div>`;document.body.appendChild(v);}
document.addEventListener('click',e=>{const el=e.target.closest?.('[data-les]');if(!el)return;const [a,v]=el.dataset.les.split(':');
 if(a==='start'){document.querySelector('.lesson-start')?.remove();scene1();}
 else if(a==='menu'){document.querySelector('.lesson-end')?.remove();document.querySelector('.lesson-start')?.remove();menu();}
 else if(a==='closemenu')el.closest('.lesson-menu')?.remove();
 else if(a==='jump'){document.querySelector('.lesson-menu')?.remove();jump(+v);}
 else if(a==='again'){clearAll();prepare();scene1();}
 else if(a==='close'){el.closest('.lesson-end')?.remove();if(!TEST)M.huehner?.begin();}
 else if(a==='offeryes'){el.closest('.lesson-start')?.remove();S.lesson={stage:'ready',keepGold:true};try{M.persist();}catch{}scene1();}
 else if(a==='offerno'){el.closest('.lesson-start')?.remove();}
 else if(a==='ch2'){clearAll();M.huehner?.start();}
 else if(a==='jump2'){document.querySelector('.lesson-menu')?.remove();clearAll();M.huehner?.jump(+v);}});
// eigener Takt für Film und Führung (läuft auf jeder Seite)
let last=performance.now();(function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;if(film)stepFilm(dt);})(last);
// Vorbereitung: Spielstand direkt nach dem Medikus-Kapitel (fünf Verletzte, Schmied, Lanister mit einem Arm)
function prepare(){if(S.medic&&!Array.isArray(S.medic.order))S.medic.order=[];S.lanista={...(S.lanista||{}),lostArm:'r'};try{M.ludus.rebuild?.();}catch{}
 if(M.medic&&!recs().length){M.medic.prepare(13);}S.medic.stage='done';S.gold=Math.max(0,Math.min(S.gold,40));}
function startCard(){const v=document.createElement('div');v.className='medic-start lesson-start';v.innerHTML=`<div><p class="eyebrow">ARENA THEORY · TESTVERSION</p><h1>DIE TEUERSTE LEKTION · DIE HÜHNERSCHULE</h1><p>Kapitel 1: Krankenhaus, leere Kasse, ein geliehenes Schwert – und Rex. Kapitel 2: ein Hahnenschild, eine verrückte Hühnerhändlerin, das Beastrium und drei Hähne gegen einen Idioten.</p><div class="buttons"><button class="btn primary" type="button" data-les="start">KAPITEL 1 · DIE TEUERSTE LEKTION</button><button class="btn primary" type="button" data-les="ch2">KAPITEL 2 · DIE HÜHNERSCHULE DES GRAUENS</button><button class="btn" type="button" data-les="menu">SZENE WÄHLEN</button></div><p class="tiny">Eigenständige Vorschau mit flüchtigem Spielstand. Das Hauptspiel und deine Spielstände bleiben unberührt. Derber schwarzer Humor.</p></div>`;document.body.appendChild(v);}
/* M.lesson ist im Spiel bereits die Lehrstunden-Funktion der Trainer (school.js: M.lesson(g,waffe)). Nicht überschreiben,
   sonst bricht der Tageswechsel ab (Händler, Herumtreiber, Schmied). Die Kapitel-Schnittstelle hängt an dieser Funktion. */
{const api={scenes:SCENES,jump,menu,prepare,state:st,get film(){return film;},stepFilm,startFight,PAY,REX,clearAll,
 kit:{play,stopFilm,skipScene,setCard,smithActor,lanActor,extraActor,arm,pose,walker,drawActor,float,dust,toss,rage,showGuide,hideGuide,yard,speaker,need,ARENA_K,get guide(){return guide;}}},base=M.lesson;M.lesson=typeof base==='function'?Object.defineProperties(function(){return base.apply(this,arguments);},Object.getOwnPropertyDescriptors(api)):api;};
if(TEST){prepare();startCard();}
// ---------- Im Spiel: Start nach dem Medikus-Kapitel, Fortsetzen nach dem Neuladen ----------
// Neu abgeschlossenes Medikus-Kapitel → die Lektion beginnt von selbst (wie erzählt: Gold bis auf einen Rest weg).
// Spielstände, die das Medikus-Kapitel schon früher abgeschlossen hatten, bekommen eine Einladung und behalten ihr Gold.
else{const RESUME={s1:scene1,s2:scene2,s3:scene3,go:stepArena,s5:scene5,fight:scene5,s7:scene7,s8:scene8,s9:scene9};let medicSeen=S.medic?.stage,resume=true,offered=false;
 setInterval(()=>{const med=S.medic?.stage;if(medicSeen!=='done'&&med==='done'&&!S.lesson?.stage){S.lesson={stage:'ready'};try{M.persist();}catch{}}medicSeen=med;
  if(S.doktor?.armed&&!S.doktor?.stage)return; /* erst kommt das Doktor-Kapitel (doktor.js) */
  if(film||S.battle||window.ArenaUI?.isOpen?.()||M.ui.getPage?.()!=='home'||document.querySelector('.lesson-end,.lesson-start,.medic-end,.medic-film,.medic-start,.lion-film,.smith-ceremony,.mg-dawn,.hs-market,.hs-present'))return;
  const ls=S.lesson?.stage;if(ls==='ready'){scene1();return;}
  if(resume){resume=false;if(RESUME[ls]){RESUME[ls]();return;}}
  if(!ls&&med==='done'&&!offered&&!S.huehner?.stage){offered=true;const v=document.createElement('div');v.className='medic-start lesson-start';v.innerHTML=`<div><p class="eyebrow">NEUES KAPITEL</p><h1>DIE TEUERSTE LEKTION DES LANISTERS</h1><p>Die Geschichte geht weiter: Krankenhaus, leere Kasse, ein geliehenes Schwert und Rex. Danach: Die Hühnerschule des Grauens.</p><div class="buttons"><button class="btn primary" type="button" data-les="offeryes">JETZT SPIELEN</button><button class="btn" type="button" data-les="offerno">SPÄTER</button></div><p class="tiny">Dein Gold bleibt erhalten. „Später“ fragt beim nächsten Laden wieder.</p></div>`;document.body.appendChild(v);}},1200);}
window.LESSON_READY=true;
})();
