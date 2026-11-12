'use strict';
/* =====================================================================================================
   HUNDEFANG · Septimus Rabies, „der Hundsgraf“ (Wunsch Thomas, 25.10.2026)
   · Vorstellung: nächstes Kapitel nach dem Schuldeneintreiber (S.outside.stage==='done'), einmal, im Ludus. Danach steht sein Karren
     am Beastrium (Seite „beastrium“ bekommt oben den Karren).
   · Aufträge (Seite „hundefang“): täglich fünf Gerüchte mit 1–5 Totenköpfen, einer pro Tag. Trupp aus dem eigenen Kader
     (Wunsch Thomas 6.11.): bis zu drei Leute, einer davon ist immer der unbewaffnete Lockvogel, der vorgeschickt wird (Rüstung
     darf er behalten); bis zu zwei Kämpfer mit ihrer ganzen eigenen Ausrüstung (alle Waffen, auch Netz und Fernwaffen).
     Rabies verleiht nichts mehr. Lockvogel-Auswahl: Schwerverletzte und niedrige Talente stehen oben.
   · Sichtung durchs Fernglas, Hundebuch, Urteil des Kämpfers, dann Kampf Mann gegen Hund auf einem gemalten Schauplatz
     (Kampf und KI aus hund.js). Wunden, Tod und Lernen des Kämpfers zählen wie im echten Kampf.
   · Fang: Unterwerfung (sicher, wenn einer ein Netz dabei hat oder der Hund im Netz war, sonst 50 %) oder bewusstlos statt tot (stumpf 75 %, sonst 40 %, verblutet 20 %).
   · Gefangene Hunde: S.hundefang.dogs, Zwinger unter dem Beastrium (Seite „zwinger“, Treppe hinab), Kämpfe in der Arena
     (BEAST → Hund, arena-core/-challenges/-ui), Heilung je Tag (DOG.heal).
   · Speicherwert: S.hundefang = {stage:''|'open', day, jobs:[{id,skulls,breed,seed,mood,done}], jobDay, usedDay, dogs:[D], tip}
   ===================================================================================================== */
(()=>{
const M=window.MG,DOG=window.DOG,TX=window.HF_TEXT;if(!M||!DOG||!TX)return;
const S=M.s,A=window.DebtArt,SH=DOG.shots,ZW=DOG.zwinger,cl=M.clamp,$=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rnd=(a,b)=>a+Math.random()*(b-a),pick=l=>l[Math.floor(Math.random()*l.length)],lerp=(a,b,k)=>a+(b-a)*k,ease=k=>{k=cl(k,0,1);return k*k*(3-2*k);};
function rng32(seed){let s=(seed>>>0)||1;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const mkc=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
function px(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));}
function ell(g,x,y,rx,ry,c){g.fillStyle=c;g.beginPath();g.ellipse(x,y,Math.max(.5,rx),Math.max(.5,ry),0,0,Math.PI*2);g.fill();}
const W=1040,H=720,SPOT={x:600,y:410};
const st=()=>{const s=(S.hundefang??={stage:'',day:0,jobs:[],jobDay:0,usedDay:0,dogs:[],tip:0});if(!s.wv){for(const D of s.dogs||[])DOG.migrate(D);for(const j of s.jobs||[]){const B=DOG.BREEDS.find(x=>x.id===j.breed);if(B&&!j.done)j.skulls=DOG.skullsOf(B.soll);}s.wv=2;}return s;};// wv: alte Hunde einmal auf die Rassenwerte vom 27.10.2026 umgerechnet
let fight=null;

// =====================================================================================================
// TON · Hundelaute (hund-sound.js), dazu Paukenschlag, Donner, Netz, Schrei; folgt dem Ton-Schalter des Spiels
// =====================================================================================================
const AU=()=>DOG.audio,sndOn=()=>S.options?.sound!==false&&!document.hidden;
DOG.playSound=(kind,D)=>{if(!sndOn()||!AU()?.allow(kind,'z'+kind+(D?.id||''),kind==='growl'?2500:kind==='bark'?1500:300))return;AU().playFor(kind,D,.7);};
DOG.sound=(kind,d,force)=>{const b=S.battle;if(!sndOn()||!b?.hasDogs||(!force&&(b.paused||b.dogOver||b.result)))return;if(!AU().allow(kind,kind+(d?.id||''),kind==='growl'?2000:kind==='bark'?1200:120))return;AU().playFor(kind,d,.85);};
function sfx(kind,vol=1){if(!sndOn())return;const a=AU()?.ac();if(!a)return;const B=AU().bus(a),t0=a.currentTime+.01;
 const noise=(dur,f,q,g,att=.005)=>{const s=a.createBufferSource();s.buffer=AU().noiseBuf(a,dur);const bp=a.createBiquadFilter();bp.type='lowpass';bp.frequency.value=f;bp.Q.value=q;const e=a.createGain();e.gain.setValueAtTime(.0001,t0);e.gain.exponentialRampToValueAtTime(g*vol,t0+att);e.gain.exponentialRampToValueAtTime(.0001,t0+dur);s.connect(bp).connect(e).connect(B.dry);e.connect(B.rev);s.start(t0);s.stop(t0+dur+.05);};
 const tone=(f0,f1,dur,g,type='sine')=>{const o=a.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t0);o.frequency.exponentialRampToValueAtTime(f1,t0+dur);const e=a.createGain();e.gain.setValueAtTime(.0001,t0);e.gain.exponentialRampToValueAtTime(g*vol,t0+.01);e.gain.exponentialRampToValueAtTime(.0001,t0+dur);o.connect(e).connect(B.dry);e.connect(B.rev);o.start(t0);o.stop(t0+dur+.05);};
 if(kind==='drum'){tone(110,38,.9,1.4);noise(.25,900,.7,.6);}
 else if(kind==='thunder'){noise(2.6,320,.5,1.3,.08);tone(70,30,1.8,.8);}
 else if(kind==='net'){noise(.45,2600,.8,.35,.12);}
 else if(kind==='snap'){noise(.12,3800,1,.9);tone(240,90,.15,.5,'square');}
 else if(kind==='scream'){const o=a.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(520,t0);o.frequency.linearRampToValueAtTime(760,t0+.25);o.frequency.linearRampToValueAtTime(380,t0+1.1);const f=a.createBiquadFilter();f.type='bandpass';f.frequency.value=1100;f.Q.value=2;const e=a.createGain();e.gain.setValueAtTime(.0001,t0);e.gain.exponentialRampToValueAtTime(.35*vol,t0+.05);e.gain.exponentialRampToValueAtTime(.0001,t0+1.2);o.connect(f).connect(e).connect(B.dry);o.start(t0);o.stop(t0+1.3);}
 else if(kind==='page'){noise(.18,5200,.6,.18,.03);}
 else if(kind==='cart'){noise(.5,500,4,.2,.1);}}

// =====================================================================================================
// FIGUREN · Menschen über die Figuren des Spiels, Hunde über DOG.draw
// =====================================================================================================
function gen(q){const old=S.rng;try{S.rng=Math.floor(Math.random()*2147483646)+1;return M.makeGladiator(q,true);}finally{S.rng=old;}}
const act=(g,extra)=>({g,x:0,y:0,a:0,state:'idle',phase:0,energy:100,ammo:0,moveSpeed:0,team:0,bloodMarks:{},...extra});
function fig(c,g,x,y,K,dir,extra={}){c.save();c.translate(Math.round(x),Math.round(y));c.scale(K,K);try{M.renderLudusActors(c,[act(g,{a:dir>0?0:Math.PI,...extra})]);}catch(e){console.warn(e);}c.restore();}
const lying=(extra={})=>({state:'fallen',down:true,death:true,fallTimer:0,fallDuration:1,energy:0,...extra});
function dogAct(D,mode,extra){return Object.assign({dog:D,P:DOG.params(D),id:'hf'+Math.random().toString(36).slice(2),g:{dead:false,name:D.name},team:1,mode,clock:1,duration:1,cyc:0,moveSpeed:0,wounds:[],gore:{},bleed:{},mouthBlood:0,energy:100,hit:0,z:0,spray:[],a:0,down:false},extra||{});}
function drawDog(c,d,x,y,k,face,t){try{DOG.draw(c,d,Math.round(x),Math.round(y),k,face,{time:t});}catch(e){console.warn(e);}}
function walkDog(d,sp,dt){d.moveSpeed=sp;if(sp)d.cyc+=dt*sp/d.P.sz/DOG.cycLen(DOG.gaitOf(sp));}
function face(cv,g,mood,o={}){if(!cv)return;try{const c=cv.getContext('2d');c.clearRect(0,0,cv.width,cv.height);M.faceShot.paint(c,cv.width,cv.height,{g,team:o.team??0,mood,yaw:o.yaw??.4,zoom:o.zoom??1.12,pale:o.pale||0},2);}catch(e){console.warn(e);}}
// Hundebild für Arena-Karten und Zwinger-Liste: Länge etwa o.w Bildpunkte, Füße bei x,y
const portraits=new WeakMap();
DOG.portrait=function(c,D,o={}){let d=portraits.get(D);if(!d){d=dogAct(D,'stand');portraits.set(D,d);}const cnd=DOG.cond(D);d.wounds=(cnd.wounds||[]).map(w=>({...w,t:-1e9}));
 const dead=!!D.dead;d.mode=dead?'dead':o.mood==='proud'?'threat':o.mood==='fear'?'submit':o.mood==='idle'?'sit':'stand';d.g.dead=dead;d.submit=d.mode==='submit';d.growlT=d.mode==='threat'?1:0;
 const k=(o.w||100)/(82*d.P.sz);drawDog(c,d,o.x,o.y,k,o.face??1,o.t??performance.now()/1000);};

// ---------- Der Hundsgraf: grauer Bart, hager, Hundefellumhang, Hundeschädel als Kapuze, Fliegen ----------
function makeRabies(){const g=gen(1);g.id='hf-rabies';g.foam=true;g.name=TX.NAME;g.height=183;g.weight=66;g.age=54;g.muscle=40;g.armStrength=70;
 g.appearance={...g.appearance,skin:'#c49470',shade:'#94664a',hair:'#b1a592',style:3,beard:3};
 g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};g.equipment=g.enemyGear;return g;}
let RABIES=null;const rabies=()=>RABIES??=makeRabies();
// Rabies in jeder Großaufnahme erkennbar: Hundeschädel als Haube, Fellumhang an den Seiten und auf den Schultern, Fliegen
(M.faceOverlays??={})['hf-rabies']=(c,fm,t)=>{const s=fm.s,P=(x,y,w,h,col)=>{const p=fm.to(x,y);c.fillStyle=col;c.fillRect(Math.round(p.x),Math.round(p.y),Math.ceil(w*s),Math.ceil(h*s));};
 const fur=['#4a3424','#5e4430','#6e5038','#3a2a1c'];
 // Fellumhang: an den Seiten herab und zottelig über den Schultern (Hals bleibt frei)
 for(let i=0;i<9;i++){const sw=Math.sin(t*1.4+i)*.6;P(-36-i*1.2+sw,-42+i*2,2.4,54-i*2,fur[i%4]);P(34+i*1.2+sw,-42+i*2,2.4,54-i*2,fur[(i+1)%4]);}
 for(let i=0;i<40;i++){const x=-80+i*4;if(Math.abs(x+2)<17)continue;const top=9+Math.abs(Math.sin(i*1.7))*5+Math.max(0,Math.abs(x)-40)*.15;P(x,top,4.4,40,fur[i%4]);P(x+1,top,1.4,3,'#7c5c40');}
 // Hundeschädel als Haube: flaches Schädeldach, Rand auf der Stirn
 for(let y=-58;y<=-36;y++){const k=(y+46)/12,hw=32*Math.sqrt(Math.max(0,1-k*k));if(hw<1)continue;P(-hw,y,hw*2,1,y<-54?'#f4ecd6':y>-41?'#cfc3a6':'#e6dcc2');}
 P(-32,-38,64,4,'#b8ab8c');P(-30,-37,60,1,'#d8ccb0');
 // Augenhöhlen
 P(-22,-51,9,7,'#1a1210');P(13,-51,9,7,'#1a1210');P(-21,-50,3,2,'#3a2a1c');P(14,-50,3,2,'#3a2a1c');
 // Schnauze nach vorn in der Mitte, Nasenlöcher, Zähne über der Stirn (Fangzähne länger)
 P(-9,-52,18,16,'#d8ccb0');P(-8,-53,16,2,'#f4ecd6');P(-9,-40,18,3,'#b8ab8c');P(-5,-42,4,3,'#1a1210');P(1,-42,4,3,'#1a1210');
 for(let x=-22;x<=20;x+=3)P(x,-34,1.6,Math.abs(x+1)>6&&Math.abs(x+1)<10?5:2.6,'#fff8e8');
 // Fliegen
 c.fillStyle='#120c08';for(let i=0;i<5;i++){const a=t*(3+i*.7)+i*2,p=fm.to(Math.cos(a)*(36+i*4),-52+Math.sin(a*1.3)*18);c.fillRect(Math.round(p.x),Math.round(p.y),Math.max(2,Math.round(s*.9)),Math.max(2,Math.round(s*.9)));}};M.registerFace?.(/rabies|hundsgraf/i,()=>rabies());
function rabiesCloak(c,x,y,K,dir,t,front){const u=K*.6,hh=rabies().height/180,Y=v=>y-v*hh*u,X=v=>x+v*u,pal=['#4a3424','#5e4430','#6e5038','#3a2a1c'];
 if(!front){for(let i=0;i<22;i++){const xx=X(-22+i*2),top=Y(64-Math.abs(i-10.5)*.5),len=(46+Math.sin(i*1.9)*4)*hh*u,sw=Math.sin(t*1.6+i*.6)*.6*u;px(c,xx+sw,top,2.2*u,len,pal[i%4]);px(c,xx+sw,top+len-2*u,2.2*u,3*u,pal[3]);}
  for(const k of [-20,19]){px(c,X(k),Y(18),3*u,8*u,pal[2]);px(c,X(k)-u,Y(11),5*u,3*u,pal[3]);for(let i=0;i<3;i++)px(c,X(k)-u+i*1.6*u,Y(9),u,1.4*u,'#d8ccb0');}return;}
 for(const s of [-1,1]){px(c,X(s>0?9:-13),Y(88),4*u,26*hh*u,pal[1]);px(c,X(s>0?12:-14),Y(85),2*u,22*hh*u,pal[3]);}
 for(let i=0;i<14;i++)px(c,X(-14+i*2),Y(64)+Math.abs(i-6.5)*.3*u,2.2*u,5*u,pal[i%3]);
 const T=Y(92);px(c,X(-8),T,16*u,8*u,'#e6dcc2');px(c,X(-7),T-u,14*u,2*u,'#f4ecd6');px(c,X(-10),T+u,3*u,5*u,'#5e4430');px(c,X(7),T+u,3*u,5*u,'#5e4430');
 px(c,X(-6),T+2.5*u,4*u,3*u,'#1a1210');px(c,X(2),T+2.5*u,4*u,3*u,'#1a1210');px(c,X(-2.5),T+5*u,5*u,5*u,'#d8ccb0');px(c,X(-1.5),T+5.5*u,3*u,1.4*u,'#2a1a10');
 for(const k of [-4.5,3.2])px(c,X(k),T+8*u,1.3*u,3.5*u,'#fff8e8');for(let i=0;i<4;i++)px(c,X(-2.4+i*1.3),T+9.6*u,.8*u,1.4*u,'#fff8e8');}
function rabiesFlies(c,x,y,K,t){const u=K*.6;c.fillStyle='#120c08';for(let i=0;i<5;i++){const a=t*(3+i*.7)+i*2,r=(12+i*3)*u;c.fillRect(Math.round(x+Math.cos(a)*r),Math.round(y-100*u+Math.sin(a*1.3)*r*.5),Math.max(1,u*.9),Math.max(1,u*.9));}}
// Schaum vor dem Mund (Tollwut im Namen): Blasen am Mund, Faden ins Kinn, ab und zu fällt ein Tropfen
function rabiesFoam(c,x,y,K,dir,t){const u=K*.6,hh=rabies().height/180,X=v=>x+v*u,Y=v=>y-v*hh*u,mx=X(FOAM.x*dir),my=Y(FOAM.y),W1='#f7f5ee',W2='#d8d4c6';
 px(c,mx-2*u,my,4.2*u,1.6*u,W1);px(c,mx-1*u,my-.8*u,2*u,1*u,W1);px(c,mx+dir*1.4*u,my+1.2*u,1.4*u,1*u,W2);
 const len=(1.6+1.6*(.5+.5*Math.sin(t*2.3)))*u;px(c,mx+dir*.6*u,my+1.4*u,.9*u,len,W1);const q=(t*.6)%1;if(q<.75)px(c,mx+dir*.6*u,my+1.6*u+len+q*q*14*u,.9*u,.9*u,W1);}
const FOAM={x:1.4,y:69.5};
function drawRabies(c,x,y,K,dir,t,extra={}){rabiesCloak(c,x,y,K,dir,t,false);fig(c,rabies(),x,y,K,dir,extra);rabiesCloak(c,x,y,K,dir,t,true);rabiesFoam(c,x,y,K,dir,t);rabiesFlies(c,x,y,K,t);}
M.drawRabies=drawRabies;// für die Rasterkarte (welt-npc.js): Rabies im Beastrium, nur Zeichnen
function rabiesFace(cv,mood='grin'){face(cv,rabies(),mood,{zoom:1.05});}
// Große, lebendige Großaufnahme (wie beim Medicus): Kamera schwenkt, Mund bewegt sich, wenn er spricht
function rabiesLive(id,mood='grin'){const c=$(id);if(!c||c._live)return;c._live=true;let t=0;const tick=()=>{if(!c.isConnected)return;t+=1/30;try{M.faceShot.paint(c.getContext('2d'),c.width,c.height,{g:rabies(),team:0,mood:(t%7)<1.4?'confident':mood,yaw:Math.sin(t*.55)*.32,zoom:1.12},t+2);}catch(e){}setTimeout(()=>requestAnimationFrame(tick),33);};tick();}

// =====================================================================================================
// AUFTRÄGE · Stufen nach Kampf-Soll der Rasse (DOG.skullsOf), täglich neu; die Hunde sind aus Rasse und Samen reproduzierbar
// =====================================================================================================
const breedOf=id=>DOG.BREEDS.find(b=>b.id===id);
const skullsOf=soll=>DOG.skullsOf(soll);
function poolOf(k){return DOG.BREEDS.filter(b=>TX.RASSEN[b.id]&&skullsOf(b.soll)===k+1);}
function newJob(k){const pool=poolOf(k),w=pool.map(b=>b.id==='wolf'?.3:b.wolf?.5:1),sum=w.reduce((a,b)=>a+b,0);let r=Math.random()*sum,B=pool[0];for(let i=0;i<pool.length;i++){r-=w[i];if(r<=0){B=pool[i];break;}}
 const winter=['husky','malamute','polarwolf'].includes(B.id),time=B.wolf&&B.id!=='aethiopwolf'?'abend':pick(['morgen','tag','tag','abend']);// Wölfe (alle mit B.wolf) abends, der Äthiopische Wolf jagt bei Tag
 return {id:Math.random().toString(36).slice(2),skulls:k+1,breed:B.id,seed:(Math.random()*4294967296)>>>0,mood:{season:winter?'winter':pick(['fruehling','sommer','herbst','herbst']),time,weather:B.wolf&&!['aethiopwolf','polarwolf'].includes(B.id)?'nebel':pick(['klar','klar','bewoelkt','nebel'])},done:null};}
const cache=new Map();// Hund und Schauplatz je Auftrag (nicht gespeichert)
function jobDog(j){let c=cache.get(j.id);if(!c){c={};cache.set(j.id,c);}return c.D??=DOG.create(j.breed,j.seed);}
function jobBg(j){let c=cache.get(j.id);if(!c){c={};cache.set(j.id,c);}return c.bg??=paintPlace(j);}
function daily(){const s=st();if(s.day===S.day)return;const n=s.day?Math.max(0,S.day-s.day):0;if(n)for(const D of s.dogs)DOG.heal(D,Math.min(n,30));s.day=S.day;
 if(s.jobDay!==S.day){s.jobs=[0,1,2,3,4].map(newJob);s.jobDay=S.day;cache.clear();}}
const usedToday=()=>st().usedDay===S.day;

// =====================================================================================================
// SCHAUPLATZ (1040 × 720 wie das Kampffeld), gemalt mit den Zeichnern der Außenwelt; dazu die Spuren des Unfugs
// =====================================================================================================
function noise(g,r,x,y,w,h,n,cols,s=1){for(let i=0;i<n;i++)px(g,x+r()*w,y+r()*h,s,s,cols[i%cols.length]);}
function paintPlace(j){const R=TX.RASSEN[j.breed],ort=R.ort,biome=TX.ORTE[ort].biome,r=rng32(j.seed),P=A.palette(j.mood,biome);
 const h=mkc(520,360),g=h.getContext('2d');g.imageSmoothingEnabled=false;
 if(ort==='gasse'||ort==='markt'){px(g,0,0,520,360,P.stone[2]);for(let y=60;y<360;y+=6)for(let x=(y/6)%2?0:4;x<520;x+=9){px(g,x,y,8,5,P.stone[(x*7+y*3)%3]);px(g,x,y+5,8,1,P.stone[3]);}
  for(let i=0;i<5;i++)ell(g,40+r()*440,130+r()*180,10+r()*16,3+r()*3,'#4a5560aa');px(g,0,312,520,4,P.stone[3]);noise(g,r,0,100,520,250,500,['#5a4a3a','#7a6a50'],1);}
 else{px(g,0,0,520,360,P.grass[0]);for(let i=0;i<260;i++)ell(g,r()*520,r()*360,3+r()*9,1+r()*3,pick([P.grass[1],P.grass[2]]));noise(g,r,0,0,520,360,1600,[P.grass[2],P.grass[3]],1);
  if(ort!=='wald'){for(let x=0;x<520;x++){const y=205+Math.sin(x*.012+j.seed%7)*14,w=26+Math.sin(x*.05)*3;px(g,x,y-w,1,w*2,P.path);if(x%6===0)px(g,x,y-w+3+((x*13)%40),2,1,P.dirt[3]);}}
  else{for(let i=0;i<120;i++)px(g,r()*520,r()*360,2,1,pick(['#7a5a2a','#8a6a30','#5a4020']));for(let i=0;i<5;i++)ell(g,60+r()*400,140+r()*160,22+r()*20,8+r()*6,P.dirt[2]+'99');}}
 const st2=mkc(520,170),s=st2.getContext('2d');s.imageSmoothingEnabled=false;const B=A.BASE,house=(kind,x,w,hh,extra={})=>{try{A.building(s,{kind,x,w,h:hh,v:r(),v2:r(),roof:Math.floor(r()*5),wall:Math.floor(r()*4),door:r()<.7?{x:x+w*(.3+r()*.4)}:null,chimney:r()<.5?{x:x+w*.7}:null,...extra},P,r);}catch(e){console.warn(kind,e);}};
 const row=(kinds,minW,maxW,hh)=>{let x=-10;while(x<520){const w=minW+r()*(maxW-minW);house(pick(kinds),x,w,hh[0]+r()*(hh[1]-hh[0]));x+=w+(r()<.3?6+r()*16:0);}};
 if(ort==='gasse')row(['stadthaus','stein','fachwerk','stadthaus'],120,170,[100,125]);
 else if(ort==='markt'){row(['kontor','stadthaus','stein'],130,180,[100,125]);for(let x=30;x<520;x+=130+r()*40)house('stand',x,84,64);}
 else if(ort==='dorf'){let x=-30;while(x<540){const k=pick(['fachwerk','kate','fachwerk','scheune','fachwerk','kate','baeume']),w=k==='baeume'?60:130+r()*60;house(k,x,w,k==='baeume'?60:100+r()*25);x+=w+4+r()*14;}}
 else if(ort==='hof'){house('bauernhof',-10,190,110);house('scheune',190,160,95);house('heu',356,70,44);house('stall',420,130,75);}
 else if(ort==='friedhof'){house('friedhofsmauer',-10,540,40);house('kapelle',200,110,70);}
 else{for(let x=-10;x<530;x+=14+r()*14)A.tree(s,x,B+2-r()*30,1.6+r()*.9,r,P,r()<.5?'conifer':'leaf');if(j.breed==='husky'||j.breed==='malamute')house('huette',300,70,50);}
 g.drawImage(st2,0,(ort==='wald'||ort==='friedhof'?96:112)-B);
 if(ort==='wald'||ort==='friedhof'||ort==='hof'||ort==='dorf'){for(let y=110;y<350;y+=26+r()*20){A.bush(g,6+r()*14,y,1.3,r,P);A.bush(g,500+r()*14,y,1.3,r,P);}}
 if(ort==='wald'){for(let x=-10;x<530;x+=40+r()*40)A.tree(g,x,362+r()*6,2+r()*.8,r,P,r()<.5?'conifer':'leaf');}
 else if(ort==='gasse'){px(g,0,330,520,30,P.stone[0]);for(let x=0;x<520;x+=16){px(g,x,330,15,7,P.stone[1]);px(g,x+8,338,15,7,P.stone[1]);}for(let x=40;x<520;x+=110+r()*60){ell(g,x,330,9,12,'#6b4a2e');px(g,x-9,322,18,2,'#3e2a18');}}
 else if(ort==='markt'){for(let x=20;x<520;x+=60+r()*50){ell(g,x,338,8,12,'#a8603a');ell(g,x-2,334,3,8,'#c47e56');px(g,x-3,324,6,3,'#7a4024');}px(g,0,350,520,10,P.stone[0]);}
 else if(ort==='friedhof'){for(let x=10;x<520;x+=34+r()*24){const hh=10+r()*8;px(g,x,342-hh,9,hh,P.stone[1]);px(g,x+1,342-hh-1,7,2,P.stone[0]);px(g,x+3,342-hh+3,3,1,P.stone[3]);px(g,x+4,342-hh+2,1,4,P.stone[3]);}}
 else{for(let x=0;x<520;x+=13){px(g,x,326,3,22,'#6b4a2e');px(g,x,326,1,22,'#8a6038');}px(g,0,331,520,2,'#5b3a20');px(g,0,340,520,2,'#5b3a20');}
 if(ort==='friedhof')for(let i=0;i<14;i++){const x=i%2?20+r()*90:410+r()*90,y=130+r()*190,hh=9+r()*6;px(g,x-1,y,11,2,'#00000030');px(g,x,y-hh,9,hh,P.stone[1]);px(g,x+1,y-hh-1,7,2,P.stone[0]);px(g,x+4,y-hh+2,1,4,P.stone[3]);px(g,x+2,y-hh+3,5,1,P.stone[3]);}
 const c=mkc(W,H),x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(h,0,0,W,H);
 if(j.mood.time==='abend'){x.fillStyle='#14183a55';x.fillRect(0,0,W,H);}
 paintMischief(x,j);return c;}
function victimOf(j){let c=cache.get(j.id);if(!c){c={};cache.set(j.id,c);}return c.v??=(()=>{const g=gen(Math.random()<.5?0:1);g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};g.equipment=g.enemyGear;g.dead=true;for(const p of ['neck','rfa','lt'])if(g.body[p])g.body[p].hp=Math.max(1,g.body[p].hp*.2);return g;})();}
function treeMan(j){let c=cache.get(j.id);if(!c){c={};cache.set(j.id,c);}return c.tm??=(()=>{const g=gen(0);g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};g.equipment=g.enemyGear;return g;})();}
function blood(c,x,y,rx,ry){ell(c,x,y,rx+3,ry+2,'#3e0a06');ell(c,x,y,rx,ry,'#6e120b');ell(c,x-rx*.3,y-ry*.3,rx*.35,ry*.3,'#8d1c13');}
function bone(c,x,y,len,ang,col='#e8dcc0'){c.save();c.translate(x,y);c.rotate(ang);px(c,-len/2,-1.5,len,3,col);ell(c,-len/2,-2,2.4,2,col);ell(c,-len/2,2,2.4,2,col);ell(c,len/2,-2,2.4,2,col);ell(c,len/2,2,2.4,2,col);c.restore();}
function skullProp(c,x,y){ell(c,x,y,7,6,'#e8dcc0');px(c,x-4,y+3,8,4,'#d8ccb0');px(c,x-4,y-2,3,3,'#2a1a10');px(c,x+1,y-2,3,3,'#2a1a10');for(let i=0;i<4;i++)px(c,x-3+i*2,y+5,1,2,'#2a1a10');}
function leg(c,x,y,ang){c.save();c.translate(x,y);c.rotate(ang);px(c,-22,-4,30,8,'#c8946a');px(c,-22,-4,30,2,'#e0b088');px(c,8,-3,12,7,'#b8845a');px(c,18,-3,8,8,'#5b3a20');px(c,18,4,10,2,'#3e2a18');ell(c,-23,0,4,5,'#8d1c13');ell(c,-24,0,2,2.5,'#e8dcc0');c.restore();}
function sheep(c,x,y,dir,dead,t=0){c.save();c.translate(x,y);c.scale(dir,1);if(dead){ell(c,0,-6,18,8,'#e8e2d4');ell(c,-10,-8,6,4,'#f4f0e6');px(c,14,-8,8,6,'#2a2420');for(let i=0;i<4;i++)px(c,-8+i*5,-16-(i%2)*2,2,9,'#2a2420');blood(c,10,0,12,4);}
 else{const b=Math.sin(t*4);for(let i=0;i<4;i++)px(c,-11+i*7,-6,2.4,7,'#2a2420');ell(c,0,-14+b,16,9,'#e8e2d4');for(let i=0;i<6;i++)ell(c,-12+i*5,-20+b+(i%2)*2,4,3.5,'#f4f0e6');px(c,13,-20+b,8,7,'#2a2420');px(c,19,-16+b,2,2,'#e8e2d4');px(c,13,-21+b,2,3,'#2a2420');}c.restore();}
function chicken(c,x,y,dir,dead,t=0){c.save();c.translate(x,y);c.scale(dir,1);if(dead){ell(c,0,-3,7,3.5,'#f0ece0');px(c,5,-5,3,2,'#c22a1a');px(c,-2,-6,1,3,'#d8a030');ell(c,1,0,5,2,'#8d1c13aa');}
 else{const h=Math.abs(Math.sin(t*9))*3;px(c,-1,-4-h,1,4,'#d8a030');px(c,2,-4-h,1,4,'#d8a030');ell(c,0,-8-h,6,4.5,'#f0ece0');ell(c,5,-12-h,3,3,'#f0ece0');px(c,7,-12-h,3,1.5,'#e0a020');px(c,4,-16-h,3,2,'#c22a1a');ell(c,-5,-10-h,2.5,3,'#e4ddcc');}c.restore();}
function ham(c,x,y){ell(c,x,y,13,8,'#a84a3a');ell(c,x-2,y-2,9,5,'#c46a56');ell(c,x+3,y+1,4,3,'#e8d0c0');px(c,x+11,y-2,8,3,'#e8dcc0');for(let i=0;i<5;i++)ell(c,x-24+i*7,y+10+Math.sin(i)*2,4,2.6,'#8a3a2a');}
function trough(c,x,y,wine){px(c,x-38,y-18,76,20,'#6f6a5f');px(c,x-38,y-18,76,3,'#9a9486');px(c,x-34,y-15,68,6,wine?'#5a0e1a':'#3a5a6a');px(c,x-30,y-14,20,1,wine?'#8a2a3a':'#6a8a9a');
 if(!wine){px(c,x+8,y-30,9,14,'#4a3020');px(c,x+6,y-32,13,4,'#3a2414');px(c,x+10,y-18,6,4,'#c8946a');}else{px(c,x+18,y-26,14,10,'#6b4a2e');px(c,x+20,y-24,10,6,'#8a6038');}px(c,x-40,y+2,80,3,'#00000030');}
function grave(c,x,y){px(c,x-34,y-10,68,22,'#2a1e14');px(c,x-34,y-10,68,3,'#4a3420');ell(c,x+44,y-2,22,9,'#6f5a38');ell(c,x+44,y-6,16,6,'#8a7148');px(c,x-8,y-46,20,34,'#8b8578');px(c,x-6,y-48,16,4,'#9a9486');px(c,x+1,y-40,2,14,'#5b574e');px(c,x-3,y-35,10,2,'#5b574e');
 bone(c,x-24,y-2,14,.3);skullProp(c,x-12,y-4);bone(c,x+6,y+2,16,-.2);}
function bonePile(c,x,y){ell(c,x,y,40,9,'#00000030');for(let i=0;i<14;i++)bone(c,x-30+((i*17)%60),y-4-((i*7)%8),12+(i%3)*4,(i*1.3)%3);skullProp(c,x-18,y-8);skullProp(c,x+20,y-6);}
// Echte Hähne aus dem Hahnengenerator (hahn-engine.js), Qualität 1 = die schlechtesten Werte; gezeichnet mit ART.rooster
const ROO=mkc(96,72);
function weakRoosters(j){let c=cache.get(j.id);if(!c){c={};cache.set(j.id,c);}return c.roo??=(()=>{const r=rng32(j.seed^0x51);return Array.from({length:7},(_,i)=>{const R=window.CF?.createRooster?.({seed:Math.floor(r()*4294967295),minQuality:1,maxQuality:1});return R?{R,x:SPOT.x-150+((i*53)%300),y:SPOT.y-46+((i*29)%90),dir:i%2?1:-1,dead:i<2,t0:i*2.4,ph:r()*6}:null;}).filter(Boolean);})();}
function drawRooster(c,R,x,y,o={}){if(!window.ArenaArt?.rooster)return;const g=ROO.getContext('2d');g.clearRect(0,0,96,72);g.imageSmoothingEnabled=false;
 try{window.ArenaArt.rooster(g,R,{w:96,h:72,size:40,x:48,y:64,t:o.t||0,mood:o.mood||'idle',face:o.face||1,roll:o.roll||0,shadow:!o.roll,seed:o.seed||0});}catch(e){return;}
 const k=o.k||.62;c.drawImage(ROO,Math.round(x-48*k),Math.round(y-64*k),Math.round(96*k),Math.round(72*k));}
function coop(c,x,y){px(c,x-48,y-56,96,56,'#6b4a2e');for(let k=0;k<96;k+=7)px(c,x-48+k,y-56,1,56,'#4e3420');for(let i=0;i<12;i++)px(c,x-56+i*1,y-66+i,112-i*2,1,'#5a3b2a');px(c,x-58,y-66,116,4,'#4a2e1e');px(c,x-12,y-30,24,30,'#1a120c');px(c,x-48,y-4,96,4,'#3e2a18');for(let i=0;i<8;i++)px(c,x+52+i*7,y-24,2,24,'#7a5a3a');px(c,x+52,y-20,56,2,'#7a5a3a');px(c,x+52,y-10,56,2,'#7a5a3a');}
function feathers(c,x,y,t,n=18){for(let i=0;i<n;i++){const k=((t*.4+i*.137)%1),xx=x+Math.sin(i*2.1+t*1.3)*40*k+(i%5-2)*8,yy=y-60+k*70+Math.sin(t*3+i)*4;px(c,xx,yy,3,1.5,'#f4f0e6');}}
const UNF={leiche:{v:{dx:-38,dy:0,dir:1},d:{dx:30,dy:4,face:-1,mode:'gnaw'}},kehle:{v:{dx:-30,dy:0,dir:-1},d:{dx:36,dy:3,face:-1,mode:'grip',grip:{x:29,y:-7}}},
 bein:{d:{dx:18,dy:2,face:-1,mode:'gnaw'}},wurst:{d:{dx:26,dy:2,face:-1,mode:'gnaw'}},huehner:{d:{dx:0,dy:0,face:1,mode:'snap'}},schaf:{d:{dx:34,dy:3,face:-1,mode:'grip',grip:{x:29,y:-7}}},
 grab:{d:{dx:-58,dy:-6,face:1,mode:'scent'}},schlaf:{d:{dx:0,dy:-10,face:1,mode:'sleep'}},brunnen:{d:{dx:-58,dy:4,face:1,mode:'drink'}},baum:{d:{dx:-42,dy:30,face:1,mode:'bars'}},wolfsleiche:{d:{dx:34,dy:2,face:-1,mode:'threat'}}};
function paintMischief(c,j){const u=TX.RASSEN[j.breed].unfug,X=SPOT.x,Y=SPOT.y,K=1/.6;
 if(u==='leiche'||u==='kehle'){const V=UNF[u].v;blood(c,X+V.dx+(V.dir>0?-6:6),Y+4,30,9);fig(c,victimOf(j),X+V.dx,Y,K,V.dir,lying());}
 else if(u==='bein'){blood(c,X-30,Y+2,16,5);leg(c,X-26,Y-2,.2);for(let i=0;i<8;i++)ell(c,X-60-i*26,Y+6+Math.sin(i)*6,3,1.5,'#6e120b');}
 else if(u==='wurst'){px(c,X-90,Y-48,70,40,'#6b4a2e');px(c,X-94,Y-52,78,6,'#b8382e');px(c,X-92,Y-12,4,14,'#4e3420');px(c,X-28,Y-12,4,14,'#4e3420');ham(c,X-14,Y-2);blood(c,X-60,Y+8,14,4);if(['metzgerhund','mastino'].includes(j.breed)){fig(c,victimOf(j),X-150,Y+14,K,1,lying());blood(c,X-156,Y+18,22,7);}}
 else if(u==='huehner'){coop(c,X-150,Y-30);for(const h of weakRoosters(j).filter(h=>h.dead)){blood(c,h.x+4,h.y+2,9,3);drawRooster(c,h.R,h.x,h.y,{roll:1.5,mood:'fear'});}for(let i=0;i<26;i++)px(c,X-140+((i*37)%240),Y-30+((i*23)%70),3,1.5,'#f4f0e6');}
 else if(u==='schaf')sheep(c,X-6,Y+4,1,true);
 else if(u==='grab')grave(c,X,Y);
 else if(u==='schlaf')bonePile(c,X,Y);
 else if(u==='brunnen')trough(c,X,Y,j.breed==='bordeaux');
 else if(u==='baum'){const P=A.palette(j.mood,'dorf'),tc=mkc(160,200),tg=tc.getContext('2d');tg.imageSmoothingEnabled=false;A.tree(tg,80,196,3,rng32(j.seed^77),P,'leaf');c.drawImage(tc,X-160,Y-360,320,400);}
 else if(u==='wolfsleiche'){blood(c,X-30,Y+4,26,7);drawDog(c,dogAct(DOG.create('wolf',j.seed^99),'dead',{g:{dead:true},deathAt:-9,clock:9,pool:{r:14}}),X-34,Y,1,1,0);}}
function liveMischief(c,j,t){const u=TX.RASSEN[j.breed].unfug,X=SPOT.x,Y=SPOT.y;
 if(u==='schaf')for(let i=0;i<4;i++){const run=(t*28+i*60)%260;sheep(c,X+90+run*(i%2?1:.6),Y-60+i*34,1,false,t+i);}
 if(u==='huehner'){const L=weakRoosters(j).filter(h=>!h.dead),cyc=2.4;L.forEach((h,i)=>{const killAt=cyc*(i+1)-.35,gone=t>=killAt;
   if(gone){if(!h.splat){h.splat=1;h.dx=h.x;h.dy=h.y;}blood(c,h.dx+4,h.dy+2,8,3);drawRooster(c,h.R,h.dx,h.dy,{roll:1.5,mood:'fear',t});return;}
   const panic=t>killAt-1.2,sp=panic?60:16,xx=h.x+Math.sin(t*(panic?3:.8)+h.ph)*(panic?40:24),yy=h.y+Math.cos(t*(panic?2.6:.6)+h.ph)*(panic?14:6);h.cx=xx;h.cy=yy;
   drawRooster(c,h.R,xx,yy-(panic?Math.abs(Math.sin(t*12+h.ph))*6:0),{mood:panic?'fear':'walk',t:t+h.ph,face:Math.cos(t*(panic?3:.8)+h.ph)>0?1:-1});});
  feathers(c,X,Y,t,30);}
 if(u==='baum')fig(c,treeMan(j),X-34+Math.sin(t*1.7)*2,Y-62,1/.6*.8,1,{state:'idle',facePain:.6});}
function dogFor(j){const u=TX.RASSEN[j.breed].unfug,U=UNF[u].d,d=dogAct(jobDog(j),U.mode,{gripTarget:U.grip||null,mouthBlood:['leiche','kehle','schaf','bein','wolfsleiche'].includes(u)?.9:.3});d.x=SPOT.x+U.dx;d.y=SPOT.y+U.dy;d.face=U.face;return d;}
function animDog(d,j,t){const u=TX.RASSEN[j.breed].unfug;d.clock=1;
 if(u==='kehle'||u==='schaf'){const p=t%1.1;d.shaking=p<.4?.4-p:0;}
 if(u==='huehner'){const L=weakRoosters(j).filter(h=>!h.dead),cyc=2.4,i=Math.floor(t/cyc),h=L[i],p=t%cyc;
  if(!h){d.mode=(t%4)<2.5?'gnaw':'threat';return;}const tx=(h.cx??h.x)+(d.x>h.cx?26:-26),ty=h.cy??h.y;d.face=(h.cx??h.x)>=d.x?1:-1;
  if(p<1.5){d.mode='charge';walkDog(d,220,1/60);d.x+=(tx-d.x)*.08;d.y+=(ty-d.y)*.08;}else if(p<2.05){d.mode='snap';d.clock=(p-1.5)*.8;d.duration=.4;d.mouthBlood=Math.min(1,d.mouthBlood+.01);}else{d.mode='grip';d.gripTarget={x:27,y:-13};d.shaking=.3;}}
 if(u==='grab')d.mode=(t%5)<3.2?'scent':'gnaw';}

// =====================================================================================================
// FILM · Vollbild für Vorstellung und Sichtung (eigene Ebene über dem Spiel)
// =====================================================================================================
const SKULL=['..XXXXX..','.XXXXXXX.','XXXXXXXXX','X..XXX..X','X..XXX..X','XXXX.XXXX','.XXXXXXX.','..X.X.X..','..XXXXX..'];
const skull=(on,s=3)=>{let r='';SKULL.forEach((row,y)=>[...row].forEach((ch,x)=>{if(ch==='X')r+=`<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`;}));return `<svg class="hf-skull ${on?'on':''}" viewBox="0 0 9 9" width="${9*s}" height="${9*s}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;};
const skulls=(n,s=3)=>`<span class="hf-skulls" title="${n} von 5 Totenköpfen">${[1,2,3,4,5].map(i=>skull(i<=n,s)).join('')}</span>`;
const film=document.createElement('div');film.id='hfFilm';film.className='hf-film hf-hide';film.setAttribute('role','dialog');film.setAttribute('aria-label','Der Hundsgraf');
film.innerHTML=`<div class="hf-box"><canvas class="hf-main" id="hfCv" width="1280" height="720"></canvas><div class="hf-ui"><button type="button" id="hfSkip">Überspringen ›</button></div><div id="hfBubbles"></div>
 <div class="hf-book hf-hide" id="hfBook"><div class="hf-pages" id="hfPages"><div class="hf-page l" id="hfPageL"></div><div class="hf-page r" id="hfPageR"></div></div></div>
 <div class="hf-talk hf-hide" id="hfTalk"><canvas id="hfTalkFace" width="160" height="104"></canvas><p id="hfTalkText"></p><span class="hf-more">▼</span></div></div>
 <div class="hf-cap" id="hfCap"></div><div class="hf-say hf-hide" id="hfSay"><canvas id="hfSayFace" width="160" height="104"></canvas><p id="hfSayText"></p></div>
 <div class="hf-decide hf-hide" id="hfDecide"><button class="hf-go" type="button" id="hfAttack">⚔ Angreifen</button><button type="button" id="hfRetreat">↩ Rückzug</button></div>`;
document.body.appendChild(film);
const show=(id,on)=>$(id).classList.toggle('hf-hide',!on);
const FC=$('hfCv'),fc=FC.getContext('2d');fc.imageSmoothingEnabled=false;
const F={on:false,t:0,last:0,draw:null,skip:null,tap:null,shake:0,flash:0,flashCol:'#fff',raf:0};
function caption(html){$('hfCap').innerHTML=html||'';}
function bubble(x,y,who,text,dur=3){M.speakLine?.(text,/rabies/i.test(who||'')?'rabies':who,/rabies/i.test(who||'')?rabies():null,{name:who});const b=document.createElement('div');b.className='hf-bubble';b.style.left=(x/1280*100)+'%';b.style.top=(y/720*100)+'%';b.innerHTML=(who?`<small>${esc(who)}</small>`:'')+esc(text);$('hfBubbles').appendChild(b);setTimeout(()=>b.remove(),dur*1000);}
function openFilm(draw){film.classList.remove('hf-hide','bookmode');F.on=true;F.t=0;F.last=performance.now();F.draw=draw;F.tap=null;F.shake=0;F.flash=0;$('hfBubbles').innerHTML='';caption('');for(const id of ['hfBook','hfTalk','hfSay','hfDecide'])show(id,false);cancelAnimationFrame(F.raf);F.raf=requestAnimationFrame(filmLoop);}
function closeFilm(){F.on=false;cancelAnimationFrame(F.raf);film.classList.add('hf-hide');film.classList.remove('bookmode');$('hfBubbles').innerHTML='';bookTimers.forEach(clearTimeout);}
function filmLoop(now){if(!F.on)return;let dt=Math.min(.05,(now-F.last)/1000);F.last=now;{const n=M.speechNow?.();if(n&&!n.soft&&M.speechHold?.())dt*=.3;}F.t+=dt;F.shake=Math.max(0,F.shake-dt);F.flash=Math.max(0,F.flash-dt*1.6);
 fc.setTransform(1,0,0,1,0,0);fc.fillStyle='#050302';fc.fillRect(0,0,1280,720);if(F.shake>0)fc.translate((Math.random()-.5)*F.shake*30,(Math.random()-.5)*F.shake*30);
 try{F.draw?.(fc,F.t,dt);}catch(e){console.error(e);}
 fc.setTransform(1,0,0,1,0,0);if(F.flash>0){fc.globalAlpha=Math.min(1,F.flash);fc.fillStyle=F.flashCol;fc.fillRect(0,0,1280,720);fc.globalAlpha=1;}
 F.raf=requestAnimationFrame(filmLoop);}
$('hfSkip').onclick=()=>F.skip?.();FC.onclick=()=>F.tap?.();
function timeline(list){const done=new Set();return t=>{list.forEach((e,i)=>{if(!done.has(i)&&t>=e[0]){done.add(i);try{e[1]();}catch(err){console.error(err);}}});};}
function bigText(c,txt,x,y,size,col,alpha=1){c.save();c.globalAlpha=alpha;c.font=`900 ${size}px "Courier Prime",monospace`;c.textAlign='center';c.textBaseline='middle';c.lineWidth=Math.max(4,size/7);c.strokeStyle='#120806';c.strokeText(txt,x,y);c.fillStyle=col;c.fillText(txt,x,y);c.restore();}

// =====================================================================================================
// VORSTELLUNG · Karren vor dem Ludus, Pluto, der Rekrut mit der Hand, Titel, Angebot
// =====================================================================================================
let gateBG=null;
function paintGate(){const c=mkc(640,360),g=c.getContext('2d');g.imageSmoothingEnabled=false;const r=rng32(4242);
 for(let y=0;y<150;y++){const k=y/150;px(g,0,y,640,1,`rgb(${Math.round(lerp(58,214,k))},${Math.round(lerp(40,112,k))},${Math.round(lerp(78,64,k))})`);}
 ell(g,470,128,26,26,'#f4c070');ell(g,470,128,22,22,'#ffd890');for(let x=0;x<640;x+=2){const h=118+Math.sin(x*.013)*10+Math.sin(x*.05)*3;px(g,x,h,2,40,'#3a2a38');}
 for(let x=0;x<640;x+=2)px(g,x,96,2,140,(x>>1)%2?'#8c7c66':'#857560');for(let y=100;y<236;y+=10)for(let x=(y/10)%2?0:12;x<640;x+=24)px(g,x,y,22,1,'#6a5c48');
 for(let x=0;x<640;x+=16)px(g,x,88,12,10,'#8c7c66');px(g,0,96,640,3,'#a89880');
 px(g,96,120,124,116,'#2a1e16');for(let x=100;x<216;x+=12){px(g,x,124,10,112,'#5b3d26');px(g,x,124,2,112,'#6e4a30');}px(g,96,150,124,4,'#3e2a1a');px(g,96,200,124,4,'#3e2a1a');for(let k=0;k<20;k++)px(g,96+k*6,112-Math.sin(k/19*Math.PI)*14,8,10,'#8c7c66');
 px(g,236,130,60,30,'#5b3d26');px(g,240,134,52,22,'#7a5a3a');
 px(g,0,236,640,124,'#7a6440');for(let i=0;i<900;i++)px(g,r()*640,236+r()*124,1+(r()<.2),1,pick(['#6a5434','#8a7450','#5a4a2e']));for(let x=0;x<640;x++){px(g,x,290+Math.sin(x*.02)*3,1,2,'#5a4a2e');px(g,x,322+Math.sin(x*.02)*3,1,2,'#5a4a2e');}
 for(let i=0;i<10;i++){const x=r()*640;px(g,x,240+r()*10,3,6,'#4e6a2e');}return c;}
function drawTorch(c,x,y,t){px(c,x-3,y,6,40,'#4e3420');px(c,x-6,y-4,12,6,'#2a1a10');const f=Math.sin(t*17)*2+Math.sin(t*7.3)*2;ell(c,x,y-14,9+f*.4,16+f,'#e0601a');ell(c,x,y-12,6,10+f*.6,'#f4b030');ell(c,x,y-9,3,5,'#fff0b0');c.save();c.globalAlpha=.12+Math.sin(t*9)*.02;ell(c,x,y,120,90,'#ffb040');c.restore();}
function drawCart(c,x,y,t,spin,dogs){const bx=x-150,by=y-80;
 px(c,bx+10,by-118,280,118,'#140c08');for(let i=0;i<=14;i++)px(c,bx+10+i*20,by-118,4,118,'#3a2a1a');
 dogs.forEach(d=>drawDog(c,d,d.x,d.y,d.k,d.face,t));
 for(let i=0;i<=14;i++){px(c,bx+10+i*20,by-118,5,118,'#5a5048');px(c,bx+11+i*20,by-118,2,118,'#8a8078');}px(c,bx+4,by-124,292,10,'#5b3d26');px(c,bx+4,by-8,292,8,'#5b3d26');
 px(c,bx,by,300,22,'#6b4a2e');px(c,bx,by,300,4,'#8a6038');for(let k=0;k<300;k+=30)px(c,bx+k,by+4,2,18,'#4e3420');px(c,bx-190,by+8,194,6,'#5b3d26');px(c,bx-190,by+14,194,2,'#3e2a18');
 for(const wx of [bx+60,bx+240]){const wy=y-38,R=38;ell(c,wx,wy,R+3,R+3,'#2a1a10');ell(c,wx,wy,R,R,'#5b3d26');ell(c,wx,wy,R-6,R-6,'#3a2a1a');for(let k=0;k<8;k++){c.save();c.translate(wx,wy);c.rotate(spin+k*Math.PI/4);px(c,-2,0,4,R-4,'#6b4a2e');c.restore();}ell(c,wx,wy,7,7,'#2a1a10');}
 px(c,bx+120,by-40,60,30,'#8a6038');ell(c,bx+150,by-23,6,5,'#3a2010');for(let i=0;i<4;i++)ell(c,bx+141+i*6,by-32+(i%3===0?2:0),2,2,'#3a2010');}
// Pluto: leeres Halsband an der Leine, wird HINTER Rabies hergezogen (beim Gehen schleift es hüpfend über den Boden)
function leash(c,x,y,K,dir,t,moving){const u=K*.6,q=K/2.7,hx=x-dir*9*u,hy=y-40*u,lx=x-dir*(moving?95:70)*q,ly=y+2-(moving?Math.abs(Math.sin(t*9))*5:0);
 c.strokeStyle='#3a2414';c.lineWidth=Math.max(1,3*q);c.beginPath();c.moveTo(hx,hy);c.quadraticCurveTo((hx+lx)/2,Math.max(hy,ly)-(moving?2:-8)*q,lx,ly-4*q);c.stroke();
 ell(c,lx,ly-4*q,10*q,5*q,'#7a2a20');ell(c,lx,ly-4*q,6*q,2.5*q,'#2a1a10');px(c,lx-2*q,ly-10*q,4*q,4*q,'#c9a84f');if(moving&&Math.sin(t*9)>.8){c.fillStyle='#8a745088';c.fillRect(Math.round(lx+dir*8),Math.round(ly-2),6,3);}}
function introFilm(first){gateBG??=paintGate();const K=2.7,dk=K*.6,recruit=gen(0);recruit.name=recruit.name.split(' ')[0];recruit.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};recruit.equipment=recruit.enemyGear;
 const dA=dogAct(DOG.create('molosser'),'threat'),dB=dogAct(DOG.create('bullterrier'),'sit');
 const S2={cartX:1500,rabX:1180,rec:{x:320,state:'idle',walk:false,dir:1,fall:0},hand:false,blood:[],gnaw:false,title:0};const Y=630,RY=600;
 const tl=timeline([
  [.3,()=>{caption('Abends hält ein Karren vor dem Ludus.');sfx('cart');}],
  [3.4,()=>caption('Er stinkt nach nassem Hund, altem Blut und schlechten Entscheidungen.')],
  [6.6,()=>caption(`Der Mann davor nennt sich <b>${esc(TX.NAME)}</b>.`)],
  [9.6,()=>caption('Rabies. Das ist Latein für <b>Tollwut</b>.')],
  [12.4,()=>caption('Er sagt, er hatte sie zweimal. Beim zweiten Mal hat sie aufgegeben.')],
  [15.4,()=>caption('An der Leine führt er ein leeres Halsband. Das ist <b>Pluto</b>.')],
  [18.2,()=>{caption('Pluto ist seit drei Wintern tot. Er hört trotzdem besser als die meisten Rekruten.');bubble(S2.rabX,RY-200,'Rabies','Sitz, Pluto. Brav.',2.4);}],
  [20.6,()=>{S2.rec.walk=true;caption(`Ein Rekrut namens ${esc(recruit.name)} will die Hunde streicheln.`);}],
  [24.6,()=>{S2.rec.walk=false;bubble(S2.rec.x+40,Y-220,recruit.name,'Na, wer ist ein Guter?',1.8);}],
  [26.4,()=>{dA.mode='snap';dA.clock=0;dA.duration=.4;F.flash=.9;F.flashCol='#ffffff';F.shake=.5;sfx('snap');DOG.playSound('bark',dA.dog);}],
  [26.65,()=>{S2.hand=true;if(recruit.body.rh)recruit.body.rh.missing=true;S2.rec.state='retreat';S2.rec.walk=true;S2.rec.dir=-1;sfx('scream');dA.mode='gnaw';S2.gnaw=true;for(let i=0;i<40;i++)S2.blood.push({x:S2.rec.x+30,y:Y-60,vx:rnd(-160,40),vy:rnd(-260,-40),life:rnd(.6,1.4)});}],
  [27,()=>bubble(S2.rabX,RY-200,'Rabies','Nicht füttern! Steht doch dran!',2.6)],
  [28.4,()=>{S2.rec.walk=false;S2.rec.fall=1;caption('Es stand nirgends dran.');}],
  [31.2,()=>caption('Rabies hat noch alle Finger, die er braucht. Die übrigen hat er als Anzahlung geleistet.')],
  [34.6,()=>caption('Er fängt Hunde. Streuner, Wachhunde und Bestien, die halbe Dörfer leerfressen.')],
  [37.8,()=>caption('Dafür braucht er nur eins: jemanden, der zuerst reingeht.')],
  [41,()=>{S2.title=.001;caption('');$('hfBubbles').innerHTML='';sfx('drum');DOG.playSound('bark',dA.dog);}],
  [46.5,()=>talkStart()]]);
 function draw(c,t,dt){tl(t);const k=ease(t/6.2);S2.cartX=lerp(1520,905,k);S2.rabX=S2.cartX-320;const moving=t<6.2;
  c.drawImage(gateBG,0,0,1280,720);drawTorch(c,170,260,t);drawTorch(c,470,260,t);
  if(S2.rec.walk&&t>20.6)S2.rec.x+=S2.rec.dir*(S2.rec.state==='retreat'?120:100)*dt;
  dA.x=S2.cartX-90;dA.y=Y-104;dA.k=dk*.95;dA.face=-1;dB.x=S2.cartX+60;dB.y=Y-104;dB.k=dk*.95;dB.face=1;
  if(t>6.2&&t<26.3)dA.mode=(t%4)<1.3?'bars':'threat';if(dA.mode==='snap')dA.clock=Math.min(.42,dA.clock+dt);
  if(!S2.gnaw&&t>8&&(t%5)<.05)DOG.playSound('bark',dA.dog);dB.mode=t<12?'sit':(t%6)<3?'scratch':'sit';
  drawCart(c,S2.cartX,Y,t,-(S2.cartX/38),[dA,dB]);
  drawRabies(c,S2.rabX,RY+28,K,moving?-1:1,t,{moveSpeed:moving?45:0,phase:t*7});
  leash(c,S2.rabX,RY+28,K,moving?-1:1,t,moving);
  if(t>=20.6)fig(c,recruit,S2.rec.x,Y+20,K,S2.rec.dir,S2.rec.fall?{state:'fallen',down:true,fallTimer:0,fallDuration:1,energy:20,facePain:1}:{state:S2.rec.state,moveSpeed:S2.rec.walk?70:0,phase:t*8,facePain:S2.hand?1:0});
  for(const p of S2.blood){if(p.life<=0)continue;p.life-=dt;p.vy+=600*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.y>Y+20){p.y=Y+20;p.vx*=.2;p.vy=0;}px(c,p.x,p.y,4,4,'#8d1c13');}
  if(S2.hand&&!S2.rec.fall&&Math.random()<.5)S2.blood.push({x:S2.rec.x+30,y:Y-70,vx:rnd(-30,30),vy:rnd(-60,0),life:.8});
  if(S2.title){S2.title+=dt;const a=cl(S2.title*1.5,0,1);c.fillStyle=`rgba(5,3,2,${.86*a})`;c.fillRect(0,0,1280,720);bigText(c,TX.NAME.toUpperCase(),640,300,Math.round(lerp(130,84,ease(S2.title*1.6))),'#f3e2b0',a);bigText(c,'· '+TX.TITEL.toUpperCase()+' ·',640,400,46,'#f29b83',cl(S2.title-.5,0,1));
   if(S2.title>.7){c.globalAlpha=cl(S2.title-.7,0,1);for(let i=0;i<5;i++){const sx=480+i*64,sy=470;SKULL.forEach((row,yy)=>[...row].forEach((ch,xx)=>{if(ch==='X')px(c,sx+xx*5,sy+yy*5,5,5,'#efe0b3');}));}c.globalAlpha=1;}}}
 function done(){closeFilm();if(first){st().stage='open';try{M.persist();}catch{}}try{M.ui.click('nav:beastrium');}catch(e){console.warn(e);}}
 F.skip=()=>{if(!$('hfTalk').classList.contains('hf-hide'))done();else talkStart();};
 function talkStart(){if(!$('hfTalk').classList.contains('hf-hide'))return;F.draw=(c,t)=>{c.drawImage(gateBG,0,0,1280,720);drawTorch(c,170,260,t);drawTorch(c,470,260,t);drawCart(c,905,630,t,-905/38,[dA,dB]);drawRabies(c,585,628,2.7,1,t);leash(c,585,628,2.7,1,t,false);c.fillStyle='#05030288';c.fillRect(0,0,1280,720);};
  caption('');const lines=['Lanista! Die Stadt hat ein Hundeproblem. Ich hab eine Lösung. Die Lösung hat Zähne.',TX.BRETT[1],'Und wenn nicht … ich kenne einen Metzger, der keine Fragen stellt.','Mein Karren steht ab jetzt vor deinem Beastrium. Unten im Keller ist Platz für Zwinger. Ich hab nachgesehen. Und ein bisschen umgebaut.'];let i=0;
  const say=()=>{$('hfTalkText').innerHTML=`<small>${esc(TX.NAME.toUpperCase())} · ${esc(TX.TITEL.toUpperCase())}</small>${esc(lines[i])}`;M.speakLine?.(lines[i],'rabies',rabies());const mood=i===1?'confident':'grin';const loop=()=>{if($('hfTalk').classList.contains('hf-hide'))return;rabiesFace($('hfTalkFace'),mood);if(M.speaking?.())requestAnimationFrame(loop);else rabiesFace($('hfTalkFace'),mood);};loop();};
  show('hfTalk',true);say();$('hfTalk').onclick=()=>{i++;if(i>=lines.length){done();return;}say();};}
 openFilm(draw);}

// =====================================================================================================
// SICHTUNG · anschleichen, Fernglas, (Bestien: böser Blick), Hundebuch, Urteil, Entscheidung
// =====================================================================================================
const qOf=g=>((M.power?.(g)||40)-33)/14;// Stufe eines Menschen aus dem Kampfwert (Gegner der Stufe q haben etwa 33 + 14·q)
function verdictOf(g,j){const d=qOf(g)-DOG.targetQ(breedOf(j.breed).soll),i=TX.EINSCH.findIndex(([ab])=>d>=ab);return {i,txt:TX.EINSCH[i][1],d};}
function binoMask(c,cx,cy,r){const m=binoMask.c||(binoMask.c=mkc(1280,720)),g=m.getContext('2d');g.globalCompositeOperation='source-over';g.clearRect(0,0,1280,720);g.fillStyle='#040302';g.fillRect(0,0,1280,720);g.globalCompositeOperation='destination-out';
 for(const dx of [-r*.62,r*.62]){const gr=g.createRadialGradient(cx+dx,cy,r*.75,cx+dx,cy,r);gr.addColorStop(0,'#000');gr.addColorStop(1,'#0000');g.fillStyle=gr;g.beginPath();g.arc(cx+dx,cy,r,0,Math.PI*2);g.fill();}
 g.globalCompositeOperation='source-over';c.drawImage(m,0,0);c.save();c.globalAlpha=.08;ell(c,cx-r*.9,cy-r*.45,r*.25,r*.1,'#bfe0ff');c.restore();
 c.strokeStyle='#ffffff22';c.lineWidth=2;c.beginPath();c.moveTo(cx-r*.62-10,cy);c.lineTo(cx-r*.62+10,cy);c.moveTo(cx-r*.62,cy-10);c.lineTo(cx-r*.62,cy+10);c.stroke();}
function sighting(j,g){const bg=jobBg(j),R=TX.RASSEN[j.breed],big=j.skulls>=4||!!breedOf(j.breed)?.wolf,d=dogFor(j);let found=-1,phase='sneak',intro=null,shotC=null;const K=2.6;
 const tl=timeline([[.2,()=>caption((goTeam&&byId(goTeam.bait)?`<b>${esc(byId(goTeam.bait).name)}</b> wird vorgeschickt${goTeam.men.length?', '+goTeam.men.map(id=>'<b>'+esc(first(byId(id)))+'</b>').join(' und ')+(goTeam.men.length>1?' schleichen':' schleicht')+' hinterher':', ganz allein'}.`:`<b>${esc(g.name)}</b> schleicht sich an.`)+` Rabies bleibt beim Karren. „Ich hab Rücken“, sagt er.`)],[3.2,()=>{phase='glass';caption('Wo ist das Vieh …');}]]);
 function wide(c,t){const Z=1280/1040,cy=365;c.save();c.translate(640,360);c.scale(Z,Z);c.translate(-520,-cy);c.drawImage(bg,0,0);liveMischief(c,j,t);animDog(d,j,t);drawDog(c,d,d.x,d.y,1,d.face,t);c.restore();
  const sx=190,sy=742;fig(c,g,sx,sy,K,1,{state:'idle'});const u=K*.6,hy=sy-(g.height/180)*86*u+16*u,lift=ease((t-1.6)/.8);
  if(t>1.6){px(c,sx+6*u,hy-u*lift,16*u,3.2*u,'#b88a3a');px(c,sx+6*u,hy+3*u-u*lift,16*u,3.2*u,'#a8782a');px(c,sx+20*u,hy-1.5*u,3*u,9*u,'#6a4a1a');}
  for(let i=0;i<9;i++){ell(c,40+i*70,720-Math.sin(i*1.7)*10,60,44,i%2?'#2c3a1c':'#34461f');ell(c,30+i*70,700-Math.sin(i)*12,30,24,'#3f5226');}}
 function glass(c,t){const tt=t-3.2,find=1.9,ex=SPOT.x-260,ey=SPOT.y-90;let k=ease(tt/find),cx=lerp(ex,d.x-10,k)+Math.sin(t*1.3)*6,cy=lerp(ey,d.y-26+(R.unfug==='baum'?-55:0),k)+Math.sin(t*1.9)*4;
  let Z=2.5;if(found>=0){const q=t-found;Z=big?lerp(2.5,3.6,ease(q/.25)):lerp(2.5,2.9,ease(q/.6));if(big&&q<.6){cx+=(Math.random()-.5)*14;cy+=(Math.random()-.5)*14;}}
  if(found<0&&tt>=find){found=t;caption((big?'<b>'+(breedOf(j.breed)?.wolf?'BEI ALLEN GÖTTERN.':'GROSSE GÖTTER.')+'</b> ':'')+esc(R.sicht));
   if(big){F.flash=1.2;F.flashCol='#7a0a04';F.shake=.9;sfx('thunder');sfx('drum');d.mode='threat';d.growlT=1;DOG.playSound('bark',d.dog);setTimeout(()=>DOG.playSound('growl',d.dog),600);}else DOG.playSound(['leiche','kehle','schaf','bein','wurst'].includes(R.unfug)?'growl':'bark',d.dog);}
  if(big&&found>=0&&t-found>1.4){d.mode='threat';d.growlT=1;}
  c.save();c.translate(640,360);c.scale(Z,Z);c.translate(-cx,-cy);c.drawImage(bg,0,0);liveMischief(c,j,t);if(!(big&&found>=0&&t-found>1.4))animDog(d,j,t);drawDog(c,d,d.x,d.y,1,d.face,t);c.restore();
  if(j.mood.weather==='nebel'){c.fillStyle='#c8d0d81a';c.fillRect(0,0,1280,720);}
  binoMask(c,640,360,300);
  if(big&&found>=0){const q=t-found;if(q>.3&&q<3.2)bigText(c,breedOf(j.breed)?.wolf?'KEIN HUND.':j.skulls>=5?'ER HAT UNS GESEHEN.':'BESTIE!',640,600,Math.round(lerp(90,62,ease((q-.3)*2))),'#ff6a4a',cl((3.2-q)*1.5,0,1));}
  if(found>=0&&t-found>(big?4.2:4.6)&&phase==='glass'){phase=j.skulls>=3?'blick':'book';if(phase==='blick')startBlick();else startBook();}}
 F.tap=()=>{if(phase==='blick')intro=null;};
 function startBlick(){intro=SH.makeIntro(dogAct(jobDog(j),'threat'));intro.preview=true;shotC??=mkc(850,520);caption(big?'<b>Er hat Witterung aufgenommen.</b>':'Er hat etwas gehört.');sfx('drum',.7);if(big)DOG.playSound('growl',jobDog(j));}
 function blick(c,t,dt){if(!intro||!SH.stepEntry(intro,dt)){intro=null;startBook();return;}SH.paint(shotC,intro);const s=Math.min(1280/850,720/520),w=850*s,h=520*s;c.drawImage(shotC,(1280-w)/2,(720-h)/2,w,h);}
 function startBook(){phase='book';caption('');openBook(j,g);}
 function draw(c,t,dt){tl(t);if(phase==='sneak')wide(c,t);else if(phase==='glass')glass(c,t);else if(phase==='blick')blick(c,t,dt);else{c.save();c.translate(640,360);c.scale(1.6,1.6);c.translate(-d.x,-d.y+40);c.drawImage(bg,0,0);liveMischief(c,j,t);animDog(d,j,t);drawDog(c,d,d.x,d.y,1,d.face,t);c.restore();c.fillStyle='#000a';c.fillRect(0,0,1280,720);}}
 F.skip=()=>{if(phase!=='book'){intro=null;if(found<0)found=F.t;startBook();}else bookAll?.();};
 openFilm(draw);}
// ---------- Hundebuch ----------
let bookTimers=[],bookAll=null;
const FINGER=`<svg class="hf-finger" id="hfFinger" viewBox="0 0 22 12" shape-rendering="crispEdges"><path fill="#2a1a10" d="M0 4h11v-1h3v1h5v1h2v4h-1v1h-9v-1h-2v-1h-8z"/><path fill="#e6b88a" d="M1 5h10v-1h2v1h5v1h2v2h-1v1h-7v-1h-2v-1h-9z"/><path fill="#c48a5e" d="M12 8h7v1h-7zM1 6h9v1h-9z"/><path fill="#8d1c13" d="M15 3h3v1h-3z"/></svg>`;
function statBars(B){return DOG.STATS.map(([k,n])=>`<span>${n}</span><i style="width:${cl(B.werte[k],5,100)}%"></i>`).join('');}
function bookPortrait(D,big){const cv=mkc(360,170),c=cv.getContext('2d');c.imageSmoothingEnabled=false;const d=dogAct(D,big?'threat':'stand');d.growlT=big?1:0;drawDog(c,d,180,150,cl(2.7/d.P.sz,1.6,3.6),-1,1.2);return cv;}
function openBook(j,g){const B=breedOf(j.breed),R=TX.RASSEN[j.breed],big=j.skulls>=4||!!breedOf(j.breed)?.wolf,D=jobDog(j);bookTimers.forEach(clearTimeout);bookTimers=[];
 const near=DOG.BREEDS.filter(b=>TX.RASSEN[b.id]).sort((a,b)=>b.soll-a.soll),i0=near.findIndex(b=>b.id===B.id),from=cl(i0-5,0,Math.max(0,near.length-13)),list=near.slice(from,from+13);
 $('hfPageL').innerHTML=`<h4>LIBER CANUM</h4><div style="text-align:center;font-size:.85em;margin-bottom:4px">Das Hundebuch des Hundsgrafen · Band I · Seiten mit Sabber</div><ul class="hf-idx" id="hfIdx">${list.map(b=>`<li data-b="${b.id}"><span>${esc(b.name)}</span><span class="sk">${'☠'.repeat(skullsOf(b.soll))}</span></li>`).join('')}</ul>${FINGER}`;
 $('hfPageR').innerHTML=`<div class="hf-entry" id="hfEntry"><p class="nm">${esc(B.name)}</p><div style="text-align:center">${'☠'.repeat(j.skulls)} <small>Gefahr ${j.skulls} von 5</small></div><div id="hfPort"></div><div>${esc(R.buch)}</div><b>Besonderheiten:</b><ul>${R.merk.map(m=>`<li>${esc(m)}</li>`).join('')}</ul><div class="bars">${statBars(B)}</div><div class="note">„${esc(R.notiz)}“ · S. R.</div></div><div class="hf-seal" id="hfSeal">${j.breed==='wolf'?'NICHT HINGEHEN':j.skulls>=5?'LEBENSGEFAHR':'VORSICHT'}</div>`;
 $('hfPort').appendChild(bookPortrait(D,big));
 const book=$('hfBook');show('hfBook',true);film.classList.add('bookmode');book.classList.remove('open','danger');$('hfPages').classList.remove('hf-shake');void book.offsetWidth;
 const T=(ms,fn)=>bookTimers.push(setTimeout(fn,ms)),idx=$('hfIdx'),fg=$('hfFinger'),hit=()=>idx.querySelector(`[data-b="${B.id}"]`);
 const place=li=>{const L=$('hfPageL'),r=li.getBoundingClientRect(),p=L.getBoundingClientRect();fg.style.top=(r.top-p.top+r.height/2-fg.getBoundingClientRect().height/2)+'px';};
 const verdict=()=>{const v=verdictOf(g,j),U=TX.URTEIL.find(u=>v.d>=u.ab);show('hfSay',true);face($('hfSayFace'),g,U.stimmung);$('hfSayText').innerHTML=`<small>${esc(g.name.toUpperCase())} · EINSCHÄTZUNG: ${esc(v.txt.toUpperCase())}</small>„${esc(pick(U.txt))}“`;};
 const danger=()=>{book.classList.add('danger');$('hfPages').classList.add('hf-shake');for(let i=0;i<5;i++){const b=document.createElement('div');b.className='hf-blot';const s=6+Math.random()*16;Object.assign(b.style,{width:s+'px',height:s+'px',left:(5+Math.random()*90)+'%',top:(5+Math.random()*90)+'%'});$('hfPageR').appendChild(b);}};
 T(60,()=>{book.classList.add('open');sfx('page');caption(`${esc(g.name)} blättert im Buch, das Rabies ihm mitgegeben hat.`);});
 T(700,()=>{place(idx.children[0]);sfx('page');});
 T(1100,()=>{if(hit())place(hit());});
 T(2600,()=>{hit()?.classList.add('hit');$('hfEntry').classList.add('show');if(matchMedia('(max-aspect-ratio:1/1),(max-width:700px)').matches)setTimeout(()=>$('hfPageR').scrollIntoView({behavior:'smooth',block:'start'}),500);sfx('page');caption(`Der Finger bleibt stehen: <b>${esc(B.name)}</b>.`);
  if(big){danger();sfx('drum');DOG.playSound('growl',D);}});
 T(3300,()=>{if(big)$('hfSeal').classList.add('show');});
 T(4200,()=>{verdict();caption('');});
 T(5000,()=>show('hfDecide',true));
 bookAll=()=>{bookTimers.forEach(clearTimeout);book.classList.add('open');setTimeout(()=>{if(hit())place(hit());if(matchMedia('(max-aspect-ratio:1/1),(max-width:700px)').matches)$('hfPageR').scrollIntoView({block:'start'});},50);$('hfEntry').classList.add('show');hit()?.classList.add('hit');if(big){book.classList.add('danger');$('hfSeal').classList.add('show');}verdict();show('hfDecide',true);};
 $('hfAttack').onclick=()=>{closeFilm();startFight(j,g);};
 $('hfRetreat').onclick=()=>{closeFilm();st().tip=Math.random();try{M.ui.render();}catch{}M.ui.notify?.('Rabies: „'+pick(TX.ABBRUCH)+'“');};}

// =====================================================================================================
// KAMPF · Mann gegen Hund im Kampfbild des Spiels (eigener Kampf, wie Missionen der Außenwelt), Schauplatz statt Arena
// =====================================================================================================
const BLUNT=['club','mace','hammer'];
// ---------- Trupp (Wunsch Thomas 6.11.): Lockvogel + bis zu zwei Kämpfer ----------
const byId=id=>id?(S.roster||[]).find(g=>g.id===id&&!g.dead)||null:null;
let team={bait:null,men:[]},goTeam=null;
const first=g=>String(g?.name||'').split(' ')[0];
const fill=(t,g)=>String(t).replace(/\{n\}/g,first(g));
const wname=i=>i?(M.weaponDefs?.find(w=>w.id===i.def)?.name||i.def):null;
const gearLabel=g=>[wname(M.gear(g,'secondary')),wname(M.gear(g,'weapon')),M.gear(g,'shield')?'Schild':null].filter(Boolean).join(' + ')||'nur Fäuste';
const TX_LOCK={
 pick:['{n} riecht schon nach Wurst. Perfekt.','Wer humpelt, lockt. Das ist ein Naturgesetz.','Rennen muss er nicht. Nur schreien. Das kann er.','Wenn der Hund ihn frisst, hat er wenigstens einmal etwas Nützliches getan.','Ich reibe ihn mit Schinken ein. Kostet extra.','{n}? Gute Wahl. Den vermisst keiner. Nicht mal er selbst.','Ein Lockvogel braucht kein Talent. Nur Fleisch an den Knochen. Ein bisschen reicht.','Sag ihm, es ist eine Ehre. Er glaubt alles.','Unbewaffnet ist er am ehrlichsten. Er hat nichts zu verbergen. Außer Angst.','Der blutet schon. Spart mir die Wurst.','Läuft er zu schnell weg, ist er kein Lockvogel mehr, sondern ein Deserteur. Dann jag ich ihn selbst.','Ich hab Hunde gesehen, die vor so einem weglaufen. Aus Mitleid.','Rüstung? Wozu. Der Hund soll ja nicht an der Verpackung scheitern.','Ich häng ihm noch eine Ziegenleber um. Die ist erst drei Wochen alt.','Talent? Der Hund prüft nur, ob er schmeckt.'],
 go:['Lauf, {n}! Du duftest nach Mittagessen!','Vorwärts, {n}! Mach Geräusche wie ein verletztes Lamm! Ach, du bist eins.','Hier, Hundchen! Frischfleisch auf zwei Beinen! Na ja, fast zwei.','{n}, wink mal! Mit beiden Armen, solange du noch beide hast!','Nicht weglaufen, {n}. Erst, wenn er zubeißt. Dann auch nicht.','Geh vor, {n}. Die anderen kommen nach. Irgendwann. Vielleicht.','Stell dich nicht so an, {n}. Hunde beißen nur, wenn man lebt.','Ruf ihn, {n}! Egal wie, er hört eh nicht zu.','Lächeln, {n}! Hunde riechen Angst. Und Wurst. Du hast beides.','Die Ratten folgen dir schon, {n}. Die wissen, was kommt.','Schön schaukeln lassen, {n}! Das Fleisch muss duften!','Die Fliegen haben dich schon gefunden, {n}. Der Hund ist langsamer, aber gründlicher.','Ausziehen hat sich gelohnt, {n}. Jetzt sieht er gleich, wo er hinbeißen muss.','Trag die Hände mit Stolz, {n}. Eine davon war mal dein Vorgänger.','Lass die Köpfe ordentlich baumeln, {n}! Die haben auch mal so geguckt wie du.','Die Füße um deinen Hals sind nur geliehen, {n}. Deine kommen bald dazu.','Wackel mit den Fingern, {n}! Mit den fremden, deine brauchst du noch kurz.'],
 dead:['{n} hat seinen Zweck erfüllt. Ganz und gar.','Ein guter Lockvogel. Hat bis zum Schluss gelockt.','{n} ist jetzt Teil der Hundediät. Rabies nickt anerkennend.','Rabies schreibt {n} auf die Liste: „Köder, verbraucht“.','Wenigstens war {n} heute mal der Beliebteste.'],
 alive:['{n} lebt noch. Rabies wirkt fast enttäuscht.','{n} zittert, aber er ist ganz. Nächstes Mal mehr Wurst.','{n} hat überlebt. Das spricht gegen ihn als Lockvogel.','Rabies tätschelt {n} den Kopf. Wie einem Hund. Einem schlechten.']};
// Lockvogel-Liste: Schwerverletzte oben (schwerste zuerst), danach die schwächsten Talente
// ---------- Köderwert (Wunsch Thomas 6.11.): wer taugt als Lockvogel? ----------
// Dauerhaftes zählt voll, Heilbares nur so weit, wie es noch dauert (Wunden heilen ja):
//  · Talent: je niedriger, desto besser (bis 40 Punkte; ab Talent 80 nichts)
//  · Amputationen: je fehlendem Bein 18, je fehlendem Arm 12 (bis 40) – wer kein Bein hat, läuft nicht weg
//  · Dauerschaden: 0,6 je Prozent (bis 15)
//  · Heilbare Verletzungen: (100 − Gesundheit) × 0,35, gewichtet mit der Heildauer (volle Wirkung ab 21 Tagen, bis 20)
//  · Einordnung des Medicus: Müll +12, Talent −12, Supertalent −30
// Ergebnis 0–100, angezeigt als Fleischkeulen. Nur Anzeige und Sortierung, keine Spielwirkung.
const TCOL=['#6f7774','#7d8580','#8f9a8f','#a3b58c','#88baa6','#7fb1d6','#dfb66d','#f0c46a','#c79cf0','#ff7a6a'];
const TFALL=[[91,'Prodigy'],[88,'Elite-Talent'],[85,'Ausnahmetalent'],[81,'Hochbegabt'],[75,'Talentiert'],[69,'Begabt'],[63,'Brauchbar'],[57,'Mittelmaß'],[50,'Unbegabt'],[0,'Nichtsnutz']];
function tierOf(g){const p=Math.round(g.potential??0);let t=null;try{t=M.barracks?.tierOf?.(p);}catch{}if(!t){const i=TFALL.findIndex(([m])=>p>=m);t={level:10-i,name:TFALL[i][1]};}return {p,level:cl(t.level||1,1,10),name:t.name};}
const CHAINS=[['l','Arm',['ls','lua','lfa','lh']],['r','Arm',['rs','rua','rfa','rh']],['l','Bein',['lt','lsh','lf']],['r','Bein',['rt','rsh','rf']]];
// je Gliedmaße nur das oberste fehlende Stück (fehlt der Oberarm, fehlt der Rest ohnehin)
function amputations(g){const out=[];for(const [,kind,ids] of CHAINS){const id=ids.find(x=>g.body?.[x]?.missing);if(id)out.push({id,kind,name:M.partName?M.partName(id):id});}return out;}
function healDays(g){try{return M.medic?.forecast?M.medic.forecast(g,0).days:0;}catch{return 0;}}
function baitScore(g){const t=tierOf(g),amp=amputations(g),legs=amp.filter(a=>a.kind==='Bein').length,arms=amp.length-legs,hp=M.health(g),days=healDays(g);
 const chronic=Object.values(g.body||{}).reduce((n,p)=>n+(p.missing?0:(p.chronic||0)),0),tag=M.sortTag?.get?.(g)||null;
 const parts={talent:cl((80-t.p)/40,0,1)*40,amp:Math.min(40,legs*18+arms*12),chronic:Math.min(15,chronic*.6),wound:Math.min(20,(100-hp)*.35)*Math.min(1,days/21),tag:tag==='muell'?12:tag==='talent'?-12:tag==='super'?-30:0};
 const score=Math.round(cl(Object.values(parts).reduce((a,b)=>a+b,0),0,100));
 return {g,t,amp,legs,arms,hp,days,chronic,tag,parts,score,grade:score>=75?'Prachtköder':score>=55?'Guter Köder':score>=35?'Brauchbarer Köder':score>=18?'Eigentlich zu schade':'Bloß nicht'};}
const baitCands=()=>(S.roster||[]).filter(g=>!g.dead&&!g.smithDuty&&!g.retired&&!(g.age<18)).map(baitScore).sort((a,b)=>b.score-a.score||a.t.p-b.t.p).map(x=>x.g);
// Sprüche je Fall; die Karte nimmt den Fall, der am meisten zählt, und wählt fest je Kämpfer und Tag (kein Flackern beim Neuzeichnen)
const BQ={
 legs:['Kein Bein, keine Flucht. Der ideale Köder.','Der kriecht dem Hund entgegen. Spart Zeit.','{n} hat Rückwärtsgang? Hat er nicht. Hat er auch nie gebraucht.','Weglaufen ist überbewertet. {n} hat es sich abgewöhnt. Zwangsweise.','Auf einem Bein hüpft er wie ein verletztes Reh. Hunde lieben das.','Der Hund muss nicht mal rennen. Wellness für den Köter.'],
 arms:['Ein Arm weniger, eine Mahlzeit mehr. Die Natur gleicht aus.','Wehren kann er sich eh nicht. Winken auch nur halb.','{n} kann nicht mal mehr richtig betteln. Nur noch halb.','Den Arm hat schon jemand probiert. Der Hund will den Rest.','Einarmig ist er schneller verpackt. Weniger Schnur.','Vorspeise war gestern. {n} ist der Hauptgang.'],
 multi:['Von {n} ist nicht mehr viel übrig. Genau richtig für eine Kostprobe.','Der ist schon angebissen. Der Hund erkennt Qualität.','{n} ist eher ein Sonderangebot als ein Mann.','Restposten. Muss weg.','So viel fehlt schon – wer zählt da noch mit?'],
 talLow:['Talent wie ein Sack Rüben. Riecht auch so.','{n} wurde geboren, um gefressen zu werden. Endlich darf er.','Sein größtes Talent ist, zu verschwinden. Heute klappt’s vielleicht.','Selbst die Fliegen haben mehr Ehrgeiz.','Hat beim Händler „ausverkauft“ geschrien. Keiner wollte ihn trotzdem.','Kein Verlust, nur ein Abgang.','Ich hab schon Wurst mit mehr Zukunft gesehen.'],
 talMid:['Mittelmaß. Schmeckt nach nichts, aber satt macht er.','Brauchbar. Als Köder. Sonst eher nicht.','{n} ist kein Held. Aber er riecht nach einem Imbiss.','Für die Arena zu blass, für den Hund gerade recht.','Durchschnitt ist auch nur Fleisch.'],
 talHigh:['Ein Talent als Köder? Das ist, als würde man mit Kaviar angeln.','Den willst du verfüttern? Dein Gold, deine Beerdigung.','Schade um ihn. Aber Hunde haben auch Geschmack.','Der kostet mehr als der Hund. Rabies reibt sich die Hände.','Wenn der draufgeht, schreib ich’s dir auf. Zweimal.'],
 super:['Dein Supertalent als Wurst? Der Medicus weint schon.','Den hat der Doktor zur Krone erklärt. Jetzt kriegt er eine aus Fleisch.','Mutig. Oder dumm. Ich kann’s nicht unterscheiden. Du auch nicht.'],
 muell:['Der Medicus hat ihn als Müll einsortiert. Ich bin Recycler.','Aus dem Müll in den Hund. Das nenne ich Kreislauf.','Müll ist nur Hundefutter, das noch nicht weiß, was es ist.','Der Doktor sagt Müll, ich sage Köder. Wir sind uns einig.'],
 healLong:['Der heilt eh erst in Wochen. Bis dahin kann er sich nützlich machen.','Die Wunden halten noch lange. Und sie bluten so schön.','Der liegt sowieso nur rum. Dann kann er auch draußen rumliegen.','Er stinkt schon nach Eiter. Hunde mögen das.'],
 healSoon:['In ein paar Tagen ist der wieder gesund. Schade eigentlich – frisches Blut lockt besser.','Die Kratzer heilen bald. Also schnell, solange er noch tropft.','Fast wieder heil. Aber eben nur fast.'],
 chronic:['Das Knie knackt lauter als ein Knochen. Der Hund hört das.','Halb kaputt ist auch kaputt. Gut genug zum Locken.','Der humpelt für immer. Das ist ein Langzeitangebot.'],
 fresh:['Gesund, kräftig, unversehrt. Noch.','So ein heiler Mann. Der Hund wird sich freuen.','Ohne einen Kratzer? Das ändert sich gleich.']};
const hstr=s=>{let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return h>>>0;};
function baitCase(v){if(v.amp.length>1)return 'multi';if(v.legs)return 'legs';if(v.arms)return 'arms';if(v.tag==='super')return 'super';if(v.tag==='muell')return 'muell';
 if(v.t.level>=6)return 'talHigh';if(v.parts.wound>=6)return v.days>=12?'healLong':'healSoon';if(v.chronic>=8)return 'chronic';if(v.t.level<=2)return 'talLow';if(v.t.level<=4)return 'talMid';return v.hp>=99?'fresh':'talMid';}
function baitQuip(v,salt=0){const L=BQ[baitCase(v)];return fill(L[(hstr(v.g.id)+S.day*7+salt)%L.length],v.g);}
const keulen=n=>'🍖'.repeat(n)+'<i style="opacity:.25">'+'🍖'.repeat(5-n)+'</i>';
const TACTIC={aggression:'Ausgeglichen',formation:'Normal',priority:'Nächster Gegner',ranged:'Abstand halten',help:'Normal'};
// Lockvogel: ohne Waffe, Schild und Rüstung (nur für diesen Kampf, über enemyGear wie Gegner), dafür mit verfaultem Fleisch behängt
function bait(g){g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};g.hfBait=true;}
function unbait(g){if(g?.hfBait||g?.hfLoan){delete g.enemyGear;delete g.hfBait;delete g.hfLoan;}}
for(const g of S.roster||[])unbait(g);// Kampf abgebrochen (Neuladen mitten im Kampf): Lockvogel bekommt seine Ausrüstung zurück, alte Leihknüppel sind weg
const hasNet=g=>['weapon','secondary'].some(sl=>M.gear(g,sl)?.def==='net');
function startFight(j){const s=st();if(S.battle)return;const T=goTeam||team,bg=byId(T.bait),men=T.men.map(byId).filter(Boolean);if(!bg)return;
 bait(bg);const hb=M.createCombatActor(bg,0,0,72);hb.x=SPOT.x-140;hb.y=SPOT.y+16;hb.a=0;hb.hfBait=true;
 const hs=[hb,...men.map((g,i)=>{const h=M.createCombatActor(g,0,0,72);h.x=230-i*30;h.y=men.length>1?(i?470:375):420;h.a=0;return h;})];
 const D=JSON.parse(JSON.stringify(jobDog(j))),d=DOG.makeActor(D,1,SPOT.x+120,SPOT.y+20);d.a=Math.PI;
 const blunt=!men.length||men.some(g=>{const w=M.gear(g,'secondary')?.def||M.gear(g,'weapon')?.def;return !w||BLUNT.includes(w);});
 const b={id:'hundefang-'+j.id,hundefang:true,dogTest:true,hasDogs:true,actors:[...hs,d],opponent:D.breedName,time:0,startTime:0,type:'hundefang',league:0,log:[],paused:false,result:null,obstacles:[],width:1040,height:720,
  teamTactics:[{...TACTIC},{...TACTIC}],leaders:[null,null],moraleBonus:[0,0],moralePressure:[0,0],groundWeapons:[],dropped:[],fee:0};
 Object.defineProperty(b,'toJSON',{value:()=>null,enumerable:false});
 s.usedDay=S.day;j.done='UNTERWEGS';S.options.speed=1;/* Hundefang beginnt immer in Geschwindigkeit 1 (Thomas 08.11.) */
 M.stains=[];M.limbs=[];M.swings=[];M.floaters=[];M.shake=0;for(const p of [...(M.fx||[]),...(M.shots||[])])p.active=false;
 const lead=men[0]||bg;fight={b,j,g:lead,bait:bg,men,hs,h:hs[0],d,blunt,net:men.some(hasNet),netT:-1,outcome:null};
 const line=fill(pick(TX_LOCK.go),bg);b.log.unshift({time:0,text:'Lockvogel: '+bg.name+' wird vorgeschickt. Rabies: „'+line+'“'});
 setTimeout(()=>{if(fight?.b!==b)return;try{M.floater?.(hb.x,hb.y-70,'LOCKVOGEL','#f4d37a');}catch{}M.speakLine?.(line,'rabies',rabies(),{name:'Rabies'});},700);
 M.missionBackdrop=ctx=>ctx.drawImage(jobBg(j),0,0);S.battle=b;try{M.persist();}catch{}M.ui.render();}
const isDog=a=>!!a.dog,dogOut=a=>DOG.out(a)||a.ko,live=(b,t)=>b.actors.filter(a=>a.team===t&&!(isDog(a)?dogOut(a):DOG.out(a)));
// Nahaufnahme eines Hundes hält den Kampf an (wie im Hunde-Prototyp); wird sie nicht gezeichnet, entfällt sie
DOG.paused=()=>{if(!(SH.cur||SH.q.length))return false;if(performance.now()-(SH.lastPaint||0)<400)return true;SH.cur=null;SH.q=[];return false;};
const inner=M.fixedStep;
M.fixedStep=function(dt){const b=S.battle;if(!b?.hundefang)return inner.apply(this,arguments);if(b.paused||b.dogOver)return;if(DOG.paused())return;
 M.groundPools?.(dt);b.time+=dt;
 for(const a of b.actors){if(isDog(a)){if(a.ko){a.mode='down';a.down=true;a.clock=1;a.moveSpeed=0;continue;}DOG.step(a,dt);koCheck(b,a);a._px=a.x;a._py=a.y;continue;}
  const x=a.x,y=a.y,p=a.phase||0;
  if(a.draggedBy&&!a.g.dead&&b.actors.some(l=>l.id===a.draggedBy&&!l.g.dead)){a.state='fallen';a.moveSpeed=0;a.fallTimer=Math.max(a.fallTimer||0,1.2);}
  else{const held=DOG.humanPre(a);if(!held)M.resolveStrike(a,dt*1.12);M.updateActor(a,dt*1.12);if(held){a.wind=0;a.pendingStrike=null;}}
  M.updateLocomotion(a,x,y,p,dt*1.12);}
 for(const d of b.actors)if(isDog(d)&&d.mode==='grip'&&d.victim){const v=b.actors.find(a=>a.id===d.victim);if(v)DOG.holdOn(d,v,dt);}
 M.collisionPairs({actors:b.actors.filter(a=>!isDog(a)&&!a.grabbedBy)});M.stepProjectiles(dt);
 for(const a of b.actors)if(isDog(a)&&a._px!=null&&a.mode!=='leap'){const jx=a.x-a._px,jy=a.y-a._py,jl=Math.hypot(jx,jy);if(jl>4){a.x=a._px+jx/jl*4;a.y=a._py+jy/jl*4;}}
 for(const a of b.actors)if(a.g.dead&&!a.death)a.death=true;
 const L=[live(b,0).length,live(b,1).length];
 if(L[0]&&L[1]&&b.time-b.startTime<180){b.endAt=null;return;}
 b.endAt??=b.time;if(b.time-b.endAt<2.4)return;
 b.dogOver={winner:L[0]&&!L[1]?0:L[1]&&!L[0]?1:-1,timeout:!!(L[0]&&L[1])};finish(b);};
function koCheck(b,d){if(!d.g.dead||d._fate)return;d._fate=true;const cause=d.g.cause||'',p=/Verblutet|verendet/.test(cause)?.2:fight?.blunt?.75:.4;
 if(Math.random()<p){d.g.dead=false;d.death=false;d.down=true;d.ko=true;d.mode='down';d.clock=1;d.duration=99;d.blood=Math.max(d.blood,18);d.g.cause='';b.log.unshift({time:Math.floor(b.time),text:d.g.name+' bleibt liegen. Er atmet noch: bewusstlos!'});}}
function finish(b,retreat){const f=fight;if(!f||f.outcome)return;const d=f.d,hs=f.hs,out=h=>h.g.dead||DOG.out(h)||h.down,manDead=hs.every(h=>h.g.dead),manOut=hs.every(out);let kind,title,cls,txt;
 const names=hs.filter(h=>!h.g.dead).map(h=>h.g.name.split(' ')[0]),net=f.net||d.netAt!=null||(d.netTimer||0)>0;
 if(retreat){kind='rueckzug';title='Rückzug';cls='meh';txt=(names.length>1?names.slice(0,-1).join(', ')+' und '+names.at(-1)+' ziehen':(names[0]||'Niemand')+' zieht')+' sich zurück. Rabies spuckt aus und sagt etwas über Großmütter.';}
 else if(d.ko||(d.submit&&!d.g.dead&&!d.fled)){const free=!d.ko&&!net&&Math.random()<.5;
  if(free){kind='flucht';d.submit=false;d.fled=true;title='Losgerissen!';cls='bad';txt='Ohne Netz bekommt man ihn nicht zu fassen. Er windet sich frei und ist weg. '+pick(TX.FLUCHT);}
  else{kind='fang';title='Gefangen!';cls='ok';txt=(d.ko?pick(TX.KO)+' ':'')+pick(TX.FANG);f.netT=b.time;f.netWall=performance.now()/1000;f.netFrom=hs.find(h=>!out(h)&&!h.hfBait)||hs.find(h=>!out(h))||null;sfx('net');}}
 else if(d.g.dead){kind='tot';title='Der Hund ist tot';cls='meh';txt=pick(TX.TOT);}
 else if(d.fled){kind='flucht';title='Entkommen';cls='bad';txt=pick(TX.FLUCHT);}
 else if(manDead){kind='totmann';title=hs.length>1?'Alle tot':hs[0].g.name+' ist tot';cls='bad';txt=pick(TX.TOTMANN);}
 else if(manOut){kind='niederlage';title='Der Hund gewinnt';cls='bad';txt=pick(TX.NIEDERLAGE);}
 else{kind='zeit';title='Unentschieden';cls='meh';txt='Nach drei Minuten gehen beide auseinander, keuchend. Rabies nennt das „Diplomatie“.';}
 b.dogOver??={winner:-1};f.outcome=kind;const j=f.j;j.done={fang:'GEFANGEN',tot:'TOT',flucht:'ENTKOMMEN',totmann:'GESCHEITERT',niederlage:'GESCHEITERT',zeit:'OFFEN',rueckzug:'ABGEBROCHEN'}[kind];
 if(kind==='fang'){const D=JSON.parse(JSON.stringify(jobDog(j)));d.dog._src=D;DOG.writeBack(d,false);D.fights=0;D.losses=0;D.kills=0;D.wins=0;D.caughtDay=S.day;D.caughtBy=(f.netFrom||hs.find(h=>!h.g.dead)||hs[0]).g.name;D.from=TX.RASSEN[j.breed].wo;D.skulls=j.skulls;st().dogs.push(D);}
 try{M.persist();}catch{}
 // Lernen und Kampfbericht (Wunsch Thomas 6.11.): gelernt wird im Kampf wie überall (M.learn); am Ende wie nach Arenakämpfen das
 // Allround-Lernen, dazu ein Gefahrenzuschlag je Totenkopf (+6 % je Totenkopf über dem ersten). Bericht wie nach Außenmissionen in S.records.
 const learned=new Map();try{for(const h of hs){const g=h.g;h.xpMultiplier=Math.max(h.xpMultiplier||1,1+.06*Math.max(0,(j.skulls||1)-1));M.applyLearningBonus?.(h);
  if(!g.dead){for(const p of Object.values(g.body||{})){p.bleed=0;p.grade=M.injuryGrade?.(p)??p.grade;}g.fatigue=cl((g.fatigue||0)+10+b.time/18,0,100);g.history?.unshift({day:S.day,text:'Hundefang '+'☠'.repeat(j.skulls)+' · '+TX.RASSEN[j.breed].wo+': '+title+(h.hfBait?' (als Lockvogel)':'')+'.'});}
  learned.set(h,Object.entries(h.learning||{}).filter(([,v])=>v>.0001).sort((a,b)=>b[1]-a[1]));}}catch(e){console.warn(e);}
 try{const report={id:'hundefang-'+j.id+'-'+S.day,arenaName:'Hundefang '+'☠'.repeat(j.skulls)+' · '+TX.RASSEN[j.breed].wo,attackSummary:hs.map(a=>({id:a.id,name:a.g.name,team:0,attacks:a.attacks||{}})),verdicts:[],loot:[],day:S.day,won:kind==='fang'||kind==='tot',draw:['zeit','rueckzug','flucht'].includes(kind),reason:title+' · '+txt,opponent:d.g.name+' ('+d.dog.breedName+')',time:b.time,gold:0,fame:0,league:S.league||0,tournament:'',recipes:[],
   actors:hs.map(a=>({id:a.g.id,name:a.g.name+(a.hfBait?' · Lockvogel':''),damage:Math.round(a.damage||0),taken:Math.round(a.taken||0),kills:a.kills||0,crits:a.crits||0,blocks:a.blocks||0,dodges:a.dodges||0,falls:a.falls||0,rearHits:a.rearHits||0,charges:a.charges||0,backsteps:a.backsteps||0,xpMultiplier:a.xpMultiplier||1,learning:a.learning||{},dead:!!a.g.dead,down:!!(a.down&&!a.g.dead),injuries:Object.entries(a.g.body||{}).filter(([,p])=>p.hp<85||p.missing).map(([id,p])=>M.partName(id)+': '+(p.missing?'abgetrennt':p.injury||'Verletzt')),blood:Math.round(a.g.blood)})),
   log:(b.log||[]).slice(0,80)};S.lastReport=report;S.records=[report,...(S.records||[])].slice(0,35);f.report=report;}catch(e){console.warn(e);}
 if(f.bait.dead&&kind!=='totmann')txt+=' '+fill(pick(TX_LOCK.dead),f.bait);else if(!f.bait.dead&&['fang','tot'].includes(kind))txt+=' '+fill(pick(TX_LOCK.alive),f.bait);
 const lab=k=>{try{return M.learningLabel(k);}catch{return k;}},nf=v=>v.toLocaleString('de-DE',{maximumFractionDigits:2,minimumFractionDigits:2});
 const learnHTML=hs.map(h=>{const L=learned.get(h)||[],tot=L.reduce((n,[,v])=>n+v,0);return `<li><b>${esc(h.g.name.split(' ')[0])}${h.hfBait?' 🍖':''}</b>${h.g.dead?' · tot, lernt nichts mehr':L.length?` · +${nf(tot)} gesamt: ${L.slice(0,4).map(([k,v])=>esc(lab(k))+' +'+nf(v)).join(', ')}`:' · nichts gelernt'}</li>`;}).join('');
 const who=h=>{const hp=Math.round(M.health(h.g)),inj=Object.entries(h.g.body).filter(([,p])=>p.grade>=2||p.missing).map(([id])=>M.partName?M.partName(id):id);return esc(h.g.name)+(h.hfBait?' (Lockvogel)':'')+': '+(h.g.dead?'tot':hp+' % Gesundheit'+(inj.length?', verletzt: '+esc(inj.slice(0,4).join(', ')):''));};
 const el=document.createElement('div');el.className='hf-result';el.id='hfResult';
 el.innerHTML=`<h3 class="${cls}">${esc(title)}</h3><p>${esc(txt)}</p><p style="opacity:.8;font-size:13px">${hs.map(who).join(' · ')} · ${esc(d.g.name)} (${esc(d.dog.breedName)}): ${d.g.dead?'tot':d.ko?'bewusstlos':d.submit?'unterworfen':d.fled?'geflohen':Math.round(DOG.health(d))+' % Gesundheit'} · ${Math.round(b.time)} s</p><div class="hf-learn"><b>GELERNT${(hs[0].xpMultiplier||1)>1?' · Gefahrenzuschlag ×'+(hs[0].xpMultiplier).toLocaleString('de-DE',{maximumFractionDigits:2}):''}</b><ul>${learnHTML}</ul></div><div>${kind==='fang'?'<button class="hf-go" type="button" data-hf="zw">🐕 Ab in den Zwinger</button>':''}<button type="button" data-hf="report">📜 Kampfbericht</button><button type="button" data-hf="board">↩ Zum Karren</button></div>`;
 document.body.appendChild(el);el.onclick=e=>{const k=e.target.closest('[data-hf]')?.dataset.hf;if(k)endFight(k==='zw'?'zwinger':k==='report'?'report':'hundefang');};}
function endFight(page){const f=fight;$('hfResult')?.remove();const bb=$('battleBottom');if(bb){bb.innerHTML='';bb.onclick=null;}SH.live=false;SH.cur=null;SH.q=[];if(f)for(const h of f.hs)unbait(h.g);if(S.battle?.hundefang)S.battle=null;M.missionBackdrop=null;fight=null;try{M.persist();}catch{}try{M.ui.click('nav:'+page);}catch(e){console.warn(e);try{M.ui.render();}catch{}}}
// Leiste unter dem Kampfbild: Ort, Tempo, Rückzug, Zustand von Mensch und Hund (die Seitenleiste des Spiels bleibt)
const prevHud=M.armyBattleHUD;
M.armyBattleHUD=function(b){if(!b?.hundefang)return prevHud?prevHud.apply(this,arguments):false;const f=fight,bot=$('battleBottom');if(!f||!bot)return true;
 if(!bot.querySelector('.hf-hudtop')){bot.innerHTML=`<div class="hf-hudtop"><span>HUNDEFANG · ${'☠'.repeat(f.j.skulls)} · ${esc(TX.RASSEN[f.j.breed].wo)}</span><span><button type="button" data-hfk="spd">⏩ ${S.options.speed||1}×</button> <button type="button" data-hfk="flee">Rückzug</button></span></div><div class="hf-status"></div>`;
  bot.onclick=e=>{const k=e.target.closest('[data-hfk]')?.dataset.hfk;if(k==='spd'){const v=[1,2,.5],i=v.indexOf(S.options.speed||1);S.options.speed=v[(i+1)%v.length];e.target.textContent='⏩ '+S.options.speed+'×';}if(k==='flee'&&!f.outcome){b.dogOver={winner:-1};finish(b,true);}};}
 bot.querySelector('.hf-status').innerHTML=b.actors.map(a=>{if(isDog(a)){const hh=DOG.health(a);return `<div class="hf-st t1"><span class="n">${esc(a.g.name)}</span> <small>${esc(a.dog.breedName)} · ${a.dog.weight} kg</small><div class="hb"><i style="width:${hh}%"></i></div><small>${a.g.dead?'tot':a.ko?'bewusstlos':a.submit?'unterwirft sich':a.fled?'flieht':'Blut '+Math.round(a.blood)+' % · Mut '+Math.round(Math.max(0,a.morale))}</small></div>`;}
  const hh=M.health(a.g);return `<div class="hf-st t0"><span class="n">${esc(a.g.name)}</span> <small>${a.hfBait?'🍖 Lockvogel · unbewaffnet':esc(gearLabel(a.g))}</small><div class="hb"><i style="width:${hh}%"></i></div><small>${a.g.dead?'tot':a.down?'kampfunfähig':a.draggedBy?'wird gezerrt':a.grabbedBy?'wird festgehalten':'kämpft'} · Blut ${Math.round(a.g.blood)} %</small></div>`;}).join('');
 return true;};
// ---------- Lockvogel im Kampf (Wunsch Thomas 6.11.): abgetrennte Körperteile umgehängt, Fliegen schwirren, Ratten laufen hinterher ----------
// Nur Bild. Weltkoordinaten (wie das Netz). Ratten folgen seiner Spur mit Verzögerung; steht oder liegt er, wuseln sie um ihn herum.
const MEAT=[{dx:-9,dy:-47,r:4.2,len:5},{dx:-3,dy:-44,r:3.6,len:7},{dx:5,dy:-45,r:4.6,len:6},{dx:11,dy:-48,r:3.4,len:4},{dx:-7,dy:-29,r:4.8,len:6},{dx:2,dy:-27,r:4,len:8},{dx:9,dy:-30,r:3.8,len:5}];
const TAU2=Math.PI*2;
// Abgetrennte Körperteile statt Fleischbrocken (Wunsch Thomas 6.11.): Hände, Füße, Unterarme, Köpfe – je Kampf neu gemischt.
// Jedes Teil hängt mit dem Stumpf (Hand, Fuß, Unterarm) bzw. an den Haaren (Kopf) an der Schnur; Ursprung (0,0) = Schnurende, es hängt nach unten.
const SKINS=[['#f0d0b0','#c9a080'],['#e8c19a','#b98e68'],['#d9ac82','#a87c56'],['#c08a5e','#8e6240'],['#9a6a44','#6e4a2e'],['#6e4a30','#4a301e']];
const HAIRS=['#2a1c14','#443025','#6a4a2a','#b08a4a','#d8c8a8','#8a2a1a',null];
const mix=(a,b,t)=>{const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),A=p(a),B=p(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');};
function makeParts(){let heads=0;return MEAT.map(()=>{let r=Math.random(),kind=r<.34?'hand':r<.62?'foot':r<.8?'arm':'head';if(kind==='head'&&heads++>=2)kind='hand';
 const [sk,sh]=SKINS[Math.floor(Math.random()*SKINS.length)],rot=Math.random()*.9;
 return {kind,s:.85+Math.random()*.35,flip:Math.random()<.5,sk:mix(sk,'#8a9a6a',rot*.5),sh:mix(sh,'#5a6a3a',rot*.5),rot,hair:HAIRS[Math.floor(Math.random()*HAIRS.length)],eyes:Math.floor(Math.random()*3),mouth:Math.random()<.5,curl:Math.random()<.4,spots:Array.from({length:1+Math.floor(rot*4)},()=>[Math.floor(Math.random()*5)-2,1+Math.floor(Math.random()*6)]),drip:Math.random()};});}
function limbPart(ctx,x,y,P,rot,k,now){ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(rot);const z=P.s*k;ctx.scale(z*(P.flip?-1:1),z);
 const R=(a,b,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(a,b,w,h);},sk=P.sk,sh=P.sh,ol='#2a1a12',bl='#6e120c',bd='#a82018',bn='#efe4c8';
 if(P.kind==='hand'){R(-2.5,.5,5,5.5,ol);R(-2,0,4,1,bl);R(-1,0,2,1,bn);R(-2,1,4,4,sk);R(1,1,1,4,sh);
  const L=P.curl?[1,2,2,1]:[2,3,3,2];for(let f=0;f<4;f++){R(-2+f,5,1,L[f],f%2?sk:mix(sk,sh,.35));}R(2,2,1,2,sk);R(-2,5,4,.4,sh);}
 else if(P.kind==='foot'){R(-2,.5,4,4,ol);R(-1.5,0,3,1,bl);R(-.5,0,1,1,bn);R(-1.5,1,3,3.5,sk);R(.5,1,1,3.5,sh);R(-2.5,4,7.5,2.6,ol);R(-2,4,7,2,sk);R(-2,5.6,7,.6,sh);R(-2.4,4.2,1,1.6,sh);for(let t=0;t<4;t++)R(4.6,4+t*.5,.7,.45,t%2?sk:sh);}
 else if(P.kind==='arm'){R(-1.5,.5,3,9,ol);R(-1,0,2,1,bl);R(-.5,0,1,1,bn);R(-1,1,2,5.5,sk);R(.4,1,.6,5.5,sh);R(-1.5,6.5,3,2.2,sk);for(let f=0;f<3;f++)R(-1.5+f,8.7,.8,P.curl?.8:1.6,sk);}
 else{// Kopf: an den Haaren aufgehängt
  if(P.hair){R(-.5,0,1,1.5,P.hair);}else{R(-.4,0,.8,1.6,'#9a8a6a');}
  ctx.fillStyle=ol;ctx.beginPath();ctx.ellipse(0,5,3.9,4.2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=sk;ctx.beginPath();ctx.ellipse(0,5,3.4,3.7,0,0,Math.PI*2);ctx.fill();R(1.6,2.5,1,5,sh);
  if(P.hair){R(-3,1.4,6,1.6,P.hair);R(-3.2,2.6,1,2,P.hair);R(2.4,2.6,1,2,P.hair);}
  if(P.eyes===0){R(-2,4.4,1.2,.5,ol);R(.8,4.4,1.2,.5,ol);}else if(P.eyes===1){R(-2,4,1.2,1,'#f4eee0');R(.8,4,1.2,1,'#f4eee0');R(-1.4,4.3,.5,.5,ol);R(1.2,4.3,.5,.5,ol);}else{R(-2,3.9,1,1,ol);R(-1,4.9,1,1,ol);R(-1,3.9,1,1,ol);R(-2,4.9,1,1,ol);R(.9,3.9,1,1,ol);R(1.9,4.9,1,1,ol);R(1.9,3.9,1,1,ol);R(.9,4.9,1,1,ol);}
  R(-.4,5.2,.8,1,sh);R(-1.2,6.6,2.4,P.mouth?1.3:.5,'#3a0a08');if(P.mouth)R(-.4,7.3,.8,.6,'#b8545a');
  R(-1.8,8.5,3.6,1,bl);R(-.5,8.6,1,.6,bn);}
 for(const [sx,sy] of P.spots)R(sx*.7,sy+.5,1,1,P.rot>.5?'#5a6a2a':'#7a8a3a');
 const d=(P.drip*3+(now||0)*.8)%1.6;if(P.kind!=='head')R(-.3,-0.1+d*0,.6,.1,bd);R(.2,(P.kind==='head'?9.5:P.kind==='arm'?10.5:P.kind==='foot'?7:8)+d*2,.6,.9,bd);
 ctx.restore();}
function rat(ctx,x,y,face,s,ph,moving){ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(face*s,s);const hop=moving?Math.abs(Math.sin(ph))*1.2:0;
 ctx.strokeStyle='#8a6a5e';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-5,-1.5);ctx.quadraticCurveTo(-10,-1+Math.sin(ph*.7)*3,-15,1+Math.sin(ph*.9)*2);ctx.stroke();// Schwanz
 ctx.fillStyle='#2e2620';ctx.fillRect(-4,-1,1,2);ctx.fillRect(2,-1,1,2);if(moving){const l=Math.sin(ph)>0?1:-1;ctx.fillRect(-3+l,0,1,1);ctx.fillRect(3-l,0,1,1);}
 ctx.fillStyle='#4a3c32';ctx.beginPath();ctx.ellipse(0,-2.8-hop,5.5,2.8,0,0,TAU2);ctx.fill();
 ctx.fillStyle='#5e4e42';ctx.beginPath();ctx.ellipse(-.5,-3.6-hop,3.8,1.5,0,0,TAU2);ctx.fill();
 ctx.fillStyle='#4a3c32';ctx.beginPath();ctx.ellipse(5.5,-3-hop,2.6,1.9,.2,0,TAU2);ctx.fill();// Kopf
 ctx.fillStyle='#d88a8a';ctx.fillRect(8,-3-hop|0,1,1);ctx.fillStyle='#6a5248';ctx.fillRect(4,-5.5-hop|0,2,2);ctx.fillStyle='#f0d070';ctx.fillRect(6,-4-hop|0,1,1);
 ctx.restore();}
const baitLying=h=>h.g.dead||h.down||h.state==='fallen'||(h.fallTimer||0)>0||!!h.draggedBy;
// Unter den Figuren: Spur, Ratten, Fleisch am Boden (wenn er liegt)
function baitUnder(ctx,b,f){const h=f.hs?.find(x=>x.hfBait);if(!h)return;const g=h.g,T=b.time,now=performance.now()/1000,k=(g.height||180)/180*1.14,lying=baitLying(h);
 const tr=f.trail??=[];const last=tr[tr.length-1];if(!last||T-last.t>=.04){tr.push({t:T,x:h.x,y:h.y});if(tr.length>90)tr.shift();}
 const at=lag=>{const tt=T-lag;for(let i=tr.length-1;i>=0;i--)if(tr[i].t<=tt)return tr[i];return tr[0];};
 if(lying){const pts=[],P=f.parts??=makeParts();MEAT.forEach((m,i)=>{const a=i*.9+1.3,x=h.x+Math.cos(a)*(18+i*4)*k,y=h.y+5+Math.sin(a)*8*k;limbPart(ctx,x,y-3*k,P[i],a*1.7+1.2,k*1.15,0);pts.push({x,y});});f.meatPts=pts;}
 const pts=f.meatPts||[];
 const R=f.rats??=[{lag:.5,off:-7,s:1},{lag:.85,off:8,s:.85},{lag:1.25,off:-2,s:1.1},{lag:1.7,off:11,s:.8},{lag:2.2,off:-10,s:.95}];
 for(const r of R){const p=at(r.lag)||h,q=at(r.lag+.15)||p,mx=p.x-q.x,my=p.y-q.y,mv=Math.hypot(mx,my)>.8&&!lying;let x,y,face;
  if(mv){const n=Math.hypot(mx,my)||1;x=p.x+(-my/n)*r.off;y=p.y+5+(mx/n)*r.off*.4;face=mx>=0?1:-1;}
  else{const tgt=pts[(r.off+20)%Math.max(1,pts.length)]||h,a=now*(1+r.s*.8)+r.off,rad=lying?6+Math.abs(r.off)*.4:18+r.off*.5,nib=lying&&Math.sin(now*2+r.off)>-.2;
   x=nib?tgt.x+Math.cos(r.off)*5:h.x+Math.cos(a)*rad;y=nib?tgt.y+3:h.y+5+Math.sin(a)*rad*.35;face=nib?(Math.cos(r.off)>0?-1:1):(-Math.sin(a)>=0?1:-1);}
  rat(ctx,x,y,face,r.s,now*16+r.off,mv||!lying);}}
// An der Figur (gleiche Zeichenreihenfolge wie er selbst): Schnüre mit Fleischbrocken, schwingen beim Laufen
function baitBody(ctx,h){const f=fight;if(!f||!h.hfBait||baitLying(h))return;const g=h.g,now=performance.now()/1000,k=(g.height||180)/180*1.14,dir=Math.cos(h.a||0)>=0?1:-1;
 const tr=f.trail||[],q=tr[Math.max(0,tr.length-3)]||h,sp=Math.hypot(h.x-q.x,h.y-q.y),pts=[];
 ctx.strokeStyle='#9a8a6a';ctx.lineWidth=1;for(const row of [-47,-28]){ctx.beginPath();ctx.moveTo(h.x-12*k,h.y+(row-1)*k);ctx.quadraticCurveTo(h.x,h.y+(row+3)*k,h.x+13*k,h.y+(row-2)*k);ctx.stroke();}
 MEAT.forEach((m,i)=>{const sw=Math.sin(now*5+i*1.7)*(.18+Math.min(.5,sp*.1)),ax=h.x+m.dx*dir*k,ay=h.y+m.dy*k,len=m.len*k,x=ax+Math.sin(sw)*len,y=ay+Math.cos(sw)*len;ctx.strokeStyle='#9a8a6a';ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(x,y);ctx.stroke();limbPart(ctx,x,y,(f.parts??=makeParts())[i],sw*.8,k*1.15,now);pts.push({x,y:y+4*k});});
 f.meatPts=pts;}
// Über allem: Gestank und Fliegen
function baitTop(ctx,b,f){const h=f.hs?.find(x=>x.hfBait);if(!h)return;const now=performance.now()/1000,k=(h.g.height||180)/180*1.14,lying=baitLying(h),pts=f.meatPts||[];
 ctx.save();ctx.strokeStyle='#8f9a3a';ctx.lineWidth=1;for(let i=0;i<3;i++){const u=(now*.6+i/3)%1,x0=h.x+(i-1)*9*k,y0=h.y-(lying?6:40*k)-u*26*k;ctx.globalAlpha=.4*(1-u);ctx.beginPath();for(let j=0;j<=6;j++){const yy=y0-j*2,xx=x0+Math.sin(now*4+j*.9+i)*2.5;j?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.stroke();}ctx.restore();
 ctx.fillStyle='#120c08';for(let i=0;i<16;i++){const c=pts[i%Math.max(1,pts.length)];if(!c)break;const a=now*(4+(i%5))+i*2.3,rx=(6+i%4*2)*k,x=c.x+Math.cos(a)*rx+Math.sin(now*11+i)*1.5,y=c.y-4*k+Math.sin(a*1.3)*rx*.6;ctx.fillRect(Math.round(x),Math.round(y),1,1);if(Math.sin(now*40+i)>0){ctx.fillStyle='#b8c0c8';ctx.fillRect(Math.round(x)-1,Math.round(y)-1,1,1);ctx.fillRect(Math.round(x)+1,Math.round(y)-1,1,1);ctx.fillStyle='#120c08';}}}
{const pu=M.battleUnderlay;M.battleUnderlay=(ctx,b)=>{pu?.(ctx,b);const f=fight;if(f&&f.b===b)try{baitUnder(ctx,b,f);}catch(e){console.warn(e);}};
 const pa=M.afterActor;M.afterActor=(ctx,a)=>{pa?.(ctx,a);if(a?.hfBait&&fight)try{baitBody(ctx,a);}catch(e){console.warn(e);}};}
// Netz über dem gefangenen Hund, Sterne über dem bewusstlosen
const prevOverlay=M.battleOverlay;
M.battleOverlay=(ctx,b)=>{prevOverlay?.(ctx,b);const f=fight;if(!f||f.b!==b)return;const d=f.d;try{baitTop(ctx,b,f);}catch(e){console.warn(e);}
 if(d.ko&&!f.outcome){const t=b.time;ctx.fillStyle='#f3e2b0';for(let i=0;i<3;i++){const a=t*3+i*2.1;ctx.fillRect(Math.round(d.x+Math.cos(a)*14),Math.round(d.y-40+Math.sin(a)*5),3,3);}}
 if(f.netT>=0&&M.netArt?.capture){const fr=f.netFrom,ni=fr&&['weapon','secondary'].map(sl=>M.gear(fr.g,sl)).find(i=>i?.def==='net');try{M.netArt.capture(ctx,{x:d.x,y:d.y,sz:d.P.sz,face:Math.cos(d.a||0)>=0?1:-1,from:fr&&!fr.g.dead?{x:fr.x,y:fr.y}:null,q:ni?.q??1,t:f.netWall!=null?performance.now()/1000-f.netWall:b.time-f.netT,now:performance.now()/1000,still:!!d.ko,lying:!!(d.ko||d.down||d.mode==='down'||d.mode==='submit'),seed:(d.dog?.seed||7)%13});}catch(e){console.warn(e);}}
 else if(f.netT>=0){const k=cl((b.time-f.netT)/.5,0,1),cx=d.x,cy=d.y-22,rw=46*d.P.sz,rh=30*d.P.sz,top=cy-rh-(1-k)*120;ctx.save();ctx.globalAlpha=.9;ctx.strokeStyle='#d8c8a0';ctx.lineWidth=1.2;
  for(let i=-6;i<=6;i++){ctx.beginPath();ctx.moveTo(cx+i*rw/6-rw*.3,top);ctx.lineTo(cx+i*rw/6+rw*.3,top+rh*2);ctx.stroke();ctx.beginPath();ctx.moveTo(cx+i*rw/6+rw*.3,top);ctx.lineTo(cx+i*rw/6-rw*.3,top+rh*2);ctx.stroke();}
  ctx.fillStyle='#8a6a3a';for(const s of [-1,1])ctx.fillRect(Math.round(cx+s*rw*.9),Math.round(top+rh*2-3),4,4);ctx.restore();}};
// Nahaufnahmen der Hunde (hund-shots.js) über dem Kampfbild: im Hundefang und in Arenakämpfen mit Hunden
const shot=document.createElement('canvas');shot.id='hfShot';shot.width=850;shot.height=520;shot.onclick=()=>SH.skip();document.body.appendChild(shot);
let lastF=0,shotBattle=null;
function frame(now){const dt=Math.min(.05,(now-(lastF||now))/1000);lastF=now;const b=S.battle,view=$('battleView'),vis=!!b?.hasDogs&&view&&!view.hidden;
 if(b!==shotBattle){shotBattle=b;SH.cur=null;SH.q=[];SH.gap=2;SH.live=!!b?.hasDogs;SH.mode='severe';}
 if(vis&&!SH.cur)SH.gap=Math.max(0,SH.gap-dt);
 if(vis&&(SH.cur||SH.q.length)){SH.lastPaint=performance.now();const on=SH.step(dt);if(on){const r=$('arenaCanvas')?.getBoundingClientRect();if(r){Object.assign(shot.style,{display:'block',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});SH.paint(shot);}}else shot.style.display='none';}
 else shot.style.display='none';
 const zw=document.querySelector('canvas.hf-cage');if(zw&&ZW.cages.length)try{ZW.frame(zw,now);}catch(e){console.warn(e);}
 requestAnimationFrame(frame);}
requestAnimationFrame(frame);

// =====================================================================================================
// SEITEN · Karren am Beastrium, Auftragsbrett („hundefang“), Zwinger („zwinger“)
// =====================================================================================================
const fighters=()=>(S.roster||[]).filter(g=>!g.dead&&!g.smithDuty&&!g.retired&&!(g.age<18));
const fit=g=>{try{return M.army?.eligibility?M.army.eligibility(g).ok:!g.dead;}catch{return !g.dead;}};
let selJob=0;
function cartPanel(){const s=st(),alive=s.dogs.filter(D=>!D.dead).length,left=usedToday()?0:s.jobs.filter(j=>!j.done).length;
 return `<section class="box hf-cart"><canvas id="hfCartFace" width="160" height="104" data-action="nav:hundefang" title="Zu den Aufträgen" style="cursor:pointer"></canvas><div><p class="eyebrow">VOR DEM BEASTRIUM · DER KARREN DES HUNDSGRAFEN</p><h2>${esc(TX.NAME)}</h2><q>${esc(TX.BRETT[(S.day+3)%TX.BRETT.length])}</q>
 <div class="buttons"><button class="btn primary" data-action="nav:hundefang">🐕 Aufträge${left?' ('+left+')':' · morgen wieder'}</button><button class="btn" data-action="nav:zwinger">▼ Treppe hinab · Zwinger (${alive} ${alive===1?'Hund':'Hunde'})</button><button class="btn" data-action="hf:intro">Vorstellung ansehen</button></div></div></section>`;}
function cleanTeam(){team.men=team.men.filter(id=>{const g=byId(id);return g&&fit(g)&&id!==team.bait&&!g.smithDuty&&!g.retired;}).slice(0,2);if(team.bait&&!baitCands().some(g=>g.id===team.bait))team.bait=null;
 if(!team.bait){const c=baitCands().find(g=>!team.men.includes(g.id));team.bait=c?.id||null;if(team.bait)team.quip=Math.random()<.6?baitQuip(baitScore(c),3):fill(pick(TX_LOCK.pick),c);}}
// Automatisch ausrüsten (Wunsch Thomas 6.11.): wie in der Arena-Vorbereitung, nur für die Kämpfer des Trupps
const autoEq=()=>st().autoEq!==false;
function equipTeam(quiet){const men=team.men.map(byId).filter(Boolean);if(!men.length)return '';let msg='';try{msg=M.army?.autoEquip?M.army.autoEquip(men,'soll',{take:true}):'Automatisches Ausrüsten nicht verfügbar.';}catch(e){msg='Ausrüsten fehlgeschlagen: '+e.message;}try{M.persist();}catch{}if(!quiet&&msg)M.ui.notify?.(msg);return msg;}
document.addEventListener('change',e=>{if(e.target?.hasAttribute?.('data-hfauto')){st().autoEq=!!e.target.checked;try{M.persist();}catch{}}});
const teamOk=()=>!!byId(team.bait)&&team.men.length<=2&&team.men.every(id=>id!==team.bait&&byId(id)&&fit(byId(id)));
// Filter für Lockvogel und Kämpfer (Wunsch Thomas 10.11.): Talent, Einordnung, Wuchs, Sortierung. Gewählte bleiben immer sichtbar.
const HF_BAIT={defSort:'bait',sorts:[{key:'bait',label:'Köderwert ↓',cmp:(a,b)=>baitScore(b).score-baitScore(a).score}]},HF_MEN={defSort:'kw-',flags:[{key:'fit',label:'nur einsatzbereit',pred:g=>fit(g)}]};
function kf(scope,list,opts,keep){const KF=M.kaderFilter;if(!KF)return {list,bar:''};const out=KF.apply(scope,list,opts);for(const g of [...keep].reverse())if(g&&list.includes(g)&&!out.includes(g))out.unshift(g);return {list:out,bar:KF.bar(scope,{...opts,total:list.length,shown:out.length})};}
M.kaderFilter?.on('hfbait',()=>M.ui.render?.());M.kaderFilter?.on('hfmen',()=>M.ui.render?.());
function teamHTML(j,gs0){const B=byId(team.bait),lock0=baitCands(),fb=kf('hfbait',lock0,HF_BAIT,[B]),fm=kf('hfmen',gs0,HF_MEN,team.men.map(byId)),lockC=fb.list,gs=fm.list;
 const card=(g,act,on,extra)=>`<button type="button" class="hf-pick${on?' on':''}${extra.cls||''}" data-action="${act}:${g.id}"><canvas data-hfface="${g.id}" width="160" height="104"></canvas><div><b>${esc(g.name)}</b>${extra.html}</div></button>`;
 return `<h2>Wen schickst du?</h2><p class="hf-sub">Bis zu drei Leute. Einer geht immer als <b>Lockvogel</b> vor – ohne Waffe, ohne Rüstung, behängt mit abgetrennten, verfaulenden Händen, Füßen und Köpfen – bis zu zwei Kämpfer folgen mit ihrer ganzen eigenen Ausrüstung (alle Waffen, auch Netz und Fernwaffen). Rabies verleiht nichts mehr: „Mein Knüppel? Der ist zum Frühstück da.“</p>
 <h3 class="hf-h3">🍖 Lockvogel <small>· ohne Waffe und Rüstung, mit Händen, Füßen und Köpfen behängt, geht vor · sortiert nach Köderwert: Amputationen und schwaches Talent zählen voll, Wunden nur, solange sie noch nicht verheilt sind</small></h3>
 ${B?`<div class="hf-lockq"><canvas id="hfLockFace" width="160" height="104"></canvas><span class="hf-lockline"><b>Rabies:</b> „${esc(team.quip||fill(pick(TX_LOCK.pick),B))}“</span></div>`:''}
 ${fb.bar}<div class="hf-picks hf-lock">${lockC.map(g=>{const v=baitScore(g),on=g.id===team.bait,inMen=team.men.includes(g.id);return card(g,'hf:bait',on,{cls:(inMen?' unfit':'')+(v.score>=55?' hf-prime':''),html:`<small class="hf-tier" style="--tc:${TCOL[v.t.level-1]}">Talent ${v.t.p} · ${esc(v.t.name)}${v.tag?' · '+esc(M.sortTag?.KINDS?.[v.tag]?.label||v.tag):''}</small>${v.amp.length?`<small class="hf-amp">🦴 fehlt: ${v.amp.map(a=>esc(a.name)).join(', ')}</small>`:''}<small>${keulen(Math.round(v.score/20))} <b>${esc(v.grade)}</b> · ${v.score}</small><small>${Math.round(v.hp)} % Gesundheit${v.days?' · heilt in '+v.days+' T.':''}${v.chronic?' · Dauerschaden −'+Math.round(v.chronic)+' %':''}${inMen?' · ist Kämpfer':''}</small><small class="hf-baitq">„${esc(baitQuip(v))}“</small>`});}).join('')||(lock0.length?'<p>Niemand passt zum Filter.</p>':'<p>Niemand im Kader.</p>')}</div>
 <h3 class="hf-h3">⚔ Kämpfer <small>· ${team.men.length} von 2 · eigene Ausrüstung</small></h3>
 ${fm.bar}<div class="hf-picks">${gs.map(g=>{const ok=fit(g),on=team.men.includes(g.id),v=j?verdictOf(g,j):{i:2,txt:'–'};return card(g,'hf:pick',on,{cls:ok&&g.id!==team.bait?'':' unfit',html:`<small>${esc(g.role||'')} · KW ${Math.round(M.power?.(g)||0)} · ${esc(gearLabel(g))}${hasNet(g)?' 🕸':''}</small><small>${g.id===team.bait?'ist der Lockvogel':ok?`Einschätzung: <span class="hf-v hf-v${v.i}">${v.txt}</span>`:'nicht einsatzbereit'}</small>`});}).join('')||(gs0.length?'<p>Niemand passt zum Filter.</p>':'<p>Niemand im Kader.</p>')}</div>
 <p style="font-size:13px;opacity:.85">Der Hund geht meist auf den Nächsten los, also zuerst auf den Lockvogel. Die Einschätzung kennt nur die Gefahrenstufe, nicht die Rasse. Wunden, Tod und Lernen zählen wie im echten Kampf. Fangen: Unterwirft sich der Hund, hält ihn ein Netz sicher (hat keiner eins dabei und war er nicht im Netz, nur jedes zweite Mal); manchmal bleibt er auch nur bewusstlos liegen, nach stumpfen Waffen oder Fäusten öfter.</p>
 <div class="hf-gear"><button class="btn" type="button" data-action="hf:equip" ${team.men.length?'':'disabled'}>⚒ Automatisch ausrüsten</button><label><input type="checkbox" data-hfauto ${autoEq()?'checked':''}> beim Aufbrechen automatisch ausrüsten</label><small style="opacity:.75">wie in der Arena: beste Waffengattung nach SOLL, darf anderen (auch dem Lockvogel) die Ausrüstung abnehmen</small></div>
 <div class="buttons"><button class="btn primary" data-action="hf:go" ${!teamOk()||j?.done?'disabled':''}>🔭 Aufbrechen${B?' · '+(1+team.men.length)+' '+(team.men.length?'Leute':'Mann (nur der Lockvogel)'):''}</button></div>`;}
function boardPage(){const s=st(),j=s.jobs[selJob]||s.jobs[0],gs=fighters().sort((a,b)=>(M.power(b)||0)-(M.power(a)||0)),used=usedToday();cleanTeam();
 const quote=used?'Für heute hab ich genug Köter gesehen. Morgen frisst schon der Nächste jemanden.':TX.STUFE[(j?.skulls||1)-1];
 return `<section class="box hf-board"><div class="hf-head"><canvas id="hfBoardFace" width="320" height="208"></canvas><div><p class="eyebrow">DER KARREN DES HUNDSGRAFEN · TAG ${S.day}</p><h1>Aufträge</h1><q>${esc(quote)}</q></div></div>
 <p>Je mehr Totenköpfe, desto gefährlicher der Hund. Welche Rasse es ist, sieht man erst durchs Fernglas. Ein Auftrag am Tag.</p>
 <div class="hf-jobs">${s.jobs.map((x,i)=>{const R=TX.RASSEN[x.breed];return `<button type="button" class="hf-job t${x.skulls}${i===selJob?' on':''}${x.done?' done':''}" data-action="hf:job:${i}">${skulls(x.skulls)}<span class="wo">${esc(R.wo)}</span><span class="txt">${esc(R.geruecht)}</span>${x.done?`<span class="stamp">${esc(x.done)}</span>`:''}</button>`;}).join('')}</div>
 ${used?`<div class="hf-note"><b>Heute warst du schon unterwegs.</b> Morgen gibt es neue Gerüchte.</div>`:teamHTML(j,gs)}
 ${tradeSection()}
 <div class="buttons" style="margin-top:10px"><button class="btn" data-action="nav:beastrium">◂ Zurück zum Beastrium</button><button class="btn" data-action="nav:zwinger">▼ Zwinger</button></div></section>`;}
// ---------- Tierhandel: Rabies kauft gefangene Hunde und Hähne der Hühnerschule (Marktwert) ----------
// Hund: aus dem Kampfwert (KW^1,6 / 4), Zustand und Siegen. Hahn: nach Güteklasse (1–9), Zustand und Siegen; Rabies kauft Hähne als Hundefutter.
const CF=()=>window.CF;
function dogValue(D){const v=Math.pow(DOG.kw(D,false),1.6)/4*(.4+.6*DOG.condHealth(D)/100)+(D.wins||0)*8;return Math.max(5,Math.round(v/5)*5);}
function roosterValue(R){const base=[2,3,5,8,12,18,26,38,55][(R.quality?.tier||1)-1]||2;let h=100;try{h=CF().health(R);}catch{}return Math.max(1,Math.round(base*(.5+.5*h/100)+(R.wins||0)*2));}
const roosters=()=>(S.huehner?.roosters||[]).filter(R=>!R.dead);
let sellArm='';
function tradeSection(){const dogs=st().dogs.filter(D=>!D.dead),rs=roosters();
 const row=(key,name,sub,price)=>`<div class="hf-trade"><span><b>${esc(name)}</b><small>${esc(sub)}</small></span><button class="btn${sellArm===key?' primary':''}" data-action="hf:sell:${key}">${sellArm===key?'Wirklich verkaufen? '+price+' Gold':'Verkaufen · '+price+' Gold'}</button></div>`;
 return `<h2 style="margin-top:14px">Tierhandel</h2><p style="font-size:13px;opacity:.85">„${esc(dogs.length||rs.length?'Ich zahl fair. Fair für mich. Hähne nehm ich auch, als Futter. Lebendfutter hält länger frisch.':'Nichts zu verkaufen? Dann fang was. Oder züchte Hühner, die nimmt mein Rudel auch.')}“</p>
 ${dogs.length?`<h3>Hunde</h3>${dogs.map(D=>row('d:'+D.id,D.name,D.breedName+' · Gesundheit '+Math.round(DOG.condHealth(D))+' % · KW '+DOG.kw(D),dogValue(D))).join('')}`:''}
 ${rs.length?`<h3>Hähne</h3>${rs.map(R=>row('r:'+R.id,R.name,(R.quality?.title||'Hahn')+(R.wins?' · '+R.wins+' Siege':''),roosterValue(R))).join('')}`:''}`;}
function sell(key){const [kind,id]=key.split(/:(.*)/s);let price=0,name='';
 if(kind==='d'){const a=st().dogs,i=a.findIndex(D=>D.id===id&&!D.dead);if(i<0)return;price=dogValue(a[i]);name=a[i].name;a.splice(i,1);}
 else{const a=S.huehner?.roosters||[],i=a.findIndex(R=>String(R.id)===id&&!R.dead);if(i<0)return;price=roosterValue(a[i]);name=a[i].name;a.splice(i,1);}
 S.gold=(S.gold||0)+price;if(S.stats)S.stats.earned=(S.stats.earned||0)+price;try{M.sound?.('coin');}catch{}try{M.persist();}catch{}
 M.ui.notify?.(`${name} gehört jetzt Rabies. +${price} Gold. „${pick(kind==='d'?['Der bekommt einen schönen Käfig. Fast so schön wie deiner.','Gutes Tier. Hätte dich bestimmt irgendwann gebissen.','Ich nenn ihn um. Vielleicht.']:['Wird morgen gefressen. Nicht von mir. Meistens.','Ein Hahn weniger, ein Hund glücklicher.','Gackert noch. Nicht mehr lange.'])}“`);}
let zwPage=0,zwSort='kw',zwCls=0;// Zwinger: Einteilung nach Gefahrenklasse (☠ wie die Aufträge), Sortierung (Wunsch Thomas 7.11.)
function zwInfo(D){try{return window.Begleithund?.info?window.Begleithund.info(D):null;}catch{return null;}}
const ZW_SORT=[['kw','Kampfwert'],['tal','Talent'],['hp','Gesundheit'],['wins','Siege'],['kills','Tote'],['name','Name']];
function zwSorted(list){const by={kw:(a,b)=>b.I.kw-a.I.kw,tal:(a,b)=>(b.I.tal?.p||0)-(a.I.tal?.p||0),hp:(a,b)=>b.I.hp-a.I.hp,wins:(a,b)=>b.I.wins-a.I.wins||b.I.fights-a.I.fights,kills:(a,b)=>b.I.kills-a.I.kills,name:(a,b)=>a.D.name.localeCompare(b.D.name,'de')}[zwSort]||((a,b)=>b.I.kw-a.I.kw);return list.slice().sort((a,b)=>by(a,b)||b.I.kw-a.I.kw);}
function zwingerPage(){const s=st(),all=s.dogs.map(D=>({D,I:zwInfo(D)||{kw:DOG.kw(D),hp:Math.round(DOG.condHealth(D)),sk:1,cls:'',breed:D.breedName,inj:{k:0,label:'',icon:''},wins:D.wins||0,losses:D.losses||0,kills:D.kills||0,fights:D.fights||0,fit:DOG.fit(D)}}));
 const aliveAll=zwSorted(all.filter(x=>!x.D.dead)),deadL=all.filter(x=>x.D.dead),alive=aliveAll.filter(x=>!zwCls||x.I.sk===zwCls).map(x=>x.D),pages=Math.max(1,Math.ceil(alive.length/3));zwPage=cl(zwPage,0,pages-1);
 const bars=D=>DOG.STATS.map(([k,n])=>`<span>${n}</span><i><b style="width:${cl(D.stats[k],0,100)}%"></b><em style="left:${cl(D.caps[k],0,100)}%"></em></i><span>${Math.round(D.stats[k])}</span>`).join('');
 const card=({D,I})=>`<div class="hf-dog hf-dogc${D.dead?' dead':''}${!D.dead&&!I.fit?' unfit':''}"><canvas data-hfdog="${D.id}" width="128" height="80"></canvas><div class="hf-dogi">
  <div class="hf-dn"><b>${esc(D.name)}</b><span class="hf-sk" title="Gefahrenklasse ${I.sk}${I.cls?': '+esc(I.cls):''}">${'☠'.repeat(I.sk)}</span></div>
  <small>${esc(I.breed||D.breedName)} · ${D.sex==='Hündin'?'♀':'♂'} · ${D.height} cm · ${D.weight} kg</small>
  ${D.dead?`<small>✝ ${esc(D.cause||'gefallen')}${D.killer?' · durch '+esc(D.killer):''}</small>`:`<div class="hf-ic"><span class="hf-kw" title="Kampfwert">⚔ ${I.kw}</span>${window.Begleithund?.talTag&&I.tal?window.Begleithund.talTag(D,I):''}<span class="hf-hp${I.hp<50?' lo':I.hp<80?' mid':''}" title="Gesundheit">♥ ${I.hp} %</span><span class="hf-inj i${I.inj.k}" title="${esc(I.inj.label)}">● ${esc(I.inj.label)}</span>${I.fit?'':'<span class="hf-rest" title="Nicht einsatzbereit">⏳ erholt sich</span>'}</div>`}
  <div class="hf-ic hf-rec"><span title="Kämpfe">🥊 ${I.fights}</span><span title="Siege">🏆 ${I.wins}</span><span title="Niederlagen">✗ ${I.losses}</span><span title="getötete Gegner">✝ ${I.kills}</span>${D.from?`<span title="gefangen">⛓ ${esc(D.from)}</span>`:''}</div>
  ${D.dead?'':`<details class="hf-more"><summary>Werte</summary><div class="hf-bars">${bars(D)}</div></details>`}</div></div>`;
 const counts=[0,1,2,3,4,5].map(k=>k?aliveAll.filter(x=>x.I.sk===k).length:aliveAll.length);
 const bar=aliveAll.length?`<div class="hf-zbar"><div class="hf-zf"><span class="hf-zl">Klasse</span>${[0,1,2,3,4,5].filter(k=>!k||counts[k]).map(k=>`<button class="hf-chip${zwCls===k?' on':''}" data-action="hf:zwcls:${k}" title="${k?esc(window.Begleithund?.CLASS?.[k]||''):'alle Klassen'}">${k?'☠'.repeat(k):'Alle'} <small>${counts[k]}</small></button>`).join('')}</div>
  <div class="hf-zf"><span class="hf-zl">Sortieren</span>${ZW_SORT.map(([k,n])=>`<button class="hf-chip${zwSort===k?' on':''}" data-action="hf:zwsort:${k}">${n}</button>`).join('')}</div></div>`:'';
 // nach Klassen gruppiert (bei „Alle“), sonst eine Liste
 const groups=zwCls?[[zwCls,aliveAll.filter(x=>x.I.sk===zwCls)]]:[5,4,3,2,1].map(k=>[k,aliveAll.filter(x=>x.I.sk===k)]).filter(([,l])=>l.length);
 const lists=groups.map(([k,l])=>`<h3 class="hf-gh"><span>${'☠'.repeat(k)}</span> ${esc(window.Begleithund?.CLASS?.[k]||'Klasse '+k)} <small>${l.length}</small></h3><div class="hf-dogs">${l.map(card).join('')}</div>`).join('');
 return `<section class="box hf-zw"><p class="eyebrow">UNTER DEM BEASTRIUM · ${esc(S.schoolName||'Ludus')}</p><h1>Zwinger</h1><p>Die Treppe führt in ein feuchtes Gewölbe. Rabies hat hier „ein bisschen umgebaut“. Gefangene Hunde kämpfen in der Arena (BEAST → Hund), gehen in der Aufstellung mit (Arena und Abenteuer) und heilen jeden Tag ein Stück. ☠ Gefahrenklasse der Rasse.</p>
 ${alive.length?`<canvas class="hf-cage" width="960" height="420"></canvas>${pages>1?`<div class="buttons" style="justify-content:center;margin:6px 0"><button class="btn" data-action="hf:zw:-1">◂</button><span style="align-self:center">Käfige ${zwPage*3+1}–${Math.min(alive.length,zwPage*3+3)} von ${alive.length}</span><button class="btn" data-action="hf:zw:1">▸</button></div>`:''}`:aliveAll.length?'':'<div class="hf-note">Leere Käfige. Es riecht trotzdem nach Hund. Bring Rabies einen Kämpfer, dann kommt hier Leben rein.</div>'}
 ${bar}${lists}${deadL.length?`<h3 class="hf-gh"><span>✝</span> Gefallen <small>${deadL.length}</small></h3><div class="hf-dogs">${deadL.map(card).join('')}</div>`:''}
 <div class="buttons" style="margin-top:12px"><button class="btn" data-action="nav:beastrium">▲ Treppe hinauf · Beastrium</button><button class="btn" data-action="nav:hundefang">🐕 Aufträge</button></div></section>`;}
function zwCageDogs(){const s=st();return zwSorted(s.dogs.filter(D=>!D.dead).map(D=>({D,I:zwInfo(D)||{kw:DOG.kw(D),sk:1}}))).filter(x=>!zwCls||x.I.sk===zwCls).map(x=>x.D);}
function mount(){rabiesFace($('hfCartFace'));rabiesLive('hfBoardFace',usedToday()?'confident':'grin');
 const s=st(),j=s.jobs[selJob];document.querySelectorAll('canvas[data-hfface]').forEach(cv=>{const g=S.roster.find(x=>x.id===cv.dataset.hfface);if(!g)return;if(cv.closest('.hf-lock')){face(cv,g,g.id===team.bait?'terror':'nervous');return;}const v=j?verdictOf(g,j).i:2;face(cv,g,['confident','determined','calm','nervous','scared','terror'][v+1]||'calm');});
 rabiesFace($('hfLockFace'),'grin');
 document.querySelectorAll('canvas[data-hfdog]').forEach(cv=>{const D=s.dogs.find(x=>x.id===cv.dataset.hfdog);if(!D)return;const c=cv.getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle='#120d0a';c.fillRect(0,0,128,80);DOG.portrait(c,D,{x:64,y:72,w:100,mood:'focus',face:1,t:1});});
 if(document.querySelector('canvas.hf-cage')){const alive=zwCageDogs();ZW.setDogs(alive.slice(zwPage*3,zwPage*3+3));}}
const prevPage=M.schoolPage;
M.schoolPage=function(p){
 if(p==='hundefang'&&st().stage==='open'){daily();setTimeout(mount,0);return boardPage();}
 if(p==='zwinger'&&st().stage==='open'){daily();setTimeout(mount,0);return zwingerPage();}
 const html=prevPage?prevPage.apply(this,arguments):undefined;
 if(p==='beastrium'&&!st().stage&&chainDone()&&typeof html==='string'){setTimeout(mount,0);return teaser()+html;}
 if(p==='beastrium'&&st().stage==='open'&&typeof html==='string'){daily();setTimeout(mount,0);// Reiter „Hund“ im Beastrium: offen, Zahl der Hunde, führt die Treppe hinab in den Zwinger
  const n=st().dogs.filter(D=>!D.dead).length;return cartPanel()+html.replace(/(<button role="tab" class="[^"]*?) locked(" data-action="hs:species:hund"[^>]*>[\s\S]*?)<small>🔒<\/small>/,'$1$2<small>'+n+' ▼</small>');}
 return html;};
const prevClick=M.schoolClick;
M.schoolClick=function(action){if(action==='hs:species:hund'&&st().stage==='open'){M.ui.click('nav:zwinger');return true;}if(!action.startsWith('hf:'))return prevClick?prevClick.apply(this,arguments):false;const [,k,v]=action.split(':');const s=st();
 if(k==='intro')introFilm(false);
 else if(k==='intro1'){if(!st().stage)introFilm(true);}
 else if(k==='job'){selJob=+v;M.ui.render();}
 else if(k==='pick'){const g=byId(v);if(!g)return true;if(team.men.includes(v)){team.men=team.men.filter(x=>x!==v);M.ui.render();}else if(v===team.bait)M.ui.notify?.('Der ist schon der Lockvogel. Bewaffnen wäre Verschwendung.');else if(!fit(g))M.ui.notify?.('Nicht einsatzbereit. Ein paar Tage Ruhe helfen. Oder als Lockvogel.');else{if(team.men.length>=2)team.men.shift();team.men.push(v);M.ui.render();}}
 else if(k==='bait'){const g=byId(v);if(!g)return true;if(team.men.includes(v))team.men=team.men.filter(x=>x!==v);team.bait=v;const bv=baitScore(g);team.quip=Math.random()<.65?baitQuip(bv,1+Math.floor(Math.random()*9)):fill(pick(TX_LOCK.pick),g);M.ui.render();}
 else if(k==='equip'){equipTeam(false);M.ui.render();}
 else if(k==='go'){const j=s.jobs[selJob];cleanTeam();if(!j||j.done||usedToday()||!teamOk()||S.battle)return true;if(autoEq())equipTeam(true);goTeam={bait:team.bait,men:[...team.men]};const lead=byId(team.men[0])||byId(team.bait);sighting(j,lead);}
 else if(k==='zw'){zwPage+=+v;M.ui.render();}
 else if(k==='zwcls'){zwCls=+v||0;zwPage=0;M.ui.render();}
 else if(k==='zwsort'){zwSort=v;zwPage=0;M.ui.render();}
 else if(k==='sell'){const key=action.slice(8);if(sellArm===key){sellArm='';sell(key);}else sellArm=key;M.ui.render();}
 return true;};

// =====================================================================================================
// KAPITEL · Vorstellung am Ende der bisherigen Geschichte: nach dem Schuldeneintreiber (Außenwelt-Quest erledigt,
// S.outside.stage==='done'); ohne Außenwelt-Modul nach dem Bogner. Ausgelöst im Ludus, sobald dort nichts anderes läuft
// (nur sichtbare Szenen/Fenster zählen, liegengebliebene unsichtbare Reste blockieren nicht). Prüfung alle 1,5 s,
// unabhängig vom Ludus-Takt. Zur Sicherheit zusätzlich: Karren-Hinweis im Beastrium startet die Vorstellung von Hand.
// =====================================================================================================
const chainDone=()=>M.outside?S.outside?.stage==='done':S.bowyer?.stage==='done';
const visible=el=>!!el&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';
const busy=()=>F.on||!!window.ArenaUI?.isOpen?.()||[...document.querySelectorAll('#modal,.medic-film,.lion-film,.smith-ceremony,.ow-film,.lesson-start,.lesson-end,.medic-start,.lesson-guide,.lion-guide,.smith-loading,.hf-result')].some(visible)||(!!S.battle&&visible($('battleView')));
let calm=0;
setInterval(()=>{try{const s=st();if(s.stage==='open'){daily();return;}if(s.stage||!chainDone()||M.ui?.getPage?.()!=='home'||busy()||document.hidden){calm=0;return;}if(++calm>=2){calm=0;introFilm(true);}}catch(e){console.error(e);}},1500);
const prevTick=M.ludusTick;
M.ludusTick=function(dt){prevTick?.apply(this,arguments);try{if(st().stage==='open')daily();}catch(e){console.error(e);}};
// Beastrium vor der Vorstellung: der Karren steht schon da (falls die Vorstellung aus irgendeinem Grund nicht von selbst kam)
function teaser(){return `<section class="box hf-cart"><canvas id="hfCartFace" width="160" height="104"></canvas><div><p class="eyebrow">VOR DEM BEASTRIUM</p><h2>Ein stinkender Karren</h2><q class="hf-narr">Es riecht nach nassem Hund, altem Blut und schlechten Entscheidungen. Im Käfig knurrt etwas.</q><div class="buttons"><button class="btn primary" data-action="hf:intro1">Nachsehen</button></div></div></section>`;}
// LUDUS-KARTE: Rabies steht mit seinem Karren draußen auf der Wiese vor dem Südtor, rechts vom Weg (nach der Vorstellung).
// Antippen öffnet die Aufträge. Im Käfig sitzen die eigenen Hunde (die ersten zwei), sonst seine eigenen.
const rabCall={next:performance.now()+20000,until:0};const MAP={x:770,y:742,k:.26,rx:690,rk:.9};MAP.hit={x:MAP.rx-22,y:MAP.y-62,w:MAP.x+70-MAP.rx+22,h:66};let mapDogs=null,mapKey='';
function mapCart(g,t){const s=st();if(s.stage!=='open')return;const own=s.dogs.filter(D=>!D.dead).slice(0,2),key=own.map(D=>D.id).join();if(!mapDogs||mapKey!==key){mapKey=key;const list=own.length?own:[DOG.create('molosser',4711),DOG.create('bullterrier',815)];mapDogs=list.map((D,i)=>dogAct(D,i?'sit':'threat'));}
 g.save();g.translate(MAP.x,MAP.y);g.scale(MAP.k,MAP.k);const dk=2.7*.6*.95;mapDogs.forEach((d,i)=>{d.x=i?60:-90;d.y=-104;d.k=dk;d.face=i?1:-1;d.mode=i?((t%7)<4?'sit':'scratch'):((t%5)<1.2?'bars':'threat');});
 drawCart(g,0,0,t,0,mapDogs);g.restore();
 const rx=MAP.rx,ry=MAP.y;drawRabies(g,rx,ry,MAP.rk,1,t);leash(g,rx,ry,MAP.rk,1,t,false);
 if(performance.now()>rabCall.next&&M.fieldTalk?.ok?.()&&!M.fieldPaused?.()){rabCall.until=performance.now()+4000;rabCall.next=performance.now()+45000+Math.random()*30000;M.fieldTalk.mark(4000);M.speakLine?.('Hunde! Aufträge! Ich kaufe Hühner!','rabies',null,{soft:true,name:'Rabies'});}
 if(performance.now()<rabCall.until){g.save();g.font='bold 9px "Courier Prime",monospace';g.textAlign='center';const txt='Hunde! Aufträge! Ich kaufe Hühner!',w=g.measureText(txt).width+10;g.fillStyle='#f3e6c4';g.fillRect(Math.round(rx-w/2+30),ry-80,w,14);g.fillStyle='#2a1a10';g.fillText(txt,rx+30,ry-70);g.restore();}}
const prevOverlay2=M.ludusOverlay;M.ludusOverlay=(g,t)=>{prevOverlay2?.(g,t);try{mapCart(g,t);}catch(e){console.warn(e);}};
const prevHit=M.ludusHit;M.ludusHit=(x,y)=>{const h=MAP.hit;if(st().stage==='open'&&x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h){M.ui.click('nav:hundefang');return true;}return prevHit?prevHit(x,y):false;};
// Musik: Rabies' Lied, sobald er im Mittelpunkt steht (Filme, Karren/Aufträge), „Beastrium“ unten im Zwinger
M.hundefang={drawRabies,FOAM,rabies,music:()=>{const p=M.ui?.getPage?.();return F.on||p==='hundefang'?'rabies':p==='zwinger'?'beast':'';},state:st,intro:()=>introFilm(false),sighting,startFight,openBook,paintPlace,jobDog,daily,limbPart,makeParts,get fight(){return fight;},F};
window.HUNDEFANG_READY=true;
})();
