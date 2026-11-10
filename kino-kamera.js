'use strict';
// =====================================================================================================
// KINO-KAMERA (Wunsch Thomas 10.11.2026): Der Kampf soll aussehen wie großes Kino. Nur Darstellung, ändert keinen
// Kampfwert, keine Würfel, kein Tempo. Gilt im Kampf-HUD (battle-hud.js, bis 40 Kämpfer).
//
// 1) Regie beim Folgen: Statt immer alle Kämpfer in ein Bild zu packen, sucht die Kamera den spannendsten Zweikampf
//    (wer gerade ausholt, taumelt, gepackt wird, schwer verletzt ist, Anführer) und geht nah heran. Ein Schnitt bleibt
//    mindestens 2,6 s stehen; nach rund 8 s im selben Zweikampf kommt kurz die Totale. Liegt der neue Zweikampf weit weg,
//    wird hart geschnitten statt quer übers Feld zu schwenken. Weiche, gedämpfte Kamerafahrt mit etwas Vorlauf in
//    Laufrichtung. Harte Treffer geben einen kurzen Zoom-Stoß.
// 2) Kino-Moment bei schweren Verletzungen und Toden (Nahaufnahmen, die den Kampf anhalten): geteiltes Bild auf dem Feld.
//    Eine Seite zeigt den Getroffenen und wer zuschlägt ganz groß und vollständig, in Zeitlupe (1/8), alle anderen Figuren
//    durchsichtig; die andere Seite die Nahaufnahme (dieselbe Zeichenfläche #bhShot, nur umgehängt). Breitwandbalken, Vignette, Blitz, schräge Trennkante in Teamfarbe, Namenseinblendung.
//    Statt Standbild läuft das Feld in Zeitlupe weiter (gleiche Schritte, gleiche Würfel). Nach dem Ende fährt die Kamera weich zurück.
// Abschalten: localStorage['mg-kino']='off' (dann wieder die bisherige Kamera und die Nahaufnahme in der Tafel).
// Anschlüsse: M.kinoCam.camera / M.kinoCam.follow werden von M.battleCamera (battle-hud.js) gefragt;
// M.injuryShots.config.onShot wird umhüllt.
// =====================================================================================================
(()=>{
const M=window.MG;if(!M||!M.injuryShots||!M.battleHud)return;const S=M.s,$=id=>document.getElementById(id),cl=(v,a,b)=>Math.max(a,Math.min(b,v));
let off=false;try{off=localStorage.getItem('mg-kino')==='off';}catch{}
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
// gedämpfte Feder (kritisch gedämpft): weich, ohne Überschwingen
function damp(cur,vel,to,time,dt){if(!(dt>0))return [cur,vel];const o=2/time,x=o*dt,e=1/(1+x+.48*x*x+.235*x*x*x),ch=cur-to,tmp=(vel+o*ch)*dt;return [to+(ch+tmp)*e,(vel-o*tmp)*e];}
const up=a=>!a.g.dead&&!a.down&&!a.surrendered;

// ---------------------------------------------------------------- 1) Regie beim Folgen
const F={battle:null,ok:false,x:0,y:0,z:1,vx:0,vy:0,vz:0,last:0,shot:'all',until:0,pair:null,duelSince:0,punch:0,taken:-1,cut:false,pc:null,lead:{x:0,y:0},reset:false};
function interest(a,b){if(a.rex)return 4;let s=1;if(a.wind>0||a.swing>0)s+=3;if(a.state==='charge')s+=1.5;if(a.stagger>0||a.fallTimer>0||a.kneeTimer>0)s+=2;if(a.grabbedBy||a.rearFinish||a.netTimer>0)s+=2.5;
 if(b.leaders&&(b.leaders[0]===a.id||b.leaders[1]===a.id))s+=1;try{s+=cl((100-M.health(a.g))/45,0,2.2);}catch{}return s;}
function bestPair(b,live){const byId=new Map(live.map(a=>[a.id,a]));let best=null,top=-1e9;
 for(const a of live){const t=byId.get(a.target);if(!t||t.team===a.team)continue;const d=Math.hypot(a.x-t.x,a.y-t.y);if(d>420)continue;
  const key=[String(a.id),String(t.id)].sort().join('|');let s=interest(a,b)+interest(t,b)-d/120;if(F.pair&&F.pair.key===key)s+=2.5;/* nicht flattern */if(s>top){top=s;best={a,t,key};}}
 return best;}
function box(list,pad,minW,minH,VG=1){let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const a of list){x0=Math.min(x0,a.x);x1=Math.max(x1,a.x);y0=Math.min(y0,a.y-55*VG);y1=Math.max(y1,a.y+20*VG);}
 return {cx:(x0+x1)/2,cy:(y0+y1)/2,bw:Math.max(minW,x1-x0+pad*2),bh:Math.max(minH,y1-y0+pad*2)};}
function follow(b,w,h,W,H,VG,live,prev,userZ){if(off||!live.length)return null;const now=performance.now();let dt=(now-F.last)/1000;F.last=now;if(!(dt>0)||dt>.25)dt=1/30;
 if(F.battle!==b.id){F.battle=b.id;F.ok=false;F.shot='all';F.until=0;F.pair=null;F.taken=-1;F.punch=0;F.pc=null;F.lead={x:0,y:0};}
 const still=b.paused||!!M.injuryShots.frozen||!!M.speechFreeze?.();if(still)dt=0;
 const base=Math.min(w/W,h/H),UP=M.arenaViewUp||0;
 /* harter Treffer: kurzer Zoom-Stoß */let tk=0;for(const a of b.actors)tk+=a.taken||0;if(F.taken>=0&&dt>0&&tk-F.taken>=10)F.punch=Math.min(.15,F.punch+(tk-F.taken)/120);F.taken=tk;F.punch*=Math.exp(-dt*5);
 /* Regie: Zweikampf oder Totale */const pair=live.length>2?bestPair(b,live):null,lost=F.shot==='duel'&&(!F.pair||!up(F.pair.a)||!up(F.pair.t));
 if(dt>0&&(now>=F.until||lost)){const long=F.shot==='duel'&&now-F.duelSince>8000,next=pair&&!long?'duel':'all',changed=next!==F.shot||(next==='duel'&&F.pair?.key!==pair.key);
  if(next==='duel'){if(F.shot!=='duel')F.duelSince=now;F.pair=pair;F.until=now+2600;}else{F.pair=null;F.until=now+(F.shot==='duel'?2400:1600);}
  if(changed){F.cut=true;F.pc=null;F.lead={x:0,y:0};}F.shot=next;}
 else if(F.shot==='duel'&&pair&&F.pair&&pair.key===F.pair.key)F.pair=pair;
 const duel=F.shot==='duel'&&F.pair,tight=duel||live.length<=2,list=duel?[F.pair.a,F.pair.t]:live,/* große Arena: Figuren doppelt so groß, Ränder mitwachsen */fr=box(list,tight?70:90,tight?230:260,tight?175:190);
 const cap=tight?2.7*VG:(VG>1?1.9:2.1),z=userZ||Math.max(1,Math.min(cap,Math.min(w/fr.bw,h/fr.bh)/base)),vw=w/(base*z),vh=h/(base*z);
 /* Vorlauf in Laufrichtung (geglättet, höchstens 50) */if(dt>0){if(F.pc){const k=Math.min(1,dt*3),vx=(fr.cx-F.pc.x)/dt,vy=(fr.cy-F.pc.y)/dt;F.lead.x+=(cl(vx*.3,-50,50)-F.lead.x)*k;F.lead.y+=(cl(vy*.2,-30,30)-F.lead.y)*k;}F.pc={x:fr.cx,y:fr.cy};}
 const cx=fr.cx+F.lead.x,cy=fr.cy+F.lead.y,tx=vw>=W?W/2:cl(cx,vw/2,W-vw/2),ty=vh>=H?H/2-UP:cl(cy,vh/2-UP,H-vh/2);
 if(!F.ok||F.reset){const p=prev||{x:tx,y:ty,zoom:z};F.x=p.x;F.y=p.y;F.z=p.zoom/(1+F.punch);F.vx=F.vy=F.vz=0;F.ok=true;F.reset=false;}
 if(F.cut){F.cut=false;/* weit weg: harter Schnitt wie im Film, nah: weiter fahren */if(Math.hypot(tx-F.x,ty-F.y)>vw*.85){F.x=tx;F.y=ty;F.z=z;F.vx=F.vy=F.vz=0;}}
 [F.x,F.vx]=damp(F.x,F.vx,tx,tight?.42:.6,dt);[F.y,F.vy]=damp(F.y,F.vy,ty,tight?.42:.6,dt);[F.z,F.vz]=damp(F.z,F.vz,z,z<F.z?.5:.9,dt);
 return {x:F.x,y:F.y,zoom:F.z*(1+F.punch)};}

// ---------------------------------------------------------------- 2) Kino-Moment: geteiltes Bild
const K={on:false,a:null,o:null,set:[],t0:0,from:null,mode:'side',el:null,raf:0};
const css=`#kinoSplit{position:fixed;z-index:30;pointer-events:none;overflow:hidden;display:none;--bar:8%}
#kinoSplit.on{display:block}
#kinoSplit .ks-vig{position:absolute;inset:0;opacity:0;transition:opacity .4s;background:radial-gradient(ellipse 60% 75% at var(--fx,25%) var(--fy,50%),rgba(0,0,0,0) 40%,rgba(6,3,2,.62) 100%)}
#kinoSplit .ks-bar{position:absolute;left:0;right:0;height:var(--bar);background:#030202;z-index:4;transition:transform .38s cubic-bezier(.2,.8,.2,1)}
#kinoSplit .ks-bar.top{top:0;transform:translateY(-101%)}#kinoSplit .ks-bar.bot{bottom:0;transform:translateY(101%)}
#kinoSplit .ks-pane{position:absolute;pointer-events:auto;overflow:hidden;background:#120c09;opacity:0;z-index:2;transition:transform .45s cubic-bezier(.2,.8,.2,1) .08s,opacity .25s .08s}
#kinoSplit.side .ks-pane{top:var(--bar);bottom:var(--bar);right:0;width:52%;clip-path:polygon(16% 0,100% 0,100% 100%,0 100%);transform:translateX(40%)}
#kinoSplit.stack .ks-pane{left:0;right:0;bottom:var(--bar);height:calc(50% - var(--bar) + 6%);clip-path:polygon(0 0,100% 16%,100% 100%,0 100%);transform:translateY(40%)}
#kinoSplit .ks-pane #bhShot{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
#kinoSplit .ks-edge{position:absolute;width:3px;z-index:3;opacity:0;transform-origin:50% 0;transition:opacity .3s .3s;box-shadow:0 0 8px 1px currentColor}
#kinoSplit .ks-name{position:absolute;left:3%;z-index:3;display:grid;gap:1px;padding:4px 10px 5px 8px;background:linear-gradient(90deg,rgba(5,3,2,.82),rgba(5,3,2,.55) 70%,rgba(5,3,2,0));border-left:4px solid var(--tc,#e0b565);font-family:'Courier Prime',monospace;color:#f1e6c8;opacity:0;transform:translateX(-24px);transition:opacity .3s .35s,transform .45s cubic-bezier(.2,.8,.2,1) .35s;max-width:44%}
#kinoSplit.side .ks-name{bottom:calc(var(--bar) + 8px)}#kinoSplit.stack .ks-name{top:calc(var(--bar) + 8px);max-width:80%}
#kinoSplit .ks-name b{font-size:clamp(12px,3.4vw,19px);letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--tc,#f4d37a);text-shadow:0 1px 0 #000}
#kinoSplit .ks-name i{font-style:normal;font-size:clamp(9px,2.4vw,12px);letter-spacing:.08em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#e6bf99}
#kinoSplit .ks-flash{position:absolute;inset:0;background:#fff6dc;opacity:0;z-index:5}
#kinoSplit .ks-flash.go{animation:ksFlash .34s ease-out}
@keyframes ksFlash{0%{opacity:.6}100%{opacity:0}}
#kinoSplit.in .ks-bar{transform:none}#kinoSplit.in .ks-vig,#kinoSplit.in .ks-pane,#kinoSplit.in .ks-edge,#kinoSplit.in .ks-name{opacity:1;transform:none}
#kinoSplit.in .ks-edge{transform:rotate(var(--ea,0deg))}
body.kino-split.bhud-shot #arenaCanvas{filter:none}
body.kino-split .bh-stage.on .bh-log{display:block}`;
function overlay(){if(K.el?.isConnected)return K.el;const st=document.createElement('style');st.id='kinoStyle';st.textContent=css;document.head.appendChild(st);
 const el=document.createElement('div');el.id='kinoSplit';el.innerHTML='<div class="ks-vig"></div><div class="ks-pane"></div><div class="ks-edge"></div><div class="ks-name"><b></b><i></i></div><div class="ks-bar top"></div><div class="ks-bar bot"></div><div class="ks-flash"></div>';
 document.body.appendChild(el);K.el=el;return el;}
function place(r){const el=K.el,s=el.style,v=[Math.round(r.left)+'px',Math.round(r.top)+'px',Math.round(r.width)+'px',Math.round(r.height)+'px'];if(s.left!==v[0])s.left=v[0];if(s.top!==v[1])s.top=v[1];if(s.width!==v[2])s.width=v[2];if(s.height!==v[3])s.height=v[3];}
/* schräge Trennkante: liegt genau auf der schrägen Seite der Nahaufnahme */
function edge(r){const e=K.el.querySelector('.ks-edge'),bar=r.height*.08;let p0,p1;
 if(K.mode==='side'){const pw=r.width*.52,ph=r.height-2*bar;p0={x:r.width-pw+pw*.16,y:bar};p1={x:r.width-pw,y:bar+ph};}
 else{const ph=r.height*(.5+.06)-bar,top=r.height-bar-ph;p0={x:0,y:top};p1={x:r.width,y:top+ph*.16};}
 /* senkrechter Strich, um seine Oberkante gedreht: Richtung (dx,dy) ⇒ Winkel atan2(−dx,dy) */const dx=p1.x-p0.x,dy=p1.y-p0.y;
 Object.assign(e.style,{left:(p0.x-1.5)+'px',top:p0.y+'px',height:Math.hypot(dx,dy)+'px'});e.style.setProperty('--ea',(Math.atan2(-dx,dy)*180/Math.PI).toFixed(2)+'deg');}
function begin(o){const b=S.battle,a=b?.actors.find(x=>x.g===o.g),field=$('arenaCanvas'),c=$('bhShot');if(!a||!field||!c)return;const r=field.getBoundingClientRect();if(r.width<160||r.height<100)return;
 const el=overlay();K.mode=r.width>=r.height*.8?'side':'stack';/* nebeneinander, solange das Feld nicht deutlich hochkant ist */el.className='on '+K.mode;place(r);
 const pane=el.querySelector('.ks-pane'),pw=K.mode==='side'?r.width*.52:r.width,ph=K.mode==='side'?r.height*.84:r.height*(.5+.06)-r.height*.08;pane.appendChild(c);c.width=660;c.height=Math.max(240,Math.round(660*ph/Math.max(1,pw)));
 const tc=a.team?'#f08a80':'#7cc4f0';el.style.setProperty('--tc',tc);el.style.setProperty('--fx',K.mode==='side'?'25%':'50%');el.style.setProperty('--fy',K.mode==='side'?'50%':'27%');el.querySelector('.ks-edge').style.background=tc;el.querySelector('.ks-edge').style.color=tc;edge(r);
 el.querySelector('.ks-name b').textContent=o.g.name||'';el.querySelector('.ks-name i').textContent=(o.kind==='death'?'† gefallen':String(o.title||'')).toUpperCase();
 const fl=el.querySelector('.ks-flash');fl.classList.remove('go');void fl.offsetWidth;fl.classList.add('go');
 const v=M.arenaView;K.from=v?{x:v.cx,y:v.cy,zoom:v.scale/Math.min(v.width/v.W,v.height/v.H)}:null;K.a=a;K.o=o;K.set=subjects(b,a);K.t0=performance.now();K.on=true;document.body.classList.add('kino-split');
 requestAnimationFrame(()=>{if(K.on)el.classList.add('in');});cancelAnimationFrame(K.raf);K.raf=requestAnimationFrame(watch);}
function end(){if(!K.on)return;K.on=false;cancelAnimationFrame(K.raf);const el=K.el,c=el?.querySelector('#bhShot'),stage=$('bhStage');
 if(c){if(stage&&!stage.querySelector('#bhShot'))stage.insertBefore(c,$('bhLog'));else c.remove();}
 if(el)el.className='';document.body.classList.remove('kino-split');K.a=K.o=null;K.set=[];F.reset=true;/* Regie fährt vom großen Bild weich zurück */}
function watch(){if(!K.on)return;const b=S.battle,view=$('battleView'),field=$('arenaCanvas');if(!b||!view||view.hidden||!field||!M.injuryShots.arena||!document.body.classList.contains('bhud')){end();return;}
 place(field.getBoundingClientRect());K.raf=requestAnimationFrame(watch);}
/* Kamera für den Kino-Moment (Thomas 10.11., 2. Fassung): Getroffener und wer zuschlägt groß und ganz im Bild, in ihrer Bildhälfte
   eingepasst (nichts abgeschnitten), 0,5 s Fahrt hinein, danach folgt sie ihnen weich in der Zeitlupe. */
const SLOW=1/8,FADE=.3;
function subjects(b,a){const near=(x,r)=>Math.hypot(x.x-a.x,x.y-a.y)<r,list=[a],add=x=>{if(x&&x!==a&&!list.includes(x)&&list.length<3)list.push(x);};
 add(b.actors.find(x=>x.id===a.lastAttackerId&&near(x,300)));for(const x of b.actors)if(x.target===a.id&&x.team!==a.team&&!x.g.dead&&(x.wind>0||x.swing>0||x.grabbing||x.rearFinish)&&near(x,140))add(x);return list;}
function fit(b,w,h,W,H){const base=Math.min(w/W,h/H),side=K.mode==='side';/* Figuren sind auch in der großen Arena gleich groß (gemessen) */let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
 for(const a of K.set){const lying=a.g.dead||a.down||a.fallTimer>0;/* Liegende sind lang, erhobene Waffen hoch: großzügig, damit nichts abgeschnitten wird */x0=Math.min(x0,a.x-(lying?64:38));x1=Math.max(x1,a.x+(lying?64:38));y0=Math.min(y0,a.y-(lying?40:82));y1=Math.max(y1,a.y+16);}
 const pad=8,bw=x1-x0+pad*2,bh=y1-y0+pad*2,cx=(x0+x1)/2,cy=(y0+y1)/2;
 /* freie Fläche für die Figuren in Bildpunkten und ihr Mittelpunkt auf dem Bildschirm *//* Platz für Breitwandbalken und Namensschild lassen */const aw=side?w*.44:w*.92,ah=side?h*.62:h*.3,sx=side?w*.235:w/2,sy=side?h*.44:h*.32;
 const z=cl(Math.min(aw/(base*bw),ah/(base*bh)),1,14),s=base*z;return {x:cx+(w/2-sx)/s,y:cy+(h/2-sy)/s,zoom:z};}
function camera(b,w,h,W,H){if(!K.on||off||!K.a||!b.actors.includes(K.a))return null;const tg=fit(b,w,h,W,H),t=performance.now()-K.t0,p=ease(cl(t/500,0,1)),f=K.from||{x:W/2,y:H/2,zoom:1};
 return {x:f.x+(tg.x-f.x)*p,y:f.y+(tg.y-f.y)*p,zoom:f.zoom*Math.pow(tg.zoom/f.zoom,p)};}
/* Unbeteiligte werden in 0,3 s angenehm durchsichtig */
function alpha(a){if(!K.on||K.set.includes(a))return 1;const p=cl((performance.now()-K.t0)/(FADE*1000),0,1);return 1-.68*p;}

const cfg=M.injuryShots.config,shown=cfg.onShot;
cfg.onShot=function(on,o,live){const r=shown?.apply(this,arguments);try{if(on&&!live&&o&&!off&&cfg.host?.())begin(o);else end();}catch(e){console.warn('Kino-Kamera',e);end();}return r;};
M.kinoCam={camera,follow,alpha,/* Zeitlupe statt Stillstand während des Kino-Moments (injury-shots.js, arena.js) */get slow(){return K.on&&!off?SLOW:0;},get on(){return K.on;},get subjects(){return K.set.map(a=>a.id);},get off(){return off;},set off(v){off=!!v;if(off)end();try{localStorage.setItem('mg-kino',off?'off':'on');}catch{}},state:()=>({shot:F.shot,pair:F.pair?.key||null,punch:+F.punch.toFixed(3),split:K.on?K.mode:null})};
})();
