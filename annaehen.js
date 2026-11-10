'use strict';
// =====================================================================================================
// GLIEDER ANNÄHEN beim Medicus (Wunsch Thomas 10.11.2026, Werte noch nicht bestätigt)
// · Eigenes Fenster im Medicus-Menü: alle Amputierten (bestes Talent oben) → Stück wählen (Hand, Unterarm, Arm,
//   ganzer Arm mit Schulter, Fuß, Unterschenkel, Bein) → Spender wählen. Spender: lebende eigene Gladiatoren ab 18,
//   nicht im Krankenbett, bei denen dasselbe Stück derselben Seite ganz und ungebrochen dran ist.
// · Das angenähte Stück bringt die Körperwerte des Spenders mit (Kraft, Beweglichkeit, Robustheit je Teil, IST).
//   Die Anlage (SOLL) bleibt die des Empfängers. Der Spender verliert das Stück wirklich (Amputation).
// · Ausgang: angewachsen (Naht-Dauerschaden 5–15 %) · schief angenäht (20–35 %, Narbe) · abgestoßen (Stück verloren,
//   die Ratte holt es). Abstoßung 8 % + 1,5 % je cm Längenunterschied über 3 cm (höchstens 35 %), schief 20 %.
//   Dauerschaden des Spenders kommt dazu, höchstens 40 %. Danach beide zehn Tage Krankenbett.
// · OP-Film im Saal des Doktors (Betäubung mit dem Holzhammer, Säge, Tragen, Nähen, Ausgang, Großaufnahmen),
//   Sprüche über die Stimmen des Spiels. Das Ergebnis gilt sofort beim Klick, der Film ist nur Darstellung.
// · NACHNÄHEN (Wunsch Thomas 10.11.2026): schief angenähte Glieder für 5.000 Gold nochmal aufmachen und gerade annähen.
//   Danach ist der Dauerschaden an diesen Teilen weg (auch der mitgebrachte des Spenders), fünf Tage Krankenbett, eigener kurzer Film.
// Entfernen: 'annaehen' aus der Skriptliste in boot.js streichen (Knöpfe in doktor.js verschwinden dann von selbst).
// =====================================================================================================
(()=>{
const M=window.MG,S=M?.s,D=window.DOK;if(!M||!S||!D||!M.branches)return;
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cl=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=v=>{v=cl(v);return v*v*(3-2*v);},lerp=(a,b,k)=>a+(b-a)*k;
const pick=a=>a[Math.floor(Math.random()*a.length)],first=g=>String(g?.name||'').split(' ')[0]||'Er';
const DOC='Dr. Hirnhammer',NURSE='Schwester Valeria';

// ---------- 1 · Stücke, die man annähen kann ----------
// Wurzel der Kette (M.branches): an dieser Stelle wird gesägt und genäht. Eltern: daran wird angenäht.
const PIECES={
 lh:{nom:'die linke Hand',akk:'die linke Hand',w:'Hand',kind:'arm',parent:'lfa'},rh:{nom:'die rechte Hand',akk:'die rechte Hand',w:'Hand',kind:'arm',parent:'rfa'},
 lfa:{nom:'der linke Unterarm mit Hand',akk:'den linken Unterarm mit Hand',w:'Unterarm',kind:'arm',parent:'lua'},rfa:{nom:'der rechte Unterarm mit Hand',akk:'den rechten Unterarm mit Hand',w:'Unterarm',kind:'arm',parent:'rua'},
 lua:{nom:'der linke Arm',akk:'den linken Arm',w:'Arm',kind:'arm',parent:'ls'},rua:{nom:'der rechte Arm',akk:'den rechten Arm',w:'Arm',kind:'arm',parent:'rs'},
 ls:{nom:'der ganze linke Arm samt Schulter',akk:'den ganzen linken Arm samt Schulter',w:'Arm',kind:'arm',parent:'chest'},rs:{nom:'der ganze rechte Arm samt Schulter',akk:'den ganzen rechten Arm samt Schulter',w:'Arm',kind:'arm',parent:'chest'},
 lf:{nom:'der linke Fuß',akk:'den linken Fuß',w:'Fuß',kind:'leg',parent:'lsh'},rf:{nom:'der rechte Fuß',akk:'den rechten Fuß',w:'Fuß',kind:'leg',parent:'rsh'},
 lsh:{nom:'der linke Unterschenkel mit Fuß',akk:'den linken Unterschenkel mit Fuß',w:'Unterschenkel',kind:'leg',parent:'lt'},rsh:{nom:'der rechte Unterschenkel mit Fuß',akk:'den rechten Unterschenkel mit Fuß',w:'Unterschenkel',kind:'leg',parent:'rt'},
 lt:{nom:'das linke Bein',akk:'das linke Bein',w:'Bein',kind:'leg',parent:'belly'},rt:{nom:'das rechte Bein',akk:'das rechte Bein',w:'Bein',kind:'leg',parent:'belly'}};
const ORDER=['ls','lua','lfa','lh','rs','rua','rfa','rh','lt','lsh','lf','rt','rsh','rf'];
const chain=root=>M.branches[root]||[root];
const RULE={fixCost:5000,fixDays:5,days:10,abBase:.08,perCm:.015,cmFree:3,abMax:.35,crooked:.20,okMin:5,okMax:15,crMin:20,crMax:35,maxChronic:40};
const perDay=()=>(3+(S.buildings?.hospital||0))*(M.HEAL_SPEED||1);
const partName=id=>M.partName?.(id)||(M.parts||[]).find(p=>p[0]===id)?.[1]||id;
const living=()=>S.roster.filter(g=>g&&!g.dead&&!g.retired&&!g.dokTemp);
const bed=g=>D.bedDays?.(g)||0;
// Fehlende Stücke: Wurzeln, deren Elternteil noch dran ist (sonst müsste erst das Elternteil angenäht werden)
function missingPieces(g){const out=[];if(!g?.body)return out;for(const r of ORDER){const p=g.body[r],par=g.body[PIECES[r].parent];if(p?.missing&&par&&!par.missing)out.push(r);}return out;}
const amputees=()=>living().filter(g=>missingPieces(g).length).sort((a,b)=>(b.potential??0)-(a.potential??0));
// Länge des Stücks: Arm- bzw. Beinlänge des Gladiators, Hände und Füße zählen ein Drittel
function lenDiff(rec,don,root){const P=PIECES[root],k=['lh','rh','lf','rf'].includes(root)?.35:['lfa','rfa','lsh','rsh'].includes(root)?.6:1,key=P.kind==='arm'?'arm':'leg';
 const a=(don[key]??(don.height||180)*(P.kind==='arm'?.43:.49)),b=(rec[key]??(rec.height||180)*(P.kind==='arm'?.43:.49));return Math.round((a-b)*k);}
function odds(rec,don,root){const d=Math.abs(lenDiff(rec,don,root)),ab=Math.min(RULE.abMax,RULE.abBase+Math.max(0,d-RULE.cmFree)*RULE.perCm),cr=RULE.crooked;return {ab,cr,ok:1-ab-cr};}
// Wert des Stücks: Durchschnitt aus Kraft, Beweglichkeit und Robustheit (IST) über alle Teile, Dauerschaden mitgezählt
function limbValue(g,root){const ids=chain(root);let s=0,a=0,r=0,c=0;for(const id of ids){const p=g.body[id];s+=p.strength||0;a+=p.agility||0;r+=p.robust||0;c=Math.max(c,p.chronic||0);}const n=ids.length;
 const S_=s/n,A=a/n,R_=r/n;return {s:S_,a:A,r:R_,chronic:c,score:(S_+A+R_)/3*(1-c/100)};}
function capValue(g,root){const ids=chain(root),C=g.caps?.body||{};let s=0,a=0,r=0;for(const id of ids){s+=C[id]?.strength||0;a+=C[id]?.agility||0;r+=C[id]?.robust||0;}const n=ids.length;return {s:s/n,a:a/n,r:r/n};}
function donorOk(don,rec,root){if(!don||don===rec||don.dead||don.retired||don.dokTemp)return false;if((don.age??20)<18)return false;
 for(const id of chain(root)){const p=don.body?.[id];if(!p||p.missing||p.fracture)return false;}const par=don.body?.[PIECES[root].parent];return !!par&&!par.missing;}
function donors(rec,root){const all=living().filter(d=>donorOk(d,rec,root));return {ready:all.filter(d=>!bed(d)),inBed:all.filter(d=>bed(d))};}
// Schief angenähte Stücke: Wurzel, deren Elternteil nicht aus derselben schiefen Naht stammt
const sameGraft=(a,b)=>a&&b&&a.kind==='crooked'&&b.kind==='crooked'&&a.day===b.day&&a.fromId===b.fromId;
function crookedRoots(g){const out=[];if(!g?.body)return out;for(const r of ORDER){const p=g.body[r];if(!p||p.missing||p.graft?.kind!=='crooked')continue;if(sameGraft(p.graft,g.body[PIECES[r].parent]?.graft))continue;out.push(r);}return out;}
const crookedMen=()=>living().filter(g=>crookedRoots(g).length).sort((a,b)=>(b.potential??0)-(a.potential??0));
const crookedChronic=(g,root)=>Math.max(0,...chain(root).map(id=>g.body[id]?.graft?.kind==='crooked'?(g.body[id].chronic||0):0));
const gold=()=>S.gold||0,fmtG=v=>Math.round(v).toLocaleString('de-DE');

// ---------- 2 · Die Operation (gilt sofort) ----------
function operate(rec,don,root,force){const P=PIECES[root],o=odds(rec,don,root),r=Math.random(),kind=force||(r<o.ab?'ab':r<o.ab+o.cr?'crooked':'ok');
 const ids=chain(root),val=limbValue(don,root),day=S.day,until=day+RULE.days,low=c=>Math.max(4,Math.round(100-c-RULE.days*perDay()));
 const sew=kind==='ok'?RULE.okMin+Math.random()*(RULE.okMax-RULE.okMin):kind==='crooked'?RULE.crMin+Math.random()*(RULE.crMax-RULE.crMin):0;
 const parts=[];
 if(kind!=='ab'){for(const id of ids){const dp=don.body[id],rp=rec.body[id];const chronic=Math.min(RULE.maxChronic,Math.round(((dp.chronic||0)+sew)*10)/10);
   Object.assign(rp,{missing:false,strength:dp.strength,agility:dp.agility,robust:dp.robust,chronic,hp:low(chronic),pain:kind==='crooked'?70:50,bleed:0,fracture:null,internal:null,injury:kind==='crooked'?'Schief angenäht':'Angenäht',graft:{from:don.name,fromId:don.id,day,kind}});
   rp.grade=M.injuryGrade?.(rp)??rp.grade;parts.push({id,s:rp.strength,a:rp.agility,r:rp.robust,chronic});}
  rec.body[root].dokUntil=until;M.addScar?.(rec,root,kind==='crooked'?'Schief angenäht':'Angenäht');
  try{M.noteInjury?.(rec,root,kind==='crooked'?'Schief angenäht':'Angenäht','Doktor Hippolytus Hirnhammer','Nadel und Faden');}catch{}
  rec.body[root].injury=kind==='crooked'?'Schief angenäht':'Angenäht';}
 else{const par=rec.body[P.parent];par.hp=Math.min(par.hp,low(par.chronic||0));par.pain=Math.max(par.pain||0,60);par.injury='Glied abgestoßen';par.grade=M.injuryGrade?.(par)??par.grade;par.dokUntil=until;M.addScar?.(rec,P.parent,'Glied abgestoßen');}
 if(!missingPieces(rec).length&&!Object.entries(rec.body).some(([id,p])=>id!=='head'&&p.missing))delete rec.stump;
 // Spender: Stück ab, Stumpf frisch versorgt
 for(const id of ids){const p=don.body[id];Object.assign(p,{missing:true,hp:0,bleed:0,pain:0,grade:5,fracture:null,internal:null,injury:'Abgetrennt'});M.addScar?.(don,id,'Amputation');}
 const dpar=don.body[P.parent];dpar.hp=Math.min(dpar.hp,low(dpar.chronic||0));dpar.pain=Math.max(dpar.pain||0,60);dpar.injury='Spenderstumpf';dpar.grade=M.injuryGrade?.(dpar)??dpar.grade;dpar.dokUntil=until;don.stump='bandaged';
 try{M.noteInjury?.(don,root,'Abgetrennt (Spende)','Doktor Hippolytus Hirnhammer','Knochensäge');}catch{}don.body[root].injury='Abgetrennt';
 rec.grafts=(rec.grafts||0)+1;don.donated=(don.donated||0)+1;
 const res={kind,root,recId:rec.id,donId:don.id,recName:rec.name,donName:don.name,val,parts,sew:Math.round(sew*10)/10,odds:o,len:lenDiff(rec,don,root),day};
 (S.grafts??=[]).push({day,rec:rec.id,don:don.id,root,kind});if(S.grafts.length>60)S.grafts.splice(0,S.grafts.length-60);
 try{M.persist?.();}catch{}return res;}

// Nachnähen: aufmachen, gerade drehen, neu nähen. Kostet 5.000 Gold, Dauerschaden an den Teilen der schiefen Naht entfällt.
function fixOperate(g,root){if(!g||!crookedRoots(g).includes(root)||gold()<RULE.fixCost||bed(g))return null;
 const day=S.day,until=day+RULE.fixDays,low=Math.max(4,Math.round(100-RULE.fixDays*perDay())),parts=[];S.gold=gold()-RULE.fixCost;
 for(const id of chain(root)){const p=g.body[id];if(!p||p.missing||p.graft?.kind!=='crooked')continue;const old=p.chronic||0;
  Object.assign(p,{chronic:0,hp:low,pain:55,bleed:0,injury:'Nachgenäht'});p.graft={...p.graft,kind:'fixed',fixDay:day,fixOld:old};p.grade=M.injuryGrade?.(p)??p.grade;parts.push({id,old});}
 g.body[root].dokUntil=until;M.addScar?.(g,root,'Nachgenäht');try{M.noteInjury?.(g,root,'Nachgenäht','Doktor Hippolytus Hirnhammer','Säge, Nadel und Faden');}catch{}g.body[root].injury='Nachgenäht';
 g.refixed=(g.refixed||0)+1;(S.grafts??=[]).push({day,rec:g.id,root,kind:'fixed',cost:RULE.fixCost});if(S.grafts.length>60)S.grafts.splice(0,S.grafts.length-60);
 try{M.persist?.();}catch{}return {kind:'fixed',root,recId:g.id,recName:g.name,parts,cost:RULE.fixCost,day};}

// ---------- 3 · Sprüche (schwarzer Humor) ----------
const L={
 intro:['Ersatzteile! Das Geschäft der Zukunft. Einer hat zu viel, einer zu wenig. Ich sorge für Gerechtigkeit. Mit der Säge.','Willkommen im Ersatzteillager. Bitte nichts anfassen. Manches greift zurück.','Annähen ist wie Schneidern. Nur dass der Stoff schreit.','Was einer verliert, kann ein anderer gebrauchen. Das nenne ich Nächstenliebe.','Schwester Valeria hat den Faden schon eingefädelt. Beim dritten Versuch. Durch mein Auge.','Nachwachsen lassen kann ich nichts. Umverteilen schon.','Jeder Gladiator ist ein Ersatzteillager mit Beinen. Noch.'],
 idle:['Die Säge ist frisch geschliffen. Gestern. An einem Knochen.','Schwester, wo ist die Ratte? Sie hat mein Pausenbrot. Glaube ich. Es hatte Finger.','Ich hätte Schneider werden sollen. Aber Schneider dürfen nicht sägen.','Wer zuerst zuckt, bekommt einen Fuß. Wer zuletzt zuckt, gibt einen.','Ein Gladiator ohne Arm ist wie ein Brot ohne Butter. Man kann ihn noch schlagen, aber es macht keinen Spaß.','Garantie? Natürlich gibt es Garantie. Garantiert genäht.','Ich habe einmal einen Fuß an ein Knie genäht. Er war sehr schnell. Im Kreis.'],
 none:['Keiner amputiert? Langweilig. Schick sie öfter gegen Äxte.','Alle noch dran. Wie enttäuschend. Komm wieder, wenn einer ein Stück verloren hat.'],
 rec:['{E}! Dir fehlt {nom}? Das haben wir gleich. Also: dann fehlt es eben jemand anderem.','{E} sucht {akk}. Ich kenne da jemanden, der noch zwei hat.','Ah, {E}. Der Stumpf ist gut verheilt. Schade eigentlich, ich mach ihn gleich wieder auf.','{E}, du hast Glück. Ich hatte heute noch nichts zu nähen.','{E}! Ich habe dich am Stumpf erkannt.'],
 recMany:['{E} ist eher ein Bausatz als ein Gladiator. Fangen wir irgendwo an.','So viele Lücken. {E}, du bist mein Lebenswerk.'],
 piece:['{Nom} also. Wächst ja nicht von allein nach. Ich habe es versucht. Mit Mist.','Also {akk}. Ich hole schon mal die große Säge.','{Akk}? Kein Problem. Ich habe schon Schlimmeres angenäht. An Schlimmere.','{Nom}. Gute Wahl. Jetzt brauchen wir nur noch jemanden, der es nicht mehr braucht.'],
 noDonor:['Keiner hat {akk} übrig. Unfair. Alle hängen so an ihren Gliedern.','Kein Spender. Die anderen haben {akk} entweder selbst verloren oder liegen im Bett. Faule Bande.'],
 don:['{S} hat {akk} noch. Noch.','{S}, sei ein Held. Ein Held mit etwas weniger von allem.','{S} spendet {akk}. Freiwillig. Er weiß es nur noch nicht.','Schöne Ware. Kaum benutzt. Ein Vorbesitzer.','{S}? Ja. Den mochte ich nie besonders. Gute Wahl.','{S} hat ein gutes Herz. Das brauchen wir heute aber nicht.'],
 donTrash:['Ah, {S}! Endlich ist er zu etwas nütze. In Einzelteilen.','{S} als Ersatzteillager? Ich sage ja immer: Müll ist nur Rohstoff am falschen Ort.','{S} wird als Mensch nichts mehr. Als Spender schon.'],
 donBetter:['Moment. {S} ist besser als {E}. Du nimmst dem Besseren {akk} und nähst es an den Schlechteren. Mutig. Dumm, aber mutig.','Ein Talent zerlegen für einen Stümper? Ich frage nicht. Ich säge nur.'],
 donSuper:['{S}? Das Supertalent? Na gut. Mit einem Teil weniger ist er immer noch ein Talent. Zu siebzig Prozent.','Am Supertalent sägen. Ich zittere vor Ehrfurcht. Das ist schlecht für den Schnitt.'],
 longer:['{Nom} ist {n} Zentimeter länger. {E} kann dann um Ecken greifen.','{n} Zentimeter mehr. Ein Geschenk! Und ein Problem beim Gehen.','Zu lang. Dann knotet er eben etwas ein.'],
 shorter:['{n} Zentimeter kürzer. Er wird sich daran gewöhnen. Oder nicht.','Etwas kurz. Dafür reicht der Faden länger.','Zu kurz. Ich ziehe beim Nähen ein bisschen. Vielleicht.'],
 skin:['Die Farbe passt nicht ganz. Nennen wir es Mode.','Zweifarbig. Sehr gefragt in Rom dieses Jahr.'],
 sedate:['Betäubung kommt. Bitte recht freundlich.','Das hier ist unsere Narkose. Aus Eiche.','Nur ein kleiner Piks. Mit dem Holzhammer.','Gute Nacht, {S}. Träum was Schönes. Von Armen.'],
 saw:['Säge! Nein, die stumpfe. Die scharfe ist für Freunde.','Immer schön am Gelenk entlang. Oder ungefähr da.','Ich zähle bis drei. Ich säge bei zwei.','Hin und her, hin und her. Wie ein Wiegenlied. Mit Knochen.'],
 wake:['AAAH! DAS IST MEIN {W}!','Ich hab NEIN gesagt! Ich hab ganz deutlich NEIN gesagt!','Kann ich wenigstens die Narbe behalten?','Darf ich ihn besuchen? Den {w}, meine ich.','Warum ich? WARUM ICH?!'],
 wakeNurse:['Oh. Die Betäubung war wohl zu leicht. Ich hol den größeren Hammer.','Pst! Schreien macht die Säge nervös.','Gleich vorbei. Für dich. Für ihn fängt es gerade an.'],
 sever:['RATSCH!','KNACK!','SCHNAPP!'],
 carry:['Nicht fallen lassen. Nicht fallen lassen. Nicht …','Noch warm! Frische Ware!','Schwester, wer hat hier gewischt? Ich rutsche, und ich hab was in der Hand!','Achtung, heiß und fettig!'],
 recDuring:['Riecht das nach {S}?','Ist das … warm? Warum ist das warm?','Kann ich hinsehen? Nein? Gut.','Sag mir wenigstens, dass er sich gewaschen hat.','Ich spüre was! Ist das gut? Sag, dass das gut ist!'],
 recArm:['Sag mir, dass er sich die Fingernägel geschnitten hat.','Hat er damit … nein. Sag es mir nicht.'],
 recLeg:['Hat er Fußpilz? Sag mir, dass er keinen Fußpilz hat.','Läuft das Bein jetzt zu ihm zurück?'],
 nurseSew:['Kreuzstich oder Steppstich, Herr Doktor?','Ich hab noch rosa Faden. Der hält besser.','Einmal rum, einmal durch, Knoten. Wie bei Großmutter.','Soll ich die Ränder hübsch umsäumen?'],
 docSew:['Stich. Stich. Stich. Und ein Schleifchen für die Schönheit.','Wenn es kribbelt, wächst es an. Wenn es brennt, auch. Wenn es abfällt, nicht.','Nähen ist die halbe Medizin. Die andere Hälfte ist Hoffen.'],
 ok:['{Akk} gehört jetzt {E}. Garantie gibt es keine. Rückgabe auch nicht.','{E} mit Teilen von {S}. Ein Gladiator aus zweiter Hand.','Wackel mal. Nicht so viel! Die Naht!','Angewachsen! Schwester, schreiben Sie: Genie. Mit zwei E. Oder drei.'],
 okRec:['Es bewegt sich! Ich glaube, es mag mich.','Es fühlt sich an, als würde jemand anders winken.','Danke, Doktor! … Riecht trotzdem nach {S}.'],
 crooked:['Hoppla. Etwas schief. Aber mit Liebe schief.','Ich habe es ein bisschen gedreht. Ist jetzt eine Sonderanfertigung.','Schief ist das neue Gerade.'],
 crookedArm:['Der Daumen zeigt jetzt nach … woanders hin. Kunst!','Er kann sich jetzt selbst auf den Rücken klopfen. Von vorn.'],
 crookedLeg:['Er läuft jetzt leicht im Bogen. Wie ein echter Feldherr.','Das Knie zeigt nach Osten. Der Rest nach Rom. Passt.'],
 ab:['Na ja. Hat nicht gehalten. Der Körper hat Nein gesagt. Wie {S} vorhin.','Abgestoßen. Ich nehme das nicht persönlich. Er schon.','Medizin ist ein Würfelspiel. Und die Ratte hat gewonnen.'],
 abNurse:['Die Ratte hat es!','Herr Doktor! Die Ratte! Mit dem {w}!'],
 abDoc:['Lass sie. Die Ratten müssen auch leben.','Sie bringt es bestimmt zurück. Angeknabbert.'],
 donAfter:['Und ich? Krieg ich wenigstens eine Urkunde?','Ich will mein Teil zurück! … Ach, der hat es ja jetzt.','Zehn Tage Bett? Für ein Stück, das ich nicht mal mehr habe?'],
 donAfterDoc:['Du kriegst zehn Tage Bett und mein Mitgefühl. Das Bett ist besser.','Sieh es positiv: weniger Gewicht. Du wirst schneller laufen. Im Kreis.'],
 inBed:['{E} liegt noch {n} Tage im Bett. Erst ausheilen, dann zerschneiden.','Nicht so ungeduldig. {E} ist noch frisch zugenäht.'],
 // Nachnähen schief angewachsener Glieder
 fixIntro:['Schief angewachsen? Ich breche es wieder auf und mache es diesmal richtig. Vermutlich.','Gerade kostet extra. Schief war im Preis inbegriffen.','Was schief zusammengewachsen ist, reiße ich gern wieder auseinander. Für 5.000 Gold sogar gerade.','Reklamationen nehme ich an. Gegen Bezahlung. Mit der Säge.'],
 fixPick:['{E}, {nom} zeigt in die falsche Himmelsrichtung. Das korrigieren wir. Mit Gewalt.','{Nom} sitzt schief? Dann mache ich es auf und nähe es gerade. Diesmal mit Lineal.','{E}, wenn du grüßt, winkst du nach hinten. Das ist unhöflich. Das richten wir.','Ah, mein schiefes Meisterwerk. {E}, ich habe dich vermisst. Dein {w} weniger.'],
 fixPoor:['5.000 Gold. Nicht verhandelbar. Gerade Glieder sind Luxus.','Kein Gold, kein Gerade. Schief hast du schon, das kostet nichts.','Ich nähe nicht auf Pump. Der letzte, der auf Pump genäht wurde, zahlt heute noch. In Fingern.'],
 fixSedate:['Noch einmal schlafen, {E}. Diesmal mit dem guten Hammer.','Bitte recht freundlich. Und jetzt: gute Nacht.','Keine Sorge, {E}. Diesmal treffe ich beim ersten Schlag.'],
 fixSaw:['Erst wieder auf, dann gerade. Wie ein schlecht geknöpftes Hemd.','Die Naht vom letzten Mal war gut. Nur die Richtung nicht.','Ich schneide genau da, wo ich beim letzten Mal schief war. Ich erinnere mich an jeden Fehler. Es sind viele.'],
 fixWake:['NICHT SCHON WIEDER!','Dafür hab ich 5.000 Gold bezahlt?!','War schief nicht auch irgendwie schön?!','DREH ES NICHT WEITER! DREH ES NICHT WEITER!'],
 fixTwist:['Jetzt eine Vierteldrehung. Oder eine halbe. Schwester, wo ist vorne?','Daumen nach oben. Nein, dein anderes Oben.','Ein kleiner Ruck. Für mich klein.'],
 fixTwistLeg:['Knie nach vorn. Zeh nach vorn. Rom nach vorn.','Er soll ja wieder geradeaus laufen. Nicht immer im Kreis um die Arena.'],
 fixNurse:['Diesmal mit dem Lineal, Herr Doktor?','Ich habe extra geraden Faden gekauft.','Soll ich festhalten oder lieber wegsehen?'],
 fixDone:['Gerade! So gerade wie meine Rechnung.','Kerzengerade. Ich hätte Zimmermann werden sollen.','Perfekt. Wächst es wieder schief, war es der Wille der Götter. Und kostet wieder 5.000.'],
 fixRec:['Es zeigt nach vorn! Es zeigt wirklich nach vorn!','Ich kann wieder normal winken. Wer hätte gedacht, dass ich das vermisse.','Es tut weh. Aber es tut gerade weh.'],
 fixGold:['5.000 Gold. Für die Gerade. Die Schmerzen gab es gratis dazu.','Schwester, zählen Sie das Gold. Zweimal. Dann zählen Sie die Finger.','Rückgabe ausgeschlossen. Beim Gold. Beim Glied sowieso.']};
function fill(s,v){const cap=x=>x?x[0].toUpperCase()+x.slice(1):x;return s.replace(/\{E\}/g,v.E||'er').replace(/\{S\}/g,v.S||'jemand').replace(/\{nom\}/g,v.nom||'').replace(/\{Nom\}/g,cap(v.nom||'')).replace(/\{akk\}/g,v.akk||'').replace(/\{Akk\}/g,cap(v.akk||'')).replace(/\{w\}/g,v.w||'Teil').replace(/\{W\}/g,(v.w||'Teil').toUpperCase()).replace(/\{n\}/g,v.n??'');}
const vars=(rec,don,root,n)=>({E:first(rec),S:first(don),nom:PIECES[root]?.nom,akk:PIECES[root]?.akk,w:PIECES[root]?.w,n});
const lum=c=>{const m=/^#?([0-9a-f]{6})$/i.exec(c||'');if(!m)return 0;const v=parseInt(m[1],16);return .3*(v>>16)+.59*((v>>8)&255)+.11*(v&255);};
const tagOf=g=>M.sortTag?.get?.(g)||'';
// Spruch zur Spenderwahl: besondere Fälle zuerst
function donorLine(rec,don,root){const v=vars(rec,don,root),d=lenDiff(rec,don,root),t=tagOf(don);
 if(t==='super')return fill(pick(L.donSuper),v);if(t==='muell')return fill(pick(L.donTrash),v);if((don.potential??0)>=(rec.potential??0)+10)return fill(pick(L.donBetter),v);
 if(Math.abs(d)>=6)return fill(pick(d>0?L.longer:L.shorter),{...v,n:Math.abs(d)});if(Math.abs(lum(rec.appearance?.skin)-lum(don.appearance?.skin))>45)return fill(pick(L.skin),v);return fill(pick(L.don),v);}

// ---------- 4 · Der OP-Saal (Weltpixel 264 × 168, 2,5-fach) ----------
const WW=264,WH=168,K=2.5,TAB={don:72,rec:192},AY=114;
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const R=(q,x,y,w,h,c)=>{q.fillStyle=c;q.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
const LN=(q,x0,y0,x1,y1,w,c)=>{const n=Math.max(1,Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));for(let i=0;i<=n;i++)R(q,x0+(x1-x0)*i/n-w/2,y0+(y1-y0)*i/n-w/2,w,w,c);};
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
// Kleine Pixelschrift 3 × 5 für die Schilder
const F3={A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',G:'011100101101011',H:'101101111101101',I:'111010010010111',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',O:'010101101101010',P:'110101110100100',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',Z:'111001010100111',' ':'000000000000000','!':'010010010000010'};
const text3=(q,s,x,y,c)=>{for(let i=0;i<s.length;i++){const g=F3[s[i]]||F3[' '];for(let k=0;k<15;k++)if(g[k]==='1')R(q,x+i*4+k%3,y+Math.floor(k/3),1,1,c);}};
let roomCv=null;
function room(){if(roomCv)return roomCv;const c=mk(WW,WH),q=c.getContext('2d');
 // Mauer aus großen Steinen, Fugen, Feuchtigkeit
 R(q,0,0,WW,96,'#2b2621');for(let r=0;r<8;r++)for(let i=0;i<12;i++){const x=i*24-(r%2?12:0),y=r*12,h=hash(r*31+i*7);R(q,x+1,y+1,22,10,h>.66?'#36302a':h>.33?'#322c26':'#2f2924');R(q,x+1,y+1,22,1,'#3e3730');if(h>.86)R(q,x+4+h*10,y+5,3,4,'#25211c');}
 for(let i=0;i<9;i++){const x=hash(i*5)*WW;R(q,x,60+hash(i)*20,2,16+hash(i*3)*14,'#2a3328');}
 // Fußboden: Steinplatten mit Blutflecken und Abfluss
 R(q,0,96,WW,72,'#3a3029');for(let r=0;r<6;r++)for(let i=0;i<10;i++){const x=i*30-(r%2?15:0),y=96+r*12,h=hash(r*13+i*29);R(q,x+1,y+1,28,10,h>.5?'#40352c':'#3c3129');}
 R(q,0,96,WW,2,'#1e1915');for(let i=0;i<14;i++){const x=hash(i*9+1)*WW,y=104+hash(i*4)*60,s=2+hash(i*7)*5;R(q,x,y,s,s*.6,'#5a2622');R(q,x+1,y,s*.5,1,'#6e2b26');}
 R(q,124,150,10,4,'#1d1814');for(let i=0;i<4;i++)R(q,125+i*2,151,1,2,'#0d0b09');
 // Regal mit Einmachgläsern: Hand, Auge, Fuß, Ohr (Ersatzteile)
 R(q,12,12,56,9,'#5b4330');R(q,12,12,56,1,'#7a5a3e');text3(q,'ERSATZTEILE',18,14,'#e8d9a8');
 R(q,10,44,64,3,'#6b4d34');R(q,10,47,64,1,'#3a2a1c');R(q,12,47,2,6,'#4b3727');R(q,70,47,2,6,'#4b3727');
 const jar=(x,w,h,liq,inside)=>{R(q,x,44-h,w,h,'#3f5a46');R(q,x+1,44-h+2,w-2,h-3,liq);R(q,x,44-h-2,w,2,'#6b5a44');R(q,x+1,44-h+3,1,h-6,'#a8c8a0');inside(x+w/2,44-h/2);};
 jar(14,12,16,'#5f7d4a',(x,y)=>{R(q,x-3,y-2,5,4,'#d8b48a');for(let i=0;i<4;i++)R(q,x-3+i*1.4,y-6,1,4,'#d8b48a');R(q,x+2,y-1,2,2,'#d8b48a');});
 jar(29,10,12,'#6a7d3f',(x,y)=>{R(q,x-3,y-2,6,5,'#efe6d0');R(q,x-1,y-1,3,3,'#3a6aa0');R(q,x,y,1,1,'#101010');R(q,x+2,y+2,3,1,'#a33a32');});
 jar(42,12,15,'#58763f',(x,y)=>{R(q,x-4,y,7,3,'#d0a780');R(q,x+2,y-5,2,6,'#d0a780');for(let i=0;i<3;i++)R(q,x-4+i*2,y+3,1,1,'#d0a780');});
 jar(57,9,11,'#7a8a4a',(x,y)=>{R(q,x-2,y-2,4,5,'#d4a283');R(q,x-1,y-1,2,3,'#a8705a');});
 // Kerzen auf dem Regal (Flamme wird im Bild bewegt)
 R(q,8,36,3,8,'#e8dcc0');R(q,72,38,3,6,'#e8dcc0');
 // Werkzeugwand: Sägen, Beil, Zange, Haken mit Faden
 R(q,190,14,62,40,'#3a2c20');R(q,190,14,62,1,'#55402c');
 const saw=(x,y,l)=>{R(q,x,y,l,4,'#a9b2b4');R(q,x,y,l,1,'#e2e8e6');for(let i=0;i<l;i+=2)R(q,x+i,y+4,1,1,'#7f888a');R(q,x+l,y-1,5,6,'#7a5a3a');R(q,x+l+1,y+1,3,2,'#3a2a1c');R(q,x+3,y+1,3,2,'#8f2a24');};
 saw(194,20,22);saw(196,32,16);R(q,228,18,2,22,'#7a5a3a');R(q,224,18,10,7,'#a9b2b4');R(q,224,18,10,1,'#e2e8e6');R(q,225,22,4,2,'#8f2a24');
 R(q,240,18,2,14,'#5f686a');R(q,244,18,2,14,'#5f686a');R(q,240,30,6,2,'#5f686a');for(let i=0;i<5;i++)R(q,236+i,40+i*2,1,2,'#c43a46');R(q,234,38,4,3,'#b8b0a0');
 // Schild: KEINE GARANTIE
 R(q,196,58,60,9,'#efe0b3');R(q,196,58,60,1,'#fff3c4');R(q,196,66,60,1,'#a89870');text3(q,'KEINE GARANTIE',198,60,'#7a1e1a');
 // Eimer mit Abfällen
 R(q,232,126,18,20,'#6b5a44');R(q,232,126,18,2,'#8a7558');R(q,233,128,16,2,'#4a1a16');R(q,236,123,3,4,'#d8b48a');R(q,242,124,6,2,'#d8b48a');R(q,231,134,20,1,'#3a2c20');R(q,231,142,20,1,'#3a2c20');
 return roomCv=c;}
// Holztisch, von schräg oben (Oberseite und Vorderkante), mit Blut und Riemen
function table(q,cx,t){R(q,cx-42,128,4,22,'#4b3727');R(q,cx+36,128,4,22,'#4b3727');R(q,cx-40,146,4,4,'#3a2a1c');
 R(q,cx-48,99,90,27,'#7a5a3e');for(let i=0;i<5;i++)R(q,cx-48,100+i*5,90,1,'#6b4d34');R(q,cx-48,99,90,1,'#9a7a52');R(q,cx-48,126,90,4,'#5b4330');R(q,cx-48,129,90,1,'#3a2a1c');
 R(q,cx-30,104,10,6,'#7a2a24');R(q,cx+12,114,14,5,'#6e2621');R(q,cx-6,120,7,3,'#7a2a24');for(let i=0;i<3;i++)R(q,cx-20+i*22,126,2,3+((i+Math.floor(t*2))%3),'#8f2a24');
 R(q,cx-26,99,3,31,'#3a2a1c');R(q,cx+18,99,3,31,'#3a2a1c');}
// Ratte (für das abgestoßene Stück)
function rat(q,x,y,dir,t,load){const s=Math.sin(t*30)>0?1:0;R(q,x-4*dir-(dir<0?2:0),y-3,7,3,'#4a4440');R(q,x+(dir>0?3:-5),y-4,3,3,'#55504a');R(q,x+(dir>0?5:-6),y-3,1,1,'#e2626c');R(q,x+(dir>0?4:-4),y-5,1,1,'#c88a90');
 LN(q,x-4*dir,y-2,x-11*dir,y-4+s,1,'#b88a80');R(q,x-2,y,1,1+s,'#3a3430');R(q,x+2,y,1,2-s,'#3a3430');if(load)LN(q,x+(dir>0?6:-6),y-3,x+(dir>0?14:-14),y-6,3,load);}
// Knochensäge in der Hand des Doktors
function sawAt(q,x,y,ph){const o=Math.sin(ph)*5;R(q,x-10+o,y-2,20,4,'#a9b2b4');R(q,x-10+o,y-2,20,1,'#e2e8e6');for(let i=0;i<20;i+=2)R(q,x-10+o+i,y+2,1,1,'#7f888a');R(q,x+10+o,y-4,6,7,'#7a5a3a');R(q,x+11+o,y-2,4,3,'#3a2a1c');R(q,x-6+o,y-1,6,2,'#8f2a24');}
function hammerAt(q,x,y,up){const a=up?-1.1:.2,hx=x+Math.cos(a)*10,hy=y+Math.sin(a)*10;LN(q,x,y,hx,hy,2,'#7a5a3a');R(q,hx-3,hy-3,7,6,'#8a6644');R(q,hx-3,hy-3,7,1,'#a8845a');}
function needleAt(q,x,y,ph,thread){const lift=Math.max(0,Math.sin(ph))*9,nx=x+Math.cos(ph)*3,ny=y-lift;LN(q,nx,ny,nx+2,ny-6,1,'#e2e8e6');R(q,nx+2,ny-7,1,1,'#5f686a');if(thread)LN(q,nx+2,ny-6,thread.x,thread.y,1,'#c43a46');}

// Lage der Schnittstellen am liegenden Gladiator (Kopf links, linker Arm hängt, rechter Arm oben, linkes Bein unten)
const CUT={ls:[-26,1],lua:[-25,3],lfa:[-20,7],lh:[-14,10],rs:[-28,-9],rua:[-28,-11],rfa:[-30,-18],rh:[-25,-15],lt:[-8,2],lsh:[-3,7],lf:[5,10],rt:[-8,-2],rsh:[2,-10],rf:[9,-7]};
const cutPt=(a,root)=>{const k=(a.g?.height||180)/180,[dx,dy]=CUT[root]||[0,0];return {x:a.x+dx*k,y:a.y+dy*k};};
// Darstellungskopie ohne Waffen: wird im Film verändert, der echte Gladiator bleibt unberührt
function vis(g){const c=JSON.parse(JSON.stringify(g));c.equipment={weapon:null,secondary:null,shield:null,armor:{}};c.enemyGear=null;return c;}
function lier(g,x,slot){return {id:'gr-'+slot+'-'+g.id,g,slot,team:0,x,y:AY,a:0,phase:slot*1.7,state:'idle',energy:100,ammo:0,moveSpeed:0,unarmored:true,noNav:true,seed:slot*2.3,down:true,fallSide:-1,agony:null,kneeDuration:99,kneeTimer:0,dressings:{},bloodMarks:{},embedded:[],facePain:.5,hit:0,stagger:0,fallTimer:0};}

// ---------- 5 · Fenster ----------
let W=null,raf=0,last=0;
function open(gid){close();const v=document.createElement('div');v.className='dok-chair gr-win';v.setAttribute('role','dialog');v.setAttribute('aria-label','Glieder annähen');
 v.innerHTML=`<div class="dok-panel"><header><div><b>🧵 GLIEDER ANNÄHEN</b><small>${esc(DOC)} · ${esc(NURSE)} · Ersatzteillager</small></div><button class="btn small" type="button" data-gr="close" aria-label="Schließen">✕</button></header>
<div class="dok-stage"><canvas id="grStage" width="660" height="420"></canvas><p class="dok-line" id="grLine"></p><button class="btn small gr-skip" type="button" data-gr="skip" hidden>FILM ÜBERSPRINGEN ›</button><small class="gr-tap" hidden>TIPPEN ▸</small></div>
<section class="gr-sec gr-fix" id="grFix" aria-label="Schief angenäht · nachnähen" hidden></section>
<section class="gr-sec" id="grRecs" aria-label="Amputierte"></section>
<section class="gr-sec" id="grPieces" aria-label="Was soll dran?"></section>
<section class="gr-sec" id="grDonors" aria-label="Spender"></section>
<div class="dok-result" id="grResult" hidden></div>
<p class="tiny gr-rules">Das Stück bringt Kraft, Beweglichkeit und Robustheit des Spenders mit (IST); die Anlage (SOLL) bleibt die des Empfängers. Der Spender verliert das Stück. Abgestoßen: ${Math.round(RULE.abBase*100)} % + ${String(RULE.perCm*100).replace('.',',')} % je cm Längenunterschied über ${RULE.cmFree} cm (höchstens ${Math.round(RULE.abMax*100)} %) · schief angenäht ${Math.round(RULE.crooked*100)} % (Dauerschaden ${RULE.crMin}–${RULE.crMax} %) · sonst angewachsen (Dauerschaden ${RULE.okMin}–${RULE.okMax} %). Dauerschaden des Spenders kommt dazu, höchstens ${RULE.maxChronic} %. Danach beide ${RULE.days} Tage Krankenbett. Werte noch nicht bestätigt.</p>
</div>`;
 document.body.appendChild(v);
 const list=amputees();const pre=list.find(g=>g.id===gid)||null;
 W={view:v,rec:pre?.id||null,root:null,don:null,sort:'value',t:0,line:null,lineT:0,op:null,last:null,cast:null};
 if(pre){const ps=missingPieces(pre);if(ps.length===1)W.root=ps[0];}
 const fixPre=!pre&&crookedMen().find(g=>g.id===gid);W.fixFocus=fixPre?gid:null;
 say('d',fixPre?fill(pick(L.fixPick),vars(fixPre,null,crookedRoots(fixPre)[0])):list.length?(pre?fill(pick(ps0(pre).length>1?L.recMany:L.rec),vars(pre,null,W.root||ps0(pre)[0])):pick(L.intro)):crookedMen().length?pick(L.fixIntro):pick(L.none));
 v.addEventListener('click',onClick);
 v.querySelector('.dok-stage')?.addEventListener('click',e=>{if(e.target.closest?.('[data-gr]')||!W?.op?.hold)return;W.op.ack=true;M.speakStop?.();});v.addEventListener('change',e=>{if(e.target.id==='grSort'){W.sort=e.target.value;render();}});
 render();loop();}
const ps0=g=>missingPieces(g);
function close(){if(W?.view)W.view.remove();W=null;}
const recG=()=>W?.rec?S.roster.find(g=>g.id===W.rec):null,donG=()=>W?.don?S.roster.find(g=>g.id===W.don):null;
// Im Film wartet die Uhr, bis die Zeile gelesen und fertig vorgelesen ist (wie in den anderen Filmen des Doktors); Tippen aufs Bild überspringt sie.
const need=t=>Math.max(2.3,1.1+String(t).length*.062);
function say(who,text,g){if(!W||!text)return;const name=who==='d'?DOC:who==='n'?NURSE:first(g);W.line={who,name,text};W.lineT=0;if(W.op&&!W.op.skipAll){W.op.hold={text,shown:0};W.op.ack=false;}const el=$('grLine');if(el)el.innerHTML=`<b>${esc(name)}:</b> „${esc(text)}“`;
 try{M.speakLine?.(text,who==='d'||who==='n'?who:null,who==='d'||who==='n'?null:g,{name});}catch{}}
const portrait=(c,g)=>{try{M.renderPortrait?.(c,g,{unarmored:true});}catch{}};
const tal=g=>{try{return M.talentTag?M.talentTag(g):'T'+Math.round(g.potential??0);}catch{return 'T'+Math.round(g.potential??0);}};
const ico=g=>M.sortTag?.icon?.(M.sortTag.get(g),12)||'';
const pct=v=>Math.round(v*100)+' %';
const f1=v=>(Math.round(v*10)/10).toLocaleString('de-DE');
function render(){if(!W)return;const busy=!!W.op,rec=recG(),list=amputees();
 // Schief angenäht: nachnähen für 5.000 Gold
 const fx=$('grFix');if(fx){const men=crookedMen();fx.hidden=!men.length;if(men.length){const poor=gold()<RULE.fixCost;
  fx.innerHTML=`<h3>🪡 SCHIEF ANGENÄHT · NACHNÄHEN <small>${fmtG(RULE.fixCost)} Gold je Stück · du hast ${fmtG(gold())} Gold</small></h3><div class="gr-fixlist">`+men.map(g=>{const d=bed(g);return `<div class="gr-fixman${g.id===W.fixFocus?' sel':''}"><canvas data-grface="${g.id}" width="40" height="50"></canvas><div><b>${ico(g)}${esc(g.name)}</b> ${tal(g)}${d?` <small class="bad">🛏 noch ${d} ${d===1?'Tag':'Tage'}</small>`:''}`+crookedRoots(g).map(r=>{const c=crookedChronic(g,r);return `<div class="gr-fixrow"><span>${esc(PIECES[r].nom[0].toUpperCase()+PIECES[r].nom.slice(1))} <small class="bad">schief · Dauerschaden −${f1(c)} %</small></span><button class="btn small${poor||d?'':' primary'}" type="button" data-gr="fix:${g.id}|${r}"${busy||d||poor?' disabled':''}>${d?'LIEGT IM BETT':poor?'ZU WENIG GOLD':'🪡 NACHNÄHEN · '+fmtG(RULE.fixCost)+' G'}</button></div>`;}).join('')+'</div></div>';}).join('')+
  `</div><p class="tiny gr-rules">Der Doktor macht die schiefe Naht wieder auf, dreht das Stück gerade und näht neu. Gelingt immer. Danach ist der Dauerschaden an diesen Teilen weg (auch der alte des Spenders). ${RULE.fixDays} Tage Krankenbett.</p>`;
  for(const c of fx.querySelectorAll('canvas[data-grface]')){const g=S.roster.find(y=>y.id===c.dataset.grface);if(g)portrait(c,g);}}}
 // Amputierte
 const rs=$('grRecs');if(rs){rs.innerHTML='<h3>1 · DIE AMPUTIERTEN <small>bestes Talent oben</small></h3>'+(list.length?'<div class="dok-men gr-men">'+list.map(g=>{const d=bed(g),ps=missingPieces(g);return `<button class="dok-man${g.id===W.rec?' sel':''}" type="button" data-gr="rec:${g.id}"${busy?' disabled':''}><canvas data-grface="${g.id}" width="40" height="50"></canvas><span>${ico(g)}${esc(first(g))} ${tal(g)}</span><small>${ps.map(r=>esc(PIECES[r].w)).join(', ')} fehlt</small><small>${d?'🛏 '+d+' T.':'bereit'}</small></button>`;}).join('')+'</div>':'<p class="tiny">Niemand hat ein Stück verloren, das man wieder annähen könnte. Kopf und Hals näht der Doktor nicht an. Noch nicht.</p>');
  for(const c of rs.querySelectorAll('canvas[data-grface]')){const g=S.roster.find(y=>y.id===c.dataset.grface);if(g)portrait(c,g);}}
 // Stück wählen
 const pc=$('grPieces');if(pc){if(!rec){pc.innerHTML='';pc.hidden=true;}else{pc.hidden=false;const ps=missingPieces(rec),d=bed(rec);
  pc.innerHTML=`<h3>2 · WAS SOLL DRAN? <small>${esc(rec.name)}</small></h3>`+(d?`<p class="tiny bad">Liegt noch ${d} ${d===1?'Tag':'Tage'} im Krankenbett. Danach kann wieder genäht werden.</p>`:'')+'<div class="gr-pieces">'+ps.map(r=>{const n=donors(rec,r).ready.length;return `<button class="gr-piece${r===W.root?' sel':''}" type="button" data-gr="piece:${r}"${busy?' disabled':''}><b>${esc(PIECES[r].nom[0].toUpperCase()+PIECES[r].nom.slice(1))}</b><small>${chain(r).map(partName).join(' · ')}</small><small>${n?n+' Spender':'kein Spender'}</small></button>`;}).join('')+'</div>'+
  (Object.entries(rec.body).some(([id,p])=>p.missing&&!['head','neck'].includes(id)&&!ps.some(r=>chain(r).includes(id)))?'<p class="tiny">Weiter unten fehlt noch mehr. Das kommt dran, wenn das Stück darüber wieder sitzt.</p>':'');}}
 // Spender
 const dn=$('grDonors');if(dn){if(!rec||!W.root){dn.innerHTML='';dn.hidden=true;}else{dn.hidden=false;const {ready,inBed}=donors(rec,W.root),cap=capValue(rec,W.root),P=PIECES[W.root];
  const rows=ready.map(d=>({d,v:limbValue(d,W.root),o:odds(rec,d,W.root),l:lenDiff(rec,d,W.root)}));
  rows.sort(W.sort==='talent'?(a,b)=>(a.d.potential??0)-(b.d.potential??0):W.sort==='odds'?(a,b)=>b.o.ok-a.o.ok||b.v.score-a.v.score:(a,b)=>b.v.score-a.v.score);
  const don=donG(),sel=rows.find(r=>r.d===don),inRecBed=bed(rec);
  dn.innerHTML=`<h3>3 · SPENDER FÜR ${esc(P.akk.toUpperCase())}</h3><div class="gr-head"><label>Sortieren <select id="grSort"><option value="value"${W.sort==='value'?' selected':''}>Bestes Glied zuerst</option><option value="talent"${W.sort==='talent'?' selected':''}>Niedrigstes Talent zuerst</option><option value="odds"${W.sort==='odds'?' selected':''}>Beste Anwachs-Chance zuerst</option></select></label><small>Anlage von ${esc(first(rec))} an dieser Stelle: Kraft ${Math.round(cap.s)} · Bew. ${Math.round(cap.a)} · Rob. ${Math.round(cap.r)}</small></div>`+
  (rows.length?'<div class="gr-donors">'+rows.map(({d,v,o,l})=>{const lv=Math.round(v.score);return `<button class="gr-don${d===don?' sel':''}" type="button" data-gr="don:${d.id}"${busy?' disabled':''}><canvas data-grface="${d.id}" width="40" height="50"></canvas><span class="gr-dn"><b>${ico(d)}${esc(d.name)}</b> ${tal(d)}<small>Gesundheit ${Math.round(M.health?.(d)??100)} % · Länge ${l>0?'+':''}${l} cm</small></span><span class="gr-dv"><b class="gr-lv ${lv>=45?'hi':lv<15?'lo':''}">Glied ${lv}</b><small>Kraft ${Math.round(v.s)} · Bew. ${Math.round(v.a)} · Rob. ${Math.round(v.r)}${v.chronic?` · <i class="bad">Dauerschaden −${f1(v.chronic)} %</i>`:''}</small><small><i class="ok">${pct(o.ok)} wächst an</i> · ${pct(o.cr)} schief · <i class="bad">${pct(o.ab)} abgestoßen</i></small></span></button>`;}).join('')+'</div>'
   :`<p class="tiny">${esc(fill(pick(L.noDonor),vars(rec,null,W.root)))}</p>`)+(inBed.length?`<p class="tiny">${inBed.length} weitere ${inBed.length===1?'hätte':'hätten'} ${esc(P.akk)}, ${inBed.length===1?'liegt':'liegen'} aber im Krankenbett.</p>`:'')+
  (sel?`<div class="dok-go gr-go"><p class="dok-odds"><b>${esc(sel.d.name)}</b> verliert ${esc(P.akk)}. <b>${esc(rec.name)}</b> bekommt es mit Kraft ${Math.round(sel.v.s)}, Beweglichkeit ${Math.round(sel.v.a)}, Robustheit ${Math.round(sel.v.r)}.<br><b class="ok">${pct(sel.o.ok)}</b> wächst an <span>· Dauerschaden ${RULE.okMin}–${RULE.okMax} %</span><br><b>${pct(sel.o.cr)}</b> schief angenäht <span>· Dauerschaden ${RULE.crMin}–${RULE.crMax} %, Narbe</span><br><b class="bad">${pct(sel.o.ab)}</b> abgestoßen <span>· Stück verloren, ${esc(first(sel.d))} trotzdem ohne</span><br><b>Danach</b> beide ${RULE.days} Tage Krankenbett</p><button class="btn primary dok-hit" type="button" data-gr="go"${busy||inRecBed?' disabled':''}>${inRecBed?'LIEGT IM KRANKENBETT':busy?'…':'🪚 SÄGEN UND NÄHEN!'}</button></div>`:'');
  for(const c of dn.querySelectorAll('canvas[data-grface]')){const g=S.roster.find(y=>y.id===c.dataset.grface);if(g)portrait(c,g);}}}
 const sk=W.view.querySelector('.gr-skip');if(sk)sk.hidden=!W.op;const tp=W.view.querySelector('.gr-tap');if(tp)tp.hidden=!W.op;
 W.cast=null;}
function onClick(e){const b=e.target.closest?.('[data-gr]');if(!b||!W)return;e.preventDefault();e.stopPropagation();const [cmd,arg]=b.dataset.gr.split(':');
 if(cmd==='close'){close();M.ui.render?.();return;}
 if(cmd==='skip'){if(W.op){W.op.t=Math.max(W.op.t,W.op.end-.01);W.op.hold=null;W.op.skipAll=true;M.speakStop?.();}return;}
 if(W.op)return;
 if(cmd==='fix'){const [gid,root]=b.dataset.gr.slice(4).split('|'),g=S.roster.find(x=>x.id===gid);if(!g||!root)return;W.fixFocus=g.id;
  if(bed(g)){say('d',fill(pick(L.inBed),{...vars(g,null,root),n:bed(g)}));render();return;}if(gold()<RULE.fixCost){say('d',pick(L.fixPoor));M.ui.notify?.('Nachnähen kostet '+fmtG(RULE.fixCost)+' Gold.');render();return;}
  startFix(g,root);return;}
 if(cmd==='rec'){const g=S.roster.find(x=>x.id===arg);if(!g)return;W.rec=g.id;W.don=null;const ps=missingPieces(g);W.root=ps.length===1?ps[0]:null;$('grResult').hidden=true;W.last=null;
  const d=bed(g);say('d',d?fill(pick(L.inBed),{...vars(g,null,ps[0]),n:d}):fill(pick(ps.length>1?L.recMany:L.rec),vars(g,null,ps[0])));render();$('grPieces')?.scrollIntoView?.({block:'nearest',behavior:'smooth'});return;}
 if(cmd==='piece'){const rec=recG();if(!rec)return;W.root=arg;W.don=null;$('grResult').hidden=true;say('d',fill(pick(donors(rec,arg).ready.length?L.piece:L.noDonor),vars(rec,null,arg)));render();$('grDonors')?.scrollIntoView?.({block:'nearest',behavior:'smooth'});return;}
 if(cmd==='don'){const rec=recG(),d=S.roster.find(x=>x.id===arg);if(!rec||!d)return;W.don=d.id;$('grResult').hidden=true;say('d',donorLine(rec,d,W.root));render();W.view.querySelector('.gr-go')?.scrollIntoView?.({block:'nearest',behavior:'smooth'});return;}
 if(cmd==='go'){const rec=recG(),d=donG();if(!rec||!d||!W.root||!donorOk(d,rec,W.root))return;if(bed(rec)){M.ui.notify?.('Der liegt noch im Krankenbett.');return;}start(rec,d,W.root,W.force||null);}}

// ---------- 6 · Der Film ----------
// Zeitplan (Sekunden): Betäubung 0–2,2 · Sägen 2,2–4,8 · Tragen 4,8–6,8 · Nähen 6,8–10 · Ausgang 10–13 · Großaufnahme · Schluss
function start(rec,don,root,force){const before={rec:vis(rec),don:vis(don)},res=operate(rec,don,root,force);
 const op={res,root,t:0,end:res.kind==='ab'?17.2:16.2,recV:before.rec,donV:before.don,limb:null,fx:[],stains:[],stitches:[],once:{},word:null,flash:0,shake:0,docX:132,docPose:'stand',nurseX:248,rat:null,zz:0,recG:rec,donG:don};
 op.A={don:lier(op.donV,TAB.don+14,1),rec:lier(op.recV,TAB.rec+14,2)};
 W.op=op;W.last=null;$('grResult').hidden=true;render();$('grStage')?.scrollIntoView?.({block:'start',behavior:'smooth'});}
// Nachnähen: nur der Empfänger auf dem rechten Tisch. Betäuben 0–1,8 · Aufsägen 1,8–4,2 · Geradedrehen 4,2–4,8 · Nähen 4,8–7,4 · GERADE! · Großaufnahme · Schluss
function startFix(g,root){const before=vis(g),res=fixOperate(g,root);if(!res){render();return;}
 const op={fix:true,res,root,t:0,end:10.2,recV:before,limb:null,fx:[],stains:[],stitches:[],once:{},word:null,flash:0,shake:0,docX:132,docPose:'stand',nurseX:248,rat:null,zz:0,recG:g};
 op.A={rec:lier(op.recV,TAB.rec+14,2)};W.op=op;W.last=null;$('grResult').hidden=true;render();$('grStage')?.scrollIntoView?.({block:'start',behavior:'smooth'});}
function stepFix(dt){const op=W.op,t=op.t+=dt,g=op.recG,root=op.root,P=PIECES[root],v=vars(g,null,root),A=op.A,cr=cutPt(A.rec,root);
 if(t<1.8){op.nurseX=lerp(248,Math.min(WW-14,cr.x+40),ease(t/1.1));op.docX=lerp(132,cr.x+12,ease((t-.3)/1.3));op.docPose=t>.3&&t<1.6?'walk':'stand';once(op,'sed',()=>say('n',fill(pick(L.fixSedate),v)));
  if(t>1.35)once(op,'bonk',()=>{op.word={text:'BONK!',t:0,c:'#f4d37a'};M.sound?.('block');op.shake=.6;op.zz=1;});}
 else if(t<4.2){op.docX=cr.x+12;op.docPose='stand';once(op,'saw',()=>say('d',pick(L.fixSaw)));op.sawT=(op.sawT||0)+dt;if(op.sawT>.28){op.sawT=0;M.sound?.('stick');blood(op,cr.x,cr.y,4,28);}
  if(t>2.9)once(op,'knack',()=>{op.word={text:'KNACK!',t:0,c:'#e2626c'};M.sound?.('sever');op.shake=1.2;blood(op,cr.x,cr.y,18,60);op.stains.push({x:cr.x-6,y:cr.y+4,w:12,h:4});});
  if(t>3.2)once(op,'wake',()=>{op.zz=0;say('r',pick(L.fixWake),g);try{M.voice?.('pain',M.voicePitch?.(g)??1,true);}catch{}A.rec.facePain=1;A.rec.agony={pose:1,part:P.kind,rate:7,live:.8,lie:1.35};});}
 else if(t<4.8){once(op,'twist',()=>{A.rec.agony=null;op.word={text:'KRRRK …',t:0,c:'#f4d37a'};M.sound?.('heavy');op.shake=.9;say('d',fill(pick(P.kind==='leg'&&Math.random()<.5?L.fixTwistLeg:L.fixTwist),v));});}
 else if(t<7.4){op.stT=(op.stT||0)+dt;if(op.stT>.36&&op.stitches.length<8){op.stT=0;op.stitches.push({dx:(op.stitches.length-3.5)*1.6,dy:(op.stitches.length%2?1:-1)*1.5});M.sound?.('stick');}
  if(t>5.4)once(op,'nurse',()=>say('n',pick(L.fixNurse)));}
 else{once(op,'done',()=>{op.flash=1;op.word={text:'GERADE!',t:0,c:'#9fd48a'};op.docPose='flail';M.sound?.('crowd');op.shake=1;A.rec.agony={pose:1,part:P.kind,rate:5,live:.6,lie:1.35};op.twitch=1.2;say('d',pick(L.fixDone));});
  if(t>8)once(op,'gold',()=>say('d',pick(L.fixGold)));if(t>9.4)once(op,'rec',()=>say('r',pick(L.fixRec),g));}
 tickFx(op,dt);
 if(t>=op.end){W.op=null;W.last=op.res;W.fixFocus=op.res.recId;showResult(op.res);render();}}
const once=(op,k,fn)=>{if(op.once[k])return;op.once[k]=1;fn();};
const blood=(op,x,y,n,sp=40)=>{for(let i=0;i<n;i++)op.fx.push({x,y,z:4+Math.random()*6,vx:(Math.random()-.5)*sp,vy:(Math.random()-.3)*sp*.4,vz:10+Math.random()*sp*.8,life:.6+Math.random()*.7,c:Math.random()<.6?'#a8372f':'#7a2420'});};
function tickFx(op,dt){for(const p of op.fx){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vz-=140*dt;p.z+=p.vz*dt;if(p.z<=0){p.z=0;p.vx=p.vy=p.vz=0;if(!p.landed){p.landed=1;if(op.stains.length<40)op.stains.push({x:p.x,y:p.y,w:2,h:1});}}}op.fx=op.fx.filter(p=>p.life>0);
 if(op.twitch>0){op.twitch-=dt;if(op.twitch<=0)op.A.rec.agony=null;}if(op.word)op.word.t+=dt;op.flash=Math.max(0,op.flash-dt*2.2);op.shake=Math.max(0,op.shake-dt*4);}
// Ein Filmschritt: steht still, solange die gesprochene Zeile noch läuft (nicht angetippt)
function filmStep(dt){const op=W.op,h=op.hold;if(h){h.shown+=dt;if(op.ack||(h.shown>=need(h.text)&&!M.speechHold?.({})))op.hold=null;}
 if(op.hold){tickFx(op,dt);return;}if(op.fix)stepFix(dt);else stepOp(dt);}
function stepOp(dt){const op=W.op,t=op.t+=dt,res=op.res,rec=op.recG,don=op.donG,root=op.root,v=vars(rec,don,root),P=PIECES[root],A=op.A,cd=cutPt(A.don,root),cr=cutPt(A.rec,root);
 // Betäubung: Schwester geht zum Spender und haut zu
 if(t<2.2){op.nurseX=lerp(248,TAB.don-20,ease(t/1.3));op.docX=lerp(132,cd.x+12,ease((t-.6)/1.4));op.docPose=t>.6&&t<2?'walk':'stand';once(op,'sed',()=>say('n',fill(pick(L.sedate),v)));
  if(t>1.55)once(op,'bonk',()=>{op.word={text:'BONK!',t:0,c:'#f4d37a'};M.sound?.('block');op.shake=.6;op.zz=1;});}
 // Sägen
 else if(t<4.8){op.nurseX=lerp(TAB.don-20,16,ease((t-2.2)/.8));op.docX=cd.x+12;op.docPose='stand';once(op,'saw',()=>say('d',pick(L.saw)));
  op.sawT=(op.sawT||0)+dt;if(op.sawT>.28){op.sawT=0;M.sound?.('stick');blood(op,cd.x,cd.y,5,30);}
  if(t>3.1)once(op,'wake',()=>{op.zz=0;say('r',fill(pick(L.wake),v),don);try{M.voice?.('pain',M.voicePitch?.(don)??1,true);}catch{}A.don.facePain=1;A.don.agony={pose:1,part:P.kind,rate:7,live:.8,lie:1.35};});
  if(t>4.3)once(op,'wakeN',()=>say('n',pick(L.wakeNurse)));}
 // Abgetrennt, zum Empfänger tragen
 else if(t<6.8){once(op,'sever',()=>{for(const id of chain(root)){const p=op.donV.body[id];p.missing=true;p.hp=0;}op.donV.stump='blood';op.limb={x:cd.x,y:cd.y,z:6,angle:.4,part:root,skin:op.donV.appearance?.skin||'#c19169'};op.word={text:pick(L.sever),t:0,c:'#e2626c'};M.sound?.('sever');op.shake=1.4;blood(op,cd.x,cd.y,26,70);op.stains.push({x:cd.x-6,y:cd.y+4,w:12,h:4});op.zz=0;A.don.agony=null;});
  const k=ease((t-5)/1.6);op.docX=lerp(cd.x+12,cr.x+12,k);op.docPose=k<1?'walk':'stand';op.nurseX=lerp(16,Math.min(WW-14,cr.x+44),ease((t-5.9)/.9));
  if(op.limb){op.limb.x=op.docX-11;op.limb.y=AY+8+Math.sin(t*9)*1.5;op.limb.z=0;op.limb.angle=Math.sin(t*4)*.5+1.2;}once(op,'carry',()=>say('d',pick(L.carry)));
  if(t>5.6&&Math.random()<dt*6)blood(op,op.docX-11,AY+10,1,10);}
 // Nähen
 else if(t<10){op.docX=cr.x+12;op.docPose='stand';op.nurseX=Math.min(WW-14,cr.x+44);if(op.limb){op.limb.x=lerp(op.limb.x,cr.x+3,Math.min(1,dt*6));op.limb.y=lerp(op.limb.y,cr.y+2,Math.min(1,dt*6));op.limb.angle=lerp(op.limb.angle,P.kind==='arm'?(root[0]==='l'?.9:-1.9):-.6,Math.min(1,dt*5));}
  op.stT=(op.stT||0)+dt;if(op.stT>.4&&op.stitches.length<8){op.stT=0;op.stitches.push({dx:(op.stitches.length-3.5)*1.6,dy:(op.stitches.length%2?1:-1)*1.5});M.sound?.('stick');}
  once(op,'sew1',()=>say('d',pick(L.docSew)));if(t>7.6)once(op,'sew2',()=>say('r',fill(pick(Math.random()<.5?L.recDuring:P.kind==='arm'?L.recArm:L.recLeg),v),rec));if(t>8.9)once(op,'sew3',()=>say('n',pick(L.nurseSew)));}
 // Ausgang
 else{op.docX=cr.x+12;once(op,'out',()=>{if(res.kind!=='ab'){for(const id of chain(root)){const p=op.recV.body[id];p.missing=false;p.hp=40;}op.limb=null;A.rec.agony={pose:1,part:P.kind,rate:5,live:.6,lie:1.35};op.twitch=1.6;op.flash=1;op.word={text:res.kind==='ok'?'ES LEBT!':'HOPPLA …',t:0,c:res.kind==='ok'?'#9fd48a':'#f4d37a'};op.docPose='flail';M.sound?.(res.kind==='ok'?'crowd':'heavy');op.shake=res.kind==='ok'?1.2:.8;
    say('d',res.kind==='ok'?'ES LEBT! ES LEBT!':fill(pick(L.crooked.concat(P.kind==='arm'?L.crookedArm:L.crookedLeg)),v));}
   else{op.word={text:'PLUMPS.',t:0,c:'#e2626c'};op.fall={vz:0,z:op.limb?.z||0};M.sound?.('fall');op.docPose='stand';say('d',fill(pick(L.ab),v));}});
  if(res.kind==='ab'){op.docX=lerp(cr.x+12,Math.min(WW-40,cr.x+40),ease((t-10.2)/.7));op.nurseX=lerp(Math.min(WW-14,cr.x+44),WW-12,ease((t-10.2)/.7));}
  if(res.kind==='ab'&&op.limb){if(op.fall&&op.limb.y<AY+36){op.fall.vz+=dt*260;op.limb.y+=op.fall.vz*dt;op.limb.x-=dt*14;op.limb.angle+=dt*5;}else if(op.fall){op.limb.y=AY+36;op.fall=null;blood(op,op.limb.x,op.limb.y,8,30);}
   if(t>11.2)once(op,'rat',()=>{op.rat={x:-12,y:AY+40,dir:1,state:'in'};say('n',fill(pick(L.abNurse),v));});
   const r=op.rat;if(r){if(r.state==='in'){r.x+=dt*80;if(r.x>=op.limb.x-14){r.state='grab';r.wait=.5;}}else if(r.state==='grab'){r.wait-=dt;if(r.wait<=0){r.state='out';r.dir=-1;r.load=op.limb.skin;op.limb=null;M.sound?.('stick');}}else if(r.state==='out'){r.x-=dt*60;}}
   if(t>12.8)once(op,'abDoc',()=>say('d',pick(L.abDoc)));}
  if(res.kind!=='ab'&&t>11.6)once(op,'recAfter',()=>say('r',fill(pick(L.okRec),v),rec));
  if(t>(res.kind==='ab'?14.6:13.8))once(op,'final',()=>say('d',fill(pick(res.kind==='ab'?L.ab:res.kind==='ok'?L.ok:L.crooked),v)));
  if(t>(res.kind==='ab'?15.9:15))once(op,'donAfter',()=>say('r',pick(L.donAfter),don));}
 tickFx(op,dt);
 if(t>=op.end)finish();}
function finish(){const op=W.op;W.op=null;W.last=op.res;showResult(op.res);say('d',pick(L.donAfterDoc));const keep={rec:op.res.recId};
 W.rec=keep.rec;const rec=recG();const ps=rec?missingPieces(rec):[];if(!ps.length)W.rec=null;W.root=ps.includes(op.root)?op.root:ps[0]||null;W.don=null;render();}
function showResult(r){const el=$('grResult');if(!el)return;const P=PIECES[r.root],cap=s=>s[0].toUpperCase()+s.slice(1);el.hidden=false;el.className='dok-result '+(r.kind==='ab'?'fail':'ok');
 if(r.kind==='fixed'){el.innerHTML=`<h4>NACHGENÄHT · ${esc(r.recName)}</h4><p>${esc(cap(P.nom))} sitzt jetzt gerade. Bezahlt: ${fmtG(r.cost)} Gold.</p><div class="dok-loss gr-parts">${r.parts.map(p=>`<span>${esc(partName(p.id))} <b>Dauerschaden −${f1(p.old)} % → 0 %</b></span>`).join('')}</div><p>${RULE.fixDays} Tage Krankenbett.</p>`;el.scrollIntoView?.({block:'nearest',behavior:'smooth'});return;}
 const rows=r.parts.map(p=>`<span>${esc(partName(p.id))} <b>Kraft ${Math.round(p.s)} · Bew. ${Math.round(p.a)} · Rob. ${Math.round(p.r)}</b>${p.chronic?` <i>Dauerschaden −${f1(p.chronic)} %</i>`:''}</span>`).join('');
 el.innerHTML=r.kind==='ab'?`<h4 class="bad">ABGESTOSSEN · ${esc(r.recName)}</h4><p>${esc(cap(P.nom))} von ${esc(r.donName)} ist nicht angewachsen und abgefallen. Die Ratte hat es mitgenommen. ${esc(r.recName)} fehlt es weiter, ${esc(r.donName)} jetzt auch.</p><p>Beide ${RULE.days} Tage Krankenbett.</p>`
 :`<h4>${r.kind==='ok'?'ANGEWACHSEN':'SCHIEF ANGENÄHT'} · ${esc(r.recName)}</h4><p>${esc(cap(P.nom))} von <b>${esc(r.donName)}</b> sitzt jetzt an ${esc(r.recName)}${r.kind==='crooked'?' – etwas schief (Narbe)':''}. Naht: Dauerschaden −${f1(r.sew)} %${r.val.chronic?`, dazu der alte Dauerschaden des Spenders −${f1(r.val.chronic)} %`:''}.</p><div class="dok-loss gr-parts">${rows}</div><p>${esc(r.donName)} ist das Stück los (Amputation). Beide ${RULE.days} Tage Krankenbett.</p>`;
 el.scrollIntoView?.({block:'nearest',behavior:'smooth'});}

// Bild malen
const OFF=mk(WW,WH);
function paint(){const c=$('grStage');if(!c||!W)return;const g=c.getContext('2d'),q=OFF.getContext('2d'),t=W.t,op=W.op;q.setTransform(1,0,0,1,0,0);q.imageSmoothingEnabled=false;
 // Großaufnahmen während des Ausgangs
 if(op?.fix&&op.t>8&&op.t<9.4){D.closeup(g,c.width,c.height,t,D.doctorBuf(t,{mood:'grin',yaw:Math.sin(t*.8)*.25}));word(g,c,op);return;}
 if(op&&!op.fix){const res=op.res,ct=op.t,cu=res.kind==='ab'?(ct>14.6&&ct<16.4?'doc':''):(ct>11.2&&ct<12.9?'rec':ct>13.8&&ct<15.4?'doc':'');
  if(cu==='doc'){D.closeup(g,c.width,c.height,t,D.doctorBuf(t,{mood:res.kind==='ok'?'roar':res.kind==='ab'?'shock':'grin',yaw:Math.sin(t*.8)*.25}));word(g,c,op);return;}
  if(cu==='rec'){D.closeup(g,c.width,c.height,t,D.patientBuf(op.recV,t,{mood:res.kind==='ok'?'relief':'scared',hurt:.4}));word(g,c,op);return;}}
 q.drawImage(room(),0,0);
 // Kerzenflammen
 for(const [x,y] of [[9,33],[73,35]]){const f=Math.sin(t*11+x)+Math.sin(t*17.3);R(q,x,y-(f>0?1:0),1,3,'#f4c45a');R(q,x,y+1,1,1,'#fff2c0');}
 for(const s of (op?.stains||[]))R(q,s.x,s.y,s.w,s.h,'#6e2621');
 // Akteure: liegend auf den Tischen (Darstellungskopien)
 const cast=op?op.A:castIdle();
 // Doktor hinter den Tischen
 table(q,TAB.don,t);table(q,TAB.rec,t);
 const list=[cast.don,cast.rec].filter(Boolean);if(list.length)try{M.renderForgeActors(q,list);}catch(e){}
 // Gurte über den Patienten
 for(const a of list){R(q,a.x-38,a.y-3,2,9,'#3a2a1c');R(q,a.x-2,a.y-6,2,10,'#3a2a1c');}
 if(op?.fix){const A=op.A,cr=cutPt(A.rec,op.root);
  if(op.t>1.8&&op.t<4.2)sawAt(q,cr.x+1,cr.y,t*22);
  if(op.t>=4.8&&op.t<7.4)needleAt(q,cr.x+2,cr.y-1,t*9,{x:cr.x-2,y:cr.y});
  if(op.t>=4.8)for(const s of op.stitches){R(q,cr.x+s.dx,cr.y+s.dy,1,1,'#1a1010');R(q,cr.x+s.dx+1,cr.y+s.dy+1,1,1,'#c43a46');}
  for(const p of op.fx)R(q,p.x,p.y-p.z,p.z>0?2:1,p.z>0?2:1,p.c);
  if(op.zz>0){for(let i=0;i<3;i++){const u=(t*.6+i/3)%1;q.globalAlpha=1-u;R(q,A.rec.x-34+u*8,A.rec.y-16-u*16,3,1,'#e8dcc0');R(q,A.rec.x-33+u*8,A.rec.y-15-u*16,1,1,'#e8dcc0');R(q,A.rec.x-34+u*8,A.rec.y-14-u*16,3,1,'#e8dcc0');q.globalAlpha=1;}}}
 else if(op){const A=op.A,cd=cutPt(A.don,op.root),cr=cutPt(A.rec,op.root);
  if(op.t>2.2&&op.t<4.85)sawAt(q,cd.x+1,cd.y,t*22);
  if(op.t>=6.8&&op.t<10){needleAt(q,cr.x+2,cr.y-1,t*9,{x:cr.x-2,y:cr.y});}
  if(op.t>=6.8){for(const s of op.stitches){R(q,cr.x+s.dx,cr.y+s.dy,1,1,'#1a1010');R(q,cr.x+s.dx+1,cr.y+s.dy+1,1,1,'#c43a46');}}
  for(const p of op.fx)R(q,p.x,p.y-p.z,p.z>0?2:1,p.z>0?2:1,p.c);
  if(op.zz>0){for(let i=0;i<3;i++){const u=(t*.6+i/3)%1;q.globalAlpha=1-u;R(q,A.don.x-34+u*8,A.don.y-16-u*16,3,1,'#e8dcc0');R(q,A.don.x-33+u*8,A.don.y-15-u*16,1,1,'#e8dcc0');R(q,A.don.x-34+u*8,A.don.y-14-u*16,3,1,'#e8dcc0');q.globalAlpha=1;}}
  if(op.rat)rat(q,op.rat.x,op.rat.y,op.rat.dir,t,op.rat.load);}
 // Doktor vorn neben dem Tisch (Werkzeug liegt dann auf Höhe seiner Hand)
 {const dx=op?op.docX:132+Math.sin(t*.5)*5,mv=dx-(W._dx??dx);W._dx=dx;const walk=op?Math.abs(mv)>.02:Math.abs(Math.cos(t*.5))>.4,dir=walk?(mv>=0?1:-1):-1;
  D.drawDocSmall?.(q,{x:dx,y:150,t,dir,walk,phase:t*7,pose:op&&op.docPose==='flail'?'flail':'stand'});}
 if(op&&op.limb){q.save();q.translate(op.limb.x,op.limb.y-(op.limb.z||0));q.scale(1.6,1.6);try{M.renderForgeEffects?.(q,[{...op.limb,x:0,y:0,z:0}],[]);}catch(e){}q.restore();}
 // Schwester vorne
 const nx=op?op.nurseX:240+Math.sin(t*.7)*3;const nwalk=op&&Math.abs(nx-(W._nx??nx))>.05;W._nx=nx;
 const hs=op?.fix?1:1.2,hb=op?.fix?1.35:1.55;
 D.drawNurseSmall?.(q,{x:nx,y:162,t,dir:op?(op.fix?-1:op.t<2.2?-1:1):-1,walk:nwalk,phase:t*5.6,pose:op&&op.t>hs&&op.t<hs+.6?'wave':'stand'});
 if(op&&op.t>hs&&op.t<hs+.7)hammerAt(q,nx+8,124,op.t<hb);
 // Ins große Bild
 const sh=op?op.shake:0;g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;g.fillStyle='#0d0907';g.fillRect(0,0,c.width,c.height);g.drawImage(OFF,(Math.random()-.5)*sh*4,(Math.random()-.5)*sh*3,WW*K,WH*K);
 // Licht: Kerzenschein, Vignette
 const gr=g.createRadialGradient(c.width/2,c.height*.6,c.height*.2,c.width/2,c.height*.6,c.width*.75);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(8,4,2,.55)');g.fillStyle=gr;g.fillRect(0,0,c.width,c.height);
 if(op?.flash>0){g.fillStyle=`rgba(255,250,230,${op.flash*.7})`;g.fillRect(0,0,c.width,c.height);}
 if(op)word(g,c,op);}
function word(g,c,op){const w=op.word;if(!w||w.t>1.6)return;const s=Math.max(26,c.width/14)*(1+.35*Math.max(0,1-w.t*4))*(1+.05*Math.sin(w.t*12));g.save();g.globalAlpha=w.t<1.2?1:1-(w.t-1.2)/.4;g.font="bold "+Math.round(s)+"px 'Courier Prime',monospace";g.textAlign='center';g.textBaseline='middle';g.fillStyle='#17201c';g.fillText(w.text,c.width/2+3,c.height*.22+3);g.fillStyle=w.c;g.fillText(w.text,c.width/2,c.height*.22);g.restore();}
// Ohne Operation: der gewählte Empfänger rechts, der gewählte Spender links (sonst leerer Tisch)
function castIdle(){const rec=recG(),don=donG(),key=(rec?.id||'')+'|'+(don?.id||'')+'|'+(rec?JSON.stringify(rec.body&&Object.values(rec.body).map(p=>p.missing?1:0)):'')+'|'+(don?Object.values(don.body).map(p=>p.missing?1:0).join(''):'');
 if(!W.cast||W.cast.key!==key){W.cast={key,rec:rec?lier(vis(rec),TAB.rec+14,2):null,don:don?lier(vis(don),TAB.don+14,1):null};}return W.cast;}
function loop(){if(raf)return;last=0;const run=now=>{if(!W){raf=0;return;}const dt=Math.min(.05,last?(now-last)/1000:0);last=now;W.t+=dt;if(W.op)filmStep(dt);else{W.lineT+=dt;if(W.lineT>11){const rec=recG(),don=donG();say('d',rec&&don?donorLine(rec,don,W.root):pick(L.idle));}}paint();raf=requestAnimationFrame(run);};raf=requestAnimationFrame(run);}

// ---------- 7 · Anschluss ----------
M.graft={open,close,operate,fixOperate,crookedRoots,crookedMen,odds,limbValue,lenDiff,missingPieces,amputees,donors,donorOk,PIECES,RULE,L,get win(){return W;},
 // Nur für Tests: Ausgang erzwingen ('ok' | 'crooked' | 'ab'), Film vorspulen
 force(k){if(W)W.force=k||null;},skip(){if(W?.op){W.op.t=W.op.end-.01;W.op.hold=null;W.op.skipAll=true;}},tap(){if(W?.op?.hold){W.op.ack=true;M.speakStop?.();}}};
})();
