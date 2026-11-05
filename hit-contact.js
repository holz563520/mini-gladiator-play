'use strict';
// =====================================================================================================
// TREFFER-KONTAKT (Wunsch Thomas 5.11.2026) – wie ein Treffer klingt, aussieht und wo die Waffe endet.
// · Nur aktiv mit M.hitContact.active = true (heute nur im Block-Editor). sim.js/arena.js rufen die Haken
//   über M.hitContact?.… auf; ohne diese Datei oder ausgeschaltet ändert sich nichts.
// · Schritt 1 – Klang: Kern je Waffengattung (Fleisch) + Schicht je Rüstung (Leder, verstärkt, Metall).
// · Schritt 2 – Waffe endet am Körper bzw. in Eindringtiefe statt hindurchzuschwingen (pose).
// · Schritt 3 – Wunde passend zum Schlag (Kerbe, Schnitt, Stich, Hackwunde, Prellung, Quetschung, Delle).
// · Schritt 4 – Drehschlag ohne flach gestauchte Figur (spinScale).
// Keine Spielwürfel, keine Spielstand-Daten: Wundbilder liegen nur im Arbeitsspeicher (WeakMap je Kämpfer).
// =====================================================================================================
(()=>{
const M=window.MG;if(!M||M.hitContact)return;
const S=M.s,cl=(x,a,b)=>Math.max(a,Math.min(b,x));
const HC={active:false,play:null,stats:{sounds:0,stops:0,marks:0},onEvent:null};
M.hitContact=HC;
const now=()=>S.battle?.time||0;
function fire(ev){try{HC.onEvent?.(ev);}catch(e){console.warn('hitContact.onEvent',e);}}
function play(k,vol,pitch){try{if(HC.play)HC.play(k,vol,pitch);else if(M.blockContact?.play)M.blockContact.play(k,vol,pitch);else M.audioEngine?.ksPlay?.(k,vol,pitch);}catch{}}

// ---------------------------------------------------------------- Waffengattung und Rüstung an der Trefferstelle
const THRUSTY=new Set(['spear','trident','javelin']);
function strikeClass(wid,attackKey){const thrust=/thrust|stab|pierce/.test(attackKey||'');
 if(wid==='dagger')return 'dolch';
 if(THRUSTY.has(wid))return 'stich';
 if(thrust&&['short','gladius','long','greatsword','halberd'].includes(wid))return 'stich';
 if(wid==='long'||wid==='greatsword')return 'schwerklinge';
 if(wid==='short'||wid==='gladius')return 'klinge';
 if(wid==='axe'||wid==='doubleaxe'||wid==='halberd'||wid==='throwaxe')return 'axt';
 if(wid==='mace')return 'kolben';
 if(wid==='hammer')return 'hammer';
 return 'keule';}// Keule, Faust, Tritt, Schildstoß
const BLUNTISH=new Set(['keule','kolben','hammer','axt']);
function armorAt(g,part){try{for(const i of M.armorItems(g)){const d=M.definition(i);if(d?.parts?.includes(part))return i.material||'metal';}}catch{}return null;}
HC.strikeClass=strikeClass;HC.armorAt=armorAt;

// ---------------------------------------------------------------- 1. Klang (sim.js hit(): statt des allgemeinen Treffergeräuschs)
HC.sound=(a,b,w,projectile,part,localArmor,dmg,attackKey,crit)=>{
 if(!HC.active||projectile||!w||w.ammo)return false;// Pfeile behalten ihr eigenes Geräusch
 const cls=strikeClass(w.id,attackKey||a?.swingKind),mat=localArmor>8?(armorAt(b.g,part)||'metal'):localArmor>2?(armorAt(b.g,part)||null):null;
 const v=cl(.55+dmg/40,.55,1.1),p=crit?.93:1,soft=w.id==='fist'||a?.swingKind==='kick'?.55:1;
 let core=1;
 if(mat==='metal'){core=.35;play(BLUNTISH.has(cls)?'tr_metallStumpf':'tr_metallKlinge',v,p);}
 else if(mat==='medium'){core=.6;play('tr_leder',v*.8,p);play(BLUNTISH.has(cls)?'tr_metallStumpf':'tr_metallKlinge',v*.45,p*1.05);}
 else if(mat==='leather'){core=.75;play('tr_leder',v*.85,p);}
 play('tr_'+cls,v*core*soft,soft<1?p*1.25:p);
 HC.stats.sounds++;fire({kind:'hitSound',cls,mat,part,dmg,att:a,def:b});
 return true;};


// ---------------------------------------------------------------- 2. Waffe endet am Körper (arena.js, nach block-contact)
// Halbe Dicke je Körperteil (Figurmaß) und Eindringtiefe je Gattung: Wucht bleibt auf der Haut, Klingen schneiden
// eine Kerbe, Stiche gehen tief. Die Spitze folgt dem getroffenen Körperteil, solange sie steckt.
const HALF={head:5,neck:3,chest:7,belly:7,ls:4,rs:4,lua:3,rua:3,lfa:2.5,rfa:2.5,lh:2,rh:2,lt:4,rt:4,lsh:3,rsh:3,lf:2,rf:2};
const DEPTH={schwerklinge:3,klinge:2,dolch:4,axt:3.5,stich:7,keule:0,kolben:.5,hammer:1};
const HOLD={schwerklinge:.08,klinge:.06,dolch:.09,axt:.1,stich:.12,keule:.05,kolben:.06,hammer:.08};
const stops=new Map();
const R=M.combatResponses;
if(R?.impact){const orig=R.impact;R.impact=(a,b,dmg,projectile,w,part)=>{orig(a,b,dmg,projectile,w,part);if(!HC.active||projectile||!w||w.ammo||!a||!b)return;
 const cls=strikeClass(w.id,a.swingKind);
 stops.set(a.id,{t:now(),target:b.id,part,cls,dmg,off:(HALF[part]??5)-(DEPTH[cls]??2)*(.7+cl(dmg/30,0,1)*.6)});HC.stats.stops++;
 markWound(a,b,w,part,dmg,cls);};}
const tipOf=w=>M.bladeSurface?.(w.id,w.item?.q??1)?.tip||({hammer:33,mace:32,club:27}[w.id]||38);
HC.pose=(a,main,off,angle,c)=>{if(!HC.active||!S.battle)return null;const st=stops.get(a.id);if(!st)return null;
 const t=now()-st.t,hold=HOLD[st.cls]??.07,pull=.2;if(t<0||t>hold+pull){stops.delete(a.id);return null;}
 const b=S.battle.actors.find(x=>x.id===st.target);if(!b||b.g.dead&&t>hold)return null;
 const sx=c.sx,sy=c.sy,fs=Math.sign(sx)||1,toL=P=>({x:(P.x-a.x)/sx,y:(P.y-a.y)/sy-c.bob});
 let cp;try{cp=M.contactAnchor(b,st.part);}catch{cp=null;}if(!cp)return null;
 const root=c.shoulders?.r||{x:4,y:-56},CL=toL(cp),dx0=CL.x-root.x,dy0=CL.y-root.y,d0=Math.max(1,Math.hypot(dx0,dy0)),ux=dx0/d0,uy=dy0/d0;
 // Spitze sitzt auf der Oberfläche bzw. in Eindringtiefe (Figurmaß in Weltmaß umgerechnet)
 const so=st.off,P={x:CL.x-ux*so,y:CL.y-uy*so},tip=tipOf(c.w);
 const dx=P.x-root.x,dy=P.y-root.y,d=Math.max(1,Math.hypot(dx,dy));
 // Zu nah für die Waffenlänge: erst Ellbogen einziehen (Hand bis 12 hinter die Schulter), dann die Klinge abwinkeln,
 // sodass der Rest an der Körperoberfläche entlang statt durch den Körper zeigt
 let reach=Math.min(26,d-tip),aim=Math.atan2(dy,dx),H;
 if(reach>=-12){reach=Math.max(reach,-12);H={x:root.x+dx/d*reach,y:root.y+dy/d*reach};aim=Math.atan2(P.y-H.y,P.x-H.x);}
 else{const ex=-12-reach,phi=Math.min(1.15,ex/tip*2.4),side=uy>=0?1:(st.cls==='stich'||st.cls==='dolch'?1:1);aim=Math.atan2(uy,ux)+phi*side*(ux>=0?1:-1);
  const ax=Math.cos(aim),ay=Math.sin(aim),u=cl((d+12)/tip,.25,1);H={x:P.x-ax*u*tip,y:P.y-ay*u*tip};
  const hx=H.x-root.x,hy=H.y-root.y,hl=Math.hypot(hx,hy);if(hl>26){H={x:root.x+hx*26/hl,y:root.y+hy*26/hl};}}
 // stumpfe Waffen federn kurz zurück, Klingen werden herausgezogen
 let k=1;if(t>hold){const q=(t-hold)/pull,e=q*q*(3-2*q);const back=st.cls==='keule'||st.cls==='kolben'||st.cls==='hammer'?6:9;H={x:H.x-ux*back*e,y:H.y-uy*back*e-2*e};k=1-e*e;}
 else if(t<.025){const j=Math.sin(t/.025*Math.PI)*.6;H={x:H.x+ux*j,y:H.y+uy*j};}
 const res={main:{x:main.x+(H.x-main.x)*k,y:main.y+(H.y-main.y)*k},off,angle:angle+Math.atan2(Math.sin(aim-angle),Math.cos(aim-angle))*k};
 if(HC.debug){const pen=(m,an)=>{const tx=m.x+Math.cos(an)*tip,ty=m.y+Math.sin(an)*tip;return (tx-CL.x)*ux+(ty-CL.y)*uy+(HALF[st.part]??5);};HC.debug.push({t:+t.toFixed(3),cls:st.cls,part:st.part,old:+pen(main,angle).toFixed(1),neu:+pen(res.main,res.angle).toFixed(1)});if(HC.debug.length>400)HC.debug.shift();}
 return res;};

// ---------------------------------------------------------------- 3. Wunde passend zum Schlag (arena.js figureSurface)
// Je Treffer ein Wundbild am getroffenen Körperteil, quer bzw. schräg zur Schlagrichtung, Größe nach Schaden.
// Höchstens 3 je Körperteil; nur im Arbeitsspeicher (WeakMap je Gladiator), nichts im Spielstand.
const marks=new WeakMap();
const KIND={schwerklinge:'kerbe',klinge:'schnitt',dolch:'stich',axt:'hack',stich:'loch',keule:'prellung',kolben:'quetsch',hammer:'krater'};
function markWound(a,b,w,part,dmg,cls){if(!b?.g)return;let L=marks.get(b.g);if(!L){L={};marks.set(b.g,L);}const list=(L[part]??=[]);
 let kind=KIND[cls]||'prellung';if(w.id==='trident')kind='dreiloch';if(cls==='klinge'&&/thrust/.test(a.swingKind||''))kind='stich';if(w.id==='dagger'&&!/thrust/.test(a.swingKind||''))kind='schnitt';
 const tech=a.swingKind,v=a.attackVariant??0,ang=tech==='overhead'?(Math.random()-.5)*.3:tech==='spin'?.12:v===1?-.65:v===2?.15:.6;
 const mat=armorAt(b.g,part);
 list.push({kind,ang:ang+(Math.random()-.5)*.25,u:(Math.random()-.5)*.5,v:(Math.random()-.5)*.4,size:cl(dmg/11,.7,2),mat,heavy:dmg>16});if(list.length>3)list.shift();HC.stats.marks++;}
HC.hasMarks=(a,id)=>HC.active&&!!marks.get(a.g)?.[id]?.length;
function px(ctx,x,y,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),1,1);}
function lineMark(ctx,cx,cy,ang,len,cols){const c=Math.cos(ang),s=Math.sin(ang);for(let i=-len/2;i<=len/2;i+=1){const x=cx+c*i,y=cy+s*i;for(let k=0;k<cols.length;k++)if(cols[k])px(ctx,x-s*(k-((cols.length-1)/2)),y+c*(k-((cols.length-1)/2)),cols[k]);}}
// Leistung: jedes Wundbild wird einmal in ein kleines Bild gemalt und danach nur noch kopiert
HC.surface=(ctx,a,id,item,bounds)=>{if(!HC.active)return false;const list=marks.get(a.g)?.[id];if(!list?.length)return false;
 const [bx,by,bw,bh]=bounds,W=Math.max(2,bw),Hh=Math.max(2,bh),cx0=bx+W/2,cy0=by+Hh/2;
 for(const m of list){const key=item?'sa':'sf';let spr=m[key];if(!spr){spr=document.createElement('canvas');spr.width=spr.height=20;paint(spr.getContext('2d'),m,!!item);m[key]=spr;}
  ctx.drawImage(spr,Math.round(cx0+m.v*W*.5)-10,Math.round(cy0+m.u*Hh*.6)-10);}
 return true;};
function paint(ctx,m,item){const cx=10,cy=10,sz=m.size,ang=m.ang;{
  if(item){// auf der Rüstung
   if(m.mat==='leather'&&/kerbe|schnitt|hack/.test(m.kind)){lineMark(ctx,cx,cy,ang,3+sz*3,['#2a1a12','#a33a2e']);return;}
   if(/prellung|quetsch|krater/.test(m.kind)){px(ctx,cx,cy,'#2c302c');px(ctx,cx+1,cy,'#2c302c');px(ctx,cx-1,cy+1,'#3a3e3a');px(ctx,cx,cy-1,'#e8eadf');if(m.kind==='krater'){px(ctx,cx+1,cy+1,'#242724');px(ctx,cx-1,cy-1,'#e8eadf');}return;}
   if(/loch|stich|dreiloch/.test(m.kind)){px(ctx,cx,cy,'#242724');px(ctx,cx+1,cy,'#e8eadf');return;}
   lineMark(ctx,cx,cy,ang,3+sz*3,['#eef0e4','#3a3d3a']);return;}
  switch(m.kind){
   case 'schnitt':lineMark(ctx,cx,cy,ang,3+sz*2.5,['#5a1a1a','#b33a2e']);px(ctx,cx,cy+2,'#a33a2e');break;
   case 'kerbe':lineMark(ctx,cx,cy,ang,4+sz*3,['#d98c7a','#2a0b0c','#8e2a26']);if(m.heavy)px(ctx,cx,cy,'#e6dcc0');px(ctx,cx,cy+2,'#a33a2e');px(ctx,cx,cy+3,'#8e2a26');break;
   case 'hack':{const c=Math.cos(ang),s=Math.sin(ang),L=3+sz*2.5;for(let i=-L/2;i<=L/2;i++){const w2=Math.max(0,Math.round((1-Math.abs(i)/(L/2+.5))*2));for(let k=-w2;k<=w2;k++)px(ctx,cx+c*i-s*k,cy+s*i+c*k,Math.abs(k)===w2?'#8e2a26':'#2a0b0c');}if(m.heavy){px(ctx,cx,cy,'#e6dcc0');px(ctx,cx+c,cy+s,'#cfc2a4');}px(ctx,cx,cy+3,'#a33a2e');break;}
   case 'stich':px(ctx,cx,cy,'#2a0b0c');px(ctx,cx+1,cy,'#2a0b0c');px(ctx,cx,cy-1,'#9a3328');px(ctx,cx+1,cy+1,'#9a3328');px(ctx,cx,cy+2,'#a33a2e');break;
   case 'loch':for(const [dx,dy] of [[0,0],[1,0],[0,1],[1,1]])px(ctx,cx+dx,cy+dy,'#2a0b0c');for(const [dx,dy] of [[-1,0],[2,1],[0,-1],[1,2]])px(ctx,cx+dx,cy+dy,'#9a3328');px(ctx,cx,cy+3,'#a33a2e');px(ctx,cx+1,cy+4,'#8e2a26');break;
   case 'dreiloch':for(let n=-1;n<=1;n++){px(ctx,cx+n*2,cy,'#2a0b0c');px(ctx,cx+n*2,cy-1,'#9a3328');}px(ctx,cx,cy+2,'#a33a2e');break;
   case 'prellung':{const r=1.5+sz;for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){const q=(x*x)/(r*r)+(y*y)/(r*r*.6);if(q<=1)px(ctx,cx+x,cy+y,q<.35?'#5b3a55':'#7a5368');}break;}
   case 'quetsch':{const r=1.5+sz;for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){const q=(x*x+y*y)/(r*r);if(q<=1)px(ctx,cx+x,cy+y,q<.4?'#4e2c45':'#6e4a63');}px(ctx,cx-1,cy-1,'#7a1f22');px(ctx,cx+1,cy,'#7a1f22');px(ctx,cx,cy+1,'#7a1f22');break;}
   case 'krater':{const r=2+sz*.8;for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){const q=(x*x+y*y)/(r*r);if(q<=1)px(ctx,cx+x,cy+y,q<.3?'#3a1418':q<.7?'#6a2a30':'#7a5368');}if(m.heavy)px(ctx,cx,cy,'#e6dcc0');break;}}}}

// ---------------------------------------------------------------- 4. Drehschlag (arena.js): statt die Figur bis auf ein Drittel flach zu stauchen
// dreht sie sich wirklich: in der hinteren Hälfte der Drehung gespiegelt, nie schmaler als 84 %.
HC.spin=(a,phase)=>{if(!HC.active)return null;const c=Math.cos(phase*Math.PI*2);return{mag:.84+.16*Math.abs(c),flip:c<0};};
HC.reset=()=>{stops.clear();};HC.marksOf=g=>marks.get(g)||null;
})();
