'use strict';
// =====================================================================================================
// LANISTA-GIER · TESTVERSION (lanista-test.html, Wunsch Thomas 4.11.)
// Baut auf der Aufstellungs-Testversion auf (eigener Kader, abgeschirmter Speicher) und ändert kein Spiel:
//  1. Jeder Lebende darf in den Kampf, egal wie zerschunden. Statt Sperre: Warnzeichen und schwarzhumorige Sprüche des
//     Lanista (ehrlos, gierig, ein großes Arschloch) – beim Aufstellen, bei „Gruppe steht“, bei aussichtslosen Kämpfen.
//  2. Sterben viele (mind. 2 oder 40 % der Gruppe), folgt die Abrechnung im Ludus: Die Überlebenden schleifen die Toten
//     zum Lanista und beschweren sich (wer tot, wer verstümmelt ist), der Lanista beschwert sich übers Gemecker, „korrigiert“
//     ihr Abzählen, tanzt und freut sich über das Gold. Viele Varianten je Schritt.
//  3. Hundereiter: Beinlose werden auf einen Hund aus dem Zwinger gebunden und kämpfen von dessen Rücken. Das Publikum
//     rast, die Börse steigt (×2,5 + 120 je Reiter). Fällt der Reiter oder der Hund, ist der Ritt vorbei.
// Engine-Anschlüsse (wirkungslos ohne Reiter): a.mountLift im Figurenzeichner, a.mountOf bei der Abstoßung in sim.js.
// =====================================================================================================
(()=>{
const M=window.MG,S=M?.s,A=window.Aufstellung,AN=window.AN,UI=window.AufstellungUI,DOG=window.DOG,ART=window.ArenaArt;
if(!M||!UI||!A||!document.body.classList.contains('lanista-page'))return;
const store=window.AUF_STORE||{get:()=>null,set:()=>false},KEY='lanista-gier-v1',root=document.getElementById('auf');
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),fmt=n=>Math.round(n).toLocaleString('de-DE');
const pick=a=>a[Math.floor(Math.random()*a.length)],fill=(t,o)=>t.replace(/\{(\w+)\}/g,(m,k)=>o[k]??m),cl=(v,a,b)=>v<a?a:v>b?b:v;
const first=g=>String(g?.name||'').split(' ')[0];
const G=id=>S.roster.find(g=>g.id===id);
const LAN=()=>S.lanista?.name||'Der Lanista';

// ---------------------------------------------------------------- Zustand (eigener Schlüssel, nur diese Testseite)
let LG={riders:{},dogs:[],seeded:false,scenes:0};
try{const d=JSON.parse(store.get(KEY)||'null');if(d)LG=Object.assign(LG,d);}catch(e){}
function save(){try{LG.dogs=hunde();store.set(KEY,JSON.stringify(LG));}catch(e){}}
const hf=()=>S.hundefang??={stage:'open',day:0,jobs:[],jobDay:0,usedDay:0,dogs:[],tip:0};
const hunde=()=>hf().dogs||[];
if(LG.dogs?.length&&!hunde().length)hf().dogs=LG.dogs;
if(DOG&&!hunde().some(D=>!D.dead)){for(const [b,n] of [['molosser','Fleischwolf'],['wolf','Grauzahn'],['dogge','Rüdiger']]){try{const D=DOG.create(b);D.name=n;hunde().push(D);}catch(e){console.warn(e);}}}
try{for(const D of hunde())DOG?.migrate?.(D);}catch(e){}

// ---------------------------------------------------------------- Verletzungen lesen
const LEGS=['lt','lsh','lf','rt','rsh','rf'],ARMS=['ls','lua','lfa','lh','rs','rua','rfa','rh'];
const legless=g=>!!g&&['lt','rt','lsh','rsh'].some(id=>g.body?.[id]?.missing);
const missingSet=g=>new Set(Object.entries(g?.body||{}).filter(([,p])=>p.missing).map(([id])=>id));
const elig0=M.army.eligibility.bind(M.army);
function warnOf(g){if(!g||g.dead)return [];try{const e=elig0(g);return e.ok?[]:(e.causes||[]).slice();}catch{return [];}}
// Niemand wird mehr gesperrt, der Lebende geht immer: nur noch Hinweise
M.army.eligibility=g=>({ok:!!g&&!g.dead,causes:g?.dead?['tot']:[],warn:warnOf(g),grade:0,health:M.health?.(g)??100,energy:100-(g?.fatigue||0)});
function kind(g){const w=warnOf(g).join(' '),miss=missingSet(g);
 if(legless(g))return 'beine';if(ARMS.some(id=>miss.has(id)))return 'arme';if(/Blutung/.test(w))return 'blut';if(/Knochenbruch/.test(w))return 'bruch';
 if(/innere/.test(w))return 'innen';if(/kampfunfähig|Verletzungsschwere/.test(w))return 'kaputt';if(/Gesundheit/.test(w))return 'kaputt';if(/Erschöpfung/.test(w))return 'muede';if(w)return 'sonst';return '';}

// ---------------------------------------------------------------- Sprüche des Lanista (schwarzer Humor, viele Varianten)
const Q={
 beine:['{N} hat keine Beine mehr? Wunderbar. Dann kann er wenigstens nicht weglaufen.','Beine werden überschätzt. {N} kämpft ab der Hüfte aufwärts, das ist der wichtige Teil.','{N}, du bist jetzt ein Kurzkämpfer. Das Publikum liebt Kurzkämpfer. Ich liebe Kurzkämpfer. Sie essen weniger.','Ohne Beine ist {N} 40 Pfund leichter. Leichter heißt schneller. Rechne nach, das stimmt.','Rollen, robben, beißen – {N}, du hast mehr Möglichkeiten als je zuvor.','{N} hat zwei Beine weniger und null Ausreden mehr.','Ich hab {N} gesagt, er soll sich ein Bein ausreißen. Er hat es wörtlich genommen. Zweimal. Respekt.'],
 arme:['{N} hat nur noch einen Arm? Ein Arm, ein Schwert. Ist doch effizient.','Keine Arme, keine Ausreden: {N} kann immer noch böse gucken und im Weg stehen.','Ach, {N}, der Arm wächst nach. Nein, tut er nicht. Aber das weißt du ja nicht.','{N} kann nicht mehr klatschen. Muss er auch nicht. Klatschen tut das Publikum, wenn er stirbt.'],
 blut:['{N} blutet? Prima, dann sieht er gleich gefährlicher aus. Spart Schminke.','Das Blut kommt sowieso raus, {N}. Dann lieber in der Arena, da zahlt wenigstens einer dafür.','{N} läuft aus wie ein undichtes Weinfass. Und wie beim Wein: Ich will mein Geld zurück, wenn er leer ist.','Ein bisschen Blutverlust macht leicht im Kopf. {N} wird endlich mal mutig.'],
 bruch:['{N} hat was gebrochen? Knochen sind nur ein Vorschlag.','Ein gebrochener Knochen ist ein Knochen mehr. Mathematik, {N}.','{N}, wenn es knackt, ist es nur die Freude.'],
 innen:['Innere Verletzungen? Sieht man nicht. Was man nicht sieht, zählt nicht. Rein mit {N}.','{N} hat Innereien, die woanders sind als vorgesehen. Na und? Hauptsache, sie sind noch drin. Größtenteils.'],
 kaputt:['{N} ist mehr Verband als Mensch. Das Publikum wird denken, das ist ein Kostüm.','Der Medicus sagt, {N} soll liegen. Der Medicus kriegt aber auch keine Prämie.','Halb tot ist auch halb lebendig, {N}. Ich bin ein Optimist.','{N}, du kämpfst nicht für dich. Du kämpfst für meine neue Villa. Die hat übrigens auch Probleme mit dem Dach.','Wenn {N} da draußen umfällt, dann wenigstens mit Würde. Und mit Eintritt.'],
 muede:['{N} ist müde? Schlafen kann er, wenn er tot ist. Das geht heute vielleicht schneller als gedacht.','Erschöpfung ist nur Faulheit mit Schweiß, {N}.'],
 sonst:['{N} sieht nicht gut aus. Ich auch nicht, und ich beschwer mich auch nicht.','Was {N} auch hat: Es ist nicht ansteckend. Glaub ich. Rein.']};
const QREADY=['Na also. Eine Truppe, so frisch wie ein Fisch nach drei Tagen in der Sonne.','Herrlich. Ein Haufen Verwundeter. Das Publikum liebt Außenseiter, und ihr seid quasi schon draußen.','Wer zurückkommt, kriegt Suppe. Wer nicht zurückkommt, spart mir Suppe. Ich gewinne immer.','Ich hab auf euch gewettet. Auf welche Seite, sag ich lieber nicht.','Ihr seht aus wie das, was übrig bleibt, wenn ein Löwe satt ist. Perfekt.','Seid tapfer! Und wenn nicht: Seid wenigstens laut. Lautes Sterben zahlt besser.'];
const QHOPE=['Fünf Totenköpfe? Das sind vier mehr, als ihr braucht, und genau die, die meine Quote braucht.','Aussichtslos ist nur ein anderes Wort für „lukrativ“.','Ich hab mit dem Bestatter einen Mengenrabatt ausgehandelt. Nur so, ganz ohne Hintergedanken.','Wenn ihr gewinnt, bin ich reich. Wenn ihr verliert, bin ich auch reich. Nur ihr nicht. Los!','Hab die Grabsteine schon mal vorbestellt. Mit Lücke für den Namen. Spart Zeit.'];
const QDOG=['{N} auf {H}. Ein Mann, ein Hund, null Beine. Das Publikum wird mich mit Gold bewerfen.','Festbinden! Fester! Wenn {N} runterfällt, ist das kein Unfall, das ist eine Vertragsverletzung.','{H} trägt jetzt {N}. Vorher hat {H} nur Knochen getragen. Na ja, im Grunde trägt er immer noch Knochen.','Reiterei! Ich habe Reiterei! Billigste Kavallerie Roms: ein Krüppel und ein Köter.','Wer braucht Pferde, wenn man {H} hat? Pferde wollen Hafer. {H} frisst die Gefallenen. Kreislauf des Lebens.'];
const QCROWD=['DIE RÄNGE TOBEN! {N} reitet auf {H}!','Das hat Rom noch nicht gesehen: {N} und {H} – halber Mann, ganzer Hund!','Die Menge wirft Münzen! Und Gemüse! Hauptsächlich Münzen!','„HUN-DE-REI-TER! HUN-DE-REI-TER!“','Ein Senator ist vor Lachen vom Sitz gefallen. Der Lanista schickt ihm eine Rechnung.','{H} beißt, {N} sticht von oben. Das ist keine Taktik, das ist Kunst.'];

// ---------------------------------------------------------------- Lanista-Figur und Porträt
let lanG=null;function lanista(){if(lanG)return lanG;try{lanG=M.ludus?.ownerFigure?.(S.lanista);}catch(e){}if(!lanG){const rng=S.rng;lanG=M.makeGladiator(0);S.rng=rng;lanG.name=LAN();}return lanG;}
const porCache=new Map();function por(g){let c=porCache.get(g.id+(g.dead?'d':''));if(!c){c=ART?.portrait?ART.portrait(g):null;porCache.set(g.id+(g.dead?'d':''),c);}return c;}
function paintPor(scope){for(const cv of scope.querySelectorAll('canvas[data-lgpor]')){const g=cv.dataset.lgpor==='lan'?lanista():G(cv.dataset.lgpor);if(!g)continue;const p=por(g),c=cv.getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,cv.width,cv.height);if(p)c.drawImage(p,0,0,80,90,0,0,cv.width,cv.height);}
 for(const cv of scope.querySelectorAll('canvas[data-lgdog]')){const D=hunde().find(x=>x.id===cv.dataset.lgdog);if(!D)continue;const c=cv.getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,cv.width,cv.height);try{DOG.portrait(c,D,{x:cv.width/2,y:cv.height-3,w:cv.width*.8,t:performance.now()/1000,mood:'proud'});}catch(e){}}}

// ---------------------------------------------------------------- Sprechblase des Lanista (unten, wegtippbar)
let sayT=0;function say(text,o={}){let el=document.getElementById('lgSay');if(!el){el=document.createElement('div');el.id='lgSay';el.className='lg-say';document.body.appendChild(el);el.onclick=()=>{el.classList.remove('on');};}
 el.innerHTML=`<canvas width="48" height="54" data-lgpor="lan"></canvas><div><b>${esc(LAN())}</b><span>${esc(text)}</span></div>`;paintPor(el);el.classList.add('on');if(o.warn)el.classList.add('warn');else el.classList.remove('warn');
 clearTimeout(sayT);sayT=setTimeout(()=>el.classList.remove('on'),o.ms||Math.max(4200,text.length*70));try{M.speakLine?.(text,'L',lanista());}catch(e){}}
function quipFor(g){const k=kind(g);return k?fill(pick(Q[k]),{N:first(g)}):'';}

// ---------------------------------------------------------------- Aufstellung schmücken (Warnzeichen, Hundereiter, Zwinger)
let lastIds=null,deco=0;
const mo=new MutationObserver(()=>{if(deco)return;cancelAnimationFrame(deco);deco=requestAnimationFrame(()=>{deco=0;decorate();});});
mo.observe(root,{childList:true,subtree:true});
function decorate(){mo.disconnect();try{
 const st=UI.state;if(!st)return;
 for(const el of root.querySelectorAll('[data-drag]')){const g=G(el.dataset.drag);if(!g||el.dataset.lg)continue;el.dataset.lg='1';const w=warnOf(g);
  if(w.length){el.classList.add('lg-warn');const b=document.createElement('i');b.className='lg-badge';b.textContent=legless(g)?'🦽':'⚠';b.title='Eigentlich nicht einsatzbereit: '+w.join(', ');el.appendChild(b);}
  const D=riderDog(g.id);if(D){const r=document.createElement('i');r.className='lg-dogmark';r.textContent='🐕';r.title='reitet auf '+D.name;el.appendChild(r);}}
 // neu Aufgestellte mit Verletzungen: Spruch
 const ids=new Set(st.lineup.map(x=>x.id));if(lastIds){for(const id of ids)if(!lastIds.has(id)){const g=G(id);const q=g&&quipFor(g);if(q){say(q,{warn:true});break;}}}lastIds=ids;
 // Zwinger-Kasten in der Gruppenansicht
 const grid=root.querySelector('.a-grid');if(grid&&!root.querySelector('.lg-dogs'))grid.closest('section')?.after(dogBox());
 // Abrechnung: Hinweise und ggf. Szene
 const res=root.querySelector('.a-res');if(res&&pending&&!pending.noted){pending.noted=true;afterFight(res);}
 paintPor(root);
}finally{mo.observe(root,{childList:true,subtree:true});}}
function riderDog(id){const did=LG.riders[id];if(!did)return null;const D=hunde().find(x=>x.id===did&&!x.dead);if(!D||!legless(G(id))){delete LG.riders[id];return null;}return D;}
function dogBox(){const st=UI.state,sec=document.createElement('section');sec.className='a-box lg-dogs';
 const cand=S.roster.filter(g=>!g.dead&&legless(g)),dogs=hunde().filter(D=>!D.dead);
 const used=new Set(Object.values(LG.riders));
 sec.innerHTML=`<div class="a-bh"><h2>🐕 Hundereiter · Zwinger</h2><span>${dogs.length} Hunde · ${cand.length} Beinlose</span></div>
 <p class="a-hint">Wer keine Beine mehr hat, wird auf einen Hund gebunden und reitet in die Arena. Das Publikum zahlt das Mehrfache. Der Lanista nennt es „Rehabilitation“.</p>
 ${cand.length?cand.map(g=>{const D=riderDog(g.id),inL=st.lineup.some(x=>x.id===g.id);return `<div class="lg-rider"><canvas width="40" height="45" data-lgpor="${esc(g.id)}"></canvas><div class="lg-rn"><b>${esc(g.name)}</b><small>${D?'reitet auf <b>'+esc(D.name)+'</b>':'zu Fuß … also eigentlich gar nicht'}${inL?' · aufgestellt':''}</small></div>
  <div class="lg-dogpick">${dogs.map(H=>{const on=D&&D.id===H.id,taken=!on&&used.has(H.id);return `<button class="lg-dog${on?' on':''}" data-lgbind="${esc(g.id)}|${esc(H.id)}" ${taken?'disabled title="reitet schon einer"':''}><canvas width="64" height="40" data-lgdog="${esc(H.id)}"></canvas><span>${esc(H.name)}</span><small>${Math.round(DOG.condHealth?.(H)??100)} %</small></button>`;}).join('')||'<span class="a-hint">Keine Hunde im Zwinger.</span>'}
  ${D?`<button class="lg-unbind" data-lgbind="${esc(g.id)}|">lösen</button>`:''}</div></div>`;}).join(''):'<p class="a-hint">Noch keine Beinlosen im Kader. Kommt bestimmt. Spätestens nach dem nächsten Kampf.</p>'}
 <div class="a-acts"><button data-lgact="lazarett" title="Nur Testversion: macht zwei Gesunde beinlos und zwei schwer verletzt">🩸 LAZARETT AUFFÜLLEN (TEST)</button><button data-lgact="dog" title="Nur Testversion">🐕 NEUER HUND (TEST)</button></div>`;
 return sec;}
root.addEventListener('click',e=>{const b=e.target.closest('[data-lgbind],[data-lgact]');if(!b)return;e.stopPropagation();
 if(b.dataset.lgbind){const [gid,did]=b.dataset.lgbind.split('|');const g=G(gid);if(!g)return;
  if(did){for(const [k,v] of Object.entries(LG.riders))if(v===did&&k!==gid)delete LG.riders[k];LG.riders[gid]=did;const D=hunde().find(x=>x.id===did);
   const st=UI.state;if(!st.lineup.some(x=>x.id===gid))st.lineup.push({id:gid,row:'vorne',lane:'mitte'});say(fill(pick(QDOG),{N:first(g),H:D?.name||'den Hund'}));}
  else delete LG.riders[gid];save();refresh();return;}
 if(b.dataset.lgact==='lazarett'){lazarett();refresh();return;}
 if(b.dataset.lgact==='dog'){const br=pick(['molosser','wolf','dogge','tosa','fila','owtscharka']);try{const D=DOG.create(br);D.name=pick(['Beißer','Knochenbrecher','Wurst','Sabber','Caesar','Krümel','Zerberus','Hackfleisch','Waldi']);hunde().push(D);say(pick(['Ein neuer Hund. Billiger als ein Gladiator und hat schon Zähne.','Den hab ich vom Metzger. Er hat gesagt, der beißt. Ich hab gesagt: Perfekt, verkauft.','Gut, gut. Und wenn er stirbt, gibt es Wurst. Ich verschwende nichts.']));}catch(e){console.warn(e);}save();refresh();return;}},true);
function refresh(){try{UI.open();}catch(e){}}
function lazarett(){const fresh=S.roster.filter(g=>!g.dead&&!legless(g)&&!warnOf(g).length).sort(()=>Math.random()-.5);let n=0;
 for(const g of fresh.slice(0,2)){for(const id of LEGS){const p=g.body[id];if(p){p.missing=true;p.hp=0;p.bleed=0;}}n++;}
 for(const g of fresh.slice(2,4)){for(const id of ['chest','belly','la','lua','rt']){const p=g.body[id];if(p){p.hp=Math.min(p.hp,28);p.bleed=Math.max(p.bleed||0,2.5);}}if(g.body.lfa)g.body.lfa.fracture=true;g.blood=Math.min(g.blood??100,52);g.fatigue=Math.max(g.fatigue||0,40);n++;}
 porCache.clear();try{ART.clearFigures?.();}catch(e){}save();try{window.AUF_STORE&&UI.state;}catch(e){}
 say(n?pick(['So. Jetzt sehen sie aus wie echte Veteranen. Kostet weniger als Training.','Der Medicus hat geholfen. Also, beim Gegenteil von Helfen.','Wer nicht verletzt ist, hat nicht gekämpft. Ich hab ein bisschen nachgeholfen.']):'Alle schon kaputt. Gute Arbeit, Leute.');}
// erster Start: Testfälle anlegen
if(!LG.seeded){LG.seeded=true;lazarett();}

// ---------------------------------------------------------------- Warnung vor dem Losschicken
let confirmKey='';
root.addEventListener('click',e=>{const b=e.target.closest('[data-act="ready"],[data-act="fight"]');if(!b)return;const st=UI.state;if(!st)return;
 const L=st.lineup.map(x=>G(x.id)).filter(Boolean),bad=L.filter(g=>warnOf(g).length),key=st.lineup.map(x=>x.id).sort().join(',');
 if(b.dataset.act==='ready'&&bad.length&&confirmKey!==key){e.stopPropagation();e.preventDefault();warnModal(bad,()=>{confirmKey=key;b.click();});return;}
 if(b.dataset.act==='ready'&&bad.length)setTimeout(()=>say(pick(QREADY)),200);
 if(b.dataset.act==='fight'){const o=root.querySelector('.a-offer.a-sel .a-sk')?.textContent||'',sk=(o.match(/☠/g)||[]).length;if(sk>=4)setTimeout(()=>say(pick(QHOPE)),300);snapshot(L,sk);}},true);
function warnModal(bad,go){const ov=document.createElement('div');ov.className='lg-modal';
 ov.innerHTML=`<div class="lg-mbox"><h2>⚠ WARNUNG DES MEDICUS</h2><p class="lg-msub">Diese Kämpfer sind eigentlich nicht einsatzbereit:</p>
 <ul>${bad.map(g=>`<li><canvas width="32" height="36" data-lgpor="${esc(g.id)}"></canvas><div><b>${esc(g.name)}</b><small>${esc(warnOf(g).join(' · '))}</small><em>„${esc(quipFor(g)||pick(Q.sonst).replace('{N}',first(g)))}“</em></div></li>`).join('')}</ul>
 <div class="lg-lan"><canvas width="56" height="63" data-lgpor="lan"></canvas><p><b>${esc(LAN())}:</b> ${esc(pick(['Warnung, Warnung. Der Medicus warnt auch vor Wein, Weibern und Treppen. Rein mit ihnen.','Medizinisch gesehen ist das ein Fehler. Finanziell gesehen ist das ein Geniestreich.','Ich hab die Warnung gelesen. Dann hab ich sie gegessen. Weiter.','Einsatzbereit ist, wer atmet. Und wer nicht atmet, bringt immerhin Mitleidsgold.','Der Medicus kann mich mal. Der kriegt eh nur Gehalt, keine Prämie.']))}</p></div>
 <div class="lg-mrow"><button data-x="no">Lieber nicht (Weichei)</button><button class="lg-go" data-x="go">TROTZDEM REIN DA</button></div></div>`;
 document.body.appendChild(ov);paintPor(ov);ov.onclick=e=>{const x=e.target.closest('[data-x]')?.dataset.x;if(!x)return;ov.remove();if(x==='go')go();else say(pick(['Weichei. Ich zieh dir das vom Lohn ab. Du kriegst keinen Lohn? Dann eben vom Essen.','Na gut. Aber nur, weil ich heute großzügig bin. Morgen nicht mehr.','Schade. Ich hatte schon die Grabinschrift geschrieben.']));};}

// ---------------------------------------------------------------- Kampf: Hunde dazustellen, Reiter mitnehmen, Börse
let pending=null;
function snapshot(L,sk){pending={ids:L.map(g=>g.id),gs:L.slice(),miss:Object.fromEntries(L.map(g=>[g.id,missingSet(g)])),dead:new Set(L.filter(g=>g.dead).map(g=>g.id)),gold:UI.state?.gold||0,sk,riders:0,noted:false};}
const place0=A.place;
A.place=function(b,L){const r=place0.apply(this,arguments);try{mountDogs(b,L);}catch(e){console.error(e);}return r;};
function mountDogs(b,L){b.dogRiders=[];for(const x of L){const D=riderDog(x.id);if(!D)continue;const a=b.actors.find(y=>y.team===0&&y.unitKey===x.id);if(!a)continue;
 let d;try{d=DOG.makeFighter(D,0,a.x,a.y);}catch(e){console.warn(e);continue;}d.id='lgdog-'+D.id+'-'+Math.floor(Math.random()*1e6).toString(36);d.unitKey='hund-'+D.id;d.unit={kind:'dog',key:d.unitKey,D};b.actors.push(d);
 const lift=-Math.round(9*(D.height?Math.min(1.3,Math.max(.7,D.height/70)):1));
 a.mountOf=d.id;d.riderOf=a.id;a.mountLift=lift;b.dogRiders.push({rider:a.id,dog:d.id,D,lift,on:true,since:0,cheer:3});}
 if(b.dogRiders.length)b.hasDogs=true;if(pending)pending.riders=b.dogRiders.length;
 if(b.dogRiders.length){AN.listeners.push(out=>{for(const p of b.dogRiders){const d=b.actors.find(y=>y.id===p.dog);if(!d)continue;try{DOG.writeBack(d,out?.winner===0||out?.won===true);}catch(e){console.warn(e);}}save();});}}
const tracker0=A.tracker;
A.tracker=function(b){const T=tracker0.apply(this,arguments),d0=T.done;T.done=function(out){const r=d0.apply(this,arguments);try{if(r&&b.dogRiders?.length){r.lgBase=r.gold;r.gold=Math.round(r.gold*2.5+120*b.dogRiders.length);r.lgRiders=b.dogRiders.length;if(pending)pending.res=r;}else if(r&&pending)pending.res=r;}catch(e){}return r;};return T;};
// Reiter sitzt fest auf dem Hund: Lage folgt dem Hund, kein Umfallen/Knien solange beide stehen
const step0=M.fixedStep;
M.fixedStep=function(){const r=step0.apply(this,arguments);try{sync(S.battle);}catch(e){console.warn(e);}return r;};
function sync(b){if(!b?.dogRiders?.length)return;for(const p of b.dogRiders){if(!p.on)continue;const a=b.actors.find(y=>y.id===p.rider),d=b.actors.find(y=>y.id===p.dog);if(!a||!d){p.on=false;continue;}
 const off=a.g.dead||a.down||a.surrendered||d.g?.dead||d.down||d.dead;
 if(off){p.on=false;a.mountOf=null;a.mountLift=0;d.riderOf=null;if(!a.g.dead&&!a.down){a.x=d.x+14;a.y=d.y+6;try{M.floaters?.push?.({x:a.x,y:a.y-50,text:'ABGEWORFEN',color:'#e0b46a',t:0,life:1.4});}catch(e){}}banner(b,d.g?.dead||d.down?fill(pick(['{H} ist hin. {N} liegt jetzt da, wo er hingehört: unten.','Der Hund fällt, der Reiter fällt, der Lanista zählt.','Ritt vorbei. Der Lanista ruft: „Den Hund ersetz ich! Den Reiter … mal sehen.“']),{H:p.D.name,N:first(a.g)}):fill(pick(['{N} fällt von {H}! Die Menge stöhnt – und wettet weiter.','{N} ist vom Hund gerutscht. {H} kämpft allein weiter. Treuer als jeder Gladiator.']),{N:first(a.g),H:p.D.name}));continue;}
 a.x=d.x-Math.cos(d.a||0)*2;a.y=d.y+1;a.fallTimer=0;a.kneeTimer=0;a.stagger=Math.min(a.stagger||0,.15);a.dodgeTimer=0;a.jumpTimer=0;a.moveSpeed=0;if(a.state==='crawl'||a.state==='move'||a.state==='retreat'||a.state==='flank')a.state='guard';
 const near=b.actors.some(y=>y.team!==a.team&&!y.down&&!y.g?.dead&&Math.hypot(y.x-a.x,y.y-a.y)<320);if(!near&&!p.seen)continue;p.since+=1/60;p.cheer-=1/60;if(!p.seen){p.seen=true;p.cheer=6;if(!b.lgIntro){b.lgIntro=true;crowd(b,true,p,a);}}else if(p.cheer<=0){p.cheer=6+Math.random()*4;crowd(b,false,p,a);}}}
function crowd(b,first0,p,a){if(S.battle!==b)return;try{M.crowdEvent?.('cheer',{team:0});M.crowdEvent?.('roar',{team:0});}catch(e){}const P=p||b.dogRiders[0];if(!P)return;const r=a||b.actors.find(y=>y.id===P.rider);banner(b,fill(first0?'Ein Hundereiter betritt die Arena! Das Publikum traut seinen Augen nicht!':pick(QCROWD),{N:first(r?.g),H:P.D.name}));}
function banner(b,text){const v=document.getElementById('battleView');if(!v||S.battle!==b)return;let el=document.getElementById('lgBanner');if(!el){el=document.createElement('div');el.id='lgBanner';el.className='lg-banner';v.appendChild(el);}
 el.textContent=text;el.classList.remove('on');void el.offsetWidth;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),3800);}
// Zeichnen: Gurte über dem Hunderücken, solange einer drauf sitzt
const rex0=M.drawRex;
if(rex0)M.drawRex=function(ctx,a){const r=rex0.apply(this,arguments);try{if(a?.riderOf&&a.dog){const sz=a.P?.sz||1,f=Math.cos(a.a||0)>=0?1:-1;ctx.save();ctx.translate(Math.round(a.x),Math.round(a.y));ctx.fillStyle='#5a3b1f';
 const bx=-4*f*sz,by=-23*sz;ctx.fillRect(Math.round(bx-1),Math.round(by),2,Math.round(16*sz));ctx.fillRect(Math.round(bx+5*f-1),Math.round(by+1),2,Math.round(15*sz));ctx.fillStyle='#8a6a3a';ctx.fillRect(Math.round(bx-6),Math.round(by-1),12,2);ctx.fillStyle='#c9a45a';ctx.fillRect(Math.round(bx-1),Math.round(by-1),2,2);ctx.restore();}}catch(e){}return r;};

// ---------------------------------------------------------------- Nach dem Kampf: Hinweise, Abrechnung beim Lanista
function afterFight(res){const p=pending;if(!p)return;const r=p.res;
 const dead=p.gs.filter(g=>g.dead&&!p.dead.has(g.id)),alive=p.gs.filter(g=>!g.dead),maimed=alive.filter(g=>[...missingSet(g)].some(id=>!p.miss[g.id]?.has(id)));
 const gold=Math.max(0,(UI.state?.gold||0)-p.gold);
 const note=document.createElement('div');note.className='lg-note';
 note.innerHTML=`${r?.lgRiders?`<p>🐕 <b>Hundereiter-Zuschlag:</b> ${fmt(r.lgBase||0)} × 2,5 + ${120*r.lgRiders} = <b>${fmt(r.gold)} Gold</b>. Das Publikum hat Tränen gelacht.</p>`:''}
 <p class="lg-q"><canvas width="40" height="45" data-lgpor="lan"></canvas><span><b>${esc(LAN())}:</b> ${esc(dead.length?pick(['Tote kosten nichts mehr. Das ist die günstigste Sorte Gladiator.','Schade um die Ausrüstung. Die war geliehen.','Ich trauere. Siehst du? Das ist mein Trauergesicht. Es sieht aus wie mein Zählgesicht.']):gold>0?pick(['Alle noch da? Dann war der Kampf zu leicht. Nächstes Mal mehr Totenköpfe.','Gold UND keine Toten. Ich bin fast enttäuscht.']):pick(['Kein Gold? Dann zahlt ihr eben mit Schweiß. Und Blut. Hauptsächlich Blut.']))}</span></p>`;
 res.appendChild(note);
 if(dead.length>=2||(p.gs.length>=2&&dead.length/p.gs.length>=.4)){const btn=document.createElement('button');btn.className='lg-scenebtn';btn.textContent='⚰ DIE ÜBERLEBENDEN WOLLEN DEN LANISTA SPRECHEN';btn.onclick=()=>scene({dead,alive,maimed,gold,miss:p.miss,sk:p.sk});note.appendChild(btn);
  setTimeout(()=>scene({dead,alive,maimed,gold,miss:p.miss,sk:p.sk}),1600);}
 pending=null;paintPor(note);}

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
 if(lost.length)return 'hat kein '+PART(lost[0])+' mehr';return 'ist verstümmelt';}
const nameList=gs=>{const n=gs.map(first);return n.length<=1?n.join(''):n.slice(0,-1).join(', ')+' und '+n[n.length-1];};
function script(d){const D=d.dead,Al=d.alive,s1=Al[0],s2=Al[1]||Al[0],n=D.length,gold=fmt(d.gold),list=nameList(D);const L=[];const T=(who,text,o)=>L.push({who,text,...(o||{})});
 if(!Al.length){
  T('L',pick(['Keiner mehr da, der sich beschweren könnte. Das ist der schönste Tag meines Lebens.','Alle tot. Endlich Ruhe im Ludus. Kein Gejammer, kein Essen, kein Lohn.','{X}… alle weg. Wisst ihr, was das heißt? Das heißt: Alles Gold für mich.']).replace('{X}',list));
  T('L',pick(['Der Bestatter fragt, wer zahlt. Ich hab gesagt: die Toten. Mit ihren Zähnen. Die Goldzähne zuerst.','Ich lass ein Denkmal bauen. Klein. Sehr klein. Eigentlich nur einen Stein. Den nehm ich vom Weg.']));
  T('L',`${gold} Gold! ${pick(['Und niemand, mit dem ich teilen muss!','Und keiner, der „Lohn“ sagt!','Und das Beste: Tote wollen keine Rente!'])}`,{dance:true});
  T('L',pick(['Morgen kauf ich neue. Frische. Mit Beinen. Vorerst.','Nächstes Mal nehm ich doppelt so viele mit. Doppelt so viel Gold. Rechnen kann ich.']));return L;}
 T('L',pick(['Ah, meine Helden! Und … weniger Helden als heute Morgen.','Was schleppt ihr da an? Wenn das Beute ist: Die Hälfte gehört mir. Wenn es Leichen sind: Die gehören ganz euch.','Kommt näher. Nein, nicht so nah. Ihr tropft.','Da seid ihr ja! Und ihr habt Gäste mitgebracht. Liegende Gäste.','Oh. Eine Prozession. Ich hab keinen Wein dabei. Für euch jedenfalls nicht.']));
 T('S',pick([`${list} ${n===1?'ist':'sind'} tot! TOT! Und du hast gesagt, das wird ein Spaziergang!`,`Wir haben ${list} hergeschleift. Die ganze Strecke. ${n} Mann, Lanista. ${n}!`,`Sieh sie dir an! ${list}! Kalt wie dein Herz!`,`${list}. ${n===1?'Er hatte':'Sie hatten'} Familie. Na ja, ${n===1?'er hatte':'sie hatten'} uns.`]),{g:s1});
 for(const g of d.maimed.slice(0,3)){const other=Al.find(x=>x!==g),lt=lossText(g,d.miss[g.id]);
  if(other&&Math.random()<.6)T('S',pick([`Und ${first(g)} ${lt}!`,`${first(g)} ${lt}! Wer bezahlt das?`,`Schau dir ${first(g)} an! Er ${lt}!`]),{g:other});
  else{const me=lt.replace(/^hat /,'');T('S',pick([`Und ich? Ich habe ${me}!`,`Ich hab ${me}! Wo soll ich jetzt meinen Schild hinhängen?`,`Sieh mich an! Ich hab ${me}! Und du redest von Prämien!`]),{g});}}
 if(Al.length>1)T('S2',pick(['Fünf Totenköpfe! FÜNF! Wer schickt Leute in einen Kampf mit fünf Totenköpfen?','Wir hatten nicht mal genug Arme für die Schilde!','Der Medicus hat gesagt, wir sollen liegen bleiben!','Ich will meinen Vertrag sehen! … Ich hab keinen Vertrag, oder?','Wir wollen mehr Suppe. Und weniger Tod.']).replace('Fünf Totenköpfe! FÜNF!',d.sk>=4?'Fünf Totenköpfe! FÜNF!':'Ein leichter Kampf, hast du gesagt!').replace('Wer schickt Leute in einen Kampf mit fünf Totenköpfen?',d.sk>=4?'Wer schickt Leute in einen Kampf mit fünf Totenköpfen?':'Leicht für wen? Für die Würmer?'),{g:s2});
 T('L',pick(['Gemecker, Gemecker, Gemecker. Wisst ihr, wer sich nie beschwert? '+list+'. Nehmt euch ein Beispiel.','Ruhe! Ihr jammert wie Senatoren bei der Steuer.','Ich höre immer nur „tot“ hier und „Bein ab“ da. Wo bleibt das Positive?','Beschwerden bitte schriftlich. Mit der rechten Hand. Wer noch eine hat.','Noch ein Wort und ich zieh euch die Leichen vom Lohn ab. Pro Pfund.']));
 const nA=Al.length;T('L',pick([`Moment, Moment. Zählen wir mal richtig ab. Ihr seid ${nA}. Und ihr LEBT. Das sind ${nA} Leben, die ich euch großzügig gelassen habe.`,`Ihr sagt, ${n} sind tot. Ich sage: ${nA} sind NICHT tot. Halb leer, halb voll. Ich bin ein Halb-voll-Mensch.`,`Falsch gezählt! Nicht ${n} tot – ${nA} lebendig! Siehst du? Klingt gleich viel netter.`,`Ihr zählt die Toten. Ich zähle die Münzen. Rate, wer von uns glücklicher ist.`]));
 if(d.maimed.length)T('L',pick([`Und ${first(d.maimed[0])}: Weniger Körper, weniger Ziel. Das ist Rüstung, die man nicht kaufen muss.`,`${first(d.maimed[0])}, dir fehlt was? Mir fehlt auch was: Verständnis.`,`${first(d.maimed[0])} kann jetzt auf einem Hund reiten. Siehst du? Neue Berufschancen!`]));
 T('L',`Und jetzt das Wichtigste: ${gold} Gold! ${pick(['GOLD! GOLD! GOLD!','Hört ihr das Klimpern? Das ist das Geräusch von Gerechtigkeit!','Wer braucht schon Arme, wenn man GOLD hat!','Seht ihr, so klingt Trauer bei mir: KLING KLING!'])}`,{dance:true});
 T('S',pick(['Er tanzt. Er tanzt wirklich auf ihren Gräbern.','Ich hasse diesen Mann.','Ich glaube, ich wechsle zu den Löwen. Die fressen einen wenigstens ehrlich.','Kann man sich selbst verkaufen? Ich frag für einen Freund. Für mich.']),{g:s1});
 T('L',pick(['Begrabt sie hinter dem Stall. Tief genug, dass es nicht stinkt. Aber nicht zu tief, die Hunde müssen ja auch was essen.','Waffen abgeben, Rüstung abgeben, Zähne aus Gold abgeben. Den Rest dürft ihr behalten.','Morgen wieder Kampf! Wer fehlt, hat einen guten Grund. Nämlich tot.','Abtreten! Und tretet vorsichtig. Manche von euch haben nicht mehr viel zum Treten.','Ich bin gerührt. Nein, das ist Sodbrennen. Abtreten.']));
 return L;}
let SC=null;
function scene(d){if(SC)return;const lines=script(d);const W=400,H=225,ov=document.createElement('div');ov.className='lg-scene';
 ov.innerHTML=`<div class="lg-stage"><canvas id="lgCv" width="${W*2}" height="${H*2}"></canvas><div class="lg-title"><small>${esc(S.schoolName||'Ludus')}</small><b>DIE ABRECHNUNG</b></div><button class="lg-skip">Überspringen ⏭</button></div><div class="lg-box"><canvas width="56" height="63" data-lgpor=""></canvas><div><b class="lg-who"></b><p class="lg-text"></p><small class="lg-tap">antippen ▸</small></div></div>`;
 document.body.appendChild(ov);document.body.classList.add('lg-scene-on');LG.scenes++;save();
 const bg=(()=>{try{return M.ludus.background();}catch{return null;}})();
 const VX=345,VY=440;// Ausschnitt der Kulisse (Hof vor dem Haus des Lanista)
 const lan={g:lanista(),x:690,y:628,a:Math.PI,state:'idle',phase:0,energy:100,ammo:0,moveSpeed:0,lanista:true,id:'lg-lan'};
 const Al=d.alive.slice(0,5),Dd=d.dead.slice(0,8);
 const walkers=Al.map((g,i)=>{const D=riderDog(g.id),w={g,x:300-i*64,y:606+(i%3)*16,tx:600-i*46,ty:604+(i%3)*18,a:0,state:legless(g)&&!D?'crawl':'move',phase:Math.random()*6,energy:60,ammo:0,moveSpeed:0,id:'lg-s'+i,hurt:true};
  if(D&&DOG?.draw){w.mountLift=-9;w.dogAct={dog:D,P:DOG.params(D),id:'lg-dog'+i,g:{dead:false,name:D.name},mode:'stand',clock:0,duration:1,cyc:Math.random(),moveSpeed:0,wounds:(DOG.cond(D).wounds||[]).map(x=>({...x,t:-1e9})),gore:{},bleed:{},mouthBlood:.15,energy:100,hit:0,z:0,spray:[],x:0,face:1,depth:0,act:'stand'};}return w;});
 const corpses=Dd.map((g,i)=>{const w=walkers.length?walkers[i%walkers.length]:null;const row=Math.floor(i/Math.max(1,walkers.length));return {g,x:w?w.x-46-row*34:470+i*34,y:w?w.y+8+row*6:636+(i%2)*10,a:0,state:'dead',down:true,death:true,phase:0,energy:0,ammo:0,moveSpeed:0,id:'lg-d'+i,draggedBy:w?.id||null,drag:w,off:-46-row*34,dy:8+row*6}});
 SC={ov,lines,i:-1,t:0,last:performance.now(),dance:0,coins:[],pile:0,gold:d.gold,goldShown:0,lan,walkers,corpses,arrived:false,typing:null,done:false};
 const cv=ov.querySelector('#lgCv'),cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;
 const box=ov.querySelector('.lg-box'),txt=ov.querySelector('.lg-text'),who=ov.querySelector('.lg-who'),pcv=box.querySelector('canvas');
 function next(){if(!SC)return;if(SC.typing&&SC.shown<SC.full.length){SC.shown=SC.full.length;txt.textContent=SC.full;return;}
  SC.i++;if(SC.i>=SC.lines.length){end();return;}const l=SC.lines[SC.i],g=l.who==='L'?lan.g:l.g||walkers[0]?.g;
  who.textContent=l.who==='L'?LAN():g?.name||'';pcv.dataset.lgpor=l.who==='L'?'lan':g?.id||'';paintPor(box);box.classList.toggle('lan',l.who==='L');
  SC.full=l.text;SC.shown=0;SC.typing=true;txt.textContent='';SC.speaker=l.who==='L'?lan:walkers.find(w=>w.g===g)||walkers[0];
  if(l.dance){SC.dance=5.5;lan.state='celebrate';for(const c of SC.corpses){c.draggedBy=null;}}
  try{M.speakLine?.(l.text,l.who==='L'?'L':'N',g);}catch(e){}
  clearTimeout(SC.auto);SC.auto=setTimeout(()=>{if(SC&&SC.i===SC.lines.indexOf(l))next();},Math.max(3800,l.text.length*75)+(l.dance?3200:0));}
 function end(){if(!SC)return;cancelAnimationFrame(SC.raf);clearTimeout(SC.auto);ov.classList.add('out');setTimeout(()=>{ov.remove();document.body.classList.remove('lg-scene-on');},500);SC=null;
  say(pick(['Schönes Gespräch. Das sollten wir öfter machen. Am besten nach jedem Kampf.','Ich glaube, sie mögen mich. Tief im Innern. Ganz tief. Unter den Narben.','Personalführung ist eine Kunst. Und ich bin Künstler.']));}
 ov.querySelector('.lg-skip').onclick=e=>{e.stopPropagation();end();};box.onclick=()=>next();cv.onclick=()=>next();
 function frame(t){if(!SC)return;const dt=Math.min(.05,(t-SC.last)/1000);SC.last=t;SC.t+=dt;
  // Einzug: die Überlebenden schleifen die Toten heran
  let moving=false;for(const w of walkers){const dx=w.tx-w.x,dy=w.ty-w.y,dd=Math.hypot(dx,dy),sp=w.state==='crawl'?22:34;if(dd>3){moving=true;const px=w.x,py=w.y,ph=w.phase;w.x+=dx/dd*sp*dt;w.y+=dy/dd*sp*dt;w.moveSpeed=w.dogAct?0:sp;w.phase+=dt*sp*.16;w.a=0;if(w.dogAct){w.dogAct.moveSpeed=sp*1.6;w.dogAct.mode='stalk';w.state='guard';}else try{M.updateLocomotion?.(w,px,py,ph,dt,.6);}catch(e){}}else{w.moveSpeed=0;if(w.dogAct){w.dogAct.moveSpeed=0;w.dogAct.mode=SC.dance>0?'threat':'stand';}if(w.state==='move')w.state='idle';w.a=0;}}
  for(const c of corpses)if(c.draggedBy&&c.drag){c.x=c.drag.x+c.off;c.y=c.drag.y+c.dy;}
  if(!moving&&!SC.arrived){SC.arrived=true;setTimeout(()=>{if(SC&&SC.i<0)next();},500);}
  if(!walkers.length&&!SC.arrived){SC.arrived=true;setTimeout(()=>{if(SC&&SC.i<0)next();},900);}
  // Tippen der Zeile
  if(SC.typing&&SC.shown<SC.full.length){SC.shown=Math.min(SC.full.length,SC.shown+dt*48);txt.textContent=SC.full.slice(0,Math.floor(SC.shown));}
  // Tanz des Lanista: Hüpfen, Drehen, Goldregen
  if(SC.dance>0){SC.dance-=dt;lan.a=Math.floor(SC.t*3)%2?0:Math.PI;lan.state='celebrate';lan.phase+=dt*9;if(Math.random()<dt*40)SC.coins.push({x:VX+Math.random()*W,y:VY-10,vy:40+Math.random()*60,vx:(Math.random()-.5)*20,r:Math.random()*6,s:Math.random()<.2?3:2});SC.goldShown=Math.min(SC.gold,SC.goldShown+SC.gold*dt/2.5);if(SC.dance<=0){lan.state='idle';lan.a=Math.PI;}}
  for(const c of SC.coins){c.vy+=160*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.r+=dt*8;if(c.y>lan.y+8&&!c.land){c.land=true;c.vy=0;c.vx=0;c.y=lan.y+4+Math.random()*10;c.x=cl(c.x,lan.x-60,lan.x+60);}}
  if(SC.coins.length>420)SC.coins.splice(0,SC.coins.length-420);
  draw(cx,cv,bg,VX,VY,W,H);SC.raf=requestAnimationFrame(frame);}
 SC.raf=requestAnimationFrame(frame);}
function draw(cx,cv,bg,VX,VY,W,H){const k=cv.width/W;cx.setTransform(1,0,0,1,0,0);cx.fillStyle='#120c09';cx.fillRect(0,0,cv.width,cv.height);
 cx.setTransform(k,0,0,k,-VX*k,-VY*k);if(bg)cx.drawImage(bg,0,0);
 // Abendlicht
 cx.fillStyle='rgba(60,20,10,.18)';cx.fillRect(VX,VY,W,H);
 const lan=SC.lan,hop=SC.dance>0?Math.abs(Math.sin(SC.t*7))*9:0;
 // liegende Münzen (Haufen) unter allen Figuren
 for(const c of SC.coins)if(c.land)coin(cx,c);
 const list=[...SC.corpses,...SC.walkers,{...lan,y:lan.y-hop,shadowY:lan.y}].sort((a,b)=>a.y-b.y);
 for(const w of SC.walkers)if(w.dogAct){try{DOG.draw(cx,w.dogAct,Math.round(w.x),Math.round(w.y),.6,1,{time:SC.t,key:w.dogAct.id});}catch(e){}}
 try{M.renderLudusActors(cx,list);}catch(e){console.warn(e);}
 for(const c of SC.coins)if(!c.land)coin(cx,c);
 // Sprecher-Marke
 const sp=SC.speaker;if(sp&&SC.typing){const y=sp.y-(sp===lan?78+hop:62)+Math.sin(SC.t*6)*2;cx.fillStyle='#f1d48a';cx.fillRect(sp.x-3,y,7,2);cx.fillRect(sp.x-2,y+2,5,2);cx.fillRect(sp.x-1,y+4,3,2);}
 // Goldzähler
 if(SC.goldShown>0){cx.setTransform(1,0,0,1,0,0);const s=Math.round(cv.width/22);cx.font=`bold ${s}px monospace`;cx.textAlign='center';const txt='+'+fmt(SC.goldShown)+' GOLD';cx.fillStyle='#3a2208';cx.fillText(txt,cv.width/2+3,s*1.6+3);cx.fillStyle=SC.dance>0&&Math.floor(SC.t*8)%2?'#fff3b0':'#f1c64a';cx.fillText(txt,cv.width/2,s*1.6);}
 // Vignette
 cx.setTransform(1,0,0,1,0,0);const gr=cx.createRadialGradient(cv.width/2,cv.height/2,cv.height*.3,cv.width/2,cv.height/2,cv.width*.62);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.55)');cx.fillStyle=gr;cx.fillRect(0,0,cv.width,cv.height);}
function coin(cx,c){const w=Math.max(1,Math.round(Math.abs(Math.cos(c.r))*c.s*1.2+1));cx.fillStyle='#8a5a12';cx.fillRect(Math.round(c.x-w/2),Math.round(c.y),w+1,c.s+1);cx.fillStyle='#f1c64a';cx.fillRect(Math.round(c.x-w/2),Math.round(c.y-1),w,c.s);cx.fillStyle='#fff1a8';cx.fillRect(Math.round(c.x-w/2),Math.round(c.y-1),1,1);}

// Test-Hilfe: Szene direkt aufrufen (Konsole): LanistaGier.demo()
window.LanistaGier={state:LG,scene,say,demo(){const gs=S.roster.filter(g=>!g.dead).sort((x,y)=>(riderDog(y.id)?1:0)-(riderDog(x.id)?1:0));const alive=gs.slice(0,3),dead=gs.slice(3,6).map(g=>({...g,dead:true,id:g.id+'-demo'}));scene({dead,alive,maimed:alive.filter(legless),gold:4321,miss:{},sk:5});}};
setTimeout(()=>{decorate();say(pick(['Willkommen in meinem Ludus. Hier ist jeder einsatzbereit. Ob er will oder nicht. Ob er Beine hat oder nicht.','Neue Regel: Wer atmet, kämpft. Wer nicht atmet, wird ausgestellt.','Der Medicus hat gekündigt. Endlich kann ich alle aufstellen.']),{ms:6500});},1200);
})();
