'use strict';
// =====================================================================================================
// KAMPFGERÄUSCHE (window.KampfSound) – neuer Klangerzeuger für alle Kampfmodi, ohne Dateien.
// Jedes Geräusch ist eine Vorlage aus Ebenen, die Stück für Stück in einen Puffer gerechnet werden:
//   tone   Ton mit Tonhöhenverlauf (Körperschlag, Sehne, Fanfare), optional verzerrt und zitternd
//   noise  gefiltertes Rauschen mit wanderndem Filter (Luftzug, Pfeifen, Aufklatschen, Sand)
//   voice  menschliche Stimme: Stimmlippen-Pulse + Vokal-Formanten, Rauheit, Atem, Verzerrung (Schreie)
//   metal  Metallklang aus unharmonischen Teiltönen (Klinge, Schildbuckel, Rüstung, Gong, Münzen)
//   crowd  viele Stimmen zugleich (Jubel, Raunen)
//   clicks Folge kurzer Knackser (Knochen, Ratsche, Klatschen, Kettenhemd)
// Dazu je Vorlage: Lautstärke, Hall (Arena) und Zufall der Tonhöhe, damit kein Treffer wie der andere klingt.
// Der Editor (kampfsound-editor.html) speichert Änderungen unter localStorage „mg-kampfsound-v1“; get() liefert die
// geänderte Fassung, sonst die eingebaute. Keine Spielregeln, kein Zugriff auf den Spielstand.
// =====================================================================================================
(()=>{
const SR=44100,TAU=Math.PI*2,KEY='mg-kampfsound-v1';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function rng(seed){let a=(seed>>>0)||1;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// ---------- Filter (RBJ-Biquad) ----------
const bq=()=>({b0:1,b1:0,b2:0,a1:0,a2:0,x1:0,x2:0,y1:0,y2:0});
function setBq(f,type,freq,q){const w=TAU*clamp(freq,15,SR*.45)/SR,cs=Math.cos(w),sn=Math.sin(w),al=sn/(2*Math.max(.1,q));let b0,b1,b2;
 if(type==='lp'){b0=(1-cs)/2;b1=1-cs;b2=b0;}else if(type==='hp'){b0=(1+cs)/2;b1=-(1+cs);b2=b0;}else{b0=al;b1=0;b2=-al;}
 const a0=1+al;f.b0=b0/a0;f.b1=b1/a0;f.b2=b2/a0;f.a1=-2*cs/a0;f.a2=(1-al)/a0;}
function run(f,x){const y=f.b0*x+f.b1*f.x1+f.b2*f.x2-f.a1*f.y1-f.a2*f.y2;f.x2=f.x1;f.x1=x;f.y2=f.y1;f.y1=y;return y;}
// ---------- Hüllkurve: anschwellen, halten (Anteil), abklingen ----------
function env(t,L){const a=Math.max(.0004,L.att||0),d=Math.max(a+.002,L.dur);if(t<a)return t/a;const u=(t-a)/(d-a);if(u>=1)return 0;const h=clamp(L.hold||0,0,.98);let e=u<h?1:Math.exp(-5.5*(u-h)/(1-h));if(u>.93)e*=(1-u)/.07;return e;}
const sweep=(L,u)=>{const a=Math.max(1,L.f0),b=Math.max(1,L.f1??L.f0);return a*Math.pow(b/a,Math.pow(clamp(u,0,1),L.curve||1));};
function noiseGen(color,r){let b0=0,b1=0,b2=0,br=0;return()=>{const w=r()*2-1;if(color==='pink'){b0=.99765*b0+w*.099046;b1=.963*b1+w*.2965164;b2=.57*b2+w*1.0526913;return(b0+b1+b2+w*.1848)*.2;}if(color==='brown'){br=(br+w*.02)/1.02;return br*3.2;}return w;};}
const shape=(x,d)=>d>1?Math.tanh(x*d)/Math.tanh(d):x;
const trem=(L,t)=>L.trem?1-(L.tremDepth||0)*.5*(1+Math.sin(TAU*L.trem*t)):1;
// ---------- Ebenen ----------
function rTone(out,o,L,P){const n=Math.floor(L.dur*SR),lp=bq();setBq(lp,'lp',L.lp||14000,.707);let ph=0;
 for(let i=0;i<n&&o+i<out.length;i++){const t=i/SR;ph+=sweep(L,t/L.dur)*P/SR;ph-=Math.floor(ph);let x;
  switch(L.wave){case'tri':x=1-4*Math.abs(ph-.5);break;case'saw':x=2*ph-1;break;case'square':x=ph<.5?.8:-.8;break;default:x=Math.sin(TAU*ph);}
  x=run(lp,shape(x*trem(L,t),L.drive||1));out[o+i]+=x*env(t,L)*L.vol;}}
function rNoise(out,o,L,P,r){const n=Math.floor(L.dur*SR),g=noiseGen(L.color,r),f=bq(),comp=L.filter==='bp'?Math.min(4,Math.sqrt(L.q||1)*1.3):1;
 for(let i=0;i<n&&o+i<out.length;i++){const t=i/SR;if((i&15)===0)setBq(f,L.filter||'bp',sweep(L,t/L.dur)*P,L.q||1);
  const x=shape(run(f,g())*comp*trem(L,t),L.drive||1);out[o+i]+=x*env(t,L)*L.vol;}}
// Vokale (Formanten F1–F4 in Hz, Männerstimme). ə = Murmellaut wie in „bitte“.
const VOW={a:[730,1090,2440,3400],'ä':[660,1700,2400,3400],e:[480,1900,2500,3500],i:[300,2200,3000,3700],o:[540,840,2410,3300],u:[330,800,2240,3200],'ə':[500,1450,2450,3450]};
function rVoice(out,o,L,P,r,VP=1){const n=Math.floor(L.dur*SR),A=VOW[L.v0]||VOW.a,B=VOW[L.v1]||A,fs=Math.pow(VP,.35)/(L.size||1),R=clamp(L.rough||0,0,1);
 const F=[bq(),bq(),bq(),bq()],amp=[1,.7,.36,.2],bw=[80+R*60,100+R*60,150,220],hp=bq(),g=noiseGen('white',r);setBq(hp,'hp',70,.7);
 let ph=0,prev=0,odd=false,jit=1,sub=1,shim=1;const pa=clamp(L.peakAt??.3,.02,.98),dr=L.drive||1;
 for(let i=0;i<n&&o+i<out.length;i++){const t=i/SR,u=t/L.dur;
  let f=u<pa?L.f0+(L.fp-L.f0)*(.5-.5*Math.cos(Math.PI*u/pa)):L.fp+(L.f1-L.fp)*(.5-.5*Math.cos(Math.PI*(u-pa)/(1-pa)));
  f*=P*VP*(1+(L.vib||0)*.025*Math.sin(TAU*5.3*t+1.7*Math.sin(TAU*.7*t)))*jit*sub;
  ph+=f/SR;if(ph>=1){ph-=1;odd=!odd;jit=1+(L.jitter??.02)*(r()*2-1);sub=1+(odd?1:-1)*R*.07;shim=(odd?1-R*.6:1)*(1+(r()-.5)*R*.4);}
  // Stimmlippen-Puls (Rosenberg) und seine Ableitung als Anregung
  const op=.4,cl=.16,gl=ph<op?.5-.5*Math.cos(Math.PI*ph/op):ph<op+cl?Math.cos(Math.PI/2*(ph-op)/cl):0;
  let src=(gl-prev)*SR/Math.max(40,f)*.11*shim;prev=gl;src+=g()*(L.breath||0)*(.25+gl*.75)*.55;
  if((i&31)===0){const k=.5-.5*Math.cos(Math.PI*clamp(u,0,1));for(let j=0;j<4;j++){const fj=(A[j]+(B[j]-A[j])*k)*fs;setBq(F[j],'bp',fj,fj/bw[j]);}}
  let y=0;for(let j=0;j<4;j++)y+=run(F[j],src)*amp[j];
  y=shape(run(hp,y)*2.2,dr);out[o+i]+=y*env(t,L)*L.vol;}}
const PART={klinge:[1,2.76,5.40,8.93,13.3],schild:[1,1.59,2.14,2.65,3.16,3.5],ruestung:[1,1.47,2.09,2.56,3.4],glocke:[.5,1,1.19,1.5,2,2.5,3],gong:[1,1.52,2.31,2.73,3.6,4.1,5.2],muenze:[1,2.08,3.5,5.1],holz:[1,2.4,3.9]};
function rMetal(out,o,L,P,r){const R=PART[L.partials]||PART.klinge,n=Math.floor(L.dur*SR),b=clamp(L.bright??.6,0,1),ps=[];let sum=0;
 R.forEach((m,k)=>{const a=Math.pow(b,k*.8)/(1+k*.25),d=L.decay/(1+k*.5);for(const det of [1,1.0037])ps.push({w:TAU*L.f*m*P*det*(1+(r()-.5)*.003)/SR,a:a*(det>1?.45:1),k:Math.exp(-1/(Math.max(.005,d)*SR)),e:1,ph:r()*TAU});sum+=a*1.45;});
 const g=noiseGen('white',r),hp=bq();setBq(hp,'hp',3000,.7);const ck=L.click||0;
 for(let i=0;i<n&&o+i<out.length;i++){let x=0;for(const p of ps){x+=Math.sin(p.ph+p.w*i)*p.a*p.e;p.e*=p.k;}x/=sum;const fade=Math.min(1,i/30)*(i>n*.93?(n-i)/(n*.07):1);
  if(ck&&i<SR*.008)x+=run(hp,g())*ck*(1-i/(SR*.008));out[o+i]+=x*fade*L.vol*1.6;}}
function rCrowd(out,o,L,P,r){const vs=[...(L.vowels||'a')].filter(c=>VOW[c]);if(!vs.length)vs.push('a');const N=Math.round(clamp(L.n||1,1,80));
 for(let k=0;k<N;k++){const st=r()*(L.spread||0),d=Math.max(.15,(L.dur-st)*(.65+.35*r()));const woman=r()<.25,f=(L.f0+(L.f1-L.f0)*r())*(woman?1.7:1);
  rVoice(out,o+Math.floor(st*SR),{v0:vs[Math.floor(r()*vs.length)],v1:vs[Math.floor(r()*vs.length)],f0:f,fp:f*(1+(L.rise||0)),f1:f*(1+(L.rise||0)*.4),peakAt:.25+r()*.4,att:(L.att||.1)*(.5+r()),hold:L.hold||0,dur:d,vol:L.vol/Math.sqrt(N)*(.55+.6*r()),rough:.25*r(),breath:.4,drive:1.3,jitter:.04,vib:.6,size:woman?.82:.9+r()*.3},P,r,1);}}
function rClicks(out,o,L,P,r){let t=0;const N=Math.round(clamp(L.n||1,1,120));for(let k=0;k<N;k++){const f=L.f*(1+(r()-.5)*.35);
 rNoise(out,o+Math.floor(t*SR),{color:L.color||'white',filter:L.filter||'bp',f0:f,f1:f*.8,q:L.q||2,att:.0006,dur:Math.max(.003,L.dur*(.7+.6*r())),vol:L.vol*(.55+.45*r())},P,r);t+=L.gap*Math.max(.05,1+(r()*2-1)*(L.jitter||0));}}
function layerLen(L){if(L.type==='clicks')return(L.start||0)+L.gap*(L.n||1)*(1+(L.jitter||0))+L.dur;return(L.start||0)+L.dur;}
// ---------- Hall (Schroeder): kleiner Raum bis Arena ----------
function reverb(buf,mix,size){const combs=[1557,1617,1491,1422,1277,1356].map(d=>{const n=Math.max(8,Math.floor(d*size));return{b:new Float32Array(n),n,i:0,lp:0};}),aps=[225,556,441].map(n=>({b:new Float32Array(n),n,i:0}));
 for(let s=0;s<buf.length;s++){const x=buf[s];let y=0;for(const c of combs){const v=c.b[c.i];c.lp=v*.55+c.lp*.45;c.b[c.i]=x+c.lp*.79;c.i=(c.i+1)%c.n;y+=v;}y*=.16;
  for(const a of aps){const v=a.b[a.i],w=-y*.5+v;a.b[a.i]=y+w*.5;a.i=(a.i+1)%a.n;y=w;}buf[s]=x+y*mix;}return buf;}
// ---------- Rechnen ----------
function render(p,opt={}){const r=rng(opt.seed??Math.floor(Math.random()*1e9)),P=(1+(r()*2-1)*(p.pitchVar||0))*(opt.speed||1),VP=clamp(opt.pitch||1,.5,1.8);
 const layers=(p.layers||[]).filter(L=>!L.mute&&L.dur>0),room=clamp(p.room||0,0,1),size=.6+room*.9;
 const len=Math.ceil((Math.max(.05,...layers.map(layerLen))+(room>0?.25+room*1.2:0)+.02)*SR),out=new Float32Array(len);
 for(const L0 of layers){const L={...L0,vol:L0.vol*(1+(r()-.5)*.22*(p.pitchVar?1:0))},o=Math.floor((L.start||0)*SR);
  if(L.type==='tone')rTone(out,o,L,P);else if(L.type==='noise')rNoise(out,o,L,P,r);else if(L.type==='voice')rVoice(out,o,L,P,r,VP);else if(L.type==='metal')rMetal(out,o,L,P,r);else if(L.type==='crowd')rCrowd(out,o,L,P,r);else if(L.type==='clicks')rClicks(out,o,L,P,r);}
 if(room>0)reverb(out,room*.9,size);const v=(p.vol??1)*(opt.vol??1);for(let i=0;i<len;i++){const x=out[i]*v;out[i]=Number.isFinite(x)?Math.tanh(x):0;}return out;}
// ---------- Vorlagen ----------
const T=o=>({type:'tone',wave:'sine',f0:200,f1:100,curve:1,att:.002,hold:0,dur:.2,vol:.5,start:0,drive:1,lp:14000,trem:0,tremDepth:0,...o});
const N=o=>({type:'noise',color:'white',filter:'bp',f0:1000,f1:1000,curve:1,q:1,att:.002,hold:0,dur:.2,vol:.5,start:0,drive:1,trem:0,tremDepth:0,...o});
const V=o=>({type:'voice',v0:'a',v1:'a',f0:130,fp:160,f1:120,peakAt:.3,att:.03,hold:.3,dur:.6,vol:.6,start:0,rough:.3,breath:.2,drive:1.5,vib:0,jitter:.02,size:1,...o});
const Mt=o=>({type:'metal',f:800,partials:'klinge',decay:.4,dur:.6,vol:.4,start:0,bright:.6,click:.3,...o});
const C=o=>({type:'crowd',n:24,f0:110,f1:240,vowels:'ao',att:.3,hold:.4,dur:2,vol:.5,start:0,spread:.4,rise:.15,...o});
const K=o=>({type:'clicks',n:4,gap:.06,jitter:.2,filter:'bp',color:'white',f:2000,q:2,dur:.02,vol:.4,start:0,...o});
const hz=m=>440*Math.pow(2,(m-69)/12);
// Römisches Kampfhorn (Cornu): je Ton zwei leicht verstimmte Sägezähne, die von unten in den Ton gleiten, gedämpft und angezerrt, dazu Blasgeräusch.
// notes = [[MIDI, Länge s], …]; o.start Beginn, o.lp Dämpfung, o.gap Abstand als Anteil der Länge (1 = direkt hintereinander)
const warhorn=(notes,vol,o={})=>{const out=[];let t=o.start||0;for(const [m,len] of notes){const f=hz(m);
 out.push(T({wave:'saw',f0:f*.97,f1:f,curve:.25,att:.07,hold:.72,dur:len,vol,start:t,lp:o.lp||1300,drive:1.8,trem:5.3,tremDepth:.05}));
 out.push(T({wave:'saw',f0:f*.975,f1:f*1.004,curve:.3,att:.09,hold:.72,dur:len,vol:vol*.55,start:t+.012,lp:(o.lp||1300)*.7,drive:1.3}));
 out.push(N({filter:'bp',f0:f*3,f1:f*3.2,q:2,att:.05,hold:.5,dur:len*.9,vol:vol*.07,start:t}));
 t+=len*(o.gap||1);}return out;};
const horn=(notes,step,vol,last=.8)=>notes.map((m,i)=>T({wave:'saw',f0:hz(m),f1:hz(m)*.995,att:.025,hold:.55,dur:i===notes.length-1?last:step*1.4,vol,start:i*step,lp:1900,drive:1.4}));
const CATS=[['waffen','Waffen (Nahkampf)'],['fern','Fernkampf'],['koerper','Körper'],['stimme','Stimmen'],['arena','Arena & Publikum'],['box','Faustkampf']];
const DEF={
 // ----- Waffen
 swing:{cat:'waffen',name:'Schwung (leicht)',use:'Schwert, Dolch, Speer holt aus und schlägt zu (Luftzug).',vol:.9,room:.08,pitchVar:.12,layers:[
  N({color:'pink',f0:480,f1:1700,curve:.6,q:1.4,att:.07,hold:.1,dur:.24,vol:.9}),N({f0:2200,f1:3900,q:3,att:.06,dur:.2,vol:.16})]},
 swingHeavy:{cat:'waffen',name:'Schwung (schwer)',use:'Axt, Hammer, Zweihänder, Keule holt aus.',vol:.9,room:.08,pitchVar:.1,layers:[
  N({color:'pink',f0:210,f1:720,curve:.7,q:1.1,att:.14,hold:.15,dur:.42,vol:.75}),N({color:'brown',filter:'lp',f0:300,f1:520,q:.7,att:.12,dur:.4,vol:.35})]},
 hitBlade:{cat:'waffen',name:'Klingentreffer',use:'Schnitt mit Klinge ins Fleisch.',vol:1,room:.1,pitchVar:.12,layers:[
  T({f0:110,f1:45,dur:.2,vol:.7,drive:2.5,lp:900,att:.001}),N({f0:1400,f1:450,q:1.2,att:.0015,dur:.14,vol:.6}),N({filter:'hp',f0:3200,f1:3200,dur:.035,vol:.35,att:.0005}),
  N({color:'pink',f0:2600,f1:1800,q:2,dur:.09,vol:.25,start:.004}),T({wave:'tri',f0:230,f1:80,dur:.07,vol:.18})]},
 hitStab:{cat:'waffen',name:'Stich',use:'Stoß mit Speer, Dolch oder Schwertspitze.',vol:1,room:.1,pitchVar:.12,layers:[
  N({color:'pink',f0:900,f1:2200,q:1.5,att:.03,dur:.08,vol:.3}),T({f0:92,f1:40,dur:.18,vol:.65,drive:2,start:.05}),N({f0:1000,f1:280,q:3,dur:.2,vol:.55,start:.05}),
  N({color:'brown',filter:'lp',f0:500,f1:400,dur:.25,vol:.4,start:.05})]},
 hitBlunt:{cat:'waffen',name:'Wuchttreffer (stumpf)',use:'Keule, Hammer, Schildstoß, Knüppel trifft.',vol:1,room:.12,pitchVar:.1,layers:[
  T({f0:75,f1:32,dur:.3,vol:.9,drive:3,lp:700,att:.001}),N({filter:'lp',f0:1800,f1:600,dur:.05,vol:.6,att:.0005}),N({color:'pink',f0:420,f1:200,q:1.2,dur:.22,vol:.5}),
  K({n:2,gap:.012,f:2500,q:1.5,dur:.012,vol:.35})]},
 backstab:{cat:'waffen',name:'Rückentreffer',use:'Treffer von hinten (Hinterhalt, Flanke).',vol:1,room:.1,pitchVar:.1,layers:[
  T({f0:85,f1:36,dur:.25,vol:.8,drive:2.5}),N({f0:1200,f1:260,q:2.5,dur:.26,vol:.6}),N({filter:'hp',f0:3000,dur:.03,vol:.35,att:.0005}),N({color:'brown',filter:'lp',f0:450,dur:.3,vol:.45})]},
 sever:{cat:'waffen',name:'Abtrennen (Knochen)',use:'Gliedmaße oder Kopf ab: Knochen bricht, Blut spritzt.',vol:1,room:.12,pitchVar:.08,layers:[
  T({f0:95,f1:35,dur:.26,vol:.8,drive:3}),K({n:4,gap:.011,jitter:.4,filter:'hp',f:2200,q:.8,dur:.015,vol:.55}),N({f0:1100,f1:300,q:1.5,dur:.3,vol:.55}),
  N({color:'pink',filter:'hp',f0:2600,att:.05,hold:.3,dur:.7,vol:.14,start:.12,trem:13,tremDepth:.6}),N({color:'brown',filter:'lp',f0:400,dur:.3,vol:.4})]},
 blockShield:{cat:'waffen',name:'Schildblock (Holz)',use:'Schlag oder Geschoss prallt am Holzschild ab.',vol:1,room:.12,pitchVar:.1,layers:[
  T({f0:150,f1:105,dur:.16,vol:.7,drive:1.6}),N({f0:650,f1:640,q:6,dur:.12,vol:.55,att:.0008}),N({f0:1350,f1:1300,q:8,dur:.08,vol:.3}),N({filter:'hp',f0:4000,dur:.02,vol:.3}),
  Mt({f:420,partials:'schild',decay:.12,dur:.3,vol:.15,bright:.5,click:0})]},
 parry:{cat:'waffen',name:'Klinge auf Klinge (Parade)',use:'Waffe pariert Waffe: helles Klirren.',vol:.95,room:.15,pitchVar:.08,layers:[
  Mt({f:1250,partials:'klinge',decay:.55,dur:1,vol:.45,bright:.75,click:.5}),Mt({f:1730,partials:'klinge',decay:.4,dur:.8,vol:.25,bright:.6,click:0,start:.003}),
  N({filter:'hp',f0:4500,f1:3000,att:.002,dur:.18,vol:.25}),T({f0:140,f1:90,dur:.07,vol:.3})]},
 armorHit:{cat:'waffen',name:'Rüstungstreffer (Metall)',use:'Treffer auf Helm, Panzer, Kettenhemd.',vol:1,room:.12,pitchVar:.1,layers:[
  Mt({f:480,partials:'ruestung',decay:.14,dur:.35,vol:.5,bright:.6,click:.6}),T({f0:100,f1:50,dur:.15,vol:.6,drive:2}),N({f0:2500,q:1,dur:.06,vol:.35}),
  K({n:3,gap:.03,f:3500,q:4,dur:.01,vol:.15,start:.02})]},
 // ----- Fernkampf
 bow:{cat:'fern',name:'Bogen-Abschuss',use:'Sehne schnellt vor.',vol:1,room:.1,pitchVar:.08,layers:[
  T({wave:'tri',f0:240,f1:130,curve:.5,dur:.28,vol:.4,lp:3000}),T({f0:760,f1:320,dur:.12,vol:.12}),N({filter:'hp',f0:2400,dur:.05,vol:.3,att:.0005}),T({f0:95,f1:60,dur:.07,vol:.3})]},
 arrow:{cat:'fern',name:'Pfeilflug (Pfeifen)',use:'Pfeil pfeift durch die Luft (wie im Apfelschuss).',vol:1,room:.08,pitchVar:.1,layers:[
  N({f0:3400,f1:600,q:7,att:.02,dur:.5,vol:.55}),T({f0:2300,f1:900,att:.03,dur:.45,vol:.05}),N({color:'pink',f0:900,f1:400,q:1,att:.05,dur:.4,vol:.12})]},
 arrowBody:{cat:'fern',name:'Pfeil trifft Körper',use:'Einschlag im Körper (wie im Apfelschuss).',vol:1,room:.1,pitchVar:.1,layers:[
  T({f0:85,f1:38,dur:.28,vol:.75,drive:1.5}),N({filter:'lp',f0:2200,dur:.07,att:.003,vol:.5}),N({f0:700,f1:250,q:1.5,att:.01,dur:.32,vol:.35}),T({wave:'square',f0:240,f1:90,dur:.06,vol:.12,lp:2000})]},
 arrowShield:{cat:'fern',name:'Pfeil im Schild',use:'Pfeil, Speer oder Axt bleibt im Schild stecken und federt nach.',vol:1,room:.1,pitchVar:.1,layers:[
  N({f0:1100,q:5,dur:.06,vol:.55,att:.0005}),T({f0:140,f1:110,dur:.14,vol:.5}),T({wave:'tri',f0:95,f1:88,dur:.55,vol:.22,trem:26,tremDepth:.9,start:.01}),N({filter:'hp',f0:3500,dur:.015,vol:.3})]},
 arrowSand:{cat:'fern',name:'Pfeil im Sand',use:'Fehlschuss bohrt sich in den Boden.',vol:1,room:.08,pitchVar:.1,layers:[
  T({f0:68,f1:42,dur:.2,vol:.55}),N({filter:'lp',f0:600,f1:250,dur:.16,vol:.4,att:.004}),N({filter:'hp',f0:3000,att:.01,dur:.12,vol:.12,start:.01})]},
 crossbow:{cat:'fern',name:'Armbrust-Abschuss',use:'Bolzen löst aus: harter Schlag, kurzes Zischen.',vol:1,room:.1,pitchVar:.06,layers:[
  N({filter:'hp',f0:2200,dur:.03,vol:.5,att:.0005}),T({wave:'square',f0:170,f1:60,dur:.08,vol:.2,lp:1500}),T({f0:120,f1:55,dur:.22,vol:.55,drive:2}),N({f0:3000,f1:700,q:6,att:.015,dur:.35,vol:.35,start:.02})]},
 reload:{cat:'fern',name:'Armbrust nachladen',use:'Kurbel rastet ein, Bolzen wird eingelegt.',vol:.9,room:.05,pitchVar:.05,layers:[
  K({n:7,gap:.055,jitter:.15,f:2800,q:5,dur:.012,vol:.4}),Mt({f:1600,partials:'ruestung',decay:.05,dur:.1,vol:.2,click:.8,start:.42})]},
 throw:{cat:'fern',name:'Wurf (Speer, Axt)',use:'Wurfspeer oder Wurfaxt fliegt.',vol:.9,room:.08,pitchVar:.1,layers:[
  N({color:'pink',f0:300,f1:1100,curve:.6,q:1.1,att:.1,hold:.1,dur:.38,vol:.85}),N({f0:1800,f1:2600,q:2,att:.08,dur:.3,vol:.12})]},
 net:{cat:'fern',name:'Netzwurf',use:'Netz entfaltet sich in der Luft.',vol:.9,room:.06,pitchVar:.08,layers:[
  N({color:'pink',f0:350,f1:900,q:.9,att:.08,hold:.3,dur:.55,vol:.75,trem:17,tremDepth:.7}),N({filter:'hp',f0:2500,dur:.4,att:.1,vol:.08,trem:23,tremDepth:.8})]},
 // ----- Körper
 step:{cat:'koerper',name:'Schritt (Sand)',use:'Fußtritt auf Arenasand.',vol:.7,room:0,pitchVar:.15,layers:[
  N({color:'pink',filter:'lp',f0:800,dur:.07,att:.003,vol:.45}),N({filter:'hp',f0:3200,dur:.04,vol:.12,start:.005}),T({f0:70,f1:45,dur:.04,vol:.25})]},
 rush:{cat:'koerper',name:'Ansturm',use:'Kämpfer stürmt los.',vol:.9,room:.05,pitchVar:.08,layers:[
  K({n:6,gap:.11,jitter:.15,filter:'lp',color:'pink',f:700,q:.7,dur:.06,vol:.5}),N({color:'pink',f0:400,f1:900,q:1,att:.25,hold:.2,dur:.7,vol:.2})]},
 fall:{cat:'koerper',name:'Körper stürzt',use:'Kämpfer fällt in den Sand.',vol:1,room:.1,pitchVar:.08,layers:[
  T({f0:62,f1:30,dur:.4,vol:.9,drive:3}),N({color:'brown',filter:'lp',f0:500,dur:.35,vol:.6}),N({filter:'hp',f0:2600,att:.02,hold:.2,dur:.5,vol:.12,start:.03}),K({n:4,gap:.04,jitter:.5,f:3000,q:3,dur:.02,vol:.2,start:.03})]},
 rise:{cat:'koerper',name:'Aufstehen',use:'Kämpfer rappelt sich auf.',vol:.8,room:.05,pitchVar:.1,layers:[
  N({color:'pink',f0:900,q:.8,att:.12,hold:.3,dur:.45,vol:.4}),N({filter:'hp',f0:3000,att:.1,dur:.35,vol:.06})]},
 land:{cat:'koerper',name:'Landung',use:'Sprung oder Stoß endet am Boden.',vol:.9,room:.08,pitchVar:.1,layers:[
  T({f0:80,f1:40,dur:.2,vol:.6,drive:2}),N({color:'pink',filter:'lp',f0:700,dur:.15,vol:.4}),N({filter:'hp',f0:3000,dur:.2,vol:.1})]},
 sand:{cat:'koerper',name:'Sand spritzt',use:'Rutschen, Wegrollen, Sand aufwirbeln.',vol:.8,room:.05,pitchVar:.1,layers:[
  N({filter:'hp',f0:3100,att:.02,dur:.35,vol:.3}),N({color:'pink',f0:1500,q:.8,dur:.25,vol:.15})]},
 die:{cat:'koerper',name:'Tod (Körper)',use:'Letzter Schlag: dumpfer Fall, Stille.',vol:1,room:.18,pitchVar:.05,layers:[
  T({f0:55,f1:28,dur:.6,vol:.8,drive:2}),N({color:'brown',filter:'lp',f0:300,dur:.5,vol:.5}),N({filter:'hp',f0:2400,att:.05,dur:.6,vol:.1})]},
 // ----- Stimmen (Stimmlage kommt vom Kämpfer)
 cry:{cat:'stimme',name:'Kampfschrei',use:'Ansturm, Angriffsbefehl, Schlachtbeginn („Hooorrr!“).',vol:.9,room:.2,pitchVar:.06,layers:[
  N({filter:'bp',f0:1600,f1:900,q:.7,att:.004,hold:.1,dur:.1,vol:.1}),V({v0:'o',v1:'o',f0:110,fp:170,f1:120,peakAt:.35,att:.05,hold:.5,dur:1,vol:.85,start:.02,rough:.55,breath:.25,drive:2.7,vib:.25,jitter:.03,size:1.2}),V({v0:'o',v1:'o',f0:55,fp:85,f1:60,peakAt:.35,att:.07,hold:.5,dur:1,vol:.3,start:.03,rough:.9,breath:.1,drive:3,size:1.3}),N({color:'pink',filter:'lp',f0:700,q:.7,att:.06,hold:.5,dur:1,vol:.08})]},
// Gebrüll bei der Vorstellung (und beim Ansturm): 20 Varianten, zufällig gewählt. Tiefes, abwechslungsreiches Kampfgebrüll:
// tiefe Vokale gemischt (a, o, u, ä, dumpfes e) in Brustlage (etwa 90–190 Hz), großer Körper, Anlaut wie H, R oder G,
// Tonhöhe schwingt hoch und fällt am Ende ab, darunter Kehlrasseln (zitterndes Rauschen) und Knurren eine Oktave tiefer.
 bruell01:{cat:'stimme',name:'Gebrüll 1 – „Raaah!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:.9,room:.28,pitchVar:.09,layers:[
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0}),
  V({v0:'a',v1:'a',f0:105,fp:170,f1:120,peakAt:0.3,att:.05,hold:.5,dur:1.3,vol:.85,start:0.02,rough:0.5,breath:.25,drive:2.5,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:1.3,vol:.12,start:0.03,trem:22,tremDepth:.75}),
  V({v0:'a',v1:'a',f0:52.5,fp:85,f1:60,peakAt:0.3,att:.07,hold:.5,dur:1.3,vol:.28,start:0.03,rough:.9,breath:.1,drive:3,vib:.15,jitter:.05,size:1.3})]},
 bruell02:{cat:'stimme',name:'Gebrüll 2 – „Hooo!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:.9,room:.28,pitchVar:.09,layers:[
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0}),
  V({v0:'o',v1:'o',f0:110,fp:165,f1:125,peakAt:0.3,att:.05,hold:.5,dur:1.3,vol:.85,start:0.02,rough:0.56,breath:.25,drive:2.65,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:1.3,vol:.12,start:0.03,trem:23,tremDepth:.75}),
  V({v0:'o',v1:'o',f0:55,fp:82.5,f1:62.5,peakAt:0.3,att:.07,hold:.5,dur:1.3,vol:.28,start:0.03,rough:.9,breath:.1,drive:3,vib:.15,jitter:.05,size:1.3})]},
 bruell03:{cat:'stimme',name:'Gebrüll 3 – „Uraaah!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:.9,room:.28,pitchVar:.09,layers:[
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0}),
  V({v0:'u',v1:'u',f0:100,fp:115,f1:120,peakAt:0.5,att:.05,hold:.5,dur:0.3,vol:.85,start:0.02,rough:0.62,breath:.25,drive:2.8,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:0.3,vol:.12,start:0.03,trem:24,tremDepth:.75}),
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0.25}),
  V({v0:'a',v1:'a',f0:125,fp:180,f1:120,peakAt:0.25,att:.05,hold:.5,dur:1.1,vol:.85,start:0.27,rough:0.62,breath:.25,drive:2.8,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:1.1,vol:.12,start:0.28,trem:24,tremDepth:.75}),
  V({v0:'a',v1:'a',f0:62.5,fp:90,f1:60,peakAt:0.25,att:.07,hold:.5,dur:1.1,vol:.28,start:0.28,rough:.9,breath:.1,drive:3,vib:.15,jitter:.05,size:1.3})]},
 bruell04:{cat:'stimme',name:'Gebrüll 4 – „Grooah!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:.9,room:.28,pitchVar:.09,layers:[
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0}),
  V({v0:'ə',v1:'o',f0:95,fp:150,f1:110,peakAt:0.35,att:.05,hold:.5,dur:0.7,vol:.85,start:0.02,rough:0.68,breath:.25,drive:2.95,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:0.7,vol:.12,start:0.03,trem:25,tremDepth:.75}),
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0.6}),
  V({v0:'o',v1:'a',f0:130,fp:160,f1:105,peakAt:0.3,att:.05,hold:.5,dur:0.8,vol:.85,start:0.62,rough:0.68,breath:.25,drive:2.95,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:0.8,vol:.12,start:0.63,trem:25,tremDepth:.75}),
  V({v0:'o',v1:'a',f0:65,fp:80,f1:52.5,peakAt:0.3,att:.07,hold:.5,dur:0.8,vol:.28,start:0.63,rough:.9,breath:.1,drive:3,vib:.15,jitter:.05,size:1.3})]},
 bruell05:{cat:'stimme',name:'Gebrüll 5 – „Hu! Hu! Haaa!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:.9,room:.28,pitchVar:.09,layers:[
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0}),
  V({v0:'u',v1:'u',f0:130,fp:140,f1:125,peakAt:0.3,att:.05,hold:.5,dur:0.2,vol:.85,start:0.02,rough:0.74,breath:.25,drive:2.5,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:0.2,vol:.12,start:0.03,trem:26,tremDepth:.75}),
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0.3}),
  V({v0:'u',v1:'u',f0:130,fp:145,f1:125,peakAt:0.3,att:.05,hold:.5,dur:0.2,vol:.85,start:0.32,rough:0.74,breath:.25,drive:2.5,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:0.2,vol:.12,start:0.33,trem:26,tremDepth:.75}),
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0.6}),
  V({v0:'a',v1:'a',f0:115,fp:175,f1:115,peakAt:0.3,att:.05,hold:.5,dur:1,vol:.85,start:0.62,rough:0.74,breath:.25,drive:2.5,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:1,vol:.12,start:0.63,trem:26,tremDepth:.75}),
  V({v0:'a',v1:'a',f0:57.5,fp:87.5,f1:57.5,peakAt:0.3,att:.07,hold:.5,dur:1,vol:.28,start:0.63,rough:.9,breath:.1,drive:3,vib:.15,jitter:.05,size:1.3})]},
 bruell06:{cat:'stimme',name:'Gebrüll 6 – „Aaarrgh!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:.9,room:.28,pitchVar:.09,layers:[
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0}),
  V({v0:'a',v1:'ə',f0:115,fp:165,f1:95,peakAt:0.3,att:.05,hold:.5,dur:1.4,vol:.85,start:0.02,rough:0.5,breath:.25,drive:2.65,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:1.4,vol:.12,start:0.03,trem:27,tremDepth:.75}),
  V({v0:'a',v1:'ə',f0:57.5,fp:82.5,f1:47.5,peakAt:0.3,att:.07,hold:.5,dur:1.4,vol:.28,start:0.03,rough:.9,breath:.1,drive:3,vib:.15,jitter:.05,size:1.3})]},
 bruell07:{cat:'stimme',name:'Gebrüll 7 – „Wooo-ah!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:.9,room:.28,pitchVar:.09,layers:[
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0}),
  V({v0:'u',v1:'o',f0:105,fp:160,f1:130,peakAt:0.55,att:.05,hold:.5,dur:0.8,vol:.85,start:0.02,rough:0.56,breath:.25,drive:2.8,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:0.8,vol:.12,start:0.03,trem:28,tremDepth:.75}),
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0.75}),
  V({v0:'a',v1:'ə',f0:130,fp:150,f1:100,peakAt:0.3,att:.05,hold:.5,dur:0.7,vol:.85,start:0.77,rough:0.56,breath:.25,drive:2.8,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:0.7,vol:.12,start:0.78,trem:28,tremDepth:.75}),
  V({v0:'u',v1:'o',f0:52.5,fp:80,f1:65,peakAt:0.55,att:.07,hold:.5,dur:0.8,vol:.28,start:0.03,rough:.9,breath:.1,drive:3,vib:.15,jitter:.05,size:1.3})]},
 bruell08:{cat:'stimme',name:'Gebrüll 8 – „Hrraaah!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:.9,room:.28,pitchVar:.09,layers:[
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0}),
  V({v0:'ə',v1:'a',f0:95,fp:175,f1:115,peakAt:0.45,att:.05,hold:.5,dur:1.4,vol:.85,start:0.02,rough:0.62,breath:.25,drive:2.95,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:1.4,vol:.12,start:0.03,trem:29,tremDepth:.75}),
  V({v0:'ə',v1:'a',f0:47.5,fp:87.5,f1:57.5,peakAt:0.45,att:.07,hold:.5,dur:1.4,vol:.28,start:0.03,rough:.9,breath:.1,drive:3,vib:.15,jitter:.05,size:1.3})]},
 bruell09:{cat:'stimme',name:'Gebrüll 9 – „Ho! Ho! Hoo!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:.9,room:.28,pitchVar:.09,layers:[
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0}),
  V({v0:'o',v1:'o',f0:135,fp:160,f1:125,peakAt:0.3,att:.05,hold:.5,dur:0.3,vol:.85,start:0.02,rough:0.68,breath:.25,drive:2.5,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:0.3,vol:.12,start:0.03,trem:30,tremDepth:.75}),
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0.4}),
  V({v0:'o',v1:'o',f0:135,fp:165,f1:120,peakAt:0.3,att:.05,hold:.5,dur:0.3,vol:.85,start:0.42,rough:0.68,breath:.25,drive:2.5,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:0.3,vol:.12,start:0.43,trem:30,tremDepth:.75}),
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0.8}),
  V({v0:'o',v1:'o',f0:120,fp:175,f1:110,peakAt:0.3,att:.05,hold:.5,dur:0.9,vol:.85,start:0.82,rough:0.68,breath:.25,drive:2.5,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:0.9,vol:.12,start:0.83,trem:30,tremDepth:.75}),
  V({v0:'o',v1:'o',f0:60,fp:87.5,f1:55,peakAt:0.3,att:.07,hold:.5,dur:0.9,vol:.28,start:0.83,rough:.9,breath:.1,drive:3,vib:.15,jitter:.05,size:1.3})]},
 bruell10:{cat:'stimme',name:'Gebrüll 10 – „Haa-roo!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:.9,room:.28,pitchVar:.09,layers:[
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0}),
  V({v0:'a',v1:'a',f0:120,fp:165,f1:135,peakAt:0.4,att:.05,hold:.5,dur:0.6,vol:.85,start:0.02,rough:0.74,breath:.25,drive:2.65,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:0.6,vol:.12,start:0.03,trem:22,tremDepth:.75}),
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0.55}),
  V({v0:'o',v1:'o',f0:140,fp:170,f1:105,peakAt:0.3,att:.05,hold:.5,dur:0.9,vol:.85,start:0.57,rough:0.74,breath:.25,drive:2.65,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:0.9,vol:.12,start:0.58,trem:22,tremDepth:.75}),
  V({v0:'o',v1:'o',f0:70,fp:85,f1:52.5,peakAt:0.3,att:.07,hold:.5,dur:0.9,vol:.28,start:0.58,rough:.9,breath:.1,drive:3,vib:.15,jitter:.05,size:1.3})]},
 bruell11:{cat:'stimme',name:'Gebrüll 11 – „Gaaah!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:.9,room:.28,pitchVar:.09,layers:[
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0}),
  V({v0:'a',v1:'a',f0:125,fp:190,f1:130,peakAt:0.25,att:.05,hold:.5,dur:1.1,vol:.85,start:0.02,rough:0.5,breath:.25,drive:2.8,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:1.1,vol:.12,start:0.03,trem:23,tremDepth:.75}),
  V({v0:'a',v1:'a',f0:62.5,fp:95,f1:65,peakAt:0.25,att:.07,hold:.5,dur:1.1,vol:.28,start:0.03,rough:.9,breath:.1,drive:3,vib:.15,jitter:.05,size:1.3})]},
 bruell12:{cat:'stimme',name:'Gebrüll 12 – „Uuurrh!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:.9,room:.28,pitchVar:.09,layers:[
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0}),
  V({v0:'u',v1:'ə',f0:95,fp:125,f1:90,peakAt:0.4,att:.05,hold:.5,dur:1.4,vol:.85,start:0.02,rough:0.56,breath:.25,drive:2.95,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:1.4,vol:.12,start:0.03,trem:24,tremDepth:.75}),
  V({v0:'u',v1:'ə',f0:47.5,fp:62.5,f1:45,peakAt:0.4,att:.07,hold:.5,dur:1.4,vol:.28,start:0.03,rough:.9,breath:.1,drive:3,vib:.15,jitter:.05,size:1.3})]},
 bruell13:{cat:'stimme',name:'Gebrüll 13 – „Ääärgh!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:.9,room:.28,pitchVar:.09,layers:[
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0}),
  V({v0:'ä',v1:'ə',f0:110,fp:165,f1:100,peakAt:0.3,att:.05,hold:.5,dur:1.3,vol:.85,start:0.02,rough:0.62,breath:.25,drive:2.5,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:1.3,vol:.12,start:0.03,trem:25,tremDepth:.75}),
  V({v0:'ä',v1:'ə',f0:55,fp:82.5,f1:50,peakAt:0.3,att:.07,hold:.5,dur:1.3,vol:.28,start:0.03,rough:.9,breath:.1,drive:3,vib:.15,jitter:.05,size:1.3})]},
 bruell14:{cat:'stimme',name:'Gebrüll 14 – „Rah! Rah!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:.9,room:.28,pitchVar:.09,layers:[
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0}),
  V({v0:'a',v1:'a',f0:130,fp:165,f1:120,peakAt:0.3,att:.05,hold:.5,dur:0.45,vol:.85,start:0.02,rough:0.68,breath:.25,drive:2.65,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:0.45,vol:.12,start:0.03,trem:26,tremDepth:.75}),
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0.55}),
  V({v0:'a',v1:'a',f0:130,fp:170,f1:110,peakAt:0.3,att:.05,hold:.5,dur:0.7,vol:.85,start:0.57,rough:0.68,breath:.25,drive:2.65,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:0.7,vol:.12,start:0.58,trem:26,tremDepth:.75}),
  V({v0:'a',v1:'a',f0:65,fp:85,f1:55,peakAt:0.3,att:.07,hold:.5,dur:0.7,vol:.28,start:0.58,rough:.9,breath:.1,drive:3,vib:.15,jitter:.05,size:1.3})]},
 bruell15:{cat:'stimme',name:'Gebrüll 15 – „Hoaaah!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:.9,room:.28,pitchVar:.09,layers:[
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0}),
  V({v0:'o',v1:'a',f0:105,fp:170,f1:115,peakAt:0.5,att:.05,hold:.5,dur:1.5,vol:.85,start:0.02,rough:0.74,breath:.25,drive:2.8,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:1.5,vol:.12,start:0.03,trem:27,tremDepth:.75}),
  V({v0:'o',v1:'a',f0:52.5,fp:85,f1:57.5,peakAt:0.5,att:.07,hold:.5,dur:1.5,vol:.28,start:0.03,rough:.9,breath:.1,drive:3,vib:.15,jitter:.05,size:1.3})]},
 bruell16:{cat:'stimme',name:'Gebrüll 16 – „Hmm-RAH!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:.9,room:.28,pitchVar:.09,layers:[
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0}),
  V({v0:'u',v1:'u',f0:90,fp:95,f1:92,peakAt:0.5,att:.05,hold:.5,dur:0.4,vol:.85,start:0.02,rough:0.5,breath:.25,drive:2.95,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:0.4,vol:.12,start:0.03,trem:28,tremDepth:.75}),
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0.38}),
  V({v0:'ə',v1:'a',f0:125,fp:185,f1:120,peakAt:0.25,att:.05,hold:.5,dur:1,vol:.85,start:0.4,rough:0.5,breath:.25,drive:2.95,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:1,vol:.12,start:0.41,trem:28,tremDepth:.75}),
  V({v0:'ə',v1:'a',f0:62.5,fp:92.5,f1:60,peakAt:0.25,att:.07,hold:.5,dur:1,vol:.28,start:0.41,rough:.9,breath:.1,drive:3,vib:.15,jitter:.05,size:1.3})]},
 bruell17:{cat:'stimme',name:'Gebrüll 17 – „Ooo-ha!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:.9,room:.28,pitchVar:.09,layers:[
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0}),
  V({v0:'o',v1:'o',f0:115,fp:150,f1:130,peakAt:0.4,att:.05,hold:.5,dur:0.8,vol:.85,start:0.02,rough:0.56,breath:.25,drive:2.5,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:0.8,vol:.12,start:0.03,trem:29,tremDepth:.75}),
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0.85}),
  V({v0:'a',v1:'a',f0:140,fp:160,f1:110,peakAt:0.3,att:.05,hold:.5,dur:0.6,vol:.85,start:0.87,rough:0.56,breath:.25,drive:2.5,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:0.6,vol:.12,start:0.88,trem:29,tremDepth:.75}),
  V({v0:'o',v1:'o',f0:57.5,fp:75,f1:65,peakAt:0.4,att:.07,hold:.5,dur:0.8,vol:.28,start:0.03,rough:.9,breath:.1,drive:3,vib:.15,jitter:.05,size:1.3})]},
 bruell18:{cat:'stimme',name:'Gebrüll 18 – „Hrooom!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:.9,room:.28,pitchVar:.09,layers:[
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0}),
  V({v0:'ə',v1:'u',f0:90,fp:140,f1:95,peakAt:0.4,att:.05,hold:.5,dur:1.4,vol:.85,start:0.02,rough:0.62,breath:.25,drive:2.65,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:1.4,vol:.12,start:0.03,trem:30,tremDepth:.75}),
  V({v0:'ə',v1:'u',f0:45,fp:70,f1:47.5,peakAt:0.4,att:.07,hold:.5,dur:1.4,vol:.28,start:0.03,rough:.9,breath:.1,drive:3,vib:.15,jitter:.05,size:1.3})]},
 bruell19:{cat:'stimme',name:'Gebrüll 19 – „Waaagh!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:.9,room:.28,pitchVar:.09,layers:[
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0}),
  V({v0:'u',v1:'a',f0:100,fp:175,f1:105,peakAt:0.45,att:.05,hold:.5,dur:1.4,vol:.85,start:0.02,rough:0.68,breath:.25,drive:2.8,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:1.4,vol:.12,start:0.03,trem:22,tremDepth:.75}),
  V({v0:'u',v1:'a',f0:50,fp:87.5,f1:52.5,peakAt:0.45,att:.07,hold:.5,dur:1.4,vol:.28,start:0.03,rough:.9,breath:.1,drive:3,vib:.15,jitter:.05,size:1.3})]},
 bruell20:{cat:'stimme',name:'Gebrüll 20 – „Ha-ROOO!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:.9,room:.28,pitchVar:.09,layers:[
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0}),
  V({v0:'a',v1:'a',f0:130,fp:140,f1:135,peakAt:0.4,att:.05,hold:.5,dur:0.3,vol:.85,start:0.02,rough:0.74,breath:.25,drive:2.95,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:0.3,vol:.12,start:0.03,trem:23,tremDepth:.75}),
  N({filter:'bp',f0:1500,f1:800,q:.7,att:.004,hold:.1,dur:.1,vol:.1,start:0.3}),
  V({v0:'o',v1:'o',f0:125,fp:180,f1:110,peakAt:0.3,att:.05,hold:.5,dur:1.1,vol:.85,start:0.32,rough:0.74,breath:.25,drive:2.95,vib:.3,jitter:.035,size:1.2}),
  N({color:'pink',filter:'bp',f0:430,f1:330,q:1.1,att:.06,hold:.5,dur:1.1,vol:.12,start:0.33,trem:23,tremDepth:.75}),
  V({v0:'o',v1:'o',f0:62.5,fp:90,f1:55,peakAt:0.3,att:.07,hold:.5,dur:1.1,vol:.28,start:0.33,rough:.9,breath:.1,drive:3,vib:.15,jitter:.05,size:1.3})]},
 effort:{cat:'stimme',name:'Anstrengung (Schlag)',use:'Kurzes Ächzen beim harten Zuschlagen („Hh!“).',vol:.9,room:.08,pitchVar:.08,layers:[
  V({v0:'ə',v1:'u',f0:115,fp:125,f1:95,peakAt:.2,att:.012,hold:.1,dur:.22,vol:.65,rough:.5,breath:.55,drive:2})]},
 painLight:{cat:'stimme',name:'Schmerz (leicht)',use:'Kleiner Treffer („Ugh!“).',vol:.95,room:.1,pitchVar:.08,layers:[
  V({v0:'u',v1:'ə',f0:135,fp:150,f1:105,peakAt:.15,att:.015,hold:.15,dur:.32,vol:.65,rough:.55,breath:.45,drive:2})]},
 painScream:{cat:'stimme',name:'Schmerzschrei',use:'Schwerer Treffer („Aaargh!“).',vol:1,room:.15,pitchVar:.06,layers:[
  V({v0:'a',v1:'ä',f0:190,fp:300,f1:170,peakAt:.2,att:.03,hold:.35,dur:.85,vol:.85,rough:.75,breath:.3,drive:4,vib:.6})]},
 deathScream:{cat:'stimme',name:'Todesschrei',use:'Tödlicher Treffer.',vol:1,room:.2,pitchVar:.05,layers:[
  V({v0:'a',v1:'o',f0:240,fp:290,f1:95,peakAt:.12,att:.03,hold:.3,dur:1.5,vol:.85,rough:.7,breath:.35,drive:3.5,vib:1})]},
 dying:{cat:'stimme',name:'Röcheln',use:'Am Boden, schwer verletzt, im Sterben.',vol:.85,room:.1,pitchVar:.05,layers:[
  V({v0:'ə',v1:'u',f0:85,fp:95,f1:70,peakAt:.3,att:.1,hold:.3,dur:1.1,vol:.5,rough:1,breath:.8,drive:1.5}),N({color:'pink',f0:700,q:2,trem:9,tremDepth:.9,att:.1,dur:1,vol:.12})]},
 // ----- Arena & Publikum
// ---- Schmerz in vielen Varianten (leise, kurz, zur Stimme passend; Tonhöhe kommt von der Stimmlage) ----
 pain01:{cat:'stimme',name:'Schmerz 1 – „Uff“',use:'Leichter Treffer (zufällige Variante).',vol:.85,room:.1,pitchVar:.06,layers:[V({att:0.02,hold:0.2,rough:0.4,breath:0.6,drive:1.8,vib:0,jitter:0.03,v0:'u',v1:'ə',f0:125,fp:135,f1:100,peakAt:0.2,dur:0.16,vol:0.5}),N({color:'white',filter:'bp',f0:1200,f1:900,q:0.8,att:0.01,hold:0.1,dur:0.09,vol:0.08,start:0.12})]},
 pain02:{cat:'stimme',name:'Schmerz 2 – „Ah“',use:'Leichter Treffer (zufällige Variante).',vol:.85,room:.1,pitchVar:.06,layers:[V({att:0.02,hold:0.2,rough:0.4,breath:0.45,drive:1.8,vib:0,jitter:0.03,v0:'a',v1:'ə',f0:130,fp:160,f1:110,peakAt:0.3,dur:0.22,vol:0.5})]},
 pain03:{cat:'stimme',name:'Schmerz 3 – „Ngh“',use:'Leichter Treffer (zufällige Variante).',vol:.85,room:.1,pitchVar:.06,layers:[V({att:0.02,hold:0.2,rough:0.6,breath:0.45,drive:1.8,vib:0,jitter:0.03,v0:'ə',v1:'ə',f0:115,fp:125,f1:105,peakAt:0.4,dur:0.26,vol:0.4,size:1.15})]},
 pain04:{cat:'stimme',name:'Schmerz 4 – „Hm!“',use:'Leichter Treffer (zufällige Variante).',vol:.85,room:.1,pitchVar:.06,layers:[V({att:0.02,hold:0.2,rough:0.4,breath:0.45,drive:1.8,vib:0,jitter:0.03,v0:'u',v1:'u',f0:120,fp:130,f1:110,peakAt:0.3,dur:0.12,vol:0.42,size:1.1}),N({color:'white',filter:'bp',f0:1500,q:0.7,att:0.01,hold:0.2,dur:0.12,vol:0.07,start:0.1})]},
 pain05:{cat:'stimme',name:'Schmerz 5 – „Agh“',use:'Leichter Treffer (zufällige Variante).',vol:.85,room:.1,pitchVar:.06,layers:[V({att:0.02,hold:0.2,rough:0.55,breath:0.45,drive:2.2,vib:0,jitter:0.03,v0:'a',v1:'ə',f0:140,fp:175,f1:115,peakAt:0.25,dur:0.3,vol:0.5})]},
 pain06:{cat:'stimme',name:'Schmerz 6 – „Oh“',use:'Leichter Treffer (zufällige Variante).',vol:.85,room:.1,pitchVar:.06,layers:[V({att:0.02,hold:0.2,rough:0.4,breath:0.45,drive:1.8,vib:0,jitter:0.03,v0:'o',v1:'u',f0:150,fp:155,f1:120,peakAt:0.2,dur:0.24,vol:0.45})]},
 pain07:{cat:'stimme',name:'Schmerz 7 – „Au“',use:'Leichter Treffer (zufällige Variante).',vol:.85,room:.1,pitchVar:.06,layers:[V({att:0.02,hold:0.2,rough:0.4,breath:0.45,drive:1.8,vib:0,jitter:0.03,v0:'a',v1:'u',f0:160,fp:195,f1:130,peakAt:0.35,dur:0.28,vol:0.48})]},
 pain08:{cat:'stimme',name:'Schmerz 8 – „Ächz“',use:'Leichter Treffer (zufällige Variante).',vol:.85,room:.1,pitchVar:.06,layers:[V({att:0.02,hold:0.2,rough:0.7,breath:0.55,drive:1.8,vib:0,jitter:0.03,v0:'ä',v1:'ə',f0:110,fp:118,f1:98,peakAt:0.3,dur:0.34,vol:0.42})]},
 pain09:{cat:'stimme',name:'Schmerz 9 – „Keuchen“',use:'Leichter Treffer (zufällige Variante).',vol:.85,room:.1,pitchVar:.06,layers:[N({color:'white',filter:'bp',f0:1300,f1:1700,q:0.9,att:0.08,hold:0.3,dur:0.24,vol:0.16}),V({att:0.02,hold:0.2,rough:0.4,breath:0.8,drive:1.8,vib:0,jitter:0.03,v0:'ə',v1:'ə',f0:120,fp:125,f1:115,peakAt:0.5,dur:0.1,vol:0.25,start:0.18})]},
 pain10:{cat:'stimme',name:'Schmerz 10 – „Urgh“',use:'Leichter Treffer (zufällige Variante).',vol:.85,room:.1,pitchVar:.06,layers:[V({att:0.02,hold:0.2,rough:0.65,breath:0.45,drive:1.8,vib:0,jitter:0.03,v0:'ə',v1:'u',f0:100,fp:128,f1:92,peakAt:0.35,dur:0.32,vol:0.48})]},
 pain11:{cat:'stimme',name:'Schmerz 11 – „Aah (Stöhnen)“',use:'Leichter Treffer (zufällige Variante).',vol:.85,room:.1,pitchVar:.06,layers:[V({att:0.02,hold:0.4,rough:0.4,breath:0.55,drive:1.8,vib:0.4,jitter:0.03,v0:'a',v1:'a',f0:135,fp:140,f1:115,peakAt:0.2,dur:0.45,vol:0.38})]},
 pain12:{cat:'stimme',name:'Schmerz 12 – „Zischen“',use:'Leichter Treffer (zufällige Variante).',vol:.85,room:.1,pitchVar:.06,layers:[N({color:'white',filter:'hp',f0:4500,q:0.7,att:0.02,hold:0.5,dur:0.24,vol:0.12}),V({att:0.02,hold:0.2,rough:0.4,breath:0.45,drive:1.8,vib:0,jitter:0.03,v0:'i',v1:'ə',f0:130,fp:140,f1:120,peakAt:0.3,dur:0.1,vol:0.2,start:0.2})]},
 pain13:{cat:'stimme',name:'Schmerz 13 – „Hnn“',use:'Leichter Treffer (zufällige Variante).',vol:.85,room:.1,pitchVar:.06,layers:[V({att:0.02,hold:0.3,rough:0.4,breath:0.3,drive:1.8,vib:0,jitter:0.03,v0:'u',v1:'ə',f0:118,fp:124,f1:104,peakAt:0.5,dur:0.3,vol:0.38,size:1.15})]},
 pain14:{cat:'stimme',name:'Schmerz 14 – „Ah! (kurz)“',use:'Leichter Treffer (zufällige Variante).',vol:.85,room:.1,pitchVar:.06,layers:[V({att:0.02,hold:0.2,rough:0.4,breath:0.45,drive:2.4,vib:0,jitter:0.03,v0:'a',v1:'a',f0:170,fp:200,f1:150,peakAt:0.2,dur:0.13,vol:0.48})]},
 hurt01:{cat:'stimme',name:'Schmerzschrei 1 – „Aaargh“',use:'Schwerer Treffer (zufällige Variante).',vol:.85,room:.15,pitchVar:.05,layers:[V({att:0.02,hold:0.35,rough:0.6,breath:0.45,drive:2.6,vib:0.5,jitter:0.03,v0:'a',v1:'ə',f0:136,fp:200,f1:120,peakAt:0.2,dur:0.7,vol:0.62})]},
 hurt02:{cat:'stimme',name:'Schmerzschrei 2 – „Aaah!“',use:'Schwerer Treffer (zufällige Variante).',vol:.85,room:.15,pitchVar:.05,layers:[V({att:0.02,hold:0.3,rough:0.45,breath:0.45,drive:2.2,vib:0.6,jitter:0.03,v0:'a',v1:'a',f0:160,fp:232,f1:152,peakAt:0.15,dur:0.6,vol:0.6})]},
 hurt03:{cat:'stimme',name:'Schmerzschrei 3 – „Oaah“',use:'Schwerer Treffer (zufällige Variante).',vol:.85,room:.15,pitchVar:.05,layers:[V({att:0.02,hold:0.3,rough:0.55,breath:0.45,drive:2.4,vib:0,jitter:0.03,v0:'o',v1:'a',f0:128,fp:184,f1:120,peakAt:0.4,dur:0.65,vol:0.6})]},
 hurt04:{cat:'stimme',name:'Schmerzschrei 4 – „Ahh-hh“',use:'Schwerer Treffer (zufällige Variante).',vol:.85,room:.15,pitchVar:.05,layers:[V({att:0.02,hold:0.2,rough:0.5,breath:0.45,drive:2.3,vib:0,jitter:0.03,v0:'a',v1:'ə',f0:144,fp:192,f1:128,peakAt:0.2,dur:0.35,vol:0.58}),V({att:0.02,hold:0.2,rough:0.5,breath:0.45,drive:2,vib:0,jitter:0.03,v0:'a',v1:'ə',f0:128,fp:160,f1:104,peakAt:0.2,dur:0.35,vol:0.45,start:0.4})]},
 hurt05:{cat:'stimme',name:'Schmerzschrei 5 – „Ngaah“',use:'Schwerer Treffer (zufällige Variante).',vol:.85,room:.15,pitchVar:.05,layers:[V({att:0.02,hold:0.2,rough:0.65,breath:0.45,drive:2.6,vib:0,jitter:0.03,v0:'ə',v1:'a',f0:120,fp:208,f1:136,peakAt:0.6,dur:0.6,vol:0.58})]},
 hurt06:{cat:'stimme',name:'Schmerzschrei 6 – „Ääh“',use:'Schwerer Treffer (zufällige Variante).',vol:.85,room:.15,pitchVar:.05,layers:[V({att:0.02,hold:0.3,rough:0.5,breath:0.45,drive:2.3,vib:0.7,jitter:0.03,v0:'ä',v1:'ə',f0:168,fp:216,f1:128,peakAt:0.15,dur:0.55,vol:0.55})]},
 hurt07:{cat:'stimme',name:'Schmerzschrei 7 – „Uaaah“',use:'Schwerer Treffer (zufällige Variante).',vol:.85,room:.15,pitchVar:.05,layers:[V({att:0.02,hold:0.3,rough:0.55,breath:0.45,drive:2.5,vib:0,jitter:0.03,v0:'u',v1:'a',f0:120,fp:196,f1:128,peakAt:0.45,dur:0.75,vol:0.58})]},
 hurt08:{cat:'stimme',name:'Schmerzschrei 8 – „Ah! Ah!“',use:'Schwerer Treffer (zufällige Variante).',vol:.85,room:.15,pitchVar:.05,layers:[V({att:0.02,hold:0.2,rough:0.4,breath:0.45,drive:2.4,vib:0,jitter:0.03,v0:'a',v1:'a',f0:168,fp:200,f1:160,peakAt:0.2,dur:0.2,vol:0.55}),V({att:0.02,hold:0.2,rough:0.4,breath:0.45,drive:2.4,vib:0,jitter:0.03,v0:'a',v1:'ə',f0:160,fp:192,f1:136,peakAt:0.2,dur:0.3,vol:0.55,start:0.27})]},
// ---- Schlacht: ganze Gruppe brüllt beim Angriff ----
 warcry1:{cat:'arena',name:'Gruppen-Kampfgebrüll 1',use:'Kampfbeginn und Ansturm vieler Kämpfer: eine ganze Gruppe brüllt.',vol:.85,room:.35,pitchVar:.03,layers:[C({n:22,f0:105,f1:172,vowels:'oou',att:0.25,hold:0.5,dur:1.9,vol:0.55,spread:0.45,rise:0.35}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:121.2,fp:171.1,f1:142.6,peakAt:0.35,dur:0.922645,vol:0.246456,start:0.289744}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:147.6,fp:208.3,f1:173.6,peakAt:0.35,dur:1.181,vol:0.207712,start:0.332159}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:147.6,fp:208.3,f1:173.6,peakAt:0.35,dur:1.06375,vol:0.253664,start:0.220381}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:89.6,fp:126.5,f1:105.4,peakAt:0.35,dur:1.22495,vol:0.185318,start:0.320633}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:131.8,fp:186,f1:155,peakAt:0.35,dur:1.2828,vol:0.194481,start:0.156606}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:131.8,fp:186,f1:155,peakAt:0.35,dur:1.00369,vol:0.184908,start:0.340394}),N({color:'pink',filter:'bp',f0:900,f1:700,q:0.6,att:0.3,hold:0.5,dur:2,vol:0.1})]},
 warcry2:{cat:'arena',name:'Gruppen-Kampfgebrüll 2',use:'Kampfbeginn und Ansturm vieler Kämpfer: eine ganze Gruppe brüllt.',vol:.85,room:.35,pitchVar:.03,layers:[C({n:22,f0:111,f1:180,vowels:'oo',att:0.25,hold:0.5,dur:2.1,vol:0.55,spread:0.45,rise:0.35}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:121.2,fp:171.1,f1:142.6,peakAt:0.35,dur:1.251,vol:0.218563,start:0.166112}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:147.6,fp:208.3,f1:173.6,peakAt:0.35,dur:0.991772,vol:0.253162,start:0.141729}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:131.8,fp:186,f1:155,peakAt:0.35,dur:1.13079,vol:0.26393,start:0.0046641}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:121.2,fp:171.1,f1:142.6,peakAt:0.35,dur:1.28999,vol:0.211888,start:0.474402}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:110.7,fp:156.2,f1:130.2,peakAt:0.35,dur:0.859909,vol:0.238776,start:0.327328}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:121.2,fp:171.1,f1:142.6,peakAt:0.35,dur:0.836359,vol:0.216021,start:0.433446}),N({color:'pink',filter:'bp',f0:900,f1:700,q:0.6,att:0.3,hold:0.5,dur:2,vol:0.1})]},
 warcry3:{cat:'arena',name:'Gruppen-Kampfgebrüll 3',use:'Kampfbeginn und Ansturm vieler Kämpfer: eine ganze Gruppe brüllt.',vol:.85,room:.35,pitchVar:.03,layers:[C({n:22,f0:117,f1:187,vowels:'ouo',att:0.25,hold:0.5,dur:2.3,vol:0.55,spread:0.45,rise:0.35}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:147.6,fp:208.3,f1:173.6,peakAt:0.35,dur:0.922446,vol:0.193954,start:0.0556655}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:89.6,fp:126.5,f1:105.4,peakAt:0.35,dur:1.09525,vol:0.183178,start:0.33835}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:89.6,fp:126.5,f1:105.4,peakAt:0.35,dur:1.08062,vol:0.251602,start:0.109319}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:147.6,fp:208.3,f1:173.6,peakAt:0.35,dur:1.0246,vol:0.207819,start:0.272471}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:89.6,fp:126.5,f1:105.4,peakAt:0.35,dur:1.14907,vol:0.214025,start:0.379404}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:100.1,fp:141.4,f1:117.8,peakAt:0.35,dur:0.851105,vol:0.217993,start:0.107657}),N({color:'pink',filter:'bp',f0:900,f1:700,q:0.6,att:0.3,hold:0.5,dur:2,vol:0.1})]},
 warcry4:{cat:'arena',name:'Gruppen-Kampfgebrüll 4',use:'Kampfbeginn und Ansturm vieler Kämpfer: eine ganze Gruppe brüllt.',vol:.85,room:.35,pitchVar:.03,layers:[C({n:22,f0:124,f1:194,vowels:'uo',att:0.25,hold:0.5,dur:2.5,vol:0.55,spread:0.45,rise:0.35}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:89.6,fp:126.5,f1:105.4,peakAt:0.35,dur:1.2797,vol:0.216988,start:0.143042}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:147.6,fp:208.3,f1:173.6,peakAt:0.35,dur:1.0994,vol:0.240899,start:0.396476}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:131.8,fp:186,f1:155,peakAt:0.35,dur:1.11225,vol:0.27471,start:0.216194}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:121.2,fp:171.1,f1:142.6,peakAt:0.35,dur:1.22544,vol:0.262022,start:0.196968}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:121.2,fp:171.1,f1:142.6,peakAt:0.35,dur:1.05622,vol:0.229598,start:0.076734}),V({att:0.04,hold:0.45,rough:0.45,breath:0.4,drive:2.6,vib:0.25,size:1.2,jitter:0.03,v0:'o',v1:'o',f0:121.2,fp:171.1,f1:142.6,peakAt:0.35,dur:1.08758,vol:0.217693,start:0.298608}),N({color:'pink',filter:'bp',f0:900,f1:700,q:0.6,att:0.3,hold:0.5,dur:2,vol:0.1})]},
// ---- Publikum in Varianten (leiser, abwechselnd) ----
 cheer1:{cat:'arena',name:'Anfeuern 1',use:'Publikum feuert an (zufällige Variante).',vol:.75,room:.35,pitchVar:.04,layers:[C({n:24,f0:130,f1:250,vowels:'aaeo',att:0.3,hold:0.4,dur:2,vol:0.6,spread:0.5,rise:0.2}),K({n:20,gap:0.07,jitter:0.9,f:1700,q:1.2,dur:0.03,vol:0.14,start:0.2}),N({color:'pink',f0:900,q:0.6,att:0.4,hold:0.3,dur:2.2,vol:0.09})]},
 cheer2:{cat:'arena',name:'Anfeuern 2',use:'Publikum feuert an (zufällige Variante).',vol:.75,room:.35,pitchVar:.04,layers:[C({n:24,f0:120,f1:240,vowels:'aeo',att:0.3,hold:0.4,dur:2.2,vol:0.6,spread:0.5,rise:0.3}),K({n:24,gap:0.07,jitter:0.9,f:1820,q:1.2,dur:0.03,vol:0.14,start:0.2}),N({color:'pink',f0:900,q:0.6,att:0.4,hold:0.3,dur:2.2,vol:0.09})]},
 cheer3:{cat:'arena',name:'Anfeuern 3',use:'Publikum feuert an (zufällige Variante).',vol:.75,room:.35,pitchVar:.04,layers:[C({n:24,f0:140,f1:270,vowels:'aao',att:0.3,hold:0.4,dur:2.4,vol:0.6,spread:0.5,rise:0.15}),K({n:28,gap:0.07,jitter:0.9,f:1940,q:1.2,dur:0.03,vol:0.14,start:0.2}),N({color:'pink',f0:900,q:0.6,att:0.4,hold:0.3,dur:2.2,vol:0.09})]},
 cheer4:{cat:'arena',name:'Anfeuern 4',use:'Publikum feuert an (zufällige Variante).',vol:.75,room:.35,pitchVar:.04,layers:[C({n:24,f0:125,f1:230,vowels:'eao',att:0.3,hold:0.4,dur:2.6,vol:0.6,spread:0.5,rise:0.25}),K({n:32,gap:0.07,jitter:0.9,f:2060,q:1.2,dur:0.03,vol:0.14,start:0.2}),N({color:'pink',f0:900,q:0.6,att:0.4,hold:0.3,dur:2.2,vol:0.09})]},
 jubel1:{cat:'arena',name:'Jubel bei Verletzung 1',use:'Blut! Das Publikum jubelt bei einer schweren Verletzung.',vol:.8,room:.35,pitchVar:.04,layers:[C({n:30,f0:150,f1:290,vowels:'aae',att:0.12,hold:0.35,dur:2.2,vol:0.7,spread:0.4,rise:0.45}),K({n:34,gap:0.05,jitter:0.9,f:1900,q:1.2,dur:0.03,vol:0.16,start:0.15})]},
 jubel2:{cat:'arena',name:'Jubel bei Verletzung 2',use:'Blut! Das Publikum jubelt bei einer schweren Verletzung.',vol:.8,room:.35,pitchVar:.04,layers:[C({n:30,f0:160,f1:305,vowels:'aäe',att:0.12,hold:0.35,dur:2.2,vol:0.7,spread:0.4,rise:0.45}),K({n:34,gap:0.05,jitter:0.9,f:1900,q:1.2,dur:0.03,vol:0.16,start:0.15})]},
 jubel3:{cat:'arena',name:'Jubel bei Verletzung 3',use:'Blut! Das Publikum jubelt bei einer schweren Verletzung.',vol:.8,room:.35,pitchVar:.04,layers:[C({n:30,f0:170,f1:320,vowels:'eaa',att:0.12,hold:0.35,dur:2.2,vol:0.7,spread:0.4,rise:0.45}),K({n:34,gap:0.05,jitter:0.9,f:1900,q:1.2,dur:0.03,vol:0.16,start:0.15})]},
 ooh1:{cat:'arena',name:'Raunen 1',use:'Publikum raunt („Ohhh“) bei Sturz und hartem Treffer.',vol:.75,room:.3,pitchVar:.05,layers:[C({n:22,f0:95,f1:190,vowels:'oou',att:0.15,hold:0.3,dur:1.4,vol:0.62,spread:0.3,rise:-0.1})]},
 ooh2:{cat:'arena',name:'Raunen 2',use:'Publikum raunt („Ohhh“) bei Sturz und hartem Treffer.',vol:.75,room:.3,pitchVar:.05,layers:[C({n:22,f0:105,f1:200,vowels:'ouo',att:0.15,hold:0.3,dur:1.6,vol:0.62,spread:0.3,rise:-0.15})]},
 ooh3:{cat:'arena',name:'Raunen 3',use:'Publikum raunt („Ohhh“) bei Sturz und hartem Treffer.',vol:.75,room:.3,pitchVar:.05,layers:[C({n:22,f0:115,f1:210,vowels:'uoo',att:0.15,hold:0.3,dur:1.8,vol:0.62,spread:0.3,rise:-0.2})]},
 boo1:{cat:'arena',name:'Buhen 1',use:'Publikum buht (Rückzug, Aufgabe, Gnadengesuch).',vol:.7,room:.3,pitchVar:.04,layers:[C({n:24,f0:105,f1:95,vowels:'uuo',att:0.3,hold:0.5,dur:2,vol:0.6,spread:0.3,rise:-0.05})]},
 boo2:{cat:'arena',name:'Buhen 2',use:'Publikum buht (Rückzug, Aufgabe, Gnadengesuch).',vol:.7,room:.3,pitchVar:.04,layers:[C({n:24,f0:113,f1:103,vowels:'uuo',att:0.3,hold:0.5,dur:2,vol:0.6,spread:0.3,rise:-0.05})]},
 crowd:{cat:'arena',name:'Jubel',use:'Publikum jubelt (Held, Bestie, Sieg).',vol:.9,room:.3,pitchVar:.04,layers:[
  C({n:30,f0:120,f1:260,vowels:'aaeo',att:.35,hold:.45,dur:2.6,vol:.7,spread:.5,rise:.2}),K({n:30,gap:.06,jitter:.9,f:1800,q:1.2,dur:.03,vol:.18,start:.2}),N({color:'pink',f0:900,q:.6,att:.5,hold:.3,dur:2.6,vol:.12})]},
 roar:{cat:'arena',name:'Raunen („Ohhh“)',use:'Publikum bei hartem Treffer, Sturz, Blut.',vol:.9,room:.3,pitchVar:.05,layers:[
  C({n:26,f0:100,f1:200,vowels:'oou',att:.15,hold:.3,dur:1.6,vol:.7,spread:.25,rise:-.1})]},
 applause:{cat:'arena',name:'Applaus (Schleife)',use:'Dezentes Klatschen während der Vorstellung eines Veteranen; läuft in Schleife.',vol:1.7,room:.35,pitchVar:0,layers:[
  K({n:34,gap:.125,jitter:.55,filter:'bp',f:1963,q:1.3,dur:.012,vol:0.31,start:0.047}),
  K({n:34,gap:.125,jitter:.55,filter:'bp',f:1398,q:1.3,dur:.012,vol:0.19,start:0.064}),
  K({n:34,gap:.125,jitter:.55,filter:'bp',f:2048,q:1.3,dur:.012,vol:0.26,start:0.109}),
  K({n:34,gap:.125,jitter:.55,filter:'bp',f:1739,q:1.3,dur:.012,vol:0.19,start:0.052}),
  K({n:34,gap:.125,jitter:.55,filter:'bp',f:1443,q:1.3,dur:.012,vol:0.21,start:0.066}),
  K({n:34,gap:.125,jitter:.55,filter:'bp',f:1421,q:1.3,dur:.012,vol:0.30,start:0.015}),
  K({n:34,gap:.125,jitter:.55,filter:'bp',f:1757,q:1.3,dur:.012,vol:0.27,start:0.070}),
  K({n:34,gap:.125,jitter:.55,filter:'bp',f:1426,q:1.3,dur:.012,vol:0.26,start:0.048}),
  K({n:34,gap:.125,jitter:.55,filter:'bp',f:1752,q:1.3,dur:.012,vol:0.19,start:0.103}),
  K({n:34,gap:.125,jitter:.55,filter:'bp',f:1893,q:1.3,dur:.012,vol:0.24,start:0.065}),
  K({n:34,gap:.125,jitter:.55,filter:'bp',f:2469,q:1.3,dur:.012,vol:0.22,start:0.098}),
  K({n:34,gap:.125,jitter:.55,filter:'bp',f:1670,q:1.3,dur:.012,vol:0.19,start:0.069}),
  K({n:34,gap:.125,jitter:.55,filter:'bp',f:1684,q:1.3,dur:.012,vol:0.23,start:0.066}),
  K({n:34,gap:.125,jitter:.55,filter:'bp',f:1428,q:1.3,dur:.012,vol:0.26,start:0.074}),
  N({color:'pink',filter:'bp',f0:1800,f1:1800,q:.6,att:.3,hold:.9,dur:4.3,vol:.06})]},
 laugh:{cat:'arena',name:'Gelächter',use:'Das Publikum lacht über einen Trottel bei der Vorstellung.',vol:.85,room:.35,pitchVar:.05,layers:[
  V({v0:'ä',v1:'ä',f0:189,fp:201,f1:165,peakAt:.2,att:.01,hold:.2,dur:0.109,vol:0.49,start:0.408,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ä',v1:'ä',f0:181,fp:193,f1:158,peakAt:.2,att:.01,hold:.2,dur:0.100,vol:0.35,start:0.585,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ä',v1:'ä',f0:173,fp:185,f1:152,peakAt:.2,att:.01,hold:.2,dur:0.093,vol:0.37,start:0.774,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ä',v1:'ä',f0:166,fp:177,f1:145,peakAt:.2,att:.01,hold:.2,dur:0.104,vol:0.40,start:0.942,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ä',v1:'ä',f0:158,fp:169,f1:139,peakAt:.2,att:.01,hold:.2,dur:0.093,vol:0.41,start:1.126,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ä',v1:'ä',f0:151,fp:161,f1:132,peakAt:.2,att:.01,hold:.2,dur:0.104,vol:0.49,start:1.277,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ä',v1:'ä',f0:143,fp:153,f1:125,peakAt:.2,att:.01,hold:.2,dur:0.128,vol:0.33,start:1.452,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ə',v1:'ə',f0:252,fp:268,f1:220,peakAt:.2,att:.01,hold:.2,dur:0.110,vol:0.46,start:0.204,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ə',v1:'ə',f0:241,fp:258,f1:211,peakAt:.2,att:.01,hold:.2,dur:0.094,vol:0.37,start:0.367,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ə',v1:'ə',f0:231,fp:247,f1:203,peakAt:.2,att:.01,hold:.2,dur:0.093,vol:0.45,start:0.546,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ə',v1:'ə',f0:221,fp:236,f1:194,peakAt:.2,att:.01,hold:.2,dur:0.113,vol:0.44,start:0.704,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ə',v1:'ə',f0:211,fp:225,f1:185,peakAt:.2,att:.01,hold:.2,dur:0.119,vol:0.48,start:0.889,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ə',v1:'ə',f0:201,fp:215,f1:176,peakAt:.2,att:.01,hold:.2,dur:0.128,vol:0.38,start:1.075,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'a',v1:'a',f0:189,fp:201,f1:165,peakAt:.2,att:.01,hold:.2,dur:0.120,vol:0.39,start:0.035,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'a',v1:'a',f0:181,fp:193,f1:158,peakAt:.2,att:.01,hold:.2,dur:0.110,vol:0.35,start:0.251,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'a',v1:'a',f0:173,fp:185,f1:152,peakAt:.2,att:.01,hold:.2,dur:0.101,vol:0.34,start:0.431,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'a',v1:'a',f0:166,fp:177,f1:145,peakAt:.2,att:.01,hold:.2,dur:0.112,vol:0.45,start:0.603,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'a',v1:'a',f0:158,fp:169,f1:139,peakAt:.2,att:.01,hold:.2,dur:0.117,vol:0.39,start:0.815,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'a',v1:'a',f0:151,fp:161,f1:132,peakAt:.2,att:.01,hold:.2,dur:0.093,vol:0.35,start:0.994,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ä',v1:'ä',f0:136,fp:145,f1:119,peakAt:.2,att:.01,hold:.2,dur:0.101,vol:0.35,start:0.291,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ä',v1:'ä',f0:131,fp:139,f1:114,peakAt:.2,att:.01,hold:.2,dur:0.114,vol:0.38,start:0.469,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ä',v1:'ä',f0:125,fp:133,f1:110,peakAt:.2,att:.01,hold:.2,dur:0.124,vol:0.49,start:0.640,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ä',v1:'ä',f0:120,fp:128,f1:105,peakAt:.2,att:.01,hold:.2,dur:0.120,vol:0.40,start:0.847,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ä',v1:'ä',f0:114,fp:122,f1:100,peakAt:.2,att:.01,hold:.2,dur:0.128,vol:0.44,start:1.060,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'o',v1:'o',f0:273,fp:291,f1:239,peakAt:.2,att:.01,hold:.2,dur:0.115,vol:0.33,start:0.239,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'o',v1:'o',f0:262,fp:279,f1:229,peakAt:.2,att:.01,hold:.2,dur:0.098,vol:0.35,start:0.408,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'o',v1:'o',f0:251,fp:267,f1:220,peakAt:.2,att:.01,hold:.2,dur:0.092,vol:0.32,start:0.573,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'o',v1:'o',f0:240,fp:256,f1:210,peakAt:.2,att:.01,hold:.2,dur:0.094,vol:0.39,start:0.723,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ä',v1:'ä',f0:199,fp:212,f1:174,peakAt:.2,att:.01,hold:.2,dur:0.128,vol:0.43,start:0.368,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ä',v1:'ä',f0:191,fp:204,f1:167,peakAt:.2,att:.01,hold:.2,dur:0.095,vol:0.41,start:0.570,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ä',v1:'ä',f0:183,fp:195,f1:160,peakAt:.2,att:.01,hold:.2,dur:0.109,vol:0.38,start:0.764,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ä',v1:'ä',f0:175,fp:187,f1:153,peakAt:.2,att:.01,hold:.2,dur:0.120,vol:0.45,start:0.930,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ä',v1:'ä',f0:167,fp:178,f1:146,peakAt:.2,att:.01,hold:.2,dur:0.118,vol:0.41,start:1.124,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ə',v1:'ə',f0:252,fp:268,f1:220,peakAt:.2,att:.01,hold:.2,dur:0.102,vol:0.44,start:0.088,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ə',v1:'ə',f0:241,fp:258,f1:211,peakAt:.2,att:.01,hold:.2,dur:0.124,vol:0.41,start:0.244,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ə',v1:'ə',f0:231,fp:247,f1:203,peakAt:.2,att:.01,hold:.2,dur:0.104,vol:0.36,start:0.464,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'ə',v1:'ə',f0:221,fp:236,f1:194,peakAt:.2,att:.01,hold:.2,dur:0.110,vol:0.43,start:0.645,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'a',v1:'a',f0:199,fp:212,f1:174,peakAt:.2,att:.01,hold:.2,dur:0.098,vol:0.41,start:0.484,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'a',v1:'a',f0:191,fp:204,f1:167,peakAt:.2,att:.01,hold:.2,dur:0.130,vol:0.46,start:0.668,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'a',v1:'a',f0:183,fp:195,f1:160,peakAt:.2,att:.01,hold:.2,dur:0.098,vol:0.43,start:0.871,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'a',v1:'a',f0:175,fp:187,f1:153,peakAt:.2,att:.01,hold:.2,dur:0.122,vol:0.45,start:1.036,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'a',v1:'a',f0:167,fp:178,f1:146,peakAt:.2,att:.01,hold:.2,dur:0.129,vol:0.33,start:1.226,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'a',v1:'a',f0:159,fp:170,f1:139,peakAt:.2,att:.01,hold:.2,dur:0.109,vol:0.38,start:1.410,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  V({v0:'a',v1:'a',f0:151,fp:161,f1:132,peakAt:.2,att:.01,hold:.2,dur:0.129,vol:0.43,start:1.593,rough:.25,breath:.55,drive:1.6,vib:0,jitter:.03}),
  C({n:14,f0:120,f1:220,vowels:'aä',att:.2,hold:.3,dur:2.4,vol:.25,rise:-.1,start:0})]},
// ---- Gelächter des Publikums in Varianten (tief, unregelmäßig, nicht im Gleichtakt – sonst klingt es wie Gackern) ----
 laugh1:{cat:'arena',name:'Gelächter 1 – Bauchlachen',use:'Das Publikum lacht über einen Trottel bei der Vorstellung (zufällige Variante).',vol:.8,room:.35,pitchVar:.05,layers:[
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:102.387,fp:110.263,f1:88.605,peakAt:0.25,dur:0.158,vol:0.273,start:0.508}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:97.268,fp:104.75,f1:84.174,peakAt:0.25,dur:0.144,vol:0.258,start:0.707}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:92.149,fp:99.237,f1:79.744,peakAt:0.25,dur:0.158,vol:0.226,start:0.956}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'ə',f0:87.029,fp:93.724,f1:75.314,peakAt:0.25,dur:0.15,vol:0.217,start:1.229}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'ə',f0:81.91,fp:88.211,f1:70.884,peakAt:0.25,dur:0.152,vol:0.261,start:1.404}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:144.055,fp:155.136,f1:124.663,peakAt:0.25,dur:0.148,vol:0.315,start:0.436}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:136.852,fp:147.379,f1:118.429,peakAt:0.25,dur:0.168,vol:0.262,start:0.78}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'ə',f0:129.649,fp:139.622,f1:112.196,peakAt:0.25,dur:0.166,vol:0.271,start:1.15}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:122.446,fp:131.865,f1:105.963,peakAt:0.25,dur:0.135,vol:0.283,start:1.489}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:115.244,fp:124.109,f1:99.73,peakAt:0.25,dur:0.145,vol:0.221,start:1.869}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:105.157,fp:113.246,f1:91.002,peakAt:0.25,dur:0.163,vol:0.324,start:0.17}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:99.899,fp:107.584,f1:86.451,peakAt:0.25,dur:0.153,vol:0.323,start:0.415}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'ə',f0:94.642,fp:101.922,f1:81.901,peakAt:0.25,dur:0.157,vol:0.275,start:0.711}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:89.384,fp:96.259,f1:77.351,peakAt:0.25,dur:0.128,vol:0.223,start:0.914}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:84.126,fp:90.597,f1:72.801,peakAt:0.25,dur:0.143,vol:0.257,start:1.204}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:78.868,fp:84.935,f1:68.251,peakAt:0.25,dur:0.149,vol:0.171,start:1.478}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:96.294,fp:103.701,f1:83.331,peakAt:0.25,dur:0.168,vol:0.284,start:0.12}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:91.479,fp:98.516,f1:79.165,peakAt:0.25,dur:0.147,vol:0.208,start:0.354}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:86.665,fp:93.331,f1:74.998,peakAt:0.25,dur:0.161,vol:0.285,start:0.663}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:81.85,fp:88.146,f1:70.832,peakAt:0.25,dur:0.146,vol:0.229,start:0.975}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:77.035,fp:82.961,f1:66.665,peakAt:0.25,dur:0.164,vol:0.188,start:1.178}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ə',v1:'ə',f0:119.887,fp:129.11,f1:103.749,peakAt:0.25,dur:0.151,vol:0.284,start:0.214}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ə',v1:'ə',f0:113.893,fp:122.654,f1:98.561,peakAt:0.25,dur:0.131,vol:0.284,start:0.415}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ə',v1:'ə',f0:107.899,fp:116.199,f1:93.374,peakAt:0.25,dur:0.16,vol:0.294,start:0.737}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ə',v1:'ə',f0:101.904,fp:109.743,f1:88.186,peakAt:0.25,dur:0.162,vol:0.19,start:0.972}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:96.407,fp:103.823,f1:83.429,peakAt:0.25,dur:0.151,vol:0.23,start:0.453}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'ə',f0:91.586,fp:98.632,f1:79.258,peakAt:0.25,dur:0.146,vol:0.243,start:0.645}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:86.766,fp:93.44,f1:75.086,peakAt:0.25,dur:0.143,vol:0.252,start:0.906}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:81.946,fp:88.249,f1:70.915,peakAt:0.25,dur:0.139,vol:0.202,start:1.081}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:77.125,fp:83.058,f1:66.743,peakAt:0.25,dur:0.165,vol:0.189,start:1.266}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'ə',f0:136.467,fp:146.964,f1:118.096,peakAt:0.25,dur:0.156,vol:0.319,start:0.012}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'ə',f0:129.643,fp:139.616,f1:112.191,peakAt:0.25,dur:0.147,vol:0.335,start:0.273}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'ə',f0:122.82,fp:132.268,f1:106.287,peakAt:0.25,dur:0.146,vol:0.273,start:0.548}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:115.997,fp:124.919,f1:100.382,peakAt:0.25,dur:0.149,vol:0.253,start:0.772}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:109.173,fp:117.571,f1:94.477,peakAt:0.25,dur:0.135,vol:0.26,start:0.954}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ə',v1:'ə',f0:138.537,fp:149.194,f1:119.888,peakAt:0.25,dur:0.148,vol:0.299,start:0.186}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ə',v1:'ə',f0:131.61,fp:141.734,f1:113.893,peakAt:0.25,dur:0.15,vol:0.325,start:0.47}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ə',v1:'ə',f0:124.683,fp:134.274,f1:107.899,peakAt:0.25,dur:0.161,vol:0.29,start:0.703}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ə',v1:'ə',f0:117.756,fp:126.815,f1:101.905,peakAt:0.25,dur:0.122,vol:0.192,start:0.957}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ə',v1:'ə',f0:110.83,fp:119.355,f1:95.91,peakAt:0.25,dur:0.165,vol:0.22,start:1.205}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ə',v1:'ə',f0:103.903,fp:111.895,f1:89.916,peakAt:0.25,dur:0.14,vol:0.156,start:1.5}),
  C({n:12,f0:100,f1:150,vowels:'oa',att:0.2,hold:0.4,dur:2.2,vol:0.22,rise:-0.1})]},
 laugh2:{cat:'arena',name:'Gelächter 2 – Gelächter',use:'Das Publikum lacht über einen Trottel bei der Vorstellung (zufällige Variante).',vol:.8,room:.35,pitchVar:.05,layers:[
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:218.342,fp:235.137,f1:188.95,peakAt:0.25,dur:0.162,vol:0.314,start:0.758}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:207.425,fp:223.38,f1:179.502,peakAt:0.25,dur:0.15,vol:0.283,start:0.913}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:196.508,fp:211.623,f1:170.055,peakAt:0.25,dur:0.142,vol:0.283,start:1.054}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:217.548,fp:234.282,f1:188.262,peakAt:0.25,dur:0.164,vol:0.35,start:0.435}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:206.67,fp:222.568,f1:178.849,peakAt:0.25,dur:0.141,vol:0.228,start:0.748}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'ə',f0:195.793,fp:210.854,f1:169.436,peakAt:0.25,dur:0.132,vol:0.215,start:0.96}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:184.916,fp:199.14,f1:160.023,peakAt:0.25,dur:0.138,vol:0.245,start:1.218}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:174.038,fp:187.426,f1:150.61,peakAt:0.25,dur:0.142,vol:0.223,start:1.542}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:147.565,fp:158.916,f1:127.7,peakAt:0.25,dur:0.158,vol:0.285,start:0.475}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:140.187,fp:150.97,f1:121.315,peakAt:0.25,dur:0.145,vol:0.273,start:0.658}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:132.808,fp:143.025,f1:114.93,peakAt:0.25,dur:0.138,vol:0.304,start:0.871}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:125.43,fp:135.079,f1:108.545,peakAt:0.25,dur:0.148,vol:0.263,start:1.048}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:118.052,fp:127.133,f1:102.16,peakAt:0.25,dur:0.131,vol:0.242,start:1.227}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'ə',f0:110.674,fp:119.187,f1:95.775,peakAt:0.25,dur:0.165,vol:0.243,start:1.375}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:218.5,fp:235.308,f1:189.087,peakAt:0.25,dur:0.144,vol:0.316,start:0.565}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:207.575,fp:223.543,f1:179.633,peakAt:0.25,dur:0.159,vol:0.208,start:0.853}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'ə',f0:196.65,fp:211.777,f1:170.178,peakAt:0.25,dur:0.17,vol:0.264,start:1.132}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:185.725,fp:200.012,f1:160.724,peakAt:0.25,dur:0.15,vol:0.286,start:1.313}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'ə',f0:174.8,fp:188.247,f1:151.27,peakAt:0.25,dur:0.127,vol:0.255,start:1.585}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:111.222,fp:119.778,f1:96.25,peakAt:0.25,dur:0.129,vol:0.232,start:0.718}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:105.661,fp:113.789,f1:91.437,peakAt:0.25,dur:0.121,vol:0.21,start:0.969}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'ə',f0:100.1,fp:107.8,f1:86.625,peakAt:0.25,dur:0.161,vol:0.216,start:1.143}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:150.114,fp:161.661,f1:129.906,peakAt:0.25,dur:0.12,vol:0.308,start:0.035}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:142.608,fp:153.578,f1:123.411,peakAt:0.25,dur:0.134,vol:0.247,start:0.333}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ə',f0:135.102,fp:145.495,f1:116.915,peakAt:0.25,dur:0.15,vol:0.226,start:0.604}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ə',f0:127.597,fp:137.412,f1:110.42,peakAt:0.25,dur:0.151,vol:0.29,start:0.853}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:186.212,fp:200.537,f1:161.145,peakAt:0.25,dur:0.167,vol:0.329,start:0.671}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:176.902,fp:190.51,f1:153.088,peakAt:0.25,dur:0.136,vol:0.252,start:0.914}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:167.591,fp:180.483,f1:145.031,peakAt:0.25,dur:0.169,vol:0.28,start:1.127}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'ə',f0:158.281,fp:170.456,f1:136.974,peakAt:0.25,dur:0.154,vol:0.196,start:1.432}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'ə',f0:148.97,fp:160.429,f1:128.916,peakAt:0.25,dur:0.143,vol:0.265,start:1.634}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'ə',f0:139.659,fp:150.402,f1:120.859,peakAt:0.25,dur:0.122,vol:0.224,start:1.906}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:113.619,fp:122.359,f1:98.324,peakAt:0.25,dur:0.134,vol:0.241,start:0.183}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:107.938,fp:116.241,f1:93.408,peakAt:0.25,dur:0.128,vol:0.218,start:0.402}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:102.257,fp:110.123,f1:88.492,peakAt:0.25,dur:0.121,vol:0.207,start:0.586}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:96.576,fp:104.005,f1:83.576,peakAt:0.25,dur:0.153,vol:0.242,start:0.761}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:90.895,fp:97.887,f1:78.66,peakAt:0.25,dur:0.154,vol:0.19,start:0.98}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:154.902,fp:166.817,f1:134.049,peakAt:0.25,dur:0.149,vol:0.313,start:0.017}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:147.157,fp:158.476,f1:127.347,peakAt:0.25,dur:0.121,vol:0.222,start:0.273}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:139.411,fp:150.135,f1:120.645,peakAt:0.25,dur:0.155,vol:0.232,start:0.514}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'ə',f0:131.666,fp:141.795,f1:113.942,peakAt:0.25,dur:0.141,vol:0.203,start:0.825}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:123.921,fp:133.454,f1:107.24,peakAt:0.25,dur:0.161,vol:0.174,start:1.123}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:116.176,fp:125.113,f1:100.537,peakAt:0.25,dur:0.143,vol:0.214,start:1.401}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:106.887,fp:115.109,f1:92.499,peakAt:0.25,dur:0.13,vol:0.275,start:0.245}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:101.543,fp:109.354,f1:87.874,peakAt:0.25,dur:0.158,vol:0.223,start:0.481}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:96.199,fp:103.599,f1:83.249,peakAt:0.25,dur:0.124,vol:0.273,start:0.674}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'ə',f0:90.854,fp:97.843,f1:78.624,peakAt:0.25,dur:0.155,vol:0.256,start:0.975}),
  C({n:14,f0:110,f1:190,vowels:'aäe',att:0.2,hold:0.35,dur:2.4,vol:0.22,rise:-0.05})]},
 laugh3:{cat:'arena',name:'Gelächter 3 – Kichern und Prusten',use:'Das Publikum lacht über einen Trottel bei der Vorstellung (zufällige Variante).',vol:.8,room:.35,pitchVar:.05,layers:[
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'ə',f0:175.799,fp:189.322,f1:152.133,peakAt:0.25,dur:0.072,vol:0.227,start:0.327}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:167.009,fp:179.856,f1:144.527,peakAt:0.25,dur:0.077,vol:0.186,start:0.471}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:158.219,fp:170.389,f1:136.92,peakAt:0.25,dur:0.084,vol:0.151,start:0.666}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:149.429,fp:160.923,f1:129.313,peakAt:0.25,dur:0.096,vol:0.18,start:0.843}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:140.639,fp:151.457,f1:121.707,peakAt:0.25,dur:0.072,vol:0.158,start:1.023}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:131.849,fp:141.991,f1:114.1,peakAt:0.25,dur:0.071,vol:0.138,start:1.171}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:123.059,fp:132.525,f1:106.493,peakAt:0.25,dur:0.096,vol:0.15,start:1.356}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'i',v1:'ə',f0:222.636,fp:239.761,f1:192.665,peakAt:0.25,dur:0.074,vol:0.237,start:0.267}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'i',v1:'i',f0:211.504,fp:227.773,f1:183.032,peakAt:0.25,dur:0.089,vol:0.189,start:0.4}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'i',v1:'i',f0:200.372,fp:215.785,f1:173.399,peakAt:0.25,dur:0.081,vol:0.182,start:0.53}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'i',v1:'i',f0:189.24,fp:203.797,f1:163.766,peakAt:0.25,dur:0.09,vol:0.187,start:0.698}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'i',v1:'ə',f0:178.108,fp:191.809,f1:154.132,peakAt:0.25,dur:0.09,vol:0.174,start:0.873}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'i',v1:'i',f0:166.977,fp:179.821,f1:144.499,peakAt:0.25,dur:0.097,vol:0.152,start:1.046}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:225.19,fp:242.512,f1:194.876,peakAt:0.25,dur:0.096,vol:0.167,start:0.344}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'ə',f0:213.93,fp:230.386,f1:185.132,peakAt:0.25,dur:0.082,vol:0.173,start:0.503}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'ə',f0:202.671,fp:218.261,f1:175.388,peakAt:0.25,dur:0.096,vol:0.184,start:0.659}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:191.411,fp:206.135,f1:165.644,peakAt:0.25,dur:0.092,vol:0.189,start:0.762}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'ə',f0:198.051,fp:213.286,f1:171.39,peakAt:0.25,dur:0.088,vol:0.176,start:0.599}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'ə',f0:188.148,fp:202.621,f1:162.821,peakAt:0.25,dur:0.088,vol:0.154,start:0.73}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:178.246,fp:191.957,f1:154.251,peakAt:0.25,dur:0.079,vol:0.204,start:0.894}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:168.343,fp:181.293,f1:145.682,peakAt:0.25,dur:0.084,vol:0.173,start:1.022}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ə',v1:'ə',f0:202.531,fp:218.11,f1:175.267,peakAt:0.25,dur:0.092,vol:0.184,start:0.372}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ə',v1:'ə',f0:192.404,fp:207.204,f1:166.503,peakAt:0.25,dur:0.086,vol:0.151,start:0.567}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ə',v1:'ə',f0:182.277,fp:196.299,f1:157.74,peakAt:0.25,dur:0.087,vol:0.184,start:0.716}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ə',v1:'ə',f0:172.151,fp:185.393,f1:148.977,peakAt:0.25,dur:0.072,vol:0.162,start:0.882}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ə',v1:'ə',f0:162.024,fp:174.488,f1:140.213,peakAt:0.25,dur:0.081,vol:0.166,start:1.052}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ə',v1:'ə',f0:151.898,fp:163.582,f1:131.45,peakAt:0.25,dur:0.072,vol:0.166,start:1.168}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:193.965,fp:208.886,f1:167.854,peakAt:0.25,dur:0.079,vol:0.208,start:0.356}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:184.267,fp:198.441,f1:159.462,peakAt:0.25,dur:0.081,vol:0.152,start:0.491}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:174.569,fp:187.997,f1:151.069,peakAt:0.25,dur:0.092,vol:0.156,start:0.649}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'ə',f0:164.87,fp:177.553,f1:142.676,peakAt:0.25,dur:0.077,vol:0.16,start:0.825}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:155.172,fp:167.108,f1:134.284,peakAt:0.25,dur:0.073,vol:0.142,start:0.993}),
  N({color:'white',filter:'bp',f0:1200,f1:900,q:0.8,att:0.005,hold:0.1,dur:0.12,vol:0.14,start:0.3}),
  N({color:'white',filter:'bp',f0:1200,f1:900,q:0.8,att:0.005,hold:0.1,dur:0.12,vol:0.14,start:1.1}),
  N({color:'white',filter:'bp',f0:1200,f1:900,q:0.8,att:0.005,hold:0.1,dur:0.12,vol:0.14,start:1.6}),
  C({n:8,f0:120,f1:170,vowels:'ea',att:0.2,hold:0.3,dur:1.8,vol:0.14,rise:0})]},
 laugh4:{cat:'arena',name:'Gelächter 4 – Hohngelächter',use:'Das Publikum lacht über einen Trottel bei der Vorstellung (zufällige Variante).',vol:.8,room:.35,pitchVar:.05,layers:[
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:116.275,fp:125.219,f1:100.622,peakAt:0.25,dur:0.153,vol:0.37,start:0.062}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ə',f0:112.786,fp:121.462,f1:97.603,peakAt:0.25,dur:0.188,vol:0.305,start:0.461}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ə',f0:109.298,fp:117.706,f1:94.585,peakAt:0.25,dur:0.159,vol:0.251,start:0.764}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:105.81,fp:113.949,f1:91.566,peakAt:0.25,dur:0.191,vol:0.292,start:1.187}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:120.112,fp:129.352,f1:103.943,peakAt:0.25,dur:0.167,vol:0.29,start:0.376}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:116.509,fp:125.471,f1:100.825,peakAt:0.25,dur:0.164,vol:0.337,start:0.735}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ə',f0:112.905,fp:121.591,f1:97.707,peakAt:0.25,dur:0.192,vol:0.26,start:1.248}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:120.212,fp:129.459,f1:104.029,peakAt:0.25,dur:0.164,vol:0.288,start:0.459}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'ə',f0:116.605,fp:125.575,f1:100.908,peakAt:0.25,dur:0.19,vol:0.297,start:0.783}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:112.999,fp:121.691,f1:97.788,peakAt:0.25,dur:0.176,vol:0.303,start:1.253}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'ə',f0:109.393,fp:117.807,f1:94.667,peakAt:0.25,dur:0.184,vol:0.303,start:1.554}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:126.94,fp:136.705,f1:109.852,peakAt:0.25,dur:0.16,vol:0.361,start:0.11}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:123.132,fp:132.603,f1:106.556,peakAt:0.25,dur:0.164,vol:0.342,start:0.547}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ə',f0:119.324,fp:128.502,f1:103.261,peakAt:0.25,dur:0.197,vol:0.232,start:0.86}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:115.515,fp:124.401,f1:99.965,peakAt:0.25,dur:0.154,vol:0.241,start:1.223}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:121.01,fp:130.319,f1:104.72,peakAt:0.25,dur:0.171,vol:0.334,start:0.194}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ə',f0:117.38,fp:126.409,f1:101.579,peakAt:0.25,dur:0.165,vol:0.294,start:0.671}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:113.75,fp:122.5,f1:98.437,peakAt:0.25,dur:0.169,vol:0.264,start:0.999}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ə',f0:106.329,fp:114.509,f1:92.016,peakAt:0.25,dur:0.172,vol:0.37,start:0.102}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:103.14,fp:111.073,f1:89.255,peakAt:0.25,dur:0.153,vol:0.312,start:0.408}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:99.95,fp:107.638,f1:86.495,peakAt:0.25,dur:0.18,vol:0.29,start:0.892}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:96.76,fp:104.203,f1:83.734,peakAt:0.25,dur:0.152,vol:0.242,start:1.242}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'ə',f0:137.884,fp:148.49,f1:119.323,peakAt:0.25,dur:0.175,vol:0.313,start:0.12}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'ə',f0:133.747,fp:144.036,f1:115.743,peakAt:0.25,dur:0.171,vol:0.266,start:0.523}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:129.611,fp:139.581,f1:112.163,peakAt:0.25,dur:0.163,vol:0.31,start:0.803}),
  C({n:16,f0:115,f1:150,vowels:'aä',att:0.3,hold:0.4,dur:2.6,vol:0.24,rise:-0.1})]},
 laugh5:{cat:'arena',name:'Gelächter 5 – Lachwelle',use:'Das Publikum lacht über einen Trottel bei der Vorstellung (zufällige Variante).',vol:.8,room:.35,pitchVar:.05,layers:[
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'ə',f0:166.821,fp:179.653,f1:144.364,peakAt:0.25,dur:0.132,vol:0.199,start:0.185}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:158.48,fp:170.671,f1:137.146,peakAt:0.25,dur:0.163,vol:0.181,start:0.417}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:150.139,fp:161.688,f1:129.928,peakAt:0.25,dur:0.157,vol:0.178,start:0.631}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:141.798,fp:152.705,f1:122.71,peakAt:0.25,dur:0.139,vol:0.155,start:0.928}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'ə',f0:147.376,fp:158.713,f1:127.537,peakAt:0.25,dur:0.168,vol:0.2,start:0.153}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:140.007,fp:150.777,f1:121.16,peakAt:0.25,dur:0.13,vol:0.24,start:0.376}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'ə',f0:132.638,fp:142.841,f1:114.783,peakAt:0.25,dur:0.168,vol:0.26,start:0.582}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:101.155,fp:108.937,f1:87.538,peakAt:0.25,dur:0.135,vol:0.18,start:0.344}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:96.098,fp:103.49,f1:83.161,peakAt:0.25,dur:0.137,vol:0.262,start:0.552}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:91.04,fp:98.043,f1:78.785,peakAt:0.25,dur:0.136,vol:0.233,start:0.74}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'ə',f0:85.982,fp:92.596,f1:74.408,peakAt:0.25,dur:0.169,vol:0.221,start:0.884}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'ə',f0:100.773,fp:108.525,f1:87.207,peakAt:0.25,dur:0.12,vol:0.202,start:0.557}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:95.734,fp:103.099,f1:82.847,peakAt:0.25,dur:0.13,vol:0.274,start:0.846}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:90.696,fp:97.672,f1:78.487,peakAt:0.25,dur:0.137,vol:0.214,start:1.132}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'e',v1:'e',f0:85.657,fp:92.246,f1:74.126,peakAt:0.25,dur:0.125,vol:0.226,start:1.399}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:102.8,fp:110.708,f1:88.962,peakAt:0.25,dur:0.151,vol:0.221,start:0.716}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:97.66,fp:105.172,f1:84.514,peakAt:0.25,dur:0.147,vol:0.205,start:0.977}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'ə',f0:92.52,fp:99.637,f1:80.066,peakAt:0.25,dur:0.124,vol:0.231,start:1.153}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:116.439,fp:125.396,f1:100.765,peakAt:0.25,dur:0.15,vol:0.235,start:0.612}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:110.617,fp:119.126,f1:95.726,peakAt:0.25,dur:0.123,vol:0.173,start:0.808}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ə',f0:104.795,fp:112.856,f1:90.688,peakAt:0.25,dur:0.162,vol:0.236,start:1.011}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:167.64,fp:180.535,f1:145.073,peakAt:0.25,dur:0.127,vol:0.215,start:0.917}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:159.258,fp:171.508,f1:137.819,peakAt:0.25,dur:0.17,vol:0.279,start:1.132}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:150.876,fp:162.481,f1:130.565,peakAt:0.25,dur:0.144,vol:0.209,start:1.346}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:142.894,fp:153.886,f1:123.658,peakAt:0.25,dur:0.151,vol:0.221,start:0.877}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:135.749,fp:146.191,f1:117.475,peakAt:0.25,dur:0.134,vol:0.267,start:1.082}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:128.604,fp:138.497,f1:111.292,peakAt:0.25,dur:0.159,vol:0.232,start:1.325}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:121.46,fp:130.803,f1:105.109,peakAt:0.25,dur:0.158,vol:0.217,start:1.612}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:114.315,fp:123.109,f1:98.926,peakAt:0.25,dur:0.144,vol:0.2,start:1.844}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:202.054,fp:217.596,f1:174.854,peakAt:0.25,dur:0.133,vol:0.236,start:1.122}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:191.951,fp:206.717,f1:166.112,peakAt:0.25,dur:0.152,vol:0.208,start:1.391}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:181.848,fp:195.837,f1:157.369,peakAt:0.25,dur:0.157,vol:0.195,start:1.638}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:171.746,fp:184.957,f1:148.626,peakAt:0.25,dur:0.163,vol:0.244,start:1.909}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:155.381,fp:167.333,f1:134.464,peakAt:0.25,dur:0.167,vol:0.263,start:1.212}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'ə',f0:147.612,fp:158.967,f1:127.741,peakAt:0.25,dur:0.157,vol:0.257,start:1.495}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'o',v1:'o',f0:139.843,fp:150.6,f1:121.018,peakAt:0.25,dur:0.153,vol:0.224,start:1.759}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'a',f0:168.346,fp:181.296,f1:145.684,peakAt:0.25,dur:0.142,vol:0.206,start:1.38}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'ə',f0:159.929,fp:172.231,f1:138.4,peakAt:0.25,dur:0.152,vol:0.222,start:1.597}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'a',v1:'ə',f0:151.511,fp:163.166,f1:131.116,peakAt:0.25,dur:0.123,vol:0.192,start:1.766}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:119.915,fp:129.139,f1:103.773,peakAt:0.25,dur:0.151,vol:0.209,start:1.329}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:113.919,fp:122.682,f1:98.584,peakAt:0.25,dur:0.12,vol:0.201,start:1.591}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ä',f0:107.923,fp:116.225,f1:93.395,peakAt:0.25,dur:0.126,vol:0.198,start:1.797}),
  V({att:0.012,hold:0.25,rough:0.3,breath:0.55,drive:1.6,vib:0,jitter:0.04,v0:'ä',v1:'ə',f0:101.928,fp:109.768,f1:88.207,peakAt:0.25,dur:0.151,vol:0.201,start:1.959}),
  C({n:18,f0:105,f1:180,vowels:'aoe',att:0.6,hold:0.3,dur:3,vol:0.26,rise:0.2})]},
 gong:{cat:'arena',name:'Gong',use:'Kampfbeginn, Tor öffnet sich.',vol:1,room:.25,pitchVar:.02,layers:[
  Mt({f:70,partials:'gong',decay:2.8,dur:4,vol:.7,bright:.8,click:.3}),T({f0:70,f1:66,dur:2,vol:.3})]},
 win:{cat:'arena',name:'Sieg (Kampfhorn)',use:'Kampf gewonnen: römisches Kampfhorn ruft zum Triumph, dann jubelt die Menge.',vol:.9,room:.45,pitchVar:0,layers:[
  ...warhorn([[50,.2],[55,.2],[50,.2],[55,.26],[59,.34],[62,1.9]],.3),
  ...warhorn([[59,1.9]],.16,{start:1.4}),
  ...warhorn([[43,3.2]],.12,{lp:700}),
  C({n:14,f0:120,f1:260,vowels:'aeo',att:.5,hold:.45,dur:2.2,vol:.55,rise:.2,start:1.5})]},
 mercy:{cat:'arena',name:'Gnade (Kampfhorn)',use:'Unterlegener darf leben: zwei lange, ruhige Hornrufe, die Menge atmet auf.',vol:.85,room:.5,pitchVar:0,layers:[
  ...warhorn([[55,1.25],[50,2]],.26,{lp:1000,gap:.9}),
  ...warhorn([[43,3.1]],.1,{lp:600}),
  C({n:10,f0:105,f1:200,vowels:'ao',att:.6,hold:.3,dur:2,vol:.45,rise:-.15,start:.9})]},
 verdictDeath:{cat:'arena',name:'Todesurteil',use:'Daumen runter: Hinrichtung.',vol:.9,room:.25,pitchVar:0,layers:[
  T({f0:58,f1:40,dur:.5,vol:.8,drive:2}),T({f0:58,f1:40,dur:.5,vol:.8,drive:2,start:.45}),T({f0:52,f1:32,dur:.9,vol:.9,drive:2,start:.9}),C({n:24,f0:100,f1:210,vowels:'ao',att:.6,hold:.4,dur:2,vol:.6,rise:.3,start:.3})]},
 coin:{cat:'arena',name:'Münzen',use:'Preisgeld, Gold.',vol:.8,room:.08,pitchVar:.06,layers:[
  Mt({f:2600,partials:'muenze',decay:.22,dur:.4,vol:.4,click:.6}),Mt({f:3100,partials:'muenze',decay:.2,dur:.35,vol:.3,click:.5,start:.07}),Mt({f:2350,partials:'muenze',decay:.2,dur:.35,vol:.25,click:.4,start:.15})]},
 // ----- Faustkampf
 boxJab:{cat:'box',name:'Gerade (Kopf)',use:'Schnelle Gerade ins Gesicht: Lederklatschen.',vol:1,room:.12,pitchVar:.1,layers:[
  N({f0:1800,f1:900,q:1,dur:.05,vol:.6,att:.0008}),T({f0:120,f1:60,dur:.1,vol:.6,drive:1.5}),N({filter:'hp',f0:3000,dur:.02,vol:.35})]},
 boxHook:{cat:'box',name:'Haken (Kopf)',use:'Schwinger oder Haken: dumpf und schwer.',vol:1,room:.12,pitchVar:.1,layers:[
  T({f0:95,f1:40,dur:.2,vol:.85,drive:2.5}),N({filter:'lp',f0:1500,dur:.1,vol:.55,att:.0008}),N({f0:900,f1:350,q:1,dur:.12,vol:.35})]},
 boxUpper:{cat:'box',name:'Aufwärtshaken',use:'Uppercut: Kiefer knackt.',vol:1,room:.12,pitchVar:.1,layers:[
  N({filter:'hp',f0:2500,dur:.03,vol:.5,att:.0005}),T({f0:150,f1:55,dur:.18,vol:.75,drive:2.2}),K({n:2,gap:.01,f:3500,q:3,dur:.01,vol:.3,start:.005})]},
 boxBody:{cat:'box',name:'Körpertreffer',use:'Schlag in Magen oder Rippen, mit „Uff“.',vol:1,room:.1,pitchVar:.1,layers:[
  T({f0:65,f1:35,dur:.25,vol:.9,drive:2}),N({filter:'lp',f0:600,dur:.15,vol:.5}),V({v0:'u',v1:'ə',f0:120,fp:110,f1:90,peakAt:.2,att:.01,hold:.05,dur:.2,vol:.35,rough:.4,breath:.9,drive:1.5,start:.03})]},
 boxBlock:{cat:'box',name:'Block (Fäuste)',use:'Schlag landet auf den Unterarmen.',vol:.9,room:.08,pitchVar:.1,layers:[
  N({filter:'lp',f0:1200,dur:.06,vol:.5}),T({f0:150,f1:90,dur:.06,vol:.4})]},
 boxWhiff:{cat:'box',name:'Luftschlag',use:'Schlag geht ins Leere.',vol:.8,room:.05,pitchVar:.12,layers:[
  N({color:'pink',f0:900,f1:2400,curve:.6,q:1.5,att:.04,dur:.15,vol:.8})]},
 boxDown:{cat:'box',name:'Niederschlag',use:'Boxer geht zu Boden.',vol:1,room:.2,pitchVar:.05,layers:[
  T({f0:70,f1:30,dur:.35,vol:1,drive:3}),N({color:'brown',filter:'lp',f0:400,dur:.25,vol:.6}),C({n:22,f0:110,f1:230,vowels:'ao',att:.1,hold:.3,dur:1.6,vol:.55,rise:.25,start:.08})]},
 boxBell:{cat:'box',name:'Ringglocke',use:'Rundenbeginn und Rundenende.',vol:.9,room:.15,pitchVar:0,layers:[
  Mt({f:880,partials:'glocke',decay:1.2,dur:1.6,vol:.55,bright:.7,click:.5})]}
};
const ORDER=Object.keys(DEF);
// ---------- Speichern (nur Änderungen) ----------
let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{saved={};}
const copy=o=>JSON.parse(JSON.stringify(o));
function get(k){return saved[k]||DEF[k];}
function set(k,p){saved[k]=copy(p);try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{}}
function reset(k){if(k)delete saved[k];else saved={};try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{}}
// ---------- Abspielen (für Spiel und Editor): je Geräusch drei Varianten im Zwischenspeicher ----------
const cache=new Map();
function buffer(ctx,k,opt={}){const p=get(k);if(!p)return null;const pitch=Math.round((opt.pitch||1)*10)/10,id=k+'|'+pitch+'|'+(saved[k]?JSON.stringify(saved[k]).length:0);let list=cache.get(id);if(!list){list=[];cache.set(id,list);}
 if(list.length<(opt.max||3)){const data=render(p,{pitch});const b=ctx.createBuffer(1,data.length,SR);b.copyToChannel?b.copyToChannel(data,0):b.getChannelData(0).set(data);list.push(b);return b;}return list[Math.floor(Math.random()*list.length)];}
function play(ctx,dest,k,opt={}){const b=buffer(ctx,k,opt);if(!b)return null;const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=b;g.gain.value=opt.vol??1;s.connect(g);g.connect(dest);s.start(Math.max(ctx.currentTime,opt.at||0));s.onended=()=>{s.disconnect();g.disconnect();};return s;}
window.KampfSound={SR,KEY,CATS,DEF,ORDER,VOW,PART,render,get,set,reset,changed:k=>!!saved[k],saved:()=>copy(saved),load(o){saved=copy(o||{});try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{}cache.clear();},clear:()=>cache.clear(),buffer,play,make:{T,N,V,Mt,C,K}};
})();
