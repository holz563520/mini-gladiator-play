'use strict';
/* Zuschauer-Kulisse der Arena (Wunsch Thomas 10.11.2026)
   Durchgängige Publikumsgeräusche passend zum Kampf, gemeinsam mit der Musik im Vordergrund:
   - Murmeln der Ränge (immer da) und Brüllen der Menge (steigt mit der Aufregung), beides als nahtlose Schleifen,
     einmal beim ersten Kampf im Hintergrund gerechnet (OfflineAudioContext, kein Ruckeln).
   - Klatschen im Takt, Stampfen, Pfiffe, einzelne Rufe aus der Menge mit den Namen der Kämpfer („Los Marcellus!“),
     gesprochen mit der Sprachausgabe (schrei-worker.js, eigener Hintergrund-Thread).
   - Verletzungen, Niederschläge, Tötungen, abgetrennte Glieder: die Menge feuert den Täter über längere Zeit an,
     Helden (bekannte, siegreiche Kämpfer) deutlich länger und wilder. Wird ein Held verletzt, feuern sie ihn an.
   - Die Kämpfer selbst (Schläge, Schreie, Kampfrufe) klingen in der Arena weiter weg und hallend (distance(), in audio.js
     eingehängt); je lauter die Menge, desto mehr treten sie zurück.
   Reine Darstellung: liest den Kampf nur, ändert nichts an Simulation, Zufall oder Spielstand.
   Einstellbar im Toneditor (kampfsound-editor.html, Abschnitt „Zuschauer“), gespeichert unter localStorage „mg-zuschauer-v1“. */
(()=>{
const W=window,KEY='mg-zuschauer-v1';
const DEF={vol:1,murmur:.6,roar:.85,claps:.75,calls:.7,whistles:.45,stomps:.55,callRate:1,cheerLen:1,hero:1,fightDry:.5,fightWet:.34,fightTone:3200,fightDuck:.4,impactDry:1,impactWet:.22,swells:.8,variety:1};
const FIELDS=[['vol','Publikum gesamt',0,2,.01],['murmur','Murmeln',0,2,.01],['roar','Brüllen/Jubel',0,2,.01],['claps','Klatschen',0,2,.01],['calls','Rufe (Namen)',0,2,.01],
 ['whistles','Pfiffe',0,2,.01],['stomps','Stampfen',0,2,.01],['callRate','Rufe Häufigkeit',.2,3,.05],['cheerLen','Anfeuern Dauer',.3,3,.05],['hero','Helden extra',0,3,.05],
 ['fightDry','Kämpfer direkt',0,1.2,.01],['fightWet','Kämpfer Hall',0,1.2,.01],['fightTone','Kämpfer dumpf (Hz)',600,20000,50],['fightDuck','Kämpfer leiser bei Jubel',0,1,.01],
 ['impactDry','Block/Knacken/Treffer direkt',0,1.5,.01],['impactWet','Block/Knacken Hall',0,1,.01],['swells','Ooh/Aah/Uuh der Menge',0,2,.01],['variety','Abwechslung',0,2,.05]];
let S=load();
function load(){const o={...DEF};try{const s=JSON.parse(W.localStorage?.getItem(KEY)||'{}');for(const k in DEF)if(typeof s[k]==='number'&&isFinite(s[k]))o[k]=s[k];}catch{}return o;}
function save(p){for(const k in p)if(k in DEF&&isFinite(+p[k]))S[k]=+p[k];try{W.localStorage?.setItem(KEY,JSON.stringify(S));}catch{}}
function reset(){S={...DEF};try{W.localStorage?.removeItem(KEY);}catch{}}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),R=Math.random,pick=a=>a[Math.floor(R()*a.length)];
function rng(seed){let s=seed>>>0||1;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}

// ---------- Kämpfer weiter weg und hallend ----------
// Eingang → (Tiefpass) → direkt; Eingang → Tiefpass → Vorverzögerung → Hall der Arena (Mauern, Ränge) → zurück.
function impulse(ctx,dur=2.3){const sr=ctx.sampleRate,n=Math.floor(sr*dur),b=ctx.createBuffer(2,n,sr);
 for(let c=0;c<2;c++){const d=b.getChannelData(c);let lp=0;for(let i=0;i<n;i++){const u=i/n;lp+=((R()*2-1)-lp)*(.6-.45*u);d[i]=lp*Math.pow(1-u,2)*Math.exp(-i/sr*1.4);}
  for(const [t,a] of [[.017,.55],[.029,.42],[.043,.33],[.061,.26],[.084,.2],[.113,.14]]){const i=Math.floor((t+(c?.0045:0))*sr);if(i<n)d[i]+=a*(R()<.5?-1:1);}}
 return b;}
function distance(ctx,dest){const impact=ctx.createGain(),iDry=ctx.createGain(),iWet=ctx.createGain(),input=ctx.createGain(),tone=ctx.createBiquadFilter(),dry=ctx.createGain(),wf=ctx.createBiquadFilter(),pre=ctx.createDelay(.3),conv=ctx.createConvolver(),wet=ctx.createGain();
 tone.type='lowpass';tone.frequency.value=20000;tone.Q.value=.4;wf.type='lowpass';wf.frequency.value=3600;pre.delayTime.value=.05;conv.buffer=impulse(ctx);dry.gain.value=1;wet.gain.value=0;
 input.connect(tone);tone.connect(dry);dry.connect(dest);impact.connect(iDry);iDry.connect(dest);impact.connect(iWet);iWet.connect(wf);iWet.gain.value=0;input.connect(wf);wf.connect(pre);pre.connect(conv);conv.connect(wet);wet.connect(dest);
 let last='';return {input,impact,update(arena,E=0){const t=ctx.currentTime,d=arena?S.fightDry*(1-S.fightDuck*clamp(E,0,1)):1,w=arena?S.fightWet:0,f=arena?S.fightTone:20000,id=arena?S.impactDry:1,iw=arena?S.impactWet:0,k=d.toFixed(3)+w.toFixed(3)+f+id+iw;if(k===last)return;last=k;iDry.gain.setTargetAtTime(id,t,.2);iWet.gain.setTargetAtTime(iw,t,.3);
  dry.gain.setTargetAtTime(d,t,.25);wet.gain.setTargetAtTime(w,t,.35);tone.frequency.setTargetAtTime(f,t,.2);}};}

// ---------- Schleifen: Murmeln und Brüllen ----------
const VOW={a:[800,1250,2600],o:[480,850,2500],e:[520,1750,2550],i:[330,2100,2900],u:[350,700,2400],ä:[660,1650,2500]};
function offline(ch,len,sr){const C=W.OfflineAudioContext||W.webkitOfflineAudioContext;if(!C)return null;try{return new C(ch,len,sr);}catch{return null;}}
function renderOff(oc){return new Promise((res,rej)=>{try{oc.oncomplete=e=>res(e.renderedBuffer);const p=oc.startRendering();if(p&&p.then)p.then(res,rej);}catch(e){rej(e);}});}
async function bed(ctx,kind,seed){const sr=22050,dur=kind==='murmur'?9:8,X=.8,T=dur+X,len=Math.floor(T*sr),oc=offline(2,len,sr);if(!oc)return null;const r=rng(seed||(kind==='murmur'?11:23));
 const nb=oc.createBuffer(1,sr*3,sr),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=r()*2-1;
 const bus=oc.createGain(),lp=oc.createBiquadFilter();lp.type='lowpass';lp.frequency.value=kind==='murmur'?2300:5600;bus.connect(lp);lp.connect(oc.destination);
 const RES=100,N=Math.ceil(T*RES)+2,voices=kind==='murmur'?28:36;
 for(let v=0;v<voices;v++){const fem=r()<.22,base=kind==='murmur'?(fem?195+r()*40:98+r()*45):(fem?290+r()*90:150+r()*95);
  const A=new Float32Array(N),F0=new Float32Array(N).fill(base),F=[0,1,2].map(()=>new Float32Array(N).fill(0));let vw=VOW.a;
  const put=(i,a,f,vo)=>{if(i<0||i>=N)return;A[i]=Math.max(A[i],a);F0[i]=f;for(let k=0;k<3;k++)F[k][i]=vo[k]*(fem?1.12:1);};
  let t=r()*1.2;
  if(kind==='murmur')while(t<T){const ph=.8+r()*1.8,syl=[];let s=t;while(s<t+ph){const d=.1+r()*.14;syl.push([s,d,pick('aoeiuä'),.4+r()*.6]);s+=d;}
   for(const [s,d,vo,a] of syl){vw=VOW[vo];for(let i=Math.floor(s*RES);i<(s+d)*RES;i++){const u=(i/RES-s)/d,q=(i/RES-t)/ph;put(i,a*Math.pow(Math.sin(Math.PI*clamp(u,0,1)),.7),base*(1.08-.16*q)*(1+.03*Math.sin(i*.7)),vw);}}
   t+=ph+.25+r()*1.4;}
  else while(t<T){const d=.7+r()*1.8,at=.12+r()*.25,rel=.3+r()*.35,vo=VOW[pick('aaaooeä')],a=.5+r()*.5,f=base*(.92+r()*.16);
   for(let i=Math.floor(t*RES);i<(t+d)*RES;i++){const x=i/RES-t,e=x<at?x/at:x>d-rel?Math.max(0,(d-x)/rel):1;put(i,a*e,f*(1+.06*x/d)*(1+.015*Math.sin(x*2*Math.PI*5.5)+.01*(r()-.5)),vo);}
   t+=d*(.55+r()*.5)+r()*.35;}
  for(let i=1;i<N;i++){if(!F[0][i])for(let k=0;k<3;k++)F[k][i]=F[k][i-1]||vw[k];}for(let i=0;i<N;i++)if(!F[0][i])for(let k=0;k<3;k++)F[k][i]=VOW.a[k];
  const osc=oc.createOscillator(),ns=oc.createBufferSource(),vg=oc.createGain(),ng=oc.createGain(),env=oc.createGain(),pan=oc.createStereoPanner(),g3=oc.createGain(),out=oc.createGain();
  osc.type='sawtooth';ns.buffer=nb;ns.loop=true;vg.gain.value=kind==='murmur'?.3:.5;ng.gain.value=kind==='murmur'?.7:.4;g3.gain.value=.35;env.gain.value=0;pan.pan.value=(r()*2-1)*.92;out.gain.value=(.45+r()*.55)*(kind==='murmur'?1:.9);
  const fl=[0,1,2].map(k=>{const f=oc.createBiquadFilter();f.type='bandpass';f.Q.value=[5,7,8][k];return f;});
  osc.connect(vg);ns.connect(ng);for(const s of [vg,ng])for(const f of fl)s.connect(f);fl[0].connect(env);fl[1].connect(env);fl[2].connect(g3);g3.connect(env);env.connect(pan);pan.connect(out);out.connect(bus);
  env.gain.setValueCurveAtTime(A,0,T);osc.frequency.setValueCurveAtTime(F0,0,T);for(let k=0;k<3;k++)fl[k].frequency.setValueCurveAtTime(F[k],0,T);osc.start(0);ns.start(0,r()*2);}
 if(kind==='roar'){/* Körper der Menge: breites Rauschen und tiefes Grollen */for(const [type,f,q,g] of [['bandpass',1000,.6,.22],['lowpass',260,.7,.35]]){const s=oc.createBufferSource(),fi=oc.createBiquadFilter(),gn=oc.createGain(),p=oc.createStereoPanner();s.buffer=nb;s.loop=true;fi.type=type;fi.frequency.value=f;fi.Q.value=q;gn.gain.value=g;p.pan.value=type==='lowpass'?0:.3;s.connect(fi);fi.connect(gn);gn.connect(p);p.connect(bus);s.start(0,r());}}
 else{const s=oc.createBufferSource(),fi=oc.createBiquadFilter(),gn=oc.createGain();s.buffer=nb;s.loop=true;fi.type='lowpass';fi.frequency.value=600;gn.gain.value=.12;s.connect(fi);fi.connect(gn);gn.connect(bus);s.start(0);}
 const ren=await renderOff(oc),n=Math.floor(dur*sr),xn=Math.floor(X*sr),out=ctx.createBuffer(2,n,sr);
 let sq=0;for(let c=0;c<2;c++){const a=ren.getChannelData(c);for(let i=0;i<n;i++)sq+=a[i]*a[i];}const gain=Math.min((kind==='murmur'?.11:.15)/Math.sqrt(sq/(2*n)||1e-9),40);
 for(let c=0;c<2;c++){const a=ren.getChannelData(c),o=out.getChannelData(c);for(let i=0;i<n;i++){let v=a[i];if(i<xn){const u=i/xn;v=a[i]*Math.sin(u*Math.PI/2)+a[n+i]*Math.cos(u*Math.PI/2);}o[i]=clamp(v*gain,-.98,.98);}}
 return out;}
// Ooh/Aah/Uuh/Jaaa der Menge: kurze Stimmenwellen (26 Stimmen, Tonhöhe und Vokal gleiten)
const SW={ooh:{v:'o',v2:'u',rise:1.14,fall:.92,peak:.45,dur:1.7},aah:{v:'a',v2:'a',rise:1.06,fall:.96,peak:.55,dur:1.9},uuh:{v:'u',v2:'o',rise:1.02,fall:.74,peak:.18,dur:1.3},jaa:{v:'e',v2:'a',rise:1.22,fall:1.04,peak:.3,dur:1.15},huh:{v:'ä',v2:'o',rise:1.3,fall:.85,peak:.2,dur:.9}};
async function swell(ctx,kind,seed){const P=SW[kind],sr=22050,T=P.dur*1.35+.3,len=Math.floor(T*sr),oc=offline(2,len,sr);if(!oc)return null;const r=rng(seed);
 const nb=oc.createBuffer(1,sr*2,sr),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=r()*2-1;const bus=oc.createGain(),lp=oc.createBiquadFilter();lp.type='lowpass';lp.frequency.value=5000;bus.connect(lp);lp.connect(oc.destination);
 const RES=200,N=Math.ceil(T*RES)+2,mix=(a,b,u)=>a.map((x,k)=>x+(b[k]-x)*u);
 for(let v=0;v<26;v++){const fem=r()<.25,base=fem?260+r()*90:135+r()*85,st=r()*.2,d=P.dur*(.75+r()*.45),A=new Float32Array(N),F0=new Float32Array(N),F=[0,1,2].map(()=>new Float32Array(N));
  for(let i=0;i<N;i++){const x=i/RES-st,u=clamp(x/d,0,1),pk=P.peak,on=x>=0&&x<=d,a=!on?0:u<pk?Math.sin(u/pk*Math.PI/2):Math.pow(1-(u-pk)/(1-pk),1.4),fr=u<pk?1+(P.rise-1)*u/pk:P.rise+(P.fall-P.rise)*(u-pk)/(1-pk);
   A[i]=a*(.5+.5*(v%3?1:.7));F0[i]=base*fr*(1+.012*Math.sin(i*.17+v));const vo=mix(VOW[P.v],VOW[P.v2],u);for(let k=0;k<3;k++)F[k][i]=vo[k]*(fem?1.12:1);}
  const osc=oc.createOscillator(),ns=oc.createBufferSource(),vg=oc.createGain(),ng=oc.createGain(),env=oc.createGain(),pan=oc.createStereoPanner(),g3=oc.createGain();osc.type='sawtooth';ns.buffer=nb;ns.loop=true;vg.gain.value=.5;ng.gain.value=.35;g3.gain.value=.35;env.gain.value=0;pan.pan.value=(r()*2-1)*.92;
  const fl=[0,1,2].map(k=>{const f=oc.createBiquadFilter();f.type='bandpass';f.Q.value=[5,7,8][k];return f;});osc.connect(vg);ns.connect(ng);for(const s of [vg,ng])for(const f of fl)s.connect(f);fl[0].connect(env);fl[1].connect(env);fl[2].connect(g3);g3.connect(env);env.connect(pan);pan.connect(bus);
  env.gain.setValueCurveAtTime(A,0,T);osc.frequency.setValueCurveAtTime(F0,0,T);for(let k=0;k<3;k++)fl[k].frequency.setValueCurveAtTime(F[k],0,T);osc.start(0);ns.start(0,r());}
 const ren=await renderOff(oc),out=ctx.createBuffer(2,ren.length,sr);let sq=0;for(let c=0;c<2;c++){const a=ren.getChannelData(c);for(let i=0;i<a.length;i++)sq+=a[i]*a[i];}const g=Math.min(.16/Math.sqrt(sq/(2*ren.length)||1e-9),40);
 for(let c=0;c<2;c++){const a=ren.getChannelData(c),o=out.getChannelData(c);for(let i=0;i<a.length;i++)o[i]=clamp(a[i]*g,-.98,.98);}return out;}
// nacheinander gerechnet (kein Lastspitzen): erst je eine Schleife, dann Wellen, dann zweite Schleifen-Varianten
const BEDS=new WeakMap();function beds(ctx,onPart){let p=BEDS.get(ctx);if(!p){const R={m:[],r:[],sw:{}};p=(async()=>{try{
  R.m.push(await bed(ctx,'murmur',11));R.r.push(await bed(ctx,'roar',23));onPart?.(R);
  for(const [k,sd] of [['ooh',31],['uuh',32],['aah',33],['jaa',34],['huh',35],['ooh',41],['jaa',44],['uuh',42]]){const b=await swell(ctx,k,sd);if(b)(R.sw[k]||(R.sw[k]=[])).push(b);}onPart?.(R);
  R.m.push(await bed(ctx,'murmur',57));R.r.push(await bed(ctx,'roar',73));R.m=R.m.filter(Boolean);R.r=R.r.filter(Boolean);onPart?.(R);}catch{}return R;})();BEDS.set(ctx,p);}else if(onPart)p.then(onPart);return p;}

// ---------- Klatschen und Stampfen (direkt gerechnet, sehr billig) ----------
function echo(x,sr){const y=new Float32Array(x.length);for(let i=0;i<x.length;i++)y[i]=x[i];for(const [t,a] of [[.023,.3],[.041,.22],[.07,.14],[.11,.08]]){const o=Math.floor(t*sr);for(let i=o;i<x.length;i++)y[i]+=x[i-o]*a;}return y;}
function norm(x,peak=.9){let m=0;for(const v of x)m=Math.max(m,Math.abs(v));if(m>0)for(let i=0;i<x.length;i++)x[i]*=peak/m;return x;}
function clapInto(x,t0,sr,r,amp){const fc=850+r()*1900,q=1+r()*1.4,dec=(.005+r()*.011)*sr,w=2*Math.PI*fc/sr,al=Math.sin(w)/(2*q),a0=1+al,b0=al/a0,b2=-al/a0,a1=-2*Math.cos(w)/a0,a2=(1-al)/a0;let x1=0,x2=0,y1=0,y2=0;
 for(let i=0;i<dec*7&&t0+i<x.length;i++){const v=(r()*2-1)*Math.exp(-i/dec)*amp,y=b0*v+b2*x2-a1*y1-a2*y2;x2=x1;x1=v;y2=y1;y1=y;if(t0+i>=0)x[t0+i]+=y;}}
function claps(ctx,people,seed){const sr=24000,r=rng(seed),x=new Float32Array(Math.floor(.36*sr));for(let p=0;p<people;p++){const g=(r()+r()+r()-1.5)*.022;clapInto(x,Math.floor(Math.max(0,.03+g)*sr),sr,r,.4+r()*.6);}return buf(ctx,norm(echo(x,sr)),sr);}
// vereinzelter Beifall: ein paar Leute klatschen ungleichmäßig, jeder im eigenen Tempo
function ripple(ctx,people,seed){const sr=24000,r=rng(seed),L=2.6,x=new Float32Array(Math.floor(L*sr));for(let p=0;p<people;p++){const rate=3.2+r()*2.2,s=r()*.6,e=L-.2-r()*.9,amp=.3+r()*.7;for(let t=s;t<e;t+=1/rate*(.92+r()*.16)){const f=Math.min(1,(t-s)/.4)*Math.min(1,(e-t)/.5);clapInto(x,Math.floor(t*sr),sr,r,amp*f);}}return buf(ctx,norm(echo(x,sr),.8),sr);}
function stomp(ctx,seed){const sr=24000,r=rng(seed),x=new Float32Array(Math.floor(.45*sr));for(let p=0;p<34;p++){const t0=Math.floor((.02+(r()+r()-1)*.03)*sr),f=55+r()*35,a=.4+r()*.6;let lp=0;for(let i=0;i<.3*sr&&t0+i<x.length;i++){const t=i/sr;lp+=((r()*2-1)-lp)*.08;if(t0+i>=0)x[t0+i]+=a*(Math.sin(2*Math.PI*f*t)*Math.exp(-t/.06)+lp*2.5*Math.exp(-t/.025));}}return buf(ctx,norm(echo(x,sr),.9),sr);}
function buf(ctx,x,sr){const b=ctx.createBuffer(1,x.length,sr);b.getChannelData(0).set(x);return b;}

// ---------- Rufe aus der Menge ----------
const GEN=['Hau drauf','Weiter','Los','Schneller','Gib es ihm','Zeig es ihm','Auf ihn','Mach schon','Schlag zu','Pass auf','Hinter dir','Kämpft','Mehr Blut','Ave','Weiter so','Na los'],UP=['Steh auf','Komm schon','Halte durch','Nicht aufgeben','Kopf hoch'];
const MOOD={inj:['Hoc habet','Treffer','Blut','Jaaa','Ja ja ja','Noch mal','Bravo','So ist es gut','Gut so'],down:['Iugula','Bleib liegen','Töte ihn','Mach ihn fertig','Gib ihm den Rest','Steh auf'],kill:['Sieg','Bravo','Ave','Jaaa','Was für ein Kampf'],
 boo:['Langweilig','Kämpft endlich','Feiglinge','Buuh','Schlaft ihr','Tut was'],block:['Gut pariert','Knapp','Oh','Haha','Daneben'],crack:['Autsch','Uh','Das tat weh','Hoc habet']};
const first=n=>String(n||'').trim().split(/\s+/)[0].replace(/[^A-Za-zÄÖÜäöüß]/g,'');

function create(ctx,dest,opt={}){
 const out=ctx.createGain(),mur=ctx.createGain(),roar=ctx.createGain(),roarLP=ctx.createBiquadFilter(),fx=ctx.createGain();out.gain.value=0;mur.gain.value=0;roar.gain.value=0;roarLP.type='lowpass';roarLP.frequency.value=1200;fx.gain.value=1;
 out.connect(dest);mur.connect(out);roarLP.connect(roar);roar.connect(out);fx.connect(out);
 let active=false,stopT=0,B=null,last=ctx.currentTime,nextSwap=0;
 const CL={big:[],small:[],rip:[],stomp:[]};const st={E:.15,heat:0,base:.22,cheer:null,nextCall:0,nextRip:0,fighters:[],voicesFx:0,calls:0,mood:null,moodUntil:0,lastAct:ctx.currentTime,dip:0,chain:0,chainT:0,swellT:0,boo:false,nextBoo:0,lastPat:'',lastText:[]};
 function prepLocal(){if(CL.big.length)return;try{for(let i=0;i<4;i++)CL.big.push(claps(ctx,70,101+i));for(let i=0;i<3;i++)CL.small.push(claps(ctx,6,201+i));for(let i=0;i<4;i++)CL.rip.push(ripple(ctx,6+i*4,301+i));for(let i=0;i<3;i++)CL.stomp.push(stomp(ctx,401+i));}catch{}}
 // Schleife mit zwei Plätzen: wechselt alle 25–45 s weich zur anderen Variante (keine erkennbare Wiederholung)
 function layer(to){const g=[ctx.createGain(),ctx.createGain()],src=[null,null];g.forEach(x=>{x.gain.value=0;x.connect(to);});let cur=0,idx=0,bufs=null;
  const kill=i=>{if(src[i]){try{src[i].stop();src[i].disconnect();}catch{}src[i]=null;}};
  const play=(i,fade)=>{kill(i);const s=ctx.createBufferSource();s.buffer=bufs[idx];s.loop=true;s.connect(g[i]);s.start(0,R()*s.buffer.duration);src[i]=s;const t=ctx.currentTime;g[i].gain.cancelScheduledValues?.(t);g[i].gain.setValueAtTime(fade?0:1,t);if(fade)g[i].gain.setTargetAtTime(1,t,fade/3);};
  return {set(b){bufs=b&&b.length?b:null;},start(){if(bufs&&!src[cur])try{play(cur,0);}catch{}},stop(){kill(0);kill(1);},
   swap(){if(!bufs||bufs.length<2||!src[cur])return;try{const nx=1-cur,old=cur;idx=(idx+1)%bufs.length;play(nx,4);g[old].gain.setTargetAtTime(0,ctx.currentTime,1.3);const s=src[old];setTimeout(()=>{if(src[old]===s)kill(old);},6500);cur=nx;}catch{}}};}
 const LM=layer(mur),LR=layer(roarLP);
 beds(ctx,R=>{B=R;LM.set(R.m);LR.set(R.r);if(active){LM.start();LR.start();}});
 function setActive(on){if(on===active)return;active=on;clearTimeout(stopT);if(on){prepLocal();LM.start();LR.start();last=ctx.currentTime;st.lastAct=last;}else{out.gain.setTargetAtTime(0,ctx.currentTime,.35);st.cheer=null;stopT=setTimeout(()=>{if(!active){LM.stop();LR.stop();}},2500);}}
 // Sprachausgabe im eigenen Hintergrund-Thread (Rufe), eins nach dem anderen
 let wk=null,wkOk=typeof Worker==='function',job=null,seq=0;const Q=[],POOL=new Map(),PEND=new Set();
 function worker(){if(!wkOk)return null;if(wk)return wk;try{wk=new Worker((opt.base||'')+'schrei-worker.js?v='+(W.ARENA_BUILD||''));wk.onmessage=e=>done(e.data||{});wk.onerror=()=>{wkOk=false;wk=null;Q.length=0;job=null;PEND.clear();};}catch{wkOk=false;wk=null;}return wk;}
 function want(text,voices=1,front=false){if(!text)return;const key=text+'|'+voices;if((POOL.get(key)?.length||0)>=(voices>1?2:1)||PEND.has(key)||Q.length>90)return;PEND.add(key);const j={key,text,voices};if(front)Q.unshift(j);else Q.push(j);pump();}
 function pump(){if(job||!Q.length)return;const w=worker();if(!w)return;job=Q.shift();try{w.postMessage({type:'chant',name:job.text,voices:job.voices,room:.5,wild:job.voices>2,id:++seq,seed:Math.floor(R()*1e9)});}catch{PEND.delete(job.key);job=null;}}
 function done(Rm){const j=job;job=null;if(j){PEND.delete(j.key);if(!Rm.error&&Rm.data?.length){try{const b=ctx.createBuffer(1,Rm.data.length,Rm.sr||32000);b.getChannelData(0).set(Rm.data);const L=POOL.get(j.key)||[];L.push(b);POOL.set(j.key,L);}catch{}}}setTimeout(pump,40);}
 function takeCall(text,voices=1){const key=text+'|'+voices,L=POOL.get(key);if(!L?.length){want(text,voices);return null;}const i=Math.floor(R()*L.length),b=L[i];if(R()<.5){L.splice(i,1);want(text,voices);}return b;}
 function prepFighter(F,front){if(!F?.name)return;want(F.name,1,front);want('Los '+F.name,1,front);if(F.hero){want(F.name,3,front);want('Komm schon '+F.name,1,front);want('Bravo '+F.name,1);want('Ave '+F.name,3);}else if(S.variety>.5)want('Komm schon '+F.name,1);}
 // ---- Wiedergabe ----
 function play(b,at,vol,pan=0,rate=1,lp=0){if(!b||st.voicesFx>44)return;try{const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=b;s.playbackRate.value=rate;g.gain.value=vol;let n=s;if(lp){const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=lp;s.connect(f);n=f;}
  let p=null;if(pan&&ctx.createStereoPanner){p=ctx.createStereoPanner();p.pan.value=pan;n.connect(p);n=p;}n.connect(g);g.connect(fx);st.voicesFx++;s.onended=()=>{st.voicesFx--;try{s.disconnect();g.disconnect();p?.disconnect();}catch{}};s.start(Math.max(ctx.currentTime,at));}catch{}}
 function clap(at,v){const L=v>.45?CL.big:CL.small;if(!L.length)return;const k=S.claps*.5*v;play(pick(L),at,k,-.45,.96+R()*.08);play(pick(L),at+.006+R()*.01,k*.9,.45,.96+R()*.08);}
 function stompAt(at,v){if(CL.stomp.length)play(pick(CL.stomp),at,S.stomps*.7*v,(R()-.5)*.4,.95+R()*.1);}
 // Menge als Welle: Ooh (knapp, Block), Uuh (Knacken, Schmerz), Aah (Staunen), Jaaa (Treffer), Huh (Schreck)
 function swellK(kind,vol=1,at=0){const L=B?.sw?.[kind];if(!L?.length||S.swells<=0)return false;const t=ctx.currentTime;if(t<st.swellT)return false;st.swellT=t+.9;play(pick(L),t+.03+at,S.swells*.55*vol,(R()-.5)*.5,.93+R()*.14);return true;}
 // vorhandene Publikumsklänge aus kampfsound.js (Lachen, Buhen) sparsam dazu
 function ksCrowd(k,vol){const K=W.KampfSound;if(!K?.DEF?.[k])return;try{K.play(ctx,fx,k,{vol,pitch:.95+R()*.1});}catch{}}
 function whistle(at,v=1){if(st.voicesFx>44||S.whistles<=0)return;try{const o=ctx.createOscillator(),g=ctx.createGain(),p=ctx.createStereoPanner?ctx.createStereoPanner():null,f=1500+R()*1100,k=R(),F=o.frequency,vol=S.whistles*.055*v;let end;
  g.gain.setValueAtTime(0,at);
  if(k<.35){F.setValueAtTime(f*.72,at);F.exponentialRampToValueAtTime(f*1.28,at+.17);F.setValueAtTime(f*.78,at+.3);F.exponentialRampToValueAtTime(f*1.32,at+.48);F.exponentialRampToValueAtTime(f*.6,at+.78);
   g.gain.linearRampToValueAtTime(vol,at+.03);g.gain.setValueAtTime(vol,at+.15);g.gain.linearRampToValueAtTime(0,at+.2);g.gain.linearRampToValueAtTime(vol,at+.33);g.gain.setValueAtTime(vol,at+.7);g.gain.linearRampToValueAtTime(0,at+.8);end=at+.82;}
  else if(k<.6){const d=.45+R()*.5;F.setValueAtTime(f*1.15,at);F.linearRampToValueAtTime(f*1.25,at+d);g.gain.linearRampToValueAtTime(vol,at+.04);g.gain.setValueAtTime(vol,at+d-.06);g.gain.linearRampToValueAtTime(0,at+d);end=at+d+.02;}
  else if(k<.8){let t=at;for(let i=0;i<5;i++){F.setValueAtTime(f*(1+.08*(i%2)),t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.02);g.gain.linearRampToValueAtTime(0,t+.09);t+=.11;}end=t;}
  else{/* abfallender Pfiff (Spott) */F.setValueAtTime(f*1.3,at);F.exponentialRampToValueAtTime(f*.55,at+.7);g.gain.linearRampToValueAtTime(vol,at+.05);g.gain.setValueAtTime(vol,at+.55);g.gain.linearRampToValueAtTime(0,at+.72);end=at+.75;}
  o.type='sine';o.connect(g);if(p){p.pan.value=(R()*2-1)*.9;g.connect(p);p.connect(fx);}else g.connect(fx);st.voicesFx++;o.onended=()=>{st.voicesFx--;try{o.disconnect();g.disconnect();p?.disconnect();}catch{}};o.start(at);o.stop(end);}catch{}}
 // Ruf wählen, ohne denselben Satz kurz hintereinander
 function fresh(list){const c=list.filter(x=>!st.lastText.includes(x));return pick(c.length?c:list);}
 function call(text,voices,vol=1){const b=takeCall(text,voices);if(!b)return false;const far=R();play(b,ctx.currentTime+.02,S.calls*(.5+.35*(1-far))*vol*(voices>1?.85:1),(R()*2-1)*.85,.93+R()*.14,2600+(1-far)*4200);st.calls++;st.lastText.push(text);if(st.lastText.length>6)st.lastText.shift();return true;}
 function setMood(m,dur){st.mood=m;st.moodUntil=ctx.currentTime+dur;for(const t of MOOD[m]||[])want(t,1,true);}
 // ---- Kämpfer ----
 function fighter(id){return st.fighters.find(f=>f.id===id)||null;}
 function setFighters(list,freshFight){const old=new Set(st.fighters.map(f=>f.name));st.fighters=(list||[]).map(f=>({...f,name:first(f.name)})).filter(f=>f.name);
  if(freshFight){const keep=new Set([...GEN,...UP,'Hey','Ave',...Object.values(MOOD).flat()]);for(const k of [...POOL.keys()]){const t=k.split('|')[0];if(!keep.has(t)&&!st.fighters.some(f=>t.endsWith(f.name)))POOL.delete(k);}}
  const order=st.fighters.slice().sort((a,b)=>(b.hero?1:0)-(a.hero?1:0));for(const f of order)if(freshFight||!old.has(f.name))prepFighter(f);}
 function prepGeneric(){for(const t of GEN.slice(0,8))want(t,1);want('Hey',12);want('Ave',14);for(const t of UP.slice(0,3))want(t,1);for(const t of MOOD.inj.slice(0,4))want(t,1);for(const t of MOOD.down.slice(0,3))want(t,1);for(const t of GEN.slice(8))want(t,1);for(const k of ['kill','block','crack','boo'])for(const t of MOOD[k])want(t,1);}
 // ---- Anfeuern: Klatschmuster wechseln sich ab ----
 const PATS=['steady','double','hey','stomp','accel','rumble','ave'];
 function cheerFor(F,dur,level,pat){dur*=S.cheerLen;const t=ctx.currentTime,c=st.cheer;if(F)prepFighter(F,true);
  if(c&&t<c.until){c.until=Math.max(c.until,t+dur);c.level=Math.max(c.level*.92,level);if(F){c.for=F;c.hero=!!F.hero;if(F.hero)c.bpmMax=Math.max(c.bpmMax,150);}return;}
  if(!pat){const opts=PATS.filter(p=>p!==st.lastPat&&(S.variety>.3||p==='steady'||p==='hey'));pat=pick(opts.length?opts:['steady']);}st.lastPat=pat;
  const acc=pat==='accel';st.cheer={for:F||null,hero:!!F?.hero,until:t+dur,level,clapFrom:t+.5+R()*.7,beatT:t+.6,bpm:acc?96:F?.hero?126:116,bpmMax:acc?230:F?.hero?152:136,acc:acc?2.6:F?.hero?.45:.3,pat,n:0,start:t,burst:false};
  st.nextCall=Math.min(st.nextCall,t+.35);}
 function act(){st.lastAct=ctx.currentTime;if(st.boo){st.boo=false;}}
 function event(kind,o={}){if(!active)return;const F=o.by?(typeof o.by==='object'?o.by:fighter(o.by)):null,V=o.victim?(typeof o.victim==='object'?o.victim:fighter(o.victim)):null,h=F?.hero?1+.6*S.hero:1;act();
  if(kind==='hit'){st.heat+=.05*clamp(o.power??1,.2,1.5)*h;if(R()<.08*S.variety)swellK(R()<.5?'jaa':'huh',.5);return;}
  if(kind==='injury'){const sev=clamp(o.sev??.5,0,1);st.heat+=(.2+.3*sev)*h;setMood('inj',6);swellK(V?.hero&&!F?.hero?'uuh':sev>.6?'aah':'jaa',.8+.3*sev);
   if(V?.hero&&!F?.hero){cheerFor({...V,up:true},(6+6*sev)*(1+.5*S.hero),.6+.2*sev,'hey');}else cheerFor(F,(6+7*sev)*(F?.hero?1+.8*S.hero:1),.55+.25*sev+(F?.hero?.15:0));
   if(sev>.55)for(let i=0;i<2;i++)whistle(ctx.currentTime+.2+R()*.8);return;}
  if(kind==='down'){st.heat+=.45*h;setMood('down',8);swellK('aah',1);cheerFor(F,F?.hero?9+6*S.hero:9,.82);return;}
  if(kind==='kill'){st.heat+=.7*h;setMood('kill',10);swellK('aah',1.1);cheerFor(F,F?.hero?12+8*S.hero:12,.95);for(let i=0;i<3+Math.round(2*S.variety);i++)whistle(ctx.currentTime+.3+R()*1.8);return;}
  if(kind==='sever'){st.heat+=.55*h;setMood('crack',6);swellK('huh',1.1);cheerFor(F,10*(F?.hero?1+.5*S.hero:1),.88);for(let i=0;i<3;i++)whistle(ctx.currentTime+.2+R()*1.2);return;}
  if(kind==='swing'){st.heat+=.3;swellK('ooh',.8);const t=ctx.currentTime+.1;for(let i=0;i<4;i++)stompAt(t+i*.5,.8);return;}
  if(kind==='start'){st.heat+=.5;cheerFor(null,5,.65,'steady');return;}
  if(kind==='win'){st.heat+=.8;setMood('kill',12);cheerFor(o.by?F:null,10,1,'steady');for(let i=0;i<5;i++)whistle(ctx.currentTime+.3+R()*2);return;}}
 // Hinweise vom Ton: Block/Parade, Knacken, Sturz – Menge macht Platz (kurz leiser) und reagiert
 function notify(kind){if(!active)return;const t=ctx.currentTime;st.dip=t+(kind==='crack'?.35:.18);out.gain.cancelScheduledValues?.(t);out.gain.setTargetAtTime(S.vol*(kind==='crack'?.55:.7),t,.015);act();
  if(kind==='block'){st.chain=t-st.chainT<2.2?st.chain+1:1;st.chainT=t;st.heat+=.03;if(st.chain>=3&&R()<.55){swellK('ooh',.8);if(R()<.4)call(fresh(MOOD.block),1,.8);st.chain=0;}else if(R()<.1*S.variety)swellK('ooh',.45);}
  else if(kind==='crack'){st.heat+=.18;setTimeout(()=>{if(active){swellK('uuh',1.1);if(R()<.45)call(fresh(MOOD.crack),1);}},140);}
  else if(kind==='fall'){if(R()<.3*S.variety)ksCrowd(pick(['laugh1','laugh2','laugh3','laugh4','laugh5']),.28);else swellK('huh',.7);}}
 // ---- Takt ----
 function tick(){const t=ctx.currentTime,dt=clamp(t-last,0,.3);last=t;if(!active)return;
  const busy=!!opt.busy?.(),duck=opt.duck?.()?.6:1,c=st.cheer&&t<st.cheer.until?st.cheer:null;if(st.cheer&&!c)st.cheer=null;if(st.mood&&t>st.moodUntil)st.mood=null;
  st.heat=Math.min(.55,st.heat*Math.exp(-dt/2.6));let target=st.base+st.heat;if(c){const fade=clamp((c.until-t)/2.5,0,1);target=Math.max(target,c.level*(.35+.65*fade));}
  // Langeweile: lange nichts passiert → Buhen, Rufe, Pfeifkonzert
  const bored=!c&&t-st.lastAct>9&&st.E<.4;if(bored&&!st.boo){st.boo=true;st.nextBoo=t+.3;for(const x of MOOD.boo)want(x,1,true);}
  if(st.boo&&!bored)st.boo=false;
  target=Math.min(1,target);st.E+=(target-st.E)*(1-Math.exp(-dt/(target>st.E?.3:2.4)));const E=clamp(st.E,0,1);
  if(t>st.dip)out.gain.setTargetAtTime(S.vol*duck,t,.12);mur.gain.setTargetAtTime(S.murmur*(.6+.45*E),t,.3);roar.gain.setTargetAtTime(S.roar*.9*Math.pow(clamp((E-.1)/.9,0,1),1.35),t,.25);roarLP.frequency.setTargetAtTime(700+5200*E,t,.3);
  if(t>nextSwap){if(nextSwap){LM.swap();setTimeout(()=>LR.swap(),3000+R()*6000);}nextSwap=t+25+R()*20;}
  if(c&&!busy&&t>c.clapFrom){while(c.beatT<t+.25){const bt=c.beatT,j=clamp((bt-c.clapFrom)/2.2,.25,1)*clamp((c.until-bt)/1.8,0,1),n=c.n;
    if(c.pat==='steady')clap(bt,j);
    else if(c.pat==='double'){if(n%3<2)clap(bt,j);}                                   // klatsch-klatsch-Pause
    else if(c.pat==='stomp'){const m=n%4;if(m<2)stompAt(bt,j);else if(m===2)clap(bt,j);} // stampf-stampf-klatsch
    else if(c.pat==='accel'){clap(bt,j*(.7+.3*Math.min(1,(c.bpm-96)/120)));if(c.bpm>=c.bpmMax-1&&!c.burst){c.burst=true;st.heat+=.35;swellK('aah',1.1);ksCrowd('applause',.5);for(let i=0;i<3;i++)whistle(bt+.2+R());c.pat='steady';c.bpm=132;c.bpmMax=140;c.acc=.2;}} // immer schneller bis zum Ausbruch
    else if(c.pat==='rumble'){if(n%8<6)stompAt(bt,j*(.5+.08*(n%8)));else if(n%8===6)clap(bt,j);else{const h=takeCall('Hey',12);if(h&&j>.5)play(h,bt,S.calls*.75*j,0,1);else clap(bt,j);}} // Trommeln auf den Bänken
    else if(c.pat==='ave'){const m=n%8;if(m<3||(m>3&&m<7))clap(bt,j);else if(m===7){const h=takeCall('Ave',14);if(h&&j>.5)play(h,bt,S.calls*.7*j,0,1);else clap(bt,j);}}
    else{const m=n%4;if(m<3)clap(bt,j);else{const h=takeCall('Hey',12);if(h&&j>.5)play(h,bt,S.calls*.75*j,0,1);else clap(bt,j);}}
    c.n++;c.beatT+=60/c.bpm;c.bpm=Math.min(c.bpmMax,c.bpm+c.acc);}}
  else if(c&&busy)c.beatT=t+.3;
  if(!busy&&t>=st.nextCall&&S.calls>0){let ok=false;
   if(c){const F=c.for,mood=st.mood&&MOOD[st.mood];if(F&&R()<.62){ok=F.up?call(R()<.45?F.name:R()<.5?'Komm schon '+F.name:fresh(UP),1):call(F.hero&&R()<.3?F.name:F.hero&&R()<.25?'Bravo '+F.name:R()<.45?'Los '+F.name:R()<.3?'Komm schon '+F.name:F.name,F.hero&&R()<.3?3:1);}
    if(!ok&&mood&&R()<.7)ok=call(fresh(mood),R()<.15*S.variety?2:1);if(!ok)ok=call(fresh(GEN),1);st.nextCall=t+(c.hero?.7+R()*.9:1.1+R()*1.3)/S.callRate;}
   else if(st.boo){ok=call(fresh(MOOD.boo),R()<.3?2:1);st.nextCall=t+(1.4+R()*2)/S.callRate;}
   else{const alive=st.fighters.filter(f=>f.alive!==false);if(alive.length&&R()<.62){const w=alive.map(f=>f.hero?3:1),sum=w.reduce((a,b)=>a+b,0);let x=R()*sum,F=alive[0];for(let i=0;i<alive.length;i++){x-=w[i];if(x<=0){F=alive[i];break;}}ok=call(R()<.5?'Los '+F.name:R()<.4?'Komm schon '+F.name:F.name,1);}
    if(!ok)call(fresh(GEN),1);st.nextCall=t+(2.4+R()*3.4)/S.callRate;}}
  if(st.boo&&t>=st.nextBoo){if(R()<.5)ksCrowd(pick(['boo1','boo2']),.22);for(let i=0;i<2+Math.floor(R()*4*S.variety);i++)whistle(t+R()*1.2,.8);st.nextBoo=t+2.5+R()*3;}
  const wr=(c?(c.hero?.5:.32):.04)*dt*(.6+.4*S.variety);if(R()<wr)whistle(t+.02,c?1:.7);
  if(!c&&!st.boo&&t>=st.nextRip){if(CL.rip.length&&st.nextRip)play(pick(CL.rip),t+.05,S.claps*(.2+.2*E)*(.8+.4*R()),(R()*2-1)*.7,.92+R()*.16);st.nextRip=t+(5+R()*8)/(.6+.4*S.variety);}}
 return {setActive,setFighters,event,notify,tick,prepGeneric,cheerFor,get active(){return active;},get excite(){return clamp(st.E,0,1);},
  bore(){st.lastAct=ctx.currentTime-12;st.heat=0;st.E=Math.min(st.E,.3);},
  get state(){return {E:st.E,heat:st.heat,mood:st.boo?'boo':st.mood,cheer:st.cheer?{name:st.cheer.for?.name||'',until:st.cheer.until-ctx.currentTime,pat:st.cheer.pat,bpm:Math.round(st.cheer.bpm),hero:st.cheer.hero}:null,beds:!!B?.m?.length,variants:(B?.m?.length||0)+(B?.r?.length||0),swells:Object.values(B?.sw||{}).reduce((n,L)=>n+L.length,0),calls:st.calls,pool:[...POOL.values()].reduce((n,L)=>n+L.length,0),queue:Q.length,worker:wkOk};},out};}

W.Zuschauer={DEF,FIELDS,KEY,get settings(){return S;},save,reset,distance,create,notify:k=>{try{gameEng?.notify(k);}catch{}}};let gameEng=null;

// ---------- Anschluss ans Spiel (nur wenn das Spiel geladen ist) ----------
const M=W.MG;if(!M||typeof setInterval!=='function')return;
let eng=null,lastB=null,T=null,heroT=0;
function heroOf(a){const g=a.g||{};return !!(M.modHeroes?.()?.has?.(g.id)||g.champion||(g.fame||0)>=150||(g.kills||0)>=3||g.stature==='dwarf'||g.stature==='giant');}
const human=a=>a&&a.g&&!a.dog&&!a.rex&&!a.hahn&&!a.lion&&!a.beast&&a.g.name;
function list(b){return (b.actors||[]).filter(human).map(a=>({id:a.id,name:a.g.name,team:a.team,hero:heroOf(a),alive:!a.down&&!a.g.dead}));}
function hpOf(g){let h=0,m=0,f=0;for(const k in g.body||{}){const p=g.body[k];if(!p)continue;if(p.missing)m++;else h+=Math.max(0,+p.hp||0);if(p.fracture)f++;}return [h,m,f];}
function scan(b){const now=b.time||0;for(const a of b.actors||[]){if(!human(a))continue;const g=a.g,[hp,miss,frac]=hpOf(g),s=T.a[a.id];if(!s){T.a[a.id]={hp,miss,frac,down:a.down,dead:g.dead};continue;}
  const att=(b.actors||[]).find(x=>x.id===a.lastAttackerId&&x.team!==a.team),by=att&&human(att)?att.id:null,d=s.hp-hp;s.hp=hp;
  if(g.dead&&!s.dead){s.dead=s.down=true;if(by)eng.event('kill',{by,victim:a.id});s.miss=miss;s.frac=frac;continue;}
  if(a.down&&!s.down&&!g.dead){if(by)eng.event('down',{by,victim:a.id});}s.down=!!a.down;
  if(miss>s.miss){s.miss=miss;eng.event('sever',{by,victim:a.id});}
  if(d>.5){const nf=frac>s.frac;if(d>=18||nf)eng.event('injury',{by,victim:a.id,sev:Math.max(clamp((d-12)/45,0,1),nf?.6:0)});else eng.event('hit',{by,power:clamp(d/15,.2,1)});}s.frac=frac;}
 const up=t=>(b.actors||[]).filter(a=>a.team===t&&!a.down&&!a.g?.dead&&!a.surrendered).length,diff=Math.sign(up(0)-up(1));if(diff&&diff!==T.lead){if(T.lead&&now>4)eng.event('swing');T.lead=diff;}
 if(b.result&&!T.won){T.won=true;eng.event('win');}}
setInterval(()=>{try{const A=M.audioEngine,o=A?.crowdOut?.(),b=M.s?.battle;
  if(!o||!b){if(eng)eng.setActive(false);A?.setCrowdExcite?.(0);if(!b)lastB=null;return;}
  if(!eng){eng=gameEng=create(o.ctx,o.bus,{busy:()=>{const c=A.chants?.();return !!c&&c.until>c.now;},duck:()=>!!M.speaking?.('moderator')});eng.prepGeneric();}
  eng.setActive(true);
  if(b!==lastB){lastB=b;T={a:{},lead:0,won:false};eng.setFighters(list(b),true);scan(b);eng.event('start');heroT=0;}
  else{scan(b);if(++heroT%10===0)eng.setFighters(list(b),false);}
  eng.tick();A.setCrowdExcite?.(eng.excite);}catch(e){}},100);
M.zuschauer={get engine(){return eng;},state:()=>eng?.state||null};
})();
