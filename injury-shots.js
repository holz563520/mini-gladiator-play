'use strict';
// NAHAUFNAHMEN VON VERLETZUNGEN (eigenes Modul, lässt sich ersatzlos entfernen: aus der Skriptliste in boot.js streichen)
// Verwendet im Medikus-Kapitel (medic.js) und im Arenakampf (Abschnitt „Arenakampf“ am Ende, Einstellung S.options.closeups).
// Jede Körperstelle hat eine eigene Ansicht, jede Verletzungsart eine eigene Darstellung; beides wird zusammengesetzt.
// Gezeichnet wird wie in den vorhandenen Nahaufnahmen (Attentat, Löwe): kleines Pixelbild (160 × 100), ganzzahlig vergrößert.
// Haut, Schatten, Haar, Frisur und Bart kommen vom jeweiligen Gladiator (g.appearance), das Porträt aus M.renderPortrait.
// Reine Darstellung: liest nur, ändert keinen Spielzustand.
(()=>{
const M=window.MG;if(!M)return;
const FW=160,FH=100,HIT=.55,LEN=3.1;
const mix=(a,b,k)=>{const p=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)),x=p(a),y=p(b);return '#'+x.map((v,i)=>Math.max(0,Math.min(255,Math.round(v+(y[i]-v)*k))).toString(16).padStart(2,'0')).join('');};
const cl=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=v=>{v=cl(v);return v*v*(3-2*v);},out=v=>1-(1-cl(v))*(1-cl(v));
const BLOOD='#a8372f',DARK='#6b2420',WET='#c9584a';
// ---------- Welche Verletzung an welcher Stelle vorkommt (nach woundType/hit/destroyedInjury in sim.js) ----------
const LIMBS=['ls','rs','lua','rua','lfa','rfa','lh','rh','lt','rt','lsh','rsh','lf','rf'],SINEW=['lh','rh','lf','rf','lfa','rfa','lsh','rsh'],JOINT=['lh','rh','lf','rf','ls','rs'];
const KINDS=[
 ['Schürfwunde','scrape',()=>true],['Schnittwunde','cut',()=>true],['Tiefe Schnittwunde','deepcut',()=>true],
 ['Stichverletzung','stab',()=>true],['Tiefe Stichverletzung','deepstab',()=>true],['Pfeil steckt','arrow',()=>true],
 ['Sehnenverletzung','sinew',p=>SINEW.includes(p)],['Tiefe Bauchwunde','gut',p=>p==='belly'],['Durchstochen','pierce',()=>true],
 ['Bluterguss','bruise',()=>true],['Prellung','contusion',()=>true],['Muskelquetschung','crush',p=>p!=='head'],
 ['Gehirnerschütterung','concussion',p=>p==='head'],['Schädelbruch','skullfracture',p=>p==='head'],['Gelenkverletzung','joint',p=>JOINT.includes(p)],
 ['Knochenbruch','fracture',p=>LIMBS.includes(p)],['Schwerer Knochenbruch','badfracture',p=>LIMBS.includes(p)],['Trümmerbruch','shatter',p=>LIMBS.includes(p)],['Zertrümmert','pulp',p=>LIMBS.includes(p)],
 ['Abgetrennt','sever',p=>LIMBS.includes(p)||p==='head'||p==='neck'],['Dauerhafte Einschränkung','scar',()=>true],['Blutverlust','collapse',()=>true]];
const kindOf=name=>({'Tiefe Stichwunde':'deepstab','Kritische Bauchverletzung':'gut','Schwere innere Verletzung':'gut','Amputation':'sever','Tödliche Schnittwunde':'deepcut'})[name]||KINDS.find(k=>k[0]===name)?.[1]||'cut';
const injuriesFor=part=>KINDS.filter(k=>k[2](part)).map(k=>k[0]);
const BLUNT=['club','mace','hammer'],weaponClass=wid=>BLUNT.includes(wid)?'blunt':['bow','crossbow'].includes(wid)?'arrow':['spear','trident','javelin','halberd'].includes(wid)?'spear':'blade';
// ---------- Zeichenwerkzeug auf dem kleinen Bild ----------
function tools(q){const r=(x,y,w,h,c)=>{q.fillStyle=c;q.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
 // Körperröhre zwischen zwei Punkten: Lichtkante oben, Schatten unten, dunkle Kontur
 const tube=(x0,y0,x1,y1,w0,w1,C)=>{const dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,n=Math.ceil(len*1.4);for(let i=0;i<=n;i++){const u=i/n,cx=x0+dx*u,cy=y0+dy*u,w=w0+(w1-w0)*u,h=w/2;for(let j=-Math.ceil(h);j<=Math.ceil(h);j++){const a=Math.abs(j);if(a>h+.2)continue;const side=ny>=0?j:-j,col=a>h-1?C.line:side<-h*.45?C.light:side>h*.3?C.shade:C.skin;r(cx+nx*j,cy+ny*j,1.3,1.3,col);}}};
 const disc=(x,y,rad,C)=>{for(let j=-rad;j<=rad;j++){const hw=Math.sqrt(Math.max(0,rad*rad-j*j));for(let i=-Math.ceil(hw);i<=Math.ceil(hw);i++){const d=Math.hypot(i,j);r(x+i,y+j,1,1,d>rad-1?C.line:j<-rad*.4?C.light:j>rad*.35||i>rad*.5?C.shade:C.skin);}}};
 const oval=(x,y,rx,ry,c,a=1)=>{q.globalAlpha=a;q.fillStyle=c;for(let j=-Math.ceil(ry);j<=Math.ceil(ry);j++){const hw=rx*Math.sqrt(Math.max(0,1-(j*j)/(ry*ry)));if(hw>=.5)q.fillRect(Math.round(x-hw),Math.round(y+j),Math.round(hw*2),1);}q.globalAlpha=1;};
 const line=(x0,y0,x1,y1,c,w=1)=>{const n=Math.ceil(Math.hypot(x1-x0,y1-y0));for(let i=0;i<=n;i++)r(x0+(x1-x0)*i/n,y0+(y1-y0)*i/n,w,w,c);};
 return {r,tube,disc,oval,line};}
// Gedrehte Teile (hängende Hand, fallendes Glied, sinkender Kopf) erst gerade zeichnen, dann als Pixelbild drehen: bleibt scharf
let scratch=null;
function turned(q,cx,cy,ang,dx,dy,draw){if(!ang&&!dx&&!dy){draw(tools(q),q);return;}if(!scratch){scratch=document.createElement('canvas');scratch.width=FW*2;scratch.height=FH*2;}const s=scratch.getContext('2d');s.setTransform(1,0,0,1,0,0);s.clearRect(0,0,FW*2,FH*2);s.translate(FW/2,FH/2);draw(tools(s),s);q.save();q.imageSmoothingEnabled=false;q.translate(Math.round(cx+dx),Math.round(cy+dy));q.rotate(ang);q.drawImage(scratch,-Math.round(cx)-FW/2,-Math.round(cy)-FH/2);q.restore();}
const palette=g=>{const A=g?.appearance||{},skin=A.skin||'#c19169',shade=A.shade||'#875e43';return {skin,shade,light:mix(skin,'#fff2dc',.22),line:mix(shade,'#1a0f0a',.55),hair:A.hair||'#443025',style:(A.style??0)%6,beard:(A.beard??0)%4,cloth:'#665748',belt:'#3a2a22'};};
// ---------- Hintergrund: Sand des Hofs im Gegenlicht ----------
function backdrop(q,T,t){T.r(0,0,FW,FH,'#231a12');const gr=q.createRadialGradient(46,26,4,80,50,110);gr.addColorStop(0,'rgba(232,182,110,.55)');gr.addColorStop(.6,'rgba(150,110,64,.25)');gr.addColorStop(1,'rgba(0,0,0,0)');q.fillStyle=gr;q.fillRect(0,0,FW,FH);for(let i=0;i<7;i++){const k=(t*.25+i/7)%1;T.r(8+i*23+Math.sin(t*.8+i)*4,FH-6-k*80,1,1,'#e8c890');}}
// ---------- Ansichten je Körperstelle: zeichnen die Stelle und liefern den Wundpunkt mit Richtung ----------
// Glied als Kette von Punkten; Bruch knickt ab dem Wundpunkt, Abtrennung zeichnet nur bis dorthin (Rest fällt).
function limb(q,T,C,pts,o,part){const brk=o.bend||0,A=o.A,cut=o.cut;let P=pts.map(p=>({...p}));
 // Wundpunkt als zusätzlichen Kettenpunkt einfügen
 const i0=o.seg,a=P[i0],b=P[i0+1],u=o.u??.5,mid={x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,w:a.w+(b.w-a.w)*u};P.splice(i0+1,0,mid);
 const rot=(p,c,th)=>{const dx=p.x-c.x,dy=p.y-c.y,cs=Math.cos(th),sn=Math.sin(th);return {...p,x:c.x+dx*cs-dy*sn,y:c.y+dx*sn+dy*cs};};
 if(brk)for(let i=i0+2;i<P.length;i++)P[i]=rot(P[i],mid,brk);
 if(o.crumple){const k=o.crumple,q1={x:a.x+(mid.x-a.x)*.55,y:a.y+(mid.y-a.y)*.55,w:(a.w+mid.w)/2};P.splice(i0+1,0,q1);for(let i=i0+2;i<P.length;i++)P[i]=rot(P[i],q1,-k*.55);const m2=P[i0+2];for(let i=i0+3;i<P.length;i++)P[i]=rot(P[i],m2,k*.5);}
 const mi=P.indexOf(mid)>=0?P.indexOf(mid):i0+1,end=cut?mi:P.length-1,seg=(i,TT=T)=>TT.tube(P[i].x,P[i].y,P[i+1].x,P[i+1].y,P[i].w,P[i+1].w,C);
 for(let i=0;i<end;i++){seg(i);if(i>0&&(i!==mi||brk||o.crumple))T.disc(P[i].x,P[i].y,P[i].w/2-.5,C);}
 const dir={x:b.x-a.x,y:b.y-a.y},dl=Math.hypot(dir.x,dir.y)||1;dir.x/=dl;dir.y/=dl;
 return {P,mid:P[mi],mi,dir,w:mid.w,rest:(dx,dy,ang)=>turned(q,P[mi].x,P[mi].y,ang,dx,dy,TT=>{for(let i=mi;i<P.length-1;i++){seg(i,TT);if(i>mi)TT.disc(P[i].x,P[i].y,P[i].w/2-.5,C);}o.tail?.(TT);/* Schnittfläche am abgetrennten Stück */TT.oval(P[mi].x,P[mi].y,2.5,P[mi].w/2-1,DARK);TT.oval(P[mi].x,P[mi].y,1.5,P[mi].w/2-3,BLOOD);})};}
function handShape(T,C,x,y,o={}){const limp=o.limp||0;/* Handrücken, Daumen, vier Finger; „limp“ lässt die Finger kraftlos hängen */
 T.tube(x-2,y,x+30,y+1,28,26,C);T.disc(x+30,y+1,13,C);T.tube(x+6,y-12,x+22,y-27+limp*10,8,6,C);
 for(let i=0;i<4;i++){const fy=y-10+i*7.2,len=i===0||i===3?24:29,bx=x+40,k1=limp*(.5+i*.08)+(o.splay||0)*Math.sin(i*2.3+1)*.55,mx=bx+Math.cos(k1)*len*.5,my=fy+Math.sin(k1)*len*.5,ex=mx+Math.cos(k1*2.1)*len*.5,ey=my+Math.sin(k1*2.1)*len*.5;T.tube(bx-6,fy,mx,my,6.5,6,C);T.tube(mx,my,ex,ey,6,5,C);T.r(ex-1,ey-2,2,3,mix(C.light,'#ffffff',.3));T.r(bx-1,fy-3,1,6,C.shade);}}
function footShape(T,C,x,y){/* Fuß mit Sandale: Ferse links, Zehen rechts */
 for(let i=0;i<=62;i++){const top=i<14?y-2:y+ (i-14)*.2+2,h=y+20-top;for(let j=0;j<h;j++)T.r(x-8+i,top+j,1,1,j<1?C.line:j<3?C.light:j>h-5?C.shade:C.skin);}
 for(let n=0;n<5;n++){T.r(x+53+n*.6,y+9+n*2.1,4-n*.3,3,C.light);T.r(x+56+n*.6,y+9+n*2.1,1,3,C.line);}
 T.r(x-10,y+20,70,3,'#3a2a1c');T.r(x-10,y+23,70,1,'#1f150d');T.tube(x+6,y+19,x+22,y+2,3,3,{skin:'#6c5437',light:'#8a6c48',shade:'#4a3824',line:'#2a1f14'});T.tube(x+30,y+20,x+38,y+5,3,3,{skin:'#6c5437',light:'#8a6c48',shade:'#4a3824',line:'#2a1f14'});T.r(x-6,y-2,18,3,'#6c5437');}
function headShape(q,T,C,cx,top,R,o={}){const sc=R/26,half=y=>{const u=(y-28)/34;let hw=R*Math.sqrt(Math.max(0,1-u*u));if(y>48)hw-=(y-48)*.28*sc;return Math.max(0,hw);},Y=v=>top+Math.round(v*sc),pale=o.pale||0,skin=mix(C.skin,'#c9c4b0',pale*.6),shade=mix(C.shade,'#8a8778',pale*.6),light=mix(C.light,'#e6e2d0',pale*.5),bald=C.style===2,dark=mix(shade,'#2a160e',.35),lip=mix(shade,'#8a2a24',.45);
 if(C.style===3){T.r(cx-R-3,Y(6),6,Math.round(46*sc),C.hair);T.r(cx+R-3,Y(6),6,Math.round(44*sc),mix(C.hair,'#000000',.25));}
 for(let y=-6;y<64;y++){const hw=half(y);if(hw<1)continue;for(let x=Math.floor(-hw);x<Math.ceil(hw);x++){const s=(x+.5)/hw;let col=skin;if(!bald&&y<(C.style===4?5:9)+Math.abs(s)*4)col=s>.4?mix(C.hair,'#000000',.25):C.hair;else if(s>.45)col=shade;else if(s<-.4)col=light;if(C.beard===2&&y>44)col=s>.4?mix(C.hair,'#000000',.25):C.hair;if(C.beard===3&&Math.abs(s)<.34&&y>50)col=C.hair;if(C.beard===1&&y>54&&Math.abs(s)<.5)col=mix(skin,C.hair,.45);T.r(cx+x,top+Math.round(y*sc),1,Math.ceil(sc),col);}}
 if(C.style===5)T.r(cx-3,top-Math.round(11*sc),6,Math.round(8*sc),C.hair);if(C.style===1)T.r(cx-R+2,top-Math.round(8*sc),R*2-4,3,C.hair);
 for(const sd of [-1,1])T.r(cx+sd*(half(28)+1)-(sd<0?3:0),Y(22),3,Math.round(12*sc),sd<0?skin:shade);
 const ex=Math.round(R*.42),ew=Math.round(R*.42),ey=Y(23),mood=o.mood||'calm',t=o.t||0;
 for(const sd of [-1,1]){const x0=cx+sd*ex-Math.round(ew/2);
  if(mood==='out'){T.r(x0,ey+2,ew,1,dark);T.r(x0,ey+3,ew,1,shade);}
  else if(mood==='pain'){for(let i=0;i<ew;i++){const inner=sd<0?i/(ew-1):1-i/(ew-1);T.r(x0+i,ey+1+Math.round((1-inner)*2),1,2,dark);}for(let i=0;i<ew+2;i++){const inner=sd<0?i/(ew+1):1-i/(ew+1);T.r(x0-1+i,ey-5+Math.round(inner*3),1,2,C.hair);}}
  else{const open=mood==='shock'?6:4;T.r(x0,ey-1,ew,open+2,dark);T.r(x0+1,ey,ew-2,open,'#efe6d6');const dz=mood==='dizzy'?Math.round(Math.sin(t*7+sd*1.7)*2.5):0,dy=mood==='dizzy'?Math.round(Math.cos(t*7+sd*1.7)*1.5):0;T.r(x0+Math.round(ew/2)-1+dz,ey+1+dy,3,3,'#2a1810');for(let i=0;i<ew+2;i++)T.r(x0-1+i,ey-5-(mood==='shock'?2:0),1,2,C.hair);}}
 T.r(cx-1,Y(27),3,Math.round(12*sc),shade);T.r(cx-3,Y(38),7,3,shade);
 const mw=Math.round(R*.62),mx=cx-Math.round(mw/2),my=Y(46);
 if(mood==='pain'||mood==='shock'){const mh=mood==='shock'?8:6;T.r(mx,my,mw,mh,'#2a0806');T.r(mx+1,my,mw-2,2,'#e6dcc6');T.r(mx+1,my+mh-2,mw-2,2,'#d6ccb6');T.r(mx+2,my+2,mw-4,mh-4,'#5a1410');}
 else if(mood==='out'){T.r(mx+2,my+2,mw-4,2,lip);T.r(mx+mw-5,my+4,2,3,'#d9e6f0');}
 else if(mood==='dizzy'){for(let i=0;i<mw;i++)T.r(mx+i,my+2+Math.round(Math.sin(i*.9+t*6)*1.4),1,2,lip);}
 else T.r(mx+1,my+2,mw-2,2,lip);
 if(o.blood>0){const n=Math.round(o.blood*9*sc);T.r(mx+mw-4,my+3,2,n,BLOOD);T.r(mx+mw-4,my+3+n,2,1,DARK);}}
function torso(q,T,C,ox,oy,o={}){/* Rumpf von vorn: Hals, Schultern, Brust, Bauch, Lendentuch, hängende Oberarme */
 const X=x=>80+ox+x,Y=y=>oy+y,row=(y,hw)=>{for(let x=-Math.ceil(hw);x<Math.ceil(hw);x++){const s=x/hw;T.r(X(x),Y(y),1,1,Math.abs(s)>.96?C.line:s>.5?C.shade:s<-.55?C.light:C.skin);}};
 T.tube(X(-70),Y(30),X(-79),Y(104),24,21,C);T.tube(X(70),Y(30),X(79),Y(104),24,21,{...C,skin:C.shade,light:C.skin});
 for(let y=o.cutNeck?9:-14;y<16;y++)row(y,10);/* der Hals reicht bis unter das Kinn; eine Lücke gibt es nur, wenn der Kopf abgetrennt ist */for(let y=12;y<26;y++)row(y,22+(y-12)*3.6);T.disc(X(-66),Y(28),13,C);T.disc(X(66),Y(28),13,{...C,skin:C.shade,light:C.skin});
 for(let y=24;y<62;y++)row(y,63-(y-24)*.28);for(let y=62;y<108;y++)row(y,52-Math.sin((y-62)/46*Math.PI)*6);
 // Schlüsselbeine, Brustmuskeln, Bauch
 T.line(X(-44),Y(22),X(-8),Y(26),C.light);T.line(X(8),Y(26),X(44),Y(22),C.shade);
 for(let i=-30;i<=30;i++){const y=46+Math.round((1-(i*i)/900)*-0)+Math.round(Math.abs(i)<3?-2:0);if(Math.abs(i)>3){T.r(X(i+(i<0?-18:18)*0),Y(52-Math.round(Math.cos(i/30*Math.PI/2)*4)),1,1,C.shade);}}
 T.r(X(-1),Y(30),1,26,C.shade);T.r(X(-34),Y(44),2,2,mix(C.shade,'#6b2420',.4));T.r(X(32),Y(44),2,2,mix(C.shade,'#6b2420',.5));
 T.r(X(-1),Y(62),1,40,C.shade);for(const y of [70,81,92]){T.r(X(-16),Y(y),14,1,C.shade);T.r(X(2),Y(y),14,1,C.shade);}T.r(X(-1),Y(97),3,3,mix(C.shade,'#000000',.3));
 for(const s of [-1,1])for(let n=0;n<3;n++)T.r(X(s*(40+n*2))-(s>0?6:0),Y(63+n*5),6,1,C.shade);
 for(let y=108;y<130;y++)for(let x=-50;x<50;x++)T.r(X(x),Y(y),1,1,y<112?C.belt:x>24?mix(C.cloth,'#000000',.25):C.cloth);
 if(o.cutNeck){T.oval(X(0),Y(9),10,3,DARK);T.oval(X(0),Y(9),7,2,BLOOD);T.r(X(-1),Y(8),3,2,'#efe6d0');}
 if(o.head){const f=o.off||{dx:0,dy:0,ang:0};turned(q,X(0),Y(-30),f.ang,f.dx,f.dy,(TT,qq)=>{if(o.cutNeck){TT.r(X(-9),Y(-4),18,10,C.skin);TT.r(X(4),Y(-4),5,10,C.shade);TT.oval(X(0),Y(6),9,2.5,DARK);TT.oval(X(0),Y(6),6,1.5,BLOOD);}headShape(qq,TT,C,X(0),Y(-62),23,o.head);});}}
// Ansichten: jede liefert {A:Wundpunkt, dir, w, limbInfo?}
const VIEW={
 head:(q,T,C,o)=>{T.tube(40,104,120,104,36,36,C);T.r(70,78,20,20,C.shade);T.r(72,78,14,18,C.skin);const dy=o.sink||0;turned(q,80,60,o.tilt||0,0,dy,(TT,qq)=>headShape(qq,TT,C,80,10,27,o.face));return {A:{x:93,y:26+dy},dir:{x:.3,y:.95},w:20,flat:true};},
 neck:(q,T,C,o)=>{torso(q,T,C,0,46,{head:o.face,cutNeck:o.cut,off:o.off});return o.cut?{A:{x:80,y:54},dir:{x:0,y:-1},w:20,flat:true}:{A:{x:88,y:54},dir:{x:.25,y:.97},w:16,flat:true};},
 chest:(q,T,C,o)=>{torso(q,T,C,0,6,{head:o.face});return {A:{x:98,y:50},dir:{x:.96,y:.28},w:34,flat:true};},
 belly:(q,T,C,o)=>{torso(q,T,C,0,-36,{});return {A:{x:88,y:52},dir:{x:.97,y:.24},w:34,flat:true};},
 shoulder:(q,T,C,o)=>{torso(q,T,C,62,18,{head:o.face});return {A:{x:76,y:45},dir:{x:.6,y:.8},w:24,flat:true};},
 upperarm:(q,T,C,o)=>{T.r(0,0,34,100,C.shade);T.r(0,0,30,100,C.skin);T.r(0,0,3,100,C.light);const L=limb(q,T,C,[{x:30,y:20,w:34},{x:106,y:60,w:27},{x:154,y:104,w:23}],{...o,seg:0},'ua');T.disc(30,20,18,C);return L;},
 forearm:(q,T,C,o)=>{const L=limb(q,T,C,[{x:-12,y:6,w:30},{x:30,y:32,w:27},{x:112,y:60,w:19},{x:122,y:63,w:19}],{...o,seg:1,tail:TT=>handShape(TT,C,112,60,{limp:o.limp})},'fa');if(!o.cut){const e=L.P[L.P.length-1],p=L.P[L.P.length-2];turned(q,e.x,e.y,Math.atan2(e.y-p.y,e.x-p.x)-Math.atan2(3,10),0,0,TT=>handShape(TT,C,e.x-10,e.y-3,{limp:o.limp}));}return L;},
 hand:(q,T,C,o)=>{const cut=o.cut;T.tube(-6,52,50,52,24,21,C);const A={x:50,y:52},tw=(o.bend||0)*1.15-(o.crumple||0)*.3,rt=(x,y)=>({x:50+(x-50)*Math.cos(tw)-(y-52)*Math.sin(tw),y:52+(x-50)*Math.sin(tw)+(y-52)*Math.cos(tw)});if(!cut)turned(q,50,52,tw,0,0,TT=>handShape(TT,C,52,52,{limp:o.limp,splay:o.crumple}));if(tw)T.disc(50,52,11,C);return {A:o.wrist?A:rt(74,52),dir:{x:1,y:.05},w:24,flat:!o.wrist,P:null,hand:true,rest:(dx,dy,ang)=>{turned(q,52,52,ang,dx,dy,TT=>{handShape(TT,C,52,52,{limp:1});TT.oval(51,52,2.5,10,DARK);});}};},
 thigh:(q,T,C,o)=>{for(let y=0;y<34;y++)for(let x=0;x<54-y;x++)T.r(x,y,1,1,y<5?C.belt:C.cloth);const L=limb(q,T,C,[{x:26,y:20,w:44},{x:108,y:60,w:33},{x:156,y:106,w:28}],{...o,seg:0},'t');for(let y=0;y<30;y++)for(let x=0;x<46-y*1.2;x++)T.r(x,y,1,1,y<5?C.belt:x>30-y?mix(C.cloth,'#000000',.2):C.cloth);return L;},
 shin:(q,T,C,o)=>{const L=limb(q,T,C,[{x:-10,y:2,w:36},{x:28,y:26,w:31},{x:112,y:62,w:19},{x:120,y:65,w:19}],{...o,seg:1,tail:TT=>footShape(TT,C,118,56)},'sh');if(!o.cut){const e=L.P[L.P.length-1],p=L.P[L.P.length-2];turned(q,e.x,e.y,Math.atan2(e.y-p.y,e.x-p.x)-Math.atan2(3,8),0,0,TT=>footShape(TT,C,e.x-2,e.y-9));}return L;},
 foot:(q,T,C,o)=>{T.r(0,80,FW,20,'#8a6c44');T.r(0,80,FW,1,'#b08e5c');T.tube(58,-8,66,52,24,18,C);const tw=(o.bend||0)*.8-(o.crumple||0)*.25,rt=(x,y)=>({x:66+(x-66)*Math.cos(tw)-(y-54)*Math.sin(tw),y:54+(x-66)*Math.sin(tw)+(y-54)*Math.cos(tw)}),A=rt(92,62);if(!o.cut)turned(q,66,54,tw,0,0,TT=>footShape(TT,C,62,56));return {A:o.wrist?{x:66,y:54}:A,dir:{x:.98,y:.2},w:20,flat:!o.wrist,foot:true,rest:(dx,dy,ang)=>{turned(q,62,56,ang,dx,dy,TT=>{footShape(TT,C,62,56);TT.oval(60,58,2.5,8,DARK);});}};}};
const viewOf=part=>({head:'head',neck:'neck',chest:'chest',belly:'belly',ls:'shoulder',rs:'shoulder',lua:'upperarm',rua:'upperarm',lfa:'forearm',rfa:'forearm',lh:'hand',rh:'hand',lt:'thigh',rt:'thigh',lsh:'shin',rsh:'shin',lf:'foot',rf:'foot'})[part]||'chest';
// ---------- Verletzungen: was nach dem Treffer an der Stelle zu sehen ist (k = Sekunden seit dem Treffer) ----------
function drip(T,x,y,len,w=1,c=BLOOD){T.r(x,y,w,len,c);T.r(x-.5,y+len-1,w+1,2,DARK);}
const rnd=(i,s)=>{const v=Math.sin(i*127.1+s*311.7)*43758.5453;return v-Math.floor(v);};
function flow(T,V,k,n,max){const s=V.seed||0,edge=V.flat?999:Math.max(5,(V.w/2-1)/Math.max(.35,Math.abs(V.dir.x)));
 for(let i=0;i<n;i++){const off=(rnd(i,s)-.5)*Math.min(14,3+n*2.2),sp=.6+rnd(i+9,s)*.9,want=max*(.45+rnd(i+5,s)*.75),len=cl((k-.12-rnd(i+3,s)*.35)*max*sp,0,want),run=Math.min(len,edge-Math.abs(off)*.2),ph=rnd(i+7,s)*6,amp=.6+rnd(i+2,s)*1.6,wide=rnd(i+4,s)>.55?2:1;if(len<=0||run<=0)continue;
  const x0=V.A.x+off,y0=V.A.y+1;let x=x0;for(let j=0;j<run;j++){x=x0+Math.sin(j*.22+ph)*amp*Math.min(1,j/6);T.r(x,y0+j,j<run*.5?wide:1,1,j>run-2?DARK:j%7===3?WET:BLOOD);}
  T.r(x-.5,y0+run-1,wide+1,2,DARK);
  if(len>run){/* tropft von der Kante ab */const per=.55+rnd(i+6,s)*.5,u=((k+ph)%per)/per;T.r(x,y0+run+2+u*u*46,1,2+Math.round(u*2),BLOOD);}}}
function patch(T,V,k,size,cols,grow=.5){const p=out(k/grow),rx=size*(V.flat?1:.95)*p,ry=size*.62*p;if(p<=0)return;T.oval(V.A.x,V.A.y,rx,ry,cols[0],.55);T.oval(V.A.x+1,V.A.y,rx*.68,ry*.68,cols[1],.6);if(cols[2])T.oval(V.A.x+1,V.A.y+1,rx*.36,ry*.38,cols[2],.65);}
function gash(T,V,k,len,w){const p=out(k/.12),nx=-V.dir.y,ny=V.dir.x,c=.7,s=.7;/* schräg über die Stelle */for(let i=-len/2;i<=len/2;i++){if(Math.abs(i)>len/2*p)continue;const x=V.A.x+(V.dir.x*c+nx*s)*i*.7+nx*i*.25,y=V.A.y+(V.dir.y*c+ny*s)*i*.7+ny*i*.25,ww=Math.max(1,w*(1-Math.abs(i)/(len/2)*.7));T.r(x-ww/2-1,y-.5,ww+2,2,WET);T.r(x-ww/2,y,ww,1.5,ww>2?'#3d0f0d':DARK);}}
function hole(T,V,k,rad){T.oval(V.A.x,V.A.y,rad+1.5,rad+1,WET);T.oval(V.A.x,V.A.y,rad,rad*.85,'#3d0f0d');}
function spurt(T,V,k,n,force,seed=0){for(let i=0;i<n;i++){const u=((k*1.6+i/n+seed)%1),a=-1.9+((i*53)%20)/14,d=u*force,x=V.A.x+Math.cos(a)*d,y=V.A.y+Math.sin(a)*d+u*u*force*.9;T.r(x,y,i%3?1:2,i%3?1:2,i%2?BLOOD:WET);}}
function crack(T,V,k){if(k>.5)return;const a=1-k/.5;T.r(0,0,0,0,'#fff');let x=V.A.x-7,y=V.A.y-9;for(const [dx,dy] of [[5,4],[-3,5],[6,4],[-2,5],[5,4]]){for(let i=0;i<5;i++)T.r(x+dx*i/5,y+dy*i/5,1.5,1.5,a>.5?'#fffbe8':'#f4d37a');x+=dx;y+=dy;}}
function shards(T,V,n,spread,C){for(let i=0;i<n;i++){const a=i*2.4,d=3+((i*31)%spread),x=V.A.x+Math.cos(a)*d,y=V.A.y+Math.sin(a)*d*.6;T.r(x-1,y-1,4,3,C.light);T.r(x,y-1,2,1,'#efe6d0');T.r(x+2,y+1,1,1,C.line);}}
function stars(T,x,y,t,n=4,rad=22){for(let i=0;i<n;i++){const a=t*4+i*Math.PI*2/n,sx=x+Math.cos(a)*rad,sy=y+Math.sin(a)*rad*.3;if(Math.sin(a)>-.3){T.r(sx-2,sy,5,1,'#f4d37a');T.r(sx,sy-2,1,5,'#f4d37a');T.r(sx,sy,1,1,'#ffffff');}}}
// Heilung des Schädelbruchs (Vorschlag; Regeln legt Thomas fest): Tage im Krankenhaus bis zur vollständigen Ausheilung
const SKULL_DAYS=20,SKULL_STAGES=[['fresh','Frischer Bruch',0,0,'Notversorgung: Blutung stillen, Splitter entfernen'],['bandage','Kopfverband',1,3,'Bettruhe, Verband wird täglich gewechselt'],['patch','Wundauflage',4,7,'Wunde wird genäht und abgedeckt'],['scab','Wundschorf mit Fäden',8,13,'Verband ab, Knochen wächst langsam zusammen'],['scar','Vernarbung',14,19,'Haut schließt sich, Knochen festigt sich'],['plate','Ausgeheilt – Metallplatte',20,20,'Schädel mit Metallplatte versorgt, dauerhaft sichtbar']];
const skullStage=d=>{const x=SKULL_STAGES.find(v=>d>=v[2]&&d<=v[3])||SKULL_STAGES[5];return {id:x[0],name:x[1],from:x[2],to:x[3],text:x[4]};};
const EFFECT={
 scrape:(T,V,k)=>{for(let i=0;i<5;i++){const p=out((k-i*.02)/.1),x=V.A.x-8+i*4,y=V.A.y-5+i*1.2;for(let j=0;j<9*p;j++)T.r(x+j*.5,y+j,1,1,j%3?WET:'#d98a78');}},
 cut:(T,V,k)=>{gash(T,V,k,16,2);flow(T,V,k,2,9);},
 deepcut:(T,V,k)=>{gash(T,V,k,26,5);flow(T,V,k,6,24);if(k>.2&&k<1.4)spurt(T,V,k,5,10);},
 stab:(T,V,k)=>{hole(T,V,k,2);flow(T,V,k,1,9);},
 deepstab:(T,V,k)=>{hole(T,V,k,3.5);flow(T,V,k,4,22);spurt(T,V,k,7,13+Math.sin(k*9)*3);},
 arrow:(T,V,k)=>{hole(T,V,k,2);flow(T,V,k,2,12);},
 sinew:(T,V,k)=>{gash(T,V,k,20,4);flow(T,V,k,4,18);const p=out(k/.3),nx=-V.dir.y,ny=V.dir.x;for(const s of [-1,1]){const bx=V.A.x+nx*s*3,by=V.A.y+ny*s*3;for(let i=0;i<6;i++)T.r(bx+V.dir.x*s*(2+i*p)+Math.sin(i*1.3)*1.2,by+V.dir.y*s*(2+i*p),1.5,1.5,i<4?'#f1e8d2':'#d6ccb2');}},
 gut:(T,V,k)=>{patch(T,V,k,24,['#5a2a3a','#3a1620','#2a0c10'],.8);gash(T,V,k,30,6);flow(T,V,k,8,30);spurt(T,V,k,6,9);},
 pierce:(T,V,k)=>{hole(T,V,k,4);flow(T,V,k,5,24);spurt(T,V,k,8,14);},
 bruise:(T,V,k)=>patch(T,V,k,11,['#8a6a8a','#6b4a7a'],.7),
 contusion:(T,V,k)=>patch(T,V,k,16,['#8a5a78','#6b3a66','#4a2a52'],.8),
 crush:(T,V,k,C)=>{patch(T,V,k,23,['#7a4a70','#4a2a52','#2e1838'],.9);const p=out(k/.6);T.oval(V.A.x-3,V.A.y-4,9*p,3*p,C.light,.5);for(let i=0;i<4;i++)T.r(V.A.x-12+i*8,V.A.y+9+(i%2)*2,5,1,'#3a1f3a');},
 concussion:(T,V,k)=>{patch(T,V,k,10,['#8a5a78','#6b3a66'],.5);stars(T,80,10,k);},
 joint:(T,V,k)=>{patch(T,V,k,14,['#b0504a','#8a3a4a','#5a2a44'],.6);if(k<.45)for(let i=0;i<8;i++){const a=i*Math.PI/4,d=10+k*26;T.r(V.A.x+Math.cos(a)*d,V.A.y+Math.sin(a)*d*.7,2,2,'#fff2c8');}T.oval(V.A.x,V.A.y,5,3,'#d98a78',.35);},
 fracture:(T,V,k,C)=>{patch(T,V,k,15,['#8a5a78','#5a2a52'],.9);crack(T,V,k);T.oval(V.A.x,V.A.y-2,4,2,C.light,.6);},
 badfracture:(T,V,k,C)=>{patch(T,V,k,19,['#8a4a68','#5a2a52','#3a1838'],.9);crack(T,V,k);T.oval(V.A.x+1,V.A.y-3,6,3,'#efe6d0',.75);T.r(V.A.x-1,V.A.y-5,4,2,'#fffbe8');},
 shatter:(T,V,k,C)=>{patch(T,V,k,26,['#7a4a70','#4a2a52','#2e1838'],.9);crack(T,V,k);shards(T,V,6,11,C);},
 pulp:(T,V,k,C)=>{patch(T,V,k,30,['#6a3a60','#3a1c3e','#22102a'],.9);crack(T,V,k);shards(T,V,10,15,C);flow(T,V,k,3,12);},
 sever:(T,V,k)=>{/* Stumpf: Schnittfläche, pulsierende Blutung */const nx=-V.dir.y,ny=V.dir.x,h=V.w/2-1;for(let j=-h;j<=h;j++){T.r(V.A.x+nx*j-1,V.A.y+ny*j-1,4,2,Math.abs(j)>h-2?DARK:BLOOD);}T.r(V.A.x-1,V.A.y-1,3,3,'#efe6d0');const up=V.dir.y<-.9,pulse=.6+.4*Math.sin(k*8);for(let i=0;i<(up?30:16);i++){const u=((k*1.4+i/16)%1),a=Math.atan2(V.dir.y,V.dir.x)+(((i*29)%16)/16-.5)*(up?.7:.9),d=u*(up?54:30)*pulse;T.r(V.A.x+Math.cos(a)*d,V.A.y+Math.sin(a)*d+u*u*26,i%3?1:2,i%3?1:2,i%2?BLOOD:WET);}flow(T,V,k,5,26);},
 scar:(T,V,k)=>{const p=out(k/.5),nx=-V.dir.y,ny=V.dir.x;for(let i=-9;i<=9;i++){if(Math.abs(i)>9*p)continue;const x=V.A.x+V.dir.x*i*.3+nx*i,y=V.A.y+V.dir.y*i*.3+ny*i;T.r(x,y,2,1.5,'#e3b6a8');if(i%4===0){T.r(x-3*V.dir.x,y-3*V.dir.y,1,1,'#b08a80');T.r(x+3*V.dir.x,y+3*V.dir.y,1,1,'#b08a80');}}},
 skullfracture:(T,V,k,C)=>{
  // Schädelbruch: Kopfhaut reißt auf, Schädeldecke bricht ein, Knochenplatten und Splitter stehen offen im Blut
  const H=C.helm,sz=H?(H.mat==='leather'?.9:H.mat==='medium'?.76:.62)-H.q*.012:1,cx=80,cy=37,op=out(k/.16)*sz,lift=out((k-.04)/.38)*sz,sett=out((k-.3)/.7),pulse=.5+.5*Math.sin(k*9);
  const poly=(pts,col)=>{let y0=1e9,y1=-1e9;for(const p of pts){y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);}for(let y=Math.floor(y0);y<=Math.ceil(y1);y++){const xs=[];for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])/(b[1]-a[1])*(b[0]-a[0]));}xs.sort((m,n)=>m-n);for(let i=0;i+1<xs.length;i+=2)T.r(xs[i],y,xs[i+1]-xs[i]+1,1,col);}};
  const ring=(sx,sy,r)=>[[-1,.1],[-.82,-.62],[-.4,-.95],[.05,-.7],[.45,-1.0],[.9,-.55],[1.02,.15],[.78,.78],[.3,.95],[-.1,.7],[-.55,.98],[-.95,.62]].map(([a,b],i)=>[cx+a*sx*r*(1+((i*7)%3)*.05),cy+b*sy*r]);
  // Aufprall: Risse laufen sternförmig vom Treffpunkt über die Kopfhaut
  if(k<.45){const a=1-k/.45;for(let i=0;i<9;i++){const ang=i*.7+.2,len=(10+((i*5)%9))*out(k/.1);for(let d=4;d<len;d++)if(!(op>.7&&d<9))T.r(cx+Math.cos(ang)*d*1.45,cy+Math.sin(ang)*d*.8,1,1,a>.4?'#2a1214':'#5a2024');}}
  if(op<=0)return;
  // geronnenes Blut im Haar um die Wunde
  T.oval(cx,cy+2,19*op,10*op,'#5a1d1a',.75);T.oval(cx-2,cy+3,14*op,7*op,'#7c2a25',.6);
  // aufgeplatzte Kopfhaut: wulstiger Rand, nach außen gerollte Lappen
  if(H){const lk=helmLook(H);poly(ring(1,1,16.5*op),mix(H.mat==='medium'?lk.leather:lk.metal,'#000000',.35));poly(ring(1,1,15*op),lk.edge);poly(ring(1,1,13.6*op),H.mat==='medium'?lk.leather:lk.metal);poly(ring(1,1,12.4*op),'#a8372f');}else{poly(ring(1,1,15*op),'#a8372f');poly(ring(1,1,13.2*op),'#d8806e');}poly(ring(1,1,11.8*op),'#6b2420');
  // dunkle Höhle (eingedrückte Stelle)
  poly(ring(1,.92,10.4*op).map(p=>[p[0]+.6,p[1]+.6]),'#2a0b0c');
  // eingedrückte Knochenplatte, durch den Schlag nach unten gesunken
  const dp=sett*2.5,plate=[[cx-8,cy-3+dp],[cx-3,cy-6+dp],[cx+4,cy-5+dp],[cx+9,cy-1+dp],[cx+7,cy+4+dp],[cx+1,cy+6+dp],[cx-6,cy+4+dp]];
  poly(plate.map(p=>[cx+(p[0]-cx)*op,cy+(p[1]-cy)*op]),'#b9ab8c');poly(plate.map(p=>[cx+(p[0]-cx)*.82*op,cy-1+(p[1]-cy)*.78*op]),'#e6dcc0');poly(plate.map(p=>[cx-2+(p[0]-cx)*.45*op,cy-2+(p[1]-cy)*.4*op]),'#f6efd8');
  // Bruchlinien in der Platte
  for(const [a,b,c,d] of [[-5,-4,-1,0],[-1,0,-3,4],[-1,0,5,2],[5,2,7,-2],[0,-5,2,-1]])T.line(cx+a*op,cy+b*op+dp,cx+c*op,cy+d*op+dp,'#8d7f62',1);
  // aufgestellte Knochensplitter am Rand: ragen aus der Wunde, an der Basis blutig
  const sp=[[-12,-1,-17,-9,-8,-6],[-4,-6,-5,-17,3,-8],[7,-5,14,-14,12,-2],[11,3,19,0,13,7],[-10,4,-17,7,-9,9]];
  sp.forEach(([x0,y0,x1,y1,x2,y2],i)=>{const l=lift*(i%2?.85:1),f=(a,b,c)=>[cx+(a+(b-a)*0)*op,cy+c*op],tip={x:cx+x1*l*1,y:cy+y1*l},b1={x:cx+x0*op,y:cy+y0*op},b2={x:cx+x2*op,y:cy+y2*op};
   poly([[b1.x,b1.y],[tip.x,tip.y],[b2.x,b2.y]],'#9a8c6c');poly([[b1.x+1,b1.y],[tip.x+(b1.x-tip.x)*.12,tip.y+(b1.y-tip.y)*.12],[b2.x-.5,b2.y]],'#e6dcc0');T.r(tip.x,tip.y,1,1,'#fffbe8');
   T.oval((b1.x+b2.x)/2,(b1.y+b2.y)/2,3,1.6,'#a8372f',.85);});
  // Blut quillt aus den Fugen, pulsierend
  T.oval(cx,cy+5,8*op,2.2+pulse*.8,'#a8372f',.95);T.oval(cx+1,cy+4.4,5*op,1.2,'#d6685a',.8);for(const sx of [-8,6])T.oval(cx+sx,cy+3,2.2,1.4+pulse*.6,'#c9584a',.9);
  // fliegende Splitter und Spritzer beim Aufprall
  if(k<.75)for(let i=0;i<12;i++){const u=k/.75,a=-2.9+i*.5,d=u*(14+(i*13)%22),x=cx+Math.cos(a)*d*1.3,y=cy-3+Math.sin(a)*d*.9+u*u*30;T.r(x,y,i%3?1:2,i%3?1:2,i%4===0?'#f1e8d2':i%2?'#c9584a':'#a8372f');}
  // Herzschlag: kurze Spritzer aus der Wunde, solange die Blutung anhält
  if(k>.7){const bt=(k*1.15)%1;if(bt<.4){const u=bt/.4;for(let i=0;i<7;i++){const dir=(i-3)*.8,px=cx+dir*u*11,py=cy-3-Math.sin(u*Math.PI)*(12+i%3*3)+u*u*16;T.r(px,py,i%2?2:1,i%2?2:1,i%3?'#a8372f':'#c9584a');}}}
  // Blut läuft über Stirn und Schläfen
  const run=cl((k-.1)/1.1);
  if(run>0){for(const [x0,len,w,c] of [[-10,34,3,'#a8372f'],[-3,26,2,'#a8372f'],[5,40,3,'#a8372f'],[11,22,2,'#8a2e28'],[-14,18,2,'#8a2e28']]){const y0=cy+5,L=len*run;T.r(cx+x0,y0,w,L,c);T.r(cx+x0,y0,1,L,'#c9584a');T.r(cx+x0-.5,y0+L,w+1,2,'#6b2420');if(run>.6)T.r(cx+x0+(w>2?1:0),y0+L+3+Math.sin(k*8+x0)*1,1,2,'#a8372f');}}
 },

 skullheal:(T,V,k,C)=>{
  // Heilungsverlauf des Schädelbruchs im Krankenhaus (Tag 0–20). Kopf ohne Helm; Tag 20: ausgeheilt, Metallplatte statt Narbe.
  const d=cl(C.healDay??0,0,SKULL_DAYS),cx=82,cy=18,poly=(pts,col)=>{let y0=1e9,y1=-1e9;for(const p of pts){y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);}for(let y=Math.floor(y0);y<=Math.ceil(y1);y++){const xs=[];for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])/(b[1]-a[1])*(b[0]-a[0]));}xs.sort((m,n)=>m-n);for(let i=0;i+1<xs.length;i+=2)T.r(xs[i],y,xs[i+1]-xs[i]+1,1,col);}};
  const st=skullStage(d);
  if(st.id==='fresh'){const e=EFFECT.skullfracture;e(T,V,3,C);return;}
  if(st.id==='bandage'){const soak=1-cl((d-1)/2);T.oval(80,16,26,10,'#8a8470');T.oval(80,15,25,9,'#d8d0b6');for(let i=-24;i<=24;i+=4)T.line(80+i,8,80+i+6,23,'#b9b098',1);T.oval(80,14,22,3,'#e8e2cc',.7);
   T.oval(cx,cy-1,(5+7*soak),(3+4*soak),d<2?'#a8372f':'#7c2a25');T.oval(cx+1,cy-1,(2+4*soak),(1.5+2*soak),d<2?'#c9584a':'#8a3a30');if(d<2)T.r(cx+2,cy+4+Math.sin(k*4)*0,1,3+soak*5,'#a8372f');T.r(98,22,6,3,'#c9c1a8');T.r(99,23,4,5,'#b9b098');return;}
  if(st.id==='patch'){T.oval(cx,cy,14,8,'#8a8470');T.oval(cx,cy-.5,13,7,'#d8d0b6');for(let i=-12;i<=12;i+=4)T.line(cx+i,cy-6,cx+i+3,cy+6,'#b9b098',1);T.oval(cx+1,cy,4,2.5,'#6b2420',.85);T.oval(cx,cy-1,2,1.2,'#8a3a30');return;}
  if(st.id==='scab'){T.oval(cx,cy,13,7,'#c97a6c',.85);T.oval(cx,cy,10,5,'#6b2420');T.oval(cx-1,cy-1,7,3,'#4a1a18');for(let i=-7;i<=7;i+=3){T.r(cx+i,cy-4,1,8,'#1a1210');T.r(cx+i-1,cy-4,3,1,'#1a1210');T.r(cx+i-1,cy+3,3,1,'#1a1210');}return;}
  if(st.id==='scar'){const fade=cl((d-14)/5);T.oval(cx,cy,11,6,mix('#c97a6c','#d9a590',fade));T.oval(cx,cy,8,4,mix('#e29a88','#d9a590',fade));for(let i=-6;i<=6;i++)T.r(cx+i,cy+Math.sin(i*.9)*1.2,1,2,mix('#b4584c','#c98a7a',fade));T.oval(cx-2,cy-2,4,1.5,'#f0c8b6',.5);return;}
  // ausgeheilt: Metallplatte auf kahler, vernarbter Stelle
  T.oval(cx,cy,14,8,'#d9a590');T.oval(cx,cy,12,6.5,'#e0b09c');
  poly([[cx-10,cy-2],[cx-5,cy-6],[cx+5,cy-6],[cx+10,cy-2],[cx+9,cy+4],[cx+3,cy+7],[cx-6,cy+6],[cx-10,cy+3]],'#4a5358');
  poly([[cx-9,cy-2],[cx-5,cy-5],[cx+4,cy-5],[cx+9,cy-2],[cx+8,cy+3],[cx+3,cy+6],[cx-5,cy+5],[cx-9,cy+3]],'#aeb8bd');
  poly([[cx-8,cy-2],[cx-4,cy-4],[cx+2,cy-4],[cx+3,cy-1],[cx-6,cy+1]],'#e8eef0');
  for(const [rx,ry] of [[-6,-2],[6,-2],[-4,4],[5,3]]){T.r(cx+rx,cy+ry,2,2,'#6f7a80');T.r(cx+rx,cy+ry,1,1,'#dfe6e8');}
  T.r(cx-1,cy-5,2,11,'#8d989d');},
 collapse:()=>{},death:()=>{}};
// Einstellungen der Ansicht je Verletzung: Knick, Zerknittern, Abtrennen, schlaffe Finger, Gesichtsausdruck
function viewOptions(kind,part,k,o){const v={face:{mood:k<0?'calm':'pain',t:k}},hit=out(k/.12),wob=k>0?Math.sin(k*30)*Math.exp(-k*6)*.12:0;
 if(kind==='fracture')v.bend=-(.3*hit+wob);if(kind==='badfracture')v.bend=-(.52*hit+wob);if(kind==='shatter'||kind==='pulp'){v.crumple=(kind==='pulp'?1.25:1)*hit+wob;}
 if(kind==='sever'&&k>=0)v.cut=true;if(kind==='sinew'&&k>0)v.limp=out(k/.5);
 if(kind==='sinew'||kind==='joint'){if(['lh','rh','lf','rf'].includes(part))v.wrist=true;}
 if(kind==='skullheal'){v.face={mood:(o.day|0)>0?'calm':'pain',t:k};if((o.day|0)===0)v.sink=18;}
 if(kind==='skullfracture'){v.sink=18;v.face={mood:k<0?'calm':k<.25?'shock':'pain',t:k};}
 if(kind==='concussion')v.face={mood:k<0?'calm':k<.25?'shock':'dizzy',t:k};
 if(kind==='death'){/* drei Arten zu fallen; bei wichtigen Kämpfern langsamer */const slow=o.dramatic?1.7:1,p=ease((k-.5*slow)/(1.5*slow)),way=o.variant||0;v.face={mood:k<.3*slow?'shock':k<.6*slow?'pain':'out',pale:cl(k/(1.6*slow)),t:k,blood:way===2?cl((k-.3)/1.2):0};v.sink=p*(way===2?40:34);v.tilt=p*(way===1?-.7:way===2?-.26:.6);}
 if(kind==='collapse'){const p=ease((k-.2)/1.5);v.face={mood:k<.5?'shock':'out',pale:cl(k/1.2),t:k};v.sink=p*46;v.tilt=p*.5;}
 if(['head','neck'].includes(part)&&kind==='sever'&&k>=0){v.off={dx:k*34,dy:-k*74+k*k*118,ang:k*2.4};v.face={mood:k<.5?'shock':'out',pale:cl(k/1.5),t:k};}
 if(kind==='joint'&&['ls','rs'].includes(part))v.u=.02;return v;}
// ---------- Waffe im Anflug (vor dem Treffer) und im Kontakt ----------
function weaponFx(q,T,V,cls,wid,t,kind){const k=t-HIT,A=V.A;if(cls==='none')return;
 if(cls==='arrow'){/* Pfeil oder Bolzen: schießt herein, bleibt zitternd stecken */const L=wid==='crossbow'?30:44,ang=-2.55,wob=k>0?Math.sin(k*38)*Math.exp(-k*4)*1.6:0,fly=k<0?cl(-k/.14):0,bx=A.x+Math.cos(ang)*(4-fly*150),by=A.y+Math.sin(ang)*(4-fly*150),ex=bx+Math.cos(ang)*L,ey=by+Math.sin(ang)*L+wob;if(k<-.14)return;
  T.line(bx,by,ex,ey,'#4a3620',3);T.line(bx,by,ex,ey,'#8a6a3c',2);T.line(bx,by-1,ex,ey-1,'#c49a58',1);for(let i=0;i<9;i++){const u=1-i*.04,fx=bx+(ex-bx)*u,fy=by+(ey-by)*u;T.r(fx-4,fy-5,3,3,'#f0ead8');T.r(fx+2,fy+3,3,3,'#cfc6b0');T.r(fx-2,fy-3,2,2,'#b8423a');}T.r(ex-1,ey-1,3,3,'#a33a2c');if(k<0){T.r(bx+Math.cos(ang)*-5,by+Math.sin(ang)*-5,3,3,'#dfe4d2');}return;}
 if(k>.5)return;const a=1-cl((k-.25)/.25);q.globalAlpha=a;
 if(cls==='blunt'){/* Kopf der Waffe fällt von oben auf die Stelle und prallt zurück */const p=k<0?cl(1+k/.3):1-cl(k/.3)*.8,hx=A.x+26-p*22,hy=A.y-70+p*62,hw=wid==='hammer'?26:wid==='mace'?18:15,hh=wid==='hammer'?18:wid==='mace'?16:26;
  T.line(hx+hw/2,hy+hh/2,hx+60,hy-58,'#5a4128',4);T.line(hx+hw/2,hy+hh/2,hx+60,hy-58,'#8b6b45',2);
  if(wid==='club'){for(let j=0;j<hh;j++){const w=hw-Math.abs(j-hh/2)*.5;T.r(hx+(hw-w)/2,hy+j,w,1,j<3?'#a8845a':j>hh-4?'#4d3620':'#7b5a38');}T.r(hx+3,hy+5,3,2,'#3a2a1c');T.r(hx+9,hy+14,3,2,'#3a2a1c');}
  else{T.r(hx,hy,hw,hh,'#3f4642');T.r(hx+1,hy+1,hw-2,hh-2,'#7d8687');T.r(hx+1,hy+1,hw-2,3,'#c2c9bf');T.r(hx+1,hy+hh-5,hw-2,4,'#515a55');if(wid==='mace')for(let i=0;i<4;i++){T.r(hx-3,hy+2+i*4,4,2,'#9aa39b');T.r(hx+hw-1,hy+2+i*4,4,2,'#5f6863');}}}
 else if(cls==='spear'){/* Spitze stößt schräg hinein und wird wieder herausgezogen */const ang=-2.5,dep=k<0?-cl(-k/.25)*60:k<.18?6:6-(k-.18)/.3*70,tx=A.x+Math.cos(ang)*-dep,ty=A.y+Math.sin(ang)*-dep,sx=tx+Math.cos(ang)*120,sy=ty+Math.sin(ang)*120;
  T.line(tx+Math.cos(ang)*14,ty+Math.sin(ang)*14,sx,sy,'#5a4128',4);T.line(tx+Math.cos(ang)*14,ty+Math.sin(ang)*14-1,sx,sy-1,'#9a7848',1);for(let i=0;i<16;i++){const w=i<3?1+i:i<10?5:Math.max(1,5-(i-10));if(kind==='pierce'||i>(dep>0?dep:0)/1)T.r(tx+Math.cos(ang)*i-w/2,ty+Math.sin(ang)*i-w/2,w,w,i%2?'#dfe4d2':'#aab4aa');}
  if(kind==='pierce'&&k>=0&&k<.3)for(let i=0;i<12;i++){T.r(A.x+Math.cos(ang+Math.PI)*(i+3),A.y+Math.sin(ang+Math.PI)*(i+3),Math.max(1,4-i*.3),Math.max(1,4-i*.3),i%2?'#c9584a':'#dfe4d2');}}
 else{/* Klinge zieht quer über die Stelle; im Kontakt eine helle Schnittspur */const p=k<0?cl(1+k/.22):1,nx=-V.dir.y,ny=V.dir.x,sw=(p-.5)*70,ux=V.dir.x*.7+nx*.7,uy=V.dir.y*.7+ny*.7,bx=A.x+ux*sw,by=A.y+uy*sw,ang=-2.2;
  if(k<.12){const L=wid==='dagger'?34:wid==='axe'||wid==='doubleaxe'?30:56;for(let i=0;i<L;i++){const w=Math.max(1,(wid==='axe'||wid==='doubleaxe')?(i<12?10-i*.3:3):4-i/L*3);T.r(bx+Math.cos(ang)*i-w/2,by+Math.sin(ang)*i-w/2,w+1,w+1,i%5===0?'#f4f6ea':'#c2cbc0');}T.line(bx+Math.cos(ang)*((wid==='dagger'?34:56)),by+Math.sin(ang)*((wid==='dagger'?34:56)),bx+Math.cos(ang)*((wid==='dagger'?34:56)+16),by+Math.sin(ang)*((wid==='dagger'?34:56)+16),'#6e5230',4);}
  if(k>=0&&k<.16){q.globalAlpha=1-k/.16;T.line(A.x-ux*30,A.y-uy*30,A.x+ux*30,A.y+uy*30,'#fffbe8',2);}}
 q.globalAlpha=1;}
// ---------- Ein Bild der Nahaufnahme ----------
const buffers=new WeakMap();
// ---------- Helm in der Nahaufnahme (Aussehen wie im Spiel: Material Leder/Verstärkt/Metall, Qualität 0–6) ----------
const LOOK={leather:[{metal:'#927653',edge:'#b39770',trim:'#5a4630',dark:'#5a4630',stud:'#77664c',cloth:'#695c46'},{metal:'#805936',edge:'#b18c59',trim:'#4e3727',dark:'#4e3727',stud:'#9a8a68',cloth:'#685646'},{metal:'#77492c',edge:'#b98550',trim:'#3d2a1e',dark:'#3d2a1e',stud:'#b89a62',cloth:'#456c65'},{metal:'#6a3d27',edge:'#b0784a',trim:'#c9a55a',dark:'#2f211a',stud:'#c9a55a',cloth:'#395e76'},{metal:'#5a2c22',edge:'#a35c40',trim:'#d8b45e',dark:'#261a17',stud:'#dbdccb',cloth:'#704754'},{metal:'#33292c',edge:'#6d5a58',trim:'#d9b65c',dark:'#17151a',stud:'#ecd184',cloth:'#446c78'},{metal:'#5a1c27',edge:'#a8444a',trim:'#f0cf74',dark:'#26101a',stud:'#fff0bc',gem:'#5fd0c0',cloth:'#703d68'}],
 metal:[{metal:'#8c7861',edge:'#b29d79',trim:'#59432f',cloth:'#695c46'},{metal:'#8d9892',edge:'#c2c5b0',trim:'#5d4834',cloth:'#685646'},{metal:'#a3b2ac',edge:'#dae1ca',trim:'#a4844e',cloth:'#456c65'},{metal:'#6e9699',edge:'#b7d6cc',trim:'#cbb782',cloth:'#395e76'},{metal:'#b9c0cb',edge:'#edf0db',trim:'#d9aa54',cloth:'#704754'},{metal:'#dec591',edge:'#fff0bc',trim:'#855a39',cloth:'#446c78'},{metal:'#e9d693',edge:'#fff4d3',trim:'#c06d45',cloth:'#703d68'}]};
const MEDL=['#6f5a43','#6b4a30','#5f3d27','#553423','#4a2a20','#352626','#42202a'],DARKL=['#5a4630','#4e3727','#3d2a1e','#2f211a','#261a17','#17151a','#26101a'];
function helmLook(h){const q=cl(h.q|0,0,6);if(h.mat==='leather')return LOOK.leather[q];const p={...LOOK.metal[q]};if(h.mat==='medium'){p.leather=MEDL[q];p.dark=DARKL[q];}return p;}
function helmClose(T,h,k,cx=80,top=28){const q=cl(h.q|0,0,6),p=helmLook(h),soft=h.mat==='leather',mixed=h.mat==='medium',dome=mixed?p.leather:p.metal,shadeC=mix(dome,'#000000',.32),hit=k>0?out(k/.15):0,R=28;
 for(let yy=-10;yy<=15;yy++){const u=(yy-15)/25,hw=Math.round((R+1)*Math.sqrt(Math.max(0,1-u*u)));if(hw<1)continue;for(let x=-hw;x<=hw;x++){const s=x/hw;let c=dome;if(s<-.4)c=mix(dome,p.edge,.55);else if(s>.45)c=shadeC;if(yy<-6)c=mix(c,p.edge,.25);
   // Eindellung: Schatten oben links, Licht unten rechts am Rand der Delle
   const dd=Math.hypot((x)/(14),(yy+top-37)/(8));if(hit&&dd<1.05&&dd>.78)c=x<0?mix(c,'#000000',.4*hit):mix(c,p.edge,.45*hit);else if(hit&&dd<=.78)c=mix(c,'#000000',.22*hit);
   T.r(cx+x,top+yy,1,1,c);}}
 // Stirnband und Beschläge
 T.r(cx-R,top+12,R*2+1,4,soft&&q<5?p.dark:p.trim);T.r(cx-R,top+12,R*2+1,1,p.edge);if(q>=1)for(let n=-R+3;n<R;n+=6)T.r(cx+n,top+13,2,2,soft?(p.stud||p.edge):p.edge);
 if(q===0&&!mixed)for(let n=-16;n<17;n+=8)T.r(cx+n,top-1,1,9,p.cloth);
 if(mixed){T.r(cx-14,top-9,29,3,p.metal);T.r(cx-14,top-9,29,1,p.edge);T.r(cx-1,top-9,3,22,p.metal);}
 if(soft){if(q>=2)for(let n=-14;n<15;n+=4)T.r(cx+n,top+8,1,1,p.edge);if(q>=4)T.r(cx,top-9,3,22,p.dark);if(q===6)T.r(cx-1,top+13,3,3,p.gem);}
 // Wangenklappen über den Ohren
 if(q>=1)for(const sd of [-1,1]){const x0=cx+sd*(R-4)-(sd<0?1:2);T.r(x0,top+16,5,20,mixed?p.metal:dome);T.r(x0+(sd<0?0:4),top+16,1,20,sd<0?p.edge:shadeC);T.r(x0,top+35,5,2,p.trim);}
 // Nasenschiene bei Metall
 if(!soft&&!mixed&&q>=2){T.r(cx-1,top+16,3,17,dome);T.r(cx-1,top+16,1,17,p.edge);}
 // Kamm und Zier
 if(q>=3){T.r(cx-2,top-17,5,8,p.cloth);T.r(cx-6,top-16,13,3,p.trim);}
 if(q>=5){T.r(cx-R+1,top-3,4,6,p.trim);T.r(cx+R-4,top-3,4,6,p.trim);}
 if(q===6){T.r(cx,top-24,3,8,p.edge);T.r(cx,top+6,3,3,soft?p.gem:'#c06d45');}}
function helmOf(g){try{const it=M.armorItems?.(g)?.find(i=>M.definition(i)?.parts?.includes('head'));return it?{mat:['leather','medium','metal'].includes(it.material)?it.material:'metal',q:it.q|0}:null;}catch{return null;}}
function paint(g,w,h,o,t){const kind0=o.kind||kindOf(o.injury);
 if((kind0==='death'||(kind0==='collapse'&&o.fall))&&M.faceShot){/* Wer fällt: Großaufnahme des Kämpfers mit Rüstung (face-shots.js), Augen schließen sich, der Kopf sinkt */const k=t-HIT,dead=kind0==='death',slow=o.dramatic?1.7:1,p=ease((k-.5*slow)/(1.5*slow)),way=o.variant||0;
  M.faceShot.paint(g,w,h,{g:o.g,team:o.team,mood:k<0?'determined':k<.3*slow?'shock':k<.65*slow&&dead?'pain':'out',pale:dead?cl(k/(1.6*slow)):0,blood:dead&&way===2?cl((k-.3)/1.2):0,sink:p*(dead?30:18),tilt:p*(way===1?-.5:way===2?-.2:.45)*(dead?1:.6),dark:dead?cl((k-(o.dramatic?2.4:1.5))/(o.dramatic?2.4:1.4))*(o.dramatic?.6:.42):0,yaw:(o.team===1?-1:1)*(.55-.5*cl(t/(o.dramatic?5:3))),zoom:1+.12*cl(k/2)},t);
  if(k>=0&&k<.09){g.globalAlpha=.7*(1-k/.09);g.fillStyle='#fff6dc';g.fillRect(0,0,w,h);g.globalAlpha=1;}
  if(o.dramatic){const bar=Math.round(h*.07);g.fillStyle='#050302';g.fillRect(0,0,w,bar);const rv=g.createRadialGradient(w/2,h/2,Math.min(w,h)*.35,w/2,h/2,Math.max(w,h)*.7);rv.addColorStop(0,'rgba(120,0,0,0)');rv.addColorStop(1,'rgba(140,10,6,'+(.25+.12*Math.sin(t*5)).toFixed(3)+')');g.fillStyle=rv;g.fillRect(0,0,w,h);}
  caption(g,w,h,{...o,noFace:true},t,kind0);return;}
 let b=buffers.get(g.canvas);if(!b){b=document.createElement('canvas');b.width=FW;b.height=FH;buffers.set(g.canvas,b);}const q=b.getContext('2d');q.imageSmoothingEnabled=false;q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,FW,FH);
 const T=tools(q),C=palette(o.g),kind=o.kind||kindOf(o.injury),k=t-HIT,cls=o.cls||weaponClass(o.wid),right=o.part[0]==='r'&&o.part!=='r';
 backdrop(q,T,t);const view=kind==='sever'&&o.part==='head'?'neck':viewOf(o.part),V=VIEW[view](q,T,C,viewOptions(kind,o.part,k,o));V.A=V.mid?{x:V.mid.x,y:V.mid.y}:V.A;V.seed=[...(o.part+kind+(o.g?.id||o.g?.name||''))].reduce((n,c)=>(n*31+c.charCodeAt(0))%9973,7);
 if(kind==='sever'&&k>=0&&V.rest&&o.part!=='head'&&o.part!=='neck'){const fall=k*k*70;V.rest(V.dir.x*(4+k*22),V.dir.y*4+fall,k*1.4);}
 if(kind==='skullheal'){V.A=(o.day|0)>0?{x:82,y:20}:{x:80,y:38};C.healDay=o.day;}
 if(kind==='skullfracture'){V.A={x:80,y:38};C.helm=o.helm===undefined?helmOf(o.g):o.helm;if(C.helm)helmClose(T,C.helm,k);}
 if(k>=0){EFFECT[kind]?.(T,V,k,C);if(kind==='collapse'||kind==='death'){for(let i=0;i<5;i++){const u=(t*.9+i/5)%1;T.r(60+i*9,70+u*26,1,2,BLOOD);}T.oval(80,97,cl(k/2)*46,cl(k/2)*4,DARK);T.oval(82,97,cl(k/2)*30,cl(k/2)*2.4,BLOOD);}}
 if(kind==='death'&&k>0){q.globalAlpha=cl((k-(o.dramatic?2.2:1.3))/(o.dramatic?2.4:1.4))*(o.dramatic?.55:.38);T.r(0,0,FW,FH,'#050302');q.globalAlpha=1;}
 if(kind!=='collapse'&&kind!=='scar'&&kind!=='death'&&kind!=='skullheal')weaponFx(q,T,V,kind==='arrow'?'arrow':cls,o.wid,t,kind);
 if(k>=0&&k<.09){q.globalAlpha=.75*(1-k/.09);T.r(0,0,FW,FH,'#fff6dc');q.globalAlpha=1;}
 // Ausgabe: ganzzahlig vergrößert, rechte Körperseite gespiegelt, kurzes Zittern beim Treffer, langsamer Zug ins Bild
 const near=kind==='collapse'||kind==='death'?0:kind==='sever'&&['head','neck'].includes(o.part)?.16:kind==='sever'||['head','neck'].includes(o.part)?.2:({thigh:.14,upperarm:.28,chest:.36,belly:.36,shoulder:.36})[view]??.48,pin=k<0?0:out(k/.22),zoom=1+.04*ease(t/LEN)+near*pin+(k>0?.06*k/LEN:0),s=Math.max(w/FW,h/FH)*zoom,shake=k>=0&&k<.3?(1-k/.3)*5:0,dw=Math.round(FW*s),dh=Math.round(FH*s),pf=near?pin:0;let dx=Math.round(w/2-(FW/2+(V.A.x-FW/2)*pf)*s),dy=Math.round((h/2-FH/2*s)*(1-pf)+(h*.36-V.A.y*s)*pf);dx=Math.max(w-dw,Math.min(0,dx))+Math.round((Math.random()-.5)*shake*s*.4);dy=Math.max(h-dh,Math.min(0,dy))+Math.round((Math.random()-.5)*shake*s*.3);
 g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;g.fillStyle='#120c09';g.fillRect(0,0,w,h);g.save();if(right){g.translate(w,0);g.scale(-1,1);}g.drawImage(b,dx,dy,dw,dh);g.restore();
 const vg=g.createRadialGradient(w/2,h/2,Math.min(w,h)*.3,w/2,h/2,Math.max(w,h)*.72);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.6)');g.fillStyle=vg;g.fillRect(0,0,w,h);
 if(o.dramatic){/* Kinobalken und roter Rand */const bar=Math.round(h*.07);g.fillStyle='#050302';g.fillRect(0,0,w,bar);const rv=g.createRadialGradient(w/2,h/2,Math.min(w,h)*.35,w/2,h/2,Math.max(w,h)*.7);rv.addColorStop(0,'rgba(120,0,0,0)');rv.addColorStop(1,'rgba(140,10,6,'+(.25+.12*Math.sin(t*5)).toFixed(3)+')');g.fillStyle=rv;g.fillRect(0,0,w,h);}
 caption(g,w,h,o,t,kind);}
// Beschriftung wie eine Einblendung im Kampf: Porträt und Name des Getroffenen, wer womit, die Verletzung groß
const faces=new WeakMap();
function caption(g,w,h,o,t,kind){const k=t-HIT,u=Math.min(w/660,h/420)*(o.textScale||1);let f=faces.get(o.g);if(!f&&o.g&&!o.noFace){f=document.createElement('canvas');try{M.renderPortrait(f,o.g,{unarmored:true});}catch{}faces.set(o.g,f);}
 const pw=o.noFace?-Math.round(12*u):Math.round(72*u),ph=Math.round(90*u),px=Math.round(10*u),py=Math.round(10*u);if(!o.noFace){g.fillStyle='#17201c';g.fillRect(px-3,py-3,pw+6,ph+6);g.fillStyle='#e0b565';g.fillRect(px-2,py-2,pw+4,ph+4);if(f?.width)g.drawImage(f,px,py,pw,ph);}
 g.textAlign='left';g.textBaseline='top';g.font=`bold ${Math.round(25*u)}px 'Courier Prime',monospace`;const name=String(o.g?.name||'').toUpperCase();g.fillStyle='#17201c';g.fillText(name,px+pw+12*u+2,py+2);g.fillStyle='#efe0b3';g.fillText(name,px+pw+12*u,py);
 g.font=`bold ${Math.round(19*u)}px 'Courier Prime',monospace`;g.fillStyle='#17201c';g.fillText(M.partName(o.part),px+pw+12*u+2,py+31*u+2);g.fillStyle='#e0b565';g.fillText(M.partName(o.part),px+pw+12*u,py+31*u);
 if(k<0)return;const a=cl(k/.18),bh=Math.round(124*u),by=h-bh;g.globalAlpha=a*.86;g.fillStyle='#0d0a08';g.fillRect(0,by,w,bh);g.globalAlpha=a;g.fillStyle='#a3231d';g.fillRect(0,by,w,Math.max(2,Math.round(3*u)));
 g.textAlign='center';const fit=(txt,px,bold)=>{let z=Math.round(px*u);do{g.font=`${bold?'bold ':''}${z}px 'Courier Prime',monospace`;}while(g.measureText(txt).width>w-40*u&&--z>8);return z;};const l1=o.line1||((o.attacker||'')+(o.weaponName?' · '+o.weaponName:''));fit(l1,21);g.fillStyle='#d9cfb0';g.fillText(l1,w/2,by+11*u);
 const big=(o.title||o.injury||'').toUpperCase(),size=fit(big,44,true),pop=1+.25*(1-cl(k/.22));g.font=`bold ${Math.round(size*pop)}px 'Courier Prime',monospace`;g.fillStyle='#17201c';g.fillText(big,w/2+2,by+38*u+2);g.fillStyle=o.color||'#f4d37a';g.fillText(big,w/2,by+38*u);
 fit(o.line3||'',20);g.fillStyle='#efe0b3';g.fillText(o.line3||'',w/2,by+90*u);g.globalAlpha=1;
 if(o.waiting&&Math.sin(t*0+performance.now()/260)>-.2){/* wartet auf Antippen */g.textAlign='right';g.font=`bold ${Math.round(17*u)}px 'Courier Prime',monospace`;g.fillStyle='#17201c';g.fillText('TIPPEN ▸',w-12*u+2,by-26*u+2);g.fillStyle='#f4d37a';g.fillText('TIPPEN ▸',w-12*u,by-26*u);}}
// ---------- Abspielen: in eine vorhandene Leinwand (Film) oder als eigene Einblendung (Galerie, später Arena) ----------
function sound(kind,cls){const s=M.sound;if(!s)return;if(kind==='sever')s('sever');else if(['fracture','badfracture','shatter','pulp'].includes(kind)){s('heavy');s('fall');}else if(cls==='blunt'||['bruise','contusion','crush','joint','concussion'].includes(kind))s('hit');else if(kind==='collapse')s('fall');else if(['stab','deepstab','arrow','pierce'].includes(kind))s('stick');else if(kind!=='scar')s('slash');}
function start(o){const end=o.len||LEN,shot={o:{...o,kind:o.kind||kindOf(o.injury)},t:o.from||0,hit:false,done:false,step(dt){this.t+=dt;if(!this.hit&&this.t>=HIT){this.hit=true;if(!this.o.mute)sound(this.o.kind,this.o.cls||weaponClass(this.o.wid));if(!this.o.mute&&this.o.g?.appearance&&!['scar'].includes(this.o.kind))M.voice?.('pain',(M.voicePitch?.(this.o?.g)??1),true);}if(this.t>=end){if(this.o.hold&&!this.released){this.t=end-.001;this.o.waiting=true;return true;}this.done=true;}return !this.done;},paint(g,w,h){paint(g,w,h,this.o,this.t);},skip(){if(this.t<HIT)this.t=HIT;else{this.released=true;this.done=true;}}};return shot;}
let live=null;
function play(o,onDone){stop();const v=document.createElement('div');v.className='injury-shot';v.innerHTML='<canvas width="660" height="420"></canvas>';document.body.appendChild(v);const c=v.firstChild,g=c.getContext('2d'),shot=start(o);let last=performance.now();live={v,shot};v.addEventListener('click',()=>shot.skip());
 const frame=now=>{if(!live||live.shot!==shot)return;const dt=Math.min(.05,(now-last)/1000);last=now;if(!shot.step(dt)){stop();onDone?.();return;}shot.paint(g,c.width,c.height);requestAnimationFrame(frame);};requestAnimationFrame(frame);return shot;}
function stop(){live?.v.remove();live=null;}
// Später in der Arena nur für Treffer mit Folgen: Dauerschaden, Bruch, Abtrennung, schwere Stufe oder Zusammenbruch durch Blutverlust
const relevant=(p,down)=>!!(p?.missing||p?.chronic>0||p?.fracture||M.injuryGrade(p)>=3||down);
// =====================================================================================================
// ARENAKAMPF: kurze Nahaufnahme bei Verletzungen mit Folgen. Reine Darstellung: liest nur mit, würfelt nicht,
// ändert keinen Kampfwert. Der Kampf hält für die Dauer der Einblendung an (Antippen überspringt).
// Auslöser: Bruch, Trümmerbruch, Abtrennung, Sehnen- und Bauchverletzung, Durchstich, Dauerschaden,
// jede Wunde ab Grad 3 sowie Zusammenbruch durch Blutverlust. Je Kämpfer, Stelle und Art nur einmal pro Kampf.
// =====================================================================================================
const S=M.s,MODES=[['all','Alle Kämpfer'],['own','Nur eigene Gladiatoren'],['key','Nur wichtige (Anführer, deine drei Stärksten)'],['off','Aus']],GRADE=['Kratzer','Leicht','Mittel','Schwer','Kritisch','Verloren'];
const mode=()=>MODES.some(m=>m[0]===S.options?.closeups)?S.options.closeups:'all';
const RANK={sever:9,skullfracture:9,pulp:8,shatter:8,badfracture:7,fracture:6,gut:6,pierce:5,sinew:5},NOTED=['Schädelbruch','Abgetrennt','Trümmerbruch','Zertrümmert','Durchstochen','Tiefe Bauchwunde','Kritische Bauchverletzung'];
const GAP=5,SHOT_FROM=.3,SHOT_LEN=2;
// Erweiterungen für das Kampf-HUD (Testfassung): eigene Zeichenfläche, Stufe „alle Verletzungen“, Testschlachten
const cfg={host:null,onShot:null,busy:null,benchmark:true,textScale:1,fallShots:false,important:null,fallText:null,confirm:false};let falls=[];const level=()=>S.options?.closeupLevel==='all'?'all':'severe';
// Antippen zum Fortsetzen und eigene Bilder für Niedergänge gibt es nur zusammen mit der Info-Tafel (dort ist Platz dafür)
const tap=()=>cfg.confirm&&!!cfg.host?.(),fallsOn=()=>cfg.fallShots&&!!cfg.host?.();
let pend=[],seen=new Set(),seenBattle=null,arena=null,gap=0,keyIds=null;
const watching=()=>{const b=S.battle;return typeof document!=='undefined'&&!!b&&(cfg.benchmark||(!b.benchmark&&!M.benchmarkActive))&&!b.result&&!b.finale&&!b.cinematic&&!b.paused&&document.getElementById('battleView')?.hidden===false;};
function note(g,part,injury,attacker,weapon,extra){const b=S.battle;if(!b||(!cfg.benchmark&&(b.benchmark||M.benchmarkActive))||!g?.body?.[part]||g.id==='rex')return;let e=pend.find(x=>x.g===g&&x.part===part&&!x.collapse);if(!e){e={g,part,injury:null,attacker:null,weapon:null,time:b.time};pend.push(e);if(pend.length>24)pend.shift();}
 if(injury&&(!e.injury||(RANK[kindOf(injury)]||0)>=(RANK[kindOf(e.injury)]||0)))e.injury=injury;if(attacker)e.attacker=attacker;if(weapon)e.weapon=weapon;if(extra)Object.assign(e,extra);}
const wrap=(name,fn)=>{const base=M[name];if(typeof base!=='function')return;M[name]=function(){const r=base.apply(this,arguments);try{fn(...arguments);}catch{}return r;};};
wrap('recordWound',(g,id,injury,attacker,weapon)=>note(g,id,injury,attacker,weapon));
wrap('noteInjury',(g,id,injury,attacker,weapon)=>{if(NOTED.includes(injury))note(g,id,injury,attacker,weapon);});
wrap('addScar',(g,id,text)=>{if(text==='Dauerhafte Einschränkung')note(g,id,null,null,null,{lasting:true});});
function wanted(g){const b=S.battle,m=mode(),act=b.actors.find(a=>a.g===g);if(!act)return false;if(m==='all')return true;if(m==='own')return act.team===0;
 if(!keyIds){keyIds=new Set(Object.values(b.leaders||{}));for(const a of b.actors.filter(a=>a.team===0).sort((x,y)=>M.power(y.g)-M.power(x.g)).slice(0,3))keyIds.add(a.id);}return keyIds.has(act.id);}
const scoreOf=e=>{const p=e.g.body[e.part],k=e.collapse?'collapse':kindOf(e.injury||p.injury||'Schnittwunde');return e.collapse?5.5:(p.missing?9:RANK[k]||0)+(e.lasting?4:0)+(M.injuryGrade(p)>=3?3:0);};
function pick(dt,busy){const b=S.battle;if(seenBattle!==b.id){seenBattle=b.id;seen=new Set();pend=[];falls=[];keyIds=null;gap=1.5;}gap-=dt;
 if(fallsOn()){/* jeder, der fällt oder zu Boden geht; der Tod geht allem anderen vor */for(const a of b.actors){if(a.rex)continue;const id=a.g.id;if(a.g.dead&&!seen.has(id+'|death')){seen.add(id+'|death');seen.add(id+'|collapse');falls=falls.filter(f=>f.g!==a.g);falls.push({g:a.g,a,death:true});}else if(a.down&&!a.g.dead&&!seen.has(id+'|collapse')){seen.add(id+'|collapse');falls.push({g:a.g,a,collapse:true,reason:a.reason});}}
  const f=falls.find(e=>e.death)||falls[0];if(f){const imp=!!cfg.important?.(f.g,f.a),live=!tap()&&!f.death&&!imp&&!!cfg.host?.();if(!(live&&busy)){falls=falls.filter(x=>x!==f);if(f.death||wanted(f.g)){pend=pend.filter(e=>e.g!==f.g);return {e:{...f,part:'head'},k:f.death?'death':'collapse',inj:'',key:'',live,dramatic:!!f.death&&imp,fall:true};}}}}
 else for(const a of b.actors)if(a.down&&!a.g.dead&&a.reason==='Blutverlust'&&!seen.has(a.g.id+'|collapse')){seen.add(a.g.id+'|collapse');pend.push({g:a.g,part:'chest',collapse:true,time:b.time});}
 if(!pend.length)return null;
 if(level()==='all'){/* schwere halten den Kampf an; leichte laufen nebenher in der Tafel, solange sie frei ist */pend=pend.filter(e=>!e.g.dead&&wanted(e.g));const make=(e,live)=>{const p=e.g.body[e.part],inj=e.injury||p.injury||'Schnittwunde';return {e,k:e.collapse?'collapse':kindOf(inj),inj,key:'',live};};
  const keyOf=e=>{const p=e.g.body[e.part];return e.g.id+'|'+e.part+'|'+(e.collapse?'collapse':kindOf(e.injury||p.injury||''))+(e.lasting?'|L':'');};
  /* anhalten höchstens alle GAP Sekunden und je Kämpfer, Stelle und Art einmal; alles andere läuft nebenher */const hard=gap>0?null:pend.find(e=>scoreOf(e)>=3&&!seen.has(keyOf(e)));if(hard){seen.add(keyOf(hard));pend=pend.filter(e=>e!==hard);return make(hard,false);}if(tap()){/* jede gezeigte Verletzung hält an und wartet auf Antippen; leichte der Reihe nach */const one=gap>0?null:pend.shift();return one?make(one,false):null;}const soft=busy||!cfg.host?.()||cfg.busy?.()?null:pend[pend.length-1];pend=[];return soft?make(soft,true):null;}
 if(gap>0){pend=pend.filter(e=>b.time-e.time<2.5);return null;}
 let best=null,top=-1;for(const e of pend){if(e.g.dead)continue;const p=e.g.body[e.part],inj=e.injury||p.injury||'Schnittwunde',k=e.collapse?'collapse':kindOf(inj),score=e.collapse?5.5:(p.missing?9:RANK[k]||0)+(e.lasting?4:0)+(M.injuryGrade(p)>=3?3:0),key=e.g.id+'|'+e.part+'|'+k+(e.lasting?'|L':'');if(score<3||seen.has(key)||!wanted(e.g))continue;if(score>top){top=score;best={e,k,inj,key};}}
 pend=[];if(!best)return null;seen.add(best.key);return best;}
// Waffe aus dem Namen im Kampfbericht (Titel je Qualitätsstufe). Unbekannt (Pranken, Tritt, Schildstoß): keine Waffe im Bild.
let titles=null;
function weaponId(name){if(!name)return null;if(!titles){titles={};for(const d of M.weaponDefs||[]){titles[d.name]=d.id;for(let q=0;q<=6;q++)titles[M.itemTitle({kind:'weapon',def:d.id,q})]=d.id;}}return titles[name]||null;}
function arenaShot(x){const {e,k,inj}=x,g=e.g,p=g.body[e.part],gr=M.injuryGrade(p),by=e.a?(S.battle.actors.find(q=>q.id===e.a.lastAttackerId)?.g.name||e.a.lastAttacker||''):'';let o;
 if(k==='death'){const killer=g.killer&&g.killer!=='Unbekannt'?g.killer:'';o={g,team:e.a?.team,part:'head',kind:'death',cls:'none',variant:Math.floor(Math.random()*3),dramatic:!!x.dramatic,line1:killer?killer+' tötet '+g.name:g.name+' stirbt',title:'† '+g.name+' fällt',line3:g.cause||'',color:'#f29b83',...(cfg.fallText?.(x)||{})};}
 else if(k==='collapse'&&x.fall&&e.reason!=='Blutverlust')o={g,team:e.a?.team,fall:true,variant:Math.floor(Math.random()*3),part:'chest',kind:'collapse',line1:(by&&by!==g.name?by+' streckt '+g.name+' nieder':g.name+' geht zu Boden'),title:'Kampfunfähig',line3:e.reason||'',color:'#f29b83',...(cfg.fallText?.(x)||{})};
 else if(k==='collapse')o={g,part:'chest',kind:'collapse',line1:g.name+' verliert zu viel Blut',title:'Geht blutend zu Boden',line3:'Blut '+Math.round(g.blood)+' % · kampfunfähig'+(by?' · zuletzt getroffen von '+by:''),color:'#f29b83',team:e.a?.team,fall:!!x.fall,variant:1};
 else{const wid=weaponId(e.weapon),kind=['bow','crossbow'].includes(wid)&&['stab','deepstab'].includes(k)?'arrow':k,
   cons=p.missing?'für immer verloren':p.fracture?.crushed?'Dauerschaden: heilt nie ganz':p.fracture?'Bruch: mindestens '+Math.ceil(p.fracture.days/(M.HEAL_SPEED||1))+' Tage':e.lasting||p.chronic>0?'Dauerschaden':p.bleed>0?'blutet weiter':'';
  o={g,part:e.part,kind,wid,cls:wid?undefined:'none',line1:(e.attacker||'Ein Gegner')+(e.weapon?' ('+e.weapon+')':'')+' fügt '+g.name+' zu:',title:inj,line3:[p.missing?'':'Grad '+gr+' ('+GRADE[gr]+')',kind==='arrow'?'der Pfeil bleibt stecken':'',cons].filter(Boolean).join(' · '),color:gr>=3||p.missing?'#f29b83':'#f4d37a'};}
 const shot=start({...o,textScale:cfg.host?.()?cfg.textScale:1,from:SHOT_FROM,len:k==='death'?(x.dramatic?5:3):x.live?1.5:SHOT_LEN,hold:tap()&&!x.live,mute:true}),host=cfg.host?.();
 if(host){cfg.onShot?.(true,o,!!x.live);arena={v:null,shot,c:host,g:host.getContext('2d'),battle:S.battle.id,live:!!x.live};}
 else{const v=document.createElement('div');v.className='injury-shot injury-shot-arena';v.innerHTML='<canvas width="660" height="420"></canvas>';document.body.appendChild(v);v.addEventListener('click',()=>{shot.done=true;});arena={v,shot,c:v.firstChild,g:v.firstChild.getContext('2d'),battle:S.battle.id};}if(!x.live)gap=tap()?1.2:GAP;}
function endArena(){arena?.v?.remove();const hosted=arena&&!arena.v;arena=null;if(hosted)cfg.onShot?.(false);}
if(typeof M.fixedStep==='function'&&typeof M.presentationStep==='function'){
 const fixed=M.fixedStep,present=M.presentationStep,effects=M.effectsStep;
 M.fixedStep=function(dt){if(arena&&!arena.live){/* mit Bestätigung: erst kurz Zeitlupe, dann Stillstand */if(arena.shot.o.hold&&arena.shot.t-SHOT_FROM<.45&&!arena.shot.o.waiting){arena.slow=(arena.slow||0)+1;if(arena.slow%6)return;}else return;}return fixed.apply(this,arguments);};
 if(typeof effects==='function')M.effectsStep=function(dt){if(arena&&!arena.live)return;return effects.apply(this,arguments);};
 M.presentationStep=function(dt){if(arena){if(!S.battle||S.battle.id!==arena.battle||arena.shot.done||!arena.shot.step(dt))endArena();else arena.shot.paint(arena.g,arena.c.width,arena.c.height);if(arena&&!arena.live)return;}
  const r=present.apply(this,arguments);try{if(mode()!=='off'&&watching()){const x=pick(dt,!!arena);if(x){if(arena)endArena();arenaShot(x);}}else if(pend.length)pend=[];}catch{pend=[];}return r;};}
// Zeile für die Einstellungsseite und ihre Auswahl
M.injuryOptions=()=>`<div class="list-row"><span>Nahaufnahmen bei Verletzungen<br><small>Der Kampf hält dafür kurz an. Antippen überspringt.</small></span><select class="select" id="closeups">${MODES.map(([k,n])=>`<option value="${k}"${k===mode()?' selected':''}>${n}</option>`).join('')}</select></div>`;
{const change=M.schoolChange;M.schoolChange=ev=>{if(ev?.target?.id==='closeups'){S.options.closeups=ev.target.value;M.persist?.();return true;}return change?.(ev);};}
M.injuryShots={skullStage,SKULL_STAGES,SKULL_DAYS,start,play,stop,paint,kinds:KINDS,kindOf,injuriesFor,viewOf,weaponClass,relevant,HIT,LEN,modes:MODES,mode,level,config:cfg,skip:()=>{if(arena){arena.shot.done=true;/* Antippen: aktuelle Nahaufnahme weg, aufgestaute verwerfen, kurz Ruhe (Thomas 18.10.) */pend=[];falls=[];gap=Math.max(gap,2.5);}},get arena(){return arena;},get pending(){return pend;}};
})();
