'use strict';
// =====================================================================================================
// ARENA THEORY · STIERE UND OCHSEN (eigenständige Testversion, ändert keine Spieldatei, hängt nicht an window.MG)
// · Modell wie bei Hunden, Bären und Katzen (dist/hund.js, dist/baer.js, dist/katze.js): jede Rasse hat Sollwerte je Wert,
//   das einzelne Tier bekommt Anlage (64 Bernoulli-Versuche um den Rassenwert) und Istwert (um Rassenwert minus 20).
// · Zwölf Werte: acht Kampfwerte und vier Zugwerte (die Ausdauer zählt für beides). Jede Rasse gibt es als Stier (form 'bull')
//   und als Ochse (form 'ox'): feste Verschiebung der Sollwerte, 5 % höher, 15 % längere Hörner, schmaler Hals, kein Nackenkamm.
// · Pixelgrafik: alle Formen werden in ganze Rasterkästchen zerlegt (STIER.PX; Grundformen übernommen von KATZE.PX / BAER.PX).
// · Zeichner: Rind in Seitenansicht aus einem Skelett (Paarhufer, steifer gerader Rücken, Nackenkamm, Wamme, Quastenschwanz),
//   Haltungen Stand und Liegen, Hinlegen und Aufstehen über den Kniefall. Hörner als räumliche Kurve, dieselbe Kurve für Seiten- und Vorderansicht.
//   Köpfe (Seite und vorn), Hörner und Fell je Rasse: dist/stier-koepfe.js.
// · Bewegung (ST2): Schritt, Trab, Galopp, Antritt, Bremsen, Scharren, Kopf senken, Grasen, Mimik. Jeder stehende Huf hat einen festen Ort am Boden (kein Rutschen).
//   Wenden immer über die Vorderansicht, nie gespiegelt: im Stand (tritt um), im Lauf (weiter Bogen), Herumwerfen nach dem Bremsen.
//   Befehle: STIER.go, STIER.pose, STIER.head, STIER.turn, STIER.act, STIER.expr; je Bild STIER.step, dann STIER.draw. Auskunft: STIER.state, STIER.view.
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
// hx,hy Hüftgelenk · p Neigung des Rumpfs (0 waagerecht, positiv: Schulter höher) · hfx,hfy Fesselgelenk hinten · ffx,ffy Fesselgelenk vorn (ffx2,ffy2: das zweite Vorderbein)
// ne Hals (Winkel nach oben) · he Kopf (0 waagerecht, negativ: Maul nach unten) · sag Bauch liegt auf · ta Richtung des Schwanzansatzes · tc Krümmung des Schwanzes
// 'kneel' ist die Zwischenhaltung beim Hinlegen und Aufstehen: auf den Vorderfußwurzeln, die Kruppe oben (kein eigener Befehl).
const MODES=['stand','lie'],FET=5.2,ZW=11,DK=.055;// ZW halbe Spurbreite, DK: so viel tiefer im Bild liegt ein Punkt je Einheit Nähe zum Betrachter
function poseRaw(mode,SH,ox){const lf=SH.leg,L=SH.L,H0=30*lf+9,bk=SH.bulk;
 // Liegen (Brustlage): Brustbein und Bauch am Boden, Vorderbeine untergeschlagen (Vorderfußwurzel vorn am Boden), Hinterbeine seitlich unter dem Bauch nach vorn
 if(mode==='lie'){const hy=-(8.6*bk+1.6),sy=-((9+5.4*SH.chest)*bk*.94),p=Math.asin(cl((hy-sy)/L,-.5,.5)),hx=-L/2-3,sx=hx+L*Math.cos(p);
  return {hx,hy,p,hfx:hx+17,hfy:-2.3,ffx:sx+1.5,ffy:-2.3,ne:ox?.56:.66,he:-.5,sag:1,ta:1.2,tc:.9};}
 // Kniefall: Vorderfußwurzeln am Boden, Klauen nach hinten untergeschlagen, Hinterbeine stehen, die Kruppe ist der höchste Punkt
 if(mode==='kneel'){const hy=-(H0-2.5),sy=-(12*lf+7),p=Math.asin(cl((hy-sy)/L,-.6,.6)),hx=-L/2+1.5,sx=hx+L*Math.cos(p);
  return {hx,hy,p,hfx:hx-2,hfy:-FET,ffx:sx-6.5,ffy:-2.3,ne:ox?.52:.62,he:-.62,sag:0,ta:1.5,tc:.3};}
 const hx=-L/2;return {hx,hy:-H0,p:0,hfx:hx-2.5,hfy:-FET,ffx:hx+L-2,ffy:-FET,ne:ox?.3:.5,he:ox?-.84:-.72,sag:0,ta:1.5,tc:.12};}
const KEYS=['hx','hy','p','hfx','hfy','ffx','ffy','ffx2','ffy2','ne','he','sag','ta','tc'];
function poseSet(mode,SH,ox){const P=poseRaw(mode,SH,ox);if(P.ffx2===undefined){P.ffx2=P.ffx;P.ffy2=P.ffy;}for(const k of KEYS)if(P[k]===undefined)P[k]=0;return P;}
const ease=u=>u*u*u*(u*(u*6-15)+10);
// Aktuelle Haltung (gemischt). Schwere Tiere brauchen länger. Hufe, die den Platz wechseln, werden gehoben, nicht geschoben.
// Zwischen Stand und Kniefall knicken die Vorderbeine nacheinander ein (und strecken sich nacheinander), wie beim echten Rind.
function curPose(a,t,SH){const P=a.pose,ox=formOf(a)==='ox';if(!P||P.mode!==a.mode&&!P.to){const set=poseSet(a.mode,SH,ox);a.pose={mode:a.mode,cur:set,to:null};return set;}
 if(P.to){const u=cl((t-P.t0)/P.dur,0,1),e=ease(u),cur={},s=Math.sin(Math.PI*u),A=P.from,B=P.to;for(const k of KEYS)cur[k]=lerp(A[k],B[k],e);
  cur.hfy-=P.lh*s;cur.ne-=.1*s;
  if(P.split){const e1=ease(cl(u*1.45,0,1)),e2=ease(cl(u*1.45-.45,0,1));cur.ffx=lerp(A.ffx,B.ffx,e1);cur.ffy=lerp(A.ffy,B.ffy,e1)-P.lf*Math.sin(Math.PI*e1);cur.ffx2=lerp(A.ffx2,B.ffx2,e2);cur.ffy2=lerp(A.ffy2,B.ffy2,e2)-P.lf*Math.sin(Math.PI*e2);}
  else{cur.ffy-=P.lf*s;cur.ffy2-=P.lf*s;}
  P.cur=cur;if(u>=1){P.to=null;P.cur=poseSet(P.mode,SH,ox);if(a.queue.length)setMode(a,a.queue.shift(),t,true);}return P.cur;}
 return P.cur;}
// Hinlegen: Stand → Kniefall (vorn herunter) → Liegen. Aufstehen: Liegen → Kniefall (Hinterhand zuerst hoch) → Stand.
function setMode(a,mode,t=performance.now()/1000,queued=false){if(mode!=='kneel'&&!MODES.includes(mode))return;const SH=a.SH||shapeOf(a.cat);if(!queued)a.queue.length=0;
 const from={...curPose(a,t,SH)},was=a.pose?.mode||a.mode;if(mode===was&&!a.pose?.to)return;
 if(!queued&&!a.pose?.to&&(was==='stand'&&mode==='lie'||was==='lie'&&mode==='stand')){a.queue.push(mode);mode='kneel';}
 const heavy=cl(a.cat.weight/600,.3,2.5),to=poseSet(mode,SH,formOf(a)==='ox'),half=mode==='kneel'||was==='kneel',dur=(half?.62:1.1)*(1+.45*heavy);
 a.feet=null;a.mode=mode;a.pose={mode,from,to,t0:t,dur,cur:from,lh:Math.abs(to.hfx-from.hfx)>1.5?2.2:0,lf:Math.abs(to.ffx-from.ffx)>1.5?1.4:0,split:half&&(mode==='stand'||was==='stand')?1:0};}
STIER.MODES=MODES;STIER.setMode=setMode;STIER.poseSet=poseSet;STIER.DK=DK;
STIER.snap=(a,mode)=>{a.mode=mode;a.pose=null;a.queue.length=0;a.want=null;a.feet=null;a.v=0;a.gs=0;a.go=null;a.turn=null;a.turnWant=null;a.act=null;a.actWant=null;a.brake=false;a.brk=0;a.aq=0;a.lean=0;if(a.th!==undefined){a.th=a.th<Math.PI/2?0:Math.PI;a.thH=a.thT=a.th;}};
STIER.moving=a=>!!(a.pose&&a.pose.to)||a.queue.length>0;

// ---------------------------------------------------------------- Bewegung (ST2): Gangarten, Antritt, Bremsen, Wenden
// Das Rind hat einen Ort in der Ebene (ox nach rechts, oz zum Betrachter hin, in Zeichen-Einheiten bei Größe 1) und eine Richtung th:
// 0 = schaut nach rechts, π/2 = schaut zum Betrachter, π = schaut nach links. Gewendet wird immer über die Vorderansicht (Regel 10), nie gespiegelt.
// Hufe: Jeder Huf, der steht, hat einen festen Ort am Boden. Der Körper bewegt und dreht sich darüber, der Huf bleibt liegen, bis er gehoben und neu gesetzt wird.
// So rutscht kein Huf, weder im Gang noch beim Wenden. Nur beim Bremsen und Herumwerfen rutschen Hufe mit Absicht (Merkmal sl, dort spritzt Sand).
// Schritt: eine Seite nach der anderen (hinten, dann vorn). Trab: über Kreuz. Galopp: erst beide Hinterbeine, dann beide Vorderbeine, dann Schwebe; der Rücken bleibt steif, der Rumpf wippt.
const GAITS={walk:{name:'Walk',de:'Schritt',off:[.5,.25,0,.75],duty:.66,stride:30,lift:3.2,v:45},
 trot:{name:'Trot',de:'Trab',off:[.5,0,0,.5],duty:.46,stride:28,lift:4.6,v:120},
 gallop:{name:'Gallop',de:'Galopp',off:[0,.62,.9,.5],duty:.22,stride:34,lift:7,v:380}};
const GK=['walk','trot','gallop'],RUN_R=85,TURNG={off:[.5,0,0,.5],duty:.52,lift:3};// Umtreten beim Wenden auf der Stelle: über Kreuz, je schneller die Drehung, desto schneller die Tritte
//: Halbmesser des Bogens beim Wenden im Lauf
STIER.GAITS=GAITS;STIER.GK=GK;
// Tempo des einzelnen Tiers aus seiner Schnelligkeit (vorläufig, wird in ST19 eingemessen): Galopp des Spanischen Kampfstiers um 35 km/h
STIER.paceOf=D=>lerp(.8,1.12,cl(((D.stats&&D.stats.tempo)||60)/100,0,1));
// Befehle. go: null (anhalten; aus dem Galopp wird gebremst) | 'walk' | 'trot' | 'gallop'. Liegt das Rind, steht es zuerst auf.
STIER.go=(a,kind)=>{a.go=GAITS[kind]?kind:null;if(a.go){a.want=null;a.actWant=null;if(kind!=='walk'&&a.head==='graze')a.head='up';}};
STIER.pose=(a,mode)=>{if(MODES.includes(mode)){a.want=mode;a.go=null;a.actWant=null;}};
// Kopf: 'up' normal · 'low' gesenkt, Hörner nach vorn (Drohen, Ansturm) · 'graze' Grasen (nur im Stand und im langsamen Schritt)
STIER.head=(a,h)=>{a.head=h==='low'||h==='graze'?h:'up';if(a.head==='graze'&&a.go&&a.go!=='walk')a.go='walk';};
// Wenden: 'stand' tritt auf der Stelle um · 'run' weiter Bogen im Lauf, legt sich in die Kurve · 'throw' Herumwerfen: bremst mit gestemmten Vorderbeinen, die Hinterhand bricht aus
// 'auto' wählt nach dem Tempo.
STIER.turn=(a,kind='auto')=>{if(!a.turn)a.turnWant=kind;};
// Scharren: senkt den Kopf und scharrt mit dem Vorderhuf, Sand fliegt nach hinten
STIER.act=(a,kind)=>{if(kind==='paw'){a.go=null;a.actWant='paw';}};
// Mimik und Schwanz (einmalige kurze Regungen)
const EXPR={ears:{de:'Ohren spielen',dur:1.8},snort:{de:'Schnauben',dur:1.3},white:{de:'Augenweiß zeigen',dur:2.4},tail:{de:'Schwanz schlagen',dur:1.7},toss:{de:'Kopf werfen',dur:1.5}};
STIER.EXPR=EXPR;STIER.expr=(a,kind,t)=>{if(EXPR[kind])a.expr={kind,t0:t??performance.now()/1000};};
const X0={dne:0,dhe:0,ear:0,nost:0,white:0,tail:0,puff:0};
function exprOf(a,t){const E=a.expr;if(!E)return X0;const u=(t-E.t0)/EXPR[E.kind].dur;if(u>=1||u<0){a.expr=null;return X0;}
 const e=smooth(cl(u/.2,0,1))*smooth(cl((1-u)/.25,0,1)),X={dne:0,dhe:0,ear:0,nost:0,white:0,tail:0,puff:0};
 if(E.kind==='ears')X.ear=e*Math.sin(u*TAU*2.5);
 else if(E.kind==='snort'){const k=Math.sin(Math.PI*cl(u/.5,0,1));X.nost=e;X.dhe=-.2*k;X.dne=-.08*k;X.puff=u<.7?u/.7:0;X.ear=-.4*e;}
 else if(E.kind==='white'){X.white=e;X.ear=-.75*e;X.dhe=.1*e;X.dne=.06*e;X.nost=.5*e;}
 else if(E.kind==='tail')X.tail=e*Math.sin(u*TAU*2);
 else{const k=Math.sin(u*TAU*1.5)*e;X.dhe=.38*k;X.dne=.14*k;X.ear=.3*k;}
 return X;}
// Platz eines Hufs im Körper (x nach vorn, z zur Seite). Die Beine der fernen Seite stehen etwas weiter vorn (fs: Vorzeichen der fernen Seite).
const HM={x:0,z:0};
function homeOf(i,L,fs){const zs=i<2?-1:1,far=zs===fs?1:0;HM.x=i&1?L/2-2+far*2.6:-L/2-2.5+far*2.8;HM.z=zs*ZW;return HM;}
function feetInit(a,SH){const c=Math.cos(a.th),s=Math.sin(a.th),F=[];for(let i=0;i<4;i++){const h=homeOf(i,SH.L,a.fs);F.push({x:a.ox+h.x*c-h.z*s,z:a.oz+h.x*s+h.z*c,st:true,rdy:true,w:0,up:0,sl:0,lx:0,lz:0,bx:h.x,bz:h.z});}return F;}
// Einen Zeitschritt rechnen (einmal je Bild vor dem Zeichnen). Kosten: ein paar Rechnungen, kein Zeichnen.
function step(a,dt,t){dt=cl(dt,0,.05);const D=a.cat,SH=a.SH||shapeOf(D),L=SH.L,lf=SH.leg,hs=Math.sqrt(cl(D.weight/500,.4,2.4)),pc=a.pace||(a.pace=STIER.paceOf(D));
 if(a.th===undefined){a.th=0;a.thH=0;a.thT=0;a.ox=a.ox||0;a.oz=a.oz||0;a.fs=-1;a.v=0;a.cyc=0;a.gw=[1,0,0];a.gk='walk';a.head=a.head||'up';a.settled=true;}
 const to=(k,v,r)=>{const x=a[k]||0;a[k]=x+cl(v-x,-r*dt,r*dt);};
 if(a.act&&t>a.act.t0+a.act.dur)a.act=null;
 // Liegen, Kniefall, Übergänge: keine Fortbewegung. Wer laufen soll, steht erst auf.
 if(a.mode!=='stand'||STIER.moving(a)){const busy=STIER.moving(a);if(a.go&&!busy&&a.mode!=='stand')a.want='stand';if(a.want&&a.want!==a.mode&&!busy)setMode(a,a.want,t);if(a.want===a.mode)a.want=null;
  a.v=0;a.gs=0;a.feet=null;a.turnWant=null;a.brake=false;to('hl',0,2.6);to('hg',0,1.5);to('brk',0,3.5);to('aq',0,5);to('ex',0,.05);to('lean',0,3);return;}
 if(a.want==='stand')a.want=null;
 let v=a.v,vT=0,brake=!!a.brake,leanT=0;const v0=v,ox0=a.ox,oz0=a.oz,th0=a.th,wantPose=!!a.want;
 if(a.go&&!wantPose&&!a.act&&!a.actWant)vT=GAITS[a.go].v*pc*(a.head==='graze'?.45:1);
 // Wenden beginnen: erst auf das passende Tempo kommen
 if(a.turnWant&&!a.turn&&!a.act){let kind=a.turnWant;if(kind==='auto')kind=v>200*pc?'throw':v>25?'run':'stand';if(kind==='throw'&&v<60)kind='stand';if(kind==='run'&&v<25)kind='stand';
  let start=false;if(kind==='throw'){vT=0;brake=true;start=v<=240*pc;}else if(kind==='run'){vT=cl(vT,70*pc,105*pc);start=v<=125*pc;}else{vT=0;start=v<1&&a.settled;}
  a.turnWant=kind;
  if(start){const goal=a.th<Math.PI/2?Math.PI:0,xp=kind==='stand'?-5:L/2-5;a.turn={kind,from:a.th,to:goal,sg:goal>a.th?1:-1,u:0,dur:kind==='stand'?(1.9+.6*hs)/(a.rate||1):(.85+.3*hs)/(a.rate||1),xp,px:a.ox+xp*Math.cos(a.th),pz:a.oz+xp*Math.sin(a.th)};
   a.fs=goal>1?1:-1;a.turnWant=null;}}
 const T=a.turn;if(T){if(T.kind==='run')vT=cl(vT,70*pc,105*pc);else vT=0;if(T.kind==='throw')brake=true;}
 // Tempo: schwere Tiere kommen langsam in Fahrt; aus dem Galopp wird mit gestemmten Beinen gebremst
 const acc=(110+.7*Math.max(vT>v?v:vT,v))/hs;if(vT===0&&v>190*pc)brake=true;if(vT>v)brake=false;if(brake&&v<8&&!(T&&T.kind==='throw'))brake=false;
 v+=cl(vT-v,-(brake?(T&&T.kind==='throw'?430:820)/hs:acc*1.5)*dt,acc*dt);if(vT===0&&v<.5)v=0;
 // Richtung und Ort
 if(T){if(T.kind==='run'){a.th+=T.sg*v/RUN_R*dt;T.u=cl((a.th-T.from)/(T.to-T.from),0,1);a.ox+=v*Math.cos(a.th)*dt;a.oz+=v*Math.sin(a.th)*dt;leanT=T.sg*cl(v*v/(RUN_R*392),0,.2)*Math.min(1,1.6*Math.sin(Math.PI*T.u));}
  else{T.u=Math.min(1,T.u+dt/T.dur);a.th=lerp(T.from,T.to,T.kind==='throw'?smooth(T.u):ease(T.u));
   if(T.kind==='throw'){T.px+=v*Math.cos(T.from)*dt;T.pz+=v*Math.sin(T.from)*dt;leanT=T.sg*.1*Math.sin(Math.PI*T.u);}// der Drehpunkt (Vorderhufe) rutscht noch ein Stück weiter
   a.ox=T.px-T.xp*Math.cos(a.th);a.oz=T.pz-T.xp*Math.sin(a.th);}
  // Der Kopf führt die Drehung, der Schwanz hängt nach
  const w=Math.sin(Math.PI*T.u);a.thH=cl(a.th+T.sg*.62*w,0,Math.PI);a.thT=cl(a.th-T.sg*.6*w,0,Math.PI);
  if(T.u>=1){a.th=T.to;a.thH=a.thT=a.th;a.turn=null;if(T.kind==='throw'){brake=false;v=0;}}}
 else{a.thH=a.thT=a.th;a.ox+=v*Math.cos(a.th)*dt;a.oz+=v*Math.sin(a.th)*dt;}
 a.brake=brake;to('brk',brake?1:0,brake?9:3.5);to('aq',cl((v-v0)/Math.max(dt,1e-3)/acc,0,1),5);to('lean',leanT,2.5);
 // Gangart folgt dem Tempo
 const gk=a.gk;a.gk=v>(gk==='gallop'?170:215)*pc?'gallop':v>(gk==='walk'?80:62)*pc?'trot':'walk';
 const W=a.gw,ki=GK.indexOf(a.gk);let sum=0,len=0;for(let k=0;k<3;k++){W[k]+=cl((k===ki?1:0)-W[k],-dt*3.2,dt*3.2);sum+=W[k];}for(let k=0;k<3;k++){W[k]/=sum;len+=W[k]*GAITS[GK[k]].stride/GAITS[GK[k]].duty;}
 to('gs',smooth(cl(v/10,0,1)),5);
 const pivot=a.turn&&a.turn.kind!=='run',thr=a.turn&&a.turn.kind==='throw',inPlace=pivot||!a.settled&&v<3,idt=dt>0?1/dt:0,om=(a.th-th0)*idt,f=Math.max(v/(len*lf*Math.max(a.gs,.3)),pivot?Math.max((thr?3:1.5)/hs,1.3*Math.abs(om)):inPlace?1.9/hs:0);a.cyc+=f*dt;
 // Hufe: stehende bleiben liegen, gehobene schwingen zu dem Platz, an dem der Körper zur Mitte des nächsten Stands sein wird
 const F=a.feet||(a.feet=feetInit(a,SH)),G=pivot?TURNG:GAITS[v<3?'walk':a.gk],Tst=f>0?Math.min(G.duty/f,.6):0;
 const thp=a.th+om*Tst*.5,cp=Math.cos(thp),sp=Math.sin(thp),opx=a.ox+(a.ox-ox0)*idt*Tst*.5,opz=a.oz+(a.oz-oz0)*idt*Tst*.5,c=Math.cos(a.th),s=Math.sin(a.th),lift=lerp(2.4,G.lift,a.gs)*lf;let settled=true;
 for(let i=0;i<4;i++){const ft=F[i],h=homeOf(i,L,a.fs),u=((a.cyc+G.off[i])%1+1)%1;
  if(brake&&!(thr&&(i&1))){// Bremsen: der Huf rutscht und bleibt am Körper, die Beine stemmen sich nach vorn
   if(!ft.sl){const dx=ft.x-ox0,dz=ft.z-oz0,c0=Math.cos(th0),s0=Math.sin(th0);ft.bx=dx*c0+dz*s0;ft.bz=-dx*s0+dz*c0;}
   ft.bx+=cl(h.x+(i&1?9:6)-ft.bx,-70*dt,70*dt);ft.bz+=cl(h.z-ft.bz,-40*dt,40*dt);ft.up=Math.max(0,ft.up-50*dt);
   ft.x=a.ox+ft.bx*c-ft.bz*s;ft.z=a.oz+ft.bx*s+ft.bz*c;ft.st=true;ft.rdy=false;ft.w=0;ft.sl=cl(Math.max(v,Math.abs(om)*30)/120,.25,1);settled=false;continue;}
  ft.sl=0;if(u<G.duty)ft.rdy=true;
  if(ft.st){const d=Math.hypot(a.ox+h.x*c-h.z*s-ft.x,a.oz+h.x*s+h.z*c-ft.z);if(d>1.2)settled=false;
   // im Bogen rutscht die Hinterhand bei Tempo ein wenig nach außen
   if(T&&T.kind==='run'&&!(i&1)&&v>85){const r=20*(v/105)*Math.sin(Math.PI*T.u)*dt;ft.x+=T.sg*s*r;ft.z-=T.sg*c*r;ft.sl=.45;}
   if(ft.rdy&&u>=G.duty&&f>0&&(v>1||a.turn||d>1.2)){ft.st=false;ft.rdy=false;ft.w=0;ft.lx=ft.x;ft.lz=ft.z;}}
  if(!ft.st){const tx=opx+h.x*cp-h.z*sp,tz=opz+h.x*sp+h.z*cp,wp=u>=G.duty?(u-G.duty)/(1-G.duty):1;ft.w=Math.min(1,Math.max(ft.w+dt*1.6,Math.min(wp,ft.w+dt*14)));
   const e=smooth(ft.w);ft.x=lerp(ft.lx,tx,e);ft.z=lerp(ft.lz,tz,e);ft.up=lift*Math.sin(Math.PI*ft.w);settled=false;if(ft.w>=1){ft.st=true;ft.x=tx;ft.z=tz;ft.up=0;}}}
 a.settled=settled;a.v=v;
 // Kopf, Atmung, Scharren
 to('hl',a.head==='low'?1:0,2.6);to('hg',a.head==='graze'&&v<70?1:0,1.3);to('ex',a.gk==='gallop'&&v>150?1:0,v>150?.2:.05);
 if(a.actWant&&v<1&&settled&&!a.turn&&!a.turnWant){a.act={kind:'paw',t0:t,dur:3.1,n:3,leg:c>0?3:1};a.actWant=null;}
 // Haltung wechseln (Hinlegen): erst stehen, Hufe gesammelt, geradeaus
 if(wantPose&&v<1&&settled&&!a.turn&&!a.act&&(a.hg||0)<.05){a.v=0;a.gs=0;setMode(a,a.want,t);}}
STIER.step=step;
// Auskunft für Editor, Tests und später den Kampf
STIER.state=a=>{const SH=a.SH||shapeOf(a.cat),sz=szOf(a.cat,SH),T=a.turn;return {gait:(a.v||0)>1?a.gk:null,v:a.v||0,kmh:(a.v||0)*sz*CM*.036,th:a.th||0,turn:T?T.kind:null,turnU:T?T.u:0,brake:!!a.brake,settled:a.settled!==false,x:a.ox||0,z:a.oz||0,
 slide:a.feet?a.feet.reduce((m,f)=>Math.max(m,f.sl),0):0,act:a.act?a.act.kind:null,head:a.head||'up',facing:(a.th||0)<Math.PI/2?1:-1};};

// ---------------------------------------------------------------- Skelett
// Hinterbein: Hüftgelenk – Knie (am Rumpf) – Sprunggelenk – Fessel – Klaue. Vorderbein: Schulter – Ellbogen (am Rumpf) – Vorderfußwurzel – Fessel – Klaue.
// Die Knochenlängen kommen aus dem Stand: Dort stehen die Beine fast gestreckt als Säulen, das Sprunggelenk steht hinter der Linie.
// Beine: 0 hinten und 1 vorn auf der Seite z−, 2 hinten und 3 vorn auf der Seite z+ (bei Blick nach rechts ist z− die ferne Seite).
function rig(a,t,SH){const C=curPose(a,t,SH),lf=SH.leg,D=a.cat,L=SH.L,ph=(D.seed%97)*.13,ex=a.ex||0,breathe=Math.sin(t*(1.1+2.4*ex)+ph);
 const th=a.th||0,cth=Math.cos(th),sth=Math.sin(th),g=a.gs||0,W=a.gw,cy=a.cyc||0,bk=a.brk||0,aq=a.aq||0,hl=a.hl||0,hg=a.hg||0,X=exprOf(a,t);
 // Gang: Auf und Ab, Wippen, Nicken (Schritt: der Kopf nickt mit jedem Vorderbein; Galopp: der steife Rumpf wippt, der Schwanz geht hoch)
 let bob=0,pit=0,dne=0,dhe=0,dta=0,dtc=0,ga=0;
 if(g>0&&W){const wk=W[0]*g,tr=W[1]*g,s2=Math.sin(2*TAU*cy);ga=W[2]*g;const cg=Math.cos(TAU*(cy-.12));
  bob=wk*.4*s2+tr*(.7+.8*Math.sin(2*TAU*cy+.6))+ga*(2-1.9*Math.cos(TAU*(cy-.9)));pit=wk*.012*Math.sin(2*TAU*cy+1)+ga*.08*cg;
  dne=-wk*(.16+.05*Math.sin(2*TAU*cy+.4))-tr*.05-ga*(.2+.06*cg);dhe=wk*.03*Math.sin(2*TAU*cy+2.2)+tr*.1+ga*.2;dta=tr*.45+ga*2.6;dtc=-tr*.1-ga*1.6+.12*g*Math.sin(2*TAU*cy);}
 // Antritt: die Hinterhand setzt sich und schiebt. Bremsen: die Kruppe sinkt, die Vorderbeine stemmen.
 const p=C.p+pit+.06*aq+.1*bk-.05*hg,Tx=Math.cos(p),Ty=-Math.sin(p),Nx=-Math.sin(p),Ny=-Math.cos(p),hx=C.hx-2.5*bk-1.2*aq,hy=C.hy+breathe*.08+bob+2.6*aq+4.2*bk,sx=hx+L*Tx,sy=hy+L*Ty;
 const d1f=18*lf+3.8,FA=.557*d1f,CF=.455*d1f,d1h=Math.hypot(8.5,17*lf+3.8),GA=.56*d1h,CH=.56*d1h,low=-3.4*SH.legW,F=a.feet,c2=cth*cth;
 const act=a.act,pawU=act&&act.kind==='paw'?cl((t-act.t0)/act.dur,0,1):-1,pw=pawU>=0?smooth(cl(pawU/.15,0,1))*smooth(cl((1-pawU)/.15,0,1)):0;
 const leg=i=>{const front=i&1,zs=i<2?-1:1,far=zs*cth<-1e-6?1:0,off=far*c2,jz=zs*ZW*.95;let fx,fy,fz,up=0,sl=0;
  if(F){const f=F[i],dx=f.x-a.ox,dz=f.z-a.oz;fx=dx*cth+dz*sth;fz=-dx*sth+dz*cth;up=f.up;sl=f.sl;fy=-FET-up;}
  else{fz=zs*ZW;if(front){fx=(far?C.ffx2:C.ffx)+far*2.6;fy=far?C.ffy2:C.ffy;}else{fx=C.hfx+far*2.8;fy=C.hfy;}}
  // Scharren: der Huf greift vor, setzt auf und zieht den Sand nach hinten
  if(pawU>=0&&i===act.leg){const env=smooth(cl(pawU/.1,0,1))*smooth(cl((1-pawU)/.12,0,1)),q=(pawU*act.n)%1;let dx,u2=0;
   if(q<.38){const w=smooth(q/.38);dx=lerp(-6,9,w);u2=1.2+4*Math.sin(Math.PI*w);}else{const w=smooth((q-.38)/.62);dx=lerp(9,-6,w);if(w>.04&&w<.92)sl=env;}
   fx+=env*dx*lf;up=env*u2;fy=-FET-up;}
  let jx,jy,ex,ey,r;
  if(front){jx=sx+off*2.6;jy=sy;ex=jx-3*Tx-12*lf*Nx;ey=jy-3*Ty-12*lf*Ny;if(F)ex+=.48*(fx-(sx-2+far*2.6));ey=Math.min(ey,low-1);
   if(F){const dd=Math.hypot(fx-ex,fy-ey),mx=FA+CF-.3;if(dd>mx){ex+=(fx-ex)/dd*(dd-mx);ey+=(fy-ey)/dd*(dd-mx);}}
   r=ik(ex,ey,fx,fy,FA,CF,-1);}
  else{jx=hx-off*2.2;jy=hy;ex=jx+6*Tx-13*lf*Nx;ey=jy+6*Ty-13*lf*Ny;if(F)ex+=.45*(fx-(hx-2.5+far*2.8));ey=Math.min(ey,low-1);
   if(F){const dd=Math.hypot(fx-ex,fy-ey),mx=GA+CH-.3;if(dd>mx){ex+=(fx-ex)/dd*(dd-mx);ey+=(fy-ey)/dd*(dd-mx);}}
   r=ik(ex,ey,fx,fy,GA,CH,1);}
  return {i,front:!!front,zs,far,near:!far,jx,jy,jz,ex,ey,kx:r.kx,ky:Math.min(r.ky,low),kz:(jz+fz)/2,fx:r.fx,fy:Math.min(r.fy,-2.2),fz,up,sl,tx:fx};};
 // Hals und Kopf: gesenkt zeigen die Hörner nach vorn; beim Grasen streckt sich der Hals bis zum Boden, das Maul rupft
 const low_=Math.max(hl,.8*pw),chew=hg>0?Math.sin(t*5.4+ph):0,tear=hg>0?Math.max(0,Math.sin(t*1.7+ph))**6:0;
 let ne=C.ne+dne+breathe*.01+.22*bk+X.dne,he=C.he+dhe+breathe*.01-.1*bk+X.dhe;
 ne=lerp(ne,-.3+.5*dne,low_);he=lerp(he,-1.3,low_);ne=lerp(ne,-1.12+.02*chew+.1*tear,hg);he=lerp(he,-1.5+.04*chew+.22*tear,hg);
 const nk=SH.neck*(1+.5*hg+.12*low_+.1*ga),nbx=sx+4*Tx+3.5*Nx,nby=sy+4*Ty+3.5*Ny,hcx=nbx+nk*Math.cos(ne),hcy=nby-nk*Math.sin(ne);
 const face={ear:cl(X.ear-.8*low_-.3*ga,-1,1),nost:cl(Math.max(X.nost,.7*ex,.5*low_),0,1),white:cl(Math.max(X.white,.6*low_*(D.form==='ox'?.3:1)),0,1),blink:(t*.31+ph)%1<.035?1:0,puff:X.puff,chew};
 return {C,p,Tx,Ty,Nx,Ny,hx,hy,sx,sy,L,breathe,ph,legs:[leg(0),leg(1),leg(2),leg(3)],nbx,nby,hcx,hcy,ne,he,ta:C.ta+dta+.5*X.tail,tc:C.tc+dtc+1.3*X.tail,cx:(hx+sx)/2,lie:cl(C.sag,0,1),
  th,thH:a.thH===undefined?th:a.thH,thT:a.thT===undefined?th:a.thT,lean:a.lean||0,face,sand:pawU>=0?-1:1,g,ga};}
STIER.rig=(a,t)=>rig(a,t,a.SH||shapeOf(a.cat));

// ---------------------------------------------------------------- Zeichner
// Seitenansicht wie in ST1. Beim Wenden (th zwischen 0 und π) wird derselbe Körper um die Hochachse gedreht gezeichnet:
// Ein Punkt (x nach vorn, y Höhe, z zur Seite) liegt im Bild bei x·cos − z·sin. Dicken bleiben, darum wird das Rind von vorn schmal, hoch und breitbrüstig statt zum Strich.
// Der Kopf dreht mit eigenem Winkel voraus: bis 60° als Seitenkopf mit kürzer werdendem Gesicht, danach als Kopf von vorn. Die Hörner sind in jeder Stellung dieselbe räumliche Kurve.
const G=-.25;// nichts reicht unter den Boden
const gy=y=>Math.min(y,G);
const HE0=-.8,HC=Math.cos(HE0),HS=Math.sin(HE0);// Bezugshaltung des Kopfes für die Hornrichtung
const LT=[1,0,0,1,0,0],SAND=['#d9c79d','#b89f72','#c9b386'];
function drawBull(c,a,px,py,k,face,opt={}){const D=a.cat,col=D.appearance.colors,SH=a.SH||shapeOf(D),sz=szOf(D,SH),t=opt.time??performance.now()/1000,bull=D.form!=='ox';
 const R=rig(a,t,SH),{Tx,Ty,Nx,Ny,hx,hy,sx,sy,L,C}=R,bk=SH.bulk,lw=SH.legW,hf=SH.hoof,seed=D.seed%1000;
 // plain: genau von der Seite (wie ST1, bei Blick nach links wird die Zeichenfläche gespiegelt). Sonst gedreht: cX, sX Drehung des Rumpfs, lam Schräglage in der Kurve.
 const sn=Math.sin(R.th),cs=Math.cos(R.th),plain=sn<.002&&Math.abs(R.lean)<.002,cX=plain?1:cs,sX=plain?0:sn,cD=plain?(cs<0?-1:1):cs,lam=plain?0:R.lean,aX=Math.abs(cX);if(plain&&cs<0)face=-face;
 const base=col.base,light=col.light,shade=col.shade,dark=col.dark,farC=mix(shade,dark,.6),nearC=mix(base,light,.3),nearLo=mix(base,light,.42),jcN=mix(base,light,.55);
 const PX=(x,y,z)=>x*cX-(z-lam*y)*sX,DY=(x,z)=>DK*(x*sX+z*cD);
 const lay=z=>{if(plain){TM=null;return;}LT[0]=cX;LT[1]=DK*sX;LT[2]=lam*sX;LT[4]=-z*sX;LT[5]=DK*z*cD;TM=LT;};
 c.save();c.translate(px,py);c.scale(k,k);
 if(!opt.noShadow){c.fillStyle='#1c140c50';c.beginPath();c.ellipse(face*PX(R.cx+5,0,0)*sz,1,((L*.5+19+R.lie*4)*aX+13*(1-aX))*sz,(3.8+R.lie+2.5*(1-aX))*sz,0,0,TAU);c.fill();}
 c.scale(face*sz,sz);GS=(opt.px||STIER.PX)/sz;TM=null;TS=1;
 // Runde Masse: Die Mitte dreht mit, die Rundung bleibt (wr: Breite der Masse im Verhältnis zur Länge)
 const blob=(x,y,rx,ry,cc,z=0,wr=.9)=>{const X=plain?x:PX(x,y,z),dy=plain?0:DY(x,z),r=plain?rx:rx*(aX+(1-aX)*wr),pts=[],tm=TM;TM=null;for(let i=0;i<16;i++){const an=i/16*TAU;pts.push([X+Math.cos(an)*r,gy(y+Math.sin(an)*ry)+dy]);}poly(c,pts,cc);TM=tm;};
 // ---- Bein: Punkte einzeln ins Bild gerechnet (jeder Huf hat seinen eigenen Platz in der Tiefe). Farbe nach Tiefe: beim Wenden wird das nahe Bein ohne Sprung zum fernen.
 const lm=(x,y,o,xx,yy,oo,w1,w2,cc)=>limb(c,x,Math.min(y,G-w1/2)+o,xx,Math.min(yy,G-w2/2)+oo,w1,w2,cc),dk=(x,y,o,r,cc)=>disk(c,x,Math.min(y,G-r)+o,r,cc);
 function drawLeg(l){const dq=plain?(l.near?1:0):Math.round(cl((l.zs*cD+1)/2+(l.front?.5:-.3)*sX,0,1)*8)/8,up=dq>=1?nearC:dq<=0?farC:mix(farC,nearC,dq),lo=dq>=1?nearLo:dq<=0?farC:mix(farC,nearLo,dq),jc=dq>=1?jcN:dq<=0?farC:mix(farC,jcN,dq);
  const oj=DY(l.jx,l.jz),ok=DY(l.kx,l.kz),of=DY(l.fx,l.fz),jX=PX(l.jx,l.jy,l.jz),eX=PX(l.ex,l.ey,l.jz),kX=PX(l.kx,l.ky,l.kz),fX=PX(l.fx,l.fy,l.fz);TM=null;
  if(l.front){lm(jX,l.jy+2,oj,eX,l.ey,oj,14*lw*bk,9.5*lw,up);lm(eX,l.ey,oj,kX,l.ky,ok,8.4*lw,5*lw,up);dk(kX,l.ky,ok,3*lw,jc);lm(kX,l.ky,ok,fX,l.fy,of,4.3*lw,3.9*lw,lo);dk(fX,l.fy,of,2.5*lw,lo);}
  else{lm(jX-cX,l.jy+3,oj,eX,l.ey,oj,19*lw*bk*SH.rump,11.5*lw,up);lm(eX,l.ey,oj,kX,l.ky,ok,9.6*lw,5.2*lw,up);dk(kX,l.ky,ok,3*lw,jc);lm(kX,l.ky,ok,fX,l.fy,of,4.6*lw,4*lw,lo);dk(fX,l.fy,of,2.6*lw,lo);}
  // Klaue: Fessel schräg nach vorn unten, darunter die gespaltene Klaue, hinten die Afterklaue. Von vorn: breiter Block mit dem Spalt in der Mitte. Gehoben hängt die Spitze.
  const x=fX,y=l.fy,m=aX,e=cX,w=4.9*hf*lw,bot=Math.min(G,y+FET+G),by=Math.min(y+2.2*hf,bot-.8),dr=Math.min(l.up,4)*.3,wf=2.3*hf*lw;
  lm(x,y,of,x+1.3*hf*e,by,of,3.8*lw,3.9*lw*hf,lo);
  poly(c,[[x-e*lerp(wf,1.2*hf,m),by-.4+of],[x+e*lerp(wf,2.6*hf,m),by-.6+of],[x+e*lerp(wf,w-1.4*hf,m),bot+dr+of],[x-e*lerp(wf,1.6*hf,m),bot+of]],col.hoof);
  if(dq>.5&&bot-by>1.4){if(m>.6)seg(c,x+1.2*hf*e,by+.6+of,x+1.9*hf*e,bot-.3+of,.4,mix(col.hoof,'#000000',.5));else if(m<.4)seg(c,x,by+.2+of,x,bot-.2+of,.4,mix(col.hoof,'#000000',.5));}
  if(m>.3)rr(c,x-e*2.4*hf*lw-(e<0?1.3*hf:0),Math.min(y+.4,bot-1.5*hf)+of,1.3*hf,1.5*hf,col.hoof);}
 // Reihenfolge nach Tiefe: von der Seite ferne Beine, Rumpf, nahe Beine; von vorn Hinterbeine, Rumpf, Vorderbeine
 const dep=l=>(l.jx-R.cx)*sX+l.zs*ZW*cD,LS=plain?R.legs:[...R.legs].sort((p,q)=>dep(p)-dep(q));
 for(const l of LS)if(dep(l)<0)drawLeg(l);
 // ---- Schwanz: lange Rute, hängt fast senkrecht bis unter das Sprunggelenk, am Ende die Quaste. Beim Wenden hängt er nach (eigener Winkel), im Galopp steht er hoch.
 {const n=9,len=4.3*SH.tail,w0=3.4*bk,sway=Math.sin(t*.8+R.ph)*.05+Math.sin(t*2.1+R.ph*2)*.02,up=[],dn=[],cT=plain?1:Math.cos(R.thT),x0=hx-Tx*8.6*bk*SH.rump+Nx*6.4*bk,y0=hy-Ty*8.6*bk*SH.rump+Ny*6.4*bk,X0=PX(x0,y0,0),o0=DY(x0,0);let x=x0,y=y0;TM=null;
  const Q=xx=>X0+(xx-x0)*cT;
  for(let i=0;i<=n;i++){const u=i/n,an=R.ta+R.tc*Math.pow(u,1.3)+sway*u*u,w=lerp(w0,1.3,Math.pow(u,.5))/2,ca=Math.cos(an),sa=Math.sin(an);
   if(i){x+=ca*len;y=Math.min(y+sa*len,-1.2);}up.push([Q(x+sa*w),gy(y-ca*w)+o0]);dn.push([Q(x-sa*w),gy(y+ca*w)+o0]);}
  poly(c,up.concat(dn.reverse()),mix(base,shade,.4));disk(c,Q(x0+1),Math.min(y0+1,G-w0*.7)+o0,w0*.7,base);
  const an=R.ta+R.tc,ca=Math.cos(an),sa=Math.sin(an);limb(c,Q(x),Math.min(y,G-1.3)+o0,Q(x+ca*6.5*SH.tail),Math.min(y+sa*6.5*SH.tail,G-2.2)+o0,2.6,4.4,col.tuft);disk(c,Q(x+ca*7.5*SH.tail),Math.min(y+sa*7.5*SH.tail,G-1.5)+o0,1.5,col.tuft);}
 // ---- Rumpf: gerade Rückenlinie vom Hüftgelenk zur Schulter, tiefer Brustkorb, Widerrist, aufgezogene Flanke
 const top=[],bot=[],n=12,br=R.breathe*.25;
 for(let i=0;i<=n;i++){const u=i/n,x=hx+L*Tx*u,y=hy+L*Ty*u,su=smooth(u);
  const rt=(9.8+2.2*su*SH.chest)*bk+SH.wither*Math.exp(-Math.pow((u-.88)/.14,2))+5.5*SH.hump*Math.exp(-Math.pow((u-.92)/.13,2))-.7*Math.sin(Math.PI*cl((u-.2)/.5,0,1));
  const rb=(9.8+5*su*SH.chest-1.5*Math.sin(Math.PI*cl(u/.55,0,1))*(1-C.sag)+C.sag*1.2*Math.sin(Math.PI*u)+br*Math.sin(Math.PI*u))*bk;
  top.push([x+Nx*rt,gy(y+Ny*rt)]);bot.push([x-Nx*rb,gy(y-Ny*rb)]);}
 const rH=8.7*bk*SH.rump,rS=(9.6+2.5*SH.chest)*bk,strip=aX>.5;lay(0);
 blob(hx-2*SH.rump,hy+1,rH,9.2*bk*SH.rump,base);blob(sx,sy,rS,rS,base);
 if(!plain){// von vorn: Becken, Bauch und Brustkorb als runde Massen mit Breite; die Brust des Stiers ist breit und tief, dahinter wölbt sich der Bauch
  const mx=hx+L*Tx*.5,my=hy+L*Ty*.5+1;for(const sd of [-1,1]){blob(hx-2*SH.rump,hy+1.5,rH*.95,9.2*bk*SH.rump,base,sd*4.4*bk);blob(mx,my,10.4*bk,10.6*bk,base,sd*3.4*bk);blob(sx,sy+.8,rS*.96,rS,base,sd*4.6*bk);}
  TM=null;limb(c,PX(hx,hy,0),Math.min(hy,G-rH)+DY(hx,0),PX(sx,sy,0),Math.min(sy,G-rS)+DY(sx,0),2*rH,2*rS,base);lay(0);}
 if(aX>.15)poly(c,[...top,...[...bot].reverse()],base);
 blob(sx+4.5,sy+(7.4+4.2*SH.chest)*bk-4,7*bk,5.2*bk,base,0,1.25);// Brustbein (Vorbrust), von vorn breit
 // Hodensack (nur Stier) und Pinselhaare am Bauch
 if(bull&&aX>.3)blob(hx+4.5,gy(hy+(8.8+4.4)*bk+2.2-C.sag*5),3*bk,4.2*bk,mix(base,shade,.5));
 if(strip)seg(c,hx+L*.52,gy(bot[6][1]-.4),hx+L*.52-.6,gy(bot[6][1]+2.4),.8,col.tuft);
 // ---- Hals mit Wamme: der Hals setzt tief und breit an der Schulter an, die Wamme hängt von der Kehle bis zur Vorbrust. Der Kopf führt die Drehung, der Hals schwenkt mit.
 const hs=SH.headS,nw=21*SH.neckW*bk,hw=12.6*hs,cH=plain?1:Math.cos(R.thH),sH=plain?0:Math.sin(R.thH),aH=Math.abs(cH),nl=R.hcx-R.nbx;
 const NBX=PX(R.nbx,R.nby,0),HX=NBX+nl*cH,HO=DK*(R.nbx*sX+nl*sH),HY=R.hcy+HO,SX=PX(sx,sy,0),SO=DY(sx,0),cN=(cX+cH)/2;TM=null;
 const thx=HX-2*hs*cH,thy=HY+6.2*hs,bx=SX+8.5*cX,byb=sy+(7.4+4.2*SH.chest)*bk-2.5+SO;
 if(SH.dewlap>.05){const dl=SH.dewlap,mxx=lerp(thx,bx,.55),myy=lerp(thy,byb,.55),dw=plain?1:Math.max(aX,.35)*(cN<0?-1:1);
  poly(c,[[thx-dw,gy(thy-2)],[thx+1.5*dw,gy(thy+1.4*dl)],[mxx+2.4*dl*dw,gy(myy+3.4*dl)],[bx+1.6*dl*dw,gy(byb+1.2*dl)],[bx-5*dw,gy(byb-2)],[SX+2*cX,gy(sy+2)+SO]],mix(base,shade,.45));}
 limb(c,PX(sx+2.5*Tx,sy,0),Math.min(sy+2.5*Ty+.5,G-nw/2)+SO,HX-1.5*cH,Math.min(R.hcy+.5,G-hw/2)+HO,nw,hw,base);lay(0);
 // Lichter und Schatten: heller Rücken, dunkle Unterseite (damit auch ein schwarzes Tier Form hat)
 if(strip){poly(c,top.slice(1,n).concat(top.slice(1,n).reverse().map(([x,y])=>[x-Nx*2.2,gy(y-Ny*2.2)])),mix(base,light,.5));
  poly(c,bot.slice(1,n).map(([x,y])=>[x+Nx*2.4,gy(y+Ny*2.4)]).concat(bot.slice(1,n).reverse()),mix(base,shade,.6));}
 else{blob((hx+sx)/2,(hy+sy)/2-9.5*bk,5,2,mix(base,light,.42),0,2);blob(sx+2,sy+rS*.62,rS*.5,rS*.42,mix(base,shade,.5),0,1.5);}// von vorn: Licht auf dem Rücken, Schatten zwischen den Vorderbeinen
 // Fellmuster (gemerkt): Stromung als schräge dunkle Streifen
 {const P=patternOf(D);if(P.st.length){const cc=mix(shade,dark,.35);if(aX>.25)for(const [u,v0,v1,du,h] of P.st){const f=u*n,i=Math.min(n-1,Math.floor(f)),q=f-i,tx=lerp(top[i][0],top[i+1][0],q),ty=lerp(top[i][1],top[i+1][1],q),bxx=lerp(bot[i][0],bot[i+1][0],q),byy=lerp(bot[i][1],bot[i+1][1],q);
   seg(c,lerp(tx,bxx,v0)+du*L*v0,gy(lerp(ty,byy,v0)),lerp(tx,bxx,v1)+du*L*v1,gy(lerp(ty,byy,v1)),h>.8?1.5:.9,cc);}
   TM=null;for(let i=0;i<5;i++){const q=(i+.5)/5,x=lerp(SX+4*cX,HX-3*cH,q),y=lerp(sy+SO,HY,q);seg(c,x,gy(y-nw*.22*lerp(1,.6,q)),x+1.2*cN,gy(y+nw*.24*lerp(1,.6,q)),.9,cc);}}}
 for(const l of LS)if(dep(l)>=0)drawLeg(l);lay(0);
 // Schulter- und Hüftlicht (Muskel) auf der Seite zum Betrachter, danach der Nackenkamm
 {const zn=cD<0?-8:8,cl2=mix(base,light,.24);blob(sx-3.5,sy+2,4.4*bk,7*bk,cl2,zn);if(aX<.75)blob(sx-3.5,sy+2,4.4*bk*(1-aX),7*bk,cl2,-zn);if(aX>.3)blob(hx+1.5,hy+3,4*bk*SH.rump,5.6*bk*SH.rump,mix(base,light,.2),zn);}
 // ---- Nackenkamm (Stier): der Nackenmuskel steht als hoher Wulst über Hals und Widerrist
 TM=null;const el=(x,y,rx,ry,cc)=>{const pts=[];for(let i=0;i<16;i++){const an=i/16*TAU;pts.push([x+Math.cos(an)*rx,gy(y+Math.sin(an)*ry)]);}poly(c,pts,cc);},wN=Math.abs(cN)+(1-Math.abs(cN))*.8,NBY=R.nby+DY(R.nbx,0);
 if(SH.crest>.05){const cr=SH.crest*bk*.85,ux=Math.cos(R.ne)*cN,m1=.34,m2=.66,ax=lerp(NBX,HX,m1),ay=lerp(NBY,HY,m1),bxx=lerp(NBX,HX,m2),byy=lerp(NBY,HY,m2);
  el(NBX-2*cX,NBY-nw*.36-2.2*cr,(7.4+2*cr)*wN,3+4.2*cr,base);el(ax,ay-nw*.33-3.4*cr,(7.6+1.5*cr)*wN,3+4.6*cr,base);el(bxx,byy-hw*.5-2.6*cr,(5.6+cr)*wN,2.4+3.2*cr,base);
  el(ax-cN+ux,ay-nw*.33-4.6*cr,(5.2+cr)*wN,1.3+1.9*cr,mix(base,light,.5));}
 if(SH.hump>.05)el(PX(sx-L*.08,sy,0),sy-(9.8+2.2*SH.chest)*bk-3.2*SH.hump+SO,(6+2.4*SH.hump)*wN,2+2.6*SH.hump,mix(base,light,.4));
 // ---- Kopf (Zeichner je Rasse): fernes Horn und Ohr zeichnet der Kopfzeichner zuerst
 {const hyc=Math.min(HY,G-7*hs),co=Math.cos(R.he)*hs,si=Math.sin(R.he)*hs,P=hornCurve(SH,D.appearance.horn||1),o={t,breathe:R.breathe,prim:STIER.prim,horn:P,bull,f:R.face};TS=hs;let mzx,mzy;
  if(aH>=.5){const sg=cH<0?-1:1,c2=aH*aH,q=sH,tip=7+9*SH.face*(plain?1:.4+.6*aH);TM=[sg*co,-si,sg*si,co,HX,hyc];
   // Hornpunkt (f nach vorn, u nach oben, l zur Seite) im Stand → Rahmen des Kopfes (dreht sich mit dem Kopf). Genau von der Seite wird der Weg zur Seite wie bei leicht schräger Sicht
   // nach vorn gelegt (das nahe Horn zeigt sich als Sichel, das ferne steht kürzer dahinter); dreht der Kopf zum Betrachter, wandert das nahe Horn nach hinten und das ferne nach vorn, bis beide seitlich stehen.
   const A=(s,f,l)=>aH*f+(c2*(s>0?.62:-.12)-s*q)*l-s*q*4.6,B=(s,u,l)=>-u+c2*(s>0?.24:-.14)*l;
   o.hornX=s=>(f,u,l)=>HC*A(s,f,l)-HS*B(s,u,l);o.hornY=s=>(f,u,l)=>HS*A(s,f,l)+HC*B(s,u,l);
   (STIER.HEADS[SH.head]||headPlain)(c,D,plain?SH:{...SH,face:SH.face*(.4+.6*aH)},col,o);mzx=txf(tip,0);mzy=tyf(tip,0);}
  else{// Kopf von vorn: yc schiebt das Gesicht zur Seite, in die der Kopf schaut (das Maul liegt weiter vorn als die Stirn), die Hörner bekommen ihre Tiefe aus derselben Kurve
   const yc=cH,pox=co*-.9+si*-5.65,poy=-si*-.9+co*-5.65,sh=hs*yc*.5;TM=[hs,0,sh,hs,HX+2*yc*pox+8.6*sh,hyc+poy+8.6*hs];o.yc=yc;o.q=Math.sqrt(1-yc*yc);o.pitch=R.he-HE0;
   (STIER.HEADS_FRONT[SH.head]||headFrontPlain)(c,D,SH,col,o);mzx=txf(0,12*SH.face);mzy=tyf(0,12*SH.face);}
  TM=null;TS=1;
  // Schnauben: Staub und Atem vor den Nüstern
  if(R.face.puff>0&&!opt.noFx){const u=R.face.puff,d=aH>=.5?(cH<0?-1:1):0;for(let j=0;j<5;j++){const h=hrand(j*5.3+seed);rr(c,mzx+d*(2+u*(7+6*h))+(d?0:(h-.5)*8*u),Math.min(mzy+1+u*(2+5*h),G-1),1.2,1.2,j%2?'#e6dcc4':'#cdbf9f');}}}
 // Sand: spritzt, wo ein Huf rutscht oder scharrt
 if(!opt.noFx)for(const l of R.legs)if(l.sl>.05){const X=PX(l.fx,0,l.fz),o=DY(l.fx,l.fz),dir=R.sand*cX;for(let j=0;j<7;j++){const ph=t*2.4+j*.143,age=ph%1,h=hrand(j*7.7+l.i*3.1+Math.floor(ph)*1.37),h2=hrand(j*3.3+l.i+Math.floor(ph)*2.1);if(h2>l.sl+.2)continue;
   rr(c,X+dir*(3+(6+18*h)*age*l.sl)+(h2-.5)*3,Math.min(G-1,-1-(8+12*h2)*age+17*age*age)+o,h>.6?1.6:1,1,SAND[j%3]);}}
 c.restore();return R;}
function headPlain(c,D,SH,col,o){const tip=7+9*SH.face;disk(c,0,0,6.6,col.base);poly(c,[[-1,-6.4],[4,-6.4],[tip-1,-2.6],[tip,2.4],[tip-3,4.2],[2,6.4],[-4,5.6]],col.base);rr(c,tip-2.6,-1,1.4,1.4,col.nose);rr(c,3,-3.4,1.4,1.4,col.eye);
 drawHorn(c,o.horn,(f,u,l)=>-1.2+o.hornX(1)(f,u,l),(f,u,l)=>-5.6+o.hornY(1)(f,u,l),3*SH.hornThick,col.horn,col.hornTip);}
STIER.draw=drawBull;
// Lage im Bild in Zeichen-Einheiten (mal Größe und Maßstab nehmen): Ort des Rinds, Kopf und Hufe; für Messungen im Editor und in Tests
STIER.view=(a,t)=>{const SH=a.SH||shapeOf(a.cat),R=rig(a,t,SH),s=Math.sin(R.th),c=Math.cos(R.th),ox=a.ox||0,oz=a.oz||0,nl=R.hcx-R.nbx;
 return {x:ox,y:DK*oz,headX:ox+R.nbx*c+nl*Math.cos(R.thH),headY:R.hcy+DK*(oz+R.nbx*s+nl*Math.sin(R.thH)),hipX:ox+R.hx*c,hipY:R.hy+DK*(oz+R.hx*s),
  feet:R.legs.map(l=>({x:ox+l.fx*c-l.fz*s,y:l.fy+DK*(oz+l.fx*s+l.fz*c),up:l.up,sl:l.sl,miss:Math.abs(l.fx-l.tx)}))};};

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
