'use strict';
// KAMPF-HUD: Kampfbildschirm für alle Kämpfe bis 40 Kämpfer (darüber bleibt die bisherige Anzeige)
// Teilt den Kampfbildschirm: oben das Feld, darunter (Querformat: daneben) die Info-Tafel. Nichts liegt mehr über den Kämpfern.
// Die Tafel zeigt beide Mannschaften, beim Antippen eines Kämpfers dessen genauen Zustand, und sie ist die Fläche für die
// Nahaufnahmen der Verletzungen (injury-shots.js). Reine Darstellung: liest den Kampf nur mit.
(()=>{
const M=window.MG;if(!M||!M.injuryShots)return;const S=M.s,$=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const GRADE=['Kratzer','Leicht','Mittel','Schwer','Kritisch','Verloren'];
let panel=null,key='',sel=null,autoCam=true,cam=null,shotOn=false,logKey='';
const first=g=>{const n=String(g.name||'');return n.length<=11?n:n.split(' ')[0];};
// Der Löwe (Rex Vetus) hat eigene Lebenswerte und eigene Zustände
const REXDO={stalk:'Schleicht um die Beute',crouch:'Duckt sich zum Sprung',leap:'Springt',swipe:'Schlägt mit der Pranke',drag:'Schleift sein Opfer durch den Sand',maul:'Zerfleischt sein Opfer',roar:'Brüllt',threaten:'Droht',snarl:'Faucht',sprint:'Rennt',evade:'Weicht aus',recoil:'Zuckt zurück',recover:'Sammelt sich'};
const vital=a=>{if(!a.rex)return M.health(a.g);const sum=Object.values(a.tissue||{}).reduce((n,v)=>n+Math.max(0,v),0);a._t0=Math.max(a._t0||0,sum);return a._t0?100*sum/a._t0:100;},blood=a=>a.rex?(a.blood??100):a.g.blood;
const state=a=>a.rex&&!a.g.dead?(REXDO[a.mode]||''):a.g.dead?'Gefallen':a.down?'K.O.':a.surrendered?'Aufgabe':a.fallTimer>0?'Am Boden':a.kneeTimer>0?'Auf den Knien':a.netTimer>0?'Im Netz':a.stagger>0?'Taumelt':a.state==='reload'?'Lädt':a.g.blood<55?'Blutet stark':a.energy<20?'Erschöpft':a.wind>0?'Greift an':'';
// Was der Kämpfer gerade tut (aus dem Zustand der Simulation), mit Ziel
function doing(a,b){if(a.rex&&!a.g.dead)return REXDO[a.mode]||'Lauert';const t=b.actors.find(x=>x.id===a.target),to=t&&!t.g.dead?' '+t.g.name:'';if(a.g.dead)return 'Gefallen';if(a.down)return 'Kampfunfähig'+(a.reason?': '+a.reason:'');if(a.surrendered)return 'Hat aufgegeben';
 if(a.state==='reload')return 'Spannt die Armbrust';if(a.state==='rising')return 'Steht wieder auf';if(a.fallTimer>0)return 'Ist gestürzt';if(a.kneeTimer>0)return 'Ist auf die Knie gegangen';if(a.wipeTimer>0)return 'Reibt sich Sand aus den Augen';if(a.blindTimer>0)return 'Sieht kaum etwas';if(a.rearFinish)return 'Packt'+(to||' den Gegner')+' von hinten';if(a.grabbedBy)return 'Wird festgehalten';if(a.netTimer>0)return 'Hängt im Netz';if(a.stagger>0)return 'Taumelt';
 if(a.shieldBashTimer>0)return 'Schildstoß gegen'+(to||' den Gegner');if(a.kickTimer>0)return 'Tritt nach'+(to||' dem Gegner');if(a.dodgeTimer>0)return 'Weicht aus';if(a.state==='backstep')return 'Springt zurück';if(a.retreat>0)return 'Flieht'+(to?' vor'+to:'');if(a.state==='flank')return 'Umgeht'+(to||' den Gegner')+' von der Seite';if(a.state==='charge')return 'Stürmt auf'+(to||' den Gegner')+' zu';
 if(a.wind>0||a.swing>0)return 'Greift'+(to||'')+' an';if(a.block)return 'Blockt';if(a.aid)return 'Versorgt eine Wunde';if(a.moveSpeed>8)return to?'Rückt auf'+to+' vor':'Ist in Bewegung';return to?'Belauert'+to:'Wartet ab';}
const feel=a=>{const m=a.g.stats?.morale??50;return m>=75?'siegessicher':m>=55?'entschlossen':m>=38?'unsicher':m>=22?'verängstigt':'gebrochen';};
// Stand des Kampfes: Kampfkraft derer, die noch stehen (Gesundheit × Blut), je Seite
const might=(b,t)=>b.actors.filter(a=>a.team===t&&!a.g.dead&&!a.down&&!a.surrendered).reduce((n,a)=>n+vital(a)*(.4+.6*blood(a)/100)*(a.rex?5:1),0);
const hurt=g=>Object.entries(g.body).filter(([,p])=>p.missing||p.fracture||p.internal||p.bleed>0||p.hp<100-(p.chronic||0)).sort((x,y)=>M.injuryGrade(y[1])-M.injuryGrade(x[1]));
const worst=g=>hurt(g).filter(([,p])=>p.missing||M.injuryGrade(p)>=3).length;
const bar=(cls,id,label)=>`<div class="bh-bar ${cls}"><i id="${id}"></i><span>${label}</span></div>`;
function build(b){panel?.remove();panel=document.createElement('div');panel.id='bhud';
 const team=t=>`<div class="bh-team t${t}">${b.actors.filter(a=>a.team===t).map(a=>`<button type="button" class="bh-chip" id="bhc-${a.id}" data-bh="pick:${a.id}"><canvas id="bhp-${a.id}" width="80" height="100"></canvas><b>${esc(first(a.g))}</b><div class="bh-mini"><i class="h" id="bhh-${a.id}"></i></div><div class="bh-mini"><i class="b" id="bhb-${a.id}"></i></div><small id="bhs-${a.id}"></small><em id="bhw-${a.id}" hidden></em></button>`).join('')}</div>`;
 panel.innerHTML=`<div class="bh-head"><span class="bh-name t0"><b>BLAU · ${esc(b.benchmark?'TESTTEAM':S.schoolName)}</b><i id="bhAlive0"></i></span><strong id="bhClock">0:00</strong><span class="bh-name t1"><b>${esc(b.benchmark?'TESTTEAM':b.opponent||'GEGNER')} · ROT</b><i id="bhAlive1"></i></span></div>
<div class="bh-lead" id="bhLead"><i id="bhLead0"></i><i id="bhLead1"></i><b id="bhLeadText"></b></div>
<div class="bh-body"><div class="bh-stage" id="bhStage"><canvas id="bhShot" width="660" height="340" hidden></canvas><div class="bh-log" id="bhLog"></div></div><div class="bh-main"><div class="bh-teams${b.actors.length>12?' many':''}">${team(0)}${team(1)}</div><div class="bh-detail" id="bhDetail" hidden></div></div></div>
<div class="bh-opts"><button type="button" class="btn small" data-bh="cam" id="bhCam"></button><button type="button" class="btn small" data-bh="level" id="bhLevel"></button><button type="button" class="btn small" data-bh="who" id="bhWho"></button></div>`;
 const view=$('battleView');view.insertBefore(panel,$('battleBottom'));sel=null;cam=null;try{M.battleHud?.onBuild?.(panel,b);}catch(ex){console.error(ex);}}
function detail(a){const g=a.g,w=a.rex?{name:'Pranken und Gebiss'}:M.weapon(a),ef=M.effective(a),list=a.rex?[]:hurt(g),bleed=Object.values(g.body).reduce((n,p)=>n+(p.bleed||0),0);
 if(!$('bhDetailBody')||$('bhDetail').dataset.id!==a.id){$('bhDetail').dataset.id=a.id;$('bhDetail').dataset.team=a.team;$('bhDetail').innerHTML=`<header><button type="button" class="btn small" data-bh="back">‹ ALLE</button><canvas id="bhDetailFace" width="80" height="100"></canvas><div><h4>${esc(g.name)}</h4><p>${esc(g.role||'')} · ${a.team?'Team Rot':'Team Blau'}${S.battle.leaders?.[a.team]===a.id?' · Anführer':''}</p></div></header><div id="bhDetailBody"></div>`;if(a.rex){const fc=$('bhDetailFace'),src=$('bhp-'+a.id);fc.width=80;fc.height=100;if(src)fc.getContext('2d').drawImage(src,0,0);}else M.renderPortrait($('bhDetailFace'),{...a.g,dead:false,bisected:false},{...a,down:false,fallTimer:0,state:'idle'});}
 return `<div class="bh-now"><p><span>Tut gerade</span><b>${esc(doing(a,S.battle))}</b></p><p><span>Stimmung</span><b>${esc(M.expressionLabel(M.expression(a)))} · ${feel(a)} (Moral ${Math.round(a.g.stats?.morale??0)})</b></p></div>
<div class="bh-bars">${bar('h','bhdH','Gesundheit '+Math.round(vital(a))+' %')}${bar('b','bhdB','Blut '+Math.round(blood(a))+' %'+(bleed>0&&!a.rex?' · blutet':''))}${bar('e','bhdE','Ausdauer '+Math.round(100*a.energy/(ef.maxEnergy||100))+' %')}</div>
<p class="bh-line">Waffe: <b>${esc(w.name||'Fäuste')}</b> · Schaden ausgeteilt ${Math.round(a.damage||0)} · erlitten ${Math.round(a.taken||0)}</p>
<ul class="bh-wounds">${list.length?list.map(([id,p])=>{const gr=M.injuryGrade(p);return `<li class="g${gr}"><b>${esc(M.partName(id))}</b><span>${esc(p.missing?'Abgetrennt':p.injury||'Verletzt')}</span><i>${p.missing?'verloren':'Grad '+gr+' · '+GRADE[gr]}${p.fracture?' · Bruch':''}${p.chronic>0?' · Dauerschaden':''}${p.bleed>0?' · blutet':''}</i></li>`;}).join(''):'<li class="g0"><b>Unverletzt</b><span>Keine Wunde.</span><i></i></li>'}</ul>`;}
const width=(id,v)=>{const el=$(id);if(el){const w=Math.max(0,Math.min(100,Math.round(v)))+'%';if(el.style.width!==w)el.style.width=w;}};
const text=(id,v)=>{const el=$(id);if(el&&el.textContent!==v)el.textContent=v;};
let detailKey='';
function update(){const b=S.battle,view=$('battleView');if(!b||!view||view.hidden||b.actors.length>40){if(document.body.classList.contains('bhud')){document.body.classList.remove('bhud');panel?.remove();panel=null;key='';}return;}
 const k=b.id+':'+b.actors.length;if(k!==key||!panel?.isConnected){key=k;build(b);document.body.classList.add('bhud');}
 const fieldH=$('arenaCanvas').getBoundingClientRect().height;view.style.setProperty('--bhf',Math.round(fieldH)+'px');
 text('bhClock',Math.floor(b.time/60)+':'+String(Math.floor(b.time%60)).padStart(2,'0'));
 {const m0=might(b,0),m1=might(b,1),sum=m0+m1||1,p=Math.round(100*m0/sum);width('bhLead0',p);width('bhLead1',100-p);text('bhLeadText',Math.abs(p-50)<4?'AUSGEGLICHEN':(p>50?'BLAU':'ROT')+' FÜHRT · '+Math.max(p,100-p)+' %');const L=$('bhLead'),c=Math.abs(p-50)<4?'even':p>50?'t0':'t1';if(L&&L.dataset.c!==c)L.dataset.c=c;}
 for(const t of [0,1]){const all=b.actors.filter(a=>a.team===t),up=all.filter(a=>!a.g.dead&&!a.down&&!a.surrendered).length;text('bhAlive'+t,up+' / '+all.length+' stehen');}
 for(const a of b.actors){const el=$('bhc-'+a.id);if(!el)continue;const cls='bh-chip'+(a.g.dead?' dead':a.down?' down':'')+(sel===a.id?' sel':'')+(b.leaders?.[a.team]===a.id?' hero':'');if(el.className!==cls)el.className=cls;
  width('bhh-'+a.id,vital(a));width('bhb-'+a.id,blood(a));text('bhs-'+a.id,doing(a,b));const n=a.rex?0:worst(a.g),w=$('bhw-'+a.id);if(w){if(w.hidden!==!n)w.hidden=!n;text('bhw-'+a.id,n?'✚'+n:'');}
  const c=$('bhp-'+a.id),pk=[M.expression(a),a.g.dead,a.g.body.head.missing].join(':');if(c&&a.rex){if(c.dataset.pk!=='rex'){c.dataset.pk='rex';c.width=80;c.height=100;const q=c.getContext('2d');q.imageSmoothingEnabled=false;q.fillStyle='#b38c54';q.fillRect(0,0,80,100);q.save();q.translate(46,74);q.scale(.9,.9);try{M.drawRex(q,{...a,x:0,y:0,z:0,mode:'threaten',a:Math.PI,split:null});}catch{}q.restore();}}else if(c&&c.dataset.pk!==pk){c.dataset.pk=pk;M.renderPortrait(c,{...a.g,dead:false,bisected:false},{...a,down:false,fallTimer:0,neckFinishTimer:0,state:a.g.dead?'idle':a.state});}}
 const d=$('bhDetail'),a=b.actors.find(x=>x.id===sel);if(d){const show=!!a;if(d.hidden===show)d.hidden=!show;panel.querySelector('.bh-teams').hidden=show;
  if(show){const dk=[a.id,doing(a,b),M.expression(a),Math.round((a.g.stats?.morale??0)/3),Math.round(vital(a)),Math.round(blood(a)),Math.round(a.energy/5),hurt(a.g).map(([id,p])=>id+M.injuryGrade(p)+(p.injury||'')).join('|')].join(':');if(dk!==detailKey){detailKey=dk;const html=detail(a);$('bhDetailBody').innerHTML=html;width('bhdH',vital(a));width('bhdB',blood(a));width('bhdE',100*a.energy/(M.effective(a).maxEnergy||100));}}else detailKey='';}
 const lg=$('bhLog');if(lg){const rows=(b.log||[]).slice(0,5),lk=rows.map(l=>l.time+l.text).join('|');if(lk!==logKey){logKey=lk;lg.innerHTML='<h5>LETZTE EREIGNISSE</h5>'+(rows.length?rows.map(l=>`<p><i>${Math.floor(l.time/60)}:${String(Math.floor(l.time%60)).padStart(2,'0')}</i> ${esc(l.text)}</p>`).join(''):'<p>Der Kampf beginnt.</p>');}}
 text('bhCam','KAMERA: '+(autoCam?'FOLGT DEN KÄMPFERN':'GANZES FELD'));text('bhLevel','EINBLENDEN: '+(M.injuryShots.mode()==='off'?'AUS':M.injuryShots.level()==='all'?'JEDE VERLETZUNG':'NUR SCHWERE'));text('bhWho','BEI: '+({all:'ALLEN',own:'EIGENEN',key:'WICHTIGEN',off:'–'})[M.injuryShots.mode()]);}
// Nahaufnahmen erscheinen in der Tafel; Antippen des Feldes oder der Tafel überspringt
M.injuryShots.config.host=()=>document.body.classList.contains('bhud')?$('bhShot'):null;
M.injuryShots.config.onShot=(on,o,live)=>{shotOn=on;const c=$('bhShot'),st=$('bhStage');if(c&&st){st.classList.toggle('on',on);st.classList.toggle('big',on&&o?.kind==='death');c.hidden=!on;if(on){const r=st.getBoundingClientRect();c.width=660;c.height=Math.max(240,Math.round(660*r.height/Math.max(1,r.width)));}}document.body.classList.toggle('bhud-shot',on&&!live);update();};
M.injuryShots.config.textScale=1.35; // kleines Fenster: Schrift größer
document.addEventListener('click',e=>{if(shotOn&&e.target.closest?.('#arenaCanvas,#bhShot')){M.injuryShots.skip();return;}
 const el=e.target.closest?.('[data-bh]');if(!el)return;const [cmd,id]=el.dataset.bh.split(':');
 if(cmd==='pick'){sel=sel===id?null:id;M.focus?.(sel);}else if(cmd==='back'){sel=null;M.focus?.(null);}
 else if(cmd==='cam'){autoCam=!autoCam;cam=null;}
 else if(cmd==='level'){const o=S.options;if(M.injuryShots.mode()==='off'){o.closeups='all';o.closeupLevel='severe';}else if(M.injuryShots.level()==='severe')o.closeupLevel='all';else o.closeups='off';}
 else if(cmd==='who'){const o=S.options,order=['all','own','key'];if(o.closeups==='off')return;o.closeups=order[(order.indexOf(M.injuryShots.mode())+1)%3];}
 update();},true);
// Kamera: Ausschnitt um alle, die noch stehen oder liegen und leben; weich nachgeführt. Bei ausgewähltem Kämpfer bleibt er im Bild.
M.battleCamera=(b,w,h,W,H,zoom,target)=>{const sp=M.battleHud?.spot;if(sp&&document.body.classList.contains('bhud')){/* Scheinwerfer des Moderators: nah an einen Kämpfer */const base=Math.min(w/W,h/H),z=2.3,vw=w/(base*z),vh=h/(base*z),tx=Math.max(vw/2,Math.min(W-vw/2,sp.x)),ty=Math.max(vh/2,Math.min(H-vh/2,sp.y));if(!cam)cam={x:tx,y:ty,zoom:z};else{cam.x+=(tx-cam.x)*.1;cam.y+=(ty-cam.y)*.1;cam.zoom+=(z-cam.zoom)*.08;}return cam;}
 if(!document.body.classList.contains('bhud')||!autoCam||zoom>1||b.finale||b.cinematic)return (cam=null);
 const live=b.actors.filter(a=>!a.g.dead&&!a.surrendered);if(!live.length)return (cam=null);
 let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const a of live){x0=Math.min(x0,a.x);x1=Math.max(x1,a.x);y0=Math.min(y0,a.y-50);y1=Math.max(y1,a.y+20);}
 const pad=90,bw=Math.max(260,x1-x0+pad*2),bh=Math.max(190,y1-y0+pad*2),base=Math.min(w/W,h/H),want=Math.min(w/bw,h/bh)/base,z=Math.max(1,Math.min(2.1,want)),vw=w/(base*z),vh=h/(base*z);
 const tx=vw>=W?W/2:Math.max(vw/2,Math.min(W-vw/2,(x0+x1)/2)),ty=vh>=H?H/2:Math.max(vh/2,Math.min(H-vh/2,(y0+y1)/2));
 if(!cam)cam={x:tx,y:ty,zoom:z};else{const k=.06;cam.x+=(tx-cam.x)*k;cam.y+=(ty-cam.y)*k;cam.zoom+=(z-cam.zoom)*(z<cam.zoom?.12:.03);}return cam;};
// Farbige Kreise am Boden: Blau links, Rot rechts, in jedem Kampf gleich
M.battleUnderlay=(g,b)=>{if(!document.body.classList.contains('bhud'))return;for(const a of b.actors){if(a.g.dead)continue;const c=a.team?'#e0524a':'#4aa6e0';g.save();g.globalAlpha=a.down||a.surrendered?.4:.95;g.lineWidth=a.id===sel?4.5:3;g.strokeStyle=c;g.beginPath();g.ellipse(a.x,a.y+5,21,9,0,0,Math.PI*2);g.stroke();g.globalAlpha*=.22;g.fillStyle=c;g.fill();g.restore();}};
const hud=M.updateBattleHUD;M.updateBattleHUD=function(){const r=hud?.apply(this,arguments);try{update();}catch(ex){console.error(ex);}return r;};
setInterval(()=>{const on=document.body.classList.contains('bhud');if((!S.battle&&on)||(S.battle&&!on&&$('battleView')?.hidden===false))update();},120);
M.battleHud={spot:null,onBuild:null,might,doing,vital,blood,pick:id=>{sel=id;M.focus?.(id);update();},update,get panel(){return panel;},get selected(){return sel;}};
})();
