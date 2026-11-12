'use strict';
// =====================================================================================================================
// BESUCHER (welt-besucher.js) · Zuschauer kommen über den Weg, setzen sich auf die Tribünen der Arena und gehen wieder.
// Wunsch Thomas 12.11.2026 (wie die Gäste bei RollerCoaster Tycoon). Nur auf tageslauf-editor.html geladen, nicht im Spiel.
//
// · Es sind immer so viele Besucher unterwegs, wie im Editor eingestellt (M.weltBesucher.setze(n)); wer geht, wird ersetzt.
// · Ablauf: Kartenrand → den Weg entlang → am Ludus vorbei zur Arena → freier Sitzplatz (welt-bau.js) → eine Weile sitzen
//   → zurück zum Kartenrand. Ohne freien Platz schauen sie kurz und gehen wieder.
// · Leistung: alle Besucher teilen sich ein Bild (12 Aussehen × 9 Stellungen, 14 × 22 Bildpunkte), kein Bild je Person,
//   keine neuen Objekte je Bild. Weit herausgezoomt nur zwei Rechtecke je Besucher.
// · Noch keine Spielwirkung: kein Eintritt, kein Geld, keine Kämpfe.
// =====================================================================================================================
(()=>{
const M=window.MG,W=window.WeltKarte,H=window.WeltHook,B=M?.weltBau;if(!M||!W||!H||!B)return;
const N=W.N,LUD=W.LUD,WEG=58.5,TAU=Math.PI*2,rnd=(a,b)=>a+Math.random()*(b-a);
// ---------- gemeinsames Bild ----------
const CW=14,CH=22,VAR=12,TUCH=['#b5483c','#3f6f8f','#6d8a3c','#c9a23a','#7a4f8c','#d8d0bc'],HAUT=[['#e0b088','#b88560'],['#a9744c','#7d5234']],HAAR=['#2a1c12','#5e4229','#8a6a42','#3a3a3a'];
const atlas=document.createElement('canvas');atlas.width=CW*9;atlas.height=CH*VAR;
{const g=atlas.getContext('2d');for(let v=0;v<VAR;v++){const tu=TUCH[v%6],[sk,sk2]=HAUT[(v/6)|0],ha=HAAR[v%4];
 for(let f=0;f<9;f++){const ox=f*CW,oy=v*CH,R=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(ox+x,oy+y,w,h);},sit=f===8,left=f>=4&&f<8,ph=f%4;
  if(sit){R(4,9,6,7,tu);R(4,9,2,7,'rgba(0,0,0,.18)');R(3,15,8,3,sk2);R(4,3,6,6,sk);R(4,2,6,2,ha);R(left?5:8,5,1,1,'#20140c');R(3,10,1,4,sk);R(10,10,1,4,sk);continue;}
  g.fillStyle='rgba(15,20,10,.3)';g.fillRect(ox+3,oy+20,8,2);
  const a=[0,2,0,-2][ph];R(5+(a>0?1:0),15,2,a>0?4:5,sk2);R(8-(a<0?1:0),15,2,a<0?4:5,sk2);R(5+a,19,2,1,'#3a2617');R(8-a,19,2,1,'#3a2617');
  R(4,8,6,8,tu);R(left?8:4,8,2,8,'rgba(0,0,0,.18)');R(4,13,6,1,'rgba(0,0,0,.25)');R(3,9+(a>0?1:0),1,4,sk);R(10,9+(a<0?1:0),1,4,sk);
  R(4,2,6,6,sk);R(4,1,6,2,ha);R(left?4:9,2,1,3,ha);R(left?5:8,4,1,1,'#20140c');}}}

// ---------- Sitzplätze der Arenen ----------
let sitze=[],frei=[];
function plaetze(){sitze=[];for(const t of B.tribs()){if(t.a<0)continue;const h=B.HOCH(t.r);for(const [dx,dy] of B.SITZ)sitze.push({x:t.x+dx,y:t.y+dy-h,key:t.y+.02+dy*.0001,tx:(t.k%N)+.5,ty:((t.k/N)|0)+.5,a:t.a,v:null});}
 frei=sitze.slice();for(const v of leute){v.sitz=null;if(v.st!=='weg'){v.st='neu';}}}
function nimmSitz(v){if(!frei.length)return null;const i=(Math.random()*frei.length)|0,s=frei[i];frei[i]=frei[frei.length-1];frei.pop();s.v=v;return s;}
function gibSitz(v){if(v.sitz){v.sitz.v=null;frei.push(v.sitz);v.sitz=null;}}

// ---------- Wege ----------
const P=(tx,ty)=>W.iso(tx+rnd(-.5,.5),ty+rnd(-.5,.5));
function spalte(west,a){let lo=LUD.tx-1.5,hi=LUD.tx+LUD.w+1.5;if(a)for(const k of a.tribs.concat(a.floor)){const x=k%N;if(x-1.5<lo)lo=x-1.5;if(x+2.5>hi)hi=x+2.5;}return west?lo:hi;}
function hin(v){const s=nimmSitz(v),as=B.arenen();v.sitz=s;const c=W.tileAt(v.x,v.y),west=v.west,pts=[];
 if(!as.length){v.ziel=null;v.pts=[P(west?0:N-1,WEG)];v.st='weg';return;}
 const a=s?as[s.a]||as[0]:as[(Math.random()*as.length)|0],col=spalte(west,a),ty=s?s.ty:a.ty+rnd(-2,2);
 if(c.ty>LUD.ty+LUD.h){pts.push(P(col,WEG));}
 if(Math.abs(c.tx-col)>1.5||c.ty>LUD.ty+LUD.h)pts.push(P(col,ty));
 if(s)pts.push({x:s.x,y:W.iso(s.tx,s.ty).y});v.pts=pts;v.st='hin';}
function weg(v){gibSitz(v);const c=W.tileAt(v.x,v.y),a=B.arenen()[0],col=spalte(v.west,a);v.pts=[P(col,c.ty),P(col,WEG),P(v.west?-1:N,WEG)];v.st='weg';}

// ---------- Besucher ----------
const leute=[];let soll=100;
function zeichne(ctx){const x=Math.round(this.dx),y=Math.round(this.dy);
 if(W.mini){ctx.fillStyle=TUCH[this.v%6];ctx.fillRect(x-3,y-11,6,9);ctx.fillStyle=HAUT[(this.v/6)|0][0];ctx.fillRect(x-2,y-16,5,5);return;}
 ctx.drawImage(atlas,this.f*CW,this.v*CH,CW,CH,x-10,y-(this.f===8?25:31),21,33);}// anderthalbfach, damit sie neben den Gladiatoren nicht winzig wirken
function neuer(vorlauf){const west=Math.random()<.5,p=P(west?-1:N,WEG),v={x:p.x,y:p.y,dx:p.x,dy:p.y,west,v:(Math.random()*VAR)|0,f:0,sp:rnd(30,44),seed:Math.random()*10,st:'neu',pts:null,sitz:null,t:0,draw:zeichne};leute.push(v);
 if(vorlauf){hin(v);if(v.st==='hin'&&v.sitz&&Math.random()<.6){v.x=v.sitz.x;v.y=W.iso(v.sitz.tx,v.sitz.ty).y;v.pts=[];v.st='sitz';v.t=rnd(5,110);}
  else if(v.pts&&v.pts.length){const i=(Math.random()*v.pts.length)|0,a=i?v.pts[i-1]:v,b=v.pts[i],u=Math.random();v.x=a.x+(b.x-a.x)*u;v.y=a.y+(b.y-a.y)*u;v.pts=v.pts.slice(i);}}}
function setze(n){soll=Math.max(0,n|0);while(leute.length>soll)gibSitz(leute.pop());while(leute.length<soll)neuer(true);}
function schritt(v,dt){if(v.st==='neu'){hin(v);}
 if(v.st==='sitz'){v.t-=dt;v.f=8;const s=v.sitz;if(!s){v.st='neu';return;}v.dx=s.x;v.dy=s.y;v.y=s.key;if(v.t<=0)weg(v);return;}
 if(v.st==='schaut'){v.t-=dt;if(v.t<=0)weg(v);v.dx=v.x;v.dy=v.y;return;}
 const p=v.pts&&v.pts[0];if(!p){if(v.st==='hin'){if(v.sitz){v.st='sitz';v.t=rnd(40,120);}else{v.st='schaut';v.t=rnd(4,10);}}else v.st='fort';return;}
 const ex=p.x-v.x,ey=p.y-v.y,d=Math.hypot(ex,ey),step=v.sp*dt;if(d<=step){v.x=p.x;v.y=p.y;v.pts.shift();}else{v.x+=ex/d*step;v.y+=ey/d*step;}
 v.f=(ex<0?4:0)+(((clock*v.sp/6+v.seed)|0)&3);v.dx=v.x;v.dy=v.y;}
let clock=0;
const tick0=H.tick;H.tick=dt=>{tick0?.(dt);clock+=dt;for(let i=leute.length-1;i>=0;i--){const v=leute[i];schritt(v,dt);if(v.st==='fort'){leute[i]=leute[leute.length-1];leute.pop();}}
 for(let k=0;k<3&&leute.length<soll;k++)neuer(false);};
const items0=H.items;H.items=(items,view)=>{items0?.(items,view);const x0=view.x0-10,x1=view.x1+10,y0=view.y0-10,y1=view.y1+60;for(const v of leute){if(v.dx<x0||v.dx>x1||v.dy<y0||v.dy>y1)continue;items.push(v);}};
B.beiAenderung(plaetze);plaetze();setze(soll);
M.weltBesucher={setze,get zahl(){return leute.length;},get soll(){return soll;},leute:()=>leute,sitze:()=>sitze,freie:()=>frei.length};
})();
