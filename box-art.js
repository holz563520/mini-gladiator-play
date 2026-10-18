'use strict';
// =====================================================================================================
// FAUSTKAMPF · Nahaufnahme (window.BXA). Eigene Szene wie beim Hahnenkampf: Kellerarena mit Seilen, Fackeln und
// wettendem Publikum; die beiden Kämpfer groß in Seitenansicht. Gezeichnet in ein kleines Pixelbild (320 × 180),
// ganzzahlig vergrößert. Aussehen (Haut, Haar, Frisur, Bart) kommt vom Gladiator, Zähne aus g.teeth (Lücken/Gold).
// Reine Darstellung: liest den Kampfzustand aus box-engine.js, verändert nichts.
// =====================================================================================================
(()=>{
const BX=window.BX;const W=320,H=180,GROUND=168,K=.74;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,k)=>a+(b-a)*k,ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);},easeOut=t=>1-(1-clamp(t,0,1))**2;
const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const TEAM=[{trunk:'#2c5c96',trunkD:'#1d3f6a',wrap:'#d9cfb2',stripe:'#3d78c0',name:'#8fc0ff'},{trunk:'#9e3029',trunkD:'#6e1f1b',wrap:'#d9cfb2',stripe:'#c8463a',name:'#ff9b8a'}];
const GOLD='#e6b42a',GOLD_HI='#fff0a0',GAP='#1a0b0a',TOOTH='#ece4cc';
function shade(hex,k){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;r=clamp(Math.round(r*k),0,255);g=clamp(Math.round(g*k),0,255);b=clamp(Math.round(b*k),0,255);return '#'+((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1);}
function mixc(a,b,k){const p=h=>{const n=parseInt(h.slice(1),16);return [n>>16,n>>8&255,n&255];},x=p(a),y=p(b);return '#'+x.map((v,i)=>clamp(Math.round(v+(y[i]-v)*k),0,255).toString(16).padStart(2,'0')).join('');}
// Zahnfarbe für Index i (0–7, von links nach rechts): Lücke, Gold oder Zahn. Gilt auch für live ausgeschlagene Zähne.
function toothCol(g,lost,i){if(lost?.includes(i)||g?.teeth?.missing?.includes(i))return GAP;if(g?.teeth?.gold?.includes(i))return GOLD;return TOOTH;}

// ---------- Publikum ----------
function makeCrowd(){const P=[];let id=0;for(let row=0;row<3;row++){const y=[62,76,92][row],n=[26,24,22][row];for(let i=0;i<n;i++){const s=hash(++id*3.7);P.push({row,x:(i+.5)*W/n+(hash(id*9.1)-.5)*8,y:y+(hash(id*5.3)-.5)*3,
 skin:['#e0b48e','#c99a72','#a8754f','#8a5a3a','#6b432b','#d8a982'][Math.floor(hash(id*2.2)*6)],cloth:['#6b4a2e','#4f5d3a','#7a2f2a','#3e4f6b','#8a7a52','#5a3f5e','#9a6a2e','#2f4a44'][Math.floor(hash(id*7.7)*8)],
 hair:['#2a1d14','#4a3020','#6b4a2a','#1a1410','#8a8070','#b07a3a'][Math.floor(hash(id*4.4)*6)],hat:hash(id*8.8)<.18,coin:hash(id*6.6)<.22,bet:hash(id*1.9)<.5?0:1,phase:s*6.28,sp:6+hash(id*3.3)*5,size:[.8,.9,1.0][row]});}}return P;}
const BET_LINES={any:['Zwei Sesterzen auf {B}!','Fünf auf {R}!','Hau ihn um!','Deckung hoch, du Esel!','Mehr Beinarbeit!','Ich verdopple!','Gib\'s ihm!','Der hält nicht lange!','Halt die Fäuste oben!','Wer hält dagegen?'],
 hit:['Volltreffer!','Ohhh!','Das saß!','Noch einer!'],tooth:['Da fliegt ein Zahn!','Hahaha, der Zahn!','Zahn weg!'],down:['Steh auf!','Er liegt!','Zähl ihn aus!','Bleib liegen!'],block:['Gut gedeckt!','Abgeblockt!'],dodge:['Ausgewichen!','Wie ein Aal!']};

class Scene{
 constructor(canvas){this.cv=canvas;this.buf=document.createElement('canvas');this.buf.width=W;this.buf.height=H;this.q=this.buf.getContext('2d');this.crowd=makeCrowd();this.parts=[];this.labels=[];this.bubbles=[];this.stains=[];this.shake=0;this.zoom=0;this.flash=0;this.big=null;this.f=null;this.seen=0;this.camX=0;this.t=0;this.names=['Blau','Rot'];this.bubbleT=1;}
 setFight(f,names){this.intro={t:0,dur:4.6};this.bph=[0,2];this.breath=[0,0];this.sweat=[.05,.05];this.brun=[0,0];this.stress=[0,0];this.fistBlood=[0,0];this.cloth=[0,1].map(()=>({a:0,v:0,px:0,hit:false,str:false}));this.f=f;this.feet=null;this.trails=[[],[]];this.seen=0;this.parts=[];this.labels=[];this.bubbles=[];this.stains=[];this.big=null;this.camX=0;this.names=names||[f.b[0].g.name,f.b[1].g.name];}
 sx(x){return W/2+(x-this.camX)*K;}
 // ---------- Ereignisse → Effekte ----------
 consume(sfx){this.sfx=sfx;const f=this.f;if(!f)return;while(this.seen<f.events.length){const e=f.events[this.seen++];this.react(e);sfx?.event(e,f);}}
 react(e){const f=this.f,a=f.b[e.who],d=a?.opp;const L={gerade:'GERADE',schwinger:'SCHWINGER',uppercut:'UPPERCUT'};
  if(e.type==='hit'){this.lastHitEv={e,a,d};if(this.fistBlood)this.fistBlood[a.side]=Math.min(1,this.fistBlood[a.side]+(e.head?.045+e.power*.012:.012)*(1+Math.min(1,d.face.blood)*.8));this.maybeCut(e,a,d);const head=this.headPos(d);const n=e.crit?14:7;for(let i=0;i<n;i++)this.parts.push({x:head.x+(e.head?0:a.dir*2),y:e.head?head.y:head.y+30,vx:a.dir*(20+Math.random()*50),vy:-30-Math.random()*40,life:.6,col:Math.random()<.7?'#cfe8ff':'#ffffff',sz:1});
   if(e.head&&(e.power>6||d.face.cut>0)&&Math.random()<.6)for(let i=0;i<4+e.power*.6;i++)this.parts.push({x:head.x,y:head.y+3,vx:a.dir*(15+Math.random()*40),vy:-20-Math.random()*30,life:1.2,col:'#a01818',sz:1,blood:1});
   this.parts.push({x:head.x,y:e.head?head.y:head.y+30,ring:1,life:.18,r:2});
   this.labels.push({x:head.x,y:head.y-24,text:L[e.kind]+(e.crit?'!':''),col:e.crit?'#ffd25a':'#fff',life:.9});
   this.shake=Math.min(6,this.shake+(e.crit?4:1.5)+e.power*.12);this.zoom=Math.min(.08,this.zoom+(e.crit?.05:.02));if(e.crit)this.flash=.12;if(Math.random()<.25)this.say('hit');}
  else if(e.type==='block'){const head=this.headPos(d);this.labels.push({x:head.x,y:head.y-24,text:'BLOCK',col:'#9fd0ff',life:.7});this.parts.push({x:head.x+d.dir*8,y:head.y+4,ring:1,life:.14,r:1});if(Math.random()<.12)this.say('block');}
  else if(e.type==='evade'){const head=this.headPos(d);this.labels.push({x:head.x,y:head.y-24,text:'RÜCKSCHRITT',col:'#b9f0a8',life:.8});if(Math.random()<.15)this.say('dodge');}
  else if(e.type==='dodge'){const head=this.headPos(d);this.labels.push({x:head.x,y:head.y-24,text:e.how==='duck'?'WEGGEDUCKT':'AUSGEWICHEN',col:'#b9f0a8',life:.8});if(Math.random()<.18)this.say('dodge');}
  else if(e.type==='tooth'){if(this.cut){this.cut.tooth=e.tooth;this.cut.dur=Math.max(this.cut.dur,1.7);}else{this.pendingTooth=e.tooth;const L=this.lastHitEv;if(L&&!this.cutOff)this.maybeCut({...L.e,head:true,force:true},L.a,L.d);}const head=this.headPos(d);this.parts.push({x:head.x+d.dir*6,y:head.y+6,vx:-d.dir*(30+Math.random()*30),vy:-70,life:2.2,tooth:1,spin:0,col:TOOTH,ground:GROUND-2});this.labels.push({x:head.x,y:head.y-34,text:'ZAHN!',col:'#ffffff',life:1.3});this.say('tooth',true);}
  else if(e.type==='down'){if(this.cut)this.cut.down=true;this.shake=8;this.zoom=.1;this.big={text:'NIEDERSCHLAG!',sub:'',life:1.6};this.say('down',true);const p=this.sx(d.x);for(let i=0;i<14;i++)this.parts.push({x:p,y:GROUND-2,vx:(Math.random()-.5)*80,vy:-10-Math.random()*25,life:.7,col:'#b79a6c',sz:1});}
  else if(e.type==='rise'){this.big={text:'ER STEHT WIEDER!',sub:'',life:1.1};}
  else if(e.type==='end'){const w=e.winner;this.big={text:e.how==='Unentschieden'?'UNENTSCHIEDEN':e.how==='Punktsieg'?'PUNKTSIEG':e.how.toUpperCase()+'!',sub:w<0?'':this.names[w]+' gewinnt',life:99,col:w===0?TEAM[0].name:w===1?TEAM[1].name:'#ffe7a0'};}
  else if(e.type==='injury'&&e.type!=='Prellung'&&/Platzwunde|Nasenbruch/.test(e.type)){}
 }
 say(kind,force){if(!force&&this.bubbles.length>2)return;const pool=BET_LINES[kind]||BET_LINES.any,txt=pool[Math.floor(Math.random()*pool.length)].replace('{B}',this.names[0].split(' ')[0]).replace('{R}',this.names[1].split(' ')[0]);const s=this.crowd.filter(c=>c.row>0)[Math.floor(Math.random()*this.crowd.filter(c=>c.row>0).length)];this.bubbles.push({x:s.x,y:s.y-10,text:txt,life:1.8,team:s.bet});}
 headPos(b){const P=this.pose(b),h=P.head;const x=this.sx(b.x)+h.x*K*b.dir,y=GROUND+h.y*K+(P.fall?18:0);return {x,y};}
 // ---------- Beinarbeit: Füße stehen fest auf dem Boden und setzen einzeln nach (Weltkoordinaten, cm) ----------
 initFeet(){this.feet=this.f.b.map(b=>({f:{x:b.x+b.dir*16,lift:0,from:0,to:0,t:1,dur:.12,h:5},b:{x:b.x-b.dir*24,lift:0,from:0,to:0,t:1,dur:.12,h:5}}));this.trails=[[],[]];}
 updateFeet(dt){const f=this.f;if(!this.feet)this.initFeet();
  f.b.forEach((b,i)=>{const F=this.feet[i];const A=b.act,striking=(b.state==='strike'||b.state==='wind'&&b.stT>A?.wind*.5)&&A;
   let lunge=0;if(striking&&A.kind==='gerade'&&A.hand==='lead')lunge=14;else if(striking&&A.kind==='schwinger')lunge=6;
   const tgt={f:b.x+b.dir*(16+lunge),b:b.x-b.dir*(b.state==='dodge'&&b.dodgeDir>0?30:24)};
   const back=b.state==='backstep',fast=back||b.state==='step'&&Math.abs(b.vx)>120;
   for(const k of ['f','b']){const s=F[k];if(s.t<1){s.t=Math.min(1,s.t+dt/s.dur);s.x=lerp(s.from,s.to,ease(s.t));s.lift=Math.sin(s.t*Math.PI)*s.h;}else s.lift=0;}
   if(b.down)return;
   const order=(tgt.f-F.f.x)*b.dir<0||back?['b','f']:['f','b'];
   for(const k of order){const s=F[k],o=F[k==='f'?'b':'f'],err=tgt[k]-s.x;if(s.t>=1&&Math.abs(err)>6&&(o.t>=1||back||o.t>.6)){s.from=s.x;s.to=tgt[k]+Math.sign(err)*(back?4:2);s.t=0;s.dur=back?.09:fast?.1:.13;s.h=back?8:fast?6:4;if(Math.random()<.5)this.sfx?.step?.();break;}}
  });}
 // ---------- Körperhaltung (cm, Blick nach +x, y nach oben negativ) ----------
 pose(b){const f=this.f,t=f.t,st=b.state,o=b.opp,D=Math.abs(o.x-b.x),ph=t*9+(b.side?1.7:0),k=b.stT,A=b.act;
  // Grundhaltung: federnd auf den Fußballen, leichtes Pendeln des Oberkörpers
  let crouch=7+Math.abs(Math.sin(ph))*3,lean=.1+Math.sin(t*2.3+b.side)*.05,headX=0,headY=0,rot=0,open=0,fall=0,eyesShut=0,hipX=0,heel=0;
  let tech=null,p=0;if((st==='wind'||st==='strike'||st==='recover')&&A){tech=A.kind;p=st==='wind'?-ease(k/A.wind):st==='strike'?easeOut(k/A.strike):1-ease(k/A.recover);}
  const reachX=Math.min(D-24,104);
  if(tech==='gerade'){const e=Math.max(0,p);if(A.hand==='rear'){rot=e;lean+=.12*e;heel=4*e;}else{lean+=.06*e;}if(p<0)lean-=.03*-p;}
  else if(tech==='schwinger'){if(p<0){rot=A.hand==='rear'?-.6*-p:.5*-p;lean-=.04*-p;}else{rot=A.hand==='rear'?lerp(-.6,1.1,p):lerp(.5,-.7,p);lean+=.16*p;heel=A.hand==='rear'?4*p:0;}}
  else if(tech==='uppercut'){if(p<0){crouch+=16*-p;lean+=.18*-p;rot=-.3*-p;}else{crouch+=16*(1-p)-4*p;lean+=lerp(.18,.02,p);rot=A.hand==='rear'?.8*p:0;headY-=4*p;heel=3*p;}}
  else if(st==='block'){crouch+=6;lean+=.12;headY+=4;}
  else if(st==='dodge'){const q=Math.sin(clamp(k/b.dodgeT,0,1)*Math.PI);if(b.dodgeDir>0){lean-=.3*q;headX-=14*q;hipX-=6*q;}else{crouch+=32*q;lean+=.26*q;hipX-=5*q;headY+=4*q;}}
  else if(st==='backstep'){const q=Math.sin(clamp(k/.2,0,1)*Math.PI);lean-=.12*q;crouch+=4*q;}
  else if(st==='stagger'){lean=-.22;headX-=6;open=.8;eyesShut=.5;}
  if(st==='down'){const r=b.downDur||3;fall=k<.4?ease(k/.4):1;open=.6;eyesShut=1;}
  const hs=b.headSnap;if(Math.abs(hs)>.02){if(hs<0){headY-=6*-hs;headX-=4*-hs;}else{headX-=8*hs;}open=Math.max(open,.7*Math.abs(hs));eyesShut=Math.max(eyesShut,Math.abs(hs)>.4?1:0);}
  if(b.bodySnap>0){crouch+=10*b.bodySnap/.25;lean+=.3*b.bodySnap/.25;open=Math.max(open,.5);}
  if(b.hitFlash>0)eyesShut=Math.max(eyesShut,.6);
  const R=f.result,won=R&&!fall&&f.t-R.time>.3&&R.winner===b.side,lost=R&&!fall&&f.t-R.time>.3&&R.winner!==-1&&R.winner!==b.side;
  const brv=this.breath?.[b.side]||0,G=b.gest,wt=R?Math.max(0,t-R.time-.3):0,vv=((b.g.name||'').length+b.side)%3;let jump=0;
  if(lost){lean=.4;crouch=16;open=.5;rot=0;}if(won){lean=-.12;crouch=3;open=1;eyesShut=0;rot=0;if(vv!==1)jump=Math.abs(Math.sin(wt*4.2))*5;}
  if(G){eyesShut=0;const u=G.t;if(G.k==='chest'){crouch=3+Math.abs(Math.sin(u*9))*2;lean=-.1;headY-=3;open=1;}else if(G.k==='flex'){crouch=3;lean=-.1;headY-=2;open=.8;}else if(G.k==='shadow'){crouch=7+Math.abs(Math.sin(u*10))*3;headX+=Math.sin(u*5)*2;}else if(G.k==='point'){crouch=5;lean=.05;open=.6;}else if(G.k==='beckon'){crouch=4;headX-=2;lean=-.02;open=.5;}}
  // Rumpf, Schultern (Drehung bringt die hintere Schulter nach vorn), Kopf
  const hip={x:hipX,y:-96+crouch-jump},sh={x:hip.x+Math.sin(lean)*55,y:hip.y-Math.cos(lean)*55-brv*2.6};
  const shF={x:sh.x+5-Math.max(0,rot)*7+Math.max(0,-rot)*4,y:sh.y+4},shB={x:sh.x-5+Math.max(0,rot)*14-Math.max(0,-rot)*6,y:sh.y+2};
  const head={x:sh.x+6+headX+Math.sin(lean)*8,y:sh.y-21+headY};
  // Deckung: Führhand vor dem Gesicht, Schlaghand am Kinn
  const gF={x:head.x+18,y:head.y+12},gB={x:head.x+6,y:head.y+16};let fF={...gF},fB={...gB},elF=null,elB=null,trail=null;
  const tgtY=sh.y-6;
  if(tech==='gerade'){// gerade Linie vom Kinn zum Ziel, Ellbogen streckt sich durch
   const hand=A.hand==='rear'?'B':'F',G=hand==='F'?gF:gB,S=hand==='F'?shF:shB,T={x:Math.max(S.x+20,reachX),y:tgtY};
   const pt=p<0?{x:G.x+p*4,y:G.y+(-p)*1}:{x:lerp(G.x,T.x,p),y:lerp(G.y,T.y,p)};if(hand==='F')fF=pt;else fB=pt;if(p>.2)trail=hand;}
  else if(tech==='schwinger'){// weiter Bogen, Oberarm waagerecht auf Schulterhöhe, Faust kommt von außen herum
   const hand=A.hand==='rear'?'B':'F',S=hand==='F'?shF:shB,ex=Math.max(30,reachX-S.x),cx=S.x+ex*.35,rx=ex*.68,cy=tgtY-4;
   let pt,el;if(p<0){const q=-p;pt={x:lerp(hand==='F'?gF.x:gB.x,S.x-12,q),y:lerp(hand==='F'?gF.y:gB.y,S.y-4,q)};el={x:lerp(S.x+8,S.x-16,q),y:lerp(S.y+22,S.y+2,q)};}
   else{const th=lerp(Math.PI*1.05,-.05,p);pt={x:cx+Math.cos(th)*rx,y:cy-Math.sin(th)*14};el={x:lerp(S.x-16,S.x+ex*.42,p),y:S.y-2-Math.sin(p*Math.PI)*4};if(p>.05)trail=hand;}
   if(hand==='F'){fF=pt;elF=el;}else{fB=pt;elB=el;}}
  else if(tech==='uppercut'){// Faust taucht ab bis zur Hüfte und steigt in einer Kurve unter das Kinn
   const hand=A.hand==='rear'?'B':'F',S=hand==='F'?shF:shB,G=hand==='F'?gF:gB,low={x:S.x+6,y:hip.y-14},T={x:Math.max(S.x+16,reachX-12),y:sh.y-24};
   let pt;if(p<0)pt={x:lerp(G.x,low.x,-p),y:lerp(G.y,low.y,-p)};else pt={x:lerp(low.x,T.x,p*p),y:lerp(low.y,T.y,1-(1-p)*(1-p))};const el={x:pt.x-10,y:pt.y+24};
   if(hand==='F'){fF=pt;elF=el;}else{fB=pt;elB=el;}if(p>.1)trail=hand;}
  else if(st==='block'){fF={x:head.x+11,y:head.y+2};fB={x:head.x+7,y:head.y+9};elF={x:sh.x+12,y:sh.y+20};elB={x:sh.x+6,y:sh.y+22};}
  else if(st==='stagger'){fF={x:sh.x+20,y:sh.y+30};fB={x:sh.x+6,y:sh.y+34};}
  if(G){const u=G.t,S=Math.sin,C={x:sh.x+12,y:sh.y+18};
   if(G.k==='chest'){const ph=x=>({x:C.x+(1-x)*24,y:C.y-(1-x)*18}),a1=Math.max(0,S(u*9)),a2=Math.max(0,-S(u*9));fF=ph(Math.sqrt(a1));fB=ph(Math.sqrt(a2));}
   else if(G.k==='flex'){elF={x:sh.x+24,y:sh.y+2};fF={x:sh.x+8,y:sh.y-32+S(u*6)*1.5};elB={x:sh.x-20,y:sh.y+4};fB={x:sh.x-8,y:sh.y-30+S(u*6+1)*1.5};}
   else if(G.k==='shadow'){const e1=Math.pow(Math.max(0,S(u*11)),2),e2=Math.pow(Math.max(0,S(u*11+3.1)),2);fF={x:lerp(gF.x,sh.x+62,e1),y:lerp(gF.y,tgtY,e1)};fB={x:lerp(gB.x,sh.x+58,e2),y:lerp(gB.y,tgtY+2,e2)};if(e2>.3)rot=e2*.6;}
   else if(G.k==='point'){if(u<G.dur*.5){fF={x:sh.x+60,y:sh.y-4+S(u*5)*2};}else{const sw=S(u*6)*.5+.5;fF={x:lerp(head.x+36,head.x+2,sw),y:head.y+17};}}
   else if(G.k==='beckon'){fF={x:sh.x+46,y:sh.y+2+S(u*13)*5};fB={x:hip.x+14,y:hip.y-8};}}
  if(won){const w2=wt;if(vv===0){fF={x:sh.x+16,y:sh.y-40-Math.abs(Math.sin(w2*7))*7};fB={x:sh.x-12,y:sh.y-40-Math.abs(Math.cos(w2*7))*7};}
   else if(vv===1){const pl=Math.sin(w2*4)*2;elF={x:sh.x+26,y:sh.y+2};fF={x:sh.x+9,y:sh.y-34+pl};elB={x:sh.x-22,y:sh.y+4};fB={x:sh.x-8,y:sh.y-32-pl};headY-=2;}
   else{fF={x:sh.x+8,y:sh.y-44-Math.abs(Math.sin(w2*9))*9};fB={x:sh.x+46,y:sh.y+4+Math.sin(w2*5)*2};}}
  if(lost){fF={x:sh.x+20,y:hip.y-4};fB={x:sh.x+10,y:hip.y};}
  if(b.energy<25&&!fall&&st==='idle'){fF.y+=14;fB.y+=12;open=Math.max(open,.4);}
  // Füße aus der Beinarbeit
  const F=this.feet?.[b.side];const foot=s=>s?{x:(s.x-b.x)*b.dir,y:-s.lift}:null;
  const footF=foot(F?.f)||{x:16,y:0},footB=foot(F?.b)||{x:-24,y:0};footB.heel=heel;footF.y-=jump;footB.y-=jump;
  return {cloth:this.cloth?.[b.side]?.a||0,br:brv,hip,sh,shF,shB,head,fF,fB,elF,elB,lean,open,fall,footF,footB,eyesShut,trail,rearFront:rot>.35||tech&&A.hand==='rear'&&p>.3};}
 // ---------- Zeichnen ----------
 drawBoxer(q,b,ov){const P=this.pose(b),g=b.g,A=g.appearance||{},skin=A.skin||'#c08a62',sk2=A.shade||shade(skin,.72),hair=A.hair||'#3a2a1a',T=TEAM[b.side],dir=b.dir;
  const hs=clamp((g.height||180)/180,.88,1.1),M2=clamp(.6*(((g.stats?.strength)??20)-8)/80+.4*((g.muscle??40)-25)/40,0,1),FA=clamp(((g.fat??16)-8)/20,0,1),bw=clamp(.86+.3*M2+.2*FA,.82,1.22),mu=.1+1.3*M2,abv=clamp(1.3*M2-.9*FA+.08,0,1);
  const ox=ov?ov.x:Math.round(this.sx(b.x)),gy=ov?ov.y:GROUND,sc=ov?ov.sc:1,fx=ov?ov.flip:1;
  const swt=this.sweat?.[b.side]??0,OUT='rgba(44,20,10,.74)',base=skin,lo=shade(skin,.76),deep=shade(skin,.6);
  q.save();q.translate(ox,gy);q.scale(K*dir*hs*sc*fx,K*hs*sc);
  if(P.fall){q.rotate(-P.fall*1.42);q.translate(P.fall*-10,P.fall*-6);}
  const solve=(r,t,l1,l2,bend)=>{const dx=t.x-r.x,dy=t.y-r.y,d=Math.min(Math.hypot(dx,dy),l1+l2-.01),a=Math.atan2(dy,dx),c=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1));return {x:r.x+Math.cos(a+bend*c)*l1,y:r.y+Math.sin(a+bend*c)*l1};};
  const clampReach=(s2,t,L)=>{const dx=t.x-s2.x,dy=t.y-s2.y,d=Math.hypot(dx,dy);return d>L?{x:s2.x+dx/d*L,y:s2.y+dy/d*L}:t;};
  const fB=clampReach(P.shB,P.fB,70),fF=clampReach(P.shF,P.fF,70);
  const elB=P.elB?clampReach(P.shB,P.elB,35):solve(P.shB,fB,35,35,1),elF=P.elF?clampReach(P.shF,P.elF,35):solve(P.shF,fF,35,35,1);
  
  // Gliedmaße als Umriss mit Muskelwölbung: Breite am Anfang/Ende, Wölbung (Bizeps, Wade …) an Stelle bp
  const limb=(a,c,w0,w1,bulge,bp,ra,rc)=>{const n=10,dx=c.x-a.x,dy=c.y-a.y,L=Math.hypot(dx,dy)||1;let nx=-dy/L,ny=dx/L;if(ny<0){nx=-nx;ny=-ny;}
   const C=[],H=[];for(let i=0;i<=n;i++){const t=i/n;C.push({x:a.x+dx*t,y:a.y+dy*t});H.push(((w0+(w1-w0)*t)*bw+bulge*mu*Math.sin(Math.PI*Math.pow(t,bp||1)))/2);}
   return {a,c,C,H,nx,ny,ra:ra??H[0],rc:rc??H[n]};};
  const paint=(list,col)=>{q.lineJoin='round';q.lineCap='round';
   const path=p=>{q.beginPath();p.C.forEach((v,i)=>{const x=v.x-p.nx*p.H[i],y=v.y-p.ny*p.H[i];i?q.lineTo(x,y):q.moveTo(x,y);});for(let i=p.C.length-1;i>=0;i--)q.lineTo(p.C[i].x+p.nx*p.H[i],p.C[i].y+p.ny*p.H[i]);q.closePath();};
   const caps=p=>{q.moveTo(p.a.x+p.ra,p.a.y);q.arc(p.a.x,p.a.y,p.ra,0,7);q.moveTo(p.c.x+p.rc,p.c.y);q.arc(p.c.x,p.c.y,p.rc,0,7);};
   for(const p of list){path(p);q.fillStyle=OUT;q.strokeStyle=OUT;q.lineWidth=1.9;q.stroke();q.fill();q.beginPath();caps(p);q.stroke();q.fill();}
   for(const p of list){path(p);q.fillStyle=col;q.fill();q.beginPath();caps(p);q.fill();
    // harte Tonstufen wie bei den Köpfen: Unterseite dunkel, Kern, Lichtkante, Sprenkel
    q.beginPath();p.C.forEach((v,i)=>{const x=v.x+p.nx*p.H[i],y=v.y+p.ny*p.H[i];i?q.lineTo(x,y):q.moveTo(x,y);});for(let i=p.C.length-1;i>=0;i--)q.lineTo(p.C[i].x+p.nx*p.H[i]*.34,p.C[i].y+p.ny*p.H[i]*.34);q.closePath();q.fillStyle=shade(col,.8);q.fill();
    q.beginPath();p.C.forEach((v,i)=>{const x=v.x+p.nx*p.H[i],y=v.y+p.ny*p.H[i];i?q.lineTo(x,y):q.moveTo(x,y);});for(let i=p.C.length-1;i>=0;i--)q.lineTo(p.C[i].x+p.nx*p.H[i]*.72,p.C[i].y+p.ny*p.H[i]*.72);q.closePath();q.fillStyle=shade(col,.64);q.fill();
    q.beginPath();p.C.forEach((v,i)=>{const x=v.x-p.nx*p.H[i]*.5,y=v.y-p.ny*p.H[i]*.5;i?q.lineTo(x,y):q.moveTo(x,y);});q.strokeStyle=mixc(col,'#ffffff',.2+.12*swt);q.lineWidth=Math.max(1.3,p.H[3]*.36);q.stroke();
    for(let i=1;i<p.C.length-1;i++){const hh=hash(i*3.7+p.a.x*.13+p.c.y*.07);if(hh<.55){const o=(hash(i*9.1+p.a.y)-.5)*p.H[i]*1.5;q.fillStyle=hh<.28?shade(col,.88):mixc(col,'#ffffff',.14);q.fillRect(p.C[i].x+p.nx*o,p.C[i].y+p.ny*o,1.4,1.4);}}
    if(swt>.2){q.fillStyle='rgba(255,255,255,'+(.18+.2*swt).toFixed(2)+')';for(let i=2;i<p.C.length-2;i+=3){q.fillRect(p.C[i].x-p.nx*p.H[i]*.2,p.C[i].y-p.ny*p.H[i]*.2,1.5,1.5);}}
   }};
  const mw=mu;
  const armPolys=(sh,el,f,back)=>[limb(sh,el,13.2+M2*2,10+M2*1.5,7,.8,6.8+mw*3,5.2+M2*.8),limb(el,f,10.4+M2*1.8,6.6+M2,4.5,.35,5.2+M2,3.4+M2*.5)];
  const leg=(foot)=>{const ank={x:foot.x-1,y:foot.y-8},knee=solve(P.hip,ank,47,47,-1);return {knee,ank,polys:[limb(P.hip,knee,20+M2*4+FA*3,12.6+M2*2.4,7,.7,9.5+M2*1.5,7+M2),limb(knee,ank,12.4+M2*2.6,7.4+M2,6,.4,6.6+M2,3.8+M2*.5)]};};
  const legB=leg(P.footB),legF=leg(P.footF);
  const drawFoot=(f,sandal)=>{q.save();q.translate(f.x,f.y);q.rotate(-(f.heel||0)*.06);
   q.beginPath();q.moveTo(-6.5,0);q.lineTo(-7,-5);q.lineTo(-4,-10);q.lineTo(2,-10.5);q.lineTo(7,-6.5);q.lineTo(13,-3.2);q.lineTo(16,-1.6);q.lineTo(16,0);q.closePath();q.fillStyle=OUT;q.strokeStyle=OUT;q.lineWidth=1.8;q.stroke();q.fill();
   q.fillStyle=mixc(skin,'#000000',.1);q.fill();q.fillStyle='rgba(255,238,214,.2)';q.fillRect(-2,-9,6,1.5);
   // Zehen
   q.fillStyle=skin;for(let i=0;i<4;i++){q.beginPath();q.arc(12.6+i*.9,-2.9+i*.9,1.55-i*.12,0,7);q.fill();}q.fillStyle=OUT;for(let i=0;i<3;i++)q.fillRect(13.2+i*.9,-2.8+i*.9,.5,1.2);
   // Ledersandale: Sohle und Riemen
   q.fillStyle='#4a3020';q.fillRect(-7.5,-.2,24,2.2);q.fillStyle='#6a4a2c';q.fillRect(-7.5,-.2,24,.8);q.strokeStyle='#5a3a22';q.lineWidth=1.3;q.beginPath();q.moveTo(-5,-1);q.lineTo(-3,-8.5);q.moveTo(0,-1);q.lineTo(5,-7);q.moveTo(-6,-4);q.lineTo(5,-8);q.stroke();q.restore();};
  const drawHand=(f,el,k)=>{const ang=Math.atan2(f.y-el.y,f.x-el.x);q.save();q.translate(f.x,f.y);q.rotate(ang);const c=k<1?shade(skin,.82):skin;
   q.fillStyle=OUT;q.beginPath();q.roundRect(-5,-6.2,15,12.4,4);q.fill();q.fillStyle=c;q.beginPath();q.roundRect(-4.2,-5.5,13.4,11,3.2);q.fill();
   // vier Finger zu einer Faust gekrümmt, Knöchel vorne
   for(let i=0;i<4;i++){const y=-4.7+i*3.1;q.fillStyle=mixc(c,'#ffffff',.14);q.beginPath();q.arc(8.1,y,1.9,0,7);q.fill();q.fillStyle=shade(c,.6);q.fillRect(2.5,y+1.5,5.6,.7);}
   q.fillStyle=shade(c,.86);q.beginPath();q.ellipse(2.2,3.8,4.6,2.1,-.15,0,7);q.fill();q.strokeStyle=OUT;q.lineWidth=.8;q.stroke();// Daumen quer über die Finger
   q.fillStyle='rgba(255,240,215,.28)';q.fillRect(-2,-5,7,1.4);
   {const fb=this.fistBlood?.[b.side]||0;if(fb>.04){q.fillStyle='rgba(150,16,16,'+(.25+.5*fb).toFixed(2)+')';q.fillRect(-3,-5,8,10);if(fb>.3){q.fillStyle='rgba(110,8,8,.85)';q.fillRect(-4,-1+fb,6,3);}
     q.fillStyle='#a41414';for(let i=0;i<Math.min(4,1+Math.round(fb*4));i++)q.fillRect(6.6+(i%2)*.8,-5.4+i*3.1,2.6,1.9);q.fillStyle='#d03030';q.fillRect(8,-5,1,1);
     if(fb>.5){q.fillStyle='rgba(120,10,10,.8)';q.fillRect(-5.5,-5,2.5,10);}}}
   q.restore();};
  // ---- hinterer Arm
  if(!P.rearFront){const pl=armPolys(P.shB,elB,fB);paint(pl,sk2);drawHand(fB,elB,.8);}
  // ---- hinteres Bein
  paint(legB.polys,shade(skin,.84));drawFoot({...P.footB,x:P.footB.x,y:P.footB.y});
  // ---- Rumpf: V-Form, Brust, Bauchmuskeln, Rückenschatten
  {const hx=P.hip.x,hy=P.hip.y,ux0=P.sh.x-hx,uy0=P.sh.y-hy,L=Math.hypot(ux0,uy0),ux=ux0/L,uy=uy0/L,nx=-uy,ny=ux;
   const prof=[[0,14+FA*3,12.5+FA*2],[.16,11.5+FA*5,11+FA*3],[.4,14+FA*6.5,13+FA*3],[.66,17+mu*4+FA*2+(P.br||0)*2.6,15+mu*.8+FA],[.86,18+mu*3.2+(P.br||0)*1.8,16+mu*.6],[1.0,14+M2*2,13.5],[1.08,7+M2*2,8+M2]];
   const pt=(t,o)=>({x:hx+ux*L*t+nx*o,y:hy+uy*L*t+ny*o});
   const fr=prof.map(([t,f2])=>pt(t,f2*bw)),bk=prof.map(([t,,b2])=>pt(t,-b2*bw));
   const tp=()=>{q.beginPath();fr.forEach((v,i)=>i?q.lineTo(v.x,v.y):q.moveTo(v.x,v.y));for(let i=bk.length-1;i>=0;i--)q.lineTo(bk[i].x,bk[i].y);q.closePath();};
   tp();q.fillStyle=OUT;q.strokeStyle=OUT;q.lineWidth=1.9;q.lineJoin='round';q.stroke();q.fill();tp();q.fillStyle=base;q.fill();
   // Schatten Rückseite und Taille
   q.save();tp();q.clip();q.fillStyle=shade(base,.8);q.beginPath();bk.forEach((v,i)=>i?q.lineTo(v.x,v.y):q.moveTo(v.x,v.y));for(let i=bk.length-1;i>=0;i--){const c=pt(prof[i][0],-prof[i][2]*bw*.25);q.lineTo(c.x,c.y);}q.fill();
   // Bauchmuskeln (Sixpack) und Linea alba
   q.strokeStyle='rgba(50,20,8,'+(.1+.5*abv).toFixed(2)+')';q.lineWidth=1.1;q.beginPath();let a0=pt(.05,6*bw),a1=pt(.47,7*bw);q.moveTo(a0.x,a0.y);q.lineTo(a1.x,a1.y);if(abv>.25)for(let r=0;r<4;r++){const t=.1+r*.1,x0=pt(t,6*bw),x1=pt(t,(13-r*.4)*bw);q.moveTo(x0.x,x0.y);q.lineTo(x1.x,x1.y);}q.stroke();
   q.fillStyle='rgba(255,238,214,'+(.03+.2*abv).toFixed(2)+')';if(abv>.25)for(let r=0;r<4;r++){const c=pt(.13+r*.1,9.5*bw);q.beginPath();q.ellipse(c.x,c.y,3.2,2.1,uy>0?0:Math.atan2(uy,ux)+1.57,0,7);q.fill();}
   // Brustmuskel mit Unterkante, Schlüsselbein, Achsel
   const pc=pt(.72,10*bw);q.fillStyle='rgba(255,238,214,'+(.04+.26*abv).toFixed(2)+')';q.beginPath();q.ellipse(pc.x,pc.y,5+M2*3.5,3.4+M2*2.2,Math.atan2(ux,-uy)+1.2,0,7);q.fill();
   q.strokeStyle='rgba(50,20,8,'+(.12+.5*abv).toFixed(2)+')';q.lineWidth=1.3;const p1=pt(.62,2*bw),p2=pt(.6,16*bw);q.beginPath();q.moveTo(p1.x,p1.y);q.quadraticCurveTo(pt(.55,9*bw).x,pt(.55,9*bw).y,p2.x,p2.y);q.stroke();
   const nip=pt(.66,13*bw);q.fillStyle=shade(base,.62);q.fillRect(nip.x-1,nip.y-1,2.2,2);
   if(FA>.45){q.strokeStyle='rgba(50,20,8,'+(.15+.3*FA).toFixed(2)+')';q.lineWidth=1.2;const f0=pt(.14,6*bw),f1=pt(.2,(12+FA*7)*bw);q.beginPath();q.moveTo(f0.x,f0.y);q.quadraticCurveTo(pt(.13,10*bw).x,pt(.13,10*bw).y,f1.x,f1.y);q.stroke();}
   // Latissimus am Rücken
   q.fillStyle='rgba(50,20,8,'+(.04+.2*abv).toFixed(2)+')';const l0=pt(.45,-9*bw),l1=pt(.75,-12*bw),l2=pt(.8,-4*bw);q.beginPath();q.moveTo(l0.x,l0.y);q.lineTo(l1.x,l1.y);q.lineTo(l2.x,l2.y);q.closePath();q.fill();
   // Schweißglanz
   q.fillStyle='rgba(255,255,255,'+(.07+.14*swt+.04*Math.max(0,Math.sin(this.t*2+b.side))).toFixed(2)+')';const gl=pt(.55,13*bw);q.fillRect(gl.x,gl.y-4,1.8,10);const gl2=pt(.3,12*bw);q.fillRect(gl2.x,gl2.y-3,1.6,7);
   {const nd=Math.round(swt*7);q.fillStyle='rgba(235,245,255,.55)';for(let i=0;i<nd;i++){const c=pt(.08+hash(i*2.3+b.side)*.9,(hash(i*5.7)*26-9)*bw);const dy=((this.t*(.6+hash(i)*.9)+i*7)%9)*swt;q.fillRect(c.x,c.y+dy*.3,1.2,1.2+dy*.08);}}
   if(b.face.blood>.25||b.face.cut>.2||b.face.nose>.6){const br2=this.brun?.[b.side]||0;q.strokeStyle='rgba(150,16,16,.85)';q.lineWidth=1.8;for(let i=0;i<3;i++){const len=.12+.6*br2*(1-i*.22),s1=pt(1.02,(3+i*5)*bw),s2=pt(1.02-len,(4+i*5+Math.sin(i*2+this.t*.4))*bw);q.beginPath();q.moveTo(s1.x,s1.y);q.lineTo(s2.x,s2.y);q.stroke();q.fillStyle='#a01616';q.fillRect(s2.x-1,s2.y,2.3,2.6);}}
   // Prellungen und Blut
   if(b.face.ribs>.15){q.globalAlpha=Math.min(.7,b.face.ribs*.5);q.fillStyle='#6a2c5a';const rb=pt(.35,7*bw);q.beginPath();q.ellipse(rb.x,rb.y,7,9,0,0,7);q.fill();q.globalAlpha=1;}
   if(b.face.blood>.2){q.fillStyle='rgba(150,18,18,.8)';const n=Math.min(10,Math.round(b.face.blood*4));for(let i=0;i<n;i++){const hx2=hash(i*3.1+b.side*7),c=pt(.2+hash(i*1.7)*.6,(hx2-.3)*18*bw);q.fillRect(c.x,c.y,1.6+hx2*2.2,2+hx2*6);}}
   q.restore();
   // Trapezmuskel und Hals
   const nk={x:P.sh.x+2,y:P.sh.y+2};q.fillStyle=OUT;q.beginPath();q.moveTo(nk.x-10,nk.y+6);q.lineTo(P.head.x-5,P.head.y+6);q.lineTo(P.head.x+6,P.head.y+6);q.lineTo(nk.x+10,nk.y+7);q.closePath();q.fill();
   q.fillStyle=base;q.beginPath();q.moveTo(nk.x-8,nk.y+6);q.lineTo(P.head.x-4,P.head.y+7);q.lineTo(P.head.x+5,P.head.y+7);q.lineTo(nk.x+8,nk.y+6);q.closePath();q.fill();q.fillStyle='rgba(60,24,10,.28)';q.fillRect(P.head.x-4,P.head.y+7,3,Math.max(2,nk.y-P.head.y-3));}
  this.loincloth(q,P,T,b);
  paint(legF.polys,base);drawFoot({...P.footF});
  this.head(q,P,b,skin,sk2,hair,A);
  if(P.rearFront){const pl=armPolys(P.shB,elB,fB);paint(pl,skin);drawHand(fB,elB,1);}
  { // vorderer Arm mit Schulterbogen
   const pl=armPolys(P.shF,elF,fF);pl[0].ra=7.5+mw*3.2;paint(pl,skin);drawHand(fF,elF,1);}
  q.restore();}
 drawTrails(q,dt){for(const tr of this.trails||[]){for(const p of tr)p.age+=dt;while(tr.length&&tr[0].age>.18)tr.shift();if(tr.length<2)continue;q.lineCap='round';for(let i=1;i<tr.length;i++){const a=tr[i-1],c=tr[i],k=1-c.age/.18;q.strokeStyle='rgba(255,246,220,'+(k*.6).toFixed(3)+')';q.lineWidth=1+k*4;q.beginPath();q.moveTo(a.x,a.y);q.lineTo(c.x,c.y);q.stroke();}}}
 // Antiker Lendenschurz (subligaculum): Gürtel in Teamfarbe, Leinentuch, schwingender Vorder- und Hinterlappen
 loincloth(q,P,T,b){const ca=P.cloth||0,lin='#d8ccaa',lin2=shade(lin,.84),lin3=shade(lin,.7),O='rgba(44,20,10,.78)',dirt=Math.min(.45,(b.face?.blood||0)*.2),fl=Math.sin(this.t*5+b.side*2)*Math.min(1,Math.abs(ca)*5);
  q.save();q.translate(P.hip.x,P.hip.y);q.rotate(P.lean*.5);q.lineJoin='round';
  const flap=(pts,col,sh)=>{q.beginPath();pts.forEach(([x,y],i)=>i?q.lineTo(x,y):q.moveTo(x,y));q.closePath();q.fillStyle=O;q.strokeStyle=O;q.lineWidth=1.8;q.stroke();q.fill();q.fillStyle=col;q.fill();if(sh){q.fillStyle=sh;q.beginPath();pts.forEach(([x,y],i)=>{const k=i?q.lineTo.bind(q):q.moveTo.bind(q);k(x*.6+pts[0][0]*.4+(x>0?2:0),y*.9+2)});q.closePath();q.globalAlpha=.0;q.fill();q.globalAlpha=1;}};
  // Hinterlappen (schwingt gegenläufig)
  q.save();q.translate(-12,2);q.rotate(-ca*.45+.04);flap([[-7,0],[7,0],[6,13+fl*.5],[-1,16+fl*.5],[-8,12]],lin2);q.fillStyle=T.stripe;q.fillRect(-6,11+fl*.3,12,2);q.restore();
  // Tuch um die Hüfte
  q.beginPath();q.roundRect(-19,-8,38,16,3);q.fillStyle=O;q.fill();q.beginPath();q.roundRect(-17.6,-6.8,35.2,13.6,2.4);q.fillStyle=lin;q.fill();q.fillStyle=lin2;q.fillRect(-17.6,2,35.2,4.8);
  q.strokeStyle=lin3;q.lineWidth=.9;q.beginPath();for(let i=-2;i<=3;i++){q.moveTo(i*6-3,-5);q.lineTo(i*6-5+ca*3,6);}q.stroke();
  // vorderer Lappen mit Saum in Teamfarbe
  q.save();q.translate(2,4);q.rotate(ca);flap([[-7,0],[17,0],[13+fl*.5,21],[4+fl*.6,25],[-3,19]],lin);
  q.fillStyle=lin2;q.beginPath();q.moveTo(3,1);q.lineTo(14,1);q.lineTo(11+fl*.4,19);q.lineTo(5+fl*.5,21);q.closePath();q.fill();
  q.strokeStyle=lin3;q.lineWidth=.9;q.beginPath();q.moveTo(2,3);q.lineTo(3+fl*.2,20);q.moveTo(8,3);q.lineTo(8+fl*.3,22);q.stroke();
  q.fillStyle=T.trunk;q.beginPath();q.moveTo(-3.6,17.5);q.lineTo(13+fl*.5,18.4);q.lineTo(12.4+fl*.5,21);q.lineTo(4+fl*.6,25);q.lineTo(-3,19.5);q.closePath();q.fill();q.fillStyle=T.stripe;q.fillRect(-3,18,15+fl*.4,1.2);
  if(dirt>0){q.globalAlpha=dirt+.15;q.fillStyle='#8a1414';q.fillRect(4,6,3,7);q.fillRect(9,10,2,5);q.globalAlpha=1;}q.restore();
  // Gürtel, Schnalle, hängender Knoten
  q.fillStyle=O;q.fillRect(-20,-12,40,8);q.fillStyle=T.trunk;q.fillRect(-18.8,-10.8,37.6,5.6);q.fillStyle=T.stripe;q.fillRect(-18.8,-10.8,37.6,1.5);q.fillStyle=T.trunkD;q.fillRect(-18.8,-6.6,37.6,1.2);
  q.fillStyle='#e0bb4e';q.fillRect(0,-11,6,6.4);q.fillStyle='#8a6a1c';q.fillRect(1.4,-9.6,3.2,3.6);q.fillStyle='#fff1b0';q.fillRect(.4,-10.4,1.6,1.2);
  q.save();q.translate(-13,-5);q.rotate(-ca*1.1);q.fillStyle=O;q.fillRect(-2.6,0,5.2,13);q.fillStyle=T.trunk;q.fillRect(-1.6,.6,3.2,11.6);q.restore();
  q.restore();}
 head(q,P,b,skin,sk2,hair,A){const M=window.MG;if(!M?.faceShot?.paintHead){return this.headOld(q,P,b,skin,sk2,hair,A);}
  const h=P.head,g=b.g,fz=b.face;if(!this.hcv)this.hcv=[0,1].map(()=>{const c=document.createElement('canvas');c.width=160;c.height=130;return c;});
  const cv=this.hcv[b.side],c=cv.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,160,130);c.imageSmoothingEnabled=false;
  const R=this.f.result,won=R&&R.winner===b.side&&!b.down,out=b.state==='down'||P.eyesShut>.9&&b.hitFlash>0||(R&&R.winner>=0&&R.winner!==b.side);
  const gm=b.gest?(b.gest.k==='chest'||b.gest.k==='flex'?'roar':b.gest.k==='shadow'?'determined':'confident'):null;const heavy=(this.stress?.[b.side]||0)>.5&&(P.br||0)>.55;
  const gaps=(g.teeth?.missing?.length||0)+(b.teethLost?.length||0)-(g.teeth?.gold?.length?0:0);const mood0=out?'out':gm?gm:won?'roar':heavy&&!(b.state==='strike')?'pain':b.state==='stagger'?'shock':(Math.abs(b.headSnap)>.15||b.hitFlash>0)?'pain':b.energy<22?'nervous':b.state==='strike'||b.state==='wind'?'roar':'determined';const mood=mood0==='determined'&&gaps>=4?'dumb':mood0;
  const fixed={...g,teeth:{missing:[...(g.teeth?.missing||[]),...(b.teethLost||[])],gold:g.teeth?.gold||[]}};
  const yaw=out?.5:b.state==='stagger'?.8:1.18;
  try{M.faceShot.paintHead(c,fixed,{yaw,mood},this.t);}catch(e){return this.headOld(q,P,b,skin,sk2,hair,A);}
  // Verletzungen auf dem Kopf (Veilchen, Schwellung, Platzwunde, Nasenblut)
  {const k=v=>Math.min(1,v||0),eyeK=Math.max(fz.eyeL,fz.eyeR);c.save();if(eyeK>.1){c.globalAlpha=Math.min(.8,.35+eyeK*.45);c.fillStyle='#5a2060';c.beginPath();c.ellipse(97,38,8+eyeK*2,6+eyeK*1.6,.1,0,7);c.fill();c.globalAlpha=1;}
   if(fz.cheek>.15){c.globalAlpha=Math.min(.55,fz.cheek*.45);c.fillStyle='#8a3258';c.beginPath();c.ellipse(97,50,9,6,0,0,7);c.fill();c.globalAlpha=1;}
   if(fz.lip>.3){c.fillStyle='#8a1c1c';c.fillRect(96,54,9,2);}
   if(fz.cut>.1){c.fillStyle='#b01818';c.fillRect(92,29,11,2);const brn=(this.brun?.[b.side]||0);c.fillRect(100,31,2,6+brn*30);c.fillRect(99,37+brn*30,4,3);}
   if(fz.nose>.5||fz.blood>.4){c.fillStyle='#a01616';c.fillRect(108,46,2,3+Math.min(10,fz.blood*5));}
   c.restore();}
  const sc=.53;q.save();q.translate(h.x+1,h.y+1);q.rotate(-(b.headSnap||0)*.28);q.imageSmoothingEnabled=false;q.drawImage(cv,-84*sc,-37*sc,160*sc,130*sc);q.restore();}
 headOld(q,P,b,skin,sk2,hair,A){q.save();q.translate(P.head.x,P.head.y+10);q.scale(1.3,1.3);q.translate(-P.head.x,-P.head.y-10);this.head0(q,P,b,skin,sk2,hair,A);q.restore();}
 head0(q,P,b,skin,sk2,hair,A){const h=P.head,g=b.g,fz=b.face,style=A.style??1,beard=A.beard??0;
  // Hals
  q.strokeStyle=sk2;q.lineWidth=11;q.lineCap='round';q.beginPath();q.moveTo(P.sh.x+2,P.sh.y+4);q.lineTo(h.x-1,h.y+8);q.stroke();
  // Schädel und Kiefer
  q.fillStyle='rgba(44,20,10,.74)';q.beginPath();q.ellipse(h.x,h.y,12.3,13.8,0,0,7);q.fill();q.fillStyle=skin;q.beginPath();q.ellipse(h.x,h.y,11.5,13,0,0,7);q.fill();q.beginPath();q.moveTo(h.x-4,h.y+6);q.lineTo(h.x+10,h.y+6);q.lineTo(h.x+9,h.y+12);q.lineTo(h.x+2,h.y+14);q.lineTo(h.x-6,h.y+10);q.fill();
  q.fillStyle=sk2;q.fillRect(h.x-9,h.y-1,3,6);// Ohr
  // Nase (geschwollen und blutig bei Treffern)
  const nose=1+Math.min(1,fz.nose*.6);q.fillStyle=fz.nose>.6?mixc(skin,'#8a3a4a',Math.min(.6,fz.nose*.35)):skin;q.beginPath();q.moveTo(h.x+10,h.y-3);q.lineTo(h.x+10+4*nose,h.y+3);q.lineTo(h.x+10,h.y+4);q.fill();
  // Haare nach Frisur
  q.fillStyle=hair;if(style!==0){q.beginPath();q.ellipse(h.x-2,h.y-6,12,8.5,0,Math.PI*.95,Math.PI*2.05);q.fill();if(style>=2)q.fillRect(h.x-12,h.y-7,6,style>=3?14:9);if(style===4){q.fillRect(h.x-13,h.y+2,5,10);}}
  if(beard>0){q.fillStyle=hair;q.globalAlpha=beard===3?.55:.9;q.beginPath();q.moveTo(h.x-6,h.y+3);q.lineTo(h.x+11,h.y+6);q.lineTo(h.x+9,h.y+(beard===2?17:13));q.lineTo(h.x,h.y+(beard===2?18:14));q.lineTo(h.x-7,h.y+9);q.fill();q.globalAlpha=1;}
  // Auge, Braue, Schwellung
  const eyeK=Math.max(fz.eyeL,fz.eyeR);if(eyeK>.15){q.globalAlpha=Math.min(.8,eyeK*.5);q.fillStyle='#5a2a5e';q.beginPath();q.ellipse(h.x+5,h.y-2,5+eyeK*2,4+eyeK*1.5,0,0,7);q.fill();q.globalAlpha=1;}
  if(fz.cheek>.2){q.globalAlpha=Math.min(.6,fz.cheek*.4);q.fillStyle='#7a3050';q.beginPath();q.ellipse(h.x+3,h.y+4,5,4,0,0,7);q.fill();q.globalAlpha=1;}
  const shut=P.eyesShut>.5||eyeK>1.2;q.fillStyle='#1d1410';if(shut)q.fillRect(h.x+3,h.y-2,5,1.6);else{q.fillStyle='#f3e6c8';q.fillRect(h.x+3,h.y-4,5,3.4);q.fillStyle='#1d1410';q.fillRect(h.x+6,h.y-4,2.2,3.4);}
  q.fillStyle=shade(hair,.8);q.fillRect(h.x+2,h.y-7,8,2);
  if(fz.cut>.1){q.fillStyle='#b01c1c';q.fillRect(h.x+3,h.y-8,6,1.6);const drip=(this.t*6+b.side*3)%8;q.fillRect(h.x+8,h.y-7+drip*.6,1.6,2+drip*.3);}
  // Mund: geschlossen als Linie, offen mit Zahnreihe (Lücken und Goldzähne sichtbar)
  const mx=h.x+6,my=h.y+8;
  if(P.open>.3){const oh=2+P.open*3.2;q.fillStyle='#3a1414';q.fillRect(mx-1,my-1,7,oh+1);
   // Profil: vier vordere Zähne (Index 2–5) als Reihe, oben
   for(let i=0;i<4;i++){q.fillStyle=toothCol(g,b.teethLost,2+i);q.fillRect(mx+i*1.6,my-1,1.5,2.2);if(q.fillStyle===GOLD.toLowerCase()){q.fillStyle=GOLD_HI;q.fillRect(mx+i*1.6,my-1,.8,.8);}}
   q.fillStyle=mixc(TOOTH,'#b0a080',.3);q.fillRect(mx,my+oh-1.2,5,1.2);}
  else{q.fillStyle=fz.lip>.4?'#8a2a2a':'#5a2a22';q.fillRect(mx,my,6,1.6);const gold=(g.teeth?.gold||[]).some(i=>i>=2&&i<=5);if(gold&&Math.sin(this.t*2+b.side)>.6){q.fillStyle=GOLD;q.fillRect(mx+2,my+.4,1.6,1);}}
  if(fz.blood>.3||fz.nose>1){q.fillStyle='#9a1414';q.fillRect(h.x+10,h.y+4,1.6,2+Math.min(5,fz.blood*2));}
  // Schweiß
  if(b.energy<55&&Math.sin(this.t*3+b.side*2)>.7){q.fillStyle='#bfe3f0';q.fillRect(h.x-4,h.y-12+((this.t*12)%6),1.4,2);}
 }
 drawBack(q){const t=this.t,f=this.f,cheer=f?f.cheer:.3;
  // Mauer und Balken
  const g=q.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1a120d');g.addColorStop(.55,'#2c1f16');g.addColorStop(1,'#1a120c');q.fillStyle=g;q.fillRect(0,0,W,H);
  for(let y=4;y<56;y+=9)for(let x=(y/9%2)*12-12;x<W;x+=24){q.fillStyle=hash(x*.3+y)>.5?'#2b2018':'#251b14';q.fillRect(x,y,22,8);}
  q.fillStyle='#3b2a1c';q.fillRect(0,0,W,5);for(const x of [52,160,268]){q.fillStyle='#3a2a1c';q.fillRect(x-4,0,8,58);}
  // Fackeln
  for(const x of [26,294]){const fl=.85+.15*Math.sin(t*13+x)+.08*Math.sin(t*31+x);const gl=q.createRadialGradient(x,24,1,x,24,60*fl);gl.addColorStop(0,'rgba(255,170,80,.42)');gl.addColorStop(1,'rgba(255,120,40,0)');q.fillStyle=gl;q.fillRect(x-70,0,140,100);
   q.fillStyle='#5a3a22';q.fillRect(x-1,22,3,14);q.fillStyle='#ffb347';q.fillRect(x-2,16-fl*2,5,7);q.fillStyle='#fff0a0';q.fillRect(x-1,19-fl,3,4);}
  // Wetttafel
  q.fillStyle='#3b2c20';q.fillRect(134,8,52,22);q.fillStyle='#211812';q.fillRect(136,10,48,18);
  // Publikum (hinten → vorne)
  for(const c of this.crowd){const ex=cheer*(c.row===2?1:.8),bob=Math.sin(t*c.sp+c.phase)*(.6+ex*2.6),jump=ex>.6&&Math.sin(t*c.sp*.5+c.phase)>.3?-2*ex:0,x=Math.round(c.x),y=Math.round(c.y+bob+jump),s=c.size,dark=c.row===0?.6:c.row===1?.75:.9;
   q.fillStyle=shade(c.cloth,dark);q.fillRect(x-5*s,y+2,10*s,12);
   const up=ex>.45&&Math.sin(t*2+c.phase)>-.2;q.fillStyle=shade(c.skin,dark);
   if(up){q.fillRect(x-6*s,y-6+Math.sin(t*c.sp+c.phase)*2,2,8);q.fillRect(x+4*s,y-7+Math.cos(t*c.sp+c.phase)*2,2,9);if(c.coin){q.fillStyle=GOLD;q.fillRect(x+4*s,y-9+Math.cos(t*c.sp+c.phase)*2,2,2);}}
   q.fillStyle=shade(c.skin,dark);q.fillRect(x-3*s,y-5*s,6*s,6*s);q.fillStyle=shade(c.hair,dark);q.fillRect(x-3*s,y-5*s,6*s,2);if(c.hat){q.fillStyle=shade('#6b5a3a',dark);q.fillRect(x-4*s,y-6*s,8*s,2);}
   if(ex>.35&&Math.sin(t*c.sp*.7+c.phase)>0){q.fillStyle='#2a0e0a';q.fillRect(x-1,y-1,2,2);}}
  // Bande vor dem Publikum
  q.fillStyle='#4a3422';q.fillRect(0,100,W,6);q.fillStyle='#5e4430';q.fillRect(0,100,W,1);
  // Ringboden
  const fg=q.createLinearGradient(0,106,0,H);fg.addColorStop(0,'#8a6a44');fg.addColorStop(1,'#5e462c');q.fillStyle=fg;q.fillRect(0,106,W,H-106);
  for(let y=110;y<H;y+=7){q.fillStyle='rgba(60,40,24,.35)';q.fillRect(0,y,W,1);}
  for(let i=0;i<40;i++){q.fillStyle='rgba(50,32,18,.3)';q.fillRect(hash(i*4.1)*W,108+hash(i*7.7)*70,2,1);}
  for(const s of this.stains){q.fillStyle=s.col;q.fillRect(Math.round(this.sx(s.x)),s.y,s.w,1);}
  // Seile hinten mit Pfosten
  for(const x of [10,310]){q.fillStyle='#5a3e26';q.fillRect(x-3,84,6,40);q.fillStyle='#7a5a3a';q.fillRect(x-3,84,6,2);}
  for(const [y,c] of [[92,'#b0905a'],[102,'#a0804c'],[112,'#906f40']]){q.fillStyle=c;q.fillRect(10,y,300,2);q.fillStyle='rgba(0,0,0,.25)';q.fillRect(10,y+2,300,1);}
 }
 drawFront(q){// vorderes Seil und Pfosten
  for(const x of [4,316]){q.fillStyle='#4a3220';q.fillRect(x-3,140,7,40);}q.fillStyle='rgba(176,144,90,.9)';q.fillRect(4,172,312,2);}
 particles(q,dt){const P=this.parts;for(let i=P.length-1;i>=0;i--){const p=P[i];p.life-=dt;if(p.life<=0){P.splice(i,1);continue;}
  if(p.ring){q.strokeStyle='rgba(255,255,255,'+(p.life*4).toFixed(2)+')';q.lineWidth=1;q.beginPath();q.arc(p.x,p.y,p.r+(.2-p.life)*60,0,7);q.stroke();continue;}
  p.vy+=160*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
  if(p.tooth){p.spin+=dt*14;if(p.y>p.ground){p.y=p.ground;p.vy*=-.35;p.vx*=.6;if(Math.abs(p.vy)<8){p.vy=0;p.vx=0;}}q.fillStyle=p.col;q.fillRect(Math.round(p.x),Math.round(p.y),2,Math.abs(Math.sin(p.spin))>.5?3:2);continue;}
  if(p.blood&&p.y>GROUND-4){this.stains.push({x:(p.x-W/2)/K+this.camX,y:Math.round(GROUND-3+Math.random()*8),w:1+Math.round(Math.random()*2),col:'rgba(110,20,20,.65)'});P.splice(i,1);continue;}
  q.fillStyle=p.col;q.fillRect(Math.round(p.x),Math.round(p.y),p.sz,p.sz);}}
 // ---------- Ein Bild ----------

 // ---------- Perspektivenwechsel: Nahaufnahme des echten Gesichts bei harten Kopftreffern ----------
 maybeCut(e,a,d){if((!e.head&&!e.ko)||!window.MG?.faceShot||this.cutOff||this.f.over)return;const f=this.f;if(e.skull&&this.cut)this.cut=null;if(this.cut||f.t-(this.lastCut??-9)<(e.ko||e.force||e.skull?0:2.2))return;
  const big=e.ko||e.crit||e.power>=6.8||(e.kind==='uppercut'&&e.power>=4.5)||(e.kind==='schwinger'&&e.power>=5.4);if(!big&&!e.force&&!e.skull)return;
  this.lastCut=f.t;this.cut={t:0,dur:e.skull?3.5:e.ko?2.3:(this.pendingTooth!=null?1.7:1.5),skull:!!e.skull,victim:d.side,attacker:a.side,kind:e.kind,crit:!!e.crit,power:e.power,dir:a.dir,tooth:this.pendingTooth??null,down:!!e.ko,parts:[],impact:false};this.pendingTooth=null;f.slow=1.6;}
 cutFace(d,k,hit){const f=d.face,v=x=>Math.min(1.5,x||0);return {eyeL:v(f.eyeL),eyeR:v(f.eyeR),cheek:v(f.cheek),nose:v(f.nose),lip:v(f.lip),cut:v(f.cut),blood:v(f.blood)};}
 drawCut(c,dt,s,ox,oy){const C=this.cut;if(!C)return;const f=this.f,M=window.MG;const ts=(C.tooth!=null&&C.t>=.25)?.38:1,dtc=dt*ts;C.t+=dtc;if(C.t>=C.dur){this.cut=null;return;}
  const d=f.b[C.victim],a=f.b[C.attacker],w=Math.round(W*s),h=Math.round(H*s),t=C.t,IMP=.28;
  if(!this.cc){this.cc=document.createElement('canvas');}if(this.cc.width!==w||this.cc.height!==h){this.cc.width=w;this.cc.height=h;}
  const g=this.cc.getContext('2d');
  // Phasen: 0–IMP Faust fliegt heran · IMP Treffer, Kopf schnellt weg · danach Nachwirkung · Ende: Wisch zurück
  const snap=t<IMP?0:Math.pow(Math.max(0,1-(t-IMP)/.9),2.2),since=t-IMP;
  if(!C.impact&&t>=IMP){C.impact=true;this.shake=0;for(let i=0;i<22;i++){const ang=(C.kind==='uppercut'?-1.2:(C.dir>0?0:Math.PI))+(Math.random()-.5)*1.6,sp=60+Math.random()*180;C.parts.push({x:.5,y:.46,vx:Math.cos(ang)*sp/400,vy:Math.sin(ang)*sp/260-.15,life:.9,kind:i<8?'sweat':i<14&&d.face.blood>.3?'blood':'spit'});}
   if(C.tooth!=null)C.parts.push({x:.5,y:.6,vx:C.kind==='uppercut'?C.dir*.08:C.dir*.42,vy:C.kind==='uppercut'?-1.05:-.62,life:2.8,kind:'tooth',spin:0});this.sfx?.hit?.(C.kind,true,C.power,C.crit);}
  const sign=C.dir>0?1:-1;
  const yaw=(C.kind==='uppercut'?0:sign*1.0)*snap*(C.crit?1.15:.9),tilt=(C.kind==='uppercut'?-.32:sign*.3)*snap,sink=(C.kind==='uppercut'?-14:5)*snap;
  const fixed={...d.g,teeth:{missing:[...(d.g.teeth?.missing||[]),...d.teethLost],gold:d.g.teeth?.gold||[]}};
  const mood=t<IMP?'shock':snap>.15?'pain':d.state==='down'||C.down?'out':'pain';
  try{M.faceShot.paint(g,w,h,{g:fixed,mood,team:d.side,yaw:t<IMP?-sign*.35*(t/IMP):yaw,tilt,sink,zoom:1.05+.08*snap+(t<IMP?.1*(t/IMP):0),shake:snap*(C.crit?9:5),lines:t<IMP?.5*(t/IMP):Math.max(0,.6-since*2),box:this.cutFace(d,C),blood:Math.min(1,d.face.blood),hurt:0},this.t);}catch(e){g.fillStyle='#120c09';g.fillRect(0,0,w,h);}
  // Schädelbruch: nach dem Aufprall übernimmt die Verletzungs-Nahaufnahme des Spiels (Knochen, Splitter, Blut), langsamer abgespielt
  if(C.skull&&t>=IMP&&M.injuryShots){const IS=M.injuryShots;try{IS.paint(g,w,h,{kind:'skullfracture',part:'head',g:fixed,cls:'none',helm:false,injury:'Schädelbruch'},IS.HIT-.03+(t-IMP)*.8);}catch(e2){}}
  // Faust: kommt von der Seite des Angreifers (beim Uppercut von unten), drückt ins Gesicht und zieht sich zurück
  const T=TEAM[C.attacker];const fx=(p)=>{const R=h*.46,start=C.kind==='uppercut'?{x:w*.5+sign*w*.05,y:h*1.25}:{x:sign>0?-w*.2:w*1.2,y:h*(C.kind==='schwinger'?.2:.5)},end=C.kind==='uppercut'?{x:w*.5,y:h*.66}:{x:w*(.5-sign*.07),y:h*(C.kind==='schwinger'?.5:.48)};return {x:lerp(start.x,end.x,p),y:lerp(start.y,end.y,p),R};};
  if(t<IMP+.16&&!(C.skull&&t>=IMP)){const p=t<IMP?ease(t/IMP):1-ease((t-IMP)/.16),q2=fx(p);g.save();g.translate(q2.x,q2.y);g.rotate(C.kind==='uppercut'?-.3*sign:sign*.25);
   // Spur
   if(t<IMP){g.globalAlpha=.35;g.fillStyle='#fff4d8';const len=w*.5*(1-p)+20;g.fillRect(sign>0?-len:0,-q2.R*.25,len,q2.R*.5);g.globalAlpha=1;}
   const sk=a.g.appearance?.skin||'#c08a62',R=q2.R;g.fillStyle='rgba(30,14,8,.85)';g.beginPath();g.ellipse(0,0,R*1.04,R*.9,0,0,7);g.fill();
   const gr=g.createRadialGradient(-R*.3,-R*.3,R*.1,0,0,R);gr.addColorStop(0,mixc(sk,'#ffffff',.22));gr.addColorStop(1,shade(sk,.6));g.fillStyle=gr;g.beginPath();g.ellipse(0,0,R,R*.86,0,0,7);g.fill();
   // vier Fingerknöchel, Falten, Daumen, Handgelenk mit Bandage
   for(let i=0;i<4;i++){const yy=(-.5+i/3)*R*1.1;g.fillStyle=shade(sk,.5);g.fillRect(R*.05,yy-s*.5,R*.6,s*.9);g.fillStyle=mixc(sk,'#ffffff',.18);g.beginPath();g.ellipse(R*.62,yy,R*.17,R*.13,0,0,7);g.fill();if(d.face.blood>.2||C.crit){g.fillStyle='#a01616';g.beginPath();g.ellipse(R*.66,yy,R*.09,R*.07,0,0,7);g.fill();}}
   g.fillStyle=shade(sk,.82);g.beginPath();g.ellipse(-R*.1,R*.55,R*.5,R*.2,.4,0,7);g.fill();
   g.fillStyle=T.wrap;g.fillRect(-R*1.05,-R*.5,R*.42,R*1.0);g.fillStyle=T.stripe;g.fillRect(-R*.85,-R*.5,R*.08,R*1.0);
   if(t>=IMP){g.fillStyle='rgba(150,16,16,.7)';for(let i=0;i<5;i++)g.fillRect(R*(.2+hash(i*2.3)*.5),(hash(i*5.1)-.5)*R,s*1.4,s*2.2);}
   g.restore();}
  if(C.tooth!=null&&t>.28&&t<1.0&&Math.random()<dtc*34)C.parts.push({x:.5+(Math.random()-.5)*.06,y:.58,vx:(Math.random()-.5)*.4,vy:-.3-Math.random()*.35,life:1,kind:'blood'});
  // Partikel
  for(let i=C.parts.length-1;i>=0;i--){const p=C.parts[i];p.life-=dtc;if(p.life<=0){C.parts.splice(i,1);continue;}p.vy+=dtc*.9;p.x+=p.vx*dtc;p.y+=p.vy*dtc;const X=p.x*w,Y=p.y*h;
   if(p.kind==='tooth'){if(Math.random()<dtc*70)C.parts.push({x:p.x,y:p.y,vx:0,vy:.05,life:.45,kind:'blood'});p.spin+=dtc*16;g.save();g.translate(X,Y);g.rotate(p.spin);g.fillStyle='#ece4cc';g.fillRect(-s*4.2,-s*5.4,s*8.4,s*10.8);g.fillStyle='#b8ad90';g.fillRect(-s*4.2,s*2.8,s*8.4,s*2.6);g.fillStyle='#8a2a2a';g.fillRect(-s*2.2,s*5,s*4.4,s*1.9);g.fillStyle='#fff8e0';g.fillRect(-s*3.2,-s*4.6,s*2,s*5);g.restore();}
   else{g.globalAlpha=Math.min(1,p.life*2);g.fillStyle=p.kind==='blood'?'#a01818':p.kind==='sweat'?'#cfe8ff':'#f2ecdc';g.fillRect(X,Y,s*(p.kind==='spit'?1.4:2),s*(p.kind==='spit'?1.4:2));g.globalAlpha=1;}}
  // Funkenstern am Mund im Moment des Zahnverlusts
  if(C.tooth!=null&&since>0&&since<.35){const k=since/.35,R2=h*(.05+.2*k);g.save();g.translate(w*.5,h*.6);g.globalAlpha=1-k;g.strokeStyle='#fff6d0';g.lineWidth=Math.max(2,s*1.2);for(let i=0;i<8;i++){const an=i*Math.PI/4+.2;g.beginPath();g.moveTo(Math.cos(an)*R2*.45,Math.sin(an)*R2*.45);g.lineTo(Math.cos(an)*R2,Math.sin(an)*R2);g.stroke();}g.restore();}
  // Aufprall-Blitz
  if(t>=IMP&&since<(C.skull?.2:.09)){g.fillStyle='rgba(255,255,255,'+(C.skull?(.95-since*4.5):(.8-since*8)).toFixed(2)+')';g.fillRect(0,0,w,h);}
  // Übernahme auf die Bühne: diagonaler Wisch hinein und heraus
  const cv=c,k1=Math.min(1,t/.1),k2=t>C.dur-.14?1-(C.dur-t)/.14:0,reveal=k1*(1-k2);
  c.save();c.beginPath();const wx=reveal*(w+h*.4);c.moveTo(ox,oy);c.lineTo(ox+wx,oy);c.lineTo(ox+wx-h*.4,oy+h);c.lineTo(ox,oy+h);c.closePath();c.clip();c.imageSmoothingEnabled=false;const shk=C.skull&&t>=IMP&&t<IMP+.7?(1-(t-IMP)/.7)*s*3:0;c.drawImage(this.cc,ox+(Math.random()-.5)*shk,oy+(Math.random()-.5)*shk);
  // Beschriftung der Nahaufnahme
  const fs=Math.max(14,Math.round(s*9));c.textAlign='center';c.textBaseline='middle';const name={gerade:'TREFFER!',schwinger:'HAKEN!',uppercut:'UPPERCUT!'}[C.kind]+(C.crit?' VOLLTREFFER':'');
  if(!C.skull&&t>IMP&&t<IMP+.9){const k=ease((t-IMP)/.12);c.font=`900 ${Math.round(fs*(1.9-.4*k))}px Georgia,serif`;c.fillStyle='rgba(0,0,0,.6)';c.fillText(name,ox+w/2+3,oy+h*.14+3);c.fillStyle=C.crit?'#ffd25a':'#fff';c.fillText(name,ox+w/2,oy+h*.14);}
  if(C.tooth!=null&&t>IMP+.1&&t<IMP+1.45){c.font=`900 ${Math.round(fs*1.2)}px Georgia,serif`;c.fillStyle='#fff';c.fillText('ZAHN WEG!',ox+w/2,oy+h*.9);}
  c.font=`700 ${Math.round(fs*.8)}px Georgia,serif`;c.fillStyle='rgba(243,226,176,.85)';c.textAlign='left';c.fillText(this.names[C.victim],ox+s*5,oy+h-s*6);
  c.restore();}
 // ---------- Atmung, Schweiß, Blutspuren, Drohgebärden vor dem Kampf ----------
 updateBody(dt){const f=this.f;
  if(this.intro){const I=this.intro;I.t+=dt;const K2=['chest','flex','shadow','point','beckon'];
   f.b.forEach((b,i)=>{const h=Math.floor(hash(((b.g.name||'').length+i*3.7)*1.31)*5),k1=K2[h],k2=K2[(h+2+i)%5];if(I.t<I.dur-.5){const half=I.dur*.5;b.gest=I.t<half?{k:k1,t:I.t,dur:half}:{k:k2,t:I.t-half,dur:half};}else b.gest=null;});
   if(I.t>=I.dur){this.intro=null;for(const b of f.b)b.gest=null;this.big={text:'KAMPF!',sub:'',life:.9,col:'#ffe7a0'};this.onIntroEnd?.();}}
  f.b.forEach((b,i)=>{const cl=this.cloth[i],vx=(b.x-(cl.px||b.x))/Math.max(dt,.001)*b.dir;cl.px=b.x;
   const tg=-clamp(vx*.0028,-.3,.3)+(b.state==='stagger'?-.14:0)+(b.state==='down'?-.2:0);cl.v+=((tg-cl.a)*70-cl.v*13)*dt;
   if(b.hitFlash>.12&&!cl.hit){cl.v-=1.4;cl.hit=true;}else if(b.hitFlash<=0)cl.hit=false;
   if(b.state==='strike'&&!cl.str){cl.v+=(b.act?.hand==='rear'?1.2:.6);cl.str=true;}else if(b.state!=='strike')cl.str=false;
   if(f.over&&f.result?.winner===i)cl.v+=Math.sin(this.t*8.4)*.25;
   cl.a=clamp(cl.a+cl.v*dt,-.4,.4);});
  f.b.forEach((b,i)=>{const ex=clamp(1-b.energy/b.energyMax,0,1),stress=clamp(ex*1.15+clamp(f.t/22,0,1)*.4+(b.cons<b.consMax*.5?.15:0)+(f.over?0:0),0,1.1);this.stress[i]+=(stress-this.stress[i])*Math.min(1,dt*1.2);
   const st=this.stress[i],rate=.8+2.8*st;this.bph[i]+=dt*rate*6.283;this.breath[i]=(Math.sin(this.bph[i])*.5+.5)*(.45+st*1.05);
   this.sweat[i]+=((.04+st*.5)-this.sweat[i])*Math.min(1,dt*.35);
   const hot=b.face.blood>.25||b.face.cut>.2||b.face.nose>.6;this.brun[i]=clamp(this.brun[i]+(hot?dt*.1:-dt*.01),0,1);
   if(b.state==='down'&&f.over)return;const hp=this.headPos(b);
   {const fb=this.fistBlood[i];if(fb>.2&&!(b.state==='down')){const P2=this.pose(b),hs2=clamp((b.g.height||180)/180,.88,1.1),h=Math.random()<.5?P2.fF:P2.fB;if(Math.random()<dt*fb*3.2)this.parts.push({x:this.sx(b.x)+h.x*K*b.dir*hs2,y:GROUND+(h.y+7)*K*hs2,vx:(Math.random()-.5)*4,vy:4,life:.9,col:'#a01818',sz:1,blood:true});}}
   if(hot&&Math.random()<dt*(2+this.brun[i]*5)){this.parts.push({x:hp.x+b.dir*4,y:hp.y+14,vx:(Math.random()-.5)*8,vy:6,life:.8,col:'#a01818',sz:1,blood:true});}});}
 // Kleine Darstellung eines Kämpfers im Ring (für den Vergleich mit der Spielfigur): ruhige Grundstellung vor dem Ringhintergrund
 portrait(canvas,g,side){const BXm=window.BX;if(!BXm)return;const f=BXm.createFight(g,g,1);const old={f:this.f,feet:this.feet,trails:this.trails,camX:this.camX};this.f=f;this.feet=null;this.trails=[[],[]];this.camX=0;
  const b=f.b[0];b.side=side;b.dir=1;b.x=0;f.b[1].x=130;for(let i=0;i<8;i++)this.updateFeet(.05);this.feet[1]=this.feet[0];
  const q=this.q;q.setTransform(1,0,0,1,0,0);this.drawBack(q);this.drawBoxer(q,b);
  const c=canvas.getContext('2d');canvas.width=240;canvas.height=300;c.imageSmoothingEnabled=false;c.fillStyle='#1b2426';c.fillRect(0,0,240,300);c.drawImage(this.buf,W/2-72,28,144,H-28,0,0,240,300);
  this.f=old.f;this.feet=old.feet;this.trails=old.trails;this.camX=old.camX;}
 render(dt){const f=this.f,q=this.q,cv=this.cv;this.t+=dt;if(!f)return;
  this.updateFeet(dt);this.updateBody(dt);const mid=(f.b[0].x+f.b[1].x)/2,ctx2=f.over&&f.result?.winner>=0?mid*.55+f.b[f.result.winner].x*.45:mid;this.camX+=(ctx2-this.camX)*Math.min(1,dt*(f.over?1.5:3));
  this.shake=Math.max(0,this.shake-dt*18);this.zoom=Math.max(0,this.zoom-dt*.25);if(f.over&&f.result?.winner>=0)this.zoom=Math.min(.0,this.zoom);this.flash=Math.max(0,this.flash-dt);
  q.setTransform(1,0,0,1,0,0);this.drawBack(q);
  const z=1+this.zoom,sx=(Math.random()-.5)*this.shake,sy=(Math.random()-.5)*this.shake*.6;q.setTransform(z,0,0,z,W/2*(1-z)+sx,GROUND*(1-z)+sy);
  // Beleuchtung: zwei Fackeln links und rechts an der Wand. Jeder Kämpfer wird einzeln gemalt, von den Fackeln seitlich warm angeleuchtet,
  // von oben nach unten abgedunkelt und wirft für jede Fackel einen eigenen Schatten auf den Boden (aus seiner eigenen Silhouette).
  if(!this.fq){this.fq=document.createElement('canvas');this.sq=document.createElement('canvas');this.fq.width=this.sq.width=W;this.fq.height=this.sq.height=H;}
  const TORCH=[26,294],tf=TORCH.map(x=>.85+.15*Math.sin(this.t*13+x)+.08*Math.sin(this.t*31+x));
  const order=[...f.b].sort((a,b)=>(a.state==='strike'?1:0)-(b.state==='strike'?1:0)||(b.down?1:0)-(a.down?1:0));
  const fc=this.fq.getContext('2d'),sc=this.sq.getContext('2d');
  for(const b of order){const bx=this.sx(b.x);
   q.fillStyle='rgba(14,8,4,.5)';q.beginPath();q.ellipse(bx+(b.down?b.dir*-20:0),GROUND+1,b.down?30:19,3.2,0,0,7);q.fill();
   fc.setTransform(1,0,0,1,0,0);fc.globalCompositeOperation='source-over';fc.clearRect(0,0,W,H);
   this.drawBoxer(fc,b);
   sc.setTransform(1,0,0,1,0,0);sc.globalCompositeOperation='source-over';sc.clearRect(0,0,W,H);sc.drawImage(this.fq,0,0);sc.globalCompositeOperation='source-in';sc.fillStyle='#0c0604';sc.fillRect(0,0,W,H);sc.globalCompositeOperation='source-over';
   TORCH.forEach((tx,i)=>{const d=(bx-tx),kx=clamp(d/150,-1.2,1.2)*.9,al=(.5*tf[i])*(1-Math.min(.5,Math.abs(d)/500));
    q.save();q.globalAlpha=al;q.transform(1,0,-kx,-.2,kx*GROUND,GROUND*1.2);q.drawImage(this.sq,0,0);q.restore();});
   const lg=fc.createLinearGradient(bx-34,0,bx+34,0),lA=.3*tf[0]*(1-Math.min(.7,Math.max(0,bx-26)/420)),rA=.3*tf[1]*(1-Math.min(.7,Math.max(0,294-bx)/420));
   fc.globalCompositeOperation='source-atop';lg.addColorStop(0,'rgba(255,176,86,'+lA.toFixed(3)+')');lg.addColorStop(.42,'rgba(255,176,86,0)');lg.addColorStop(.58,'rgba(255,150,70,0)');lg.addColorStop(1,'rgba(255,150,70,'+rA.toFixed(3)+')');fc.fillStyle=lg;fc.fillRect(0,0,W,H);
   const vg=fc.createLinearGradient(0,GROUND-150,0,GROUND);vg.addColorStop(0,'rgba(255,214,150,.07)');vg.addColorStop(.55,'rgba(20,10,20,0)');vg.addColorStop(1,"rgba(16,8,16,.2)");fc.fillStyle=vg;fc.fillRect(0,0,W,H);
   fc.globalCompositeOperation='source-over';q.drawImage(this.fq,0,0);}
  this.trails=[[],[]];this.particles(q,dt);q.setTransform(1,0,0,1,0,0);this.drawFront(q);
  if(this.flash>0){q.fillStyle='rgba(255,255,255,'+(this.flash*2).toFixed(2)+')';q.fillRect(0,0,W,H);}
  // Vergrößern
  const c=cv.getContext('2d'),dw=cv.width,dh=cv.height;c.imageSmoothingEnabled=false;c.fillStyle='#0d0907';c.fillRect(0,0,dw,dh);const s=Math.min(dw/W,dh/H),ox=(dw-W*s)/2,oy=(dh-H*s)/2;c.drawImage(this.buf,ox,oy,W*s,H*s);
  this.drawCut(c,dt,s,ox,oy);this.hud(c,s,ox,oy,dt);}
 hud(c,s,ox,oy,dt){const f=this.f,X=x=>ox+x*s,Y=y=>oy+y*s,fs=Math.max(10,Math.round(s*5.2));
  c.textBaseline='middle';
  // Balken
  for(const b of f.b){const left=b.side===0,x0=left?X(8):X(W-8)-X(120)+ox,w=X(120)-ox;
   c.font=`700 ${fs}px Georgia,serif`;c.textAlign=left?'left':'right';c.fillStyle=TEAM[b.side].name;c.fillText(this.names[b.side]+(b.downs?' · '+b.downs+'× am Boden':''),left?X(8):X(W-8),Y(7));
   const bar=(y,k,col,h)=>{c.fillStyle='rgba(0,0,0,.55)';c.fillRect(x0,Y(y),w,h*s);c.fillStyle=col;const ww=w*clamp(k,0,1);c.fillRect(left?x0:x0+w-ww,Y(y),ww,h*s);};
   if(this.showBars){bar(13,b.cons/b.consMax,b.cons/b.consMax<.3?'#e0503a':'#d8c25a',3.2);bar(17.6,b.energy/b.energyMax,'#5aa0d8',1.8);}}
  c.textAlign='center';c.font=`700 ${Math.round(fs*1.5)}px Georgia,serif`;const left=Math.max(0,f.limit-f.t);c.fillStyle=left<5&&!f.over?'#ff8a6a':'#f3e2b0';c.fillText(f.over?'—':left.toFixed(1)+' s',X(W/2),Y(19));
  c.font=`${Math.round(fs*.8)}px system-ui,sans-serif`;c.fillStyle='#d7c39a';c.fillText('WETTEN',X(160),Y(13.5));
  if(this.odds){c.fillText(this.odds,X(160),Y(26));}
  // Minibilder: Spielfigur wie in der Arena und das aktuelle Gesicht mit allen Verletzungen
  if(window.MG?.faceShot){this.mf=this.mf||[0,1].map(()=>{const cc=document.createElement('canvas');cc.width=160;cc.height=104;return cc;});this.mfT=(this.mfT||0)-dt;
   for(const b of f.b){const left=b.side===0,pw=27*s,ph=17.5*s,aw=12*s,x0=left?X(8):X(W-8)-pw-aw-2*s,y0=Y(22.5),cc=this.mf[b.side];
    if(this.mfT<=0||!b.mfOk){const gg={...b.g,teeth:{missing:[...(b.g.teeth?.missing||[]),...(b.teethLost||[])],gold:b.g.teeth?.gold||[]}};try{const hurt=b.state==='down'||f.over&&f.result?.winner!==b.side;window.MG.faceShot.paint(cc.getContext('2d'),160,104,{g:gg,mood:hurt?'out':(b.hitFlash>0||Math.abs(b.headSnap)>.2)?'pain':'determined',team:b.side,yaw:left?.5:-.5,zoom:1.15,box:this.cutFace(b),blood:Math.min(1,b.face.blood),hurt:0},this.t);b.mfOk=1;}catch(e){}}
    c.fillStyle='rgba(12,8,5,.7)';c.fillRect(x0-2,y0-2,pw+aw+4+2*s,ph+4);c.strokeStyle=TEAM[b.side].name;c.lineWidth=Math.max(1,s*.5);c.strokeRect(x0-2,y0-2,pw+aw+4+2*s,ph+4);
    const fx=left?x0:x0+aw+2*s,ax=left?x0+pw+2*s:x0;c.imageSmoothingEnabled=false;c.drawImage(cc,fx,y0,pw,ph);
    const am=this.arenaMini?.[b.side];if(am&&am.width){const r=Math.min(aw/am.width,ph/am.height);c.drawImage(am,ax+(aw-am.width*r)/2,y0+(ph-am.height*r),am.width*r,am.height*r);}}
   if(this.mfT<=0)this.mfT=.18;}
  // Wörter über den Köpfen
  c.font=`800 ${fs}px system-ui,sans-serif`;for(let i=this.labels.length-1;i>=0;i--){const l=this.labels[i];l.life-=dt;l.y-=dt*14;if(l.life<=0){this.labels.splice(i,1);continue;}c.globalAlpha=clamp(l.life*2,0,1);c.fillStyle='#000';c.fillText(l.text,X(l.x)+1.5,Y(l.y)+1.5);c.fillStyle=l.col;c.fillText(l.text,X(l.x),Y(l.y));c.globalAlpha=1;}
  // Sprechblasen der Wettenden
  this.bubbleT-=dt;if(this.bubbleT<=0&&!f.over){this.bubbleT=1.4+Math.random()*1.6;this.say('any');}
  c.font=`600 ${Math.round(fs*.82)}px system-ui,sans-serif`;for(let i=this.bubbles.length-1;i>=0;i--){const bb=this.bubbles[i];bb.life-=dt;if(bb.life<=0){this.bubbles.splice(i,1);continue;}const tw=c.measureText(bb.text).width+12,bx=clamp(X(bb.x),ox+tw/2+4,ox+W*s-tw/2-4),by=Y(bb.y)-fs*.6;
   c.globalAlpha=clamp(bb.life*3,0,1);c.fillStyle='rgba(250,240,215,.94)';c.fillRect(bx-tw/2,by-fs*.75,tw,fs*1.5);c.fillStyle=bb.team?'#9e3029':'#2c5c96';c.fillRect(bx-tw/2,by-fs*.75,3,fs*1.5);c.fillStyle='#2a1a10';c.fillText(bb.text,bx,by);c.globalAlpha=1;}
  // Großer Text
  if(this.big){const g=this.big;g.life-=dt;if(g.life<=0)this.big=null;else{c.font=`900 ${Math.round(fs*3)}px Georgia,serif`;c.fillStyle='rgba(0,0,0,.6)';c.fillText(g.text,X(W/2)+3,Y(40)+3);c.fillStyle=g.col||"#ffe7a0";c.fillText(g.text,X(W/2),Y(40));if(g.sub){c.font=`700 ${Math.round(fs*1.4)}px Georgia,serif`;c.fillStyle='#f3e2b0';c.fillText(g.sub,X(W/2),Y(54));}}}
 }
}
window.BXA={Scene,toothCol,TEAM,W,H};
})();
