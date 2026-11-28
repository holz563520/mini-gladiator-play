'use strict';
// =====================================================================================================
// ARENA THEORY · STIERE UND OCHSEN (eigenständige Testversion, ändert keine Spieldatei, hängt nicht an window.MG)
// · Modell wie bei Hunden, Bären und Katzen (dist/hund.js, dist/baer.js, dist/katze.js): jede Rasse hat Sollwerte je Wert,
//   das einzelne Tier bekommt Anlage (64 Bernoulli-Versuche um den Rassenwert) und Istwert (um Rassenwert minus 20).
// · Zwölf Werte: acht Kampfwerte und vier Zugwerte (die Ausdauer zählt für beides). Jede Rasse gibt es als Stier (form 'bull')
//   und als Ochse (form 'ox'): feste Verschiebung der Sollwerte, 5 % höher, 15 % längere Hörner, schmaler Hals, kein Nackenkamm.
// · Pixelgrafik: alle Formen werden in ganze Rasterkästchen zerlegt (STIER.PX; Grundformen übernommen von KATZE.PX / BAER.PX).
// · Zeichner: Rind in Seitenansicht aus einem Skelett (Paarhufer, steifer gerader Rücken, Nackenkamm, Wamme, Quastenschwanz),
//   Haltungen Stand und Liegen mit weichem Übergang. Hörner als räumliche Kurve, dieselbe Kurve für Seiten- und Vorderansicht.
//   Köpfe (Seite und vorn), Hörner und Fell je Rasse: dist/stier-koepfe.js. Bewegung und Drehung folgen in ST2.
// · Rassenliste und Werte: STIER_SORTEN.md. Fahrplan: STIER_FAHRPLAN.md. Editor: dist/stier-editor.html.
// Maßstab wie im Spiel: 81 Einheiten = 180 cm → 2,22 cm je Einheit.
// =====================================================================================================
(()=>{
const TAU=Math.PI*2,CM=180/81,cl=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
const STIER={};window.STIER=STIER;STIER.CM=CM;

// ---------------------------------------------------------------- Zufall (wie dist/hund.js, dist/baer.js, dist/katze.js)
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function bern(r,mean,n=64){let hits=0;const p=cl((mean-1)/99,.01,.98);for(let i=0;i<n;i++)if(r()<p)hits++;return Math.round(1+99*hits/n);}
function hrand(s){const x=Math.sin(s*12.9898)*43758.5453;return x-Math.floor(x);}

// ---------------------------------------------------------------- Werte: [Kennung, Bedienung (Deutsch), Spiel (Englisch)]
const STATS=[['kraft','Kraft','Strength'],['horn','Hornstoß','Horn Thrust'],['ramm','Rammen','Ram'],['tempo','Schnelligkeit','Speed'],['ausdauer','Ausdauer','Stamina'],['zaeh','Zähigkeit','Toughness'],['wild','Wildheit','Ferocity'],['mut','Mut','Courage']];
const ZSTATS=[['zug','Zugkraft','Draft Power'],['folg','Folgsamkeit','Obedience'],['tritt','Trittsicherheit','Sure-footedness'],['genug','Genügsamkeit','Thrift']];
const ALL=[...STATS,...ZSTATS];
// Gewichte je Wert (Vorschlag aus ST0, wird in ST19 eingemessen). Soll = gewichtetes Mittel.
const KAMPF={kraft:1.3,horn:1.4,ramm:1.2,tempo:.6,ausdauer:.4,zaeh:1.3,wild:1.1,mut:1};
const ZUG={zug:1.5,ausdauer:1.2,folg:1.2,tritt:.6,genug:.5};
const wmean=G=>{const ks=Object.keys(G),sum=ks.reduce((a,k)=>a+G[k],0);return v=>ks.reduce((a,k)=>a+(v[k]||0)*G[k],0)/sum;};
const kampfOf=wmean(KAMPF),zugOf=wmean(ZUG);
// Gefahrenköpfe aus dem Kampf-Soll, Joche aus dem Zug-Soll (Grenzen aus STIER_SORTEN.md, gerechnet mit dem ungerundeten Soll wie in der Tabelle)
const SKULLS=[45,61,70,80],YOKES=[62,70,76,82];
const skullsOf=soll=>1+SKULLS.filter(x=>soll>=x).length,yokesOf=soll=>1+YOKES.filter(x=>soll>=x).length;
// Vom Stier zum Ochsen: feste Verschiebung. Wildrinder und Urzeitrinder (wild) bekommen nur +10 Folgsamkeit.
const OX={wild:-25,mut:-15,horn:-5,tempo:-5,folg:30,ausdauer:10,zug:5},OX_WILD_FOLG=10,OX_SIZE=1.05,OX_HORN=1.15;

// ---------------------------------------------------------------- Rassen (aus STIER_SORTEN.md, Reihenfolge wie dort)
// [Kennung, englischer Name, Bauart, kg, Schulterhöhe cm, Hornlänge cm, Spannweite cm, acht Kampfwerte K H R T A Z W M, vier Zugwerte Zk F S N,
//  Schritt im Fahrplan, ausgestorben, Wildrind, Satz Stier, Satz Ochse]
const ROH=[
 ["camargue","Camargue Bull","A",400,130,45,60,[50,68,55,78,62,55,80,78],[46,22,75,80],"ST12",0,0,"Small, black and raised in a swamp. It has been chased by men on white horses all its life and has opinions about it.","The lead ox of the marsh herds. It wears a bell so the others know where to follow, and so you know where to run."],
 ["kangayam","Kangayam Bull","A",520,140,60,55,[58,66,60,74,72,62,74,76],[72,46,70,78],"ST12",0,0,"In its homeland young men prove themselves by hanging on to its hump. The hump has a perfect record.","Pulls a loaded cart through the midday heat without complaint. The complaint was removed with the rest."],
 ["lidia","Spanish Fighting Bull","A",550,135,45,70,[62,86,74,76,50,68,95,96],[55,8,60,60],"ST1",0,0,"Bred for five hundred years to charge whatever moves. You moved.","A steer of the fighting breed, kept to lead the bulls calmly out of the ring. Calm is a relative term in this family."],
 ["hungrey","Hungarian Grey","B",850,150,80,140,[74,70,68,55,74,70,50,58],[78,52,70,82],"ST11",0,0,"Walked from the steppe to the markets of half a continent on its own legs. It was not asked then either.","Four of these drag a siege engine through spring mud. Two will do for your corpse."],
 ["maremmana","Maremmana","B",900,152,90,130,[76,72,70,52,78,74,55,62],[84,52,78,80],"ST11",0,0,"Grey cattle of the fever marshes. The herdsmen ride with a long hooked pole and keep it between themselves and the horns.","Drew the ploughs that fed the capital. Nobody carved a statue of it; they were busy carving the bull."],
 ["chianina","Chianina","B",1200,175,25,50,[88,45,80,50,70,76,38,50],[95,58,60,50],"ST11",0,0,"The tallest cattle in the world, white as an altar cloth. Gentle, mostly. A ton of gentle still lands on something.","The white ox of triumphs and sacrifices. It pulled the general's wagon on Monday and met the priest on Tuesday."],
 ["watusi","Ankole-Watusi","C",600,145,100,200,[62,60,50,55,64,58,40,52],[50,45,60,85],"ST13",0,0,"The horns are mostly hollow and keep it cool. Being hit with one is not noticeably hollow.","Kings counted their wealth in these. The arena counts differently."],
 ["longhorn","Texas Longhorn","C",800,140,90,200,[72,70,62,58,76,66,55,60],[62,42,72,84],"ST13",0,0,"Went wild for three hundred years and came back all horn and gristle. Turns its head and clears a bench.","A steer grows the longest horns of all. It walked a thousand miles to be eaten and would like to discuss that."],
 ["minizebu","Miniature Zebu","D",200,100,12,25,[30,30,28,60,60,35,45,55],[18,55,66,90],"ST14",0,0,"Hip-high and furious. The crowd laughs until it finds a kneecap.","Pulls a cart the size of a wheelbarrow. Children love it. The feeling is not returned."],
 ["brahman","Brahman","D",850,150,30,50,[74,50,70,62,78,70,58,60],[78,45,64,82],"ST14",0,0,"Sweats through its skin, shrugs off flies and heat, and watches you with half-closed eyes. It is not asleep.","Works all day under a sun that kills the driver. Finishes the furrow anyway."],
 ["yak","Yak","E",550,135,60,90,[60,55,58,45,85,78,50,55],[58,50,95,88],"ST15",0,0,"Does not moo. It grunts, like a man lifting something heavy. Usually you.","Carries salt over passes where the air runs out. Has never once looked down."],
 ["highland","Highland","E",700,120,70,130,[66,60,58,42,66,76,35,50],[56,55,85,86],"ST15",0,0,"Cannot see you through the fringe. Aims at the noise.","Stands in sleet for a week and calls it weather. Pulls a peat cart at the pace of a funeral, which it often is."],
 ["waterbuffalo","Water Buffalo","F",900,140,90,120,[78,62,72,42,72,78,48,66],[90,58,82,70],"ST16",0,0,"Children ride it to the fields. Strangers are carried back from them.","Ploughs knee-deep in mud all day and sleeps in it at night. Do not stand between it and the water."],
 ["cape","Cape Buffalo","F",750,155,80,100,[74,82,84,64,68,88,92,95],[60,3,66,70],"ST16",0,1,"Looks at you as if you owe it money. Hunters call it the widow maker; it circles back to wait for whoever follows the blood.","Somebody put a yoke on one. He is survived by the yoke."],
 ["wisent","European Bison","G",800,180,40,65,[74,62,84,62,62,80,76,78],[62,6,70,72],"ST17",0,1,"The last wild cattle of the old forests. Clears a man-high fence from a standstill, then discusses the fence.","A forest bison in harness. The cart went where the bison went."],
 ["bison","American Bison","G",900,180,40,75,[78,60,90,66,68,84,78,80],[66,5,68,74],"ST17",0,1,"Carries its head like a battering ram because that is what it is. Runs as fast as a horse, which surprises people exactly once.","Pulls like two oxen for as long as it agrees with the direction."],
 ["gaur","Gaur","G",1100,190,80,95,[88,78,88,58,62,88,72,84],[78,6,72,62],"ST17",0,1,"The largest wild cattle alive, muscled like a statue of itself. Tigers take the calves and apologise to the bulls.","Stronger than any ox ever bred. It has not been informed that it is an ox."],
 ["aurochs","Aurochs","H",1000,175,80,110,[84,92,86,80,72,86,96,94],[80,10,72,66],"ST18",1,1,"Caesar wrote that it spares neither man nor beast and cannot be tamed even as a calf. The last one died in a royal forest. This one did not get the message.","Every ox that ever pulled a plough descends from this. It regards the plough as a personal insult."],
 ["latifrons","Giant Long-horned Bison","H",1600,230,110,213,[97,72,99,56,58,96,80,86],[92,4,60,50],"ST18",1,1,"A bison taller than a mounted man, with horns as wide as a gate. The gate was widened. The far wall is next.","The harness took a week to build and a moment to wear."],
 ["pelorovis","Giant Horned Buffalo","H",1200,185,150,240,[90,84,88,54,62,92,84,90],[82,4,62,58],"ST18",1,1,"Its horns span three men lying head to foot. By evening somebody has checked.","Cannot walk between two trees. Does not walk around them either."]
];
const BAUART={A:'Fighting Cattle',B:'Draft Cattle',C:'Longhorn',D:'Zebu',E:'Mountain Cattle',F:'Buffalo',G:'Wild Cattle',H:'Prehistoric'};
const FORMS=['bull','ox'],FORM_NAME={bull:'Bull',ox:'Ox'};
// Gestalt je Rasse (Standard = Spanischer Kampfstier als Stier). Rassen ohne eigenes shape gelten als noch nicht gebaut.
// Hörner: hornLen Länge entlang der Krümmung (Einheiten bei Größe 1), hornThick Dicke, Richtung der Spitze im Stand: hornFwd nach vorn, hornUp nach oben,
// hornOut nach außen (negativ: Spitzen neigen sich zueinander); der Ansatz geht immer zur Seite.
const SHAPE0={head:'lidia',L:42,leg:1,bulk:1,chest:.95,rump:1,wither:2,crest:1,hump:0,neck:13,neckW:1,headS:1.12,face:1,dewlap:1,ear:1,tail:1,legW:1.08,hoof:1,hornLen:17.6,hornThick:1,hornFwd:.45,hornUp:.9,hornOut:.1};
const SHAPE_INFO=[['L','Rumpflänge',36,60,.5],['leg','Beinlänge',.7,1.4,.01],['bulk','Rumpfdicke',.7,1.4,.01],['chest','Brusttiefe',.6,1.5,.01],['rump','Hinterhand',.7,1.3,.01],['wither','Widerrist',0,6,.1],['crest','Nackenkamm',0,1.8,.01],['hump','Buckel',0,2,.05],
 ['neck','Halslänge',8,22,.5],['neckW','Halsdicke',.6,1.4,.01],['headS','Kopfgröße',.7,1.4,.01],['face','Gesichtslänge',.6,1.5,.01],['dewlap','Wamme',0,2.5,.05],['ear','Ohrgröße',.5,2.5,.01],['tail','Schwanzlänge',.4,1.4,.01],['legW','Beindicke',.7,1.5,.01],['hoof','Hufgröße',.7,1.6,.01],
 ['hornLen','Horn: Länge',2,70,.1],['hornThick','Horn: Dicke',.5,3,.05],['hornFwd','Horn: Richtung nach vorn',-1,1,.05],['hornUp','Horn: Richtung nach oben',-1,1,.05],['hornOut','Horn: Schwung nach außen',-1,1,.05]];
// Spanischer Kampfstier: trocken bemuskelt, schwere Vorderhand, mächtiger Nackenkamm, kurze Haken zur Seite, dann nach vorn und oben
const SHAPES_BY={lidia:{}};
// Ochse: dieselbe Rasse, schmaler Hals, kaum Nackenkamm, etwas schmalerer Rumpf, längere Hörner (die Größe +5 % kommt über die Schulterhöhe)
const OX_SHAPE={crest:.28,neckW:.84,bulk:.96,chest:.96,dewlap:1.15,hornLen:OX_HORN};
const werteOf=(w,form,wild)=>{if(form!=='ox')return {...w};const v={...w};for(const k in OX)v[k]=cl(v[k]+(k==='folg'&&wild?OX_WILD_FOLG:OX[k]),1,100);return v;};
const BREEDS=ROH.map(([id,name,bauart,kg0,cm0,horn0,span0,k,z,step,extinct,wild,desc,descOx])=>{const werte={};STATS.forEach(([s],i)=>werte[s]=k[i]);ZSTATS.forEach(([s],i)=>werte[s]=z[i]);
 const ox=werteOf(werte,'ox',!!wild),r1=x=>Math.round(x*10)/10;
 return {id,name,bauart,group:BAUART[bauart],kg0,cm0,horn0,span0,werte,werteOx:ox,step,extinct:!!extinct,wild:!!wild,desc,descOx,built:!!SHAPES_BY[id],shape:SHAPES_BY[id]||null,
  soll:r1(kampfOf(werte)),zugSoll:r1(zugOf(werte)),sollOx:r1(kampfOf(ox)),zugSollOx:r1(zugOf(ox)),skulls:skullsOf(kampfOf(werte)),skullsOx:skullsOf(kampfOf(ox)),yokes:yokesOf(zugOf(ox)),yokesBull:yokesOf(zugOf(werte))};});
const FIRST='lidia';
const breed=id=>BREEDS.find(b=>b.id===id)||BREEDS.find(b=>b.id===FIRST);
const formOf=d=>(d&&(d.cat||d).form)==='ox'?'ox':'bull';
// Gestalt einer Rasse in einer Form (gemerkt)
function shapeOf(d,form){const x=d&&d.cat||d,B=breed(x&&x.breed||x),f=form||formOf(d),key='_sh'+f;if(B[key])return B[key];const S={...SHAPE0,...(B.shape||{})};
 if(f==='ox')for(const k in OX_SHAPE)S[k]=Math.round(S[k]*OX_SHAPE[k]*100)/100;return B[key]=S;}
const sollOf=(B,form)=>form==='ox'?B.werteOx:B.werte;
Object.assign(STIER,{BREEDS,STATS,ZSTATS,ALL,KAMPF,ZUG,kampfOf,zugOf,BAUART,FORMS,FORM_NAME,SHAPE0,SHAPE_INFO,OX,OX_SHAPE,breed,shapeOf,sollOf,werteOf,skullsOf,yokesOf,SKULLS,YOKES,FIRST});

// ---------------------------------------------------------------- Fell, Köpfe, Hörner (Rassen tragen sich in dist/stier-koepfe.js ein)
// base Fell · light Lichter (Rücken, Schulter, nahe Beine) · shade Schatten · dark dunkel (ferne Beine, Muster) · muzzle Flotzmaul · nose Nüstern und Maulspalte
// horn Horn · hornTip Hornspitze · eye Auge · tuft Schwanzquaste und Stirnlocken · hoof Klauen
const COLKEYS=['base','light','shade','dark','muzzle','nose','horn','hornTip','eye','tuft','hoof'],FURKEYS=['base','light','shade','dark'];
STIER.COLKEYS=COLKEYS;
STIER.COATS={_:[{id:'black',name:'Black',w:1,base:'#2b2622',light:'#4a4138',shade:'#1d1916',dark:'#110e0c',muzzle:'#3d3631',nose:'#0c0a09',horn:'#e6dcc2',hornTip:'#1a1512',eye:'#1c110b',tuft:'#0f0c0a',hoof:'#15110e'}]};
STIER.HEADS={};STIER.HEADS_FRONT={};
const NAMES=['Minos','Ferdinand','Widowmaker','Buttercup','Islero','Nero','Daisy','Sulla','Old Grudge','Tiny','Granizo','Brutus','Sweetheart','Murciélago','Crassus','Gentle','Anvil','Cicero','Midnight','Princess','Tarquin','Bonesetter','Clover','Vulcan','Patience','Hannibal','Dust','Regret','Maximus','Mercy'];
const hex2=n=>cl(Math.round(n),0,255).toString(16).padStart(2,'0');
const MIX=new Map();
function mix(a,b,t){const key=a+b+t;let v=MIX.get(key);if(v)return v;const pa=parseInt(a.slice(1,7),16),pb=parseInt(b.slice(1,7),16);
 v='#'+hex2(lerp(pa>>16,pb>>16,t))+hex2(lerp(pa>>8&255,pb>>8&255,t))+hex2(lerp(pa&255,pb&255,t));if(MIX.size>4000)MIX.clear();MIX.set(key,v);return v;}
const shadeHex=(h,f)=>'#'+[1,3,5].map(i=>hex2(parseInt(h.slice(i,i+2),16)*f)).join('');
STIER.mix=mix;

// ---------------------------------------------------------------- Ein Rind würfeln (Verfahren der Hunde: DOG.create), für alle zwölf Werte
// Größe und Gewicht: Faktor 0,88–1,12 um die Rassengröße, Gewicht wächst mit der Größe und etwas mit der Kraft-Anlage. Der Ochse ist 5 % höher.
function sizeOf(B,groesse,kraftCap,bulk,form){const f=cl(1+(groesse-50)*.005,.88,1.12);
 return {height:Math.round(B.cm0*f*(form==='ox'?OX_SIZE:1)),weight:Math.round(B.kg0*Math.pow(f,2.6)*(.94+.12*bulk)*(1+(kraftCap-sollOf(B,form).kraft)*.003))};}
function create(breedId=FIRST,seed=(Math.random()*4294967296)>>>0,form='bull'){form=form==='ox'?'ox':'bull';const B=breed(breedId),W=sollOf(B,form),r=mulberry(seed),caps={},stats={};
 for(const [k] of ALL){const m=W[k];caps[k]=bern(r,m);stats[k]=Math.min(caps[k],bern(r,m-20));}
 const coats=STIER.COATS[B.id]||STIER.COATS._;let tw=coats.reduce((a,c)=>a+(c.w||1),0),x=r()*tw,coat=coats[0];for(const c of coats){x-=(c.w||1);if(x<=0){coat=c;break;}}
 const f=.94+r()*.12,colors={};for(const k of COLKEYS)colors[k]=FURKEYS.includes(k)?shadeHex(coat[k],f):coat[k];
 const groesse=bern(r,50,12),bulk=r(),sz=sizeOf(B,groesse,caps.kraft,bulk,form),horn=.9+r()*.2,hornSide=r()<.5?'L':'R';
 return {id:'stier-'+form+'-'+seed.toString(36),seed,wv:1,breed:B.id,breedName:B.name,form,formName:FORM_NAME[form],soll:form==='ox'?B.sollOx:B.soll,zugSoll:form==='ox'?B.zugSollOx:B.zugSoll,
  name:NAMES[Math.floor(r()*NAMES.length)],sex:form==='ox'?'Steer':'Bull',ageYears:4+Math.floor(r()*7),groesse,bulk,height:sz.height,weight:sz.weight,stats,caps,
  appearance:{coat:coat.id,coatName:coat.name,pattern:coat.pattern||'',colors,horn,hornSide,scarSeed:Math.floor(r()*1e6)},wins:0,losses:0,kills:0,workDays:0,dead:false};}
// Talent wie DOG.talent (63 ist der Durchschnitt der Rasse), getrennt für Kampf und Zug
const talentOver=(D,L)=>{const W=sollOf(breed(D.breed),D.form);return Math.round(cl(63+3.5*L.reduce((a,k)=>a+(D.caps[k]-W[k]),0)/L.length,1,99));};
const KKEYS=STATS.map(s=>s[0]),ZKEYS=Object.keys(ZUG);
const talent=D=>talentOver(D,KKEYS),talentZug=D=>talentOver(D,ZKEYS);
// Kampfwert auf der Skala der Arena wie DOG.kw (vorläufig, wird in ST19 eingemessen); Zugwert: Zug-Ist mit dem Gewicht (vorläufig)
const fresh=(W,of)=>of(Object.fromEntries(ALL.map(([k])=>[k,Math.max(1,W[k]-20)])));
function kw(D){const B=breed(D.breed),W=sollOf(B,D.form),soll=kampfOf(W);return Math.max(5,Math.round(Math.max(18,33+14*cl((soll-37)/7.4,-1,6))*Math.pow(Math.max(.3,kampfOf(D.stats)/fresh(W,kampfOf)),1.1)*Math.pow(D.weight/B.kg0,.25)));}
function zw(D){const B=breed(D.breed);return Math.max(1,Math.round(zugOf(D.stats)*Math.pow(D.weight/B.kg0,.25)));}
// Zeichenmaß: Die Höhe des Widerrists im Stand (in Einheiten, aus der Gestalt) entspricht der Schulterhöhe des Tiers.
const smooth=u=>u*u*(3-2*u);
const standH=SH=>30*SH.leg+9+(9.8+2.2*SH.chest)*SH.bulk+SH.wither;
const szOf=(D,SH)=>D.height/(CM*standH(SH));
Object.assign(STIER,{create,sizeOf,talent,talentZug,kw,zw,szOf,standH});
// Bühnenfigur: ein Rind mit Haltung (wird vom Editor und später von Kampf, Zug und Stall benutzt)
STIER.actor=(D,mode='stand')=>({id:D.id,cat:D,mode,pose:null,queue:[]});

// ---------------------------------------------------------------- Grundformen im Pixelraster (übernommen von KATZE.PX / BAER.PX, Regel 9)
// Jede Form wird zeilenweise in ganze Rasterkästchen zerlegt, kein weicher Rand, kein Zurücklesen von Bildern.
// GS: Kantenlänge eines Kästchens in Zeichen-Einheiten. TM: Drehung und Lage des Kopfes, wird auf die Punkte gerechnet statt auf die Zeichenfläche.
STIER.PX=1;let GS=1,TM=null,TS=1;const XS=[],XD=[];
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
function seg(c,x,y,xx,yy,w,col){const g=GS;if(TM){const a=txf(x,y),b=tyf(x,y),d=txf(xx,yy),e=tyf(xx,yy);x=a;y=b;xx=d;yy=e;w*=TS;}
 const s=Math.max(1,Math.round(w/g))*g,n=Math.max(1,Math.ceil(Math.hypot(xx-x,yy-y)/g));c.fillStyle=col;c.beginPath();
 for(let i=0;i<=n;i++)c.rect(Math.round((x+(xx-x)*i/n-s/2)/g)*g,Math.round((y+(yy-y)*i/n-s/2)/g)*g,s,s);c.fill();}
function limb(c,x,y,xx,yy,w1,w2,col){if(TM){const a=txf(x,y),b=tyf(x,y),d=txf(xx,yy),e=tyf(xx,yy);x=a;y=b;xx=d;yy=e;w1*=TS;w2*=TS;}
 const dx=xx-x,dy=yy-y,l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;PB[0]=x+nx*w1/2;PB[1]=y+ny*w1/2;PB[2]=xx+nx*w2/2;PB[3]=yy+ny*w2/2;PB[4]=xx-nx*w2/2;PB[5]=yy-ny*w2/2;PB[6]=x-nx*w1/2;PB[7]=y-ny*w1/2;
 c.fillStyle=col;c.beginPath();spansPoly(c,PB,4);spansDisk(c,x,y,w1/2);spansDisk(c,xx,yy,w2/2);c.fill();}
// Gelenk aus zwei Knochen (wie ik in dist/hund.js)
function ik(jx,jy,fx,fy,a,b,dir){let dx=fx-jx,dy=fy-jy,dd=Math.hypot(dx,dy);const mx=a+b-.05;if(dd>mx){fx=jx+dx/dd*mx;fy=jy+dy/dd*mx;dx=fx-jx;dy=fy-jy;dd=mx;}dd=Math.max(dd,Math.abs(a-b)+.1);
 const th=Math.atan2(dy,dx),al=Math.acos(cl((a*a+dd*dd-b*b)/(2*a*dd),-1,1)),an=th+dir*al;return {kx:jx+Math.cos(an)*a,ky:jy+Math.sin(an)*a,fx,fy};}
STIER.prim={rr,poly,disk,seg,limb,hrand};

// ---------------------------------------------------------------- Hörner als räumliche Kurve (dieselbe Kurve für Seitenansicht und Vorderansicht, Regel 10)
// Achsen im Stand: f nach vorn, u nach oben, l zur Seite (nach außen). Der Ansatz geht zur Seite und leicht nach oben, die Spitze zeigt in die Richtung der Gestalt.
// Ergebnis: Punkte [f,u,l,Anteil 0–1]. Wird je Gestalt einmal gerechnet und gemerkt.
const HN=9,HORNS=new Map();
function hornCurve(SH,ind=1){const key=SH.hornLen+'|'+SH.hornFwd+'|'+SH.hornUp+'|'+SH.hornOut+'|'+ind;let P=HORNS.get(key);if(P)return P;
 const len=SH.hornLen*ind,st=len/(HN-1);let f=0,u=0,l=0;P=[[0,0,0,0]];
 for(let i=1;i<HN;i++){const s=Math.pow((i-.5)/(HN-1),.8);let df=lerp(0,SH.hornFwd,s),du=lerp(.22,SH.hornUp,s),dl=lerp(1,SH.hornOut,s);const n=Math.hypot(df,du,dl)||1;f+=df/n*st;u+=du/n*st;l+=dl/n*st;P.push([f,u,l,i/(HN-1)]);}
 if(HORNS.size>200)HORNS.clear();HORNS.set(key,P);return P;}
STIER.hornCurve=hornCurve;
// Spannweite von Spitze zu Spitze in cm (für Steckbrief und Test): zweimal der seitliche Weg plus der Abstand der Ansätze
STIER.hornSpan=(D,SH)=>{SH=SH||shapeOf(D);const P=hornCurve(SH,D.appearance.horn||1),sz=szOf(D,SH);return Math.round((2*P[HN-1][2]+9*SH.headS)*sz*CM);};
STIER.hornLenCm=(D,SH)=>{SH=SH||shapeOf(D);return Math.round(SH.hornLen*(D.appearance.horn||1)*szOf(D,SH)*CM);};
// Horn zeichnen: X(f,u,l), Y(f,u,l) bilden die räumlichen Punkte auf die Zeichenfläche ab (im Rahmen des Kopfes). Die Spitze ist dunkel.
function drawHorn(c,P,X,Y,w0,col,tip){for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i],s=b[3],w=w0*lerp(1,.3,Math.pow(s,1.3));
  limb(c,X(a[0],a[1],a[2]),Y(a[0],a[1],a[2]),X(b[0],b[1],b[2]),Y(b[0],b[1],b[2]),w0*lerp(1,.3,Math.pow(a[3],1.3)),w,s>.7?mix(col,tip,cl((s-.66)/.2,0,1)):col);}}
STIER.drawHorn=drawHorn;

// ---------------------------------------------------------------- Fellmuster: einmal je Tier erzeugt und gemerkt (Regel 5)
// Stromung (brindle): unregelmäßige dunkle Streifen, schräg über Rumpf und Hals. u: Lage entlang des Rumpfs, v0–v1: von Rücken zu Bauch, du: Schräge
const PATTERN=new WeakMap();
function patternOf(D){let P=PATTERN.get(D);if(P&&P.kind===D.appearance.pattern)return P;P={kind:D.appearance.pattern,st:[]};
 if(P.kind==='brindle'){const s=D.appearance.scarSeed%9973;for(let i=0;i<22;i++){const u=(i+.2+.6*hrand(i*3.1+s))/22,v0=.06+.45*hrand(i*5.7+s);P.st.push([u,v0,Math.min(.95,v0+.16+.3*hrand(i*7.9+s)),(.5-hrand(i*2.3+s))*.08,hrand(i*9.1+s)]);}}
 PATTERN.set(D,P);return P;}
STIER.patternOf=patternOf;

// ---------------------------------------------------------------- Haltungen
// Jede Haltung ist ein Satz Zahlen; Übergänge mischen die Zahlen weich.
// hx,hy Hüftgelenk · p Neigung des Rumpfs (0 waagerecht, positiv: Schulter höher) · hfx,hfy Fesselgelenk hinten (nahes Bein) · ffx,ffy Fesselgelenk vorn
// ne Hals (Winkel nach oben) · he Kopf (0 waagerecht, negativ: Maul nach unten) · sag Bauch liegt auf · ta Richtung des Schwanzansatzes · tc Krümmung des Schwanzes
const MODES=['stand','lie'],FET=5.2;
function poseRaw(mode,SH,ox){const lf=SH.leg,L=SH.L,H0=30*lf+9,bk=SH.bulk;
 // Liegen (Brustlage): Brustbein und Bauch am Boden, Vorderbeine untergeschlagen (Vorderfußwurzel vorn am Boden), Hinterbeine seitlich unter dem Bauch nach vorn
 if(mode==='lie'){const hy=-(8.6*bk+1.6),sy=-((9+5.4*SH.chest)*bk*.94),p=Math.asin(cl((hy-sy)/L,-.5,.5)),hx=-L/2-3,sx=hx+L*Math.cos(p);
  return {hx,hy,p,hfx:hx+17,hfy:-2.3,ffx:sx+1.5,ffy:-2.3,ne:ox?.56:.66,he:-.5,sag:1,ta:1.2,tc:.9};}
 const hx=-L/2;return {hx,hy:-H0,p:0,hfx:hx-2.5,hfy:-FET,ffx:hx+L-2,ffy:-FET,ne:ox?.3:.5,he:ox?-.84:-.72,sag:0,ta:1.5,tc:.12};}
const KEYS=['hx','hy','p','hfx','hfy','ffx','ffy','ne','he','sag','ta','tc'];
function poseSet(mode,SH,ox){const P=poseRaw(mode,SH,ox);for(const k of KEYS)if(P[k]===undefined)P[k]=0;return P;}
const ease=u=>u*u*u*(u*(u*6-15)+10);
// Aktuelle Haltung (gemischt). Schwere Tiere brauchen länger. Beim Hinlegen geht die Vorderhand zuerst herunter, beim Aufstehen kommt die Hinterhand zuerst hoch:
// in der Mitte des Übergangs steht die Kruppe höher als die Schulter (das genaue Aufstehen mit Kniefall folgt in ST2).
function curPose(a,t,SH){const P=a.pose,ox=formOf(a)==='ox';if(!P||P.mode!==a.mode&&!P.to){const set=poseSet(a.mode,SH,ox);a.pose={mode:a.mode,cur:set,to:null};return set;}
 if(P.to){const u=cl((t-P.t0)/P.dur,0,1),e=ease(u),cur={},s=Math.sin(Math.PI*u);for(const k of KEYS)cur[k]=lerp(P.from[k],P.to[k],e);
  cur.p-=.2*s;cur.hy-=3*s;cur.ne-=.25*s;cur.hfy-=2.2*s;cur.ffy-=1.2*s;// Hufe werden gehoben, nicht geschoben
  P.cur=cur;if(u>=1){P.to=null;P.cur=poseSet(P.mode,SH,ox);if(a.queue.length)setMode(a,a.queue.shift(),t,true);}return P.cur;}
 return P.cur=poseSet(P.mode,SH,ox);}
function setMode(a,mode,t=performance.now()/1000,queued=false){if(!MODES.includes(mode))return;const SH=a.SH||shapeOf(a.cat);if(!queued)a.queue.length=0;
 const from={...curPose(a,t,SH)},was=a.pose?.mode||a.mode;if(mode===was&&!a.pose?.to)return;
 const heavy=cl(a.cat.weight/600,.3,2.5),dur=1.1+.5*heavy;
 a.mode=mode;a.pose={mode,from,to:poseSet(mode,SH,formOf(a)==='ox'),t0:t,dur,cur:from};}
STIER.MODES=MODES;STIER.setMode=setMode;STIER.poseSet=poseSet;
STIER.snap=(a,mode)=>{a.mode=mode;a.pose=null;a.queue.length=0;a.want=null;};
STIER.moving=a=>!!(a.pose&&a.pose.to)||a.queue.length>0;
// Befehl: Haltung wechseln (STIER.step führt ihn aus). Gangarten und Wenden kommen in ST2.
STIER.pose=(a,mode)=>{if(MODES.includes(mode))a.want=mode;};
// Einen Zeitschritt rechnen (einmal je Bild vor dem Zeichnen). Kosten: ein paar Rechnungen, kein Zeichnen.
STIER.step=(a,dt,t)=>{if(a.want&&a.want!==a.mode&&!STIER.moving(a))setMode(a,a.want,t);if(a.want===a.mode)a.want=null;};

// ---------------------------------------------------------------- Skelett
// Hinterbein: Hüftgelenk – Knie (am Rumpf) – Sprunggelenk – Fessel – Klaue. Vorderbein: Schulter – Ellbogen (am Rumpf) – Vorderfußwurzel – Fessel – Klaue.
// Die Knochenlängen kommen aus dem Stand: Dort stehen die Beine fast gestreckt als Säulen, das Sprunggelenk steht hinter der Linie.
function rig(a,t,SH){const C=curPose(a,t,SH),lf=SH.leg,D=a.cat,ph=(D.seed%97)*.13,breathe=Math.sin(t*1.1+ph);
 const p=C.p,Tx=Math.cos(p),Ty=-Math.sin(p),Nx=-Math.sin(p),Ny=-Math.cos(p),hx=C.hx,hy=C.hy+breathe*.08,sx=hx+SH.L*Tx,sy=hy+SH.L*Ty;
 const d1f=18*lf+3.8,FA=.557*d1f,CF=.455*d1f,d1h=Math.hypot(8.5,17*lf+3.8),GA=.56*d1h,CH=.56*d1h,low=-3.4*SH.legW;
 const leg=(front,near)=>{const off=near?0:1;
  if(front){const jx=sx+off*2.6,jy=sy-off*.6,ex=jx-3*Tx+12*lf*-Nx,ey=Math.min(jy-3*Ty-12*lf*Ny,low-1),r=ik(ex,ey,C.ffx+off*2.6,C.ffy-off*.4,FA,CF,-1);
   return {front,near,jx,jy,ex,ey,kx:r.kx,ky:Math.min(r.ky,low),fx:r.fx,fy:Math.min(r.fy,-2.2)};}
  const jx=hx-off*2.2,jy=hy-off*.6,ex=jx+6*Tx-13*lf*Nx,ey=Math.min(jy+6*Ty-13*lf*Ny,low-1),r=ik(ex,ey,C.hfx+off*2.8,C.hfy-off*.4,GA,CH,1);
  return {front,near,jx,jy,ex,ey,kx:r.kx,ky:Math.min(r.ky,low),fx:r.fx,fy:Math.min(r.fy,-2.2)};};
 const nbx=sx+4*Tx+3.5*Nx,nby=sy+4*Ty+3.5*Ny,nod=breathe*.01,ne=C.ne+nod,hcx=nbx+SH.neck*Math.cos(ne),hcy=nby-SH.neck*Math.sin(ne);
 return {C,p,Tx,Ty,Nx,Ny,hx,hy,sx,sy,L:SH.L,breathe,ph,legs:[leg(false,false),leg(true,false),leg(false,true),leg(true,true)],nbx,nby,hcx,hcy,ne,he:C.he+nod,ta:C.ta,tc:C.tc,cx:(hx+sx)/2,lie:cl(C.sag,0,1)};}
STIER.rig=(a,t)=>rig(a,t,a.SH||shapeOf(a.cat));

// ---------------------------------------------------------------- Zeichner (Seitenansicht)
const G=-.25;// nichts reicht unter den Boden
const gy=y=>Math.min(y,G);
const HE0=-.8,HC=Math.cos(HE0),HS=Math.sin(HE0);// Bezugshaltung des Kopfes für die Hornrichtung
function drawBull(c,a,px,py,k,face,opt={}){const D=a.cat,col=D.appearance.colors,SH=a.SH||shapeOf(D),sz=szOf(D,SH),t=opt.time??performance.now()/1000,bull=D.form!=='ox';
 const R=rig(a,t,SH),{Tx,Ty,Nx,Ny,hx,hy,sx,sy,L,C}=R,bk=SH.bulk,lw=SH.legW,hf=SH.hoof,seed=D.seed%1000;
 const base=col.base,light=col.light,shade=col.shade,dark=col.dark,farC=mix(shade,dark,.6),nearC=mix(base,light,.3),nearLo=mix(base,light,.42);
 c.save();c.translate(px,py);c.scale(k,k);
 if(!opt.noShadow){c.fillStyle='#1c140c50';c.beginPath();c.ellipse(face*(R.cx+5)*sz,1,(L*.5+19+R.lie*4)*sz,(3.8+R.lie)*sz,0,0,TAU);c.fill();}
 c.scale(face*sz,sz);GS=(opt.px||STIER.PX)/sz;TM=null;
 const blob=(x,y,rx,ry,cc)=>{const pts=[];for(let i=0;i<16;i++){const an=i/16*TAU;pts.push([x+Math.cos(an)*rx,gy(y+Math.sin(an)*ry)]);}poly(c,pts,cc);};
 // Glied und Gelenk, die nie unter den Boden reichen (Mitte höchstens so tief, wie die halbe Dicke erlaubt)
 const lm=(x,y,xx,yy,w1,w2,cc)=>limb(c,x,Math.min(y,G-w1/2),xx,Math.min(yy,G-w2/2),w1,w2,cc),dk=(x,y,r,cc)=>disk(c,x,Math.min(y,G-r),r,cc);
 // ---- Klaue: Fessel schräg nach vorn unten, darunter die gespaltene Klaue, hinten die Afterklaue
 function hoof(x,y,cc,near){const w=4.9*hf*lw,h=Math.min(3.1*hf,-y-.2),by=gy(y+2.2*hf);lm(x,y,x+1.3*hf,by,3.8*lw,3.9*lw*hf,cc);
  poly(c,[[x-1.2*hf,by-.4],[x+2.6*hf,by-.6],[x-1.4*hf+w,G],[x-1.6*hf,G]],col.hoof);if(near&&h>1.5)seg(c,x+1.2*hf,gy(by+.6),x+1.9*hf,G-.3,.4,mix(col.hoof,'#000000',.5));
  rr(c,x-2.4*hf*lw,gy(y+.4),1.3*hf,1.5*hf,col.hoof);}
 function drawLeg(l){const near=l.near,up=near?nearC:farC,lo=near?nearLo:farC,jc=near?mix(base,light,.55):farC;
  if(l.front){lm(l.jx,l.jy+2,l.ex,l.ey,14*lw*bk,9.5*lw,up);lm(l.ex,l.ey,l.kx,l.ky,8.4*lw,5*lw,up);dk(l.kx,l.ky,3*lw,jc);
   lm(l.kx,l.ky,l.fx,l.fy,4.3*lw,3.9*lw,lo);dk(l.fx,l.fy,2.5*lw,lo);hoof(l.fx,l.fy,lo,near);}
  else{lm(l.jx-1,l.jy+3,l.ex,l.ey,19*lw*bk*SH.rump,11.5*lw,up);lm(l.ex,l.ey,l.kx,l.ky,9.6*lw,5.2*lw,up);dk(l.kx,l.ky,3*lw,jc);
   lm(l.kx,l.ky,l.fx,l.fy,4.6*lw,4*lw,lo);dk(l.fx,l.fy,2.6*lw,lo);hoof(l.fx,l.fy,lo,near);}}
 drawLeg(R.legs[0]);drawLeg(R.legs[1]);
 // ---- Schwanz: lange Rute, hängt fast senkrecht bis unter das Sprunggelenk, am Ende die Quaste
 {const n=9,len=4.3*SH.tail,w0=3.4*bk,sway=Math.sin(t*.8+R.ph)*.05+Math.sin(t*2.1+R.ph*2)*.02,up=[],dn=[];let x=hx-Tx*8.6*bk*SH.rump+Nx*6.4*bk,y=hy-Ty*8.6*bk*SH.rump+Ny*6.4*bk;const x0=x,y0=y;
  for(let i=0;i<=n;i++){const u=i/n,an=R.ta+R.tc*Math.pow(u,1.3)+sway*u*u,w=lerp(w0,1.3,Math.pow(u,.5))/2,ca=Math.cos(an),sa=Math.sin(an);
   if(i){x+=ca*len;y=Math.min(y+sa*len,-1.2);}up.push([x+sa*w,gy(y-ca*w)]);dn.push([x-sa*w,gy(y+ca*w)]);}
  poly(c,up.concat(dn.reverse()),mix(base,shade,.4));dk(x0+1,y0+1,w0*.7,base);
  const an=R.ta+R.tc,ca=Math.cos(an),sa=Math.sin(an);lm(x,y,x+ca*6.5*SH.tail,y+sa*6.5*SH.tail,2.6,4.4,col.tuft);dk(x+ca*7.5*SH.tail,y+sa*7.5*SH.tail,1.5,col.tuft);}
 // ---- Rumpf: gerade Rückenlinie vom Hüftgelenk zur Schulter, tiefer Brustkorb, Widerrist, aufgezogene Flanke
 const top=[],bot=[],n=12,br=R.breathe*.25;
 for(let i=0;i<=n;i++){const u=i/n,x=hx+L*Tx*u,y=hy+L*Ty*u,su=smooth(u);
  const rt=(9.8+2.2*su*SH.chest)*bk+SH.wither*Math.exp(-Math.pow((u-.88)/.14,2))+5.5*SH.hump*Math.exp(-Math.pow((u-.92)/.13,2))-.7*Math.sin(Math.PI*cl((u-.2)/.5,0,1));
  const rb=(9.8+5*su*SH.chest-1.5*Math.sin(Math.PI*cl(u/.55,0,1))*(1-C.sag)+C.sag*1.2*Math.sin(Math.PI*u)+br*Math.sin(Math.PI*u))*bk;
  top.push([x+Nx*rt,gy(y+Ny*rt)]);bot.push([x-Nx*rb,gy(y-Ny*rb)]);}
 blob(hx-2*SH.rump,hy+1,8.7*bk*SH.rump,9.2*bk*SH.rump,base);blob(sx,sy,(9.6+2.5*SH.chest)*bk,(9.6+2.5*SH.chest)*bk,base);
 poly(c,[...top,...[...bot].reverse()],base);
 blob(sx+4.5,sy+(7.4+4.2*SH.chest)*bk-4,7*bk,5.2*bk,base);// Brustbein (Vorbrust)
 // Hodensack (nur Stier) und Pinselhaare am Bauch
 if(bull)blob(hx+4.5,gy(hy+(8.8+4.4)*bk+2.2-C.sag*5),3*bk,4.2*bk,mix(base,shade,.5));
 seg(c,hx+L*.52,gy(bot[6][1]-.4),hx+L*.52-.6,gy(bot[6][1]+2.4),.8,col.tuft);
 // ---- Hals mit Wamme: der Hals setzt tief und breit an der Schulter an, die Wamme hängt von der Kehle bis zur Vorbrust
 const hs=SH.headS,nw=21*SH.neckW*bk,hw=12.6*hs,thx=R.hcx-2*hs,thy=R.hcy+6.2*hs,bx=sx+8.5,byb=sy+(7.4+4.2*SH.chest)*bk-2.5;
 if(SH.dewlap>.05){const dl=SH.dewlap,mxx=lerp(thx,bx,.55),myy=lerp(thy,byb,.55);poly(c,[[thx-1,gy(thy-2)],[thx+1.5,gy(thy+1.4*dl)],[mxx+2.4*dl,gy(myy+3.4*dl)],[bx+1.6*dl,gy(byb+1.2*dl)],[bx-5,gy(byb-2)],[sx+2,gy(sy+2)]],mix(base,shade,.45));}
 lm(sx+2.5*Tx,sy+2.5*Ty+.5,R.hcx-1.5,R.hcy+.5,nw,hw,base);
 // Lichter und Schatten: heller Rücken, dunkle Unterseite (damit auch ein schwarzes Tier Form hat)
 poly(c,top.slice(1,n).concat(top.slice(1,n).reverse().map(([x,y])=>[x-Nx*2.2,gy(y-Ny*2.2)])),mix(base,light,.5));
 poly(c,bot.slice(1,n).map(([x,y])=>[x+Nx*2.4,gy(y+Ny*2.4)]).concat(bot.slice(1,n).reverse()),mix(base,shade,.6));
 // Fellmuster (gemerkt): Stromung als schräge dunkle Streifen
 {const P=patternOf(D);if(P.st.length){const cc=mix(shade,dark,.35);for(const [u,v0,v1,du,h] of P.st){const f=u*n,i=Math.min(n-1,Math.floor(f)),q=f-i,tx=lerp(top[i][0],top[i+1][0],q),ty=lerp(top[i][1],top[i+1][1],q),bxx=lerp(bot[i][0],bot[i+1][0],q),byy=lerp(bot[i][1],bot[i+1][1],q);
   seg(c,lerp(tx,bxx,v0)+du*L*v0,gy(lerp(ty,byy,v0)),lerp(tx,bxx,v1)+du*L*v1,gy(lerp(ty,byy,v1)),h>.8?1.5:.9,cc);}
   for(let i=0;i<5;i++){const q=(i+.5)/5,x=lerp(sx+4,R.hcx-3,q),y=lerp(sy,R.hcy,q);seg(c,x,gy(y-nw*.22*lerp(1,.6,q)),x+1.2,gy(y+nw*.24*lerp(1,.6,q)),.9,cc);}}}
 drawLeg(R.legs[2]);drawLeg(R.legs[3]);
 // Schulter- und Hüftlicht (Muskel), danach der Nackenkamm
 blob(sx-3.5,sy+2,4.4*bk,7*bk,mix(base,light,.24));blob(hx+1.5,hy+3,4*bk*SH.rump,5.6*bk*SH.rump,mix(base,light,.2));
 // ---- Nackenkamm (Stier): der Nackenmuskel steht als hoher Wulst über Hals und Widerrist
 if(SH.crest>.05){const cr=SH.crest*bk*.85,ux=Math.cos(R.ne),uy=-Math.sin(R.ne),m1=.34,m2=.66,ax=lerp(R.nbx,R.hcx,m1),ay=lerp(R.nby,R.hcy,m1),bxx=lerp(R.nbx,R.hcx,m2),byy=lerp(R.nby,R.hcy,m2);
  blob(R.nbx-2-uy*-2,R.nby-nw*.36-2.2*cr,7.4+2*cr,3+4.2*cr,base);blob(ax,ay-nw*.33-3.4*cr,7.6+1.5*cr,3+4.6*cr,base);blob(bxx,byy-hw*.5-2.6*cr,5.6+cr,2.4+3.2*cr,base);
  blob(ax-1+ux,ay-nw*.33-4.6*cr,5.2+cr,1.3+1.9*cr,mix(base,light,.5));}
 if(SH.hump>.05)blob(sx-L*.08,sy-(9.8+2.2*SH.chest)*bk-3.2*SH.hump,6+2.4*SH.hump,2+2.6*SH.hump,mix(base,light,.4));
 // ---- Kopf (Zeichner je Rasse): fernes Horn und Ohr zeichnet der Kopfzeichner zuerst
 {const co=Math.cos(R.he)*hs,si=Math.sin(R.he)*hs;TM=[co,-si,si,co,R.hcx,Math.min(R.hcy,G-7*hs)];TS=hs;
  const P=hornCurve(SH,D.appearance.horn||1);
  // Hornpunkt (f,u,l) im Stand → Rahmen des Kopfes (dreht sich mit dem Kopf). Der Weg zur Seite (l) wird wie bei leicht schräger Sicht nach vorn gelegt:
  // so zeigt sich der Haken des nahen Horns als Sichel, das ferne Horn steht kürzer und etwas höher dahinter
  const hornX=(s)=>(f,u,l)=>HC*(f+l*(s>0?.62:-.12))-HS*(-u+l*(s>0?.24:-.14)),hornY=(s)=>(f,u,l)=>HS*(f+l*(s>0?.62:-.12))+HC*(-u+l*(s>0?.24:-.14));
  (STIER.HEADS[SH.head]||headPlain)(c,D,SH,col,{t,breathe:R.breathe,prim:STIER.prim,horn:P,hornX,hornY,bull});TM=null;TS=1;}
 c.restore();return R;}
function headPlain(c,D,SH,col,o){const tip=7+9*SH.face;disk(c,0,0,6.6,col.base);poly(c,[[-1,-6.4],[4,-6.4],[tip-1,-2.6],[tip,2.4],[tip-3,4.2],[2,6.4],[-4,5.6]],col.base);rr(c,tip-2.6,-1,1.4,1.4,col.nose);rr(c,3,-3.4,1.4,1.4,col.eye);
 drawHorn(c,o.horn,(f,u,l)=>-1.2+o.hornX(1)(f,u,l),(f,u,l)=>-5.6+o.hornY(1)(f,u,l),3*SH.hornThick,col.horn,col.hornTip);}
STIER.draw=drawBull;

// ---------------------------------------------------------------- Vorderansicht des Kopfes (ST1: als Brustbild im Editor und als Miniatur; ST2 dreht den ganzen Körper darüber)
// Rahmen: Mitte zwischen den Augen bei 0,0, oben ist -y. Hinter dem Kopf Hals, Nackenkamm und Brust als dunkle Masse.
STIER.drawFront=(c,D,px,py,k,opt={})=>{const col=D.appearance.colors,SH=opt.SH||shapeOf(D),sz=szOf(D,SH),hs=SH.headS,bk=SH.bulk,bull=D.form!=='ox';
 c.save();c.translate(px,py);c.scale(k*sz,k*sz);GS=(opt.px||STIER.PX)/sz;TM=null;TS=1;
 const el=(x,y,rx,ry,cc)=>{const pts=[];for(let i=0;i<18;i++){const an=i/18*TAU;pts.push([x+Math.cos(an)*rx,y+Math.sin(an)*ry]);}poly(c,pts,cc);};
 if(!opt.headOnly){const w=(13.5+3*SH.chest)*bk*SH.neckW;el(0,9,w,13*bk,mix(col.shade,col.dark,.35));el(0,3,w*.82,11*bk,mix(col.base,col.shade,.6));
  if(SH.crest>.05)el(0,-8.5-2*SH.crest,(8+3.5*SH.crest)*bk,(5+4.5*SH.crest)*bk,mix(col.base,col.shade,.35));
  if(SH.crest>.05)el(0,-10.5-3.4*SH.crest,(5+2.5*SH.crest)*bk,(1.6+1.6*SH.crest)*bk,mix(col.base,col.light,.45));
  if(SH.dewlap>.05)poly(c,[[-2.2,12],[2.2,12],[1.6*SH.dewlap,17+3*SH.dewlap],[-1.6*SH.dewlap,17+3*SH.dewlap]],mix(col.base,col.shade,.2));}
 TM=[hs,0,0,hs,0,0];TS=hs;const P=hornCurve(SH,D.appearance.horn||1);
 (STIER.HEADS_FRONT[SH.head]||headFrontPlain)(c,D,SH,col,{prim:STIER.prim,horn:P,bull});TM=null;TS=1;c.restore();};
function headFrontPlain(c,D,SH,col,o){poly(c,[[-7,-9],[7,-9],[8.5,-2],[5.5,8],[5,13],[-5,13],[-5.5,8],[-8.5,-2]],col.base);for(const s of [-1,1]){rr(c,s*7.2-.7,-3,1.4,1.4,col.eye);rr(c,s*2.6-.7,10,1.4,1.4,col.nose);
  drawHorn(c,o.horn,(f,u,l)=>s*(5.6+l),(f,u,l)=>-8.4-u,3*SH.hornThick,col.horn,col.hornTip);}}
})();
