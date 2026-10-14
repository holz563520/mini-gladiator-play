if(!window.FigureSkin){
/* ARENA THEORY · HUMAN FIGURE ART v1
   Draw-only module. No gameplay calls, RNG, timers, persistence or actor writes.
   Coordinate contract: existing arena.js joint/weapon/foot anchors unchanged.
   Bounded head cache, authored paths, no external images or network resources. */
(()=>{'use strict';
const TAU=Math.PI*2,mixCache=new Map(),paths=new Map();
function mix(a,b,t){const key=a+b+t;if(mixCache.has(key))return mixCache.get(key);const rgb=c=>/^#[0-9a-f]{6}$/i.test(c||'')?[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)):[120,100,80],x=rgb(a),y=rgb(b),s='#'+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,'0')).join('');if(mixCache.size>1024)mixCache.clear();mixCache.set(key,s);return s;}
function path(s){if(paths.has(s))return paths.get(s);const p=new Path2D(s);if(paths.size<200)paths.set(s,p);return p;}
window.FigureSkin={version:'human-art-v4',create(M,get){const heads=new Map();let lowDetail=false,renderTime=0,rear=false;
function shape(s,fill,stroke='#302c27',width=.65){const q=get(),p=path(s);if(fill){q.fillStyle=fill;q.fill(p);}if(stroke){q.strokeStyle=stroke;q.lineWidth=width;q.lineJoin='round';q.stroke(p);}}
function line(x,y,X,Y,color,w=.6){const q=get();q.beginPath();q.moveTo(x,y);q.lineTo(X,Y);q.strokeStyle=color;q.lineWidth=w;q.lineCap='round';q.stroke();}
function dot(x,y,rx,ry,color){const q=get();q.beginPath();q.ellipse(x,y,Math.max(.05,rx),Math.max(.05,ry),0,0,TAU);q.fillStyle=color;q.fill();}
function gradient(x,y,X,Y,a,b,c){const g=get().createLinearGradient(x,y,X,Y);g.addColorStop(0,a);g.addColorStop(.42,b);g.addColorStop(1,c);return g;}
function rounded(x,y,w,h,color,r=.65){const q=get();if(w<=0||h<=0)return;if(lowDetail){q.fillStyle=color;q.fillRect(x,y,w,h);return;}q.beginPath();q.roundRect(x,y,w,h,Math.min(r,w/2,h/2));q.fillStyle=color;q.fill();}
function bone(a,b,w,color,highlight=true){const q=get(),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(!Number.isFinite(len)||len<.05)return;q.save();q.translate(a.x,a.y);q.rotate(Math.atan2(dy,dx));if(lowDetail){q.lineCap='round';q.beginPath();q.moveTo(0,0);q.lineTo(len,0);q.lineWidth=w+1;q.strokeStyle='#3c342b';q.stroke();q.lineWidth=w;q.strokeStyle=color;q.stroke();q.restore();return;}const r=w*.48,e=w*.37;q.beginPath();q.moveTo(0,-r);q.bezierCurveTo(len*.26,-r*1.1,len*.64,-r*.9,len,-e);q.quadraticCurveTo(len+e*.65,0,len,e);q.bezierCurveTo(len*.62,r*.8,len*.32,r*1.1,0,r);q.quadraticCurveTo(-r*.7,0,0,-r);q.closePath();q.fillStyle=highlight?gradient(0,-r,0,r,mix(color,'#e7caa7',.24),color,mix(color,'#382921',.22)):color;q.fill();q.strokeStyle='#44372d';q.lineWidth=.65;q.stroke();if(highlight&&len>7){q.beginPath();q.moveTo(len*.16,-r*.45);q.quadraticCurveTo(len*.4,-r*.65,len*.7,-r*.35);q.strokeStyle=mix(color,'#f2d5b1',.32);q.lineWidth=.55;q.stroke();q.beginPath();q.moveTo(len*.3,r*.52);q.quadraticCurveTo(len*.5,r*.72,len*.82,r*.22);q.strokeStyle=mix(color,'#624535',.32);q.lineWidth=.45;q.stroke();}q.restore();}
function hand(p,skin,shade,glove=false){const q=get();q.save();q.translate(p.x,p.y);const c=glove?'#625646':skin;shape('M -2.4 -2.1 Q 0 -3 2.5 -1.7 L 3.1 1 Q 2.6 3 0 3 Q -3 2.5 -2.9 .4 Z',gradient(-3,0,3,1,mix(c,'#f4dcaf',.24),c,shade));line(-1.5,.6,1.6,.8,shade,.45);line(-1,1.8,1.3,1.9,shade,.4);dot(1.8,-.8,1.1,.75,mix(c,'#f6dbb1',.18));q.restore();}
function foot(p,skin,shade,bare,armored){const q=get();q.save();q.translate(p.x,p.y);const sole='#3a2c23';shape('M -3 -2.8 Q 0 -4 2.9 -2.5 Q 3.6 -.3 6.4 .4 Q 8 1 7.6 2.5 Q 3 4 -4 2.5 Z',bare?gradient(-3,-2,6,2,skin,skin,shade):skin,sole,.65);if(!bare){shape('M -4 1.6 Q 2 2.7 7.8 1.6 L 7.8 3 Q 2 4 -4 3 Z',sole,null);for(const x of [-1.5,2.3])line(x,-2.3,x+1.2,2.1,armored?'#b7b39f':'#725039',1.7);line(-3.2,-1.8,3,-2.6,'#dec7a2',.6);}else for(let x=3;x<7;x+=1.1)line(x,1,x-.2,2.2,shade,.35);q.restore();}
function torso(a,chest,pelvis,armorMap,back){const q=get(),g=a.g,b=g.body,skin=g.appearance.skin,shade=g.appearance.shade,cloth=g.appearance.cloth||'#55938e',bare=a.unarmored,lean=chest.x,sex=g.sex==='female';q.save();q.translate(0,-30);q.transform(1,0,-lean/21,1,0,0);if(sex)q.scale(1+((g.appearance.silhouette||1)-1)*.2,1);const dark=mix(cloth,'#172323',.52),light=mix(cloth,'#e8ddaf',.29),paint=bare?gradient(-9,0,9,0,mix(skin,'#f4d5ad',.25),skin,shade):gradient(-10,0,10,0,light,cloth,dark);
if(!b.belly.missing){shape('M -9 -12 Q -9 -4 -7 1 L 8 1 Q 9 -4 9 -12 Z',paint);if(!bare){shape('M -8 -1 Q 0 1 8 -1 L 11 11 Q 0 14 -11 11 Z',dark);for(let n=-2;n<=2;n++){q.save();q.translate(n*4,0);shape('M -1.7 0 L 1.7 0 L 2.1 10 Q .1 12 -1.9 10 Z',gradient(-2,0,2,0,light,cloth,dark),'#302b24',.45);dot(.1,1.9,.6,.55,'#c6a66a');q.restore();}}}
if(!b.chest.missing){shape(sex?'M -7 -24 Q -10 -23 -10 -18 Q -11 -13 -7 -9 L -6 -5 Q 0 -3 7 -5 L 8 -11 Q 11 -15 10 -20 L 7 -24 Q 0 -20 -7 -24 Z':'M -7 -24 Q -11 -24 -11 -19 L -9 -10 Q -7 -8 -7 -5 L 7 -5 Q 8 -10 10 -14 L 11 -21 Q 9 -24 7 -24 Q 0 -21 -7 -24 Z',paint);if(bare&&back){shape('M -6 -19 Q -3 -15 -4 -11 M 6 -19 Q 3 -15 4 -11 M 0 -19 L 0 -6',null,shade,.65);}else if(bare){line(-7,-18,-1,-16,shade,.65);line(1,-16,7,-18,shade,.65);line(0,-14,0,-6,mix(skin,shade,.5),.55);for(const y of [-11,-7]){line(-5,y,-1,y+.5,shade,.45);line(1,y+.5,5,y,shade,.45);}}else{shape('M -5 -23 Q 0 -18 5 -23',null,dark,1.1);line(-6,-17,-4,-6,light,.8);line(4,-14,6,-6,dark,.8);line(-1,-15,1,-9,dark,.45);if(sex&&!back){shape('M -7 -16 Q -4 -12 -1 -14 M 1 -14 Q 4 -12 7 -16',null,dark,.65);}}}
if(!bare&&!b.belly.missing){rounded(-9,-2,18,3,'#59402d',.5);line(-8,-1.6,8,-1.6,'#a17f4f',.6);if(!back){rounded(-2.4,-2.5,4.8,4,'#d8b36a',.6);rounded(-1.4,-1.6,2.8,2.1,'#4b3729',.3);line(0,-1.6,0,.4,'#e6ca85',.65);}}
q.restore();if(armorMap.chest&&!b.chest.missing)armorChest(armorMap.chest,chest.x,chest.y+7);
if(a.forgeWorker&&!b.chest.missing){q.save();q.translate(chest.x,chest.y+2);shape('M -5 1 L -7 4 L -8 28 Q 0 33 9 28 L 7 4 L 5 1 Z',gradient(-8,0,8,0,'#9a7852','#6b5038','#3f3026'));shape('M -4 1 Q 0 -5 4 1',null,'#b29263',1.3);line(-6,5,-6,25,'#b79a6b',.6);shape('M -4 13 L 5 13 L 4 19 Q 0 21 -4 18 Z','#51402e','#b3915c',.5);line(-3,22,4,24,'#3b2a22',.65);dot(4,9,1.7,1.2,'#3f332b');q.restore();}
if(a.trader&&!b.chest.missing){q.save();q.translate(chest.x,chest.y+2);shape('M -9 -1 Q -12 8 -13 34 Q 0 38 13 34 L 9 -1 L 3 6 L -3 6 Z',gradient(-13,0,13,0,'#97619a','#663978','#35243e'));for(const x of [-9,-5,5,9])shape(`M ${x} 9 Q ${x-2} 24 ${x} 34`,null,'#bc85b144',.7);shape('M -9 -1 L -1 9 L 8 -1 M -12 33 Q 0 37 12 33',null,'#d5b162',1.2);rounded(-12,20,24,3,'#3c2924',.6);if(!back)rounded(-2,19,4,5,'#e2c176',.5);shape('M 7 23 Q 15 20 14 27 L 13 32 Q 9 35 6 30 Z','#a17b3f','#38291d');dot(10,25,.9,.9,'#e7c475');q.restore();}
if(a.lanista&&!b.chest.missing){q.save();q.translate(chest.x,chest.y);shape('M -7 -1 Q -12 7 -9 17 L -6 31 Q 3 36 10 28 L 7 18 Q 0 13 -1 8 L 6 -3 L 8 3 Q 4 11 0 12',gradient(-9,0,10,0,'#f1e4c2','#d5c49a','#9c8c68'));shape('M 6 -1 Q 0 12 -7 22',null,cloth,3.4);shape('M -6 13 Q -2 25 7 28 M -6 21 Q -1 29 5 30',null,'#a49573',.7);dot(5,-.5,1.7,1.5,'#d0ac61');dot(5,-1, .7,.5,'#fff0bb');q.restore();}if(!a.unarmored&&!b.belly.missing){for(const id of ['lt','rt']){const p=b[id];if(p&&!p.missing&&(p.bleed>0||p.fracture)){q.save();q.beginPath();q.moveTo(-8,-29);q.lineTo(8,-29);q.lineTo(11,-19);q.quadraticCurveTo(0,-16,-11,-19);q.closePath();q.clip();wound({x:id==='lt'?-6:6,y:-23},{...p,fracture:false,hp:100,wounds:[],bleed:Math.max(1,p.bleed||0)},id,a,false);q.restore();}}}}
function armorChest(it,x,y){const q=get(),p=M.itemLook(it),Q=it.q||0,leather=it.material==='leather',medium=it.material==='medium',base=leather?p.leather||p.metal:medium?p.leather:p.metal;q.save();q.translate(x,y);shape('M -7 -11 L -10 -8 Q -8 -4 -9 2 L -7 9 Q 0 11 8 9 L 9 2 Q 8 -4 10 -8 L 7 -11 Q 0 -7 -7 -11 Z',gradient(-9,-4,10,4,p.edge,base,p.dark||mix(base,'#232624',.5)));
if(rear){shape('M -7 -8 Q 0 -10 7 -8 M 0 -8 L 0 7',null,p.dark||'#454334',.7);for(const x of [-7,7]){line(x,-7,x,6,p.leather||'#765639',1.6);for(const y of [-5,4])dot(x,y,.5,.5,p.trim);}if(leather){shape('M -5 -6 L 5 6 M 5 -6 L -5 6',null,p.edge,.55);}else if(medium){for(let y=-5;y<7;y+=3)shape(`M -6 ${y} Q 0 ${y+1} 6 ${y}`,null,p.metal,1.4);}else{shape('M -6 -5 Q -2 -6 -1 -2 M 6 -5 Q 2 -6 1 -2',null,p.edge,.7);}shape('M -7 8 Q 0 10 7 8',null,Q>=4?p.trim:p.edge,.85);if(Q>=5)shape('M -6 -8 Q 0 -11 6 -8',null,p.trim,1);q.restore();return;}
if(leather){shape('M -6 -8 Q 0 -5 6 -8 M -7 6 Q 0 9 7 6',null,p.dark,1);if(Q>=2)for(const z of [-1,1])for(let y=-5;y<6;y+=3)dot(z*6,y,.45,.45,p.stud||p.edge);if(Q>=3){shape('M -6 -6 L 6 6 M 6 -6 L -6 6',null,p.dark,1.1);for(const x of [-4,4])for(const y of [-4,3])dot(x,y,.8,.7,p.stud||p.edge);}}
else if(medium||Q===3){for(let y=-6;y<8;y+=3.3){shape(`M -7 ${y} Q 0 ${y+2} 7 ${y}`,null,p.dark||'#484b43',1.8);shape(`M -7 ${y-.6} Q 0 ${y+1.4} 7 ${y-.6}`,null,p.edge,.6);for(const x of [-5,5])dot(x,y,.45,.45,p.trim);}}
else{shape('M -7 -6 Q -4 -2 -1 -5 M 1 -5 Q 4 -2 7 -6 M 0 -6 L 0 7',null,p.edge,.75);if(Q>=2)for(const y of [0,3,6]){shape(`M -6 ${y} Q -3 ${y+1} -1 ${y} M 1 ${y} Q 3 ${y+1} 6 ${y}`,null,p.edge,.55);}if(Q===0){shape('M -5 -6 L 3 6 M -3 -4 L 4 -2',null,'#716751',.8);}}
shape('M -7 -10 Q 0 -6 7 -10 M -7 8 Q 0 10 7 8',null,Q>=4?p.trim:p.edge,Q>=5?1.2:.7);if(Q>=4){for(const x of [-7,7])for(const y of [-6,5])dot(x,y,.65,.65,p.trim);}if(Q>=5){shape('M 0 -5 Q -2 -1 -5 -2 Q -4 1 -1 2 L 0 5 L 1 2 Q 4 1 5 -2 Q 2 -1 0 -5 Z',p.trim,'#76613d',.45);dot(0,.2,Q===6?1.6:1,Q===6?2:1.3,Q===6?(p.gem||'#9b403c'):p.cloth);dot(-.4,-.5,.5,.65,p.edge);}q.restore();}
function armorSegment(it,a,b,w){const q=get(),p=M.itemLook(it),Q=it.q||0,len=Math.hypot(b.x-a.x,b.y-a.y);if(len<5)return;const soft=it.material==='leather',mixed=it.material==='medium',base=soft||mixed?p.leather||p.metal:p.metal;q.save();q.translate(a.x,a.y);q.rotate(Math.atan2(b.y-a.y,b.x-a.x));const h=w/2;q.beginPath();q.moveTo(1,-h*.6);q.quadraticCurveTo(len*.5,-h-1,len-1,-h*.65);q.lineTo(len,h*.65);q.quadraticCurveTo(len*.5,h+.3,1,h*.8);q.closePath();q.fillStyle=gradient(0,-h,0,h,p.edge,base,p.dark||mix(base,'#29302a',.4));q.fill();q.strokeStyle='#3c382d';q.lineWidth=.5;q.stroke();if(rear){for(const x of [3,len-3]){line(x,-h*.8,x,h*.8,p.leather||'#6b4e32',1.8);rounded(x-.8,-.7,1.6,1.5,p.trim,.2);}line(2,h*.5,len-2,h*.5,p.edge,.55);q.restore();return;}for(const x of [2,len-3])line(x,-h*.7,x,h*.7,Q>3?p.trim:soft?p.dark:p.trim,1);if(Q>=2)line(4,-h*.5,len-4,-h*.5,p.edge,.6);if(mixed)for(let x=4;x<len-4;x+=4)line(x,-h*.7,x,h*.7,p.metal,1.8);if(Q>=3)for(const x of [3,len-3])dot(x,0,.6,.6,p.trim);if(Q>=5){line(1,-h*.8,len-1,-h*.8,p.trim,.6);line(1,h*.8,len-1,h*.8,p.trim,.6);}if(Q===6)dot(len/2,0,1.3,1,p.gem||'#9d4c39');q.restore();}
function shoulder(it,x,y){const q=get(),p=M.itemLook(it),Q=it.q||0,base=it.material==='metal'?p.metal:p.leather||p.metal;q.save();q.translate(x,y);shape('M -6 3 Q -7 -4 -1 -5 Q 5 -5 7 3 Q 0 6 -6 3 Z',gradient(-5,-3,6,4,p.edge,base,p.dark||'#464537'));if(rear){shape('M -5 2 Q 0 4 5 2 M -4 3 L -3 6 M 4 3 L 3 6',null,p.trim,.75);dot(-3,2,.6,.6,p.edge);dot(3,2,.6,.6,p.edge);q.restore();return;}if(Q>=2)shape('M -6 2 Q 0 5 7 2 L 6 5 Q 0 7 -6 5 Z',base,p.trim,.65);if(Q>=3){dot(-4,1,.7,.7,p.trim);dot(4,1,.7,.7,p.trim);}if(Q>=5)shape('M -5 -1 Q 0 -6 5 -1',null,p.trim,.9);if(Q===6){shape('M -2 -1 L 0 -4 L 2 -1 L 0 2 Z',p.trim);dot(0,-1,.7,.9,p.gem||'#af5840');}q.restore();}
function shield(it,x,y,ang=0,team=0,flash=false,spears=0,axes=0){const q=get(),p=M.itemLook(it),Q=it.q||0,id=it.def,round=['buckler','smallshield','roundshield'].includes(id),size=id==='tower'?1.3:id==='buckler'?.65:id==='smallshield'?.82:1;q.save();q.translate(x,y);q.rotate(ang);q.scale(size,size);const outline=round?'M 12 0 A 12 12 0 1 1 -12 0 A 12 12 0 1 1 12 0 Z':'M -8 -13 Q 0 -15 8 -13 Q 11 0 8 13 Q 0 15 -8 13 Q -11 0 -8 -13 Z';shape(outline,gradient(-10,-7,10,7,p.edge,p.metal,p.dark||'#454d44'),'#302d28',.8);if(rear){q.save();q.scale(.86,.88);shape(outline,p.leather||'#796046',p.edge,.6);q.restore();for(const y of [-7,-3,1,5,9])line(-7,y,7,y,'#46372b',.45);for(const x of [-4,4]){shape(`M ${x-1.5} -5 Q ${x+2} 0 ${x-1.5} 5`,null,'#38271f',2.3);dot(x-1,-5,.8,.7,p.trim);dot(x-1,5,.8,.7,p.trim);}q.restore();return;}q.save();q.scale(.83,.86);shape(outline,gradient(-10,0,10,0,mix(team?'#854b3e':p.cloth,'#dac49a',.23),team?'#854b3e':p.cloth,mix(p.cloth,'#1a2425',.55)),p.trim,.7);q.restore();if(Q===0){shape('M -7 -6 L 5 7 M -3 -8 L 6 -4',null,'#8c734e',1.2);}else{shape(Q===1?'M 0 -9 L 0 9':Q===2?'M 0 -10 L 0 10 M -7 0 L 7 0':Q===3?'M -6 -7 L 6 7 M 6 -7 L -6 7':'M 0 -10 L -3 -4 L -7 -7 L -5 1 L -1 4 L 0 10 L 1 4 L 5 1 L 7 -7 L 3 -4 Z',Q>=4?p.trim:null,p.trim,1.1);}for(let i=0;i<(Q>3?12:8);i++){const a=i*Math.PI*2/(Q>3?12:8);dot(Math.cos(a)*10,Math.sin(a)*(round?10:11.5),.5,.5,p.edge);}dot(0,0,3.6,3.6,'#413b30');dot(-.2,-.2,3.1,3.1,p.metal);dot(-.7,-.8,2,1.8,p.edge);dot(.6,.8,1.8,1.4,p.trim);if(Q===6)dot(0,0,1,1,p.gem||'#a14c36');for(let i=0;i<3;i++)line(-5+i*3,4+i,-3+i*3,2+i,p.edge,.35);if(flash){q.globalAlpha=.3;shape(outline,'#fff2cb',null);q.globalAlpha=1;}for(let n=0;n<spears;n++){line(-2,-6+n*6,-32-n*4,-22+n*6,'#9b7d51',1.6);}for(let n=0;n<axes;n++){line(1,-7+n*7,-18-n*3,7+n*7,'#85603a',2.4);rounded(-3,-11+n*7,7,9,p.metal,1);}q.restore();}
function helm(h,it,back){const q=get(),p=M.itemLook(it),Q=it.q||0,soft=it.material==='leather',mixed=it.material==='medium',base=soft?p.leather||p.metal:p.metal;q.save();q.translate(h.x,h.y);if(Q>=3){shape('M -2 -9 Q -6 -16 0 -19 Q 4 -18 6 -14 L 3 -8 Z',p.cloth,'#342921',.7);for(let i=-1;i<4;i++)line(i,-17,i+1,-10,mix(p.cloth,p.edge,.3),.55);}shape('M -9 1 Q -10 -8 -6 -10 Q 0 -14 6 -10 Q 10 -6 9 1 L 5 -1 Q 0 -3 -5 -1 Z',gradient(-9,-7,9,1,p.edge,base,p.dark||'#454d45'));shape('M -9 -.5 Q 0 -4 9 -.5',null,Q>=2?p.trim:p.edge,1.1);if(back){shape('M -8 -1 Q 0 -3 8 -1 L 8 5 Q 0 8 -8 5 Z',gradient(-8,0,8,5,p.edge,base,p.dark||'#454d45'));shape('M -8 5 Q 0 8 8 5',null,Q>=2?p.trim:p.edge,.9);for(const x of [-6,6])dot(x,3,.55,.55,p.trim);}if(Q>=1&&!back){shape('M -8 0 L -5 1 L -4 6 L -7 9 L -9 6 Z',base,p.trim,.55);if(!back)shape('M 7 0 L 5 2 L 5 6 L 7 8 L 9 4 Z',base,p.trim,.55);}if(mixed||Q>=4)shape('M -5 -9 Q 0 -12 5 -9 M 0 -11 L 0 -4',null,p.trim,.9);if(Q>=2&&!back)shape('M .7 -2 L 2.1 -2 L 2.6 5 L 1.1 6 Z',p.trim,null);if(soft)for(let x=-6;x<=6;x+=2)dot(x,-4,.35,.35,p.edge);else line(-6,-7,-7,-3,p.edge,.8);if(Q>=5){shape('M -9 -5 Q -11 -10 -7 -12 L -7 -8 M 9 -5 Q 11 -10 7 -12 L 7 -8',null,p.trim,1.1);dot(0,-6,1.1,1.1,p.trim);}if(Q===6){dot(0,-6,.7,.9,p.gem||'#b45d43');line(0,-20,1,-16,p.edge,1);}if(Q===0)shape('M -7 -6 L 6 -4',null,p.cloth,1.6);q.restore();}
function head(h,a,back,mood){const q=get(),ap=a.g.appearance,key=[ap.skin,ap.shade,ap.hair,ap.style,ap.beard,a.g.sex,back,mood,!!a.eyesClosed,!!a.charred].join('|');let cv=heads.get(key);if(!cv){cv=document.createElement('canvas');cv.width=128;cv.height=144;const z=cv.getContext('2d');const inner=window.FigureSkin.createHead(z);inner(ap,a.g.sex,back,mood,a.eyesClosed,a.charred);if(heads.size>=192)heads.delete(heads.keys().next().value);heads.set(key,cv);}q.save();q.imageSmoothingEnabled=true;q.drawImage(cv,h.x-16,h.y-20,32,36);q.restore();if(a.throatCut){line(h.x-3,h.y+10,h.x+4,h.y+10.5,'#611c24',1.3);line(h.x-2,h.y+11,h.x,h.y+13,'#a93436',.65);}}
function wound(pt,p,id,a,armored=false){const q=get(),sev=Math.max(0,Math.min(1,(100-p.hp)/100)),stain=Math.min(1,a.bloodMarks?.[id]||0),hasWound=p.hp<90&&p.wounds?.length,broken=!!p.fracture,bleeding=Math.max(0,p.bleed||0);if(!broken&&!hasWound&&!stain&&!bleeding)return;
q.save();q.translate(pt.x,pt.y);const broad=['chest','belly'].includes(id),w=broad?6:id==='head'?3.8:2.4,h=broad?7:id==='head'?5:4;
const type=String(p.wounds?.[0]?.type||'').toLowerCase(),bruise=/prell|stump|quetsch/.test(type)&&!broken;
// Pigment is painted onto the visible clothing/armor in the same surface pass.
if(stain||bleeding||broken||hasWound&&!bruise){q.save();q.scale(w/4,h/5);shape('M -3 -.7 Q -4 -3 -1.6 -3.4 L -.4 -4.8 Q 1 -3.6 2.7 -4 Q 4 -2 2.9 -.4 L 3.8 1.9 Q 2.1 3.6 .7 3 L -.6 4.6 Q -2.8 4 -2.4 2 Q -4.1 1.8 -3 -.7 Z',armored?'#49191f99':'#4d1824bb',null);shape('M -2.3 -1.5 Q -1 -3.2 .5 -2.4 L 2.5 -1.4 L 1.6 1.8 L .1 3 L -1.9 2.1 Z','#7f2632cc',null);q.restore();}
if(broken){shape('M -1.5 -3.4 L 1 -2.7 L 2.1 -.8 L .9 2.2 L -1 3.6 L -2.2 1 L -.6 -.7 Z','#3c1520','#bf5e59',.6);if(!armored&&!a.dressings?.[id]){shape('M -1.2 2.3 L -.2 -.2 L -1.1 -1.1 L .4 -3.4 L 1.6 -1.9 L .7 .2 L 1.2 1.2 L .1 3 Z','#d6c6a3','#665144',.45);shape('M -.3 1.8 L .5 -.7 L .2 -1.2 L .6 -2.5',null,'#fff0cd',.7);line(-.4,-.8,.9,-.2,'#805145',.5);}else if(armored){shape('M -2.4 -3 L .2 -.8 L -1 0 L 2.3 2.7',null,'#201c1c',1.1);line(-1.8,-2.9,.5,-.9,'#ddd0ae',.45);}}
else if(hasWound){if(bruise){dot(0,0,w*.9,h*.65,'#59384d88');dot(-.5,.5,w*.55,h*.48,'#8d4f5c88');}else if(/stich|biss/.test(type)){dot(0,0,1.1+sev,.65+sev*.5,'#39151d');line(-.8,-1.3,1,-.8,'#d17d67',.5);if(/biss/.test(type))for(let n=0;n<3;n++)dot(-1.8+n*1.6,2,.45,.55,'#411522');}else{shape('M -1 -3.5 Q .5 -2 -.6 -.2 Q 1.5 1 .5 3.2',null,'#39151f',.8+sev*1.2);shape('M -.6 -3.5 Q .9 -2 -.2 -.2 Q 1.9 1 .9 3.2',null,'#d07265',.45);}}
if(bleeding>0||broken){const m=q.getTransform(),len=Math.hypot(m.a,m.c)||1,handed=m.a*m.d-m.b*m.c<0?-1:1,gx=-m.c*handed/len,gy=m.a*handed/len,flow=Math.min(broad?8:6,3+bleeding*.65),phase=((renderTime*.7+(a.seed||0)*.013+id.length*.17)%1+1)%1;for(let i=0;i<2;i++){const off=i?1:-.4,x=off+gx*flow,y=.7+gy*flow;q.beginPath();q.moveTo(off,.7);q.quadraticCurveTo(off+gx*flow*.45+.45,.7+gy*flow*.45,x,y);q.strokeStyle=i?'#74232d':'#a3383f';q.lineWidth=i?.55:1;q.lineCap='round';q.stroke();const u=.15+.85*phase;dot(off+gx*flow*u,.7+gy*flow*u,.4,.6,'#d2665c');dot(x,y,.6,.85,'#85232d');}}
q.restore();}
function scar(pt,shade){line(pt.x-1.7,pt.y-3,pt.x+.7,pt.y+2.8,shade,.75);line(pt.x-1.2,pt.y-3,pt.x+1.2,pt.y+2.8,'#d6a18c',.4);for(let i=0;i<3;i++)line(pt.x-2+i*.7,pt.y-2+i*1.7,pt.x+i*.7,pt.y-2.8+i*1.7,shade,.45);}
function dressing(pt){const q=get();q.save();q.translate(pt.x,pt.y);shape('M -4 -4 Q 0 -5 4 -3 L 4 3 Q 0 5 -4 3 Z','#d8c9a8','#81775d',.6);for(let y=-3;y<4;y+=1.8)line(-3.5,y,3.7,y+.9,'#f0e4c5',.7);dot(.6,.8,1.5,1,'#9c574752');q.restore();}
function surface(pt,p,id,a,item,from,to){if(!pt||!p||p.missing)return;if(!p.fracture&&!(p.hp<90&&p.wounds?.length)&&!(a.bloodMarks?.[id]>0)&&!a.dressings?.[id]&&!(a.g.scars||[]).some(s=>s.part===id))return;const q=get();q.save();q.translate(pt.x,pt.y);const limb=from&&to&&Math.hypot(to.x-from.x,to.y-from.y)>.1;if(limb)q.rotate(Math.atan2(to.y-from.y,to.x-from.x)-Math.PI/2);
// The mask is derived from the actual posed bone, not a free-floating decal.
const hand=id.endsWith('h')&&id!=='chest',foot=['lf','rf'].includes(id),width=id.endsWith('s')?3.7:id.endsWith('t')?3.2:id.endsWith('sh')?2.7:hand?2.6:2.35;
q.beginPath();if(limb){const length=Math.hypot(to.x-from.x,to.y-from.y),half=hand||foot?2:Math.max(1,length/2-.6);q.roundRect(-width,-half,width*2,half*2,Math.min(width,half));}else{const w=id==='head'?4.7:id==='neck'?2.6:['ls','rs'].includes(id)?3.6:6.4,h=id==='head'?7:id==='neck'?2.7:['ls','rs'].includes(id)?3.4:id==='belly'?4.5:8;q.ellipse(0,0,w,h,0,0,TAU);}q.clip();const zero={x:0,y:0};wound(zero,p,id,a,!!item);if(a.dressings?.[id]){dressing(zero);if(p.bleed>0||p.fracture){dot(.3,.8,2,1.5,'#732635bb');line(.3,.8,.8,3.3,'#9f3842',.6);}}if(!item&&(a.unarmored||!['chest','belly','lt','rt','lf','rf'].includes(id))&&!p.fracture&&(a.g.scars||[]).some(s=>s.part===id))scar(zero,a.g.appearance.shade);q.restore();}
function stump(p,w,bloody=true){const q=get();q.save();q.translate(p.x,p.y);if(!bloody){dot(0,0,w*.53,w*.3,'#d8c9a8');line(-w*.4,0,w*.4,.7,'#81775d',.65);q.restore();return;}dot(0,0,w*.56,w*.32,'#3d1720');for(let i=0;i<7;i++){const a=i*TAU/7;dot(Math.cos(a)*w*.38,Math.sin(a)*w*.2,w*.17,w*.13,i%2?'#9e3942':'#c56763');}shape(`M ${-w*.14} 1 L ${-w*.11} -1.7 L 0 -2.4 L ${w*.16} -1.2 L ${w*.12} 1.1 Z`,'#dfd1b2','#6d463c',.4);dot(0,-.1,w*.07,w*.06,'#8b4d44');line(-w*.36,.5,-w*.31,3.2,'#a33440',.9);line(w*.31,.5,w*.37,2.3,'#76242f',.7);q.restore();}

return {bone,hand,foot,torso,armorChest,armorSegment,shoulder,shield,helm,head,wound,scar,dressing,surface,stump,rounded,line,dot,shape,view:v=>{rear=!!v;},clock:t=>{renderTime=Number.isFinite(t)?t:0;},cacheSize:()=>heads.size,lod:value=>{if(value!==undefined)lowDetail=!!value;return lowDetail}};},
createHead(q){const api=window.FigureSkin.create({itemLook:()=>({})},()=>q),{shape,line,dot}=api;return (ap,sex,back,mood,closed,charred)=>{q.save();q.scale(4,4);q.translate(16,20);const sk=ap.skin,sh=ap.shade,ha=ap.hair,hd=mix(ha,'#0f1418',.5),hl=mix(ha,'#c9a374',.36),light=mix(sk,'#ffe0b4',.28),deep=mix(sh,'#302022',.35),female=sex==='female';
if(ap.style===3&&!back){shape('M -7 -6 Q -12 1 -9 14 L -5 15 L -4 4 L 5 4 L 6 15 L 10 14 Q 12 0 7 -6 Z',ha,hd,.7);for(const x of [-8,-6,7,9])shape(`M ${x} -3 Q ${x-1} 7 ${x} 13`,null,hl,.4);}
for(const x of [-7.1,7.1]){dot(x,2,1.6,3.2,sh);line(x,1,x+.2,3.6,light,.55);dot(x,2.1,.65,1.4,deep);}
const grad=q.createLinearGradient(-7,-4,7,6);grad.addColorStop(0,light);grad.addColorStop(.45,sk);grad.addColorStop(1,sh);
shape(female?'M -7 0 Q -8 -7 -4 -9 Q 0 -11 5 -8 Q 8 -6 7 1 L 6 7 Q 3 11 0 11 Q -4 10 -6 6 Z':'M -7 0 Q -8 -7 -4 -9 Q 1 -11 6 -7 Q 8 -4 7 2 L 6 8 L 2 11 L -3 10 L -6 7 Z',grad,deep,.6);
shape('M 4 -7 Q 7 -2 5 3 L 6 6 L 3 9 Q 6 6 6 1 Z',sh,null);shape('M -5 -5 Q -2 -8 1 -6 L 0 -4 L -4 -3 Z',light,null);
if(!back){const hurt=['pain','dead','unconscious'].includes(mood),angry=['angry','shout'].includes(mood),fear=mood==='fear',laugh=['laugh','happy'].includes(mood),shut=closed||hurt||mood==='tired';for(const x of [-3.5,3.3]){dot(x,1.6,2,1.5,mix(sh,deep,.2));if(shut){shape(`M ${x-1.5} 1.8 Q ${x} ${hurt?2.6:1.1} ${x+1.5} 1.6`,null,deep,.6);}else{dot(x,1.5,1.3,fear?1.15:.68,'#eee3c8');dot(x+.35,1.6,.6,fear?.85:.64,'#403a30');dot(x+.5,1.7,.35,.65,'#181e1b');dot(x+.2,1.2,.23,.23,'#fff3d7');}const inn=x<0?1:-1;line(x-inn*1.6,-.8,x+inn*1.5,angry?.65:fear?-1.5:.15,hd,female?.85:1.05);if(!shut&&!fear){line(x-1.25,.95,x+1.25,1.05,deep,.55);line(x-1.35,-1.5,x+1.2,-1.2,mix(sh,sk,.4),.45);}line(x-1.3,3.5,x+1.2,3.7,mix(sh,sk,.25),.5);}
shape('M .2 .1 L -.5 4 L 1.3 4.7 L 2.4 3.8',null,sh,.65);line(.4,.4,.9,3.3,light,.7);dot(.1,4.5,.55,.35,deep);dot(1.7,4.5,.4,.3,deep);
if(['shout','fear','laugh'].includes(mood)){dot(.4,7.4,2.4,mood==='shout'?2.8:1.9,deep);line(-1.4,6.3,2,6.3,'#ebdabb',.8);dot(.7,8.5,1.3,.55,'#b96d66');}else if(hurt){line(-2,7.5,2.8,6.8,deep,.9);line(-1.6,7.4,2.3,7,'#ded0b1',.45);}else{shape(laugh?'M -2 6.8 Q .4 9.4 3 6.7':'M -2 7.1 Q .5 7.8 3 7.1',null,deep,.6);line(-1,8.5,2,8.4,mix(sk,'#c77e6c',.3),.55);}line(-1.8,10,1.7,10,light,.6);shape('M -5 5.2 L -3.4 6.4 M 4 5.1 L 5.2 4.3 M -.8 -1.6 L -.5 -.2 M 1.2 -1.6 L .9 -.2',null,mix(sh,deep,.3),.45);shape('M -5.5 4 Q -4 5.8 -2.9 5.4 M 3.7 5.1 Q 5 4.7 5.5 3.3',null,mix(sh,sk,.4),.45);shape('M -3 -4 Q 0 -4.7 3 -4 M -2 -2.8 Q .5 -3.2 2.2 -2.8',null,mix(sh,sk,.65),.32);
if(ap.beard){const long=ap.beard===3;shape(long?'M -6 4 Q -4 8 -2 8 L 0 9 L 3 8 Q 6 7 6 4 L 6 9 L 3 14 L -1 15 L -5 11 Z':'M -6 4 Q -4 8 -1 8 L 2 8 Q 5 7 6 4 L 6 8 L 2 12 L -2 11 L -5 9 Z',ha,hd,.4);for(let x=-4;x<5;x+=.85)line(x,8.9,x+.4,long?12.5:10.2,hl,.28);if(ap.beard===2){shape('M -3 6 Q 0 4.5 3.5 6',null,ha,1.1);}}
}else{shape('M -4 -5 Q 0 -8 4 -5 L 5 5 Q 1 9 -3 6 Z',mix(sk,sh,.45),null);}
if(back&&ap.style===3){shape('M -8 0 Q -9 -9 -3 -10 Q 3 -12 7 -7 Q 9 -2 9 5 L 10 14 Q 6 16 3 13 L 0 14 L -3 13 Q -6 16 -10 14 L -9 5 Z',ha,hd,.65);for(let i=0;i<11;i++){const x=-7.5+i*1.5;shape(`M ${x*.7} -7 Q ${x+Math.sin(i)*.6} 2 ${x} ${12+(i%3)*.6}`,null,i%3===0?hd:hl,.35);}q.restore();return;}
if(back){shape('M -7 -2 Q -8 -8 -3 -10 Q 3 -11 7 -6 L 7 2 Q 6 7 3 8 L 2 11 L -2 11 L -3 8 Q -7 6 -7 -2 Z',ap.style===0||ap.style===5?mix(sk,sh,.55):ha,deep,.6);if(ap.style!==0&&ap.style!==5){for(let i=0;i<8;i++){const x=-5.5+i*1.55;shape(`M ${x*.8} -7 Q ${x+1} 0 ${x*.65} 7`,null,hl,.35);}shape('M -3 7 Q 0 6 3 7 L 2 11 L -2 11 Z',sh,null);}else{shape('M -4 -5 Q 0 -8 4 -5 M -5 -1 Q 0 -4 5 -1',null,mix(sh,sk,.25),.55);for(let i=0;i<22;i++)dot(Math.sin(i*2.4)*5,Math.cos(i*1.7)*5,.17,.22,mix(ha,sh,.6));}line(-2.3,8,-1.6,10,light,.45);line(2.3,8,1.6,10,deep,.45);if(ap.style===5){shape('M -1.8 7 L -2 -9 L 0 -17 L 2.4 -11 L 2.3 7 L .3 9 Z',ha,hd,.55);line(0,-14,.5,6,hl,.65);}if(ap.style===4){dot(0,-10,3.8,3.2,hd);dot(-.5,-10.8,3,2.5,ha);line(-2,-11,1,-12,hl,.5);}q.restore();return;}
if(ap.style!==0){shape('M -8 -.5 Q -10 -8 -5 -10 Q 0 -13 6 -9 Q 9 -7 8 -1 L 5 -3 L 4 -6 Q 0 -3 -4 -5 L -6 -2 Z',ha,hd,.65);for(let i=0;i<7;i++){const x=-6+i*1.7;shape(`M ${x} -8 Q ${x-1} -6 ${x-.5} -4.8`,null,hl,.45);}if(ap.style===2){shape('M -8 -3 Q -10 1 -7 8 L -5 6 L -6 0 M 7 -4 Q 10 1 8 8 L 6 6 L 6 0',ha,hd,.5);}if(ap.style===4){dot(-.3,-12.2,3.8,3.2,hd);dot(-.8,-12.8,3,2.5,ha);shape('M -3 -13 Q 0 -15 2 -12',null,hl,.6);}if(ap.style===5){shape('M -2 -6 L -2 -13 L 0 -17 L 2 -14 L 3 -6 Z',ha,hd,.5);line(0,-14,1,-7,hl,.65);}}else{shape('M -7 -5 L -6 -2 L -6 1 M 7 -4 L 6 1',null,ha,1.2);line(-3,-7,1,-7,light,.6);}if(charred){shape('M -5 -6 Q 2 -7 6 -3 L 4 2 L 6 6 L 1 9 L -4 6 L -6 1 Z','#352926c9',null);line(-3,-2,2,4,'#a1664c',.5);}q.restore();};}
};
})();

}
/* Full-body seller, same public HS.art.seller(context, options) contract. */
(()=>{'use strict';let current;const M=window.MG,V=FigureSkin.create(M,()=>current),{shape,line,dot,bone}=V;
function handsFor(pose,t,ph,by){const w=Math.sin(t*12),f=Math.sin(t*14);switch(pose){case 'walk':return [[-6+Math.sin(ph)*3,-25+by],[6-Math.sin(ph)*3,-26+by]];case 'pull':return [[-11,-24+by],[6-Math.sin(ph)*3,-26+by]];case 'sell':return [[-11,-31+by],[9,-50+by+w*2]];case 'flail':return [[-11,-47+by+f*4],[11,-47+by-f*4]];case 'point':return [[-6,-26+by],[13,-38+by]];case 'knock':return [[-6,-26+by],[11,-31+by+Math.abs(Math.sin(t*10))*3]];case 'hug':return [[-2,-30+by],[4,-31+by]];default:return [[-8,-26+by],[8,-26+by]];}}
window.FigureSeller={paint(q,o){const prior=current;current=q;q.save();try{const d=o.dir||1,t=o.t||0,ph=o.phase||0,pose=o.pose||'stand',walking=['walk','pull'].includes(pose),s=walking?Math.sin(ph):0,by=-(walking?Math.abs(Math.cos(ph))*1.2:pose==='flail'?Math.abs(Math.sin(t*14))*1.5:Math.sin(t*2.2)*.4),scale=o.scale??1.22;q.translate(o.x,o.y);q.scale(d*scale,scale);dot(0,1,12,3,'#1d201c45');const feet=walking?[[-2,-2-s*4,Math.max(0,-Math.cos(ph))*2],[2,3+s*4,Math.max(0,Math.cos(ph))*2]]:[[-2,-3,0],[2,3,0]];for(const [hip,fx,lift]of feet){const p={x:hip,y:-17+by},f={x:fx,y:-2-lift};bone(p,f,3.3,'#80648c');for(let i=1;i<5;i++){const k=i/5,x=p.x+(f.x-p.x)*k,y=p.y+(f.y-p.y)*k;line(x-1.3,y,x+1.3,y+.3,'#d8bc66',1);}V.foot(f,'#573c2e','#30251e',false,false);}
q.save();q.translate(0,by);shape('M -6 -28 Q -9 -22 -11 -13 Q 0 -9 12 -13 Q 8 -23 6 -28 Z','#4d3b31');const cols=['#ad4c45','#416d86','#c29a45','#637e4b','#80618c'];for(let i=0;i<5;i++){const x=-8+i*4;shape(`M ${x*.65} -27 L ${(x+3.8)*.65} -27 L ${x+4.7} -13 Q ${x+2} -12 ${x-.4} -13 Z`,cols[i],'#372e28',.4);line(x+1,-21,x+1.6,-14,'#f2d5a633',.5);}shape('M -10 -14 Q 0 -10 11 -14',null,'#c8a76a',1);shape('M -1 -27 L 6 -27 L 7 -16 Q 3 -14 -1 -16 Z','#b3a17b','#706043',.6);shape('M 1 -24 Q 0 -20 2 -17',null,'#e0cba0',.65);dot(4,-19,1.4,.8,'#766447');
shape('M -5 -37 Q 0 -40 5 -37 L 6 -27 Q 0 -25 -6 -27 Z','#cfbd96');shape('M -5 -37 L -1 -36 L -2 -27 L -6 -27 Z','#45633a');shape('M 5 -37 L 1 -36 L 2 -27 L 6 -27 Z','#648447');line(-4,-35,-3,-28,'#91aa68',.7);line(4,-35,3,-28,'#b0b77a',.6);for(const y of [-34,-31,-28])dot(.2,y,.45,.45,'#a84b3f');q.restore();const H=handsFor(pose,t,ph,by);for(let i=0;i<2;i++){const root={x:i?4:-4,y:-35+by},hand={x:H[i][0],y:H[i][1]},elbow={x:(root.x+hand.x)/2+(i?1:-1)*1.5,y:(root.y+hand.y)/2+2};bone(root,elbow,2.8,'#d8c9a0');bone(elbow,hand,2.5,'#bba786');q.save();q.translate(hand.x,hand.y);q.scale(.55,.55);V.hand({x:0,y:0},'#e2b48a','#ad7659');q.restore();}
q.save();q.translate(0,-46+by);for(let i=0;i<18;i++){const a=i*Math.PI*2/18,x=Math.cos(a)*(9+(i%3)*1.1),y=Math.sin(a)*(8+(i%4)*.5)-1;dot(x,y,2.5,2.5,'#80391f');dot(x-.4,y-.6,1.9,1.8,i%3?'#c85e2e':'#e68a45');shape(`M ${x-1} ${y} Q ${x-1.5} ${y-2} ${x+1} ${y-1}`,null,'#f2a75c',.45);}
q.save();q.scale(.61,.61);V.head({x:0,y:1},{g:{sex:'female',appearance:{skin:'#e2b48a',shade:'#b98763',hair:'#c9562a',style:1,beard:0}},eyesClosed:false},false,['sell','flail'].includes(pose)?'shout':'happy');q.restore();dot(-4,3.3,1.2,.65,'#ce7660');dot(4,3.3,1.2,.65,'#ce7660');for(const x of [-5.2,5.2]){q.beginPath();q.ellipse(x,5,1.1,1.8,0,0,Math.PI*2);q.strokeStyle='#d9b660';q.lineWidth=.7;q.stroke();}shape('M -8 -5 Q -14 -10 -10 -15 Q -7 -12 -8 -5 Z','#df9049','#6d3b23',.4);line(-8,-6,-10,-13,'#f4c385',.45);shape('M 7 -5 Q 13 -10 12 -14 Q 8 -11 7 -5 Z','#e6dcca','#8e7b5e',.4);line(8,-6,11,-12,'#fff5d8',.4);
// The tiny nesting hen is a costume detail, independent of gameplay.
dot(0,-12.4,4,2.6,'#ebddbc');shape('M -3 -13 L -5 -15 L -4 -11 Z','#d8c5a0');dot(3.7,-14.8,1.8,1.9,'#f2e5c7');dot(3.9,-16.7,.9,.65,'#bb493b');shape('M 5 -15 L 7 -14.5 L 5 -14 Z','#d7a145');dot(4.3,-15.2,.35,.35,'#28251e');shape('M -2 -13 Q 1 -15 2 -12 Q 0 -10 -2 -13 Z','#c5b48e','#a68f68',.4);q.restore();
for(let i=0;i<10;i++){const x=-7+i*1.5,y=-37+by+Math.sin(i*1.9+t*2)*.4;q.save();q.translate(x,y);q.rotate((i-5)*.1);shape('M 0 -2 Q -2 0 0 3 Q 2 0 0 -2 Z',i%3?'#e6d9bb':'#cb7944','#8c7454',.3);q.restore();}
}finally{q.restore();current=prior;}}};})();

'use strict';
// =====================================================================================================
// KAPITEL 2 · BILDER (Pixelstil des Spiels, alles in Weltpixeln der 900 × 670 großen Ludus-Karte)
// · Die Hühnerhändlerin: eigene Figur (wilde Mähne mit brütender Henne, Federboa, Flickenrock, Ringelstrümpfe,
//   schielende Glupschaugen), Posen: gehen/ziehen, stehen, verkaufen, flattern, zeigen, klopfen, umarmen
// · Ihr Holzkarren mit drei Käfigen; die Hähne darin zeichnet ArenaArt.rooster (dieselbe Darstellung wie überall)
// · Das Hahnenschild (gemalter Hahn aus der Hahnengrafik), das Beastrium als Gebäude und als Innenraum
// =====================================================================================================
(()=>{
const M=window.MG,CF=window.CF,ART=window.ArenaArt,HS=window.HS;
const A=HS.art={};
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
function painter(g){const R=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
 const line=(x0,y0,x1,y1,w,c)=>{const n=Math.max(1,Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));for(let i=0;i<=n;i++)R(x0+(x1-x0)*i/n-w/2,y0+(y1-y0)*i/n-w/2,w,w,c);};
 return {R,line};}

// ---------- Hühnerhändlerin ----------
const COL={out:'#2a1c14',skin:'#e2b48a',skinS:'#b98763',blush:'#d0705a',hair:'#c9562a',hairL:'#ee8a3a',hairD:'#7e2f17',eye:'#f6f1df',pupil:'#160d0a',mouth:'#5c1a1a',teeth:'#f2e8cf',
 blouse:'#d8c9a0',blouseS:'#ab9b74',vest:'#4f7a3a',vestS:'#365a28',skirt:['#b13b35','#3f6aa0','#d6a93c','#5f8a3a','#8a4f8f'],hem:'#5a3b25',apron:'#9c8a5c',apronS:'#73653f',dirt:'#5a4a30',
 sock:'#6a4a7a',sock2:'#e0c34a',shoe:'#3a2a1e',fw:'#f1ecdc',fo:'#de7d2c',fb:'#9a6436',fr:'#b8322a'};
A.SELLER=COL;
// o: {x,y,dir,pose,t,phase,mouth,look}
A.seller=(g,o)=>window.FigureSeller.paint(g,o);
function drawSeller(g,o){const {R,line}=painter(g),d=o.dir||1,t=o.t||0,pose=o.pose||'stand',walking=pose==='walk'||pose==='pull';
 const X=(dx,w=1)=>d>0?o.x+dx:o.x-dx-w+1,Y=dy=>o.y+dy,P=(dx,dy,w,h,c)=>R(X(dx,w),Y(dy),w,h,c),L=(a,b,c,e,w,col)=>line(X(a),Y(b),X(c),Y(e),w,col);
 const ph=o.phase||0,s=walking?Math.sin(ph):0,bob=walking?Math.abs(Math.cos(ph))*1.2:(pose==='flail'?Math.abs(Math.sin(t*14))*1.5:Math.sin(t*2.2)*.4),by=-Math.round(bob);
 g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(o.x,o.y+1,12,3,0,0,7);g.fill();
 // Beine mit Ringelstrümpfen
 const hipY=-17+by,legs=[[-2,-2-s*4,Math.max(0,-Math.cos(ph))*2],[2,3+s*4,Math.max(0,Math.cos(ph))*2]];
 for(const [hx,fx,lift] of walking?legs:[[-2,-3,0],[2,3,0]]){const n=14;for(let i=0;i<n;i++){const k=i/n,x=hx+(fx-hx)*k,y=hipY+(-2-lift-hipY)*k;P(Math.round(x)-1,Math.round(y),3,1,(Math.floor(i/2)%2)?COL.sock:COL.sock2);}
  P(Math.round(fx)-1,-3-lift,5,3,COL.shoe);P(Math.round(fx)+2,-3-lift,2,1,'#6a5040');}
 // Flickenrock mit ausgefranstem Saum, Dreck und Federn
 const sw=walking?Math.round(s):0;
 for(let r=0;r<15;r++){const y=-27+r+by,half=6+Math.round(r*.32),x0=-half+sw*(r>8?1:0);for(let c=0;c<half*2;c+=1){const patch=Math.floor((c+(r>7?2:0))/4)+Math.floor(r/5)*2;let col=COL.skirt[patch%5];if(r===6||r===7)col=COL.hem;if(r===14&&(c+Math.floor(t*0))%3===1)continue;if(r>11&&hash(c*7+r)>.82)col=COL.dirt;P(x0+c,y,1,1,col);}}
 // Schürze vorn
 for(let r=0;r<11;r++)P(1,-26+r+by,6-(r>8?1:0),1,r%4===3?COL.apronS:COL.apron);P(3,-20+by,2,2,COL.dirt);
 // Oberkörper: Bluse, grüne Weste
 for(let r=0;r<10;r++){const y=-37+r+by;P(-5,y,11,1,COL.blouse);P(-5,y,3,1,COL.vestS);P(3,y,3,1,COL.vest);}
 P(-1,-36+by,3,8,COL.blouseS);P(0,-33+by,1,1,'#b8322a');P(0,-30+by,1,1,'#b8322a');
 // Federn am Rock
 for(const [fx,fy,col] of [[-7,-21,COL.fw],[5,-17,COL.fo],[-3,-14,COL.fb]]){P(fx,fy+by,1,5,col);P(fx-1,fy+1+by,1,3,col);P(fx+1,fy+2+by,1,2,col);P(fx,fy+5+by,1,1,COL.out);}
 // Arme
 const sh=[[-4,-35+by],[4,-35+by]],H=handsFor(pose,t,ph,by);
 for(let i=0;i<2;i++){const [sx,sy]=sh[i],[hx,hy]=H[i],ex=(sx+hx)/2+(i?1:-1)*1.5,ey=(sy+hy)/2+2;L(sx,sy,ex,ey,2,COL.blouse);L(ex,ey,hx,hy,2,COL.blouseS);P(hx-1,hy-1,3,3,COL.skin);}
 // Federboa um die Schultern
 for(let i=0;i<16;i++){const x=-7+i,y=-38+by+(i%3===0?1:0)+Math.round(Math.sin(t*6+i)*.5);P(x,y,1,3,[COL.fw,COL.fo,COL.fr,COL.fw,COL.fb][i%5]);}
 P(-8,-37+by,2,2,COL.fo);P(8,-37+by,2,2,COL.fw);
 // Kopf
 const hx=0,hy=-46+by,look=o.look??Math.sin(t*1.7)*1.2;
 hair(P,hx,hy,t,o,false);
 for(let r=0;r<9;r++)P(-3,hy+r,9,1,r>6?COL.skinS:COL.skin);P(-3,hy,2,9,COL.skinS);
 P(6,hy+3,2,2,COL.skin);P(7,hy+4,1,1,COL.blush);// Knollennase mit roter Spitze
 P(-1,hy+5,1,1,COL.blush);P(4,hy+6,1,1,COL.blush);
 // Glupschaugen, schielend
 P(2,hy+1,3,3,COL.eye);P(2+Math.round(1+look*.6),hy+2+Math.round(Math.sin(t*3.1)*.6),1,1,COL.pupil);
 P(-1,hy+2,2,2,COL.eye);P(-1+(look>0?0:1),hy+3,1,1,COL.pupil);
 P(1,hy-1+(o.mouth==='shout'?-1:0),4,1,COL.hairD);P(-2,hy,2,1,COL.hairD);// Brauen, eine hochgezogen
 const m=o.mouth||'grin';
 if(m==='shout'){P(1,hy+6,4,3,COL.mouth);P(1,hy+6,4,1,COL.teeth);P(2,hy+8,2,1,'#a83a3a');}
 else if(m==='closed'){P(1,hy+7,4,1,COL.mouth);}
 else{P(0,hy+6,6,2,COL.mouth);P(1,hy+6,4,1,COL.teeth);P(2,hy+6,1,1,COL.mouth);}
 hair(P,hx,hy,t,o,true);
}
function handsFor(pose,t,ph,by){const w=Math.sin(t*12),f=Math.sin(t*14);
 switch(pose){
  case 'walk':return [[-6+Math.sin(ph)*3,-25+by],[6-Math.sin(ph)*3,-26+by]];
  case 'pull':return [[-11,-24+by],[6-Math.sin(ph)*3,-26+by]];
  case 'sell':return [[-11,-31+by],[9,-50+by+w*2]];
  case 'flail':return [[-11,-47+by+f*4],[11,-47+by-f*4]];
  case 'point':return [[-6,-26+by],[13,-38+by]];
  case 'knock':return [[-6,-26+by],[11,-31+by+Math.abs(Math.sin(t*10))*3]];
  case 'hug':return [[-2,-30+by],[4,-31+by]];
  case 'hips':default:return [[-8,-26+by],[8,-26+by]];}}
// Wilde Mähne (hinten) und Stirnsträhnen (vorn), darin eine brütende Henne und zwei Federn
function hair(P,hx,hy,t,o,front){const cx=hx+1,cy=hy+3,j=Math.sin(t*9)*.6;
 if(!front){for(let a=0;a<64;a++){const ang=a/64*Math.PI*2,rr=8+hash(a*3.1)*4+(a%5===0?3:0)+j*hash(a);for(let r=4;r<rr;r+=1){const x=Math.round(cx+Math.cos(ang)*r*1.05),y=Math.round(cy+Math.sin(ang)*r*.95-2);if(y>hy+8&&Math.abs(x-cx)<6)continue;P(x,y,1,1,r>rr-2?COL.hairD:hash(a+r)>.75?COL.hairL:COL.hair);}}
  // Federn in der Mähne
  for(let i=0;i<6;i++){P(cx-9+i,hy-9-i,1,2,COL.fo);}P(cx-10,hy-4,1,1,COL.out);
  for(let i=0;i<5;i++){P(cx+6+i,hy-7-i*1.2,1,2,COL.fw);}
  // Henne im Haar
  const hb=Math.round(Math.sin(t*2.7)*.6),hy2=hy-12+hb;P(cx-3,hy2,7,4,'#efe4c8');P(cx-3,hy2+3,7,1,'#c9b890');P(cx+3,hy2-3,3,3,'#efe4c8');P(cx+6,hy2-2,2,1,'#e39a2a');P(cx+3,hy2-4,2,1,'#c8322a');P(cx+4,hy2-2,1,1,'#160d0a');P(cx-4,hy2-1,2,2,'#efe4c8');
 }else{P(hx-3,hy-1,9,2,COL.hair);P(hx-3,hy+1,2,4,COL.hair);P(hx+5,hy-1,2,3,COL.hairL);P(hx+1,hy+1,1,1,COL.hairD);}}

// ---------- Holzkarren mit drei Käfigen ----------
const roosterCv=new Map();
function roosterSprite(R,t,mood,face,w=30,h=26,size=15){let c=roosterCv.get(R.id+':'+w);if(!c){c=mk(w,h);roosterCv.set(R.id+':'+w,c);}const x=c.getContext('2d');x.clearRect(0,0,w,h);ART.rooster(x,R,{w,h,t,mood,size,x:w/2,y:h-2,seed:(R.seed||1)%7,face,shadow:false});return c;}
A.roosterSprite=roosterSprite;
A.CART={len:72,cage:21};
// o: {x (Mitte), y (Boden), t, roll, roosters:[R|null], sold:[bool], face, hover}
A.cart=function(g,o){const {R,line}=painter(g),x=Math.round(o.x),y=Math.round(o.y),t=o.t||0,face=o.face||-1;
 g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,y+1,38,4,0,0,7);g.fill();
 // Deichsel zur Händlerin
 if(o.handle){line(x+face*34,y-16,o.handle[0],o.handle[1],2,'#6b4a2c');line(x+face*34,y-13,o.handle[0],o.handle[1]+2,1,'#4a321e');}
 // Ladefläche
 R(x-36,y-18,72,5,'#7a5532');R(x-36,y-18,72,1,'#a8784a');for(let i=0;i<6;i++)R(x-34+i*12,y-17,1,4,'#56391f');R(x-37,y-13,74,2,'#4a321e');
 // Räder
 for(const wx of [x-23,x+23]){const cy=y-7,rr=7,ang=(o.roll||0);for(let a=0;a<24;a++){const k=a/24*Math.PI*2;R(wx+Math.cos(k)*rr-1,cy+Math.sin(k)*rr-1,2,2,'#3e2a18');}
  for(let i=0;i<4;i++){const k=ang+i*Math.PI/4;line(wx-Math.cos(k)*6,cy-Math.sin(k)*6,wx+Math.cos(k)*6,cy+Math.sin(k)*6,1,'#6b4a2c');}R(wx-1,cy-1,3,3,'#2a1c12');}
 // Käfige
 for(let i=0;i<3;i++){const cx=x-31+i*21,top=y-38,Rr=o.roosters?.[i],sold=o.sold?.[i],hov=o.hover===i;
  R(cx,top,20,20,'#2b2016');R(cx+1,top+15,18,4,'#c9a85a');for(let s=0;s<6;s++)R(cx+2+s*3,top+15+(s%2),2,1,'#e0c47a');
  if(Rr&&!sold){const sp=roosterSprite(Rr,t+i*1.3,o.moods?.[i]||(Math.sin(t*.7+i*2)>.6?'proud':'idle'),face);g.drawImage(sp,cx+10-15,top+19-24);}
  if(sold){R(cx+5,top+17,3,1,'#f1ecdc');R(cx+12,top+16,2,1,'#de7d2c');}
  // Gitter, Rahmen, Tür
  const bars=sold?[0,1,5,6]:[0,1,2,3,4,5,6];for(const b of bars)R(cx+1+b*3,top+1,1,18,'#3a2a18');
  if(sold){for(let b=0;b<4;b++)line(cx+20+b*2,top+2,cx+24+b*2,top+16,1,'#3a2a18');}
  R(cx,top,20,2,hov?'#e8c060':'#8a6a40');R(cx,top+18,20,2,'#8a6a40');R(cx,top,2,20,'#6e5030');R(cx+18,top,2,20,'#6e5030');R(cx+8,top-3,4,3,'#6e5030');
  if(o.labels){R(cx+6,top+21,8,5,'#e6d8b0');g.fillStyle='#2a1c14';g.font='bold 5px monospace';g.textAlign='center';g.fillText(String(i+1),cx+10,top+25.5);}}
 // Kram: Sack, Topf, Glocke
 R(x+30,y-26,6,8,'#b39a6a');R(x+31,y-27,4,2,'#8a744a');R(x-38,y-24,4,6,'#5e6a6a');R(x-37,y-25,2,1,'#9aa8a8');
};

// ---------- Hahnenschild: gemalter Hahn aus der Hahnengrafik des Spiels ----------
let signArt=null;
A.signRooster=null;
A.sign=function(){if(signArt)return signArt;const W=180,H=120,c=mk(W,H),g=c.getContext('2d');g.imageSmoothingEnabled=false;const {R}=painter(g);
 // Bretter
 for(let i=0;i<5;i++){const y=6+i*22;R(4,y,W-8,21,i%2?'#8a5a32':'#93633a');for(let k=0;k<9;k++)R(8+hash(i*9+k)*(W-30),y+3+hash(k*3+i)*15,10+hash(k+i)*16,1,'#6e4524');R(4,y+20,W-8,1,'#4a2e18');}
 R(0,2,W,4,'#5a3a20');R(0,H-6,W,4,'#5a3a20');R(0,2,4,H-4,'#5a3a20');R(W-4,2,4,H-4,'#5a3a20');
 for(const [x,y] of [[8,8],[W-11,8],[8,H-11],[W-11,H-11]]){R(x,y,3,3,'#3a3a3a');R(x,y,1,1,'#a8a8a0');}
 // roter Kreis
 g.fillStyle='#a8302a';g.beginPath();g.arc(W/2,H/2+4,40,0,7);g.fill();g.fillStyle='#c8463a';g.beginPath();g.arc(W/2,H/2+4,36,0,7);g.fill();
 // Hahn: eigene Grafik des Spiels (Feuerrot), schwarz umrandet wie aufgemalt
 const R0=A.signRooster??=CF.createRooster({seed:1000,minQuality:5,maxQuality:8});const src=mk(170,120),sg=src.getContext('2d');
 ART.rooster(sg,R0,{w:170,h:120,size:98,x:100,y:116,face:1,shadow:false,pose:{lean:-.45,hackle:1.35,wing:1.05,flap:1.2,beakOpen:1,headY:-1.5,crouch:-.1,glow:true}});
 const out=mk(170,120),og=out.getContext('2d');for(const [ox,oy] of [[-2,0],[2,0],[0,-2],[0,2],[-1,-1],[1,1]])og.drawImage(src,ox,oy);og.globalCompositeOperation='source-in';og.fillStyle='#1a100a';og.fillRect(0,0,170,120);og.globalCompositeOperation='source-over';og.drawImage(src,0,0);
 g.drawImage(out,W/2-88,H/2-58);
 // Wutstriche
 for(const [x,y,a] of [[30,30,-.6],[26,44,-.2],[150,30,.6],[154,44,.2]]){g.save();g.translate(x,y);g.rotate(a);R(-5,-1,10,3,'#1a100a');g.restore();}
 return signArt=c;};
// Schild am Schultor: Querbalken auf zwei Pfosten über dem Tor, Schild an Seilen (schwingt leicht)
A.GATE={x:610,beam:584,post:[586,632]};
A.gateSign=function(g,t,o={}){const {R}=painter(g),G=A.GATE,art=A.sign();
 if(o.frame!==false){for(const px of G.post){R(px-2,G.beam,5,40,'#5e4128');R(px-2,G.beam,1,40,'#80603c');}R(G.post[0]-6,G.beam-3,G.post[1]-G.post[0]+13,5,'#6e4a2c');R(G.post[0]-6,G.beam-3,G.post[1]-G.post[0]+13,1,'#9a7046');}
 if(o.hidden)return;const sw=(o.sway??Math.sin(t*1.3)*.03)+(o.tilt||0),w=38,h=26,cx=o.x??G.x,cy=o.y??G.beam+4;
 g.save();g.translate(cx,cy);g.rotate(sw);if(o.frame!==false&&o.y==null){R(-13,0,1,4,'#c9b07a');R(12,0,1,4,'#c9b07a');}g.imageSmoothingEnabled=false;g.drawImage(art,0,0,180,120,-w/2,o.y==null?4:-h/2,w,h);
 if(o.nails)for(let i=0;i<o.nails;i++)R(i%2?w/2-4:-w/2+2,(o.y==null?4:-h/2)+(i<2?2:h-4),2,2,'#2a2a2a');g.restore();};

// ---------- Beastrium (Gebäude auf der Karte) ----------
A.BEASTRIUM={name:'Beastrium',sub:'Tiere & Käfige',route:'beastrium',x:652,y:298,w:196,h:126};
A.beastrium=function(g,t,o={}){const {R,line}=painter(g),B=A.BEASTRIUM,x=B.x,y=B.y,w=B.w,h=B.h,rise=o.rise??1;if(rise<=0)return;
 g.save();if(rise<1){g.beginPath();g.rect(x-12,y+h-h*rise-30,w+24,h*rise+40);g.clip();}
 g.globalAlpha=.3;R(x+8,y+h-10,w,20,'#2f2a1f');g.globalAlpha=1;
 // Mauern aus Bruchstein
 R(x,y+38,w,h-38,'#6e6a52');for(let row=y+42;row<y+h-6;row+=9)for(let col=x+3+((row/9)%2)*8;col<x+w-4;col+=17){R(col,row,15,8,hash(row+col)>.5?'#8a8468':'#7c775d');R(col,row+7,15,1,'#55513f');}
 // Dach aus Holzschindeln
 g.fillStyle='#5a3a22';g.beginPath();g.moveTo(x-10,y+42);g.lineTo(x+20,y+6);g.lineTo(x+w-20,y+6);g.lineTo(x+w+10,y+42);g.closePath();g.fill();
 for(let yy=10;yy<42;yy+=5){const inset=20-(yy-6)*30/36;line(x+inset-1,y+yy,x+w-inset,y+yy,1,yy%10?'#3e2716':'#7a5232');for(let xx=x+inset+((yy/5)%2)*4;xx<x+w-inset;xx+=8)R(xx,y+yy-4,1,4,'#3e2716');}
 R(x+20,y+4,w-40,3,'#8a6040');
 // Wetterhahn auf dem First
 const vx=x+w/2,vy=y+4,sw=Math.sin(t*.8)*.25;R(vx,vy-16,1,16,'#3a3a3a');g.save();g.translate(vx,vy-16);g.scale(Math.cos(sw)>0?1:-1,1);R(-5,-6,9,5,'#2e2e2e');R(2,-9,3,4,'#2e2e2e');R(5,-8,2,1,'#2e2e2e');R(-7,-9,3,4,'#2e2e2e');R(2,-10,2,1,'#2e2e2e');g.restore();R(vx-4,vy-4,9,1,'#3a3a3a');
 // Tor mit Eisenbeschlag
 const dx=x+w/2-24,dy=y+h-54;R(dx-3,dy-4,54,58,'#4f4a3a');R(dx,dy,48,54,'#5e3e24');for(let i=0;i<8;i++)R(dx+2+i*6,dy+1,1,52,'#4a2f1a');R(dx,dy+12,48,3,'#3a3a3a');R(dx,dy+38,48,3,'#3a3a3a');R(dx+23,dy,2,54,'#2a1c12');
 for(let i=0;i<6;i++){R(dx+4+i*8,dy+13,2,1,'#9a9a90');R(dx+4+i*8,dy+39,2,1,'#9a9a90');}R(dx+20,dy+26,2,3,'#c9a54a');R(dx+26,dy+26,2,3,'#c9a54a');
 // Gitterfenster: links ein Hahn, rechts glühende Augen
 for(const [wx,kind] of [[x+16,'hahn'],[x+w-50,'augen']]){const wy=y+56;R(wx-2,wy-2,38,26,'#4f4a3a');R(wx,wy,34,22,'#16110c');
  if(kind==='hahn'){const peek=Math.sin(t*.9)>.2;if(peek){R(wx+12,wy+8,8,8,'#e8dcc0');R(wx+14,wy+5,4,3,'#c8322a');R(wx+20,wy+11,3,2,'#e39a2a');R(wx+17,wy+9,1,1,'#160d0a');}}
  else{const blink=(t%4.2)<.15;if(!blink){R(wx+9,wy+9,3,2,'#f2c040');R(wx+21,wy+9,3,2,'#f2c040');R(wx+10,wy+9,1,1,'#2a1a0a');R(wx+22,wy+9,1,1,'#2a1a0a');}}
  for(let b=0;b<6;b++)R(wx+2+b*6,wy,2,22,'#5c5c54');R(wx,wy+10,34,2,'#5c5c54');}
 // Stroh, Trog, Federn, Tatzenspuren
 R(x+6,y+h-14,22,10,'#c9a85a');R(x+6,y+h-14,22,2,'#e0c47a');R(x+8,y+h-20,18,6,'#b8964a');
 R(x+w-34,y+h-10,26,7,'#6e5030');R(x+w-32,y+h-9,22,3,'#5a7a8a');
 for(const [px,py] of [[x+w/2-38,y+h+4],[x+w/2-30,y+h+9],[x+w/2+34,y+h+5]]){R(px,py,3,2,'#5a4a34');R(px-1,py-2,1,1,'#5a4a34');R(px+1,py-3,1,1,'#5a4a34');R(px+3,py-2,1,1,'#5a4a34');}
 R(x+w/2+40,y+h+1,3,1,'#f1ecdc');R(x+w/2-44,y+h-2,2,1,'#de7d2c');
 // Namensschild wie bei den anderen Gebäuden
 R(x+w/2-62,y+22,124,22,'#a8a88c');R(x+w/2-60,y+24,120,18,'#273d3e');g.font="bold 16px 'Courier Prime',monospace";g.textAlign='center';g.fillStyle='#efe0b3';g.fillText('BEASTRIUM',x+w/2,y+38);
 g.restore();
 if(rise<1){g.globalAlpha=.5*(1-rise);for(let i=0;i<14;i++)R(x+hash(i)*w,y+h-4-hash(i*3)*14,6,3,'#c9b586');g.globalAlpha=1;}};

// ---------- Beastrium innen (Kulisse für die Filme) ----------
let inside=null;
A.CAGE_SPOTS=[[250,394],[370,394],[490,394],[610,394],[730,394]];
A.interior=function(){if(inside)return inside;const W=900,H=670,c=mk(W,H),g=c.getContext('2d');g.imageSmoothingEnabled=false;const {R}=painter(g);
 R(0,0,W,H,'#17120e');
 for(let y=150;y<330;y+=10)for(let x=((y/10)%2)*12;x<W;x+=24){const n=hash(x*.7+y);R(x,y,23,9,n<.33?'#4f4334':n<.66?'#584a39':'#4a3e31');R(x,y+9,23,1,'#271f18');}
 for(let x=60;x<W;x+=200){R(x,150,14,190,'#4a321e');R(x,150,3,190,'#6e4a2c');}R(0,146,W,8,'#3a2716');
 // Fackeln
 for(const x of [130,440,760]){R(x,236,4,14,'#4a321e');R(x-2,228,8,8,'#f0a13c');R(x,224,4,5,'#ffd27a');g.fillStyle='rgba(255,190,90,.07)';g.beginPath();g.arc(x+2,232,70,0,7);g.fill();}
 // Boden: Stroh auf Stein
 for(let y=340;y<H;y+=8){R(0,y,W,8,((y/8)%2)?'#5a4a36':'#62513b');}for(let i=0;i<260;i++)R(hash(i*1.7)*W,340+hash(i*2.3)*(H-340),4+hash(i)*6,1,hash(i*5)>.5?'#c9a85a':'#a8894a');
 // Käfigreihe an der Rückwand (Rahmen; Tiere und Gitter kommen im Bild davor)
 for(const [x,y] of A.CAGE_SPOTS){R(x-48,y-112,96,116,'#20180f');R(x-46,y-24,92,26,'#b8964a');for(let k=0;k<12;k++)R(x-44+k*8,y-22+(k%2)*3,5,1,'#e0c47a');}
 // gesperrte Gehege: Ketten, Kratzspuren, Schilder
 for(const [x,lab] of [[120,'HUND'],[800,'BÄR']]){R(x-50,180,100,150,'#1a140e');for(let k=0;k<5;k++)R(x-44+k*22,186,4,140,'#4a4a44');for(let k=0;k<3;k++)R(x-30+k*10,230+k*4,2,30,'#6a3a2a');R(x-30,170,60,12,'#3a2a18');g.font="bold 10px 'Courier Prime',monospace";g.textAlign='center';g.fillStyle='#8a7a5a';g.fillText(lab+' · BALD',x,179);}
 return inside=c;};
A.drawCage=function(g,x,y,R,t,o={}){const {R:r}=painter(g);// Gitter vor dem Tier, Namensschild
 if(R){const sp=roosterSprite(R,t,o.mood||'idle',o.face||1,64,56,34);g.drawImage(sp,x-32,y-56);}
 for(let k=0;k<9;k++)r(x-44+k*11,y-110,3,112,'#5c5c54');r(x-48,y-114,96,5,'#6e5030');r(x-48,y,96,4,'#6e5030');
 if(o.label){r(x-34,y+6,68,12,'#e6d8b0');g.font="bold 9px 'Courier Prime',monospace";g.textAlign='center';g.fillStyle='#2a1c14';g.fillText(String(o.label).slice(0,14),x,y+15);}};

// ---------- Großaufnahme der Händlerin: Gesicht und Mimik aus M.faceShot (wie alle Figuren), darüber ihre Mähne,
// die Henne, Federn, Ohrringe und Federboa; Hintergrund: Straße vor dem Schultor ----------
let sellerG=null,faceCv=null;
A.sellerG=()=>{if(sellerG)return sellerG;const rng=M.s.rng,g=M.makeGladiator(0);M.s.rng=rng;g.id='hs-seller';g.name='Hühnerhändlerin';g.sex='female';g.age=47;
 Object.assign(g.appearance,{skin:COL.skin,shade:COL.skinS,hair:COL.hair,style:3,beard:0,cloth:COL.vest,silhouette:1.15});g.scars=[];return sellerG=g;};
// Extrem schielende Glupschaugen über die Augen des Gesichts gemalt (Koordinaten der Großaufnahme bei zoom 1, ohne Kopfdrehung)
A.EYES=[[296,146],[420,146]];
function crossEyes(c,t){const R=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));},P=6,wob=Math.round(Math.sin(t*2.3)*1);
 A.EYES.forEach(([x,y],i)=>{const W=i?11:12,H=i?7:8,x0=x-W*P/2,y0=y-H*P/2-(i?0:P);
  R(x0-P,y0-P,(W+2)*P,(H+2)*P,'#3a2418');R(x0,y0,W*P,H*P,'#f6f1df');R(x0,y0+(H-1)*P,W*P,P,'#d8ccb0');
  // Pupillen beide zur Nase: linkes Auge nach rechts unten, rechtes Auge nach links oben
  const px=i?x0:x0+(W-3)*P,py=i?y0+(wob>0?P:0):y0+(H-3)*P;R(px,py,3*P,3*P,'#160d0a');R(px+P,py,P,P,'#ffffff');});
 R(A.EYES[0][0]-7*P,A.EYES[0][1]-7*P,7*P,P,'#7e2f17');R(A.EYES[1][0]-3*P,A.EYES[1][1]-4*P-wob*P,7*P,P,'#7e2f17');}
A.sellerFace=function(g,w,h,t,o={}){if(M.sceneHeads?.seller){M.sceneHeads.seller(g,w,h,A.sellerG(),t,o);return;}const {R}=painter(g);faceCv??=mk(660,420);const fc=faceCv.getContext('2d');fc.clearRect(0,0,660,420);
 try{M.faceShot.paint(fc,660,420,{g:A.sellerG(),mood:o.mood||'grin',team:0,lines:o.lines||0,zoom:1,shake:o.shake||0,yaw:0},t);}catch(e){}
 crossEyes(fc,t);
 // Hintergrund
 g.fillStyle='#8a8468';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=24)for(let x=((y/24)%2)*28;x<w;x+=56){R(x,y,54,22,hash(x+y)>.5?'#948e70':'#7c775d');}
 g.fillStyle='rgba(20,12,8,.35)';g.fillRect(0,0,w,h);
 const k=.72*(w/660),ox=(w-660*k)/2+(o.dx||0),oy=h-420*k+Math.sin(t*3)*2,hx=ox+340*k,hy=oy+150*k,rx=150*k,ry=168*k;
 // Mähne hinter dem Kopf: Büschel aus Pixelblöcken rund um den Schädel
 const B=Math.max(4,Math.round(6*k/.72));const jig=Math.sin(t*9)*.08;
 for(let a=0;a<140;a++){const ang=Math.PI*(1.02+a/140*1.36)-Math.PI*.18;const len=(.25+hash(a*3.7)*.55+(a%6===0?.3:0))*(1+jig*hash(a));for(let r=.85;r<1+len;r+=.04){const x=hx+Math.cos(ang)*rx*r,y=hy+Math.sin(ang)*ry*r;R(Math.round(x/B)*B,Math.round(y/B)*B,B,B,r>.95+len?COL.hairD:hash(a*7+r*10)>.7?COL.hairL:COL.hair);}}
 // Gesicht ausgeschnitten (Kopf, Hals, Schultern), ohne den Raum dahinter
 g.save();g.beginPath();g.ellipse(hx,hy+8*k,rx*1.06,ry,0,0,7);g.rect(ox+262*k,oy+250*k,160*k,110*k);g.moveTo(ox,oy+420*k);g.lineTo(ox+40*k,oy+340*k);g.lineTo(ox+620*k,oy+340*k);g.lineTo(ox+660*k,oy+420*k);g.closePath();g.clip();g.imageSmoothingEnabled=false;g.drawImage(faceCv,ox,oy,660*k,420*k);g.restore();
 // Strähnen über der Stirn, Federn im Haar, Henne obenauf
 for(let i=0;i<9;i++){const x=hx-rx*.75+i*rx*.19,y=hy-ry*.82+(i%2)*B;R(Math.round(x/B)*B,Math.round(y/B)*B,B*2,B*(2+i%3),i%3?COL.hair:COL.hairL);}
 for(let i=0;i<9;i++){R(hx-rx*1.1-i*B*.9,hy-ry*.6-i*B*1.3,B,B*2,COL.fo);R(hx-rx*1.1-i*B*.9+B,hy-ry*.6-i*B*1.3+B,B,B,COL.fr);}R(hx-rx*1.12,hy-ry*.55,B,B,COL.out);
 for(let i=0;i<7;i++)R(hx+rx*.8+i*B*.8,hy-ry*.7-i*B*1.2,B,B*2,COL.fw);
 const eb=Math.round(Math.sin(t*2.7)*2)*(B/2),ex=hx-B*5,ey=hy-ry*1.02-B*6+eb;
 for(const [dx,dy,ww,hh,c] of [[0,4,12,6,'#efe4c8'],[0,9,12,1,'#c9b890'],[9,0,5,5,'#efe4c8'],[14,2,3,1,'#e39a2a'],[9,-1,3,1,'#c8322a'],[10,-2,2,1,'#c8322a'],[11,1,1,1,'#160d0a'],[-3,3,4,3,'#efe4c8'],[-4,2,2,2,'#d8ccb0'],[2,6,7,1,'#d8ccb0']])R(ex+dx*B/1.5,ey+dy*B/1.5,ww*B/1.5,hh*B/1.5,c);
 if(Math.sin(t*1.1)>.85){g.font='bold '+Math.round(B*3)+'px "Courier Prime",monospace';g.textAlign='left';g.fillStyle='#f4d37a';g.fillText('gock',ex+B*12,ey-B);}
 // Ohrringe, Dreck
 for(const sx of [-1,1]){const cx=hx+sx*rx*.96,cy=hy+ry*.25;g.strokeStyle='#d9b040';g.lineWidth=B*.8;g.beginPath();g.arc(cx,cy+B*3,B*2.4,0,7);g.stroke();}
 R(hx-rx*.5,hy+ry*.25,B*2,B,'#7a5a3a');R(hx+rx*.35,hy+ry*.42,B,B,'#7a5a3a');
 // Federboa
 for(let i=0;i<34;i++){const x=ox+(80+i*15)*k,y=oy+(338+Math.sin(i*1.7+t*4)*6+(i%2)*10)*k;R(x,y,B*2,B*3,[COL.fw,COL.fo,COL.fr,COL.fw,COL.fb,'#e0c34a'][i%6]);}
 if(o.lines){g.strokeStyle='rgba(255,240,200,.6)';g.lineWidth=4;for(let i=0;i<12;i++){const a=-Math.PI*.95+i/11*Math.PI*.9,r0=ry*1.55,r1=r0+18+Math.sin(t*22+i)*8;g.beginPath();g.moveTo(hx+Math.cos(a)*r0,hy+Math.sin(a)*r0*.8);g.lineTo(hx+Math.cos(a)*r1,hy+Math.sin(a)*r1*.8);g.stroke();}}};

// ---------- Der Dorftrottel: billige Kleidung, Dolch, keine Rüstung ----------
const SILLY_FIRST=['Gaius','Lucius','Tiberius','Quintus','Decimus','Septimus','Flavius','Titus','Aulus','Spurius','Numerius','Kaeso'];
const SILLY_LAST=['Hosenlos','Kartoffelnase','Plattfuß','Wackelzahn','Dreiviertelhirn','Linksfuß','Sabberlippe','Zehenbeißer','Ohnebart','Stolperbein','Schweinsgalopp','Bohnenstroh','Schielauge','Rübenkopf','Klappohr'];
A.sillyName=r=>SILLY_FIRST[Math.floor(r()*SILLY_FIRST.length)]+' '+SILLY_LAST[Math.floor(r()*SILLY_LAST.length)];
A.idiotLook=(g,r)=>{Object.assign(g.appearance,{cloth:['#8a7a5a','#7a6a4a','#9a8058','#6e6448'][Math.floor(r()*4)],style:3,beard:r()<.5?0:1,hair:'#6a4a2a'});g.scars=[];g.height=Math.round(168+r()*12);g.weight=Math.round(58+r()*10);return g;};
})();


