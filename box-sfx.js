'use strict';
// =====================================================================================================
// FAUSTKAMPF · Geräusche (window.BXS), alles mit Web Audio erzeugt, keine Dateien.
// Lederumwickelte Fäuste: klatschende Geraden, dumpfe Schwinger, knackende Uppercuts, Körpertreffer tief und satt,
// Block als gedämpfter Lederschlag, Luftzug bei Fehlschlägen, Ringglocke, Aufprall beim Niederschlag, Zahn klirrt.
// Publikum: Grundrauschen der Menge, das mit der Spannung anschwillt, Rufe, „Ohhh“ bei harten Treffern, Jubel.
// =====================================================================================================
(()=>{
let ctx=null,out=null,noise=null,crowdGain=null,crowdFilter=null,on=true,started=false;
const rnd=(a,b)=>a+Math.random()*(b-a);
function init(){if(ctx)return true;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;try{ctx=new AC();out=ctx.createGain();out.gain.value=.6;const comp=ctx.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=5;out.connect(comp);comp.connect(ctx.destination);
 const len=ctx.sampleRate*2,buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);let last=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;last=last*.6+w*.4;d[i]=last*1.4;}noise=buf;return true;}catch{ctx=null;return false;}}
const now=()=>ctx.currentTime;
function env(g,t,a,peak,dur){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+a);g.gain.exponentialRampToValueAtTime(.0001,t+dur);}
function burst(t,{dur=.08,type='bandpass',f0=1200,f1=null,q=1.2,peak=.5,a=.003}={}){const s=ctx.createBufferSource();s.buffer=noise;s.playbackRate.value=rnd(.9,1.1);const f=ctx.createBiquadFilter();f.type=type;f.Q.value=q;f.frequency.setValueAtTime(f0,t);if(f1)f.frequency.exponentialRampToValueAtTime(f1,t+dur);const g=ctx.createGain();env(g,t,a,peak,dur);s.connect(f);f.connect(g);g.connect(out);s.start(t,rnd(0,1.5));s.stop(t+dur+.05);}
function tone(t,{type='sine',f0=200,f1=null,dur=.1,peak=.4,a=.003,filt=null,q=2}={}){const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur);const g=ctx.createGain();env(g,t,a,peak,dur);let n=o;if(filt){const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=filt;f.Q.value=q;o.connect(f);n=f;}n.connect(g);g.connect(out);o.start(t);o.stop(t+dur+.05);}
// Menschliche Rufe: Sägezahn durch zwei Formantfilter, kurze Tonhöhenkurve
function shout(t,{f0=rnd(140,260),dur=rnd(.18,.4),peak=.06,vowel=Math.random()<.5?[700,1150]:[400,2000]}={}){const o=ctx.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(f0,t);o.frequency.linearRampToValueAtTime(f0*rnd(1.1,1.35),t+dur*.4);o.frequency.linearRampToValueAtTime(f0*rnd(.8,1),t+dur);const g=ctx.createGain();env(g,t,.03,peak,dur);
 for(const fr of vowel){const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=fr;f.Q.value=6;o.connect(f);f.connect(g);}g.connect(out);o.start(t);o.stop(t+dur+.05);}
function ooh(t,peak=.18){for(let i=0;i<9;i++){const o=ctx.createOscillator();o.type='sawtooth';const f0=rnd(110,220);o.frequency.setValueAtTime(f0,t);o.frequency.linearRampToValueAtTime(f0*.82,t+.9);const g=ctx.createGain();env(g,t+rnd(0,.08),.12,peak/9*2.2,1.0);const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=rnd(380,520);f.Q.value=5;o.connect(f);f.connect(g);g.connect(out);o.start(t);o.stop(t+1.2);}}
function roar(t,peak=.35,dur=1.6){burst(t,{dur,f0:900,f1:600,q:.6,peak,a:.12});for(let i=0;i<10;i++)shout(t+rnd(0,dur*.6),{peak:.05});}
function startCrowd(){if(crowdGain)return;const s=ctx.createBufferSource();s.buffer=noise;s.loop=true;crowdFilter=ctx.createBiquadFilter();crowdFilter.type='bandpass';crowdFilter.frequency.value=650;crowdFilter.Q.value=.7;crowdGain=ctx.createGain();crowdGain.gain.value=.0001;s.connect(crowdFilter);crowdFilter.connect(crowdGain);crowdGain.connect(out);s.start();}
const S={
 enable(v){on=v;if(ctx)out.gain.setTargetAtTime(v?.6:0,now(),.05);},
 unlock(){if(!init())return false;if(ctx.state==='suspended')ctx.resume();startCrowd();started=true;return true;},
 get ready(){return !!ctx&&started&&on;},
 // Spannung des Publikums (0–1) jedes Bild
 crowd(level,running){if(!this.ready||!crowdGain)return;crowdGain.gain.setTargetAtTime((running?.05:.03)+level*.16,now(),.25);crowdFilter.frequency.setTargetAtTime(560+level*500,now(),.3);
  if(Math.random()<(.012+level*.06))shout(now()+rnd(0,.1),{peak:.025+level*.05});},
 bell(n=1){if(!this.ready)return;const t=now();for(let i=0;i<n;i++){for(const [f,p] of [[880,.32],[1320,.14],[2210,.08],[2980,.05]])tone(t+i*.42,{type:'sine',f0:f,dur:1.6,peak:p,a:.002});burst(t+i*.42,{dur:.03,type:'highpass',f0:4000,peak:.2});}},
 whoosh(k=1){if(!this.ready)return;burst(now(),{dur:.14*k,f0:2600,f1:700,q:1.6,peak:.10*k,a:.03});},
 hit(kind,head,power,crit){if(!this.ready)return;const t=now(),p=Math.min(1.4,.5+power/10);
  if(head){burst(t,{dur:.05,type:'highpass',f0:1800,peak:.55*p});burst(t,{dur:.09,f0:900,f1:300,q:1,peak:.45*p});tone(t,{f0:kind==='uppercut'?150:130,f1:55,dur:.12,peak:.55*p});
   if(kind==='uppercut'||crit){burst(t+.01,{dur:.03,type:'highpass',f0:3500,peak:.35});}}
  else{tone(t,{f0:95,f1:42,dur:.18,peak:.8*p});burst(t,{dur:.1,type:'lowpass',f0:500,peak:.5*p});}
  if(power>7||crit){ooh(t+.05,.2);}else if(Math.random()<.3)shout(t+.08,{peak:.07});},
 block(){if(!this.ready)return;const t=now();tone(t,{f0:160,f1:90,dur:.08,peak:.35});burst(t,{dur:.06,type:'lowpass',f0:900,peak:.35});},
 dodge(){if(!this.ready)return;this.whoosh(1.1);if(Math.random()<.4)shout(now()+.1,{peak:.06});},
 down(){if(!this.ready)return;const t=now();tone(t,{f0:70,f1:30,dur:.35,peak:1});burst(t,{dur:.25,type:'lowpass',f0:400,peak:.7});roar(t+.05,.4,2.2);},
 tooth(){if(!this.ready)return;const t=now();tone(t+.25,{type:'triangle',f0:3200,dur:.06,peak:.18});tone(t+.42,{type:'triangle',f0:2800,dur:.05,peak:.12});tone(t+.55,{type:'triangle',f0:3000,dur:.04,peak:.07});ooh(t,.18);},
 skull(){if(!this.ready)return;const t=now();tone(t,{f0:80,f1:28,dur:.5,peak:1});burst(t,{dur:.04,type:'highpass',f0:3500,peak:.7});burst(t+.03,{dur:.05,type:'highpass',f0:2200,peak:.5});burst(t+.09,{dur:.04,type:'highpass',f0:4200,peak:.4});burst(t+.2,{dur:.3,type:'lowpass',f0:600,peak:.5});ooh(t+.15,.4);},
 step(){if(!this.ready)return;if(Math.random()<.5)burst(now(),{dur:.05,type:'highpass',f0:2500,peak:.05});},
 end(how){if(!this.ready)return;this.bell(3);roar(now()+.1,.5,3);},
 event(e,f){if(!this.ready)return;switch(e.type){
  case 'throw':this.whoosh(e.kind==='gerade'?.7:1);break;
  case 'hit':this.hit(e.kind,e.head,e.power,e.crit);if(e.skull)this.skull();break;
  case 'block':this.block();break;case 'dodge':case 'evade':this.dodge();break;case 'backstep':burst(now(),{dur:.07,type:'highpass',f0:1800,peak:.12});burst(now()+.09,{dur:.06,type:'highpass',f0:2200,peak:.1});break;case 'miss':break;
  case 'down':this.down();break;case 'tooth':this.tooth();break;case 'end':this.end(e.how);break;case 'rise':roar(now(),.25,1.2);break;}}
};
window.BXS=S;
})();
