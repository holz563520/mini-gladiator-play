'use strict';
// =====================================================================================================================
// NPCS AUF DER RASTERKARTE (welt-npc.js) · Wunsch Thomas 12.11.2026: alle bekannten NPCs an ihren Platz im Ludus stellen,
// in den Gebäuden oder auf dem Hof, wo sie hingehören. Nur Arena Theory 2.0 / Tageslauf-Editor, reine Anzeige.
//
// · Gezeichnet wird mit den Figuren des Spiels (Ludus-Maßstab), in kleine Bilder vorgezeichnet (4 Bilder, 2 je Sekunde)
//   und wie die übrigen Figuren verkleinert (KW), beim Heranzoomen in voller Auflösung:
//     Schmied             M.renderForgeActors (Meister aus M.workshop)        Schmiede, am Amboss (unter dem Dach)
//     Sklavenhändler      M.renderForgeActors (M.trader.figure)               Sklavenmarkt, vor der Theke, daneben seine Tagesware
//     Lanista             M.renderForgeActors (M.ludus.ownerFigure)           Hof, am Rand des Trainingshofs
//     Doktor Hirnhammer   DOK.drawDocSmall (doktor.js)                         Medicus, neben dem Behandlungsstuhl
//     Schwester Valeria   DOK.drawNurseSmall (doktor.js)                       Medicus, bei den Betten
//     Septimus Rabies     M.drawRabies (hundefang.js)                          Beastrium, an der Tür
//     Orontes Pfeilkopf   M.bowyer.drawOro (bogner.js)                         Hof, am Schießstand (wie im alten Ludus)
//     Hühnerhändlerin     HS.art.seller und HS.art.cart (huehnerschule)        Hof, mit Karren (Platz aus dem alten Ludus)
// · NPCs in einem Gebäude mit Dach sind nur bei offenem Dach zu sehen. Antippen zeigt Name und Rolle (und, wenn vorhanden, einen Spruch).
// · A4 (Thomas 13.11.2026): Der Lanista schlendert über begehbare Wege durch Dorf und Platz (Wegsuche welt-begehbar.js, Gehbewegung
//   wie die Gladiatoren) und sitzt ab und zu 1–3 Spielstunden auf dem Thron der Verwaltung (welt-verwaltung.js, etwa ein Drittel der Zeit).
//   Reine Anzeige, nicht im Spielstand. Ohne welt-begehbar.js steht er wie bisher still am Hof. M.weltNpc.dazu(npc): weitere NPCs (Berater).
// · B0 (Thomas 13.11.2026): Steht ein Kampf an (welt-arena.js), steht er vom Thron auf, geht zur Treppe hinter der Arena und sitzt in seiner Loge,
//   bis der Termin vorbei ist; dann geht er zurück. Findet er keinen Weg, nimmt er die Abkürzung (steht gleich an der Treppe).
//   Ist er zum Termin noch unterwegs (der Weg vom Dorf dauert Stunden), sitzt er ab dann einfach in der Loge.
// =====================================================================================================================
(()=>{
const M=window.MG,W=window.WeltKarte,H=window.WeltHook,G=M?.weltGebaeude;if(!M||!W||!H||!G)return;const S=M.s,N=W.N,KW=W.KW,TAU=Math.PI*2;
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const bau=id=>W.BAU?.find(b=>b.id===id),hausVon=id=>{const b=bau(id);return b?G.haeuser().find(h=>h.has(b.tx,b.ty))||null:null;};
const ludus=(x,y)=>({x:W.LUD.tx+x/W.LUD.px,y:W.LUD.ty+y/W.LUD.px});
// 2.0 (A3): Plätze im Dorf statt der alten Ludus-Koordinaten (W.ANORD.orte, relativ zu O)
const ort=(id,x,y)=>{const o=W.ANORD?.orte?.[id];return o?{x:o[0]+W.O+.5,y:o[1]+W.O+.5}:ludus(x,y);};
const NB4=[[0,1],[1,0],[-1,0],[0,-1]];
function nachbarFrei(h,k,meiden){const x=k%N,y=(k/N)|0;for(const [dx,dy] of NB4){const q=(y+dy)*N+x+dx;if(h.has(x+dx,y+dy)&&!meiden.has(q))return {x:x+dx+.5,y:y+dy+.5};}return {x:x+.5,y:y+1};}

// ---------- Figuren des Spiels ----------
const leer={weapon:null,secondary:null,shield:null,armor:{}};
function kopie(g,id){const c=JSON.parse(JSON.stringify(g));c.id=id;c.equipment={...leer,armor:{}};c.enemyGear={...leer,armor:{}};return c;}
function schmiedG(){const p=M.workshop?.state?.master||{name:'Der Schmied',height:182,weight:96,appearance:{}},rng=S.rng,g=M.makeGladiator(0);S.rng=rng;
 Object.assign(g,{id:'welt-smith',name:p.name,height:p.height,weight:p.weight,muscle:58,armStrength:100,fame:0,scars:[]});g.appearance={...p.appearance};g.equipment={...leer,armor:{}};g.enemyGear={...leer,armor:{}};return g;}
const forge=(a,t)=>(c,x,y)=>{try{M.renderForgeActors(c,[{team:0,a:0,phase:t*2,state:'idle',energy:100,ammo:0,moveSpeed:0,bloodMarks:{},noNav:true,forgePose:'',...a,x,y}]);}catch(e){}};
// ---------- A4: Lanista unterwegs (Pixelkoordinaten wie die Gladiatoren in welt-raster.js) ----------
const LAN={an:false,x:0,y:0,pfad:null,goal:null,warte:3,sucht:false,dist:0,dir:0,geht:false,thron:false,thronH:0,zumThron:false,stunde:null,gen:0,loge:false,zurLoge:false,
 haus:()=>(M.weltGebaeude?.haeuser?.()||[]).find(h=>h.art==='verwaltung')||null,
 platz(){if(this.loge&&M.weltArena)return M.weltArena.lanistaPlatz();if(this.thron){const h=this.haus(),t=h&&M.weltVerwaltung?.thron?.(h);if(t)return {x:t.x,y:t.y,innen:true,thron:true};}const c=W.tileAt(this.x,this.y);return {x:c.tx,y:c.ty,innen:false,geht:this.geht};}};
const imLudus=k=>{const b=W.ber?.[k],B=W.BER||{};return b===B.DORF||b===B.PLATZ;};
function vorTuer(h){const x=h.door.k%N,y=(h.door.k/N)|0;return h.door.side==='y'?{tx:x+.5,ty:y+1.5}:{tx:x+1.5,ty:y+.5};}
function lanTick(dt){const G=M.weltBegehbar;if(!G||!W.ANORD||!W.tileAt||!(dt>0))return;
 if(!LAN.an){const p=ort('lanista',318,300),q=W.iso(p.x,p.y);LAN.x=q.x;LAN.y=q.y;LAN.an=true;}
 if(lanLoge(G))return;
 if(LAN.thron){const st=M.weltTag?.stunde;if(st!=null){if(LAN.stunde!=null){let d=st-LAN.stunde;if(d<0)d+=24;if(d<6)LAN.thronH-=d;}LAN.stunde=st;}else LAN.thronH-=dt/10;
  const h=LAN.haus();if(LAN.thronH>0&&h&&M.weltVerwaltung)return;// aufstehen: vor der Tür weiter
  LAN.thron=false;LAN.stunde=null;if(h){const v=vorTuer(h),q=W.iso(v.tx,v.ty);LAN.x=q.x;LAN.y=q.y;}LAN.warte=1+Math.random()*2;LAN.pfad=null;LAN.goal=null;return;}
 if(LAN.warte>0){LAN.warte-=dt;LAN.geht=false;return;}
 if(!LAN.goal){if(LAN.pfad&&LAN.pfad.length){const q=LAN.pfad.shift();LAN.goal=W.iso(q.x,q.y);}
  else if(LAN.zurLoge&&!LAN.sucht){LAN.zurLoge=false;LAN.loge=true;LAN.geht=false;return;}
  else if(LAN.zumThron){LAN.zumThron=false;const h=LAN.haus();if(h&&M.weltVerwaltung){LAN.thron=true;LAN.thronH=1+Math.random()*2;LAN.stunde=null;LAN.geht=false;return;}}
  if(!LAN.goal){if(LAN.sucht){LAN.geht=false;return;}const c=W.tileAt(LAN.x,LAN.y),h=LAN.haus();let ziel=null,thron=false;
   if(h&&M.weltVerwaltung&&Math.random()<.3){ziel=vorTuer(h);thron=true;}
   for(let i=0;i<8&&!ziel;i++){const tx=Math.floor(c.tx+(Math.random()-.5)*20),ty=Math.floor(c.ty+(Math.random()-.5)*20);if(tx<0||ty<0||tx>=N||ty>=N)continue;const k=ty*N+tx;if(!G.frei(G.GL,k)||!imLudus(k))continue;ziel={tx:tx+.5,ty:ty+.5};}
   if(!ziel){LAN.warte=1;LAN.geht=false;return;}LAN.sucht=true;const gen=++LAN.gen;
   G.weg(G.GL,{tx:c.tx,ty:c.ty},ziel,p=>{if(LAN.gen!==gen)return;LAN.sucht=false;if(!p){LAN.warte=1+Math.random()*2;return;}LAN.pfad=p.pts.slice(1);LAN.zumThron=thron;},{max:2500});LAN.geht=false;return;}}
 const dx=LAN.goal.x-LAN.x,dy=LAN.goal.y-LAN.y,d=Math.hypot(dx,dy),tp=G.tempoBei(G.GL,LAN.x,LAN.y,0)||100,step=(W.SPEED||15)*dt*tp/100*(d&&W.hangF?W.hangF(LAN.x,LAN.y,dx/d,dy/d):1);
 LAN.geht=true;if(Math.abs(dx)>1)LAN.dir=dx<0?1:0;
 if(d<=step){LAN.x=LAN.goal.x;LAN.y=LAN.goal.y;LAN.goal=null;LAN.dist+=d;if(!LAN.pfad||!LAN.pfad.length){LAN.pfad=null;if(!LAN.zumThron&&!LAN.zurLoge){LAN.warte=2+Math.random()*9;LAN.geht=false;}}return;}
 LAN.x+=dx/d*step;LAN.y+=dy/d*step;LAN.dist+=step;}
// B0: Loge in der Arena. true: diesen Schritt erledigt (sitzt, sucht oder bricht gerade auf)
function lanLoge(G){const AR=M.weltArena;if(!AR)return false;const soll=AR.lanistaSoll();
 if(LAN.loge){if(soll)return true;LAN.loge=false;const q=AR.treppe(),w=W.iso(q.tx,q.ty);LAN.x=w.x;LAN.y=w.y;LAN.warte=1+Math.random()*2;LAN.pfad=null;LAN.goal=null;LAN.sucht=false;return true;}
 if(!soll){if(LAN.zurLoge&&!LAN.pfad?.length&&!LAN.goal)LAN.zurLoge=false;return false;}
 if(LAN.thron){LAN.thronH=0;return false;}// erst aufstehen (Thron-Zweig unten)
 if(LAN.zurLoge){if(AR.lanistaEile?.()&&!LAN.sucht){LAN.zurLoge=false;LAN.loge=true;LAN.pfad=null;LAN.goal=null;LAN.geht=false;return true;}return false;}// unterwegs; ist der Kampf schon da, sitzt er eben schon (der Chef kommt nie zu spät, die anderen sind zu früh)
 LAN.zurLoge=true;LAN.zumThron=false;LAN.pfad=null;LAN.goal=null;LAN.warte=0;LAN.sucht=true;const gen=++LAN.gen,c=W.tileAt(LAN.x,LAN.y),z=AR.treppe();
 G.weg(G.GL,{tx:c.tx,ty:c.ty},z,p=>{if(LAN.gen!==gen)return;LAN.sucht=false;if(!p){const w=W.iso(z.tx,z.ty);LAN.x=w.x;LAN.y=w.y;LAN.pfad=null;return;}LAN.pfad=p.pts.slice(1);},{max:60000});LAN.geht=false;return true;}
const tickL=H.tick;H.tick=dt=>{tickL?.(dt);try{lanTick(dt);}catch(e){console.warn(e);LAN.an=false;}};
// Lanista beim Gehen: Gehbilder der Gladiatoren (W.drawFig), im Stehen und auf dem Thron seine eigene Figur (unten zeichne)
function lanGeht(ctx){const n=this.n;if(!n.g)try{n.g=kopie(M.ludus.ownerFigure(S.lanista),'welt-lanista');}catch(e){return;}const q=W.iso(n.p.x,n.p.y);
 try{if(W.mini)W.drawMini(ctx,n.g,Math.round(q.x),Math.round(q.y));else W.drawFig(ctx,n.g,Math.round(q.x),Math.round(q.y),W.gehBild?W.gehBild(LAN.dist):0,LAN.dir);}catch(e){}}
function lanSitzt(ctx){const n=this.n;if(!n.g)try{n.g=kopie(M.ludus.ownerFigure(S.lanista),'welt-lanista');}catch(e){return;}const q=W.iso(n.p.x,n.p.y);if(this.alpha<1)ctx.globalAlpha=this.alpha;
 try{W.drawSit(ctx,n.g,Math.round(q.x),Math.round(q.y-6),0);}catch(e){}ctx.globalAlpha=1;}// auf dem Thron sitzend (Oberkörper über der Sitzfläche)
const NPCS=[
 {id:'schmied',name:()=>M.workshop?.state?.master?.name||'Der Schmied',rolle:'Schmied',ort:'schmiede',
  platz(h){const k=[...(h.stat||new Map())].find(([,r])=>r==='amboss')?.[0];return k!=null?{...nachbarFrei(h,k,h.stat),innen:h.dach?.has(k)}:null;},
  mal:(c,x,y,t,o)=>forge({id:'welt-smith',g:o.g??=schmiedG(),forgeWorker:true,forgeHold:'beer',a:Math.PI},t)(c,x,y)},
 {id:'haendler',name:()=>M.trader?.figure?.()?.name||'Der Sklavenhändler',rolle:'Sklavenhändler',ort:'markt',
  platz(h){return {x:h.bx0+1.2,y:h.by1+.62,innen:false};},
  mal:(c,x,y,t,o)=>{const g=M.trader?.figure?.();if(g)forge({id:'welt-trader',g,trader:true,a:0},t)(c,x,y);}},
 {id:'lanista',name:()=>S.lanista?.name||'Der Lanista',rolle:'Lanista, dir gehört der Laden',ort:null,
  platz(){if(LAN.an)return LAN.platz();const p=ort('lanista',318,300);return {x:p.x,y:p.y,innen:false};},
  mal:(c,x,y,t,o)=>{try{o.g??=kopie(M.ludus.ownerFigure(S.lanista),'welt-lanista');forge({id:'welt-lan',g:o.g,lanista:true,a:0},t)(c,x,y);}catch(e){}}},
 {id:'doktor',name:()=>'Doktor Hirnhammer',rolle:'Doktor im Medicus',ort:'medicus',
  platz(h){return h.stuhl>=0?{...nachbarFrei(h,h.stuhl,new Set([...h.beds,h.door.k])),innen:true}:null;},
  mal:(c,x,y,t)=>window.DOK?.drawDocSmall?.(c,{x,y,t,dir:-1,pose:'stand'})},
 {id:'valeria',name:()=>'Schwester Valeria',rolle:'Krankenschwester im Medicus',ort:'medicus',
  platz(h){const b=h.beds?.[0];return b!=null?{...nachbarFrei(h,b,new Set([...h.beds,h.stuhl,h.door.k])),innen:true}:null;},
  mal:(c,x,y,t)=>window.DOK?.drawNurseSmall?.(c,{x,y,t,dir:1,pose:'stand'})},
 {id:'rabies',name:()=>'Septimus Rabies',rolle:'der Hundsgraf, Herr über den Zwinger',ort:'beastrium',gross:true,
  platz(h){const x=h.door.k%N,y=(h.door.k/N)|0;return {x:x+.5,y:y+.45,innen:true};},
  mal:(c,x,y,t)=>M.drawRabies?.(c,x,y,1,-1,t)},
 {id:'orontes',name:()=>'Orontes Pfeilkopf',rolle:'Bogenhändler, am Schießstand',ort:null,
  platz(){const p=ort('orontes',560,552);return {x:p.x,y:p.y,innen:false};},
  bereit:()=>!!M.bowyer?.drawOro,mal:(c,x,y,t)=>M.bowyer?.drawOro?.(c,x,y,1,{a:Math.PI,state:'idle',phase:t*3})},
 {id:'huehner',name:()=>'Die Hühnerhändlerin',rolle:'drei Hähne am Tag',ort:null,breit:true,
  platz(){const p=ort('huehner',516,238);return {x:p.x,y:p.y,innen:false};},
  mal:(c,x,y,t)=>{const A=window.HS?.art;if(!A)return;const o=window.HS?.st?.()?.offer;try{A.cart?.(c,{x:x+52,y,t,roosters:o?.list||[],sold:o?.sold||[],face:-1,handle:[x+11,y-24]});}catch(e){}
   try{A.seller?.(c,{x,y,dir:-1,pose:Math.sin(t*.6)>.3?'sell':'hips',t,mouth:Math.sin(t*.6)>.3?'shout':'grin'});}catch(e){}}}
];

// ---------- Vorgezeichnete Bilder (4 Bilder je NPC, Ludus-Maßstab, dazu verkleinert) ----------
const BILDER=4,TAKT=.5;
function bilder(n){if(n.bild)return n.bild;if(n.bereit&&!n.bereit())return null;const SW=n.breit?160:n.gross?100:72,SH=n.gross?110:96,AX=n.breit?40:SW/2,AY=SH-8,L=[];
 for(let i=0;i<BILDER;i++){const c=mk(SW,SH),g=c.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='rgba(15,20,10,.3)';g.fillRect(AX-9,AY-1,18,3);try{n.mal(g,AX,AY,i*TAKT+.3,n);}catch(e){}
  const w=Math.max(1,Math.round(SW*KW)),h=Math.max(1,Math.round(SH*KW)),k=mk(w,h),kg=k.getContext('2d');kg.imageSmoothingEnabled=true;kg.imageSmoothingQuality='high';kg.drawImage(c,0,0,w,h);
  const im=kg.getImageData(0,0,w,h),d=im.data;for(let j=3;j<d.length;j+=4)d[j]=d[j]>96?255:0;kg.putImageData(im,0,0);L.push({c,k});}
 return n.bild={L,SW,SH,AX,AY};}

// ---------- Platz bestimmen (Gebäude können sich ändern) ----------
function orte(){for(const n of NPCS){n.h=n.ort?hausVon(n.ort):null;n.p=null;if(n.ort&&!n.h)continue;const p=n.platz(n.h);if(!p)continue;n.p=p;}}
let ortT=0;
function zeichne(ctx){const n=this.n,b=bilder(n);if(!b)return;const i=Math.floor(performance.now()/1000/TAKT)%BILDER,q=W.iso(n.p.x,n.p.y),x=Math.round(q.x),y=Math.round(q.y),f=b.L[i];
 if(this.alpha<1)ctx.globalAlpha=this.alpha;
 if(W.mini){ctx.fillStyle='#d9c27a';ctx.fillRect(x-2,y-7,4,6);ctx.fillStyle='#2a1c12';ctx.fillRect(x-1,y-10,3,3);}
 else if(W.detail){ctx.imageSmoothingEnabled=true;ctx.drawImage(f.c,x-b.AX*KW,y-b.AY*KW,b.SW*KW,b.SH*KW);ctx.imageSmoothingEnabled=false;}
 else ctx.drawImage(f.k,Math.round(x-b.AX*KW),Math.round(y-b.AY*KW));
 ctx.globalAlpha=1;}
// Ware des Händlers: die heutigen Kandidaten stehen nebeneinander vor der Theke
// Ist heute noch keine Ware da (2.0 hat noch keinen Händlertag), stehen fünf Kandidaten nur zur Ansicht da (Spielstand und Zufall unberührt)
let ansicht=null;function ware(){const L=(M.trader?.state?.lot||[]).filter(g=>g&&!g.dead);if(L.length)return L;if(!ansicht){ansicht=[];const rng=S.rng;try{for(let i=0;i<5;i++){const g=M.makeGladiator(0);g.id='welt-ware-'+i;ansicht.push(g);}}catch(e){}S.rng=rng;}return ansicht;}
function wareZeichnen(ctx){const h=this.h,L=ware().slice(0,5),x0=h.bx0+2,x1=h.bx1+.6;
 L.forEach((g,i)=>{const p=W.iso(x0+(x1-x0)*(L.length>1?i/(L.length-1):.5),h.by1+.7);try{if(W.mini)W.drawMini(ctx,g,Math.round(p.x),Math.round(p.y));else W.drawFig(ctx,g,Math.round(p.x),Math.round(p.y),W.WALK,1);}catch(e){}});}
const items0=H.items;H.items=(items,view)=>{items0?.(items,view);const now=performance.now();if(now-ortT>1000){ortT=now;orte();}
 if(LAN.an){const n=NPCS.find(q=>q.id==='lanista');if(n){n.p=LAN.platz();n.h=n.p.thron?LAN.haus():null;}}
 for(const n of NPCS){if(!n.p)continue;const q=W.iso(n.p.x,n.p.y);if(q.x<view.x0-80||q.x>view.x1+80||q.y<view.y0-20||q.y>view.y1+120)continue;
  let alpha=1;if(n.p.innen&&n.h){alpha=Math.min(1,Math.max(0,(n.h.offen-.4)/.4));if(alpha<=0)continue;}
  const oz=n.p.loge?n.p.oz:W.hz?W.hz(n.p.x,n.p.y):0,y=n.p.loge?n.p.key:n.h?n.h.key+.02:(n.p.geht&&H.vorne?H.vorne(n.p.x,n.p.y,q.y):q.y);n.item??={n,draw:zeichne};n.item.draw=n.p.geht?lanGeht:(n.p.thron||n.p.loge)&&W.drawSit?lanSitzt:zeichne;n.item.y=y;n.item.oz=oz;n.item.alpha=alpha;items.push(n.item);}
 const m=hausVon('markt');if(m){(m.ware??={h:m,draw:wareZeichnen}).h=m;m.ware.y=m.key+.015;m.ware.oz=m.item?.oz||0;items.push(m.ware);}};
// Antippen: Name und Rolle über dem NPC
let zeig=null;const tap0=H.tap;H.tap=(p,w)=>{if(!w)for(const n of NPCS){if(!n.p)continue;if(n.p.innen&&n.h&&n.h.offen<.6)continue;const q=W.iso(n.p.x,n.p.y),oz=n.p.loge?n.p.tapOz:W.hz?W.hz(n.p.x,n.p.y):0,k=Math.max(1,1.4/W.cam.s),ex=Math.abs(q.x-p.x),ey=q.y-oz-p.y;
  if(ex<7*k&&ey>-2*k&&ey<26*k){const sp=n.spruch?.()||'';zeig={n,t:sp?6:4,spruch:sp};return true;}}return tap0?tap0(p,w):false;};
const world0=H.world;H.world=(ctx,view,dt)=>{world0?.(ctx,view,dt);if(!zeig||W.mini)return;zeig.t-=dt;if(zeig.t<=0){zeig=null;return;}const n=zeig.n;if(!n.p)return;
 const q=W.iso(n.p.x,n.p.y),oz=n.p.loge?n.p.tapOz:W.hz?W.hz(n.p.x,n.p.y):0,z=Math.min(3,Math.max(.5,1/W.cam.s)),s1=n.name(),s2=typeof n.rolle==='function'?n.rolle():n.rolle,s3=zeig.spruch||'';ctx.font=(window.AT2_STIL?AT2_STIL.font(11*z):'bold '+Math.round(11*z)+'px ui-monospace,Menlo,Consolas,monospace');ctx.textAlign='center';ctx.textBaseline='middle';
 const w=Math.max(ctx.measureText(s1).width,ctx.measureText(s2).width*.85,ctx.measureText(s3).width*.85)+10*z,y=q.y-oz-34-14*z-(s3?10*z:0);ctx.fillStyle='rgba(18,12,9,.86)';ctx.fillRect(Math.round(q.x-w/2),Math.round(y-10*z),Math.round(w),Math.round((s3?34:24)*z));
 ctx.fillStyle='#f4d37a';ctx.fillText(s1,Math.round(q.x),Math.round(y-3*z));ctx.font=(window.AT2_STIL?AT2_STIL.font(9*z):Math.round(9*z)+'px ui-monospace,Menlo,Consolas,monospace');ctx.fillStyle='#e8dcc0';ctx.fillText(s2,Math.round(q.x),Math.round(y+7*z));if(s3){ctx.fillStyle='#f0b8a8';ctx.fillText(s3,Math.round(q.x),Math.round(y+17*z));}};
orte();
M.weltNpc={dazu(n){NPCS.push(n);orte();},lanista:LAN,liste:()=>NPCS.map(n=>({id:n.id,name:n.name(),rolle:n.rolle,ort:n.ort,platz:n.p?{...n.p}:null})),bilder:id=>bilder(NPCS.find(n=>n.id===id)),orte,get zeig(){return zeig?.n.id||null;}};
})();
