'use strict';
(()=>{
const M=window.MG;
// One audio clock, two buses and a fixed voice budget, independent of simulation RNG/speed.
let ctx,musicBus,fxBus,master,timer,scene='',noiseBuffer,waves={},active=0,musicVoices=0,lastVoice=-10;
// Spielfeld (Ludus/Menüs): „Ludus at Sunset“ und „Arena Theory 1“ laufen abwechselnd nacheinander (Liste wie bei der Schmiede).
// Aufgenommene Lieder: gestreamt (kein Dekodieren in den Arbeitsspeicher), erst beim ersten Bedarf geladen. Ludus/Menüs und Kampfszenen (Arenakampf, Intro) haben je ein Lied. Die frühere erzeugte Musik ist entfernt; Geräusche laufen weiter über die Web-Audio-Stimmen unten.
const songs={home:{file:'ludus-at-sunset',files:['ludus-at-sunset','arena-theory-1'],idx:0,ext:'',el:null,broken:false,level:0,playing:false},battle:{file:'sanguis-et-gloria',el:null,broken:false,level:0,playing:false},smith:{file:'smith-the-motherfucker',files:['smith-the-motherfucker','smyth'],idx:0,ext:'',el:null,broken:false,level:0,playing:false},hall:{file:'aula-lorum',el:null,broken:false,level:0,playing:false},raid:{file:'arena-theory',el:null,broken:false,level:0,playing:false},medic:{file:'medicus-bill',el:null,broken:false,level:0,playing:false},
 // Hundsgraf (hundefang.js): Vorstellung, Aufträge, Fernglas, Hundebuch, Zwinger – nur als MP3 vorhanden
 beast:{file:'beastrium',only:'mp3',el:null,broken:false,level:0,playing:false},
 // Rabies' eigenes Lied „Invisible Hound“: sein Vorstellungsfilm, Fernglas und Hundebuch, sein Karren (Aufträge) – wie beim Schmied
 rabies:{file:'rabies-invisible-hound',only:'mp3',el:null,broken:false,level:0,playing:false}};
function songWanted(){if(document.querySelector?.('.scene-silence'))return '';if(window.ArenaTheoryIntro?.active?.()||!M.s.options.music||document.hidden)return '';if(raidOn())return 'raid';if(M.s.battle?.paused)return '';if(M.s.battle||M.intro?.active?.())return 'battle';if(medicOn())return 'medic';{const hf=M.hundefang?.music?.();if(hf)return hf;}const hall=M.hall?.music?.();if(hall)return hall;return smithOnStage()?'smith':'home';}
// Plündermodus (Außenwelt): Plünderungs-Seite vor dem Tor, laufende Mission und deren Kämpfe – dort läuft „Arena Theory“ statt Ludus- bzw. Kampflied.
// Durchgängig: auch beim Umhergehen zwischen den Kämpfen (dort ist S.battle.paused gesetzt), ohne Abbrechen oder Neustart beim Kampfbeginn.
function raidOn(){return !!M.s.battle?.mission||!!M.outside?.running||M.ui?.getPage?.()==='outside';}
// Beim Medicus: Krankenhaus-Seite, Auswahlmenü am Medicus-Gebäude und Behandlungsstuhl des Doktors – dort läuft „The Medicus's Bill“.
function medicOn(){return M.ui?.getPage?.()==='medic'||!!document.querySelector?.('.medic-menu,.dok-ask,.dok-chair,.dok-result,.dok-choice');}
// Der Schmied steht im Vordergrund: Schmiede geöffnet, Schmied-Intro oder eine Lehrlings-Szene läuft.
function smithOnStage(){return M.ui?.getPage?.()==='forge'||!!M.forgeIntro?.scene||!!document.querySelector?.('.smith-ceremony:not(.no-smith-song)');}
function songReady(t){if(t.broken||typeof Audio==='undefined')return false;if(t.el)return true;try{const el=new Audio();el.loop=!t.files;el.preload='none';el.volume=0;const pick=t.only?(el.canPlayType('audio/mpeg')?t.only:''):el.canPlayType('audio/webm; codecs="opus"')?'webm':el.canPlayType('audio/mp4; codecs="mp4a.40.2"')?'m4a':'';if(!pick){t.broken=true;return false;}t.ext=pick;el.src='music/'+(t.files?t.files[t.idx]:t.file)+'.'+pick;el.addEventListener('error',()=>{t.broken=true;t.playing=false;});if(t.files)el.addEventListener('ended',()=>songNext(t));t.el=el;return true;}catch{t.broken=true;return false;}}
// Lieder mit Liste (Schmiede): ein einziges Audio-Element, das nach dem Ende auf die nächste Datei umgestellt wird; es wird nur das gerade laufende Lied geladen.
function songNext(t){if(!t.el||!t.files)return;t.idx=(t.idx+1)%t.files.length;t.el.src='music/'+t.files[t.idx]+'.'+t.ext;if(t.playing){const p=t.el.play();if(p?.catch)p.catch(()=>{t.playing=false;});}}
function songStop(t){if(t.el&&t.playing){t.playing=false;t.level=0;t.el.pause();}}
// Hat der Browser ein gewünschtes Lied von sich aus angehalten (Handy: Audio-Unterbrechung, Ladepause, Speicher), läuft es an derselben Stelle weiter – kein Neustart.
// Sprechstimmen: Musik wird leiser, solange jemand spricht (duck 0–1), damit die Stimme nicht untergeht
let duckT=1,duckC=1;
function songTick(){const wanted=songWanted();for(const key in songs){const t=songs[key],want=wanted===key&&songReady(t);if(!t.el||t.broken)continue;t.level+=((want?.42:0)-t.level)*.12;duckC+=(duckT-duckC)*.22;if(want&&!t.playing){t.playing=true;const p=t.el.play();if(p?.catch)p.catch(()=>{t.playing=false;});}else if(want&&t.el.paused&&Date.now()-(t.retry||0)>700){t.retry=Date.now();const p=t.el.play();if(p?.catch)p.catch(()=>{});}else if(t.playing&&t.level<.02)songStop(t);try{t.el.volume=Math.max(0,Math.min(1,t.level*duckC));}catch{}}}
const recent=new Map(),hz=n=>440*Math.pow(2,(n-69)/12);
function init(){if(ctx)return true;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;try{
 ctx=new AC();master=ctx.createGain();master.gain.value=.62;musicBus=ctx.createGain();fxBus=ctx.createGain();musicBus.gain.value=.34;fxBus.gain.value=.7;
 const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-17;compressor.knee.value=18;compressor.ratio.value=4;compressor.attack.value=.004;compressor.release.value=.16;musicBus.connect(master);fxBus.connect(master);master.connect(compressor);compressor.connect(ctx.destination);
 const delay=ctx.createDelay(.5),feedback=ctx.createGain(),send=ctx.createGain(),low=ctx.createBiquadFilter();delay.delayTime.value=.205;feedback.gain.value=.19;send.gain.value=.12;low.type='lowpass';low.frequency.value=2200;musicBus.connect(delay);delay.connect(low);low.connect(feedback);feedback.connect(delay);low.connect(send);send.connect(master);
 noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const data=noiseBuffer.getChannelData(0);let brown=0;for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.14)/1.02;data[i]=(Math.random()*2-1)*.65+brown*.35;}
 for(const [name,fall]of [['horn',1.25],['strings',1.9],['pluck',1.5],['flute',3.8]]){const re=new Float32Array(17),im=new Float32Array(17);for(let n=1;n<17;n++)im[n]=1/Math.pow(n,fall)*(name==='horn'&&n%2===0?.4:1);waves[name]=ctx.createPeriodicWave(re,im);}
 return true;
 }catch{if(ctx)ctx.close().catch(()=>{});ctx=null;return false;}}
// Angehaltener Kampf ist stumm – außer in Plünderungen: dort steht der Kampf gerade für Gespräche, Gnadenstoß und Jubel still, und die sollen zu hören sein
// Während der Ladebildschirm (Schmied) zu sehen ist, bleiben Geräusche und Stimmen still (Wunsch Thomas 26.10.); Musik läuft weiter
function enabled(music){const b=M.s.battle;return ctx&&ctx.state==='running'&&!document.hidden&&(music||!M.sceneLoader?.active)&&!(b?.paused&&!b.mission)&&!!M.s.options[music?'music':'sound'];}
function note(f,d=.2,instrument='triangle',vol=.1,at=ctx?.currentTime||0,music=false,end=null,pan=0){if(!enabled(music)||active>=52||(music&&musicVoices>=28))return;active++;if(music)musicVoices++;
 const o=ctx.createOscillator(),g=ctx.createGain(),filter=ctx.createBiquadFilter(),p=ctx.createStereoPanner();at=Math.max(ctx.currentTime,at);if(waves[instrument])o.setPeriodicWave(waves[instrument]);else o.type=instrument;o.frequency.setValueAtTime(Math.max(20,f),at);if(end)o.frequency.exponentialRampToValueAtTime(Math.max(20,end),at+d);
 filter.type='lowpass';filter.frequency.setValueAtTime(instrument==='horn'?2300:instrument==='strings'?1400:6500,at);p.pan.value=pan;
 const attack=instrument==='strings'?.09:instrument==='horn'?.025:.004;g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(vol,at+Math.min(d*.2,attack));g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol*.55),at+d*.6);g.gain.exponentialRampToValueAtTime(.0001,at+d);
 o.connect(filter);filter.connect(g);g.connect(p);p.connect(music?musicBus:fxBus);o.onended=()=>{active--;if(music)musicVoices--;for(const node of [o,filter,g,p])node.disconnect();};o.start(at);o.stop(at+d+.015);
}
function noise(d,vol,freq,type='lowpass',at=ctx?.currentTime||0,music=false,pan=0){if(!enabled(music)||active>=52||(music&&musicVoices>=28))return;active++;if(music)musicVoices++;const src=ctx.createBufferSource(),g=ctx.createGain(),filter=ctx.createBiquadFilter(),p=ctx.createStereoPanner();at=Math.max(ctx.currentTime,at);src.buffer=noiseBuffer;filter.type=type;filter.frequency.value=freq;filter.Q.value=.75;p.pan.value=pan;g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(vol,at+.005);g.gain.exponentialRampToValueAtTime(.0001,at+d);src.connect(filter);filter.connect(g);g.connect(p);p.connect(music?musicBus:fxBus);src.onended=()=>{active--;if(music)musicVoices--;for(const node of [src,filter,g,p])node.disconnect();};src.start(at,Math.random()*.65);src.stop(at+d+.015);}
function drum(at,strong=true,music=true,vol=1){note(strong?112:165,strong?.26:.16,'sine',.22*vol,at,music,strong?43:68);noise(.06,.08*vol,strong?850:1350,'lowpass',at,music);}
/* Missionen (Plünderungen) stehen für Gespräche still (paused): Stimmen und Geräusche müssen dann trotzdem hörbar bleiben.
   Vorher drehte das die Lautstärke für Geräusche UND Stimmen auf null – die Stimme lief, war aber stumm (Thomas 26.10.). */
function tick(){if(!ctx)return;const b=M.s.battle,live=!document.hidden&&(!b?.paused||!!b.mission);
 musicBus.gain.setTargetAtTime(0,ctx.currentTime,.06);fxBus.gain.setTargetAtTime(live&&M.s.options.sound?.7:0,ctx.currentTime,.025);
 songTick();scene=M.s.battle&&!M.s.battle.finale?'battle':'home';}
function start(){if(!init())return;ctx.resume().catch(()=>{});ksWarmup();if(!timer)timer=setInterval(tick,40);tick();}
// ---- Neue Kampfgeräusche (kampfsound.js, im Editor kampfsound-editor.html einstellbar): alte Namen → neue Vorlagen.
// Änderungen aus dem Editor (localStorage „mg-kampfsound-v1“) gelten auch hier. Namen ohne Eintrag klingen wie bisher.
const KMAP={boneCrack:['boneCrack'],skullCrack:['skullCrack'],jubel:['jubel1'],boo:['boo1'],step:['step',.45],slash:['hitBlade'],heavy:['hitBlunt'],hit:['hitBlade'],backstab:['backstab'],sever:['sever'],stick:['hitStab'],lodge:['arrowShield'],block:['blockShield'],armorhit:['armorHit'],parry:['parry'],fall:['fall'],rise:['rise',.8],sand:['sand'],land:['land'],rush:['rush'],crowd:['crowd',.75],roar:['roar'],gong:['gong'],win:['win'],mercy:['mercy'],verdictDeath:['verdictDeath'],die:['die'],gold:['coin'],coin:['coin'],coins:['coin'],throw:['throw'],net:['net'],bow:['bow'],crossbow:['crossbow'],reload:['reload',.8],arrowBody:['arrowBody'],arrowSand:['arrowSand'],swing:['swing',.6],swingHeavy:['swingHeavy',.7]};
// Publikum bei der Vorstellung: 'applause' = dezentes Klatschen in Schleife (Veteranen), 'laugh' = Gelächter (Trottel), null = Ruhe.
let moodLoop=null,moodTimer=0;
// 'boo' = kurz buhen (schwacher Kämpfer), 'booLong' = buhen bis zur Entscheidung, 'clap' = Klatschen für ein paar Sekunden
let moodKind=null;
function crowdMood(kind){if(kind==='endBoo'){if(moodKind!=='booLong')return;kind=null;}moodKind=kind;clearInterval(moodTimer);moodTimer=0;if(moodLoop){const L=moodLoop;moodLoop=null;try{L.g.gain.setTargetAtTime(0,ctx.currentTime,.25);setTimeout(()=>{try{L.s.stop();L.s.disconnect();L.g.disconnect();}catch{}},900);}catch{}}
 if(!kind||!ctx||!enabled(false)||!window.KampfSound)return;
 if(kind==='applause'){try{const b=window.KampfSound.buffer(ctx,'applause');if(!b)return;const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=b;s.loop=true;s.loopEnd=Math.min(b.duration,6.4);g.gain.value=0;g.gain.setTargetAtTime(.75,ctx.currentTime,.35);s.connect(g);g.connect(fxBus);s.start();moodLoop={s,g};}catch{}}
 else if(kind==='laugh'){ks(variant('laugh')||'laugh',.95);let n=0;moodTimer=setInterval(()=>{if(++n>3||!enabled(false)){clearInterval(moodTimer);return;}ks(variant('laugh')||'laugh',.7+Math.random()*.25);},3200+Math.random()*900);}
 else if(kind==='boo'||kind==='booLong'){ks(variant('boo')||'boo1',.6);let n=0;const max=kind==='boo'?1:10;moodTimer=setInterval(()=>{if(++n>max||!enabled(false)){clearInterval(moodTimer);return;}ks(variant('boo')||'boo1',.5+Math.random()*.15);},2100);}
 else if(kind==='clap'){crowdMood('applause');moodKind='clap';ks(variant('cheer')||'crowd',.5,.2);setTimeout(()=>{if(moodKind==='clap')crowdMood(null);},5200);}}
M.crowdMood=crowdMood;
// Stimmlage in fünf Stufen nach Erfahrung (Kämpfe, dazu Erfahrungswert über dem Rekrutenschnitt): Rekruten hell, Veteranen tief.
// Wird beim Kämpfer als g.stimmlage (1 = hell … 5 = tief) vermerkt und im Profil angezeigt. Nur Ton, keine Spielregel.
const TIERS=[[1.26,'hell (Rekrut)'],[1.13,'eher hell'],[1,'mittel'],[.89,'eher tief'],[.79,'tief (Veteran)']];
function voiceTier(g){if(!g)return 3;const n=(g.fights||0)+Math.max(0,(g.stats?.experience||20)-20)/4,s=n<2?1:n<6?2:n<15?3:n<30?4:5;if(g.stimmlage!==s)g.stimmlage=s;return s;}
function voicePitch(g){return TIERS[voiceTier(g)-1][0];}
M.voiceTier=voiceTier;M.voicePitch=voicePitch;M.voiceLabel=g=>TIERS[voiceTier(g)-1][1];
let lastRoar=0;const roarKey=()=>{let n;do{n=1+Math.floor(Math.random()*20);}while(n===lastRoar);lastRoar=n;return 'bruell'+String(n).padStart(2,'0');};
const VMAP={battlecry:'cry',death:'deathScream',effort:'effort',dying:'dying'};
let ksVoices=0,ksWarm=false;
// Varianten: jede Gruppe wechselt zufällig durch, nie zweimal dieselbe hintereinander
const VAR={pain:'pain01 pain02 pain03 pain04 pain05 pain06 pain07 pain08 pain09 pain10 pain11 pain12 pain13 pain14'.split(' '),hurt:'hurt01 hurt02 hurt03 hurt04 hurt05 hurt06 hurt07 hurt08'.split(' '),
 cheer:['cheer1','cheer2','cheer3','cheer4','crowd'],laugh:['laugh1','laugh2','laugh3','laugh4','laugh5'],jubel:['jubel1','jubel2','jubel3'],ooh:['ooh1','ooh2','ooh3','roar'],boo:['boo1','boo2'],warcry:['warcry1','warcry2','warcry3','warcry4']};
const lastVar={};function variant(g){const L=VAR[g].filter(k=>window.KampfSound?.DEF?.[k]);if(!L.length)return null;let k;do{k=L[Math.floor(Math.random()*L.length)];}while(L.length>1&&k===lastVar[g]);lastVar[g]=k;return k;}
const heavyKey=k=>/^(cheer|jubel|ooh|boo|warcry|laugh|applause|crowd|roar|gong|win|mercy|verdictDeath)/.test(k);
// Publikum gibt es nur in der Arena (nicht im Abenteuer, nicht bei der Hundejagd)
function arenaCrowd(){const b=M.s.battle;return !!b&&!raidOn()&&!b.hundefang;}
let crowdNext=0,warNext=0;
function crowdReact(g,vol=.6,at=0){if(!ctx||!arenaCrowd()||ctx.currentTime<crowdNext)return;const k=variant(g);if(!k)return;crowdNext=ctx.currentTime+3.2+Math.random()*2;ks(k,vol,at);}
function warcry(vol=.6,at=0){if(!ctx||ctx.currentTime<warNext)return;const k=variant('warcry');if(!k)return;warNext=ctx.currentTime+14+Math.random()*8;ks(k,vol,at);}
M.crowdReact=(g,vol)=>{if(enabled(false))crowdReact(g,vol);};
function ks(k,vol=1,at=0,pitch=1){const K=window.KampfSound;if(!K?.DEF?.[k])return false;if(ksVoices>30)return true;try{const s=K.play(ctx,fxBus,k,{vol,at:ctx.currentTime+at,pitch,max:heavyKey(k)?1:2});if(s){ksVoices++;s.addEventListener('ended',()=>{ksVoices--;});}}catch(e){return false;}return true;}
// Vorrechnen in kleinen Schritten, damit der erste Treffer im Kampf nicht ruckelt
function ksWarmup(){if(ksWarm||!window.KampfSound||!ctx)return;ksWarm=true;const keys=[...new Set([...Object.values(KMAP).map(v=>v[0]),...Object.values(VMAP),'painLight','painScream','arrow','applause','laugh'])];const jobs=[];const all=[...new Set([...keys,...VAR.cheer,...VAR.jubel,...VAR.ooh,...VAR.boo,...VAR.warcry,...VAR.laugh])];for(let n=0;n<2;n++)for(const k of all)if(n===0||!heavyKey(k))jobs.push([k,1]);for(const k of Object.values(VMAP).concat(VAR.pain,VAR.hurt))for(const [p] of TIERS)jobs.push([k,p]);for(let n=1;n<=20;n++)for(const [p] of TIERS)jobs.push(['bruell'+String(n).padStart(2,'0'),p]);let i=0;const idle=f=>window.requestIdleCallback?requestIdleCallback(f,{timeout:400}):setTimeout(f,35);const next=()=>{if(i>=jobs.length)return;try{window.KampfSound.buffer(ctx,jobs[i][0],{pitch:jobs[i][1],max:heavyKey(jobs[i][0])?1:2});}catch{}i++;idle(next);};setTimeout(()=>idle(next),400);}
function voice(kind='pain',pitch=1,strong=false){if(!enabled(false)||ctx.currentTime-lastVoice<.22||active>44)return;lastVoice=ctx.currentTime;
 if(window.KampfSound){if(kind==='pain'&&!strong&&Math.random()<.4)return;const k=kind==='battlecry'&&window.KampfSound.DEF.bruell01?roarKey():VMAP[kind]||(kind==='crowd'?'roar':kind==='pain'?(variant(strong?'hurt':'pain')||(strong?'painScream':'painLight')):strong?'painScream':'painLight'),p=Math.round(Math.max(.7,Math.min(1.4,pitch||1))*100)/100;if(ks(k,kind==='effort'?.6:kind==='battlecry'?.7:kind==='pain'?(strong?.75:.62):.9,0,p))return;}const t=ctx.currentTime,p=Math.max(.6,Math.min(1.5,pitch||1)),d=strong?.32:.19;if(kind==='battlecry'){note(150*p,.46,'sawtooth',.065,t,false,105*p);note(290*p,.38,'triangle',.045,t+.03,false,210*p);noise(.34,.07,900,'bandpass',t,false);return;}note(125*p,d,'triangle',strong?.13:.075,t,false,82*p);noise(d*.7,strong?.095:.05,kind==='crowd'?800:570,'bandpass',t,false);note(255*p,d*.6,'sine',.032,t+.02,false,170*p);}
function sound(type){if(!enabled(false))return;const t=ctx.currentTime,wait=type==='step'?.11:type==='crowd'?1.5:['block','armorhit'].includes(type)?.07:.04;if(t-(recent.get(type)??-10)<wait)return;recent.set(type,t);const v=.93+Math.random()*.14;
 {if(window.KampfSound&&type==='partyClap'){ksWarmup();ks('partyClap',1.15);return;}/* lautes Klatschen der eigenen Truppe (Plünderungen) */
 if(window.KampfSound&&(type==='laugh'||type==='partyCheer')){ksWarmup();ks(variant(type==='laugh'?'laugh':'jubel')||(type==='laugh'?'laugh':'jubel1'),type==='laugh'?.8:.7);return;}/* Gelächter/Jubel der eigenen Truppe (Plünderungen), unabhängig vom Publikum */const km=KMAP[type];if(km&&window.KampfSound){ksWarmup();if(type==='crowd'){crowdReact('cheer',.6);return;}if(type==='roar'){crowdReact('ooh',.6);return;}if(type==='jubel'){crowdNext=0;crowdReact('jubel',.65,.15);return;}if(type==='boo'){crowdReact('boo',.55);return;}
  if(ks(km[0],(km[1]??1)*v)){if(type==='bow'||type==='crossbow')ks('arrow',.85,.03);if(type==='win'&&arenaCrowd())ks(variant('cheer')||'crowd',.65,.25);
   const n=M.s.battle?.actors?.filter?.(a=>!a.down&&!a.g?.dead).length||0;if(type==='gong'&&n>=4)warcry(.65,.9);if(type==='rush'&&n>=8)warcry(.45);if(type==='fall'&&arenaCrowd()){const r=Math.random();if(r<.3)crowdReact('ooh',.5,.2);else if(r<.42){crowdNext=0;ks(variant('laugh')||'laugh',.6,.25);crowdNext=ctx.currentTime+4;}}
   return;}}}
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
// Handy: Nach dem Zurückholen lässt sich der Ton oft erst mit der nächsten Berührung wieder starten (iOS „interrupted“, Android ohne Geste)
for(const ev of ['pointerdown','touchend','keydown'])document.addEventListener(ev,()=>{if(ctx&&ctx.state!=='running'&&!document.hidden)ctx.resume().catch(()=>{});},{capture:true,passive:true});
// Knochenbrüche hörbar machen (Wunsch Thomas 26.10.): nach jedem Kampfschritt neu gebrochene Knochen des sichtbaren Kampfs erkennen
// (Bruch, Zertrümmerung, Schädelbruch) und ein Knacken spielen. Nur Anzeige: liest die Körperteile, ändert nichts am Kampf.
// Brüche, die schon vor dem Kampf bestanden, knacken nicht.
{const seen=new WeakSet();let lastB=null;const scan=(b,quiet)=>{let crack=0,skull=0;for(const a of b.actors||[]){const body=a.g?.body;if(!body)continue;for(const k in body){const p=body[k];if(!p)continue;
  const f=p.fracture;if(f&&typeof f==='object'&&!seen.has(f)){seen.add(f);if(!quiet){if(p.skullFracture||f.skull)skull++;else crack++;}}}}
 if(skull)sound('skullCrack');else if(crack)sound('boneCrack');};
 const step0=M.fixedStep;if(typeof step0==='function'){M.fixedStep=function(){const r=step0.apply(this,arguments);try{const b=M.s.battle;if(b&&(b.actors?.length||0)<=80){if(b!==lastB){lastB=b;scan(b,true);}else scan(b,false);}}catch(e){}return r;};}}
M.audioEngine={start,sound,voice,
 // Sprechstimmen (sprech-game.js): Ausgang für Sprache, nur wenn Geräusche an sind
 voiceOut:()=>enabled(false)?{ctx,bus:fxBus}:null,
 crowdMood,
 duck:v=>{duckT=Math.max(0,Math.min(1,v??1));if(musicBus&&ctx)musicBus.gain.setTargetAtTime(.34*duckT,ctx.currentTime,.12);},
 // Schmiede-Party: Uhr und Sprungmarken des Schmiede-Liedes (nur lesen bzw. umstellen, die Wiedergabe steuert weiter songTick).
 smithClock:()=>{const t=songs.smith;return{idx:t.idx,time:t.el?t.el.currentTime||0:0,playing:!!(t.playing&&t.el&&!t.el.paused)};},
 smithSeek:u=>{const t=songs.smith,first=132.4,idx=u<first?0:1;t.idx=idx;if(!t.el||!t.ext)return;const want='music/'+t.files[idx]+'.'+t.ext;if(!t.el.src.endsWith(want))t.el.src=want;try{t.el.currentTime=idx?u-first:u;}catch{}if(t.playing){const p=t.el.play();if(p?.catch)p.catch(()=>{t.playing=false;});}},
 diagnostics:()=>({active,musicVoices,scene,song:songs.home.playing?'home':songs.battle.playing?'battle':songs.smith.playing?'smith':songs.hall.playing?'hall':songs.raid.playing?'raid':songs.medic.playing?'medic':'',state:ctx?.state||'not-started'})};
})();
