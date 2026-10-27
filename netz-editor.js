'use strict';
/* Wurfnetz-Editor (netz-editor.html): baut mit AN.build (arena-core.js) einen Kampf Netzwerfer gegen Mensch, Hund oder Löwe,
   startet ihn neu, zeigt Zustand und Fangzeit, malt die Bildfolge (netz-art.js über den Figurenrenderer des Spiels).
   Ändert keinen Spielstand: Der Speicher des Spiels wird hier gar nicht geladen, M.persist ist abgeschaltet. */
(()=>{
const M=window.MG,S=M.s,$=id=>document.getElementById(id),AN=window.AN,DOG=window.DOG;
if(!M||!AN||!M.netArt){window.onerror?.('Spielmodule unvollständig geladen','netz-editor',0);return;}
M.persist=()=>true;S.options=S.options||{};S.options.sound=false;S.options.music=false;S.options.speed=1;
const QN=(M.qualityNames?.net)||['Flickennetz','Fangnetz','Arenanetz','Jägernetz','Kettennetz','Silbernetz','Fatum – Schicksalsnetz'];
const nf=(v,d=1)=>Number(v).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d});
for(let q=0;q<=6;q++)$('q').insertAdjacentHTML('beforeend',`<option value="${q}"${q===2?' selected':''}>${q} · ${QN[q]||'Netz'}</option>`);
for(const b of (DOG?.BREEDS||[]))$('breed').insertAdjacentHTML('beforeend',`<option value="${b.id}"${b.id==='mastiff'?' selected':''}>${b.name||b.id}</option>`);
const val=id=>$(id).value;
function syncInputs(){const t=val('target');$('strL').hidden=t!=='human';$('breedL').hidden=t!=='dog';$('strV').textContent=val('str');}

// ---------- Kampf bauen ----------
function human(team,q){const rng=S.rng,g=M.makeGladiator(3,team===1);S.rng=rng;g.role='Soldat';g.name=team?'Ziel':'Netzwerfer';
 const net=M.makeItem('weapon','net',q,'metal'),glad=M.makeItem('weapon','gladius',2,'metal');
 g.enemyGear={weapon:team?glad:net,secondary:team?null:glad,shield:null,armor:{}};return g;}
let run=null;
function build(){const q=+val('q'),t=val('target');S.battle=null;M.shots?.forEach?.(p=>p.active=false);
 const thrower=human(0,q);thrower.stats.precision=80;thrower.stats.tactics=60;
 let red;if(t==='human'){const g=human(1,2);g.stats.strength=+val('str');red={kind:'human',g,key:'z'};}
 else if(t==='dog'){const D=DOG.create(val('breed'));D.name=D.name||'Hund';red={kind:'dog',D,key:'z'};}
 else{red={kind:'lion',L:{id:'ed'+Date.now(),name:'Löwe',epithet:'',age:6,stats:{kraft:60,tempo:55,zaeh:55,wild:50},condition:{health:100,blood:100,rear:100,hunger:20},scars:[],wins:0,kills:0,fights:0},key:'z'};}
 const b=AN.build({blue:[{kind:'human',g:thrower,key:'w'}],red:[red],title:'Netz-Editor'});
 const w=b.actors.find(a=>a.team===0),z=b.actors.find(a=>a.team===1);w.x=330;w.y=390;z.x=t==='lion'?620:580;z.y=390;w.a=0;z.a=Math.PI;
 b.time=b.startTime=0;b.editor=true;S.battle=b;run={b,w,z,t0:performance.now(),caught:null,freed:null,shot:false,end:0};M.stains.length=0;M.netArt.ground.length=0;}
function restart(){build();S.options.speed=+val('spd');}
$('go').onclick=restart;
$('pause').onclick=()=>{const b=S.battle;if(!b)return;b.paused=!b.paused;$('pause').textContent=b.paused?'▶ Weiter':'⏸ Pause';};
$('spd').onchange=()=>{S.options.speed=+val('spd');};
for(const id of ['target','q','str','breed'])$(id).addEventListener('input',()=>{syncInputs();times();restart();});

// ---------- Überwachen: Zustand, Ende, Wiederholen ----------
function tick(){const r=run;if(!r||S.battle!==r.b){return;}const b=r.b,w=r.w,z=r.z;
 if(val('follow')==='0'&&w.ammo===0){w.target=null;w.cool=9;w.state='idle';}
 const shot=(M.shots||[]).find(p=>p.active&&p.kind===8);if(shot)r.shot=true;
 if(z.netTimer>0&&!r.caught)r.caught={at:b.time,dur:z.netMax};
 if(r.caught&&!(z.netTimer>0)&&!r.freed)r.freed=b.time;
 const missed=r.shot&&!shot&&!r.caught&&w.ammo===0;
 const done=z.g.dead||z.down||r.freed&&b.time-r.freed>2.2||missed&&!r.end||b.time>18;
 if(done&&!r.end)r.end=performance.now();
 if(r.end&&performance.now()-r.end>1400&&$('loop').checked)restart();
 const left=z.netTimer>0?z.netTimer:0,dur=z.netMax||r.caught?.dur||0;
 $('hud').innerHTML=`<span>Zeit <b>${nf(b.time-b.startTime)} s</b></span>`
  +`<span>Netz: <b>${shot?'fliegt':w.ammo>0?'in der Hand':r.caught?(left>0?'gefangen':'zerrissen'):missed?'verfehlt':'–'}</b></span>`
  +`<span>Im Netz <span class="bar"><i style="width:${dur?Math.round(left/dur*100):0}%"></i></span> <b>${nf(left)} / ${nf(dur)} s</b></span>`
  +`<span>Ziel: <b>${z.g.dead?'tot':z.down?'am Boden':z.dog?(DOG.health(z)|0)+' %':z.lion?(window.Beasts.health(z)|0)+' %':(M.health(z.g)|0)+' %'}</b></span>`
  +(r.freed?`<span>Losgerissen nach <b>${nf(r.freed-r.caught.at)} s</b></span>`:'');}
setInterval(tick,100);
// Kamera: auf Werfer und Ziel (Mitte, folgt weich)
const cam={x:520,y:380};M.battleCamera=(b)=>{if(!b?.editor||!run)return null;const z=+val('zoom');if(z<=1.01)return null;const tx=(run.w.x+run.z.x)/2,ty=(run.w.y+run.z.y)/2-30;cam.x+=(tx-cam.x)*.08;cam.y+=(ty-cam.y)*.08;return {zoom:z,x:cam.x,y:cam.y};};

// ---------- Fangzeiten aller Güten ----------
function times(){const P=[['schwach (20)',20],['mittel (50)',50],['stark (80)',80],['Hund 30 kg',DOGPOW(30)],['Hund 80 kg',DOGPOW(80)],['Löwe',55]];const q0=+val('q');
 let h='<table><tr><th>Netz</th>'+P.map(p=>'<th>'+p[0]+'</th>').join('')+'</tr>';
 for(let q=0;q<=6;q++){const it=M.makeItem('weapon','net',q,'metal');it.rolls={...(it.rolls||{}),damage:1};h+=`<tr><td${q===q0?' class="on"':''}>${q} · ${QN[q]}</td>`+P.map(p=>`<td${q===q0?' class="on"':''}>${nf(M.netDuration(it,p[1]))}</td>`).join('')+'</tr>';}
 $('times').innerHTML=h+'</table>';}
function DOGPOW(kg){return Math.max(10,Math.min(90,20+kg*.6));}

// ---------- Bildfolge ----------
const FR=[['Flug 10 %',0,.1],['Flug 35 %',0,.35],['Flug 65 %',0,.65],['Flug 95 %',0,.95],['gefangen',1,.04],['zerrt',1,.35],['windet sich',1,.62],['Maschen reißen',1,.86],['rutscht ab',1,.97]];
const fg=human(1,2);fg.name='Gefangener';
function frames(){const box=$('frames');box.innerHTML=FR.map((f,i)=>`<figure><canvas width="150" height="130" data-fr="${i}"></canvas><figcaption>${f[0]}</figcaption></figure>`).join('');}
function paintFrames(){const q=+val('q'),now=S.battle?.time??performance.now()/1000;
 for(const cv of document.querySelectorAll('[data-fr]')){const f=FR[+cv.dataset.fr],g=cv.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#2b2a22';g.fillRect(0,0,cv.width,cv.height);g.fillStyle='#3a382c';g.fillRect(0,96,cv.width,34);
  try{if(f[1]===0){const dist=120,p={active:true,kind:8,x:15+dist*f[2],y:80,z:16,startX:15,startY:80-12,travel:dist*f[2],flightRange:dist,rotation:0,vx:1,vy:0,team:0,snapshot:{w:{item:{q}}}};M.netArt.flight(g,p);}
   else{const dur=3,a={g:fg,x:75,y:112,a:0,state:'idle',energy:100,ammo:0,phase:0,moveSpeed:0,id:'frame-'+cv.dataset.fr,netTimer:dur*(1-f[2]),netMax:dur,netQ:q,netAt:now-(f[2]<.06?.12:1)};g.save();g.scale(1.25,1.25);g.translate(-15,-22);M.renderLudusActors(g,[a]);g.restore();}}catch(e){if(!cv._err){cv._err=1;console.error(e);}}}
 requestAnimationFrame(paintFrames);}
syncInputs();times();frames();restart();requestAnimationFrame(paintFrames);
})();
