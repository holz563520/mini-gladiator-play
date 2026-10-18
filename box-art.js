'use strict';
// =====================================================================================================
// FAUSTKAMPF · Nahaufnahme (window.BXA). Eigene Szene wie beim Hahnenkampf: Kellerarena mit Seilen, Fackeln und
// wettendem Publikum; die beiden Kämpfer groß in Seitenansicht. Gezeichnet in ein kleines Pixelbild (320 × 180),
// ganzzahlig vergrößert. Aussehen (Haut, Haar, Frisur, Bart) kommt vom Gladiator, Zähne aus g.teeth (Lücken/Gold).
// Reine Darstellung: liest den Kampfzustand aus box-engine.js, verändert nichts.
// =====================================================================================================
(()=>{
const BX=window.BX;const W=320,H=180,GROUND=168,K=.6;
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
 setFight(f,names){this.f=f;this.seen=0;this.parts=[];this.labels=[];this.bubbles=[];this.stains=[];this.big=null;this.camX=0;this.names=names||[f.b[0].g.name,f.b[1].g.name];}
 sx(x){return W/2+(x-this.camX)*K;}
 // ---------- Ereignisse → Effekte ----------
 consume(sfx){const f=this.f;if(!f)return;while(this.seen<f.events.length){const e=f.events[this.seen++];this.react(e);sfx?.event(e,f);}}
 react(e){const f=this.f,a=f.b[e.who],d=a?.opp;const L={gerade:'GERADE',schwinger:'SCHWINGER',uppercut:'UPPERCUT'};
  if(e.type==='hit'){const head=this.headPos(d);const n=e.crit?14:7;for(let i=0;i<n;i++)this.parts.push({x:head.x+(e.head?0:a.dir*2),y:e.head?head.y:head.y+30,vx:a.dir*(20+Math.random()*50),vy:-30-Math.random()*40,life:.6,col:Math.random()<.7?'#cfe8ff':'#ffffff',sz:1});
   if(e.head&&(e.power>6||d.face.cut>0)&&Math.random()<.6)for(let i=0;i<4+e.power*.6;i++)this.parts.push({x:head.x,y:head.y+3,vx:a.dir*(15+Math.random()*40),vy:-20-Math.random()*30,life:1.2,col:'#a01818',sz:1,blood:1});
   this.parts.push({x:head.x,y:e.head?head.y:head.y+30,ring:1,life:.18,r:2});
   this.labels.push({x:head.x,y:head.y-24,text:L[e.kind]+(e.crit?'!':''),col:e.crit?'#ffd25a':'#fff',life:.9});
   this.shake=Math.min(6,this.shake+(e.crit?4:1.5)+e.power*.12);this.zoom=Math.min(.08,this.zoom+(e.crit?.05:.02));if(e.crit)this.flash=.12;if(Math.random()<.25)this.say('hit');}
  else if(e.type==='block'){const head=this.headPos(d);this.labels.push({x:head.x,y:head.y-24,text:'BLOCK',col:'#9fd0ff',life:.7});this.parts.push({x:head.x+d.dir*8,y:head.y+4,ring:1,life:.14,r:1});if(Math.random()<.12)this.say('block');}
  else if(e.type==='dodge'){const head=this.headPos(d);this.labels.push({x:head.x,y:head.y-24,text:'AUSGEWICHEN',col:'#b9f0a8',life:.8});if(Math.random()<.18)this.say('dodge');}
  else if(e.type==='tooth'){const head=this.headPos(d);this.parts.push({x:head.x+d.dir*6,y:head.y+6,vx:-d.dir*(30+Math.random()*30),vy:-70,life:2.2,tooth:1,spin:0,col:TOOTH,ground:GROUND-2});this.labels.push({x:head.x,y:head.y-34,text:'ZAHN!',col:'#ffffff',life:1.3});this.say('tooth',true);}
  else if(e.type==='down'){this.shake=8;this.zoom=.1;this.big={text:'NIEDERSCHLAG!',sub:'',life:1.6};this.say('down',true);const p=this.sx(d.x);for(let i=0;i<14;i++)this.parts.push({x:p,y:GROUND-2,vx:(Math.random()-.5)*80,vy:-10-Math.random()*25,life:.7,col:'#b79a6c',sz:1});}
  else if(e.type==='rise'){this.big={text:'ER STEHT WIEDER!',sub:'',life:1.1};}
  else if(e.type==='end'){const w=e.winner;this.big={text:e.how==='Unentschieden'?'UNENTSCHIEDEN':e.how==='Punktsieg'?'PUNKTSIEG':e.how.toUpperCase()+'!',sub:w<0?'':this.names[w]+' gewinnt',life:99,col:w===0?TEAM[0].name:w===1?TEAM[1].name:'#ffe7a0'};}
  else if(e.type==='injury'&&e.type!=='Prellung'&&/Platzwunde|Nasenbruch/.test(e.type)){}
 }
 say(kind,force){if(!force&&this.bubbles.length>2)return;const pool=BET_LINES[kind]||BET_LINES.any,txt=pool[Math.floor(Math.random()*pool.length)].replace('{B}',this.names[0].split(' ')[0]).replace('{R}',this.names[1].split(' ')[0]);const s=this.crowd.filter(c=>c.row>0)[Math.floor(Math.random()*this.crowd.filter(c=>c.row>0).length)];this.bubbles.push({x:s.x,y:s.y-10,text:txt,life:1.8,team:s.bet});}
 headPos(b){const P=this.pose(b),h=P.head;const x=this.sx(b.x)+h.x*K*b.dir,y=GROUND+h.y*K+(P.fall?18:0);return {x,y};}
 // ---------- Körperhaltung (cm, Blick nach +x, y nach oben negativ) ----------
 pose(b){const f=this.f,t=f.t,st=b.state,o=b.opp,D=Math.abs(o.x-b.x),ph=t*7+(b.side?1.7:0);
  let crouch=6+Math.sin(ph)*1.6,lean=.08,headX=0,headY=0,fF={x:28,y:-150},fB={x:16,y:-142},open=0,fall=0,arms='guard',footF=16,footB=-22,eyesShut=0;
  const reachX=Math.min(D-20,92),k=b.stT;
  if(st==='wind'||st==='strike'||st==='recover'){const A=b.act,kind=A.kind;let p;
   if(st==='wind')p=-ease(k/A.wind);else if(st==='strike')p=ease(k/A.strike);else p=1-ease(k/A.recover);
   if(kind==='gerade'){if(p<0){fF={x:28+p*6,y:-150};}else{fF={x:lerp(28,reachX,p),y:-152-p*2};lean+=.1*p;}}
   else if(kind==='schwinger'){if(p<0){fB={x:16+p*22,y:-146+p*6};lean-=.05*-p;}else{const ang=lerp(Math.PI*.95,Math.PI*.1,p);fB={x:lerp(-6,reachX-6,p)+Math.sin(p*Math.PI)*4,y:-158-Math.sin(p*Math.PI)*10};lean+=.16*p;open=p>.6?.5:0;}}
   else{if(p<0){fB={x:12,y:-142-p*(-24)};crouch+=10*-p;lean+=.12*-p;}else{fB={x:lerp(12,reachX-14,p),y:lerp(-118,-176,p)};crouch+=10*(1-p);lean+=.05;headY-=3*p;}}
   if(st!=='wind')open=Math.max(open,.4);}
  else if(st==='block'){fF={x:22,y:-166};fB={x:18,y:-160};crouch+=6;lean+=.14;headY+=3;}
  else if(st==='dodge'){const q=Math.sin(clamp(k/b.dodgeT,0,1)*Math.PI);if(b.dodgeDir>0){lean-=.24*q;headX-=12*q;}else{crouch+=20*q;lean+=.32*q;headY+=6*q;}}
  else if(st==='step'){const q=Math.sin(clamp(k/.22,0,1)*Math.PI);footF+=Math.sign(b.vx*b.dir)*6*q;crouch+=2*q;}
  else if(st==='stagger'){lean=-.22;fF={x:22,y:-120};fB={x:6,y:-116};headX-=6;open=.8;eyesShut=.5;}
  if(b.state==='down'){const r=b.downDur||3,q=b.stT;fall=q<.4?ease(q/.4):b.willRise&&q>r-.6?1-ease((q-(r-.6))/.6):1;open=.6;eyesShut=1;}
  // Treffer: Kopf fliegt zurück, Körper klappt ein
  const hs=b.headSnap;if(Math.abs(hs)>.02){if(hs<0){headY-=6*-hs;headX-=4*-hs;}else{headX-=8*hs;}open=Math.max(open,.7*Math.abs(hs));eyesShut=Math.max(eyesShut,Math.abs(hs)>.4?1:0);}
  if(b.bodySnap>0){crouch+=10*b.bodySnap/.25;lean+=.3*b.bodySnap/.25;open=Math.max(open,.5);}
  if(b.hitFlash>0)eyesShut=Math.max(eyesShut,.6);
  // Kampfende: Sieger reißt die Fäuste hoch und grinst, Verlierer erschöpft
  const R=f.result;if(R&&!fall&&f.t-R.time>.3){const won=R.winner===b.side;if(won){fF={x:10,y:-205};fB={x:-4,y:-205};lean=-.05;open=1;arms='up';eyesShut=0;headY-=2;}else if(R.winner!==-1){fF={x:30,y:-100};fB={x:18,y:-96};lean=.4;crouch=16;open=.5;}}
  if(b.energy<25&&!fall&&st==='idle'){fF.y+=14;fB.y+=12;open=Math.max(open,.4);}
  const hip={x:0,y:-92+crouch};const sh={x:hip.x+Math.sin(lean)*55,y:hip.y-Math.cos(lean)*55};const head={x:sh.x+6+headX+Math.sin(lean)*8,y:sh.y-21+headY};
  return {hip,sh,head,fF,fB,lean,open,fall,arms,footF,footB,eyesShut};}
 // ---------- Zeichnen ----------
 drawBoxer(q,b){const P=this.pose(b),g=b.g,A=g.appearance||{},skin=A.skin||'#c08a62',sk2=A.shade||shade(skin,.72),hair=A.hair||'#3a2a1a',T=TEAM[b.side],dir=b.dir;
  q.save();q.translate(Math.round(this.sx(b.x)),GROUND);q.scale(K*dir,K);
  if(P.fall){q.translate(0,0);q.rotate(-P.fall*1.42);q.translate(P.fall*-10,P.fall*-6);}
  const line=(a,c,w,col)=>{q.strokeStyle=col;q.lineWidth=w;q.lineCap='round';q.beginPath();q.moveTo(a.x,a.y);q.lineTo(c.x,c.y);q.stroke();};
  const solve=(r,t,l1,l2,bend)=>{const dx=t.x-r.x,dy=t.y-r.y,d=Math.min(Math.hypot(dx,dy),l1+l2-.01),a=Math.atan2(dy,dx),c=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1));return {x:r.x+Math.cos(a+bend*c)*l1,y:r.y+Math.sin(a+bend*c)*l1};};
  const shF={x:P.sh.x+4,y:P.sh.y+4},shB={x:P.sh.x-4,y:P.sh.y+2};
  const clampReach=(s,t,L)=>{const dx=t.x-s.x,dy=t.y-s.y,d=Math.hypot(dx,dy);return d>L?{x:s.x+dx/d*L,y:s.y+dy/d*L}:t;};
  const fB=clampReach(shB,P.fB,62),fF=clampReach(shF,P.fF,62);
  // Beine
  const footB={x:P.footB,y:0},footF={x:P.footF,y:0},kneeB=solve(P.hip,footB,47,47,-1),kneeF=solve(P.hip,footF,47,47,-1);
  line(P.hip,kneeB,15,shade(skin,.8));line(kneeB,footB,12,shade(skin,.8));q.fillStyle='#3a2a1c';q.fillRect(footB.x-6,-5,16,6);
  // hinterer Arm
  const elB=solve(shB,fB,31,31,1);line(shB,elB,13,sk2);line(elB,fB,11,sk2);this.fist(q,fB,T,.8);
  // Rumpf
  line(P.hip,P.sh,34,skin);line({x:P.sh.x+6,y:P.sh.y+12},{x:P.sh.x+2,y:P.sh.y+26},10,mixc(skin,'#000000',.08));line({x:P.hip.x+5,y:P.hip.y-5},{x:P.sh.x+6,y:P.sh.y+8},10,mixc(skin,'#ffffff',.08));
  line({x:P.hip.x-6,y:P.hip.y-8},{x:P.sh.x-7,y:P.sh.y+10},6,sk2);
  if(b.face.ribs>.15){q.globalAlpha=Math.min(.7,b.face.ribs*.5);q.fillStyle='#6a2c5a';q.beginPath();q.ellipse(P.hip.x+Math.sin(P.lean)*30+4,P.hip.y-30,7,9,0,0,7);q.fill();q.globalAlpha=1;}
  // Lendenschurz
  q.fillStyle=T.trunk;q.save();q.translate(P.hip.x,P.hip.y);q.rotate(P.lean*.5);q.fillRect(-16,-10,32,22);q.fillStyle=T.trunkD;q.fillRect(-16,-10,32,4);q.fillStyle=T.stripe;q.fillRect(-16,4,32,3);q.restore();
  // vorderes Bein
  line(P.hip,kneeF,16,skin);line(kneeF,footF,13,skin);q.fillStyle='#4a3524';q.fillRect(footF.x-6,-5,17,6);
  // Kopf
  this.head(q,P,b,skin,sk2,hair,A);
  // vorderer Arm
  const elF=solve(shF,fF,31,31,1);line(shF,elF,14,skin);line(elF,fF,12,skin);line(shF,{x:lerp(shF.x,elF.x,.6),y:lerp(shF.y,elF.y,.6)},5,mixc(skin,'#ffffff',.1));this.fist(q,fF,T,1);
  q.restore();}
 fist(q,p,T,k){q.fillStyle=k<1?shade(T.wrap,.78):T.wrap;q.beginPath();q.arc(p.x,p.y,7.5,0,7);q.fill();q.fillStyle=k<1?shade(T.stripe,.8):T.stripe;q.fillRect(p.x-7,p.y+1,14,3);}
 head(q,P,b,skin,sk2,hair,A){const h=P.head,g=b.g,fz=b.face,style=A.style??1,beard=A.beard??0;
  // Hals
  q.strokeStyle=sk2;q.lineWidth=11;q.lineCap='round';q.beginPath();q.moveTo(P.sh.x+2,P.sh.y+4);q.lineTo(h.x-1,h.y+8);q.stroke();
  // Schädel und Kiefer
  q.fillStyle=skin;q.beginPath();q.ellipse(h.x,h.y,11.5,13,0,0,7);q.fill();q.beginPath();q.moveTo(h.x-4,h.y+6);q.lineTo(h.x+10,h.y+6);q.lineTo(h.x+9,h.y+12);q.lineTo(h.x+2,h.y+14);q.lineTo(h.x-6,h.y+10);q.fill();
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
 render(dt){const f=this.f,q=this.q,cv=this.cv;this.t+=dt;if(!f)return;
  const mid=(f.b[0].x+f.b[1].x)/2;this.camX+=(mid-this.camX)*Math.min(1,dt*3);
  this.shake=Math.max(0,this.shake-dt*18);this.zoom=Math.max(0,this.zoom-dt*.25);this.flash=Math.max(0,this.flash-dt);
  q.setTransform(1,0,0,1,0,0);this.drawBack(q);
  const z=1+this.zoom,sx=(Math.random()-.5)*this.shake,sy=(Math.random()-.5)*this.shake*.6;q.setTransform(z,0,0,z,W/2*(1-z)+sx,GROUND*(1-z)+sy);
  // Schatten
  for(const b of f.b){q.fillStyle='rgba(20,12,6,.45)';q.beginPath();q.ellipse(this.sx(b.x)+(b.down?b.dir*-20:0),GROUND+1,b.down?34:22,4,0,0,7);q.fill();}
  // der Getroffene/Liegende zuerst, der Angreifer vorne
  const order=[...f.b].sort((a,b)=>(a.state==='strike'?1:0)-(b.state==='strike'?1:0)||(b.down?1:0)-(a.down?1:0));for(const b of order)this.drawBoxer(q,b);
  this.particles(q,dt);q.setTransform(1,0,0,1,0,0);this.drawFront(q);
  if(this.flash>0){q.fillStyle='rgba(255,255,255,'+(this.flash*2).toFixed(2)+')';q.fillRect(0,0,W,H);}
  // Vergrößern
  const c=cv.getContext('2d'),dw=cv.width,dh=cv.height;c.imageSmoothingEnabled=false;c.fillStyle='#0d0907';c.fillRect(0,0,dw,dh);const s=Math.min(dw/W,dh/H),ox=(dw-W*s)/2,oy=(dh-H*s)/2;c.drawImage(this.buf,ox,oy,W*s,H*s);
  this.hud(c,s,ox,oy,dt);}
 hud(c,s,ox,oy,dt){const f=this.f,X=x=>ox+x*s,Y=y=>oy+y*s,fs=Math.max(10,Math.round(s*5.2));
  c.textBaseline='middle';
  // Balken
  for(const b of f.b){const left=b.side===0,x0=left?X(8):X(W-8)-X(120)+ox,w=X(120)-ox;
   c.font=`700 ${fs}px Georgia,serif`;c.textAlign=left?'left':'right';c.fillStyle=TEAM[b.side].name;c.fillText(this.names[b.side]+(b.downs?' · '+b.downs+'× am Boden':''),left?X(8):X(W-8),Y(7));
   const bar=(y,k,col,h)=>{c.fillStyle='rgba(0,0,0,.55)';c.fillRect(x0,Y(y),w,h*s);c.fillStyle=col;const ww=w*clamp(k,0,1);c.fillRect(left?x0:x0+w-ww,Y(y),ww,h*s);};
   bar(13,b.cons/b.consMax,b.cons/b.consMax<.3?'#e0503a':'#d8c25a',3.2);bar(17.6,b.energy/b.energyMax,'#5aa0d8',1.8);}
  c.textAlign='center';c.font=`700 ${Math.round(fs*1.5)}px Georgia,serif`;const left=Math.max(0,f.limit-f.t);c.fillStyle=left<5&&!f.over?'#ff8a6a':'#f3e2b0';c.fillText(f.over?'—':left.toFixed(1)+' s',X(W/2),Y(19));
  c.font=`${Math.round(fs*.8)}px system-ui,sans-serif`;c.fillStyle='#d7c39a';c.fillText('WETTEN',X(160),Y(13.5));
  if(this.odds){c.fillText(this.odds,X(160),Y(26));}
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
