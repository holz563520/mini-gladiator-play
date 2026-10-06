'use strict';
(()=>{
const M=window.MG;
// One audio clock, two buses and a fixed voice budget, independent of simulation RNG/speed.
let ctx,musicBus,fxBus,master,timer,next=0,step=0,scene='',noiseBuffer,waves={},active=0,musicVoices=0,lastVoice=-10;
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
// Original 32-bar minor/modal composition, four contrasting phrases and a quieter Ludus arrangement.
const phrases=[
 [74,null,77,76,74,null,69,null,72,null,74,77,76,null,72,null],
 [77,null,81,79,77,null,76,74,72,null,69,null,72,74,76,null],
 [81,null,79,77,76,null,74,null,77,76,74,72,69,null,72,null],
 [74,77,81,null,79,77,76,null,74,null,72,69,74,null,null,null]
];
function barStep(s,at,mode){const pos=s%16,bar=Math.floor(s/16)%32,section=Math.floor(bar/8),battle=mode==='battle',roots=[38,38,34,41,36,34,33,38],root=roots[bar%8],beat=60/(battle?108:82),sixteenth=beat/4;
 const danger=battle&&(M.s.battle.actors||[]).some(a=>!a.down&&!a.g.dead&&a.g.blood<45),intensity=battle?(danger?1:.83):.38;
 if(pos===0||battle&&(pos===8||pos===11&&bar%2===1))drum(at,true,true,intensity);
 if(battle&&(pos===4||pos===12)){drum(at,false,true,intensity*.7);noise(.12,.045,1800,'bandpass',at,true,pos===4?-.35:.35);}
 if(battle&&pos%2===0)noise(.026,.022*intensity,5000,'highpass',at,true,(pos%4?-.45:.45));
 if(battle&&bar%4===3&&pos>=13){drum(at,false,true,intensity*(.3+(pos-13)*.15));}
 if(pos%4===0){note(hz(root+(pos===12?7:0)),beat*.86,'triangle',battle?.13:.07,at,true);note(hz(root-12),beat*.8,'sine',battle?.07:.025,at,true);}
 if(pos===0)for(const [i,n]of [0,3,7].entries())note(hz(root+24+n),beat*3.65,'strings',battle?.026:.036,at,true,null,(i-1)*.55);
 const arp=[0,7,12,15,12,7,3,7];if(pos%2===0&&(section!==2||!battle))note(hz(root+24+arp[pos/2]),sixteenth*1.65,'pluck',battle?.029:.05,at,true,null,pos%4?-.45:.45);
 if(pos%4===0){const n=phrases[section][(bar%4)*4+pos/4];if(n!==null){const melodic=n+(section===2?-12:0);note(hz(melodic),beat*(pos===12?1.5:.83),battle?'horn':'flute',battle?.085:.075,at,true,null,-.12);if(battle&&section===3)note(hz(melodic-12),beat*.75,'horn',.027,at,true,null,.15);}}
 if(battle&&bar%8===7&&pos===14)noise(.32,.045,2600,'highpass',at,true);
}
function tick(){if(!ctx)return;const live=!document.hidden&&!M.s.battle?.paused;
 musicBus.gain.setTargetAtTime(live&&M.s.options.music?.34:0,ctx.currentTime,.06);fxBus.gain.setTargetAtTime(live&&M.s.options.sound?.7:0,ctx.currentTime,.025);
 if(!enabled(true)){next=ctx.currentTime+.06;return;}const mode=M.s.battle&&!M.s.battle.finale?'battle':'home';if(mode!==scene){scene=mode;step=0;next=ctx.currentTime+.07;}if(next<ctx.currentTime)next=ctx.currentTime+.03;let scheduled=0;while(next<ctx.currentTime+.12&&scheduled++<4){barStep(step++,next,mode);next+=60/(mode==='battle'?108:82)/4;}}
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
document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden){musicBus.gain.cancelScheduledValues(ctx.currentTime);fxBus.gain.cancelScheduledValues(ctx.currentTime);musicBus.gain.value=fxBus.gain.value=0;ctx.suspend().catch(()=>{});}else{next=ctx.currentTime+.08;ctx.resume().catch(()=>{});}});
M.audioEngine={start,sound,voice,diagnostics:()=>({active,musicVoices,scene,step,state:ctx?.state||'not-started'})};
})();
