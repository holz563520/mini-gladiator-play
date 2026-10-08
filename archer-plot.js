'use strict';
// PFEIL IM HINTERKOPF: einmaliges Ereignis. Fünf Tage nachdem der erste Fernkämpfer mit Bogen oder Armbrust im Kader steht,
// planen ein paar Gladiatoren den Sturz des Schmieds. Lehnt der Spieler ab, geht alles normal weiter.
// Stimmt er zu, folgt eine gescriptete Szene; der Schütze stirbt dauerhaft (vorhandenes M.kill), der Schmied überlebt immer.
// Ergebnis wird vor der Szene gespeichert; Laden spielt nichts erneut ab.
(()=>{
const M=window.MG,S=M.s,$=id=>typeof document==='undefined'?null:document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DELAY=5,P=()=>S.archerPlot??={seen:0,state:'',asked:0},W=()=>M.workshop?.state,smithName=()=>W()?.master?.name||'Der Schmied';
const ranged=g=>!g.dead&&!g.smithDuty&&g.role==='Fernkämpfer'&&['bow','crossbow'].includes(M.gear(g,'weapon')?.def);
const archer=()=>S.roster.find(ranged),others=a=>S.roster.filter(g=>g!==a&&!g.dead&&!g.smithDuty).sort((x,y)=>(y.role==='Soldat')-(x.role==='Soldat'));
// ---------- Gespräch ----------
function talk(a){const [s1,s2,s3]=others(a),n=g=>esc(g?.name.split(' ')[0]||'Einer'),fallen=S.fallen.find(f=>f.name)?.name.split(' ')[0]||'Titus',weapon=M.gear(a,'weapon')?.def==='crossbow'?'seiner Armbrust':'seinem Bogen',A=esc(a.name.split(' ')[0]),N=esc(smithName());
 const L=[[s1,'Leute. Kurze Lagebesprechung. Und zwar leise.'],[s2,'Geht’s schon wieder um den Schmied?'],[s1,'Natürlich geht’s um den Schmied. Diese verdammte Schreckensherrschaft muss endlich aufhören. Der hat schon zig von unseren Freunden umgebracht.'],[s3||s2,`Neulich hat er ${esc(fallen)} nur angeschaut. Nur angeschaut. Danach hat ${esc(fallen)} nie wieder ein Wort gesagt.`],[s2,'Und was willst du machen? Ihn höflich bitten, damit aufzuhören?'],[s1,`Nein. Wir haben doch jetzt ${A}. Mit ${weapon}.`],[s3||s2,'Ein Schuss. Von hinten. In den Kopf. Fertig.'],[s2,`Der merkt gar nichts. ${N} hämmert doch den ganzen Tag.`],[s1,'Lanista, du sagst doch selbst immer, ein Ludus braucht Ordnung. Was meinst du?']];
 return `<div class="plot-talk">${L.map(([g,t])=>`<p class="wanderer-line"><b>${n(g)}:</b> „${t}“</p>`).join('')}</div>`;}
function ask(){const a=archer();if(!a)return;P().asked=S.day;M.persist();M.ui.modal('Verschwörung in der Kaserne',talk(a),`<button class="btn" data-action="plot:no">„Oh, ich glaube, das ist keine gute Idee. Ich bin doch nicht bescheuert.“</button><button class="btn primary" data-action="plot:yes">„Ja. Wir brauchen endlich einen vernünftigen Schmied. Ich erledige das.“</button>`);}
function decline(){const a=archer(),[s1,s2]=others(a),p=P();p.state='declined';M.persist();M.ui.modal('Verschwörung in der Kaserne',`<p class="wanderer-line own"><b>Du:</b> „Oh, ich glaube, das ist keine gute Idee. Ich bin doch nicht bescheuert.“</p><p class="wanderer-line"><b>${esc(s1?.name.split(' ')[0]||'Einer')}:</b> „Feigling.“</p><p class="wanderer-line"><b>${esc(s2?.name.split(' ')[0]||'Ein anderer')}:</b> „Nein. Klug. Ich will auch noch ein paar Jahre leben.“</p>`);}
// ---------- Szene ----------
let sc=null,clock=0;
const lerp=(a,b,k)=>a+(b-a)*Math.max(0,Math.min(1,k)),between=(t,a,b)=>t>=a&&t<b;
function smithActor(){const p=W().master,rng=S.rng,g=M.makeGladiator(0);Object.assign(g,{id:'plot-smith',name:p.name,height:p.height,weight:p.weight,muscle:58,fame:0,scars:[]});g.appearance={...p.appearance};g.equipment={weapon:null,secondary:null,shield:null,armor:{}};const items={hammer:M.makeItem('weapon','hammer',1),dagger:M.makeItem('weapon','dagger',1),sword:M.makeItem('weapon','gladius',1)};g.enemyGear={weapon:null,secondary:items.hammer,shield:null,armor:{}};S.rng=rng;return {id:g.id,g,items,team:0,x:712,y:262,a:Math.PI,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,forgeWorker:true,bloodMarks:{}};}
// Szenenzeit; Zeitlupe über die Abspielrate.
const SLOW=[[6,6.3,.25],[6.3,7.6,.3],[7.6,9.2,.5],[28.6,29.6,.3]],rate=t=>SLOW.find(([a,b])=>t>=a&&t<b)?.[2]??1;
const RUN={c:[760,300],r:32,w:2,t0:36.9},GRAB=28.6,HIT=6.3,END=45.4;
function lines(){const A=sc.a;return [
 [0.3,3.3,'cap',smithName()+' hämmert. '+sc.name+' schleicht sich an.'],
 [9.2,11.6,'s','Oh. Du wolltest mir in den Hinterkopf schießen. Du wolltest mich wohl umbringen.'],
 [12.8,15.6,'s','Wir hätten doch einfach drüber sprechen können, wenn wir Differenzen haben.'],
 [15.9,18.4,'a','Es tut mir so leid … es tut mir so leid … bitte verschone mich!'],
 [18.4,20.6,'s','Mach dir keinen Kopf. Ich wollte doch nur mit dir darüber sprechen.'],
 [20.6,22.8,'s','Damit wir unsere Differenzen aus dem Weg bekommen. Komm doch einfach mal her.'],
 [25,27.2,'s','Komm, gib mir mal deine Hand. Wir schaffen diese Differenzen aus dem Weg.'],
 [27.2,28.6,'s','Dann kommen wir besser miteinander aus.'],
 [31.4,33.6,'a','AAAAAAAAAAH!'],
 [34.4,36.6,'s','Ich finde gut, dass wir miteinander gesprochen haben.'],
 [36.9,38.4,'a','AAAH! AAAAAH!'],[38.9,40.3,'a','AAAAAAH!']];}
function runAt(t){const th=Math.PI*.15+RUN.w*(t-RUN.t0);return {x:RUN.c[0]+Math.cos(th)*RUN.r,y:RUN.c[1]+Math.sin(th)*RUN.r*.55,dx:-Math.sin(th)};}
const STRIKE=40.5,SPOT=(()=>{const p=runAt(STRIKE);return {x:p.x-14*Math.sign(p.dx||1),y:p.y};})();
function start(){const a=archer();if(!a||sc||S.battle)return false;const clone=JSON.parse(JSON.stringify(a)),name=a.name.split(' ')[0],cross=M.gear(a,'weapon')?.def==='crossbow';
 // Ergebnis zuerst: der Schütze stirbt dauerhaft.
 P().state='done';M.kill(a,'Wollte '+smithName()+' von hinten erschießen. Kopf in die Esse, dann geköpft.',smithName());M.persist();
 clone.dead=false;sc={t:0,name,cross,a:{id:'plot-archer',g:clone,team:0,x:880,y:300,a:Math.PI,phase:0,state:'idle',energy:100,ammo:1,moveSpeed:0,bloodMarks:{}},s:smithActor(),limbs:[],fx:[],done:{},arrow:null,stuck:0,flip:0,cam:{x:780,y:270,vw:300},charred:false,soiled:false};
 sc.view=document.createElement('div');sc.view.id='archerPlot';sc.view.className='smith-ceremony smith-intro smith-wrath no-smith-song';sc.view.setAttribute?.('role','dialog');sc.view.setAttribute?.('aria-modal','true');sc.view.setAttribute?.('aria-label','Pfeil im Hinterkopf');
 sc.view.innerHTML='<div><canvas id="archerPlotCanvas" width="660" height="420"></canvas><p id="archerPlotText" aria-live="polite"></p><button class="btn" data-action="plot:skip">ÜBERSPRINGEN →</button></div>';document.body.appendChild(sc.view);M.ui.close();M.ui.render();return true;}
function end(){if(!sc)return;sc.view?.remove?.();sc=null;M.ui.render();M.ui.notify('Der Ludus hat einen Fernkämpfer weniger. '+smithName()+' hämmert weiter.');}
function once(k,fn){if(sc.done[k])return;sc.done[k]=true;fn();}
function burst(x,y,n,colors,spread=40,up=30){for(let i=0;i<n;i++)sc.fx.push({x:x+Math.random()*6-3,y,z:Math.random()*6,vx:(Math.random()-.5)*spread,vy:(Math.random()-.5)*6,vz:up*(.5+Math.random()),life:.5+Math.random()*.6,size:2,color:colors[i%colors.length]});}
function sever(v,part,dir,extra={}){const g=v.g;for(const k of M.branches[part]||[part])if(g.body[k])g.body[k].missing=true;sc.limbs.push({x:v.x+dir*4,y:v.y,z:part==='head'?52:38,angle:0,part,skin:extra.skin||g.appearance.skin,hair:extra.hair||g.appearance.hair,g,vx:dir*(extra.vx||30),vy:4,vz:extra.vz||34,spin:dir*8});burst(v.x,v.y-30,14,['#aa3c36','#87352e'],50,25);M.sound?.('sever');}
function pose(t){const s=sc.s,a=sc.a;
 for(const p of [s,a]){p.state='idle';p.moveSpeed=0;p.wind=0;p.swing=0;p.technique=null;p.forgePose='';p.traderPose=null;p.stagger=0;p.facePain=0;p.retreat=0;p.phase=t*4;}
 // Schmied
 s.hidden=t>=END-.6;
 if(t<HIT){s.x=712;s.y=262;s.a=Math.PI;const k=t%0.9;s.technique='overhead';s.windMax=.35;s.wind=k<.35?.35-k:0;s.swingKind='slash';s.swingMax=.2;s.swing=k>=.35&&k<.55?.55-k:0;if(k>=.5&&k<.5+1/30*1.5&&t<HIT-.1)once('clank'+Math.floor(t/.9),()=>M.sound?.('block'));}
 if(between(t,HIT,7.6)){s.stagger=.6;s.facePain=.4;}
 if(between(t,7.6,8.6)){s.forgePose='shake';}
 if(t>=8.6)s.a=0;
 if(between(t,11.6,12.8)){s.forgePose='sip';}
 if(t>=11.6)s.g.enemyGear.secondary=null;
 if(between(t,18.6,20.4)){const k=(t-18.6)/1.8;s.x=lerp(712,792,k);s.state='move';s.moveSpeed=10;s.phase=t*6;s.a=0;}else if(between(t,20.4,36.9)){s.x=792;s.y=262;s.a=0;}
 if(between(t,28,GRAB+1.4))s.traderPose='point';
 if(t>=29.8&&t<36.8)s.g.enemyGear.secondary=s.items.dagger;
 if(between(t,29.85,30.05)){s.technique='overhead';s.windMax=.2;s.wind=30.05-t;}
 if(between(t,30.05,30.3)){s.swingKind='slash';s.swingMax=.25;s.swing=30.3-t;}
 if(between(t,30.4,33.6))s.state='celebrate';
 if(t>=36.8)s.g.enemyGear.secondary=s.items.sword;
 if(between(t,36.9,38.6)){const k=(t-36.9)/1.7;s.x=lerp(792,SPOT.x,k);s.y=lerp(262,SPOT.y,k);s.state='move';s.moveSpeed=10;s.phase=t*6;s.a=SPOT.x>=792?0:Math.PI;}
 if(between(t,38.6,42.2)){s.x=SPOT.x;s.y=SPOT.y;const p=runAt(STRIKE);s.a=p.x>=s.x?0:Math.PI;}
 if(between(t,STRIKE-.3,STRIKE)){s.technique='overhead';s.windMax=.3;s.wind=STRIKE-t;}
 if(between(t,STRIKE,STRIKE+.25)){s.swingKind='slash';s.swingMax=.25;s.swing=STRIKE+.25-t;}
 if(between(t,41,41.8))s.state='celebrate';
 if(between(t,42.2,END-.6)){const k=(t-42.2)/(END-.6-42.2);s.x=lerp(SPOT.x,748,k);s.y=lerp(SPOT.y,240,k);s.state='move';s.moveSpeed=10;s.phase=t*6;s.a=748>=SPOT.x?0:Math.PI;}
 // Schütze
 if(t<3.4){const k=(t-.3)/3.1;a.x=lerp(880,838,k);a.y=lerp(300,294,k);if(t>.3){a.state='move';a.moveSpeed=6;a.phase=t*4;}a.a=Math.PI;}
 else if(t<22.8){a.x=838;a.y=294;a.a=Math.PI;}
 if(between(t,3.4,HIT)){a.swingKind='shoot';a.windMax=1.1;if(!sc.cross)a.wind=Math.max(.01,1.1-(t-3.4)*.42);if(t>=6)a.wind=0;a.x+=Math.sin(t*20)*.3;}
 if(between(t,6,6.3)){a.swingKind='shoot';a.swingMax=.3;a.swing=6.3-t;}
 if(between(t,HIT,22.8)&&t>9.2)a.retreat=1;
 if(between(t,15.6,28.6)){a.x+=Math.sin(t*38)*1.1;a.facePain=.5;a.retreat=1;}
 if(between(t,22.8,25)){const k=(t-22.8)/2.2;a.x=lerp(838,822,k)+Math.sin(t*38);a.y=lerp(294,262,k);a.state='move';a.moveSpeed=5;a.phase=t*3;a.a=Math.PI;}else if(between(t,25,36.9)){a.x=822+(t<GRAB?Math.sin(t*38)*.9:0);a.y=262;a.a=Math.PI;}
 if(between(t,27.6,GRAB+1.4))a.traderPose='point';
 if(between(t,29.6,30.4)){a.x=lerp(822,812,(t-29.6)/.3);a.stagger=.5;a.facePain=1;}
 // kopfüber in die Esse und wieder heraus
 sc.flip=between(t,30.4,31.2)?(t-30.4)/.8:between(t,31.2,33.6)?1:between(t,33.6,34.4)?1-(t-33.6)/.8:0;
 if(sc.flip>0){a.facePain=1;a.x=lerp(812,800,sc.flip);a.y=lerp(262,212,sc.flip);a.wiggle=between(t,31.2,33.6)?Math.sin(t*22)*.12:0;}
 if(between(t,34.4,36.9)){a.x=812;a.y=262;a.facePain=1;a.a=Math.PI;}
 if(t>=36.9&&!a.g.dead){const p=runAt(t),q=runAt(t+.05);a.x=p.x;a.y=p.y;a.a=q.x>=p.x?0:Math.PI;a.state='move';a.moveSpeed=16;a.phase=t*11;a.retreat=1;a.facePain=1;}
 if(a.g.dead){a.down=true;a.state='idle';a.moveSpeed=0;}
 // Ereignisse
 if(t>=6)once('shot',()=>{sc.arrow={t0:6,x0:a.x-12,y0:a.y-36};M.sound?.('stick');});
 if(t>=HIT)once('hit',()=>{sc.arrow=null;sc.stuck=14;M.sound?.('hit');});
 if(t>=12.4)once('snap',()=>{sc.stuck=4;sc.fx.push({x:s.x-8,y:s.y,z:58,vx:-20,vy:2,vz:10,life:1.4,size:2,color:'#a88c60'},{x:s.x-11,y:s.y,z:58,vx:-22,vy:2,vz:12,life:1.4,size:2,color:'#a88c60'});M.sound?.('block');});
 if(t>=16)once('soil',()=>{sc.soiled=true;});
 if(t>=GRAB)once('grab',()=>{sc.view?.classList?.remove('no-smith-song');M.sound?.('heavy');});
 if(t>=30.15)once('arm',()=>sever(a,'rua',1,{vx:95,vz:70}));
 if(t>=31.25)once('fire',()=>{M.sound?.('heavy');burst(800,214,26,['#f4d37a','#e2ab5c','#c8642e'],50,60);});
 if(between(t,31.25,33.6)&&Math.floor(t*10)!==sc.lastFire){sc.lastFire=Math.floor(t*10);burst(800,212,3,['#e2ab5c','#c8642e','#7a7468'],30,45);}
 if(t>=33.8)once('char',()=>{sc.charred=true;});
 if(t>=STRIKE+.1)once('head',()=>{const dir=s.x<=a.x?1:-1;sever(a,'head',dir,{skin:'#3b2c24',hair:'#17110e',vx:30,vz:40});a.g.dead=true;a.down=true;a.fallSide=dir;});}
function step(dt){const t0=sc.t;sc.t+=dt*rate(t0);const t=sc.t,s=sc.s,a=sc.a;pose(t);
 for(const l of sc.limbs){if(l.z<=0&&Math.abs(l.vz)<4){l.z=0;continue;}l.x+=l.vx*dt;l.y+=l.vy*dt;l.vz-=200*dt;l.z=Math.max(0,l.z+l.vz*dt);l.angle+=l.spin*dt;if(!l.z&&l.vz<0){l.vz=-l.vz*.35;l.vx*=.5;l.vy*=.5;l.spin*=.5;}}
 for(const f of sc.fx){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vz-=(f.color==='#7a7468'||f.smoke?-20:150)*dt;f.z=Math.max(0,f.z+f.vz*dt);f.life-=dt;}
 // Rauch vom verbrannten Kopf, sparsam
 if(sc.charred&&!a.g.dead&&sc.fx.length<60&&Math.random()<.5)sc.fx.push({x:a.x+Math.random()*4-2,y:a.y,z:62+Math.random()*4,vx:Math.random()*6-3,vy:0,vz:14,life:.9,size:3,color:'#9a958a',smoke:true});
 sc.fx=sc.fx.filter(f=>f.life>0);
 // Kamera: weit, dann Zoom auf den Hinterkopf, dann zurück auf beide
 const head={x:s.x,y:s.y-40},mid={x:(s.x+a.x)/2,y:(s.y+a.y)/2-20};let goal;
 if(t<3.4)goal={x:780,y:265,vw:300};else if(t<6)goal={x:mid.x,y:mid.y,vw:230};else if(t<9.2)goal={x:head.x,y:head.y,vw:85};else if(t<15.6)goal={x:mid.x,y:mid.y-10,vw:235};else if(t<22.8)goal={x:mid.x+10,y:mid.y-10,vw:235};else if(t<GRAB)goal={x:mid.x,y:mid.y,vw:190};else if(t<29.6)goal={x:(s.x+a.x)/2,y:s.y-34,vw:110};else if(t<34.4)goal={x:800,y:228,vw:200};else goal={x:770,y:280,vw:290};
 const k=Math.min(1,dt*(t>=HIT&&t<7.6?3.5:2.2));sc.cam.x+=(goal.x-sc.cam.x)*k;sc.cam.y+=(goal.y-sc.cam.y)*k;sc.cam.vw+=(goal.vw-sc.cam.vw)*k;
 sc.say=null;for(const [a1,b1,who,text] of lines())if(between(t,a1,b1))sc.say={who,text};
 paint();if(t>=END)end();}
function headPoint(p){const k=.6*p.g.height/180*1.14;return {x:p.x+(Math.cos(p.a)>=0?1:-1)*2*k,y:p.y-66*k};}
function paint(){const c=$('archerPlotCanvas');if(!c?.getContext)return;const g=c.getContext('2d'),VW=sc.cam.vw,VH=VW*420/660,k=c.width/VW,cx=Math.max(VW/2,Math.min(900-VW/2,sc.cam.x)),cy=Math.max(VH/2,Math.min(670-VH/2,sc.cam.y)),t=sc.t,s=sc.s,a=sc.a,r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),w,h);};
 sc.bg??=M.ludus.background();g.imageSmoothingEnabled=false;g.setTransform?.(1,0,0,1,0,0);g.clearRect(0,0,c.width,c.height);g.save();g.scale(k,k);g.translate(-(cx-VW/2),-(cy-VH/2));g.drawImage(sc.bg,0,0);
 r(788,205,7,10,t%1>.5?'#c88945':'#e2ab5c');r(803,210,5,7,t%1>.5?'#c88945':'#e2ab5c');
 if(sc.soiled){const rear=Math.cos(a.a)>=0?-1:1;if(sc.flip===0&&!a.g.dead){r(a.x+rear*2-3,a.y-20,6,6,'#4e3318');r(a.x+rear*3,a.y-14,1,10,'#5a3d1e');}r(838-4,295,9,2,'#5a3d1e');}
 const list=[s,...(s.hidden?[]:[])].filter(p=>!p.hidden);const drawA=()=>{if(sc.flip>0){const px=a.x,py=a.y-28;g.save();g.translate(px,py);g.rotate(Math.PI*sc.flip+(a.wiggle||0));g.translate(-px,-py);M.renderForgeActors(g,[a]);g.restore();}else M.renderForgeActors(g,[a]);};
 if(a.y<s.y){drawA();if(list.length)M.renderForgeActors(g,list);}else{if(list.length)M.renderForgeActors(g,list);drawA();}
 // verbrannter Kopf
 if(sc.charred&&!a.g.dead&&sc.flip===0){const h=headPoint(a);r(h.x-5,h.y-6,10,11,'#2e231d');r(h.x-4,h.y-7,8,2,'#17110e');r(h.x-3,h.y-2,2,1,'#d35b2e');r(h.x+1,h.y-2,2,1,'#d35b2e');r(h.x-2,h.y+2,4,1,'#5a2a20');}
 if(sc.flip>.6&&t<33.8){for(let n=0;n<4;n++)r(792+n*4,203+Math.sin(t*20+n)*2,3,5,n%2?'#f4d37a':'#e2ab5c');}
 // Pfeil im Flug und im Hinterkopf
 const tip=headPoint(s);if(sc.arrow){const p=Math.min(1,(t-sc.arrow.t0)/(HIT-sc.arrow.t0)),x=lerp(sc.arrow.x0,tip.x+4,p),y=lerp(sc.arrow.y0,tip.y,p);g.fillStyle='#a88c60';g.fillRect(Math.round(x),Math.round(y),10,1);r(x+9,y-1,2,3,'#c9c6ac');r(x-1,y,2,1,'#d9dccb');}
 if(sc.stuck&&!s.hidden){const dir=Math.cos(s.a)>=0?-1:1,L=sc.stuck;g.fillStyle='#a88c60';for(let i=0;i<L;i++)g.fillRect(Math.round(tip.x+dir*(3+i)),Math.round(tip.y-1-i*.15),1,1);if(L>6)r(tip.x+dir*(3+L)-1,tip.y-3-L*.15,2,4,'#c9c6ac');}
 M.renderForgeEffects(g,sc.limbs,sc.fx);g.restore();
 const slow=rate(t)<1;if(slow){g.fillStyle='#00000055';g.fillRect(0,0,c.width,22);g.fillRect(0,c.height-22,c.width,22);}
 if(sc.say){if(sc.say.who==='cap'){}else{const who=sc.say.who==='s'?s:a,h=headPoint(who);bubble(g,sc.say.text,(h.x-(cx-VW/2))*k,(h.y-12-(cy-VH/2))*k,sc.say.who==='a'&&/AAA/.test(sc.say.text));}}
 const el=$('archerPlotText'),line=sc.say?(sc.say.who==='cap'?sc.say.text:(sc.say.who==='s'?smithName():sc.name)+': „'+sc.say.text+'“'):'';if(el&&el.textContent!==line)el.textContent=line;}
function bubble(g,text,x,y,loud){g.font=`bold ${loud?24:19}px 'Courier Prime',monospace`;g.textAlign='center';g.textBaseline='middle';const words=text.split(' '),lines=[''];for(const w of words){if((lines[lines.length-1]+' '+w).trim().length>24)lines.push(w);else lines[lines.length-1]=(lines[lines.length-1]+' '+w).trim();}
 const lh=loud?28:23,width=Math.max(...lines.map(l=>g.measureText?g.measureText(l).width:l.length*12))+24,height=lines.length*lh+14,bx=Math.min(660-width-6,Math.max(6,x-width/2)),by=Math.min(420-height-30,Math.max(26,y-height));
 g.fillStyle='#17201c';g.fillRect(bx-3,by-3,width+6,height+6);g.fillStyle=loud?'#f4d37a':'#efe0b3';g.fillRect(bx,by,width,height);g.fillStyle='#17201c';lines.forEach((l,i)=>g.fillText(l,bx+width/2,by+7+lh/2+i*lh));}
// ---------- Takt, Klicks ----------
let settle=0;
const tick=M.ludusTick;M.ludusTick=dt=>{tick?.(dt);if(typeof document!=='undefined'&&document.hidden)return;
 if(sc){clock+=dt;if(clock>=1/30){const d=Math.min(clock,.1);clock=0;step(d);}return;}
 const p=P();if(p.state)return;const a=archer();if(a&&!p.seen){p.seen=S.day;M.persist();}
 const busy=S.battle||M.intro?.active?.()||window.ArenaTheoryIntro?.active?.()||M.forgeIntro?.scene||M.smithWrath?.scene||M.trader?.tutorial||M.ui?.getPage?.()!=='home'||(typeof document!=='undefined'&&document.getElementById('modal')?.hidden===false)||(typeof document!=='undefined'&&!!document.querySelector?.('.smith-ceremony'));
 const ready=a&&p.seen&&S.day>=p.seen+DELAY&&p.asked!==S.day&&others(a).length>=2&&W()?.master&&W().intro==='done';
 if(ready&&!busy){settle+=dt;if(settle>1.2){settle=0;ask();}}else settle=0;};
const click=M.schoolClick;M.schoolClick=action=>{
 if(action==='plot:no'){if(!P().state)decline();return true;}
 if(action==='plot:yes'){if(!P().state)start();return true;}
 if(action==='plot:skip'){end();return true;}
 return click(action);};
M.archerPlot={state:P,archer,ready:()=>{const p=P(),a=archer();return !!(a&&p.seen&&S.day>=p.seen+DELAY&&!p.state);},ask,start,end,step:d=>sc&&step(d),get scene(){return sc;},delay:DELAY};
})();
