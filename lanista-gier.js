'use strict';
// =====================================================================================================
// LANISTA-GIER (Wunsch Thomas 4./5.11.) – im Spiel und auf der Testseite lanista-test.html
//  1. Aufstellung (Arena, Herumtreiber, Plünderungen): Jeder Lebende darf in den Kampf, egal wie zerschunden. Statt Sperre
//     Warnzeichen und schwarzhumorige Sprüche des Lanista (ehrlos, gierig, ein großes Arschloch) – beim Aufstellen, als Warnung
//     des Medicus vor dem Losschicken, bei aussichtslosen Kämpfen. Die Einsatzregeln des Spiels (M.army.eligibility) bleiben
//     für alles andere unverändert (Auto-Teams, Ersatz, Kaserne); nur die Aufstellung fragt M.lineupEligibility.
//     Grenzen bleiben: Tote, Ausgeschiedene, Kinder, Schmiedelehre.
//  2. Sterben viele (mind. 2 oder 40 % der Gruppe), folgt die Abrechnung im Ludus: Die Überlebenden schleifen die Toten zum
//     Lanista und beschweren sich (wer tot, wer verstümmelt ist), der Lanista beschwert sich übers Gemecker, „korrigiert“
//     ihr Abzählen, tanzt im Goldregen und freut sich übers Gold. Viele Varianten je Schritt.
// =====================================================================================================
(()=>{
const M=window.MG,S=M?.s,UI=window.AufstellungUI,ART=window.ArenaArt;
if(!M||!S||!UI)return;
const TEST=!!window.ARENA_NEU_TEST&&document.body.classList.contains('lanista-page');
const store=window.AUF_STORE||{get:()=>null,set:()=>false},KEY='lanista-gier-v1';
const root=document.getElementById('auf');if(!root)return;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),fmt=n=>Math.round(n).toLocaleString('de-DE');
const pick=a=>a[Math.floor(Math.random()*a.length)],fill=(t,o)=>t.replace(/\{(\w+)\}/g,(m,k)=>o[k]??m),cl=(v,a,b)=>v<a?a:v>b?b:v;
const first=g=>String(g?.name||'').split(' ')[0];
const G=id=>S.roster.find(g=>g.id===id);
const LAN=()=>S.lanista?.name||'Der Lanista';
const GOLD=()=>TEST?(UI.state?.gold||0):(S.gold|0);
let LG={seeded:false,scenes:0};
if(TEST){try{const d=JSON.parse(store.get(KEY)||'null');if(d)LG=Object.assign(LG,d);}catch(e){}}
function save(){if(TEST)try{store.set(KEY,JSON.stringify(LG));}catch(e){}}

// ---------------------------------------------------------------- Verletzungen lesen, Einsatz in der Aufstellung
const LEGS=['lt','lsh','lf','rt','rsh','rf'],ARMS=['ls','lua','lfa','lh','rs','rua','rfa','rh'];
const legless=g=>!!g&&['lt','rt','lsh','rsh'].some(id=>g.body?.[id]?.missing);
const missingSet=g=>new Set(Object.entries(g?.body||{}).filter(([,p])=>p.missing).map(([id])=>id));
const HARD=/nicht aktiv|Schmiedelehre/;
function elig(g){try{return M.army.eligibility(g);}catch{return {ok:!g?.dead,causes:[]};}}
function warnOf(g){if(!g||g.dead)return [];const e=elig(g);return e.ok?[]:(e.causes||[]).filter(c=>!HARD.test(c));}
M.lineupEligibility=g=>{if(!g)return {ok:false,causes:['unbekannt']};const e=elig(g),hard=(e.causes||[]).filter(c=>HARD.test(c));
 if(g.dead||g.retired||hard.length)return {...e,ok:false,causes:g.dead?['tot']:hard};return {...e,ok:true,causes:[],warn:warnOf(g)};};
function kind(g){const w=warnOf(g).join(' '),miss=missingSet(g);
 if(legless(g))return 'beine';if(ARMS.some(id=>miss.has(id)))return 'arme';if(/Blutung/.test(w))return 'blut';if(/Knochenbruch/.test(w))return 'bruch';
 if(/innere/.test(w))return 'innen';if(/kampfunfähig|Verletzungsschwere|Gesundheit|verletzt/.test(w))return 'kaputt';if(/Erschöpfung/.test(w))return 'muede';if(/geschont|Reserve/.test(w))return 'schon';if(w)return 'sonst';return '';}

// ---------------------------------------------------------------- Sprüche des Lanista (schwarzer Humor, viele Varianten)
const Q={
 beine:['{N} hat keine Beine mehr? Wunderbar. Dann kann er wenigstens nicht weglaufen.','Beine werden überschätzt. {N} kämpft ab der Hüfte aufwärts, das ist der wichtige Teil.','{N}, du bist jetzt ein Kurzkämpfer. Das Publikum liebt Kurzkämpfer. Ich liebe Kurzkämpfer. Sie essen weniger.','Ohne Beine ist {N} vierzig Pfund leichter. Leichter heißt schneller. Rechne nach, das stimmt.','Rollen, robben, beißen – {N}, du hast mehr Möglichkeiten als je zuvor.','{N} hat zwei Beine weniger und null Ausreden mehr.','Ich hab {N} gesagt, er soll sich ein Bein ausreißen. Er hat es wörtlich genommen. Zweimal. Respekt.'],
 arme:['{N} hat nur noch einen Arm? Ein Arm, ein Schwert. Ist doch effizient.','Keine Arme, keine Ausreden: {N} kann immer noch böse gucken und im Weg stehen.','Ach, {N}, der Arm wächst nach. Nein, tut er nicht. Aber das weißt du ja nicht.','{N} kann nicht mehr klatschen. Muss er auch nicht. Klatschen tut das Publikum, wenn er stirbt.','{N} hat einen Arm abgegeben. Ich nenne das Gewichtsreduktion.'],
 blut:['{N} blutet? Prima, dann sieht er gleich gefährlicher aus. Spart Schminke.','Das Blut kommt sowieso raus, {N}. Dann lieber in der Arena, da zahlt wenigstens einer dafür.','{N} läuft aus wie ein undichtes Weinfass. Und wie beim Wein: Ich will mein Geld zurück, wenn er leer ist.','Ein bisschen Blutverlust macht leicht im Kopf. {N} wird endlich mal mutig.','Wisch das ab, {N}. Nein, nicht für dich. Der Sand ist frisch geharkt.'],
 bruch:['{N} hat was gebrochen? Knochen sind nur ein Vorschlag.','Ein gebrochener Knochen sind zwei Knochen. Mathematik, {N}.','{N}, wenn es knackt, ist es nur die Freude.','Schiene drum, Schild dran, raus mit {N}. Das hält. Bis es nicht mehr hält.'],
 innen:['Innere Verletzungen? Sieht man nicht. Was man nicht sieht, zählt nicht. Rein mit {N}.','{N} hat Innereien, die woanders sind als vorgesehen. Na und? Hauptsache, sie sind noch drin. Größtenteils.'],
 kaputt:['{N} ist mehr Verband als Mensch. Das Publikum wird denken, das ist ein Kostüm.','Der Medicus sagt, {N} soll liegen. Der Medicus kriegt aber auch keine Prämie.','Halb tot ist auch halb lebendig, {N}. Ich bin ein Optimist.','{N}, du kämpfst nicht für dich. Du kämpfst für meine neue Villa. Die hat übrigens auch Probleme mit dem Dach.','Wenn {N} da draußen umfällt, dann wenigstens mit Würde. Und mit Eintritt.','{N} kann kaum stehen? Dann fällt er eben dem Gegner vor die Füße. Ist auch eine Taktik.'],
 muede:['{N} ist müde? Schlafen kann er, wenn er tot ist. Das geht heute vielleicht schneller als gedacht.','Erschöpfung ist nur Faulheit mit Schweiß, {N}.','{N} gähnt. In der Arena wird er schon wach. Spätestens beim ersten Hieb.'],
 schon:['{N} sollte geschont werden? Von wem denn? Von mir sicher nicht.','Reserve heißt bei mir: Du kämpfst als Nächster, {N}. Also jetzt.'],
 sonst:['{N} sieht nicht gut aus. Ich auch nicht, und ich beschwer mich auch nicht.','Was {N} auch hat: Es ist nicht ansteckend. Glaub ich. Rein.']};
const QREADY=['Na also. Eine Truppe, so frisch wie ein Fisch nach drei Tagen in der Sonne.','Herrlich. Ein Haufen Verwundeter. Das Publikum liebt Außenseiter, und ihr seid quasi schon draußen.','Wer zurückkommt, kriegt Suppe. Wer nicht zurückkommt, spart mir Suppe. Ich gewinne immer.','Ich hab auf euch gewettet. Auf welche Seite, sag ich lieber nicht.','Ihr seht aus wie das, was übrig bleibt, wenn ein Löwe satt ist. Perfekt.','Seid tapfer! Und wenn nicht: Seid wenigstens laut. Lautes Sterben zahlt besser.'];
const QHOPE=['Fünf Totenköpfe? Das sind vier mehr, als ihr braucht, und genau die, die meine Quote braucht.','Aussichtslos ist nur ein anderes Wort für „lukrativ“.','Ich hab mit dem Bestatter einen Mengenrabatt ausgehandelt. Nur so, ganz ohne Hintergedanken.','Wenn ihr gewinnt, bin ich reich. Wenn ihr verliert, bin ich auch reich. Nur ihr nicht. Los!','Hab die Grabsteine schon mal vorbestellt. Mit Lücke für den Namen. Spart Zeit.'];
const QWARN=['Warnung, Warnung. Der Medicus warnt auch vor Wein, Weibern und Treppen. Rein mit ihnen.','Medizinisch gesehen ist das ein Fehler. Finanziell gesehen ist das ein Geniestreich.','Ich hab die Warnung gelesen. Dann hab ich sie gegessen. Weiter.','Einsatzbereit ist, wer atmet. Und wer nicht atmet, bringt immerhin Mitleidsgold.','Der Medicus kann mich mal. Der kriegt eh nur Gehalt, keine Prämie.'];
const QNO=['Weichei. Ich zieh dir das vom Lohn ab. Du kriegst keinen Lohn? Dann eben vom Essen.','Na gut. Aber nur, weil ich heute großzügig bin. Morgen nicht mehr.','Schade. Ich hatte schon die Grabinschrift geschrieben.'];

// ---------------------------------------------------------------- Lanista-Figur, Porträts, Sprechblase
let lanG=null;function lanista(){if(lanG)return lanG;try{lanG=M.ludus?.ownerFigure?.(S.lanista);}catch(e){}if(!lanG){const rng=S.rng;lanG=M.makeGladiator(0);S.rng=rng;lanG.name=LAN();}return lanG;}
let SC=null;
const porCache=new Map();function por(g){const k=g.id+(g.dead?'d':'');let c=porCache.get(k);if(!c){c=ART?.portrait?ART.portrait(g):null;porCache.set(k,c);}return c;}
function paintPor(scope){for(const cv of scope.querySelectorAll('canvas[data-lgpor]')){const id=cv.dataset.lgpor,g=id==='lan'?lanista():G(id)||SC?.extra?.get(id);if(!g)continue;const p=por(g),c=cv.getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,cv.width,cv.height);if(p)c.drawImage(p,0,0,80,90,0,0,cv.width,cv.height);}}
let sayT=0;function say(text,o={}){let el=document.getElementById('lgSay');if(!el){el=document.createElement('div');el.id='lgSay';el.className='lg-say';document.body.appendChild(el);el.onclick=()=>el.classList.remove('on');}
 el.innerHTML=`<canvas width="48" height="54" data-lgpor="lan"></canvas><div><b>${esc(LAN())}</b><span>${esc(text)}</span></div>`;paintPor(el);el.classList.add('on');el.classList.toggle('warn',!!o.warn);
 clearTimeout(sayT);sayT=setTimeout(()=>el.classList.remove('on'),o.ms||Math.max(4200,text.length*70));try{M.speakLine?.(text,'L',lanista());}catch(e){}}
function quipFor(g){const k=kind(g);return k?fill(pick(Q[k]),{N:first(g)}):'';}

// ---------------------------------------------------------------- Aufstellung schmücken (Warnzeichen) und Sprüche
let lastIds=null,deco=0,pending=null;
const mo=new MutationObserver(()=>{if(deco)return;deco=requestAnimationFrame(()=>{deco=0;decorate();});});
mo.observe(root,{childList:true,subtree:true});
function decorate(){mo.disconnect();try{
 const st=UI.state;if(!st||root.hidden){lastIds=null;return;}
 for(const el of root.querySelectorAll('[data-drag]')){const g=G(el.dataset.drag);if(!g||el.dataset.lg)continue;el.dataset.lg='1';const w=warnOf(g);
  if(w.length){el.classList.add('lg-warn');const b=document.createElement('i');b.className='lg-badge';b.textContent=legless(g)?'🦽':'⚠';b.title='Eigentlich nicht einsatzbereit: '+w.join(', ');el.appendChild(b);}}
 const ids=new Set((st.lineup||[]).map(x=>x.id));if(lastIds){for(const id of ids)if(!lastIds.has(id)){const g=G(id),q=g&&quipFor(g);if(q){say(q,{warn:true});break;}}}lastIds=ids;
 if(TEST&&root.querySelector('.a-grid')&&!root.querySelector('.lg-tools'))root.querySelector('.a-grid').closest('section')?.after(toolBox());
 const res=root.querySelector('.a-res');if(res&&pending&&!pending.noted){pending.noted=true;afterFight(res);}
 paintPor(root);
}finally{mo.observe(root,{childList:true,subtree:true});}}

// ---------------------------------------------------------------- Testseite: Testfälle
function toolBox(){const sec=document.createElement('section');sec.className='a-box lg-tools';sec.innerHTML=`<div class="a-bh"><h2>🩸 Lazarett (Test)</h2><span>nur Testversion</span></div><p class="a-hint">Macht zwei Gesunde beinlos und zwei schwer verletzt – zum Ausprobieren der Warnungen und Sprüche.</p><div class="a-acts"><button data-lgact="lazarett">🩸 LAZARETT AUFFÜLLEN</button><button data-lgact="demo">⚰ ABRECHNUNG ANSEHEN</button></div>`;return sec;}
root.addEventListener('click',e=>{const b=e.target.closest('[data-lgact]');if(!b)return;e.stopPropagation();if(b.dataset.lgact==='lazarett'){lazarett();try{UI.open();}catch(x){}}else if(b.dataset.lgact==='demo')demo();},true);
function lazarett(){const fresh=S.roster.filter(g=>!g.dead&&!legless(g)&&!warnOf(g).length).sort(()=>Math.random()-.5);let n=0;
 for(const g of fresh.slice(0,2)){for(const id of LEGS){const p=g.body[id];if(p){p.missing=true;p.hp=0;p.bleed=0;}}n++;}
 for(const g of fresh.slice(2,4)){for(const id of ['chest','belly','lua','rt']){const p=g.body[id];if(p){p.hp=Math.min(p.hp,28);p.bleed=Math.max(p.bleed||0,2.5);}}if(g.body.lfa)g.body.lfa.fracture=true;g.blood=Math.min(g.blood??100,52);g.fatigue=Math.max(g.fatigue||0,40);n++;}
 porCache.clear();try{ART.clearFigures?.();}catch(e){}save();
 say(n?pick(['So. Jetzt sehen sie aus wie echte Veteranen. Kostet weniger als Training.','Der Medicus hat geholfen. Also, beim Gegenteil von Helfen.','Wer nicht verletzt ist, hat nicht gekämpft. Ich hab ein bisschen nachgeholfen.']):'Alle schon kaputt. Gute Arbeit, Leute.');}
if(TEST&&!LG.seeded){LG.seeded=true;lazarett();}

// ---------------------------------------------------------------- Warnung vor dem Losschicken
let confirmKey='';
root.addEventListener('click',e=>{const b=e.target.closest('[data-act="ready"],[data-act="wfight"],[data-act="afight"],[data-act="fight"]');if(!b||b.disabled)return;const st=UI.state;if(!st)return;
 const act=b.dataset.act,L=(st.lineup||[]).map(x=>G(x.id)).filter(Boolean),bad=L.filter(g=>warnOf(g).length),key=act+'|'+L.map(g=>g.id).sort().join(',');
 if(act!=='fight'&&bad.length&&confirmKey!==key){e.stopPropagation();e.preventDefault();warnModal(bad,()=>{confirmKey=key;b.click();});return;}
 if(act!=='fight'&&bad.length)setTimeout(()=>say(pick(QREADY)),200);
 if(act==='fight'){const sk=(root.querySelector('.a-offer.a-sel .a-sk')?.textContent.match(/☠/g)||[]).length;if(sk>=4)setTimeout(()=>say(pick(QHOPE)),300);snapshot(L,sk);}
 if(act==='wfight')snapshot(L,0);},true);
function warnModal(bad,go){const ov=document.createElement('div');ov.className='lg-modal';
 ov.innerHTML=`<div class="lg-mbox"><h2>⚠ WARNUNG DES MEDICUS</h2><p class="lg-msub">Diese Kämpfer sind eigentlich nicht einsatzbereit:</p>
 <ul>${bad.map(g=>`<li><canvas width="32" height="36" data-lgpor="${esc(g.id)}"></canvas><div><b>${esc(g.name)}</b><small>${esc(warnOf(g).join(' · '))}</small><em>„${esc(quipFor(g)||fill(pick(Q.sonst),{N:first(g)}))}“</em></div></li>`).join('')}</ul>
 <div class="lg-lan"><canvas width="56" height="63" data-lgpor="lan"></canvas><p><b>${esc(LAN())}:</b> ${esc(pick(QWARN))}</p></div>
 <div class="lg-mrow"><button data-x="no">Lieber nicht (Weichei)</button><button class="lg-go" data-x="go">TROTZDEM REIN DA</button></div></div>`;
 document.body.appendChild(ov);paintPor(ov);ov.onclick=e=>{const x=e.target.closest('[data-x]')?.dataset.x;if(!x)return;ov.remove();if(x==='go')go();else say(pick(QNO));};}

// ---------------------------------------------------------------- Nach dem Kampf: Hinweis, Abrechnung beim Lanista
// ---------------------------------------------------------------- Verletzungen eines Kampfs (vorher/nachher)
// Nur die richtig fiesen zählen: abgetrennte Glieder, Schädelbruch, aufgeschlitzter Bauch, innere Verletzungen,
// gebrochene Beine/Arme/Rippen, zerschlagenes Gesicht. Je Kämpfer die schlimmste zuerst.
function hurtState(g){const b=g?.body||{},o={miss:new Set(),frac:new Set(),internal:new Set(),skull:!!b.head?.skullFracture,low:new Set()};
 for(const [id,p] of Object.entries(b)){if(p.missing)o.miss.add(id);if(p.fracture)o.frac.add(id);if(p.internal)o.internal.add(id);if(!p.missing&&(p.hp??100)<=22)o.low.add(id);}return o;}
const SIDE={l:['linkes','linker','linke'],r:['rechtes','rechter','rechte']};
function nastyOf(g,pre){if(!pre)return [];const now=hurtState(g),gone=id=>now.miss.has(id)&&!pre.miss.has(id),had=id=>now.miss.has(id),K=[];
 const legGone=s=>[s+'t',s+'sh'].some(gone),armGone=s=>[s+'s',s+'ua',s+'fa'].some(gone);
 if((legGone('l')||legGone('r'))&&['lt','lsh'].some(had)&&['rt','rsh'].some(had))K.push({k:'beine'});
 else for(const s of ['l','r'])if(legGone(s))K.push({k:'bein',s});
 if((armGone('l')||armGone('r'))&&['ls','lua','lfa'].some(had)&&['rs','rua','rfa'].some(had))K.push({k:'arme'});
 else for(const s of ['l','r'])if(armGone(s))K.push({k:'arm',s});
 if(now.skull&&!pre.skull)K.push({k:'schaedel'});
 if(now.low.has('belly')&&!pre.low.has('belly'))K.push({k:'bauch'});
 if([...now.internal].some(id=>!pre.internal.has(id)))K.push({k:'innen'});
 for(const s of ['l','r']){if(gone(s+'f')&&!legGone(s))K.push({k:'fuss',s});if(gone(s+'h')&&!armGone(s))K.push({k:'hand',s});}
 const fr=id=>now.frac.has(id)&&!pre.frac.has(id)&&!now.miss.has(id);
 for(const s of ['l','r'])if([s+'t',s+'sh'].some(fr)){K.push({k:'beinbruch',s});break;}
 for(const s of ['l','r'])if([s+'ua',s+'fa',s+'s',s+'h'].some(fr)){K.push({k:'armbruch',s});break;}
 if(fr('chest'))K.push({k:'rippen'});
 if(now.low.has('head')&&!pre.low.has('head')&&!(now.skull&&!pre.skull))K.push({k:'gesicht'});
 return K;}
const SHORT={beine:'keine Beine mehr',bein:'ein Bein weniger',arme:'keine Arme mehr',arm:'einen Arm weniger',hand:'eine Hand weniger',fuss:'einen Fuß weniger',schaedel:'einen Riss im Schädel',bauch:'den Bauch offen',innen:'innen alles durcheinander',beinbruch:'ein gebrochenes Bein',armbruch:'einen gebrochenen Arm',rippen:'gebrochene Rippen',gesicht:'kein Gesicht mehr, das man zeigen kann'};

function snapshot(L,sk){pending={gs:L.slice(),pre:Object.fromEntries(L.map(g=>[g.id,hurtState(g)])),dead:new Set(L.filter(g=>g.dead).map(g=>g.id)),gold:GOLD(),sk,noted:false};}
function afterFight(res){const p=pending;pending=null;if(!p)return;
 const dead=p.gs.filter(g=>g.dead&&!p.dead.has(g.id)),alive=p.gs.filter(g=>!g.dead),hurt=new Map(alive.map(g=>[g.id,nastyOf(g,p.pre[g.id])]).filter(([,k])=>k.length));
 const gold=Math.max(0,GOLD()-p.gold),many=dead.length>=2||(p.gs.length>=2&&dead.length/p.gs.length>=.4);
 const note=document.createElement('div');note.className='lg-note';
 note.innerHTML=`<p class="lg-q"><canvas width="40" height="45" data-lgpor="lan"></canvas><span><b>${esc(LAN())}:</b> ${esc(dead.length?pick(['Tote kosten nichts mehr. Das ist die günstigste Sorte Gladiator.','Schade um die Ausrüstung. Die war geliehen.','Ich trauere. Siehst du? Das ist mein Trauergesicht. Es sieht aus wie mein Zählgesicht.','Ein Platz frei im Schlafsaal. Endlich wieder Luft.']):hurt.size?pick(['Ein paar Teile weniger, aber alle noch da. Fast alle. Die wichtigen.','Verstümmelt ist das neue Vollständig.']):gold>0?pick(['Alle noch da? Dann war der Kampf zu leicht. Nächstes Mal mehr Totenköpfe.','Gold UND keine Toten. Ich bin fast enttäuscht.']):pick(['Kein Gold? Dann zahlt ihr eben mit Schweiß. Und Blut. Hauptsächlich Blut.']))}</span></p>`;
 res.appendChild(note);
 if(many){const d={dead,alive,hurt,gold,sk:p.sk},btn=document.createElement('button');btn.className='lg-scenebtn';btn.textContent='⚰ DIE ÜBERLEBENDEN WOLLEN DEN LANISTA SPRECHEN';btn.onclick=()=>scene(d);note.appendChild(btn);setTimeout(()=>scene(d),1600);}
 paintPor(note);}

// =====================================================================================================
// DIE ABRECHNUNG: Die Toten kommen gestapelt auf dem Leichenkarren (Fliegen, Ratten, Gestank), die Überlebenden
// schleppen sich einzeln heran, jeder mit seinen eigenen Wunden aus diesem Kampf. Sie halten sich für Helden und
// wollen Trainer werden; der Lanista verhöhnt jede Wunde, verkauft das Gemetzel als „Training“, droht mit noch
// Stärkeren, lobt sich für den Medicus und tanzt im Goldregen. Rund 50 Lanista-Sprüche, Auswahl je Szene.
// =====================================================================================================
const nameList=gs=>{const n=gs.map(first);return n.length<=1?n.join(''):n.slice(0,-1).join(', ')+' und '+n[n.length-1];};
// Was der Verwundete selbst über seine Wunde sagt ({A}/{M}/{F}: linkes/linker/linke …)
const SELF={
 beine:['Meine Beine! Ich hab sie im Sand liegen sehen. Beide. Sie lagen nebeneinander, als würden sie auf mich warten.','Ich bin auf den Händen hergekommen! Auf den HÄNDEN! Meine Beine sind noch in der Arena!','Ich war mal einen Meter achtzig. Jetzt bin ich ein Meter zehn. Mit Helm.','Ein Schwerthieb, Lanista. Ein einziger. Und plötzlich war ich auf Augenhöhe mit den Ratten.','Ich bin hierher gekrochen wie ein Wurm! Ein Wurm mit Rüstung!'],
 bein:['Mein {A} Bein ist weg! Ich hab es noch zucken sehen, ohne mich!','Ich hüpfe, Lanista! Seit heute hüpfe ich! Mein {A} Bein liegt irgendwo bei Tor drei!','Die haben mir das {F} Bein abgehackt wie Brennholz! Ich hab es mitgebracht, willst du es sehen?','Mein {A} Bein! Weg! Ich bin den ganzen Weg gehumpelt, und das ohne Bein, das ist eine Leistung!','Ich hab mich auf mein Schwert gestützt wie auf eine Krücke! Mein {A} Bein hat irgendein Köter!'],
 arme:['Keine Arme! Ich kann mir nicht mal mehr die Tränen abwischen!','Ich hab beide Arme verloren. Wenn mich was juckt, muss ich mich am Türrahmen reiben wie ein Bär!','Wie soll ich ohne Arme ein Schwert halten? Mit den Zähnen?'],
 arm:['Mein {M} Arm ist ab! Mit dem Schild noch dran! Die haben meinen Arm samt Schild mitgenommen!','Ich hab nur noch einen Arm! Und das war mein guter!','Der {F} Arm ist weg. Ich hab ihn noch gesucht, aber der Löwenwärter war schneller.','Sieh her! Bis hier war Arm. Ab hier ist nur noch Erinnerung!','Ich kann nicht mehr salutieren! Mit welchem Arm denn auch?!'],
 hand:['Meine {F} Hand! Abgehackt! Mitten im Gruß an den Kaiser!','Die {F} Hand ist weg. Ich kann nicht mal mehr richtig zählen, wie viele von uns tot sind!','Ich wollte mich am Gegner festhalten. Jetzt hält er meine {F} Hand. Als Andenken.'],
 fuss:['Mein {M} Fuß ist ab! Ich hab ihn mit dem Schwert verwechselt, als ich nach unten geschaut hab!','Ich lauf jetzt auf einem Stumpf. Klopf, klopf, klopf. Hörst du das? Das bin ich.'],
 schaedel:['Mein Schädel ist gespalten! Ich hör seitdem Glocken! Und eine Stimme, die sagt, ich soll dich beißen!','Der Medicus sagt, er kann mein Gehirn sehen. Ich hab gefragt, ob es gut aussieht. Er hat nichts gesagt.','Ein Hammer auf den Kopf, Lanista! Ich weiß nicht mehr, wie meine Mutter heißt! Oder wie ich heiße!','Ich sehe alles doppelt, Lanista! Zwei von dir! Das ist die Hölle!'],
 bauch:['Mein Bauch ist offen! Ich halt meine Gedärme mit beiden Händen fest, damit sie nicht weglaufen!','Ich bin aufgeschlitzt wie ein Fisch! Da hängt was raus, das gehört rein!','Siehst du das? Das ist mein Frühstück. Von innen. Von gestern.','Ich halt mich zusammen, Lanista! Wortwörtlich! Mit beiden Händen!'],
 innen:['Innen drin ist alles zerquetscht! Wenn ich huste, kommt Blut. Wenn ich nicht huste, auch!','Der Medicus hat mir aufs Bauchfell geklopft und ist erschrocken weggesprungen!','Mir ist innen was gerissen. Ich spür, wie es da drin herumschwappt!'],
 beinbruch:['Mein {A} Bein ist gebrochen! Der Knochen guckt raus und winkt!','Das {F} Bein zeigt jetzt in zwei Richtungen gleichzeitig! Das ist nicht normal, Lanista!'],
 armbruch:['Mein {M} Arm hat jetzt ein zweites Ellbogengelenk! Mitten im Unterarm!','Der {F} Arm ist gebrochen! Ich hab den Knochen knacken hören wie trockenes Brot!'],
 rippen:['Meine Rippen sind gebrochen! Jeder Atemzug ist wie ein Messer! Dein Gesicht übrigens auch!','Ich hab mehr gebrochene Rippen als heile. Ich kann nur noch ganz flach atmen. Und ganz flach fluchen.','Jedes Mal, wenn ich rede, knackt es! Hör, wie es knackt! Und trotzdem rede ich, weil ich DICH anschreien will!'],
 gesicht:['Mein Gesicht! Sie haben mein Gesicht zerhackt! Ich war mal hübsch!','Meine Nase ist jetzt seitlich. Ich kann um die Ecke riechen. Und du stinkst, Lanista!','Meine eigene Mutter würde mich nicht erkennen! Sie würde schreiend weglaufen!']};
// Wie der Lanista die Wunde verhöhnt ({N} Name)
const MOCK={
 beine:['Beine? Überbewertet. {N} spart jetzt die Sandalen. Das sind zwei Paar im Jahr. Rechne nach.','{N}, du bist jetzt kompakter. Kompakt ist modern. Und du passt endlich in den Karren, falls es nächstes Mal nicht klappt.','Ohne Beine kann {N} wenigstens nicht mehr fliehen. Du bist der zuverlässigste Gladiator, den ich je hatte!','{N} hat die Beine verloren? Dann ist er ab jetzt Kurzstreckenkämpfer. Sehr kurze Strecke. Null Meter.','Keine Beine, {N}? Dann kniest du ja schon. Praktisch, falls du um Gnade bitten willst.','Wenn {N} jetzt noch die Arme verliert, verkaufe ich ihn als Rammbock.','{N}, bleib einfach sitzen. Ach so, du sitzt ja schon. Für immer.'],
 bein:['{N}, ein Bein reicht völlig. Der Storch hat auch nur eins und beschwert sich nie.','Ein Bein weniger, {N}. Ich hab dir immer gesagt, du sollst dein Gewicht reduzieren.','Hüpfen ist gesund, {N}. Trainiert die Waden. Die eine Wade.','Das Bein lassen wir ausstopfen und hängen es über den Eingang. Zur Motivation der Neuen.','Einbeinig ist {N} wenigstens schwerer umzuwerfen. Weniger Beine, weniger Stolpern.','{N}, wir nennen dich ab jetzt „der Kranich“. Das klingt edler als „der Krüppel“.'],
 arme:['{N} hat keine Arme mehr? Endlich einer, der nicht in die Kasse greift.','Ohne Arme kannst du wenigstens nicht mehr kündigen, {N}. Du kannst nicht mal mehr unterschreiben.','{N}, dann kämpfst du eben mit dem Kopf. Den hast du ja noch. Vorerst.','{N} ohne Arme! Endlich kann er nicht mehr widersprechen. Gestikulieren war ja sein Widersprechen.'],
 arm:['Ein Arm, {N}? Wofür brauchst du zwei? Du hattest eh nie was in beiden Händen. Außer Ausreden.','{N}, der Arm war sowieso dein schwacher. Ich hab ihn nie gemocht.','Einarmige Gladiatoren sind beim Publikum sehr beliebt, {N}. Die halten länger durch. Also, kürzer. Aber dramatischer.','Den Arm schenke ich dem Metzger. Er sagt, der war zäh. Das freut mich für dich, {N}.','Ein Arm reicht zum Winken, {N}. Und mehr erwarte ich von dir eh nicht. Winken, wenn du stirbst.','Mit einem Arm kannst du wenigstens nicht mehr zwei Portionen nehmen, {N}.'],
 hand:['Eine Hand weg, {N}? Dann klatscht das Publikum eben für dich mit.','{N}, mit einer Hand kann man prima Gold zählen. Meins. Du zählst ja nichts.','Die Hand war eh nur zum Betteln da, {N}. Und betteln tust du ja trotzdem noch.','Eine Hand, {N}? Ab jetzt nur noch halbe Portionen. Logisch, oder?'],
 fuss:['Ein Fuß, {N}? Der zweite wächst bestimmt nach. Bei Eidechsen klappt das auch.','{N}, du stehst jetzt eben mit einem Bein im Grab. Das andere hat keinen Fuß mehr, also zählt es nicht.','Ein Fuß weniger, {N}? Spart Leder. Ich mag Leute, die sparen.'],
 schaedel:['Ein Riss im Schädel, {N}? Jetzt kommt wenigstens frische Luft an dein Hirn.','Der Medicus kann dein Gehirn sehen, {N}? Das ist mehr, als ich in zehn Jahren geschafft hab.','{N} hört Glocken? Das sind meine Münzen, Junge. Gewöhn dich dran.','Dein Schädel ist offen, {N}? Gut, dann pass auf, dass dir das Gehirn nicht in die Suppe fällt. Die Suppe ist teuer.','Ich hab dir immer gesagt, du hast einen Dickschädel, {N}. Offenbar nicht dick genug.'],
 bauch:['Hör auf, mit deinen Gedärmen rumzuwedeln, {N}. Das ist unhygienisch. Hier wird gegessen.','{N}, stopf das wieder rein. Was drin war, bleibt drin. Das ist meine Firmenpolitik.','Der Bauch ist offen? Prima, {N}, dann sieht der Medicus gleich, was du gestohlen hast.','{N}, wenn du deine Gedärme verlierst, bring sie mit. Daraus macht der Koch Würste.'],
 innen:['Innere Verletzungen, {N}? Sieht man nicht. Was man nicht sieht, zahle ich nicht.','{N} schwappt innen? Dann trink halt weniger. Ach so, das ist Blut. Auch gut, kostet nichts.','Innen kaputt, außen hübsch, {N}. Also, außen auch nicht hübsch. Aber innen eben kaputt.'],
 beinbruch:['Ein Bruch, {N}? Das heilt. Und wenn nicht, verkaufen wir dich als Kuriosität. Der Mann mit dem Knie in der Wade.','Der Knochen winkt, {N}? Wink zurück. Höflichkeit kostet nichts.','Der Knochen schaut raus, {N}? Dann ist er wenigstens neugierig. Das ist mehr, als ich von dir sagen kann.'],
 armbruch:['Zwei Ellbogen in einem Arm, {N}? Das ist Fortschritt. Mehr Gelenke, mehr Reichweite.','Knackt wie trockenes Brot? Dann weißt du ja jetzt, wie sich mein Brot für euch anfühlt, {N}.','Ein Arm mit Knick, {N}? Damit kannst du um die Ecke zuschlagen. Ich sehe Möglichkeiten!'],
 rippen:['Gebrochene Rippen, {N}? Dann atme halt weniger. Atmen ist ein Luxus. Luxus zahlt man.','Atme flach, {N}. Und rede flach. Am besten gar nicht.','Gebrochene Rippen, {N}? Dann lach halt nicht. Hier gibt es eh nichts zu lachen.'],
 gesicht:['{N}, du warst nie hübsch. Jetzt hast du wenigstens eine Ausrede.','Ein zerhacktes Gesicht, {N}? Endlich siehst du so aus, wie du kämpfst.','Endlich hast du ein Gesicht, vor dem die Gegner Angst haben, {N}. Ich übrigens auch.']};
const L_CART=['Ah, der Leichenkarren. Riecht nach Erfolg. Und nach Leichen. Hauptsächlich nach Leichen.','Wie viele liegen da drin? Stapelt sie ordentlich, der Karren ist geliehen!','Sieh an, die Fliegen sind schneller hier als ihr. Die Fliegen hätte ich aufstellen sollen.','Oh, meine Lieblingsfuhre. Jeder Tote ist ein Esser weniger. Ich rieche Ersparnisse!','Wer hat den Karren so voll gemacht? Ich zahl dem Kutscher pro Fuhre, nicht pro Leiche. Gut gemacht!','Bringt den Karren nicht so nah! Der Gestank geht nie wieder aus meiner Toga!','Die Ratten haben sich schon angemeldet. Wenigstens einer freut sich über eure Leistung.','Ihr seht ja schlimmer aus als die im Karren. Die da hinten beschweren sich wenigstens nicht.','Riecht ihr das? Das ist der Geruch von gesparten Löhnen.','Oh, Lieferung! Und ich hab gar nichts bestellt. Ach doch, Gold. Das kommt gleich.','Stellt den Karren in den Schatten. Nicht wegen der Toten, wegen MIR. Ich will das nicht riechen.','Ich hab den Bestatter extra nicht gerufen. Wozu auch, ich hab ja euch.','Die Fliegen sind treuer als ihr. Die kommen wenigstens immer zurück.','So viele auf einmal? Ihr wart heute aber gründlich. Respekt.'];
const S_HERO=['Lanista! Wir haben es geschafft! Wir haben ÜBERLEBT! Wir sind Helden!','Hast du uns gesehen? Gegen die Übermacht! Rom wird Lieder über uns singen!','Wir sind zurück! Lebendig! Na ja, größtenteils!','Das Volk hat unsere Namen gerufen, Lanista! Unsere NAMEN!','Wir haben gekämpft wie die Löwen! Wie verwundete Löwen! Wie sehr verwundete Löwen!','Ich hab drei von denen erledigt! Oder zwei! Einer ist vielleicht nur gestolpert!','Wir sind Legenden! Lebende Legenden! Wenigstens ein paar von uns!','Wir haben das Unmögliche geschafft! Wir stehen noch! Mehr oder weniger!','Lanista, das Volk hat geweint! Vor Rührung! Glaub ich!','Wir haben gegen fünf Totenköpfe gekämpft und LEBEN! Gib zu, das hast du nicht erwartet!','Man wird unsere Namen auf Wände schreiben! Neben die anderen Wörter, die man auf Wände schreibt!','Ich hab einem den Helm vom Kopf gehauen! Mit dem Kopf noch drin!','Heute Nacht wird gefeiert! Wir sind die Größten!'];
const S_TRAIN=['Ich hab genug gekämpft. Kann ich jetzt endlich Trainer werden?','Nach so einem Kampf werde ich doch sicher Lehrmeister, oder? Mit eigener Pritsche!','Ich will die Neuen ausbilden! Ich weiß jetzt genau, wie man NICHT stirbt!','Ich bin jetzt ein Veteran! Veteranen werden Trainer! Das steht so im … also, das sollte irgendwo stehen!','Ich will das Holzschwert! Das Holzschwert der Freiheit! Bitte!','Ein Held wie ich gehört an die Seitenlinie. Mit Trillerpfeife. Und Wein.','Nach heute bin ich reif für den Ruhestand. Mit Weinberg. Und Ziege.','Ich will nie wieder kämpfen. Ich will nur noch anderen zuschauen, wie sie kämpfen. Mit Wein.','Lass mich die Rekruten anschreien! Ich hab heute so viel geschrien, ich kann das jetzt!','Gib mir die Freiheit, Lanista! Oder wenigstens einen Tag frei! Oder ein Kissen!'];
const S_DEAD=['Und die da im Karren? {D}! Du hast gesagt, das wird ein Spaziergang!','Wir haben {D} auf den Karren gestapelt wie Brennholz! Die Fliegen fressen schon an {X}!','{D} sind tot, Lanista! Du hast uns gegen eine Übermacht geschickt!','Siehst du die Ratten? Die nagen an {X}! Der hat dir zehn Jahre gedient!','{SK}','Wir haben die Toten selbst aufladen müssen! {D}! Mit unseren letzten Armen!','Auf {X} sitzen schon hundert Fliegen! HUNDERT! Und du zählst Münzen!','Ich musste {D} mit eigenen Händen auf den Karren werfen! Ich hab noch ihren Geruch an mir!','Siehst du {X}? Er hat dir vertraut! Er hat gesagt: „Der Lanista weiß, was er tut.“ Jetzt liegt er unter {D2}!','Das war kein Kampf, das war ein Schlachthof! Und du hast das Eintrittsgeld kassiert!'];
const L_GRIPE=['Gemecker, Gemecker, Gemecker. Wisst ihr, wer sich nie beschwert? Die im Karren. Nehmt euch ein Beispiel.','Ruhe! Ihr jammert wie Senatoren bei der Steuer.','Beschwerden bitte schriftlich. Mit der rechten Hand. Wer noch eine hat.','Noch ein Wort und ich zieh euch die Leichen vom Lohn ab. Pro Pfund.','Ich höre immer nur „tot“ hier und „ab“ da. Wo bleibt das Positive? Ihr habt mir Gold verdient!','Ihr redet, als hätte ich euch zum Sterben geschickt. Ich hab euch zum GELDVERDIENEN geschickt. Das Sterben habt ihr euch selbst ausgesucht.','Hört euch das an. Kaum überlebt man mal einen Kampf, schon wird gejammert.','Ihr seid schlimmer als meine Schwiegermutter. Und die ist tot. Die ist übrigens auch im Bestiarium gelandet.','Wer meckert, kämpft morgen zuerst. Wer nicht meckert, kämpft morgen trotzdem.','Ich hab nicht gefragt, wie es euch geht. Ich hab gefragt, wie viel Gold ihr mitbringt.','Jammern kostet Atem. Atem kostet Kraft. Kraft kostet Essen. Hört auf, mein Essen zu verjammern!'];
const L_TRAINING=['Aussichtslos? Das nennt man Training! Hartes Training! Und ihr habt bestanden. Teilweise.','Das war eine Übung. Eine sehr realistische Übung. Und nächstes Mal schicke ich euch gegen noch Stärkere. Ihr seid ja jetzt erfahren!','Wer überlebt, wird besser. Wer nicht überlebt, liegt im Karren. Das ist natürliche Auslese. Ich bin quasi Philosoph.','Ihr beschwert euch über die Übermacht? Nächstes Mal sind es doppelt so viele. Dann wisst ihr, was Übermacht ist.','Ich hab euch gegen die Besten geschickt, weil ich an euch glaube! An euer Gold. Ich glaube an euer Gold.','Natürlich war das aussichtslos. Aussichtslose Kämpfe zahlen das Dreifache. Hat euch das keiner gesagt? Ich hab es euch absichtlich nicht gesagt.','Ihr habt jetzt Erfahrung! Erfahrung ist unbezahlbar. Deshalb bezahle ich sie auch nicht.','Nächste Woche: Elefanten. Ihr habt ja jetzt Übung im Zertrampeltwerden.','Die Gegner waren stärker? Dann wart ihr eben zu schwach. Das ist nicht meine Schuld, das ist eure Ausbildung. Die hab ich übrigens auch gemacht. Egal.','Ich hab euch nicht in einen aussichtslosen Kampf geschickt. Ich hab euch in einen lukrativen Kampf geschickt. Aussichtslos war er nur für euch.','Das nennt man Abhärtung! Bei euch hat es teilweise etwas zu gut gewirkt. Die sind jetzt ganz hart. Im Karren.','Ihr wollt einen fairen Kampf? Fair zahlt nicht. Unfair zahlt das Doppelte. Ich bin Geschäftsmann!','Nächstes Mal stell ich euch gegen Löwen UND Elefanten. Gleichzeitig. Für die Erfahrung.','Ihr habt gelernt, wie es sich anfühlt, zu verlieren. Das ist wertvoll. Für mich. Auf den Wettquoten.','Aussichtslos ist relativ. Für mich war es sehr aussichtsreich.','Ihr habt die Übermacht nicht besiegt, aber ihr habt sie müde gemacht. Das nennt man Vorarbeit. Für die Nächsten.'];
const L_MEDIC=['Und jammert nicht! Ihr habt einen Medicus! Andere Ludi haben einen Metzger. Ihr habt einen Metzger, der Medicus heißt!','Seid froh, dass ihr überhaupt einen Medicus habt. Er hat sogar schon mal einen Arm wieder angenäht. Den falschen, aber immerhin.','Der Medicus näht euch wieder zusammen. Mit Pferdehaar. Hält wie neu. Fast.','Für die Verletzten gibt es heute sogar Essig auf die Wunden. Kostenlos! Na ja, ich zieh es vom Lohn ab.','Geht zum Medicus. Er hat Wein für die Schmerzen. Den trinkt er selbst, aber er riecht danach. Das hilft auch.','Ihr habt einen Medicus, ein Dach und warme Suppe. Okay, das Dach ist kaputt und die Suppe kalt. Aber den Medicus habt ihr!','Der Medicus hat übrigens heute Rabatt auf Amputationen. Zwei zum Preis von einer. Wer will?','Ihr habt einen Medicus! Er war früher Pferdeschlachter. Er kennt sich also aus mit Gelenken.','Beschwert euch nicht, bei Ludus Brutus nähen sie mit Angelschnur. Ihr kriegt Pferdehaar! Luxus!','Der Medicus wartet schon. Er hat die Säge geschärft. Das macht er nur für Freunde.'];
const L_NOTRAIN=['Trainer? {N} will Trainer werden? Mit DEN Verletzungen? Du kannst ja nicht mal mehr die Pfeife halten!','Trainer werden die, die nicht mehr kämpfen können. {N}, du kannst noch. Ich seh doch, dass du noch atmest.','Das Holzschwert der Freiheit, {N}? Das hab ich verfeuert. Es war kalt.','Trainer, {N}? Du hast gerade die Hälfte deiner Freunde im Karren. Was willst du den Neuen beibringen? Stapeln?','Klar wirst du Trainer, {N}. In zwanzig Kämpfen. Wenn du dann noch was zum Trainieren hast.','Du willst die Neuen ausbilden, {N}? Du hast ja nicht mal dich selbst ausgebildet. Sieh dich an!','Trainer, {N}? Trainer müssen gut aussehen. Hast du dich mal angesehen?','Ich hab schon einen Trainer, {N}. Er heißt Peitsche.','Trainer werden ist wie Freiheit, {N}: Man redet gern drüber, aber keiner kriegt es.','{N}, ich mach dich zum Trainer. Zum Trainer für die Toten im Karren. Die lernen besonders still zu liegen.'];
const L_GOLD=['Und jetzt das Wichtigste: {G} Gold! GOLD! GOLD! GOLD!','{G} Gold! Hört ihr das Klimpern? Das ist das Geräusch von Gerechtigkeit!','{G} Gold! Wer braucht schon Beine, wenn man GOLD hat? Ich! Ich hab beides!','Seht ihr? So klingt Trauer bei mir: KLING! KLING! {G} Mal KLING!','{G} Gold! Ich kauf mir einen neuen Brunnen! Mit eurer Statue drin! Ganz klein!','{G} Gold für den Ludus! Also für mich. Ich bin der Ludus.','{G} Gold! Ich küss jede Münze einzeln! Euch küss ich nicht, ihr blutet.','{G} Gold! Davon kauf ich mir eine Sänfte. Getragen von euch. Wer noch Beine hat.','{G} Gold! Das ist mehr, als ihr alle zusammen wert seid! Inklusive der im Karren!','Tanzt mit mir! Nein, nicht ihr. Ihr könnt ja nicht. {G} Gold tanzt mit mir!'];
const S_REACT=['Er tanzt. Er tanzt wirklich, während die Fliegen auf unseren Brüdern sitzen.','Ich hasse diesen Mann.','Ich glaube, ich wechsle zu den Löwen. Die fressen einen wenigstens ehrlich.','Kann man sich selbst verkaufen? Ich frag für einen Freund. Für mich.','Die Ratten haben mehr Anstand als er.','Ich hab die Arena überlebt, aber das hier überlebe ich nicht.','Wenn ich noch zwei Hände hätte, würde ich ihn erwürgen.','Ich bete zu Mars, dass ihn ein Esel tritt. Ein großer Esel.','Wie kann ein Mensch so tanzen, während da hinten die Ratten fressen?','Ich hab kein Wort mehr. Mir bleibt nur noch der Hass.'];
const L_END=['Und jetzt raus hier, bevor die Fliegen auf euch umsteigen!','Und wascht euch! Ihr riecht wie die im Karren. Ich will euch nicht verwechseln.','Morgen wieder Kampf! Gegen noch Stärkere! Ich hab schon zugesagt!','Abtreten! Und tretet vorsichtig. Manche von euch haben nicht mehr viel zum Treten.','Ich bin gerührt. Nein, das ist der Gestank. Abtreten.','Die Ratten dürfen bleiben. Die arbeiten wenigstens umsonst.','Nächstes Mal bringt ihr mehr Gold mit und weniger Leichen. Oder umgekehrt, ist mir eigentlich egal.','Wer morgen nicht zum Training erscheint, kommt in den Karren. Egal ob tot oder nicht.'];
const L_FEED=['Und jetzt bringt die stinkenden Wichser ins Bestiarium. Als Hundefutter.','Knecht! Fahr die stinkenden Wichser rüber zu den Hunden. Und bring den Karren sauber zurück!','Ab mit der Fuhre ins Bestiarium! Die Hunde haben seit Dienstag nichts Anständiges gekriegt.','Kein Grab, kein Stein, kein Gejammer: Die stinkenden Wichser kommen ins Bestiarium. Hundefutter.','{D}? Ab ins Bestiarium. Die Hunde haben euch sowieso immer am liebsten gemocht.','Begraben? Wisst ihr, was ein Grab kostet? Ins Bestiarium mit den stinkenden Wichsern! Die Hunde begraben sie auf ihre Art.','Die Hunde kriegen heute ein Festessen: {N} Gladiatoren, gut abgehangen, mit Fliegen garniert.','Erst die Rüstung runter, dann die Goldzähne raus, dann ab mit den stinkenden Wichsern zu den Hunden!','Was steht ihr da rum? Die stinken! Ins Bestiarium damit, als Hundefutter, bevor sie ganz schlecht werden!','So, und {X} und die anderen stinkenden Wichser fahren jetzt zu den Hunden. Letzte Reise. Kurze Reise.','Fahrt den Karren ins Bestiarium. Die Hunde sollen auch was vom Sieg haben.','Die Toten gehen ins Bestiarium. Hundefutter. Endlich mal was, wofür {X} wirklich nützlich ist.'];
const S_OUTRAGE=['HUNDEFUTTER?! Das waren unsere Brüder!','Du kannst {X} doch nicht an die Hunde verfüttern! Der hat für dich geblutet!','Die waren Gladiatoren! Die verdienen ein Begräbnis! Mit Ehre!','Ich hab mit {X} fünf Jahre die Pritsche geteilt! Und jetzt kriegt ihn ein Köter?!','Du Unmensch! Du ehrloses, gieriges Schwein!','Die Götter sehen das, Lanista! Die Götter sehen ALLES!','Wenn ich sterbe, will ich NICHT zu den Hunden! Schwör es mir!','Das ist Leichenschändung! Das ist … das ist … das ist so typisch du!','Hundefutter?! Die hatten Familie! Na ja, die hatten uns!','Nicht mal einen Stein für {X}? Nicht mal einen ganz kleinen?','Die Hunde sollen {X} fressen? Der hat die Hunde jeden Morgen gefüttert!','Das kannst du nicht machen! Das ist gegen jedes Gesetz! Gegen jedes Gesetz der Götter und der Menschen!','Ich kotze gleich. Und das liegt nicht am Gestank!','Du bist schlimmer als jeder Gegner in der Arena! Die wollten uns wenigstens nur töten!'];
const L_COST=['Wisst ihr überhaupt, wie teuer Hundefutter ist, ihr Arschlöcher?!','Empört euch ruhig. Wisst ihr, was ein Sack Hundefutter kostet? Drei Denare! DREI! Und die da gibt es gratis, ihr Arschlöcher!','Ehre füttert keine Hunde, ihr Arschlöcher. Fleisch füttert Hunde. Und da liegt Fleisch.','Ein Begräbnis kostet zwanzig Denare. Hundefutter kostet drei. Die Toten kosten null. Rechnet nach, ihr Arschlöcher!','Ich hab Kosten, ihr Arschlöcher! Hundefutter, Medicus, Karrenmiete! Glaubt ihr, das Gold wächst auf Bäumen? Es wächst auf EUCH!','Die Hunde fressen so oder so. Entweder die oder ihr. Sucht es euch aus, ihr Arschlöcher.','Wollt ihr lieber selbst ins Bestiarium? Die Hunde sind nicht wählerisch. Ich auch nicht.','Brüder, Ehre, Götter – schöne Wörter. Wisst ihr, was nicht schön ist? Der Fleischpreis! Ihr Arschlöcher!','Hundefutter ist teurer als Gladiatoren, ihr Arschlöcher. Das sagt eigentlich alles über euren Marktwert.','{X} hat zu Lebzeiten mehr gefressen, als er wert war. Jetzt zahlt er es zurück. Das nennt man Gerechtigkeit, ihr Arschlöcher.','Ruhe! Noch ein Wort, und ihr kommt als Nachtisch hinterher!','Die Hunde haben euch nie was getan! Und jetzt gönnt ihr ihnen nicht mal ein Abendessen? Ihr Arschlöcher!','Wisst ihr, was der Metzger für Pferdefleisch nimmt? Ich zahl doch nicht für Fleisch, wenn ich Fleisch HABE, ihr Arschlöcher!','Die Götter? Die Götter zahlen mein Hundefutter nicht! Also halten die Götter auch die Klappe, ihr Arschlöcher!','Recycling nennt man das, ihr Arschlöcher! Ich bin meiner Zeit voraus!'];
const L_ALLDEAD=['Ein voller Karren und niemand, der sich beschwert! Das ist der schönste Tag meines Lebens!','Alle tot! Endlich Ruhe im Ludus. Kein Gejammer, kein Essen, kein Lohn!','Nicht mal einer ist übrig, der mir sagt, dass es aussichtslos war. Sehr rücksichtsvoll.','Der Bestatter fragt, wer zahlt. Ich hab gesagt: die Toten. Mit ihren Goldzähnen.'];
function script(d){const D=d.dead,Al=d.alive,n=D.length,gold=fmt(d.gold),list=nameList(D);const L=[];const T=(who,text,o)=>L.push({who,text,...(o||{})});
 const deck=a=>{const c=a.slice().sort(()=>Math.random()-.5);return ()=>c.length?c.pop():pick(a);};
 if(!Al.length){const A=deck(L_ALLDEAD);T('L',pick(L_CART));T('L',A());T('L',A());T('L',fill(pick(L_GOLD),{G:gold}),{dance:true});const fx0={D:list,X:first(D[0]),N:String(n)};T('L',fill(pick(L_FEED),fx0),{away:true});T('L',pick(['Und keiner da, der sich darüber aufregt. Herrlich. Sonst hätte ich jetzt wieder erklären müssen, wie teuer Hundefutter ist.','Und keiner meckert. Wisst ihr, wie selten das ist? Die Hunde freuen sich, ich freu mich. Alle freuen sich.','Und spart euch die Empörung. Ach so, ihr seid ja tot. Gut so.']));T('L',pick(['Morgen kauf ich neue. Frische. Mit Beinen. Vorerst.','Nächstes Mal nehm ich doppelt so viele mit. Doppelt so viel Gold. Rechnen kann ich.','Ich schick morgen die Neuen gegen dieselben. Die wissen ja jetzt, wo es langgeht. Nämlich in den Karren.']));return L;}
 const hurtList=Al.map(g=>({g,k:d.hurt?.get(g.id)||[]})).filter(x=>x.k.length).sort((a,b)=>b.k.length-a.k.length).slice(0,3);
 const healthy=Al.filter(g=>!hurtList.some(x=>x.g===g)),hero=healthy[0]||Al[0],trainee=Al.length>1?(Al.find(g=>g!==hero&&!(d.hurt?.get(g.id)||[]).some(x=>['beine','arme'].includes(x.k)))||Al.find(g=>g!==hero)):hero;
 T('L',pick(L_CART));
 T('S',pick(S_HERO),{g:hero});
 T('S',pick(S_TRAIN),{g:trainee});
 for(const {g,k} of hurtList){const w=k[0],sd=SIDE[w.s]||SIDE.l;let t=fill(pick(SELF[w.k]),{A:sd[0],M:sd[1],F:sd[2]});
  if(k[1])t+=' '+pick(['Und dazu hab ich noch ','Und obendrein hab ich ','Ach ja, und ich hab '])+SHORT[k[1].k]+'!';T('S',t,{g});T('L',fill(pick(MOCK[w.k]),{N:first(g)}));}
 const x=D[Math.floor(Math.random()*D.length)];T('S',fill(pick(S_DEAD),{D:list,D2:nameList(D.filter(y=>y!==x))||'den anderen',X:first(x),SK:d.sk>=4?`Fünf Totenköpfe, Lanista! FÜNF! Und du schickst uns trotzdem rein! ${list} liegen jetzt im Karren!`:`Ein leichter Kampf, hast du gesagt! Leicht für wen? Für die Fliegen auf ${first(x)}?`}),{g:Al[Al.length>1?1:0]});
 T('L',pick(L_GRIPE));
 T('L',pick(L_TRAINING));
 const nA=Al.length;T('L',pick([`Und zählt mal richtig ab: ${nA} sind NICHT im Karren. ${nA}! Das sind ${nA} Leben, die ich euch großzügig gelassen habe.`,`Ihr sagt, ${n} sind tot. Ich sage: ${nA} sind nicht tot. Halb leer, halb voll. Ich bin ein Halb-voll-Mensch.`,`Falsch gezählt! Nicht ${n} tot – ${nA} lebendig! Siehst du? Klingt gleich viel netter.`,'Ihr zählt die Toten. Ich zähle die Münzen. Rate, wer von uns glücklicher ist.']));
 T('L',pick(L_MEDIC));
 T('L',fill(pick(L_NOTRAIN),{N:first(trainee)}));
 T('L',fill(pick(L_GOLD),{G:gold}),{dance:true});
 T('S',pick(S_REACT),{g:hero});
 const fx={D:list,X:first(x),N:String(n)},others=Al.slice().sort(()=>Math.random()-.5),O=deck(S_OUTRAGE);
 T('L',fill(pick(L_FEED),fx),{away:true});
 T('S',fill(O(),fx),{g:others[0]});
 if(others.length>1&&Math.random()<.7)T('S',fill(O(),fx),{g:others[1]});
 T('L',fill(pick(L_COST),fx));
 if(Math.random()<.6)T('L',pick(L_END));
 return L;}

// ---------------------------------------------------------------- Szene: Karren, Fliegen, Ratten, Figuren
function scene(d){if(SC)return;const lines=script(d);const W=300,H=169,ov=document.createElement('div');ov.className='lg-scene';
 ov.innerHTML=`<div class="lg-stage"><canvas id="lgCv" width="${W*2}" height="${H*2}"></canvas><div class="lg-title"><small>${esc(S.schoolName||'Ludus')}</small><b>DIE ABRECHNUNG</b></div><button class="lg-skip">Überspringen ⏭</button></div><div class="lg-box"><canvas width="56" height="63" data-lgpor=""></canvas><div><b class="lg-who"></b><p class="lg-text"></p><small class="lg-tap">antippen ▸</small></div></div>`;
 document.body.appendChild(ov);document.body.classList.add('lg-scene-on');LG.scenes++;save();
 const bg=(()=>{try{return M.ludus.background();}catch{return null;}})();
 const VX=430,VY=470;
 const lan={g:lanista(),x:690,y:622,a:Math.PI,state:'idle',phase:0,energy:100,ammo:0,moveSpeed:0,lanista:true,id:'lg-lan'};
 const Al=d.alive.slice(0,5),Dd=d.dead.slice(0,9);
 // Karren: kommt zuerst, gezogen vom Karrenknecht; Tote quer gestapelt (unten 3, darüber 3, oben 3)
 let knecht=null;try{const rng=S.rng;const g=M.makeGladiator(0);S.rng=rng;g.name='Karrenknecht';for(const k of ['weapon','secondary','shield'])if(g.equipment&&k in g.equipment)g.equipment[k]=null;knecht={g,x:370,y:620,a:0,state:'move',phase:0,energy:40,ammo:0,moveSpeed:0,id:'lg-knecht'};}catch(e){}
 const cart={x:330,y:620,tx:Dd.length?492:-200,wheel:0,shake:0};
 const corpses=Dd.map((g,i)=>{const layer=Math.floor(i/3),slot=i%3;return {g,a:(i%2?Math.PI:0),state:'dead',down:true,death:true,phase:0,energy:0,ammo:0,moveSpeed:0,id:'lg-d'+i,ox:(slot-1)*13+(layer%2?6:0),lift:15+layer*6+(slot===1?1:0)};});
 const legSlow=k=>k.some(x=>['bein','fuss','beinbruch'].includes(x.k));
 const walkers=Al.map((g,i)=>{const k=d.hurt?.get(g.id)||[],crawl=legless(g),sp=crawl?13:legSlow(k)?17:k.length?24:30;return {g,x:380-i*26,y:606+(i%3)*10,tx:572+i*19-(i%2)*6,ty:602+(i%3)*11+(i>2?8:0),a:0,state:'idle',phase:Math.random()*6,energy:50,ammo:0,moveSpeed:0,id:'lg-s'+i,hurt:true,sp,delay:(Dd.length?3.4:.6)+i*1.15+Math.random()*.5,crawl};});
 /* Laufweg (8.11.): nicht durch den Karren – erst auf die Bahn hinter dem Karren, dort am Karren vorbei, dann zum Platz */
 if(Dd.length)walkers.forEach((w,i)=>{const lane=cart.y-27-(i%2)*5;w.via=[{x:w.x+6,y:lane},{x:cart.tx+50+i*5,y:lane}];});
 const flies=[];for(let i=0;i<Math.min(46,8+Dd.length*6);i++)flies.push({ph:Math.random()*7,r:4+Math.random()*16,sp:(Math.random()<.5?-1:1)*(3+Math.random()*5),h:Math.random()*14,jx:0,jy:0,lan:false});
 const rats=[0,1,2].slice(0,Dd.length?Math.min(3,1+Math.floor(Dd.length/2)):0).map(i=>({x:300-i*40,y:628+i*4,tx:0,ty:0,f:1,t:0,mode:'follow',climb:0,wait:Math.random()*2,id:i}));
 SC={ov,lines,i:-1,t:0,last:performance.now(),dance:0,coins:[],gold:d.gold,goldShown:0,lan,walkers,corpses,cart,knecht,flies,rats,arrived:false,typing:false,extra:new Map([...d.alive,...d.dead].map(g=>[g.id,g]))};
 const cv=ov.querySelector('#lgCv'),cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;
 const box=ov.querySelector('.lg-box'),txt=ov.querySelector('.lg-text'),who=ov.querySelector('.lg-who'),pcv=box.querySelector('canvas');
 /* Dialog (8.11., Wunsch Thomas: wurde mitten im Satz weggeschaltet): Antippen springt zur nächsten Zeile (laufende Stimme wird
    abgebrochen); ohne Antippen geht es erst weiter, wenn die Zeile ganz geschrieben und ganz gesprochen ist, plus kurze Pause. */
 function tap(){if(!SC)return;if(SC.i>=0&&performance.now()-(SC.lineAt||0)<250)return;if(SC.i<0&&!SC.arrived)return;try{M.speakStop?.();}catch(e){}next();}
 function next(){if(!SC)return;
  SC.i++;if(SC.i>=SC.lines.length){end();return;}const l=SC.lines[SC.i],g=l.who==='L'?lan.g:l.g||walkers[0]?.g;
  who.textContent=l.who==='L'?LAN():g?.name||'';pcv.dataset.lgpor=l.who==='L'?'lan':g?.id||'';paintPor(box);box.classList.toggle('lan',l.who==='L');
  SC.full=l.text;SC.shown=0;SC.typing=true;txt.textContent='';SC.speaker=l.who==='L'?lan:walkers.find(w=>w.g===g)||walkers[0];
  if(l.away&&SC.corpses.length){SC.cart.tx=1000;for(const r of SC.rats){r.mode='follow';r.climb=0;r.wait=Math.random()*.6;}for(const f of SC.flies)f.lan=false;}
  if(l.dance){SC.dance=5.5;lan.state='celebrate';for(const f of SC.flies)if(Math.random()<.3)f.lan=true;}
  let spoke=null;try{spoke=M.speakLine?.(l.text,l.who==='L'?'L':'N',g);}catch(e){}
  SC.lineAt=performance.now();SC.lineT=0;SC.quiet=0;SC.voice=!!spoke;SC.hold=(l.dance?3.2:0)+(SC.voice?.9:Math.max(2.4,l.text.length*.06));clearTimeout(SC.auto);}
 function end(){if(!SC)return;cancelAnimationFrame(SC.raf);clearTimeout(SC.auto);ov.classList.add('out');setTimeout(()=>{ov.remove();document.body.classList.remove('lg-scene-on');},500);SC=null;
  say(pick(['Schönes Gespräch. Das sollten wir öfter machen. Am besten nach jedem Kampf.','Ich glaube, sie mögen mich. Tief im Innern. Ganz tief. Unter den Narben.','Personalführung ist eine Kunst. Und ich bin Künstler.','Ich muss den Karren noch zurückbringen. Leer. Sonst kostet es Pfand.']));}
 ov.querySelector('.lg-skip').onclick=e=>{e.stopPropagation();end();};box.onclick=()=>tap();cv.onclick=()=>tap();
 function step(o,tx,ty,sp,dt){const dx=tx-o.x,dy=ty-o.y,dd=Math.hypot(dx,dy);if(dd<=2)return false;const s=Math.min(dd,sp*dt);o.x+=dx/dd*s;o.y+=dy/dd*s;return true;}
 function frame(t){if(!SC)return;const dt=Math.min(.05,(t-SC.last)/1000);SC.last=t;SC.t+=dt;
  // Karren rollt heran, Knecht zieht
  const cMoving=step(cart,cart.tx,cart.y,26,dt);if(cMoving){cart.wheel+=dt*26/9;cart.shake=Math.sin(SC.t*14)*.6;}else cart.shake=0;
  if(knecht){if(Dd.length){const px=knecht.x,py=knecht.y,ph=knecht.phase;knecht.x=cart.x+44;knecht.a=0;knecht.moveSpeed=cMoving?26:0;knecht.state=cMoving?'move':'idle';if(cMoving){knecht.phase+=dt*26*.16;try{M.updateLocomotion?.(knecht,px,py,ph,dt,.6);}catch(e){}}}else knecht=SC.knecht=null;}
  // Überlebende schleppen sich einzeln heran, jeder in seinem Tempo
  let moving=cMoving;for(const w of walkers){if(SC.t<w.delay){moving=true;continue;}const px=w.x,py=w.y,ph=w.phase;while(w.via?.length&&!step(w,w.via[0].x,w.via[0].y,0,0))w.via.shift();const goal=w.via?.[0]||{x:w.tx,y:w.ty};if(step(w,goal.x,goal.y,w.sp,dt)){moving=true;w.state=w.crawl?'crawl':'move';w.moveSpeed=w.sp;w.phase+=dt*w.sp*.16;w.a=0;try{M.updateLocomotion?.(w,px,py,ph,dt,.6);}catch(e){}}else{w.moveSpeed=0;if(w.state==='move')w.state='idle';w.a=0;}}
  if(!moving&&!SC.arrived){SC.arrived=true;setTimeout(()=>{if(SC&&SC.i<0)next();},400);}
  if(SC.typing&&SC.shown<SC.full.length){SC.shown=Math.min(SC.full.length,SC.shown+dt*48);txt.textContent=SC.full.slice(0,Math.floor(SC.shown));}
  // Weiter erst, wenn geschrieben und ausgesprochen (Stimme still, nichts in der Warteschlange), dann Pause SC.hold
  if(SC.i>=0&&SC.full){SC.lineT+=dt;const talking=SC.voice&&(!!M.speaking?.()||(M.speechQueued?.()||0)>0);if(SC.shown>=SC.full.length&&!talking&&SC.lineT>.6)SC.quiet+=dt;else SC.quiet=0;if(SC.quiet>=SC.hold||SC.lineT>40)next();}
  // Fliegen: kreisen über dem Leichenstapel, zittern, ein Teil fliegt beim Tanz zum Lanista
  for(const f of SC.flies){f.ph+=dt*f.sp;f.jx=(Math.random()-.5)*1.6;f.jy=(Math.random()-.5)*1.6;}
  // Ratten: folgen dem Karren, wuseln um die Räder, eine klettert auf den Stapel
  for(const r of SC.rats){r.t+=dt;r.wait-=dt;if(r.wait>0)continue;
   if(r.mode==='follow'){if(!step(r,cart.x-30+r.id*22,cart.y+8+r.id*3,cMoving?30:46,dt)&&!cMoving){r.mode='roam';r.wait=.4;}r.f=Math.sign(cart.x-30+r.id*22-r.x)||r.f;}
   else if(r.mode==='roam'){if(!r.tx||!step(r,r.tx,r.ty,52,dt)){r.tx=cart.x+(Math.random()-.5)*70;r.ty=cart.y+4+Math.random()*16;r.f=Math.sign(r.tx-r.x)||1;r.wait=.2+Math.random()*1.3;if(r.id===0&&Math.random()<.35){r.mode='climb';}}}
   else if(r.mode==='climb'){r.climb=Math.min(1,r.climb+dt*.8);if(r.climb>=1&&Math.random()<dt*.25){r.mode='down';}}
   else if(r.mode==='down'){r.climb=Math.max(0,r.climb-dt*1.2);if(r.climb<=0){r.mode='roam';r.wait=.5;}}}
  if(SC.dance>0){SC.dance-=dt;lan.a=Math.floor(SC.t*3)%2?0:Math.PI;lan.state='celebrate';lan.phase+=dt*9;if(Math.random()<dt*40)SC.coins.push({x:VX+Math.random()*W,y:VY-10,vy:40+Math.random()*60,vx:(Math.random()-.5)*20,r:Math.random()*6,s:Math.random()<.2?3:2});SC.goldShown=Math.min(SC.gold,SC.goldShown+SC.gold*dt/2.5);if(SC.dance<=0){lan.state='idle';lan.a=Math.PI;}}
  for(const c of SC.coins){c.vy+=160*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.r+=dt*8;if(c.y>lan.y+8&&!c.land){c.land=true;c.vy=0;c.vx=0;c.y=lan.y+4+Math.random()*10;c.x=cl(c.x,lan.x-60,lan.x+60);}}
  if(SC.coins.length>420)SC.coins.splice(0,SC.coins.length-420);
  draw(cx,cv,bg,VX,VY,W,H);SC.raf=requestAnimationFrame(frame);}
 SC.raf=requestAnimationFrame(frame);}
const PX=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
function drawWheel(c,x,y,r,rot){PX(c,x-r,y-1,r*2,2,'#2a1a0e');PX(c,x-1,y-r,2,r*2,'#2a1a0e');for(let i=0;i<20;i++){const a=i/20*Math.PI*2;PX(c,x+Math.cos(a)*r-1,y+Math.sin(a)*r-1,2,2,'#4a3018');}
 for(let i=0;i<4;i++){const a=rot+i*Math.PI/4;for(let k=1;k<r;k+=1.5)PX(c,x+Math.cos(a)*k,y+Math.sin(a)*k,1,1,'#6b4a26');for(let k=1;k<r;k+=1.5)PX(c,x-Math.cos(a)*k,y-Math.sin(a)*k,1,1,'#6b4a26');}PX(c,x-2,y-2,4,4,'#8a6a3a');PX(c,x-1,y-1,2,2,'#c9a45a');}
function drawCartBack(c,ct){const x=ct.x,y=ct.y+ct.shake;PX(c,x-36,y-26,72,4,'#4e3218');PX(c,x+30,y-21,26,2,'#5b3b1c');PX(c,x+54,y-22,3,4,'#3a2410');// Rückwand, Deichsel
 PX(c,x-36,y-11,72,3,'#3a2410');PX(c,x-36,y-26,3,15,'#5b3b1c');}
function drawCartFront(c,ct){const x=ct.x,y=ct.y+ct.shake;for(let i=0;i<3;i++){PX(c,x-38,y-23+i*4,76,4,i%2?'#6b4a26':'#7a5630');PX(c,x-38,y-23+i*4,76,1,'#9a7442');}
 PX(c,x-38,y-24,3,15,'#4e3218');PX(c,x+35,y-24,3,15,'#4e3218');PX(c,x-10,y-24,2,15,'#4e3218');PX(c,x+12,y-24,2,15,'#4e3218');
 PX(c,x-31,y-20,2,2,'#2a1a0e');PX(c,x+29,y-20,2,2,'#2a1a0e');// Nägel
 PX(c,x-30,y-13,10,3,'#5a1410');PX(c,x+4,y-13,7,2,'#5a1410');PX(c,x-22,y-10,2,3,'#6e1a12');PX(c,x+8,y-11,1,4,'#6e1a12');// Blut, tropft
 if(SC&&Math.floor(SC.t*2)%3===0)PX(c,x+8,y-6+(SC.t*20%6),1,2,'#7a1d14');
 drawWheel(c,x-22,y-8,9,ct.wheel);drawWheel(c,x+22,y-8,9,ct.wheel+.4);}
function drawRat(c,r,ct){const lift=r.climb?r.climb*(ct.y-r.y+30):0,x=r.x+(r.climb?(ct.x-8-r.x)*r.climb:0),y=r.y-lift,f=r.f||1,run=Math.floor((SC?.t||0)*14+r.id)%2;
 PX(c,x-3,y-3,7,3,'#4f4a46');PX(c,x-2,y-4,5,1,'#605a55');PX(c,x+f*4-1,y-3,3,2,'#5c5651');PX(c,x+f*6,y-2,1,1,'#d89a9a');PX(c,x+f*4,y-4,1,1,'#d89a9a');PX(c,x+f*5,y-3,1,1,'#111');
 for(let i=1;i<6;i++)PX(c,x-f*(3+i),y-1+(i>3?-(i-3)*.5:0)+(run&&i>2?.5:0),1,1,'#b88b7f');PX(c,x-2,y,1,run?1:2,'#3a3532');PX(c,x+2,y,1,run?2:1,'#3a3532');}
function draw(cx,cv,bg,VX,VY,W,H){const k=cv.width/W;cx.setTransform(1,0,0,1,0,0);cx.fillStyle='#120c09';cx.fillRect(0,0,cv.width,cv.height);
 cx.setTransform(k,0,0,k,-VX*k,-VY*k);if(bg)cx.drawImage(bg,0,0);
 cx.fillStyle='rgba(60,20,10,.22)';cx.fillRect(VX,VY,W,H);
 const lan=SC.lan,hop=SC.dance>0?Math.abs(Math.sin(SC.t*7))*9:0,ct=SC.cart;
 for(const c of SC.coins)if(c.land)coin(cx,c);
 // Karren mit dem Stapel: Rückwand, Tote quer, Vorderwand und Räder
 const list=[...SC.walkers,...(SC.knecht?[SC.knecht]:[]),{...lan,y:lan.y-hop}].sort((a,b)=>a.y-b.y),hasCart=SC.corpses.length>0,behind=hasCart?list.filter(a=>a.y<ct.y-1):[],front=hasCart?list.filter(a=>a.y>=ct.y-1):list;
 if(behind.length)try{M.renderLudusActors(cx,behind);}catch(e){console.warn(e);}
 if(SC.corpses.length){cx.fillStyle='rgba(0,0,0,.28)';cx.fillRect(Math.round(ct.x-40),Math.round(ct.y-2),80,4);drawCartBack(cx,ct);
  for(const c of SC.corpses){cx.save();cx.translate(0,-c.lift+ct.shake);try{M.renderLudusActors(cx,[{...c,x:ct.x+c.ox,y:ct.y}]);}catch(e){}cx.restore();}
  drawCartFront(cx,ct);
  // Gestank: grüne Schwaden
  for(let i=0;i<4;i++){const ph=(SC.t*.5+i*.25)%1,sx=ct.x-24+i*16,sy=ct.y-36-ph*26;cx.globalAlpha=(1-ph)*.55;for(let j=0;j<6;j++)PX(cx,sx+Math.sin(ph*9+j*.9+i)*3,sy-j*2,1,2,'#7d9a3a');cx.globalAlpha=1;}
  for(const r of SC.rats)drawRat(cx,r,ct);}
 try{M.renderLudusActors(cx,front);}catch(e){console.warn(e);}
 for(const c of SC.coins)if(!c.land)coin(cx,c);
 // Fliegen (über allem)
 for(const f of SC.flies){const tx=f.lan&&SC.dance>0?lan.x:ct.x,ty=f.lan&&SC.dance>0?lan.y-70-hop:ct.y-34-f.h,x=tx+Math.cos(f.ph)*f.r+f.jx,y=ty+Math.sin(f.ph*1.3)*f.r*.45+f.jy;PX(cx,x,y,1,1,'#120d0a');if(Math.floor(SC.t*30+f.ph*5)%2)PX(cx,x-1,y-1,1,1,'rgba(220,230,240,.55)');}
 const sp=SC.speaker;if(sp&&SC.typing){const y=sp.y-(sp===lan?78+hop:62)+Math.sin(SC.t*6)*2;PX(cx,sp.x-3,y,7,2,'#f1d48a');PX(cx,sp.x-2,y+2,5,2,'#f1d48a');PX(cx,sp.x-1,y+4,3,2,'#f1d48a');}
 if(SC.goldShown>0){cx.setTransform(1,0,0,1,0,0);const s=Math.round(cv.width/22);cx.font=`bold ${s}px monospace`;cx.textAlign='center';const t='+'+fmt(SC.goldShown)+' GOLD';cx.fillStyle='#3a2208';cx.fillText(t,cv.width/2+3,s*1.6+3);cx.fillStyle=SC.dance>0&&Math.floor(SC.t*8)%2?'#fff3b0':'#f1c64a';cx.fillText(t,cv.width/2,s*1.6);}
 cx.setTransform(1,0,0,1,0,0);const gr=cx.createRadialGradient(cv.width/2,cv.height/2,cv.height*.3,cv.width/2,cv.height/2,cv.width*.62);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.6)');cx.fillStyle=gr;cx.fillRect(0,0,cv.width,cv.height);}
function coin(cx,c){const w=Math.max(1,Math.round(Math.abs(Math.cos(c.r))*c.s*1.2+1));PX(cx,c.x-w/2,c.y,w+1,c.s+1,'#8a5a12');PX(cx,c.x-w/2,c.y-1,w,c.s,'#f1c64a');PX(cx,c.x-w/2,c.y-1,1,1,'#fff1a8');}
// Testen: zufällige fiese Wunden für die Überlebenden, drei Tote
function demo(){const gs=S.roster.filter(g=>!g.dead);const alive=gs.slice(0,3),dead=gs.slice(3,8).map(g=>({...g,dead:true,id:g.id+'-demo'}));
 const kinds=[[{k:'bein',s:'l'},{k:'rippen'}],[{k:'schaedel'}],[{k:'bauch'},{k:'armbruch',s:'r'}],[{k:'arm',s:'r'}],[{k:'gesicht'}],[{k:'innen'}]].sort(()=>Math.random()-.5);
 const hurt=new Map(alive.map((g,i)=>[g.id,legless(g)?[{k:'beine'}]:kinds[i]]));scene({dead,alive,hurt,gold:4321,sk:5});}
window.LanistaGier={scene,say,demo};
setTimeout(decorate,300);
if(TEST)setTimeout(()=>say(pick(['Willkommen in meinem Ludus. Hier ist jeder einsatzbereit. Ob er will oder nicht. Ob er Beine hat oder nicht.','Neue Regel: Wer atmet, kämpft. Wer nicht atmet, wird ausgestellt.','Der Medicus hat gekündigt. Endlich kann ich alle aufstellen.']),{ms:6500}),1200);
})();
