'use strict';
// Einmalige Vorstellung des Hauptschmieds: Hinweis im Ludus, Erstellung, gescriptete Szene, kurzes Schmiede-Tutorial.
// Reine Inszenierung mit vorhandenen Figuren, Kopf- und Partikeldarstellung. Der Lehrling der Szene wird nie gespeichert.
(()=>{
const M=window.MG,S=M.s,W=M.workshop,F=W.state,$=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const barks=['DAS soll eine Schneide sein?!','Zehn Tage und du kannst immer noch keinen Stahl lesen!','Ich habe schon stumpfere Löffel mit mehr Talent gesehen!','Mit dem Ding schneidest du nicht mal Butter!','Wer hat DICH an meinen Amboss gelassen?!'];
const lessons=['{N} schmiedet Waffen und Rüstungen für deinen Ludus.','Je mehr er schmiedet, desto besser wird er.','Neue Rezepte kannst du durch die Ausrüstung deiner Gegner entdecken.','Lehrlinge können sein maximales Können verbessern.','Die Ausbildung ist allerdings … anspruchsvoll.'];
const BAM=15.4,END=42.6,VICTIM=806,REACH=VICTIM-32,KICK=[806,280],SOIL=23.2,story=[[0,'{N} ist ein alter Freund aus deinen Gladiatorentagen.'],[2.8,'Er versteht mehr von Stahl, Waffen und Rüstungen als fast jeder andere.'],[5.8,'Leider hat er ein paar … sagen wir … Besonderheiten.'],[8.6,'Genauer gesagt ist {N} vermutlich der größte Motherfucker, der je einen Amboss angefasst hat.'],[11.8,'Aber nun ja.'],[13,'Er macht verdammt gute Arbeit.'],[14.8,''],[33.6,'Wie gesagt.'],[35.4,'{N} hat ein paar Besonderheiten.'],[37.8,'Dafür schmiedet er hervorragende Waffen und Rüstungen.'],[40.4,'Nur leider nichts umsonst.']];
let wasIntro=false,draft=null,preview=null,scene=null,bar=null,wait=0,paintClock=0,lesson=0,backdrop=null,body=null;
const stage=()=>F.intro||'',named=text=>text.replaceAll('{N}',F.master?.name||'Der Schmied'),lerp=(a,b,k)=>a+(b-a)*Math.min(1,Math.max(0,k)),between=(t,a,b)=>t>=a&&t<b;
function figure(p,apprentice=false){const rng=S.rng,g=M.makeGladiator(0);S.rng=rng;g.id=p.id||'smith-intro';g.name=p.name;g.appearance={...p.appearance};g.height=p.height;g.weight=p.weight;g.muscle=apprentice?37:58;g.fame=0;g.scars=[];g.equipment={weapon:null,secondary:null,shield:null,armor:{}};g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};return {id:g.id,g,team:0,x:0,y:0,a:0,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,forgeWorker:true,apprentice,hammer:M.makeItem('weapon','hammer',1),sword:M.makeItem('weapon','gladius',1),bloodMarks:{}};}
function showBar(html){if(!bar){bar=document.createElement('div');bar.id='smithIntroBar';bar.className='smith-intro-bar';bar.setAttribute?.('role','status');document.body.appendChild(bar);}if(bar._html!==html){bar.innerHTML=html;bar._html=html;}}
function hideBar(){bar?.remove?.();bar=null;}
// ---------- 1 · Hinweis im Ludus, 2 · Hauptschmied erstellen ----------
function creator(){return `<section class="smith-creator"><canvas id="smithIntroPreview" width="180" height="190" aria-label="Dein Hauptschmied"></canvas><div><p>Einmalig 250 Gold, kein Unterhalt. Name und Aussehen bleiben dauerhaft.</p><label for="smithIntroName">Name<input id="smithIntroName" class="select" maxlength="32" value="${esc(draft.name)}" placeholder="Zum Beispiel Ferrus"></label><div class="buttons"><button class="btn" data-action="smithintro:look">Aussehen würfeln</button><button class="btn" data-action="smithintro:name">Namen würfeln</button><button class="btn primary" data-action="smithintro:confirm" ${S.gold<250?'disabled':''}>Schmied bestätigen</button></div>${S.gold<250?'<p class="tiny">Dafür fehlen dir 250 Gold.</p>':''}</div></section>`;}
function paintPreview(){const c=$('smithIntroPreview');if(!c?.getContext||!draft)return;preview??=figure(draft);const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#23332f';g.fillRect(0,0,180,190);g.save();g.translate(-40,-110);g.scale(2,2);preview.g.enemyGear.secondary=preview.hammer;M.renderForgeActors(g,[{...preview,x:65,y:135,a:0,state:'idle',phase:0,moveSpeed:0}]);g.restore();}
function openCreator(){draft??=W.sketch();M.ui.modal('Dein Hauptschmied',creator());paintPreview();}
function confirm(){const name=String($('smithIntroName')?.value??draft?.name??'').trim().slice(0,32);if(!name){M.ui.notify('Bitte einen Namen eingeben.');$('smithIntroName')?.focus?.();return;}draft??=W.sketch();draft.name=name;const message=W.hireMaster(draft);if(!F.master){M.ui.notify(message);return;}W.setIntro('scene');draft=preview=null;M.ui.close();M.ui.click('nav:home');}
// ---------- 3 bis 12 · Szene vor der Schmiede ----------
function startScene(){if(scene||!F.master)return;const helper=W.sketch();helper.id='smith-intro-apprentice';helper.weight=Math.min(helper.weight,88);hideBar();scene={t:0,smith:figure(F.master),boy:figure(helper,true),limbs:[],fx:[],struck:false,played:{},bottle:null,shards:null,hammer:null,bark:barks[Math.floor(Math.random()*barks.length)]};const v=document.createElement('div');v.id='smithIntro';v.className='smith-ceremony smith-intro';v.setAttribute?.('role','dialog');v.setAttribute?.('aria-modal','true');v.setAttribute?.('aria-label','Vorstellung des Hauptschmieds');v.innerHTML='<div><canvas id="smithIntroCanvas" width="660" height="420" aria-label="Die Schmiede"></canvas><p id="smithIntroText" aria-live="polite"></p></div>';document.body.appendChild(v);scene.view=v;}
// Weg am Abschrecktrog vorbei statt hindurch
function leg(pts,k){const L=[0];for(let i=1;i<pts.length;i++)L.push(L[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));const d=Math.max(0,Math.min(1,k))*L[L.length-1];for(let i=1;i<pts.length;i++)if(d<=L[i]||i===pts.length-1){const u=(d-L[i-1])/((L[i]-L[i-1])||1);return {x:pts[i-1][0]+(pts[i][0]-pts[i-1][0])*u,y:pts[i-1][1]+(pts[i][1]-pts[i-1][1])*u};}return {x:pts[0][0],y:pts[0][1]};}
function once(key,fn){if(scene.played[key])return;scene.played[key]=true;fn();}
function dust(x,y,n,color,spread=30){for(let i=0;i<n;i++)scene.fx.push({x:x+Math.random()*8-4,y:y+Math.random()*4-2,z:2+Math.random()*10,vx:(Math.random()-.5)*spread,vy:(Math.random()-.5)*8,vz:15+Math.random()*30,life:.5+Math.random()*.5,size:2,color});}
function pose(t){const a=scene.smith,b=scene.boy;for(const p of [a,b]){p.state='idle';p.moveSpeed=0;p.wind=0;p.swing=0;p.wipeTimer=0;p.mercyTimer=0;p.jumpTimer=0;p.kickTimer=0;p.stagger=0;p.forgePose='';p.forgeHold='';p.technique=null;p.phase=t*4;p.g.enemyGear.secondary=null;}
 // Lehrling: wartet, erschrickt, weicht zurück, hebt die Hände, will fliehen.
 b.x=790;b.y=262;b.a=Math.PI;
 if(t<BAM)b.x+=Math.sin(t*1.7)*1.2;
 if(between(t,BAM,BAM+.26))b.jumpTimer=BAM+.26-t;
 if(t>=21.6&&!scene.struck){b.x=lerp(790,796,(t-21.6)/.5);if(t<22.1){b.state='move';b.moveSpeed=30;}else{b.state='mercy';b.x+=Math.sin(t*40)*.8;b.facePain=.5;}}
 if(between(t,24.2,24.8))b.a=0;
 if(t>=27.9&&!scene.struck){b.x=lerp(796,VICTIM,(t-27.9)/.8);if(t<28.7){b.a=0;b.state='move';b.moveSpeed=70;}else{b.a=Math.PI;b.state='mercy';b.x+=Math.sin(t*55)*1.2;}}
 if(scene.struck){b.x=VICTIM;b.down=true;b.fallSide=-1;}
 // Schmied: Tür, Torkeln, Schluck, Flasche weg, Gebrüll, Hammer weg, Schwert, Schlag, zurück an die Arbeit.
 a.hidden=t<BAM+.9||t>=38;a.x=748;a.y=233;a.a=Math.PI;if(t<21)a.forgeHold='bottle';
 if(between(t,16.3,19)){const k=(t-16.3)/2.7;a.x=lerp(748,716,k)+Math.sin(t*6)*4;a.y=lerp(233,258,k);a.state='move';a.moveSpeed=18;a.stagger=.2;}
 if(t>=19){a.x=716;a.y=258;}
 if(between(t,19,20.2)){a.x+=Math.sin(t*3)*2;a.forgePose='drink';}
 if(t>=20.2)a.a=0;
 if(between(t,20.2,21))a.x+=Math.sin(t*3)*1.5;if(between(t,20.65,21))a.forgePose='throw';
 // Hammer und Schwert hängen am Gürtel; der Hammer fliegt bei 27.2 zu Boden und wird bei 35.3 wieder aufgehoben
 M.beltPlan?.(a,t,[[0,null],[21.6,'hammer'],[27.2,null,{drop:true}],[27.9,'sword'],[33.4,null],[35.3,'hammer',{pick:true}]]);
 if(between(t,22.6,26.2)){a.state=Math.sin(t*5)>-.2?'charge':'idle';a.forgePose='shake';a.shoutTimer=.3;}

 if(between(t,29.2,30.6)){const k=(t-29.2)/1.4;a.x=lerp(716,REACH,k);a.y=lerp(258,262,k);a.state='move';a.moveSpeed=45;}
 if(t>=30.6&&t<32.4){a.x=REACH;a.y=262;}
 if(between(t,32.4,33.2)){const k=(t-32.4)/.8;{const q=leg([[REACH,262],[804,265],KICK],k);a.x=q.x;a.y=q.y;}a.a=0;a.state='move';a.moveSpeed=35;}
 if(between(t,33.2,33.9)){a.x=KICK[0];a.y=KICK[1];a.a=0;}if(between(t,33.2,33.68))a.kickTimer=33.68-t;
 if(between(t,30.6,31.3)){a.technique='overhead';a.windMax=.7;a.wind=31.3-t;}
 if(between(t,31.3,31.8)){a.swingKind='slash';a.swingMax=.5;a.swing=31.8-t;}
 if(between(t,33.9,35.3)){const k=(t-33.9)/1.4;{const q=leg([KICK,[804,265],[718,258]],k);a.x=q.x;a.y=q.y;}a.a=Math.PI;a.state='move';a.moveSpeed=40;}
 if(t>=35.3){a.x=718;a.y=258;a.a=0;}
 if(between(t,35.6,38)){const k=(t-35.6)/2.4;a.x=lerp(718,748,k);a.y=lerp(258,233,k);a.state='move';a.moveSpeed=40;}
 // Ereignisse
 if(t>=BAM)once('bam',()=>{M.sound?.('heavy');dust(748,236,22,'#c9b586',70);});
 if(t>=21)once('throw',()=>{scene.bottle={t0:21};});
 if(t>=21.5)once('klirr',()=>{scene.bottle=null;scene.shards={x:694,y:268};M.sound?.('block');dust(694,268,12,'#8fb58c',45);});
 if(t>=27.2)once('hammer',()=>{scene.hammer={x:703,y:262};M.sound?.('land');});
 if(t>=27.9)once('draw',()=>M.sound?.('stick'));
 if(t>=31.55)once('strike',()=>{scene.struck=true;b.g.body.head.missing=true;b.g.dead=true;b.down=true;b.fallSide=-1;scene.limbs.push({x:VICTIM+4,y:262,z:55,angle:0,part:'head',skin:b.g.appearance.skin,hair:b.g.appearance.hair,g:b.g,t0:t});for(let n=0;n<18;n++)scene.fx.push({x:VICTIM,y:262,z:42,vx:14+Math.random()*24,vy:Math.random()*12-6,vz:20+Math.random()*22,life:.6+Math.random()*.5,size:2,color:n%3?'#aa3c36':'#87352e'});M.sound?.('sever');});
 if(t>=SOIL)once('soil',()=>{scene.soiled=true;});
 if(t>=33.42)once('kick',()=>{const h=scene.limbs.find(p=>p.part==='head');if(h){h.kick={vx:120,vy:-4,vz:80};}M.sound?.('hit');dust(KICK[0]+16,284,8,'#c9b586',40);});
 if(t>=35.3)once('pickup',()=>{scene.hammer=null;});
}

// ---------- Der Hof-Hund: läuft zufällig vorbei, schnüffelt, übergibt sich, jagt später dem Kopf hinterher ----------
// Reine Inszenierung in Weltkoordinaten der Szene, nichts davon wird gespeichert.
const DOG_IN=23.6,SNIFF=25.3,RETCH=26.6,ASIDE=27.6,CHASE=33.5;
function dogAt(t){const head=scene.limbs.find(p=>p.part==='head');
 if(t<DOG_IN)return {x:890,y:270,f:-1,pose:'walk',show:false};
 if(t<SNIFF){const k=(t-DOG_IN)/(SNIFF-DOG_IN);return {x:lerp(886,814,k),y:lerp(272,266,k),f:-1,pose:'walk',show:true};}
 if(t<RETCH-.3)return {x:814+Math.sin(t*9)*1,y:266,f:-1,pose:'sniff',show:true};
 if(t<RETCH)return {x:lerp(814,821,(t-RETCH+.3)/.3),y:266,f:-1,pose:'recoil',show:true};
 if(t<ASIDE)return {x:821,y:267,f:-1,pose:'retch',show:true};
 if(t<ASIDE+1.6){/* hinter dem Lehrling vorbei, am Trog entlang, nicht hindurch */const q=leg([[821,267],[812,255],[766,256],[744,290]],(t-ASIDE)/1.6);return {x:q.x,y:q.y,f:-1,pose:'walk',show:true};}
 if(t<CHASE)return {x:744,y:290,f:1,pose:'sit',show:true};
 const k=t-CHASE,x=744+k*120;return {x,y:lerp(290,297,Math.min(1,k*3)),f:1,pose:'run',show:x<900};}
function dog(g,t,r){const d=dogAt(t);if(!d.show)return;const f=d.f,R=(lx,ly,w,h,c)=>r(f>0?d.x+lx:d.x-lx-w,d.y+ly,w,h,c),fur='#d9cfb6',dark='#6b5a45',belly='#f0e8d2',run=d.pose==='walk'||d.pose==='run',ph=t*(d.pose==='run'?22:13);
 if(d.pose==='sit'){R(-8,-4,4,4,dark);R(4,-5,3,5,fur);R(-9,-10,13,7,fur);R(-6,-5,9,2,belly);R(-11,-12,3,3,dark);R(-12,-14+Math.round(Math.sin(t*10)),2,3,dark);R(2,-16,8,7,fur);R(9,-13,4,3,fur);R(12,-13,1,1,'#1f1a16');R(6,-14,1,1,'#1f1a16');R(3,-17,3,4,dark);return;}
 for(const [lx,o] of [[-8,0],[-5,Math.PI],[4,Math.PI],[7,0]]){const lift=run?Math.max(0,Math.sin(ph+o))*2:0;R(lx,-5-lift,2,5,lx<0?dark:fur);}
 R(-9,-11,18,6,fur);R(-8,-6,15,1,belly);R(-9,-11,18,1,'#efe6cf');R(-9,-6,18,1,'#8f826b');R(-5,-11,6,3,'#8a6a44');R(3,-10,3,2,'#8a6a44');
 const wag=Math.round(Math.sin(t*(d.pose==='sniff'?24:12))*2);R(-12,-14+wag,3,2,dark);R(-11,-12,2,2,dark);
 const low=d.pose==='sniff'?-4:d.pose==='retch'?5:d.pose==='recoil'?-3:0,hx=d.pose==='retch'?8:9;
 R(hx,-16+low,7,6,fur);R(hx+6,-13+low,4,3,fur);R(hx+9,-13+low,1,1,'#1f1a16');R(hx+4,-15+low,1,1,'#1f1a16');R(hx+1,-17+low,3,4,dark);
 if(d.pose==='retch'){const k=(t-RETCH)%0.5;R(hx+8,-10+low,3,2,'#3a1f1a');if(k<.3)for(let i=0;i<4;i++)R(hx+9+i*2,-9+low+i*2+Math.round(k*10),2,2,i%2?'#b7bf62':'#9aa64d');}
 if(d.pose==='recoil')R(hx+2,-21,1,3,'#efe0b3'),R(hx+4,-22,1,4,'#efe0b3');}
function mess(g,t,b,r,layer){
 if(t<SOIL)return;const rear=b.down?0:(Math.cos(b.a)>=0?-1:1),s=.6*b.g.height/180*1.14,k=Math.min(1,(t-SOIL)/1.2);
 if(layer==='ground'){
  // Pfütze unter dem Lehrling, Erbrochenes vor dem Hund
  const px=scene.soilX??=b.x+5;r(px-3,b.y+1,Math.round(4+k*5),2,'#5a3d1e');r(px-1,b.y,Math.round(2+k*3),1,'#6e4a24');
  if(t>=RETCH+.2){const v=Math.min(1,(t-RETCH-.2)/.8);r(806-Math.round(v*5),268,Math.round(4+v*9),3,'#9aa64d');r(808-Math.round(v*3),267,Math.round(2+v*5),1,'#b7bf62');r(811,269,2,1,'#6f7a37');}
  return;}
 if(!b.down){const x=b.x+rear*5*s,w=Math.round(9*s);r(rear>0?x-2:x-w+2,b.y-31*s,w,Math.round(10*s),'#4e3318');r(rear>0?x-1:x-w+3,b.y-30*s,Math.round(w*.6),2,'#6e4a24');for(const [dx,len] of [[0,14],[3,10],[-3,17]])r(x+rear*dx*s*.6,b.y-21*s,2,Math.round(k*len*s),'#5a3d1e');}
 // Gestank steigt auf, solange nicht der Kopf rollt
 if(t<31.55)for(let i=0;i<3;i++){const u=(t*.8+i/3)%1,x=(scene.soilX??b.x+5)+i*3-3+Math.sin(u*9+i)*2,y=b.y-12-u*26;g.globalAlpha=.75*(1-u);r(x,y,1,3,'#8fa35a');r(x+1,y-3,1,3,'#8fa35a');g.globalAlpha=1;}}
function bubble(g,text,wx,wy){const k=660/240,words=text.split(' '),lines=[''];for(const w of words){if((lines[lines.length-1]+' '+w).trim().length>19)lines.push(w);else lines[lines.length-1]=(lines[lines.length-1]+' '+w).trim();}g.font="bold 25px 'Courier Prime',monospace";g.textAlign='center';g.textBaseline='middle';const width=Math.max(...lines.map(l=>l.length))*15.2+26,height=lines.length*30+16,x=Math.min(660-width-6,Math.max(6,(wx-625)*k-width/2)),y=Math.max(6,(wy-145)*k-height);g.fillStyle='#17201c';g.fillRect(x-3,y-3,width+6,height+6);g.fillStyle='#efe0b3';g.fillRect(x,y,width,height);g.fillRect(x+width/2-5,y+height,10,8);g.fillStyle='#17201c';lines.forEach((l,i)=>g.fillText(l,x+width/2,y+24+i*30));}
function paint(){const c=$('smithIntroCanvas');if(!c?.getContext)return;backdrop??=M.ludus.background();const g=c.getContext('2d'),t=scene.t,a=scene.smith,b=scene.boy,r=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),w,h);},shake=between(t,BAM,BAM+.45)?(Math.random()-.5)*10:0;
 g.imageSmoothingEnabled=false;g.setTransform?.(1,0,0,1,0,0);g.clearRect(0,0,c.width,c.height);g.save();g.translate(shake,shake*.6);g.scale(c.width/240,c.height/153);g.translate(-625,-145);g.drawImage(backdrop,0,0);
 r(790,205,7,10,t%1>.5?'#c88945':'#e2ab5c');r(805,210,5,7,t%1>.5?'#c88945':'#e2ab5c');
 if(t>=BAM){r(733,187,29,49,'#161a17');r(733,187,29,3,'#0d100e');r(762,184,5,52,'#514636');r(763,186,1,48,'#71583b');r(766,184,1,52,'#373b30');}
 if(scene.shards)for(const [dx,dy]of [[-5,0],[-1,2],[3,-1],[6,1],[1,-2],[-3,3]]){r(scene.shards.x+dx,scene.shards.y+dy,2,1,'#6f9a72');r(scene.shards.x+dx+1,scene.shards.y+dy,1,1,'#c5e2c0');}
 if(scene.hammer){r(scene.hammer.x-7,scene.hammer.y,11,2,'#6b5236');r(scene.hammer.x+3,scene.hammer.y-2,5,6,'#8d9892');r(scene.hammer.x+3,scene.hammer.y-2,5,1,'#c2c5b0');}
 mess(g,t,b,r,'ground');const list=[b,...(a.hidden?[]:[a])].sort((p,q)=>p.y-q.y),dy=dogAt(t).y;/* Hund nach Tiefe einsortiert: hinter Figuren, die weiter vorn stehen */M.renderForgeActors(g,list.filter(p=>p.y<=dy));dog(g,t,r);M.renderForgeActors(g,list.filter(p=>p.y>dy));mess(g,t,b,r,'body');M.renderForgeEffects(g,scene.limbs,scene.fx);
 const flask=(x,y)=>{r(x-1,y-4,3,7,'#4f7a52');r(x,y-6,1,3,'#3b5c40');r(x-1,y-4,1,5,'#8fb58c');};
 if(scene.bottle){const p=(t-scene.bottle.t0)/.5;flask(lerp(a.x-6,694,p),lerp(a.y-46,266,p)-Math.sin(Math.min(1,p)*Math.PI)*10);}
 g.restore();
 if(between(t,22.6,26.2))bubble(g,scene.bark,a.x,a.y-54);
 for(const [from,to,word,wx,wy] of [[SOIL,SOIL+.8,'PFRRRT!',b.x+12,b.y-30],[25.4,26.2,'*schnüff*',dogAt(t).x,dogAt(t).y-22],[26.7,27.4,'WÜRG!',dogAt(t).x-8,dogAt(t).y-22]])if(between(t,from,to)){g.font="bold 24px 'Courier Prime',monospace";g.textAlign='center';g.textBaseline='middle';const sx=Math.min(610,Math.max(50,(wx-625)*660/240)),sy=Math.max(24,(wy-145)*420/153);g.fillStyle='#17201c';g.fillText(word,sx+2,sy+2);g.fillStyle=word==='WÜRG!'?'#c8d27a':'#e8cf9a';g.fillText(word,sx,sy);}
 const shout=between(t,BAM,BAM+.9)?'BÄM!':between(t,21.5,22.2)?'KLIRR':'';if(shout){g.font='bold '+(shout==='BÄM!'?54:30)+"px 'Courier Prime',monospace";g.textAlign='center';g.textBaseline='middle';const x=shout==='BÄM!'?338:190,y=shout==='BÄM!'?120:300;g.fillStyle='#17201c';g.fillText(shout,x+3,y+3);g.fillStyle=shout==='BÄM!'?'#f4d37a':'#c5e2c0';g.fillText(shout,x,y);}}
// Erzählphasen vor dem Auftritt und nach der Szene laufen langsamer, damit die Texte länger stehen; die Handlung dazwischen behält ihr Tempo.
const TEXT_PACE=.68;
function stepScene(step){scene.t+=step*(scene.t<14.8||scene.t>=33.6?TEXT_PACE:1);const t=scene.t;pose(t);for(const p of scene.limbs){if(p.kick){const k=p.kick;p.x+=k.vx*step;p.y+=k.vy*step;k.vz-=300*step;p.z=Math.max(0,p.z+k.vz*step);if(!p.z&&k.vz<0){k.vz=-k.vz*.45;k.vx*=.75;}p.angle+=step*16;continue;}const age=t-p.t0;p.x+=step*(age<1.2?12:0);p.y+=step*(age<1.2?18:0);p.z=Math.max(0,55-age*46);p.angle+=p.z?step*5:0;}for(const p of scene.fx){p.x+=p.vx*step;p.y+=p.vy*step;p.vz-=180*step;p.z=Math.max(0,p.z+p.vz*step);p.life-=step;}scene.fx=scene.fx.filter(p=>p.life>0);paint();let line='';for(const [at,text]of story)if(t>=at)line=text;const el=$('smithIntroText'),shown=named(line);if(el&&el.textContent!==shown)el.textContent=shown;if(t>=END)endScene();}
function endScene(){if(!scene)return;body={boy:scene.boy};scene.view?.remove?.();scene=null;lesson=0;W.setIntro('tutorial');M.ui.close();M.ui.click('nav:forge');}
// ---------- 13 · Tutorial im Schmiedemenü; der Tote liegt noch vor der Schmiede ----------
function corpse(){if(!body){const helper=W.sketch();helper.id='smith-intro-apprentice';body={boy:figure(helper,true)};}const b=body.boy;b.g.body.head.missing=true;b.g.dead=true;Object.assign(b,{x:VICTIM,y:262,a:Math.PI,down:true,fallSide:-1,state:'idle',moveSpeed:0,phase:0});return b;}
const actors=M.renderForgeActors;M.renderForgeActors=(ctx,list)=>{actors(ctx,list);if(stage()!=='tutorial'||scene||list.some(p=>p.apprentice&&p.g.dead)||!list.some(p=>p.forgeWorker&&!p.apprentice&&p.id===F.master?.id))return;const b=corpse();actors(ctx,[b]);};
function tutorialBar(){const last=lesson>=lessons.length-1;showBar(`<p>${esc(named(lessons[Math.min(lesson,lessons.length-1)]))}</p><div class="buttons"><button class="btn primary" data-action="smithintro:next">${last?'VERSTANDEN':'WEITER →'}</button></div>`);}
function next(){if(lesson>=lessons.length-1){W.setIntro('done');body=null;hideBar();M.ui.render();return;}lesson++;if(lesson===lessons.length-1)$('smithScene')?.scrollIntoView?.({block:'center'});tutorialBar();}
// ---------- Ablaufsteuerung ----------
const highlight=M.renderLudusActors;M.renderLudusActors=(ctx,list)=>{highlight(ctx,list);if(ctx.canvas?.id!=='ludusCanvas'||stage()!=='pending'||wait<2.4)return;const p=M.ludus.places.find(p=>p.route==='forge');if(!p)return;const pulse=(Math.sin(wait*5)+1)/2;ctx.save();ctx.strokeStyle='#f4d37a';ctx.globalAlpha=.55+pulse*.45;ctx.lineWidth=3+pulse*2;ctx.strokeRect(p.x-6-pulse*3,p.y-8-pulse*3,p.w+12+pulse*6,p.h+16+pulse*6);ctx.fillStyle='#f4d37a';for(let n=0;n<3;n++)ctx.fillRect(p.x+p.w/2-7+n*2,p.y-30-pulse*6+n*4,14-n*4,4);ctx.restore();};
const click=M.schoolClick;M.schoolClick=action=>{if(action.startsWith('smithintro:')){const key=action.split(':')[1];if(key==='skip'){W.setIntro('done');hideBar();M.ui.close();}else if(key==='look'){const name=$('smithIntroName')?.value??draft?.name??'';draft={...W.sketch(),name};preview=null;openCreator();}else if(key==='name'){draft??=W.sketch();draft.name=W.randomName();const field=$('smithIntroName');if(field)field.value=draft.name;}else if(key==='confirm')confirm();else if(key==='skipscene')endScene();else if(key==='next')next();return true;}
 if(stage()==='pending'&&!S.battle&&!M.intro?.active?.()){if(action==='nav:forge'){openCreator();return true;}if((action.startsWith('nav:')&&action!=='nav:home')||action.startsWith('detail:')||action==='ludus:owner'){M.ui.notify('Klicke zuerst auf die Schmiede.');return true;}}
 return click(action);};
const tick=M.ludusTick;M.ludusTick=dt=>{tick?.(dt);if(document.hidden)return;const step=Math.min(dt,.1),playing=!!M.intro?.active?.();if(wasIntro&&!playing&&S.lanista?.veteran&&!F.master&&!F.intro)W.setIntro('pending');wasIntro=playing;if(playing||S.battle){hideBar();return;}
 const now=stage();
 if(now==='pending'){if(F.master){W.setIntro('scene');return;}wait+=step;showBar(`<p>Heute lernen wir unseren Schmied kennen.</p>${wait>=2.4?'<p class="hint">Klicke auf die Schmiede.</p>':''}`);if(wait>=2.4&&!bar._scrolled){bar._scrolled=true;M.ludus?.focus?.(745,170);}}
 else if(now==='scene'){if(!F.master){W.setIntro('done');return;}if(!scene)startScene();paintClock+=dt;if(paintClock>=1/30){const s=Math.min(paintClock,.1);paintClock=0;stepScene(s);}}
 else if(now==='tutorial'){if(!F.master){W.setIntro('done');hideBar();return;}tutorialBar();}
 else if(bar)hideBar();};
M.forgeIntro={stage,get scene(){return scene;},skipScene:endScene,next,open:openCreator};
})();
