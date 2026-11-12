// SCHILD-BILDER (Wunsch Thomas 12.11.2026): jeder Schild hat eine Vorderseite (Bemalung, Buckel, Beschlag) und eine Rückseite (Bretter, Griff, Armriemen).
// Reine Darstellung wie weapon-art.js: zwischengespeicherte Pixelbilder, keine Regel, kein Zufall aus dem Spiel, kein Spielstand.
// Notausschalter ohne neue Veröffentlichung: localStorage['mg-schild-art']='off' → bisherige Zeichnung in arena.js.
(()=>{'use strict';
const M=window.MG,TAU=Math.PI*2,cache=new Map();let hits=0,misses=0,off=null;
// Größen wie bisher (Grundmaß × Größenfaktor), aber in ganzen Bildpunkten gezeichnet statt skaliert.
const GEO={buckler:{round:1,r:8,boss:3,rim:1,metal:1},smallshield:{round:1,r:10,boss:3,rim:1},roundshield:{round:1,r:13,boss:3.6,rim:2},scutum:{hw:9,hh:14,top:2.5,bot:2.5,rim:1},tower:{hw:12,hh:18,top:6,bot:2.5,rim:2}};
const rgb=h=>{const n=parseInt(h.slice(1,7),16);return [n>>16,(n>>8)&255,n&255]},hex=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
const mix=(a,b,t)=>{const A=rgb(a),B=rgb(b);return hex(A.map((v,i)=>v+(B[i]-v)*t))};
const LIGHT='#fff1cf',DARK='#131a1d';
// Helligkeit in festen Stufen, damit es Pixelkunst bleibt und kein Verlauf wird.
const sh=(c,t)=>{t=Math.round(t*5)/5;return t>0?mix(c,LIGHT,Math.min(.8,t*.5)):t<0?mix(c,DARK,Math.min(.85,-t*.58)):c};
const seed=s=>[...s].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,17);
const noise=(x,y,k)=>{let v=Math.imul(x+139,k+73)^Math.imul(y+631,2246822519);v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967295};
function inside(G,x,y){if(G.round)return x*x+y*y<=(G.r+.4)*(G.r+.4);const ax=Math.abs(x),ay=Math.abs(y);if(ax>G.hw||ay>G.hh)return false;const c=y<0?G.top:G.bot,dx=ax-(G.hw-c),dy=ay-(G.hh-c);return !(dx>0&&dy>0&&dx*dx+dy*dy>c*c+.5);}

function build(def,q,team,rear,flash){
 const G=GEO[def],hw=G.round?G.r:G.hw,hh=G.round?G.r:G.hh,W=hw*2+3,H=hh*2+3,ox=hw+1,oy=hh+1,look=M.itemLook({kind:'shield',def,q}),k=seed(def)+q*7;
 const metal=look.metal,edge=look.edge,trim=look.trim,field0=team?'#854b3e':look.cloth,round=!!G.round,r=G.r,rb=G.boss||3,rimW=G.rim;
 const px=new Array(W*H).fill(null),mt=new Uint8Array(W*H),dep=new Int8Array(W*H),at=(x,y)=>(y+oy)*W+x+ox;
 const ok=(x,y)=>x>=-ox&&x<W-ox&&y>=-oy&&y<H-oy&&dep[at(x,y)]>0;
 const set=(x,y,c,m=0)=>{x=Math.round(x);y=Math.round(y);if(!ok(x,y))return;const i=at(x,y);px[i]=c;mt[i]=m;};
 const inner=(x,y)=>ok(x,y)&&dep[at(x,y)]>1+rimW;
 const put=(x,y,c,m=0)=>{x=Math.round(x);y=Math.round(y);if(inner(x,y))set(x,y,c,m);};
 for(let y=-hh;y<=hh;y++)for(let x=-hw;x<=hw;x++)if(inside(G,x,y))dep[at(x,y)]=9;
 for(let d=1;d<=5;d++){const hit=[];for(let y=-hh;y<=hh;y++)for(let x=-hw;x<=hw;x++){const i=at(x,y);if(dep[i]!==9)continue;if([dep[i-1],dep[i+1],dep[i-W],dep[i+W]].some(v=>v===d-1))hit.push(i);}for(const i of hit)dep[i]=d;}
 const OUT=q===0?'#2a2520':'#29342f',hide=q===0,rimC=hide?mix(trim,'#93795a',.55):metal;
 const wood0=q===0?'#7b6347':'#8a6c48',E=q===1?sh(field0,.6):q>=5?metal:trim;
 // Licht von links oben. Runde Schilde sind gewölbt, eckige um die Hochachse gebogen.
 const light=(x,y)=>round?(-x-y)/(1.6*r):(()=>{const u=x/hw;return .5*Math.exp(-((u+.38)**2)/.07)-.8*u*u*(u>0?1.2:.7)-y/hh*.12})();
 const plank=(x,y,base,amp=.45)=>{const pi=Math.floor((x+60)/3);let t=(noise(pi,7,k)-.5)*amp;if((x+60)%3===0)t-=.5;else if(noise(x,y,k+3)>.9)t-=.18;return [base,t];};
 const rivet=(x,y)=>{x=Math.round(x);y=Math.round(y);if(ok(x,y)&&dep[at(x,y)]>1)set(x,y,hide?'#3b3027':edge,hide?0:1);};

 if(!rear){
  const F=G.metal&&q>0?mix(metal,'#39403f',.3):q===0?wood0:field0,rf=round?r-1-rimW:0;
  const emblem=(x,y)=>{const ax=Math.abs(x),ay=Math.abs(y);
   if(round){const d=Math.hypot(x,y),a=Math.atan2(y,x),bw=r>=12?1:0,ray=(n,lim)=>d>rb+1.4&&d<lim&&Math.cos(a*n)>.15+.8*(d-rb-1)/(lim-rb-1);
    if(G.metal){if(q>=1&&Math.abs(d-(rb+2.3))<.5)return q>=4?trim:sh(F,-.7);if(q>=5&&d>rb+3&&Math.cos(a*4)>.82)return trim;return null;}
    if(q===1)return ax<=bw?E:null;
    if(q===2)return ax<=bw||ay<=bw?E:null;
    if(q===3)return x===0||y===0?E:(x>0)!==(y>0)?sh(F,-.55):null;
    if(q===4)return ray(4,rf+.5)?E:null;
    if(q===5)return Math.abs(d-(rf-1.2))<.6?E:ray(4,rf-2)?E:null;
    if(q===6)return Math.abs(d-(rf-.6))<.6?E:ray(6,rf-1.6)?E:d<rf*.6?sh(F,.5):null;
    return null;}
   if(def==='scutum'){const diag=Math.abs(ax-ay*(hw-3)/(hh-3))<.62,bolt=x===0&&ay>=5&&ay<=hh-3||ax===1&&(ay===hh-5||ay===6),wing=ax>=5&&ax<=7&&(ay===0&&ax<=7||ay===2&&ax<=7||ay===1&&ax===5||ay===3&&ax<=6&&ax>=6),corner=ay===hh-3&&ax>=hw-5&&ax<=hw-3||ax===hw-3&&ay>=hh-6&&ay<=hh-3;
    if(q>=1&&q<=3&&q!==2){if(x===0)return sh(F,.55);if(x===1)return sh(F,-.5);}
    if(q===2)return x===0||y===0?E:null;
    if(q===3)return diag&&(ax>4||ay>3)?E:null;
    if(q===4)return bolt||wing?E:null;
    if(q===5)return bolt||wing||corner?E:null;
    if(q===6){const d=Math.hypot(x,y*.8);return bolt||corner||(Math.abs(d-6.4)<.7&&((Math.round(Math.atan2(y,x)*14/TAU)+14)%2===0||ax>5))?E:null;}
    return null;}
   // Turmschild: Feld zwischen den Eisenbändern
   const yb=Math.round(hh*.5);if(ay>=yb-1)return q>=5&&(ax===6||ax===2)&&(ay===yb+4)?edge:null;
   if(q===2)return x===0?E:null;
   if(q===3)return Math.abs(y+ax*.6-1)<.6||Math.abs(y+ax*.6-5)<.6?E:null;
   if(q===4)return Math.abs(ax/8+ay/6.5-1)<.09?E:null;
   if(q>=5){const m=ax/8+ay/6.5;return Math.abs(m-1)<.09?E:m<1?sh(F,q===6?.5:-.5):null;}
   return null;};
  for(let y=-hh;y<=hh;y++)for(let x=-hw;x<=hw;x++){const i=at(x,y),d=dep[i];if(!d)continue;
   if(d===1){px[i]=OUT;continue;}
   const L=light(x,y);
   if(d<=1+rimW){px[i]=sh(rimC,L+(d===2?.25:-.3)+(hide?(noise(x,y,k)-.5)*.5:0));mt[i]=hide?0:1;continue;}
   if(d===2+rimW&&q>=4&&!G.metal){px[i]=sh(trim,L*.6);continue;}
   if(q===0){const [b,t]=plank(x,y,F);px[i]=sh(b,t+L*.5);continue;}
   const em=emblem(x,y);px[i]=sh(em||F,L*(G.metal?1.1:.75)+(em?.1:0)+(q===1&&!G.metal&&(x+60)%3===0?-.18:0));if(G.metal)mt[i]=1;}
  if(def==='tower'){const yb=Math.round(hh*.5);for(const s of [-1,1])for(let x=-hw;x<=hw;x++){const top=s*yb-(s>0?0:1);
    if(q===0){put(x,top,sh('#5d4a36',.25));put(x,top+1,sh('#5d4a36',-.45));if((x+60)%5===0)put(x,top,'#2f2823');}
    else{put(x,top,sh(metal,light(x,0)+.25),1);put(x,top+1,sh(metal,light(x,0)-.5),1);if((x+60)%4===0)put(x,top,edge,1);}}
   if(q>=3)for(let x=-hw;x<=hw;x++)for(let y=hh-4;y<=hh;y++)if(inner(x,y))set(x,y,y===hh-4?sh(metal,-.7):sh(metal,light(x,0)-.15),1);}
  if(q===0){/* Flickwerk: Riss, aufgenähter Flicken, Seil */
   let cx=-Math.round(hw*.45);for(let y=-hh+3;y<Math.round(hh*.35);y++){put(cx,y,'#2f2823');if(noise(y,3,k)>.55)cx+=noise(y,5,k)>.5?1:-1;}
   const fx=Math.round(hw*.2),fy=Math.round(hh*.3),fw=Math.max(3,Math.round(hw*.45)),fh=Math.max(3,Math.round(hh*.28));
   for(let y=0;y<fh;y++)for(let x=0;x<fw;x++)put(fx+x,fy+y,(x===0||y===0||x===fw-1||y===fh-1)&&(x+y)%2?'#2f2823':sh(field0,light(fx+x,fy+y)*.5+(noise(x,y,k)-.5)*.3));
   if(!round)for(let x=-hw;x<=hw;x++){put(x,-Math.round(hh*.55),(x+60)%2?'#b59b6c':'#7a6645');}}
  /* Buckel */
  if(def==='scutum'){for(let y=-3;y<=3;y++)for(let x=-4;x<=4;x++){const b=Math.abs(x)===4||Math.abs(y)===3,d=Math.hypot(x,y);set(x,y,b?sh(metal,-.75):d<=2.3?sh(metal,.3-(x+y)*.22):sh(metal,light(x,y)*.4-.1),1);}set(-1,-1,edge,1);if(q>=2)for(const [x,y] of [[-3,-2],[3,-2],[-3,2],[3,2]])set(x,y,edge,1);}
  else{for(let y=-5;y<=5;y++)for(let x=-5;x<=5;x++){const d=Math.hypot(x,y);if(d>rb+1.25)continue;set(x,y,d>rb+.3?'#34322c':sh(metal,(-x-y)/(rb*1.25)),1);}set(-1,-1,edge,1);if(rb>3)set(-2,-1,edge,1);}
  if(q===5){set(0,0,trim,1);}
  if(q===6){set(0,0,'#b8433a');set(1,0,'#8d2f2b');set(0,1,'#8d2f2b');set(1,1,'#6f2422');set(0,0,'#e58a6a');}
  /* Nieten im Rand */
  if(round){const n=q===0?5:r>=12?12:8;for(let j=0;j<n;j++){const a=(j+.5)*TAU/n;rivet(Math.cos(a)*(r-1.2),Math.sin(a)*(r-1.2));}}
  else if(q>=1){for(const s of [-1,1]){rivet(0,s*(hh-1));for(const f of [-.5,0,.5])rivet(s*(hw-1),Math.round(hh*f));}}
 }else{
  const Wd=q===0?'#6e5a43':q>=3?'#7d5b3b':'#8b6b47',lined=q>=5,lin=mix(field0,'#1c2224',.42),leather='#5b3f2c',leatherD='#3f2c1f',iron=sh(metal,-.5);
  const lb=(x,y)=>round?(x+y)/(1.6*r)*.75-.15:(()=>{const u=x/hw;return -.45+.75*u*u+(u>0?.2:0)+y/hh*.1})();
  for(let y=-hh;y<=hh;y++)for(let x=-hw;x<=hw;x++){const i=at(x,y),d=dep[i];if(!d)continue;
   if(d===1){px[i]=OUT;continue;}
   if(d<=1+rimW){px[i]=sh(rimC,-.55+lb(x,y)*.5+(d===2?.2:0));mt[i]=hide?0:1;continue;}
   if(lined){px[i]=d===2+rimW&&(x+y)%2===0?sh(E,-.2):sh(lin,lb(x,y)*.7+(noise(x,y,k)-.5)*.16);continue;}
   const [b,t]=plank(x,y,Wd,q===0?.6:.4);px[i]=sh(b,t+lb(x,y)*.7);}
  if(q===0){/* klaffende Fuge und quer genageltes Flickbrett */
   const gx=Math.round(hw*.35);for(let y=-hh;y<=hh;y++)if(noise(y,9,k)>.25)put(gx,y,'#1d1916');
   for(let x=-hw;x<=hw;x++){const y=Math.round(hh*.45+x*.35);put(x,y,sh('#8a7152',.2));put(x,y+1,sh('#8a7152',-.2));put(x,y+2,'#2f2823');if((x+60)%4===0)put(x,y,'#2a2520');}}
  /* Querleisten der eckigen Schilde */
  if(!round)for(const s of [-1,1]){const y=s*Math.round(hh*.58);for(let x=-hw;x<=hw;x++){put(x,y,sh(Wd,.35));put(x,y+1,sh(Wd,-.55));}for(const x of [-(hw-3),0,hw-3])put(x,y,iron,1);}
  /* Armpolster ab Veteranen-Güte, darüber der Armriemen */
  const strap=def!=='buckler'&&def!=='smallshield',sx=-Math.round(hw*.52),sl=round?5:6;
  if(strap&&q>=3&&!lined)for(let y=-sl;y<=sl;y++)for(let x=sx-3;x<=sx+3;x++)put(x,y,(Math.abs(y)===sl||x===sx-3||x===sx+3)&&(x+y)%2===0?'#3b291d':sh('#75523a',lb(x,y)*.4));
  /* Höhlung des Buckels und Griff */
  if(def==='scutum'){for(let y=-3;y<=3;y++)for(let x=-4;x<=4;x++)put(x,y,Math.abs(x)===4||Math.abs(y)===3?sh(Wd,-.8):'#1f1a17');}
  else for(let y=-5;y<=5;y++)for(let x=-5;x<=5;x++){const d=Math.hypot(x,y);if(d<=rb+.95)put(x,y,d>rb-.05?sh(lined?lin:Wd,-.8):'#1f1a17');}
  const gl=def==='buckler'?rb+1:def==='scutum'?5:def==='tower'?5:r-rimW-2,barC=G.metal||def==='scutum'||def==='tower'?iron:'#5a4330',thick=r>=12&&round;
  for(let x=-gl;x<=gl;x++){put(x,-1,sh(barC,.3),1);put(x,0,sh(barC,thick?0:-.4),1);if(thick)put(x,1,sh(barC,-.5),1);}
  for(let x=-2;x<=2;x++){const c=q===0?(x%2?'#b59b6c':'#8a7450'):x%2?leather:leatherD;put(x,-1,sh(c,.2));put(x,0,c);if(thick)put(x,1,sh(c,-.3));}
  if(q>=4)for(const x of [-3,3]){put(x,-1,E,1);put(x,0,sh(E,-.3),1);}
  if(round&&!G.metal&&q>0)for(const x of [-(gl-1),gl-1])put(x,-1,sh(metal,-.1),1);
  if(strap){for(let y=-sl;y<=sl;y++){const bx=sx-Math.round(1.6*(1-(y/sl)**2));put(bx,y,q===0?'#9a845c':leather);put(bx+1,y,q===0?'#6f5d40':leatherD);}for(const y of [-sl,sl]){put(sx,y,q>=4?E:sh(metal,-.1),1);}}
  /* Tragriemen des Turmschilds */
  if(def==='tower')for(let x=-hw+4;x<=hw-4;x++){const u=(x+hw-4)/(2*hw-8),y=-hh+5+Math.round(u*3+Math.sin(u*Math.PI)*3);put(x,y,leather);put(x,y+1,leatherD);if(x===-hw+4||x===hw-4)put(x,y,sh(metal,-.1),1);}
  /* Nietenden */
  if(round){const n=q===0?5:r>=12?12:8;for(let j=0;j<n;j++){const a=(j+.5)*TAU/n;rivet(-Math.cos(a)*(r-1.2),Math.sin(a)*(r-1.2));}}
 }
 if(flash)for(let i=0;i<px.length;i++)if(px[i])px[i]=mix(px[i],'#fff0bc',mt[i]?.6:.24);
 const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
 for(let y=0;y<H;y++)for(let x=0;x<W;){const col=px[y*W+x];let n=1;while(x+n<W&&px[y*W+x+n]===col)n++;if(col){g.fillStyle=col;g.fillRect(x,y,n,1);}x+=n;}
 return {canvas:c,ox,oy,width:W,height:H,hw,hh};
}
function sprite(item,opt={}){const def=item.def,q=Math.max(0,Math.min(6,item.q||0)),key=def+':'+q+':'+(opt.team?1:0)+(opt.rear?1:0)+(opt.flash?1:0);let s=cache.get(key);if(s){hits++;return s;}misses++;s=build(def,q,!!opt.team,!!opt.rear,!!opt.flash);cache.set(key,s);return s;}
// Zeichnet um den Ursprung des übergebenen ctx (Lage und Drehung setzt der Aufrufer).
function draw(ctx,item,opt={}){const s=sprite(item,opt);ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(s.canvas,-s.ox-.5,-s.oy-.5);ctx.restore();return s;}
function on(){if(off===null){try{off=localStorage.getItem('mg-schild-art')==='off';}catch(e){off=false;}}return !off;}
M.shieldArt={draw,sprite,on,supports:id=>!!GEO[id],size:id=>GEO[id]?{hw:GEO[id].r||GEO[id].hw,hh:GEO[id].r||GEO[id].hh}:null,clear(){cache.clear();off=null;},cacheStats:()=>({entries:cache.size,hits,misses})};
})();
