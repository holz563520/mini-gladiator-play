'use strict';
// =====================================================================================================
// ARENA THEORY · BÄREN-EDITOR (dist/baer-editor.html): Sorten ansehen, Körper und Haltungen prüfen, Zeichenzeit messen.
// Bedienung Deutsch, Inhalte der Bären Englisch. Lädt nur die Bärendateien, nicht das Spiel. Wächst mit jedem Schritt in BAER_FAHRPLAN.md.
// =====================================================================================================
(()=>{
const B=window.BAER,$=id=>document.getElementById(id),el=(t,a={},h='')=>{const e=document.createElement(t);Object.assign(e,a);if(h)e.innerHTML=h;return e;};
const now=()=>performance.now()/1000,skulls=n=>'☠'.repeat(n);
const HALTUNG={stand:'Stand',sit:'Sitzen',lie:'Liegen',rear:'Aufgerichtet'};
const ED={tab:'sorten',breed:'brown',bear:null,actor:null,shape:null,face:1};window.BAER_ED=ED;

// ---------------------------------------------------------------- Reiter
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{ED.tab=b.dataset.tab;document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));
 document.querySelectorAll('section').forEach(s=>s.classList.toggle('on',s.id===ED.tab));});

// ---------------------------------------------------------------- Reiter Sorten
function sorten(){const L=$('liste');L.innerHTML='';const echt=$('massstab').checked;
 for(const [k,name] of Object.entries(B.BAUART)){const list=B.BREEDS.filter(x=>x.bauart===k);L.append(el('h2',{},k+' · '+name+' ('+list.length+')'));const g=el('div',{className:'kacheln'});
  for(const X of list){const d=el('div',{className:'kachel'+(X.built?'':' leer')+(X.id===ED.pick?' on':'')});
   if(X.built)d.append(B.mini(X.id,'side',128,echt?.42:0));else d.append(el('div',{style:'height:84px;display:grid;place-items:center;color:#a8977a;font-size:12px'},'kommt in Schritt '+X.step));
   d.append(el('b',{},X.name),el('span',{},'<span class="kopf">'+skulls(X.skulls)+'</span> · '+X.kg0+' kg'));d.onclick=()=>{ED.pick=X.id;sorten();detail(X);};g.append(d);}
  L.append(g);}}
function detail(X){const D=$('detail');D.innerHTML='';const box=el('div',{className:'detail'});
 if(X.built){box.append(B.mini(X.id,'side',260),B.mini(X.id,'head',120));}
 const t=el('div',{},'<p><b>'+X.name+'</b> <span class="kopf">'+skulls(X.skulls)+'</span> · '+X.group+'</p><p><i>'+X.desc+'</i></p><p>Schulterhöhe '+X.cm0+' cm · aufgerichtet '+X.up0+' cm · '+X.kg0+' kg · Kampf-Soll '+X.soll+'</p><p>'+
  B.STATS.map(([k,de])=>de+' '+X.werte[k]).join(' · ')+'</p>'+(X.built?'':'<p class="hinweis">Noch nicht gebaut: kommt in Schritt '+X.step+'.</p>'));
 box.append(t);if(X.built){const b=el('button',{},'Im Reiter Körper ansehen');b.onclick=()=>{$('sorte').value=X.id;neu(X.id);document.querySelector('nav button[data-tab=koerper]').click();};t.append(b);}
 D.append(box);}
$('massstab').onchange=sorten;

// ---------------------------------------------------------------- Reiter Körper
function neu(id,seed){ED.breed=id;ED.bear=B.create(id,seed);ED.actor=B.actor(ED.bear,ED.actor?.mode||'stand');ED.shape={...B.shapeOf(id)};ED.actor.SH=ED.shape;gestalt();fell();werte();verteilung();ausgabe();}
function steckbrief(){const D=ED.bear,X=B.breed(D.breed);$('steckbrief').innerHTML='<b>'+D.name+'</b> · '+X.name+' · '+D.sex+', '+D.ageYears+' years · Schulterhöhe '+D.height+' cm, aufgerichtet '+D.upright+' cm, '+D.weight+' kg · Fell: '+D.appearance.coatName+' · Talent T'+B.talent(D)+' · Kennzahl '+D.seed;}
function werte(){const D=ED.bear,X=B.breed(D.breed),W=$('werte');W.innerHTML='';
 for(const [k,de] of B.STATS){const r=el('div',{className:'balken'});r.append(el('span',{},de),el('div',{},'<i style="width:'+D.caps[k]+'%"></i><b style="width:'+D.stats[k]+'%"></b><u style="left:'+X.werte[k]+'%"></u>'),el('span',{},D.stats[k]+' / '+D.caps[k]));W.append(r);}
 W.append(el('div',{className:'hinweis'},'Kampf-Ist '+B.kampfOf(D.stats).toFixed(1)+' · Kampf-Anlage '+B.kampfOf(D.caps).toFixed(1)+' · Kampf-Soll der Sorte '+X.soll));steckbrief();}
function verteilung(){const cv=$('verteilung'),c=cv.getContext('2d'),X=B.breed(ED.breed),N=1000,ist=new Array(100).fill(0),anl=new Array(100).fill(0);let si=0,sa=0,gw=0;
 for(let i=0;i<N;i++){const D=B.create(X.id,i*7919+13),a=B.kampfOf(D.stats),b=B.kampfOf(D.caps);ist[Math.min(99,Math.round(a))]++;anl[Math.min(99,Math.round(b))]++;si+=a;sa+=b;gw+=D.weight;}
 const mx=Math.max(...ist,...anl),W=cv.width,H=cv.height;c.clearRect(0,0,W,H);
 for(let v=0;v<100;v++){const x=v/100*W,w=W/100;c.fillStyle='#7d6a45';c.fillRect(x,H-14-anl[v]/mx*(H-22),w-.5,anl[v]/mx*(H-22));c.fillStyle='#d2a550c0';c.fillRect(x,H-14-ist[v]/mx*(H-22),w-.5,ist[v]/mx*(H-22));}
 c.fillStyle='#e9dcc0';c.fillRect(X.soll/100*W,0,1.5,H-14);c.font='11px Georgia';c.fillStyle='#a8977a';for(let v=0;v<=100;v+=20)c.fillText(v,Math.min(W-16,v/100*W+1),H-2);
 $('verteilungText').textContent='Gold: Istwert (Mittel '+(si/N).toFixed(1)+') · hell: Anlage (Mittel '+(sa/N).toFixed(1)+') · Strich: Sortenwert '+X.soll+' · mittleres Gewicht '+Math.round(gw/N)+' kg';}
function gestalt(){const G=$('gestalt');G.innerHTML='';for(const [k,de,lo,hi,st] of B.SHAPE_INFO){const l=el('label'),r=el('input',{type:'range',min:lo,max:hi,step:st,value:ED.shape[k]}),o=el('span',{},String(ED.shape[k]));
  r.oninput=()=>{ED.shape[k]=+r.value;o.textContent=r.value;const m=ED.actor.mode;B.snap(ED.actor,m);ausgabe();};l.append(el('span',{},de),r,o);G.append(l);}}
function fell(){const F=$('fell');F.innerHTML='';const col=ED.bear.appearance.colors;
 for(const [k,de] of [['base','Fell'],['light','hell'],['shade','Schatten'],['dark','dunkel'],['muzzle','Schnauze'],['claw','Krallen']]){const l=el('label',{style:'font-size:13px'}),i=el('input',{type:'color',value:col[k]});i.oninput=()=>{col[k]=i.value;ausgabe();};l.append(i,' '+de);F.append(l);}}
function ausgabe(){const S0=B.shapeOf(ED.breed),d={};for(const [k] of B.SHAPE_INFO)if(ED.shape[k]!==S0[k])d[k]=ED.shape[k];$('ausgabe').value=ED.breed+' shape:'+JSON.stringify(d)+' colors:'+JSON.stringify(ED.bear.appearance.colors);}
// Maßstabsfiguren als Schattenrisse (echte Figuren kommen mit dem Kampf in B3): Höhe in cm
function schatten(c,x,gy,k,art){c.save();c.translate(x,gy);c.scale(k/B.CM,k/B.CM);c.fillStyle='#5e524090';const R=(a,b,w,h)=>c.fillRect(a,-b-h,w,h),K=(a,b,r)=>{c.beginPath();c.arc(a,-b,r,0,7);c.fill();};
 if(art==='mensch'){K(0,168,12);R(-17,92,34,64);R(-16,0,14,94);R(2,0,14,94);R(-27,88,9,64);R(18,88,9,64);}
 else if(art==='hund'){R(-36,40,70,30);R(-34,0,10,44);R(22,0,10,44);R(26,62,24,22);R(46,64,16,11);R(-48,60,14,6);}
 else{R(-80,66,140,50);R(-76,0,18,72);R(38,0,18,72);K(72,112,30);R(86,92,30,24);R(-112,92,34,8);R(-116,50,8,46);}
 c.restore();}
function buehne(){const cv=$('buehne'),c=cv.getContext('2d'),W=cv.width,H=cv.height,gy=H-46,ver=$('vergleich').checked,k=Math.min((H-90)/(240/B.CM),ver?W/(585/B.CM):99),cm=k/B.CM,t=now();c.imageSmoothingEnabled=false;
 c.fillStyle='#cdbb96';c.fillRect(0,0,W,H);c.fillStyle='#8a7350';c.fillRect(0,gy,W,H-gy);
 // Höhenlinien alle 50 cm
 c.font='11px Georgia';for(let h=50;h<=250;h+=50){const y=gy-h*cm;if(y<8)break;c.fillStyle='#b3a07a';c.fillRect(0,y,W,1);c.fillStyle='#7c6b4c';c.fillText(h+' cm',4,y-2);}
 const bx=ver?470*cm:W*.5;
 if(ver){schatten(c,62*cm,gy,k,'mensch');schatten(c,150*cm,gy,k,'hund');schatten(c,290*cm,gy,k,'loewe');c.fillStyle='#5a4c36';c.fillText('Mensch 180 cm',62*cm-36,gy+16);c.fillText('Hund 75 cm',150*cm-28,gy+16);c.fillText('Löwe 120 cm',290*cm-30,gy+16);}
 B.draw(c,ED.actor,bx,gy,k,ED.face,{time:t});
 document.querySelectorAll('#haltungen button').forEach(b=>b.classList.toggle('on',b.dataset.m===ED.actor.mode));
 requestAnimationFrame(buehne);}
for(const m of B.MODES){const b=el('button',{},HALTUNG[m]);b.dataset.m=m;b.onclick=()=>B.setMode(ED.actor,m,now());$('haltungen').append(b);}
B.BREEDS.filter(x=>x.built).forEach(x=>$('sorte').append(el('option',{value:x.id},x.name)));
$('sorte').onchange=()=>neu($('sorte').value);
$('wuerfeln').onclick=()=>neu(ED.breed);
$('wenden').onchange=()=>ED.face=$('wenden').checked?-1:1;
$('zurueck').onclick=()=>{ED.shape={...B.shapeOf(ED.breed)};ED.actor.SH=ED.shape;B.snap(ED.actor,ED.actor.mode);gestalt();ausgabe();};

// ---------------------------------------------------------------- Reiter Messung
// Zeichenzeit je Bär: viele Bilder auf eine unsichtbare Fläche, Mittelwert
function messe(mode,k,n=300){const cv=document.createElement('canvas');cv.width=400;cv.height=300;const c=cv.getContext('2d'),a=B.actor(B.typical(ED.breed),mode);B.draw(c,a,200,280,k,1,{time:0});
 const t0=performance.now();for(let i=0;i<n;i++)B.draw(c,a,200,280,k,1,{time:i*.05});return (performance.now()-t0)/n;}
B.messe=messe;
$('messen').onclick=()=>{const T=$('messTabelle');T.innerHTML='<tr><th>Haltung</th><th>Kampfgröße (Zoom 1)</th><th>Nahansicht (Zoom 4)</th></tr>';
 for(const m of B.MODES)T.append(el('tr',{},'<td style="text-align:left">'+HALTUNG[m]+'</td><td>'+messe(m,1).toFixed(3)+' ms</td><td>'+messe(m,4).toFixed(3)+' ms</td>'));
 const t0=performance.now();B.miniClear();B.mini(ED.breed,'side',128);const t1=performance.now();for(let i=0;i<1000;i++)B.mini(ED.breed,'side',128);const t2=performance.now();
 T.append(el('tr',{},'<td style="text-align:left">Miniatur</td><td>erstes Mal '+(t1-t0).toFixed(2)+' ms</td><td>danach '+((t2-t1)/1000).toFixed(4)+' ms</td>'));sorten();};
const HERDE=[];let hz=0,hn=0,hl=0;
function herde(){if(ED.tab==='messung'&&$('herde').checked){const cv=$('herdeBild'),c=cv.getContext('2d'),t=now();c.imageSmoothingEnabled=false;
  if(!HERDE.length)for(let i=0;i<40;i++){const a=B.actor(B.create('brown',i+1),B.MODES[i%4]);a.x=40+(i%10)*80;a.y=90+Math.floor(i/10)*66;a.next=t+1+i*.3;HERDE.push(a);}
  const t0=performance.now();c.fillStyle='#cdbb96';c.fillRect(0,0,cv.width,cv.height);for(const a of HERDE){if(t>a.next){B.setMode(a,B.MODES[Math.floor(Math.random()*4)],t);a.next=t+3+Math.random()*4;}B.draw(c,a,a.x,a.y,.62,1,{time:t});}
  hz+=performance.now()-t0;hn++;if(t-hl>1){$('herdeText').textContent='40 Bären: '+(hz/hn).toFixed(2)+' ms je Bild, '+(hz/hn/40).toFixed(3)+' ms je Bär';hz=0;hn=0;hl=t;}}
 requestAnimationFrame(herde);}

neu('brown',20261127);sorten();ED.pick='brown';sorten();detail(B.breed('brown'));buehne();herde();
})();
