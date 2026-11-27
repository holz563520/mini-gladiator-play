'use strict';
// =====================================================================================================
// ARENA THEORY · BÄREN (eigenständige Testversion, ändert keine Spieldatei, hängt nicht an window.MG)
// · Bären-Modell wie bei den Hunden (dist/hund.js): jede Sorte hat Sollwerte je Wert (werte, acht Werte),
//   der einzelne Bär bekommt Anlage (64 Bernoulli-Versuche um den Sortenwert) und Istwert (um Sortenwert minus 20).
// · Zeichner: Bär in Seitenansicht aus einem Skelett (Sohlengänger, Füße stehen fest), Haltungen Stand, Sitzen,
//   Liegen, Aufgerichtet mit weichen Übergängen. Köpfe und Fell je Sorte: dist/baer-koepfe.js.
// · Sortenliste und Werte: BAER_SORTEN.md. Fahrplan: BAER_FAHRPLAN.md. Editor: dist/baer-editor.html.
// Maßstab wie im Spiel: 81 Einheiten = 180 cm → 2,22 cm je Einheit.
// =====================================================================================================
(()=>{
const TAU=Math.PI*2,CM=180/81,cl=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
const BAER={};window.BAER=BAER;BAER.CM=CM;

// ---------------------------------------------------------------- Zufall (wie dist/hund.js)
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function bern(r,mean,n=64){let hits=0;const p=cl((mean-1)/99,.01,.98);for(let i=0;i<n;i++)if(r()<p)hits++;return Math.round(1+99*hits/n);}
function hrand(s){const x=Math.sin(s*12.9898)*43758.5453;return x-Math.floor(x);}

// ---------------------------------------------------------------- Werte
// [Kennung, Bedienung (Deutsch), Spiel (Englisch)]
const STATS=[['kraft','Kraft','Strength'],['pranke','Prankenhieb','Paw Strike'],['biss','Bisskraft','Bite'],['tempo','Schnelligkeit','Speed'],['ausdauer','Ausdauer','Stamina'],['zaeh','Zähigkeit','Toughness'],['wild','Wildheit','Ferocity'],['mut','Mut','Courage']];
// Kampfgewichte je Wert (Vorschlag aus B0, wird in B28 eingemessen)
const KAMPF={kraft:1.3,pranke:1.4,biss:1.3,tempo:.5,ausdauer:.4,zaeh:1.3,wild:1,mut:1};
const kampfOf=v=>STATS.reduce((a,[k])=>a+(v[k]||0)*KAMPF[k],0)/STATS.length;

// ---------------------------------------------------------------- Sorten (aus BAER_SORTEN.md, Reihenfolge wie dort)
// [Kennung, englischer Name, Bauart, kg, Schulterhöhe cm, aufgerichtet cm, Gefahrenköpfe, acht Sollwerte, Schritt im Fahrplan, englische Beschreibung]
const ROH=[
 ["sunborneo","Bornean Sun Bear","A",35,60,110,1,[30,42,58,60,50,40,78,70],"B9","The smallest bear alive. Nobody told the bear."],
 ["sun","Sun Bear","A",55,70,140,1,[38,46,62,58,50,45,80,72],"B9","Dog-sized, short-tempered, and it can turn around inside its own skin to bite whoever holds it."],
 ["slothlanka","Sri Lankan Sloth Bear","B",90,70,150,2,[47,70,45,50,55,52,82,80],"B10","Eats termites. Treats faces as a side dish."],
 ["sloth","Indian Sloth Bear","B",120,80,170,2,[53,74,47,50,55,56,85,82],"B10","Grew up fighting tigers and never learned to run away. Aims for the face, every time."],
 ["spectacled","Spectacled Bear","C",130,80,180,2,[55,55,62,48,52,55,40,45],"B11","A quiet fruit eater wearing glasses. The crowd will be disappointed until it isn't."],
 ["floridacave","Florida Cave Bear","C",250,110,230,3,[69,62,68,46,50,66,45,50],"B25","Extinct for ten thousand years. Somebody dug one up anyway."],
 ["pandaqinling","Qinling Panda","D",110,75,160,2,[51,45,80,30,35,58,30,50],"B11","The brown one. Rarer than the famous one and just as unwilling to stand up."],
 ["panda","Giant Panda","D",115,75,165,2,[52,45,82,30,35,58,30,50],"B11","Bites through bamboo all day. An arm is softer than bamboo."],
 ["moonbaloch","Balochistan Black Bear","E",80,70,145,1,[45,50,52,58,55,46,55,48],"B17","A desert bear the colour of rust, thin as its prospects."],
 ["moonjapan","Japanese Black Bear","E",90,70,150,2,[47,52,54,58,55,48,62,52],"B12","Small, black, and responsible for most of the bad mornings in the mountain villages."],
 ["moonformosa","Formosan Black Bear","E",110,75,160,2,[51,54,56,57,55,52,62,54],"B16","Wears a white V on its chest. It does not stand for victory. Usually."],
 ["moonindochina","Indochinese Black Bear","E",120,75,165,2,[53,55,57,56,55,54,62,54],"B16","The moon on its chest is the last pretty thing some people see."],
 ["moon","Himalayan Black Bear","E",130,80,170,2,[55,57,58,56,56,56,70,60],"B12","Stands up to look you in the eye first. Considered polite, by bears."],
 ["moontibet","Tibetan Black Bear","E",140,80,175,2,[56,58,59,55,56,58,66,58],"B16","A bear in a thick collar, dressed for a funeral at altitude."],
 ["moonussuri","Ussuri Black Bear","E",180,90,190,3,[62,62,62,54,56,62,68,60],"B12","The biggest of the moon bears. Shares its forest with tigers and has not been eaten yet."],
 ["blackflorida","Florida Black Bear","F",130,80,170,2,[55,54,54,62,58,54,42,40],"B17","Raids beehives and rubbish heaps. In the arena it settles for what is available."],
 ["glacier","Glacier Bear","F",130,80,170,2,[55,54,54,62,60,55,44,42],"B18","Blue-grey like old ice, and about as sentimental."],
 ["blacklouisiana","Louisiana Black Bear","F",140,80,175,2,[56,55,55,61,58,55,42,40],"B17","Long in the face, slow to anger, quick once it gets there."],
 ["kermode","Spirit Bear","F",140,80,175,2,[56,55,55,61,58,55,44,42],"B13","White as a ghost. Makes more of them."],
 ["cinnamon","Cinnamon Bear","F",150,85,180,2,[58,56,56,61,58,56,46,44],"B13","Smells of nothing like cinnamon."],
 ["black","Eastern Black Bear","F",150,85,180,2,[58,56,56,61,58,56,45,42],"B13","Runs away nine times out of ten. Tickets are sold for the tenth."],
 ["blacknewfoundland","Newfoundland Black Bear","F",160,85,180,3,[59,57,58,60,58,58,48,45],"B18","Sleeps half the year, eats for the other half, and wakes up in a mood."],
 ["blackhaida","Haida Gwaii Black Bear","F",200,95,195,3,[64,60,64,58,57,62,50,48],"B18","An island black bear with a skull built for cracking shells. Helmets are shells."],
 ["gobi","Gobi Bear","G",120,85,165,2,[53,58,56,58,66,56,50,48],"B21","Fewer than fifty left. The arena is working on that number."],
 ["isabelline","Himalayan Brown Bear","G",150,90,180,2,[58,62,60,58,62,58,55,52],"B21","A pale red bear from the roof of the world. Some say it is the yeti. The yeti does not comment."],
 ["cantabrian","Cantabrian Brown Bear","G",160,90,185,3,[59,63,61,58,60,60,52,50],"B19","Small for a brown bear. Do not mention it."],
 ["marsican","Marsican Brown Bear","G",170,95,190,3,[60,64,62,56,60,61,42,48],"B19","Famously gentle. The handlers are paid to change that."],
 ["syrian","Syrian Brown Bear","G",180,95,190,3,[62,66,63,58,60,62,60,56],"B21","The pale bear of the eastern provinces, long used to being stared at by crowds."],
 ["pyrenean","Pyrenean Brown Bear","G",190,95,195,3,[63,66,64,58,60,63,55,52],"B19","Takes a sheep a night in the mountains. Shepherds donated this one."],
 ["tianshan","Tian Shan Brown Bear","G",200,100,200,3,[64,68,65,58,62,64,58,55],"B22","Known for its long white claws. You will get a good look at them."],
 ["tibetanblue","Tibetan Blue Bear","G",200,100,200,3,[64,67,65,58,62,64,62,56],"B22","Almost nobody has seen one alive. Fewer have seen one twice."],
 ["caucasian","Caucasian Brown Bear","G",240,105,215,3,[68,70,68,58,60,67,62,58],"B20","Mountain-bred, thick-necked, and patient about nothing."],
 ["atlas","Atlas Bear","G",250,105,215,3,[69,72,70,58,60,70,72,66],"B20","The arena bear of the old empire. Hunted to nothing for shows exactly like this one."],
 ["brown","Eurasian Brown Bear","G",250,105,220,3,[69,71,69,58,60,68,60,58],"B1","The plain brown bear every legion learned to respect. Plain is not the same as harmless."],
 ["mexicangrizzly","Mexican Grizzly","G",250,105,215,3,[69,73,69,59,60,69,74,68],"B24","The silver bear. Ranchers poisoned the last one; this one has heard."],
 ["carpathian","Carpathian Brown Bear","G",300,115,230,3,[73,74,72,57,60,72,62,60],"B20","Fat on forest and somebody's orchard. The largest bear the old continent still dares to keep."],
 ["grizzly","Grizzly Bear","G",380,120,245,5,[79,86,77,60,62,84,90,84],"B24","Not the biggest bear. Only the one that never backs down. Playing dead is said to help."],
 ["siberian","East Siberian Brown Bear","G",350,120,240,4,[77,78,76,58,62,76,76,70],"B22","From a country where winter kills everything weak. This is what was left."],
 ["abc","ABC Islands Bear","G",350,120,240,4,[77,77,77,58,60,76,70,66],"B23","A brown bear with a polar bear somewhere in the family. The family does not talk about it."],
 ["ussuribrown","Ussuri Brown Bear","G",400,125,250,4,[80,80,79,57,60,79,80,74],"B23","The black grizzly of the far east. Fights tigers over dinner and sometimes is the dinner."],
 ["californiagrizzly","California Grizzly","G",450,130,260,5,[83,87,81,57,60,85,90,84],"B24","The golden bear. Extinct everywhere except on a flag and, tonight, in here."],
 ["kamchatka","Kamchatka Brown Bear","G",480,135,270,4,[85,83,83,56,60,83,60,64],"B23","Raised on salmon, enormous, and almost good-natured. Almost carries a lot of weight in that sentence."],
 ["alaska","Alaska Peninsula Brown Bear","G",500,135,275,4,[86,85,84,56,60,84,68,68],"B25","Half a ton of coastal bear. It has never met anything it had to walk around."],
 ["kodiak","Kodiak Bear","G",600,140,290,5,[91,89,88,54,58,88,70,72],"B25","The largest brown bear alive. Stands up taller than the gate it came through."],
 ["pizzly","Grolar Bear","H",450,135,270,4,[83,82,84,58,66,80,80,76],"B14","Half grizzly, half polar bear. It inherited both tempers and neither excuse."],
 ["polar","Polar Bear","H",550,150,300,5,[89,86,92,58,78,86,86,82],"B14","The only bear that looks at a man and sees food without thinking it over. Playing dead saves it the trouble."],
 ["auvergne","Auvergne Bear","I",50,60,120,1,[36,42,44,58,54,42,45,42],"B26","The little grandfather of all bears. Everything worse came later."],
 ["etruscan","Etruscan Bear","I",150,85,180,2,[58,58,58,58,58,57,55,52],"B26","The ancestor of brown bear and cave bear alike. A great deal to answer for."],
 ["smallcave","Small Cave Bear","I",250,100,210,3,[69,64,74,48,52,70,50,54],"B26","A cave bear in a smaller size. The stairs down to the cells were built for it."],
 ["deninger","Deninger's Bear","I",350,125,260,4,[77,70,80,50,54,77,55,58],"B27","What cave bears were before they got comfortable."],
 ["cave","Cave Bear","I",500,135,300,4,[86,76,88,46,52,86,55,62],"B15","Ate plants and slept in caves full of its own dead. Still nobody moved in next door."],
 ["agriotherium","Agriotherium","I",600,150,300,5,[91,82,97,52,52,88,84,80],"B27","The hardest bite of any bear that ever lived. Bones were the point."],
 ["shortfaced","Giant Short-faced Bear","I",800,170,340,5,[96,90,90,70,72,90,82,84],"B15","A bear on long legs that looks down on a mounted rider. It outran horses. You are not a horse."],
 ["arctotherium","Arctotherium","I",1200,180,400,5,[99,94,95,50,54,97,88,90],"B15","The largest bear the earth ever carried. The arena floor has been reinforced. The gladiators have not."]
];
const BAUART={A:'Sun Bear',B:'Sloth Bear',C:'Spectacled Bear',D:'Panda',E:'Asian Black Bear',F:'American Black Bear',G:'Brown Bear',H:'Polar Bear',I:'Prehistoric'};
// Gestalt je Sorte (Standard = Europäischer Braunbär). Sorten ohne eigenes shape gelten als noch nicht gebaut.
const SHAPE0={head:'br',L:43,leg:1,bulk:1,hump:4.2,belly:0,neck:12,headS:1.1,snout:1,ear:1,stop:1,claw:3.4,shag:1,legW:1,tail:1};
const SHAPE_INFO=[['L','Rumpflänge',34,52,.5],['leg','Beinlänge',.7,1.4,.01],['bulk','Rumpfdicke',.7,1.4,.01],['hump','Schulterbuckel',0,9,.1],['belly','Bauch',-2,6,.1],['neck','Halslänge',7,20,.5],['headS','Kopfgröße',.7,1.4,.01],['snout','Schnauzenlänge',.6,1.5,.01],['ear','Ohrgröße',.5,2,.01],['stop','Stirnabsatz',0,2,.05],['claw','Krallenlänge',1,7,.1],['shag','Fell-Zotteln',0,2.5,.05],['legW','Beindicke',.7,1.4,.01],['tail','Schwanz',0,2.5,.05]];
const SHAPES_BY={brown:{}};
const BREEDS=ROH.map(([id,name,bauart,kg0,cm0,up0,skulls,w,step,desc])=>{const werte={};STATS.forEach(([k],i)=>werte[k]=w[i]);
 return {id,name,bauart,group:BAUART[bauart],kg0,cm0,up0,skulls,werte,step,desc,built:!!SHAPES_BY[id],shape:SHAPES_BY[id]||null,soll:Math.round(kampfOf(werte)*10)/10};});
const breed=id=>BREEDS.find(b=>b.id===id)||BREEDS.find(b=>b.id==='brown');
const shapeOf=d=>{const B=breed((d?.bear||d)?.breed||d);return B._sh||(B._sh={...SHAPE0,...(B.shape||{})});};
BAER.BREEDS=BREEDS;BAER.STATS=STATS;BAER.KAMPF=KAMPF;BAER.kampfOf=kampfOf;BAER.BAUART=BAUART;BAER.SHAPE0=SHAPE0;BAER.SHAPE_INFO=SHAPE_INFO;BAER.breed=breed;BAER.shapeOf=shapeOf;
BAER.skullsOf=B=>(typeof B==='string'?breed(B):B).skulls;// bis zum Einmessen (B28) aus der Tabelle

// ---------------------------------------------------------------- Fell und Köpfe (Sorten tragen sich in dist/baer-koepfe.js ein)
BAER.COATS={_:[{id:'brown',name:'Brown',w:1,base:'#6b4a2e',light:'#8c6843',shade:'#4c3320',dark:'#2c1d12',muzzle:'#a78760',claw:'#d8c8a2'}]};
BAER.HEADS={};
const NAMES=['Ursus','Brutus','Bruno','Goliath','Honeytooth','Grumble','Old Scratch','Mange','Lard','Widowmaker','Tiny','Nero','Maul','Clawdius','Otho','Gnasher','Winter','Hunger','Butcher','Sweetie','Moloch','Barrel','Crusher','Nap','Tallow','Bonecrack','Vespasian','Pudding','Gravel','Mercy'];
const hex2=n=>cl(Math.round(n),0,255).toString(16).padStart(2,'0');
const MIX=new Map();
function mix(a,b,t){const key=a+b+t;let v=MIX.get(key);if(v)return v;const pa=parseInt(a.slice(1,7),16),pb=parseInt(b.slice(1,7),16);
 v='#'+hex2(lerp(pa>>16,pb>>16,t))+hex2(lerp(pa>>8&255,pb>>8&255,t))+hex2(lerp(pa&255,pb&255,t));if(MIX.size>4000)MIX.clear();MIX.set(key,v);return v;}
const shadeHex=(h,f)=>'#'+[1,3,5].map(i=>hex2(parseInt(h.slice(i,i+2),16)*f)).join('');
BAER.mix=mix;

// ---------------------------------------------------------------- Einen Bären würfeln (Verfahren der Hunde: DOG.create)
// Größe und Gewicht: Faktor 0,88–1,12 um die Sortengröße, Gewicht wächst mit der Größe und etwas mit der Kraft-Anlage
function sizeOf(B,groesse,kraftCap,bulk){const f=cl(1+(groesse-50)*.005,.88,1.12);
 return {height:Math.round(B.cm0*f),upright:Math.round(B.up0*f),weight:Math.round(B.kg0*Math.pow(f,2.6)*(.94+.12*bulk)*(1+(kraftCap-B.werte.kraft)*.003))};}
function create(breedId='brown',seed=(Math.random()*4294967296)>>>0){const B=breed(breedId),r=mulberry(seed),caps={},stats={};
 for(const [k] of STATS){const m=B.werte[k];caps[k]=bern(r,m);stats[k]=Math.min(caps[k],bern(r,m-20));}
 const coats=BAER.COATS[B.id]||BAER.COATS._;let tw=coats.reduce((a,c)=>a+(c.w||1),0),x=r()*tw,coat=coats[0];for(const c of coats){x-=(c.w||1);if(x<=0){coat=c;break;}}
 const f=.93+r()*.14,colors={};for(const k of ['base','light','shade','dark','muzzle','claw'])colors[k]=k==='claw'?coat[k]:shadeHex(coat[k],f);
 const groesse=bern(r,50,12),bulk=r(),sz=sizeOf(B,groesse,caps.kraft,bulk);
 return {id:'baer-'+seed.toString(36),seed,wv:1,breed:B.id,breedName:B.name,soll:B.soll,name:NAMES[Math.floor(r()*NAMES.length)],sex:r()<.6?'Boar':'Sow',ageYears:5+Math.floor(r()*14),
  groesse,bulk,height:sz.height,upright:sz.upright,weight:sz.weight,stats,caps,appearance:{coat:coat.id,coatName:coat.name,colors,scarSeed:Math.floor(r()*1e6)},wins:0,losses:0,kills:0,dead:false};}
// Talent wie DOG.talent: 63 ist der Durchschnitt der Sorte
const talent=D=>{const B=breed(D.breed);return Math.round(cl(63+3.5*STATS.reduce((a,[k])=>a+(D.caps[k]-B.werte[k]),0)/STATS.length,1,99));};
// Zeichenmaß: 47 Einheiten Schulterhöhe = Bezugsbär (105 cm)
const params=D=>({sz:D.height/(47*CM)});
BAER.create=create;BAER.sizeOf=sizeOf;BAER.talent=talent;BAER.params=params;
// Bühnenfigur: ein Bär mit Haltung (wird vom Editor und später von Kampf und Käfig benutzt)
BAER.actor=(D,mode='stand')=>({id:D.id,bear:D,P:params(D),mode,pose:null,queue:[]});

// ---------------------------------------------------------------- Grundformen (wie dist/hund.js)
function rr(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));}
function poly(c,pts,col){c.fillStyle=col;c.beginPath();for(let i=0;i<pts.length;i++){const x=Math.round(pts[i][0]*2)/2,y=Math.round(pts[i][1]*2)/2;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fill();}
function disk(c,x,y,r,col){c.fillStyle=col;c.beginPath();c.arc(Math.round(x*2)/2,Math.round(y*2)/2,Math.max(.5,r),0,TAU);c.fill();}
function seg(c,x,y,xx,yy,w,col){c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();}
function limb(c,x,y,xx,yy,w1,w2,col){const dx=xx-x,dy=yy-y,l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;poly(c,[[x+nx*w1/2,y+ny*w1/2],[xx+nx*w2/2,yy+ny*w2/2],[xx-nx*w2/2,yy-ny*w2/2],[x-nx*w1/2,y-ny*w1/2]],col);disk(c,x,y,w1/2,col);disk(c,xx,yy,w2/2,col);}
// Gelenk aus zwei Knochen (wie ik in dist/hund.js)
function ik(jx,jy,fx,fy,a,b,dir){let dx=fx-jx,dy=fy-jy,dd=Math.hypot(dx,dy);const mx=a+b-.05;if(dd>mx){fx=jx+dx/dd*mx;fy=jy+dy/dd*mx;dx=fx-jx;dy=fy-jy;dd=mx;}dd=Math.max(dd,Math.abs(a-b)+.1);
 const th=Math.atan2(dy,dx),al=Math.acos(cl((a*a+dd*dd-b*b)/(2*a*dd),-1,1)),an=th+dir*al;return {kx:jx+Math.cos(an)*a,ky:jy+Math.sin(an)*a,fx,fy};}
BAER.prim={rr,poly,disk,seg,limb,hrand};

// ---------------------------------------------------------------- Haltungen
// Jede Haltung ist ein Satz Zahlen; Übergänge mischen die Zahlen weich. Die Hinterfüße stehen in allen Haltungen
// an derselben Stelle (ax), nichts rutscht: Beim Hinsetzen sinkt der Hintern hinter die Füße, beim Aufrichten hebt sich der Rumpf darüber.
// hx,hy Becken · p Neigung des Rumpfs (0 waagerecht) · bend Buckel der Wirbelsäule · ax,ay Sprunggelenk hinten · wx,wy Handgelenk vorn
// pa Neigung der Vorderpranke · ne Hals (Winkel nach oben) · he Kopf (Winkel nach oben) · sag Bauch sackt durch
const MODES=['stand','sit','lie','rear'];
function poseSet(mode,SH){const lf=SH.leg,L=SH.L,A0=-L/2-3.5,rH=12*SH.bulk,reach=27*lf;
 if(mode==='sit'){const hx=A0-12.5*lf,hy=-rH*.86,p=1.0,sx=hx+L*Math.cos(p),sy=hy-L*Math.sin(p);return {hx,hy,p,bend:4.5,ax:A0,ay:-5.2,wx:sx+5,wy:sy+23.5*lf,pa:-1.2,ne:.42,he:-.16,sag:2};}
 if(mode==='lie'){const hx=-L/2-1,hy=-rH*.84;return {hx,hy,p:0,bend:-.4,ax:A0,ay:-5,wx:hx+L+15*lf,wy:-5.2,pa:0,ne:-.3,he:-.03,sag:3};}
 if(mode==='rear'){const hx=A0+3,hy=-(5.2+reach*.94),p=1.4,sx=hx+L*Math.cos(p),sy=hy-L*Math.sin(p);return {hx,hy,p,bend:1.8,ax:A0,ay:-5.2,wx:sx+9.5,wy:sy+17*lf,pa:-1.25,ne:.95,he:-.12,sag:3.2};}
 const hx=-L/2,hy=-(5.2+reach*.9),p=.02;return {hx,hy,p,bend:0,ax:A0,ay:-5.2,wx:hx+L*Math.cos(p)-.5,wy:-5.4,pa:0,ne:-.32,he:-.3,sag:0};}
const KEYS=['hx','hy','p','bend','ax','ay','wx','wy','pa','ne','he','sag'];
const ease=u=>u*u*u*(u*(u*6-15)+10);
// Aktuelle Haltung (gemischt). Schwere Bären brauchen länger.
function curPose(a,t,SH){const P=a.pose;if(!P||P.mode!==a.mode&&!P.to){const set=poseSet(a.mode,SH);a.pose={mode:a.mode,cur:set,to:null};return set;}
 if(P.to){const u=cl((t-P.t0)/P.dur,0,1),e=ease(u),cur={};for(const k of KEYS)cur[k]=lerp(P.from[k],P.to[k],e);
  const dw=Math.abs(P.to.wx-P.from.wx)+Math.abs(P.to.wy-P.from.wy);if(dw>4&&P.to.wy>-8&&P.from.wy>-8)cur.wy-=Math.sin(Math.PI*u)*Math.min(5,dw*.25);// Pranke wird gehoben, nicht geschoben
  P.cur=cur;if(u>=1){P.to=null;P.cur=poseSet(P.mode,SH);if(a.queue.length)setMode(a,a.queue.shift(),t,true);}return P.cur;}
 return P.cur=poseSet(P.mode,SH);}
// Haltung wechseln. Zwischen Liegen und Aufgerichtet geht es über den Stand (kein Sprung).
function setMode(a,mode,t=performance.now()/1000,queued=false){if(!MODES.includes(mode))return;const SH=a.SH||shapeOf(a.bear);if(!queued)a.queue.length=0;
 const from={...curPose(a,t,SH)},was=a.pose?.mode||a.mode;if(mode===was&&!a.pose?.to)return;
 if(!queued&&((was==='lie'&&mode==='rear')||(was==='rear'&&mode==='lie'))){a.queue.push(mode);mode='stand';}
 const heavy=cl(a.bear.weight/400,.3,2),dur=(mode==='rear'||was==='rear'?1.5:1.0)+.45*heavy;
 a.mode=mode;a.pose={mode,from,to:poseSet(mode,SH),t0:t,dur,cur:from};}
BAER.MODES=MODES;BAER.setMode=setMode;BAER.poseSet=poseSet;
BAER.snap=(a,mode)=>{a.mode=mode;a.pose=null;a.queue.length=0;};
BAER.moving=a=>!!(a.pose&&a.pose.to)||a.queue.length>0;

// ---------------------------------------------------------------- Skelett
function rig(a,t,SH){const C=curPose(a,t,SH),lf=SH.leg,L=SH.L,D=a.bear,ph=(D.seed%97)*.13;
 const breathe=Math.sin(t*1.45+ph),still=1-cl(Math.abs(C.p-.02)*.4,0,.5);
 const p=C.p,Tx=Math.cos(p),Ty=-Math.sin(p),Nx=-Math.sin(p),Ny=-Math.cos(p),fem=14*lf,tib=13*lf,hum=13*lf,rad=14*lf;
 let hx=C.hx,hy=C.hy+breathe*.12;
 // Hinterfüße stehen fest: reicht das Bein im Übergang nicht, gibt das Becken nach, nicht der Fuß
 {const jx=hx+2*Tx-2.5*Nx,jy=hy+2*Ty-2.5*Ny,dx=C.ax-jx,dy=C.ay-jy,d=Math.hypot(dx,dy),mx=fem+tib-.4;if(d>mx){hx+=dx/d*(d-mx);hy+=dy/d*(d-mx);}}
 const sx=hx+L*Tx,sy=hy+L*Ty;
 const leg=(front,near)=>{const off=near?0:1;
  if(front){const jx=sx-1*Tx-1.2*Nx+off*1.2,jy=sy-1*Ty-1.2*Ny-off*.6,fx=C.wx-off*(3.2-6*Math.abs(Ty)),fy=C.wy-off*Math.abs(Ty)*1.5;const r=ik(jx,jy,fx,fy,hum,rad,1);
   return {front,near,jx,jy,kx:r.kx,ky:Math.min(r.ky,-6.4*SH.legW),fx:r.fx,fy:Math.min(r.fy,-5.2*SH.legW),ang:C.pa};}
  const jx=hx+2*Tx-2.5*Nx-off*1.2,jy=hy+2*Ty-2.5*Ny-off*.5,fx=C.ax+off*3.4,fy=C.ay;const r=ik(jx,jy,fx,fy,fem,tib,-1);
  return {front,near,jx,jy,kx:r.kx,ky:Math.min(r.ky,-7*SH.legW),fx:r.fx,fy:Math.min(r.fy,-5*SH.legW),ang:0};};
 const nbx=sx+3*Tx+3*Nx,nby=sy+3*Ty+3*Ny,nod=breathe*.015*still;
 const hcx=nbx+SH.neck*Math.cos(C.ne+nod),hcy=nby-SH.neck*Math.sin(C.ne+nod);
 return {C,p,Tx,Ty,Nx,Ny,hx,hy,sx,sy,L,breathe,legs:[leg(false,false),leg(true,false),leg(false,true),leg(true,true)],nbx,nby,hcx,hcy,he:C.he+nod,
  cx:(hx+sx)/2,lie:cl(1-Math.abs(hy+10)/8,0,1)*(1-cl(p,0,1))};}
BAER.rig=(a,t)=>rig(a,t,a.SH||shapeOf(a.bear));

// ---------------------------------------------------------------- Zeichner
const G=-.25;// nichts reicht unter den Boden: Speck und Fell legen sich auf
function drawBear(c,a,px,py,k,face,opt={}){const D=a.bear,col=D.appearance.colors,SH=a.SH||shapeOf(D),sz=(a.P||(a.P=params(D))).sz,t=opt.time??performance.now()/1000;
 const R=rig(a,t,SH),{Tx,Ty,Nx,Ny,hx,hy,sx,sy,L,C}=R,bk=SH.bulk,lw=SH.legW,seed=D.seed%1000;
 const base=col.base,light=col.light,shade=col.shade,dark=col.dark,legC=mix(base,dark,.34),farC=mix(dark,shade,.45),clawC=col.claw;
 c.save();c.translate(px,py);c.scale(k,k);
 if(!opt.noShadow){c.fillStyle='#1c140c50';c.beginPath();c.ellipse(face*R.cx*sz,1.2,(L*.5+18+R.lie*8)*sz*(1-cl(R.p,0,1.4)*.35),(4.2+R.lie)*sz,0,0,TAU);c.fill();}
 c.scale(face*sz,sz);
 const gy=y=>Math.min(y,G);
 const blob=(x,y,r,cc)=>{const pts=[];for(let i=0;i<16;i++){const an=i/16*TAU;pts.push([x+Math.cos(an)*r,gy(y+Math.sin(an)*r)]);}poly(c,pts,cc);};
 // ---- Pranke und Fuß mit Krallen
 function claws(x,y,dx,dy,h,n){const len=SH.claw;for(let i=0;i<n;i++){const o=(i-(n-1)/2)*h*.24,bx=x-dy*o,by=y+dx*o;seg(c,bx,by,bx+dx*len*.8-dy*len*.12,gy(by+dy*len*.8+dx*len*.12+len*.28),.75,clawC);}}
 function drawLeg(l){const cc=l.near?legC:farC,up=l.near?mix(base,legC,.35):farC;
  if(l.front){limb(c,l.jx,Math.min(l.jy,-8*lw*bk),l.kx,l.ky,16*lw*bk,12.5*lw,up);limb(c,l.kx,l.ky,l.fx,l.fy,12.5*lw,10.4*lw,cc);
   const dx=Math.cos(l.ang),dy=-Math.sin(l.ang),pr=3.1*lw,x0=l.fx-dx*1.2,y0=l.fy-dy*1.2+2.2,x1=l.fx+dx*6.6,y1=l.fy+dy*6.6+2.2,gp=y=>Math.min(y,-pr);
   limb(c,x0-dx*2.6,gp(y0-dy*2.6),x1,gp(y1),6.2*lw,5.2*lw,cc);claws(x1+dx*2,gp(y1)+dy*2+.2,dx,dy,5.2*lw,4);}
  else{limb(c,l.jx,Math.min(l.jy,-10*lw*bk),l.kx,l.ky,20*lw*bk,14*lw,up);limb(c,l.kx,l.ky,l.fx,l.fy,13.5*lw,10*lw,cc);
   {const fr=2.9*lw,yf=Math.min(l.fy+2.2,-fr);limb(c,l.fx-3.6,yf,l.fx+9.6,yf+.4,5.8*lw,4.8*lw,cc);claws(l.fx+11.4,yf+.5,1,0,4.8*lw,3);}}}
 drawLeg(R.legs[0]);drawLeg(R.legs[1]);
 // ---- Rumpf: Wirbelsäule als Bogen vom Becken zur Schulter, oben Rücken mit Buckel, unten Bauch
 const top=[],bot=[],n=14,mx=(hx+sx)/2+Nx*C.bend*2,my=(hy+sy)/2+Ny*C.bend*2,br=R.breathe*.35;
 for(let i=0;i<=n;i++){const u=i/n,q=1-u,x=q*q*hx+2*u*q*mx+u*u*sx,y=q*q*hy+2*u*q*my+u*u*sy;
  let tx=2*q*(mx-hx)+2*u*(sx-mx),ty=2*q*(my-hy)+2*u*(sy-my);const tl=Math.hypot(tx,ty)||1;tx/=tl;ty/=tl;const nx=ty,ny=-tx;// zeigt zum Rücken
  const rt=(12.4-1.1*Math.sin(Math.PI*cl(u/.7,0,1))+1.4*u)*bk+SH.hump*Math.exp(-Math.pow((u-.82)/.22,2));
  const rb=(13+(1.8+SH.belly+C.sag)*Math.sin(Math.PI*cl((u-.05)/.9,0,1))+br*Math.sin(Math.PI*u))*bk;
  top.push([x+nx*rt,gy(y+ny*rt)]);bot.push([x-nx*rb,gy(y-ny*rb)]);}
 disk(c,hx-Tx*10.5*bk+Nx*5*bk,hy-Ty*10.5*bk+Ny*5*bk,2.4*SH.tail,shade);// Stummelschwanz
 blob(hx,hy,12.6*bk,base);blob(sx,sy,13.6*bk,base);
 poly(c,[...top,...[...bot].reverse()],base);
 // Brust vorn (zwischen Schulter und Hals) und Hals
 const nw=24*bk;limb(c,sx+Tx*1,Math.min(sy+Ty*1,-nw/2),R.hcx,Math.min(R.hcy,-7.75*SH.headS),nw,15.5*SH.headS,base);
 // Schattierung: Bauch dunkler, Rücken und Buckel heller
 poly(c,bot.slice(1,n).map(([x,y])=>[x+Nx*3.4,gy(y+Ny*3.4)]).concat(bot.slice(1,n).reverse()),shade);
 poly(c,top.slice(2,n).concat(top.slice(2,n).reverse().map(([x,y],i)=>{return [x-Nx*2,y-Ny*2];})),light+'90');
 // Zotteln: am Bauch hängend, am Rücken und Buckel abstehend (fest je Bär, flimmert nicht)
 if(SH.shag>0){const s=SH.shag;for(let i=1;i<n;i++){const [x,y]=bot[i],h=hrand(i*3.7+seed);if(y<G-1){seg(c,x,y-.6,x-1.3-h,gy(y+.9*s+h*s),.9,shade);seg(c,x+1.8,y-.6,x+.8-h,gy(y+.6*s+h*.8*s),.8,mix(shade,dark,.4));}
   if(i%2){const [X,Y]=top[i];seg(c,X,Y+.6,X-1.3*s-h*s*.6,Y-.15*s-h*.35*s,.9,mix(base,light,.5));}}
  for(let i=0;i<4;i++){const u=.25+i*.2,h=hrand(i*9.1+seed);seg(c,lerp(sx,R.hcx,u)-Nx*-8*bk*(1-u*.3),gy(lerp(sy,R.hcy,u)+ (8*bk*(1-u*.3))),lerp(sx,R.hcx,u)-1.5,gy(lerp(sy,R.hcy,u)+9.5*bk*(1-u*.3)+h*1.6*s),.9,shade);}}
 drawLeg(R.legs[2]);drawLeg(R.legs[3]);
 // ---- Kopf (Zeichner je Sorte)
 c.save();c.translate(R.hcx,Math.min(R.hcy,G-6.5*SH.headS));c.rotate(-R.he);c.scale(SH.headS,SH.headS);
 (BAER.HEADS[SH.head]||headPlain)(c,D,SH,col,{t,breathe:R.breathe,prim:BAER.prim});c.restore();
 c.restore();return R;}
function headPlain(c,D,SH,col){disk(c,0,0,7.6,col.base);poly(c,[[3,-5],[13.5,-2],[14,1.5],[6,5],[0,6]],col.base);rr(c,12.4,-2.2,2,2,'#17100c');rr(c,4.6,-2.6,1.2,1.2,'#120c08');}
BAER.draw=drawBear;
})();
