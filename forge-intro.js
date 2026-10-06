'use strict';
// Einmalige Vorstellung des Hauptschmieds: Hinweis im Ludus, Erstellung, gescriptete Szene, kurzes Schmiede-Tutorial.
// Reine Inszenierung mit vorhandenen Figuren, Kopf- und Partikeldarstellung. Der Lehrling der Szene wird nie gespeichert.
(()=>{
const M=window.MG,S=M.s,W=M.workshop,F=W.state,$=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const barks=['DAS soll eine Schneide sein?!','Zehn Tage und du kannst immer noch keinen Stahl lesen!','Ich habe schon stumpfere Löffel mit mehr Talent gesehen!','Mit dem Ding schneidest du nicht mal Butter!','Wer hat DICH an meinen Amboss gelassen?!'];
const lessons=['{N} schmiedet Waffen und Rüstungen für deinen Ludus.','Je mehr er schmiedet, desto besser wird er.','Neue Rezepte kannst du durch die Ausrüstung deiner Gegner entdecken.','Lehrlinge können sein maximales Können verbessern.','Die Ausbildung ist allerdings … anspruchsvoll.'];
const BAM=15.4,END=42.6,story=[[0,'{N} ist ein alter Freund aus deinen Gladiatorentagen.'],[2.8,'Er versteht mehr von Stahl, Waffen und Rüstungen als fast jeder andere.'],[5.8,'Leider hat er ein paar … sagen wir … Besonderheiten.'],[8.6,'Genauer gesagt ist {N} vermutlich der größte Motherfucker, der je einen Amboss angefasst hat.'],[11.8,'Aber nun ja.'],[13,'Er macht verdammt gute Arbeit.'],[14.8,''],[33.6,'Wie gesagt.'],[35.4,'{N} hat ein paar Besonderheiten.'],[37.8,'Dafür schmiedet er hervorragende Waffen und Rüstungen.'],[40.4,'Nur leider nichts umsonst.']];
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
function startScene(){if(scene||!F.master)return;const helper=W.sketch();helper.id='smith-intro-apprentice';helper.weight=Math.min(helper.weight,88);hideBar();scene={t:0,smith:figure(F.master),boy:figure(helper,true),limbs:[],fx:[],struck:false,played:{},bottle:null,shards:null,hammer:null,bark:barks[Math.floor(Math.random()*barks.length)]};const v=document.createElement('div');v.id='smithIntro';v.className='smith-ceremony smith-intro';v.setAttribute?.('role','dialog');v.setAttribute?.('aria-modal','true');v.setAttribute?.('aria-label','Vorstellung des Hauptschmieds');v.innerHTML='<div><canvas id="smithIntroCanvas" width="660" height="420" aria-label="Die Schmiede"></canvas><p id="smithIntroText" aria-live="polite"></p><button class="btn" data-action="smithintro:skipscene">ÜBERSPRINGEN →</button></div>';document.body.appendChild(v);scene.view=v;}
function once(key,fn){if(scene.played[key])return;scene.played[key]=true;fn();}
function dust(x,y,n,color,spread=30){for(let i=0;i<n;i++)scene.fx.push({x:x+Math.random()*8-4,y:y+Math.random()*4-2,z:2+Math.random()*10,vx:(Math.random()-.5)*spread,vy:(Math.random()-.5)*8,vz:15+Math.random()*30,life:.5+Math.random()*.5,size:2,color});}
function pose(t){const a=scene.smith,b=scene.boy;for(const p of [a,b]){p.state='idle';p.moveSpeed=0;p.wind=0;p.swing=0;p.wipeTimer=0;p.mercyTimer=0;p.jumpTimer=0;p.stagger=0;p.forgePose='';p.technique=null;p.phase=t*4;p.g.enemyGear.secondary=null;}
 // Lehrling: wartet, erschrickt, weicht zurück, hebt die Hände, will fliehen.
 b.x=790;b.y=262;b.a=Math.PI;
 if(t<BAM)b.x+=Math.sin(t*1.7)*1.2;
 if(between(t,BAM,BAM+.26))b.jumpTimer=BAM+.26-t;
 if(t>=21.6&&!scene.struck){b.x=lerp(790,802,(t-21.6)/.5);if(t<22.1){b.state='move';b.moveSpeed=30;}else{b.state='mercy';b.x+=Math.sin(t*40)*.8;b.facePain=.5;}}
 if(between(t,24.2,24.8))b.a=0;
 if(t>=27.9&&!scene.struck){b.x=lerp(802,826,(t-27.9)/.8);if(t<28.7){b.a=0;b.state='move';b.moveSpeed=70;}else{b.a=Math.PI;b.state='mercy';b.x+=Math.sin(t*55)*1.2;}}
 if(scene.struck){b.x=826;b.down=true;b.fallSide=1;}
 // Schmied: Tür, Torkeln, Schluck, Flasche weg, Gebrüll, Hammer weg, Schwert, Schlag, zurück an die Arbeit.
 a.hidden=t<BAM+.9||t>=38;a.x=748;a.y=233;a.a=Math.PI;
 if(between(t,16.3,19)){const k=(t-16.3)/2.7;a.x=lerp(748,716,k)+Math.sin(t*6)*4;a.y=lerp(233,258,k);a.state='move';a.moveSpeed=18;a.stagger=.2;}
 if(t>=19){a.x=716;a.y=258;}
 if(between(t,19,20.2)){a.x+=Math.sin(t*3)*2;a.mercyTimer=1;}
 if(t>=20.2)a.a=0;
 if(between(t,20.2,21))a.x+=Math.sin(t*3)*1.5;
 if(t>=21.6&&t<27.2)a.g.enemyGear.secondary=a.hammer;
 if(between(t,22.6,26.2)){a.state=Math.sin(t*5)>-.2?'charge':'idle';a.forgePose='shake';a.shoutTimer=.3;}
 if(t>=27.9&&t<33.4)a.g.enemyGear.secondary=a.sword;
 if(between(t,29.2,30.6)){const k=(t-29.2)/1.4;a.x=lerp(716,806,k);a.y=lerp(258,262,k);a.state='move';a.moveSpeed=45;}
 if(t>=30.6&&t<33.8){a.x=806;a.y=262;}
 if(between(t,30.6,31.3)){a.technique='overhead';a.windMax=.7;a.wind=31.3-t;}
 if(between(t,31.3,31.8)){a.swingKind='slash';a.swingMax=.5;a.swing=31.8-t;}
 if(between(t,33.8,35.2)){const k=(t-33.8)/1.4;a.x=lerp(806,718,k);a.y=lerp(262,258,k);a.a=Math.PI;a.state='move';a.moveSpeed=40;}
 if(t>=35.2){a.g.enemyGear.secondary=a.hammer;a.x=718;a.y=258;a.a=0;}
 if(between(t,35.6,38)){const k=(t-35.6)/2.4;a.x=lerp(718,748,k);a.y=lerp(258,233,k);a.state='move';a.moveSpeed=40;}
 // Ereignisse
 if(t>=BAM)once('bam',()=>{M.sound?.('heavy');dust(748,236,22,'#c9b586',70);});
 if(t>=21)once('throw',()=>{scene.bottle={t0:21};});
 if(t>=21.5)once('klirr',()=>{scene.bottle=null;scene.shards={x:694,y:268};M.sound?.('block');dust(694,268,12,'#8fb58c',45);});
 if(t>=27.2)once('hammer',()=>{scene.hammer={x:703,y:262};M.sound?.('land');});
 if(t>=27.9)once('draw',()=>M.sound?.('stick'));
 if(t>=31.55)once('strike',()=>{scene.struck=true;b.g.body.head.missing=true;b.g.dead=true;b.down=true;b.fallSide=1;scene.limbs.push({x:830,y:262,z:55,angle:0,part:'head',skin:b.g.appearance.skin,hair:b.g.appearance.hair,g:b.g,t0:t});for(let n=0;n<18;n++)scene.fx.push({x:826,y:262,z:42,vx:14+Math.random()*24,vy:Math.random()*12-6,vz:20+Math.random()*22,life:.6+Math.random()*.5,size:2,color:n%3?'#aa3c36':'#87352e'});M.sound?.('sever');});
 if(t>=35.2)once('pickup',()=>{scene.hammer=null;});
}
function bubble(g,text,wx,wy){const k=660/240,words=text.split(' '),lines=[''];for(const w of words){if((lines[lines.length-1]+' '+w).trim().length>19)lines.push(w);else lines[lines.length-1]=(lines[lines.length-1]+' '+w).trim();}g.font='bold 25px monospace';g.textAlign='center';g.textBaseline='middle';const width=Math.max(...lines.map(l=>l.length))*15.2+26,height=lines.length*30+16,x=Math.min(660-width-6,Math.max(6,(wx-625)*k-width/2)),y=Math.max(6,(wy-145)*k-height);g.fillStyle='#17201c';g.fillRect(x-3,y-3,width+6,height+6);g.fillStyle='#efe0b3';g.fillRect(x,y,width,height);g.fillRect(x+width/2-5,y+height,10,8);g.fillStyle='#17201c';lines.forEach((l,i)=>g.fillText(l,x+width/2,y+24+i*30));}
function paint(){const c=$('smithIntroCanvas');if(!c?.getContext)return;backdrop??=M.ludus.background();const g=c.getContext('2d'),t=scene.t,a=scene.smith,b=scene.boy,r=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),w,h);},shake=between(t,BAM,BAM+.45)?(Math.random()-.5)*10:0;
 g.imageSmoothingEnabled=false;g.setTransform?.(1,0,0,1,0,0);g.clearRect(0,0,c.width,c.height);g.save();g.translate(shake,shake*.6);g.scale(c.width/240,c.height/153);g.translate(-625,-145);g.drawImage(backdrop,0,0);
 r(790,205,7,10,t%1>.5?'#c88945':'#e2ab5c');r(805,210,5,7,t%1>.5?'#c88945':'#e2ab5c');
 if(t>=BAM){r(733,187,29,49,'#161a17');r(733,187,29,3,'#0d100e');r(762,184,5,52,'#514636');r(763,186,1,48,'#71583b');r(766,184,1,52,'#373b30');}
 if(scene.shards)for(const [dx,dy]of [[-5,0],[-1,2],[3,-1],[6,1],[1,-2],[-3,3]]){r(scene.shards.x+dx,scene.shards.y+dy,2,1,'#6f9a72');r(scene.shards.x+dx+1,scene.shards.y+dy,1,1,'#c5e2c0');}
 if(scene.hammer){r(scene.hammer.x-7,scene.hammer.y,11,2,'#6b5236');r(scene.hammer.x+3,scene.hammer.y-2,5,6,'#8d9892');r(scene.hammer.x+3,scene.hammer.y-2,5,1,'#c2c5b0');}
 const list=[b,...(a.hidden?[]:[a])].sort((p,q)=>p.y-q.y);M.renderForgeActors(g,list);M.renderForgeEffects(g,scene.limbs,scene.fx);
 const k=.6*1.14*a.g.height/180,face=Math.cos(a.a)>=0?1:-1,flask=(x,y)=>{r(x-1,y-4,3,7,'#4f7a52');r(x,y-6,1,3,'#3b5c40');r(x-1,y-4,1,5,'#8fb58c');};
 if(!a.hidden&&t<21)a.mercyTimer>0?flask(a.x+face*7,a.y-58*k+4):flask(a.x+face*22*k,a.y-36*k);
 if(scene.bottle){const p=(t-scene.bottle.t0)/.5;flask(lerp(a.x-14,694,p),lerp(a.y-24,266,p)-Math.sin(Math.min(1,p)*Math.PI)*16);}
 g.restore();
 if(between(t,22.6,26.2))bubble(g,scene.bark,a.x,a.y-54);
 const shout=between(t,BAM,BAM+.9)?'BÄM!':between(t,21.5,22.2)?'KLIRR':'';if(shout){g.font='bold '+(shout==='BÄM!'?54:30)+'px monospace';g.textAlign='center';g.textBaseline='middle';const x=shout==='BÄM!'?338:190,y=shout==='BÄM!'?120:300;g.fillStyle='#17201c';g.fillText(shout,x+3,y+3);g.fillStyle=shout==='BÄM!'?'#f4d37a':'#c5e2c0';g.fillText(shout,x,y);}}
function stepScene(step){scene.t+=step;const t=scene.t;pose(t);for(const p of scene.limbs){const age=t-p.t0;p.x+=step*(age<1.2?16:0);p.z=Math.max(0,55-age*46);p.angle+=p.z?step*5:0;}for(const p of scene.fx){p.x+=p.vx*step;p.y+=p.vy*step;p.vz-=180*step;p.z=Math.max(0,p.z+p.vz*step);p.life-=step;}scene.fx=scene.fx.filter(p=>p.life>0);paint();let line='';for(const [at,text]of story)if(t>=at)line=text;const el=$('smithIntroText'),shown=named(line);if(el&&el.textContent!==shown)el.textContent=shown;if(t>=END)endScene();}
function endScene(){if(!scene)return;body={boy:scene.boy};scene.view?.remove?.();scene=null;lesson=0;W.setIntro('tutorial');M.ui.close();M.ui.click('nav:forge');}
// ---------- 13 · Tutorial im Schmiedemenü; der Tote liegt noch vor der Schmiede ----------
function corpse(){if(!body){const helper=W.sketch();helper.id='smith-intro-apprentice';body={boy:figure(helper,true)};}const b=body.boy;b.g.body.head.missing=true;b.g.dead=true;Object.assign(b,{x:826,y:262,a:Math.PI,down:true,fallSide:1,state:'idle',moveSpeed:0,phase:0});return b;}
const actors=M.renderForgeActors;M.renderForgeActors=(ctx,list)=>{actors(ctx,list);if(stage()!=='tutorial'||scene||list.some(p=>p.apprentice&&p.g.dead)||!list.some(p=>p.forgeWorker&&!p.apprentice&&p.id===F.master?.id))return;const b=corpse();actors(ctx,[b]);M.renderForgeEffects(ctx,[{x:848,y:263,z:0,angle:.4,part:'head',skin:b.g.appearance.skin,hair:b.g.appearance.hair,g:b.g}],[]);};
function tutorialBar(){const last=lesson>=lessons.length-1;showBar(`<p>${esc(named(lessons[Math.min(lesson,lessons.length-1)]))}</p><div class="buttons"><button class="btn primary" data-action="smithintro:next">${last?'VERSTANDEN':'WEITER →'}</button></div>`);}
function next(){if(lesson>=lessons.length-1){W.setIntro('done');body=null;hideBar();M.ui.render();return;}lesson++;if(lesson===lessons.length-1)$('smithScene')?.scrollIntoView?.({block:'center'});tutorialBar();}
// ---------- Ablaufsteuerung ----------
const highlight=M.renderLudusActors;M.renderLudusActors=(ctx,list)=>{highlight(ctx,list);if(ctx.canvas?.id!=='ludusCanvas'||stage()!=='pending'||wait<2.4)return;const p=M.ludus.places.find(p=>p.route==='forge');if(!p)return;const pulse=(Math.sin(wait*5)+1)/2;ctx.save();ctx.strokeStyle='#f4d37a';ctx.globalAlpha=.55+pulse*.45;ctx.lineWidth=3+pulse*2;ctx.strokeRect(p.x-6-pulse*3,p.y-8-pulse*3,p.w+12+pulse*6,p.h+16+pulse*6);ctx.fillStyle='#f4d37a';for(let n=0;n<3;n++)ctx.fillRect(p.x+p.w/2-7+n*2,p.y-30-pulse*6+n*4,14-n*4,4);ctx.restore();};
const click=M.schoolClick;M.schoolClick=action=>{if(action.startsWith('smithintro:')){const key=action.split(':')[1];if(key==='skip'){W.setIntro('done');hideBar();M.ui.close();}else if(key==='look'){const name=$('smithIntroName')?.value??draft?.name??'';draft={...W.sketch(),name};preview=null;openCreator();}else if(key==='name'){draft??=W.sketch();draft.name=W.randomName();const field=$('smithIntroName');if(field)field.value=draft.name;}else if(key==='confirm')confirm();else if(key==='skipscene')endScene();else if(key==='next')next();return true;}
 if(stage()==='pending'&&!S.battle&&!M.intro?.active?.()){if(action==='nav:forge'){openCreator();return true;}if((action.startsWith('nav:')&&action!=='nav:home')||action.startsWith('detail:')||action==='ludus:owner'){M.ui.notify('Klicke zuerst auf die Schmiede.');return true;}}
 return click(action);};
const tick=M.ludusTick;M.ludusTick=dt=>{tick?.(dt);if(document.hidden)return;const step=Math.min(dt,.1),playing=!!M.intro?.active?.();if(wasIntro&&!playing&&S.lanista?.veteran&&!F.master&&!F.intro)W.setIntro('pending');wasIntro=playing;if(playing||S.battle){hideBar();return;}
 const now=stage();
 if(now==='pending'){if(F.master){W.setIntro('scene');return;}wait+=step;showBar(`<p>Heute lernen wir unseren Schmied kennen.</p>${wait>=2.4?'<p class="hint">Klicke auf die Schmiede.</p>':''}<div class="buttons"><button class="btn" data-action="smithintro:skip">Überspringen</button></div>`);if(wait>=2.4&&!bar._scrolled){bar._scrolled=true;const box=$('ludusCanvas')?.closest?.('.ludus-scroll');if(box)box.scrollLeft=box.scrollWidth;}}
 else if(now==='scene'){if(!F.master){W.setIntro('done');return;}if(!scene)startScene();paintClock+=dt;if(paintClock>=1/30){const s=Math.min(paintClock,.1);paintClock=0;stepScene(s);}}
 else if(now==='tutorial'){if(!F.master){W.setIntro('done');hideBar();return;}tutorialBar();}
 else if(bar)hideBar();};
M.forgeIntro={stage,get scene(){return scene;},skipScene:endScene,next,open:openCreator};
})();
