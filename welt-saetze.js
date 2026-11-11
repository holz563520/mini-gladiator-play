'use strict';
// =====================================================================================================================
// SÄTZE DER GLADIATOREN (welt-saetze.js) · Was ein Gladiator sagt, wenn man ihn auf der großen Karte antippt.
// Nur auf tageslauf-editor.html geladen, nicht im Spiel. Wunsch Thomas 11.11.2026: zufällige Sätze mit schwarzem Humor,
// passend zu Verletzungen, Kampfgeschichte, Charakter, Herkunft, Tätigkeit und Tageszeit.
// Reine Rechnung ohne Bildschirm (in Node prüfbar: tests/welt-saetze.cjs). Liest nur, ändert keinen Spielstand.
//   WeltSaetze.alle(g,k)  → alle möglichen Sätze [{art,mood,t,w}]
//   WeltSaetze.satz(g,k)  → ein zufälliger Satz, die letzten werden nicht wiederholt
//   k: {stunde, job, partName(id), andere:[Namen], rng}
// mood = Gesichtsausdruck der Nahaufnahme (face-shots.js).
// =====================================================================================================================
(()=>{
const TRAIT={
 'Mutig':[['Angst? Kenn ich nicht. Der Medicus nennt das eine Diagnose.','confident'],['Ich geh immer als Erster rein. Bisher auch als Erster wieder raus. Getragen zählt auch.','grin']],
 'Feige':[['Ich bin nicht feige. Ich bin nur gern am Leben. Das ist hier eine Minderheitenmeinung.','nervous'],['Wenn es ernst wird, steh ich hinter dir, Dominus. Weit hinter dir.','scared']],
 'Aggressiv':[['Mir gefällt heute keiner. Gestern auch nicht.','determined'],['Wer hat mein Brot angefasst? Ich frag nur einmal. Dann frag ich mit der Faust.','roar']],
 'Diszipliniert':[['Aufstehen, üben, bluten, schlafen. Ordnung muss sein.','calm'],['Ich putze meine Klinge jeden Abend. Man weiß nie, wessen Reste dran kleben.','calm']],
 'Loyal':[['Ich sterbe für diesen Ludus, Dominus. Ungern, aber pünktlich.','determined'],['Du bist der beste Herr, den ich je hatte. Die anderen zwei sind tot.','grin']],
 'Egoistisch':[['Wenn einer fällt, gibt es mehr Brei für mich. Ich seh das Gute in allem.','grin'],['Ich teile gern. Schläge zum Beispiel.','confident']],
 'Berserker':[['Manchmal wird alles rot, und wenn ich aufwache, fehlt jemandem was.','dumb'],['Der Medicus sagt, ich soll bis zehn zählen. Bei vier liegt meist schon einer.','roar']],
 'Taktiker':[['Ich hab einen Plan. Er beginnt damit, dass die anderen zuerst sterben.','confident'],['Ich habe die Fluchtwege gezählt. Es sind null. Guter Ludus.','calm']],
 'Teamspieler':[['Zusammen sind wir stark. Zusammen passen wir auch besser ins Grab.','grin'],['Ich decke jedem den Rücken. Manchmal mit einem Tuch, hinterher.','calm']],
 'Blutrünstig':[['Riechst du das? Nein? Schade. Es riecht nach gestern.','grin'],['Ich mag den Moment, wenn sie merken, dass es wehtun wird.','grin']],
 'Gelassen':[['Alles halb so wild. Halb tot ist auch halb lebendig.','calm'],['Sterben müssen wir alle. Manche nur früher, und die meisten vor mir.','calm']],
 'Zäh':[['Mich kriegt man nicht klein. Höchstens kürzer.','confident'],['Der Letzte, der mich umgehauen hat, musste zweimal zuschlagen. Danach war er müde.','grin']],
 'Talentiert':[['Der Schmied sagt, ich hab Talent. Er sagt auch, Talent blutet genauso.','confident']],
 'Verletzungsanfällig':[['Ich hab mir gestern beim Schlafen was gezerrt. Frag nicht.','pain'],['Der Medicus kennt mich beim Vornamen. Und bei den Knochen.','nervous']],
 'Schneller Lerner':[['Ich lerne schnell. Heute zum Beispiel: nie hinter dem Maultier stehen.','dumb']],
 'Spätentwickler':[['Ich werde mal ganz groß, sagt der Schmied. Er sagt nicht, wann. Hoffentlich vorher.','dumb']]
};
const JOBS={
 holz:[['Bäume fällen. Die schreien wenigstens nicht.','calm'],['Ein Baum ist wie ein Gegner, nur ehrlicher. Er fällt, wohin er will.','grin']],
 hacken:[['Holz hacken beruhigt. Ich stell mir bei jedem Scheit ein Gesicht vor.','grin']],
 kohle:[['Am Meiler riecht alles nach Rauch. Besser als nach der Kaserne.','calm']],
 erz:[['Unter Tage ist es dunkel, eng und stickig. Also wie in der Kaserne, nur ohne Schnarchen.','dumb'],['Der Berg will uns nicht hier haben. Er sagt das mit Steinen.','nervous']],
 tragen:[['Erz schleppen. Mein Rücken hat gekündigt, ich arbeite ohne ihn weiter.','pain']],
 schmelzen:[['Am Blasebalg schwitzt man sich die Sünden raus. Ich bin gleich leer.','dumb']],
 stand:[['Ich verkaufe gebrauchte Ausrüstung. Die Flecken gehen fast raus.','grin'],['Der Helm hier ist wie neu. Der Vorbesitzer hat ihn nur einmal getragen.','confident']],
 wache:[['Alles ruhig. Zu ruhig. Entweder kommt gleich was, oder ich bin eingeschlafen.','nervous'],['Ich halte Ausschau. Bisher habe ich drei Krähen und meinen Lebensmut gesehen. Die Krähen sind noch da.','calm']],
 lager:[['Ich liege seit Stunden im Gebüsch. Die Ameisen haben schon einen Namen für mich.','dumb'],['Sobald ein Karren kommt, sind wir reich. Oder tot. Hauptsache Abwechslung.','grin']]
};
const GENERIC=[
 ['Mir geht es gut, Dominus. Nichts gebrochen, was ich heute brauche.','calm'],
 ['Der Brei hat sich heute bewegt. Ich hab ihn trotzdem gegessen. Er hat sich gewehrt.','dumb'],
 ['Das Stroh in der Kaserne lebt. Wir haben ihm einen Namen gegeben.','dumb'],
 ['Der Schmied hat mich angelächelt. Ich hab seitdem nicht mehr geschlafen.','nervous'],
 ['Ich hab vom Sold geträumt. Dann bin ich aufgewacht, und er war immer noch weg.','calm'],
 ['Wenn ich sterbe, kriegt {anderer} meine Sandalen. Er weiß es schon und schaut mich so an.','nervous'],
 ['{anderer} schnarcht wie ein sterbender Ochse. Ich hab nachgesehen. Leider nur Schnarchen.','grin'],
 ['Der Medicus hat gesagt, ich bin gesund. Er hat dabei die Säge nicht weggelegt.','nervous'],
 ['Mir gefällt nicht, wie die Geier mich ansehen. Die kennen den Spielplan.','scared'],
 ['Alles bestens. Ich hab heute noch niemanden begraben. Der Tag ist aber noch jung.','grin'],
 ['Kann ich was für dich tun, Dominus? Sag bitte nicht „sterben“.','nervous'],
 ['Ich habe durchgezählt. Wir waren mal mehr.','calm'],
 ['{anderer} schuldet mir noch drei Münzen. Ich hoffe, er überlebt bis Zahltag.','calm'],
 ['Was mir nicht gefällt? Der Sand. Er ist überall. Auch dort, wo vorher ein Zahn war.','dumb']
];
const UP=[['He! Nicht am Genick, da bin ich empfindlich!','shock'],['Hoch hinaus, sagte meine Mutter. So hat sie das nicht gemeint.','terror'],['Von hier oben sieht man den Friedhof. Schön angelegt.','scared'],['Lass mich runter! Aber langsam. Und nicht über dem Fluss.','plead'],['Ich wusste, die Götter greifen irgendwann ein. Ich dachte nur, sanfter.','shock']];
const DOWN=[['Danke. Ich brauch kurz. Meine Würde liegt noch da drüben.','dumb'],['Na gut. Dann steh ich eben hier.','calm'],['Ich sag es keinem, wenn du es keinem sagst.','nervous'],['Mir ist schlecht. Das letzte Mal so geflogen bin ich aus einer Taverne.','pain']];

const first=n=>String(n||'').split(' ')[0];
function alle(g,k={}){const out=[],add=(art,t,mood='calm',w=1)=>out.push({art,t,mood,w}),pn=k.partName||(id=>id),h=k.stunde??12;
 // Verletzungen und fehlende Glieder
 for(const [id,p] of Object.entries(g.body||{})){const part=pn(id);
  if(p.missing){add('fehlt',part+'? Abgetrennt. Ich zähle seitdem schneller durch.','calm',6);add('fehlt',part+' fehlt. Der Medicus sagt, das spart Gewicht.','dumb',6);add('fehlt','Phantomschmerz, Dominus. '+part+' juckt, und ich kann nicht mal kratzen.','pain',5);add('fehlt',part+' liegt noch irgendwo in der Arena. Falls jemand suchen will.','grin',4);continue;}
  if((p.hp??100)<65){const inj=p.injury?String(p.injury).replace(/\.$/,''):'';
   add('wunde',part+(inj?': '+inj:'')+'. Tut nur weh, wenn ich atme.','pain',5);
   add('wunde',part+(inj?', '+inj:'')+'. Der Medicus sagt, das wächst sich raus. Der Medicus lügt.','pain',5);
   const wd=p.wounds?.[0];if(wd?.attacker&&wd.attacker!=='Unbekannt')add('wunde',part+'? Das war '+wd.attacker+(wd.weapon&&/^[A-ZÄÖÜ]/.test(wd.weapon)?' mit '+wd.weapon:'')+'. Ich hab mir das Gesicht gemerkt. Viel ist davon nicht übrig.','determined',6);
   if(p.fracture)add('wunde',part+' ist gebrochen. Es knirscht beim Gehen. Die anderen wetten schon, in welche Richtung es heilt.','pain',5);}
  else if((p.hp??100)<90)add('wunde',part+' zwickt noch. Nichts, was ein Becher Wein nicht verschlimmert.','calm',2);}
 // Kampfbericht
 const hist=(g.history||[]).map(x=>String(x.text||''));const win=hist.find(t=>/^Sieg gegen /.test(t)),loss=hist.find(t=>/^Niederlage gegen /.test(t));
 if(win){const X=win.replace(/^Sieg gegen /,'').split(' · ')[0];add('kampf','Hast du gesehen, wie ich gegen '+X+' aufgeräumt habe? Den Sand kriegen die nie wieder sauber.','grin',4);add('kampf','Sieg gegen '+X+'. Einer von denen hat nach seiner Mutter gerufen. Sie kam nicht.','grin',3);}
 if(loss){const X=loss.replace(/^Niederlage gegen /,'').split(' · ')[0];add('kampf','Gegen '+X+' verloren. Ich würde sagen, der Sand war schuld. Der Sand sagt, ich war es.','dumb',3);}
 const kills=g.kills||0,fights=g.fights||0;
 if(kills>=5)add('kampf','Hast du gesehen, wie ich dem Letzten den Schädel gespalten habe? Zwei saubere Hälften. Ich war selbst überrascht.','grin',5);
 if(kills>=2)add('kampf',kills+' Tote auf meinem Konto. Der Schmied führt Buch, ich nur die Klinge.','confident',3);
 if(kills===1)add('kampf','Mein Erster ist tot. Er hat mich dabei so angesehen. Ich träum davon. Meistens gut.','calm',3);
 if(kills===0&&fights>0)add('kampf','Noch keiner tot durch meine Hand. Ich arbeite dran, Dominus.','determined',2);
 if(fights===0)add('kampf','Ich war noch nie in der Arena. Die anderen sagen, beim ersten Mal weint jeder. Manche nur kurz.','nervous',3);
 if((g.wins||0)>=3&&(g.losses||0)===0)add('kampf',g.wins+' Siege, keine Niederlage. Die anderen sagen, das rächt sich. Die anderen sind neidisch und teilweise tot.','confident',3);
 if((g.losses||0)>(g.wins||0)&&fights>1)add('kampf','Ich verliere öfter, als ich gewinne. Aber ich verliere mit Stil. Sagt keiner.','dumb',3);
 if((g.fame||0)>=20)add('kampf','Die Leute rufen meinen Namen. Meistens gefolgt von „stirb“.','grin',3);
 const sc=(g.scars||[]).length;if(sc>=3)add('kampf',sc+' Narben. Jede hat eine Geschichte. Die meisten enden mit „und dann hab ich nicht aufgepasst“.','grin',3);
 // Charakter, Herkunft, Körper
 for(const tr of g.traits||[])for(const [t,m] of TRAIT[tr]||[])add('charakter',t,m,3);
 if(g.origin){add('herkunft','In '+g.origin+' haben wir für so ein Wetter ein Wort. Es ist kein schönes.','calm',1);add('herkunft','Zu Hause in '+g.origin+' halten sie mich für tot. Ich will sie nicht enttäuschen, also beeil ich mich nicht.','grin',2);}
 if(g.age>=33)add('koerper','Ich bin '+g.age+'. In diesem Beruf ist das ein Rechenfehler.','calm',2);
 if(g.age&&g.age<=19)add('koerper','Ich bin '+g.age+'. Meine Mutter denkt, ich lerne Töpfern.','nervous',2);
 if(g.weight>100)add('koerper','Ich bin nicht dick. Ich bin schwer zu tragen. Das ärgert später wenigstens die Träger.','grin',2);
 if(g.height&&g.height<166)add('koerper','Die Kleinen trifft man schlechter. Sag ich mir jeden Morgen.','nervous',2);
 if(g.height>194)add('koerper','Der Vorteil an meiner Größe: Ich seh den Schlag kommen. Der Nachteil: von überall.','calm',2);
 // Zustand
 if((g.fatigue||0)>60)add('zustand','Ich bin so müde, ich könnte im Stehen sterben.','out',4);
 if((g.blood??100)<75)add('zustand','Mir ist ein bisschen schwindlig. Der Medicus sagt, Blut wird überschätzt.','pain',4);
 const mo=g.stats?.morale;if(mo!=null&&mo<25)add('zustand','Heute ist kein guter Tag. Morgen wird auch keiner, aber da bin ich es gewohnt.','scared',3);
 if(mo>75)add('zustand','Mir geht es blendend. Das macht mir Sorgen.','grin',3);
 // Tätigkeit und Tageszeit
 for(const [t,m] of JOBS[k.job]||[])add('arbeit',t,m,3);
 if(h>=21||h<5){add('zeit','Es ist mitten in der Nacht, Dominus. Entweder brennt es, oder du kannst auch nicht schlafen.','dumb',3);add('zeit','Nachts höre ich die aus der Halle der Gefallenen. Sie beschweren sich über das Essen von damals.','scared',3);}
 else if(h<8)add('zeit','Morgens ist die Welt noch in Ordnung. Dann wachen die anderen auf.','calm',3);
 else if(h>=12&&h<13.5)add('zeit','Mittag. Es gibt Brei. Gestern gab es auch Brei. Es war derselbe.','dumb',3);
 else if(h>=18)add('zeit','Feierabend. Wer jetzt noch alle Finger hat, darf würfeln.','grin',3);
 // Allgemeines
 const others=(k.andere||[]).filter(n=>n&&n!==g.name).map(first),rng=k.rng||Math.random;
 for(const [t,m] of GENERIC){if(t.includes('{anderer}')&&!others.length)continue;add('allgemein',t.replace('{anderer}',others[Math.floor(rng()*others.length)]||''),m,1);}
 return out;}
const recent=new Map();
function pick(list,key,rng=Math.random){const last=recent.get(key)||[];let pool=list.filter(x=>!last.includes(x.t));if(!pool.length)pool=list;let sum=0;for(const x of pool)sum+=x.w;let r=rng()*sum;let hit=pool[pool.length-1];for(const x of pool){r-=x.w;if(r<=0){hit=x;break;}}
 last.push(hit.t);while(last.length>Math.min(8,list.length-1))last.shift();recent.set(key,last);return hit;}
function satz(g,k={}){return pick(alle(g,k),g.id||g.name,k.rng);}
const list=a=>a.map(([t,mood])=>({art:'pinzette',t,mood,w:1}));
const api={alle,satz,hoch:(g,rng)=>pick(list(UP),'up:'+(g.id||g.name),rng),runter:(g,rng)=>pick(list(DOWN),'down:'+(g.id||g.name),rng),TRAIT,JOBS,GENERIC,UP,DOWN};
if(typeof window==='undefined')module.exports=api;else window.WeltSaetze=api;
})();
