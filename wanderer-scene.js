'use strict';
// =====================================================================================================
// HERUMTREIBER ALS SZENE: Großaufnahme vor dem Tor, alle (1–5) nebeneinander, jeder sagt etwas (Antippen = weiter),
// danach unten die Antworten. Das Fenster lässt sich nicht wegklicken: Es endet erst mit der Entscheidung
// (Kampf → Aufstellung, sonst ziehen sie ab). Texte und Ausgang kommen unverändert aus wanderer-talk.js / wanderers.js
// (Aktionen wanderer:say:<Ton>, wanderer:fight, wanderer:leave). Keine neuen Speicherwerte.
// =====================================================================================================
(()=>{
const M=window.MG;if(!M)return;const S=M.s,$=id=>document.getElementById(id),ART=window.ArenaArt;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Begleitsprüche der übrigen Herumtreiber (nach Persönlichkeit des Anführers), damit jeder etwas sagt
const SIDE={
 freundlich:['Er meint das ernst. Wir sind wirklich nur durstig.','Hübsche Mauern habt ihr. Fast wie ein Zuhause.','Ich hab gehört, hier gibt es Suppe. Stimmt das?'],
 arrogant:['Ich hab schon bessere Schulen angezündet.','Riecht hier immer so nach Angst?','Sind das deine Gladiatoren oder deine Vogelscheuchen?'],
 aggressiv:['Lass uns einfach anfangen. Mir juckt die Faust.','Ich zähl bis drei. Ich kann nur bis zwei.','Wer zuerst blutet, zahlt das Bier.'],
 grossmaul:['Ich hab mal einen Bären besiegt. Einen kleinen. Einen schlafenden.','In meinem Dorf nennen sie mich den Schlächter. Ich war Metzger.','Hört nicht auf ihn. Hört auf mich. Ich bin lauter.'],
 feige:['Wir können auch einfach wieder gehen. Ich wäre dafür.','Ist das da hinten ein Löwe? Bitte sag, dass das kein Löwe ist.','Ich halte mich hinten. Taktisch.'],
 ehrenhaft:['Ein fairer Kampf oder ein ehrlicher Abschied. Beides ist gut.','Wir kämpfen nur mit denen, die stehen können.','Ehre ist das Einzige, was man uns nicht stehlen kann. Wir haben es versucht.'],
 hinterlistig:['Keine Sorge. Wir haben nichts im Ärmel. Fast nichts.','Schönes Tor. Wäre schade, wenn ihm etwas zustößt.','Ich lächle immer so. Das heißt nichts.'],
 veteran:['Ich war bei Alesia. Oder in einer Taverne, die so hieß.','Früher hatten die Rekruten noch Angst vor uns. Jetzt haben sie Angst vor Arbeit.','Hicks. Wo war ich? Ach ja. Kämpfen.'],
 soeldner:['Gold oder Blut. Uns ist beides recht.','Für fünf Denare mehr kämpfe ich auch für euch.','Ich hab keinen Namen. Nur einen Preis.'],
 raeuber:['Nettes Gold habt ihr da. Würde mir auch stehen.','Wir sind keine Räuber. Wir sind Umverteiler.','Hände da, wo ich sie sehen kann. Meine Hände sind woanders.'],
 irre:['Die Hühner flüstern mir Dinge zu.','Ich hab heute Morgen mit einem Stein gesprochen. Er war meiner Meinung.','Hihihi. Blut ist warm. Hihihi.']};
let view=null,tries=0;
function group(){const g=M.wanderers?.state?.()?.group;return g&&!g.fightId?g:null;}
function busy(){return S.battle||window.ArenaUI?.isOpen?.()||M.lesson?.film||document.querySelector('.mg-dawn,.medic-night,.medic-film,.lesson-film,.lion-film,.smith-ceremony,.lesson-start,.medic-start,.hs-market,.hs-present,.hs-village,.lesson-end,.medic-end');}
function linesFor(g){const T=M.wandererTalk,out=[];if(!T)return out;const pers=g.leader?.personality||'grossmaul',side=SIDE[pers]||SIDE.grossmaul;
 out.push({who:0,text:T.opener(g)});(g.members||[]).forEach((m,i)=>{if(i===0)return;out.push({who:i,text:side[(i+(g.id?.length||0))%side.length]});});return out;}
function open(){const g=group();if(!g||view)return;const T=M.wandererTalk;const v=document.createElement('div');v.className='ws-scene';v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');
 v.innerHTML=`<div class="ws-box"><header><p class="eyebrow">VOR DEM TOR · TAG ${S.day}</p><h2>${g.size===1?'Ein Herumtreiber':g.size+' Herumtreiber'}</h2></header>
 <div class="ws-stage"><canvas width="660" height="380" class="px"></canvas><div class="ws-bubble"><b></b><span></span><small>Antippen ▸</small></div></div>
 <div class="ws-info"></div><div class="ws-bottom"></div></div>`;
 document.body.appendChild(v);document.body.classList.add('ws-open');
 const figs=(g.members||[]).map(m=>{try{return ART.figure(m,false);}catch{return null;}});
 view={v,g,figs,lines:linesFor(g),i:0,phase:g.talk?'answer':'intro',t0:performance.now()};
 v.querySelector('.ws-stage').addEventListener('click',e=>{e.stopPropagation();advance();});
 // Klicks außerhalb tun nichts (nicht wegklickbar); Antworten laufen über data-action an das Spiel
 v.addEventListener('click',e=>{if(!e.target.closest('[data-action]'))e.stopPropagation();});
 info();show();}
function info(){const {g,v}=view;let mine=0,theirs=0;try{theirs=(g.members||[]).reduce((n,x)=>n+M.power(x),0);mine=S.roster.filter(x=>M.army.ready(x,true)).sort((a,b)=>M.power(b)-M.power(a)).slice(0,g.size).reduce((n,x)=>n+M.power(x),0);}catch{}
 v.querySelector('.ws-info').innerHTML=`<div class="ws-chips">${(g.members||[]).map((x,i)=>`<span><b>${esc(x.name)}</b>${i?'':' · Anführer'}<small>${esc(x.role||'')} · KW ${M.power(x)} · ${esc(M.itemName(M.gear(x,'weapon')||M.gear(x,'secondary')))}</small></span>`).join('')}</div><p class="ws-kw">Kampfwert der Gruppe <b>${theirs}</b> · deine stärksten ${g.size}: <b>${mine}</b></p>`;}
function show(){const V=view;if(!V)return;const T=M.wandererTalk,g=V.g,bub=V.v.querySelector('.ws-bubble'),bot=V.v.querySelector('.ws-bottom');bub.querySelector('small').hidden=V.phase!=='intro';
 if(V.phase==='intro'){const L=V.lines[V.i];if(!L){V.phase='choose';return show();}V.speaker=L.who;bub.hidden=false;bub.querySelector('b').textContent=g.members[L.who]?.name||'Herumtreiber';pop(bub).textContent='„'+L.text+'“';bub.style.setProperty('--x',xOf(L.who)+'%');bot.innerHTML=`<p class="ws-hint">${V.i+1} / ${V.lines.length} · Antippen für weiter</p>`;return;}
 if(V.phase==='choose'){V.speaker=0;bub.hidden=false;bub.querySelector('b').textContent=g.leader?.name||'';pop(bub).textContent='„'+T.opener(g)+'“';bub.style.setProperty('--x',xOf(0)+'%');
  bot.innerHTML=`<p class="eyebrow">DEINE ANTWORT</p><div class="ws-answers">${T.options(g).map(o=>`<button class="btn${o.tone==='schmied'?' ws-smith':''}" data-action="wanderer:say:${o.tone}">${o.tone==='schmied'?'<small class="ws-smith-tag">⚒ BESONDERE ANTWORT</small>':''}„${esc(o.text)}“</button>`).join('')}</div>`;return;}
 // Antwort gegeben: Erwiderung des Anführers und Entscheidung
 // Schmied-Antwort: Die Gruppe zieht nicht ab, sondern marschiert zur Schmiede; der Knopf startet die Szene (smith-wrath.js, Aktion wrath:go).
 if(g.talk?.tone==='schmied'&&M.smithWrath){V.speaker=0;bub.hidden=false;bub.querySelector('b').textContent=g.leader?.name||'';pop(bub).textContent='„'+T.answer(g,'schmied',g.talk.outcome)+'“';bub.style.setProperty('--x',xOf(0)+'%');
  bot.innerHTML=`<p class="ws-own"><b>Du:</b> „${esc(T.options(g).find(o=>o.tone==='schmied')?.text||'')}“</p><p class="ws-verdict wrath">${g.talk.outcome==='WRATH'?'Die Gruppe marschiert zur Schmiede.':'Panik vor dem Tor.'}</p><button class="btn primary ws-smith" data-action="wrath:go">▶ ${g.talk.outcome==='WRATH'?'ZUR SCHMIEDE':'ANSEHEN'}</button>`;return;}
 const short=(M.wanderers?.fit?.()||[]).length<g.size,fight=g.talk?.outcome==='FIGHT'&&!short,mine=T.options(g).find(o=>o.tone===g.talk?.tone)?.text||'';V.speaker=0;bub.hidden=false;bub.querySelector('b').textContent=g.leader?.name||'';pop(bub).textContent='„'+T.answer(g,g.talk.tone,g.talk.outcome)+'“';bub.style.setProperty('--x',xOf(0)+'%');
 bot.innerHTML=`<p class="ws-own"><b>Du:</b> „${esc(mine)}“</p>${fight?`<p class="ws-verdict fight">Es kommt zum Kampf · ${g.size} gegen ${g.size} im Hinterhof.</p><button class="btn primary" data-action="wanderer:fight">⚔ ZUR AUFSTELLUNG</button>`:`<p class="ws-verdict calm">${g.talk?.outcome==='FIGHT'?'Sie wollen kämpfen, aber du hast nicht genug kampffähige Männer. Sie lachen dich aus und ziehen ab.':'Kein Kampf · die Gruppe zieht ab.'}</p><button class="btn primary" data-action="wanderer:leave">WEITER</button>`}`;}
function pop(bub){const sp=bub.querySelector('span');sp.style.animation='none';void sp.offsetWidth;sp.style.animation='';return sp;}
function advance(){const V=view;if(!V||V.phase!=='intro')return;V.i++;show();}
function xOf(i){const n=view.g.members.length,step=Math.min(100/(n+.4),26);return 50-step*(n-1)/2+i*step;}
function close(){view?.v.remove();view=null;document.body.classList.remove('ws-open');}
// Gespräch über die Aktionen des Spiels; danach aktualisieren oder schließen
const base=M.schoolClick;M.schoolClick=function(a){const r=base?.apply(this,arguments);if(typeof a==='string'&&a.startsWith('wanderer:')&&view){const g=group();if(!g||a==='wanderer:fight'||a==='wanderer:leave'&&!M.wanderers.forced?.())close();else{view.g=g;view.phase='answer';show();}}return r;};
// Bild: Tor bei Abendlicht, Herumtreiber nebeneinander in Halbnahe, der Sprecher tritt vor, die anderen im Schatten
function paint(now){requestAnimationFrame(paint);
 if(!view){if(++tries%30===0&&group()){if(M.wanderers?.tutorialActive?.()){try{M.wanderers.decline();}catch{}return;}if(M.ui.getPage?.()==='home'&&!busy()&&!M.wanderers?.state?.()?.group?.fightId)open();}return;}
 if(!group()){close();return;}
 const V=view,c=V.v.querySelector('canvas'),g=c.getContext('2d'),W=660,H=380,t=(now-V.t0)/1000;g.imageSmoothingEnabled=false;
 const bg=window.HS?.art?.facade?.();if(bg){g.drawImage(bg,330,330,240,138,0,0,W,H);}else{g.fillStyle='#3a332a';g.fillRect(0,0,W,H);}
 g.fillStyle='rgba(30,16,8,.35)';g.fillRect(0,0,W,H);const sky=g.createLinearGradient(0,0,0,H);sky.addColorStop(0,'rgba(240,150,70,.18)');sky.addColorStop(1,'rgba(0,0,0,.35)');g.fillStyle=sky;g.fillRect(0,0,W,H);
 const n=V.g.members.length,K=n<=2?2.3:n===3?2:n===4?1.7:1.5,feet=H+(n<=3?30:12);
 // erst die Zuhörer (abgedunkelt), dann der Sprecher davor
 const order=V.g.members.map((m,i)=>i).sort((a,b)=>(a===V.speaker)-(b===V.speaker));
 for(const i of order){const f=V.figs[i];if(!f)continue;const cx=xOf(i)/100*W,sp=i===V.speaker,k=K*(sp?1.06:1),bob=Math.sin(t*2+i*1.3)*2+(sp?Math.abs(Math.sin(t*7))*-3:0),fw=240*k,fh=300*k;
  g.save();if(!sp)g.filter='brightness(.5) saturate(.7)';g.drawImage(f,0,0,240,300,Math.round(cx-fw/2),Math.round(feet-293*k+bob+(sp?-6:0)),Math.round(fw),Math.round(fh));g.restore();}
 const vg=g.createRadialGradient(W/2,H*.55,H*.3,W/2,H*.55,H*.9);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.55)');g.fillStyle=vg;g.fillRect(0,0,W,H);}
requestAnimationFrame(paint);
// Herumtreiber dürfen nicht hängen bleiben: Ist ihr Kampf vorbei (oder abgebrochen), ohne dass das Spiel ihn abgerechnet hat,
// wird er nachträglich abgerechnet, sonst käme nie wieder eine Gruppe. Ebenso ein unsinnig weit entfernter nächster Besuch.
setInterval(()=>{try{const st=S.wanderers;if(!st)return;const g=st.group;
 if(g?.fightId&&(!S.battle||S.battle.id!==g.fightId)){const rep=(S.records||[]).find(r=>r.id===g.fightId);M.wanderers?.settle?.(rep||{id:g.fightId,draw:true});if(S.wanderers.group===g)S.wanderers.group=null;S.wanderers.next=Math.min(S.wanderers.next||1e9,S.day+1);M.persist?.();}
 if(!st.group&&(typeof st.next!=='number'||!isFinite(st.next)||st.next>S.day+12))st.next=S.day+2;}catch{}},3000);
M.wandererScene={open,close,get view(){return view;}};
window.WANDERER_SCENE_READY=true;
})();
