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
 while((m=re.exec(s))){if(m[1]){const ph=word2ph(m[1]);if(ph.length){res.push(...ph.map(o=>({...o})));res.push({p:'_',gap:18});}}
  else if(m[2]){res.push({p:'_',gap:m[2].includes('?')?260:m[2].includes('!')?240:220,end:m[2].includes('?')?'?':m[2].includes('!')?'!':'.'});}
  else if(m[3])res.push({p:'_',gap:140,end:','});}
 return res;}

// ---------- Stimmen ----------
// pitch Grundton (Hz), speed Tempo, inton Sprachmelodie, sing zufälliges Auf und Ab je Silbe (16-Bit-Singsang),
// size Körpergröße (größer = tiefere Formanten), rough Rauheit, breath Hauch, shake Zittern (alt), rate Abtastung (Hz),
// bits Bittiefe, echo Echo-Anteil, vol Lautstärke
const PRESETS={
 moderator:{name:'Arena-Moderator',pitch:128,speed:1.75,inton:.45,sing:0.06,size:1,rough:.12,breath:.1,shake:0,rate:14332,bits:12,echo:.28,vol:.9,look:{skin:'#c99266',hair:'#2d2118',beard:false,band:'#9b2b25'}},
 rabies:{name:'Rabies, der Hundsgraf',pitch:112,speed:1.65,inton:.6,sing:0.11,size:1.04,rough:.4,breath:.3,shake:0,rate:13000,bits:11,echo:.15,vol:.9,look:{skin:'#b98a6a',hair:'#d9d2c0',beard:true,beardCol:'#cfc6b2',skull:true}},
 schmied:{name:'Der Schmied',pitch:92,speed:1.55,inton:.35,sing:0.05,size:1.14,rough:.3,breath:.15,shake:0,rate:12350,bits:11,echo:.12,vol:.95,look:{skin:'#a8714c',hair:'#1c1410',beard:true,beardCol:'#1c1410'}},
 orontes:{name:'Orontes Pfeilkopf',pitch:150,speed:1.6,inton:.5,sing:0.09,size:.97,rough:.25,breath:.35,shake:.45,rate:13650,bits:11,echo:.15,vol:.85,look:{skin:'#c08a5c',hair:'#e6e1d5',beard:true,beardCol:'#e6e1d5'}},
 krassus:{name:'Krassus Knochenzins',pitch:80,speed:1.4,inton:.3,sing:0.04,size:1.2,rough:.35,breath:.12,shake:0,rate:11700,bits:11,echo:.32,vol:1,look:{skin:'#c79a78',hair:'#111',beard:false,gold:true}},
 medicus:{name:'Der Medicus',pitch:122,speed:1.85,inton:.4,sing:0.05,size:.96,rough:.08,breath:.18,shake:0,rate:14332,bits:12,echo:.1,vol:.85,look:{skin:'#e0b48e',hair:'#6b6b6b',beard:false}},
 rekrut:{name:'Rekrut',pitch:152,speed:1.9,inton:.5,sing:0.075,size:.93,rough:.1,breath:.12,shake:0,rate:14332,bits:12,echo:.12,vol:.85,look:{skin:'#d6a27a',hair:'#5a3a22',beard:false}},
 frau:{name:'Frau',pitch:215,speed:1.85,inton:.55,sing:0.075,size:.84,rough:.05,breath:.2,shake:0,rate:14332,bits:12,echo:.15,vol:.85,look:{skin:'#e3b591',hair:'#7a3a1c',beard:false,long:true}},
 erzaehler:{name:'Erzähler (Intro)',pitch:104,speed:1.55,inton:.4,sing:0.03,size:1.08,rough:.15,breath:.12,shake:0,rate:13000,bits:12,echo:.38,vol:.9,look:{skin:'#b7835c',hair:'#3b2a1d',beard:true,beardCol:'#3b2a1d'}}
};
const ORDER=Object.keys(PRESETS);
let saved={};try{saved=JSON.parse((typeof localStorage!=='undefined'?localStorage.getItem(KEY):null)||'{}')||{};}catch{saved={};}
const copy=o=>JSON.parse(JSON.stringify(o));
function get(k){const base=PRESETS[k]||PRESETS.moderator;return saved[k]?{...base,...saved[k],look:base.look}:base;}
function set(k,v){const {look,...rest}=v;saved[k]=copy(rest);try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{}}
function reset(k){if(k)delete saved[k];else saved={};try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{}}

// ---------- Ablaufplan: Laute → Stützstellen ----------
// Stützstelle: {t, F:[3], av Stimme, an Rauschen, nf, nq, asp Hauch durch Formanten, o Mund, f0}
function plan(text,V,r){
 const ph=text2ph(text),sp=Math.max(.4,V.speed||1),K=[];let t=.03;
 // Silbenzahl für die Satzmelodie
 const total=ph.filter(o=>VOWEL.has(PH[o.p]?.t)).length||1;let vi=0;
 const nextVowelF=k=>{for(let j=k+1;j<ph.length;j++){const q=PH[ph[j].p];if(q&&VOWEL.has(q.t))return q.F;if(ph[j].p==='_')break;}return [500,1500,2500];};
 const sentenceEnd=k=>{for(let j=k;j<ph.length;j++)if(ph[j].end&&ph[j].end!==',')return ph[j].end;return '.';};
 let lastF=[500,1500,2500],syl=0,sylJ=0;
 const f0At=(k,stress)=>{const u=vi/total,end=sentenceEnd(k);let f=V.pitch*(1+V.inton*.25*(1-u*1.4));if(stress)f*=1+V.inton*.22;
  if(end==='?'&&u>.75)f*=1+V.inton*.9*(u-.75)*4;if(end==='!')f*=1.1;return f*(1+sylJ);};
 for(let k=0;k<ph.length;k++){const o=ph[k],P=PH[o.p];if(!P)continue;
  if(o.p==='_'){const g=(o.gap||20)/1000/sp;K.push({t,F:lastF,av:0,an:0,o:0,f0:V.pitch,asp:0});t+=g;K.push({t,F:lastF,av:0,an:0,o:0,f0:V.pitch,asp:0});if(o.end&&o.end!==','){vi=0;}continue;}
  const vow=VOWEL.has(P.t);if(vow){syl++;sylJ=(r()*2-1)*(V.sing||0);}
  const stress=!!o.stress,f0=f0At(k,stress);if(vow)vi++;
  let d=P.d/1000/sp*(stress&&vow?1.25:1)*(.9+r()*.2);
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
(typeof window!=='undefined'?window:self).Sprech={SR,KEY,PH,PRESETS,ORDER,get,set,reset,saved:()=>copy(saved),load(o){saved=copy(o||{});try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{}},changed:k=>!!saved[k],text2ph,word2ph,render,play,mouthAt};
})();
