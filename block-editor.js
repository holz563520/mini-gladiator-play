'use strict';
// =====================================================================================================
// BLOCK-EDITOR (block-editor.html) – Testseite für sichtbares Blocken mit Schild und Waffe.
// Nutzt nur den echten Waffen-Zeichner (weapon-art.js), die Waffendaten (data.js) und den Kampfsound-Erzeuger
// (kampfsound.js). Kein Zugriff auf Spielstände, keine Änderung an Spielregeln.
// Kernidee: Der Verteidiger stellt Schild oder Waffe genau an die Stelle, durch die der Schlag gleich fährt.
// Geblockt ist erst, wenn sich Angriffswaffe und Schild/Waffe in diesem Bild tatsächlich schneiden.
// =====================================================================================================
(()=>{
const M=window.MG,ART=M.weaponArt,KS=window.KampfSound;
const W=288,H=162,GROUND=140,WALL=82,TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),lerp=(a,b,t)=>a+(b-a)*t,smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const lerpA=(a,b,t)=>{let d=((b-a+Math.PI)%TAU+TAU)%TAU-Math.PI;return a+d*t;};
const $=id=>document.getElementById(id);
const cv=$('stage'),ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;

// ---------------------------------------------------------------- Waffen, Schilde, Materialien
const MELEE=M.weaponDefs.filter(w=>!w.ammo&&w.id!=='net');
const WD=Object.fromEntries(M.weaponDefs.map(w=>[w.id,w]));
const SHIELDS=M.shieldDefs||[];
const SD=Object.fromEntries(SHIELDS.map(s=>[s.id,s]));
const BLADES=new Set(['dagger','short','gladius','long','greatsword']);
const HEAD={axe:.72,doubleaxe:.68,mace:.68,hammer:.72,spear:.84,trident:.72,halberd:.66,club:0};
const BLUNT=new Set(['club','mace','hammer']),AXES=new Set(['axe','doubleaxe']),POLES=new Set(['spear','trident','halberd']);
const SH_SIZE={buckler:[5,4],smallshield:[7,5],roundshield:[9,6],scutum:[13,6],tower:[16,7]};// halbe Höhe, halbe Breite
const items={};for(const w of MELEE)items[w.id]=M.makeItem('weapon',w.id,3);
const GEO={};// Länge der Waffe ab Griffpunkt, gemessen am echten Sprite
for(const w of MELEE){const s=ART.sprite(items[w.id],0,0),c=s.canvas,d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let mn=1e9,mx=-1;
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>40){if(x<mn)mn=x;if(x>mx)mx=x;}
 GEO[w.id]={tip:Math.max(10,mx-s.ox+1),butt:Math.min(-2,mn-s.ox)};}

function weaponPart(id,u){// u: 0 Griff … 1 Spitze
 if(id==='club')return{mat:'wood',part:'Keule'};
 if(BLADES.has(id))return u<.16?{mat:'metal',part:'Parierstange'}:{mat:'metal',part:'Klinge'};
 if(u>=HEAD[id])return{mat:'metal',part:BLUNT.has(id)?'Kopf':AXES.has(id)?'Axtblatt':id==='halberd'?'Beil':'Spitze',head:true};
 return{mat:'wood',part:'Stiel'};}
function shieldPart(id,r){// r: 0 Mitte … 1 Rand
 if(id==='buckler')return{mat:'metal',part:'Faustschild',kind:'buckler'};
 if(r<.22)return{mat:'metal',part:'Schildbuckel',kind:'boss'};
 if(r>.84&&(id==='smallshield'||id==='roundshield'))return{mat:'metal',part:'Schildrand',kind:'rim'};
 return{mat:'wood',part:'Holzschild',kind:'wood'};}

// ---------------------------------------------------------------- Schlagarten (Hand relativ zur Schulter, Winkel 0 = nach vorn)
const REST={x:6,y:5,a:-.75},REST_S={x:7,y:4,t:.05};
const TECH={
 slash:{name:'Hieb',wind:{x:-8,y:-4,a:-2.0},end:{x:13,y:3,a:.6},step:4},
 overhead:{name:'Überkopf',wind:{x:-2,y:-15,a:-3.0},end:{x:12,y:6,a:1.15},step:5},
 thrust:{name:'Stich',wind:{x:-9,y:0,a:-.08},end:{x:17,y:-1,a:.02},step:8},
 spin:{name:'Wirbel',wind:{x:-9,y:3,a:-2.75},end:{x:14,y:8,a:.62},step:6,spin:true}};
const TECH_ORDER=['slash','overhead','thrust','spin'];
// Zeiten wie im Spiel (sim.js: Ausholen 0,20 s + 0,035 s je kg, Überkopf +0,14 s; Schlag 0,30/0,44/0,50 s)
const windTime=(w,tech,blk)=>Math.max(.16,(.20+w.weight*.035)*(1-blk*.003)+(tech==='overhead'?.14:0));
const swingTime=(w,tech)=>tech==='overhead'?.5:w.weight>=5?.44:.3;

const SHW={x:-1,y:-39},SHS={x:3,y:-38};// Waffen- und Schildschulter, relativ zu den Füßen
const ARM=16,ARM_S=19,ARM_P=19;
function attackPose(tech,phase,p){const T=TECH[tech];if(phase==='wind'){const e=smooth(p);return{x:lerp(REST.x,T.wind.x,e),y:lerp(REST.y,T.wind.y,e),a:lerpA(REST.a,T.wind.a,e)};}
 const e=smooth(p);return{x:lerp(T.wind.x,T.end.x,e),y:lerp(T.wind.y,T.end.y,e),a:lerp(T.wind.a,T.end.a,e)};}

// ---------------------------------------------------------------- Kämpfer
function fighter(team){return{team,x:0,face:1,back:0,lean:0,flash:0,hurt:0,wid:'gladius',sid:null,pose:{...REST},sp:{...REST_S},flip:false,guard:null};}
const A=fighter(0),D=fighter(1);
const world=(f,lx,ly)=>{const c=Math.cos(f.lean),s=Math.sin(f.lean),rx=lx*c-ly*s,ry=lx*s+ly*c;return{x:f.x-f.face*f.back+f.face*rx,y:GROUND+ry};};
function handW(f,pose=f.pose){return world(f,SHW.x+pose.x,SHW.y+pose.y);}
function dirW(f,a){return{x:f.face*Math.cos(a+f.lean*f.face*0),y:Math.sin(a)};}
function weaponSeg(f,pose=f.pose,u0=null){const h=handW(f,pose),d=dirW(f,pose.a),g=GEO[f.wid],from=u0==null?g.butt:u0*g.tip;return{a:{x:h.x+d.x*from,y:h.y+d.y*from},b:{x:h.x+d.x*g.tip,y:h.y+d.y*g.tip},h,d,len:g.tip,from};}
function shieldSeg(f,sp=f.sp){const c=world(f,SHS.x+sp.x,SHS.y+sp.y),ax={x:f.face*Math.sin(sp.t),y:-Math.cos(sp.t)},hh=SH_SIZE[f.sid][0];return{a:{x:c.x+ax.x*hh,y:c.y+ax.y*hh},b:{x:c.x-ax.x*hh,y:c.y-ax.y*hh},c,ax,hh};}
function segInt(p,p2,q,q2){const r={x:p2.x-p.x,y:p2.y-p.y},s={x:q2.x-q.x,y:q2.y-q.y},den=r.x*s.y-r.y*s.x;if(Math.abs(den)<1e-9)return null;
 const qp={x:q.x-p.x,y:q.y-p.y},t=(qp.x*s.y-qp.y*s.x)/den,u=(qp.x*r.y-qp.y*r.x)/den;if(t<0||t>1||u<0||u>1)return null;return{t,u,x:p.x+r.x*t,y:p.y+r.y*t};}
function bodySeg(f){const top=world(f,0,-51),bot=world(f,0,-8);return{a:top,b:bot};}

// ---------------------------------------------------------------- Abstand und Treffpunkt vorausberechnen
function reachOf(wid,tech){const T=TECH[tech],g=GEO[wid];let best=0;
 for(let i=0;i<=40;i++){const p=i/40,po=attackPose(tech,'swing',p),st=T.step*smooth(p);for(const u of [.5,.75,1]){const x=SHW.x+po.x+Math.cos(po.a)*g.tip*u+st,y=SHW.y+po.y+Math.sin(po.a)*g.tip*u;if(y>-50&&y<-12)best=Math.max(best,x);}}
 return best;}
function standOff(wid,tech){return clamp(reachOf(wid,tech)-7,24,110);}
// Wo kreuzt der Schlag die Linie 10 Pixel vor dem Verteidiger? Dort muss Schild oder Waffe stehen.
function predictCross(att,def,tech,gd=10){const T=TECH[tech],X=def.x+def.face*gd;let prev=null;
 for(let i=0;i<=60;i++){const p=i/60;att.back=-T.step*smooth(p);const po=attackPose(tech,'swing',p),s=weaponSeg(att,po,BLADES.has(att.wid)?.35:Math.max(.35,(HEAD[att.wid]||.4)-.04));
  const lo=Math.min(s.a.x,s.b.x),hi=Math.max(s.a.x,s.b.x);
  if(X>=lo&&X<=hi&&Math.abs(s.b.x-s.a.x)>1e-6){const k=(X-s.a.x)/(s.b.x-s.a.x),pt={x:X,y:s.a.y+(s.b.y-s.a.y)*k};
   if(pt.y>GROUND-54&&pt.y<GROUND-10){let v={x:att.face,y:0};if(prev){const pp=prev.s,q={x:pp.a.x+(pp.b.x-pp.a.x)*k,y:pp.a.y+(pp.b.y-pp.a.y)*k};v={x:pt.x-q.x,y:pt.y-q.y};}
    att.back=0;return{p,pt,v};}}
  prev={s};}
 att.back=0;return{p:.5,pt:world(def,gd,-34),v:{x:att.face,y:0},none:true};}
// Schild: die Deckungslinie so wählen, dass der Schild sie mit dem Arm erreicht
function planGuard(att,def,tech){if(!def.sid){const c=predictCross(att,def,tech,10);return{cross:c,guard:guardFor(def,c)};}
 const sh=world(def,SHS.x,SHS.y);let best=null;for(const gd of [10,12,8,14,6,16,18]){const c=predictCross(att,def,tech,gd);if(c.none)continue;const d=Math.hypot(c.pt.x+def.face*2-sh.x,c.pt.y-sh.y);if(!best||d<best.d)best={c,d};if(d<=ARM_S)break;}
 const c=best?best.c:predictCross(att,def,tech,10);return{cross:c,guard:guardFor(def,c)};}
function guardFor(def,cross){const v=cross.v,l=Math.hypot(v.x,v.y)||1;let n={x:-v.y/l,y:v.x/l};if(n.y>0||(Math.abs(n.y)<.2&&n.x*def.face<0))n={x:-n.x,y:-n.y};
 // etwas schräg zum Gegner hin kippen: wirkt lebendiger und lässt Klingen abgleiten
 const tilt=.22*def.face,c=Math.cos(tilt),s=Math.sin(tilt);n={x:n.x*c-n.y*s,y:n.x*s+n.y*c};
 const G=cross.pt;
 if(def.sid){const sh=world(def,SHS.x,SHS.y);let C={x:G.x+def.face*2,y:G.y};const dx=C.x-sh.x,dy=C.y-sh.y,dl=Math.hypot(dx,dy);if(dl>ARM_S){C={x:sh.x+dx*ARM_S/dl,y:sh.y+dy*ARM_S/dl};}
  const lx=(C.x-sh.x)*def.face,ly=C.y-sh.y;return{kind:'shield',sp:{x:lx,y:ly,t:Math.atan2(n.x*def.face,-n.y)}};}
 const S=world(def,SHW.x,SHW.y),g=GEO[def.wid],lo=POLES.has(def.wid)?.12:BLADES.has(def.wid)?.3:.35,hi=POLES.has(def.wid)?.5:.86;
 let u=clamp(((G.x-S.x)*n.x+(G.y-S.y)*n.y)/g.tip,lo,hi);let Hh={x:G.x-n.x*u*g.tip,y:G.y-n.y*u*g.tip};
 const R=POLES.has(def.wid)||WD[def.wid].twoHand?ARM_P:ARM,dx=Hh.x-S.x,dy=Hh.y-S.y,dl=Math.hypot(dx,dy);if(dl>R){Hh={x:S.x+dx*R/dl,y:S.y+dy*R/dl};const k={x:G.x-Hh.x,y:G.y-Hh.y},kl=Math.hypot(k.x,k.y)||1;n={x:k.x/kl,y:k.y/kl};}
 const a=Math.atan2(n.y,n.x*def.face);return{kind:'weapon',pose:{x:(Hh.x-S.x)*def.face,y:Hh.y-S.y,a}};}

// ---------------------------------------------------------------- Ausgang eines Kontakts (deterministisch, gleiche Regeln für Vorführung und Übersicht)
const TECH_FORCE={slash:1,overhead:1.35,thrust:.75,spin:1.2};
function holdOf(def,blk){if(def.sid){const s=SD[def.sid];return s.weight*1.1+s.protection*.12+blk*.03;}const w=WD[def.wid];return w.block*14+w.weight*.45+(w.twoHand?1.5:0)+blk*.03;}
function resolve(attId,tech,attU,def,defHit,blk){const aw=WD[attId],ap=weaponPart(attId,attU),force=aw.weight*TECH_FORCE[tech]+(aw.twoHand?1.2:0),hold=holdOf(def,blk);
 const dp=def.sid?shieldPart(def.sid,defHit):weaponPart(def.wid,defHit);
 const heavy=!!ap.head&&!POLES.has(attId)||aw.weight>=5;let outcome='clean';
 if(force>hold*1.3)outcome='broken';
 else if(tech==='thrust'&&(def.sid||dp.mat==='metal'))outcome='glance';
 else if(BLADES.has(attId)&&!def.sid&&BLADES.has(def.wid)&&ap.mat==='metal'&&dp.part==='Klinge'&&tech!=='thrust')outcome='bind';
 let init=outcome==='broken'?'A':'D';if(outcome==='bind'){const dw=WD[def.wid];init=dw.delay<aw.delay-.05?'D':aw.delay<dw.delay-.05?'A':'D';}
 // Klang und Bild
 let snd,fxKind,pitch=1;
 if(outcome==='bind'){snd='bk_scrape';fxKind='metal';pitch=clamp(1.3-(aw.weight+WD[def.wid].weight)*.045,.7,1.3);}
 else if(def.sid){pitch={buckler:1.15,smallshield:1.05,roundshield:1,scutum:.9,tower:.8}[def.sid];
  if(dp.kind==='buckler'){snd='bk_buckler';fxKind='metal';}else if(dp.kind==='boss'){snd='bk_boss';fxKind='boss';}else if(dp.kind==='rim'){snd='bk_rim';fxKind='metal';}
  else{snd=heavy||outcome==='broken'?'bk_shieldBoom':ap.mat==='wood'?'bk_thock':'blockShield';fxKind='wood';}}
 else if(dp.mat==='wood'){snd=ap.mat==='metal'?'bk_chop':'bk_thock';fxKind='wood';pitch=clamp(1.15-aw.weight*.04,.75,1.2);}
 else if(ap.mat==='wood'){snd='bk_thock';fxKind='wood';pitch=1.25;}
 else{snd=heavy?'bk_heavyClang':'parry';fxKind='metal';pitch=clamp(1.3-(aw.weight+WD[def.wid].weight)*.045,.7,1.3);}
 const extra=outcome==='broken'?'bk_break':outcome==='glance'?'bk_glance':null;
 return{outcome,init,ap,dp,force,hold,snd,extra,fxKind,pitch,heavy};}
const OUT={clean:{name:'Sauber geblockt',sym:'■',col:'#7fb3d8'},glance:{name:'Abgeglitten',sym:'◢',col:'#8dbb6a'},bind:{name:'Bindung (Klinge an Klinge)',sym:'✕',col:'#e8d48a'},broken:{name:'Deckung durchschlagen',sym:'!',col:'#e0634f'},hit:{name:'Zu spät – Treffer',sym:'·',col:'#9a6a6a'}};
const MATCOL={metal:'#d8d0b0',wood:'#b68756',boss:'#f0c860'};

// ---------------------------------------------------------------- Klänge (Vorlagen im Format von kampfsound.js)
const Tn=o=>({type:'tone',wave:'sine',f0:200,f1:100,curve:1,att:.002,hold:0,dur:.2,vol:.5,start:0,drive:1,lp:14000,trem:0,tremDepth:0,...o});
const Nz=o=>({type:'noise',color:'white',filter:'bp',f0:1000,f1:1000,curve:1,q:1,att:.002,hold:0,dur:.2,vol:.5,start:0,drive:1,trem:0,tremDepth:0,...o});
const Mt=o=>({type:'metal',f:800,partials:'klinge',decay:.4,dur:.6,vol:.4,start:0,bright:.6,click:.3,...o});
const Kc=o=>({type:'clicks',n:4,gap:.06,jitter:.2,filter:'bp',color:'white',f:2000,q:2,dur:.02,vol:.4,start:0,...o});
const SOUNDS={
 bk_heavyClang:{vol:1,room:.16,pitchVar:.08,layers:[Mt({f:620,decay:.35,dur:.8,vol:.5,bright:.65,click:.8}),Mt({f:930,partials:'ruestung',decay:.25,dur:.5,vol:.3}),Tn({f0:120,f1:60,dur:.12,vol:.7,drive:2.2}),Nz({filter:'hp',f0:3500,dur:.1,vol:.25})]},
 bk_scrape:{vol:.95,room:.14,pitchVar:.08,layers:[Mt({f:1300,decay:.2,dur:.5,vol:.32,click:.6}),Nz({f0:4200,f1:2100,q:5,att:.02,hold:.45,dur:.3,vol:.34,trem:38,tremDepth:.55,start:.02}),Mt({f:1550,decay:.3,dur:.55,vol:.16,click:.1,start:.05})]},
 bk_chop:{vol:1,room:.1,pitchVar:.1,layers:[Tn({f0:260,f1:170,dur:.06,vol:.5,drive:1.5}),Nz({f0:1800,q:3,dur:.05,vol:.5}),Mt({f:700,partials:'holz',decay:.08,dur:.16,vol:.36,bright:.4,click:.5}),Nz({filter:'hp',f0:5000,dur:.015,vol:.25})]},
 bk_thock:{vol:1,room:.1,pitchVar:.1,layers:[Tn({f0:180,f1:118,dur:.09,vol:.7,drive:1.3}),Mt({f:520,partials:'holz',decay:.1,dur:.2,vol:.45,bright:.45,click:.4}),Nz({f0:900,q:4,dur:.05,vol:.35})]},
 bk_shieldBoom:{vol:1,room:.18,pitchVar:.08,layers:[Tn({f0:95,f1:52,dur:.26,vol:.9,drive:2.5}),Nz({color:'brown',filter:'lp',f0:520,dur:.2,vol:.6}),Mt({f:260,partials:'schild',decay:.2,dur:.45,vol:.3,click:.3}),Nz({f0:1200,q:3,dur:.05,vol:.3})]},
 bk_boss:{vol:1,room:.18,pitchVar:.07,layers:[Mt({f:560,partials:'schild',decay:.5,dur:.9,vol:.5,bright:.65,click:.6}),Mt({f:840,partials:'schild',decay:.3,dur:.6,vol:.25,start:.002}),Tn({f0:130,f1:80,dur:.1,vol:.5,drive:1.6})]},
 bk_buckler:{vol:.95,room:.15,pitchVar:.07,layers:[Mt({f:900,partials:'schild',decay:.45,dur:.8,vol:.45,bright:.8,click:.7}),Mt({f:1360,decay:.3,dur:.5,vol:.2}),Tn({f0:160,f1:100,dur:.05,vol:.3})]},
 bk_rim:{vol:1,room:.14,pitchVar:.09,layers:[Mt({f:1100,partials:'ruestung',decay:.25,dur:.45,vol:.36,click:.6}),Tn({f0:150,f1:100,dur:.12,vol:.5,drive:1.5}),Nz({f0:700,q:5,dur:.08,vol:.35})]},
 bk_break:{vol:1,room:.16,pitchVar:.08,layers:[Tn({f0:70,f1:34,dur:.3,vol:.9,drive:3}),Nz({color:'brown',filter:'lp',f0:600,dur:.25,vol:.6}),Kc({n:4,gap:.025,f:2500,q:3,dur:.012,vol:.3,start:.01})]},
 bk_glance:{vol:.9,room:.12,pitchVar:.1,layers:[Nz({f0:3000,f1:5600,q:4,dur:.16,vol:.3,att:.004}),Mt({f:1650,decay:.2,dur:.35,vol:.24,click:.4})]}};
let ac=null,out=null;const bufCache=new Map();
function audio(){if(ac)return ac;try{ac=new (window.AudioContext||window.webkitAudioContext)();out=ac.createGain();out.gain.value=.8;out.connect(ac.destination);}catch{ac=null;}return ac;}
function tpl(k){return SOUNDS[k]||KS?.get?.(k);}
function buf(k,pitch,variant){const id=k+'|'+pitch.toFixed(2)+'|'+variant;let b=bufCache.get(id);if(b)return b;const t=tpl(k);if(!t||!ac||!KS)return null;
 const data=KS.render(t,{seed:1000+variant*7919+k.length*31,pitch});b=ac.createBuffer(1,data.length,KS.SR);b.getChannelData(0).set(data);bufCache.set(id,b);return b;}
function sfx(k,pitch=1,vol=1){if(!$('snd').checked||!k||!audio())return;if(ac.state==='suspended')ac.resume();pitch=Math.round(clamp(pitch,.5,1.8)*20)/20;
 // Tonhöhe über die Abspielrate: jede Vorlage wird nur einmal je Variante berechnet, nie während des Kampfes neu
 const b=buf(k,1,Math.floor(Math.random()*3));if(!b)return;const s=ac.createBufferSource(),g=ac.createGain();s.buffer=b;s.playbackRate.value=pitch;g.gain.value=vol;s.connect(g);g.connect(out);s.start();s.onended=()=>{s.disconnect();g.disconnect();};}
function prefill(){if(!audio())return;const keys=[...Object.keys(SOUNDS),'parry','blockShield','hitBlade','swing','swingHeavy'];let i=0;
 const step=()=>{const k=keys[i++];if(!k)return;for(let v=0;v<3;v++)buf(k,1,v);setTimeout(step,30);};setTimeout(step,50);}

// ---------------------------------------------------------------- Partikel (feste Puffer, keine Objekte pro Funke)
const PMAX=320,P={x:new Float32Array(PMAX),y:new Float32Array(PMAX),vx:new Float32Array(PMAX),vy:new Float32Array(PMAX),life:new Float32Array(PMAX),max:new Float32Array(PMAX),kind:new Uint8Array(PMAX)};let pNext=0,pAlive=0;
const PK={spark:0,splinter:1,dust:2,blood:3,ember:4};
function emit(kind,x,y,n,dx,dy,spread,speed,life){for(let i=0;i<n;i++){const j=pNext;pNext=(pNext+1)%PMAX;const a=Math.atan2(dy,dx)+(Math.random()*2-1)*spread,v=speed*(.45+Math.random()*.8);
 P.x[j]=x;P.y[j]=y;P.vx[j]=Math.cos(a)*v;P.vy[j]=Math.sin(a)*v;P.max[j]=P.life[j]=life*(.6+Math.random()*.7);P.kind[j]=kind;}}
function stepParticles(dt){pAlive=0;for(let i=0;i<PMAX;i++){if(P.life[i]<=0)continue;pAlive++;P.life[i]-=dt;const k=P.kind[i];
 if(k===PK.spark||k===PK.ember){P.vy[i]+=260*dt;P.vx[i]*=1-2*dt;}else if(k===PK.splinter||k===PK.blood){P.vy[i]+=380*dt;P.vx[i]*=1-1.5*dt;}else{P.vx[i]*=1-4*dt;P.vy[i]=P.vy[i]*(1-4*dt)-8*dt;}
 P.x[i]+=P.vx[i]*dt;P.y[i]+=P.vy[i]*dt;if(P.y[i]>GROUND+2&&k!==PK.dust){P.y[i]=GROUND+2;P.vy[i]*=-.25;P.vx[i]*=.5;if(k===PK.spark)P.life[i]=Math.min(P.life[i],.05);}}}
function drawParticles(){for(let i=0;i<PMAX;i++){const l=P.life[i];if(l<=0)continue;const k=P.kind[i],f=l/P.max[i],x=P.x[i],y=P.y[i];
 if(k===PK.spark){ctx.fillStyle=f>.6?'#fffbe6':f>.3?'#ffd56a':'#e8812e';ctx.fillRect(x|0,y|0,1,1);const sp=Math.hypot(P.vx[i],P.vy[i]);if(sp>60){ctx.globalAlpha=.55;ctx.fillRect((x-P.vx[i]*.012)|0,(y-P.vy[i]*.012)|0,1,1);ctx.globalAlpha=1;}}
 else if(k===PK.ember){ctx.fillStyle=f>.5?'#ffe39a':'#c96a2c';ctx.fillRect(x|0,y|0,1,1);}
 else if(k===PK.splinter){ctx.fillStyle=i%3?'#a87a4a':'#e0c18f';ctx.fillRect(x|0,y|0,(i&1)?2:1,(i&1)?1:2);}
 else if(k===PK.blood){ctx.fillStyle='#8e2230';ctx.fillRect(x|0,y|0,1,1);}
 else{ctx.globalAlpha=f*.35;ctx.fillStyle='#c8b28a';const r=2+(1-f)*4;ctx.fillRect((x-r)|0,(y-r*.6)|0,r*2|0,r*1.2|0);ctx.globalAlpha=1;}}}
const flashes=[];// {x,y,t,max,kind}
function flash(x,y,kind,size){flashes.push({x,y,t:0,max:kind==='boss'?.22:.12,kind,size});if(flashes.length>8)flashes.shift();}
function drawFlashes(dt){for(let i=flashes.length-1;i>=0;i--){const f=flashes[i];f.t+=dt;if(f.t>=f.max){flashes.splice(i,1);continue;}const k=1-f.t/f.max,x=Math.round(f.x),y=Math.round(f.y),r=Math.round(f.size*k);
 if(f.kind==='boss'){ctx.strokeStyle=`rgba(255,226,150,${k})`;ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,3+f.size*(1-k)*1.4,0,TAU);ctx.stroke();}
 ctx.fillStyle=f.kind==='wood'?`rgba(240,214,170,${k})`:`rgba(255,255,236,${k})`;ctx.fillRect(x-r,y,r*2+1,1);ctx.fillRect(x,y-r,1,r*2+1);
 if(f.kind!=='wood'&&r>2){ctx.fillRect(x-1,y-1,3,3);ctx.globalAlpha=k*.6;ctx.fillRect(x-r+2,y-r+2,1,1);ctx.fillRect(x+r-2,y-r+2,1,1);ctx.fillRect(x-r+2,y+r-2,1,1);ctx.fillRect(x+r-2,y+r-2,1,1);ctx.globalAlpha=1;}}}

// ---------------------------------------------------------------- Hintergrund, Schilde, Figuren
const bg=document.createElement('canvas');bg.width=W;bg.height=H;
(()=>{const g=bg.getContext('2d');const n=(x,y)=>{let v=Math.imul(x*374761393+y*668265263,1274126177);v^=v>>>13;return((v>>>0)%1000)/1000;};
 g.fillStyle='#21170f';g.fillRect(0,0,W,H);
 for(let y=0;y<WALL;y++)for(let x=0;x<W;x+=1){const row=Math.floor(y/9),off=(row%2)*11,bx=Math.floor((x+off)/22),edge=(x+off)%22===0||y%9===0,v=n(bx,row);g.fillStyle=edge?'#1a120c':v<.33?'#4a3628':v<.66?'#423022':'#3b2a1e';if(n(x,y)>.93)g.fillStyle='#55402f';g.fillRect(x,y,1,1);}
 g.fillStyle='#2b1d13';g.fillRect(0,WALL-4,W,8);g.fillStyle='#6b5230';g.fillRect(0,WALL-6,W,2);
 for(let y=WALL+4;y<H;y++)for(let x=0;x<W;x++){const v=n(x,y),d=(y-WALL-4)/(H-WALL-4);g.fillStyle=v>.92?'#d8bf8c':v>.6?'#b99a68':v>.25?'#a98a5c':'#9c7d51';if(d<.08)g.fillStyle='#7d6342';g.fillRect(x,y,1,1);}
 for(let i=0;i<4;i++){const x=22+i*78;g.fillStyle='#1b120b';g.fillRect(x,22,10,WALL-26);g.fillStyle='#5a4432';g.fillRect(x+1,22,8,WALL-26);g.fillStyle='#6f5640';g.fillRect(x+1,22,2,WALL-26);g.fillStyle='#e7a24a';g.fillRect(x+3,14,4,6);g.fillStyle='#ffd68a';g.fillRect(x+4,12,2,4);}})();
const shieldSprites={};
for(const s of SHIELDS){const [hh,hw]=SH_SIZE[s.id],c=document.createElement('canvas');c.width=hw*2+3;c.height=hh*2+3;const g=c.getContext('2d'),cx=hw+1,cy=hh+1;
 const rect=s.id==='scutum'||s.id==='tower';const face=s.id==='scutum'?'#8e2b26':s.id==='buckler'?'#a9a497':'#7d5233',face2=s.id==='scutum'?'#a8382f':s.id==='buckler'?'#c9c3b2':'#94643f',rim=s.id==='scutum'?'#d6b25e':s.id==='tower'?'#4b3220':'#9a968a';
 for(let y=-hh;y<=hh;y++){const k=rect?(Math.abs(y)>hh-1?.85:1):Math.sqrt(Math.max(0,1-(y/(hh+.5))**2)),w=Math.max(1,Math.round(hw*k));
  for(let x=-w;x<=w;x++){const e=Math.abs(x)>=w||Math.abs(y)>=hh||(!rect&&Math.abs(x)>=w-0&&true);g.fillStyle=e?rim:((x+hw*3)%4===0&&s.id!=='buckler'&&s.id!=='scutum')?'#5e3d25':x<-w*.3?face2:face;g.fillRect(cx+x,cy+y,1,1);}}
 if(s.id!=='buckler'){g.fillStyle=s.id==='scutum'?'#d6b25e':'#b9b3a2';g.fillRect(cx-2,cy-2,4,4);g.fillStyle='#ece6d2';g.fillRect(cx-1,cy-2,1,1);if(s.id==='scutum'){g.fillRect(cx,cy-hh+2,1,hh*2-3);}}
 else{g.fillStyle='#ece6d2';g.fillRect(cx-1,cy-1,2,2);}
 shieldSprites[s.id]=c;}
function pline(x0,y0,x1,y1,w,col){ctx.fillStyle=col;const n=Math.max(1,Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));for(let i=0;i<=n;i++){const t=i/n;ctx.fillRect(Math.round(lerp(x0,x1,t)-w/2),Math.round(lerp(y0,y1,t)-w/2),w,w);}}
function limb(a,b,len1,len2,bendDown){const dx=b.x-a.x,dy=b.y-a.y,d=Math.min(len1+len2-.01,Math.hypot(dx,dy))||.01,ang=Math.atan2(dy,dx),c=clamp((len1*len1+d*d-len2*len2)/(2*len1*d),-1,1),off=Math.acos(c)*(bendDown?1:-1);return{x:a.x+Math.cos(ang+off)*len1,y:a.y+Math.sin(ang+off)*len1};}
const TEAM=[{tunic:'#9c3a31',tunic2:'#c25245',crest:'#e0634f'},{tunic:'#36607f',tunic2:'#4c7fa6',crest:'#7fb3d8'}];
const SKIN='#c58d63',SKIN2='#a06c48',STEEL='#9aa2a4',STEEL2='#c9cfcd';
function drawFighter(f){const C=TEAM[f.team],faceSave=f.face;if(f.flip)f.face=-f.face;const P=(x,y)=>world(f,x,y);
 const hurt=f.hurt>0;
 // Schatten
 ctx.fillStyle='rgba(30,18,8,.35)';const sx=P(0,0).x;ctx.fillRect(Math.round(sx-9),GROUND+1,18,2);
 const hip=P(0,-22),ff=P(7,0),bf=P(-6,0),kf=limb(hip,ff,12,12,false),kb=limb(hip,bf,12,12,false);
 pline(hip.x,hip.y,kb.x,kb.y,2,SKIN2);pline(kb.x,kb.y,bf.x,bf.y,2,SKIN2);ctx.fillStyle='#4a2f1d';ctx.fillRect(Math.round(bf.x-2),GROUND-1,4,2);
 pline(hip.x,hip.y,kf.x,kf.y,2,SKIN);pline(kf.x,kf.y,ff.x,ff.y,2,SKIN);ctx.fillStyle='#4a2f1d';ctx.fillRect(Math.round(ff.x-2),GROUND-1,4,2);
 // Rumpf
 for(let y=-40;y<=-19;y++){const w=y<-34?4:y>-24?4:3;for(let x=-w;x<=w;x++){const p=P(x,y);ctx.fillStyle=hurt?'#e9d1c0':y===-24||y===-23?'#5b3a22':x*f.face<-1?C.tunic:C.tunic2;ctx.fillRect(Math.round(p.x),Math.round(p.y),1,1);}}
 // Kopf mit Helm
 const hc=P(1,-46);ctx.fillStyle=hurt?'#f2dccb':SKIN;ctx.fillRect(Math.round(hc.x-3),Math.round(hc.y-2),7,6);ctx.fillStyle=STEEL;ctx.fillRect(Math.round(hc.x-3),Math.round(hc.y-4),7,3);ctx.fillStyle=STEEL2;ctx.fillRect(Math.round(hc.x-2),Math.round(hc.y-4),3,1);
 ctx.fillStyle=C.crest;const cr=P(0,-51);ctx.fillRect(Math.round(cr.x-2),Math.round(cr.y),5,2);ctx.fillStyle='#1b120b';const eye=P(3,-46);ctx.fillRect(Math.round(eye.x),Math.round(eye.y),1,1);
 f.face=faceSave;
 // Waffenarm hinten, damit Schild davor liegt
 const shW=world(f,SHW.x,SHW.y),h=handW(f),el=limb(shW,h,8,8,true),w=WD[f.wid];
 if(f.sid){const sp=f.sp,sh=world(f,SHS.x,SHS.y),c=world(f,SHS.x+sp.x,SHS.y+sp.y),el2=limb(sh,c,8,8,true);
  drawWeapon(f);pline(shW.x,shW.y,el.x,el.y,2,SKIN2);pline(el.x,el.y,h.x,h.y,2,SKIN2);
  pline(sh.x,sh.y,el2.x,el2.y,2,SKIN);pline(el2.x,el2.y,c.x,c.y,2,SKIN);
  const spr=shieldSprites[f.sid];ctx.save();ctx.translate(Math.round(c.x),Math.round(c.y));ctx.rotate(f.face*sp.t);ctx.scale(f.face,1);ctx.drawImage(spr,-spr.width/2|0,-spr.height/2|0);ctx.restore();}
 else{pline(shW.x,shW.y,el.x,el.y,2,SKIN2);pline(el.x,el.y,h.x,h.y,2,SKIN2);
  if(w.twoHand){const d=dirW(f,f.pose.a),h2={x:h.x-d.x*6,y:h.y-d.y*6},sh=world(f,SHS.x,SHS.y),el2=limb(sh,h2,8,8,true);pline(sh.x,sh.y,el2.x,el2.y,2,SKIN);pline(el2.x,el2.y,h2.x,h2.y,2,SKIN);}
  else{const sh=world(f,SHS.x,SHS.y),fh=world(f,SHS.x+4,SHS.y+14);const el2=limb(sh,fh,8,8,true);pline(sh.x,sh.y,el2.x,el2.y,2,SKIN);pline(el2.x,el2.y,fh.x,fh.y,2,SKIN);}
  drawWeapon(f);}
 ctx.fillStyle=SKIN;ctx.fillRect(Math.round(h.x-1),Math.round(h.y-1),2,2);}
function drawWeapon(f){const h=handW(f);ctx.save();ctx.translate(Math.round(h.x),Math.round(h.y));ctx.scale(f.face,1);ART.draw(ctx,items[f.wid],{x:0,y:0,angle:f.pose.a,scale:1,drips:false});ctx.restore();}

// ---------------------------------------------------------------- Ablauf
const opt={};let act=null,queue=[],hitstop=0,slowT=0,shake=0,running=false,waitT=0,after=null,tour=null,lastCell=null;
const stats={blocks:0,contacts:0,fxMs:0,frameMs:0};
function readOpts(){opt.aW=$('aW').value;opt.aS=$('aS').value||null;opt.dW=$('dW').value;opt.dS=$('dS').value||null;opt.tech=$('tech').value;opt.combo=+$('combo').value;opt.blk=+$('blk').value;opt.react=$('react').value;opt.speed=+$('speed').value/100;}
function place(){A.wid=opt.aW;A.sid=WD[opt.aW].twoHand?null:opt.aS;D.wid=opt.dW;D.sid=WD[opt.dW].twoHand?null:opt.dS;
 for(const f of [A,D]){f.back=0;f.lean=0;f.flip=false;f.hurt=0;f.pose={...REST};f.sp={...REST_S};}
 const first=queue[0]||'slash',dist=standOff(A.wid,first);A.face=1;D.face=-1;A.x=Math.round(W/2-dist/2);D.x=Math.round(W/2+dist/2);}
function techList(){const n=opt.combo;if(opt.tech!=='mix'&&opt.tech!=='random')return Array(n).fill(opt.tech);const l=[];let last=null;for(let i=0;i<n;i++){let t;do t=TECH_ORDER[Math.floor(Math.random()*4)];while(t===last&&Math.random()<.7);l.push(t);last=t;}return l;}
function blockChance(){// Annäherung an die Blockchance des Spiels (sim.js) bei voller Kraft und Gesundheit
 const sh=D.sid?SD[D.sid]:null;return clamp((sh?sh.area*.72:0)+opt.blk*.003+.18+WD[D.wid].block*.25,0,.97);}
function startExchange(){readOpts();fxBox.innerHTML='';queue=techList();place();clearLog();running=true;after=null;banner(`${WD[A.wid].name}${A.sid?' + '+SD[A.sid].name:''}  gegen  ${WD[D.wid].name}${D.sid?' + '+SD[D.sid].name:''}`);nextAttack(true);}
function nextAttack(first){const tech=queue.shift();if(!tech){endExchange();return;}
 // Abstand für diese Schlagart einnehmen
 const want=standOff(A.wid,tech),cur=Math.abs(D.x-A.x);A.x+=(cur-want);
 const w=WD[A.wid],wind=windTime(w,tech,50)*(first?1:.72),swing=swingTime(w,tech);
 const {cross,guard}=planGuard(A,D,tech);
 const gDur=.09+(D.sid?SD[D.sid].weight*.012:WD[D.wid].weight*.012),tc=wind+cross.p*swing;// grob: wann der Schlag die Deckungslinie erreicht
 let mode=opt.react,ok=true;if(mode==='auto'){ok=Math.random()<blockChance();mode=ok?'sure':'late';}
 const gStart=mode==='sure'?tc-gDur-.06:mode==='tight'?tc-gDur*.82:tc-gDur*.15;
 // zu spät: Verteidiger hat Waffe und Schild gesenkt (überrascht), die Deckung kommt erst, wenn der Schlag schon da ist
 if(mode==='late'){D.pose={x:3,y:9,a:1.05};D.sp={x:1,y:11,t:.35};}
 act={att:A,def:D,tech,wind,swing,t:0,phase:'wind',p:0,lastP:0,guard,gStart,gDur,cross,mode,contact:null,res:null,riposte:false,first,gFrom:{...D.pose},sFrom:{...D.sp}};
 if(!first)A.pose={...REST};}
function startRiposte(){const tech=BLUNT.has(D.wid)||AXES.has(D.wid)?'slash':'thrust',w=WD[D.wid],need=standOff(D.wid,tech),cur=Math.abs(D.x-D.back*D.face*-1-A.x);
 act={att:D,def:A,tech,wind:windTime(w,tech,50)*.5,swing:swingTime(w,tech)*.8,t:0,phase:'wind',p:0,lastP:0,guard:null,riposte:true,contact:null,extraStep:Math.max(0,Math.abs(D.x-A.x)-need)};}
function endExchange(){act=null;running=false;
 if(tour){waitT=.55;after=()=>tourNext();}else if($('loop').checked){waitT=.8;after=()=>startExchange();}}
function fighterPoseOf(f){return f.pose;}

function update(dt){
 for(const f of [A,D]){if(f.hurt>0)f.hurt-=dt;}
 if(waitT>0){waitT-=dt;if(waitT<=0&&after){const fn=after;after=null;fn();}relax(dt);return;}
 if(!act){relax(dt);return;}
 const a=act,att=a.att,def=a.def,T=TECH[a.tech];a.t+=dt;
 if(a.phase==='wind'){const p=a.t/a.wind;att.pose=attackPose(a.tech,'wind',p);att.flip=!!T.spin&&p>.35&&p<.8;att.back=a.riposte?-a.extraStep*smooth(p):0;if(!a.riposte)moveGuard(a,a.t);
  if(a.t>=a.wind){a.phase='swing';a.t=0;att.flip=false;sfx(WD[att.wid].weight>=5||a.tech==='overhead'?'swingHeavy':'swing',1,.55);}}
 else if(a.phase==='swing'){const p=Math.min(1,a.t/a.swing),prev=a.lastP;a.lastP=p;att.back=(a.riposte?-a.extraStep:0)-T.step*smooth(p);
  // Deckung bewegt sich unabhängig vom Treffer – trifft der Schlag vorher, war sie zu spät
  if(!a.riposte)moveGuard(a,a.wind+a.t);
  const steps=4;let hit=null;
  for(let k=1;k<=steps&&!hit;k++){const pp=lerp(prev,p,k/steps),po=attackPose(a.tech,'swing',pp),seg=weaponSeg(att,po,.3);
   if(!a.riposte){if(def.sid){const s=shieldSeg(def),x=segInt(seg.a,seg.b,s.a,s.b);if(x)hit={type:'block',x,u:.3+x.t*.7,r:Math.abs(x.u*2-1),po,pp};}
    else{const s=weaponSeg(def),x=segInt(seg.a,seg.b,s.a,s.b);if(x){const g=GEO[def.wid],pos=g.butt+x.u*(g.tip-g.butt);hit={type:'block',x,u:.3+x.t*.7,r:pos/g.tip,po,pp};}}}
   if(!hit){const b=bodySeg(def),x=segInt(seg.a,seg.b,b.a,b.b);if(x)hit={type:'body',x,u:.3+x.t*.7,po,pp};}}
  if(hit){att.pose=hit.po;contact(a,hit);return;}
  att.pose=attackPose(a.tech,'swing',p);
  if(p>=1){a.phase='recover';a.t=0;a.from={...att.pose};log(`${WD[att.wid].name} · ${T.name}: verfehlt.`);}}
 else if(a.phase==='bind'){const k=a.t/.22;att.pose={...a.cpose,x:a.cpose.x+2*k};if(Math.random()<.5)emit(PK.spark,a.cx,a.cy+(Math.random()*4-2),1,-att.face,-1,1.2,70,.18);if(a.t>=.22){a.phase='recoil';a.t=0;a.from={...att.pose};}}
 else if(a.phase==='recoil'){const k=smooth(a.t/.16),T2=TECH[a.tech];att.pose={x:lerp(a.from.x,lerp(T2.wind.x,a.from.x,.5),k),y:lerp(a.from.y,lerp(T2.wind.y,a.from.y,.5),k),a:lerpA(a.from.a,lerpA(T2.wind.a,a.from.a,.45),k)};att.back=lerp(a.backFrom,a.backFrom+4,k);
  if(a.t>=.16){a.phase='recover';a.t=0;a.from={...att.pose};a.backFrom=att.back;}}
 else if(a.phase==='glance'){const k=smooth(a.t/.14);att.pose={x:a.from.x+5*k,y:a.from.y+a.gdir*3*k,a:a.from.a+a.gdir*.6*k};att.lean=a.gdir*.0+.08*k*att.face*0;att.back=a.backFrom-3*k;if(a.t>=.14){a.phase='recover';a.t=0;a.from={...att.pose};a.backFrom=att.back;}}
 else if(a.phase==='through'){// Deckung durchschlagen: Schlag läuft weiter, Verteidiger fliegt zurück
  const p=Math.min(1,a.pp+a.t/(a.swing*1.4)),po=attackPose(a.tech,'swing',p);att.pose=po;
  const k=smooth(a.t/.18);def.back=lerp(a.defBack,a.defBack+9,k);def.lean=-.12*def.face*Math.sin(Math.min(1,a.t/.35)*Math.PI);
  if(def.sid){def.sp={...a.dsp,t:a.dsp.t-.7*k,x:a.dsp.x-3*k};}else def.pose={...a.dpose,a:a.dpose.a-1.0*k,x:a.dpose.x-3*k,y:a.dpose.y-3*k};
  if(!a.grazed){const seg=weaponSeg(att,po,.3),b=bodySeg(def),x=segInt(seg.a,seg.b,b.a,b.b);if(x){a.grazed=true;def.hurt=.18;emit(PK.blood,x.x,x.y,5,att.face,-.4,.8,60,.4);sfx('hitBlade',1.1,.45);floater(x.x,x.y-14,'STREIFER','#e0866f',true);}}
  if(p>=1||a.t>.5){a.phase='recover';a.t=0;a.from={...att.pose};a.backFrom=att.back;}}
 else if(a.phase==='recover'){const k=smooth(a.t/.26);att.pose={x:lerp(a.from.x,REST.x,k),y:lerp(a.from.y,REST.y,k),a:lerpA(a.from.a,REST.a,k)};att.back=lerp(a.backFrom??att.back,0,k)*(1);att.lean=lerp(att.lean,0,k);
  if(a.t>=.26){att.back=0;att.lean=0;finishAttack(a);}}
 if(act&&!act.riposte&&act.phase!=='wind'&&act.phase!=='swing'&&act.phase!=='through')relaxGuard(def,dt,act.t>.12?1:0);}

function moveGuard(a,tAbs){const def=a.def,g=a.guard;const k=smooth((tAbs-a.gStart)/a.gDur);if(k<=0)return;
 const s0=a.sFrom,p0=a.gFrom;if(g.kind==='shield')def.sp={x:lerp(s0.x,g.sp.x,k),y:lerp(s0.y,g.sp.y,k),t:lerpA(s0.t,g.sp.t,k)};
 else def.pose={x:lerp(p0.x,g.pose.x,k),y:lerp(p0.y,g.pose.y,k),a:lerpA(p0.a,g.pose.a,k)};}
function relaxGuard(f,dt,on){if(!on)return;const k=Math.min(1,dt*7);f.pose={x:lerp(f.pose.x,REST.x,k),y:lerp(f.pose.y,REST.y,k),a:lerpA(f.pose.a,REST.a,k)};f.sp={x:lerp(f.sp.x,REST_S.x,k),y:lerp(f.sp.y,REST_S.y,k),t:lerpA(f.sp.t,REST_S.t,k)};f.back=lerp(f.back,0,Math.min(1,dt*3));f.lean=lerp(f.lean,0,Math.min(1,dt*6));}
function relax(dt){for(const f of [A,D]){relaxGuard(f,dt,1);}}

function contact(a,hit){const att=a.att,def=a.def,x=hit.x.x,y=hit.x.y;stats.contacts++;a.backFrom=att.back;
 if(hit.type==='body'){a.contact=hit;def.hurt=.22;emit(PK.blood,x,y,a.riposte?9:7,att.face,-.5,.9,75,.45);sfx('hitBlade',1,.75);hitstop=.05;shake=1.5;
  floater(x,y-14,a.riposte?'GEGENSCHLAG':'TREFFER',a.riposte?'#7fb3d8':'#e0634f');
  if(a.riposte)log(`<b>Gegenschlag</b> · ${WD[att.wid].name} (${TECH[a.tech].name}) trifft, weil der Angreifer noch zurückfedert.`);
  else log(`<b>${OUT.hit.name}</b> · ${WD[att.wid].name} (${TECH[a.tech].name}) trifft. Deckung kam ${a.mode==='late'?'deutlich ':''}zu spät (${Math.round(guardDone(a)*100)} % oben).`);
  a.res={outcome:'hit',init:'A'};a.phase='recover';a.t=0;a.from={...att.pose};return;}
 const res=resolve(att.wid,a.tech,hit.u,def,hit.r,opt.blk);a.res=res;a.contact=hit;stats.blocks++;
 // Bild
 const t0=performance.now(),tx=-att.face,dirx=att.face;
 const n=res.outcome==='broken'?22:res.heavy?16:11;
 if(res.fxKind==='metal'||res.fxKind==='boss'){emit(PK.spark,x,y,n,-dirx*.4,-1,1.25,150,.32);emit(PK.ember,x,y,4,dirx,-.6,.6,60,.6);flash(x,y,res.fxKind,res.heavy?7:5);}
 if(res.fxKind==='wood'){emit(PK.splinter,x,y,res.heavy?12:8,tx,-1,1.1,95,.5);emit(PK.dust,x,y,2,tx,0,.5,15,.5);flash(x,y,'wood',4);if(res.dp.mat==='metal'||res.ap.mat==='metal')emit(PK.spark,x,y,4,tx,-1,1,110,.2);}
 if(res.outcome==='broken'){const fp=world(def,0,0);emit(PK.dust,fp.x,fp.y-2,6,def.face*-1,0,.6,30,.7);}
 stats.fxMs=performance.now()-t0;
 // Klang
 sfx(res.snd,res.pitch,1);if(res.extra)sfx(res.extra,1,res.outcome==='broken'?.8:.6);
 hitstop={metal:.07,boss:.08,wood:.05}[res.fxKind]+(res.outcome==='broken'?.04:0);shake=res.outcome==='broken'?3:res.heavy?2:1;
 if($('slow').checked)slowT=.32;
 floater(x,y-18,{clean:'BLOCK',glance:'ABGEGLITTEN',bind:'BINDUNG',broken:'DURCHGESCHLAGEN'}[res.outcome],OUT[res.outcome].col);
 floater(x,y+12,res.dp.part.toUpperCase(),MATCOL[res.fxKind]||'#ddd',true);
 // Bewegung danach
 a.cpose={...hit.po};a.cx=x;a.cy=y;a.pp=hit.pp;a.defBack=def.back;a.dsp={...def.sp};a.dpose={...def.pose};
 if(res.outcome==='clean'){a.phase='recoil';a.t=0;a.from={...hit.po};def.back+=res.force>res.hold*.8?3:1;}
 else if(res.outcome==='bind'){a.phase='bind';a.t=0;}
 else if(res.outcome==='glance'){a.phase='glance';a.t=0;a.from={...hit.po};a.gdir=(def.sid?(hit.x.y<shieldSeg(def).c.y?-1:1):-1);}
 else{a.phase='through';a.t=0;}
 const comboLeft=queue.length;
 log(`<b>${OUT[res.outcome].name}</b> · ${WD[att.wid].name} (${TECH[a.tech].name}, ${res.ap.part}) auf ${def.sid?SD[def.sid].name:WD[def.wid].name} (${res.dp.part}).<br>`+
  `Wucht ${res.force.toFixed(1)} gegen Halt ${res.hold.toFixed(1)} · Klang: ${SOUND_NAMES[res.snd]||res.snd} · Initiative: <b>${res.init==='D'?'Verteidiger':'Angreifer'}</b>`+
  (res.init==='D'&&comboLeft?` · <span class="warn">Combo unterbrochen (${comboLeft} Schlag${comboLeft>1?'e':''} entfallen)</span>`:''));
 if(res.init==='D'){if(comboLeft)setTimeout(()=>floater(att.x-att.face*att.back,GROUND+19,'COMBO UNTERBROCHEN','#e6a45c',true),220);queue=[];floater(def.x-def.face*def.back,GROUND+12,'INITIATIVE','#7fb3d8',true);}
 else if(res.outcome==='broken')floater(att.x-att.face*att.back,GROUND+12,'INITIATIVE','#e0634f',true);}
function guardDone(a){return a.guard?clamp(((a.wind+a.t)-a.gStart)/a.gDur,0,1):0;}
function finishAttack(a){const r=a.res;
 if(a.riposte){act=null;waitT=.3;after=()=>endExchange();return;}
 if(r&&r.init==='D'&&r.outcome!=='hit'&&$('riposte').checked){act=null;waitT=.06;after=()=>startRiposte();return;}
 act=null;if(queue.length){waitT=.08;after=()=>nextAttack(false);}else{waitT=.25;after=()=>endExchange();}}

// ---------------------------------------------------------------- Anzeige
const SOUND_NAMES={parry:'Klinge auf Klinge',bk_heavyClang:'schweres Metall-Klonk',bk_scrape:'Klingen schaben',bk_chop:'Klinge hackt in Holz',bk_thock:'Holz auf Holz',blockShield:'Holzschild',bk_shieldBoom:'dumpfer Schildschlag',bk_boss:'Schildbuckel-Gong',bk_buckler:'Faustschild-Klingen',bk_rim:'Schildrand'};
const fxBox=$('fx');
function floater(x,y,text,col,small){const d=document.createElement('div');d.className='fl'+(small?' small':'');d.textContent=text;d.style.color=col;d.style.left=(x/W*100)+'%';d.style.top=(y/H*100)+'%';fxBox.appendChild(d);setTimeout(()=>d.remove(),1200);while(fxBox.children.length>10)fxBox.firstChild.remove();}
function banner(t){$('banner').textContent=t;}
const logBox=$('log');function clearLog(){logBox.innerHTML='';}
function log(h){const d=document.createElement('div');d.className='row';d.innerHTML=h;logBox.appendChild(d);while(logBox.children.length>5)logBox.firstChild.remove();}

let last=performance.now(),fpsAcc=0,fpsN=0,fps=60;
function frame(now){const t0=performance.now();let dt=Math.min(.05,(now-last)/1000);last=now;fpsAcc+=dt;fpsN++;if(fpsAcc>.5){fps=fpsN/fpsAcc;fpsAcc=0;fpsN=0;}
 let sim=dt*(opt.speed||1);if(slowT>0){slowT-=dt;sim*=.28;}
 if(hitstop>0){hitstop-=dt;}else{update(sim);stepParticles(sim);}
 const sx=shake>0?Math.round((Math.random()*2-1)*shake):0,sy=shake>0?Math.round((Math.random()*2-1)*shake*.5):0;shake=Math.max(0,shake-dt*14);
 ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(bg,0,0);ctx.setTransform(1,0,0,1,sx,sy);
 drawFighter(D);drawFighter(A);const tp=performance.now();drawParticles();drawFlashes(hitstop>0?0:sim);
 if($('dbg').checked)drawDebug();
 ctx.setTransform(1,0,0,1,0,0);
 stats.frameMs=stats.frameMs*.9+(performance.now()-t0)*.1;
 $('perf').textContent=`${Math.round(fps)} fps · Bild ${stats.frameMs.toFixed(2)} ms · Funken ${pAlive}/${PMAX}`;
 requestAnimationFrame(frame);}
function drawDebug(){const a=act;ctx.fillStyle='#5f0';if(a?.cross&&!a.riposte){ctx.fillRect(Math.round(a.cross.pt.x)-1,Math.round(a.cross.pt.y)-1,3,3);}
 const s=weaponSeg(A,A.pose,.3);pline(s.a.x,s.a.y,s.b.x,s.b.y,1,'rgba(255,90,60,.8)');
 if(D.sid){const q=shieldSeg(D);pline(q.a.x,q.a.y,q.b.x,q.b.y,1,'rgba(80,200,255,.9)');}else{const q=weaponSeg(D);pline(q.a.x,q.a.y,q.b.x,q.b.y,1,'rgba(80,200,255,.9)');}
 const b=bodySeg(D);pline(b.a.x,b.a.y,b.b.x,b.b.y,1,'rgba(255,255,255,.4)');}

// ---------------------------------------------------------------- Übersicht: alle Waffen gegeneinander
let mxTech='slash';
function predict(attW,defW,defS,tech,blk){const a=fighter(0),d=fighter(1);a.wid=attW;d.wid=defW;d.sid=defS;const dist=standOff(attW,tech);a.face=1;d.face=-1;a.x=100;d.x=100+dist;
 const {guard:g}=planGuard(a,d,tech);if(g.kind==='shield')d.sp=g.sp;else d.pose=g.pose;
 let prev=0;for(let i=1;i<=80;i++){const p=i/80;for(let k=1;k<=3;k++){const pp=lerp(prev,p,k/3),po=attackPose(tech,'swing',pp);a.back=-TECH[tech].step*smooth(pp);const seg=weaponSeg(a,po,.3);
   if(d.sid){const s=shieldSeg(d),x=segInt(seg.a,seg.b,s.a,s.b);if(x)return resolve(attW,tech,.3+x.t*.7,d,Math.abs(x.u*2-1),blk);}
   else{const s=weaponSeg(d),x=segInt(seg.a,seg.b,s.a,s.b);if(x){const gg=GEO[defW],pos=gg.butt+x.u*(gg.tip-gg.butt);return resolve(attW,tech,.3+x.t*.7,d,pos/gg.tip,blk);}}
   const b=bodySeg(d),xb=segInt(seg.a,seg.b,b.a,b.b);if(xb)return{outcome:'hit'};}prev=p;}
 return{outcome:'hit'};}
function shieldBearer(){const w=$('dW').value;return WD[w].twoHand?'gladius':w;}
function buildMatrix(){const tb=$('mx'),blk=+$('blk').value,sw=shieldBearer();let h='<tr><th class="rowh">Angreifer ↓ · Verteidiger →</th>'+MELEE.map(w=>`<th class="col">${w.name}</th>`).join('')+SHIELDS.map(s=>`<th class="col sh">${s.name}</th>`).join('')+'</tr>';
 const cells=[];
 for(const aw of MELEE){h+=`<tr><th class="rowh">${aw.name}</th>`;
  for(const dw of MELEE){const r=predict(aw.id,dw.id,null,mxTech,blk);cells.push([aw.id,dw.id,null]);h+=cellHtml(r,aw.id,dw.id,'',mxTech);}
  for(const s of SHIELDS){const r=predict(aw.id,sw,s.id,mxTech,blk);cells.push([aw.id,sw,s.id]);h+=cellHtml(r,aw.id,sw,s.id,mxTech);}
  h+='</tr>';}
 tb.innerHTML=h;matrixCells=cells;markCell();}
let matrixCells=[];
function cellHtml(r,a,d,s,tech){const o=OUT[r.outcome],mat=r.fxKind?MATCOL[r.fxKind]:'#555',tip=r.outcome==='hit'?'kein Kontakt':`${o.name} · ${r.ap.part} auf ${r.dp.part} · Klang: ${SOUND_NAMES[r.snd]||r.snd} · Initiative ${r.init==='D'?'Verteidiger':'Angreifer'}`;
 return `<td data-a="${a}" data-d="${d}" data-s="${s}" style="color:${o.col};background:${r.fxKind?mat+'22':'transparent'};box-shadow:inset 0 -3px 0 ${mat}66" title="${WD[a].name} → ${s?SD[s].name+' ('+WD[d].name+')':WD[d].name}: ${tip}">${o.sym}</td>`;}
function markCell(){for(const td of document.querySelectorAll('#mx td.cur'))td.classList.remove('cur');if(!lastCell)return;const td=document.querySelector(`#mx td[data-a="${lastCell[0]}"][data-d="${lastCell[1]}"][data-s="${lastCell[2]||''}"]`);if(td){td.classList.add('cur');}}
function playCell(a,d,s){$('aW').value=a;$('dW').value=d;$('dS').value=s||'';if(WD[a].twoHand)$('aS').value='';if($('tech').value==='mix'||$('tech').value==='random'){}else $('tech').value=mxTech;lastCell=[a,d,s||''];markCell();syncSelects();startExchange();}
function tourNext(){if(!tour)return;const c=matrixCells[tour.i++];if(!c){tour=null;$('tour').classList.remove('on');banner('Alle Paarungen gezeigt.');return;}
 $('combo').value='1';playCell(c[0],c[1],c[2]);}

// ---------------------------------------------------------------- Bedienung
function fill(sel,list,withNone){sel.innerHTML=(withNone?'<option value="">kein Schild</option>':'')+list.map(x=>`<option value="${x.id}">${x.name}</option>`).join('');}
fill($('aW'),MELEE);fill($('dW'),MELEE);fill($('aS'),SHIELDS,true);fill($('dS'),SHIELDS,true);
$('tech').innerHTML=TECH_ORDER.map(t=>`<option value="${t}">${TECH[t].name}</option>`).join('')+'<option value="mix">Gemischt (zufällig)</option>';
$('aW').value='long';$('dW').value='gladius';$('dS').value='';$('tech').value='mix';
$('mxTabs').innerHTML=TECH_ORDER.map(t=>`<button data-t="${t}" class="${t===mxTech?'on':''}">${TECH[t].name}</button>`).join('');
$('mxTabs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mxTech=b.dataset.t;for(const x of $('mxTabs').children)x.classList.toggle('on',x===b);buildMatrix();});
$('mx').addEventListener('click',e=>{const td=e.target.closest('td');if(!td)return;tour=null;$('tour').classList.remove('on');unlock();playCell(td.dataset.a,td.dataset.d,td.dataset.s);});
$('legend').innerHTML=Object.values(OUT).map(o=>`<span><i style="color:${o.col}">${o.sym}</i>${o.name}</span>`).join('')+
 `<span><i style="background:${MATCOL.metal}44">&nbsp;</i>Metall: Funken</span><span><i style="background:${MATCOL.boss}44">&nbsp;</i>Schildbuckel: Gong und Lichtring</span><span><i style="background:${MATCOL.wood}44">&nbsp;</i>Holz: Splitter</span>`;
function syncSelects(){const two=WD[$('aW').value].twoHand;$('aS').disabled=two;if(two)$('aS').value='';const twoD=WD[$('dW').value].twoHand;$('dS').disabled=twoD;if(twoD)$('dS').value='';}
let unlocked=false;function unlock(){if(unlocked)return;unlocked=true;if(audio()){ac.resume?.();prefill();}}
for(const id of ['aW','dW','aS','dS'])$(id).addEventListener('change',()=>{syncSelects();if(id==='dW')buildMatrix();});
$('blk').addEventListener('input',()=>{$('blkV').textContent=$('blk').value;});$('blk').addEventListener('change',buildMatrix);
$('speed').addEventListener('input',()=>{opt.speed=+$('speed').value/100;$('speedV').textContent=(opt.speed).toFixed(1).replace('.',',')+'×';});
$('play').onclick=()=>{unlock();tour=null;$('tour').classList.remove('on');startExchange();};
$('rand').onclick=()=>{unlock();tour=null;$('tour').classList.remove('on');const r=l=>l[Math.floor(Math.random()*l.length)];$('aW').value=r(MELEE).id;$('dW').value=r(MELEE).id;$('dS').value=Math.random()<.45?r(SHIELDS).id:'';$('aS').value=Math.random()<.3?r(SHIELDS).id:'';syncSelects();startExchange();};
$('tour').onclick=()=>{unlock();tour={i:0};$('tour').classList.add('on');tourNext();};
$('stop').onclick=()=>{tour=null;$('tour').classList.remove('on');act=null;queue=[];after=null;waitT=0;running=false;banner('');};

$('rules').innerHTML=`<ul>
<li><em>Kein neuer Würfel.</em> Ob geblockt wird, entscheidet weiter die heutige Blockchance (Schildfläche, Blockwert, Waffen-Blockwert, Verletzung, Erschöpfung). Neu ist nur, <em>wie</em> es aussieht und klingt: Statt „BLOCK“ über dem Kopf stellt der Verteidiger Schild oder Waffe in die Schlagbahn, und der Block passiert genau im Bild der Berührung.</li>
<li><em>Unterschiedliche Waffen, unterschiedliche Blocks.</em> Klinge auf Klinge klirrt hell, Hammer und Axt auf Klinge klonken schwer, Treffer auf Speer- oder Hellebardenstiel hacken ins Holz, Holz auf Holz klopft dumpf. Am Schild zählt die Stelle: Buckel (Gong und Lichtring), Metallrand, Holzfläche (Splitter), Faustschild (helles Klingen).</li>
<li><em>Vier Ausgänge.</em> Sauber geblockt (Angreifer federt zurück), Abgeglitten (Stich rutscht am Schild oder an der Klinge ab, Angreifer überstreckt), Bindung (zwei Schwerter schaben aneinander, die schnellere Waffe gewinnt), Deckung durchschlagen (schwere Wucht gegen schwachen Halt: Verteidiger wird zurückgeworfen, nur ein Streifer).</li>
<li><em>Initiative.</em> Wer sauber blockt oder abgleiten lässt, ist als Nächster dran; eine laufende Combo des Angreifers bricht ab. Wird die Deckung durchschlagen, behält der Angreifer die Initiative. <span class="warn">Das ist eine Regeländerung und kommt nur ins Spiel, wenn du zustimmst.</span></li>
<li><em>Kämpfe werden nicht länger.</em> Der sichtbare Block ersetzt den heutigen Ausgang, bei dem beide zuschlagen und nichts zu sehen ist. Zurückfedern (0,16 s) und Rückkehr (0,26 s) sind kürzer als die heutige Deckungszeit nach einem Block (0,5 s). Ausweichen bleibt unverändert.</li>
<li><em>Leistung.</em> Funken liegen in einem festen Puffer (${PMAX} Plätze, keine neuen Objekte pro Funke). Die Klänge werden einmal vorberechnet (je 3 Varianten) und danach nur abgespielt. Die Berührung prüft pro Bild 4 Zwischenschritte mit einer einfachen Linien-Schnittprüfung. Die Anzeige unten rechts im Bild zeigt die tatsächliche Zeichenzeit.</li>
</ul>`;
syncSelects();readOpts();queue=['slash'];place();buildMatrix();banner('Abspielen drücken oder ein Feld in der Übersicht anklicken');requestAnimationFrame(t=>{last=t;frame(t);});
window.BlockEditor={sfxTest:()=>{audio();const k=[...Object.keys(SOUNDS),'parry','blockShield','hitBlade','swing','swingHeavy'];return k.map(x=>{const t0=performance.now(),b=buf(x,1,0);return [x,b?+(b.duration.toFixed(2)):null,+(performance.now()-t0).toFixed(1)];});},predict,resolve,standOff,GEO,stats,_:{planGuard,fighter,shieldSeg,weaponSeg,predictCross,world,attackPose,segInt,SHS},matrix:()=>matrixCells.map(c=>({c,r:predict(c[0],c[1],c[2],mxTech,50)}))};
})();
