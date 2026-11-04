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
function snapshot(L,sk){pending={gs:L.slice(),miss:Object.fromEntries(L.map(g=>[g.id,missingSet(g)])),dead:new Set(L.filter(g=>g.dead).map(g=>g.id)),gold:GOLD(),sk,noted:false};}
function afterFight(res){const p=pending;pending=null;if(!p)return;
 const dead=p.gs.filter(g=>g.dead&&!p.dead.has(g.id)),alive=p.gs.filter(g=>!g.dead),maimed=alive.filter(g=>[...missingSet(g)].some(id=>!p.miss[g.id]?.has(id)));
 const gold=Math.max(0,GOLD()-p.gold),many=dead.length>=2||(p.gs.length>=2&&dead.length/p.gs.length>=.4);
 const note=document.createElement('div');note.className='lg-note';
 note.innerHTML=`<p class="lg-q"><canvas width="40" height="45" data-lgpor="lan"></canvas><span><b>${esc(LAN())}:</b> ${esc(dead.length?pick(['Tote kosten nichts mehr. Das ist die günstigste Sorte Gladiator.','Schade um die Ausrüstung. Die war geliehen.','Ich trauere. Siehst du? Das ist mein Trauergesicht. Es sieht aus wie mein Zählgesicht.','Ein Platz frei im Schlafsaal. Endlich wieder Luft.']):maimed.length?pick(['Ein paar Teile weniger, aber alle noch da. Fast alle. Die wichtigen.','Verstümmelt ist das neue Vollständig.']):gold>0?pick(['Alle noch da? Dann war der Kampf zu leicht. Nächstes Mal mehr Totenköpfe.','Gold UND keine Toten. Ich bin fast enttäuscht.']):pick(['Kein Gold? Dann zahlt ihr eben mit Schweiß. Und Blut. Hauptsächlich Blut.']))}</span></p>`;
 res.appendChild(note);
 if(many){const d={dead,alive,maimed,gold,miss:p.miss,sk:p.sk},btn=document.createElement('button');btn.className='lg-scenebtn';btn.textContent='⚰ DIE ÜBERLEBENDEN WOLLEN DEN LANISTA SPRECHEN';btn.onclick=()=>scene(d);note.appendChild(btn);setTimeout(()=>scene(d),1600);}
 paintPor(note);}

// =====================================================================================================
// DIE ABRECHNUNG: Szene im Ludus (Kulisse, Figuren und Gangarten des Spiels)
// =====================================================================================================
const PART=id=>{try{return M.partName(id);}catch{return id;}};
function lossText(g,miss0){const now=missingSet(g),lost=[...now].filter(id=>!miss0?.has(id)),all=[...now];
 const legs=all.filter(id=>LEGS.includes(id)),arms=all.filter(id=>ARMS.includes(id));
 if(g.body?.head?.missing)return 'hat keinen Kopf mehr';
 if(lost.some(id=>LEGS.includes(id))&&legs.length>=4)return 'hat keine Beine mehr';
 if(lost.some(id=>['lt','lsh','lf'].includes(id)))return 'hat kein linkes Bein mehr';if(lost.some(id=>['rt','rsh','rf'].includes(id)))return 'hat kein rechtes Bein mehr';
 if(lost.some(id=>['ls','lua','lfa','lh'].includes(id)))return arms.length>=6?'hat keine Arme mehr':'hat keinen linken Arm mehr';if(lost.some(id=>['rs','rua','rfa','rh'].includes(id)))return arms.length>=6?'hat keine Arme mehr':'hat keinen rechten Arm mehr';
 if(lost.length)return 'hat kein '+PART(lost[0])+' mehr';if(legs.length>=4)return 'hat keine Beine mehr';return 'ist verstümmelt';}
const nameList=gs=>{const n=gs.map(first);return n.length<=1?n.join(''):n.slice(0,-1).join(', ')+' und '+n[n.length-1];};
function script(d){const D=d.dead,Al=d.alive,s1=Al[0],s2=Al[1]||Al[0],n=D.length,gold=fmt(d.gold),list=nameList(D);const L=[];const T=(who,text,o)=>L.push({who,text,...(o||{})});
 if(!Al.length){
  T('L',pick(['Keiner mehr da, der sich beschweren könnte. Das ist der schönste Tag meines Lebens.','Alle tot. Endlich Ruhe im Ludus. Kein Gejammer, kein Essen, kein Lohn.',list+' … alle weg. Wisst ihr, was das heißt? Das heißt: Alles Gold für mich.']));
  T('L',pick(['Der Bestatter fragt, wer zahlt. Ich hab gesagt: die Toten. Mit ihren Zähnen. Die Goldzähne zuerst.','Ich lass ein Denkmal bauen. Klein. Sehr klein. Eigentlich nur einen Stein. Den nehm ich vom Weg.']));
  T('L',`${gold} Gold! ${pick(['Und niemand, mit dem ich teilen muss!','Und keiner, der „Lohn“ sagt!','Und das Beste: Tote wollen keine Rente!'])}`,{dance:true});
  T('L',pick(['Morgen kauf ich neue. Frische. Mit Beinen. Vorerst.','Nächstes Mal nehm ich doppelt so viele mit. Doppelt so viel Gold. Rechnen kann ich.']));return L;}
 T('L',pick(['Ah, meine Helden! Und … weniger Helden als heute Morgen.','Was schleppt ihr da an? Wenn das Beute ist: Die Hälfte gehört mir. Wenn es Leichen sind: Die gehören ganz euch.','Kommt näher. Nein, nicht so nah. Ihr tropft.','Da seid ihr ja! Und ihr habt Gäste mitgebracht. Liegende Gäste.','Oh. Eine Prozession. Ich hab keinen Wein dabei. Für euch jedenfalls nicht.']));
 T('S',pick([`${list} ${n===1?'ist':'sind'} tot! TOT! Und du hast gesagt, das wird ein Spaziergang!`,`Wir haben ${list} hergeschleift. Die ganze Strecke. ${n} Mann, Lanista. ${n}!`,`Sieh sie dir an! ${list}! Kalt wie dein Herz!`,`${list}. ${n===1?'Er hatte':'Sie hatten'} Familie. Na ja, ${n===1?'er hatte':'sie hatten'} uns.`]),{g:s1});
 for(const g of d.maimed.slice(0,3)){const other=Al.find(x=>x!==g),lt=lossText(g,d.miss[g.id]);
  if(other&&Math.random()<.6)T('S',pick([`Und ${first(g)} ${lt}!`,`${first(g)} ${lt}! Wer bezahlt das?`,`Schau dir ${first(g)} an! Er ${lt}!`]),{g:other});
  else{const me=lt.replace(/^hat /,'');T('S',lt.startsWith('hat ')?pick([`Und ich? Ich habe ${me}!`,`Ich hab ${me}! Wo soll ich jetzt meinen Schild hinhängen?`,`Sieh mich an! Ich hab ${me}! Und du redest von Prämien!`]):'Sieh mich an! Ich bin verstümmelt!',{g});}}
 if(Al.length>1)T('S',d.sk>=4?pick(['Fünf Totenköpfe! FÜNF! Wer schickt Leute in einen Kampf mit fünf Totenköpfen?','Aussichtslos, hast du gesagt. Und dann: „Rein da!“']):pick(['Ein leichter Kampf, hast du gesagt! Leicht für wen? Für die Würmer?','Wir hatten nicht mal genug Arme für die Schilde!','Der Medicus hat gesagt, wir sollen liegen bleiben!','Ich will meinen Vertrag sehen! … Ich hab keinen Vertrag, oder?','Wir wollen mehr Suppe. Und weniger Tod.']),{g:s2});
 T('L',pick(['Gemecker, Gemecker, Gemecker. Wisst ihr, wer sich nie beschwert? '+list+'. Nehmt euch ein Beispiel.','Ruhe! Ihr jammert wie Senatoren bei der Steuer.','Ich höre immer nur „tot“ hier und „Bein ab“ da. Wo bleibt das Positive?','Beschwerden bitte schriftlich. Mit der rechten Hand. Wer noch eine hat.','Noch ein Wort und ich zieh euch die Leichen vom Lohn ab. Pro Pfund.']));
 const nA=Al.length;T('L',pick([`Moment, Moment. Zählen wir mal richtig ab. Ihr seid ${nA}. Und ihr LEBT. Das sind ${nA} Leben, die ich euch großzügig gelassen habe.`,`Ihr sagt, ${n} sind tot. Ich sage: ${nA} sind NICHT tot. Halb leer, halb voll. Ich bin ein Halb-voll-Mensch.`,`Falsch gezählt! Nicht ${n} tot – ${nA} lebendig! Siehst du? Klingt gleich viel netter.`,'Ihr zählt die Toten. Ich zähle die Münzen. Rate, wer von uns glücklicher ist.']));
 if(d.maimed.length)T('L',pick([`Und ${first(d.maimed[0])}: Weniger Körper, weniger Ziel. Das ist Rüstung, die man nicht kaufen muss.`,`${first(d.maimed[0])}, dir fehlt was? Mir fehlt auch was: Verständnis.`,`${first(d.maimed[0])}, sieh es positiv: Du brauchst jetzt weniger Rüstung. Die verkauf ich.`]));
 T('L',`Und jetzt das Wichtigste: ${gold} Gold! ${pick(['GOLD! GOLD! GOLD!','Hört ihr das Klimpern? Das ist das Geräusch von Gerechtigkeit!','Wer braucht schon Arme, wenn man GOLD hat!','Seht ihr, so klingt Trauer bei mir: KLING KLING!'])}`,{dance:true});
 T('S',pick(['Er tanzt. Er tanzt wirklich auf ihren Gräbern.','Ich hasse diesen Mann.','Ich glaube, ich wechsle zu den Löwen. Die fressen einen wenigstens ehrlich.','Kann man sich selbst verkaufen? Ich frag für einen Freund. Für mich.']),{g:s1});
 T('L',pick(['Begrabt sie hinter dem Stall. Tief genug, dass es nicht stinkt. Aber nicht zu tief, ich will die Rüstungen noch abholen.','Waffen abgeben, Rüstung abgeben, Zähne aus Gold abgeben. Den Rest dürft ihr behalten.','Morgen wieder Kampf! Wer fehlt, hat einen guten Grund. Nämlich tot.','Abtreten! Und tretet vorsichtig. Manche von euch haben nicht mehr viel zum Treten.','Ich bin gerührt. Nein, das ist Sodbrennen. Abtreten.']));
 return L;}
function scene(d){if(SC)return;const lines=script(d);const W=400,H=225,ov=document.createElement('div');ov.className='lg-scene';
 ov.innerHTML=`<div class="lg-stage"><canvas id="lgCv" width="${W*2}" height="${H*2}"></canvas><div class="lg-title"><small>${esc(S.schoolName||'Ludus')}</small><b>DIE ABRECHNUNG</b></div><button class="lg-skip">Überspringen ⏭</button></div><div class="lg-box"><canvas width="56" height="63" data-lgpor=""></canvas><div><b class="lg-who"></b><p class="lg-text"></p><small class="lg-tap">antippen ▸</small></div></div>`;
 document.body.appendChild(ov);document.body.classList.add('lg-scene-on');LG.scenes++;save();
 const bg=(()=>{try{return M.ludus.background();}catch{return null;}})();
 const VX=345,VY=440;// Ausschnitt der Kulisse (Hof vor dem Haus des Lanista)
 const lan={g:lanista(),x:690,y:628,a:Math.PI,state:'idle',phase:0,energy:100,ammo:0,moveSpeed:0,lanista:true,id:'lg-lan'};
 const Al=d.alive.slice(0,5),Dd=d.dead.slice(0,8);
 const walkers=Al.map((g,i)=>({g,x:300-i*64,y:606+(i%3)*16,tx:600-i*46,ty:604+(i%3)*18,a:0,state:legless(g)?'crawl':'move',phase:Math.random()*6,energy:60,ammo:0,moveSpeed:0,id:'lg-s'+i,hurt:true}));
 const corpses=Dd.map((g,i)=>{const w=walkers.length?walkers[i%walkers.length]:null,row=Math.floor(i/Math.max(1,walkers.length));return {g,x:w?w.x-46-row*34:470+i*34,y:w?w.y+8+row*6:636+(i%2)*10,a:0,state:'dead',down:true,death:true,phase:0,energy:0,ammo:0,moveSpeed:0,id:'lg-d'+i,draggedBy:w?.id||null,drag:w,off:-46-row*34,dy:8+row*6};});
 SC={ov,lines,i:-1,t:0,last:performance.now(),dance:0,coins:[],gold:d.gold,goldShown:0,lan,walkers,corpses,arrived:false,typing:false,extra:new Map([...d.alive,...d.dead].map(g=>[g.id,g]))};
 const cv=ov.querySelector('#lgCv'),cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;
 const box=ov.querySelector('.lg-box'),txt=ov.querySelector('.lg-text'),who=ov.querySelector('.lg-who'),pcv=box.querySelector('canvas');
 function next(){if(!SC)return;if(SC.typing&&SC.shown<SC.full.length){SC.shown=SC.full.length;txt.textContent=SC.full;return;}
  SC.i++;if(SC.i>=SC.lines.length){end();return;}const l=SC.lines[SC.i],g=l.who==='L'?lan.g:l.g||walkers[0]?.g;
  who.textContent=l.who==='L'?LAN():g?.name||'';pcv.dataset.lgpor=l.who==='L'?'lan':g?.id||'';paintPor(box);box.classList.toggle('lan',l.who==='L');
  SC.full=l.text;SC.shown=0;SC.typing=true;txt.textContent='';SC.speaker=l.who==='L'?lan:walkers.find(w=>w.g===g)||walkers[0];
  if(l.dance){SC.dance=5.5;lan.state='celebrate';for(const c of SC.corpses)c.draggedBy=null;}
  try{M.speakLine?.(l.text,l.who==='L'?'L':'N',g);}catch(e){}
  const idx=SC.i;clearTimeout(SC.auto);SC.auto=setTimeout(()=>{if(SC&&SC.i===idx)next();},Math.max(3800,l.text.length*75)+(l.dance?3200:0));}
 function end(){if(!SC)return;cancelAnimationFrame(SC.raf);clearTimeout(SC.auto);ov.classList.add('out');setTimeout(()=>{ov.remove();document.body.classList.remove('lg-scene-on');},500);SC=null;
  say(pick(['Schönes Gespräch. Das sollten wir öfter machen. Am besten nach jedem Kampf.','Ich glaube, sie mögen mich. Tief im Innern. Ganz tief. Unter den Narben.','Personalführung ist eine Kunst. Und ich bin Künstler.']));}
 ov.querySelector('.lg-skip').onclick=e=>{e.stopPropagation();end();};box.onclick=()=>next();cv.onclick=()=>next();
 function frame(t){if(!SC)return;const dt=Math.min(.05,(t-SC.last)/1000);SC.last=t;SC.t+=dt;
  let moving=false;for(const w of walkers){const dx=w.tx-w.x,dy=w.ty-w.y,dd=Math.hypot(dx,dy),sp=w.state==='crawl'?22:34;if(dd>3){moving=true;const px=w.x,py=w.y,ph=w.phase;w.x+=dx/dd*sp*dt;w.y+=dy/dd*sp*dt;w.moveSpeed=sp;w.phase+=dt*sp*.16;w.a=0;try{M.updateLocomotion?.(w,px,py,ph,dt,.6);}catch(e){}}else{w.moveSpeed=0;if(w.state==='move')w.state='idle';w.a=0;}}
  for(const c of corpses)if(c.draggedBy&&c.drag){c.x=c.drag.x+c.off;c.y=c.drag.y+c.dy;}
  if(!moving&&!SC.arrived){SC.arrived=true;setTimeout(()=>{if(SC&&SC.i<0)next();},walkers.length?500:900);}
  if(SC.typing&&SC.shown<SC.full.length){SC.shown=Math.min(SC.full.length,SC.shown+dt*48);txt.textContent=SC.full.slice(0,Math.floor(SC.shown));}
  if(SC.dance>0){SC.dance-=dt;lan.a=Math.floor(SC.t*3)%2?0:Math.PI;lan.state='celebrate';lan.phase+=dt*9;if(Math.random()<dt*40)SC.coins.push({x:VX+Math.random()*W,y:VY-10,vy:40+Math.random()*60,vx:(Math.random()-.5)*20,r:Math.random()*6,s:Math.random()<.2?3:2});SC.goldShown=Math.min(SC.gold,SC.goldShown+SC.gold*dt/2.5);if(SC.dance<=0){lan.state='idle';lan.a=Math.PI;}}
  for(const c of SC.coins){c.vy+=160*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.r+=dt*8;if(c.y>lan.y+8&&!c.land){c.land=true;c.vy=0;c.vx=0;c.y=lan.y+4+Math.random()*10;c.x=cl(c.x,lan.x-60,lan.x+60);}}
  if(SC.coins.length>420)SC.coins.splice(0,SC.coins.length-420);
  draw(cx,cv,bg,VX,VY,W,H);SC.raf=requestAnimationFrame(frame);}
 SC.raf=requestAnimationFrame(frame);}
function draw(cx,cv,bg,VX,VY,W,H){const k=cv.width/W;cx.setTransform(1,0,0,1,0,0);cx.fillStyle='#120c09';cx.fillRect(0,0,cv.width,cv.height);
 cx.setTransform(k,0,0,k,-VX*k,-VY*k);if(bg)cx.drawImage(bg,0,0);
 cx.fillStyle='rgba(60,20,10,.18)';cx.fillRect(VX,VY,W,H);
 const lan=SC.lan,hop=SC.dance>0?Math.abs(Math.sin(SC.t*7))*9:0;
 for(const c of SC.coins)if(c.land)coin(cx,c);
 const list=[...SC.corpses,...SC.walkers,{...lan,y:lan.y-hop}].sort((a,b)=>a.y-b.y);
 try{M.renderLudusActors(cx,list);}catch(e){console.warn(e);}
 for(const c of SC.coins)if(!c.land)coin(cx,c);
 const sp=SC.speaker;if(sp&&SC.typing){const y=sp.y-(sp===lan?78+hop:62)+Math.sin(SC.t*6)*2;cx.fillStyle='#f1d48a';cx.fillRect(sp.x-3,y,7,2);cx.fillRect(sp.x-2,y+2,5,2);cx.fillRect(sp.x-1,y+4,3,2);}
 if(SC.goldShown>0){cx.setTransform(1,0,0,1,0,0);const s=Math.round(cv.width/22);cx.font=`bold ${s}px monospace`;cx.textAlign='center';const t='+'+fmt(SC.goldShown)+' GOLD';cx.fillStyle='#3a2208';cx.fillText(t,cv.width/2+3,s*1.6+3);cx.fillStyle=SC.dance>0&&Math.floor(SC.t*8)%2?'#fff3b0':'#f1c64a';cx.fillText(t,cv.width/2,s*1.6);}
 cx.setTransform(1,0,0,1,0,0);const gr=cx.createRadialGradient(cv.width/2,cv.height/2,cv.height*.3,cv.width/2,cv.height/2,cv.width*.62);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.55)');cx.fillStyle=gr;cx.fillRect(0,0,cv.width,cv.height);}
function coin(cx,c){const w=Math.max(1,Math.round(Math.abs(Math.cos(c.r))*c.s*1.2+1));cx.fillStyle='#8a5a12';cx.fillRect(Math.round(c.x-w/2),Math.round(c.y),w+1,c.s+1);cx.fillStyle='#f1c64a';cx.fillRect(Math.round(c.x-w/2),Math.round(c.y-1),w,c.s);cx.fillStyle='#fff1a8';cx.fillRect(Math.round(c.x-w/2),Math.round(c.y-1),1,1);}
function demo(){const gs=S.roster.filter(g=>!g.dead);const alive=gs.slice(0,3),dead=gs.slice(3,6).map(g=>({...g,dead:true,id:g.id+'-demo'}));scene({dead,alive,maimed:alive.filter(legless),gold:4321,miss:{},sk:5});}
window.LanistaGier={scene,say,demo};
setTimeout(decorate,300);
if(TEST)setTimeout(()=>say(pick(['Willkommen in meinem Ludus. Hier ist jeder einsatzbereit. Ob er will oder nicht. Ob er Beine hat oder nicht.','Neue Regel: Wer atmet, kämpft. Wer nicht atmet, wird ausgestellt.','Der Medicus hat gekündigt. Endlich kann ich alle aufstellen.']),{ms:6500}),1200);
})();
