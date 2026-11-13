'use strict';
// =====================================================================================================================
// BESUCHER (welt-besucher.js) · Zuschauer kommen über den Weg, setzen sich auf die Tribünen der Arena und gehen wieder.
// Wunsch Thomas 12.11.2026 (wie die Gäste bei RollerCoaster Tycoon). Nur auf tageslauf-editor.html geladen, nicht im Spiel.
//
// · Es sind immer so viele Besucher unterwegs, wie im Editor eingestellt (M.weltBesucher.setze(n)); wer geht, wird ersetzt.
// · Ablauf: Kartenrand → den Weg entlang → (etwa jeder Vierte: Abstecher zur Halle der Toten, vor einem Grab stehen) → am Ludus vorbei zur Arena → freier Sitzplatz (welt-bau.js) → eine Weile sitzen
//   → zurück zum Kartenrand. Ohne freien Platz schauen sie kurz und gehen wieder.
// · Aussehen: wie die Gladiatoren (klein und gepixelt, beim Heranzoomen die echte Figur des Spiels), aber Zuschauer: Bauern, Bauerntölpel,
//   Handwerker, Händler, Bürger, Edelleute, bunt gemischt. Jeder hat einen eigenen Namen und Stand; antippen zeigt beides.
// · Leistung: Es gibt TYPEN verschiedene Aussehen; jedes wird einmal vorgezeichnet (W.spriteOf) und von vielen Besuchern
//   geteilt. Keine neuen Objekte je Bild. Weit herausgezoomt nur zwei Rechtecke je Besucher.
// · Noch keine Spielwirkung: kein Eintritt, kein Geld, keine Kämpfe.
// =====================================================================================================================
(()=>{
const M=window.MG,W=window.WeltKarte,H=window.WeltHook,B=M?.weltBau;if(!M||!W||!H||!B)return;const S=M.s;
// Besucher kommen auf dem Weg aus höchstens 45 Feldern Entfernung (große Karte: nicht vom echten Kartenrand)
// 2.0 (A3): Es gibt einen Arena-Park mit genau einem Parktor. Besucher kommen auf der Straße, gehen durchs Tor und bleiben im Park
// (Kieswege: Hauptweg vom Tor zur Arena, Abzweig zur Halle der Toten); ins Dorf gehen sie nie. Ohne Park (Editor) wie bisher.
const A3=W.ANORD,TOR=A3&&W.TORE?.find(t=>t.art==='park'),O=W.O||0;
const N=W.N,LUD=W.LUD,WEG=(W.WEG_TY??58)+.5,MX=TOR?TOR.tx+TOR.w/2:LUD.tx+LUD.w/2,RL=Math.max(-1,(TOR?MX:LUD.tx)-45),RR=Math.min(N,(TOR?MX:LUD.tx+LUD.w)+45),TAU=Math.PI*2,rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[(Math.random()*a.length)|0];
// ---------- Aussehen: Stände mit Kleiderfarben und Statur ----------
const STAND=[
 {name:'Bauer',n:5,tuch:['#8a6f4a','#7a7446','#6f5a3c','#93805a','#5f6a44'],h:[160,182],w:[62,92]},
 {name:'Bauerntölpel',n:3,tuch:['#9a7d4f','#6d6a3a','#84603e'],h:[156,176],w:[95,128]},
 {name:'Tagelöhner',n:2,tuch:['#77705f','#665a4a','#8a8370'],h:[162,186],w:[58,78]},
 {name:'Handwerker',n:3,tuch:['#7d8a8c','#a08a52','#6a7f5e','#8c6f5a'],h:[164,188],w:[70,100]},
 {name:'Händler',n:2,tuch:['#3f6f8f','#c27a2e','#4f8a6a','#b0553a'],h:[162,186],w:[78,118]},
 {name:'Bürger',n:2,tuch:['#c9b99a','#b8a27c','#d8cdb4','#a9b0a0'],h:[164,190],w:[66,96]},
 {name:'Edelmann',n:3,tuch:['#f1ead8','#7a3f8c','#a32f2a','#e8dcc0','#5a3a8a'],h:[172,196],w:[66,94]}
],TYPEN=60,typen=[],vornamen=[],nachnamen=[];
function typenBauen(){if(typen.length)return;const rng=S.rng,bag=[];for(const st of STAND)for(let i=0;i<st.n;i++)bag.push(st);
 for(let i=0;i<TYPEN;i++){const st=bag[i%bag.length],g=M.makeGladiator(0);g.zuschauer=true;g.stand=st.name;g.height=Math.round(rnd(st.h[0],st.h[1]));g.weight=Math.round(rnd(st.w[0],st.w[1]));g.age=Math.round(rnd(16,70));
  try{M.ensureIdentity?.(g);}catch(e){}g.appearance={...(g.appearance||{skin:'#d9ac82',shade:'#9c7353',hair:'#443025',style:1,beard:0}),cloth:pick(st.tuch)};const [v,nn]=g.name.split(' ');vornamen.push(v);nachnamen.push(nn||v);typen.push(g);}
 S.rng=rng;}

// ---------- Sitzplätze der Arenen ----------
let sitze=[],frei=[];
function plaetze(){sitze=[];for(const t of B.tribs()){if(t.a<0)continue;const h=B.HOCH(t.r);for(const [dx,dy] of B.SITZ)sitze.push({x:t.x+dx,y:t.y+dy-h,links:(B.arenen()[t.a]?.x??t.x)<t.x?1:0,key:t.y+.02+dy*.0001,tx:(t.k%N)+.5,ty:((t.k/N)|0)+.5,a:t.a,v:null});}
 frei=sitze.slice();for(const v of leute){v.sitz=null;if(v.st!=='weg'){v.st='neu';}}}
function nimmSitz(v){if(!frei.length)return null;const i=(Math.random()*frei.length)|0,s=frei[i];frei[i]=frei[frei.length-1];frei.pop();s.v=v;return s;}
function gibSitz(v){if(v.sitz){v.sitz.v=null;frei.push(v.sitz);v.sitz=null;}}

// ---------- Wege ----------
// T2-Rückmeldung (Thomas 13.11.2026): Besucher bleiben auf dem Belag, nicht auf dem Rand: Streuung ±0,2 Felder um die Wegmitte (Belag ±0,3)
const P=(tx,ty)=>W.iso(tx+rnd(-.2,.2),ty+rnd(-.2,.2));
function spalte(west,a){let lo=LUD.tx-1.5,hi=LUD.tx+LUD.w+1.5;if(a)for(const k of a.tribs.concat(a.floor)){const x=k%N;if(x-1.5<lo)lo=x-1.5;if(x+2.5>hi)hi=x+2.5;}return west?lo:hi;}
// Abstecher zur Halle der Toten (Thomas 12.11.): etwa jeder Vierte geht vorher den Pfad hinauf und bewundert einen Helden
// Park: Punkte auf dem Hauptweg (Spalte des Tores), Tor außen/innen, Eingang der Arena
const SP=MX,TOR_IN=TOR?TOR.ty-.7:0,EIN=A3?{x:A3.arena.ein[0]+O,y:A3.arena.ein[1]+O}:null,ins=v=>v.imPark?[]:(v.imPark=true,[P(SP,WEG),P(SP,TOR_IN)]);
// T4 (Thomas 13.11.2026): Mit der Begehbarkeitskarte (welt-begehbar.js) suchen Besucher ihren Weg selbst (nur Wege, Brücken, Tore;
// neue Wege werden benutzt, abgerissene umgangen). Ohne sie gelten die festen Wegpunkte darunter wie bisher.
const G=TOR&&EIN&&M.weltBegehbar;
const zuPunkten=p=>p.pts.slice(1).map(q=>{const w=W.iso(q.x+(q.b?0:rnd(-.2,.2)),q.y+(q.b?0:rnd(-.2,.2)));w.b=q.b;return w;});
// o: {vorher: Punkte davor (Welt), ziel: {tx,ty}, nachher: Punkte danach (Welt), st: Zustand unterwegs}
function planen(v,o){v.plan=o;v.st='plant';const gen=v.gen=(v.gen||0)+1,vor=o.vorher||[],start=vor.length?vor[vor.length-1]:v,c=W.tileAt(start.x,start.y);
 const fertig=p=>{if(v.gen!==gen)return;if(!p){v.st='steckt';v.t=4;v.steckt=(v.steckt||0)+4;if(!v.gemeldet)v.gemeldet=G.melde(G.BE,v.name);if(v.steckt>60){gibSitz(v);v.st='fort';}return;}
  v.steckt=0;v.pobj=p;const nach=o.nachher||[];v.np=nach.length;v.pts=vor.concat(zuPunkten(p),nach);v.st=o.st;};
 const von={tx:c.tx,ty:c.ty,b:vor.length?0:(v.brA||v.pts?.[0]?.b)};if(v.vorlauf)fertig(G.sofort(G.BE,von,o.ziel));else G.weg(G.BE,von,o.ziel,fertig);}
// neu planen (Weg kaputt oder festgesteckt): vom Standort aus; steht der Besucher noch auf der Tribüne o. Ä., erst wieder zum Punkt davor
function neuPlanen(v){const o=v.plan,c=W.tileAt(v.x,v.y),frei=G.frei(G.BE,W.ix(Math.max(0,Math.min(N-1,Math.floor(c.tx))),Math.max(0,Math.min(N-1,Math.floor(c.ty)))));
 planen(v,{vorher:frei?null:o.vorher,ziel:o.ziel,nachher:o.nachher,st:o.st});}
function zurHalle(v){if(v.ehrt||Math.random()>=.28)return false;const z=M.weltHalle?.besuch?.();if(!z)return false;v.ehrt=true;v.halle=z;if(G){v.imPark=true;const h=z.hin.map(q=>({x:q.x+rnd(-3,3),y:q.y+rnd(-1,1)}));h[h.length-1]=z.hin[z.hin.length-1];planen(v,{ziel:{tx:W.HALLE.unten.x,ty:W.HALLE.unten.y},nachher:h,st:'zurHalle'});return true;}
 const vor=TOR?[...ins(v),P(SP,W.HALLE.unten.y)]:[];v.pts=vor.concat(z.hin.map(q=>({x:q.x+rnd(-3,3),y:q.y+rnd(-1,1)})));v.pts[v.pts.length-1]=z.hin[z.hin.length-1];v.st='zurHalle';return true;}
function hinPark(v){const s=nimmSitz(v),as=B.arenen();v.sitz=s;
 if(G){v.imPark=true;planen(v,{ziel:{tx:EIN.x,ty:EIN.y},nachher:s&&as.length?[{x:s.x,y:W.iso(s.tx,s.ty).y}]:[],st:'hin'});return;}
const c=W.tileAt(v.x,v.y),pts=ins(v);
 if(Math.abs(c.tx-SP)>1)pts.push(P(SP,c.ty));// von der Halle zurück auf den Hauptweg
 pts.push(P(SP,EIN.y),P(EIN.x,EIN.y));
 if(s&&as.length)pts.push({x:s.x,y:W.iso(s.tx,s.ty).y});v.pts=pts;v.st='hin';}
function wegPark(v){gibSitz(v);if(G){v.imPark=false;planen(v,{vorher:[P(EIN.x,EIN.y)],ziel:{tx:v.west?RL:RR,ty:WEG},st:'weg'});return;}v.pts=[P(EIN.x,EIN.y),P(SP,EIN.y),P(SP,TOR_IN),P(SP,WEG),P(v.west?RL:RR,WEG)];v.imPark=false;v.st='weg';}
function hin(v){v.gemeldet=false;if(zurHalle(v))return;if(TOR)return hinPark(v);const s=nimmSitz(v),as=B.arenen();v.sitz=s;const c=W.tileAt(v.x,v.y),west=v.west,pts=[];
 if(!as.length){v.ziel=null;v.pts=[P(west?RL+1:RR-1,WEG)];v.st='weg';return;}
 const a=s?as[s.a]||as[0]:as[(Math.random()*as.length)|0],col=spalte(west,a),ty=s?s.ty:a.ty+rnd(-2,2);
 if(c.ty>LUD.ty+LUD.h){pts.push(P(col,WEG));}
 if(Math.abs(c.tx-col)>1.5||c.ty>LUD.ty+LUD.h)pts.push(P(col,ty));
 if(s)pts.push({x:s.x,y:W.iso(s.tx,s.ty).y});v.pts=pts;v.st='hin';}
function weg(v){if(TOR)return wegPark(v);gibSitz(v);const c=W.tileAt(v.x,v.y),a=B.arenen()[0],col=spalte(v.west,a);v.pts=[P(col,c.ty),P(col,WEG),P(v.west?RL:RR,WEG)];v.st='weg';}

// ---------- Besucher ----------
const leute=[];let soll=100;
function zeichne(ctx){const x=Math.round(this.dx),y=Math.round(this.dy);
 if(W.mini)W.drawMini(ctx,this.g,x,y);else if(this.st==='sitz')W.drawSit(ctx,this.g,x,y,this.dir);else W.drawFig(ctx,this.g,x,y,this.f,this.dir);}
function neuer(vorlauf){const west=Math.random()<.5,p=P(west?RL:RR,WEG),g=pick(typen),v={x:p.x,y:p.y,dx:p.x,dy:p.y,west,g,name:pick(vornamen)+' '+pick(nachnamen),stand:g.stand,dir:west?0:1,f:0,dist:Math.random()*60,sp:rnd(13,19),seed:Math.random()*10,st:'neu',pts:null,sitz:null,t:0,draw:zeichne};leute.push(v);
 if(vorlauf){v.vorlauf=true;hin(v);v.vorlauf=false;if(v.st==='hin'&&v.sitz&&Math.random()<.6){v.x=v.sitz.x;v.y=W.iso(v.sitz.tx,v.sitz.ty).y;v.pts=[];v.st='sitz';v.t=rnd(5,110);}
  else if(v.pts&&v.pts.length){const i=(Math.random()*v.pts.length)|0,a=i?v.pts[i-1]:v,b=v.pts[i],u=Math.random();v.x=a.x+(b.x-a.x)*u;v.y=a.y+(b.y-a.y)*u;v.pts=v.pts.slice(i);}}}
function setze(n){typenBauen();soll=Math.max(0,n|0);while(leute.length>soll)gibSitz(leute.pop());while(leute.length<soll)neuer(true);}
function schritt(v,dt){if(v.st==='neu'){hin(v);}
 if(v.st==='plant'){v.f=W.WALK;v.dx=v.x;v.dy=v.y;return;}
 if(v.st==='steckt'){v.t-=dt;v.f=W.WALK;v.dx=v.x;v.dy=v.y;if(v.t<=0)neuPlanen(v);return;}
 if(G&&v.pobj?.kaputt&&v.plan&&v.pts&&v.pts.length>v.np){v.pobj=null;neuPlanen(v);return;}
 if(v.st==='sitz'){v.t-=dt;const s=v.sitz;if(!s){v.st='neu';return;}v.dx=s.x;v.dy=s.y;v.y=s.key;v.dir=s.links;if(v.t<=0)weg(v);return;}
 if(v.st==='schaut'){v.t-=dt;v.f=W.WALK;if(v.t<=0)weg(v);v.dx=v.x;v.dy=v.y;return;}
 if(v.st==='ehrt'){v.t-=dt;v.f=W.WALK;v.dir=v.halle.blick;v.dx=v.x;v.dy=v.y;if(v.t<=0){v.pts=v.halle.zurueck.map(q=>({x:q.x+rnd(-3,3),y:q.y}));v.st='vonHalle';}return;}
 const p=v.pts&&v.pts[0];if(!p){if(v.st==='zurHalle'){v.st='ehrt';v.t=rnd(5,13);return;}if(v.st==='vonHalle'){v.st='neu';return;}if(v.st==='hin'){if(v.sitz){v.st='sitz';v.t=rnd(40,120);}else{v.st='schaut';v.t=rnd(4,10);}}else v.st='fort';return;}
 const ex=p.x-v.x,ey=p.y-v.y,d=Math.hypot(ex,ey),aufBr=G&&(v.brA||p.b),step=v.sp*dt*(G?(G.tempoBei(G.BE,v.x,v.y,aufBr)||100)/100:1)*(d&&W.hangF&&!aufBr?W.hangF(v.x,v.y,ex/d,ey/d):1);/* T1: Hangtempo, T4: Tempo je Boden */if(d<=step){v.x=p.x;v.y=p.y;v.brA=p.b;v.pts.shift();}else{v.x+=ex/d*step;v.y+=ey/d*step;}
 if(Math.abs(ex)>1)v.dir=ex<0?1:0;v.dist+=Math.min(d,step);v.f=W.gehBild(v.dist);v.dx=v.x;v.dy=v.y;}
let clock=0;
const tick0=H.tick;H.tick=dt=>{tick0?.(dt);clock+=dt;for(let i=leute.length-1;i>=0;i--){const v=leute[i];schritt(v,dt);if(v.st==='fort'){leute[i]=leute[leute.length-1];leute.pop();}}
 for(let k=0;k<3&&leute.length<soll;k++)neuer(false);};
const items0=H.items;H.items=(items,view)=>{items0?.(items,view);const x0=view.x0-10,x1=view.x1+10,y0=view.y0-10,y1=view.y1+60;for(const v of leute){if(v.dx<x0||v.dx>x1||v.dy<y0||v.dy>y1)continue;
  if(W.hz){if(v.st==='sitz')v.oz=0;else{const c=W.tileAt(v.dx,v.dy),z=W.hz(c.tx,c.ty);v.oz=G&&(v.brA||v.pts?.[0]?.b)?G.deckHz(c.tx,c.ty,z):z;}}// T1: auf der Höhe des Bodens (nur sichtbare)
  items.push(v);}};
// Antippen eines Besuchers: Name und Stand stehen kurz über ihm
let zeig=null;const tap0=H.tap;H.tap=(p,w)=>{if(tap0&&tap0(p,w))return true;if(w)return false;let best=null,bd=1e9;for(const v of leute){const k=Math.max(1,1.4/W.cam.s),ex=Math.abs(v.dx-p.x),ey=p.y-(v.dy-8);if(ex<6*k&&ey>-10*k&&ey<10*k&&ex+Math.abs(ey)<bd){bd=ex+Math.abs(ey);best=v;}}
 if(!best){zeig=null;return false;}zeig={v:best,t:4};return true;};
const world0=H.world;H.world=(ctx,view,dt)=>{world0?.(ctx,view,dt);if(!zeig)return;zeig.t-=dt;const v=zeig.v;if(zeig.t<=0||v.st==='fort'){zeig=null;return;}
 const z=Math.min(3,Math.max(.4,.8/W.cam.s)),s=v.name+' · '+v.stand,y=v.dy-W.HOEHE-9*z;ctx.font=(window.AT2_STIL?AT2_STIL.font(11*z):'bold '+Math.round(11*z)+'px ui-monospace,Menlo,Consolas,monospace');ctx.textAlign='center';ctx.textBaseline='middle';const w=ctx.measureText(s).width+8*z;
 ctx.fillStyle='rgba(18,12,9,.88)';ctx.fillRect(Math.round(v.dx-w/2),Math.round(y-8*z),Math.round(w),Math.round(16*z));ctx.fillStyle='#f4d37a';ctx.fillText(s,Math.round(v.dx),Math.round(y)+1);};
B.beiAenderung(plaetze);plaetze();setze(soll);
M.weltBesucher={setze,STAND,typen:()=>typen,get zahl(){return leute.length;},get soll(){return soll;},leute:()=>leute,bewundern:()=>leute.filter(v=>v.st==='ehrt').length,sitze:()=>sitze,freie:()=>frei.length};
})();
