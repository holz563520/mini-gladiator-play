'use strict';
// =====================================================================================================
// STURZ-EDITOR (sturz-editor.html): echte Figuren (sim.js + arena.js über den Benchmark, isolierte Kopie,
// kein Speichern). Links die neue Bewegung (sturz-fx.js), rechts dieselbe Person mit der bisherigen
// (a.fallFxOff). Beide sind gehaltene Vorführfiguren (a.puppet.hold): die Seite setzt Sturz-, Aufsteh- und
// Taumelzeiten selbst aus einer Zeitleiste – deshalb lässt sich jeder Ablauf Bild für Bild durchgehen.
// Tod und „Echter Kampf“ laufen über die Spielfunktionen in Echtzeit.
// =====================================================================================================
(()=>{
const M=window.MG,S=M.s,F=M.fallFx,$=id=>document.getElementById(id),cl=(x,a,b)=>Math.max(a,Math.min(b,x));
const MELEE=M.weaponDefs.filter(w=>!w.ammo&&w.id!=='net'),WD=Object.fromEntries(M.weaponDefs.map(w=>[w.id,w])),SH=M.shieldDefs;
if(M.blockContact)M.blockContact.active=true;if(M.hitContact)M.hitContact.active=true;if(M.reachAI)M.reachAI.active=true;
M.benchmarkTimeLimit=1e9;M.sound=()=>{};
const fill=(sel,list,none)=>{sel.innerHTML=(none?'<option value="none">kein Schild</option>':'')+list.map(x=>`<option value="${x.id}">${x.name}</option>`).join('');};
fill($('w0'),MELEE);fill($('s0'),SH,true);$('w0').value='gladius';$('s0').value=SH.some(s=>s.id==='roundshield')?'roundshield':'none';
function sync(){const two=WD[$('w0').value].twoHand;$('s0').disabled=two;if(two)$('s0').value='none';}

// ---------------------------------------------------------------- Abläufe
const PRE=.7,FALL_LIE=2.4,RISE=1.8,POST=.9;
const SC=[
 {id:'back',name:'Sturz nach hinten, Aufstehen',sub:'Niederschlag, liegt auf dem Rücken, steht auf',kind:'kd',face:0},
 {id:'front',name:'Sturz nach vorn, Aufstehen',sub:'Niederschlag, liegt auf dem Bauch, steht auf',kind:'kd',face:Math.PI},
 {id:'hold',name:'Aufstehen mit Verschnaufen',sub:'bleibt angeschlagen auf einem Knie, dann hoch',kind:'kd',face:0,hold:1.4},
 {id:'downB',name:'Kampfunfähig aus dem Stand',sub:'bricht zusammen, fällt nach hinten',kind:'down',face:0,from:'stand'},
 {id:'downF',name:'Kampfunfähig aus dem Stand',sub:'bricht zusammen, fällt nach vorn',kind:'down',face:Math.PI,from:'stand'},
 {id:'downK',name:'Kampfunfähig aus dem Knien',sub:'kniet schon, kippt um',kind:'down',face:0,from:'knee'},
 {id:'stagL',name:'Taumeln',sub:'harter Treffer, 1,6 Sekunden',kind:'stag',face:0,dz:.25,len:1.6},
 {id:'stagH',name:'Taumeln, schwer benommen',sub:'Schädeltreffer, 3 Sekunden',kind:'stag',face:0,dz:1.1,len:3},
 {id:'dHeart',name:'Tod: Stich in die Brust',sub:'greift zur Brust, Knie, fällt nach hinten · Echtzeit',kind:'death',face:0,cause:'Tödlicher Stich: Brust',part:'chest'},
 {id:'dGut',name:'Tod: Bauchwunde',sub:'sinkt auf die Knie, fällt vornüber · Echtzeit',kind:'death',face:0,cause:'Innere Verletzungen',part:'belly'},
 {id:'dSkull',name:'Tod: Schädel zertrümmert',sub:'fällt sofort schlaff nach hinten · Echtzeit',kind:'death',face:0,cause:'Tödliche Schädelverletzung durch Streitkolben',part:'head'},
 {id:'fight',name:'Echter Kampf, 3 gegen 3',sub:'Spiel-KI, alle mit der neuen Bewegung · Echtzeit',kind:'fight'}];
const BY=Object.fromEntries(SC.map(s=>[s.id,s]));
const lenOf=sc=>sc.kind==='kd'?PRE+FALL_LIE+RISE+(sc.hold||0)+POST:sc.kind==='down'?PRE+1+1.8:sc.kind==='stag'?PRE+sc.len+POST:6;
$('scenes').innerHTML=SC.map(s=>`<button data-s="${s.id}">${s.name}<small>${s.sub}</small></button>`).join('');
$('scenes').onclick=e=>{const id=e.target.closest('button')?.dataset.s;if(id)start(id);};

// Kampfende abfangen (alle liegen → der Benchmark würde enden)
const realEnd=M.endBenchmark;let mine=false;M.endBenchmark=(w,r)=>{if(mine)return realEnd(w,r);return null;};
function stop(){if(S.battle?.benchmark){mine=true;try{realEnd(-1,'Editor');}catch{}mine=false;}}

let cur=BY.back,pair=[],base=[],tau=0,playing=true,last=0,zoomI=1,deathAt=0,dead=false,narrow=false;
// Bildausschnitt in Feldeinheiten (nicht als Faktor): so sind die Figuren auf dem Handy genauso groß im Bild wie am PC.
// Schmales Bild (Handy hochkant): neu oben, bisher unten – nebeneinander wären sie winzig (Thomas 11.11. „sehe nichts“).
const VIEW={wide:[560,400,270],narrow:[380,290,200]},ZN=['weit','mittel','nah'];const viewW=()=>VIEW[narrow?'narrow':'wide'][zoomI];
const timeline=()=>cur.kind!=='death'&&cur.kind!=='fight';
// Taumeln: Weg nur auf dieser Seite verstellbar (im Spiel gilt „wie im Spiel“, solange Thomas nichts anderes freigibt)
const STAG0={b:M.T.stagSpeedBase,d:M.T.stagSpeedDaze};
function start(id){cur=BY[id]||cur;stop();sync();{const k=+$('stagWay').value||1;M.T.stagSpeedBase=STAG0.b*k;M.T.stagSpeedDaze=STAG0.d*k;}tau=0;dead=false;deathAt=performance.now()+900;
 for(const b of $('scenes').children)b.classList.toggle('on',b.dataset.s===cur.id);
 const fight=cur.kind==='fight';
 const cfg={count:fight?3:1,count0:fight?3:2,count1:fight?3:1,role0:'Soldat',role1:'Soldat',weapon0:$('w0').value,weapon1:fight?'spear':'gladius',shield0:$('s0').value,shield1:fight?'roundshield':'none',armor0:$('a0').value,armor1:fight?'leather':'none',quality0:2,quality1:2,seed:fight?Math.floor(Math.random()*1e6):4242};
 const err=M.startBenchmark(cfg);if(err){$('info').textContent='Fehler: '+err;return;}
 const b=S.battle;M.benchmarkFinale=false;b.paused=false;S.options.speed=1;S.options.closeups='off';S.options.sound=false;
 M.tweenOff=!fight&&cur.kind!=='death';F.active=fight?$('fxOn').checked:true;
 $('tlBox').style.visibility=timeline()?'':'hidden';for(const k of ['back','fwd'])$(k).disabled=!timeline();
 narrow=innerWidth<700;
 if(fight){pair=[];M.battleCamera=(bb,width,height,W,H)=>{const z=W/(viewW()*1.7),L=bb.actors.filter(a=>!a.g.dead&&!a.down),A=L.length?L:bb.actors,x=A.reduce((n,a)=>n+a.x,0)/A.length,y=A.reduce((n,a)=>n+a.y,0)/A.length-15;return {zoom:z,x:cl(x,W/(z*2),W-W/(z*2)),y:cl(y,H/(z*2),H-H/(z*2))};};info();return;}
 const G=M.roundField?.()?M.fieldGeom():{cx:M.arenaSize().width/2,cy:M.arenaSize().height/2,rx:M.arenaSize().width*.42,ry:M.arenaSize().height*.36};
 const [nu,old]=b.actors.filter(a=>a.team===0),foe=b.actors.find(a=>a.team===1);
 // gleiche Person in beiden Hälften (gleiche Werte, gleiche Ausrüstung) – nur die Bewegung unterscheidet sich
 old.g=JSON.parse(JSON.stringify(nu.g));old.g.id=(nu.g.id||'g')+'-alt';old.fallFxOff=true;
 const show=$('cmp').checked,dx=show&&!narrow?88:0,dy=show&&narrow?44:0;base=[{x:G.cx-dx,y:G.cy-dy},show?{x:G.cx+dx,y:G.cy+dy}:{x:G.cx+G.rx*3,y:G.cy+G.ry*3}];pair=[nu,old];
 for(const [i,a] of pair.entries()){a.x=base[i].x;a.y=base[i].y;a.a=cur.face;a.puppet={hold:true};a.gaitOff=true;a.energy=200;a.seed=7;}
 foe.x=G.cx+G.rx*3;foe.y=G.cy-G.ry*3;foe.puppet={hold:true};foe.gaitOff=true;
 M.focus?.(null);
 M.battleCamera=(bb,width,height,W,H)=>{const z=W/viewW(),x=G.cx-(cur.kind==='stag'?30:24),y=G.cy-(narrow&&show?36:24);return {zoom:z,x:cl(x,W/(z*2),W-W/(z*2)),y:cl(y,H/(z*2),H-H/(z*2))};};
 apply();info();}

function idle(a,i){Object.assign(a,{down:false,fallTimer:0,fallDuration:0,kneeTimer:0,stagger:0,staggerMax:0,riseHold:0,state:'idle',moveSpeed:0,gaitSpeed:0,fxDown:null,daze:0,hit:0,stun:0,wind:0,swing:0,x:base[i].x,y:base[i].y,a:cur.face,phase:0,animationClock:tau});a.fallSide=Math.cos(a.a)>=0?-1:1;}
// Zeitleiste → Zustand beider Figuren (dieselben Felder, die sonst der Kampf setzt)
function apply(){const b=S.battle;if(!b||!timeline()||!pair.length)return;const sc=cur,el=tau-PRE;
 for(const [i,a] of pair.entries()){idle(a,i);if(el<0&&!(sc.kind==='down'&&sc.from==='knee'))continue;
  if(sc.kind==='kd'){const D=FALL_LIE+RISE,h=sc.hold||0,t0=FALL_LIE+RISE*.54;a.fallDuration=D;a.riseDuration=RISE;
   let ft;if(el<t0)ft=D-el;else if(h&&el<t0+h){ft=RISE*.46;a.riseHold=t0+h-el;}else ft=D-(el-h);
   if(ft<=0)continue;a.fallTimer=ft;a.state=ft<RISE?'rising':'fallen';}
  else if(sc.kind==='down'){if(el<0){a.kneeDuration=10;a.kneeTimer=5;a.state='knee';continue;}
   a.down=true;a.state='down';a.fxDown={t:b.time-el,from:sc.from,len:F.P.down};}
  else if(sc.kind==='stag'){if(el>=sc.len)continue;const T=M.T,dz=sc.dz,L=sc.len,seed=1,rate=T.stagStepRate+dz*T.stagStepDaze;
   // wie im Kampf (sim.js): Stolperschritte in Stoßrichtung mit Schlingern, vorwärts nur im Moment des Schritts
   let x=0,y=0;const ph=rate*el,H=1/240;/* letzter Teilschritt anteilig – sonst rückt die Figur je nach Bildtakt ungleich vor (Zittern) */for(let t=0;t<el;t+=H){const h=Math.min(H,el-t),k=(L-t)/L,sp=(T.stagSpeedBase+dz*T.stagSpeedDaze)*(.3+.7*k),dir=Math.PI+Math.sin(t*4.2+seed)*.95,burst=Math.pow(Math.abs(Math.sin(rate*t)),1.6)*T.stagBurst;x+=Math.cos(dir)*sp*burst*h;y+=Math.sin(dir)*sp*burst*h;}
   const k=(L-el)/L,sp=(T.stagSpeedBase+dz*T.stagSpeedDaze)*(.3+.7*k);
   Object.assign(a,{stagger:L-el,staggerMax:L,staggerDir:Math.PI,staggerSeed:seed,state:'stagger',daze:dz,moveSpeed:Math.max(sp,26),gaitSpeed:Math.max(sp*1.6,30),phase:ph,x:base[i].x+x,y:base[i].y+y});}}}

// Tod in Echtzeit über die Spielfunktion (todes-fx.js bestimmt den Ablauf, sturz-fx.js die Bewegung des Fallens)
function kill(){dead=true;for(const a of pair){if(a.g.dead)continue;const p=a.g.body[cur.part];if(p){p.hp=0;p.bleed=(p.bleed||0)+12;}try{M.death(a,cur.cause,null);}catch(e){console.error(e);}}}

// ---------------------------------------------------------------- Bedienung
function setPlay(v){playing=v;$('play').textContent=playing?'⏸ Pause':'▶ Weiter';if(!timeline()&&S.battle)S.battle.paused=!playing;}
$('play').onclick=()=>setPlay(!playing);
$('again').onclick=()=>{start(cur.id);setPlay(true);};
$('back').onclick=()=>{setPlay(false);tau=Math.max(0,tau-1/60);apply();};
$('fwd').onclick=()=>{setPlay(false);tau=Math.min(lenOf(cur),tau+1/60);apply();};
$('tl').oninput=()=>{setPlay(false);tau=$('tl').value/1000*lenOf(cur);apply();};
$('zoom').onclick=()=>{zoomI=(zoomI+1)%3;$('zoom').textContent='Zoom: '+ZN[zoomI];};
$('speed').onchange=()=>{if(!timeline())S.options.speed=+$('speed').value;};
for(const id of ['w0','s0','a0','cmp','stagWay'])$(id).addEventListener('change',()=>start(cur.id));
$('fxOn').onchange=()=>{if(cur.kind==='fight')F.active=$('fxOn').checked;};

function stageName(){const sc=cur,el=tau-PRE;if(sc.kind==='kd'){const p=pair[0];if(el<0)return 'steht';if(!p||!(p.fallTimer>0))return 'steht wieder';const st=F.state(p);return st?.kind==='fall'?'stürzt · '+Math.round(st.p*100)+' %':st?.kind==='rise'?(st.hold?'verschnauft auf dem Knie':'steht auf · '+Math.round(st.p*100)+' %'):'liegt';}
 if(sc.kind==='down'){if(el<0)return sc.from==='knee'?'kniet':'steht';const st=pair[0]&&F.state(pair[0]);return st?.kind==='fall'?'bricht zusammen · '+Math.round(st.p*100)+' %':'liegt, kampfunfähig';}
 if(sc.kind==='stag')return el<0?'steht':el<sc.len?'taumelt':'steht wieder';return '';}
function info(){$('info').textContent=cur.kind==='fight'?'Echter Kampf mit der Spiel-KI. Mit dem Haken „Echter Kampf: neue Bewegung“ schaltest du im laufenden Kampf zwischen neu und bisher um.':cur.kind==='death'?'Der Tod läuft in Echtzeit über die Spielfunktionen. Den Ablauf bis zum Fallen bestimmt wie bisher die Todesart; neu ist die Bewegung des Fallens selbst. „Von vorn“ spielt es noch einmal.':(narrow?'Oben neu, unten bisher.':'Links neu, rechts bisher.')+' Regler ziehen oder „◀ Bild / Bild ▶“ für einzelne Bilder (je 1/60 Sekunde).';}

const lab=$('labels'),lx=lab.getContext('2d');
function labels(){const c=$('arenaCanvas'),V=M.arenaView;if(lab.width!==c.width||lab.height!==c.height){lab.width=c.width;lab.height=c.height;}lx.clearRect(0,0,lab.width,lab.height);if(!S.battle||!V||!pair.length)return;
 const fs=Math.max(12,Math.round(lab.width/60));lx.font=`700 ${fs}px "Courier Prime",monospace`;lx.textAlign='center';
 for(const [i,a] of pair.entries()){if(i&&!$('cmp').checked)continue;const sx=(base[i].x-V.cx)*V.scale+V.width/2,sy=(base[i].y-V.cy)*V.scale+V.height/2-a.g.height/180*1.14*92*V.scale,t=i?'BISHER':'NEU';
  lx.fillStyle='#000a';const w=lx.measureText(t).width+12;if(narrow){const y=(base[i].y-V.cy)*V.scale+V.height/2-a.g.height/180*1.14*40*V.scale;lx.fillRect(6,y-fs,w,fs+6);lx.fillStyle=i?'#c9c3ad':'#dfb66d';lx.fillText(t,6+w/2,y);continue;}lx.fillRect(sx-w/2,sy-fs,w,fs+6);lx.fillStyle=i?'#c9c3ad':'#dfb66d';lx.fillText(t,sx,sy);}}

function tick(now){requestAnimationFrame(tick);const dt=Math.min(.05,(now-last)/1000||0);last=now;
 if(timeline()){if(playing){tau+=dt*+$('speed').value;if(tau>lenOf(cur))tau=0;}apply();$('tl').value=Math.round(tau/lenOf(cur)*1000);$('tlV').textContent=tau.toFixed(2).replace('.',',')+' s';}
 else if(cur.kind==='death'&&!dead&&now>deathAt)kill();
 $('hudL').innerHTML=`<b>${cur.name}</b>`;$('hudR').textContent=stageName();labels();}

$('rules').innerHTML=[
 '<em>Sturz nach hinten</em>: Der Oberkörper wird zurückgeworfen und der vordere Fuß löst sich. Es folgt ein Stolperschritt nach hinten, die Arme rudern. Dann geben die Knie nach, er setzt sich und fängt sich mit den Händen hinter dem Körper ab. Er rollt auf den Rücken, die Beine schlagen hoch, der Kopf schlägt nach. Vorher kippte die ganze Figur in 0,3 Sekunden als starres Brett um.',
 '<em>Sturz nach vorn</em>: Vorlage, kleiner Stolperschritt, die Knie schlagen auf. Die Hände fangen den Fall ab, die Ellbogen geben nach, die Brust setzt auf und er rutscht ein Stück aus.',
 '<em>Aufstehen</em>: Aus der Rückenlage stützt er sich hinten auf, setzt sich auf, zieht ein Bein unter den Körper und greift zur Waffe. Aus der Bauchlage drückt er sich mit beiden Händen hoch und schiebt die Hüfte zurück auf die Knie. In beiden Fällen kommt er auf ein Knie, stützt die Hand auf das vordere Knie und stemmt sich hoch. Vorher sprang die Figur aus dem Liegen in eine halb aufgerichtete Haltung.',
 '<em>Verschnaufen</em>: Wer angeschlagen ist und beim Aufstehen hängen bleibt, wartet sichtbar im Kniestand und atmet schwer.',
 '<em>Kampfunfähig</em>: Wer im Stehen oder Knien kampfunfähig wird, bricht jetzt schlaff zusammen. Vorher lag er von einem Bild auf das nächste am Boden.',
 '<em>Tod</em>: Wie lange einer noch steht oder kniet, bestimmt weiter die Todesart. Das Fallen danach läuft über die neuen Bilder, schlaff und ohne Abfangen.',
 '<em>Schritte beim Taumeln</em>: Ein Fuß wird langsam neben den anderen gesetzt, dann der andere nachgezogen, etwa ein Schritt je Sekunde. Der stehende Fuß bleibt auf seinem Fleck am Boden. Wie weit er dabei torkelt, bestimmt das Spiel; mit „Taumeln: Weg“ kannst du hier ausprobieren, wie es mit weniger Weg aussieht.',
 '<em>Taumeln</em>: Füße und Becken bleiben unter dem Körper. Der Oberkörper pendelt über der Hüfte, die Knie sind weich, der Kopf hängt nach und die Arme halten breit das Gleichgewicht. Vorher stand der ganze Körper bis zu 17 Grad schräg und die Hände zitterten.',
 '<em>Waffe und Schild</em> bleiben bis zum Aufprall in der Hand und liegen erst dann am Boden. Beim Aufstehen nimmt er sie im Kniestand wieder auf.',
 '<em>Jedes Bild wird gezeichnet</em>: Solange einer fällt oder aufsteht, wird er nicht mehr aus dem Zwischenspeicher kopiert. Auf schwächeren Geräten liefen diese Bewegungen vorher mit 15 Bildern je Sekunde.',
 'Alles ist nur Darstellung. Würfel, Schaden, Sturz- und Aufstehzeiten bleiben unverändert. Im Spiel aktiv seit 11.11. (<code>boot.js</code> lädt <code>sturz-fx.js</code>). Die Auswahl „Taumeln: Weg“ wirkt nur hier; im Spiel gilt „wie im Spiel“.'].map(x=>`<li>${x}</li>`).join('');
start('back');requestAnimationFrame(tick);
window.SturzEditor={start,set(t){setPlay(false);tau=t;apply();},len:()=>lenOf(cur),pair:()=>pair,scenes:SC};
})();
