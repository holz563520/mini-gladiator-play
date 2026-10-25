'use strict';
// =====================================================================================================
// NAHAUFNAHMEN BEI VERLETZUNGEN (Hunde-Testlabor)
// Stil wie dist/injury-shots.js: kleines Pixelbild (200 × 125), ganzzahlig vergrößert. Der Kampf hält an, Antippen überspringt.
// Je Waffe eine eigene Bewegung: Schwert (Hieb), Dolch (Stich, Drehen, Herausziehen), Speer und Dreizack (Stoß),
// Axt (Hieb von oben), Keule/Streitkolben/Hammer (stumpfer Schlag, Fell wellt sich), Faust, Pfeil und Bolzen (bleibt stecken),
// Hundebiss am Hund (der andere Hund springt heran, verbeißt sich, schüttelt) und Hundebiss am Menschen (Arm, Bein, Kehle).
// Gezeichnet wird mit dem Hundezeichner (DOG.draw) und dem Skelett (DOG.rig): Wunde und Biss sitzen an der echten Stelle.
// =====================================================================================================
(()=>{
const M=window.MG,S=M.s,DOG=window.DOG,cl=M.clamp,TAU=Math.PI*2;
const FW=200,FH=125,IMPACT=.5,LEN=2.5;
const SH={mode:'severe',q:[],cur:null,gap:0,live:false};DOG.shots=SH;
const rnd=(a,b)=>a+Math.random()*(b-a);
const PARTN={kopf:'am Kopf',hals:'am Hals',brust:'an der Brust',bauch:'in der Flanke',vl:'am Vorderlauf',hl:'am Hinterlauf'};
const HPART={rfa:'den Schwertarm',rua:'den Oberarm',rh:'die Schwerthand',lfa:'den Schildarm',lua:'den linken Oberarm',lh:'die linke Hand',lt:'den Oberschenkel',rt:'den Oberschenkel',lsh:'die Wade',rsh:'die Wade',lf:'den Fuß',rf:'den Fuß',neck:'die Kehle',head:'das Gesicht',chest:'die Brust',belly:'den Bauch'};
function wclass(id=''){if(/dagger/.test(id))return 'dagger';if(/trident/.test(id))return 'trident';if(/spear|javelin|halberd/.test(id))return 'spear';if(/axe/.test(id))return 'axe';if(/club|mace|hammer|flail/.test(id))return 'blunt';if(/fist/.test(id))return 'fist';if(/bow|crossbow|gastraphetes/.test(id))return 'arrow';if(/sling/.test(id))return 'stone';if(/net/.test(id))return null;return 'sword';}
const TITLE={sword:['Schnittwunde','Tiefe Schnittwunde'],dagger:['Stichwunde','Tiefe Stichwunde'],spear:['Stichwunde','Durchbohrt'],trident:['Dreifache Stichwunde','Durchbohrt'],axe:['Hiebwunde','Klaffende Hiebwunde'],blunt:['Prellung','Schwere Quetschung'],fist:['Prellung','Prellung'],arrow:['Pfeil steckt','Pfeil steckt tief'],stone:['Prellung','Platzwunde'],bite:['Bisswunde','Fleisch zerrissen']};
// ---------- Vormerken (aus der Simulation) ----------
// o: {kind:'weapon'|'bite'|'human', victim, attacker, part, dmg, wid, wname, wound, kill}
DOG.shotNote=function(o){if(!SH.live||SH.mode==='off'||!S.battle)return;if(SH.cur&&!o.kill)return;
 const thr=SH.mode==='all'?4:o.kind==='human'?6:9;if(!o.kill&&o.dmg<thr)return;if(SH.gap>0&&!o.kill)return;
 const e=snapshot(o);if(!e)return;if(o.kill)SH.q=[e];else if(!SH.q.length)SH.q.push(e);};
function cloneDog(a){if(!a)return null;return {dog:a.dog,P:a.P,id:'shot-'+a.id,g:{dead:false,name:a.g.name},mode:a.down?'down':'stand',down:!!a.down,clock:1,duration:1,cyc:a.cyc||0,moveSpeed:0,wounds:(a.wounds||[]).map(w=>({...w,t:-99})),gore:{...(a.gore||{})},bleed:{...(a.bleed||{})},mouthBlood:a.mouthBlood||0,energy:a.energy,hit:0,z:0,spray:[],a:0};}
function snapshot(o){const v=o.victim,a=o.attacker;if(!v)return null;const b=S.battle;
 const e={kind:o.kind,part:o.part,dmg:o.dmg,kill:!!o.kill,t:0,parts:[],stains:[],shake:0,flash:0,impact:false,line1:'',title:'',line3:''};
 if(o.kind==='human'){e.human={name:v.g.name,skin:v.g.appearance?.skin||'#c99a72',shade:v.g.appearance?.shade||'#9c7353',cloth:v.g.appearance?.cloth||'#7a4b3a',hair:v.g.appearance?.hair||'#3a2a1f',lying:!!(v.fallTimer>0||v.down||v.draggedBy),weapon:(()=>{try{return M.weapon(v)?.id||'';}catch{return '';}})()};
  e.dog=cloneDog(a);e.dog.mode='grip';e.dogName=a.g.name;if(o.part==='neck'||(o.part==='head'&&GAMEART())){e.throat=true;e.len=TH.len;}humanGame(e,v);if(e.game&&!e.throat)e.len=3.1;
  const heavy=o.dmg>=12||o.part==='neck';e.title=o.part==='neck'?(o.kill?'Kehle zerfetzt':'Kehlbiss'):o.part==='head'?'Biss ins Gesicht':heavy?'Tiefe Bisswunde, Muskel zerrissen':'Bisswunde';
  e.line1=a.g.name+' verbeißt sich in '+(HPART[o.part]||'den Körper')+' von '+v.g.name+':';e.line3=o.kill?'tödlich, er verblutet':o.part==='neck'?'die Halsschlagader ist offen':['rfa','rua','rh'].includes(o.part)?'kann das Schwert nicht führen':['lt','rt','lsh','rsh'].includes(o.part)?'das Bein knickt weg':'blutet stark';return e;}
 e.victim=cloneDog(v);e.wound=o.wound?{...o.wound,t:0}:null;e.victimName=v.g.name;
 if(e.wound){const i=e.victim.wounds.findIndex(w=>w.seed===o.wound.seed);if(i>=0)e.victim.wounds.splice(i,1);}
 if(o.kind==='bite'){e.cls='bite';e.att=cloneDog(a);e.att.mode='snap';e.line1=a.g.name+' beißt '+v.g.name+':';}
 else{e.cls=wclass(o.wid);if(!e.cls)return null;e.wname=o.wname||'';e.skin=a?.g?.appearance?.skin||'#c99a72';try{e.wItem=M.weapon(a)?.item||a?.g?.equipment?.weapon||null;}catch{e.wItem=a?.g?.equipment?.weapon||null;}if(e.wItem&&e.wItem.def!==o.wid)e.wItem=null;{const ra=a?.g?gearOf(a.g).rightarm:null;if(ra){const lk=M.itemLook(ra);e.cuff=ra.material==='medium'?lk.leather:lk.metal;}}e.line1=(a?.g?.name||'Ein Gegner')+(o.wname?' ('+o.wname+')':'')+' trifft '+v.g.name+':';}
 const T=TITLE[e.cls]||TITLE.sword;e.title=(o.dmg>=14?T[1]:T[0])+' '+(PARTN[o.part]||'');e.line3=o.kill?'tödlich':o.part==='hals'?'blutet stark aus dem Hals':o.dmg>=14?'schwer verletzt':'jault auf';
 return e;}
// ---------- Ablauf ----------
// Eine Nahaufnahme um dt weiterführen (für den Kampf und für die Galerie im Editor). Rückgabe: läuft noch?
function stepEntry(e,dt){if(e.kind==='intro'){e.t+=dt;introSound(e);return e.t<INTRO;}
 if(e.throat&&e.t>.4&&e.t<.62)dt*=.35;// Zeitlupe im Moment des Zubeißens
 e.t+=dt;if(!e.impact&&e.t>=IMPACT){e.impact=true;hit(e);}
 if(e.throat)stepThroat(e,dt);
 for(let i=e.parts.length-1;i>=0;i--){const p=e.parts[i];p.vy+=150*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;const fl=e.surf?e.surf(p.x,p):p.floor;if(p.vy>0&&p.y>=fl){e.stains.push({x:p.x,y:fl,r:p.s*(1+Math.random())});e.parts.splice(i,1);}else if(p.life<=0)e.parts.splice(i,1);}
 if(e.stains.length>900)e.stains.splice(0,e.stains.length-900);
 if(e.drip&&e.t>IMPACT){e.dripT=(e.dripT||0)-dt;if(e.dripT<=0){e.dripT=.08;blood(e,e.hx,e.hy,1,40,Math.PI/2,.5);}}
 e.shake=Math.max(0,e.shake-dt*14);e.flash=Math.max(0,e.flash-dt*5);
 return e.t<(e.len||LEN)+(e.kill?1:0);}
SH.stepEntry=stepEntry;
SH.make=o=>{const e=snapshot(o);if(e)e.preview=true;return e;};
SH.step=function(dt){SH.gap=Math.max(0,SH.gap-dt);if(!SH.cur&&SH.q.length){SH.cur=SH.q.shift();SH.cur.t=0;}const e=SH.cur;if(!e)return false;
 if(stepEntry(e,dt))return true;SH.cur=null;SH.gap=e.kind==='intro'?1:4;return false;};
function snd(e,kind){const d=e.dog||e.att||e.victim;if(e.preview)DOG.playSound?.(kind,d?.dog);else DOG.sound?.(kind,null,true);}
SH.skip=()=>{SH.cur=null;SH.q=[];SH.gap=3;};
function blood(e,x,y,n,v,dir,spread=1){for(let i=0;i<n;i++){const an=dir+rnd(-.8,.8)*spread,sp=rnd(.3,1)*v;e.parts.push({x,y,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp-rnd(0,30),s:Math.random()<.3?2:1,life:2,floor:FH-14+rnd(-3,5)});}}
function hit(e){const n=Math.min(60,10+e.dmg*2.4);e.shake=e.cls==='blunt'||e.cls==='axe'?3:2;e.flash=e.dmg>=12?.6:.3;
 if(e.victim){e.victim.hit=.26;e.victim.yelpT=.6;if(e.wound)e.victim.wounds.push(e.wound);e.victim.bleed[e.part]=(e.victim.bleed[e.part]||0)+1.5;snd(e,'yelp');}
 const dir={sword:-2.6,axe:-1.9,dagger:-3,spear:-3.1,trident:-3.1,arrow:-3.1,blunt:-2.4,fist:-2.6,stone:-2.6,bite:-2.2}[e.cls]??-2.4;
 if(e.throat){blood(e,e.hx-6,e.hy-3,40,110,-2.0,.7);blood(e,e.hx,e.hy,20,70,-1.2,1.2);e.flash=.8;e.shake=4;return;}
 if(e.kind==='human'){blood(e,e.hx,e.hy,n,90,-1.6,1.4);e.drip=true;snd(e,'shake');return;}
 if(e.cls==='blunt'||e.cls==='fist'||e.cls==='stone'){blood(e,e.hx,e.hy,Math.round(n*.25),60,dir,1.2);e.ring=1;}else{blood(e,e.hx,e.hy,n,e.cls==='axe'?140:110,dir,e.cls==='spear'||e.cls==='dagger'?.6:1);e.drip=true;}
 if(e.cls==='bite')snd(e,'shake');}
// ---------- Zeichnen ----------
let buf=null;
SH.paint=function(cv,ent){const e=ent||SH.cur;if(!e)return;if(e.kind==='intro')return paintIntro(cv,e);if(e.game)return paintHumanGame(cv,e);buf??=document.createElement('canvas');buf.width=FW;buf.height=FH;const c=buf.getContext('2d');c.imageSmoothingEnabled=false;
 const tt=e.t,impact=cl((tt-(IMPACT-.32))/.32,0,1),after=Math.max(0,tt-IMPACT);
 // Hintergrund: Sand, Bande, Zuschauer verschwommen
 c.fillStyle='#2a1d14';c.fillRect(0,0,FW,FH);c.fillStyle='#3b2a1d';c.fillRect(0,0,FW,40);for(let i=0;i<26;i++){c.fillStyle=i%2?'#4a3626':'#3a2b1f';c.fillRect(i*8,10+(i*7)%9,6,14);}
 const g=c.createLinearGradient(0,40,0,FH);g.addColorStop(0,'#6e5537');g.addColorStop(1,'#a3845a');c.fillStyle=g;c.fillRect(0,40,FW,FH-40);
 for(let i=0;i<60;i++){c.fillStyle=i%2?'#6b5435':'#b29466';c.fillRect((i*37)%FW,44+(i*53)%(FH-48),1,1);}
if(!e.throat)for(const s of e.stains){c.fillStyle='#5d140f';c.fillRect(Math.round(s.x-s.r),Math.round(s.y),Math.round(s.r*2),1);}
 c.save();if(e.shake){c.translate(Math.round(rnd(-e.shake,e.shake)),Math.round(rnd(-e.shake,e.shake)));}
 if(e.kind==='human')paintHuman(c,e,tt,impact,after);else paintDog(c,e,tt,impact,after);
 for(const p of e.parts){c.fillStyle=p.s>1?'#7d150e':'#a3261b';c.fillRect(Math.round(p.x),Math.round(p.y),p.s,p.s);}
 c.restore();
 if(e.throat&&e.ts&&e.ts.a>0)vignette(c,e);
 if(e.flash>0){c.fillStyle=`rgba(255,240,220,${e.flash*.5})`;c.fillRect(0,0,FW,FH);}
 // Wie die Nahaufnahmen des Spiels: Bild füllt die Fläche, Treffpunkt über dem Textbalken, Einblendung im Spielstil
 if(GAMEART()){const ctx=cv.getContext('2d'),W=cv.width,H=cv.height,u=Math.min(W/660,H/420),bh=124*u,pin=after>0?1-Math.pow(1-cl(after/.25,0,1),2):0,s=Math.max(W/FW,H/FH)*(1.02+.04*ease(tt/(e.len||LEN))+.12*pin);
  let dx=Math.round(W/2-e.hx*s),dy=Math.round((H-bh)*.52-e.hy*s);dx=Math.max(Math.round(W-FW*s),Math.min(0,dx));dy=Math.max(Math.round(H-FH*s),Math.min(0,dy));
  ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#120c09';ctx.fillRect(0,0,W,H);ctx.drawImage(buf,dx,dy,Math.round(FW*s),Math.round(FH*s));
  const vg=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.72);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.6)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
  captionGame(ctx,W,H,e,tt-IMPACT);return;}
 // Ausgabe ganzzahlig vergrößert, Text darunter in voller Auflösung
 const ctx=cv.getContext('2d'),W=cv.width,H=cv.height,sc=Math.max(1,Math.floor(Math.min(W/FW,(H-58)/FH))),ow=FW*sc,oh=FH*sc,ox=Math.round((W-ow)/2),oy=Math.max(4,Math.round((H-58-oh)/2));
 ctx.fillStyle='#0b0806';ctx.fillRect(0,0,W,H);ctx.imageSmoothingEnabled=false;ctx.drawImage(buf,ox,oy,ow,oh);ctx.strokeStyle='#6b5636';ctx.lineWidth=2;ctx.strokeRect(ox-1,oy-1,ow+2,oh+2);
 const ta=cl((tt-IMPACT)/.3,0,1);ctx.globalAlpha=ta;ctx.textAlign='center';ctx.fillStyle='#c5bba8';ctx.font='14px system-ui,sans-serif';ctx.fillText(e.line1,W/2,oy+oh+18);
 ctx.fillStyle=e.kill||e.dmg>=14?'#f29b83':'#f4d37a';ctx.font='bold 19px Georgia,serif';ctx.fillText(e.title,W/2,oy+oh+39);ctx.fillStyle='#c5bba8';ctx.font='13px system-ui,sans-serif';ctx.fillText(e.line3+'   ·   antippen: weiter',W/2,oy+oh+55);ctx.globalAlpha=1;};
// Hund als Opfer: Kamera auf den getroffenen Körperteil
function paintDog(c,e,tt,impact,after){const v=e.victim,k=2.25,face=1,R=DOG.rig(v,tt),an=R.anchors[e.part]||R.anchors.brust,s=v.P.sz;
 const cx=e.cls==='bite'?78:92,cy=62,px=Math.round(cx-face*k*s*an.x),py=Math.round(cy-k*s*an.y);e.hx=cx;e.hy=cy;
 // Bei Biss: Angreifer erst zeichnen, wenn er von rechts heranspringt
 if(e.cls==='bite'){const A=e.att,sa=A.P.sz,lunge=1-impact;A.mode=tt<IMPACT?'leap':'grip';A.clock=tt;A.duration=IMPACT;A.shaking=after>0&&after<1.6?(.32-(after%.5)*.6>0?.32-(after%.5)*.6:0):0;A.mouthBlood=Math.min(1,after*.8);
  DOG.draw(c,v,px,py,k,face,{time:tt,noShadow:false,key:'shotV'});
  const ax=cx+Math.round((33+lunge*40)*k*sa),ay=py+Math.round(lunge*-12),tgt=tt<IMPACT?null:{x:(cx-ax)*-1/(k*sa),y:(cy-ay)/(k*sa)};
  if(tt>=IMPACT){A.gripTarget=tgt;}DOG.draw(c,A,ax,ay,k,-1,{time:tt,target:tgt,key:'shotA'});return;}
 // Stumpfer Schlag: Körper ruckt weg
 c.save();if(e.cls==='blunt'||e.cls==='fist'||e.cls==='stone'){const j=after<.25?Math.sin(after/.25*Math.PI)*-4:0;c.translate(j,j*.3);}
 DOG.draw(c,v,px,py,k,face,{time:tt,key:'shotV'});c.restore();
 // Wellen im Fell beim stumpfen Schlag
 if(e.ring&&after<.5){const r=4+after*40;c.strokeStyle=`rgba(255,240,210,${.5-after})`;c.lineWidth=1;c.beginPath();c.ellipse(cx,cy,r,r*.6,0,0,TAU);c.stroke();c.beginPath();c.ellipse(cx,cy,r*.6,r*.36,0,0,TAU);c.stroke();}
 paintWeapon(c,e,cx,cy,tt,impact,after);}
// Waffen: einfache Pixelzeichnungen, Bewegung nach Waffenart
function hand(c,x,y,skin,cuff){if(cuff){c.fillStyle='#29332d';c.fillRect(Math.round(x)+3,Math.round(y)-5,13,10);c.fillStyle=cuff;c.fillRect(Math.round(x)+4,Math.round(y)-4,11,8);c.fillStyle='#ffffff40';c.fillRect(Math.round(x)+4,Math.round(y)-4,11,2);}c.fillStyle=skin;c.fillRect(Math.round(x)-4,Math.round(y)-3,8,6);c.fillStyle='#00000033';c.fillRect(Math.round(x)-4,Math.round(y)+1,8,2);}
function rot(c,x,y,a,fn){c.save();c.translate(x,y);c.rotate(a);fn();c.restore();}
// Echte Waffe des Angreifers (Bild aus weapon-art.js, Güte und Blut wie im Spiel), gleiche Bewegung wie oben
function realWeapon(c,e,cx,cy,tt,impact,after){const cls=e.cls,it=e.wItem,spr=M.weaponArt.sprite(it,0,0),len=Math.max(8,spr.canvas.width-spr.ox),bl=Math.max(it.blood||0,after>0?.6:0);
 const put=(tx,ty,phi,L)=>{const sc=L/len,gx=tx-Math.cos(phi)*L,gy=ty-Math.sin(phi)*L;M.weaponArt.draw(c,it,{x:gx,y:gy,angle:phi,scale:sc,blood:bl,drips:false});return [gx,gy];};
 const R=(x,y,th,lx,ly)=>[x+lx*Math.cos(th)-ly*Math.sin(th),y+lx*Math.sin(th)+ly*Math.cos(th)];let gp=null;
 if(cls==='sword'){const a=-1.15+impact*1.3+Math.min(after,.2)*2.2,pvx=cx+52,pvy=cy-58,th=a+Math.PI/2,[tx,ty]=R(pvx,pvy,th,0,61);gp=put(tx,ty,th+Math.PI/2,55);
  if(impact>.7&&after<.25){c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=2;c.beginPath();c.arc(pvx,pvy,62,th+1.2,th+1.7);c.stroke();}}
 else if(cls==='dagger'){const out=after>.55?cl((after-.55)/.3,0,1):0,depth=impact*(1-out),tw=after>0&&after<.55?Math.sin(after*20)*.25:0,x=cx+52-depth*46,[tx,ty]=R(x,cy,tw,-14,0);gp=put(tx,ty,tw+Math.PI,26);}
 else if(cls==='axe'){const a=-1.6+impact*1.55,pvx=cx+18,pvy=cy-70,[tx,ty]=R(pvx,pvy,a,-4,72);gp=put(tx,ty,a+Math.PI/2,70);}
 else if(cls==='blunt'){const a=-1.3+impact*1.25,pvx=cx+40,pvy=cy-60,th=a+Math.PI/2,[tx,ty]=R(pvx,pvy,th,0,64);gp=put(tx,ty,th+Math.PI/2,60);}
 else if(cls==='spear'||cls==='trident'){const out=after>.45?cl((after-.45)/.35,0,1):0,x=cx-8+(1-impact*(1-out))*90;put(x-6,cy,Math.PI,120);hand(c,x+60,cy,e.skin,e.cuff);gp=[x+95,cy];}
 else return false;
 hand(c,gp[0],gp[1],e.skin,e.cuff);return true;}
function paintWeapon(c,e,cx,cy,tt,impact,after){if(e.wItem&&M.weaponArt?.supports(e.wItem.def)&&realWeapon(c,e,cx,cy,tt,impact,after))return;const cls=e.cls,skin=e.skin,steel='#c9ced2',edge='#f2f4f2',dark='#7d8388',wood='#6d4a2c',bloody=after>0;
 const B=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h);};
 if(cls==='sword'){// Hieb im Bogen von rechts oben, durch die Stelle hindurch
  const a=-1.15+impact*1.3+Math.min(after,.2)*2.2,pvx=cx+52,pvy=cy-58;rot(c,pvx,pvy,a+Math.PI/2,()=>{B(-2,6,4,8,'#8a6a3a');B(-5,13,10,2,'#b08a4a');B(-1.5,15,3,46,steel);B(-.5,15,1,46,edge);B(-1.5,58,3,3,dark);if(bloody){B(-1.5,40,3,18,'#9b2a1f');}});
  if(impact>.7&&after<.25){c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=2;c.beginPath();c.arc(pvx,pvy,62,a+Math.PI/2+1.2,a+Math.PI/2+1.7);c.stroke();}
  const hx=pvx+Math.cos(a+Math.PI)*-8,hy=pvy+Math.sin(a+Math.PI)*-8;hand(c,pvx,pvy,skin);}
 else if(cls==='dagger'){// Stich hinein, drehen, heraus
  const inT=impact,out=after>.55?cl((after-.55)/.3,0,1):0,depth=inT*(1-out),tw=after>0&&after<.55?Math.sin(after*20)*.25:0,x=cx+52-depth*46;
  rot(c,x,cy,tw,()=>{B(6,-3,14,6,'#5a3b22');B(4,-4,3,8,'#b08a4a');B(-14,-1.5,18,3,steel);B(-14,-.5,18,1,edge);if(bloody)B(-14,-1.5,10,3,'#9b2a1f');});hand(c,x+14,cy,skin);}
 else if(cls==='spear'||cls==='trident'){const inT=impact,out=after>.45?cl((after-.45)/.35,0,1):0,x=cx-8+(1-inT*(1-out))*90+out*0;
  B(x+10,cy-1.5,140,3,wood);B(x+10,cy-1.5,140,1,'#8a6440');
  if(cls==='spear'){c.fillStyle=steel;c.beginPath();c.moveTo(x-6,cy);c.lineTo(x+4,cy-4);c.lineTo(x+12,cy);c.lineTo(x+4,cy+4);c.closePath();c.fill();if(bloody)B(x-6,cy-1,12,2,'#9b2a1f');}
  else{B(x+6,cy-7,4,14,steel);for(const dy of [-6,0,6]){B(x-8,cy+dy-1,15,2,steel);if(bloody)B(x-8,cy+dy-1,7,2,'#9b2a1f');}}
  hand(c,x+60,cy,skin);hand(c,x+95,cy,skin);}
 else if(cls==='axe'){const a=-1.6+impact*1.55,pvx=cx+18,pvy=cy-70;rot(c,pvx,pvy,a,()=>{B(-1.5,0,3,62,wood);c.fillStyle=steel;c.beginPath();c.moveTo(-2,54);c.quadraticCurveTo(-18,60,-12,74);c.lineTo(-2,66);c.closePath();c.fill();B(-14,62,3,10,edge);if(bloody)B(-13,62,6,10,'#9b2a1f');});hand(c,pvx,pvy+6,skin);}
 else if(cls==='blunt'){const a=-1.3+impact*1.25,pvx=cx+40,pvy=cy-60;rot(c,pvx,pvy,a+Math.PI/2,()=>{B(-2,6,4,44,wood);c.fillStyle='#5b4a3a';c.beginPath();c.arc(0,56,8,0,TAU);c.fill();c.fillStyle='#7d6a56';c.beginPath();c.arc(-2,54,4,0,TAU);c.fill();for(let i=0;i<6;i++){const q=i/6*TAU;B(Math.cos(q)*9-1,56+Math.sin(q)*9-1,2,2,dark);}});hand(c,pvx,pvy,skin);}
 else if(cls==='fist'){const x=cx+8+(1-impact)*70;B(x,cy-6,16,12,skin);B(x,cy-6,3,12,'#00000033');B(x+16,cy-5,40,10,e.cloth||'#7a4b3a');}
 else if(cls==='arrow'||cls==='stone'){if(cls==='stone'){const x=cx+(1-impact)*120;if(impact<1){c.fillStyle='#8a8478';c.beginPath();c.arc(x,cy,3,0,TAU);c.fill();}}
  else{const x=cx-4+(1-impact)*140,vib=after>0&&after<.6?Math.sin(after*60)*(1-after/.6)*2:0;rot(c,x,cy,vib*.05,()=>{B(0,-.5,34,1.5,'#8a6440');c.fillStyle=dark;c.beginPath();c.moveTo(-5,0);c.lineTo(1,-2.5);c.lineTo(1,2.5);c.closePath();c.fill();B(28,-3,6,2,'#d8d2c0');B(28,1.5,6,2,'#d8d2c0');});}}}
// Mensch als Opfer: Arm, Bein oder Kehle groß, der Hund packt zu
function paintHuman(c,e,tt,impact,after){if(e.throat)return paintThroat(c,e,tt,impact,after);const H=e.human,part=e.part,arm=['rfa','lfa','rua','lua','rh','lh'].includes(part),leg=/^(lt|rt|lsh|rsh|lf|rf)$/.test(part),throat=part==='neck'||part==='head';
 const B=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 const pull=after>0?Math.sin(after*9)*2*(after<1.6?1:0):0;let hx,hy;
 const P=(pts,col)=>{c.fillStyle=col;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();};
 if(arm){// Ärmel, Ellbogen, Unterarm (verjüngt), Handgelenk, Faust mit Waffe
  const y=54+pull;P([[0,y-12],[44,y-11],[48,y+11],[0,y+12]],H.cloth);B(0,y-12,44,2,'#ffffff22');B(40,y-12,6,24,'#00000033');
  P([[44,y-10],[70,y-11],[118,y-7],[124,y-6],[124,y+6],[118,y+7],[70,y+10],[44,y+10]],H.skin);P([[46,y+4],[118,y+4],[124,y+6],[118,y+7],[70,y+10],[46,y+10]],H.shade);B(50,y-9,60,1,'#ffffff30');
  P([[122,y-8],[138,y-9],[142,y-4],[142,y+6],[136,y+9],[122,y+7]],H.skin);for(const yy of [-5,-1,3])B(136,y+yy,6,1,H.shade);
  if(['rfa','rua','rh'].includes(part)){B(130,y-24,5,18,'#6d4a2c');B(124,y-9,18,3,'#b08a4a');B(131,y-66,4,44,'#c9ced2');B(132,y-66,1,44,'#f2f4f2');}
  hx=88;hy=y;}
 else if(leg){// Oberschenkel mit Tunikasaum, Knie, Wade, Knöchel, Sandale
  const x=58+pull;P([[x-13,0],[x+13,0],[x+11,22],[x-11,22]],H.cloth);P([[x-12,20],[x+12,20],[x+10,32],[x-10,32]],H.skin);
  P([[x-10,32],[x+11,32],[x+13,52],[x+8,76],[x-7,76],[x-11,52]],H.skin);P([[x+5,34],[x+11,32],[x+13,52],[x+8,76],[x+3,76],[x+7,52]],H.shade);B(x-8,36,2,30,'#ffffff30');
  P([[x-7,76],[x+8,76],[x+9,86],[x+24,90],[x+24,96],[x-9,96],[x-9,86]],H.skin);for(const yy of [78,84,90])B(x-9,yy,20,2,'#5a3b22');B(x-11,95,38,5,'#4a3020');hx=x+9;hy=52;}
 else{// liegend, Kopf links: Gesicht, Kinn, Hals (Bisspunkt), Schulter unter dem Hund
  const y=80;P([[4,y-22],[36,y-24],[46,y-14],[46,y+6],[36,y+12],[6,y+10]],H.skin);P([[2,y-26],[34,y-28],[38,y-22],[2,y-20]],H.hair);B(12,y-12,6,3,'#2a1d18');B(6,y-4,6,2,'#6a3b30');B(10,y+6,22,3,H.shade);
  P([[44,y-9],[84,y-8],[88,y+6],[44,y+8]],H.skin);P([[44,y+3],[88,y+3],[88,y+6],[44,y+8]],H.shade);B(58,y-9,10,2,H.shade);P([[84,y-14],[200,y-12],[200,y+14],[84,y+12]],H.cloth);hx=66;hy=y-3;}
 e.hx=hx;e.hy=hy;
 // Bissspuren und Blut am Körper
 if(after>0){const n=Math.min(1,after*2);c.fillStyle='#4a0f0b';for(let i=0;i<5;i++){B(hx-12+i*6,hy-6,2,2,'#3d0b08');B(hx-10+i*6,hy+5,2,2,'#3d0b08');}B(hx-12,hy-3,26,6*n,'#9b2a1f');for(let i=0;i<4;i++)B(hx-8+i*6,hy+3,1.5,4+after*12*(0.6+(i%2)*.4),'#8d2219');}
 // Hund: kommt von rechts, Maul genau auf den Bisspunkt
 const A=e.dog,k=2.05,sa=A.P.sz,lunge=1-impact,shake=after>0&&after<1.8?Math.max(0,.32-(after%.5)*.6):0;A.mode=tt<IMPACT?'leap':'grip';A.clock=tt;A.duration=IMPACT;A.shaking=shake;A.mouthBlood=Math.min(1,after);
 const ax=hx+Math.round((34+lunge*40)*k*sa),ay=Math.round(throat?FH-6:Math.min(FH+14,hy+36*k*sa))+Math.round(lunge*-8);
 const tgt=tt<IMPACT?null:{x:(hx-ax)*-1/(k*sa),y:(hy-ay)/(k*sa)};A.gripTarget=tgt;DOG.draw(c,A,ax,ay,k,-1,{time:tt,target:tgt,key:'shotH'});}
// ---------- Kehlbiss: eigene, längere Nahaufnahme ----------
// Ablauf: Anlauf und Zubeißen (Zeitlupe) → wildes Schütteln, die Halsschlagader spritzt im Herzschlag, die Hand krallt sich ins Fell
// → der Hund reißt den Kopf zurück, ein Fetzen hängt im Maul, die offene Kehle (Luftröhre, Ader, Hautlappen) ist zu sehen, Blutfontäne
// → er beißt nach und schüttelt erneut → die Hand sinkt, der Blick wird glasig, Blut aus dem Mundwinkel, die Lache wächst.
const TH={len:4.8,beat:.6,rev0:1.75,rev1:2.5,limp:2.75,G:104,hx:60,hy:80};
const ease=v=>{v=cl(v,0,1);return v*v*(3-2*v);};
function throatState(e){const a=Math.max(0,e.t-IMPACT);
 const pb=a<TH.rev0?0:a<TH.rev0+.22?ease((a-TH.rev0)/.22):a<TH.rev1-.14?1:a<TH.rev1?1-ease((a-(TH.rev1-.14))/.14):0;
 const tear=cl((a-TH.rev0-.05)/.2,0,1),life=1-ease((a-TH.limp)/.8)*(e.kill?1:.55);
 const env=a<=0?0:a<TH.rev0?Math.min(1,a/.12)*(1-a/TH.rev0*.35):a>TH.rev1&&a<TH.rev1+1.2?(1-(a-TH.rev1)/1.2)*.85:0;
 const beat=(a%TH.beat)/TH.beat,pump=a>0?Math.max(0,1-beat/.28):0;
 const strength=cl(1.1-a/6,.2,1)*(e.kill&&a>3.5?Math.max(0,1-(a-3.5)/.9):1);
 return {a,pb,tear,life,env,sx:Math.sin(a*25)*5*env,sy:Math.cos(a*12.5)*2*env,pump,strength};}
function stepThroat(e,dt){const s=throatState(e);e.ts=s;if(s.a<=0)return;
 // Herzschlag: Strahl aus der Halsschlagader, erst seitlich am Maul vorbei, bei offener Kehle als Fontäne
 if(s.pump>0&&e.parts.length<600){const open=s.pb>.3,n=Math.round((open?6:3.5)*s.strength*s.pump+Math.random());
  const ox=open?e.hx+1:e.hx-9+s.sx*.6,oy=e.hy-3;
  for(let i=0;i<n;i++){const an=(open?-1.5:-2.2)+rnd(-.13,.13),sp=(open?125:88)*s.strength*rnd(.8,1.08);e.parts.push({x:ox+rnd(-1,1),y:oy,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp,s:Math.random()<.5?2:1,life:3,floor:TH.G});}}
 // Lache unter Hals und Kopf
 e.pool=Math.min(e.kill?66:50,(e.pool||0)+dt*(7+16*s.pump)*s.strength);
 // Kamera ruckt bei jedem Umschlag des Schüttelns
 if(s.env>0&&Math.abs(Math.sin(s.a*25))>.94)e.shake=Math.max(e.shake,1.8*s.env);
 if(s.pb>.85&&!e.snap){e.snap=true;e.shake=3;blood(e,e.hx+4,e.hy-6,24,90,-1.4,1);}
 // Röcheln: Blut aus dem Mund
 if(s.a>1&&s.life>.25){e.coughT=(e.coughT??.3)-dt;if(e.coughT<=0){e.coughT=rnd(.8,1.3);blood(e,e.mx??37,e.my??71,7,55,-1.75,.45);}}
 cue(e,'hum',.04,'human');cue(e,'gr',.95,'growl');cue(e,'tear',TH.rev0+.08,'snarl');cue(e,'shk2',TH.rev1,'shake');if(!e.kill)cue(e,'hum2',TH.limp,'human');}
function cue(e,key,at,kind){e.cues??={};if(!e.cues[key]&&e.ts.a>=at){e.cues[key]=1;snd(e,kind);}}
// Oberfläche, auf der Tropfen landen: Gesicht, Hals, Rumpf oder Sand
function throatSurf(x,p){const r=p.r0??=Math.random(),gr=TH.G+1+r*7;return x<2||x>198?gr:x<12?gr:x<42?(r<.65?68+Math.abs(x-28)*.3+((r*977)%1)*22:gr):x<78?(r<.5?79+((r*577)%1)*12:gr):r<.7?72+((r*313)%1)*18:gr;}
function vignette(c,e){const s=e.ts,v=(.16+.34*s.pump*s.strength)*(e.kill&&s.a>3.6?1.3:1),g=c.createRadialGradient(e.hx,e.hy,26,e.hx,e.hy,150);g.addColorStop(0,'rgba(90,0,0,0)');g.addColorStop(1,`rgba(90,0,0,${Math.min(.7,v)})`);c.fillStyle=g;c.fillRect(0,0,FW,FH);}
function paintThroat(c,e,tt,impact,after){const H=e.human,s=e.ts||throatState(e),G=TH.G,hx=TH.hx,hy=TH.hy;e.hx=hx;e.hy=hy;e.surf=throatSurf;
 const B=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 const P=(pts,col)=>{c.fillStyle=col;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();};
 const life=s.life,dead=e.kill&&life<.08,breath=after>0?Math.sin(s.a*8)*life:Math.sin(tt*5)*.6;
 // Lache: unter dem Körper hervor, mit nassem Glanz
 if(e.pool>0){const r=e.pool;c.fillStyle='#3e0907';c.beginPath();c.ellipse(hx-6,G+2,r,2+r*.15,0,0,TAU);c.fill();c.fillStyle='#6d130d';c.beginPath();c.ellipse(hx-8,G+1.5,r*.72,1.5+r*.09,0,0,TAU);c.fill();B(hx-r*.55,G+1,r*.35,1,'#b23a2c');}
 // Hals, Kopf nach hinten überstreckt, Kehle frei
 P([[40,77],[50,79],[64,80],[78,75],[80,G],[38,G]],H.skin);P([[38,G-7],[80,G-7],[80,G],[38,G]],H.shade);B(50,78,4,2,H.skin);B(44,88,30,1,'#00000022');B(46,84,26,1,'#ffffff1e');
 const head=[[42,73],[38,70],[34,69],[31,68],[29,62],[25,66],[20,67],[13,69],[6,75],[3,86],[6,98],[14,G],[38,G],[43,84]];P(head,H.skin);
 P([[14,68],[6,74],[2,86],[5,99],[13,G],[22,G],[18,94],[16,82],[19,72]],H.hair);B(22,83,5,7,H.shade);B(23,85,2,3,'#00000040');B(28,74,10,1,H.shade);
 // Blässe, je schwächer er wird
 if(life<1){c.globalAlpha=(1-life)*.35;P(head,'#b9c3cc');c.globalAlpha=1;}
 // Auge: weit aufgerissen → glasig
 B(19,69,5,3,life>.5?'#efe7d6':'#cfc8bb');if(life>.5){B(21+Math.round(Math.sin(s.a*3)*.6),69,2,2,'#1a120e');B(18,67,6,1,'#3a2a1f');}else if(dead){B(21,69,2,2,'#5a5a62');B(19,69,5,1,H.shade);}else{B(22,69,1,1,'#55555c');B(19,69,5,2,H.shade);}
 // Mund: keucht, schnappt nach Luft, voll Blut
 const op=(after>0?(.45+.55*Math.abs(Math.sin(s.a*6.5)))*Math.max(.25,life):.3)*(dead?.55:1);P([[33,69],[38,70],[37,70+4*op],[34,69+3*op]],after>.8?'#4a0806':'#2a0d0a');B(34,69,2,1,'#e8e2d0');
 if(after>.8){const L=Math.min(G-72,(after-.8)*20);B(38,71,1.5,L,'#8d1d14');B(39,72,1,L*.7,'#5a0c08');B(33,69,6,1,'#9b2a1f');}
 // Blutflecken (auf Gesicht, Hals, Rumpf und Sand) vor dem Hund
 for(const st of e.stains){c.fillStyle=st.y>=G?'#5d140f':'#7d150e';c.fillRect(Math.round(st.x-st.r),Math.round(st.y),Math.round(st.r*2),st.y>=G?1:2);}
 // Die Wunde: erst Zahnlöcher, dann die aufgerissene Kehle
 if(after>0){for(let i=0;i<5;i++){B(hx-12+i*6,hy-5,2,2,'#2d0705');B(hx-10+i*6,hy+5,2,2,'#2d0705');}
  for(const [dx,f,w] of [[-12,.9,1],[-5,.5,1],[3,1,1],[9,.35,1]]){const L=Math.min(G-hy-5,Math.max(0,after-.6)*9*f);B(hx+dx,hy+5,w,L,'#7a150e');if(L>4)B(hx+dx,hy+5+L-2,w+1,2,'#8d1d14');}
  const T=s.tear;if(T>0){P([[hx-14,hy-1],[hx-9,hy-4-3*T],[hx-2,hy-3-2*T],[hx+6,hy-5-2*T],[hx+14,hy-1],[hx+11,hy+4+3*T],[hx+2,hy+6+4*T],[hx-8,hy+5+3*T]],'#330504');
   P([[hx-11,hy],[hx-6,hy-2-2*T],[hx+5,hy-3-T],[hx+11,hy],[hx+8,hy+3+2*T],[hx-6,hy+3+2*T]],'#86170f');
   B(hx-7,hy-1,12,4*T,'#d6b2a2');for(let i=0;i<4;i++)B(hx-6+i*3,hy-1,1,4*T,'#9e7466');B(hx-1,hy,3,2*T,'#1a0202');
   B(hx+5,hy+1,7,2,'#c0281c');B(hx+11,hy+1,2,2,'#2a0303');B(hx-4,hy-2,2,1,'#ff8f78');B(hx+7,hy+1,1,1,'#ffb0a0');
   P([[hx+8,hy+4],[hx+15,hy+2],[hx+17,hy+11+T*4],[hx+10,hy+12+T*3]],H.skin);B(hx+8,hy+4,7,1,'#9b2a1f');B(hx+10,hy+11+T*3,7,1,'#9b2a1f');}}
 // Hund: springt von rechts, Maul auf der Kehle, schüttelt, reißt zurück, beißt nach
 const A=e.dog,k=2.05,sa=A.P.sz,lunge=1-impact;A.mode=tt<IMPACT?'leap':'grip';A.clock=tt;A.duration=IMPACT;A.shaking=s.env*.32;A.mouthBlood=Math.min(1,after*1.3);
 const tx=hx+s.sx+18*s.pb,ty=hy+s.sy*.5-30*s.pb,ax=hx+Math.round((30+lunge*40)*k*sa+30*s.pb),ay=G-7+Math.round(lunge*-10-8*s.pb);
 const tgt=tt<IMPACT?null:{x:(tx-ax)*-1/(k*sa),y:(ty-ay)/(k*sa)};A.gripTarget=tgt;DOG.draw(c,A,ax,ay,k,-1,{time:tt,target:tgt,key:'shotH'});
 // Rumpf in der Tunika (Brust hebt sich beim Keuchen)
 const ch=Math.round(breath*1.2);P([[76,75],[96,71+ch],[130,70+ch],[200,71],[200,G],[78,G]],H.cloth);B(96,72+ch,104,1,'#ffffff22');for(const x of [118,146,172])B(x,76,1,G-78,'#00000026');B(78,G-5,122,5,'#00000030');
 // Fetzen zwischen Kehle und Maul, reißt ab und baumelt
 if(s.a>TH.rev0&&s.a<TH.rev1+.05){if(!e.snap){c.strokeStyle='#9b2a1f';c.lineWidth=2.5;c.beginPath();c.moveTo(hx+3,hy-2);c.quadraticCurveTo((hx+tx)/2+3,(hy+ty)/2+4,tx,ty);c.stroke();c.strokeStyle='#d98a7a';c.lineWidth=1;c.stroke();}
  else{c.strokeStyle='#9b2a1f';c.lineWidth=2;c.beginPath();c.moveTo(tx,ty);c.quadraticCurveTo(tx-1+s.sx*.3,ty+5,tx-3+Math.sin(s.a*14)*2,ty+10);c.stroke();}
  P([[tx-4,ty-2],[tx+3,ty-3],[tx+4,ty+2],[tx-2,ty+4]],H.skin);B(tx-3,ty,6,2,'#9b2a1f');}
 // Seine Hand krallt sich ins Nackenfell, zittert, zieht, sinkt dann kraftlos weg
 const SX=88,SY=78,rest=[118,G-3],grab=[tx+17+s.sx*.5,ty-11],fall=[127,G+1],reach=ease((after-.15)/.45)*(after>0?1:0),slump=ease((s.a-TH.limp)/.7)*(e.kill?1:.65);
 let hdx=rest[0]+(grab[0]-rest[0])*reach,hdy=rest[1]+(grab[1]-rest[1])*reach;hdx+=(fall[0]-hdx)*slump;hdy+=(fall[1]-hdy)*slump;
 if(reach>.5&&slump<.5){hdx+=rnd(-.6,.6)*life;hdy+=rnd(-.6,.6)*life;}
 const L=21,dx=hdx-SX,dy=hdy-SY,d=Math.min(Math.hypot(dx,dy),2*L-.5),mx=SX+dx/2,my=SY+dy/2,hh=Math.sqrt(Math.max(0,L*L-(d/2)**2)),nx=-dy/(Math.hypot(dx,dy)||1),ny=dx/(Math.hypot(dx,dy)||1),sg=ny<0?1:-1,ex=mx+nx*hh*sg,ey=my+ny*hh*sg;
 c.lineCap='round';c.strokeStyle=H.shade;c.lineWidth=7;c.beginPath();c.moveTo(SX,SY);c.lineTo(ex,ey);c.lineTo(hdx,hdy);c.stroke();c.strokeStyle=H.skin;c.lineWidth=5;c.stroke();c.lineCap='butt';
 c.fillStyle=H.cloth;c.beginPath();c.arc(SX,SY+1,6,0,TAU);c.fill();
 c.fillStyle=H.skin;c.beginPath();c.ellipse(hdx,hdy,4.5,3.5,0,0,TAU);c.fill();B(hdx-4,hdy+1,8,2,H.shade);if(reach>.6&&slump<.4){for(let i=0;i<4;i++)B(hdx-4+i*2.5,hdy-6+Math.abs(i-1.5),1.5,4,H.skin);B(hdx+4,hdy-2,3,1.5,H.skin);}else for(let i=0;i<4;i++)B(hdx-5+i*2.5,hdy+2,1.5,3,H.skin);
 if(after>1.2)B(hdx-2,hdy-2,4,3,'#8d1d14');}
// ---------- Mensch als Opfer: gezeichnet wie im Spiel, mit seiner echten Ausrüstung ----------
// Kehle: Großaufnahme aus face-shots.js (Gesicht, Helm, Brustpanzer, Schulterplatten, Mimik), der Hund verbeißt sich im Hals.
// Arm und Bein: Ansicht der Körperstelle aus injury-shots.js (Haut, Porträt, Name), darüber Armschiene oder Beinschiene
// (Farben und Zier wie im Arenabild, M.itemLook), in der Waffenhand die echte Waffe (M.weaponArt), am Schildarm der Schild.
const GAMEART=()=>!!(M.faceShot&&M.injuryShots);
const LIMBV={forearm:{A:[71,46],seg:[[30,32,27],[112,60,19]],hand:[121,60],ang:-1.35,ws:1.5},upperarm:{A:[68,40],seg:[[30,20,34],[106,60,27]]},hand:{A:[74,52],seg:[[-6,52,24],[50,52,21]],band:[.05,.8]},
 thigh:{A:[67,40],seg:[[26,20,44],[108,60,33]]},shin:{A:[70,44],seg:[[28,26,31],[112,62,19]]},foot:{A:[92,62],seg:[[58,-8,24],[66,52,18]]}};
const ARMOR_OF=p=>({rua:'rightarm',rfa:'rightarm',rh:'rightarm',lua:'leftarm',lfa:'leftarm',lh:'leftarm',rt:'rightleg',rsh:'rightleg',rf:'rightleg',lt:'leftleg',lsh:'leftleg',lf:'leftleg'})[p];
function gearOf(g){const r={};try{for(const it of M.armorItems(g)||[])r[it.def]=it;}catch{}return r;}
const hmix=(a,b,k)=>{const p=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)),x=p(a),y=p(b);return '#'+x.map((v,i)=>Math.max(0,Math.min(255,Math.round(v+(y[i]-v)*k))).toString(16).padStart(2,'0')).join('');};
// Für den Kampf und die Galerie: Ausrüstung und Ankerpunkte festhalten
function humanGame(e,v){if(!GAMEART()||!v?.g)return;e.g=v.g;e.team=v.team??1;e.gear=gearOf(v.g);
 try{const w=M.weapon(v);e.wItem=w?.item||v.g.equipment?.weapon||null;}catch{e.wItem=v.g.equipment?.weapon||null;}e.shield=v.g.equipment?.shield||v.g.enemyGear?.shield||null;
 e.game=true;e.view=e.throat?'face':M.injuryShots.viewOf(e.part);e.right=e.part[0]==='r';
 if(e.throat){e.hx=80;e.hy=83;e.mx=80;e.my=68;e.surf=(x,p)=>{const r=p.r0??=Math.random();return x>52&&x<108&&r<.75?86+r*24:112;};}
 else{const L=LIMBV[e.view]||LIMBV.forearm;e.hx=L.A[0];e.hy=L.A[1];e.surf=(x,p)=>{const r=p.r0??=Math.random();return r<.4?e.hy+6+r*30:104;};}}
// Rüstungsteil als Band über dem Glied (Zier je Material und Güte wie armorSegment in arena.js, vergrößert)
function armorBand(c,item,a,b,w,k0=.18,k1=.86){const p=M.itemLook(item),Q=item.q||0,mat=item.material||'metal',base=mat==='medium'?p.leather:p.metal,dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy),x0=L*k0,len=Math.round(L*(k1-k0)),f=Math.min(2.2,w/9),h=w/2;
 c.save();c.translate(a[0],a[1]);c.rotate(Math.atan2(dy,dx));c.translate(x0,0);const r=(x,y,ww,hh,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(ww)),Math.max(1,Math.round(hh)));};
 r(-1,-h-1,len+2,w+2,'#29332d');r(0,-h,len,w,base);r(0,-h,len,Math.max(2,w*.18),hmix(base,'#ffffff',.25));r(0,h-Math.max(2,w*.22),len,Math.max(2,w*.22),hmix(base,'#000000',.32));
 c.scale(f,f);const W=Math.round(w/f)-2,hh=W/2,ln=Math.round(len/f),mid=Math.round(ln/2);
 if(mat==='leather'){r(1,-hh,2,W,p.dark);r(ln-3,-hh,2,W,p.dark);if(Q>=2)for(let x=4;x<ln-4;x+=3)r(x,0,1,1,p.edge);if(Q>=3){r(Math.round(ln*.33),-1,2,2,p.stud);r(Math.round(ln*.66),-1,2,2,p.stud);}if(Q>=5){r(0,-hh,ln,1,p.trim);r(0,hh-1,ln,1,p.trim);}if(Q===6)r(mid-1,-2,3,3,p.gem);}
 else if(mat==='medium'){for(const x of [2,mid-1,ln-5]){r(x,-hh,3,W,p.metal);r(x,-hh,3,1,p.edge);}if(Q>=3){r(2,-1,ln-4,2,p.metal);r(2,-1,ln-4,1,p.edge);}if(Q>=5){r(0,-hh,ln,1,p.trim);r(0,hh-1,ln,1,p.trim);}}
 else{r(0,-hh,2,W,p.trim);r(ln-3,-hh,3,W,p.trim);r(3,-hh+1,ln-7,1,p.edge);if(Q>=3)r(mid-1,-hh,2,W,p.trim);if(Q>=4){r(3,0,ln-7,1,p.edge);r(Math.round(ln*.25),hh-2,1,1,p.edge);r(Math.round(ln*.75),hh-2,1,1,p.edge);}if(Q>=5){r(0,-hh,ln,1,p.trim);r(0,hh-1,ln,1,p.trim);}if(Q===6)r(mid-1,-2,3,3,'#c16d49');}
 c.restore();return {len,base};}
// Schild am Schildarm (Rand und Buckel, Farben aus M.itemLook)
function shieldRim(c,item,x,y,R){const p=M.itemLook(item),base=p.metal||'#7b5a38';c.fillStyle='#29332d';c.beginPath();c.arc(x,y,R+1,0,TAU);c.fill();c.fillStyle=p.wood||hmix(base,'#5a3b22',.5);c.beginPath();c.arc(x,y,R,0,TAU);c.fill();c.strokeStyle=p.edge||'#c2c9bf';c.lineWidth=2;c.beginPath();c.arc(x,y,R-1,0,TAU);c.stroke();c.fillStyle=base;c.beginPath();c.arc(x,y,R*.28,0,TAU);c.fill();c.fillStyle=p.edge||'#e0e0d0';c.fillRect(Math.round(x-R*.12),Math.round(y-R*.18),2,2);}
// Bildaufbau: Grundbild des Spiels in voller Größe, eigene Ebene (160 × 100/104) mit Hund, Rüstung und Blut darüber
let gBase=null,gOver=null;
function layer(w,h){gBase??=document.createElement('canvas');if(gBase.width!==w||gBase.height!==h){gBase.width=w;gBase.height=h;}gOver??=document.createElement('canvas');gOver.width=160;gOver.height=104;const o=gOver.getContext('2d');o.imageSmoothingEnabled=false;return o;}
function paintHumanGame(cv,e){const ctx=cv.getContext('2d'),W=cv.width,H=cv.height,tt=e.t,k=tt-IMPACT,after=Math.max(0,k),impact=cl((tt-(IMPACT-.32))/.32,0,1);const o=layer(W,H),bg=gBase.getContext('2d');bg.imageSmoothingEnabled=false;
 let s,x0,y0,shx=0,shy=0,mirror=false,lift=0;const TZ=Math.max(.6,(W/160)/(Math.max(W/160,H/104)*1.12));
 if(e.throat){const S2=e.ts||throatState(e),life=S2.life;
  const mood=k<0?'terror':S2.a<TH.rev0?'pain':S2.a<TH.rev1?'shock':life>.4?'pain':'out';
  M.faceShot.paint(bg,W,H,{g:e.g,team:e.team,mood,yaw:-.22,pale:(1-life)*.9,blood:cl((S2.a-.8)/1.4),sink:after>0?3+(1-life)*16+S2.env*Math.sin(S2.a*25)*1.5:0,tilt:S2.sx*.025+(1-life)*.22,zoom:TZ,shake:0,dark:e.kill?cl((S2.a-4.2)/1.4)*.5:0},tt);
  const z=TZ*1.12*(1+.07*ease(tt/5));s=Math.max(W/160,H/104)*z;x0=Math.round(W/2-160*s/2);y0=Math.round(Math.min(0,(H-104*s)*.42));
  // Bild nach oben schieben, damit der Hals über dem Textbalken liegt
  lift=Math.min(0,Math.round((H-124*Math.min(W/660,H/420))*.72-(y0+e.hy*s)));y0+=lift;shx=Math.round(S2.sx*.5*s*.25+rnd(-1,1)*e.shake*s*.3);shy=Math.round(rnd(-1,1)*e.shake*s*.2);
  paintThroatOver(o,e,S2,tt,impact,after);}
 else{const tg=Math.min(.5,tt*.12),zoom=1+.04*ease(tg/3.1);
  M.injuryShots.paint(bg,W,H,{g:e.g,part:e.part,kind:'cut',cls:'none',mute:true,noFace:false},tg);
  s=Math.max(W/160,H/100)*zoom;const dw=160*s,dh=100*s;x0=Math.max(W-dw,Math.min(0,Math.round(W/2-80*s)));y0=Math.max(H-dh,Math.min(0,Math.round(H/2-50*s)));mirror=e.right;
  const env=after>0&&after<1.9?Math.max(0,1-after/1.9):0;shx=Math.round(Math.sin(after*24)*2.4*env*s/2+rnd(-1,1)*e.shake*s*.3);shy=Math.round(Math.cos(after*12)*1.2*env*s/2);
  paintLimbOver(o,e,tt,impact,after);}
 // zusammensetzen: gleiche Vergrößerung, gleiche Spiegelung, gemeinsames Rucken
 ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#120c09';ctx.fillRect(0,0,W,H);ctx.drawImage(gBase,shx,shy+lift);
 ctx.save();if(mirror){ctx.translate(W,0);ctx.scale(-1,1);}ctx.drawImage(gOver,0,0,160,104,x0+(mirror?-shx:shx),y0+shy,Math.round(160*s),Math.round(104*s));ctx.restore();
 if(e.throat&&e.ts?.a>0){const S2=e.ts,v=Math.min(.6,(.12+.3*S2.pump*S2.strength)),g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.32,W/2,H/2,Math.max(W,H)*.7);g.addColorStop(0,'rgba(120,0,0,0)');g.addColorStop(1,`rgba(130,6,4,${v})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
 if(e.flash>0){ctx.fillStyle=`rgba(255,246,220,${e.flash*.55})`;ctx.fillRect(0,0,W,H);}
 captionGame(ctx,W,H,e,k);}
// Hund, Biss und Blut an der Kehle (Koordinaten wie das Bild aus face-shots.js, 160 × 104)
function paintThroatOver(c,e,S2,tt,impact,after){const N={x:e.hx,y:e.hy+Math.round(S2.env*Math.sin(S2.a*25)*.8)},B=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
 const P=(pts,col)=>{c.fillStyle=col;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();};
 // Blut läuft über Brust und Panzer
 if(after>.2)for(const [dx,f,w] of [[-8,.8,1],[-3,1,2],[3,.55,1],[8,.9,1]]){const L=Math.min(24,(after-.2)*12*f*S2.strength+(e.kill?after*2:0));B(N.x+dx,N.y+3,w,L,'#8d2219');B(N.x+dx+(w>1?1:0),N.y+3+L*.3,1,L*.6,'#6b2420');}
 for(const st of e.stains)B(st.x-st.r*.6,st.y,st.r*1.2,1.5,'#8a2a22');
 // Wunde: Zahnlöcher, dann aufgerissen (Luftröhre, Ader, Hautlappen)
 if(after>0){// Zahnlöcher, verschmiertes Blut (unregelmäßig)
  for(const [x,y] of [[-11,-5],[-6,-6],[-1,-5],[5,-6],[10,-4],[-10,4],[-4,5],[2,5],[8,4]])B(N.x+x,N.y+y,2,2,'#2d0705');
  for(const [x,y,w2,h2] of [[-13,-3,9,4],[-5,-2,7,3],[2,-3,10,5],[-9,1,6,3],[4,2,8,2]])B(N.x+x,N.y+y,w2,h2,'#8d2219');
  const T=S2.tear;if(T>0){const sc=.6+.4*T,R=[[-14,0],[-11,-3],[-8,-2],[-6,-6],[-2,-4],[1,-7],[5,-5],[8,-6],[11,-2],[15,-1],[13,3],[10,5],[7,9],[3,7],[0,10],[-4,7],[-8,8],[-11,4]];
   P(R.map(([x,y])=>[N.x+x*sc,N.y+y*T]),'#240302');P(R.map(([x,y])=>[N.x+x*sc*.72+1,N.y+y*T*.62+1]),'#6e110b');
   // Luftröhre: blasses Rohr mit Knorpelringen, eingerissen
   B(N.x-9,N.y-3,9,6*T,'#d9b8a8');for(let i=0;i<4;i++)B(N.x-8+i*2.5,N.y-3,1,6*T,'#a07a6c');B(N.x-6,N.y-1,4,2*T,'#140101');
   // Halsschlagader: zerrissen, hellrot
   B(N.x+3,N.y,7,2,'#c0281c');B(N.x+9,N.y-1,2,3,'#ff5a40');B(N.x+3,N.y+3,4,1,'#8a1a12');
   // Fasern, die über die Lücke hängen
   c.strokeStyle='#b5503f';c.lineWidth=1;for(const [x0,x1] of [[-5,-3],[2,5],[7,6]]){c.beginPath();c.moveTo(N.x+x0,N.y-5*T);c.quadraticCurveTo(N.x+(x0+x1)/2,N.y+2,N.x+x1,N.y+7*T);c.stroke();}
   // Hautlappen rechts unten, nach außen geklappt
   const sk=e.g?.appearance?.skin||'#c99a72';P([[N.x+7,N.y+6*T],[N.x+14,N.y+3*T],[N.x+17,N.y+10+5*T],[N.x+12,N.y+13+4*T],[N.x+8,N.y+11*T]],sk);B(N.x+8,N.y+6*T,7,1,'#9b2a1f');B(N.x+11,N.y+12+4*T,5,1,'#7a1a14');
   // Blut quillt am unteren Rand und läuft
   for(let i=0;i<6;i++)B(N.x-10+i*4,N.y+5*T+(i%2),2,2+((S2.a*3+i)%3),'#a8372f');B(N.x-3,N.y-6*T,2,1,'#ff9a82');}}
 // Hund von rechts unten: Kopf im Profil, Maul am Hals
 const A=e.dog,k=2.35,sa=A.P.sz,lunge=1-impact;A.mode=tt<IMPACT?'leap':'grip';A.clock=tt;A.duration=IMPACT;A.shaking=S2.env*.32;A.mouthBlood=Math.min(.35,after*.5);
 const tx=N.x+S2.sx+24*S2.pb,ty=N.y+2+S2.sy*.5-4*S2.pb,ax=N.x+Math.round((27+lunge*26)*k*sa+30*S2.pb),ay=N.y+Math.round(30*k*sa+lunge*12);
 const tgt=tt<IMPACT?null:{x:(tx-ax)*-1/(k*sa),y:(ty-ay)/(k*sa)};A.gripTarget=tgt;DOG.draw(c,A,ax,ay,k,-1,{time:tt,target:tgt,key:'shotHG',noShadow:true});
 if(S2.a>TH.rev0&&S2.a<TH.rev1+.05){if(!e.snap){c.strokeStyle='#9b2a1f';c.lineWidth=3;c.beginPath();c.moveTo(N.x+3,N.y-2);c.quadraticCurveTo((N.x+tx)/2+3,(N.y+ty)/2+5,tx,ty);c.stroke();c.strokeStyle='#d98a7a';c.lineWidth=1;c.stroke();}
  else{c.strokeStyle='#9b2a1f';c.lineWidth=2;c.beginPath();c.moveTo(tx,ty);c.quadraticCurveTo(tx-1,ty+6,tx-3+Math.sin(S2.a*14)*2,ty+12);c.stroke();}
  P([[tx-5,ty-2],[tx+3,ty-3],[tx+5,ty+2],[tx-2,ty+5]],e.g?.appearance?.skin||'#c99a72');B(tx-4,ty,7,2,'#9b2a1f');}
 for(const p of e.parts)B(p.x,p.y,p.s,p.s,p.s>1?'#7d150e':'#b8352a');}
// Hund, Rüstung, Waffe und Blut an Arm oder Bein (Koordinaten wie das Bild aus injury-shots.js, 160 × 100, ungespiegelt)
function paintLimbOver(c,e,tt,impact,after){const L=LIMBV[e.view]||LIMBV.forearm,A0={x:L.A[0],y:L.A[1]},B=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
 const it=e.gear?.[ARMOR_OF(e.part)],hard=it&&it.material!=='leather',bl=hard?.45:1;
 // Waffe in der Hand bzw. Schild am Schildarm (hinter dem Hund)
 if(L.hand){if(e.right&&e.wItem&&M.weaponArt?.supports(e.wItem.def)){const drop=after>.7?cl((after-.7)/.5):0;M.weaponArt.draw(c,e.wItem,{x:L.hand[0]+drop*6,y:L.hand[1]+drop*10,angle:(L.ang||-1.3)+drop*1.6,scale:L.ws||1.5,blood:e.wItem.blood||0,drips:false});}
  else if(!e.right&&e.shield)shieldRim(c,e.shield,L.hand[0]+16,L.hand[1]-4,26);}
 // Arm- oder Beinschiene
 if(it){const [a,b]=L.seg,bd=L.band||[.18,.86];armorBand(c,it,[a[0],a[1]],[b[0],b[1]],(a[2]+b[2])/2+2,bd[0],bd[1]);}
 // Biss: Zahnlöcher im Bogen, Blut quillt, läuft am Glied herab
 if(after>0){const n=Math.min(1,after*2.5);for(let i=0;i<6;i++){const u=(i-2.5)/2.5;B(A0.x+u*12,A0.y-9+u*u*3,2,2,hard?'#1f1a17':'#2d0705');B(A0.x+u*11,A0.y+8-u*u*3,2,2,hard?'#1f1a17':'#2d0705');}
  if(hard)for(let i=0;i<5;i++)B(A0.x-10+i*5,A0.y-10,1,1,'#fffbe8');
  c.globalAlpha=.85;B(A0.x-12,A0.y-4,24,8*n*bl,'#a8372f');c.globalAlpha=1;
  for(const [dx,f] of [[-9,.7],[-3,1],[4,.6],[9,.85]]){const len=Math.min(30,after*12*f*bl);B(A0.x+dx,A0.y+5,1,len,'#8d2219');B(A0.x+dx,A0.y+5+len,2,1.5,'#6b2420');}}
 for(const st of e.stains)B(st.x-st.r*.6,st.y,st.r*1.2,1.5,'#8a2a22');
 // Hund: Kopf von unten rechts, Maul am Wundpunkt, zerrt und schüttelt
 const A=e.dog,k=1.9,sa=A.P.sz,lunge=1-impact,env=after>0&&after<1.9?Math.max(0,1-after/1.9):0;A.mode=tt<IMPACT?'leap':'grip';A.clock=tt;A.duration=IMPACT;A.shaking=env>0?Math.max(0,.32-(after%.5)*.6):0;A.mouthBlood=Math.min(.3,after*.4);
 const tx=A0.x+Math.sin(after*24)*2*env,ty=A0.y+Math.cos(after*12)*1.5*env,ax=A0.x+Math.round((26+lunge*30)*k*sa),ay=A0.y+Math.round(40*k*sa+lunge*14);
 const tgt=tt<IMPACT?null:{x:(tx-ax)*-1/(k*sa),y:(ty-ay)/(k*sa)};A.gripTarget=tgt;DOG.draw(c,A,ax,ay,k,-1,{time:tt,target:tgt,key:'shotHL',noShadow:true});
 for(const p of e.parts)B(p.x,p.y,p.s,p.s,p.s>1?'#7d150e':'#b8352a');}
// Einblendung wie im Spiel: Porträt und Name oben links, Balken unten mit wer, was, Folgen
const gFaces=new WeakMap();
function captionGame(g,w,h,e,k){const u=Math.min(w/660,h/420);g.save();const face=!!e.g&&!e.throat;let f=face?gFaces.get(e.g):null;if(face&&!f){f=document.createElement('canvas');try{M.renderPortrait(f,e.g,{unarmored:true});}catch{}gFaces.set(e.g,f);}
 const pw=!face?-Math.round(12*u):Math.round(72*u),ph=Math.round(90*u),px=Math.round(10*u),py=px;if(face){g.fillStyle='#17201c';g.fillRect(px-3,py-3,pw+6,ph+6);g.fillStyle='#e0b565';g.fillRect(px-2,py-2,pw+4,ph+4);if(f?.width)g.drawImage(f,px,py,pw,ph);}
 g.textAlign='left';g.textBaseline='top';g.font=`bold ${Math.round(25*u)}px 'Courier Prime',monospace`;const name=String(e.g?.name||e.victimName||'').toUpperCase(),part=e.g?(()=>{try{return M.partName(e.part);}catch{return '';}})():({kopf:'Kopf',hals:'Hals',brust:'Brust',bauch:'Flanke',vl:'Vorderlauf',hl:'Hinterlauf'})[e.part]||'';
 g.fillStyle='#17201c';g.fillText(name,px+pw+12*u+2,py+2);g.fillStyle='#efe0b3';g.fillText(name,px+pw+12*u,py);g.font=`bold ${Math.round(19*u)}px 'Courier Prime',monospace`;g.fillStyle='#17201c';g.fillText(part,px+pw+12*u+2,py+31*u+2);g.fillStyle='#e0b565';g.fillText(part,px+pw+12*u,py+31*u);
 if(e.throat&&k<0){const bh=Math.round(124*u);g.globalAlpha=.86;g.fillStyle='#0d0a08';g.fillRect(0,h-bh,w,bh);g.globalAlpha=1;}
 if(k>=0){const a=cl(k/.18,0,1),bh=Math.round(124*u),by=h-bh;g.globalAlpha=a*.86;g.fillStyle='#0d0a08';g.fillRect(0,by,w,bh);g.globalAlpha=a;g.fillStyle='#a3231d';g.fillRect(0,by,w,Math.max(2,Math.round(3*u)));g.textAlign='center';
  const fit=(txt,px2,bold)=>{let z=Math.round(px2*u);do{g.font=`${bold?'bold ':''}${z}px 'Courier Prime',monospace`;}while(g.measureText(txt).width>w-40*u&&--z>8);};
  fit(e.line1,21);g.fillStyle='#d9cfb0';g.fillText(e.line1,w/2,by+11*u);const big=e.title.toUpperCase();fit(big,44,true);const pop=1+.25*(1-cl(k/.22,0,1));g.font=g.font.replace(/\d+px/,m=>Math.round(parseInt(m)*pop)+'px');g.fillStyle='#17201c';g.fillText(big,w/2+2,by+38*u+2);g.fillStyle=e.kill||e.throat||e.dmg>=14?'#f29b83':'#f4d37a';g.fillText(big,w/2,by+38*u);
  fit(e.line3,20);g.fillStyle='#efe0b3';g.fillText(e.line3,w/2,by+90*u);}
 g.restore();}
// ---------- Vorstellung: böser Blick in Nahaufnahme ----------
const INTRO=3.6;
SH.makeIntro=function(a){const D=a.dog,c=cloneDog(a);c.mode='threat';c.intro={lips:0,jaw:0,quiver:0,ears:0,head:0};const st=D.stats,cp=D.caps||D.stats,avg=o=>Math.round(DOG.STATS.reduce((n,[k])=>n+o[k],0)/DOG.STATS.length);
 return {kind:'intro',t:0,dog:c,name:D.name,team:a.team,line1:`${D.breedName} · ${D.sex} · ${D.height} cm · ${D.weight} kg`,line3:`Kraft ${st.kraft} · Biss ${st.biss} · Wildheit ${st.wild} · Ist Ø ${avg(st)} / Soll Ø ${avg(cp)}`,parts:[],stains:[],snd:{}};};
SH.intro=function(a){if(SH.mode==='off')return;SH.q.push(SH.makeIntro(a));};
function introSound(e){const S2=e.snd;if(e.t>.7&&!S2.g){S2.g=1;(e.preview?DOG.playSound:DOG.sound)?.('growl',e.preview?e.dog.dog:e.dog,true);}if(e.t>2.05&&!S2.b){S2.b=1;(e.preview?DOG.playSound:DOG.sound)?.('bark',e.preview?e.dog.dog:e.dog,true);}}
function paintIntro(cv,e){buf??=document.createElement('canvas');buf.width=FW;buf.height=FH;const c=buf.getContext('2d'),tt=e.t,d=e.dog,ease=v=>{v=cl(v,0,1);return v*v*(3-2*v);};c.imageSmoothingEnabled=false;
 // Ablauf: aus dem Dunkel, Lefzen ziehen langsam hoch, Zittern, kurzes Anbellen, Knurren hält an
 const curl=ease((tt-.5)/1.2),barkQ=tt>2.05&&tt<2.35?Math.sin((tt-2.05)/.3*Math.PI):0;
 d.intro={lips:.2+curl*.8,jaw:.04+curl*.2+barkQ*.7,quiver:curl,ears:.15+curl*.25,head:.1-barkQ*.2};d.growlT=curl>.3?1:0;d.barkAt=null;d.hit=0;d.moveSpeed=0;
 c.fillStyle='#0b0706';c.fillRect(0,0,FW,FH);
 const fl=.7+.3*Math.sin(tt*13)+.15*Math.sin(tt*31);const g=c.createRadialGradient(150,30,4,120,60,150);g.addColorStop(0,`rgba(255,140,50,${.35*fl})`);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,FW,FH);
 // Kamera fährt langsam heran, Kopf füllt das Bild
 const k=4.1+tt*.35,face=-1,R=DOG.rig(d,tt),an={x:R.anchors.kopf.x*.45+R.mouth.x*.55,y:R.anchors.kopf.y*.45+R.mouth.y*.55},s=d.P.sz,tr=curl*.6*(Math.random()-.5);
 const px=Math.round(104-face*k*s*an.x+tr+barkQ*-3),py=Math.round(58-k*s*an.y+tr);
 DOG.draw(c,d,px,py,k,face,{time:tt,noShadow:true,key:'introDog'});
 // Augen: Glanz im Fackellicht
 const ex=R.eye.x,ey=R.eye.y,sx=px+face*k*s*ex,sy=py+k*s*ey;
 c.fillStyle=`rgba(255,200,90,${.5+.4*curl})`;c.fillRect(Math.round(sx-1),Math.round(sy-1),2,2);c.fillStyle='rgba(255,90,40,.25)';c.beginPath();c.arc(sx,sy,3+curl*2,0,TAU);c.fill();
 // Abdunkeln an den Rändern, Einblenden aus dem Schwarz
 const v=c.createRadialGradient(100,66,30,100,66,125);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.85)');c.fillStyle=v;c.fillRect(0,0,FW,FH);
 const fade=1-ease(tt/.6);if(fade>0){c.fillStyle=`rgba(0,0,0,${fade})`;c.fillRect(0,0,FW,FH);}
 if(barkQ>.5){c.fillStyle='rgba(255,230,200,.08)';c.fillRect(0,0,FW,FH);}
 const ctx=cv.getContext('2d'),W=cv.width,H=cv.height,sc=Math.max(1,Math.floor(Math.min(W/FW,(H-58)/FH))),ow=FW*sc,oh=FH*sc,ox=Math.round((W-ow)/2),oy=Math.max(4,Math.round((H-58-oh)/2));
 ctx.fillStyle='#050302';ctx.fillRect(0,0,W,H);ctx.imageSmoothingEnabled=false;ctx.drawImage(buf,ox,oy,ow,oh);
 const ta=cl((tt-.9)/.5,0,1);ctx.globalAlpha=ta;ctx.textAlign='center';ctx.fillStyle=e.team?'#e58b6d':'#7fc4bc';ctx.font='bold 24px Georgia,serif';ctx.fillText(e.name,W/2,oy+oh+24);
 ctx.fillStyle='#c5bba8';ctx.font='13px system-ui,sans-serif';ctx.fillText(e.line1,W/2,oy+oh+42);ctx.fillText(e.line3+'   ·   antippen: weiter',W/2,oy+oh+57);ctx.globalAlpha=1;}
window.DOG_SHOTS=true;
})();
