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
function voiceFor(key,g,o={}){const S=window.Sprech;let v={...S.get(key)};delete v.look;if(o.speedUp)v.speed=(v.speed||1)*o.speedUp;
 if(key==='rekrut'&&g){const tier=M.voicePitch?.(g)??1;v.pitch=Math.round(118*tier);v.size=Math.max(.88,Math.min(1.16,(g.height||180)/180));v.rough=Math.min(.6,.1+((g.scars||[]).length>0?.15:0)+(tier<.9?.12:0));}
 if(key==='frau'&&g){v.size=Math.max(.8,Math.min(.95,(g.height||168)/185));}
 return v;}
const clean=t=>String(t||'').replace(/<[^>]*>/g,' ').replace(/\{[^}]*\}/g,'').replace(/\s+/g,' ').trim().slice(0,320);
// Eine Zeile sprechen. who: Kürzel/Name der Figur, g: ihr Gladiator-Objekt (für Mundbewegung in Großaufnahmen)
// o.soft: Sprechblase auf dem Spielfeld – spricht nur, wenn gerade kein Gespräch läuft, und etwas leiser
const norm=t=>clean(t).replace(/[„“"»«]/g,'').toLowerCase();let lastKey='',lastT=-1e9;
function speakLine(text,who,g,o={}){const txt=clean(text);if(!txt||!/[a-zäöüß]/i.test(txt)||!window.Sprech)return null;
 const nk=norm(txt),now=performance.now();if(nk===lastKey&&now-lastT<9000){if(g&&cur&&!cur.g)cur.g=g;return cur;}
 const out=M.audioEngine?.voiceOut?.();if(!out)return null;if(o.soft&&cur&&!cur.soft&&(cur.start===Infinity||cur.ctx.currentTime<cur.start+cur.dur))return null;stop();
 lastKey=nk;lastT=now;const key=o.voice||voiceKey(who,g,o.name),voice=voiceFor(key,g,o),me={id:++seq,key,who,g,text:txt,soft:!!o.soft,t0:performance.now(),start:Infinity,dur:0,mouth:null,src:null};cur=me;
 renderAsync(txt,voice).then(R=>{if(cur!==me)return;if(R.error||!R.data){cur=null;return;}const o2=M.audioEngine?.voiceOut?.();if(!o2){cur=null;return;}const {ctx,bus}=o2;
  const b=ctx.createBuffer(1,R.data.length,window.Sprech.SR);b.getChannelData(0).set(R.data);const s=ctx.createBufferSource(),gn=ctx.createGain();s.buffer=b;gn.gain.value=o.vol??(o.soft?.75:1.05);s.connect(gn);gn.connect(bus);
  const at=ctx.currentTime+.02;s.start(at);M.audioEngine?.duck?.(o.soft?.65:.32);s.onended=()=>{s.disconnect();gn.disconnect();if(cur===me){cur=null;M.audioEngine?.duck?.(1);}};me.src=s;me.start=at;me.dur=R.dur;me.mouth=R.mouth;me.ctx=ctx;});
 return me;}
function stop(){if(cur?.src){try{cur.src.stop();}catch{}}cur=null;M.audioEngine?.duck?.(1);}
// Mundöffnung (0–1) für eine Figur, wenn sie gerade spricht: g (Objekt oder id) oder Stimmen-/Figurenkürzel
function talkMouth(x){if(!cur?.mouth||!x)return 0;const same=x===cur.g||(x.id&&cur.g&&x.id===cur.g.id)||(typeof x==='string'&&(x===cur.key||x===cur.who));if(!same)return 0;const t=cur.ctx.currentTime-cur.start;if(t<0||t>cur.dur)return 0;return window.Sprech.mouthAt(cur.mouth,t);}
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
 ['#smithIntroText,#hallFilmText,#medicText,#dokText,#lionText,#archerPlotText,#smithWrathText,#plotTalkText,#owText,#medicNightSub,#hfCap,#hfSayText,#hfTalkText,#spyText','cap',{speedUp:1.3}],
 ['.scene-bubble,.hf-bubble,.ws-bubble,.ow-talk,.wanderer-line,.medic-quip,.dok-line,.tr-reveal .tr-quote,.hs-bubble',null,{}],
 ['#modSay,.hs-mi-say','moderator',{}],
 ['#hsSay','frau',{name:'Hühnerhändlerin'}],
 ['.smith-plea','schmied',{}],['.hall-title','cap',{speedUp:1.2}],['.threat',null,{soft:true}]];
const seen=new WeakMap();
const visible=el=>{if(!el.isConnected||el.closest('[hidden],.hf-hide,.out'))return false;const r=el.getClientRects();if(!r.length||!r[0].width)return false;const cs=getComputedStyle(el);return cs.visibility!=='hidden'&&cs.display!=='none'&&+cs.opacity>.15;};
function parse(el,def){const raw=clean(el.textContent);if(!raw)return null;const b=el.querySelector('b,small,strong');let name='',text=raw;
 if(b&&raw.startsWith(clean(b.textContent))&&clean(b.textContent).length<60){name=clean(b.textContent).replace(/[:·].*$/,'').replace(/:$/,'').trim();text=raw.slice(clean(b.textContent).length).replace(/^[:\s]+/,'');}
 const m=/^([^:„“]{2,40}):\s*„(.+)“\s*$/.exec(text);if(m){name=name||m[1].trim();text=m[2];}
 text=text.replace(/^„|“$/g,'').replace(/[▼▸›]/g,'').trim();
 if(def==='cap'&&name)return {text,who:null,name};return {text,who:def,name};}
function poll(){if(!window.Sprech||!M.audioEngine?.voiceOut?.())return;
 for(const [sel,def,opt] of WATCH)for(const el of document.querySelectorAll(sel)){const raw=el.textContent;let st=seen.get(el);if(!st){st={};seen.set(el,st);}
  if(raw!==st.txt){st.txt=raw;continue;}if(st.spoken===raw||!visible(el))continue;st.spoken=raw;const P=parse(el,def);if(!P||!/[a-zäöüß]{2}/i.test(P.text))continue;
  const g=P.name?(M.s?.roster||[]).find(x=>x.name===P.name||String(x.name).split(' ')[0]===P.name):null;
  speakLine(P.text,P.who,g||null,{...opt,name:opt.name||P.name});}}
setInterval(poll,250);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
// Filme warten, bis die laufende Zeile zu Ende gesprochen ist (f.ack/f.skip = Antippen: nicht warten). Sicherheitsgrenze 20 s.
function speechHold(f){if(!cur||cur.soft||(f&&(f.ack||f.skip)))return false;if(performance.now()-cur.t0>20000)return false;if(cur.start===Infinity)return performance.now()-cur.t0<4000;return cur.ctx.currentTime<cur.start+cur.dur;}
// Spielfeld: immer nur eine Sprechblase, danach 5–10 s Ruhe
let fieldNext=0;const fieldTalk={ok:()=>performance.now()>=fieldNext,mark:ms=>{fieldNext=performance.now()+(ms||3000)+5000+Math.random()*5000;}};
Object.assign(M,{speechHold,fieldTalk,speechNow:()=>cur&&{key:cur.key,who:cur.who,soft:cur.soft,text:cur.text},speakLine,speakStop:stop,speakOnChange,talkMouth,speaking,speechVoiceKey:voiceKey});
})();
