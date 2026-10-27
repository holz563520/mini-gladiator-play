'use strict';
// =====================================================================================================
// HUNDERENNEN · neue Turnierart für Hunde (Arena → BEAST → Hund → Hunderennen)
// · 8 Hunde je Rennen: der eigene Hund + 7 Gegner. Stufen 1–5 Totenköpfe (Feld, Strecke und Prämie wachsen).
// · Ein Rennen pro Tag (S.hunderennen.usedDay). Täglich je Stufe ein neues Feld (aus Rasse und Samen reproduzierbar).
// · Rennen: Höchsttempo aus Schnelligkeit, Durchhalten aus Ausdauer, Gesundheit zählt; dazu Tagesform, Start,
//   kurze Schübe und selten ein Stolperer. Ein passender Hund gewinnt in seiner Stufe etwa jedes dritte Rennen.
// · Lernen: Schnelligkeit und Ausdauer rücken je Rennen 4 % der Lücke zum Sollwert heran (Sieg 7 %).
// · Speicherwert: S.hunderennen = {day, usedDay, offers:[{skulls,dist,field:[{breed,seed,train,name}]}], races, wins, last}
// Entfernen: 'hunderennen' aus boot.js streichen; arena-ui.js fällt dann von selbst auf die Hundekämpfe zurück.
// =====================================================================================================
(()=>{
const G=typeof window!=='undefined'?window:globalThis,DOG=G.DOG;if(!DOG)return;
const cl=(v,a,b)=>Math.min(b,Math.max(a,v));
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const gauss=r=>{let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};

// ---------------------------------------------------------------- Ligen (fest, unabhängig vom eigenen Hund)
// Rennwert RW = 0,72·Schnelligkeit + 0,28·Ausdauer (Istwerte). Jede Liga hat ein festes Gegnerfeld im Bereich fieldLo … fieldHi,
// täglich neu gewürfelt (etwas Streuung). Liga 1: ein untrainierter Windhund hat eine Chance, ein untrainierter Molosser nicht.
// Liga 5: nur voll trainierte Spitzenwindhunde. Ein Hund darf in jeder Liga starten.
const TIERS=[
 {skulls:1,name:'Feldweg-Rennen',dist:200,prize:[60,25,10],fieldLo:49,fieldHi:57},
 {skulls:2,name:'Dorfrennen',dist:250,prize:[120,50,20],fieldLo:56,fieldHi:64},
 {skulls:3,name:'Rennen am Forum',dist:300,prize:[220,90,40],fieldLo:63,fieldHi:71},
 {skulls:4,name:'Großes Rennen',dist:350,prize:[400,160,70],fieldLo:70,fieldHi:78},
 {skulls:5,name:'Circus Maximus',dist:400,prize:[700,280,120],fieldLo:77,fieldHi:86}];
const RW=s=>.72*s.tempo+.28*s.ausdauer;
// Liga, deren Feld am besten zum Hund passt (nur Anzeige)
const classOf=D=>{const v=RW(D.stats);let k=0;for(let i=0;i<TIERS.length;i++)if(v>=TIERS[i].fieldLo+3)k=i;return k+1;};
const NAMES=['Pfeil','Blitz','Hermes','Sagitta','Volucer','Celer','Ventus','Aura','Fulgur','Rapax','Comet','Nimbus','Furor','Tempestas','Zephyr','Boreas','Notus','Iris','Arion','Pegasus','Nike','Atalanta','Turbo','Vortex','Lepus','Cursor','Velox','Ales','Saltus','Strix'];

// Ein Gegnerhund: Rasse und Samen, dazu Trainingsstand (rückt Ist von Schnelligkeit und Ausdauer zum Soll)
function opponent(e){const D=DOG.create(e.breed,e.seed);for(const k of ['tempo','ausdauer'])D.stats[k]=Math.round(D.stats[k]+(D.caps[k]-D.stats[k])*e.train);if(e.name)D.name=e.name;D.npc=true;return D;}
// Feld: 7 Gegner, deren Rennwert im Gegnerbereich der Klasse liegt (Rasse und Trainingsstand zufällig, passend gesucht)
function makeField(k,seed){const r=mulberry(seed),T=TIERS[k],field=[],ids=DOG.BREEDS.map(B=>B.id);
 for(let i=0;i<7;i++){let e=null;
  for(let n=0;n<400&&!e;n++){const c={breed:ids[Math.floor(r()*ids.length)],seed:Math.floor(r()*4294967296)>>>0,train:Math.round(r()*100)/100};
   if(field.filter(f=>f.breed===c.breed).length>=2)continue;const v=RW(opponent(c).stats);if(v>=T.fieldLo&&v<T.fieldHi)e=c;}
  if(!e)e={breed:'greyhound',seed:Math.floor(r()*4294967296)>>>0,train:.5};
  let nm;do nm=NAMES[Math.floor(r()*NAMES.length)];while(field.some(f=>f.name===nm));e.name=nm;field.push(e);}
 return {skulls:k+1,dist:T.dist,seed,field};}

// ---------------------------------------------------------------- Rennrechnung
// Liefert für jeden Läufer die Strecke je Bild (30 Bilder je Sekunde) bis alle im Ziel sind, Platz und Zeit.
const FPS=30,FORM_SD=+(G.RACE_SD||.07),WIND=+(G.RACE_WIND||.008);
function runner(D,health=100){const s=D.stats,h=cl(health/100,.3,1);
 return {vmax:(7+s.tempo*.12)*(.72+.28*h),acc:1.15+s.tempo/110,s0:60+s.ausdauer*3,tire:.0012*(1-s.ausdauer/140)};}
function simulate(dogs,dist,seed){const r=mulberry(seed),dt=1/FPS;
 const L=dogs.map(x=>{const R=runner(x.D,x.health);return {...R,form:1+gauss(r)*FORM_SD,react:.05+r()*.35,ph:[r()*6.3,r()*6.3,r()*6.3],fq:[.7+r()*.6,1.6+r()*.8,3+r()*1.5],
  stumble:r()<.08?{at:dist*(.15+r()*.7),len:.45+r()*.4}:null,s:0,v:0,t:null,trace:[],
  // versteckt: Laufstil (+ = Schlussspurtler, − = Frühstarter) und 3–5 Antritte oder Durchhänger je Rennen
  kick:gauss(r)*0.07,surge:Array.from({length:3+Math.floor(r()*3)},()=>({at:.08+r()*.88,len:1+r()*1.8,amp:(r()<.62?1:-.75)*(0.06+r()*0.06)}))};});
 let t=0,end=null;
 while(t<120&&(end==null||t<end)){t+=dt;if(end==null&&L.every(l=>l.t!=null))end=t+3;
  const front=Math.max(...L.filter(l=>l.t==null).map(l=>l.s),0);// Windschatten: die Spitze läuft im Wind, Verfolger holen etwas auf
  for(const l of L){if(l.t!=null){l.s+=l.v*dt;l.v*=.97;l.trace.push(l.s);continue;}
   if(t<l.react){l.trace.push(0);continue;}
   const n=.026*Math.sin(t*l.fq[0]+l.ph[0])+.014*Math.sin(t*l.fq[1]+l.ph[1])+.008*Math.sin(t*l.fq[2]+l.ph[2]);
   const q=l.s/dist,fat=1-Math.max(0,l.s-l.s0)*l.tire;let sg=0;for(const u of l.surge){const ts=u.t0??(q>=u.at?(u.t0=t):null);if(ts!=null&&t-ts<u.len){const x=(t-ts)/u.len;sg+=u.amp*Math.sin(Math.PI*x)**2;}}
   const gap=front-l.s,draft=gap<.5?-.022:Math.min(.07,gap*(WIND||.006));
   let goal=l.vmax*l.form*(1+n+sg+draft+l.kick*(q-.5)*2)*cl(fat,.55,1);
   if(l.stumble&&l.s>=l.stumble.at&&!l.stumble.done){l.stumble.t0??=t;if(t-l.stumble.t0<l.stumble.len)goal*=.25;else l.stumble.done=true;}
   l.v+=(goal-l.v)*Math.min(1,dt*l.acc);const s1=l.s+l.v*dt;
   if(s1>=dist&&l.t==null)l.t=t-dt+(dist-l.s)/Math.max(.1,l.v);
   l.s=s1;l.trace.push(l.s);}}
 const order=L.map((l,i)=>i).sort((a,b)=>(L[a].t??999)-(L[b].t??999));const place=[];order.forEach((i,p)=>place[i]=p+1);
 return {dist,frames:Math.max(...L.map(l=>l.trace.length)),lanes:L.map((l,i)=>({trace:l.trace,time:l.t,place:place[i],stumble:l.stumble&&l.stumble.t0!=null?{t0:l.stumble.t0,len:l.stumble.len}:null,form:l.form,react:l.react})),order};}

const API={TIERS,RW,classOf,makeField,opponent,simulate,runner,FPS};
G.DogRace=API;

// =====================================================================================================
// IM SPIEL · Bildschirme in der Arena (ArenaUI.screens): „dogkinds“ (Kämpfe | Rennen), „race“ (Rennbahn), „raceresult“
// =====================================================================================================
const M=G.MG,U=G.ArenaUI,C=G.ArenaCareer;if(!M||!U?.api||!C||G.ARENA_NEU_TEST)return;
const S=()=>M.s,A=U.api,esc=A.esc,$q=s=>A.view.querySelector(s);
const st=()=>{const s=(S().hunderennen??={day:-1,usedDay:-1,offers:[],races:0,wins:0,gold:0,last:null});
 if(s.day!==S().day||s.offers.length!==TIERS.length){s.day=S().day;s.offers=TIERS.map((T,k)=>makeField(k,(Math.random()*4294967296)>>>0));}return s;};
const ranToday=()=>st().usedDay===S().day;
const lanista=()=>String(S().lanista?.name||'Lanista').split(' ')[0];
const dogs=()=>(C.dogs||[]).filter(D=>!D.dead);
const healthOf=D=>Math.round(DOG.condHealth(D));
const sk=n=>'☠'.repeat(n);
const R={sel:null,odds:{},oddsKey:''};// Auswahl auf der Rennbahn
const JACKET=[['#c8302a','#fff'],['#2a55b8','#fff'],['#efe9da','#1a1a1a'],['#1d1d1d','#fff'],['#e2781e','#1a1a1a'],['stripe','#e6c23a'],['#2e8a3e','#fff'],['#e6c23a','#1a1a1a']];
const N=['dog','race'];

// ---------- Ton (WebAudio über das Hunde-Lautpaket, wenn vorhanden) ----------
const sndOn=()=>S().options?.sound!==false&&!document.hidden;
const SFX={crowd:null,
 ctx(){const AU=DOG.audio;if(!AU?.ac)return null;try{const a=AU.ac();return a?{a,B:AU.bus(a),AU}:null;}catch{return null;}},
 tone(f0,f1,dur,g,type='sawtooth',delay=0){const x=this.ctx();if(!x||!sndOn())return;const {a,B}=x,t0=a.currentTime+.01+delay,o=a.createOscillator(),e=a.createGain(),f=a.createBiquadFilter();o.type=type;o.frequency.setValueAtTime(f0,t0);o.frequency.exponentialRampToValueAtTime(f1,t0+dur);f.type='lowpass';f.frequency.value=2400;e.gain.setValueAtTime(.0001,t0);e.gain.exponentialRampToValueAtTime(g,t0+.02);e.gain.setValueAtTime(g,t0+dur*.7);e.gain.exponentialRampToValueAtTime(.0001,t0+dur);o.connect(f).connect(e).connect(B.dry);e.connect(B.rev);o.start(t0);o.stop(t0+dur+.05);},
 noise(dur,freq,g,q=.7,delay=0){const x=this.ctx();if(!x||!sndOn())return;const {a,B,AU}=x,t0=a.currentTime+.01+delay,s=a.createBufferSource();s.buffer=AU.noiseBuf(a,dur);const f=a.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=q;const e=a.createGain();e.gain.setValueAtTime(.0001,t0);e.gain.exponentialRampToValueAtTime(g,t0+Math.min(.08,dur*.2));e.gain.exponentialRampToValueAtTime(.0001,t0+dur);s.connect(f).connect(e).connect(B.dry);e.connect(B.rev);s.start(t0);},
 fanfare(){[[392,0],[523,.18],[659,.36],[784,.54],[659,.86],[784,1.02]].forEach(([f,d],i)=>this.tone(f,f*1.01,i===5?.7:.2,.13,'sawtooth',d));},
 gate(){this.noise(.18,900,.5,1.2);this.noise(.25,300,.4,.8,.03);},
 beep(hi){this.tone(hi?880:440,hi?880:440,hi?.5:.16,.12,'square');},
 roar(g=.25,dur=2.4){this.noise(dur,700,g,.5);this.noise(dur*.8,1600,g*.5,.6,.1);},
 thump(){this.noise(.06,180,.18,1.5);},
 crowdStart(){const x=this.ctx();if(!x||!sndOn()||this.crowd)return;const {a,B,AU}=x,s=a.createBufferSource();s.buffer=AU.noiseBuf(a,2);s.loop=true;const f=a.createBiquadFilter();f.type='bandpass';f.frequency.value=900;f.Q.value=.6;const e=a.createGain();e.gain.value=.0001;s.connect(f).connect(e).connect(B.dry);e.connect(B.rev);s.start();this.crowd={s,e,a};},
 crowdLevel(v){const c=this.crowd;if(!c)return;try{c.e.gain.setTargetAtTime(Math.max(.0001,v),c.a.currentTime,.3);}catch{}},
 // Laufgeräusche: Pfotengetrommel der Meute (Viertakt-Galopp mehrerer Hunde), Hecheln, Fahrtwind – je eine vorgerechnete Schleife
 runBufs(a){if(this._rb&&this._rb.sr===a.sampleRate)return this._rb;const sr=a.sampleRate,len=Math.floor(sr*2),paws=new Float32Array(len),pant=new Float32Array(len),wind=new Float32Array(len);let seed=7;const rn=()=>(seed=(seed*16807)%2147483647)/2147483647;
  for(let dog=0;dog<5;dog++){const P=.25+rn()*.06,ph=rn()*P,amp=.5+rn()*.5,f=62+rn()*40;for(let st=ph;st<2;st+=P)for(const [o,g] of [[0,1],[.045,.75],[.12,.9],[.16,.7]]){const t0=Math.floor((st+o+(rn()-.5)*.008)*sr);let lp=0;
    for(let i=0;i<sr*.07&&t0+i<len;i++){const tt=i/sr,env=Math.exp(-tt*55),n=rn()*2-1;lp+=(n-lp)*.18;paws[t0+i]+=(Math.sin(2*Math.PI*f*tt)*.6+lp*1.6)*env*g*amp*.35;}}}
  {const P=.27;for(let st=0;st<2;st+=P){const t0=Math.floor(st*sr);let b1=0,b2=0;for(let i=0;i<sr*.11&&t0+i<len;i++){const tt=i/sr,env=Math.sin(Math.PI*tt/.11)**2,n=rn()*2-1;b1+=(n-b1)*.5;b2+=(b1-b2)*.5;pant[t0+i]+=(b1-b2)*env*.5;}}}
  {let lp=0;for(let i=0;i<len;i++){const n=rn()*2-1;lp+=(n-lp)*.08;wind[i]=(n-lp)*.25*(1+.3*Math.sin(i/sr*2.1));}}
  for(const b of [paws,pant,wind]){const x=Math.floor(sr*.05);for(let i=0;i<x;i++){const f=i/x;b[i]=b[i]*f+b[len-x+i]*(1-f);}}
  const mkB=d=>{const B=a.createBuffer(1,len,sr);B.getChannelData(0).set(d);return B;};return this._rb={sr,paws:mkB(paws),pant:mkB(pant),wind:mkB(wind)};},
 runStart(){const x=this.ctx();if(!x||!sndOn()||this.run)return;const {a,B}=x,bf=this.runBufs(a),mk1=(buf,g0)=>{const s=a.createBufferSource();s.buffer=buf;s.loop=true;const g=a.createGain();g.gain.value=g0;s.connect(g).connect(B.dry);s.start();return {s,g};};
  const wf=a.createBiquadFilter();wf.type='highpass';wf.frequency.value=700;const w=mk1(bf.wind,.0001);w.g.disconnect();w.g.connect(wf).connect(B.dry);
  this.run={a,paws:mk1(bf.paws,.0001),pant:mk1(bf.pant,.0001),wind:w};},
 runSet(v,near){const R=this.run;if(!R)return;const k=Math.min(1,v/16),t=R.a.currentTime;try{R.paws.s.playbackRate.setTargetAtTime(.75+.45*k,t,.15);R.paws.g.gain.setTargetAtTime(Math.max(.0001,.55*k),t,.15);R.pant.s.playbackRate.setTargetAtTime(.8+.4*k,t,.2);R.pant.g.gain.setTargetAtTime(Math.max(.0001,.22*near),t,.2);R.wind.g.gain.setTargetAtTime(Math.max(.0001,.3*k*k),t,.25);}catch{}},
 runStop(){const R=this.run;if(!R)return;this.run=null;const t=R.a.currentTime;for(const n of [R.paws,R.pant,R.wind]){try{n.g.gain.setTargetAtTime(.0001,t,.3);setTimeout(()=>{try{n.s.stop();}catch{}},1500);}catch{}}},
 // Klatschen: 4 s vorgerechnet (30 Klatscher mit eigenem Takt), Jubel = Rauschen + Klatschen, „Ooh“ = Vokalfilter
 clapBuf(a){if(this._cb&&this._cb.sampleRate===a.sampleRate)return this._cb;const sr=a.sampleRate,len=Math.floor(sr*4),d=new Float32Array(len);let sd=11;const rn=()=>(sd=(sd*16807)%2147483647)/2147483647;
  for(let k=0;k<30;k++){const P=.2+rn()*.12,amp=.3+rn()*.7;for(let st=rn()*P;st<4;st+=P*(.9+rn()*.2)){const t0=Math.floor(st*sr);let hp=0,pr=0;for(let i=0;i<sr*.012&&t0+i<len;i++){const n=rn()*2-1;hp=n-pr;pr=n;d[t0+i]+=hp*Math.exp(-i/sr*420)*amp*.18;}}}
  const B=a.createBuffer(1,len,sr);B.getChannelData(0).set(d);return this._cb=B;},
 applause(g=.5,dur=3){const x=this.ctx();if(!x||!sndOn())return;const {a,B}=x,s=a.createBufferSource();s.buffer=this.clapBuf(a);s.playbackRate.value=.92+Math.random()*.16;const e=a.createGain(),t0=a.currentTime+.02;e.gain.setValueAtTime(.0001,t0);e.gain.exponentialRampToValueAtTime(g*.55,t0+.35);e.gain.setValueAtTime(g*.55,t0+Math.max(.4,dur-1.2));e.gain.exponentialRampToValueAtTime(.0001,t0+dur);s.connect(e).connect(B.dry);e.connect(B.rev);s.start(t0,Math.random()*1.5);s.stop(t0+dur+.1);},
 cheer(g=.5){const now=performance.now();if(now-(this._ch||0)<1100)return;this._ch=now;this.roar(.18*g+.08,1.6+g);this.applause(.35+.4*g,1.8+g*1.5);},
 ooh(g=.5){const x=this.ctx();if(!x||!sndOn())return;const {a,B,AU}=x,t0=a.currentTime+.02,s=a.createBufferSource();s.buffer=AU.noiseBuf(a,1.6);const f1=a.createBiquadFilter(),f2=a.createBiquadFilter(),e=a.createGain();f1.type=f2.type='bandpass';f1.frequency.setValueAtTime(420,t0);f1.frequency.linearRampToValueAtTime(330,t0+1.4);f1.Q.value=6;f2.frequency.value=820;f2.Q.value=8;
  e.gain.setValueAtTime(.0001,t0);e.gain.exponentialRampToValueAtTime(g*.9,t0+.25);e.gain.exponentialRampToValueAtTime(.0001,t0+1.5);s.connect(f1).connect(e);s.connect(f2).connect(e);e.connect(B.dry);e.connect(B.rev);s.start(t0);s.stop(t0+1.6);},
 bark(D,vol=.4){if(!sndOn())return;try{DOG.audio?.playFor?.('bark',D,vol);}catch{}},
 crowdStop(){const c=this.crowd;if(!c)return;this.crowd=null;try{c.e.gain.setTargetAtTime(.0001,c.a.currentTime,.4);setTimeout(()=>{try{c.s.stop();}catch{}},1500);}catch{}}};

// ---------- Hund als Zeichenfigur ----------
function actor(D,mode='stand'){return {dog:D,P:DOG.params(D),id:'hr'+Math.random().toString(36).slice(2),g:{dead:false,name:D.name},team:0,mode,clock:1,duration:1,cyc:Math.random(),moveSpeed:0,wounds:[],gore:{},bleed:{},mouthBlood:0,energy:100,hit:0,z:0,spray:[],a:0,down:false,raceStretch:1};}
// Startdecke mit Nummer auf dem Rücken (Farben wie bei Windhundrennen)
function jacket(c,d,x,y,k,num,t){let Rg;try{Rg=DOG.rig(d,t);}catch{return;}const sz=d.P.sz,L=Rg.L,P=(bx,by)=>{const q=Rg.body(bx,by);return [x+k*sz*q.x,y+k*sz*q.y];};
 const pts=[P(L*.2,-5.2),P(L*.8,-5.4),P(L*.76,2.4),P(L*.24,2.6)],[bg,fg]=JACKET[num-1];
 c.save();c.beginPath();pts.forEach(([a,b],i)=>i?c.lineTo(a,b):c.moveTo(a,b));c.closePath();
 if(bg==='stripe'){c.fillStyle='#1d1d1d';c.fill();c.clip();c.fillStyle='#efe9da';const [x0,y0]=pts[0];for(let i=-4;i<8;i++)c.fillRect(x0+i*4*k*sz,y0-10,2*k*sz,40);}else{c.fillStyle=bg;c.fill();}
 c.restore();c.strokeStyle='#0006';c.lineWidth=1;c.beginPath();pts.forEach(([a,b],i)=>i?c.lineTo(a,b):c.moveTo(a,b));c.closePath();c.stroke();
 const cx=(pts[0][0]+pts[1][0]+pts[2][0]+pts[3][0])/4,cy=(pts[0][1]+pts[1][1]+pts[2][1]+pts[3][1])/4;
 c.fillStyle=bg==='stripe'?'#e6c23a':fg;c.font=`bold ${Math.max(7,Math.round(9*k*1.9))}px "Courier Prime",monospace`;c.textAlign='center';c.textBaseline='middle';c.fillText(String(num),cx,cy+.5);}

// ---------- Kulisse (vorgezeichnet, wird gekachelt verschoben) ----------
const W=400,H=300;
function hash(n){n=(n^61)^(n>>>16);n=n+(n<<3);n^=n>>>4;n=Math.imul(n,0x27d4eb2d);n^=n>>>15;return(n>>>0)/4294967296;}
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
let TILES=null;
function tiles(){if(TILES)return TILES;TILES={};
 // Ränge mit Publikum (3 Haltungen fürs Jubeln)
 TILES.stands=[0,1,2].map(pose=>{const cv=mk(320,84),c=cv.getContext('2d');c.fillStyle='#8a6a4a';c.fillRect(0,0,320,84);
  for(let r=0;r<9;r++){const y=4+r*8;c.fillStyle=r%2?'#a3815c':'#977452';c.fillRect(0,y+6,320,2);
   for(let x=0;x<320;x+=4){const h=hash(x*31+r*977);if(h<.08)continue;const tone=['#e8d0b0','#d6a77a','#a8744a','#6e4a2e','#f2e2c6'][Math.floor(h*5)],cloth=['#b23a2a','#e8e0cc','#3a5a8a','#c8a040','#5a7a3a','#7a3a6a','#d8d0b8'][Math.floor(hash(x*7+r*13)*7)];
    const up=pose&&hash(x*3+r*5+pose)<.35?1:0;c.fillStyle=cloth;c.fillRect(x,y+2,3,4);c.fillStyle=tone;c.fillRect(x+1,y-up,2,2);if(up){c.fillRect(x+(hash(x+r)<.5?0:2),y-3,1,2);}}}
  // Transparente der Zuschauer
  const signs=[['MAMA, ICH BIN IM CIRCUS',30],['WO IST MEIN HUND?',150],['GEBT IHM DEN HASEN!',226]];c.font='bold 7px "Courier Prime",monospace';c.textBaseline='middle';
  for(const [txt,sx0] of signs){const w=c.measureText(txt).width+6,y=44+((sx0/10)%3)*8;c.fillStyle='#ece4d0';c.fillRect(sx0,y,w,9);c.fillStyle='#5a3a1c';c.fillRect(sx0,y+9,1,4);c.fillRect(sx0+w-1,y+9,1,4);c.fillStyle='#9a2a1e';c.fillText(txt,sx0+3,y+5);}
  // Arkaden unten
  c.fillStyle='#6e5238';c.fillRect(0,76,320,8);for(let x=6;x<320;x+=26){c.fillStyle='#3a2a1c';c.fillRect(x,78,14,6);c.beginPath();c.arc(x+7,78,7,Math.PI,0);c.fill();}
  // Sonnensegel
  for(let x=0;x<320;x+=80){c.fillStyle=x%160?'#c8402e':'#e8dcc0';c.beginPath();c.moveTo(x,0);c.lineTo(x+80,0);c.lineTo(x+70,5);c.lineTo(x+10,5);c.fill();}
  return cv;});
 // Spina mit Obelisk, Säulen, Statuen, Delfinen
 {const cv=mk(520,52),c=cv.getContext('2d');c.fillStyle='#cfc2a6';c.fillRect(0,38,520,14);c.fillStyle='#b5a888';c.fillRect(0,38,520,2);c.fillRect(0,50,520,2);
  const ob=(x)=>{c.fillStyle='#d9c79a';c.beginPath();c.moveTo(x-4,38);c.lineTo(x-2,4);c.lineTo(x,0);c.lineTo(x+2,4);c.lineTo(x+4,38);c.fill();c.fillStyle='#b8a272';c.fillRect(x,6,2,32);};ob(70);ob(330);
  for(const x of [150,190,410,450]){c.fillStyle='#e8e2d2';c.fillRect(x,14,5,24);c.fillRect(x-2,12,9,3);c.fillStyle='#b8b0a0';c.fillRect(x+3,14,2,24);c.fillStyle='#c79a4a';c.fillRect(x-1,6,7,6);}
  for(const x of [240,500]){c.fillStyle='#8a7a5a';c.fillRect(x-14,28,28,10);c.fillStyle='#c7b48a';for(let i=0;i<5;i++){c.fillRect(x-12+i*6,18-(i%2)*2,4,10);}}
  c.fillStyle='#3c6a8a';c.fillRect(0,36,520,2);TILES.spina=cv;}
 // Bande mit Werbung
 {const ads=[['SPQR','#9a2a1e','#ece4d0'],['LUDUS SUCHT REKRUTEN · BILLIG · ERSETZBAR','#1c1c1c','#dfb66d'],['MEDICUS FLAVIUS · AMPUTATION AB 2 SESTERZEN','#2a3a6a','#ece4d0'],
   ['GARUM · JETZT MIT 20 % MEHR FISCH','#c8a040','#2a1a10'],['BESTATTUNGEN CHARON · ZWEI ZUM PREIS VON EINEM','#3a2a3a','#d8c8e0'],['WETTBÜRO CRASSUS · DIE BANK GEWINNT, DER HUND STIRBT','#6a1a1a','#ffe1a0'],
   ['PANEM ET CIRCENSES · BROT IST AUS','#2a3a6a','#ece4d0'],['HUNDEFUTTER „GLADIUS“ · AUS DEN RESTEN VON GESTERN','#5a3a1c','#ece4d0'],['SKLAVENMARKT · JETZT MIT ZÄHNEN','#1c1c1c','#ece4d0'],
   ['VINUM FALERNUM · DAMIT DU DAS RENNEN VERGISST','#6a1a3a','#ece4d0'],['RABIES FÄNGT HUNDE · FINGER NICHT GARANTIERT','#3a4a2a','#e8dcc0']];
  const tmp=mk(10,10).getContext('2d');tmp.font='bold 9px "Courier Prime",monospace';const ws=ads.map(([t])=>tmp.measureText(t).width+12),total=ws.reduce((a,b)=>a+b+22,6);
  const cv=mk(Math.ceil(total),14),c=cv.getContext('2d');c.fillStyle='#ece4d0';c.fillRect(0,0,cv.width,14);c.fillStyle='#9a2a1e';c.fillRect(0,0,cv.width,2);c.fillRect(0,12,cv.width,2);
  let x=6;ads.forEach(([txt,bg,fg],i)=>{c.font='bold 9px "Courier Prime",monospace';const w=ws[i];c.fillStyle=bg;c.fillRect(x,3,w,8);c.fillStyle=fg;c.textBaseline='middle';c.fillText(txt,x+6,7.5);x+=w+22;});TILES.wall=cv;}
 // Sand mit Spuren
 {const cv=mk(256,150),c=cv.getContext('2d');c.fillStyle='#c9a26a';c.fillRect(0,0,256,150);for(let i=0;i<900;i++){const x=hash(i*3)*256,y=hash(i*7+1)*150,h=hash(i*11);c.fillStyle=h<.4?'#b8915c':h<.75?'#d6b27c':'#a8814e';c.fillRect(Math.floor(x),Math.floor(y),h<.9?1:2,1);}
  for(let i=0;i<40;i++){const x=hash(i*91)*256,y=hash(i*17)*150;c.fillStyle='#b088547a';c.fillRect(Math.floor(x),Math.floor(y),6+Math.floor(hash(i)*10),1);}TILES.sand=cv;}
 return TILES;}
function tileX(c,img,off,y,w=W){const iw=img.width,o=((off%iw)+iw)%iw;for(let x=-o;x<w;x+=iw)c.drawImage(img,Math.round(x),y);}

// ---------- Steckbriefe der Gegner: Schule, Lanista, Rennen, Siege, Bestzeit (aus dem Samen, immer gleich) ----------
// [Name, Lanista, „aus …“]
const SCHOOLS=[['Ludus Avaritia','Gnaeus Geizhals','dem Ludus Avaritia'],['Haus der Blutigen Pfote','Lucretia, Witwe zum dritten Mal','dem Haus der Blutigen Pfote'],['Ludus Magnus Minor','Marcus Raffzahn','dem Ludus Magnus Minor'],['Schule am Schlachthof','Titus Knochenzins','der Schule am Schlachthof'],
 ['Ludus Felix','Crassus der Jüngere','dem Ludus Felix'],['Zwinger zum Fröhlichen Pfand','Publius Pfandleiher','dem Zwinger zum Fröhlichen Pfand'],['Ludus Mortis','Aulus Ohnegnade','dem Ludus Mortis'],['Hundeschule Cerberus','Septimia Sparsam','der Hundeschule Cerberus'],['Ludus Capuanus','Quintus Kaltherz','dem Ludus Capuanus'],['Haus des Gierigen Gaius','Gaius Habenwill','dem Haus des Gierigen Gaius']];
const LANI=['Sein Lanista füttert ihn nur nach Siegen. Er sieht entsprechend hungrig aus.',
 'Lanista {l} hat ihn gegen zwei Rekruten getauscht. Die Rekruten haben das schlechtere Geschäft gemacht.',
 'Nach der letzten Niederlage hat {l} nicht den Hund verkauft, sondern den Trainer. An den Hund.',
 '{l} sagt, der Hund sei unbezahlbar. Verpfändet hat er ihn trotzdem schon dreimal.',
 '{l} wettet sicherheitshalber gegen den eigenen Hund. So gewinnt er immer irgendwas.',
 'Der Hund bekommt mehr Fleisch als die Gladiatoren von {l}. Die Gladiatoren haben sich beschwert. Einmal.',
 '{l} zahlt seinen Pflegern keinen Lohn, sondern Fell. Vom letzten Hund, der verloren hat.',
 'Wenn er verliert, wird {l} ihn nicht schlagen. Er wird ihn verkaufen. An die Wurstbude am Ausgang.'];
const OWN_JOKES=['Lanista {l} hat das Preisgeld schon ausgegeben. Zweimal.','Lanista {l} sitzt in der Loge und rechnet. Nicht mit dem Sieg, mit den Futterkosten.','Lanista {l} hat dem Hund einen Sieg versprochen. Und dem Metzger einen Hund.','Lanista {l} hat heute Morgen seine Rekruten verkauft, um den Einsatz zu bezahlen. Sie laufen jetzt hier als Sandharker.'];
function meta(e,k,dist){const r=mulberry((e.seed^0x5bd1e995)>>>0),[school,lanista,from]=SCHOOLS[Math.floor(r()*SCHOOLS.length)],races=4+Math.floor(r()*(10+k*9)),wins=Math.max(0,Math.floor(races*(.06+r()*.3)));
 const D=opponent(e),R0=runner(D),best=(dist/(R0.vmax*.95)+.7)*(.985+r()*.02);return {school,lanista,from,races,wins,best:Math.round(best*100)/100,joke:LANI[Math.floor(r()*LANI.length)].replace(/\{l\}/g,lanista.split(',')[0])};}
const secs=v=>v.toFixed(2).replace('.',',');

// ---------- Sprecher: Zwischensprüche (schwarzer Humor) ----------
const QUIPS=['Ein Gruß an alle Lanistas auf den Rängen: Ja, die Hunde sind billiger als eure Rekruten. Und sie laufen nicht weg. Jedenfalls nicht von hier.',
 'Lanista Crassus hat soeben seinen Platz verkauft, um nachzusetzen. Er steht jetzt hinter dem Zaun. Er wirkt glücklich.',
 'Der Hase ist übrigens aus Holz. Der letzte echte wurde gefressen. Mitsamt dem Hasenführer.',
 'In Reihe drei hat einer seinen Sitzplatz verkauft. Und seine Niere. Für eine Wette auf die Vier.',
 'Ein Gruß an die Ludus-Schule von gegenüber: Eure Rekruten laufen langsamer als diese Hunde. Und kürzer.',
 'Der Medicus wartet am Ziel. Für die Hunde. Die Zuschauer müssen sich selbst verbinden.',
 'Wer verliert, landet nicht im Zwinger, sondern in der Wurst. Nur ein Gerücht. Das Gerücht schmeckt gut.',
 'Der Buchmacher lächelt. Das ist nie ein gutes Zeichen.',
 'Senator Gaius hat auf alle acht gewettet. Er versteht das Prinzip nicht. Er ist Senator.',
 'Der Sand wurde heute frisch geharkt. Was man darunter findet, geht uns nichts an.',
 'Ein Zuschauer fragt, ob die Hunde auch Gladiatoren jagen. Antwort: Nur montags.',
 'Die Hunde laufen um Ruhm. Die Besitzer um Gold. Der Hase um sein Leben – obwohl er aus Holz ist.'];

// ---------- Staub: 72 Teilchen fest, drei vorgezeichnete Wölkchen (16 × 16 Pixel) ----------
const DUST={pool:Array.from({length:72},()=>({on:0,lane:0,x:0,y:0,vx:0,vy:0,age:0,life:1,s0:4,k:0})),next:0,img:[]};
function dustImgs(){if(DUST.img.length)return;for(let v=0;v<3;v++){const cv=mk(16,16),c=cv.getContext('2d');for(let y=0;y<16;y++)for(let x=0;x<16;x++){const dx=(x-7.5)/7.5,dy=(y-8.5)/7,d=dx*dx+dy*dy+(hash(x*17+y*31+v*101)-.5)*.5;if(d<1){c.fillStyle=d<.35?'#e2c493':d<.7?'#d2b07c':'#b99462';c.fillRect(x,y,1,1);}}DUST.img.push(cv);}}

// ---------- Startboxen ----------
function box(i,x){const k=laneK(i),len=82*k,w=Math.round(len*1.2),h=Math.round(len*.82),y=laneY(i);return {x0:Math.round(x-w+4),y0:Math.round(y-h),w,h,y,k};}
let CTX=null;
function boxFront(i,x,open){const c=CTX,b=box(i,x),[bg,fg]=JACKET[i],gx=Math.round(x+2+(i-3.5)*1.6),dh=Math.round(b.h*.8),lift=Math.round(dh*open*1.1),gy=b.y-dh-lift;
 // Startgatter von der Seite: Pfosten, Tür mit Gitter (klappt beim Start nach oben), Schild mit Startnummer
 c.fillStyle='#3a2414';c.fillRect(gx+3,b.y-dh-8,2,dh+8);
 if(open<1){c.fillStyle='#8a5a30';c.fillRect(gx,gy,4,dh);c.fillStyle='#4a2e18';for(let yy=gy+2;yy<gy+dh-1;yy+=4)c.fillRect(gx,yy,4,1);}
 c.fillStyle=bg==='stripe'?'#1d1d1d':bg;c.fillRect(gx-3,b.y-dh-16,11,9);c.fillStyle=bg==='stripe'?'#e6c23a':fg;c.font='bold 8px "Courier Prime",monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(String(i+1),gx+2.5,b.y-dh-11);}

// ---------- Die Rennansicht ----------
const laneY=i=>142+i*20,laneK=i=>.56+.045*i,PXM=40;// PXM: Bildpunkte je Meter für Boden, Zaun, Fahrtwind (Gefühl für Tempo)
function startRace(o){
 const T=TIERS[o.k],sim=o.sim,dist=sim.dist,runners=o.runners;// runners: [{D,own,lane,num}]
 A.layer.innerHTML=`<div class="hr-run" role="dialog" aria-label="Hunderennen"><div class="hr-head"><span class="hr-sk">${sk(T.skulls)}</span><b>${esc(T.name.toUpperCase())}</b><span class="hr-dist" id="hrDist">${dist} m</span></div>
  <div class="hr-stage"><canvas width="${W}" height="${H}" class="px" id="hrCv"></canvas><div class="hr-mini" id="hrMini"></div><div class="hr-card-in" id="hrCard" hidden></div></div>
  <p class="hr-tick" id="hrTick">Die Hunde werden in die Startboxen geführt …</p><ol class="hr-board" id="hrBoard"></ol>
  <div class="hr-ctl"><button data-a="hrintro" id="hrIntro">Vorstellung überspringen ▸</button><button data-a="hrspeed" id="hrSpd">⏩ 1×</button><button data-a="hrsound" id="hrSnd">${S().options?.sound===false?'🔇':'🔊'}</button><button data-a="hrskip" class="primary">Zum Ergebnis ▸</button></div></div>`;
 const cv=A.layer.querySelector('#hrCv'),c=cv.getContext('2d');c.imageSmoothingEnabled=false;tiles();dustImgs();CTX=c;
 const acts=runners.map(r=>{const a=actor(r.D,'stand');a.P={...a.P};return {...r,a,s:0,v:0,done:false,emit:0};});
 DUST.pool.forEach(p=>p.on=0);
 const byLane=[...acts].sort((x,y)=>x.lane-y.lane),own=acts.find(r=>r.own);
 const V={phase:o.intro?.length?'present':'intro',pi:-1,pt:0,t:0,tau:0,speed:1,slow:1,camS:-3,zoom:12,scroll:0,streaks:[],petals:[],shake:0,flash:0,text:null,lead:null,said:new Set(),finishT:null,photo:false,ownPlace:null,end:false,boardT:0,ownPos:null};
 for(let i=0;i<46;i++)V.streaks.push({x:Math.random()*W,y:Math.random()*H,len:10+Math.random()*50,a:.15+Math.random()*.35});
 const posAt=(r,tau)=>{const tr=sim.lanes[r.i].trace,f=tau*FPS,i=Math.floor(f);if(i<0)return 0;if(i>=tr.length-1)return tr[tr.length-1];return tr[i]+(tr[i+1]-tr[i])*(f-i);};
 const say=(key,txt,force)=>{if(!force&&V.said.has(key))return;V.said.add(key);V.lastSay=V.t;const el=A.layer.querySelector('#hrTick');if(el){el.textContent=txt;el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');}};
 const nm=r=>r.D.name+(r.own?' (dein Hund)':'');
 const sx=s=>W*.62+(s-V.camS)*V.zoom;
 SFX.crowdStart();SFX.crowdLevel(.04);
 // Sprecher: liest mit Stadionhall vor; ohne Ton nur der Text. force unterbricht die laufende Zeile.
 const voiceOn=()=>sndOn()&&!!M.speakLine;
 // Immer nur eine Zeile: neue Zeilen warten in der Reihe (prio 3 = Sieger, 2 = wichtig, 1 = Kleinigkeit). Nichts wird
 // unterbrochen; Kleinigkeiten, die zu lange warten, verfallen (sonst kommentiert er Dinge, die längst vorbei sind).
 const Q=[];const speakNow=txt=>{try{return !!M.speakLine(txt,'moderator',null,{voice:'moderator',echo:.5,vol:1.12});}catch{return false;}};
 const talk=(txt,prio=1)=>{if(!voiceOn())return false;if(prio>=3)for(let i=Q.length-1;i>=0;i--)if(Q[i].prio<3)Q.splice(i,1);Q.push({txt,prio,t:V.t});pumpTalk();return true;};
 const pumpTalk=()=>{if(!voiceOn()||M.speaking?.())return;for(let i=Q.length-1;i>=0;i--){const age=V.t-Q[i].t;if(Q[i].prio===1&&age>3.5||Q[i].prio===2&&age>7)Q.splice(i,1);}
  if(!Q.length)return;Q.sort((a,b)=>b.prio-a.prio||a.t-b.t);speakNow(Q.shift().txt);};
 V.pumpTalk=pumpTalk;V.talkQ=Q;
 const showCard=x=>{const el=A.layer.querySelector('#hrCard');if(!el)return;if(!x){el.hidden=true;return;}el.hidden=false;el.innerHTML=`<i class="num j${x.num}">${x.num}</i><div><b>${esc(x.name)}</b><small>${esc(x.breed)}</small><span>${esc(x.school)}</span><em>${x.races} Rennen · ${x.wins} Siege · Bestzeit ${x.best?secs(x.best)+' s':'–'}</em></div>`;};
 const endIntro=()=>{if(V.phase!=='present')return;V.phase='intro';V.t=0;showCard(null);V.focus=null;const b=A.layer.querySelector('#hrIntro');if(b)b.hidden=true;try{M.speakStop?.();}catch{}};
 if(V.phase!=='present'){const b=A.layer.querySelector('#hrIntro');if(b)b.hidden=true;}
 let last=performance.now(),raf=0,cyc0=0;
 function step(now){raf=requestAnimationFrame(step);if(!cv.isConnected){cancelAnimationFrame(raf);SFX.crowdStop();SFX.runStop();return;}
  let dt=Math.min(.05,(now-last)/1000);last=now;dt*=V.speed;V.t+=dt;
  // Ablauf: Vorstellung der Favoriten (Sprecher) → Countdown an den Boxen → Rennen → Auslauf → Ergebnis
  if(V.phase==='present'){V.pt+=dt/V.speed;const L=o.intro,cur=L[V.pi];
   const busy=cur&&(V.pt<cur.min||(cur.spoke&&M.speaking?.()&&V.pt<14)||(!cur.spoke&&V.pt<cur.read));
   if(!busy){V.pi++;V.pt=0;const n=L[V.pi];if(!n){endIntro();}else{say('p'+V.pi,n.text,true);n.spoke=voiceOn()&&!M.speaking?.()?speakNow(n.text):false;if(n.card)SFX.applause(.35,2.2);n.min=2.2;n.read=1.6+n.text.length*.055;showCard(n.card||null);V.focus=n.card?n.card.lane:null;}}}
  else if(V.phase==='intro'){
   if(V.t<.1)say('in','Die Hunde stehen in den Startboxen. Der Hase wird gespannt …');
   const cd=[[1.4,'3'],[2.2,'2'],[3.0,'1']];for(const [tt,txt] of cd)if(V.t>=tt&&!V.said.has('c'+txt)){V.said.add('c'+txt);V.text={txt,t:V.t,big:1};SFX.beep(false);}
   if(V.t>=.3&&!V.said.has('fan')){V.said.add('fan');SFX.fanfare();}
   if(V.t>=3.8){V.phase='run';V.text={txt:'LOS!',t:V.t,big:1.3,col:'#ffe08a'};V.shake=1;SFX.gate();SFX.beep(true);SFX.roar(.3,2.6);SFX.crowdLevel(.07);say('go','Die Boxen fliegen auf! Die Meute schießt heraus!',true);talk('Und los!',2);SFX.applause(.5,3);SFX.runStart();for(const r of acts){r.a.mode='race';}}}
  else if(V.phase==='run'){const slowNow=V.slow;V.tau+=dt*slowNow;}
  const tau=V.tau;
  // Läufer
  let lead=null,maxS=-1;for(const r of acts){const pre=V.phase==='intro'||V.phase==='present',s=pre?0:posAt(r,tau),v=pre?0:Math.max(0,(posAt(r,tau+.05)-posAt(r,tau-.05))/.1);r.s=s;r.v=v;if(s>maxS){maxS=s;lead=r;}
   if(V.phase==='run'){const stride=2.4+1.8*r.a.P.sz;r.a.cyc+=v*dt*V.slow/stride;r.a.raceStretch=Math.min(1,Math.max(.25,v/13));r.a.mode=v>3.2?'race':'stand';}
   if(!r.done&&r.s>=dist){r.done=true;}}
  const ranked=[...acts].sort((a,b)=>b.s-a.s||(sim.lanes[a.i].place-sim.lanes[b.i].place));
  // Kamera: folgt dem Spitzenfeld, zoomt je nach Abstand
  const tail=ranked[Math.min(ranked.length-1,6)].s,spread=Math.max(4,maxS-tail);
  const camGoal=V.phase==='intro'||V.phase==='present'?-3:Math.min(maxS,dist+6),zoomGoal=V.phase==='intro'||V.phase==='present'?14:Math.max(5,Math.min(13,215/(spread+5)));
  V.camS+=(camGoal-V.camS)*Math.min(1,dt*V.slow*(V.phase==='intro'?2:5));V.zoom+=(zoomGoal-V.zoom)*Math.min(1,dt*1.6);
  const vCam=V.phase==='intro'||V.phase==='present'?0:Math.max(0,lead?.v||0)*(maxS>dist+4?Math.max(0,1-(maxS-dist-4)/6):1);
  V.scroll+=vCam*PXM*dt*V.slow;
  // Ereignisse für den Sprecher
  if(V.phase==='run'){
   {const top=ranked.slice(0,3).map(r=>r.i).join();if(V.top3&&top!==V.top3&&tau>1.5)SFX.cheer(.3);V.top3=top;}
   if(lead&&V.lead!==lead&&tau>1.2){if(V.lead){const tx=lead.D.name+' übernimmt die Führung!'+(lead.own?' Das ist dein Hund!':'');say('lead'+lead.i+Math.floor(tau),tx,true);if(V.t-(V.lastTalk||0)>4){talk(tx,lead.own?2:1);V.lastTalk=V.t;}SFX.cheer(lead.own?.75:.5);}V.lead=lead;}
   for(const r of acts){const sb=sim.lanes[r.i].stumble;if(sb&&tau>=sb.t0&&!V.said.has('st'+r.i)){const tx=r.D.name+' stolpert! Der Sand fliegt!'+(r.own?' Lanista '+lanista()+' greift sich ans Herz. Oder an den Geldbeutel.':'');say('st'+r.i,tx,true);talk(tx,r.own?2:1);SFX.ooh(r.own?.6:.4);}}
   const op=ranked.indexOf(own)+1;if(tau>2&&V.ownPos!==op){if(V.ownPos!=null&&op<V.ownPos)SFX.cheer(.45);if(op===1)say('own1'+Math.floor(tau/3),'Dein '+own.D.name+' liegt vorn!',true);else if(op<=3&&(V.ownPos==null||op<V.ownPos)){const tx=own.D.name+' arbeitet sich auf Platz '+op+' vor!';say('ownup'+op+Math.floor(tau/3),tx,true);talk(tx,1);}V.ownPos=op;}
   if(tau>3.5&&maxS<dist-70&&V.t-(V.lastSay||0)>4.5&&Math.random()<dt*.35){const left=QUIPS.filter(q=>!V.said.has('q'+q));if(left.length&&!M.speaking?.()&&!Q.length){const q=left[Math.floor(Math.random()*left.length)];say('q'+q,q);talk(q,1);}}
   if(maxS>dist-60&&!V.said.has('home')){say('home','Schlussgerade! Die Ränge stehen auf!',true);talk('Schlussgerade! Die Ränge stehen auf!',2);SFX.roar(.35,3);SFX.applause(.7,4);SFX.crowdLevel(.12);}
   // Zielankunft des Ersten: Zeitlupe; knappes Rennen: Fotofinish
   const w=sim.lanes[sim.order[0]],w2=sim.lanes[sim.order[1]];
   if(V.finishT==null&&maxS>dist-7){V.slow=.3;}
   if(V.finishT==null&&tau>=w.time){V.finishT=V.t;V.photo=w2.time-w.time<.12;const win=acts.find(r=>r.i===sim.order[0]);V.flash=V.photo?1:.5;V.text={txt:V.photo?'FOTOFINISH!':'ZIEL!',t:V.t,big:1.1,col:'#fff2c8'};SFX.roar(.45,3.5);SFX.crowdLevel(.16);
    {const tx=(V.photo?'Fotofinish! ':'')+win.D.name+' gewinnt'+(win.own?'! Dein Hund siegt! Lanista '+lanista()+' fällt vor Freude fast aus der Loge. Leider nur fast.':'! '+(o.meta?.[win.i]?'Lanista '+o.meta[win.i].lanista.split(',')[0]+' zählt schon das Gold.':''));say('win',tx,true);talk(tx,3);SFX.applause(1,6);SFX.cheer(1);}SFX.runSet(0,0);for(let i=0;i<60;i++)V.petals.push({x:Math.random()*W,y:-Math.random()*80,vx:-20-Math.random()*40,vy:30+Math.random()*30,r:Math.random()*6.3,c:['#c8302a','#e8dcc0','#e6c23a','#b23a5a'][i%4]});}
   if(V.finishT!=null&&V.t-V.finishT>(V.photo?1.6:1.1))V.slow=Math.min(1,V.slow+dt*1.5);
   if(own.s>=dist&&V.ownPlace==null){V.ownPlace=sim.lanes[own.i].place;if(sim.order[0]!==own.i)say('ownin',own.D.name+' kommt als '+V.ownPlace+'. ins Ziel.',true);}
   if(acts.every(r=>r.done)&&tau>sim.lanes.reduce((m,l)=>Math.max(m,l.time||0),0)+1.6&&!V.end){V.end=true;setTimeout(()=>o.done(),700);}}
  SFX.crowdLevel(V.phase==='intro'||V.phase==='present'?.04:.06+(maxS/dist)*.08);
  if(V.phase!=='present')pumpTalk();
  // Bellen: dezent, mit Pausen – an den Boxen öfter (Aufregung), im Rennen selten, nach dem Ziel ein paar Mal
  {const gap=V.phase==='run'?(V.finishT!=null?2.2:7):3.2;if(V.t>=(V.barkAt??=1.5)){V.barkAt=V.t+gap*(.7+Math.random()*.8);const r=acts[Math.floor(Math.random()*acts.length)];SFX.bark(r.D,V.phase==='run'&&V.finishT==null?.3:.45);}}
  if(V.phase==='run'&&V.finishT==null){const near=Math.max(0,1-Math.abs(sx(own.s)-W*.55)/(W*.7));SFX.runSet(lead?.v||0,near);}else if(V.end)SFX.runStop();
  // Anzeige
  if(now-V.boardT>180){V.boardT=now;const b=A.layer.querySelector('#hrBoard');if(b)b.innerHTML=ranked.map((r,i)=>`<li class="${r.own?'own':''}"><i class="num j${r.num}">${r.num}</i><b>${esc(r.D.name)}</b><small>${esc(r.D.breedName)}</small><span>${r.done?'Ziel':Math.max(0,Math.round(r.s))+' m'}</span></li>`).join('');
   const d=A.layer.querySelector('#hrDist');if(d)d.textContent=Math.max(0,Math.round(dist-maxS))+' m';
   const m=A.layer.querySelector('#hrMini');if(m)m.innerHTML=acts.map(r=>`<i class="j${r.num}${r.own?' own':''}" style="left:${Math.min(100,Math.max(0,r.s/dist*100))}%"></i>`).join('');}
  // ---- Zeichnen ----
  draw(dt,ranked,vCam,lead,maxS);}
 function draw(dt,ranked,vCam,lead,maxS){const t=performance.now()/1000,tl=TILES,run=V.phase==='run',spd=vCam;
  {const k=dt*V.slow;for(const p of DUST.pool){if(!p.on)continue;p.age+=k;if(p.age>=p.life){p.on=0;continue;}p.x+=(p.vx-spd*PXM*.35)*k;p.y+=p.vy*k;p.vy*=.96;p.vx*=.97;}}
  c.save();if(V.shake>0){c.translate(Math.round((Math.random()-.5)*4*V.shake),Math.round((Math.random()-.5)*3*V.shake));V.shake=Math.max(0,V.shake-dt*2.5);}
  // Himmel, Ränge, Spina, Bande
  const sky=c.createLinearGradient(0,0,0,20);sky.addColorStop(0,'#e9b77a');sky.addColorStop(1,'#f7dcaa');c.fillStyle=sky;c.fillRect(0,0,W,20);
  const cheer=maxS>dist-70||V.finishT!=null?Math.floor(t*6)%3:Math.floor(t*1.5)%2?0:(run?1:0);
  tileX(c,tl.stands[cheer],V.scroll*.18,-6);
  tileX(c,tl.spina,V.scroll*.45,46);
  c.fillStyle='#7a5c3c';c.fillRect(0,96,W,4);tileX(c,tl.wall,V.scroll*.9,100);
  // Sand und Bahnen
  for(let y=114;y<H;y+=150)tileX(c,tl.sand,V.scroll,y);
  const g=c.createLinearGradient(0,114,0,H);g.addColorStop(0,'#3a200a30');g.addColorStop(.3,'#0000');g.addColorStop(1,'#3a200a22');c.fillStyle=g;c.fillRect(0,114,W,H-114);
  c.fillStyle='#e8dcc099';for(let i=0;i<=8;i++){const y=Math.round(laneY(i)-11);c.fillRect(0,y,W,1);}
  // Rechenspuren des Sands, schnell verschoben
  c.fillStyle='#a8814e66';for(let i=0;i<14;i++){const x=((i*97-V.scroll*1.05)%W+W)%W,y=124+((i*37)%170);c.fillRect(Math.round(x),y,18,1);}
  // Entfernungstafeln an der inneren Bande
  for(let m=50;m<dist;m+=50){const x=sx(m);if(x<-30||x>W+30)continue;c.fillStyle='#5a3a1c';c.fillRect(Math.round(x),86,2,14);c.fillStyle='#ece4d0';c.fillRect(Math.round(x)-9,78,20,9);c.fillStyle='#2a1a10';c.font='bold 8px "Courier Prime",monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(String(dist-m),Math.round(x)+1,83);}
  // Ziellinie
  {const x=sx(dist);if(x>-60&&x<W+60){c.fillStyle='#f4efe2';for(let i=0;i<8;i++){const y=laneY(i)-11,xx=x+(i-3.5)*1.6;c.fillRect(Math.round(xx),Math.round(y),3,20);}
   c.fillStyle='#ece4d0';c.fillRect(Math.round(x)-1,40,3,60);c.fillRect(Math.round(x)+30,40,3,60);c.fillStyle='#9a2a1e';c.fillRect(Math.round(x)-1,40,34,12);c.fillStyle='#ffe9b0';c.font='bold 9px "Courier Prime",monospace';c.textAlign='center';c.textBaseline='middle';c.fillText('META',Math.round(x)+16,46.5);}}
  // Startboxen
  {const x=sx(0);if(x>-120&&x<W+60){c.fillStyle='#3a2414';c.fillRect(Math.round(x)-2,laneY(0)-58,3,58);c.fillStyle='#6a4426';c.fillRect(Math.round(x)-6,laneY(0)-60,12,3);}}
  // Hase (Attrappe) an der inneren Bande vor dem Feld
  if(run||(V.phase==='intro'&&V.t>.5)){const hs=run?Math.max(maxS+7+Math.sin(t*3)*.6,V.tau*16+4):2,hx=sx(Math.min(hs,dist+30)),hy=110-Math.abs(Math.sin(t*14))*3;
   c.fillStyle='#5a3a1c';c.fillRect(hx-30,107,60,1);c.fillStyle='#d8c4a0';c.fillRect(hx-4,hy-4,9,5);c.fillRect(hx+4,hy-7,3,4);c.fillRect(hx+5,hy-11,1,5);c.fillRect(hx+3,hy-11,1,5);c.fillStyle='#fff';c.fillRect(hx-6,hy-4,3,3);c.fillStyle='#2a1a10';c.fillRect(hx+5,hy-6,1,1);}
  // Hunde von hinten nach vorn
  if(V.focus!=null){const y=laneY(V.focus);c.fillStyle=`rgba(255,224,138,${(.18+.1*Math.sin(t*6)).toFixed(2)})`;c.fillRect(0,y-12,W,13);}
  for(const r of byLane){const k=laneK(r.lane),len=82*r.a.P.sz*k,x=sx(r.s)+(r.lane-3.5)*1.6-len*.42,y=laneY(r.lane);
   if(x<-len||x>W+len){if(x<-len){c.fillStyle='#000a';c.fillRect(2,y-12,44,10);c.fillStyle=r.own?'#ffe08a':'#ece4d0';c.font='bold 8px "Courier Prime",monospace';c.textAlign='left';c.textBaseline='middle';c.fillText('◂ '+r.num+' · '+Math.round(maxS-r.s)+'m',4,y-7);}continue;}
   // Fahrtwind hinter dem Hund
   if(run&&r.v>6){const a=Math.min(.75,(r.v-6)/14);c.strokeStyle=`rgba(255,248,232,${a})`;c.lineWidth=1;for(let j=0;j<4;j++){const yy=y-len*(.22+.13*j),ph=(t*9+j*1.7+r.i)%1,l=24+r.v*3.2*(1-j*.15);c.beginPath();c.moveTo(x-len*.45-ph*6,yy);c.quadraticCurveTo(x-len*.45-l*.5,yy+Math.sin(t*20+j)*2,x-len*.45-l-ph*10,yy+1);c.stroke();}}
   // Staub aus den Pfoten
   // Staubwolke hinter dem Hund: Teilchen aus dem festen Vorrat (keine neuen Objekte), hinter dem Hund dieser Bahn gezeichnet
   if(run&&r.v>3){r.emit=(r.emit||0)+r.v*dt*V.slow*.7;while(r.emit>=1){r.emit--;const p=DUST.pool[DUST.next];DUST.next=(DUST.next+1)%DUST.pool.length;p.on=1;p.lane=r.lane;p.x=x-len*(.32+Math.random()*.2);p.y=y-1-Math.random()*3;p.vx=-(20+r.v*4+Math.random()*25);p.vy=-(4+Math.random()*9);p.age=0;p.life=.7+Math.random()*.5;p.s0=5+len*.08;p.k=Math.floor(Math.random()*3);}}
   for(const p of DUST.pool){if(!p.on||p.lane!==r.lane)continue;const q=p.age/p.life,sz=Math.round(p.s0*(1+q*2.6));c.globalAlpha=Math.max(0,.62*(1-q)*(1-q*.6));c.drawImage(DUST.img[p.k],Math.round(p.x-sz/2),Math.round(p.y-sz*.75),sz,sz);}c.globalAlpha=1;
   const d=r.a;d.clock+=dt;
   if(run&&r.v>8){const col=r.D.appearance.colors.base||'#a08060',a=Math.min(.32,(r.v-8)/22),hh=len*.42,L2=6+r.v*1.6;c.globalAlpha=a;c.fillStyle=col;for(let j=0;j<6;j++){const yy=Math.round(y-len*.18-hh*j/6),ll=L2*(.5+.5*Math.sin(j*1.7+t*30));c.fillRect(Math.round(x-len*.42-ll),yy,Math.round(ll),1);}c.globalAlpha=1;}
   try{DOG.draw(c,d,Math.round(x),Math.round(y),k,1,{time:t,key:d.id});}catch(e){}
   jacket(c,d,Math.round(x),Math.round(y),k,r.num,t);
   {const bx=sx(0);if(bx>-120&&bx<W+60)boxFront(r.lane,bx,run?Math.min(1,V.tau*3.5):0);}
   if(r.own){c.fillStyle='#ffe08a';c.beginPath();const ty=y-len*.95-6+Math.sin(t*6)*1.5;c.moveTo(x-4,ty);c.lineTo(x+4,ty);c.lineTo(x,ty+5);c.fill();}}
  // Fahrtwind-Streifen über dem Bild
  if(run&&spd>4){const a=Math.min(1,(spd-4)/12);for(const s of V.streaks){s.x-=(spd*PXM*1.4+s.len*4)*dt*V.slow;if(s.x+s.len<0){s.x=W+Math.random()*60;s.y=Math.random()<.75?118+Math.random()*(H-118):Math.random()*95;}c.fillStyle=`rgba(255,250,236,${(s.a*a).toFixed(2)})`;c.fillRect(Math.round(s.x),Math.round(s.y),Math.round(s.len*a),1);}}
  // Vorderer Zaun, rasend schnell und verwischt
  {const off=V.scroll*1.6,gap=PXM*2.5*1.6;c.fillStyle='#5a3a1c';c.fillRect(0,H-9,W,3);const blur=Math.min(26,spd*1.8*V.slow);for(let x=-((off%gap)+gap)%gap;x<W+gap;x+=gap){c.fillStyle='#6a4426';c.fillRect(Math.round(x),H-14,4,14);if(blur>3){c.fillStyle='rgba(106,68,38,.35)';c.fillRect(Math.round(x+4),H-14,Math.round(blur),14);}}}
  // Rosenblätter nach dem Zieleinlauf
  for(let j=V.petals.length-1;j>=0;j--){const p=V.petals[j];p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=dt*4;if(p.y>H){V.petals.splice(j,1);continue;}c.fillStyle=p.c;c.fillRect(Math.round(p.x),Math.round(p.y),Math.abs(Math.cos(p.r))*3+1,2);}
  // Vignette, Zeitlupe, Blitz, große Schrift
  const vg=c.createRadialGradient(W/2,H*.6,H*.35,W/2,H*.6,H*.95);vg.addColorStop(0,'#0000');vg.addColorStop(1,V.slow<.9?'#000a':'#0006');c.fillStyle=vg;c.fillRect(0,0,W,H);
  if(V.slow<.9){c.fillStyle='#000';c.fillRect(0,0,W,12);c.fillRect(0,H-12,W,12);c.fillStyle='#ffe08a';c.font='bold 9px "Courier Prime",monospace';c.textAlign='right';c.fillText('ZEITLUPE',W-8,7);}
  if(V.flash>0){c.fillStyle=`rgba(255,255,255,${V.flash.toFixed(2)})`;c.fillRect(0,0,W,H);V.flash=Math.max(0,V.flash-dt*1.8);}
  if(V.text){const q=V.t-V.text.t;if(q>1.1)V.text=null;else{const sc=V.text.big*(1+Math.max(0,.25-q)*2.4),al=Math.min(1,(1.1-q)*3);c.globalAlpha=al;c.font=`bold ${Math.round(46*sc)}px "Courier Prime",monospace`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#000';c.fillText(V.text.txt,W/2+3,H*.4+3);c.fillStyle=V.text.col||'#fff3d6';c.fillText(V.text.txt,W/2,H*.4);c.globalAlpha=1;}}
  c.restore();}
 raf=requestAnimationFrame(step);
 const ctl=e=>{const el=e.target.closest('[data-a]');if(!el||!A.layer.contains(el))return;const a=el.dataset.a;
  if(a==='hrspeed'){V.speed=V.speed===1?2:V.speed===2?4:1;el.textContent='⏩ '+V.speed+'×';}
  else if(a==='hrsound'){S().options.sound=S().options?.sound===false;el.textContent=S().options.sound===false?'🔇':'🔊';if(S().options.sound===false)SFX.crowdStop();else SFX.crowdStart();try{M.persist();}catch{}}
  else if(a==='hrintro'){endIntro();}
  else if(a==='hrskip'){if(!V.end){V.end=true;cancelAnimationFrame(raf);SFX.crowdStop();SFX.runStop();try{M.speakStop?.();}catch{}o.done();}}};
 A.layer.addEventListener('click',ctl);V.cleanup=()=>A.layer.removeEventListener('click',ctl);
 return V;}

// ---------- Aussichten (schnelle Probeläufe ohne Bild) ----------
function odds(D,k){const key=D.id+'|'+k+'|'+S().day+'|'+Math.round(API.RW(D.stats))+'|'+healthOf(D);if(R.odds[key]!=null)return R.odds[key];const f=st().offers[k];let w=0;const n=60,opp=f.field.map(opponent);
 for(let i=0;i<n;i++){const res=simulate([{D,health:healthOf(D)},...opp.map(x=>({D:x}))],f.dist,(i*7919+k*104729+1)>>>0);if(res.lanes[0].place===1)w++;}return R.odds[key]=w/n;}
const oddsTxt=p=>p>=.45?['Favorit','fav']:p>=.25?['gute Chancen','good']:p>=.1?['Außenseiter','out']:['chancenlos','none'];

// ---------- Bildschirm: Hundekämpfe oder Hunderennen ----------
function dogkinds(){A.setTitle('BEAST · HUNDE');const n=dogs().length;
 A.view.innerHTML=`<section class="an-hero"><p class="eyebrow">Was sollen deine Hunde tun?</p></section>
 <div class="an-modes hr-kinds"><button class="an-mode beast" data-a="hrkind:fight"><canvas width="300" height="170" class="px"></canvas><span class="an-mlabel"><b>KÄMPFE</b><small>Zähne, Fell, kein Gewissen · gegen Hunde und Menschen</small></span></button>
 <button class="an-mode hr-mode" data-a="hrkind:race"><canvas width="300" height="170" class="px"></canvas><span class="an-mlabel"><b>RENNEN</b><small>${ranToday()?'Heute schon gelaufen · morgen wieder':'8 Hunde · 1–5 Totenköpfe · ein Rennen am Tag'}</small></span></button></div>
 <p class="an-note">Für Rennen zählen Schnelligkeit und Ausdauer, nicht Biss und Mut. Windhunde sind hier zu Hause.</p>`;
 const [a,b]=A.view.querySelectorAll('.an-mode canvas'),D0=dogs()[0],fa=D0&&actor(D0,'threat');
 A.anim(a,(ctx,t)=>{A.ART.arena(ctx,300,170,t,{night:1});if(fa)try{DOG.draw(ctx,fa,150,160,1.15,-1,{time:t,key:fa.id});}catch{}ctx.fillStyle='rgba(20,6,6,.3)';ctx.fillRect(0,0,300,170);});
 const fast=[...dogs()].sort((x,y)=>API.RW(y.stats)-API.RW(x.stats)),pre=[0,1,2].map(i=>actor(fast[i]||DOG.create(['greyhound','saluki','whippet'][i],11+i),'race'));tiles();let sc=0,lt=0;
 A.anim(b,(ctx,t)=>{const dt=lt?Math.min(.05,t-lt):0;lt=t;sc+=dt*600;ctx.imageSmoothingEnabled=false;tileX(ctx,TILES.stands[Math.floor(t*4)%3],sc*.18,-30,300);tileX(ctx,TILES.wall,sc*.9,54,300);tileX(ctx,TILES.sand,sc,68,300);
  pre.forEach((d,i)=>{d.cyc+=dt*3.6+i*.002;const y=112+i*24,x=120+i*30+Math.sin(t*1.3+i)*14,k=.62+i*.08;
   ctx.strokeStyle='rgba(255,248,232,.5)';for(let j=0;j<3;j++){const yy=y-28*k-j*5,ph=(t*9+j)%1;ctx.beginPath();ctx.moveTo(x-30*k-ph*6,yy);ctx.lineTo(x-30*k-36-ph*10,yy+1);ctx.stroke();}
   try{DOG.draw(ctx,d,Math.round(x),y,k,1,{time:t,key:d.id});}catch{}jacket(ctx,d,Math.round(x),y,k,[1,6,8][i],t);});
  for(let i=0;i<14;i++){const x=((i*53-sc*1.4)%300+300)%300;ctx.fillStyle='rgba(255,250,236,.35)';ctx.fillRect(x,70+((i*29)%100),24,1);}
  ctx.fillStyle='#6a4426';const off=sc*1.6;for(let x=-((off%60)+60)%60;x<300;x+=60){ctx.fillRect(Math.round(x),158,4,12);ctx.fillStyle='rgba(106,68,38,.4)';ctx.fillRect(Math.round(x)+4,158,22,12);ctx.fillStyle='#6a4426';}
  if(ranToday()){ctx.fillStyle='rgba(10,6,4,.5)';ctx.fillRect(0,0,300,170);}});}
dogkinds.back=go=>go('beast',-1);

// ---------- Bildschirm: Rennbahn ----------
function race(){A.setTitle('BEAST · HUNDERENNEN');const s=st(),list=dogs();
 if(!R.sel||!list.some(D=>D.id===R.sel))R.sel=[...list].filter(DOG.fit).sort((a,b)=>API.RW(b.stats)-API.RW(a.stats))[0]?.id||list[0]?.id;
 const D=list.find(x=>x.id===R.sel),cls=D?classOf(D):1,done=ranToday();
 A.view.innerHTML=`<section class="an-panel hr-pick"><header><p class="eyebrow">Dein Läufer</p><span class="hr-rec">Rennen ${s.races} · Siege ${s.wins}</span></header>
  ${list.length?`<div class="hr-dogs">${list.map(x=>{const f=DOG.fit(x),c=classOf(x);return `<button class="hr-dog${x.id===R.sel?' on':''}${f?'':' unfit'}" data-a="hrdog:${x.id}"><span class="th" data-d="${x.id}"></span><b>${esc(x.name)}</b><small>${esc(x.breedName)}</small><span class="hr-cls" title="passende Liga">${sk(c)}</span><span class="hr-bars"><i title="Schnelligkeit"><em style="width:${Math.round(x.stats.tempo)}%"></em></i><i title="Ausdauer" class="aus"><em style="width:${Math.round(x.stats.ausdauer)}%"></em></i></span><span class="hr-rw">Rennwert ${Math.round(API.RW(x.stats))}${f?'':' · verletzt'}</span></button>`;}).join('')}</div>
  <p class="an-hint">Rennwert aus Schnelligkeit und Ausdauer. Die Ligen sind fest – jeder Hund darf überall starten. Für Liga ☠ braucht es schon einen Windhund oder einen gut trainierten Hund. Balken: Schnelligkeit (gelb), Ausdauer (grün).</p>`:'<p class="an-empty">Du hast keinen Hund. Der Hundsgraf hat Aufträge (Beastrium).</p>'}</section>
 ${done?`<div class="hr-done"><b>Heute ist schon gelaufen worden.</b><span>Ein Rennen am Tag. Die Hunde brauchen ihre Ruhe – und der Buchmacher auch.</span><button data-a="hrday">Nächster Tag ▸</button></div>`:''}
 <section class="an-chall"><header><p class="eyebrow">Heutige Rennen · ${D?'passend für '+esc(D.name)+': Liga '+sk(cls):'kein Hund gewählt'}</p></header>
 <div class="hr-cards">${TIERS.map((T,k)=>{const f=s.offers[k],low=false,fit=D&&DOG.fit(D),ok=D&&!low&&!done&&fit,p=ok?odds(D,k):null,[ot,oc]=p!=null?oddsTxt(p):['',''];
  return `<button class="hr-card t${T.skulls}${ok?'':' off'}${D&&k+1===cls?' mine':''}" data-a="${ok?'hrgo:'+k:low?'hrlow':done?'hrdone':!fit?'hrunfit':'hrnone'}"><div class="hr-ct"><span class="sk">${sk(T.skulls)}</span><b>${esc(T.name)}</b><span class="m">${T.dist} m</span></div>
   <div class="hr-prize"><span><small>1.</small>${T.prize[0]}</span><span><small>2.</small>${T.prize[1]}</span><span><small>3.</small>${T.prize[2]}</span><i class="an-coin"></i></div>
   <p class="hr-field">${f.field.map(e=>esc(DOG.BREEDS.find(b=>b.id===e.breed)?.name||e.breed)).join(' · ')}</p>
   <p class="hr-odds ${oc}">${low?'Dein Hund ist zu schnell für diese Klasse':done?'Morgen wieder':!fit?'Dein Hund ist zu angeschlagen':ot}</p></button>`;}).join('')}</div></section>`;
 A.view.querySelectorAll('.th[data-d]').forEach(el=>{const x=list.find(d=>d.id===el.dataset.d);if(x)el.appendChild(A.thumb({kind:'dog',D:x,key:'d:'+x.id},44,40));});}
race.back=go=>go('dogkinds',-1);

// ---------- Rennen starten: Ergebnis steht sofort fest und wird gespeichert, dann läuft der Film ----------
function launch(k){const s=st(),D=dogs().find(x=>x.id===R.sel);if(!D||ranToday()||!DOG.fit(D))return;const T=TIERS[k],f=s.offers[k],opp=f.field.map(opponent);
 const lanes=[0,1,2,3,4,5,6,7].sort(()=>Math.random()-.5),hp=healthOf(D);
 const runners=[{D,own:true},...opp.map(x=>({D:x,own:false}))].map((r,i)=>({...r,i,lane:lanes[i],num:lanes[i]+1}));
 const sim=simulate(runners.map(r=>({D:r.D,health:r.own?hp:100})),f.dist,(Math.random()*4294967296)>>>0);
 const place=sim.lanes[0].place,prize=T.prize[place-1]||0,before={tempo:D.stats.tempo,ausdauer:D.stats.ausdauer,kraft:D.stats.kraft};
 // Lernen (Erfahrung): Schnelligkeit und Ausdauer rücken 4 % der Lücke zum Soll heran (Sieg 7 %), Kraft halb so viel
 const fr=place===1?.07:.04;for(const [k2,m] of [['tempo',1],['ausdauer',1],['kraft',.5]]){const gap=(D.caps[k2]||0)-(D.stats[k2]||0);if(gap>0)D.stats[k2]=Math.round((D.stats[k2]+gap*fr*m)*10)/10;}
 // Rennbericht: Zeit, Rückstand, Tempo, Plätze unterwegs, Bestzeit
 const me=sim.lanes[0],tr=me.trace,top=Math.max(...tr.slice(1).map((x,i)=>(x-tr[i])*FPS).filter(v=>v<40)),wt=sim.lanes[sim.order[0]].time;
 const posAtD=q=>{const f=tr.findIndex(x=>x>=q*f2.dist);if(f<0)return 8;return 1+sim.lanes.filter((l,j)=>j!==0&&(l.trace[f]??l.trace[l.trace.length-1])>tr[f]).length;},f2=f;
 const pb=(D.raceBest??={})[f.dist],newBest=!pb||me.time<pb;if(newBest)D.raceBest[f.dist]=Math.round(me.time*100)/100;
 const report={time:Math.round(me.time*100)/100,behind:Math.round((me.time-wt)*100)/100,top:Math.round(top*3.6),avg:Math.round(f.dist/me.time*3.6),pos:[.25,.5,.75].map(posAtD),best:D.raceBest[f.dist],oldBest:pb||null,newBest,react:Math.round(me.react*100)/100,stumble:!!me.stumble};
 D.races=(D.races||0)+1;if(place===1)D.raceWins=(D.raceWins||0)+1;
 s.usedDay=S().day;s.races++;if(place===1)s.wins++;s.gold=(s.gold||0)+prize;
 if(prize){S().gold+=prize;if(S().stats)S().stats.earned=(S().stats.earned||0)+prize;}
 const res={k,day:S().day,dog:D.id,name:D.name,breed:D.breedName,place,prize,dist:f.dist,
  table:sim.order.map(i=>({name:runners[i].D.name,breed:runners[i].D.breedName,own:runners[i].own,num:runners[i].num,time:Math.round(sim.lanes[i].time*100)/100})),
  gain:{tempo:[before.tempo,D.stats.tempo,D.caps.tempo],ausdauer:[before.ausdauer,D.stats.ausdauer,D.caps.ausdauer],kraft:[before.kraft,D.stats.kraft,D.caps.kraft]},report,races:D.races,raceWins:D.raceWins||0};
 s.last=res;try{M.persist();}catch{}
 // Steckbriefe und Vorstellung durch den Sprecher: Begrüßung, drei Favoriten (nach erwarteter Zeit), eigener Hund, Wetten
 const metas=runners.map((r,i)=>r.own?{school:S().schoolName||'deinem Ludus',from:S().schoolName?'dem '+(/^ludus\b/i.test(S().schoolName)?'':'Ludus ')+S().schoolName:'deinem Ludus',lanista:lanista(),races:(D.races||1)-1,wins:(D.raceWins||0)-(place===1?1:0),best:pb||null}:meta(f.field[i-1],k,f.dist));
 const exp=runners.map((r,i)=>{const R0=runner(r.D,r.own?hp:100);return f.dist/(R0.vmax*.95);});
 const fav=runners.map((r,i)=>i).filter(i=>i>0).sort((a,b)=>exp[a]-exp[b]).slice(0,3);
 const card=i=>({num:runners[i].num,lane:runners[i].lane,name:runners[i].D.name,breed:runners[i].D.breedName,...metas[i]});
 const W0=['Willkommen im Circus! Heute: '+T.name+', '+f.dist+' Meter Sand, acht Hunde und ein Hase aus Holz. Wetten Sie jetzt. Beten Sie später.',
  'Guten Tag, Rom! '+T.name+' über '+f.dist+' Meter. Die Hunde sind hungrig, die Lanistas gierig, und der Medicus hat Feierabend. Perfekte Bedingungen!'];
 const intro=[{text:W0[Math.floor(Math.random()*W0.length)]},
  ...fav.map((i,n)=>{const m=metas[i],x=card(i);return {card:x,text:(n===0?'Der große Favorit: ':n===1?'Dahinter: ':'Und nicht zu unterschätzen: ')+'Startnummer '+x.num+': '+x.name+', Rasse '+x.breed+', aus '+m.from+'. '+m.races+' Rennen, '+m.wins+' Siege, Bestzeit '+secs(m.best)+' Sekunden. '+m.joke};}),
  {card:card(0),text:'Und auf Startnummer '+runners[0].num+': dein '+D.name+', Rasse '+D.breedName+', aus '+metas[0].from+'. '+(metas[0].races>0?metas[0].races+' Rennen, '+metas[0].wins+' Siege'+(pb?', Bestzeit '+secs(pb)+' Sekunden.':'.'):'Sein erstes Rennen. Keine Bestzeit, nur Hoffnung und Flöhe.')+' '+OWN_JOKES[Math.floor(Math.random()*OWN_JOKES.length)].replace(/\{l\}/g,lanista())},
  {text:'Die Wettbüros schließen. Wer jetzt noch Geld hat, hat nicht verstanden, wie das hier funktioniert.'}];
 const V=startRace({k,sim,runners,intro,meta:metas,done:()=>{V?.cleanup?.();SFX.crowdStop();A.layer.innerHTML='';A.go('raceresult');A.root.scrollTop=0;}});}

// ---------- Bildschirm: Ergebnis ----------
function raceresult(){const r=st().last;if(!r){A.go('race',-1);return;}const T=TIERS[r.k],won=r.place===1,rep=r.report;A.setTitle(won?'SIEG IM RENNEN':'RENNEN · PLATZ '+r.place);
 const f1=v=>(Math.round(v*10)/10).toLocaleString('de-DE');
 A.view.innerHTML=`<section class="an-res ${won?'won':'lost'} hr-res"><p class="eyebrow">${sk(T.skulls)} ${esc(T.name)} · ${r.dist} m</p><h1>${won?'SIEG!':r.place+'. PLATZ'}</h1>
  <div class="an-pay"><small>${r.prize?'Preisgeld':'Kein Preisgeld'}</small><b data-count="${r.prize}">0</b><span>Gold</span></div>
  <ol class="hr-table">${r.table.map((x,i)=>`<li class="${x.own?'own':''}"><span class="pl">${i+1}.</span><i class="num j${x.num}">${x.num}</i><b>${esc(x.name)}</b><small>${esc(x.breed)}</small><span class="tm">${f1(x.time)} s</span></li>`).join('')}</ol>
  ${rep?`<div class="an-gains hr-report"><h3>RENNBERICHT</h3><div class="hr-rgrid"><span><small>Zeit</small><b>${secs(rep.time)} s</b></span><span><small>${won?'Vorsprung':'Rückstand'}</small><b>${won?'—':'+'+secs(rep.behind)+' s'}</b></span><span><small>Spitze</small><b>${rep.top} km/h</b></span><span><small>Schnitt</small><b>${rep.avg} km/h</b></span><span><small>Start</small><b>${secs(rep.react)} s</b></span><span><small>Bestzeit ${r.dist} m</small><b>${secs(rep.best)} s${rep.newBest?' <em>NEU</em>':''}</b></span></div>
   <p class="hr-pos">Platz unterwegs: ${rep.pos.map((p,i)=>`<span>${['¼','½','¾'][i]} <b>${p}.</b></span>`).join(' → ')} → <span>Ziel <b>${r.place}.</b></span>${rep.stumble?' · <em>gestolpert</em>':''}</p>
   <p class="hr-pos">Bilanz: ${r.races} Rennen · ${r.raceWins} Siege</p></div>`:''}
  <div class="an-gains"><h3>Erfahrung durch das Rennen</h3><div class="an-gain an-dog"><b>${esc(r.name)}</b><ul>${[['Schnelligkeit','tempo'],['Ausdauer','ausdauer'],['Kraft','kraft']].filter(([l,k])=>r.gain[k]).map(([l,k])=>{const [a,b,cap]=r.gain[k],up=b-a>=.05;return `<li class="${up?'up':''}"><span>${l}</span><b>${f1(a)} → ${f1(b)}${up?' <em>▲ +'+f1(b-a)+'</em>':''}</b><small>SOLL ${Math.round(cap)}</small><i class="an-dogbar"><i style="width:${Math.round(a/Math.max(1,cap)*100)}%"></i><i class="new" style="width:${Math.max(0,Math.round((b-a)/Math.max(1,cap)*100))}%"></i></i></li>`;}).join('')}</ul></div></div>
  <p class="an-note">${won?'Die Menge wirft Rosen. Der Buchmacher wirft böse Blicke.':r.place<=3?'Auf dem Treppchen. Nächstes Mal vielleicht ganz oben.':'Nicht jeder Tag ist ein Renntag. Morgen gibt es ein neues Feld.'}</p>
  <div class="an-actions"><button data-a="hrday">Nächster Tag ▸</button><button class="primary" data-a="hrback">Zur Rennbahn</button></div>${C.close?'<div class="an-actions"><button data-a="leave">◂ Arena verlassen</button></div>':''}</section>`;
 const n=A.view.querySelector('[data-count]'),goal=+n.dataset.count,t0=performance.now();(function tick(){const q=Math.min(1,(performance.now()-t0)/900);n.textContent=Math.round(goal*q*(2-q));if(q<1)requestAnimationFrame(tick);})();
 A.setTitle(won?'SIEG IM RENNEN':'RENNEN · PLATZ '+r.place);
 // Sprecher liest den Rennbericht (einmal je Rennen)
 if(rep&&!r.read&&M.speakLine&&sndOn()){r.read=true;const g=r.gain,best=[['Schnelligkeit','tempo'],['Ausdauer','ausdauer'],['Kraft','kraft']].map(([l,k])=>({l,d:g[k]?g[k][1]-g[k][0]:0,a:g[k]?.[0],b:g[k]?.[1]})).sort((x,y)=>y.d-x.d)[0];
  const tx=(won?r.name+' gewinnt in '+secs(rep.time)+' Sekunden! '+(rep.newBest?'Neue Bestzeit! ':'')+'Lanista '+lanista()+' kassiert '+r.prize+' Gold und behauptet, er habe nie gezweifelt.':r.name+' wird '+r.place+'. in '+secs(rep.time)+' Sekunden, '+secs(rep.behind)+' Sekunden hinter dem Sieger. '+(r.place<=3?'Immerhin '+r.prize+' Gold. Davon kann man fast einen Rekruten kaufen. Einen kleinen.':'Kein Gold. Lanista '+lanista()+' rechnet schon, was der Hund als Wurst wert wäre.'))+(best.d>=.05?' Erfahrung: '+best.l+' steigt von '+f1(best.a)+' auf '+f1(best.b)+'.':'');
  let n=0;(function wait(){if(M.speaking?.()&&n++<60){setTimeout(wait,250);return;}try{M.speakLine(tx,'moderator',null,{voice:'moderator',echo:.5,vol:1.12});}catch{}})();/* erst wenn die Siegeransage fertig ist */try{M.persist();}catch{}}}
raceresult.back=go=>go('race',-1);

U.screens.dogkinds=dogkinds;U.screens.race=race;U.screens.raceresult=raceresult;
A.root.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(!el||A.layer.contains(el))return;const [a,v]=el.dataset.a.split(/:(.*)/s);
 if(a==='hrkind'){if(v==='race'){A.go('race');}else{U.mode='beast';U.species='hund';U.size=1;U.picked=[];U.chall=null;A.go('hub');}}
 else if(a==='hrdog'){R.sel=v;A.render();}
 else if(a==='hrgo')launch(+v);
 else if(a==='hrlow')M.ui?.notify?.('Zu schnell für diese Klasse – such dir Gegner auf Augenhöhe.');
 else if(a==='hrdone')M.ui?.notify?.('Heute ist schon gelaufen worden. Morgen wieder.');
 else if(a==='hrunfit')M.ui?.notify?.('Dein Hund ist zu angeschlagen. Ein paar Tage Ruhe helfen.');
 else if(a==='hrday'){const d=S().day;C.nextDay(1);let n=0;const show=()=>{A.go('race',-1);A.root.scrollTop=0;};show();(function wait(){if(S().day!==d)show();else if(n++<60)setTimeout(wait,50);})();}// Tageswechsel kann verzögert ablaufen
 else if(a==='hrback'){A.go('race',-1);A.root.scrollTop=0;}},true);
G.HUNDERENNEN_READY=true;
})();
