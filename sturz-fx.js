'use strict';
// =====================================================================================================
// STURZ · AUFSTEHEN · TAUMELN (sturz-fx.js, M.fallFx) – Wunsch Thomas 11.11.: Hinfallen und Aufstehen waren
// abgehackt (die Figur kippte als starres Brett in 0,3 s um bzw. lag sofort), beim Taumeln stand der ganze
// Körper schräg. Hier laufen die Bewegungen über Schlüsselbilder mit weichem Verlauf:
//  · Sturz nach hinten: Oberkörper wird zurückgeworfen, Stolperschritt, Knie geben nach, er setzt sich hin,
//    fängt sich mit den Händen ab, rollt auf den Rücken, Beine schlagen hoch, Kopf schlägt nach.
//  · Sturz nach vorn: Vorlage, Stolperschritt, Knie schlagen auf, Hände fangen ab, Brust setzt auf, rutscht aus.
//  · Aufstehen aus Rücken- und Bauchlage: aufstützen, aufsetzen bzw. hochdrücken, ein Knie, Hand aufs Knie,
//    hochstemmen, aufrichten. Bei „hält sich auf dem Knie“ (riseHold) bleibt er im Kniestand und atmet.
//  · Kampfunfähig/Tod aus dem Stand oder Knien: gleicher Ablauf, schlaff (ohne Abfangen).
//  · Taumeln: Füße und Becken bleiben unter dem Körper, der Oberkörper pendelt über der Hüfte, weiche Knie,
//    Kopf hängt nach, Arme halten das Gleichgewicht – kein schräg stehendes Brett mehr.
// Reine Darstellung: keine Würfel, keine Werte, keine Zeiten des Kampfes geändert, kein Speichern.
// Anschlüsse (ohne dieses Modul wirkungslos): arena.js drawGladiatorBody (pose/lift/tilt/tx/lean/leg/hands),
// Zwischenspeicher der Figuren (busy), sim.js down() → onDown.
// Im Spiel geladen (boot.js, nach todes-fx) seit 11.11. (Freigabe Thomas); außerdem im Sturz-Editor (sturz-editor.html).
// Notausschalter ohne neue Veröffentlichung: localStorage['mg-sturz-fx']='off' → bisherige Bewegungen.
// =====================================================================================================
(()=>{
const M=window.MG;if(!M)return;
const cl=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),sm=v=>{v=cl(v);return v*v*(3-2*v);},mix=(a,b,k)=>a+(b-a)*k;
const LIE=1.35,LTX=12,LTY=5,HIP=30,LEG=16,ARM=27;
// Kanäle eines Schlüsselbilds (alles im Bild der Figur: x nach vorn, y nach unten, Boden bei 0):
// 0 Becken x · 1 Becken y · 2 Neigung · 3 Vorlage Brust · 4/5 Kopf · 6/7 Fuß hinten (l) · 8/9 Fuß vorn (r)
// 10/11 Waffenhand · 12/13 andere Hand · 14/15 Fußwinkel l/r · 16 Waffenwinkel
const N=17;
let off=false;try{off=localStorage.getItem('mg-sturz-fx')==='off';}catch{}
const F=M.fallFx={active:!off,get on(){return this.active;},
 P:{fall:.9,down:1,deathMin:.6,blendIn:.2,blendOut:.14,holdFall:.5,holdRise:.5}};

// ---------------------------------------------------------------- Rechnen
function xfOf(px,py,t){const s=Math.sin(t),c=Math.cos(t);return {tx:px-HIP*s,ty:py+HIP*c,c,s,t};}
const toW=(X,x,y)=>[X.tx+X.c*x-X.s*y,X.ty+X.s*x+X.c*y];
const toB=(X,x,y)=>{const dx=x-X.tx,dy=y-X.ty;return [X.c*dx+X.s*dy,-X.s*dx+X.c*dy];};
// o: l Vorlage · h Kopf · fL/fR Füße · hM/hO Hände · fa Fußwinkel · wa Waffenwinkel. Punkte [x,y] im Bild, [x,y,1] am Körper
function key(p,P,t,o){const X=xfOf(P[0],P[1],t),pt=v=>v[2]?toW(X,v[0],v[1]):v,fL=pt(o.fL),fR=pt(o.fR),hM=pt(o.hM),hO=pt(o.hO),
  auto=(f,src)=>src[2]||f[1]<-2.5?t:0,fa=o.fa||[auto(fL,o.fL),auto(fR,o.fR)];
 return {p,v:[P[0],P[1],t,o.l||0,o.h?o.h[0]:0,o.h?o.h[1]:0,fL[0],fL[1],fR[0],fR[1],hM[0],hM[1],hO[0],hO[1],fa[0],fa[1],o.wa??.1]};}
// weicher Verlauf durch alle Schlüsselbilder (Hermite, Steigung begrenzt: liegt ein Wert in zwei Bildern gleich, bleibt er dazwischen stehen)
function finish(K,startFast){for(let i=0;i<K.length;i++){const k=K[i];k.m=new Array(N).fill(0);
  if(i===0){if(startFast){const b=K[1];for(let c=0;c<N;c++)k.m[c]=(b.v[c]-k.v[c])/(b.p-k.p);}continue;}if(i===K.length-1)continue;
  const a=K[i-1],b=K[i+1],h0=k.p-a.p,h1=b.p-k.p;for(let c=0;c<N;c++){const d0=(k.v[c]-a.v[c])/h0,d1=(b.v[c]-k.v[c])/h1;if(d0*d1<=0)continue;const m=(b.v[c]-a.v[c])/(b.p-a.p),lim=3*Math.min(Math.abs(d0),Math.abs(d1));k.m[c]=Math.sign(m)*Math.min(Math.abs(m),lim);}}
 return K;}
function evalClip(K,p,out){let i=0;while(i<K.length-2&&p>K[i+1].p)i++;const a=K[i],b=K[i+1],h=b.p-a.p,u=cl((p-a.p)/h),u2=u*u,u3=u2*u,h00=2*u3-3*u2+1,h10=u3-2*u2+u,h01=-2*u3+3*u2,h11=u3-u2;
 for(let c=0;c<N;c++)out[c]=h00*a.v[c]+h10*h*a.m[c]+h01*b.v[c]+h11*h*b.m[c];return out;}
function solve(root,tx,ty,bend){const dx=tx-root.x,dy=ty-root.y,d=cl(Math.hypot(dx,dy),.01,LEG*2-.05),a=Math.atan2(dy,dx),th=Math.acos(cl(d/(2*LEG),-1,1));return {x:root.x+Math.cos(a+th*bend)*LEG,y:root.y+Math.sin(a+th*bend)*LEG};}

// ---------------------------------------------------------------- Schlüsselbilder
const lieP=t=>[LTX+HIP*Math.sin(t),LTY-HIP*Math.cos(t)];
// Liegen wie bisher (arena.js): Beine leicht angezogen, eine Hand an der Wunde
const LIE_LIMBS={fL:[-10,0,1],fR:[12,-2,1],hM:[2,-35,1],hO:[-17,-26,1]};
const lieKey=(p,t)=>key(p,lieP(t),t,{...LIE_LIMBS,fa:[t,t]});
const STAND={fL:[-13,0],fR:[14,0],hM:[16,-42,1],hO:[-9,-40,1],wa:-.6};
// Knien wie bisher (kneeDrop): Knie vorn am Boden, Füße hinten
const KNEEL={fL:[-18,0],fR:[-6,0],hM:[16,-29,1],hO:[-4,-28,1],wa:.6};

function fallBack(lie,knee){const t=-lie,K=[];
 if(knee){K.push(key(0,[0,-11],-.12,KNEEL),
   key(.26,[-6,-9.5],-.5,{l:-2,h:[1,0],fL:[-18,0],fR:[-6,0],hM:[21,-56,1],hO:[-11,-59,1],wa:-1.2}),
   key(.46,[-13,-6.5],-.82,{h:[3,1.5],fL:[-17,-1],fR:[-3,-2],hM:[-30,-9],hO:[-44,1],wa:-.3}));}
 else{K.push(key(0,[0,-30],-.04,{l:-1,...STAND}),
   // Oberkörper wird zurückgeworfen, vorderer Fuß löst sich, Arme fliegen hoch
   key(.11,[-3,-29.5],-.2,{l:-3,h:[-1.5,.5],fL:[-13,0],fR:[9,-3.5],hM:[23,-52,1],hO:[13,-57,1],wa:-.9}),
   // Stolperschritt nach hinten, Arme rudern
   key(.24,[-9,-26.5],-.36,{l:-3,h:[1,0],fL:[-15,0],fR:[-1,0],hM:[23,-58,1],hO:[-13,-61,1],wa:-1.15}),
   // Knie geben nach, er setzt sich, Hände greifen nach hinten zum Boden
   key(.37,[-17,-17],-.5,{l:-2,h:[2.5,1],fL:[-15,0],fR:[-1,0],hM:[-30,-14],hO:[-40,-8],wa:-.3}),
   // Gesäß setzt auf, Hände fangen ab, Kinn zur Brust
   key(.49,[-19,-7],-.66,{h:[3,1.5],fL:[-13,-1],fR:[2,-2],hM:[-32,-4],hO:[-46,0],wa:0}));}
 K.push(// rollt auf den Rücken, Ellbogen knicken weg, Beine schlagen hoch
   key(.63,[-18,-3.5],-1.08,{h:[2.5,1],fL:[-2,-9],fR:[12,-15],hM:[-18,-30],hO:[-52,1],wa:-1.9}),
   // liegt flach, schlägt etwas über, Kopf schlägt nach, Beine fallen
   key(.78,[lieP(t)[0]-.2,lieP(t)[1]-.3],t-.08,{h:[-3,0],fL:[9,-6],fR:[21,-10],hM:[-23,-13],hO:[-50,8],wa:-2}),
   lieKey(1,t));
 return finish(K,true);}

function fallFront(lie,knee){const t=lie,K=[];
 if(knee){K.push(key(0,[0,-11],.16,KNEEL),
   key(.26,[9,-10.5],.7,{l:2,h:[-1,0],fL:[-17,-1],fR:[-5,-1],hM:[40,-4],hO:[29,-10],wa:.2}),
   key(.44,[20,-8],1.02,{l:1,h:[-2.5,-.5],fL:[-12,-3],fR:[-2,-3],hM:[44,0],hO:[34,-1],wa:.3}));}
 else{K.push(key(0,[0,-30],.04,{l:1,...STAND}),
   // Vorlage, Arme schießen nach vorn
   key(.11,[3,-29.5],.2,{l:3,h:[1.5,1],fL:[-13,0],fR:[14,0],hM:[24,-48,1],hO:[16,-44,1],wa:-.2}),
   // kleiner Stolperschritt, Hände suchen den Boden
   key(.24,[9,-26],.4,{l:4,h:[1,1.5],fL:[-9,-1],fR:[16,0],hM:[40,-22],hO:[27,-28],wa:.1}),
   // Knie schlagen auf, Hände fast am Boden, Kopf hoch
   key(.37,[18,-16],.66,{l:3,h:[-1,0],fL:[0,-1],fR:[12,-1],hM:[54,-2],hO:[40,-14],wa:.2}),
   // Hände klatschen auf, Ellbogen fangen ab, Unterschenkel heben sich
   key(.49,[28,-9],1,{l:2,h:[-2.5,-.5],fL:[-3,-3],fR:[8,-4],hM:[56,0],hO:[46,-1],wa:.3}));}
 K.push(// Brust setzt auf, er rutscht aus, Füße schlagen hoch
   key(.63,[38,-3.5],1.3,{h:[-1,0],fL:[-8,-2,1],fR:[-5,-9,1],hM:[20,-56,1],hO:[8,-69,1],wa:.4}),
   // liegt, Gesicht schlägt auf
   key(.78,[lieP(t)[0]+.2,lieP(t)[1]+.2],t+.07,{h:[1,2],fL:[-9,-1,1],fR:[4,-4,1],hM:[18,-52,1],hO:[4,-67,1],wa:.4}),
   lieKey(1,t));
 return finish(K,true);}

function riseBack(lie){const t=-lie;return finish([
 lieKey(0,t),
 // regt sich: Kopf hebt, Ferse zieht an, Hand sucht Halt
 key(.13,[lieP(t)[0],lieP(t)[1]-.4],t+.1,{h:[3,1],fL:[-9,-3,1],fR:[14,-11,1],hM:[11,-31,1],hO:[-15,-31,1]}),
 // halb aufgesetzt, hinten aufgestützt
 key(.28,[-16,-5],-.8,{h:[3,1.5],fL:[-2,1],fR:[6,0],hM:[-6,-14],hO:[-40,2]}),
 // sitzt vorgebeugt, hinteres Bein unter den Körper, Hand greift zur Waffe am Boden
 key(.42,[-13,-7],-.2,{l:2,h:[2,2],fL:[-24,0],fR:[8,0],hM:[-8,-1],hO:[-26,1],wa:.3}),
 // ein Knie am Boden, vorderer Fuß steht, Hand aufs Knie
 key(.54,[-5,-17],.22,{l:3,h:[1,2.5],fL:[-22,-1],fR:[10,0],hM:[17,-17],hO:[-10,-14],wa:.9}),
 // stemmt sich hoch
 key(.68,[-2,-23],.3,{l:3,h:[1,1.5],fL:[-17,0],fR:[11,0],hM:[15,-21],hO:[-8,-22],wa:.7}),
 key(.84,[0,-28],.13,{l:1,fL:[-13,0],fR:[13,0],hM:[17,-40,1],hO:[-8,-39,1],wa:-.3}),
 key(1,[0,-30],0,STAND)],false);}

function riseFront(lie){const t=lie;return finish([
 lieKey(0,t),
 // Hände neben die Schultern, Kopf hebt
 key(.13,[lieP(t)[0]-.3,lieP(t)[1]-.4],t-.05,{h:[-2,-1],fL:[-9,-1,1],fR:[10,-3,1],hM:[22,-50,1],hO:[20,-62,1]}),
 // drückt sich hoch
 key(.28,[38,-7],1.02,{h:[-2.5,-1],fL:[6,0],fR:[12,2],hM:[62,2],hO:[52,1]}),
 // schiebt die Hüfte zurück auf die Knie
 key(.42,[25,-14],.78,{h:[-1,0],fL:[4,0],fR:[14,1],hM:[58,1],hO:[42,-8],wa:.3}),
 // ein Knie am Boden, vorderer Fuß steht, Hand aufs Knie
 key(.54,[10,-17],.25,{l:3,h:[1,2.5],fL:[-6,-1],fR:[24,0],hM:[31,-17],hO:[6,-14],wa:.9}),
 // stemmt sich hoch
 key(.68,[5,-23],.3,{l:3,h:[1,1.5],fL:[-8,0],fR:[24,0],hM:[26,-19],hO:[4,-22],wa:.7}),
 key(.84,[1,-28],.13,{l:1,fL:[-12,0],fR:[18,0],hM:[17,-40,1],hO:[-8,-39,1],wa:-.3}),
 key(1,[0,-30],0,STAND)],false);}

const clips=new Map();
function clip(kind,dir,lie,knee){const id=kind+(dir>0?'f':'b')+(knee?'k':'s')+lie.toFixed(2);let K=clips.get(id);
 if(!K){K=kind==='rise'?(dir>0?riseFront(lie):riseBack(lie)):(dir>0?fallFront(lie,knee):fallBack(lie,knee));clips.set(id,K);}return K;}

// ---------------------------------------------------------------- Uhr für „kampfunfähig“ (zwischen Kampfschritten weich)
const ck={b:null,last:0,prev:0,wall:0,gap:16};
function now(){const b=M.s?.battle;if(!b)return 0;const w=typeof performance!=='undefined'?performance.now():0;
 if(ck.b!==b.id){ck.b=b.id;ck.last=ck.prev=b.time;ck.wall=w;ck.gap=16;}
 else if(b.time!==ck.last){ck.gap=cl(w-ck.wall,4,400);ck.prev=b.time<ck.last?b.time:ck.last;ck.last=b.time;ck.wall=w;}
 if(b.paused)return ck.last;return mix(ck.prev,ck.last,cl((w-ck.wall)/ck.gap));}
// sim.js down(): steht/kniet er noch, wird der Niedergang gezeigt
function onDown(a){if(!F.active||!a)return;const b=M.s?.battle,t=b?.time||0;let from='stand',el=0;
 if(a.fallTimer>0){const rise=a.riseDuration||1.25;if(a.fallTimer<rise)from='stand';else{el=(a.fallDuration||2.1)-a.fallTimer;from=el<F.P.fall?'fall':'lie';}}
 else if(a.kneeTimer>0)from='knee';else if(a.state==='crawl')from='lie';
 a.fxDown={t:t-(from==='fall'?el:0),from,len:from==='fall'?F.P.fall:F.P.down};}

// ---------------------------------------------------------------- gemerkte Liegehaltung (für den nahtlosen Beginn des Aufstehens)
const lying=new WeakMap();
const cacheFx={C:true,T:null,S:false,hx:0,hy:0,sh:1,hold:false,a:null,time:0,
 lift:v=>v,tilt:v=>v,tx:v=>v,
 lean(v){rec(this).lean=v;return v;},
 leg(side,hip,foot,knee,ft){const r=rec(this);r[side]={fx:foot.x,fy:foot.y,kx:knee.x,ky:knee.y,ft};return ft;},
 hands(m,o,wa){const r=rec(this);r.m={x:m.x,y:m.y};r.o={x:o.x,y:o.y};r.wa=wa;return null;}};
// ohne gemerkte Haltung (z. B. Wiederholung): das Liegen wie in arena.js
const LIE_START={lean:null,l:{fx:-10,fy:0,kx:-9,ky:-18.2,ft:0},r:{fx:12,fy:-2,kx:17,ky:-13.2,ft:0},m:{x:2,y:-35},o:{x:-17,y:-26}};
function rec(fx){let r=lying.get(fx.a);if(!r){r={};lying.set(fx.a,r);}r.time=fx.time;return r;}

// ---------------------------------------------------------------- Haltung aus einem Ablauf
const buf=new Array(N);
function clipFx(a,K,p,time,o){const v=evalClip(K,cl(p),buf).slice(),X=xfOf(v[0],v[1],v[2]);
 // w: Anteil der bisherigen Haltung (am Ende des Sturzes das Liegen, am Ende des Aufstehens das Stehen)
 const w=o.end?sm((p-(1-F.P.blendOut))/F.P.blendOut):0,start=o.start||null,sk=start?1-sm(p/F.P.blendIn):0,b=a.g.body;
 if(o.breath){v[1]+=Math.sin(time*3.4+(a.seed||0))*.7*o.breath;v[5]+=Math.sin(time*3.4+(a.seed||0)-.6)*.8*o.breath;}
 if(o.limp){/* schlaff: kein Abfangen, die Arme schleifen nach */const k=sm(p*1.6),q=sm((p-.45)/.4),hm=toW(X,mix(mix(16,21,k),6,q),mix(mix(-40,-35,k),-40,q)),ho=toW(X,mix(mix(-9,-15,k),-17,q),mix(mix(-38,-55,k),-30,q));v[10]=hm[0];v[11]=hm[1];v[12]=ho[0];v[13]=ho[1];v[5]+=2*k*(1-q);v[16]=mix(v[16],X.t+1.1,k);}
 return {T:X,S:false,C:false,w,hx:v[4]*(1-w),hy:v[5]*(1-w),sh:cl(Math.abs(v[2])/1.1),hold:o.hold,
  lift:l=>mix(X.ty,l,w),tilt:t=>mix(X.t,t,w),tx:x=>mix(X.tx,x,w),
  lean:l=>mix(sk>0&&start.lean!=null?mix(v[3],start.lean,sk):v[3],l,w),
  leg(side,hip,foot,knee,ft){const L=side==='l',f=toB(X,L?v[6]:v[8],L?v[7]:v[9]);let fx=f[0],fy=f[1],dx=fx-hip.x,dy=fy-hip.y,d=Math.hypot(dx,dy);if(d>LEG*2-.6){const s=(LEG*2-.6)/d;fx=hip.x+dx*s;fy=hip.y+dy*s;}
   let kn=solve(hip,fx,fy,-1),kx=kn.x,ky=kn.y,fa=(L?v[14]:v[15])-X.t;
   if(sk>0){const c=start[side];if(c){fx=mix(fx,c.fx,sk);fy=mix(fy,c.fy,sk);kx=mix(kx,c.kx,sk);ky=mix(ky,c.ky,sk);fa=mix(fa,c.ft,sk);}}
   foot.x=mix(fx,foot.x,w);foot.y=mix(fy,foot.y,w);knee.x=mix(kx,knee.x,w);knee.y=mix(ky,knee.y,w);return mix(fa,ft,w);},
  hands(m,o2,wa,sh){const out={m,o:o2,a:wa};
   for(const [side,i,cur,key2] of [['r',10,m,'m'],['l',12,o2,'o']]){if(b[side+'ua']?.fracture||b[side+'fa']?.fracture)continue;const h=toB(X,v[i],v[i+1]);let x=h[0],y=h[1];
    if(sk>0&&start[key2]){x=mix(x,start[key2].x,sk);y=mix(y,start[key2].y,sk);}
    const r=sh[side],dx=x-r.x,dy=y-r.y,d=Math.hypot(dx,dy);if(d>ARM){x=r.x+dx/d*ARM;y=r.y+dy/d*ARM;}out[key2]={x:mix(x,cur.x,w),y:mix(y,cur.y,w)};}
   const want=v[16]-X.t,dd=Math.atan2(Math.sin(wa-want),Math.cos(wa-want));out.a=want+dd*w;return out;}};}

// ---------------------------------------------------------------- Taumeln
// Schrittfolge: Im Kampf (sim.js) rückt der Taumelnde nur im Moment des Schritts vor (Stoß ~ |sin(phase)|^1,6, zwei Stöße je Umlauf).
// Die Beine folgen genau diesem Weg: das Standbein bleibt auf seinem Fleck am Boden, das andere setzt um die Schrittlänge nach.
// Vorher liefen die Beine einen gleichmäßigen Gang gegen eine ruckweise Bewegung – die Füße rutschten und zitterten (Thomas 11.11.).
const BURST=(()=>{const n=64,t=[0];for(let i=1;i<=n;i++)t.push(t[i-1]+Math.pow(Math.sin((i-.5)/n*Math.PI),1.6)*Math.PI/n);return {n,t,sum:t[n]};})();
function burstPart(ph){const u=cl(ph/Math.PI)*BURST.n,i=Math.min(BURST.n-1,Math.floor(u));return mix(BURST.t[i],BURST.t[i+1],u-i)/BURST.sum;}
function stagFx(a,time,stK,dz){const env=Math.min(1.3,stK*(.75+dz*.5)+Math.max(0,dz-.25)*.35),t=time+(a.staggerSeed||a.seed||0),
  s1=Math.sin(t*3.1),s2=Math.sin(t*1.7+1.3),s3=Math.sin(t*3.1-.9),s4=Math.sin(t*1.7+.5),hk=Math.min(1,stK*1.6),
  free=hk>.05&&!(a.wind>0)&&!(a.swing>0)&&!(a.kneeTimer>0),b=a.g.body;
 const lean=env*(s1*6+s2*2.6),dl=env*(2+(.5-.5*Math.cos(t*3.4+2.6))*1.4),dt=env*(s1*.04+s2*.02);let L=0,TL=0;
 // Schritt: Länge aus dem Weg eines Stoßes, Richtung aus Stoß- gegen Blickrichtung
 const T=M.T||{},g=a.g,sc=(g.height||180)/180*1.14*cl(.85+(g.weight||80)/420,.98,1.18)*(g.statureWide||1)*(a.renderScale||1),rate=(T.stagStepRate||3.6)+dz*(T.stagStepDaze||2.2),
  fwd=Math.cos(a.staggerDir??0)*(Math.cos(a.a||0)>=0?1:-1),
  /* Thomas 11.11.: Die Beine wackelten hin und her – die Schrittlänge kam aus moveSpeed (im Kampf mindestens 26, auch wenn er kaum vorrückt), die Füße
     pendelten also weiter, als der Körper sich bewegte. Jetzt aus dem wirklichen Tempo des Taumelns (wie sim.js). Und langsamer: ein Schritt je ganzem
     Umlauf (beide Stöße) statt je Stoß – ein Fuß wird ruhig neben den anderen gesetzt, dann der andere nachgezogen. */
  sp=((T.stagSpeedBase??16)+dz*(T.stagSpeedDaze??14))*(.3+.7*stK),
  S=cl(sp*(T.stagBurst||1.9)*BURST.sum/rate/sc,0,11)*cl(fwd*1.4,-1,1),turn=(a.phase||0)/(2*Math.PI),ph=(turn-Math.floor(turn))*2*Math.PI,half=ph>=Math.PI?1:0,
  c=(half+burstPart(ph-half*Math.PI))/2,u=ph/(2*Math.PI),odd=Math.floor(turn)%2!==0,lk=stK>0?sm(stK*5):0;
 return {T:null,S:true,C:false,hx:env*s3*2.6,hy:env*(1+Math.abs(s3)*1.5),sh:0,hold:true,
  lift:l=>(L=l+dl),tilt:v=>(TL=v+dt),tx:x=>x,lean:l=>l+lean,
  leg(side,hip,foot,knee,ft){if(!(lk>0))return ft;const r=side==='r',step=r===!odd,home=r?8:-8,
    wx=home+2*S*(step?sm(u)-.5:.5-c),wy=step?-Math.sin(Math.PI*sm(u))*Math.min(3,.8+Math.abs(S)*.35):0,
    co=Math.cos(TL),si=Math.sin(TL),dy=wy-L,fx=co*wx+si*dy,fy=-si*wx+co*dy,kn=solve(hip,fx,fy,-1);
   foot.x=mix(foot.x,fx,lk);foot.y=mix(foot.y,fy,lk);knee.x=mix(knee.x,kn.x,lk);knee.y=mix(knee.y,kn.y,lk);return mix(ft,-TL+(step?-.14*Math.sin(Math.PI*sm(u))*Math.sign(S||1):0),lk);},
  /* Arme zum Ausgleich: breit und auf halber Höhe, gegen die Vorlage – wer nach vorn kippt, nimmt die Arme zurück */
  hands(m,o,wa,sh){if(!free)return null;const out={m,o,a:wa+s3*.18*hk};
   if(!(b.rua?.fracture||b.rfa?.fracture))out.m={x:mix(m.x,sh.r.x+13-s1*4.5-lean*.35,hk),y:mix(m.y,sh.r.y+11-s4*3.5,hk)};
   if(!(b.lua?.fracture||b.lfa?.fracture))out.o={x:mix(o.x,sh.l.x-11-s1*4.5-lean*.35,hk),y:mix(o.y,sh.l.y+9+s4*3.5,hk)};return out;}};}

// ---------------------------------------------------------------- Welcher Ablauf läuft gerade?
// Tod (todes-fx.js): wie lange er steht/kniet, bestimmt die Todesart; ab dem Fallen läuft der Ablauf hier (eigene Uhr ab dem ersten Bild des Fallens)
function deathU(a){const DF=M.deathFx;if(!DF?.on||!DF.rec)return null;const r=DF.rec.get(a.id);if(!r||r.wasDown||!r.ph)return null;const P=r.P,fa=P.fall||0;if(!fa||r.ph.stand||r.ph.kneel)return null;
 const t=now();if(r.fxT0==null||t<r.fxT0)r.fxT0=t;const p=(t-r.fxT0)/Math.max(fa,F.P.deathMin);return p<1?{p,knee:!!P.knee}:null;}
function state(a){// → null | {kind:'fall'|'rise'|'lie'|'stag', …}
 const g=a.g;if(a.fallFxOff||a.rex||a.hahn||a.lion||a.draggedBy||a.grabbedBy||a.splitPiece||g.bisected||a.neckFinishTimer>0||a.finishReaction!==undefined||a.rearFinish||a.state==='crawl')return null;
 if(g.dead){const u=deathU(a);return u?{kind:'fall',p:u.p,knee:u.knee,limp:true}:null;}
 if(a.down){const d=a.fxDown;if(!d||d.from==='lie')return null;const p=(now()-d.t)/d.len;return p>=0&&p<1?{kind:'fall',p,knee:d.from==='knee',limp:true}:null;}
 if(a.fallTimer>0){const rise=a.riseDuration||1.25;
  if(a.fallTimer<rise||a.state==='rising')return {kind:'rise',p:cl(1-a.fallTimer/rise),hold:a.riseHold>0};
  const el=(a.fallDuration||2.1)-a.fallTimer,D=Math.min(F.P.fall,Math.max(.3,((a.fallDuration||2.1)-rise)*.9));
  return el<D?{kind:'fall',p:el/D}:{kind:'lie'};}
 if(a.state==='fallen')return {kind:'lie'};
 if(a.kneeTimer>0)return null;
 const stK=a.stagger>0?cl(a.stagger/(a.staggerMax||.6)):0,dz=a.daze||0;
 return stK>0||dz>.25?{kind:'stag',stK,dz}:null;}
function pose(a,time){if(!F.active)return null;const st=state(a);if(!st)return null;
 if(st.kind==='stag')return stagFx(a,time,st.stK,st.dz);
 if(st.kind==='lie'){cacheFx.a=a;cacheFx.time=time;return cacheFx;}
 const dir=(a.fallSide||-1)>0?1:-1,lie=a.agony?.lie||LIE;
 if(st.kind==='fall')return clipFx(a,clip('fall',dir,lie,st.knee),st.p,time,{end:true,limp:st.limp,hold:!a.g.dead&&st.p<F.P.holdFall});
 const c=lying.get(a),fresh=c&&Math.abs(time-c.time)<3&&c.m&&c.l&&c.r?c:LIE_START;
 return clipFx(a,clip('rise',dir,lie,false),st.p,time,{end:true,start:fresh,hold:st.p>=F.P.holdRise,breath:st.hold?1:0});}
// Figur bewegt sich gerade über einen Ablauf: nicht aus dem Zwischenspeicher kopieren, jedes Bild zeichnen
function busy(a){if(!F.active||!a?.g)return false;const st=state(a);return !!st&&(st.kind==='fall'||st.kind==='rise');}

Object.assign(F,{pose,busy,onDown,state,clip,evalClip,N});
})();
