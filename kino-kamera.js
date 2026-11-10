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
let begin=function(o){const b=S.battle,a=b?.actors.find(x=>x.g===o.g),field=$('arenaCanvas'),c=$('bhShot');if(!a||!field||!c)return;const r=field.getBoundingClientRect();if(r.width<160||r.height<100)return;
 const el=overlay();K.mode=r.width>=r.height*.8?'side':'stack';/* nebeneinander, solange das Feld nicht deutlich hochkant ist */el.className='on '+K.mode;place(r);
 const pane=el.querySelector('.ks-pane'),pw=K.mode==='side'?r.width*.52:r.width,ph=K.mode==='side'?r.height*.84:r.height*(.5+.06)-r.height*.08;pane.appendChild(c);c.width=660;c.height=Math.max(240,Math.round(660*ph/Math.max(1,pw)));
 const tc=a.team?'#f08a80':'#7cc4f0';el.style.setProperty('--tc',tc);el.style.setProperty('--fx',K.mode==='side'?'25%':'50%');el.style.setProperty('--fy',K.mode==='side'?'50%':'27%');el.querySelector('.ks-edge').style.background=tc;el.querySelector('.ks-edge').style.color=tc;edge(r);
 el.querySelector('.ks-name b').textContent=o.g.name||'';el.querySelector('.ks-name i').textContent=(o.kind==='death'?'† gefallen':String(o.title||'')).toUpperCase();
 const fl=el.querySelector('.ks-flash');fl.classList.remove('go');void fl.offsetWidth;fl.classList.add('go');
 const v=M.arenaView;K.from=v?{x:v.cx,y:v.cy,zoom:v.scale/Math.min(v.width/v.W,v.height/v.H)}:null;K.a=a;K.o=o;K.set=subjectsLook(b,a,o);K.t0=performance.now();K.on=true;document.body.classList.add('kino-split');
 requestAnimationFrame(()=>{if(K.on)el.classList.add('in');});cancelAnimationFrame(K.raf);K.raf=requestAnimationFrame(watch);}
let end=function(){if(!K.on)return;K.on=false;cancelAnimationFrame(K.raf);const el=K.el,c=el?.querySelector('#bhShot'),stage=$('bhStage');
 if(c){if(stage&&!stage.querySelector('#bhShot'))stage.insertBefore(c,$('bhLog'));else c.remove();}
 if(el)el.className='';document.body.classList.remove('kino-split');K.a=K.o=null;K.set=[];F.reset=true;/* Regie fährt vom großen Bild weich zurück */}
let watch=function(){if(!K.on)return;const b=S.battle,view=$('battleView'),field=$('arenaCanvas');if(!b||!view||view.hidden||!field||!M.injuryShots.arena||!document.body.classList.contains('bhud')){end();return;}
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
let camera=function(b,w,h,W,H){if(!K.on||off||!K.a||!b.actors.includes(K.a))return null;const tg=fit(b,w,h,W,H),t=performance.now()-K.t0,p=ease(cl(t/500,0,1)),f=K.from||{x:W/2,y:H/2,zoom:1};
 return {x:f.x+(tg.x-f.x)*p,y:f.y+(tg.y-f.y)*p,zoom:f.zoom*Math.pow(tg.zoom/f.zoom,p)};}
/* Unbeteiligte werden in 0,3 s angenehm durchsichtig */
let alpha=function(a){if(!K.on||K.set.includes(a))return 1;const p=cl((performance.now()-K.t0)/(FADE*1000),0,1);return 1-.68*p;}

// ---------------------------------------------------------------- 3) Kino-Look wählbar (Thomas 10.11., 3. Fassung, kino-editor.html)
// Wunsch: Wer den Schaden zufügt und wer ihn empfängt immer groß in Nahaufnahme, der Rest ausgeblendet, gern schwarzer Hintergrund,
// große Aufnahme, Nahaufnahme im Takt dazu. Mehrere Möglichkeiten zum Anschauen im Editor; gespeichert in localStorage['mg-kino-look'].
// layout 'alt' = bisherige Darstellung (oben, unverändert, Standard). Alle anderen: „Filmbild“ – das Kampfbild wird in eine eigene
// Bildfläche kopiert, die wie die Nahaufnahme frei angeordnet werden kann (Kampffeld oder ganzer Bildschirm).
const LOOK0={layout:'alt',frame:'feld',bg:'arena',others:.32,who:'gruppe',fill:.8,slow:8,sync:'frei',grade:'normal',bars:8};
const PRESETS={
 bisher:{name:'Bisher',look:{...LOOK0}},
 buehne:{name:'Schwarze Bühne',look:{layout:'split',frame:'schirm',bg:'schwarz',others:0,who:'paar',fill:.84,slow:8,sync:'gemeinsam',grade:'normal',bars:9}},
 spot:{name:'Scheinwerfer',look:{layout:'split',frame:'schirm',bg:'spot',others:0,who:'paar',fill:.8,slow:8,sync:'gemeinsam',grade:'warm',bars:9}},
 leinwand:{name:'Großleinwand + Bild im Bild',look:{layout:'pip',frame:'schirm',bg:'schwarz',others:0,who:'paar',fill:.86,slow:8,sync:'gemeinsam',grade:'normal',bars:7}},
 wunde:{name:'Wunde groß, Kämpfer klein',look:{layout:'piprev',frame:'schirm',bg:'schwarz',others:0,who:'paar',fill:.84,slow:8,sync:'gemeinsam',grade:'normal',bars:7}},
 schnitt:{name:'Schnittfolge',look:{layout:'cut',frame:'schirm',bg:'schwarz',others:0,who:'paar',fill:.86,slow:16,sync:'gemeinsam',grade:'rot',bars:12}},
 dunkel:{name:'Feld abgedunkelt',look:{layout:'split',frame:'feld',bg:'dunkel',others:.12,who:'paar',fill:.8,slow:8,sync:'gemeinsam',grade:'normal',bars:8}}};
let look={...LOOK0};try{const j=JSON.parse(localStorage.getItem('mg-kino-look')||'null');if(j&&typeof j==='object')look={...LOOK0,...j};}catch{}
const film=()=>look.layout!=='alt';
const GRADE={normal:'none',warm:'sepia(.25) saturate(1.15) contrast(1.06)',kalt:'saturate(.7) hue-rotate(-12deg) contrast(1.1) brightness(.95)',rot:'sepia(.35) saturate(1.5) hue-rotate(-18deg) contrast(1.12)',blass:'saturate(.35) contrast(1.15)'};
const FM={el:null,A:null,ga:null,B:null,who:null,rects:null,shotKey:'',phase:-1,step:null,beatT:0};
const fcss=`#kinoFilm{position:fixed;z-index:30;pointer-events:none;overflow:hidden;display:none;background:#000}
#kinoFilm.on{display:block}
#kinoFilm .kf-pane{position:absolute;overflow:hidden;transition:opacity .18s}
#kinoFilm .kf-a canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}
#kinoFilm .kf-b{pointer-events:auto;background:#0b0705}
#kinoFilm .kf-b #bhShot{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
#kinoFilm .kf-b.inset{outline:2px solid var(--tc,#e0b565);box-shadow:0 0 0 1px #000,0 6px 24px #000}
#kinoFilm .kf-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 70% 80% at 50% 50%,rgba(0,0,0,0) 45%,rgba(0,0,0,.7) 100%)}
#kinoFilm .kf-beat{position:absolute;inset:0;pointer-events:none;opacity:0;box-shadow:inset 0 0 70px 10px rgba(170,10,0,.75)}
#kinoFilm.beat .kf-beat{animation:kfBeat .9s ease-out infinite}
@keyframes kfBeat{0%{opacity:0}8%{opacity:.85}22%{opacity:.25}30%{opacity:.6}100%{opacity:0}}
#kinoFilm .kf-bar{position:absolute;left:0;right:0;background:#000;z-index:6;transition:transform .38s cubic-bezier(.2,.8,.2,1)}
#kinoFilm .kf-bar.top{top:0;transform:translateY(-101%)}#kinoFilm .kf-bar.bot{bottom:0;transform:translateY(101%)}
#kinoFilm.in .kf-bar{transform:none}
#kinoFilm .kf-edge{position:absolute;z-index:4;pointer-events:none;background:var(--tc,#e0b565);box-shadow:0 0 10px 1px var(--tc,#e0b565);transform-origin:0 0}
#kinoFilm .kf-who{position:absolute;z-index:5;display:flex;align-items:center;gap:.5em;padding:4px 12px 5px 10px;font-family:'Courier Prime',monospace;font-weight:bold;letter-spacing:.12em;text-transform:uppercase;font-size:clamp(11px,2.2vw,20px);color:#f1e6c8;background:linear-gradient(90deg,rgba(0,0,0,.85),rgba(0,0,0,.4) 75%,rgba(0,0,0,0));text-shadow:0 1px 0 #000;opacity:0;transform:translateX(-20px);transition:opacity .3s .3s,transform .45s cubic-bezier(.2,.8,.2,1) .3s;white-space:nowrap}
#kinoFilm.in .kf-who{opacity:1;transform:none}
#kinoFilm .kf-who .t0{color:#7cc4f0}#kinoFilm .kf-who .t1{color:#f08a80}#kinoFilm .kf-who em{font-style:normal;color:#e6bf99;font-size:.8em;letter-spacing:.06em}
#kinoFilm .kf-flash{position:absolute;inset:0;background:#fff6dc;opacity:0;z-index:7;pointer-events:none}
#kinoFilm .kf-flash.go{animation:ksFlash .3s ease-out}
#kinoFilm.shake{animation:kfShake .34s linear}
@keyframes kfShake{0%,100%{transform:none}20%{transform:translate(-7px,4px)}40%{transform:translate(6px,-5px)}60%{transform:translate(-4px,3px)}80%{transform:translate(3px,-2px)}}
@keyframes ksFlash{0%{opacity:.6}100%{opacity:0}}`;
function filmEl(){if(FM.el?.isConnected)return FM.el;if(!$('kinoFilmStyle')){const st=document.createElement('style');st.id='kinoFilmStyle';st.textContent=fcss;document.head.appendChild(st);}
 const el=document.createElement('div');el.id='kinoFilm';el.innerHTML='<div class="kf-pane kf-a"><canvas></canvas><div class="kf-vig"></div><div class="kf-beat"></div></div><div class="kf-pane kf-b"><div class="kf-beat"></div></div><div class="kf-edge"></div><div class="kf-who"></div><div class="kf-bar top"></div><div class="kf-bar bot"></div><div class="kf-flash"></div>';
 document.body.appendChild(el);FM.el=el;FM.A=el.querySelector('.kf-a');FM.ca=FM.A.querySelector('canvas');FM.ga=FM.ca.getContext('2d');FM.B=el.querySelector('.kf-b');FM.who=el.querySelector('.kf-who');return el;}
const CUT1=1.25,CUT2=2.85;/* Schnittfolge: Kämpfer allein → Nahaufnahme allein → beide */
function filmRoot(){const f=$('arenaCanvas');return look.frame==='schirm'?{left:0,top:0,width:innerWidth,height:innerHeight}:f.getBoundingClientRect();}
/* Lage der beiden Bilder im Overlay (Bildpunkte), abhängig von Aufteilung, Ausrichtung und (Schnittfolge) Zeit */
function rects(W,H,t){const bar=Math.round(H*(look.bars||0)/100),side=W>=H*.8,full={x:0,y:bar,w:W,h:H-2*bar},none={x:0,y:0,w:0,h:0,hide:true};let L=look.layout;
 if(L==='cut'){if(t<CUT1)return {A:full,B:{...none},phase:0};if(t<CUT2)return {A:{...full,hide:true},B:full,phase:1};L='split';}
 if(L==='pip'||L==='piprev'){const iw=Math.round(side?W*.4:W*.62),ih=Math.round(iw*.64),m=Math.round(Math.min(W,H)*.03),ins={x:W-iw-m,y:H-bar-ih-m,w:iw,h:ih,inset:true};
  /* Kämpfer klein oben rechts: dort verdeckt das Bild weder Namen noch Unterzeile der Nahaufnahme */return L==='pip'?{A:full,B:ins,phase:2}:{A:{...ins,y:bar+m},B:full,phase:2};}
 if(side){const wa=Math.round(W*.54);return {A:{x:0,y:bar,w:wa,h:H-2*bar},B:{x:Math.round(W*.46),y:bar,w:W-Math.round(W*.46),h:H-2*bar,clip:'polygon(15% 0,100% 0,100% 100%,0 100%)',e:[[W*.46+(W-W*.46)*.15,bar],[W*.46,H-bar]]},phase:2};}
 const ha=Math.round((H-2*bar)*.5),yb=bar+Math.round((H-2*bar)*.44);return {A:{x:0,y:bar,w:W,h:ha},B:{x:0,y:yb,w:W,h:H-bar-yb,clip:'polygon(0 12%,100% 0,100% 100%,0 100%)',e:[[0,yb+(H-bar-yb)*.12],[W,yb]]},phase:2};}
function setPane(el,r){const s=el.style;s.left=r.x+'px';s.top=r.y+'px';s.width=r.w+'px';s.height=r.h+'px';s.opacity=r.hide?'0':'1';s.clipPath=r.clip||'none';el.classList.toggle('inset',!!r.inset);}
function filmLayout(now){const el=FM.el,R=filmRoot(),W=Math.round(R.width),H=Math.round(R.height),s=el.style;s.left=Math.round(R.left)+'px';s.top=Math.round(R.top)+'px';s.width=W+'px';s.height=H+'px';
 const t=(now-K.t0)/1000,r=rects(W,H,t);FM.rects=r;setPane(FM.A,r.A);setPane(FM.B,r.B);FM.A.style.zIndex=r.A.inset?3:1;FM.B.style.zIndex=r.B.inset?3:2;
 const bar=Math.round(H*(look.bars||0)/100);for(const b of el.querySelectorAll('.kf-bar'))b.style.height=bar+'px';
 /* Trennkante in Teamfarbe genau auf der schrägen Seite */const e=el.querySelector('.kf-edge');if(r.B.e&&!r.B.hide){const [[x0,y0],[x1,y1]]=r.B.e,len=Math.hypot(x1-x0,y1-y0);Object.assign(e.style,{display:'block',left:x0+'px',top:y0+'px',width:len+'px',height:'3px',transform:'rotate('+Math.atan2(y1-y0,x1-x0)+'rad)'});}else e.style.display='none';
 /* Namen: wer zuschlägt → wer getroffen wird, unten links im Kämpferbild */const A=r.A;Object.assign(FM.who.style,{display:A.hide?'none':'flex',left:(A.x+Math.round(Math.min(W,H)*.025))+'px',top:(A.y+A.h-Math.round(Math.min(W,H)*.03)-FM.who.offsetHeight)+'px',fontSize:A.inset?'11px':''});
 /* Nahaufnahme: Zeichenfläche passend zum Bild */const B=r.B;if(!B.hide&&B.w>20&&B.h>20){const c=$('bhShot'),key=B.w+'x'+B.h;if(c&&FM.shotKey!==key){FM.shotKey=key;c.width=660;c.height=Math.max(160,Math.round(660*B.h/B.w));}}
 /* harter Schnitt: Blitz */if(r.phase!==FM.phase){if(FM.phase>=0&&look.layout==='cut')kick(look.sync==='gemeinsam');FM.phase=r.phase;}
 return r;}
function kick(shake){const el=FM.el,fl=el.querySelector('.kf-flash');fl.classList.remove('go');void fl.offsetWidth;fl.classList.add('go');if(shake){el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');}}
/* Kampfbild kopieren: Ausschnitt „füllend“ (cover), Pixel scharf */
function filmPaint(){const r=FM.rects,src=$('arenaCanvas');if(!r||r.A.hide||!src||!src.width)return;const A=r.A,c=FM.ca,dpr=Math.min(2,devicePixelRatio||1),cw=Math.max(1,Math.round(A.w*dpr)),ch=Math.max(1,Math.round(A.h*dpr));
 if(c.width!==cw||c.height!==ch){c.width=cw;c.height=ch;}const g=FM.ga,sw=src.width,sh=src.height,k=Math.max(cw/sw,ch/sh);g.imageSmoothingEnabled=false;g.fillStyle='#000';g.fillRect(0,0,cw,ch);g.drawImage(src,(cw-sw*k)/2,(ch-sh*k)/2,sw*k,sh*k);}
function filmBegin(o,a){const field=$('arenaCanvas'),c=$('bhShot');const el=filmEl();el.className='on';const tc=a.team?'#f08a80':'#7cc4f0';el.style.setProperty('--tc',tc);FM.shotKey='';FM.phase=-1;
 FM.B.appendChild(c);c.hidden=false;FM.ca.style.filter=GRADE[look.grade]||'none';FM.B.style.filter=look.grade==='blass'?GRADE.blass:'';
 const by=K.set.find(x=>x!==a),nm=x=>'<span class="t'+(x.team?1:0)+'">'+String(x.g.name||'').replace(/[<&]/g,'')+'</span>';
 FM.who.innerHTML=(by?nm(by)+' <em>⟶</em> ':'')+nm(a)+(o.kind==='death'?' <em>† gefallen</em>':'');
 K.t0=performance.now();filmLayout(K.t0);kick(look.sync==='gemeinsam');if(look.sync==='gemeinsam')el.classList.add('beat');
 requestAnimationFrame(()=>{if(K.on)el.classList.add('in');});}
function filmEnd(){const el=FM.el;if(el){el.className='';FM.ca&&(FM.ca.style.filter='');}FM.rects=null;}
/* Kamera im Filmbild: Beteiligte mittig und groß im sichtbaren Ausschnitt des Kämpferbildes */
function filmFit(b,w,h,W,H){const base=Math.min(w/W,h/H),R=filmRoot(),t=(performance.now()-K.t0)/1000,/* Schnittfolge: während die Nahaufnahme allein steht, schon auf das spätere geteilte Bild zielen */tt=look.layout==='cut'?(t<CUT1?0:CUT2+.01):t,rr=rects(Math.round(R.width),Math.round(R.height),tt),A=rr.A;
 /* Bild im Bild: die Kämpfer links neben die kleine Nahaufnahme setzen */const k=Math.max(A.w/w,A.h/h)||1,free=rr.B.inset?Math.max(A.w*.45,rr.B.x-A.x):A.w,vw=free/k,vh=A.h/k,dx=(A.w-free)/2/k;let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
 /* großzügig: erhobene Waffen, Schilde, Liegende reichen weit über den Standpunkt hinaus */for(const a of K.set){const lying=a.g.dead||a.down||a.fallTimer>0||a.kneeTimer>0;x0=Math.min(x0,a.x-(lying?74:44));x1=Math.max(x1,a.x+(lying?74:44));y0=Math.min(y0,a.y-(lying?48:98));y1=Math.max(y1,a.y+18);}
 const fill=cl(+look.fill||.8,.4,.97),z=cl(Math.min(vw*fill/(base*(x1-x0)),vh*fill*.92/(base*(y1-y0))),1,12),s=base*z;
 return {x:(x0+x1)/2+dx/s,y:(y0+y1)/2+vh*.03/s,zoom:z};}
/* Hintergrund unter den Figuren (Feldkoordinaten, vor den Figuren gezeichnet) */
function backdrop(g,b){if(!K.on||off||!film()||look.bg==='arena')return;const p=cl((performance.now()-K.t0)/350,0,1);g.save();
 if(look.bg==='spot'){let x=0,y=0;for(const a of K.set){x+=a.x;y+=a.y-30;}x/=K.set.length||1;y/=K.set.length||1;let r=60;for(const a of K.set)r=Math.max(r,Math.hypot(a.x-x,a.y-30-y)+70);
  const gr=g.createRadialGradient(x,y,r*.35,x,y,r*1.25);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(.6,'rgba(0,0,0,'+(.55*p)+')');gr.addColorStop(1,'rgba(0,0,0,'+p+')');g.fillStyle=gr;}
 else g.fillStyle=look.bg==='dunkel'?'rgba(0,0,0,'+(.72*p)+')':'rgba(0,0,0,'+p+')';
 g.fillRect(-6000,-6000,14000,14000);g.restore();}
{const ul=M.battleUnderlay;M.battleUnderlay=function(g,b){ul?.apply(this,arguments);try{backdrop(g,b);}catch(e){}};}
/* Wer im Bild ist: „paar“ = nur wer zuschlägt und wer getroffen wird (auch Schützen von weiter weg) */
/* Thomas 10.11.: immer genau der Verursacher aus der Nahaufnahme – nicht wer zwischendurch zuletzt getroffen hat */
function causer(b,a,o){const n=o?.byName;if(n){const x=b.actors.find(q=>q!==a&&q.g.name===n&&q.team!==a.team)||b.actors.find(q=>q!==a&&q.g.name===n);if(x)return x;}return b.actors.find(x=>x.id===a.lastAttackerId&&x!==a)||null;}
function subjectsLook(b,a,o){const by=causer(b,a,o);if(look.who!=='paar'){const l=subjects(b,a);if(by&&!l.includes(by)){l.splice(1,0,by);if(l.length>3)l.pop();}return l;}return by&&Math.hypot(by.x-a.x,by.y-a.y)<620?[a,by]:[a];}

// ---------------------------------------------------------------- 4) Kino-Ton (Thomas 10.11.: Verletzungsaufnahmen wie im Kino, Zeitlupe mit passenden Tönen)
// Bei jeder Nahaufnahme, die den Kampf anhält: Welt wird leiser (Musik und Kämpfer gedämpft), Sog in die Zeitlupe, tiefes Dröhnen,
// beim Treffer ein schwerer Schlag mit dem passenden Kampfgeräusch tief verlangsamt und ein Pfeifen im Ohr, dazu ein Herzschlag
// (im Takt des roten Pulses im Filmbild, 0,9 s); beim Tod wird er langsamer und setzt aus. Abschaltbar: localStorage['mg-kino-ton']='off'.
const T={on:false,shot:null,hit:false,nodes:[],duck:null,beat:0,raf:0,death:false,n:0};
let tonOff=false;try{tonOff=localStorage.getItem('mg-kino-ton')==='off';}catch{}
const A=()=>tonOff?null:M.audioEngine?.cine?.();
function env(c,g,at,a,peak,hold,rel){g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(peak,at+a);g.gain.setValueAtTime(peak,at+a+hold);g.gain.exponentialRampToValueAtTime(.0001,at+a+hold+rel);}
function osc(X,type,f0,f1,at,dur,vol,a=.005){const c=X.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f0,at);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,at+dur);env(c,g,at,a,vol,0,dur);o.connect(g);g.connect(X.master);o.start(at);o.stop(at+a+dur+.05);return o;}
function noise(X,at,dur,vol,type,f0,f1,q=1,a=.01){const c=X.ctx;if(!X.noise)return;const n=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();n.buffer=X.noise;n.loop=true;f.type=type;f.Q.value=q;f.frequency.setValueAtTime(f0,at);f.frequency.exponentialRampToValueAtTime(f1,at+dur);env(c,g,at,a,vol,0,dur);n.connect(f);f.connect(g);g.connect(X.master);n.start(at);n.stop(at+a+dur+.05);}
function duck(X,on){const t=X.ctx.currentTime,set=(bus,v)=>{if(!bus)return;bus.gain.cancelScheduledValues(t);bus.gain.setValueAtTime(bus.gain.value,t);bus.gain.linearRampToValueAtTime(v,t+(on?.25:.7));};
 if(on){if(!T.duck)T.duck={m:X.musicBus?.gain.value,f:X.fightBus?.gain.value,i:X.impactBus?.gain.value};set(X.musicBus,T.duck.m*.3);set(X.fightBus,T.duck.f*.3);set(X.impactBus,T.duck.i*.55);}
 else if(T.duck){set(X.musicBus,T.duck.m);set(X.fightBus,T.duck.f);set(X.impactBus,T.duck.i);T.duck=null;}}
function heart(X,at,vol){osc(X,'sine',62,40,at,.16,vol,.004);noise(X,at,.09,vol*.5,'lowpass',160,90);osc(X,'sine',58,38,at+.2,.14,vol*.65,.004);}
const LAYER={through:[['hitStab',1.5,.6],['backstab',1.1,.7]],pierce:[['hitStab',1.5,.62]],stab:[['hitStab',1.2,.65]],deepstab:[['hitStab',1.4,.62]],arrow:[['arrowBody',1.4,.65]],
 sever:[['sever',1.5,.6]],skullfracture:[['skullCrack',1.6,.6]],neckbreak:[['boneCrack',1.7,.55],['skullCrack',.9,.7]],ribs:[['boneCrack',1.4,.62]],ribseries:[['boneCrack',1.6,.58]],sternum:[['boneCrack',1.4,.6]],collarbone:[['boneCrack',1.4,.65]],pelvis:[['boneCrack',1.6,.55]],larynx:[['hitBlunt',1.4,.6]],
 fracture:[['boneCrack',1.4,.62]],badfracture:[['boneCrack',1.6,.58]],shatter:[['boneCrack',1.7,.55],['hitBlunt',1,.6]],pulp:[['hitBlunt',1.6,.55],['boneCrack',1.2,.6]],
 heart:[['hitStab',1.5,.6]],lung:[['hitStab',1.4,.62]],liver:[['hitStab',1.4,.62]],spleen:[['hitStab',1.4,.62]],kidney:[['backstab',1.3,.65]],gutted:[['hitBlade',1.5,.6],['sever',.8,.7]],
 cut:[['hitBlade',1.2,.68]],deepcut:[['hitBlade',1.5,.62]],gut:[['hitBlade',1.5,.62]],sinew:[['hitBlade',1.3,.65]]};
function tonStart(o){if(T.on)tonStop();const X=A();if(!X)return;T.on=true;T.hit=false;T.n++;T.death=o?.kind==='death';T.kind=o?.kind;const t=X.ctx.currentTime;duck(X,true);
 /* Sog in die Zeitlupe: Rauschen von tief nach hoch, darunter ein abfallender Ton */noise(X,t,.5,.22,'bandpass',260,2600,1.4,.3);osc(X,'sawtooth',220,70,t,.55,.035,.2);
 /* tiefes Dröhnen, hält bis zum Ende */const c=X.ctx,g=c.createGain(),f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=180;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.09,t+.6);for(const fr of [41,61.5]){const o2=c.createOscillator();o2.type='sine';o2.frequency.value=fr;o2.connect(f);o2.start(t);T.nodes.push(o2);}f.connect(g);g.connect(X.master);T.nodes.push({g});
 T.beat=t+.05;cancelAnimationFrame(T.raf);T.raf=requestAnimationFrame(tonTick);}
function tonHit(X){const t=X.ctx.currentTime;/* schwerer Schlag */osc(X,'sine',78,30,t,1.1,.5,.003);noise(X,t,.3,.35,'lowpass',420,90,.8,.003);
 for(const [k,vol,pitch] of LAYER[T.kind]||[['hitBlunt',1.2,.65]])M.audioEngine?.ksPlay?.(k,vol,pitch);
 /* Pfeifen im Ohr nach dem Treffer */if(T.kind!=='collapse')osc(X,'sine',2900,2750,t+.05,2.6,.022,.15);}
function tonTick(){if(!T.on)return;const X=A();if(!X){tonStop();return;}const sh=M.injuryShots.arena?.shot;
 if(sh&&!T.hit&&sh.hit){T.hit=true;tonHit(X);}
 /* Herzschlag im Takt (0,9 s); Tod: wird langsamer und setzt aus */const now=X.ctx.currentTime;if(now>=T.beat-.03){const i=Math.round((T.beat-(T.t0||T.beat))/.9);heart(X,Math.max(now,T.beat),T.death?.3*Math.max(0,1-i*.22):.28);T.t0??=T.beat;T.beat+=T.death?.9+i*.25:.9;if(T.death&&i>4)T.beat=1e9;}
 T.raf=requestAnimationFrame(tonTick);}
function tonStop(){if(!T.on)return;T.on=false;cancelAnimationFrame(T.raf);T.t0=null;const X=M.audioEngine?.cine?.();if(!X){T.nodes=[];T.duck=null;return;}const t=X.ctx.currentTime;
 for(const n of T.nodes){try{if(n.g){n.g.gain.cancelScheduledValues(t);n.g.gain.setValueAtTime(n.g.gain.value,t);n.g.gain.linearRampToValueAtTime(0,t+.5);}else n.stop(t+.55);}catch{}}T.nodes=[];
 /* zurück aus der Zeitlupe: kurzer Sog rückwärts */noise(X,t,.35,.12,'bandpass',2200,300,1.2,.02);duck(X,false);}

const cfg=M.injuryShots.config,shown=cfg.onShot;
const beginOld=begin;
begin=function(o){if(!film())return beginOld(o);const b=S.battle,a=b?.actors.find(x=>x.g===o.g),field=$('arenaCanvas'),c=$('bhShot');if(!a||!field||!c)return;const r=field.getBoundingClientRect();if(r.width<160||r.height<100)return;
 const v=M.arenaView;K.from=v?{x:v.cx,y:v.cy,zoom:v.scale/Math.min(v.width/v.W,v.height/v.H)}:null;K.a=a;K.o=o;K.set=subjectsLook(b,a,o);K.on=true;document.body.classList.add('kino-split');filmBegin(o,a);cancelAnimationFrame(K.raf);K.raf=requestAnimationFrame(watch);};
const endOld=end;
end=function(){if(!K.on||!FM.rects){endOld();if(FM.el?.classList.contains('on'))filmEnd();return;}
 const c=$('bhShot'),stage=$('bhStage');if(c&&FM.B.contains(c)){if(stage&&!stage.querySelector('#bhShot'))stage.insertBefore(c,$('bhLog'));else c.remove();}
 filmEnd();K.on=false;cancelAnimationFrame(K.raf);document.body.classList.remove('kino-split');K.a=K.o=null;K.set=[];F.reset=true;};
const watchOld=watch;
watch=function(){if(!K.on)return;if(!FM.rects)return watchOld();const b=S.battle,view=$('battleView'),field=$('arenaCanvas');if(!b||!view||view.hidden||!field||!M.injuryShots.arena||!document.body.classList.contains('bhud')){end();return;}
 /* Nahaufnahme im Takt: in der Schnittfolge wartet sie, bis sie ins Bild kommt (die Aufnahme entsteht erst nach dem Anschluss) */const sh=M.injuryShots.arena?.shot;if(sh&&!sh.kinoWrap){const step=sh.step;sh.kinoWrap=true;sh.step=function(dt){if(K.on&&FM.rects&&look.layout==='cut'&&(performance.now()-K.t0)/1000<CUT1)dt=0;return step.call(this,dt);};}
 filmLayout(performance.now());filmPaint();K.raf=requestAnimationFrame(watch);};
const cameraOld=camera;
camera=function(b,w,h,W,H){if(!film()||!FM.rects)return cameraOld(b,w,h,W,H);if(!K.on||off||!K.a||!b.actors.includes(K.a))return null;const tg=filmFit(b,w,h,W,H),t=performance.now()-K.t0,dur=look.sync==='gemeinsam'?650:500,p=ease(cl(t/dur,0,1)),f=K.from||{x:W/2,y:H/2,zoom:1};
 return {x:f.x+(tg.x-f.x)*p,y:f.y+(tg.y-f.y)*p,zoom:f.zoom*Math.pow(tg.zoom/f.zoom,p)};};
const alphaOld=alpha;
alpha=function(a){if(!film()||!K.on)return alphaOld(a);if(K.set.includes(a))return 1;const p=cl((performance.now()-K.t0)/(FADE*1000),0,1),o=cl(+look.others,0,1);return 1-(1-o)*p;};
cfg.onShot=function(on,o,live){const r=shown?.apply(this,arguments);try{if(on&&!live&&o&&!off&&cfg.host?.())begin(o);else end();}catch(e){console.warn('Kino-Kamera',e);end();}
 try{if(on&&!live&&o)tonStart(o);else if(!on||live)tonStop();}catch(e){console.warn('Kino-Ton',e);}return r;};
const slowOf=()=>{if(!K.on||off)return 0;if(!film())return SLOW;const n=+look.slow;return n>0?1/n:0;};
M.kinoCam={camera:(...x)=>camera(...x),follow,alpha:a=>alpha(a),/* Zeitlupe statt Stillstand während des Kino-Moments (injury-shots.js, arena.js) */get slow(){return slowOf();},get on(){return K.on;},get subjects(){return K.set.map(a=>a.id);},get off(){return off;},set off(v){off=!!v;if(off)end();try{localStorage.setItem('mg-kino',off?'off':'on');}catch{}},
 /* schwarzer Hintergrund: Hindernisse (arena.js) ausblenden */get hideScenery(){return K.on&&!off&&film()&&(look.bg==='schwarz'||look.bg==='spot');},
 /* Kino-Look (kino-editor.html) */presets:PRESETS,defaults:LOOK0,get look(){return {...look};},setLook(v,save){look={...LOOK0,...(v||{})};if(save)try{localStorage.setItem('mg-kino-look',JSON.stringify(look));}catch{}},
 /* Kino-Ton an/aus (kino-editor.html) */get sound(){return !tonOff;},set sound(v){tonOff=!v;if(tonOff)tonStop();try{localStorage.setItem('mg-kino-ton',tonOff?'off':'on');}catch{}},get soundOn(){return T.on;},
 state:()=>({shot:F.shot,pair:F.pair?.key||null,punch:+F.punch.toFixed(3),split:K.on?(FM.rects?'film-'+look.layout:K.mode):null})};
})();
