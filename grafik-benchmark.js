'use strict';
// =====================================================================================================
// GRAFIK-BENCHMARK (grafik-benchmark.html): Misst, ob Kämpfe an der Grafik oder an der Kampfberechnung hängen.
// Echter Benchmarkkampf (benchmark.js, isolierte Kopie, kein Speichern) mit unveränderter Kampflogik.
// Die Darstellung wird nur über den Anschluss M.renderTest in arena.js umgeschaltet (im Spiel nie gesetzt):
//   full  = Figuren wie im Spiel, box = farbige Kästen, none = gar nichts zeichnen (nur Kampfberechnung).
// Messwerte kommen aus der Spielschleife selbst (M.benchmarkSample: Logik-ms, Zeichen-ms, Bilder, Spielzeit).
// Darunter eine Galerie aller Kampffiguren mit den Zeichnern des Spiels (Vergleich für spätere neue Grafiken).
// =====================================================================================================
(()=>{
const M=window.MG,S=M.s,$=id=>document.getElementById(id);
const RT={actor:null,none:false,arena:true,effects:true,uncapped:true,stage:'',liveFps:15,liveCopy:'bitmap',split:{stage:0,ground:0,actors:0,rest:0,frames:0}};M.renderTest=RT;
const TEAM=['#55938e','#b7694f'],TEAM_DARK=['#2f5754','#6b3a2c'];
const cl=(x,a,b)=>Math.max(a,Math.min(b,x));
let mode='full',paused=false;

// ---------------------------------------------------------------- Ersatzdarstellung: Kasten je Kämpfer
// Ein Rechteck in Teamfarbe (Höhe nach Körpergröße), heller Streifen = Blickrichtung, Balken = Blut.
// Am Boden oder tot: flacher Kasten. Tiere: breiter, niedriger Kasten.
function drawBox(ctx,a){
 const g=a.g||{},team=a.team?1:0,beast=!!(a.rex||a.dog||a.hahn),dead=!!g.dead,down=dead||a.down||a.fallTimer>0;
 const x=Math.round(a.x),y=Math.round(a.y-(a.z||0)),face=Math.cos(a.a||0)>=0?1:-1;
 ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(x-11,y-2,22,4);
 if(down){ctx.fillStyle=dead?'#4a4038':TEAM_DARK[team];ctx.fillRect(x-22,y-9,44,9);return true;}
 const h=beast?22:Math.round(50*(g.height||180)/180),w=beast?36:16;
 ctx.fillStyle=TEAM[team];ctx.fillRect(x-w/2,y-h,w,h);
 ctx.fillStyle='#f1e6c4';ctx.fillRect(face>0?x+w/2-4:x-w/2,y-h+3,4,beast?6:10);
 const blood=cl((g.blood??100)/100,0,1);ctx.fillStyle='#000';ctx.fillRect(x-10,y-h-6,20,3);ctx.fillStyle=blood>.5?'#8fc28a':blood>.25?'#d9b25e':'#e0705f';ctx.fillRect(x-10,y-h-6,Math.round(20*blood),3);
 return true;
}

function applyMode(m){
 mode=m;RT.simple=m==='simple';RT.none=m==='none';RT.actor=m==='box'?drawBox:null;RT.arena=$('arena').checked;RT.effects=$('fx').checked;RT.stage=$('stage').value;RT.liveFps=parseInt($('live').value)||0;RT.liveCopy=/b$/.test($('live').value)?'bitmap':'';
 document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('on',b.dataset.mode===m));
}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{applyMode(b.dataset.mode);live.reset();});
$('arena').onchange=$('fx').onchange=$('stage').onchange=$('live').onchange=()=>{applyMode(mode);live.reset();};

// ---------------------------------------------------------------- Kampf starten / beenden
const realEnd=M.endBenchmark;let mine=false,ended=false;
M.endBenchmark=(w,r)=>{if(mine)return realEnd(w,r);ended=true;return null;};// Sieg: Seite startet den Kampf selbst neu
function stop(){if(S.battle?.benchmark){mine=true;try{realEnd(-1,'Grafik-Benchmark');}catch(e){}mine=false;}}
let count=5,seed=4711;
function start(n=count){
 count=n;stop();ended=false;
 const err=M.startBenchmark({count:n,count0:n,count1:n,role0:'mixed',role1:'mixed',weapon0:'class',weapon1:'class',shield0:'auto',shield1:'auto',armor0:'auto',armor1:'auto',quality0:2,quality1:2,seed:seed++,league:0});
 if(err){$('meter').textContent='Fehler: '+err;return false;}
 const b=S.battle;b.paused=paused;M.benchmarkFinale=false;S.options.speed=1;S.options.closeups='off';
 applyView();return true;
}
function applyView(){const z=+$('view').value,b=S.battle;if(!b)return;const a=b.actors.find(x=>!x.g.dead&&x.team===0)||b.actors[0];M.focus?.(z>1?a?.id:null);M.setZoom?.(z);}
/* „Immer 60“: Bildrate fest auf 60 und volle Auflösung (das Spiel deckelt ab 60 Kämpfern auf 30 Bilder/s und senkt die Auflösung, das würde den Vergleich verdecken) */
function applyFps(){const v=+$('fps').value||0;RT.uncapped=v===60;if(M.fpsGovernor){M.fpsGovernor.fixed=v;M.fpsGovernor.reset?.();}if(S.battle){M.resetBenchmarkRender?.();applyView();}}
$('count').onchange=()=>{start(+$('count').value);live.reset();};
$('view').onchange=()=>{applyView();live.reset();};
$('fps').onchange=()=>{applyFps();live.reset();};
$('restart').onclick=()=>{start(+$('count').value);live.reset();};
$('pause').onclick=()=>{paused=!paused;if(S.battle)S.battle.paused=paused;$('pause').textContent=paused?'▶ Weiter':'⏸ Pause';live.reset();};

// ---------------------------------------------------------------- Messung (aus der Spielschleife)
function meter(){
 const m={wall:0,iter:0,frames:0,sim:0,paint:0,game:0,costs:[],battle:null,lastT:0,sp0:null};
 const spNow=()=>({...RT.split});
 m.reset=()=>{Object.assign(m,{wall:0,iter:0,frames:0,sim:0,paint:0,game:0,costs:[],battle:null,lastT:0,sp0:spNow()});};m.sp0=spNow();
 m.add=(wallMs,simMs,paintMs,painted)=>{const b=S.battle;if(!b||b.paused)return;
  if(m.battle!==b.id){m.battle=b.id;m.lastT=b.time||0;}else{m.game+=Math.max(0,(b.time||0)-m.lastT);m.lastT=b.time||0;}
  m.wall+=wallMs;m.iter++;m.sim+=simMs;if(painted){m.frames++;m.paint+=paintMs;m.costs.push(simMs+paintMs);}};
 /* Logik in ms je 1/60 s Kampfzeit: vergleichbar, egal wie viele Bilder ausfallen (dann holt die Schleife mehrere Schritte je Bild nach) */
 m.result=()=>{const s=m.wall/1000,c=[...m.costs].sort((a,b)=>a-b);return {fps:s?m.frames/s:0,sim:m.game>.05?m.sim/(m.game*60):0,paint:m.frames?m.paint/m.frames:0,tempo:s?m.game/(s*(S.options.speed||1)):0,p95:c[Math.floor(c.length*.95)]||0,secs:s,split:(()=>{const a=m.sp0||{},b=RT.split,n=Math.max(1,b.frames-(a.frames||0)),d=k=>(b[k]-(a[k]||0))/n;return {stage:d('stage'),ground:d('ground'),actors:d('actors'),rest:d('rest')};})()};};
 return m;
}
const live=meter();let windowAt=0,series=null;
const baseSample=M.benchmarkSample;
M.benchmarkSample=(wallMs,simMs,paintMs,painted,steps,dropped)=>{try{baseSample?.(wallMs,simMs,paintMs,painted,steps,dropped);}catch(e){}live.add(wallMs,simMs,paintMs,painted);series?.m.add(wallMs,simMs,paintMs,painted);};

const fmt=(v,d=1)=>v.toFixed(d).replace('.',',');
const cls=(v,good,mid)=>v>=good?'ok':v>=mid?'mid':'bad';
function meterText(r){const b=S.battle,alive=b?[0,1].map(t=>b.actors.filter(a=>a.team===t&&!a.g.dead).length):[0,0],q=M.renderMetrics?.()?.quality;
 return `<b>${b?b.actors.length:0} Kämpfer</b> · ${{full:'volle Figuren',simple:'einfache Figuren',box:'Kästen',none:'nichts gezeichnet'}[mode]}<br>`+
  `Bilder/s <span class="${cls(r.fps,50,30)}">${fmt(r.fps,0)}</span> · Spieltempo <span class="${cls(r.tempo*100,95,80)}">${fmt(r.tempo*100,0)} %</span><br>`+
  `Logik ${fmt(r.sim)} ms · Zeichnen ${fmt(r.paint)} ms · <span class="${cls(-(r.sim+r.paint),-16.7,-33)}">zusammen ${fmt(r.sim+r.paint)}</span><br>`+
  (mode==='none'?'':`<span style="color:#d8cdb4">Kulisse ${fmt(r.split.stage)} · Boden ${fmt(r.split.ground)} · Figuren ${fmt(r.split.actors)} · Rest ${fmt(r.split.rest)}</span><br>`)+
  `<span style="color:#a99f97">stehen ${alive[0]}:${alive[1]}${q&&q<1?' · Auflösung '+Math.round(q*100)+' %':''}</span>`;}
setInterval(()=>{
 if(window.GB_ERR?.length)return;/* Fehler bleibt sichtbar */
 if(ended&&!series?.hold){start(count);}
 const now=performance.now();if(now-windowAt>=1000){const r=live.result();if(r.secs>.3)$('meter').innerHTML=meterText(r);else if(!S.battle)$('meter').textContent='kein Kampf';live.reset();windowAt=now;}
},200);

// ---------------------------------------------------------------- Messreihe
const SIZES=[5,10,20,50,100],MODES=[['full','Volle Figuren'],['simple','Einfache Figuren'],['box','Kästen'],['none','Nichts']];
const results={};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function runSeries(){
 if(series)return;$('series').disabled=true;$('copy').disabled=true;for(const k in results)delete results[k];renderTable();$('verdict').innerHTML='';
 const keep={mode,count,view:$('view').value,fps:$('fps').value,stage:$('stage').value,arena:$('arena').checked,live:$('live').value};$('stage').value='';$('arena').checked=true;$('live').value='15b';$('view').value='1';$('fps').value='60';applyFps();
 const total=SIZES.length*MODES.length;let done=0;series={m:meter(),hold:false};
 try{
  for(const n of SIZES)for(const [m,label] of MODES){
   $('progress').textContent=`Messe ${n} gegen ${n}, ${label} … (${done+1}/${total})`;
   applyMode(m);$('count').value=String(n);paused=false;$('pause').textContent='⏸ Pause';start(n);
   let r=null;for(let tries=0;tries<2;tries++){if(tries)start(n);await wait(2000);series.m.reset();await wait(6000);r=series.m.result();if(r.secs>=3&&r.fps>0)break;$('progress').textContent+=' – keine Bilder gemessen, wiederhole';}
   (results[n]||={})[m]=r;done++;renderTable();
  }
  $('progress').textContent='Fertig. '+device();verdict();$('copy').disabled=false;
 }finally{series=null;$('series').disabled=false;$('view').value=keep.view;$('fps').value=keep.fps;applyFps();$('count').value=String(keep.count);$('stage').value=keep.stage;$('arena').checked=keep.arena;$('live').value=keep.live;applyMode(keep.mode);start(keep.count);live.reset();}
}
$('series').onclick=runSeries;
// ---------------------------------------------------------------- Kulisse-Test: dieselbe Szene (5 gegen 5, Kästen) mit vier Kulissen-Varianten
const STAGES=[['plain','alte Art',true],['bitmap','als Bitmap (jetzt im Spiel)',true],['screen','vorverkleinert (Test)',true],['','ohne Kulisse',false]];
const stageResults=[];
async function runStageTest(){
 if(series)return;$('series').disabled=$('stagetest').disabled=true;stageResults.length=0;renderStage();
 const keep={mode,count,view:$('view').value,fps:$('fps').value,stage:$('stage').value,arena:$('arena').checked};$('view').value='1';$('fps').value='60';applyFps();series={m:meter(),hold:false};
 try{for(let i=0;i<STAGES.length;i++){const [st,label,arena]=STAGES[i];$('stageprog').textContent=`Messe Kulisse ${label} … (${i+1}/${STAGES.length})`;
   $('stage').value=st;$('arena').checked=arena;applyMode('box');$('count').value='5';start(5);
   let r=null;for(let tries=0;tries<2;tries++){if(tries)start(5);await wait(2000);series.m.reset();await wait(5000);r=series.m.result();if(r.secs>=3&&r.fps>0)break;}
   stageResults.push({label,...r});renderStage();}
  $('stageprog').textContent='Fertig. '+device();$('copy').disabled=false;
 }finally{series=null;$('series').disabled=$('stagetest').disabled=false;$('view').value=keep.view;$('fps').value=keep.fps;$('stage').value=keep.stage;$('arena').checked=keep.arena;applyFps();$('count').value=String(keep.count);applyMode(keep.mode);start(keep.count);live.reset();}
}
function renderStage(){$('stageres').innerHTML='<tr><th>Kulisse</th><th>Bilder/s</th><th>Zeichnen</th><th>davon Kulisse</th><th>Rest</th></tr>'+stageResults.map(r=>`<tr><td class="l">${r.label}</td><td class="${cls(r.fps,50,30)}">${fmt(r.fps,0)}</td><td>${fmt(r.paint)} ms</td><td>${fmt(r.split.stage)} ms</td><td>${fmt(r.split.rest)} ms</td></tr>`).join('');}
$('stagetest').onclick=runStageTest;
// ---------------------------------------------------------------- Figuren-Test: 20 gegen 20 volle Figuren, Figuren jedes Bild neu oder seltener (Zwischenspeicher)
const LIVES=[['0','jedes Bild (alte Art)'],['15b','15-mal, Bitmap (wie im Spiel)'],['20b','20-mal, Bitmap'],['10b','10-mal, Bitmap']];
const figResults=[];
async function runFigTest(){
 if(series)return;$('series').disabled=$('stagetest').disabled=$('figtest').disabled=true;figResults.length=0;renderFig();
 const n=+$('figcount').value||20;
 const keep={mode,count,view:$('view').value,fps:$('fps').value,live:$('live').value};$('view').value='1';$('fps').value='60';applyFps();series={m:meter(),hold:false};
 try{for(let i=0;i<LIVES.length;i++){const [v,label]=LIVES[i];$('figprog').textContent=`Messe Figuren ${label} … (${i+1}/${LIVES.length})`;
   $('live').value=String(v);applyMode('full');$('count').value=String(n);start(n);
   let r=null;for(let tries=0;tries<2;tries++){if(tries)start(n);await wait(2000);series.m.reset();await wait(5000);r=series.m.result();if(r.secs>=3&&r.fps>0)break;}
   figResults.push({label,n,...r});renderFig();}
  $('figprog').textContent='Fertig. '+device();$('copy').disabled=false;
 }finally{series=null;$('series').disabled=$('stagetest').disabled=$('figtest').disabled=false;$('view').value=keep.view;$('fps').value=keep.fps;$('live').value=keep.live;applyFps();$('count').value=String(keep.count);applyMode(keep.mode);start(keep.count);live.reset();}
}
function renderFig(){$('figres').innerHTML='<tr><th>Figuren neu</th><th>Bilder/s</th><th>Tempo</th><th>Zeichnen</th><th>davon Figuren</th></tr>'+figResults.map(r=>`<tr><td class="l">${r.label}</td><td class="${cls(r.fps,50,30)}">${fmt(r.fps,0)}</td><td class="${cls(r.tempo*100,95,80)}">${fmt(r.tempo*100,0)} %</td><td>${fmt(r.paint)} ms</td><td>${fmt(r.split.actors)} ms</td></tr>`).join('');}
$('figtest').onclick=runFigTest;
function device(){return `Gerät: ${innerWidth}×${innerHeight} px, Pixeldichte ${devicePixelRatio||1}, ${navigator.hardwareConcurrency||'?'} Kerne.`;}
function renderTable(){
 let h='<tr><th>Je Seite</th>'+MODES.map(([,l])=>`<th>${l}</th>`).join('')+'</tr>';
 for(const n of SIZES){h+=`<tr><td class="l">${n} gegen ${n}</td>`;for(const [m] of MODES){const r=results[n]?.[m];
  h+=r?`<td><span class="${cls(r.fps,50,30)}">${fmt(r.fps,0)} Bilder/s</span> · <span class="${cls(r.tempo*100,95,80)}">${fmt(r.tempo*100,0)} %</span><small>Logik ${fmt(r.sim)} ms · Zeichnen ${fmt(r.paint)} ms</small></td>`:'<td>–</td>';}
  h+='</tr>';}
 $('res').innerHTML=h;
}
const smooth=r=>r&&r.fps>=50&&r.tempo>=.95;
function verdictFor(n){const r=results[n];if(!r)return '';const f=r.full,b=r.box,z=r.none;
 if(z&&z.tempo<.95)return `<b>${n} gegen ${n}</b>: <span class="bad">Die Kampfberechnung ist zu langsam.</span> Selbst ohne Zeichnen läuft der Kampf nur mit ${fmt(z.tempo*100,0)} % Tempo. Neue Grafik allein hilft hier nicht.`;
 if(smooth(f))return `<b>${n} gegen ${n}</b>: <span class="ok">Läuft flüssig mit voller Grafik.</span>`;
 if(smooth(r.simple))return `<b>${n} gegen ${n}</b>: <span class="mid">Mit einfachen Figuren flüssig</span> (${fmt(r.simple.fps,0)} Bilder/s), mit vollen Figuren ${fmt(f.fps,0)} Bilder/s.`;
 if(smooth(b))return `<b>${n} gegen ${n}</b>: <span class="mid">Die Grafik bremst.</span> Mit Kästen flüssig (${fmt(b.fps,0)} Bilder/s), mit vollen Figuren ${fmt(f.fps,0)} Bilder/s. Sparsamere Figuren lohnen sich.`;
 return `<b>${n} gegen ${n}</b>: <span class="bad">Auch mit Kästen nicht ganz flüssig</span> (${fmt(b.fps,0)} Bilder/s, ${fmt(b.tempo*100,0)} %), obwohl die Berechnung allein reicht. Logik und Zeichnen zusammen sind zu viel. Neue Grafik hilft etwas, die Berechnung muss aber auch schneller werden.`;}
function verdict(){$('verdict').innerHTML=SIZES.map(n=>`<li>${verdictFor(n)}</li>`).join('');}
$('copy').onclick=async()=>{
 const lines=['Arena Theory · Grafik-Benchmark',device(),''];
 for(const n of SIZES){lines.push(`${n} gegen ${n}:`);for(const [m,l] of MODES){const r=results[n]?.[m];if(r)lines.push(`  ${l}: ${fmt(r.fps,0)} Bilder/s, Tempo ${fmt(r.tempo*100,0)} %, Logik ${fmt(r.sim)} ms, Zeichnen ${fmt(r.paint)} ms (Kulisse ${fmt(r.split.stage)}, Boden ${fmt(r.split.ground)}, Figuren ${fmt(r.split.actors)}, Rest ${fmt(r.split.rest)}), p95 ${fmt(r.p95)} ms`);}}
 if(figResults.length){lines.push('',`Figuren-Test (${figResults[0].n} gegen ${figResults[0].n}, volle Figuren):`);for(const r of figResults)lines.push(`  ${r.label}: ${fmt(r.fps,0)} Bilder/s, Tempo ${fmt(r.tempo*100,0)} %, Zeichnen ${fmt(r.paint)} ms (Figuren ${fmt(r.split.actors)}), Logik ${fmt(r.sim)} ms`);}
 if(stageResults.length){lines.push('','Kulisse-Test (5 gegen 5, Kästen):');for(const r of stageResults)lines.push(`  ${r.label}: ${fmt(r.fps,0)} Bilder/s, Zeichnen ${fmt(r.paint)} ms (Kulisse ${fmt(r.split.stage)}, Rest ${fmt(r.split.rest)})`);}
 const text=lines.join('\n');
 try{await navigator.clipboard.writeText(text);$('copy').textContent='Kopiert ✓';}
 catch(e){const t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();try{document.execCommand('copy');$('copy').textContent='Kopiert ✓';}catch(_){}t.remove();}
 setTimeout(()=>$('copy').textContent='Ergebnis kopieren',2000);
};

// ---------------------------------------------------------------- Galerie
const ROLE_OF=def=>def.ammo?'Fernkämpfer':def.id==='dagger'?'Assassine':'Soldat';
const bases={};function baseFor(key){return bases[key]||=(()=>{const g=M.makeGladiator(0,true);g.traits=[];return g;})();}
function fighter(key,def,team,armor,shield){
 const g=M.copy(baseFor(key));g.id='gal-'+key;g.enemy=team===1;g.role=ROLE_OF(def);g.dead=false;
 const main=M.makeItem('weapon',def.id,2);main.blood=0;
 const sh=shield==='none'||g.role==='Fernkämpfer'?null:M.makeItem('shield',g.role==='Soldat'?'roundshield':'buckler',2);
 g.enemyGear={weapon:def.ammo?main:null,secondary:def.ammo?M.makeItem('weapon','dagger',2):main,shield:sh,armor:{}};
 if(armor!=='none')for(const d of M.armorDefs)g.enemyGear.armor[d.id]=M.makeItem('armor',d.id,2,armor);
 return g;
}
function tile(host,name,sub,paint,w=240,h=300){
 const d=document.createElement('div');d.className='tile';const c=document.createElement('canvas');c.width=w;c.height=h;d.appendChild(c);
 const t=document.createElement('b');t.textContent=name;d.appendChild(t);if(sub){const s=document.createElement('span');s.textContent=sub;d.appendChild(s);}
 host.appendChild(d);try{paint(c);}catch(e){console.warn('Galerie',name,e);const x=c.getContext('2d');x.fillStyle='#2a1c1c';x.fillRect(0,0,w,h);x.fillStyle='#e0705f';x.font='16px monospace';x.textAlign='center';x.fillText('nicht darstellbar',w/2,h/2);}
}
function gallery(){
 const team=+$('gTeam').value,armor=$('gArmor').value,shield=$('gShield').value;
 const W=$('galWeapons'),B=$('galBodies'),A=$('galBeasts'),X=$('galBoxes');W.innerHTML=B.innerHTML=A.innerHTML=X.innerHTML='';
 for(const def of M.weaponDefs)tile(W,def.name||def.id,ROLE_OF(def),c=>M.renderTeamFigure(c,fighter('w-'+def.id,def,team,armor,shield)));
 const glad=M.weaponDefs.find(w=>w.id==='gladius')||M.weaponDefs[0];
 for(const [id,name,height] of [['dwarf','Zwerg',150],['giant','Riese',199],['sumo','Koloss',182]])
  tile(B,name,'besondere Statur',c=>{const g=fighter('b-'+id,glad,team,armor,shield);g.stature=id;g.height=height;g.arm=Math.round(height*.43);g.leg=Math.round(height*.49);M.renderTeamFigure(c,g);});
 tile(B,'Durchschnitt','180 cm',c=>M.renderTeamFigure(c,fighter('b-avg',glad,team,armor,shield)));
 // Tiere: Hunde aller Rassen mit dem Zeichner des Spiels (hund.js über M.drawRex)
 const DOG=window.DOG;
 if(DOG?.BREEDS)for(const br of DOG.BREEDS)tile(A,br.name||br.id,'Hund',c=>{const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.clearRect(0,0,c.width,c.height);
  const D=DOG.create(br.id,1234+br.id.length*97),a=DOG.makeActor(D,team,0,0);a.a=0;a.x=0;a.y=0;
  x.save();x.translate(c.width/2,c.height*.82);x.scale(2,2);M.drawRex(x,a);x.restore();},240,180);
 else tile(A,'Hunde','fehlt',()=>{throw Error('hund.js nicht geladen');},240,180);
 // Löwe (Rex Vetus, lion.js) und Kampfhahn (hahn-arena.js): mit den Zeichnern des Spiels
 tile(A,'Löwe','Rex Vetus',c=>{const x=c.getContext('2d');x.imageSmoothingEnabled=false;const g=M.makeGladiator(0,true);g.traits=[];
  const l=M.createCombatActor(g,team,0);Object.assign(l,{rex:true,x:0,y:0,a:0,r:30,z:0,mode:'stalk',phase:0,hit:0,wounds:[],blood:100,tissue:{head:160,chest:290,belly:140,front:120,rear:100},noShadow:false,scarSeed:0,deathAt:0});
  x.save();x.translate(c.width/2,c.height*.8);x.scale(1.3,1.3);M.drawRex(x,l);x.restore();},240,180);
 if(window.CF?.createRooster)tile(A,'Kampfhahn','Hahn',c=>{const x=c.getContext('2d');x.imageSmoothingEnabled=false;const R=CF.createRooster({seed:77});
  const a={hahn:R,id:'gal-hahn',x:0,y:0,a:0,z:0,team,mode:'threaten',phase:0,hpose:{},hs:{phase:'approach',t:0},g:{dead:false,name:R.name||'Hahn',body:{}}};
  x.save();x.translate(c.width/2,c.height*.82);x.scale(3,3);M.drawRex(x,a);x.restore();},240,180);
 // Ersatzdarstellung, wie sie im Benchmark aussieht
 const boxes=[['Kämpfer blau',{team:0,a:0,g:{height:180,blood:100}}],['Kämpfer rot',{team:1,a:Math.PI,g:{height:180,blood:60}}],['Riese',{team:0,a:0,g:{height:199,blood:100}}],['Tier',{team:1,a:Math.PI,dog:true,g:{blood:100}}],['am Boden',{team:0,a:0,down:true,g:{height:180,blood:30}}],['tot',{team:1,a:0,g:{height:180,dead:true}}]];
 for(const [name,a] of boxes)tile(X,name,'Kasten',c=>{const x=c.getContext('2d');x.fillStyle='#8b7a5a';x.fillRect(0,0,c.width,c.height);x.save();x.translate(c.width/2,c.height*.8);x.scale(2.6,2.6);drawBox(x,{...a,x:0,y:0});x.restore();},240,180);
}
$('gTeam').onchange=$('gArmor').onchange=$('gShield').onchange=gallery;

// ---------------------------------------------------------------- Start
applyMode('full');applyFps();renderTable();
start(5);
try{gallery();}catch(e){console.error(e);}
})();
