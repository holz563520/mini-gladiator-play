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
// · Überall hängen Bilder des Lanista mit Durchhalteparolen (SPRUECHE). Im offenen Haus zeigt die Maus über einem Bild
//   oder ein Antippen den Spruch; ab Zoom 1,3 steht über jedem Bild eine lesbare Tafel. Die Sprüche werden bei jedem Öffnen
//   des Hauses neu ausgelost (ohne Wiederholung im selben Haus).
// · Dach: nur nah herangezoomt (Zoom ab 1,5) wird es durchsichtig: Haus in der Bildmitte, unter der Maus oder angetippt.
//   Zoomt man weiter weg, sind alle Dächer von selbst wieder zu (Thomas 12.11.). Offen sind die vorderen Wände kniehoch.
// · Leistung: Jedes Haus wird zweimal vorgezeichnet (geschlossen, offen) und nur neu gemalt, wenn sich sein Grundriss ändert.
//   Lebendig sind nur Rauch, Ratten und Fliegen (ein paar Rechtecke je Bild).
// · Noch keine Spielwirkung: Schlafplätze und Ambosse zählen nur.
// =====================================================================================================================
(()=>{
const M=window.MG,W=window.WeltKarte,H=window.WeltHook,B=M?.weltBau;if(!M||!W||!H||!B||W.T.UNTERKUNFT==null)return;const S=M.s;
const T=W.T,N=W.N,WAND=34,STUMPF=7,STEIG=11,KAPPE=3,TAU=Math.PI*2,clamp=(v,a,b)=>v<a?a:v>b?b:v;
const STUFE=new Map([[T.UNT_S,0],[T.UNTERKUNFT,1],[T.UNT_K,2],[T.SCHM_S,0],[T.SCHMIEDE,1],[T.SCHM_K,2]]),ART=new Map([[T.SCHM_S,'schmiede'],[T.SCHMIEDE,'schmiede'],[T.SCHM_K,'schmiede']]),NAME_S=['ROSTGRUBE','WAFFENSCHMIEDE','KAISERLICHE WAFFENSCHMIEDE'],NAME=['RATTENLOCH','MANNSCHAFTSSTUBE','FÜRSTENGEMÄCHER'],PLATZ=[['STROHHAUFEN','STROHHAUFEN'],['BETT','BETTEN'],['PRUNKLIEGE','PRUNKLIEGEN']];
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
function wuerfeln(h){const pool=h.art==='schmiede'?[...SPR_S[h.st],...SPR_S[3],...SPRUECHE[3].filter(t=>!/schl[aä]f|bett|deck/i.test(t))]:[...SPRUECHE[h.st],...SPRUECHE[3]];for(let i=pool.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[pool[i],pool[j]]=[pool[j],pool[i]];}h.poster.forEach((p,i)=>p.text=pool[i%pool.length]);}
const NB=[[1,0],[-1,0],[0,1],[0,-1]];
// ---------- Grundriss → Haus ----------
function gebiet(k0){const typ=W.feld[k0],seen=new Set([k0]),st=[k0],tiles=[];while(st.length){const k=st.pop();tiles.push(k);const x=k%N,y=(k/N)|0;for(const [dx,dy] of NB){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=N||ny>=N)continue;const q=ny*N+nx;if(!seen.has(q)&&W.feld[q]===typ){seen.add(q);st.push(q);}}}return tiles;}
function plan(tiles){const typ=W.feld[tiles[0]],st=STUFE.get(typ)??1,art=ART.get(typ)||'unterkunft',schm=art==='schmiede',set=new Set(tiles);let bx0=N,by0=N,bx1=0,by1=0;for(const k of tiles){const x=k%N,y=(k/N)|0;if(x<bx0)bx0=x;if(x>bx1)bx1=x;if(y<by0)by0=y;if(y>by1)by1=y;}
 const has=(x,y)=>x>=0&&y>=0&&x<N&&y<N&&set.has(y*N+x);
 const lang=bx1-bx0>=by1-by0,tief=(a,b)=>(a%N+((a/N)|0))-(b%N+((b/N)|0));
 // Schmiede: die hintere Hälfte entlang der längeren Seite ist überdacht, der Rest ist Hof
 const dach=schm?new Set(tiles.filter(k=>{const x=k%N,y=(k/N)|0;return lang?(x-bx0)<Math.ceil((bx1-bx0+1)/2):(y-by0)<Math.ceil((by1-by0+1)/2);})):set,hasD=(x,y)=>has(x,y)&&dach.has(y*N+x),hof=tiles.filter(k=>!dach.has(k));
 // Tür (bei der Schmiede das Hoftor): an einer Vorderkante, möglichst mittig
 let door=null,best=1e9;const mx=(bx0+bx1)/2,my=(by0+by1)/2;
 for(const k of tiles){if(schm&&hof.length&&dach.has(k))continue;const x=k%N,y=(k/N)|0;if(!has(x,y+1)){const d=Math.abs(x-mx)+(by1-y)*3;if(d<best){best=d;door={k,side:'y'};}}if(!has(x+1,y)){const d=Math.abs(y-my)+(bx1-x)*3+.4;if(d<best){best=d;door={k,side:'x'};}}}
 // Schlafplätze: jede zweite Reihe quer zur längeren Seite, dazwischen bleibt ein Gang frei; das Feld hinter der Tür bleibt frei
 const beds=schm?[]:tiles.filter(k=>{const x=k%N,y=(k/N)|0;return k!==door.k&&(lang?(x-bx0)%2===0:(y-by0)%2===0);}).sort(tief);
 // Bilder des Lanista an den hinteren Innenwänden
 const poster=[];for(const k of tiles){const x=k%N,y=(k/N)|0;for(const [side,frei,salt,p] of [['a',!has(x,y-1),52,.5],['d',!has(x-1,y),53,.42]])if(frei&&(!schm||dach.has(k))&&W.h2(x,y,salt)<(schm?.62:p)){poster.push({k,side,text:''});}}
 // Dachhöhe: Ringe vom Rand nach innen (über Eck gezählt), gedeckelt
 const D=new Map();let rand=[...dach].filter(k=>{const x=k%N,y=(k/N)|0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(!hasD(x+dx,y+dy))return true;return false;}),d=1;
 while(rand.length){for(const k of rand)D.set(k,Math.min(d,KAPPE));const next=[];for(const k of rand){const x=k%N,y=(k/N)|0;for(const [dx,dy] of NB){const q=(y+dy)*N+x+dx;if(hasD(x+dx,y+dy)&&!D.has(q)&&!next.includes(q))next.push(q);}}rand=next;d++;}
 const dz=(x,y)=>hasD(x,y)?D.get(y*N+x):0,eck=(cx,cy)=>STEIG*Math.min(dz(cx-1,cy-1),dz(cx,cy-1),dz(cx-1,cy),dz(cx,cy));
 const sufY=[];let m=-1;for(let x=bx1;x>=bx0;x--){for(let y=by1;y>=by0;y--)if(has(x,y)){if(y>m)m=y;break;}sufY[x-bx0]=m;}
 const stat=schm?stationen(tiles,dach,hof,has,door,st,tief):new Map(),ambosse=[...stat.values()].filter(r=>r==='amboss').length;
 return {id:Math.min(...tiles),st,art,tiles:tiles.slice().sort(tief),set,has,hasD,dach,stat,ambosse,n:tiles.length,bx0,by0,bx1,by1,door,beds,betten:beds.length,poster,eck,sufY,key:W.iso(bx1+1,by1+1).y,
  titel:schm?NAME_S[st]:NAME[st],zahl:schm?ambosse:beds.length,wort:schm?['AMBOSS','AMBOSSE']:PLATZ[st]};}
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
function wand(g,x0,y0,x1,y1,h,hell,st,extra){const p=W.iso(x0,y0),q=W.iso(x1,y1);g.save();g.transform(q.x-p.x,q.y-p.y,0,-1,p.x,p.y);const R=(u,v,du,dv,col)=>{g.fillStyle=col;g.fillRect(u,v,du,dv);},z=(i,s)=>W.h2(x0*7+i,y0*3+x1+y1*5,s),voll=h>12;
 if(st===0){R(0,0,1,h,sh(LEHM,hell));R(0,0,1,Math.min(5,h*.6),sh([88,74,54],hell));for(let i=0;i<5;i++)R(z(i,61)*.9,2+z(i,62)*3,.08,1.5,sh([70,60,44],hell));
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
function male(h,offen){const m=64,p0=W.iso(h.bx0,h.by1+1),p1=W.iso(h.bx1+1,h.by0),top=W.iso(h.bx0,h.by0).y-(WAND+STEIG*KAPPE+30),bot=W.iso(h.bx1+1,h.by1+1).y+6,ox=Math.floor(p0.x-m/2),oy=Math.floor(top),st=h.st;
 const c=document.createElement('canvas');c.width=Math.ceil(p1.x-p0.x+m);c.height=Math.ceil(bot-top);const g=c.getContext('2d');g.translate(-ox,-oy);const has=h.has,bed=new Set(h.beds),po=new Map(h.poster.map(p=>[p.k+p.side,p]));if(offen){h.mist=[];h.gang=[];}
 for(const k of h.tiles){const x=k%N,y=(k/N)|0,s=W.h2(x,y,51),dr=h.door.k===k;
  // hintere Wände (Innenseite), mit Bild des Lanista oder Schmuck
  if(!has(x,y-1))wand(g,x,y,x+1,y,WAND,.98,st,offen?(po.has(k+'a')?bild(st,.98):schmuck(st,W.h2(x,y,55))):null);if(!has(x-1,y))wand(g,x,y+1,x,y,WAND,.8,st,offen?(po.has(k+'d')?bild(st,.8):schmuck(st,W.h2(x,y,56))):null);
  if(offen){if(dr){const a=h.door.side==='y',c0=st===0?[120,104,70]:st===1?[150,52,44]:PURPUR;quad(g,a?[pt(x+.2,y+.45),pt(x+.8,y+.45),pt(x+.8,y+.95),pt(x+.2,y+.95)]:[pt(x+.45,y+.2),pt(x+.95,y+.2),pt(x+.95,y+.8),pt(x+.45,y+.8)],sh(c0,.9),sh(c0,.6));}
   else if(bed.has(k))bett(g,x,y,s,st);else{h.gang.push(k);if(st===0?s<.9:st===1?(!has(x,y-1)||!has(x-1,y))&&s<.66:s<.86)kram(g,x,y,s,st,h);}}
  // vordere Wände (Außenseite): geschlossen volle Höhe mit Fenster, Tür oder Bild; offen nur kniehoch mit Türlücke
  const front=(x0,y0,x1,y1,hell,istTuer,salt)=>{if(!offen)wand(g,x0,y0,x1,y1,WAND,hell,st,istTuer?tuer(st,hell):(x+y)%2===0?fenster(st,hell):W.h2(x,y,salt)<.6?bild(st,hell):null);
   else if(!istTuer)wand(g,x0,y0,x1,y1,STUMPF,hell,st);else{const a=W.iso(x0,y0),b=W.iso(x1,y1),c0=st===0?LEHM:st===1?PUTZ:MARMOR,L=(u0,u1)=>{g.save();g.transform(b.x-a.x,b.y-a.y,0,-1,a.x,a.y);g.fillStyle=sh(c0,hell);g.fillRect(u0,0,u1-u0,STUMPF);g.fillStyle=sh(st===0?[88,74,54]:st===1?SOCKEL:MARMOR,hell*.9);g.fillRect(u0,0,u1-u0,4);g.fillStyle=sh(st===2?GOLD:BALKEN,hell);g.fillRect(u0?u0:u1-.05,0,.05,STUMPF+2);g.restore();};L(0,.24);L(.76,1);}};
  if(!has(x,y+1))front(x,y+1,x+1,y+1,.74,dr&&h.door.side==='y',57);if(!has(x+1,y))front(x+1,y+1,x+1,y,.94,dr&&h.door.side==='x',58);}
 if(!offen){// Dach: je Feld eine Fläche, die Ecken steigen vom Rand zur Mitte an
  const hoch=dachMalen(g,h,h.tiles,has);
  if(hoch&&h.n>=4&&st>0){const z=hoch.z/4,cc=st===2?MARMOR:[128,120,108];kiste(g,hoch.x+.36,hoch.y+.36,hoch.x+.64,hoch.y+.64,z-3,z+13,cc);kiste(g,hoch.x+.33,hoch.y+.33,hoch.x+.67,hoch.y+.67,z+13,z+15.5,st===2?GOLD:[96,90,82]);const p=pt(hoch.x+.5,hoch.y+.5,z+15.5);h.rauch={x:p[0],y:p[1]};}else h.rauch=null;}
 return {c,ox,oy};}

// Dach über den Feldern tiles; has sagt, wo das Dach endet (Traufe)
function dachMalen(g,h,tiles,has){const st=h.st;
  const farbe=st===0?[170,144,84]:st===1?ZIEGEL:[166,62,44];let hoch=null;
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

// ---------- Bestand ----------
let haeuser=[];const alt=new Map(),fest=new Set();
function neu(){const seen=new Set(),out=[];for(let k=0;k<N*N;k++){if(!STUFE.has(W.feld[k])||seen.has(k))continue;const t=gebiet(k);for(const q of t)seen.add(q);const h=plan(t),o=alt.get(h.id);h.sig=h.art+h.st+':'+h.tiles.join(',');h.offen=o?o.offen:0;h.mist=[];h.gang=[];if(o&&o.sig===h.sig){h.zu=o.zu;h.auf=o.auf;h.rauch=o.rauch;h.mist=o.mist;h.gang=o.gang;h.essenZu=o.essenZu;h.essenAuf=o.essenAuf;h.poster.forEach((p,i)=>p.text=o.poster[i]?.text||'');}if(h.poster.some(p=>!p.text))wuerfeln(h);out.push(h);}
 alt.clear();for(const h of out)alt.set(h.id,h);for(const id of fest)if(!alt.has(id))fest.delete(id);haeuser=out;}
const hausAt=(tx,ty)=>haeuser.find(h=>tx>=h.bx0&&tx<=h.bx1&&ty>=h.by0&&ty<=h.by1&&h.has(tx,ty));
// Maus über dem Haus öffnet das Dach
let maus=null;W.canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'){maus=null;return;}const r=W.canvas.getBoundingClientRect();maus={sx:e.clientX-r.left,sy:e.clientY-r.top};});W.canvas.addEventListener('pointerleave',()=>{maus=null;});
let last=performance.now(),spruch=null;const OFFEN_AB=1.5;
function zeichne(ctx){const h=this.h,mal=h.art==='schmiede'?maleSchmiede:male;if(!h.zu)h.zu=mal(h,false);const a=h.offen,t=performance.now()/1000;
 if(a>.01){if(!h.auf)h.auf=mal(h,true);ctx.drawImage(h.auf.c,h.auf.ox,h.auf.oy);
  if(h.st===0&&a>.5&&!W.mini){// Ratten huschen durch die Gänge, Fliegen kreisen über Haufen und Eimer
   const G=h.gang;if(G.length>1)for(let i=0;i<Math.min(6,1+(h.n>>3));i++){const k0=G[(i*7)%G.length],k1=G[(i*13+3)%G.length],u=(Math.sin(t*(.5+i*.13)+i*2)+1)/2,x=k0%N+.5+((k1%N)-(k0%N))*u,y=((k0/N)|0)+.5+(((k1/N)|0)-((k0/N)|0))*u,p=W.iso(x,y),d=Math.cos(t*(.5+i*.13)+i*2)>0?1:-1;
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
const items0=H.items;H.items=(items,view)=>{items0?.(items,view);const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;if(!haeuser.length)return;
 const mw=maus&&!B.mode?W.toWorld(maus.sx,maus.sy):null,mt=mw&&W.tileAt(mw.x,mw.y),ct=W.cam.s>=1.5?W.tileAt(W.cam.x,W.cam.y+14):null;
 const hm=mt&&hausAt(Math.floor(mt.tx),Math.floor(mt.ty)),hc=ct&&hausAt(Math.floor(ct.tx),Math.floor(ct.ty));
 // Maus über einem Bild des Lanista im offenen Haus: Spruch zeigen (die Wand steht über dem Feld, deshalb auch das Feld davor prüfen)
 if(hm&&hm.offen>.8){const p=bildAt(hm,Math.floor(mt.tx),Math.floor(mt.ty))||bildAt(hm,Math.floor(mt.tx+.6),Math.floor(mt.ty+.6));if(p)spruch={p,t:1.2};}
 if(spruch){spruch.t-=dt;if(spruch.t<=0)spruch=null;}
 // Dach offen nur nah herangezoomt (ab OFFEN_AB): Haus in der Bildmitte, unter der Maus oder angetippt. Weiter weg sind alle Dächer zu.
 const nah=W.cam.s>=OFFEN_AB;if(!nah&&fest.size)fest.clear();
 for(const h of haeuser){const ziel=nah&&(fest.has(h.id)||h===hm||h===hc)?1:0;if(ziel&&h.offen===0)wuerfeln(h);// bei jedem Öffnen hängen andere Sprüche
  h.offen+=clamp(ziel-h.offen,-dt*4,dt*4);
  const p0=W.iso(h.bx0,h.by1+1).x,p1=W.iso(h.bx1+1,h.by0).x;if(p1<view.x0-40||p0>view.x1+40||h.key<view.y0-10||W.iso(h.bx0,h.by0).y-90>view.y1)continue;
  if(!h.item)h.item={y:h.key,h,draw:zeichne};items.push(h.item);}};
// Figuren vor oder hinter dem Haus: Wer südöstlich eines Hausfeldes steht, wird nach dem Haus gezeichnet
H.vorne=(tx,ty,y)=>{for(const h of haeuser){if(y>h.key||tx<h.bx0-2||ty<h.by0-2||tx>h.bx1+3||ty>h.by1+3)continue;const fx=Math.floor(tx),fy=Math.floor(ty);if(fx>h.bx1||fy>h.sufY[Math.max(0,fx-h.bx0)])return h.key+.01;}return y;};
// Schild über dem Haus und Spruch am Bild
function schild(ctx,s,x,y,z,hell){const w=ctx.measureText(s).width+8*z;ctx.fillStyle=hell?'rgba(244,236,214,.96)':'rgba(18,12,9,.8)';ctx.fillRect(Math.round(x-w/2),Math.round(y-8*z),Math.round(w),Math.round(16*z));ctx.fillStyle=hell?'#2a1c12':'#f4d37a';ctx.fillText(s,Math.round(x),Math.round(y)+1);}
const world0=H.world;H.world=(ctx,view,dt)=>{world0?.(ctx,view,dt);if(W.mini)return;const z=clamp(1/W.cam.s,.5,3);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+Math.round(11*z)+'px ui-monospace,Menlo,Consolas,monospace';
 for(const h of haeuser){const p=W.iso((h.bx0+h.bx1+1)/2,(h.by0+h.by1+1)/2),y=p.y-(h.offen>.5?WAND+10:WAND+STEIG*2+16);if(p.x<view.x0-150||p.x>view.x1+150||y<view.y0-30||y>view.y1+30)continue;schild(ctx,h.titel+' · '+h.zahl+' '+h.wort[h.zahl===1?0:1],p.x,y,z);}
 // Sprüche lesbar: Im offenen Haus steht ab Zoom LESBAR über jedem Bild eine Tafel mit seinem Spruch (gestaffelt, damit sie sich
 // nicht verdecken). Weiter weg nur die Tafel des Bildes unter der Maus oder des angetippten.
 const lesbar=W.cam.s>=LESBAR,belegt=[];if(spruch)tafel(ctx,spruch.p,z,true,1,belegt,true);
 for(const h of haeuser){if(h.offen<.6||!lesbar)continue;const ps=h.poster.filter(p=>p!==spruch?.p).sort((a,b)=>anker(a).x-anker(b).x);for(const p of ps)tafel(ctx,p,z,false,h.offen,belegt);}
 if(spruch)tafel(ctx,spruch.p,z,true,1,belegt);};
const LESBAR=1.3,anker=p=>{const x=p.k%N,y=(p.k/N)|0;return p.side==='a'?W.iso(x+.5,y):W.iso(x,y+.5);};
// Tafel über einem Bild. belegt: schon vergebene Flächen; die Tafel rückt so weit nach oben, bis sie keine andere verdeckt.
function tafel(ctx,p,z,stark,alpha,belegt,nurPlatz){const q=anker(p);if(p.zt!==p.text){p.zt=p.text;const ws=('„'+p.text+'“').split(' '),ls=[];let cur='';for(const w of ws){if(cur&&(cur+' '+w).length>20){ls.push(cur);cur=w;}else cur=cur?cur+' '+w:w;}ls.push(cur);p.zeilen=ls;}
 const ls=p.zeilen,lh=13*z;ctx.font='bold '+Math.round(11*z)+'px Georgia,serif';let w=0;for(const l of ls)w=Math.max(w,ctx.measureText(l).width);w+=12*z;const hh=ls.length*lh+8*z;
 let top;if(p.platz&&!nurPlatz&&stark)top=p.platz;else{top=q.y-WAND-6*z-hh;for(let n=0;n<12;n++){const hit=belegt.find(r=>q.x-w/2<r.x1&&q.x+w/2>r.x0&&top<r.y1&&top+hh>r.y0);if(!hit)break;top=hit.y0-hh-4*z;}}
 if(nurPlatz){p.platz=top;belegt.push({x0:q.x-w/2-3*z,x1:q.x+w/2+3*z,y0:top-2*z,y1:top+hh+2*z});return;}if(!stark)belegt.push({x0:q.x-w/2-3*z,x1:q.x+w/2+3*z,y0:top-2*z,y1:top+hh+2*z});
 ctx.globalAlpha=alpha;ctx.strokeStyle='#2a1c12';ctx.lineWidth=1.2*z;ctx.beginPath();ctx.moveTo(q.x,q.y-WAND+8);ctx.lineTo(q.x,top+hh);ctx.stroke();
 ctx.fillStyle='#2a1c12';ctx.fillRect(Math.round(q.x-w/2-1.5*z),Math.round(top-1.5*z),Math.round(w+3*z),Math.round(hh+3*z));ctx.fillStyle=stark?'#fff4cf':'#efe2bf';ctx.fillRect(Math.round(q.x-w/2),Math.round(top),Math.round(w),Math.round(hh));
 ctx.fillStyle='#a32f2a';ctx.fillRect(Math.round(q.x-w/2),Math.round(top),Math.round(w),Math.round(2.5*z));ctx.fillStyle='#2a1c12';ls.forEach((l,i)=>ctx.fillText(l,Math.round(q.x),Math.round(top+5*z+lh*(i+.5))));ctx.globalAlpha=1;}
// Antippen: Dach bleibt offen. Im offenen Haus zeigt Antippen eines Bildes den Spruch; jede andere Stelle schließt wieder.
const tap0=H.tap;H.tap=(p,w)=>{if(B.mode||w)return tap0?tap0(p,w):false;const t=W.tileAt(p.x,p.y),tx=Math.floor(t.tx),ty=Math.floor(t.ty),h2=hausAt(Math.floor(t.tx+.6),Math.floor(t.ty+.6)),h=hausAt(tx,ty)||(h2&&h2.offen>.8?h2:null);if(!h)return tap0?tap0(p,w):false;
 if(h.offen>.8){const b=bildAt(h,tx,ty)||bildAt(h,Math.floor(t.tx+.6),Math.floor(t.ty+.6));if(b){spruch={p:b,t:5};fest.add(h.id);return true;}}
 if(fest.has(h.id))fest.delete(h.id);else fest.add(h.id);return true;};
B.beiAenderung(neu);neu();
M.weltGebaeude={WAND,NAME,NAME_S,SPRUECHE,SPR_S,haeuser:()=>haeuser,betten:()=>haeuser.reduce((s,h)=>s+h.betten,0),ambosse:()=>haeuser.reduce((s,h)=>s+h.ambosse,0),bei(k){if(!STUFE.has(W.feld[k]))return null;const h=plan(gebiet(k));return {n:h.n,art:h.art,ambosse:h.ambosse,betten:h.betten,tuer:h.door,st:h.st,bilder:h.poster.length};},oeffne(id,an=true){if(an)fest.add(id);else fest.delete(id);},get spruch(){return spruch?.p.text||null;},male};
})();
