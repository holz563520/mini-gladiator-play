'use strict';
// =====================================================================================================================
// GEBÄUDE MIT ART (welt-gebaeude.js) · Aus gezeichnetem Boden wird von selbst ein fertiges Haus. Wunsch Thomas 12.11.2026
// (Dungeon-Keeper-Stil). Nur auf den Rasterkarten-Seiten geladen (arena-theory-2.html, tageslauf-editor.html), nicht im Spiel.
//
// · Gebaut wird in welt-bau.js wie das Trainingsfeld: Werkzeug wählen, Rechteck ziehen. Zusammenhängende Felder derselben
//   Art sind ein Gebäude; Anbauen lässt es zusammenwachsen.
// · Unterkunft in drei Güteklassen (ST), alles antik-römisch und mit schwarzem Humor:
//     0 Rattenloch       Lehmwände mit Rissen, Strohdach mit Löchern, Strohhaufen, Ratten, Kot mit Fliegen, Eimer, Knochen
//     1 Mannschaftsstube Putz mit rotem Sockelband, Ziegeldach, Pritschen, Truhen, Amphoren, Fackeln
//     2 Fürstengemächer  Marmor, pompejanisch rote Felder mit Gold, Pilaster, Mosaik, Prunkliegen, Büsten, Feuerschalen
// · Schmiede in drei Klassen, halb überdacht (hintere Hälfte entlang der längeren Seite), der Rest ist Hof mit Zaun und Tor:
//     0 Rostgrube                  Lehmofen, rostiger Amboss auf rissigem Klotz, Brühe im Löschtrog, Schrott mit Schädel
//     1 Waffenschmiede             Ziegelesse, Eisenamboss, Steintrog, Prüfpuppe mit Schwert im Bauch
//     2 Kaiserliche Waffenschmiede Marmoresse mit Gold, vergoldeter Amboss, Bronzetrog, Statue des Lanista als Vulcanus
//   Immer dabei: Esse mit Blasebalg, Amboss auf Hammerblock, Löschtrog, Schleifstein, Lager für Erz, Kohle, Holz und Barren,
//   Waffenständer, Werkbänke, Werkzeugwände. Feuer flackert, Funken sprühen an Amboss und Schleifstein, Rauch aus den Essen.
// · Beastrium in drei Klassen (Thomas 12.11.), ganz überdacht, voller Metallkäfige (zwei Reihen Käfige, eine Reihe Gang),
//   Stroh und Blutknochen in jedem Käfig; außen Gitterfenster mit Augen dahinter wie im alten Beastrium. In den Käfigen sitzen nur
//   die Tiere, die es wirklich gibt (lebende Hähne und Hunde aus dem Spielstand, dazu Testhahn und Testhund), gezeichnet wie in
//   der Arena (Hahn: CF.drawRoosterSide, Hund: DOG.portrait), lebendig; die übrigen Käfige sind leer:
//     0 Knochengrube           Lehm, Strohdach mit Geier, rostige verbogene Käfige
//     1 Beastrium              Bruchstein, Schindeldach mit Wetterhahn, Eisenkäfige
//     2 Kaiserliche Menagerie  Marmor, goldene Gitter, Purpurkissen; goldener Löwe auf dem Dach
//   Im Gang: Futtereimer (mit Bein), Knochenhaufen, Blutlachen, Fleischhaken, Wassertrog, Stroh. Fliegen über dem Blut.
// · Kaserne in drei Klassen (Thomas 12.11.), ganz überdacht, voller Waffenständer (zwei Reihen Ständer, eine Reihe Gang):
//     0 Bretterbude  Lehm, wacklige Ständer, rostige blutige Klingen, Helme mit Loch, Pfeil im Schild; Helm auf dem Pfahl am Dach
//     1 Kaserne      Putz, Ständer mit Eisenkappen, Schwerter, Speere, Äxte, Dreizacke, Schilde, Rüstungen; rotes Banner am Dach
//     2 Prätorianer  Marmor, Gold, Purpurbüsche, Scuta in Purpur; goldener Adler am Dach
//   Plätze für Waffen, Rüstungen und Schilde, zu Beginn genau halb voll. Sklaven tragen Stück für Stück hinein und legen es ab
//   oder holen eines heraus (sichtbar, mit dem Gegenstand über dem Kopf); die Kaserne bleibt so etwa halb voll.
// · Kaserne, Schmiede und Beastrium des Ludus sind echte Gebäude der mittleren Klasse (welt-raster.js), nicht mehr Skizzen.
// · Medicus (Thomas 12.11.): festes Gebäude im Ludus, nicht baubar, nicht abreißbar, nicht überbaubar; Schieferdach mit Äskulapstab,
//   zwei OP-Tische, Krankenbetten, Eimer mit Hand, Instrumente, Kräuter, Tinkturen, Knochensäge an der Wand.
// · Krankenhaus (baubar, eine Stufe): nur Betten.
// · Überall hängen Bilder des Lanista mit Durchhalteparolen (SPRUECHE). Der Spruch erscheint nur, wenn man im offenen Haus
//   auf ein Bild tippt oder klickt (Thomas 12.11.: sonst keine Schrift). Die Sprüche werden bei jedem Öffnen des Hauses neu
//   ausgelost (ohne Wiederholung im selben Haus).
// · Dach: nur nah herangezoomt (Zoom ab 1,5) wird es durchsichtig: Haus in der Bildmitte, unter der Maus oder angetippt.
//   Zoomt man weiter weg, sind alle Dächer von selbst wieder zu (Thomas 12.11.). Offen sind die vorderen Wände kniehoch.
// · Leistung: Jedes Haus wird zweimal vorgezeichnet (geschlossen, offen) und nur neu gemalt, wenn sich sein Grundriss ändert.
//   Lebendig sind nur Rauch, Ratten und Fliegen (ein paar Rechtecke je Bild).
// · Test: im ersten Beastrium ein echter Hahn und ein echter Hund (Schild am Käfig); Antippen öffnet ihre Großaufnahme.
// · Noch keine Spielwirkung: Schlafplätze, Ambosse und Käfige zählen nur.
// =====================================================================================================================
(()=>{
const M=window.MG,W=window.WeltKarte,H=window.WeltHook,B=M?.weltBau;if(!M||!W||!H||!B||W.T.UNTERKUNFT==null)return;const S=M.s;
const T=W.T,N=W.N,WAND=34,STUMPF=7,STEIG=11,KAPPE=3,TAU=Math.PI*2,clamp=(v,a,b)=>v<a?a:v>b?b:v;
const STUFE=new Map([[T.UNT_S,0],[T.UNTERKUNFT,1],[T.UNT_K,2],[T.SCHM_S,0],[T.SCHMIEDE,1],[T.SCHM_K,2],...(T.BEAST!=null?[[T.BST_S,0],[T.BEAST,1],[T.BST_K,2]]:[]),...(T.KASERNE!=null?[[T.KAS_S,0],[T.KASERNE,1],[T.KAS_K,2]]:[]),...(T.KRANK!=null?[[T.MEDICUS,1],[T.KRANK,1]]:[])]),ART=new Map([[T.SCHM_S,'schmiede'],[T.SCHMIEDE,'schmiede'],[T.SCHM_K,'schmiede'],[T.BST_S,'beast'],[T.BEAST,'beast'],[T.BST_K,'beast'],[T.KAS_S,'kaserne'],[T.KASERNE,'kaserne'],[T.KAS_K,'kaserne'],[T.MEDICUS,'medicus'],[T.KRANK,'krankenhaus']]),NAME_K=['BRETTERBUDE','KASERNE','PRÄTORIANERKASERNE'],NAME_B=['KNOCHENGRUBE','BEASTRIUM','KAISERLICHE MENAGERIE'],NAME_S=['ROSTGRUBE','WAFFENSCHMIEDE','KAISERLICHE WAFFENSCHMIEDE'],NAME=['RATTENLOCH','MANNSCHAFTSSTUBE','FÜRSTENGEMÄCHER'],PLATZ=[['STROHHAUFEN','STROHHAUFEN'],['BETT','BETTEN'],['PRUNKLIEGE','PRUNKLIEGEN']];
const SPRUECHE=[[// Rattenloch
 'Ratten sind auch Eiweiß.','Stroh ist ein Privileg. Benimm dich entsprechend.','Das Loch im Dach ist ein Fenster. Gern geschehen.','Wer hier aufwacht, hat schon gewonnen.','Der Eimer ist für alle da. Auch für dich, Titus.','Hier ist noch keiner erfroren. Gezählt hat allerdings auch keiner.','Das ist kein Schimmel. Das ist Wandschmuck.','Nachts gebissen worden? Die Ratte hatte auch einen schweren Tag.','Das Stroh wurde zuletzt gewechselt, als sein Vorbesitzer noch lebte.','Kalt? Die Toten im Hof frieren auch nicht.','Hier stinkt es nach Ehrgeiz. Und nach Gaius.','Betten sind für Leute mit Zukunft.','Der Husten geht vorbei. So oder so.','Wer sich beschwert, schläft draußen. Da ist mehr Platz, seit dem Löwen.'],
 [// Mannschaftsstube
 'Ein Bett pro Mann. Bei Verlusten wird zusammengerückt.','Ordnung ist das halbe Leben. Die andere Hälfte gehört mir.','Nachtruhe ab Sonnenuntergang. Die ewige nach Spielplan.','Wer schnarcht, kämpft morgen zuerst.','Fundsachen: ein Ohr. Bitte beim Medicus melden.','Bett Nummer 7 ist frei geworden. Nicht nach dem Fleck fragen.','Dein Bettnachbar von gestern lässt grüßen. Er kann es nur nicht mehr.','Bitte keine Namen in die Betten ritzen. Lohnt sich nicht.','Decken werden vererbt, nicht gewaschen.','Wecken bei Sonnenaufgang. Wer liegen bleibt, wird nachgezählt und weggetragen.','Freunde finden ist leicht. Behalten ist hier das Problem.','Nachts wird nicht geweint. Tagsüber fehlt die Zeit.'],
 [// Fürstengemächer
 'Du hast es geschafft. Bis morgen.','Gold steht dir. Mir steht es zu.','Sieger schlafen weich. Und kurz.','Diese Liege gehörte einem Champion. Er braucht sie nicht mehr.','Genieße den Luxus. Er wird vom Preisgeld abgezogen.','Champions leben länger. Wochen, manchmal.','Dein Purpur war teuer. Blute bitte auf den anderen.','Deine Büste ist schon bestellt. Die Inschrift auch. Nur das Datum lassen wir offen.','Ruhm ist vergänglich. Du auch, nur schneller.','Der Vorbewohner hatte denselben Blick. Bis Dienstag.','Trink den Wein. Er ist besser als deine Aussichten.','Ganz oben ist die Luft dünn und der Fall weit.'],
 [// überall
 'Heute schon gestorben? Nein? Dann ab zum Training.','Dein Schmerz ist mein Gewinn.','Wer schläft, blutet nicht. Schlaf schnell.','Unfallfrei seit: 0 Tagen.','Du bist ersetzbar. Günstig sogar.','Lächle! Die Zuschauer zahlen für dein Gesicht. Solange du eins hast.','Teamgeist: Einer stirbt für alle.','Der Lanista sieht alles. Auch das.','Sold ist, was übrig bleibt, wenn ich fertig bin.','Narben sind Orden, die ich nicht bezahlen muss.','Mitarbeiter des Monats: Stelle frei, Vorgänger verstorben.','Beschwerden bitte in die Latrine.','Gib alles. Den Rest nehme ich mir.','Ich glaube an dich. Meine Wetten sagen etwas anderes.','Sterben ist kein Grund, das Training zu versäumen.','Wer zuletzt lacht, hat noch seinen Kiefer.','Du bist nicht dein Arm. Zum Glück, seit gestern.','Blut ist auch nur roter Schweiß.','Deine Familie bekommt eine Urne. Auf Wunsch sogar deine.','Schmerz ist Schwäche, die den Körper verlässt. Meistens zusammen mit Blut.','Der Medicus tut, was er kann. Er kann nicht viel.','Hinfallen ist erlaubt. Liegenbleiben wird beerdigt.','Jeder ist seines Glückes Schmied. Unserer macht gerade Sargnägel.','Angst ist normal. Sie hört nach dem ersten Stich auf. Alles hört dann auf.','Gliedmaßen bitte am Körper führen.','Wir sind eine Familie. Ich bin der Erbe.','Du wirst gebraucht. Als Beispiel.','Morgen ist auch noch ein Tag. Für die meisten.','Kopf hoch! Dann trifft man den Hals besser.','Dein Tod ist mein Verlust. Rund vierzig Denare.','Vertrau deinem Schild. Der letzte Besitzer tat es auch.','Sei wie der Löwe: satt. Die anderen waren das Futter.','Träume groß. Stirb pünktlich.','Heute gibt es Fleisch. Fragt nicht, wer fehlt.','Zähl deine Finger. Jetzt weißt du, wie gut die Woche war.','Nicht jeder kann siegen. Jemand muss ja den Sand düngen.','Aufgeben ist keine Option. Es ist eine Hinrichtung.','Das Leben ist kurz. Ich kürze gern nach.','Du schaffst das! (Angabe ohne Gewähr.)']];
const SPR_S=[[// Rostgrube
 'Rost ist auch eine Legierung.','Diese Klinge hält ewig. Oder bis zum ersten Schlag.','Wir schmieden aus Altmetall. Die Vorbesitzer brauchen es nicht mehr.','Der Löschtrog ist kein Trinkwasser. Frag Gaius. Ach nein, geht ja nicht mehr.','Schutzkleidung ist was für Leute mit zehn Fingern.','Hier wird nichts weggeworfen. Auch keine Finger.','Funkenflug ist kostenlose Heizung.','Der Amboss hat einen Sprung. Du bald auch.','Wenn es klemmt: fester hauen. Gilt auch für Kollegen.','Die Ersatzteilkiste hat Zähne. Nicht reingreifen.'],
 [// Waffenschmiede
 'Gut geschmiedet ist halb gestorben.','Jede Klinge findet ihren Hals.','Erst denken, dann hämmern. Oder umgekehrt, je nach Restfingern.','Heißes Eisen nicht anfassen. Kaltes nur gegen Gebühr.','Qualität hat ihren Preis. Meistens zahlt ihn der Gegner.','Kein Schwert ist stumpf. Nur die Ausreden.','Wer hier pfuscht, testet die Ware selbst.','Die Prüfpuppe hieß früher Marcus.','Schleifen bis es glänzt. Bluten bis es passt.','Ein scharfes Schwert ist ein glückliches Schwert. Der Rest ist Nebensache.'],
 [// Kaiserliche Waffenschmiede
 'Diese Klinge hat mehr gekostet als du.','Vergoldet tötet es sich vornehmer.','Wir schmieden für Champions. Und für ihre Grabbeigaben.','Der Kaiser schaut zu. Hämmere im Takt.','Auch Vulcanus hat klein angefangen. Mit einem Hinkebein.','Prunkwaffen töten genauso. Nur mit Applaus.','Der Funke springt über. Bitte nicht auf die Seide.','Hier wird Geschichte geschmiedet. Und Grabsteine.','Gold rostet nicht. Du schon.','Jede Klinge ein Kunstwerk. Jede Wunde eine Signatur.'],
 [// jede Schmiede
 'Eisen formt man mit Feuer. Gladiatoren auch.','Achtung, heiß! Gilt für Eisen, Kohle und meine Laune.','Bitte nicht auf den Amboss legen. Außer du willst flacher werden.','Der Hammer ist kein Kopfkissen.','Was nicht passt, wird passend gemacht. Auch Schultern.','Hier wird jede Klinge an echten Menschen geprüft. Freiwillige vor!','Fehlende Finger bitte beim Schmied melden. Er sammelt.','Keine Arbeit ohne Brandblasen.']];
// Sprüche neu auslosen: je Haus ohne Wiederholung, gemischt aus den Sprüchen der Güteklasse und den allgemeinen
const SPR_B=[[// Knochengrube
 'Die Hunde haben Hunger. Du hast zwei Beine. Rechne.','Wer die Käfige putzt, darf behalten, was er findet.','Tollwut ist nur ein anderes Wort für Kampfgeist.',
 'Der letzte Pfleger hat nicht gekündigt. Er wurde verdaut.','Rost hält auch zusammen. Meistens.','Füttern nur mit links. Die rechte Hand brauchst du für das Schwert.',
 'Die Flöhe sind gratis.','Riecht nach Tod? Nein, das ist das Futter.','Ein Knochen ist ein Knochen. Frag nicht, von wem.','Wer hier überlebt, fürchtet die Arena nicht mehr.',
 'Der Käfig ist verbogen. Der Hund war schneller als der Schmied.'],[// Beastrium
 'Ein gesunder Hund braucht Bewegung. Lauf.','Heute füttert, wer gestern verloren hat.','Die Wölfe zählen mit. Du solltest es auch.',
 'Nicht in die Augen schauen. Nicht weglaufen. Nicht lecker sein.','Hähne kämpfen bis zum Tod. Sei ein Hahn.','Der Eber ist kein Haustier. Du auch nicht.',
 'Gitter schützen die Tiere vor dir. Nicht umgekehrt.','Beim Verlassen des Zwingers Finger zählen: zehn. Sonst melden.','Das Futter von heute kämpft morgen nicht mehr.',
 'Wer das Tor offen lässt, wird das Futter.','Unsere Tiere sind gut erzogen. Sie fressen nur, was sich bewegt.'],[// Kaiserliche Menagerie
 'Der Löwe hat einen Namen. Du hast eine Nummer.','Der Bär isst von goldenen Tellern. Du bist der Teller.','Ein kaiserlicher Tiger frisst nur das Beste. Gib dir Mühe.',
 'Diese Löwin kostet mehr als dein Leben. Benimm dich.','Wer den Löwen streichelt, bekommt ein prächtiges Begräbnis.','Die Tiere sind Gäste des Kaisers. Du bist die Vorspeise.',
 'Gold glänzt auch im Magen eines Tigers.','Vor dem Füttern Rüstung ablegen. Sie bekommt dem Bären schlecht.','Ruhm ist, wenn dein Name auf dem Futternapf steht.',
 'Der Kaiser liebt Tiere. Menschen hat er genug.'],[// alle Klassen
 'Jedes Tier hier hat schon einen Helden gefressen. Sei kein Held.','Blut im Stroh heißt: Die Fütterung war erfolgreich.','Ein Biest ist ein Gladiator, der nicht jammert.',
 'Freiwillige für die Fütterung: vortreten. Alle anderen: auch.','Wir verschwenden nichts. Frag die Hunde.','Heute Abend Fütterung. Du bist herzlich eingeladen.',
 'Angst riecht man. Die Tiere lieben den Duft.','Wer hier eine Hand verliert, hat ja noch eine.','Die Gitter sind stark. Die Schlösser sind alt. Viel Glück.',
 'Kein Tier wurde beim Training verletzt. Gladiatoren schon.']];
const SPR_K=[[// Bretterbude
 'Der Helm hat ein Loch. Der Vorbesitzer auch.','Rost ist Patina für Arme.','Diese Klinge hat schon drei Herren gedient. Alle tot.','Das Blut ist inklusive.',
 'Wer zuerst kommt, kriegt die Rüstung mit den wenigsten Pfeilen drin.','Die Schilde halten. Meistens einen Schlag.','Passt nicht? Dann pass dich an.'],[// Kaserne
 'Ein gepflegtes Schwert überlebt seinen Besitzer. Das ist Absicht.','Rüstung zurück an den Haken. Mit oder ohne Inhalt.','Wer seine Waffe verliert, verliert meist mehr.',
 'Der Speer ist länger als dein Leben. Nutze das.','Ordnung im Waffenständer, Ordnung im Grab.','Schilde sind zum Dahinterstehen da. Nicht zum Verstecken.','Jede Delle im Helm ist eine Geschichte. Meistens die letzte.'],[// Prätorianerkaserne
 'Gold wiegt schwer. Trag es mit Würde ins Grab.','Diese Rüstung ist mehr wert als du. Pass auf sie auf.','Purpur zeigt kein Blut. Sehr praktisch.',
 'Die Prätorianer sterben auch. Nur schöner.','Ein Helm mit Federbusch wird von weiter weg getroffen.','Glänze, Gladiator. Der Kaiser sieht zu.'],[// alle Klassen
 'Waffen zurücklegen nicht vergessen. Hände dürfen dranbleiben.','Hier liegt alles, was du zum Sterben brauchst. Ordentlich sortiert.',
 'Ausrüstung kommt und geht. Gladiatoren auch.','Wer die Rüstung beschädigt, zahlt. Wer darin stirbt, nicht mehr.','Ein Schwert für jeden. Ein Grab für fast jeden.',
 'Blut abwischen, bevor es rostet.','Was hier fehlt, liegt wahrscheinlich noch in der Arena. Mit jemandem dran.']];
const SPR_M=['Was du nicht mehr brauchst, nehmen wir dir ab.','Der Medicus näht alles. Fast alles. Manches an die falsche Stelle.','Schmerz ist nur Schwäche, die den Körper verlässt. Manchmal mit dem Körper.',
 'Wer hier aufwacht, hat Glück. Wer nicht, auch: keine Rechnung.','Zwei Arme sind ein Luxus.','Bitte nicht schreien. Der Medicus erschrickt leicht, und er hält gerade die Säge.',
 'Heilung kostet. Sterben ist kostenlos, aber lässt sich nicht rückgängig machen.','Ruhe dich aus. Dein Ersatz wird schon angelernt.','Blutverlust ist nur ein Gefühl.','Das Bett ist frisch bezogen. Gestern zumindest.'];
function wuerfeln(h){const pool=h.art==='medicus'||h.art==='krankenhaus'?[...SPR_M,...SPRUECHE[3]]:h.art==='kaserne'?[...SPR_K[h.st],...SPR_K[3],...SPRUECHE[3].filter(t=>!/schl[aä]f|bett|deck/i.test(t))]:h.art==='beast'?[...SPR_B[h.st],...SPR_B[3],...SPRUECHE[3].filter(t=>!/schl[aä]f|bett|deck/i.test(t))]:h.art==='schmiede'?[...SPR_S[h.st],...SPR_S[3],...SPRUECHE[3].filter(t=>!/schl[aä]f|bett|deck/i.test(t))]:[...SPRUECHE[h.st],...SPRUECHE[3]];for(let i=pool.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[pool[i],pool[j]]=[pool[j],pool[i]];}h.poster.forEach((p,i)=>p.text=pool[i%pool.length]);}
const NB=[[1,0],[-1,0],[0,1],[0,-1]];
// ---------- Grundriss → Haus ----------
function gebiet(k0){const typ=W.feld[k0],seen=new Set([k0]),st=[k0],tiles=[];while(st.length){const k=st.pop();tiles.push(k);const x=k%N,y=(k/N)|0;for(const [dx,dy] of NB){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=N||ny>=N)continue;const q=ny*N+nx;if(!seen.has(q)&&W.feld[q]===typ){seen.add(q);st.push(q);}}}return tiles;}
function plan(tiles){const typ=W.feld[tiles[0]],st=STUFE.get(typ)??1,art=ART.get(typ)||'unterkunft',schm=art==='schmiede',bst=art==='beast',kas=art==='kaserne',med=art==='medicus',krk=art==='krankenhaus',set=new Set(tiles);let bx0=N,by0=N,bx1=0,by1=0;for(const k of tiles){const x=k%N,y=(k/N)|0;if(x<bx0)bx0=x;if(x>bx1)bx1=x;if(y<by0)by0=y;if(y>by1)by1=y;}
 const has=(x,y)=>x>=0&&y>=0&&x<N&&y<N&&set.has(y*N+x);
 const lang=bx1-bx0>=by1-by0,tief=(a,b)=>(a%N+((a/N)|0))-(b%N+((b/N)|0));
 // Schmiede: die hintere Hälfte entlang der längeren Seite ist überdacht, der Rest ist Hof
 const dach=schm?new Set(tiles.filter(k=>{const x=k%N,y=(k/N)|0;return lang?(x-bx0)<Math.ceil((bx1-bx0+1)/2):(y-by0)<Math.ceil((by1-by0+1)/2);})):set,hasD=(x,y)=>has(x,y)&&dach.has(y*N+x),hof=tiles.filter(k=>!dach.has(k));
 // Tür (bei der Schmiede das Hoftor): an einer Vorderkante, möglichst mittig
 let door=null,best=1e9;const mx=(bx0+bx1)/2,my=(by0+by1)/2;
 for(const k of tiles){if(schm&&hof.length&&dach.has(k))continue;const x=k%N,y=(k/N)|0;if(!has(x,y+1)){const d=Math.abs(x-mx)+(by1-y)*3;if(d<best){best=d;door={k,side:'y'};}}if(!has(x+1,y)){const d=Math.abs(y-my)+(bx1-x)*3+.4;if(d<best){best=d;door={k,side:'x'};}}}
 // Schlafplätze: jede zweite Reihe quer zur längeren Seite, dazwischen bleibt ein Gang frei; das Feld hinter der Tür bleibt frei
 let beds=schm||bst||kas?[]:tiles.filter(k=>{const x=k%N,y=(k/N)|0;return k!==door.k&&(lang?(x-bx0)%2===0:(y-by0)%2===0);}).sort(tief);
 // Beastrium: zwei Reihen Käfige quer zur längeren Seite, dann eine Reihe Gang; das Türfeld bleibt frei
 const kaefig=bst?new Map(tiles.filter(k=>{const x=k%N,y=(k/N)|0;return k!==door.k&&(lang?(x-bx0):(y-by0))%3!==1;}).map(k=>[k,tierFuer(k,st)])):new Map();
 let stuhl=-1;if(med){// Medicus: Stuhl nahe der Mitte, zwei Betten an der Rückwand (am weitesten von der Tür)
  const dd=k=>Math.abs(k%N-door.k%N)+Math.abs(((k/N)|0)-((door.k/N)|0)),cx=(bx0+bx1)/2,cy=(by0+by1)/2,rest=tiles.filter(k=>k!==door.k);
  stuhl=rest.slice().sort((a,b)=>(Math.abs(a%N-cx)+Math.abs(((a/N)|0)-cy))-(Math.abs(b%N-cx)+Math.abs(((b/N)|0)-cy)))[0];beds=rest.filter(k=>k!==stuhl).sort((a,b)=>dd(b)-dd(a)).slice(0,2).sort(tief);}
 const lager=kas?staenderPlan(tiles,has,door,lang,bx0,by0,st):null;
 // Bilder des Lanista an den hinteren Innenwänden (im Beastrium nur über dem Gang, nicht hinter den Käfigen)
 const poster=[];for(const k of tiles){const x=k%N,y=(k/N)|0;for(const [side,frei,salt,p] of [['a',!has(x,y-1),52,.5],['d',!has(x-1,y),53,.42]])if(frei&&(!schm||dach.has(k))&&!kaefig.has(k)&&!lager?.rk.has(k)&&W.h2(x,y,salt)<(schm?.62:bst||kas?.85:p)){poster.push({k,side,text:''});}}
 // Dachhöhe: Ringe vom Rand nach innen (über Eck gezählt), gedeckelt
 const D=new Map();let rand=[...dach].filter(k=>{const x=k%N,y=(k/N)|0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(!hasD(x+dx,y+dy))return true;return false;}),d=1;
 while(rand.length){for(const k of rand)D.set(k,Math.min(d,KAPPE));const next=[];for(const k of rand){const x=k%N,y=(k/N)|0;for(const [dx,dy] of NB){const q=(y+dy)*N+x+dx;if(hasD(x+dx,y+dy)&&!D.has(q)&&!next.includes(q))next.push(q);}}rand=next;d++;}
 const dz=(x,y)=>hasD(x,y)?D.get(y*N+x):0,eck=(cx,cy)=>STEIG*Math.min(dz(cx-1,cy-1),dz(cx,cy-1),dz(cx-1,cy),dz(cx,cy));
 const sufY=[];let m=-1;for(let x=bx1;x>=bx0;x--){for(let y=by1;y>=by0;y--)if(has(x,y)){if(y>m)m=y;break;}sufY[x-bx0]=m;}
 const stat=schm?stationen(tiles,dach,hof,has,door,st,tief):new Map(),ambosse=[...stat.values()].filter(r=>r==='amboss').length;
 return {id:Math.min(...tiles),st,art,tiles:tiles.slice().sort(tief),set,has,hasD,dach,stat,ambosse,kaefig,kaefige:kaefig.size,rk:lager?.rk||new Map(),slots:lager?.slots||[],plaetze:lager?.slots.length||0,trager:[],n:tiles.length,bx0,by0,bx1,by1,door,beds,betten:beds.length,poster,eck,sufY,key:W.iso(bx1+1,by1+1).y,
  titel:schm?NAME_S[st]:bst?NAME_B[st]:kas?NAME_K[st]:med?'MEDICUS':krk?'KRANKENHAUS':NAME[st],zahl:schm?ambosse:bst?kaefig.size:kas?(lager.slots.length>>1)+'/'+lager.slots.length:beds.length,wort:schm?['AMBOSS','AMBOSSE']:bst?['KÄFIG','KÄFIGE']:kas?['PLÄTZE BELEGT','PLÄTZE BELEGT']:med||krk?['BETT','BETTEN']:PLATZ[st],stuhl};}
// Einrichtung der Schmiede: Essen an der Rückwand, davor Amboss und Löschtrog; Werkbänke an freien Wandfeldern;
// im Hof Schleifstein, Lager (Erz, Kohle, Holz, Barren), Waffenständer und je Klasse ein Extra. Rund ein Drittel bleibt frei zum Laufen.
function stationen(tiles,dach,hof,has,door,st,tief){const stat=new Map(),frei=k=>!stat.has(k)&&k!==door.k,hx=(k,s)=>W.h2(k%N,(k/N)|0,s);
 const nb=k=>{const x=k%N,y=(k/N)|0;return [[x,y+1],[x+1,y],[x-1,y],[x,y-1]].filter(([a,b])=>has(a,b)).map(([a,b])=>b*N+a).sort((a,b)=>(dach.has(a)?0:1)-(dach.has(b)?0:1));};
 const C=tiles.filter(k=>dach.has(k)).sort(tief),wandC=C.filter(k=>{const x=k%N,y=(k/N)|0;return !has(x,y-1)||!has(x-1,y);}),maxE=Math.max(1,Math.ceil(C.length/6));let ne=0;
 for(const k of wandC){if(ne>=maxE)break;if(!frei(k))continue;const x=k%N,y=(k/N)|0;if([...stat].some(([q,r])=>r==='esse'&&Math.abs(q%N-x)+Math.abs(((q/N)|0)-y)<3))continue;stat.set(k,'esse');ne++;
  const a=nb(k).find(frei);if(a!=null){stat.set(a,'amboss');const t=nb(a).find(q=>frei(q)&&q!==k);if(t!=null)stat.set(t,'trog');}}
 for(const k of wandC)if(frei(k)&&hx(k,63)<.55)stat.set(k,'bank');
 const need=['schleif','erz','kohle','holz','barren','waffen',...(st===0?['schrott']:st===1?['pruef']:['statue','pruef'])];
 const yf=hof.filter(frei).sort((a,b)=>hx(a,64)-hx(b,64)),cf=C.filter(frei);let i=0;
 for(const r of need){const k=yf.length?yf.shift():cf.shift();if(k==null)break;stat.set(k,r);i++;}
 const mehr=['erz','kohle','holz','barren','waffen','schleif'];for(const k of yf)if(hx(k,65)<.32)stat.set(k,mehr[(hx(k,66)*mehr.length)|0]);
 return stat;}

// ---------- Malen (in die vorgezeichneten Bilder) ----------
const sh=(c,k)=>'rgb('+c.map(v=>Math.round(clamp(v*k,0,255))).join(',')+')';
const hex=h=>{const n=parseInt(String(h||'#888888').slice(1),16);return [n>>16,(n>>8)&255,n&255];};
const PUTZ=[226,212,180],SOCKEL=[128,120,108],BALKEN=[86,58,34],ZIEGEL=[176,82,54],HOLZ=[134,92,52],STROH=[206,178,100],ROT=[150,52,42],GOLD=[218,176,74],MARMOR=[232,228,218],LEHM=[146,122,90],BRONZE=[150,108,52],PURPUR=[112,44,110];
const DECKEN=[[150,52,44],[70,96,120],[96,112,70],[156,116,62],[112,84,120],[176,160,132]],LUMPEN=[[112,100,84],[96,88,70],[124,104,80],[88,84,78]];
function pt(x,y,z=0){const p=W.iso(x,y);return [p.x,p.y-z];}
function quad(g,pts,fill,line){g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();g.fillStyle=fill;g.fill();if(line){g.strokeStyle=line;g.lineWidth=1;g.stroke();}}
const flach=(g,x0,y0,x1,y1,z,fill,line)=>quad(g,[pt(x0,y0,z),pt(x1,y0,z),pt(x1,y1,z),pt(x0,y1,z)],fill,line);
// Quader auf dem Boden: Deckfläche, linke und rechte sichtbare Seite
function kiste(g,x0,y0,x1,y1,z0,z1,c,k=1){quad(g,[pt(x0,y1,z0),pt(x1,y1,z0),pt(x1,y1,z1),pt(x0,y1,z1)],sh(c,.72*k));quad(g,[pt(x1,y1,z0),pt(x1,y0,z0),pt(x1,y0,z1),pt(x1,y1,z1)],sh(c,.88*k));quad(g,[pt(x0,y0,z1),pt(x1,y0,z1),pt(x1,y1,z1),pt(x0,y1,z1)],sh(c,1.08*k));}
function oval(g,x,y,z,rx,ry,col){const p=pt(x,y,z);g.fillStyle=col;g.beginPath();g.ellipse(p[0],p[1],rx,ry,0,0,TAU);g.fill();}
// Wandfläche von Rasterpunkt (x0,y0) nach (x1,y1), Höhe h, Güteklasse st. Gemalt wird in Wandkoordinaten: u 0…1 entlang der Wand, v in Bildpunkten nach oben.
function wand(g,x0,y0,x1,y1,h,hell,st,extra,art){const p=W.iso(x0,y0),q=W.iso(x1,y1);g.save();g.transform(q.x-p.x,q.y-p.y,0,-1,p.x,p.y);const R=(u,v,du,dv,col)=>{g.fillStyle=col;g.fillRect(u,v,du,dv);},z=(i,s)=>W.h2(x0*7+i,y0*3+x1+y1*5,s),voll=h>12;
 if(art==='medicus-innen')medInnen(R,h,hell,z,voll);
 else if(art==='medicus')medAussen(R,h,hell,z,voll);
 else if(st===1&&art==='beast'){bruchstein(R,h,hell,z,voll);}
 else if(st===0){R(0,0,1,h,sh(LEHM,hell));R(0,0,1,Math.min(5,h*.6),sh([88,74,54],hell));for(let i=0;i<5;i++)R(z(i,61)*.9,2+z(i,62)*3,.08,1.5,sh([70,60,44],hell));
  if(voll){for(let i=0;i<2;i++){const u=.1+z(i,63)*.6,v=8+z(i,64)*(h-20);R(u,v,.2,7,sh([96,70,44],hell));for(let k=0;k<3;k++)R(u,v+1+k*2.2,.2,.7,sh([132,100,62],hell));for(let k=0;k<3;k++)R(u+.03+k*.07,v,.014,7,sh([70,50,30],hell));}// abgeplatzter Lehm, darunter Flechtwerk
   for(let i=0;i<3;i++){const u=.08+z(i,65)*.8,v=6+z(i,66)*(h-14);R(u,v,.012,6,sh([70,58,40],hell));R(u+.012,v+5,.012,5,sh([70,58,40],hell));}// Risse
   R(0,h-2,1,2,sh([168,142,82],hell));for(let i=0;i<8;i++)R(i*.125+z(i,67)*.05,h-3-z(i,68)*2,.03,3,sh([168,142,82],hell*.85));}// Stroh hängt über
  R(0,0,.035,h,sh([70,50,30],hell));R(.965,0,.035,h+(voll?1.5:0),sh([70,50,30],hell));}
 else if(st===1){R(0,0,1,h,sh(PUTZ,hell));const so=Math.min(6,h*.5);R(0,0,1,so,sh(SOCKEL,hell));for(let i=0;i<4;i++)R(i*.25+(i%2?.02:.1),so*.45,.012,so*.55,sh(SOCKEL,hell*.7));R(0,so*.45,1,.8,sh(SOCKEL,hell*.72));
  if(voll){R(0,so,1,7,sh(ROT,hell));R(0,so+7,1,1,sh([96,34,28],hell));for(let i=0;i<6;i++)R(z(i,61)*.9,so+10+z(i,62)*(h-so-16),.05,1,sh(PUTZ,hell*(z(i,63)>.5?.92:1.05)));R(0,h-3.5,1,3.5,sh([204,194,174],hell));R(0,h-4.5,1,1,sh([140,130,112],hell));}
  else R(0,h-1.5,1,1.5,sh(PUTZ,hell*1.1));
  R(0,0,.04,h,sh([198,188,168],hell*.92));R(.96,0,.04,h,sh([198,188,168],hell*.92));}
 else{R(0,0,1,h,sh([236,226,202],hell));const so=Math.min(7,h*.6);R(0,0,1,so,sh(MARMOR,hell));for(let i=0;i<5;i++)R(z(i,61)*.9,1+z(i,62)*(so-2),.1,.7,sh([186,184,190],hell));R(0,so,1,1,sh(GOLD,hell));
  if(voll){R(.12,so+3,.76,h-so-10,sh(GOLD,hell));R(.14,so+4,.72,h-so-12,sh([150,44,38],hell));R(.17,so+6,.66,h-so-16,sh([132,36,32],hell));R(0,h-5,1,3,sh(MARMOR,hell));R(0,h-2,1,2,sh(GOLD,hell));R(0,h-6,1,1,sh([170,166,160],hell));
   for(const u of [0,.92]){R(u,0,.08,h-5,sh(MARMOR,hell*.97));R(u+.02,3,.012,h-10,sh([190,188,184],hell));R(u+.05,3,.012,h-10,sh([190,188,184],hell));R(u-.01,h-8,.1,3,sh(GOLD,hell));R(u-.01,0,.1,2.5,sh([206,202,194],hell));}}
  else{R(0,h-1.5,1,1.5,sh(GOLD,hell));R(0,0,.06,h,sh(MARMOR,hell));R(.94,0,.06,h,sh(MARMOR,hell));}}
 extra?.(R,h);g.restore();}
const fenster=(st,hell)=>(R,h)=>{if(h<20)return;const v=h*.42,dv=h*.3;
 if(st===0){R(.31,v,.38,dv,'#15100c');R(.29,v+dv*.3,.42,2,sh([120,92,58],hell));R(.33,v+dv*.62,.36,2,sh([104,80,50],hell));R(.3,v+dv*.3,.02,2,'#2a2019');R(.66,v+dv*.62,.02,2,'#2a2019');R(.36,v-1.5,.1,1.5,sh([88,74,54],hell));}
 else if(st===1){R(.29,v-1.5,.42,dv+3,sh([198,188,168],hell));R(.33,v,.34,dv,'#1a1410');for(const u of [.41,.49,.57])R(u,v,.016,dv,sh(BALKEN,hell));R(.33,v+dv*.48,.34,1,sh(BALKEN,hell));R(.21,v-1,.08,dv+2,sh([132,60,44],hell));R(.71,v-1,.08,dv+2,sh([132,60,44],hell));R(.27,v-3,.46,1.5,sh(SOCKEL,hell*1.15));}
 else{R(.28,v-2,.44,dv+3,sh(MARMOR,hell));R(.32,v+dv+1,.36,2,sh(MARMOR,hell));R(.36,v+dv+3,.28,1.5,sh(MARMOR,hell));R(.32,v,.36,dv,'#1c1420');R(.36,v+dv,.28,1.5,'#1c1420');for(const u of [.4,.49,.58])R(u,v,.014,dv+1,sh(GOLD,hell));R(.32,v+dv*.5,.36,.8,sh(GOLD,hell));R(.32,v,.05,dv,sh(PURPUR,hell));R(.63,v,.05,dv,sh(PURPUR,hell));R(.26,v-3.5,.48,1.5,sh(GOLD,hell));}};
const tuer=(st,hell)=>(R,h)=>{const dv=Math.min(h,WAND*.74);
 if(st===0){R(.24,0,.52,dv+1,'#15100c');for(let i=0;i<4;i++)R(.26+i*.12,i%2?1.5:0,.1,dv-(i===2?5:i===0?2:0),sh([116,88,54],hell*(i%2?.9:1)));R(.26,dv*.55,.46,1.5,sh([84,62,38],hell));R(.6,dv*.4,.03,4,sh([150,130,90],hell));}
 else if(st===1){R(.2,0,.6,dv+3,sh([198,188,168],hell));R(.26,0,.48,dv,sh(HOLZ,hell));for(let i=1;i<4;i++)R(.26+i*.12,0,.012,dv,sh(HOLZ,hell*.7));for(const v of [dv*.2,dv*.5,dv*.8])for(const u of [.31,.43,.55,.67])R(u,v,.022,1.3,sh(BRONZE,hell*1.2));R(.64,dv*.45,.05,2.6,sh(GOLD,hell));R(.18,dv+3,.64,1.5,sh(SOCKEL,hell*1.15));}
 else{R(.16,0,.68,dv+2,sh(MARMOR,hell));R(.22,0,.56,dv,sh(BRONZE,hell));R(.495,0,.012,dv,'#2a1c12');for(const u of [.25,.52])for(const v of [dv*.12,dv*.55]){R(u,v,.22,dv*.32,sh(GOLD,hell));R(u+.02,v+1,.18,dv*.32-2,sh(BRONZE,hell*.85));}R(.44,dv*.45,.03,2.5,sh(GOLD,hell*1.2));R(.53,dv*.45,.03,2.5,sh(GOLD,hell*1.2));
  R(.12,dv+2,.76,2,sh(GOLD,hell));R(.2,dv+4,.6,1.6,sh(MARMOR,hell));R(.3,dv+5.6,.4,1.6,sh(MARMOR,hell));R(.42,dv+7.2,.16,1.4,sh(GOLD,hell));}};
// Bild des Lanista mit Durchhalteparole
const bild=(st,hell)=>(R,h)=>{if(h<20)return;const a=S.lanista?.appearance||{},haut=hex(a.skin||'#d9ac82'),haar=hex(a.hair||'#443025'),tuch=hex(a.cloth||'#435e6a'),v0=h*.36,hh=h*.5,u0=st===2?.24:.3,w=st===2?.52:.4,m=u0+w/2;
 if(st===0){R(u0,v0,w,hh,sh([196,176,128],hell));R(u0,v0,.06,3,sh(LEHM,hell));R(u0+w-.05,v0+hh-2.5,.05,2.5,sh(LEHM,hell));R(m-.012,v0+hh-1.5,.024,1.5,'#2a2019');}
 else if(st===1){R(u0-.035,v0-1.5,w+.07,hh+3,sh(BALKEN,hell));R(u0,v0,w,hh,sh([214,198,156],hell));}
 else{R(u0-.05,v0-2.5,w+.1,hh+5,sh(GOLD,hell));R(u0-.025,v0-1.2,w+.05,hh+2.4,sh([150,112,40],hell));R(u0,v0,w,hh,sh([120,30,34],hell));}
 const vb=v0+hh*.36;R(u0+.03,vb-.5,w-.06,hh*.6,sh(st===2?[92,22,28]:[150,140,112],hell));R(m-.12,vb,.24,3.2,sh(tuch,hell));R(m-.065,vb+3.2,.13,4.6,sh(haut,hell));R(m-.075,vb+6.6,.15,1.8,sh(haar,hell));R(m-.05,vb+5.6,.1,.7,'#20140c');R(m-.03,vb+4,.06,.6,'#f4ecd8');
 if(st===2)for(const du of [-.11,.09]){R(m+du,vb+4.5,.02,3,sh([96,130,70],hell));R(m+du*(du<0?.8:1.1),vb+7,.02,1.5,sh([96,130,70],hell));}
 R(u0+.04,v0+hh*.2,w-.08,.8,'#2a2019');R(u0+.08,v0+hh*.08,w-.16,.8,'#2a2019');};
const schmuck=(st,seed)=>(R,h)=>{if(h<20)return;
 if(st===0){if(seed<.4){for(let i=0;i<5;i++){R(0+i*.03,h-4-i*2,.03,.7,'rgba(240,236,224,.7)');R(.02+i*.03,h-5-i*2,.012,2,'rgba(240,236,224,.5)');}}// Spinnweben in der Ecke
  else if(seed<.7){R(.49,h*.5,.012,h*.3,'#6e5a3c');R(.455,h*.5-3,.08,3.4,'#3a322a');R(.47,h*.5-4,.05,1.2,'#3a322a');R(.5,h*.5-6.5,.012,3,'#5a4a40');}}// tote Ratte am Strick
 else if(st===1){if(seed<.34){R(.2,h*.56,.6,1.6,sh(BALKEN,1));R(.27,h*.56+1.6,.1,5,sh([170,96,60],1));R(.45,h*.56+1.6,.08,3.5,sh([120,130,110],1));R(.6,h*.56+1.6,.12,4.5,sh([190,150,90],1));}
  else if(seed<.6){R(.47,h*.4,.06,7,sh(BALKEN,.9));R(.44,h*.4+7,.12,2,sh([70,60,56],1));R(.46,h*.4+9,.08,4,'#ffb040');R(.48,h*.4+11,.04,3,'#fff0a0');}
  else if(seed<.8){R(.25,h*.62,.5,1.2,sh(BALKEN,1));R(.3,h*.3,.07,h*.32,sh([150,52,44],1));R(.48,h*.36,.07,h*.26,sh([176,160,132],1));R(.64,h*.33,.07,h*.29,sh([70,96,120],1));}}
 else{if(seed<.45){R(.46,h*.42,.08,1.2,sh(GOLD,1));R(.42,h*.42+1.2,.16,2.2,sh(GOLD,.9));R(.47,h*.42+3.4,.06,3.4,'#ffb040');R(.485,h*.42+5,.03,3,'#fff0a0');R(.495,h*.42-5,.012,5,sh(GOLD,.8));}// goldene Öllampe
  else if(seed<.8){for(let i=0;i<9;i++){const u=.14+i*.09,v=h*.74-Math.sin(i/8*Math.PI)*4;R(u,v,.06,2,sh([84,120,62],1));if(i%3===1)R(u+.02,v-.6,.03,1.6,sh([170,50,60],1));}}}};// Girlande
function bett(g,x,y,seed,st){
 if(st===0){for(const [a,b,c,d,z,k] of [[.14,.22,.86,.8,2.6,.92],[.22,.28,.8,.72,4.2,1],[.34,.34,.7,.66,5.4,1.06]])kiste(g,x+a,y+b,x+c,y+d,0,z,STROH,k*.86);const c=LUMPEN[(seed*4)|0];flach(g,x+.38,y+.3,x+.82,y+.7,5.8,sh(c,1),sh(c,.7));flach(g,x+.5,y+.42,x+.6,y+.52,5.9,sh(c,.6));
  g.strokeStyle=sh(STROH,1.1);g.lineWidth=1;for(let i=0;i<6;i++){const p=pt(x+.15+W.h2(i,x+y,81)*.7,y+.2+W.h2(i,x-y,82)*.6,1);g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(p[0]+3,p[1]-1.5);g.stroke();}
  if(seed>.72){const p=pt(x+.26,y+.5,5.6);g.fillStyle='#3a322a';g.fillRect(p[0]-2,p[1]-2,5,2.4);g.fillRect(p[0]+2,p[1]-2.8,2,1.6);g.fillStyle='#8a6a60';g.fillRect(p[0]-5,p[1]-1,3,.8);}return;}// Ratte hat den Platz schon
 if(st===1){const c=DECKEN[(seed*DECKEN.length)|0];kiste(g,x+.1,y+.2,x+.9,y+.8,0,5,HOLZ);kiste(g,x+.1,y+.2,x+.16,y+.8,5,12,HOLZ,.9);kiste(g,x+.16,y+.24,x+.88,y+.76,5,7.5,STROH);kiste(g,x+.19,y+.3,x+.34,y+.7,7.5,9.5,[232,224,204]);
  kiste(g,x+.42,y+.23,x+.89,y+.77,7.5,8.6,c);flach(g,x+.42,y+.23,x+.5,y+.77,8.7,sh(c,1.3));if(seed>.55)flach(g,x+.6,y+.4,x+.72,y+.6,8.8,sh(c,.8));return;}
 const c=seed<.6?PURPUR:[150,36,40];for(const [dx,dy] of [[.1,.2],[.84,.2],[.1,.74],[.84,.74]])kiste(g,x+dx,y+dy,x+dx+.06,y+dy+.06,0,5,GOLD);kiste(g,x+.08,y+.18,x+.92,y+.82,5,9,[84,48,30]);kiste(g,x+.08,y+.18,x+.92,y+.82,9,9.8,GOLD);
 kiste(g,x+.08,y+.18,x+.15,y+.82,9.8,19,[84,48,30]);kiste(g,x+.08,y+.18,x+.15,y+.82,19,20.2,GOLD);kiste(g,x+.15,y+.22,x+.9,y+.78,9.8,12.6,[238,230,212]);
 kiste(g,x+.17,y+.27,x+.3,y+.5,12.6,15,c);kiste(g,x+.17,y+.52,x+.3,y+.73,12.6,15,GOLD);kiste(g,x+.4,y+.21,x+.91,y+.79,12.6,13.8,c);flach(g,x+.4,y+.21,x+.47,y+.79,13.9,sh(GOLD,1.05));flach(g,x+.84,y+.21,x+.88,y+.79,13.9,sh(GOLD,1));flach(g,x+.58,y+.42,x+.72,y+.58,13.95,sh(GOLD,.95));}
function kram(g,x,y,seed,st,h){const a=S.lanista?.appearance||{};
 if(st===0){if(seed<.3){for(const [dx,dy,r,z] of [[.5,.5,5,0],[.46,.48,3.6,2.6],[.5,.5,2.2,4.8]])oval(g,x+dx,y+dy,z,r,r*.55,sh([92,62,34],.9+z*.04));h.mist.push([x+.5,y+.5]);}// Haufen mit Fliegen
  else if(seed<.48){oval(g,x+.5,y+.52,0,9,4,'rgba(120,128,60,.55)');oval(g,x+.46,y+.5,0,5,2,'rgba(170,176,90,.5)');}// Pfütze
  else if(seed<.62){kiste(g,x+.38,y+.38,x+.62,y+.62,0,8,[96,84,70]);flach(g,x+.4,y+.4,x+.6,y+.6,8.1,'#2a2416');kiste(g,x+.38,y+.49,x+.63,y+.51,3,4,[60,56,52]);h.mist.push([x+.5,y+.5]);}// der Eimer
  else if(seed<.78){g.strokeStyle='#e8e2d0';g.lineWidth=1.6;for(const [a0,b0,a1,b1] of [[.3,.4,.6,.55],[.42,.62,.66,.4],[.5,.3,.56,.5]]){const p=pt(x+a0,y+b0),q=pt(x+a1,y+b1);g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);g.stroke();}oval(g,x+.7,y+.62,2,3,2.6,'#e8e2d0');const p=pt(x+.7,y+.62,2);g.fillStyle='#2a2019';g.fillRect(p[0]-2,p[1]-1,1.2,1.2);g.fillRect(p[0]+.6,p[1]-1,1.2,1.2);}// Knochen und ein Schädel
  else{for(let i=0;i<5;i++){const p=pt(x+.3+W.h2(i,x,91)*.4,y+.3+W.h2(i,y,92)*.4);g.fillStyle=sh([170,96,60],.8+i*.06);g.fillRect(p[0],p[1]-2,3+i%2,2);}}return;}// Scherben
 if(st===1){if(seed<.3){kiste(g,x+.3,y+.32,x+.7,y+.68,0,7,[112,76,42]);kiste(g,x+.3,y+.47,x+.71,y+.53,0,7.4,[70,66,62]);kiste(g,x+.29,y+.31,x+.71,y+.69,7,8.4,[126,88,50]);}
  else if(seed<.5){for(const [dx,dy,r] of [[.38,.42,5],[.6,.56,4]]){const p=pt(x+dx,y+dy);g.fillStyle='rgba(20,14,8,.3)';g.beginPath();g.ellipse(p[0],p[1]+1,r,r*.45,0,0,TAU);g.fill();g.fillStyle=sh([178,104,62],1);g.beginPath();g.ellipse(p[0],p[1]-r,r*.8,r*1.2,0,0,TAU);g.fill();g.fillStyle=sh([120,66,38],1);g.fillRect(p[0]-r*.4,p[1]-r*2.3,r*.8,2);}}
  else if(seed<.66){kiste(g,x+.28,y+.3,x+.72,y+.7,6,8,[140,100,58]);for(const [dx,dy] of [[.3,.32],[.68,.32],[.3,.66],[.68,.66]])kiste(g,x+dx,y+dy,x+dx+.04,y+dy+.04,0,6,BALKEN);const p=pt(x+.5,y+.5,8);g.fillStyle='#c9b27a';g.fillRect(p[0]-3,p[1]-3,4,3);g.fillStyle='#8a2f2a';g.fillRect(p[0]+2,p[1]-2,2,2);}return;}
 flach(g,x+.12,y+.12,x+.88,y+.88,.2,sh([132,36,44],1),sh(GOLD,1));flach(g,x+.22,y+.22,x+.78,y+.78,.3,sh([150,48,52],1),sh(GOLD,.9));// Teppich
 if(seed<.3){kiste(g,x+.36,y+.36,x+.64,y+.64,0,3,MARMOR,.9);kiste(g,x+.4,y+.4,x+.6,y+.6,3,14,MARMOR);kiste(g,x+.37,y+.37,x+.63,y+.63,14,15.5,MARMOR,.95);kiste(g,x+.4,y+.42,x+.6,y+.58,15.5,19,hex(a.cloth||'#435e6a'));kiste(g,x+.44,y+.45,x+.56,y+.55,19,24.5,hex(a.skin||'#d9ac82'));kiste(g,x+.43,y+.44,x+.57,y+.56,24.5,26,hex(a.hair||'#443025'));}// Büste des Lanista
 else if(seed<.5){for(const [dx,dy] of [[.4,.4],[.6,.42],[.5,.6]])kiste(g,x+dx-.015,y+dy-.015,x+dx+.015,y+dy+.015,0,9,BRONZE);oval(g,x+.5,y+.5,9,8,4,sh(BRONZE,1.1));oval(g,x+.5,y+.5,10,6,3,'#2a1c12');oval(g,x+.5,y+.5,11.5,4,3.4,'#ff9030');oval(g,x+.5,y+.5,13.5,2.2,3,'#ffe070');}// Feuerschale
 else if(seed<.66){kiste(g,x+.3,y+.34,x+.7,y+.66,0,8,GOLD,.92);kiste(g,x+.3,y+.48,x+.71,y+.52,0,8.3,BRONZE);kiste(g,x+.29,y+.33,x+.71,y+.67,8,9.6,GOLD);const p=pt(x+.71,y+.5,5);g.fillStyle='#20140c';g.fillRect(p[0]-1,p[1]-1.5,2,3);}// goldene Truhe
 else if(seed<.86){kiste(g,x+.46,y+.46,x+.54,y+.54,0,7,MARMOR);oval(g,x+.5,y+.5,7.5,10,5,sh(MARMOR,1.02));oval(g,x+.5,y+.5,9,5,2.5,sh(GOLD,1));for(const [dx,dy,c] of [[-.05,0,[170,40,50]],[.03,-.03,[120,150,60]],[.02,.04,[210,140,50]]])oval(g,x+.5+dx,y+.5+dy,10.5,2,2,sh(c,1));kiste(g,x+.62,y+.38,x+.67,y+.43,7.5,14,[170,96,60]);}}// Tisch mit Obst und Wein
function male(h,offen){const bst=h.art==='beast',kas=h.art==='kaserne',med=h.art==='medicus',krk=h.art==='krankenhaus',kf=h.kaefig;const m=64,p0=W.iso(h.bx0,h.by1+1),p1=W.iso(h.bx1+1,h.by0),top=W.iso(h.bx0,h.by0).y-(WAND+STEIG*KAPPE+30),bot=W.iso(h.bx1+1,h.by1+1).y+6,ox=Math.floor(p0.x-m/2),oy=Math.floor(top),st=h.st;
 const c=document.createElement('canvas');c.width=Math.ceil(p1.x-p0.x+m);c.height=Math.ceil(bot-top);const g=c.getContext('2d');g.translate(-ox,-oy);const has=h.has,bed=new Set(h.beds),po=new Map(h.poster.map(p=>[p.k+p.side,p]));if(offen){h.mist=[];h.gang=[];}
 for(const k of h.tiles){const x=k%N,y=(k/N)|0,s=W.h2(x,y,51),dr=h.door.k===k;
  // hintere Wände (Innenseite), mit Bild des Lanista oder Schmuck
  const zier=bst?schmuckB:kas?schmuckK:med?schmuckMed:krk?(()=>()=>{}):schmuck,ia=med?'medicus-innen':h.art;const zs=(salt,d)=>med?((x*2+y*3+d)%5)/5+.02:W.h2(x,y,salt);// Medicus: Wandschmuck der Reihe nach
  if(!has(x,y-1))wand(g,x,y,x+1,y,WAND,.98,st,offen?(po.has(k+'a')?bild(st,.98):zier(st,zs(55,0))):null,ia);if(!has(x-1,y))wand(g,x,y+1,x,y,WAND,.8,st,offen?(po.has(k+'d')?bild(st,.8):zier(st,zs(56,2))):null,ia);
  if(offen){if(dr){const a=h.door.side==='y',c0=st===0?[120,104,70]:st===1?[150,52,44]:PURPUR;quad(g,a?[pt(x+.2,y+.45),pt(x+.8,y+.45),pt(x+.8,y+.95),pt(x+.2,y+.95)]:[pt(x+.45,y+.2),pt(x+.95,y+.2),pt(x+.95,y+.8),pt(x+.45,y+.8)],sh(c0,.9),sh(c0,.6));}
   else if(med){if(k===h.stuhl)behandlungsstuhl(g,x,y);else if(bed.has(k))amputationsbett(g,x,y,s);else{h.gang.push(k);if(s<.4)kramMed(g,x,y,s*2,h);}}
   else if(krk){if(bed.has(k))krankenbett(g,x,y,s);else h.gang.push(k);}
   else if(kas){if(h.rk.has(k))staender(g,x,y,st,h.rk.get(k));else{h.gang.push(k);if(s<.55)kramKas(g,x,y,s,st,h);}}
   else if(bst){if(kf.has(k))kaefigMalen(g,x,y,st,kf.get(k),h);else{h.gang.push(k);if(s<(st===0?.8:.62))kramB(g,x,y,s,st,h);}}
   else if(bed.has(k))bett(g,x,y,s,st);else{h.gang.push(k);if(st===0?s<.9:st===1?(!has(x,y-1)||!has(x-1,y))&&s<.66:s<.86)kram(g,x,y,s,st,h);}}
  // vordere Wände (Außenseite): geschlossen volle Höhe mit Fenster, Tür oder Bild; offen nur kniehoch mit Türlücke
  const front=(x0,y0,x1,y1,hell,istTuer,salt)=>{if(!offen)wand(g,x0,y0,x1,y1,WAND,hell,st,istTuer?(med?tuerMed(hell):tuer(st,hell)):(x+y)%2===0?(bst?gitterfenster(st,hell,W.h2(x,y,salt+3)):fenster(st,hell)):W.h2(x,y,salt)<.6?bild(st,hell):null,h.art);
   else if(!istTuer)wand(g,x0,y0,x1,y1,STUMPF,hell,st,null,h.art);else{const a=W.iso(x0,y0),b=W.iso(x1,y1),c0=st===0?LEHM:st===1?PUTZ:MARMOR,L=(u0,u1)=>{g.save();g.transform(b.x-a.x,b.y-a.y,0,-1,a.x,a.y);g.fillStyle=sh(c0,hell);g.fillRect(u0,0,u1-u0,STUMPF);g.fillStyle=sh(st===0?[88,74,54]:st===1?SOCKEL:MARMOR,hell*.9);g.fillRect(u0,0,u1-u0,4);g.fillStyle=sh(st===2?GOLD:BALKEN,hell);g.fillRect(u0?u0:u1-.05,0,.05,STUMPF+2);g.restore();};L(0,.24);L(.76,1);}};
  if(!has(x,y+1))front(x,y+1,x+1,y+1,.74,dr&&h.door.side==='y',57);if(!has(x+1,y))front(x+1,y+1,x+1,y,.94,dr&&h.door.side==='x',58);}
 if(!offen){// Dach: je Feld eine Fläche, die Ecken steigen vom Rand zur Mitte an
  const hoch=dachMalen(g,h,h.tiles,has);
  if(bst||kas){h.rauch=null;if(hoch){// Dachfigur ans hintere Ende des Firsts, damit das Namensschild sie nicht verdeckt
   const zs=k=>{const x=k%N,y=(k/N)|0;return h.eck(x,y)+h.eck(x+1,y)+h.eck(x+1,y+1)+h.eck(x,y+1);},zm=Math.max(...h.tiles.map(zs)),cx=(h.bx0+h.bx1)/2,cy=(h.by0+h.by1)/2;let e=null,ed=-1;
   for(const k of h.tiles){if(zs(k)!==zm)continue;const x=k%N,y=(k/N)|0,d=Math.abs(x-cx)+Math.abs(y-cy)-(x+y)*.01;if(d>ed){ed=d;e={x,y,z:zm+4*WAND};}}(kas?dachZier:dachTier)(g,e||hoch,st);}}
  else if(hoch&&h.n>=4&&st>0){const z=hoch.z/4,cc=st===2?MARMOR:[128,120,108];kiste(g,hoch.x+.36,hoch.y+.36,hoch.x+.64,hoch.y+.64,z-3,z+13,cc);kiste(g,hoch.x+.33,hoch.y+.33,hoch.x+.67,hoch.y+.67,z+13,z+15.5,st===2?GOLD:[96,90,82]);const p=pt(hoch.x+.5,hoch.y+.5,z+15.5);h.rauch={x:p[0],y:p[1]};}else h.rauch=null;}
 return {c,ox,oy};}

// Dach über den Feldern tiles; has sagt, wo das Dach endet (Traufe)
function dachMalen(g,h,tiles,has){const st=h.st;
  const bst=h.art==='beast',farbe=st===0?[170,144,84]:st===1?(bst?[100,64,38]:h.art==='medicus'?[105,119,111]:ZIEGEL):[166,62,44];let hoch=null;
  for(const k of tiles){const x=k%N,y=(k/N)|0,zA=WAND+h.eck(x,y),zB=WAND+h.eck(x+1,y),zC=WAND+h.eck(x+1,y+1),zD=WAND+h.eck(x,y+1),A=pt(x,y,zA),Bp=pt(x+1,y,zB),C=pt(x+1,y+1,zC),Dp=pt(x,y+1,zD),s=W.h2(x,y,54);
   const hell=clamp(.86+.016*((zA+zD)-(zB+zC))+.007*((zA+zB)-(zC+zD))+(s-.5)*(st===0?.16:.06),.56,1.14),L=(P,Q,t)=>[P[0]+(Q[0]-P[0])*t,P[1]+(Q[1]-P[1])*t];
   if(!has(x,y+1))quad(g,[Dp,C,[C[0],C[1]+3],[Dp[0],Dp[1]+3]],sh(st===2?GOLD:st===0?[130,108,60]:BALKEN,.8));if(!has(x+1,y))quad(g,[C,Bp,[Bp[0],Bp[1]+3],[C[0],C[1]+3]],sh(st===2?GOLD:st===0?[130,108,60]:BALKEN,1));
   quad(g,[A,Bp,C,Dp],sh(farbe,hell));g.lineWidth=1;
   if(st===0){// Stroh: kurze Halme, Flicken und Löcher
    for(let i=0;i<14;i++){const u=W.h2(i,k,71),v=W.h2(i,k,72),a=L(L(A,Bp,u),L(Dp,C,u),v),b=L(L(A,Bp,u),L(Dp,C,u),Math.min(1,v+.22));g.strokeStyle=sh(farbe,hell*(W.h2(i,k,73)>.5?1.22:.74));g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();}
    if(s<.16){const q=(u,v)=>L(L(A,Bp,u),L(Dp,C,u),v);quad(g,[q(.3,.25),q(.66,.32),q(.72,.7),q(.5,.8),q(.26,.6)],'#1a140e');quad(g,[q(.36,.34),q(.6,.4),q(.62,.62),q(.42,.66)],'#0c0906');}
    else if(s>.84){const q=(u,v)=>L(L(A,Bp,u),L(Dp,C,u),v);quad(g,[q(.2,.2),q(.7,.25),q(.75,.75),q(.25,.7)],sh([206,184,112],hell),sh([120,100,56],hell));}
    if(!has(x,y+1))for(let i=0;i<6;i++){const e=L(Dp,C,(i+W.h2(i,k,74))/6);g.strokeStyle=sh(farbe,.8);g.beginPath();g.moveTo(e[0],e[1]);g.lineTo(e[0]-1,e[1]+4+W.h2(i,k,75)*3);g.stroke();}}
   else{g.strokeStyle='rgba(60,22,14,.35)';for(const t of [.2,.4,.6,.8]){const a=L(A,Dp,t),b=L(Bp,C,t);g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();}
    g.strokeStyle='rgba(255,210,170,.22)';for(const t of [.1,.3,.5,.7,.9]){const a=L(A,Dp,t),b=L(Bp,C,t);g.beginPath();g.moveTo(a[0],a[1]+.6);g.lineTo(b[0],b[1]+.6);g.stroke();}
    if(bst&&st===1){g.strokeStyle='rgba(40,24,12,.45)';for(let r=0;r<5;r++)for(let i=0;i<5;i++){const u=(i+.5+(r%2)*.5)/5.5,a=L(L(A,Bp,u),L(Dp,C,u),r*.2),b=L(L(A,Bp,u),L(Dp,C,u),r*.2+.16);g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();}}// Holzschindeln
    if(st===2){if(zA===zD&&zB===zC&&zA!==zB){}g.fillStyle=sh(GOLD,1.05);if(!has(x,y+1)&&!has(x+1,y)){g.beginPath();g.moveTo(C[0]-4,C[1]);g.lineTo(C[0]+4,C[1]);g.lineTo(C[0],C[1]-11);g.fill();}if(!has(x,y+1)&&!has(x-1,y)){g.beginPath();g.moveTo(Dp[0]-4,Dp[1]);g.lineTo(Dp[0]+4,Dp[1]);g.lineTo(Dp[0],Dp[1]-11);g.fill();}if(!has(x+1,y)&&!has(x,y-1)){g.beginPath();g.moveTo(Bp[0]-4,Bp[1]);g.lineTo(Bp[0]+4,Bp[1]);g.lineTo(Bp[0],Bp[1]-11);g.fill();}}}
   const z=zA+zB+zC+zD,dm=Math.abs(x-(h.bx0+h.bx1)/2)+Math.abs(y-(h.by0+h.by1)/2);if(!hoch||z>hoch.z||(z===hoch.z&&dm<hoch.d))hoch={z,x,y,d:dm};
   if(st===2&&z>=4*(WAND+STEIG)&&(x+y)%2===0){const p=pt(x+.5,y+.5,z/4);g.fillStyle=sh(GOLD,1.1);g.fillRect(p[0]-2,p[1]-3,4,4);g.fillStyle=sh(GOLD,.8);g.fillRect(p[0]-1,p[1]-6,2,3);}}// goldene Firstzier
 return hoch;}

// ---------- Schmiede ----------
const EISEN=[[128,78,52],[78,80,86],[78,80,86]],KLOTZ=[[96,70,44],[104,72,42],[232,228,218]],LEDER=[96,60,36];
// Werkzeugwand: Leiste mit Hämmern, Zangen und Feilen; je Klasse ein Extra
const werkzeug=(st,seed)=>(R,h)=>{if(h<20)return;const holz=sh(BALKEN,1),ei=st===0?'#7a5444':st===2?sh(GOLD,1):'#4e5258',v=h*.68;R(.1,v,.8,1.4,holz);
 [[.17,0],[.31,1],[.45,2],[.6,0],[.76,1]].forEach(([u,a],i)=>{if(W.h2(i,seed*977,68)<.18)return;R(u+.008,v-.8,.012,1.6,'#2a2420');
  if(a===0){R(u,v-11,.02,10,holz);R(u-.03,v-13,.08,3.2,ei);}else if(a===1){R(u-.016,v-12,.012,11,ei);R(u+.02,v-12,.012,11,ei);R(u-.02,v-3,.056,2,ei);}else{R(u,v-10,.016,9,ei);R(u-.004,v-2.5,.024,2.4,holz);}});
 if(st===0&&seed<.45){R(.84,v-14,.012,12,'#5a4636');for(let i=0;i<5;i++)R(.835,v-6-i*2,.022,1.2,'#6e5a48');}// Kette mit rostigem Haken
 if(st===2){R(.24,h*.86,.52,.9,sh(GOLD,1));R(.3,h*.8,.4,.9,sh(GOLD,.9));R(.48,h*.74,.04,3,sh(GOLD,1.1));}};// gekreuzte goldene Schwerter
function zaun(g,x0,y0,x1,y1,hell,st,tor){const p=W.iso(x0,y0),q=W.iso(x1,y1);g.save();g.transform(q.x-p.x,q.y-p.y,0,-1,p.x,p.y);
 const R0=(u,v,du,dv,col)=>{g.fillStyle=col;g.fillRect(u,v,du,dv);},R=(u,v,du,dv,col)=>{if(tor&&u<.74&&u+du>.26){if(u<.26)R0(u,v,.26-u,dv,col);if(u+du>.74)R0(.74,v,u+du-.74,dv,col);return;}R0(u,v,du,dv,col);};
 if(st===0){for(let i=0;i<8;i++){const hh=7+W.h2(i,x0*31+y1,69)*5;R(i/8+.01,0,.1,hh,sh([112,84,54],hell*(i%2?.88:1.05)));R(i/8+.01,hh-1,.1,1,sh([78,58,36],hell));}R(0,4,1,1.2,sh([92,70,44],hell));}
 else if(st===1){R(0,0,1,7,sh([150,144,132],hell));for(let i=0;i<5;i++)R(i*.2+(i%2?.1:0),2.5,.012,4,sh([108,102,94],hell));R(0,7,1,1.6,sh([180,174,162],hell));}
 else{R(0,0,1,2.5,sh(MARMOR,hell*.9));for(let i=0;i<9;i++)R(i/9+.03,2.5,.05,6,sh(MARMOR,hell*(i%2?.95:1.05)));R(0,8.5,1,2,sh(MARMOR,hell));R(0,10.5,1,.8,sh(GOLD,hell));}
 if(tor){R0(.23,0,.03,13,sh(st===2?GOLD:BALKEN,hell));R0(.74,0,.03,13,sh(st===2?GOLD:BALKEN,hell));}g.restore();}
function brocken(g,x,y,n,cols,seed,hoch){for(let i=0;i<n;i++){const a=.26+W.h2(i,seed,71)*.42,b=.26+W.h2(i,seed,72)*.42,d=.05+W.h2(i,seed,73)*.06,z=(1-Math.hypot(a-.5,b-.5)*2.4)*hoch;kiste(g,x+a,y+b,x+a+d,y+b+d,Math.max(0,z-3),Math.max(2,z),cols[i%cols.length]);}}
function station(g,k,r,st,h,offen){const x=k%N,y=(k/N)|0,s=W.h2(x,y,70),ei=EISEN[st],a=S.lanista?.appearance||{};
 if(r==='esse'){const c=st===0?[150,104,72]:st===1?[156,80,58]:MARMOR,top=st===0?16:15;
  if(st===0){kiste(g,x+.12,y+.12,x+.88,y+.8,0,11,c);kiste(g,x+.2,y+.18,x+.8,y+.72,11,top,c,.94);for(let i=0;i<4;i++){const p=pt(x+.2+i*.17,y+.8,3+i*2);g.fillStyle='rgba(40,28,18,.5)';g.fillRect(p[0],p[1],3,1);}}// Lehmofen mit Rissen
  else{kiste(g,x+.1,y+.1,x+.9,y+.8,0,top-2,c);kiste(g,x+.08,y+.08,x+.92,y+.82,top-2,top,st===1?[120,114,106]:GOLD);if(st===1)for(let r2=0;r2<4;r2++)for(let i=0;i<4;i++){const p=pt(x+.12+i*.2+(r2%2)*.1,y+.8,2+r2*3.2);g.fillStyle='rgba(70,30,20,.35)';g.fillRect(p[0],p[1],1,1);}}
  const m=[[.33,2.5],[.67,2.5],[.67,10],[.33,10]];quad(g,m.map(([u,z])=>pt(x+u,y+.8,z)),'#24120a');quad(g,[[.38,3],[.62,3],[.62,8],[.38,8]].map(([u,z])=>pt(x+u,y+.8,z)),'#ff8a2a');quad(g,[[.43,3],[.57,3],[.57,6],[.43,6]].map(([u,z])=>pt(x+u,y+.8,z)),'#ffd060');
  if(st===2){oval(g,x+.5,y+.8,12.5,4,3,sh(BRONZE,1.1));oval(g,x+.5,y+.8,12.5,1.6,1.2,'#20140c');}// Löwenmaske
  flach(g,x+.24,y+.22,x+.76,y+.66,top+.2,'#3a2418');for(let i=0;i<7;i++){const p=pt(x+.28+W.h2(i,k,74)*.44,y+.26+W.h2(i,k,75)*.36,top+.3);g.fillStyle=i%2?'#ff7a20':'#ffb040';g.fillRect(p[0]-1,p[1]-1,2,1.4);}
  const hz=offen?WAND-6:WAND-4;kiste(g,x+.3,y+.18,x+.64,y+.46,top+3,hz,st===0?[130,96,68]:st===1?[140,74,54]:MARMOR,.95);if(st===2)kiste(g,x+.29,y+.17,x+.65,y+.47,hz-2,hz,GOLD);
  kiste(g,x+.66,y+.84,x+.95,y+.99,1,5,LEDER);quad(g,[pt(x+.66,y+.84,5),pt(x+.95,y+.84,5),pt(x+.95,y+.99,8),pt(x+.66,y+.99,8)],sh(LEDER,1.15));kiste(g,x+.93,y+.89,x+.99,y+.94,7,8.5,BALKEN);return;}// Blasebalg
 if(r==='amboss'){const kl=KLOTZ[st];kiste(g,x+.3,y+.3,x+.7,y+.7,0,7,kl);if(st<2){flach(g,x+.34,y+.34,x+.66,y+.66,7.1,sh(kl,1.2));oval(g,x+.5,y+.5,7.2,4,2,sh(kl,.85));if(st===0){const p=pt(x+.42,y+.7,4);g.fillStyle='#2a1c10';g.fillRect(p[0],p[1]-3,1,5);}}else kiste(g,x+.28,y+.28,x+.72,y+.72,6,7,GOLD);
  kiste(g,x+.38,y+.43,x+.62,y+.57,7,9,ei,.8);kiste(g,x+.43,y+.46,x+.57,y+.54,9,11,ei,.75);kiste(g,x+.3,y+.41,x+.66,y+.59,11,13.5,ei);kiste(g,x+.2,y+.45,x+.3,y+.55,11.8,13.2,ei,.95);
  if(st===0){const p=pt(x+.45,y+.5,13.6);g.fillStyle='#a05a38';g.fillRect(p[0]-3,p[1]-1,3,1);g.fillRect(p[0]+2,p[1],2,1);}if(st===2){kiste(g,x+.3,y+.41,x+.66,y+.43,12.6,13.6,GOLD);kiste(g,x+.3,y+.57,x+.66,y+.59,12.6,13.6,GOLD);}
  kiste(g,x+.45,y+.48,x+.62,y+.52,13.5,14.5,BALKEN);kiste(g,x+.56,y+.44,x+.64,y+.56,13.5,16,st===2?GOLD:[60,62,68]);return;}// Hammer obenauf
 if(r==='trog'){const c=st===0?[104,78,50]:st===1?[140,134,124]:BRONZE,w=st===0?[86,104,52]:st===1?[56,86,104]:[70,130,170];kiste(g,x+.16,y+.26,x+.84,y+.74,0,7,c);flach(g,x+.21,y+.31,x+.79,y+.69,6.3,sh(w,1));flach(g,x+.3,y+.38,x+.5,y+.46,6.4,sh(w,1.25));
  if(st===0){const p=pt(x+.62,y+.52,6.6);g.fillStyle='#e0c0a0';g.fillRect(p[0]-2,p[1]-1,4,1.4);g.fillRect(p[0]+1,p[1]-1.8,1,1);}// treibt da ein Finger?
  if(st===2)for(const [a0,b0,a1,b1] of [[.16,.26,.84,.28],[.16,.72,.84,.74]])kiste(g,x+a0,y+b0,x+a1,y+b1,6.6,7.6,GOLD);return;}
 if(r==='schleif'){const hz=st===0?[104,74,46]:st===1?[118,82,48]:MARMOR;kiste(g,x+.26,y+.44,x+.32,y+.56,0,13,hz);kiste(g,x+.68,y+.44,x+.74,y+.56,0,13,hz);kiste(g,x+.3,y+.48,x+.7,y+.52,10.5,11.5,[60,56,52]);
  const p=pt(x+.5,y+.5,11);g.fillStyle=sh([92,88,82],1);g.beginPath();g.ellipse(p[0],p[1],5.6,9,.42,0,TAU);g.fill();g.fillStyle=sh(st===2?[196,190,178]:[150,146,138],1);g.beginPath();g.ellipse(p[0]+.6,p[1]-.4,4.6,8,.42,0,TAU);g.fill();g.fillStyle='#3a3632';g.fillRect(p[0],p[1]-1,2,2);
  kiste(g,x+.74,y+.48,x+.82,y+.52,10,11,ei);kiste(g,x+.8,y+.48,x+.84,y+.52,6,11,ei);kiste(g,x+.36,y+.62,x+.64,y+.82,0,3,st===2?BRONZE:[104,78,50]);flach(g,x+.39,y+.65,x+.61,y+.79,2.6,'#5a7488');return;}
 if(r==='erz'){kiste(g,x+.18,y+.18,x+.82,y+.82,0,1.6,st===2?BRONZE:[96,72,48]);brocken(g,x,y,10,st===0?[[132,74,52],[110,64,48],[150,96,64]]:[[128,72,56],[102,90,86],[150,100,70]],k,8);return;}
 if(r==='kohle'){brocken(g,x,y,11,[[38,36,36],[52,50,50],[30,28,30]],k+1,7);if(st===0){g.strokeStyle='#e8e2d0';g.lineWidth=1.4;const p=pt(x+.36,y+.62,3),q=pt(x+.58,y+.7,3);g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);g.stroke();}return;}// Knochen in der Kohle
 if(r==='holz'){for(let l=0;l<3;l++)for(let i=0;i<3-l;i++){const b=.28+i*.15+l*.075,z=l*4.2;kiste(g,x+.2,y+b,x+.8,y+b+.13,z,z+4,[118,82,48]);oval(g,x+.8,y+b+.065,z+2,2,1.8,sh([196,160,110],1));}return;}
 if(r==='barren'){const c=st===2?GOLD:st===1?[96,98,106]:[120,86,64];for(let l=0;l<3;l++)for(let i=0;i<3;i++){const o=l%2?.06:0,a0=.26+i*.17+o,b0=.36;kiste(g,x+a0,y+b0,x+a0+.12,y+b0+.28,l*2.6,l*2.6+2.6,c,1-l*.04);}return;}
 if(r==='waffen'){const hz=st===2?GOLD:BALKEN,kl=st===0?[136,100,80]:[176,180,188];kiste(g,x+.18,y+.46,x+.24,y+.54,0,17,hz);kiste(g,x+.76,y+.46,x+.82,y+.54,0,17,hz);kiste(g,x+.18,y+.47,x+.82,y+.53,14.5,16,hz);
  for(let i=0;i<4;i++){const u=.3+i*.13,lg=st===0&&i%2?7:13;kiste(g,x+u,y+.48,x+u+.03,y+.52,1,1+lg,kl);kiste(g,x+u-.02,y+.47,x+u+.05,y+.53,1+lg,2.5+lg,st===2?GOLD:[90,62,36]);}return;}
 if(r==='bank'){const hz=st===2?[92,52,32]:[120,84,50];kiste(g,x+.16,y+.32,x+.84,y+.68,7,9,hz);for(const [a0,b0] of [[.18,.34],[.78,.34],[.18,.62],[.78,.62]])kiste(g,x+a0,y+b0,x+a0+.04,y+b0+.04,0,7,hz,.8);
  kiste(g,x+.26,y+.44,x+.46,y+.48,9,10,BALKEN);kiste(g,x+.4,y+.42,x+.46,y+.5,9,11.5,ei);kiste(g,x+.56,y+.4,x+.76,y+.44,9,9.8,ei);kiste(g,x+.58,y+.52,x+.72,y+.6,9,10.4,st===2?GOLD:[150,152,158]);return;}
 if(r==='schrott'){brocken(g,x,y,9,[[120,90,72],[96,90,86],[140,104,78]],k+2,6);g.strokeStyle='#8a7060';g.lineWidth=1.4;const p=pt(x+.3,y+.4,4),q=pt(x+.55,y+.36,9);g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);g.lineTo(q[0]+4,q[1]+2);g.stroke();
  const c=pt(x+.58,y+.6,6);g.fillStyle='#e6e0cc';g.beginPath();g.ellipse(c[0],c[1],3.6,3.2,0,0,TAU);g.fill();g.fillRect(c[0]-2,c[1]+1.5,4,2);g.fillStyle='#20140c';g.fillRect(c[0]-2,c[1]-1,1.4,1.6);g.fillRect(c[0]+.8,c[1]-1,1.4,1.6);return;}// Ersatzteile mit Schädel
 if(r==='pruef'){kiste(g,x+.47,y+.47,x+.53,y+.53,0,14,BALKEN);kiste(g,x+.38,y+.4,x+.62,y+.6,8,19,[170,146,96]);kiste(g,x+.42,y+.44,x+.58,y+.56,19,24,[178,154,104]);kiste(g,x+.3,y+.47,x+.7,y+.53,16,17.5,BALKEN);
  kiste(g,x+.52,y+.49,x+.82,y+.51,13,14,[176,180,188]);kiste(g,x+.8,y+.47,x+.84,y+.53,12,15,[90,62,36]);const p=pt(x+.5,y+.6,14);g.fillStyle='rgba(120,20,16,.8)';g.fillRect(p[0]-1,p[1],2,5);return;}// Prüfpuppe mit Schwert im Bauch
 if(r==='statue'){const t=hex(a.cloth||'#435e6a'),hu=hex(a.skin||'#d9ac82');kiste(g,x+.28,y+.28,x+.72,y+.72,0,8,MARMOR);kiste(g,x+.26,y+.26,x+.74,y+.74,8,9,GOLD);kiste(g,x+.4,y+.42,x+.6,y+.58,9,21,t);kiste(g,x+.42,y+.44,x+.58,y+.56,9,13,t,.75);
  kiste(g,x+.44,y+.45,x+.56,y+.55,21,27,hu);kiste(g,x+.43,y+.44,x+.57,y+.56,26,28,hex(a.hair||'#443025'));kiste(g,x+.58,y+.47,x+.63,y+.53,18,31,hu);kiste(g,x+.54,y+.44,x+.7,y+.56,31,34,GOLD);kiste(g,x+.6,y+.48,x+.63,y+.52,28,31,BALKEN);return;}}// Lanista als Vulcanus
function kleinkram(g,x,y,st,s){if(s>.3)return;if(st===0){g.fillStyle='#6e5a48';for(let i=0;i<4;i++){const p=pt(x+.3+W.h2(i,x,76)*.4,y+.3+W.h2(i,y,77)*.4);g.fillRect(p[0],p[1]-1,3,1);}return;}
 if(st===1){kiste(g,x+.42,y+.42,x+.58,y+.58,0,6,[96,84,70]);flach(g,x+.44,y+.44,x+.56,y+.56,6.1,'#3a5468');return;}// Eimer
 kiste(g,x+.46,y+.46,x+.54,y+.54,0,2,BRONZE);oval(g,x+.5,y+.5,6,3.4,6,sh([178,104,62],1));oval(g,x+.5,y+.5,12,1.6,1,sh([120,66,38],1));}// Amphore
function maleSchmiede(h,offen){const m=64,p0=W.iso(h.bx0,h.by1+1),p1=W.iso(h.bx1+1,h.by0),top=W.iso(h.bx0,h.by0).y-(WAND+STEIG*KAPPE+40),bot=W.iso(h.bx1+1,h.by1+1).y+6,ox=Math.floor(p0.x-m/2),oy=Math.floor(top),st=h.st;
 const c=document.createElement('canvas');c.width=Math.ceil(p1.x-p0.x+m);c.height=Math.ceil(bot-top);const g=c.getContext('2d');g.translate(-ox,-oy);const has=h.has,hasD=h.hasD,po=new Map(h.poster.map(p=>[p.k+p.side,p]));
 if(offen){h.mist=[];h.gang=[];}const C=h.tiles.filter(k=>h.dach.has(k)),Y=h.tiles.filter(k=>!h.dach.has(k));
 // 1. überdachter Teil: Rückwände mit Werkzeug oder Bild, Einrichtung, nach außen gehende Vorderwände; zum Hof hin offen
 for(const k of C){const x=k%N,y=(k/N)|0;
  if(!has(x,y-1))wand(g,x,y,x+1,y,WAND,.98,st,po.has(k+'a')?bild(st,.98):werkzeug(st,W.h2(x,y,55)));if(!has(x-1,y))wand(g,x,y+1,x,y,WAND,.8,st,po.has(k+'d')?bild(st,.8):werkzeug(st,W.h2(x,y,56)));
  const r=h.stat.get(k);if(r)station(g,k,r,st,h,offen);else kleinkram(g,x,y,st,W.h2(x,y,51));
  const front=(x0,y0,x1,y1,hell,salt)=>offen?wand(g,x0,y0,x1,y1,STUMPF,hell,st):wand(g,x0,y0,x1,y1,WAND,hell,st,(x+y)%2===0?fenster(st,hell):W.h2(x,y,salt)<.6?bild(st,hell):werkzeug(st,W.h2(x,y,salt+1)));
  if(!has(x,y+1))front(x,y+1,x+1,y+1,.74,57);if(!has(x+1,y))front(x+1,y+1,x+1,y,.94,58);}
 // Pfosten an der offenen Seite zum Hof
 const pf=new Set();for(const k of C){const x=k%N,y=(k/N)|0;if(has(x,y+1)&&!hasD(x,y+1)){pf.add(x+','+(y+1));pf.add((x+1)+','+(y+1));}if(has(x+1,y)&&!hasD(x+1,y)){pf.add((x+1)+','+y);pf.add((x+1)+','+(y+1));}}
 const pc=st===0?[104,74,46]:st===1?[150,144,132]:MARMOR;for(const q of [...pf].map(v=>v.split(',').map(Number)).sort((a,b)=>a[0]+a[1]-b[0]-b[1])){const [px,py]=q;kiste(g,px-.06,py-.06,px+.06,py+.06,0,offen?STUMPF+3:WAND,pc);if(st===2&&!offen)kiste(g,px-.08,py-.08,px+.08,py+.08,WAND-3,WAND,GOLD);}
 // 2. Dach über der überdachten Hälfte, Schornsteine der Essen
 h.essenZu=[];h.essenAuf=[];for(const [k,r] of h.stat)if(r==='esse'){const x=k%N,y=(k/N)|0,p=pt(x+.47,y+.32,offen?WAND-6:WAND+h.eck(x+1,y+1)/2+12);(offen?h.essenAuf:h.essenZu).push({x:p[0],y:p[1]});}
 if(!offen){dachMalen(g,h,C,hasD);for(const [k,r] of h.stat)if(r==='esse'){const x=k%N,y=(k/N)|0,z=WAND+h.eck(x+1,y+1)/2;kiste(g,x+.3,y+.18,x+.64,y+.46,z-6,z+12,st===0?[130,96,68]:st===1?[140,74,54]:MARMOR);kiste(g,x+.28,y+.16,x+.66,y+.48,z+12,z+14,st===2?GOLD:[90,84,78]);}}
 // 3. Hof: Zaun mit Tor, Einrichtung, freie Felder
 for(const k of Y){const x=k%N,y=(k/N)|0,dr=h.door.k===k;
  if(!has(x,y-1))zaun(g,x,y,x+1,y,.98,st,false);if(!has(x-1,y))zaun(g,x,y+1,x,y,.82,st,false);
  const r=h.stat.get(k);if(r)station(g,k,r,st,h,offen);else{kleinkram(g,x,y,st,W.h2(x,y,51));if(offen&&!dr)h.gang.push(k);}
  if(!has(x,y+1))zaun(g,x,y+1,x+1,y+1,.74,st,dr&&h.door.side==='y');if(!has(x+1,y))zaun(g,x+1,y+1,x+1,y,.94,st,dr&&h.door.side==='x');}
 return {c,ox,oy};}

// ---------- Beastrium ----------
// Je Käfig ein fester Zufallswert s (Inhalt: Knochen, Schädel, Helm). Welches Tier drin sitzt, entscheidet belegen().
const TIERE=[['hund','hund','hund','hahn','eber','gerippe'],['hund','wolf','hund','eber','hahn','wolf','baer','hund'],['loewe','tiger','baer','loewe','wolf','tiger','loewe']];
function tierFuer(k,st){const x=k%N,y=(k/N)|0,L=TIERE[st],a=L[(W.h2(x,y,90)*L.length)|0],r=W.h2(x,y,91);return {art:a,pose:r<.4?'steht':r<.7?'liegt':'nagt',face:W.h2(x,y,92)<.5?1:-1,s:W.h2(x,y,93)};}
// Bruchsteinmauer wie im alten Beastrium (Wandkoordinaten: u 0…1, v Bildpunkte)
function bruchstein(R,h,hell,z,voll){R(0,0,1,h,sh([85,81,63],hell));for(let v=0,r=0;v<h-1;v+=5,r++)for(let u=-(r%2)*.11,i=0;u<1;u+=.22,i++){const a=Math.max(0,u+.01),b=Math.min(1,u+.21);if(b>a)R(a,v+.6,b-a,4,sh(z(i+r*9,61)>.5?[138,132,104]:[124,119,93],hell*(.94+z(i+r*9,62)*.12)));}
 if(voll){R(0,h-2.5,1,2.5,sh([96,90,72],hell));for(let i=0;i<3;i++)R(.1+z(i,63)*.75,4+z(i,64)*(h-12),.14,2.4,sh([96,110,62],hell*.9));}// Moos
 R(0,0,.03,h,sh([70,66,52],hell));R(.97,0,.03,h,sh([70,66,52],hell));}
// Gitterfenster mit Augen dahinter (wie im alten Beastrium)
const gitterfenster=(st,hell,seed)=>(R,h)=>{if(h<20)return;const v=h*.42,dv=h*.3,ei=st===0?[132,84,56]:st===1?[92,92,84]:GOLD;R(.26,v-2,.48,dv+4,sh(st===2?MARMOR:[79,74,58],hell));R(.3,v,.4,dv,'#120d0a');
 if(seed<.55){R(.4,v+dv*.45,.04,1.6,'#f2c040');R(.54,v+dv*.45,.04,1.6,'#f2c040');}else if(seed<.75){R(.46,v+dv*.3,.06,2,'#e8dcc0');R(.47,v+dv*.3+2,.04,1.4,'#c8322a');}
 for(let i=0;i<5;i++){if(st===0&&i===2&&seed>.4){R(.32+i*.08,v,.025,dv*.4,sh(ei,hell));continue;}R(.32+i*.08,v,.025,dv,sh(ei,hell));}R(.3,v+dv*.48,.4,1.2,sh(ei,hell));
 if(st===0&&seed>.6){R(.3,v-1,.1,1.2,'#7a1a16');R(.33,v-3,.02,2,'#7a1a16');}};// Kratzer und Blut am Rahmen
// Wandschmuck im Beastrium: Ketten mit Halsband, Tierfell, Strichliste der Pfleger, Peitsche, Maulkorb, Kratzspuren
const schmuckB=(st,seed)=>(R,h)=>{if(h<20)return;const ei=st===0?'#7a5444':st===2?sh(GOLD,1):'#56585e';
 if(seed<.22){for(const u of [.3,.62]){for(let i=0;i<5;i++)R(u+(i%2)*.01,h*.72-i*2.2,.03,1.8,ei);R(u-.04,h*.72-12,.1,1.4,'#5a3a22');}}// Ketten mit Halsband
 else if(seed<.4){const c=st===2?[214,124,48]:st===1?[128,128,126]:[120,96,70];R(.3,h*.36,.4,h*.32,sh(c,1));R(.26,h*.6,.08,h*.08,sh(c,.9));R(.66,h*.6,.08,h*.08,sh(c,.9));R(.24,h*.38,.06,h*.06,sh(c,.9));R(.7,h*.38,.06,h*.06,sh(c,.9));if(st===2)for(const v of [.42,.52,.6])R(.36,h*v,.28,1,'#1a120c');}// Fell an der Wand
 else if(seed<.58){R(.28,h*.4,.44,h*.32,sh([214,198,156],1));R(.28,h*.4,.44,1,'#2a1c12');for(let i=0;i<7;i++)R(.32+i*.05,h*.46,.012,h*.18,'#2a1c12');R(.31,h*.55,.36,.8,'#2a1c12');R(.31,h*.66,.2,1,'#7a1a16');}// Strichliste: verlorene Pfleger
 else if(seed<.72){R(.5,h*.46,.03,h*.3,'#5a3a22');for(let i=0;i<6;i++)R(.53-i*.04,h*.46-i*1.2,.04,1,'#3a2618');}// Peitsche
 else if(seed<.84){R(.44,h*.5,.12,6,ei);R(.46,h*.5+1,.08,4,'#1a120c');for(let i=0;i<3;i++)R(.45+i*.035,h*.5,.012,6,ei);}// Maulkorb
 else{for(let i=0;i<4;i++)R(.3+i*.06,4+i*.4,.012,h*.4,st===2?'rgba(120,100,80,.5)':'rgba(40,28,18,.55)');}};// Kratzspuren
// Metallkäfig auf einem Feld: Boden, hintere Gitter, Inhalt und Tier, vordere Gitter, Deckel mit Schloss
function kaefigMalen(g,x,y,st,t,h){const s=t.s,ei=st===0?[128,78,52]:st===1?[70,72,78]:GOLD,H=st===2?22:19,x0=x+.1,y0=y+.1,x1=x+.9,y1=y+.9,n=st===2?5:6,col=sh(ei,1),dk=sh(ei,.62);
 if(st===0){oval(g,x+.5,y+.55,0,15,7,'rgba(70,40,28,.55)');if(s<.6)oval(g,x+.3+s*.2,y+.7,0,5,2.2,'rgba(122,22,18,.7)');}// Dreck und Blut
 else{flach(g,x0+.04,y0+.04,x1-.04,y1-.04,.3,sh(STROH,.82));g.strokeStyle=sh(STROH,1.08);g.lineWidth=1;for(let i=0;i<7;i++){const p=pt(x0+.08+W.h2(i,x+y,94)*.7,y0+.08+W.h2(i,x-y,95)*.7,.5);g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(p[0]+3,p[1]-1);g.stroke();}if(s<.5)oval(g,x+.32,y+.64,.5,4,1.8,'rgba(122,22,18,.7)');}
 if(st===2)flach(g,x+.22,y+.22,x+.62,y+.62,.6,sh(PURPUR,1),sh(GOLD,1));// Kissen für die Raubkatze
 const stab=(ax,ay,bx,by,c,lw)=>{g.strokeStyle=c;g.lineWidth=lw;g.beginPath();for(let i=0;i<=n;i++){const u=i/n,X=ax+(bx-ax)*u,Y=ay+(by-ay)*u,p=pt(X,Y,0),q=pt(X,Y,H);let ox=0;if(st===0&&W.h2(x*3+i,y+ax*7,96)<.14)ox=2;g.moveTo(Math.round(p[0])+.5,p[1]);g.quadraticCurveTo(p[0]+ox*2,(p[1]+q[1])/2,Math.round(q[0])+.5,q[1]);}g.stroke();};
 const quer=(ax,ay,bx,by,z,c)=>{const p=pt(ax,ay,z),q=pt(bx,by,z);g.strokeStyle=c;g.lineWidth=1;g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);g.stroke();};
 // hinten: Gitter an den beiden hinteren Seiten
 stab(x0,y0,x1,y0,dk,1);stab(x0,y0,x0,y1,dk,1);quer(x0,y0,x1,y0,H*.5,dk);quer(x0,y0,x0,y1,H*.5,dk);
 // Inhalt: Wassernapf, Blutknochen, ab und zu ein Schädel oder ein Helm
 oval(g,x+.74,y+.3,.6,3.4,1.6,st===2?sh(GOLD,1):'#5a5650');oval(g,x+.74,y+.3,1,2.4,1,st===0?'#5a6a3a':'#5a7a8a');
 const kn=(ax,ay,bx,by,blut)=>{const p=pt(ax,ay,1),q=pt(bx,by,1);g.strokeStyle='#e8e2d0';g.lineWidth=1;g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);g.stroke();g.fillStyle='#e8e2d0';g.fillRect(Math.round(p[0])-1,Math.round(p[1])-1,2,2);g.fillStyle=blut?'#8e1c18':'#e8e2d0';g.fillRect(Math.round(q[0])-1,Math.round(q[1])-1,2,2);if(blut){g.fillStyle='rgba(122,22,18,.6)';g.fillRect(Math.round(q[0])-2,Math.round(q[1])+1,4,1);}};
 kn(x+.2,y+.3,x+.32,y+.22,true);if(s>.3)kn(x+.7,y+.76,x+.8,y+.66,s>.6);
 if(s>.78){const p=pt(x+.26,y+.72,2);g.fillStyle='#e8e2d0';g.beginPath();g.ellipse(p[0],p[1],3,2.6,0,0,TAU);g.fill();g.fillStyle='#2a2019';g.fillRect(Math.round(p[0])-2,Math.round(p[1])-1,1,1);g.fillRect(Math.round(p[0])+1,Math.round(p[1])-1,1,1);}// Schädel
 else if(s<.12){const p=pt(x+.28,y+.7,1);g.fillStyle=sh(BRONZE,1);g.beginPath();g.ellipse(p[0],p[1]-1,4,2.6,0,Math.PI,TAU);g.fill();g.fillRect(Math.round(p[0])-4,Math.round(p[1])-1,8,1);}// Helm des Vormieters
 kaefigVorne(g,x,y,st,s);}
// Vordere Gitter, Deckel und Schloss eines Käfigs. Auch über ein lebendig gezeichnetes Tier noch einmal gemalt (Tier steht hinter dem Gitter).
function kaefigVorne(g,x,y,st,s){const ei=st===0?[128,78,52]:st===1?[70,72,78]:GOLD,H=st===2?22:19,x0=x+.1,y0=y+.1,x1=x+.9,y1=y+.9,n=st===2?5:6,col=sh(ei,1),dk=sh(ei,.62);
 const stab=(ax,ay,bx,by,c,lw)=>{g.strokeStyle=c;g.lineWidth=lw;g.beginPath();for(let i=0;i<=n;i++){const u=i/n,X=ax+(bx-ax)*u,Y=ay+(by-ay)*u,p=pt(X,Y,0),q=pt(X,Y,H);let ox=0;if(st===0&&W.h2(x*3+i,y+ax*7,96)<.14)ox=2;g.moveTo(Math.round(p[0])+.5,p[1]);g.quadraticCurveTo(p[0]+ox*2,(p[1]+q[1])/2,Math.round(q[0])+.5,q[1]);}g.stroke();};
 const quer=(ax,ay,bx,by,z,c)=>{const p=pt(ax,ay,z),q=pt(bx,by,z);g.strokeStyle=c;g.lineWidth=1;g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);g.stroke();};
 stab(x0,y1,x1,y1,col,1);stab(x1,y1,x1,y0,col,1);quer(x0,y1,x1,y1,H*.5,col);quer(x1,y1,x1,y0,H*.5,col);quer(x0,y1,x1,y1,1,col);quer(x1,y1,x1,y0,1,col);
 for(const z of [H]){quer(x0,y0,x1,y0,z,dk);quer(x0,y0,x0,y1,z,dk);quer(x0,y1,x1,y1,z,col);quer(x1,y1,x1,y0,z,col);}
 for(let i=1;i<4;i++)quer(x0+(x1-x0)*i/4,y0,x0+(x1-x0)*i/4,y1,H,dk);
 const lp=pt(x+.5,y1,H*.48);g.fillStyle=st===2?sh(GOLD,1.2):st===1?'#3a3a3a':'#6a4434';g.fillRect(Math.round(lp[0])-1,Math.round(lp[1])-1,3,3);
 if(st===2){for(const [ax,ay] of [[x0,y1],[x1,y1],[x1,y0]]){const p=pt(ax,ay,H);g.fillStyle=sh(GOLD,1.15);g.fillRect(Math.round(p[0])-1,Math.round(p[1])-3,2,3);}}// goldene Knäufe
 if(st===0&&s>.55){const p=pt(x1,y+.5,H*.7);g.fillStyle='#7a1a16';g.fillRect(Math.round(p[0])-1,Math.round(p[1]),2,4);}// Blut am Gitter
}
function schildchen(g,x,y,st){const p=pt(x+.3,y+.9,3);g.fillStyle='#2a1c12';g.fillRect(Math.round(p[0])-5,Math.round(p[1])-3,11,6);g.fillStyle='#f4d37a';g.fillRect(Math.round(p[0])-4,Math.round(p[1])-2,9,4);g.fillStyle='#2a1c12';g.fillRect(Math.round(p[0])-3,Math.round(p[1]),7,1);}// Namensschild unten am Gitter: hier sitzt ein echtes Tier, antippen
// Kram im Gang: Futtereimer mit Bein, Knochenhaufen, Blutlache mit Schleifspur, Fleischhaken, Wassertrog, Stroh; Kaiserlich: goldene Futterschale, Feuerschale
function kramB(g,x,y,seed,st,h){const a=S.lanista?.appearance||{};
 if(seed<.16){kiste(g,x+.36,y+.36,x+.64,y+.64,0,9,st===2?BRONZE:[96,84,70]);flach(g,x+.38,y+.38,x+.62,y+.62,9.1,'#5a1410');const p=pt(x+.52,y+.46,9);g.fillStyle=hex(a.skin||'#d9ac82');g.fillRect(Math.round(p[0])-1,Math.round(p[1])-9,3,9);g.fillStyle='#6e4a2a';g.fillRect(Math.round(p[0])-2,Math.round(p[1])-11,5,3);g.fillStyle='#8e1c18';g.fillRect(Math.round(p[0])-1,Math.round(p[1]),3,1);h.mist.push([x+.5,y+.5]);}// Futtereimer, ein Bein mit Sandale schaut heraus
 else if(seed<.3){g.strokeStyle='#e8e2d0';g.lineWidth=1.6;for(let i=0;i<6;i++){const p=pt(x+.3+W.h2(i,x,97)*.4,y+.3+W.h2(i,y,98)*.4,1+i*.8),q=pt(x+.3+W.h2(i,x,99)*.4,y+.3+W.h2(i,y,100)*.4,1+i*.8);g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);g.stroke();}oval(g,x+.5,y+.48,5,3,2.6,'#e8e2d0');const p=pt(x+.5,y+.48,5);g.fillStyle='#2a2019';g.fillRect(Math.round(p[0])-2,Math.round(p[1])-1,1,1);g.fillRect(Math.round(p[0])+1,Math.round(p[1])-1,1,1);g.fillStyle='#8e1c18';g.fillRect(Math.round(p[0])-3,Math.round(p[1])+2,6,1);}// Knochenhaufen mit Schädel
 else if(seed<.44){oval(g,x+.5,y+.5,0,9,4,'rgba(122,22,18,.8)');oval(g,x+.46,y+.48,0,4,1.6,'rgba(170,40,30,.7)');for(let i=0;i<3;i++){const p=pt(x+.55+i*.1,y+.42-i*.08,0);g.fillStyle='rgba(122,22,18,.6)';g.fillRect(Math.round(p[0]),Math.round(p[1]),4,1);}h.mist.push([x+.5,y+.5]);}// Blutlache mit Schleifspur
 else if(seed<.58){kiste(g,x+.46,y+.46,x+.54,y+.54,0,26,BALKEN);kiste(g,x+.3,y+.47,x+.7,y+.53,24,26,BALKEN);for(const [u,l] of [[.34,7],[.62,9]]){const p=pt(x+u,y+.5,24);g.strokeStyle='#3a3a3a';g.lineWidth=1;g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(p[0],p[1]+3);g.stroke();g.fillStyle='#9e2a24';g.fillRect(Math.round(p[0])-2,Math.round(p[1])+3,5,l);g.fillStyle='#e8d6c8';g.fillRect(Math.round(p[0])-1,Math.round(p[1])+3,1,l);}oval(g,x+.5,y+.56,0,4,1.6,'rgba(122,22,18,.7)');h.mist.push([x+.4,y+.4]);}// Fleischhaken
 else if(seed<.7){kiste(g,x+.24,y+.38,x+.76,y+.62,0,7,st===2?MARMOR:st===1?[128,120,108]:[110,84,56]);flach(g,x+.27,y+.41,x+.73,y+.59,7.1,st===0?'#4a5a2e':'#4a7084');}// Wassertrog
 else if(st===2&&seed<.85){for(const [dx,dy] of [[.4,.4],[.6,.42],[.5,.6]])kiste(g,x+dx-.015,y+dy-.015,x+dx+.015,y+dy+.015,0,9,BRONZE);oval(g,x+.5,y+.5,9,8,4,sh(BRONZE,1.1));oval(g,x+.5,y+.5,10,6,3,'#2a1c12');oval(g,x+.5,y+.5,11.5,4,3.4,'#ff9030');oval(g,x+.5,y+.5,13.5,2.2,3,'#ffe070');}// Feuerschale
 else if(st===2){oval(g,x+.5,y+.5,0,8,4,sh(GOLD,.9));oval(g,x+.5,y+.5,1.5,6,3,sh(GOLD,1.1));oval(g,x+.5,y+.5,2.5,4,2,'#9e2a24');}// goldene Futterschale
 else{for(const [a0,b0,a1,b1,z0,z1] of [[.24,.3,.7,.62,0,8],[.3,.36,.62,.56,8,13]])kiste(g,x+a0,y+b0,x+a1,y+b1,z0,z1,STROH,.9);kiste(g,x+.24,y+.45,x+.7,y+.48,0,8.4,[120,92,50]);}}// Strohballen
// Auf dem Dach: Geier (Knochengrube), Wetterhahn (Beastrium), goldener Löwe (Menagerie)
function dachTier(g,hoch,st){const z=hoch.z/4,p=pt(hoch.x+.5,hoch.y+.5,z),k=1.6,R=(dx,dy,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(p[0]+dx*k),Math.round(p[1]+dy*k),Math.ceil(w*k),Math.ceil(h*k));};
 if(st===0){R(-4,-6,7,5,'#2e2620');R(-6,-5,3,4,'#241e1a');R(3,-11,2,6,'#c89a8a');R(3,-12,3,2,'#c89a8a');R(6,-11,2,1,'#d9a838');R(4,-12,1,1,'#111');R(-1,-1,1,2,'#d9a838');R(1,-1,1,2,'#d9a838');R(-3,-7,6,1,'#e8e2d0');}// Geier wartet
 else if(st===1){R(0,-18,1,18,'#3a3a3a');R(-4,-4,9,1,'#3a3a3a');R(-5,-24,9,5,'#2e2e2e');R(2,-27,3,4,'#2e2e2e');R(5,-26,2,1,'#2e2e2e');R(-7,-27,3,4,'#2e2e2e');R(2,-28,2,1,'#8e1c18');}// Wetterhahn
 else{const G=sh(GOLD,1.1),D=sh(GOLD,.8);R(-6,-3,12,3,sh(MARMOR,1));R(-5,-9,9,5,G);R(-4,-4,1,1,D);R(3,-4,1,1,D);R(2,-14,6,7,D);R(4,-12,4,4,G);R(7,-10,1,1,'#2a1c12');R(-7,-9,2,1,G);R(-8,-8,1,2,D);}}// goldener Löwe
// ---------- Kaserne ----------
// Waffenständer in zwei Reihen, dann ein Gang (wie die Käfige). Je Ständer: Waffen (Schwert, Spatha, Speer, Axt, Dreizack),
// Rüstungen (Brustpanzer mit Helm auf einem Gestell) oder Schilde (rund, Scutum). Jeder Platz ist voll oder leer (h.slots).
// Sklaven tragen Stück für Stück hinein und legen es ab, oder holen eines heraus; so bleibt die Kaserne etwa halb voll.
// Die Gegenstände werden lebendig gezeichnet (kleine vorgezeichnete Bilder), nur im offenen Haus.
const STAENDER=['waffen','waffen','ruestung','schilde','waffen','ruestung'];
function staenderPlan(tiles,has,door,lang,bx0,by0,st){const rk=new Map(),slots=[];
 const istR=k=>{const x=k%N,y=(k/N)|0;return k!==door.k&&(lang?(x-bx0):(y-by0))%3!==1;};
 let ri=(W.h2(bx0,by0,110)*STAENDER.length)|0;for(const k of tiles){if(!istR(k))continue;const x=k%N,y=(k/N)|0,typ=STAENDER[ri++%STAENDER.length];// der Reihe nach: jede Kaserne hat Waffen, Rüstungen und Schilde
  // Ständer steht entlang der Reihe; die Gegenstände zeigen zum Gang (side ±1 quer zur Reihe)
  const q=(dx,dy)=>has(x+dx,y+dy)&&!istR((y+dy)*N+x+dx),side=lang?(q(1,0)?1:q(-1,0)?-1:1):(q(0,1)?1:q(0,-1)?-1:1);
  const r={k,typ,lang,side,slots:[]};rk.set(k,r);const n=typ==='waffen'?(st===0?4:5):typ==='ruestung'?2:3;
  for(let i=0;i<n;i++){const u=n===1?.5:.2+i*.6/(n-1),off=.5+side*(typ==='ruestung'?0:.16),wx=lang?x+off:x+u,wy=lang?y+u:y+off;
   const kind=typ==='waffen'?['gladius','spatha','speer','axt','dreizack'][(W.h2(x*7+i,y,111)*5)|0]:typ==='ruestung'?'ruestung':(W.h2(x+i,y*3,112)<.5?'rund':'scutum');
   const sl={k,i,wx,wy,z:typ==='ruestung'?7:0,kind,voll:false};r.slots.push(sl);slots.push(sl);}}
 // genau die Hälfte voll (fest je Grundriss)
 const ord=slots.map((s,i)=>[W.h2(s.k%N,s.k/N|0,113+s.i),s]).sort((a,b)=>a[0]-b[0]);ord.slice(0,slots.length>>1).forEach(([,s])=>s.voll=true);
 return {rk,slots};}
// Gestell (fest im Bild): Pfosten an beiden Enden, zwei Querlatten; Rüstungsständer: zwei Kreuzgestelle
function staender(g,x,y,st,r){const holz=st===0?[110,82,52]:st===1?BALKEN:MARMOR,kopf=st===2?GOLD:st===1?[60,62,66]:[96,70,44],L=r.lang,s=r.side,c=.5-s*.06;
 const P=(u,v)=>L?[x+c+v,y+u]:[x+u,y+c+v];
 if(r.typ==='ruestung'){for(const u of [.3,.7]){const [px,py]=P(u,0);kiste(g,px-.1,py-.1,px+.1,py+.1,0,2,holz,.9);kiste(g,px-.02,py-.02,px+.02,py+.02,2,18,holz);const a=pt(...P(u-.12,0),15),b=pt(...P(u+.12,0),15);g.strokeStyle=sh(holz,.8);g.lineWidth=2;g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();}return;}
 const H=r.typ==='schilde'?11:st===2?20:18,u0=.1,u1=.9;
 for(const u of [u0,u1]){const [px,py]=P(u,0);kiste(g,px-.035,py-.035,px+.035,py+.035,0,H+(st===0&&u===u1?-3:0),holz);if(st>0){const [qx,qy]=P(u,0);kiste(g,qx-.045,qy-.045,qx+.045,qy+.045,H,H+2,kopf);}}
 const rail=(z,dz,col)=>{const a=pt(...P(u0,0),z),b=pt(...P(u1,0),z+(dz||0));g.strokeStyle=col;g.lineWidth=st===0?1:1.6;g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();};
 rail(H-3,st===0?-4:0,sh(holz,.75));if(r.typ==='waffen'){rail(4,0,sh(holz,.65));const p=pt(...P(.5,0),.3);g.fillStyle='rgba(20,14,8,.25)';g.beginPath();g.ellipse(p[0],p[1],12,4,0,0,TAU);g.fill();}
 if(st===2){const p=pt(...P(.5,0),H+1);g.fillStyle=sh(GOLD,1.1);g.fillRect(Math.round(p[0])-2,Math.round(p[1])-4,4,4);}}
// Kleine Bilder der Gegenstände (aufrecht, Fuß unten Mitte), je Art und Klasse einmal gemalt
const DING=new Map();
function ding(kind,st){const key=kind+st;let d=DING.get(key);if(d)return d;const c=document.createElement('canvas');c.width=16;c.height=30;const g=c.getContext('2d'),R=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
 const ei=st===0?'#aaa092':st===1?'#b4b8bc':'#d8dce0',dk=st===0?'#6a5a4c':'#6a6e74',gr=st===2?'#e0b84a':st===1?'#a87a3a':'#6a4a2a',holz='#7a5432',blut='#8e1c18',br=st===0?'#8a6a3a':'#b88a40';
 if(kind==='gladius'){R(7,8,2,14,ei);R(7,8,1,14,dk);R(5,21,6,1,gr);R(7,22,2,5,holz);R(6,27,4,2,gr);if(st===0){R(7,8,2,4,blut);R(9,13,1,1,dk);R(8,16,1,2,'#9a5a34');}}
 else if(kind==='spatha'){R(7,4,2,18,ei);R(7,4,1,18,dk);R(4,21,8,1,gr);R(7,22,2,5,holz);R(6,27,4,2,gr);if(st===0)R(7,4,2,3,blut);}
 else if(kind==='speer'){R(7,4,1,26,holz);R(6,0,3,5,ei);R(7,0,1,1,ei);if(st===0)R(6,3,3,2,blut);if(st===2)R(6,5,3,1,gr);}
 else if(kind==='axt'){R(7,9,1,21,holz);R(3,9,5,6,ei);R(3,10,1,4,dk);if(st===0)R(3,13,2,2,blut);if(st===2)R(7,8,1,1,gr);}
 else if(kind==='dreizack'){R(7,6,1,24,holz);R(4,5,7,1,ei);R(4,1,1,4,ei);R(7,0,1,6,ei);R(10,1,1,4,ei);if(st===0)R(7,0,1,2,blut);}
 else if(kind==='rund'){g.fillStyle=st===2?'#b88a40':st===1?'#8a5a34':'#6e5236';g.beginPath();g.arc(8,21,7,0,TAU);g.fill();g.strokeStyle=st===2?'#e0b84a':'#5a5650';g.lineWidth=1.2;g.stroke();R(7,20,2,2,st===2?'#f0d070':'#9a9a90');if(st===0){R(11,15,1,6,holz);R(10,14,3,1,'#d8d0b0');}}// Pfeil steckt noch drin
 else if(kind==='scutum'){R(2,12,12,17,st===2?'#6a1c4a':'#8e2a22');R(2,12,12,1,gr);R(2,28,12,1,gr);R(2,12,1,17,gr);R(13,12,1,17,gr);R(6,18,4,4,st===2?'#f0d070':'#9a9a90');if(st===0){R(4,14,3,3,'#3a2a1a');R(10,24,2,3,'#3a2a1a');}if(st>0){R(7,13,2,4,gr);R(7,23,2,4,gr);}}
 else{// Rüstung auf dem Gestell: Brustpanzer und Helm
  const pz=st===0?'#7a5a3a':st===1?'#a0743c':'#d8b860';R(3,13,10,10,pz);R(4,23,8,2,pz);R(3,13,10,1,'#3a2a1a');R(7,14,2,8,st===2?'#f0d070':'#6a4a2a');R(1,13,2,4,pz);R(13,13,2,4,pz);
  R(5,5,6,7,st===0?'#6a6a62':st===1?'#9a9ea2':'#e0c060');R(4,10,8,2,st===0?'#6a6a62':'#7a7e82');R(6,8,4,2,'#1a120c');
  if(st===2){R(7,0,2,5,'#7a2a6a');R(6,1,4,3,'#9a3a8a');}else if(st===1)R(7,2,2,3,'#a32f2a');else{R(9,6,2,2,'#1a120c');R(4,16,2,2,blut);}}// Klasse 0: Helm mit Loch, Blut am Panzer
 d={c,w:16,h:30};DING.set(key,d);return d;}
function dingMalen(ctx,s,st,x,y,k=1){const d=ding(s.kind,st);ctx.drawImage(d.c,Math.round(x-d.w*k/2),Math.round(y-d.h*k),Math.round(d.w*k),Math.round(d.h*k));}
// Kram im Gang: Fass mit Speeren, Haufen verbeulter Helme (in der Bretterbude mit Schädel), Zuber zum Blut-Auswaschen, Schleifbock
function kramKas(g,x,y,seed,st,h){
 if(seed<.25){kiste(g,x+.38,y+.38,x+.62,y+.62,0,10,[118,82,48]);kiste(g,x+.38,y+.46,x+.63,y+.49,2,9,[60,56,52]);g.strokeStyle='#7a5432';g.lineWidth=1;for(let i=0;i<4;i++){const p=pt(x+.44+i*.04,y+.5,10);g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(p[0]-2+i,p[1]-14);g.stroke();g.fillStyle='#b4b8bc';g.fillRect(Math.round(p[0])-3+i,Math.round(p[1])-17,2,3);}}
 else if(seed<.45){for(const [dx,dy,z] of [[.4,.5,0],[.56,.46,0],[.48,.6,0],[.49,.5,4]]){const p=pt(x+dx,y+dy,z);g.fillStyle=st===2?'#d8b860':'#8a8e92';g.beginPath();g.ellipse(p[0],p[1]-3,4,3.4,0,Math.PI,TAU);g.fill();g.fillRect(Math.round(p[0])-4,Math.round(p[1])-3,8,2);}
  if(st===0){const p=pt(x+.62,y+.62,1);g.fillStyle='#e8e2d0';g.beginPath();g.ellipse(p[0],p[1],3,2.6,0,0,TAU);g.fill();g.fillStyle='#2a2019';g.fillRect(Math.round(p[0])-2,Math.round(p[1])-1,1,1);g.fillRect(Math.round(p[0])+1,Math.round(p[1])-1,1,1);}}
 else if(seed<.62){kiste(g,x+.3,y+.32,x+.7,y+.68,0,6,st===2?BRONZE:[118,86,54]);flach(g,x+.33,y+.35,x+.67,y+.65,6.1,'#7a2420');h.mist.push([x+.5,y+.5]);}// Zuber: Blut auswaschen
 else if(seed<.75){kiste(g,x+.4,y+.4,x+.6,y+.6,0,5,BALKEN);oval(g,x+.5,y+.5,9,6,6,'#8a8680');oval(g,x+.5,y+.5,9,2,2,'#5a5650');}}// Schleifstein
// Wandschmuck: gekreuzte Speere, Schild an der Wand, Helmbrett, Strichliste
const schmuckK=(st,seed)=>(R,h)=>{if(h<20)return;const ei=st===2?sh(GOLD,1):'#9a9ea2',ho='#7a5432';
 if(seed<.3){for(let i=0;i<10;i++){R(.25+i*.05,h*.3+i*1.4,.03,1.2,ho);R(.7-i*.05,h*.3+i*1.4,.03,1.2,ho);}R(.22,h*.3+13,.06,2,ei);R(.72,h*.3+13,.06,2,ei);}
 else if(seed<.55){R(.36,h*.38,.28,h*.36,st===2?'#6a1c4a':'#8e2a22');R(.36,h*.38,.28,1,st===2?sh(GOLD,1):'#c9a54a');R(.47,h*.52,.06,3,ei);}
 else if(seed<.75){R(.2,h*.56,.6,1.4,ho);for(const u of [.26,.46,.64]){R(u,h*.56+1.4,.1,4,st===2?sh(GOLD,1):'#8a8e92');R(u+.03,h*.56+2.4,.04,1,'#1a120c');}}};
// Dachschmuck der Kaserne: Helm auf dem Pfahl (Bretterbude), rotes Banner (Kaserne), goldener Adler (Prätorianer)
function dachZier(g,hoch,st){const z=hoch.z/4,p=pt(hoch.x+.5,hoch.y+.5,z),k=1.6,R=(dx,dy,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(p[0]+dx*k),Math.round(p[1]+dy*k),Math.ceil(w*k),Math.ceil(h*k));};
 if(st===0){R(0,-14,1,14,'#6a4a2a');R(-3,-19,7,5,'#7a7e82');R(-4,-15,9,1,'#5a5e62');R(-1,-17,3,1,'#1a120c');R(2,-18,1,1,'#1a120c');}
 else if(st===1){R(0,-24,1,24,'#4a3a2a');R(1,-24,9,7,'#a32f2a');R(1,-17,3,2,'#a32f2a');R(7,-17,3,2,'#a32f2a');R(3,-22,4,1,'#e0b84a');R(4,-21,2,2,'#e0b84a');}
 else{const G=sh(GOLD,1.1),D=sh(GOLD,.8);R(0,-12,1,12,D);R(-1,-14,3,2,G);R(-7,-22,6,3,G);R(2,-22,6,3,G);R(-6,-20,4,2,D);R(3,-20,4,2,D);R(-1,-23,3,7,G);R(-1,-25,2,2,G);R(1,-24,1,1,'#2a1c12');}}
// Sklaven tragen Ausrüstung hinein oder holen sie heraus (Weg über die Gangfelder, Breitensuche je Gang)
let SKLAVEN=null;
function sklave(i){if(!SKLAVEN){SKLAVEN=[];const rng=S.rng;for(let n=0;n<4;n++){try{const g=M.makeGladiator(0);g.id='welt-sklave-'+n;g.name='Sklave';g.appearance={...(g.appearance||{}),cloth:['#6e5a3c','#7a6a4a','#5e5040','#8a7650'][n]};SKLAVEN.push(g);}catch(e){}}S.rng=rng;}return SKLAVEN[i%Math.max(1,SKLAVEN.length)];}
function wegIm(h,ziel){const frei=k=>h.set.has(k)&&!h.rk.has(k),start=h.door.k,prev=new Map([[start,-1]]),q=[start];
 while(q.length){const k=q.shift();if(k===ziel)break;const x=k%N,y=(k/N)|0;for(const [dx,dy] of NB){const n=(y+dy)*N+x+dx;if(!h.has(x+dx,y+dy)||!frei(n)||prev.has(n))continue;prev.set(n,k);q.push(n);}}
 if(!prev.has(ziel))return null;const out=[];for(let k=ziel;k!==-1;k=prev.get(k))out.unshift([k%N+.5,((k/N)|0)+.5]);return out;}
function aussen(h){const x=h.door.k%N,y=(h.door.k/N)|0;return h.door.side==='y'?[x+.5,y+1.4]:[x+1.4,y+.5];}
function tour(h,tr){const voll=h.slots.filter(s=>s.voll).length/Math.max(1,h.slots.length),rein=Math.random()<(voll<.5?.75:.3),frei=h.slots.filter(s=>s.voll!==rein&&!s.ziel);
 const sl=frei[(Math.random()*frei.length)|0];if(!sl){tr.st='pause';tr.wait=2;return;}const r=h.rk.get(sl.k),x=sl.k%N,y=(sl.k/N)|0,gk=r.lang?y*N+x+r.side:(y+r.side)*N+x;
 let ziel=h.set.has(gk)&&!h.rk.has(gk)?gk:null;if(ziel==null)for(const [dx,dy] of NB){const n=(y+dy)*N+x+dx;if(h.has(x+dx,y+dy)&&!h.rk.has(n)){ziel=n;break;}}
 const weg=ziel!=null&&wegIm(h,ziel);if(!weg){tr.st='pause';tr.wait=3;return;}
 const stand=r.lang?[sl.wx+r.side*.26,sl.wy]:[sl.wx,sl.wy+r.side*.26];sl.ziel=true;
 Object.assign(tr,{st:'hin',slot:sl,rein,carry:rein?sl.kind:null,pts:[aussen(h),...weg,stand],i:0,x:aussen(h)[0],y:aussen(h)[1]});}
function tragen(h,dt){const n=h.slots.length?Math.min(3,1+(h.slots.length>>4)):0;while(h.trager.length<n)h.trager.push({g:sklave(h.trager.length+(h.id%3)),st:'pause',wait:.5+h.trager.length*1.7,dist:0,dir:0,x:0,y:0});
 for(const tr of h.trager){if(tr.st==='pause'){tr.wait-=dt;if(tr.wait<=0)tour(h,tr);continue;}
  if(tr.st==='ablegen'){tr.wait-=dt;if(tr.wait<=0){const s=tr.slot;s.voll=tr.rein;s.ziel=false;tr.carry=tr.rein?null:s.kind;tr.pts=tr.pts.slice().reverse();tr.i=0;tr.st='zurueck';h.zahl=h.slots.filter(q=>q.voll).length+'/'+h.slots.length;}continue;}
  const [gx,gy]=tr.pts[tr.i+1]||tr.pts[tr.i],dx=gx-tr.x,dy=gy-tr.y,d=Math.hypot(dx,dy),step=dt*.8;
  const a=W.iso(tr.x,tr.y);if(d<=step){tr.x=gx;tr.y=gy;tr.i++;}else{tr.x+=dx/d*step;tr.y+=dy/d*step;}const b=W.iso(tr.x,tr.y);tr.dist+=Math.hypot(b.x-a.x,b.y-a.y);if(Math.abs(b.x-a.x)>.01)tr.dir=b.x<a.x?1:0;
  if(tr.i>=tr.pts.length-1){if(tr.st==='hin'){tr.st='ablegen';tr.wait=.8;const s=W.iso(tr.slot.wx,tr.slot.wy);tr.dir=s.x<b.x?1:0;}else{tr.st='pause';tr.carry=null;tr.wait=1.5+Math.random()*3;}}}}
// Gegenstände und Träger zeichnen, nach Bildhöhe sortiert (im offenen Haus)
function lagerMalen(ctx,h,a){ctx.globalAlpha=Math.min(1,a*1.5);const L=[];
 for(const s of h.slots)if(s.voll){const p=W.iso(s.wx,s.wy);L.push([p.y,0,s,p]);}
 for(const tr of h.trager)if(tr.st!=='pause'){const p=W.iso(tr.x,tr.y);L.push([p.y+.01,1,tr,p]);}
 L.sort((A,B)=>A[0]-B[0]);for(const [,typ,o,p] of L){if(typ===0){dingMalen(ctx,o,h.st,p.x,p.y-o.z);continue;}
  W.drawFig(ctx,o.g,Math.round(p.x),Math.round(p.y),o.st==='ablegen'?8:W.gehBild(o.dist),o.dir);if(o.carry)dingMalen(ctx,{kind:o.carry},h.st,p.x+(o.dir?-3:3),p.y-W.HOEHE+6,.75);}
 ctx.globalAlpha=1;}
// ---------- Medicus und Krankenhaus ----------
// Medicus (fest im Ludus), eingerichtet wie der Behandlungsraum im Spiel (doktor.js): ein Behandlungsstuhl, höchstens zwei Betten
// für Amputationen, dunkle Steinfliesen, Dielen mit Blut, Regal mit Gläsern, Knochensäge, Zange, Diplom, Strichliste, Kerze.
// Außen wie die Fassade im Spiel (medicus-art.js): heller Stein, grüngraues Schieferdach mit Kamin, weißes Kreuz über der Tür.
// Krankenhaus (baubar): nur Betten.
function krankenbett(g,x,y,seed){kiste(g,x+.14,y+.22,x+.86,y+.78,0,6,[150,116,78]);kiste(g,x+.14,y+.22,x+.2,y+.78,6,13,[150,116,78],.9);
 kiste(g,x+.2,y+.26,x+.84,y+.74,6,8.4,[236,232,220]);kiste(g,x+.22,y+.32,x+.36,y+.68,8.4,10.4,[246,244,236]);flach(g,x+.44,y+.26,x+.84,y+.74,8.5,sh([214,206,186],1),sh([170,160,140],1));
 if(seed>.7){const p=pt(x+.6,y+.5,8.6);g.fillStyle='rgba(142,28,24,.75)';g.beginPath();g.ellipse(p[0],p[1],5,2.2,0,0,TAU);g.fill();}}// alter Blutfleck, gewaschen wird freitags
function kramMed(g,x,y,seed,h){const a=S.lanista?.appearance||{};
 if(seed<.25){kiste(g,x+.36,y+.36,x+.64,y+.64,0,9,[96,84,70]);flach(g,x+.38,y+.38,x+.62,y+.62,9.1,'#5a1410');const p=pt(x+.48,y+.5,9);g.fillStyle=hex(a.skin||'#d9ac82');g.fillRect(Math.round(p[0])-1,Math.round(p[1])-10,3,10);g.fillRect(Math.round(p[0])-3,Math.round(p[1])-12,6,3);g.fillStyle='#8e1c18';g.fillRect(Math.round(p[0])-1,Math.round(p[1]),3,1);h.mist.push([x+.5,y+.5]);}// Eimer, eine Hand winkt heraus
 else if(seed<.45){kiste(g,x+.3,y+.38,x+.7,y+.62,0,16,[120,86,52]);flach(g,x+.3,y+.38,x+.7,y+.62,16.1,sh([120,86,52],1.15));for(let i=0;i<4;i++){const p=pt(x+.36+i*.09,y+.5,16);g.fillStyle=i%2?'#b4b8bc':'#8a8e92';g.fillRect(Math.round(p[0]),Math.round(p[1])-5,1,5);}}// Instrumentenschrank
 else if(seed<.62){oval(g,x+.5,y+.5,0,8,4,'#8a6a3a');oval(g,x+.5,y+.5,3,7,3.4,'#6a8a3a');oval(g,x+.46,y+.48,5,4,2,'#8aaa4a');}// Kräuterkorb
 else if(seed<.8){for(const [dx,dy,c] of [[.4,.42,[178,104,62]],[.58,.5,[120,140,110]],[.46,.6,[150,90,120]]]){const p=pt(x+dx,y+dy);g.fillStyle=sh(c,1);g.beginPath();g.ellipse(p[0],p[1]-5,3.4,5,0,0,TAU);g.fill();g.fillStyle='#e8e0c8';g.fillRect(Math.round(p[0])-2,Math.round(p[1])-6,4,2);}}}// Tinkturen
// Behandlungsstuhl wie im Spiel (doktor.js): Holzpfosten, Lehne mit blutigem Lederpolster, Armlehnen, Brustgurt mit Schnalle, Blut darunter
function behandlungsstuhl(g,x,y){oval(g,x+.5,y+.62,0,13,5,'rgba(94,31,28,.85)');oval(g,x+.62,y+.7,0,5,2,'rgba(110,29,24,.9)');
 const H=[62,44,29],HL=[107,76,46],LE=[106,47,42];
 for(const [dx,dy] of [[.28,.32],[.68,.32],[.28,.7],[.68,.7]])kiste(g,x+dx,y+dy,x+dx+.05,y+dy+.05,0,10,H);
 kiste(g,x+.26,y+.3,x+.75,y+.77,10,13,HL);flach(g,x+.3,y+.34,x+.71,y+.73,13.1,sh(LE,1));// Sitz mit Leder
 kiste(g,x+.24,y+.26,x+.31,y+.32,0,32,H);kiste(g,x+.24,y+.75,x+.31,y+.81,0,32,H);// hohe Pfosten der Lehne
 kiste(g,x+.25,y+.32,x+.3,y+.75,13,31,LE,.9);flach(g,x+.25,y+.32,x+.3,y+.75,31.1,sh([138,63,54],1));// Lederlehne
 for(const [u,z,r] of [[.45,24,3],[.6,19,2]]){const p=pt(x+.31,y+u,z);g.fillStyle='#4a1612';g.beginPath();g.ellipse(p[0],p[1],r+1,r*.6,0,0,TAU);g.fill();}// Blut auf dem Polster
 for(const v of [.3,.74])kiste(g,x+.3,y+v,x+.72,y+v+.05,13,16,[91,67,48]);// Armlehnen
 kiste(g,x+.3,y+.32,x+.33,y+.76,22,24,[74,47,29]);const s=pt(x+.33,y+.54,23);g.fillStyle='#c9a85e';g.fillRect(Math.round(s[0])-2,Math.round(s[1])-2,4,4);g.fillStyle='#4a2f1d';g.fillRect(Math.round(s[0])-1,Math.round(s[1])-1,2,2);// Brustgurt mit Schnalle
 for(const v of [.38,.68]){const p=pt(x+.27,y+v,32);g.fillStyle='#7d8687';g.fillRect(Math.round(p[0])-2,Math.round(p[1])-2,4,3);}}// Eisenkappen
// Bett für Amputationen: blutdurchtränktes Laken, Lederriemen, Eimer daneben
function amputationsbett(g,x,y,seed){krankenbett(g,x,y,1);const p=pt(x+.62,y+.5,8.6);g.fillStyle='rgba(122,22,18,.8)';g.beginPath();g.ellipse(p[0],p[1],9,3.6,0,0,TAU);g.fill();
 for(const u of [.44,.7]){const a=pt(x+u,y+.24,8.8),b=pt(x+u,y+.76,8.8);g.strokeStyle='#5a3a22';g.lineWidth=1.5;g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();}
 kiste(g,x+.8,y+.8,x+.94,y+.94,0,6,[96,84,70]);flach(g,x+.81,y+.81,x+.93,y+.93,6.1,'#5a1410');}
// Wände innen (wie der Behandlungsraum im Spiel): dunkle grüngraue Steinfliesen, Fugen, Blutspritzer
function medInnen(R,h,hell,z,voll){R(0,0,1,h,sh([52,64,59],hell));for(let v=0,r=0;v<h-1;v+=4,r++)for(let u=-(r%2)*.09,i=0;u<1;u+=.18,i++){const a=Math.max(0,u+.01),b=Math.min(1,u+.17),q=z(i+r*11,61);if(b>a)R(a,v+.5,b-a,3.4,sh(q>.66?[63,76,70]:q>.33?[57,69,64]:[67,81,74],hell));}
 if(voll)for(let i=0;i<5;i++){const u=.08+z(i,62)*.84,v=6+z(i,63)*(h-14);R(u,v,.04,2,sh([110,29,24],hell));if(i%2===0)R(u+.012,v-3,.012,3,sh([110,29,24],hell));}}
// Wände außen (wie die Fassade im Spiel): heller Stein, Fugen, dunkle Ecksteine, Sockelband
function medAussen(R,h,hell,z,voll){R(0,0,1,h,sh([201,188,156],hell));for(let v=5,r=0;v<h-4;v+=6,r++)for(let u=.04+(r%2)*.12;u<.92;u+=.26)R(u,v,.12,.8,sh([184,171,138],hell));
 R(0,0,1,Math.min(5,h*.5),sh([122,119,102],hell));R(0,Math.min(5,h*.5)-1,1,1,sh([162,158,138],hell));
 for(const u of [0,.92])for(let v=0,i=0;v<h;v+=7,i++)R(u,v,.08,6.4,sh(i%2?[160,156,136]:[148,143,124],hell));}
// Wandschmuck innen wie im Spiel: Regal mit Gläsern (Auge, Herz, Zähne), Knochensäge, Zange, schiefes Diplom, Strichliste der Patienten, Kerze
const schmuckMed=(st,seed)=>(R,h)=>{if(h<20)return;
 if(seed<.22){R(.12,h*.46,.76,1.4,'#5b4330');for(const [u,c1,c2] of [[.18,'#f2f2e6','#3a7fb0'],[.42,'#b0282a','#b0282a'],[.66,'#f0ead2','#e8c24a']]){R(u,h*.46+1.4,.14,7,'#8fb8b4');R(u+.02,h*.46+2,.1,5.6,'#3f6b66');R(u+.05,h*.46+4,.04,2,c1);R(u+.06,h*.46+4.6,.02,1,c2);}}// Gläser
 else if(seed<.4){R(.24,h*.6,.46,1.6,'#9aa3a6');for(let i=0;i<9;i++)R(.26+i*.045,h*.6-1,.02,1,'#5f686a');R(.7,h*.6-.5,.1,3,'#6b4c2e');R(.36,h*.38,.03,7,'#8a8e92');R(.42,h*.38,.03,7,'#8a8e92');R(.37,h*.38+7,.07,2,'#8a8e92');}// Knochensäge und Zange
 else if(seed<.55){R(.3,h*.42,.38,h*.3,'#d9cfa8');R(.3,h*.42+h*.3-1,.38,1,'#b8ab8a');R(.34,h*.62,.3,1,'#3a3327');R(.34,h*.58,.22,1,'#3a3327');R(.36,h*.48,.28,.8,'#a83a2c');}// Diplom (schief durchgestrichen)
 else if(seed<.7){R(.18,h*.42,.64,h*.36,'#2b2f2a');R(.18,h*.42+h*.36-1,.64,1,'#5b4330');R(.18,h*.42,.64,1,'#5b4330');for(let i=0;i<9;i++)R(.24+i*.05+(i>4?.03:0),h*.58,.012,4,'#d8d4c4');R(.24,h*.46,.3,.8,'#d8d4c4');R(.6,h*.46,.012,3,'#d8d4c4');}// Strichliste: PATIENTEN ||||| |||| · GESUND: |
 else if(seed<.9){R(.46,h*.5,.08,1.4,'#5b4330');R(.48,h*.5+1.4,.04,5,'#e8dcc0');R(.495,h*.5+6.4,.012,2,'#f4c45a');}};// Kerze
// Haustür des Medicus mit weißem Kreuz (grün umrandet) darüber
const tuerMed=hell=>(R,h)=>{tuer(1,hell)(R,h);if(h<20)return;const v=WAND*.74+3;R(.47,v,.06,9,'#3f8a4e');R(.4,v+5,.2,2.4,'#3f8a4e');R(.48,v+.6,.04,7.8,'#e8dfc4');R(.41,v+5.4,.18,1.6,'#e8dfc4');};
// ---------- Echte Tiere (Test, Thomas 12.11.) ----------
// Im ersten Beastrium sitzen in den zwei Käfigen nahe der Tür ein echter Hahn (Hahnen-Modell, CF) und ein echter Hund (DOG) zum Ausprobieren.
// Antippen des Käfigs im offenen Haus öffnet die Großaufnahme wie im Hauptspiel: beim Hahn genau die aus dem Beastrium
// (huehnerschule.js, ohne Schlachten), beim Hund Hundebild und Werte wie im Zwinger, im selben Rahmen. Nur Anzeige, kein Spielstand.
let TT=null;
function testTiere(){if(TT)return TT;TT={};try{TT.hahn=window.CF?.createRooster?.({seed:7031,minQuality:2,maxQuality:2});}catch(e){console.warn(e);}try{TT.hund=window.DOG?.create?.('mastiff',4242);if(TT.hund&&!TT.hund.name)TT.hund.name='Zerberus';}catch(e){console.warn(e);}return TT;}
// Nur Tiere, die wirklich da sind (Thomas 12.11.): lebende Hähne (Hühnerschule) und Hunde (Zwinger) aus dem Spielstand und die zwei
// Testtiere. Sie werden der Reihe nach auf die Käfige verteilt (Beastrium des Ludus zuerst, dann nach Lage, Käfige nahe der Tür zuerst); leere Käfige bleiben leer.
function tierListe(){const L=[];try{for(const R of window.HS?.alive?.()||[])L.push({art:'hahn',R});}catch{}for(const D of S.hundefang?.dogs||[])if(!D.dead)L.push({art:'hund',R:D});
 const tt=testTiere();if(tt.hahn)L.push({art:'hahn',R:tt.hahn});if(tt.hund)L.push({art:'hund',R:tt.hund});return L;}
let belegtT=0;
function belegen(){const L=tierListe();let i=0;const imLudus=h=>W.bauAuf?.[h.door.k]>=0?0:1;for(const h of haeuser.filter(h=>h.art==='beast').sort((a,b)=>imLudus(a)-imLudus(b)||a.id-b.id)){const dx=h.door.k%N,dy=(h.door.k/N)|0,ks=[...h.kaefig.keys()].sort((a,b)=>Math.hypot(a%N-dx,((a/N)|0)-dy)-Math.hypot(b%N-dx,((b/N)|0)-dy));
 for(const k of ks){const t=h.kaefig.get(k),neuT=L[i++]||null;if(t.tier?.R!==neuT?.R)t.tier=neuT?{...neuT,ph:Math.random()*9,face:Math.random()<.5?1:-1}:null;}}}
// Hahn wie in der Arena (CF.drawRoosterSide in ein kleines Pixelbild), etwa achtmal je Sekunde neu
const HAHNBILD=new Map();
function hahnMalen(ctx,R,x,y,face,t){const CU=window.RoosterCloseup,CF=window.CF;if(!CU?.Sprite||!CF?.drawRoosterSide)return;let b=HAHNBILD.get(R);if(!b){b={sp:new CU.Sprite(80,70),last:-1,face:0};HAHNBILD.set(R,b);}
 if(t-b.last>.12||b.face!==face){b.last=t;b.face=face;try{const P=b.sp.begin();P.setT(40,60,1,face,0,0,-14);CF.drawRoosterSide(P,R,{bob:Math.sin(t*6+R.height)*.3,blink:(t+R.height)%3.4<.12,peck:(t*.5+R.height)%5<.6?1:0},t*1000);b.sp.commit();}catch(e){}}
 const k=21/(CF.WORLD?.roosterModelUnits||60)*Math.min(1.3,Math.max(.8,(R.height||45)/45));ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(0,1,6,2,0,0,TAU);ctx.fill();ctx.imageSmoothingEnabled=false;ctx.scale(k,k);ctx.drawImage(b.sp.cv,-40,-60);ctx.restore();}
// Tiere in den Käfigen zeichnen (offenes Haus), danach das vordere Gitter darüber
function tiereMalen(ctx,h,a,t){const L=[];for(const [k,c] of h.kaefig)if(c.tier)L.push([k,c]);if(!L.length)return;L.sort((A,B)=>(A[0]%N+((A[0]/N)|0))-(B[0]%N+((B[0]/N)|0)));ctx.globalAlpha=Math.min(1,a*1.5);
 for(const [k,c] of L){const x=k%N,y=(k/N)|0,p=W.iso(x+.52,y+.6),z=c.tier,ph=Math.floor((t+z.ph)/4)%4,face=ph===3?-z.face:z.face;
  try{if(z.art==='hahn')hahnMalen(ctx,z.R,p.x,p.y,face,t);else window.DOG?.portrait?.(ctx,z.R,{x:p.x,y:p.y,w:24+(z.R.height||70)*.1,mood:['focus','idle','proud','focus'][ph],face,t:t+z.ph});}catch(e){}
  kaefigVorne(ctx,x,y,h.st,c.s);schildchen(ctx,x,y,h.st);}
 ctx.globalAlpha=1;}
const echtAt=(h,tx,ty)=>{if(h.art!=='beast')return null;const t=h.kaefig.get(ty*N+tx);return t?.tier?t.tier:null;};
function tierOeffnen(t){if(t.art==='hahn'){const HS=window.HS;if(HS?.openDetail){HS.openDetail(t.R,{anim:true,nokill:true});return true;}return false;}return hundOeffnen(t.R);}
let hd=null;
function hundOeffnen(D){const DOG=window.DOG;if(!DOG?.portrait)return false;hundZu();const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 let I={};try{I=window.Begleithund?.info?.(D)||{};}catch{}const kw=I.kw??(()=>{try{return DOG.kw(D);}catch{return '?';}})(),hp=I.hp??(()=>{try{return Math.round(DOG.condHealth(D));}catch{return 100;}})(),sk=I.sk||1;
 const st=(DOG.STATS||[]).map(([k,n])=>`<tr><th>${esc(n)}</th><td class="v">${Math.round(D.stats?.[k]||0)}</td><td class="bar"><i style="width:${clamp(D.stats?.[k]||0,0,100)}%"></i><em style="left:${clamp(D.caps?.[k]||0,0,100)}%"></em></td><td class="c">${Math.round(D.caps?.[k]||0)}</td></tr>`).join('');
 const v=document.createElement('div');v.className='hs-detail welt-hund';
 v.innerHTML=`<div class="hs-dbox" role="dialog" aria-label="${esc(D.name)}"><header><button class="hs-x" data-whund="zu" aria-label="Schließen">✕</button><p class="eyebrow">BEASTRIUM · HUND</p><h2>${esc(D.name)}</h2><p class="hs-qual">${'☠'.repeat(sk)} ${esc(I.cls||'Gefahrenklasse '+sk)} · ${esc(I.breed||D.breedName||'')}</p></header>
 <div class="hs-pstage"><canvas width="320" height="200" class="px"></canvas><div class="hs-bubble"></div></div>
 <div class="hs-dgrid"><span>KW <b>${esc(kw)}</b></span><span>Gesundheit <b>${esc(hp)} %</b></span><span>Zustand <b>${esc(I.inj?.label||'unverletzt')}</b></span><span>Kämpfe <b>${D.fights||0}</b> · Siege <b>${D.wins||0}</b> · Getötet <b>${D.kills||0}</b></span></div>
 <table class="hs-stats"><tbody>${st}</tbody></table><p class="hs-legend"><i class="ist"></i> IST · was er jetzt kann &nbsp; <i class="soll"></i> SOLL · was aus ihm werden kann</p>
 <p class="hs-chips"><span>${D.sex==='Hündin'?'♀ Hündin':'♂ Rüde'}</span><span>${esc(D.height)} cm · ${esc(D.weight)} kg</span>${D.from?`<span>⛓ ${esc(D.from)}</span>`:''}</p></div>`;
 document.body.appendChild(v);v.addEventListener('click',e=>{if(e.target===v||e.target.closest('[data-whund=zu]'))hundZu();});
 const cv=v.querySelector('canvas'),c=cv.getContext('2d'),bub=v.querySelector('.hs-bubble');c.imageSmoothingEnabled=false;
 const SAGT=['*knurrt*','*beschnuppert das Gitter*','*leckt sich Blut von der Schnauze*','*zeigt die Zähne*','*kaut auf etwas, das mal ein Finger war*'];let last=-1;
 const tick=()=>{if(!hd||hd.v!==v)return;const t=performance.now()/1000,ph=Math.floor(t/3.2)%4;// Großaufnahme im Käfig: Stroh, Gitter, Hund wechselt Haltung
  c.fillStyle='#16110c';c.fillRect(0,0,320,200);c.fillStyle='#3a2d1e';c.fillRect(0,150,320,50);c.fillStyle='#8a7444';for(let i=0;i<60;i++){const x=(i*53)%320,y=152+(i*29)%46;c.fillRect(x,y,6,1);}
  c.fillStyle='#e8e2d0';c.fillRect(250,176,22,3);c.fillStyle='#8e1c18';c.fillRect(270,175,4,5);c.fillStyle='rgba(122,22,18,.6)';c.fillRect(236,182,30,3);
  try{DOG.portrait(c,D,{x:150,y:170,w:200,mood:['focus','proud','idle','focus'][ph],face:ph===3?-1:1,t});}catch(e){console.warn(e);}
  c.fillStyle='#4e5258';for(let x=8;x<320;x+=26)c.fillRect(x,0,3,200);c.fillRect(0,8,320,3);c.fillRect(0,96,320,2);
  const sg=Math.floor(t/4.5)%SAGT.length;if(sg!==last){last=sg;bub.textContent=SAGT[sg];bub.className='hs-bubble show q2';}
  hd.raf=requestAnimationFrame(tick);};
 hd={v,raf:0};tick();return true;}
function hundZu(){if(!hd)return;cancelAnimationFrame(hd.raf);hd.v.remove();hd=null;}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&hd)hundZu();});
// ---------- Bestand ----------
let haeuser=[];const alt=new Map(),fest=new Set();
function neu(){const seen=new Set(),out=[];let erstes=true;for(let k=0;k<N*N;k++){if(!STUFE.has(W.feld[k])||seen.has(k))continue;const t=gebiet(k);for(const q of t)seen.add(q);const h=plan(t),o=alt.get(h.id);h.sig=h.art+h.st+':'+h.tiles.join(',');h.offen=o?o.offen:0;h.mist=[];h.gang=[];if(o&&o.sig===h.sig){h.zu=o.zu;h.auf=o.auf;h.rauch=o.rauch;h.mist=o.mist;h.gang=o.gang;h.essenZu=o.essenZu;h.essenAuf=o.essenAuf;if(o.slots?.length){h.slots.forEach((sl,i)=>{const q=o.slots[i];if(q){sl.voll=q.voll;sl.ziel=q.ziel;}});h.trager=o.trager.map(tr=>({...tr,slot:tr.slot?h.slots[o.slots.indexOf(tr.slot)]:null}));h.zahl=o.zahl;}h.poster.forEach((p,i)=>p.text=o.poster[i]?.text||'');}if(h.poster.some(p=>!p.text))wuerfeln(h);out.push(h);}
 alt.clear();for(const h of out)alt.set(h.id,h);for(const id of fest)if(!alt.has(id))fest.delete(id);haeuser=out;belegen();}
const hausAt=(tx,ty)=>haeuser.find(h=>tx>=h.bx0&&tx<=h.bx1&&ty>=h.by0&&ty<=h.by1&&h.has(tx,ty));
// Maus über dem Haus öffnet das Dach
let maus=null;W.canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'){maus=null;return;}const r=W.canvas.getBoundingClientRect();maus={sx:e.clientX-r.left,sy:e.clientY-r.top};});W.canvas.addEventListener('pointerleave',()=>{maus=null;});
let last=performance.now(),spruch=null;const OFFEN_AB=1.5;
function zeichne(ctx){const h=this.h;if(h.art==='kaserne'){const n=performance.now(),dt=Math.min(.1,(n-(h.tT||n))/1000);h.tT=n;tragen(h,dt);}const mal=h.art==='schmiede'?maleSchmiede:male;if(!h.zu)h.zu=mal(h,false);const a=h.offen,t=performance.now()/1000;
 if(a>.01){if(!h.auf)h.auf=mal(h,true);ctx.drawImage(h.auf.c,h.auf.ox,h.auf.oy);if(h.art==='beast'&&a>.3&&!W.mini)tiereMalen(ctx,h,a,t);if(h.art==='kaserne'&&a>.3&&!W.mini)lagerMalen(ctx,h,a);
  if((h.st===0||h.art==='beast')&&a>.5&&!W.mini){// Ratten huschen durch die Gänge, Fliegen kreisen über Haufen, Eimer und Blut
   const G=h.gang;if(h.st===0&&G.length>1)for(let i=0;i<Math.min(6,1+(h.n>>3));i++){const k0=G[(i*7)%G.length],k1=G[(i*13+3)%G.length],u=(Math.sin(t*(.5+i*.13)+i*2)+1)/2,x=k0%N+.5+((k1%N)-(k0%N))*u,y=((k0/N)|0)+.5+(((k1/N)|0)-((k0/N)|0))*u,p=W.iso(x,y),d=Math.cos(t*(.5+i*.13)+i*2)>0?1:-1;
    ctx.fillStyle='#2e2822';ctx.fillRect(Math.round(p.x)-2,Math.round(p.y)-2,5,2);ctx.fillRect(Math.round(p.x)+(d>0?2:-3),Math.round(p.y)-3,2,2);ctx.fillStyle='#8a6a60';ctx.fillRect(Math.round(p.x)+(d>0?-5:3),Math.round(p.y)-1,3,1);}
   ctx.fillStyle='#14100c';for(const [mx,my] of h.mist){const p=W.iso(mx,my);for(let i=0;i<3;i++)ctx.fillRect(Math.round(p.x+Math.cos(t*5+i*2.1)*6),Math.round(p.y-9-i*3+Math.sin(t*7+i)*3),1,1);}}}
 if(a<.99){ctx.globalAlpha=1-a;ctx.drawImage(h.zu.c,h.zu.ox,h.zu.oy);
  if(h.rauch&&!W.mini){for(let i=0;i<4;i++){const u=((t*.22+i/4+h.id*.13)%1),r=2+u*5;ctx.globalAlpha=(1-a)*(1-u)*.5;ctx.fillStyle='#d8d4cc';ctx.fillRect(Math.round(h.rauch.x+Math.sin(u*5+i)*3+u*6-r/2),Math.round(h.rauch.y-4-u*26-r/2),Math.round(r),Math.round(r));}}
  ctx.globalAlpha=1;}
 if(h.art==='schmiede'&&!W.mini)funken(ctx,h,a,t);}
// Leben in der Schmiede: Glut in den Essen, Funken an Amboss und Schleifstein, Rauch aus den Schornsteinen
function funken(ctx,h,a,t){ctx.globalCompositeOperation='lighter';
 for(const [k,r] of h.stat){const inC=h.dach.has(k),vis=inC?a:1;if(vis<.3)continue;const x=k%N,y=(k/N)|0;
  if(r==='esse'){const p=W.iso(x+.5,y+.8),f=.5+.22*Math.sin(t*9+k)+.14*Math.sin(t*23+k*3);ctx.globalAlpha=f*vis;ctx.fillStyle='#ff7a20';ctx.beginPath();ctx.ellipse(p.x,p.y-5,7,4.5,0,0,TAU);ctx.fill();ctx.globalAlpha=f*vis*.8;ctx.fillStyle='#ffd060';ctx.beginPath();ctx.ellipse(p.x,p.y-5,3,2,0,0,TAU);ctx.fill();}
  else if(r==='amboss'||r==='schleif'){const per=r==='amboss'?1.25:2.2,ph=((t+W.h2(x,y,67)*per)%per)/per;if(ph<.32){const q=ph/.32,p=W.iso(x+(r==='amboss'?.45:.5),y+.5),z=r==='amboss'?14:11;for(let i=0;i<7;i++){const ang=i*.9+k*.7,d=q*(7+i*1.6);ctx.globalAlpha=(1-q)*vis;ctx.fillStyle=i%2?'#ffd060':'#ff9a30';ctx.fillRect(Math.round(p.x+Math.cos(ang)*d),Math.round(p.y-z-Math.abs(Math.sin(ang))*d*.9+q*q*9),1,1);}}}}
 ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
 for(const [L,w] of [[h.essenZu,1-a],[h.essenAuf,a]]){if(!L||w<.05)continue;for(const e of L)for(let i=0;i<4;i++){const u=((t*.3+i/4+e.x*.01)%1),r=2+u*6;ctx.globalAlpha=w*(1-u)*.55;ctx.fillStyle=u<.15?'#6a625a':'#cfc9c0';ctx.fillRect(Math.round(e.x+Math.sin(u*5+i)*3+u*7-r/2),Math.round(e.y-u*30-r/2),Math.round(r),Math.round(r));}}
 ctx.globalAlpha=1;}
const bildAt=(h,tx,ty)=>h.poster.find(p=>p.k===ty*N+tx);
const items0=H.items;H.items=(items,view)=>{items0?.(items,view);const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;if(!haeuser.length)return;if(now-belegtT>1000){belegtT=now;belegen();}
 const mw=maus&&!B.mode?W.toWorld(maus.sx,maus.sy):null,mt=mw&&W.bodenPunkt(mw.x,mw.y),ct=W.cam.s>=1.5?W.bodenPunkt(W.cam.x,W.cam.y+14):null;
 const hm=mt&&hausAt(Math.floor(mt.tx),Math.floor(mt.ty)),hc=ct&&hausAt(Math.floor(ct.tx),Math.floor(ct.ty));
 if(spruch){spruch.t-=dt;if(spruch.t<=0)spruch=null;}
 // Dach offen nur nah herangezoomt (ab OFFEN_AB): Haus in der Bildmitte, unter der Maus oder angetippt. Weiter weg sind alle Dächer zu.
 const nah=W.cam.s>=OFFEN_AB;if(!nah&&fest.size)fest.clear();
 for(const h of haeuser){const ziel=nah&&(fest.has(h.id)||h===hm||h===hc)?1:0;if(ziel&&h.offen===0)wuerfeln(h);// bei jedem Öffnen hängen andere Sprüche
  h.offen+=clamp(ziel-h.offen,-dt*4,dt*4);
  const p0=W.iso(h.bx0,h.by1+1).x,p1=W.iso(h.bx1+1,h.by0).x;if(p1<view.x0-40||p0>view.x1+40||h.key<view.y0-10||W.iso(h.bx0,h.by0).y-90>view.y1)continue;
  if(!h.item)h.item={y:h.key,h,draw:zeichne,oz:W.hz?W.hz(h.bx0+.5,h.by0+.5):0};items.push(h.item);}};
// Figuren vor oder hinter dem Haus: Wer südöstlich eines Hausfeldes steht, wird nach dem Haus gezeichnet
H.vorne=(tx,ty,y)=>{for(const h of haeuser){if(y>h.key||tx<h.bx0-2||ty<h.by0-2||tx>h.bx1+3||ty>h.by1+3)continue;const fx=Math.floor(tx),fy=Math.floor(ty);if(fx>h.bx1||fy>h.sufY[Math.max(0,fx-h.bx0)])return h.key+.01;}return y;};
// Schild über dem Haus und Spruch am Bild
function schild(ctx,s,x,y,z,hell){const w=ctx.measureText(s).width+8*z;ctx.fillStyle=hell?'rgba(244,236,214,.96)':'rgba(18,12,9,.8)';ctx.fillRect(Math.round(x-w/2),Math.round(y-8*z),Math.round(w),Math.round(16*z));ctx.fillStyle=hell?'#2a1c12':'#f4d37a';ctx.fillText(s,Math.round(x),Math.round(y)+1);}
const world0=H.world;H.world=(ctx,view,dt)=>{world0?.(ctx,view,dt);if(W.mini)return;const z=clamp(1/W.cam.s,.5,3);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+Math.round(11*z)+'px ui-monospace,Menlo,Consolas,monospace';
 for(const h of haeuser){const p=W.iso((h.bx0+h.bx1+1)/2,(h.by0+h.by1+1)/2),y=p.y-(h.item?.oz||0)-(h.offen>.5?WAND+10:WAND+STEIG*2+16+(h.art==='beast'?40:0));if(p.x<view.x0-150||p.x>view.x1+150||y<view.y0-30||y>view.y1+30)continue;schild(ctx,h.titel+' · '+h.zahl+' '+h.wort[h.zahl===1?0:1],p.x,y,z);}
 // Spruch nur am angetippten Bild (Thomas 12.11.: keine Tafeln von selbst, auch nicht beim Darüberfahren)
 if(spruch)tafel(ctx,spruch.p,z,true,1,[]);};
const anker=p=>{const x=p.k%N,y=(p.k/N)|0,q=p.side==='a'?W.iso(x+.5,y):W.iso(x,y+.5);return {x:q.x,y:q.y-(p.oz||0)};};
// Tafel über einem Bild. belegt: schon vergebene Flächen; die Tafel rückt so weit nach oben, bis sie keine andere verdeckt.
function tafel(ctx,p,z,stark,alpha,belegt,nurPlatz){const q=anker(p);if(p.zt!==p.text){p.zt=p.text;const ws=('„'+p.text+'“').split(' '),ls=[];let cur='';for(const w of ws){if(cur&&(cur+' '+w).length>20){ls.push(cur);cur=w;}else cur=cur?cur+' '+w:w;}ls.push(cur);p.zeilen=ls;}
 const ls=p.zeilen,lh=13*z;ctx.font='bold '+Math.round(11*z)+'px Georgia,serif';let w=0;for(const l of ls)w=Math.max(w,ctx.measureText(l).width);w+=12*z;const hh=ls.length*lh+8*z;
 let top;if(p.platz&&!nurPlatz&&stark)top=p.platz;else{top=q.y-WAND-6*z-hh;for(let n=0;n<12;n++){const hit=belegt.find(r=>q.x-w/2<r.x1&&q.x+w/2>r.x0&&top<r.y1&&top+hh>r.y0);if(!hit)break;top=hit.y0-hh-4*z;}}
 if(nurPlatz){p.platz=top;belegt.push({x0:q.x-w/2-3*z,x1:q.x+w/2+3*z,y0:top-2*z,y1:top+hh+2*z});return;}if(!stark)belegt.push({x0:q.x-w/2-3*z,x1:q.x+w/2+3*z,y0:top-2*z,y1:top+hh+2*z});
 ctx.globalAlpha=alpha;ctx.strokeStyle='#2a1c12';ctx.lineWidth=1.2*z;ctx.beginPath();ctx.moveTo(q.x,q.y-WAND+8);ctx.lineTo(q.x,top+hh);ctx.stroke();
 ctx.fillStyle='#2a1c12';ctx.fillRect(Math.round(q.x-w/2-1.5*z),Math.round(top-1.5*z),Math.round(w+3*z),Math.round(hh+3*z));ctx.fillStyle=stark?'#fff4cf':'#efe2bf';ctx.fillRect(Math.round(q.x-w/2),Math.round(top),Math.round(w),Math.round(hh));
 ctx.fillStyle='#a32f2a';ctx.fillRect(Math.round(q.x-w/2),Math.round(top),Math.round(w),Math.round(2.5*z));ctx.fillStyle='#2a1c12';ls.forEach((l,i)=>ctx.fillText(l,Math.round(q.x),Math.round(top+5*z+lh*(i+.5))));ctx.globalAlpha=1;}
// Antippen: Dach bleibt offen. Im offenen Haus zeigt Antippen eines Bildes den Spruch; jede andere Stelle schließt wieder.
const tap0=H.tap;H.tap=(p,w)=>{if(B.mode||w)return tap0?tap0(p,w):false;const t=W.bodenPunkt(p.x,p.y),tx=Math.floor(t.tx),ty=Math.floor(t.ty),h2=hausAt(Math.floor(t.tx+.6),Math.floor(t.ty+.6)),h=hausAt(tx,ty)||(h2&&h2.offen>.8?h2:null);if(!h)return tap0?tap0(p,w):false;
 if(h.offen>.8){const et=echtAt(h,tx,ty)||echtAt(h,Math.floor(t.tx+.6),Math.floor(t.ty+.6));if(et&&tierOeffnen(et)){fest.add(h.id);return true;}}
 if(h.offen>.8){const b=bildAt(h,tx,ty)||bildAt(h,Math.floor(t.tx+.6),Math.floor(t.ty+.6));if(b){b.oz=h.item?.oz||0;spruch=spruch?.p===b?null:{p:b,t:6};fest.add(h.id);return true;}}
 if(fest.has(h.id))fest.delete(h.id);else fest.add(h.id);return true;};
B.beiAenderung(neu);neu();
M.weltGebaeude={WAND,NAME,NAME_S,NAME_B,SPRUECHE,SPR_S,SPR_B,kaefige:()=>haeuser.reduce((s,h)=>s+h.kaefige,0),plaetze:()=>haeuser.reduce((s,h)=>s+h.plaetze,0),SPR_M,NAME_K,SPR_K,ding,tragen,haeuser:()=>haeuser,betten:()=>haeuser.reduce((s,h)=>s+h.betten,0),ambosse:()=>haeuser.reduce((s,h)=>s+h.ambosse,0),testTiere,tierOeffnen,hundZu,bei(k){if(!STUFE.has(W.feld[k]))return null;const h=plan(gebiet(k));return {n:h.n,art:h.art,ambosse:h.ambosse,betten:h.betten,kaefige:h.kaefige,plaetze:h.plaetze,tuer:h.door,st:h.st,bilder:h.poster.length};},oeffne(id,an=true){if(an)fest.add(id);else fest.delete(id);},get spruch(){return spruch?.p.text||null;},male};
})();
