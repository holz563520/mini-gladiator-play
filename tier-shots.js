'use strict';
// WAS DIE DATEI TUT: NAHAUFNAHMEN „TIER VERLETZT MENSCH“ (window.TIER_SHOTS; Bären B5a, Wunsch Thomas 28.11.2026): Kopf zwischen den Kiefern zerdrückt
// und Gliedmaße abreißen, gebaut wie der Kehlbiss der Hunde (hund-shots.js).
// =====================================================================================================
// · Das Opfer ist das echte Bild des Spiels: Gesicht, Helm, Brustpanzer und Schultern aus M.faceShot (face-shots.js), Arm oder Bein mit Schiene aus
//   M.injuryShots (injury-shots.js), jeweils vom echten Gladiator (g.appearance, getragene Ausrüstung). Darüber liegt eine eigene Ebene (160 × 104)
//   mit dem echten Tier aus seinem Zeichner, Rissen, Blut und Splittern.
// · Das Tier ist austauschbar, damit Katzen, Löwen und Hunde dieselben Bilder benutzen können: TIER_SHOTS.play({beast:…}) bekommt ein Objekt mit
//   name, keys (Farben der Mundhöhle, die durchsichtig werden, damit der Kopf des Opfers im Maul zu sehen ist) und draw(c,P,o): zeichnet das Tier so,
//   dass das Maul am Punkt P liegt (o.k Vergrößerung, o.he Kopfneigung, o.mouth Maul auf 0–1, o.blood, o.t). TIER_SHOTS.bear(actor) liefert das für Bären.
//   Größenverhältnis: o.k ist so gewählt, dass Bildpunkte je Zentimeter bei Mensch und Tier gleich sind (Bär: BAER.CM).
// · TIER_SHOTS.play({kind:'crush'|'tear',limb,victim,beast,onEnd}) stellt eine Nahaufnahme in die Warteschlange, step(dt) führt sie weiter,
//   paint(canvas) zeichnet sie, skip() bricht ab. Solange TIER_SHOTS.active gilt, hält der Kampfkern an (baer-kampf.js fragt das ab).
// · Gleichzeitigkeit: Der Aufrufer startet die Nahaufnahme in dem Bild, in dem es in der Arena geschieht; gezeigt werden derselbe Gladiator mit
//   derselben Ausrüstung, dasselbe Glied auf derselben Seite und dasselbe Tier mit seinem Fell.
// Braucht face-shots.js und injury-shots.js (TIER_SHOTS.ready). Nur Darstellung, ändert keinen Kampfwert. Texte Englisch (Spielinhalt).
// =====================================================================================================
(()=>{
const M=window.MG;if(!M)return;
const FW=160,FH=104,IMP=.6,HIT=.55;
const T={q:[],cur:null,active:false,ms:0};window.TIER_SHOTS=T;
const cl=(v,a=0,b=1)=>v<a?a:v>b?b:v,ease=v=>{v=cl(v);return v*v*(3-2*v);},rnd=(a,b)=>a+Math.random()*(b-a),hsh=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
T.ready=()=>!!(M.faceShot&&M.injuryShots);

// ---------------------------------------------------------------- Das Tier: Bär
T.bear=function(a){const B=window.BAER,A=B.actor(a.bear,'stand');A.SH=a.fig?.SH||B.shapeOf(a.bear);const sz=A.P.sz,hs=A.SH.headS;
 return {name:a.g?.name||a.bear.name||'The bear',keys:[[0x3a,0x15,0x12],[0x6e,0x2a,0x25],[0xb6,0x5c,0x53]],cm:B.CM,
  draw(c,P,o){A.over={he:o.he||0,ne:o.ne||0,mouth:o.mouth,lip:1,ear:-1};A.mouthBlood=o.blood||0;const R=B.rig(A,o.t),k=o.k,mx=R.hcx+Math.cos(R.he)*11*hs,my=R.hcy-Math.sin(R.he)*11*hs+1.6*hs;
   B.draw(c,A,Math.round(P.x+k*sz*mx),Math.round(P.y-k*sz*my),k,-1,{time:o.t,noShadow:true,px:1/k});}};};

// ---------------------------------------------------------------- Texte (Englisch)
const SIDE=id=>id[0]==='l'?'left':'right',LIMB_EN={h:'hand',fa:'forearm',ua:'arm',f:'foot',sh:'leg below the knee',t:'leg'},JOINT_EN={h:'at the wrist',fa:'at the elbow',ua:'at the shoulder',f:'at the ankle',sh:'at the knee',t:'at the hip'};
T.LIMBS=['lh','rh','lfa','rfa','lua','rua','lf','rf','lsh','rsh','lt','rt'];
const LIMBV={forearm:[71,46],upperarm:[68,40],hand:[74,52],thigh:[67,40],shin:[70,44],foot:[92,62]};
const helmOf=g=>{try{for(const i of M.armorItems(g)||[])if(i.def==='helm'){const lk=M.itemLook(i)||{},mat=['leather','medium'].includes(i.material)?i.material:'metal';return {mat,col:mat==='metal'?(lk.metal||'#9aa3a8'):(lk.leather||'#7b5a38')};}}catch{}return null;};

// ---------------------------------------------------------------- Ablauf
const CR={s1:.7,s2:1.4,s3:2.1,len:5},TE={tear:1.85,len:4.5};
T.make=function(o){const v=o.victim,g=v?.g||o.g,e={kind:o.kind==='tear'?'tear':'crush',limb:o.limb||'rfa',g,team:v?.team??o.team??1,beast:o.beast,t:0,parts:[],stains:[],shake:0,flash:0,ev:{},seed:(Math.random()*1e5)|0,preview:!!o.preview,onEnd:o.onEnd||null};
 const att=o.beast?.name||'The beast',name=g?.name||'Someone';
 if(e.kind==='crush'){e.len=CR.len;e.helm=helmOf(g);e.title='Head crushed';e.line1=att+' closes its jaws around '+name+"'s head:";e.line3=e.helm?(e.helm.mat==='metal'?'the helmet folds first, then the skull':'the leather cap does nothing at all'):'bone gives way in stages';
  e.cracks=[];for(let i=0;i<22;i++)e.cracks.push({o:i%2,an:-2.6+hsh(e.seed+i)*3.4,len:5+hsh(e.seed+i*3)*13,st:i<5?0:i<11?1:i<17?2:3,jit:e.seed+i*7});}
 else{const k=e.limb.slice(1);e.right=e.limb[0]==='r';e.view=M.injuryShots?.viewOf(e.limb)||'forearm';e.A=LIMBV[e.view]||LIMBV.forearm;e.len=TE.len;const s=SIDE(e.limb);e.title=s[0].toUpperCase()+s.slice(1)+' '+LIMB_EN[k]+' torn off';e.line1=att+' tears at '+name+"'s "+s+' '+LIMB_EN[k]+':';e.line3='skin, muscle, sinew, bone. In that order.';}
 return e;};
function brain(e,x,y,n,v,dir,spread=1){for(let i=0;i<n;i++){const an=dir+rnd(-.8,.8)*spread,sp=rnd(.25,.8)*v;e.parts.push({x,y,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp,life:rnd(.9,2.2),s:Math.random()<.5?3:2,c:BRAIN[(Math.random()*BRAIN.length)|0],brain:1});}}
function blood(e,x,y,n,v,dir,spread=1,col=null){for(let i=0;i<n;i++){const an=dir+rnd(-.8,.8)*spread,sp=rnd(.3,1)*v;e.parts.push({x,y,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp,life:rnd(.7,2),s:Math.random()<.4?2:1,c:col});}}
const once=(e,key,at)=>e.ev[key]||e.t<at?false:(e.ev[key]=1);
// Zustand des Kopfbisses: a Zeit seit dem Zubeißen, st Stufe 0–3, m Maul, sink/tilt des Kopfs, env Schütteln
function crushState(e){const a=e.t-IMP,st=a<CR.s1?0:a<CR.s2?1:a<CR.s3?2:3,MM=[.8,.66,.5,.26],AT=[0,CR.s1,CR.s2,CR.s3];let m=1;if(a>=0)for(let i=0;i<=st;i++)m=m+(MM[i]-m)*ease((a-AT[i])/.22);
 const env=a>CR.s3+.45&&a<CR.s3+1.9?Math.sin((a-CR.s3-.45)/1.45*Math.PI):0,fall=a>CR.s3?ease((a-CR.s3)/.5):0;
 return {a,st,m,env,fall,sink:a<0?0:2+st*2.5+fall*7+env*Math.sin(a*25)*1.5,tilt:a<0?0:st*.035+fall*.1+env*Math.sin(a*25)*.03,sx:Math.sin(a*25)*4*env,sy:Math.cos(a*12.5)*2*env,lunge:1-ease(e.t/IMP)};}
function stepEntry(e,dt){e.t+=dt;const t=e.t;
 if(e.kind==='crush'){const S=crushState(e),x=84,y=33+S.sink;
  if(once(e,'b',IMP)){e.shake=2;blood(e,x-4,y+4,8,60,-2.2);}
  if(once(e,'s1',IMP+CR.s1)){e.shake=3;e.flash=.25;blood(e,x-4,y+4,16,80,-2,1.2);blood(e,x+12,y+22,8,60,-.6);}
  if(once(e,'s2',IMP+CR.s2)){e.shake=4;e.flash=.45;blood(e,x,y+8,30,110,-1.8,1.4);for(let i=0;i<5;i++)blood(e,x,y+10,1,100,-2,1.2,'#efe6d0');}
  if(once(e,'s3',IMP+CR.s3)){e.shake=6;e.flash=.4;blood(e,x+2,y+10,70,150,-1.6,2.2);for(let i=0;i<22;i++)blood(e,x+2,y+10,1,140,-1.7,2,BONE[i%3]);for(let i=0;i<26;i++)brain(e,x+rnd(-6,8),y+rnd(4,16),120,-1.6,2);if(e.helm)for(let i=0;i<5;i++)blood(e,x+2,y+8,1,110,-1.6,1.6,e.helm.col);}
  if(e.shards)stepShards(e,dt);
  if(S.a>CR.s3&&S.a<CR.s3+1.2){e.acc2=(e.acc2||0)+dt;if(e.acc2>.07){e.acc2=0;brain(e,80+rnd(-3,3),84,1,70+rnd(0,50),-1.57,.5);if(Math.random()<.4)blood(e,80,84,1,90,-1.57,.4,BONE[(Math.random()*3)|0]);}}// Hirnmasse und Splitter quellen aus dem Halsstumpf
  if(S.a>CR.s1){e.acc=(e.acc||0)+dt;if(e.acc>(S.st>2?.03:.09)){e.acc=0;blood(e,x+rnd(-8,12),y+rnd(4,20),S.st>2?2:1,S.st>2?70:40,rnd(-2.6,-.5));}}}
 else{const [ax,ay]=e.A,a=t-IMP;
  if(once(e,'b',IMP)){e.shake=2;blood(e,ax,ay,10,60,-1.6);}
  if(once(e,'p1',IMP+.5)){e.shake=2;blood(e,ax,ay,8,60,-1.5,1.3);}
  if(once(e,'p2',IMP+.95)){e.shake=3;e.flash=.2;blood(e,ax,ay,12,80,-1.5,1.4);}
  if(once(e,'tear',IMP+TE.tear)){e.shake=6;e.flash=.75;blood(e,ax,ay,60,140,-1.3,2);for(let i=0;i<6;i++)blood(e,ax,ay,1,110,-1.5,1.6,'#efe6d0');}
  if(a>0){e.acc=(e.acc||0)+dt;const pump=.5+.5*Math.sin(t*9);if(e.acc>.05){e.acc=0;if(a>TE.tear)blood(e,ax+rnd(-2,2),ay,pump>.6?3:1,40+90*pump,-1.1,.5);else blood(e,ax+rnd(-8,8),ay+rnd(-4,4),1,40,-1.4,1.2);}}}
 for(let i=e.parts.length-1;i>=0;i--){const p=e.parts[i];p.vy+=170*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0||p.y>FH+4||p.x<-4||p.x>FW+4){if(p.y<FH&&p.x>0&&p.x<FW&&!p.c&&e.stains.length<260)e.stains.push({x:p.x|0,y:p.y|0,w:p.s+1});e.parts.splice(i,1);}}
 e.shake=Math.max(0,e.shake-dt*12);e.flash=Math.max(0,e.flash-dt*4);
 return t<e.len;}
T.stepEntry=stepEntry;
T.play=function(o){const e=T.make(o);T.q.push(e);T.active=true;return e;};
T.step=function(dt){if(!T.cur&&T.q.length)T.cur=T.q.shift();const e=T.cur;if(!e){T.active=false;return false;}
 if(stepEntry(e,dt))return true;T.cur=null;T.active=T.q.length>0;try{e.onEnd?.(e);}catch{}return T.active;};
T.skip=function(){const e=T.cur;T.cur=null;T.q.length=0;T.active=false;try{e?.onEnd?.(e);}catch{}};

// ---------------------------------------------------------------- Zeichnen
let gBase=null,gOver=null,gTier=null;
function layers(W,H){gBase??=document.createElement('canvas');if(gBase.width!==W||gBase.height!==H){gBase.width=W;gBase.height=H;}gOver??=document.createElement('canvas');gOver.width=FW;gOver.height=FH;gTier??=document.createElement('canvas');gTier.width=FW;gTier.height=FH;
 const o=gOver.getContext('2d');o.imageSmoothingEnabled=false;return o;}
// Tier auf eigener Ebene; die Mundhöhle wird durchsichtig, damit das Opfer im Maul zu sehen ist (Zähne und Kiefer bleiben davor)
function beast(o,e,P,opt,see){const q=gTier.getContext('2d',{willReadFrequently:true});q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,FW,FH);q.save();try{e.beast.draw(q,P,opt);}finally{q.restore();}
 if(see&&e.beast.keys){const im=q.getImageData(0,0,FW,FH),d=im.data,K=e.beast.keys;for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;for(const k of K)if(d[i]===k[0]&&d[i+1]===k[1]&&d[i+2]===k[2]){d[i+3]=0;break;}}q.putImageData(im,0,0);}
 o.drawImage(gTier,0,0);}
const Bx=c=>(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
function drops(o,e){const B=Bx(o);for(const p of e.parts)B(p.x,p.y,p.s,p.s,p.c||(p.s>1?'#7d150e':'#b8352a'));}

// Kopf zwischen den Kiefern: Gesicht des Spiels auf Schwarz (keine Arena dahinter), Risse, der Bär von rechts oben. Beim letzten Biss (Stufe 3) zerspringt
// der Kopf (Rückmeldung Thomas 28.11.2026): das echte Kopfbild wird einmal in Bruchstücke zerlegt (Voronoi über die Kopfpunkte), jede Bruchkante bekommt
// Knochen und Blut, die Stücke fliegen mit Knochensplittern, Hirnmasse und Blut auseinander; am Rumpf bleibt der Halsstumpf des Spiels (fx.stump).
const BRAIN=['#e3b3ab','#cf8f88','#b86c68','#f0cbc0','#9e5552'],BONE=['#efe6d0','#dccfae','#c4b48e'];
function shatter(e,tt,S){const fw=M.faceShot.FW||FW,fh=M.faceShot.FH||FH,cv=document.createElement('canvas');cv.width=fw;cv.height=fh;const g=cv.getContext('2d',{willReadFrequently:true});
 const o={g:e.g,team:e.team,mood:'out',yaw:-.16,pale:.85,blood:1,hurt:1,noseCrack:1,sink:S.sink,tilt:S.tilt,zoom:1/(1.12*(1+.07*ease(tt/5))),shake:0,clear:true};
 M.faceShot.paint(g,fw,fh,o,tt);const A=g.getImageData(0,0,fw,fh).data;g.clearRect(0,0,fw,fh);M.faceShot.paint(g,fw,fh,{...o,noHead:true},tt);const N=g.getImageData(0,0,fw,fh).data;
 const own=new Int16Array(fw*fh).fill(-1);let x0=fw,y0=fh,x1=0,y1=0;
 for(let i=0,j=0;j<fw*fh;j++,i+=4){if(A[i+3]<128)continue;if(N[i+3]>=128&&Math.abs(A[i]-N[i])+Math.abs(A[i+1]-N[i+1])+Math.abs(A[i+2]-N[i+2])<6)continue;own[j]=0;const x=j%fw,y=(j/fw)|0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
 if(x1<=x0)return [];const cx=(x0+x1)/2,cy=(y0+y1)/2,seeds=[];
 for(let i=0;i<11;i++){const an=(i<3?i/3:(i-3)/8)*Math.PI*2+hsh(e.seed+i*1.7)*.7,r=i<3?.2:.6;seeds.push({x:cx+Math.cos(an)*(x1-x0)*r*(.6+.5*hsh(e.seed+i*4.1)),y:cy+Math.sin(an)*(y1-y0)*r*(.6+.5*hsh(e.seed+i*2.9))});}
 for(let j=0;j<own.length;j++){if(own[j]<0)continue;const x=j%fw,y=(j/fw)|0,sd=e.seed%97,nx=x+2.2*Math.sin(y*.55+sd)+1*Math.sin(y*1.7+sd*2),ny=y+2.2*Math.sin(x*.6+sd*3)+1*Math.sin(x*1.9+sd);let k=0,d=1e9;for(let i=0;i<seeds.length;i++){const dx=nx-seeds[i].x,dy=ny-seeds[i].y,q=dx*dx+dy*dy;if(q<d){d=q;k=i;}}own[j]=k;}
 const hc=e.helm,parts=[];
 for(let k=0;k<seeds.length;k++){let a0=fw,b0=fh,a1=-1,b1=-1;for(let j=0;j<own.length;j++)if(own[j]===k){const x=j%fw,y=(j/fw)|0;if(x<a0)a0=x;if(x>a1)a1=x;if(y<b0)b0=y;if(y>b1)b1=y;}if(a1<0)continue;
  const w=a1-a0+1,h=b1-b0+1,pc=document.createElement('canvas');pc.width=w;pc.height=h;const q=pc.getContext('2d'),im=q.createImageData(w,h),d=im.data;let n=0;
  for(let y=b0;y<=b1;y++)for(let x=a0;x<=a1;x++){const j=y*fw+x;if(own[j]!==k)continue;n++;const o4=((y-b0)*w+x-a0)*4,s4=j*4;let r=A[s4],gg=A[s4+1],bb=A[s4+2];
   // Bruchkante zu einem anderen Stück: Knochen (Schädel im Querschnitt), dahinter Blut; Außenrand bleibt wie er war
   let brk=0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=fw||yy>=fh)continue;const o2=own[yy*fw+xx];if(o2>=0&&o2!==k){brk=dy<0||dx<0?1:2;break;}}
   if(brk){const c=hc&&hc.mat==='metal'&&brk===2?'#3c3a38':brk===1&&hsh(x*3.1+y*7.7)<.22?BONE[2]:brk===1?'#8d2219':'#5a0e0a';r=parseInt(c.slice(1,3),16);gg=parseInt(c.slice(3,5),16);bb=parseInt(c.slice(5,7),16);}
   else{let inner=0;for(const [dx,dy] of [[2,0],[-2,0],[0,2],[0,-2]]){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=fw||yy>=fh)continue;const o2=own[yy*fw+xx];if(o2>=0&&o2!==k){inner=1;break;}}
    if(inner){r=0x7a;gg=0x18;bb=0x10;}}// Blut und Mark hinter der Knochenkante
   d[o4]=r;d[o4+1]=gg;d[o4+2]=bb;d[o4+3]=255;}
  if(n<4)continue;q.putImageData(im,0,0);
  const mx=a0+w/2,my=b0+h/2,dx=mx-cx,dy=my-cy,L=Math.hypot(dx,dy)||1,sp=35+hsh(e.seed+k*9.1)*65;
  parts.push({cv:pc,w,h,x:mx,y:my,vx:dx/L*sp+(hsh(e.seed+k*3.3)-.5)*30-25,vy:dy/L*sp*.6-45-hsh(e.seed+k*5.5)*55,r:0,vr:(hsh(e.seed+k*6.6)-.5)*9});}
 return parts;}
function stepShards(e,dt){for(const p of e.shards){p.vy+=140*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=p.vr*dt;p.vx*=1-.4*dt;
  if(p.y>FH+30)continue;p.trail=(p.trail||0)+dt;if(p.trail>.05){p.trail=0;e.parts.push({x:p.x,y:p.y,vx:p.vx*.2,vy:p.vy*.2,life:.4,s:1,c:'#a8372f'});}}}
// Matsche dort, wo der Kopf war (Rückmeldung Thomas 28.11.2026): ein Haufen Kopfinneres auf dem Halsstumpf (Hirn, Fleisch, Schädelbasis) und Fäden aus Hirn,
// Fleisch und Kopfhaut mit Haaren, die von den Zähnen des Bären herabhängen, pendeln, länger werden und nachtropfen. Einmal festgelegt, wenige Kästchen je Bild.
function mushOf(e){const A=e.g?.appearance||{},hx=c=>/^#[0-9a-f]{6}$/i.test(c||'')?c:null,hair=hx(A.hair)||'#443025',skin=hx(A.skin)||'#c19169',sd=e.seed,m={heap:[],str:[]};
 for(let i=0;i<110;i++){const u=hsh(sd+i*1.31)*2-1,v=Math.sqrt(hsh(sd+i*2.77)),x=80+u*(15-v*6)+Math.sin(v*5+sd)*2,y=84-v*(26-Math.abs(u)*10),k=hsh(sd+i*4.9);
  m.heap.push({x,y,w:k<.5?2:3,h:2,c:i<24?'#4a0a08':k<.45?BRAIN[i%BRAIN.length]:k<.75?'#8d2219':k<.85?'#6e110b':k<.93?BONE[2]:skin});}
 for(let i=0;i<9;i++){const k=hsh(sd+i*6.1);m.str.push({dx:-10+i*3.5+(hsh(sd+i*3.3)-.5)*3,dy:6+i*2.4+(hsh(sd+i*8.2)-.5)*3,L:14+hsh(sd+i*5.4)*22,ph:hsh(sd+i)*6,w:k<.6?2:1,
  c:i===2?hair:k<.5?BRAIN[(i*2)%BRAIN.length]:'#8d2219',tip:i===2?skin:k<.5?BRAIN[0]:'#6e110b',hair:i===2});}
 m.jaw={x:66+hsh(sd+.5)*3,y:72,skin};
 return m;}
function paintMush(o,e,B,P,a){const m=e.mush??=mushOf(e),k=a-CR.s3,jig=Math.sin(k*18)*Math.max(0,1-k*1.4);
 for(const q of m.heap)B(q.x+jig*(q.y<78?1:0),q.y+Math.max(0,(80-q.y)*.08*Math.min(1,k)),q.w,q.h,q.c);// sackt langsam in sich zusammen
 {const J=m.jaw,sw=Math.round(Math.sin(k*2.6)*1.5),jx=J.x+sw,jy=J.y+Math.round(Math.min(1,k)*3);B(jx+5,J.y-4,1,jy-J.y+4,'#8d2219');B(jx,jy,9,4,J.skin);B(jx,jy+3,9,1,'#6e110b');for(let t=0;t<3;t++)B(jx+1+t*3,jy+4,2,2,'#f2ead6');B(jx+7,jy,2,2,'#4a0a08');}// Rest vom Unterkiefer mit Zähnen
 for(let i=0;i<m.heap.length;i+=6){const q=m.heap[i],L=Math.min(9,k*(4+i%5));if(i%12===0)B(q.x,q.y+2,1,L,'#8d2219');}// läuft über den Stumpfrand
 for(const s of m.str){const L=s.L*ease(cl(k/.7))+Math.min(6,k*1.5),x0=P.x+s.dx,y0=P.y+s.dy;let x=x0,y=y0;
  for(let j=0;j<L;j++){const sw=Math.sin(k*3.2+s.ph)*j*.12+Math.sin(k*7+s.ph+j*.3)*.4;x=x0+sw;y=y0+j;B(x,y,s.w,1,j%5===4&&!s.hair?'#6e110b':s.c);if(s.hair&&j%2)B(x+1,y,1,1,'#2a1a12');}
  B(x-1,y,s.w+2,2,s.tip);if(s.hair)B(x-1,y-1,3,1,'#8d2219');
  if(!s.hair&&((k*3+s.ph)%1.6)<.05&&e.parts.length<500)e.parts.push({x,y:y+2,vx:0,vy:20,life:1,s:Math.random()<.5?2:1,c:s.c});}}
function paintCrush(cv,e){const ctx=cv.getContext('2d'),W=cv.width,H=cv.height,tt=e.t,S=crushState(e),a=S.a,o=layers(W,H),bg=gBase.getContext('2d');bg.imageSmoothingEnabled=false;
 const TZ=Math.max(.6,(W/160)/(Math.max(W/160,H/104)*1.12)),mood=a<0?'terror':S.st<2?'pain':S.st<3?'shock':'out',burst=a>=CR.s3;
 if(burst&&!e.shards){try{e.shards=shatter(e,tt,S);}catch{e.shards=[];}}
 M.faceShot.paint(bg,W,H,{g:e.g,team:e.team,mood,yaw:-.16,pale:cl((a-1)/1.6)*.85,blood:cl((a-.4)/1.4),hurt:cl(a/1.8),noseCrack:S.st>=2?1:0,sink:S.sink,tilt:S.tilt,zoom:TZ,shake:0,black:true,
  noHead:burst,fx:burst?{stump:Math.max(.01,a-CR.s3)}:undefined,dark:cl((a-3.3)/1)*.55},tt);
 const z=TZ*1.12*(1+.07*ease(tt/5)),s=Math.max(W/160,H/104)*z,x0=Math.round(W/2-160*s/2),y0=Math.round(Math.min(0,(H-104*s)*.42));
 const B=Bx(o),P={x:84+S.sx,y:33+S.sink+S.sy},C=[{x:P.x-5,y:P.y+5},{x:P.x+15,y:P.y+24}],hc=e.helm,dark=hc?'#14100e':'#3d0a0c',lite=hc?(hc.mat==='metal'?'#c9d2d6':'#8d7250'):'#8d2219';
 if(a>0&&!burst){ // Zahnlöcher, Risse, die mit jeder Stufe weiterlaufen; nur feine Rinnsale, kein Blutfleck über dem Kopf
  for(const c0 of C){B(c0.x-1,c0.y-1,3,3,'#2d0705');B(c0.x-2,c0.y+1,5,1,'#8d2219');}
  for(const k of e.cracks){if(k.st>S.st)continue;const c0=C[k.o],grow=cl((a-[0,CR.s1,CR.s2,CR.s3][k.st])/.2);let x=c0.x,y=c0.y,an=k.an;for(let i=0;i<k.len*grow;i++){an+=(hsh(k.jit+i)-.5)*.7;x+=Math.cos(an);y+=Math.sin(an);B(x,y,1,1,dark);if(hc&&i%4===1)B(x,y-1,1,1,lite);else if(!hc&&S.st>=2&&i%5===2)B(x+1,y,1,1,'#efe6d0');}}
  for(const [dx,f] of [[-12,.8],[-6,1],[1,.6],[9,.9],[16,.7]]){const L=Math.min(30,Math.max(0,a-.25)*(6+S.st*4)*f);B(P.x+dx,P.y+7,1,L,'#8d2219');B(P.x+dx,P.y+7+L,1,1,'#6b2420');}}
 for(const st of e.stains)B(st.x,st.y,st.w,1,st.c||'#8a2a22');
 beast(o,e,{x:P.x+Math.round(34*S.lunge),y:P.y-Math.round(26*S.lunge)},{k:2.05*(e.beast.cm||2.2),he:-.3-.04*S.st,mouth:S.m,blood:cl(a*.1,0,.12),t:tt},true);
 if(burst)paintMush(o,e,B,P,a);
 if(e.shards)for(const p of e.shards){if(p.y>FH+30)continue;o.save();o.translate(Math.round(p.x),Math.round(p.y));o.rotate(Math.round(p.r*4)/4);o.drawImage(p.cv,-p.w/2|0,-p.h/2|0);o.restore();}
 drops(o,e);
 const shx=Math.round(rnd(-1,1)*e.shake*s*.3),shy=Math.round(rnd(-1,1)*e.shake*s*.2);
 ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);ctx.drawImage(gBase,shx,shy);ctx.drawImage(gOver,0,0,FW,FH,x0+shx,y0+shy,Math.round(FW*s),Math.round(FH*s));
 if(a>CR.s1){const v=Math.min(.6,.1+.14*S.st),g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.32,W/2,H/2,Math.max(W,H)*.7);g.addColorStop(0,'rgba(120,0,0,0)');g.addColorStop(1,`rgba(130,6,4,${v})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
 finish(ctx,W,H,e,a);}

// Glied abreißen: Arm oder Bein des Spiels mit Schiene, der Bär von rechts unten; im Augenblick des Abrisses das Stumpfbild des Spiels
function paintTear(cv,e){const ctx=cv.getContext('2d'),W=cv.width,H=cv.height,tt=e.t,a=tt-IMP,off=a>=TE.tear,k2=a-TE.tear,o=layers(W,H),bg=gBase.getContext('2d');bg.imageSmoothingEnabled=false;
 if(off)M.injuryShots.paint(bg,W,H,{g:e.g,part:e.limb,kind:'sever',cls:'none',mute:true,noFace:true,textScale:.001},HIT+k2);
 else M.injuryShots.paint(bg,W,H,{g:e.g,part:e.limb,kind:'cut',cls:'none',mute:true,noFace:true,textScale:.001},Math.min(.5,tt*.12));
 const zoom=1+.04*ease(tt/3),s=Math.max(W/160,H/100)*zoom,dw=160*s,dh=100*s,x0=Math.max(W-dw,Math.min(0,Math.round(W/2-80*s))),y0=Math.max(H-dh,Math.min(0,Math.round(H/2-50*s)));
 const B=Bx(o),[ax,ay]=e.A,pull=a<0?0:off?0:cl(a/TE.tear),tug=a>0&&!off?Math.sin(a*21)*(1+2.5*pull):0,lunge=1-ease(tt/IMP),away=off?ease(k2/.5):0;
 if(a>0&&!off){const n=Math.min(1,a*2.5);for(let i=0;i<6;i++){const u=(i-2.5)/2.5;B(ax+u*13,ay-10+u*u*3,2,2,'#2d0705');B(ax+u*12,ay+9-u*u*3,2,2,'#2d0705');}
  o.globalAlpha=.85;B(ax-13,ay-4,26,9*n,'#a8372f');o.globalAlpha=1;
  for(const [dx,f] of [[-10,.7],[-4,1],[3,.6],[9,.85]]){const len=Math.min(34,a*14*f);B(ax+dx,ay+5,1,len,'#8d2219');B(ax+dx,ay+5+len,2,1.5,'#6b2420');}
  if(pull>.3){const g=(pull-.3)/.7,w=2+Math.round(g*7);B(ax-16,ay-13,w,26,'#240302');B(ax-16+1,ay-11,Math.max(1,w-2),22,'#6e110b');// Haut reißt auf: Spalt, Muskel, Sehnen
   for(let i=0;i<5;i++)B(ax-16,ay-9+i*4+((a*20+i)%2),w+1,1,i%2?'#b5503f':'#e2d6b8');if(g>.7)B(ax-16,ay-1,w,3,'#efe6d0');}}
 for(const st of e.stains)B(st.x,st.y,st.w,1,'#8a2a22');
 beast(o,e,{x:ax+2+tug+Math.round(30*lunge)+Math.round(46*away)+(off?Math.sin(k2*24)*3*(1-cl(k2/1.6)):0),y:ay+1+tug*.5+Math.round(26*lunge)+Math.round(34*away)},{k:1.95*(e.beast.cm||2.2),he:.42,mouth:a<0?.75:off?.2+.2*away:.3,blood:cl(a*.1,0,.12),t:tt},false);
 drops(o,e);
 const shx=Math.round(rnd(-1,1)*e.shake*s*.3+tug*s*.25),shy=Math.round(rnd(-1,1)*e.shake*s*.2);
 ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#120c09';ctx.fillRect(0,0,W,H);ctx.drawImage(gBase,shx,shy);
 ctx.save();if(e.right){ctx.translate(W,0);ctx.scale(-1,1);}ctx.drawImage(gOver,0,0,FW,FH,x0+(e.right?-shx:shx),y0+shy,Math.round(FW*s),Math.round(FH*s));ctx.restore();
 finish(ctx,W,H,e,a);}

// Einblendung wie in den Nahaufnahmen des Spiels: Porträt und Name oben links, Balken unten
const faces=new WeakMap();
function finish(g,w,h,e,k){if(e.flash>0){g.fillStyle=`rgba(255,246,220,${e.flash*.55})`;g.fillRect(0,0,w,h);}
 const fi=1-ease(e.t/.3),fo=ease((e.t-(e.len-.35))/.35),fd=Math.max(fi,fo);if(fd>0){g.fillStyle=`rgba(0,0,0,${fd})`;g.fillRect(0,0,w,h);}
 const u=Math.min(w/660,h/420);g.save();let f=e.g?faces.get(e.g):null;if(e.g&&!f){f=document.createElement('canvas');try{M.renderPortrait(f,e.g,{unarmored:true});}catch{}faces.set(e.g,f);}
 const pw=Math.round(72*u),ph=Math.round(90*u),px=Math.round(10*u),py=px;g.fillStyle='#17201c';g.fillRect(px-3,py-3,pw+6,ph+6);g.fillStyle='#e0b565';g.fillRect(px-2,py-2,pw+4,ph+4);if(f?.width)g.drawImage(f,px,py,pw,ph);
 g.textAlign='left';g.textBaseline='top';g.font=`bold ${Math.round(25*u)}px 'Courier Prime',monospace`;const name=String(e.g?.name||'').toUpperCase();g.fillStyle='#17201c';g.fillText(name,px+pw+12*u+2,py+2);g.fillStyle='#efe0b3';g.fillText(name,px+pw+12*u,py);
 {let zz=Math.round(15*u);do{g.font=`${zz}px 'Courier Prime',monospace`;}while(g.measureText(e.line1).width>w-pw-34*u&&--zz>8);g.fillStyle='#17201c';g.fillText(e.line1,px+pw+12*u+1,py+31*u+1);g.fillStyle='#e0b565';g.fillText(e.line1,px+pw+12*u,py+31*u);}
 if(k>=0){const al=cl(k/.18),bh=Math.round(66*u),by=h-bh;g.globalAlpha=al*.86;g.fillStyle='#0d0a08';g.fillRect(0,by,w,bh);g.globalAlpha=al;g.fillStyle='#a3231d';g.fillRect(0,by,w,Math.max(2,Math.round(3*u)));g.textAlign='center';
  const fit=(txt,p2,bold)=>{let zz=Math.round(p2*u);do{g.font=`${bold?'bold ':''}${zz}px 'Courier Prime',monospace`;}while(g.measureText(txt).width>w-40*u&&--zz>8);};
  const big=e.title.toUpperCase();fit(big,32,true);g.fillStyle='#17201c';g.fillText(big,w/2+2,by+8*u+2);g.fillStyle='#f29b83';g.fillText(big,w/2,by+8*u);
  fit(e.line3,16);g.fillStyle='#efe0b3';g.fillText(e.line3+(e.preview?'':'   ·   tap to skip'),w/2,by+43*u);}
 g.restore();}
T.paint=function(cv,e=T.cur){if(!e||!cv||!T.ready()||!e.beast)return false;const t0=performance.now();(e.kind==='crush'?paintCrush:paintTear)(cv,e);T.ms=T.ms*.9+(performance.now()-t0)*.1;return true;};
})();
