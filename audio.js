'use strict';
(()=>{
const M=window.MG;
// One audio clock, two buses and a fixed voice budget, independent of simulation RNG/speed.
let ctx,musicBus,fxBus,fightBus=null,impactBus=null,distBus=null,crowdE=0,master,timer,scene='',noiseBuffer,waves={},active=0,musicVoices=0,lastVoice=-10;
// Spielfeld (Ludus/Menüs): „Ludus at Sunset“ und „Arena Theory 1“ laufen abwechselnd nacheinander (Liste wie bei der Schmiede).
// Aufgenommene Lieder: gestreamt (kein Dekodieren in den Arbeitsspeicher), erst beim ersten Bedarf geladen. Ludus/Menüs und Kampfszenen (Arenakampf, Intro) haben je ein Lied. Die frühere erzeugte Musik ist entfernt; Geräusche laufen weiter über die Web-Audio-Stimmen unten.
const songs={home:{file:'ludus-at-sunset',files:['ludus-at-sunset','arena-theory-1'],idx:0,ext:'',el:null,broken:false,level:0,playing:false},battle:{file:'medieval-techno',only:'mp3',el:null,broken:false,level:0,playing:false},smith:{file:'smith-the-motherfucker',files:['smith-the-motherfucker','smyth'],idx:0,ext:'',el:null,broken:false,level:0,playing:false},hall:{file:'aula-lorum',el:null,broken:false,level:0,playing:false},raid:{file:'arena-theory',el:null,broken:false,level:0,playing:false},medic:{file:'medicus-bill',el:null,broken:false,level:0,playing:false},
 // Kampflied (Arenakampf, Intro): „Medieval Techno“ (Wunsch Thomas 10.11.2026, ersetzt „Sanguis et Gloria“) – nur als MP3 vorhanden
 // Hundsgraf (hundefang.js): Vorstellung, Aufträge, Fernglas, Hundebuch, Zwinger – nur als MP3 vorhanden
 beast:{file:'beastrium',only:'mp3',el:null,broken:false,level:0,playing:false},
 // Rabies' eigenes Lied „Invisible Hound“: sein Vorstellungsfilm, Fernglas und Hundebuch, sein Karren (Aufträge) – wie beim Schmied
 rabies:{file:'rabies-invisible-hound',only:'mp3',el:null,broken:false,level:0,playing:false},
 // „You Bleed, I Get Paid“ (Wunsch Thomas 7.11.): bei allen Kampfberichten und bei der Abrechnung beim Lanista (Überlebende beschweren sich) – fängt
 // von vorn an, wenn es länger als 15 s nicht lief; nur als MP3 vorhanden
 report:{file:'you-bleed-i-get-paid',only:'mp3',fresh:true,el:null,broken:false,level:0,playing:false}};
function songWanted(){if(document.querySelector?.('.scene-silence'))return '';if(window.ArenaTheoryIntro?.active?.()||!M.s.options.music||document.hidden)return '';if(reportOn())return 'report';if(raidOn())return 'raid';if(M.s.battle?.paused)return '';if(M.s.battle||M.intro?.active?.())return 'battle';if(medicOn())return 'medic';{const hf=M.hundefang?.music?.();if(hf)return hf;}const hall=M.hall?.music?.();if(hall)return hall;return smithOnStage()?'smith':'home';}
// Kampfberichte: Ergebnisbild der Arena (mit Bericht, auch Hunde) und des Boxkampfs (nicht Hunderennen), Ergebnis der Aufstellung, Plünderungs-Ergebnis, Hundefang-Ergebnis,
// die Seite „Kampfbericht“ – und die Abrechnung beim Lanista (lanista-gier.js). Hat Vorrang vor Kampf- und Plünderungslied.
function reportOn(){return M.ui?.getPage?.()==='report'||!!document.querySelector?.('.an-res:not(.hr-res),.a-learn,.a-ticker,.ow-report,#hfResult,.lg-scene:not(.out)');}
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
function songStop(t){if(t.el&&t.playing){t.playing=false;t.stopAt=Date.now();t.level=0;t.el.pause();}}
// Hat der Browser ein gewünschtes Lied von sich aus angehalten (Handy: Audio-Unterbrechung, Ladepause, Speicher), läuft es an derselben Stelle weiter – kein Neustart.
// Sprechstimmen: Musik wird leiser, solange jemand spricht (duck 0–1), damit die Stimme nicht untergeht
let duckT=1,duckC=1;
function songTick(){const wanted=songWanted();for(const key in songs){const t=songs[key],want=wanted===key&&songReady(t);if(!t.el||t.broken)continue;t.level+=((want?.42:0)-t.level)*.12;duckC+=(duckT-duckC)*.22;if(want&&!t.playing){t.playing=true;if(t.fresh&&Date.now()-(t.stopAt||0)>15000){try{t.el.currentTime=0;}catch{}}const p=t.el.play();if(p?.catch)p.catch(()=>{t.playing=false;});}else if(want&&t.el.paused&&Date.now()-(t.retry||0)>700){t.retry=Date.now();const p=t.el.play();if(p?.catch)p.catch(()=>{});}else if(t.playing&&t.level<.02)songStop(t);try{t.el.volume=Math.max(0,Math.min(1,t.level*duckC));}catch{}}}
const recent=new Map(),hz=n=>440*Math.pow(2,(n-69)/12);
function init(){if(ctx)return true;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;try{
 ctx=new AC();master=ctx.createGain();master.gain.value=.62;musicBus=ctx.createGain();fxBus=ctx.createGain();musicBus.gain.value=.34;fxBus.gain.value=.7;
 const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-17;compressor.knee.value=18;compressor.ratio.value=4;compressor.attack.value=.004;compressor.release.value=.16;musicBus.connect(master);fxBus.connect(master);master.connect(compressor);compressor.connect(ctx.destination);
 const delay=ctx.createDelay(.5),feedback=ctx.createGain(),send=ctx.createGain(),low=ctx.createBiquadFilter();delay.delayTime.value=.205;feedback.gain.value=.19;send.gain.value=.12;low.type='lowpass';low.frequency.value=2200;musicBus.connect(delay);delay.connect(low);low.connect(feedback);feedback.connect(delay);low.connect(send);send.connect(master);
 /* Zuschauer-Kulisse (zuschauer.js, 10.11.2026): Kämpfer (Treffer, Schreie, Kampfrufe) laufen über fightBus – in der Arena weiter weg und hallend, das Publikum direkt */
 fightBus=ctx.createGain();impactBus=ctx.createGain();try{if(window.Zuschauer?.distance){distBus=window.Zuschauer.distance(ctx,fxBus);fightBus.connect(distBus.input);impactBus.connect(distBus.impact);}else{fightBus.connect(fxBus);impactBus.connect(fxBus);}}catch{distBus=null;try{fightBus.connect(fxBus);impactBus.connect(fxBus);}catch{}}
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
 o.connect(filter);filter.connect(g);g.connect(p);p.connect(music?musicBus:fightBus||fxBus);o.onended=()=>{active--;if(music)musicVoices--;for(const node of [o,filter,g,p])node.disconnect();};o.start(at);o.stop(at+d+.015);
}
function noise(d,vol,freq,type='lowpass',at=ctx?.currentTime||0,music=false,pan=0){if(!enabled(music)||active>=52||(music&&musicVoices>=28))return;active++;if(music)musicVoices++;const src=ctx.createBufferSource(),g=ctx.createGain(),filter=ctx.createBiquadFilter(),p=ctx.createStereoPanner();at=Math.max(ctx.currentTime,at);src.buffer=noiseBuffer;filter.type=type;filter.frequency.value=freq;filter.Q.value=.75;p.pan.value=pan;g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(vol,at+.005);g.gain.exponentialRampToValueAtTime(.0001,at+d);src.connect(filter);filter.connect(g);g.connect(p);p.connect(music?musicBus:fightBus||fxBus);src.onended=()=>{active--;if(music)musicVoices--;for(const node of [src,filter,g,p])node.disconnect();};src.start(at,Math.random()*.65);src.stop(at+d+.015);}
function drum(at,strong=true,music=true,vol=1){note(strong?112:165,strong?.26:.16,'sine',.22*vol,at,music,strong?43:68);noise(.06,.08*vol,strong?850:1350,'lowpass',at,music);}
/* Missionen (Plünderungen) stehen für Gespräche still (paused): Stimmen und Geräusche müssen dann trotzdem hörbar bleiben.
   Vorher drehte das die Lautstärke für Geräusche UND Stimmen auf null – die Stimme lief, war aber stumm (Thomas 26.10.). */
function tick(){if(!ctx)return;const b=M.s.battle,live=!document.hidden&&(!b?.paused||!!b.mission);
 musicBus.gain.setTargetAtTime(0,ctx.currentTime,.06);fxBus.gain.setTargetAtTime(live&&M.s.options.sound?.7:0,ctx.currentTime,.025);
 songTick();scene=M.s.battle&&!M.s.battle.finale?'battle':'home';try{distBus?.update(arenaCrowd()&&!reportOn(),crowdE);}catch{}}
function start(){if(!init())return;ctx.resume().catch(()=>{});ksWarmup();if(!timer)timer=setInterval(tick,40);tick();}
// ---- Neue Kampfgeräusche (kampfsound.js, im Editor kampfsound-editor.html einstellbar): alte Namen → neue Vorlagen.
// Änderungen aus dem Editor (localStorage „mg-kampfsound-v1“) gelten auch hier. Namen ohne Eintrag klingen wie bisher.
const KMAP={boneCrack:['boneCrack'],skullCrack:['skullCrack'],jubel:['jubel1'],boo:['boo1'],step:['step',.45],slash:['hitBlade'],heavy:['hitBlunt'],hit:['hitBlade'],backstab:['backstab'],sever:['sever'],stick:['hitStab'],lodge:['arrowShield'],block:['bk_schild'],armorhit:['armorHit'],parry:['bk_klinge'],fall:['fall'],rise:['rise',.8],sand:['sand'],land:['land'],rush:['rush'],crowd:['crowd',.75],roar:['roar'],gong:['gong'],win:['win'],mercy:['mercy'],verdictDeath:['verdictDeath'],die:['die'],gold:['coin'],coin:['coin'],coins:['coin'],throw:['throw'],net:['net'],bow:['bow'],crossbow:['crossbow'],reload:['reload',.8],arrowBody:['arrowBody'],arrowSand:['arrowSand'],swing:['swing',.6],swingHeavy:['swingHeavy',.7]};
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
/* Kleinwuchs sehr hohe, Riesenwuchs tiefe Stimme (Wunsch Thomas 4.11.): immer deutlich über bzw. unter allen normalen Stimmlagen (1,26–0,79), Erfahrung verschiebt nur leicht. */
const statPitch=(g,base)=>g?.stature==='dwarf'?1.58+(base-1)*.3:g?.stature==='giant'?.62+(base-1)*.3:base;
function voicePitch(g){vpG=g||null;return statPitch(g,TIERS[voiceTier(g)-1][0]);}
M.voiceTier=voiceTier;M.voicePitch=voicePitch;M.voiceLabel=g=>TIERS[voiceTier(g)-1][1];
let lastRoar=0;const roarKey=()=>{let n;do{n=1+Math.floor(Math.random()*20);}while(n===lastRoar);lastRoar=n;return 'bruell'+String(n).padStart(2,'0');};
const VMAP={battlecry:'cry',death:'deathScream',effort:'effort',dying:'dying'};
let ksVoices=0,ksWarm=false;
// Varianten: jede Gruppe wechselt zufällig durch, nie zweimal dieselbe hintereinander
const VAR={pain:'pain01 pain02 pain03 pain04 pain05 pain06 pain07 pain08 pain09 pain10 pain11 pain12 pain13 pain14'.split(' '),hurt:'hurt01 hurt02 hurt03 hurt04 hurt05 hurt06 hurt07 hurt08'.split(' '),
 cheer:['cheer1','cheer2','cheer3','cheer4','crowd'],laugh:['laugh1','laugh2','laugh3','laugh4','laugh5'],jubel:['jubel1','jubel2','jubel3'],ooh:['ooh1','ooh2','ooh3','roar'],boo:['boo1','boo2'],warcry:['warcry1','warcry2','warcry3','warcry4']};
const lastVar={};function variant(g){const L=VAR[g].filter(k=>window.KampfSound?.DEF?.[k]);if(!L.length)return null;let k;do{k=L[Math.floor(Math.random()*L.length)];}while(L.length>1&&k===lastVar[g]);lastVar[g]=k;return k;}
// Publikumsklänge gehen direkt auf fxBus, alles von den Kämpfern über fightBus (Entfernung/Hall)
// Aufprall (Treffer, Blocks, Paraden, Knochenknacken) bleibt in der Arena gut hörbar: direkt und trocken (kein Arenahall, sonst klingen die kurzen bk_-Blocks wieder lang nach), nicht leiser bei Jubel
const impactKey=k=>/^(hit|backstab|sever|boneCrack|skullCrack|block|parry|armorHit|arrowBody|arrowShield|bk_|tr_|box)/.test(k);
const crowdKey=k=>/^(cheer|jubel|ooh|boo|laugh|applause|crowd|roar|gong|win|mercy|verdictDeath|coin|partyClap)/.test(k);
const heavyKey=k=>/^(cheer|jubel|ooh|boo|warcry|laugh|applause|crowd|roar|gong|win|mercy|verdictDeath)/.test(k);
// Publikum gibt es nur in der Arena (nicht im Abenteuer, nicht bei der Hundejagd)
function arenaCrowd(){const b=M.s.battle;return !!b&&!raidOn()&&!b.hundefang;}
let crowdNext=0,warNext=0;
function crowdReact(g,vol=.6,at=0){if(!ctx||!arenaCrowd()||ctx.currentTime<crowdNext)return;const k=variant(g);if(!k)return;crowdNext=ctx.currentTime+3.2+Math.random()*2;ks(k,vol,at);}
function warcry(vol=.6,at=0){if(!ctx||ctx.currentTime<warNext)return;const k=variant('warcry');if(!k)return;warNext=ctx.currentTime+14+Math.random()*8;ks(k,vol,at);}
M.crowdReact=(g,vol)=>{if(enabled(false))crowdReact(g,vol);};
function ks(k,vol=1,at=0,pitch=1){const K=window.KampfSound;if(!K?.DEF?.[k])return false;if(ksVoices>30)return true;try{if(window.Zuschauer?.notify&&arenaCrowd()){if(/^(bk_|block|parry|arrowShield)/.test(k))window.Zuschauer.notify('block');else if(/Crack$/.test(k))window.Zuschauer.notify('crack');else if(k==='fall')window.Zuschauer.notify('fall');}
 const s=K.play(ctx,crowdKey(k)?fxBus:impactKey(k)?impactBus||fxBus:fightBus||fxBus,k,{vol,at:ctx.currentTime+at,pitch,max:heavyKey(k)?1:2});if(s){ksVoices++;s.addEventListener('ended',()=>{ksVoices--;});}}catch(e){return false;}return true;}
// Vorrechnen in kleinen Schritten, damit der erste Treffer im Kampf nicht ruckelt
function ksWarmup(){if(ksWarm||!window.KampfSound||!ctx)return;ksWarm=true;setTimeout(screamWarmup,600);const keys=[...new Set([...Object.values(KMAP).map(v=>v[0]),...Object.values(VMAP),'painLight','painScream','arrow','applause','laugh',...(M.blockContact||M.hitContact?Object.keys(window.KampfSound.DEF).filter(k=>/^(bk|tr)_/.test(k)):[])])];const jobs=[];const all=[...new Set([...keys,...VAR.cheer,...VAR.jubel,...VAR.ooh,...VAR.boo,...VAR.warcry,...VAR.laugh])];for(let n=0;n<2;n++)for(const k of all)if(n===0||!heavyKey(k))jobs.push([k,1]);for(const k of Object.values(VMAP).concat(VAR.pain,VAR.hurt))for(const [p] of TIERS)jobs.push([k,p]);for(let n=1;n<=20;n++)for(const [p] of TIERS)jobs.push(['bruell'+String(n).padStart(2,'0'),p]);let i=0;const idle=f=>window.requestIdleCallback?requestIdleCallback(f,{timeout:400}):setTimeout(f,35);const next=()=>{if(i>=jobs.length)return;const [k,p]=jobs[i++],o={pitch:p,max:heavyKey(k)?1:2};/* Hintergrund-Worker: eins nach dem anderen, das Bild läuft weiter (Bericht 27.10.) */let job=null;try{job=window.KampfSound.prefill?.(ctx,k,o);}catch{}if(job){job.then(()=>idle(next),()=>idle(next));return;}try{window.KampfSound.buffer(ctx,k,o);}catch{}idle(next);};setTimeout(()=>idle(next),400);}
// ---------- Schreie (seit 2.11.2026): schreie.js, gerechnet in schrei-worker.js ----------
// Jede Figur bekommt Schreie in ihrer Stimme: Männer nach Stimmlage (Erfahrung) und Größe, Frauen eigene Lage, Veteranen und
// Vernarbte rauer. M.voice wird überall mit M.voicePitch(g) aufgerufen – voicePitch merkt sich dabei die Figur (vpG).
// Je Art und Stimmtyp liegen bis zu zwei fertige Varianten bereit (benutzte werden laufend durch neue ersetzt); fehlt noch eine, klingt dieses eine Mal der alte Laut.
let vpG=null,swk=null,swkOk=typeof Worker==='function',sseq=0,sBusy=false;const SPOOL=new Map(),SWAIT=new Map(),SQ=[],SLAST={};
const SCR={pain:['uff','ugh','agh','au','autsch','hngh','aechz','zisch'],hurt:['aargh','kiekser','bruell','verbissen','stoss'],death:['tod','erstickt','roecheln','tod'],dying:['roecheln','atemzug'],effort:['hah','hyah'],battlecry:['wut','kampf']};
const SINT={pain:.6,hurt:.85,death:1,dying:.6,effort:.7,battlecry:.9};
function scrFig(g,pitch){const fem=g?.sex==='female',tier=g?voiceTier(g):TIERS.findIndex(t=>t[0]<=(pitch||1)+.01)+1||3,h=g?.height||(fem?168:180),sz=h>192?'L':h<172?'S':'M',scar=(g?.scars||[]).length>0;
 const f0=Math.round(fem?205*(1+(3-tier)*.03)*(g?.stature==='dwarf'?1.3:g?.stature==='giant'?.75:1):112*statPitch(g,TIERS[tier-1][0])),size=g?.stature==='dwarf'?.8:g?.stature==='giant'?1.24:fem?{S:.82,M:.85,L:.9}[sz]:{S:.95,M:1.02,L:1.12}[sz];
 return {key:(fem?'w':'m')+tier+sz+(g?.stature?g.stature[0]:''),fig:{f0,size,rough:Math.min(.4,.05+(tier>=4?.15:0)+(scar?.08:0)),breath:fem?.15:.07}};}
function sWorker(){if(!swkOk)return null;if(swk)return swk;try{swk=new Worker('schrei-worker.js?v='+(window.ARENA_BUILD||''));swk.onmessage=e=>{const w=SWAIT.get(e.data?.id);if(w){SWAIT.delete(e.data.id);w(e.data);}};swk.onerror=()=>{swkOk=false;swk=null;for(const [,w] of SWAIT)w({error:'worker'});SWAIT.clear();};}catch{swkOk=false;swk=null;}return swk;}
function sPump(){if(sBusy||!SQ.length||!ctx)return;const W=sWorker();if(!W){SQ.length=0;return;}const j=SQ.shift();sBusy=true;const id=++sseq;
 SWAIT.set(id,R=>{sBusy=false;j.pend.n--;if(!R.error&&R.data?.length){try{const b=ctx.createBuffer(1,R.data.length,R.sr||32000);b.getChannelData(0).set(R.data);const L=SPOOL.get(j.pk);if(L&&L.length<2)L.push(b);}catch{}}setTimeout(sPump,30);});
 W.postMessage({id,sid:j.sid,fig:j.fig,intensity:SINT[j.kind]??.75,seed:Math.floor(Math.random()*1e9)});}
function sFill(kind,F){const pk=kind+'|'+F.key;let L=SPOOL.get(pk);if(!L){L=[];L.pend={n:0};SPOOL.set(pk,L);}if(L.length+L.pend.n<2&&SQ.length<60){L.pend.n++;SQ.push({pk,kind,fig:F.fig,sid:SCR[kind][Math.floor(Math.random()*SCR[kind].length)],pend:L.pend});sPump();}return L;}
function scream(kind,g,pitch,vol){if(!SCR[kind]||!window.Schrei&&!swkOk)return false;const F=scrFig(g,pitch),L=sFill(kind,F);if(!L.length)return false;
 let i=Math.floor(Math.random()*L.length);if(L.length>1&&L[i]===SLAST[kind])i=(i+1)%L.length;const b=L[i];SLAST[kind]=b;
 // benutzte Variante nach und nach ersetzen, damit es nicht immer dieselben sind
 if(L.length>=2&&Math.random()<.6){L.splice(i,1);sFill(kind,F);}
 try{const s=ctx.createBufferSource(),gn=ctx.createGain();s.buffer=b;s.playbackRate.value=.97+Math.random()*.06;gn.gain.value=vol;s.connect(gn);gn.connect(fightBus||fxBus);s.start();ksVoices++;s.onended=()=>{ksVoices--;s.disconnect();gn.disconnect();};}catch{return false;}return true;}
function screamWarmup(){if(!swkOk)return;for(let t=1;t<=5;t++){const F=scrFig(null,TIERS[t-1][0]);for(const k of ['pain','hurt','death','effort','battlecry'])sFill(k,F);}const W=scrFig({sex:'female',fights:8},1);for(const k of ['pain','hurt','death'])sFill(k,W);}
// ---------- Publikum: Namenschor mit Klatschen (seit 2.11.2026) ----------
// Streckt ein Kämpfer in der Arena jemanden nieder oder tötet ihn, jubelt das Publikum und brüllt seinen Namen im Chor,
// jedes Mal gefolgt von drei Klatschern („Marcellus! – klatsch, klatsch, klatsch“), 3× nach Niederschlag, 4× nach Tötung,
// 5× und wilder ab dem zweiten Opfer. Immer nur ein Chor zugleich; währenddessen nur Jubel. Spricht der Moderator, ist der
// Chor leiser. Gerechnet in einem eigenen Worker (schrei-worker.js), damit die Kampfschreie nicht warten; die Namen der
// Kämpfer werden zu Kampfbeginn vorbereitet.
let cwk=null,cwkOk=typeof Worker==='function',cseq=0,chantUntil=0,clapB=[],chorB=null;const CWAIT=new Map(),CHOR=new Map();
function cWorker(){if(!cwkOk)return null;if(cwk)return cwk;try{cwk=new Worker('schrei-worker.js?v='+(window.ARENA_BUILD||''));cwk.onmessage=e=>{const w=CWAIT.get(e.data?.id);if(w){CWAIT.delete(e.data.id);w(e.data);}};cwk.onerror=()=>{cwkOk=false;cwk=null;for(const [,w] of CWAIT)w({error:'worker'});CWAIT.clear();};}catch{cwkOk=false;cwk=null;}return cwk;}
function cJob(msg,cb){const W=cWorker();if(!W||!ctx)return false;const id=++cseq;CWAIT.set(id,R=>{if(R.error||!R.data?.length){cb(null);return;}try{const b=ctx.createBuffer(1,R.data.length,R.sr||32000);b.getChannelData(0).set(R.data);b.len=R.len;cb(b);}catch{cb(null);}});W.postMessage({...msg,id,seed:Math.floor(Math.random()*1e9)});return true;}
const chantName=g=>String(g?.name||'').trim().split(/\s+/)[0];
function chorPrep(name,n=1,wild=false){if(!name)return null;let E=CHOR.get(name);if(!E){E={b:[],w:[],pend:0,wild:[]};CHOR.set(name,E);if(CHOR.size>18)CHOR.delete(CHOR.keys().next().value);}
 const L=wild?E.wild:E.b;while(L.length+E.pend<n){E.pend++;if(!cJob({type:'chant',name,wild},b=>{E.pend--;if(b)L.push(b);const w=E.w.splice(0);for(const f of w)f(E);})){E.pend--;break;}}return E;}
function clapPrep(){if(clapB.length+(clapB.pend||0)>=3)return;clapB.pend=(clapB.pend||0)+1;if(!cJob({type:'claps'},b=>{clapB.pend--;if(b)clapB.push(b);}))clapB.pend--;}
function chantPrefill(b){if(!cwkOk||!arenaCrowd())return;for(let i=0;i<3;i++)clapPrep();const hum=(b.actors||[]).filter(a=>a.g&&!a.dog&&!a.rex&&!a.hahn).sort((x,y)=>(x.team-y.team));for(const a of hum.slice(0,12))chorPrep(chantName(a.g),1);}
function playAt(b,t,vol,rate=1){try{const s=ctx.createBufferSource(),gn=ctx.createGain();s.buffer=b;s.playbackRate.value=rate;gn.gain.value=vol;s.connect(gn);gn.connect(fxBus);s.start(t);ksVoices++;s.onended=()=>{ksVoices--;s.disconnect();gn.disconnect();};}catch{}}
function crowdCheer(vol=.6){if(!enabled(false)||!ctx||!arenaCrowd())return;crowdNext=0;crowdReact('jubel',vol);if(window.KampfSound?.DEF?.applause&&ctx.currentTime>chantUntil)ks('applause',.35,.3);}
function crowdChant(g,o={}){if(!enabled(false)||!ctx||!arenaCrowd()||!g?.name)return;const now=ctx.currentTime;crowdNext=0;crowdReact('jubel',o.kill?.72:.6);
 if(now<chantUntil)return;const name=chantName(g),wild=!!o.big,reps=wild?5:o.kill?4:3;chantUntil=now+4;const t0=now;
 const go=E=>{const L=(wild&&E.wild.length?E.wild:E.b);if(!L.length||ctx.currentTime-t0>3){chantUntil=0;return;}
  let t=ctx.currentTime+.12;const quiet=M.speaking?.('moderator')?.55:1,calls=[],claps=[];
  for(let r=0;r<reps;r++){const b=L[r%L.length],len=b.len||.8,gv=(.48+.22*r/Math.max(1,reps-1))*quiet*(wild?1.1:1);playAt(b,t,gv,.98+Math.random()*.04);calls.push([t,t+len]);
   if(clapB.length)for(const k of [.08,.36,.64]){playAt(clapB[Math.floor(Math.random()*clapB.length)],t+len+k,.5*gv,.95+Math.random()*.1);claps.push(t+len+k+.02);}t+=len+.95;}
  /* Zuschauer bewegen sich im Takt (arena.js): Rufzeiten und Klatscher in der Bildschirmuhr */{const off=performance.now()/1000-ctx.currentTime;M.crowdBeat={team:o.team??-1,calls:calls.map(([a,b])=>[a+off,b+off]),claps:claps.map(x=>x+off),end:t+off};}
  chantUntil=t+.3;chorPrep(name,2,wild);};
 const E=chorPrep(name,1,wild);if(!E){chantUntil=0;return;}const L=wild?E.wild:E.b;if(L.length||(wild&&E.b.length))go(E);else E.w.push(go);clapPrep();}
M.crowdChant=crowdChant;M.crowdCheer=crowdCheer;
function voice(kind='pain',pitch=1,strong=false){const g=vpG;vpG=null;if(!enabled(false)||ctx.currentTime-lastVoice<.22||active>44)return;lastVoice=ctx.currentTime;
 if(kind==='pain'&&!strong&&Math.random()<.4)return;
 {const sk=kind==='pain'&&strong?'hurt':kind;if(SCR[sk]&&scream(sk,g,pitch,{pain:.55,hurt:.68,death:.8,dying:.6,effort:.5,battlecry:.62}[sk]))return;}
 if(window.KampfSound){const k=kind==='battlecry'&&window.KampfSound.DEF.bruell01?roarKey():VMAP[kind]||(kind==='crowd'?'roar':kind==='pain'?(variant(strong?'hurt':'pain')||(strong?'painScream':'painLight')):strong?'painScream':'painLight'),p=Math.round(Math.max(.6,Math.min(1.8,pitch||1))*100)/100;if(ks(k,kind==='effort'?.6:kind==='battlecry'?.7:kind==='pain'?(strong?.75:.62):.9,0,p))return;}const t=ctx.currentTime,p=Math.max(.55,Math.min(1.8,pitch||1)),d=strong?.32:.19;if(kind==='battlecry'){note(150*p,.46,'sawtooth',.065,t,false,105*p);note(290*p,.38,'triangle',.045,t+.03,false,210*p);noise(.34,.07,900,'bandpass',t,false);return;}note(125*p,d,'triangle',strong?.13:.075,t,false,82*p);noise(d*.7,strong?.095:.05,kind==='crowd'?800:570,'bandpass',t,false);note(255*p,d*.6,'sine',.032,t+.02,false,170*p);}
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
 const step0=M.fixedStep;if(typeof step0==='function'){M.fixedStep=function(){const r=step0.apply(this,arguments);try{const b=M.s.battle;if(b&&(b.actors?.length||0)<=80){if(b!==lastB){lastB=b;scan(b,true);try{if(ctx&&enabled(false))chantPrefill(b);}catch{}}else scan(b,false);}}catch(e){}return r;};}}
/* Ladebildschirm (Thomas 06.11.): Die Kampfgeräusche dieses Kampfes werden vorher im Hintergrund-Worker fertig gerechnet. Gesammelt
   wird genau, was die Kämpfer erzeugen können: Blockklang je Angreiferwaffe, Abwehrwaffe/Schild, Schlagart und Trefferstelle (mit der
   Tonhöhe, die block-contact.js daraus macht), Trefferklang je Waffengattung und Rüstung, dazu die allgemeinen Treffer/Stürze. Sonst rechnet
   der erste Block mit einer neuen Tonhöhe mitten im Kampf auf dem Hauptthread (gemessen bis ~50 ms am PC, am Handy ein Mehrfaches).
   Wartet höchstens limit ms; ohne Ton oder Worker sofort fertig. */
function fightSounds(b){const out=new Map(),add=(k,p=1)=>{if(!k||!window.KampfSound?.DEF?.[k])return;const q=Math.round(p*10)/10;out.set(k+'|'+q,[k,q]);};
 const acts=(b?.actors||[]).filter(a=>a.g&&!a.rex&&!a.hahn&&!a.dog&&!a.lion),arms=a=>{const w=[M.weapon?.(a)?.id,M.gear?.(a.g,'secondary')?.def].filter(Boolean);return w.length?w:['fist'];},shield=a=>M.gear?.(a.g,'shield')?.def||null,BC=M.blockContact,HC=M.hitContact;
 if(BC?.classify){for(const A of acts)for(const D of acts){if(A.team===D.team)continue;const sid=shield(D);for(const aw of arms(A))for(const tech of ['slash','overhead','thrust','spin'])for(const dw of arms(D))for(const s of sid?[sid,null]:[null])for(const spot of s?['wood','boss','rim']:['wood']){try{const r=BC.classify(aw,tech,dw,s,D.g.stats?.block||0,spot,A.g.stats?.strength||50,D.g.stats?.strength||50);add(r.snd,r.pitch);add(r.extra);}catch{}}}
  add('bk_reiben');add('bk_wegdruecken');if(acts.some(a=>arms(a).some(w=>w==='bow'||w==='crossbow'))){add('bk_pfeilKlinge',.9);add('bk_pfeilKlinge',1.05);}}
 if(HC?.strikeClass){const armored=acts.some(a=>(M.armorItems?.(a.g)||[]).length);for(const A of acts)for(const wid of arms(A))for(const k of ['slash','overhead','thrust','spin','kick']){const cls=HC.strikeClass(wid,k);for(const p of [1,.93]){add('tr_'+cls,p);if(wid==='fist'||k==='kick')add('tr_'+cls,p*1.25);if(armored){add('tr_leder',p);for(const m of ['tr_metallStumpf','tr_metallKlinge']){add(m,p);add(m,p*1.05);}}}}}
 /* zuletzt (Block-/Trefferklänge zuerst, sie sind am teuersten): Publikum, Jubel, Gong usw. rechnet weiter ksWarmup nebenher; hier nur das, was im ersten Schlagabtausch gebraucht wird */for(const v of Object.values(KMAP))if(!heavyKey(v[0]))add(v[0]);for(const k of ['painLight','painScream','arrow'])add(k);
 return [...out.values()];}
function prepareFight(limit=6000,b=M.s.battle){const K=window.KampfSound;if(!K?.prefill||!M.s.options?.sound||!init())return Promise.resolve(0);ksWarmup();
 const jobs=[];for(const [k,p] of fightSounds(b)){let j=null;try{j=K.prefill(ctx,k,{pitch:p,max:heavyKey(k)?1:2});}catch{}if(j)jobs.push(j);}
 if(!jobs.length)return Promise.resolve(0);return Promise.race([Promise.allSettled(jobs).then(()=>jobs.length),new Promise(r=>setTimeout(()=>r(-jobs.length),limit))]);}
M.audioEngine={/* Kino-Moment (kino-kamera.js): Zugang zu Klangkette, nur wenn Ton an ist */cine:()=>ctx&&enabled(false)?{ctx,master,musicBus,fightBus,impactBus,noise:noiseBuffer}:null,prepareFight,fightSounds,ksPlay:(k,vol=1,pitch=1)=>enabled(false)?ks(k,vol,0,pitch):false,start,sound,voice,
 // Sprechstimmen (sprech-game.js): Ausgang für Sprache, nur wenn Geräusche an sind
 voiceOut:()=>enabled(false)?{ctx,bus:fxBus}:null,
 // Zuschauer-Kulisse (zuschauer.js): Ausgang nur im Arenakampf mit Ton; Aufregung 0–1 zurück (Kämpfer treten bei Jubel zurück)
 crowdOut:()=>enabled(false)&&arenaCrowd()&&!reportOn()?{ctx,bus:fxBus}:null,setCrowdExcite:v=>{crowdE=+v||0;},
 crowdMood,
 duck:v=>{duckT=Math.max(0,Math.min(1,v??1));if(musicBus&&ctx)musicBus.gain.setTargetAtTime(.34*duckT,ctx.currentTime,.12);},
 // Schmiede-Party: Uhr und Sprungmarken des Schmiede-Liedes (nur lesen bzw. umstellen, die Wiedergabe steuert weiter songTick).
 smithClock:()=>{const t=songs.smith;return{idx:t.idx,time:t.el?t.el.currentTime||0:0,playing:!!(t.playing&&t.el&&!t.el.paused)};},
 smithSeek:u=>{const t=songs.smith,first=132.4,idx=u<first?0:1;t.idx=idx;if(!t.el||!t.ext)return;const want='music/'+t.files[idx]+'.'+t.ext;if(!t.el.src.endsWith(want))t.el.src=want;try{t.el.currentTime=idx?u-first:u;}catch{}if(t.playing){const p=t.el.play();if(p?.catch)p.catch(()=>{t.playing=false;});}},
 chants:()=>({names:[...CHOR.keys()],ready:[...CHOR.values()].reduce((n,E)=>n+E.b.length+E.wild.length,0),claps:clapB.length,until:chantUntil,now:ctx?.currentTime||0}),
 screams:()=>({types:SPOOL.size,ready:[...SPOOL.values()].reduce((n,L)=>n+L.length,0),queue:SQ.length,worker:swkOk}),
 diagnostics:()=>({active,musicVoices,scene,song:songs.home.playing?'home':songs.battle.playing?'battle':songs.smith.playing?'smith':songs.hall.playing?'hall':songs.raid.playing?'raid':songs.medic.playing?'medic':'',state:ctx?.state||'not-started'})};
})();
