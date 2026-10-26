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
 cry:{cat:'stimme',name:'Kampfschrei',use:'Ansturm, Angriffsbefehl, Schlachtbeginn („Raaah!“).',vol:1,room:.15,pitchVar:.06,layers:[
  V({v0:'a',v1:'a',f0:120,fp:175,f1:150,peakAt:.35,att:.05,hold:.45,dur:.85,vol:.8,rough:.45,breath:.25,drive:3,vib:.4}),N({color:'pink',f0:1200,q:.8,att:.05,hold:.4,dur:.8,vol:.06})]},
// Gebrüll bei der Vorstellung (und beim Ansturm): 20 Varianten, zufällig gewählt. Je Silbe eine raue, verzerrte Stimme,
// dazu ein Knurren eine Oktave tiefer (Brustkorb) und rauer Atem.
 bruell01:{cat:'stimme',name:'Gebrüll 1 – „Raaaah!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:1,room:.22,pitchVar:.05,layers:[
  V({v0:'a',v1:'a',f0:115,fp:185,f1:140,peakAt:0.3,att:.035,hold:.5,dur:1.5,vol:.85,start:0,rough:0.62,breath:.32,drive:4,vib:.45,jitter:.03,size:1}),
  V({v0:'a',v1:'a',f0:57.5,fp:92.5,f1:70,peakAt:0.3,att:.06,hold:.5,dur:1.5,vol:.3,start:0.02,rough:.95,breath:.15,drive:5,vib:.2,jitter:.05,size:1.25}),
  N({color:'pink',filter:'bp',f0:1500,f1:1100,q:.8,att:.05,hold:.5,dur:1.5,vol:.07})]},
 bruell02:{cat:'stimme',name:'Gebrüll 2 – „Uraaa!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:1,room:.22,pitchVar:.05,layers:[
  V({v0:'u',v1:'u',f0:110,fp:130,f1:140,peakAt:0.5,att:.035,hold:.5,dur:0.28,vol:.85,start:0,rough:0.7,breath:.32,drive:3.6,vib:.45,jitter:.03,size:1}),
  V({v0:'a',v1:'a',f0:150,fp:200,f1:150,peakAt:0.25,att:.035,hold:.5,dur:1.25,vol:.85,start:0.22,rough:0.7,breath:.32,drive:3.6,vib:.45,jitter:.03,size:1}),
  V({v0:'a',v1:'a',f0:75,fp:100,f1:75,peakAt:0.25,att:.06,hold:.5,dur:1.25,vol:.3,start:0.24,rough:.95,breath:.15,drive:5,vib:.2,jitter:.05,size:1.25}),
  N({color:'pink',filter:'bp',f0:1500,f1:1100,q:.8,att:.05,hold:.5,dur:1.47,vol:.07})]},
 bruell03:{cat:'stimme',name:'Gebrüll 3 – „Hooo-aaah!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:1,room:.22,pitchVar:.05,layers:[
  V({v0:'o',v1:'o',f0:120,fp:150,f1:130,peakAt:0.5,att:.035,hold:.5,dur:0.45,vol:.85,start:0,rough:0.66,breath:.32,drive:3.8,vib:.45,jitter:.03,size:1}),
  V({v0:'a',v1:'a',f0:135,fp:190,f1:145,peakAt:0.3,att:.035,hold:.5,dur:1.1,vol:.85,start:0.4,rough:0.66,breath:.32,drive:3.8,vib:.45,jitter:.03,size:1}),
  V({v0:'a',v1:'a',f0:67.5,fp:95,f1:72.5,peakAt:0.3,att:.06,hold:.5,dur:1.1,vol:.3,start:0.42,rough:.95,breath:.15,drive:5,vib:.2,jitter:.05,size:1.25}),
  N({color:'pink',filter:'bp',f0:1500,f1:1100,q:.8,att:.05,hold:.5,dur:1.5,vol:.07})]},
 bruell04:{cat:'stimme',name:'Gebrüll 4 – „Aaargh!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:1,room:.22,pitchVar:.05,layers:[
  V({v0:'a',v1:'ə',f0:125,fp:170,f1:105,peakAt:0.25,att:.035,hold:.5,dur:1.4,vol:.85,start:0,rough:0.9,breath:.32,drive:5,vib:.45,jitter:.03,size:1}),
  V({v0:'a',v1:'ə',f0:62.5,fp:85,f1:52.5,peakAt:0.25,att:.06,hold:.5,dur:1.4,vol:.3,start:0.02,rough:.95,breath:.15,drive:5,vib:.2,jitter:.05,size:1.25}),
  N({color:'pink',filter:'bp',f0:1500,f1:1100,q:.8,att:.05,hold:.5,dur:1.4,vol:.07})]},
 bruell05:{cat:'stimme',name:'Gebrüll 5 – „Roooaar!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:1,room:.22,pitchVar:.05,layers:[
  V({v0:'o',v1:'a',f0:105,fp:165,f1:130,peakAt:0.45,att:.035,hold:.5,dur:1.6,vol:.85,start:0,rough:0.72,breath:.32,drive:4.2,vib:.45,jitter:.03,size:1}),
  V({v0:'o',v1:'a',f0:52.5,fp:82.5,f1:65,peakAt:0.45,att:.06,hold:.5,dur:1.6,vol:.3,start:0.02,rough:.95,breath:.15,drive:5,vib:.2,jitter:.05,size:1.25}),
  N({color:'pink',filter:'bp',f0:1500,f1:1100,q:.8,att:.05,hold:.5,dur:1.6,vol:.07})]},
 bruell06:{cat:'stimme',name:'Gebrüll 6 – „Ha! Ha! Haaa!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:1,room:.22,pitchVar:.05,layers:[
  V({v0:'a',v1:'a',f0:150,fp:175,f1:150,peakAt:0.3,att:.035,hold:.5,dur:0.22,vol:.85,start:0,rough:0.6,breath:.32,drive:3.4,vib:.45,jitter:.03,size:1}),
  V({v0:'a',v1:'a',f0:155,fp:180,f1:150,peakAt:0.3,att:.035,hold:.5,dur:0.22,vol:.85,start:0.3,rough:0.6,breath:.32,drive:3.4,vib:.45,jitter:.03,size:1}),
  V({v0:'a',v1:'a',f0:160,fp:210,f1:155,peakAt:0.3,att:.035,hold:.5,dur:1,vol:.85,start:0.6,rough:0.6,breath:.32,drive:3.4,vib:.45,jitter:.03,size:1}),
  V({v0:'a',v1:'a',f0:80,fp:105,f1:77.5,peakAt:0.3,att:.06,hold:.5,dur:1,vol:.3,start:0.62,rough:.95,breath:.15,drive:5,vib:.2,jitter:.05,size:1.25}),
  N({color:'pink',filter:'bp',f0:1500,f1:1100,q:.8,att:.05,hold:.5,dur:1.6,vol:.07})]},
 bruell07:{cat:'stimme',name:'Gebrüll 7 – „Jaaaah!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:1,room:.22,pitchVar:.05,layers:[
  V({v0:'i',v1:'a',f0:140,fp:200,f1:160,peakAt:0.3,att:.035,hold:.5,dur:1.3,vol:.85,start:0,rough:0.64,breath:.32,drive:3.8,vib:.45,jitter:.03,size:1}),
  V({v0:'i',v1:'a',f0:70,fp:100,f1:80,peakAt:0.3,att:.06,hold:.5,dur:1.3,vol:.3,start:0.02,rough:.95,breath:.15,drive:5,vib:.2,jitter:.05,size:1.25}),
  N({color:'pink',filter:'bp',f0:1500,f1:1100,q:.8,att:.05,hold:.5,dur:1.3,vol:.07})]},
 bruell08:{cat:'stimme',name:'Gebrüll 8 – „Woooah!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:1,room:.22,pitchVar:.05,layers:[
  V({v0:'u',v1:'a',f0:110,fp:170,f1:150,peakAt:0.55,att:.035,hold:.5,dur:1.5,vol:.85,start:0,rough:0.7,breath:.32,drive:4,vib:.45,jitter:.03,size:1}),
  V({v0:'u',v1:'a',f0:55,fp:85,f1:75,peakAt:0.55,att:.06,hold:.5,dur:1.5,vol:.3,start:0.02,rough:.95,breath:.15,drive:5,vib:.2,jitter:.05,size:1.25}),
  N({color:'pink',filter:'bp',f0:1500,f1:1100,q:.8,att:.05,hold:.5,dur:1.5,vol:.07})]},
 bruell09:{cat:'stimme',name:'Gebrüll 9 – „Graaah!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:1,room:.22,pitchVar:.05,layers:[
  V({v0:'ə',v1:'a',f0:95,fp:150,f1:115,peakAt:0.35,att:.035,hold:.5,dur:1.5,vol:.85,start:0,rough:0.8,breath:.32,drive:4.6,vib:.45,jitter:.03,size:1.15}),
  V({v0:'ə',v1:'a',f0:47.5,fp:75,f1:57.5,peakAt:0.35,att:.06,hold:.5,dur:1.5,vol:.3,start:0.02,rough:.95,breath:.15,drive:5,vib:.2,jitter:.05,size:1.44}),
  N({color:'pink',filter:'bp',f0:1500,f1:1100,q:.8,att:.05,hold:.5,dur:1.5,vol:.07})]},
 bruell10:{cat:'stimme',name:'Gebrüll 10 – „Aaa-haaa!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:1,room:.22,pitchVar:.05,layers:[
  V({v0:'a',v1:'a',f0:140,fp:180,f1:150,peakAt:0.4,att:.035,hold:.5,dur:0.6,vol:.85,start:0,rough:0.66,breath:.32,drive:3.8,vib:.45,jitter:.03,size:1}),
  V({v0:'a',v1:'a',f0:150,fp:215,f1:160,peakAt:0.3,att:.035,hold:.5,dur:1,vol:.85,start:0.55,rough:0.66,breath:.32,drive:3.8,vib:.45,jitter:.03,size:1}),
  V({v0:'a',v1:'a',f0:75,fp:107.5,f1:80,peakAt:0.3,att:.06,hold:.5,dur:1,vol:.3,start:0.57,rough:.95,breath:.15,drive:5,vib:.2,jitter:.05,size:1.25}),
  N({color:'pink',filter:'bp',f0:1500,f1:1100,q:.8,att:.05,hold:.5,dur:1.55,vol:.07})]},
 bruell11:{cat:'stimme',name:'Gebrüll 11 – „Ooorrr!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:1,room:.22,pitchVar:.05,layers:[
  V({v0:'o',v1:'u',f0:90,fp:120,f1:95,peakAt:0.4,att:.035,hold:.5,dur:1.5,vol:.85,start:0,rough:0.95,breath:.32,drive:5,vib:.45,jitter:.03,size:1}),
  V({v0:'o',v1:'u',f0:45,fp:60,f1:47.5,peakAt:0.4,att:.06,hold:.5,dur:1.5,vol:.3,start:0.02,rough:.95,breath:.15,drive:5,vib:.2,jitter:.05,size:1.25}),
  N({color:'pink',filter:'bp',f0:1500,f1:1100,q:.8,att:.05,hold:.5,dur:1.5,vol:.07})]},
 bruell12:{cat:'stimme',name:'Gebrüll 12 – „Heeyaaah!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:1,room:.22,pitchVar:.05,layers:[
  V({v0:'e',v1:'e',f0:150,fp:180,f1:170,peakAt:0.5,att:.035,hold:.5,dur:0.35,vol:.85,start:0,rough:0.6,breath:.32,drive:3.6,vib:.45,jitter:.03,size:1}),
  V({v0:'a',v1:'a',f0:170,fp:220,f1:165,peakAt:0.3,att:.035,hold:.5,dur:1.1,vol:.85,start:0.3,rough:0.6,breath:.32,drive:3.6,vib:.45,jitter:.03,size:1}),
  V({v0:'a',v1:'a',f0:85,fp:110,f1:82.5,peakAt:0.3,att:.06,hold:.5,dur:1.1,vol:.3,start:0.32,rough:.95,breath:.15,drive:5,vib:.2,jitter:.05,size:1.25}),
  N({color:'pink',filter:'bp',f0:1500,f1:1100,q:.8,att:.05,hold:.5,dur:1.4,vol:.07})]},
 bruell13:{cat:'stimme',name:'Gebrüll 13 – „Arrrrgh!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:1,room:.22,pitchVar:.05,layers:[
  V({v0:'a',v1:'a',f0:110,fp:130,f1:190,peakAt:0.85,att:.035,hold:.5,dur:1.4,vol:.85,start:0,rough:0.78,breath:.32,drive:4.8,vib:.45,jitter:.03,size:1}),
  V({v0:'a',v1:'a',f0:55,fp:65,f1:95,peakAt:0.85,att:.06,hold:.5,dur:1.4,vol:.3,start:0.02,rough:.95,breath:.15,drive:5,vib:.2,jitter:.05,size:1.25}),
  N({color:'pink',filter:'bp',f0:1500,f1:1100,q:.8,att:.05,hold:.5,dur:1.4,vol:.07})]},
 bruell14:{cat:'stimme',name:'Gebrüll 14 – „Raah! Raah!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:1,room:.22,pitchVar:.05,layers:[
  V({v0:'a',v1:'a',f0:140,fp:185,f1:150,peakAt:0.3,att:.035,hold:.5,dur:0.6,vol:.85,start:0,rough:0.7,breath:.32,drive:4.2,vib:.45,jitter:.03,size:1}),
  V({v0:'a',v1:'a',f0:140,fp:190,f1:145,peakAt:0.3,att:.035,hold:.5,dur:0.8,vol:.85,start:0.7,rough:0.7,breath:.32,drive:4.2,vib:.45,jitter:.03,size:1}),
  V({v0:'a',v1:'a',f0:70,fp:95,f1:72.5,peakAt:0.3,att:.06,hold:.5,dur:0.8,vol:.3,start:0.72,rough:.95,breath:.15,drive:5,vib:.2,jitter:.05,size:1.25}),
  N({color:'pink',filter:'bp',f0:1500,f1:1100,q:.8,att:.05,hold:.5,dur:1.5,vol:.07})]},
 bruell15:{cat:'stimme',name:'Gebrüll 15 – „Uuuh-RAAH!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:1,room:.22,pitchVar:.05,layers:[
  V({v0:'u',v1:'u',f0:100,fp:110,f1:105,peakAt:0.5,att:.035,hold:.5,dur:0.5,vol:.85,start:0,rough:0.68,breath:.32,drive:4,vib:.45,jitter:.03,size:1}),
  V({v0:'a',v1:'a',f0:150,fp:220,f1:160,peakAt:0.25,att:.035,hold:.5,dur:1,vol:.85,start:0.45,rough:0.68,breath:.32,drive:4,vib:.45,jitter:.03,size:1}),
  V({v0:'a',v1:'a',f0:75,fp:110,f1:80,peakAt:0.25,att:.06,hold:.5,dur:1,vol:.3,start:0.47,rough:.95,breath:.15,drive:5,vib:.2,jitter:.05,size:1.25}),
  N({color:'pink',filter:'bp',f0:1500,f1:1100,q:.8,att:.05,hold:.5,dur:1.45,vol:.07})]},
 bruell16:{cat:'stimme',name:'Gebrüll 16 – „Äääärgh!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:1,room:.22,pitchVar:.05,layers:[
  V({v0:'ä',v1:'ə',f0:130,fp:190,f1:120,peakAt:0.3,att:.035,hold:.5,dur:1.4,vol:.85,start:0,rough:0.82,breath:.32,drive:4.6,vib:.45,jitter:.03,size:1}),
  V({v0:'ä',v1:'ə',f0:65,fp:95,f1:60,peakAt:0.3,att:.06,hold:.5,dur:1.4,vol:.3,start:0.02,rough:.95,breath:.15,drive:5,vib:.2,jitter:.05,size:1.25}),
  N({color:'pink',filter:'bp',f0:1500,f1:1100,q:.8,att:.05,hold:.5,dur:1.4,vol:.07})]},
 bruell17:{cat:'stimme',name:'Gebrüll 17 – „Hoooo!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:1,room:.22,pitchVar:.05,layers:[
  V({v0:'o',v1:'o',f0:125,fp:180,f1:150,peakAt:0.4,att:.035,hold:.5,dur:1.5,vol:.85,start:0,rough:0.66,breath:.32,drive:3.8,vib:.45,jitter:.03,size:1}),
  V({v0:'o',v1:'o',f0:62.5,fp:90,f1:75,peakAt:0.4,att:.06,hold:.5,dur:1.5,vol:.3,start:0.02,rough:.95,breath:.15,drive:5,vib:.2,jitter:.05,size:1.25}),
  N({color:'pink',filter:'bp',f0:1500,f1:1100,q:.8,att:.05,hold:.5,dur:1.5,vol:.07})]},
 bruell18:{cat:'stimme',name:'Gebrüll 18 – „Aaaaaah!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:1,room:.22,pitchVar:.05,layers:[
  V({v0:'a',v1:'a',f0:190,fp:200,f1:120,peakAt:0.15,att:.035,hold:.5,dur:1.6,vol:.85,start:0,rough:0.72,breath:.32,drive:4.4,vib:.45,jitter:.03,size:1}),
  V({v0:'a',v1:'a',f0:95,fp:100,f1:60,peakAt:0.15,att:.06,hold:.5,dur:1.6,vol:.3,start:0.02,rough:.95,breath:.15,drive:5,vib:.2,jitter:.05,size:1.25}),
  N({color:'pink',filter:'bp',f0:1500,f1:1100,q:.8,att:.05,hold:.5,dur:1.6,vol:.07})]},
 bruell19:{cat:'stimme',name:'Gebrüll 19 – „Gaaah!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:1,room:.22,pitchVar:.05,layers:[
  V({v0:'a',v1:'a',f0:150,fp:240,f1:170,peakAt:0.25,att:.035,hold:.5,dur:1.2,vol:.85,start:0,rough:0.75,breath:.32,drive:6,vib:.45,jitter:.03,size:1}),
  V({v0:'a',v1:'a',f0:75,fp:120,f1:85,peakAt:0.25,att:.06,hold:.5,dur:1.2,vol:.3,start:0.02,rough:.95,breath:.15,drive:5,vib:.2,jitter:.05,size:1.25}),
  N({color:'pink',filter:'bp',f0:1500,f1:1100,q:.8,att:.05,hold:.5,dur:1.2,vol:.07})]},
 bruell20:{cat:'stimme',name:'Gebrüll 20 – „Wraaaooh!“',use:'Vorstellung vor dem Kampf und Ansturm (zufällig eine von 20 Varianten).',vol:1,room:.22,pitchVar:.05,layers:[
  V({v0:'u',v1:'a',f0:105,fp:175,f1:140,peakAt:0.4,att:.035,hold:.5,dur:0.9,vol:.85,start:0,rough:0.7,breath:.32,drive:4,vib:.45,jitter:.03,size:1}),
  V({v0:'a',v1:'o',f0:150,fp:170,f1:120,peakAt:0.3,att:.035,hold:.5,dur:0.8,vol:.85,start:0.8,rough:0.7,breath:.32,drive:4,vib:.45,jitter:.03,size:1}),
  V({v0:'u',v1:'a',f0:52.5,fp:87.5,f1:70,peakAt:0.4,att:.06,hold:.5,dur:0.9,vol:.3,start:0.02,rough:.95,breath:.15,drive:5,vib:.2,jitter:.05,size:1.25}),
  N({color:'pink',filter:'bp',f0:1500,f1:1100,q:.8,att:.05,hold:.5,dur:1.6,vol:.07})]},
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
 crowd:{cat:'arena',name:'Jubel',use:'Publikum jubelt (Held, Bestie, Sieg).',vol:.9,room:.3,pitchVar:.04,layers:[
  C({n:30,f0:120,f1:260,vowels:'aaeo',att:.35,hold:.45,dur:2.6,vol:.7,spread:.5,rise:.2}),K({n:30,gap:.06,jitter:.9,f:1800,q:1.2,dur:.03,vol:.18,start:.2}),N({color:'pink',f0:900,q:.6,att:.5,hold:.3,dur:2.6,vol:.12})]},
 roar:{cat:'arena',name:'Raunen („Ohhh“)',use:'Publikum bei hartem Treffer, Sturz, Blut.',vol:.9,room:.3,pitchVar:.05,layers:[
  C({n:26,f0:100,f1:200,vowels:'oou',att:.15,hold:.3,dur:1.6,vol:.7,spread:.25,rise:-.1})]},
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
 if(list.length<3){const data=render(p,{pitch});const b=ctx.createBuffer(1,data.length,SR);b.copyToChannel?b.copyToChannel(data,0):b.getChannelData(0).set(data);list.push(b);return b;}return list[Math.floor(Math.random()*list.length)];}
function play(ctx,dest,k,opt={}){const b=buffer(ctx,k,opt);if(!b)return null;const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=b;g.gain.value=opt.vol??1;s.connect(g);g.connect(dest);s.start(Math.max(ctx.currentTime,opt.at||0));s.onended=()=>{s.disconnect();g.disconnect();};return s;}
window.KampfSound={SR,KEY,CATS,DEF,ORDER,VOW,PART,render,get,set,reset,changed:k=>!!saved[k],saved:()=>copy(saved),load(o){saved=copy(o||{});try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{}cache.clear();},clear:()=>cache.clear(),buffer,play,make:{T,N,V,Mt,C,K}};
})();
