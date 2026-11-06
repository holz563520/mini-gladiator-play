'use strict';
(()=>{const M=window.MG,S=M.s,$=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const places=[
 {name:'Kaserne',sub:'Gladiatoren',route:'gladiators',x:45,y:50,w:235,h:133},
 {name:'Trainingshof',sub:'Kampflernen',route:'training',x:310,y:247,w:275,h:343},
 {name:'Schmiede',sub:'Waffen & Handwerk',route:'forge',x:638,y:86,w:215,h:150},
 {name:'Medicus',sub:'Krankenhaus',route:'medic',x:34,y:447,w:250,h:163},
 {name:'Truppenplatz',sub:'Gruppen & Aufstellung',route:'team',x:638,y:433,w:215,h:157},
 {name:'Sklavenmarkt',sub:'Tägliche Ware',route:'market',x:45,y:280,w:230,h:118},
 {name:'Arena-Tor',sub:'Schulen herausfordern',route:'arena',x:351,y:51,w:226,h:120},
 {name:'Hall of the Fallen',sub:'Halle der Gefallenen',route:'fallen',x:50,y:206,w:112,h:70}
];
const range=[{x:549,y:546},{x:531,y:578}];let arrows=[],stuck=[[],[]];
let canvas=null,bg=null,bgName=null,actors=[],elapsed=0,paintTime=0,observer=null,onScreen=true,draft=null,ownerAvatar=null;
const random=(lo,hi)=>lo+Math.random()*(hi-lo),pick=a=>a[Math.floor(Math.random()*a.length)];
function randomOwner(){const skin=pick(M.skinPalette);return {name:'',height:Math.round(random(165,195)),weight:Math.round(random(65,100)),appearance:{skin:skin[0],shade:skin[1],hair:pick(M.hairPalette),style:Math.floor(random(0,4)),beard:Math.floor(random(0,4)),cloth:pick(['#824b4a','#77744b','#435e6a','#685375']),voice:1}};}
function ownerFigure(owner){if(ownerAvatar?.owner===owner)return ownerAvatar.g;const rng=S.rng,g=M.makeGladiator(0);S.rng=rng;g.armStrength=80;g.name=owner.name;g.height=owner.height;g.weight=owner.weight;g.age=40;g.fame=0;g.scars=[];g.appearance={...g.appearance,...owner.appearance};g.equipment={weapon:null,secondary:null,shield:null,armor:{}};g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};if(owner.lostArm){for(const k of M.branches[owner.lostArm+'ua']){g.body[k].missing=true;g.body[k].hp=0;}g.stump='bandage';}if(owner.veteran)g.fame=M.mantles[37].fame;ownerAvatar={owner,g};return g;}
function isNew(){return !S.lanista&&!S.started&&S.day===1&&!S.roster.length&&!S.wins&&!S.losses;}
function setup(){draft??=randomOwner();return `<section class="box lanista-setup"><div><p class="eyebrow">DEINE GLADIATORENSCHULE</p><h1>Dein Lanista</h1><p>Gib dem Besitzer deines Ludus einen Namen.</p><label for="lanistaName">Name<input id="lanistaName" class="select" maxlength="32" value="${esc(draft.name)}" placeholder="Zum Beispiel Marcus"></label><div class="buttons"><button class="btn" data-action="ludus:reroll">Aussehen neu würfeln</button><button class="btn primary" data-action="ludus:start">Spiel starten</button></div></div><canvas id="lanistaPreview" width="180" height="190" aria-label="Dein Ludusbesitzer"></canvas></section>`;}
function scene(){return `<section class="box ludus-panel"><div class="ludus-title"><div><p class="eyebrow">${esc(S.schoolName)}</p><h1>Dein Ludus</h1><p>Gebäude öffnen die Verwaltung. Figuren öffnen ihr Profil.</p></div><div class="buttons"><button class="btn" data-action="ludus:bench">Benchmark</button><button class="btn" data-action="ludus:owner">${S.lanista?esc(S.lanista.name)+' · Lanista':'Lanista gestalten'}</button></div></div><div class="ludus-view"><div class="ludus-scroll" id="ludusScroll"><canvas id="ludusCanvas" width="900" height="760" aria-label="Ludus mit sieben anklickbaren Gebäuden und Gladiatoren. Ziehen verschiebt, zwei Finger oder Mausrad zoomen."></canvas></div><div class="ludus-zoom" role="group" aria-label="Zoom"><button class="btn" data-action="ludus:zoom:in" aria-label="Hineinzoomen">+</button><button class="btn" data-action="ludus:zoom:out" aria-label="Herauszoomen">−</button><button class="btn" data-action="ludus:zoom:fit" aria-label="Ganzen Ludus zeigen">⤢</button></div></div><p id="villageChatter" class="village-chatter" role="status" aria-live="polite">Im Hof: Schritte, Stahl und zweifelhafte Lebensweisheiten.</p></section>`;}
const oldPage=M.schoolPage;M.schoolPage=p=>{if(p==='profiles'&&isNew())return setup()+`<section class="box"><h2>Benchmark · Testschlachten</h2><p class="tiny">Ohne Spielstand ausprobieren: 1 gegen 1 bis 100 gegen 100, zufällig aufgestellte Durchschnittskämpfer, Ausrüstungsqualität wählbar. Nichts davon verändert einen Spielstand.</p><div class="buttons"><button class="btn primary" data-action="ludus:bench">BENCHMARK ÖFFNEN</button></div></section>`+(M.ui.profileList?.(true)||'');const previous=oldPage(p);return p==='home'?scene()+(previous||''):previous;};
const oldClick=M.schoolClick;M.schoolClick=action=>{if(!action.startsWith('ludus:'))return oldClick(action);const key=action.split(':')[1];if(key==='bench'){M.ui.click('nav:benchmark');return true;}if(key==='zoom'){const k=action.split(':')[2],z=Z.level??1;applyZoom(k==='in'?z*1.4:k==='out'?z/1.4:1);return true;}if(key==='owner'){draft=S.lanista?JSON.parse(JSON.stringify(S.lanista)):randomOwner();M.ui.modal('Dein Lanista',setup());M.paintLudus();return true;}if(key==='reroll'){const name=$('lanistaName')?.value||draft?.name||'';const prior=draft;draft=randomOwner();draft.name=name;if(prior?.lostArm){draft.lostArm=prior.lostArm;draft.veteran=prior.veteran;}ownerAvatar=null;if(M.ui.getPage()==='profiles'&&isNew())M.ui.render();else{M.ui.modal('Dein Lanista',setup());M.paintLudus();}return true;}if(key==='start'){const name=$('lanistaName')?.value.trim().slice(0,32);if(!name){M.ui.notify('Bitte einen Namen eingeben.');$('lanistaName')?.focus();return true;}draft??=randomOwner();draft.name=name;if(M.intro&&isNew()&&M.ui.getPage()==='profiles'){M.intro.start(JSON.parse(JSON.stringify(draft)));return true;}S.lanista=JSON.parse(JSON.stringify(draft));ownerAvatar=null;M.persist();M.ui.close();M.ui.click('nav:home');return true;}return true;};
// Schultor in der Südmauer am Ende des rechten Weges; closed 0..1 legt die Torflügel über die Öffnung.
function drawGate(g,closed=0){const r=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};r(595,619,30,11,'#baa474');r(590,629,40,21,'#a38b61');r(592,630,36,3,'#8f7a55');r(585,622,6,29,'#5a6253');r(629,622,6,29,'#5a6253');r(584,619,8,4,'#9b9b7e');r(628,619,8,4,'#9b9b7e');const leaf=Math.round(19*closed);if(leaf>0){for(const [x,dir]of [[591,1],[629,-1]]){const x0=dir>0?x:x-leaf;r(x0,627,leaf,23,'#6b5236');for(let n=2;n<leaf;n+=5)r(x0+n,628,1,21,'#4f3c29');r(x0,632,leaf,2,'#8d9275');r(x0,643,leaf,2,'#8d9275');}}else{r(591,612,3,18,'#6b5236');r(626,612,3,18,'#6b5236');r(591,612,3,2,'#8d9275');r(626,612,3,2,'#8d9275');}}
function background(){const c=document.createElement('canvas');c.width=900;c.height=670;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
// Statische Kulisse: wird einmal gezeichnet und danach nur noch als Bild kopiert. Wege, Türen und der Trainingshof bleiben frei.
const rect=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));},line=(x,y,xx,yy,color,width=2)=>{g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.stroke();},poly=(pts,color)=>{g.fillStyle=color;g.beginPath();g.moveTo(...pts[0]);for(const p of pts.slice(1))g.lineTo(...p);g.closePath();g.fill();},oval=(x,y,rx,ry,color)=>{g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();},label=(text,x,y,size=16)=>{g.font=`bold ${size}px 'Courier Prime',monospace`;g.textAlign='center';g.fillStyle='#efe0b3';g.fillText(text,x,y);};
const rnd=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);},soft=(a,fn)=>{g.globalAlpha=a;fn();g.globalAlpha=1;};
// ---- Umland und Hofboden
rect(0,0,900,670,'#2c352e');for(let n=0;n<110;n++){const edge=n%4,t=rnd(n),x=edge<2?t*900:edge===2?rnd(n+9)*13:887+rnd(n+9)*12,y=edge===0?rnd(n+5)*14:edge===1?652+rnd(n+5)*16:t*670;rect(x,y,3+rnd(n+3)*5,2+rnd(n+7)*3,n%3?'#3d4b3a':'#465a40');}
rect(22,28,856,613,'#a68e63');
soft(.11,()=>{for(let n=0;n<110;n++)rect(30+rnd(n)*810,36+rnd(n+200)*580,14+rnd(n+400)*36,5+rnd(n+600)*11,n%2?'#c9ae7b':'#7b6947');});
for(let n=0;n<900;n++)rect(28+(n*137)%840,33+(n*193)%600,2+n%3,1,n%2?'#b89d6e':'#927e59');
for(let n=0;n<130;n++){const x=30+rnd(n+50)*838,y=36+rnd(n+90)*596;rect(x,y,2,2,'#8a7f61');rect(x,y,1,1,'#cdbf99');}
const tuft=(x,y,dry)=>{rect(x,y-3,1,4,dry?'#8f8a52':'#5f7a48');rect(x+2,y-5,1,6,dry?'#a39b5d':'#6f8b52');rect(x+4,y-2,1,3,dry?'#8f8a52':'#56704a');};
// ---- Mauer mit Zinnen, Ecktürmen und Schattenwurf
for(const y of [22,630]){rect(14,y,872,19,'#5a6253');for(let x=15;x<885;x+=30){rect(x,y+2,27,7,'#9b9b7e');rect(x,y+2,27,1,'#b4b498');rect(x+8,y+10,26,6,'#797e67');rect(x+8,y+15,26,1,'#636853');}}
for(let x=18;x<880;x+=22){rect(x,16,13,7,'#8d9275');rect(x,16,13,1,'#b4b498');rect(x,22,13,1,'#5a6253');}
for(const x of [15,866]){rect(x,28,18,601,'#596350');for(let y=32;y<629;y+=20){rect(x+2,y,14,17,'#8d9275');rect(x+2,y,14,1,'#a9ad8f');}}
soft(.2,()=>{rect(33,41,833,6,'#2b2a20');rect(33,47,6,583,'#2b2a20');});
for(const [x,y]of [[6,10],[862,10],[6,626],[862,626]]){rect(x,y,32,32,'#4e5647');rect(x+2,y+2,28,28,'#8d9275');rect(x+2,y+2,28,2,'#b4b498');rect(x+7,y+7,18,18,'#6b725f');rect(x+10,y+10,12,12,'#555c4d');for(const [dx,dy]of [[0,0],[24,0],[0,24],[24,24],[12,0],[12,24],[0,12],[24,12]])rect(x+dx,y+dy,8,8,(dx+dy)%24?'#7d826b':'#a5a88c');}
for(let n=0;n<46;n++){const side=n%4,t=rnd(n+700);if(side===0)tuft(40+t*810,47+rnd(n)*4,n%3===0);else if(side===1)tuft(40+t*810,628,n%2===0);else if(side===2)tuft(40+rnd(n)*3,60+t*560,n%2===0);else tuft(858,60+t*560,n%3===0);}
// ---- Gepflasterte Wege und ausgetretene Pfade zu den Türen
const pave=(x,y,w,h)=>{g.save();g.beginPath();g.rect(x,y,w,h);g.clip();rect(x,y,w,h,'#a39068');const tones=['#c9b586','#c2ad7c','#bba673','#d2bf92','#b7a26f'];for(let row=0,yy=y;yy<y+h;yy+=9,row++)for(let xx=x-(row%2?8:0),k=0;xx<x+w;xx+=16,k++){const t=rnd(row*31+k*17+x+y);rect(xx+1,yy+1,14,7,tones[Math.floor(t*tones.length)]);if(t>.82)rect(xx+3,yy+3,5,1,'#e0d1a8');if(t<.1)rect(xx+8,yy+4,4,2,'#9a8760');}g.restore();};
const trail=pts=>soft(.5,()=>poly(pts,'#bda678'));
trail([[150,205],[182,205],[292,198],[292,224],[176,226]]);trail([[275,322],[288,318],[288,352],[275,350]]);trail([[232,593],[268,593],[284,598],[284,616],[236,606]]);trail([[730,236],[766,236],[758,250],[626,232],[626,208],[722,240]]);trail([[730,590],[766,590],[760,600],[626,560],[626,536],[726,596]]);
pave(290,175,325,52);pave(286,202,29,396);pave(595,198,30,400);pave(280,594,360,25);
for(const [x,y,w,h]of [[290,175,325,1],[290,226,325,1],[286,227,1,367],[314,227,1,367],[595,227,1,367],[624,227,1,367],[280,594,360,1],[280,618,360,1]])rect(x,y,w,h,'#8a7852');
// ---- Gebäude
const tint=(hex,k)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*k))).toString(16).padStart(2,'0')).join('');
function house(p,roof='#8c5944',o={}){const {x,y,w,h}=p,dx=Math.round(x+w*(o.door??.43)),wins=o.windows??[x+23,x+w-48];
 soft(.3,()=>rect(x+10,y+h-13,w,24,'#2f2a1f'));rect(x,y+28,w,h-28,'#706e56');rect(x+7,y+34,w-14,h-41,'#b4a584');
 for(let row=y+40;row<y+h-8;row+=16)for(let col=x+12+(Math.floor(row/16)%2)*13;col<x+w-12;col+=29){line(col,row,col+23,row,'#8a8268',1);if(rnd(row+col)>.7)rect(col+4,row+3,9,5,'#bfb190');}
 rect(x+7,y+h-14,w-14,7,'#8f8a6e');for(let col=x+9;col<x+w-12;col+=18)rect(col,y+h-13,15,5,'#a09a7c');
 for(const qx of [x+7,x+w-13])for(let row=y+36;row<y+h-16;row+=12)rect(qx,row,6,9,'#c7ba98');
 soft(.25,()=>rect(x+7,y+34,w-14,5,'#2f2a1f'));
 poly([[x-8,y+35],[x+15,y],[x+w-13,y],[x+w+8,y+35]],roof);const hi=tint(roof,1.22),lo=tint(roof,.72);
 for(let yy=4;yy<35;yy+=5){const inset=15-yy*23/35;line(x+inset-2,y+yy,x+w-13+(23*yy/35)+3,y+yy,yy%10?lo:hi,1);for(let xx=x+inset+(yy%10?3:8);xx<x+w-10+23*yy/35;xx+=11)rect(xx,y+yy-4,1,4,lo);}
 rect(x+15,y,w-28,2,hi);line(x-8,y+35,x+w+8,y+35,tint(roof,.55),2);
 if(o.chimney){const cx=x+o.chimney;rect(cx,y-22,16,30,'#6b6f5e');rect(cx-2,y-25,20,5,'#9b9b7e');rect(cx+2,y-18,12,2,'#585c4d');}
 rect(dx-2,y+h-57,40,4,'#a8a88c');rect(dx,y+h-53,36,53,'#373b30');rect(dx+3,y+h-49,29,48,'#514636');for(let xx=0;xx<3;xx++)rect(dx+6+xx*8,y+h-46,3,42,'#71583b');rect(dx+3,y+h-34,29,2,'#3a3024');rect(dx+3,y+h-14,29,2,'#3a3024');rect(dx+27,y+h-27,2,3,'#c9b071');
 rect(dx-5,y+h,46,4,'#c9bd9b');rect(dx-5,y+h+3,46,1,'#8f8463');
 if(o.lantern!==false){rect(dx-11,y+h-47,2,7,'#4a4032');rect(dx-13,y+h-41,6,7,'#3b3a2c');rect(dx-12,y+h-40,4,5,'#e2ab5c');}
 for(const wx of wins){rect(wx-6,y+48,6,29,'#6b5236');rect(wx+26,y+48,6,29,'#6b5236');rect(wx-5,y+56,4,1,'#4f3c29');rect(wx+27,y+56,4,1,'#4f3c29');rect(wx-5,y+68,4,1,'#4f3c29');rect(wx+27,y+68,4,1,'#4f3c29');rect(wx,y+48,26,29,'#4a4c3c');rect(wx+3,y+51,20,23,'#3c4a4b');rect(wx+5,y+53,5,8,'#5d7071');rect(wx+12,y+50,3,26,'#a69977');rect(wx+3,y+61,20,2,'#a69977');rect(wx-4,y+77,34,3,'#a8a88c');if(o.flowers){rect(wx-2,y+80,30,5,'#6b5236');for(let i=0;i<6;i++){rect(wx+i*5,y+77,3,3,'#5f7a48');rect(wx+1+i*5,y+76,2,2,i%2?'#c9614c':'#e2c15f');}}}
 rect(x+w/2-82,y+36,164,28,'#1f2b25');rect(x+w/2-80,y+38,160,24,'#37473d');rect(x+w/2-80,y+38,160,1,'#55695a');for(const nx of [x+w/2-76,x+w/2+74]){rect(nx,y+41,2,2,'#c9b071');rect(nx,y+57,2,2,'#c9b071');}label(p.name.toUpperCase(),x+w/2,y+55,15);}
const shield=(x,y,color)=>{oval(x,y,8,10,'#3a3024');oval(x,y,7,9,color);oval(x,y,2,3,'#c9b071');rect(x-6,y,12,1,tint(color,.7));};
house(places[0],'#8c5944',{flowers:true});house(places[2],'#5c6256',{lantern:false});M.medicusArt?.paint(g);house(places[4],'#8c5944');
// Kaserne: Schilde an der Wand, Bank, Wäscheleine, Kochstelle
{const k=places[0];for(const [i,col]of [['#8a4a40'],['#3e5a61'],['#77744b']].entries())shield(k.x+62+i*20,k.y+104,col[0]);for(const [i,col]of [['#3e5a61'],['#8a4a40']].entries())shield(k.x+198+i*20,k.y+104,col[0]);
 rect(214,186,52,4,'#7a6141');rect(216,190,4,7,'#5b4934');rect(260,190,4,7,'#5b4934');rect(224,181,9,5,'#9e6b49');rect(246,180,7,6,'#b9b092');
 
 oval(226,258,15,7,'#6f6a55');oval(226,257,11,5,'#3a352b');rect(219,255,5,3,'#4b3524');rect(226,256,7,2,'#5b4934');rect(214,236,2,22,'#4a4032');rect(238,236,2,22,'#4a4032');rect(214,236,26,2,'#4a4032');rect(221,243,11,9,'#3b3a2c');rect(220,242,13,2,'#5a5848');rect(226,238,1,5,'#4a4032');
 for(const [sx,sy]of [[201,262],[252,263]]){rect(sx,sy,10,4,'#7a6141');rect(sx+1,sy+4,2,5,'#5b4934');rect(sx+7,sy+4,2,5,'#5b4934');}rect(262,246,10,12,'#9e6b49');rect(264,241,6,5,'#b48356');rect(260,249,2,6,'#c19966');}
// Schmiede: zusammenhängender Werkhof, freie Tür und Arbeitsgänge.
rect(636,236,220,59,'#766952');rect(637,237,218,55,'#8a795c');
for(let yy=239;yy<290;yy+=11)for(let xx=639+(yy%2)*7;xx<850;xx+=17){rect(xx,yy,15,9,'#97866a');rect(xx,yy+8,15,1,'#75654d');}
rect(637,293,218,3,'#b2a080');
// Gemauerte Esse, dunkle Haube, sichtbare Kohlen und Kamin.
rect(805,56,28,50,'#5f6254');rect(801,53,36,8,'#929079');rect(809,62,20,2,'#4e5245');rect(805,80,28,2,'#70745f');
rect(775,170,48,66,'#595748');poly([[775,170],[785,157],[815,157],[823,170]],'#42483f');rect(773,170,52,4,'#8c8972');
for(let y=179;y<234;y+=9){rect(776,y,46,1,'#353c34');for(let x=780+(y%2)*8;x<820;x+=17)rect(x,y-7,1,7,'#373e35');}
rect(782,186,34,35,'#252c28');rect(779,220,40,5,'#a49778');rect(783,224,4,12,'#4d493b');rect(812,224,4,12,'#4d493b');
for(let n=0;n<12;n++)rect(784+n*7%28,211+Math.floor(n/4)*3,5,3,n%3?'#9b4930':'#dd8544');
// Waffenständer links der Tür; einzelne Griffe, Parierstangen und Klingen.
rect(643,180,4,53,'#4d3d2d');rect(691,180,4,53,'#4d3d2d');rect(641,190,55,4,'#9a7950');rect(641,225,55,5,'#755538');
for(let n=0;n<4;n++){const x=652+n*11;rect(x,187,2,9,'#735336');rect(x-3,195,8,2,'#c5a46a');rect(x,197,3,24-n%2*5,'#88998f');rect(x+1,197,1,24-n%2*5,'#d3d8c8');rect(x+1,221-n%2*5,1,2,'#b7c5b8');}
// Amboss auf massivem Holzstock. Oberseite auf Handhöhe der Arbeiter.
rect(663,254,31,7,'#665238');rect(668,234,21,21,'#6e4d32');rect(671,235,2,18,'#99734a');rect(682,235,2,18,'#4d3d2b');rect(667,247,23,3,'#3c4037');
poly([[659,219],[687,219],[700,223],[693,227],[684,229],[684,234],[671,234],[670,229],[660,227]],'#66766d');
rect(659,219,29,3,'#c7d1bc');rect(661,222,25,3,'#94a294');rect(671,231,14,2,'#424c43');rect(682,220,2,2,'#39453e');
// Blasebalg: Holzgestell rechts neben der Esse; beweglicher Lederbalg separat.
rect(824,240,29,4,'#6a4c32');rect(827,244,3,10,'#4b3c2a');rect(848,244,3,10,'#4b3c2a');rect(818,231,9,3,'#7f8170');
// Schleifstein mit Achse, Kurbel und Pedal.
rect(707,282,5,10,'#5d4732');rect(728,282,5,10,'#5d4732');rect(705,279,30,4,'#9a7950');rect(713,286,17,3,'#644b32');
oval(720,270,12,12,'#4e554c');oval(720,269,10,10,'#939b87');oval(720,269,7,7,'#aab09a');rect(718,267,4,4,'#575f52');
// Abschrecktrog und Werkbank: sauber getrennt von Gehwegen.
rect(771,266,30,23,'#5a4531');rect(773,264,26,5,'#ad9470');rect(775,265,22,3,'#4a7580');rect(771,274,30,2,'#363e36');rect(771,284,30,2,'#363e36');
rect(804,276,45,5,'#a48358');rect(806,281,4,13,'#5e4630');rect(843,281,4,13,'#5e4630');rect(810,272,12,4,'#777f70');rect(825,269,3,7,'#624a30');rect(823,269,8,3,'#acb39d');
for(let n=0;n<7;n++)rect(643+n*5%16,269+Math.floor(n/3)*4,5,4,n%2?'#333830':'#44463b');rect(640,280,22,3,'#574b37');
// Medicus: Fassade, Krankenlager und Vorplatz zeichnet medicus-art.js
M.medicusArt?.beds(g);
// Sklavenmarkt-Vorplatz zwischen Stand und Medicus: festgetretene Erde, zwei Kettenpfähle, Wassertrog
rect(50,404,206,38,'#8c7650');rect(52,406,202,34,'#9a8358');for(let i=0;i<46;i++){const t=rnd(i*7.3+2),u=rnd(i*3.1+9);rect(54+t*196,407+u*31,2+(i%3),1,i%4?'#86704a':'#ab946a');}for(let i=0;i<9;i++){const t=rnd(i*5.7+4);rect(60+t*180,412+rnd(i+31)*22,3,2,'#7b6642');rect(64+t*180,414+rnd(i+31)*22,3,2,'#7b6642');}
for(const px of [56,248]){rect(px-1,409,5,31,'#3a2f22');rect(px,410,3,29,'#6b5236');rect(px,410,1,29,'#86694a');rect(px-2,408,7,3,'#4d3d2b');rect(px-2,418,7,2,'#34393a');rect(px+4,419,3,4,'#34393a');rect(px+5,420,1,2,'#9a8358');}
rect(226,429,20,9,'#4d3d2b');rect(228,430,16,5,'#5d8f9a');rect(228,430,16,1,'#8fc0c6');rect(227,437,3,3,'#3a2f22');rect(242,437,3,3,'#3a2f22');
// Truppenplatz: Taktiktisch links der Tür, Schildständer und Speere rechts
soft(.25,()=>rect(652,604,74,5,'#2f2a1f'));rect(648,570,74,34,'#65513a');rect(652,567,66,28,'#af9c71');rect(652,567,66,1,'#cdbb8f');for(let i=0;i<9;i++)rect(658+(i*23)%54,572+(i*13)%18,4,4,i%2?'#5f8881':'#9d5f48');rect(650,604,4,7,'#4b3c2a');rect(716,604,4,7,'#4b3c2a');
rect(778,566,66,3,'#6b5236');rect(780,566,3,40,'#5b4934');rect(839,566,3,40,'#5b4934');for(const [i,col]of [['#8a4a40'],['#3e5a61'],['#77744b']].entries())shield(794+i*18,588,col[0]);for(let i=0;i<3;i++){rect(828+i*4,548,1,56,'#8a6a46');rect(827+i*4,544,3,5,'#bec1ad');}
// Markt: Stände mit gestreiften Markisen, Kisten, Amphoren, Körbe, Karren
{const m=places[5];soft(.25,()=>rect(m.x+10,m.y+112,m.w-14,8,'#2f2a1f'));for(const x of [m.x+7,m.x+m.w-9,m.x+112])rect(x,m.y+24,6,91,'#635034');
 for(let i=0;i<4;i++){const ax=m.x+i*56,a=i%2?'#c3b17f':'#8a5a43',b=i%2?'#b2a075':'#704937';rect(ax,m.y+5,57,31,a);for(let s=0;s<57;s+=14)rect(ax+s,m.y+5,7,31,tint(a,.86));rect(ax,m.y+5,57,2,tint(a,1.15));poly([[ax,m.y+36],[ax+57,m.y+36],[ax+55,m.y+48],[ax+3,m.y+48]],b);for(let s=4;s<54;s+=9)poly([[ax+s,m.y+48],[ax+s+7,m.y+48],[ax+s+3.5,m.y+53]],a);}
 rect(m.x+14,m.y+85,m.w-27,26,'#7a6141');rect(m.x+14,m.y+85,m.w-27,2,'#a08459');for(let s=m.x+20;s<m.x+m.w-18;s+=22)rect(s,m.y+89,1,20,'#5f4a31');
 rect(m.x+20,m.y+76,34,10,'#ae986e');for(let i=0;i<5;i++)rect(m.x+23+i*6,m.y+73,5,5,i%2?'#c9614c':'#d99a3c');
 for(let i=0;i<3;i++){rect(m.x+62+i*13,m.y+72,9,14,'#9e6b49');rect(m.x+64+i*13,m.y+67,5,6,'#b48356');rect(m.x+62+i*13,m.y+75,9,1,'#7c4f36');}
 rect(m.x+106,m.y+74,26,12,'#8f7a55');rect(m.x+106,m.y+74,26,2,'#b39d70');for(let i=0;i<4;i++)rect(m.x+109+i*6,m.y+71,5,4,'#86a268');
 rect(m.x+140,m.y+70,20,16,'#6b5236');rect(m.x+142,m.y+72,16,5,'#d8cdaa');rect(m.x+164,m.y+72,27,14,'#a08459');rect(m.x+166,m.y+69,23,4,'#c9b071');
 for(const sx of [m.x+34,m.x+90,m.x+150]){rect(sx,m.y+50,1,9,'#4a4032');rect(sx-2,m.y+58,5,6,'#3b3a2c');rect(sx-1,m.y+59,3,4,'#e2ab5c');}
 rect(m.x+196,m.y+92,30,13,'#7a6141');rect(m.x+194,m.y+89,34,4,'#8f7a55');oval(m.x+202,m.y+108,6,6,'#4b3c2a');oval(m.x+202,m.y+108,3,3,'#8f7a55');oval(m.x+222,m.y+108,6,6,'#4b3c2a');oval(m.x+222,m.y+108,3,3,'#8f7a55');rect(m.x+200,m.y+82,9,8,'#c1a770');rect(m.x+211,m.y+80,10,10,'#9e6b49');
 rect(m.x+42,m.y+49,147,29,'#1f2b25');rect(m.x+44,m.y+51,143,25,'#35443a');rect(m.x+44,m.y+51,143,1,'#55695a');label('SKLAVENMARKT',m.x+115,m.y+69,16);}
// Arena-Tor: Bogen, Fallgitter, Stufen, Banner, Löwen
{const ar=places[6];soft(.3,()=>rect(ar.x+8,ar.y+112,ar.w,10,'#2f2a1f'));rect(ar.x,ar.y+17,ar.w,100,'#737761');for(let row=0;row<6;row++)for(let col=0;col<8;col++)if((row+col)%2)rect(ar.x+4+col*28,ar.y+22+row*16,24,12,'#7e826b');
 rect(ar.x+58,ar.y+34,110,88,'#303e35');poly([[ar.x+58,ar.y+36],[ar.x+75,ar.y+12],[ar.x+151,ar.y+12],[ar.x+168,ar.y+36]],'#b2ab8a');poly([[ar.x+66,ar.y+36],[ar.x+80,ar.y+17],[ar.x+146,ar.y+17],[ar.x+160,ar.y+36]],'#c6bf9d');rect(ar.x+104,ar.y+14,18,22,'#d6cfad');
 rect(ar.x+64,ar.y+40,98,54,'#1c2622');for(let n=0;n<4;n++)rect(ar.x+64,ar.y+47+n*12,98,5,n%2?'#a6966e':'#7c8167');for(let n=0;n<9;n++)rect(ar.x+68+n*11,ar.y+40,3,54,'#55604f');
 rect(ar.x+64,ar.y+94,98,25,'#baa476');rect(ar.x+60,ar.y+112,106,4,'#cdbf99');rect(ar.x+56,ar.y+116,114,4,'#b8aa84');
 for(const x of [ar.x+12,ar.x+182]){rect(x,ar.y+7,31,109,'#a4a487');rect(x,ar.y+7,31,3,'#c4c4a6');rect(x-2,ar.y+3,35,5,'#8d9275');for(let y=ar.y+10;y<ar.y+115;y+=18)rect(x+2,y,27,2,'#6c725d');rect(x+12,ar.y+44,7,12,'#3b3a2c');rect(x+13,ar.y+56,5,3,'#5a5848');}
 for(const x of [ar.x-17,ar.x+ar.w+3]){rect(x,ar.y+15,3,92,'#514e3b');rect(x-1,ar.y+12,5,4,'#c9b071');rect(x+3,ar.y+19,24,45,'#884e41');rect(x+3,ar.y+19,24,3,'#a2604f');rect(x+11,ar.y+24,5,30,'#c1a26b');rect(x+8,ar.y+34,11,4,'#c1a26b');poly([[x+3,ar.y+64],[x+15,ar.y+58],[x+27,ar.y+64]],'#a68e63');}
 for(const x of [ar.x-36,ar.x+ar.w+22]){rect(x,ar.y+102,22,14,'#8d9275');rect(x-2,ar.y+99,26,4,'#b4b498');rect(x+3,ar.y+88,15,11,'#bdb08a');rect(x+13,ar.y+82,8,9,'#c9bd9b');rect(x+2,ar.y+86,4,5,'#a89a76');rect(x+17,ar.y+85,2,2,'#3a3024');}
 rect(ar.x+41,ar.y-3,144,28,'#1f2b25');rect(ar.x+43,ar.y-1,140,24,'#35443a');rect(ar.x+43,ar.y-1,140,1,'#55695a');label('ARENA-TOR',ar.x+113,ar.y+16);}
// Trainingshof: geharkter Sand, Balkeneinfassung, Puppen, Strohballen, Waffenständer am Rand
rect(326,254,238,340,'#6b5236');rect(328,256,234,336,'#8f7a55');rect(330,258,230,242,'#b89d6c');
for(let i=0;i<24;i++)soft(.35,()=>rect(334,264+i*10,222,1,i%2?'#c9af7e':'#a58a5c'));for(let i=0;i<110;i++)rect(334+(i*43)%222,266+(i*71)%222,3,1,'#cdb382');
for(const [x,y]of [[375,366],[519,368],[448,476]]){soft(.28,()=>oval(x+6,y+4,22,6,'#2f2a1f'));rect(x-18,y,36,5,'#776144');rect(x-3,y-52,6,53,'#5b4934');rect(x-19,y-42,38,6,'#9e8658');rect(x-11,y-49,22,25,'#b39a66');for(let s=0;s<4;s++)rect(x-11,y-46+s*6,22,1,'#8a7446');rect(x-8,y-65,16,16,'#c9ae76');rect(x-8,y-65,16,3,'#8d9892');rect(x-9,y-61,18,2,'#8d9892');rect(x-21,y-41,4,3,'#d9c48f');rect(x+17,y-41,4,3,'#d9c48f');}
for(const [x,y]of [[334,262],[538,262]]){rect(x,y,20,12,'#c9a85e');rect(x,y,20,2,'#e0c57f');rect(x+6,y,2,12,'#8a7446');rect(x+13,y,2,12,'#8a7446');}
rect(384,232,3,24,'#5b4934');rect(503,232,3,24,'#5b4934');rect(378,230,134,22,'#1f2b25');rect(380,232,130,18,'#45513e');rect(380,232,130,1,'#62705a');label('TRAININGSHOF',445,246,14);
// Schießbahn: Bahnen, Strohwände, Zielscheiben, Pfeilfass
rect(330,500,230,90,'#b69b6a');rect(330,500,230,2,'#8f7a55');for(let i=0;i<40;i++)rect(334+(i*43)%222,524+(i*29)%62,3,1,'#c9af7e');rect(376,526,2,60,'#8f7a55');soft(.3,()=>{rect(380,561,150,1,'#8f7a55');rect(380,590,150,1,'#8f7a55');});
for(const t of range){rect(t.x+10,t.y-58,10,54,'#c9a85e');for(let s=0;s<5;s++)rect(t.x+10,t.y-54+s*10,10,1,'#8a7446');rect(t.x+10,t.y-58,10,2,'#e0c57f');}
for(const t of range){const x=t.x,y=t.y-33,ring=(rx,ry,color)=>{g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();};rect(x+8,y+12,3,23,'#5b4934');rect(x-4,y+14,3,21,'#6b5236');rect(x+4,y-6,3,30,'#5b4934');g.fillStyle='#8a7446';g.beginPath();g.ellipse(x+3,y,8,17,0,0,Math.PI*2);g.fill();ring(8,17,'#c9a85e');ring(7,15,'#e4dbc0');ring(5,11,'#3e5a61');ring(4,8,'#a4483c');ring(2,4,'#e2c15f');}
for(let i=0;i<4;i++){rect(333+i*20,510,13,9,'#777967');rect(336+i*20,507,7,3,'#a5a38a');}rect(334,524,10,13,'#6b5236');rect(334,527,10,1,'#3a3024');rect(334,533,10,1,'#3a3024');for(let i=0;i<4;i++){rect(335+i*2,516,1,9,'#a88c60');rect(335+i*2,515,1,2,'#c9c6ac');}
// Ostgarten zwischen Schmiede und Truppenplatz: Brunnen, Olivenbäume, Mars-Schrein, Bank
{const fx=742,fy=352;soft(.25,()=>oval(fx+6,fy+8,34,13,'#2f2a1f'));oval(fx,fy,32,15,'#8d9275');oval(fx,fy-2,32,15,'#b4b498');oval(fx,fy-2,26,11,'#6c725d');oval(fx,fy-2,24,10,'#4f7f8a');oval(fx-6,fy-4,10,3,'#6fa2ab');rect(fx-3,fy-22,6,20,'#a4a487');rect(fx-7,fy-25,14,4,'#c4c4a6');oval(fx,fy-25,5,2,'#6fa2ab');rect(fx-1,fy-24,1,18,'#9cc5cb');rect(fx+1,fy-24,1,16,'#9cc5cb');
 const olive=(x,y)=>{soft(.25,()=>oval(x+7,y+3,19,6,'#2f2a1f'));rect(x-3,y-22,6,24,'#6a5840');rect(x-5,y-12,3,6,'#6a5840');oval(x,y-32,19,15,'#55694a');oval(x-7,y-36,10,8,'#6f8459');oval(x+8,y-29,9,7,'#627a52');for(let i=0;i<7;i++)rect(x-13+(i*9)%26,y-40+(i*7)%18,2,2,'#8fa173');};olive(676,400);olive(816,347);
 rect(823,388,22,26,'#8d9275');rect(820,384,28,5,'#b4b498');rect(826,366,16,18,'#bdb08a');rect(830,356,8,10,'#c9bd9b');rect(828,354,12,3,'#8a4a40');rect(840,362,2,22,'#8a6a46');rect(839,358,4,5,'#bec1ad');rect(829,410,10,3,'#3b3a2c');rect(831,407,6,3,'#e2ab5c');
 rect(690,318,34,4,'#7a6141');rect(692,322,4,7,'#5b4934');rect(718,322,4,7,'#5b4934');rect(690,312,34,2,'#7a6141');rect(690,312,2,8,'#5b4934');rect(722,312,2,8,'#5b4934');
 for(const [x,y]of [[790,322],[660,340],[850,430]]){rect(x-7,y-16,14,18,'#9e6b49');rect(x-4,y-22,8,6,'#b48356');rect(x-9,y-13,3,8,'#c19966');rect(x-7,y-10,14,1,'#7c4f36');}
 for(let i=0;i<10;i++)tuft(650+rnd(i+31)*190,300+rnd(i+77)*120,i%3===0);}
// Bäume, Fässer und Kisten in den Ecken; nichts steht auf Wegen oder vor Türen
const cypress=(x,y)=>{soft(.25,()=>oval(x+6,y+24,13,5,'#2f2a1f'));rect(x-3,y,6,24,'#65513b');poly([[x,y-48],[x-15,y+2],[x+14,y+2]],'#425c43');poly([[x,y-42],[x-7,y-1],[x+3,y+2]],'#65794e');for(let i=0;i<5;i++)rect(x-6+(i*5)%12,y-30+i*6,2,2,'#34493a');};
for(const [x,y]of [[853,372],[46,440]])cypress(x,y);
M.hallGate?.paint(g,rect,label);
for(const [x,y]of [[294,152],[304,160]]){rect(x-7,y-14,14,16,'#7a6141');rect(x-7,y-10,14,1,'#3a3024');rect(x-7,y-3,14,1,'#3a3024');rect(x-6,y-15,12,2,'#a08459');}rect(290,160,12,10,'#8f7a55');rect(290,160,12,2,'#b39d70');rect(295,160,1,10,'#5f4a31');
// ---- Schöner & schwärzer (2026-11-06): nur Bodenfarbe, flache Schilder und Kleinkram auf freien Flächen. Wege, Türen, Klickflächen unverändert; alles einmal gemalt.
{const blood=(x,y,rx,ry,a=.28)=>soft(a,()=>{oval(x,y,rx,ry,'#5a1f17');oval(x+rx*.3,y-ry*.2,rx*.55,ry*.5,'#6e2a1e');}),
 sign=(x,y,w,lines,o={})=>{const h=o.h??(4+lines.length*9);soft(.3,()=>rect(x+2,y+h,w,3,'#2f2a1f'));if(o.post)for(const px of o.post){rect(px,y+h,2,o.postH??8,'#4b3c2a');}rect(x,y,w,h,'#4d3d2b');rect(x+1,y+1,w-2,h-2,o.bg??'#8b6c45');rect(x+1,y+1,w-2,1,'#a8865a');for(let yy=y+4;yy<y+h-1;yy+=4)rect(x+2,yy,w-4,1,tint(o.bg??'#8b6c45',.9));g.font=`bold ${o.size??8}px 'Courier Prime',monospace`;g.textAlign='center';g.fillStyle=o.ink??'#2a1d12';lines.forEach((t,i)=>g.fillText(t,x+w/2,y+10+i*9));},
 skull=(x,y,s=1)=>{oval(x,y,3*s,3*s,'#d9d2bb');rect(x-2*s,y+2*s,4*s,2*s,'#d9d2bb');rect(x-2*s,y-1*s,1*s+1,1*s+1,'#2a2420');rect(x+1*s,y-1*s,1*s+1,1*s+1,'#2a2420');rect(x,y+1*s,1,1,'#5a5144');},
 bone=(x,y,w=7)=>{rect(x,y,w,1,'#d9d2bb');rect(x-1,y-1,2,3,'#e6dfc8');rect(x+w-1,y-1,2,3,'#e6dfc8');};
 // Warmes Spätnachmittagslicht auf dem Hofboden (unter Gebäuden bleibt es wie bisher, weil die Gebäude schon stehen: nur ganz schwach)
 // Schleifspur mit Blutstropfen vom Arena-Tor über den Weg zur Halle der Gefallenen
 const drag=[[462,176],[430,188],[392,196],[350,202],[312,206],[290,210],[262,214],[232,216],[204,214],[178,212],[160,214]];
 for(let i=0;i<drag.length-1;i++){const [x0,y0]=drag[i],[x1,y1]=drag[i+1];for(let k=0;k<1;k+=.08){const x=x0+(x1-x0)*k,y=y0+(y1-y0)*k,j=rnd(i*13+k*50);soft(.16,()=>{rect(x,y-3,3,1,'#6b4a33');rect(x,y+2,3,1,'#6b4a33');});if(j>.62)soft(.55,()=>rect(x+j*3,y-1+j*2,j>.85?2:1,j>.85?2:1,'#6e2219'));}}
 blood(468,180,6,2,.35);blood(166,214,7,3,.3);
 // Trainingshof: alte Flecken unter den Puppen, ein Eimer Zähne, die unbesiegte Puppe
 for(const [x,y]of [[375,366],[519,368],[448,476]]){blood(x+9,y+9,9,3,.18);blood(x-12,y+6,5,2,.14);}
 blood(470,420,12,4,.12);blood(402,440,6,2,.16);
 {const bx=399,by=383;soft(.3,()=>oval(bx+2,by+9,8,3,'#2f2a1f'));rect(bx-6,by,12,9,'#6b5236');rect(bx-7,by,14,2,'#8a7446');rect(bx-6,by+5,12,1,'#4d3d2b');for(let i=0;i<6;i++)rect(bx-4+(i*3)%9,by-1+(i>2?1:0),2,2,i%2?'#efe8d2':'#d9d0b4');rect(bx-4,by-3,8,1,'#5b4934');
  sign(bx-18,by+12,36,['ZÄHNE'],{size:8,h:12});}
 sign(470,448,58,['UNBESIEGT','SEIT 12 J.'],{post:[497],postH:9,size:8});
 // Schießbahn: Pfeil daneben, im Boden steckend, plus „Zielwasser"
 for(const [x,y]of [[512,548],[507,556],[561,529]]){rect(x,y,1,7,'#a88c60');rect(x-1,y-1,3,2,'#c9c6ac');}
 // Wegweiser zwischen Kaserne und Arena-Tor
 {const px=309;rect(px,58,3,72,'#4d3d2b');rect(px+1,58,1,72,'#6b5236');
  const arrow=(y,dir,text)=>{const w=42,x=dir>0?px-14:px-26;poly(dir>0?[[x,y],[x+w,y],[x+w+5,y+5],[x+w,y+10],[x,y+10]]:[[x,y],[x+w,y],[x+w,y+10],[x,y+10],[x-5,y+5]],'#4d3d2b');rect(x+1,y+1,w-2,8,'#9a7a4f');rect(x+1,y+1,w-2,1,'#b8956a');g.font="bold 8px 'Courier Prime',monospace";g.textAlign='center';g.fillStyle='#2a1d12';g.fillText(text,x+w/2,y+8);};
  arrow(62,1,'RUHM');arrow(76,-1,'HALLE');arrow(90,1,'GRAB');arrow(104,-1,'FLUCHT');rect(px-24,109,40,1,'#7a2418');
  skull(px+12,124);bone(px-14,128);bone(px-8,131,5);}
 // Arena-Tor: Knochen auf den Stufen, Krallenspuren im Sand
 bone(418,166,6);bone(506,167,5);skull(526,166,.8);
 for(let i=0;i<4;i++)soft(.35,()=>rect(440+i*4,170,1,5,'#5f4f37'));
 // Kaserne: „Betten frei"-Tafel und Strichliste an der Wand
 sign(186,130,44,['BETTEN','FREI'],{size:7});
 for(let i=0;i<7;i++)rect(60+i*3+(i===4?2:0),141,1,8,'#4f4636');rect(59,145,15,1,'#4f4636');
 // Sklavenmarkt: Kundendienst
 {const m=places[5];sign(m.x+62,m.y+89,104,['KEIN UMTAUSCH'],{size:8,h:12,bg:'#9d7f52'});}
 // Truppenplatz: Schlachtplan
 sign(652,516,62,['PLAN A: SIEG','PLAN B: SARG'],{size:7,bg:'#3d4a3e',ink:'#e8e2c8'});
 // Schädel auf den Ecktürmen: die Hausordnung der Tauben
 for(const [x,y]of [[22,26],[878,26],[22,642],[878,642]]){skull(x,y);for(let i=0;i<3;i++)rect(x-7+i*6,y-8+(i%2)*13,1,1,'#efefe4');}
 // Ein paar Krähenfedern und alte Flecken auf dem Pflaster vor dem Medicus
 blood(258,606,6,2,.25);blood(214,612,4,1,.2);
}
// ---- Efeu an der Innenseite der Mauer und Laternenschein (einmal gemalt)
{const ivy=(x,y,w,h,seed)=>{for(let i=0;i<w*h/5;i++){const t=rnd(seed+i*1.7),u=rnd(seed+i*2.9),fall=u*u*h*(1-Math.abs(t-.5)*1.2);const yy=y+Math.max(0,fall),xx=x+t*w;rect(xx,yy+1,3,2,'#2f4428');rect(xx,yy,3,2,['#4e6a3e','#5f7a48','#567245','#6f8b52'][i%4]);if(i%5===0)rect(xx+1,yy,1,1,'#88a165');}};
 ivy(232,24,36,22,11);ivy(612,24,26,18,23);ivy(16,300,16,60,37);ivy(868,180,16,50,41);ivy(868,470,16,40,53);ivy(440,632,30,8,61);
 const glow=(x,y,r,a=.22)=>{const q=g.createRadialGradient(x,y,1,x,y,r);q.addColorStop(0,`rgba(255,196,110,${a})`);q.addColorStop(1,'rgba(255,170,80,0)');g.fillStyle=q;g.fillRect(x-r,y-r,r*2,r*2);};
 for(const p of [places[0],places[4]]){const dx=Math.round(p.x+p.w*.43);glow(dx-10,p.y+p.h-37,22);}
 glow(377,100,26,.2);glow(547,100,26,.2);glow(226,254,24,.18);glow(799,203,30,.2);glow(833,408,16,.2);
 {const m=places[5];for(const sx of [m.x+34,m.x+90,m.x+150])glow(sx+1,m.y+62,16,.18);}}
// ---- Licht: warme Sonne von oben links, dunklere Ränder. Einmal gemalt, kostet im Spiel nichts.
{g.save();const sun=g.createRadialGradient(260,140,40,330,260,620);sun.addColorStop(0,'rgba(255,214,150,.17)');sun.addColorStop(.55,'rgba(255,190,120,.04)');sun.addColorStop(1,'rgba(40,20,30,.0)');g.fillStyle=sun;g.fillRect(0,0,900,670);
 const vig=g.createRadialGradient(450,335,250,450,335,620);vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(22,14,12,.32)');g.fillStyle=vig;g.fillRect(0,0,900,670);g.globalCompositeOperation='soft-light';g.fillStyle='rgba(214,160,96,.35)';g.fillRect(0,0,900,670);g.restore();}
drawGate(g);rect(330,640,240,17,'#1f2b25');label('LUDUS · '+S.schoolName.toUpperCase().slice(0,35),450,653,14);return c;}
function ambient(g,t){const r=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h);},flick=Math.floor(t*7)%3;
 for(let i=0;i<5;i++){const k=(t*.22+i/5)%1;g.globalAlpha=.34*(1-k);r(812+Math.sin(k*5+i)*5+k*10,48-k*40,5+k*7,4+k*5,'#c9c6b4');}g.globalAlpha=1;
 for(const x of [375,545]){r(x,97+(flick===1?1:0),5,7-flick,'#e2ab5c');r(x+1,95+flick,3,4,'#f4d37a');r(x+2,93+(flick===2?2:0),1,3,'#fff0c0');}
 r(222,254-(flick?1:0),7,3+(flick?1:0),'#c8642e');r(224,252,3,2,flick===2?'#f4d37a':'#e2ab5c');g.globalAlpha=.3;r(225+Math.sin(t*2)*2,232-((t*9)%10),3,3,'#d8d2bd');g.globalAlpha=1;
 for(const x of [337,583]){const w=Math.sin(t*2.2+x)*2;r(x+19+w,74,4,38,'#7a4439');r(x+10,96+Math.abs(w),8,2,'#a2604f');}
 for(let i=0;i<3;i++){const k=(t*.9+i*.37)%1;g.globalAlpha=.7*(1-k);r(722+i*17+Math.sin(t*3+i)*2,347+(i%2)*4,3+i%2,1,'#cfe6e8');}g.globalAlpha=1;r(741,331+Math.floor(t*6)%3,1,2,'#cfe6e8');
 r(830,406-(flick===1?1:0),6,3,flick?'#e2ab5c':'#f4d37a');
 // Geierschatten zieht langsam über den Hof (zwei Flächen je Bild)
 {const k=t*.05,x=450+Math.cos(k*Math.PI*2)*300,y=350+Math.sin(k*Math.PI*2)*190,f=Math.sin(t*1.3)>0?1:0;g.globalAlpha=.12;r(x-16,y-1,32,2+f,'#1c1410');r(x-3,y-4,6,9,'#1c1410');g.globalAlpha=1;}
 // Krähen auf der Nordmauer: hüpfen und picken ab und zu
 for(const [x,c]of [[156,0],[472,1.7],[748,3.1]]){const p=(t+c*2.3)%6,hop=p<.3?-2:0,peck=p>3&&p<3.4?2:0;r(x,25+hop,5,3,'#1d1b1e');r(x+4,23+hop+peck,3,3,'#1d1b1e');r(x+7,24+hop+peck,1,1,'#b08a3c');r(x+1,28+hop,1,1,'#1d1b1e');r(x+3,28+hop,1,1,'#1d1b1e');}
 // Fliegen über dem Zahneimer und dem Fleck unter der Puppe
 for(let i=0;i<5;i++){const fx=i<3?399:470,fy=i<3?378:418,q=t*(3+i)+i*2;r(fx+Math.sin(q)*6+Math.sin(q*2.7)*2,fy+Math.cos(q*1.3)*4,1,1,'#1a1612');}}
function selectPeople(){const injured=[],healthy=[];for(const g of S.roster){if(g.dead||M.ludusHidden?.(g))continue;(M.health(g)<75||g.blood<65?injured:healthy).push(g);}const shown=healthy.slice(0,12-Math.min(3,injured.length)),bows=healthy.filter(g=>['bow','crossbow'].includes(M.gear(g,'weapon')?.def)).slice(0,2);for(const g of bows){if(shown.includes(g))continue;for(let k=shown.length-1;k>=0;k--)if(!bows.includes(shown[k])){shown[k]=g;break;}}const selected=[...injured.slice(0,3),...shown];return selected.map((g,i)=>{const hurt=injured.includes(g),archer=hurt?0:bows.indexOf(g)+1,training=!hurt&&!archer&&i%3===0;const index=hurt?injured.indexOf(g):i;return {g,team:0,ammo:M.itemStats(M.gear(g,'weapon'))?.ammo||0,x:hurt?(M.medicusArt?.bedSpot(index).x??79+index*58):archer?352:training?i%2?490:345:320+(i*59)%280,y:hurt?(M.medicusArt?.bedSpot(index).y??599):archer?range[archer-1].y:training?i%2?367:364:210+(i*47)%370,baseX:0,baseY:0,a:0,state:hurt?'down':'idle',down:hurt,fallSide:-1,phase:0,moveSpeed:0,energy:100,hurt,training,archer,closeCombat:training,index:i};});}
function refreshScene(){actors=selectPeople();arrows=[];for(const a of actors){a.baseX=a.x;a.baseY=a.y;}if(S.lanista){actors.push({g:ownerFigure(S.lanista),lanista:true,x:574,y:608,baseX:574,baseY:608,a:0,state:'idle',phase:0,energy:100,ammo:0,moveSpeed:0,index:12});}}
function draw(dt){if(!canvas||canvas.isConnected===false||document.hidden||!onScreen||M.ui.getPage()!=='home'||window.ArenaTheoryIntro?.active?.())return;elapsed+=dt;paintTime+=dt;if(paintTime<1/30)return;const step=Math.min(paintTime,.1);paintTime=0;M.ludusRenderTest?.begin();const g=canvas.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(bg,0,0);g.drawImage(south??=southStrip(),0,670);g.fillStyle='#8d7650';g.fillRect(595,650,30,20);g.fillStyle='#9a8358';g.fillRect(598,650,24,20);ambient(g,elapsed);M.medicusArt?.frame(g,elapsed);if(M.ludusRenderTest)M.ludusRenderTest.pass(g,elapsed,'back');else M.ludusOverlay?.(g,elapsed);M.practiceYard?.update(actors,step);M.villageLife?.update(actors,step);for(const a of actors){if(a.hurt||M.practiceYard?.owns(a)||M.villageLife?.owns(a))continue;const t=elapsed*.6+a.index;if(a.archer){const lane=a.archer-1,clock=elapsed+a.index*1.7,k=clock%4.2,shot=Math.floor(clock/4.2),cross=M.gear(a.g,'weapon')?.def==='crossbow';a.a=0;a.moveSpeed=0;a.technique=null;a.state=cross&&k<2.2?'reload':'idle';a.reloadDuration=2.2;a.reloadTimer=cross?Math.max(0,2.2-k):0;a.windMax=1.1;a.wind=!cross&&k>=1.3&&k<2.8?Math.max(.01,2.4-k):0;a.swingKind='shoot';a.swingMax=.3;a.swing=k>=2.8&&k<3.1?3.1-k:0;if(k>=2.8&&a.lastShot!==shot){if(a.lastShot!==undefined||k<2.9)arrows.push({x:a.x+16,y:a.y-33,x0:a.x+16,y0:a.y-33,ty:range[lane].y-33+random(-11,11),lane,bolt:cross});a.lastShot=shot;}}else if(a.training&&M.practiceYard){a.wind=a.swing=0;a.moveSpeed=0;a.state='idle';}else if(a.training){a.technique='overhead';const k=t%3;a.windMax=.7;a.wind=k<.7?.7-k:0;a.swingMax=.5;a.swing=k>=.7&&k<1.2?1.2-k:0;a.swingKind='overhead';a.state='attack';}else{const priorX=a.x,priorY=a.y,priorPhase=a.phase||0;const walk=Math.sin(t*.35);a.x=a.baseX+walk*26;a.y=a.baseY+Math.sin(t*.25)*9;a.a=Math.cos(t*.35)>0?0:Math.PI;a.moveSpeed=Math.abs(Math.cos(t*.35))*10;a.phase=elapsed*2+a.index;a.state='move';M.updateLocomotion(a,priorX,priorY,priorPhase,step,a.lanista?.7:.6);}}actors.sort((a,b)=>a.y-b.y);M.renderLudusActors(g,[...actors,...(M.villageLife?.extraActors()||[])].sort((a,b)=>a.y-b.y));M.villageLife?.draw(g);M.practiceYard?.draw(g);if(M.ludusRenderTest)M.ludusRenderTest.pass(g,elapsed,'front');else M.ludusOverlay?.(g,elapsed);const shaft=(x,y,bolt)=>{const n=bolt?9:13;g.fillStyle='#a88c60';g.fillRect(Math.round(x-n),Math.round(y),n,1);g.fillStyle='#c9c6ac';g.fillRect(Math.round(x-n),Math.round(y)-1,2,3);g.fillStyle='#d9dccb';g.fillRect(Math.round(x),Math.round(y),2,1);};for(const s of stuck)for(const p of s)shaft(p.x,p.y,p.bolt);arrows=arrows.filter(p=>{const tx=range[p.lane].x-2;p.x+=440*step;if(p.x>=tx){stuck[p.lane].push({x:tx,y:p.ty,bolt:p.bolt});if(stuck[p.lane].length>3)stuck[p.lane].shift();return false;}shaft(p.x,p.y0+(p.ty-p.y0)*(p.x-p.x0)/(tx-p.x0),p.bolt);return true;});g.fillStyle=elapsed%1>.5?'#c88945':'#e2ab5c';g.fillRect(790,205,7,10);g.fillRect(805,210,5,7);M.ludusRenderTest?.end();}

// ---------- Wiese vor dem Südtor (unter der Südmauer, 900 × 90): Weg aus dem Tor, Gras, ein paar Bäume. Rechts vom Weg ist Platz (Rabies' Karren).
let south=null;
function southStrip(){const c=document.createElement('canvas');c.width=900;c.height=LH-670;const g=c.getContext('2d');g.imageSmoothingEnabled=false;const H=c.height;
 const rect=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));},rnd=n=>{const x=Math.sin(n*91.7+17.3)*43758.5453;return x-Math.floor(x);};
 rect(0,0,900,H,'#3a4630');for(let n=0;n<900;n++)rect(rnd(n)*900,rnd(n+.5)*H,2+rnd(n+.2)*3,2,['#425038','#34402c','#4a5a3c','#3e4a32'][n%4]);
 rect(0,0,900,3,'#2c352e');
 // Weg aus dem Tor nach Süden, unten etwas breiter
 for(let y=0;y<H;y+=2){const w=30+y*.12,x=610-w/2+Math.sin(y*.08)*2;rect(x,y,w,2,'#8d7650');rect(x+3,y,w-6,2,'#9a8358');if((y>>1)%4===0)rect(x+6+rnd(y)*(w-12),y,2,1,'#7d6a4a');}
 // Grasbüschel
 for(let n=0;n<70;n++){const x=rnd(n+300)*890+5,y=8+rnd(n+400)*(H-10);if(x>585&&x<640)continue;rect(x,y-3,1,4,'#5f7a48');rect(x+2,y-5,1,6,'#6f8b52');rect(x+4,y-2,1,3,'#56704a');}
 // Kleiner Friedhof der Schule zwischen den Bäumen: alte Kreuze, frisches Grab, ein offenes „auf Vorrat“ mit Schaufel
 {const cross=(x,y,tilt=0,old=false)=>{const c=old?'#5d5240':'#7a6141';rect(x-1+tilt,y-12,3,13,c);rect(x-5+tilt,y-9,11,3,c);rect(x+tilt,y-12,1,13,old?'#6e6250':'#957650');},mound=(x,y,fresh)=>{g.fillStyle=fresh?'#5a4430':'#46523a';g.beginPath();g.ellipse(x,y+4,9,4,0,0,Math.PI*2);g.fill();if(fresh)for(let i=0;i<5;i++)rect(x-6+i*3,y+2+(i%2),2,1,'#6e5638');};
  for(const [x,y,t,o,f]of [[236,40,0,true,false],[256,46,1,true,false],[248,26,-1,true,false],[408,30,0,false,true],[432,40,1,true,false],[420,52,0,false,false]]){mound(x,y,f);cross(x,y,t,o);}
  // offenes Grab mit Schaufel
  rect(330,34,18,9,'#2a2016');rect(331,35,16,2,'#3b2d1f');rect(328,32,22,2,'#6e5638');rect(349,30,6,6,'#6e5638');rect(352,22,1,12,'#7a6141');rect(350,33,5,3,'#9aa39a');
  {g.font="bold 8px 'Courier Prime',monospace";g.textAlign='center';rect(312,10,54,12,'#4d3d2b');rect(313,11,52,10,'#8b6c45');g.fillStyle='#2a1d12';g.fillText('RESERVIERT',339,19);rect(338,22,2,10,'#4b3c2a');}
  // Schild am Weg
  rect(548,24,2,16,'#4b3c2a');rect(520,10,58,16,'#4d3d2b');rect(521,11,56,14,'#8b6c45');g.fillStyle='#2a1d12';g.font="bold 7px 'Courier Prime',monospace";g.fillText('FRIEDHOF',549,17);g.fillText('PLÄTZE FREI',549,24);}
 // Bäume und Büsche links und ganz rechts (die Fläche rechts vom Weg bleibt frei)
 const D=window.DebtArt;if(D?.tree){let k=7;const r=()=>(k=(k*16807)%2147483647)/2147483647,P=D.palette({season:'sommer',time:'mittag',weather:'klar'},'dorf');
  for(const [x,y,s] of [[40,70,1.1],[120,84,1.25],[205,66,1],[290,82,1.2],[380,70,1.05],[470,86,1.15],[875,80,1.1]])D.tree(g,x,y,s,r,P);
  for(const [x,y] of [[160,60],[330,58],[540,78],[850,50]])D.bush(g,x,y,1,r,P);}
 return c;}
// ---------- Zoom & Verschieben: Die Karte ist die Bedienung. Pixelgenau per CSS-Breite, Verschieben über die Scrollbox. ----------
const Z={level:null,min:1,max:3.2};
// Die Karte ist 900 × 760: oben der Ludus (900 × 670, wie background()), unten die Wiese vor dem Südtor (südStreifen).
const LH=760;
function boxSize(box){const w=box.clientWidth||900;return {w,h:box.clientHeight||Math.round(w*LH/900)};}
function fitScale(box){const {w,h}=boxSize(box);return Math.max(w/900,h/LH);}
function applyZoom(level,cx,cy){const box=$('ludusScroll'),c=canvas||$('ludusCanvas');if(!box||!c)return;const old=Z.level??1,next=Math.max(Z.min,Math.min(Z.max,level)),{w,h}=boxSize(box);
 const ax=cx??w/2,ay=cy??h/2,wx=(box.scrollLeft+ax)/(c.offsetWidth||w),wy=(box.scrollTop+ay)/(c.offsetHeight||h);
 Z.level=next;const s=fitScale(box)*next;c.style.width=Math.round(900*s)+'px';c.style.height=Math.round(LH*s)+'px';
 box.scrollLeft=wx*900*s-ax;box.scrollTop=wy*LH*s-ay;}
function focus(x,y,level){const box=$('ludusScroll');if(!box)return;if(level)applyZoom(level);else applyZoom(Z.level??1);const s=fitScale(box)*(Z.level??1),{w,h}=boxSize(box);box.scrollLeft=x*s-w/2;box.scrollTop=y*s-h/2;}
function setupZoom(){const box=$('ludusScroll');if(!box||box._zoom)return;box._zoom=true;
 const first=Z.level===null;applyZoom(Z.level??1);if(first)focus(450,335);else if(Z.sx!=null){box.scrollLeft=Z.sx;box.scrollTop=Z.sy;}
 box.addEventListener('scroll',()=>{Z.sx=box.scrollLeft;Z.sy=box.scrollTop;},{passive:true});
 addEventListener('resize',()=>{if(box.isConnected)applyZoom(Z.level??1);});
 const local=e=>{const r=box.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];};
 box.addEventListener('wheel',e=>{e.preventDefault();const [x,y]=local(e);applyZoom((Z.level??1)*Math.exp(-e.deltaY*.0015),x,y);},{passive:false});
 // Zwei Finger: zoomen um die Mitte; ein Finger: natives Verschieben der Scrollbox.
 let pinch=null;
 box.addEventListener('touchstart',e=>{if(e.touches.length===2){const [a,b]=e.touches;pinch={d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),z:Z.level??1};}},{passive:true});
 box.addEventListener('touchmove',e=>{if(!pinch||e.touches.length!==2)return;e.preventDefault();const [a,b]=e.touches,d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),r=box.getBoundingClientRect();applyZoom(pinch.z*d/pinch.d,(a.clientX+b.clientX)/2-r.left,(a.clientY+b.clientY)/2-r.top);box._moved=true;},{passive:false});
 box.addEventListener('touchend',e=>{if(e.touches.length<2)pinch=null;},{passive:true});
 // Maus: Ziehen verschiebt; ein Zug unterdrückt den folgenden Klick.
 let drag=null;
 box.addEventListener('mousedown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,l:box.scrollLeft,t:box.scrollTop};box._moved=false;});
 addEventListener('mousemove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>5){box._moved=true;box.classList.add('dragging');}if(box._moved){box.scrollLeft=drag.l-dx;box.scrollTop=drag.t-dy;}});
 addEventListener('mouseup',()=>{drag=null;box.classList.remove('dragging');});
 box.addEventListener('touchstart',e=>{if(e.touches.length===1)box._moved=false;},{passive:true});}
let afterIntro=false;
M.paintLudus=()=>{if(window.ArenaTheoryIntro?.active?.()){/* Kulisse erst nach dem Start-Intro zeichnen, damit es nicht stockt */if(!afterIntro){afterIntro=true;window.addEventListener('arenatheory:intro-done',()=>M.paintLudus(),{once:true});}return;}observer?.disconnect();canvas=$('ludusCanvas');if(canvas){if(!bg||bgName!==S.schoolName){bg=background();bgName=S.schoolName;}refreshScene();onScreen=true;if(window.IntersectionObserver){observer=new IntersectionObserver(rows=>{onScreen=rows[0]?.isIntersecting;},{threshold:0});observer.observe(canvas);}setupZoom();canvas.onclick=event=>{const box=$('ludusScroll');if(box?._moved){box._moved=false;return;}const r=canvas.getBoundingClientRect(),x=(event.clientX-r.left)*900/r.width,y=(event.clientY-r.top)*canvas.height/r.height;if(M.ludusHit?.(x,y))return;const person=[...actors].reverse().find(a=>x>a.x-(a.down?45:20)&&x<a.x+20&&y>a.y-(a.down?16:58)&&y<a.y+12);if(person){M.ui.click(person.lanista?'ludus:owner':'detail:'+person.g.id);return;}const p=places.find(p=>x>=p.x&&x<=p.x+p.w&&y>=p.y&&y<=p.y+p.h);if(p)M.ui.click('nav:'+p.route);};paintTime=1;draw(0);}const preview=$('lanistaPreview');if(preview&&draft){const g=preview.getContext('2d');g.fillStyle='#23332f';g.fillRect(0,0,180,190);g.save();g.translate(-40,-110);g.scale(2,2);M.renderLudusActors(g,[{g:ownerFigure(draft),lanista:true,x:65,y:135,a:0,state:'idle',energy:100,ammo:0,phase:0,moveSpeed:0}]);g.restore();}};
if(!S.lanista&&!isNew()){S.lanista=randomOwner();S.lanista.name=S.schoolName;M.persist();}
M.prepareLudusGraphics=()=>{if(!bg||bgName!==S.schoolName){bg=background();bgName=S.schoolName;}return bg;};M.ludusGraphicsBytes=()=>bg?900*LH*4:0;M.ludusTick=draw;M.ludus={places,range,focus,zoom:(level,x,y)=>applyZoom(level,x,y),get zoomLevel(){return Z.level;},refresh:()=>{if(canvas)refreshScene();},rebuild:()=>{bg=null;bgName=null;if(canvas&&canvas.isConnected!==false)M.paintLudus();},selectPeople,randomOwner,isNew,ownerFigure,background,drawGate};M.ui.render();
})();



