'use strict';
// =====================================================================================================
// SPRECHSTIMMEN IM SPIEL: Wer in Filmen, Gesprächen oder als Arena-Moderator etwas sagt, liest den Text mit seiner
// 16-Bit-Stimme vor (sprechsound.js, gerechnet in sprech-worker.js). Immer nur eine Stimme zugleich; eine neue Zeile
// löst die alte ab. Großaufnahmen (face-shots.js und eigene Köpfe wie Rabies) holen sich über M.talkMouth die
// Mundöffnung der Person, die gerade spricht. Folgt dem Geräusche-Schalter. Keine Spielregeln.
// =====================================================================================================
(()=>{
const M=window.MG;if(!M)return;
let cur=null,seq=0,worker=null,workerOk=true;const wait=new Map();
function getWorker(){if(!workerOk)return null;if(worker)return worker;try{worker=new Worker('sprech-worker.js?v='+(window.ARENA_BUILD||''));worker.onmessage=e=>{const w=wait.get(e.data.id);if(!w)return;wait.delete(e.data.id);w(e.data);};worker.onerror=()=>{workerOk=false;worker=null;for(const [,w] of wait)w({error:'worker'});wait.clear();};}catch{workerOk=false;worker=null;}return worker;}
function renderAsync(text,voice){return new Promise(res=>{const W=getWorker(),id=++seq;if(W){wait.set(id,res);W.postMessage({id,text,voice});setTimeout(()=>{if(wait.has(id)){wait.delete(id);res(local());}},2500);}else res(local());
 function local(){try{const R=window.Sprech.render(text,voice);return {data:R.data,dur:R.dur,mouth:R.mouth};}catch(e){return {error:String(e)};}}});}
// Welche Stimme? Bekannte Figuren haben eigene, alle anderen eine allgemeine, die zu Stimmlage (Erfahrung), Größe und Geschlecht passt.
const SPEECH_TEMPO=.8;
const smithNameNow=()=>String(M.workshop?.state?.master?.name||M.s?.forgeWorkshop?.master?.name||'').toLowerCase();
function voiceKey(who,g,name){const n=String(name||g?.name||'').toLowerCase(),w=String(who||'').toLowerCase(),sm=smithNameNow();
 if(sm&&n&&(n===sm||n.includes(sm)))return 'schmied';
 if(w==='rabies'||/rabies|hundsgraf/.test(n))return 'rabies';
 if(['s','sm','smith','schmied'].includes(w)||/schmied/.test(n)||/smith/.test(g?.id||''))return 'schmied';
 if(['o','oro','orontes','bowyer'].includes(w)||/orontes|pfeilkopf/.test(n)||g?.id==='bowyer')return 'orontes';
 if(['k','kra','krassus'].includes(w)||/krassus|knochenzins/.test(n))return 'krassus';
 if(['m','mod','moderator'].includes(w)||/moderator/.test(n))return 'moderator';
 if(['d','doc','medicus'].includes(w)||/medicus|medikus|doktor|dr\.|arzt|hirnhammer/.test(n))return 'medicus';
 if(['cap','erzaehler','narrator'].includes(w))return 'erzaehler';
 if(w==='n'||g?.sex==='female'||/schwester|händlerin|frau\b/.test(n))return 'frau';
 return 'rekrut';}
function voiceFor(key,g,o={}){const S=window.Sprech;let v={...S.get(key)};delete v.look;if(key==='rabies')v.echo=0;/* Thomas: kein Echo bei Rabies */if(o.speedUp)v.speed=(v.speed||1)*o.speedUp;/* Bericht 27.10.: zu schnell, kaum zu verstehen – alle Stimmen im Spiel etwas langsamer */v.speed=(v.speed||1)*SPEECH_TEMPO;
 if(key==='rekrut'&&g){const tier=M.voicePitch?.(g)??1;v.pitch=Math.round(118*tier);v.size=Math.max(.88,Math.min(1.16,(g.height||180)/180));v.rough=Math.min(.6,.1+((g.scars||[]).length>0?.15:0)+(tier<.9?.12:0));}
 if(key==='frau'&&g){v.size=Math.max(.8,Math.min(.95,(g.height||168)/185));}
 return v;}
const clean=t=>String(t||'').replace(/<[^>]*>/g,' ').replace(/\{[^}]*\}/g,'').replace(/\s+/g,' ').trim().slice(0,320);
// Eine Zeile sprechen. who: Kürzel/Name der Figur, g: ihr Gladiator-Objekt (für Mundbewegung in Großaufnahmen)
// o.soft: Sprechblase auf dem Spielfeld – spricht nur, wenn gerade kein Gespräch läuft, und etwas leiser
const norm=t=>clean(t).replace(/[„“"»«]/g,'').toLowerCase();let lastKey='',lastT=-1e9;
// Ladebildschirm (Schmied): nichts sprechen; wichtige Zeilen (nicht „soft“) werden aufgehoben und nach dem Laden der Reihe nach gesprochen
const deferred=[];let deferT=0;
function deferLine(args){deferred.push(args);if(deferred.length>4)deferred.shift();if(deferT)return;deferT=setInterval(()=>{if(M.sceneLoader?.active)return;if(speechHold())return;const a=deferred.shift();if(a)speakLine(...a);if(!deferred.length){clearInterval(deferT);deferT=0;}},250);}
// Plünderungen/Außenwelt (Wunsch Thomas 26.10.): Dort geht KEINE Zeile verloren und keine schneidet eine andere ab.
// Kommt eine Zeile, während jemand spricht, wartet sie in der Reihe (pend) und wird danach ganz gesprochen – egal ob
// Sprechblase, Fernrohr, Erzähler, Flehen oder Antwort. speechHold() meldet „spricht“, solange noch etwas wartet.
const pend=[];let qProg=0;
// Sprech-Protokoll (nur intern, für die Konsole: MG.speechLog()). Die frühere Anzeige über ?sprechtest verdeckte Menü/Zurück und ist entfernt.
const dl=[];
function dlog(k,t){dl.push((performance.now()/1000).toFixed(1)+' '+k+' '+String(t||'').slice(0,40));if(dl.length>30)dl.shift();}
const missionOn=()=>!!M.s?.battle?.mission;
const playing=()=>!!cur&&(cur.start===Infinity?performance.now()-cur.t0<9000:cur.ctx.currentTime<cur.start+cur.dur);
function pump(){setTimeout(()=>{if(!pend.length||(cur&&playing()))return;if(!missionOn()||!M.audioEngine?.voiceOut?.()){pend.length=0;return;}const n=pend.shift();if(!speakLine(n.text,n.who,n.g,{...n.o,_q:true}))pump();},90);}
function speakLine(text,who,g,o={}){const txt=clean(text);if(!txt||!/[a-zäöüß]/i.test(txt)||!window.Sprech)return null;if(M.sceneLoader?.active){dlog('LADER-WARTET',txt);if(!o.soft)deferLine([text,who,g,o]);return null;}if(o.soft&&fieldPaused())return null;
 const nk=norm(txt),now=performance.now();if(nk===lastKey&&now-lastT<9000){if(g&&cur&&!cur.g)cur.g=g;return cur;}
 const out=M.audioEngine?.voiceOut?.();if(!out){dlog('KEIN-TON',txt);return null;}
 if(missionOn()&&!o.soft){o={...o,keep:true};
  if(!o._q&&(pend.length||(cur&&!cur.soft&&playing()))){if(o.drop)return null;const same=pend.find(p=>p.nk===nk)||(cur&&norm(cur.text)===nk&&cur);if(same)return same;const p={nk,text:txt,who,g,o,t:now,pending:true};pend.push(p);if(pend.length>14)pend.shift();dlog('reihe',txt);return p;}}
 if(!o.keep&&cur&&cur.keep&&(cur.start===Infinity?now-cur.t0<9000:cur.ctx.currentTime<cur.start+cur.dur)){dlog('verworfen',txt);return null;}
 if(o.soft&&cur&&!cur.soft&&(cur.start===Infinity||cur.ctx.currentTime<cur.start+cur.dur))return null;stopCur();
 lastKey=nk;lastT=now;qProg=now;const key=o.voice||voiceKey(who,g,o.name);g=g||faceFor(key,o.name||(typeof who==='string'?who:''));const voice=voiceFor(key,g,o),me={id:++seq,key,who,g,name:o.name||g?.name||'',text:txt,soft:!!o.soft,keep:!!o.keep,t0:performance.now(),start:Infinity,dur:0,mouth:null,src:null};cur=me;
 dlog('rechne',txt);renderAsync(txt,voice).then(R=>{if(cur!==me){dlog('ersetzt',txt);return;}if(R.error||!R.data){dlog('FEHLER '+R.error,txt);cur=null;pump();return;}const o2=M.audioEngine?.voiceOut?.();if(!o2){dlog('KEIN-TON2',txt);cur=null;pump();return;}const {ctx,bus}=o2;
  const b=ctx.createBuffer(1,R.data.length,window.Sprech.SR);b.getChannelData(0).set(R.data);const s=ctx.createBufferSource(),gn=ctx.createGain();s.buffer=b;gn.gain.value=o.vol??(o.soft?.75:1.05);s.connect(gn);gn.connect(bus);
  const at=ctx.currentTime+.02;s.start(at);dlog('SPIELT '+R.dur.toFixed(1)+'s '+ctx.state,txt);M.audioEngine?.duck?.(o.soft?.65:.32);s.onended=()=>{s.disconnect();gn.disconnect();if(me.soft)fieldNext=Math.max(fieldNext,performance.now()+10000);if(cur===me){cur=null;M.audioEngine?.duck?.(1);pump();}};me.src=s;me.start=at;me.dur=R.dur;me.mouth=R.mouth;me.ctx=ctx;});
 return me;}
function stopCur(){if(cur)dlog('abgebrochen',cur.text);if(cur?.src){try{cur.src.stop();}catch{}}cur=null;M.audioEngine?.duck?.(1);}
// Antippen/Überspringen: nur die laufende Zeile beenden, die wartenden kommen danach
function stop(){stopCur();pump();}
// Seite gewechselt, Fenster geöffnet, Mission vorbei: alles verwerfen
function stopAll(){pend.length=0;stopCur();}
// Mundöffnung (0–1) für eine Figur, wenn sie gerade spricht: g (Objekt oder id) oder Stimmen-/Figurenkürzel
function talkMouth(x){if(!cur?.mouth||!x)return 0;const same=x===cur.g||(x.id&&cur.g&&x.id===cur.g.id)||(typeof x==='string'&&(x===cur.key||x===cur.who||(x.length>3&&String(cur.name).toLowerCase().includes(x.toLowerCase()))));if(!same)return 0;const t=cur.ctx.currentTime-cur.start;if(t<0||t>cur.dur)return 0;return window.Sprech.mouthAt(cur.mouth,t);}
const speaking=x=>!!cur&&(!x||talkMouth(x)>0||x===cur.key||x===cur.who||x===cur.g)&&(cur.start===Infinity||cur.ctx.currentTime<cur.start+cur.dur);
// Zeilenwechsel erkennen (für Szenen, die Text jedes Bild neu zeichnen): spricht nur, wenn sich die Zeile ändert
const lastBy=new Map();
function speakOnChange(channel,text,who,g,o){const key=clean(text);if(lastBy.get(channel)===key)return;lastBy.set(channel,key);if(key)speakLine(text,who,g,o);}
// ---------- Vorleser: alle Untertitel, Sprechblasen und Zitate, die im Spiel neu erscheinen ----------
// Alle 250 ms werden die bekannten Textstellen geprüft. Ein Text wird gesprochen, sobald er sichtbar ist und sich eine Prüfung
// lang nicht mehr ändert (Schreibmaschinen-Texte also erst, wenn sie fertig getippt sind). „Name: „Text““ und <b>Name</b> Text
// sprechen mit der Stimme der Figur, alles andere ist Erzähltext (Erzähler, in Filmen etwas zügiger als im Intro).
const WATCH=[
 ['#introText','cap',{}],
 ['#smithIntroText,#hallFilmText,#medicText,#dokText,#lionText,#archerPlotText,#smithWrathText,#plotTalkText,#owText,#medicNightSub,#hfCap,#hfSayText,#hfTalkText','cap',{speedUp:1.3}],
 ['.scene-bubble,.hf-bubble,.ws-bubble,.ow-talk,.wanderer-line,.medic-quip,.dok-line,.tr-reveal .tr-quote,.hs-bubble',null,{}],
 ['#modSay,.hs-mi-say','moderator',{}],
 ['#hsSay','frau',{name:'Hühnerhändlerin'}],
 ['.smith-plea','schmied',{}],['#closeText','cap',{speedUp:1.2}],['#owAutoText','cap',{speedUp:1.2,drop:true}],['.bow-quip','orontes',{name:'Orontes Pfeilkopf'}],['.hf-board q,.hf-cart q:not(.hf-narr)','rabies',{name:'Rabies'}],['.hf-narr','cap',{speedUp:1.2}],['.hall-title','cap',{speedUp:1.2}],['.threat',null,{soft:true}]];
const seen=new WeakMap();
const visible=el=>{if(!el.isConnected||el.closest('[hidden],.hf-hide,.out'))return false;const r=el.getClientRects();if(!r.length||!r[0].width)return false;const cs=getComputedStyle(el);return cs.visibility!=='hidden'&&cs.display!=='none'&&+cs.opacity>.15;};
function parse(el,def){const raw=clean(el.textContent);if(!raw)return null;const b=el.querySelector('b,small,strong');let name='',text=raw;
 if(b&&raw.startsWith(clean(b.textContent))&&clean(b.textContent).length<60&&(def!=='cap'||/[:·]\s*$/.test(clean(b.textContent))||/^[^:]{2,60}:/.test(raw.slice(clean(b.textContent).length-1)))){name=clean(b.textContent).replace(/[:·].*$/,'').replace(/:$/,'').trim();text=raw.slice(clean(b.textContent).length).replace(/^[:\s]+/,'');}
 const m=/^([^:„“]{2,40}):\s*„(.+)“\s*$/.exec(text);if(m){name=name||m[1].trim();text=m[2];}
 text=text.replace(/^„|“$/g,'').replace(/[▼▸›]/g,'').trim();
 if(def==='cap'&&name)return {text,who:null,name};return {text,who:def,name};}
function poll(){if(!window.Sprech||!M.audioEngine?.voiceOut?.())return;
 for(const [sel,def,opt] of WATCH)for(const el of document.querySelectorAll(sel)){const raw=el.textContent;let st=seen.get(el);if(!st){st={};seen.set(el,st);}
  if(raw!==st.txt){st.txt=raw;continue;}if(st.spoken===raw||!visible(el))continue;st.spoken=raw;const P=parse(el,def);if(!P||!/[a-zäöüß]{2}/i.test(P.text))continue;
  const g=P.name?(M.s?.roster||[]).find(x=>x.name===P.name||String(x.name).split(' ')[0]===P.name):null;
  const nm=opt.nameFrom?clean(document.querySelector(opt.nameFrom)?.textContent||''):'';const g2=g||(nm?(M.s?.roster||[]).find(x=>x.name===nm||String(x.name).split(' ')[0]===nm):null);
  speakLine(P.text,P.who,g2||null,{...opt,name:opt.name||nm||P.name});}}
setInterval(poll,250);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAll();});
// Ein Gebäude/Fenster öffnen unterbricht sofort alles, was gerade gesprochen wird (und Applaus/Gelächter)
{const wrap=()=>{const U=M.ui;if(!U||U._sprechWrap)return!!U;U._sprechWrap=true;const click=U.click;if(typeof click==='function')U.click=function(a,...r){if(typeof a==='string'&&a.startsWith('nav:')){stopAll();M.crowdMood?.(null);}return click.call(this,a,...r);};const modal=U.modal;if(typeof modal==='function')U.modal=function(...r){stopAll();return modal.apply(this,r);};return true;};if(!wrap()){const iv=setInterval(()=>{if(wrap())clearInterval(iv);},300);}}
// ---------- Spielfeld still, solange ein Gebäude/Fenster offen ist ----------
// Ist über dem Ludus ein Fenster offen (Medicus, Gespräche …) oder eine andere Seite, steht das Spielfeld: keine Bewegung,
// keine Sprechblasen, keine Geräusche von dort. Der Ludus-Takt (M.ludusTick, von allen Modulen erweitert) wird ganz außen angehalten.
function fieldPaused(){const m=document.getElementById('modal');return !!(m&&!m.hidden&&m.innerHTML.trim())||(M.ui?.getPage&&M.ui.getPage()!=='home');}
M.fieldPaused=fieldPaused;
{const hook=()=>{if(!window.HUNDEFANG_READY||typeof M.ludusTick!=='function')return false;const inner=M.ludusTick;M.ludusTick=function(dt){const m=document.getElementById('modal');if(m&&!m.hidden&&m.innerHTML.trim())return;return inner.apply(this,arguments);};return true;};const iv=setInterval(()=>{if(hook())clearInterval(iv);},400);}
// ---------- Gesichter: bekannte Figuren melden ihren Kopf an (M.registerFace), der Schmied wird aus seinen Daten gebaut ----------
const FACES=[];let smithFaceC=null;
function smithFace(){const p=M.workshop?.state?.master||M.s?.forgeWorkshop?.master;if(!p||!M.makeGladiator)return null;if(smithFaceC?.name===p.name)return smithFaceC;const rng=M.s.rng,g=M.makeGladiator(0);M.s.rng=rng;Object.assign(g,{id:'sprech-smith',name:p.name,height:p.height||186,weight:p.weight||100,muscle:58,fame:0,scars:[]});if(p.appearance)g.appearance={...g.appearance,...p.appearance};return smithFaceC=g;}
function faceFor(key,name){const n=String(name||'');for(const f of FACES)if((n&&f.re.test(n))||(key&&f.re.test(key)))try{const g=f.get();if(g)return g;}catch(e){console.warn('Sprecher-Gesicht',e);}
 if(key==='schmied')return smithFace();if(n){const r=(M.s?.roster||[]).find(x=>x.name===n||String(x.name).split(' ')[0]===n);if(r)return r;}return null;}
M.registerFace=(re,get,painter)=>FACES.push({re,get,painter});const painterFor=g=>{for(const f of FACES){try{if(f.painter&&sameG(f.get(),g))return f.painter;}catch{}}return null;};M.faceFor=faceFor;
// ---------- Sprecher-Großaufnahme ----------
// Spricht eine Figur (nicht bei Sprechblasen auf dem Spielfeld): Steht ihre Großaufnahme schon still im Bild, wird sie mit
// bewegtem Mund neu gemalt; malt die Szene sie selbst laufend, passiert nichts weiter; sonst erscheint unten links eine kleine
// Nahaufnahme mit ihrem Kopf (face-shots.js), deren Mund sich zur Stimme bewegt.
let box=null,boxCv=null,boxG=null;
{const st=document.createElement('style');st.textContent=`.sprech-face{position:fixed;left:12px;bottom:max(90px,env(safe-area-inset-bottom));z-index:3000;width:min(44vw,240px);background:#101719;border:3px solid #52625b;box-shadow:4px 4px 0 rgba(0,0,0,.45);opacity:0;transform:translateY(8px);transition:opacity .2s,transform .2s;pointer-events:none}.sprech-face[hidden]{display:none!important}.sprech-face.on{opacity:1;transform:none}.sprech-face canvas{display:block;width:100%;height:auto;image-rendering:pixelated}.sprech-face b{display:block;font:bold 11px 'Courier Prime',monospace;letter-spacing:.08em;text-transform:uppercase;color:#dfb66d;padding:3px 6px;background:#182126}`;document.head.appendChild(st);}
function boxEl(){if(box)return box;box=document.createElement('div');box.id='sprechFace';box.className='sprech-face';box.setAttribute('aria-hidden','true');box.innerHTML='<canvas width="320" height="208"></canvas><b></b>';document.body.appendChild(box);boxCv=box.firstChild;return box;}
const sameG=(a,b)=>!!a&&!!b&&(a===b||(a.id&&a.id===b.id));
const shown=el=>{if(!el?.isConnected)return false;const r=el.getClientRects();if(!r.length||!r[0].width)return false;let n=el;while(n&&n!==document.body){const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity<.1||n.hidden)return false;n=n.parentElement;}return true;};
function faceLoop(){requestAnimationFrame(faceLoop);const g=cur&&!cur.soft?cur.g:null,talking=g&&(cur.start===Infinity||cur.ctx.currentTime<cur.start+cur.dur+.15);
 if(!talking||!M.faceShot?.records){if(box&&!box.hidden){box.classList.remove('on');box.hidden=true;}return;}
 const now=performance.now();let painted=false,live=false;
 for(const [cv,r] of M.faceShot.records()){if(cv===boxCv||!sameG(r.o.g,g))continue;/* malt die Szene den Kopf laufend (auch über einen Zwischenpuffer wie beim Medicus), zeigt sie ihn selbst */if(now-r.time<400){live=true;continue;}if(!shown(cv))continue;try{if(r.repaint)r.repaint(talkMouth(g));else M.faceShot.paint(r.ctx,r.w,r.h,{...r.o,talk:talkMouth(g),_sprech:true},r.t);painted=true;}catch{}}
 const own=painted||live;if(own){if(box&&!box.hidden){box.classList.remove('on');box.hidden=true;}return;}
 boxEl();if(box.hidden||boxG!==g){box.hidden=false;boxG=g;box.querySelector('b').textContent=cur.name||g.name||'';requestAnimationFrame(()=>box.classList.add('on'));}
 try{const c=boxCv.getContext('2d'),P=painterFor(g);if(P)P(c,boxCv.width,boxCv.height,now/1000);else M.faceShot.paint(c,boxCv.width,boxCv.height,{g,team:g.enemy?1:0,mood:'calm',yaw:.22,zoom:1.12,talk:talkMouth(g),_sprech:true},now/1000);}catch{}}
requestAnimationFrame(faceLoop);
// Filme warten, bis die laufende Zeile zu Ende gesprochen ist (f.ack/f.skip = Antippen: nicht warten). Sicherheitsgrenze 20 s.
function speechHold(f){if(f&&(f.ack||f.skip))return false;/* Ton angehalten (Handy minimiert, Anruf): die Tonuhr steht, nicht darauf warten */if(cur&&!cur.soft&&cur.ctx&&cur.ctx.state!=='running'&&(cur.start!==Infinity||document.hidden)){cur=null;return false;}if(pend.length){if(!missionOn()||performance.now()-qProg>25000)pend.length=0;else{if(!cur||!playing())pump();return true;}}if(!cur||cur.soft)return false;/* Ton angehalten (Handy minimiert, Anruf): die Tonuhr steht, nicht darauf warten */if(cur.ctx&&cur.ctx.state!=='running'){if(cur.start!==Infinity||document.hidden){cur=null;return false;}}if(performance.now()-cur.t0>20000)return false;if(cur.start===Infinity)return performance.now()-cur.t0<(cur.keep?9000:5000);return cur.ctx.currentTime<cur.start+cur.dur;}
// Spielfeld: immer nur eine Sprechblase, danach 5–10 s Ruhe
// Spielfeld-Regel: immer nur eine Sprechblase; die nächste frühestens 10 s nach dem Ende der Blase UND der gesprochenen Zeile
let fieldNext=0;const fieldSpeaking=()=>!!cur&&cur.soft&&(cur.start===Infinity||cur.ctx.currentTime<cur.start+cur.dur);
const fieldTalk={ok:()=>performance.now()>=fieldNext&&!fieldSpeaking(),mark:ms=>{fieldNext=performance.now()+(ms||3000)+10000;},speaking:fieldSpeaking};
// Abenteuer und Kämpfe mit Anführer: Solange jemand (nicht leise) spricht, steht der Kampf still, damit man die Blase lesen kann.
// Klick aufs Spielfeld überspringt den Satz (Thomas 26.10.).
function speechFreeze(){const b=M.s?.battle;return !!b&&!b.result&&!!(b.mission||b.lead)&&speechHold();}
if(typeof document!=='undefined')document.addEventListener('pointerdown',ev=>{const bv=document.getElementById('battleView');if(!bv||bv.hidden||!bv.contains(ev.target)||ev.target.closest?.('button,select,input,a,.modal'))return;
 const sh=M.injuryShots?.arena;if(sh&&!sh.live){M.injuryShots.skip();ev.stopPropagation();ev.preventDefault();return;}if(speechFreeze()){stop();ev.stopPropagation();ev.preventDefault();}},true);
Object.assign(M,{speechHold,speechFreeze,fieldTalk,speechNow:()=>cur&&{key:cur.key,who:cur.who,soft:cur.soft,text:cur.text},speakLine,speechLog:()=>dl.slice(),speakStop:stop,speakStopAll:stopAll,speechQueued:()=>pend.length,speakOnChange,talkMouth,speaking,speechVoiceKey:voiceKey});
})();
