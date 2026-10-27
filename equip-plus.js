'use strict';
// =====================================================================================================
// AUSRÜSTEN: direkt zur Ausrüstungspuppe, schönere Waffenkammer, lebendige Figur, Platz für besondere Gegenstände
// · „AUSRÜSTEN“ (überall: Kaserne, Profil, Markt …) öffnet die Waffenkammer und springt sofort zur Ausrüstungspuppe.
//   Die Auswahl „Klasse/Sortierung/Gladiator“ rückt unter die Puppe; oben Name, KW und Pfeile zum vorigen/nächsten Gladiator.
// · Die Figur in der Mitte atmet, schaut sich um und macht ab und zu eine Geste (Waffe hoch, zeigen, brüllen, Brust raus).
//   Gezeichnet mit der Figur des Spiels (M.renderForgeActors) und der echten angelegten Ausrüstung.
// · Platz „Besonderer Gegenstand“: Trophäen der Berüchtigten (relics.js) anlegen; +2 auf die Waffe des Anführers.
// Die Plätze selbst (Antippen → passende Gegenstände aus dem Lager) sind die des Spiels und funktionieren unverändert.
// =====================================================================================================
(()=>{
const M=window.MG;if(!M)return;const S=M.s;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let jump=false,figure=null,lastId=null;
const baseClick=M.schoolClick;
M.schoolClick=function(a){if(typeof a==='string'&&a.startsWith('loadout:')){jump=true;lastId=a.split(':')[1];}return baseClick?.apply(this,arguments);};
const basePage=M.schoolPage;
M.schoolPage=function(p){const html=basePage?.apply(this,arguments);if(p==='equipment')setTimeout(enhance,0);return html;};
function gladiatorOnPage(){// Die Seite zeigt den zuletzt gewählten Gladiator; sein Name steht im Auswahlfeld
 const byId=S.roster.find(g=>g.id===lastId&&!g.dead);const opt=document.querySelector('.fighter-switch select option:checked');const name=opt?.textContent?.split(' · ')[0]?.trim();return S.roster.find(g=>g.name===name&&!g.dead)||byId||null;}
function enhance(){const doll=document.querySelector('.paperdoll');if(!doll||doll.dataset.plus)return;doll.dataset.plus='1';const g=gladiatorOnPage();
 doll.classList.add('armory');
 // Besonderer Gegenstand (leer, gesperrt)
 if(window.MGRelics&&g)window.MGRelics.mountSlot(doll,g);/* Trophäen der Berüchtigten (relics.js) */
 else if(!doll.querySelector('.doll-special')){const s=document.createElement('div');s.className='doll-slot doll-special';s.style.gridArea='empty';s.setAttribute('aria-disabled','true');
  s.innerHTML='<span class="special-icon" aria-hidden="true"></span><span class="eyebrow">Besonderer Gegenstand</span><strong>NOCH LEER</strong><small>nur Optik · z. B. Löwenhelm · bald</small>';doll.appendChild(s);}
 // Kopfzeile mit Name, KW und Blättern
 if(g&&!document.querySelector('.armory-head')){const pool=S.roster.filter(x=>!x.dead&&!x.retired),i=pool.indexOf(g),prev=pool[(i-1+pool.length)%pool.length],next=pool[(i+1)%pool.length];let kw='';try{kw=M.power(g);}catch{}
  const h=document.createElement('div');h.className='armory-head';h.innerHTML=`<button class="btn small" data-action="loadout:${prev?.id||g.id}" aria-label="Voriger Gladiator">◀</button><div><b>${esc(g.name)}</b><small>${esc(g.role||'')} · KW ${kw}</small></div><button class="btn small" data-action="loadout:${next?.id||g.id}" aria-label="Nächster Gladiator">▶</button>`;doll.before(h);}
 // Schnellknöpfe: aus der Waffenkammer / vom Schmied ausrüsten
 if(g&&M.equipQuick&&!document.querySelector('.eq-bar')){const w=document.createElement('div');w.innerHTML=M.equipQuick.bar(g);doll.before(w.firstElementChild);}
 // Auswahlkasten unter die Puppe
 const sw=document.querySelector('.fighter-switch');if(sw&&doll.nextElementSibling!==sw){const tb=sw.nextElementSibling?.classList?.contains('toolbar')?sw.nextElementSibling:null;doll.after(sw);if(tb)doll.after(tb);}
 // Lebendige Figur
 const old=document.getElementById('equipmentFigure');if(old&&g){const cv=document.createElement('canvas');cv.width=300;cv.height=390;cv.className='armory-figure';cv.setAttribute('aria-label',old.getAttribute('aria-label')||'Gladiator');old.replaceWith(cv);cv.id='equipmentFigure';figure={cv,g,t0:performance.now(),next:2.5,gesture:null,face:0};}
 if(jump){jump=false;const top=document.querySelector('.armory-head')||doll;setTimeout(()=>{const y=top.getBoundingClientRect().top+window.scrollY-70;window.scrollTo({top:Math.max(0,y),behavior:'instant'});},30);}}
// Gesten: [Name, Dauer, Pose]
const GESTURES0=[['salute',1.6,{state:'celebrate'}],['point',1.4,{traderPose:'point',gest:0}],['roar',1.2,{shout:1}],['look',1.6,{look:1}],['flex',1.4,{traderPose:'pat',gest:0}],['inspect',1.6,{forgePose:'inspect'}]];
const GESTURES=GESTURES0;
function paint(now){requestAnimationFrame(paint);const F=figure;if(!F)return;if(!F.cv.isConnected){figure=null;return;}const t=(now-F.t0)/1000,g=F.g;
 if(!F.gesture&&t>F.next){const G=GESTURES[Math.floor(Math.random()*GESTURES.length)];F.gesture={G,start:t};}
 if(F.gesture&&t-F.gesture.start>F.gesture.G[1]){F.gesture=null;F.next=t+2.5+Math.random()*3;}
 const P=F.gesture?.G[2]||{},k=F.gesture?Math.min(1,(t-F.gesture.start)/.25):0;
 const a={id:'equip-fig',g,team:0,x:0,y:0,a:P.look?(Math.sin((t-F.gesture.start)*4)>0?Math.PI:0):0,phase:t*.6,state:P.state||'idle',energy:100,ammo:8,moveSpeed:0,noNav:true,bloodMarks:{},
  traderPose:P.traderPose||null,gest:P.gest,forgePose:P.forgePose||'',shoutTimer:P.shout?.5:0,poseK:k,stagger:0,facePain:0};
 const c=F.cv.getContext('2d'),W=300,H=390;c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;
 // Bühne: Spot, Podest
 const bg=c.createRadialGradient(150,250,20,150,250,230);bg.addColorStop(0,'#3a3426');bg.addColorStop(1,'#141c1f');c.fillStyle=bg;c.fillRect(0,0,W,H);
 c.fillStyle='rgba(255,220,150,.07)';c.beginPath();c.moveTo(110,0);c.lineTo(190,0);c.lineTo(250,360);c.lineTo(50,360);c.closePath();c.fill();
 c.fillStyle='#4a3e2c';c.fillRect(70,352,160,14);c.fillStyle='#6b5a3e';c.fillRect(70,352,160,3);c.fillStyle='#2a2318';c.fillRect(78,366,144,8);
 c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(150,353,48,6,0,0,7);c.fill();
 const kk=3.7*(g.height||180)/180/.6,wide=Math.max(.98,Math.min(1.18,.85+(g.weight||80)/420)),breath=Math.sin(t*2.2)*1.2;
 c.save();c.translate(150,352);c.scale(kk*wide,kk);c.translate(0,-Math.max(0,breath)*.08);try{M.renderForgeActors(c,[a]);}catch(e){}c.restore();
 // Glanzpunkte im Licht
 for(let i=0;i<5;i++){const x=(i*61+t*14)%W,y=(i*97+t*9)%340;c.fillStyle='rgba(255,236,190,'+(.08+.06*Math.sin(t*2+i))+')';c.fillRect(x,y,2,2);}}
requestAnimationFrame(paint);
window.EQUIP_PLUS_READY=true;
})();
