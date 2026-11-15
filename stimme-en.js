'use strict';
// =====================================================================================================
// STIMME ENGLISCH (window.StimmeEN) – englische Sprachausgabe für die englische Fassung des Spiels (seit 15.11.2026; noch nicht eingebunden).
// Gleicher Klangkern wie stimme.js (Glottispuls, Formantkaskade, Rauschzweige, Lokus-Übergänge) und gleiche Schnittstelle
// (render/play/playData/mouthAt, PRESETS mit denselben Schlüsseln, STYLES, setVoices, setLexicon). Für die englische Fassung reicht später
// „window.Stimme=window.StimmeEN“ bzw. sprech-worker-en.js statt sprech-worker.js. stimme.js wird hier nicht gebraucht und nicht verändert.
// Englisch ist neu gebaut:
//  1. Aussprache: Wörterbuch der Ausnahmen (stimme-en-lex.js, aus dem CMU Pronouncing Dictionary abgeleitet; nur Wörter, bei denen die Regeln
//     danebenliegen) + Wortbildung (-s, -ed, -ing, -ly, -er, -est, -ness …, 's, 'll, n't) + Buchstabenregeln mit Betonungs- und
//     Abschwächungsregeln (unbetonte Vokale werden zu Schwa) für alles, was nicht im Wörterbuch steht (Namen, lateinische Wörter).
//  2. Zwei Akzente aus einer Lautschrift: 'us' (amerikanisch, mit r und weichem t; Standard, weil das Wörterbuch amerikanisch ist und die
//     Spracherkennung es am besten versteht) und 'uk' (britisch, ohne r nach Vokal, „Römerfilm-Englisch“). setAccent('uk') oder das Feld accent
//     einer Stimme stellt um. Britisch: bath/last mit langem a, new/tune mit j, Binde-r vor Vokal.
//  3. Laute: th (stimmlos/stimmhaft), w, englisches r (tiefes F3), helles und dunkles l, Behauchung von p/t/k, kurzer Vokal vor
//     stimmlosem Auslaut (bet/bed), Doppellaute, Schwa.
//  4. Satz: schwache Formen (a, the, to, of, and, for, can, was …), Satzakzent auf dem letzten Inhaltswort, Ja/Nein-Frage steigt, W-Frage fällt,
//     *Sternchen* und GROSS = Kontrastbetonung, Zahlen und Ordnungszahlen ausgeschrieben.
//  5. Sprechweisen und Regie wie im Deutschen, mit englischen Anweisungen: [shouts] [roars] [whispers] [laughs] [scared] … (die deutschen gelten auch).
// Lautschrift (ein Zeichen je Laut, ' vor dem betonten Vokal): i fleece, I kit, e face, E dress, a trap, A palm/start, Q lot, O thought/north,
//   o goat, U foot, u goose, V strut, @ Schwa, 3 nurse, 6 lettER, Y price, W mouth, X choice; p b t d k g f v T(thin) D(this) s z S(sh) Z(vision)
//   h m n N(ng) l r w j(yes) C(ch) J(judge). Nur intern (vom Akzent erzeugt): 7 near, 8 square, 9 cure, F weiches t, L dunkles l.
// Gemessen (15.11.2026, 30 Spielsätze, Spracherkennung PocketSphinx, zwei Stimmen): 32 % falsch verstandene Wörter amerikanisch, 45 % britisch
//   (die Erkennung ist amerikanisch geschult); dieselbe Erkennung versteht die freie Sprachausgabe eSpeak zu 75 % falsch.
// Leistung: Regeln und Wörterbuch werden erst beim ersten Wort aufgebaut, jedes Wort wird nur einmal umgeschrieben (Zwischenspeicher),
//   gerechnet wird wie bisher im Worker. Der Kern (synth) ist derselbe wie in stimme.js.
// =====================================================================================================
(()=>{
const G_=typeof window!=='undefined'?window:self;
const SR=32000,TAU=Math.PI*2,FR=.001;
const clamp=(x,a,b)=>x<a?a:x>b?b:x;
function rng(seed){let a=(seed>>>0)||1;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

// ---------- Rauschspektren der parallelen Zweige: Bänder [Mitte Hz, Güte, Pegel], by = Breitband-Anteil ----------
const SH=[],SHN={};
function shape(name,bands,by=0,st=0){SHN[name]=SH.length;SH.push({bands,by,st});}
shape('s',[[6200,2.6,1],[8800,1.8,.6]],.04);
shape('S',[[2500,2.2,1],[3900,1.8,.8],[6000,1.2,.3]],.03);
shape('C',[[3700,3.2,1],[5400,2,.4]],.03);
shape('x',[[1250,2.6,1],[2500,1.8,.35]],.02);
shape('f',[[2500,.6,.18],[7000,.8,.3]],.3);
shape('R',[[1150,1.6,.7],[2300,1.6,.25]],.03);
shape('p',[[900,.8,.6],[2500,.6,.3]],.45);
shape('t',[[4300,1.5,1],[7000,1.3,.6]],.1);
shape('k',[[1900,2.8,1],[3000,1.8,.4]],.05);
shape('h',[[1600,.4,.2]],.35);
shape('ein',[[1800,1.3,.6],[3400,1.4,.5]],.25);
shape('blub',[[650,7,1]],0);
shape('rasp',[[850,1.4,.8],[1800,1.6,.5]],.06);
shape('zisch',[[5200,1.4,1],[7600,1.4,.7]],.15);
// Sprachlaute (seit 11.11.2026): steile Filter (4. Ordnung, st=1). Vorher lief das Rauschen von s, sch, f und den Verschlusslauten bis in die
// Tiefen hinunter – alles klang nach demselben Zischen, k war nicht von p oder t zu unterscheiden. Die Formen oben bleiben für die Schreie.
shape('+s',[[5600,1.3,1],[8200,1.1,.8]],0,1);
shape('+S',[[2500,1.4,1],[3900,1.2,.85],[6000,1,.35]],0,1);
shape('+C',[[3700,1.7,1],[5600,1.2,.5]],0,1);
shape('+x',[[1300,1.5,1],[2600,1.2,.45],[4200,.9,.15]],0,1);
shape('+f',[[2800,.45,.5],[7500,.6,.6]],.05,1);
shape('+R',[[1150,1.4,1],[2300,1.2,.35]],0,1);
shape('+p',[[650,.6,1],[1700,.5,.45]],.06,1);
shape('+t',[[4400,1.1,1],[7400,1,.75]],.02,1);
shape('+k',[[1900,2,1],[3500,1.2,.3]],0,1);
// englische Reibelaute th: schwaches, breites Rauschen ohne eigene Mitte
shape('+T',[[1700,.5,.45],[6800,.7,.75]],.1,1);

// ---------- Lauttabelle ----------
// k: v Vokal, d Doppellaut, n Nasal, l Liquida/Gleitlaut, f Reibelaut, p Verschluss, h Hauch, q Knacklaut
// F: F1–F4 (Hz, Männerstimme), d/m: Eigen-/Mindestdauer (ms), o: Mundöffnung, vc: stimmhaft, pl: Artikulationsort
const CONS={
 m:{k:'n',F:[260,1050,2100,3300],d:70,m:42,o:0,pl:'lab',nz:430},
 n:{k:'n',F:[260,1550,2650,3400],d:68,m:40,o:.25,pl:'alv',nz:480},
 N:{k:'n',F:[260,2050,2750,3400],d:72,m:42,o:.3,pl:'vel',nz:520},
 l:{k:'l',F:[310,1180,2800,3500],d:66,m:40,o:.35,pl:'alv'},
 L:{k:'l',F:[430,830,2700,3400],d:78,m:46,o:.35,pl:'alv'},
 r:{k:'l',F:[330,1080,1520,3100],d:70,m:40,o:.35,pl:'rho'},
 w:{k:'l',F:[290,610,2250,3300],d:76,m:44,o:.15,pl:'lab'},
 j:{k:'l',F:[270,2200,3000,3600],d:58,m:32,o:.3,pl:'pal'},
 f:{k:'f',d:95,m:55,o:.2,pl:'lab',fs:'+f',af:.17},
 v:{k:'f',vc:1,d:60,m:36,o:.2,pl:'lab',fs:'+f',af:.06},
 T:{k:'f',d:92,m:52,o:.25,pl:'den',fs:'+T',af:.13},
 D:{k:'f',vc:1,d:46,m:28,o:.25,pl:'den',fs:'+T',af:.035},
 s:{k:'f',d:105,m:60,o:.25,pl:'alv',fs:'+s',af:.24},
 z:{k:'f',vc:1,d:72,m:40,o:.25,pl:'alv',fs:'+s',af:.15},
 S:{k:'f',d:105,m:62,o:.35,pl:'post',fs:'+S',af:.33},
 Z:{k:'f',vc:1,d:72,m:42,o:.35,pl:'post',fs:'+S',af:.24},
 h:{k:'h',d:68,m:40,o:.5,pl:'glot'},
 p:{k:'p',d:82,m:50,o:0,pl:'lab',fs:'+p',ba:.55,bd:.006},
 t:{k:'p',d:68,m:42,o:.2,pl:'alv',fs:'+t',ba:.6,bd:.009},
 k:{k:'p',d:78,m:48,o:.35,pl:'vel',fs:'+k',ba:.9,bd:.02},
 b:{k:'p',vc:1,d:62,m:38,o:0,pl:'lab',fs:'+p',ba:.5,bd:.006},
 d:{k:'p',vc:1,d:54,m:32,o:.2,pl:'alv',fs:'+t',ba:.38,bd:.007},
 g:{k:'p',vc:1,d:62,m:38,o:.35,pl:'vel',fs:'+k',ba:.6,bd:.016},
 F:{k:'p',vc:1,flap:1,d:22,m:16,o:.25,pl:'alv',fs:'+t',ba:.1,bd:.003},
 '?':{k:'q',d:22,m:14,o:.3,pl:'glot'},
 _:{k:'_',d:0,m:0,o:0}
};
const VOW_BOTH={
 i:{k:'v',F:[285,2250,2900,3500],d:128,m:68,o:.35,hi:1},
 I:{k:'v',F:[400,1950,2550,3450],d:74,m:42,o:.4,hi:1},
 E:{k:'v',F:[560,1800,2500,3500],d:86,m:48,o:.6},
 U:{k:'v',F:[440,1050,2300,3350],d:76,m:42,o:.35,hi:1},
 '@':{k:'v',F:[500,1480,2450,3450],d:50,m:28,o:.45,sw:1},
 e:{k:'d',F:[490,1930,2600,3500],to:[340,2150,2750,3500],d:150,m:86,o:.55},
 Y:{k:'d',F:[730,1250,2500,3500],to:[420,1950,2650,3500],d:165,m:95,o:.9},
 W:{k:'d',F:[740,1380,2450,3400],to:[450,950,2350,3300],d:170,m:100,o:.9},
 X:{k:'d',F:[520,850,2400,3400],to:[400,1900,2550,3400],d:170,m:100,o:.7}
};
// amerikanisch: r-gefärbtes 3 und 6 (tiefes F3), langes helles a, o als [oʊ], lot = palm
const VOW_US={
 a:{k:'v',F:[690,1680,2450,3450],d:125,m:66,o:.85,lo:1},
 A:{k:'v',F:[730,1120,2480,3400],d:138,m:74,o:1,lo:1},
 Q:{k:'v',F:[720,1130,2480,3400],d:112,m:62,o:1,lo:1},
 O:{k:'v',F:[600,890,2450,3400],d:135,m:72,o:.7},
 u:{k:'v',F:[310,950,2250,3300],d:130,m:70,o:.3,hi:1},
 V:{k:'v',F:[640,1220,2500,3450],d:86,m:48,o:.75},
 '3':{k:'v',F:[480,1350,1650,3200],d:135,m:72,o:.45},
 '6':{k:'v',F:[470,1380,1700,3200],d:70,m:40,o:.45,sw:1},
 o:{k:'d',F:[520,1000,2400,3400],to:[370,820,2300,3300],d:150,m:86,o:.6},
 '7':{k:'d',F:[360,2100,2700,3500],to:[470,1500,1750,3250],d:150,m:86,o:.4},
 '8':{k:'d',F:[560,1800,2500,3500],to:[500,1450,1750,3250],d:150,m:86,o:.6},
 '9':{k:'d',F:[420,1050,2300,3350],to:[470,1350,1700,3250],d:150,m:86,o:.4}
};
// britisch: kurzes rundes lot, geschlossenes langes O, vorderes u, o als [əʊ], 3 und 6 ohne r-Färbung, near/square/cure als eigene Laute
const VOW_UK={
 a:{k:'v',F:[740,1560,2450,3450],d:100,m:56,o:.9,lo:1},
 A:{k:'v',F:[700,1080,2550,3400],d:150,m:80,o:1,lo:1},
 Q:{k:'v',F:[590,900,2500,3400],d:84,m:48,o:.75},
 O:{k:'v',F:[440,740,2480,3400],d:148,m:78,o:.55},
 u:{k:'v',F:[300,1250,2250,3300],d:132,m:70,o:.3,hi:1},
 V:{k:'v',F:[690,1300,2550,3450],d:86,m:48,o:.8},
 '3':{k:'v',F:[520,1450,2450,3400],d:150,m:80,o:.5},
 '6':{k:'v',F:[560,1400,2450,3400],d:62,m:36,o:.5,sw:1},
 o:{k:'d',F:[520,1400,2450,3400],to:[370,1050,2300,3300],d:152,m:86,o:.6},
 '7':{k:'d',F:[360,2100,2700,3500],to:[500,1550,2450,3400],d:158,m:90,o:.4},
 '8':{k:'v',F:[580,1750,2500,3500],d:150,m:80,o:.6},
 '9':{k:'d',F:[420,1050,2300,3350],to:[500,1400,2450,3400],d:158,m:90,o:.4}
};
const TAB={us:{...CONS,...VOW_BOTH,...VOW_US},uk:{...CONS,...VOW_BOTH,...VOW_UK}};
let P=TAB.us;
const VOWS='iIeEaAQOoUuV@36YWX789';
const isVow=p=>VOWS.includes(p)&&p.length===1;
const isObs=p=>{const k=CONS[p]?.k;return k==='f'||k==='p';};
const LOC={lab:[250,900,2200,3300],alv:[260,1800,2700,3400],den:[250,1450,2600,3350],post:[260,1850,2450,3300],pal:[260,2200,2900,3500],rho:[320,1100,1520,3100]};
// Gaumenlaute k/g haben keinen festen Ort: sie folgen dem Vokal (vor u tief, vor i hoch), F2 und F3 laufen zusammen
function locus(pl,V){if(pl==='vel'){const v=V?V[1]:1500,f2=v<1200?v+250:v<1700?v+300:Math.min(v+250,2500);return [260,f2,clamp(f2+400,2000,3000),3400];}return LOC[pl]||null;}

const LABK=[.3,.5,.5,1];
// ---------- Akzent ----------
const ACKEY='mg-voice-en-accent';let ACCENT='us';
(()=>{try{const t=typeof localStorage!=='undefined'&&localStorage.getItem(ACKEY);if(t==='us'||t==='uk')ACCENT=t;}catch{}})();
const acc=a=>a==='us'||a==='uk'?a:ACCENT;
function setAccent(a,save){if(a==='us'||a==='uk'){ACCENT=a;P=TAB[a];if(save)try{localStorage.setItem(ACKEY,a);}catch{}}return ACCENT;}

// ---------- Zahlen ----------
const ONES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function numWord(n){n=Math.floor(Math.abs(n));if(n<20)return ONES[n];if(n<100){const o=n%10;return TENS[Math.floor(n/10)]+(o?' '+ONES[o]:'');}
 if(n<1000){const r=n%100;return ONES[Math.floor(n/100)]+' hundred'+(r?' and '+numWord(r):'');}
 if(n<1e6){const r=n%1000;return numWord(Math.floor(n/1000))+' thousand'+(r?(r<100?' and ':' ')+numWord(r):'');}
 if(n<1e9){const r=n%1e6;return numWord(Math.floor(n/1e6))+' million'+(r?' '+numWord(r):'');}
 return String(n).split('').map(d=>ONES[+d]).join(' ');}
const ORD={one:'first',two:'second',three:'third',five:'fifth',eight:'eighth',nine:'ninth',twelve:'twelfth'};
function ordWord(n){const s=numWord(n).split(' ');let l=s.pop();l=ORD[l]||(l.endsWith('y')?l.slice(0,-1)+'ieth':l+'th');s.push(l);return s.join(' ');}

// ---------- Wortlisten für den Satz ----------
// Funktionswörter: kein Satzakzent, kurz und schwach
const FUNC=new Set(('a an the this that these those my your his her its our their me him us them i you he she it we they myself yourself himself herself itself '+
 'and or but nor so yet if as than because while although though unless until since whether that which who whom whose '+
 'to of in on at by for from with into onto upon about over under through between among against without within during before after above below off up down out '+
 'is am are was were be been being has have had having do does did will would shall should can could may might must '+
 "isn't aren't wasn't weren't hasn't haven't hadn't doesn't don't didn't won't wouldn't can't couldn't shouldn't i'm i'll i've i'd you're you'll you've you'd he's she's it's we're we'll we've they're they'll they've that's there's let's "+
 'what where when why how there here then just very too also not no some any each every both either neither such own same').split(' '));
const NEG=new Set("not no never don't won't can't isn't aren't wasn't weren't didn't doesn't couldn't wouldn't shouldn't".split(' '));
const WH=new Set('who whom whose what where when why how which'.split(' '));
const CONJ=new Set('and but or because while although unless until since whether so'.split(' '));
// schwache Formen in der Phrase (nicht am Phrasenende, nicht betont)
const WEAK={a:'@',an:'@n',the:'D@',to:'t@',of:'@v',and:'@n',for:'f6',from:'fr@m',at:'@t',as:'@z',than:'D@n',can:'k@n',was:'w@z',were:'w6',are:'6',am:'@m',them:'D@m',us:'@s',your:'j6',but:'b@t',or:'6',some:'s@m',must:'m@st',shall:'S@l',had:'h@d',has:'h@z',have:'h@v',her:'h6',that:'D@t'};
const WEAKV={the:'Di',to:'tu'};// vor Vokal
// Wörterbuch im Kern: Funktionswörter (volle Form), Zusammenziehungen und Wörter des Spiels. Schreibweise: Lautschrift, ' vor dem betonten Vokal
// (ohne ' ist der erste Vokal betont). Eine Zahl = betonte Silbe (0 = erste), die Laute kommen dann aus Wörterbuch oder Regeln.
const LEX={
 a:'e',an:'an',the:'Di',to:'tu',of:'Qv',and:'and',for:'fOr',from:'frQm',at:'at',as:'az',than:'Dan',that:'Dat',this:'DIs',these:'Diz',those:'Doz',there:'DEr',their:'DEr',they:'De',them:'DEm',then:'DEn',thus:'DVs',though:'Do',
 is:'Iz',was:'wQz',were:'w3',are:'Ar',am:'am',be:'bi',been:'bin',has:'haz',have:'hav',had:'had',having:'havIN',do:'du',does:'dVz',did:'dId',done:'dVn',doing:'duIN',can:'kan',could:'kUd',would:'wUd',should:'SUd',will:'wIl',shall:'Sal',may:'me',might:'mYt',must:'mVst',
 i:'Y',you:'ju',he:'hi',she:'Si',it:'It',we:'wi',me:'mi',him:'hIm',her:'h3',us:'Vs',my:'mY',your:'jOr',his:'hIz',our:'W6',its:'Its',by:'bY',
 with:'wID',some:'sVm',b:'bi',c:'si',d:'di',e:'i',f:'Ef',g:'Ji',h:'eC',j:'Je',k:'ke',l:'El',m:'Em',n:'En',o:'o',p:'pi',q:'kju',r:'Ar',s:'Es',t:'ti',u:'ju',v:'vi',w:'dVb@lju',x:'Eks',y:'wY',z:'zEd',
 who:'hu',whom:'hum',whose:'huz',what:'wQt',which:'wIC',where:'wEr',when:'wEn',why:'wY',how:'hW',not:'nQt',no:'no',yes:'jEs',so:'so',or:'Or',but:'bVt',if:'If',
 "i'm":'Ym',"i'll":'Yl',"i've":'Yv',"i'd":'Yd',"you're":'jUr',"you'll":'jul',"you've":'juv',"you'd":'jud',"he's":'hiz',"he'll":'hil',"he'd":'hid',"she's":'Siz',"she'll":'Sil',"she'd":'Sid',"it's":'Its',"it'll":'It@l',
 "we're":'wIr',"we'll":'wil',"we've":'wiv',"we'd":'wid',"they're":'DEr',"they'll":'Del',"they've":'Dev',"they'd":'Ded',"that's":'Dats',"there's":'DErz',"what's":'wQts',"who's":'huz',"let's":'lEts',"here's":'hIrz',
 "don't":'dont',"won't":'wont',"can't":'kant',"isn't":'Iz@nt',"aren't":'Arnt',"wasn't":'wQz@nt',"weren't":'w3nt',"doesn't":'dVz@nt',"didn't":'dId@nt',"haven't":'hav@nt',"hasn't":'haz@nt',"hadn't":'had@nt',
 "couldn't":'kUd@nt',"wouldn't":'wUd@nt',"shouldn't":'SUd@nt',"mustn't":'mVs@nt',"ain't":'ent',"o'clock":"@kl'Qk",
 // Spielwörter (Latein, Namen)
 gladiator:'gladiet6',gladiators:'gladiet6z',gladiatorial:"gladi@t'Ori@l",lanista:"l@n'Ist@",lanistas:"l@n'Ist@z",ludus:'lud@s',arena:"6'in@",arenas:"6'in@z",medicus:'mEdIk@s',
 denarius:"dIn'Eri@s",denarii:"dIn'EriY",sesterce:'sEst3s',sesterces:'sEst3sIz',sestertius:"sEst'3S@s",sestertii:"sEst'3SiY",rabies:'rebiz',orontes:"Or'Qntiz",krassus:'kras@s',crassus:'kras@s',
 colosseum:"kQl@s'i@m",coliseum:"kQl@s'i@m",rome:'rom',roman:'rom@n',romans:'rom@nz',caesar:'siz6',legionary:'liJ@nEri',legionaries:'liJ@nEriz',centurion:"sEnC'Uri@n",retiarius:"riSi'Eri@s",murmillo:"m6m'Ilo",secutor:"sEkj'ut6",
 thracian:'TreS@n',bestiarius:'bEsCi\'Eri@s',bestiary:'bEsCiEri',beastmaster:'bistmast6',germania:"J6m'eni@",gaul:'gOl',gauls:'gOlz',capua:'kapju@',ostia:'Qsti@',pluto:'pluto',hades:'hediz',charon:'kEr@n',
 neptune:'nEptun',fortuna:"fOrt'un@",mars:'mArz',jupiter:'Jup@t6',marcellus:"mArs'El@s",brutus:'brut@s',titus:'tYt@s',gaius:'gY@s',valeria:"v@l'Iri@",spartacus:'spArt@k@s',
 trident:'trYd@nt',gladius:'gledi@s',pilum:'pYl@m',scutum:'skjut@m',toga:'tog@',forum:'fOr@m',senate:'sEn@t',senator:'sEn@t6',tribune:'trIbjun',plebs:'plEbz',patrician:"p@tr'IS@n",
 permadeath:'p3m@dET',greyhound:'grehWnd',mwahaha:"mwAhAh'A",haha:"hAh'A",hmm:'hm',huh:'hV',ugh:'Vg',aye:'Y',nay:'ne',hail:'hel',ave:'Ave',
};
// eigenes Wörterbuch aus dem Voice Lab (localStorage „mg-voice-en-lex-v1“)
const USERLEX=Object.create(null),ULKEY='mg-voice-en-lex-v1';
(()=>{try{const t=typeof localStorage!=='undefined'&&localStorage.getItem(ULKEY);if(t){const o=JSON.parse(t);for(const k of Object.keys(o))if(typeof o[k]==='string'||typeof o[k]==='number')USERLEX[k.toLowerCase()]=o[k];}}catch{}})();
// großes Wörterbuch der Ausnahmen: stimme-en-lex.js legt den Text in StimmeENDict ab („wort=lautschrift wort=lautschrift …“); zerlegt wird er erst beim ersten Wort
let DICT=null,DICTSRC=null;
function dict(){const src=G_.StimmeENDict||'';if(DICT&&src===DICTSRC)return DICT;DICTSRC=src;DICT=new Map();let i=0;const n=src.length;
 while(i<n){let j=src.indexOf(' ',i);if(j<0)j=n;const e=src.indexOf('=',i);if(e>i&&e<j)DICT.set(src.slice(i,e),src.slice(e+1,j));i=j+1;}
 g2pCache.clear();return DICT;}

// ---------- Buchstabenregeln (für alles, was nicht im Wörterbuch steht) ----------
// Jede Regel: links/Buchstaben/rechts/Laute. # = Vokalbuchstabe, : = Mitlautbuchstabe, ^ Wortanfang, $ Wortende. Die erste passende Regel gilt.
// In den Lauten: ~ vor einem Vokal = wird unbetont zu Schwa; % = „ju“ (nach t d n s z l r und Zischlauten nur „u“); & = „jU“ entsprechend.
const RULESRC=`
^/a/$/@ /augh/t/O /augh//af /au//O /aw//O /air//Er /are/$/Er /are/[sd]$/Er /arr/#/~ar w/ar//~Or qu/ar//~Or ^/ar/#/~ar :/ar/[ei]/Er /ar/#/~ar /ar//~Ar
/ay//e /ai/r/E /ai//e /al/k/O /all/$/Ol /all/s$/Ol ^/al/(so|ways|ready|most|though|together|mighty)/Ol /al/t/Ol /alf/$/af /alm//Am
/a/nge/e /a/ste$/e #:+/able/s?$/@b@l /a/ble/e /a/tion/e /a/(cious|tious|cial|tial|sion)/e #:+/age/s?$/~IJ /a/:e$/e /a/:e(s|d|r|rs|ly|ment|ful|less|ness|ty)$/e ^:*/a/:ing$/e
/a/:(ious|ial|ian|ient|ia|ium|ius|eous)/e w/a/(nt|sh|tch|s$|nd|ll|sp|tt|rr)/Q qu/a/(l|nt|d|rr)/Q ^:*/a/$/A #.*/a/$/@ #.*/a/s$/@
#:+#.*/ary/$/Eri #.*/ar/s?$/6 #.*/al/s?$/@l ^:*/a/:(y|er|ers|en|ens|al|or|ors|us|is|o|ent|ant|on|ons|ed|est)$/e /a//~a
m/b/$/ /bb//b /b/t$/ /b//b
/ch/[rln]/k ^/ch/(ao|em|or|ar[ai]|ol)/k /ch//C /ck//k /cc/[eiy]/ks /cc//k /ci/(a|o|ou|e)[nlu]/S /ce/(a|ou)[nus]/S /c/[eiy]/s /c/q/ /c//k
/dd//d /dge//J /dg/[eiy]/J /dj//J [td]/ed/$/@d #:*/ed/$/d /d//d
^:*/e/$/i /ee/r/I /ee//i ^/ear/l/~3 /ear/(n|th|ch|d$)/~3 /ear//Ir /ea/d$/E /ea/(th|lth|sure|sant|pon|ther|vy|ven|dy|lous|dow)/E /ea//i /eau//o /eigh//e c/ei//i /ei//e
#.*/ey/s?$/i /ey//e [rljtdn]/ew//u (ch|sh)/ew//u /ew//ju [rljtdn]/eu//u /eu//ju /er/(i[oae]|ie)/Ir /ere/$/Ir /err//~Er /er/#/~Er #.*/er/$/6 #.*/er/s$/6 /er//~3
[szx]/es/$/@z (ch|sh)/es/$/@z [cg]/es/$/@z #.*:/e/s$/ #:*/e/(ly|ment|ments|ful|less|ness|ty)$/ #.*/e/$/ #.*/ege/$/IJ /e/:e$/i /e/[bdfghjklmnpqrsvwxz](ia|io|iu|ie)/i ^/e/v(en|il)/i /e//~E
/ff//f #.*/fy/$/fY /f//f
/gg//g /gh/t/ ^/gh//g /gh// ^/gn//n /gn/$/n /gn/(s|ed|ing|er|ment)$/n /gue/$/g /gu/[eiy]/g /gi/o(n|us)/J ^/g/(et|ive|ift|irl|ear|eese|ill|ig|ui)/g /g/(et|ive)$/g (ti|ea|an|un|in|on)/g/er/g to/g/eth/g /g/[eiy]/J /g//g
^/h/(our|onor|onour|onest|eir)/ /h/[^aeiouy]/ /h/$/ /h//h
^/i/$/Y /igh//Y /ign/$/Yn /ign/(ed|ing|s|er|ment)$/Yn ^:*/ie/$/Y ^:*/ie/[ds]$/Y #.*/ie/[sd]?$/i ^:*/ier/$/Ir /ier/ce/Ir #.*/ier/s?$/i6 fr/ie/nd/E ^:*/ie/[nt]/Y@ #.*/ie/n/i@ /ie//i
/ire/$/Y6 /ire/[ds]$/Y6 /irr//~Ir /ir/#/~Ir /ir//~3 #.*:/ive/s?$/~Iv #.*/ice/s?$/~Is /i/:e$/Y /i/:e(s|d|r|rs|ly|ment|ful|less)$/Y ^:*/i/:ing$/Y /i/(nd|ld)$/Y /i/(nd|ld)(s|er|ly|ness|ing|ed)$/Y
/ique/$/ik (ll|n)/io/n/j@ #.*/io/us/i@ #.*/io/n/i@ ^:*/io//Y@ ^:*/ia//Y@ #.*/ia//i@ /iu//i@ ^:*/i/$/Y #.*/i/$/i
/i/ty$/~I ^:*/i/:(er|ers|al|ent|ant|ot|us|is|y|a|o|en|on|ar|ate)$/Y /i//~I
/j//J
^/kn//n /k//k
/ll//l :/le/s?$/@l :/le/d$/@l /l//l
/mm//m /mn/$/m /m//m
/nn//n /nge/$/nJ /ngi//nJ /ng/$/N /ng/(s|ed|ing|ly|ful|dom|th|ster)/N /ng//Ng /n/[kqx]/N /n/ct/N /n//n
/oo/k/U (g|w|st|h)/oo/d/U f/oo/t/U w/oo/l/U /oo/r/O bl/oo/d/V fl/oo/d/V /oo//u /ough/t/O thr/ough//u (r|t|en)/ough/$/Vf c/ough//Qf /ough//o /ould/$/Ud
/ou/(ble|ple|sin|ntry|ng|ch$)/V #.*/ous/$/@s #.*/ous/(ly|ness)$/@s ^:*/our/$/W6 #.*/our/$/6 #.*/our/(s|ed|ing|ite|able|ful|ly|less|er)$/6 /our/:/Or /ou/l:/o /oup//up /ou//W
#.*/ow/s?$/o ^(h|n|c|br|w|v|pl)/ow/$/W (kn|sh|gr|thr|bl|fl|^)/ow/n/o /ow/n/W /ow/(l|er|el|ard|d)/W /ow//o /oi//X /oy//X /oa/r/O br/oa/d/O /oa//o sh/oe//u /oe/s?$/o
#:+#.*/ory/$/Ori #.*/or/s?$/6 w/or/(d|k|ld|m|se|st|th)/~3 /ore/$/Or /ore/[sd]$/Or /orr//~Or /or//~Or
/o/:e$/o /o/:e(s|d|r|rs|ly|ment|ful|less)$/o ^:*/o/:ing$/o (c|l|fr)/o/st/Q tr/o/l$/o /ol/k/o /o/(ld|lt|st$|ll$)/o ^:*/o/$/o #.*/o/s?$/o /o/ther/V m/o/n(th|ey|k|d)/V h/o/ney/V ^/o/ver/o /o/ve[nr]/V fr/o/nt/V w/o/n/V
#.*/on/s?$/@n /o/(tion|sion|cial|cious)/o /o/:i[aou]/o ^:*/o/:(ic|id|it|ish|el|est|il|in|et|ern|ert|ume|ive|ise|ice)$/~Q ^:*/o/:(#+:*)$/o /o//~Q
/ph//f /pp//p ^/ps//s ^/pn//n /p//p
/que/$/k /qu//kw /q//k
/rr//r ^/rh//r /r//r
/sh//S /sch//sk /sc/[eiy]/s /ssure/$/S6 /ssue//Su /ssi/o/S /ss//s [aeiour]/si/on/Z :/si/on/S #/sure/$/Z6 #/su/al/Zu ^/s/u(gar|re)/S
a/s/e$/s (g|l|m|n)oo/s/e$/s (h|m|l|bl|sp)ou/s/e$/s /s/m$/z@ :[aiu]/s/$/s ^[aiou]/s/$/s /s/$/z #/s/[bdm]/z #/s/#/z /s//s
[aeiouyr]/th/er/D al/th/ough/D /th/e$/D /th/ern/D ^/th/(e|is|at|ese|ose|ey|em|eir|ere|en|an|us|ough)$/D /th//T /tch//C /tt//t s/ti/on/C /ti/o(n|us)/S /ti/a[ln]/S /ti/en[tc]/S
/ture/[sd]?$/C6 /tur/[aiy]/C6 /tu/a[lt]/Cu /tu/ous/Cu s/t/le/ s/t/en$/ /t//t
st/u/d[yi]/V p/u/nish/V ^s/u/gar/U g/ue/$/ /ue/$/% /ue/[sd]$/% /ui/(t|ts|ce|se)$/u /ui/ld/I /uy//Y f/ul/$/@l (p|f|b)/u/ll/U (p|b)/u/sh/U ^p/u/t/U
/ure/[sd]?$/~&r /urr/#/~3 /ur/#/~&r /ur//~3 ^:*/u/:e$/% /u/:e$/% /u/:e(s|d|r|rs|ly|ment|ful|less)$/% ^:*/u/:ing$/% ^:*/u/:#/% /u/:#/~% #.*/us/$/@s #.*/um/$/@m /u//~V
/vv//v /v//v
^/wr//r /wh/o/h /wh//w /w/$/ /w//w
^/x//z ^e/x/[aiouh]/gz /xi/o[nu]/kS /x//ks
^/y/#/j :/y/on/j ^:*/y/$/Y #.*/y/$/i #.*/y/s$/i /y/:e$/Y ^(t|st)/y/(pe|le|rant)/Y [chs]/y/(cl|br|dr|ch|per|ber)/Y /y/#/j /y//~I
/zz//z /z//z
`;
let RULES=null;
function rules(){if(RULES)return RULES;RULES=Object.create(null);const rx=s=>s.replace(/#/g,'[aeiouy]').replace(/:/g,'[^aeiouy]');
 for(const t of RULESRC.split(/\s+/)){if(!t)continue;const f=t.split('/');if(f.length!==4)throw new Error('Regel: '+t);
  (RULES[f[1][0]]||(RULES[f[1][0]]=[])).push({g:f[1],l:f[0]?new RegExp('(?:'+rx(f[0])+')$'):null,r:f[2]?new RegExp('^(?:'+rx(f[2])+')'):null,o:f[3]});}
 return RULES;}
const NOJ='tdnszlrJCSTZ';
// Buchstaben → Laute mit Merkern: [{p, red}] (red = darf unbetont zu Schwa werden)
function letters(w){const R=rules(),out=[];let i=0;const n=w.length;
 while(i<n){const L=R[w[i]];let hit=null;if(L)for(const q of L){if(!w.startsWith(q.g,i))continue;if(q.l&&!q.l.test(w.slice(0,i)))continue;if(q.r&&!q.r.test(w.slice(i+q.g.length)))continue;hit=q;break;}
  if(!hit){i++;continue;}let red=false;
  for(const c of hit.o){if(c==='~'){red=true;continue;}const pv=out.length?out[out.length-1].p:'';
   if(c==='%'||c==='&'){if(pv===''||!NOJ.includes(pv)&&pv!=='j'||pv==='l'&&out.length>1&&isVow(out[out.length-2].p))out.push({p:'j'});out.push({p:c==='%'?'u':'U',red});red=false;continue;}
   if(!isVow(c)&&pv===c)continue;// keine Doppelmitlaute
   out.push({p:c,red:red&&isVow(c)});red=false;}
  i+=hit.g.length;}
 // Auslaut: -s und -d richten sich nach dem Laut davor
 const m=out.length;if(m>1&&'ptkfTsSC'.includes(out[m-2].p)){if(out[m-1].p==='z'&&/s$/.test(w)&&!'sSC'.includes(out[m-2].p))out[m-1].p='s';if(out[m-1].p==='d'&&/ed$/.test(w))out[m-1].p='t';}
 return out;}
// Betonung nach Endung, Vorsilbe und Silbengewicht; danach werden unbetonte kurze Vokale zu Schwa
const SUF1=/(tion|sion|ssion|cian|cial|tial|cious|tious|gious|geous|cient|tient|cience|tience|ics?|ish)(ly|s|al)?$/;
const SUF2=/(ical|ity|ety|ify|ogy|omy|aphy|ial|ian|ious|ium|ius|ia|io|ior|iar|ient|iant|ience|iance|eous|uous|ual|ular|ulous|itive|itude|inal|icide|ible)(ly|s)?$/;
const SUFE=/(ee|eer|ese|ette|esque|ique|oon|aire|oo)s?$/;
const SUF3=/(ate|ates|ated|ating|ize|ise|ized|ised|izes|ises|izing|ising)$/;
const PRE2=/^(ab|ad|be|com|con|de|dis|em|en|ex|for|im|in|mis|ob|per|pre|re|sub|sur|sus|trans|un|with)[^aeiouy]|^(be|de|re|pre|un|dis|mis|ex|in|im|en|em)[aeiouy]|^a(([^aeiouy])\3?|gr|fr|cr|sl|br|ppr|w|dv)[aeiouy]|^(e|o|i|su|co)([cfglmnprst])\6|^e[^aeiouyx][aeiouy]/,PRO=/^pro[^aeiouy]/;
// Endungen, die die Betonung des Stamms nicht ändern: [Endung, Silben]
const NEUT=[['ments',1],['ment',1],['ness',1],['less',1],['fully',2],['ful',1],['ably',2],['able',2],['ings',1],['ing',1],['ers',1],['er',1],['est',1],['ship',1],['hood',1],['dom',1],['ism',2],['ists',1],['ist',1],['ly',1],['ies',1],['y',1]];
const OKCL=new Set(['pl','pr','br','bl','tr','dr','kr','kl','gr','gl','fr','fl','kw','st','sp','sk','Tr','Sr','tw','dw','sw','sl','sm','sn']);
function stressRed(w,ph){const nuc=[];ph.forEach((x,k)=>{if(isVow(x.p))nuc.push(k);});const n=nuc.length;if(!n)return 0;
 const weak=k=>{const p=ph[nuc[k]].p;return p==='@'||p==='6';};
 const lite=k=>weak(k)||(k===n-1&&nuc[k]===ph.length-1&&'io'.includes(ph[nuc[k]].p));
 const heavy=k=>{const x=ph[nuc[k]];if(weak(k))return false;if(!x.red&&!'IEaQVU'.includes(x.p))return true;const a=nuc[k]+1,b=k+1<n?nuc[k+1]:ph.length,c=b-a;
  if(k===n-1)return c>=2;if(c>=3)return true;if(c===2){const cl=ph[a].p+ph[a+1].p;return !OKCL.has(cl)&&ph[a].p!==ph[a+1].p;}return false;};
 const longV=k=>{const x=ph[nuc[k]];return !weak(k)&&!x.red&&!'IEaQVU'.includes(x.p);},weakish=k=>weak(k)||'iI'.includes(ph[nuc[k]].p);
 let s=0;
 if(n>1){
  if(SUFE.test(w)&&!lite(n-1))s=n-1;
  else if(SUF1.test(w)&&n>=2)s=Math.max(0,n-2-(/(ly|al)$/.test(w)&&!/(cial|tial)$/.test(w)?1:0));
  else if(SUF2.test(w)&&n>=3)s=Math.max(0,n-3-(/ly$/.test(w)?1:0));
  else if(/(ary|ory)$/.test(w)&&n>=4)s=n-4;
  else if(SUF3.test(w)&&n>=3)s=n-3-(/(ated|ating|ized|ised|izes|ises|izing|ising)$/.test(w)&&n>=4?1:0);
  else{let m=n;if(n>=3)for(const [e,c] of NEUT)if(w.endsWith(e)&&w.length>e.length+2){if(n-c>=2&&weakish(n-1))m=n-c;break;}
   if(m===2)s=(PRE2.test(w)&&!lite(1)||PRO.test(w)&&longV(1))?1:0;
   else s=heavy(m-2)?m-2:m-3;}
  s=clamp(s,0,n-1);
  if(weak(s)){let a=s-1;while(a>=0&&weak(a))a--;if(a>=0)s=a;else{a=s+1;while(a<n&&weak(a))a++;if(a<n)s=a;}}}
 // Abschwächung
 const pre=/^(be|de|re|pre|e|se)/.test(w);const kill=[];
 for(let k=0;k<n;k++){if(k===s)continue;const x=ph[nuc[k]];if(!x.red)continue;if(k<s&&(s-k)%2===0)continue;// Nebenton zwei Silben vor dem Hauptton bleibt voll
  const nx=ph[nuc[k]+1],rr=nx&&nx.p==='r';
  if(rr&&'aAEQVO3UI'.includes(x.p)&&!(x.p==='I'&&k+1<n)){x.p='6';kill.push(nuc[k]+1);continue;}
  if(x.p==='3'){x.p='6';continue;}
  if(x.p==='E'&&k===0&&pre&&nuc[1]-nuc[0]<=2){x.p='I';continue;}
  if('aEQVu'.includes(x.p))x.p='@';}
 const st=nuc[s];let shift=0;for(const k of kill){ph[k].dead=true;if(k<st)shift++;}
 return st-shift;}
function byRules(w){const L=letters(w.replace(/[^a-z]/g,''));if(!L.length)return null;const st=stressRed(w,L),ph=[];for(const x of L)if(!x.dead)ph.push(x.p);
 return {ph,st:Math.min(st,ph.length-1)};}

// ---------- Wort → Laute ----------
function parsePron(s){const ph=[];let st=-1;for(const c of s){if(c===' ')continue;if(c==="'"){st=ph.length;continue;}ph.push(c);}if(st<0)st=ph.findIndex(isVow);return {ph,st:Math.max(0,st)};}
const SIB='szSZCJ',VLS='ptkfT';
const addS=R=>{const l=R.ph[R.ph.length-1];return {ph:[...R.ph,...(SIB.includes(l)?['I','z']:VLS.includes(l)?['s']:['z'])],st:R.st};};
const addD=R=>{const l=R.ph[R.ph.length-1];return {ph:[...R.ph,...(l==='t'||l==='d'?['I','d']:VLS.includes(l)||'sSC'.includes(l)?['t']:['d'])],st:R.st};};
const add=(R,...x)=>({ph:[...R.ph,...x],st:R.st});
const known=w=>USERLEX[w]!==undefined||LEX[w]!==undefined||dict().has(w);
// Grundform suchen: erst bekannte Wörter, dann (bei unverdächtiger Schreibung) die Regeln
function base(cands,depth,safe){for(const b of cands)if(b.length>=2&&known(b))return pron(b,depth+1);if(safe)for(const b of cands)if(b.length>=3&&/[aeiouy]/.test(b))return pron(b,depth+1);return null;}
const undbl=b=>/([bdgklmnprt])\1$/.test(b)?[b.slice(0,-1)]:[];
// Grundform eines Stamms vor -ed/-ing, wenn das Wörterbuch ihn nicht kennt: hopp → hop, mak → make, call → call, visit → visit
function stemBase(s){if(!/[aeiouy]/.test(s)||s.length<2)return null;if(/([bdgmnprt])\1$/.test(s))return s.slice(0,-1);
 if(/[^aeiouy]{2}$/.test(s)&&!/(ng|rg|dg|nc|rc|rs|ls|ns|rv|lv|bl|pl|tl|dl|gl|kl|fl|zl|st$a)$/.test(s))return s;if(/(ng|rg|dg|nc|rc|rs|ls|ns|rv|lv|[bptdgkfz]l)$/.test(s))return /(ing|ong|ung)$/.test(s)?s:s+'e';
 if(/[aeiouy]{2}[^aeiouy]$/.test(s)||/[aeiouyw]$/.test(s))return /(eas|eav|iev|eiv|ais|ois|aus|oos|uis)$/.test(s)?s+'e':s;
 const g=(s.match(/[aeiouy]+/g)||[]).length;if(g===1)return /[xw]$/.test(s)?s:s+'e';
 return /(at|iz|is|yz|ur|ir|os|us|ac|uc|ut|ud|id|ad|od|um|iv|av|ov|ik|ak|ok|ag|ug|in|ar|or|ol|ip|ap|op|ib|ob|am|om|un|yp|yl|ul|as|uk|ef|if|im|it)$/.test(s)&&!/(isit|imit|edit|osit|erit|abit|ibit|ofit|irit|redit|[^u]ish|ain|oin|gin|sign|tain|ear|eer|ver|ter|der|ber|fer|per|ger|ner|mer|wer|vor|nor|bor|hor|ror|sor|tor|elop|ollop|orship|andon|ardon|ison|ason|eason|ttl)$/.test(s)?s+'e':s;}
// Zusammensetzungen mit häufigen zweiten Teilen (anything, someone, himself, without, yesterday, bloodbath …)
const TAILS=['thing','things','one','body','where','self','selves','ever','out','side','time','times','day','days','way','ways','work','house','room','ball','book','fire','light','night','back','down','hand','head','line','master','stone','wood','yard','field','guard','sword','fighter','keeper','maker','bath','thirsty','born','town','land'];
function compound(w,depth){if(w.length<6)return null;for(const t of TAILS){if(!w.endsWith(t))continue;const a=w.slice(0,-t.length);if(a.length<2||!/[aeiouy]/.test(a)||!(known(a)||a.length>=4&&/^(under|over|every|after|inter|super|some|any|with|him|her|them|your|blood|sword|battle|death|sun|moon|war|iron|gold|silver|fore|yester|birth|week|mid|out|down|up|back|hand|head|fire|night|day|land|sea|ship|arm|bed|bath|book|gate|grave|horse|hound|wolf|bear|slave|free|high|low|new|old|home|house|king|god|life|love|man|water|wild|wood|work|world)$/.test(a)))continue;
  const A=pron(a,depth+1),B=pron(t,depth+1),late=/^(self|selves|ever|out)$/.test(t)||a==='with';return {ph:[...A.ph,...B.ph],st:late?A.ph.length+B.st:A.st};}
 return null;}
function morph(w,depth){let b,m;
 if((m=/^(.+)'s$/.exec(w)))return addS(pron(m[1],depth+1));
 if((m=/^(.+s)'$/.exec(w)))return pron(m[1],depth+1);
 if((m=/^(.+)'(ll|re|ve|d)$/.exec(w))){const R=pron(m[1],depth+1),c=!isVow(R.ph[R.ph.length-1]);return m[2]==='ll'?add(R,'@','l'):m[2]==='re'?add(R,'6'):m[2]==='ve'?(c?add(R,'@','v'):add(R,'v')):(c?add(R,'I','d'):add(R,'d'));}
 if((m=/^(.+)n't$/.exec(w)))return add(pron(m[1],depth+1),'@','n','t');
 if(w.length<4||depth>3)return null;
 if(w.endsWith('ies')&&(b=base([w.slice(0,-3)+'y',w.slice(0,-1)],depth,w.length>5)))return add(b,'z');
 if(w.endsWith('es')&&/(s|x|z|ch|sh)es$/.test(w)&&(b=base(/(ss|x|zz|ch|sh)es$/.test(w)?[w.slice(0,-2),w.slice(0,-1)]:[w.slice(0,-1),w.slice(0,-2)],depth,true)))return addS(b);
 if(w.endsWith('s')&&!/(ss|us|is|'s)$/.test(w)&&(b=base([w.slice(0,-1)],depth,w.length>4&&!/as$/.test(w))))return addS(b);
 if(w.endsWith('ied')&&(b=base([w.slice(0,-3)+'y'],depth,w.length>5)))return add(b,'d');
 if(w.endsWith('ed')&&w.length>4&&!w.endsWith('eed')){const s=w.slice(0,-2);if((b=base([s,w.slice(0,-1),...undbl(s)],depth,false)))return addD(b);const g=stemBase(s);if(g&&g.length>=3)return addD(pron(g,depth+1));}
 if(w.endsWith('ing')&&w.length>5){const s=w.slice(0,-3);if((b=base([s,s+'e',...undbl(s)],depth,false)))return add(b,'I','N');const g=stemBase(s);if(g&&(g.length>=3||known(g)))return add(pron(g,depth+1),'I','N');}
 if(w.endsWith('ily')&&(b=base([w.slice(0,-3)+'y'],depth,false)))return {ph:[...b.ph.slice(0,-1),'@','l','i'],st:b.st};
 if(w.endsWith('ically')&&(b=base([w.slice(0,-4)],depth,false)))return add(b,'l','i');
 if(w.endsWith('ly')&&w.length>4&&(b=base([w.slice(0,-2),w.slice(0,-1)],depth,false)))return b.ph[b.ph.length-1]==='l'?add(b,'i'):add(b,'l','i');
 if(w.endsWith('ier')&&(b=base([w.slice(0,-3)+'y'],depth,false)))return add(b,'6');
 if(w.endsWith('iest')&&(b=base([w.slice(0,-4)+'y'],depth,false)))return add(b,'I','s','t');
 if(w.endsWith('er')&&w.length>4){const s=w.slice(0,-2);if((b=base([s,w.slice(0,-1),...undbl(s)],depth,false)))return add(b,'6');}
 if(w.endsWith('ers')&&w.length>5){const s=w.slice(0,-3);if((b=base([s,s+'e',...undbl(s)],depth,false)))return add(b,'6','z');}
 if(w.endsWith('est')&&w.length>5){const s=w.slice(0,-3);if((b=base([s,s+'e',...undbl(s)],depth,false)))return add(b,'I','s','t');}
 if(w.endsWith('ness')&&w.length>6&&(b=base([w.slice(0,-4),w.slice(0,-5)+'y'],depth,true)))return add(b,'n','@','s');
 if(w.endsWith('less')&&w.length>6&&(b=base([w.slice(0,-4)],depth,true)))return add(b,'l','@','s');
 if(w.endsWith('ful')&&w.length>5&&(b=base([w.slice(0,-3)],depth,true)))return add(b,'f','@','l');
 if(w.endsWith('ment')&&w.length>7&&(b=base([w.slice(0,-4)],depth,false)))return add(b,'m','@','n','t');
 if(w.endsWith('ship')&&w.length>6&&(b=base([w.slice(0,-4)],depth,false)))return add(b,'S','I','p');
 return null;}
// Lautschrift eines Wortes vor dem Akzent: {ph, st}
function pron(w,depth=0){const lx=USERLEX[w]??LEX[w];if(typeof lx==='string')return parsePron(lx);
 const d=dict().get(w);let R=d!==undefined?parsePron(d):null;
 if(!R)R=morph(w,depth);
 if(!R)R=compound(w,depth);
 if(!R)R=byRules(w)||{ph:['@'],st:0};
 if(typeof lx==='number'){const nu=[];R.ph.forEach((p,k)=>{if(isVow(p))nu.push(k);});if(nu.length)R={ph:R.ph,st:nu[clamp(lx,0,nu.length-1)]};}
 return R;}
// ---------- Akzent anwenden: britisch ohne r nach Vokal, amerikanisch mit weichem t ----------
const BATH=new Set(("after afternoon afterwards answer ask aunt bath basket blast branch brass can't cast castle chance chant class clasp command craft dance demand disaster draft "+
 'enhance example fast fasten flask france gasp ghastly glance glass grant grasp grass half calf lance last lather laugh laughter mask mast master nasty pass passport past pastor path plant plaster prance raft rascal rather sample shaft slant staff stance task trance vast advance advantage').split(' '));
const bathStem=w=>{if(BATH.has(w))return true;for(const e of ['s','es','ed','ing','er','ers','ly','ful','est',"'s"])if(w.endsWith(e)&&(BATH.has(w.slice(0,-e.length))||BATH.has(w.slice(0,-e.length)+'e')))return true;return false;};
function accentize(w,R,accent){let ph=R.ph.slice(),st=R.st,link=false;const o=[];let ns=st;
 if(accent==='uk'){
  for(let k=0;k<ph.length;k++){const p=ph[k],nx=ph[k+1],nv=nx!==undefined&&isVow(nx);
   if(p==='r'&&!nv&&o.length&&isVow(o[o.length-1])){const pv=o[o.length-1],mp={I:'7',i:'7',E:'8',U:'9',u:'9'}[pv];if(mp)o[o.length-1]=mp;else if('YWoXe'.includes(pv))o.push('@');if(k===ph.length-1)link=true;if(k<st)ns--;if(mp===undefined&&'YWoXe'.includes(pv)&&k<st)ns++;continue;}
   o.push(p);if((p==='6'||p==='3')&&nv){o.push('r');if(k<st)ns++;}if((p==='6'||p==='3')&&k===ph.length-1)link=true;}
  ph=o;st=ns;
  if(bathStem(w)){const k=ph.indexOf('a');if(k>=0&&(k===st||ph[st]!=='a'&&ph.filter(isVow).length<3))ph[k]='A';}
  // new, tune, duke: j vor u
  if(/[tdn](u|ew|eu)/.test(w)&&!/[tdn]u[^aeiou]{2}/.test(w))for(let k=0;k<ph.length-1;k++)if('tdn'.includes(ph[k])&&ph[k+1]==='u'&&k+1===st){ph.splice(k+1,0,'j');st++;break;}
 }else{
  // weiches t/d zwischen Vokalen vor unbetonter Silbe (water, city, ladder)
  for(let k=1;k<ph.length-1;k++)if((ph[k]==='t'||ph[k]==='d')&&(isVow(ph[k-1])||ph[k-1]==='r')&&isVow(ph[k+1])&&k+1!==st&&ph[k]==='t')ph[k]='F';}
 // dunkles l, wenn kein Vokal folgt
 for(let k=0;k<ph.length;k++)if(ph[k]==='l'&&!(ph[k+1]!==undefined&&isVow(ph[k+1])))ph[k]='L';
 // ch und j als Verschluss + Reibelaut
 const out=[];let st2=st;ph.forEach((p,k)=>{if(p==='C'||p==='J'){out.push(p==='C'?'t':'d',p==='C'?'S':'Z');if(k<st)st2++;}else out.push(p);});
 return {ph:out,st:st2,link};}
const ONSET=new Set(['p l','p r','p j','b l','b r','b j','t r','t w','t j','d r','d w','d j','k l','k r','k w','k j','g l','g r','g w','f l','f r','f j','T r','T w','S r','s p','s t','s k','s m','s n','s l','s w','s f',
 's p l','s p r','s t r','s k r','s k w','s p j','s t j','s k j','h j','m j','n j','v j','l j','t S','d Z']);
// Silben: Grenzen nach dem längsten erlaubten Silbenanlaut
function syllabify(ph){const nucs=[];ph.forEach((p,i)=>{if(isVow(p))nucs.push(i);});if(!nucs.length)return [{a:0,b:ph.length,nuc:-1}];
 const st=[0];for(let k=1;k<nucs.length;k++){const a=nucs[k-1]+1,b=nucs[k],cl=ph.slice(a,b);let on=0;
  for(let L=Math.min(3,cl.length);L>=1;L--){const sg=cl.slice(cl.length-L);if(L===1?!['N','L'].includes(sg[0]):ONSET.has(sg.join(' '))){on=L;break;}}
  st.push(b-on);}
 return nucs.map((nuc,k)=>({a:st[k],b:k+1<nucs.length?st[k+1]:ph.length,nuc}));}
// Wort → {ph, syls, stress, link}
const g2pCache=new Map();
function g2p(word,opt={}){const a=acc(opt.accent),w=String(word).toLowerCase().replace(/’/g,"'"),key=a+'|'+w;dict();let R=g2pCache.get(key);if(R)return R;
 const A=accentize(w,pron(w),a),syls=syllabify(A.ph);R={ph:A.ph,syls,stress:Math.max(0,syls.findIndex(s=>A.st>=s.a&&A.st<s.b)),link:A.link};
 if(g2pCache.size>6000)g2pCache.clear();g2pCache.set(key,R);return R;}

// ---------- Text → Phrasen mit Satzakzenten ----------
function normText(text){return String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').replace(/\{[^}]*\}/g,'').replace(/<[^>]*>/g,' ').replace(/[’‘`´]/g,"'")
 .replace(/\bMr\./g,'Mister').replace(/\bMrs\./g,'Missis').replace(/\bDr\./g,'Doctor').replace(/\be\.\s?g\./gi,'for example').replace(/\bi\.\s?e\./gi,'that is').replace(/\betc\./gi,'et cetera').replace(/\bvs\.?(?=\s)/gi,'versus')
 .replace(/&/g,' and ').replace(/%/g,' percent ').replace(/(\d),(?=\d{3})/g,'$1').replace(/(\d+)(st|nd|rd|th)\b/gi,(m,d)=>' '+ordWord(+d)+' ').replace(/(\d+)\.(\d+)/g,(m,a,b)=>' '+numWord(+a)+' point '+b.split('').map(d=>ONES[+d]).join(' ')+' ')
 .replace(/\d+/g,m=>' '+numWord(+m)+' ').replace(/[„“”"»«]/g,'').replace(/\s[–—-]+\s/g,', ').replace(/[–—]/g,', ').replace(/-/g,' ');}
function analyse(text,accent){
 const a=acc(accent),s=normText(text),re=/(\*?[A-Za-z]+(?:'[A-Za-z]+)*\*?)|(\.\.\.|…|[.!?]+)|([,;:])/g;let m;
 const phrases=[];let cur={words:[]},sent=[cur];
 const close=(type,pause)=>{if(cur.words.length){cur.type=type;cur.pause=pause;phrases.push(cur);}cur={words:[]};sent.push(cur);};
 const endSent=mark=>{const ws=sent.flatMap(p=>p.words);const q=mark.includes('?'),ex=mark.includes('!'),ell=/…|\.\.\./.test(mark);
  const type=q?(ws.some((w,i)=>WH.has(w.lw)&&i<3)?'?w':'?'):ex?'!':ell?',':'.';const pause=q?.45:ex?.38:ell?.5:.42;
  if(cur.words.length)close(type,pause);else{const L=phrases[phrases.length-1];if(L&&sent.includes(L)){L.type=type;L.pause=pause;}}
  sent=[cur];};
 while((m=re.exec(s))){
  if(m[1]){let t=m[1],emph=0;if(t.startsWith('*')||t.endsWith('*')){emph=1;t=t.replace(/\*/g,'');}if(t.length>1&&t===t.toUpperCase()&&/[A-Z]/.test(t)&&t!=="I'M"){emph=1;t=t[0]+t.slice(1).toLowerCase();}
   const lw=t.toLowerCase(),G=g2p(lw,{accent:a});
   // kleine Pause vor Bindewort in langen Phrasen
   if(CONJ.has(lw)&&cur.words.reduce((x,w)=>x+w.syls.length,0)>=7)close('-',.06);
   cur.words.push({txt:t,lw,ph:G.ph.slice(),syls:G.syls,stress:G.stress,link:G.link,fn:FUNC.has(lw)&&!emph,emph,neg:NEG.has(lw)});}
  else if(m[2])endSent(m[2]);
  else if(m[3])close(',',m[3]===','?.2:.26);}
 if(cur.words.length)endSent('.');
 for(const p of phrases)p.words.forEach((w,i)=>{const nx=p.words[i+1],nv=nx&&isVow(nx.ph[0]);
  // schwache Formen: a, the, to, of, and … nur am Phrasenende und bei Betonung bleibt die volle Form
  if(w.fn&&!w.emph&&nx){let wk=nv&&WEAKV[w.lw]||WEAK[w.lw];if(w.lw==='that'&&!(i>0&&nx.fn))wk=null;if(wk){const ph=wk.split('');w.ph=accentize(w.lw,{ph,st:0},a).ph;w.syls=syllabify(w.ph);w.stress=0;w.link=/[63]$/.test(wk);}}
  // britisches Binde-r: „far away“, „her eyes“
  if(a==='uk'&&w.link&&nv){w.ph=w.ph.concat('r');w.syls=syllabify(w.ph);}});
 for(const p of phrases)accents(p);
 return phrases;}
// Satzakzent: Hauptakzent auf dem letzten Inhaltswort der Phrase, Nebenakzente auf Inhaltswörtern davor (nicht zwei direkt nebeneinander)
function accents(p){const W=p.words;W.forEach(w=>w.acc=0);
 const em=W.filter(w=>w.emph);
 if(em.length){em.forEach(w=>w.acc=1);em[em.length-1].acc=2;return;}
 let cand=W.filter(w=>!w.fn);if(!cand.length){const np=W.filter(w=>w.neg||!/^(i|you|he|she|it|we|they|a|an|the|to|of)$/.test(w.lw));cand=[(np.length?np:W)[(np.length?np:W).length-1]];}
 const nuc=cand[cand.length-1],ni=W.indexOf(nuc);nuc.acc=2;let lastK=-9;
 for(const w of W){const i=W.indexOf(w);if(i>=ni)break;if(w.fn&&!w.neg)continue;if(i-lastK>=2&&ni-i>=2||i===0&&ni>=2){w.acc=1;lastK=i;}}}

// ---------- Stimmen und Sprechweisen ----------
// Dieselben Schlüssel wie in stimme.js (das Spiel wählt die Stimme über den Schlüssel), englische Namen.
// pitch mittlere Tonhöhe (Hz), range Melodieumfang (Halbtöne), speed Tempo, size Körpergröße (Formanten), oq Öffnungsquotient
// (klein = gepresst), tilt Helligkeit der Stimmquelle, breath Hauch, rough Rauheit, creak Knarren am Satzende, shake Zittern (alt),
// accent 'uk' | 'us' (ohne Angabe gilt setAccent)
const PRESETS={
 moderator:{name:'Arena announcer',pitch:118,range:12,speed:.98,size:1.03,oq:.46,tilt:.74,breath:.04,rough:.05,creak:.08,shake:0,room:.3,style:'feierlich',lively:1.15,slur:.05,presence:.7,comp:.9,air:.06,fx:[1,1.02,1]},
 rabies:{name:'Rabies, the Hound Count',pitch:82,range:7,speed:.88,size:1.06,oq:.58,tilt:.44,breath:.34,rough:.3,creak:.6,shake:0,room:.06,growl:.22,slur:.2,lively:.9,air:.1,fx:[1,.96,.97],tvar:.08},
 schmied:{name:'The smith',pitch:88,range:6.5,speed:1,size:1.16,oq:.45,tilt:.6,breath:.08,rough:.18,creak:.3,shake:0,room:.1,growl:.28,slur:.18,lively:1.1,fx:[1.03,.94,.97],presence:.6},
 orontes:{name:'Orontes Arrowhead',pitch:150,range:15,speed:1.04,size:.95,oq:.56,tilt:.64,breath:.12,rough:.1,creak:.1,shake:.15,room:.1,lively:1.3,wild:.5,tvar:.1,nasal:.1,fx:[1,1.05,1.03],slur:.08},
 krassus:{name:'Krassus the moneylender',pitch:78,range:5,speed:.8,size:1.2,oq:.5,tilt:.5,breath:.1,rough:.18,creak:.7,shake:0,room:.28,growl:.15,slur:.1,lively:.8,fx:[.98,.95,.96],presence:.6},
 medicus:{name:'The medicus',pitch:128,range:7,speed:1.08,size:.95,oq:.5,tilt:.66,breath:.06,rough:.03,creak:.12,shake:0,room:.1,nasal:.2,slur:.04,lively:.9,fx:[1,1.06,1.04],presence:.65},
 rekrut:{name:'Recruit',pitch:138,range:11,speed:1.06,size:.94,oq:.56,tilt:.62,breath:.1,rough:.04,creak:.04,shake:0,room:.12,lively:1.15,slur:.12,fx:[1,1.02,1.01]},
 frau:{name:'Woman',pitch:205,range:11,speed:1.04,size:.86,oq:.64,tilt:.5,breath:.2,rough:.02,creak:0,shake:0,room:.12,lively:1.15,slur:.08,air:.1},
 erzaehler:{name:'Narrator',pitch:98,range:8.5,speed:.9,size:1.08,oq:.54,tilt:.56,breath:.14,rough:.05,creak:.3,shake:0,room:.26,lively:.95,slur:.1,fx:[1,.98,1]}
};
// Werkseinstellung der Stimmen (das Voice Lab überschreibt PRESETS aus localStorage „mg-voice-en-voices-v1“)
const DEFAULTS=JSON.parse(JSON.stringify(PRESETS)),VOKEY='mg-voice-en-voices-v1';
function setVoices(o){for(const k of Object.keys(PRESETS)){const d=DEFAULTS[k];for(const f of Object.keys(PRESETS[k]))delete PRESETS[k][f];Object.assign(PRESETS[k],JSON.parse(JSON.stringify(d)));const u=o&&o[k];if(u&&typeof u==='object')for(const f of Object.keys(u)){const v=u[f];if(f==='name')continue;if(typeof v==='number'&&isFinite(v)||(f==='style'&&typeof v==='string')||(f==='accent'&&(v==='us'||v==='uk'))||(f==='fx'&&Array.isArray(v)&&v.length===3&&v.every(x=>typeof x==='number'&&isFinite(x))))PRESETS[k][f]=f==='fx'?v.slice():v;}}}
(()=>{try{const t=typeof localStorage!=='undefined'&&localStorage.getItem(VOKEY);if(t)setVoices(JSON.parse(t));}catch{}})();
// Sprechweisen (Schlüssel wie in stimme.js). st Tonlage (Halbtöne), range Melodieumfang, rate Tempo, pause/fin Pausen und Dehnung am Ende,
// acc/vacc Höhe und Dehnung der Akzente, oq/tilt/f1 Stimmdruck und Helligkeit, growl Knurren auf Akzenten, brk Stimmbruch, wob Flackern,
// laugh Lachstöße in der Stimme, call Rufmelodie (hoch halten statt abfallen), slur Lallen, echo Arena-Echo
const STYLES={
 normal:{name:'Normal'},
 nachdruck:{name:'Emphatic',st:1.5,range:1.15,acc:1.2,vacc:1.12,oq:.48,tilt:.72,drive:1.15,fin:1.1},
 feierlich:{name:'Arena announcement',st:3,range:1.3,rate:.84,pause:1.3,fin:1.5,acc:1.25,vacc:1.4,vdur:1.08,oq:.42,tilt:.85,f1:1.06,drive:1.1,call:1,pres:.75,comp:.9,echo:.2},
 ruf:{name:'Calling out',st:5,range:1.2,oq:.42,tilt:.86,f1:1.08,rate:.93,vdur:1.15,drive:1.15,acc:1.2,breath:-.05,call:1,pres:.7,comp:.9},
 bruellen:{name:'Roaring',st:3,range:1,oq:.36,tilt:.93,f1:1.13,rate:.86,vdur:1.3,vacc:1.3,acc:1.3,growl:.45,rough:.14,drive:1.3,fin:1.3,creak:-1,pres:.8,comp:1},
 schrei:{name:'Screaming',st:6.5,range:1.1,oq:.34,tilt:.96,f1:1.16,rate:.88,vdur:1.3,drive:1.2,rough:.08,brk:.25,acc:1.2,fin:1.3,creak:-1,pres:.8,comp:1},
 wut:{name:'Angry',st:1,range:.9,oq:.38,tilt:.88,rough:.16,growl:.3,creak:.2,rate:.92,acc:1.35,vacc:1.3,drive:1.25,pres:.7,comp:.9},
 drohen:{name:'Quiet threat',st:-3,range:.55,oq:.5,breath:.25,creak:.55,rate:.8,pause:1.6,acc:1.25,vacc:1.25,vol:.75},
 fluester:{name:'Whisper',whisper:1,rate:.92,range:.6,creak:-1,vol:.6},
 angst:{name:'Scared',st:5,range:1.35,rate:1.12,trem:.6,wob:1.2,breath:.3,oq:.62,brk:.2,creak:-1,pause:.8},
 flehen:{name:'Begging',st:6,range:1.25,breath:.35,trem:.45,wob:.6,rate:.9,fin:1.5,vacc:1.2},
 lachend:{name:'Laughing',st:2.5,range:1.35,f2:1.05,breath:.12,laugh:.5,rate:1.02,acc:1.15,chuckle:1},
 jubel:{name:'Cheering',st:4.5,range:1.4,rate:1.04,tilt:.78,oq:.46,f2:1.04,acc:1.3,vacc:1.2,drive:1.2,pres:.7},
 spott:{name:'Mocking',st:1,range:1.6,rate:.9,acc:1.4,vacc:1.45,nasal:.35,f2:1.03},
 traurig:{name:'Sad',st:-2,range:.5,rate:.82,breath:.3,decl:1.7,creak:.3,vol:.8,pause:1.4},
 erschoepft:{name:'Exhausted / dying',st:-2,range:.45,breath:.55,creak:.5,rate:.72,pause:2,trem:.35,decl:2,vol:.75},
 betrunken:{name:'Drunk',st:-1,range:1.3,rate:.78,slur:.35,wob:1.6,wobRate:2.2,vdur:1.25,breath:.15,pause:1.3}
};
// Regieanweisungen im Text: „[roars] Let them bleed!“ – gilt bis zur nächsten Anweisung. Englisch, dazu die deutschen aus stimme.js.
const TAGS={normal:'normal',calm:'normal',calmly:'normal',plain:'normal',emphatic:'nachdruck',firm:'nachdruck',firmly:'nachdruck',stressed:'nachdruck',announces:'feierlich',announcement:'feierlich',announcing:'feierlich',solemn:'feierlich',proclaims:'feierlich',
 calls:'ruf',call:'ruf',calling:'ruf',loud:'ruf',loudly:'ruf',shouts:'ruf',shout:'ruf',shouting:'ruf',yells:'ruf',roars:'bruellen',roar:'bruellen',roaring:'bruellen',bellows:'bruellen',bellowing:'bruellen',
 screams:'schrei',scream:'schrei',screaming:'schrei',shrieks:'schrei',angry:'wut',angrily:'wut',furious:'wut',rage:'wut',threatens:'drohen',threat:'drohen',threatening:'drohen',menacing:'drohen',
 whispers:'fluester',whisper:'fluester',whispering:'fluester',quiet:'fluester',quietly:'fluester',scared:'angst',afraid:'angst',fear:'angst',frightened:'angst',panic:'angst',panicking:'angst',terrified:'angst',
 begs:'flehen',begging:'flehen',pleads:'flehen',pleading:'flehen',laughs:'lachend',laughing:'lachend',laugh:'lachend',cheers:'jubel',cheering:'jubel',cheer:'jubel',excited:'jubel',triumphant:'jubel',
 mocks:'spott',mocking:'spott',sneers:'spott',sneering:'spott',sarcastic:'spott',sad:'traurig',sadly:'traurig',mourning:'traurig',exhausted:'erschoepft',dying:'erschoepft',weak:'erschoepft',drunk:'betrunken',slurring:'betrunken',slurs:'betrunken',
 ruhig:'normal',nachdruck:'nachdruck',betont:'nachdruck',ansage:'feierlich',feierlich:'feierlich',ruft:'ruf',ruf:'ruf',laut:'ruf','brüllt':'bruellen',bruellen:'bruellen',schreit:'schrei',schrei:'schrei','wütend':'wut',wut:'wut',
 droht:'drohen',drohen:'drohen','flüstert':'fluester',leise:'fluester','ängstlich':'angst',angst:'angst',fleht:'flehen',flehen:'flehen',lacht:'lachend',lachend:'lachend',jubelt:'jubel',jubel:'jubel',spottet:'spott',spott:'spott',traurig:'traurig',
 'erschöpft':'erschoepft',sterbend:'erschoepft',betrunken:'betrunken'};

// ---------- Steuerdaten (Tracks) ----------
const CH={f0:120,AV:0,AH:0,AF:0,F1:500,F2:1500,F3:2500,F4:3500,B1:70,B2:90,B3:140,NZ:270,MO:0,CR:0,OQ:.55,TL:.55,SUB:0,CHA:0,AM:0,AMF:60,BIP:0,BIPR:1.5,TR:0,BR:0};
const TAU_={f0:.012,AV:.004,AH:.005,AF:.0015,F1:.008,F2:.009,F3:.009,F4:.01,B1:.01,B2:.01,B3:.01,NZ:.01,MO:.03,CR:.01,OQ:.02,TL:.02,SUB:.02,CHA:.02,AM:.02,AMF:.02,BIP:.02,BIPR:.02,TR:.02,BR:.02};
class Tracks{
 constructor(dur){this.dur=dur;this.n=Math.ceil(dur/FR)+2;this.k={};this.arr={};this.FS=new Int8Array(this.n).fill(-1);this.FC=new Float32Array(this.n).fill(1);}
 key(ch,t,v){(this.k[ch]||(this.k[ch]=[])).push([t,v]);}
 hold(ch,t0,t1,v){this.key(ch,t0+1e-5,v);this.key(ch,t1,v);}
 fric(t0,t1,name,fc=1){const id=SHN[name]??-1,a=Math.max(0,Math.floor(t0/FR)),b=Math.min(this.n,Math.ceil(t1/FR)+1);for(let i=a;i<b;i++){this.FS[i]=id;this.FC[i]=fc;}}
 set(ch,arr){this.arr[ch]=arr;}
 build(tau={}){const T={n:this.n,FS:this.FS,FC:this.FC};
  for(const ch of Object.keys(CH)){if(this.arr[ch]){T[ch]=this.arr[ch];continue;}const a=new Float32Array(this.n),K=this.k[ch];
   if(!K||!K.length){a.fill(CH[ch]);T[ch]=a;continue;}K.sort((x,y)=>x[0]-y[0]);let j=0;
   for(let i=0;i<this.n;i++){const t=i*FR;while(j<K.length-1&&K[j+1][0]<=t)j++;const A=K[j],B=K[j+1];a[i]=!B||t<=A[0]?A[1]:A[1]+(B[1]-A[1])*clamp((t-A[0])/Math.max(1e-6,B[0]-A[0]),0,1);if(t<K[0][0])a[i]=K[0][1];}
   smooth(a,tau[ch]??TAU_[ch]);T[ch]=a;}
  // Rauschspektrum zwischen Lauten kurz halten, damit die Abklingzeit nicht falsch klingt
  let last=-1;for(let i=0;i<this.n;i++){if(this.FS[i]>=0)last=this.FS[i];else this.FS[i]=last;}
  return T;}}
// nullphasige Glättung (vor- und rückwärts), wie Muskeln: kein Sprung, keine Verzögerung
function smooth(a,tau){if(!tau||tau<=FR*.5)return;const al=1-Math.exp(-FR/tau);for(let p=0;p<2;p++){let y=a[0];for(let i=0;i<a.length;i++){y+=(a[i]-y)*al;a[i]=y;}y=a[a.length-1];for(let i=a.length-1;i>=0;i--){y+=(a[i]-y)*al;a[i]=y;}}}

// ---------- Klangerzeugung ----------
const FRIC_G=.55;
function synth(T,V={},r=Math.random){
 const N=Math.ceil((T.n-1)*FR*SR),out=new Float32Array(N);
 const fs=1/clamp(V.size||1,.6,1.6),breath=V.breath||0,shake=V.shake||0;
 const res=()=>({a:1,b:0,c:0,y1:0,y2:0});const R=[res(),res(),res(),res(),res()],NP=res(),NZ={a:1,b:0,c:0,x1:0,x2:0};
 const bp=()=>({b0:0,b2:0,a1:0,a2:0,x1:0,x2:0,y1:0,y2:0,g:0});const BP=[bp(),bp(),bp()],BQ=[bp(),bp(),bp()];let byG=0,curFS=-2,curFC=-1,steep=false,airLp=0,nzP=0;const air=V.air||0,aspT=!!V.asp,nzOff=(V.nasal||0)*230;
 const setRes=(z,F,B)=>{F=Math.min(F,SR*.46);const C=-Math.exp(-TAU*B/SR),Bc=2*Math.exp(-Math.PI*B/SR)*Math.cos(TAU*F/SR);z.c=C;z.b=Bc;z.a=1-Bc-C;};
 const setBP=(z,f,q,g)=>{const w=TAU*Math.min(f,SR*.45)/SR,al=Math.sin(w)/(2*q),a0=1+al;z.b0=al/a0;z.b2=-al/a0;z.a1=-2*Math.cos(w)/a0;z.a2=(1-al)/a0;z.g=g;};
 let ph=1,f0p=120,amp=1,oq=.55,odd=false,ph2=0,tilt=0,dc1=0,dc2=0,drift=0,driftT=0;
 for(let i=0;i<N;i++){const tf=i/SR/FR,k0=Math.min(tf|0,T.n-1),k1=Math.min(k0+1,T.n-1),u=tf-(tf|0),L=a=>a[k0]+(a[k1]-a[k0])*u,t=i/SR;
  if((i&31)===0){const nzv=L(T.NZ)+nzOff,nas=clamp((nzv-270)/1400,0,1);
   setRes(R[0],L(T.F1)*fs,L(T.B1)+nas*60);setRes(R[1],L(T.F2)*fs,L(T.B2));setRes(R[2],L(T.F3)*fs,L(T.B3));setRes(R[3],L(T.F4)*fs,250);setRes(R[4],4400*fs,320);
   setRes(NP,270,100);{const nz=nzv,C=-Math.exp(-TAU*100/SR),Bc=2*Math.exp(-Math.PI*100/SR)*Math.cos(TAU*Math.min(nz,SR*.45)/SR),A=1-Bc-C;NZ.a=1/A;NZ.b=-Bc/A;NZ.c=-C/A;}
   const fsI=T.FS[k0],fc=T.FC[k0];if(fsI!==curFS||fc!==curFC){curFS=fsI;curFC=fc;const S=SH[fsI];if(S){steep=!!S.st;for(let j=0;j<3;j++){const b=S.bands[j];if(b){setBP(BP[j],b[0]*fc,b[1],b[2]);if(steep)setBP(BQ[j],b[0]*fc,b[1],1);}else BP[j].g=0;}byG=S.by;}else{BP.forEach(z=>z.g=0);byG=0;}}
   if((i&1023)===0){driftT=(r()*2-1)*.012;}}
  drift+=(driftT-drift)*.0004;
  const av=L(T.AV),ah=L(T.AH),af=L(T.AF),cr=L(T.CR),sub=L(T.SUB),cha=L(T.CHA),am=L(T.AM),tr=L(T.TR)+shake;
  // --- Glottis: neuer Puls am Periodenende; Unruhe, Knarren, Periodenverdopplung (Subharmonik) je Periode
  if(ph>=1){ph-=1;odd=!odd;let f=L(T.f0)*(1+drift)*(1+tr*.035*Math.sin(TAU*5.6*t));
   const jit=.006+(V.rough||0)*.02+cha*.16+cr*.25;f*=1+jit*(r()*2-1);
   if(cr>.05)f*=1-cr*.5*(.6+.6*r());if(sub>.01)f*=odd?1+sub*.14:1-sub*.14;
   f0p=clamp(f,25,1400);amp=(1-((V.rough||0)*.25+cha*.45+cr*.55)*r())*(sub>.01&&odd?1-sub*.65:1)*(1+tr*.1*Math.sin(TAU*5.6*t));oq=clamp(L(T.OQ)-cr*.25,.2,.95);}
  ph+=f0p/SR;const tau=ph/oq;let g=tau<1?(2*tau-3*tau*tau)*2.2:0;
  if(L(T.BIP)>.01){ph2+=f0p*L(T.BIPR)/SR;if(ph2>=1)ph2-=1;const t2=ph2/oq;g+=(t2<1?(2*t2-3*t2*t2)*2.2:0)*L(T.BIP);}
  const tl=clamp(L(T.TL),.08,1);tilt+=(g*amp-tilt)*tl;let src=tilt;
  if(am>.005)src*=1-am*.5*(1+Math.sin(TAU*L(T.AMF)*t));
  const nz=r()*2-1,open=tau<1?1:.3,br=breath+L(T.BR);
  const asp=aspT?(nz-.85*nzP)*3.6:nz;nzP=nz;
  let x=src*av+asp*ah*.5+nz*br*.22*av*open;
  // Kaskade: Nasal-Pol, Nasal-Nullstelle, F5…F1
  {const z=NP,y=z.a*x+z.b*z.y1+z.c*z.y2;z.y2=z.y1;z.y1=y;x=y;}
  {const y=NZ.a*x+NZ.b*NZ.x1+NZ.c*NZ.x2;NZ.x2=NZ.x1;NZ.x1=x;x=y;}
  for(let j=4;j>=0;j--){const z=R[j],y=z.a*x+z.b*z.y1+z.c*z.y2;z.y2=z.y1;z.y1=y;x=y;}
  // parallele Rauschzweige (Zisch-, Reibe-, Knalllaute); stimmhafte Reibelaute pulsieren mit der Glottis
  let pr=0;{const n2=af>.0005?(r()*2-1)*af*(av>.15?.55+.45*open:1):0;
   for(let j=0;j<3;j++){const z=BP[j];if(!z.g)continue;let y=z.b0*n2+z.b2*z.x2-z.a1*z.y1-z.a2*z.y2;z.x2=z.x1;z.x1=n2;z.y2=z.y1;z.y1=y;
    if(steep){const q=BQ[j],y2=q.b0*y+q.b2*q.x2-q.a1*q.y1-q.a2*q.y2;q.x2=q.x1;q.x1=y;q.y2=q.y1;q.y1=y2;y=y2*2.2;}pr+=y*z.g;}
   pr+=n2*byG;}
  let y=x+pr*FRIC_G*3.2;
  // „Luft“: feines Rauschen über 4 kHz im Takt der Stimmlippen – echte Stimmen sind dort nie leer
  if(air>0){airLp+=(nz-airLp)*.55;y+=(nz-airLp)*av*open*air;}
  // Gleichanteil entfernen
  dc1+=(y-dc1)*.008;y-=dc1;dc2+=(y-dc2)*.0005;out[i]=y-dc2;}
 return out;}

// ---------- Nachbearbeitung: Raum, 16-Bit-Klang, Lautheit ----------
function room(x,mix,size=1){if(!(mix>0))return x;const n=x.length,ext=Math.floor(SR*(.5+size*.9)),y=new Float32Array(n+ext);y.set(x);const sc=SR/44100*size;
 const combs=[1116,1188,1277,1356,1422,1491].map(d=>({d:Math.floor(d*sc),buf:new Float32Array(Math.floor(d*sc)),i:0,lp:0}));const aps=[556,441,341].map(d=>({d:Math.floor(d*sc*.7),buf:new Float32Array(Math.floor(d*sc*.7)),i:0}));
 const fb=.78+size*.06,damp=.35,wet=new Float32Array(n+ext);
 for(let i=0;i<n+ext;i++){const inp=(i<n?x[i]:0)*.12;let s=0;for(const c of combs){const o=c.buf[c.i];c.lp=o*(1-damp)+c.lp*damp;c.buf[c.i]=inp+c.lp*fb;c.i=(c.i+1)%c.d;s+=o;}for(const a of aps){const bo=a.buf[a.i],o2=-.5*s+bo;a.buf[a.i]=s+.5*o2;s=o2;a.i=(a.i+1)%a.d;}wet[i]=s;}
 for(let i=0;i<n+ext;i++)y[i]=y[i]*(1-mix*.35)+wet[i]*mix;let e=y.length;while(e>n&&Math.abs(y[e-1])<1e-4)e--;return y.subarray(0,e);}
function retro(x,o={}){const rate=o.rate||13000,bits=o.bits||11,echo=o.echo??.15,hold=Math.max(1,SR/clamp(rate,4000,SR)),q=Math.pow(2,clamp(bits,3,16)-1);let acc=0,held=0,lp=0,z1=0,z2=0;
 const aa=1-Math.exp(-TAU*rate*.42/SR),y=new Float32Array(x.length+Math.floor(.3*SR));
 for(let i=0;i<x.length;i++){z1+=(x[i]-z1)*aa;z2+=(z1-z2)*aa;acc+=1;if(acc>=hold||i===0){acc-=hold;held=Math.round(z2*q)/q;}lp+=(held-lp)*.6;y[i]=lp;}
 if(echo>0){const D=Math.floor(.085*SR);for(let i=D;i<y.length;i++)y[i]+=y[i-D]*echo*.7;}return y;}
// Sprach-Nachbearbeitung: Präsenz (Anhebung über 1,9 kHz) und Kompressor. Formantstimmen haben hohe Spitzen bei wenig Lautheit –
// so tragen sie im Spiel über Musik und Publikum, und leise Konsonanten rücken an die Vokale heran.
function polish(x,o){const n=x.length,pres=o.pres??.5,comp=o.comp??.6;let lp=0,peak=0;const a=1-Math.exp(-TAU*1900/SR);
 for(let i=0;i<n;i++){lp+=(x[i]-lp)*a;x[i]+=pres*(x[i]-lp);const v=x[i]<0?-x[i]:x[i];if(v>peak)peak=v;}
 if(!(peak>0)||comp<=0)return x;const g0=1/peak,at=1-Math.exp(-1/(SR*.003)),rl=1-Math.exp(-1/(SR*.09)),thr=.28,slope=comp*.75;let env=0;
 for(let i=0;i<n;i++){const v=(x[i]<0?-x[i]:x[i])*g0;env+=(v-env)*(v>env?at:rl);x[i]*=g0*(env>thr?Math.pow(thr/env,slope):1);}
 return x;}
function finish(x,o={}){let peak=0;for(let i=0;i<x.length;i++)peak=Math.max(peak,Math.abs(x[i]));const g=peak>0?.9/peak:1,d=o.drive||1,vol=o.vol??1;
 for(let i=0;i<x.length;i++){let v=x[i]*g;if(d>1.01)v=Math.tanh(v*d)/Math.tanh(d);x[i]=v;}
 if(o.speech)polish(x,o.speech);
 let y=x;if(o.room)y=room(y,o.room,o.roomSize||1);if(o.retro)y=retro(y,o.retroOpt);
 peak=0;for(let i=0;i<y.length;i++)peak=Math.max(peak,Math.abs(y[i]));const g2=peak>0?.92/peak*vol:1;for(let i=0;i<y.length;i++)y[i]=Math.tanh(y[i]*g2*1.05)/Math.tanh(1.05);return y;}

// ---------- Ablaufplan: Phrasen → Laute mit Zeiten → Tracks ----------
function plan(text,V,S,r){
 const phrases=analyse(text,V.accent),sp0=(V.speed||1)*(S.rate||1),segs=[],words=[],tones=[];let t=.06;
 const pauseF=S.pause||1,FIN=S.fin||1,ACCD=S.vacc||1,VD=S.vdur||1;
 phrases.forEach((PH,pi)=>{const sp=sp0*(1+(r()*2-1)*(V.tvar||0)),ptStart=t,sylls=[];
  PH.words.forEach((w,wi)=>{w.syls.forEach((s,si)=>sylls.push({w,wi,si,s}));});
  const lastSyl=sylls[sylls.length-1];
  PH.words.forEach((w,wi)=>{const ws={w,t0:t,phrase:pi,sy:[]};const nS=w.syls.length;
   w.syls.forEach((s,si)=>{const stressed=si===w.stress,isLast=lastSyl.w===w&&si===nS-1,acc=stressed?w.acc:0,sy={t0:t,stressed,acc,emph:w.emph&&stressed};
    for(let k=s.a;k<s.b;k++){const p=w.ph[k],Q=P[p];if(!Q)continue;const vow=isVow(p);
     let f=1;
     if(vow){if(Q.sw)f=isLast?1.25:.9;else if(!stressed)f=Q.k==='d'||Q.d>110?.7:.58;else{f=acc===2?1.4*ACCD*(S.call?1.25:1):acc===1?1.25*ACCD:1.05;if(w.emph)f*=1.4;if(nS>1)f*=.88;}{const nx=w.ph[k+1];if(nx&&isObs(nx)&&!P[nx].vc)f*=.8;else if(stressed&&si===nS-1&&(!nx||isObs(nx)))f*=1.1;}if(isLast)f*=(PH.type===','||PH.type==='-'?1.3:1.55)*FIN;f*=VD;}
     else{const prev=w.ph[k-1],next=w.ph[k+1];if((prev&&!isVow(prev))||(next&&!isVow(next)))f*=Q.k==='l'&&next&&isVow(next)?1:.72;if(!stressed)f*=.85;if(k===0)f*=1.08;if(isLast&&k>s.nuc)f*=1.35*FIN;}
     if(w.fn)f*=.78;
     let d=(Q.m+(Q.d-Q.m)*f)/1000/sp*(.95+r()*.1);if(vow&&!stressed&&Q.sw)d=Math.max(d,.028/sp);
     const seg={p,Q,t0:t,d,w,wi,si,k,stressed,acc,vow,phrase:pi,ptype:PH.type,last:isLast,vcd:false};
     if(Q.k==='p'){// Lösung: Knall + Behauchung (Fortis vor Vokal behaucht, nach s/sch kaum)
      const nx=w.ph[k+1]??PH.words[wi+1]?.ph[0],pv=w.ph[k-1];let vot;
      if(Q.flap)vot=.003;else if(Q.vc)vot=.012;else if(nx&&P[nx]?.k==='f')vot=.004;else if(pv==='S'||pv==='s')vot=.014;else if(nx&&isVow(nx))vot=stressed?.058:.03;else if(nx&&['l','r','w','j'].includes(nx))vot=stressed?.05:.03;else vot=.02;
      seg.cl=d;seg.bd=Q.bd;seg.vot=vot/Math.sqrt(sp);seg.d=d+seg.bd+seg.vot;}
     seg.t1=t+seg.d;segs.push(seg);t=seg.t1;if(k===s.nuc){sy.v0=seg.t0;sy.v1=seg.t1;}}
    sy.t1=t;ws.sy.push(sy);});
   ws.t1=t;words.push(ws);});
  // Pause (mit hörbarem Einatmen bei langen Pausen)
  const pz=PH.pause*pauseF/Math.sqrt(sp);segs.push({p:'_',Q:P._,t0:t,d:pz,t1:t+pz,phrase:pi,pause:true,breathIn:pz>.3&&pi<phrases.length-1});
  // Tonziele dieser Phrase (in Anteilen des Umfangs; 0 = Grundlinie, 1 = Gipfel)
  const PT=[],type=PH.type,wsP=words.filter(x=>x.phrase===pi),end=t-.01,call=S.call&&(type==='!'||type==='.');let k=0,peak=.95*(S.acc||1)*(V.lively||1);
  PT.push([ptStart,type==='?'?.4:.32]);
  for(const ws of wsP){const w=ws.w;if(!w.acc)continue;const sy=ws.sy[w.stress];if(!sy||sy.v0==null)continue;const vd=sy.v1-sy.v0,last=ws===wsP[wsP.length-1]&&w.stress===w.syls.length-1;
   const em=(w.emph?1.35:1)*(1+(r()*2-1)*(.1+(V.wild||0)*.35));// jeder Akzent etwas anders hoch – gleich hohe Gipfel klingen nach Maschine
   if(w.acc===1){const pk=(type==='?'?.62:1)*peak*em;PT.push([sy.t0,.18]);PT.push([sy.v0+vd*.65,pk]);peak*=.86;k++;}
   else{if(call){PT.push([sy.t0,.5]);PT.push([sy.v0+vd*.25,1.3*em]);PT.push([Math.max(sy.v1-.02,end-.12),1.12]);}// Rufmelodie: oben bleiben, erst ganz am Ende absetzen
    else if(type==='.'||type==='?w'){const pk=Math.max(.82,peak)*em*(S.acc||1);PT.push([sy.t0,.2]);PT.push([sy.v0+vd*(last?.2:.35),pk]);PT.push([last?sy.v1-.01:sy.v1+.07,.08]);}
    else if(type==='!'){PT.push([sy.t0,.4]);PT.push([sy.v0+vd*(last?.18:.28),1.2*em*(S.acc||1)]);PT.push([last?sy.v1-.01:sy.v1+.06,0]);}
    else if(type==='?'){PT.push([sy.v0+vd*(last?.12:.45),.06]);if(last)PT.push([sy.v1,1.3]);}
    else{PT.push([sy.t0,.2]);PT.push([sy.v0+vd*.55,Math.max(.75,peak*.9)*em]);}}}
  PT.push([end,call?(type==='!'?.55:.15):({'.':-.1,'?w':-.06,'!':-.05,',':.62,'-':.5,'?':1.35}[type]??-.1)]);
  PT.sort((a,b)=>a[0]-b[0]);tones.push({pi,t0:ptStart,t1:end,pts:PT,type});
  t+=pz;});
 return {phrases,segs,words,tones,dur:t+.12};}
function makeTracks(pl,V,S,r){
 const {segs,tones,dur}=pl,T=new Tracks(dur),f1m=S.f1||1,whisper=!!S.whisper;
 const vowF=k=>{for(let j=k;j<segs.length;j++){if(segs[j].pause)break;if(segs[j].vow)return segs[j].Q.F;}for(let j=k;j>=0;j--){if(segs[j].pause)break;if(segs[j].vow)return segs[j].Q.to||segs[j].Q.F;}return [500,1500,2500,3500];};
 const prevVowF=k=>{for(let j=k;j>=0;j--){if(segs[j].pause)break;if(segs[j].vow)return segs[j].Q.to||segs[j].Q.F;}return null;};
 const FX=V.fx||[1,1,1],f2m=(S.f2||1)*FX[1],f3m=(1+((S.f2||1)-1)*.6)*FX[2],f1x=f1m*FX[0],redA=clamp((V.slur??.12)+(S.slur||0),0,.7),gr=(V.growl||0)+(S.growl||0),subs=[],chas=[],accV=[];
 const setF=(t,F)=>{T.key('F1',t,F[0]*f1x);T.key('F2',t,F[1]*f2m);T.key('F3',t,F[2]*f3m);T.key('F4',t,F[3]||3500);};
 // Übergänge nach Lokus-Gleichungen: wie weit der Vokalbeginn schon beim Vokal ist (Lippen: fast ganz, Zahndamm: knapp halb, Gaumen: am Ort)
 const LK=[.45,.6,.7,1],ASPA=V.asp??.4,LKP={lab:LABK,alv:[.3,.42,.5,1],den:[.3,.5,.55,1],post:[.3,.45,.6,1],pal:[.3,.5,.6,1],rho:[.3,.35,.3,1],vel:[.3,0,0,1]},TRD={lab:.03,alv:.04,den:.04,vel:.055,rho:.06},toward=(L,F,pl)=>{const K=LKP[pl]||LK;return L.map((l,i)=>l+(F[i]-l)*K[i]);};
 const bars=[],hs=[];T.key('AM',0,0);T.key('AMF',0,27);
 const micro=[];// [t0,t1,Halbtöne]
 let lastF=[500,1500,2500,3500],voicedPrev=false;
 segs.forEach((s,k)=>{const Q=s.Q,t0=s.t0,t1=s.t1,d=t1-t0;
  T.hold('MO',t0,t1,Q.o||0);
  if(s.pause){T.hold('AV',t0,t1,0);T.hold('AH',t0,t1,0);T.hold('AF',t0,t1,0);T.hold('NZ',t0,t1,270);setF(t0+.02,lastF);
   if(s.breathIn&&(V.breathIn??1)>0){const b0=Math.max(t0+.04,t1-.32),b1=t1-.05;T.key('AH',b0,0);T.key('AH',(b0+b1)/2,.05*(V.breathIn??1));T.key('AH',b1,0);setF(b0,[520,1550,2500,3400]);}
   voicedPrev=false;return;}
  const prevSeg=segs[k-1],nextSeg=segs[k+1];
  if(s.vow){// natürliche Streuung der Klangfarbe (±2–5 %) und Zentralisierung unbetonter Vokale zum Schwa hin (Vokalreduktion)
   const red=!s.stressed&&!Q.sw&&!s.last?redA:redA*.25,SCH=[500,1500,2450,3450],vm=[1+(r()-.5)*.05,1+(r()-.5)*.04,1+(r()-.5)*.03,1],mod=A=>A&&A.map((f,i)=>(f+(SCH[i]-f)*red)*vm[i]);
   const F=mod(Q.F),TO=mod(Q.to);
   const pl1=prevSeg&&!prevSeg.pause&&!prevSeg.vow?prevSeg.Q.pl:null,pl2=nextSeg&&!nextSeg.pause&&!nextSeg.vow?nextSeg.Q.pl:null;
   const L1=pl1&&pl1!=='glot'?locus(pl1,F):null,L2=pl2&&pl2!=='glot'?locus(pl2,TO||F):null;
   const gl1=prevSeg&&!prevSeg.pause&&prevSeg.Q.k==='l'?prevSeg.Q:null,gl2=nextSeg&&!nextSeg.pause&&nextSeg.Q.k==='l'?nextSeg.Q:null,mixF=(A,B,u)=>A.map((a,i)=>a+(B[i]-a)*u);
   const tr=gl1?Math.min(gl1.pl==='alv'?.045:.075,d*.5):Math.min(TRD[pl1]||.04,d*.4),tr2=gl2?Math.min(gl2.pl==='alv'?.05:.07,d*.45):Math.min(TRD[pl2]||.04,d*.4);
   setF(t0,gl1?mixF(gl1.F,F,.3):L1?toward(L1,F,pl1):F);
   if(Q.k==='d'){setF(t0+Math.max(tr,d*.3),F);setF(t0+d*.85,TO);setF(t1,gl2?mixF(gl2.F,TO,.4):L2?toward(L2,TO,pl2):TO);lastF=TO;}
   else{setF(t0+tr,F);setF(t1-tr2,F);setF(t1,gl2?mixF(gl2.F,F,.35):L2?toward(L2,F,pl2):F);lastF=F;}
   if(s.acc){accV.push([t0,t1]);if(gr>0&&d>.07)subs.push([t0,t1,gr*(s.acc===2?1:.6)]);if(S.brk&&d>.08&&r()<S.brk){const tb=t0+d*(.25+r()*.3);micro.push([tb,tb+.05+r()*.04,4+r()*3]);chas.push([tb,tb+.1]);}}
   let lvl=s.acc===2?1.25:s.acc===1?1.15:s.stressed?1:.82;if(Q.sw)lvl*=.75;if(s.last)lvl*=.85;
   T.hold('AV',t0,t1,whisper?0:lvl);T.hold('AH',t0,t1,whisper?.3*lvl:0);T.hold('AF',t0,t1,0);
   // Nasalierung vor/nach Nasal
   const nn=nextSeg?.Q.k==='n',pn=prevSeg?.Q.k==='n';T.key('NZ',t0,pn?380:270);T.key('NZ',t0+d*.4,270);T.key('NZ',t0+d*.6,270);T.key('NZ',t1,nn?400:270);
   // Mikroprosodie: hohe Vokale etwas höher, nach stimmlosem Laut kurz höher
   micro.push([t0,t1,Q.hi?.6:Q.lo?-.4:0]);if(prevSeg&&isObs(prevSeg.p)&&!prevSeg.Q.vc)micro.push([t0,t0+.04,.9]);if(prevSeg&&isObs(prevSeg.p)&&prevSeg.Q.vc)micro.push([t0,t0+.03,-.5]);
   voicedPrev=!whisper;return;}
  const nv=vowF(k);
  switch(Q.k){
   case 'n':case 'l':{const F=Q.F;setF(t0+Math.min(.015,d*.3),F);setF(t1-Math.min(.015,d*.3),F);lastF=F;
    const lvl=Q.k==='n'?(prevSeg&&!prevSeg.pause?.58:.4):p6(s.p),asp=Q.k==='l'&&prevSeg&&prevSeg.Q.k==='p'&&!prevSeg.Q.vc&&prevSeg.w===s.w&&prevSeg.vot>.025&&!whisper;
    if(asp){T.key('AV',t0+1e-5,.08);T.key('AV',t0+d*.4,.14);T.key('AV',t0+d*.65,lvl);T.key('AV',t1,lvl);T.key('AH',t0+1e-5,.22);T.key('AH',t0+d*.4,.16);T.key('AH',t0+d*.65,0);T.key('AH',t1,0);}
    else{T.hold('AV',t0,t1,whisper?0:lvl);T.hold('AH',t0,t1,whisper?.2:0);}
    if(Q.k==='n')T.hold('NZ',t0,t1,Q.nz);else T.hold('NZ',t0,t1,270);
    if(Q.fs){const dev=!!prevSeg&&isObs(prevSeg.p)&&!prevSeg.Q.vc;T.hold('AF',t0,t1,Q.af*(dev?1.5:1));T.fric(t0,t1,dev?'+x':Q.fs);if(dev){T.key('AV',t0+2e-5,.1);T.key('AV',t1-1e-5,whisper?0:.3);}}else T.hold('AF',t0,t1,0);
    voicedPrev=!whisper;break;}
   case 'f':{const L=locus(Q.pl,nv)||nv;setF(t0+d*.5,L);const vc=Q.vc&&!whisper;T.hold('AV',t0,t1,vc?(voicedPrev?.3:.16):0);T.hold('AH',t0,t1,0);T.hold('NZ',t0,t1,270);
    T.key('AF',t0,0);T.key('AF',t0+Math.min(.02,d*.3),Q.af);T.key('AF',t1-Math.min(.015,d*.25),Q.af);T.key('AF',t1,0);
    T.fric(t0,t1,Q.fs,Q.pl==='vel'?clamp(nv[1]/1250,.85,1.5):1);voicedPrev=vc;break;}
   case 'h':{setF(t0,nv);const mur=voicedPrev&&prevSeg&&!prevSeg.pause&&!whisper;T.hold('AV',t0,t1,mur?.12:0);T.hold('AH',t0,t1,.6);hs.push([t0,t1]);T.hold('AF',t0,t1,0);T.hold('NZ',t0,t1,270);voicedPrev=false;break;}
   case 'q':{// Knacklaut: kurze Stille und harter Stimmeinsatz mit wenig Knarren (starkes Knarren klang wie b, ein bloßer Einbruch der Lautstärke wie l)
    T.hold('AV',t0,t1,0);T.hold('AH',t0,t1,0);T.hold('AF',t0,t1,0);T.key('CR',t0,0);T.key('CR',t1,.25);T.key('CR',t1+.02,0);T.hold('NZ',t0,t1,270);voicedPrev=false;break;}
   case 'p':{const tg=nextSeg&&!nextSeg.pause&&!nextSeg.vow&&nextSeg.Q.F&&(nextSeg.Q.k==='l'||nextSeg.Q.k==='n')?nextSeg.Q.F:nv,L=locus(Q.pl,nv)||nv,tc=t0+s.cl,tb=tc+s.bd;setF(t0+s.cl*.5,L);T.key('NZ',t0,270);
    const vb=Q.vc&&voicedPrev&&!whisper;if(vb){T.key('AV',t0+1e-5,.1);T.key('AV',t0+s.cl*.4,.06);T.key('AV',t0+s.cl*.55,0);T.key('AV',tc,0);}else T.hold('AV',t0,tc,0);if(vb){T.key('F1',t0+s.cl*.5,200);bars.push([t0,tc]);}
    T.key('AF',t0,0);T.key('AF',tc-.0005,0);T.key('AF',tc,Q.ba);T.key('AF',tb,Q.ba*.35);T.key('AF',tb+.003,0);T.key('AF',t1,0);
    T.fric(tc-.001,tb+.004,Q.fs,Q.pl==='vel'?(!nextSeg?.vow?1600:nv[1]<1700?clamp(nv[1]*1.25,1050,1900):2800)/1900:1);
    T.key('AH',tc,0);T.key('AH',tb,s.vot>.04?ASPA:s.vot>.02?.2:.1);T.key('AH',t1-.004,s.vot>.04?ASPA*.7:s.vot>.02?.14:.07);T.key('AH',t1,0);T.key('AV',tb,0);T.key('AV',t1-.003,0);
    setF(tb,toward(L,tg,Q.pl));
    micro.push([t0,t1,0]);voicedPrev=false;break;}}
 });
 function p6(p){return p==='l'?.62:p==='L'?.6:p==='j'?.64:p==='w'?.52:p==='r'?.66:.4;}
 // Tonhöhe: Tonziele → Halbtöne, Deklination, Mikroprosodie, Knarren am Aussageende
 const n=T.n,st=new Float32Array(n),base=12*Math.log2((V.pitch||120)/100)+((S.st||0)>0?Math.max(0,Math.min(S.st,12*Math.log2(255/(V.pitch||120)))):(S.st||0)),range=(V.range||9)*(S.range||1),decl=(S.decl||1)*.9;
 const mp=new Float32Array(n);for(const [a,b,v] of micro){for(let i=Math.floor(a/FR);i<Math.min(n,b/FR);i++)mp[i]+=v;}smooth(mp,.012);
 let ti=0;for(let i=0;i<n;i++){const t=i*FR;while(ti<tones.length-1&&t>tones[ti].t1+.02)ti++;const tn=tones[ti],pts=tn.pts;let v;
  if(t<=pts[0][0])v=pts[0][1];else if(t>=pts[pts.length-1][0])v=pts[pts.length-1][1];else{let j=0;while(j<pts.length-1&&pts[j+1][0]<t)j++;const A=pts[j],B=pts[j+1];v=A[1]+(B[1]-A[1])*clamp((t-A[0])/Math.max(1e-6,B[0]-A[0]),0,1);}
  const rel=Math.min(2.5,Math.max(0,t-tn.t0));st[i]=base-range*.38+range*v-decl*rel-(tn.pi>0&&tones[tn.pi-1].type!=='.'&&tones[tn.pi-1].type!=='!'&&tones[tn.pi-1].type!=='?'?.6:0)+mp[i];}
 // Flackern der Tonhöhe (Angst, Betrunkene): langsames Zufallswandern
 if(S.wob){const per=Math.max(20,Math.round(1/((S.wobRate||5)*2)/FR));let a=0,b=r()*2-1;for(let i=0;i<n;i++){if(i%per===0){a=b;b=r()*2-1;}const u=(i%per)/per;st[i]+=S.wob*(a+(b-a)*u*u*(3-2*u));}}
 smooth(st,.022);const f0=new Float32Array(n);for(let i=0;i<n;i++)f0[i]=100*Math.pow(2,st[i]/12);T.set('f0',f0);
 const crk=clamp((V.creak||0)+(S.creak||0)*.5,0,1);
 if(crk>0)for(const tn of tones){if(tn.type!=='.'&&tn.type!=='?w')continue;T.key('CR',tn.t1-.16,0);T.key('CR',tn.t1-.05,crk*.85);T.key('CR',tn.t1+.03,0);}
 // Stimmqualität
 const oq=S.oq??V.oq??.55,tl=S.tilt??V.tilt??.55;T.key('OQ',0,oq);T.key('TL',0,tl);
 // Stimmhafter Verschluss (b d g): nur ein dumpfes Brummen der Stimmlippen, keine Obertöne – sonst klingt b wie w
 for(const [a,b] of bars){T.key('TL',a,tl);T.key('TL',a+.006,.08);T.key('TL',b-.006,.08);T.key('TL',b-.001,tl);}
 T.key('BR',0,clamp((S.breath||0),-.2,1));T.key('TR',0,S.trem||0);
 {const sb=S.sub||0;T.key('SUB',0,sb);for(const [a,b,v] of subs){T.key('SUB',a,sb);T.key('SUB',a+.025,sb+v);T.key('SUB',b-.03,sb+v);T.key('SUB',b,sb);}// Knurren auf den Akzenten
  const cb=S.chaos||0;T.key('CHA',0,cb);for(const [a,b] of chas){T.key('CHA',a-.01,cb);T.key('CHA',a+.01,cb+.35);T.key('CHA',b,cb);}}
 {const b1=70*(1+(V.breath||0)*.4);T.key('B1',0,b1);for(const [a,b] of hs){T.key('B1',a-.005,b1);T.key('B1',a+.005,260);T.key('B1',b-.005,260);T.key('B1',b+.012,b1);}}T.key('B2',0,90);T.key('B3',0,140);
 const TT=T.build({TL:.004,AM:.005,B1:.004,SUB:.01,CHA:.006});
 // Lachen in der Stimme: Lautstärke und Tonhöhe pulsieren etwa 5-mal je Sekunde, am stärksten auf den Akzenten
 if(S.laugh){const m=new Float32Array(n).fill(.3);for(const [a,b] of accV)for(let i=Math.floor(a/FR);i<Math.min(n,b/FR+40);i++)m[i]=1;smooth(m,.03);const ph0=r();for(let i=0;i<n;i++){const pu=.5*(1+Math.sin(TAU*(i*FR*5.4+ph0)));TT.AV[i]*=1-S.laugh*.6*pu*m[i];TT.f0[i]*=1+S.laugh*.07*(1-pu)*m[i];TT.BR[i]+=S.laugh*.25*pu*m[i];}}
 // Lallen: Mitlaute verwaschen
 if(S.slur)for(let i=0;i<n;i++)TT.AF[i]*=1-S.slur*.5;
 return TT;}

// ---------- öffentliche Funktionen ----------
function voiceOf(v){if(typeof v==='string')return {...PRESETS[v]||PRESETS.moderator};return {...PRESETS.moderator,...(v||{})};}
// ---------- Text in Abschnitte gleicher Sprechweise teilen: Regieanweisungen, Lacher, Satzzeichen ----------
const LAUGH_RE=/(^|[^A-Za-z'])((?:mua?|mwa|bu|bwa|wa|ga)?h([aeiou])(?:r?[ ,!-]{0,3}h\3)+[rh]?)(?![A-Za-z'])[!.…,]*/gi;
// Sprechweise eines Satzes aus der Schreibweise (nur wenn sonst „normal“ gesprochen würde): GROSS oder „!!“ = Brüllen,
// Hilferufe (help, mercy, please don't, spare me) = Flehen, einfaches „!“ = mit Nachdruck. In der Arena-Ansage bleibt die Ansage.
function autoStyle(sent,base){if(base!=='normal')return base;
 const ws=sent.match(/[A-Za-zÄÖÜäöüß]{2,}/g)||[],caps=ws.filter(w=>w.length>2&&w===w.toUpperCase()).length;
 if(ws.length&&(caps>=2&&caps>=ws.length*.6||ws.length===1&&caps===1&&ws[0].length>=4)||/!{2,}\s*$/.test(sent))return 'bruellen';
 if(/!\s*["“”»«]*\s*$/.test(sent)){if(/\b(help|mercy|have pity|spare me|spare us|please don't|please no|don't hurt me|don't kill me|i yield|i surrender)\b/i.test(sent))return 'flehen';return 'nachdruck';}
 return base;}
const decap=t=>t.replace(/[A-Za-zÄÖÜäöüß]{3,}/g,w=>w===w.toUpperCase()?w[0]+w.slice(1).toLowerCase():w);
function segment(text,base,auto){const out=[];let style=base,explicit=false;
 const add=(t,st)=>{if(!/[A-Za-zÄÖÜäöüß0-9]/.test(t))return;const L=out[out.length-1];if(L&&!L.laugh&&L.style===st)L.text+=' '+t;else out.push({text:t,style:st});};
 const allCaps=t=>{const ws=t.match(/[A-Za-zÄÖÜäöüß]{3,}/g)||[];return ws.length>0&&ws.filter(w=>w===w.toUpperCase()).length>=Math.max(1,ws.length*.6);};
 const addText=t=>{if(!auto||explicit){add(allCaps(t)?decap(t):t,style);return;}for(const sent of t.match(/[^.!?…]+(?:[.!?…]+["“”»«]*|$)/g)||[]){const st=autoStyle(sent,style);add(st==='bruellen'&&style!=='bruellen'?decap(sent):sent,st);}};
 for(const pc of String(text||'').split(/(\[[^\]\n]{2,24}\])/)){if(!pc)continue;const m=/^\[([^\]]+)\]$/.exec(pc);
  if(m){const k=TAGS[m[1].trim().toLowerCase()];if(k){style=k;explicit=k!=='normal';if(!explicit)style=base;}continue;}
  LAUGH_RE.lastIndex=0;let last=0,mm;while((mm=LAUGH_RE.exec(pc))){addText(pc.slice(last,mm.index+mm[1].length));out.push({laugh:mm[2],style});last=LAUGH_RE.lastIndex;}
  addText(pc.slice(last));}
 // „Lachend“: kurzes Auflachen davor und danach, wenn kein Lacher im Text steht
 if(!out.some(p=>p.laugh)){const k=out.findIndex(p=>STYLES[p.style]?.chuckle);if(k>=0){let e=k;while(e+1<out.length&&STYLES[out[e+1].style]?.chuckle)e++;out.splice(e+1,0,{laugh:'hahaha',style:out[e].style});if(out[k].text.split(/\s+/).length>5)out.splice(k,0,{laugh:'hehe',style:out[k].style,short:1});}}
 return out;}
// ---------- Lachen: Folge aus Hauch und kurzem Stimmstoß, Tonhöhe und Kraft fallen ab ----------
const LAUGHV={a:{F:[720,1300,2500,3500],o:.9,p:1.65,rate:5},e:{F:[560,1750,2500,3500],o:.6,p:1.4,rate:4.6},i:{F:[340,2100,2800,3500],o:.4,p:2.15,rate:6.2},o:{F:[520,900,2450,3400],o:.7,p:1.3,rate:4.2}};
function laughPlan(part,V,S,r){const lw=part.laugh.toLowerCase(),m=/h([aeiou])/.exec(lw);let v=m?m[1]:'a';v=v==='u'?'o':v;const K=LAUGHV[v];
 const evil=/^(mu|mw|bu|bwa|wa|ga)/.test(lw),loud=part.laugh.replace(/[^A-ZÄÖÜ]/g,'').length>part.laugh.replace(/[^a-zäöü]/g,'').length;
 let n=(lw.match(/h[aeiou]/g)||[]).length;n=part.short?2+Math.floor(r()*2):clamp(n+(n<3?1:0)+Math.floor(r()*2)+(evil?2:0),3,10);
 const base=(V.pitch||120)*Math.pow(2,(S.st||0)/12)*(evil?.82:1),rate=K.rate*(evil?.8:1)*(.92+r()*.16)*Math.pow(V.speed||1,.4),pulses=[];let t=.05;
 let pre=null;if(evil){pre={t0:t,d:.12+.2+r()*.1};t+=pre.d+.04;}
 for(let k=0;k<n;k++){const per=1/rate*(1+k*.035)*(.94+r()*.12),vd=per*(.44+r()*.1),hd=per-vd,rise=k===0&&n>3?.93:1;
  pulses.push({h0:t,v0:t+hd,v1:t+per,p:K.p*rise*Math.pow(.945,k)*(1+(r()-.5)*.04),lvl:(1-k*.07/Math.max(1,n/5))*(loud?1:.88)});t+=per;}
 const inh=!part.short&&r()<.7?{t0:t+.06,d:.2+r()*.1}:null;if(inh)t=inh.t0+inh.d;
 const dur=t+.14,T=new Tracks(dur),F=K.F.map((f,i)=>f*(V.fx?.[i]??1)),setF=(tt,A)=>{T.key('F1',tt,A[0]);T.key('F2',tt,A[1]);T.key('F3',tt,A[2]);T.key('F4',tt,A[3]);};
 T.key('AV',0,0);T.key('AH',0,0);T.key('MO',0,0);T.key('f0',0,base*K.p);setF(0,F);T.key('CR',0,0);
 if(pre){const a=pre.t0,b=a+.12,c=a+pre.d;T.key('NZ',a,430);T.key('NZ',b-.01,430);T.key('NZ',b+.02,270);setF(a,[260,1050,2100,3300]);setF(b-.01,[260,1050,2100,3300]);setF(b+.03,[320,760,2300,3300]);setF(c-.03,[420,1000,2400,3400]);setF(c,F);
  T.key('AV',a,0);T.key('AV',a+.03,.5);T.key('AV',b+.02,.9);T.key('AV',c-.02,1);T.key('AV',c,0);T.key('f0',a,base*.8);T.key('f0',c,base*1.25);T.key('MO',a,0);T.key('MO',b,.05);T.key('MO',b+.04,.3);T.key('MO',c,.5);}
 pulses.forEach((P,k)=>{const {h0,v0,v1}=P,f=base*P.p;T.key('AH',h0,0);T.key('AH',h0+.012,.55*P.lvl);T.key('AH',v0-.008,.5*P.lvl);T.key('AH',v0+.01,0);
  T.key('AV',v0-.004,0);T.key('AV',v0+.014,1.15*P.lvl);T.key('AV',v1-.03,.8*P.lvl);T.key('AV',v1-.002,0);
  T.key('f0',h0,f*1.02);T.key('f0',v0,f*1.05);T.key('f0',v1,f*.93);T.key('MO',h0,K.o*.45);T.key('MO',v0+.02,K.o);T.key('MO',v1,K.o*.5);
  if((V.creak||0)>.35&&k>=n-2){T.key('CR',v0,0);T.key('CR',(v0+v1)/2,(V.creak||0)*.6);T.key('CR',v1,0);}});
 if(inh){const a=inh.t0,b=a+inh.d;T.key('AH',a,0);T.key('AH',a+inh.d*.4,.16);T.key('AH',b,0);T.key('MO',a,.35);T.key('MO',b,0);setF(a,F);setF(a+.03,[520,1550,2500,3400]);}
 T.key('OQ',0,Math.min(.75,(S.oq??V.oq??.55)+.08));T.key('TL',0,S.tilt??V.tilt??.55);T.key('BR',0,.3);T.key('B1',0,95);T.key('B2',0,100);T.key('B3',0,150);T.key('AM',0,0);
 if(gro(V,S)>0)T.key('SUB',0,gro(V,S)*.5);
 const TT=T.build({f0:.008,AV:.006,AH:.008});return {T:TT,dur,pl:null,phon:'⟨'+part.laugh.replace(/[!.…,]+$/,'')+'⟩',f0min:.12};}
const gro=(V,S)=>(V.growl||0)+(S.growl||0);
// Trockene Aufbereitung eines Abschnitts: Lautheit, Pressung der Stimme, Präsenz
function dry(x,o){let peak=0;for(let i=0;i<x.length;i++){const v=x[i]<0?-x[i]:x[i];if(v>peak)peak=v;}const g=peak>0?.9/peak:1,d=o.drive||1;
 for(let i=0;i<x.length;i++){let v=x[i]*g;if(d>1.01)v=Math.tanh(v*d)/Math.tanh(d);x[i]=v;}
 polish(x,o.speech);peak=0;for(let i=0;i<x.length;i++){const v=x[i]<0?-x[i]:x[i];if(v>peak)peak=v;}const g2=peak>0?(o.vol??1)/peak:1;for(let i=0;i<x.length;i++)x[i]*=g2;return x;}
// Arena-Echo: der Ruf kommt von der gegenüberliegenden Tribüne dumpfer zurück
function echo(x,amt){if(!(amt>0))return x;const d1=Math.floor(.15*SR),d2=Math.floor(.31*SR),y=new Float32Array(x.length+d2+Math.floor(.05*SR));y.set(x);let lp=0;const a=1-Math.exp(-TAU*2600/SR);
 for(let i=0;i<x.length;i++){lp+=(x[i]-lp)*a;y[i+d1]+=lp*amt;y[i+d2]+=lp*amt*.45;}return y;}
function render(text,voice,opt={}){
 const V=voiceOf(voice),r=rng(opt.seed??Math.floor(Math.random()*1e9));
 V.accent=acc(opt.accent||V.accent);P=TAB[V.accent];
 if(opt.speed)V.speed=(V.speed||1)*opt.speed;if(opt.pitch)V.pitch*=opt.pitch;if(opt.range!=null)V.range=(V.range||9)*opt.range;
 const base=STYLES[opt.style]?opt.style:STYLES[V.style]?V.style:'normal',parts=segment(text,base,opt.auto!==false);
 const chunks=[];let total=0,volMax=0,echoAmt=0;
 for(const part of parts){const S={...STYLES[part.style]||{}};let R;
  if(part.laugh)R=laughPlan(part,V,S,r);else{const pl=plan(part.text,V,S,r);if(!pl.words.length)continue;R={T:makeTracks(pl,V,S,r),dur:pl.dur,pl,phon:phonString(pl,V.accent),f0min:.2};}
  const T=R.T,raw=synth(T,{...V,asp:1,air:V.air??.05,nasal:(V.nasal||0)+(S.nasal||0),rough:(V.rough||0)+(S.rough||0)},r),vol=(S.vol||1)*(part.laugh?.9:1);
  dry(raw,{drive:S.drive||1,vol,speech:{pres:S.pres??V.presence??.5,comp:S.comp??V.comp??.6}});
  chunks.push({R,T,raw,S,off:total/SR});total+=raw.length;volMax=Math.max(volMax,vol);echoAmt=Math.max(echoAmt,S.echo||0);}
 let x=new Float32Array(total),o=0;for(const c of chunks){x.set(c.raw,o);o+=c.raw.length;}
 // Raum über alles: Arena-Echo, Hall, auf Wunsch 16-Bit-Klang; Lautstärke der lautesten Stelle bleibt
 const ech=opt.echo??V.echo??echoAmt,rm=opt.room??V.room??0;if(ech>0)x=echo(x,ech);if(rm>0)x=room(x,rm,opt.roomSize||1);if(opt.retro)x=retro(x,opt.retroOpt);
 {let peak=0;for(let i=0;i<x.length;i++){const v=x[i]<0?-x[i]:x[i];if(v>peak)peak=v;}const g=peak>0?.92/peak*(volMax||1)*(opt.vol??1):1;for(let i=0;i<x.length;i++)x[i]=Math.tanh(x[i]*g*1.05)/Math.tanh(1.05);}
 // Mundöffnung, Tonhöhenkurve und Wortzeiten über alle Abschnitte
 const mouth=[],f0=[],words=[],tones=[],phrases=[],segs=[],phon=[];
 for(const c of chunks){const {T,R,S,off}=c;for(let t=0;t<R.dur;t+=.02){const i=Math.min(T.n-1,Math.round(t/FR)),act=T.AV[i]+T.AF[i]+T.AH[i];mouth.push({t:off+t,o:T.MO[i]*(act>.05?1:.3)});}
  const k0=Math.round(off/(FR*10));while(f0.length<k0)f0.push(0);for(let i=0;i<T.n;i+=10)f0.push(T.AV[i]>R.f0min&&!S.whisper?T.f0[i]*(1-.5*T.CR[i]):0);
  phon.push(R.phon);if(!R.pl){words.push({txt:'(laughs)',t0:off,t1:off+R.dur,acc:0,emph:0,fn:false,sy:[],phrase:phrases.length,laugh:true});phrases.push({type:'-',pause:0,style:c.S.name});continue;}
  const pb=phrases.length;for(const ws of R.pl.words)words.push({txt:ws.w.txt,t0:ws.t0+off,t1:ws.t1+off,acc:ws.w.acc,emph:ws.w.emph,fn:ws.w.fn,sy:ws.sy.map(y=>({...y,t0:y.t0+off,t1:y.t1+off,v0:y.v0!=null?y.v0+off:y.v0,v1:y.v1!=null?y.v1+off:y.v1})),phrase:ws.phrase+pb});
  for(const tn of R.pl.tones)tones.push({...tn,pi:tn.pi+pb,t0:tn.t0+off,t1:tn.t1+off,pts:tn.pts.map(q=>[q[0]+off,q[1]])});
  for(const p of R.pl.phrases)phrases.push({type:p.type,pause:p.pause,style:c.S.name});
  for(const sg of R.pl.segs)if(!sg.pause)segs.push({p:sg.p,t0:sg.t0+off,t1:sg.t1+off});}
 mouth.push({t:total/SR,o:0});
 P=TAB[ACCENT];
 return {data:x,sr:SR,dur:x.length/SR,mouth,phon:phon.join(' ‖ '),accent:V.accent,info:{words,tones,phrases,f0,f0step:FR*10,segs,styles:parts.map(p=>p.style)}};}
// Lautschrift für die Anzeige (IPA), je nach Akzent
const IPA={i:'iː',I:'ɪ',e:'eɪ',E:'ɛ',a:'æ',A:'ɑː',Q:'ɒ',O:'ɔː',o:'əʊ',U:'ʊ',u:'uː',V:'ʌ','@':'ə','3':'ɜː','6':'ə',Y:'aɪ',W:'aʊ',X:'ɔɪ','7':'ɪə','8':'ɛː','9':'ʊə',T:'θ',D:'ð',S:'ʃ',Z:'ʒ',N:'ŋ',r:'ɹ',F:'ɾ',L:'ɫ',g:'ɡ','?':'ʔ'};
const IPAUS={Q:'ɑ',o:'oʊ','3':'ɝ','6':'ɚ','7':'ɪɹ','8':'ɛɹ','9':'ʊɹ',A:'ɑ',O:'ɔ',i:'i',u:'u'};
const ipa=(p,accent)=>(acc(accent)==='us'&&IPAUS[p])||IPA[p]||p;
function phonString(pl,accent){let out='',lastP=-1;for(const ws of pl.words){const w=ws.w;if(ws.phrase!==lastP&&lastP>=0){const T=pl.phrases[lastP].type;out=out.trimEnd()+({'.':' ‖ ','!':' ‖ ','?':' ↗‖ ','?w':' ‖ ',',':' | ','-':' ¦ '}[T]||' | ');}lastP=ws.phrase;
  const parts=w.syls.map((s,si)=>(si===w.stress&&!w.fn?(w.acc===2?'ˈˈ':w.acc?'ˈ':w.syls.length>1?'ˌ':''):'')+w.ph.slice(s.a,s.b).map(p=>ipa(p,accent)).join(''));out+=parts.join('.')+' ';}
 return out.trim();}
// Ein Wort in der Schreibweise des Wörterbuchs (für das Voice Lab): Lautschrift vor dem Akzent, ' vor dem betonten Vokal
function lexString(word){const w=String(word).toLowerCase().replace(/’/g,"'");dict();const R=pron(w);return R.ph.map((p,k)=>(k===R.st&&R.ph.filter(isVow).length>1?"'":'')+p).join('');}
function wordIPA(word,accent){const G=g2p(word,{accent});return G.syls.map((s,si)=>(si===G.stress&&G.syls.length>1?'ˈ':'')+G.ph.slice(s.a,s.b).map(p=>ipa(p,accent)).join('')).join('');}
function mouthAt(list,t){if(!list?.length)return 0;let lo=0,hi=list.length-1;if(t<=list[0].t)return list[0].o;if(t>=list[hi].t)return list[hi].o;while(hi-lo>1){const m=(lo+hi)>>1;if(list[m].t<=t)lo=m;else hi=m;}const a=list[lo],b=list[hi],u=(t-a.t)/Math.max(1e-6,b.t-a.t);return a.o+(b.o-a.o)*u;}
function playData(ctx,dest,R,opt={}){const b=ctx.createBuffer(1,R.data.length,R.sr||SR);b.getChannelData(0).set(R.data);const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=b;g.gain.value=opt.vol??1;s.connect(g);g.connect(dest);const at=Math.max(ctx.currentTime,opt.at||0)+.02;s.start(at);s.onended=()=>{s.disconnect();g.disconnect();};return {source:s,start:at,dur:R.dur,mouth:R.mouth,mouthAt:tt=>mouthAt(R.mouth,tt-at)};}
function play(ctx,dest,text,voice,opt={}){const R=render(text,voice,opt);return {...playData(ctx,dest,R,opt),phon:R.phon,info:R.info,data:R.data};}
// Eigenes Wörterbuch: { wort: "Lautschrift mit ' vor dem betonten Vokal" | Nummer der betonten Silbe }. Wirkt sofort (Zwischenspeicher wird geleert).
function setLexicon(o){for(const k of Object.keys(USERLEX))delete USERLEX[k];if(o&&typeof o==='object')for(const k of Object.keys(o)){const v=o[k];if(typeof v==='string'&&v.trim())USERLEX[k.toLowerCase().trim()]=v.replace(/\s+/g,'');else if(typeof v==='number')USERLEX[k.toLowerCase().trim()]=v;}g2pCache.clear();}
function getLexicon(){return {...USERLEX};}
function saveLexicon(){try{if(typeof localStorage!=='undefined')localStorage.setItem(ULKEY,JSON.stringify(USERLEX));}catch{}}
(typeof window!=='undefined'?window:self).StimmeEN={SR,FR,LANG:'en',get P(){return P;},TAB,PRESETS,DEFAULTS,STYLES,TAGS,ORDER:Object.keys(PRESETS),g2p,pron,analyse,segment,render,play,playData,mouthAt,numWord,ordWord,setLexicon,getLexicon,saveLexicon,LEXKEY:ULKEY,setVoices,VOICEKEY:VOKEY,
 setAccent,get accent(){return ACCENT;},ACCENTKEY:ACKEY,ipa,lexString,wordIPA,inLex:w=>LEX[w]!==undefined,PHONES:'iIeEaAQOoUuV@36YWXpbtdkgfvTDszSZhmnNlrwjCJ',dictSize:()=>dict().size,
 core:{synth,Tracks,finish,room,retro,rng,smooth,SHN,clamp,SH,byRules,letters}};
})();
