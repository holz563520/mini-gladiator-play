'use strict';
// HALL OF THE FALLEN: Tor links im Ludus, Halle mit Grabmälern und Geistern, dauerhafte Ehrenliste aller Gefallenen
// und das Story-Tutorial direkt nach der Schmiede (der Schmied erklärt die Totenverwaltung an einem eigens erzeugten Rekruten).
// Keine Kampf- oder Balancewirkung. Die Einträge sind Momentaufnahmen beim Tod und ändern sich danach nicht mehr.
(()=>{
const M=window.MG;if(!M?.s)return;const S=M.s,$=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const W=()=>M.workshop?.state,smithName=()=>W()?.master?.name||'Der Schmied';
const H=()=>{const h=S.hall??={tut:'',recruit:null,tag:{}};h.tag??={};return h;};
const copy=v=>v==null?v:JSON.parse(JSON.stringify(v));
function hash(str){let h=2166136261;for(const c of String(str))h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0)/4294967296;}
const pickBy=(list,id,salt)=>list[Math.floor(hash(id+'|'+salt)*list.length)];

// ---------- Grabstufen, Titel, Inschriften ----------
const TOMBS=['','Namenloser','Kämpfer','Veteran','Champion','Legende'];
function tierFor(e){const k=e.kills||0,w=e.wins||0,h=e.highest||0;if(k>=30||h>=5)return 5;if(k>=15||w>=25||h>=4)return 4;if(k>=6||w>=10||h>=2)return 3;if(w>=1||k>=1)return 2;return 1;}
const TITLES={1:['Der Namenlose','Der Unbekannte','Sandfutter','Der Zögernde'],2:['Der Kämpfer','Der Unbeugsame','Der Standhafte','Klinge des Ludus'],3:['Der Veteran','Der Narbenreiche','Eisen des Ludus','Der Unermüdliche'],4:['Champion des Sandes','Der Unbesiegte','Der Schlächter','Löwe der Arena'],5:['Legende der Arena','Der Unsterbliche','Der Ewige','Schrecken aller Schulen']};
const EPI={1:['Er kam, er sah, er fiel.','Kurz war sein Weg, lang ist sein Schlaf.','Der Sand hat ihn schneller vergessen als wir.','Mehr Mut als Glück. Viel mehr.','Er hätte vielleicht etwas werden können.'],
 2:['Er stand, solange er konnte.','Ein Schwert, ein Schild, ein ehrliches Ende.','Er gab dem Sand, was er hatte.','Nicht der Größte. Aber er blieb nicht liegen – bis zum Schluss.','Seine Siege bleiben, seine Narben auch.'],
 3:['Viele Kämpfe, viele Narben, ein Name.','Der Sand kannte seinen Schritt.','Er lehrte die Jungen, wie man stirbt – und wie man vorher siegt.','Alt geworden in einer Welt, in der niemand alt wird.','Sein Schild ruht. Sein Ruf nicht.'],
 4:['Die Menge rief seinen Namen. Sie ruft ihn noch.','Gold auf dem Sarg, Blut im Sand.','Er besiegte alle – bis auf einen.','Champions sterben nicht. Sie werden zu Geschichten.','Wo er stand, wich der Sand zurück.'],
 5:['Legenden sterben nicht. Sie warten.','Die Arena hat seinen Namen in Stein gemeißelt.','Kein Gegner hielt ihn auf. Nur die Zeit.','Wenn die Fackeln flackern, hört man noch das Klirren seiner Klinge.','Unvergessen. Unerreicht. Unter uns.']};
const title=e=>pickBy(TITLES[e.tomb]||TITLES[1],e.id,'title'),epitaph=e=>pickBy(EPI[e.tomb]||EPI[1],e.id,'epi');
// Fehlende Felder (alte Spielstände) sinnvoll auffüllen, ohne den Eintrag zu verändern
function view(e){const v={...e};v.tomb=e.tomb||tierFor(e);v.title=e.title||title(v);v.epitaph=e.epitaph||epitaph(v);v.cvPeak=e.cvPeak??null;v.sortCv=e.cvPeak??e.cvDeath??0;return v;}

// ---------- Momentaufnahme beim Tod (aus data.js kill) ----------
function inv(id){return id&&S.inventory?.find?.(i=>i.id===id)||null;}
function look(g){const gear=g.enemyGear?{weapon:copy(g.enemyGear.weapon),shield:copy(g.enemyGear.shield),armor:copy(g.enemyGear.armor||{})}:{weapon:copy(inv(g.equipment?.weapon)),shield:copy(inv(g.equipment?.shield)),armor:Object.fromEntries(Object.entries(g.equipment?.armor||{}).map(([k,id])=>[k,copy(inv(id))]).filter(([,i])=>i))};
 return {appearance:copy(g.appearance),height:g.height,weight:g.weight,muscle:g.muscle,fat:g.fat,missing:Object.entries(g.body||{}).filter(([,p])=>p?.missing).map(([k])=>k),gear};}
M.onFallen=(g,e)=>{const cv=M.combatValues?.(g)||{current:0,maximum:0},now=Math.round(cv.current||0);e.cvDeath=now;e.cvPeak=Math.max(now,Math.round(g.peakPower||0));e.potential=Math.round(Math.max(cv.maximum||0,now));e.talent=Math.round(g.potential??50);e.role=g.role||'Soldat';e.losses=g.losses??Math.max(0,(g.fights||0)-(g.wins||0));
 const L=M.leagues?.[S.fightLeague??S.league];e.place=S.battle?(L?.name?'Arena · '+L.name:'Arena'):'Gladiatorenschule';e.look=look(g);
 const tag=H().tag[g.id];if(tag){Object.assign(e,tag);delete H().tag[g.id];}e.tomb=e.tomb||tierFor(e);e.title=e.title||title(e);e.epitaph=e.epitaph||epitaph(e);};
// Höchster Kampfwert zu Lebzeiten: bei jedem Tageswechsel mitschreiben (reine Statistik)
function track(){for(const g of S.roster||[])if(!g.dead){const p=Math.round(M.power?.(g)||0);if(p>(g.peakPower||0))g.peakPower=p;}}
const day=M.advanceDay;if(day)M.advanceDay=(...a)=>{track();const r=day(...a);track();return r;};

// ---------- Figuren für Geister, Statuen und Porträts ----------
const figs=new Map();
function figure(e){const hit=figs.get(e.id);if(hit)return hit;const L=e.look,rng=S.rng,g=M.makeGladiator(0);S.rng=rng;g.id='ghost-'+e.id;g.name=e.name;g.scars=[];g.fame=0;
 if(L){g.appearance={...g.appearance,...copy(L.appearance)};g.height=L.height??g.height;g.weight=L.weight??g.weight;if(L.muscle!=null)g.muscle=L.muscle;if(L.fat!=null)g.fat=L.fat;for(const k of L.missing||[])if(g.body?.[k])g.body[k].missing=true;}
 else g.appearance={...g.appearance,skin:'#9a8a78',shade:'#7d6f60',hair:'#3b3a35',cloth:'#5c5a52'};
 g.equipment={weapon:null,secondary:null,shield:null,armor:{}};g.enemyGear={weapon:L?.gear?.weapon||null,secondary:null,shield:L?.gear?.shield||null,armor:L?.gear?.armor||{}};figs.set(e.id,g);return g;}
const sprites=new Map();
// Ein Bild je Eintrag und Art (Geist bläulich, Statue steingrau); danach wird es nur noch kopiert – keine Leistung pro Bild
function sprite(e,kind){const key=e.id+'|'+kind;if(sprites.has(key))return sprites.get(key);const c=document.createElement('canvas');c.width=90;c.height=100;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
 try{M.renderForgeActors(g,[{id:'spr-'+e.id,g:figure(e),team:0,x:45,y:92,a:0,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,bloodMarks:{}}]);}catch(err){g.fillStyle='#888';g.fillRect(38,40,14,50);}
 if(kind!=='plain'){g.globalCompositeOperation='source-atop';g.fillStyle=kind==='ghost'?'rgba(120,185,255,.62)':'rgba(150,148,136,.9)';g.fillRect(0,0,90,100);g.globalCompositeOperation='source-over';}
 if(sprites.size>400)sprites.clear();sprites.set(key,c);return c;}

// ---------- Die Halle (Weltmaß 480 × 300) ----------
// Lange Halle: Gräber in einer Reihe, die mächtigsten links, nach rechts absteigend. Hinter dem letzten Grab warten immer ein paar
// freie Grabstellen, die Halle wächst mit. Gezeichnet wird nur, was gerade zu sehen ist (auch bei 1000 Gräbern flüssig).
const HW=480,HH=300,X0=96,SP=96,ROW=210,FREE=4,slotX=i=>X0+i*SP,hallLen=n=>Math.max(HW,X0+(n+FREE)*SP),SLOTS=[[slotX(0),ROW],[slotX(1),ROW],[slotX(2),ROW],[slotX(3),ROW]];
const tiles={};
function hallTile(entrance){const key=entrance?'in':'wall';if(tiles[key])return tiles[key];const c=document.createElement('canvas');c.width=HW;c.height=HH;const g=c.getContext('2d');g.imageSmoothingEnabled=false;const r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 r(0,0,HW,HH,'#121517');
 // Rückwand aus dunklem Stein
 r(0,0,HW,124,'#262a29');for(let y=6;y<124;y+=12)for(let x=(y/12%2)*14-14;x<HW;x+=28){r(x,y,27,11,(x*7+y)%3?'#2c312f':'#232726');r(x,y,27,1,'#343a37');}
 r(0,118,HW,8,'#1a1d1d');r(0,124,HW,3,'#3a3f3b');
 // Gesims mit Totenköpfen
 r(0,0,HW,14,'#1b1f1e');r(0,13,HW,2,'#4a504a');for(let x=20;x<HW;x+=40){r(x-5,3,10,8,'#9a9a8a');r(x-3,5,2,2,'#1b1f1e');r(x+1,5,2,2,'#1b1f1e');r(x-2,9,4,2,'#6d6f63');}
 // Säulen
 for(const x of [24,120,216,264,360,456]){r(x-8,16,16,104,'#4d524c');r(x-6,16,3,104,'#686e66');r(x+4,16,2,104,'#3a3e39');r(x-11,16,22,6,'#5d635b');r(x-11,114,22,8,'#5d635b');for(let y=26;y<112;y+=10)r(x-1,y,1,6,'#3f443e');}
 // Inschrift über dem Eingang, weiter hinten Totenkopf-Reliefs
 if(entrance){r(150,30,180,22,'#14181a');r(152,32,176,18,'#2b2a22');r(152,32,176,1,'#5b5440');g.font="bold 13px 'Courier Prime',monospace";g.textAlign='center';g.textBaseline='middle';g.fillStyle='#c9a85a';g.fillText('HALL OF THE FALLEN',240,42);
  g.font="bold 7px 'Courier Prime',monospace";g.fillStyle='#8c7a4c';g.fillText('DEATH IS PERMANENT · LEGENDS ARE NOT FORGOTTEN',240,60);}
 else{r(226,34,28,26,'#1d2120');r(228,36,24,22,'#3a3f3b');r(236,40,8,8,'#8d8f84');r(237,42,2,2,'#1b1f1e');r(241,42,2,2,'#1b1f1e');r(232,50,16,2,'#6d6f63');r(239,52,2,4,'#6d6f63');}
 // Fackelhalter
 for(const x of [72,168,312,408]){r(x-2,70,4,14,'#3b3226');r(x-4,66,8,5,'#5a4a34');}
 // Boden: Steinplatten
 for(let y=127;y<HH;y+=14){const k=(y-127)/(HH-127);for(let x=((y/14)%2)*20-20;x<HW;x+=40){r(x,y,39,13,k<.3?'#1e2224':'#24292b');r(x,y,39,1,'#2f3537');}}
 // Mittelgang am Eingang (der Schmied kommt von unten herein)
 if(entrance){r(222,127,36,HH-127,'#2a2f30');for(let y=130;y<HH;y+=10)r(224,y,32,1,'#34393a');}
 const vg=g.createLinearGradient(0,0,0,HH);vg.addColorStop(0,'rgba(0,0,0,.25)');vg.addColorStop(.5,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.45)');g.fillStyle=vg;g.fillRect(0,0,HW,HH);
 tiles[key]=c;return c;}
const hallBg=()=>hallTile(true);
function plot(g,x,y){const r=(a,b,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(a),Math.round(b),w,h);};r(x-25,y-7,50,15,'#1a1d1e');r(x-25,y-7,50,2,'#3b403d');r(x-25,y+6,50,2,'#0f1112');r(x-25,y-7,2,15,'#33382f');r(x+23,y-7,2,15,'#33382f');}
function flames(g,t,x0){const r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),w,h);};for(const [i,x] of [72,168,312,408].entries()){const X=x0+x,f=Math.floor(t*8+i*3+x0/97)%3;
 g.globalAlpha=.16;g.fillStyle='#e8a050';g.beginPath();g.ellipse(X,62,22,18,0,0,Math.PI*2);g.fill();g.globalAlpha=1;r(X-3,60+(f===1?1:0),6,7-f,'#c8642e');r(X-2,58+f,4,5,'#e2ab5c');r(X-1,56+(f===2?2:0),2,3,'#fff0c0');}}
// Grabmal je Stufe (x,y = Mitte der Grabstelle)
function tomb(g,e,x,y,t){const r=(a,b,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(a),Math.round(b),w,h);},T=e.tomb;
 r(x-22,y-4,44,9,'#2b2420');// aufgeworfene Erde
 if(T===1){g.save();g.translate(x-4,y);g.rotate(-.16);r(-6,-17,12,17,'#5e605a');r(-5,-19,10,3,'#6d6f68');r(-4,-20,8,2,'#6d6f68');r(-6,-17,2,17,'#73766d');r(-1,-14,1,7,'#3d3f3a');r(-3,-12,5,1,'#3d3f3a');g.restore();}
 else if(T===2){r(x-10,y-26,20,26,'#6c6e66');r(x-8,y-29,16,3,'#7a7c73');r(x-5,y-31,10,2,'#7a7c73');r(x-10,y-26,2,26,'#82847a');r(x-1,y-22,2,14,'#3c3e39');r(x-4,y-19,8,2,'#3c3e39');r(x-1,y-9,2,3,'#53554e');}
 else if(T===3){r(x-18,y-6,36,6,'#5d5f57');r(x-16,y-34,32,28,'#77796f');r(x-16,y-34,32,2,'#8d8f84');for(const cx of [x-14,x+11]){r(cx,y-34,4,28,'#8d8f84');r(cx-1,y-36,6,3,'#9a9c90');}r(x-7,y-29,14,16,'#5d5f57');r(x-4,y-26,8,3,'#8d8f84');r(x-2,y-23,4,8,'#8d8f84');r(x-19,y-38,38,4,'#6c6e66');}
 else if(T===4){r(x-22,y-6,44,7,'#4a3a24');r(x-20,y-18,40,13,'#8a6a3a');r(x-20,y-18,40,2,'#b08848');r(x-22,y-22,44,5,'#6e5530');r(x-22,y-22,44,1,'#d6b45a');for(const cx of [x-18,x-6,x+6,x+16])r(cx,y-16,2,9,'#d6b45a');r(x-4,y-26,8,4,'#d6b45a');r(x-2,y-28,4,2,'#f0d27a');}
 else{r(x-20,y-8,40,9,'#5d5f57');r(x-17,y-16,34,9,'#77796f');r(x-17,y-16,34,1,'#d6b45a');const sp=sprite(e,'statue');g.drawImage(sp,x-45,y-16-92);
  for(let i=0;i<4;i++){const k=(t*.5+i/4)%1;g.globalAlpha=.8*(1-k);r(x-14+i*9+Math.sin(t+i)*2,y-30-k*40,2,2,'#f4d37a');}g.globalAlpha=1;}
 // Name klein darunter
 g.font="bold 7px 'Courier Prime',monospace";g.textAlign='center';g.textBaseline='middle';g.fillStyle=T>=4?'#e2c27d':'#a99e84';g.fillText(String(e.name||'').split(' ')[0].toUpperCase().slice(0,12),x,y+13);}
function ghost(g,e,x,y,t,i){const sp=sprite(e,'ghost'),f=Math.sin(t*2.1+i*1.7),fl=Math.random()<.04?.18:0,lift=6+Math.sin(t*1.3+i)*3;
 if(e.tomb>=4){g.globalAlpha=.18+.06*f;g.fillStyle=e.tomb>=5?'#bfe0ff':'#8fc1ff';g.beginPath();g.ellipse(x,y-36-lift,22,34,0,0,Math.PI*2);g.fill();}
 g.globalAlpha=Math.max(.15,.46+.1*f-fl);g.drawImage(sp,x-45,y-92-lift);g.globalAlpha=1;}
function paintHall(g,list,t,o={}){g.imageSmoothingEnabled=false;const cam=o.cam||0,len=o.len??hallLen(list.length);
 g.save();g.translate(-cam,0);for(let k=Math.floor(cam/HW);k*HW<cam+HW;k++){g.drawImage(hallTile(k===0),k*HW,0);flames(g,t,k*HW);}
 const first=Math.max(0,Math.floor((cam-X0)/SP)-1),last=Math.min(Math.floor((len-X0)/SP),Math.ceil((cam+HW-X0)/SP)+1),items=[];
 for(let i=first;i<=last;i++){const x=slotX(i);if(x>len-SP/2)break;plot(g,x,ROW);const e=list[i];if(!e)continue;items.push({y:ROW-1,draw:()=>tomb(g,e,x,ROW,t)});if(o.ghosts!==false)items.push({y:ROW,draw:()=>ghost(g,e,x+28,ROW+2,t,i)});
  if(o.mark===e.id)items.push({y:ROW+20,draw:()=>{g.strokeStyle='#e2c27d';g.lineWidth=1;g.setLineDash?.([3,2]);g.strokeRect(x-27,ROW-74,58,92);g.setLineDash?.([]);}});}
 for(const a of o.actors||[])items.push({y:a.y,draw:()=>M.renderForgeActors(g,[a])});
 items.sort((a,b)=>a.y-b.y).forEach(it=>it.draw());g.restore();}

// ---------- Die Seite der Halle ----------
let loop=0,lastT=0,camX=0,camTo=null,markId=null;
// Reihenfolge: höchster Kampfwert zuerst; ohne Kampfwert (alte Einträge) nach Grabstufe und Kills
const order=(a,b)=>b.sortCv-a.sortCv||b.tomb-a.tomb||(b.kills||0)-(a.kills||0)||(b.day||0)-(a.day||0);
function entries(){return (S.fallen||[]).map(view).sort(order);}
const maxCam=n=>Math.max(0,hallLen(n)-HW);
function hallPage(){const list=entries();camX=Math.max(0,Math.min(maxCam(list.length),camX));requestAnimationFrame(startLoop);
 const rows=list.map((e,i)=>`<li><button class="hall-row t${e.tomb}" type="button" data-action="hall:open:${esc(e.id)}"><span class="hall-rank">${i+1}</span><span class="hall-name"><b>${esc(e.name)}</b><small>${esc(e.title)} · ${TOMBS[e.tomb]}</small></span><span class="hall-cv"><b>${e.cvPeak??'?'}</b><small>KW max</small></span><span class="hall-k">${e.kills||0}<small>Kills</small></span><span class="hall-d">Tag ${e.day??'?'}</span></button></li>`).join('');
 return `<section class="hall-page"><div class="pagehead"><p class="eyebrow">${esc(S.schoolName||'Ludus')} · TAG ${S.day}</p><h1>HALL OF THE FALLEN</h1><p>Ihre Namen bleiben. Ihre Leben kehren nicht zurück.</p></div>
<div class="hall-stage"><canvas id="hallCanvas" width="${HW*2}" height="${HH*2}" aria-label="Grabmäler der Gefallenen, zum Verschieben ziehen"></canvas>${list.length?'':'<p class="hall-empty">Noch kein einziges Grab. Die Plätze warten.</p>'}</div>
${list.length?`<div class="hall-bar"><span class="tiny">← mächtigste · ziehen zum Verschieben · schwächere →</span><div class="hall-pager"><button class="btn" type="button" data-action="hall:pan:-1" aria-label="Nach links">‹</button><span id="hallRange">${rangeText(list.length)}</span><button class="btn" type="button" data-action="hall:pan:1" aria-label="Nach rechts">›</button></div></div>
<ol class="hall-list">${rows}</ol>`:''}</section>`;}
function rangeText(n){if(!n)return '';const a=Math.min(n,Math.max(1,Math.ceil((camX-X0+28)/SP)+1)),b=Math.max(a,Math.min(n,Math.floor((camX+HW-X0-46)/SP)+1));return `Grab ${a}–${b} von ${n}`;}
function startLoop(){if(loop)return;const tick=now=>{const c=$('hallCanvas');if(!c||!c.isConnected){loop=0;return;}loop=requestAnimationFrame(tick);if(document.hidden||now-lastT<40)return;lastT=now;const list=entries(),mx=maxCam(list.length);
 if(camTo!=null){camX+=(camTo-camX)*.22;if(Math.abs(camTo-camX)<.6){camX=camTo;camTo=null;}}camX=Math.max(0,Math.min(mx,camX));
 const g=c.getContext('2d');g.setTransform(c.width/HW,0,0,c.height/HH,0,0);paintHall(g,list,now/1000,{mark:markId,cam:camX});
 // Pfeile am Rand, wenn es in diese Richtung weitergeht
 g.fillStyle='#f4d37a';g.globalAlpha=.55+.3*Math.sin(now/300);if(camX<mx-2){g.fillRect(HW-12,HH/2-8,3,16);g.fillRect(HW-9,HH/2-5,3,10);g.fillRect(HW-6,HH/2-2,3,4);}if(camX>2){g.fillRect(9,HH/2-8,3,16);g.fillRect(6,HH/2-5,3,10);g.fillRect(3,HH/2-2,3,4);}g.globalAlpha=1;
 const rt=$('hallRange'),txt=rangeText(list.length);if(rt&&rt.textContent!==txt)rt.textContent=txt;};loop=requestAnimationFrame(tick);}
function focusGrave(id){const i=entries().findIndex(e=>String(e.id)===String(id));if(i>=0)camTo=Math.max(0,Math.min(maxCam((S.fallen||[]).length),slotX(i)+14-HW/2));}
// Ziehen (Maus, Finger) und Mausrad seitwärts; ein Zug löst keinen Klick aus
let drag=null;
document.addEventListener('pointerdown',e=>{const c=e.target?.closest?.('#hallCanvas');if(!c)return;drag={x:e.clientX,cam:camX,moved:false,w:c.getBoundingClientRect().width||1};camTo=null;});
document.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>6)drag.moved=true;if(drag.moved)camX=drag.cam-dx*HW/drag.w;});
document.addEventListener('pointerup',()=>{setTimeout(()=>{drag=null;},0);});
document.addEventListener('wheel',e=>{if(!e.target?.closest?.('#hallCanvas'))return;const d=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.shiftKey?e.deltaY:0;if(!d)return;e.preventDefault();camTo=null;camX+=d*.6;},{passive:false});
document.addEventListener('click',e=>{const c=e.target?.closest?.('#hallCanvas');if(!c||drag?.moved)return;const r=c.getBoundingClientRect(),x=camX+(e.clientX-r.left)*HW/r.width,y=(e.clientY-r.top)*HH/r.height,list=entries(),i=Math.floor((x-(X0-28))/SP);if(i>=0&&list[i]&&x-slotX(i)<46&&y>ROW-80&&y<ROW+18)openDetail(list[i].id);});
const num=v=>v==null||v===''?'–':v;
function detailHtml(e){const lg=M.leagues?.[e.highest]?.name,feats=[];if((e.highest||0)>0&&lg)feats.push('Höchste Liga: '+lg);if((e.kills||0)>=10)feats.push(e.kills+' Gegner erschlagen');if((e.wins||0)>=10)feats.push(e.wins+' Siege');if(e.scars?.length)feats.push(e.scars.length+' Narben');if(e.killHistory?.length){const last=e.killHistory[e.killHistory.length-1];if(last?.name)feats.push('Letzter erschlagener Gegner: '+last.name);}
 const tier=M.barracks?.tierOf?.(e.talent??0);
 return `<div class="hall-detail t${e.tomb}"><div class="hall-id" data-hl="name"><canvas id="hallPortrait" width="180" height="200" aria-label="Aussehen"></canvas><div><p class="eyebrow">${TOMBS[e.tomb]} · Grabstufe ${e.tomb}</p><h3>${esc(e.name)}</h3><p class="hall-title">„${esc(e.title)}“</p><p class="tiny">${esc(e.role||'Klasse unbekannt')}${e.age?' · '+e.age+' Jahre':''}</p></div></div>
<div class="hall-sec" data-hl="values"><h4>Werte</h4><div class="hall-grid"><span>Talent<b>${e.talent!=null?e.talent+(tier?' · '+tier.name:''):'–'}</b></span><span>Potenzial<b>${num(e.potential)}</b></span><span>Höchster Kampfwert<b>${num(e.cvPeak)}</b></span><span>Kampfwert beim Tod<b>${num(e.cvDeath)}</b></span></div></div>
<div class="hall-sec" data-hl="wins"><h4>Kampfhistorie</h4><div class="hall-grid"><span>Kämpfe<b>${e.fights||0}</b></span><span>Siege<b>${e.wins||0}</b></span><span>Niederlagen<b>${e.losses??Math.max(0,(e.fights||0)-(e.wins||0))}</b></span><span>Getötete Gegner<b>${e.kills||0}</b></span></div><p class="tiny">${feats.length?esc(feats.join(' · ')):'Keine besonderen Leistungen verzeichnet.'}</p></div>
<div class="hall-sec"><h4>Tod</h4><div class="hall-list2"><span data-hl="cause">Todesursache<b>${esc(e.cause||'unbekannt')}</b></span><span data-hl="killer">Mörder<b>${esc(e.killer||'unbekannt')}</b></span><span>Todesort<b>${esc(e.place||'unbekannt')}</b></span><span>Todestag<b>Tag ${num(e.day)}</b></span></div></div>
<div class="hall-sec hall-epi" data-hl="tomb"><h4>Grabinschrift</h4><p>„${esc(e.epitaph)}“</p></div></div>`;}
function openDetail(id){const e=(S.fallen||[]).map(view).find(x=>String(x.id)===String(id));if(!e)return;markId=e.id;focusGrave(e.id);M.ui.modal('† '+esc(e.name),detailHtml(e));setTimeout(()=>portrait(e),0);}
function portrait(e){const c=$('hallPortrait');if(!c)return;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#1a1f20';g.fillRect(0,0,180,200);g.drawImage(sprite(e,'plain'),0,0,90,100,0,0,180,200);}
const page=M.schoolPage;M.schoolPage=p=>p==='fallen'?hallPage():page(p);

// ---------- Das Tor im Ludus ----------
const GATE={x:34,y:214,w:94,h:68};
M.hallGate={rect:GATE,paint(g,rect,label){const r=rect,x=GATE.x,y=GATE.y;
 g.globalAlpha=.3;r(x+6,y+60,96,12,'#1d1a15');g.globalAlpha=1;
 r(x,y+8,94,60,'#2e3230');for(let yy=y+12;yy<y+66;yy+=7)for(let xx=x+(yy%14?0:6);xx<x+92;xx+=12)r(xx,yy,11,6,(xx+yy)%3?'#383d3a':'#323634');
 // Säulen links und rechts
 for(const cx of [x+3,x+79]){r(cx,y+16,12,52,'#53584f');r(cx+2,y+16,3,52,'#6c7268');r(cx+9,y+16,2,52,'#3e423b');r(cx-2,y+13,16,5,'#646a60');r(cx-2,y+64,16,5,'#646a60');for(let yy=y+22;yy<y+62;yy+=8)r(cx+5,yy,1,5,'#454a42');}
 // Giebel mit Totenkopf und Inschrift
 r(x-3,y+2,100,12,'#3c413c');r(x-3,y+2,100,2,'#5d635b');r(x+30,y-6,34,10,'#3c413c');r(x+34,y-9,26,4,'#3c413c');
 r(x+41,y-7,12,9,'#bdb9a4');r(x+43,y-5,3,3,'#1b1f1e');r(x+48,y-5,3,3,'#1b1f1e');r(x+46,y-1,2,1,'#1b1f1e');r(x+43,y+1,8,2,'#8f8c7a');
 r(x+6,y+5,82,8,'#151918');label('HALL OF THE FALLEN',x+47,y+11,7);
 // Torbogen und geschlossene Flügel (Bronze)
 r(x+17,y+20,60,48,'#0e1112');r(x+19,y+22,56,46,'#5a4428');for(const lx of [x+19,x+47]){r(lx,y+22,28,46,'#6a5030');r(lx,y+22,28,2,'#8a6a3a');for(let yy=y+30;yy<y+66;yy+=9)r(lx+2,yy,24,1,'#4a3820');r(lx+12,y+40,4,4,'#c9a85a');}r(x+46,y+22,2,46,'#2a2018');
 // Fackelhalter (Flammen kommen als Bewegung dazu)
 for(const fx of [x+9,x+85]){r(fx-1,y+28,3,8,'#3b3226');r(fx-3,y+25,7,4,'#5a4a34');}}};
let gateAnim=null;
function gateHit(x,y){return x>=GATE.x&&x<=GATE.x+GATE.w&&y>=GATE.y-10&&y<=GATE.y+GATE.h;}
const overlay=M.ludusOverlay;M.ludusOverlay=(g,t)=>{overlay?.(g,t);const r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),w,h);},x=GATE.x,y=GATE.y;
 // Fackeln
 for(const [i,fx] of [x+9,x+85].entries()){const f=Math.floor(t*8+i*2)%3;g.globalAlpha=.18;g.fillStyle='#e8a050';g.beginPath();g.ellipse(fx,y+22,10,9,0,0,Math.PI*2);g.fill();g.globalAlpha=1;r(fx-2,y+20+(f===1?1:0),5,5-f,'#c8642e');r(fx-1,y+18+f,3,4,'#e2ab5c');r(fx,y+16+(f===2?2:0),1,3,'#fff0c0');}
 // Tor öffnet sich
 if(gateAnim){const k=Math.min(1,(performance.now()-gateAnim.t0)/900),w=Math.round(28*k);r(x+47-w,y+22,w*2,46,'#0b0d0e');g.globalAlpha=.35*k;r(x+47-w,y+60,w*2,8,'#e2ab5c');g.globalAlpha=1;if(k>=1&&!gateAnim.fired){gateAnim.fired=true;const fn=gateAnim.then;setTimeout(()=>{gateAnim=null;fn?.();},120);}}
 // Hervorhebung im Tutorial
 const st=H().tut;if((st==='open1'||st==='open2')&&!gateAnim){const p=(Math.sin(t*4)+1)/2;g.globalAlpha=.5+.5*p;g.strokeStyle='#f4d37a';g.lineWidth=2;g.strokeRect(x-4,y-12,GATE.w+8,GATE.h+14);g.globalAlpha=1;const ay=y-24-Math.round(p*5);r(x+44,ay,6,8,'#f4d37a');r(x+41,ay+8,12,3,'#f4d37a');r(x+44,ay+11,6,3,'#f4d37a');r(x+46,ay+14,2,2,'#f4d37a');}};
function openGate(then){M.ludus?.focus?.(GATE.x+47,GATE.y+40,2);gateAnim={t0:performance.now(),then};M.sound?.('heavy');}
const hit=M.ludusHit;M.ludusHit=(x,y)=>{if(gateHit(x,y)&&!gateAnim){const st=H().tut;if(['gate1','empty','exec','visit'].includes(st))return true;
  if(st==='open1')openGate(()=>{setStage('empty');playEmpty();});else if(st==='open2')openGate(()=>{setStage('visit');playVisit();});else openGate(()=>M.ui.click('nav:fallen'));return true;}
 return hit?hit(x,y):false;};
M.ludus?.rebuild?.();

// ---------- Kleine Filmbühne für Tor- und Hallen-Szenen ----------
// Szenen bestehen aus Takten: Jeder Takt setzt Haltung/Ziel und zeigt optional einen Satz. Weiter geht es, wenn gelesen (oder angetippt) und der Weg zu Ende ist.
const need=text=>Math.max(2.4,1.1+text.length*.068);
function smithFigure(){const p=W().master,rng=S.rng,g=M.makeGladiator(0);S.rng=rng;Object.assign(g,{id:'hall-smith',name:p.name,height:p.height,weight:p.weight,muscle:58,fame:0,scars:[]});g.appearance={...p.appearance};g.equipment={weapon:null,secondary:null,shield:null,armor:{}};
 const items={sword:M.makeItem('weapon','gladius',1),hammer:M.makeItem('weapon','hammer',1)};g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};S.rng=rng;return {id:'hall-smith',g,items,team:0,x:0,y:0,a:0,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,forgeWorker:true,forgeHold:'beer',bloodMarks:{}};}
let film=null;
function play(kind,beats,opt={}){if(film)stopFilm();const smith=smithFigure();Object.assign(smith,opt.smith||{});const actors=[smith];let lan=null;if(opt.lan&&S.lanista){lan={id:'hall-lan',g:M.ludus.ownerFigure(S.lanista),lanista:true,team:0,a:Math.PI,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,bloodMarks:{},...opt.lan};actors.push(lan);}
 const v=document.createElement('div');v.id='hallFilm';v.className='smith-ceremony smith-intro hall-film no-smith-song';v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');v.setAttribute('aria-label',opt.label||'Hall of the Fallen');
 v.innerHTML='<div><div class="scene-bubble-slot"><div class="scene-bubble" id="hallFilmBubble" hidden></div></div><canvas id="hallFilmCanvas" width="660" height="420" data-action="hall:tap"></canvas><p id="hallFilmText" aria-live="polite"></p></div>';document.body.appendChild(v);
 film={kind,beats,i:-1,t:0,bt:0,smith,lan,actors,view:v,cam:opt.cam,list:opt.list||[],done:opt.done,shown:0,line:null,odo:{}};next();M.ui.render?.();}
function stopFilm(){film?.view?.remove();film=null;}
function next(){const f=film;f.i++;f.bt=0;f.shown=0;f.ack=false;const b=f.beats[f.i];if(!b){const done=f.done;stopFilm();done?.();return;}const s=f.smith;s.forgePose='';s.traderPose=null;s.state='idle';if(b.do)b.do(f);f.line=b.say?{who:b.who||'s',text:b.say}:null;if(f.line?.who==='s'&&b.face==null&&!b.to&&f.lan&&b.lookLan)s.a=f.lan.x>=s.x?0:Math.PI;if(b.face!=null)s.a=b.face;f.move=b.to?{x:b.to[0],y:b.to[1],v:b.speed||38}:null;}
function stepFilm(dt){const f=film;if(!f)return;f.t+=dt;f.bt+=dt;const b=f.beats[f.i],s=f.smith;if(!b)return;
 let moving=false;if(f.move){const dx=f.move.x-s.x,dy=f.move.y-s.y,d=Math.hypot(dx,dy),st=f.move.v*dt;if(d<=st){s.x=f.move.x;s.y=f.move.y;f.move=null;}else{s.x+=dx/d*st;s.y+=dy/d*st;moving=true;if(Math.abs(dx)>.5)s.a=dx>0?0:Math.PI;}}
 s.state=moving?'move':b.state||'idle';s.moveSpeed=moving?10:0;if(moving){const o=f.odo;o.d=(o.d||0)+(f.move?.v||38)*dt;s.phase=o.d*.267;}else s.phase=f.t*4;
 if(b.pose)s.forgePose=b.pose;if(b.gesture){s.traderPose=b.gesture;s.gest=f.t*3;}M.beltPlan?.(s,f.t,[[-99,null]]);
 if(b.look)s.a=Math.floor(f.bt/(b.look))%2?0:Math.PI;
 if(f.line)f.shown+=dt;const read=!f.line||f.ack||f.shown>=need(f.line.text);if(!moving&&read&&f.bt>=(b.dur||0))next();paintFilm();}
function paintFilm(){const f=film;if(!f)return;const c=$('hallFilmCanvas');if(!c?.getContext)return;const g=c.getContext('2d'),VW=f.kind==='map'?360:330,VH=VW*420/660,WW=f.kind==='map'?900:HW,WH=f.kind==='map'?670:HH,k=c.width/VW,cx=Math.max(VW/2,Math.min(WW-VW/2,f.cam.x)),cy=Math.max(VH/2,Math.min(WH-VH/2,f.cam.y));
 g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;g.fillStyle='#0d1011';g.fillRect(0,0,c.width,c.height);g.save();g.scale(k,k);g.translate(-(cx-VW/2),-(cy-VH/2));
 if(f.kind==='map'){f.bg??=M.ludus.background();g.drawImage(f.bg,0,0);M.ludusOverlay?.(g,f.t);M.renderForgeActors(g,[...f.actors].sort((a,b)=>a.y-b.y));}
 else paintHall(g,f.list,f.t,{actors:f.actors.filter(a=>!a.hidden)});
 g.restore();
 const el=$('hallFilmBubble');if(el){if(!f.line){el.hidden=true;}else{const who=f.line.who==='s'?f.smith:f.lan,name=f.line.who==='s'?smithName():(S.lanista?.name||'Lanista'),key=name+'|'+f.line.text;if(el._key!==key){el._key=key;el.innerHTML='<b>'+esc(name)+'</b><span>'+esc(f.line.text)+'</span><i aria-hidden="true">▼</i>';}el.hidden=false;const tx=Math.max(5,Math.min(95,((who?.x??cx)-(cx-VW/2))*k/c.width*100)).toFixed(0)+'%';el.style.setProperty('--tail',tx);el.classList.toggle('waiting',f.shown>=need(f.line.text)*.6);}}
 const tl=$('hallFilmText'),line=f.line?(f.line.who==='s'?smithName():'Lanista')+': „'+f.line.text+'“':'';if(tl&&tl.textContent!==line)tl.textContent=line;}

// ---------- Das Tutorial ----------
const setStage=st=>{H().tut=st;M.persist?.();};
const done=()=>H().tut==='done';
function busy(){return !!S.battle||!!film||!!M.smithWrath?.scene||!!M.archerPlot?.scene||!!M.intro?.active?.()||!!window.ArenaTheoryIntro?.active?.()||!!document.querySelector('.smith-ceremony,#introView,#brandIntro')||!!M.forgeIntro?.scene||($('modal')&&!$('modal').hidden);}
const GX=GATE.x+47,GY=GATE.y+44;
// 3. Der Schmied zeigt das Tor
function playGate(){play('map',[
 {do:f=>{f.smith.a=0;},pose:'sip',dur:1.6},
 {dur:.5},
 {say:'So, Chef. Meine Schmiede kennst du jetzt. Wird Zeit, dass ich dir noch was Wichtiges zeige.',face:0},
 {say:'Die Halle der Gefallenen! Hier landen unsere größten Helden. Und die größten Vollidioten. Manchmal sogar beides.',face:Math.PI,gesture:'point'},
 {face:Math.PI,dur:1.2},
 {say:'Na los. Mach das Tor auf.',face:0}
],{label:'Das Tor der Gefallenen',smith:{x:262,y:250},lan:{x:300,y:236},cam:{x:186,y:240},done:()=>{setStage('open1');waitForGate();}});}
// 4. Die leere Heldenhalle
function playEmpty(){play('hall',[
 {to:[240,214],speed:34},
 {face:Math.PI,dur:1},{face:0,dur:1},{gesture:'shout',pose:'shake',dur:1.3},
 {say:'Hm.',gesture:'shout'},{dur:.9},
 {say:'Scheiße.'},
 {look:.8,dur:1.6},
 {say:'Kein einziger Toter. Wie soll ich dir denn jetzt erklären, wie der Laden funktioniert?',face:Math.PI},
 {pose:'inspect',dur:1.5},
 {say:'Ach, das kriegen wir hin.'},
 {to:[240,236],speed:30},
 {say:'Komm mit, Chef. Wir brauchen einen Freiwilligen.',face:0}
],{label:'Die leere Halle',smith:{x:240,y:330},cam:{x:240,y:140},list:[],done:()=>{setStage('exec');playExec();}});}
// 5./6. Der erste Rekrut und die Totenverwaltung (Durchteilung aus der Herumtreiber-Szene)
function recruit(){const h=H();if(h.recruit)return h.recruit;const rng=S.rng,g=M.makeGladiator(0);S.rng=rng;
 // Einmalig, kostenlos, nie aus dem Kader: sehr schwach, kaum Potenzial, keine Ausrüstung, keine besonderen Eigenschaften
 for(const k of Object.keys(g.stats||{}))g.stats[k]=Math.max(1,Math.round(g.stats[k]*.55));if(g.caps?.stats)for(const k of Object.keys(g.caps.stats))g.caps.stats[k]=Math.max(g.stats[k]||1,Math.round(g.caps.stats[k]*.6));
 g.potential=Math.round(4+Math.random()*10);g.traits=[];g.equipment={weapon:null,secondary:null,shield:null,armor:{}};g.fights=0;g.wins=0;g.losses=0;g.kills=0;g.highest=0;g.fame=0;g.hallRecruit=true;
 h.recruit=g;M.persist?.();return g;}
function playExec(){const g=recruit();if(!M.smithWrath?.startTutorial?.(g,()=>{finishExec(g);})){setStage('open2');waitForGate();}}
function finishExec(g){const h=H();if(h.tut!=='exec')return;h.tag[g.id]={title:'Das erste Opfer',epitaph:'Er kam. Er zitterte. Er wurde erklärt.',place:'Gladiatorenschule',tomb:1,tutorial:true};
 g.dead=false;M.kill(g,'Vom Schmied durchteilt',smithName());h.recruit=null;h.firstId=g.id;setStage('open2');M.ui.render();waitForGate();}
// 7. Zurück in die Halle: ein schiefer Stein, darüber der Geist
const firstEntry=()=>(S.fallen||[]).map(view).find(e=>String(e.id)===String(H().firstId))||(S.fallen||[]).map(view).find(e=>e.tutorial)||null;
function playVisit(){const e=firstEntry();if(!e){finishTutorial();return;}play('hall',[
 {to:[166,224],speed:40},
 {say:'Na bitte! Sieht doch gleich viel besser aus!',face:Math.PI},
 {say:'Unser erster Held. Ein kurzer, aber bemerkenswert erfolgloser Lebenslauf.',face:Math.PI,pose:'inspect'},
 {say:'Schauen wir uns den armen Bastard mal genauer an.',face:Math.PI,gesture:'point'}
],{label:'Das erste Grab',smith:{x:240,y:330},cam:{x:180,y:140},list:[e],done:()=>{camX=0;M.ui.click('nav:fallen');setTimeout(()=>{openDetail(e.id);guide(e);},150);}});}
// 10. Der Schmied erklärt den Eintrag: Bereiche werden nacheinander hervorgehoben
function guide(e){const steps=[['name','Hier steht sein Name. Falls du ihn vergessen hast. Ich hab’s jedenfalls schon.'],['values','Hier siehst du seine Werte. Unser Freund war ungefähr so gefährlich wie ein nasser Sack Mehl.'],['wins','Hier steht, wie viele Kämpfe er gewonnen und wie viele Gegner er erledigt hat.'],['wins','Tja. Immerhin hat er niemanden enttäuscht, der etwas von ihm erwartet hat.'],
 ['cause','Und hier steht, woran der gute Mann gestorben ist.'],['cause','„'+(e.cause||'Vom Schmied durchteilt')+'.“'],['cause','Tragischer Arbeitsunfall.'],['killer','Und hier steht, welcher widerwärtige Bastard dafür verantwortlich war.'],['killer','…'],['killer','Na, das ist ja eine bodenlose Unterstellung.'],
 ['tomb','Je größer der Held, desto prächtiger sein Grab. Die Besten kriegen Statuen, Gold und den ganzen Scheiß.'],['tomb','Der hier hatte Glück, dass wir noch einen Stein übrig hatten.']];
 let i=-1;const box=document.createElement('div');box.id='hallGuide';box.className='hall-guide';box.setAttribute('role','status');document.body.appendChild(box);
 const show=()=>{i++;document.querySelectorAll('.hall-hl').forEach(n=>n.classList.remove('hall-hl'));if(i>=steps.length||!$('modal')||$('modal').hidden){box.remove();M.ui.close?.();setTimeout(playFinale,200);return;}const [key,text]=steps[i],el=document.querySelector(`#modal [data-hl="${key}"]`);el?.classList.add('hall-hl');el?.scrollIntoView?.({block:'center',behavior:'smooth'});
  box.innerHTML=`<b>${esc(smithName())}</b><span>${esc(text)}</span><small>Tippen für weiter</small>`;box._at=performance.now();};
 box.addEventListener('click',()=>{if(performance.now()-box._at>350)show();});show();}
// 14. Abschluss vor dem Grab
function playFinale(){const e=firstEntry();play('hall',[
 {to:[166,226],speed:40},
 {say:'Merk dir eines, Chef.',face:0},
 {say:'Deine Männer werden kämpfen. Manche werden siegen. Manche werden zu verdammten Legenden.',face:0,gesture:'point'},
 {pose:'sip',dur:1.4},
 {say:'Aber irgendwann landen sie alle hier.',face:Math.PI},
 {say:'Und dann entscheidet sich, ob sie eine Statue bekommen ...',face:Math.PI},
 {dur:1},
 {say:'... oder ob irgendein besoffener Schmied ihnen einen Stein auf den Kopf stellt.',face:0},
 {dur:1},
 {say:'So. Genug geheult. Wir haben Arbeit.',face:0}
],{label:'Abschluss',smith:{x:240,y:330},cam:{x:200,y:140},list:e?[e]:[],done:finishTutorial});}
// Nach dem Abschluss kommt nach etwa zehn Sekunden auf dem Spielfeld der Sklavenhändler (seine Einführung zentriert die Kamera wie gehabt)
let traderWait=0;
function finishTutorial(){setStage('done');traderWait=10;hideHint();M.ui.click('nav:home');const b=document.createElement('div');b.className='hall-unlock';b.setAttribute('role','status');b.innerHTML='<div><b>HALL OF THE FALLEN FREIGESCHALTET</b><span>DEATH IS PERMANENT. LEGENDS ARE NOT FORGOTTEN.</span></div>';document.body.appendChild(b);const off=()=>b.remove();b.addEventListener('click',off);setTimeout(off,5200);}
// Warten auf den Klick ans Tor
function waitForGate(){if(M.ui.getPage()!=='home')M.ui.click('nav:home');setTimeout(()=>M.ludus?.focus?.(GX,GY,1.6),200);}
let hint=null;function showHint(text){if(!hint){hint=document.createElement('div');hint.id='hallHint';hint.className='hall-hint';hint.setAttribute('role','status');document.body.appendChild(hint);}if(hint.textContent!==text)hint.textContent=text;hint.hidden=false;}
function hideHint(){if(hint)hint.hidden=true;}
// Takt: startet, setzt fort, zeigt Hinweise
let settle=0,clock=0;
const tick=M.ludusTick;M.ludusTick=dt=>{tick?.(dt);if(traderWait>0&&!film&&M.ui.getPage()==='home'&&!document.hidden)traderWait=Math.max(0,traderWait-dt);if(film){hideHint();if(document.hidden)return;clock+=dt;if(clock>=1/30){stepFilm(Math.min(clock,.1));clock=0;}return;}
 const h=H(),st=h.tut,home=M.ui.getPage()==='home';
 if((st==='open1'||st==='open2')&&home&&!busy())showHint(st==='open1'?'Klicke auf das Tor der HALL OF THE FALLEN.':'Besuche die HALL OF THE FALLEN.');else hideHint();
 if(st==='done'||M.benchmarkActive||!S.lanista)return;
 if(st===''){const F=W(),T=M.trader?.state;if(!F?.master||F.intro!=='done')return;if((S.fallen||[]).length){setStage('done');return;}if(T&&T.intro==='active')return;if(!home||busy()){settle=0;return;}settle+=dt;if(settle>1.2){settle=0;setStage('gate1');playGate();}return;}
 // Fortsetzen nach Neuladen oder Unterbrechung: laufende Szenen beginnen von vorn, gespeicherter Rekrut bleibt derselbe
 if(!home||busy())return;settle+=dt;if(settle<1)return;settle=0;
 if(st==='gate1')playGate();else if(st==='empty')playEmpty();else if(st==='exec')playExec();else if(st==='visit')playVisit();};
const click=M.schoolClick;M.schoolClick=action=>{if(action==='hall:tap'){if(film?.line)film.ack=true;return true;}
 if(action.startsWith('hall:open:')){openDetail(action.slice(10));return true;}
 if(action.startsWith('hall:pan:')){camTo=Math.max(0,Math.min(maxCam((S.fallen||[]).length),(camTo??camX)+(Number(action.slice(9))||0)*HW*.8));return true;}
 return click(action);};
// Musik: in der Halle immer „Aula Lorum“; im Tutorial die Schmied-Musik ab dem Durchteilen, bis man wieder in die Halle geht; sonst Stadtmusik
function music(){if(film)return film.kind==='hall'?'hall':'home';if(M.ui.getPage?.()==='fallen')return 'hall';const st=H().tut,sc=M.smithWrath?.scene;if(sc?.p?.tut)return sc.t>=(sc.p.kills[0]?.swing??1e9)?'smith':'home';if(st==='open2')return 'smith';if(gateAnim&&st==='open1')return 'home';return '';}
M.hall={traderReady:()=>done()&&traderWait<=0,get traderWait(){return traderWait;},music,play:{gate:playGate,empty:playEmpty,exec:playExec,visit:playVisit,finale:playFinale,finish:finishTutorial},guide,tierFor,entries,openDetail,paintHall,hallBg,sprite,state:H,get film(){return film;},stepFilm,done,setStage,recruit,TOMBS,slots:SLOTS,start:()=>{if(!H().tut){setStage('gate1');playGate();}}};
})();
