'use strict';
/* =====================================================================================================
   AUSSENWELT · Logik-Kern (kein DOM, läuft auch headless in Node). Quelle der Wahrheit; die Testseite
   (aussenwelt-test.html) und das Spiel (outside.js) nutzen genau diese Datei.
   · Generator für Orte (Dorf, Wald, Stadt): Eingang → Abschnitte mit Begegnungen → Ziel, sonst zufällig, aus dem Seed reproduzierbar.
   · Quest „Der Schuldeneintreiber“: 10 Dorftrottel + Krassus Knochenzins (solider Zweihänder „Zinseszins“).
   · Zufällige Abenteuer: Banden in Dorf, Wald oder Stadt; Anzahl und Stärke nach der Gruppe, am Ende ein Anführer.
   · Höchstens 2 Gegner greifen gleichzeitig an; Nachschub kommt nach. Kampf über die echte Engine (M.createCombatActor,
     M.fixedStep). Verletzungen, Blutverlust, Erschöpfung und Tod bleiben (Tod über das vorhandene M.kill).
   · b.benchmark=true heißt hier nur: kein Arena-Finale, keine Hinrichtungen, Ende über M.endBenchmark (wird in outside.js
     für Missionen umgeleitet). Lernen ist für echte Missionen wieder eingeschaltet (siehe M.learn unten).
   ===================================================================================================== */
(()=>{
const M=window.MG,S=M.s;
const D=window.Debt={};M.outsideCore=D;

// ---------- Zahlen (alle an einer Stelle, damit sie leicht abzustimmen sind) ----------
D.CFG={
 henchmen:10,          // Dorftrottel insgesamt
 maxActive:2,          // höchstens so viele greifen gleichzeitig an
 partyAmmo:3,          // eigene Bogen- und Armbrustschützen nehmen so viel mehr Pfeile/Bolzen mit
 breather:3,           // Verschnaufpause: so viel schneller erholt sich die Ausdauer, wenn gerade kein Gegner steht
 minParty:1,           // so wenige Kämpfer darf man losschicken
 maxParty:10,          // so viele höchstens
 enemyStat:.4,         // Werte der Trottel relativ zu einem frischen Rekruten (Arena-Stufe 0 nutzt .79)
 bossStat:1.25,         // Werte von Krassus relativ zu einem Rekruten
 spawnDelay:[1.6,3.2], // Sekunden, bis Nachschub aus einer Tür kommt
 fatigueBase:5,        // Erschöpfung pro Gefecht (+ Kampfdauer/25)
 timeLimit:600,        // Sekunden je Gefecht, dann Rückzug
 restBlood:15,         // kurze Rast nach jedem gesäuberten Ort: Blut +X (Verletzungen bleiben)
 gold:[260,420],       // Geldkassette von Krassus
 debt:10000,
 advGold:[50,140],     // Beute-Gold eines zufälligen Abenteuers (× Gegnerstärke)
 advStat:.45,          // Bandenstärke bei einer Truppe aus frischen Rekruten (wächst mit der Gruppe)
 advSections:3         // Plünderung: so viele Abschnitte mit je einer Gruppe, danach der Anführer mit seiner Leibwache
};

// ---------- Zufall ----------
function rng32(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const pick=(r,l)=>l[Math.floor(r()*l.length)];
const shuffle=(r,l)=>{l=[...l];for(let i=l.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[l[i],l[j]]=[l[j],l[i]];}return l;};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
D.rng32=rng32;D.pick=pick;
function makeG(seed,f){const old=S.rng;S.rng=seed>>>0||1;let g;try{g=M.makeGladiator(0);}finally{S.rng=old;}g.equipment={weapon:null,secondary:null,shield:null,armor:{}};g.scars=[];g.fame=0;g.fatigue=0;g.blood=100;g.history=[];f?.(g);return g;}
D.makeG=(...a)=>makeG(...a);
function scaleStats(g,k,keep=[]){for(const grp of ['stats','moves','mastery','skills'])for(const key in g[grp]){if(keep.includes(key))continue;g[grp][key]=clamp(Math.round(g[grp][key]*k),3,100);}
 for(const p of Object.values(g.body)){p.strength=clamp(Math.round(p.strength*k),3,100);p.agility=clamp(Math.round(p.agility*k),3,100);}}

// ---------- Texte ----------
const T=D.TEXT={
 names:['Titus der Zahnlose','Gnaeus Brecheisen','Pansa Dreifinger','Lucius Mundgeruch','Brutus Kleinhirn','Decimus Schweinehirt','Flavius Hustenreiz','Quintus Bierbauch','Marcellus Zwei-Zähne','Rufus Rattenfänger','Aulus Achselschweiß','Kuno Kuhfladen','Servius Schimmelbrot','Opiter Ohnegeld','Manius Mistgabel','Vibius Wunderlich','Gallus Galgenstrick','Sextus Saufaus','Numerius Nimmersatt','Tullus Tollpatsch','Cornix der Krähenfänger','Balbus Bettnässer','Hostus Hinkebein','Fabius Furunkel','Mamercus Matschbirne','Paullus Pfandbrief','Lartius Läusekamm','Spurius Stinkstiefel'],
 owes:['schuldet Krassus drei Ziegen und eine Tante','zahlt seit zehn Jahren einen Brunnen ab, der nie gebaut wurde','hat für seine Hochzeit geliehen. Die Braut ist weg, der Kredit nicht','schuldet einen Esel. Mit Zinsen inzwischen vier Esel','hat Spielschulden. Er hat gegen sich selbst gewürfelt und verloren','mietet ein Grab, in dem er noch nicht liegt','schuldet eine Kuh, die er nie besessen hat','hat sein linkes Auge als Anzahlung hinterlegt','erbt die Schulden seines Großvaters. Der lebt leider noch','hat ein Fass Wein „zur Probe“ getrunken','stottert seine Zähne in Raten ab','hat sich Geld für einen Anwalt geliehen, um sich gegen Krassus zu wehren','schuldet Gebühren für die Mahnung der Mahnung','hat einen Kredit aufgenommen, um einen Kredit abzuzahlen'],
 shout:['Ich schulde Krassus drei Ziegen! Ihr seid die vierte!','Wer mich umbringt, übernimmt meine Schulden! Steht im Vertrag!','Zinsen! ZINSEN! Ich seh nur noch Zinsen!','Bleibt stehen! Ich hab heute schon zwei Raten verpasst!','Für Krassus! Und für mein linkes Ohr, das er noch nicht hat!','Meine Mistgabel hat schon einen Bären getötet! Na gut, einen Dachs. Einen kranken Dachs.','Wenn ich euch erledige, krieg ich zwei Prozent Rabatt!','Hilfe! Ich meine: ANGRIFF!','Ich bin nur Bauer! Aber ein gefährlicher!','Krassus sagt, Tote zahlen keine Zinsen! Ich will aber zahlen!','Heute ist Zahltag! Eurer!','Mama, ich bin im Krieg!','Ich kämpfe nur, bis meine Schulden weg sind! Also ewig!','Wer ist hier der Gläubiger? ICH! … Nein, Krassus. Egal, ANGRIFF!','Ich hab eine Frau, drei Kinder und vierzig Gold Schulden! Oder umgekehrt!','Lauft, solange ihr noch Beine habt! Die sind nämlich verpfändet!'],
 cleared:['Das war’s? Ich hab mich gerade erst warm gestorben.','Sammelt die Waffen ein. Und die Zähne. Krassus nimmt Zähne.','Zwei Schuldner weniger. Krassus wird uns das in Rechnung stellen.','Der da atmet noch. Lassen wir ihn. Der hat genug Probleme.','Ich glaub, ich hab einen Bauern erwischt, der nur zum Brunnen wollte. Egal, er hatte ein Messer.','Hat jemand meinen Finger gesehen? Nein? Dann gehört er jetzt dem Dorf.','Ich hätte gern eine Quittung für diesen Kampf.','Wenn das die Vorspeise war, will ich das Hauptgericht nicht sehen.'],
 banter:[['Riecht ihr das?','Das ist das Dorf. Oder ich. Schwer zu sagen.'],['Wenn ich hier sterbe, will ich nicht neben einem Schwein begraben werden.','Keine Sorge. Die Schweine wollen das auch nicht.'],['Wie viele sind es noch?','Genug für ein hübsches Massengrab.'],['Ich hab gehört, Krassus nimmt auch Organe als Anzahlung.','Dann gib ihm deinen Verstand. Den vermisst keiner.'],['Haben die Dörfler Angst vor uns?','Die haben Angst vor Zinsen. Wir sind nur Abwechslung.'],['Für den Lanista!','Der sitzt zu Hause und isst Trauben. Für mich!'],['Wenigstens zahlen wir hier keinen Eintritt.','Warte ab. Krassus findet einen Weg.'],['Ich hab ein ganz mieses Gefühl.','Das ist die Rüstung. Die ist improvisiert.'],['Was machen wir, wenn es zu viele sind?','Das, was wir immer machen. Schreien und hoffen.'],['Mein Helm ist aus einem Kochtopf.','Dann pass auf, dass dich keiner würzt.']],
 bossIntro:[['K','Ah. Die Kundschaft kommt persönlich. Wie selten.'],['K','Ihr habt meine Schuldner verprügelt. Das sind Ausfälle. Ausfälle muss jemand bezahlen.'],['P','Wir sind gekommen, um die Schulden zu begleichen.'],['K','Wunderbar. Bar oder blutig?']],
 bossHurt:['Das kommt auf die Rechnung! Mit Zinseszins!','Ihr verkratzt mein gutes Hemd! Das kostet extra!','Ich habe Anwälte! … Hatte. Die schulden mir auch was.'],
 gaveup:['Ich hab genug! Behaltet die Zinsen!','Mama! MAMA!','Das zahlt mir keiner!','Ich geh heim. Krassus kann mich mal.'],
 bossDown:[['K','Ihr … könnt mich nicht … ich bin systemrelevant …'],['P','Hier ist der Schuldschein. 10.000 Gold, unterschrieben vom alten Lanista. Und von Krassus’ Mutter als Bürgin.'],['P2','Verbrennen?'],['P','Verbrennen. Den Zweihänder nehmen wir mit.']]
};

// ---------- Texte der zufälligen Abenteuer (je Gegend eine eigene Bande) ----------
D.ADV={
 dorf:{band:'Dorfbande',who:'Dorfschläger',leaderTitle:['der Dorfschulze','der Gemeindebüttel','der Müllerssohn','der Viehdieb'],finals:['taverne','markt','hof','muehle'],
  names:T.names,
  owes:['hat das Gemeindeland an sich selbst verpachtet','will euch für die Wegbenutzung kassieren','hat gehört, Gladiatoren tragen Gold im Mund','prügelt sich sonst nur mit seinem Schwager','ist der Dorftrottel. Hauptberuflich','will ein Schwert. Eures','hat mit seinem Onkel gewettet, dass er einen Gladiator umhaut','hält euch für Steuereintreiber','hat seit dem Frühjahr keinen mehr verhauen'],
  shout:['Das ist UNSER Dorf! Und UNSER Matsch!','Wegzoll! Zahlbar in Zähnen!','Holt die Mistgabeln! Nein, die guten Mistgabeln!','Gladiatoren? Hier? Das ist ja wie Weihnachten!','Ich hau euch, bis ihr Bauern seid!','Wer zuerst blutet, zahlt die Runde!','Die Kühe haben euch gesehen! Die Kühe sind auf unserer Seite!','Für das Dorf! Und für den Schweinestall!'],
  intro:'In {P} spricht sich herum, dass Fremde mit Waffen kommen. Die Antwort des Dorfes: noch mehr Waffen, nur schlechtere.',
  leaderIntro:[['L','Ihr seid also die berühmten Gladiatoren. Ich hab mir euch größer vorgestellt.'],['P','Und wir dich klüger.'],['L','Packt sie! Wer einen Helm erbeutet, darf ihn behalten!']],
  leaderDown:[['L','Gut … gut … das Dorf … gehört … euch …'],['P','Wir wollen das Dorf nicht. Nur den Inhalt eurer Truhen.']]},
 wald:{band:'Räuberbande',who:'Räuber',leaderTitle:['der Räuberhauptmann','die Wilde Hilde','der Einäugige','der Köhlerkönig'],finals:['raeuberlager','koehlerei','lichtung'],
  names:['Brennus Bärentöter','Lupus Laubfresser','Corvus Krähenfuß','Ursus Unrasiert','Varro Wegelagerer','Silvanus Stinkmorchel','Faustus Fallensteller','Grimmo Rindenbeißer','Marcus Moosbart','Tertius Tannenzapfen','Ambro Asthieb','Celer Schnellfuß','Dentatus Wolfszahn','Fango Matschmaul','Rumex Rindenrotz','Picus Pechfinger'],
  owes:['lauert seit drei Tagen auf einem Ast und ist schlecht gelaunt','hat sein letztes Opfer gegessen. Nur ein bisschen','sammelt Ohren. Die Sammlung ist noch klein','ist aus der Stadt geflohen. Und aus der nächsten auch','hat eine Falle gestellt und ist selbst reingetreten','wurde aus der Räuberbande geworfen und gleich wieder aufgenommen','lebt von Pilzen. Man sieht es ihm an'],
  shout:['Geld oder Leben! Am liebsten beides!','Der Wald gehört uns! Und die Bäume! Und die Eichhörnchen!','Ihr seid umzingelt! Von zwei Leuten! Aber gut verteilt!','Euer Gold! Eure Stiefel! Eure Hosen nehmen wir auch!','Hab euch schon seit dem Bach gerochen!','Hinterhalt! Das ist ein Hinterhalt! Ich sag’s nur, damit ihr’s wisst!','Für den Hauptmann! Und für das Wildschwein von gestern!'],
  intro:'Im {P} sollen Wegelagerer hausen. Händler kommen nur noch nackt aus dem Wald. Manchmal kommen sie gar nicht.',
  leaderIntro:[['L','Willkommen in meinem Wald. Der Eintritt ist frei. Der Austritt kostet alles.'],['P','Wir zahlen in Eisen.'],['L','Dann nehmen wir euer Eisen. Holt sie euch, Jungs!']],
  leaderDown:[['L','Der Wald … wird mich … rächen …'],['P','Der Wald hat dich noch nie gemocht. Frag die Eichhörnchen.']]},
 stadt:{band:'Straßenbande',who:'Halsabschneider',leaderTitle:['der Bandenboss','die Messer-Mutter','der Pfandleiher','der Hafenkönig'],finals:['villa','hafen','platz'],
  names:['Nero Nagelbrett','Gaius Gossenratte','Fulvius Flinkfinger','Crispus Kehlenschnitt','Pollio Pfandbruder','Rufio Rattengesicht','Tiro Taschenmesser','Aelius Aalglatt','Sabinus Säufernase','Opimius Ohrabschneider','Varus Vierfinger','Mettius Marktschreier','Quietus Quengelkopf','Bassus Bauchstich'],
  owes:['verkauft am Hafen Fische, die er nie gefangen hat','hat den Wachen heute schon dreimal Schutzgeld gezahlt','arbeitet für den Boss. Der Boss arbeitet für niemanden','hat einen Vetter im Gefängnis und einen im Grab','klaut Türklinken. Nur die guten','hat mal einem Senator die Hand geschüttelt. Danach hatte der Senator keinen Ring mehr','lebt in einem Fass. Einem schönen Fass'],
  shout:['Das ist unser Viertel! Hier wird nur von uns ausgeraubt!','Ich hab ein Messer! Und noch eins! Und das hier ist auch ein Messer!','Wachen? Die schlafen. Wir haben sie bezahlt!','Kommt näher, ich zeig euch die Stadt! Von unten!','Für den Boss! Und für die Provision!','Ihr seid in der falschen Gasse gelandet!'],
  intro:'In {P} regiert eine Bande die Gassen. Die Wachen kassieren mit, die Bürger zahlen doppelt.',
  leaderIntro:[['L','Ah, Gladiatoren. Ich wette sonst auf euch. Heute wette ich gegen euch.'],['P','Schlechte Wette.'],['L','Ich verliere nie. Ich lasse verlieren. JUNGS!']],
  leaderDown:[['L','Das … war nicht … abgesprochen …'],['P','Die Wette hast du verloren. Wir nehmen den Einsatz mit.']]},
 cleared:['Das war’s? Ich hab mich gerade erst warm gestorben.','Sammelt die Waffen ein. Die sind schlecht, aber unsere.','Wenn das die Vorspeise war, will ich das Hauptgericht nicht sehen.','Hat jemand meinen Finger gesehen? Nein? Dann gehört er jetzt der Gegend.','Ich hätte gern eine Quittung für diesen Kampf.','Der da atmet noch. Lassen wir ihn. Der hat genug Probleme.'],
 banter:[['Riecht ihr das?','Das ist die Gegend. Oder ich. Schwer zu sagen.'],['Wie viele sind es noch?','Genug für ein hübsches Massengrab.'],['Für den Lanista!','Der sitzt zu Hause und isst Trauben. Für mich!'],['Wenigstens zahlen wir hier keinen Eintritt.','Noch nicht.'],['Ich hab ein ganz mieses Gefühl.','Das ist die Rüstung. Die ist improvisiert.'],['Was machen wir, wenn es zu viele sind?','Das, was wir immer machen. Schreien und hoffen.'],['Warum machen wir das eigentlich?','Beute. Ruhm. Und weil der Lanista sonst das Essen streicht.'],['Wenn ich falle, sagt allen, ich war tapfer.','Wir sagen, du warst da.']]
};

// ---------- Generator: Dörfer, Wälder, Städte ----------
// Schema: Eingang → 3 Abschnitte (je 1–2 Begegnungen, breite Karten zum Durchmarschieren) → Abschnitt mit dem Ziel.
// Alles andere (Name, Stimmung, Häuser, Wege, Tiere, Gegnerplätze) ist zufällig, aber aus dem Seed reproduzierbar.
const BIOMES=D.BIOMES={
 dorf:{label:'Dorf',pre:['Raben','Galgen','Mist','Schlamm','Pfand','Kummer','Krähen','Rost','Ochsen','Fliegen','Stumpf','Jammer','Distel','Brenn','Moos'],suf:['brück','winkel','hausen','dorf','grube','loch','furt','heim','au','bach'],
  themes:['feldrand','gasse','markt','hof','muehle','kirchhof','taverne','schmiede','teich'],boss:'kontor'},
 wald:{label:'Wald',pre:['Finster','Moder','Krähen','Wolfs','Nebel','Dorn','Pech','Eiben'],suf:['tann','grund','hain','klamm','forst'],
  themes:['waldweg','lichtung','bachlauf','koehlerei','holzfaeller'],boss:'raeuberlager'},
 stadt:{label:'Stadt',pre:['Neu','Alt','Hafen','Kaiser','Bettel','Zoll'],suf:['stadt','burg','tor','markt'],
  themes:['stadttor','steingasse','platz','hafen','gerberei'],boss:'villa'}
};
const THEMES=D.THEMES={
 feldrand:{name:'Feldrand',text:'Am Dorfrand: Äcker, eine Vogelscheuche mit verdächtig echter Kleidung und ein Hof, aus dem niemand winkt.'},
 gasse:{name:'Gasse',text:'Eine enge Gasse. Wäsche über dem Weg, Schlamm darunter, Misstrauen hinter jedem Fensterladen.'},
 markt:{name:'Dorfplatz',text:'Der Dorfplatz. Marktstände mit faulen Rüben, ein Brunnen, aus dem man besser nicht trinkt.'},
 hof:{name:'Bauernhof',text:'Ein Bauernhof. Hühner, Schweine und ein Misthaufen, der älter ist als das Dorf.'},
 muehle:{name:'Mühlbach',text:'Am Mühlbach. Das Rad dreht sich, das Wasser ist braun, die Frösche schweigen.'},
 kirchhof:{name:'Kirchhof',text:'Der Kirchhof. Viele frische Gräber für ein so kleines Dorf. Krassus nimmt es genau.'},
 taverne:{name:'Wirtshaus',text:'Vor dem Wirtshaus. Es riecht nach Bier, Rauch und schlechten Entscheidungen.'},
 schmiede:{name:'Dorfschmiede',text:'Die Dorfschmiede. Der Schmied hier ist kleiner als eurer. Und deutlich nervöser.'},
 teich:{name:'Dorfteich',text:'Der Dorfteich. Enten, Schilf und etwas, das treibt und hoffentlich ein Sack ist.'},
 kontor:{name:'Kontor des Krassus',text:'Das Kontor von Krassus Knochenzins. Stein, Eisen, Gold an den Türbeschlägen. Davor Käfige. Nicht für Tiere.',boss:true},
 waldweg:{name:'Waldweg',text:'Ein Waldweg. Die Bäume stehen zu dicht, die Vögel sind zu still.'},
 lichtung:{name:'Lichtung',text:'Eine sonnige Lichtung. Zu sonnig. Hier passiert gleich etwas Hässliches.'},
 bachlauf:{name:'Bachlauf',text:'Ein Bach. Kaltes Wasser, glatte Steine und Fußspuren, die nicht von Rehen stammen.'},
 koehlerei:{name:'Köhlerei',text:'Ein Kohlenmeiler raucht. Der Köhler ist weg. Seine Stiefel nicht.'},
 holzfaeller:{name:'Holzfällerlager',text:'Ein Holzfällerlager. Viele Äxte, wenig Bäume, noch weniger Verstand.'},
 raeuberlager:{name:'Räuberlager',text:'Das Lager. Zelte, Fässer und ein Thron aus Schatztruhen.',boss:true},
 stadttor:{name:'Stadttor',text:'Das Stadttor. Die Wachen schauen weg. Gegen Gebühr schauen sie noch weiter weg.'},
 steingasse:{name:'Steingasse',text:'Eine Steingasse. Hohe Häuser, schmaler Himmel, viele Fenster.'},
 platz:{name:'Stadtplatz',text:'Der Stadtplatz. Ein Brunnen, Tauben und Leute, die sehr schnell verschwinden.'},
 hafen:{name:'Hafenkai',text:'Der Kai. Möwen, Fischgestank und Männer mit sehr kurzen Geduldsfäden.'},
 gerberei:{name:'Gerberei',text:'Die Gerberei. Riecht wie ein Pferd, das ein anderes Pferd gegessen hat.'},
 villa:{name:'Villa',text:'Die Villa. Marmor, Wachen und ein Springbrunnen in Form eines Geldsacks.',boss:true}
};
D.STATIONS=THEMES;
const SEASONS=['fruehling','sommer','herbst','winter'],TIMES=['morgen','mittag','nachmittag','abend'];
const MOOD_TEXT={fruehling:'Frühling',sommer:'Sommer',herbst:'Herbst',winter:'Winter',morgen:'früher Morgen',mittag:'Mittag',nachmittag:'später Nachmittag',abend:'Abenddämmerung',klar:'klarer Himmel',bewoelkt:'grauer Himmel',nebel:'Nebel zwischen den Dächern',regen:'Nieselregen',schnee:'leichter Schneefall'};
D.moodText=m=>`${MOOD_TEXT[m.season]}, ${MOOD_TEXT[m.time]}, ${MOOD_TEXT[m.weather]}.`;
// Herumstehen: was die Trottel tun, bevor sie euch sehen
const IDLE=D.IDLE=[
 {act:'fire',hold:'beer',text:'{A} und {B} sitzen am Feuer und würfeln. Der Einsatz ist ein Ohr. Wessen, ist noch offen.'},
 {act:'barrel',hold:'beer',text:'{A} lehnt an einem Fass und trinkt, als wäre jedes Bier seine letzte Rate.'},
 {act:'wall',hold:null,text:'{A} pinkelt an eine Hauswand und summt ein Lied über Zinsen.'},
 {act:'whet',hold:null,text:'{A} schärft eine Klinge an einem Grabstein. {B} schaut zu und nickt anerkennend.'},
 {act:'argue',hold:'bottle',text:'{A} und {B} streiten lautstark, wer wem mehr schuldet. Beide verlieren.'},
 {act:'pigs',hold:null,text:'{A} füttert die Schweine mit etwas, das verdächtig nach einem Stiefel aussieht.'},
 {act:'sleep',hold:'bottle',text:'{A} schläft im Stehen. {B} malt ihm mit Ruß einen Schnurrbart.'},
 {act:'count',hold:null,text:'{A} zählt Münzen und kommt bei jedem Durchgang auf weniger.'}
];
D.generate=function(seed,biome='dorf',o={}){
 const r=rng32(seed),B=BIOMES[biome]||BIOMES.dorf,henchmen=o.henchmen??D.CFG.henchmen;
 const name=pick(r,B.pre)+pick(r,B.suf),name2=name.charAt(0).toUpperCase()+name.slice(1);
 const season=pick(r,SEASONS),time=pick(r,TIMES),weather=season==='winter'?pick(r,['klar','bewoelkt','schnee','schnee','nebel']):pick(r,['klar','klar','bewoelkt','nebel','regen']);
 const mood={season,time,weather};
 const themes0=o.groups?shuffle(r,B.themes):null,sections=[],stations=[];
 if(o.wagon){// Wagenüberfall: ein Abschnitt am Weg, die Truppe liegt auf der Lauer
  const theme=pick(r,{dorf:['feldrand','hof','muehle'],wald:['waldweg','bachlauf','lichtung'],stadt:['stadttor','hafen']}[biome]||['waldweg']),W=Math.round(2700+r()*300),sec={i:0,theme,W,seed:(r()*4294967296)>>>0,stations:[0],boss:true,single:true};
  stations.push({i:0,sec:0,theme,name:THEMES[theme].name,boss:true,count:0,seed:(r()*4294967296)>>>0,fx:Math.round(W*.45),kind:'wagon',banter:0});sections.push(sec);}
 else if(o.groups){// Plünderung (seit 26.10.): jeder Abschnitt hat genau eine Begegnung, kleinere Karten (kurzer Marsch), am Ende der Anführer mit seiner Bande
  o.groups.forEach((cnt,si)=>{const theme=si===0&&biome==='dorf'?(r()<.5?'feldrand':themes0[0]):themes0[si%themes0.length];
   const W=Math.round(2250+r()*350),sec={i:si,theme,W,seed:(r()*4294967296)>>>0,stations:[],single:true};
   const st={i:stations.length,sec:si,theme,name:THEMES[theme].name,boss:false,count:cnt,seed:(r()*4294967296)>>>0,fx:Math.round(W*(.58+r()*.06)),kind:o.kinds?.[si]||'idle',idle:pick(r,IDLE),banter:Math.floor(r()*1e6)};
   sec.stations.push(st.i);stations.push(st);sections.push(sec);});
  const bossTheme=o.finalTheme||B.boss,bW=Math.round(2350+r()*300),bs={i:sections.length,theme:bossTheme,W:bW,seed:(r()*4294967296)>>>0,stations:[stations.length],boss:true,single:true};
  stations.push({i:stations.length,sec:bs.i,theme:bossTheme,name:THEMES[bossTheme].name,boss:true,count:o.escort||0,seed:(r()*4294967296)>>>0,fx:Math.round(bW*.6),kind:'boss',idle:pick(r,IDLE),banter:0});
  sections.push(bs);}
 else{
 // Begegnungen: 4 oder 5, je 2–3 Trottel
 const n=henchmen>=10&&henchmen<=12?(r()<.5?4:5):Math.max(1,Math.min(7,Math.ceil(henchmen/2.5)));
 let counts=Array(n).fill(Math.floor(henchmen/n));for(let k=0,rest=henchmen-counts.reduce((a,b)=>a+b,0);k<rest;k++)counts[k%n]++;counts=shuffle(r,counts);
 // auf 3 Abschnitte verteilen (1–2 je Abschnitt), dann Zielabschnitt
 const per=n<=2?Array(n).fill(1):n===3?shuffle(r,[1,1,1]):n===4?shuffle(r,[1,1,2]):n===5?shuffle(r,[2,2,1]):shuffle(r,Array.from({length:3},(_,k)=>Math.floor(n/3)+(k<n%3?1:0)));
 const themes=shuffle(r,B.themes);let ci=0;
 per.forEach((k,si)=>{const theme=si===0&&biome==='dorf'?(r()<.5?'feldrand':themes[0]):themes[si%themes.length];
  const W=Math.round(3600+Math.max(0,k-1)*900+k*300+r()*500);const sec={i:si,theme,W,seed:(r()*4294967296)>>>0,stations:[]};
  for(let j=0;j<k;j++){const fx=Math.round(W*(k===1?.6+r()*.12:k===2?(j===0?.38:.74)+(r()-.5)*.06:.3+.5*j/(k-1)+(r()-.5)*.04));
   const kind=pick(r,['idle','idle','idle','doors','ambush','ahead']);
   const st={i:stations.length,sec:si,theme,name:THEMES[theme].name,boss:false,count:counts[ci++],seed:(r()*4294967296)>>>0,fx,kind,idle:pick(r,IDLE),banter:Math.floor(r()*1e6)};
   sec.stations.push(st.i);stations.push(st);}
  sections.push(sec);});
 const bossTheme=o.finalTheme||B.boss,bW=Math.round(3200+r()*400),bs={i:sections.length,theme:bossTheme,W:bW,seed:(r()*4294967296)>>>0,stations:[stations.length],boss:true};
 stations.push({i:stations.length,sec:bs.i,theme:bossTheme,name:THEMES[bossTheme].name,boss:true,count:0,seed:(r()*4294967296)>>>0,fx:Math.round(bW*.66),kind:'boss',banter:0});
 sections.push(bs);}
 // Übersichtskarte (480×270): gewundener Weg vom Eingang (links) zum Ziel (rechts), Stationen auf dem Weg
 const MW=480,MH=270,pts=[];let y=40+r()*190;const total=stations.length+1;
 for(let k=0;k<=total*3;k++){const t=k/(total*3);y=clamp(y+(r()-.5)*44,26,MH-26);pts.push({x:Math.round(16+t*(MW-36)),y:Math.round(y)});}
 stations.forEach((s,k)=>{const p=pts[(k+1)*3];s.mx=p.x;s.my=p.y;});
 const feats=[],near=(x,y,d)=>pts.some(p=>Math.hypot(p.x-x,p.y-y)<d);
 const cnt=biome==='wald'?520:biome==='stadt'?260:220;
 for(let k=0;k<cnt;k++){const x=Math.round(r()*MW),y=Math.round(r()*MH);if(near(x,y,7))continue;
  let kind;if(biome==='wald')kind=r()<.92?'tree':'rock';else if(biome==='stadt')kind=near(x,y,60)?'house':r()<.5?'tree':'field';else kind=near(x,y,34)&&r()<.75?'house':r()<.55?'tree':'field';
  feats.push({kind,x,y,w:kind==='field'?14+Math.round(r()*24):kind==='house'?5+Math.round(r()*4):3,h:kind==='field'?8+Math.round(r()*12):kind==='house'?4+Math.round(r()*3):3,v:r()});}
 const river=biome!=='stadt'&&r()<.75?{x:Math.round(90+r()*300),bend:(r()-.5)*80}:null;
 const pond=biome==='dorf'&&r()<.6?{x:Math.round(60+r()*360),y:Math.round(40+r()*190),r:8+Math.round(r()*8)}:null;
 return {seed,biome,label:B.label,name:name2,mood,sections,stations,map:{W:MW,H:MH,pts,feats,river,pond},oneFight:!!(o.groups||o.wagon),wagon:!!o.wagon};
};

// ---------- Figuren ----------
const ROLE_WEAPONS={Soldat:['gladius','short','long','axe','mace','club','hammer','spear','trident'],Assassine:['dagger','short'],Fernkämpfer:['bow','crossbow']};
function bestWeapon(g){const list=ROLE_WEAPONS[g.role]||ROLE_WEAPONS.Soldat;return list.reduce((a,b)=>(g.mastery[b]||0)>(g.mastery[a]||0)?b:a,list[0]);}
// Testtruppe: frische Durchschnittsrekruten, voll mit improvisierter Ausrüstung (Qualität 0)
D.makeParty=function(seed,n=5){const r=rng32(seed),roles=['Soldat','Soldat','Soldat','Assassine','Fernkämpfer'];
 return Array.from({length:n},(_,i)=>makeG((seed+i*7919)>>>0,g=>{g.id='debt-p'+i+'-'+seed;g.role=roles[i%roles.length];
  const w=bestWeapon(g),ranged=g.role==='Fernkämpfer',q=0;
  g.enemyGear={weapon:M.makeItem('weapon',ranged?w:w,q),secondary:ranged?M.makeItem('weapon','dagger',q):null,
   shield:g.role==='Soldat'?M.makeItem('shield','roundshield',q):g.role==='Assassine'?M.makeItem('shield','buckler',q):null,armor:{}};
  for(const d of M.armorDefs)g.enemyGear.armor[d.id]=M.makeItem('armor',d.id,q,g.role==='Soldat'?'metal':'leather');
  for(const it of D.gearList(g))it.durability=it.maxDurability;}));};
D.gearList=g=>{const e=g.enemyGear||{};return [e.weapon,e.secondary,e.shield,...Object.values(e.armor||{})].filter(Boolean);};

// Dorftrottel: extrem schwach, aber manche haben halbwegs ordentliche Waffen (höchstens „Solide“)
const H_WEAPONS=[['club',0,5],['trident',0,4],['axe',0,4],['spear',0,4],['short',0,3],['hammer',0,2],['axe',1,3],['spear',1,3],['mace',1,3],['short',1,2],['gladius',1,3],['long',1,2],['gladius',2,1.3],['mace',2,1],['long',2,.8],['axe',2,.8]];
D.henchman=function(seed,idx,used=new Set(),o={}){const r=rng32(seed),TX=o.texts||T,k=o.k??D.CFG.enemyStat;
 return makeG(seed,g=>{let nm=pick(r,TX.names||T.names);for(let j=0;j<8&&used.has(nm);j++)nm=pick(r,TX.names||T.names);used.add(nm);
  g.id='debt-h'+idx+'-'+seed;g.name=nm;g.enemy=true;g.role='Soldat';g.traits=r()<.4?['Aggressiv']:[];
  scaleStats(g,k,['morale']);g.stats.morale=clamp(Math.round(40+r()*25),10,100);
  let w,q;{const tot=H_WEAPONS.reduce((a,x)=>a+x[2],0);let x=r()*tot;for(const e of H_WEAPONS){x-=e[2];if(x<=0){w=e[0];q=e[1];break;}}w??='club';q??=0;if(k>.8&&r()<k-.8)q=Math.min(3,q+1);}
  const two=['hammer','doubleaxe','halberd','greatsword'].includes(w);
  g.enemyGear={weapon:M.makeItem('weapon',w,q),secondary:null,shield:!two&&r()<.3?M.makeItem('shield',r()<.6?'buckler':'smallshield',0):null,armor:{}};
  if(r()<.35)g.enemyGear.armor.helm=M.makeItem('armor','helm',0,'leather');
  if(r()<.25)g.enemyGear.armor.chestplate=M.makeItem('armor','chestplate',0,'leather');
  for(const it of D.gearList(g))it.durability=Math.round(it.maxDurability*(.6+r()*.4));
  g.debtOwes=pick(r,TX.owes);g.debtShout=pick(r,TX.shout);
 });};
// Krassus Knochenzins: ein bisschen stärker, solider Zweihänder
D.boss=function(seed){return makeG(777001,g=>{const r=rng32(seed);
 Object.assign(g,{id:'debt-boss-'+seed,name:'Krassus Knochenzins',enemy:true,role:'Soldat',age:47,height:197,weight:118,muscle:66,fat:22,traits:['Aggressiv']});
 g.arm=Math.round(g.height*.43);g.leg=Math.round(g.height*.49);
 scaleStats(g,D.CFG.bossStat,['morale']);g.stats.morale=90;
 for(const k of ['strength','toughness','pain','will'])g.stats[k]=clamp(Math.round(g.stats[k]*1.15),3,100);
 g.mastery.greatsword=clamp(Math.max(g.mastery.greatsword,Math.round(32*D.CFG.bossStat)),3,100);
 g.appearance={...g.appearance,skin:'#c99a74',shade:'#8a6046',hair:'#1c1614',style:0,beard:3,cloth:'#2a1f2e',voice:.82};
 g.teeth={missing:[],gold:[0,1,2,3,4,5,6,7]};
 g.scars=[{part:'head',reason:'Schuldner mit Bratpfanne',day:0}];
 const sword=M.makeItem('weapon','greatsword',2);sword.name='Zinseszins';sword.nickname='Zinseszins';
 g.enemyGear={weapon:sword,secondary:null,shield:null,armor:{
  chestplate:M.makeItem('armor','chestplate',1,'medium'),leftshoulder:M.makeItem('armor','leftshoulder',1,'medium'),rightshoulder:M.makeItem('armor','rightshoulder',1,'medium'),
  leftarm:M.makeItem('armor','leftarm',1,'leather'),rightarm:M.makeItem('armor','rightarm',1,'leather'),leftleg:M.makeItem('armor','leftleg',0,'leather'),rightleg:M.makeItem('armor','rightleg',0,'leather')}};
 for(const it of D.gearList(g))it.durability=it.maxDurability;
 g.debtBoss=true;void r;});};

// ---------- Schwierigkeit der Plünderungen (1–5 Totenköpfe) ----------
// Alles relativ zur Stärke der Gruppe (D.partyStrength) und ihrer Größe. Ein Wert s steuert: Stärke der Leute (k ∝ s^.75), ihre Anzahl,
// wie viele gleichzeitig angreifen, wie oft ein Grobian (groß, schwer, stark) oder ein Veteran (deutlich stärker, bessere Waffe) dabei ist.
// Der Anführer trägt in der Regel eine Waffe eine Stufe besser als sonst, ab 4 Totenköpfen zwei. Ziel: 1 Totenkopf ≈ 95 % Siege, 5 ≈ 5 %.
// Gemessen mit frischen Rekruten: Kleine Gruppen litten vor allem unter dem Zahlenverhältnis (3 Kämpfer gegen ~7, 8 gegen ~12, höchstens
// 2 bzw. 3 gleichzeitig). Darum wachsen Bandengröße und gleichzeitige Angreifer jetzt proportional zur Gruppe; s × (Größe/5)^0,4 gleicht den Rest aus; unter 5 Kämpfern s × (Größe/5)^2,5 und ein schwächerer Anführer.
D.DIFF={s:[.47,1,1.28,1.75,2.25],names:['Spaziergang','Rauferei','Ernst','Gemetzel','Selbstmord'],gold:[.7,1,1.45,2.1,3.2],sizeExp:.4,smallExp:2.5};
// kleine Gruppen (unter 5) nutzen sich über mehrere Begegnungen stark ab: dort deutlich schwächere Banden
D.diffScale=(d,size)=>{const i=clamp(Math.round(d||3),1,5)-1,r=Math.max(1,size)/5;return D.DIFF.s[i]*Math.pow(r,r<1?D.DIFF.smallExp:D.DIFF.sizeExp);};
function brute(g,r,q){g.brute=true;g.height=Math.round(196+r()*16);g.weight=Math.round(112+r()*24);g.muscle=Math.min(80,(g.muscle||40)+18);g.arm=Math.round(g.height*.43);g.leg=Math.round(g.height*.49);
 for(const k of ['strength','toughness','pain','will'])g.stats[k]=clamp(Math.round(g.stats[k]*1.35),3,100);for(const p of Object.values(g.body))p.strength=clamp(Math.round(p.strength*1.3),3,100);
 const w=pick(r,['hammer','club','axe','mace','doubleaxe']);g.enemyGear.weapon=M.makeItem('weapon',w,Math.min(4,q));g.enemyGear.shield=null;}
function veteran(g,r,q){g.veteran=true;for(const grp of ['stats','moves','mastery'])for(const k in g[grp]){if(k==='morale')continue;g[grp][k]=clamp(Math.round(g[grp][k]*1.4),3,100);}
 const w=g.enemyGear.weapon?.def||'gladius';g.enemyGear.weapon=M.makeItem('weapon',w,Math.min(5,q+1));g.mastery[w]=clamp(Math.max(g.mastery[w]||0,30),3,100);
 g.enemyGear.armor.helm??=M.makeItem('armor','helm',Math.max(0,q-1),'leather');g.enemyGear.armor.chestplate??=M.makeItem('armor','chestplate',Math.max(0,q-1),r()<.4?'medium':'leather');for(const it of D.gearList(g))it.durability=it.maxDurability;}
D.brute=brute;D.veteran=veteran;
// Anführer einer Bande (Plünderung): einer der Berüchtigten seiner Stufe (outside-notorious.js, bosses-1…5.js: Aussehen, Texte, Trophäe),
// deutlich stärker als seine Leute. Seit 27.10. (Wunsch Thomas): Jede Stufe (1–5 Totenköpfe) hat jede der 18 Waffengattungen genau einmal;
// der Anführer führt immer seine Gattung (Bogen/Armbrust als Fernkämpfer mit Dolch, Wurfspeer/Wurfaxt als Assassine mit Klinge,
// Wurfnetz als Soldat mit Dreizack). Ausrüstung zwei Stufen über der Bande: Waffe und Rüstung zwei Güteklassen höher (höchstens
// „Legendär“), Rüstung zwei Klassen über dem Leder der Bande (Metall), dazu mehr Teile (Arme ab 3, Beine ab 4 Totenköpfen).
const FEMALE=['Hilde','Livia','Agrippina','Fulvia','Gerlinde','Messalina','Brunhild','Octavia','Kunigunde','Valeria'];
D.LEADER={stat:1.12,maxStat:2.4,gearUp:2,maxQ:6};
// Zweitwaffe und Klasse je Hauptwaffe
D.LEADER_KIT={bow:['Fernkämpfer','dagger'],crossbow:['Fernkämpfer','dagger'],javelin:['Assassine','gladius'],throwaxe:['Assassine','axe'],net:['Soldat','trident']};
D.leader=function(seed,biome,k,bonus=1,o={}){const r=rng32(seed),AD=D.ADV[biome]||D.ADV.dorf,NT=window.DebtNotorious,diff=clamp(Math.round(o.diff||3),1,5);
 return makeG(seed^0x1ead,g=>{const all=NT?NT.TYPES:[],tier=all.filter(t=>t.tier===diff),base=tier.length?tier:all,types=base.filter(t=>!(o.avoid||[]).includes(t.id)),pool0=types.length?types:base,ty=pool0.length?pool0[Math.floor(r()*pool0.length)]:null;
  const nm=ty?.female||ty?.id==='witwe'?pick(r,FEMALE):pick(r,AD.names||T.names).split(' ')[0];
  const w=ty?.weapon||pick(r,['greatsword','long','axe','mace','gladius','doubleaxe','hammer','spear']),kit=D.LEADER_KIT[w]||['Soldat',null];
  Object.assign(g,{id:'adv-lead-'+seed,name:ty?nm+' '+ty.title.charAt(0).toUpperCase()+ty.title.slice(1):nm+' '+pick(r,AD.leaderTitle),enemy:true,role:kit[0],traits:['Aggressiv']});
  if(ty&&/^(der|die|das) /.test(ty.title))g.name=nm+' '+ty.title;
  scaleStats(g,Math.min(D.LEADER.maxStat,k*2.2*D.LEADER.stat),['morale']);g.stats.morale=85;
  const qBand=clamp(Math.round((k-.4)*2.2),0,3),up=D.LEADER.gearUp,q=clamp(qBand+up,0,D.LEADER.maxQ);void bonus;
  g.mastery[w]=clamp(Math.max(g.mastery[w]||0,Math.round(30*k*2.2)),3,100);if(kit[1])g.mastery[kit[1]]=clamp(Math.max(g.mastery[kit[1]]||0,Math.round(22*k*2.2)),3,100);
  const two=['hammer','doubleaxe','halberd','greatsword','bow','crossbow'].includes(w),mat='metal',aq=q,A=(id,m=mat)=>M.makeItem('armor',id,aq,m);
  const armor={chestplate:A('chestplate'),leftshoulder:A('leftshoulder'),rightshoulder:A('rightshoulder')};
  if(!ty?.noHelm)armor.helm=A('helm');if(diff>=3){armor.leftarm=A('leftarm');armor.rightarm=A('rightarm');}if(diff>=4){armor.leftleg=A('leftleg');armor.rightleg=A('rightleg');}
  const weapon=M.makeItem('weapon',w,q);if(ty)weapon.nickname=pick(r,ty.nick);
  const shield=kit[0]==='Soldat'&&!two&&w!=='net'&&!ty?.oneHand&&!ty?.noShield?M.makeItem('shield',r()<.5?'roundshield':'smallshield',Math.max(0,q-1)):null;
  g.enemyGear={weapon,secondary:kit[1]?M.makeItem('weapon',kit[1],Math.max(0,q-1)):null,shield,armor};
  for(const it of D.gearList(g))it.durability=it.maxDurability;
  if(ty)NT.dress(g,ty.id,r,diff);
  g.advLeader=true;g.debtBoss=true;});};
// Stärke einer Truppe relativ zu frischen Rekruten (für die Bandenstärke der Abenteuer)
let REF=null;function refPower(){if(REF)return REF;let sum=0;for(let i=0;i<8;i++){const g=makeG(9001+i*7);sum+=power(g);}return REF=sum/8;}
function power(g){const st=g.stats||{},keys=['strength','agility','speed','stamina','toughness','reflex','block','experience'].filter(k=>k in st);const v=keys.reduce((a,k)=>a+st[k],0)/Math.max(1,keys.length);const hp=g.dead?0:M.health(g)/100;return v*(.4+.6*hp);}
D.partyStrength=party=>{const live=party.filter(D.fit);if(!live.length)return 1;return clamp(live.reduce((a,g)=>a+power(g),0)/live.length/refPower(),.6,4);};

// ---------- Mission ----------
D.fit=g=>!g.dead&&!g.smithDuty&&!M.incapacitated(g);
// kind 'quest' = Der Schuldeneintreiber (feste Zahlen); 'adventure' = zufälliges Abenteuer, an die Gruppe angepasst
D.newMission=function(seed,party,biome='dorf',o={}){
 const kind=o.kind||'quest';
 if(kind==='quest'){const place=D.generate(seed,biome),used=new Set();let n=0;
  const queues=place.stations.map(s=>s.boss?[D.boss(seed)]:Array.from({length:s.count},()=>D.henchman((s.seed+(n++)*104729)>>>0,n,used)));
  return {kind,seed,place,party,queues,idx:0,sec:0,cleared:-1,loot:[],gold:0,killed:0,total:queues.flat().length,state:'ready',deaths:[],learn:o.learn!==false};}
 const AD=D.ADV[biome]||D.ADV.dorf,r=rng32(seed^0xad7),str=o.strength??D.partyStrength(party),size=party.filter(D.fit).length||1;
 // Schwierigkeit (1–5 Totenköpfe, ohne Angabe 3): s skaliert Stärke, Anzahl, gleichzeitige Angreifer, Grobiane und Veteranen
 const diff=clamp(Math.round(o.diff||3),1,5),sc=o.s??D.diffScale(diff,size);
 // Größere Gruppen treffen auf größere Banden; stärkere Gruppen auf härtere Leute
 const henchmen=clamp(Math.round((size*1.45+r()*2.2)*(.75+.25*sc)),3,20),k=clamp(D.CFG.advStat*Math.pow(str,.85)*Math.pow(sc,.75),.12,2.2);
 const maxActive=clamp(Math.round(size*.45*Math.sqrt(sc)),2,6),pBrute=clamp((sc-1.05)*.3,0,.3),pVet=clamp((sc-.75)*.16,0,.25),qBase=clamp(Math.round((k-.4)*2.2),0,3);
 // Eine Begegnung je Abschnitt (seit 26.10.): drei ungleich große Gruppen (manchmal eine besonders große), am Ende der Anführer mit seiner Leibwache.
 // Die Gesamtzahl bleibt wie bisher; die Leibwache ist etwas zäher (öfter Grobiane und Veteranen).
 // Kleine Banden (kleine Gruppen) haben weniger Abschnitte, damit die Gesamtzahl bleibt.
 const escort=henchmen<=4?1:clamp(Math.round(henchmen*.24),2,6),rest=Math.max(1,henchmen-escort),nSec=clamp(Math.round(rest/3),1,D.CFG.advSections);
 const wts=Array.from({length:nSec},()=>.7+r()*.8);if(nSec>1&&r()<.45)wts[Math.floor(r()*nSec)]*=1.45;const sw=wts.reduce((a,b)=>a+b,0);
 const front=Math.max(2,maxActive),gmin=rest>=2*nSec?2:1,groups=wts.map(w=>clamp(Math.round(rest*w/sw),gmin,front+10)),kinds=groups.map((_,i)=>r()<(i===0?.3:.42)?'ambush':'idle');
 const place=D.generate(seed,biome,{henchmen,finalTheme:pick(r,AD.finals),groups,kinds,escort}),used=new Set();let n=0;
 const mk=(s0,bonus=0)=>{const g=D.henchman((s0+(n++)*104729)>>>0,n,used,{k,texts:AD}),bB=pBrute>0?bonus:0,bV=pVet>0?bonus:0,x=r();if(x<pBrute+bB)brute(g,r,qBase+1);else if(x<pBrute+bB+pVet+bV)veteran(g,r,qBase+1);return g;};
 const queues=place.stations.map(s=>s.boss?[D.leader(seed,biome,k*Math.min(1,Math.pow(size/5,.6)),diff>=4?2:1,{diff,avoid:o.avoid}),...Array.from({length:s.count},()=>mk(s.seed,.08))]:Array.from({length:s.count},()=>mk(s.seed)));
 const gold=Math.round((D.CFG.advGold[0]+r()*(D.CFG.advGold[1]-D.CFG.advGold[0]))*(.6+k)*(1+henchmen/12)*D.DIFF.gold[diff-1]);
 return {kind,seed,place,party,queues,idx:0,sec:0,cleared:-1,loot:[],gold:0,goldPrize:gold,killed:0,total:queues.flat().length,state:'ready',deaths:[],learn:o.learn!==false,strength:str,enemyK:k,texts:AD,diff,scale:sc,maxActive,brutes:queues.flat().filter(g=>g.brute).length,veterans:queues.flat().filter(g=>g.veteran).length,
  boss:queues[queues.length-1][0],escort,groups};
};
D.pickBanter=(st,seed,m)=>{const B=m?.kind==='adventure'?D.ADV.banter:T.banter;return B[(seed>>>0)%B.length];};
const TACTICS=[{aggression:'Ausgeglichen',formation:'Normal',priority:'Nächster Gegner',ranged:'Abstand halten',help:'Normal'},{aggression:'Aggressiv',formation:'Normal',priority:'Nächster Gegner',ranged:'Abstand halten',help:'Normal'}];
D.marginX=W=>78*W/1040;
// Abschnitt aufbauen: eine breite Karte, durch die die Truppe marschiert. Der Kampf ruht, bis eine Begegnung beginnt.
D.startSection=function(m,si,o={}){
 const sec=m.place.sections[si],L=D.layout(sec,m.place),W=sec.W;m.sec=si;
 const fighters=m.party.filter(D.fit),x0=D.marginX(W)+46;
 const py0=D.pathY(L,x0+60);const actors=fighters.map((g,k)=>{const a=M.createCombatActor(g,0,k);if(a.ammo>0)a.ammo=Math.round(a.ammo*D.CFG.partyAmmo);const col=k%3,line=Math.floor(k/3);a.x=o.headless?x0+60:x0-150-line*52-(col===1?0:20);a.y=py0+(col-1)*52+(line%2?14:0);a.r=12;a.a=0;a.cool=.6+(k%3)*.12;return a;});
 const b={id:'outside-'+m.seed+'-s'+si,benchmark:true,mission:m,section:si,L,actors,opponent:m.kind==='adventure'?(m.texts?.band||'Bande'):'Dorftrottel',champion:false,time:0,type:'mission',league:0,log:[],paused:true,result:null,lastSave:0,obstacles:L.obstacles.map(x=>({...x})),fee:0,
  teamTactics:M.copy(TACTICS),leaders:[null,null],moraleBonus:[0,0],width:W,height:L.H,groundWeapons:[],dropped:[],
  queue:[],spawns:[],spawnT:1,spawnIndex:0,gearSnap:new Map(fighters.map(g=>[g,g.enemyGear?{...g.enemyGear,armor:{...g.enemyGear.armor}}:{equipment:{...g.equipment,armor:{...(g.equipment.armor||{})}}}])),enemiesAll:[],encEnemies:[],events:[],started:false,done:null,bossHurt:false,encounter:-1,triggered:new Set()};
 // Missionskämpfe gehören nicht in den Spielstand (Grafik, Karten, Verweise); nach dem Neuladen ist die Truppe einfach zurück.
 Object.defineProperty(b,'toJSON',{value:()=>null,enumerable:false});
 S.battle=b;M.stains=[];M.limbs=[];M.swings=[];M.floaters=[];M.shake=0;
 for(const p of [...(M.fx||[]),...(M.shots||[])])p.active=false;
 if(m.prevLimit===undefined)m.prevLimit=M.benchmarkTimeLimit??null;M.benchmarkTimeLimit=1e9;
 return b;
};
// Begegnung starten: Gegner, die herumstehen, werden zu Kämpfern; Nachschub kommt aus Türen, von vorn oder von hinten.
D.beginEncounter=function(b,m,stIdx){const st=m.place.stations[stIdx],E=b.L.enc[stIdx];m.idx=stIdx;
 b.encounter=stIdx;b.queue=[...m.queues[stIdx]];b.encStart=b.time;b.encEnemies=[];b.spawns=E.spawns;b.spawnIndex=0;b.spawnT=1.4;b.done=null;b.handled=false;b.triggered.add(stIdx);
 const first=[];
 if(st.kind==='idle'||st.kind==='boss'){E.idle.slice(0,Math.min(m.maxActive||D.CFG.maxActive,b.queue.length)).forEach(p=>first.push(D.spawn(b,{pos:p,instant:true,quiet:true})));}
 else if(st.kind==='ambush'){first.push(D.spawn(b,{pos:E.behind}));if(b.queue.length)first.push(D.spawn(b,{pos:E.ahead}));}
 else if(st.kind==='ahead'){first.push(D.spawn(b,{pos:E.ahead}));if(b.queue.length)first.push(D.spawn(b,{pos:{x:E.ahead.x+40,y:clamp(E.ahead.y+90,b.L.mT+40,b.L.mB-30),label:E.ahead.label}}));}
 else{first.push(D.spawn(b));}
 b.started=true;b.timeLimitAt=b.time+D.CFG.timeLimit;return first.filter(Boolean);
};
D.activeEnemies=b=>b.actors.filter(a=>a.team===1&&!a.down&&!a.g.dead&&!a.surrendered).length;
D.spawn=function(b,o={}){if(!b.queue.length)return null;const g=b.queue.shift(),k=b.enemiesAll.length,a=M.createCombatActor(g,1,k);
 const sp=o.pos||b.spawns[b.spawnIndex++%Math.max(1,b.spawns.length)]||{x:b.width-D.marginX(b.width)-30,y:D.pathY(b.L,b.width-D.marginX(b.width)-30),label:'dem Nichts'};
 a.x=sp.x;a.y=sp.y;a.r=g.debtBoss?14:12;a.cool=o.instant?.5:.9;a.a=sp.face??Math.PI;
 b.actors.push(a);b.enemiesAll.push(a);b.encEnemies.push(a);if(!o.quiet)b.events.push({type:'spawn',actor:a,door:sp.label||''});return a;};
D.tick=function(b,dt){if(!b||b.done||!b.started||b.paused)return;
 if(b.queue.length&&D.activeEnemies(b)<(b.mission?.maxActive||D.CFG.maxActive)){b.spawnT-=dt;if(b.spawnT<=0){D.spawn(b);const r=Math.random();b.spawnT=D.CFG.spawnDelay[0]+r*(D.CFG.spawnDelay[1]-D.CFG.spawnDelay[0]);}}
 const boss=b.encEnemies.find(a=>a.g.debtBoss);if(boss&&!b.bossHurt&&!boss.down&&M.health(boss.g)<55){b.bossHurt=true;b.events.push({type:'bossHurt',actor:boss});}
 D.unstick(b,dt);
 // Verschnaufpause zwischen zwei Gegnern: Luft holen statt erschöpft weiterzutorkeln
 if(!D.activeEnemies(b)&&D.CFG.breather>0)for(const a of b.actors)if(a.team===0&&!a.down&&!a.g.dead&&!(a.fallTimer>0)){const ef=M.effective(a);a.energy=Math.min(ef.maxEnergy,a.energy+ef.regen*dt*D.CFG.breather);}
 // Patt nach langer Zeit: Dorftrottel verlieren die Nerven (Krassus nie)
 if(b.time-b.encStart>150&&!b.queue.length){for(const a of b.encEnemies)if(!a.down&&!a.g.dead&&!a.surrendered&&!a.g.debtBoss){a.surrendered=true;a.state='idle';b.events.push({type:'gaveup',actor:a});}}
 if(b.time>b.timeLimitAt&&!b.done){b.paused=true;b.done={winner:-1,reason:'Zeitlimit'};}
};
// Steckenbleiben im Gefecht lösen: Die Kampf-KI läuft geradeaus auf ihr Ziel zu. Wer 2,5 s an einem Baum oder Haus klebt, ohne einen
// Gegner zu erreichen, bekommt einen Umweg (A*) und wird ihn entlang geführt. Fernkämpfer ohne freie Schusslinie (Gebäude, Bäume im Weg)
// suchen sich nach 3 s ohne Schuss eine Stelle mit freier Linie in Schussweite und gehen dorthin.
const RANGED=['bow','crossbow','javelin','throwaxe'];
function firingSpot(b,a,f,range){let best=null,bd=1e9;for(const k of [.5,.68,.85])for(let n=0;n<20;n++){const an=n/20*Math.PI*2,x=f.x+Math.cos(an)*range*k,y=f.y+Math.sin(an)*range*k;
 if(!D.navFreeAt(b,x,y)||!D.clearShot(b,{x,y},f))continue;const d=Math.hypot(x-a.x,y-a.y);if(d<bd){bd=d;best={x,y};}}return best;}
D.unstick=function(b,dt=0){if(!b.L)return;const now=b.time;
 if(now-(b.unstickT||0)>=.5){b.unstickT=now;
  for(const a of b.actors){if(a.down||a.g.dead||a.surrendered||a.grabbedBy||a.rearFinish){a.stuck=null;a.detour=null;continue;}
   const foes=b.actors.filter(o=>o.team!==a.team&&!o.down&&!o.g.dead&&!o.surrendered);if(!foes.length){a.detour=null;continue;}
   const f=foes.reduce((m,o)=>Math.hypot(o.x-a.x,o.y-a.y)<Math.hypot(m.x-a.x,m.y-a.y)?o:m,foes[0]),d=Math.hypot(f.x-a.x,f.y-a.y);
   const w=M.gear(a.g,'weapon'),ranged=a.ammo>0&&w&&RANGED.includes(w.def),range=ranged?(M.effective?.(a)?.range||300):0;
   if(a.lastAmmo!==a.ammo){a.lastAmmo=a.ammo;a.shotT=now;}
   const s=a.stuck||(a.stuck={x:a.x,y:a.y,t:now});if(Math.hypot(a.x-s.x,a.y-s.y)>14){a.stuck={x:a.x,y:a.y,t:now};}
   if(a.detour){const done=d<80||now-a.detour.t>9||(ranged&&d<range*.95&&D.clearShot(b,a,f));if(done)a.detour=null;continue;}
   const touching=b.obstacles.some(o=>o.hp>0&&o.type!=='barrel'&&Math.hypot(o.x-a.x,o.y-a.y)<o.r+(a.r||12)+12),still=now-a.stuck.t>=3;
   if(ranged){if(still&&d>90&&d<range*1.6&&now-Math.max(a.shotT??-1e9,b.encStart??0)>3&&!D.clearShot(b,a,f)){const spot=firingSpot(b,a,f,range);const path=spot&&D.findPath(b,a.x,a.y,spot.x,spot.y);if(path){a.detour={pts:path,t:now,why:'shot'};b.events.push({type:'detour',actor:a,why:'shot'});}}continue;}
   if(now-a.stuck.t>=2.5&&touching&&d>70){const path=D.findPath(b,a.x,a.y,f.x,f.y);if(path){a.detour={pts:path,t:now,why:'stuck'};a.stuck={x:a.x,y:a.y,t:now};}}}}
 // entlang des Umwegs führen (die KI drückt weiter Richtung Ziel; der Umweg führt sie um das Hindernis herum)
 if(dt>0)for(const a of b.actors){const dd=a.detour;if(!dd)continue;if(a.down||a.g.dead||a.grabbedBy||a.rearFinish){a.detour=null;continue;}
  let step=78*dt;while(step>0&&dd.pts.length){const p=dd.pts[0],dx=p.x-a.x,dy=p.y-a.y,l=Math.hypot(dx,dy);if(l<=step){a.x=p.x;a.y=p.y;dd.pts.shift();step-=l;}else{a.x+=dx/l*step;a.y+=dy/l*step;a.a=Math.atan2(dy,dx);step=0;}}
  if(!dd.pts.length)a.detour=null;}};

// ---------- Wegsuche um Bäume, Häuser und Fässer (Raster, A*) ----------
// Raster mit 20 px Zellen über den ganzen Abschnitt; gesperrt ist, was näher als Hindernis-Radius + 14 an einem festen Hindernis liegt.
const NAV=20;
D.nav=function(b){if(b.nav)return b.nav;const W=b.width,H=b.height,cw=Math.ceil(W/NAV),ch=Math.ceil(H/NAV),g=new Uint8Array(cw*ch);
 const x0=78*W/1040+14,x1=W-78*W/1040-14,y0=132*H/720+14,y1=H-80*H/720-14;
 for(let j=0;j<ch;j++)for(let i=0;i<cw;i++){const x=i*NAV+NAV/2,y=j*NAV+NAV/2;if(x<x0||x>x1||y<y0||y>y1)g[j*cw+i]=1;}
 for(const o of (b.allObstacles||b.obstacles)){if(!(o.hp>0))continue;const R=o.r+14,i0=Math.max(0,Math.floor((o.x-R)/NAV)),i1=Math.min(cw-1,Math.floor((o.x+R)/NAV)),j0=Math.max(0,Math.floor((o.y-R)/NAV)),j1=Math.min(ch-1,Math.floor((o.y+R)/NAV));
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const x=i*NAV+NAV/2,y=j*NAV+NAV/2;if(Math.hypot(x-o.x,y-o.y)<R)g[j*cw+i]=1;}}
 return b.nav={g,cw,ch,W,H};};
D.navInvalidate=b=>{b.nav=null;};
const navFree=(N,i,j)=>i>=0&&j>=0&&i<N.cw&&j<N.ch&&!N.g[j*N.cw+i];
function navNearest(N,x,y){let i=Math.floor(x/NAV),j=Math.floor(y/NAV);if(navFree(N,i,j))return [i,j];for(let r=1;r<14;r++)for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){if(Math.max(Math.abs(di),Math.abs(dj))!==r)continue;if(navFree(N,i+di,j+dj))return [i+di,j+dj];}return null;}
function navLine(N,ax,ay,bx,by){const d=Math.hypot(bx-ax,by-ay),n=Math.ceil(d/(NAV/2));for(let k=1;k<n;k++){const x=ax+(bx-ax)*k/n,y=ay+(by-ay)*k/n;if(!navFree(N,Math.floor(x/NAV),Math.floor(y/NAV)))return false;}return true;}
// Weg von (ax,ay) nach (bx,by): Liste von Wegpunkten (ohne Start), geglättet; null, wenn es keinen gibt
D.findPath=function(b,ax,ay,bx,by,maxNodes=12000){const N=D.nav(b),s=navNearest(N,ax,ay),t=navNearest(N,bx,by);if(!s||!t)return null;
 const cw=N.cw,key=(i,j)=>j*cw+i,goal=key(t[0],t[1]),start=key(s[0],s[1]);if(start===goal)return [{x:bx,y:by}];
 if(navLine(N,ax,ay,bx,by))return [{x:bx,y:by}];
 const gS=new Map([[start,0]]),from=new Map(),open=[],closed=new Set();let found=false,n=0;
 const push=(f,k)=>{open.push([f,k]);let i=open.length-1;while(i>0){const p=(i-1)>>1;if(open[p][0]<=open[i][0])break;[open[p],open[i]]=[open[i],open[p]];i=p;}};
 const pop=()=>{const top=open[0],last=open.pop();if(open.length){open[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<open.length&&open[l][0]<open[m][0])m=l;if(r<open.length&&open[r][0]<open[m][0])m=r;if(m===i)break;[open[m],open[i]]=[open[i],open[m]];i=m;}}return top;};
 push(Math.hypot(t[0]-s[0],t[1]-s[1]),start);
 while(open.length&&n++<maxNodes){const [,cur]=pop();
  if(cur===goal){found=true;break;}if(closed.has(cur))continue;closed.add(cur);const ci=cur%cw,cj=(cur-ci)/cw;
  for(const [di,dj,c] of [[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.41],[1,-1,1.41],[-1,1,1.41],[-1,-1,1.41]]){const ni=ci+di,nj=cj+dj;if(!navFree(N,ni,nj))continue;if(di&&dj&&(!navFree(N,ci+di,cj)||!navFree(N,ci,cj+dj)))continue;
   const nk=key(ni,nj),ng=gS.get(cur)+c;if(ng<(gS.get(nk)??1e9)){gS.set(nk,ng);from.set(nk,cur);push(ng+Math.hypot(t[0]-ni,t[1]-nj),nk);}}}
 if(!found)return null;
 const cells=[];for(let k=goal;k!==start;k=from.get(k))cells.push(k);cells.reverse();
 const pts=cells.map(k=>({x:(k%cw)*NAV+NAV/2,y:Math.floor(k/cw)*NAV+NAV/2}));pts[pts.length-1]={x:bx,y:by};
 // glätten: Punkte überspringen, solange die gerade Linie frei ist
 const out=[];let cx=ax,cy=ay,i=0;while(i<pts.length){let j=pts.length-1;while(j>i&&!navLine(N,cx,cy,pts[j].x,pts[j].y))j--;out.push(pts[j]);cx=pts[j].x;cy=pts[j].y;i=j+1;}
 return out;};
D.navFreeAt=(b,x,y)=>{const N=D.nav(b);return navFree(N,Math.floor(x/NAV),Math.floor(y/NAV));};
// Freie Schusslinie (wie die Engine: Hindernisse mit hp>0 blockieren, Abstand Radius+4)
D.clearShot=function(b,a,t){const dx=t.x-a.x,dy=t.y-a.y,l2=Math.max(1,dx*dx+dy*dy);for(const o of b.obstacles){if(!(o.hp>0))continue;const u=((o.x-a.x)*dx+(o.y-a.y)*dy)/l2;if(u>0&&u<1&&Math.hypot(o.x-a.x-u*dx,o.y-a.y-u*dy)<o.r+6)return false;}return true;};

// Kampfende kommt über M.endBenchmark aus der Engine (b.benchmark=true: kein Arena-Finale, keine Hinrichtungen)
D.onEngineEnd=function(winner,reason){const b=S.battle;if(!b?.mission||b.done)return false;
 if(!b.started){return true;}
 if(winner===0&&b.queue.length){D.spawn(b,{instant:true});return true;}
 b.paused=true;b.done={winner,reason:reason||''};return true;};
// Begegnung auswerten: Notverbände, Erschöpfung, kurze Rast, Ausrüstung zurück, Beute; Kampfunfähige werden getragen
// Kampfbericht: Werte und Gelerntes jedes Gladiators über die ganze Mission sammeln (Kämpfer werden je Abschnitt neu erzeugt,
// Getragene verlassen das Feld – deshalb nach jeder Begegnung den Zuwachs seit dem letzten Mal übernehmen).
const REP_KEYS=['damage','taken','kills','crits','blocks','dodges','falls','rearHits','charges','backsteps'];
D.collect=function(m,b){m.rep??={};for(const a of b.actors){if(a.team!==0)continue;const r=m.rep[a.g.id]??={id:a.g.id,name:a.g.name,learning:{},xpMultiplier:1};const last=a._rep||(a._rep={learning:{}});
 for(const k of REP_KEYS){const v=a[k]||0;r[k]=(r[k]||0)+(v-(last[k]||0));last[k]=v;}
 for(const [k,v] of Object.entries(a.learning||{})){r.learning[k]=(r.learning[k]||0)+(v-(last.learning[k]||0));last.learning[k]=v;}
 r.xpMultiplier=Math.max(r.xpMultiplier,a.xpMultiplier||1);}};
D.endEncounter=function(m,b,o={}){D.collect(m,b);const st=m.place.stations[b.encounter],w=o.fled?-2:(b.done?.winner??-1),out={station:st,winner:w,loot:[],downed:[],died:[],time:b.time-b.encStart,kills:0,rest:0};
 for(const a of b.actors.filter(a=>a.team===0)){const g=a.g,snap=b.gearSnap.get(g);
  // Fallen gelassene Waffen und Schilde werden nach dem Gefecht wieder aufgehoben
  if(snap?.equipment){if(!g.dead){for(const k of ['weapon','secondary','shield'])if(snap.equipment[k]&&!g.equipment[k]&&(S.inventory||[]).some(i=>i.id===snap.equipment[k]))g.equipment[k]=snap.equipment[k];}a.disarmed=false;a.droppedShield=false;}
  else if(snap){g.enemyGear.weapon=snap.weapon;g.enemyGear.secondary=snap.secondary;g.enemyGear.shield=snap.shield;g.enemyGear.armor=snap.armor;a.disarmed=false;a.droppedShield=false;}

  if(a.counted)continue;
  for(const p of Object.values(g.body)){p.bleed=0;p.grade=M.injuryGrade(p);}
  g.fatigue=clamp(g.fatigue+D.CFG.fatigueBase+out.time/25,0,100);
  if(g.dead){a.counted=true;if(!m.deaths.includes(g)){m.deaths.push(g);out.died.push(g);}}else if(!D.fit(g)){out.downed.push(g);}}
 for(const a of b.encEnemies){if(!(a.down||a.g.dead||a.surrendered))continue;out.kills++;
  // Beute: Waffe, Schild, alle Rüstungsteile und was im Kampf aus der Hand fiel (zählt erst, wenn die ganze Mission geschafft ist)
  const e=a.g.enemyGear,seen=new Set();for(const it of [e.weapon,e.shield,...Object.values(e.armor||{}),...(a.lootDrops||[])].filter(Boolean)){if(it.def==='net'||seen.has(it))continue;seen.add(it);out.loot.push({item:it,from:a.g.name});}}
 m.killed+=out.kills;
 if(w===0&&!st.boss&&D.CFG.restBlood>0){for(const g of m.party)if(!g.dead){const before=g.blood;g.blood=Math.min(100,g.blood+D.CFG.restBlood);out.rest+=Math.round(g.blood-before);}}
 if(w===0){m.cleared=st.i;m.loot.push(...out.loot);if(st.boss){const r=rng32(m.seed^0x5eed);m.gold=m.kind==='adventure'?m.goldPrize:Math.round(D.CFG.gold[0]+r()*(D.CFG.gold[1]-D.CFG.gold[0]));m.state='won';}}
 else if(o.fled||b.done?.reason?.startsWith('Zeitlimit'))m.state='fled';
 else m.state='lost';
 if(m.state==='lost')m.loot=[];
 if(w===0&&!st.boss&&!m.party.some(D.fit))m.state='lost';
 // Wer nicht mehr kann, wird getragen (verschwindet vom Feld); Tote bleiben liegen. Die anderen verschnaufen.
 b.actors=b.actors.filter(a=>!(a.team===0&&!a.g.dead&&!D.fit(a.g)));
 for(const a of b.actors)if(a.team===0&&!a.g.dead){a.down=false;a.fallTimer=0;a.kneeTimer=0;a.stun=0;a.target=null;const fresh=M.createCombatActor(a.g,0,0);a.energy=Math.max(a.energy,fresh.energy);D.calmPose(a);}
 b.started=false;b.queue=[];return out;
};
// Nach dem Gefecht steht die Engine (b.paused): Ohne Rücksetzen blieben Schlag-, Dreh-, Block- und Ausweichhaltung vom letzten
// Kampfaugenblick eingefroren und die Truppe marschierte darin weiter. Nur Haltungs-/Zeitwerte, keine Werte, Munition oder Nachladen.
// Laufende Todesanimationen (finishPush, neckFinishTimer, finishReaction) laufen über M.presentationStep selbst zu Ende.
const POSE0={state:'idle',swing:0,wind:0,windMax:0,swingKind:null,pendingStrike:null,contactPoint:null,pierceContact:null,block:false,blockFlash:0,guardTime:0,hit:0,
 stagger:0,staggerMax:0,jumpTimer:0,dodgeTimer:0,kickTimer:0,postKickPose:0,shieldBashTimer:0,sandKick:0,wipeTimer:0,mercyTimer:0,chargeTimer:0,chargeBoost:0,
 sprinting:false,retreat:0,roll:0,riseHold:0,rearFinish:null,grabbedBy:null,comboExecuting:false,comboReady:false,comboTarget:null,velocityX:0,velocityY:0,moveSpeed:0,gaitSpeed:0,kx:0,ky:0};
D.calmPose=function(a){for(const [k,v] of Object.entries(POSE0))if(k in a)a[k]=v;a.state='idle';a.swingMax=.32;};
// Todesanimationen (Halsschnitt, Tritt nach dem Griff von hinten) laufen in M.presentationStep, das bei b.paused anhält. Missionen
// pausieren sofort nach dem letzten Treffer: Ohne das hier bliebe der zuletzt Getötete stehen. Darum in Missionen auch pausiert weiterlaufen.
const pres0=M.presentationStep;if(pres0&&!pres0.__outside){M.presentationStep=function(dt){const b=S.battle;if(b?.mission&&b.paused){b.paused=false;try{return pres0.apply(this,arguments);}finally{b.paused=true;}}return pres0.apply(this,arguments);};M.presentationStep.__outside=true;}
const learn0=M.learn;if(learn0&&!learn0.__outside){M.learn=function(a,group,key,amount){const b=S.battle;if(b?.mission?.learn&&b.benchmark&&a?.team===0&&!b.paused){b.benchmark=false;try{return learn0.call(this,a,group,key,amount);}finally{b.benchmark=true;}}return learn0.call(this,a,group,key,amount);};M.learn.__outside=true;}
// Leistung: Die Kampf-Engine prüft jedes Hindernis für jeden Kämpfer und jeden Pfeil. Ein Abschnitt hat 400–500 davon
// (Baumstämme, Hauswände, Tiefen-Sprites). Die Oberfläche ruft das hier mehrmals pro Sekunde auf: In b.obstacles bleiben nur
// Hindernisse in der Nähe der Kämpfer und des Bildausschnitts; die vollständige Liste liegt in b.allObstacles.
D.cullObstacles=function(b,camX=null,view=1400){if(!b?.L)return;const all=b.allObstacles??=b.obstacles;const xs=b.actors.filter(a=>!a.g.dead).map(a=>a.x);if(camX!=null)xs.push(camX-view/2,camX+view/2);if(!xs.length)return;
 const lo=Math.min(...xs)-420,hi=Math.max(...xs)+420;b.obstacles=all.filter(o=>o.type==='sprite'?o.x>lo-700&&o.x<hi+700:o.x+o.r>lo&&o.x-o.r<hi);};
D.addObstacles=function(b,list){if(!list?.length)return;(b.allObstacles??=b.obstacles);if(b.allObstacles!==b.obstacles)b.allObstacles.push(...list);b.obstacles.push(...list);};
D.nextStation=(m,b)=>m.place.sections[b.section].stations.find(i=>!b.triggered.has(i));

// ---------- Schauplätze (Daten) im echten Maßstab ----------
// Weltmaß: ein Kämpfer ist ca. 85 px groß (≈ 47 px pro Meter). Grafik wird in „Kunstpixeln“ (Welt/2) gemalt und doppelt groß gezeigt.
// Hohe Dinge (Häuser, Bäume, Brunnen, Karren, Heu, Tiere, herumstehende Trottel) sind Tiefen-Sprites: Hindernis mit hp 0 (keine Kollision),
// die Arena sortiert sie mit den Kämpfern nach y. Blockiert wird über unsichtbare Kollisionskreise (type 'none').
const DOOR_LABEL={fachwerk:'einem Fachwerkhaus',haus:'einem Haus',kate:'einer Kate',stein:'einem Steinhaus',schuppen:'einem Schuppen',scheune:'der Scheune',stall:'dem Stall',wirtshaus:'dem Wirtshaus',schmiede:'der Schmiede',kapelle:'der Kapelle',muehle:'der Mühle',kontor:'dem Kontor',huette:'einer Hütte',stadthaus:'einem Stadthaus',lager:'einem Lagerhaus',villa:'der Villa',bauernhof:'dem Bauernhaus',turm:'dem Turm',zelt:'einem Zelt'};
D.ART=2;D.FIELD_H=1200;
D.pathY=(L,x)=>L.py+Math.sin(x*L.pf+L.pp)*L.pa+Math.sin(x*L.pf*2.7+1.3)*L.pa*.35;
D.layout=function(sec,place){const r=rng32(sec.seed),biome=place.biome,theme=sec.theme,W=sec.W,H=D.FIELD_H,mX=D.marginX(W),mT=132*H/720,mB=H-80*H/720;
 const L={W,H,mT,mB,biome,theme,mood:place.mood,seed:sec.seed,boss:!!sec.boss,py:H*.6+(r()-.5)*60,pa:55+r()*45,pf:.0011+r()*.0009,pp:r()*6,
  houses:[],trees:[],props:[],zones:[],life:[],obstacles:[],sprites:[],enc:{}};
 const pY=x=>D.pathY(L,x);
 // freie Flächen: Weg-Korridor und Kampfplätze um jede Begegnung
 const clear=[];for(const si of sec.stations){const fx=place.stations[si].fx;clear.push({x:fx+170,y:pY(fx+170),rx:520,ry:250});}
 const inClear=(x,y,pad=0)=>clear.some(c=>((x-c.x)/(c.rx+pad))**2+((y-c.y)/(c.ry+pad))**2<1);
 const inPath=(x,y,pad=0)=>Math.abs(y-pY(x))<95+pad;
 const solid=[];// belegte Rechtecke (Welt): {x0,x1,y0,y1}
 const free=(x0,x1,y0,y1)=>!solid.some(s=>x0<s.x1&&x1>s.x0&&y0<s.y1&&y1>s.y0);
 const collider=(x,y,rr)=>L.obstacles.push({x:Math.round(x),y:Math.round(y),r:rr,type:'none',hp:9999});
 const sprite=(o)=>{o.id=L.sprites.length;L.sprites.push(o);L.obstacles.push({x:Math.round(o.x),y:Math.round(o.y),r:0,type:'sprite',hp:0,sid:o.id});return o;};
 // Häuser: Arten je Gegend und Thema
 const pool=biome==='wald'?['huette','huette','schuppen']:biome==='stadt'?['stadthaus','stadthaus','stadthaus','turm','lager']:['fachwerk','fachwerk','haus','kate','kate','stein','schuppen','bauernhof'];
 const special={feldrand:['bauernhof','scheune'],gasse:['fachwerk','fachwerk','fachwerk'],markt:['wirtshaus','stand','stand'],hof:['scheune','stall','bauernhof'],muehle:['muehle'],kirchhof:['kapelle'],taverne:['wirtshaus'],schmiede:['schmiede'],teich:['kate'],kontor:['kontor','turm'],
  koehlerei:['huette'],holzfaeller:['huette'],raeuberlager:['zelt','zelt','zelt'],stadttor:['stadttor'],steingasse:['stadthaus'],platz:['stand','stand'],hafen:['lager'],gerberei:['lager'],villa:['villa','turm']}[theme]||[];
 const SIZE={scheune:[190,230],wirtshaus:[190,230],kontor:[220,260],kapelle:[140,170],muehle:[170,200],stadttor:[220,260],villa:[240,280],stand:[80,100],zelt:[90,120],turm:[70,80],schuppen:[80,110],huette:[90,120],kate:[110,140],stadthaus:[120,160]};
 const mkHouse=(kind,xa,base,door)=>{const sz=SIZE[kind]||[120,170],wA=Math.round(sz[0]+r()*(sz[1]-sz[0])),hA=Math.round((['schuppen','huette','stand','zelt'].includes(kind)?62:kind==='stadthaus'?120:84)+r()*30);
  const x0=xa*1,w=wA*2;if(!free(x0-30,x0+w+30,base-140,base+16))return null;
  const noDoor=['stand'].includes(kind);const dA=noDoor||!door?null:Math.round(wA*(.3+r()*.4));
  const h={kind,x:x0,base,wA,hA,w,v:r(),v2:r(),roof:Math.floor(r()*5),wall:Math.floor(r()*4),doorA:dA,door:dA==null?null:{x:Math.round(x0+dA*2),y:base+20},chimney:!noDoor&&r()<.75?Math.round(wA*(.2+r()*.6)):null,front:door};
  solid.push({x0:x0-30,x1:x0+w+30,y0:base-140,y1:base+16});L.houses.push(h);
  sprite({kind:'house',h,x:x0+w/2,y:base});
  for(let yy=base-12;yy>=base-120;yy-=34)for(let xx=x0+18;xx<=x0+w-18;xx+=34)collider(xx,yy,20);
  return h;};
 // hintere Häuserreihe (Front zum Weg), Fuß knapp unter dem oberen Rand
 const specialAt=[];const nSp=Math.min(special.length,theme==='kontor'?2:1+Math.floor(r()*2));
 if(sec.boss){const bfx=place.stations[sec.stations[0]].fx;specialAt.push(bfx-260,bfx+640);}else for(let k=0;k<nSp;k++)specialAt.push(Math.round((.22+.6*k/Math.max(1,nSp-1)+(r()-.5)*.08)*W));
 let x=mX-60,sk=0;const backBase=Math.round(mT+34);
 while(x<W-mX+40){let kind=pick(r,pool);if(sk<specialAt.length&&x+260>=specialAt[sk]){kind=special[sk%special.length]||kind;sk++;}
  const h=mkHouse(kind,x,backBase+Math.round(r()*24),true);x+=(h?h.w:120)+Math.round(30+r()*(biome==='stadt'?20:160));}
 // Häuser in der Fläche (Nordseite, Front zum Weg), wo Platz ist
 for(let xx=mX+300;xx<W-mX-300;xx+=500+r()*500){const base=Math.round(pY(xx)-140-r()*60);if(base<backBase+300)continue;if(inClear(xx+150,base-40,40)||r()<.35)continue;mkHouse(pick(r,pool),xx,base,true);}
 // Südseite: kleine Schuppen/Ställe am unteren Rand (Front vom Weg weg, keine Türen als Auftrittsort)
 for(let xx=mX+200;xx<W-mX-200;xx+=700+r()*600){if(r()<.5)continue;const base=Math.round(mB+40+r()*30);if(inClear(xx+100,base-150))continue;mkHouse(pick(r,['schuppen','kate','huette']),xx,base,false);}
 // flache Dinge und Zonen
 const props=L.props,add=(kind,o={})=>{const p={kind,x:Math.round(o.x),y:Math.round(o.y),v:r(),...o};props.push(p);return p;};
 const openSpot=(x0,x1,y0,y1,pad=40,tries=20)=>{for(let k=0;k<tries;k++){const x=x0+r()*(x1-x0),y=y0+r()*(y1-y0);if(inPath(x,y)||inClear(x,y)||!free(x-pad,x+pad,y-pad,y+pad))continue;return {x,y};}return null;};
 const scatter=biome==='wald'?['laub','stumpf','farn','stein','pilze','pfuetze','blumen']:biome==='stadt'?['pfuetze','kiste','stroh','pflaster']:['blumen','stroh','stein','grasbuesche','blumen','grasbuesche','pfuetze'];
 for(let k=0;k<W/60;k++){const px=mX+r()*(W-2*mX),py=mT+40+r()*(mB-mT-40);if(inPath(px,py,-30))continue;add(pick(r,scatter),{x:px,y:py});}
 // hohe Requisiten als Tiefen-Sprites (mit Kollision)
 const tall=(kind,x,y,rr,o={})=>{const p=add(kind,{x,y,sprite:true,...o});sprite({kind:'prop',p,x,y});if(rr)collider(x,y-4,rr);solid.push({x0:x-rr-20,x1:x+rr+20,y0:y-rr-20,y1:y+12});return p;};
 const T2={feldrand:[['vogelscheuche',1,8],['karren',1,30]],gasse:[['kiste',3,18],['karren',1,30]],markt:[['brunnen',1,46],['kiste',3,18],['karren',1,30]],hof:[['heuballen',3,26],['karren',1,30]],muehle:[['saecke',2,16],['karren',1,30]],kirchhof:[],taverne:[['kiste',2,18]],schmiede:[['holzstapel',1,30],['amboss',1,16]],teich:[],
  kontor:[['kaefig',2,30],['pranger',1,24],['truhe',2,20]],waldweg:[['busch',6,20]],lichtung:[['busch',4,20]],bachlauf:[['busch',4,20]],koehlerei:[['holzstapel',2,30]],holzfaeller:[['holzstapel',2,30],['baumstamm',3,26]],raeuberlager:[['truhe',3,20],['kaefig',1,30]],stadttor:[['kiste',4,18],['karren',2,30]],steingasse:[['kiste',3,18]],platz:[['brunnen',1,46],['kiste',3,18]],hafen:[['kiste',6,18]],gerberei:[['bottich',4,26]],villa:[['brunnen',1,46],['statue',2,22]]}[theme]||[];
 for(const [kind,n,rr] of T2)for(let k=0;k<n;k++){const s=openSpot(mX+200,W-mX-200,mT+80,mB-20,rr+30);if(s)tall(kind,s.x,s.y,rr);}
 // Wasser, Gräber (flach)
 if(theme==='muehle'||theme==='bachlauf')add('bach',{x:mX+400+r()*(W-2*mX-800),y:0});
 if(theme==='kirchhof'){const cx=W*.5+(r()-.5)*400;for(let k=0;k<14;k++){const gx=cx-300+(k%7)*90+r()*20,gy=mT+120+Math.floor(k/7)*110+r()*20;if(!inPath(gx,gy))add('grab',{x:gx,y:gy});}}
 if(theme==='teich'){const s=openSpot(mX+300,W-mX-300,pY(W/2)+140,mB-60,140,40);if(s){const p=add('tuempel',{x:s.x,y:s.y,rx:120,ry:46});collider(s.x-60,s.y,40);collider(s.x+60,s.y,40);collider(s.x,s.y,44);for(let k=0;k<3;k++)L.life.push({kind:'ente',x:s.x-60+k*50,y:s.y,v:r(),ph:r()*6,home:p});}}
 // Zonen auf freien Flächen: Gärten, Weiden, Äcker … (flach); Weiden bekommen Tiere
 const ZP=biome==='wald'?['dickicht','lichtfleck','totholz','pilzring']:biome==='stadt'?['taubenplatz','brunnenplatz']:['gemuese','weide','acker','blumenwiese','weide','holzplatz','heuplatz','waescheplatz','obstwiese'];
 for(let k=0;k<W/30&&L.zones.length<W/420;k++){const zw=Math.round(240+r()*300),zh=Math.round(100+r()*100),zx=mX+r()*(W-2*mX-zw),zy=mT+60+r()*(mB-mT-zh-40);
  let ok=true;for(let yy=zy;yy<=zy+zh;yy+=30)for(let xx=zx;xx<=zx+zw;xx+=40)if(inPath(xx,yy,20)||inClear(xx,yy,20))ok=false;if(!ok||!free(zx,zx+zw,zy,zy+zh))continue;
  const kind=pick(r,ZP),Z={kind,x:Math.round(zx),y:Math.round(zy),w:zw,h:zh,v:r()};L.zones.push(Z);solid.push({x0:zx,x1:zx+zw,y0:zy,y1:zy+zh});
  if(kind==='weide'){const kinds=pick(r,[['schaf','schaf','schaf','schaf'],['kuh','kuh'],['ziege','ziege','schaf']]);for(const a of kinds)L.life.push({kind:a,x:zx+40+r()*(zw-80),y:zy+40+r()*(zh-60),v:r(),ph:r()*6,pen:Z});
}
  if(kind==='holzplatz'){tall('holzstapel',zx+zw*.35,zy+zh*.6,30);tall('hackklotz',zx+zw*.7,zy+zh*.7,12);}
  if(kind==='heuplatz')for(let j=0;j<3;j++)tall('heuballen',zx+60+j*(zw-120)/2,zy+zh*(.4+r()*.4),26);
  if(kind==='waescheplatz')tall('waesche',zx+zw/2,zy+zh*.65,0,{w:Math.min(260,zw-40)});
  if(kind==='obstwiese')for(let j=0;j<3;j++){const t={kind:'fruit',x:Math.round(zx+50+j*(zw-100)/2),y:Math.round(zy+zh*(.5+r()*.4)),hA:Math.round(95+r()*25),v:r()};L.trees.push(t);sprite({kind:'tree',t,x:t.x,y:t.y});collider(t.x,t.y-4,14);}
  if(kind==='gemuese')tall('vogelscheuche',zx+zw*.8,zy+zh*.5,8);}
 // Bäume: Gruppen und Einzelbäume, nicht im Weg, nicht auf Kampfplätzen, nicht in Häusern
 const nTrees=Math.round(W/(biome==='wald'?55:biome==='stadt'?420:150));
 for(let k=0;k<nTrees*3&&L.trees.length<nTrees;k++){const tx=mX-40+r()*(W-2*mX+80),ty=mT+60+r()*(H-mT-20);
  if(inPath(tx,ty,30)||inClear(tx,ty,30))continue;if(!free(tx-40,tx+40,ty-40,ty+12))continue;
  const kind=biome==='wald'?(r()<.55?'conifer':'leaf'):place.mood.season==='winter'?(r()<.5?'conifer':'leaf'):(r()<.22?'conifer':r()<.3?'fruit':'leaf');
  const hA=Math.round((kind==='conifer'?150:kind==='fruit'?100:130)+r()*60);const t={kind,x:Math.round(tx),y:Math.round(ty),hA,v:r()};L.trees.push(t);solid.push({x0:tx-30,x1:tx+30,y0:ty-30,y1:ty+10});
  sprite({kind:'tree',t,x:t.x,y:t.y});if(ty<mB)collider(tx,ty-4,kind==='conifer'?14:16);}
 // Ränder (nicht begehbar): dichter Wald links und rechts
 for(let yy=mT;yy<H+60;yy+=70)for(const side of [0,1]){const tx=side?W-mX+30+r()*(mX-30):r()*(mX-30);const t={kind:r()<.5?'conifer':'leaf',x:Math.round(tx),y:Math.round(yy+r()*40),hA:Math.round(140+r()*60),v:r()};L.trees.push(t);sprite({kind:'tree',t,x:t.x,y:t.y});}
 // Tiere frei herum (Sprites, bewegen sich)
 const lifeKinds=biome==='wald'?['kraehe','kraehe','reh','hase']:biome==='stadt'?['taube','taube','katze','ratte']:['huhn','huhn','huhn','katze','hund','kraehe','gans'];
 for(let k=0;k<W/300;k++){const s=openSpot(mX+100,W-mX-100,mT+80,mB-20,20);if(s)L.life.push({kind:pick(r,lifeKinds),x:s.x,y:s.y,v:r(),ph:r()*6});}
 for(const a of L.life)sprite({kind:'life',a,x:a.x,y:a.y});
 // Begegnungen: Plätze zum Herumstehen (frei), Türen mit Front zum Weg, vorn, hinten, Verstecke
 // Plünderung (eine Begegnung je Abschnitt): Die Bande steht als Gruppe zusammen (vorn bis zu 6, dahinter die zweite Reihe, die
 // nachrückt, sobald vorn Platz ist). Beim Überfall kommen sie von hinten und aus den Büschen. E.group = Mitte der Gruppe.
 const single=si=>{const st=place.stations[si],fx=st.fx,E={idle:[],spawns:[],wait:[]},boss=st.kind==='boss';
  if(st.kind==='wagon'){E.wagon=true;E.hide={x:fx,y:pY(fx)};L.enc[si]=E;return;}
  const ex=clamp(fx+140,mX+1120,W-mX-70),ey=clamp(pY(ex),mT+90,mB-90);E.group={ex,ey};const act=boss?null:st.idle?.act||'fire';E.act=act;
  for(let k=0;k<6;k++){const col=k%2,row=Math.floor(k/2),lead=boss&&k===0;E.idle.push({x:lead?ex-60:ex+col*55+(r()-.5)*18,y:lead?ey:clamp(ey+(row-1)*62+(col?24:0)+(r()-.5)*12,mT+40,mB-30),face:Math.PI});}
  for(let k=0;k<10;k++){const col=k%3,row=Math.floor(k/3);E.wait.push({x:clamp(ex+170+row*58+(r()-.5)*14,mX+60,W-mX-60),y:clamp(ey+(col-1)*72+(row%2?22:0),mT+40,mB-30),face:Math.PI,label:'der zweiten Reihe'});}
  if(act==='fire')tall('feuer',ex+28,ey+30,0,{small:true});if(act==='barrel')L.obstacles.push({x:ex+44,y:ey-52,r:17,type:'barrel',hp:60,keep:true});if(act==='whet')tall('grab',ex+30,ey-58,0);if(act==='pigs')tall('trog',ex+30,ey-64,14);
  E.idle.forEach((p,k)=>sprite({kind:'idle',si,k,p,x:p.x,y:p.y}));E.wait.forEach((p,k)=>sprite({kind:'wait',si,k,p,x:p.x,y:p.y}));
  E.ahead={x:clamp(fx+900,mX+60,W-mX-60),y:clamp(pY(fx+900)+(r()-.5)*120,mT+40,mB-30),label:'weiter vorn vom Weg'};
  E.behind={x:clamp(fx-760,mX+60,W-mX-60),y:clamp(pY(fx-760)+(r()-.5)*120,mT+40,mB-30),face:0,label:'hinter euch'};
  if(st.kind==='ambush'){const side=[-1,1].map(sd=>({x:clamp(fx-200+r()*300,mX+60,W-mX-60),y:sd<0?mT+50:mB-40,label:sd<0?'dem Gebüsch oben':'dem Gebüsch unten'}));E.spawns=[E.behind,side[0],side[1],E.ahead,E.behind,side[0],side[1]];}
  else E.spawns=E.wait;
  L.enc[si]=E;};
 for(const si of sec.stations){if(sec.single){single(si);continue;}const st=place.stations[si],fx=st.fx;const E={idle:[],spawns:[]};
  const ax=clamp(fx+300+r()*120,mX+80,W-mX-80),ay=clamp(pY(ax)+(r()<.5?-1:1)*(70+r()*60),mT+60,mB-40);
  if(st.kind==='boss'){const k=L.houses.filter(h=>h.kind==='kontor'&&h.door).sort((a,b)=>Math.abs(a.door.x-fx)-Math.abs(b.door.x-fx))[0];const dx=k&&Math.abs(k.door.x-fx)<900?k.door.x:fx+300;E.idle.push({x:clamp(dx,mX+60,W-mX-60),y:(k?k.base:backBase)+40,face:Math.PI,label:'dem Kontor'});}
  else{const act=st.idle.act;E.act=act;
   E.idle.push({x:ax-40,y:ay,face:0},{x:ax+40,y:ay+10,face:Math.PI});
   if(act==='fire')tall('feuer',ax,ay+26,0,{small:true});if(act==='barrel')L.obstacles.push({x:ax+12,y:ay-34,r:17,type:'barrel',hp:60,keep:true});if(act==='whet')tall('grab',ax,ay-40,0);if(act==='pigs')tall('trog',ax,ay-46,14);}
  E.idle.forEach((p,k)=>sprite({kind:'idle',si,k,p,x:p.x,y:p.y}));
  for(const h of L.houses)if(h.door&&h.front&&Math.abs(h.door.x-fx-200)<700)E.spawns.push({x:h.door.x,y:h.base+26,label:DOOR_LABEL[h.kind]||'einem Haus'});
  E.ahead={x:clamp(fx+900,mX+60,W-mX-60),y:clamp(pY(fx+900)+(r()-.5)*120,mT+40,mB-30),label:'weiter vorn vom Weg'};
  E.behind={x:clamp(fx-760,mX+60,W-mX-60),y:clamp(pY(fx-760)+(r()-.5)*120,mT+40,mB-30),face:0,label:'hinter euch'};
  const hide=props.find(p=>p.sprite&&['heuballen','holzstapel','karren','kiste','busch'].includes(p.kind)&&Math.abs(p.x-fx-200)<600);
  if(hide)E.spawns.push({x:hide.x+(hide.x<fx?50:-50),y:hide.y+30,label:{heuballen:'einer Heurolle',holzstapel:'einem Holzstapel',karren:'einem Karren',kiste:'einem Kistenstapel',busch:'einem Gebüsch'}[hide.kind]});
  E.spawns.push(E.ahead);E.spawns=shuffle(r,E.spawns);L.enc[si]=E;}
 // Fässer als echte Arena-Hindernisse
 const nB=theme==='taverne'?5:Math.floor(r()*4);for(let k=0;k<nB;k++){const s=openSpot(mX+300,W-mX-300,mT+80,mB-20,30);if(s)L.obstacles.push({x:Math.round(s.x),y:Math.round(s.y),r:17,type:'barrel',hp:60});}
 return L;
};

// ---------- Komplette Mission ohne Bild durchrechnen (Abstimmung der Schwierigkeit) ----------
// o.kind 'quest' | 'adventure', o.biome; Lernen ist dabei aus (reine Messung).
D.simulate=function(seed,partyFactory,o={}){
 const party=partyFactory(seed),m=D.newMission(seed,party,o.biome||'dorf',{kind:o.kind||'quest',learn:false,diff:o.diff,s:o.s}),log=[];
 const prevEnd=M.endBenchmark;M.endBenchmark=(w,r)=>D.onEngineEnd(w,r);
 try{outer:for(let si=0;si<m.place.sections.length;si++){if(!party.some(D.fit)){m.state='lost';break;}
   const b=D.startSection(m,si,{headless:true});
   for(const sti of m.place.sections[si].stations){const st=m.place.stations[sti];
    b.actors.filter(a=>a.team===0&&!a.g.dead).forEach((a,k)=>{a.x=st.fx-180-(k%2)*50;a.y=D.pathY(b.L,st.fx)+((k%3)-1)*56;});
    D.beginEncounter(b,m,sti);b.paused=false;let steps=0;
    while(!b.done&&steps<60*(D.CFG.timeLimit+5)){D.tick(b,1/60);M.fixedStep(1/60);steps++;}
    if(!b.done)b.done={winner:-1,reason:'Zeitlimit'};
    const out=D.endEncounter(m,b);log.push({theme:st.theme,winner:out.winner,time:Math.round(out.time),kills:out.kills,down:out.downed.length,died:out.died.length});
    if(m.state!=='ready')break outer;b.done=null;}
   S.battle=null;}
 }finally{M.endBenchmark=prevEnd;S.battle=null;if(m.prevLimit!==undefined){if(m.prevLimit===null)delete M.benchmarkTimeLimit;else M.benchmarkTimeLimit=m.prevLimit;}}
 const hp=party.map(g=>g.dead?0:M.health(g));
 return {seed,won:m.state==='won',state:m.state,stations:log,reached:m.cleared+1,total:m.place.stations.length,deaths:m.deaths.length,fit:party.filter(D.fit).length,avgHp:Math.round(hp.reduce((a,b)=>a+b,0)/hp.length),loot:m.loot.length};
};
})();
