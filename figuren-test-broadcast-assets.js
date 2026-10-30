// Test-only copies of speech synthesis, moderator text bank and pure injury painting. No arena hooks.
(()=>{const localStorage={getItem:()=>null,setItem:()=>{}};
'use strict';
// =====================================================================================================
// SPRECHSTIMMEN (window.Sprech) – kleine Sprachausgabe im Klang alter 16-Bit-Konsolen, ohne Tondateien.
// Ablauf: Text → deutsche Ausspracheregeln → Laute → Formant-Synthese (Stimmlippen-Pulse durch drei Resonanzen,
// Rauschen für Zischlaute, Verschlusslaute mit Knack) → Sprachmelodie (Betonung, Satzende, Frage, Ausruf)
// → 16-Bit-Effekt (grobe Abtastung, wenige Bits, Echo wie beim Super Nintendo).
// Gesprochen wird schnell, damit niemand wartet; man soll den Text aber noch grob heraushören.
// Für die Großaufnahmen liefert render() zu jedem Zeitpunkt die Mundöffnung (0 = zu, 1 = weit offen).
// Der Editor (sprech-editor.html) speichert geänderte Stimmen unter localStorage „mg-sprech-v1“.
// Keine Spielregeln, kein Zugriff auf den Spielstand.
// =====================================================================================================
(()=>{
const SR=22050,TAU=Math.PI*2,KEY='mg-sprech-v1';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function rng(seed){let a=(seed>>>0)||1;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

// ---------- Lauttabelle ----------
// t: v Vokal, d Doppellaut, n Nasal, l Gleitlaut, f stimmloser Reibelaut, z stimmhafter Reibelaut, p stimmloser Verschluss,
//    b stimmhafter Verschluss, h Hauch. F = Formanten (Hz), d = Dauer (ms, bei Tempo 1), o = Mundöffnung,
//    nf/nq = Rauschfilter (Mitte, Güte), na = Rauschstärke, to = Zielvokal bei Doppellauten.
const PH={
 a:{t:'v',F:[750,1250,2550],d:75,o:1},A:{t:'v',F:[760,1220,2550],d:135,o:1},
 E:{t:'v',F:[580,1800,2550],d:70,o:.7},e:{t:'v',F:[420,2050,2700],d:125,o:.55},
 I:{t:'v',F:[390,1950,2650],d:60,o:.4},i:{t:'v',F:[290,2250,3000],d:115,o:.35},
 O:{t:'v',F:[560,920,2450],d:75,o:.7},o:{t:'v',F:[430,780,2450],d:130,o:.55},
 U:{t:'v',F:[390,950,2350],d:65,o:.35},u:{t:'v',F:[310,760,2300],d:120,o:.3},
 Y:{t:'v',F:[300,1650,2200],d:110,o:.35},'2':{t:'v',F:[420,1450,2300],d:120,o:.45},
 '@':{t:'v',F:[500,1450,2500],d:45,o:.45},'6':{t:'v',F:[620,1300,2500],d:60,o:.6},
 aI:{t:'d',F:[750,1250,2550],to:[350,2100,2750],d:150,o:.9},aU:{t:'d',F:[750,1250,2550],to:[380,900,2350],d:150,o:.9},
 OY:{t:'d',F:[560,920,2450],to:[320,1700,2300],d:150,o:.7},
 m:{t:'n',F:[280,1000,2200],d:60,o:0},n:{t:'n',F:[280,1500,2600],d:55,o:.25},N:{t:'n',F:[280,2000,2700],d:60,o:.3},
 l:{t:'l',F:[360,1300,2700],d:50,o:.35},R:{t:'l',F:[500,1250,2400],d:45,o:.4,na:.18,nf:900,nq:1},j:{t:'l',F:[280,2200,3000],d:45,o:.3},
 v:{t:'z',F:[300,1350,2400],d:55,o:.2,na:.25,nf:3500,nq:.6},z:{t:'z',F:[300,1600,2600],d:65,o:.25,na:.45,nf:5500,nq:1.2},
 f:{t:'f',d:75,o:.2,na:.35,nf:4500,nq:.5},s:{t:'f',d:85,o:.25,na:.75,nf:6000,nq:1.4},S:{t:'f',d:85,o:.35,na:.8,nf:3000,nq:1.2},
 C:{t:'f',d:75,o:.3,na:.55,nf:4200,nq:1.6},x:{t:'f',d:80,o:.4,na:.55,nf:1500,nq:1.1},h:{t:'h',d:45,o:.5,na:.35},
 p:{t:'p',d:55,o:0,bf:900,ba:.7},t:{t:'p',d:50,o:.2,bf:4000,ba:.8},k:{t:'p',d:55,o:.35,bf:2000,ba:.8},
 b:{t:'b',d:40,o:0,bf:900,ba:.4},d:{t:'b',d:35,o:.2,bf:3500,ba:.45},g:{t:'b',d:40,o:.35,bf:1900,ba:.45},
 _:{t:'_',d:0,o:0}
};
const VOWEL=new Set(['v','d']);

// ---------- Ausspracheregeln (Deutsch, vereinfacht) ----------
const ONES=['null','eins','zwei','drei','vier','fünf','sechs','sieben','acht','neun','zehn','elf','zwölf','dreizehn','vierzehn','fünfzehn','sechzehn','siebzehn','achtzehn','neunzehn'];
const TENS=['','','zwanzig','dreißig','vierzig','fünfzig','sechzig','siebzig','achtzig','neunzig'];
function numWord(n){if(n<20)return ONES[n];if(n<100){const o=n%10,t=Math.floor(n/10);return (o?(o===1?'ein':ONES[o])+'und':'')+TENS[t];}if(n<1000){const h=Math.floor(n/100),r=n%100;return (h===1?'ein':ONES[h])+'hundert'+(r?numWord(r):'');}if(n<1e6){const k=Math.floor(n/1000),r=n%1000;return (k===1?'ein':numWord(k))+'tausend'+(r?numWord(r):'');}return String(n).split('').map(d=>ONES[+d]).join(' ');}
const isV=c=>!!c&&c.length===1&&'aeiouäöüy'.includes(c);
const PREFIX=['zer','ver','ent','emp','be','ge','er'];
// Wörter, die nur so aussehen, als hätten sie eine Vorsilbe
const NOPRE=['gegen','gestern','geld','gelb','gern','gerade','gest','bestie','beste','bester','besten','besen','berg','bett','beil','beide','erde','ernst','erst','erbe','ente','entlang','gerste','beere','geier','geist','geh','geb','gel'];
// ein Wort → Lautfolge mit Silben- und Betonungsangabe: [{p,stress}]
function word2ph(w){
 w=w.toLowerCase().replace(/ß/g,'ss');if(!w)return [];
 const out=[],push=(p,i)=>out.push({p,i});let i=0,n=w.length;
 const pre=NOPRE.some(x=>w.startsWith(x))?null:PREFIX.find(p=>w.startsWith(p)&&w.length>=p.length+4&&!isV(w[p.length]));
 const next=k=>w[k]||'',prevV=()=>{for(let k=out.length-1;k>=0;k--){const t=PH[out[k].p]?.t;if(VOWEL.has(t))return out[k].p;}return '';};
 while(i<n){const c=w[i],r=w.slice(i);
  // Vorsilbe be-/ge-/ver-: Schwa
  if(pre&&i===0){const pp={zer:['t','s','E','6'],ver:['f','E','6'],ent:['E','n','t'],emp:['E','m','p'],be:['b','@'],ge:['g','@'],er:['E','6']}[pre];pp.forEach(p=>push(p,i));i+=pre.length;continue;}
  if(r==='ig'&&i>0){push('I',i);push('C',i);i+=2;continue;}
  if(r.startsWith('tsch')){push('t',i);push('S',i);i+=4;continue;}
  if(r.startsWith('sch')){push('S',i);i+=3;continue;}
  if(r.startsWith('chs')){push('k',i);push('s',i);i+=3;continue;}
  if(r.startsWith('ch')){const pv=prevV();push(['a','A','O','o','U','u','aU'].includes(pv)?'x':'C',i);i+=2;continue;}
  if(r.startsWith('ck')){push('k',i);i+=2;continue;}
  if(r.startsWith('ph')){push('f',i);i+=2;continue;}
  if(r.startsWith('th')){push('t',i);i+=2;continue;}
  if(r.startsWith('qu')){push('k',i);push('v',i);i+=2;continue;}
  if(r.startsWith('ng')){push('N',i);i+=2;continue;}
  if(r.startsWith('nk')){push('N',i);push('k',i);i+=2;continue;}
  if(r.startsWith('pf')){push('p',i);push('f',i);i+=2;continue;}
  if(r.startsWith('tz')){push('t',i);push('s',i);i+=2;continue;}
  if(i===0&&(r.startsWith('sp')||r.startsWith('st'))){push('S',i);push(r[1]==='p'?'p':'t',i);i+=2;continue;}
  if(/^(ei|ai|ey|ay)/.test(r)){push('aI',i);i+=2;continue;}
  if(r.startsWith('ie')){push('i',i);i+=2;continue;}
  if(/^(eu|äu)/.test(r)){push('OY',i);i+=2;continue;}
  if(r.startsWith('au')){push('aU',i);i+=2;continue;}
  if(isV(c)){
   // lang: doppelt, Dehnungs-h, oder offene Silbe (ein Mitlaut, dann Vokal), oder Wortende bei kurzen Wörtern
   let len=1,long=false;if(next(i+1)===c&&c!=='ä'){long=true;len=2;}
   else if(next(i+1)==='h'&&!isV(next(i+2)||'x')){long=true;len=2;}
   else if(next(i+1)==='h'){long=true;len=2;}
   else{const a=next(i+1),b=next(i+2);if(a&&!isV(a)&&isV(b)&&!['ch','ck','sch'].some(x=>w.startsWith(x,i+1)))long=true;if(!a&&n<=3)long=true;if(a==='r'&&!b&&n<=4)long=true;if(n<=3&&a&&!b&&'mtd'.includes(a)&&c==='o')long=true;}
   // Schwa in Endungen -e, -en, -el, -er, -em, -es
   const tail=w.slice(i);const atEnd=i>0&&/^(e|en|el|em|es|et)$/.test(tail)&&out.some(o=>VOWEL.has(PH[o.p]?.t));
   if(c==='e'&&tail==='er'&&i>0&&out.some(o=>VOWEL.has(PH[o.p]?.t))){push('6',i);i+=2;continue;}
   if(c==='e'&&atEnd){push('@',i);i+=1;continue;}
   const map={a:long?'A':'a',e:long?'e':'E',i:long?'i':'I',o:long?'o':'O',u:long?'u':'U',ä:long?'e':'E',ö:'2',ü:'Y',y:'Y'};
   push(map[c],i);i+=len;continue;}
  // Mitlaute
  const dbl=next(i+1)===c;let p=null;
  switch(c){
   case 'b':p='b';break;case 'd':p='d';break;case 'g':p='g';break;case 'p':p='p';break;case 't':p='t';break;case 'k':p='k';break;
   case 'f':p='f';break;case 'v':p='f';break;case 'w':p='v';break;case 'j':p='j';break;case 'l':p='l';break;case 'm':p='m';break;case 'n':p='n';break;
   case 'h':p=isV(next(i+1))?'h':null;break;
   case 'r':p=i>0&&isV(w[i-1])&&!isV(next(i+1))&&next(i+1)!=='r'?'6':'R';break;
   case 's':p=(isV(next(i+1))&&(i===0||isV(w[i-1])||'lnmr'.includes(w[i-1])))?'z':'s';break;
   case 'z':push('t',i);p='s';break;
   case 'x':push('k',i);p='s';break;
   case 'c':p='aeiäy'.includes(next(i+1))?null:'k';if(!p){push('t',i);p='s';}break;
   default:p=null;}
  if(p)push(p,i);i+=dbl&&c!=='s'?2:(dbl?2:1);}
 // Auslautverhärtung
 const L=out[out.length-1];if(L){const hard={b:'p',d:'t',g:'k',v:'f',z:'s'};if(hard[L.p])L.p=hard[L.p];}
 // Betonung: erste Silbe, nach Vorsilbe die zweite
 let vi=0,skip=0;if(pre){let k=0;for(const o of out){if(o.i>=pre.length)break;if(VOWEL.has(PH[o.p]?.t))skip++;k++;}}for(const o of out){if(VOWEL.has(PH[o.p]?.t)){o.stress=vi===skip&&o.p!=='@';vi++;}}
 return out;}
// ganzer Text → Laute mit Pausen und Satzzeichen
function text2ph(text){
 const res=[];const s=String(text||'').replace(/\{[^}]*\}/g,'').replace(/\d+/g,m=>' '+numWord(+m)+' ').replace(/[„“"»«]/g,'').replace(/[–—-]/g,' ');
 const re=/([A-Za-zÄÖÜäöüß]+)|([.!?…]+)|([,;:])/g;let m;
 // Wortinfo für die Betonung: emph = Hauptwort (groß geschrieben) oder langes Wort, final = letztes Wort vor Satzende/Komma
 let wi=0,lastW=null;
 while((m=re.exec(s))){if(m[1]){const ph=word2ph(m[1]),emph=/^[A-ZÄÖÜ]/.test(m[1])&&m.index>0&&!/[.!?]\s*$/.test(s.slice(0,m.index))||m[1].length>=7;if(ph.length){const w=wi++;lastW=ph.map(o=>({...o,w,emph}));res.push(...lastW);res.push({p:'_',gap:18,word:1});}}
  else if(m[2]){if(lastW)for(const o of lastW)o.final=1;lastW=null;res.push({p:'_',gap:m[2].includes('?')?260:m[2].includes('!')?240:220,end:m[2].includes('?')?'?':m[2].includes('!')?'!':'.'});}
  else if(m[3]){if(lastW)for(const o of lastW)o.final=.6;lastW=null;res.push({p:'_',gap:140,end:','});}}
 if(lastW)for(const o of lastW)o.final=1;
 return res;}

// ---------- Stimmen ----------
// pitch Grundton (Hz), speed Tempo, inton Sprachmelodie, sing zufälliges Auf und Ab je Silbe (16-Bit-Singsang),
// size Körpergröße (größer = tiefere Formanten), rough Rauheit, breath Hauch, shake Zittern (alt), rate Abtastung (Hz),
// bits Bittiefe, echo Echo-Anteil, vol Lautstärke
const PRESETS={
 moderator:{name:'Arena-Moderator',pitch:128,speed:1.35,inton:.7,sing:0.06,size:1,rough:.12,breath:.1,shake:0,rate:14332,bits:12,echo:.28,vol:1,accent:.55,pause:1.35,final:.25,look:{skin:'#c99266',hair:'#2d2118',beard:false,band:'#9b2b25'}},
 rabies:{name:'Rabies, der Hundsgraf',pitch:86,speed:1.3,inton:.6,sing:0.11,size:1.04,rough:.4,breath:.3,shake:0,rate:13000,bits:11,echo:0,vol:.9,look:{skin:'#b98a6a',hair:'#d9d2c0',beard:true,beardCol:'#cfc6b2',skull:true}},
 schmied:{name:'Der Schmied',pitch:92,speed:1.55,inton:.35,sing:0.05,size:1.14,rough:.3,breath:.15,shake:0,rate:12350,bits:11,echo:.12,vol:.95,look:{skin:'#a8714c',hair:'#1c1410',beard:true,beardCol:'#1c1410'}},
 orontes:{name:'Orontes Pfeilkopf',pitch:150,speed:1.6,inton:.5,sing:0.09,size:.97,rough:.25,breath:.35,shake:.45,rate:13650,bits:11,echo:.15,vol:.85,look:{skin:'#c08a5c',hair:'#e6e1d5',beard:true,beardCol:'#e6e1d5'}},
 krassus:{name:'Krassus Knochenzins',pitch:80,speed:1.4,inton:.3,sing:0.04,size:1.2,rough:.35,breath:.12,shake:0,rate:11700,bits:11,echo:.32,vol:1,look:{skin:'#c79a78',hair:'#111',beard:false,gold:true}},
 medicus:{name:'Der Medicus',pitch:122,speed:1.85,inton:.4,sing:0.05,size:.96,rough:.08,breath:.18,shake:0,rate:14332,bits:12,echo:.1,vol:.85,look:{skin:'#e0b48e',hair:'#6b6b6b',beard:false}},
 rekrut:{name:'Rekrut',pitch:152,speed:1.9,inton:.5,sing:0.075,size:.93,rough:.1,breath:.12,shake:0,rate:14332,bits:12,echo:.12,vol:.85,look:{skin:'#d6a27a',hair:'#5a3a22',beard:false}},
 frau:{name:'Frau',pitch:215,speed:1.85,inton:.55,sing:0.075,size:.84,rough:.05,breath:.2,shake:0,rate:14332,bits:12,echo:.15,vol:.85,look:{skin:'#e3b591',hair:'#7a3a1c',beard:false,long:true}},
 erzaehler:{name:'Erzähler (Intro)',pitch:98,speed:1.02,inton:.8,sing:.02,size:1.08,rough:.12,breath:.18,shake:0,rate:16000,bits:12,echo:.3,vol:1,accent:.75,pause:1.9,final:.4,look:{skin:'#b7835c',hair:'#3b2a1d',beard:true,beardCol:'#3b2a1d'}}
};
const ORDER=Object.keys(PRESETS);
let saved={};try{saved=JSON.parse((typeof localStorage!=='undefined'?localStorage.getItem(KEY):null)||'{}')||{};}catch{saved={};}
// 27.10.2026 (Thomas): Rabies klang zu hoch und zu schnell – alte Editor-Werte für Tonhöhe und Tempo einmal verwerfen
try{if(typeof localStorage!=='undefined'&&!localStorage.getItem('mg-sprech-rabies-2710')){if(saved.rabies){delete saved.rabies.pitch;delete saved.rabies.speed;localStorage.setItem(KEY,JSON.stringify(saved));}localStorage.setItem('mg-sprech-rabies-2710','1');}}catch{}
const copy=o=>JSON.parse(JSON.stringify(o));
function get(k){const base=PRESETS[k]||PRESETS.moderator;return saved[k]?{...base,...saved[k],look:base.look}:base;}
function set(k,v){const {look,...rest}=v;saved[k]=copy(rest);try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{}}
function reset(k){if(k)delete saved[k];else saved={};try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{}}

// ---------- Ablaufplan: Laute → Stützstellen ----------
// Stützstelle: {t, F:[3], av Stimme, an Rauschen, nf, nq, asp Hauch durch Formanten, o Mund, f0}
function plan(text,V,r){
 const ph=text2ph(text),sp=Math.max(.4,V.speed||1),K=[];let t=.03;
 // Silbenzahl für die Satzmelodie
 // Silben je Satz (für die Satzmelodie), Betonung (accent), Pausen (pause), Dehnung am Satzende (final)
 const sentTot=[];{let start=0,c=0;for(let j=0;j<=ph.length;j++){const o=ph[j];if(!o||o.end&&o.end!==','){for(let q=start;q<j;q++)sentTot[q]=c||1;start=j+1;c=0;continue;}if(VOWEL.has(PH[o.p]?.t))c++;}}
 const ACC=V.accent??.25,PAUSE=V.pause??1,FIN=V.final??.15;let vi=0;
 const nextVowelF=k=>{for(let j=k+1;j<ph.length;j++){const q=PH[ph[j].p];if(q&&VOWEL.has(q.t))return q.F;if(ph[j].p==='_')break;}return [500,1500,2500];};
 const sentenceEnd=k=>{for(let j=k;j<ph.length;j++)if(ph[j].end&&ph[j].end!==',')return ph[j].end;return '.';};
 let lastF=[500,1500,2500],syl=0,sylJ=0;
 const f0At=(k,stress)=>{const o=ph[k],u=vi/(sentTot[k]||1),end=sentenceEnd(k);let f=V.pitch*(1+V.inton*.25*(1-u*1.4));if(stress)f*=1+V.inton*.22+(o.emph?ACC*.32:0);
  if(o.final&&end==='.'&&!stress)f*=1-V.inton*.12*o.final;if(end==='?'&&u>.75)f*=1+V.inton*.9*(u-.75)*4;if(end==='!')f*=1.1+ACC*.08;return f*(1+sylJ);};
 for(let k=0;k<ph.length;k++){const o=ph[k],P=PH[o.p];if(!P)continue;
  if(o.p==='_'){const g=(o.gap||20)/1000/sp*(o.end?PAUSE:1+(PAUSE-1)*.35);K.push({t,F:lastF,av:0,an:0,o:0,f0:V.pitch,asp:0});t+=g;K.push({t,F:lastF,av:0,an:0,o:0,f0:V.pitch,asp:0});if(o.end&&o.end!==','){vi=0;}continue;}
  const vow=VOWEL.has(P.t);if(vow){syl++;sylJ=(r()*2-1)*(V.sing||0);}
  const stress=!!o.stress,f0=f0At(k,stress);if(vow)vi++;
  let d=P.d/1000/sp*(stress&&vow?1.25+(o.emph?ACC*.5:0):1)*(1+(o.final||0)*FIN)*(.9+r()*.2);
  const F=P.F||nextVowelF(k),open=P.o;
  switch(P.t){
   case 'v':K.push({t,F,av:1,an:0,o:open,f0,asp:0});K.push({t:t+d*.85,F,av:1,an:0,o:open,f0:f0*.97,asp:0});lastF=F;break;
   case 'd':K.push({t,F,av:1,an:0,o:open,f0,asp:0});K.push({t:t+d*.35,F,av:1,an:0,o:open,f0,asp:0});K.push({t:t+d*.9,F:P.to,av:1,an:0,o:open*.5,f0:f0*.96,asp:0});lastF=P.to;break;
   case 'n':K.push({t,F,av:.55,an:0,o:open,f0,asp:0,nasal:1});K.push({t:t+d*.8,F,av:.55,an:0,o:open,f0,asp:0,nasal:1});lastF=F;break;
   case 'l':K.push({t,F,av:.75,an:P.na||0,nf:P.nf,nq:P.nq,o:open,f0,asp:0});K.push({t:t+d*.8,F,av:.75,an:P.na||0,nf:P.nf,nq:P.nq,o:open,f0,asp:0});lastF=F;break;
   case 'z':K.push({t,F,av:.45,an:P.na,nf:P.nf,nq:P.nq,o:open,f0,asp:0});K.push({t:t+d*.85,F,av:.45,an:P.na,nf:P.nf,nq:P.nq,o:open,f0,asp:0});break;
   case 'f':K.push({t,F:lastF,av:0,an:P.na,nf:P.nf,nq:P.nq,o:open,f0,asp:0});K.push({t:t+d*.85,F:lastF,av:0,an:P.na,nf:P.nf,nq:P.nq,o:open,f0,asp:0});break;
   case 'h':{const nf=nextVowelF(k);K.push({t,F:nf,av:0,an:0,o:open,f0,asp:.55});K.push({t:t+d*.85,F:nf,av:.15,an:0,o:open,f0,asp:.45});break;}
   case 'p':case 'b':{const vo=P.t==='b',cl=d*(vo?.6:.65),nf=nextVowelF(k);
    K.push({t,F:lastF,av:vo?.12:0,an:0,o:open*.3,f0,asp:0});K.push({t:t+cl,F:lastF,av:vo?.12:0,an:0,o:open*.3,f0,asp:0});
    K.push({t:t+cl+.002,F:nf,av:0,an:P.ba,nf:P.bf,nq:.8,o:open,f0,asp:0,burst:1});K.push({t:t+cl+.014,F:nf,av:vo?.4:0,an:P.ba*.3,nf:P.bf,nq:.8,o:open,f0,asp:vo?0:.45});
    if(!vo){K.push({t:t+d,F:nf,av:.1,an:0,o:open,f0,asp:.3});}
    break;}}
  t+=d;}
 K.push({t,F:lastF,av:0,an:0,o:0,f0:V.pitch,asp:0});K.push({t:t+.05,F:lastF,av:0,an:0,o:0,f0:V.pitch,asp:0});
 return {K,dur:t+.05,ph};}

// ---------- Synthese ----------
function reson(){return {y1:0,y2:0};}
function render(text,voice,opt={}){
 const V={...PRESETS.moderator,...(voice||{})},r=rng(opt.seed??Math.floor(Math.random()*1e9));
 const {K,dur,ph}=plan(text,V,r);const n=Math.ceil((dur+.3+V.echo*.6)*SR),out=new Float32Array(n);
 const R=[reson(),reson(),reson(),reson()],nz={x1:0,x2:0,y1:0,y2:0},fs=1/Math.max(.6,V.size||1);
 let ph0=0,k=0,flowPrev=0,jit=1,shim=1,odd=false,lp=0;const mouth=[];
 const coef=(F,BW)=>{const C=-Math.exp(-TAU*BW/SR),B=2*Math.exp(-Math.PI*BW/SR)*Math.cos(TAU*Math.min(F,SR*.45)/SR),A=1-B-C;return [A,B,C];};
 let cf=[[1,0,0],[1,0,0],[1,0,0],[1,0,0]],nb=[1,0,0,0,0];
 const total=Math.floor(dur*SR);
 // Weiche Übergänge (Koartikulation): Formanten, Tonhöhe und Lautstärken folgen ihren Zielen geglättet statt sprunghaft
 const al=tau=>1-Math.exp(-1/(tau*SR)),aF=al(.016),aP=al(.04),aA=al(.007),aN=al(.0025),aD=al(.15),tiltK=clamp(.62-(V.breath||0)*.3,.2,.8);
 let sF=null,sf0=0,sav=0,san=0,sasp=0,drift=0,driftT=0,tilt=0;
 for(let i=0;i<total;i++){const t=i/SR;while(k<K.length-2&&K[k+1].t<=t)k++;const a=K[k],b=K[k+1]||a,u=b.t>a.t?clamp((t-a.t)/(b.t-a.t),0,1):0,L=(x,y)=>x+(y-x)*u;
  const tF0=L(a.F[0],b.F[0])*fs,tF1=L(a.F[1],b.F[1])*fs,tF2=L(a.F[2],b.F[2])*fs;if(!sF)sF=[tF0,tF1,tF2];sF[0]+=(tF0-sF[0])*aF;sF[1]+=(tF1-sF[1])*aF;sF[2]+=(tF2-sF[2])*aF;
  sav+=(L(a.av,b.av)-sav)*aA;san+=(L(a.an,b.an)-san)*aN;sasp+=(L(a.asp,b.asp)-sasp)*aA;
  if((i&31)===0){const nas=L(a.nasal||0,b.nasal||0);
   cf=[coef(sF[0],95+nas*120),coef(sF[1],115),coef(sF[2],170),coef(3500*fs,260)];
   const nf=L(a.nf||b.nf||3000,b.nf||a.nf||3000),nq=L(a.nq||1,b.nq||1),w=TAU*clamp(nf,200,SR*.45)/SR,alp=Math.sin(w)/(2*nq),a0=1+alp;nb=[alp/a0,0,-alp/a0,-2*Math.cos(w)/a0,(1-alp)/a0];
   if((i&1023)===0)mouth.push({t,o:L(a.o,b.o)*(sav>.05||san>.05||sasp>.05?1:.4)});}
  // Tonhöhe: geglättete Satzmelodie, langsames natürliches Schwanken, Zittern (alt), kleine Unruhe je Schwingung
  if((i&1023)===0)driftT=(r()*2-1)*.03;drift+=(driftT-drift)*aD;
  const tf0=L(a.f0,b.f0);if(!sf0)sf0=tf0;sf0+=(tf0-sf0)*aP;
  let f0=sf0*(1+drift)*(1+(V.shake||0)*.06*Math.sin(TAU*6.5*t))*jit;ph0+=f0/SR;
  if(ph0>=1){ph0-=1;odd=!odd;jit=1+(.006+(V.rough||0)*.025)*(r()*2-1);shim=1-(V.rough||0)*.4*(odd?r():0);}
  const p=ph0,flow=p<.42?.5*(1-Math.cos(Math.PI*p/.42)):p<.6?Math.cos(Math.PI*(p-.42)/.36):0;let src=(flow-flowPrev)*SR/Math.max(60,f0)*.12*shim;flowPrev=flow;
  tilt+=(src-tilt)*tiltK;src=tilt*1.6;
  const noise=r()*2-1,asp=sasp+sav*(V.breath||0)*.3*(p<.5?1:.4);
  let x=src*sav+noise*asp*.35;
  for(let j=0;j<4;j++){const c=cf[j],y=c[0]*x+c[1]*R[j].y1+c[2]*R[j].y2;R[j].y2=R[j].y1;R[j].y1=y;x=y;}
  // Rauschen für Zisch- und Knacklaute
  const an=san,ny=nb[0]*noise+nb[2]*nz.x2-nb[3]*nz.y1-nb[4]*nz.y2;nz.x2=nz.x1;nz.x1=noise;nz.y2=nz.y1;nz.y1=ny;
  out[i]=x*.9+ny*an*.55;}
 // 16-Bit: grobe Abtastung, wenige Bits, Tiefpass, Echo
 const hold=Math.max(1,SR/clamp(V.rate||11025,4000,SR)),q=Math.pow(2,clamp(V.bits||9,3,16)-1);let acc=0,held=0;
 let peak=0;for(let i=0;i<n;i++)peak=Math.max(peak,Math.abs(out[i]));const g=peak>0?.8/peak:1;
 const aa=1-Math.exp(-TAU*clamp(V.rate||11025,4000,SR)*.42/SR);let z1=0,z2=0;
 for(let i=0;i<n;i++){z1+=(out[i]*g-z1)*aa;z2+=(z1-z2)*aa;acc+=1;if(acc>=hold||i===0){acc-=hold;held=Math.round(z2*q)/q;}lp+=(held-lp)*.6;out[i]=lp;}
 if(V.echo>0){const D=Math.floor(.085*SR),fb=.35;for(let i=D;i<n;i++)out[i]+=out[i-D]*V.echo*fb*2;}
 const vol=V.vol??1;for(let i=0;i<n;i++)out[i]=Math.tanh(out[i]*vol*1.1)*.85;
 mouth.push({t:dur,o:0});
 return {data:out,sr:SR,dur,mouth,phon:ph.map(o=>o.p==='_'?(o.end?o.end+' ':' '):o.p+(o.stress?'ˈ':'')).join('').replace(/\s+/g,' ').trim()};}
// Mundöffnung zum Zeitpunkt t (Sekunden) aus der Liste von render()
function mouthAt(list,t){if(!list?.length)return 0;let lo=0,hi=list.length-1;if(t<=list[0].t)return list[0].o;if(t>=list[hi].t)return list[hi].o;while(hi-lo>1){const m=(lo+hi)>>1;if(list[m].t<=t)lo=m;else hi=m;}const a=list[lo],b=list[hi],u=(t-a.t)/Math.max(1e-6,b.t-a.t);return a.o+(b.o-a.o)*u;}
function play(ctx,dest,text,voice,opt={}){const R=render(text,voice,opt),b=ctx.createBuffer(1,R.data.length,SR);b.getChannelData(0).set(R.data);const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=b;g.gain.value=opt.vol??1;s.connect(g);g.connect(dest);const at=Math.max(ctx.currentTime,opt.at||0)+.02;s.start(at);s.onended=()=>{s.disconnect();g.disconnect();};return {source:s,start:at,dur:R.dur,mouth:R.mouth,phon:R.phon,mouthAt:tt=>mouthAt(R.mouth,tt-at)};}
(typeof window!=='undefined'?window:self).FigureLabSpeech={SR,KEY,PH,PRESETS,ORDER,get,set,reset,saved:()=>copy(saved),load(o){saved=copy(o||{});try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{}},changed:k=>!!saved[k],text2ph,word2ph,render,play,mouthAt};
})();


})();

(()=>{const T={
 hero:['{name}. {F}, {K}. Seine Mutter ist stolz, seine Gegner sind es weniger.','Auf der {side} Seite: {name}. {F} überlebt. Von {kills} seiner Gegner lässt sich das nicht behaupten.','{name} führt {team}. {K} auf dem Gewissen. Das Gewissen selbst wurde nie gefunden.','Meine Damen und Herren: {name}. {F}, {W}. Die Niederlagen liegen woanders begraben.','{name}. Wenn er lächelt, bestellt irgendwo jemand einen Sarg. Bilanz: {K}.','Der Held von {team}: {name}. {F}. Man erkennt ihn daran, dass er noch da ist.','{name}. {K}. Er zählt sie nicht mehr. Wir schon.','Für {team}: {name}. {F}, und jedes Mal ist ein anderer liegen geblieben.','{name}. {F}, {K}. Sein Schmied kommt mit dem Schleifen kaum nach.','Hier kommt {name}. {K}. Die Totengräber von {team} nennen ihn ihren besten Kunden.'],
 heroFresh:['{name} führt {team}. Bisher kein einziger Toter. Das Publikum hofft auf Besserung.','{name}. {F}, noch niemanden getötet. Ein Pazifist mit Waffe. Das kann ja heiter werden.','Der Held von {team} heißt {name}. „Held“ ist hier ein Vorschuss.','{name} führt {team} an. Erfahrung: {F}. Zuversicht: grenzenlos. Eines von beiden reicht heute nicht.','An der Spitze von {team}: {name}. Noch unbefleckt. Der Sand korrigiert das gern.'],
 victim:['Er hat {victim} bezwungen. {victim} lässt grüßen. Von unten.','Auf seiner Liste: {victim}. Der stand auch einmal hier und hat gewunken.','{victim} hielt ihn für einen Anfänger. Es war die letzte Einschätzung von {victim}.','Bezwinger von {victim}. Man hat {victim} danach in zwei Körben nach Hause getragen.','Er hat {victim} gefällt. Mit: {weapon}. Die Reinigung hat Tage gedauert.','Sein letztes Opfer hieß {victim}. Hieß.','{victim} wollte gegen ihn berühmt werden. Das hat geklappt, nur anders.'],
 victimFamous:['Er hat den großen {victim} bezwungen. Groß war danach vor allem die Lücke im Kader.','{victim}, der Liebling der Massen, starb durch seine Hand. Die Massen haben sich schnell umgewöhnt.','Er ist der Mann, der {victim} getötet hat. {victim} hatte selbst {vk} auf dem Gewissen. Jetzt hat er Ruhe.','Den berühmten {victim} hat er vom Sockel geholt. Der Sockel steht noch, falls jemand Interesse hat.'],
 veteran:['{name}, Veteran. {F}, {K}. Der Mann hat mehr Leute beerdigt als mancher Priester.','{name}. {F}. Die Narben sind echt, die Zähne nicht mehr alle.','Veteran {name}: {K}. Er nennt es Berufserfahrung.','{name} ist schon so lange dabei, dass der Sand ihn duzt. {F}, {K}.','{name}. {K}. Fragen Sie nicht die Witwen.','Und {name}. {F} überstanden. Das Glück ist ein Trottel, aber ein treuer.','{name} für {team}. {F}, {K}. Er schläft gut. Das ist das Unheimliche.','Der alte {name}. {K}. Jeder davon hielt sich für die Ausnahme.','{name}. {F}. In diesem Beruf ist das kein Lebenslauf, das ist ein Wunder.'],
 veteranNoKill:['{name}. {F} und noch niemanden getötet. Entweder ein Heiliger oder sehr ungeschickt.','{name}, {F}, kein einziger Toter. Er schlägt offenbar nur, um Hallo zu sagen.','Veteran {name}: {F} überlebt, ohne je einen zu erledigen. Die Menge nennt das Arbeitsverweigerung.','{name}. {F}. Er hat alle seine Gegner leben lassen. Dankbar war ihm keiner.','{name} ist seit {F} dabei und hat noch keinen umgebracht. Heute wäre ein guter Tag, damit anzufangen.'],
 talent:{
  Soldat:['{name}, {tier}, noch kein Kampf. Ein Soldat, der bisher nur Strohpuppen besiegt hat. Die Puppen waren unbewaffnet.','Frisch aus der Ausbildung: {name}. Man sagt ihm Großes voraus. Das sagt man jedem, bis der erste Speer kommt.','{name}. Frische Waffe, frische Haut, null Erfahrung. Die Menge ist gespannt, ob das Talent schneller ist als die Klingen der anderen.','Der Soldat {name} gilt als {tier}. Heute erfahren wir, ob er auch als lebendig gilt.','{name}, {tier}. Steht gerade, hält den Schild richtig herum. Mehr wissen wir noch nicht.','Neu in der ersten Reihe: {name}. Die Menge wettet schon. Nicht ob, sondern wann.'],
  'Fernkämpfer':['{name}, Fernkämpfer, {tier}. Trifft angeblich eine Fliege auf fünfzig Schritt. Fliegen schlagen selten zurück.','Am Bogen: {name}. Noch kein Kampf. Die Menge ist gespannt, was er tut, wenn das Ziel plötzlich näher kommt.','{name}, {tier} mit der Fernwaffe. Sein Plan: Abstand. Der Plan der anderen: kein Abstand.','Schütze {name}. Jung, begabt, unbenutzt. Wir sehen gleich, wie lange das so bleibt.','{name} schießt hervorragend. Auf dem Übungsplatz. Dort schießt niemand zurück und niemand rennt los.','{name}, {tier}. Sein erster Pfeil vor Publikum. Hoffentlich nicht ins Publikum.'],
  Assassine:['{name}, Assassine, {tier}. Niemand hat ihn je kämpfen sehen. Bei Assassinen gilt das als Empfehlung.','Im Schatten: {name}. Noch kein Kampf, noch kein Toter. Beides kann sich in den nächsten Minuten ändern.','{name}. Schnell, leise, unerprobt. Die Menge ist gespannt, wem er zuerst in den Rücken fällt. Oder wer ihm.','Der junge Assassine {name} gilt als {tier}. Sein erstes Messer hat er schon. Fehlt nur noch der passende Rücken.','{name}, {tier}. Er schleicht hervorragend. Mitten in einer Arena ist das von begrenztem Nutzen.','{name} will heute zum ersten Mal von hinten grüßen. Wir drücken die Daumen. Wem, sagen wir nicht.']},
 hope:['Größter Hoffnungsträger von {team}: {name}. Die Hoffnung stirbt bekanntlich zuletzt. Heute vielleicht als Vorletzte.','Auf {name} ruhen die Hoffnungen von {team}. Schwere Last für jemanden, der noch nie geblutet hat.','{team} setzt alles auf {name}. Mutig. Dumm, aber mutig.','Wenn {team} eine Zukunft hat, heißt sie {name}. Zukunft ist hier ein dehnbarer Begriff.','{name} ist die große Hoffnung von {team}. Die kleine Hoffnung ist, dass es schnell geht.'],
 weapon:['{name} trägt: {wname}. Vorher gehörte die Waffe {prev}. {prev} braucht sie nicht mehr.','Sehen Sie sich diese Waffe an: {wname}. {WK} hat sie schon erledigt. Sie selbst hat keinen Kratzer.','{wname}. Durch {owners} Hände gegangen, {WK} gefällt. Die Waffe überlebt ihre Besitzer mit bemerkenswerter Gelassenheit.','In der Hand von {name}: {wname}, zuvor geführt von {prev}. Bilanz: {WK}. Könnte dieses Eisen reden, säße es vor Gericht.','{wname} hat {WK} auf dem Gewissen. {name} ist nur der, der gerade festhalten darf.','Diese Waffe hat mehr gesehen als wir alle: {wname}. {WK}. Zuletzt geführt von {prev}, der sie ungern hergab.'],
 apple:['{name} hat einen Apfel aus {d} Metern vom Kopf von {target} geschossen. Der Apfel war hinterher Mus. {target} nur ein bisschen.','Aus {d} Metern, mit dem {w}: Apfel getroffen. Seitdem trägt in diesem Ludus niemand mehr freiwillig Obst.','{name}. Rekord im Apfelschuss: {d} Meter. Wer heute vor seinem {w} steht, sollte keinen Apfel auf dem Kopf haben. Oder einen Kopf.','{d} Meter, ein Apfel, ein zitternder {target}. {name} hat getroffen. Den Apfel. Diesmal.'],
 weaponNoPrev:['Sehen Sie sich diese Waffe an: {wname}. {WK} hat sie schon erledigt. Sie selbst hat keinen Kratzer.','{wname} hat {WK} auf dem Gewissen. {name} ist nur der, der gerade festhalten darf.','{name} und seine Waffe: {wname}. {WK}. Die beiden verstehen sich. Leider.'],
 rest:['Dazu {n} weitere Männer, deren Namen wir uns erst merken, wenn es sich lohnt.','Und {n} weitere. Statisten, Sandfüller, zukünftige Beispiele.','Der Rest: {n} Mann. Einer von ihnen überrascht uns vielleicht. Die Wetten stehen dagegen.','Außerdem dabei: {n} Männer ohne Geschichte. Wir schreiben ihnen heute eine. Kurz wird sie sein.'],
 start:['Genug geredet. Lasst sie bluten!','Die Sanduhr läuft. Gleich läuft noch mehr.','Möge der Bessere gewinnen. Oder wenigstens der Unterhaltsamere.','Tore zu, Wetten zu, Augen auf!','Der Medikus hat sich schon die Hände gewaschen. Fangt an!','Verabschiedet euch höflich voneinander. Und los!'],
 firstBlood:['Erstes Blut! {v} eröffnet den Sand für heute.','Da ist es, das erste Rot. {v} spendet großzügig.','{v} blutet als Erster. Einer muss ja anfangen.','Und schon tropft es. {v} macht den Anfang, ganz uneigennützig.'],
 ko:['{v} liegt. Der Sand ist heute aber auch bequem.','{v} geht zu Boden und bleibt höflich dort.','{v} macht Pause. Unfreiwillig, aber gründlich.','Da liegt {v}. Die Menge winkt. Er nicht.','{v} ist raus. Seine Beine haben gekündigt.','{v} sieht sich den Kampf ab jetzt von unten an.','Für {v} ist Feierabend. Ob er das noch mitbekommt, ist offen.'],
 death:['{v} ist tot. {k} sieht aus, als hätte er noch Termine.','Und das war {v}. Bitte den Sand danach wieder glattziehen.','{k} beendet die Laufbahn von {v}. Fristlos.','{v} verlässt uns. Die Menge ist untröstlich, wie man hört.','{v} fällt und steht nicht mehr auf. {k} hat da eine klare Meinung vertreten.','Ein Platz im Kader von {team} ist soeben frei geworden. Bewerbungen an den Lanista.','{v}. Gestern noch Rekrut, heute schon Erinnerung.','{k} macht aus {v} eine Zeile im Kampfbericht.','Das war es für {v}. Er hinterlässt eine Lücke. Im Sand.'],
 deathPlain:['{v} ist tot. Niemand will es gewesen sein.','Und das war {v}. Bitte den Sand danach wieder glattziehen.','{v} verlässt uns. Die Menge ist untröstlich, wie man hört.','Ein Platz im Kader von {team} ist soeben frei geworden.'],
 deathHero:['{v} ist gefallen! Der Held von {team}! Hören Sie diese Stille? Nein? Eben.','Der große {v} ist tot. {F} hat er überlebt. Diesen hier nicht.','{k} hat {v} getötet! Das steht morgen an jeder Hauswand.','{v}. {K} hat er auf dem Gewissen. Nun ist er selbst einer davon.','Sie haben es gesehen: {v} schließt die Augen. Wer auf ihn gesetzt hat, darf sie auch schließen.','{v} fällt! {team} verliert seinen besten Mann und die Buchmacher ihre Fassung.'],
 sever:['{v} verliert etwas: {part}. Bitte nicht ins Publikum werfen.','Da fliegt etwas. Es gehörte {v}: {part}.','{v} ist ab sofort leichter. Es fehlt: {part}.','Wer es findet, darf es behalten: {part}, zuletzt gesehen an {v}.','{part}, ab. {v} schaut hinterher, als käme es zurück.'],
 severe:['{inj} bei {v}. Das heilt, sagt der Medikus. Der Medikus lügt gern.','{v}: {inj}. Man hörte es bis in die oberen Ränge.','{inj}. {v} verzieht keine Miene. Doch, jetzt.','{v} sammelt Andenken: {inj}.','{inj} für {v}. Der Medikus reibt sich schon die Hände.'],
 lead:['{team} übernimmt die Führung. Die Buchmacher schwitzen.','Das Blatt wendet sich: {team} liegt vorn.','{team} führt. Wer auf die anderen gesetzt hat, darf jetzt beten.','Jetzt hat {team} die Nase vorn. Noch ist sie dran.'],
 lastMan:['{v} steht als Letzter für {team}. Allein. Die Menge liebt Tragödien.','Einer noch für {team}: {v}. Statistisch gesehen ein Problem.','{v} gegen den Rest. Er hat sich das sicher anders vorgestellt.'],
 dud:['{name}. Talent: {tier}. Der Händler hat beim Verkauf gelacht. Lange.','{name} hält die Waffe am richtigen Ende. Meistens. Das ist die gute Nachricht des Tages.','{name}, {tier}. Er weiß nicht, was hier gleich passiert. Wir sagen es ihm nicht. Es wäre grausam, und dafür ist später noch Zeit.','Und das ist {name}. Jede Mannschaft braucht jemanden, der zuerst stirbt.','{name}. Man hat ihm gesagt, es sei ein Spiel. Er freut sich. Lassen wir ihm das.','{name}, {tier}. Sein Lanista führt ihn in den Büchern unter Verbrauchsmaterial.','{name} winkt. Winken kann er. Damit ist die Liste seiner Fähigkeiten vollständig.','{name}. Gekauft im Dutzend, weil es billiger war. Er ist der Dreizehnte.','{name}, {tier}. Seine Aufgabe heute: einem Besseren die Klinge stumpf machen.','{name} hat sich für heute viel vorgenommen. Der Sand hat andere Pläne mit ihm, flachere.'],
 dud2:['{name}. Als die Götter Verstand verteilten, stand er in der Schlange für Suppe.','{name}, {tier}. Er hat heute Morgen zwei Stunden gebraucht, um die Rüstung richtig herum anzuziehen. Sie ist es immer noch nicht.','{name} glaubt, „Arena“ sei ein Badehaus. Die Wahrheit kommt gleich, sie ist spitz.','Sehen Sie {name}? Er hat gefragt, welches Ende der Waffe zum Gegner zeigt. Man hat ihm das falsche gesagt. Aus Neugier.','{name}, {tier}. Der Lanista hat ihn mitgeschickt, damit der Gegner sich verausgabt. An ihm.','{name}. Sein größter Sieg war gegen eine Treppe. Knapp.','{name} ist der Grund, warum der Totengräber heute pfeifend zur Arbeit kam.','{name}, {tier}. Wenn er stirbt, verliert die Welt nichts, und sein Lanista vier Kupferstücke.','{name} hat sich freiwillig gemeldet. Niemand weiß, wofür er sich gemeldet zu haben glaubt.','Das ist {name}. Seine Mutter hat ihn verkauft und Wechselgeld zurückbekommen.','{name}, {tier}. Selbst die Fliegen setzen sich lieber auf die anderen. Die leben länger.','{name} übt seit Wochen einen einzigen Schlag. Er trifft damit zuverlässig den eigenen Fuß.'],
 hurtMissing:['Ihm fehlt etwas: {part}. Er sagt, er vermisse es kaum. Es vermisst ihn gar nicht.','{part}: nicht mehr vorhanden. Irgendwo in einer anderen Arena liegt der Rest von ihm.','Achten Sie auf seinen Umriss. Da fehlt: {part}. Er kämpft seitdem günstiger. Weniger Fläche.','{part} hat er in einem früheren Kampf abgegeben. Freiwillig war es nicht, aber gründlich.'],
 hurtChronic:['Altes Andenken: {part}, Dauerschaden. Bei Regen weiß er das Wetter vor allen anderen.','{part} hat einen Dauerschaden. Der Medikus nannte es Charakter. Die Rechnung nannte er anders.','Seit einem früheren Kampf macht {part} nicht mehr alles mit. Er selbst offenbar schon.','Dauerschaden: {part}. Heilt nicht mehr. Muss es auch nicht, so lange hält der Rest nicht.'],
 hurtScar:['Auf seiner Haut steht seine Laufbahn. Zum Beispiel: {scar}, {part}. Lesen kann er das nicht. Fühlen schon.','Narbe: {scar}, {part}. Er trägt sie mit Stolz. Stolz ist billiger als ein Arzt.','Sehen Sie die Narbe? {scar}, {part}. Schön verheilt ist anders. Billig verheilt ist genau so.','{scar}, {part}. Das war sein Lehrgeld. Er hat offenbar nichts gelernt, sonst wäre er nicht hier.'],
 hurtFresh:['Er geht angeschlagen hinein: {part}, {inj}. Das nennt man hier Vorsprung für den Gegner.','{inj}, {part}, noch nicht verheilt. Sein Lanista fand, für heute reicht es.','Frisch vom Medikus, eigentlich zu frisch: {inj}, {part}. Die Naht hält bestimmt. Bestimmt.'],
 weaponChain:['Die Reihe ihrer Träger: {chain}. Sie sehen das Muster. Der Letzte in der Reihe ist immer der, der noch lebt.','Geführt von: {chain}. Jeder hielt sie für sein Eigentum. Sie hielt jeden für eine Zwischenlösung.','Ihre Träger der Reihe nach: {chain}. Die Waffe wechselt den Besitzer immer auf dieselbe Art. Der alte lässt los.','{chain}. So viele Hände, und nur eine davon ist noch warm.'],
 regular:['{name}. {F}, {K}. Solide. Solide steht hier auf den meisten Grabsteinen.','{name}, {F}. Er ist noch da. Mehr kann man über ihn nicht sagen, und er selbst auch nicht.','{name}. {F} überlebt, ohne aufzufallen. Heute wäre ein guter Tag, das zu ändern. Oder ein schlechter.','Für {team}: {name}. {F}. Weder Held noch Leiche. Das eine kommt selten, das andere von allein.','{name}. Mittelmaß mit Waffe. Die Arena ist voll davon. Der Friedhof auch.','{name}, {F}. Man vergisst sein Gesicht sofort. Er sollte hoffen, dass der Gegner das auch tut.','{name}. {F}. Er kämpft nicht schlecht und nicht gut. Der Tod macht da keinen Unterschied, er nimmt beide Sorten.'],
 bets:['Die Leute wetten {d} zu 100, dass er tot hinausgetragen wird, und {w} zu 100, dass er wenigstens noch kriecht.','Die Quoten: {d} % Tod, {w} % schwer verletzt am Boden. Für „unversehrt“ gibt es {f} %. Das Wettbüro lacht.','An den Wettständen setzen {d} von 100 auf seinen Tod. {w} setzen auf die Trage. Der Rest ist Familie.','Vorschau aus der Probe: in {d} von 100 Fällen tot, in {w} am Boden. Die Totengräber wetten mit. Insiderwissen.','Die Buchmacher sagen: {d} % Leichentuch, {w} % Verband. Er selbst hat auf sich gesetzt. Mit geliehenem Geld.','{d} zu 100 auf den Tod. Seine Mutter hat gefragt, ob man auch gegen den eigenen Sohn wetten darf. Man darf.','Gewettet wird so: {d} % sterben, {w} % liegen bleiben, {f} % heil davonkommen. Auf das Letzte setzt nur, wer Geld loswerden will.','Die Wetten stehen {d} zu 100, dass er heute zum letzten Mal Sand schmeckt. Und {w} zu 100, dass er es nur fast zum letzten Mal tut.'],
 koBy:['{k} schickt {v} in den Sand. {v} bleibt gleich dort, es ist bequem und man wird nicht mehr geschlagen.','{v} liegt. Den Dank dafür nimmt {k} entgegen.','{k} streckt {v} nieder. Sauber. Fast zärtlich, wenn man das Blut wegdenkt.','{v} geht zu Boden. Absender: {k}. Rücksendung ausgeschlossen.','{k} hat {v} gefällt. {v} wirkt überrascht. Er hatte den Tag anders geplant.','{v} macht Pause, verordnet von {k}. Ob es eine lange wird, entscheidet später die Menge.','Das war {k}. Und das am Boden war einmal {v} in aufrechter Form.'],
 flowLead:['{team} liegt klar vorn. {other} hat noch {n} Mann auf den Beinen. „Auf den Beinen“ ist dabei großzügig gezählt.','Es steht {a} gegen {b}. Wer nachrechnet, erkennt ein Muster. Wer drinsteht, spürt es.','{other} wird weniger. Das spart später immerhin Verpflegung.','{team} räumt auf. {other} hilft mit, indem es umfällt.','Bei {other} lichten sich die Reihen. Platzangst hat dort keiner mehr.'],
 flowEven:['Ausgeglichen. Beide Seiten bluten im gleichen Takt. Fast schon Musik.','Noch ist alles offen. Vor allem einige Wunden.','Keiner gibt nach. Der Sand nimmt, was er kriegen kann.','Es steht {a} gegen {b}. Gerecht verteiltes Leid, wie man es selten sieht.','Beide Seiten schenken sich nichts. Außer Narben.'],
 flowBleed:['{v} verliert Blut wie ein undichter Schlauch. Noch {p} % im Mann, der Rest im Sand.','{v} wird blass. {p} % Blut. Der Medikus spitzt schon die Feder. Für die Rechnung oder den Nachruf.','{v} tropft. Bei {p} % Blut wird das Kämpfen langsam zum Hobby.','Sehen Sie die Spur hinter {v}? So findet man ihn später leichter.'],
 flowTop:['{k} hat bisher den meisten Schaden angerichtet. Seine Mutter wollte, dass er Bäcker wird. Auch da hätte er etwas zerlegt.','Fleißigster Mann im Sand: {k}. Wenn alle so arbeiteten, wären wir früher zu Hause.','{k} teilt heute am großzügigsten aus. Ein Wohltäter, nur andersherum.','Wer hier am meisten kaputt macht? {k}. Mit Abstand und mit Freude.'],
 flowTired:['{v} keucht. Die Arme hängen. Sein Gegner hat das auch gesehen, leider.','{v} ist am Ende seiner Kräfte. Das Ende seiner Laufbahn liegt gleich daneben.','{v} bekommt kaum noch Luft. Bald braucht er auch keine mehr.','{v} schwankt. Müde Männer machen Fehler. Tote Männer machen keine mehr.'],
 flowFlee:['{v} läuft. Nicht auf den Gegner zu. Kluger Junge, falsche Veranstaltung.','{v} sucht den Ausgang. Es gibt zwei: den Medikus und den Totengräber.','{v} weicht zurück. Das Publikum pfeift. Das Publikum blutet aber auch nicht.'],
 flowDuel:['Zwei Mann noch: {a} gegen {b}. Einer geht zu Fuß nach Hause, einer wird getragen.','Es läuft auf {a} gegen {b} hinaus. Die Wettstände drehen durch.','{a} und {b}. Mehr steht nicht mehr. Der Rest liegt und hört zu.'],
 flowLong:['Wir sind bei {t} Sekunden. Die Menge wird unruhig. Sie hat für Blut bezahlt, nicht für Ausdauer.','{t} Sekunden und noch immer stehen welche. Früher ging das schneller. Früher war alles besser, auch das Sterben.'],
 flowDown:['Am Boden liegen inzwischen {n}. Wer noch zuckt, wird später gefragt, ob er leben möchte. Gefragt wird allerdings die Menge.','{n} Mann liegen schon. Der Sand wird heute gut gedüngt.','{n} am Boden. Die Sanitäter warten ab. Aus Erfahrung lohnt sich nicht jeder Weg.'],
 champKill:['Der Held des Tages: {name}! {n} Männer hat er niedergestreckt, {k} davon für immer. Jubeln Sie, er hört es noch.','{name}! {n} Gegner am Boden, {k} tot. Wenn das kein Grund zum Feiern ist, dann wenigstens einer zum Aufräumen.','Ihr Sieger: {name}. {n} niedergestreckt, {k} getötet. Er lächelt. Er hat heute etwas geschafft.'],
 champHead:['Und was hält er da hoch? Den Kopf von {v}. Damit auch die hinteren Ränge etwas davon haben.','In seiner Hand: {v}. Zumindest das obere Ende. Der Rest liegt noch im Sand und wird nachgeliefert.','Er zeigt der Menge den Kopf von {v}. {v} schaut erstaunt. Er sieht die Arena zum ersten Mal von so weit oben.','Das dort oben ist {v}. Er war der Stärkste, den {name} heute erwischt hat. Jetzt ist er der Leichteste.'],
 champNoKill:['Der Held des Tages: {name}! {n} Männer niedergestreckt und keinen getötet. Ein Menschenfreund. Die Menge verzeiht es ihm knapp.','{name}! {n} Gegner am Boden, alle atmen noch. Er überlässt das Töten dem Publikum. Arbeitsteilung.','Ihr Sieger: {name}. {n} Mann gefällt. Die Köpfe sind alle noch dran. Man kann nicht alles haben.'],
 champEnd:['Die Menge tobt. Morgen kennt jeder seinen Namen. Übermorgen den des Nächsten.','Merken Sie sich das Gesicht. So sieht einer aus, der heute nicht dran war.','Feiern Sie ihn. Beim nächsten Mal stellen wir ihn vielleicht schon in der Vergangenheitsform vor.'],
 beast:['{name}. Ehemals königlicher Arenalöwe. {k} Menschen hat er gefressen, angefangen oder zumindest gründlich probiert.','Meine Damen und Herren: {name}. {f} Kämpfe, {k} Tote. Die Buchhaltung hat irgendwann aufgehört, die Reste zu sortieren.','{name}. {k} Männer auf dem Gewissen. Ein Gewissen hat er nicht, dafür einen gesunden Appetit.'],
 beast2:['Er ist alt, er humpelt, er ist halb verhungert. Das Letzte ist die schlechte Nachricht.','Man hat ihn ausgemustert, weil er zu viele Gladiatoren verbraucht hat. Heute verbraucht er die billigen.','Sein letzter Wärter hat gekündigt. Schriftlich ging es nicht mehr, ihm fehlten danach die Hände.','Die {k} davor dachten auch, eine alte Katze sei kein Problem. Man hat sie gefragt, als sie noch antworten konnten.'],
 beast3:['Die Buchmacher nehmen auf den Löwen keine Wetten an. Sie wetten nur noch, in welcher Reihenfolge er isst.','Gewettet wird heute nicht auf Sieg. Gewettet wird, wer von den fünfen am längsten zuckt.','Die Quote für den Löwen: sicher. Die Quote für die anderen steht auf den Särgen, die schon bereitstehen.'],
 plead:['{v} liegt im Sand und sieht nach oben. Dort sitzt das Publikum. Schlechte Adresse für Bitten.','{v} bittet um Gnade. Mit den Augen. Der Mund ist beschäftigt, mit Bluten.','Sehen Sie diesen Blick? So schaut man, wenn zwanzigtausend Fremde über das eigene Wochenende entscheiden.','{v} hebt die Hand. Das Publikum hebt die Becher. Gemeint ist nicht dasselbe.','{v} fleht. Er hat schöne Augen. Mal sehen, ob das reicht.','{v} sieht jeden Einzelnen an. Jeder Einzelne sieht auf seinen Wettschein.'],
 vote:['Daumen hoch, Daumen runter. Die Menge denkt nach. Das dauert, sie ist es nicht gewohnt.','Die Ränge beraten. Es geht um ein Leben und um die Frage, wann endlich die Würste kommen.','Jetzt wird abgestimmt. Demokratie, wie sie sein soll: laut, betrunken und mit Todesfolge.'],
 noMercy:['Keine Gnade für {v}. Das Publikum hat entschieden und gähnt bereits.','Daumen runter. {v} weint. Die Menge auch, vor Lachen.','Das war ein Nein. {v} hat es verstanden. Man sieht es an den Tränen.','{v} darf sterben. „Darf“ ist hier großzügig formuliert.','Die Menge will Blut. {v} hat noch etwas davon. Das trifft sich gut.','Abgelehnt. {v} sucht in den Rängen ein freundliches Gesicht. Er findet eines. Es winkt zum Abschied.'],
 mercy:['Gnade für {v}! Er weint vor Glück. Und vor Schmerz. Schwer zu trennen im Moment.','{v} darf leben. Verstümmelt, blutend, glücklich. Besser wird es für ihn nicht mehr.','Daumen hoch! {v} lächelt mit den Zähnen, die noch da sind.','Die Menge schenkt {v} das Leben. Den Rest davon bezahlt er beim Medikus.','{v} ist begnadigt. Er bedankt sich. Man versteht ihn schlecht, die Lippe ist gespalten.','{v} bleibt am Leben! Er lacht, er blutet, er lacht. Die Reihenfolge wechselt.'],
 exec:{Enthauptung:['{k} holt aus. {v} schließt die Augen. Gleich ist er einen Kopf kürzer und alle Sorgen los.','Ein sauberer Hieb von {k}. Der Kopf von {v} verlässt die Veranstaltung vorzeitig.','{k} trennt, was zusammengehörte. {v} verliert den Überblick.'],
  Durchtrennung:['{k} teilt {v} in zwei handliche Hälften. Für den Transport ein Segen.','Aus {v} werden zwei. Keiner davon gewinnt heute noch etwas.','{k} zieht durch. {v} ist ab jetzt oben und unten getrennt unterwegs.'],
  'Gnadenstoß':['{k} setzt die Spitze an. Ein Stoß ins Herz. {v} hat es hinter sich, und zwar gründlich.','Der Gnadenstoß von {k}. Gnade ist ein großes Wort für so viel Eisen.','{k} sticht zu. {v} sieht überrascht aus. Dabei war es angekündigt.']},
 oddsGood:['Die Buchmacher geben ihm {p} %, heute Abend noch zu atmen. Er selbst gibt sich hundert.','Überlebenschance {p} %. Er hat schon gefragt, was es danach zu essen gibt.','{p} % sagen: Er geht hier zu Fuß raus. Die übrigen {q} % sagen: getragen.','Die Vorschau sieht ihn bei {p} %. Sehen Sie dieses Gesicht? Er kennt die Zahl.'],
 oddsMid:['Seine Chancen stehen bei {p} %. Eine Münze wäre ehrlicher, aber weniger blutig.','{p} % Überlebenschance. Genug zum Hoffen, zu wenig zum Sparen.','Die Rechnung sagt {p} %. Die Rechnung war noch nie in einer Arena.','{p} %. Er kann es schaffen. Er kann auch Dünger werden. Beides ist ehrliche Arbeit.'],
 oddsBad:['Die Chancen stehen schlecht: {p} %, dass er diesen Kampf überlebt. Seine Familie hat schon umdisponiert.','{p} %. Der Medikus hat seinen Namen vorsorglich mit Kreide geschrieben.','Mit {p} % geht er hinein. Womit er herauskommt, sehen wir gleich.','Überlebenschance {p} %. Man sieht es ihm an. Er hat mitgerechnet.'],
 oddsAwful:['Überlebenschance: {p} %. Man hat ihm die Zahl nicht gesagt. Sehen Sie sein Gesicht? Er ahnt sie.','{p} %. Selbst sein Schatten hält Abstand.','Die Buchmacher nehmen auf ihn keine Wetten mehr an. {p} %.','{p} %. Der Totengräber hat schon Maß genommen. Aus der Ferne, aus Höflichkeit.'],
 oddsDumb:['Überlebenschance {p} %. Er lächelt. Niemand hat das Herz, es ihm zu erklären.','{p} %. Er winkt ins Publikum. Er glaubt, die Zahl sei gut.','Seine Chancen: {p} %. Er selbst macht sich keine Sorgen. Dafür fehlt ihm die Ausstattung.'],
 winLine:['Die Vorschau der Buchmacher: {team} gewinnt in {p} von 100 Fällen. Der hundertste Fall ist immer der lustigste.','Gerechnet wurde auch: {team} liegt mit {p} % vorn. Der Sand kann nicht rechnen.','{team} geht mit {p} % als Favorit hinein. Favoriten bluten genauso rot.'],
 winEven:['Die Buchmacher sind ratlos: es steht praktisch gleich. Herrlich. Niemand weiß, wer stirbt.','Die Vorschau sagt: ausgeglichen. Heute verdient nur der Medikus sicher.'],
 streak:['{k} hat schon {n} erledigt. Er wird heute offenbar nach Stück bezahlt.','{n} für {k}. Jemand sollte ihm einen Besen geben.','{k} räumt auf: {n} Tote. Und er sieht nicht müde aus.']};
const last={};
// Zusätze: besonders Begabte und Todgeweihte (Talent aus M.barracks.info, Todeswahrscheinlichkeit aus der Vorschau)
T.gifted=['{name} ist {tier}. Die Götter haben ihm Talent geschenkt. Leider auch einen Lanister.','Merkt euch das Gesicht von {name}. Entweder wird er eine Legende oder ein sehr teurer Grabstein.','{name}: {tier}. Wenn er heute überlebt, kaufen die Händler morgen Statuen von ihm.','Die Späher schwören, {name} habe Anlagen wie ein junger Gott. Die Späher sind allerdings auch betrunken.','{name} könnte der Beste seiner Generation werden. Seine Generation ist heute leider im Weg.'];
T.doomed=['Die Buchmacher geben {name} eine Todeswahrscheinlichkeit von {d} Prozent. Er hat sicherheitshalber schon mal sein Testament auswendig gelernt.','{name} wird den nächsten Morgen wohl nur von unten sehen. {d} Prozent, sagen die Wettbüros.','Wer auf {name} setzt, setzt auch auf Wunder. {d} Prozent sagen: Sarg.','Der Totengräber hat für {name} schon Maß genommen. Bei {d} Prozent spart das Zeit.','{name} kämpft heute für Ruhm, Ehre und ein ordentliches Begräbnis. Letzteres ist am wahrscheinlichsten.','Seine Mutter hat {name} gesagt, er soll vorsichtig sein. Bei {d} Prozent Todesrisiko war das ein schöner Gedanke.'];
/* Kampfhähne und Tiere (neue Arena, Tierkämpfe): eigene Sprüche */
T.roosterFresh=['Zum ersten Mal im Sand: {name}! Noch nie gekämpft, aber schon jetzt beleidigt.','{name} gibt heute sein Debüt. Seine Mutter war ein Huhn. Sein Vater auch.','Ein Neuling! {name} weiß noch nicht, dass hier niemand Körner streut.','{name}. Null Kämpfe, null Siege, null Ahnung. Die Federn sitzen aber.','Frisch vom Karren der Händlerin: {name}! Das Preisschild klebt noch am Bürzel.'];
T.roosterVet=['{name}! {f} Kämpfe, {w} Siege. Er hat mehr Narben als Federn.','Der Schrecken jedes Hühnerstalls: {name}! {k} Gegner hat er schon zu Suppe gemacht.','{name} kennt den Sand. {w} von {f} Kämpfen gewonnen. Der Rest ist Familiengeschichte.','Applaus für {name}! {k} getötet. Die Bauern im Umland zählen nachts ihre Hennen.','Er hat {f} Kämpfe überlebt und kräht trotzdem jeden Morgen pünktlich: {name}!'];
T.roosterKw=['Kampfwert {kw}. Für einen Vogel ist das beängstigend. Für einen Gladiator peinlich.','Die Buchmacher sagen: Kampfwert {kw}. Die Federn sagen: Mal sehen.','{kw} Kampfwert in einem Körper aus Federn und Wut.'];
T.roosterHurt=['Er humpelt. Er blutet. Er will trotzdem. Bei {h} Prozent Gesundheit nennt man das Tapferkeit oder Dummheit.','{name} ist angeschlagen, nur {h} Prozent. Der Koch hat schon Wasser aufgesetzt.'];
T.roosterFoe=['In der anderen Ecke: {name}! Er hat heute noch nicht gefrühstückt.','Und hier kommt {name}! Sein Besitzer schwört, er hat schon einen Fuchs erledigt.','{name}! Schnabel wie ein Dolch, Laune wie ein Steuereintreiber.','Gegen ihn: {name}. Böse Augen, scharfe Sporen, null Manieren.'];
T.beastFoe=['{name}! Groß, hungrig, und niemand hat ihm erklärt, dass das hier Sport ist.','Vorsicht in den ersten Reihen: {name} ist im Sand!'];
// Hunde (Arena, BEAST → Hund): Vorstellung, Start, Tod und Aufgeben (Thomas 26.10.)
T.dogVet=['{name}, {breed}. {f} Kämpfe, {w} Siege, {k} Tote. Er hat noch nie einen Knochen liegen lassen.','Hier kommt {name}! {breed}, {f} Kämpfe hinter sich. Seine Zähne sind noch alle da. Bei seinen Gegnern sieht das anders aus.','{name}. {w} Siege. Sein Herrchen füttert ihn mit Gegnern. Spart das Futter.'];
T.dogFresh=['{name}, ein {breed}, frisch aus dem Wald. Erster Kampf. Er weiß noch nicht, dass hier zurückgebissen wird.','{name}! Noch nie in der Arena. Heute lernt er, dass Sand nicht schmeckt.','Ein Neuling: {name}, {breed}. Der Schwanz wedelt noch. Das gibt sich.'];
T.dogFoe=['Und auf der anderen Seite: {name}, ein {breed}. Hungrig und schlecht erzogen.','{name}! {breed}. Der Hundsgraf sagt, er beißt nur, wenn er Hunger hat. Er hat immer Hunger.','Gegenüber: {name}, {breed}. Wer ihn streichelt, zählt danach seine Finger.'];
T.dogKw=['Kampfwert {kw}. Bellen kann jeder. Mal sehen, wer beißt.','Die Buchmacher sagen Kampfwert {kw}. Die Flöhe sagen nichts.','Kampfwert {kw}. Der Hundsgraf hätte ihn dafür nicht hergegeben. Zu spät.'];
T.dogHurt=['Er humpelt noch vom letzten Mal. Gesundheit {h} Prozent.','Noch nicht ganz verheilt: {h} Prozent. Mutig oder dumm, das klären wir gleich.'];
T.dogStart=['Lasst die Hunde los!','Zähne, Sand und Fell. Möge der Bissigere gewinnen!','Die Fütterung beginnt!'];
T.dogDeath=['{v} ist tot. Gibt es heute Abend Wurst?','{v} bellt nicht mehr. Der Metzger wartet schon.','Aus, {v}! Für immer aus.','{v} hat ausgebellt. {k} wedelt.'];
T.dogDown=['{v} kneift den Schwanz ein! Sitz, Platz, verloren.','{v} legt sich auf den Rücken. Bauch kraulen gibt es heute nicht.','{v} gibt auf. Braver Hund. Feiger Hund.'];
T.beastStart=['Lasst die Federn fliegen!','Federn, Sand und Blut. Möge der Zähere krähen!','Die Wetten sind geschlossen. Die Hühner nicht.'];

window.FigureLabLines=T;})();

'use strict';
// NAHAUFNAHMEN VON VERLETZUNGEN (eigenes Modul, lässt sich ersatzlos entfernen: aus der Skriptliste in boot.js streichen)
// Verwendet im Medikus-Kapitel (medic.js) und im Arenakampf (Abschnitt „Arenakampf“ am Ende, Einstellung S.options.closeups).
// Jede Körperstelle hat eine eigene Ansicht, jede Verletzungsart eine eigene Darstellung; beides wird zusammengesetzt.
// Gezeichnet wird wie in den vorhandenen Nahaufnahmen (Attentat, Löwe): kleines Pixelbild (160 × 100), ganzzahlig vergrößert.
// Haut, Schatten, Haar, Frisur und Bart kommen vom jeweiligen Gladiator (g.appearance), das Porträt aus M.renderPortrait.
// Reine Darstellung: liest nur, ändert keinen Spielzustand.
(()=>{
const M=window.MG;if(!M)return;
const FW=160,FH=100,HIT=.55,LEN=3.1;
const mix=(a,b,k)=>{const p=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)),x=p(a),y=p(b);return '#'+x.map((v,i)=>Math.max(0,Math.min(255,Math.round(v+(y[i]-v)*k))).toString(16).padStart(2,'0')).join('');};
const cl=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=v=>{v=cl(v);return v*v*(3-2*v);},out=v=>1-(1-cl(v))*(1-cl(v));
const BLOOD='#a8372f',DARK='#6b2420',WET='#c9584a';
// ---------- Welche Verletzung an welcher Stelle vorkommt (nach woundType/hit/destroyedInjury in sim.js) ----------
const LIMBS=['ls','rs','lua','rua','lfa','rfa','lh','rh','lt','rt','lsh','rsh','lf','rf'],SINEW=['lh','rh','lf','rf','lfa','rfa','lsh','rsh'],JOINT=['lh','rh','lf','rf','ls','rs'];
const KINDS=[
 ['Schürfwunde','scrape',()=>true],['Schnittwunde','cut',()=>true],['Tiefe Schnittwunde','deepcut',()=>true],
 ['Stichverletzung','stab',()=>true],['Tiefe Stichverletzung','deepstab',()=>true],['Pfeil steckt','arrow',()=>true],
 ['Sehnenverletzung','sinew',p=>SINEW.includes(p)],['Tiefe Bauchwunde','gut',p=>p==='belly'],['Durchstochen','pierce',()=>true],
 ['Bluterguss','bruise',()=>true],['Prellung','contusion',()=>true],['Muskelquetschung','crush',p=>p!=='head'],
 ['Gehirnerschütterung','concussion',p=>p==='head'],['Schädelbruch','skullfracture',p=>p==='head'],['Gelenkverletzung','joint',p=>JOINT.includes(p)],
 ['Knochenbruch','fracture',p=>LIMBS.includes(p)],['Schwerer Knochenbruch','badfracture',p=>LIMBS.includes(p)],['Trümmerbruch','shatter',p=>LIMBS.includes(p)],['Zertrümmert','pulp',p=>LIMBS.includes(p)],
 ['Abgetrennt','sever',p=>LIMBS.includes(p)||p==='head'||p==='neck'],['Dauerhafte Einschränkung','scar',()=>true],['Blutverlust','collapse',()=>true]];
const kindOf=name=>({'Tiefe Stichwunde':'deepstab','Kritische Bauchverletzung':'gut','Schwere innere Verletzung':'gut','Amputation':'sever','Tödliche Schnittwunde':'deepcut'})[name]||KINDS.find(k=>k[0]===name)?.[1]||'cut';
const injuriesFor=part=>KINDS.filter(k=>k[2](part)).map(k=>k[0]);
const BLUNT=['club','mace','hammer'],weaponClass=wid=>BLUNT.includes(wid)?'blunt':['bow','crossbow'].includes(wid)?'arrow':['spear','trident','javelin','halberd'].includes(wid)?'spear':'blade';
// ---------- Zeichenwerkzeug auf dem kleinen Bild ----------
function tools(q){const r=(x,y,w,h,c)=>{q.fillStyle=c;q.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
 // Körperröhre zwischen zwei Punkten: Lichtkante oben, Schatten unten, dunkle Kontur
 const tube=(x0,y0,x1,y1,w0,w1,C)=>{const dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,n=Math.ceil(len*1.4);for(let i=0;i<=n;i++){const u=i/n,cx=x0+dx*u,cy=y0+dy*u,w=w0+(w1-w0)*u,h=w/2;for(let j=-Math.ceil(h);j<=Math.ceil(h);j++){const a=Math.abs(j);if(a>h+.2)continue;const side=ny>=0?j:-j,col=a>h-1?C.line:side<-h*.45?C.light:side>h*.3?C.shade:C.skin;r(cx+nx*j,cy+ny*j,1.3,1.3,col);}}};
 const disc=(x,y,rad,C)=>{for(let j=-rad;j<=rad;j++){const hw=Math.sqrt(Math.max(0,rad*rad-j*j));for(let i=-Math.ceil(hw);i<=Math.ceil(hw);i++){const d=Math.hypot(i,j);r(x+i,y+j,1,1,d>rad-1?C.line:j<-rad*.4?C.light:j>rad*.35||i>rad*.5?C.shade:C.skin);}}};
 const oval=(x,y,rx,ry,c,a=1)=>{q.globalAlpha=a;q.fillStyle=c;for(let j=-Math.ceil(ry);j<=Math.ceil(ry);j++){const hw=rx*Math.sqrt(Math.max(0,1-(j*j)/(ry*ry)));if(hw>=.5)q.fillRect(Math.round(x-hw),Math.round(y+j),Math.round(hw*2),1);}q.globalAlpha=1;};
 const line=(x0,y0,x1,y1,c,w=1)=>{const n=Math.ceil(Math.hypot(x1-x0,y1-y0));for(let i=0;i<=n;i++)r(x0+(x1-x0)*i/n,y0+(y1-y0)*i/n,w,w,c);};
 return {r,tube,disc,oval,line};}
// Gedrehte Teile (hängende Hand, fallendes Glied, sinkender Kopf) erst gerade zeichnen, dann als Pixelbild drehen: bleibt scharf
let scratch=null;
function turned(q,cx,cy,ang,dx,dy,draw){if(!ang&&!dx&&!dy){draw(tools(q),q);return;}if(!scratch){scratch=document.createElement('canvas');scratch.width=FW*2;scratch.height=FH*2;}const s=scratch.getContext('2d');s.setTransform(1,0,0,1,0,0);s.clearRect(0,0,FW*2,FH*2);s.translate(FW/2,FH/2);draw(tools(s),s);q.save();q.imageSmoothingEnabled=false;q.translate(Math.round(cx+dx),Math.round(cy+dy));q.rotate(ang);q.drawImage(scratch,-Math.round(cx)-FW/2,-Math.round(cy)-FH/2);q.restore();}
const palette=g=>{const A=g?.appearance||{},skin=A.skin||'#c19169',shade=A.shade||'#875e43';return {skin,shade,light:mix(skin,'#fff2dc',.22),line:mix(shade,'#1a0f0a',.55),hair:A.hair||'#443025',style:(A.style??0)%6,beard:(A.beard??0)%4,cloth:'#665748',belt:'#3a2a22'};};
// ---------- Hintergrund: Sand des Hofs im Gegenlicht ----------
function backdrop(q,T,t){T.r(0,0,FW,FH,'#231a12');const gr=q.createRadialGradient(46,26,4,80,50,110);gr.addColorStop(0,'rgba(232,182,110,.55)');gr.addColorStop(.6,'rgba(150,110,64,.25)');gr.addColorStop(1,'rgba(0,0,0,0)');q.fillStyle=gr;q.fillRect(0,0,FW,FH);for(let i=0;i<7;i++){const k=(t*.25+i/7)%1;T.r(8+i*23+Math.sin(t*.8+i)*4,FH-6-k*80,1,1,'#e8c890');}}
// ---------- Ansichten je Körperstelle: zeichnen die Stelle und liefern den Wundpunkt mit Richtung ----------
// Glied als Kette von Punkten; Bruch knickt ab dem Wundpunkt, Abtrennung zeichnet nur bis dorthin (Rest fällt).
function limb(q,T,C,pts,o,part){const brk=o.bend||0,A=o.A,cut=o.cut;let P=pts.map(p=>({...p}));
 // Wundpunkt als zusätzlichen Kettenpunkt einfügen
 const i0=o.seg,a=P[i0],b=P[i0+1],u=o.u??.5,mid={x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,w:a.w+(b.w-a.w)*u};P.splice(i0+1,0,mid);
 const rot=(p,c,th)=>{const dx=p.x-c.x,dy=p.y-c.y,cs=Math.cos(th),sn=Math.sin(th);return {...p,x:c.x+dx*cs-dy*sn,y:c.y+dx*sn+dy*cs};};
 if(brk)for(let i=i0+2;i<P.length;i++)P[i]=rot(P[i],mid,brk);
 if(o.crumple){const k=o.crumple,q1={x:a.x+(mid.x-a.x)*.55,y:a.y+(mid.y-a.y)*.55,w:(a.w+mid.w)/2};P.splice(i0+1,0,q1);for(let i=i0+2;i<P.length;i++)P[i]=rot(P[i],q1,-k*.55);const m2=P[i0+2];for(let i=i0+3;i<P.length;i++)P[i]=rot(P[i],m2,k*.5);}
 const mi=P.indexOf(mid)>=0?P.indexOf(mid):i0+1,end=cut?mi:P.length-1,seg=(i,TT=T)=>TT.tube(P[i].x,P[i].y,P[i+1].x,P[i+1].y,P[i].w,P[i+1].w,C);
 for(let i=0;i<end;i++){seg(i);if(i>0&&(i!==mi||brk||o.crumple))T.disc(P[i].x,P[i].y,P[i].w/2-.5,C);}
 const dir={x:b.x-a.x,y:b.y-a.y},dl=Math.hypot(dir.x,dir.y)||1;dir.x/=dl;dir.y/=dl;
 return {P,mid:P[mi],mi,dir,w:mid.w,rest:(dx,dy,ang)=>turned(q,P[mi].x,P[mi].y,ang,dx,dy,TT=>{for(let i=mi;i<P.length-1;i++){seg(i,TT);if(i>mi)TT.disc(P[i].x,P[i].y,P[i].w/2-.5,C);}o.tail?.(TT);/* Schnittfläche am abgetrennten Stück */TT.oval(P[mi].x,P[mi].y,2.5,P[mi].w/2-1,DARK);TT.oval(P[mi].x,P[mi].y,1.5,P[mi].w/2-3,BLOOD);})};}
function handShape(T,C,x,y,o={}){const limp=o.limp||0;/* Handrücken, Daumen, vier Finger; „limp“ lässt die Finger kraftlos hängen */
 T.tube(x-2,y,x+30,y+1,28,26,C);T.disc(x+30,y+1,13,C);T.tube(x+6,y-12,x+22,y-27+limp*10,8,6,C);
 for(let i=0;i<4;i++){const fy=y-10+i*7.2,len=i===0||i===3?24:29,bx=x+40,k1=limp*(.5+i*.08)+(o.splay||0)*Math.sin(i*2.3+1)*.55,mx=bx+Math.cos(k1)*len*.5,my=fy+Math.sin(k1)*len*.5,ex=mx+Math.cos(k1*2.1)*len*.5,ey=my+Math.sin(k1*2.1)*len*.5;T.tube(bx-6,fy,mx,my,6.5,6,C);T.tube(mx,my,ex,ey,6,5,C);T.r(ex-1,ey-2,2,3,mix(C.light,'#ffffff',.3));T.r(bx-1,fy-3,1,6,C.shade);}}
function footShape(T,C,x,y){/* Fuß mit Sandale: Ferse links, Zehen rechts */
 for(let i=0;i<=62;i++){const top=i<14?y-2:y+ (i-14)*.2+2,h=y+20-top;for(let j=0;j<h;j++)T.r(x-8+i,top+j,1,1,j<1?C.line:j<3?C.light:j>h-5?C.shade:C.skin);}
 for(let n=0;n<5;n++){T.r(x+53+n*.6,y+9+n*2.1,4-n*.3,3,C.light);T.r(x+56+n*.6,y+9+n*2.1,1,3,C.line);}
 T.r(x-10,y+20,70,3,'#3a2a1c');T.r(x-10,y+23,70,1,'#1f150d');T.tube(x+6,y+19,x+22,y+2,3,3,{skin:'#6c5437',light:'#8a6c48',shade:'#4a3824',line:'#2a1f14'});T.tube(x+30,y+20,x+38,y+5,3,3,{skin:'#6c5437',light:'#8a6c48',shade:'#4a3824',line:'#2a1f14'});T.r(x-6,y-2,18,3,'#6c5437');}
function headShape(q,T,C,cx,top,R,o={}){const sc=R/26,half=y=>{const u=(y-28)/34;let hw=R*Math.sqrt(Math.max(0,1-u*u));if(y>48)hw-=(y-48)*.28*sc;return Math.max(0,hw);},Y=v=>top+Math.round(v*sc),pale=o.pale||0,skin=mix(C.skin,'#c9c4b0',pale*.6),shade=mix(C.shade,'#8a8778',pale*.6),light=mix(C.light,'#e6e2d0',pale*.5),bald=C.style===2,dark=mix(shade,'#2a160e',.35),lip=mix(shade,'#8a2a24',.45);
 if(C.style===3){T.r(cx-R-3,Y(6),6,Math.round(46*sc),C.hair);T.r(cx+R-3,Y(6),6,Math.round(44*sc),mix(C.hair,'#000000',.25));}
 for(let y=-6;y<64;y++){const hw=half(y);if(hw<1)continue;for(let x=Math.floor(-hw);x<Math.ceil(hw);x++){const s=(x+.5)/hw;let col=skin;if(!bald&&y<(C.style===4?5:9)+Math.abs(s)*4)col=s>.4?mix(C.hair,'#000000',.25):C.hair;else if(s>.45)col=shade;else if(s<-.4)col=light;if(C.beard===2&&y>44)col=s>.4?mix(C.hair,'#000000',.25):C.hair;if(C.beard===3&&Math.abs(s)<.34&&y>50)col=C.hair;if(C.beard===1&&y>54&&Math.abs(s)<.5)col=mix(skin,C.hair,.45);T.r(cx+x,top+Math.round(y*sc),1,Math.ceil(sc),col);}}
 if(C.style===5)T.r(cx-3,top-Math.round(11*sc),6,Math.round(8*sc),C.hair);if(C.style===1)T.r(cx-R+2,top-Math.round(8*sc),R*2-4,3,C.hair);
 for(const sd of [-1,1])T.r(cx+sd*(half(28)+1)-(sd<0?3:0),Y(22),3,Math.round(12*sc),sd<0?skin:shade);
 const ex=Math.round(R*.42),ew=Math.round(R*.42),ey=Y(23),mood=o.mood||'calm',t=o.t||0;
 for(const sd of [-1,1]){const x0=cx+sd*ex-Math.round(ew/2);
  if(mood==='out'){T.r(x0,ey+2,ew,1,dark);T.r(x0,ey+3,ew,1,shade);}
  else if(mood==='pain'){for(let i=0;i<ew;i++){const inner=sd<0?i/(ew-1):1-i/(ew-1);T.r(x0+i,ey+1+Math.round((1-inner)*2),1,2,dark);}for(let i=0;i<ew+2;i++){const inner=sd<0?i/(ew+1):1-i/(ew+1);T.r(x0-1+i,ey-5+Math.round(inner*3),1,2,C.hair);}}
  else{const open=mood==='shock'?6:4;T.r(x0,ey-1,ew,open+2,dark);T.r(x0+1,ey,ew-2,open,'#efe6d6');const dz=mood==='dizzy'?Math.round(Math.sin(t*7+sd*1.7)*2.5):0,dy=mood==='dizzy'?Math.round(Math.cos(t*7+sd*1.7)*1.5):0;T.r(x0+Math.round(ew/2)-1+dz,ey+1+dy,3,3,'#2a1810');for(let i=0;i<ew+2;i++)T.r(x0-1+i,ey-5-(mood==='shock'?2:0),1,2,C.hair);}}
 T.r(cx-1,Y(27),3,Math.round(12*sc),shade);T.r(cx-3,Y(38),7,3,shade);
 const mw=Math.round(R*.62),mx=cx-Math.round(mw/2),my=Y(46);
 if(mood==='pain'||mood==='shock'){const mh=mood==='shock'?8:6;T.r(mx,my,mw,mh,'#2a0806');T.r(mx+1,my,mw-2,2,'#e6dcc6');T.r(mx+1,my+mh-2,mw-2,2,'#d6ccb6');T.r(mx+2,my+2,mw-4,mh-4,'#5a1410');}
 else if(mood==='out'){T.r(mx+2,my+2,mw-4,2,lip);T.r(mx+mw-5,my+4,2,3,'#d9e6f0');}
 else if(mood==='dizzy'){for(let i=0;i<mw;i++)T.r(mx+i,my+2+Math.round(Math.sin(i*.9+t*6)*1.4),1,2,lip);}
 else T.r(mx+1,my+2,mw-2,2,lip);
 if(o.blood>0){const n=Math.round(o.blood*9*sc);T.r(mx+mw-4,my+3,2,n,BLOOD);T.r(mx+mw-4,my+3+n,2,1,DARK);}}
function torso(q,T,C,ox,oy,o={}){/* Rumpf von vorn: Hals, Schultern, Brust, Bauch, Lendentuch, hängende Oberarme */
 const X=x=>80+ox+x,Y=y=>oy+y,row=(y,hw)=>{for(let x=-Math.ceil(hw);x<Math.ceil(hw);x++){const s=x/hw;T.r(X(x),Y(y),1,1,Math.abs(s)>.96?C.line:s>.5?C.shade:s<-.55?C.light:C.skin);}};
 T.tube(X(-70),Y(30),X(-79),Y(104),24,21,C);T.tube(X(70),Y(30),X(79),Y(104),24,21,{...C,skin:C.shade,light:C.skin});
 for(let y=o.cutNeck?9:-14;y<16;y++)row(y,10);/* der Hals reicht bis unter das Kinn; eine Lücke gibt es nur, wenn der Kopf abgetrennt ist */for(let y=12;y<26;y++)row(y,22+(y-12)*3.6);T.disc(X(-66),Y(28),13,C);T.disc(X(66),Y(28),13,{...C,skin:C.shade,light:C.skin});
 for(let y=24;y<62;y++)row(y,63-(y-24)*.28);for(let y=62;y<108;y++)row(y,52-Math.sin((y-62)/46*Math.PI)*6);
 // Schlüsselbeine, Brustmuskeln, Bauch
 T.line(X(-44),Y(22),X(-8),Y(26),C.light);T.line(X(8),Y(26),X(44),Y(22),C.shade);
 for(let i=-30;i<=30;i++){const y=46+Math.round((1-(i*i)/900)*-0)+Math.round(Math.abs(i)<3?-2:0);if(Math.abs(i)>3){T.r(X(i+(i<0?-18:18)*0),Y(52-Math.round(Math.cos(i/30*Math.PI/2)*4)),1,1,C.shade);}}
 T.r(X(-1),Y(30),1,26,C.shade);T.r(X(-34),Y(44),2,2,mix(C.shade,'#6b2420',.4));T.r(X(32),Y(44),2,2,mix(C.shade,'#6b2420',.5));
 T.r(X(-1),Y(62),1,40,C.shade);for(const y of [70,81,92]){T.r(X(-16),Y(y),14,1,C.shade);T.r(X(2),Y(y),14,1,C.shade);}T.r(X(-1),Y(97),3,3,mix(C.shade,'#000000',.3));
 for(const s of [-1,1])for(let n=0;n<3;n++)T.r(X(s*(40+n*2))-(s>0?6:0),Y(63+n*5),6,1,C.shade);
 for(let y=108;y<130;y++)for(let x=-50;x<50;x++)T.r(X(x),Y(y),1,1,y<112?C.belt:x>24?mix(C.cloth,'#000000',.25):C.cloth);
 if(o.cutNeck){T.oval(X(0),Y(9),10,3,DARK);T.oval(X(0),Y(9),7,2,BLOOD);T.r(X(-1),Y(8),3,2,'#efe6d0');}
 if(o.head){const f=o.off||{dx:0,dy:0,ang:0};turned(q,X(0),Y(-30),f.ang,f.dx,f.dy,(TT,qq)=>{if(o.cutNeck){TT.r(X(-9),Y(-4),18,10,C.skin);TT.r(X(4),Y(-4),5,10,C.shade);TT.oval(X(0),Y(6),9,2.5,DARK);TT.oval(X(0),Y(6),6,1.5,BLOOD);}headShape(qq,TT,C,X(0),Y(-62),23,o.head);});}}
// Ansichten: jede liefert {A:Wundpunkt, dir, w, limbInfo?}
const VIEW={
 head:(q,T,C,o)=>{T.tube(40,104,120,104,36,36,C);T.r(70,78,20,20,C.shade);T.r(72,78,14,18,C.skin);const dy=o.sink||0;turned(q,80,60,o.tilt||0,0,dy,(TT,qq)=>headShape(qq,TT,C,80,10,27,o.face));return {A:{x:93,y:26+dy},dir:{x:.3,y:.95},w:20,flat:true};},
 neck:(q,T,C,o)=>{torso(q,T,C,0,46,{head:o.face,cutNeck:o.cut,off:o.off});return o.cut?{A:{x:80,y:54},dir:{x:0,y:-1},w:20,flat:true}:{A:{x:88,y:54},dir:{x:.25,y:.97},w:16,flat:true};},
 chest:(q,T,C,o)=>{torso(q,T,C,0,6,{head:o.face});return {A:{x:98,y:50},dir:{x:.96,y:.28},w:34,flat:true};},
 belly:(q,T,C,o)=>{torso(q,T,C,0,-36,{});return {A:{x:88,y:52},dir:{x:.97,y:.24},w:34,flat:true};},
 shoulder:(q,T,C,o)=>{torso(q,T,C,62,18,{head:o.face});return {A:{x:76,y:45},dir:{x:.6,y:.8},w:24,flat:true};},
 upperarm:(q,T,C,o)=>{T.r(0,0,34,100,C.shade);T.r(0,0,30,100,C.skin);T.r(0,0,3,100,C.light);const L=limb(q,T,C,[{x:30,y:20,w:34},{x:106,y:60,w:27},{x:154,y:104,w:23}],{...o,seg:0},'ua');T.disc(30,20,18,C);return L;},
 forearm:(q,T,C,o)=>{const L=limb(q,T,C,[{x:-12,y:6,w:30},{x:30,y:32,w:27},{x:112,y:60,w:19},{x:122,y:63,w:19}],{...o,seg:1,tail:TT=>handShape(TT,C,112,60,{limp:o.limp})},'fa');if(!o.cut){const e=L.P[L.P.length-1],p=L.P[L.P.length-2];turned(q,e.x,e.y,Math.atan2(e.y-p.y,e.x-p.x)-Math.atan2(3,10),0,0,TT=>handShape(TT,C,e.x-10,e.y-3,{limp:o.limp}));}return L;},
 hand:(q,T,C,o)=>{const cut=o.cut;T.tube(-6,52,50,52,24,21,C);const A={x:50,y:52},tw=(o.bend||0)*1.15-(o.crumple||0)*.3,rt=(x,y)=>({x:50+(x-50)*Math.cos(tw)-(y-52)*Math.sin(tw),y:52+(x-50)*Math.sin(tw)+(y-52)*Math.cos(tw)});if(!cut)turned(q,50,52,tw,0,0,TT=>handShape(TT,C,52,52,{limp:o.limp,splay:o.crumple}));if(tw)T.disc(50,52,11,C);return {A:o.wrist?A:rt(74,52),dir:{x:1,y:.05},w:24,flat:!o.wrist,P:null,hand:true,rest:(dx,dy,ang)=>{turned(q,52,52,ang,dx,dy,TT=>{handShape(TT,C,52,52,{limp:1});TT.oval(51,52,2.5,10,DARK);});}};},
 thigh:(q,T,C,o)=>{for(let y=0;y<34;y++)for(let x=0;x<54-y;x++)T.r(x,y,1,1,y<5?C.belt:C.cloth);const L=limb(q,T,C,[{x:26,y:20,w:44},{x:108,y:60,w:33},{x:156,y:106,w:28}],{...o,seg:0},'t');for(let y=0;y<30;y++)for(let x=0;x<46-y*1.2;x++)T.r(x,y,1,1,y<5?C.belt:x>30-y?mix(C.cloth,'#000000',.2):C.cloth);return L;},
 shin:(q,T,C,o)=>{const L=limb(q,T,C,[{x:-10,y:2,w:36},{x:28,y:26,w:31},{x:112,y:62,w:19},{x:120,y:65,w:19}],{...o,seg:1,tail:TT=>footShape(TT,C,118,56)},'sh');if(!o.cut){const e=L.P[L.P.length-1],p=L.P[L.P.length-2];turned(q,e.x,e.y,Math.atan2(e.y-p.y,e.x-p.x)-Math.atan2(3,8),0,0,TT=>footShape(TT,C,e.x-2,e.y-9));}return L;},
 foot:(q,T,C,o)=>{T.r(0,80,FW,20,'#8a6c44');T.r(0,80,FW,1,'#b08e5c');T.tube(58,-8,66,52,24,18,C);const tw=(o.bend||0)*.8-(o.crumple||0)*.25,rt=(x,y)=>({x:66+(x-66)*Math.cos(tw)-(y-54)*Math.sin(tw),y:54+(x-66)*Math.sin(tw)+(y-54)*Math.cos(tw)}),A=rt(92,62);if(!o.cut)turned(q,66,54,tw,0,0,TT=>footShape(TT,C,62,56));return {A:o.wrist?{x:66,y:54}:A,dir:{x:.98,y:.2},w:20,flat:!o.wrist,foot:true,rest:(dx,dy,ang)=>{turned(q,62,56,ang,dx,dy,TT=>{footShape(TT,C,62,56);TT.oval(60,58,2.5,8,DARK);});}};}};
const viewOf=part=>({head:'head',neck:'neck',chest:'chest',belly:'belly',ls:'shoulder',rs:'shoulder',lua:'upperarm',rua:'upperarm',lfa:'forearm',rfa:'forearm',lh:'hand',rh:'hand',lt:'thigh',rt:'thigh',lsh:'shin',rsh:'shin',lf:'foot',rf:'foot'})[part]||'chest';
// ---------- Verletzungen: was nach dem Treffer an der Stelle zu sehen ist (k = Sekunden seit dem Treffer) ----------
function drip(T,x,y,len,w=1,c=BLOOD){T.r(x,y,w,len,c);T.r(x-.5,y+len-1,w+1,2,DARK);}
const rnd=(i,s)=>{const v=Math.sin(i*127.1+s*311.7)*43758.5453;return v-Math.floor(v);};
function flow(T,V,k,n,max){const s=V.seed||0,edge=V.flat?999:Math.max(5,(V.w/2-1)/Math.max(.35,Math.abs(V.dir.x)));
 for(let i=0;i<n;i++){const off=(rnd(i,s)-.5)*Math.min(14,3+n*2.2),sp=.6+rnd(i+9,s)*.9,want=max*(.45+rnd(i+5,s)*.75),len=cl((k-.12-rnd(i+3,s)*.35)*max*sp,0,want),run=Math.min(len,edge-Math.abs(off)*.2),ph=rnd(i+7,s)*6,amp=.6+rnd(i+2,s)*1.6,wide=rnd(i+4,s)>.55?2:1;if(len<=0||run<=0)continue;
  const x0=V.A.x+off,y0=V.A.y+1;let x=x0;for(let j=0;j<run;j++){x=x0+Math.sin(j*.22+ph)*amp*Math.min(1,j/6);T.r(x,y0+j,j<run*.5?wide:1,1,j>run-2?DARK:j%7===3?WET:BLOOD);}
  T.r(x-.5,y0+run-1,wide+1,2,DARK);
  if(len>run){/* tropft von der Kante ab */const per=.55+rnd(i+6,s)*.5,u=((k+ph)%per)/per;T.r(x,y0+run+2+u*u*46,1,2+Math.round(u*2),BLOOD);}}}
function patch(T,V,k,size,cols,grow=.5){const p=out(k/grow),rx=size*(V.flat?1:.95)*p,ry=size*.62*p;if(p<=0)return;T.oval(V.A.x,V.A.y,rx,ry,cols[0],.55);T.oval(V.A.x+1,V.A.y,rx*.68,ry*.68,cols[1],.6);if(cols[2])T.oval(V.A.x+1,V.A.y+1,rx*.36,ry*.38,cols[2],.65);}
function gash(T,V,k,len,w){const p=out(k/.12),nx=-V.dir.y,ny=V.dir.x,c=.7,s=.7;/* schräg über die Stelle */for(let i=-len/2;i<=len/2;i++){if(Math.abs(i)>len/2*p)continue;const x=V.A.x+(V.dir.x*c+nx*s)*i*.7+nx*i*.25,y=V.A.y+(V.dir.y*c+ny*s)*i*.7+ny*i*.25,ww=Math.max(1,w*(1-Math.abs(i)/(len/2)*.7));T.r(x-ww/2-1,y-.5,ww+2,2,WET);T.r(x-ww/2,y,ww,1.5,ww>2?'#3d0f0d':DARK);}}
function hole(T,V,k,rad){T.oval(V.A.x,V.A.y,rad+1.5,rad+1,WET);T.oval(V.A.x,V.A.y,rad,rad*.85,'#3d0f0d');}
function spurt(T,V,k,n,force,seed=0){for(let i=0;i<n;i++){const u=((k*1.6+i/n+seed)%1),a=-1.9+((i*53)%20)/14,d=u*force,x=V.A.x+Math.cos(a)*d,y=V.A.y+Math.sin(a)*d+u*u*force*.9;T.r(x,y,i%3?1:2,i%3?1:2,i%2?BLOOD:WET);}}
function crack(T,V,k){if(k>.5)return;const a=1-k/.5;T.r(0,0,0,0,'#fff');let x=V.A.x-7,y=V.A.y-9;for(const [dx,dy] of [[5,4],[-3,5],[6,4],[-2,5],[5,4]]){for(let i=0;i<5;i++)T.r(x+dx*i/5,y+dy*i/5,1.5,1.5,a>.5?'#fffbe8':'#f4d37a');x+=dx;y+=dy;}}
function shards(T,V,n,spread,C){for(let i=0;i<n;i++){const a=i*2.4,d=3+((i*31)%spread),x=V.A.x+Math.cos(a)*d,y=V.A.y+Math.sin(a)*d*.6;T.r(x-1,y-1,4,3,C.light);T.r(x,y-1,2,1,'#efe6d0');T.r(x+2,y+1,1,1,C.line);}}
function stars(T,x,y,t,n=4,rad=22){for(let i=0;i<n;i++){const a=t*4+i*Math.PI*2/n,sx=x+Math.cos(a)*rad,sy=y+Math.sin(a)*rad*.3;if(Math.sin(a)>-.3){T.r(sx-2,sy,5,1,'#f4d37a');T.r(sx,sy-2,1,5,'#f4d37a');T.r(sx,sy,1,1,'#ffffff');}}}
// Heilung des Schädelbruchs (Vorschlag; Regeln legt Thomas fest): Tage im Krankenhaus bis zur vollständigen Ausheilung
const SKULL_DAYS=20,SKULL_STAGES=[['fresh','Frischer Bruch',0,0,'Notversorgung: Blutung stillen, Splitter entfernen'],['bandage','Kopfverband',1,3,'Bettruhe, Verband wird täglich gewechselt'],['patch','Wundauflage',4,7,'Wunde wird genäht und abgedeckt'],['scab','Wundschorf mit Fäden',8,13,'Verband ab, Knochen wächst langsam zusammen'],['scar','Vernarbung',14,19,'Haut schließt sich, Knochen festigt sich'],['plate','Ausgeheilt – Metallplatte',20,20,'Schädel mit Metallplatte versorgt, dauerhaft sichtbar']];
const skullStage=d=>{const x=SKULL_STAGES.find(v=>d>=v[2]&&d<=v[3])||SKULL_STAGES[5];return {id:x[0],name:x[1],from:x[2],to:x[3],text:x[4]};};
const EFFECT={
 scrape:(T,V,k)=>{for(let i=0;i<5;i++){const p=out((k-i*.02)/.1),x=V.A.x-8+i*4,y=V.A.y-5+i*1.2;for(let j=0;j<9*p;j++)T.r(x+j*.5,y+j,1,1,j%3?WET:'#d98a78');}},
 cut:(T,V,k)=>{gash(T,V,k,16,2);flow(T,V,k,2,9);},
 deepcut:(T,V,k)=>{gash(T,V,k,26,5);flow(T,V,k,6,24);if(k>.2&&k<1.4)spurt(T,V,k,5,10);},
 stab:(T,V,k)=>{hole(T,V,k,2);flow(T,V,k,1,9);},
 deepstab:(T,V,k)=>{hole(T,V,k,3.5);flow(T,V,k,4,22);spurt(T,V,k,7,13+Math.sin(k*9)*3);},
 arrow:(T,V,k)=>{hole(T,V,k,2);flow(T,V,k,2,12);},
 sinew:(T,V,k)=>{gash(T,V,k,20,4);flow(T,V,k,4,18);const p=out(k/.3),nx=-V.dir.y,ny=V.dir.x;for(const s of [-1,1]){const bx=V.A.x+nx*s*3,by=V.A.y+ny*s*3;for(let i=0;i<6;i++)T.r(bx+V.dir.x*s*(2+i*p)+Math.sin(i*1.3)*1.2,by+V.dir.y*s*(2+i*p),1.5,1.5,i<4?'#f1e8d2':'#d6ccb2');}},
 gut:(T,V,k)=>{patch(T,V,k,24,['#5a2a3a','#3a1620','#2a0c10'],.8);gash(T,V,k,30,6);flow(T,V,k,8,30);spurt(T,V,k,6,9);},
 pierce:(T,V,k)=>{hole(T,V,k,4);flow(T,V,k,5,24);spurt(T,V,k,8,14);},
 bruise:(T,V,k)=>patch(T,V,k,11,['#8a6a8a','#6b4a7a'],.7),
 contusion:(T,V,k)=>patch(T,V,k,16,['#8a5a78','#6b3a66','#4a2a52'],.8),
 crush:(T,V,k,C)=>{patch(T,V,k,23,['#7a4a70','#4a2a52','#2e1838'],.9);const p=out(k/.6);T.oval(V.A.x-3,V.A.y-4,9*p,3*p,C.light,.5);for(let i=0;i<4;i++)T.r(V.A.x-12+i*8,V.A.y+9+(i%2)*2,5,1,'#3a1f3a');},
 concussion:(T,V,k)=>{patch(T,V,k,10,['#8a5a78','#6b3a66'],.5);stars(T,80,10,k);},
 joint:(T,V,k)=>{patch(T,V,k,14,['#b0504a','#8a3a4a','#5a2a44'],.6);if(k<.45)for(let i=0;i<8;i++){const a=i*Math.PI/4,d=10+k*26;T.r(V.A.x+Math.cos(a)*d,V.A.y+Math.sin(a)*d*.7,2,2,'#fff2c8');}T.oval(V.A.x,V.A.y,5,3,'#d98a78',.35);},
 fracture:(T,V,k,C)=>{patch(T,V,k,15,['#8a5a78','#5a2a52'],.9);crack(T,V,k);T.oval(V.A.x,V.A.y-2,4,2,C.light,.6);},
 badfracture:(T,V,k,C)=>{patch(T,V,k,19,['#8a4a68','#5a2a52','#3a1838'],.9);crack(T,V,k);T.oval(V.A.x+1,V.A.y-3,6,3,'#efe6d0',.75);T.r(V.A.x-1,V.A.y-5,4,2,'#fffbe8');},
 shatter:(T,V,k,C)=>{patch(T,V,k,26,['#7a4a70','#4a2a52','#2e1838'],.9);crack(T,V,k);shards(T,V,6,11,C);},
 pulp:(T,V,k,C)=>{patch(T,V,k,30,['#6a3a60','#3a1c3e','#22102a'],.9);crack(T,V,k);shards(T,V,10,15,C);flow(T,V,k,3,12);},
 sever:(T,V,k)=>{/* Stumpf: Schnittfläche, pulsierende Blutung */const nx=-V.dir.y,ny=V.dir.x,h=V.w/2-1;for(let j=-h;j<=h;j++){T.r(V.A.x+nx*j-1,V.A.y+ny*j-1,4,2,Math.abs(j)>h-2?DARK:BLOOD);}T.r(V.A.x-1,V.A.y-1,3,3,'#efe6d0');const up=V.dir.y<-.9,pulse=.6+.4*Math.sin(k*8);for(let i=0;i<(up?30:16);i++){const u=((k*1.4+i/16)%1),a=Math.atan2(V.dir.y,V.dir.x)+(((i*29)%16)/16-.5)*(up?.7:.9),d=u*(up?54:30)*pulse;T.r(V.A.x+Math.cos(a)*d,V.A.y+Math.sin(a)*d+u*u*26,i%3?1:2,i%3?1:2,i%2?BLOOD:WET);}flow(T,V,k,5,26);},
 scar:(T,V,k)=>{const p=out(k/.5),nx=-V.dir.y,ny=V.dir.x;for(let i=-9;i<=9;i++){if(Math.abs(i)>9*p)continue;const x=V.A.x+V.dir.x*i*.3+nx*i,y=V.A.y+V.dir.y*i*.3+ny*i;T.r(x,y,2,1.5,'#e3b6a8');if(i%4===0){T.r(x-3*V.dir.x,y-3*V.dir.y,1,1,'#b08a80');T.r(x+3*V.dir.x,y+3*V.dir.y,1,1,'#b08a80');}}},
 skullfracture:(T,V,k,C)=>{
  // Schädelbruch: Kopfhaut reißt auf, Schädeldecke bricht ein, Knochenplatten und Splitter stehen offen im Blut
  const H=C.helm,sz=H?(H.mat==='leather'?.9:H.mat==='medium'?.76:.62)-H.q*.012:1,cx=80,cy=37,op=out(k/.16)*sz,lift=out((k-.04)/.38)*sz,sett=out((k-.3)/.7),pulse=.5+.5*Math.sin(k*9);
  const poly=(pts,col)=>{let y0=1e9,y1=-1e9;for(const p of pts){y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);}for(let y=Math.floor(y0);y<=Math.ceil(y1);y++){const xs=[];for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])/(b[1]-a[1])*(b[0]-a[0]));}xs.sort((m,n)=>m-n);for(let i=0;i+1<xs.length;i+=2)T.r(xs[i],y,xs[i+1]-xs[i]+1,1,col);}};
  const ring=(sx,sy,r)=>[[-1,.1],[-.82,-.62],[-.4,-.95],[.05,-.7],[.45,-1.0],[.9,-.55],[1.02,.15],[.78,.78],[.3,.95],[-.1,.7],[-.55,.98],[-.95,.62]].map(([a,b],i)=>[cx+a*sx*r*(1+((i*7)%3)*.05),cy+b*sy*r]);
  // Aufprall: Risse laufen sternförmig vom Treffpunkt über die Kopfhaut
  if(k<.45){const a=1-k/.45;for(let i=0;i<9;i++){const ang=i*.7+.2,len=(10+((i*5)%9))*out(k/.1);for(let d=4;d<len;d++)if(!(op>.7&&d<9))T.r(cx+Math.cos(ang)*d*1.45,cy+Math.sin(ang)*d*.8,1,1,a>.4?'#2a1214':'#5a2024');}}
  if(op<=0)return;
  // geronnenes Blut im Haar um die Wunde
  T.oval(cx,cy+2,19*op,10*op,'#5a1d1a',.75);T.oval(cx-2,cy+3,14*op,7*op,'#7c2a25',.6);
  // aufgeplatzte Kopfhaut: wulstiger Rand, nach außen gerollte Lappen
  if(H){const lk=helmLook(H);poly(ring(1,1,16.5*op),mix(H.mat==='medium'?lk.leather:lk.metal,'#000000',.35));poly(ring(1,1,15*op),lk.edge);poly(ring(1,1,13.6*op),H.mat==='medium'?lk.leather:lk.metal);poly(ring(1,1,12.4*op),'#a8372f');}else{poly(ring(1,1,15*op),'#a8372f');poly(ring(1,1,13.2*op),'#d8806e');}poly(ring(1,1,11.8*op),'#6b2420');
  // dunkle Höhle (eingedrückte Stelle)
  poly(ring(1,.92,10.4*op).map(p=>[p[0]+.6,p[1]+.6]),'#2a0b0c');
  // eingedrückte Knochenplatte, durch den Schlag nach unten gesunken
  const dp=sett*2.5,plate=[[cx-8,cy-3+dp],[cx-3,cy-6+dp],[cx+4,cy-5+dp],[cx+9,cy-1+dp],[cx+7,cy+4+dp],[cx+1,cy+6+dp],[cx-6,cy+4+dp]];
  poly(plate.map(p=>[cx+(p[0]-cx)*op,cy+(p[1]-cy)*op]),'#b9ab8c');poly(plate.map(p=>[cx+(p[0]-cx)*.82*op,cy-1+(p[1]-cy)*.78*op]),'#e6dcc0');poly(plate.map(p=>[cx-2+(p[0]-cx)*.45*op,cy-2+(p[1]-cy)*.4*op]),'#f6efd8');
  // Bruchlinien in der Platte
  for(const [a,b,c,d] of [[-5,-4,-1,0],[-1,0,-3,4],[-1,0,5,2],[5,2,7,-2],[0,-5,2,-1]])T.line(cx+a*op,cy+b*op+dp,cx+c*op,cy+d*op+dp,'#8d7f62',1);
  // aufgestellte Knochensplitter am Rand: ragen aus der Wunde, an der Basis blutig
  const sp=[[-12,-1,-17,-9,-8,-6],[-4,-6,-5,-17,3,-8],[7,-5,14,-14,12,-2],[11,3,19,0,13,7],[-10,4,-17,7,-9,9]];
  sp.forEach(([x0,y0,x1,y1,x2,y2],i)=>{const l=lift*(i%2?.85:1),f=(a,b,c)=>[cx+(a+(b-a)*0)*op,cy+c*op],tip={x:cx+x1*l*1,y:cy+y1*l},b1={x:cx+x0*op,y:cy+y0*op},b2={x:cx+x2*op,y:cy+y2*op};
   poly([[b1.x,b1.y],[tip.x,tip.y],[b2.x,b2.y]],'#9a8c6c');poly([[b1.x+1,b1.y],[tip.x+(b1.x-tip.x)*.12,tip.y+(b1.y-tip.y)*.12],[b2.x-.5,b2.y]],'#e6dcc0');T.r(tip.x,tip.y,1,1,'#fffbe8');
   T.oval((b1.x+b2.x)/2,(b1.y+b2.y)/2,3,1.6,'#a8372f',.85);});
  // Blut quillt aus den Fugen, pulsierend
  T.oval(cx,cy+5,8*op,2.2+pulse*.8,'#a8372f',.95);T.oval(cx+1,cy+4.4,5*op,1.2,'#d6685a',.8);for(const sx of [-8,6])T.oval(cx+sx,cy+3,2.2,1.4+pulse*.6,'#c9584a',.9);
  // fliegende Splitter und Spritzer beim Aufprall
  if(k<.75)for(let i=0;i<12;i++){const u=k/.75,a=-2.9+i*.5,d=u*(14+(i*13)%22),x=cx+Math.cos(a)*d*1.3,y=cy-3+Math.sin(a)*d*.9+u*u*30;T.r(x,y,i%3?1:2,i%3?1:2,i%4===0?'#f1e8d2':i%2?'#c9584a':'#a8372f');}
  // Herzschlag: kurze Spritzer aus der Wunde, solange die Blutung anhält
  if(k>.7){const bt=(k*1.15)%1;if(bt<.4){const u=bt/.4;for(let i=0;i<7;i++){const dir=(i-3)*.8,px=cx+dir*u*11,py=cy-3-Math.sin(u*Math.PI)*(12+i%3*3)+u*u*16;T.r(px,py,i%2?2:1,i%2?2:1,i%3?'#a8372f':'#c9584a');}}}
  // Blut läuft über Stirn und Schläfen
  const run=cl((k-.1)/1.1);
  if(run>0){for(const [x0,len,w,c] of [[-10,34,3,'#a8372f'],[-3,26,2,'#a8372f'],[5,40,3,'#a8372f'],[11,22,2,'#8a2e28'],[-14,18,2,'#8a2e28']]){const y0=cy+5,L=len*run;T.r(cx+x0,y0,w,L,c);T.r(cx+x0,y0,1,L,'#c9584a');T.r(cx+x0-.5,y0+L,w+1,2,'#6b2420');if(run>.6)T.r(cx+x0+(w>2?1:0),y0+L+3+Math.sin(k*8+x0)*1,1,2,'#a8372f');}}
 },

 skullheal:(T,V,k,C)=>{
  // Heilungsverlauf des Schädelbruchs im Krankenhaus (Tag 0–20). Kopf ohne Helm; Tag 20: ausgeheilt, Metallplatte statt Narbe.
  const d=cl(C.healDay??0,0,SKULL_DAYS),cx=82,cy=18,poly=(pts,col)=>{let y0=1e9,y1=-1e9;for(const p of pts){y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);}for(let y=Math.floor(y0);y<=Math.ceil(y1);y++){const xs=[];for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])/(b[1]-a[1])*(b[0]-a[0]));}xs.sort((m,n)=>m-n);for(let i=0;i+1<xs.length;i+=2)T.r(xs[i],y,xs[i+1]-xs[i]+1,1,col);}};
  const st=skullStage(d);
  if(st.id==='fresh'){const e=EFFECT.skullfracture;e(T,V,3,C);return;}
  if(st.id==='bandage'){const soak=1-cl((d-1)/2);T.oval(80,16,26,10,'#8a8470');T.oval(80,15,25,9,'#d8d0b6');for(let i=-24;i<=24;i+=4)T.line(80+i,8,80+i+6,23,'#b9b098',1);T.oval(80,14,22,3,'#e8e2cc',.7);
   T.oval(cx,cy-1,(5+7*soak),(3+4*soak),d<2?'#a8372f':'#7c2a25');T.oval(cx+1,cy-1,(2+4*soak),(1.5+2*soak),d<2?'#c9584a':'#8a3a30');if(d<2)T.r(cx+2,cy+4+Math.sin(k*4)*0,1,3+soak*5,'#a8372f');T.r(98,22,6,3,'#c9c1a8');T.r(99,23,4,5,'#b9b098');return;}
  if(st.id==='patch'){T.oval(cx,cy,14,8,'#8a8470');T.oval(cx,cy-.5,13,7,'#d8d0b6');for(let i=-12;i<=12;i+=4)T.line(cx+i,cy-6,cx+i+3,cy+6,'#b9b098',1);T.oval(cx+1,cy,4,2.5,'#6b2420',.85);T.oval(cx,cy-1,2,1.2,'#8a3a30');return;}
  if(st.id==='scab'){T.oval(cx,cy,13,7,'#c97a6c',.85);T.oval(cx,cy,10,5,'#6b2420');T.oval(cx-1,cy-1,7,3,'#4a1a18');for(let i=-7;i<=7;i+=3){T.r(cx+i,cy-4,1,8,'#1a1210');T.r(cx+i-1,cy-4,3,1,'#1a1210');T.r(cx+i-1,cy+3,3,1,'#1a1210');}return;}
  if(st.id==='scar'){const fade=cl((d-14)/5);T.oval(cx,cy,11,6,mix('#c97a6c','#d9a590',fade));T.oval(cx,cy,8,4,mix('#e29a88','#d9a590',fade));for(let i=-6;i<=6;i++)T.r(cx+i,cy+Math.sin(i*.9)*1.2,1,2,mix('#b4584c','#c98a7a',fade));T.oval(cx-2,cy-2,4,1.5,'#f0c8b6',.5);return;}
  // ausgeheilt: Metallplatte auf kahler, vernarbter Stelle
  T.oval(cx,cy,14,8,'#d9a590');T.oval(cx,cy,12,6.5,'#e0b09c');
  poly([[cx-10,cy-2],[cx-5,cy-6],[cx+5,cy-6],[cx+10,cy-2],[cx+9,cy+4],[cx+3,cy+7],[cx-6,cy+6],[cx-10,cy+3]],'#4a5358');
  poly([[cx-9,cy-2],[cx-5,cy-5],[cx+4,cy-5],[cx+9,cy-2],[cx+8,cy+3],[cx+3,cy+6],[cx-5,cy+5],[cx-9,cy+3]],'#aeb8bd');
  poly([[cx-8,cy-2],[cx-4,cy-4],[cx+2,cy-4],[cx+3,cy-1],[cx-6,cy+1]],'#e8eef0');
  for(const [rx,ry] of [[-6,-2],[6,-2],[-4,4],[5,3]]){T.r(cx+rx,cy+ry,2,2,'#6f7a80');T.r(cx+rx,cy+ry,1,1,'#dfe6e8');}
  T.r(cx-1,cy-5,2,11,'#8d989d');},
 collapse:()=>{},death:()=>{}};
// Einstellungen der Ansicht je Verletzung: Knick, Zerknittern, Abtrennen, schlaffe Finger, Gesichtsausdruck
function viewOptions(kind,part,k,o){const v={face:{mood:k<0?'calm':'pain',t:k}},hit=out(k/.12),wob=k>0?Math.sin(k*30)*Math.exp(-k*6)*.12:0;
 if(kind==='fracture')v.bend=-(.3*hit+wob);if(kind==='badfracture')v.bend=-(.52*hit+wob);if(kind==='shatter'||kind==='pulp'){v.crumple=(kind==='pulp'?1.25:1)*hit+wob;}
 if(kind==='sever'&&k>=0)v.cut=true;if(kind==='sinew'&&k>0)v.limp=out(k/.5);
 if(kind==='sinew'||kind==='joint'){if(['lh','rh','lf','rf'].includes(part))v.wrist=true;}
 if(kind==='skullheal'){v.face={mood:(o.day|0)>0?'calm':'pain',t:k};if((o.day|0)===0)v.sink=18;}
 if(kind==='skullfracture'){v.sink=18;v.face={mood:k<0?'calm':k<.25?'shock':'pain',t:k};}
 if(kind==='concussion')v.face={mood:k<0?'calm':k<.25?'shock':'dizzy',t:k};
 if(kind==='death'){/* drei Arten zu fallen; bei wichtigen Kämpfern langsamer */const slow=o.dramatic?1.7:1,p=ease((k-.5*slow)/(1.5*slow)),way=o.variant||0;v.face={mood:k<.3*slow?'shock':k<.6*slow?'pain':'out',pale:cl(k/(1.6*slow)),t:k,blood:way===2?cl((k-.3)/1.2):0};v.sink=p*(way===2?40:34);v.tilt=p*(way===1?-.7:way===2?-.26:.6);}
 if(kind==='collapse'){const p=ease((k-.2)/1.5);v.face={mood:k<.5?'shock':'out',pale:cl(k/1.2),t:k};v.sink=p*46;v.tilt=p*.5;}
 if(['head','neck'].includes(part)&&kind==='sever'&&k>=0){v.off={dx:k*34,dy:-k*74+k*k*118,ang:k*2.4};v.face={mood:k<.5?'shock':'out',pale:cl(k/1.5),t:k};}
 if(kind==='joint'&&['ls','rs'].includes(part))v.u=.02;return v;}
// ---------- Waffe im Anflug (vor dem Treffer) und im Kontakt ----------
function weaponFx(q,T,V,cls,wid,t,kind){const k=t-HIT,A=V.A;if(cls==='none')return;
 if(cls==='arrow'){/* Pfeil oder Bolzen: schießt herein, bleibt zitternd stecken */const L=wid==='crossbow'?30:44,ang=-2.55,wob=k>0?Math.sin(k*38)*Math.exp(-k*4)*1.6:0,fly=k<0?cl(-k/.14):0,bx=A.x+Math.cos(ang)*(4-fly*150),by=A.y+Math.sin(ang)*(4-fly*150),ex=bx+Math.cos(ang)*L,ey=by+Math.sin(ang)*L+wob;if(k<-.14)return;
  T.line(bx,by,ex,ey,'#4a3620',3);T.line(bx,by,ex,ey,'#8a6a3c',2);T.line(bx,by-1,ex,ey-1,'#c49a58',1);for(let i=0;i<9;i++){const u=1-i*.04,fx=bx+(ex-bx)*u,fy=by+(ey-by)*u;T.r(fx-4,fy-5,3,3,'#f0ead8');T.r(fx+2,fy+3,3,3,'#cfc6b0');T.r(fx-2,fy-3,2,2,'#b8423a');}T.r(ex-1,ey-1,3,3,'#a33a2c');if(k<0){T.r(bx+Math.cos(ang)*-5,by+Math.sin(ang)*-5,3,3,'#dfe4d2');}return;}
 if(k>.5)return;const a=1-cl((k-.25)/.25);q.globalAlpha=a;
 if(cls==='blunt'){/* Kopf der Waffe fällt von oben auf die Stelle und prallt zurück */const p=k<0?cl(1+k/.3):1-cl(k/.3)*.8,hx=A.x+26-p*22,hy=A.y-70+p*62,hw=wid==='hammer'?26:wid==='mace'?18:15,hh=wid==='hammer'?18:wid==='mace'?16:26;
  T.line(hx+hw/2,hy+hh/2,hx+60,hy-58,'#5a4128',4);T.line(hx+hw/2,hy+hh/2,hx+60,hy-58,'#8b6b45',2);
  if(wid==='club'){for(let j=0;j<hh;j++){const w=hw-Math.abs(j-hh/2)*.5;T.r(hx+(hw-w)/2,hy+j,w,1,j<3?'#a8845a':j>hh-4?'#4d3620':'#7b5a38');}T.r(hx+3,hy+5,3,2,'#3a2a1c');T.r(hx+9,hy+14,3,2,'#3a2a1c');}
  else if(wid==='hammer'){/* Kriegshammer: flache Schlagfläche unten trifft, Dorn zeigt nach oben, kleiner Kopf */const cx=hx+hw/2;
   T.r(cx-5,hy+2,10,9,'#3f4642');T.r(cx-4,hy+3,8,7,'#7d8687');T.r(cx-7,hy+11,14,7,'#3f4642');T.r(cx-6,hy+12,12,5,'#8d9693');T.r(cx-6,hy+12,12,2,'#c2c9bf');T.r(cx-7,hy+17,14,1,'#2e3431');
   for(let i=0;i<12;i++){const w=Math.max(1,6-Math.floor(i/2));T.r(cx-w/2-i*.35,hy+2-i,w,1,i%3?'#7d8687':'#c2c9bf');}}
  else{T.r(hx,hy,hw,hh,'#3f4642');T.r(hx+1,hy+1,hw-2,hh-2,'#7d8687');T.r(hx+1,hy+1,hw-2,3,'#c2c9bf');T.r(hx+1,hy+hh-5,hw-2,4,'#515a55');if(wid==='mace')for(let i=0;i<4;i++){T.r(hx-3,hy+2+i*4,4,2,'#9aa39b');T.r(hx+hw-1,hy+2+i*4,4,2,'#5f6863');}}}
 else if(cls==='spear'){/* Spitze stößt schräg hinein und wird wieder herausgezogen */const ang=-2.5,dep=k<0?-cl(-k/.25)*60:k<.18?6:6-(k-.18)/.3*70,tx=A.x+Math.cos(ang)*-dep,ty=A.y+Math.sin(ang)*-dep,sx=tx+Math.cos(ang)*120,sy=ty+Math.sin(ang)*120;
  T.line(tx+Math.cos(ang)*14,ty+Math.sin(ang)*14,sx,sy,'#5a4128',4);T.line(tx+Math.cos(ang)*14,ty+Math.sin(ang)*14-1,sx,sy-1,'#9a7848',1);for(let i=0;i<16;i++){const w=i<3?1+i:i<10?5:Math.max(1,5-(i-10));if(kind==='pierce'||i>(dep>0?dep:0)/1)T.r(tx+Math.cos(ang)*i-w/2,ty+Math.sin(ang)*i-w/2,w,w,i%2?'#dfe4d2':'#aab4aa');}
  if(kind==='pierce'&&k>=0&&k<.3)for(let i=0;i<12;i++){T.r(A.x+Math.cos(ang+Math.PI)*(i+3),A.y+Math.sin(ang+Math.PI)*(i+3),Math.max(1,4-i*.3),Math.max(1,4-i*.3),i%2?'#c9584a':'#dfe4d2');}}
 else{/* Klinge zieht quer über die Stelle; im Kontakt eine helle Schnittspur */const p=k<0?cl(1+k/.22):1,nx=-V.dir.y,ny=V.dir.x,sw=(p-.5)*70,ux=V.dir.x*.7+nx*.7,uy=V.dir.y*.7+ny*.7,bx=A.x+ux*sw,by=A.y+uy*sw,ang=-2.2;
  if(k<.12){const L=wid==='dagger'?34:wid==='axe'||wid==='doubleaxe'?30:56;for(let i=0;i<L;i++){const w=Math.max(1,(wid==='axe'||wid==='doubleaxe')?(i<12?10-i*.3:3):4-i/L*3);T.r(bx+Math.cos(ang)*i-w/2,by+Math.sin(ang)*i-w/2,w+1,w+1,i%5===0?'#f4f6ea':'#c2cbc0');}T.line(bx+Math.cos(ang)*((wid==='dagger'?34:56)),by+Math.sin(ang)*((wid==='dagger'?34:56)),bx+Math.cos(ang)*((wid==='dagger'?34:56)+16),by+Math.sin(ang)*((wid==='dagger'?34:56)+16),'#6e5230',4);}
  if(k>=0&&k<.16){q.globalAlpha=1-k/.16;T.line(A.x-ux*30,A.y-uy*30,A.x+ux*30,A.y+uy*30,'#fffbe8',2);}}
 q.globalAlpha=1;}
// ---------- Ein Bild der Nahaufnahme ----------
const buffers=new WeakMap();
// ---------- Helm in der Nahaufnahme (Aussehen wie im Spiel: Material Leder/Verstärkt/Metall, Qualität 0–6) ----------
const LOOK={leather:[{metal:'#927653',edge:'#b39770',trim:'#5a4630',dark:'#5a4630',stud:'#77664c',cloth:'#695c46'},{metal:'#805936',edge:'#b18c59',trim:'#4e3727',dark:'#4e3727',stud:'#9a8a68',cloth:'#685646'},{metal:'#77492c',edge:'#b98550',trim:'#3d2a1e',dark:'#3d2a1e',stud:'#b89a62',cloth:'#456c65'},{metal:'#6a3d27',edge:'#b0784a',trim:'#c9a55a',dark:'#2f211a',stud:'#c9a55a',cloth:'#395e76'},{metal:'#5a2c22',edge:'#a35c40',trim:'#d8b45e',dark:'#261a17',stud:'#dbdccb',cloth:'#704754'},{metal:'#33292c',edge:'#6d5a58',trim:'#d9b65c',dark:'#17151a',stud:'#ecd184',cloth:'#446c78'},{metal:'#5a1c27',edge:'#a8444a',trim:'#f0cf74',dark:'#26101a',stud:'#fff0bc',gem:'#5fd0c0',cloth:'#703d68'}],
 metal:[{metal:'#8c7861',edge:'#b29d79',trim:'#59432f',cloth:'#695c46'},{metal:'#8d9892',edge:'#c2c5b0',trim:'#5d4834',cloth:'#685646'},{metal:'#a3b2ac',edge:'#dae1ca',trim:'#a4844e',cloth:'#456c65'},{metal:'#6e9699',edge:'#b7d6cc',trim:'#cbb782',cloth:'#395e76'},{metal:'#b9c0cb',edge:'#edf0db',trim:'#d9aa54',cloth:'#704754'},{metal:'#dec591',edge:'#fff0bc',trim:'#855a39',cloth:'#446c78'},{metal:'#e9d693',edge:'#fff4d3',trim:'#c06d45',cloth:'#703d68'}]};
const MEDL=['#6f5a43','#6b4a30','#5f3d27','#553423','#4a2a20','#352626','#42202a'],DARKL=['#5a4630','#4e3727','#3d2a1e','#2f211a','#261a17','#17151a','#26101a'];
function helmLook(h){const q=cl(h.q|0,0,6);if(h.mat==='leather')return LOOK.leather[q];const p={...LOOK.metal[q]};if(h.mat==='medium'){p.leather=MEDL[q];p.dark=DARKL[q];}return p;}
function helmClose(T,h,k,cx=80,top=28){const q=cl(h.q|0,0,6),p=helmLook(h),soft=h.mat==='leather',mixed=h.mat==='medium',dome=mixed?p.leather:p.metal,shadeC=mix(dome,'#000000',.32),hit=k>0?out(k/.15):0,R=28;
 for(let yy=-10;yy<=15;yy++){const u=(yy-15)/25,hw=Math.round((R+1)*Math.sqrt(Math.max(0,1-u*u)));if(hw<1)continue;for(let x=-hw;x<=hw;x++){const s=x/hw;let c=dome;if(s<-.4)c=mix(dome,p.edge,.55);else if(s>.45)c=shadeC;if(yy<-6)c=mix(c,p.edge,.25);
   // Eindellung: Schatten oben links, Licht unten rechts am Rand der Delle
   const dd=Math.hypot((x)/(14),(yy+top-37)/(8));if(hit&&dd<1.05&&dd>.78)c=x<0?mix(c,'#000000',.4*hit):mix(c,p.edge,.45*hit);else if(hit&&dd<=.78)c=mix(c,'#000000',.22*hit);
   T.r(cx+x,top+yy,1,1,c);}}
 // Stirnband und Beschläge
 T.r(cx-R,top+12,R*2+1,4,soft&&q<5?p.dark:p.trim);T.r(cx-R,top+12,R*2+1,1,p.edge);if(q>=1)for(let n=-R+3;n<R;n+=6)T.r(cx+n,top+13,2,2,soft?(p.stud||p.edge):p.edge);
 if(q===0&&!mixed)for(let n=-16;n<17;n+=8)T.r(cx+n,top-1,1,9,p.cloth);
 if(mixed){T.r(cx-14,top-9,29,3,p.metal);T.r(cx-14,top-9,29,1,p.edge);T.r(cx-1,top-9,3,22,p.metal);}
 if(soft){if(q>=2)for(let n=-14;n<15;n+=4)T.r(cx+n,top+8,1,1,p.edge);if(q>=4)T.r(cx,top-9,3,22,p.dark);if(q===6)T.r(cx-1,top+13,3,3,p.gem);}
 // Wangenklappen über den Ohren
 if(q>=1)for(const sd of [-1,1]){const x0=cx+sd*(R-4)-(sd<0?1:2);T.r(x0,top+16,5,20,mixed?p.metal:dome);T.r(x0+(sd<0?0:4),top+16,1,20,sd<0?p.edge:shadeC);T.r(x0,top+35,5,2,p.trim);}
 // Nasenschiene bei Metall
 if(!soft&&!mixed&&q>=2){T.r(cx-1,top+16,3,17,dome);T.r(cx-1,top+16,1,17,p.edge);}
 // Kamm und Zier
 if(q>=3){T.r(cx-2,top-17,5,8,p.cloth);T.r(cx-6,top-16,13,3,p.trim);}
 if(q>=5){T.r(cx-R+1,top-3,4,6,p.trim);T.r(cx+R-4,top-3,4,6,p.trim);}
 if(q===6){T.r(cx,top-24,3,8,p.edge);T.r(cx,top+6,3,3,soft?p.gem:'#c06d45');}}
function helmOf(g){try{const it=M.armorItems?.(g)?.find(i=>M.definition(i)?.parts?.includes('head'));return it?{mat:['leather','medium','metal'].includes(it.material)?it.material:'metal',q:it.q|0}:null;}catch{return null;}}
function paint(g,w,h,o,t){const kind0=o.kind||kindOf(o.injury);
 if((kind0==='death'||(kind0==='collapse'&&o.fall))&&M.faceShot){/* Wer fällt: Großaufnahme des Kämpfers mit Rüstung (face-shots.js), Augen schließen sich, der Kopf sinkt */const k=t-HIT,dead=kind0==='death',slow=o.dramatic?1.7:1,p=ease((k-.5*slow)/(1.5*slow)),way=o.variant||0;
  M.faceShot.paint(g,w,h,{g:o.g,team:o.team,mood:k<0?'determined':k<.3*slow?'shock':k<.65*slow&&dead?'pain':'out',pale:dead?cl(k/(1.6*slow)):0,blood:dead&&way===2?cl((k-.3)/1.2):0,sink:p*(dead?30:18),tilt:p*(way===1?-.5:way===2?-.2:.45)*(dead?1:.6),dark:dead?cl((k-(o.dramatic?2.4:1.5))/(o.dramatic?2.4:1.4))*(o.dramatic?.6:.42):0,yaw:(o.team===1?-1:1)*(.55-.5*cl(t/(o.dramatic?5:3))),zoom:1+.12*cl(k/2)},t);
  if(k>=0&&k<.09){g.globalAlpha=.7*(1-k/.09);g.fillStyle='#fff6dc';g.fillRect(0,0,w,h);g.globalAlpha=1;}
  if(o.dramatic){const bar=Math.round(h*.07);g.fillStyle='#050302';g.fillRect(0,0,w,bar);const rv=g.createRadialGradient(w/2,h/2,Math.min(w,h)*.35,w/2,h/2,Math.max(w,h)*.7);rv.addColorStop(0,'rgba(120,0,0,0)');rv.addColorStop(1,'rgba(140,10,6,'+(.25+.12*Math.sin(t*5)).toFixed(3)+')');g.fillStyle=rv;g.fillRect(0,0,w,h);}
  caption(g,w,h,{...o,noFace:true},t,kind0);return;}
 let b=buffers.get(g.canvas);if(!b){b=document.createElement('canvas');b.width=FW;b.height=FH;buffers.set(g.canvas,b);}const q=b.getContext('2d');q.imageSmoothingEnabled=false;q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,FW,FH);
 const T=tools(q),C=palette(o.g),kind=o.kind||kindOf(o.injury),k=t-HIT,cls=o.cls||weaponClass(o.wid),right=o.part[0]==='r'&&o.part!=='r';
 backdrop(q,T,t);const view=kind==='sever'&&o.part==='head'?'neck':viewOf(o.part),V=VIEW[view](q,T,C,viewOptions(kind,o.part,k,o));V.A=V.mid?{x:V.mid.x,y:V.mid.y}:V.A;V.seed=[...(o.part+kind+(o.g?.id||o.g?.name||''))].reduce((n,c)=>(n*31+c.charCodeAt(0))%9973,7);
 if(kind==='sever'&&k>=0&&V.rest&&o.part!=='head'&&o.part!=='neck'){const fall=k*k*70;V.rest(V.dir.x*(4+k*22),V.dir.y*4+fall,k*1.4);}
 if(kind==='skullheal'){V.A=(o.day|0)>0?{x:82,y:20}:{x:80,y:38};C.healDay=o.day;}
 if(kind==='skullfracture'){V.A={x:80,y:38};C.helm=o.helm===undefined?helmOf(o.g):o.helm;if(C.helm)helmClose(T,C.helm,k);}
 if(k>=0){EFFECT[kind]?.(T,V,k,C);if(kind==='collapse'||kind==='death'){for(let i=0;i<5;i++){const u=(t*.9+i/5)%1;T.r(60+i*9,70+u*26,1,2,BLOOD);}T.oval(80,97,cl(k/2)*46,cl(k/2)*4,DARK);T.oval(82,97,cl(k/2)*30,cl(k/2)*2.4,BLOOD);}}
 if(kind==='death'&&k>0){q.globalAlpha=cl((k-(o.dramatic?2.2:1.3))/(o.dramatic?2.4:1.4))*(o.dramatic?.55:.38);T.r(0,0,FW,FH,'#050302');q.globalAlpha=1;}
 if(kind!=='collapse'&&kind!=='scar'&&kind!=='death'&&kind!=='skullheal')weaponFx(q,T,V,kind==='arrow'?'arrow':cls,o.wid,t,kind);
 if(k>=0&&k<.09){q.globalAlpha=.75*(1-k/.09);T.r(0,0,FW,FH,'#fff6dc');q.globalAlpha=1;}
 // Ausgabe: ganzzahlig vergrößert, rechte Körperseite gespiegelt, kurzes Zittern beim Treffer, langsamer Zug ins Bild
 const near=kind==='collapse'||kind==='death'?0:kind==='sever'&&['head','neck'].includes(o.part)?.16:kind==='sever'||['head','neck'].includes(o.part)?.2:({thigh:.14,upperarm:.28,chest:.36,belly:.36,shoulder:.36})[view]??.48,pin=k<0?0:out(k/.22),zoom=1+.04*ease(t/LEN)+near*pin+(k>0?.06*k/LEN:0),s=Math.max(w/FW,h/FH)*zoom,shake=k>=0&&k<.3?(1-k/.3)*5:0,dw=Math.round(FW*s),dh=Math.round(FH*s),pf=near?pin:0;let dx=Math.round(w/2-(FW/2+(V.A.x-FW/2)*pf)*s),dy=Math.round((h/2-FH/2*s)*(1-pf)+(h*.36-V.A.y*s)*pf);dx=Math.max(w-dw,Math.min(0,dx))+Math.round((Math.random()-.5)*shake*s*.4);dy=Math.max(h-dh,Math.min(0,dy))+Math.round((Math.random()-.5)*shake*s*.3);
 g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;g.fillStyle='#120c09';g.fillRect(0,0,w,h);g.save();if(right){g.translate(w,0);g.scale(-1,1);}g.drawImage(b,dx,dy,dw,dh);g.restore();
 const vg=g.createRadialGradient(w/2,h/2,Math.min(w,h)*.3,w/2,h/2,Math.max(w,h)*.72);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.6)');g.fillStyle=vg;g.fillRect(0,0,w,h);
 if(o.dramatic){/* Kinobalken und roter Rand */const bar=Math.round(h*.07);g.fillStyle='#050302';g.fillRect(0,0,w,bar);const rv=g.createRadialGradient(w/2,h/2,Math.min(w,h)*.35,w/2,h/2,Math.max(w,h)*.7);rv.addColorStop(0,'rgba(120,0,0,0)');rv.addColorStop(1,'rgba(140,10,6,'+(.25+.12*Math.sin(t*5)).toFixed(3)+')');g.fillStyle=rv;g.fillRect(0,0,w,h);}
 caption(g,w,h,o,t,kind);}
// Beschriftung wie eine Einblendung im Kampf: Porträt und Name des Getroffenen, wer womit, die Verletzung groß
const faces=new WeakMap();
function caption(g,w,h,o,t,kind){const k=t-HIT,u=Math.min(w/660,h/420)*(o.textScale||1);let f=faces.get(o.g);if(!f&&o.g&&!o.noFace){f=document.createElement('canvas');try{M.renderPortrait(f,o.g,{unarmored:true});}catch{}faces.set(o.g,f);}
 const pw=o.noFace?-Math.round(12*u):Math.round(72*u),ph=Math.round(90*u),px=Math.round(10*u),py=Math.round(10*u);if(!o.noFace){g.fillStyle='#17201c';g.fillRect(px-3,py-3,pw+6,ph+6);g.fillStyle='#e0b565';g.fillRect(px-2,py-2,pw+4,ph+4);if(f?.width)g.drawImage(f,px,py,pw,ph);}
 g.textAlign='left';g.textBaseline='top';g.font=`bold ${Math.round(25*u)}px 'Courier Prime',monospace`;const name=String(o.g?.name||'').toUpperCase();g.fillStyle='#17201c';g.fillText(name,px+pw+12*u+2,py+2);g.fillStyle='#efe0b3';g.fillText(name,px+pw+12*u,py);
 g.font=`bold ${Math.round(19*u)}px 'Courier Prime',monospace`;g.fillStyle='#17201c';g.fillText(M.partName(o.part),px+pw+12*u+2,py+31*u+2);g.fillStyle='#e0b565';g.fillText(M.partName(o.part),px+pw+12*u,py+31*u);
 if(k<0)return;const a=cl(k/.18),bh=Math.round(124*u),by=h-bh;g.globalAlpha=a*.86;g.fillStyle='#0d0a08';g.fillRect(0,by,w,bh);g.globalAlpha=a;g.fillStyle='#a3231d';g.fillRect(0,by,w,Math.max(2,Math.round(3*u)));
 g.textAlign='center';const fit=(txt,px,bold)=>{let z=Math.round(px*u);do{g.font=`${bold?'bold ':''}${z}px 'Courier Prime',monospace`;}while(g.measureText(txt).width>w-40*u&&--z>8);return z;};const l1=o.line1||((o.attacker||'')+(o.weaponName?' · '+o.weaponName:''));fit(l1,21);g.fillStyle='#d9cfb0';g.fillText(l1,w/2,by+11*u);
 const big=(o.title||o.injury||'').toUpperCase(),size=fit(big,44,true),pop=1+.25*(1-cl(k/.22));g.font=`bold ${Math.round(size*pop)}px 'Courier Prime',monospace`;g.fillStyle='#17201c';g.fillText(big,w/2+2,by+38*u+2);g.fillStyle=o.color||'#f4d37a';g.fillText(big,w/2,by+38*u);
 fit(o.line3||'',20);g.fillStyle='#efe0b3';g.fillText(o.line3||'',w/2,by+90*u);g.globalAlpha=1;
 if(o.waiting&&Math.sin(t*0+performance.now()/260)>-.2){/* wartet auf Antippen */g.textAlign='right';g.font=`bold ${Math.round(17*u)}px 'Courier Prime',monospace`;g.fillStyle='#17201c';g.fillText('TIPPEN ▸',w-12*u+2,by-26*u+2);g.fillStyle='#f4d37a';g.fillText('TIPPEN ▸',w-12*u,by-26*u);}}
// ---------- Abspielen: in eine vorhandene Leinwand (Film) oder als eigene Einblendung (Galerie, später Arena) ----------
function sound(kind,cls){const s=M.sound;if(!s)return;if(kind==='sever')s('sever');else if(['fracture','badfracture','shatter','pulp'].includes(kind)){s('heavy');s('fall');}else if(cls==='blunt'||['bruise','contusion','crush','joint','concussion'].includes(kind))s('hit');else if(kind==='collapse')s('fall');else if(['stab','deepstab','arrow','pierce'].includes(kind))s('stick');else if(kind!=='scar')s('slash');}
function start(o){const end=o.len||LEN,shot={o:{...o,kind:o.kind||kindOf(o.injury)},t:o.from||0,hit:false,done:false,step(dt){this.t+=dt;if(!this.hit&&this.t>=HIT){this.hit=true;if(!this.o.mute)sound(this.o.kind,this.o.cls||weaponClass(this.o.wid));if(!this.o.mute&&this.o.g?.appearance&&!['scar'].includes(this.o.kind))M.voice?.('pain',(M.voicePitch?.(this.o?.g)??1),true);}if(this.t>=end){if(this.o.hold&&!this.released){this.t=end-.001;this.o.waiting=true;return true;}this.done=true;}return !this.done;},paint(g,w,h){paint(g,w,h,this.o,this.t);},skip(){if(this.t<HIT)this.t=HIT;else{this.released=true;this.done=true;}}};return shot;}
let live=null;
function play(o,onDone){stop();const v=document.createElement('div');v.className='injury-shot';v.innerHTML='<canvas width="660" height="420"></canvas>';document.body.appendChild(v);const c=v.firstChild,g=c.getContext('2d'),shot=start(o);let last=performance.now();live={v,shot};v.addEventListener('click',()=>shot.skip());
 const frame=now=>{if(!live||live.shot!==shot)return;const dt=Math.min(.05,(now-last)/1000);last=now;if(!shot.step(dt)){stop();onDone?.();return;}shot.paint(g,c.width,c.height);requestAnimationFrame(frame);};requestAnimationFrame(frame);return shot;}
function stop(){live?.v.remove();live=null;}
// Später in der Arena nur für Treffer mit Folgen: Dauerschaden, Bruch, Abtrennung, schwere Stufe oder Zusammenbruch durch Blutverlust
const relevant=(p,down)=>!!(p?.missing||p?.chronic>0||p?.fracture||M.injuryGrade(p)>=3||down);
// =====================================================================================================

M.figureLabShots={paint,start,kindOf};})();

// Current production face renderer; sandbox-only dependency.
'use strict';
// ARENA THEORY · FACE RENDERER V3 · optional replacement for dist/face-shots.js
// Großes Pixelbild von Kopf und Schultern im Stil der Nahaufnahmen aus Intro und Attentat: kleines Bild (160 × 104),
// ganzzahlig vergrößert. Haut, Schatten, Haar, Frisur und Bart kommen vom Gladiator (g.appearance); Helm, Brustpanzer
// und Schulterplatten von dem, was er wirklich trägt (M.armorItems, Farben aus M.itemLook je Material und Güte).
// Dazu Mimik je Stimmung und eine Kamera, die langsam um den Kopf fährt (yaw: Gesichtszüge, Ohren und Hintergrund
// verschieben sich gegeneinander). Reine Darstellung.
(()=>{
const M=window.MG;if(!M)return;
const FW=160,FH=104,cl=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=v=>{v=cl(v);return v*v*(3-2*v);};
const mix=(a,b,k)=>{const p=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)),x=p(a),y=p(b);return '#'+x.map((v,i)=>Math.max(0,Math.min(255,Math.round(v+(y[i]-v)*k))).toString(16).padStart(2,'0')).join('');};
const hex=c=>/^#[0-9a-f]{6}$/i.test(c||'')?c:null;
// Mimik: Augenöffnung, Pupillen, Brauen (inner/outer: + ist tiefer), Mund, Zugaben
const MOODS={
 calm:{open:1,brow:[0,0],mouth:'line'},
 confident:{open:.75,brow:[1,-1],lift:1,mouth:'smirk'},
 grin:{open:.45,brow:[-1,0],mouth:'grin'},
 determined:{open:.8,brow:[2,-1],mouth:'firm'},
 dumb:{open:1.25,brow:[-3,-3],uneven:2,cross:1,mouth:'gape'},
 nervous:{open:1.1,brow:[-2,1],dart:1,mouth:'wobble',sweat:1},
 scared:{open:1.35,brow:[-3,1],tiny:1,mouth:'o',sweat:2,pale:.35,tremble:1},
 plead:{open:1.3,brow:[-4,2],up:1,mouth:'wobble',tears:1,pale:.15},
 terror:{open:1.45,brow:[-4,1],tiny:1,mouth:'o',tears:2,sweat:2,pale:.45,tremble:1},
 relief:{open:.18,brow:[-3,1],mouth:'grin',tears:2},
 roar:{open:.5,brow:[3,-2],mouth:'roar'},
 shock:{open:1.4,brow:[-3,0],tiny:1,mouth:'o'},
 pain:{open:.15,brow:[2,-2],mouth:'teeth'},
 out:{open:0,brow:[0,0],mouth:'slack',pale:.5}};
function tools(q){const r=(x,y,w,h,c)=>{q.fillStyle=c;q.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};return {r};}
// ---------- Hintergrund: Arenamauer, Ränge, Banner in Mannschaftsfarbe, Fackelschein; verschiebt sich gegen die Kamera ----------
function backdrop(q,T,o,yaw,t){const sx=Math.round(-yaw*14),team=o.team===1?['#6e201b','#a3352c','#d6b45a']:o.team===0?['#1d4a6e','#2f7fb8','#d6b45a']:['#4a3f22','#7a6a3a','#d6b45a'];
 T.r(0,0,FW,FH,'#1c150e');{const wall=(q2,T2)=>{for(let y=0;y<34;y+=2)for(let x=-20;x<FW+20;x+=3){const n=Math.sin(x*12.9+y*78.2)*43758.5,v=n-Math.floor(n);T2.r(x+sx*.5+(y%4?1:0),y,2,2,v>.66?'#5a4632':v>.33?'#3f3122':'#2c2218');}},c=stillArt('wall'+sx,FW,36,wall);if(c&&typeof q.drawImage==='function')q.drawImage(c,0,0);else wall(q,T);}
 T.r(0,34,FW,3,'#8a7550');T.r(0,37,FW,FH,'#3a2c1c');for(let x=-30;x<FW+30;x+=22){T.r(x+sx,40,20,30,'#4a3824');T.r(x+sx,40,20,1,'#6a5236');}
 for(const bx of [18,134]){T.r(bx+sx,0,12,46,team[0]);T.r(bx+2+sx,0,8,44,team[1]);T.r(bx+2+sx,22,8,2,team[2]);T.r(bx+4+sx,30,4,4,team[2]);}
 const gx=128+sx,gl=q.createRadialGradient(gx,18,2,gx,18,70);gl.addColorStop(0,'rgba(245,170,90,'+(.5+.06*Math.sin(t*9)).toFixed(3)+')');gl.addColorStop(1,'rgba(0,0,0,0)');q.fillStyle=gl;q.fillRect(0,0,FW,FH);
 for(let i=0;i<6;i++){const k=(t*.22+i/6)%1;T.r(10+i*27+sx*.3+Math.sin(t+i)*3,FH-4-k*70,1,1,'#e8c890');}}
// Am Boden: Sand der Arena von oben, mit Wellen, Steinchen und Blut
/* Leistung (26.10.): Sand und Mauerrauschen ändern sich nie (nur mit dem Kameraschwenk) – einmal vorberechnet und als Bild eingesetzt, pixelgleich */
const still=new Map();function stillArt(key,w,h,draw){let c=still.get(key);if(c===undefined){c=null;try{c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');if(!x||typeof x.fillRect!=='function')c=null;else{x.imageSmoothingEnabled=false;draw(x,tools(x));}}catch{c=null;}if(still.size>80)still.clear();still.set(key,c);}return c;}
function sandBase(q,T){T.r(0,0,FW,FH+40,'#b38c54');for(let y=0;y<FH+40;y+=2)for(let x=0;x<FW;x+=2){const n=Math.sin(x*12.9898+y*78.233)*43758.5453,v=n-Math.floor(n);if(v>.8)T.r(x,y,2,1,'#c9a268');else if(v<.12)T.r(x,y,2,1,'#96733f');}
 for(let i=0;i<7;i++)for(let x=0;x<FW;x+=3)T.r(x,12+i*17+Math.round(Math.sin(x*.07+i*1.7)*3),3,1,'#a17c47');
 for(const [x,y,r] of [[30,70,9],[120,30,6],[136,84,11],[52,22,4]]){for(let j=-r;j<=r;j++){const hw=Math.sqrt(r*r-j*j)*1.5;T.r(x-hw,y+j*.5,hw*2,1,'#7b2f2a');}}}
function sand(q,T,o,t){const c=stillArt('sand',FW,FH+40,sandBase);if(c&&typeof q.drawImage==='function')q.drawImage(c,0,0);else sandBase(q,T);
 if(o.pool>0){const r=10+o.pool*24;for(let j=-r;j<=r;j++){const hw=Math.sqrt(r*r-j*j)*1.6;T.r(80-hw,88+j*.45,hw*2,1,j>r*.3?'#5e1f1c':'#8f2f28');}}}
// ---------- Schultern und Rüstung ----------
function torso(q,T,C,o,yaw){const H=o.ground?FH+38:FH,sx=Math.round(yaw*3),A=o.armor||{},chest=A.chestplate,sk=C.skin,sh=C.shade,row=(y,hw,c0,c1,c2)=>{/* gleiche Pixel wie früher, aber gleichfarbige Nachbarn als ein Streifen statt einzeln (Leistung) */const e=Math.ceil(hw);let x0=-e,cp=null;for(let x=-e;x<=e;x++){const c=x<e?(x/hw>.5?c2:x/hw<-.55?c0:c1):null;if(c!==cp){if(cp!==null)T.r(80+sx+x0,y,x-x0,1,cp);x0=x;cp=c;}}};
 for(let y=80;y<H;y++){const hw=30+(y-80)*4.4;row(y,Math.min(80,hw),C.light,sk,sh);}
 // Trapezmuskel und Schlüsselbein
 T.r(80+sx-30,88,22,1,C.light);T.r(80+sx+10,88,22,1,sh);
 if(chest){const p=M.itemLook(chest),soft=chest.material==='leather',mid=chest.material==='medium',base=mid?p.leather:p.metal,q2=chest.q||0;
  for(let y=88;y<H;y++){const hw=Math.min(72,38+(y-88)*3.6);row(y,hw,mix(base,'#ffffff',.18),base,mix(base,'#000000',.3));}
  // Halsausschnitt
  for(let y=88;y<98;y++){const hw=17-(y-88)*1.5;if(hw>0)row(y,hw,C.light,sk,sh);}
  for(let x=-17;x<=17;x++)T.r(80+sx+x,88+Math.round(Math.max(0,10-Math.abs(x)*.6)),1,2,p.trim);
  if(soft){for(let x=-50;x<=50;x+=6)T.r(80+sx+x,101,2,1,p.edge);T.r(80+sx-1,100,2,FH,p.dark);if(q2>=3)for(const x of [-30,30])T.r(80+sx+x,97,3,3,p.stud);}
  else{T.r(80+sx-44,99,88,1,p.edge);T.r(80+sx-1,100,2,FH,mix(base,'#000000',.4));for(const x of [-36,-22,22,36])T.r(80+sx+x,102,2,2,p.stud||p.edge);if(mid)for(const x of [-28,28]){T.r(80+sx+x-3,94,6,FH,p.metal);T.r(80+sx+x-3,94,1,FH,p.edge);}}
  if(q2>=5)T.r(80+sx-3,96,6,6,p.gem||p.trim);}
 else{/* nackter Oberkörper mit Schultergurt */for(let i=0;i<34;i++){T.r(80+sx-44+i*2.2,FH-2-i*.75,5,2,'#5a4128');T.r(80+sx-44+i*2.2,FH-2-i*.75,5,1,'#7b5a38');}}
 // Schulterplatten: Bildseite links ist seine rechte Schulter
 for(const [id,side] of [['rightshoulder',-1],['leftshoulder',1]]){const it=A[id];if(!it)continue;const p=M.itemLook(it),base=it.material==='medium'?p.leather:p.metal,x0=80+sx+side*56,far=side*yaw>0?.82:1;
  for(let y=0;y<24;y++){const hw=(26-Math.abs(y-8)*.9)*far;for(let x=-Math.ceil(hw);x<Math.ceil(hw);x++)T.r(x0+x,79+y,1,1,y<2?mix(base,'#ffffff',.3):x*side>hw*.4?mix(base,'#000000',.3):base);}
  T.r(x0-22*far,92,44*far,2,p.trim);T.r(x0-2,84,4,4,p.stud||p.edge);if(it.material==='leather')for(let x=-16;x<=16;x+=5)T.r(x0+x*far,97,2,1,p.edge);else T.r(x0-20*far,96,40*far,1,mix(base,'#000000',.35));}}
// ---------- Kopf: eigene Fläche, damit er als Ganzes sinken und kippen kann ----------
function head(q,T,C,o,yaw,t,mood){
 const r=T.r,dx=Math.round(yaw*4),cx=80+dx,cy=10,m=MOODS[mood]||MOODS.calm;
 let seed=2166136261;for(const c of String(o.g?.appearance?.faceSeed??C.faceSeed??o.g?.id??C.identity??'portrait'))seed=Math.imul(seed^c.charCodeAt(0),16777619);seed>>>=0;
 const sx=.96+(seed%9)*.01,sy=.98+((seed>>>5)%5)*.01,pale=Math.max(m.pale||0,o.pale||0),sk=mix(C.skin,'#c9c4b0',pale*.6),sh=mix(C.shade,'#8a8778',pale*.6);
 const st=C.style,beard=C.beard;let feature=false;
 const X=x=>cx+x*sx+(feature?yaw*5:0),Y=y=>cy+y*sy;

 const P={outline:mix(sh,'#281b1b',.58),deep:mix(sh,'#3b2523',.40),shadow:mix(sh,'#794c3d',.20),half:mix(sk,sh,.38),skin:sk,warm:mix(sk,'#c98964',.25),light:mix(sk,'#f6d2a0',.30),bright:mix(sk,'#ffe0b2',.47),red:mix(sk,'#ad6054',.35),hair:C.hair,hairDark:mix(C.hair,'#100f13',.53),hairMid:mix(C.hair,'#927255',.23),hairLight:mix(C.hair,'#b79769',.36)};
 // Scanline polygons: actual pixel art, with no blurred edges or raster-image assets.
 function poly(points,color){const ps=points.map(([x,y])=>[X(x),Y(y)]);let lo=Math.floor(Math.min(...ps.map(p=>p[1]))),hi=Math.ceil(Math.max(...ps.map(p=>p[1])));for(let y=lo;y<hi;y++){const xs=[];for(let i=0,j=ps.length-1;i<ps.length;j=i++){const a=ps[j],b=ps[i];if((a[1]<=y+.5&&b[1]>y+.5)||(b[1]<=y+.5&&a[1]>y+.5))xs.push(a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort((a,b)=>a-b);for(let i=0;i<xs.length;i+=2)if(xs[i+1]>xs[i])r(Math.ceil(xs[i]),y,Math.floor(xs[i+1])-Math.ceil(xs[i])+1,1,color);}}
 const R=(x,y,w,h,c)=>r(X(x),Y(y),w*sx,h*sy,c);
 // Neck and the shadow cast by the jaw connect the portrait to the original torso.
 poly([[-13,55],[12,55],[14,76],[23,82],[-23,82],[-15,76]],P.half);
 poly([[-13,58],[-3,63],[-3,78],[-16,79]],P.light);poly([[3,63],[12,58],[14,76],[22,82],[6,82]],P.shadow);
 poly([[-14,57],[14,57],[12,65],[1,70],[-11,65]],P.deep);
 if(st===3||st===4){poly([[-24,5],[-33,17],[-32,73],[-23,77],[-21,40]],P.hair);poly([[22,7],[32,18],[31,74],[23,72],[22,37]],P.hairDark);for(const x of [-30,-26,26,29])R(x,31,1,36,x<0?P.hairMid:P.hair);}
 // Ears, helix and concha remain attached to the head silhouette.
 for(const sd of [-1,1]){const x=sd*28;R(x-3,25,6,16,P.deep);R(x-3,26,5,12,sd<0?P.warm:P.half);R(x-2,27,3,2,P.light);R(x-1,30,2,7,P.shadow);R(x-2,36,2,3,P.red);}
 // Angular skull: narrower temples and a distinct jaw, avoiding a circular mask.
 poly([[-20,0],[-8,-5],[10,-5],[23,2],[29,14],[28,39],[24,51],[16,60],[6,65],[-6,65],[-18,59],[-26,49],[-29,34],[-28,14]],P.outline);
 poly([[-19,1],[-7,-3],[11,-3],[22,4],[26,16],[25,37],[21,49],[13,58],[4,62],[-7,61],[-18,55],[-24,44],[-26,29],[-25,14]],P.skin);
 // Broad light planes are continuous, with smaller accents on the bony landmarks.
 poly([[-19,8],[-9,5],[-7,15],[-12,24],[-18,28],[-23,23],[-24,16]],P.light);
 poly([[-9,6],[10,5],[17,13],[14,19],[-6,18]],P.warm);
 poly([[18,8],[25,15],[25,36],[19,39],[14,30],[16,20]],P.shadow);
 poly([[-24,26],[-18,29],[-19,35],[-12,39],[-17,45],[-23,42],[-25,33]],P.half);
 poly([[-17,32],[-8,35],[-9,41],[-18,41],[-22,37]],P.light);
 poly([[-17,33],[-11,34],[-13,36],[-20,37]],P.bright);
 poly([[10,33],[18,31],[24,35],[20,43],[10,39]],P.half);
 poly([[10,33],[18,32],[20,34],[12,36]],P.warm);
 poly([[-18,42],[-8,45],[-9,52],[-19,50],[-23,44]],P.shadow);
 poly([[12,41],[21,39],[20,49],[11,55],[7,49]],P.shadow);
 feature=true;
 // Brow ridge, bridge and anatomical eye sockets.
 poly([[-23,23],[-17,20],[-8,21],[-4,25],[-7,30],[-19,30],[-24,27]],P.half);
 poly([[4,24],[9,21],[19,20],[23,24],[22,29],[8,30]],P.deep);
 poly([[-23,23],[-17,21],[-7,22],[-5,24],[-8,25],[-20,25]],P.shadow);
 poly([[6,24],[10,22],[20,22],[23,25],[19,26],[8,26]],P.shadow);
 const blink=(t%4.4)<.12&&m.open>.2,open=blink?0:m.open,look=m.dart?Math.round(Math.sin(t*5.5)*2):Math.round(yaw*1.6),eyeY=27;
 function eye(x,far){
  const w=far?10:12,up=m.uneven&&far?-2:0,yy=eyeY+up,eh=open<.2?0:Math.max(1,Math.round(open*3)),dx=(m.cross||o.crossEyes)?(far?-2:2):look;
  if(eh===0){R(x+1,yy+1,w-2,1,P.deep);R(x+2,yy+2,w-4,1,P.half);}
  else{
   R(x+1,yy-1,w-2,eh+3,P.shadow);R(x,yy,w,1,P.deep);R(x+1,yy+1,w-2,eh,'#c6b89c');R(x+2,yy+1,w-4,Math.max(1,eh-1),'#e0d4b7');
   const iw=m.tiny?2:3,ix=x+Math.floor(w/2)-1+dx,ih=Math.min(eh,iw),iy=yy+1+Math.max(0,Math.floor((eh-ih)/2)-(m.up?1:0));R(ix,iy,iw,ih,'#6d7960');R(ix+1,iy,1,ih,'#282c24');if(!m.tiny)R(ix,iy,1,1,'#f5efcf');
   R(x,yy+1,1,Math.min(2,eh),P.red);R(x+w-1,yy+1,1,eh,P.deep);R(x+2,yy+eh+1,w-4,1,P.half);R(x+3,yy+eh+2,w-5,1,P.light);
  }
  if(m.tears){const tx=x+(far?w-2:1),ty=yy+Math.max(2,eh);R(tx,ty,2,2,'#d2e6e4');if(m.tears>1){const len=3+((t*.8+(far?.4:0))%1)*15;R(tx,ty+2,1,len,'#a3c4c6');R(tx,ty+len+1,2,2,'#d7ebdf');}}
 }
 eye(-22,false);eye(9,true);
 // Separate hair strokes in the brows; expressive shape without giant rectangular eyebrows.
 function brow(x,side){const w=side<0?17:16,bi=m.brow[0],bo=m.brow[1],raise=m.lift&&side>0?-2:0;for(let i=0;i<w;i++){const inner=side<0?i/(w-1):1-i/(w-1),y=21+raise+Math.round(bo+(bi-bo)*inner)-Math.round(Math.sin(i/(w-1)*Math.PI));R(x+i,y,1,2+(i%4===0?1:0),P.hairDark);if(i>3&&i<w-3)R(x+i,y,1,1,P.hairMid);}}
 brow(-24,-1);brow(6,1);R(-3,22,1,5,P.half);R(3,22,1,5,P.shadow);
 if(['determined','roar','pain'].includes(mood)){R(-5,21,1,4,P.shadow);R(4,21,1,4,P.shadow);}
 // Nose has a continuous light-facing ridge, a side plane, tip and nostrils.
 poly([[-3,26],[1,25],[3,36],[7,41],[5,44],[-5,44],[-7,41],[-3,37]],P.half);
 poly([[-3,27],[-1,27],[0,37],[-3,40],[-5,40]],P.light);
 poly([[1,27],[3,36],[7,41],[5,44],[2,42],[1,36]],P.shadow);
 poly([[-3,38],[1,37],[4,40],[2,42],[-3,42],[-5,41]],P.warm);R(-3,39,4,1,P.bright);
 R(-5,43,3,1,P.deep);R(3,43,3,1,P.deep);R(-1,43,3,2,P.skin);R(-1,46,2,2,P.shadow);
 feature=false;
 // Chin and lip anatomy remains visible for clean-shaven men as well as under beards.
 poly([[-13,49],[-6,46],[0,47],[6,46],[13,49],[12,57],[5,62],[-5,62],[-12,57]],P.skin);
 poly([[-9,55],[7,55],[9,59],[3,61],[-6,60]],P.half);R(-6,57,10,1,P.light);
 if(beard===2){
  poly([[-25,35],[-21,39],[-19,46],[-13,49],[-7,47],[-2,49],[5,48],[12,46],[18,44],[24,36],[23,50],[17,59],[7,65],[-6,65],[-17,60],[-24,52]],P.hairDark);
  poly([[-24,39],[-20,46],[-15,52],[-8,56],[-5,63],[-15,59],[-22,52]],P.hair);
  poly([[-17,51],[-8,55],[7,55],[15,51],[14,57],[6,62],[-5,62]],P.hair);poly([[-18,52],[-10,56],[-6,60],[-14,57]],P.hairMid);
 }else if(beard===3){poly([[-7,55],[8,55],[7,64],[2,67],[-5,64]],P.hairDark);poly([[-6,55],[-1,57],[0,64],[-4,63]],P.hair);}
 if(beard===1){for(let y=47;y<61;y+=2)for(let x=-18;x<=18;x+=3){if(Math.abs(x)<6&&y<56||Math.abs(x)>(62-y)*1.7)continue;R(x+(y%3),y,1,1,mix(P.half,P.hair,.48));}}
 feature=true;
 const my=51,mouth=m.mouth;
 if(beard===2||beard===3)poly([[-8,47],[-3,46],[0,48],[3,46],[8,47],[11,50],[4,50],[0,49],[-5,50],[-11,51]],P.hair);
 function lips(){poly([[-9,my],[-4,my-1],[0,my],[4,my-1],[9,my],[6,my+2],[-6,my+2]],P.deep);R(-6,my+1,12,1,mix(P.red,'#5b3230',.43));R(-4,my+2,9,1,P.red);R(-2,my+2,5,1,mix(P.red,P.light,.27));}
 // Sprechen (o.talk 0–1, aus der Sprechstimme): Mund öffnet sich je nach Laut, Oberzähne, dunkle Mundhöhle, Zunge
 const tk=cl(+o.talk||0);
 if(tk>.06){const wide=Math.round(6+tk*3),top=my-1,bot=top+Math.max(2,Math.round(1+tk*8));poly([[-wide+2,top],[wide-2,top],[wide,top+1],[wide-2,bot],[-wide+2,bot],[-wide,top+1]],'#32191a');if(bot-top>3){R(-wide+3,top,wide*2-6,1,'#ddd0ac');R(-wide+4,bot-1,wide*2-8,1,'#854943');}R(-wide+2,bot+1,wide*2-4,1,P.red);R(-wide+1,top-1,wide*2-2,1,P.deep);}
 else if(mouth==='line'||mouth==='firm'||mouth==='slack'){lips();if(o.g?.teeth?.gold?.length&&mouth!=='firm'){R(-2,my+1,2,1,'#e0b02a');R(-2,my+1,1,1,'#fff2a0');}if(mouth==='firm'){R(-9,my,18,1,P.deep);R(-10,my+1,2,1,P.shadow);}if(mouth==='slack')R(-4,my+1,8,2,P.deep);}
 else if(mouth==='smirk'){for(let x=-9;x<=9;x++){const y=my-Math.max(0,Math.round(x*.25));R(x,y,1,1,P.deep);if(x>-7&&x<7)R(x,y+1,1,1,P.red);}R(10,my-2,1,3,P.shadow);}
 else if(mouth==='wobble'){for(let x=-8;x<=8;x++){const y=my+Math.round(Math.sin(x*.5+t*7)*.65);R(x,y,1,1,P.deep);R(x,y+1,1,1,P.red);}}
 else{const roar=mouth==='roar',grin=mouth==='grin',teeth=mouth==='teeth',wide=roar?12:grin?12:teeth?10:6,top=roar?47:50,bot=roar?62:grin?57:teeth?56:60;
  poly([[-wide+3,top-1],[wide-3,top-1],[wide,top+2],[wide-2,bot-1],[wide-5,bot],[-wide+4,bot],[-wide+1,bot-2],[-wide,top+2]],'#32191a');
  R(-wide+3,top,wide*2-6,2,'#ddd0ac');if(grin||teeth||roar){for(let x=-wide+6;x<wide-3;x+=4)R(x,top,1,2,'#9e8c72');}{const TT=o.g?.teeth;if(TT&&(TT.missing?.length||TT.gold?.length)){const w=wide*2-6;for(let i=0;i<8;i++){const c=TT.missing?.includes(i)?'#1a0c0c':TT.gold?.includes(i)?'#e0b02a':null;if(!c)continue;const x0=-wide+3+Math.floor(i*w/8),x1=-wide+3+Math.floor((i+1)*w/8);R(x0,top,Math.max(1,x1-x0),2,c);if(c!=='#1a0c0c')R(x0,top,1,1,'#fff2a0');}}}
  if(teeth)R(-wide+2,bot-2,wide*2-4,1,'#d0bc99');else{R(-wide+4,bot-3,wide*2-8,2,'#854943');R(-wide+5,bot-3,wide*2-10,1,'#ac635a');}
  R(-wide+3,bot+1,wide*2-6,1,P.red);R(-wide-1,top+2,1,3,P.shadow);R(wide,top+2,1,3,P.deep);
 }
 if(beard===2){for(const [x,y,len]of [[-23,43,3],[-21,48,3],[-18,52,4],[-14,55,3],[-11,59,2],[-6,63,2],[0,63,2],[6,63,2],[12,57,3],[17,50,3],[20,45,3]])R(x,y,1,len,x<0?P.hairMid:P.hair);}
 if(beard===3){R(-4,60,1,3,P.hairMid);R(3,61,1,3,P.hair);}
 feature=false;
 // Six real game hairstyles, each built on the same anatomical head.
 if(st===0){poly([[-27,13],[-24,17],[-23,27],[-26,30]],P.hair);poly([[24,13],[27,17],[26,29],[23,26]],P.hairDark);poly([[-17,5],[-7,1],[8,1],[15,5],[12,8],[-10,8]],P.light);}
 else if(st===2){
 // Sculpted hairline and swept locks, with a few warm highlights.
 poly([[-28,21],[-29,10],[-25,1],[-16,-6],[-4,-9],[10,-8],[23,-2],[29,8],[27,25],[23,23],[21,14],[15,9],[9,11],[2,7],[-7,11],[-11,8],[-19,14],[-23,24]],P.hairDark);
 poly([[-27,9],[-22,1],[-12,-4],[2,-6],[13,-4],[19,0],[13,5],[4,4],[-4,8],[-9,6],[-18,11],[-22,18],[-25,20]],P.hair);
 poly([[-20,3],[-11,-2],[1,-4],[9,-3],[6,0],[-4,0],[-10,4],[-18,8]],P.hairMid);
 poly([[-11,1],[-3,-1],[5,-1],[1,2],[-7,4]],P.hairLight);
 poly([[9,0],[18,1],[23,6],[24,16],[20,11],[15,8],[7,7],[4,5]],P.hair);
 poly([[12,1],[19,4],[20,7],[13,5],[8,6]],P.hairMid);
 R(-23,12,2,4,P.hairMid);R(-21,9,2,3,P.hairLight);R(-9,6,4,1,P.hairMid);R(5,6,3,1,P.hairMid);

 }else if(st===1){poly([[-28,22],[-28,9],[-22,0],[-9,-5],[9,-5],[23,1],[28,10],[27,25],[23,22],[22,12],[16,8],[5,7],[-7,8],[-19,12],[-24,23]],P.hairDark);poly([[-24,9],[-18,2],[-6,-2],[9,-2],[18,3],[20,7],[8,5],[-5,6],[-19,11]],P.hair);for(let i=0;i<9;i++)R(-19+i*4,3+(i%3),2,1,P.hairMid);}
 else if(st===3||st===4){poly([[-29,24],[-29,10],[-23,0],[-10,-6],[9,-6],[23,1],[29,11],[27,29],[22,20],[19,9],[9,6],[1,4],[-8,6],[-19,12],[-23,29]],P.hairDark);poly([[-25,12],[-19,3],[-8,-2],[0,1],[-9,6],[-18,15],[-22,29],[-25,38]],P.hair);poly([[2,0],[12,-2],[22,5],[25,15],[22,25],[18,10],[10,5]],P.hair);for(const [x,y]of [[-21,10],[-18,7],[-13,4],[14,5],[20,12]])R(x,y,1,9,P.hairMid);if(st===4){poly([[-7,-5],[-9,-11],[-4,-16],[6,-15],[10,-9],[7,-4]],P.hairDark);R(-5,-12,9,4,P.hair);R(-3,-13,5,1,P.hairMid);}}
 else if(st===5){poly([[-6,10],[-8,0],[-6,-14],[0,-18],[7,-14],[8,-2],[5,11]],P.hairDark);poly([[-4,5],[-4,-12],[0,-15],[4,-12],[3,6]],P.hair);R(-3,-11,2,12,P.hairMid);R(-2,8,7,2,P.hair);}
 // Small skin highlights, a lower eyelid crease and subtle age lines.
 R(-19,16,8,1,P.warm);R(-12,14,14,1,P.light);R(4,16,8,1,P.half);
 R(-24,30,2,1,P.shadow);R(22,30,2,1,P.deep);R(-19,38,3,1,P.light);
 feature=true;
 if(o.scar){for(let i=0;i<13;i++)R(-19+i*.55,32+i,1,1,mix(P.skin,'#edc4ad',.50));}
 if(o.box){/* Boxschäden (Faustkampf): Veilchen, geschwollene Wange/Lippe/Nase, Platzwunde. o.box = {eyeL,eyeR,cheek,nose,lip,cut,blood} jeweils 0–1,5 */const B=o.box,k=v=>Math.min(1,v||0);
  for(const [x0,v] of [[-22,B.eyeL],[9,B.eyeR]]){if(v>.12){const w=12,a=Math.min(.85,v*.7);q.globalAlpha=a*.7;R(x0-3,eyeY-3,w+6,12,'#5b2b5e');q.globalAlpha=a;R(x0-1,eyeY-2,w+2,9,v>.8?'#3a1d4a':'#6b3563');q.globalAlpha=a*.6;R(x0,eyeY+8,w,3,'#8a4a4a');q.globalAlpha=1;
   if(v>.7){R(x0,eyeY-1,w,1+Math.round(k(v)*3),P.skin);R(x0+1,eyeY-1,w-2,1,P.shadow);}}}
  if(B.cheek>.1){const a=Math.min(.7,B.cheek*.6);q.globalAlpha=a;R(-23,36,15,9,'#6e3a60');R(10,36,14,9,'#6e3a60');q.globalAlpha=a*.5;R(-26,40,6,6,'#8e4a52');q.globalAlpha=1;}
  if(B.nose>.15){const a=Math.min(.8,B.nose*.55);q.globalAlpha=a;poly([[-4,30],[2,30],[5,41],[7,44],[-6,44],[-7,41]],'#9c4048');q.globalAlpha=1;if(B.nose>.9){R(-2,44,2,3+Math.round(k(B.blood)*10),'#8a2a2a');R(4,44,2,2+Math.round(k(B.blood)*8),'#8a2a2a');}}
  if(B.lip>.2){const a=Math.min(.9,B.lip*.7);q.globalAlpha=a;R(-8,50,17,5,'#a64a4a');R(-7,55,15,2,'#8a3636');q.globalAlpha=1;R(-3,50,4,1,'#d98a82');if(B.lip>.7)R(5,55,1,3+Math.round(k(B.blood)*6),'#8a2020');}
  if(B.cut>.1){R(8,17,10,2,'#6b1c1c');R(9,18,8,1,'#b02a2a');const len=3+Math.round(k(B.cut)*16);R(11,19,1,len,'#9a2020');R(15,19,1,Math.max(2,len-5),'#8a1c1c');if(B.cut>.6)R(10,19+len,3,2,'#b02a2a');}}
 if(o.hurt>0){const n=Math.round(o.hurt*24);R(-17,14,7,1,'#682c2c');R(-14,15,1,n,'#9d443b');if(o.hurt>.4){q.globalAlpha=.35;R(9,26,13,8,'#663d57');q.globalAlpha=1;}}
 for(let i=0;i<(m.sweat||0);i++){const y=16+((t*.65+i*.5)%1)*23;R(i?-24:23,y,1,3,'#c3d9d4');R(i?-24:23,y,1,1,'#edf2df');}

 if(o.blood>0)R(8,53,1,Math.round(o.blood*8),'#943a33');
 // Schaum vor dem Mund (Rabies immer, sonst o.foam): Blasen an beiden Mundwinkeln, Fäden laufen ins Kinn, Tropfen fallen
 {const fo=o.foam??(o.g?.foam?1:0);if(fo>0){const W1='#f7f5ee',W2='#dcd8cc';for(const s of [-1,1]){const cx=s*11;R(cx-2,my-1,4,2,W1);R(cx-1,my-2,2,1,W1);R(cx+s,my+1,2,1,W2);R(s*8,my+1,3,1,W1);
   const len=3+Math.round(2.5*(.5+.5*Math.sin(t*2.2+s)));R(cx,my+1,1,len,W1);R(cx+s,my+1,1,Math.max(1,len-2),W2);const q=(t*.55+(s>0?0:.5))%1;if(q<.8)R(cx,my+2+len+Math.round(q*q*16),1,2,W1);}
  for(let i=0;i<5;i++)R(-5+i*2+Math.round(Math.sin(t*3+i)),my+2,1,1,W1);}}


 feature=false;
 const helm=o.armor?.helm;
 if(helm){
  const p=M.itemLook(helm),quality=cl(Math.round(helm.q||0),0,6),soft=helm.material==='leather',hybrid=helm.material==='medium';
  const base=hybrid?p.leather:p.metal,edge=p.edge,trim=quality>=4?p.trim:mix(base,'#d8c5a0',.32);
  const ink=mix(base,'#10161b',.78),deep=mix(base,'#151d24',.56),shadow=mix(base,'#202933',.32),light=mix(base,soft?'#d8af77':'#d8e5e5',.32),shine=mix(base,'#fff3d4',.58);
  const plate=hybrid?p.metal:base,plight=mix(plate,'#e1e6d5',.4),pdark=mix(plate,'#18232a',.55);
  // Solid, fitted silhouette covers hairstyles; polygons follow the portrait's proportions.
  poly([[-34,22],[-34,3],[-29,-10],[-19,-18],[-7,-21],[10,-20],[23,-14],[31,-4],[34,10],[33,23]],ink);
  poly([[-32,17],[-32,3],[-27,-8],[-17,-16],[-5,-18],[10,-17],[21,-11],[29,-2],[31,16]],base);
  poly([[-31,13],[-29,0],[-23,-9],[-13,-15],[-4,-16],[-8,-9],[-14,-1],[-17,14]],light);
  poly([[-28,3],[-23,-7],[-14,-13],[-8,-14],[-14,-7],[-19,2]],shine);
  poly([[8,-17],[20,-11],[28,-1],[31,15],[20,15],[18,1],[13,-8]],shadow);
  poly([[23,-6],[29,2],[31,16],[27,16],[25,3]],deep);
  // Center reinforcing rib, with a light edge and shadow beneath it.
  if(!soft||quality>=2){poly([[-4,-19],[1,-19],[6,16],[-1,17]],ink);poly([[-3,-18],[0,-18],[4,15],[0,15]],hybrid?p.metal:trim);R(-2,-15,1,9,shine);R(0,-4,1,16,light);}
  if(soft){
   for(const side of [-1,1])for(let i=0;i<8;i++){const x=side*(12+i*.9),y=-10+i*3;R(x,y,2,1,deep);R(x,y-1,1,1,light);}
   for(let i=0;i<24;i++){const x=(i*17%55)-27,y=(i*11%25)-9;if(Math.abs(x)<22||y>1)R(x,y,1,1,i%3?shadow:light);}
   if(quality===0){poly([[-22,-4],[-10,-8],[-7,4],[-19,8]],deep);poly([[-21,-3],[-11,-6],[-9,3],[-18,6]],mix(base,'#c59a68',.18));for(let i=0;i<4;i++)R(-20+i*3,-2-i,1,2,shine);}
  }else{
   // Fixed surface marks never shimmer from frame to frame.
   for(const [x,y,l]of [[-23,5,4],[-16,-7,3],[12,4,5],[18,10,3]]){R(x,y,l,1,shadow);R(x,y+1,l-1,1,light);}
  }
  // Brow follows the skull instead of forming a rectangular band.
  poly([[-35,14],[-21,12],[-8,14],[0,16],[9,14],[23,12],[35,15],[34,22],[20,19],[9,20],[0,22],[-11,20],[-24,19],[-34,22]],ink);
  poly([[-33,15],[-22,14],[-9,16],[0,18],[10,16],[23,14],[33,16],[32,19],[21,17],[10,18],[0,20],[-10,18],[-23,17],[-32,19]],soft?deep:trim);
  for(const [x,y]of [[-30,15],[-23,14],[-16,15],[13,15],[22,14],[29,15]])R(x,y,3,1,soft?light:shine);
  function rivet(x,y){R(x-1,y-1,3,3,ink);R(x-1,y-1,2,2,trim);R(x-1,y-1,1,1,shine);}
  for(const x of [-28,-16,16,28])rivet(x,17);
  if(quality>=1){for(const side of [-1,1]){
   const f=1-cl(side*yaw*.32,0,.25),pts=a=>a.map(([x,y])=>[side*(24+(x-24)*f),y]);
   poly(pts([[25,20],[34,20],[34,39],[29,54],[23,57],[19,51],[21,38]]),ink);
   poly(pts([[26,22],[32,22],[32,38],[28,51],[24,54],[21,50],[23,38]]),soft?base:plate);
   poly(pts([[26,23],[28,24],[27,38],[23,49],[24,52],[21,49],[23,36]]),side<0?(soft?light:plight):(soft?shadow:pdark));
   poly(pts([[31,24],[32,26],[31,39],[27,51],[25,52],[28,40]]),deep);
   rivet(side*28,24);R(side*27-1,43,3,1,ink);R(side*26-1,46,3,1,ink);
   if(quality>=4){poly(pts([[23,40],[25,41],[23,48],[25,51],[28,46],[28,49],[24,54],[21,50]]),trim);}
  }}
  if(quality>=2&&!soft){const nx=yaw*5;poly([[nx-3,19],[nx+3,19],[nx+3,33],[nx,38],[nx-3,33]],ink);poly([[nx-2,20],[nx+1,20],[nx+1,34],[nx,36],[nx-2,32]],trim);R(nx-2,21,1,11,shine);}
  if(hybrid){for(const side of [-1,1]){poly([[side*17,-14],[side*22,-10],[side*29,3],[side*30,12],[side*25,12],[side*24,1]],plate);R(side*25,3,1,7,plight);rivet(side*25,10);}}
  // Quality is expressed through construction and ornament, not only color.
  if(quality>=3){
   const crest=soft?mix(p.cloth,base,.35):p.cloth,cd=mix(crest,'#170f19',.57),ch=mix(crest,'#ffcf98',.32);
   poly([[-9,-17],[-10,-27],[-7,-32],[0,-35],[7,-32],[11,-26],[10,-17]],ink);
   poly([[-7,-18],[-8,-26],[-5,-30],[0,-32],[6,-29],[8,-24],[8,-18]],cd);
   for(let i=-6;i<=6;i+=2){const y=-31+Math.abs(i)*.7;R(i,y,1,12-Math.abs(i)*.5,i<1?ch:crest);}
   R(-9,-18,19,3,deep);R(-8,-18,17,1,trim);rivet(-5,-16);rivet(5,-16);
  }
  if(quality>=5){for(const side of [-1,1])for(let i=0;i<4;i++){const x=side*(12+i*4),y=9-i*3;poly([[x,y],[x-side*3,y-4],[x-side*4,y-3],[x-side*2,y+1]],trim);R(x-side*2,y-2,1,1,shine);}}
  if(quality===6){poly([[-5,12],[0,8],[5,12],[4,18],[0,21],[-4,18]],ink);poly([[-4,12],[0,9],[4,12],[3,17],[0,19],[-3,17]],trim);poly([[-2,12],[1,11],[3,14],[0,17],[-2,15]],p.gem||'#b44039');R(-1,12,1,2,'#ffe4ba');}
 }

}
const bufs=new WeakMap();
// o: {g, team, mood, yaw?, sink?, tilt?, dark?, pale?, blood?, zoom?}; t: Sekunden seit Beginn der Einstellung
// Wer wo gemalt wurde (für Sprechstimmen: stehende Großaufnahmen beim Sprechen neu malen)
const recs=new Map();
const paintClock=new WeakMap();
function paint(g,w,h,o,t){if(g?.canvas&&o?.g&&!o._sprech){recs.set(g.canvas,{ctx:g,w,h,o,t,time:(typeof performance!=='undefined'?performance.now():Date.now()),repaint:talk=>paint(g,w,h,{...o,talk,_sprech:true},t)});if(recs.size>40)recs.delete(recs.keys().next().value);}
 /* Leistung (26.10.): Großaufnahmen wurden in jedem Bild (60/s) komplett neu gemalt und kosteten im langen Kampf rund ein Drittel der Rechenzeit.
    Mit o.throttle (ms) wird dieselbe Figur auf derselben Leinwand höchstens so oft neu gemalt; die Leinwand behält das letzte Bild. Nur für Aufrufer,
    die die Leinwand nicht selbst vorher leeren. Wechselt die Figur oder die Größe, wird sofort gemalt; Mundbewegung beim Sprechen (_sprech) immer. */
 if(o?.throttle&&g?.canvas&&!o._sprech&&typeof performance!=='undefined'){const now=performance.now(),id=o?.g?.id??o?.g?.name??'',L=paintClock.get(g.canvas);if(L&&L.id===id&&L.w===w&&L.h===h&&now-L.t<o.throttle)return;paintClock.set(g.canvas,{t:now,id,w,h});}let B=bufs.get(g.canvas);if(!B){B={a:document.createElement('canvas'),b:document.createElement('canvas'),c:document.createElement('canvas'),d:document.createElement('canvas')};B.a.width=B.b.width=B.c.width=B.d.width=FW;B.a.height=B.b.height=B.c.height=B.d.height=FH+40;bufs.set(g.canvas,B);}
 const colors=x=>{const A=x?.appearance||{},skin=hex(A.skin)||'#c19169',shade=hex(A.shade)||'#875e43';return {identity:x?.id,faceSeed:A.faceSeed,skin,shade,light:mix(skin,'#fff2dc',.22),hair:hex(A.hair)||'#443025',style:(A.style??1)%6,beard:(A.beard??0)%4};},gearOf=x=>{const r={};try{for(const it of M.armorItems(x)||[])r[it.def]=it;}catch{}return r;},C=colors(o.g),armor=gearOf(o.g);
 const opt={talk:o.talk??(M.talkMouth?.(o.g)||0),...o,armor,scar:o.scar??((o.g?.scars||[]).length>0||(o.g?.kills||0)>=5)},mood=o.mood||'calm',m=MOODS[mood]||MOODS.calm;
 // Kamerafahrt um den Kopf: langsamer Schwenk von einer Seite zur anderen
 const yaw=o.yaw??Math.sin(t*.55+(o.team===1?Math.PI:0))*.75;
 const bq=B.a.getContext('2d');bq.imageSmoothingEnabled=false;bq.setTransform(1,0,0,1,0,0);bq.clearRect(0,0,FW,FH+40);const BT=tools(bq);
 if(o.ground)sand(bq,BT,opt,t);else if(!o.clear)backdrop(bq,BT,opt,yaw,t);
 // Figur auf eigener Fläche, damit sie am Boden als Ganzes liegen kann
 const q=B.c.getContext('2d');q.imageSmoothingEnabled=false;q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,FW,FH+40);const T=tools(q);torso(q,T,C,opt,yaw);
 const hq=B.b.getContext('2d');hq.imageSmoothingEnabled=false;hq.setTransform(1,0,0,1,0,0);hq.clearRect(0,0,FW,FH+40);if(armor.helm){hq.translate(80,43);hq.scale(.78,.78);hq.translate(-80,0);}else hq.translate(0,20);head(hq,tools(hq),C,opt,yaw,t,mood);hq.setTransform(1,0,0,1,0,0);
 const bob=Math.round(Math.sin(t*1.6)*.6)+(m.tremble?Math.round(Math.sin(t*38)*.8):0);q.save();q.translate(80,70+(o.sink||0)+bob);q.rotate(o.tilt||0);q.drawImage(B.b,-80,-90);q.restore();
 if(o.fist||o.trophy){const pump=Math.round(Math.sin(t*7)*3),arm=(x0,x1,y1)=>{for(let y=y1;y<FH;y++){const u=(y-y1)/(FH-y1),x=x1+(x0-x1)*u;T.r(x-7,y,14,1,C.skin);T.r(x-7,y,3,1,C.light);T.r(x+4,y,3,1,C.shade);}};
  arm(24,20,24+pump);T.r(11,10+pump,19,16,C.skin);T.r(11,10+pump,19,3,C.light);T.r(26,10+pump,4,16,C.shade);for(let i=0;i<4;i++)T.r(12+i*4.5,13+pump,1,10,C.shade);
  const ty=o.trophy?-pump:pump;arm(138,142,(o.trophy?20:24)+ty);
  if(o.trophy){/* der Kopf des Besiegten, an den Haaren hochgehalten */const dq=B.d.getContext('2d');dq.imageSmoothingEnabled=false;dq.setTransform(1,0,0,1,0,0);dq.clearRect(0,0,FW,FH+40);dq.translate(0,20);head(dq,tools(dq),colors(o.trophy),{armor:{},pale:.7,hurt:.8,scar:false},-.2,t,'out');dq.setTransform(1,0,0,1,0,0);
   const sw=74,sh=80,dw=46,dh=50,dx=119+Math.round(Math.sin(t*2.2)*2),dy=22+ty;q.save();q.translate(dx+dw/2,dy);q.rotate(Math.sin(t*2.2)*.12);q.drawImage(B.d,43,14,sw,sh,-dw/2,0,dw,dh);q.restore();T.r(dx+14,dy+dh-2,18,3,'#6b2420');for(let i=0;i<4;i++){const k=((t*1.1+i*.27)%1);T.r(dx+16+i*4,dy+dh+1,i%2?1:2,3+Math.round(k*16),'#a8372f');}
   T.r(dx+13,dy-4,20,12,C.skin);T.r(dx+13,dy-4,20,3,C.light);T.r(dx+29,dy-4,4,12,C.shade);for(let i=0;i<4;i++)T.r(dx+15+i*4.5,dy-2,1,8,C.shade);}
  else{T.r(132,8+ty,19,16,C.skin);T.r(132,8+ty,19,3,C.light);T.r(147,8+ty,4,16,C.shade);for(let i=0;i<4;i++)T.r(133+i*4.5,11+ty,1,10,C.shade);}}
 const X=o.fx||{};
 if(X.stump>0){/* Halsstumpf mit pulsierendem Blut */T.r(66,84,28,4,'#6b2420');T.r(69,83,22,3,'#a8372f');T.r(78,83,4,2,'#efe6d0');for(let i=0;i<26;i++){const u=((X.stump*1.3+i/26)%1),a=-1.57+(((i*29)%26)/26-.5)*1.1,d=u*56*(.7+.3*Math.sin(X.stump*8));T.r(80+Math.cos(a)*d,84+Math.sin(a)*d+u*u*40,i%3?1:2,i%3?1:2,i%2?'#a8372f':'#c9584a');}}
 if(X.gash>0){/* quer durch den Rumpf */const p=cl(X.gash/.2),wd=Math.round(150*p);T.r(80-wd/2,96,wd,3,'#3d0f0d');T.r(80-wd/2,95,wd,1,'#c9584a');for(let i=0;i<24;i++){const x=80-wd/2+i*wd/24,l=cl((X.gash-.15-(i%5)*.06)*14,0,FH);T.r(x,99,i%2?1:2,l,'#a8372f');}}
 if(X.stab>0){/* Spitze von oben ins Herz */const p=cl(X.stab/.22),tx=86,ty=97,ang=-1.05,len=120,d=(1-p)*70;for(let i=0;i<len;i++){const w=i<10?1+i*.4:i<70?5:4;T.r(tx+Math.cos(ang)*(i+d)-w/2,ty+Math.sin(ang)*(i+d)-w/2,w,w,i<70?(i%6?'#c2cbc0':'#f4f6ea'):'#6e5230');}if(p>=1){const g=cl((X.stab-.22)/1.2);T.r(tx-4-g*10,ty-1,8+g*20,3+g*6,'#a8372f');for(let i=0;i<6;i++)T.r(tx-8+i*4,ty+3,i%2?1:2,g*(8+i*2),'#a8372f');}}
 if(X.blade>0&&X.blade<1){/* heller Hieb quer durchs Bild */q.globalAlpha=1-Math.abs(X.blade-.5)*1.4;const bx=-40+X.blade*240;for(let i=0;i<70;i++)T.r(bx-i*1.6,(X.bladeY||84)-8+i*.22,3,2,i<10?'#ffffff':'#e8ecdc');q.globalAlpha=1;}
 if(o.wave){/* winkende Hand */const hx=128+Math.round(Math.sin(t*9)*5),hy=40+Math.round(Math.cos(t*9)*2);T.r(hx+3,hy+14,8,40,C.shade);T.r(hx+3,hy+14,5,40,C.skin);T.r(hx,hy,14,15,C.skin);T.r(hx+11,hy,3,15,C.shade);for(let i=0;i<4;i++){T.r(hx+i*3.5,hy-9+(i%3===0?2:0),3,10,C.skin);T.r(hx+i*3.5+2,hy-9+(i%3===0?2:0),1,10,C.shade);}T.r(hx-4,hy+5,5,4,C.skin);}
 bq.save();if(o.ground){/* Schatten, dann die liegende Figur von schräg oben */bq.globalAlpha=.3;bq.fillStyle='#2a1a0c';bq.beginPath();bq.ellipse(84,62,58,40,-.5,0,Math.PI*2);bq.fill();bq.globalAlpha=1;bq.translate(80,56);bq.rotate(o.lie??-.62);bq.scale(.86,.86);bq.translate(-80,-50);}bq.drawImage(B.c,0,0);bq.restore();
 if(o.dark>0){bq.globalAlpha=cl(o.dark);bq.fillStyle='#050302';bq.fillRect(0,0,FW,FH+40);bq.globalAlpha=1;}
 // Ausgabe: füllt die Fläche, langsamer Zug ins Bild
 const z=(o.zoom||1)*1.12*(1+.07*ease(t/5)),s=Math.max(w/FW,h/FH)*z,dw=Math.round(FW*s),dh=Math.round(FH*s);g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;/* clear: ohne Hintergrund, z. B. zum Freistellen */if(o.clear)g.clearRect(0,0,w,h);else{g.fillStyle='#120c09';g.fillRect(0,0,w,h);}
 if(o.cheer){/* Blütenblätter und Tücher aus den Rängen */for(let i=0;i<34;i++){const n=Math.sin(i*91.7)*43758.5,v=n-Math.floor(n),k=((t*(.18+v*.22)+v*7)%1),x=(v*1.9*FW+Math.sin(t*1.3+i)*9)%FW,y=k*(FH+10)-6;BT.r(x,y,2+(i%3===0?1:0),2,['#d6453a','#f0c94a','#f4ead0','#c8372f'][i%4]);}}
 const sh=o.shake||0,ox=sh?Math.round((Math.random()-.5)*sh*s):0,oy=sh?Math.round((Math.random()-.5)*sh*s*.7):0;g.drawImage(B.a,0,0,FW,FH,Math.round(w/2-dw/2)+ox,Math.round(Math.min(0,(h-dh)*.42))+oy,dw,dh);
 // Kennzeichen einzelner Figuren (Hut, Pfeil im Kopf …): M.faceOverlays[g.id](ctx,{s,to},t,o) in Gesichtskoordinaten (0,0 = Kopfmitte unten)
 {const ov=o.g&&M.faceOverlays?.[o.g.id];if(ov){const X0=Math.round(w/2-dw/2)+ox,Y0=Math.round(Math.min(0,(h-dh)*.42))+oy,ya=Math.round(yaw*4),by=(o.sink||0);try{ov(g,{s,to:(rx,ry)=>({x:X0+(80+rx+ya)*s,y:Y0+(70+ry+by)*s})},t,o);}catch(e){}}}
 if(o.lines>0){/* Schrei: Linien vom Rand zur Mitte */g.save();g.globalAlpha=cl(o.lines)*.75;g.strokeStyle='#fff6dc';g.lineWidth=Math.max(2,w/160);for(let i=0;i<18;i++){const a=i/18*Math.PI*2+Math.floor(t*14)*.37,r0=Math.max(w,h)*.74,r1=Math.max(w,h)*(.4+((i*7)%5)*.035);g.beginPath();g.moveTo(w/2+Math.cos(a)*r0,h*.45+Math.sin(a)*r0);g.lineTo(w/2+Math.cos(a)*r1,h*.45+Math.sin(a)*r1);g.stroke();}g.restore();}
 if(o.clear)return;const vg=g.createRadialGradient(w/2,h*.45,Math.min(w,h)*.35,w/2,h*.5,Math.max(w,h)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.62)');g.fillStyle=vg;g.fillRect(0,0,w,h);}
M.faceShot={records:()=>recs,paint,moods:Object.keys(MOODS),FW,FH,version:'helmet-lab-v4'};
M.faceShot.paintHead=(q,actor,o={},t=0)=>{const A=actor?.appearance||{},skin=hex(A.skin)||'#c19169',shade=hex(A.shade)||'#875e43';const C={identity:actor?.id,faceSeed:A.faceSeed,skin,shade,light:mix(skin,'#fff2dc',.22),hair:hex(A.hair)||'#443025',style:(A.style??1)%6,beard:(A.beard??0)%4};head(q,tools(q),C,{...o,g:actor,armor:o.armor||{}},o.yaw||0,t,o.mood||'calm');};
})();

// Hühnerhändlerin: besondere Großaufnahme im Stil des gemeinsamen Kopf-Renderers.
(()=>{'use strict';const M=window.MG,buffers=new WeakMap(),mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
function setup(g){let b=buffers.get(g.canvas);if(!b){b={canvas:mk(240,156)};buffers.set(g.canvas,b)}const q=b.canvas.getContext('2d');q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,240,156);q.imageSmoothingEnabled=false;const R=(x,y,w,h,c)=>{q.fillStyle=c;q.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)))};const line=(x,y,xx,yy,c,width=1)=>{const n=Math.ceil(Math.max(Math.abs(xx-x),Math.abs(yy-y)));for(let i=0;i<=n;i++)R(x+(xx-x)*i/(n||1),y+(yy-y)*i/(n||1),width,width,c)};return {...b,q,R,line};}
function finish(g,w,h,b,t,shake=0){g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;g.fillStyle='#171512';g.fillRect(0,0,w,h);const s=Math.min(w/240,h/156),dx=(w-240*s)/2,dy=(h-156*s)/2;g.drawImage(b.canvas,Math.round(dx+Math.sin(t*47)*shake*s),Math.round(dy+Math.cos(t*39)*shake*.5*s),240*s,156*s);}
function room(b,kind,t){const {q,R}=b;R(0,0,240,156,'#504535');for(let y=0;y<156;y+=16)for(let x=(y%32?-15:0);x<240;x+=32){R(x+1,y+1,30,14,'#635a45');R(x+1,y+1,30,1,'#746c54');}const v=q.createRadialGradient(120,72,30,120,72,150);v.addColorStop(0,'#00000000');v.addColorStop(1,'#00000088');q.fillStyle=v;q.fillRect(0,0,240,156);}
function body(b,actor,kind){const {R}=b;for(let y=109;y<156;y++){const hw=Math.min(93,26+(y-109)*2.5);R(120-hw,y,hw*2,1,'#587446');R(120+hw*.45,y,hw*.55,1,'#354b31');}}
function raw(b,actor,o,t,x=40,y=22,scale=1){b.q.save();b.q.translate(x,y);b.q.scale(scale,scale);M.faceShot.paintHead(b.q,actor,o,t);b.q.restore();}
function seller(g,w,h,actor,t,o={}){const recs=M.faceShot?.records?.();if(recs&&g?.canvas&&actor&&!o._sprech)recs.set(g.canvas,{ctx:g,w,h,o:{...o,g:actor},t,time:(typeof performance!=='undefined'?performance.now():Date.now()),repaint:talk=>seller(g,w,h,actor,t,{...o,talk,_sprech:true})});const b=setup(g),{q,R,line}=b;room(b,'seller',t);body(b,actor,'seller');const hair='#c9562a',dark='#74301e',hi='#ed9550';
 // Sculpted, individually shaded copper curls; same fixed silhouette from frame to frame.
 for(let i=0;i<38;i++){const a=i/38*Math.PI*2,x=120+Math.cos(a)*(39+(i%3)*2),y=78+Math.sin(a)*(43+(i%4));const n=6+i%4;R(x-n,y-n,n*2,n*2,dark);R(x-n+1,y-n+1,n*2-3,n*2-3,hair);R(x-n+2,y-n+1,n,2,hi);R(x-2,y-2,n,2,dark);R(x-2,y-2,2,n,dark);}
 raw(b,actor,{mood:o.mood||'grin',armor:{},crossEyes:true,yaw:0,talk:o.talk??(M.talkMouth?.(actor)||0)},t,40,43);
 // Frame the face with separate locks, earrings and fine feather shafts.
 for(const side of [-1,1]){for(let i=0;i<5;i++){const x=120+side*(28+i*.9),y=68+i*9;R(x-2,y,5,11,dark);R(x-2,y,2,8,hi);}const x=120+side*32;R(x-4,105,8,12,'#623e23');R(x-3,105,6,2,'#edc465');R(x-3,115,6,2,'#bc8b39');R(x-4,107,2,8,'#dba84b');R(x+2,107,2,8,'#aa7831');}
 for(const side of [-1,1])for(let i=0;i<3;i++){const x=120+side*(25+i*4),y=49-i*5;line(x,y,x+side*13,y-20,'#c9b585');for(let j=0;j<9;j++){line(x+side*j,y-j*1.5,x+side*(j+5),y-j*1.5-4,i%2?'#e5d6ba':'#c78641');}}
 // Small brooding hen: shaded breast, layered wing, comb and amber beak.
 const hy=25+Math.round(Math.sin(t*2)*.5);for(let y=0;y<16;y++){const hw=14*Math.sqrt(Math.max(0,1-Math.pow((y-8)/9,2)));R(120-hw,hy+y,hw*2,1,y<5?'#f5e9cd':y>12?'#a59678':'#d8c9a6');}R(108,hy+5,13,2,'#f5ecd8');for(let i=0;i<5;i++)line(113+i*2,hy+7,117+i*2,hy+13,'#b7aa8d');R(128,hy-5,9,11,'#e8dbbb');R(128,hy-5,3,7,'#faf0d5');R(136,hy-1,6,3,'#db9a38');R(133,hy-2,2,2,'#28221c');R(133,hy-2,1,1,'#fff4d5');R(130,hy-8,6,3,'#ac3d32');R(131,hy-10,2,3,'#d1503f');R(135,hy+3,2,4,'#a53c31');for(let i=0;i<4;i++)line(108,hy+7,101-i,hy-2+i*3,i%2?'#c4b593':'#ede1c4');
 for(let i=0;i<28;i++){const x=56+i*4.8,y=139+Math.sin(i*.6)*5+Math.sin(t*3+i)*.5,c=['#e4d5b6','#bb663a','#8f4633','#dfad55'][i%4];line(x,y+8,x+2,y-7,'#4e392a',2);for(let j=0;j<7;j++){line(x,y+j-5,x-3,y+j-8,c);line(x+1,y+j-5,x+5,y+j-8,c);}}
 finish(g,w,h,b,t,o.shake?Math.sin(t*5)*.4:0);}
M.sceneHeads={...(M.sceneHeads||{}),seller,version:'seller-head-v1'};
})();


