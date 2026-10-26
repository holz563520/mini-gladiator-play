'use strict';
// =====================================================================================================
// KAPITEL 2 · „DIE HÜHNERSCHULE DES GRAUENS“ (nur Testversion, nicht im Hauptspiel)
// Folgt auf „Die teuerste Lektion des Lanisters“. Der Spieler macht jeden Schritt selbst:
// 1 Idee des Schmieds + Hahnenschild am Schultor · 2 Warum Hühner · 3 Die Hühnerhändlerin (drei Käfige, selbst kaufen)
// 4 Das Beastrium (Gebäude + Tierübersicht) · 5 Werte, IST/SOLL, Qualitätsklassen mit echten Wahrscheinlichkeiten
// 6 Erster Hahnenkampf in der neuen Arena (BEAST → HAHN → Herausforderungen) · 7 Lernen am echten Ergebnis
// 8 Sonderherausforderung „DREI HÄHNE GEGEN EINEN IDIOTEN“ · 9 Freies Training, bis der Idiot fällt (dann: Fortsetzung folgt)
// Wiederverwendet: Filmbühne des Kapitels 1 (M.lesson.kit), Hahnengenerator/Lernen/Heilung (CF), Nahansicht mit den
// fünf Qualitätsanimationen (RoosterCloseup aus labor/ui.js), neue Arena (ArenaUI, Challenges, AN), Spielfiguren (M).
// =====================================================================================================
(()=>{
const M=window.MG,S=M.s,CF=window.CF,CH=window.Challenges,AN=window.AN,ART=window.ArenaArt,HS=window.HS,A=HS.art,K=M.lesson.kit,CU=window.RoosterCloseup,ODDS=window.ROOSTER_ODDS,TEST=!!window.LESSON_TEST;
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const st=HS.st,alive=HS.alive,say=(who,text,o)=>({who,say:text,...o});
const smithName=()=>M.workshop.state.master?.name||'Der Schmied',lanName=()=>S.lanista?.name||'Lanister';
const f1=v=>(Math.round(v*10)/10).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1});
const pctTxt=p=>p>=.1?Math.round(p*100)+' %':p>=.01?(p*100).toFixed(1).replace('.',',')+' %':(p*100).toFixed(2).replace('.',',')+' %';
const setStage=s=>{st().stage=s;try{M.persist();}catch{}};
// Werte der Hähne mit den Namen aus dem Auftrag (Schlüssel aus dem Hahnenmodell)
const STATS=[['groesse','Körpergröße','Reichweite und körperliche Voraussetzungen'],['kraft','Muskelkraft','allgemeine Kraft hinter jedem Angriff'],['schnabelkraft','Schnabelkraft','Wirkung der Pickangriffe'],['klauenstaerke','Klauenstärke','Wirkung der Klauenangriffe'],['geschwindigkeit','Geschwindigkeit','Bewegung, Angriffstempo, Ausweichen'],['zaehigkeit','Zähigkeit','Widerstandskraft des ganzen Hahns (ein Gesamtwert)']];
const MOVES=[['peck','Picken'],['claw','Krallen']];
HS.career.gainLabels=Object.fromEntries([...STATS.map(s=>[s[0],s[1]]),...MOVES]);
// Fünf Qualitätsklassen = fünf Animationen der Nahansicht (9 Stufen des Modells, Zuordnung wie labor/ui.js ANIM_KIND)
const CLASSES=[{k:1,tiers:[1,2,3],name:'Kümmerling',txt:'klein, trottelig, kippt gern um'},{k:2,tiers:[4],name:'Hinterhofhahn',txt:'kommt herein, plustert sich halbherzig'},{k:3,tiers:[5],name:'Kampfhahn',txt:'Sprung, Flügelschlag, Krähen'},{k:4,tiers:[6],name:'Raufbold',txt:'Einschlag, Federn, Kreischen'},{k:5,tiers:[7,8,9],name:'Bluthahn und Schlimmeres',txt:'Dunkelheit, glühende Augen, Blitz'}];
const classOf=R=>CLASSES.find(c=>c.tiers.includes(R.quality.tier));
const classP=c=>c.tiers.reduce((n,t)=>n+ODDS.tiers[t-1],0);
const kw=R=>CH.kw({kind:'rooster',R});
const stars=t=>t===1?'✖✖':t===2?'✖':t<=7?'★'.repeat(t-2)+'☆'.repeat(7-t):t===8?'★★★★★✦':'★★★★★✦✦';

// =====================================================================================================
// KULISSE VOR DEM SCHULTOR (Außenansicht, gleiche Weltpixel wie die Karte)
// =====================================================================================================
let facadeBg=null,facadeName='';
A.facade=function(){const name=String(S.schoolName||'Ludus').toUpperCase();if(facadeBg&&facadeName===name)return facadeBg;facadeName=name;
 const W=900,H=670,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.imageSmoothingEnabled=false;const R=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 const hs=n=>{const s=Math.sin(n*127.1+311.7)*43758.5;return s-Math.floor(s);};
 // Himmel und Hügel
 for(let y=0;y<260;y+=6)R(0,y,W,6,y<90?'#9cb6b8':y<170?'#b7c7bd':'#cdd2bb');for(let i=0;i<6;i++){g.fillStyle=i%2?'#8fa58a':'#7f9679';g.beginPath();g.ellipse(80+i*160,262,130,46,0,Math.PI,0);g.fill();}
 for(let i=0;i<5;i++){R(60+i*190+hs(i)*40,40+hs(i*3)*40,50,8,'#e8eee6');R(70+i*190+hs(i)*40,34+hs(i*3)*40,30,8,'#e8eee6');}
 // Mauer (Vorderseite) mit Zinnen
 const top=330,base=520;R(0,top,W,base-top,'#8a8468');for(let y=top;y<base;y+=12)for(let x=((y/12)%2)*14;x<W;x+=28){const n=hs(x*.7+y);R(x,y,27,11,n<.33?'#7c775d':n<.66?'#948e70':'#857f63');R(x,y+11,27,1,'#5e5a46');}
 for(let x=0;x<W;x+=40){R(x,top-18,26,18,'#8a8468');R(x,top-18,26,3,'#a8a286');}R(0,top-2,W,4,'#6e6a52');
 // Moos, Risse, Plakate
 for(let i=0;i<30;i++)R(hs(i)*W,top+20+hs(i*7)*170,6+hs(i*3)*10,2,'#6f7f4a');for(let i=0;i<6;i++){const x=40+hs(i*5)*820;if(Math.abs(x-450)<140)continue;R(x,410+hs(i)*40,22,28,'#d8c9a0');R(x+3,414+hs(i)*40,16,2,'#7a3a2a');R(x+3,420+hs(i)*40,12,1,'#5a4a3a');R(x+3,424+hs(i)*40,14,1,'#5a4a3a');}
 // Torbau: Pfeiler, Bogen, offene Torflügel
 R(370,350,160,170,'#7a7460');for(let y=352;y<520;y+=10)for(let x=372+((y/10)%2)*9;x<528;x+=18)R(x,y,17,9,hs(x+y)>.5?'#8a8468':'#76705a');
 R(360,340,16,180,'#a8a286');R(524,340,16,180,'#a8a286');R(356,334,24,8,'#c0b898');R(520,334,24,8,'#c0b898');
 g.fillStyle='#1d1610';g.beginPath();g.moveTo(405,520);g.lineTo(405,452);g.arc(450,452,45,Math.PI,0);g.lineTo(495,520);g.closePath();g.fill();
 g.fillStyle='#3a2e22';g.beginPath();g.moveTo(410,520);g.lineTo(410,456);g.arc(450,456,40,Math.PI,0);g.lineTo(490,520);g.closePath();g.fill();
 for(let x=414;x<488;x+=8)R(x,480,2,40,'#2a2018');R(404,470,14,50,'#6b4a2c');R(482,470,14,50,'#6b4a2c');for(const x of [404,482]){R(x,478,14,2,'#3a3a3a');R(x,505,14,2,'#3a3a3a');}
 // Namensschild der Schule (bleibt!) – dynamisch aus dem Spielstand
 g.font="bold 15px 'Courier Prime',monospace";const tw=Math.max(150,Math.min(300,g.measureText(name).width+30));R(450-tw/2-3,352,tw+6,26,'#a8a88c');R(450-tw/2,355,tw,20,'#273d3e');g.textAlign='center';g.fillStyle='#efe0b3';g.fillText(name.slice(0,26),450,370);
 // Fackeln und Banner
 for(const x of [340,552]){R(x,420,6,16,'#4a321e');R(x-2,410,10,10,'#f0a13c');R(x,406,6,5,'#ffd27a');}
 for(const x of [300,600]){R(x-1,348,2,8,'#3a2a18');R(x-14,356,28,60,'#8f2f2a');R(x-14,356,28,3,'#b78d3c');R(x-6,374,12,12,'#b78d3c');R(x-14,412,6,6,'#8f2f2a');R(x+8,412,6,6,'#8f2f2a');}
 // Straße mit Spurrillen, Gras, Steine, Pfütze
 R(0,base,W,H-base,'#8a7a58');for(let y=base;y<H;y+=6)R(0,y,W,1,'#7e6e4e');R(0,base,W,4,'#5e5a46');
 for(const y of [578,604]){R(0,y,W,3,'#6e5e40');}for(let i=0;i<80;i++)R(hs(i*2.1)*W,base+8+hs(i*3.3)*(H-base-10),2+hs(i)*3,2,hs(i*5)>.5?'#a89a72':'#6a5a3e');
 for(let i=0;i<40;i++){const x=hs(i*9.7)*W,y=H-8-hs(i*1.9)*30;R(x,y,2,6,'#6f8f4a');R(x+2,y+2,2,4,'#5f7f3a');}
 g.fillStyle='#6f7f86';g.beginPath();g.ellipse(760,630,40,8,0,0,7);g.fill();g.fillStyle='#8fa0a6';g.fillRect(740,628,20,2);
 return facadeBg=c;};
// Karte des Ludus: Schild am Schultor, Beastrium, Händlerin mit Karren
const overlay=M.ludusOverlay;
M.ludusOverlay=(g,t)=>{overlay?.(g,t);const s=st();if(s.sign)A.gateSign(g,t);if(s.beastrium)A.beastrium(g,t,{rise:HS.rise??1});if(sellerOnMap())drawMapSeller(g,t);};
// Platz auf dem Hof vor dem Arena-Tor (rechts): abseits der Wege des Sklavenhändlers und der Herumtreiber
const MAP_SELLER={x:516,y:238};
function sellerOnMap(){const s=st();return ['free','won','end','fight1','b-open','b-pick'].includes(s.stage)&&!film();}
function drawMapSeller(g,t){const o=offer();A.cart(g,{x:MAP_SELLER.x+52,y:MAP_SELLER.y,t,roosters:o.list,sold:o.sold,face:-1,handle:[MAP_SELLER.x+11,MAP_SELLER.y-24]});A.seller(g,{x:MAP_SELLER.x,y:MAP_SELLER.y,dir:-1,pose:Math.sin(t*.6)>.3?'sell':'hips',t,mouth:Math.sin(t*.6)>.3?'shout':'grin'});}
// Antippen der Händlerin (ganze Figur samt Karren) geht vor: ihr Kopf ragt in das Feld des Arena-Tors
const prevHit=M.ludusHit;M.ludusHit=(x,y)=>{if(sellerOnMap()&&x>=MAP_SELLER.x-26&&x<=MAP_SELLER.x+112&&y>=MAP_SELLER.y-92&&y<=MAP_SELLER.y+10){M.ui.click('nav:hmarket');return true;}return prevHit?prevHit(x,y):false;};
const PLACE_SELLER={name:'Hühnerhändlerin',sub:'3 Hähne am Tag',route:'hmarket',x:MAP_SELLER.x-16,y:MAP_SELLER.y-56,w:110,h:60};
function syncPlaces(){const P=M.ludus.places,s=st();const want=[[A.BEASTRIUM,s.beastrium],[PLACE_SELLER,sellerOnMap()]];for(const [p,on] of want){const i=P.indexOf(p);if(on&&i<0)P.push(p);if(!on&&i>=0)P.splice(i,1);}/* hinten anfügen: ludus.js zeichnet die Gebäude über feste Indizes (places[0..7]) */}

// =====================================================================================================
// HÜHNERHÄNDLERIN: drei Hähne pro Spieltag, Käfig antippen = kaufen, danach Nahansicht mit Qualitätsanimation
// =====================================================================================================
const PRICE=8;// gewöhnlicher Preis (sehr niedrig: ein leichter Hahnenkampf bringt 10–30 Gold); am ersten Tag 1 Gold
function offer(){const s=st();if(!s.offer||s.offer.day!==S.day){s.offer={day:S.day,first:!s.offer,list:[0,1,2].map(()=>CF.createRooster({source:'haendler',vendorId:'huehnerhaendlerin'})),sold:[false,false,false]};}return s.offer;}
function priceOf(i){const o=offer();if(o.first)return 1;const p=PRICE;// Mitleidspreis: ohne kampffähigen Hahn verlangt sie nur, was in der Kasse ist
 if(!alive().some(R=>CF.fitForFight(R))&&S.gold<p)return Math.max(0,S.gold);return p;}
HS.onDay=()=>{offer();syncPlaces();};
let market=null;
const SELLER_LINES={hello:['FRISCHE HÄHNE! STOLZE KÄMPFER!','NA, EINARMIGER? WIEDER DA?','HEUTE GANZ BESONDERS WÜTENDE EXEMPLARE!','DER LINKE HAT HEUTE MORGEN DEN HOFHUND VERPRÜGELT!'],
 buy:['VERKAUFT! BEHANDEL IHN GUT, SONST KOMM ICH NACHTS!','EIN PRACHTKERL! ODER JEDENFALLS EIN KERL!','GUTE WAHL! DER BEISST NUR, WENN ER WACH IST!','NIMM IHN! ER HAT DICH SCHON INS HERZ GEPICKT!'],
 poor:['KEIN GOLD? DANN KEIN GOCKEL!','MEINE HÄHNE SIND KEINE ALMOSEN, DU PFOSTEN!'],empty:['AUSVERKAUFT! MORGEN BRING ICH NEUE!']};
const pick=a=>a[Math.floor(Math.random()*a.length)];
function openMarket(tutorial){closeMarket();const o=offer(),v=document.createElement('div');v.className='hs-market';
 v.innerHTML=`<div class="hs-mbox"><header><div><p class="eyebrow">HÜHNERHÄNDLERIN · TAG ${S.day}</p><h2>Drei Käfige, drei Hähne</h2></div><span class="hs-gold"><b id="hsGold">${S.gold}</b> Gold</span></header>
 <div class="hs-stage"><canvas width="660" height="420" class="px"></canvas><div class="hs-hot"></div><div class="hs-say" id="hsSay"></div></div>
 <div class="hs-offers"></div><p class="hs-note">${tutorial?'Tippe auf einen Käfig. Werte und Talent zeigt erst die Nahansicht nach dem Kauf.':'Werte und Talent siehst du erst nach dem Kauf. Nicht Verkauftes nimmt sie abends wieder mit.'}</p>
 ${tutorial?'':'<div class="hs-mact"><button class="btn" data-hs="mclose">ZURÜCK ZUM LUDUS</button></div>'}</div>`;
 document.body.appendChild(v);market={v,tutorial,t:0,hover:-1,pose:'sell',talk:pick(SELLER_LINES.hello),talkT:0,busy:false};renderOffers();
 const hot=v.querySelector('.hs-hot');[0,1,2].forEach(i=>{const b=document.createElement('button');b.className='hs-cage';b.dataset.hs='buy:'+i;b.setAttribute('aria-label','Käfig '+(i+1));b.style.left=(cageBox(i).l)+'%';b.style.width=cageBox(i).w+'%';b.style.top=cageBox(i).t+'%';b.style.height=cageBox(i).h+'%';b.addEventListener('pointerenter',()=>market&&(market.hover=i));b.addEventListener('pointerleave',()=>market&&(market.hover=-1));hot.appendChild(b);});
 talk(market.talk);}
// Kamera der Marktansicht: Karren und Händlerin groß
const MCAM={x:582,y:532,vw:150},MPOS={cart:{x:612,y:566},seller:{x:560,y:566}};
function cageBox(i){const VW=MCAM.vw,VH=VW*420/660,x0=MCAM.x-VW/2,y0=MCAM.y-VH/2,cx=MPOS.cart.x-31+i*21,top=MPOS.cart.y-38;return {l:(cx-x0)/VW*100,w:20/VW*100,t:(top-y0)/VH*100,h:20/VH*100};}
function renderOffers(){if(!market)return;const o=offer(),box=market.v.querySelector('.hs-offers');
 box.innerHTML=o.list.map((R,i)=>{const vis=CF.Market.visible(R),sold=o.sold[i],p=priceOf(i);return `<button class="hs-offer${sold?' sold':''}" data-hs="buy:${i}" ${sold?'disabled':''}><b>Käfig ${i+1} · ${esc(R.name)}</b><small>${esc(vis.plumage)} · ${vis.height} cm · ${f1(vis.weight)} kg · ${vis.ageMonths} Monate</small><span>${sold?'VERKAUFT':p+' Gold'}</span></button>`;}).join('');
 const g=$('hsGold');if(g)g.textContent=S.gold;}
function talk(text){if(!market)return;market.talk=text;market.talkT=0;M.speakLine?.(text,'haendler');const el=$('hsSay');if(el){el.textContent=text;el.classList.remove('in');void el.offsetWidth;el.classList.add('in');}}
function closeMarket(){market?.v?.remove();market=null;}
function paintMarket(dt){const m=market;if(!m)return;m.t+=dt;m.talkT+=dt;const c=m.v.querySelector('canvas');if(!c)return;const g=c.getContext('2d'),o=offer();g.imageSmoothingEnabled=false;
 const VW=MCAM.vw,VH=VW*420/660,k=660/VW;g.setTransform(1,0,0,1,0,0);g.save();g.scale(k,k);g.translate(-(MCAM.x-VW/2),-(MCAM.y-VH/2));g.drawImage(A.facade(),0,0);
 if(st().sign)A.gateSign(g,m.t,{x:450,y:404,frame:false,nails:4});
 A.cart(g,{x:MPOS.cart.x,y:MPOS.cart.y,t:m.t,roosters:o.list,sold:o.sold,face:-1,hover:m.hover,labels:true,handle:[MPOS.seller.x+11,MPOS.seller.y-24]});
 const pose=m.talkT<1.6?(m.pose==='hug'?'hug':m.talkT<.8?'flail':'sell'):m.hover>=0?'point':'hips';A.seller(g,{x:MPOS.seller.x,y:MPOS.seller.y,dir:-1,pose,t:m.t,mouth:m.talkT<1.4?'shout':'grin'});
 g.restore();}
async function buy(i){const m=market;if(!m||m.busy)return;const o=offer();if(o.sold[i]){talk(pick(SELLER_LINES.empty));return;}const p=priceOf(i);if(S.gold<p){talk(pick(SELLER_LINES.poor));return;}
 m.busy=true;S.gold-=p;o.sold[i]=true;const R=o.list[i];CF.Market.purchase({rooster:R,price:p},{id:'spieler'});R.market.source='huehnerhaendlerin';st().roosters.push(R);M.sound?.('coin');m.pose='hug';talk(pick(SELLER_LINES.buy));renderOffers();try{M.persist();}catch{}
 await present(R,{corner:'GEKAUFT · '+p+' GOLD'});m.busy=false;m.pose='sell';if(!market)return;
 if(m.tutorial&&o.sold.every(Boolean)){closeMarket();scene4();return;}
 if(m.tutorial){talk(o.sold.filter(Boolean).length===1?'NOCH ZWEI! DIE WOLLEN AUCH ZU DIR, DU ARMER!':'EINER NOCH! DER LETZTE SCHAUT SCHON GANZ TRAURIG!');}}

// ---------- Nahansicht nach dem Kauf: fünf Qualitätsanimationen (CloseupScene aus labor/ui.js) ----------
let pres=null;
function present(R,opts={}){return new Promise(res=>{const v=document.createElement('div');v.className='hs-present';const cls=classOf(R),q=R.quality,pf=R.profile;
 v.innerHTML=`<div class="hs-pbox"><p class="hs-corner">${esc(opts.corner||'NEUER HAHN')}</p><div class="hs-pstage"><canvas width="320" height="200" class="px"></canvas><div class="hs-bubble"></div></div>
 <div class="hs-ptext q${q.tier}"><h2>${esc(R.name)}</h2><p class="hs-qual" style="color:${q.color}"><span>${stars(q.tier)}</span> ${esc(q.title)} · Qualität: ${esc(q.label)}</p><p class="hs-qcls">Klasse „${esc(cls.name)}“ · so ein Hahn kommt bei ${pctTxt(classP(cls))} aller Hähne vor</p>${M.buyOdds?.html('rooster',R)||''}
 <p class="hs-sum">${esc(pf.summary)}</p>${statTable(R,false)}<p class="hs-chips"><span>${esc(R.appearance.plumageName)}</span><span>${R.height} cm · ${f1(R.weight)} kg</span><span>${R.ageMonths} Monate</span><span>KW ${kw(R)}</span><span>Bevorzugt: ${esc(pf.favoriteMoveLabel)}</span></p></div>
 <div class="hs-pact"><button class="btn" data-hs="pskip">ANIMATION ÜBERSPRINGEN</button><button class="btn primary" data-hs="pdone">${esc(opts.done||'IN DEN BESTAND ▸')}</button></div></div>`;
 document.body.appendChild(v);const cv=v.querySelector('canvas'),bub=v.querySelector('.hs-bubble'),txt=v.querySelector('.hs-ptext');
 const scene=new CU.CloseupScene(cv);CU.setBubble((text,tier)=>{if(!text){bub.classList.remove('show');return;}bub.textContent=text;bub.className='hs-bubble show q'+tier;});
 pres={v,scene,done:()=>{scene.stop();CU.setBubble(null);v.remove();pres=null;res();}};scene.play(R,()=>txt.classList.add('show'));
 v.querySelector('.hs-pstage').addEventListener('click',()=>scene.skip());});}
function statTable(R,withBars=true,mark){const row=([k,label])=>{const v=R.stats[k],cap=R.caps.stats[k],b=mark?.[k];return `<tr${b?' class="hs-up"':''}><th>${esc(label)}</th><td class="v">${f1(v)}${b?`<i>+${f1(b)}</i>`:''}</td><td class="bar"><i style="width:${Math.min(100,v)}%"></i><em style="left:${Math.min(100,cap)}%"></em></td><td class="c">${Math.round(cap)}</td></tr>`;};
 return `<table class="hs-stats"><thead><tr><th>Eigenschaft</th><th>IST</th><th class="bar">0 ··· 50 ··· 100</th><th>SOLL</th></tr></thead><tbody>${STATS.map(row).join('')}</tbody></table>`;}

// =====================================================================================================
// BEASTRIUM (Seite im Ludus): Arten wählen, Käfige nach KW, Detailfenster mit Werten
// =====================================================================================================
const SPECIES=[['hahn','Hahn',true],['hund','Hund',false],['baer','Bär',false],['loewe','Löwe',false],['tiger','Tiger',false]];
let bView={species:'hahn'};
function beastriumPage(){const s=st(),list=[...alive()].sort((a,b)=>kw(b)-kw(a)||b.stats.zaehigkeit-a.stats.zaehigkeit),dead=s.roosters.filter(R=>R.dead);
 const sp=bView.species;
 return `<section class="box hs-beastrium"><div class="hs-bhead"><div><p class="eyebrow">${esc(S.schoolName||'Ludus')} · TIERHALTUNG</p><h1>Beastrium</h1><p>Käfige und Gehege deiner Kampftiere. Sortiert nach Kampfwert (KW), die Stärksten oben.</p></div>${TEST?'':''}</div>
 <div class="hs-tabs" role="tablist">${SPECIES.map(([k,l,ok])=>`<button role="tab" class="${sp===k?'on':''}${ok?'':' locked'}" data-action="hs:species:${k}" aria-selected="${sp===k}"><canvas width="64" height="44" class="px" data-sp="${k}"></canvas><b>${l}</b>${ok?`<small>${k==='hahn'?alive().length:0}</small>`:'<small>🔒</small>'}</button>`).join('')}</div>
 ${sp!=='hahn'?`<div class="hs-lockbox"><canvas width="300" height="140" class="px" data-sp-big="${sp}"></canvas><p><b>${esc(SPECIES.find(x=>x[0]===sp)[1])}</b> · Gehege vorbereitet, noch gesperrt. Diese Tierart folgt später.</p></div>`:
 list.length?`<div class="hs-cages">${list.map((R,i)=>`<button class="hs-cagecard${CF.fitForFight(R)?'':' hurt'}" data-action="hs:animal:${R.id}"><span class="hs-rank">${i+1}</span><canvas width="150" height="112" class="px" data-r="${R.id}"></canvas><b>${esc(R.name)}</b><small style="color:${R.quality.color}">${stars(R.quality.tier)} ${esc(R.quality.title)}</small><span class="hs-kw">KW <b>${kw(R)}</b></span><i class="hs-hp"><i style="width:${Math.round(CF.health(R))}%"></i></i><em>${esc(CF.status(R))}${R.fights?` · ${R.wins}/${R.fights} Siege`:''}</em></button>`).join('')}</div>`:
 `<p class="hs-empty">Leere Käfige. Die Hühnerhändlerin kommt jeden Tag mit drei neuen Hähnen vorbei.</p>`}
 ${sp==='hahn'&&dead.length?`<details class="hs-fallen"><summary>Gefallene Hähne (${dead.length})</summary><ul>${dead.map(R=>`<li><b>${esc(R.name)}</b> · ${esc(R.cause||'gefallen')}${R.killer?' · durch '+esc(R.killer):''}</li>`).join('')}</ul></details>`:''}
 <div class="buttons"><button class="btn" data-action="nav:home">ZURÜCK ZUM LUDUS</button></div></section>`;}
// Lebendige Bilder auf der Seite (eigener Takt, nur sichtbare Flächen)
const live=new Map();
function mountBeastrium(){document.querySelectorAll('.hs-beastrium canvas[data-r]').forEach(cv=>{const R=st().roosters.find(x=>x.id===cv.dataset.r);if(R)live.set(cv,(g,t)=>paintCage(g,cv,R,t));});
 document.querySelectorAll('.hs-beastrium canvas[data-sp],.hs-beastrium canvas[data-sp-big]').forEach(cv=>{const k=cv.dataset.sp||cv.dataset.spBig;live.set(cv,(g,t)=>paintSpecies(g,cv,k,t));});}
function paintCage(g,cv,R,t){const w=cv.width,h=cv.height;g.imageSmoothingEnabled=false;g.fillStyle='#20180f';g.fillRect(0,0,w,h);g.fillStyle='#3a2a1a';for(let y=0;y<h-24;y+=10)for(let x=((y/10)%2)*9;x<w;x+=18)g.fillRect(x,y,17,9);g.fillStyle='#2a1d12';for(let y=9;y<h-24;y+=10)g.fillRect(0,y,w,1);
 g.fillStyle='#b8964a';g.fillRect(0,h-24,w,24);g.fillStyle='#e0c47a';for(let i=0;i<20;i++)g.fillRect((i*37)%w,h-22+(i%4)*5,6,1);
 const hurt=!CF.fitForFight(R),mood=hurt?'fear':Math.sin(t*.4+R.seed%5)>.7?'proud':'idle';ART.rooster(g,R,{t,mood,w,h,size:h*.56,x:w/2,y:h-8,seed:R.seed%7});
 g.fillStyle='#5c5c54';for(let x=6;x<w;x+=14)g.fillRect(x,0,3,h-6);g.fillStyle='#8a8a80';for(let x=6;x<w;x+=14)g.fillRect(x,0,1,h-6);g.fillStyle='#6e5030';g.fillRect(0,0,w,5);g.fillRect(0,h-6,w,6);}
function paintSpecies(g,cv,k,t){const w=cv.width,h=cv.height;g.imageSmoothingEnabled=false;g.fillStyle='#1a140e';g.fillRect(0,0,w,h);g.fillStyle='#5a4a36';g.fillRect(0,h*.78,w,h*.22);const s=h/104;
 if(k==='hahn'){const R=alive()[0]||A.signRooster||(A.sign(),A.signRooster);ART.rooster(g,R,{t,mood:'idle',w,h,size:h*.66,x:w/2,y:h-3});}else if(k==='hund')ART.dog(g,t,w/2-4,h-3,s*1.05);else if(k==='baer')ART.bear(g,t,w/2-8,h-3,s*.95);else if(k==='loewe'){ART.lion(g,CH.lion(()=>.5,{kind:'koenig'}),{t,mood:'idle',x:w/2+4,y:h-2,scale:s*.62,face:-1});}else ART.tiger(g,t,w/2+4,h-2,s*.6);
 if(k!=='hahn')ART.locked(g);}
let lastLive=performance.now();
function stepLive(now){for(const [cv,fn] of live){if(!cv.isConnected){live.delete(cv);continue;}const r=cv.getBoundingClientRect();if(r.bottom<-20||r.top>innerHeight+20)continue;try{fn(cv.getContext('2d'),now/1000);}catch(e){console.error(e);live.delete(cv);}}}
// Detailfenster eines Hahns
let detail=null;
function openDetail(R,o={}){closeDetail();const v=document.createElement('div');v.className='hs-detail';const q=R.quality,cls=classOf(R),body=Object.entries(R.body).filter(([,p])=>p.grade>0);
 v.innerHTML=`<div class="hs-dbox" role="dialog" aria-label="${esc(R.name)}"><header><button class="hs-x" data-hs="dclose" aria-label="Schließen">✕</button><p class="eyebrow">BEASTRIUM · HAHN</p><h2>${esc(R.name)}</h2><p class="hs-qual" style="color:${q.color}">${stars(q.tier)} ${esc(q.title)} · ${esc(q.label)} · Klasse „${esc(cls.name)}“</p></header>
 <div class="hs-pstage"><canvas width="320" height="200" class="px"></canvas><div class="hs-bubble"></div><button class="hs-replay" data-hs="replay">▶ Vorstellung</button></div>
 <div class="hs-dgrid"><span>KW <b>${kw(R)}</b></span><span>Gesundheit <b>${Math.round(CF.health(R))} %</b></span><span>Zustand <b>${esc(CF.status(R))}</b></span><span>Kämpfe <b>${R.fights||0}</b> · Siege <b>${R.wins||0}</b> · Getötet <b>${R.kills||0}</b></span></div>
 ${statTable(R,true,o.mark)}
 <table class="hs-stats hs-moves"><tbody>${MOVES.map(([k,l])=>`<tr><th>${l}</th><td class="v">${f1(R.moves[k])}</td><td class="bar"><i style="width:${Math.min(100,R.moves[k])}%"></i><em style="left:${Math.min(100,R.caps.moves[k])}%"></em></td><td class="c">${Math.round(R.caps.moves[k])}</td></tr>`).join('')}</tbody></table>
 <p class="hs-legend"><i class="ist"></i> IST · was er jetzt kann &nbsp; <i class="soll"></i> SOLL · was aus ihm werden kann</p>
 <p class="hs-chips"><span>${esc(R.appearance.plumageName)}</span><span>${R.height} cm · ${f1(R.weight)} kg</span><span>${R.ageMonths} Monate</span><span>Talent: ${esc(R.profile.potentialNote)}</span><span>Bevorzugt: ${esc(R.profile.favoriteMoveLabel)}</span></p>
 ${body.length?`<p class="hs-wounds">Verletzt: ${body.map(([k,p])=>esc(CF.partName(k))+' ('+esc(CF.GRADE_LABEL?.[p.grade]||'Grad '+p.grade)+')').join(' · ')}</p>`:''}
 ${!R.dead&&!active()?`<div class="hs-kill" data-kill><button class="btn small danger" data-hs="kill1">🔪 SCHLACHTEN</button><small>Hähne, die du nicht willst, landen im Topf. Endgültig.</small></div>`:''}
 ${R.history?.length?`<details class="hs-hist"><summary>Verlauf</summary><ul>${R.history.slice(0,8).map(h=>`<li>Tag ${h.day}: ${esc(h.text)}</li>`).join('')}</ul></details>`:''}</div>`;
 document.body.appendChild(v);const cv=v.querySelector('canvas'),bub=v.querySelector('.hs-bubble'),scene=new CU.CloseupScene(cv);CU.setBubble((text,tier)=>{if(!text){bub.classList.remove('show');return;}bub.textContent=text;bub.className='hs-bubble show q'+tier;});
 scene.play(R,()=>{});if(!o.anim)scene.skip();detail={v,R,scene};}
function closeDetail(){if(!detail)return;detail.scene.stop();CU.setBubble(null);detail.v.remove();detail=null;}

// =====================================================================================================
// ARENA: Öffnen, Sperren, Empfehlung, Sonderherausforderung, Ergebnis
// =====================================================================================================
const arenaAllowed=()=>['fight1','free','won','end'].includes(st().stage)&&!film();
HS.lockMsg=k=>{if(!active())return '';if(k==='human')return smithName()+': „Deine Gladiatoren liegen im Krankenhaus. Hähne. Heute nur Hähne.“';if(k==='loewe')return 'Du besitzt keinen Löwen. Und nach Rex will dich auch keiner mehr mit einem sehen.';return '';};
HS.recommend=c=>st().stage==='fight1'&&c.level.key==='leicht'?'EMPFOHLEN':'';
HS.onArenaClosed=()=>{if(['free','won'].includes(st().stage))taskbar();};
function openArena(){if(!arenaAllowed())return;const U=window.ArenaUI;if(!U||U.isOpen())return;K.hideGuide();U.open();}
// ---------- Der Dorftrottel ----------
function makeIdiot(){const s=st(),r=CH.rngOf(Date.now()%1e9),own=alive().filter(R=>CF.fitForFight(R)).sort((a,b)=>kw(b)-kw(a)).slice(0,3).map(R=>({kind:'rooster',R,key:'r:'+R.id}));
 const name=A.sillyName(r);const build=target=>{const g=CH.gladiator(r,{q:0,role:'Assassine',kwTarget:target,enemy:true});g.name=name;g.role='Assassine';A.idiotLook(g,r);g.enemyGear={weapon:M.makeItem('weapon','dagger',0),secondary:null,shield:null,armor:{}};g.traits=(g.traits||[]).filter(t=>t!=='Feige');CH.tune(g,target);g.age=Math.round(19+r()*20);g.wins=0;g.kills=0;return g;};
 // KW so wählen, dass drei untrainierte Hähne laut Modell nur selten gewinnen (Ziel ≈ 25 %), mit dem echten Kampfwert
 let lo=8,hi=70,g=null;for(let i=0;i<14;i++){const mid=(lo+hi)/2;g=build(mid);const p=own.length?CH.pWin(own,[{kind:'human',g,key:'i'}]):.3;if(p>.25)lo=mid;else hi=mid;}
 g=build((lo+hi)/2);s.idiot={tpl:JSON.parse(JSON.stringify(g)),name,kw:M.power(g),made:S.day,tries:0,p0:own.length?CH.pWin(own,[{kind:'human',g,key:'i'}]):null};try{M.persist();}catch{}return s.idiot;}
function idiotG(){const I=st().idiot;if(!I)return null;const g=JSON.parse(JSON.stringify(I.tpl));g.id='idiot-'+Date.now().toString(36);return g;}
let idiotCache=null;
HS.extraChallenges=units=>{const s=st();if(!['free'].includes(s.stage)||!s.idiot||units.some(u=>u.kind!=='rooster'))return [];
 if(!idiotCache||idiotCache.made!==s.idiot.tries)idiotCache={made:s.idiot.tries,u:{kind:'human',key:'idiot',row:'front',g:idiotG()}};const enemy=[idiotCache.u],p=CH.pWin(units,enemy),gold=CH.gold(units,enemy,p);
 const L={...CH.LEVELS[3],key:'idiot',label:'Tutorialziel',color:'#d0473e',skulls:Math.max(1,Math.min(4,Math.round((1-p)*4)))};
 return [{id:'idiot',special:true,level:L,tpl:'champion',label:'Ein Einzelner',name:'DREI HÄHNE GEGEN EINEN IDIOTEN',desc:`${s.idiot.name}, der Dorftrottel. Billige Kleider, ein Dolch, keine Rüstung – und trotzdem gefährlicher als drei untrainierte Frühstückslieferanten.`,enemy,enemyE:{idiot:CH.strength(enemy[0])},ownKW:CH.teamKW(units),enemyKW:CH.teamKW(enemy),ratio:CH.teamE(enemy)/Math.max(.01,CH.teamE(units)),p,gold}];};
HS.present=(c,done)=>{if(c.id!=='idiot')return false;idiotShow(c,()=>{done();});return true;};
HS.onResult=R=>{const s=st();if(R.c.id==='idiot'){s.idiot.tries++;idiotCache=null;if(R.won&&s.stage==='free'){setStage('won');K.hideGuide();setTimeout(()=>toast('Der Dorftrottel liegt im Sand!','WEITER ▸',()=>{window.ArenaUI.close();victoryEnd();}),1200);}return;}
 if(s.stage==='fight1'){s.first={gains:R.gains.map(g=>({id:g.R.id,name:g.name,list:g.list.map(x=>({key:x.key,label:x.label,from:x.from,to:x.to,cap:x.cap}))})),won:R.won,dead:R.mine.filter(u=>u.dead).length};setStage('r1');setTimeout(()=>toast(smithName()+' kommt dazu …','WEITER ▸',()=>{window.ArenaUI.close();scene7();}),1500);}};
let toastEl=null;
function toast(text,btn,fn){toastEl?.remove();const v=document.createElement('div');v.className='hall-guide lion-guide lesson-guide hs-toast';v.innerHTML=`<b>${esc(smithName())}</b><span>${esc(text)}</span><button class="btn primary" type="button">${esc(btn)}</button>`;document.body.appendChild(v);toastEl=v;v.querySelector('button').addEventListener('click',e=>{e.stopPropagation();v.remove();toastEl=null;fn();});}

// ---------- Hahn gegen Hahn (1 gegen 1): Dorfplatz statt großer Arena ----------
// Wie im Hahnenkampf-Prototyp: Ein einzelner Hahn gegen einen einzelnen Hahn kämpft auf dem Dorfplatz (FightScene und
// FightEngine aus prototypes/hahnenkampf, beim Bauen übernommen). Alles andere läuft in der Arena des Spiels.
// Ergebnis im Format von AN.outcome, damit Ergebnisbildschirm, Gold, Lernliste und Gefallene wie gewohnt funktionieren.
let village=null;
// Der Moderator stellt beide Hähne vor (Antippen = weiter), dann beginnt der Kampf
function modIntro(v,R0,R1,go){const Md=M.moderator;if(!Md?.roosterSay){go();return;}const cards=[[R0,true],[R1,false]].map(([R,own])=>({R,own,say:Md.roosterSay(R,own)}));cards.push({start:true,say:[Md.beastStart()]});
 const o=document.createElement('div');o.className='hs-modintro';o.innerHTML='<div class="hs-mi-box"><p class="eyebrow">DER MODERATOR</p><canvas width="320" height="170" class="px"></canvas><h3></h3><p class="hs-mi-sub"></p><p class="hs-mi-say"></p><small>Antippen ▸ · <u data-mi="skip">überspringen</u></small></div>';v.appendChild(o);
 const cv=o.querySelector('canvas'),g=cv.getContext('2d');let i=0,s=0,raf=0,t0=performance.now();
 const show=()=>{const c=cards[i];o.querySelector('h3').textContent=c.start?(R0.name+' gegen '+R1.name):c.R.name;o.querySelector('.hs-mi-sub').textContent=c.start?'DER KAMPF BEGINNT':(c.own?'DEIN KAMPFHAHN':'DER GEGNER')+' · '+(c.R.fights||0)+' Kämpfe · '+(c.R.wins||0)+' Siege · '+(c.R.kills||0)+' getötet';o.querySelector('.hs-mi-say').textContent='„'+c.say[s]+'“';};
 const draw=now=>{raf=requestAnimationFrame(draw);const t=(now-t0)/1000,c=cards[i];g.imageSmoothingEnabled=false;try{ART.arena(g,320,170,t,{cheer:1});}catch{g.fillStyle='#8a6d45';g.fillRect(0,0,320,170);}g.fillStyle='rgba(10,6,4,.35)';g.fillRect(0,0,320,170);
  try{if(c.start){ART.rooster(g,R0,{t,mood:'focus',w:320,h:170,size:110,x:95,y:164,face:1});ART.rooster(g,R1,{t,mood:'focus',w:320,h:170,size:110,x:225,y:164,face:-1});}else ART.rooster(g,c.R,{t,mood:(t%3)<1.2?'proud':'focus',w:320,h:170,size:150,x:160,y:166,view:(t%5)<2.2?'front':'side',face:c.own?1:-1});}catch{}};
 const end=()=>{cancelAnimationFrame(raf);o.remove();go();};
 o.addEventListener('click',e=>{e.stopPropagation();if(e.target.closest('[data-mi=skip]')){end();return;}const c=cards[i];if(s<c.say.length-1){s++;show();return;}i++;s=0;if(i>=cards.length){end();return;}show();});
 show();raf=requestAnimationFrame(draw);try{SX.play('crowd',1);}catch{}}
HS.runFight=(spec,c,done)=>{const a=spec.blue[0],b=spec.red[0];if(spec.blue.length!==1||spec.red.length!==1||a.kind!=='rooster'||b.kind!=='rooster'||!CU.FightScene)return false;
 const v=document.createElement('div');v.className='hs-village';
 v.innerHTML=`<div class="hs-vbox" id="arena"><p class="eyebrow">DORFPLATZ · ${esc(c.name)}</p><div class="hud"><div class="fbar L"><div class="nm" id="nmL"></div><div class="hpbar"><i id="hpLi"></i><b id="hpL"></b></div><div class="st" id="stL"></div></div><div class="vs">VS</div><div class="fbar R"><div class="nm" id="nmR"></div><div class="hpbar"><i id="hpRi"></i><b id="hpR"></b></div><div class="st" id="stR"></div></div></div>
 <div class="stage"><canvas id="fightCv" width="320" height="200"></canvas><div class="floaters" id="floaters"></div></div><div class="result" id="result" hidden></div>
 <div class="parts"><div class="L"><div class="plist" id="partsL"></div></div><div class="R"><div class="plist" id="partsR"></div></div></div><ol class="log" id="log"></ol>
 <div class="ctrl"><button class="btn small" data-v="shot">Nahaufnahmen: an</button><button class="btn small" data-v="speed">Tempo 1×</button></div></div>`;
 document.body.appendChild(v);CU.setRoot(v);
 const fs=new CU.FightScene(v.querySelector('#fightCv'));village={v,fs};
 fs.showResult=function(bt){const R0=this.F[0].R,R1=this.F[1].R,won=bt.winner===0,r=v.querySelector('#result');r.hidden=false;
  r.innerHTML=`<div class="rbox"><h2>${esc((won?R0:R1).name)} siegt</h2><p>${bt.reason==='tot'?esc((won?R1:R0).name)+' ist tot ✝':bt.reason==='ko'?'durch K.O.':bt.reason==='flucht'?'der Gegner ist geflohen':'nach Punkten'} · ${this.engine.exchange} Schlagabtausche</p><div class="rb"><button class="btn primary" data-v="done">WEITER ▸</button></div></div>`;
  r.querySelector('[data-v=done]').onclick=()=>finish(bt);};
 fs.backToLab=function(){};
 // Geräusche: Treffer, Fehlschläge, Flügel, Ende, Krähen des Siegers (hs-sfx.js)
 const SX=HS.sfx,baseImpact=fs.impact,baseNext=fs.nextBeat,baseFloat=fs.floater;
 fs.impact=function(bt,idx){const list=bt.type==='aerial'?bt.events:[bt.events?.[idx]];for(const e of list||[]){const ev=e?.ev;if(!ev)continue;if(!ev.hit)SX.play('whoosh');else{SX.play(ev.move==='peck'?'peck':'claw',ev.severity||1);setTimeout(()=>SX.play('squawk'),70);if(ev.crit||ev.severity>=3)SX.play('crit');}}return baseImpact.call(this,bt,idx);};
 fs.nextBeat=function(){const bt=baseNext.call(this);if(bt){if(bt.type==='aerial'||bt.variant==='sprung'||bt.variant==='flatter'||bt.variant==='doppel')SX.play('flap',5);else if(bt.type==='approach'&&Math.random()<.6)SX.play('flap',3);else if(bt.type==='end'){SX.play(bt.reason==='tot'?'death':bt.reason==='ko'?'ko':'crowd',1);}}return bt;};
 fs.floater=function(x,y,text,cls){if(cls==='crow')SX.play('crow');return baseFloat.call(this,x,y,text,cls);};
 const finish=bt=>{SX.stop();fs.endShot();fs.stop();CU.setRoot(null);v.remove();village=null;const eng=fs.engine;
  const unit=(u,i)=>{const R=u.R,parts=Object.entries(R.body).filter(([,p])=>p.grade>=2);return {team:i,key:u.key,name:R.name,kind:'rooster',dead:!!R.dead,cause:R.cause,killer:R.killer,down:!R.dead&&eng.loser===i&&bt.reason==='ko',health:Math.round(CF.health(R)),injuries:parts.map(([k])=>CF.partName(k)),severe:parts.some(([,p])=>p.grade>=3),injured:parts.length>0,loss:R.dead?1:Math.max(0,Math.min(1,1-CF.health(R)/100)),hits:0};};
  done({winner:bt.winner===0?0:1,units:[unit(a,0),unit(b,1)],time:eng.exchange*2.2,timeout:false,village:true});};
 v.addEventListener('click',e=>{const k=e.target.closest('[data-v]')?.dataset.v;if(k==='shot'){fs.closeups=!fs.closeups;if(!fs.closeups){fs.shotQueue=[];fs.endShot();}e.target.textContent='Nahaufnahmen: '+(fs.closeups?'an':'aus');}else if(k==='speed'){fs.speed=fs.speed===1?2:fs.speed===2?4:1;e.target.textContent='Tempo '+fs.speed+'×';}});
 SX.play('ambient',true);setTimeout(()=>SX.play('crowd',1),300);modIntro(v,a.R,b.R,()=>fs.start(a.R,b.R));return true;};
// =====================================================================================================
// NAVIGATION IM TUTORIAL: nur Ludus, Beastrium, Händlerin, Arena und nächster Tag
// =====================================================================================================
// Kapitel läuft: andere Bereiche gesperrt. Nach dem Sieg über den Dorftrottel ('won'/'end') ist alles wieder offen.
const active=()=>!!st().stage&&!['end','won'].includes(st().stage);
const baseClick=M.schoolClick;
M.schoolClick=function(a){const s=st();
 if(a.startsWith('hs:')){const [,k,v]=a.split(':');if(k==='species'){bView.species=v;M.ui.render();setTimeout(mountBeastrium,0);return true;}
  if(k==='animal'){const R=s.roosters.find(x=>x.id===v);if(!R)return true;if(s.stage==='b-pick'){openDetail(R,{anim:true});K.hideGuide();setTimeout(()=>{closeDetail();scene5(R);},2600);return true;}openDetail(R);return true;}return true;}
 // Händlerin immer über ihren eigenen Markt (auch nach dem Kapitel), nie über die alte Arena-Startseite
 if(a==='nav:hmarket'){if(sellerOnMap())openMarket(false);else M.ui.notify?.('Die Hühnerhändlerin ist heute nicht da.');return true;}
 if(active()){
  if(a==='nav:beastrium'){if(!s.beastrium)return true;if(s.stage==='b-open'){setStage('b-pick');K.showGuide(['Hier wohnen deine gefiederten Investitionen. Jeder in seinem eigenen Käfig.'],'Tippe auf einen deiner Hähne, um seine Werte zu öffnen.');}setTimeout(mountBeastrium,0);return false;}
  if(a==='nav:arena'){if(arenaAllowed()){setTimeout(openArena,0);return true;}M.ui.notify?.(smithName()+': „Noch nicht. Erst kümmerst du dich um das, was hier gerade passiert.“');return true;}
  if(a==='nav:home'||a==='rest'&&['free','won'].includes(s.stage))return baseClick?.apply(this,arguments);
  if(a.startsWith('nav:')||a.startsWith('detail:')||a==='rest'||a==='rest3'||a==='ludus:owner'){M.ui.notify?.(smithName()+': „Konzentrier dich auf deine Hähne. Der Rest deines Ludus liegt ohnehin im Krankenhaus.“');return true;}}
 return baseClick?.apply(this,arguments);};
const basePage=M.schoolPage;
M.schoolPage=function(p){if(p==='beastrium'&&st().beastrium){setTimeout(mountBeastrium,0);return beastriumPage();}const html=basePage?.apply(this,arguments);if(p==='home'){setTimeout(syncPlaces,0);}return html;};

// =====================================================================================================
// SZENEN
// =====================================================================================================
const film=()=>M.lesson.film;
const POS={smith:[420,540],lan:[506,546],ladder:[470,520]};
const cast={h:f=>({name:'Hühnerhändlerin',a:f.seller}),f:()=>({name:'Frau aus der Ferne',a:{x:900}}),i:f=>({name:st().idiot?.name||'Der Dorftrottel',a:f.lan})};
function gateFilm(beats,o={}){const sm=K.smithActor(POS.smith[0],POS.smith[1]),ln=K.lanActor(POS.lan[0],POS.lan[1]);ln.a=Math.PI;sm.a=0;K.arm(ln,null);
 const props=[{y:-1e4,fn:(g,f)=>{if(f.scene==='yard')M.ludusOverlay?.(g,f.t);}}];
 const f0={...o,scene:o.scene||'gate',smith:sm,lan:ln,beats,cast,props,bg:f=>f.scene==='inside'?A.interior():f.scene==='yard'?K.yard():A.facade(),cam:o.cam||{x:450,y:500,vw:240},
  tick:(f,dt)=>{for(const a of [f.smith,f.lan]){if(!a.to&&a.path?.length)a.to=a.path.shift();K.walker(a,dt);}o.tick?.(f,dt);}};
 K.play(f0);const f=M.lesson.film;if(o.signProp!==false)f.props.push(signProp(f));return f;}
// Das Schild am Tor (Fassade): hängt, wird gehalten oder liegt noch beim Schmied
function signProp(f){return {scene:'gate',y:400,state:st().sign?'hung':'none',tilt:0,nails:st().sign?4:0,fn(g,f){if(this.state==='none')return;if(this.state==='held'){const a=f.smith;A.gateSign(g,f.t,{x:a.x+(a.a===0?14:-14),y:a.y-34,frame:false,sway:0,tilt:.15});return;}
 A.gateSign(g,f.t,{x:450,y:404,frame:false,sway:this.state==='hung'?Math.sin(f.t*1.3)*.02:0,tilt:this.tilt,nails:this.nails});}};}
const sign=f=>f.props.find(p=>p.fn&&p.state!==undefined);
// Leiter senkrecht an der Mauer rechts neben dem Tor (hinter dem Schmied gezeichnet, damit er sichtbar auf den Sprossen steht)
const LADDER={x:466,w:16,foot:524,top:410};
function ladderProp(){return {scene:'gate',y:-1,fn(g){const L=LADDER;g.fillStyle='rgba(0,0,0,.25)';g.fillRect(L.x-1,L.foot-2,L.w+4,3);for(const dx of [0,L.w-3]){g.fillStyle='#5a3c22';g.fillRect(L.x+dx,L.top,3,L.foot-L.top);g.fillStyle='#8a6a40';g.fillRect(L.x+dx,L.top,1,L.foot-L.top);}for(let y=L.foot-8;y>L.top+2;y-=10){g.fillStyle='#7a5a36';g.fillRect(L.x+2,y,L.w-4,2);g.fillStyle='#a07a4c';g.fillRect(L.x+2,y,L.w-4,1);}}};}
function hammerProp(f){return {scene:'gate',y:470,t:0,on:false,step(dt){if(this.on)this.t+=dt;},fn(g,f){if(!this.on)return;const a=f.smith,u=(this.t%0.6)/0.6,ang=u<.5?-1.4+u*2.6:-.1-(u-.5)*2.6,dir=a.a===0?1:-1,hx=a.x+10*dir,hy=a.y-34;g.save();g.translate(hx,hy);g.scale(dir,1);g.rotate(ang);g.fillStyle='#7a5232';g.fillRect(-1,-14,3,14);g.fillStyle='#515e55';g.fillRect(-4,-17,9,5);g.fillStyle='#b0baaa';g.fillRect(-4,-17,9,1);g.restore();}};}
function sellerProp(x,y,dir){return {scene:'gate',x,y,dir,pose:'pull',phase:0,mouth:'shout',fn(g,f){A.seller(g,{x:this.x,y:this.y,dir:this.dir,pose:this.pose,t:f.t,phase:this.phase,mouth:this.mouth});}};}
function cartProp(seller){return {scene:'gate',y:seller.y-1,roll:0,fn(g,f){const o=offer();A.cart(g,{x:seller.x+(seller.dir<0?52:-52),y:seller.y,t:f.t,roll:this.roll,roosters:o.list,sold:o.sold,face:seller.dir,handle:[seller.x+(seller.dir<0?11:-11),seller.y-24],labels:f.labels});}};}

// 1 · Der Schmied hat eine geniale Idee
function scene1(){setStage('s1');const s=st();s.sign=false;gateFilm([
 {dur:1,cam:{x:445,y:482,vw:240}},
 say('l','Also noch mal: Ich bin pleite. Meine Männer liegen im Krankenhaus. Und nachdem ich diesen verdammten Löwen besiegt habe, hasst mich jetzt offenbar die halbe Stadt!',{do:f=>{K.pose(f.lan,{a:Math.PI,traderPose:'rant'});K.rage(f.lan,1.8);}}),
 say('s','Nur die halbe? Dann hast du ja noch Potenzial.',{do:f=>K.pose(f.smith,{a:0,forgePose:'sip'})}),
 {face:{who:'l',mood:'roar',lines:.8,zoom:1.15,shake:2},...say('l','WAS SOLL ICH JETZT MACHEN?!')},
 {face:{who:'s',mood:'grin',zoom:1.1,push:.3},dur:1.6,...say('cap','Der Schmied grinst.')},
 {face:null,...say('s','Ich hätte da so eine Idee.',{cam:{x:440,y:490,vw:210}})},
 say('l','Wenn dabei wieder jemand ins Krankenhaus muss, kannst du dich diesmal selbst auf den Behandlungstisch legen.',{do:f=>K.pose(f.lan,{a:Math.PI,traderPose:'point',gest:0})}),
 say('s','Keine Sorge. Ich denke, wir haben endlich etwas gefunden, das deinem geistigen Entwicklungsstand entspricht.',{do:f=>K.pose(f.smith,{a:0,traderPose:'inspect',gest:0})}),
 {dur:1.4,...say('cap','Der Schmied holt ein großes Holzschild hervor.'),do:f=>{K.pose(f.smith,{a:0});sign(f).state='held';M.sound?.('block');}},
 {face:{paint:paintSignClose},dur:2.6,...say('cap','Ein wütender Hahn. Sehr wütend.')},
 {face:null,...say('l','Was zum Teufel ist das?',{do:f=>{K.pose(f.lan,{a:Math.PI});f.lan.facePain=.6;}})},
 {face:{who:'s',mood:'confident',zoom:1.08},...say('s','Deine berufliche Zukunft.')},
 {face:null,dur:2.4,cam:{x:465,y:452,vw:220,rate:1.2},do:f=>{f.props.push(ladderProp());f.smith.path=[[LADDER.x+LADDER.w/2,LADDER.foot,34,Math.PI],[LADDER.x+LADDER.w/2,452,18,Math.PI]];},until:f=>!f.smith.to&&!f.smith.path?.length,...say('cap','Der Schmied steigt mit dem Schild die Leiter hinauf.')},
 {dur:1.2,do:f=>{const p=sign(f);p.state='place';p.tilt=.22;f.props.push(Object.assign(hammerProp(f),{on:false}));}},
 {dur:2.6,do:f=>{const h=f.props.find(p=>p.on===false);h.on=true;f.hammer=h;},each:(f,dt,t)=>{const k=Math.floor(t/.6);if(k!==f._nail&&t>.3){f._nail=k;const p=sign(f);p.nails=Math.min(2,(p.nails||0)+1);M.sound?.('block');f.shake=1.2;K.float(f,null,'TOCK!','#f4d37a',0,470+Math.random()*16,392);for(let i=0;i<5;i++)f.fx.push({x:468,y:410,z:0,vx:(Math.random()-.5)*40,vy:(Math.random()-.5)*6,vz:10+Math.random()*16,life:.5,size:1,color:'#c9a06a'});}},...say('s','Sag mal … kennst du dich eigentlich mit Geflügel aus?')},
 {face:{who:'l',mood:'roar',lines:.9,zoom:1.18,shake:2},...say('l','WILLST DU MICH VERARSCHEN?!'),do:f=>{if(f.hammer)f.hammer.on=false;}},
 {face:null,dur:1.4,cam:{x:450,y:430,vw:150},do:f=>{if(f.hammer)f.hammer.on=true;},each:(f,dt,t)=>{const p=sign(f);p.tilt=Math.max(0,.22-t*.3);if(t>.6&&!f._last){f._last=1;p.nails=4;M.sound?.('block');K.float(f,null,'TOCK!','#f4d37a',0,436,392);}if(t>1.2&&f.hammer)f.hammer.on=false;}},
 {dur:.8,do:f=>{st().sign=true;sign(f).state='hung';sign(f).tilt=0;}},
 {face:{paint:paintSignHung},dur:2.4,...say('cap',()=>'Über dem Tor: '+String(S.schoolName||'Ludus').toUpperCase()+' – und darunter ein sehr wütender Hahn.')},
 {face:null,cam:{x:450,y:470,vw:260},do:f=>{f.smith.path=[[LADDER.x+LADDER.w/2,LADDER.foot,20,Math.PI],[POS.smith[0],POS.smith[1],34,0]];},...say('s','Ausnahmsweise nicht. Dafür ist die Situation viel zu ernst.')},
 {dur:.6}
],{label:'1 · Eine geniale Idee',done:scene2});}
function paintSignClose(g,w,h,f,t){g.fillStyle='#3a2e22';g.fillRect(0,0,w,h);g.imageSmoothingEnabled=false;const art=A.sign(),k=Math.min(w/200,h/140)*(1+Math.min(.12,t*.04)),sw=Math.sin(t*1.8)*.02;g.save();g.translate(w/2,h/2+Math.sin(t*2)*3);g.rotate(sw);g.drawImage(art,-90*k,-60*k,180*k,120*k);g.restore();
 g.fillStyle='rgba(255,240,200,'+(.12+.08*Math.sin(t*3))+')';g.fillRect(0,0,w,h);// Hände des Schmieds am Rand
 g.fillStyle='#c79a6e';g.fillRect(w/2-90*k-14,h/2-10,22,30);g.fillRect(w/2+90*k-8,h/2-10,22,30);}
function paintSignHung(g,w,h,f,t){const k=3.6,cx=450,cy=392;g.fillStyle='#000';g.fillRect(0,0,w,h);g.save();g.imageSmoothingEnabled=false;g.translate(w/2,h/2);g.scale(k*(1+Math.min(.06,t*.02)),k*(1+Math.min(.06,t*.02)));g.translate(-cx,-cy);g.drawImage(A.facade(),0,0);A.gateSign(g,f.t,{x:450,y:404,frame:false,nails:4,sway:0});g.restore();}

// 2 · Warum Hühner?
function scene2(){setStage('s2');st().sign=true;gateFilm([
 {dur:.8,cam:{x:450,y:482,vw:240},do:f=>{K.pose(f.lan,{a:0});f.lan.a=0;}},
 {face:{who:'l',mood:'roar',lines:.8,zoom:1.12,shake:1},...say('l','Ich war einst einer der gefürchtetsten Krieger des Reiches! Ich habe über tausend Männer auf dem Gewissen! UND JETZT SOLL ICH HÜHNER ZÜCHTEN?!')},
 {face:null,...say('s','Nein, du sollst sie gegeneinander kämpfen lassen. Züchten würde voraussetzen, dass du verstehst, wie Fortpflanzung funktioniert.',{do:f=>K.pose(f.smith,{a:0,forgePose:'sip'})})},
 say('l','DU VERDAMMTER …',{do:f=>{K.pose(f.lan,{a:Math.PI,traderPose:'rant'});K.rage(f.lan,1.6);}}),
 say('s','Jeder muss mal klein anfangen.',{do:f=>K.pose(f.smith,{a:0,traderPose:'inspect',gest:0})}),
 {dur:1.1,...say('cap','Der Schmied verschränkt die Arme.'),do:f=>K.pose(f.smith,{a:0})},
 say('s','ARENA THEORY ist eine hochkomplexe Arenasimulation. Und du hast in deinem Leben offenbar so oft auf die Rübe bekommen, dass wir erst einmal mit etwas Einfacherem anfangen müssen, bevor wir dich wieder auf Menschen loslassen.'),
 say('l','ICH WEISS, WIE MAN MIT MENSCHEN UMGEHT!',{do:f=>{K.pose(f.lan,{a:Math.PI,traderPose:'point',gest:0});K.rage(f.lan);}}),
 say('s','Natürlich. Deswegen liegen deine fünf Angestellten im Krankenhaus, und der einzige Mensch, der noch freiwillig mit dir spricht, bin ich.',{do:f=>K.pose(f.smith,{a:0,forgePose:'sip'})}),
 {dur:1.2,cap:1},
 say('s','Und du bezahlst mich dafür.'),
 {face:{who:'l',mood:'nervous',zoom:1.05},dur:1.6,...say('cap','Der Lanister überlegt.')},
 {face:null,...say('l','… Da hast du ausnahmsweise recht.',{do:f=>K.pose(f.lan,{a:Math.PI})})},
 say('s','Ich weiß. Das macht unsere Zusammenarbeit so anstrengend.'),
 say('s','Wir fangen mit Hahnenkämpfen an. Wenige Eigenschaften, kleine Gruppen, überschaubare Verluste.',{cam:{x:448,y:470,vw:230},do:f=>K.pose(f.smith,{a:0,traderPose:'point',gest:0})}),
 say('l','Und was ist, wenn die Hühner sterben?',{do:f=>K.pose(f.lan,{a:Math.PI})}),
 {face:{who:'s',mood:'grin',zoom:1.08},...say('s','Dann gibt’s wenigstens Abendessen.')},
 {face:null,dur:.4}
],{label:'2 · Warum Hühner?',done:scene3});}

// 3 · Die verrückte Hühnerhändlerin
function scene3(){setStage('s3');st().sign=true;offer();gateFilm([
 {dur:.6,cam:{x:450,y:510,vw:240}},
 {dur:2.2,do:f=>{f.shake=.6;M.sound?.('crowd');for(let i=0;i<5;i++)K.float(f,null,['GOCK!','GACK GACK!','KIKERIKI!','*rumpel*','*quietsch*'][i],i%2?'#f4d37a':'#eee2c1',0,560+Math.random()*30,440+i*12);},...say('f','FRISCHE HÄHNE! STOLZE KÄMPFER! FEDERN, KRALLEN UND GELEGENTLICH EIN FUNKTIONSFÄHIGES GEHIRN!')},
 {dur:3.6,cam:{x:520,y:520,vw:280,rate:1},do:f=>{const s=sellerProp(980,566,-1);f.seller=s;f.props.push(s,cartProp(s));K.pose(f.lan,{a:0});f.lan.a=0;K.pose(f.smith,{a:0});},each:(f,dt)=>{const s=f.seller;if(s.x>560){s.x-=52*dt;s.phase+=dt*9;s.pose='pull';f.props.find(p=>p.roll!==undefined).roll-=dt*7;}else{s.pose='flail';s.mouth='shout';}},until:f=>f.seller.x<=560,...say('cap','Ein klappriger Holzkarren mit drei Käfigen rumpelt heran. Davor: eine Frau, die eindeutig mehr Federn trägt als nötig.')},
 {face:{paint:(g,w,h,f,t)=>A.sellerFace(g,w,h,t,{mood:'grin',lines:1})},...say('h','NA, IHR ZWEI HÜBSCHEN! WER VON EUCH WILL HEUTE EINEN PRACHTVOLLEN KAMPFHAHN?!')},
 {face:null,cam:{x:520,y:512,vw:250},do:f=>{f.seller.pose='hips';f.seller.mouth='grin';},...say('l','Was ist denn das für eine Irre?',{do:f=>{K.pose(f.lan,{a:Math.PI,traderPose:'point',gest:0});}})},
 say('s','Unsere neue Geschäftspartnerin.',{do:f=>K.pose(f.smith,{a:0,forgePose:'sip'})}),
 {face:{paint:(g,w,h,f,t)=>A.sellerFace(g,w,h,t,{mood:'confident',lines:1,shake:1})},...say('h','ICH HAB DICH GEHÖRT, DU EINARMIGER PFOSTEN! MEINE HÄHNE HABEN MEHR VERSTAND ALS DU!')},
 {face:null,...say('s','Siehst du? Ihr werdet euch hervorragend verstehen.')},
 {cam:{x:585,y:530,vw:170},do:f=>{f.seller.pose='knock';f.seller.mouth='shout';f.labels=true;M.sound?.('block');},...say('h','DREI FRISCHE KAMPFHAHN-ANWÄRTER! DIREKT VOM HOF! DER EINE HAT GESTERN EINEN FUCHS VERJAGT!')},
 say('l','Wirklich?',{cam:{x:520,y:512,vw:250},do:f=>{f.seller.pose='hips';K.pose(f.lan,{a:0});}}),
 {face:{paint:(g,w,h,f,t)=>A.sellerFace(g,w,h,t,{mood:'grin'})},...say('h','NEIN! ABER ER HAT EINEN SEHR KLEINEN IGEL BÖSE ANGEGUCKT!')},
 {face:null,cam:{x:520,y:512,vw:250},...say('s','Kauf drei Stück. Die kosten fast nichts. Und falls du sie ruinierst, müssen wir wenigstens keine neuen Betten bauen.',{do:f=>K.pose(f.smith,{a:0,traderPose:'point',gest:0})})},
 {dur:.3}
],{label:'3 · Die Hühnerhändlerin',done:buyStep});}
function buyStep(){setStage('buy');const o=offer();o.first=true;try{M.ui.click('nav:home');}catch{}openMarket(true);K.showGuide(['Heute zum Einführungspreis: ein Gold pro Hahn. Mehr hast du ohnehin nicht.'],'Kaufe alle drei Hähne: Tippe auf die Käfige.');}

// 4 · Das Beastrium
function scene4(){setStage('s4');K.hideGuide();gateFilm([
 {dur:.6,cam:{x:500,y:520,vw:240},do:f=>{const s=sellerProp(560,566,-1);s.pose='hips';s.mouth='grin';f.seller=s;f.props.push(s,cartProp(s));}},
 say('s','Ausgezeichnet. Drei neue Kämpfer. Zusammen kosten sie weniger als die Salbe für einen deiner bisherigen Idioten.',{do:f=>K.pose(f.smith,{a:0,forgePose:'sip'})}),
 say('l','Und wo soll ich die Viecher jetzt unterbringen?',{do:f=>K.pose(f.lan,{a:Math.PI,traderPose:'rant'})}),
 say('s','Im Beastrium.'),
 {face:{who:'l',mood:'dumb',zoom:1.05},...say('l','Im was?')},
 {face:null,...say('s','Im Beastrium. Das ist das Gebäude, in dem wir unsere Tiere unterbringen.',{do:f=>K.pose(f.smith,{a:0,traderPose:'point',gest:0})})},
 say('l','Warum sagst du dann nicht einfach Stall?',{do:f=>K.pose(f.lan,{a:Math.PI})}),
 {face:{who:'s',mood:'confident',zoom:1.08},...say('s','Weil niemand Eintritt bezahlt, um drei Hühner aus einem Stall kämpfen zu sehen.')},
 {face:null,scene:'yard',dur:1.4,cam:{x:640,y:420,vw:420,rate:5},do:f=>{HS.rise=0;st().beastrium=true;f.smith.hidden=f.lan.hidden=true;},...say('cap','Hinter dem Trainingshof, neben der Schmiede …')},
 {dur:3.2,cam:{x:750,y:360,vw:260,rate:1.2},each:(f,dt,t)=>{HS.rise=Math.min(1,t/2.4);if(Math.floor(t*3)!==Math.floor((t-dt)*3)&&t<2.4){M.sound?.('block');f.shake=.8;K.float(f,null,['TOCK!','RUMMS!','*fluch*'][Math.floor(t*3)%3],'#f4d37a',0,700+Math.random()*100,330);}},...say('cap','Ein paar Hammerschläge und sehr viele Flüche später …')},
 {dur:2.2,cam:{x:750,y:362,vw:230},do:f=>{HS.rise=1;M.sound?.('roar');},...say('cap','DAS BEASTRIUM. Käfige und Gehege für Hahn, Hund, Bär, Löwe und Tiger.')},
 {dur:.4}
],{label:'4 · Das Beastrium',done:()=>{HS.rise=1;st().beastrium=true;setStage('b-open');syncPlaces();try{M.ui.click('nav:home');}catch{}K.showGuide(['Bring deine drei Hähne ins Beastrium. Und sieh sie dir genau an. Das hast du bei deinen Gladiatoren schließlich auch nie gemacht.'],'Öffne das BEASTRIUM (auf der Karte rechts, neben dem Truppenplatz).');}});}

// 5 · Die Werte der Hähne (im Beastrium)
let demo=null;
function insideFilm(beats,o={}){const f=gateFilm(beats,{...o,scene:'inside',signProp:false,cam:o.cam||{x:480,y:400,vw:300}});f.smith.x=420;f.smith.y=470;f.lan.x=478;f.lan.y=476;f.lan.a=Math.PI;
 const rs=[...alive()].sort((a,b)=>kw(b)-kw(a));f.props.push({scene:'inside',y:395,fn(g,f){A.CAGE_SPOTS.forEach(([x,y],i)=>{const R=i>=1&&i<=3?rs[i-1]:null;A.drawCage(g,x,y,R,f.t+i,{label:R?R.name:i===0?'frei':'frei',mood:R&&!CF.fitForFight(R)?'fear':Math.sin(f.t*.5+i)>.6?'proud':'idle',face:-1});});}});return f;}
function demoPaint(g,w,h,f){const d=demo;if(!d)return;g.fillStyle='#000';g.fillRect(0,0,w,h);g.imageSmoothingEnabled=false;const k=Math.min(w/320,h/200);g.drawImage(d.cv,(w-320*k)/2,(h-200*k)/2,320*k,200*k);if(d.bubble){g.font='bold 22px "Courier Prime",monospace';g.textAlign='center';g.fillStyle='#000';g.fillText(d.bubble,w/2+2,58);g.fillStyle='#f4d37a';g.fillText(d.bubble,w/2,56);}}
function playDemo(R){stopDemo();const cv=document.createElement('canvas');cv.width=320;cv.height=200;demo={cv,scene:new CU.CloseupScene(cv),bubble:null};CU.setBubble(t=>{if(demo)demo.bubble=t;});demo.scene.play(R,()=>{});}
function stopDemo(){if(!demo)return;demo.scene.stop();CU.setBubble(null);demo=null;}
const sampleOf=(()=>{const c={};return tier=>c[tier]??=CF.createRooster({seed:4242+tier*97,minQuality:tier,maxQuality:tier});})();
function oddsCard(hl){return `<div class="medic-card hs-card"><h4>QUALITÄTSKLASSEN · ECHTE WAHRSCHEINLICHKEITEN</h4><ul class="hs-odds">${CLASSES.map(c=>`<li class="${hl===c.k?'on':''}"><b>${esc(c.name)}</b><span>${pctTxt(classP(c))}</span><i style="width:${Math.max(1.5,classP(c)*100*2.2)}%"></i></li>`).join('')}</ul><small>aus ${ODDS.samples.toLocaleString('de-DE')} Hähnen des Generators (Bernoulli: IST 64 Würfe, Talent 32, SOLL 32 je Wert)</small></div>`;}
function histo(arr,from,to,col){const vals=arr.slice(from,to+1),max=Math.max(...vals);return `<div class="hs-histo" style="--c:${col}">${vals.map(v=>`<i style="height:${Math.max(1,v/max*100)}%"></i>`).join('')}</div><div class="hs-hax"><span>${from}</span><span>${Math.round((from+to)/2)}</span><span>${to}</span></div>`;}
function distCard(){return `<div class="medic-card hs-card"><h4>SO SIND DIE WERTE VERTEILT</h4><div class="hs-two"><div><p>IST beim Kauf · Ø ${f1(ODDS.istMean)}</p>${histo(ODDS.ist,5,40,'#88baa6')}</div><div><p>SOLL · Ø ${f1(ODDS.sollMean)}</p>${histo(ODDS.soll,20,85,'#dfb66d')}</div></div><small>Nicht gleichmäßig: Werte nahe der Mitte kommen viel häufiger vor als Ausreißer.</small></div>`;}
function perfectCard(){const e=Math.round(-ODDS.perfectLog10);return `<div class="medic-card hs-card hs-perfect"><h4>EIN PERFEKTER HAHN</h4><p>alle acht SOLL-Werte 100</p><b>1 zu 10<sup>${e}</sup></b><small>In Prozent: eine Null, ein Komma und dann ${e-3} weitere Nullen – exakt aus den Bernoulli-Würfen berechnet. Schon ein einziger SOLL-Wert von 100 kommt nur bei etwa 1 von ${Math.round(1/ODDS.oneSoll100).toLocaleString('de-DE')} Werten vor.</small></div>`;}
function statsCard(R,keys){return `<div class="medic-card hs-card"><h4>${esc(R.name)} · ${esc(R.quality.title)}</h4>${M.buyOdds?.mini('rooster',R)||''}${statTable(R)}${keys?'':`<small>${STATS.map(s=>s[1]+': '+s[2]).join(' · ')}</small>`}</div>`;}
function scene5(R){setStage('s5');R=R||alive()[0];HS.pickedR=R?.id;const dem=CLASSES.map(c=>sampleOf(c.tiers[c.k===1?2:c.k===5?0:0]));
 insideFilm([
 {dur:.8},
 {face:{paint:demoPaint},do:()=>playDemo(R),dur:2.6,...say('cap',()=>R.name+' – vergrößert, mit allen Werten.')},
 {face:null,card:()=>statsCard(R,true),...say('s','So. Jetzt schauen wir uns an, was deine neuen Kampfmaschinen eigentlich können.',{do:f=>{stopDemo();K.pose(f.smith,{a:0,traderPose:'point',gest:0});}})},
 say('l','Die sehen aus, als würden sie gegen einen Eimer verlieren.',{do:f=>K.pose(f.lan,{a:Math.PI,traderPose:'inspect',gest:0})}),
 say('s','Das hängt vom Eimer ab.',{do:f=>K.pose(f.smith,{a:0,forgePose:'sip'})}),
 say('s','Gladiatoren haben jede Menge Eigenschaften. Stärke, Ausdauer, Geschwindigkeit, Kampftechnik und so weiter.',{card:null}),
 say('s','Bei Hühnern ist das etwas einfacher. Ich wollte dein Gehirn nicht gleich wieder überfordern.',{card:()=>statsCard(R),hold:true}),
 say('s','Jede Eigenschaft besitzt zwei Werte. Den Istwert und den Sollwert.',{card:()=>statsCard(R,true)}),
 say('l','Zwei Zahlen für einen Hahn?',{do:f=>K.pose(f.lan,{a:Math.PI,traderPose:'rant'})}),
 say('s','Ja. Wir machen heute große Fortschritte.',{do:f=>K.pose(f.smith,{a:0,forgePose:'sip'})}),
 say('s','Der Istwert zeigt, was der Hahn im Moment tatsächlich kann.',{card:()=>statsCard(R,true).replace('hs-stats','hs-stats hl-ist')}),
 say('s','Der Sollwert zeigt, was aus ihm werden könnte, wenn du ihn lange genug trainierst und er nicht vorher als Sonntagsbraten endet.',{card:()=>statsCard(R,true).replace('hs-stats','hs-stats hl-soll')}),
 say('s','Die meisten Hähne sind mittelmäßige Versager. Einige sind etwas besser. Und ganz wenige besitzen tatsächlich außergewöhnliches Potenzial.',{card:distCard,hold:true}),
 ...CLASSES.map((c,i)=>({face:{paint:demoPaint},card:oddsCard(c.k),dur:3.4,do:()=>playDemo(dem[i]),...say('cap',`${c.k} · ${c.name}: ${c.txt} – ${pctTxt(classP(c))} aller Hähne.`)})),
 {face:null,card:oddsCard(0),do:()=>stopDemo(),...say('s','Die Klasse siehst du am Auftritt: Je seltener der Hahn, desto größer das Theater.')},
 say('l','Also kann ich auch einen perfekten Hahn bekommen?',{do:f=>K.pose(f.lan,{a:Math.PI,traderPose:'point',gest:0})}),
 say('s','Theoretisch ja.',{card:perfectCard}),
 say('l','Na also!',{do:f=>{K.pose(f.lan,{a:Math.PI,state:'celebrate'});}}),
 {face:{who:'s',mood:'calm',zoom:1.05},...say('s','Theoretisch kann dir auch ein Goldklumpen aus dem Arsch fallen. Ich würde trotzdem nicht darauf warten.')},
 {face:null,card:()=>`<div class="medic-card hs-card"><h4>DEINE DREI</h4><ul class="hs-mine">${alive().map(x=>`<li><b>${esc(x.name)}</b><span style="color:${x.quality.color}">${esc(classOf(x).name)}</span><small>${pctTxt(classP(classOf(x)))}</small></li>`).join('')}</ul></div>`,...say('l','Und warum habe ich dann drei solche Krüppel gekauft?',{do:f=>K.pose(f.lan,{a:Math.PI,traderPose:'rant'})})},
 say('s','Weil du pleite bist. Wir arbeiten hier nicht mit Wünschen, sondern mit deinem Kontostand.',{do:f=>K.pose(f.smith,{a:0,traderPose:'coins',gest:0})}),
 {card:null,dur:.3}
],{label:'5 · Die Werte der Hähne',done:scene6});}

// 6 · Der erste Hahnenkampf
function scene6(){setStage('s6');stopDemo();insideFilm([
 {dur:.5},
 say('s','Genug Theorie. Jetzt schauen wir mal, ob deine gefiederten Investitionen wenigstens einen ordentlichen Kampf zustande bringen.',{do:f=>K.pose(f.smith,{a:0,traderPose:'point',gest:0})}),
 {face:{who:'l',mood:'grin',zoom:1.08},...say('l','Endlich!')},
 {face:null,...say('s','Freu dich nicht zu früh. Das haben deine Gladiatoren auch gesagt.',{do:f=>K.pose(f.smith,{a:0,forgePose:'sip'})})},
 {dur:.3}
],{label:'6 · Der erste Hahnenkampf',done:()=>{setStage('fight1');syncPlaces();for(const R of alive())if(!CF.fitForFight(R))CF.Healing.fullHeal(R);try{M.ui.click('nav:home');}catch{}
  K.showGuide(['Arena. BEAST. HAHN. Und dann eine LEICHTE Herausforderung. Zum ersten Mal eine Entscheidung, die selbst du nicht verbocken kannst.'],'Öffne die ARENA (Arena-Tor oben) → BEAST → HAHN → nimm die LEICHTE Herausforderung.');}});}

// 7 · Lernen durch Kämpfe
function learnFactor(v,cap){return .08+.92*Math.pow(Math.max(0,(cap-v)/Math.max(1,cap)),.65);}// wie CF.learnValue
function scene7(){setStage('s7');const F=st().first||{gains:[]},best=F.gains.flatMap(g=>g.list.map(x=>({...x,name:g.name,id:g.id}))).filter(x=>x.key in Object.fromEntries(STATS)).sort((a,b)=>(Math.floor(b.to)-Math.floor(b.from))-(Math.floor(a.to)-Math.floor(a.from))||(b.to-b.from)-(a.to-a.from))[0];
 const R=best?st().roosters.find(x=>x.id===best.id):alive()[0];const a=learnFactor(15,70),b=learnFactor(65,70);
 const gainCard=best?`<div class="medic-card hs-card hs-gain"><h4>${esc(best.name)} · NACH DEM KAMPF</h4><p class="hs-big">${esc(best.label)}: <b>${f1(best.from)} → ${f1(best.to)}</b></p><small>SOLL ${Math.round(best.cap)} · Abstand vorher ${f1(best.cap-best.from)}</small>${F.gains.filter(g=>g.list.length).length>1||best?`<ul class="hs-mine">${F.gains.map(g=>`<li><b>${esc(g.name)}</b><span>${g.list.length?g.list.slice(0,3).map(x=>esc(x.label)+' +'+f1(x.to-x.from)).join(' · '):'nichts Messbares'}</span></li>`).join('')}</ul>`:''}</div>`:'';
 const gapCard=`<div class="medic-card hs-card"><h4>JE GRÖSSER DER ABSTAND, DESTO SCHNELLER</h4><ul class="hs-gap"><li><b>IST 15 · SOLL 70</b><i style="width:${a*100}%"></i><span>${Math.round(a*100)} %</span></li><li><b>IST 65 · SOLL 70</b><i style="width:${b*100}%"></i><span>${Math.round(b*100)} %</span></li></ul><small>Lerntempo je Aktion im Kampf (Formel des Spiels). Der erste Hahn lernt gut ${f1(a/b)}-mal so schnell.</small></div>`;
 insideFilm([
 {dur:.5},
 say('s','Na sieh einer an. Sie können tatsächlich kämpfen.',{do:f=>K.pose(f.smith,{a:0,forgePose:'sip'})}),
 say('l','Natürlich können sie das! Ich habe sie schließlich ausgesucht!',{do:f=>{K.pose(f.lan,{a:Math.PI,state:'celebrate'});}}),
 say('s','Du hast auf drei Käfige geklickt. Beruhige dich.'),
 ...(R?[{face:{paint:demoPaint},do:()=>playDemo(R),dur:2.2,...say('cap','Der Schmied öffnet die Werte eines überlebenden Hahns.')}]:[]),
 {face:null,do:()=>stopDemo(),card:()=>R?statsCard(R,true).replace('<table class="hs-stats"','<table class="hs-stats hl-ist"'):'',...say('s','Jetzt kommt etwas Wichtiges. Deine Kämpfer lernen durch Erfahrung.')},
 say('s','Nach jedem Kampf können sich ihre Eigenschaften verbessern.',{card:gainCard||null}),
 ...(best?[say('s',`Schau: ${best.label} von ${f1(best.from)} auf ${f1(best.to)}. Nicht viel. Aber mehr, als du in deinem ganzen Leben dazugelernt hast.`,{card:gainCard})]:
  [say('s','Dieses Mal ist bei keinem etwas Messbares hängen geblieben. Nicht jeder Kampf bringt sofort eine Verbesserung. Manchmal lernt man nur, wie sich Sand im Schnabel anfühlt.',{card:null})]),
 say('l','Also werden die Hühner stärker?',{do:f=>K.pose(f.lan,{a:Math.PI})}),
 say('s','Wenn sie überleben, ja. Ich gebe zu, das schränkt die Sache gelegentlich ein.'),
 say('s','Wer weit unter seinem SOLL liegt, lernt schnell. Wer kurz davor ist, kaum noch.',{card:gapCard,hold:true}),
 say('l','Das heißt, je öfter ich sie kämpfen lasse, desto besser werden sie?',{card:null}),
 say('s','Im Idealfall.'),
 say('l','Und im schlechtesten Fall?'),
 {face:{who:'s',mood:'grin',zoom:1.08},...say('s','Lernen sie, wie der Tod aussieht. Allerdings nur sehr kurz.')},
 {face:null,dur:.3}
],{label:'7 · Lernen durch Kämpfe',done:scene8});}

// 8 · Drei Hähne gegen einen Idioten
function scene8(){setStage('s8');stopDemo();if(!st().idiot)makeIdiot();const I=st().idiot,g=idiotG();const own=alive().filter(R=>CF.fitForFight(R)).sort((a,b)=>kw(b)-kw(a)).slice(0,3).map(R=>({kind:'rooster',R,key:R.id}));const p=own.length?CH.pWin(own,[{kind:'human',g,key:'i'}]):0;
 const card=`<div class="medic-card hs-card hs-chall"><h4>BESONDERE HERAUSFORDERUNG</h4><p class="hs-big">DREI HÄHNE GEGEN EINEN IDIOTEN</p><div class="hs-vs"><span>Deine Hähne<b>KW ${CH.teamKW(own)}</b></span><i>VS</i><span>${esc(I.name)}<b>KW ${I.kw}</b></span></div><small>Dolch · keine Rüstung · billige Kleider · Siegchance laut Schätzung ${Math.round(p*100)} %</small></div>`;
 insideFilm([
 {dur:.4},
 say('s','Gut. Jetzt haben wir die Grundlagen geklärt.',{do:f=>K.pose(f.smith,{a:0})}),
 say('l','Dann kann ich endlich wieder richtige Gladiatoren kämpfen lassen?',{do:f=>K.pose(f.lan,{a:Math.PI,traderPose:'rant'})}),
 say('s','Nein.'),
 {face:{who:'l',mood:'roar',lines:.8,zoom:1.15,shake:2},...say('l','WARUM NICHT?!')},
 {face:null,...say('s','Weil deine Gladiatoren derzeit ungefähr so kampffähig sind wie fünf Säcke Kartoffeln. Nur teurer.',{do:f=>K.pose(f.smith,{a:0,forgePose:'sip'})})},
 {dur:1.6,card,...say('cap','Der Schmied öffnet die Arena-Herausforderungen. Eine besondere Herausforderung leuchtet auf.')},
 say('l','Drei Hühner gegen einen Mann? Das ist doch lächerlich!',{card,do:f=>K.pose(f.lan,{a:Math.PI,traderPose:'point',gest:0})}),
 say('s','Der Mann heißt übrigens nicht umsonst der Dorftrottel.',{card}),
 say('l','Dann wird das ja einfach!',{card:null,do:f=>K.pose(f.lan,{a:Math.PI,state:'celebrate'})}),
 say('s','Für ihn vielleicht.'),
 {face:{who:'l',mood:'shock',zoom:1.1},...say('l','WAS?!')},
 {face:null,...say('s','Deine Hähne sind noch nicht trainiert. Und selbst ein Idiot mit einem Dolch ist gefährlicher als drei untrainierte Frühstückslieferanten.',{do:f=>K.pose(f.smith,{a:0,traderPose:'point',gest:0})})},
 say('l','Und was soll ich jetzt machen?',{do:f=>K.pose(f.lan,{a:Math.PI})}),
 say('s','Trainieren. Kämpfen. Überleben. Lernen.'),
 {dur:1.3,cap:1},
 {face:{who:'s',mood:'grin',zoom:1.1},...say('s','Bei dir persönlich habe ich die Hoffnung auf den letzten Punkt allerdings längst aufgegeben.')},
 {face:null,dur:.3}
],{label:'8 · Drei Hähne gegen einen Idioten',done:freeMode});}

// 9 · Freies Training
function freeMode(){setStage('free');stopDemo();syncPlaces();try{M.ui.click('nav:home');}catch{}taskbar();}
function taskbar(){const s=st();K.showGuide([],s.stage==='won'?'Der Dorftrottel ist besiegt. Fortsetzung folgt. Du kannst weiter Hähne trainieren.':`Ziel: DREI HÄHNE GEGEN EINEN IDIOTEN (Arena → BEAST → HAHN). Trainiere vorher in leichten Hahnenkämpfen, prüfe die Werte im Beastrium. Neue Hähne bringt die Händlerin jeden Tag.`);mini();}
// Im freien Training nur ein kleines Ziel-Schild (verdeckt weder Händler noch Herumtreiber); Antippen klappt es auf
function mini(){const box=K.guide?.box;if(!box)return;box.classList.add('hs-mini');if(!box.dataset.mini){box.dataset.mini='1';box.addEventListener('click',()=>{box.classList.toggle('open');});}}
function victoryEnd(){const v=document.createElement('div');v.className='medic-end lesson-end hs-end';const I=st().idiot;
 v.innerHTML=`<div><p class="eyebrow">TUTORIALZIEL ERREICHT</p><h2>DREI HÄHNE GEGEN EINEN IDIOTEN</h2><p>${esc(I?.name||'Der Dorftrottel')} liegt im Sand. Nach ${I?.tries||1} ${I?.tries===1?'Versuch':'Versuchen'}, mit echtem Kampf und echtem Training.</p><ul><li>Hähne lernen im Kampf – am schnellsten, solange IST weit unter SOLL liegt.</li><li>Die Klasse zeigt der Auftritt, die Werte das Beastrium.</li><li>Nachschub kommt jeden Tag mit der Hühnerhändlerin.</li></ul><p><b>Deine Gladiatoren, die Kaserne, der Markt und die ganze Arena stehen dir wieder offen.</b> Das Beastrium und die Hühnerhändlerin bleiben.</p><p class="tiny">Fortsetzung folgt.</p><div class="buttons"><button class="btn primary" type="button" data-hs="endfree">ZURÜCK ZUM LUDUS</button>${TEST?'<button class="btn" type="button" data-les="menu">SZENE WÄHLEN</button>':''}</div></div>`;document.body.appendChild(v);}
// Vorstellung des Dorftrottels durch den Moderator (Arenabühne des Kapitels 1, echte Figur)
function idiotShow(c,done){const g=c.enemy[0].g,I=st().idiot,rs=[...alive()].filter(R=>CF.fitForFight(R)).sort((a,b)=>kw(b)-kw(a)).slice(0,3);
 const idiot={id:'hs-idiot',g,team:1,ax:430,ay:392,a:Math.PI,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,noNav:true,bloodMarks:{}};
 const mod=K.extraActor('hs-mod',{name:'Arenamoderator',appearance:{skin:'#d9b08a',hair:'#d8d4c8',style:3,beard:3,cloth:'#e6dccb'}});mod.sx=330;
 const hens={scene:'arena',y:395,fn(g,f){rs.forEach((R,i)=>{const sp=A.roosterSprite(R,f.t+i,f.henMood||'focus',1,90,80,48);g.drawImage(sp,150+i*52-45,400-78);});}};
 const wob=(f,dt)=>{const a=f.lan;a.stagger=Math.max(a.stagger||0,.2);a.phase+=dt*2;};
 K.play({scene:'arena',lan:idiot,mod,smith:K.smithActor(0,0),cast,props:[hens],cam:{vw:300},label:'Vorstellung',beats:[
  {dur:1,do:f=>{f.cheer=1;M.sound?.('crowd');}},
  say('m','MEINE DAMEN UND HERREN!',{cam:{vw:300}}),
  say('m','EIN MANN, DER BISHER JEDE SCHLÄGEREI VERLOREN HAT!',{do:f=>{f.cam.ax=430;f.cam.ay=330;},cam:{vw:220,rate:.8}}),
  {face:{actor:idiot,mood:'dumb',zoom:1.05,team:1},...say('m','EIN KRIEGER, DESSEN MUT NUR VON SEINER DUMMHEIT ÜBERTROFFEN WIRD!')},
  {face:null,dur:1.6,do:f=>{f.lan.hit=.3;K.float(f,f.lan,'HOPPLA','#f4d37a');},each:wob,...say('cap','Er stolpert über seine eigenen Füße.')},
  say('m','BEWAFFNET MIT EINEM DOLCH UND EINEM BEDAUERLICHEN MANGEL AN SELBSTERHALTUNGSTRIEB!',{do:f=>{K.pose(f.lan,{a:Math.PI,state:'celebrate'});}}),
  {face:{actor:idiot,mood:'grin',zoom:1.1,team:1},...say('i','Ich hab heute extra gefrühstückt!')},
  {face:null,dur:1.2,do:f=>{f.cam.ax=200;f.henMood='proud';M.sound?.('crowd');},cam:{vw:240}},
  say('m','GEGEN DREI HÄHNE!',{do:f=>{f.cheer=1;for(const x of [150,250,360,470])K.float(f,null,'GOCK! GOCK!','#f29b83',0,x,140);}}),
  say('m',`${String(I.name).toUpperCase()}!`,{do:f=>{f.cam.ax=330;K.pose(f.lan,{a:Math.PI});},cam:{vw:300}}),
  {dur:.6}],done:()=>{done();}});}

// =====================================================================================================
// ABLAUF, SZENENWAHL, START (Testversion)
// =====================================================================================================
const SCENES=[['Eine geniale Idee (Schild)',scene1],['Warum Hühner?',scene2],['Die Hühnerhändlerin',scene3],['Drei Hähne kaufen',buyStep],['Das Beastrium',scene4],['Die Werte der Hähne',()=>scene5(alive()[0])],['Der erste Hahnenkampf',scene6],['Lernen durch Kämpfe',scene7],['Drei Hähne gegen einen Idioten',scene8],['Freies Training',freeMode]];
function prepare(){if(S.medic&&!Array.isArray(S.medic.order))S.medic.order=[];M.lesson.prepare();S.lesson={stage:'end'};const s=st();Object.assign(s,{stage:'',sign:false,beastrium:false,roosters:[],fallen:[],offer:null,fights:0,wins:0,idiot:null,first:null});
 HS.resetDay();S.gold=4;/* nach Rex: drei Gold Prämie und ein Rest */if(!String(S.schoolName||'').trim())S.schoolName='Ludus '+lanName();facadeBg=null;HS.rise=1;syncPlaces();}
// Für die Szenenwahl: alles herstellen, was die Geschichte bis dahin erledigt hätte (ohne geheime Abkürzungen im Spiel selbst)
function ensureUpTo(n){const s=st();if(n>=2)s.sign=true;if(n>=5){const o=offer();if(alive().length<3){o.first=true;for(let i=0;i<3;i++)if(!o.sold[i]){o.sold[i]=true;s.roosters.push(o.list[i]);S.gold=Math.max(0,S.gold-1);}}}if(n>=5)s.beastrium=n>5;
 if(n>=8&&!s.first){s.first={gains:[],won:true,dead:0};}if(n>=10&&!s.idiot)makeIdiot();syncPlaces();}
function start(){stopAll();prepare();scene1();}
function jump(n){stopAll();prepare();ensureUpTo(n);if(n===5)st().beastrium=false;SCENES[n-1][1]();}
function stopAll(){K.stopFilm();K.hideGuide();closeMarket();closeDetail();stopDemo();toastEl?.remove();pres?.done?.();window.ArenaUI?.close?.();document.querySelectorAll('.hs-end,.lesson-end').forEach(e=>e.remove());}
document.addEventListener('click',e=>{const el=e.target.closest?.('[data-hs]');if(!el)return;const [a,v]=el.dataset.hs.split(':');
 if(a==='buy')buy(+v);else if(a==='mclose')closeMarket();else if(a==='pskip')pres?.scene.skip();else if(a==='pdone')pres?.done();
 else if(a==='kill1'&&detail){const box=el.closest('[data-kill]');box.innerHTML=`<b>${esc(detail.R.name)} wirklich schlachten?</b><button class="btn small danger" data-hs="kill2">JA, IN DEN TOPF</button><button class="btn small" data-hs="killno">NEIN</button>`;}
 else if(a==='killno'&&detail){openDetail(detail.R);}
 else if(a==='kill2'&&detail){const R=detail.R,s=st();if(active()||S.battle)return;const i=s.roosters.indexOf(R);closeDetail();if(i>=0)s.roosters.splice(i,1);try{M.persist();}catch{}M.ui.notify?.(R.name+' ist jetzt Suppe. Der Schmied nimmt einen Teller.');M.ui.render();setTimeout(mountBeastrium,0);}
 else if(a==='dclose')closeDetail();else if(a==='replay'&&detail){detail.scene.stop();detail.scene.play(detail.R,()=>{});}
 else if(a==='endfree'){el.closest('.hs-end')?.remove();setStage('end');K.hideGuide();syncPlaces();try{M.ui.click('nav:home');}catch{}}});
// =====================================================================================================
// MUSIK „Beastrium“: im Beastrium (Seite und Detailfenster) und in der Arena, sobald BEAST gewählt ist
// (Tierwahl, Herausforderungen, Vorbereitung, Ergebnis). Im Kampf selbst und in Filmszenen schweigt sie.
// Eigene Spur; solange sie läuft, schweigt die Musik des Spiels (Kennzeichen .scene-silence aus audio.js).
// Lautstärke und Ein/Aus wie die Spielmusik (S.options.music), weiches Ein- und Ausblenden.
// =====================================================================================================
const song={el:null,level:0,playing:false,broken:false,unlocked:false};const hush=document.createElement('i');hush.hidden=true;document.body.appendChild(hush);
function songEl(){if(song.el||song.broken)return song.el;const src=document.getElementById('beastriumSong')?.textContent.trim()||(TEST?'':'music/beastrium.mp3?v='+encodeURIComponent(typeof BUILD!=='undefined'?BUILD:''));if(!src){song.broken=true;return null;}try{const el=new Audio();el.loop=true;el.preload='auto';el.volume=0;el.src=src;el.addEventListener('error',()=>{song.broken=true;song.playing=false;});song.el=el;}catch{song.broken=true;}return song.el;}
function songWanted(){if(S.options&&S.options.music===false)return false;if(document.hidden||S.battle||film()||pres||village)return false;
 if(detail||document.querySelector('.hs-beastrium'))return true;const U=window.ArenaUI;return !!(U?.isOpen?.()&&U.mode==='beast'&&U.screen!=='home');}
function songTick(dt){const want=songWanted();hush.className=want?'scene-silence':'';if(!want&&!song.playing)return;const el=songEl();if(!el)return;
 song.level+=((want?.42:0)-song.level)*Math.min(1,dt*3);if(want&&!song.playing){song.playing=true;const p=el.play();p?.catch?.(()=>{song.playing=false;});}
 else if(!want&&song.playing&&song.level<.02){song.playing=false;song.level=0;el.pause();}try{el.volume=Math.max(0,Math.min(1,song.level));}catch{}}
// Handys geben Ton erst nach einer Berührung frei: beim ersten Antippen kurz anspielen
document.addEventListener('pointerdown',()=>{if(song.unlocked)return;const el=songEl();if(!el)return;song.unlocked=true;if(!songWanted()){const p=el.play();p?.then?.(()=>{if(!song.playing)el.pause();}).catch?.(()=>{song.unlocked=false;});}},true);
// Takt: Markt, Beastrium-Bilder
let last=performance.now();(function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;HS.syncDay();songTick(dt);if(market)paintMarket(dt);if(now-lastLive>33){lastLive=now;stepLive(now);}})(last);
// ---------- Im Spiel: Kapitel beginnen und nach dem Neuladen fortsetzen ----------
function begin(){const s=st();if(s.stage)return;stopAll();HS.resetDay();scene1();}
const RESUME={s1:scene1,s2:scene2,s3:scene3,buy:buyStep,s4:scene4,s5:()=>scene5(alive()[0]),s6:scene6,s7:scene7,r1:scene7,s8:scene8,
 'b-open':()=>{syncPlaces();K.showGuide([],'Öffne das BEASTRIUM (auf der Karte rechts, neben dem Truppenplatz).');},'b-pick':()=>{syncPlaces();K.showGuide([],'Öffne das BEASTRIUM und tippe auf einen deiner Hähne.');},
 fight1:()=>{syncPlaces();K.showGuide([],'Öffne die ARENA (Arena-Tor oben) → BEAST → HAHN → nimm die LEICHTE Herausforderung.');},free:()=>{syncPlaces();taskbar();},won:victoryEnd};
if(!TEST){let resume=true;setInterval(()=>{if(film()||S.battle||market||pres||detail||village||window.ArenaUI?.isOpen?.()||document.querySelector('.lesson-end,.medic-end,.medic-film,.lion-film,.smith-ceremony,.medic-start,.lesson-start,.mg-dawn'))return;
 if(M.ui.getPage?.()!=='home'&&M.ui.getPage?.()!=='beastrium')return;const s=st();
 if(resume){resume=false;syncPlaces();if(RESUME[s.stage]){RESUME[s.stage]();return;}}
 if(!s.stage&&S.lesson?.stage==='end')begin();},1200);}
M.huehner={begin,start,jump,scenes:SCENES,state:st,offer,buy,openMarket,closeMarket,openDetail,closeDetail,makeIdiot,idiotG,present,prepare,ensureUpTo,stopAll,CLASSES,classP,STATS,get market(){return market;},syncPlaces,freeMode,beastriumPage,song};
window.HS_READY=true;
})();
