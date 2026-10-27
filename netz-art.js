'use strict';
/* =====================================================================================================
   WURFNETZ · DARSTELLUNG (Wunsch Thomas 27.10.)
   · flight(): das Netz im Flug – es öffnet sich wie ein Rad, dreht sich, die Bleigewichte am Rand ziehen es auseinander,
     es fliegt im Bogen (Schatten am Boden wird größer), am Wurfarm hängt die Halteleine.
   · onFigure(): ein gefangener Mensch – das Netz fällt über ihn, hängt bis zum Boden, die Gewichte liegen auf; er drückt mit
     beiden Händen dagegen, dreht und zerrt (Pose in arena.js), das Netz beult sich, gegen Ende reißen Maschen und es rutscht ab.
   · onBeast(): dasselbe über Hund, Löwe oder Hahn (gezeichnet nach M.drawRex).
   · drop()/ground: nach dem Losreißen bleibt das Netz zerknüllt am Boden liegen und verblasst.
   Farben nach Güte: Flick- und Fangnetz Hanf, Arena-/Jägernetz helles Seil, Kettennetz Eisen, Silbernetz, Schicksalsnetz Gold.
   Nur Bild – die Regeln (Dauer, Empfindlichkeit) stehen in sim.js (netDuration, netCatch, netFree) und in hund.js/lion.js.
   ===================================================================================================== */
(()=>{
const M=window.MG;if(!M)return;const S=M.s;
const cl=(v,a,b)=>v<a?a:v>b?b:v,TAU=Math.PI*2;
const COL=[['#8f7648','#5f4c2c'],['#b89a62','#735c35'],['#cbb07a','#7f6840'],['#d6c08f','#8a7550'],['#9aa1a6','#5b6166'],['#d2d8dc','#7d858b'],['#dcb65a','#8a6a24']];
const col=q=>COL[cl(Math.round(q??1),0,6)];
const hash=(i,j,k=0)=>{const x=Math.sin(i*127.1+j*311.7+k*74.7)*43758.5453;return x-Math.floor(x);};
const seedOf=a=>{const s=String(a?.id||'');let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return (h>>>0)%997/97;};
function seg(ctx,x0,y0,x1,y1){ctx.moveTo(Math.round(x0)+.5,Math.round(y0)+.5);ctx.lineTo(Math.round(x1)+.5,Math.round(y1)+.5);}
// Gitter zeichnen: P[j][i] Punkte, Zeilen/Spalten verbinden, Löcher (gerissene Maschen) auslassen
function mesh(ctx,P,c,torn=0,weights=true){const R=P.length-1,C=P[0].length-1;
 ctx.lineWidth=1;ctx.strokeStyle=c[1];ctx.globalAlpha*=1;ctx.beginPath();
 for(let j=0;j<=R;j++)for(let i=0;i<C;i++){if(torn&&hash(i,j,1)<torn)continue;const a=P[j][i],b=P[j][i+1];seg(ctx,a.x+.6,a.y+.6,b.x+.6,b.y+.6);}
 for(let j=0;j<R;j++)for(let i=0;i<=C;i++){if(torn&&hash(i,j,2)<torn)continue;const a=P[j][i],b=P[j+1][i];seg(ctx,a.x+.6,a.y+.6,b.x+.6,b.y+.6);}
 ctx.stroke();ctx.strokeStyle=c[0];ctx.beginPath();
 for(let j=0;j<=R;j++)for(let i=0;i<C;i++){if(torn&&hash(i,j,1)<torn)continue;const a=P[j][i],b=P[j][i+1];seg(ctx,a.x,a.y,b.x,b.y);}
 for(let j=0;j<R;j++)for(let i=0;i<=C;i++){if(torn&&hash(i,j,2)<torn)continue;const a=P[j][i],b=P[j+1][i];seg(ctx,a.x,a.y,b.x,b.y);}
 ctx.stroke();ctx.fillStyle=c[1];for(let j=1;j<R;j++)for(let i=1;i<C;i++){const a=P[j][i];ctx.fillRect(Math.round(a.x),Math.round(a.y),1,1);}
 if(weights){ctx.fillStyle='#2c2a26';const last=P[R];for(let i=0;i<=C;i+=1){const a=last[i];ctx.fillRect(Math.round(a.x)-1,Math.round(a.y)-1,3,3);}ctx.fillStyle='#6f6a60';for(let i=0;i<=C;i+=1){const a=last[i];ctx.fillRect(Math.round(a.x)-1,Math.round(a.y)-1,1,1);}}}

// Rautennetz: gerade Zeilen haben C+1 Knoten, ungerade C Knoten dazwischen; jeder Knoten hängt an zwei Knoten der Zeile darunter
function rowsDiamond(R,C,pt){const P=[];for(let j=0;j<=R;j++){const odd=j%2,n=odd?C:C+1,row=[];for(let i=0;i<n;i++){const f=((i+(odd?.5:0))/C)*2-1;row.push(pt(j/R,f,i,j));}P.push(row);}return P;}
function meshD(ctx,P,c,torn=0){const R=P.length-1;const links=[];
 for(let j=0;j<R;j++){const A=P[j],B=P[j+1],odd=j%2;for(let i=0;i<A.length;i++){const ns=odd?[i,i+1]:[i-1,i];for(const k of ns){if(k<0||k>=B.length)continue;if(torn&&hash(i,j,k)<torn)continue;links.push([A[i],B[k]]);}}}
 const last=P[R];for(let i=0;i<last.length-1;i++)links.push([last[i],last[i+1]]);
 ctx.lineWidth=1;ctx.strokeStyle=c[1];ctx.beginPath();for(const [a,b] of links)seg(ctx,a.x+.7,a.y+.7,b.x+.7,b.y+.7);ctx.stroke();
 ctx.strokeStyle=c[0];ctx.beginPath();for(const [a,b] of links)seg(ctx,a.x,a.y,b.x,b.y);ctx.stroke();
 ctx.fillStyle=c[1];for(let j=1;j<R;j++)for(const a of P[j])ctx.fillRect(Math.round(a.x),Math.round(a.y),1,1);
 ctx.fillStyle='#2c2a26';for(const a of last)ctx.fillRect(Math.round(a.x)-1,Math.round(a.y)-1,3,3);ctx.fillStyle='#77716a';for(const a of last)ctx.fillRect(Math.round(a.x)-1,Math.round(a.y)-1,1,1);}

// ---------- Flug ----------
function flight(ctx,p){const k=cl((p.travel||0)/Math.max(1,p.flightRange||1),0,1),t=performance.now()/1000,q=p.snapshot?.w?.item?.q??1,c=col(q);
 const open=1-Math.pow(1-cl(k*1.7,0,1),2),r=5+17*open,lift=Math.sin(Math.PI*k)*24,x=p.x,y=p.y-(p.z||0)-lift,spin=k*5.2+(p.rotation||0);
 ctx.save();
 // Schatten am Boden: wächst mit dem Öffnen
 ctx.fillStyle='rgba(30,26,20,.28)';ctx.beginPath();ctx.ellipse(p.x,p.y+12,r*.9,r*.3,0,0,TAU);ctx.fill();
 // Halteleine zum Werfer (hängt durch)
 if(k<.92){ctx.strokeStyle=c[1];ctx.lineWidth=1;ctx.globalAlpha=.75;ctx.beginPath();const sx=p.startX,sy=p.startY-6,mx=(sx+x)/2,my=Math.max(sy,y)+14+16*k;ctx.moveTo(sx,sy);ctx.quadraticCurveTo(mx,my,x,y);ctx.stroke();ctx.globalAlpha=1;}
 // Netz als sich öffnende Scheibe (Aufsicht schräg): Rand mit Gewichten, Speichen und Ringe
 const N=12,rim=[];for(let i=0;i<N;i++){const an=spin+i/N*TAU,w=1+.12*Math.sin(i*2.3+t*14)*(1-open*.5);rim.push({x:x+Math.cos(an)*r*w,y:y+Math.sin(an)*r*.5*w+r*.12});}
 const ctr={x,y:y-r*.18*open};
 ctx.lineWidth=1;ctx.strokeStyle=c[0];ctx.beginPath();
 for(let i=0;i<N;i++){const a=rim[i],b=rim[(i+1)%N];seg(ctx,a.x,a.y,b.x,b.y);seg(ctx,ctr.x,ctr.y,a.x,a.y);
  const m1={x:ctr.x+(a.x-ctr.x)*.5,y:ctr.y+(a.y-ctr.y)*.5},m2={x:ctr.x+(b.x-ctr.x)*.5,y:ctr.y+(b.y-ctr.y)*.5};seg(ctx,m1.x,m1.y,m2.x,m2.y);}
 ctx.stroke();ctx.fillStyle='#2c2a26';for(const a of rim)ctx.fillRect(Math.round(a.x)-1,Math.round(a.y)-1,3,3);
 ctx.fillStyle=c[1];ctx.fillRect(Math.round(ctr.x)-1,Math.round(ctr.y)-1,3,3);
 ctx.restore();}

// ---------- Mensch im Netz (lokale Figurkoordinaten: Füße bei y=0, Kopf bei etwa y=-62) ----------
function state(a){const b=S.battle,now=b?.time??performance.now()/1000,dur=Math.max(.5,a.netMax||a.netTimer||2),left=Math.max(0,a.netTimer||0);
 return {now,dur,left,u:cl(1-left/dur,0,1),land:cl((now-(a.netAt??now-1))/.24,0,1)};}
function onFigure(ctx,a,time){if(!(a.netTimer>0))return;const st=state(a),c=col(a.netQ),s=(time||st.now)*7.3+seedOf(a),u=st.u;
 const sway=Math.sin(s)*3.2*(1-.4*u),pr=Math.max(0,Math.sin(s*1.7)),pl=Math.max(0,-Math.sin(s*1.7)),slide=u>.84?(u-.84)/.16:0,torn=u>.55?(u-.55)*.6:0,L=st.land;
 const top={x:sway*.7+(pr-pl)*2,y:-77+(1-L)*-24+slide*30};
 const P=rowsDiamond(9,8,(t,f,i,j)=>{const w=(5+19*Math.pow(t,.6))*(.4+.6*L)*(1+(u>.86?(u-.86)/.14*.3:0)),hand=t>.16&&t<.5?(f>0?pr:pl)*6*Math.sin(Math.PI*(t-.16)/.34):0,jit=(hash(i,j,a.netQ||1)-.5)*1.6;
  const y=top.y+(1-top.y)*t*(.15+.85*L)+(1-f*f)*1.8*t*t+(t>.95?Math.abs(Math.sin(i*1.3))*1.2:0);return {x:top.x*(1-t)+f*(w+hand*(Math.abs(f)>.4?1:.3))+jit,y:y+jit*.6};});
 ctx.save();ctx.globalAlpha=.95;meshD(ctx,P,c,torn);
 ctx.fillStyle=c[1];ctx.fillRect(Math.round(top.x)-2,Math.round(top.y)-2,4,3);ctx.fillStyle=c[0];ctx.fillRect(Math.round(top.x)-1,Math.round(top.y)-4,2,2);
 if((pr>.85||pl>.85)&&u>.2){ctx.fillStyle=c[0];for(let n=0;n<3;n++)ctx.fillRect(Math.round((pr>pl?1:-1)*(17+n*2)+Math.sin(s*3+n)*2),Math.round(-44-n*6+Math.cos(s*5+n)*3),1,2);}
 ctx.restore();}

// ---------- Tier im Netz (Weltkoordinaten, nach M.drawRex) ----------
// Ringen im Netz (Tiere): ducken und zurückziehen, nach vorn zerren, um sich schlagen – im Wechsel; am Ende das Losreißen mit Ruck nach vorn.
// Der Körper wird dafür beim Zeichnen verschoben/gedreht; das Netz hängt oben mit, die Gewichte bleiben am Boden.
function beastPose(l){if(!(l.netTimer>0)||l.g?.dead)return null;const st=state(l),f=(l.netFace??(Math.cos(l.a||0)>=0?1:-1)),t=st.now+seedOf(l)*.1,u=st.u,L=st.land;
 const burst=u>.86?(u-.86)/.14:0,per=1.15-.25*u,ph=((t/per)%1+1)%1;let dx=0,lift=0,rot=0,sx=1,sy=1;
 if(ph<.35){const k=Math.sin(ph/.35*Math.PI);dx=-3*f*k;sy=1-.07*k;sx=1+.04*k;rot=.03*f*k;}// ducken, zurückziehen
 else if(ph<.6){const k=Math.sin((ph-.35)/.25*Math.PI);dx=5*f*k;lift=2*k;rot=-.06*f*k;}// nach vorn zerren
 else{const k=Math.sin((ph-.6)/.4*Math.PI);rot=Math.sin(t*26)*.06*k;dx=Math.sin(t*19)*2*k;}// um sich schlagen
 if(burst>0){const k=Math.sin(Math.min(1,burst*1.2)*Math.PI*.5);dx+=9*f*k;lift+=4*Math.sin(burst*Math.PI);rot+=-.1*f*Math.sin(burst*Math.PI)+Math.sin(t*34)*.05;}
 dx*=L;lift*=L;rot*=L;return {f,dx,lift,rot,sx,sy,u,burst,L,st};}
function onBeast(ctx,l,pose){pose=pose||beastPose(l);if(!pose)return;const {f,dx,lift,u,burst,L,st}=pose,c=col(l.netQ),seed=seedOf(l);
 const dog=!!l.dog,big=l.lion?1.05*(l.cute||1):l.hahn?.38:dog?(l.P?.sz||1):.8,hw=l.lion?58*big:l.hahn?22*big*2.6:31*big,h=l.lion?62*big:l.hahn?20*big*2.6:31*big;
 const torn=u>.5?(u-.5)*.6+burst*.6:0,slide=burst,x0=Math.round(l.x)-f*(dog?6*big:4),y0=Math.round(l.y)+2;
 // Netz rutscht beim Losreißen nach hinten ab
 const back=-f*slide*hw*.7,topY=y0-h+(1-L)*-20+slide*h*.45;
 const P=rowsDiamond(7,12,(tt,ff,i,j)=>{const up=1-tt,w=hw*(.3+.7*Math.pow(tt,.55))*(.4+.6*L)*(1+burst*.15),jit=(hash(i,j,l.netQ||1)-.5)*2;
  return {x:x0+ff*w+jit+(dx*1.25+back)*up,y:topY+(y0-topY)*tt*(.2+.8*L)+(1-ff*ff)*3*tt*tt+jit*.6-lift*up};});
 ctx.save();ctx.globalAlpha=.95*(1-Math.max(0,burst-.7)/.3*.5);meshD(ctx,P,c,torn);ctx.restore();}

// ---------- Zerrissenes Netz am Boden ----------
const ground=[];
function drop(a){const b=S.battle;if(!b)return;ground.push({x:a.x,y:a.y,q:a.netQ??1,t0:b.time,big:a.rex?(a.lion?1.6:a.hahn?.6:1.2):1,b:b.id||b});if(ground.length>24)ground.shift();}
function drawGround(ctx,b){if(!ground.length)return;const now=b.time;for(let n=ground.length-1;n>=0;n--){const g=ground[n];if(g.b!==(b.id||b)||now-g.t0>7){ground.splice(n,1);continue;}
 const fade=cl(1-(now-g.t0-5)/2,0,1),c=col(g.q),r=16*g.big,N=10;ctx.save();ctx.globalAlpha=.85*fade;ctx.lineWidth=1;
 const ring=k=>{const out=[];for(let i=0;i<N;i++){const an=i/N*TAU,w=k*(.7+.5*hash(i,k*10,g.q));out.push({x:g.x+Math.cos(an)*r*w,y:g.y+6+Math.sin(an)*r*.35*w});}return out;};
 const A=ring(.45),B=ring(1);ctx.strokeStyle=c[1];ctx.beginPath();for(let i=0;i<N;i++){if(hash(i,3,g.q)<.25)continue;seg(ctx,A[i].x,A[i].y,B[i].x,B[i].y);seg(ctx,B[i].x,B[i].y,B[(i+1)%N].x,B[(i+1)%N].y);seg(ctx,A[i].x,A[i].y,A[(i+1)%N].x,A[(i+1)%N].y);}ctx.stroke();
 ctx.fillStyle='#2c2a26';for(let i=0;i<N;i+=2)ctx.fillRect(Math.round(B[i].x)-1,Math.round(B[i].y)-1,3,2);ctx.restore();}}
const prevU=M.battleUnderlay;M.battleUnderlay=(ctx,b)=>{prevU?.(ctx,b);try{drawGround(ctx,b);}catch(e){}};
// Tiere: Netz nach dem eigentlichen Zeichnen darüberlegen (nach allen anderen Umhüllungen von M.drawRex)
function wrapRex(){const base=M.drawRex;if(!base||base.__net)return!!base;const f=function(ctx,l){const pose=l?.netTimer>0?beastPose(l):null;if(!pose)return base.apply(this,arguments);
 ctx.save();const ax=l.x,ay=l.y;ctx.translate(ax+pose.dx,ay-pose.lift);ctx.rotate(pose.rot);ctx.scale(pose.sx,pose.sy);ctx.translate(-ax,-ay);let r;try{r=base.apply(this,arguments);}finally{ctx.restore();}try{onBeast(ctx,l,pose);}catch(e){}return r;};f.__net=1;M.drawRex=f;return true;}
if(!wrapRex()){const iv=setInterval(()=>{if(wrapRex())clearInterval(iv);},300);}
M.netArt={flight,onFigure,onBeast,beastPose,drop,drawGround,ground,wrapRex,COL};
})();
