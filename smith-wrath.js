'use strict';
// DER ZORN DES SCHMIEDS: seltenes Herumtreiber-Ereignis. Bei etwa jeder fünften neuen Gruppe verlangen sie Gratiswaffen;
// eine besondere Antwort schickt sie zum Schmied. 75 %: Sie gehen hin, der Schmied (Bier in der Hand) erledigt alle.
// 25 %: Einer erkennt den Namen, die Gruppe flieht. Reine Inszenierung mit vorhandenen Figuren, Treffern, Blut und Körperteilen.
// Keine Werte, keine Beute, keine Erfahrung. Das Ergebnis wird beim Start sofort verbucht, Laden spielt nichts erneut ab.
(()=>{
const M=window.MG,S=M.s,T=M.wandererTalk,WD=M.wanderers,$=id=>typeof document==='undefined'?null:document.getElementById(id);
if(!T||!WD)return;
const CHANCE=.2,ACCEPT=.75,W=()=>M.workshop?.state;
function roll(id,salt){let h=2166136261;for(const c of id+'|'+salt)h=Math.imul(h^c.charCodeAt(0),16777619);h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return (h>>>0)/4294967296;}
const choose=(list,id,salt)=>list[Math.floor(roll(id,salt)*list.length)];
const smithName=()=>W()?.master?.name||'Der Schmied';
const eligible=g=>!!g&&!!W()?.master&&W().intro==='done'&&roll(g.id,'freebie')<CHANCE;
// ---------- Texte ----------
const L={
 demand:['He, du feiner Pinkel! Wir brauchen Waffen. Und bevor du fragst: Bezahlen werden wir einen Scheißdreck!','Hör zu, {D}: Wir nehmen uns ein paar Klingen. Umsonst. Weil wir so nett gefragt haben.','Du hast doch Eisen da drin. Gib her, oder sollen wir höflich werden?','Rüstung, Schwerter, egal was. Und zwar gratis, {D}, wir sind nämlich pleite und schlecht gelaunt.','Ein Ludus ohne Gastgeschenke? Rück Waffen raus, und wir vergessen, dass wir hier waren.','Wir brauchen Ausrüstung. Geld haben wir keins, aber jede Menge Ideen, was wir sonst mit deinem Tor machen.'],
 offer:['Aber natürlich! Unser Schmied {N} ist ein ausgesprochen netter Kerl. Fragt ihn einfach persönlich!','{N} verschenkt ständig Waffen. Er liebt Besuch!','Unser Schmied hat ein Herz aus Gold. Geht ruhig rein!','Sagt {N}, dass ihr seine Arbeit für minderwertig haltet. Dann gibt er euch bestimmt was Besseres!','Der Schmied freut sich besonders über unverschämte Gäste!','Fragt nach dem legendären Gratis-Gladius. Er weiß sofort Bescheid!'],
 accept:['Na dann schauen wir mal, was der Wichser zu bieten hat!','Wenn der uns verarscht, hauen wir ihm seinen Amboss in die Fresse!','Ein Schmied, der verschenkt? Der muss ja völlig bescheuert sein!','Hoffentlich hat der alte Sack wenigstens vernünftige Schwerter!','Los, Jungs! Wir plündern den Eisenfresser!','Ich nehme zwei Schwerter. Der Rest kann sich verpissen!','Wenn der nichts rausrückt, reißen wir ihm den Bart aus!','So ein Schmied hat bestimmt Angst vor echten Männern!','Hahaha! Der Trottel arbeitet und wir kassieren!','Ich hoffe, der Schmied ist nicht so hässlich wie seine Hütte!','Dem zeigen wir mal, wie man ordentlich verhandelt!','Ich will das teuerste Schwert, das dieser Penner besitzt!','Vielleicht kriegen wir seinen verdammten Amboss gleich mit!','Wenn der nicht spurt, stecken wir seinen Laden in Brand!','Ich habe noch nie einen Schmied getroffen, den ich nicht beleidigen konnte!','Kommt, wir machen diesem Eisenwichser einen Besuch!','Hoffentlich kann der alte Sack schneller schmieden als laufen!','Gratis Waffen? Endlich mal ein Ludus mit Verstand!','Ich nehme seine beste Klinge. Und seinen Schnaps!','Los, ihr Versager! Wir zeigen dem Hammeropa, wer hier das Sagen hat!'],
 flee:['{N}?! RENNT, IHR IDIOTEN!','Der Schmied?! Der hat meinem Bruder die Zähne mit einem Hammer ausgeschlagen!','NICHT DER! ALLES, NUR NICHT DER!','Ich habe gesehen, was der mit drei Legionären gemacht hat!','Der Typ hat einen Ochsen mit bloßen Händen umgeworfen!','Meine Mutter hat mich vor diesem Irren gewarnt!','Ich kenne den! Der hat seinen letzten Kunden durch die Tür geworfen!','Vergesst die Waffen! ICH WILL LEBEN!','Der hat einen Amboss nach meinem Onkel geworfen!','Ich habe gehört, der schärft seine Schwerter an Menschen!','NEIN! NICHT NOCH MAL!','Das ist der Kerl aus der Taverne! LAUFT!','Der Schmied mit der Flasche?! Wir sind tot!','Mein Cousin hat ihn einmal einen Stümper genannt. Einmal!','Ich habe gehört, sein Lehrling schläft mit einem Helm!','Der hat mal fünf Männer verprügelt, weil einer gehustet hat!','Bei allen Göttern! Ich dachte, der wäre längst hingerichtet!','Der Mann hat einen schlechten Tag, seit ich ihn kenne!','Ich gehe lieber unbewaffnet gegen zehn Gladiatoren!','{N}?! BEHALT DEINEN SCHEISS!'],
 knock:['HEY, ALTER SACK! WIR WOLLEN UNSERE GRATISWAFFEN!'],
 roar:['WER VON EUCH DRECKSÄCKEN HAT MEINEN HAMMER UNTERBROCHEN?!'],
 panic:['SCHEISSE! DAS IST DER FALSCHE SCHMIED!'],
 taunt:['GRATIS?! HIER IST DEIN VERDAMMTER RABATT!','ICH SCHMIEDE WAFFEN, KEINE ALMOSEN!','KOMM ZURÜCK, DU HAST DEIN SCHWERT VERGESSEN!','HAHAHAHA! NOCH EIN FREIWILLIGER!','MEIN HAMMER VERHANDELT NICHT!','DU WOLLTEST STAHL?! FRISS STAHL!','RENN NICHT WEG! DIE BERATUNG IST NOCH NICHT VORBEI!','DAS NENNE ICH KUNDENSERVICE!','ICH HABE HEUTE SCHLECHTE LAUNE! WIE JEDEN TAG!','HAHA! DER NÄCHSTE BITTE!'],
 last:['UND DU, LEHRLING! WENN NOCH EINER NACH GRATISWAFFEN FRAGT, BIST DU DER NÄCHSTE!','LEHRLING! BRING MIR NOCH EIN BIER! UND EINEN EIMER!','LEHRLING! DAS HIER WIRD AUFGEWISCHT, BEVOR ICH AUSGETRUNKEN HABE!']
};
const fillD=(text,g,salt)=>text.replace(/\{D\}/g,()=>choose(T.texts?.slots?.D||['Freund'],g.id,salt+'D'));
const shoutName=text=>text.replace(/\{N\}(\?!)/g,(_,q)=>smithName().toUpperCase()+q).replace(/\{N\}/g,smithName());
// ---------- Einhängen in die vorhandenen Herumtreiber-Dialoge ----------
const opener=T.opener,options=T.options,answer=T.answer;
T.opener=g=>eligible(g)?fillD(choose(L.demand,g.id,'demand'),g,'demand'):opener(g);
T.options=g=>{const list=options(g);if(eligible(g))list.push({tone:'schmied',text:shoutName(choose(L.offer,g.id,'offer'))});return list;};
T.answer=(g,tone,outcome)=>tone!=='schmied'?answer(g,tone,outcome):outcome==='WRATH'?choose(L.accept,g.id,'accept'):shoutName(choose(L.flee,g.id,'flee'));
const outcomeOf=g=>roll(g.id,'accept')<ACCEPT?'WRATH':'FLEE';
const PLAIN='<p class="readiness ready">Kein Kampf · die Gruppe zieht ab.</p><div class="buttons"><button class="btn primary" data-action="wanderer:leave">WEITER</button></div>';
function decorate(html){const g=WD.state().group;if(!html||g?.talk?.tone!=='schmied'||!html.includes(PLAIN))return html;const wrath=g.talk.outcome==='WRATH';
 return html.replace(PLAIN,wrath?`<p class="readiness warning">Die Gruppe marschiert zur Schmiede.</p><div class="buttons"><button class="btn primary" data-action="wrath:go">▶ ZUR SCHMIEDE</button></div>`:`<p class="readiness ready">Panik vor dem Tor.</p><div class="buttons"><button class="btn primary" data-action="wrath:go">▶ ANSEHEN</button></div>`);}
const page=M.schoolPage;M.schoolPage=p=>{const html=page(p);return p==='home'||p==='wanderers'?decorate(html):html;};
// ---------- Szene ----------
let sc=null,clock=0;
const lerp=(a,b,k)=>a+(b-a)*Math.max(0,Math.min(1,k)),between=(t,a,b)=>t>=a&&t<b;
function smithActor(){const p=W().master,rng=S.rng,g=M.makeGladiator(0);Object.assign(g,{id:'wrath-smith',name:p.name,height:p.height,weight:p.weight,muscle:58,fame:0,scars:[]});g.appearance={...p.appearance};g.equipment={weapon:null,secondary:null,shield:null,armor:{}};g.enemyGear={weapon:null,secondary:M.makeItem('weapon','gladius',1),shield:null,armor:{}};S.rng=rng;return {id:g.id,g,team:0,x:748,y:240,a:Math.PI,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,forgeWorker:true,forgeHold:'beer',bloodMarks:{}};}
function victim(m,i){const g=JSON.parse(JSON.stringify(m));g.dead=false;return {id:'wrath-'+i,g,team:1,x:0,y:0,a:0,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,bloodMarks:{},index:i};}
// Wege: [Zeit, x, y]. Zwischen den Punkten wird gleichmäßig gegangen; Tempo bleibt menschlich (Schmied höchstens ~65 px/s, Flüchtende ~50).
function at(path,t){if(t<=path[0][0])return {x:path[0][1],y:path[0][2],v:0,dx:0};for(let i=1;i<path.length;i++){const [t1,x1,y1]=path[i],[t0,x0,y0]=path[i-1];if(t<=t1){const k=(t-t0)/(t1-t0||1);return {x:x0+(x1-x0)*k,y:y0+(y1-y0)*k,v:Math.hypot(x1-x0,y1-y0)/(t1-t0||1),dx:x1-x0};}}const q=path[path.length-1];return {x:q[1],y:q[2],v:0,dx:0};}
function plan(n){
 // Ankunft und Anklopfen
 const p={n,end:0,kills:[],says:[],sips:[],laughs:[],vic:[]};
 p.vic[0]=[[0,618,312],[1.7,712,268],[1.9,712,268],[2.3,722,266]];
 if(n>1)p.vic[1]=[[0,618,334],[1.8,688,274]];
 if(n>2)p.vic[2]=[[0,618,356],[1.9,664,280]];
 p.says.push([2.1,3.7,'v0',L.knock[0]]);
 p.door=4.1;p.says.push([4.7,6.3,'s',L.roar[0]]);p.sips.push([4.25,4.7]);
 // Erster Schlag: Arm, dann Kopf
 let t=6.3;p.smith=[[0,748,240],[p.door+.2,748,246],[t,748,246],[t+.45,738,264]];
 p.kills.push({who:0,swing:t+.45,first:'lua'});t+=1.15;
 p.v0dead=t;
 if(n===1){p.says.push([t+.1,t+1.9,'s',choose(L.taunt,sc0id,'t0')]);p.sips.push([t+.4,t+1.2]);p.laughs.push([t+1.3,t+2.1]);return finale(p,t+2.2,738,264);}
 p.says.push([t,t+1.7,'v1',L.panic[0]]);
 // Zweiter: flieht über den rechten Weg nach Süden, stolpert
 const f1=t+.1;p.vic[1].push([f1,688,274],[f1+1.2,640,300],[f1+2,614,334],[f1+2.8,614,372]);p.trip1=f1+2.8;
 p.sips.push([t+.2,t+.8]);p.says.push([t+1.8,t+3.4,'s',choose(L.taunt,sc0id,'t1')]);
 const s1=t+.9,reach1=s1+Math.hypot(738-626,264-378)/62;p.smith.push([s1,738,264],[reach1,628,372]);
 p.kills.push({who:1,swing:reach1+.15});t=reach1+.9;
 if(n===2)return finale(p,t+.3,628,372);
 // Dritter: rennt um den Brunnen, läuft dem Schmied wieder in die Arme und rutscht aus
 const route=walk([[664,280],[700,318],[712,382],[770,388],[778,342],[740,318]],p.v0dead+.2,48);p.vic[2].push(...route);
 p.trip2=route[route.length-1][0];p.laughs.push([t,t+.6]);p.says.push([t+.1,t+1.7,'s',choose(L.taunt,sc0id,'t2')]);
 const go=t+.6,arrive=go+Math.hypot(722-628,326-372)/58,swing=Math.max(p.trip2+.3,arrive+.2);p.smith.push([go,628,372],[arrive,722,326]);if(swing-arrive>.8)p.sips.push([arrive+.1,swing-.4]);p.kills.push({who:2,swing});t=swing+.75;
 return finale(p,t+.2,722,326);}
let sc0id='';
function walk(points,t0,speed){let t=t0;return points.map((q,i)=>{if(i)t+=Math.hypot(q[0]-points[i-1][0],q[1]-points[i-1][1])/speed;return [t,q[0],q[1]];});}
function finale(p,t,x,y){p.inspect=[t,t+.7];p.sips.push([t+.7,t+1.2]);p.laughs.push([t+1.2,t+1.6]);p.says.push([t+1.6,t+3.9,'s',choose(L.last,sc0id,'last')]);const back=t+1.8,dist=Math.hypot(x-748,y-246);p.smith.push([back,x,y],[back+dist/50,748,246],[back+dist/50+.4,748,238]);p.gone=back+dist/50+.4;p.end=Math.min(p.gone+.5,t+4.3);return p;}
function fleePlan(n){const p={flee:true,n,says:[[.3,2.4,'v0','']],vic:[],end:3.8};const xs=[610,586,634];for(let i=0;i<n;i++){const x=xs[i],y=596-(i?6:0),go=1+i*.2;p.vic[i]=[[0,x,y],[go,x,y],[go+.6,x+(i===1?-6:i===2?6:0),y+30],[go+1.8,610+(i-1)*8,700]];}return p;}
function start(){const st=WD.state(),g=st.group;if(!g||g.talk?.tone!=='schmied'||S.battle||sc)return false;const outcome=g.talk.outcome,members=g.members.slice(0,3),leader=g.leader.name;sc0id=g.id;
 // Ergebnis sofort verbuchen: Gruppe weg, Erinnerung vermerkt. Erst danach wird nur noch gezeigt.
 WD.decline();const entry=st.known.find(k=>k.name===leader);
 // Wie nach jedem Kampf sieht der Schmied die Ausrüstung der Erschlagenen: gleiche Rezeptlogik wie in der Arena.
 const F=W(),known=[...(F.recipes||[])],refs=[...(F.refinements||[])];if(outcome==='WRATH')M.workshop.encounter?.({id:'wrath-'+g.id,actors:members.map(m=>({team:1,g:m}))});const found=[...(F.recipes||[]).filter(r=>!known.includes(r)).map(()=>'Schmiederezept'),...(F.refinements||[]).filter(r=>!refs.includes(r)).map(()=>'Verfeinerungsrezept')];if(entry)entry.outcome=outcome==='WRATH'?'vom Schmied erschlagen':'vor dem Schmied geflohen';M.persist();
 const n=members.length;sc={found,t:0,outcome,p:outcome==='WRATH'?plan(n):fleePlan(n),vic:members.map(victim),smith:outcome==='WRATH'?smithActor():null,limbs:[],fx:[],done:{},say:null,cam:{x:680,y:280}};
 if(outcome==='FLEE')sc.p.says[0][3]=shoutName(choose(L.flee,g.id,'flee'));
 sc.view=document.createElement('div');sc.view.id='smithWrath';sc.view.className='smith-ceremony smith-intro smith-wrath no-smith-song';sc.view.setAttribute?.('role','dialog');sc.view.setAttribute?.('aria-modal','true');sc.view.setAttribute?.('aria-label',outcome==='WRATH'?'Der Zorn des Schmieds':'Panische Flucht');
 sc.view.innerHTML='<div><canvas id="smithWrathCanvas" width="660" height="420"></canvas><p id="smithWrathText" aria-live="polite"></p><button class="btn" data-action="wrath:skip">ÜBERSPRINGEN →</button></div>';document.body.appendChild(sc.view);
 sc.cam=outcome==='WRATH'?{x:690,y:282}:{x:610,y:560};M.ui.render();return true;}
function end(){if(!sc)return;const found=sc.found||[];sc.view?.remove?.();sc=null;M.ui.render();if(found.length)M.ui.notify(smithName()+' hat sich die Ausrüstung der Toten angesehen: '+found.length+' '+(found.length===1?found[0]:'neue Rezepte')+' entdeckt.');}
function once(k,fn){if(sc.done[k])return;sc.done[k]=true;fn();}
function blood(x,y,n,dir=1){for(let i=0;i<n;i++)sc.fx.push({x,y,z:38+Math.random()*8,vx:dir*(10+Math.random()*30),vy:Math.random()*14-7,vz:18+Math.random()*26,life:.6+Math.random()*.5,size:2,color:i%3?'#aa3c36':'#87352e'});}
function dust(x,y,n){for(let i=0;i<n;i++)sc.fx.push({x:x+Math.random()*10-5,y,z:2+Math.random()*6,vx:(Math.random()-.5)*60,vy:(Math.random()-.5)*8,vz:12+Math.random()*24,life:.5+Math.random()*.4,size:2,color:'#c9b586'});}
function sever(v,part,dir){const g=v.g;for(const k of M.branches[part]||[part])if(g.body[k])g.body[k].missing=true;sc.limbs.push({x:v.x+dir*4,y:v.y,z:part==='head'?52:38,angle:0,part,skin:g.appearance.skin,hair:g.appearance.hair,g,vx:dir*(part==='head'?26:34),vy:6,vz:part==='head'?40:30,spin:dir*(part==='head'?6:9)});blood(v.x,v.y,part==='head'?18:12,dir);M.sound?.('sever');}
function pose(t){const p=sc.p,s=sc.smith;
 // Herumtreiber
 sc.vic.forEach((v,i)=>{if(v.g.dead&&v.down){v.state='idle';v.moveSpeed=0;return;}const path=p.vic[i];if(!path)return;const q=at(path,t);v.x=q.x;v.y=q.y;v.moveSpeed=q.v>3?10:0;v.state=q.v>3?'move':'idle';v.phase=t*(q.v>40?11:7)+i;if(q.dx)v.a=q.dx>0?0:Math.PI;
  const scared=p.flee?t>.8:t>=p.door;v.retreat=scared?1:0;v.facePain=scared&&!q.v?.3:0;
  if(!p.flee&&t<p.door&&i===0&&between(t,2.1,3.7)){v.state='charge';v.a=0;}
  if(!p.flee&&t<p.door&&q.v<3)v.a=0;
  if(p.flee&&t<1)v.a=0;
  const trip=i===1?p.trip1:i===2?p.trip2:null;if(trip&&t>=trip){v.x=path[path.length-1][1];v.y=path[path.length-1][2];v.state='idle';v.moveSpeed=0;const k=t-trip;v.fallSide=i===1?1:-1;if(k<.9){v.fallTimer=2.1-k;v.fallDuration=2.1;}else{v.fallTimer=0;v.down=true;}}});
 if(!s)return;
 // Schmied
 s.state='idle';s.moveSpeed=0;s.wind=0;s.swing=0;s.technique=null;s.forgePose='';s.kickTimer=0;s.shoutTimer=0;s.phase=t*4;
 s.hidden=t<p.door||(p.gone&&t>=p.gone);const q=at(p.smith,t);s.x=q.x;s.y=q.y;if(q.v>3){s.state='move';s.moveSpeed=q.v>45?16:10;s.phase=t*(q.v>45?9:6);s.a=q.dx>=0?0:Math.PI;}
 for(const [a,b] of p.sips)if(between(t,a,b))s.forgePose='sip';
 for(const [a,b] of p.laughs)if(between(t,a,b)&&q.v<3)s.state='celebrate';
 if(p.inspect&&between(t,...p.inspect)){s.forgePose='inspect';s.a=Math.PI;}
 if(between(t,4.7,6.3)){s.state='charge';s.shoutTimer=.3;}
 for(const k of p.kills){const v=sc.vic[k.who],w=k.swing;if(between(t,w-1.1,w+.8)&&q.v<3)s.a=v.x>=s.x?0:Math.PI;
  if(between(t,w-.3,w)){s.technique='overhead';s.windMax=.3;s.wind=w-t;}
  if(between(t,w,w+.25)){s.swingKind='slash';s.swingMax=.25;s.swing=w+.25-t;}
  if(k.first&&between(t,w+.4,w+.6)){s.technique='overhead';s.windMax=.2;s.wind=w+.6-t;}
  if(k.first&&between(t,w+.6,w+.85)){s.swingKind='slash';s.swingMax=.25;s.swing=w+.85-t;}
  const dir=v.x>=s.x?1:-1;
  if(t>=w+.12)once('hit'+k.who,()=>{if(k.first){sever(v,k.first,dir);v.stagger=.5;}else{sever(v,'head',dir);v.g.dead=true;v.down=true;v.fallSide=dir;}});
  if(k.first&&t>=w+.72)once('head'+k.who,()=>{sever(v,'head',dir);v.g.dead=true;v.down=true;v.fallSide=dir;});}
 if(t>=p.door)once('door',()=>{M.sound?.('heavy');dust(748,238,20);sc.view?.classList?.remove('no-smith-song');});}
function step(dt){sc.t+=dt;const t=sc.t,p=sc.p;pose(t);
 for(const l of sc.limbs){if(l.z<=0&&Math.abs(l.vz)<4){l.z=0;continue;}l.x+=l.vx*dt;l.y+=l.vy*dt;l.vz-=200*dt;l.z=Math.max(0,l.z+l.vz*dt);l.angle+=l.spin*dt;if(!l.z&&l.vz<0){l.vz=-l.vz*.35;l.vx*=.5;l.vy*=.5;l.spin*=.5;}}
 for(const f of sc.fx){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vz-=180*dt;f.z=Math.max(0,f.z+f.vz*dt);f.life-=dt;}sc.fx=sc.fx.filter(f=>f.life>0);
 // Kamera folgt dem Geschehen, ohne zu springen
 const s=sc.smith,live=sc.vic.filter(v=>!v.g.dead),focus=p.flee?{x:610,y:600}:t<p.door?{x:690,y:282}:{x:(s.x+(live[0]?.x??s.x))/2,y:(s.y+(live[0]?.y??s.y))/2};sc.cam.x+=(focus.x-sc.cam.x)*Math.min(1,dt*2.2);sc.cam.y+=(focus.y-sc.cam.y)*Math.min(1,dt*2.2);
 sc.say=null;for(const [a,b,who,text] of p.says)if(between(t,a,b))sc.say={who,text};
 paint();if(t>=p.end)end();}
const VW=300,VH=VW*420/660;
function paint(){const c=$('smithWrathCanvas');if(!c?.getContext)return;const g=c.getContext('2d'),k=c.width/VW,cx=Math.max(VW/2,Math.min(900-VW/2,sc.cam.x)),cy=Math.max(VH/2,Math.min(670-VH/2,sc.cam.y)),t=sc.t,r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),w,h);};
 sc.bg??=M.ludus.background();g.imageSmoothingEnabled=false;g.setTransform?.(1,0,0,1,0,0);g.clearRect(0,0,c.width,c.height);g.save();const shake=sc.p.door&&between(t,sc.p.door,sc.p.door+.4)?(Math.random()-.5)*6:0;g.translate(shake,0);g.scale(k,k);g.translate(-(cx-VW/2),-(cy-VH/2));g.drawImage(sc.bg,0,0);
 if(!sc.p.flee&&t>=sc.p.door&&!(sc.p.gone&&t>=sc.p.gone+.3)){r(733,187,29,49,'#161a17');r(733,187,29,3,'#0d100e');}
 const list=[...sc.vic,...(sc.smith&&!sc.smith.hidden?[sc.smith]:[])].sort((a,b)=>a.y-b.y);M.renderForgeActors(g,list);M.renderForgeEffects(g,sc.limbs,sc.fx);g.restore();
 if(sc.say){const who=sc.say.who==='s'?sc.smith:sc.vic[+sc.say.who.slice(1)];if(who)bubble(g,sc.say.text,(who.x-(cx-VW/2))*k,(who.y-62-(cy-VH/2))*k,sc.say.who==='s');}
 const el=$('smithWrathText');const line=sc.say?(sc.say.who==='s'?smithName():sc.vic[+sc.say.who.slice(1)]?.g.name||'')+': „'+sc.say.text+'“':'';if(el&&el.textContent!==line)el.textContent=line;}
function bubble(g,text,x,y,loud){g.font=`bold ${loud?22:19}px 'Courier Prime',monospace`;g.textAlign='center';g.textBaseline='middle';const words=text.split(' '),lines=[''];for(const w of words){if((lines[lines.length-1]+' '+w).trim().length>22)lines.push(w);else lines[lines.length-1]=(lines[lines.length-1]+' '+w).trim();}
 const lh=loud?26:23,width=Math.max(...lines.map(l=>g.measureText?g.measureText(l).width:l.length*12))+24,height=lines.length*lh+14,bx=Math.min(660-width-6,Math.max(6,x-width/2)),by=Math.max(6,y-height);
 g.fillStyle='#17201c';g.fillRect(bx-3,by-3,width+6,height+6);g.fillStyle=loud?'#f4d37a':'#efe0b3';g.fillRect(bx,by,width,height);g.fillRect(Math.max(bx+6,Math.min(bx+width-16,x-5)),by+height,10,8);g.fillStyle='#17201c';lines.forEach((l,i)=>g.fillText(l,bx+width/2,by+7+lh/2+i*lh));}
// ---------- Takt, Klicks ----------
const tick=M.ludusTick;M.ludusTick=dt=>{tick?.(dt);if(!sc||(typeof document!=='undefined'&&document.hidden))return;clock+=dt;if(clock<1/30)return;const d=Math.min(clock,.1);clock=0;step(d);};
const click=M.schoolClick;M.schoolClick=action=>{
 if(action==='wanderer:say:schmied'){const g=WD.state().group;if(g&&!g.talk&&!g.fightId&&!S.battle&&eligible(g)){g.talk={tone:'schmied',outcome:outcomeOf(g)};M.persist();}M.ui.render();return true;}
 if(action==='wrath:go'){start();return true;}if(action==='wrath:skip'){end();return true;}
 return click(action);};
M.smithWrath={chance:CHANCE,accept:ACCEPT,eligible,outcomeOf,lines:L,start,end,step:d=>sc&&step(d),get scene(){return sc;},plan,fleePlan};
})();
