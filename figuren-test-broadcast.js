'use strict';
(()=>{
const copy=v=>JSON.parse(JSON.stringify(v)),yieldUI=()=>new Promise(r=>setTimeout(r,0));
function line(key,values,index=0){const pool=window.FigureLabLines[key]||['{v}: {inj}.'];return pool[index%pool.length].replace(/\{(\w+)\}/g,(_,k)=>values[k]??'');}
// Match sprech-game.js voiceFor: strip appearance and apply the game speech tempo.
function moderatorVoice(){const v={...FigureLabSpeech.get('moderator')};delete v.look;v.speed=(v.speed||1)*.8;return v;}
function signature(a){return{dead:!!a.g.dead,down:!!a.down,taken:a.taken||0,parts:Object.fromEntries(Object.entries(a.g.body).map(([id,p])=>[id,{missing:!!p.missing,fracture:!!p.fracture,grade:MG.injuryGrade(p),injury:p.injury||''}]))};}
async function build(tape,{enabled=true,voice=true,closeups=true,cancelled=()=>false,progress=()=>{}}={}){
 if(!tape.complete)throw Error('Kommentar benötigt einen vollständigen Kampf.');
 if(!enabled)return{duration:tape.duration,segments:[{start:0,end:tape.duration,combatStart:0,type:'run'}],cues:[],audioBytes:0,enabled:false};
 const playback=tape.player(),old=new Map(playback.state.battle.actors.map(a=>[a.id,signature(a)])),buckets=new Map();let firstBlood=tape.initial.battle.actors.some(a=>Object.values(a.g.body).some(p=>p.bleed>0));
 for(let i=0;i<tape.frames.length;i++){
 const state=playback.seekForward(tape.frames[i].time),b=state.battle,bucket=Math.floor(state.clock/8);
 const offer=(event,a)=>{const prev=buckets.get(bucket);if(!prev||event.priority>prev.priority)buckets.set(bucket,{...event,time:state.clock,g:a?copy(a.g):null,team:a?.team});};
 for(const a of b.actors){const prev=old.get(a.id)||signature(a),g=a.g,common={v:g.name,team:a.team?'Rot':'Blau'};
  if(g.dead&&!prev.dead)offer({priority:10,kind:'death',part:'head',text:line('deathPlain',common,bucket),title:'Gefallen'},a);
  else if(a.down&&!prev.down)offer({priority:6,kind:'collapse',part:'chest',text:line('ko',common,bucket),title:'Kampfunfähig'},a);
  for(const [id,p]of Object.entries(g.body)){const before=prev.parts[id],grade=MG.injuryGrade(p),sever=p.missing&&!before?.missing,fracture=!!p.fracture&&!before?.fracture,severe=grade>=3&&(grade>(before?.grade||0)||p.injury!==before?.injury);
   if(sever||fracture||severe){const injury=p.missing?'Abgetrennt':p.injury||(p.fracture?'Bruch':'Schwere Verletzung');offer({priority:sever?9:fracture?8:7,part:id,kind:MG.figureLabShots.kindOf(injury),title:injury,text:line(sever?'sever':'severe',{...common,part:MG.partName(id),inj:injury},bucket)},a);}
  }
  if(!firstBlood&&(a.taken||0)>prev.taken&&Object.values(g.body).some(p=>p.bleed>0)){firstBlood=true;offer({priority:3,part:'chest',kind:'field',text:line('firstBlood',common,bucket)},a);}
  old.set(a.id,signature(a));
 }
 if(!buckets.has(bucket)&&state.clock>=8){const up=t=>b.actors.filter(a=>a.team===t&&!a.g.dead&&!a.down&&!a.surrendered).length;offer({priority:0,kind:'field',text:'Noch '+up(0)+' Kämpfer für Blau und '+up(1)+' für Rot sind kampffähig.'});}
 if(i%120===0){progress('Ereignisse prüfen: '+Math.floor(100*i/tape.frames.length)+' %');await yieldUI();if(cancelled())throw Error('Kommentierung abgebrochen.');}
 }
 const actors=tape.initial.battle.actors,events=[{time:0,kind:'field',text:actors.filter(a=>!a.team).length+' gegen '+actors.filter(a=>a.team).length+'. '+line('start',{},0)},...[...buckets.values()].sort((a,b)=>a.time-b.time),{time:tape.duration,kind:'field',text:'Der Kampf ist beendet. '+(tape.result.winner===0?'Blau gewinnt.':tape.result.winner===1?'Rot gewinnt.':'Unentschieden.')}];
 const segments=[],cues=[];let combat=0,output=0,audioBytes=0;
 for(let i=0;i<events.length;i++){
  if(cancelled())throw Error('Kommentierung abgebrochen.');const event=events[i],time=Math.max(combat,Math.min(tape.duration,event.time));
  if(time>combat){segments.push({start:output,end:output+time-combat,combatStart:combat,type:'run'});output+=time-combat;combat=time;}
  const rendered=voice?FigureLabSpeech.render(event.text,moderatorVoice(),{seed:i+1701}):null;
  if(rendered){audioBytes+=rendered.data.byteLength;if(audioBytes>64*1048576)throw Error('Kommentar-Audiobudget erreicht. Kürzeren Kampf wählen oder Stimme ausschalten.');}
  const length=Math.max(3,rendered?rendered.data.length/rendered.sr+.25:Math.min(9,1+event.text.length*.045));
  const cue={combatTime:combat,start:output,end:output+length,text:event.text,pcm:rendered?.data||null,sr:rendered?.sr||22050};cues.push(cue);
  const shot=closeups&&event.g&&event.kind!=='field'?{g:event.g,part:event.part,kind:event.kind,title:event.title,line1:event.g.name,line3:'Aufgezeichnet bei '+event.time.toFixed(1)+' s Kampfzeit',mute:true,team:event.team,fall:event.kind==='collapse',variant:i%3}:null;
  segments.push({start:output,end:output+length,combatStart:combat,type:shot?'closeup':'hold',shot,cue:i});output+=length;progress('Kommentar vorberechnen: '+(i+1)+' / '+events.length);await yieldUI();
 }
 return{enabled:true,duration:output,combatDuration:tape.duration,segments,cues,audioBytes,eventCount:events.length};
}
function sample(plan,time){let lo=0,hi=plan.segments.length-1;while(lo<hi){const mid=Math.floor((lo+hi)/2);if(plan.segments[mid].end<=time)lo=mid+1;else hi=mid;}const segment=plan.segments[lo],offset=Math.max(0,Math.min(segment.end-segment.start,time-segment.start));return{segment,combatTime:segment.combatStart+(segment.type==='run'?offset:0),offset};}
// Prepared PCM, played with the same clock as the image sequence. No speech generation at playback.
class AudioTrack{
 constructor(plan){this.plan=plan;this.ctx=null;this.buffers=new Map();this.source=null;this.current=null;this.enabled=true;this.error=null;}
 async unlock(){try{if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C){this.error='Keine Audioausgabe verfügbar – Kommentar als Text.';return;}this.ctx=new C();}await this.ctx.resume();this.error=this.ctx.state==='running'?null:'Ton nicht freigegeben – auf Ton aktivieren tippen.';}catch{this.error='Ton nicht freigegeben – auf Ton aktivieren tippen.';}}

 stop(){if(this.source){try{this.source.stop();}catch{}this.source.disconnect();this.source=null;}this.current=null;}
 update(time,playing){const cue=this.plan?.cues.find(c=>time>=c.start&&time<c.end);if(!playing||!this.enabled||!cue?.pcm||!this.ctx||this.ctx.state!=='running'){this.stop();return cue?.text||'';}
  const offset=time-cue.start,drift=this.current?Math.abs((this.ctx.currentTime-this.startedAt+this.offset)-offset):Infinity;
  if(this.current!==cue||drift>.15){this.stop();if(offset>=cue.pcm.length/cue.sr)return cue.text;let buffer=this.buffers.get(cue);if(!buffer){buffer=this.ctx.createBuffer(1,cue.pcm.length,cue.sr);buffer.getChannelData(0).set(cue.pcm);this.buffers.set(cue,buffer);}const source=this.ctx.createBufferSource();source.buffer=buffer;source.connect(this.ctx.destination);source.start(0,offset);this.source=source;this.current=cue;this.startedAt=this.ctx.currentTime;this.offset=offset;}
  return cue.text;
 }
 close(){this.stop();this.buffers.clear();this.ctx?.close()?.catch?.(()=>{});this.ctx=null;}
}
window.FigureBroadcast={build,sample,AudioTrack,moderatorVoice};
})();
