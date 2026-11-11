'use strict';
// =====================================================================================================
// STIMME (window.Stimme) – deutsche Sprachausgabe des Spiels (seit 2.11.2026, ersetzt sprechsound.js beim Sprechen; gerechnet in sprech-worker.js).
// Ohne Tondateien, alles gerechnet. Aufbau wie die klassischen Regelsynthesen (Klatt-Synthesizer, deutsche Regeln
// nach MARY/IMS), mit den Teilen, die für eine natürliche Betonung zählen:
//  1. Text → Wörter, Zahlen ausgeschrieben, Satzarten (Aussage, Ja/Nein-Frage, W-Frage, Ausruf, Weiterweisung am Komma).
//  2. Aussprache: Vokallänge (offene Silbe, Dehnungs-h, ß, Doppelmitlaut), Knacklaut vor Vokal, Auslautverhärtung,
//     vokalisiertes r, ich-/ach-Laut, st/sp, Vorsilben (be-, ge-, ver- … unbetont; an-, auf-, aus- … betont),
//     Fremdwort-Endungen (-ion, -ieren, -tät, -ei, -ur, -ist …), lateinische Namen (Paenultima-Regel), Wörterbuch.
//  3. Silben + Wortakzent; Satzakzente nach deutscher Fokusregel: Inhaltswörter tragen Akzente, Funktionswörter nicht,
//     Hauptakzent auf dem letzten Inhaltswort – aber vor ein Verb am Phrasenende gezogen („Ich habe das SCHWERT gesehen“).
//     *Sternchen* um ein Wort = Kontrastbetonung, danach wird alles flach (wie beim Menschen).
//  4. Satzmelodie als Tonziele (GToBI): L+H* Anstieg auf Nebenakzenten, H*L Fall am Aussageende, L*H Frageanstieg,
//     H- Weiterweisung am Komma, Abstufung (Downstep), Deklination, Mikroprosodie.
//  5. Lautdauern nach Klatt-Regeln (Eigen-/Mindestdauer, Betonung, Akzent, Phrasenende, Mehrsilbigkeit, Häufung).
//  6. Klang: Glottispuls (KLGLOTT88) mit Öffnungsquotient, Spektralneigung, Hauch, Knarren, Zittern; Kaskade aus fünf
//     Formanten + Nasal-Pol/-Nullstelle; parallele Rauschzweige für s, sch, ch, f, Verschlusslösungen und Behauchung;
//     Formantübergänge über Lokus-Gleichungen (b/d/g klingen dadurch unterscheidbar).
// Überarbeitung 11.11.2026 (gemessen mit Spracherkennung an 44 Spielsätzen, Spieltempo: 40 % falsch verstandene Wörter → 18 %):
//   Aussprache: unbetonte Silben kurz, sagt/lebt/gibt lang, Zusammensetzungen über ein Stammwörterbuch (Toten|gräber), Vorsilben nur vor echten
//     Stämmen, -ion, schwache Formen von der/den/dem/er/zu in der Satzmitte, eigenes Wörterbuch aus dem Stimmeditor (setLexicon).
//   Laute: steile Rauschfilter für s/sch/ch/f und die Verschlusslaute (Formen „+s“ …), k/g folgen dem Vokal, Übergänge nach Lokus-Gleichungen,
//     Nasale mit Klatt-Nullstelle (vorher nur Brummen), b/d/g ohne Dauerbrummen, heller Hauch für h, Zäpfchen-R mit Flattern, Affrikaten ohne Hauch.
//   Klang: Luft über 4 kHz im Takt der Stimmlippen, Präsenz und Kompressor (polish), Arena-Echo (echo).
//   Ausdruck: Sprechweisen STYLES (Brüllen, Schreien, Arena-Ansage mit Rufmelodie, Angst, Lachend, Jubelnd, Traurig, Betrunken …), Regie im Text
//     („[brüllt] …“), gelachte Lacher („Hahaha“), Satzzeichen deuten (autoStyle; abschaltbar mit opt.auto=false). render() rechnet den Text in
//     Abschnitten gleicher Sprechweise und setzt sie zusammen.
//   Figuren: PRESETS mit eigenen Werten (lively, wild, tvar, nasal, growl, slur, rollR, fx, presence, comp, air); der Stimmeditor speichert
//     Abweichungen in localStorage „mg-stimme-voices-v1“ (setVoices). Der Stand vom 2.11. liegt als stimme-v1.js nur für den Hörvergleich bei.
//   Die Schreie (schreie.js) benutzen weiter die alten Rauschformen und finish(); an ihnen wurde nichts geändert.
// Schnittstelle wie sprechsound.js (render/play/mouthAt) – kann später ohne Umbau ins Spiel.
// Der Kern (synth, Tracks) ist auch für die Schreie (schreie.js) da.
// =====================================================================================================
(()=>{
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

// ---------- Lauttabelle ----------
// k: v Vokal, d Doppellaut, n Nasal, l Liquida/Gleitlaut, f Reibelaut, p Verschluss, h Hauch, q Knacklaut
// F: F1–F4 (Hz, Männerstimme), d/m: Eigen-/Mindestdauer (ms), o: Mundöffnung, vc: stimmhaft, pl: Artikulationsort
// fs: Rauschspektrum, af: Rauschstärke, nz: Nullstelle des Nasals, hi/lo: hoher/tiefer Vokal (Eigentonhöhe)
const P={
 'i:':{k:'v',F:[280,2250,2900,3500],d:150,m:80,o:.35,hi:1},
 'I':{k:'v',F:[370,2000,2600,3450],d:72,m:42,o:.4,hi:1},
 // kurze gespannte Vokale in unbetonten Silben (Me|di|cus, A|re|na, Mo|ment): gleiche Klangfarbe wie die langen, nur kürzer
 'i':{k:'v',F:[290,2200,2900,3500],d:78,m:42,o:.35,hi:1},'e':{k:'v',F:[380,2100,2650,3500],d:78,m:42,o:.45},'o':{k:'v',F:[400,780,2400,3400],d:78,m:42,o:.5},
 'u':{k:'v',F:[300,720,2250,3300],d:78,m:42,o:.3,hi:1},'y':{k:'v',F:[290,1750,2150,3350],d:78,m:42,o:.35,hi:1},'2':{k:'v',F:[390,1450,2200,3400],d:80,m:44,o:.45},
 'e:':{k:'v',F:[360,2150,2650,3500],d:150,m:80,o:.45},
 'E':{k:'v',F:[560,1800,2500,3500],d:80,m:45,o:.65},
 'E:':{k:'v',F:[520,1900,2550,3500],d:150,m:80,o:.6},
 'a':{k:'v',F:[700,1350,2500,3500],d:85,m:50,o:1,lo:1},
 'a:':{k:'v',F:[740,1220,2500,3500],d:155,m:85,o:1,lo:1},
 'O':{k:'v',F:[550,950,2450,3400],d:80,m:45,o:.7},
 'o:':{k:'v',F:[380,750,2400,3400],d:150,m:80,o:.5},
 'U':{k:'v',F:[380,1000,2350,3350],d:72,m:42,o:.35,hi:1},
 'u:':{k:'v',F:[290,700,2250,3300],d:145,m:80,o:.3,hi:1},
 'Y':{k:'v',F:[380,1550,2200,3350],d:72,m:42,o:.4,hi:1},
 'y:':{k:'v',F:[280,1750,2150,3350],d:145,m:80,o:.35,hi:1},
 '9':{k:'v',F:[520,1400,2300,3400],d:80,m:45,o:.55},
 '2:':{k:'v',F:[380,1450,2200,3400],d:150,m:80,o:.45},
 '@':{k:'v',F:[480,1500,2450,3450],d:48,m:28,o:.45,sw:1},
 '6':{k:'v',F:[600,1300,2450,3400],d:62,m:38,o:.6,sw:1},
 aI:{k:'d',F:[720,1300,2500,3500],to:[330,2100,2700,3500],d:170,m:100,o:.9},
 aU:{k:'d',F:[720,1250,2450,3400],to:[380,850,2300,3300],d:170,m:100,o:.9},
 OY:{k:'d',F:[520,900,2400,3400],to:[330,1750,2300,3400],d:170,m:100,o:.7},
 m:{k:'n',F:[260,1050,2100,3300],d:72,m:44,o:0,pl:'lab',nz:430},
 n:{k:'n',F:[260,1550,2650,3400],d:58,m:35,o:.25,pl:'alv',nz:480},
 N:{k:'n',F:[260,2050,2750,3400],d:68,m:40,o:.3,pl:'vel',nz:520},
 l:{k:'l',F:[290,1500,2800,3500],d:75,m:45,o:.35,pl:'alv'},
 j:{k:'l',F:[260,2200,3000,3600],d:55,m:30,o:.3,pl:'pal'},
 R:{k:'l',F:[520,1250,2300,3300],d:64,m:40,o:.4,pl:'uvu',fs:'+R',af:.3},
 '6g':{k:'l',F:[580,1300,2450,3400],d:55,m:30,o:.55,pl:'uvu'},
 f:{k:'f',d:95,m:55,o:.2,pl:'lab',fs:'+f',af:.17},
 v:{k:'f',vc:1,d:62,m:38,o:.2,pl:'lab',fs:'+f',af:.07},
 s:{k:'f',d:105,m:60,o:.25,pl:'alv',fs:'+s',af:.24},
 z:{k:'f',vc:1,d:72,m:40,o:.25,pl:'alv',fs:'+s',af:.16},
 S:{k:'f',d:105,m:62,o:.35,pl:'post',fs:'+S',af:.33},
 Z:{k:'f',vc:1,d:75,m:42,o:.35,pl:'post',fs:'+S',af:.26},
 C:{k:'f',d:95,m:58,o:.3,pl:'pal',fs:'+C',af:.3},
 x:{k:'f',d:95,m:58,o:.4,pl:'vel',fs:'+x',af:.4},
 h:{k:'h',d:70,m:42,o:.5,pl:'glot'},
 p:{k:'p',d:82,m:50,o:0,pl:'lab',fs:'+p',ba:.55,bd:.006},
 t:{k:'p',d:68,m:42,o:.2,pl:'alv',fs:'+t',ba:.6,bd:.009},
 k:{k:'p',d:78,m:48,o:.35,pl:'vel',fs:'+k',ba:.9,bd:.02},
 b:{k:'p',vc:1,d:60,m:38,o:0,pl:'lab',fs:'+p',ba:.5,bd:.006},
 d:{k:'p',vc:1,d:52,m:32,o:.2,pl:'alv',fs:'+t',ba:.38,bd:.007},
 g:{k:'p',vc:1,d:60,m:38,o:.35,pl:'vel',fs:'+k',ba:.6,bd:.016},
 '?':{k:'q',d:22,m:14,o:.3,pl:'glot'},
 _:{k:'_',d:0,m:0,o:0}
};
const isVow=p=>{const k=P[p]?.k;return k==='v'||k==='d';};
const isObs=p=>{const k=P[p]?.k;return k==='f'||k==='p';};
const LOC={lab:[250,900,2200,3300],alv:[260,1800,2700,3400],post:[260,1850,2450,3300],pal:[260,2200,2900,3500],uvu:[480,1250,2300,3300]};
// Gaumenlaute k/g haben keinen festen Ort: sie folgen dem Vokal (vor u tief, vor i hoch), F2 und F3 laufen zusammen („Zange“)
function locus(pl,V){if(pl==='vel'){const v=V?V[1]:1500,f2=v<1200?v+250:v<1700?v+300:Math.min(v+250,2500);return [260,f2,clamp(f2+400,2000,3000),3400];}return LOC[pl]||null;}

// Stammwörterbuch (aus den Spieltexten, ohne Endungen und Umlaute): prüft Vorsilben und zerlegt Zusammensetzungen (Totengräber → Toten|gräber)
const STEMTXT=`abend abendessen aber abfangen abgegeben abgelehnt abgemacht abgenommen abrechnen abschied abschluss abschotten absicht abstand abwechslung abzeichen
ach achtung achtzehn adler ahnen ahnlich ahnt aktionen aktiven aktualisiert alanen alle allein allem aller allerdings almosen als also alt amboss
amputationen andenken andere anderer andern anders anderswo andert anfang anfuhlt anfuhrer angeblich angebot angefangen angeguckt angekundigt angelegt
angemeldet angepasst angeschaut angeschlagen angesehen angezundet angreifen angriff angriffstempo angst anklicken anlage anlauf annehmen ans
anschliessend ansieht anspruche anspruchsvoll anstandig ansturm anteil antippen antreten antwort anzahlung apfel apfelhalter apfelmus apfelschuss
appetit applaus arbeit arbeitsplatz arena arenaboden arenakampfe arenasand arenen arger arm armbrust armee armel arschlocher art arzt asche assassine
ast atem atemzug atme auch auf auffallig aufgabe aufgeben aufgegeben aufgehort aufgenommen aufgepasst aufgestellt aufraumen aufschreiben aufstehen
aufstellen aufstellung auftrage auftritt aufwand auge augenhohe aus ausbildung ausdauer ausdauernd ausgang ausgefuhrte ausgeglichen ausgemustert
ausgerechnet ausgeschlossen ausgesprochen ausgesucht ausgezeichnet ausholen ausnahmetalent ausnahmsweise ausprobieren ausrede ausrusten ausrustung
aussehen aussen ausser ausserhalb aussicht aussichtslos aussieht ausverkauft ausweichen automatische axt backer badehaus bahre bald band banner bar
barbier barenfuhrer baron bastard bat bau bauch bauernhof baum beastrium becher bedankt bedeutet bedeutung beeindrucken beeindruckend beende
beerdigung befehl begabt begeistert beginnen beginnt begnadigt begonnen begraben begrabnis begrusst behalt behandeln behandelst behandelt behandle
behandlung behauptet bei beibringen beide beim beine beispiel beissen beisst bekam bekommen bekommst bekommt belegt beleidigt bellt belohnung bemalt
bemerkenswert benehmen beneiden benutzen benutzt beobachten bequem beraten beratung beraube bereit bereuen bereut berg beruf berufserfahrung beruhmt
beschaftigt bescheidenheit bescheuert beschwer beschwerden besen besiegt besitzer besitzt besoffener besonderes besonderheiten besonders besser
bestatter beste bestehen besteht bestellt bester bestiarium bestie bestimmt besuch beten betet betonung betrachten betreten betritt betrunken bett
betteln bettler bettruhe beute beutel bevor bevorzugt bewacht bewaffnet bewegen bewegt bewegung beweisen bewundert bewusstsein bezahle bezahlst
bezahlt bezwungen bier biete bilanz bildhauer billig billigste bin bis bisher bislang bisschen bisse bitte blamiert blank blasebalg blass blatt blau
bleib blick blieb block blod bloss blut blutverlust bock boden bogen bogenhandler bogenschutze bohrt bolzen bonus bord bose boss boxkampfe brandung
brauchbar brauche brauchst braucht braun braver breche breit brennen brennt bricht bring brot bruch brucke bruder brullt brunnen brust brustkorb
brustpanzer buch buchfuhrung buchmacher bunt burger burgermeister butter capua champion chance charakter charon chef chronist cousin crassus dabei
dach dafur dagegen dahin dahinter damals damen damit danach daneben dankbar danke dann daran darauf daraus darf darin darstellung daruber darum
darunter das dasselbe dauerhaft dauerschaden dauert daumen davon davor dazu death deckel deckt deckung dein delle dem den denar denken denkt der
derselbe des deshalb dessen desto deutlich dich dick die dieb dienstag diese dieselbe diesem dieser diesmal ding dir direkt doch doktor dolch doppelt
dorf dorfteich dorftrottel dort dorthin drachen dran drauf draussen dreck dreh drei dreifache dreihundert dreimal dreissig dreizack drin dringend
dritte druben druber druck dumm dummheit dumpfer dunger dunkeln dunkle dunkler dunn durch durchschlag durchschnitt durchstehen durfen durst dutzend
eben echse echt ecke egal ehe eher ehre ehrlich eid eigene eigener eigenschaft eigentlich eigentum eilig eimer ein eindeutig eindruck einfach eingehen
einige einmal einsatz einsatzbereit eintritt einzeln einzige einziger eis eiserne elend elf elite ellbogen empfehlen empfehlung empfiehlt ende
endgultig endlich energie eng entfernt entfernung entgegen entlassen entscheiden entscheidend entscheidest entscheidet entscheidung entschieden
entsteht enttauscht enttauschung entweder entwickelt erben erde erfahren erfahrung erfolg erfolgreiche ergebe ergebnis erhalten erhoht erholt erholung
erinnert erinnerung erkampft erkannt erkenne erkennst erkennt erklaren erklart erklarung erledigen erledigt erlegt ernst erreichen errotet ersatzbank
erscheint erschlagen erschopfung ersetzt erst erstaunlich erwachsene erwachsener erwahnt erwartet erwischen erwischt erwurgen erwurgt erz erzahl esche
esel esse esser essig etwas euch euer eure eurer ewig ewigkeit extra fackeln faden fahigkeiten fahne fahren fahrt fair faktor falb fall falsch familie
familienchronik familienzeit fang farbe fass fasschen fast fauste favorit feder fehlen fehler fehlt feierabend feiern feiert feiglinge feilschen feind
feiner feld fell fels fenster fern fernkampfer fernwaffe fertig fest festhalt fett feuer fieber fiel finde finger fisch flach flanke flasche flecken
fleisch fleischstand fliege fliegt flohe flucht flug flugel fluss folge folgt fordert form formation forster fort fortschritt fortuna frag frau frech
frei freiheit freiwillig fremde fresse freude freuen freund freundliches freundschaft freut friedhof frisch frisst froh front frontal fruh fruheren
fruhstuck fuchs fuhle fuhlt fuhre fuhrmann fuhrt fuhrung funf funfzig funken funktioniert fur furchten fusel fuss futter gab gahnt gaius galgen gang
ganz gar garantie garantiert gartner gaste gebaude gebaut gebe gebiss geblieben geblutet gebogen geboren gebracht gebraucht gebrochen gebt gebundene
gebusch gedacht gedauert geduld geeignete gefahr gefahrliche gefahrlicher gefallen gefallt gefangen gefarbt geflohen gefragt gefressen gefruhstuckt
gefuhl gefuhrt gefunden gefuttert gegangen gegeben gegen gegend gegenstand gegenteil gegessen geglaubt gegner gegnerische geh gehabt gehalten gehangt
geharkt gehartet gehauen geheimnis gehirn geholfen geholt gehoren gehort geist gejagt gekampft gekauft geklappt gekommen gekundigt gekurzt gelacht
geladen gelandet gelassen gelaunt geld geldbeutel geleert gelegenheit gelegentlich gelegt gelernt geliehen geloscht gemacht gemecker gemein gemeinsam
gemeisselt gemeldet gemerkt gemocht gemusehandler genaht genannt genau genauso generation genesung genie genommen genug genutzt geoffnet geplant
gepruft gerade geradeaus gerausch gerber gerechnet gerechtigkeit geredet gereicht gerettet gerissen germanen gern geruch gerufen gesagt geschafft
geschaft geschenk geschichte geschick geschlagen geschlossen geschmack geschnitten geschnitzt geschosse geschrieben geschummelt geschutzt
geschwindigkeit geschworen gesehen gesenkt gesetzt gesicht gesindel gespalten gespannt gespeichert gesperrt gesprochen gestanden gestank gestellt
gestern gestohlen gestoppt gestorben gestromt gesture gesucht gesund gesundheit gesunken getan getanzt getauscht getotet getragen getraumt getrennt
getroffen getrunken geubt gewachsen gewahlt gewalt gewaltige gewaschen geweih geweint gewesen gewettet gewicht gewinn gewischt gewisse gewogen
gewohnheit gewohnlicher gewohnt gewonnen geworden geworfen gewusst gezahlt gezeigt gezielt gezogen gezuchtet gib gilt ging gladiator gladius glanzt
glas glattziehen glaub glaubiger gleich gleichgewicht gleichzeitig glied gliedmassen glocke gluck glucksbringer glucksgriff gluckwunsch gnade gnadig
gold goldenen gott grab grabstein grad gratis gratiswaffen gratuliere grau greifen greift grenzen grenzenlos greyhound griff grinst groll gross
grossere grossmutter grosster grosszugig grube grun grund grundchance gruppe gruss guckt gunstig gurtel gut haar hab hackt hades hafen haha hahaha
hahn haken halb halfte hall hallo hals halt hammer hand handler handschuhe handverlesen handwerk hangen hangt harmlos hart hase hasse hasslich hasst
hast hat hattest hattet hauen haufen hauptmann hauptsache hauptsachlich hauptschmied haus haushalt haut heben hebt heil heim heimweh heiss held helfen
hell hellebarde helm hemd henker her herab heraus herausforderung herausgezogen herde herold herr herstellung herum herumtreiber hervorragend herz
hetzen hetzt heult heute hey hieb hielt hier hierher hihihi hilfe hilft himmel hin hinaus hinein hing hinken hinter hinterhalt hinterher hinterhof
hinterkopf hinterlasst hirn hirnhammer hirsch hirte hoch hochbegabt hochstens hocker hof hoffe hoffentlich hoffnung hofft hofhahn hoflichkeit hohe
hoher hohle hol holz holzfaller holzschwert hor horner hose hubsch hufeisen hufte huhn huhnerstall humpelt hund hundefutter hundert hundsgraf hunger
hungrig hut ich idee idiot ihm ihn ihr immer immerhin imperiums improvisiert indem individuelle inhalt inklusive innen innere ins inseln interessant
interesse interessiert investition inzwischen irgendein irgendwann irgendwas irgendwer irgendwo irre isst ist jagd jager jagt jahr jammert jede jedem
jedenfalls jeder jemand jenseits jetzt jubel juckt jung juwel kader kafig kaiser kalt kam kamerad kameradschaft kammen kampf kampfbeginn kampfbericht
kampfenergie kampferfahrung kampfgeist kampfhahn kampfhund kampftechnik kampfwert kandidaten kaninchen kann kanonenfutter kanten kapital kapitel
kaputt karren kaserne kasse kassiere kassiert katze kauf kaum kehle kehren kehrt keiler kein keller kenne kennst kennt kerl kette kettenhemd keule
kilo kinder kinn kissen kiste klang klappern klappert klappt klar klasse klatschen klebt klein kleineres klick klimpern klimpert klinge klingt klirren
klopf klug klugste knackt knapp knarrt knecht knie knochel knochen knochenbruch knochenzins knuppel koch kochtopf koder kohle kohorte kollegen komm
kompakt konig koniglichen koniglicher konkurrenz konnen konnt kopf korper korperteil korrigiert kosten kostenlos kostet koter kraft kraftiger krahen
kraht krank krankenbett krankenhaus krassus kratzen kratzer krauter kredit kreis kriecht krieg kriegshund kritik krone krug krumm kuhe kunden
kundschaft kupferstucke kurz kurzkampfer kutscher lacheln lachelt lachen lacht laden ladt ladung lag lamm land lang langsam langschwert langsten
langweilig lanista lanister larm lass latrinen lauf laufbahn laufenden laune lause laut leben lebend lebenserwartung lebenslauf leber lebt lebzeiten
leder leer leg legaten legendaren legende legion lehre lehrgeld lehrling leib leiche leicht leid leise leistung leiter lektion lernen lernt lesen
letzte letzter leuchtet leute licht liebe lieber liebling liebsten liebt lied lief liefert liegen liegende liegt lies liga linie linke links lippe
liste loch lockt lockvogel loffel lohn los losgelassen loslassen loswerden lowe lowenhelm lowenmahne lucke ludus luft lugen lugt luxus mach machbar
mag mahlzeit mahnung mal man manche manchmal manner mannes mannschaft mantel manuelle markiert markt marmor mars maske mass material mauer maul
meckert medicus medikus medizin meer mehl mehr mehrere mein meissel meist meisterstuck meisterwerk meldet menge mensch merk messer metall meter
metzger mich mindestens minuten mir mischung missverstandnis mist mistgabel mit miteinander mitgebracht mitgegeben mitgenommen mitleid mittag
mittagessen mittelmass mittelmassiger mochte moge moglich moglichkeiten moment monate moral morgen motivation motiviert mude muhe mull mund munze muss
muster mut mutter mutze nach nachdem nachfolger nachgeholfen nachgesehen nachher nachladen nachmittag nachricht nachruf nachste nachtisch nachts
nachwuchs nacken nadeln nagt nah nahkampf name namlich nannte narbe nase nass natur naturliche nebel neben nehm nein nenne nennst nennt neptun nervos
nett netz neu neugier nicht nie nieder niedergestreckt niederlage niedrig niemals niemand niere nimm noch norden normal notiert nuchtern null nummer
nun nur nutzen nutzlich nutzt oben oberen obst obwohl ochse oder ofen offen offenbar offiziell offnen offnet oft ohne ohnehin ohr onkel operation
operiert opfer optimist ordentlich ordnung ort osten ostia paar packen packt padagogisch panzer papier partnerschaft pass passende passiert patient
pause pech peinlich peitsche perfekt permadeath permanent person personal pfand pfau pfeifen pfeift pfeil pferd pfund pilze plan platten platz pleite
plotzlich plundern poliert portionen positiv potenzial praktisch prallen pramie pranke prazise prazision preis preisgeld priester prima pro probe
probekampfe probiert problem prodigy profil prozent prufe pruft prufung psst publikum puls punkte punktevergabe puppe purpur qualifikation qualitat
quer quittung quote rabatt raben rabies rader rand rang rat rauber rauch raum raus rausgeworfen rauswerfen rechne rechnung recht rechtzeitig rede
reflexe regel regen reibt reich reichweite reihe reihenfolge rein reinigung reise reissen reisst reiter reizend rekord rekrut rennen rennt reserve
respekt rest rex richten richter richtig richtung riech rief riemen riese riesige riesiger ring rippe risiko ritter roh rohstoff rolle rom rosa rot
ruben ruck ruckentreffer ruckgabe ruckgrat rucksprung ruckwarts ruckzug rudel ruf ruhe ruhestand ruhig ruhm ruhrend ruht ruiniert rum run runde runter
russ rustung rute rutenspitze sack sag sah salbe salz sammeln sammelt sammlung samt sand sandalen sanitater sarg sargbauer sass satt sattel satz
sauber sauer saufen saufer sauft say schade schadel schadelbruch schaf schaffen scham scharf schatten schatzen schau scheide scheint scheiss schenk
scherben schick schief schiefgeht schielt schiene schiessen schiesst schiff schild schildflache schinken schlachter schlachtplan schlaf schlag
schlange schlank schlecht schlechtesten schleicht schleifen schleift schliessen schliesslich schliesst schlimm schlimmere schlimmste schloss schluck
schluss schlussel schmeckt schmelztiegel schmerz schmied schmiedelehre schnabel schnaps schnauze schnee schneide schnell schnitt schnittwunde schnur
schon schrank schrei schreib schriftlich schritt schuchtern schuhe schuld schuldner schuldschein schule schuler schulter schuppen schurze schuss
schusswert schuttelt schutz schwach schwanz schwarz schweigt schwein schweiss schwer schwertarm schwerter schwester schwiegermutter schwitzen schwore
schwung sechs sechzig seele segel segen seh sehr sei seid seine seinem seiner seins seitdem seitlich sekunden selber selbst selten senator senkt
sesterzen setz seufzt sich sicherheit sichtbar sie sieben siebzig sieg sieh sind singen singt sinn sitzen sitzt skandiert sklave sklavenhandler
sklavenmarkt sobald sockel soeben sofort sogar sohn solange solche sold soldat soldner solide soll solltest sonderangebot sonderattacke sondern sonne
sonntagsbraten sonst sorge sorgt sorte sowieso spaher spalt spannen spannt spannung spar spass spat speer speicher spektakel spendet sperren spiel
spielstand spieltag spiesst spione spitz sporen sprechen spricht springt sprung spur stabil stacheln stadt stahl stall stammkundschaft stand starb
stark starkere starkste startet statt statthalter statue staub stechen stecken steckt steh steigen steigt stein stell sterbe steuer stich
stichverletzung stiefel stier stierhorner still stillhalten stimme stimmt stinkenden stinkt stirbt stirn stock stoff stolpert stolz stort stoss
strasse strategie streicht streit streitkolben streuner strick stroh strohpuppe stuck stufe stuhl stumper stumpf stunden stur sturz such supertalent
suppe tag takt taktik talent talentiert tanz tapfer tasche tatsachlich taub taugen taugt taumeln tausend taverne team technik tee teil teilweise
tempel termin testament testversion teuer teufel teure teurer the theoretisch theory tief tier tierfanger tierhandler tierpfleger tippe tisch titanen
titel titus tja tobt tod todlicher ton topf tor tot totengraber totenkopfe traf trage trager tragt trainer trainier training trainingshof tranen
transport trauerfeier traurig traut treffe treffer trefferbonus trefferchance treiben treiber treibt trennen treu tribune trifft trinke trinkt tritt
triumph trocken trog tropft trottel trotzdem truhe trummerbruch truppe tun tupfen tur turnier turrahmen tut typ ubel uben uber uberall uberblick
uberfahrt uberfall uberhaupt uberlasst uberleben uberlebenden uberlebt uberlegt ubermacht ubernehmen ubernimmt ubernommen uberraschend uberrascht
uberschatzt uberstanden uberstunden uberzeugung ubrig ubt ubung uff umarmt umfallen umfallt umgebracht umgeworfen umhang umland umriss umsatz
umschmieden umsonst unbesiegbar unbewaffnet unbezahlbar und unersetzlich unfair ungefahr ungern unheimliche unpraktisch unruhig uns unsere unserer
unsterblich unten unter unterarm unterbrochen unterricht unterschatz unterscheidet unterschenkel unterschied unterschrift unterwegs untrostlich
unversehrt urlaub urne urteil valeria vater verandert veranstalter veranstaltung verantwortung verband verbergen verbessern verbessert verbindet
verblutet verbraucht verdammt verdienen verdient verfolge verfolgt verfugbar vergangen vergeben vergessen vergiss vergnugen verhandelt verheilt
verhindern verhungert verkauf verkurzt verlangen verlangst verlangt verlassen verlasst verletzt verletzung verliehen verlieren verlierer verlierst
verliert verloren verlust vermisse vermisst vermogen vermuten vermutlich verneigt vernunftig verordnet verpflegung verprugelt verrate verringert
versager verschenkt verschiedene verschlafen verschwendung verschwinden verschwindet verschwunden versehen verspielt versprechen verspricht
versprochen verstand verstecken versteckt verstehen verstehst versteht verstummelt versuch verteilt vertrag vertreten vertrieben verzeiht veteran
vetter vetus via vieh viel vielleicht vier viertel vierzig villa vogel volk voll vollidioten vollstandig vom von vor voraus vorbei vorbereitet
vorbesitzer vorerst vorfuhrung vorganger vorgesehen vorgestellt vorhaben vorhanden vorher vorhin vorne vorrate vorrunde vorschau vorsicht
vorsichtshalber vorsorglich vorspeise vorstellung vorwarts wach wachhund wachsen wackelt wade waffe wagen wahl wahlerisch wahr wahrheit wahrscheinlich
wald wand wann wappen war warm warnung warter wartet warum was wasche wascherin wascht wasser wechselt weder weg wegesrand weglaufen wegzoll weh
wehren wehrt wehtun wehtut weibern weich weil wein weise weiss weit weitere weitergehen weiterkampfen weitermachen welche welchem welcher welpen welt
wem wen wenige weniger wenigstens wer werde werfen werk werkstatt werkstuck wertvoller wettburo wette wetter wettschein wichser wichtig wichtigste
widersprechen widerspricht wie wieder wiederholung wiedersehen wiegt wild wilderer wildhuter will willkommen wind windhund winken winkt winter wir
wird wirft wirken wirklich wirkt wirkung wissen wisst witwe woanders woche wochenlang wofur woher wohin wohl wohnt wolf wollen wollt woran worden wort
wozu wucht wunde wunder wunderbar wunsch wurde wurf wurfaxte wurfel wurst wurzeln wusste wuste wut zah zahl zahne zahnlose zange zaun zehen zehn
zehntausend zeichen zeig zeile zeit zentimeter zerfleischt zerlegt zerrissen zerrt ziegen zieh ziel zielscheibe ziemlich zinsen zittere zittern
zittert zorn zuckt zuerst zufallig zufrieden zugabe zugenaht zugeschlagen zuhause zukunft zuletzt zum zumindest zunge zur zuruck zuruckgegeben
zuruckgekommen zuruckkommt zusammen zusatzliche zuschauer zuschlag zusehen zuverlassig zuversicht zuvor zwanzig zwar zweck zwei zweifelhafte zweige
zweihander zweihundert zweimal zwinger zwischen zwolf`;
// ---------- Text → Aussprache ----------
const ONES=['null','eins','zwei','drei','vier','fünf','sechs','sieben','acht','neun','zehn','elf','zwölf','dreizehn','vierzehn','fünfzehn','sechzehn','siebzehn','achtzehn','neunzehn'];
const TENS=['','','zwanzig','dreißig','vierzig','fünfzig','sechzig','siebzig','achtzig','neunzig'];
function numWord(n){if(n<20)return ONES[n];if(n<100){const o=n%10,t=Math.floor(n/10);return (o?(o===1?'ein':ONES[o])+'und':'')+TENS[t];}if(n<1000){const h=Math.floor(n/100),r=n%100;return (h===1?'ein':ONES[h])+'hundert'+(r?numWord(r):'');}if(n<1e6){const k=Math.floor(n/1000),r=n%1000;return (k===1?'ein':numWord(k))+'tausend'+(r?numWord(r):'');}return String(n).split('').map(d=>ONES[+d]).join(' ');}
const VL='aeiouäöüy',isV=c=>!!c&&VL.includes(c);
// Funktionswörter: kein Satzakzent, kurz und schwach
const FUNC=new Set(('der die das des dem den ein eine einen einem einer eines ich du er sie es wir ihr mich dich sich uns euch mir dir ihm ihn ihnen '+
 'sein seine seinen seinem seiner seines mein meine meinen meinem meiner dein deine deinen deinem deiner unser unsere euer eure man '+
 'und oder aber denn sondern dass daß ob wenn als wie weil da so zu zum zur im in ins an am ans auf aus bei beim mit nach von vom vor für um über unter durch gegen ohne bis seit '+
 'ist bin bist sind seid war warst waren wäre hat habe hast haben hatte hatten wird werden wirst wurde würde kann kannst können muss musst müssen soll sollst sollen will willst wollen darf mag '+
 'ja schon noch auch nur mal doch denn eben halt wer wen wem was wo wann wie welche welcher welches welchen').split(' '));
const WH=new Set('wer wen wem wessen was wo wohin woher wann warum wieso weshalb wie welche welcher welches welchen womit worauf worum wozu'.split(' '));
const WEAK={der:'d E 6g',den:'d @ n',dem:'d @ m',des:'d @ s',er:'? E 6g',ihr:'? I 6g',mir:'m I 6g',dir:'d I 6g',zu:'t s U',zur:'t s 6'};
const LONGFN=new Set('den dem wen wem ihn ihm ihr schon nun wo so da du zu ja wie die sie wir mir dir der er wer vor für zur nur her'.split(' '));
const CONJ=new Set('und aber oder denn weil dass sondern wenn als obwohl damit bevor nachdem während'.split(' '));
// Wörterbuch: Zahl = betonte Silbe (Regeln für die Laute), Text = Lautschrift mit ' vor dem betonten Vokal
const LEX={
 arena:1,gladiator:2,gladiatoren:3,moderator:2,medicus:0,medikus:0,latein:1,lateinisch:1,soldat:1,soldaten:1,legion:1,legionen:2,
 museum:1,augustus:1,imperator:2,senator:1,senat:1,apparat:2,mathematik:3,physik:1,lanista:1,tribun:1,centurio:1,spektakel:1,theater:1,
 kanone:1,november:1,oktober:1,dezember:1,april:1,hallo:1,idiot:2,idioten:2,barbar:1,barbaren:1,tyrann:1,triumph:1,kadaver:1,metall:1,kristall:1,
 granate:1,zurück:1,vorbei:1,hinaus:1,heraus:1,herein:1,hinein:1,herab:1,hinauf:1,herauf:1,herunter:1,voran:1,davon:1,dafür:1,damit:1,dabei:1,darum:1,
 daran:1,darauf:1,daraus:1,dagegen:1,warum:1,wieso:1,weshalb:1,woher:1,wohin:1,worauf:1,womit:1,vielleicht:1,allein:1,lebendig:1,zusammen:1,zuerst:1,zuletzt:1,
 zunächst:1,sofort:1,bisher:1,jedoch:1,obwohl:1,natürlich:1,unglaublich:1,normal:1,general:2,generäle:2,salat:1,armee:1,trophäe:1,
 rekrut:"R e: k R 'u: t",rekruten:"R e: k R 'u: t @ n",kuchen:"k 'u: x @ n",kolosseum:"k o: l O 's e: U m",orontes:"? o: 'R O n t e: s",familie:"f a m 'i: l j @",bestie:"b 'E s t j @",bestien:"b 'E s t j @ n",rabies:"R 'a: b i: E s",
 hund:"h 'U n t",jetzt:"j 'E t s t",nach:"n 'a: x",buch:"b 'u: x",hoch:"h 'o: x",fluch:"f l 'u: x",besuch:"b @ z 'u: x",sprach:"S p R 'a: x",brach:"b R 'a: x",
 stach:"S t 'a: x",erde:"? 'e: 6g d @",pferd:"p f 'e: 6g t",schwert:"S v 'e: 6g t",schwerter:"S v 'e: 6g t 6",schwertes:"S v 'e: 6g t @ s",
 mond:"m 'o: n t",wüste:"v 'y: s t @",düster:"d 'y: s t 6",kloster:"k l 'o: s t 6",er:"? 'e: 6g",der:"d 'e: 6g",wer:"v 'e: 6g",
 tod:"t 'o: t",gnade:"g n 'a: d @",ehre:"? 'e: R @",ruhm:"R 'u: m",weg:"v 'e: k",zwerg:"t s v 'E 6g k",
 pluto:"p l 'u: t o:",krassus:"k R 'a s U s",knochenzins:"k n 'O x @ n t s I n s",hundsgraf:"h 'U n t s g R a: f",pfeilkopf:"p f 'aI l k O p f",
 nein:"n 'aI n",stirb:"S t 'I 6g p",hilfe:"h 'I l f @",angriff:"? 'a n g R I f",rom:"R 'o: m",roms:"R 'o: m s",
 bürger:"b 'Y 6g g 6",ich:"? 'I C",mich:"m 'I C",dich:"d 'I C",sich:"z 'I C",nicht:"n 'I C t",nichts:"n 'I C t s",
 das:"d 'a s",was:"v 'a s",es:"? 'E s",des:"d 'E s",bis:"b 'I s",hin:"h 'I n",in:"? 'I n",im:"? 'I m",mit:"m 'I t",ob:"? 'O p",ab:"? 'a p",an:"? 'a n",
 am:"? 'a m",man:"m 'a n",von:"f 'O n",vom:"f 'O m",um:"? 'U m",zum:"t s 'U m",und:"? 'U n t",uns:"? 'U n s",hat:"h 'a t",bin:"b 'I n",
 ist:"? 'I s t",sind:"z 'I n t",kann:"k 'a n",muss:"m 'U s",will:"v 'I l",wird:"v 'I 6g t",doch:"d 'O x",noch:"n 'O x",auch:"? 'aU x",
 heute:"h 'OY t @",weil:"v 'aI l",
 // Ergänzungen (Prüfung der Spieltexte, 11.11.2026): Wörter, bei denen die Regeln danebenliegen
 geeignet:"g @ ? 'aI g n @ t",geeignete:"g @ ? 'aI g n @ t @",geeigneten:"g @ ? 'aI g n @ t @ n",geübt:"g @ ? 'y: p t",überlegt:"? y: b 6 l 'e: k t",überall:"? y: b 6 ? 'a l",
 interesse:2,interessant:3,kamerad:"k a m @ R 'a: t",chance:"S 'a n s @",chancen:"S 'a n s @ n",kollegen:"k O 'l e: g @ n",kollege:"k O 'l e: g @",
 minute:1,minuten:1,zentimeter:2,appetit:"? a p e 't i: t",favorit:"f a v o 'R i: t",kapital:2,kapitel:1,termin:1,termine:1,termin:1,
 denar:1,denare:1,denaren:1,geradeaus:"g @ R a: d @ ? 'aU s",amboss:"? 'a m b O s",
 veteran:"v e t e R 'a: n",veteranen:"v e t e R 'a: n @ n",patient:"p a t s 'j E n t",patienten:"p a t s 'j E n t @ n",senatoren:2,
 etwas:"? 'E t v a s",gerade:"g @ 'R a: d @",gern:"g 'E 6g n",gerne:"g 'E 6g n @",gegner:"g 'e: g n 6",gegnern:"g 'e: g n 6 n",gegners:"g 'e: g n 6 s",
 gehört:"g @ h '2: 6g t",hört:"h '2: 6g t",hören:"h '2: R @ n",höre:"h '2: R @",gehören:"g @ h '2: R @ n",stört:"S t '2: 6g t",zerstört:"t s E 6g S t '2: 6g t",
 publikum:"p 'u: b l i k U m",team:"t 'i: m",trainer:"t R 'E: n 6",training:"t R 'E: n I N",legende:"l e 'g E n d @",legenden:"l e 'g E n d @ n",
 persönlich:"p E 6g 'z 2: n l I C",möglich:"m '2: k l I C",unmöglich:"? U n m '2: k l I C",erklärt:"? E 6g k l 'E: 6g t",willkommen:"v I l k 'O m @ n",
 überleben:"? y: b 6 l 'e: b @ n",überlebt:"? y: b 6 l 'e: p t",überlebe:"? y: b 6 l 'e: b @",überlebst:"? y: b 6 l 'e: p s t",überlebte:"? y: b 6 l 'e: p t @",überlebten:"? y: b 6 l 'e: p t @ n",
 danach:"d a n 'a: x",dazu:"d a t s 'u:",davor:"d a f 'o: 6g",daher:"d a h 'e: 6g",dahin:"d a h 'I n",darin:"d a R 'I n",darüber:"d a R 'y: b 6",darunter:"d a R 'U n t 6",dazwischen:"d a t s v 'I S @ n",daneben:"d a n 'e: b @ n",
 nächste:"n 'E: C s t @",nächsten:"n 'E: C s t @ n",nächster:"n 'E: C s t 6",nächstes:"n 'E: C s t @ s",nächstem:"n 'E: C s t @ m",höchste:"h '2: C s t @",höchsten:"h '2: C s t @ n",höchster:"h '2: C s t 6",
};
// eigenes Wörterbuch aus dem Stimmlabor (Wort → Lautschrift/Betonungszahl, localStorage „mg-stimme-lex-v1“)
const USERLEX=Object.create(null),ULKEY='mg-stimme-lex-v1';
(()=>{try{const t=typeof localStorage!=='undefined'&&localStorage.getItem(ULKEY);if(t){const o=JSON.parse(t);for(const k of Object.keys(o))if(typeof o[k]==='string'||typeof o[k]==='number')USERLEX[k.toLowerCase()]=o[k];}}catch{}})();
const UNPRE=['zer','ver','ent','emp','be','ge','er'];
const UNPH={zer:'t s E 6g',ver:'f E 6g',ent:'? E n t',emp:'? E m p',be:'b @',ge:'g @',er:'? E 6g'};
const NOPRE=['ander','unser','gegen','gegner','gestern','geld','gelb','gern','gerade','gest','bestie','beste','bester','besten','bestes','besen','berg','bett','bete','beil','beide','beere','erde','ernst','erst','erbe','ernte','ente','enkel','entlang','gerste','geier','geist','gehen','geht','geben','gebe','gibt','abend','abenteuer','zerren'];
const SEP={zurück:1,vorbei:1,voraus:1,heraus:1,hinaus:1,herein:1,hinein:1,herab:1,hinab:1,herauf:1,hinauf:1,herunter:1,hinunter:1,zusammen:1,wieder:0,unter:0,über:0,durch:0,nach:0,fort:0,weg:0,vor:0,auf:0,aus:0,bei:0,ein:0,mit:0,los:0,ab:0,an:0,um:0,zu:0,un:0,her:0,hin:0};
const SEPPH={zurück:"t s U R 'Y k",vorbei:"f o: 6g b 'aI",voraus:"f o: R 'aU s",heraus:"h E R 'aU s",hinaus:"h I n 'aU s",herein:"h E R 'aI n",hinein:"h I n 'aI n",herab:"h E R 'a p",hinab:"h I n 'a p",
 herauf:"h E R 'aU f",hinauf:"h I n 'aU f",herunter:"h E R 'U n t 6",hinunter:"h I n 'U n t 6",zusammen:"t s U z 'a m @ n",wieder:"v 'i: d 6",unter:"? 'U n t 6",über:"? 'y: b 6",durch:"d 'U 6g C",
 nach:"n 'a: x",fort:"f 'O 6g t",weg:"v 'E k",vor:"f 'o: 6g",auf:"? 'aU f",aus:"? 'aU s",bei:"b 'aI",ein:"? 'aI n",mit:"m 'I t",los:"l 'o: s",ab:"? 'a p",an:"? 'a n",um:"? 'U m",zu:"t s 'u:",un:"? 'U n",her:"h 'e: 6g",hin:"h 'I n"};
const ONSET=new Set(['p l','p R','b l','b R','t R','d R','k l','k R','k v','k n','g l','g R','g n','f l','f R','S p','S t','S l','S m','S n','S v','S R','t s','t s v','p f','p f l','p f R','S p R','S t R','S p l','t S','v R','g j','l j','m j','n j','R j','b j','k j','t s j','z j']);
const legalLetters=r=>/^(sch[lmnrw]?|spr|str|sp|st|pfl|pfr|pf|[bpgkf][lr]|tr|dr|kn|gn|qu|zw|[bcdfghjklmnpqrstvwz])/.test(r)&&!/^(ng|nk|ck|chs)/.test(r);
function parseLex(s){const ph=[];let st=-1;for(const tok of s.split(' ')){if(tok.startsWith("'")){ph.push(tok.slice(1));st=ph.length-1;}else ph.push(tok);}return {ph,stressPh:st};}
function lastVowel(o){for(let k=o.length-1;k>=0;k--)if(isVow(o[k]))return o[k];return '';}
// Kernregeln für ein Wort ohne Vorsilben
function core(w,fn,lat){
 const o=[],n=w.length;let i=0;const nVg=(w.match(/[aeiouäöüy]+/g)||[]).length;
 while(i<n){const r=w.slice(i),c=w[i];
  if(i===0&&isV(c))o.push('?');
  if(i===0&&/^s[pt]/.test(r)){o.push('S',r[1]);i+=2;continue;}
  if(i>0&&/^tion/.test(r)){o.push('t','s','j','o:','n');i+=4;continue;}
  if(i>0&&/^ion(en|s)?$/.test(r)&&!isV(w[i-1])){o.push('j','o:','n');i+=3;continue;}// Legion, Region, Million (nicht Spione)
  if(i>0&&/^ig(?![aeiouäöüy])/.test(r)){o.push('I','C');i+=2;continue;}
  if(r.startsWith('tsch')){o.push('t','S');i+=4;continue;}
  if(r.startsWith('sch')){o.push('S');i+=3;continue;}
  if(r.startsWith('chs')&&i===2&&/^(nä|hö)/.test(w)){o.push('C');i+=2;continue;}// nächste, höchste: ich-Laut + s
  if(r.startsWith('chs')){o.push('k','s');i+=3;continue;}
  if(r.startsWith('ch')){if(i===0){o.push('k');i+=2;continue;}const pv=lastVowel(o),prevL=w[i-1];o.push(isV(prevL)&&['a','a:','O','o','o:','U','u','u:','aU'].includes(pv)?'x':'C');i+=2;continue;}
  if(r.startsWith('ck')){o.push('k');i+=2;continue;}
  if(r.startsWith('ph')){o.push('f');i+=2;continue;}
  if(r.startsWith('th')){o.push('t');i+=2;continue;}
  if(r.startsWith('dt')){o.push('t');i+=2;continue;}
  if(r.startsWith('qu')){o.push('k','v');i+=2;continue;}
  if(r.startsWith('ng')){o.push('N');i+=2;continue;}
  if(r.startsWith('nk')){o.push('N','k');i+=2;continue;}
  if(r.startsWith('pf')){o.push('p','f');i+=2;continue;}
  if(r.startsWith('tz')){o.push('t','s');i+=2;continue;}
  if(/^(ei|ai|ey|ay)/.test(r)){o.push('aI');i+=2;if(w[i]==='h'&&!isV(w[i+1]))i++;continue;}
  if(r.startsWith('ie')){o.push('i:');i+=2;if(w[i]==='h')i++;continue;}
  if(/^(eu|äu)/.test(r)){o.push('OY');i+=2;continue;}
  if(r.startsWith('au')){o.push('aU');i+=2;continue;}
  if(isV(c)){
   const tail=w.slice(i),hasV=o.some(isVow);
   if(c==='e'&&hasV){
    if(/^er[ns]?$/.test(tail)){o.push('6');if(tail.length>2)o.push(tail[2]);i=n;continue;}
    if(/^(e|en|em|es|el|eln|elt|et|est|ens|end|ende|enden|ender)$/.test(tail)||/^(er|el)(e|en|er|es|em|ung|ungen|ig|ige|igen)$/.test(tail)||/^en(e|en|er|es|em)$/.test(tail)){o.push('@');i++;continue;}}
   let long=false,len=1,soft=false;const a=w[i+1],b=w[i+2];
   if(a===c&&'aeo'.includes(c)){long=true;len=2;}
   else if(a==='h'){long=true;len=2;}
   else if(a==='ß')long=true;
   else{let j=i+1;while(j<n&&!isV(w[j]))j++;const cons=w.slice(i+1,j);
    if(j<n){if(cons.length===1&&!'xz'.includes(cons)){long=true;soft=true;}}
    else if(!cons.length){long=true;soft=true;}
    else if(/^[bg]s?t$/.test(cons)&&nVg<=2){long=true;soft=true;}// sagt, fragt, trägt, lebt, lebst, gibt: Wortstamm endet auf b/g, der Vokal bleibt lang
    else if(cons.length===1&&!'xz'.includes(cons)){
     if(nVg===1)long=!fn||cons==='r';
     else{// letzte Silbe eines Kompositums nach einer Mitlautgruppe (Toll|wut, Hunds|graf, Re|krut)
      let q=i-1,cl='';while(q>=0&&!isV(w[q])){cl=w[q]+cl;q--;}if(cl.length>=2&&!/^(.)\1$/.test(cl))long=true;}}}
   const map={a:long?'a:':'a',e:long?'e:':'E',i:long?'i:':'I',o:long?'o:':'O',u:long?'u:':'U',ä:long?'E:':'E',ö:long?'2:':'9',ü:long?'y:':'Y',y:long?'y:':'Y'};
   o.push(map[c]);if(long&&soft)(o.soft||(o.soft=[])).push(o.length-1);i+=len;continue;}
  const dbl=w[i+1]===c;let p=null;
  switch(c){
   case 'b':case 'd':case 'g':case 'p':case 't':case 'k':case 'f':case 'l':case 'm':case 'n':p=c;break;
   case 'v':p=lat||isV(w[i-1])&&isV(w[i+1])?'v':'f';break;
   case 'w':p='v';break;case 'j':p='j';break;
   case 'h':p=isV(w[i+1])?'h':null;break;
   case 'r':p=isV(w[i+1])||(dbl&&isV(w[i+2]))?'R':(isVow(o[o.length-1])?'6g':'R');break;
   case 's':p=isV(w[i+1])&&(i===0||isV(w[i-1])||'lnmrh'.includes(w[i-1]))?'z':'s';break;
   case 'ß':p='s';break;
   case 'z':o.push('t');p='s';break;
   case 'x':o.push('k');p='s';break;
   case 'c':if('eiäy'.includes(w[i+1])){o.push('t');p='s';}else p='k';break;
  }
  if(p)o.push(p);i+=dbl?2:1;}
 return o;}
// Silben: Grenzen nach dem längsten erlaubten Silbenanlaut
function syllabify(ph){const nucs=[];ph.forEach((p,i)=>{if(isVow(p))nucs.push(i);});if(!nucs.length)return [{a:0,b:ph.length,nuc:-1}];
 const st=[0];for(let k=1;k<nucs.length;k++){const a=nucs[k-1]+1,b=nucs[k],cl=ph.slice(a,b);let on=0;
  for(let L=Math.min(3,cl.length);L>=1;L--){const sg=cl.slice(cl.length-L);if(L===1?!['N','6g'].includes(sg[0]):ONSET.has(sg.join(' '))){on=L;break;}}
  if(cl.includes('?'))on=cl.length-cl.lastIndexOf('?');st.push(b-on);}
 return nucs.map((nuc,k)=>({a:st[k],b:k+1<nucs.length?st[k+1]:ph.length,nuc}));}
const SUFF=[[/(ei)(en)?$/,2],[/(io)n(en)?$/,2,/tion(en)?$/],[/(ie)r(e|en|er|es|t|st|te|ten|ung|ungen)?$/,2],[/t(io)n(en)?$/,2],[/it(ä)t(en)?$/,2],[/(u)r(en)?$/,2],[/(i)st(en|in)?$/,2],[/(i)smus$/,2],
 [/(a)nt(en|in)?$/,2],[/(e)nt(en|in)?$/,2],[/(e)ll(e|en|er|es)?$/,2],[/(a)de(n)?$/,3],[/(e)tte(n)?$/,2],[/(eu)r(e|en)?$/,2],[/(ö)s(e|en|er|es)?$/,2],[/(a)tor$/,3],[/at(o)ren$/,3],
 [/(ie)$/,2,/(ilie|inie|arie|knie)$/],[/(a)l(e|en|es)?$/,2,/(sal|tal|mal|ale)$/],[/(a)t(en)?$/,2,/(monat|monaten|heimat|vorrat|unrat|zierat|rat|raten|heirat)$/],
 [/(i)k$/,2,/(chnik|ktik|ogik|anik|onik|inik|amik|atik|ntik)$/],[/(i)v(e|en|er|es)?$/,2]];
const vgroups=s=>(s.match(/[aeiouäöüy]+/g)||[]).length;
// Wort → {ph, syls, stress}
const g2pCache=new Map();
function g2p(word,opt={}){const key=word+'|'+(opt.cap?1:0);if(g2pCache.has(key))return g2pCache.get(key);const w=word.toLowerCase(),fn=FUNC.has(w);
 const R=wordPh(w,fn,opt,0);g2pCache.set(key,R);return R;}
// Ein Wort: Benutzer-Wörterbuch, Wörterbuch, trennbare Vorsilbe als ganzes Wort, Zusammensetzung, sonst Regeln
function wordPh(w,fn,opt,depth){
 const lx=USERLEX[w]??LEX[w];let R;
 const fromLex=s=>{const {ph,stressPh}=parseLex(s);const sy=syllabify(ph);return {ph,syls:sy,stress:Math.max(0,sy.findIndex(s2=>stressPh>=s2.a&&stressPh<s2.b))};};
 if(typeof lx==='string')R=fromLex(lx);
 else if(SEPPH[w]!==undefined)R=fromLex(SEPPH[w]);
 else{const sp=lx===undefined&&!fn&&depth<3&&w.length>=7?splitCompound(w,depth):null;
  R=sp?buildCompound(sp,opt,depth):build(w,fn,true,opt);
  if(typeof lx==='number')R.stress=Math.min(lx,R.syls.length-1);
  shorten(R,w);}
 return R;}
// ---------- Zusammensetzungen (Totengräber → Toten|gräber, Armbrust → Arm|brust) ----------
let STEMS=null;
const nz=w=>w.replace(/ä/g,'a').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ß/g,'ss');
const ENDS=['ungen','ung','ern','ens','end','est','ten','en','er','es','em','te','et','st','e','n','s','t'];
// Ist x ein Wortstamm (mit Endung oder Fugenelement) aus den Spieltexten?
function isStem(x){if(!STEMS)STEMS=new Set(STEMTXT.split(/\s+/));x=nz(x);if(x.length<3)return false;if(STEMS.has(x))return true;for(const e of ENDS)if(x.length-e.length>=3&&x.endsWith(e)&&STEMS.has(x.slice(0,-e.length)))return true;return false;}
// Vorsilben und Funktionswörter bilden keine Zusammensetzung (die Vorsilben haben ihre eigene Regel)
const BADPART=new Set('ende enden ender endes endem chen lein lich ung heit keit ein aus bei vor nach zur zum der die das und mit von den dem ich du er sie es wir ihr ist hat war auf ab an um zu her hin los weg fort unter über durch hinter wieder voll wider gegen allein neben mehr sehr viel alle eine einer eines einem einen sein seine'.split(' '));
const isStemP=x=>isStem(x)||UNPRE.some(p=>x.startsWith(p)&&x.length-p.length>=3&&isStem(x.slice(p.length)));// auch an|ge|bot
const badBase=x=>{x=nz(x);if(BADPART.has(x))return true;for(const e of ENDS)if(x.length-e.length>=2&&x.endsWith(e)&&BADPART.has(x.slice(0,-e.length)))return true;return false;};
function splitCompound(w,depth=0){let best=null,bs=0;
 for(let i=4;i<=w.length-4;i++){const A=w.slice(0,i),B=w.slice(i);if(badBase(A)||badBase(B))continue;
  const okA=isStem(A),okB=isStem(B);
  if(!(okA||(depth<2&&A.length>=7&&splitCompound(A,depth+1))))continue;
  if(!(okB||(depth<2&&B.length>=7&&splitCompound(B,depth+1))))continue;
  const sc=Math.min(A.length,B.length)+(okA?.3:0)+(okB?.3:0);if(sc>bs){bs=sc;best={A,B};}}
 return best;}
function buildCompound(sp,opt,depth){const a=wordPh(sp.A,false,opt,depth+1),b=wordPh(sp.B,false,opt,depth+1);
 const bp=b.ph.slice();if(a.ph.length&&bp.length&&a.ph[a.ph.length-1]===bp[0]&&isObs(bp[0]))bp.shift();
 const ph=[...a.ph,...bp],syls=syllabify(ph),nuc=a.syls[a.stress]?.nuc??0;
 return {ph,syls,stress:Math.max(0,syls.findIndex(s=>s.nuc===nuc))};}
function build(w,fn,allowUn,opt){
 // trennbare/betonte Vorsilbe
 if(allowUn)for(const p of Object.keys(SEP).sort((a,b)=>b.length-a.length)){if(!w.startsWith(p)||w.length<p.length+3)continue;const rest=w.slice(p.length);if(!vgroups(rest))continue;
  if(isV(rest[0])?rest.length<4:!legalLetters(rest)||/^(.)\1/.test(rest))continue;if(NOPRE.some(x=>w.startsWith(x)))break;
  if(!(isStemP(rest)||rest.length>=5))continue;// hin|ten, un|sere, bei|nen sind keine Vorsilben
  const A=parseLex(SEPPH[p]),B=build(rest,false,true,opt),ph=[...A.ph,...B.ph],syls=syllabify(ph);const preS=syllabify(A.ph).findIndex(s=>A.stressPh>=s.a&&A.stressPh<s.b);
  return {ph,syls,stress:SEP[p]?preS:0};}
 if(allowUn&&!NOPRE.some(x=>w.startsWith(x)))for(const p of UNPRE){if(!w.startsWith(p)||w.length<p.length+3)continue;const rest=w.slice(p.length);if(!vgroups(rest))continue;
  if(isV(rest[0])){if(p==='be'||p==='ge'||rest.length<4)continue;}else if(!legalLetters(rest)||/^(.)\1/.test(rest))continue;
  const A=UNPH[p].split(' '),B=build(rest,false,false,opt),ph=[...A,...B.ph],syls=syllabify(ph),nA=syllabify(A).length;return {ph,syls,stress:Math.min(syls.length-1,nA+B.stress)};}
 // lateinische Namen (Varro, Valerius, Silvanus): v = w
 const lat=!!opt.cap&&/(us|um|ius|ia|o|ex|ax|ix)$/.test(w);
 const ph=core(w,fn,lat);
 // Auslautverhärtung: b d g v z vor Wortende oder Geräuschlaut
 for(let k=0;k<ph.length;k++){const h={b:'p',d:'t',g:'k',v:'f',z:'s',Z:'S'}[ph[k]];if(h&&(k===ph.length-1||isObs(ph[k+1])))ph[k]=h;}
 const syls=syllabify(ph);let stress=0;const n=syls.length;
 if(n>1){for(const [re,minS,ex] of SUFF){const m=re.exec(w);if(!m||n<minS||(ex&&ex.test(w)))continue;const tail=w.slice(m.index+m[0].indexOf(m[1])+m[1].length);stress=clamp(n-1-vgroups(tail),0,n-1);break;}
  if(!stress&&opt.cap&&n>=3&&/(us|um|es)$/.test(w)){const pen=syls[n-2],vg=[...w.matchAll(/[aeiouäöüy]/g)],pv=vg[vg.length-2];
   // schwer = geschlossene Silbe; Doppelmitlaut zählt (Mar|cel|lus), auch wenn er als ein Laut gesprochen wird
   const heavy=pen.b-pen.nuc>1||P[ph[pen.nuc]]?.k==='d'||(pv&&/^[^aeiouäöüy]{2}/.test(w.slice(pv.index+1)));stress=heavy?n-2:n-3;}}
 // betonte offene Endsilbe: Vokal lang (Sa|lat, Na|tur)
 if(stress===n-1&&n>1){const s=syls[stress],v=ph[s.nuc];if(s.b-s.nuc<=2&&{a:'a:',E:'e:',I:'i:',O:'o:',U:'u:',Y:'y:','9':'2:'}[v])ph[s.nuc]={a:'a:',E:'e:',I:'i:',O:'o:',U:'u:',Y:'y:','9':'2:'}[v];}
 return {ph,syls,stress,soft:ph.soft};}
// Unbetonte Silben sind kurz: „offene Silbe = lang“ gilt nur unter Betonung (Ge|la|di|a|tor, A|re|na, Me|di|cus). Erst nach der endgültigen Betonung anwenden.
const SHORTV={'a:':'a','e:':'e','i:':'i','o:':'o','u:':'u','y:':'y','2:':'2','E:':'E'};
function shorten(R,w){if(R.soft&&R.syls.length>1){const lang=(w||'').length>=9;// lange, nicht zerlegte Wörter sind meist Zusammensetzungen: nach der Betonung bleibt der Vokal lang (Mist|gabel)
 for(const k of R.soft){const sy=R.syls.findIndex(s=>k>=s.a&&k<s.b);if(sy>=0&&sy!==R.stress&&!(lang&&sy>R.stress)&&SHORTV[R.ph[k]])R.ph[k]=SHORTV[R.ph[k]];}}return R;}

// ---------- Text → Phrasen mit Satzakzenten ----------
function normText(text){return String(text||'').replace(/\{[^}]*\}/g,'').replace(/<[^>]*>/g,' ').replace(/\bz\.\s?B\./g,'zum Beispiel').replace(/\busw\./g,'und so weiter').replace(/\bDr\./g,'Doktor')
 .replace(/(\d+)\./g,(m,d)=>' '+numWord(+d)+'te ').replace(/\d+/g,m=>' '+numWord(+m)+' ').replace(/[„“"»«‚‘']/g,'').replace(/\s[–—-]\s/g,', ').replace(/[–—]/g,', ').replace(/-/g,' ');}
function analyse(text){
 const s=normText(text),re=/(\*?[A-Za-zÄÖÜäöüß]+\*?)|(\.\.\.|…|[.!?]+)|([,;:])/g;let m;
 const phrases=[];let cur={words:[]},sent=[cur],sentStart=true;
 const close=(type,pause)=>{if(cur.words.length){cur.type=type;cur.pause=pause;phrases.push(cur);}cur={words:[]};sent.push(cur);};
 const endSent=mark=>{const ws=sent.flatMap(p=>p.words);const q=mark.includes('?'),ex=mark.includes('!'),ell=/…|\.\.\./.test(mark);
  const type=q?(WH.has(ws[0]?.lw)?'?w':'?'):ex?'!':ell?',':'.';const pause=q?.45:ex?.38:ell?.5:.42;
  if(cur.words.length)close(type,pause);else{const L=phrases[phrases.length-1];if(L&&sent.includes(L)){L.type=type;L.pause=pause;}}
  sent=[cur];sentStart=true;};
 while((m=re.exec(s))){
  if(m[1]){let t=m[1],emph=0;if(t.startsWith('*')||t.endsWith('*')){emph=1;t=t.replace(/\*/g,'');}if(t.length>1&&t===t.toUpperCase()&&/[A-ZÄÖÜ]/.test(t)){emph=1;t=t[0]+t.slice(1).toLowerCase();}
   const lw=t.toLowerCase(),cap=/^[A-ZÄÖÜ]/.test(t),G=g2p(t,{cap});
   // kleine Pause vor Bindewort in langen Phrasen
   if(CONJ.has(lw)&&cur.words.reduce((a,w)=>a+w.syls.length,0)>=7)close('-',.06);
   cur.words.push({txt:t,lw,ph:G.ph.slice(),syls:G.syls,stress:G.stress,fn:FUNC.has(lw)&&!emph,noun:cap&&!sentStart&&!FUNC.has(lw),emph,verb:!cap&&/(en|ern|eln|t|st|te|ten)$/.test(lw)&&!FUNC.has(lw)});sentStart=false;}
  else if(m[2])endSent(m[2]);
  else if(m[3])close(',',m[3]===','?.2:.26);}
 if(cur.words.length)endSent('.');
 // schwache Formen: Artikel und Fürwörter in der Phrasenmitte werden zu [dɐ], [dn̩], [ɐ] …, nur am Phrasenende und bei Betonung bleibt der volle Vokal
 for(const p of phrases)p.words.forEach((w,i)=>{const wk=WEAK[w.lw];if(wk&&w.fn&&!w.emph&&i>0&&i<p.words.length-1){const ph=wk.split(' ');w.ph=ph;w.syls=syllabify(ph);w.stress=0;}});
 for(const p of phrases)accents(p);
 return phrases;}
function accents(p){const W=p.words;W.forEach(w=>w.acc=0);
 const em=W.filter(w=>w.emph);
 if(em.length){em.forEach(w=>w.acc=1);em[em.length-1].acc=2;return;}
 let cand=W.filter(w=>!w.fn);if(!cand.length){const nonPron=W.filter(w=>!/^(ich|du|er|sie|es|wir|ihr|man|der|die|das)$/.test(w.lw));cand=[(nonPron.length?nonPron:W)[(nonPron.length?nonPron:W).length-1]];}
 let nuc=cand[cand.length-1];
 if(nuc.verb&&cand.length>1){const nn=[...cand].reverse().find(w=>w!==nuc&&(w.noun||w.emph));if(nn&&W.indexOf(nuc)-W.indexOf(nn)<=4)nuc=nn;}
 const ni=W.indexOf(nuc);nuc.acc=2;let lastK=-9;
 for(const w of cand){const i=W.indexOf(w);if(i>=ni)break;if(w.noun||i-lastK>=2&&ni-i>=2){w.acc=1;lastK=i;}}}

// ---------- Stimmen und Sprechweisen ----------
// pitch mittlere Tonhöhe (Hz), range Melodieumfang (Halbtöne), speed Tempo, size Körpergröße (Formanten), oq Öffnungsquotient
// (klein = gepresst), tilt Helligkeit der Stimmquelle, breath Hauch, rough Rauheit, creak Knarren am Satzende, shake Zittern (alt)
const PRESETS={
 moderator:{name:'Arena-Moderator',pitch:118,range:12,speed:.98,size:1.03,oq:.46,tilt:.74,breath:.04,rough:.05,creak:.08,shake:0,room:.3,style:'feierlich',lively:1.15,rollR:.9,slur:.08,presence:.7,comp:.9,air:.06,fx:[1,1.02,1]},
 rabies:{name:'Rabies, der Hundsgraf',pitch:82,range:7,speed:.88,size:1.06,oq:.58,tilt:.44,breath:.34,rough:.3,creak:.6,shake:0,room:.06,growl:.22,slur:.26,lively:.9,air:.1,fx:[1,.96,.97],tvar:.08},
 schmied:{name:'Der Schmied',pitch:88,range:6.5,speed:1,size:1.16,oq:.45,tilt:.6,breath:.08,rough:.18,creak:.3,shake:0,room:.1,growl:.28,slur:.24,lively:1.1,fx:[1.03,.94,.97],presence:.6},
 orontes:{name:'Orontes Pfeilkopf',pitch:150,range:15,speed:1.04,size:.95,oq:.56,tilt:.64,breath:.12,rough:.1,creak:.1,shake:.15,room:.1,lively:1.3,wild:.5,tvar:.1,nasal:.1,fx:[1,1.05,1.03],slur:.12},
 krassus:{name:'Krassus Knochenzins',pitch:78,range:5,speed:.8,size:1.2,oq:.5,tilt:.5,breath:.1,rough:.18,creak:.7,shake:0,room:.28,growl:.15,slur:.15,lively:.8,fx:[.98,.95,.96],presence:.6},
 medicus:{name:'Der Medicus',pitch:128,range:7,speed:1.08,size:.95,oq:.5,tilt:.66,breath:.06,rough:.03,creak:.12,shake:0,room:.1,nasal:.2,slur:.05,lively:.9,fx:[1,1.06,1.04],presence:.65},
 rekrut:{name:'Rekrut',pitch:138,range:11,speed:1.06,size:.94,oq:.56,tilt:.62,breath:.1,rough:.04,creak:.04,shake:0,room:.12,lively:1.15,slur:.18,fx:[1,1.02,1.01]},
 frau:{name:'Frau',pitch:205,range:11,speed:1.04,size:.86,oq:.64,tilt:.5,breath:.2,rough:.02,creak:0,shake:0,room:.12,lively:1.15,slur:.12,air:.1},
 erzaehler:{name:'Erzähler',pitch:98,range:8.5,speed:.9,size:1.08,oq:.54,tilt:.56,breath:.14,rough:.05,creak:.3,shake:0,room:.26,lively:.95,slur:.14,fx:[1,.98,1]}
};
// Werkseinstellung der Stimmen (der Stimmeditor überschreibt PRESETS aus localStorage „mg-stimme-voices-v1“)
const DEFAULTS=JSON.parse(JSON.stringify(PRESETS)),VOKEY='mg-stimme-voices-v1';
function setVoices(o){for(const k of Object.keys(PRESETS)){const d=DEFAULTS[k];for(const f of Object.keys(PRESETS[k]))delete PRESETS[k][f];Object.assign(PRESETS[k],JSON.parse(JSON.stringify(d)));const u=o&&o[k];if(u&&typeof u==='object')for(const f of Object.keys(u)){const v=u[f];if(f==='name')continue;if(typeof v==='number'&&isFinite(v)||(f==='style'&&typeof v==='string')||(f==='fx'&&Array.isArray(v)&&v.length===3&&v.every(x=>typeof x==='number'&&isFinite(x))))PRESETS[k][f]=f==='fx'?v.slice():v;}}}
(()=>{try{const t=typeof localStorage!=='undefined'&&localStorage.getItem(VOKEY);if(t)setVoices(JSON.parse(t));}catch{}})();
// Sprechweisen. st Tonlage (Halbtöne), range Melodieumfang, rate Tempo, pause/fin Pausen und Dehnung am Ende, acc/vacc Höhe und Dehnung der Akzente,
// oq/tilt/f1 Stimmdruck und Helligkeit (Rufen: gepresst, hell, Kiefer weit), growl Knurren auf Akzenten, brk Stimmbruch, wob Flackern der Tonhöhe,
// laugh Lachstöße in der Stimme, call Rufmelodie (hoch halten statt abfallen), slur Lallen, echo Arena-Echo
const STYLES={
 normal:{name:'Normal'},
 nachdruck:{name:'Mit Nachdruck',st:1.5,range:1.15,acc:1.2,vacc:1.12,oq:.48,tilt:.72,drive:1.15,fin:1.1},
 feierlich:{name:'Arena-Ansage',st:3,range:1.3,rate:.84,pause:1.3,fin:1.5,acc:1.25,vacc:1.4,vdur:1.08,oq:.42,tilt:.85,f1:1.06,drive:1.1,call:1,rollR:1,pres:.75,comp:.9,echo:.2},
 ruf:{name:'Laut rufen',st:5,range:1.2,oq:.42,tilt:.86,f1:1.08,rate:.93,vdur:1.15,drive:1.15,acc:1.2,breath:-.05,call:1,pres:.7,comp:.9},
 bruellen:{name:'Brüllen',st:3,range:1,oq:.36,tilt:.93,f1:1.13,rate:.86,vdur:1.3,vacc:1.3,acc:1.3,growl:.45,rough:.14,drive:1.3,fin:1.3,creak:-1,pres:.8,comp:1,rollR:1},
 schrei:{name:'Schreien',st:6.5,range:1.1,oq:.34,tilt:.96,f1:1.16,rate:.88,vdur:1.3,drive:1.2,rough:.08,brk:.25,acc:1.2,fin:1.3,creak:-1,pres:.8,comp:1},
 wut:{name:'Wütend',st:1,range:.9,oq:.38,tilt:.88,rough:.16,growl:.3,creak:.2,rate:.92,acc:1.35,vacc:1.3,drive:1.25,pres:.7,comp:.9},
 drohen:{name:'Leise drohen',st:-3,range:.55,oq:.5,breath:.25,creak:.55,rate:.8,pause:1.6,acc:1.25,vacc:1.25,vol:.75},
 fluester:{name:'Flüstern',whisper:1,rate:.92,range:.6,creak:-1,vol:.6},
 angst:{name:'Ängstlich',st:5,range:1.35,rate:1.12,trem:.6,wob:1.2,breath:.3,oq:.62,brk:.2,creak:-1,pause:.8},
 flehen:{name:'Flehen',st:6,range:1.25,breath:.35,trem:.45,wob:.6,rate:.9,fin:1.5,vacc:1.2},
 lachend:{name:'Lachend',st:2.5,range:1.35,f2:1.05,breath:.12,laugh:.5,rate:1.02,acc:1.15,chuckle:1},
 jubel:{name:'Jubelnd',st:4.5,range:1.4,rate:1.04,tilt:.78,oq:.46,f2:1.04,acc:1.3,vacc:1.2,drive:1.2,pres:.7},
 spott:{name:'Spöttisch',st:1,range:1.6,rate:.9,acc:1.4,vacc:1.45,nasal:.35,f2:1.03},
 traurig:{name:'Traurig',st:-2,range:.5,rate:.82,breath:.3,decl:1.7,creak:.3,vol:.8,pause:1.4},
 erschoepft:{name:'Erschöpft / sterbend',st:-2,range:.45,breath:.55,creak:.5,rate:.72,pause:2,trem:.35,decl:2,vol:.75},
 betrunken:{name:'Betrunken',st:-1,range:1.3,rate:.78,slur:.35,wob:1.6,wobRate:2.2,vdur:1.25,breath:.15,pause:1.3}
};
// Regieanweisungen im Text: „[brüllt] Lasst sie bluten!“ – gilt bis zur nächsten Anweisung
const TAGS={normal:'normal',ruhig:'normal',nachdruck:'nachdruck',betont:'nachdruck',ansage:'feierlich',feierlich:'feierlich','verkündet':'feierlich',ruft:'ruf',ruf:'ruf',rufen:'ruf',laut:'ruf',
 'brüllt':'bruellen','brüllen':'bruellen',bruellen:'bruellen','brüllend':'bruellen',schreit:'schrei',schrei:'schrei',schreien:'schrei',kreischt:'schrei','wütend':'wut',wut:'wut',zornig:'wut',
 droht:'drohen',drohen:'drohen',drohend:'drohen','flüstert':'fluester','flüstern':'fluester',leise:'fluester','ängstlich':'angst',angst:'angst',panisch:'angst',fleht:'flehen',flehen:'flehen',flehend:'flehen',
 lacht:'lachend',lachend:'lachend',lachen:'lachend',jubelt:'jubel',jubel:'jubel',begeistert:'jubel',spottet:'spott',spott:'spott','spöttisch':'spott','höhnisch':'spott',traurig:'traurig',
 'erschöpft':'erschoepft',sterbend:'erschoepft',betrunken:'betrunken',lallt:'betrunken'};

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
 const phrases=analyse(text),sp0=(V.speed||1)*(S.rate||1),roll=S.rollR??V.rollR??.5,segs=[],words=[],tones=[];let t=.06;
 const pauseF=S.pause||1,FIN=S.fin||1,ACCD=S.vacc||1,VD=S.vdur||1;
 phrases.forEach((PH,pi)=>{const sp=sp0*(1+(r()*2-1)*(V.tvar||0)),ptStart=t,sylls=[];
  PH.words.forEach((w,wi)=>{w.syls.forEach((s,si)=>sylls.push({w,wi,si,s}));});
  const lastSyl=sylls[sylls.length-1];
  PH.words.forEach((w,wi)=>{const ws={w,t0:t,phrase:pi,sy:[]};const nS=w.syls.length;
   w.syls.forEach((s,si)=>{const stressed=si===w.stress,isLast=lastSyl.w===w&&si===nS-1,acc=stressed?w.acc:0,sy={t0:t,stressed,acc,emph:w.emph&&stressed};
    for(let k=s.a;k<s.b;k++){const p=w.ph[k],Q=P[p];if(!Q)continue;const vow=isVow(p);
     let f=1;
     if(vow){if(Q.sw)f=isLast?1.25:.9;else if(!stressed)f=.55;else{f=acc===2?1.4*ACCD*(S.call?1.25:1):acc===1?1.25*ACCD:1.05;if(w.emph)f*=1.4;if(nS>1)f*=.88;}if(isLast)f*=(PH.type===','||PH.type==='-'?1.3:1.55)*FIN;f*=VD;}
     else{const prev=w.ph[k-1],next=w.ph[k+1];if((prev&&!isVow(prev))||(next&&!isVow(next)))f*=(p==='R'||p==='l')&&next&&isVow(next)?1:.72;if(!stressed)f*=.85;if(k===0)f*=1.08;if(p==='R'&&roll>.5&&next&&isVow(next))f*=1+(roll-.5)*.5;if(isLast&&k>s.nuc)f*=1.35*FIN;}
     if(w.fn)f*=.78;
     let d=(Q.m+(Q.d-Q.m)*f)/1000/sp*(.95+r()*.1);if(vow&&!stressed&&Q.sw)d=Math.max(d,.028/sp);
     const seg={p,Q,t0:t,d,w,wi,si,k,stressed,acc,vow,phrase:pi,ptype:PH.type,last:isLast,vcd:false};
     if(Q.k==='p'){// Lösung: Knall + Behauchung (Fortis vor Vokal behaucht, nach s/sch kaum)
      const nx=w.ph[k+1]??PH.words[wi+1]?.ph[0],pv=w.ph[k-1];let vot;
      if(Q.vc)vot=.012;else if(nx&&P[nx]?.k==='f')vot=.004;else if(pv==='S'||pv==='s')vot=.014;else if(nx&&isVow(nx))vot=stressed?.05:.034;else if(nx&&['l','R','v','n','j'].includes(nx))vot=.035;else vot=.022;
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
 const FX=V.fx||[1,1,1],f2m=(S.f2||1)*FX[1],f3m=(1+((S.f2||1)-1)*.6)*FX[2],f1x=f1m*FX[0],redA=clamp((V.slur??.2)+(S.slur||0),0,.7),gr=(V.growl||0)+(S.growl||0),subs=[],chas=[],accV=[];
 const setF=(t,F)=>{T.key('F1',t,F[0]*f1x);T.key('F2',t,F[1]*f2m);T.key('F3',t,F[2]*f3m);T.key('F4',t,F[3]||3500);};
 // Übergänge nach Lokus-Gleichungen: wie weit der Vokalbeginn schon beim Vokal ist (Lippen: fast ganz, Zahndamm: knapp halb, Gaumen: am Ort)
 const LK=[.45,.6,.7,1],LKP={lab:[.3,.72,.6,1],alv:[.3,.42,.5,1],post:[.3,.45,.6,1],pal:[.3,.5,.6,1],vel:[.3,0,0,1]},TRD={lab:.03,alv:.04,vel:.055},toward=(L,F,pl)=>{const K=LKP[pl]||LK;return L.map((l,i)=>l+(F[i]-l)*K[i]);};
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
   const tr=Math.min(TRD[pl1]||.04,d*.4),tr2=Math.min(TRD[pl2]||.04,d*.4);
   setF(t0,L1&&prevSeg.Q.k!=='l'?toward(L1,F,pl1):F);
   if(Q.k==='d'){setF(t0+d*.3,F);setF(t0+d*.85,TO);setF(t1,L2?toward(L2,TO,pl2):TO);lastF=TO;}
   else{setF(t0+tr,F);setF(t1-tr2,F);setF(t1,L2&&nextSeg.Q.k!=='l'?toward(L2,F,pl2):F);lastF=F;}
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
    const lvl=Q.k==='n'?(prevSeg&&!prevSeg.pause?.5:.34):p6(s.p);T.hold('AV',t0,t1,whisper?0:lvl);T.hold('AH',t0,t1,whisper?.2:0);
    if(Q.k==='n')T.hold('NZ',t0,t1,Q.nz);else T.hold('NZ',t0,t1,270);
    if(s.p==='R'&&d>.03){const am=.4+.2*clamp(S.rollR??V.rollR??.5,0,1);/* tieferes Flattern klingt wie g oder k */T.key('AM',t0-.002,0);T.hold('AM',t0+.004,t1-.004,am);T.key('AM',t1+.002,0);}// Zäpfchen-R flattert
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
    T.key('AH',tc,0);T.key('AH',tb,s.vot>.02?.2:.1);T.key('AH',t1-.004,s.vot>.02?.14:.07);T.key('AH',t1,0);T.key('AV',tb,0);T.key('AV',t1-.003,0);
    setF(tb,toward(L,tg,Q.pl));
    micro.push([t0,t1,0]);voicedPrev=false;break;}}
 });
 function p6(p){return p==='l'?.6:p==='j'?.66:p==='6g'?.78:.38;}
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
const LAUGH_RE=/(^|[^A-Za-zÄÖÜäöüß])((?:mua?|bu|bwa|wa|ga)?h([aeiouäö])(?:r?[ ,!-]{0,3}h\3)+[rh]?)(?![A-Za-zÄÖÜäöüß])[!.…,]*/gi;
// Sprechweise eines Satzes aus der Schreibweise (nur wenn sonst „normal“ gesprochen würde): GROSS oder „!!“ = Brüllen,
// Hilferufe = Flehen, einfaches „!“ = mit Nachdruck. In der Arena-Ansage bleibt die Ansage.
function autoStyle(sent,base){if(base!=='normal')return base;
 const ws=sent.match(/[A-Za-zÄÖÜäöüß]{2,}/g)||[],caps=ws.filter(w=>w.length>2&&w===w.toUpperCase()).length;
 if(ws.length&&(caps>=2&&caps>=ws.length*.6||ws.length===1&&caps===1&&ws[0].length>=4)||/!{2,}\s*$/.test(sent))return 'bruellen';
 if(/!\s*["“”»«]*\s*$/.test(sent)){if(/\b(hilfe|gnade|erbarmen|verschont|bitte nicht|tut mir nichts|tu mir nichts)\b/i.test(sent))return 'flehen';return 'nachdruck';}
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
function laughPlan(part,V,S,r){const lw=part.laugh.toLowerCase(),m=/h([aeiouäö])/.exec(lw);let v=m?m[1]:'a';v=v==='ä'||v==='ö'?'e':v==='u'?'o':v;const K=LAUGHV[v];
 const evil=/^(mu|bu|bwa|wa|ga)/.test(lw),loud=part.laugh.replace(/[^A-ZÄÖÜ]/g,'').length>part.laugh.replace(/[^a-zäöü]/g,'').length;
 let n=(lw.match(/h[aeiouäö]/g)||[]).length;n=part.short?2+Math.floor(r()*2):clamp(n+(n<3?1:0)+Math.floor(r()*2)+(evil?2:0),3,10);
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
 if(opt.speed)V.speed=(V.speed||1)*opt.speed;if(opt.pitch)V.pitch*=opt.pitch;if(opt.range!=null)V.range=(V.range||9)*opt.range;
 const base=STYLES[opt.style]?opt.style:STYLES[V.style]?V.style:'normal',parts=segment(text,base,opt.auto!==false);
 const chunks=[];let total=0,volMax=0,echoAmt=0;
 for(const part of parts){const S={...STYLES[part.style]||{}};let R;
  if(part.laugh)R=laughPlan(part,V,S,r);else{const pl=plan(part.text,V,S,r);if(!pl.words.length)continue;R={T:makeTracks(pl,V,S,r),dur:pl.dur,pl,phon:phonString(pl),f0min:.2};}
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
  phon.push(R.phon);if(!R.pl){words.push({txt:'(lacht)',t0:off,t1:off+R.dur,acc:0,emph:0,fn:false,sy:[],phrase:phrases.length,laugh:true});phrases.push({type:'-',pause:0,style:c.S.name});continue;}
  const pb=phrases.length;for(const ws of R.pl.words)words.push({txt:ws.w.txt,t0:ws.t0+off,t1:ws.t1+off,acc:ws.w.acc,emph:ws.w.emph,fn:ws.w.fn,sy:ws.sy.map(y=>({...y,t0:y.t0+off,t1:y.t1+off,v0:y.v0!=null?y.v0+off:y.v0,v1:y.v1!=null?y.v1+off:y.v1})),phrase:ws.phrase+pb});
  for(const tn of R.pl.tones)tones.push({...tn,pi:tn.pi+pb,t0:tn.t0+off,t1:tn.t1+off,pts:tn.pts.map(q=>[q[0]+off,q[1]])});
  for(const p of R.pl.phrases)phrases.push({type:p.type,pause:p.pause,style:c.S.name});
  for(const sg of R.pl.segs)if(!sg.pause)segs.push({p:sg.p,t0:sg.t0+off,t1:sg.t1+off});}
 mouth.push({t:total/SR,o:0});
 return {data:x,sr:SR,dur:x.length/SR,mouth,phon:phon.join(' ‖ '),info:{words,tones,phrases,f0,f0step:FR*10,segs,styles:parts.map(p=>p.style)}};}
function phonString(pl){let out='',lastP=-1;for(const ws of pl.words){const w=ws.w;if(ws.phrase!==lastP&&lastP>=0){const T=pl.phrases[lastP].type;out=out.trimEnd()+({'.':' ‖ ','!':' ‖ ','?':' ↗‖ ','?w':' ‖ ',',':' | ','-':' ¦ '}[T]||' | ');}lastP=ws.phrase;
  const parts=w.syls.map((s,si)=>(si===w.stress?(w.acc===2?'ˈˈ':w.acc?'ˈ':'ˌ'):'')+w.ph.slice(s.a,s.b).map(p=>p==='6g'?'6̯':p).join(''));out+=parts.join('.')+' ';}
 return out.trim();}
function mouthAt(list,t){if(!list?.length)return 0;let lo=0,hi=list.length-1;if(t<=list[0].t)return list[0].o;if(t>=list[hi].t)return list[hi].o;while(hi-lo>1){const m=(lo+hi)>>1;if(list[m].t<=t)lo=m;else hi=m;}const a=list[lo],b=list[hi],u=(t-a.t)/Math.max(1e-6,b.t-a.t);return a.o+(b.o-a.o)*u;}
function playData(ctx,dest,R,opt={}){const b=ctx.createBuffer(1,R.data.length,R.sr||SR);b.getChannelData(0).set(R.data);const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=b;g.gain.value=opt.vol??1;s.connect(g);g.connect(dest);const at=Math.max(ctx.currentTime,opt.at||0)+.02;s.start(at);s.onended=()=>{s.disconnect();g.disconnect();};return {source:s,start:at,dur:R.dur,mouth:R.mouth,mouthAt:tt=>mouthAt(R.mouth,tt-at)};}
function play(ctx,dest,text,voice,opt={}){const R=render(text,voice,opt);return {...playData(ctx,dest,R,opt),phon:R.phon,info:R.info,data:R.data};}
// Eigenes Wörterbuch: { wort: "Lautschrift mit ' vor dem betonten Vokal" | Nummer der betonten Silbe }. Wirkt sofort (Zwischenspeicher wird geleert).
function setLexicon(o){for(const k of Object.keys(USERLEX))delete USERLEX[k];if(o&&typeof o==='object')for(const k of Object.keys(o)){const v=o[k];if(typeof v==='string'&&v.trim())USERLEX[k.toLowerCase().trim()]=v.trim();else if(typeof v==='number')USERLEX[k.toLowerCase().trim()]=v;}g2pCache.clear();}
function getLexicon(){return {...USERLEX};}
function saveLexicon(){try{if(typeof localStorage!=='undefined')localStorage.setItem(ULKEY,JSON.stringify(USERLEX));}catch{}}
(typeof window!=='undefined'?window:self).Stimme={SR,FR,P,PRESETS,DEFAULTS,STYLES,TAGS,ORDER:Object.keys(PRESETS),g2p,analyse,segment,render,play,playData,mouthAt,numWord,setLexicon,getLexicon,saveLexicon,LEXKEY:ULKEY,setVoices,VOICEKEY:VOKEY,
 core:{synth,Tracks,finish,room,retro,rng,smooth,SHN,clamp,SH,SHN}};
})();
