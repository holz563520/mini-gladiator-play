'use strict';
// =====================================================================================================
// ARENA THEORY · STIER-EDITOR (dist/stier-editor.html): Rassen ansehen (Stier und Ochse), Körper, Hörner, Haltungen und Werte prüfen, Zeichenzeit messen.
// Reiter Bewegung (ST2): Gangarten, Antritt, Bremsen, Scharren, Kopf senken, Grasen, Hinlegen und Aufstehen, Mimik, die drei Arten zu wenden; Zeitlupe und Einzelbild.
// Bedienung Deutsch, Inhalte der Tiere Englisch. Lädt nur die Stierdateien, nicht das Spiel. Wächst mit jedem Schritt in STIER_FAHRPLAN.md.
// Aufbau wie der Katzen- und der Bären-Editor (dist/katze-editor.js, dist/baer-editor.js). Im Master-Editor verlinkt: Menü Kampf → Tiere.
// =====================================================================================================
(()=>{
const S=window.STIER,$=id=>document.getElementById(id),el=(t,a={},h='')=>{const e=document.createElement(t);Object.assign(e,a);if(h)e.innerHTML=h;return e;};
const now=()=>performance.now()/1000,skulls=n=>'<span class="kopf">'+'☠'.repeat(n)+'</span>',yokes=n=>'<span class="joch">'+'∩'.repeat(n)+'</span>';
const HALTUNG={stand:'Stand',lie:'Liegen'},FORM={bull:'Stier',ox:'Ochse'};
const BAUART_DE={A:'Kampfrind',B:'Zugrind',C:'Langhorn',D:'Zebu',E:'Bergrind',F:'Büffel',G:'Wildrind',H:'Urzeit'};
const FARBE={base:'Fell',light:'Lichter',shade:'Schatten',dark:'dunkel',muzzle:'Flotzmaul',nose:'Nüstern',horn:'Horn',hornTip:'Hornspitze',eye:'Auge',tuft:'Quaste, Locken',hoof:'Klauen'};
const ED={tab:'rassen',breed:S.FIRST,form:'bull',cat:null,actor:null,shape:null,face:1,T:0,bw:null,bt:0,pause:false,plan:null,prints:[],skid:[],jump:0,slip:0,prev:null};window.STIER_ED=ED;

// ---------------------------------------------------------------- Reiter
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{ED.tab=b.dataset.tab;document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));
 document.querySelectorAll('section').forEach(s=>s.classList.toggle('on',s.id===ED.tab));});

// ---------------------------------------------------------------- Reiter Rassen: alle 20, Stier und Ochse nebeneinander, sortiert nach Bauart, Kampfklasse oder Zugklasse
function kachel(X,echt){const d=el('div',{className:'kachel'+(X.built?'':' leer')+(X.id===ED.pick?' on':'')});
 if(X.built)d.append(S.mini(X.id,'side',96,echt?.3:0,'bull'),S.mini(X.id,'side',96,echt?.3:0,'ox'));else d.append(el('div',{style:'height:68px;display:grid;place-items:center;color:#a8977a;font-size:12px'},'kommt in Schritt '+X.step));
 d.append(el('b',{},X.name+(X.extinct?' †':'')),el('span',{},skulls(X.skulls)+' · '+yokes(X.yokes)+' · '+X.kg0+' kg'));d.onclick=()=>{ED.pick=X.id;rassen();detail(X);};return d;}
function rassen(){const L=$('liste');L.innerHTML='';const echt=$('massstab').checked,ord=$('ordnung').value,gruppen=[];
 if(ord==='bauart')for(const [k,name] of Object.entries(S.BAUART))gruppen.push([k+' · '+BAUART_DE[k]+' ('+name+')',S.BREEDS.filter(x=>x.bauart===k)]);
 else for(let n=5;n>=1;n--){const kampf=ord==='kampf',list=S.BREEDS.filter(x=>(kampf?x.skulls:x.yokes)===n).sort((a,b)=>kampf?b.soll-a.soll:b.zugSollOx-a.zugSollOx);
  if(list.length)gruppen.push([(kampf?'Kampfklasse '+'☠'.repeat(n):'Zugklasse '+'∩'.repeat(n)+' ('+n+(n===1?' Joch':' Joche')+')'),list]);}
 for(const [titel,list] of gruppen){L.append(el('h2',{},titel+' · '+list.length));const g=el('div',{className:'kacheln'});for(const X of list)g.append(kachel(X,echt));L.append(g);}}
const zeile=(W,L)=>L.map(([k,de])=>de+' '+W[k]).join(' · ');
function detail(X){const D=$('detail');D.innerHTML='';const box=el('div',{className:'detail'});
 if(X.built){const fig=(cv,t)=>{const f=el('figure');f.append(cv,el('div',{},t));return f;};
  box.append(fig(S.mini(X.id,'side',220,0,'bull'),'Stier'),fig(S.mini(X.id,'side',220,0,'ox'),'Ochse'),fig(S.mini(X.id,'head',110,0,'bull'),'Kopf von der Seite'),fig(S.mini(X.id,'front',110,0,'bull'),'Kopf von vorn'));}
 const t=el('div',{style:'flex:1;min-width:260px'},'<p><b>'+X.name+'</b>'+(X.extinct?' † (extinct)':'')+' · '+X.group+(X.wild?' · Wildrind: als Ochse nur +10 Folgsamkeit':'')+'</p>'+
  '<p>Schulterhöhe '+X.cm0+' cm (Ochse '+Math.round(X.cm0*1.05)+' cm) · '+X.kg0+' kg · Horn '+X.horn0+' cm lang, '+X.span0+' cm Spannweite (Ochse +15 % Länge)</p>'+
  '<p><b>Stier</b> '+skulls(X.skulls)+' Kampf-Soll '+X.soll+' · Zug-Soll '+X.zugSoll+' ('+X.yokesBull+(X.yokesBull===1?' Joch':' Joche')+')<br><i>'+X.desc+'</i><br>'+zeile(X.werte,S.STATS)+'<br>'+zeile(X.werte,S.ZSTATS)+'</p>'+
  '<p><b>Ochse</b> '+yokes(X.yokes)+' Zug-Soll '+X.zugSollOx+' · Kampf-Soll '+X.sollOx+' ('+'☠'.repeat(X.skullsOx)+')<br><i>'+X.descOx+'</i><br>'+zeile(X.werteOx,S.STATS)+'<br>'+zeile(X.werteOx,S.ZSTATS)+'</p>'+
  (X.built?'':'<p class="hinweis">Noch nicht gebaut: kommt in Schritt '+X.step+'.</p>'));
 box.append(t);if(X.built)for(const f of S.FORMS){const b=el('button',{},FORM[f]+' im Reiter Körper ansehen');b.onclick=()=>{$('sorte').value=X.id;ED.form=f;neu(X.id);document.querySelector('nav button[data-tab=koerper]').click();};t.append(b,' ');}
 D.append(box);}
$('massstab').onchange=rassen;$('ordnung').onchange=rassen;

// ---------------------------------------------------------------- Reiter Körper
function neu(id,seed){ED.breed=id;ED.cat=S.create(id,seed,ED.form);ED.actor=S.actor(ED.cat,ED.actor?.mode||'stand');ED.shape={...S.shapeOf(id,ED.form)};ED.actor.SH=ED.shape;bwNeu();
 document.querySelectorAll('#formen button').forEach(b=>b.classList.toggle('on',b.dataset.f===ED.form));gestalt();fell();werte();verteilung();ausgabe();}
function steckbrief(){const D=ED.cat,X=S.breed(D.breed);$('steckbrief').innerHTML='<b>'+D.name+'</b> · '+X.name+' · '+D.formName+' ('+FORM[D.form]+'), '+D.ageYears+' years · Schulterhöhe '+D.height+' cm, '+D.weight+' kg · Horn '+S.hornLenCm(D,ED.shape)+' cm lang, '+S.hornSpan(D,ED.shape)+' cm Spannweite, führt mit dem '+(D.appearance.hornSide==='L'?'linken':'rechten')+' Horn · Fell: '+D.appearance.coatName+
 '<br>Kampf-Talent T'+S.talent(D)+' · Kampfwert '+S.kw(D)+' · Zug-Talent T'+S.talentZug(D)+' · Zugwert '+S.zw(D)+' (Kampfwert und Zugwert vorläufig, werden in ST19 eingemessen) · Kennzahl '+D.seed;}
function balken(W,L,D,X){W.innerHTML='';for(const [k,de] of L){const r=el('div',{className:'balken'});r.append(el('span',{},de),el('div',{},'<i style="width:'+D.caps[k]+'%"></i><b style="width:'+D.stats[k]+'%"></b><u style="left:'+X[k]+'%"></u>'),el('span',{},D.stats[k]+' / '+D.caps[k]));W.append(r);}}
function werte(){const D=ED.cat,B=S.breed(D.breed),X=S.sollOf(B,D.form);balken($('werte'),S.STATS,D,X);
 $('werte').append(el('div',{className:'hinweis'},'Kampf-Ist '+S.kampfOf(D.stats).toFixed(1)+' · Kampf-Anlage '+S.kampfOf(D.caps).toFixed(1)+' · Kampf-Soll der Rasse als '+FORM[D.form]+' '+D.soll));
 balken($('zugwerte'),S.ZSTATS,D,X);
 $('zugwerte').append(el('div',{className:'hinweis'},'Die Ausdauer (oben) zählt für beides. Zug-Ist '+S.zugOf(D.stats).toFixed(1)+' · Zug-Anlage '+S.zugOf(D.caps).toFixed(1)+' · Zug-Soll der Rasse als '+FORM[D.form]+' '+D.zugSoll));steckbrief();}
function schaubild(cv,of,soll,text,was){const c=cv.getContext('2d'),N=1000,ist=new Array(100).fill(0),anl=new Array(100).fill(0);let si=0,sa=0,gw=0;
 for(let i=0;i<N;i++){const D=S.create(ED.breed,i*7919+13,ED.form),a=of(D.stats),b=of(D.caps);ist[Math.min(99,Math.round(a))]++;anl[Math.min(99,Math.round(b))]++;si+=a;sa+=b;gw+=D.weight;}
 const mx=Math.max(...ist,...anl),W=cv.width,H=cv.height;c.clearRect(0,0,W,H);
 for(let v=0;v<100;v++){const x=v/100*W,w=W/100;c.fillStyle='#7d6a45';c.fillRect(x,H-14-anl[v]/mx*(H-22),w-.5,anl[v]/mx*(H-22));c.fillStyle='#d2a550c0';c.fillRect(x,H-14-ist[v]/mx*(H-22),w-.5,ist[v]/mx*(H-22));}
 c.fillStyle='#e9dcc0';c.fillRect(soll/100*W,0,1.5,H-14);c.font='11px Georgia';c.fillStyle='#a8977a';for(let v=0;v<=100;v+=20)c.fillText(v,Math.min(W-16,v/100*W+1),H-2);
 text.textContent=was+' · Gold: Istwert (Mittel '+(si/N).toFixed(1)+') · hell: Anlage (Mittel '+(sa/N).toFixed(1)+') · Strich: Rassenwert '+soll+' · mittleres Gewicht '+Math.round(gw/N)+' kg';}
function verteilung(){const B=S.breed(ED.breed),ox=ED.form==='ox';schaubild($('verteilung'),S.kampfOf,ox?B.sollOx:B.soll,$('verteilungText'),FORM[ED.form]+', Kampf');schaubild($('verteilungZug'),S.zugOf,ox?B.zugSollOx:B.zugSoll,$('verteilungZugText'),FORM[ED.form]+', Zug');}
function gestalt(){const G=$('gestalt');G.innerHTML='';for(const [k,de,lo,hi,st] of S.SHAPE_INFO){const l=el('label'),r=el('input',{type:'range',min:lo,max:hi,step:st,value:ED.shape[k]}),o=el('span',{},String(ED.shape[k]));
  r.oninput=()=>{ED.shape[k]=+r.value;o.textContent=r.value;S.snap(ED.actor,ED.actor.mode);if(ED.bw)S.snap(ED.bw,'stand');ausgabe();steckbrief();};l.append(el('span',{},de),r,o);G.append(l);}}
function fell(){const F=$('fell');F.innerHTML='';const col=ED.cat.appearance.colors;
 for(const k of S.COLKEYS){const l=el('label',{style:'font-size:13px'}),i=el('input',{type:'color',value:col[k]});i.oninput=()=>{col[k]=i.value;ausgabe();};l.append(i,' '+FARBE[k]);F.append(l);}
 const M=$('muster');M.innerHTML='';for(const co of (S.COATS[ED.breed]||S.COATS._)){const b=el('button',{className:co.id===ED.cat.appearance.coat?'on':''},co.name);
  b.onclick=()=>{const A=ED.cat.appearance;A.coat=co.id;A.coatName=co.name;A.pattern=co.pattern||'';for(const k of S.COLKEYS)A.colors[k]=co[k];fell();ausgabe();steckbrief();};M.append(b);}}
function ausgabe(){const S0=S.shapeOf(ED.breed,ED.form),d={};for(const [k] of S.SHAPE_INFO)if(ED.shape[k]!==S0[k])d[k]=ED.shape[k];$('ausgabe').value=ED.breed+' '+ED.form+' shape:'+JSON.stringify(d)+' colors:'+JSON.stringify(ED.cat.appearance.colors);}
// Maßstabsfiguren als Schattenrisse (wie im Katzen-Editor): Mensch, Hund, Braunbär, Löwe aus 1.0
function schatten(c,x,gy,k,art){c.save();c.translate(x,gy);c.scale(k/S.CM,k/S.CM);c.fillStyle='#5e524090';const R=(a,b,w,h)=>c.fillRect(a,-b-h,w,h),Kr=(a,b,r)=>{c.beginPath();c.arc(a,-b,r,0,7);c.fill();};
 if(art==='mensch'){Kr(0,168,12);R(-17,92,34,64);R(-16,0,14,94);R(2,0,14,94);R(-27,88,9,64);R(18,88,9,64);}
 else if(art==='hund'){R(-36,40,70,30);R(-34,0,10,44);R(22,0,10,44);R(26,62,24,22);R(46,64,16,11);R(-48,60,14,6);}
 else if(art==='baer'){R(-78,48,150,62);R(-72,0,24,56);R(40,0,24,56);Kr(86,92,26);R(98,74,26,22);}
 else{R(-80,66,140,50);R(-76,0,18,72);R(38,0,18,72);Kr(72,112,30);R(86,92,30,24);R(-112,92,34,8);R(-116,50,8,46);}
 c.restore();}
function buehne(){const cv=$('buehne'),c=cv.getContext('2d'),W=cv.width,H=cv.height,gy=H-46,ver=$('vergleich').checked,k=Math.min((H-90)/(230/S.CM),ver?W/(960/S.CM):99),cm=k/S.CM,t=ED.T;c.imageSmoothingEnabled=false;
 c.fillStyle='#d8cdb4';c.fillRect(0,0,W,H);c.fillStyle='#8a7350';c.fillRect(0,gy,W,H-gy);
 c.font='11px Georgia';for(let h=50;h<=200;h+=50){const y=gy-h*cm;if(y<8)break;c.fillStyle='#bfb294';c.fillRect(0,y,W,1);c.fillStyle='#7c6b4c';c.fillText(h+' cm',4,y-2);}
 const bx=ver?770*cm:W*.5;
 if(ver){schatten(c,62*cm,gy,k,'mensch');schatten(c,165*cm,gy,k,'hund');schatten(c,330*cm,gy,k,'baer');schatten(c,540*cm,gy,k,'loewe');c.fillStyle='#5a4c36';
  c.fillText('Mensch 180 cm',62*cm-36,gy+16);c.fillText('Hund 75 cm',165*cm-28,gy+16);c.fillText('Braunbär 105 cm',330*cm-40,gy+16);c.fillText('Löwe aus 1.0, 120 cm',540*cm-50,gy+16);}
 S.draw(c,ED.actor,bx,gy,k,ED.face,{time:t});
 const v=$('vorn'),cf=v.getContext('2d');cf.imageSmoothingEnabled=false;cf.fillStyle='#cdbb96';cf.fillRect(0,0,v.width,v.height);S.drawFront(cf,ED.cat,v.width/2,v.height*.52,v.width/(66*S.szOf(ED.cat,ED.shape)),{SH:ED.shape});
 document.querySelectorAll('#haltungen button').forEach(b=>b.classList.toggle('on',b.dataset.m===ED.actor.mode));}
for(const m of S.MODES){const b=el('button',{},HALTUNG[m]);b.dataset.m=m;b.onclick=()=>S.pose(ED.actor,m);$('haltungen').append(b);}
for(const f of S.FORMS){const b=el('button',{},FORM[f]);b.dataset.f=f;b.onclick=()=>{ED.form=f;neu(ED.breed,ED.cat.seed);};$('formen').append(b);}
S.BREEDS.filter(x=>x.built).forEach(x=>$('sorte').append(el('option',{value:x.id},x.name)));
$('sorte').onchange=()=>neu($('sorte').value);
$('wuerfeln').onclick=()=>neu(ED.breed);
$('wenden').onchange=()=>ED.face=$('wenden').checked?-1:1;
$('zurueck').onclick=()=>{ED.shape={...S.shapeOf(ED.breed,ED.form)};ED.actor.SH=ED.shape;bwNeu();S.snap(ED.actor,ED.actor.mode);gestalt();ausgabe();steckbrief();};

// ---------------------------------------------------------------- Reiter Bewegung (ST2)
// Eigene Bühnenfigur mit demselben Tier und derselben Gestalt wie im Reiter Körper, eigene Uhr (Tempo, Pause, Einzelbild).
function bwNeu(){ED.bw=S.actor(ED.cat,'stand');ED.bw.SH=ED.shape;ED.bt=0;ED.plan=null;ED.prints.length=0;ED.skid.length=0;ED.prev=null;ED.jump=0;ED.slip=0;S.step(ED.bw,0,0);}
const knopf=(wo,text,tun)=>{const b=el('button',{},text);b.onclick=()=>{ED.jump=0;ED.slip=0;tun(ED.bw);};$(wo).append(b);return b;};
knopf('bwGang','Stehen (aus dem Galopp: Bremsen)',a=>{ED.plan=null;S.go(a,null);S.pose(a,'stand');});
for(const g of S.GK)knopf('bwGang',S.GAITS[g].de,a=>{ED.plan=null;S.go(a,g);});
knopf('bwWenden','Wenden (im Stand umtreten, im Lauf im Bogen)',a=>{ED.plan=null;S.turn(a,a.v>25?'run':'stand');});
knopf('bwWenden','Ansturm, Bremsen, Herumwerfen',a=>{S.head(a,'up');S.go(a,'gallop');ED.plan='throw';});
knopf('bwWenden','Ansturm mit gesenktem Kopf',a=>{ED.plan='charge';ED.planT=ED.bt;S.head(a,'up');S.go(a,'gallop');});
knopf('bwTun','Hinlegen',a=>{ED.plan=null;S.pose(a,'lie');});knopf('bwTun','Aufstehen',a=>S.pose(a,'stand'));knopf('bwTun','Scharren',a=>{ED.plan=null;S.act(a,'paw');});
knopf('bwTun','Kopf senken',a=>S.head(a,'low'));knopf('bwTun','Grasen',a=>S.head(a,'graze'));knopf('bwTun','Kopf normal',a=>S.head(a,'up'));
for(const [k,X] of Object.entries(S.EXPR))knopf('bwMimik',X.de,a=>S.expr(a,k,ED.bt));
$('bwTempo').oninput=()=>$('bwTempoT').textContent=(+$('bwTempo').value).toFixed(2).replace('.',',')+'×';
$('bwPause').onclick=()=>{ED.pause=!ED.pause;$('bwPause').textContent=ED.pause?'Weiter':'Pause';$('bwPause').classList.toggle('on',ED.pause);};
$('bwBild').onclick=()=>{if(!ED.pause)$('bwPause').click();bwSchritt(1/60);};
$('bwNull').onclick=()=>{ED.jump=0;ED.slip=0;};
// Ein Zeitschritt der Bewegung: rechnen, Abdrücke und Rutschspuren merken, größten Sprung je Bild und Rutschen stehender Hufe messen
function bwSchritt(dt){const a=ED.bw;if(!a||dt<=0)return;ED.bt+=dt;const war=a.feet?a.feet.map(f=>f.st&&!f.sl):null;S.step(a,dt,ED.bt);const st=S.state(a);
 if(ED.plan==='throw'&&st.v>.9*S.GAITS.gallop.v*(a.pace||1)){S.turn(a,'throw');ED.plan=null;}
 if(ED.plan==='charge'){if(ED.bt-ED.planT>2.2)S.head(a,'low');if(ED.bt-ED.planT>3.6){S.go(a,null);S.head(a,'up');ED.plan=null;}}
 const V=S.view(a,ED.bt),P=ED.prev;
 if(a.feet)a.feet.forEach((f,i)=>{if(f.sl>0){ED.skid.push([f.x,f.z]);if(ED.skid.length>500)ED.skid.shift();}else if(f.st&&war&&!war[i]){ED.prints.push([f.x,f.z]);if(ED.prints.length>90)ED.prints.shift();}
  if(P&&P.feet&&f.st&&!f.sl&&war&&war[i])ED.slip=Math.max(ED.slip,Math.hypot(f.x-P.feet[i][0],f.z-P.feet[i][1]));});
 if(P&&dt<=1/50)ED.jump=Math.max(ED.jump,Math.hypot(V.headX-V.x-P.hx,V.headY-V.y-P.hy),Math.hypot(V.hipX-V.x-P.px,V.hipY-V.y-P.py));
 ED.prev={hx:V.headX-V.x,hy:V.headY-V.y,px:V.hipX-V.x,py:V.hipY-V.y,feet:a.feet?a.feet.map(f=>[f.x,f.z]):null};}
const WENDEN={stand:'Wenden im Stand (tritt um)',run:'Wenden im Lauf (Bogen)',throw:'Herumwerfen'};
function bwBuehne(){const cv=$('bwBuehne'),c=cv.getContext('2d'),W=cv.width,H=cv.height,a=ED.bw,sz=S.szOf(ED.cat,ED.shape),k=$('bwNah').checked?3:1.55,u=sz*k,gy=H-($('bwNah').checked?40:120),st=S.state(a);c.imageSmoothingEnabled=false;
 c.fillStyle='#d8cdb4';c.fillRect(0,0,W,H);c.fillStyle='#9a835c';c.fillRect(0,gy-64,W,58);c.fillStyle='#8a7350';c.fillRect(0,gy-6,W,H-gy+6);
 // Boden: Steine an festen Orten, sie ziehen vorbei, wenn das Rind läuft
 const X=x=>W/2+(x-st.x)*u,Y=z=>gy+S.DK*(z-st.z)*u,x0=Math.floor((st.x-W/2/u)/23)-1,x1=Math.ceil((st.x+W/2/u)/23)+1;
 for(let i=x0;i<=x1;i++){const h=S.prim.hrand(i*1.7),h2=S.prim.hrand(i*3.1+5);c.fillStyle=h>.5?'#7b6645':'#9a8460';c.fillRect(Math.round(X(i*23+h*17)),Math.round(gy+4+h2*(H-gy-12)),h>.8?5:3,2);}
 if($('bwSpur').checked){c.fillStyle='#e6d9b6';for(const [x,z] of ED.skid)c.fillRect(Math.round(X(x))-1,Math.round(Y(z))-1,3,2);c.fillStyle='#4f3f29';for(const [x,z] of ED.prints)c.fillRect(Math.round(X(x)-2*u),Math.round(Y(z))-1,Math.max(3,Math.round(5*u)),3);}
 S.draw(c,a,W/2,gy,k,1,{time:ED.bt});
 const grad=Math.round(st.th*180/Math.PI),HALT={stand:'Stand',lie:'Liegen',kneel:'Kniefall'};
 $('bwText').innerHTML='<b>'+(st.turn?WENDEN[st.turn]:st.brake?'Bremsen':st.act?'Scharren':st.gait?S.GAITS[st.gait].de:(HALT[a.mode]||a.mode)+(S.moving(a)?' (Übergang)':''))+'</b> · '+st.kmh.toFixed(1).replace('.',',')+' km/h · Richtung '+grad+'° ('+(grad<5?'nach rechts':grad>175?'nach links':grad>80&&grad<100?'von vorn':'schräg')+') · Kopf: '+({up:'normal',low:'gesenkt',graze:'grast'})[st.head]+
  '<br>Größter Sprung je Bild (Kopf und Kruppe): '+(ED.jump*sz*S.CM).toFixed(1).replace('.',',')+' cm · Rutschen stehender Hufe: '+(ED.slip*sz*S.CM).toFixed(2).replace('.',',')+' cm'+(st.slide>0?' · <b>Hufe rutschen gewollt</b> (Sand spritzt)':'');}

// ---------------------------------------------------------------- Reiter Messung
// Zeichenzeit je Tier: viele Bilder auf eine unsichtbare Fläche, Mittelwert. art: Haltung, 'front' (Kopf von vorn) oder 'brindle' (Stand mit Fellmuster)
function messe(art,k,n=300,form='bull'){const cv=document.createElement('canvas');cv.width=420;cv.height=320;const c=cv.getContext('2d'),D=S.typical(ED.breed,form);
 if(art==='brindle')D.appearance.pattern='brindle';const a=S.actor(D,S.MODES.includes(art)?art:'stand');
 if(S.GAITS[art]){S.step(a,0,0);S.go(a,art);for(let i=0;i<240;i++)S.step(a,1/60,i/60);}
 if(art==='turn'||art==='vorn'){S.step(a,0,0);a.th=art==='turn'?1:Math.PI/2;a.thH=art==='turn'?1.3:Math.PI/2;a.thT=a.th;a.feet=null;}
 const eins=t=>art==='front'?S.drawFront(c,D,210,160,k):S.draw(c,a,200,300,k,1,{time:t});eins(0);
 const t0=performance.now();for(let i=0;i<n;i++)eins(i*.05);return (performance.now()-t0)/n;}
S.messe=messe;
$('messen').onclick=()=>{const T=$('messTabelle');T.innerHTML='<tr><th>Bild</th><th>Kampfgröße (Zoom 1)</th><th>Nahansicht (Zoom 4)</th></tr>';
 const Z=[['stand','Stand (Stier)','bull'],['stand','Stand (Ochse)','ox'],['lie','Liegen','bull'],['brindle','Stand mit Stromung','bull'],['walk','Schritt','bull'],['gallop','Galopp','bull'],['turn','Wenden, schräg','bull'],['vorn','Wenden, von vorn','bull'],['front','Kopf von vorn (Brustbild)','bull']];
 for(const [m,name,f] of Z)T.append(el('tr',{},'<td style="text-align:left">'+name+'</td><td>'+messe(m,1,300,f).toFixed(3)+' ms</td><td>'+messe(m,4,300,f).toFixed(3)+' ms</td>'));
 const t0=performance.now();S.miniClear();S.mini(ED.breed,'side',128);const t1=performance.now();for(let i=0;i<1000;i++)S.mini(ED.breed,'side',128);const t2=performance.now();
 T.append(el('tr',{},'<td style="text-align:left">Miniatur</td><td>erstes Mal '+(t1-t0).toFixed(2)+' ms</td><td>danach '+((t2-t1)/1000).toFixed(4)+' ms</td>'));rassen();};
const HERDE=[];let hz=0,hn=0,hl=0;
function herde(){if(ED.tab==='messung'&&$('herde').checked){const cv=$('herdeBild'),c=cv.getContext('2d'),t=now();c.imageSmoothingEnabled=false;
  if(!HERDE.length)for(let i=0;i<40;i++){const a=S.actor(S.create(S.FIRST,i+1,i%2?'ox':'bull'),S.MODES[i%2]);a.x=40+(i%10)*80;a.y=84+Math.floor(i/10)*72;a.next=t+1+i*.3;HERDE.push(a);}
  const t0=performance.now();c.fillStyle='#d8cdb4';c.fillRect(0,0,cv.width,cv.height);for(const a of HERDE){if(t>a.next){S.setMode(a,S.MODES[Math.floor(Math.random()*2)],t);a.next=t+4+Math.random()*5;}S.draw(c,a,a.x,a.y,.5,1,{time:t});}
  hz+=performance.now()-t0;hn++;if(t-hl>1){$('herdeText').textContent='40 Rinder: '+(hz/hn).toFixed(2)+' ms je Bild, '+(hz/hn/40).toFixed(3)+' ms je Rind';hz=0;hn=0;hl=t;}}
 requestAnimationFrame(herde);}

// Ein Takt: Uhr weiterdrehen, Tier rechnen, den sichtbaren Reiter zeichnen
let last=performance.now();
function bild(){const n=performance.now(),dt=Math.min(.05,(n-last)/1000);last=n;ED.T+=dt;S.step(ED.actor,dt,ED.T);if(ED.tab==='koerper')buehne();
 if(ED.tab==='bewegung'){if(!ED.pause){let r=dt*(+$('bwTempo').value);while(r>1e-6){const d=Math.min(r,1/60);bwSchritt(d);r-=d;}}bwBuehne();}requestAnimationFrame(bild);}

neu(S.FIRST,20261148);ED.pick=S.FIRST;rassen();detail(S.breed(S.FIRST));bild();herde();
})();
