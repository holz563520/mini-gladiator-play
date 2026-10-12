'use strict';
// =====================================================================================================
// KAPITEL 2 · KAMPFGERÄUSCHE FÜR DEN DORFPLATZ (Hahn gegen Hahn), alles mit Web Audio erzeugt, keine Dateien
// Flügelschlagen, Schnabelhieb, Klauenschnitt, Luftzug beim Verfehlen, Kreischen des Getroffenen, Volltreffer mit Raunen
// der Menge, K.O.-Aufprall, Todesstille mit Aufstöhnen, Krähen des Siegers, leises Gemurmel der Zuschauer im Hintergrund.
// Schalter: S.options.sound (wie die Geräusche des Spiels).
// =====================================================================================================
(()=>{
const M=window.MG,HS=window.HS;let ctx=null,out=null,noise=null,amb=null;
function on(){return M.s.options?.sound!==false&&!document.hidden;}
function init(){if(ctx)return ctx.state!=='closed';const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;try{ctx=new AC();out=ctx.createGain();out.gain.value=.55;const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;out.connect(comp);comp.connect(ctx.destination);
 const len=ctx.sampleRate*2,buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;noise=buf;return true;}catch{ctx=null;return false;}}
const now=()=>ctx.currentTime,rnd=(a,b)=>a+Math.random()*(b-a);
function env(g,t,a,peak,dur){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);}
function burst(t,{dur=.08,type='bandpass',f0=1200,f1=null,q=1.2,peak=.5,a=.004}={}){const s=ctx.createBufferSource();s.buffer=noise;s.playbackRate.value=rnd(.9,1.1);const f=ctx.createBiquadFilter();f.type=type;f.Q.value=q;f.frequency.setValueAtTime(f0,t);if(f1)f.frequency.exponentialRampToValueAtTime(f1,t+dur);const g=ctx.createGain();env(g,t,a,peak,dur);s.connect(f);f.connect(g);g.connect(out);s.start(t,rnd(0,1.5));s.stop(t+dur+.05);}
function tone(t,{type='sine',f0=200,f1=null,dur=.1,peak=.4,a=.004,filt=null,vib=0}={}){const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur);const g=ctx.createGain();env(g,t,a,peak,dur);let node=o;
 if(vib){const l=ctx.createOscillator(),lg=ctx.createGain();l.frequency.value=vib;lg.gain.value=f0*.04;l.connect(lg);lg.connect(o.frequency);l.start(t);l.stop(t+dur+.05);}
 if(filt){const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=filt;f.Q.value=2.5;o.connect(f);node=f;}node.connect(g);g.connect(out);o.start(t);o.stop(t+dur+.05);}
const SFX={
 flap(n=4){const t=now();for(let i=0;i<n;i++)burst(t+i*rnd(.055,.075),{dur:.05,f0:rnd(500,800),q:.8,peak:.32});},
 whoosh(){burst(now(),{dur:.18,f0:2400,f1:600,q:1.5,peak:.22,a:.03});},
 peck(sev=1){const t=now();tone(t,{f0:220,f1:70,dur:.09,peak:.5+sev*.1});burst(t,{dur:.025,type:'highpass',f0:3500,peak:.35});},
 claw(sev=1){const t=now();burst(t,{dur:.16,f0:3200,f1:900,q:2,peak:.42+sev*.08});burst(t+.05,{dur:.12,f0:2600,f1:700,q:2,peak:.3});tone(t,{f0:160,f1:60,dur:.08,peak:.3});},
 squawk(){const t=now(),f=rnd(850,1100);tone(t,{type:'sawtooth',f0:f,f1:f*1.5,dur:.07,peak:.18,filt:1600});tone(t+.07,{type:'sawtooth',f0:f*1.5,f1:f*.8,dur:.12,peak:.16,filt:1400});},
 crowd(level=1){const t=now();burst(t,{dur:1.1*level,type:'bandpass',f0:500,f1:700,q:.6,peak:.18*level,a:.25});for(let i=0;i<3;i++)tone(t+i*.03,{type:'sawtooth',f0:rnd(180,260),f1:rnd(220,320),dur:.9*level,peak:.035*level,a:.3,filt:rnd(450,650),vib:5});},
 crit(){this.crowd(1.3);const t=now();tone(t,{f0:120,f1:45,dur:.22,peak:.6});},
 ko(){const t=now();tone(t,{f0:140,f1:40,dur:.35,peak:.6});burst(t,{dur:.3,type:'lowpass',f0:500,peak:.35});setTimeout(()=>ctx&&this.crowd(1.5),250);},
 death(){const t=now();tone(t,{f0:110,f1:35,dur:.5,peak:.6});setTimeout(()=>{if(!ctx)return;const t2=now();for(let i=0;i<4;i++)tone(t2+i*.04,{type:'sawtooth',f0:rnd(260,330),f1:rnd(150,190),dur:1.2,peak:.04,a:.08,filt:500,vib:4});},300);},
 crow(){const t=now(),seq=[[620,700,.11],[760,880,.11],[700,760,.13],[900,1180,.62]];let k=t;for(const [a,b,d] of seq){tone(k,{type:'sawtooth',f0:a,f1:b,dur:d,peak:.16,filt:1500,vib:d>.3?7:0});tone(k,{type:'square',f0:a*2,f1:b*2,dur:d,peak:.03,filt:2400});k+=d+.03;}setTimeout(()=>ctx&&this.crowd(1.2),900);},
 ambient(onOff){if(onOff&&!amb){const s=ctx.createBufferSource();s.buffer=noise;s.loop=true;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=380;const g=ctx.createGain();g.gain.value=0;g.gain.linearRampToValueAtTime(.07,now()+1.5);s.connect(f);f.connect(g);g.connect(out);s.start();amb={s,g};}
  else if(!onOff&&amb){const a=amb;amb=null;a.g.gain.cancelScheduledValues(now());a.g.gain.setValueAtTime(a.g.gain.value,now());a.g.gain.linearRampToValueAtTime(0,now()+.6);setTimeout(()=>{try{a.s.stop();}catch{}},700);}}};
// Aufruf über HS.sfx.play('peck', …): stumm, wenn die Geräusche aus sind oder Web Audio fehlt
HS.sfx={play(name,...a){if(!on()&&!(name==='ambient'&&a[0]===false))return;if(!init())return;if(ctx.state==='suspended')ctx.resume();try{SFX[name]?.(...a);}catch(e){console.warn(e);}},stop(){if(ctx&&amb)SFX.ambient(false);}};
})();
