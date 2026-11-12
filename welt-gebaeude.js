'use strict';
// =====================================================================================================================
// GEBÄUDE MIT ART (welt-gebaeude.js) · Aus gezeichnetem Boden wird von selbst ein fertiges Haus. Wunsch Thomas 12.11.2026
// (Dungeon-Keeper-Stil). Nur auf den Rasterkarten-Seiten geladen (arena-theory-2.html, tageslauf-editor.html), nicht im Spiel.
//
// · Gebaut wird in welt-bau.js wie das Trainingsfeld: Werkzeug „Unterkunft“, Rechteck ziehen, Felder werden zu T.UNTERKUNFT.
//   Zusammenhängende Felder derselben Art sind ein Gebäude; Anbauen lässt es zu einem größeren zusammenwachsen.
// · Dieses Modul rechnet daraus das Haus und zeichnet es: Außenwände am Rand (Steinsockel, Putz, Balken, Fenster), eine Tür an
//   der Vorderseite, Betten in Reihen mit Gängen dazwischen, Truhen, Krüge und Wandbretter, darüber ein Ziegeldach mit Schornstein.
// · Dach: wird durchsichtig, wenn die Maus über dem Haus steht, wenn man hineingezoomt hat und das Haus in der Bildmitte liegt
//   oder wenn man es antippt (bleibt dann offen, noch einmal antippen schließt). Offen sind die vorderen Wände nur kniehoch.
// · Leistung: Jedes Haus wird zweimal vorgezeichnet (geschlossen, offen) und nur neu gemalt, wenn sich sein Grundriss ändert.
// · Frühere Fassung (freie Bodenfelder, Holz/Stein, Türen von Hand) ist damit ersetzt. Noch keine Spielwirkung: Betten zählen nur.
// =====================================================================================================================
(()=>{
const M=window.MG,W=window.WeltKarte,H=window.WeltHook,B=M?.weltBau;if(!M||!W||!H||!B||W.T.UNTERKUNFT==null)return;
const T=W.T,N=W.N,TYP=T.UNTERKUNFT,WAND=34,STUMPF=7,STEIG=11,KAPPE=3,TAU=Math.PI*2,clamp=(v,a,b)=>v<a?a:v>b?b:v;
const NB=[[1,0],[-1,0],[0,1],[0,-1]];
// ---------- Grundriss → Haus ----------
function gebiet(k0){const seen=new Set([k0]),st=[k0],tiles=[];while(st.length){const k=st.pop();tiles.push(k);const x=k%N,y=(k/N)|0;for(const [dx,dy] of NB){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=N||ny>=N)continue;const q=ny*N+nx;if(!seen.has(q)&&W.feld[q]===TYP){seen.add(q);st.push(q);}}}return tiles;}
function plan(tiles){const set=new Set(tiles);let bx0=N,by0=N,bx1=0,by1=0;for(const k of tiles){const x=k%N,y=(k/N)|0;if(x<bx0)bx0=x;if(x>bx1)bx1=x;if(y<by0)by0=y;if(y>by1)by1=y;}
 const has=(x,y)=>x>=0&&y>=0&&x<N&&y<N&&set.has(y*N+x);
 // Tür: an einer Vorderkante, möglichst mittig
 let door=null,best=1e9;const mx=(bx0+bx1)/2,my=(by0+by1)/2;
 for(const k of tiles){const x=k%N,y=(k/N)|0;if(!has(x,y+1)){const d=Math.abs(x-mx)+(by1-y)*3;if(d<best){best=d;door={k,side:'y'};}}if(!has(x+1,y)){const d=Math.abs(y-my)+(bx1-x)*3+.4;if(d<best){best=d;door={k,side:'x'};}}}
 // Betten: jede zweite Reihe quer zur längeren Seite, dazwischen bleibt ein Gang frei; das Feld hinter der Tür bleibt frei
 const lang=bx1-bx0>=by1-by0,beds=tiles.filter(k=>{const x=k%N,y=(k/N)|0;return k!==door.k&&(lang?(x-bx0)%2===0:(y-by0)%2===0);}).sort((a,b)=>(a%N+((a/N)|0))-(b%N+((b/N)|0)));
 // Dachhöhe: Ringe vom Rand nach innen (über Eck gezählt), gedeckelt
 const D=new Map();let rand=tiles.filter(k=>{const x=k%N,y=(k/N)|0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(!has(x+dx,y+dy))return true;return false;}),d=1;
 while(rand.length){for(const k of rand)D.set(k,Math.min(d,KAPPE));const next=[];for(const k of rand){const x=k%N,y=(k/N)|0;for(const [dx,dy] of NB){const q=(y+dy)*N+x+dx;if(has(x+dx,y+dy)&&!D.has(q)&&!next.includes(q))next.push(q);}}rand=next.filter(q=>!D.has(q));d++;}
 const dz=(x,y)=>has(x,y)?D.get(y*N+x):0,eck=(cx,cy)=>STEIG*Math.min(dz(cx-1,cy-1),dz(cx,cy-1),dz(cx-1,cy),dz(cx,cy));
 const sufY=[];let m=-1;for(let x=bx1;x>=bx0;x--){for(let y=by1;y>=by0;y--)if(has(x,y)){if(y>m)m=y;break;}sufY[x-bx0]=m;}
 return {id:Math.min(...tiles),tiles:tiles.slice().sort((a,b)=>(a%N+((a/N)|0))-(b%N+((b/N)|0))),set,has,n:tiles.length,bx0,by0,bx1,by1,door,beds,betten:beds.length,eck,sufY,key:W.iso(bx1+1,by1+1).y};}

// ---------- Malen (in die vorgezeichneten Bilder) ----------
const sh=(c,k)=>'rgb('+c.map(v=>Math.round(clamp(v*k,0,255))).join(',')+')';
const PUTZ=[214,196,160],SOCKEL=[122,112,98],BALKEN=[86,58,34],ZIEGEL=[176,82,54],HOLZ=[134,92,52],STROH=[214,186,104];
const DECKEN=[[150,52,44],[70,96,120],[96,112,70],[156,116,62],[112,84,120],[176,160,132]];
function pt(x,y,z=0){const p=W.iso(x,y);return [p.x,p.y-z];}
function quad(g,pts,fill,line){g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();g.fillStyle=fill;g.fill();if(line){g.strokeStyle=line;g.lineWidth=1;g.stroke();}}
// Quader auf dem Boden: Deckfläche, linke und rechte sichtbare Seite
function kiste(g,x0,y0,x1,y1,z0,z1,c,k=1){quad(g,[pt(x0,y1,z0),pt(x1,y1,z0),pt(x1,y1,z1),pt(x0,y1,z1)],sh(c,.72*k));quad(g,[pt(x1,y1,z0),pt(x1,y0,z0),pt(x1,y0,z1),pt(x1,y1,z1)],sh(c,.88*k));quad(g,[pt(x0,y0,z1),pt(x1,y0,z1),pt(x1,y1,z1),pt(x0,y1,z1)],sh(c,1.08*k));}
// Wandfläche von Rasterpunkt (x0,y0) nach (x1,y1), Höhe h. Gemalt wird in Wandkoordinaten: u 0…1 entlang der Wand, v in Bildpunkten nach oben.
function wand(g,x0,y0,x1,y1,h,hell,extra){const p=W.iso(x0,y0),q=W.iso(x1,y1);g.save();g.transform(q.x-p.x,q.y-p.y,0,-1,p.x,p.y);const R=(u,v,du,dv,col)=>{g.fillStyle=col;g.fillRect(u,v,du,dv);};
 R(0,0,1,h,sh(PUTZ,hell));const so=Math.min(6,h*.5);R(0,0,1,so,sh(SOCKEL,hell));for(let i=0;i<4;i++)R(i*.25+(i%2?.02:.1),so*.45,.012,so*.55,sh(SOCKEL,hell*.7));R(0,so*.45,1,.8,sh(SOCKEL,hell*.72));
 if(h>12){for(let i=0;i<7;i++){const s=W.h2(x0*7+i,y0*3+x1,61);R(s*.9,so+2+W.h2(i,x0+y1,62)*(h-so-8),.05,1,sh(PUTZ,hell*(s>.5?.9:1.07)));}R(0,h-4,1,4,sh(BALKEN,hell));R(0,h-4,1,1,sh(BALKEN,hell*1.3));}
 else R(0,h-1.5,1,1.5,sh(PUTZ,hell*1.12));
 R(0,0,.045,h,sh(BALKEN,hell*.9));R(.955,0,.045,h,sh(BALKEN,hell*.9));extra?.(R,h);g.restore();}
const fenster=(hell)=>(R,h)=>{if(h<20)return;const v=h*.42,dv=h*.3;R(.3,v-1,.4,dv+2,sh(BALKEN,hell));R(.34,v,.32,dv,'#1a1410');R(.34,v+dv*.48,.32,1,sh(BALKEN,hell));R(.495,v,.02,dv,sh(BALKEN,hell));R(.22,v-1,.08,dv+2,sh([96,120,84],hell));R(.7,v-1,.08,dv+2,sh([96,120,84],hell));R(.28,v-2.5,.44,1.5,sh(SOCKEL,hell*1.1));};
const tuer=(hell)=>(R,h)=>{const dv=Math.min(h,WAND*.74);R(.22,0,.56,dv+2,sh(BALKEN,hell*.8));R(.27,0,.46,dv,sh(HOLZ,hell));for(let i=1;i<4;i++)R(.27+i*.115,0,.012,dv,sh(HOLZ,hell*.7));R(.27,dv*.3,.46,1.4,sh([60,60,64],hell));R(.27,dv*.72,.46,1.4,sh([60,60,64],hell));R(.63,dv*.48,.05,2.4,sh([200,170,80],hell));};
const brett=(seed)=>(R,h)=>{if(h<20)return;if(seed<.34){R(.2,h*.56,.6,1.6,sh(BALKEN,1));R(.27,h*.56+1.6,.1,5,sh([170,96,60],1));R(.45,h*.56+1.6,.08,3.5,sh([120,130,110],1));R(.6,h*.56+1.6,.12,4.5,sh([190,150,90],1));}
 else if(seed<.6){R(.47,h*.4,.06,7,sh(BALKEN,.9));R(.44,h*.4+7,.12,2,sh([70,60,56],1));R(.46,h*.4+9,.08,4,'#ffb040');R(.48,h*.4+11,.04,3,'#fff0a0');}
 else if(seed<.8){R(.25,h*.62,.5,1.2,sh(BALKEN,1));R(.3,h*.3,.07,h*.32,sh([150,52,44],1));R(.48,h*.36,.07,h*.26,sh([176,160,132],1));R(.64,h*.33,.07,h*.29,sh([70,96,120],1));}};
function bett(g,x,y,seed){const c=DECKEN[(seed*DECKEN.length)|0];kiste(g,x+.1,y+.2,x+.9,y+.8,0,5,HOLZ);kiste(g,x+.1,y+.2,x+.16,y+.8,5,12,HOLZ,.9);// Gestell und Kopfteil
 kiste(g,x+.16,y+.24,x+.88,y+.76,5,7.5,STROH);kiste(g,x+.19,y+.3,x+.34,y+.7,7.5,9.5,[232,224,204]);// Strohsack, Kissen
 kiste(g,x+.42,y+.23,x+.89,y+.77,7.5,8.6,c);quad(g,[pt(x+.42,y+.23,8.7),pt(x+.5,y+.23,8.7),pt(x+.5,y+.77,8.7),pt(x+.42,y+.77,8.7)],sh(c,1.3));// Decke mit umgeschlagenem Rand
 if(seed>.55)quad(g,[pt(x+.6,y+.4,8.8),pt(x+.72,y+.4,8.8),pt(x+.72,y+.6,8.8),pt(x+.6,y+.6,8.8)],sh(c,.8));}
function kram(g,x,y,seed){if(seed<.3){kiste(g,x+.3,y+.32,x+.7,y+.68,0,7,[112,76,42]);kiste(g,x+.3,y+.47,x+.71,y+.53,0,7.4,[70,66,62]);kiste(g,x+.29,y+.31,x+.71,y+.69,7,8.4,[126,88,50]);}
 else if(seed<.5){for(const [dx,dy,r] of [[.38,.42,5],[.6,.56,4]]){const p=pt(x+dx,y+dy);g.fillStyle='rgba(20,14,8,.3)';g.beginPath();g.ellipse(p[0],p[1]+1,r,r*.45,0,0,TAU);g.fill();g.fillStyle=sh([178,104,62],1);g.beginPath();g.ellipse(p[0],p[1]-r,r*.8,r*1.2,0,0,TAU);g.fill();g.fillStyle=sh([120,66,38],1);g.fillRect(p[0]-r*.4,p[1]-r*2.3,r*.8,2);}}
 else if(seed<.66){kiste(g,x+.28,y+.3,x+.72,y+.7,6,8,[140,100,58]);for(const [dx,dy] of [[.3,.32],[.68,.32],[.3,.66],[.68,.66]])kiste(g,x+dx,y+dy,x+dx+.04,y+dy+.04,0,6,BALKEN);const p=pt(x+.5,y+.5,8);g.fillStyle='#c9b27a';g.fillRect(p[0]-3,p[1]-3,4,3);g.fillStyle='#8a2f2a';g.fillRect(p[0]+2,p[1]-2,2,2);}}
function male(h,offen){const m=64,p0=W.iso(h.bx0,h.by1+1),p1=W.iso(h.bx1+1,h.by0),top=W.iso(h.bx0,h.by0).y-(WAND+STEIG*KAPPE+26),bot=W.iso(h.bx1+1,h.by1+1).y+6,ox=Math.floor(p0.x-m/2),oy=Math.floor(top);
 const c=document.createElement('canvas');c.width=Math.ceil(p1.x-p0.x+m);c.height=Math.ceil(bot-top);const g=c.getContext('2d');g.translate(-ox,-oy);const has=h.has,bed=new Set(h.beds);
 for(const k of h.tiles){const x=k%N,y=(k/N)|0,s=W.h2(x,y,51),dr=h.door.k===k;
  // hintere Wände (Innenseite)
  if(!has(x,y-1))wand(g,x,y,x+1,y,WAND,.98,offen?brett(W.h2(x,y,52)):null);if(!has(x-1,y))wand(g,x,y+1,x,y,WAND,.8,offen?brett(W.h2(x,y,53)+.2):null);
  if(offen){if(dr){const a=h.door.side==='y';quad(g,a?[pt(x+.2,y+.45),pt(x+.8,y+.45),pt(x+.8,y+.95),pt(x+.2,y+.95)]:[pt(x+.45,y+.2),pt(x+.95,y+.2),pt(x+.95,y+.8),pt(x+.45,y+.8)],sh([150,52,44],.9),sh([96,30,26],1));}
   else if(bed.has(k))bett(g,x,y,s);else if((!has(x,y-1)||!has(x-1,y))&&s<.66)kram(g,x,y,s);}
  // vordere Wände (Außenseite): geschlossen volle Höhe mit Fenster oder Tür, offen nur kniehoch mit Türlücke
  const front=(x0,y0,x1,y1,hell,istTuer)=>{if(!offen)wand(g,x0,y0,x1,y1,WAND,hell,istTuer?tuer(hell):(x+y)%2===0?fenster(hell):null);
   else if(!istTuer)wand(g,x0,y0,x1,y1,STUMPF,hell);else{const a=W.iso(x0,y0),b=W.iso(x1,y1),L=(u0,u1)=>{g.save();g.transform(b.x-a.x,b.y-a.y,0,-1,a.x,a.y);g.fillStyle=sh(PUTZ,hell);g.fillRect(u0,0,u1-u0,STUMPF);g.fillStyle=sh(SOCKEL,hell);g.fillRect(u0,0,u1-u0,4);g.fillStyle=sh(BALKEN,hell);g.fillRect(u0?u0:u1-.05,0,.05,STUMPF+2);g.restore();};L(0,.24);L(.76,1);}};
  if(!has(x,y+1))front(x,y+1,x+1,y+1,.74,dr&&h.door.side==='y');if(!has(x+1,y))front(x+1,y+1,x+1,y,.94,dr&&h.door.side==='x');}
 if(!offen){// Dach: je Feld eine Fläche, die Ecken steigen vom Rand zur Mitte an
  let hoch=null;for(const k of h.tiles){const x=k%N,y=(k/N)|0,zA=WAND+h.eck(x,y),zB=WAND+h.eck(x+1,y),zC=WAND+h.eck(x+1,y+1),zD=WAND+h.eck(x,y+1),A=pt(x,y,zA),Bp=pt(x+1,y,zB),C=pt(x+1,y+1,zC),Dp=pt(x,y+1,zD);
   const hell=clamp(.86+.016*((zA+zD)-(zB+zC))+.007*((zA+zB)-(zC+zD))+(W.h2(x,y,54)-.5)*.06,.58,1.12);
   if(!has(x,y+1))quad(g,[Dp,C,[C[0],C[1]+3],[Dp[0],Dp[1]+3]],sh(BALKEN,.8));if(!has(x+1,y))quad(g,[C,Bp,[Bp[0],Bp[1]+3],[C[0],C[1]+3]],sh(BALKEN,1));
   quad(g,[A,Bp,C,Dp],sh(ZIEGEL,hell));g.strokeStyle='rgba(60,22,14,.35)';g.lineWidth=1;for(const t of [.2,.4,.6,.8]){g.beginPath();g.moveTo(A[0]+(Dp[0]-A[0])*t,A[1]+(Dp[1]-A[1])*t);g.lineTo(Bp[0]+(C[0]-Bp[0])*t,Bp[1]+(C[1]-Bp[1])*t);g.stroke();}
   g.strokeStyle='rgba(255,210,170,.22)';for(const t of [.1,.3,.5,.7,.9]){g.beginPath();g.moveTo(A[0]+(Dp[0]-A[0])*t,A[1]+(Dp[1]-A[1])*t+.6);g.lineTo(Bp[0]+(C[0]-Bp[0])*t,Bp[1]+(C[1]-Bp[1])*t+.6);g.stroke();}
   const z=zA+zB+zC+zD;if(!hoch||z>hoch.z||(z===hoch.z&&Math.abs(x-(h.bx0+h.bx1)/2)+Math.abs(y-(h.by0+h.by1)/2)<hoch.d))hoch={z,x,y,d:Math.abs(x-(h.bx0+h.bx1)/2)+Math.abs(y-(h.by0+h.by1)/2)};}
  if(hoch&&h.n>=4){const z=hoch.z/4;kiste(g,hoch.x+.36,hoch.y+.36,hoch.x+.64,hoch.y+.64,z-3,z+13,[128,120,108]);kiste(g,hoch.x+.33,hoch.y+.33,hoch.x+.67,hoch.y+.67,z+13,z+15.5,[96,90,82]);const p=pt(hoch.x+.5,hoch.y+.5,z+15.5);h.rauch={x:p[0],y:p[1]};}else h.rauch=null;}
 return {c,ox,oy};}

// ---------- Bestand ----------
let haeuser=[];const alt=new Map(),fest=new Set();
function neu(){const seen=new Set(),out=[];for(let k=0;k<N*N;k++){if(W.feld[k]!==TYP||seen.has(k))continue;const t=gebiet(k);for(const q of t)seen.add(q);const h=plan(t),o=alt.get(h.id);h.sig=h.tiles.join(',');h.offen=o?o.offen:0;if(o&&o.sig===h.sig){h.zu=o.zu;h.auf=o.auf;h.rauch=o.rauch;}out.push(h);}
 alt.clear();for(const h of out)alt.set(h.id,h);for(const id of fest)if(!alt.has(id))fest.delete(id);haeuser=out;}
const hausAt=(tx,ty)=>haeuser.find(h=>tx>=h.bx0&&tx<=h.bx1&&ty>=h.by0&&ty<=h.by1&&h.has(tx,ty));
// Maus über dem Haus öffnet das Dach
let maus=null;W.canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'){maus=null;return;}const r=W.canvas.getBoundingClientRect();maus={sx:e.clientX-r.left,sy:e.clientY-r.top};});W.canvas.addEventListener('pointerleave',()=>{maus=null;});
let last=performance.now();
function zeichne(ctx){const h=this.h;if(!h.zu)h.zu=male(h,false);const a=h.offen;
 if(a>.01){if(!h.auf)h.auf=male(h,true);ctx.drawImage(h.auf.c,h.auf.ox,h.auf.oy);}
 if(a<.99){ctx.globalAlpha=1-a;ctx.drawImage(h.zu.c,h.zu.ox,h.zu.oy);
  if(h.rauch&&!W.mini){const t=performance.now()/1000;for(let i=0;i<4;i++){const u=((t*.22+i/4+h.id*.13)%1),r=2+u*5;ctx.globalAlpha=(1-a)*(1-u)*.5;ctx.fillStyle='#d8d4cc';ctx.fillRect(Math.round(h.rauch.x+Math.sin(u*5+i)*3+u*6-r/2),Math.round(h.rauch.y-4-u*26-r/2),Math.round(r),Math.round(r));}}
  ctx.globalAlpha=1;}}
const items0=H.items;H.items=(items,view)=>{items0?.(items,view);const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;if(!haeuser.length)return;
 const mt=maus&&!B.mode?W.tileAt(W.toWorld(maus.sx,maus.sy).x,W.toWorld(maus.sx,maus.sy).y):null,ct=W.cam.s>=1.5?W.tileAt(W.cam.x,W.cam.y+14):null;
 const hm=mt&&hausAt(Math.floor(mt.tx),Math.floor(mt.ty)),hc=ct&&hausAt(Math.floor(ct.tx),Math.floor(ct.ty));
 for(const h of haeuser){const ziel=fest.has(h.id)||h===hm||h===hc?1:0;h.offen+=clamp(ziel-h.offen,-dt*4,dt*4);
  const p0=W.iso(h.bx0,h.by1+1).x,p1=W.iso(h.bx1+1,h.by0).x;if(p1<view.x0-40||p0>view.x1+40||h.key<view.y0-10||W.iso(h.bx0,h.by0).y-90>view.y1)continue;
  if(!h.item)h.item={y:h.key,h,draw:zeichne};items.push(h.item);}};
// Figuren vor oder hinter dem Haus: Wer südöstlich eines Hausfeldes steht, wird nach dem Haus gezeichnet
H.vorne=(tx,ty,y)=>{for(const h of haeuser){if(y>h.key||tx<h.bx0-2||ty<h.by0-2||tx>h.bx1+3||ty>h.by1+3)continue;const fx=Math.floor(tx),fy=Math.floor(ty);if(fx>h.bx1||fy>h.sufY[Math.max(0,fx-h.bx0)])return h.key+.01;}return y;};
// Schild über dem Haus
const world0=H.world;H.world=(ctx,view,dt)=>{world0?.(ctx,view,dt);if(W.mini)return;const z=clamp(1/W.cam.s,.5,3);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+Math.round(11*z)+'px ui-monospace,Menlo,Consolas,monospace';
 for(const h of haeuser){const p=W.iso((h.bx0+h.bx1+1)/2,(h.by0+h.by1+1)/2),y=p.y-(h.offen>.5?WAND+10:WAND+STEIG*2+16);if(p.x<view.x0-150||p.x>view.x1+150||y<view.y0-30||y>view.y1+30)continue;const s='UNTERKUNFT · '+h.betten+(h.betten===1?' BETT':' BETTEN'),w=ctx.measureText(s).width+8*z;
  ctx.fillStyle='rgba(18,12,9,.8)';ctx.fillRect(Math.round(p.x-w/2),Math.round(y-8*z),Math.round(w),Math.round(16*z));ctx.fillStyle='#f4d37a';ctx.fillText(s,Math.round(p.x),Math.round(y)+1);}};
// Antippen: Dach bleibt offen, noch einmal antippen schließt
const tap0=H.tap;H.tap=(p,w)=>{if(B.mode||w)return tap0?tap0(p,w):false;const t=W.tileAt(p.x,p.y),h=hausAt(Math.floor(t.tx),Math.floor(t.ty));if(!h)return tap0?tap0(p,w):false;if(fest.has(h.id))fest.delete(h.id);else fest.add(h.id);return true;};
B.beiAenderung(neu);neu();
M.weltGebaeude={WAND,haeuser:()=>haeuser,betten:()=>haeuser.reduce((s,h)=>s+h.betten,0),bei(k){if(W.feld[k]!==TYP)return null;const h=plan(gebiet(k));return {n:h.n,betten:h.betten,tuer:h.door};},oeffne(id,an=true){if(an)fest.add(id);else fest.delete(id);},male};
})();
