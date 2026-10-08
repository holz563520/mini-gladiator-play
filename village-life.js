'use strict';
// Cosmetic village theatre. All state belongs to render actors, never to the career save.
(()=>{
const M=window.MG,S=M.s;
const road=[{x:330,y:218},{x:445,y:218},{x:575,y:218},{x:610,y:263},{x:610,y:350},{x:610,y:440},{x:610,y:525},{x:610,y:606},{x:450,y:607},{x:315,y:607},{x:300,y:520},{x:300,y:430},{x:300,y:350},{x:300,y:275},{x:300,y:218}];
const exchanges=[
 ['Der Medicus sagt, ich werde alt.','Dann kennt er unseren Spielplan nicht.'],
 ['Ich spare fürs Alter.','Optimist. Ich spare für einen Deckel.'],
 ['Was gibt es heute zu essen?','Dasselbe wie gestern. Es hat nur einen neuen Namen.'],
 ['Mein Schwert hat jetzt einen Namen.','Meins auch: Nachlass.'],
 ['Der Trainer sagt, ich habe Potenzial.','Der Totengräber nennt das Stammkundschaft.'],
 ['Ich habe vom Ruhestand geträumt.','Mit oder ohne Puls?'],
 ['Der neue Helm sitzt perfekt.','Gut. Dann finden sie wenigstens alles zusammen.'],
 ['Ich will Spuren hinterlassen.','Auf dem Arenaboden reicht denen schon.'],
 ['Heute fühle ich mich unbesiegbar.','Sag das leise. Sonst erhöhen sie die Quote.'],
 ['Der Schmied sagt, seine Arbeit hält ewig.','Leicht gesagt. Seine Kunden reklamieren selten.'],
 ['Du siehst ausgeschlafen aus.','Probegelegen. Der Sarg war bequem.'],
 ['Ich brauche dringend Urlaub.','Der Medicus nennt das Bettruhe. Kostet extra.'],
 ['Glaubst du an ein Leben danach?','Ich wäre schon mit einem freien Nachmittag zufrieden.'],
 ['Mein Gegner hat Angst vor mir.','Er hat deine Suppe probiert.'],
 ['Ich habe eine neue Kampftechnik.','Weglaufen zählt nur mit Stil.'],
 ['Der Lanista glaubt an mich.','Er glaubt an seine Investition.'],
 ['Ich habe heute Glück gehabt.','Du stehst noch. Hier gilt das als Luxus.'],
 ['Was schreibst du da?','Mein Testament. Die Rechtschreibung überlebt mich.'],
 ['Der Medicus hat gute Nachrichten.','Dann betrifft es seine Rechnung.'],
 ['Ich bin unersetzlich.','Der Händler bringt jeden Tag fünf Gegenargumente.'],
 ['Morgen wird alles besser.','Für wen genau?'],
 ['Mein Schild ist frisch poliert.','Dann sieht der Gegner sein Werk besser.'],
 ['Der Trainer will mehr Einsatz.','Sag ihm, deine Zähne waren schon eine Anzahlung.'],
 ['Ich möchte in die Geschichte eingehen.','Versuch erst mal, aus der Arena rauszukommen.'],
 ['Warum grinst du so?','Noch alle Zähne da. Muss man ausnutzen.'],
 ['Die Rüstung ist gebraucht.','Der Vorbesitzer hat sie nur einmal getragen.'],
 ['Ich habe keine Angst vor dem Tod.','Gut. Vor dem Frühstück wäre vernünftiger.'],
 ['Der Schmied wirkt heute entspannt.','Dann schau nach, wer fehlt.'],
 ['Wir sind hier wie eine Familie.','Mit erstaunlich vielen Erbfällen.'],
 ['Ich habe meinen letzten Willen geändert.','Wieder: mehr Salz in die Suppe?']
];
const sniffLines=['Der Hund prüft wohl meine Herkunft.','Das ist kein Bewerbungsgespräch, Köter.','Hinten gibt es auch nichts zu holen.','Der einzige Späher, der hier gründlich arbeitet.'];
const sickLines=['Selbst der Hund hat Ansprüche.','Das war die ehrlichste Bewertung heute.','Der Medicus nennt das ein Gutachten.'];
let clock=0,people=[],roster=null,motions=new Map(),chat=null,speech=null,lastSpeech='',bag=[],lastPair=-1,nextChat=7,active=false;
const dog={x:300,y:218,a:0,phase:0,state:'walk',left:3,node:14,route:[],target:null,nextSick:150,stains:[],events:{sniff:0,pee:0,vomit:0}};
const rnd=(lo,hi)=>lo+Math.random()*(hi-lo),pick=a=>a[Math.floor(Math.random()*a.length)],distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),eligible=a=>!a.hurt&&!a.archer&&!a.training&&!a.lanista&&!a.g.dead&&!a.g.retired&&!a.g.smithDuty;
const busy=()=>S.battle||M.intro?.active?.()||window.ArenaTheoryIntro?.active?.()||M.forgeIntro?.scene||M.forgeVisuals?.scene||M.trader?.tutorial||['pending','scene','tutorial'].includes(M.forgeIntro?.stage?.())||!!M.workshop?.state.apprentice?.phase;
const nearest=p=>road.reduce((best,n,i)=>distance(p,n)<distance(p,road[best])?i:best,0);
function path(from,to){const out=[],n=road.length,forward=(to-from+n)%n,dir=forward<=n-forward?1:-1;let i=from;while(i!==to){i=(i+dir+n)%n;out.push({...road[i],node:i});}return out;}
function move(a,p,dt,speed){const dx=p.x-a.x,dy=p.y-a.y,d=Math.hypot(dx,dy),step=Math.min(d,speed*dt);a.moveSpeed=d>.5?speed:0;a.state=a.moveSpeed?'move':'idle';if(d>.5){a.x+=dx/d*step;a.y+=dy/d*step;if(Math.abs(dx)>.2)a.a=dx>0?0:Math.PI;a.phase=(a.phase||0)+step*.16;}return d<=speed*dt+.5;}
function stand(a){a.villageTalk=false;a.moveSpeed=0;a.state='idle';a.wind=0;a.swing=0;}
function say(a,text,seconds=4){speech={a,text,until:clock+seconds};}
function cancel(){chat=null;speech=null;dog.target=null;dog.state='idle';dog.left=2;for(const a of people)if(motions.has(a))stand(a);active=false;caption('');}
function reset(list){cancel();people=list;roster=S.roster;motions=new Map();let n=0;for(const a of list){if(!eligible(a))continue;const node=(n*3)%road.length;a.x=road[node].x;a.y=road[node].y;motions.set(a,{node,previous:-1,to:null,pause:rnd(.3,2.5),speed:18+(a.index%5)*2.5});n++;}nextChat=clock+5;dog.x=300;dog.y=218;dog.node=14;dog.route=[];dog.state='idle';dog.left=3;dog.stains=[];}
function caption(text){const el=document.getElementById('villageChatter');const shown=text||'Im Hof: Schritte, Stahl und zweifelhafte Lebensweisheiten.';if(el&&el.textContent!==shown)el.textContent=shown;lastSpeech=text;}
function talk(dt){if(chat){const [a,b]=chat.pair;if(!motions.has(a)||!motions.has(b)){chat=null;return;}stand(a);stand(b);a.a=Math.atan2(b.y-a.y,b.x-a.x);b.a=a.a+Math.PI;a.phase+=dt*3;b.phase+=dt*2;a.villageTalk=!chat.replied;b.villageTalk=chat.replied;chat.t+=dt;if(chat.t>=4.2&&!chat.replied){chat.replied=true;say(b,chat.lines[1],4.2);}if(chat.t>=8.6){chat=null;nextChat=clock+rnd(9,17);}return;}
 if(clock<nextChat||speech)return;nextChat=clock+4;const free=[...motions.keys()].filter(a=>a!==dog.target),pairs=[];for(let i=0;i<free.length;i++)for(let j=i+1;j<free.length;j++){const d=distance(free[i],free[j]);if(d>15&&d<85)pairs.push([free[i],free[j]]);}if(!pairs.length)return;
 if(!bag.length){bag=exchanges.map((_,i)=>i);for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag.at(-1)===lastPair)bag.reverse();}lastPair=bag.pop();chat={pair:pick(pairs),lines:exchanges[lastPair],t:0,replied:false};say(chat.pair[0],chat.lines[0],4.2);
}
function pedestrians(dt){for(const [a,m]of motions){if(!eligible(a))continue;if(chat?.pair.includes(a)||dog.target===a){stand(a);continue;}
 if(m.pause>0){m.pause-=dt;stand(a);a.phase+=dt*.7;continue;}if(m.to===null){const adjacent=[(m.node+1)%road.length,(m.node+road.length-1)%road.length],choices=adjacent.filter(i=>i!==m.previous);m.to=pick(choices.length?choices:adjacent);}
 const lane=(m.to===(m.node+1)%road.length?1:-1)*4,goal={x:road[m.to].x+lane,y:road[m.to].y+lane},dx=goal.x-a.x,dy=goal.y-a.y;
 const ahead=[...motions.keys()].some(b=>b!==a&&distance(a,b)<16&&(b.x-a.x)*dx+(b.y-a.y)*dy>0&&Math.cos((a.a||0)-(b.a||0))>.5);
 if(ahead){stand(a);continue;}if(move(a,goal,dt,m.speed)){m.previous=m.node;m.node=m.to;m.to=null;m.pause=rnd(1.4,5);a.x=goal.x;a.y=goal.y;}}
}
function dogGoal(node){dog.route=[{...road[nearest(dog)]},...path(nearest(dog),node)];dog.node=node;dog.state='walk';}
function dogUpdate(dt){dog.phase+=dt*(dog.state==='walk'||dog.state==='approach'?8:2);dog.stains=dog.stains.filter(s=>(s.life-=dt)>0);
 if(dog.state==='walk'){const p=dog.route[0];if(p){const dx=p.x-dog.x,dy=p.y-dog.y,d=Math.hypot(dx,dy),step=Math.min(d,36*dt);if(d>.1){dog.x+=dx/d*step;dog.y+=dy/d*step;if(Math.abs(dx)>.2)dog.a=dx>0?0:Math.PI;}if(d<36*dt+.4)dog.route.shift();return;}
 dog.state=dog.target?'approach':'idle';dog.left=rnd(2,4);return;}
 if(dog.state==='approach'){const a=dog.target;if(!a||!motions.has(a)){dog.target=null;dog.state='idle';return;}const face=Math.cos(a.a)>=0?1:-1,p={x:a.x-face*27,y:a.y-4},dx=p.x-dog.x,dy=p.y-dog.y,d=Math.hypot(dx,dy),step=Math.min(d,30*dt);if(d>.1){dog.x+=dx/d*step;dog.y+=dy/d*step;}dog.a=face>0?0:Math.PI;if(d<1){dog.state='sniff';dog.left=3.2;dog.events.sniff++;if(!chat&&!speech)say(a,pick(sniffLines),3.2);}return;}
 dog.left-=dt;if(dog.left>0)return;
 if(dog.state==='sniff'){const target=dog.target;dog.target=null;if(clock>dog.nextSick&&Math.random()<.12){dog.state='vomit';dog.left=2.4;dog.events.vomit++;dog.nextSick=clock+180;dog.stains.push({x:dog.x+Math.cos(dog.a)*16,y:dog.y,color:'#8d8a49',life:12});if(!chat&&!speech&&target)say(target,pick(sickLines),4);return;}dog.state='idle';dog.left=3;return;}
 if(dog.state==='pee'||dog.state==='vomit'){dog.state='idle';dog.left=rnd(3,6);return;}
 if(Math.random()<.22){dog.state='pee';dog.left=2.8;dog.events.pee++;dog.stains.push({x:dog.x-10*Math.cos(dog.a),y:dog.y+3,color:'#ac974d',life:9});dog.stains=dog.stains.slice(-3);return;}
 const candidates=[...motions.keys()].filter(a=>!chat?.pair.includes(a)&&distance(a,dog)<200);
 if(candidates.length&&Math.random()<.48){dog.target=pick(candidates);dogGoal(nearest(dog.target));return;}dog.target=null;dogGoal((nearest(dog)+(Math.random()<.5?1:road.length-1))%road.length);
}
function update(list,dt){dt=Math.max(0,Math.min(.1,dt));if(people!==list||roster!==S.roster)reset(list);if(document.hidden||M.ui.getPage()!=='home'||busy()){cancel();return;}active=true;clock+=dt;
 for(const a of [...motions.keys()])if(!eligible(a))motions.delete(a);
 pedestrians(dt);talk(dt);dogUpdate(dt);
 if(speech&&clock>=speech.until)speech=null;caption(speech?`${speech.a.g.name}: „${speech.text}“`:'');
}
function drawDog(ctx){const facing=Math.cos(dog.a)>=0?1:-1,walk=dog.state==='walk'||dog.state==='approach',sniff=dog.state==='sniff',sick=dog.state==='vomit',pee=dog.state==='pee',step=walk?Math.sin(dog.phase)*3:0;
 ctx.save();for(const s of dog.stains){ctx.globalAlpha=Math.min(.45,s.life/12);ctx.fillStyle=s.color;ctx.fillRect(s.x-5,s.y,10,2);}ctx.globalAlpha=1;ctx.translate(Math.round(dog.x),Math.round(dog.y));ctx.scale(facing,1);
 const r=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};r(-14,0,30,3,'#26332d55');
 for(const [x,phase]of [[-9,1],[8,-1]]){r(x+step*phase,-8,3,9,'#594432');if(!(pee&&x<0))r(x-2-step*phase,-7,3,8,'#8d6745');}if(pee){r(-12,-10,7,3,'#a17d51');for(let n=0;n<4;n++)r(-15-n*2,-7+n*2+Math.sin(dog.phase*3+n),2,1,'#dcc365');}
 r(-13,-17,24,11,'#483c2e');r(-12,-17,22,8,'#97744d');r(-9,-17,9,4,'#584536');r(-9,-8,16,3,'#b08f63');
 const headY=sick?-10:sniff?-18:-21,headX=sniff?13:11;r(headX-3,headY,10,10,'#ae8758');r(headX+5,headY+5,7,4,'#c3a476');r(headX+10,headY+5,3,3,'#30382d');r(headX+3,headY+3,2,2,'#202822');r(headX-3,headY,3,8,'#503c2e');r(headX+5,headY+9,4,2,'#b87b68');
 r(-17,-19+Math.sin(dog.phase)*2,3,9,'#715039');r(-20,-23+Math.sin(dog.phase)*2,4,5,'#aa8558');
 if(sniff){r(26,-14+Math.sin(dog.phase*4),2,1,'#b8b5a1');}if(sick){for(let n=0;n<5;n++)r(22+n,-2-(4-n)*Math.abs(Math.sin(dog.phase*4)),2,2,'#a49b53');}ctx.restore();
}
function bubble(ctx){if(!speech)return;const a=speech.a;ctx.save();ctx.font='bold 13px monospace';const words=speech.text.split(' '),lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>210&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);const w=Math.min(232,Math.max(...lines.map(x=>ctx.measureText(x).width))+18),h=lines.length*16+12,x=Math.max(8,Math.min(892-w,a.x-w/2)),y=Math.max(7,a.y-62-h);ctx.fillStyle='#182720f2';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#bca77b';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);ctx.fillStyle='#182720';ctx.fillRect(Math.max(x+4,Math.min(x+w-8,a.x)),y+h-1,6,5);ctx.fillStyle='#f0e3c4';lines.forEach((line,i)=>ctx.fillText(line,x+9,y+19+i*16));ctx.restore();}
function draw(ctx){if(!active)return;drawDog(ctx);bubble(ctx);}
const click=M.schoolClick;M.schoolClick=action=>{if(action.startsWith('nav:')&&action!=='nav:home'||action.startsWith('profile:'))cancel();return click(action);};
M.villageLife={update,draw,cancel,owns:a=>active&&motions.has(a),extraActors:()=>[],get state(){return {clock,active,dog,chat,speech,walkers:[...motions.keys()]};}};
})();
