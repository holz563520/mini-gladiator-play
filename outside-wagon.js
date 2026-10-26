'use strict';
/* =====================================================================================================
   PLÜNDERUNGEN · WAGENÜBERFALL (zweiter Plündermodus, zufällig neben der Bandenjagd)
   Die Truppe liegt am Wegesrand auf der Lauer. Bis zu drei Wagen kommen vorbei, je nach Totenköpfen vom schäbigen
   Bauernkarren bis zum gepanzerten Geldwagen, gezogen von Esel, Ochse, Maultieren oder Pferden, begleitet von Wachen.
   Durchs Fernglas sieht man Wagen, Wachen und eine Einschätzung in Totenköpfen; dann: überfallen oder vorbeiziehen lassen.
   Beute bei Sieg: Gold aus dem Wagen, ein zufälliger Gegenstand aus der Ladung (Rüstung, Waffe oder Schild) und alles,
   was die Wachen fallen lassen.
   · Logik (ohne DOM, auch headless): D.newWagonMission, D.WAGON (Zahlen), Texte.
   · Grafik: DebtWagon.draw(ctx,w,t) – Wagen, Zugtiere, Kutscher, Staub, in Kunstpixeln (doppelt groß) wie die Tiere der Außenwelt.
   Ablauf im Spiel: outside.js (runWagon).
   ===================================================================================================== */
(()=>{
const M=window.MG,D=window.Debt;if(!M||!D)return;
const W=window.DebtWagon={};M.outsideWagon=W;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,pick=(r,l)=>l[Math.floor(r()*l.length)];

// ---------- Zahlen ----------
// tier 1–5 = Totenköpfe des Wagens. guards: Wachen je Kämpfer der Gruppe (+ je Stufe), gold: Spanne, q: Güte des Fundstücks
D.WAGON={
 wagons:3,              // so viele Wagen kommen höchstens vorbei
 spread:1.1,            // Stufe eines Wagens schwankt um die gewählte Schwierigkeit (±1)
 guards:[.5,.12],       // Wachen ≈ Gruppengröße × (0,5 + 0,12 × Stufe), mindestens 1
 gold:[[30,70],[70,150],[130,280],[260,520],[520,1100]],
 q:[[0,1],[1,1],[1,2],[2,3],[3,4]],
 speed:[38,42,46,50,54],// Welt-Pixel je Sekunde
 types:['bauer','ochsen','plan','handel','pracht']
};
const TYPES=W.TYPES={
 bauer:{name:'Bauernkarren',animals:'einem Esel',cargo:'Rüben, Mist und ein Huhn, das sich für den Anführer hält.',guard:'Knecht',look:'Ein Bauernkarren. Zwei Räder, ein Esel und ein Bauer, der mehr Angst vor seiner Frau hat als vor uns.'},
 ochsen:{name:'Ochsenkarren',animals:'einem Ochsen',cargo:'Fässer. Bier, wenn wir Glück haben. Essig, wenn wir Pech haben. Beides, wenn wir lange warten.',guard:'Fuhrknecht',look:'Ein Ochsenkarren mit Fässern. Der Ochse ist das klügste Lebewesen auf dem Wagen.'},
 plan:{name:'Planwagen',animals:'zwei Maultieren',cargo:'Unter der Plane Kisten. Ein Händler, der nicht will, dass man sieht, was er hat. Wir wollen es sehen.',guard:'Söldner',look:'Ein Planwagen. Leinen, Kisten und zwei Maultiere, die schon alles gesehen haben.'},
 handel:{name:'Handelswagen',animals:'zwei Pferden',cargo:'Beschlagene Truhen auf dem Dach. Wer so was durch den Wald fährt, hat entweder Mut oder Wachen. Er hat Wachen.',guard:'Wachmann',look:'Ein Handelswagen, bemalt und beschlagen. Der Händler hat Geschmack. Und Geld. Vor allem Geld.'},
 pracht:{name:'Geldwagen',animals:'vier Pferden',cargo:'Ein eiserner Kasten mit Schloss. Da drin liegen Steuern. Wir holen sie zurück. Für das Volk. Also für uns.',guard:'Gardist',look:'Ein gepanzerter Geldwagen mit vier Pferden. Eisenplatten, Goldkanten, Fahne. Das ist kein Wagen, das ist eine Festung auf Rädern.'}
};
W.TEXT={
 approach:['Da kommt was den Weg runter. Hört ihr die Räder?','Still! Ein Wagen. Köpfe runter.','Hufe. Und Räder. Und jemand, der falsch pfeift.'],
 rating:[[1,'Ein Totenkopf. Das ist kein Überfall, das ist Einkaufen.'],[2,'Zwei Totenköpfe. Machbar, wenn keiner stolpert.'],[3,'Drei Totenköpfe. Das wird blutig. Aber lohnend.'],[4,'Vier Totenköpfe. Wer da angreift, sollte vorher beten. Und schnell sein.'],[5,'Fünf Totenköpfe. Wer da angreift, schreibt besser vorher sein Testament. Ich hab meins schon.']],
 pass:['Lassen wir ihn ziehen. Der nächste ist vielleicht netter. Oder dicker.','Nicht der. Der Esel hat mich so traurig angeschaut.','Zu gefährlich. Oder zu arm. Eins von beiden.','Weiterziehen lassen. Wir sind Räuber, keine Selbstmörder.'],
 passGone:['Der Wagen rumpelt davon. Keiner hat euch gesehen. Der Esel vielleicht.','Die Räder verklingen. Im Gebüsch juckt es. Weiter warten.'],
 noMore:'Es kommt nichts mehr. Die Sonne sinkt, die Mücken stechen, die Truppe trottet heim.',
 driverFlee:['Der Kutscher springt vom Bock und rennt. Er wird nicht gut genug bezahlt.','Der Kutscher rennt schneller als seine Pferde. Respekt.','Der Kutscher hebt die Hände, dann die Röcke, dann ist er weg.'],
 ambush:['JETZT! RAUS AUS DEM GEBÜSCH!','ÜBERFALL! WEG MIT DEN WAFFEN! ODER BEHALTET SIE, IST UNS EGAL!','HALT! DAS IST EIN ÜBERFALL!'],
 guardShout:['Überfall! Rettet die Ladung!','Haltet sie vom Wagen fern!','Für den Händler! Er zahlt doch so gut!','Räuber! Ich wusste es! Ich hab’s doch gesagt!','Ich werd nicht bezahlt fürs Sterben! Nur fürs Wachen!','Die Kiste bleibt zu!'],
 guardOwes:['wird pro Tag bezahlt, nicht pro Leben','hat dem Händler geschworen, die Ladung zu schützen. Den Händler selbst hat er nicht erwähnt','schläft sonst auf dem Bock','hat noch nie einen Räuber gesehen. Bis heute','zählt die Tage bis zur Rente. Heute zählt er nicht weiter','ist der Schwager des Händlers. Deshalb Wache. Nicht wegen Talent','hat den Wagen schon dreimal verloren und zweimal wiedergefunden'],
 openLoot:['Die Kiste knarrt. Drinnen glänzt es.','Das Schloss gibt nach. Der Schmied wäre stolz. Oder neidisch.','Unter den Rüben: Gold. Der Bauer hatte Geheimnisse.','Die Ladung riecht nach Geld. Und nach Esel.']
};
const NAMES={names:['Gaius Gurtschnalle','Titus Truhenträger','Lucius Lastesel','Marcus Meilenstein','Quintus Querfeld','Decimus Deichsel','Servius Speichenbruch','Aulus Achsbruch','Rufus Radnabe','Spurius Spurrille','Balbus Bocksitz','Vibius Wegezoll','Cassius Kistenwart','Sextus Schlaglöcher','Fabius Fuhrlohn','Postumus Peitschenknall']};

// ---------- Wagen und Wachen erzeugen ----------
function wagonOf(r,tier,size,str,idx){const ty=D.WAGON.types[tier-1],sc=D.diffScale(tier,size),k=clamp(D.CFG.advStat*Math.pow(str,.85)*Math.pow(sc,.75),.12,2.2);
 const n=Math.max(1,Math.round(size*(D.WAGON.guards[0]+D.WAGON.guards[1]*tier)+(r()-.4)*1.2)),pBrute=clamp((sc-1.05)*.3,0,.3),pVet=clamp((sc-.75)*.16,0,.3),qBase=clamp(Math.round((k-.4)*2.2),0,3),used=new Set();
 const TX={names:NAMES.names,owes:W.TEXT.guardOwes,shout:W.TEXT.guardShout};
 const guards=Array.from({length:n},(_,i)=>{const g=D.henchman((r()*4294967296)>>>0,'w'+idx+'-'+i,used,{k,texts:TX});g.name=g.name;g.wagonGuard=true;
  const x=r();if(x<pBrute)D.brute(g,r,qBase+1);else if(x<pBrute+pVet)D.veteran(g,r,qBase+1);
  // bessere Stufen: mehr Rüstung (Leder, ab 4 auch verstärkt)
  if(tier>=3){g.enemyGear.armor.helm??=M.makeItem('armor','helm',Math.max(0,qBase-1),tier>=5?'medium':'leather');g.enemyGear.armor.chestplate??=M.makeItem('armor','chestplate',Math.max(0,qBase-1),tier>=4?'medium':'leather');}
  for(const it of D.gearList(g))it.durability=it.maxDurability;return g;});
 // ab 4 Totenköpfen führt ein Hauptmann die Wache (Veteran mit Helm und Brustpanzer)
 if(tier>=4&&guards.length){const c=guards[0];if(!c.veteran)D.veteran(c,r,qBase+2);c.name=c.name.split(' ')[0]+' der Hauptmann';c.wagonCaptain=true;}
 const [g0,g1]=D.WAGON.gold[tier-1],gold=Math.round(g0+r()*(g1-g0));
 // Fundstück: Rüstung (Material nach Stufe), Waffe oder Schild; Güte nach Stufe
 const [q0,q1]=D.WAGON.q[tier-1],q=q0+Math.floor(r()*(q1-q0+1)),x=r();let item;
 if(x<.45){const d=pick(r,M.armorDefs).id;item=M.makeItem('armor',d,q,tier>=4?(r()<.6?'metal':'medium'):tier>=2?(r()<.5?'medium':'leather'):'leather');}
 else if(x<.8)item=M.makeItem('weapon',pick(r,['gladius','long','axe','mace','spear','short','hammer','greatsword','doubleaxe','bow','crossbow','dagger']),q);
 else item=M.makeItem('shield',pick(r,tier>=3?['roundshield','scutum','tower','smallshield']:['buckler','smallshield','roundshield']),q);
 item.durability=item.maxDurability;
 const driver=D.makeG((r()*4294967296)>>>0,g=>{g.id='wagon-driver-'+idx;g.name=pick(r,['der Kutscher','der Fuhrmann','der Händler']);g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};g.appearance={...g.appearance,cloth:pick(r,['#6a4a2a','#4a5a3a','#5a3a4a','#3a4a5a'])};});
 return {idx,tier,type:ty,name:TYPES[ty].name,guards,gold,item,driver,k,v:r(),coat:pick(r,['#3a5a3a','#5a2a2a','#2a3a5a','#5a4a2a']),horse:pick(r,['#6a4028','#3a2a22','#8a6a4a','#c8c0b0','#4a4644']),seed:(r()*4294967296)>>>0};}
// Mission: ein Abschnitt am Weg, bis zu drei Wagen nacheinander. Gleiche Struktur wie eine Plünderung (kind 'adventure', mode 'wagon').
D.newWagonMission=function(seed,party,biome='wald',o={}){const r=D.rng32(seed^0x3a90),str=o.strength??D.partyStrength(party),size=party.filter(D.fit).length||1,diff=clamp(Math.round(o.diff||2),1,5);
 const place=D.generate(seed,biome,{wagon:true});
 const wagons=Array.from({length:D.WAGON.wagons},(_,i)=>{const t=i===0&&r()<.5?diff:clamp(Math.round(diff+(r()-.5)*2*D.WAGON.spread),1,5);return wagonOf(r,t,size,str,i);});
 const maxActive=clamp(Math.round(size*.45*Math.sqrt(D.diffScale(diff,size))),2,6);
 return {kind:'adventure',mode:'wagon',seed,place,party,queues:[[]],wagons,wagonIdx:0,idx:0,sec:0,cleared:-1,loot:[],gold:0,goldPrize:0,killed:0,total:0,state:'ready',deaths:[],learn:o.learn!==false,strength:str,
  texts:{band:'Wagenwache',who:'Wachen',intro:'',leaderIntro:[],leaderDown:[]},diff,maxActive,scale:D.diffScale(diff,size),brutes:0,veterans:0};};
// einen Wagen angreifen: seine Wachen werden die Gegner der Begegnung, Gold und Fundstück die Beute
D.wagonTarget=function(m,w){m.queues[0]=w.guards;m.total=w.guards.length;m.goldPrize=w.gold;m.wagon=w;m.brutes=w.guards.filter(g=>g.brute).length;m.veterans=w.guards.filter(g=>g.veteran).length;};

// ---------- Grafik (Kunstpixel, doppelt groß; Ursprung = Boden in der Wagenmitte, Blick nach rechts) ----------
function px(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));}
function pe(g,x,y,rx,ry,c){const R=Math.max(1,Math.round(ry)),cy=Math.round(y);g.fillStyle=c;for(let yy=-R;yy<=R;yy++){const w=rx*Math.sqrt(Math.max(0,1-(yy/(R+.5))**2));const x0=Math.round(x-w),x1=Math.round(x+w);if(x1>x0)g.fillRect(x0,cy+yy,x1-x0,1);}}
function ln(g,x0,y0,x1,y1,c,w=1){const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)));for(let i=0;i<=n;i++){const k=i/n;px(g,x0+(x1-x0)*k-w/2,y0+(y1-y0)*k-w/2,w,w,c);}}
const mix=(a,b,t)=>{const p=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)),A=p(a),B=p(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');};
// Rad mit Speichen, dreht sich mit der Fahrt
function wheel(g,x,y,r,ang,o={}){const rim=o.rim||'#3a2614',sp=o.spoke||'#7a5230',iron=o.iron;pe(g,x,y,r,r,rim);pe(g,x,y,r-1.6,r-1.6,o.inner||'#00000000');
 g.save();g.beginPath();g.arc(Math.round(x),Math.round(y),r+.5,0,7);g.arc(Math.round(x),Math.round(y),r-1.8,0,7,true);g.fillStyle=iron||rim;g.fill('evenodd');g.restore();
 const n=o.n||8;for(let i=0;i<n;i++){const a=ang+i*Math.PI*2/n;ln(g,x+Math.cos(a)*1.6,y+Math.sin(a)*1.6,x+Math.cos(a)*(r-1.6),y+Math.sin(a)*(r-1.6),sp,1);}
 pe(g,x,y,2.2,2.2,o.hub||'#2a1a10');px(g,x-.5,y-.5,1,1,iron?'#c8ccd0':'#a07a4a');if(iron)for(let i=0;i<6;i++){const a=ang*.5+i*1.047;px(g,x+Math.cos(a)*(r-.6)-.5,y+Math.sin(a)*(r-.6)-.5,1,1,'#c8ccd0');}}
// Zugtiere: Esel, Ochse, Maultier, Pferd (Füße bei y=0, Blick nach rechts). st: {ph Schritt, mv Bewegung, rear Aufbäumen 0–1, col Farbe}
function legs4(g,xs,y,h,col,ph,mv,w=2,hoof='#2a1a10'){xs.forEach((x,i)=>{const sw=mv?Math.sin(ph+(i%2?Math.PI:0)+(i>1?Math.PI*.5:0))*2.4:0,lift=mv?Math.max(0,Math.sin(ph+(i%2?Math.PI:0)+(i>1?Math.PI*.5:0)))*1.5:0;px(g,x+sw,y-h,w,h-lift,col);px(g,x+sw-.3,y-1-lift,w+.6,1.2,hoof);});}
function animal(g,kind,x,y,st,t){g.save();g.translate(Math.round(x),Math.round(y));const ph=st.ph||0,mv=st.mv||0,bob=mv?Math.sin(ph*2)*.6:0,rear=st.rear||0;
 g.globalAlpha=.22;pe(g,0,1,kind==='pferd'?17:kind==='ochse'?19:12,3,'#000');g.globalAlpha=1;
 if(rear>0){g.translate(-8,0);g.rotate(-rear*.55);g.translate(8,0);}
 if(kind==='esel'||kind==='maultier'){const big=kind==='maultier',c=st.col||(big?'#5a4636':'#7a6e62'),d=mix(c,'#000000',.3),l=mix(c,'#ffffff',.35),s=big?1.15:1;
  legs4(g,[-8*s,-5*s,5*s,8*s],0,(big?11:9),d,ph,mv,1.6);pe(g,0,-14*s+bob,11*s,5.5*s,c);pe(g,0,-11*s+bob,9*s,2.5*s,l);px(g,-11*s,-18*s+bob,2,6,d);for(let i=0;i<5;i++)px(g,-12*s-i*.3,-14*s+i*1.6+Math.sin(t*3+i)*.4,1.4,1.6,d);
  const hb=mv?Math.sin(ph*2+1)*.8:Math.sin(t*.8)*.5;ln(g,8*s,-16*s+bob,13*s,-23*s+hb,c,4);px(g,9*s,-22*s+hb,4,6,d);pe(g,16*s,-23*s+hb,4.5*s,3*s,c);pe(g,19*s,-22*s+hb,2.6*s,2.4*s,l);px(g,20.5*s,-22.5*s+hb,1,1,'#1a1210');px(g,14.5*s,-25*s+hb,1.2,1.2,'#1a1210');
  const ear=Math.sin(t*1.7)*.8;px(g,12*s,-33*s+hb+ear,2,9,c);px(g,14.5*s,-32*s+hb-ear*.5,2,8,d);px(g,12.5*s,-31*s+hb+ear,1,5,l);}
 else if(kind==='ochse'){const c=st.col||'#7a4a2a',d=mix(c,'#000000',.35),l=mix(c,'#ffffff',.3);legs4(g,[-15,-11,10,14],0,11,d,ph,mv,2.6);
  pe(g,0,-19+bob,20,9,c);pe(g,-2,-15+bob,16,4,l);px(g,-20,-25+bob,40,3,c);pe(g,6,-26+bob,8,4,d);for(let i=0;i<8;i++)px(g,-21-i*.1,-24+i*1.6+Math.sin(t*2+i)*.4,1.6,1.6,d);px(g,-22,-11,2,3,'#2a1a10');
  const hx=24,hy=-22+bob+(mv?Math.sin(ph*2+1)*.6:0);pe(g,hx,hy,5.5,6,c);pe(g,hx+3,hy+4,3.5,2.6,'#d8b8a8');px(g,hx+3.5,hy+3,1,1,'#2a1a10');px(g,hx-1,hy-2,1.4,1.4,'#141210');
  ln(g,hx-3,hy-5,hx-9,hy-10,'#e8dcc0',1.6);ln(g,hx+2,hy-5,hx+7,hy-11,'#e8dcc0',1.6);px(g,hx-10,hy-11,1,1,'#8a7a5a');px(g,hx+7,hy-12,1,1,'#8a7a5a');
  // Joch
  px(g,14,-30+bob,4,14,'#6a4a2a');px(g,12,-31+bob,8,2,'#4a3218');}
 else{/* Pferd */const c=st.col||'#6a4028',d=mix(c,'#000000',.35),l=mix(c,'#ffffff',.28),mane=st.mane||mix(c,'#000000',.55);legs4(g,[-12,-9,9,12],0,14,d,ph,mv,2,'#1a1210');
  for(const lx of [-12,-9,9,12])px(g,lx,-3,2,2,mix(c,'#ffffff',.55));
  pe(g,0,-20+bob,14,6.5,c);pe(g,0,-17+bob,11,3,l);pe(g,-10,-21+bob,5,5,c);
  for(let i=0;i<9;i++)px(g,-15-i*.5+Math.sin(t*2.4+i*.6)*.6,-22+i*1.8,2,2,mane);
  const hb=mv?Math.sin(ph*2+1)*.9:Math.sin(t*.7)*.5;ln(g,10,-22+bob,17,-31+hb,c,5);for(let i=0;i<6;i++)px(g,9+i*1.2,-25-i*1.4+hb*.5,2,3,mane);
  pe(g,20,-31+hb,4.5,3.4,c);ln(g,21,-31+hb,26,-27+hb,c,3.4);px(g,26,-27.5+hb,1,1,'#1a1210');px(g,19,-33+hb,1.3,1.3,'#141210');px(g,17,-37+hb,2,4,c);px(g,18,-36+hb,1,2,l);
  // Geschirr: Brustblatt, Zügel, Messing
  px(g,8,-25+bob,3,9,'#3a2414');px(g,-4,-25+bob,2,11,'#3a2414');px(g,8,-21+bob,2,2,'#d8a838');ln(g,22,-29+hb,6,-24+bob,'#3a2414',1);
  if(st.plume){px(g,18,-41+hb,2,4,st.plume);px(g,17,-44+hb,2,4,st.plume);px(g,16,-46+hb,2,3,mix(st.plume,'#ffffff',.3));}}
 g.restore();}
// Kutscher auf dem Bock (einfache Figur)
function driver(g,x,y,t,w){if(w.noDriver)return;const c=w.driver?.appearance?.cloth||'#6a4a2a',sk=w.driver?.appearance?.skin||'#c49470',bob=Math.sin(t*5)*.4;px(g,x-3,y-11+bob,7,9,c);px(g,x-3,y-11+bob,7,1,mix(c,'#ffffff',.2));pe(g,x+.5,y-15+bob,3.2,3.2,sk);px(g,x-3,y-19+bob,7,2,'#3a2a1a');px(g,x-2,y-21+bob,5,2,'#4a3a2a');px(g,x+2,y-15+bob,1,1,'#1a1210');
 px(g,x+2,y-8+bob,6,2,c);px(g,x+7,y-8+bob,2,2,sk);px(g,x-2,y-2,6,2,'#3a2a1a');}
function dust(g,x,y,t,amt){g.save();for(let i=0;i<5;i++){const ph=(t*1.2+i/5)%1;g.globalAlpha=amt*.35*(1-ph);pe(g,x-ph*16-i*2,y-2-ph*6,2+ph*5,1.5+ph*3,'#c8b890');}g.restore();}
// Wagenkasten je Art
const BODY={
 bauer(g,w,t,s){const wd='#8a6038',dk='#5b3a20',lt='#a8784a';px(g,-24,-24,38,9,dk);px(g,-23,-23,36,7,wd);for(const x of [-14,-4,6])px(g,x,-23,1,7,dk);px(g,-24,-24,38,1,lt);
  // Ladung: Säcke, Rüben, Heu
  pe(g,-15,-28,7,4.5,'#c8b88a');pe(g,-15,-29,5,2,'#d8caa0');px(g,-16,-33,2,2,'#8a7a5a');pe(g,-4,-27,6,4,'#c0ae80');for(let i=0;i<6;i++){pe(g,4+i*1.6,-26-(i%2)*1.6,1.6,1.6,i%3?'#a04a8a':'#e8e0d0');px(g,4+i*1.6,-29-(i%2)*1.6,1,2,'#4a7a2a');}
  for(let i=0;i<10;i++)px(g,-22+i*3.5,-30+Math.sin(i*1.7)*1.5,3,2,i%2?'#c9a84f':'#e0c060');
  // Deichselbäume zum Esel
  ln(g,13,-18,30,-17,dk,1.6);ln(g,13,-20,30,-19,mix(dk,'#000000',.2),1.2);wheel(g,-6,-10,10,s.ang,{n:6});},
 ochsen(g,w,t,s){const wd='#7a5230',dk='#4a3218',lt='#9a6a40';px(g,-32,-25,50,10,dk);px(g,-31,-24,48,8,wd);for(let x=-28;x<16;x+=8)px(g,x,-24,1,8,dk);px(g,-32,-25,50,1,lt);
  for(const [bx,by] of [[-22,-33],[-10,-33],[2,-33],[-16,-41]]){pe(g,bx,by,5,6.5,'#8a5a30');px(g,bx-5,by-4,10,1.2,'#4a4a4a');px(g,bx-5,by+3,10,1.2,'#4a4a4a');pe(g,bx,by-6,4,1.2,'#a8784a');}
  ln(g,17,-17,36,-24,dk,2);wheel(g,-22,-8,8,s.ang,{n:6});wheel(g,10,-8,8,s.ang*1.1,{n:6});},
 plan(g,w,t,s){const wd='#5a3a20',dk='#3a2414',cv='#e6dcc4',cs='#c8bc9e';px(g,-36,-26,58,12,dk);px(g,-35,-25,56,10,wd);px(g,-36,-26,58,1,'#7a5230');
  // Plane: Bögen und Leinen, Flicken
  for(let x=-34;x<20;x++){const k=(x+34)/54,h=22+Math.sin(k*Math.PI)*6;px(g,x,-26-h,1,h,(x+34)%9===0?cs:cv);}
  for(const x of [-30,-16,-2,12])ln(g,x,-26,x,-50-Math.sin(((x+34)/54)*Math.PI)*4,cs,1.2);px(g,-20,-42,6,5,'#b8a07a');px(g,4,-38,5,4,'#a89a7a');
  px(g,-38,-48,4,22,'#3a2a1a');px(g,-37,-45,2,16,'#5a4a3a');px(g,-37,-40,2,4,'#8a6038');
  px(g,20,-32,7,3,'#4a3218');driver(g,23,-29,t,w);wheel(g,-26,-10,10,s.ang,{n:8});wheel(g,10,-8,8,s.ang*1.25,{n:8});ln(g,24,-16,40,-20,dk,2);},
 handel(g,w,t,s){const c=w.coat,dk=mix(c,'#000000',.45),lt=mix(c,'#ffffff',.25),gold='#d8a838';px(g,-38,-48,60,34,dk);px(g,-37,-47,58,32,c);px(g,-37,-47,58,2,lt);px(g,-38,-16,60,3,'#2a1a10');
  for(const x of [-30,-10,10]){px(g,x,-42,12,18,mix(c,'#000000',.2));px(g,x+1,-41,10,16,lt);px(g,x+5,-41,1,16,mix(c,'#000000',.2));}
  px(g,-6,-40,8,7,'#2a2a3a');px(g,-5,-39,6,5,'#5a7a8a');px(g,-5,-39,2,2,'#c8d8e0');
  for(let x=-36;x<20;x+=4)px(g,x,-48,2,1,gold);px(g,-38,-24,60,1,gold);
  // Dach: Truhen, Fass
  px(g,-40,-51,64,3,'#3a2414');for(const [bx,bw] of [[-34,14],[-16,12],[0,10]]){px(g,bx,-60,bw,9,'#6a4a2a');px(g,bx,-60,bw,2,'#8a6a3a');px(g,bx,-56,bw,1,'#3a2a1a');px(g,bx+bw/2-1,-57,2,3,gold);}pe(g,15,-57,4,5,'#7a5230');
  // Laterne
  const fl=.6+Math.sin(t*9)*.25;px(g,24,-46,1,8,'#2a2a2a');px(g,22,-38,5,6,'#3a3a3a');g.globalAlpha=fl;px(g,23,-37,3,4,'#ffd060');g.globalAlpha=1;
  px(g,22,-30,8,3,'#3a2414');driver(g,25,-27,t,w);wheel(g,-28,-11,11,s.ang,{n:10,iron:'#5a5e60',spoke:'#8a2a1a'});wheel(g,12,-9,9,s.ang*1.2,{n:10,iron:'#5a5e60',spoke:'#8a2a1a'});ln(g,26,-15,42,-22,'#3a2414',2);},
 pracht(g,w,t,s){const ir='#3e4448',dk='#24282a',lt='#6a7074',gold='#d8a838';px(g,-42,-52,68,38,dk);px(g,-41,-51,66,36,ir);px(g,-41,-51,66,2,lt);
  for(let y=-48;y<-16;y+=8)for(let x=-38;x<24;x+=6)px(g,x,y,1,1,'#9aa0a4');for(const x of [-41,-18,4,24])px(g,x,-51,2,36,gold);px(g,-42,-52,68,2,gold);px(g,-42,-17,68,2,gold);
  // Schloss
  px(g,-11,-40,10,12,'#5a3a14');px(g,-10,-39,8,10,gold);pe(g,-6,-35,1.6,1.6,'#2a1a10');px(g,-6.5,-34,1,3,'#2a1a10');
  // Fahne
  px(g,-40,-80,2,28,'#4a3218');const wv=Math.sin(t*3);for(let i=0;i<14;i++)px(g,-38+i,-80+Math.sin(t*4+i*.5)*1.2,1,8-i*.3,i%4<2?'#8a1a1a':gold);void wv;
  px(g,24,-34,8,3,'#24282a');driver(g,27,-31,t,w);
  // Wache auf dem Dach (Helm)
  px(g,-24,-60,6,8,'#5a2a2a');pe(g,-21,-63,3,3,'#c49470');px(g,-24,-67,7,3,'#8a9094');px(g,-18,-72,1,14,'#6a4a2a');px(g,-19,-74,3,3,'#b8c0c4');
  wheel(g,-30,-12,12,s.ang,{n:12,iron:'#2a2e30',spoke:'#4a3218',rim:'#2a2e30'});wheel(g,12,-10,10,s.ang*1.2,{n:12,iron:'#2a2e30',spoke:'#4a3218',rim:'#2a2e30'});ln(g,28,-16,44,-22,'#2a1a10',2.4);ln(g,62,-24,84,-24,'#3a2414',1);ln(g,62,-21,84,-21,'#3a2414',1);}
};
const TEAM={bauer:[['esel',40]],ochsen:[['ochse',44]],plan:[['maultier',46],['maultier',52,-5]],handel:[['pferd',52],['pferd',58,-6]],pracht:[['pferd',54],['pferd',60,-6],['pferd',98],['pferd',104,-6]]};
// Wagen zeichnen. w: {type,x,y,dir,ang,ph,mv,rear,driverGone,coat,horse,plume}
W.draw=function(ctx,w,t){ctx.save();ctx.translate(Math.round(w.x),Math.round(w.y));ctx.globalAlpha=.25;pe(ctx,0,2,w.type==='pracht'?110:w.type==='bauer'?50:80,8,'#000');ctx.globalAlpha=1;ctx.scale(2*(w.dir||1),2);
 const team=TEAM[w.type]||TEAM.bauer,st={ph:w.ph||0,mv:w.mv||0,rear:w.rear||0,col:w.type==='handel'||w.type==='pracht'?w.horse:undefined,plume:w.type==='pracht'?'#c83a2a':undefined};
 // hinteres Tier zuerst (Tiefe), dann Wagen, dann vorderes
 const back=team.filter(a=>a[2]),front=team.filter(a=>!a[2]);for(const [k,x,yo] of back)animal(ctx,k,x+2,(yo||0),{...st,ph:st.ph+.9,col:st.col&&mix(st.col,'#000000',.15)},t);
 if(w.mv)dust(ctx,-30,0,t,Math.min(1,w.mv));
 (BODY[w.type]||BODY.bauer)(ctx,{...w,driver:w.driverG,noDriver:!!w.driverGone},t,{ang:w.ang||0});
 if(w.type==='bauer'&&!w.driverGone)driver(ctx,6,-21,t,{driver:w.driverG});
 for(const [k,x] of front)animal(ctx,k,x,0,st,t);
 ctx.restore();};
// Länge des Gespanns (Welt-Pixel, vom Wagenende bis zur Schnauze des vordersten Tiers) und Kollisionskreise beim Halt
W.length=type=>({bauer:72,ochsen:84,plan:100,handel:110,pracht:150}[type]||80)*2;
W.colliders=function(w){const out=[],d=w.dir||1,L=W.length(w.type)/2;for(let k=-L*.55;k<=L*.95;k+=34)out.push({x:Math.round(w.x+d*k),y:Math.round(w.y-8),r:k>L*.3?16:24,type:'none',hp:9999,wagon:true});return out;};
})();
