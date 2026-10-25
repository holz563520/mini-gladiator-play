'use strict';
// HUNDE · LAUTE (künstlich erzeugt, WebAudio): Bellen, Knurren, Schnauben, Jaulen, Todesschrei, Winseln, Schütteln.
// Lautpaket je Rasse in DOG.BREEDS[..].sound, Tonhöhe nach Gewicht. Für Spiel und Hunde-Labor (prototypes/hunde).
// Schnittstelle: DOG.audio = {ac, bus, noiseBuf, play, playFor, allow}. Wann gespielt wird, entscheidet der Benutzer
// (Spiel: hundefang.js, Labor: prototypes/hunde/src/ui.js) über DOG.playSound / DOG.sound.
(()=>{
const DOG=window.DOG;if(!DOG)return;const cl=window.MG.clamp;
let AC=null;const lastS={};
function ac(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){AC=null;}}if(AC?.state==='suspended')AC.resume();return AC;}
const VOLUME=.3,BARK_VOL=.6;// Lautstärke: alles etwa halb so laut wie zuvor, Bellen nochmals leiser
function noiseBuf(a,sec){const b=a.createBuffer(1,Math.ceil(a.sampleRate*sec),a.sampleRate),d=b.getChannelData(0);let last=0;for(let i=0;i<d.length;i++){const w=Math.random()*2-1;last=last*.6+w*.4;d[i]=last*1.6;}return b;}
// Ausgang: Kompressor gegen Übersteuern, etwas Raumhall (Gewölbe/Arena)
function bus(a){if(a._bus)return a._bus;const master=a.createGain();master.gain.value=VOLUME;master.connect(a.destination);const comp=a.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.connect(master);
 const len=Math.floor(a.sampleRate*1.2),ir=a.createBuffer(2,len,a.sampleRate);for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.4)*.5;}
 const rev=a.createConvolver();rev.buffer=ir;const wet=a.createGain();wet.gain.value=.2;rev.connect(wet).connect(comp);a._bus={dry:comp,rev};return a._bus;}
// Stimme: Sägezahn mit Zittern (Kehlkopf), optional Knarren (Stimmbänder flattern), Atemrauschen, Mundraum als Formantfilter
function voice(a,t0,dur,{f0,jitter=.02,fry=0,fryRate=32,noise=.15,noiseF=1400,formants,lp=4000,att=.012,rel=.15,peak=.8,swell=null}){
 const B=bus(a),mix=a.createGain(),env=a.createGain(),filt=a.createBiquadFilter();filt.type='lowpass';filt.frequency.value=lp;mix.connect(filt).connect(env);env.connect(B.dry);const send=a.createGain();send.gain.value=.6;env.connect(send).connect(B.rev);
 const o=a.createOscillator();o.type='sawtooth';const n=Math.ceil(dur/.01);for(let i=0;i<=n;i++){const u=i/n;o.frequency.setValueAtTime(Math.max(18,f0(u)*(1+(Math.random()*2-1)*jitter)),t0+u*dur);}
 let src=o;if(fry){// Knarren: unregelmäßige Pulse als Lautstärke
  const am=a.createGain();am.gain.value=1-fry;const len=Math.ceil(a.sampleRate*(dur+.1)),pb=a.createBuffer(1,len,a.sampleRate),d=pb.getChannelData(0);let i=0;while(i<len){const per=Math.floor(a.sampleRate/(fryRate*(.7+Math.random()*.6))),on=Math.floor(per*(.25+Math.random()*.2));for(let j=0;j<on&&i+j<len;j++)d[i+j]=fry*(1-j/on);i+=per;}
  const ps=a.createBufferSource();ps.buffer=pb;ps.connect(am.gain);o.connect(am);src=am;ps.start(t0);ps.stop(t0+dur+.1);}
 for(const F of formants){const bp=a.createBiquadFilter();bp.type='bandpass';bp.Q.value=F.q;const g=a.createGain();g.gain.value=F.g;
  if(Array.isArray(F.f)){bp.frequency.setValueAtTime(F.f[0],t0);for(let i=1;i<F.f.length;i++)bp.frequency.linearRampToValueAtTime(F.f[i],t0+dur*i/(F.f.length-1));}else bp.frequency.value=F.f;src.connect(bp).connect(g).connect(mix);}
 if(noise){const ns=a.createBufferSource();ns.buffer=noiseBuf(a,dur+.1);const bp=a.createBiquadFilter();bp.type='bandpass';bp.frequency.value=noiseF;bp.Q.value=.8;const g=a.createGain();g.gain.value=noise;ns.connect(bp).connect(g).connect(mix);ns.start(t0);ns.stop(t0+dur+.1);}
 env.gain.setValueAtTime(.0001,t0);env.gain.exponentialRampToValueAtTime(peak,t0+att);
 if(swell)for(const [u,v] of swell)env.gain.linearRampToValueAtTime(peak*v,t0+u*dur);
 env.gain.setValueAtTime(peak*.55,t0+dur-rel);env.gain.exponentialRampToValueAtTime(.0001,t0+dur);o.start(t0);o.stop(t0+dur+.05);}
// Brustresonanz (tiefer Schlag beim Bellen)
function thump(a,t0,f,dur,g){const B=bus(a),o=a.createOscillator();o.type='sine';o.frequency.setValueAtTime(f*1.4,t0);o.frequency.exponentialRampToValueAtTime(f,t0+dur*.6);const e=a.createGain();e.gain.setValueAtTime(.0001,t0);e.gain.exponentialRampToValueAtTime(g,t0+.01);e.gain.exponentialRampToValueAtTime(.0001,t0+dur);o.connect(e).connect(B.dry);o.start(t0);o.stop(t0+dur+.02);}
// Lautpaket der Rasse (aus DOG.BREEDS[..].sound): Mastiff = tief, dumpf, selten bellend, schnaubt, dunkles Knurren
let SP=null;const DEF_SP={barkF:150,barkF1:[780,560,430],barkF2:[1300,1000,820],barkLen:.32,growlF:64,growlLp:2200,yelpF:560,whineF:700,vol:1};
function profileOf(x){const D=x?.dog||x;return DOG.BREEDS.find(b=>b.id===D?.breed)?.sound||DEF_SP;}
function play(kind,pitch=1,vol=1){const a=ac();if(!a)return;const t0=a.currentTime+.01,P=pitch,sp=SP||DEF_SP,v=vol*(sp.vol||1);
 if(kind==='bark'){// tiefes, dumpfes „WUFF“ aus der Brust
  const F=sp.barkF*P*(.95+Math.random()*.1),d=sp.barkLen+Math.random()*.06,vb=v*BARK_VOL;
  voice(a,t0,d,{f0:u=>F*(u<.2?.85+u*.9:1.03-(u-.2)*.5),jitter:.04,fry:.35,fryRate:F/2.3,noise:.3,noiseF:900,att:.02,rel:.18,peak:.85*vb,lp:2200,
   formants:[{f:sp.barkF1,q:3,g:1.2},{f:sp.barkF2,q:4.5,g:.45},{f:2300,q:8,g:.1},{f:260,q:2,g:.6}],swell:[[.18,1],[.5,.5]]});
  thump(a,t0,58*P,.2,.6*vb);}
 else if(kind==='huff'){// Schnauben: kurzer, tiefer Atemstoß durch die Nase
  voice(a,t0,.22,{f0:()=>85*P,jitter:.08,fry:.8,fryRate:22,noise:.9,noiseF:700,att:.015,rel:.15,peak:.45*v,lp:1100,formants:[{f:420,q:2,g:.6},{f:900,q:3,g:.3}]});}
 else if(kind==='growl'||kind==='shake'||kind==='snarl'){// Knurren: tiefe, knarrende Stimme in Atemwellen
  const closed=kind==='shake',d=kind==='growl'?1.4+Math.random()*.6:kind==='snarl'?.5:.6,F=(kind==='snarl'?sp.growlF*1.6:sp.growlF)*P;
  voice(a,t0,d,{f0:u=>F*(1+.07*Math.sin(u*TAU*2.2)+(kind==='snarl'?u*.35:0)),jitter:.07,fry:.7,fryRate:kind==='snarl'?40:26,noise:kind==='growl'?.1:.25,noiseF:closed?600:900,att:kind==='growl'?.3:.05,rel:.3,peak:(kind==='growl'?.6:.75)*v,lp:closed?650:kind==='snarl'?2600:sp.growlLp,
   formants:[{f:closed?280:kind==='snarl'?560:340,q:3,g:1.1},{f:closed?650:kind==='snarl'?1300:820,q:4,g:.45},{f:2100,q:7,g:.1}],swell:kind==='growl'?[[.25,1],[.5,.65],[.65,1],[.9,.7]]:null});}
 else if(kind==='yelp'||kind==='death'){// Jaulen (tief für große Hunde)
  const d=kind==='death'?1.3:.24,F=sp.yelpF*P;
  voice(a,t0,d,{f0:u=>kind==='death'?F*(u<.12?1+u*4:1.5-(u-.12)*1):F*(u<.3?1+u*1.6:1.5-(u-.3)*1.3),jitter:.03,noise:.1,noiseF:1800,att:.012,rel:kind==='death'?.5:.08,peak:.5*v,
   formants:[{f:800,q:4,g:1},{f:1600,q:6,g:.45},{f:2700,q:8,g:.12}]});}
 else if(kind==='whine'){// Winseln durch die Nase
  voice(a,t0,.8,{f0:u=>sp.whineF*P*(1+.22*Math.sin(u*Math.PI))*(1+.03*Math.sin(u*TAU*6)),jitter:.01,noise:.04,att:.06,rel:.25,peak:.25*v,formants:[{f:480,q:3,g:.6},{f:1300,q:7,g:1},{f:2600,q:8,g:.2}]});}}
const TAU=Math.PI*2;
// Tonhöhe: schwerer Hund der Rasse = etwas tiefer
const pitchOf=d=>{const D=d?.dog||d,B=DOG.BREEDS.find(b=>b.id===D?.breed);return cl(Math.pow((B?.kg0||80)/(D?.weight||80),.25),.85,1.15);};
// nicht aufdringlich: höchstens ein Laut alle 0,7 s (Treffer-Jaulen und Schütteln ausgenommen), gleiche Art seltener
let lastAny=0;function allow(kind,key,gap){const now=performance.now();if(!['yelp','shake','death'].includes(kind)&&now-lastAny<700)return false;if(now-(lastS[key]||0)<gap)return false;lastS[key]=now;lastAny=now;return true;}
function playFor(kind,d,vol){SP=profileOf(d);play(kind,pitchOf(d)*(.96+Math.random()*.08),vol);SP=null;}
DOG.audio={ac,bus,noiseBuf,play,playFor,allow};
})();
