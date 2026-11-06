'use strict';
// =====================================================================================================
// TODESDARSTELLUNG (todes-fx.js, M.deathFx) – Wunsch Thomas 06.11.: Jeder Tod sieht aus wie die Verletzung,
// an der er stirbt, sehr brutal, mit Blut auf der Kamera.
//  · Ablauf auf dem Kampffeld je Todesart: stehen bleiben, an die Wunde greifen, auf die Knie sinken, fallen
//    (vor- oder rückwärts), Aufprall, Todeszuckungen; dazu pulsierende Blutfontänen aus der tödlichen Wunde,
//    Blut aus dem Mund, Knochen- und Hirnsplitter, große Blutlache unter der Wunde.
//  · Blut auf der Kamera: Spritzer auf der „Linse“, die langsam herunterlaufen (Kampfbild und Nahaufnahmen).
//  · Todes-Nahaufnahme je Todesart (Kopf fällt ab, Kehle klafft auf, Schädel bricht …) und mehr Blut in den
//    Verletzungs-Nahaufnahmen.
// Reine Darstellung: ändert keine Würfel, keine Werte, kein Speichern. Anschlüsse (wirkungslos ohne dieses Modul):
//  sim.js death() → onDeath; arena.js Figur → fall/knee/busy, Kampfbild → lensDraw; injury-shots.js → shot/shotDone/gore.
// Zurzeit nur im Todes-Editor (todes-editor.html) geladen, im Spiel NICHT (boot.js unverändert).
// =====================================================================================================
(()=>{
const M=window.MG;if(!M)return;const S=M.s;
const cl=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=v=>{v=cl(v);return v*v*(3-2*v);},easeIn=v=>{v=cl(v);return v*v;};
const R=(a,b)=>a+Math.random()*(b-a);
const sh=v=>{const t=String(v??'');let h=7;for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))%9973;return h;};
const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const BLOOD=['#a8372f','#8f2a24','#c9584a','#6b2420'];

// ---------------------------------------------------------------- Todesarten
// dir: +1 fällt vornüber, -1 nach hinten · stand/knee/fall: Dauer der Abschnitte (s) · clutch: Hände an diese Stelle
// jet: pulsierende Fontäne (at: Stelle, dur: Dauer, beat: Herzschläge/s, speed, n: Tropfen je Schlag, spread)
// mouth: Blut aus dem Mund · burst: einmaliger Ausbruch (bone/brain: Splitter) · twitch: Zuckungen am Boden
// lens: Blut auf der Kamera (0–1) · pool: größte Blutlache
const TYPES={
 decap:{name:'Enthauptung',dir:1,stand:.85,knee:.35,fall:.5,flail:1,jet:{at:'stump',dur:6,beat:1.8,speed:[120,200],n:10,spread:.32},burst:{at:'stump',n:40,speed:[70,170]},twitch:{amp:1,dur:3.4,rate:12},lens:1,pool:36,shake:6},
 bisect:{name:'Durchtrennung',dir:-1,stand:0,fall:0,jet:{at:'belly',dur:4.5,beat:1.6,speed:[60,130],n:9,spread:.9},burst:{at:'belly',n:46,speed:[60,160],bone:4,gut:10},twitch:{amp:.8,dur:2.6,rate:10},lens:1,pool:40,shake:6},
 throat:{name:'Kehle durchschnitten',dir:1,stand:.75,clutch:'neck',knee:1.15,fall:.7,jet:{at:'throat',dur:5,beat:1.5,speed:[45,105],n:6,spread:.45},mouth:{dur:3.5,n:2},twitch:{amp:.75,dur:2.6,rate:8},lens:.6,pool:28},
 skull:{name:'Schädel zertrümmert',dir:-1,stand:0,fall:.24,limp:1,burst:{at:'head',n:30,speed:[50,150],bone:9,brain:12},jet:{at:'head',dur:2.8,beat:1.1,speed:[14,40],n:3,spread:1},twitch:{amp:1,dur:4.2,rate:15,posture:1},lens:.7,pool:22,shake:5},
 heart:{name:'Stich in Brust/Herz',dir:-1,stand:.6,clutch:'chest',knee:.5,fall:.55,jet:{at:'chest',dur:3.4,beat:1.7,speed:[40,90],n:5,spread:.55},mouth:{dur:2.6,n:2},twitch:{amp:.6,dur:2.1,rate:9},lens:.4,pool:24},
 gut:{name:'Bauch / innere Verletzung',dir:1,stand:.95,clutch:'belly',knee:1,fall:.75,mouth:{dur:4,n:5,cough:1},jet:{at:'belly',dur:3.2,beat:1.2,speed:[20,50],n:4,spread:.7},twitch:{amp:.85,dur:3.2,rate:6},lens:.35,pool:26},
 arrow:{name:'Tödlicher Pfeil',dir:-1,stand:.14,fall:.32,jerk:1,jet:{at:'part',dur:2.4,beat:1.6,speed:[25,65],n:3,spread:.5},twitch:{amp:.55,dur:1.8,rate:12},lens:.25,pool:16},
 bleed:{name:'Verblutet',dir:1,stand:1.5,sway:1,knee:1.5,fall:1.15,mouth:{dur:1.2,n:1},twitch:{amp:.35,dur:2.8,rate:4},lens:0,pool:40},
 ground:{name:'Gnadenstoß am Boden',dir:0,stand:0,fall:0,jet:{at:'part',dur:3.2,beat:1.9,speed:[55,125],n:7,spread:.5},burst:{at:'part',n:18,speed:[40,110]},twitch:{amp:1,dur:2.8,rate:13,kick:1},lens:.5,pool:30},
 maul:{name:'Zerfleischt / Biss',dir:-1,stand:.3,clutch:'neck',fall:.4,jet:{at:'throat',dur:4.2,beat:2,speed:[40,115],n:8,spread:.95},burst:{at:'throat',n:16,speed:[40,100]},twitch:{amp:1,dur:3.6,rate:12},lens:.6,pool:32},
 generic:{name:'Tödlicher Treffer',dir:-1,stand:.3,clutch:'chest',fall:.45,jet:{at:'chest',dur:2.2,beat:1.5,speed:[30,70],n:3,spread:.6},twitch:{amp:.5,dur:1.8,rate:9},lens:.25,pool:18}};
const BLUNT=['club','mace','hammer','fist'];
const PARTS={'Kopf':'head','Hals':'neck','Brust':'chest','Bauch':'belly'};
function classify(cause='',wid='',wasDown=false){const c=String(cause);let t='generic';
 if(c==='Enthauptung')t='decap';else if(c==='Durchtrennung')t='bisect';
 else if(/Kehlbiss|durchgebissen|zerfleischt|Bestien|Biss|Sporn|Schnabel/i.test(c))t='maul';
 else if(/Halsschnitt|Kehle|Schnittwunde/i.test(c))t='throat';
 else if(/Pfeil/i.test(c))t='arrow';
 else if(/Schädel|Kopftreffer|Stich: Kopf/i.test(c))t='skull';
 else if(/Stich: Hals/i.test(c))t='throat';
 else if(/Brust|Stich|Herz/i.test(c))t='heart';
 else if(/Innere|Bauch/i.test(c))t='gut';
 else if(/Blutung|Verblutet/i.test(c))t='bleed';
 else if(/Gnadenstoß|Abschluss|am Boden|Urteil/i.test(c))t='ground';
 else if(BLUNT.includes(wid))t='skull';
 return t;}
const partOf=(cause,type,g)=>{const m=/: (\S+)$/.exec(String(cause||''));if(m&&PARTS[m[1]])return PARTS[m[1]];
 if(type==='skull')return 'head';if(type==='throat'||type==='maul'||type==='decap')return 'neck';if(type==='gut'||type==='bisect')return 'belly';
 let best='chest',v=-1;for(const id of ['head','neck','chest','belly']){const p=g?.body?.[id];if(!p)continue;const s=(100-(p.hp??100))+(p.bleed||0)*3;if(s>v){v=s;best=id;}}return best;};
// Stellen am Körper in Figurmaß (y nach oben negativ) und Austrittsrichtung
const SITE={stump:{x:1,y:-58,dx:.15,dy:-1},throat:{x:5,y:-57,dx:1,dy:-.15},neck:{x:5,y:-57,dx:1,dy:-.15},head:{x:2,y:-68,dx:.25,dy:-1},chest:{x:4,y:-46,dx:1,dy:-.25},belly:{x:4,y:-35,dx:1,dy:0},mouth:{x:7,y:-63,dx:1,dy:-.1},limb:{x:0,y:-28,dx:1,dy:-.3}};

// ---------------------------------------------------------------- Zustand
const api={active:true,lens:true,rec:new Map(),types:TYPES,classify,onEvent:null,
 get on(){return this.active;}};
let clock=0;
const lens=[];// Spritzer auf der Kamera: {x,y,r,born,seed,drips,amount}

function onDeath(b,a,cause){if(!api.active||!b)return;const wid=a?(M.weapon?.(a)?.id||''):'';const wasDown=!!(b.down||b.fallTimer>0||b.kneeTimer>0&&false);
 let type=classify(cause,wid,wasDown);const P=TYPES[type];const part=partOf(cause,type,b.g);
 const face=Math.cos(b.a||0)>=0?1:-1;
 // Fallrichtung: vornüber (zum Gegner hin) oder nach hinten; die Figur dreht im eigenen Bild, also nur das Vorzeichen
 if(!wasDown&&P.dir)b.fallSide=P.dir;
 const r={type,P,part,g:b.g,t0:clock,wasDown,face,seed:Math.random()*1000,cause:String(cause||''),wid,beatN:0,mouthN:0,landed:wasDown,burstDone:false,spasms:[]};
 for(let t=.3;t<(P.twitch?.dur||0)*1.4;t+=R(.35,.9))r.spasms.push(t);
 api.rec.set(b.id,r);
 if(P.shake)M.shake=Math.max(M.shake||0,P.shake);
 if(api.lens&&P.lens>0)splash(P.lens*viewNear(),b);
 api.onEvent?.({kind:'death',actor:b,attacker:a,cause,type,part,wasDown});}

// Körperstelle → Weltpunkt (wie contactAnchor in sim.js, aber für jeden Zwischenstand des Fallens)
function sitePoint(b,site,fall){const g=b.g,scale=(g.height||180)/180*1.14,wide=cl(.85+(g.weight||80)/420,.98,1.18)*(g.statureWide||1),face=Math.cos(b.a||0)>=0?1:-1,rot=(b.fallSide||-1)*1.35*fall,s=SITE[site]||SITE.chest;
 const c=Math.cos(rot),n=Math.sin(rot),lx=12*fall+c*s.x-n*s.y,ly=5*fall+n*s.x+c*s.y;
 return {x:b.x+lx*scale*wide*face,y:b.y+ly*scale,dx:(c*s.dx-n*s.dy)*face,dy:n*s.dx+c*s.dy,scale};}

// ---------------------------------------------------------------- Ablauf je Bild
function phase(r,t){const P=r.P;if(r.wasDown||(!P.stand&&!P.fall))return {fall:1,knee:0,lying:true};
 const st=P.stand||0,kn=P.knee||0,fa=P.fall||.3;
 if(t<st){const sway=P.sway?Math.sin(t*3.2)*.05+t/st*.06:P.jerk?-.12*Math.sin(cl(t/st)*Math.PI):P.flail?Math.sin(t*7)*.03:.02*Math.sin(t*4);return {fall:Math.max(0,sway),knee:0,lying:false,stand:true};}
 if(t<st+kn){const u=(t-st)/kn;return {fall:.06+u*.06,knee:ease(u/.35),lying:false,kneel:true};}
 const u=(t-st-kn)/fa;if(u<1){const f0=kn?.12:0;return {fall:f0+(1-f0)*easeIn(u),knee:kn?1-u:0,lying:u>.75};}
 const v=t-st-kn-fa,bounce=Math.abs(Math.sin(v*14))*Math.exp(-v*6)*.07;return {fall:1-bounce,knee:0,lying:true};}
const live=r=>{const t=clock-r.t0;return t<(r.P.stand||0)+(r.P.knee||0)+(r.P.fall||0)+Math.max(r.P.jet?.dur||0,(r.P.twitch?.dur||0)*1.4,r.P.mouth?.dur||0)+.6;};

function fx(){return M.fx||[];}let cur=0;
function particle(o){const L=fx();if(!L.length)return;let p=null;for(let i=0;i<L.length;i++){const q=L[(cur+i)%L.length];if(!q.active){p=q;cur=(cur+i+1)%L.length;break;}}if(!p){p=L[cur++%L.length];}Object.assign(p,{active:true,groundKind:'blood',life:2.8,size:2,...o});}
function spray(b,site,fall,n,sp,spread,col,extra){const q=sitePoint(b,site,fall);for(let i=0;i<n;i++){const a=Math.atan2(q.dy,q.dx)+R(-spread,spread),v=R(sp[0],sp[1]);
 particle({x:q.x+R(-1.5,1.5),y:b.y+R(-2,3),z:Math.max(1,b.y-q.y),vx:Math.cos(a)*v,vz:-Math.sin(a)*v,vy:R(-14,14),color:col||BLOOD[(Math.random()*3)|0],size:Math.random()<.3?3:2,...(extra||{})});}}

function step(dt){if(!api.active||!S.battle){return;}if(M.injuryShots?.frozen)return;clock+=dt;
 for(const [id,r] of api.rec){const b=S.battle.actors.find(x=>x.id===id);if(!b||!b.g.dead){api.rec.delete(id);continue;}
  const t=clock-r.t0,P=r.P,ph=phase(r,t);r.ph=ph;
  // Hände, Beine, Zucken (über die vorhandene Liegepose agony)
  const tw=P.twitch,landT=r.wasDown?0:(P.stand||0)+(P.knee||0)+(P.fall||0),since=t-landT;
  let amp=0;if(tw&&since>0&&since<tw.dur*1.4){amp=tw.amp*Math.exp(-since/tw.dur*2.1);for(const s of r.spasms)if(since>s&&since<s+.25)amp=Math.max(amp,tw.amp*(1-(since-s)/.25)*Math.exp(-s/tw.dur*1.4));}
  if(ph.stand||ph.kneel){b.agony=P.clutch?{pose:0,part:P.clutch,rate:7,live:.5,lie:1.35,twitch:true,noLegs:true}:P.flail?{pose:1,part:'chest',rate:18,live:1.2,lie:1.35,twitch:true,noLegs:true}:null;}
  else{const posture=tw?.posture&&since>0&&since<tw.dur;b.agony={pose:posture?2:P.clutch?0:1,part:P.clutch||(r.part==='head'?'head':'chest'),rate:tw?.rate||8,live:+amp.toFixed(2),lie:1.35,twitch:amp>.02,noLegs:false};}
  // Aufprall
  if(!r.landed&&ph.lying&&ph.fall>.95){r.landed=true;M.sound?.('fall');M.shake=Math.max(M.shake||0,2.5);const q=sitePoint(b,'chest',1);for(let i=0;i<10;i++)particle({x:q.x+R(-14,14),y:b.y+R(-3,4),z:1,vx:R(-30,30),vz:R(15,40),vy:R(-8,8),color:Math.random()<.5?'#c4a876':'#a8372f',groundKind:null,life:.6});
   if(P.pool)spray(b,P.jet?.at==='stump'?'stump':P.jet?.at==='part'?siteOfPart(r.part):(P.jet?.at||'chest'),1,8,[20,60],1.2);}
  // einmaliger Ausbruch (Kopf, Stumpf, Rumpf)
  if(!r.burstDone&&P.burst){r.burstDone=true;const B=P.burst,site=B.at==='part'?siteOfPart(r.part):B.at;spray(b,site,ph.fall,B.n,B.speed,1.3);
   for(let i=0;i<(B.bone||0);i++)spray(b,site,ph.fall,1,[40,110],1.4,Math.random()<.5?'#e6dcc2':'#cfc2a2',{groundKind:'bone',size:2});
   for(let i=0;i<(B.brain||0);i++)spray(b,site,ph.fall,1,[30,90],1.3,Math.random()<.5?'#d9a0a0':'#c98686',{size:Math.random()<.4?3:2});
   for(let i=0;i<(B.gut||0);i++)spray(b,site,ph.fall,1,[20,70],1.2,Math.random()<.5?'#b5615a':'#d48b7c',{size:3});}
  // pulsierende Fontäne: Herzschläge werden langsamer und schwächer
  const J=P.jet;if(J&&t<J.dur){/* Strahl im Herzschlag: kräftig in jedem Schlag, dazwischen fast still; wird langsamer und schwächer */const beat=J.beat*(1-.4*t/J.dur),k=Math.exp(-t/J.dur*1.5);r.ph2=(r.ph2||0)+dt*beat;const w=Math.pow(Math.max(0,Math.sin(r.ph2*6.283)),2),site=J.at==='part'?siteOfPart(r.part):J.at,hands=P.clutch&&(ph.stand||ph.kneel)?.6:1;
   r.acc=(r.acc||0)+dt*J.n*beat*7*w*k*hands;const n=Math.floor(r.acc);r.acc-=n;
   if(n>0)spray(b,site,ph.fall,n,[J.speed[0]*(.55+.45*k)*(.7+.3*w),J.speed[1]*(.5+.5*k)*(.7+.3*w)],J.spread*(hands<1?1.7:1),null,{size:Math.random()<.45?3:2});
   const n2=Math.floor(t*beat);if(n2>=r.beatN){r.beatN=n2+1;if(api.lens&&P.lens>.45&&k>.5&&Math.random()<P.lens*.3*viewNear())splash(P.lens*.4*viewNear(),b,true);}
   if(Math.random()<dt*10*k)spray(b,site,ph.fall,1,[5,22],1.2);}
  const MO=P.mouth;if(MO&&t>.25&&t<MO.dur){const n=Math.floor(t*(MO.cough?1.4:.9));if(n>r.mouthN){r.mouthN=n;spray(b,'mouth',ph.fall,MO.n*(MO.cough?2:1),MO.cough?[40,90]:[10,30],MO.cough?.5:.4);}}
  // Blutlache unter der Wunde
  if(P.pool){b.pool??={x:b.x,y:b.y,r:0};const max=P.pool*((b.g.height||180)/180);if(ph.lying){const site=P.jet?.at==='stump'?'stump':P.jet?.at==='part'?siteOfPart(r.part):P.jet?.at||(r.part==='head'?'head':'chest'),q=sitePoint(b,site,1);if(!r.poolSet){r.poolSet=true;b.pool.x=q.x-5;b.pool.y=b.y+2;}b.pool.r=Math.max(b.pool.r,Math.min(max,b.pool.r+dt*max/(r.type==='bleed'?3:4.5)));b.majorBleed=true;}}
  if(!live(r)){b.agony={...(b.agony||{pose:0,part:'chest',rate:1,lie:1.35}),live:0,twitch:false,noLegs:false};api.rec.delete(id);}}
 for(let i=lens.length-1;i>=0;i--)if(clock-lens[i].born>lens[i].life)lens.splice(i,1);}
const siteOfPart=p=>p==='head'?'head':p==='neck'?'throat':p==='belly'?'belly':p==='chest'?'chest':'limb';

// Kamera nah? (Zoom) → mehr Blut auf der Linse
function viewNear(){const s=M.arenaView?.scale||1.5;return cl(s/2,.45,1.5);}

// ---------------------------------------------------------------- Blut auf der Kamera
function makeSplat(seed,amount,cx,cy){const n=2+Math.floor(hash(seed)*3+amount*3),blobs=[];const r0=.012+amount*.026*(.6+hash(seed+1)*.8);
 for(let i=0;i<n;i++){const a=hash(seed+i*7.3)*6.283,d=r0*(i?(.5+hash(seed+i)*1.2):0);blobs.push({x:cx+Math.cos(a)*d,y:cy+Math.sin(a)*d*.8,r:r0*(i?.25+hash(seed+i*3.1)*.5:1)});}
 const tiny=[];for(let i=0;i<8+amount*22;i++){const a=hash(seed+i*1.7)*6.283,d=r0*(1.4+hash(seed+i*2.9)*5);tiny.push({x:cx+Math.cos(a)*d,y:cy+Math.sin(a)*d*.85,r:r0*(.08+hash(seed+i*5.3)*.18)});}
 const drips=[];for(let i=0;i<1+Math.floor(amount*4*hash(seed+9));i++){const b=blobs[i%blobs.length];drips.push({x:b.x+(hash(seed+i*4.4)-.5)*b.r,y:b.y,w:b.r*(.22+hash(seed+i*8.8)*.25),len:.05+hash(seed+i*6.6)*.3*amount,speed:.012+hash(seed+i*3.3)*.03});}
 return {blobs,tiny,drips,r0};}
function splash(amount,b,small){if(!api.lens||amount<=0)return;const v=M.arenaView;let cx=.5,cy=.45;if(v&&b){cx=cl(.5+((b.x-v.cx)*v.scale)/(v.width||1)+R(-.25,.25),.08,.92);cy=cl(.45+((b.y-40-v.cy)*v.scale)/(v.height||1)+R(-.25,.2),.08,.8);}else{cx=R(.15,.85);cy=R(.1,.6);}
 const k=small?1:1+Math.round(amount*1.6);for(let i=0;i<k;i++){const seed=Math.random()*1e4,a=cl(amount*(small?.5:1)*R(.55,1),.15,1.2),edge=Math.random()<.5,x=i?(edge?(Math.random()<.5?R(.03,.2):R(.8,.97)):R(.1,.9)):cx,y=i?R(.05,.75):cy;lens.push({born:clock+(i?R(0,.12):0),life:6+a*4,amount:a,...makeSplat(seed,a,x,y)});}
 if(lens.length>26)lens.splice(0,lens.length-26);}
// Zeichnen in einer kleinen Fläche (Pixelstil), dann grob vergrößert
const lensCv={};function lensSurface(w,h,div){const W=Math.max(1,Math.round(w/div)),H=Math.max(1,Math.round(h/div));let c=lensCv[div];if(!c){c=lensCv[div]=document.createElement('canvas');}if(c.width!==W||c.height!==H){c.width=W;c.height=H;}const q=c.getContext('2d');q.clearRect(0,0,W,H);return {c,q,W,H};}
function paintSplats(q,W,H,list,now){const D=Math.min(W,H);q.save();for(const s of list){const age=now-s.born;if(age<0)continue;const fade=cl(1-(age-(s.life-2.2))/2.2)*cl(age/.04);if(fade<=0)continue;const grow=cl(age/.08);
  // Tropfen laufen langsam herunter
  for(const d of s.drips){const L=Math.min(d.len,age*d.speed)*H;q.globalAlpha=.85*fade;q.fillStyle='#6d0f0c';q.fillRect(Math.round(d.x*W-d.w*D/2),Math.round(d.y*H),Math.max(1,Math.round(d.w*D)),Math.round(L));q.fillStyle='#8f1a14';q.fillRect(Math.round(d.x*W-d.w*D/2),Math.round(d.y*H),Math.max(1,Math.round(d.w*D*.5)),Math.round(L));
   q.beginPath();q.fillStyle='#7a120e';q.arc(d.x*W,d.y*H+L,Math.max(1,d.w*D*.75),0,6.283);q.fill();}
  for(const t of s.tiny){q.globalAlpha=.8*fade;q.fillStyle='#7d130f';q.beginPath();q.arc(t.x*W,t.y*H,Math.max(.7,t.r*D*grow),0,6.283);q.fill();}
  for(const bl of s.blobs){const r=bl.r*D*grow;q.globalAlpha=.75*fade;q.fillStyle='#5e0b09';q.beginPath();q.ellipse(bl.x*W,bl.y*H,r*1.1,r*.85,bl.x*9,0,6.283);q.fill();q.globalAlpha=.7*fade;q.fillStyle='#8a1712';q.beginPath();q.ellipse(bl.x*W-r*.12,bl.y*H-r*.1,r*.8,r*.6,bl.y*7,0,6.283);q.fill();
   q.globalAlpha=.55*fade;q.fillStyle='#d8705e';q.beginPath();q.arc(bl.x*W-r*.38,bl.y*H-r*.38,Math.max(.6,r*.16),0,6.283);q.fill();}}
 q.restore();}
function lensDraw(ctx,w,h){if(!api.active||!api.lens||!lens.length)return;const L=lensSurface(w,h,Math.max(2,Math.round(Math.min(w,h)/220)));paintSplats(L.q,L.W,L.H,lens,clock);ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;
 // roter Schleier, solange frisches Blut auf der Linse ist
 const fresh=lens.reduce((m,s)=>Math.max(m,s.amount*cl(1-(clock-s.born)/1.2)),0);if(fresh>0){ctx.globalAlpha=cl(fresh*.22);ctx.fillStyle='#5a0000';ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;}
 ctx.drawImage(L.c,0,0,w,h);ctx.restore();}

// ---------------------------------------------------------------- Figur (arena.js)
function fall(b){const r=api.rec.get(b.id);if(!r)return 1;const ph=r.ph||phase(r,clock-r.t0);return ph.fall;}
function knee(b){const r=api.rec.get(b.id);if(!r)return 0;const ph=r.ph||phase(r,clock-r.t0);return ph.knee||0;}
function busy(b){return api.active&&api.rec.has(b.id);}

// ---------------------------------------------------------------- Nahaufnahmen (injury-shots.js)
// Todes-Großaufnahme: Optionen für face-shots.js nach der Todesart; eigene Zeichnung über M.faceOverlays (Gesichtskoordinaten)
const ovSaved=new Map();
function shotType(o){const g=o?.g;const r=g&&[...api.rec.values()].find(x=>x.g===g);return o?.deathType||r?.type||classify(g?.cause,'',false);}
function shot(opts,o,k,t,dead){if(!api.active||!dead||!o?.g)return opts;const type=shotType(o),g=o.g,u=k;opts={...opts};
 // Drei Ebenen (Wunsch Thomas 06.11.): under = hinter dem Kopf (Hals, Stumpf, Kehle) · onHead = am Kopf, neigt sich mit ihm
 // (Wunden im Stil der Verletzungs-Nahaufnahmen) · Luft = Spritzer im Raum, ausgehend von Punkten am Kopf
 const later=ease((u-1)/1.6);opts.mood=u<0?'determined':u<.15?'shock':opts.mood;
 if(type==='decap'){const f=ease((u-.14)/.75);opts.sink=-f*125;opts.tilt=f*1.6*(sh(g.id)%2?1:-1);opts.mood=u<.18?'shock':'out';opts.shake=u>0&&u<.6?5:0;opts.pale=cl(u/1);opts.fx={blade:cl(u/.2),bladeY:70};}
 else if(type==='bisect'){opts.fx={gash:Math.max(0,u)};opts.shake=u>0&&u<.5?3:0;}
 else if(type==='throat'||type==='maul'){const open=cl(u/.2),drop=ease((u-2)/1.5);opts.sink=-16*open*(1-drop)+drop*30;opts.tilt=-.14*open*(1-drop)+(opts.tilt||0)*drop;opts.mood=u<.12?'shock':u<1.3?'scared':'out';opts.shake=u>0&&u<.3?3:0;opts.pale=cl(u/1.6);}
 else if(type==='skull'){opts.shake=u>0&&u<.35?7:0;opts.sink=(opts.sink||0)+cl(u/.12)*5;opts.tilt=(opts.tilt||0)-cl(u/.12)*.28;opts.mood=u<.04?'shock':'out';}
 else if(type==='heart'||type==='generic'){opts.mood=u<.15?'shock':u<1.1?'pain':'out';opts.sink=(opts.sink||0)*.7-cl(u/.15)*6*(1-later);}
 else if(type==='ground'){opts.mood=u<.1?'scared':u<.8?'pain':'out';opts.shake=u>0&&u<.25?4:0;}
 else if(type==='gut'){opts.mood=u<1.3?'pain':'out';opts.sink=(opts.sink||0)+Math.max(0,Math.sin(u*6))*3*(1-later);}
 else if(type==='arrow'){opts.sink=-cl(u/.06)*10*(1-later)+later*26;opts.tilt=-cl(u/.06)*.25*(1-later)+(opts.tilt||0)*later;opts.mood=u<.1?'shock':'out';opts.shake=u>0&&u<.15?5:0;}
 else if(type==='bleed'){opts.pale=cl(.55+u/1.2);opts.mood=u<1?'pain':'out';}
 /* Hals soll sichtbar sein: Kamera etwas zurück, sonst liegt er unter der Bildunterschrift */if(['decap','throat','maul'].includes(type)||type==='arrow'&&partOf(o.line3||g.cause,type,g)!=='head')opts.zoom=(opts.zoom||1)*.76;
 const st={type,u,g,o,opts,seed:sh(g.id)*13.7,part:partOf(o.line3||g.cause,type,g)};
 opts.under=(q,T)=>{if(u>=0)underNeck(q,T,st);};
 opts.onHead=(hq,HT,tt,yaw)=>{st.m=hq.getTransform();st.ya=Math.round(yaw*4);st.yaw=yaw;if(u>=0)headWound(hq,HT,st);};
 const id=g.id;if(id!=null){M.faceOverlays??={};if(!ovSaved.has(id))ovSaved.set(id,M.faceOverlays[id]);const prev=ovSaved.get(id);M.faceOverlays[id]=(ctx,T,tt,oo)=>{try{prev?.(ctx,T,tt,oo);}catch{}if(u>=0)air(ctx,T,st);};}
 return opts;}
const skinOf=g=>{const A=g?.appearance||{},ok=v=>/^#[0-9a-f]{6}$/i.test(v||'');return {skin:ok(A.skin)?A.skin:'#c19169',shade:ok(A.shade)?A.shade:'#875e43'};};
// Kopfpunkt (Kopfkoordinaten: Mitte x 80, Augen y 40, Mund y 57, Kinn y 68) → Gesichtskoordinaten der Luftebene, mit Helm, Neigung und Senkung
function headPt(st,hx,hy){if(!st.m)return {x:hx-80,y:hy-70};const p=st.m.transformPoint(new DOMPoint(hx+(st.ya||0),hy)),lx=p.x-80,ly=p.y-90,a=st.opts.tilt||0,c=Math.cos(a),s=Math.sin(a);return {x:c*lx-s*ly-(st.ya||0),y:s*lx+c*ly};}
// hinter dem Kopf: Hals in der Lücke unter dem gehobenen Kopf, klaffende Kehle, Halsstumpf (Rumpfkoordinaten, Kinn sonst bei y 70)
function underNeck(q,T,st){const {type,u,opts}=st,sink=opts.sink||0,C=skinOf(st.g);if(!['decap','throat','maul','arrow'].includes(type))return;
 const top=type==='decap'?72:Math.min(72,62+sink);for(let y=top;y<92;y++){T.r(69,y,22,1,C.skin);T.r(85,y,6,1,C.shade);T.r(69,y,1,1,'#3a2418');T.r(90,y,1,1,'#3a2418');}
 if(type==='decap'){if(u<.14)return;/* Schnittfläche: Fleisch, Luftröhre, Wirbel */T.r(67,top-2,26,4,'#6b2420');T.r(69,top-2,22,2,'#a8372f');T.r(78,top-2,5,3,'#efe6d0');T.r(73,top-1,3,2,'#2a0b09');for(let i=0;i<9;i++)T.r(69+i*2.4,top+2,1,cl((u-.2-i*.04)*40,0,20),i%2?'#8f2a24':'#6b2420');return;}
 if(type==='arrow'){if(st.part==='head')return;const d=(1-cl(u/.05))*70,y=Math.max(top+5,64);M.injuryShots?.woundOn?.(q,'arrow',{x:84,y},{x:0,y:1},12,u,st.g);for(let i=0;i<30;i++)T.r(85+i*1.7+d,y-i*1.1-d*.6,2,2,i<3?'#c2cbc0':i>25?(i%2?'#e8e2cc':'#b5402f'):'#7a5a34');return;}
 /* Kehle: Schnitt quer über den Hals im Stil der Verletzungs-Nahaufnahme, Biss mit Zahnspuren */const gy=Math.max(top+4,64);
 M.injuryShots?.woundOn?.(q,type==='maul'?'gut':'deepcut',{x:80,y:gy},{x:1,y:0},22,u,st.g,3);
 if(type==='maul')for(let i=0;i<5;i++){T.r(70+i*4.5,gy-4+(i%2)*7,3,2,'#3d0f0d');T.r(71+i*4.5,gy-4+(i%2)*7,1,1,'#e6cfc0');}
 for(let i=0;i<10;i++){const L=cl((u-.1-i*.05)*30,0,30);T.r(70+i*2,gy+3,i%2?2:1,L,i%3?'#8f2a24':'#a8372f');}}
// am Kopf (Kopfkoordinaten): tödliche Wunde im Stil der Nahaufnahmen, dazu Blut, das übers Gesicht läuft
function headWound(q,T,st){const {type,u,g,seed}=st,W=(kind,x,y,dir,w,s=0)=>M.injuryShots?.woundOn?.(q,kind,{x,y},dir,w,u,g,s);
 if(type==='skull'){/* Schädelbruch wie in der Verletzungs-Nahaufnahme, auf die Schädeldecke gesetzt */q.save();q.translate(0,-18);W('skullfracture',80,37,{x:0,y:1},20);q.restore();
  for(let i=0;i<7;i++){const L=cl((u-.08-hash(seed+i)*.5)*(18+hash(seed+i*5)*22),0,26+hash(seed+i*7)*26),x0=66+hash(seed+i*2)*28,wd=hash(seed+i*6)<.35?2:1;for(let y=0;y<L;y++)T.r(x0+Math.sin((y+i*3)*.22)*1.2,24+y,wd,1,i%3?'#a8372f':'#7d1e18');if(L>4)T.r(x0+Math.sin((L+i*3)*.22)*1.2,24+L,wd+1,2,'#8f2a24');}
  T.r(70,46,1,cl((u-.3)*10,0,10),'#8f2a24');T.r(90,46,1,cl((u-.4)*10,0,10),'#8f2a24');return;}
 if(type==='arrow'&&st.part==='head'){W('arrow',72,40,{x:0,y:1},10);const d=(1-cl(u/.05))*70;for(let i=0;i<32;i++)T.r(71-i*1.7-d,38-i*1.1-d*.6,2,2,i<3?'#c2cbc0':i>27?(i%2?'#e8e2cc':'#b5402f'):'#7a5a34');for(let i=0;i<4;i++)T.r(70+i,42,1,cl((u-.06-i*.05)*24,0,24),'#a8372f');}
 if(type==='maul'){W('deepcut',70,50,{x:.3,y:.95},12,5);}
 // Blut aus Mund (und bei Kopfverletzung aus der Nase)
 const mouth={heart:1,generic:.7,gut:1.3,ground:1,throat:.7,maul:.8,arrow:.6,bisect:.8,bleed:.4}[type]||0;
 if(mouth){for(let i=0;i<4;i++){const L=cl((u-.15-i*.12)*14*mouth,0,14*mouth);T.r(76+i*2.6,58,i%2?1:2,L,i%2?'#8f2a24':'#a8372f');}T.r(75,57,10,1,'#6b2420');}
 // vorhandene Kopfverletzung aus dem Kampf ist auch zu sehen
 const inj=g?.body?.head?.injury,helm=st.m&&st.m.a<.9;if(inj&&!helm&&type!=='skull'&&type!=='decap'){const kd=M.injuryShots?.kindOf?.(inj);if(kd&&kd!=='skullfracture'&&kd!=='concussion')W(kd,90,26,{x:.3,y:.95},12,7);}}
// Luft: Fontäne aus dem Stumpf, Stöße aus der Kehle, Blut gehustet, Knochensplitter
function air(ctx,T,st){const {type,u,opts,seed}=st,s=T.s,sink=opts.sink||0,put=(x,y,w,h,c,a)=>{const p=T.to(x,y);ctx.globalAlpha=a??1;ctx.fillStyle=c;ctx.fillRect(Math.round(p.x),Math.round(p.y),Math.max(1,Math.round(w*s)),Math.max(1,Math.round(h*s)));ctx.globalAlpha=1;},
 Bp=(bx,by)=>({x:bx-80-(st.ya||0),y:by-70-sink});
 if(type==='decap'&&u>.14){const o0=Bp(80,70),k=Math.exp(-u/4.5),pulse=.5+.5*Math.max(0,Math.sin(u*10.5));
  for(let i=0;i<70;i++){const v=((u*1.7+i/70)%1),side=hash(seed+i)-.5,h=v*95*pulse*k;put(o0.x+side*8+side*v*46*(.5+pulse),o0.y-2-h+v*v*85*k,i%4?1:2,i%4?1:2,i%3?'#a8372f':i%2?'#c9584a':'#8f2a24',1-v*.3);}}
 if((type==='throat'||type==='maul')&&u>0){const gy=Math.max(Math.min(72,62+sink)+4,64),o0=Bp(80,gy),k=Math.exp(-u/3.5),pulse=.45+.55*Math.max(0,Math.sin(u*9.5));
  for(let i=0;i<54;i++){const v=((u*1.5+i/54)%1),dir=hash(seed+i*2)<.65?1:-1;put(o0.x+dir*(3+v*(30+hash(seed+i)*24)*pulse*k),o0.y+1-v*10*pulse+v*v*34,i%3?1:2,i%3?1:2,i%2?'#a8372f':'#c9584a',1-v*.25);}}
 const cough={gut:1,heart:.6,generic:.5,ground:.6,bisect:.5}[type];if(cough&&u>.1){const m=headPt(st,80,58),n=Math.round(40*cough);for(let i=0;i<n;i++){const v=((u*1.2+i/n)%1),c=Math.max(0,Math.sin(u*(type==='gut'?6.5:4.5)))*cough;put(m.x+(hash(seed+i)-.5)*6+(hash(seed+i*3)-.5)*v*48*c,m.y+v*14-v*14*c+v*v*24,i%3?1:2,i%3?1:2,i%2?'#a8372f':'#8f2a24',1-v*.4);}}
 if(type==='skull'&&u<.7){const p=headPt(st,80,16),v=u/.7;for(let i=0;i<30;i++){const a=hash(seed+i*9)*6.283;put(p.x+Math.cos(a)*v*(40+hash(seed+i)*40),p.y+Math.sin(a)*v*30-v*24+v*v*40,hash(seed+i*3)<.3?2:1,hash(seed+i*3)<.3?2:1,i%4?'#a8372f':i%3?'#e6dcc2':'#d9a0a0',1-v*.6);}}}
// nach jeder Nahaufnahme: Blut auf der Linse der Nahaufnahme; geborgte Gesichtszeichnung zurückgeben
function shotDone(g,w,h,o,k,t,kind){const id=o?.g?.id;if(id!=null&&ovSaved.has(id)){const prev=ovSaved.get(id);if(prev)M.faceOverlays[id]=prev;else delete M.faceOverlays[id];ovSaved.delete(id);}
 if(!api.active||!api.lens||k<0)return;let amount=0;if(kind==='death'){amount=(TYPES[shotType(o)]||TYPES.generic).lens;}else return;/* Verletzungen: Linsenblut in injury-shots.js */if(amount<=0)return;
 const seed=sh((o.g?.id??3)+'|'+(o.part||'')+'|'+kind),list=[],n=1+Math.round(amount*3);for(let i=0;i<n;i++){const a=amount*(.6+hash(seed+i)*.6);list.push({born:(i?.04*i:0),life:99,amount:a,...makeSplat(seed+i*17,a,.12+hash(seed+i*2.2)*.76,.1+hash(seed+i*4.4)*.55)});}
 const L=lensSurface(w,h,Math.max(2,Math.round(Math.min(w,h)/200)));paintSplats(L.q,L.W,L.H,list,k);g.save();g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;g.drawImage(L.c,0,0,w,h);g.restore();}
// Verletzungs-Nahaufnahmen: zusätzliches Blut im kleinen Pixelbild (Spritzer, Stöße aus der Wunde, Rinnsale)
const GORE={scrape:.1,cut:.35,deepcut:.8,stab:.4,deepstab:.8,arrow:.5,sinew:.5,gut:1,pierce:.9,crush:.3,skullfracture:.7,fracture:.25,badfracture:.55,shatter:.75,pulp:1,sever:1};
function gore(T,V,k,C,kind,o,t){return;/* Blut, Pumpen und Linse macht injury-shots.js jetzt selbst (auch im Spiel) */
 /* alt: nur feine Spritzer um schwere Wunden; Rinnsale und Stöße zeichnen die Wundmaler selbst */if(!api.active||k<0)return;const I=GORE[kind]||0;if(I<.35||!V?.A)return;const A=V.A,seed=sh(kind+(o.part||'')+(o.g?.id||''));
 const n=Math.round(6+I*18),p=cl(k/.1);for(let i=0;i<n;i++){const a=-2.6+hash(seed+i)*2.2+(hash(seed+i*5)<.3?3.1:0),d=(6+hash(seed+i*1.9)*26*I)*p,x=A.x+Math.cos(a)*d,y=A.y+Math.sin(a)*d*.75;const big=hash(seed+i*7)<.18;T.r(x,y,big?2:1,1,big?'#7a1712':'#8f1d16');if(big)T.r(x,y,1,1,'#b0372c');}}

// ---------------------------------------------------------------- Anschluss
const prevStep=M.effectsStep;if(typeof prevStep==='function')M.effectsStep=function(dt){const r=prevStep.apply(this,arguments);try{step(dt);}catch(e){if(!api.err){api.err=e;console.error(e);}}return r;};
Object.assign(api,{onDeath,fall,knee,busy,lensDraw,shot,shotDone,gore,splash,phase,classify,sitePoint,clearLens:()=>{lens.length=0;},get clock(){return clock;}});
M.deathFx=api;
})();
