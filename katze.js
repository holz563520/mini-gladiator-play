'use strict';
// =====================================================================================================
// ARENA THEORY · KATZEN (Löwen, Tiger und alle Raubkatzen; eigenständige Testversion, ändert keine Spieldatei, hängt nicht an window.MG)
// · Modell wie bei Hunden und Bären (dist/hund.js, dist/baer.js): jede Sorte hat Sollwerte je Wert (acht Werte),
//   die einzelne Katze bekommt Anlage (64 Bernoulli-Versuche um den Sortenwert) und Istwert (um Sortenwert minus 20).
// · Pixelgrafik: alle Formen werden in ganze Rasterkästchen zerlegt (KATZE.PX), passend zu den Figuren und zum Löwen aus 1.0.
// · Zeichner: Katze in Seitenansicht aus einem Skelett (Zehengänger, Pfoten stehen fest, biegsame Wirbelsäule, langer Schwanz),
//   Haltungen Stand, Sitzen, Liegen, Ducken mit weichen Übergängen; Gangarten Schleichen, Schritt, Trab, Galopp; Sprung; Mimik (KA2). Köpfe, Mähnen und Fell je Sorte: dist/katze-koepfe.js.
// · Sortenliste und Werte: KATZEN_SORTEN.md. Fahrplan: KATZEN_FAHRPLAN.md. Editor: dist/katze-editor.html.
// Maßstab wie im Spiel: 81 Einheiten = 180 cm → 2,22 cm je Einheit.
// =====================================================================================================
(()=>{
const TAU=Math.PI*2,CM=180/81,cl=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
const KATZE={};window.KATZE=KATZE;KATZE.CM=CM;

// ---------------------------------------------------------------- Zufall (wie dist/hund.js und dist/baer.js)
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function bern(r,mean,n=64){let hits=0;const p=cl((mean-1)/99,.01,.98);for(let i=0;i<n;i++)if(r()<p)hits++;return Math.round(1+99*hits/n);}
function hrand(s){const x=Math.sin(s*12.9898)*43758.5453;return x-Math.floor(x);}

// ---------------------------------------------------------------- Werte (dieselben acht wie beim Bären, damit Katze und Bär vergleichbar sind)
// [Kennung, Bedienung (Deutsch), Spiel (Englisch)]
const STATS=[['kraft','Kraft','Strength'],['pranke','Prankenhieb','Paw Strike'],['biss','Bisskraft','Bite'],['tempo','Schnelligkeit','Speed'],['ausdauer','Ausdauer','Stamina'],['zaeh','Zähigkeit','Toughness'],['wild','Wildheit','Ferocity'],['mut','Mut','Courage']];
// Kampfgewichte je Wert (Vorschlag aus KA0, wird in KA25 eingemessen)
const KAMPF={kraft:1.2,pranke:1.3,biss:1.4,tempo:.8,ausdauer:.3,zaeh:1,wild:1,mut:1};
const kampfOf=v=>STATS.reduce((a,[k])=>a+(v[k]||0)*KAMPF[k],0)/STATS.length;

// ---------------------------------------------------------------- Sorten (aus KATZEN_SORTEN.md, Reihenfolge wie dort)
// [Kennung, englischer Name, Bauart, kg, Schulterhöhe cm, Länge Kopf und Rumpf cm, Gefahrenköpfe, acht Sollwerte, Schritt im Fahrplan, ausgestorben, englische Beschreibung]
const ROH=[
 ["asiatic","Asiatic Lion","A",175,105,190,4,[77,76,80,62,45,74,74,84],"KA17",0,"The last few hundred live in one forest in India. This one took a wrong turn."],
 ["tsavo","Tsavo Lion","A",180,110,195,4,[78,78,80,64,50,68,88,86],"KA17",0,"No mane, no manners. Its grandfathers ate a railway crew and it kept the recipe."],
 ["masai","Masai Lion","A",190,115,200,4,[80,78,82,62,46,76,76,86],"KA17",0,"The lion from every picture book. The book left out the last page."],
 ["whitelion","White Lion","A",190,115,200,4,[79,76,80,60,44,74,70,80],"KA18",0,"White as a temple statue. The priests call it a blessing. The priests are not coming into the arena."],
 ["barbary","Barbary Lion","A",230,120,215,5,[86,82,86,58,44,84,80,90],"KA1",1,"The lion Rome built its arenas for. It has been killing gladiators since before your family had a name."],
 ["cape","Cape Lion","A",240,120,220,5,[87,83,86,57,44,84,82,88],"KA18",1,"Black mane, black belly, black mood. Shot to extinction by people who stood very far away."],
 ["bali","Bali Tiger","B",95,80,150,3,[61,72,70,72,50,58,76,70],"KA19",1,"The smallest tiger there ever was. Small is a word people use from outside the cage."],
 ["sumatran","Sumatran Tiger","B",120,85,160,4,[67,76,74,72,50,62,84,76],"KA19",0,"Smallest tiger alive, angriest tiger alive. The two facts are related."],
 ["javan","Javan Tiger","B",130,90,165,4,[69,77,75,70,50,64,80,74],"KA19",1,"Declared extinct. The paperwork was premature."],
 ["southchina","South China Tiger","B",150,95,170,4,[73,79,77,69,50,67,80,74],"KA20",0,"Declared a pest and hunted to nothing. It has opinions about people with spears."],
 ["indochinese","Indochinese Tiger","B",170,100,180,4,[76,81,80,68,50,70,80,76],"KA20",0,"A jungle tiger. You will hear it exactly once."],
 ["caspian","Caspian Tiger","B",220,110,200,5,[85,87,85,65,52,78,84,80],"KA20",1,"The tiger Rome paid for by the head. It came all the way from Persia to meet you."],
 ["bengal","Bengal Tiger","B",220,110,200,5,[85,88,86,66,50,78,88,84],"KA9",0,"The man-eater of the old stories. Most of the stories are true and all of them are short."],
 ["siberian","Siberian Tiger","B",250,115,210,5,[88,90,88,63,54,82,84,82],"KA9",0,"The biggest cat alive. It hunts bears when it is bored."],
 ["amur","Amur Leopard","C",48,65,120,2,[44,62,62,78,55,50,78,66],"KA21",0,"The rarest big cat on earth. After tonight, slightly rarer, or you are."],
 ["leopard","African Leopard","C",60,70,130,3,[50,66,68,78,55,56,86,74],"KA10",0,"Wounded, it does not run. It waits in the grass and settles the account."],
 ["blackpanther","Black Panther","C",60,70,130,3,[50,66,68,78,55,56,90,76],"KA10",0,"A leopard in mourning clothes. It dressed for your funeral."],
 ["persian","Persian Leopard","C",75,75,145,3,[55,70,70,75,55,60,84,74],"KA18",0,"Rome ordered these by the hundred and called them all panthers. The panthers did not care what they were called."],
 ["jaguar","Jaguar","D",95,70,150,3,[63,72,88,66,52,68,82,80],"KA11",0,"Other cats go for the throat. This one bites straight through the skull and saves time."],
 ["pantanal","Pantanal Jaguar","D",130,78,170,4,[71,77,94,63,52,74,84,82],"KA11",0,"Eats caimans. A man in armour is a caiman that complains."],
 ["clouded","Clouded Leopard","E",20,50,95,1,[28,44,58,76,50,34,60,46],"KA12",0,"A small cat with the teeth of a much larger mistake."],
 ["snow","Snow Leopard","E",50,60,120,2,[45,60,60,76,58,52,50,50],"KA12",0,"Has never killed a man in all of history. The crowd has paid to watch it reconsider."],
 ["floridapuma","Florida Panther","F",60,65,130,3,[50,62,64,80,58,52,62,52],"KA13",0,"Screams like a murdered woman at night. Usually it is only practising."],
 ["patagonian","Patagonian Puma","F",100,78,155,3,[62,70,72,78,58,60,66,58],"KA13",0,"Jumps the height of the arena wall from a standstill. The front row has been informed."],
 ["cheetah","Cheetah","G",50,80,130,2,[40,30,42,99,30,36,40,30],"KA14",0,"Fastest thing on four legs and frightened of nearly everything. Nearly."],
 ["kingcheetah","King Cheetah","G",50,80,130,2,[40,30,42,98,30,36,44,32],"KA14",0,"The same coward in a far more expensive coat."],
 ["bobcat","Bobcat","H",12,50,85,1,[20,38,40,74,55,28,80,62],"KA21",0,"Twelve kilos of cat that has never once checked the size of its opponent."],
 ["serval","Serval","H",14,60,90,1,[22,40,36,82,55,26,56,44],"KA15",0,"All legs and ears. Jumps three metres straight up, which is where your face is."],
 ["ocelot","Ocelot","H",14,45,90,1,[22,38,46,74,52,28,64,50],"KA21",0,"The prettiest coat in the arena. Senators' wives have asked what happens to it afterwards."],
 ["caracal","Caracal","H",17,48,90,1,[25,44,42,84,56,30,70,56],"KA15",0,"Plucks birds out of the air. Eyes are slower than birds."],
 ["lynx","Eurasian Lynx","H",28,65,110,2,[33,50,52,76,58,38,62,52],"KA15",0,"Kills deer four times its weight by hanging on to the throat. It is very good at hanging on."],
 ["megantereon","Megantereon","I",100,72,150,3,[66,74,60,58,45,64,80,76],"KA22",1,"The first of the sabertooths. It had the idea, the others had the size."],
 ["dinofelis","Dinofelis","I",120,75,160,4,[70,76,76,60,48,68,84,80],"KA22",1,"Hunted your ancestors when they still lived in trees. It remembers the taste."],
 ["homotherium","Scimitar Cat","I",190,110,190,4,[80,72,74,72,70,72,80,82],"KA16",1,"A sabertooth that could run all day. Mammoth calves found this unfair."],
 ["smilodon","Sabertooth","I",250,100,190,5,[92,90,70,50,40,86,86,86],"KA16",1,"Holds you down with arms like a bear and opens your throat with two knives. Quick, at least."],
 ["populator","Giant Sabertooth","I",400,120,230,5,[99,96,74,44,38,94,88,90],"KA22",1,"The heaviest cat that ever lived. Its teeth are longer than your dagger and it brought two."],
 ["americancheetah","American Cheetah","J",80,85,160,3,[55,50,58,94,42,48,56,46],"KA23",1,"Built like a cheetah, armed like a puma. The antelope it chased still runs too fast for no reason."],
 ["cavelion","Cave Lion","J",320,130,230,5,[93,88,90,58,48,88,82,90],"KA23",1,"The cave painters drew it without a mane and from a respectful distance."],
 ["ngandong","Ngandong Tiger","J",370,130,240,5,[95,94,92,56,48,90,86,84],"KA23",1,"A tiger and a half. The half is the problem."],
 ["americanlion","American Lion","J",400,135,250,5,[97,92,93,60,50,90,82,88],"KA24",1,"A quarter larger than any lion alive. The gate was widened. The odds were not."],
 ["tigon","Tigon","K",180,105,190,4,[78,80,80,64,46,72,78,78],"KA24",0,"A tiger's temper with a lion's pride. Nobody asked for either."],
 ["liger","Liger","K",400,125,250,5,[96,88,88,46,36,88,60,70],"KA24",0,"The largest cat that exists, bred by a man with too much money. Lazy until fed. You are the feeding."]
];
const BAUART={A:'Lion',B:'Tiger',C:'Leopard',D:'Jaguar',E:'Snow and Clouded Leopard',F:'Puma',G:'Cheetah',H:'Lynx and Small Cats',I:'Sabertooth',J:'Prehistoric',K:'Hybrid'};
// Gestalt je Sorte (Standard = Löwe). Sorten ohne eigenes shape gelten als noch nicht gebaut.
const SHAPE0={head:'lion',L:42,leg:1,bulk:1,chest:1,tuck:1,wither:1.6,neck:14,headS:1,snout:1,ear:1,tail:1,tailW:1,mane:1,maneBelly:.4,legW:1,paw:1};
const SHAPE_INFO=[['L','Rumpflänge',34,54,.5],['leg','Beinlänge',.7,1.4,.01],['bulk','Rumpfdicke',.7,1.4,.01],['chest','Brusttiefe',.6,1.5,.01],['tuck','Taille',0,2,.05],['wither','Widerrist',0,5,.1],['neck','Halslänge',8,22,.5],['headS','Kopfgröße',.7,1.4,.01],['snout','Schnauzenlänge',.6,1.5,.01],['ear','Ohrgröße',.5,2.5,.01],['tail','Schwanzlänge',.1,1.6,.01],['tailW','Schwanzdicke',.5,2.5,.05],['mane','Mähne',0,1.6,.01],['maneBelly','Bauchmähne',0,1.5,.01],['legW','Beindicke',.7,1.5,.01],['paw','Pfotengröße',.7,1.6,.01]];
// Berberlöwe: gedrungen und tief gebaut, breiter Kopf, sehr große dunkle Mähne bis unter den Bauch
const SHAPES_BY={barbary:{leg:.95,bulk:1.06,chest:1.08,headS:1.1,mane:1.2,maneBelly:1}};
const BREEDS=ROH.map(([id,name,bauart,kg0,cm0,len0,skulls,w,step,extinct,desc])=>{const werte={};STATS.forEach(([k],i)=>werte[k]=w[i]);
 return {id,name,bauart,group:BAUART[bauart],kg0,cm0,len0,skulls,werte,step,extinct:!!extinct,desc,built:!!SHAPES_BY[id],shape:SHAPES_BY[id]||null,soll:Math.round(kampfOf(werte)*10)/10};});
const FIRST='barbary';
const breed=id=>BREEDS.find(b=>b.id===id)||BREEDS.find(b=>b.id===FIRST);
const shapeOf=d=>{const B=breed((d?.cat||d)?.breed||d);return B._sh||(B._sh={...SHAPE0,...(B.shape||{})});};
KATZE.BREEDS=BREEDS;KATZE.STATS=STATS;KATZE.KAMPF=KAMPF;KATZE.kampfOf=kampfOf;KATZE.BAUART=BAUART;KATZE.SHAPE0=SHAPE0;KATZE.SHAPE_INFO=SHAPE_INFO;KATZE.breed=breed;KATZE.shapeOf=shapeOf;KATZE.FIRST=FIRST;
KATZE.skullsOf=B=>(typeof B==='string'?breed(B):B).skulls;// bis zum Einmessen (KA25) aus der Tabelle

// ---------------------------------------------------------------- Fell und Köpfe (Sorten tragen sich in dist/katze-koepfe.js ein)
// base Fell · light Bauch und Innenseiten (Katzen sind unten heller) · shade Schatten · dark dunkel · muzzle Schnauze und Kinn · nose Nasenspiegel
// mane Mähne ums Gesicht · maneDark Mähne an Schulter, Brust und Bauch · eye Auge · tuft Schwanzquaste
const COLKEYS=['base','light','shade','dark','muzzle','nose','mane','maneDark','eye','tuft'],FURKEYS=['base','light','shade','dark'];
KATZE.COLKEYS=COLKEYS;
KATZE.COATS={_:[{id:'tawny',name:'Tawny',w:1,base:'#b8975f',light:'#dcc79c',shade:'#927548',dark:'#5c4529',muzzle:'#efe6d2',nose:'#3b2a22',mane:'#8a6a3c',maneDark:'#3a2a1b',eye:'#c9962e',tuft:'#2e2219'}]};
KATZE.HEADS={};
const NAMES=['Nero','Caligula','Brutus','Sulla','Old Hunger','Kitten','Widowmaker','Purr','Mittens','Maneater','Cicero','Tarquin','Scar','Goldie','Butcher','Crassus','Whiskers','Appetite','Sandstorm','Nemea','Commodus','Sweetie','Ribcage','Yawn','Lucullus','Dusk','Patience','Princess','Hannibal','Mercy'];
const hex2=n=>cl(Math.round(n),0,255).toString(16).padStart(2,'0');
const MIX=new Map();
function mix(a,b,t){const key=a+b+t;let v=MIX.get(key);if(v)return v;const pa=parseInt(a.slice(1,7),16),pb=parseInt(b.slice(1,7),16);
 v='#'+hex2(lerp(pa>>16,pb>>16,t))+hex2(lerp(pa>>8&255,pb>>8&255,t))+hex2(lerp(pa&255,pb&255,t));if(MIX.size>4000)MIX.clear();MIX.set(key,v);return v;}
const shadeHex=(h,f)=>'#'+[1,3,5].map(i=>hex2(parseInt(h.slice(i,i+2),16)*f)).join('');
KATZE.mix=mix;

// ---------------------------------------------------------------- Eine Katze würfeln (Verfahren der Hunde: DOG.create)
// Größe und Gewicht: Faktor 0,88–1,12 um die Sortengröße, Gewicht wächst mit der Größe und etwas mit der Kraft-Anlage
function sizeOf(B,groesse,kraftCap,bulk){const f=cl(1+(groesse-50)*.005,.88,1.12);
 return {height:Math.round(B.cm0*f),length:Math.round(B.len0*f),weight:Math.round(B.kg0*Math.pow(f,2.6)*(.94+.12*bulk)*(1+(kraftCap-B.werte.kraft)*.003))};}
function create(breedId=FIRST,seed=(Math.random()*4294967296)>>>0){const B=breed(breedId),r=mulberry(seed),caps={},stats={};
 for(const [k] of STATS){const m=B.werte[k];caps[k]=bern(r,m);stats[k]=Math.min(caps[k],bern(r,m-20));}
 const coats=KATZE.COATS[B.id]||KATZE.COATS._;let tw=coats.reduce((a,c)=>a+(c.w||1),0),x=r()*tw,coat=coats[0];for(const c of coats){x-=(c.w||1);if(x<=0){coat=c;break;}}
 const f=.94+r()*.12,colors={};for(const k of COLKEYS)colors[k]=FURKEYS.includes(k)?shadeHex(coat[k],f):coat[k];
 const groesse=bern(r,50,12),bulk=r(),sz=sizeOf(B,groesse,caps.kraft,bulk),mane=.86+r()*.28;
 return {id:'katze-'+seed.toString(36),seed,wv:1,breed:B.id,breedName:B.name,soll:B.soll,name:NAMES[Math.floor(r()*NAMES.length)],sex:'Male',ageYears:4+Math.floor(r()*9),
  groesse,bulk,height:sz.height,length:sz.length,weight:sz.weight,stats,caps,appearance:{coat:coat.id,coatName:coat.name,colors,mane,scarSeed:Math.floor(r()*1e6)},wins:0,losses:0,kills:0,dead:false};}
// Talent wie DOG.talent: 63 ist der Durchschnitt der Sorte
const talent=D=>{const B=breed(D.breed);return Math.round(cl(63+3.5*STATS.reduce((a,[k])=>a+(D.caps[k]-B.werte[k]),0)/STATS.length,1,99));};
// Zeichenmaß: Die Höhe des Widerrists im Stand (in Einheiten, aus der Gestalt) entspricht der Schulterhöhe der Katze.
const smooth=u=>u*u*(3-2*u);
const standH=SH=>26.5*SH.leg+11.9+(8.2+2.55*SH.chest)*SH.bulk+SH.wither;
const szOf=(D,SH)=>D.height/(CM*standH(SH));
KATZE.create=create;KATZE.sizeOf=sizeOf;KATZE.talent=talent;KATZE.szOf=szOf;KATZE.standH=standH;
// Bühnenfigur: eine Katze mit Haltung (wird vom Editor und später von Kampf und Käfig benutzt)
KATZE.actor=(D,mode='stand')=>({id:D.id,cat:D,mode,pose:null,queue:[]});

// ---------------------------------------------------------------- Grundformen im Pixelraster (Wunsch Thomas 27.11.2026: Pixelgrafik wie die Figuren und der Löwe aus 1.0)
// Jede Form wird zeilenweise in ganze Rasterkästchen zerlegt (wie R und bone im Löwen aus 1.0, dist/lion.js), kein weicher Rand, kein Zurücklesen von Bildern.
// GS: Kantenlänge eines Kästchens in Zeichen-Einheiten (KATZE.PX Welt-Einheiten, unabhängig von der Größe der Katze). TM: Drehung und Lage des Kopfes,
// wird auf die Punkte gerechnet statt auf die Zeichenfläche, damit auch der Kopf im selben geraden Raster liegt. Je Form ein Pfad aus Kästchen, ein fill.
KATZE.PX=1;let GS=1,TM=null,TS=1;const XS=[],XD=[];
const txf=(x,y)=>TM[0]*x+TM[2]*y+TM[4],tyf=(x,y)=>TM[1]*x+TM[3]*y+TM[5];
function spansPoly(c,P,n){const g=GS;let y0=1e9,y1=-1e9;for(let i=0;i<n;i++){const y=P[i*2+1];if(y<y0)y0=y;if(y>y1)y1=y;}
 for(let r=Math.round(y0/g),r1=Math.round(y1/g);r<r1;r++){const yc=(r+.5)*g;let m=0;
  for(let i=0,j=n-1;i<n;j=i++){const ay=P[i*2+1],by=P[j*2+1];if((ay>yc)!==(by>yc)){const x=P[i*2]+(yc-ay)/(by-ay)*(P[j*2]-P[i*2]),d=ay>yc?1:-1;let k=m++;while(k>0&&XS[k-1]>x){XS[k]=XS[k-1];XD[k]=XD[k-1];k--;}XS[k]=x;XD[k]=d;}}
  let w=0,st=0;for(let k=0;k<m;k++){if(w===0)st=XS[k];w+=XD[k];if(w===0){const xa=Math.round(st/g),xb=Math.round(XS[k]/g);if(xb>xa)c.rect(xa*g,r*g,(xb-xa)*g,g);}}}}
function spansDisk(c,x,y,r){const g=GS;if(r<g*.62){c.rect(Math.round(x/g-.5)*g,Math.round(y/g-.5)*g,g,g);return;}
 for(let q=Math.round((y-r)/g),q1=Math.round((y+r)/g);q<q1;q++){const dy=(q+.5)*g-y,h2=r*r-dy*dy;if(h2<=0)continue;const hw=Math.sqrt(h2),xa=Math.round((x-hw)/g),xb=Math.round((x+hw)/g);if(xb>xa)c.rect(xa*g,q*g,(xb-xa)*g,g);}}
const PB=[];
function loadPts(pts){const n=pts.length;if(TM)for(let i=0;i<n;i++){const x=pts[i][0],y=pts[i][1];PB[i*2]=txf(x,y);PB[i*2+1]=tyf(x,y);}else for(let i=0;i<n;i++){PB[i*2]=pts[i][0];PB[i*2+1]=pts[i][1];}return n;}
function poly(c,pts,col){c.fillStyle=col;c.beginPath();spansPoly(c,PB,loadPts(pts));c.fill();}
function disk(c,x,y,r,col){c.fillStyle=col;c.beginPath();if(TM)spansDisk(c,txf(x,y),tyf(x,y),r*TS);else spansDisk(c,x,y,r);c.fill();}
function rr(c,x,y,w,h,col){const g=GS;c.fillStyle=col;if(TM){const cx=txf(x+w/2,y+h/2),cy=tyf(x+w/2,y+h/2),W=Math.max(1,Math.round(w*TS/g)),H=Math.max(1,Math.round(h*TS/g));c.fillRect(Math.round(cx/g-W/2)*g,Math.round(cy/g-H/2)*g,W*g,H*g);return;}
 c.fillRect(Math.round(x/g)*g,Math.round(y/g)*g,Math.max(1,Math.round(w/g))*g,Math.max(1,Math.round(h/g))*g);}
// Dünne Linie als Kette von Kästchen (wie bone im Löwen aus 1.0)
function seg(c,x,y,xx,yy,w,col){const g=GS;if(TM){const a=txf(x,y),b=tyf(x,y),d=txf(xx,yy),e=tyf(xx,yy);x=a;y=b;xx=d;yy=e;w*=TS;}
 const s=Math.max(1,Math.round(w/g))*g,n=Math.max(1,Math.ceil(Math.hypot(xx-x,yy-y)/g));c.fillStyle=col;c.beginPath();
 for(let i=0;i<=n;i++)c.rect(Math.round((x+(xx-x)*i/n-s/2)/g)*g,Math.round((y+(yy-y)*i/n-s/2)/g)*g,s,s);c.fill();}
function limb(c,x,y,xx,yy,w1,w2,col){if(TM){const a=txf(x,y),b=tyf(x,y),d=txf(xx,yy),e=tyf(xx,yy);x=a;y=b;xx=d;yy=e;w1*=TS;w2*=TS;}
 const dx=xx-x,dy=yy-y,l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;PB[0]=x+nx*w1/2;PB[1]=y+ny*w1/2;PB[2]=xx+nx*w2/2;PB[3]=yy+ny*w2/2;PB[4]=xx-nx*w2/2;PB[5]=yy-ny*w2/2;PB[6]=x-nx*w1/2;PB[7]=y-ny*w1/2;
 c.fillStyle=col;c.beginPath();spansPoly(c,PB,4);spansDisk(c,x,y,w1/2);spansDisk(c,xx,yy,w2/2);c.fill();}
// Gelenk aus zwei Knochen (wie ik in dist/hund.js)
function ik(jx,jy,fx,fy,a,b,dir){let dx=fx-jx,dy=fy-jy,dd=Math.hypot(dx,dy);const mx=a+b-.05;if(dd>mx){fx=jx+dx/dd*mx;fy=jy+dy/dd*mx;dx=fx-jx;dy=fy-jy;dd=mx;}dd=Math.max(dd,Math.abs(a-b)+.1);
 const th=Math.atan2(dy,dx),al=Math.acos(cl((a*a+dd*dd-b*b)/(2*a*dd),-1,1)),an=th+dir*al;return {kx:jx+Math.cos(an)*a,ky:jy+Math.sin(an)*a,fx,fy};}
KATZE.prim={rr,poly,disk,seg,limb,hrand};

// ---------------------------------------------------------------- Haltungen
// Jede Haltung ist ein Satz Zahlen; Übergänge mischen die Zahlen weich. Die Hinterpfoten stehen in allen Haltungen an derselben Stelle
// (Zehen bei A0), nichts rutscht: Beim Hinsetzen und Hinlegen sinkt das Sprunggelenk hinter den Zehen auf den Boden, der Mittelfuß liegt dann flach.
// hx,hy Becken · p Neigung des Rumpfs (0 waagerecht) · bend Buckel der Wirbelsäule · ax,ay Sprunggelenk hinten · wx,wy Handgelenk vorn
// pa Neigung der Vorderpfote · ne Hals (Winkel nach oben) · he Kopf (Winkel nach oben) · sag Bauch sackt durch · ta Richtung des Schwanzansatzes · tc Krümmung des Schwanzes
// KA2: tdx,tdy Hinterzehen versetzt (nur im Sprung) · z ganze Katze gehoben (Flug) · dL Wirbelsäule verkürzt (Anteil) · sc Schulterblätter treten hervor
const MODES=['stand','sit','lie','crouch'];
function poseRaw(mode,SH){const lf=SH.leg,L=SH.L,A0=-L/2-3,H0=26.5*lf+11,WX=-L/2+L*Math.cos(.025)+1.2;
 if(mode==='sit'){const hx=A0-12*lf,hy=-9*SH.bulk,target=28*lf+6.2+hy;let p=.7;for(let i=0;i<4;i++)p=Math.asin(cl((target+4.5*Math.cos(p))/L,.2,.98));
  const sx=hx+L*Math.cos(p);return {hx,hy,p,bend:3,ax:A0-10.3*lf,ay:-3.4,wx:sx+.5*Math.cos(p)+4.5*Math.sin(p)+.8,wy:-6.2,pa:-1.3,ne:1.02,he:-.1,sag:1.2,ta:3.02,tc:-.5};}
 if(mode==='lie'){const hx=A0-9*lf,hy=-8.6*SH.bulk,p=.07,sx=hx+L*Math.cos(p);return {hx,hy,p,bend:.5,ax:A0-10.3*lf,ay:-3.4,wx:sx+21*lf,wy:-3,pa:0,ne:.84,he:.02,sag:1.6,ta:3.02,tc:-.5};}
 // Ducken (vor dem Sprung, Lauern): Bauch tief, Hinterbeine gefaltet unter dem Körper, Schultern etwas tiefer als das Becken, Kopf flach voraus
 if(mode==='crouch'){const hx=-L/2-2,hy=-(13.5*lf+9.5),p=-.07;return {hx,hy,p,bend:1.2,ax:A0-8.6,ay:-1.7-6.4*lf,wx:hx+L*Math.cos(p)+5,wy:-6.2,pa:-1.3,ne:.06,he:-.02,sag:.6,ta:2.72,tc:.45,sc:.85};}
 // Sprung (nur als Stationen von jumpPose): Absprung, Flug, Vorgreifen, Aufsetzen, Abfangen
 if(mode==='launch'){const hx=-L/2+8,hy=-H0+5,p=.42;return {hx,hy,p,bend:-.6,ax:A0+2,ay:-1.7-10.6*lf,wx:hx+L*Math.cos(p)+12,wy:hy-L*Math.sin(p)+16,pa:-.9,ne:.5,he:-.25,sag:0,ta:2.5,tc:.5,dL:-.03};}
 if(mode==='fly'){const hx=-L/2+2,hy=-H0-2,p=.1;return {hx,hy,p,bend:-1.2,ax:A0-16,ay:-23.7,tdx:-25,tdy:-17,wx:hx+L*Math.cos(p)+27,wy:hy-L*Math.sin(p)+9,pa:-.3,ne:.2,he:-.1,sag:0,ta:3.05,tc:.25,dL:-.05};}
 if(mode==='reach'){const hx=-L/2-1,hy=-H0-4,p=-.22;return {hx,hy,p,bend:1.6,ax:A0-5,ay:-25.7,tdx:-12,tdy:-16,wx:hx+L*Math.cos(p)+15,wy:hy-L*Math.sin(p)+19,pa:-1,ne:.55,he:-.2,sag:0,ta:3.5,tc:-.3,dL:.04};}
 if(mode==='touch')return {hx:-L/2-3,hy:-H0-4,p:-.2,bend:1.8,ax:A0-1,ay:-22.2,tdx:-6,tdy:-11,wx:WX,wy:-6.2,pa:-1.3,ne:.6,he:-.18,sag:0,ta:3.7,tc:-.5,dL:.05};
 if(mode==='absorb')return {hx:-L/2-5,hy:-H0+5,p:-.1,bend:1,ax:A0-4.5,ay:-1.7-9.6*lf,wx:WX,wy:-6.2,pa:-1.3,ne:.5,he:-.12,sag:.4,ta:2.9,tc:.6,dL:.03};
 const hx=-L/2,hy=-H0,p=.025;return {hx,hy,p,bend:0,ax:A0-3.3,ay:-1.7-10.5*lf,wx:hx+L*Math.cos(p)+1.2,wy:-6.2,pa:-1.3,ne:.42,he:-.14,sag:0,ta:1.95,tc:1.75};}
const KEYS=['hx','hy','p','bend','ax','ay','wx','wy','pa','ne','he','sag','ta','tc','tdx','tdy','z','dL','sc'];
function poseSet(mode,SH){const P=poseRaw(mode,SH);for(const k of KEYS)if(P[k]===undefined)P[k]=0;return P;}
const ease=u=>u*u*u*(u*(u*6-15)+10);
// Aktuelle Haltung (gemischt). Schwere Katzen brauchen etwas länger.
function curPose(a,t,SH){const P=a.pose;if(!P||P.mode!==a.mode&&!P.to){const set=poseSet(a.mode,SH);a.pose={mode:a.mode,cur:set,to:null};return set;}
 if(P.to){const u=cl((t-P.t0)/P.dur,0,1),e=ease(u),cur={};for(const k of KEYS)cur[k]=lerp(P.from[k],P.to[k],e);
  const dw=Math.abs(P.to.wx-P.from.wx)+Math.abs(P.to.wy-P.from.wy);if(dw>4)cur.wy-=Math.sin(Math.PI*u)*Math.min(4,dw*.2);// Pfote wird gehoben, nicht geschoben
  P.cur=cur;if(u>=1){P.to=null;P.cur=poseSet(P.mode,SH);if(a.queue.length)setMode(a,a.queue.shift(),t,true);}return P.cur;}
 return P.cur=poseSet(P.mode,SH);}
// Haltung wechseln. Vom Sitzen ins Liegen rutschen die Vorderpfoten vor, alles andere geht direkt.
function setMode(a,mode,t=performance.now()/1000,queued=false){if(!MODES.includes(mode)||a.jump)return;const SH=a.SH||shapeOf(a.cat);if(!queued)a.queue.length=0;
 const from={...curPose(a,t,SH)},was=a.pose?.mode||a.mode;if(mode===was&&!a.pose?.to)return;
 const heavy=cl(a.cat.weight/200,.3,2),dur=(mode==='crouch'||was==='crouch'?.5:.75)+.35*heavy;
 a.mode=mode;a.pose={mode,from,to:poseSet(mode,SH),t0:t,dur,cur:from};}
KATZE.MODES=MODES;KATZE.setMode=setMode;KATZE.poseSet=poseSet;
KATZE.snap=(a,mode)=>{a.mode=mode;a.pose=null;a.queue.length=0;a.jump=null;a.v=0;a.gs=0;a.gb=0;a.go=null;a.want=null;a.leapWant=false;a.turn=null;a.turnWant=false;a.tl=0;};
KATZE.moving=a=>!!(a.pose&&a.pose.to)||a.queue.length>0||!!a.jump;

// ---------------------------------------------------------------- Gangarten (KA2; Muster wie GAITS/footCyc in dist/baer.js und dist/hund.js, eigene Katzenwerte)
// off: Versatz je Bein [hinten fern, vorn fern, hinten nah, vorn nah] · duty: Anteil am Boden · stride: Weg der Pfote am Boden · v: Tempo (Einheiten je Sekunde)
// roll: Abrollen (Sprunggelenk bzw. Handgelenk wandert über die stehenden Zehen) · curl: Pfote klappt im Schwung ein · hs, fs: Pfoten greifen weiter vor
// B: Körper im Gang [Becken tiefer, Neigung, Hals, Kopf, Schwanzansatz, Schwanzkrümmung] · bob, pit, nod: Wippen, Nicken · scap: Schulterblätter treten hervor
// Schleichen und Schritt: eine Seite nach der anderen (hinten, dann vorn), die Hinterpfote tritt fast in die Spur der Vorderpfote. Trab: über Kreuz.
// Galopp: erst beide Hinterpfoten, dann beide Vorderpfoten, dann Schwebephase mit gekrümmter Wirbelsäule; beim Abdruck streckt sie sich.
const GAITS={stalk:{name:'Stalk',de:'Schleichen',off:[.5,.22,0,.72],duty:.76,stride:19,lift:3.4,roll:.45,curl:.55,v:15,hs:2,fs:0,B:[9,-.03,-.42,.12,.7,-1.1],bob:.4,pit:.012,nod:.015,scap:1},
 walk:{name:'Walk',de:'Schritt',off:[.5,.25,0,.75],duty:.64,stride:31,lift:3.4,roll:.55,curl:.45,v:50,hs:3,fs:0,B:[1.8,0,-.2,.05,.2,0],bob:.7,pit:.02,nod:.035,scap:.6},
 trot:{name:'Trot',de:'Trab',off:[.5,0,0,.5],duty:.46,stride:28,lift:5,roll:.6,curl:.5,v:125,hs:4,fs:1,B:[2.6,0,-.12,.03,.45,-.6],bob:1.1,pit:.008,nod:.02,scap:.3},
 gallop:{name:'Gallop',de:'Galopp',off:[0,.7,.92,.6],duty:.24,stride:46,lift:9,roll:.7,curl:.6,v:420,hs:7,fs:3,B:[5,0,-.18,.1,.95,-1.3],bob:0,pit:0,nod:0,scap:.2}};
const GK=['stalk','walk','trot','gallop'];
// Eine Pfote im Takt: sS Schrittweite (0–1), sL Hub (0–1). s: Fortschritt der Standphase
function footCyc(G,c,i,sS,sL,lf){const u=((c+G.off[i])%1+1)%1,st=G.stride*lf*sS;
 if(u<G.duty){const s=u/G.duty,q=s>.72?(s-.72)/.28:0;return {dx:st*(.5-s),up:0,a:-G.roll*q*q*sL,st:true,s};}
 const v=(u-G.duty)/(1-G.duty),w=v*v*(3-2*v),sn=Math.sin(Math.PI*v);return {dx:st*(w-.5),up:G.lift*lf*sL*sn,a:(-G.roll*(1-w)-G.curl*sn)*sL,st:false,s:0};}
// Befehle: go = null | 'stalk' | 'walk' | 'trot' | 'gallop'. Die Katze hält erst an, wechselt die Haltung und läuft dann los.
KATZE.GAITS=GAITS;KATZE.GK=GK;
KATZE.go=(a,kind)=>{a.go=GAITS[kind]?kind:null;a.want=null;a.leapWant=false;};
KATZE.pose=(a,mode)=>{if(MODES.includes(mode)){a.go=null;a.want=mode;a.leapWant=false;}};
// Sprung: hält an, duckt sich, wackelt kurz mit dem Hinterteil, springt aus den Hinterbeinen ab, fliegt gestreckt mit vorgestreckten Pranken, landet auf den Vorderpfoten.
KATZE.leap=a=>{if(a.jump)return;a.go=null;a.want='crouch';a.leapWant=true;};
// Wenden (KA2b): Die Katze bremst, steht auf, dreht sich über die Vorderansicht um die Hochachse und läuft danach in die neue Richtung weiter.
KATZE.turn=a=>{a.turnWant=true;};KATZE.facing=a=>a.facing||1;
// Sprungweite in Einheiten, abgeleitet aus Schnelligkeit, Kraft und Gewicht (kein eigener Wert; vorläufig, wird in KA25 eingemessen)
KATZE.leapRange=D=>cl(95+.5*D.stats.tempo+.45*D.stats.kraft-12*Math.log2(D.weight/100),60,260);
function startJump(a,t,SH){const D=a.cat,sz=szOf(D,SH),hs=Math.sqrt(cl(D.weight/200,.3,2)),range=Math.min(KATZE.leapRange(D),a.leapDist||1e9)/sz,h=.12*range,Tf=2*Math.sqrt(2*h*sz/441);// 441 Einheiten/s² = Erdbeschleunigung
 const tw=.5,t1=tw+.2*hs,t2=t1+Tf,ta=t2+.14,t3=ta+.36*hs,F=[[0,'crouch'],[tw,'crouch'],[t1,'launch'],[t1+.38*Tf,'fly'],[t1+.78*Tf,'reach'],[t2,'touch'],[ta,'absorb'],[t3,'stand']].map(([tt,m])=>({t:tt,P:poseSet(m,SH),m:{}}));
 // Steigungen je Station: null, wo die Richtung wechselt oder ein Wert stehen bleibt (stehende Pfoten bleiben stehen, nichts schwingt über)
 for(const k of KEYS)for(let i=0;i<F.length;i++){if(i===0||i===F.length-1){F[i].m[k]=0;continue;}const d0=(F[i].P[k]-F[i-1].P[k])/(F[i].t-F[i-1].t),d1=(F[i+1].P[k]-F[i].P[k])/(F[i+1].t-F[i].t);F[i].m[k]=d0*d1<=0?0:2*d0*d1/(d0+d1);}
 const vx=(range-2)/(Tf+.3*(t1-tw)+.3*(ta-t2));a.jump={t0:t,d0:a.dist||0,tw,t1,t2,ta,t3,Tf,h,vx,dA:.3*vx*(t1-tw),dB:.3*vx*(ta-t2),range,frames:F};a.mode='crouch';a.pose=null;}
// Weg im Sprung: im Abdruck beschleunigt der Körper über den stehenden Hinterpfoten, im Flug gleiches Tempo, nach dem Aufsetzen läuft er über den stehenden Vorderpfoten aus
function jumpWay(J,u){if(u<=J.tw)return 0;if(u<J.t1){const s=(u-J.tw)/(J.t1-J.tw);return J.dA*s*s;}if(u<J.t2)return J.dA+J.vx*(u-J.t1);const s=cl((u-J.t2)/(J.ta-J.t2),0,1);return J.dA+J.vx*J.Tf+2*J.dB*(s-s*s/2);}
const jumpV=(J,u)=>u<=J.tw||u>=J.ta?0:u<J.t1?.6*J.vx*(u-J.tw)/(J.t1-J.tw):u<J.t2?J.vx:.6*J.vx*(1-(u-J.t2)/(J.ta-J.t2));
function jumpPose(a,t){const J=a.jump,u=cl(t-J.t0,0,J.t3),F=J.frames;let i=0;while(i<F.length-2&&u>=F[i+1].t)i++;
 const A=F[i],B=F[i+1],h=B.t-A.t,s=cl((u-A.t)/h,0,1),s2=s*s,s3=s2*s,h00=2*s3-3*s2+1,h10=s3-2*s2+s,h01=-2*s3+3*s2,h11=s3-s2,cur={};
 for(const k of KEYS)cur[k]=h00*A.P[k]+h10*h*A.m[k]+h01*B.P[k]+h11*h*B.m[k];
 if(u<J.tw){const e=smooth(cl(u/.12,0,1))*smooth(cl((J.tw-u)/.1,0,1)),w=u*TAU*5.5;cur.hx+=.8*e*Math.sin(w);cur.hy+=.35*e*Math.sin(w+1.3);cur.tc+=.3*e*Math.sin(w*.5);}
 const f=(u-J.t1)/J.Tf;cur.z=f>0&&f<1?4*J.h*f*(1-f):0;
 const hb=u<J.t1?-jumpWay(J,u):-J.dA*(1-smooth(cl(f/.3,0,1))),fb=u<J.t2?J.dB*smooth(cl(f,0,1)):J.dB-(jumpWay(J,u)-J.dA-J.vx*J.Tf);cur.tdx+=hb;cur.ax+=hb;cur.wx+=fb;return cur;}
// Einen Zeitschritt rechnen (einmal je Bild vor dem Zeichnen). Kosten: ein paar Rechnungen, kein Zeichnen.
function step(a,dt,t){dt=cl(dt,0,.05);const D=a.cat,SH=a.SH||shapeOf(D),lf=SH.leg,hs=Math.sqrt(cl(D.weight/200,.3,2)),pc=a.pace||1;let v=a.v||0;const v0=v;
 if(a.jump){const J=a.jump,u=t-J.t0;v=jumpV(J,u);a.gs=0;a.gb=0;a.dist=J.d0+(a.facing||1)*jumpWay(J,u);if(u>=J.t3){a.jump=null;a.mode='stand';a.pose=null;a.want=null;}}
 else{const need=a.turnWant?'stand':a.want||(a.go?'stand':null),busy=KATZE.moving(a);let vT=0;
  if(need&&a.mode!==need){if(v<1&&!busy&&!a.turn){v=0;setMode(a,need,t);}}
  else if(a.turnWant&&!a.turn){if(!busy&&v<20){a.turnWant=false;a.turn={t0:t,dur:(.8+.3*hs)/(a.rate||1),from:a.facing||1};}}// bremst erst (vT bleibt 0), wendet dann
  else if(a.turn){}
  else if(a.leapWant){if(!busy&&v<1){v=0;a.leapWant=false;a.want=null;startJump(a,t,SH);}}
  else{if(a.want)a.want=null;if(a.go&&!busy)vT=GAITS[a.go].v*pc;}
  // Tempo: Katzen kommen schnell in Fahrt; die Gangart folgt dem Tempo (Schritt, Trab, Galopp), Schleichen nur auf Befehl
  const acc=(60+1.2*Math.max(vT,v))/hs*(vT<v?1.4:1);v+=cl(vT-v,-acc*dt,acc*dt);
  const slow=a.go==='stalk'||!a.go&&a.gk==='stalk';a.gk=v>210*pc?'gallop':v>80*pc?'trot':slow&&v<30*pc?'stalk':'walk';
  const W=a.gw||(a.gw=[0,1,0,0]),ki=GK.indexOf(a.gk);let sum=0,len=0;for(let k=0;k<4;k++){W[k]+=cl((k===ki?1:0)-W[k],-dt*3.2,dt*3.2);sum+=W[k];}
  for(let k=0;k<4;k++){W[k]/=sum;len+=W[k]*GAITS[GK[k]].stride/GAITS[GK[k]].duty;}
  a.gs=smooth(cl(v/10,0,1));a.gb=cl((a.gb||0)+(v>1||vT>0?1:-1)*dt*2.4,0,1);
  // Wenden: ab der Mitte gilt die neue Richtung; die Pfoten treten dabei einmal auf der Stelle um
  if(a.turn){const u=(t-a.turn.t0)/a.turn.dur;a.tl=Math.sin(Math.PI*cl(u,0,1));if(u>=.5)a.facing=-a.turn.from;if(u>=1){a.turn=null;a.tl=0;}}
  a.cyc=(a.cyc||0)+v*dt/(len*lf*Math.max(a.gs,.3))+(a.turn?dt*1.5*a.tl*(1-a.gs):0);}
 a.v=v;if(!a.jump)a.dist=(a.dist||0)+v*dt*(a.facing||1);
 // Mähne und Schwanz: Feder, angeregt vom Auf und Ab des Gangs (q) und vom Anfahren und Bremsen (qx)
 const c=a.cyc||0,gal=a.gw?a.gw[3]:0,tq=a.gs*((1-gal)*.6*Math.sin(2*TAU*c)+gal*2*Math.sin(TAU*(c-.2)));
 const tx=cl(-(v-v0)/Math.max(dt,1e-3)*.01-v*.004,-3.5,3.5),om=13/hs,dm=.5*om;
 a.qv=(a.qv||0)+(om*om*(tq-(a.q||0))-dm*(a.qv||0))*dt;a.q=cl((a.q||0)+a.qv*dt,-4,4);
 a.qxv=(a.qxv||0)+(om*om*(tx-(a.qx||0))-dm*(a.qxv||0))*dt;a.qx=cl((a.qx||0)+a.qxv*dt,-4,4);}
KATZE.step=step;
// Echte Drehung über die Vorderansicht (KA2b, wie BAER.yaw in dist/baer.js): b Drehwinkel des Rumpfs (0 Seite … π/2 von vorn … π andere Seite),
// h Drehwinkel des Kopfes: er führt, dreht zuerst zum Betrachter und kommt zuerst an. l Drehwinkel des Schwanzes: er hängt nach und steuert gegen.
// F: Blickrichtung vor dem Wenden.
const yawOf=(a,t)=>{const u=cl((t-a.turn.t0)/a.turn.dur,0,1),b=Math.PI*smooth(u),w=Math.sin(Math.PI*u);return {F:a.turn.from,b,h:Math.min(Math.PI,b+.7*w),l:Math.max(0,b-.6*w),w};};
KATZE.yaw=(a,t)=>a.turn?yawOf(a,t):null;
// Lage des Kopfes im Bild (x), auch während des Wendens (für Messungen im Editor und in Tests)
KATZE.headX=(a,t,R)=>{const Y=a.turn?yawOf(a,t):null,F=Y?Y.F:(a.facing||1);return F*(Y?Math.cos(Y.b):1)*R.nbx+F*(Y?Math.cos(Y.h):1)*(R.hcx-R.nbx);};

// ---------------------------------------------------------------- Mimik (KA2): Ohren spielen, Zähne zeigen, gähnen, Lippe hochziehen (Flehmen), brüllen, Schwanz peitscht
const EXPR={ears:{de:'Ohren',dur:1.6},snarl:{de:'Zähne zeigen',dur:2.6},yawn:{de:'Gähnen',dur:3.2},flehmen:{de:'Lippe hochziehen',dur:3},roar:{de:'Brüllen',dur:3.4},lash:{de:'Schwanz peitscht',dur:2.4}};
KATZE.EXPR=EXPR;KATZE.express=(a,kind,t)=>{if(EXPR[kind])a.expr={kind,t0:t,dur:EXPR[kind].dur};};
function faceOf(a,t,ph){const F={mouth:0,lip:0,ear:0,blink:0,nose:0,tongue:0,dne:0,dhe:0,lash:0,claws:0},bt=(t+ph*3)%4.9;if(t>0&&bt>4.76)F.blink=1;
 const J=a.jump;if(J){const u=t-J.t0,fl=smooth(cl((u-J.tw)/.12,0,1))*smooth(cl((J.t2+.1-u)/.2,0,1));F.ear=.6*(1-fl)-.8*fl;F.mouth=.32*fl;F.lip=.4*fl;F.claws=fl;return F;}
 const X=a.expr;if(!X)return F;const u=(t-X.t0)/X.dur;if(u>=1||u<0){if(u>=1)a.expr=null;return F;}
 const ramp=X.kind==='yawn'?.36:.2,e=smooth(cl(u/ramp,0,1))*smooth(cl((1-u)/ramp,0,1));
 if(X.kind==='snarl'){F.lip=e*(.92+.08*Math.sin(t*31));F.mouth=.26*e;F.ear=-e;F.nose=e;F.dne=-.1*e;F.dhe=-.05*e;F.lash=.6*e;}
 else if(X.kind==='yawn'){F.mouth=e;F.tongue=e;F.dhe=.34*e;F.dne=.1*e;F.ear=-.5*e;if(e>.4)F.blink=1;}
 else if(X.kind==='flehmen'){F.lip=.85*e;F.mouth=.16*e;F.nose=e;F.dne=.22*e;F.dhe=.42*e;F.ear=-.3*e;if(e>.6)F.blink=1;}
 else if(X.kind==='roar'){F.mouth=.82*e*(.94+.06*Math.sin(t*27));F.lip=.45*e;F.tongue=.5*e;F.dne=.1*e;F.dhe=.2*e;F.ear=-.45*e;}
 else if(X.kind==='lash')F.lash=e;
 else F.ear=Math.sin(u*TAU*2)*e;
 return F;}

// ---------------------------------------------------------------- Überlagerung für Angriffe (KA3a, dist/katze-kampf.js; wie BAER.over)
// a.over: Zahlen, die auf die Haltung addiert werden (Schlüssel wie KEYS), dazu nx,ny,na (nahe Vorderpranke: Versatz und Winkel), fx,fy,fa (ferne Vorderpranke),
// mouth, lip, tongue, claws, lash (mindestens so viel), ear (addiert). Ohne a.over rechnet und zeichnet die Katze genau wie vorher.
function overPose(C,O){const R={};for(const k of KEYS)R[k]=C[k]+(O[k]||0);return R;}
function overFace(F,O){for(const k of ['mouth','lip','tongue','claws','lash'])if(O[k]>F[k])F[k]=O[k];if(O.ear)F.ear=cl(F.ear+O.ear,-1,1);return F;}
// ---------------------------------------------------------------- Skelett
const FOOT=[0,1,2,3].map(()=>({dx:0,up:0,a:0,st:false,s:0}));
function rig(a,t,SH){const O=a.over,C0=a.jump?jumpPose(a,t):curPose(a,t,SH),C=O?overPose(C0,O):C0,lf=SH.leg,D=a.cat,ph=(D.seed%97)*.13,A0=-SH.L/2-3,z=C.z,air=z>.01;
 const breathe=Math.sin(t*1.3+ph),F=O?overFace(faceOf(a,t,ph),O):faceOf(a,t,ph),gs=a.jump?0:(a.gs||0),gb=a.jump?0:smooth(a.gb||0),c=a.cyc||0,tl=a.jump?0:(a.tl||0),gl=Math.max(gs,.85*tl);
 // Gang: Pfoten im Takt, Rumpf wippt und nickt; im Galopp krümmt und streckt sich die Wirbelsäule
 let dhy=0,dp=0,dbend=0,dne=F.dne,dhe=F.dhe,dL=0,dta=0,dtc=0,hsx=0,fsx=0,sc0=C.sc,sc1=C.sc,F4=null,twA=.75*F.lash,twP=t*8.5,twK=2.6;
 if(gs>.002||gb>.002||tl>.002){F4=FOOT;for(const o of F4){o.dx=0;o.up=0;o.a=0;o.st=false;o.s=0;}const W=a.gw||[0,1,0,0];let wm=0,sg=0;
  for(let k=0;k<4;k++){const w=W[k];if(w<.002)continue;const G=GAITS[GK[k]],g=gs*w,b=gb*w,S=G.B,dom=w>wm;if(dom){wm=w;sg=G.scap;}
   for(let i=0;i<4;i++){const f=footCyc(G,c,i,gs,gl,lf),o=F4[i];o.dx+=w*f.dx;o.up+=w*f.up;o.a+=w*f.a;if(dom){o.st=f.st;o.s=f.s;}}
   dhy+=b*S[0];dp+=b*S[1];dne+=b*S[2];dhe+=b*S[3];dta+=b*S[4];dtc+=b*S[5];hsx+=g*G.hs;fsx+=g*G.fs;
   if(k===3){const fl=Math.cos(TAU*(c-.85));dhy-=g*2.4*Math.cos(TAU*(c-.8));dp+=g*.11*Math.cos(TAU*(c-.05));dbend+=g*(2.4*fl+.4);dL+=g*(.1*fl+.02);dne-=g*.08*Math.cos(TAU*(c-.05));dtc+=g*.25*Math.sin(TAU*c);}
   else{dhy+=g*G.bob*Math.sin(2*TAU*c+.6);dp+=g*G.pit*Math.sin(2*TAU*c+1.4);dne+=g*G.nod*Math.sin(2*TAU*c+.9);}}
  sc0=Math.max(sc0,gs*sg*(F4[1].st?Math.sin(Math.PI*F4[1].s):0));sc1=Math.max(sc1,gs*sg*(F4[3].st?Math.sin(Math.PI*F4[3].s):0));
  if(twA<.05){twA=gs*.1;twP=2*TAU*c;twK=2;}}
 if(tl>.002){dhy+=1.6*tl;dne-=.14*tl;dhe-=.05*tl;dta+=.5*tl;dtc-=.5*tl;}
 const L=SH.L*(1-C.dL-dL),p=C.p+dp,bend=C.bend+dbend,Tx=Math.cos(p),Ty=-Math.sin(p),Nx=-Math.sin(p),Ny=-Math.cos(p),fem=14*lf,tib=15*lf,hum=12.5*lf,rad=16.5*lf,Ty0=Math.abs(Math.sin(C.p)),MC=4.2;
 let hx=C.hx+SH.L*dL*.5,hy=C.hy+breathe*.1+dhy-z;
 // Hinterpfoten stehen fest: reicht das Bein im Übergang nicht, gibt das Becken nach, nicht die Pfote
 if(!F4&&!air&&C.tdy>-.5){const jx=hx+1.5*Tx-3*Nx,jy=hy+1.5*Ty-3*Ny,dx=C.ax-jx,dy=C.ay-jy,d=Math.hypot(dx,dy),mx=fem+tib-.4;if(d>mx){hx+=dx/d*(d-mx);hy+=dy/d*(d-mx);}}
 const sx=hx+L*Tx,sy=hy+L*Ty;
 // Abrollen: Das Gelenk wandert über die stehenden Zehen (Winkel a < 0), im Schwung klappt die Pfote ein. In der Luft folgt die Pfote dem Bein.
 const leg=(front,near)=>{const off=near?0:1,g=F4&&F4[(near?2:0)+(front?1:0)],ga=g?g.a:0;
  if(front){const jx=sx+.5*Tx-4.5*Nx+off*1.3,jy=sy+.5*Ty-4.5*Ny-off*.5;let wx=C.wx-off*(3-5*Ty0),wy=C.wy-off*Ty0*1.2-z,ang=C.pa;if(O){wx+=(near?O.nx:O.fx)||0;wy+=(near?O.ny:O.fy)||0;ang+=(near?O.na:O.fa)||0;}
   if(g){const tx=wx+MC*Math.cos(ang)+g.dx+fsx,ty=wy-MC*Math.sin(ang)-g.up;ang+=ga;wx=tx-MC*Math.cos(ang);wy=ty+MC*Math.sin(ang);}
   const r=ik(jx,jy,wx,wy,hum,rad,1);
   return {front,near,jx,jy,kx:r.kx,ky:Math.min(r.ky,-4.9*SH.legW),fx:r.fx,fy:Math.min(r.fy,-3.2*SH.legW),ang,st:g?g.st:!air,px:r.fx+MC*Math.cos(ang)};}
  const jx=hx+1.5*Tx-3*Nx-off*1.2,jy=hy+1.5*Ty-3*Ny-off*.4;let tx=A0+off*3.2+C.tdx,ty=-1.7+C.tdy-z,mx=C.ax-A0-C.tdx,my=C.ay+1.7-C.tdy,pa=0;
  if(g){tx+=g.dx+hsx;ty-=g.up;const co=Math.cos(-ga),si=Math.sin(-ga),x=mx;mx=x*co-my*si;my=x*si+my*co;pa=ga*1.1;}
  const r=ik(jx,jy,tx+mx,ty+my,fem,tib,-1),free=air||C.tdy<-.5||g&&!g.st;if(free){tx=r.fx-mx;ty=r.fy-my;}
  return {front,near,jx,jy,kx:r.kx,ky:Math.min(r.ky,-5.5*SH.legW),fx:r.fx,fy:Math.min(r.fy,-2.9*SH.legW),tx,ty,pa,st:g?g.st:!free,px:tx};};
 const nbx=sx+3*Tx+2*Nx,nby=sy+3*Ty+2*Ny,nod=breathe*.012,ne=C.ne+nod+dne;
 const hcx=nbx+SH.neck*Math.cos(ne),hcy=nby-SH.neck*Math.sin(ne);
 return {C,p,bend,Tx,Ty,Nx,Ny,hx,hy,sx,sy,L,z,breathe,ph,legs:[leg(false,false),leg(true,false),leg(false,true),leg(true,true)],nbx,nby,hcx,hcy,he:C.he+nod+dhe,face:F,
  ta:C.ta+dta,tc:C.tc+dtc,twA,twP,twK,sc0,sc1,q:a.q||0,qx:a.qx||0,cx:(hx+sx)/2,lie:cl(1-Math.abs(hy+9)/8,0,1)*(1-cl(p*2,0,1))};}
KATZE.rig=(a,t)=>rig(a,t,a.SH||shapeOf(a.cat));

// ---------------------------------------------------------------- Wunden und Blut an der Katze (KA3a): sitzen an der getroffenen Stelle und wandern mit dem Körper
// Stellen: kopf, hals, brust, bauch (Flanke), vl (Vorderpranke), hl (Hinterlauf). Wunde: {part,u,v,size 1–6,kind: claw|bite|cut|stab|blunt,seed}
// Zeichenarbeit: höchstens 20 Wunden je Katze (katze-kampf.js hält die Liste so kurz; hier ist bei 48 Schluss), alle zusammen zwei Füllungen.
function anchor(R,part){const {Tx,Ty,Nx,Ny,hx,hy,sx,sy}=R,l=R.legs;
 if(part==='kopf')return [R.hcx+1.5,R.hcy-1];if(part==='hals')return [(R.nbx+R.hcx)/2,(R.nby+R.hcy)/2+1];
 if(part==='brust')return [sx-4*Tx-5*Nx,sy-4*Ty-5*Ny];if(part==='vl')return [(l[3].jx+l[3].kx)/2,(l[3].jy+l[3].ky)/2+1];
 if(part==='hl')return [(l[2].jx+l[2].kx)/2,(l[2].jy+l[2].ky)/2+1];return [(hx+sx)/2-4*Nx,(hy+sy)/2-4*Ny];}
KATZE.anchor=anchor;
// Kästchen in den laufenden Pfad legen (Rechnung wie rr, aber ohne eigenes Füllen): alle Wunden einer Farbe werden zusammen gefüllt
function wq(c,x,y,w,h){const g=GS;if(TM){const cx=txf(x+w/2,y+h/2),cy=tyf(x+w/2,y+h/2),W=Math.max(1,Math.round(w*TS/g)),H=Math.max(1,Math.round(h*TS/g));c.rect(Math.round(cx/g-W/2)*g,Math.round(cy/g-H/2)*g,W*g,H*g);return;}
 c.rect(Math.round(x/g)*g,Math.round(y/g)*g,Math.max(1,Math.round(w/g))*g,Math.max(1,Math.round(h/g))*g);}
function drawWounds(c,a,R){const W=a.wounds,n0=W.length,A=WA;for(let i=0;i<n0;i++){const q=anchor(R,W[i].part);A[i*2]=q[0]+W[i].u;A[i*2+1]=Math.min(q[1]+W[i].v,-1.2);}
 // zwei Durchgänge, je Farbe ein Pfad: dunkel (Wundränder, Löcher, Prellungen), rot (offenes Fleisch, Rinnsal). Nur Kästchen, Furchen und Schnitte als Treppe.
 for(let pass=0;pass<2;pass++){c.fillStyle=pass?'#8d1c13':'#5d140f';c.beginPath();
  for(let i=0;i<n0;i++){const w=W[i],x=A[i*2],y=A[i*2+1],n=w.size,s=w.seed,k=w.kind;
   if(k==='claw'){for(let f=pass?1:0;f<3;f+=2){const o=(f-1)*1.6;wq(c,x-n*.9+o*.3,y+o-.5,n*.95,.8);wq(c,x+o*.3,y+o+.2,n*.9,.8);}}
   else if(k==='bite'){if(pass)wq(c,x-n*.3,y-.5,n*.6+.6,1);else for(let f=0;f<4;f++)wq(c,x+(f%2?1:-1)*(1+n*.35)+hrand(s+f)-.5,y+(f<2?-1:1)*(.8+n*.2),1.1,1.1+n*.15);}
   else if(k==='blunt'){if(!pass)wq(c,x-n*.5,y-n*.3,n+1,n*.5+.6);}
   else if(k==='stab'){if(pass)wq(c,x-.2,y+.8,.9,n*.7);else wq(c,x-.6,y-.6,1.4+n*.15,1.4+n*.15);}
   else if(pass){if(n>2.5)wq(c,x+n*.3,y+1,.9,n*.6);}
   else{const up=hrand(s)<.5?-1:1;wq(c,x-n*.8,y-.5*up-.5,n*.85,1.1);wq(c,x,y+.5*up-.5,n*.8,1.1);}}
  c.fill();}}
const WA=new Float32Array(96);
// ---------------------------------------------------------------- Zeichner
const G=-.25;// nichts reicht unter den Boden
const gy=y=>Math.min(y,G);
const LT=[1,0,0,1,0,0],TL=[1,0,0,1,0,0];// Lage beim Wenden: Rumpf und Schwanz
function drawCat(c,a,px,py,k,face,opt={}){const D=a.cat,col=D.appearance.colors,SH=a.SH||shapeOf(D),sz=szOf(D,SH),t=opt.time??performance.now()/1000;
 const R=rig(a,t,SH),{Tx,Ty,Nx,Ny,hx,hy,sx,sy,L,C}=R,bk=SH.bulk,lw=SH.legW,pw=SH.paw,seed=D.seed%1000;
 // Wenden (KA2b): Ein Punkt (x, Tiefe z zur nahen Seite) liegt im Bild bei x·bc + z·bs; Breiten bleiben, darum wird die Katze von vorn schmal und hoch statt zum Strich.
 // plain: Blick nach rechts ohne Wenden, dann wird wie bisher ohne Umrechnung gezeichnet.
 const Y=a.turn?yawOf(a,t):null,F=Y?Y.F:(a.facing||1),cb=Y?Math.cos(Y.b):1,sb=Y?Math.sin(Y.b):0,ch=Y?Math.cos(Y.h):1,bc=F*cb,bs=-F*sb,fc=F*ch,zw=5.4*bk,plain=!Y&&F===1;
 const base=col.base,light=col.light,shade=col.shade,dark=col.dark,farC=mix(shade,dark,.55),farP=mix(shade,dark,.7),upN=mix(base,light,.22),loN=mix(base,light,.38),pcN=mix(base,light,.6);
 c.save();c.translate(px,py);c.scale(k,k);
 if(!opt.noShadow){c.fillStyle='#1c140c50';c.beginPath();const zs=1-cl(R.z/70,0,.45);c.ellipse(face*bc*(R.cx+4)*sz,1,(L*.5+17+R.lie*8)*sz*(1-cl(R.p,0,1.2)*.3)*zs*Math.max(.4,Math.abs(bc)),(3.6+R.lie)*sz*zs,0,0,TAU);c.fill();}
 c.scale(face*sz,sz);GS=(opt.px||KATZE.PX)/sz;TS=1;
 const lay=z=>{if(plain){TM=null;return;}LT[0]=bc;LT[4]=bs*z;TM=LT;};lay(0);
 // ---- Pfote: runder Ballen, Zehen nach vorn, Krallen eingezogen
 function paw(x,y,ang,cc,toe,claw){const dx=Math.cos(ang),dy=-Math.sin(ang),r=2.7*pw*lw,gp=v=>Math.min(v,-r);
  limb(c,x,gp(y),x+dx*4.8*pw,gp(y+dy*4.8*pw),5.4*pw*lw,4.8*pw*lw,cc);
  if(toe){const ex=x+dx*4.6*pw,ey=gp(y+dy*4.6*pw);seg(c,ex+.9,ey-.6,ex+1.5,ey+1.2,.45,toe);seg(c,ex-.9,ey-.9,ex-.5,ey+1.4,.45,toe);}
  if(claw>.3){const ex=x+dx*5.6*pw,ey=gp(y+dy*5.6*pw),l=2.2*claw*pw;for(let i=-1;i<=1;i++)seg(c,ex-dy*i*1.5,gp(ey+dx*i*1.5),ex-dy*i*1.5+dx*l+dy*l*.5,gp(ey+dx*i*1.5+dy*l+dx*l*.5),.5,'#efe6d2');}}
 // Farbe nach Tiefe: beim Wenden wird das nahe Bein zum fernen, ohne Farbsprung (dq 1 nah … 0 fern)
 function drawLeg(l){const dz=l.near?1:-1,dq=Y?Math.round(cl((dz*cb+1)/2+(l.front?.5:-.3)*sb,0,1)*8)/8:(l.near?1:0);
  const up=dq>=1?upN:dq<=0?farC:mix(farC,upN,dq),lo=dq>=1?loN:dq<=0?farC:mix(farC,loN,dq),pc=dq>=1?pcN:dq<=0?farP:mix(farP,pcN,dq),toe=dq>.5?shade:null;lay(dz*zw);
  if(l.front){limb(c,l.jx,Math.min(l.jy,-7.3*lw*bk),l.kx,l.ky,14.5*lw*bk,9.6*lw,up);limb(c,l.kx,l.ky,l.fx,l.fy,8.8*lw,6.2*lw,lo);
   const dx=Math.cos(l.ang),dy=-Math.sin(l.ang),flat=1-Math.abs(dy);// steht die Pfote, zeigt der Mittelfuß nach unten und die Zehen nach vorn
   if(flat<.5){const bx=l.fx+dx*4.2,by=Math.min(l.fy+dy*4.2,-2.2*pw*lw);limb(c,l.fx,l.fy,bx,by,6*lw,5.2*lw*pw,lo);paw(bx-1.2,by,0,pc,toe);}
   else paw(l.fx,l.fy+.4,l.ang,pc,toe,l.near?R.face.claws:0);}
  else{limb(c,l.jx,Math.min(l.jy,-9.6*lw*bk),l.kx,l.ky,19*lw*bk,10.8*lw,up);limb(c,l.kx,l.ky,l.fx,l.fy,9.8*lw,5.6*lw,lo);
   limb(c,l.fx,l.fy,l.tx,Math.min(l.ty,-2.4*lw),5.4*lw,4.8*lw,lo);paw(l.tx-.6,l.ty,l.pa||0,pc,toe);}}
 // Reihenfolge nach Tiefe: von der Seite ferne Beine, Rumpf, nahe Beine; von vorn Hinterbeine, Rumpf, Vorderbeine
 const dep=l=>(l.jx-R.cx)*sb+(l.near?zw:-zw)*cb,LS=Y?[...R.legs].sort((p,q)=>dep(p)-dep(q)):R.legs;
 for(const l of LS)if(Y?dep(l)<0:!l.near)drawLeg(l);lay(0);
 // ---- Schwanz: Kette von Gliedern, hängt im Stand und liegt im Sitzen und Liegen am Boden; Spitze pendelt leicht.
 // Beim Wenden hängt er nach (eigener Drehwinkel Y.l): Er zeigt noch in die alte Richtung, während der Rumpf schon dreht, und steuert so gegen.
 {const n=10,len=4.1*SH.tail,w0=3.6*SH.tailW*bk,sway=Math.sin(t*.9+R.ph)*.1+Math.sin(t*2.3+R.ph*2)*.04,up=[],dn=[];let x=hx-Tx*7*bk+Nx*2.2,y=hy-Ty*7*bk+Ny*2.2;
  if(Y){const tc=F*Math.cos(Y.l);TL[0]=Math.abs(tc)<.12?(tc<0?-.12:.12):tc;TL[4]=bc*x-TL[0]*x;TM=TL;}
  for(let i=0;i<=n;i++){const u=i/n,an=R.ta+R.tc*Math.pow(u,1.4)+sway*u*u+R.twA*Math.sin(R.twP-u*R.twK)*u+R.q*.05*u*u,w=lerp(w0,w0*.45,u)/2,ca=Math.cos(an),sa=Math.sin(an);
   if(i){x+=ca*len;y=Math.min(y+sa*len,-w0*.3);}up.push([x+sa*w,gy(y-ca*w)]);dn.push([x-sa*w,gy(y+ca*w)]);}
  poly(c,up.concat(dn.reverse()),base);
  if(SH.tail>.3){disk(c,x,Math.min(y,-1.6),2.4*SH.tailW,col.tuft);disk(c,x-1.2,Math.min(y+.8,-1.4),1.7*SH.tailW,col.tuft);}lay(0);}
 // ---- Rumpf: Wirbelsäule als Bogen vom Becken zur Schulter; tiefer Brustkorb, schmale Taille, Widerrist
 const top=[],bot=[],n=14,mx=(hx+sx)/2+Nx*R.bend*2,my=(hy+sy)/2+Ny*R.bend*2,br=R.breathe*.3;
 for(let i=0;i<=n;i++){const u=i/n,q=1-u,x=q*q*hx+2*u*q*mx+u*u*sx,y=q*q*hy+2*u*q*my+u*u*sy;
  let tx=2*q*(mx-hx)+2*u*(sx-mx),ty=2*q*(my-hy)+2*u*(sy-my);const tl=Math.hypot(tx,ty)||1;tx/=tl;ty/=tl;const nx=ty,ny=-tx;// zeigt zum Rücken
  const su=smooth(u),rt=(8.2+2.6*su*SH.chest)*bk+SH.wither*Math.exp(-Math.pow((u-.9)/.15,2));
  const rb=(7.8+4.2*su*SH.chest-1.3*SH.tuck*Math.sin(Math.PI*cl(u/.62,0,1))+C.sag*Math.sin(Math.PI*u)+br*Math.sin(Math.PI*u))*bk;
  top.push([x+nx*rt,gy(y+ny*rt)]);bot.push([x-nx*rb,gy(y-ny*rb)]);}
 // Runde Masse: nur die Mitte dreht mit, die Rundung bleibt (von vorn ist der Rumpf rund, nicht flach). z: Tiefe zur nahen Seite
 const blob=(x,y,r,cc,z=0)=>{const X=bc*x+bs*z,tm=TM,pts=[];TM=null;for(let i=0;i<16;i++){const an=i/16*TAU;pts.push([X+Math.cos(an)*r,gy(y+Math.sin(an)*r)]);}poly(c,pts,cc);TM=tm;};
 const rH=8.3*bk,rS=(8.6+2.3*SH.chest)*bk;
 blob(hx,hy,rH,base);blob(sx,sy,rS,base);
 if(sb>.02){// von vorn: Becken und Brustkorb als runde Massen mit Tiefe, dazwischen der Rumpf als Walze (der Brustkorb der Katze ist tief und schmal)
  for(const sd of [-1,1]){blob(hx,hy,rH*.92,base,sd*2.2*bk);blob(sx,sy+.6*bk,rS*.94,base,sd*2.6*bk);}
  limb(c,hx,Math.min(hy,-rH),sx,Math.min(sy,-rS),2*rH,2*rS,base);}
 const wide=Math.abs(bc)>.15,strip=Math.abs(bc)>.5;// fast von vorn ist die Seitenfläche nur noch ein Strich: weglassen, die runden Massen tragen die Form
 if(wide)poly(c,[...top,...[...bot].reverse()],base);
 if(strip&&(R.sc0>.05||R.sc1>.05)){const rt0=(8.2+2.6*SH.chest)*bk+SH.wither*.6,sc=(o,s,cc)=>{if(s>.05)blob(sx-(3.5+o)*Tx+Nx*(rt0-3.4+3*s),sy-(3.5+o)*Ty+Ny*(rt0-3.4+3*s),3.6*bk,cc);};sc(3,R.sc0,mix(base,shade,.5));sc(0,R.sc1,mix(base,light,.15));}
 // Hals: Der Kopf führt die Drehung, der Hals schwenkt mit dem Kopfwinkel
 const HX=bc*R.nbx+fc*(R.hcx-R.nbx),SX=bc*sx,nw=(15+5*SH.chest)*bk;TM=null;limb(c,bc*(sx+Tx*1.5),Math.min(sy+Ty*1.5,-nw/2),HX,Math.min(R.hcy,-6.5*SH.headS),nw,13*SH.headS,base);lay(0);
 // heller Bauch (Katzen sind unten heller), dunklerer Rückenstreif
 if(strip){poly(c,bot.slice(1,n).map(([x,y])=>[x+Nx*2.6,gy(y+Ny*2.6)]).concat(bot.slice(1,n).reverse()),light);
  poly(c,top.slice(1,n).concat(top.slice(1,n).reverse().map(([x,y])=>[x-Nx*1.4,y-Ny*1.4])),mix(base,shade,.45));}
 else if(sb>.02)blob(sx,sy+rS*.55,rS*.5,light,-3*bk*cb);// von vorn: helle Brust zwischen den Vorderbeinen
 for(const l of LS)if(Y?dep(l)>=0:l.near)drawLeg(l);lay(0);
 // ---- Mähne: zottelige Büschel an Schulter, Brust, Hals und ums Gesicht; fest je Katze, flimmert nicht.
 // Beim Wenden rücken die Büschel mit Rumpf (bc), Hals (mc) und Kopf (fc) zusammen: von vorn steht die Mähne als Kranz ums Gesicht.
 const m=SH.mane*(D.appearance.mane||1);
 if(m>.05){const md=col.maneDark,ml=col.mane,mm=mix(ml,md,.5),hs=SH.headS,mc=(bc+fc)/2,sh=1-Math.abs(ch);TM=null;
  const tuft=(x,y,r,cc,ks)=>{const pts=[],nn=13;for(let i=0;i<nn;i++){const an=i/nn*TAU,j=.8+.34*hrand(i*7.3+ks+seed);pts.push([x+Math.cos(an)*r*j,gy(y+Math.sin(an)*r*j*1.06)]);}poly(c,pts,cc);};
  const mq=R.q*.55,mqx=R.qx*.5;
  // Bauchmähne (Berberlöwe, Kaplöwe): Fransen unter Brust und Bauch
  if(SH.maneBelly>.05&&strip){const zk=[],ob=[];for(let j=7;j<2*n-1;j++){const i=j>>1,u=(j&1)*.5,x=lerp(bot[i][0],bot[i+1][0],u),y=lerp(bot[i][1],bot[i+1][1],u),h=hrand(j*5.1+seed),l=(2.2+3*h)*SH.maneBelly*m*(.45+.55*j/(2*n))+mq*.5*(j&1?1:.4);
    ob.push([bc*x,y-1.6]);zk.push([bc*(x-1.2),gy(y+l*.25)],[bc*(x-.4-h*1.4),gy(y+l)]);}
   if(ob.length)poly(c,ob.concat(zk.reverse()),md);}
  const NX=lerp(SX,HX,.5),ny0=lerp(sy,R.hcy,.5);
  tuft(SX+bc*(-3+mqx*.5),sy-3.5+mq*.4-2.6*Math.max(R.sc0,R.sc1),11.5*m,md,1);tuft(SX+bc*(5.5+mqx*.8),sy+8.5+mq,10.5*m,md,2);tuft(NX+mc*(-1+mqx*.8),ny0+5+mq*.9,11.5*m,md,3);
  tuft(NX+mc*(-2+mqx*.6),ny0-2+mq*.5,12*m,mm,4);tuft(HX+fc*(1+mqx*.5),R.hcy+8.5*hs+mq*.8,7*m*hs,mm,5);
  if(sh>.15)tuft(HX,R.hcy+2.5*hs+mq*.5,(9+5.5*sh)*m*hs,md,7);// von vorn: dunkler äußerer Kranz
  tuft(HX-fc*4*hs,R.hcy+1,11.2*m*hs,ml,6);
  // einzelne Strähnen
  for(let i=0;i<10;i++){const h=hrand(i*3.3+seed),h2=hrand(i*8.7+seed),x=lerp(SX-bc*10*m,HX-fc*2,h)+mc*mqx*.7,y=lerp(sy-8*m,ny0+12*m,h2)+mq*(.3+.7*h2);seg(c,x,gy(y),x-mc*(1.5+h*1.5),gy(y+2.4+h2*2),.8,i%2?mix(ml,md,.25):md);}}
 // ---- Kopf (Zeichner je Sorte): von der Seite, solange der Kopf weniger als 60° zum Betrachter gedreht ist (die Schnauze wird dabei kürzer), sonst von vorn
 {const hs=SH.headS,hy0=Math.min(R.hcy,G-6*hs),o={t,breathe:R.breathe,prim:KATZE.prim,f:R.face};TS=hs;
  if(Math.abs(ch)>=.5){const s=fc<0?-1:1,co=Math.cos(R.he)*hs,si=Math.sin(R.he)*hs;TM=[s*co,-si,s*si,co,HX,hy0];
   (KATZE.HEADS[SH.head]||headPlain)(c,D,Y?{...SH,snout:SH.snout*(.4+1.2*(Math.abs(ch)-.5))}:SH,col,o);}
  else{TM=[hs,0,0,hs,HX,hy0];o.yaw=fc*2;o.pitch=R.he;(KATZE.HEADS_FRONT[SH.head]||headFront)(c,D,SH,col,o);}
  TM=null;TS=1;}
 if(a.wounds&&a.wounds.length){if(a.wounds.length>48)a.wounds.length=48;lay(0);TS=1;drawWounds(c,a,R);TM=null;}
 c.restore();return R;}
function headPlain(c,D,SH,col){disk(c,0,0,7,col.base);poly(c,[[3,-5],[12,-2.5],[12.5,1.5],[6,5],[0,6]],col.base);rr(c,11.4,-2.6,1.6,1.6,col.nose);rr(c,4.4,-3.4,1.2,1.2,'#120c08');}
// Kopf von vorn (Ersatz, wenn die Sorte keinen eigenen hat): o.yaw -1…1 schiebt Schnauze und Augen zur Seite, in die der Kopf schaut
function headFront(c,D,SH,col,o){const mx=(o.yaw||0)*3;disk(c,-5.4,-6,2.5,col.base);disk(c,5.4,-6,2.5,col.base);disk(c,0,0,7.4,col.base);disk(c,mx,3,3.6,col.muzzle||col.light);rr(c,mx-1.3,1,2.6,1.8,col.nose||'#17100c');rr(c,mx*.6-4,-2.8,1.3,1.3,'#120c08');rr(c,mx*.6+2.7,-2.8,1.3,1.3,'#120c08');}
KATZE.HEADS_FRONT={};
KATZE.draw=drawCat;
})();
