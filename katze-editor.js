'use strict';
// =====================================================================================================
// ARENA THEORY · KATZEN-EDITOR (dist/katze-editor.html): Sorten ansehen, Körper, Haltungen und Bewegung prüfen, Zeichenzeit messen.
// Bedienung Deutsch, Inhalte der Katzen Englisch. Lädt nur die Katzendateien, nicht das Spiel. Wächst mit jedem Schritt in KATZEN_FAHRPLAN.md.
// Aufbau wie der Bären-Editor (dist/baer-editor.js). Im Master-Editor verlinkt: Menü Kampf → Tiere.
// =====================================================================================================
(()=>{
const K=window.KATZE,$=id=>document.getElementById(id),el=(t,a={},h='')=>{const e=document.createElement(t);Object.assign(e,a);if(h)e.innerHTML=h;return e;};
const now=()=>performance.now()/1000,skulls=n=>'☠'.repeat(n);
const HALTUNG={stand:'Stand',sit:'Sitzen',lie:'Liegen',crouch:'Ducken'};
const FARBE={base:'Fell',light:'Bauch',shade:'Schatten',dark:'dunkel',muzzle:'Schnauze',nose:'Nase',mane:'Mähne am Gesicht',maneDark:'Mähne außen',eye:'Auge',tuft:'Schwanzquaste'};
// T: Uhr des Editors (läuft im Reiter Bewegung langsamer oder steht), rate: Zeitlupe
const ED={tab:'sorten',breed:K.FIRST,cat:null,actor:null,shape:null,face:1,T:0,rate:1,pause:false,dtLast:0,prints:[],prevR:null,jump:0,alt:null};window.KATZE_ED=ED;

// ---------------------------------------------------------------- Reiter
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{ED.tab=b.dataset.tab;document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));
 document.querySelectorAll('section').forEach(s=>s.classList.toggle('on',s.id===ED.tab));});

// ---------------------------------------------------------------- Reiter Sorten
function sorten(){const L=$('liste');L.innerHTML='';const echt=$('massstab').checked;
 for(const [k,name] of Object.entries(K.BAUART)){const list=K.BREEDS.filter(x=>x.bauart===k);L.append(el('h2',{},k+' · '+name+' ('+list.length+')'));const g=el('div',{className:'kacheln'});
  for(const X of list){const d=el('div',{className:'kachel'+(X.built?'':' leer')+(X.id===ED.pick?' on':'')});
   if(X.built)d.append(K.mini(X.id,'side',128,echt?.32:0));else d.append(el('div',{style:'height:84px;display:grid;place-items:center;color:#a8977a;font-size:12px'},'kommt in Schritt '+X.step));
   d.append(el('b',{},X.name+(X.extinct?' †':'')),el('span',{},'<span class="kopf">'+skulls(X.skulls)+'</span> · '+X.kg0+' kg'));d.onclick=()=>{ED.pick=X.id;sorten();detail(X);};g.append(d);}
  L.append(g);}}
function detail(X){const D=$('detail');D.innerHTML='';const box=el('div',{className:'detail'});
 if(X.built){box.append(K.mini(X.id,'side',260),K.mini(X.id,'head',120));}
 const t=el('div',{},'<p><b>'+X.name+'</b>'+(X.extinct?' † (extinct)':'')+' <span class="kopf">'+skulls(X.skulls)+'</span> · '+X.group+'</p><p><i>'+X.desc+'</i></p><p>Schulterhöhe '+X.cm0+' cm · Länge '+X.len0+' cm · '+X.kg0+' kg · Kampf-Soll '+X.soll+'</p><p>'+
  K.STATS.map(([k,de])=>de+' '+X.werte[k]).join(' · ')+'</p>'+(X.built?'':'<p class="hinweis">Noch nicht gebaut: kommt in Schritt '+X.step+'.</p>'));
 box.append(t);if(X.built){const b=el('button',{},'Im Reiter Körper ansehen');b.onclick=()=>{$('sorte').value=X.id;neu(X.id);document.querySelector('nav button[data-tab=koerper]').click();};t.append(b);}
 D.append(box);}
$('massstab').onchange=sorten;

// ---------------------------------------------------------------- Reiter Körper
function neu(id,seed){ED.breed=id;ED.cat=K.create(id,seed);ED.actor=K.actor(ED.cat,ED.actor?.mode||'stand');ED.shape={...K.shapeOf(id)};ED.actor.SH=ED.shape;ED.prints.length=0;ED.prevR=null;ED.jump=0;gestalt();fell();werte();verteilung();ausgabe();}
function steckbrief(){const D=ED.cat,X=K.breed(D.breed);$('steckbrief').innerHTML='<b>'+D.name+'</b> · '+X.name+' · '+D.sex+', '+D.ageYears+' years · Schulterhöhe '+D.height+' cm, Länge '+D.length+' cm, '+D.weight+' kg · Fell: '+D.appearance.coatName+' · Talent T'+K.talent(D)+' · Kennzahl '+D.seed;}
function werte(){const D=ED.cat,X=K.breed(D.breed),W=$('werte');W.innerHTML='';
 for(const [k,de] of K.STATS){const r=el('div',{className:'balken'});r.append(el('span',{},de),el('div',{},'<i style="width:'+D.caps[k]+'%"></i><b style="width:'+D.stats[k]+'%"></b><u style="left:'+X.werte[k]+'%"></u>'),el('span',{},D.stats[k]+' / '+D.caps[k]));W.append(r);}
 W.append(el('div',{className:'hinweis'},'Kampf-Ist '+K.kampfOf(D.stats).toFixed(1)+' · Kampf-Anlage '+K.kampfOf(D.caps).toFixed(1)+' · Kampf-Soll der Sorte '+X.soll));steckbrief();}
function verteilung(){const cv=$('verteilung'),c=cv.getContext('2d'),X=K.breed(ED.breed),N=1000,ist=new Array(100).fill(0),anl=new Array(100).fill(0);let si=0,sa=0,gw=0;
 for(let i=0;i<N;i++){const D=K.create(X.id,i*7919+13),a=K.kampfOf(D.stats),b=K.kampfOf(D.caps);ist[Math.min(99,Math.round(a))]++;anl[Math.min(99,Math.round(b))]++;si+=a;sa+=b;gw+=D.weight;}
 const mx=Math.max(...ist,...anl),W=cv.width,H=cv.height;c.clearRect(0,0,W,H);
 for(let v=0;v<100;v++){const x=v/100*W,w=W/100;c.fillStyle='#7d6a45';c.fillRect(x,H-14-anl[v]/mx*(H-22),w-.5,anl[v]/mx*(H-22));c.fillStyle='#d2a550c0';c.fillRect(x,H-14-ist[v]/mx*(H-22),w-.5,ist[v]/mx*(H-22));}
 c.fillStyle='#e9dcc0';c.fillRect(X.soll/100*W,0,1.5,H-14);c.font='11px Georgia';c.fillStyle='#a8977a';for(let v=0;v<=100;v+=20)c.fillText(v,Math.min(W-16,v/100*W+1),H-2);
 $('verteilungText').textContent='Gold: Istwert (Mittel '+(si/N).toFixed(1)+') · hell: Anlage (Mittel '+(sa/N).toFixed(1)+') · Strich: Sortenwert '+X.soll+' · mittleres Gewicht '+Math.round(gw/N)+' kg';}
function gestalt(){const G=$('gestalt');G.innerHTML='';for(const [k,de,lo,hi,st] of K.SHAPE_INFO){const l=el('label'),r=el('input',{type:'range',min:lo,max:hi,step:st,value:ED.shape[k]}),o=el('span',{},String(ED.shape[k]));
  r.oninput=()=>{ED.shape[k]=+r.value;o.textContent=r.value;K.snap(ED.actor,ED.actor.mode);ausgabe();};l.append(el('span',{},de),r,o);G.append(l);}}
function fell(){const F=$('fell');F.innerHTML='';const col=ED.cat.appearance.colors;
 for(const k of K.COLKEYS){const l=el('label',{style:'font-size:13px'}),i=el('input',{type:'color',value:col[k]});i.oninput=()=>{col[k]=i.value;ausgabe();};l.append(i,' '+FARBE[k]);F.append(l);}}
function ausgabe(){const S0=K.shapeOf(ED.breed),d={};for(const [k] of K.SHAPE_INFO)if(ED.shape[k]!==S0[k])d[k]=ED.shape[k];$('ausgabe').value=ED.breed+' shape:'+JSON.stringify(d)+' colors:'+JSON.stringify(ED.cat.appearance.colors);}
// Maßstabsfiguren als Schattenrisse (echte Figuren und der Löwe aus 1.0 kommen mit der Bewegung und dem Kampf, KA2/KA3): Höhe in cm
function schatten(c,x,gy,k,art){c.save();c.translate(x,gy);c.scale(k/K.CM,k/K.CM);c.fillStyle='#5e524090';const R=(a,b,w,h)=>c.fillRect(a,-b-h,w,h),Kr=(a,b,r)=>{c.beginPath();c.arc(a,-b,r,0,7);c.fill();};
 if(art==='mensch'){Kr(0,168,12);R(-17,92,34,64);R(-16,0,14,94);R(2,0,14,94);R(-27,88,9,64);R(18,88,9,64);}
 else if(art==='hund'){R(-36,40,70,30);R(-34,0,10,44);R(22,0,10,44);R(26,62,24,22);R(46,64,16,11);R(-48,60,14,6);}
 else if(art==='baer'){R(-78,48,150,62);R(-72,0,24,56);R(40,0,24,56);Kr(86,92,26);R(98,74,26,22);}
 else{R(-80,66,140,50);R(-76,0,18,72);R(38,0,18,72);Kr(72,112,30);R(86,92,30,24);R(-112,92,34,8);R(-116,50,8,46);}
 c.restore();}
function buehne(){const cv=$('buehne'),c=cv.getContext('2d'),W=cv.width,H=cv.height,gy=H-46,ver=$('vergleich').checked,k=Math.min((H-90)/(210/K.CM),ver?W/(900/K.CM):99),cm=k/K.CM,t=ED.T;c.imageSmoothingEnabled=false;
 c.fillStyle='#d8cdb4';c.fillRect(0,0,W,H);c.fillStyle='#8a7350';c.fillRect(0,gy,W,H-gy);
 // Höhenlinien alle 50 cm
 c.font='11px Georgia';for(let h=50;h<=200;h+=50){const y=gy-h*cm;if(y<8)break;c.fillStyle='#bfb294';c.fillRect(0,y,W,1);c.fillStyle='#7c6b4c';c.fillText(h+' cm',4,y-2);}
 const bx=ver?745*cm:W*.5;
 if(ver){schatten(c,62*cm,gy,k,'mensch');schatten(c,165*cm,gy,k,'hund');schatten(c,330*cm,gy,k,'baer');schatten(c,540*cm,gy,k,'loewe');c.fillStyle='#5a4c36';
  c.fillText('Mensch 180 cm',62*cm-36,gy+16);c.fillText('Hund 75 cm',165*cm-28,gy+16);c.fillText('Braunbär 105 cm',330*cm-40,gy+16);c.fillText('Löwe aus 1.0, 120 cm',540*cm-50,gy+16);}
 K.draw(c,ED.actor,bx,gy,k,ED.face,{time:t});
 document.querySelectorAll('#haltungen button').forEach(b=>b.classList.toggle('on',b.dataset.m===ED.actor.mode));}
for(const m of K.MODES){const b=el('button',{},HALTUNG[m]);b.dataset.m=m;b.onclick=()=>K.pose(ED.actor,m);$('haltungen').append(b);}
K.BREEDS.filter(x=>x.built).forEach(x=>$('sorte').append(el('option',{value:x.id},x.name)));
$('sorte').onchange=()=>neu($('sorte').value);
$('wuerfeln').onclick=()=>neu(ED.breed);
$('wenden').onchange=()=>ED.face=$('wenden').checked?-1:1;
$('zurueck').onclick=()=>{ED.shape={...K.shapeOf(ED.breed)};ED.actor.SH=ED.shape;K.snap(ED.actor,ED.actor.mode);gestalt();ausgabe();};

// ---------------------------------------------------------------- Reiter Messung
// Zeichenzeit je Katze: viele Bilder auf eine unsichtbare Fläche, Mittelwert
// Haltung, Gangart oder Sprung: die Katze wird vorher in Bewegung gebracht, gemessen wird Rechnen (K.step) und Zeichnen je Bild
function messe(mode,k,n=300){const cv=document.createElement('canvas');cv.width=400;cv.height=300;const c=cv.getContext('2d'),gang=!K.MODES.includes(mode),a=K.actor(K.typical(ED.breed),gang?'stand':mode);let t=0;
 if(mode==='leap'){K.snap(a,'crouch');K.leap(a);}else if(gang){K.go(a,mode);for(let i=0;i<240;i++)K.step(a,1/60,t+=1/60);}K.draw(c,a,200,280,k,1,{time:t});
 const t0=performance.now();for(let i=0;i<n;i++){if(gang){if(mode==='leap'&&!a.jump&&!a.leapWant)K.leap(a);K.step(a,1/60,t+=1/60);}else t=i*.05;K.draw(c,a,200,280,k,1,{time:t});}return (performance.now()-t0)/n;}
K.messe=messe;
$('messen').onclick=()=>{const T=$('messTabelle');T.innerHTML='<tr><th>Haltung</th><th>Kampfgröße (Zoom 1)</th><th>Nahansicht (Zoom 4)</th></tr>';
 for(const m of [...K.MODES,...K.GK,'leap'])T.append(el('tr',{},'<td style="text-align:left">'+(HALTUNG[m]||GANG[m]||'Sprung')+'</td><td>'+messe(m,1).toFixed(3)+' ms</td><td>'+messe(m,4).toFixed(3)+' ms</td>'));
 const t0=performance.now();K.miniClear();K.mini(ED.breed,'side',128);const t1=performance.now();for(let i=0;i<1000;i++)K.mini(ED.breed,'side',128);const t2=performance.now();
 T.append(el('tr',{},'<td style="text-align:left">Miniatur</td><td>erstes Mal '+(t1-t0).toFixed(2)+' ms</td><td>danach '+((t2-t1)/1000).toFixed(4)+' ms</td>'));sorten();};
const HERDE=[];let hz=0,hn=0,hl=0;
function herde(){if(ED.tab==='messung'&&$('herde').checked){const cv=$('herdeBild'),c=cv.getContext('2d'),t=now();c.imageSmoothingEnabled=false;
  if(!HERDE.length)for(let i=0;i<40;i++){const a=K.actor(K.create(K.FIRST,i+1),K.MODES[i%3]);a.x=44+(i%10)*80;a.y=80+Math.floor(i/10)*68;a.next=t+1+i*.3;HERDE.push(a);}
  const t0=performance.now();c.fillStyle='#d8cdb4';c.fillRect(0,0,cv.width,cv.height);for(const a of HERDE){if(t>a.next){K.setMode(a,K.MODES[Math.floor(Math.random()*3)],t);a.next=t+3+Math.random()*4;}K.draw(c,a,a.x,a.y,.55,1,{time:t});}
  hz+=performance.now()-t0;hn++;if(t-hl>1){$('herdeText').textContent='40 Katzen: '+(hz/hn).toFixed(2)+' ms je Bild, '+(hz/hn/40).toFixed(3)+' ms je Katze';hz=0;hn=0;hl=t;}}
 requestAnimationFrame(herde);}

// ---------------------------------------------------------------- Reiter Bewegung (KA2a; Aufbau wie im Bären-Editor)
// Die Katze bleibt in der Bildmitte, der Boden zieht durch (ED.actor.dist). Abdrücke: Stelle, an der eine Pfote aufgesetzt hat.
// „alt neben neu“: links der Löwe aus 1.0 (M.drawRex aus dist/lion.js) in derselben Bewegung. Das Spiel wird erst beim Einschalten nachgeladen.
const GANG=Object.fromEntries(K.GK.map(g=>[g,K.GAITS[g].de]));
const ALT_DATEIEN=['data','household','management','scout','sim','benchmark','school','world','weapon-art','lion'];
async function altLaden(){if(ED.alt)return;ED.alt={ok:false,l:null};$('bwAltText').textContent='Löwe aus 1.0 wird geladen …';const V='d1a45e9c',v=V.startsWith('__')?Date.now().toString(36).slice(-4):V;
 try{for(const n of ALT_DATEIEN)await new Promise((ok,no)=>{const s=document.createElement('script');s.src=n+'.js?v='+v;s.onload=()=>{if(n==='data'&&window.MG&&!window.MG.ui)window.MG.ui={getPage:()=>'arena',render(){},click(){},notify(){},modal(){},close(){},open(){}};ok();};s.onerror=()=>no(Error(n+'.js fehlt'));document.body.appendChild(s);});
  if(!window.MG||!window.MG.drawRex)throw Error('M.drawRex fehlt');
  ED.alt.l={x:0,y:0,a:0,mode:'stalk',phase:0,g:{dead:false,name:'Rex Vetus'},tissue:{head:160,chest:290,belly:140,front:120,rear:100},max:{head:160,chest:290,belly:140,front:120,rear:100},blood:100,trauma:0,wounds:[],z:0,hit:0,clock:0,moveSpeed:0,cute:0,velocity:0,team:0};
  // Der alte Löwe wird auf die Höhe der neuen Katze gebracht, damit sich die Bewegungen vergleichen lassen (gemessen an den gezeichneten Bildpunkten)
  const hoehe=fn=>{const cv=document.createElement('canvas');cv.width=400;cv.height=300;const c=cv.getContext('2d');fn(c);const d=c.getImageData(0,0,400,300).data;for(let i=3;i<d.length;i+=4)if(d[i]>40)return 280-Math.floor(i/4/400);return 1;};
  const hAlt=hoehe(c=>{c.translate(200,280);window.MG.rexClock=0;window.MG.drawRex(c,ED.alt.l);}),hNeu=hoehe(c=>K.draw(c,K.actor(ED.cat,'stand'),200,280,1,1,{time:0,noShadow:true}));ED.alt.sc=hNeu/Math.max(hAlt,1);
  ED.alt.ok=true;$('bwAltText').textContent='Links: Löwe aus 1.0 (Rex Vetus) mit seinen Bewegungen Lauern, Lauf, Ducken, Sprung, Drohen, Brüllen, auf die Höhe der neuen Katze gebracht. Rechts: die neue Katze.';}
 catch(e){ED.alt=null;$('bwAlt').checked=false;$('bwAltText').textContent='Der Löwe aus 1.0 ließ sich nicht laden: '+e.message;}}
// Zustand der neuen Katze auf die Bewegungen des alten Löwen abbilden
function altZeichnen(c,x,gy,k,a,t,welt){const A=ED.alt,l=A.l,J=a.jump,X=a.expr,u=J?t-J.t0:0;
 l.mode=J?(u>J.t1&&u<J.t2?'leap':'crouch'):a.mode==='crouch'?'crouch':X&&X.kind==='roar'?'roar':X&&X.kind==='snarl'?'threaten':(a.v||0)>170?'sprint':'stalk';
 l.moveSpeed=l.mode==='leap'?0:(a.v||0);l.z=J?K.rig(a,t).z*K.szOf(a.cat,a.SH)/A.sc:0;l.phase=welt*.08;l.clock=X?t-X.t0:u;window.MG.rexClock=t;
 c.save();c.translate(x,gy);c.scale(k*A.sc,k*A.sc);try{window.MG.drawRex(c,l);}catch(e){}c.restore();}
function bewegung(){const cv=$('bwBild'),c=cv.getContext('2d'),W=cv.width,H=cv.height,gy=H-52,a=ED.actor,sz=K.szOf(a.cat,a.SH),alt=$('bwAlt').checked&&ED.alt&&ED.alt.ok,k=Math.min((H-80)/(190/K.CM),alt?1.6:2.4),cm=k/K.CM,t=ED.T,cx=alt?W*.68:W*.5,welt=(a.dist||0)*sz;c.imageSmoothingEnabled=false;
 c.fillStyle='#cdbb96';c.fillRect(0,0,W,H);c.fillStyle='#8a7350';c.fillRect(0,gy,W,H-gy);
 if($('bwLinien').checked){c.font='11px Georgia';for(let h=50;h<=200;h+=50){const y=gy-h*cm;if(y<8)break;c.fillStyle='#b3a07a';c.fillRect(0,y,W,1);c.fillStyle='#7c6b4c';c.fillText(h+' cm',4,y-2);}}
 // Bodenmarken alle 50 cm, jede zweite beschriftet (Meter)
 const m50=50/K.CM,i0=Math.floor((welt-cx/k)/m50),i1=Math.ceil((welt+(W-cx)/k)/m50);c.font='11px Georgia';
 for(let i=i0;i<=i1;i++){const x=cx+(i*m50-welt)*k;c.fillStyle='#6f5b3d';c.fillRect(Math.round(x),gy,i%2?1:2,i%2?6:11);if(i%2===0){c.fillStyle='#5a4c36';c.fillText((i/2)+' m',x+4,gy+22);}}
 if(alt){altZeichnen(c,W*.2,gy,k,a,t,welt);c.fillStyle='#5a4c36';c.fillText('alt: Löwe aus 1.0',W*.2-40,gy+38);c.fillText('neu',cx-8,gy+38);}
 const R=K.draw(c,a,cx,gy,k,1,{time:t});
 // Abdrücke merken, sobald eine Pfote aufsetzt
 if(ED.prevR&&((a.gs||0)>.5||a.jump))R.legs.forEach((l,i)=>{if(l.st&&!ED.prevR.legs[i].st){ED.prints.push({x:welt+l.px*sz,front:l.front});if(ED.prints.length>48)ED.prints.shift();}});
 if($('bwSpur').checked)for(const p of ED.prints){const x=cx+(p.x-welt)*k;if(x>-20&&x<W+20){c.fillStyle=p.front?'#3d2f1d':'#6a5536';c.fillRect(Math.round(x-(p.front?0:2.5*k*sz)),gy+(p.front?2:6),Math.round(5*k*sz),3);}}
 // größter Sprung des Kopfes je Bild (auf 1/60 s gerechnet, ohne den Weg der Katze)
 if(ED.prevR&&ED.dtLast>0){const d=Math.hypot(R.hcx-ED.prevR.hcx,R.hcy-ED.prevR.hcy)*sz*K.CM/(ED.dtLast*60);if(d>ED.jump)ED.jump=d;}
 if(ED.dtLast>0||!ED.prevR)ED.prevR=R;
 const v=(a.v||0)*sz*K.CM/100,J=a.jump,gang=J?'Sprung':(a.gs||0)>.05?GANG[a.gk]:HALTUNG[a.mode];
 $('bwText').textContent=gang+' · Tempo '+v.toFixed(1)+' m/s ('+(v*3.6).toFixed(1)+' km/h)'+(J?' · Sprungweite '+(J.range*sz*K.CM/100).toFixed(1)+' m, Scheitel '+(J.h*sz*K.CM).toFixed(0)+' cm (vorläufig, wird in KA25 eingemessen)':'')+' · größter Sprung des Kopfes je Bild seit dem letzten Befehl: '+ED.jump.toFixed(1)+' cm · Zeit '+t.toFixed(2)+' s'+(ED.pause?' · PAUSE':'');
 document.querySelectorAll('#bwHaltung button').forEach(b=>b.classList.toggle('on',!a.go&&!J&&b.dataset.m===a.mode&&!((a.gs||0)>.05)));
 document.querySelectorAll('#bwGang button[data-g]').forEach(b=>b.classList.toggle('on',a.go===b.dataset.g));$('bwSprung').classList.toggle('on',!!J||!!a.leapWant);}
const befehl=fn=>()=>{fn();ED.jump=0;};
for(const m of K.MODES){const b=el('button',{},HALTUNG[m]);b.dataset.m=m;b.onclick=befehl(()=>K.pose(ED.actor,m));$('bwHaltung').append(b);}
for(const g of K.GK){const b=el('button',{},GANG[g]);b.dataset.g=g;b.onclick=befehl(()=>K.go(ED.actor,g));$('bwGang').append(b);}
{const b=el('button',{id:'bwHalt'},'Anhalten');b.onclick=befehl(()=>K.go(ED.actor,null));const s=el('button',{id:'bwSprung'},'Sprung');s.onclick=befehl(()=>K.leap(ED.actor));$('bwGang').append(b,s);}
for(const [x,o] of Object.entries(K.EXPR)){const b=el('button',{},o.de);b.dataset.x=x;b.onclick=befehl(()=>K.express(ED.actor,x,ED.T));$('bwMimik').append(b);}
for(const [r,name] of [[1,'1×'],[.5,'½'],[.25,'¼'],[.125,'⅛']]){const b=el('button',{className:r===1?'on':''},name);b.dataset.r=r;b.onclick=()=>{ED.rate=r;document.querySelectorAll('#bwZeit button').forEach(x=>x.classList.toggle('on',x===b));};$('bwZeit').append(b);}
$('bwPause').onclick=()=>{ED.pause=!ED.pause;$('bwPause').classList.toggle('on',ED.pause);$('bwPause').textContent=ED.pause?'Weiter':'Pause';};
// Einzelbild: genau 1/60 Sekunde weiter (hält dabei an)
$('bwBildVor').onclick=()=>{if(!ED.pause)$('bwPause').onclick();vor(1/60);};
$('bwTempo').oninput=()=>{ED.actor.pace=+$('bwTempo').value;$('bwTempoText').textContent=$('bwTempo').value;};
$('bwAlt').onchange=()=>{if($('bwAlt').checked)altLaden();else $('bwAltText').textContent='';};
function vor(dt){ED.T+=dt;ED.dtLast=dt;K.step(ED.actor,dt,ED.T);}
// Ein Takt für alle Reiter: Uhr weiterdrehen, Katze rechnen, den sichtbaren Reiter zeichnen
let last=performance.now();
function bild(){const n=performance.now(),real=Math.min(.05,(n-last)/1000);last=n;const bw=ED.tab==='bewegung';
 if(bw&&ED.pause)ED.dtLast=0;else vor(real*(bw?ED.rate:1));
 if(bw)bewegung();else if(ED.tab==='koerper')buehne();
 requestAnimationFrame(bild);}
ED.vor=vor;

neu(K.FIRST,20261127);ED.pick=K.FIRST;sorten();detail(K.breed(K.FIRST));bild();herde();
})();
