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
function voiceKey(who,g,name){const n=String(name||g?.name||'').toLowerCase(),w=String(who||'').toLowerCase();
 if(w==='rabies'||/rabies|hundsgraf/.test(n))return 'rabies';
 if(['s','sm','smith','schmied'].includes(w)||/schmied/.test(n)||/smith/.test(g?.id||''))return 'schmied';
 if(['o','oro','orontes','bowyer'].includes(w)||/orontes|pfeilkopf/.test(n)||g?.id==='bowyer')return 'orontes';
 if(['k','kra','krassus'].includes(w)||/krassus|knochenzins/.test(n))return 'krassus';
 if(['m','mod','moderator'].includes(w)||/moderator/.test(n))return 'moderator';
 if(['d','doc','medicus'].includes(w)||/medicus|doktor|arzt/.test(n))return 'medicus';
 if(['cap','erzaehler','narrator'].includes(w))return 'erzaehler';
 if(w==='n'||g?.sex==='female'||/schwester/.test(n))return 'frau';
 return 'rekrut';}
function voiceFor(key,g){const S=window.Sprech;let v={...S.get(key)};delete v.look;
 if(key==='rekrut'&&g){const tier=M.voicePitch?.(g)??1;v.pitch=Math.round(118*tier);v.size=Math.max(.88,Math.min(1.16,(g.height||180)/180));v.rough=Math.min(.6,.1+((g.scars||[]).length>0?.15:0)+(tier<.9?.12:0));}
 if(key==='frau'&&g){v.size=Math.max(.8,Math.min(.95,(g.height||168)/185));}
 return v;}
const clean=t=>String(t||'').replace(/<[^>]*>/g,' ').replace(/\{[^}]*\}/g,'').replace(/\s+/g,' ').trim().slice(0,320);
// Eine Zeile sprechen. who: Kürzel/Name der Figur, g: ihr Gladiator-Objekt (für Mundbewegung in Großaufnahmen)
function speakLine(text,who,g,o={}){const txt=clean(text);if(!txt||!/[a-zäöüß]/i.test(txt)||!window.Sprech)return null;
 const out=M.audioEngine?.voiceOut?.();if(!out)return null;stop();
 const key=o.voice||voiceKey(who,g,o.name),voice=voiceFor(key,g),me={id:++seq,key,who,g,start:Infinity,dur:0,mouth:null,src:null};cur=me;
 renderAsync(txt,voice).then(R=>{if(cur!==me||R.error||!R.data)return;const o2=M.audioEngine?.voiceOut?.();if(!o2)return;const {ctx,bus}=o2;
  const b=ctx.createBuffer(1,R.data.length,window.Sprech.SR);b.getChannelData(0).set(R.data);const s=ctx.createBufferSource(),gn=ctx.createGain();s.buffer=b;gn.gain.value=o.vol??.85;s.connect(gn);gn.connect(bus);
  const at=ctx.currentTime+.02;s.start(at);s.onended=()=>{s.disconnect();gn.disconnect();if(cur===me)cur=null;};me.src=s;me.start=at;me.dur=R.dur;me.mouth=R.mouth;me.ctx=ctx;});
 return me;}
function stop(){if(cur?.src){try{cur.src.stop();}catch{}}cur=null;}
// Mundöffnung (0–1) für eine Figur, wenn sie gerade spricht: g (Objekt oder id) oder Stimmen-/Figurenkürzel
function talkMouth(x){if(!cur?.mouth||!x)return 0;const same=x===cur.g||(x.id&&cur.g&&x.id===cur.g.id)||(typeof x==='string'&&(x===cur.key||x===cur.who));if(!same)return 0;const t=cur.ctx.currentTime-cur.start;if(t<0||t>cur.dur)return 0;return window.Sprech.mouthAt(cur.mouth,t);}
const speaking=x=>!!cur&&(!x||talkMouth(x)>0||x===cur.key||x===cur.who||x===cur.g)&&(cur.start===Infinity||cur.ctx.currentTime<cur.start+cur.dur);
// Zeilenwechsel erkennen (für Szenen, die Text jedes Bild neu zeichnen): spricht nur, wenn sich die Zeile ändert
const lastBy=new Map();
function speakOnChange(channel,text,who,g,o){const key=clean(text);if(lastBy.get(channel)===key)return;lastBy.set(channel,key);if(key)speakLine(text,who,g,o);}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
Object.assign(M,{speakLine,speakStop:stop,speakOnChange,talkMouth,speaking,speechVoiceKey:voiceKey});
})();
