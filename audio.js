'use strict';
(()=>{
const M=window.MG;
// One audio clock, two buses and a fixed voice budget, independent of simulation RNG/speed.
let ctx,musicBus,fxBus,master,timer,scene='',noiseBuffer,waves={},active=0,musicVoices=0,lastVoice=-10;
// Aufgenommene Lieder: gestreamt (kein Dekodieren in den Arbeitsspeicher), erst beim ersten Bedarf geladen. Ludus/Menüs und Kampfszenen (Arenakampf, Intro) haben je ein Lied. Die frühere erzeugte Musik ist entfernt; Geräusche laufen weiter über die Web-Audio-Stimmen unten.
const songs={home:{file:'ludus-at-sunset',el:null,broken:false,level:0,playing:false},battle:{file:'sanguis-et-gloria',el:null,broken:false,level:0,playing:false},smith:{file:'smith-the-motherfucker',el:null,broken:false,level:0,playing:false},hall:{file:'aula-lorum',el:null,broken:false,level:0,playing:false}};
function songWanted(){if(document.querySelector?.('.scene-silence'))return '';if(window.ArenaTheoryIntro?.active?.()||!M.s.options.music||document.hidden||M.s.battle?.paused)return '';if(M.s.battle||M.intro?.active?.())return 'battle';const hall=M.hall?.music?.();if(hall)return hall;return smithOnStage()?'smith':'home';}
// Der Schmied steht im Vordergrund: Schmiede geöffnet, Schmied-Intro oder eine Lehrlings-Szene läuft.
function smithOnStage(){return M.ui?.getPage?.()==='forge'||!!M.forgeIntro?.scene||!!document.querySelector?.('.smith-ceremony:not(.no-smith-song)');}
function songReady(t){if(t.broken||typeof Audio==='undefined')return false;if(t.el)return true;try{const el=new Audio();el.loop=true;el.preload='none';el.volume=0;const pick=el.canPlayType('audio/webm; codecs="opus"')?'webm':el.canPlayType('audio/mp4; codecs="mp4a.40.2"')?'m4a':'';if(!pick){t.broken=true;return false;}el.src='music/'+t.file+'.'+pick;el.addEventListener('error',()=>{t.broken=true;t.playing=false;});t.el=el;return true;}catch{t.broken=true;return false;}}
function songStop(t){if(t.el&&t.playing){t.playing=false;t.level=0;t.el.pause();}}
function songTick(){const wanted=songWanted();for(const key in songs){const t=songs[key],want=wanted===key&&songReady(t);if(!t.el||t.broken)continue;t.level+=((want?.42:0)-t.level)*.12;if(want&&!t.playing){t.playing=true;const p=t.el.play();if(p?.catch)p.catch(()=>{t.playing=false;});}else if(t.playing&&t.level<.02)songStop(t);try{t.el.volume=Math.max(0,Math.min(1,t.level));}catch{}}}
const recent=new Map(),hz=n=>440*Math.pow(2,(n-69)/12);
function init(){if(ctx)return true;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;try{
 ctx=new AC();master=ctx.createGain();master.gain.value=.62;musicBus=ctx.createGain();fxBus=ctx.createGain();musicBus.gain.value=.34;fxBus.gain.value=.7;
 const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-17;compressor.knee.value=18;compressor.ratio.value=4;compressor.attack.value=.004;compressor.release.value=.16;musicBus.connect(master);fxBus.connect(master);master.connect(compressor);compressor.connect(ctx.destination);
 const delay=ctx.createDelay(.5),feedback=ctx.createGain(),send=ctx.createGain(),low=ctx.createBiquadFilter();delay.delayTime.value=.205;feedback.gain.value=.19;send.gain.value=.12;low.type='lowpass';low.frequency.value=2200;musicBus.connect(delay);delay.connect(low);low.connect(feedback);feedback.connect(delay);low.connect(send);send.connect(master);
 noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const data=noiseBuffer.getChannelData(0);let brown=0;for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.14)/1.02;data[i]=(Math.random()*2-1)*.65+brown*.35;}
 for(const [name,fall]of [['horn',1.25],['strings',1.9],['pluck',1.5],['flute',3.8]]){const re=new Float32Array(17),im=new Float32Array(17);for(let n=1;n<17;n++)im[n]=1/Math.pow(n,fall)*(name==='horn'&&n%2===0?.4:1);waves[name]=ctx.createPeriodicWave(re,im);}
 return true;
 }catch{if(ctx)ctx.close().catch(()=>{});ctx=null;return false;}}
function enabled(music){return ctx&&ctx.state==='running'&&!document.hidden&&!(M.s.battle?.paused)&&!!M.s.options[music?'music':'sound'];}
function note(f,d=.2,instrument='triangle',vol=.1,at=ctx?.currentTime||0,music=false,end=null,pan=0){if(!enabled(music)||active>=52||(music&&musicVoices>=28))return;active++;if(music)musicVoices++;
 const o=ctx.createOscillator(),g=ctx.createGain(),filter=ctx.createBiquadFilter(),p=ctx.createStereoPanner();at=Math.max(ctx.currentTime,at);if(waves[instrument])o.setPeriodicWave(waves[instrument]);else o.type=instrument;o.frequency.setValueAtTime(Math.max(20,f),at);if(end)o.frequency.exponentialRampToValueAtTime(Math.max(20,end),at+d);
 filter.type='lowpass';filter.frequency.setValueAtTime(instrument==='horn'?2300:instrument==='strings'?1400:6500,at);p.pan.value=pan;
 const attack=instrument==='strings'?.09:instrument==='horn'?.025:.004;g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(vol,at+Math.min(d*.2,attack));g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol*.55),at+d*.6);g.gain.exponentialRampToValueAtTime(.0001,at+d);
 o.connect(filter);filter.connect(g);g.connect(p);p.connect(music?musicBus:fxBus);o.onended=()=>{active--;if(music)musicVoices--;for(const node of [o,filter,g,p])node.disconnect();};o.start(at);o.stop(at+d+.015);
}
function noise(d,vol,freq,type='lowpass',at=ctx?.currentTime||0,music=false,pan=0){if(!enabled(music)||active>=52||(music&&musicVoices>=28))return;active++;if(music)musicVoices++;const src=ctx.createBufferSource(),g=ctx.createGain(),filter=ctx.createBiquadFilter(),p=ctx.createStereoPanner();at=Math.max(ctx.currentTime,at);src.buffer=noiseBuffer;filter.type=type;filter.frequency.value=freq;filter.Q.value=.75;p.pan.value=pan;g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(vol,at+.005);g.gain.exponentialRampToValueAtTime(.0001,at+d);src.connect(filter);filter.connect(g);g.connect(p);p.connect(music?musicBus:fxBus);src.onended=()=>{active--;if(music)musicVoices--;for(const node of [src,filter,g,p])node.disconnect();};src.start(at,Math.random()*.65);src.stop(at+d+.015);}
function drum(at,strong=true,music=true,vol=1){note(strong?112:165,strong?.26:.16,'sine',.22*vol,at,music,strong?43:68);noise(.06,.08*vol,strong?850:1350,'lowpass',at,music);}
function tick(){if(!ctx)return;const live=!document.hidden&&!M.s.battle?.paused;
 musicBus.gain.setTargetAtTime(0,ctx.currentTime,.06);fxBus.gain.setTargetAtTime(live&&M.s.options.sound?.7:0,ctx.currentTime,.025);
 songTick();scene=M.s.battle&&!M.s.battle.finale?'battle':'home';}
function start(){if(!init())return;ctx.resume().catch(()=>{});if(!timer)timer=setInterval(tick,40);tick();}
function voice(kind='pain',pitch=1,strong=false){if(!enabled(false)||ctx.currentTime-lastVoice<.22||active>44)return;lastVoice=ctx.currentTime;const t=ctx.currentTime,p=Math.max(.6,Math.min(1.5,pitch||1)),d=strong?.32:.19;if(kind==='battlecry'){note(150*p,.46,'sawtooth',.065,t,false,105*p);note(290*p,.38,'triangle',.045,t+.03,false,210*p);noise(.34,.07,900,'bandpass',t,false);return;}note(125*p,d,'triangle',strong?.13:.075,t,false,82*p);noise(d*.7,strong?.095:.05,kind==='crowd'?800:570,'bandpass',t,false);note(255*p,d*.6,'sine',.032,t+.02,false,170*p);}
function sound(type){if(!enabled(false))return;const t=ctx.currentTime,wait=type==='step'?.11:type==='crowd'?1.5:['block','armorhit'].includes(type)?.07:.04;if(t-(recent.get(type)??-10)<wait)return;recent.set(type,t);const v=.93+Math.random()*.14;
 if(type==='step'){noise(.065,.055,520,'lowpass',t);return;}
 if(['slash','heavy','throw'].includes(type)){noise(type==='heavy'?.2:.11,.10, type==='heavy'?1100:2600,'bandpass',t);note(type==='heavy'?120:260,.10,'triangle',.04,t,false,60);return;}
 if(['hit','backstab','sever','stick'].includes(type)){drum(t,true,false,.78*v);noise(.10,.14,720,'lowpass',t);if(type==='stick')note(195,.08,'triangle',.07,t,false,92);return;}
 if(type==='block'||type==='armorhit'){for(const [f,vol]of [[690,.10],[1137,.055],[1860,.028]])note(f*v,type==='block'?.26:.13,'sine',vol,t,false,f*.97);noise(.028,.11,3900,'highpass',t);return;}
 if(type==='fall'){drum(t,true,false,1.1);noise(.24,.16,410,'lowpass',t);return;}
 if(type==='rise'||type==='sand'||type==='land'||type==='rush'){noise(type==='sand'?.3:.17,type==='sand'?.095:.07,type==='sand'?3100:780,type==='sand'?'highpass':'lowpass',t);return;}
 if(type==='crowd'){for(let i=0;i<5;i++){const at=t+i*.055;noise(.65+i*.09,.04,650+i*270,'bandpass',at,false,(i-2)*.35);note(115+i*24,.38,'triangle',.018,at,false,140+i*21,(i-2)*.35);}return;}
 if(type==='gong'){for(const [f,vol]of [[73,.15],[119,.08],[181,.055],[307,.025]])note(f,1.7,'sine',vol,t,false,f*.96);noise(.16,.065,1700,'bandpass',t);return;}
 if(type==='win'||type==='mercy'){const notes=type==='win'?[62,65,69,74,77,74]:[65,69,74];notes.forEach((n,i)=>note(hz(n),i===notes.length-1?.8:.25,'horn',.105,t+i*.17));if(type==='win')sound('crowd');return;}
 if(type==='die'||type==='verdictDeath'){note(90,.6,'triangle',.10,t,false,38);noise(.24,.07,500,'lowpass',t);return;}
 if(type==='gold'){note(1175,.12,'sine',.07,t);note(1568,.19,'sine',.05,t+.07);}
}
document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden){for(const key in songs)songStop(songs[key]);musicBus.gain.cancelScheduledValues(ctx.currentTime);fxBus.gain.cancelScheduledValues(ctx.currentTime);musicBus.gain.value=fxBus.gain.value=0;ctx.suspend().catch(()=>{});}else{ctx.resume().catch(()=>{});}});
M.audioEngine={start,sound,voice,diagnostics:()=>({active,musicVoices,scene,song:songs.home.playing?'home':songs.battle.playing?'battle':songs.smith.playing?'smith':songs.hall.playing?'hall':'',state:ctx?.state||'not-started'})};
})();
