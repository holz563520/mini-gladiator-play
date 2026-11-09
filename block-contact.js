'use strict';
// =====================================================================================================
// BLOCK-KONTAKT (Wunsch Thomas 5.11.2026) – sichtbares Blocken mit Schild und Waffe für die echte Arena.
// · Wird nur aktiv, wenn M.blockContact.active = true gesetzt ist (heute nur im Block-Editor). Ohne das
//   ändert diese Datei nichts: sim.js und arena.js rufen die Haken nur über M.blockContact?.… auf.
// · Ablauf: Beim Schlagbeginn (sim.js, pendingStrike) wird der Blockwurf vorgezogen (plan). Steht fest, dass
//   geblockt wird, stellt der Verteidiger Schild oder Waffe genau in die Bahn zum Treffpunkt (pose), und die
//   Angriffswaffe endet dort statt am Körper. Im Trefferzeitpunkt (55 % des Schlags, wie bisher) entscheidet
//   sim.js mit derselben Blockchance wie immer; dann folgen Klang, Funken/Splitter und die Regeln unten.
// · Regeln (einzeln schaltbar, Vorschlag – noch nicht freigegeben): Initiative für den Blockenden,
//   Combo-Abbruch, Kraftprobe Klinge an Klinge (der Stärkere drückt weg), Deckung durchschlagen (Taumeln).
// · Eigene Funken (fester Puffer) und eigene Klangvorlagen in kampfsound.js (Kategorie Waffen, im
//   Kampfsound-Editor einstellbar). Keine Spielstand-Daten; Spielwürfel nur, wenn aktiv.
// =====================================================================================================
(()=>{
const M=window.MG;if(!M||M.blockContact)return;
const S=M.s,TAU=Math.PI*2,cl=(x,a,b)=>Math.max(a,Math.min(b,x)),sm=t=>{t=cl(t,0,1);return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t,lerpA=(a,b,t)=>{const d=Math.atan2(Math.sin(b-a),Math.cos(b-a));return a+d*t;};
const BC={active:true,labels:false,rules:{initiative:true,combo:true,bind:true,broken:true,arrows:true},bindChance:.45,onEvent:null,
 stats:{planned:0,blocks:0,binds:0,mismatch:0,particles:0},play:null};
M.blockContact=BC;

// ---------------------------------------------------------------- Waffen und Materialien
const BLADES=new Set(['dagger','short','gladius','long','greatsword']),BINDERS=new Set(['short','gladius','long','greatsword']);
const HEAD={axe:.72,doubleaxe:.68,mace:.68,hammer:.72,spear:.84,trident:.72,halberd:.66,club:0};
const BLUNT=new Set(['club','mace','hammer']),AXES=new Set(['axe','doubleaxe']),POLES=new Set(['spear','trident','halberd']);
const TECH_FORCE={slash:1,overhead:1.35,thrust:.75,spin:1.2};
const WDEF=Object.fromEntries((M.weaponDefs||[]).map(w=>[w.id,w])),SDEF=Object.fromEntries((M.shieldDefs||[]).map(s=>[s.id,s]));
const SH_R={buckler:7,smallshield:9,roundshield:11,scutum:13,tower:15};
function weaponPart(id,u){
 if(id==='club')return{mat:'wood',part:'Keule'};
 if(BLADES.has(id))return u<.16?{mat:'metal',part:'Parierstange'}:{mat:'metal',part:'Klinge'};
 if(u>=(HEAD[id]??.7))return{mat:'metal',part:BLUNT.has(id)?'Kopf':AXES.has(id)?'Axtblatt':id==='halberd'?'Beil':'Spitze',head:true};
 return{mat:'wood',part:'Stiel'};}
function shieldPart(id,spot){if(id==='buckler')return{mat:'metal',part:'Faustschild',kind:'buckler'};
 if(spot==='boss')return{mat:'metal',part:'Schildbuckel',kind:'boss'};
 if(spot==='rim'&&(id==='smallshield'||id==='roundshield'))return{mat:'metal',part:'Schildrand',kind:'rim'};
 return{mat:'wood',part:'Holzschild',kind:'wood'};}
// Wucht gegen Halt. Gleiche Rechnung für Arena und Editor-Übersicht.
function holdOf(dw,sid,blk,str=50){if(sid){const s=SDEF[sid];return s.weight*1.1+s.protection*.12+blk*.03+str*.01;}const w=WDEF[dw];return w.block*14+w.weight*.45+(w.twoHand?1.5:0)+blk*.03+str*.01;}
function forceOf(aw,tech,str=50){const w=WDEF[aw];return w.weight*(TECH_FORCE[tech]??1)+(w.twoHand?1.2:0)+str*.01;}
function classify(aw,tech,dw,sid,blk=50,spot='wood',strA=50,strD=50,u=null){
 if(!WDEF[aw])aw='club';if(!WDEF[dw])dw='club';if(sid&&!SDEF[sid])sid=null;// Faust, Tritt, unbekannt: wie Holz
 const ap=weaponPart(aw,.9),guardU=u??(POLES.has(dw)?.35:BLADES.has(dw)?.55:.5),dp=sid?shieldPart(sid,spot):weaponPart(dw,guardU);
 const force=forceOf(aw,tech,strA),hold=holdOf(dw,sid,blk,strD),heavy=!!ap.head&&!POLES.has(aw)||WDEF[aw].weight>=5;
 let outcome='clean';
 if(force>hold*1.3)outcome='broken';
 else if(tech==='thrust'&&(sid||dp.mat==='metal'))outcome='glance';
 else if(!sid&&BINDERS.has(aw)&&BINDERS.has(dw)&&tech!=='thrust')outcome='bindable';
 let snd,fx,pitch=1;
 if(sid){pitch={buckler:1.12,smallshield:1.05,roundshield:1,scutum:.92,tower:.84}[sid]??1;
  if(dp.kind==='buckler'){snd='bk_faust';fx='metal';}else if(dp.kind==='boss'){snd='bk_buckel';fx='boss';}else if(dp.kind==='rim'){snd='bk_rand';fx='metal';}
  else{snd=heavy||outcome==='broken'?'bk_schildSchwer':ap.mat==='wood'?'bk_holz':'bk_schild';fx='wood';}}
 else if(dp.mat==='wood'){snd=ap.mat==='metal'?'bk_stiel':'bk_holz';fx='wood';pitch=cl(1.12-WDEF[aw].weight*.035,.78,1.15);}
 else if(ap.mat==='wood'){snd='bk_holz';fx='wood';pitch=1.2;}
 else{snd=heavy?'bk_schwer':'bk_klinge';fx='metal';pitch=cl(1.25-(WDEF[aw].weight+WDEF[dw].weight)*.04,.75,1.25);}
 const extra=outcome==='broken'?'bk_durch':outcome==='glance'?'bk_gleit':null;
 return{outcome,ap,dp,force,hold,heavy,snd,extra,fx,pitch};}
BC.classify=classify;BC.weaponPart=weaponPart;

// ---------------------------------------------------------------- Klänge: Vorlagen bk_… stehen in kampfsound.js (Kategorie Waffen)
Object.defineProperty(BC,'SOUNDS',{get:()=>Object.fromEntries(Object.entries(window.KampfSound?.DEF||{}).filter(([k])=>k.startsWith('bk_')))});
function sound(k,pitch=1,vol=1){if(!k)return;try{if(BC.play)BC.play(k,vol,pitch);else M.audioEngine?.ksPlay?.(k,vol,pitch);}catch{}}

// ---------------------------------------------------------------- Helfer
// Leistung: Nachschlagen per Tabelle statt Suche durch alle Kämpfer (einmal je Kampfzeitpunkt aufgebaut)
let amap=new Map(),amapT=-1,amapB=null;
const actor=id=>{const b=S.battle;if(!b)return null;if(b!==amapB||b.time!==amapT){amapB=b;amapT=b.time;amap.clear();for(const x of b.actors)amap.set(x.id,x);}return amap.get(id);};
BC.actor=actor;
const now=()=>S.battle?.time||0;
const human=a=>a&&!a.hahn&&!a.lion&&!a.rex&&!a.beast&&!a.dog;
function tipOf(w){return M.bladeSurface?.(w.id,w.item?.q??1)?.tip||({hammer:33,mace:32,club:27}[w.id]||38);}
const plans=new Map(),strikes=new Map(),binds=new Map(),drawn=new Map(),flags=new Map();

// ---------------------------------------------------------------- 1. Schlagbeginn: Blockwurf vorziehen
BC.plan=(a,b,ef)=>{
 try{M.reachAI?.onStrike?.(a,b,ef);}catch{}
 if(!BC.active||!S.battle||!human(a)||!human(b)||ef?.w?.ammo||['kick','shieldBash','groundFinish'].includes(a.technique))return;
 const r=M.rng();ef.blockRoll=r;let p=0;try{p=M.blockChanceNow?.(a,b,ef.w)||0;}catch{}
 const t=now(),sh=M.usableShield(b),bw=M.weapon(b),useShield=!!sh&&!bw.twoHand;
 const spotR=Math.random(),spot=spotR<.22?'boss':spotR<.48?'rim':'wood';// nur Darstellung: wo am Schild es trifft
 const pl={att:a.id,def:b.id,will:r<p,chance:p,t0:t,tc:t+(a.swingMax||.3)*.55,tech:a.technique,shield:useShield,sid:useShield?sh.def:null,spot,res:null,done:false,G:null};
 BC.stats.planned++;
 // Leistung: nur Schläge, die geblockt werden, brauchen eine Deckungsbewegung (der Rest bleibt wie im Spiel)
 if(!pl.will)return;
 plans.set(b.id,pl);strikes.set(a.id,pl);
};

// ---------------------------------------------------------------- 2. Im Treffermoment geblockt (aus combatResponses.block)
const R=M.combatResponses;
// Nur echte Nahkampfwaffen gegen Menschen; Tritt, Schildstoß, Faust und Geschosse behalten das bisherige Blocken
BC.handles=(a,b,w,projectile)=>{if(!BC.active||!human(b))return false;
 if(projectile)return !!w?.ammo&&w.id!=='net'&&!(M.usableShield(b)&&!M.weapon(b).twoHand)&&!!WDEF[M.weapon(b).id]&&!M.weapon(b).ammo;// Geschoss an der Waffe abgelenkt (mit Schild bleibt es beim bisherigen Schildblock)
 return human(a)&&!!WDEF[w?.id]&&!w.ammo&&!['kick','shieldBash'].includes(a.swingKind);};
// Pfeile, Bolzen, Wurfwaffen ohne Schild: mit der Waffe etwas seltener abzuwehren, etwa 10 % (Regel „arrows“, 9.11. Wunsch Thomas)
BC.arrowFactor=()=>BC.rules.arrows?.9:1;
if(R?.block){const orig=R.block;R.block=(a,b,projectile,w)=>{orig(a,b,projectile,w);if(BC.handles(a,b,w,projectile)){if(projectile)onArrowParry(a,b,w);else onBlock(a,b,w);}};}
function onBlock(a,b,w){
 let pl=plans.get(b.id);
 if(!pl||pl.att!==a.id||pl.done){// ungeplant (Wurf beim Ausholen sagte nein, im Treffer doch ja): schnelle Notdeckung
  const sh=M.usableShield(b),bw=M.weapon(b);pl={att:a.id,def:b.id,will:true,t0:now()-.06,tc:now(),tech:a.swingKind||a.technique||'slash',shield:!!sh&&!bw.twoHand,sid:sh&&!bw.twoHand?sh.def:null,spot:'wood',res:null,done:false,G:null};plans.set(b.id,pl);strikes.set(a.id,pl);BC.stats.mismatch++;}
 if(!pl.will)BC.stats.mismatch++;
 pl.will=true;pl.done=true;pl.tc=now();
 const dw=M.weapon(b).id,tech=['slash','thrust','overhead','spin'].includes(pl.tech)?pl.tech:'slash';
 const res=classify(w.id,tech,dw,pl.sid,b.g.stats.block||0,pl.spot,a.g.stats.strength||50,b.g.stats.strength||50,pl.u);
 let outcome=res.outcome;
 if(outcome==='broken'&&!BC.rules.broken)outcome='clean';
 if(outcome==='bindable')outcome=BC.rules.bind&&canBind(a,b)&&M.rng()<BC.bindChance?'bind':'clean';
 res.outcome=outcome;pl.res=res;BC.stats.blocks++;
 const G=pl.G||mid(a,b);
 // Klang und Bild
 sound(res.snd,res.pitch,1);if(res.extra)sound(res.extra,1,.7);
 burst(G.x,G.y,res,a,b);
 if(M.shake!==undefined)M.shake=Math.max(M.shake||0,outcome==='broken'?3:res.heavy?2:1);
 // Regeln
 let init='A';
 if(outcome==='clean'||outcome==='glance'){init='D';if(BC.rules.initiative){b.cool=Math.min(b.cool||0,.15);flags.set(a.id,{slow:.22});}if(BC.rules.combo)flags.set(a.id,{...(flags.get(a.id)||{}),breakCombo:true});}
 else if(outcome==='broken'){init='A';try{M.stagger?.(b,6,M.angle(a,b));}catch{}M.combatResponses.push?.(a,b,34,false);}
 else if(outcome==='bind')startBind(a,b,{x:(a.x+b.x)/2,y:(a.y+b.y)/2-50});
 const ev={kind:'block',outcome,res,att:a,def:b,weapon:w.id,defWeapon:dw,shield:pl.sid,tech,init,combo:(a.comboCount||0),planned:pl.chance,time:now()};
 fire(ev);
}
function fire(ev){try{BC.onEvent?.(ev);}catch(e){console.warn('blockContact.onEvent',e);}}
// Geschoss prallt an der Klinge ab: Funken, leises Klirren, abgelenkter Pfeil fliegt weg, kurzes Zucken der Waffe
const flicks=new Map(),deflects=[];
function onArrowParry(a,b,w){const d=drawn.get(b.id),bw=M.weapon(b),tip=tipOf(bw),P=d?{x:d.hand.x+d.dir.x*tip*.55,y:d.hand.y+d.dir.y*tip*.55}:{x:b.x,y:b.y-50};
 const dir=Math.sign(b.x-a.x)||1;sound('bk_pfeilKlinge',w.id==='crossbow'?.9:1.05,.85);emit(1,P.x,P.y,4,-dir,-1,1.1,120,.18);flash(P.x,P.y,'metal',3);
 deflects.push({x:P.x,y:P.y,vx:dir*(40+Math.random()*50),vy:-(110+Math.random()*60),ang:Math.atan2(0,dir),spin:(Math.random()<.5?-1:1)*(14+Math.random()*8),life:.9,len:w.id==='crossbow'?6:8});if(deflects.length>6)deflects.shift();
 flicks.set(b.id,{t0:now(),dur:.24});BC.stats.arrows=(BC.stats.arrows||0)+1;
 if(BC.labels){labels.length=0;labels.push({x:P.x,y:Math.min(P.y,b.y-88)-4,t:'ABGELENKT',life:.6,c:'#d8d0b0'});}
 fire({kind:'arrow',att:a,def:b,weapon:w.id,defWeapon:bw.id,time:now()});}
const mid=(a,b)=>({x:(a.x+b.x)/2,y:Math.min(a.y,b.y)-48});
function canBind(a,b){return !(b.wind>0)&&!(b.swing>0)&&!b.pendingStrike&&!b.down&&!a.down&&!(b.stun>0)&&!(a.stun>0)&&!binds.has(a.id)&&!binds.has(b.id);}

// ---------------------------------------------------------------- 3. Kraftprobe: Klinge an Klinge
function power(x){const st=x.g.stats,w=M.weapon(x);return (st.strength||50)*.6+(st.balance||50)*.2+(st.block||0)*.15+w.weight*4+(x.energy||0)*.1;}
function startBind(a,b,G){const pa=power(a),pb=power(b),diff=Math.abs(pa-pb)/Math.max(1,pa+pb),dur=cl(.85-diff*2.2,.45,.85)+M.rng()*.12;
 // Würfel nur für den Ausgang einer knappen Kraftprobe; der Stärkere gewinnt meist
 const winA=M.rng()<cl(.5+(pa-pb)/Math.max(1,pa+pb)*2.4,.12,.88);
 const B={a:a.id,b:b.id,t:0,dur,winner:winA?a.id:b.id,loser:winA?b.id:a.id,X:{...G},spark:0,sounded:false};
 binds.set(a.id,B);binds.set(b.id,B);BC.stats.binds++;if(BC.labels){labels.length=0;labels.push({x:B.X.x,y:Math.min(a.y,b.y)-92,t:'KRAFTPROBE',life:.6,c:'#f0dc8e'});}sound('bk_reiben',1,.9);
 for(const x of [a,b]){x.kx=x.ky=0;x.moveSpeed=0;}
 fire({kind:'bindStart',att:a,def:b,winner:winA?a:b,dur,pa,pb});}
function endBind(B){binds.delete(B.a);binds.delete(B.b);const w=actor(B.winner),l=actor(B.loser);if(!w||!l)return;
 sound('bk_wegdruecken',1,1);burst((B.Xnow||B.X).x,(B.Xnow||B.X).y,{fx:'metal',heavy:true,outcome:'shove'},w,l);
 try{M.combatResponses.push?.(w,l,58,false);M.stagger?.(l,5,M.angle(w,l));}catch{}
 l.energy=Math.max(0,(l.energy||0)-6);w.cool=Math.min(w.cool||0,.12);l.cool=Math.max(l.cool||0,.45);
 if(BC.rules.combo){M.resetCombo?.(w);M.resetCombo?.(l);}
 fire({kind:'bindEnd',winner:w,loser:l});}

// ---------------------------------------------------------------- 4. Schritt (sim.js updateActor, vor allen Aktionen)
BC.step=(a,dt)=>{
 if(M.reachAI?.active&&M.reachAI.step?.(a,dt))return true;
 if(!BC.active)return false;
 const f=flags.get(a.id);if(f){flags.delete(a.id);if(f.breakCombo)M.resetCombo?.(a);if(f.slow)a.cool=Math.max(a.cool||0,f.slow);}
 const B=binds.get(a.id);if(!B)return false;
 const o=actor(B.a===a.id?B.b:B.a);if(!o||o.g.dead||o.down||a.down||a.g.dead||a.stun>0&&B.t>.2){binds.delete(B.a);binds.delete(B.b);return false;}
 a.moveSpeed=0;a.kx=a.ky=0;a.state='guard';a.wind=0;a.pendingStrike=null;a.cool=Math.max(a.cool||0,.2);
 if(B.a===a.id){B.t+=dt;if(B.t>=B.dur)endBind(B);}
 return true;};

// ---------------------------------------------------------------- 5. Pose (arena.js drawGladiator, vor limitArm)
let lastBattle=null;
BC.pose=(a,main,off,angle,c)=>{
 if(!BC.active||!S.battle)return null;
 if(S.battle!==lastBattle){lastBattle=S.battle;plans.clear();strikes.clear();binds.clear();drawn.clear();flags.clear();flicks.clear();}
 {const sp=M.reachAI?.active&&M.reachAI.shoves?.size?M.reachAI.pose(a,main,off,angle,c):null;if(sp)return sp;}
 if(!binds.has(a.id)&&!plans.has(a.id)&&!strikes.has(a.id)&&!flicks.has(a.id))return null;
 const sx=c.sx,sy=c.sy,fs=Math.sign(sx)||1,toL=P=>({x:(P.x-a.x)/sx,y:(P.y-a.y)/sy-c.bob}),toW=L=>({x:a.x+L.x*sx,y:a.y+(L.y+c.bob)*sy});
 const t=now(),w=c.w,tipL=tipOf(w),root=c.shoulders?.r||{x:4,y:-56};
 let out=null;
 // Kraftprobe
 const B=binds.get(a.id);
 if(B){const o=actor(B.a===a.id?B.b:B.a);if(o){const k=cl(B.t/B.dur,0,1),
   push=sm(k)*.7,tremble=Math.sin(t*46+(a.seed||0))*.8,dirTo=Math.sign(o.x-a.x)||1;
   // der Kreuzpunkt wandert langsam zum Verlierer hin (Gewinner drückt), dazu Zittern vor Anstrengung
   const X={x:B.X.x+(B.winner===a.id?dirTo:-dirTo)*push*9+tremble*.4,y:B.X.y+Math.sin(t*31)*.6};B.Xnow=X;
   const XL=toL(X),ang=-.95+(B.winner===a.id?.12*k:-.12*k)+tremble*.01,dir={x:Math.cos(ang),y:Math.sin(ang)},u=.5;
   let H={x:XL.x-dir.x*tipL*u,y:XL.y-dir.y*tipL*u};const d=Math.hypot(H.x-root.x,H.y-root.y);if(d>25)H={x:root.x+(H.x-root.x)*25/d,y:root.y+(H.y-root.y)*25/d};
   const aim=Math.atan2(XL.y-H.y,XL.x-H.x);out={main:H,off:c.shield?{x:off.x-2,y:off.y}:{x:H.x-6,y:H.y+4},angle:aim};
   if(B.a===a.id){B.spark-=1/60;if(B.spark<=0){B.spark=.15+Math.random()*.1;emit(1,X.x,X.y,1,0,-1,1.4,60,.18);}}}}
 // Geschoss abgelenkt: Waffe zuckt kurz hoch
 const fl=flicks.get(a.id);if(!out&&fl){const k=(t-fl.t0)/fl.dur;if(k>=1||k<0)flicks.delete(a.id);else{const s=Math.sin(k*Math.PI);out={main:{x:main.x+5*s,y:main.y-4*s},off,angle:lerpA(angle,-1.25,s)};}}
 // Verteidiger: Deckung in die Bahn
 const pl=plans.get(a.id);if(pl&&t>pl.tc+.7){plans.delete(a.id);if(strikes.get(pl.att)===pl)strikes.delete(pl.att);}
 if(!out&&pl&&t>=pl.t0&&t<=pl.tc+.6){const att=actor(pl.att);
  if(att){const resp=M.combatResponses?.pose?.(a);if(resp?.kind!=='dodge'){
   const cp=att.contactPoint||{x:a.x,y:a.y-50},ad=drawn.get(att.id),sa=ad?ad.hand:{x:att.x,y:att.y-58};
   let dx=cp.x-sa.x,dy=cp.y-sa.y,dl=Math.hypot(dx,dy)||1;dx/=dl;dy/=dl;
   const gap=(pl.shield?(SH_R[pl.sid]||10)+3:7)*Math.abs(sx);
   let G=pl.G&&pl.done?pl.G:{x:cp.x-dx*gap,y:cp.y-dy*gap};
   let GL=toL(G);if(GL.x<12){GL.x=12;G=toW(GL);}if(GL.y>-26){GL.y=-26;G=toW(GL);}if(GL.y<-86){GL.y=-86;G=toW(GL);}
   if(!pl.done)pl.G=G;
   const delay=.03+(1-cl((a.g.stats.block||0)/100,0,1))*.05,span=Math.max(.06,pl.tc-.015-(pl.t0+delay));
   let g=sm((t-pl.t0-delay)/(span*(pl.will?1:1.9)));
   if(t>pl.tc){const tau=t-pl.tc;if(!pl.done){g*=1-sm(tau/.12);}else{g=tau<.3?1:1-sm((tau-.3)/.22);}}
   if(pl.done&&pl.res?.outcome==='broken'){const tau=t-pl.tc;g*=1-sm(tau/.08);}
   if(g>0){
    if(pl.shield){let C={x:GL.x,y:GL.y};const R0=SH_R[pl.sid]||10,perp={x:-dy*fs,y:dx};
     if(pl.spot==='rim')C={x:C.x+perp.x*R0*.85,y:C.y+perp.y*R0*.85};else if(pl.spot==='wood')C={x:C.x+perp.x*R0*.45,y:C.y+perp.y*R0*.45};
     if(pl.done&&t>pl.tc){const k=Math.sin(cl((t-pl.tc)/.16,0,1)*Math.PI);C.x-=k*3;}
     out={main,off:{x:lerp(off.x,C.x,g),y:lerp(off.y,C.y,g)},angle};}
    else{let n={x:-dy,y:dx};if(n.y>0)n={x:-n.x,y:-n.y};let nL={x:n.x*fs,y:n.y};const nl=Math.hypot(nL.x,nL.y)||1;nL={x:nL.x/nl,y:nL.y/nl};
     const u=POLES.has(w.id)?.35:BLADES.has(w.id)?.55:.5;pl.u=u;
     let H={x:GL.x-nL.x*u*tipL,y:GL.y-nL.y*u*tipL};const d=Math.hypot(H.x-root.x,H.y-root.y);
     if(d>25){H={x:root.x+(H.x-root.x)*25/d,y:root.y+(H.y-root.y)*25/d};}
     let ga=Math.atan2(GL.y-H.y,GL.x-H.x);
     if(pl.done&&t>pl.tc){const k=Math.sin(cl((t-pl.tc)/.16,0,1)*Math.PI);H={x:H.x-k*3,y:H.y+k*1.5};ga-=k*.12*(pl.res?.heavy?2:1);}
     out={main:{x:lerp(main.x,H.x,g),y:lerp(main.y,H.y,g)},off,angle:lerpA(angle,ga,g)};}}}}}
 // Angreifer: Schlag endet an der Deckung statt am Körper
 const st=strikes.get(a.id);
 if(!out&&st&&st.will&&st.G&&t>=st.t0&&t<=st.tc+.5){
  const GL=toL(st.G),dx=GL.x-root.x,dy=GL.y-root.y,d=Math.max(1,Math.hypot(dx,dy)),reach=Math.min(26,Math.max(0,d-tipL)),HT={x:root.x+dx/d*reach,y:root.y+dy/d*reach};
  let k;if(t<st.tc){const raw=a.swing>0?cl(1-a.swing/(a.swingMax||.3),0,1):0,ph=M.strikePhase?M.strikePhase(raw):raw;k=a.swing>0?cl(1-Math.abs(ph-.55)/.28,0,1):0;if(ph>.55)k=1;}
  else{const tau=t-st.tc;k=st.done?(tau<.32?1:1-sm((tau-.32)/.18)):1-sm(tau/.1);}
  if(k>0){let H={...HT},aim=Math.atan2(GL.y-H.y,GL.x-H.x);
   if(st.done&&t>st.tc){const tau=t-st.tc,o=st.res?.outcome,rec=o==='broken'?0:o==='glance'?.6:1,kk=sm(tau/.12)*rec;
    H={x:H.x-dx/d*10*kk,y:H.y-dy/d*10*kk-3*kk};aim-=(o==='glance'?-.5:.45)*kk;
    if(o==='broken'){const kb=sm(tau/.18);H={x:HT.x+dx/d*6*kb,y:HT.y+dy/d*6*kb};}}
   out={main:{x:lerp(main.x,H.x,k),y:lerp(main.y,H.y,k)},off,angle:lerpA(angle,aim,k)};}}
 // gezeichnete Waffenlage merken (für Richtung der Deckung des Gegners)
 const fm=out?out.main:main,fa=out?out.angle:angle;drawn.set(a.id,{hand:toW(fm),dir:{x:Math.cos(fa)*fs,y:Math.sin(fa)},t});
 return out;};

// ---------------------------------------------------------------- 6. Funken, Splitter, Lichtblitz (arena.js, nach den Spiel-Partikeln)
const PM=256,P={x:new Float32Array(PM),y:new Float32Array(PM),vx:new Float32Array(PM),vy:new Float32Array(PM),l:new Float32Array(PM),m:new Float32Array(PM),k:new Uint8Array(PM)};let pn=0,lastDraw=null;
const flashes=[],labels=[];
function emit(kind,x,y,n,dx,dy,spread,speed,life){const a0=Math.atan2(dy,dx);for(let i=0;i<n;i++){const j=pn;pn=(pn+1)%PM;const a=a0+(Math.random()*2-1)*spread,v=speed*(.45+Math.random()*.8);P.x[j]=x;P.y[j]=y;P.vx[j]=Math.cos(a)*v;P.vy[j]=Math.sin(a)*v;P.m[j]=P.l[j]=life*(.6+Math.random()*.7);P.k[j]=kind;}}
// 1 Funke, 2 Glut, 3 Splitter, 4 Staub
function burst(x,y,res,a,b){const back=Math.sign(a.x-b.x)||1,o=res.outcome,n=o==='broken'?11:res.heavy?8:5;
 if(res.fx==='metal'||res.fx==='boss'){emit(1,x,y,n,back*.5,-1,1.1,120,.2);emit(2,x,y,1,back,-.6,.6,45,.4);flash(x,y,res.fx,res.heavy?5:4);}
 else{emit(3,x,y,res.heavy?7:4,back,-1,1.1,85,.4);emit(4,x,y,1,back,0,.5,14,.4);flash(x,y,'wood',3);}
 if(o==='glance')emit(1,x,y,3,-back,-.2,.35,150,.16);
 if(BC.labels){const t={clean:'BLOCK',glance:'ABGEGLITTEN',bind:'KRAFTPROBE',broken:'DURCHGESCHLAGEN',shove:'WEGGEDRÜCKT'}[o]||'';if(t){labels.length=0;labels.push({x,y:Math.min(y,Math.min(a.y,b.y)-88)-4,t,life:.6,c:{clean:'#9fd0f0',glance:'#a6d98a',bind:'#f0dc8e',broken:'#f08a70',shove:'#f0dc8e'}[o]});}}}
function flash(x,y,kind,size){flashes.push({x,y,t:0,max:kind==='boss'?.18:.1,kind,size});if(flashes.length>8)flashes.shift();}
BC.draw=(ctx)=>{if(!BC.active)return;const t=now();let dt=lastDraw==null?0:cl(t-lastDraw,0,.05);lastDraw=t;let alive=0;
 for(let i=0;i<PM;i++){if(P.l[i]<=0)continue;alive++;P.l[i]-=dt;const k=P.k[i];
  if(k===4){P.vx[i]*=1-4*dt;P.vy[i]=P.vy[i]*(1-4*dt)-6*dt;}else{P.vy[i]+=(k===3?360:240)*dt;P.vx[i]*=1-1.6*dt;}
  P.x[i]+=P.vx[i]*dt;P.y[i]+=P.vy[i]*dt;const f=cl(P.l[i]/P.m[i],0,1),x=Math.round(P.x[i]),y=Math.round(P.y[i]);
  if(k===1){ctx.fillStyle=f>.6?'#fffbe6':f>.3?'#ffd56a':'#e8812e';ctx.fillRect(x,y,2,2);if(Math.abs(P.vx[i])+Math.abs(P.vy[i])>90){ctx.globalAlpha=.5;ctx.fillRect(Math.round(P.x[i]-P.vx[i]*.014),Math.round(P.y[i]-P.vy[i]*.014),2,2);ctx.globalAlpha=1;}}
  else if(k===2){ctx.fillStyle=f>.5?'#ffe39a':'#c96a2c';ctx.fillRect(x,y,2,2);}
  else if(k===3){ctx.fillStyle=i%3?'#a87a4a':'#e0c18f';ctx.fillRect(x,y,(i&1)?3:2,(i&1)?2:3);}
  else{ctx.globalAlpha=f*.35;ctx.fillStyle='#c8b28a';const r=3+(1-f)*6;ctx.fillRect(Math.round(x-r),Math.round(y-r*.6),Math.round(r*2),Math.round(r*1.2));ctx.globalAlpha=1;}}
 BC.stats.particles=alive;
 for(let i=deflects.length-1;i>=0;i--){const f=deflects[i];f.life-=dt;if(f.life<=0){deflects.splice(i,1);continue;}f.vy+=320*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.ang+=f.spin*dt;const c=Math.cos(f.ang)*f.len,s=Math.sin(f.ang)*f.len;ctx.globalAlpha=cl(f.life*3,0,1);ctx.strokeStyle='#c9b48a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(f.x-c,f.y-s);ctx.lineTo(f.x+c,f.y+s);ctx.stroke();ctx.fillStyle='#d7e1cc';ctx.fillRect(Math.round(f.x+c)-1,Math.round(f.y+s)-1,2,2);ctx.globalAlpha=1;}
 for(let i=flashes.length-1;i>=0;i--){const f=flashes[i];f.t+=dt;if(f.t>=f.max){flashes.splice(i,1);continue;}const k=1-f.t/f.max,x=Math.round(f.x),y=Math.round(f.y),r=Math.round(f.size*k);
  if(f.kind==='boss'){ctx.strokeStyle=`rgba(255,226,150,${k})`;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,3+f.size*(1-k)*1.6,0,TAU);ctx.stroke();}
  ctx.fillStyle=f.kind==='wood'?`rgba(240,214,170,${k})`:`rgba(255,255,236,${k})`;ctx.fillRect(x-r,y-1,r*2+1,2);ctx.fillRect(x-1,y-r,2,r*2+1);if(f.kind!=='wood'&&r>2)ctx.fillRect(x-2,y-2,4,4);}
 if(labels.length){ctx.save();ctx.font='bold 11px "Courier Prime",monospace';ctx.textAlign='center';for(let i=labels.length-1;i>=0;i--){const L=labels[i];L.life-=dt;if(L.life<=0){labels.splice(i,1);continue;}ctx.globalAlpha=cl(L.life*3,0,1);ctx.fillStyle='#000';ctx.fillText(L.t,L.x+1,L.y-(.6-L.life)*14+1);ctx.fillStyle=L.c;ctx.fillText(L.t,L.x,L.y-(.6-L.life)*14);}ctx.restore();}};
// Aufräumen zwischen Kämpfen
BC.reset=()=>{flicks.clear();deflects.length=0;plans.clear();strikes.clear();binds.clear();drawn.clear();flags.clear();P.l.fill(0);flashes.length=0;labels.length=0;lastDraw=null;};
BC.state=()=>({plans:plans.size,binds:binds.size/2});
})();
