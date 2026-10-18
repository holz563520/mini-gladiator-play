'use strict';
/* KAMPF-LABOR – Logik der Seite kampf-labor.html.
   Ändert nur M.T (Kampfparameter), die Waffen-/Rüstungs-/Schildtabellen im Speicher und den eigenen Speicher-Schlüssel des Labors. Spielstände bleiben unberührt. */
(()=>{
const M=window.MG,S=M.s,$=id=>document.getElementById(id);
if(!M||!M.TDEF||!M.TUNE_GROUPS){document.body.insertAdjacentHTML('afterbegin','<p style="padding:20px;color:#f29b83">Kampf-Parameter nicht geladen (sim.js/tuning.js fehlen).</p>');return;}
const T=M.T,TDEF=M.TDEF;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nf=(v,d=1)=>Number.isFinite(v)?v.toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d}):'–';
const pc=(a,b,d=1)=>b?nf(a/b*100,d)+' %':'–';
const clone=o=>JSON.parse(JSON.stringify(o));
const LABEL={
 stats:{strength:'Stärke',stamina:'Ausdauer',condition:'Kondition',agility:'Beweglichkeit',dexterity:'Geschick',reflex:'Reflex',precision:'Präzision',block:'Blocken',balance:'Gleichgewicht',toughness:'Härte',pain:'Schmerzresistenz',will:'Wille',aggression:'Aggression',tactics:'Taktik',teamwork:'Teamwork',experience:'Erfahrung',morale:'Moral'},
 moves:{dodge:'Ausweichen',charge:'Ansturm',backstep:'Rückwärtssprung',thrust:'Stich',spin:'Drehschlag',sand:'Sandwurf',slash:'Hieb',overhead:'Überkopf',kick:'Tritt',rise:'Aufstehen',recover:'Erholen',rearFinish:'Griff von hinten',shieldBash:'Schildstoß',groundFinish:'Bodenabschluss',pierce:'Durchstechen',combo:'Kombination'},
 mastery:{dagger:'Dolch',short:'Kurzschwert',gladius:'Gladius',long:'Langschwert',axe:'Axt',doubleaxe:'Doppelaxt',club:'Keule',mace:'Streitkolben',hammer:'Hammer',spear:'Speer',trident:'Dreizack',halberd:'Hellebarde',greatsword:'Zweihandschwert',javelin:'Wurfspeer',throwaxe:'Wurfaxt',net:'Wurfnetz',bow:'Bogen',crossbow:'Armbrust'},
 skills:{sword:'Schwert',spear:'Speer',shield:'Schild',bow:'Bogen',throw:'Wurf'}};
const GROUPS=[['stats','Attribute'],['moves','Bewegungen & Techniken'],['mastery','Waffenmeisterschaft'],['skills','Fertigkeiten'],['bodyStrength','Körperteil-Kraft'],['bodyAgility','Körperteil-Beweglichkeit']];
const PN={head:'Kopf',neck:'Hals',chest:'Brust',belly:'Bauch',ls:'L. Schulter',rs:'R. Schulter',lua:'L. Oberarm',rua:'R. Oberarm',lfa:'L. Unterarm',rfa:'R. Unterarm',lh:'L. Hand',rh:'R. Hand',lt:'L. Oberschenkel',rt:'R. Oberschenkel',lsh:'L. Unterschenkel',rsh:'R. Unterschenkel',lf:'L. Fuß',rf:'R. Fuß'};
const ATK={slash:'Hieb',thrust:'Stich',overhead:'Überkopfhieb',spin:'Drehschlag',kick:'Tritt',shieldBash:'Schildstoß',charge:'Ansturm',sand:'Sandwurf',rearFinish:'Halsschnitt von hinten',groundFinish:'Bodenabschluss',pierce:'Durchstechen',combo:'Kombination',counter:'Konter',shot:'Fernschuss',throw:'Wurf',bow:'Bogen',crossbow:'Armbrust',javelin:'Wurfspeer',throwaxe:'Wurfaxt',net:'Wurfnetz'};
const ROLES=['Soldat','Assassine','Fernkämpfer'];
const WEAPONS=M.weaponDefs.map(w=>[w.id,w.name]);
const SHIELDS=[['auto','automatisch (je Klasse)'],['none','keiner'],...M.shieldDefs.map(s=>[s.id,s.name])];
const ARMORS=[['auto','automatisch (je Klasse)'],['none','keine'],['leather','Leder'],['medium','Mittel'],['metal','Metall']];
const QUAL=M.gearQuality||['Improvisiert','Einfach','Solide','Gut','Hochwertig','Meisterhaft','Legendär'];
const TAC={aggression:['Defensiv','Ausgeglichen','Aggressiv'],formation:['Eng','Normal','Breit'],priority:['Nächster Gegner','Schwächster Gegner','Fernkämpfer','Verletzter Gegner'],ranged:['Abstand halten','Normal','Aggressiv'],help:['Niedrig','Normal','Hoch']};
const TACL={aggression:'Aggressivität',formation:'Formation',priority:'Ziele',ranged:'Fernkampf',help:'Teamhilfe'};
const BODYKEYS=Object.keys(PN);

/* ---------- Ausgangswerte der Waffen/Rüstungen/Schilde (für „zurücksetzen“) ---------- */
const DEFTAB={weapon:{fields:[['damage','Schaden'],['range','Reichweite'],['delay','Schlagpause (s)'],['pen','Durchschlag'],['block','Blockwert'],['weight','Gewicht']],list:M.weaponDefs},
 armor:{fields:[['protection','Schutz'],['weight','Gewicht']],list:M.armorDefs},
 shield:{fields:[['area','Fläche'],['protection','Schutz'],['weight','Gewicht']],list:M.shieldDefs}};
const DEFAULT_DEFS={};for(const [k,t] of Object.entries(DEFTAB)){DEFAULT_DEFS[k]={};for(const d of t.list){DEFAULT_DEFS[k][d.id]={};for(const [f] of t.fields)DEFAULT_DEFS[k][d.id][f]=d[f];}}

/* ---------- Einstellungen ---------- */
const distSpec=(mean=20)=>({dist:'bernoulli',mean,n:64,sd:5,over:{}});
const teamDefault=()=>({classes:{Soldat:{count:5,weapon:'class',shield:'auto',armor:'auto',quality:2},Assassine:{count:0,weapon:'class',shield:'auto',armor:'auto',quality:2},Fernkämpfer:{count:0,weapon:'class',shield:'auto',armor:'auto',quality:2}},
 tactics:{aggression:'Ausgeglichen',formation:'Normal',priority:'Nächster Gegner',ranged:'Abstand halten',help:'Normal'},
 gen:{stats:distSpec(),moves:distSpec(),mastery:distSpec(),skills:distSpec(),bodyStrength:distSpec(),bodyAgility:distSpec()},
 dims:{on:false,height:{mean:178,sd:7},muscle:{mean:40,sd:10},fat:{mean:16,sd:5}},bodyHp:{}});
const LDEFAULT=()=>({v:1,seed:1701,n:40,limit:120,league:0,learning:false,mirror:true,scatter:false,teams:[teamDefault(),teamDefault()],defs:{}});
let L=LDEFAULT();
const merge=(a,b)=>{if(b===null||typeof b!=='object'||Array.isArray(b))return b===undefined?a:b;const out=Array.isArray(a)?[]:{...a};for(const k of Object.keys(b))out[k]=(a&&typeof a==='object'&&k in a&&typeof a[k]==='object'&&a[k]!==null)?merge(a[k],b[k]):b[k];return out;};
function snapshot(){return {lab:1,settings:L,tune:M.tuneChanged(),defs:L.defs};}
function applyDefs(){for(const [k,t] of Object.entries(DEFTAB))for(const d of t.list)for(const [f] of t.fields){const v=L.defs?.[k]?.[d.id]?.[f];d[f]=v!==undefined?+v:DEFAULT_DEFS[k][d.id][f];}}
function save(){try{window.__labStore.set(JSON.stringify(snapshot()));}catch(e){}$('status').textContent='';updateBadges();}
function load(){try{const raw=window.__labStore.get();if(!raw)return;const o=JSON.parse(raw);if(o.settings)L=merge(LDEFAULT(),o.settings);L.defs=o.defs||o.settings?.defs||{};M.tuneReset();M.tuneImport(o.tune||{});applyDefs();}catch(e){}}

/* ---------- kleine UI-Helfer ---------- */
function el(tag,attrs={},...kids){const e=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==='class')e.className=v;else if(k==='html')e.innerHTML=v;else if(k.startsWith('on'))e[k]=v;else if(v!==false&&v!==null&&v!==undefined)e.setAttribute(k,v===true?'':v);}for(const kid of kids.flat())if(kid!==null&&kid!==undefined)e.append(kid.nodeType?kid:document.createTextNode(kid));return e;}
function field(label,input,cls=''){const l=el('label',{class:'f '+cls},label,input);return l;}
function num(obj,key,{min,max,step=1,after}={}){const i=el('input',{type:'number',min,max,step,value:obj[key]});i.onchange=()=>{let v=parseFloat(i.value);if(!Number.isFinite(v))v=obj[key];if(min!==undefined)v=Math.max(min,v);if(max!==undefined)v=Math.min(max,v);obj[key]=v;i.value=v;save();after?.();};return i;}
function sel(obj,key,opts,after){const i=el('select');for(const o of opts){const [v,t]=Array.isArray(o)?o:[o,o];i.append(el('option',{value:v},t));}i.value=obj[key];i.onchange=()=>{obj[key]=i.value;save();after?.();};return i;}
function chk(obj,key,label,after){const i=el('input',{type:'checkbox'});i.checked=!!obj[key];i.onchange=()=>{obj[key]=i.checked;save();after?.();};return el('label',{class:'f inline'},i,label);}
function slider(obj,key,{min,max,step=1,fmt=v=>v,after}){const o=el('output',{class:'mono'},fmt(obj[key]));const i=el('input',{type:'range',min,max,step,value:obj[key]});i.oninput=()=>{obj[key]=+i.value;o.textContent=fmt(obj[key]);after?.();};i.onchange=()=>save();const wrap=el('span',{class:'row',style:'margin:0;flex-wrap:nowrap;align-items:center'},i,o);wrap.sync=()=>{i.value=obj[key];o.textContent=fmt(obj[key]);};return wrap;}

/* ---------- Tabs ---------- */
const TABS=[['setup','Aufbau'],['fighters','Kämpfer'],['body','Körper & Waffen'],['params','Parameter'],['sweep','Reihe'],['result','Ergebnis'],['live','Kampf ansehen']];
function showTab(id){for(const [k] of TABS){$('tab-'+k).classList.toggle('on',k===id);$('tabbtn-'+k).classList.toggle('on',k===id);}try{history.replaceState(null,'','#'+id);}catch(e){}}
for(const [k,n] of TABS)$('tabs').append(el('button',{class:'tab',id:'tabbtn-'+k,onclick:()=>showTab(k)},n));

/* ---------- Tab Aufbau ---------- */
const PRESETS=[['1 gegen 1',{Soldat:1}],['3 gegen 3',{Soldat:3}],['5 gegen 5',{Soldat:5}],['10 gegen 10',{Soldat:10}],['20 gegen 20',{Soldat:20}],['Gemischt 10',{Soldat:6,Assassine:2,Fernkämpfer:2}],['Assassinen 5',{Assassine:5}],['Fernkämpfer 5',{Fernkämpfer:5}]];
function renderSetup(){
 const t=$('tab-setup');t.innerHTML='';
 t.append(el('h2',{},'Aufbau'),el('p',{class:'hint'},'Gruppen, Größe und Rahmen der Kämpfe. Beide Teams starten mit denselben Werten wie im Spiel (Rekruten: Bernoulli um 20). Mit „Rot spiegelt Blau“ treten zwei identische Gruppen gegeneinander an – ideal, um die Wirkung einer einzelnen Änderung zu sehen.'));
 const g=el('div',{class:'card'});
 g.append(el('div',{class:'row'},field('Kämpfe pro Lauf',num(L,'n',{min:1,max:5000,step:10})),field('Startwert (Seed)',num(L,'seed',{min:1,step:1})),field('Liga (Gegner-Härte der Kampflogik)',sel(L,'league',[0,1,2,3,4,5,6].map(i=>[i,'Liga '+i]),()=>{L.league=+L.league;save();})),field('Zeitlimit je Kampf (s)',num(L,'limit',{min:10,max:900,step:10}))));
 g.append(el('div',{class:'row'},chk(L,'mirror','Rot spiegelt Blau (gleiche Einstellungen)',renderAll),chk(L,'scatter','Zufällige Startpositionen (statt Schlachtreihe)'),chk(L,'learning','Lernen im Kampf an (Maximalwerte steigen)')));
 g.append(el('p',{class:'hint'},'Mit „Lernen im Kampf“ aus bleiben die gezogenen Werte zugleich ihre Obergrenzen – so lassen sich Läufe sauber vergleichen. Gleicher Seed + gleiche Einstellungen = identisches Ergebnis.'));
 t.append(g);
 for(const team of [0,1]){
  if(team===1&&L.mirror)continue;
  const c=el('div',{class:'card '+(team?'red':'blue')});c.append(el('h3',{},(team?'Team Rot':'Team Blau')+(L.mirror&&!team?' (Rot ist identisch)':'')));
  const ps=el('div',{class:'row'},el('span',{class:'hint'},'Größe:'));for(const [n,m] of PRESETS)ps.append(el('button',{class:'small',onclick:()=>{for(const tt of (L.mirror?[0,1]:[team]))for(const r of ROLES)L.teams[tt].classes[r].count=m[r]||0;save();renderSetup();}},n));
  c.append(ps);
  const tb=el('table');tb.append(el('tr',{},...['Klasse','Anzahl','Waffe','Schild','Rüstung','Ausrüstungsqualität'].map(h=>el('th',{},h))));
  for(const r of ROLES){const cl=L.teams[team].classes[r];tb.append(el('tr',{},el('td',{},r),el('td',{},num(cl,'count',{min:0,max:100,after:updateTotals})),el('td',{},sel(cl,'weapon',[['class','Klassenwaffe'],['mixed','gemischt (alle Waffen)'],...WEAPONS])),el('td',{},sel(cl,'shield',SHIELDS)),el('td',{},sel(cl,'armor',ARMORS)),el('td',{},sel(cl,'quality',QUAL.map((q,i)=>[i,i+' · '+q]),()=>{cl.quality=+cl.quality;save();}))));}
  c.append(el('div',{class:'scroll'},tb),el('p',{class:'hint',id:'tot'+team}));
  const tac=el('div',{class:'row'});for(const k of Object.keys(TAC))tac.append(field(TACL[k],sel(L.teams[team].tactics,k,TAC[k])));
  c.append(el('h3',{},'Taktik'),tac);t.append(c);
 }
 updateTotals();
}
function total(team){return ROLES.reduce((n,r)=>n+(+L.teams[team].classes[r].count||0),0);}
function updateTotals(){for(const t of [0,1]){const e=$('tot'+t);if(e)e.textContent='Zusammen '+total(t)+' Kämpfer'+(L.mirror&&t===0?' je Team':'')+'.';}}

/* ---------- Tab Kämpfer (Verteilungen) ---------- */
function sigma(spec){const p=Math.min(.99,Math.max(.01,spec.mean/99));return 99*Math.sqrt(p*(1-p)/Math.max(1,spec.n));}
function renderFighters(){
 const t=$('tab-fighters');t.innerHTML='';
 t.append(el('h2',{},'Kämpfer: Verteilung der Werte'),el('p',{html:'Jeder Kämpfer zieht jeden Wert einzeln aus einer Verteilung um den eingestellten Mittelwert. <b>Bernoulli</b> ist die Verteilung des Spiels: Mittelwert 20 = frischer Rekrut, Streuung σ ≈ 5 bei n = 64 (kleineres n = breitere Streuung). 50 wäre ein nahezu austrainierter Soldat. <b>Gauß</b> ist eine freie Glockenkurve mit eigener Streuung, <b>fest</b> gibt allen exakt den Mittelwert.'}));
 for(const team of [0,1]){
  if(team===1&&L.mirror)continue;
  const tm=L.teams[team],box=el('div',{class:'card '+(team?'red':'blue')});box.append(el('h3',{},team?'Team Rot':'Team Blau'+(L.mirror?' (gilt auch für Rot)':'')));
  const all=el('div',{class:'row'},el('span',{},'Alle Gruppen auf Mittelwert:'));
  const av={v:20},as=slider(av,'v',{min:1,max:100,fmt:v=>v});all.append(as,el('button',{class:'small',onclick:()=>{for(const [k] of GROUPS){tm.gen[k].mean=av.v;tm.gen[k].over={};}save();renderFighters();}},'setzen'),el('button',{class:'small',onclick:()=>{for(const [k] of GROUPS)tm.gen[k]=distSpec(20);save();renderFighters();}},'Spielstandard (Rekrut 20)'),el('button',{class:'small',onclick:()=>{for(const [k] of GROUPS)tm.gen[k]=distSpec(50);save();renderFighters();}},'Alt-Simulator (50)'));
  box.append(all);
  for(const [gk,gn] of GROUPS){
   const spec=tm.gen[gk],d=el('details',{open:gk==='stats'||null}),sm=el('summary',{},gn+' · ');const info=el('span',{class:'pill'});const upd=()=>{info.textContent=spec.dist==='fixed'?'fest '+Math.round(spec.mean):spec.dist==='gauss'?'Gauß '+Math.round(spec.mean)+' ± '+nf(+spec.sd,1):'Bernoulli '+Math.round(spec.mean)+' (σ ≈ '+nf(sigma(spec),1)+')';};upd();sm.append(info);d.append(sm);
   const row=el('div',{class:'row'});
   row.append(field('Verteilung',sel(spec,'dist',[['bernoulli','Bernoulli (wie im Spiel)'],['gauss','Gauß'],['fixed','fest']],()=>{upd();})));
   row.append(field('Mittelwert',slider(spec,'mean',{min:1,max:100,fmt:v=>v,after:upd})));
   row.append(field('Bernoulli n (Streuung)',slider(spec,'n',{min:4,max:400,fmt:v=>v,after:upd})));
   row.append(field('Gauß σ',slider(spec,'sd',{min:0,max:30,step:.5,fmt:v=>nf(+v,1),after:upd})));
   d.append(row);
   if(LABEL[gk]){const keys=Object.keys(LABEL[gk]);const tb=el('div',{class:'row'});for(const k of keys){const i=el('input',{type:'number',min:1,max:100,placeholder:'Ø '+Math.round(spec.mean),value:spec.over[k]??'',style:'width:78px'});i.onchange=()=>{if(i.value==='')delete spec.over[k];else spec.over[k]=Math.max(1,Math.min(100,+i.value));save();};tb.append(field(LABEL[gk][k],i));}d.append(el('p',{class:'hint'},'Einzelne Werte abweichend (leer = Gruppen-Mittelwert):'),tb);}
   box.append(d);
  }
  const dm=tm.dims,dd=el('details',{},el('summary',{},'Körpermaße (Größe, Muskeln, Fett)'));
  dd.append(chk(dm,'on','Körpermaße streuen (sonst alle 180 cm, Muskel 40, Fett 16)'),el('div',{class:'row'},...[['height','Größe cm',140,215],['muscle','Muskelmasse',10,80],['fat','Körperfett',3,45]].flatMap(([k,n,lo,hi])=>[field(n+' Ø',num(dm[k],'mean',{min:lo,max:hi})),field('σ',num(dm[k],'sd',{min:0,max:30,step:.5}))])));
  box.append(dd);t.append(box);
 }
}

/* ---------- Tab Körper & Waffen ---------- */
function renderBody(){
 const t=$('tab-body');t.innerHTML='';
 t.append(el('h2',{},'Körperteil-Leben'),el('p',{class:'hint'},'Trefferpunkte jedes Körperteils vor dem Kampf (Spiel: 100). Niedrigere Werte = leichter verletzt, Schwellen der Verletzungen skalieren mit dem Anteil.'));
 for(const team of [0,1]){
  if(team===1&&L.mirror)continue;const hp=L.teams[team].bodyHp,box=el('div',{class:'card '+(team?'red':'blue')});
  box.append(el('h3',{},team?'Team Rot':'Team Blau'+(L.mirror?' (gilt auch für Rot)':'')));
  const g=el('div',{class:'row'});const all=el('input',{type:'number',min:10,max:500,value:100,style:'width:80px'});
  g.append(field('Alle Körperteile',all),el('button',{class:'small',onclick:()=>{for(const k of BODYKEYS)hp[k]=Math.max(10,+all.value||100);save();renderBody();}},'setzen'),el('button',{class:'small',onclick:()=>{L.teams[team].bodyHp={};save();renderBody();}},'alle 100 (Spiel)'));box.append(g);
  const r=el('div',{class:'row'});for(const k of BODYKEYS){const i=el('input',{type:'number',min:10,max:500,value:hp[k]??100,style:'width:78px'});i.onchange=()=>{const v=Math.max(10,+i.value||100);if(v===100)delete hp[k];else hp[k]=v;i.value=v;save();};r.append(field(PN[k],i));}
  box.append(r);t.append(box);
 }
 t.append(el('h2',{},'Waffen, Schilde und Rüstungen'),el('p',{class:'hint'},'Werte der Ausrüstungs-Tabellen. Geänderte Zeilen sind gelb. Gilt nur im Labor, nicht im Spiel.'));
 const titles={weapon:'Waffen',armor:'Rüstungsteile',shield:'Schilde'};
 for(const [kind,tab] of Object.entries(DEFTAB)){
  const tb=el('table');tb.append(el('tr',{},el('th',{},titles[kind]),...tab.fields.map(([,n])=>el('th',{},n)),el('th',{},'')));
  for(const d of tab.list){
   const tr=el('tr');const mark=()=>{tr.className=tab.fields.some(([f])=>d[f]!==DEFAULT_DEFS[kind][d.id][f])?'hi':'';};
   tr.append(el('td',{},d.name));
   for(const [f] of tab.fields){const i=el('input',{type:'number',step:'any',value:d[f],style:'width:84px'});i.onchange=()=>{const v=parseFloat(i.value);if(!Number.isFinite(v)){i.value=d[f];return;}d[f]=v;((L.defs[kind]??={})[d.id]??={})[f]=v;if(v===DEFAULT_DEFS[kind][d.id][f]){delete L.defs[kind][d.id][f];}save();mark();};tr.append(el('td',{},i));}
   tr.append(el('td',{},el('button',{class:'small',onclick:()=>{for(const [f] of tab.fields)d[f]=DEFAULT_DEFS[kind][d.id][f];if(L.defs[kind])delete L.defs[kind][d.id];save();renderBody();}},'⟲')));mark();tb.append(tr);
  }
  t.append(el('div',{class:'card scroll'},tb));
 }
}

/* ---------- Tab Parameter ---------- */
let filterText='',filterChanged=false;
const TYPEN={p:'Wahrscheinlichkeit',m:'Faktor',n:'ganze Zahl',a:'Wert'};
function stepFor(d,type){if(type==='n')return 1;const a=Math.abs(d);return a===0?.01:a<1?.01:a<10?.1:a<100?.5:1;}
function paramRow(key,label,type,hint){
 const d=TDEF[key],changed=T[key]!==d,row=el('div',{class:'prow'+(changed?' changed':''),'data-key':key});
 const lab=el('div',{class:'lab'},el('b',{},label),el('small',{},key+' · '+(TYPEN[type]||'')+(hint?' · '+hint:'')));
 const st=stepFor(d,type),i=el('input',{type:'number',step:st,value:T[key]});
 const hi=type==='p'?1:Math.max(Math.abs(d)*3,st*10),lo=d<0?-hi:0;
 const r=el('input',{type:'range',min:lo,max:hi,step:st,value:Math.min(hi,Math.max(lo,T[key]))});
 const sync=()=>{row.classList.toggle('changed',T[key]!==d);defEl.textContent='Spiel: '+d;};
 const defEl=el('span',{class:'def'},'Spiel: '+d);
 const setv=v=>{if(!Number.isFinite(v))return;M.tuneSet(key,type==='n'?Math.round(v):v);i.value=T[key];r.value=Math.min(hi,Math.max(lo,T[key]));sync();save();};
 i.onchange=()=>setv(parseFloat(i.value));r.oninput=()=>{M.tuneSet(key,type==='n'?Math.round(+r.value):+r.value);i.value=T[key];sync();};r.onchange=()=>save();
 const back=el('button',{class:'small',title:'Auf Spielwert zurück',onclick:()=>{M.tuneReset(key);i.value=T[key];r.value=T[key];sync();save();}},'⟲');
 row.append(lab,el('div',{class:'ctl'},r,i,defEl,back));return row;
}
function renderParams(){
 const t=$('tab-params');t.innerHTML='';
 t.append(el('h2',{},'Parameter ('+Object.keys(TDEF).length+')'),el('p',{class:'hint'},'Jede Zahl der Kampflogik: Treffer-, Block- und Ausweichchancen, Auslösewahrscheinlichkeiten und Gewichte der Techniken, Schaden, Zielwahl, Verletzungs- und Bruchschwellen, Kampfunfähigkeit, Taumeln, Stürze, Aufstehen, Moral. Vorgabe = Spielwert. Geänderte sind gelb und mit ⟲ einzeln zurücksetzbar. Gespeichert wird automatisch.'));
 const bar=el('div',{class:'row'});
 const q=el('input',{type:'search',placeholder:'Suchen (Name, Schlüssel, Gruppe) …',value:filterText,style:'min-width:240px'});q.oninput=()=>{filterText=q.value.trim().toLowerCase();applyFilter();};
 const cc=el('input',{type:'checkbox'});cc.checked=filterChanged;cc.onchange=()=>{filterChanged=cc.checked;applyFilter();};
 bar.append(field('Suche',q),el('label',{class:'f inline'},cc,'nur geänderte'),el('button',{class:'small',onclick:()=>{for(const d of t.querySelectorAll('details.pg'))d.open=true;}},'alle öffnen'),el('button',{class:'small',onclick:()=>{for(const d of t.querySelectorAll('details.pg'))d.open=false;}},'alle schließen'),el('button',{class:'small',onclick:()=>{M.tuneReset();save();renderParams();}},'⟲ alle Parameter auf Spielwerte'));
 t.append(el('div',{class:'card'},bar));
 const wrap=el('div',{id:'pgroups'});t.append(wrap);
 for(const g of M.TUNE_GROUPS){
  const d=el('details',{class:'pg','data-name':g.name.toLowerCase()}),sm=el('summary',{},g.name+' ');sm.append(el('span',{class:'pill'},g.rows.length+' Parameter'),' ',el('span',{class:'badge','data-badge':''}));d.append(sm,el('p',{class:'hint'},g.intro||''));
  const body=el('div',{class:'pbody'});d.append(body);
  const fill=()=>{if(body.dataset.done)return;body.dataset.done=1;for(const [key,label,type,hint] of g.rows)body.append(paramRow(key,label,type,hint));applyFilter();};
  d.addEventListener('toggle',()=>{if(d.open)fill();});d._fill=fill;wrap.append(d);
 }
 updateBadges();applyFilter();
}
function applyFilter(){
 for(const d of document.querySelectorAll('#pgroups details.pg')){
  if(filterText||filterChanged)d._fill?.();
  let shown=0;const g=M.TUNE_GROUPS.find(x=>x.name.toLowerCase()===d.dataset.name);
  for(const row of d.querySelectorAll('.prow')){const key=row.dataset.key,spec=g.rows.find(r=>r[0]===key);const txt=(spec.slice(0,4).join(' ')+' '+g.name).toLowerCase();const ok=(!filterText||txt.includes(filterText))&&(!filterChanged||T[key]!==TDEF[key]);row.hidden=!ok;if(ok)shown++;}
  const anyChanged=g.rows.some(r=>T[r[0]]!==TDEF[r[0]]);
  d.hidden=(filterText||filterChanged)&&!(shown||((filterText&&d.dataset.name.includes(filterText))&&!filterChanged&&g.rows.length));
  if((filterText||filterChanged)&&shown&&!d.hidden)d.open=true;
 }
}
function updateBadges(){
 const ch=M.tuneChanged();for(const d of document.querySelectorAll('#pgroups details.pg')){const g=M.TUNE_GROUPS.find(x=>x.name.toLowerCase()===d.dataset.name),n=g.rows.filter(r=>r[0] in ch).length,b=d.querySelector('[data-badge]');if(b){b.textContent=n?n+' geändert':'';b.hidden=!n;}}
 const n=Object.keys(ch).length,wd=Object.values(L.defs).reduce((s,o)=>s+Object.values(o).reduce((x,f)=>x+Object.keys(f).length,0),0);
 $('tabbtn-params').textContent='Parameter'+(n?' ('+n+')':'');$('tabbtn-body').textContent='Körper & Waffen'+(wd?' ('+wd+')':'');
}

/* ---------- Konfiguration für die Engine ---------- */
function teamCfg(team){return L.mirror?clone(L.teams[0]):L.teams[team];}
function buildConfig(seed){
 const cfg={role0:'Soldat',role1:'Soldat',weapon0:'class',weapon1:'class',armor0:'auto',armor1:'auto',shield0:'auto',shield1:'auto',quality0:2,quality1:2,seed,league:+L.league,scatter:!!L.scatter,entries:[[],[]],teamTactics:[],gen:[],leaderIndices:[-1,-1]};
 for(const team of [0,1]){
  const tc=teamCfg(team);let idx=0;
  for(const r of ROLES){const c=tc.classes[r];for(let i=0;i<(+c.count||0);i++){cfg.entries[team].push({role:r,weapon:c.weapon,shield:c.shield,armor:c.armor,quality:+c.quality});idx++;}}
  cfg['count'+team]=idx;cfg.teamTactics[team]={...tc.tactics};
  const gen={learning:!!L.learning};for(const [gk] of GROUPS)gen[gk]=clone(tc.gen[gk]);if(tc.dims.on)gen.dims={height:tc.dims.height,muscle:tc.dims.muscle,fat:tc.dims.fat};
  cfg.gen[team]=gen;const hp={};for(const k of BODYKEYS)if(tc.bodyHp[k]&&tc.bodyHp[k]!==100)hp[k]=tc.bodyHp[k];if(Object.keys(hp).length)cfg['bodyHp'+team]=hp;
 }
 cfg.count=Math.max(cfg.count0,cfg.count1);return cfg;
}
function configError(){for(const t of [0,1]){if(t===1&&L.mirror)continue;if(total(t)<1)return (t?'Team Rot':'Team Blau')+' hat keine Kämpfer.';}if(total(0)>100||total(1)>100)return 'Höchstens 100 Kämpfer je Team.';return '';}

/* ---------- Simulation & Auswertung ---------- */
const newAgg=()=>({fights:0,wins:[0,0],draws:0,timeouts:0,time:0,times:[],teams:[0,1].map(()=>({fighters:0,damage:0,taken:0,kills:0,downs:0,dead:0,falls:0,rises:0,kneels:0,staggers:0,blocks:0,dodges:0,crits:0,attacks:0})),
 classes:{},weapons:{},attacks:{},parts:{},wounds:{},downWhy:{},deathWhy:{},fallWhy:{},hitsAtDown:[],healthAtDown:[],standAtDown:[],partsAtDown:[]});
const bump=(o,k,init)=>o[k]??(o[k]=init());
function addFight(R,b,res,timedOut){
 R.fights++;R.time+=b.time;R.times.push(b.time);
 if(timedOut)R.timeouts++;
 if(res.winner===0||res.winner===1)R.wins[res.winner]++;else R.draws++;
 for(const a of b.actors){
  const tm=R.teams[a.team],g=a.g;tm.fighters++;tm.damage+=a.damage||0;tm.taken+=a.taken||0;tm.kills+=a.kills||0;
  const downed=a.down||g.dead;if(downed)tm.downs++;if(g.dead)tm.dead++;
  tm.falls+=a.falls||0;tm.rises+=a.rises||0;tm.kneels+=a.kneels||0;tm.staggers+=a.staggers||0;tm.blocks+=a.blocks||0;tm.dodges+=a.dodges||0;tm.crits+=a.crits||0;
  const c=bump(R.classes,a.team+'|'+g.role,()=>({team:a.team,role:g.role,count:0,damage:0,taken:0,kills:0,downs:0,dead:0,attacks:0,hits:0}));
  c.count++;c.damage+=a.damage||0;c.taken+=a.taken||0;c.kills+=a.kills||0;if(downed)c.downs++;if(g.dead)c.dead++;
  const it=g.enemyGear?.weapon||g.enemyGear?.secondary,wid=it?.def||'?';
  const w=bump(R.weapons,a.team+'|'+wid,()=>({team:a.team,id:wid,count:0,attacks:0,hits:0,damage:0,downs:0,dead:0,taken:0}));
  w.count++;if(downed)w.downs++;if(g.dead)w.dead++;w.taken+=a.taken||0;
  for(const [k,n] of Object.entries(a.attacks||{})){const r=bump(R.attacks,k,()=>({key:k,count:0,hits:0,damage:0}));r.count+=n;tm.attacks+=n;c.attacks+=n;w.attacks+=n;}
  for(const [k,v] of Object.entries(a.attackDamage||{})){const r=bump(R.attacks,k,()=>({key:k,count:0,hits:0,damage:0}));r.hits+=v.hits;r.damage+=v.damage;c.hits+=v.hits;w.hits+=v.hits;w.damage+=v.damage;}
  for(const [k,n] of Object.entries(a.hitParts||{}))R.parts[k]=(R.parts[k]||0)+n;
  for(const p of Object.values(g.body||{}))for(const wd of (p.wounds||[])){const r=bump(R.wounds,wd.type||'?',()=>({type:wd.type||'?',count:0,hits:0,damage:0}));r.count++;r.hits+=wd.hits||0;r.damage+=wd.damage||0;}
  if(downed){const why=a.downWhy||a.reason||'unbekannt';R.downWhy[why]=(R.downWhy[why]||0)+1;R.hitsAtDown.push(a.hitsAtDown??a.hitsTaken??0);R.healthAtDown.push(a.healthAtDown??0);R.standAtDown.push(a.standAtDown??a.standHits??0);R.partsAtDown.push(Object.keys(a.partsAtDown||{}).length);}
  if(g.dead){const why=g.cause||'unbekannt';R.deathWhy[why]=(R.deathWhy[why]||0)+1;}
  for(const [k,n] of Object.entries(a.fallReasons||{}))R.fallWhy[k]=(R.fallWhy[k]||0)+(+n||0);
 }
}
function runOne(cfg,R){
 M.benchmarkFinale=false;const err=M.startBenchmark(cfg);if(err)throw new Error(err);
 const b=S.battle,cap=Math.round((M.benchmarkTimeLimit||120)*60)+300;let st=0;
 while(S.battle===b&&!b.result&&st<cap){M.fixedStep(1/60);st++;}
 let timedOut=false;if(S.battle===b){timedOut=true;M.endBenchmark(-1,'Zeitlimit');}
 const res=M.benchmarkResults[0]||{winner:-1};addFight(R,b,res,timedOut||/zeit/i.test(res.reason||''));
}
let running=false,cancelFlag=false;
function setRunning(on){running=on;$('go').disabled=on;$('watch').disabled=on;$('cancel').hidden=!on;}
function runBatch(n,seed0,onProgress,config=buildConfig){
 return new Promise((resolve,reject)=>{
  const R=newAgg();let i=0;M.benchmarkTimeLimit=+L.limit||120;
  (function step(){const t0=performance.now();
   try{while(i<n&&!cancelFlag&&performance.now()-t0<50){runOne(config(seed0+i*7919),R);i++;}}catch(e){reject(e);return;}
   onProgress?.(i,n);if(i<n&&!cancelFlag){setTimeout(step,0);return;}R.cancelled=cancelFlag&&i<n;resolve(R);})();
 });
}
function stopLive(){if(S.battle?.benchmark){try{M.endBenchmark(-1,'Ende');}catch(e){}}M.benchmarkFinale=false;liveOn=false;}

/* ---------- Ergebnis ---------- */
let prev=null,lastR=null,lastDesc='';
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN,median=a=>a.length?[...a].sort((x,y)=>x-y)[a.length>>1]:NaN;
const wname=id=>WEAPONS.find(w=>w[0]===id)?.[1]||id;
const tname=t=>t?'Rot':'Blau';
function keyNumbers(R){const f=R.fights||1,tot=R.teams[0].fighters+R.teams[1].fighters;return {'Mittlere Kampfdauer (s)':R.time/f,'Tote je Kampf':(R.teams[0].dead+R.teams[1].dead)/f,'Kampfunfähige je Kampf':(R.teams[0].downs+R.teams[1].downs)/f,'Schaden je Kampf':(R.teams[0].damage+R.teams[1].damage)/f,'Treffer bis Kampfunfähigkeit (Ø)':mean(R.hitsAtDown),'Siege Blau (%)':R.wins[0]/f*100,'Angriffe je Kämpfer':(R.teams[0].attacks+R.teams[1].attacks)/(tot||1)};}
function table(head,rows,cls=[]){const t=el('table');t.append(el('tr',{},...head.map((h,i)=>el('th',{class:cls[i]==='n'?'n':''},h))));for(const r of rows){const tr=el('tr',{class:r.hi?'hi':''});r.c.forEach((c,i)=>{const td=el('td',{class:cls[i]==='n'?'n':''});if(c&&c.nodeType)td.append(c);else td.innerHTML=c??'';tr.append(td);});t.append(tr);}return el('div',{class:'scroll'},t);}
const bar=(v,max,col)=>`<span class="bar" style="width:${Math.max(1,Math.round(v/(max||1)*120))}px${col?';background:'+col:''}"></span>`;
function histogram(vals,bins,label,fmtEdge){if(!vals.length)return el('p',{class:'hint'},'keine Daten');const lo=bins[0],counts=new Array(bins.length).fill(0);for(const v of vals){let k=bins.length-1;for(let i=0;i<bins.length-1;i++)if(v<bins[i+1]){k=i;break;}counts[k]++;}const mx=Math.max(...counts);return table([label,'Anzahl','Anteil',''],bins.map((b,i)=>({c:[(i===bins.length-1?'ab '+fmtEdge(b):fmtEdge(b)+' – '+fmtEdge(bins[i+1])),counts[i],pc(counts[i],vals.length),bar(counts[i],mx)]})),['','n','n','']);}
function renderResult(){
 const t=$('tab-result');t.innerHTML='';
 if(!lastR){t.append(el('h2',{},'Ergebnis'),el('p',{class:'hint'},'Noch kein Lauf. „▶ Simulieren“ unten rechnet die eingestellte Anzahl Kämpfe und zeigt hier alle Tabellen.'));return;}
 const R=lastR,f=R.fights||1;
 t.append(el('h2',{},'Ergebnis · '+R.fights+' Kämpfe'),el('p',{class:'hint'},lastDesc+(R.cancelled?' · abgebrochen':'')));
 const kn=keyNumbers(R),pk=prev?keyNumbers(prev):null;
 const rows=[];
 rows.push({hi:1,c:['Kämpfe',R.fights,'']});
 rows.push({c:['Sieg Blau / Rot / Unentschieden',R.wins[0]+' / '+R.wins[1]+' / '+R.draws,pc(R.wins[0],f)+' / '+pc(R.wins[1],f)+' / '+pc(R.draws,f)]});
 rows.push({c:['Zeitlimit erreicht',R.timeouts,pc(R.timeouts,f)]});
 for(const [k,v] of Object.entries(kn)){let dl='';if(pk&&Number.isFinite(pk[k])&&Number.isFinite(v)){const d=v-pk[k];dl=Math.abs(d)<.005?'±0':`<span class="${d>0?'up':'down'}">${d>0?'+':''}${nf(d,2)}</span> (vorher ${nf(pk[k],2)})`;}rows.push({hi:/Dauer|Treffer bis/.test(k),c:[k,nf(v,2),dl]});}
 t.append(el('h3',{},'Übersicht'),table(['Kennzahl','Wert','Änderung zum vorherigen Lauf'],rows,['','n','']));
 // Teams
 t.append(el('h3',{},'Teams'),table(['Team','Kämpfer','Schaden gemacht (je Kämpfer)','Schaden erlitten (je Kämpfer)','Kills','Kampfunfähig','Tot','Stürze','Taumeln','Knien','Blocks','Ausweichen','Krits'],R.teams.map((m,i)=>({c:[tname(i),m.fighters,nf(m.damage/(m.fighters||1),1),nf(m.taken/(m.fighters||1),1),nf(m.kills/f,2)+' /K.',pc(m.downs,m.fighters),pc(m.dead,m.fighters),nf(m.falls/f,2)+' /K.',nf(m.staggers/f,2)+' /K.',nf(m.kneels/f,2)+' /K.',nf(m.blocks/f,1)+' /K.',nf(m.dodges/f,1)+' /K.',nf(m.crits/f,1)+' /K.']})),['','n','n','n','n','n','n','n','n','n','n','n','n']));
 // Klassen
 const cls=Object.values(R.classes).sort((a,b)=>a.team-b.team||ROLES.indexOf(a.role)-ROLES.indexOf(b.role));
 t.append(el('h3',{},'Klassen: wer teilt wie viel aus, wer steckt wie viel ein'),table(['Team','Klasse','Kämpfer','Schaden gemacht je Kämpfer','Schaden erlitten je Kämpfer','Angriffe je Kämpfer','Treffer je Kämpfer','Kills je Kämpfer','Kampfunfähig','Tot'],cls.map(c=>({c:[tname(c.team),c.role,c.count,nf(c.damage/c.count,1),nf(c.taken/c.count,1),nf(c.attacks/c.count,1),nf(c.hits/c.count,1),nf(c.kills/c.count,2),pc(c.downs,c.count),pc(c.dead,c.count)]})),['','','n','n','n','n','n','n','n','n']));
 // Waffen
 const ws=Object.values(R.weapons).sort((a,b)=>b.damage-a.damage);
 t.append(el('h3',{},'Waffen (Angreifer)'),table(['Team','Waffe','Träger','Angriffe','Treffer','Trefferquote','Schaden gesamt','Schaden je Treffer','Schaden je Träger','Träger kampfunfähig','Träger tot'],ws.map(w=>({c:[tname(w.team),wname(w.id),w.count,w.attacks,w.hits,pc(w.hits,w.attacks),nf(w.damage,0),nf(w.damage/(w.hits||1),1),nf(w.damage/w.count,1),pc(w.downs,w.count),pc(w.dead,w.count)]})),['','','n','n','n','n','n','n','n','n','n']));
 // Techniken
 const at=Object.values(R.attacks).sort((a,b)=>b.count-a.count),totA=at.reduce((s,r)=>s+r.count,0),totD=at.reduce((s,r)=>s+r.damage,0),mxD=Math.max(1,...at.map(r=>r.damage));
 t.append(el('h3',{},'Techniken / Angriffe'),table(['Technik','Anzahl','Anteil','je Kampf','Treffer','Trefferquote','Schaden gesamt','Schaden je Treffer','Anteil am Schaden',''],at.map(r=>({c:[(ATK[r.key]||r.key)+' <span class="mono">'+esc(r.key)+'</span>',r.count,pc(r.count,totA),nf(r.count/f,2),r.hits,pc(r.hits,r.count),nf(r.damage,0),nf(r.damage/(r.hits||1),1),pc(r.damage,totD),bar(r.damage,mxD)]})),['','n','n','n','n','n','n','n','n','']));
 // Körperteile
 const pr=Object.entries(R.parts).sort((a,b)=>b[1]-a[1]),totP=pr.reduce((s,r)=>s+r[1],0);
 t.append(el('h3',{},'Getroffene Körperteile'),table(['Körperteil','Treffer','Anteil','je Kampf',''],pr.map(([k,n])=>({c:[PN[k]||k,n,pc(n,totP),nf(n/f,2),bar(n,pr[0][1])]})),['','n','n','n','']));
 // Wunden
 const wd=Object.values(R.wounds).sort((a,b)=>b.count-a.count);
 if(wd.length)t.append(el('h3',{},'Verletzungsarten (Wunden an Körperteilen)'),table(['Art','Anzahl','je Kampf','Schaden darin'],wd.map(w=>({c:[w.type,w.count,nf(w.count/f,2),nf(w.damage,0)]})),['','n','n','n']));
 // Ausfälle
 const dw=Object.entries(R.downWhy).sort((a,b)=>b[1]-a[1]),tot=dw.reduce((s,r)=>s+r[1],0),dh=Object.entries(R.deathWhy).sort((a,b)=>b[1]-a[1]),fw=Object.entries(R.fallWhy).sort((a,b)=>b[1]-a[1]);
 t.append(el('div',{class:'grid'},
  el('div',{},el('h3',{},'Warum kampfunfähig'),table(['Grund','Anzahl','Anteil'],dw.map(([k,n])=>({c:[esc(k),n,pc(n,tot)]})),['','n','n'])),
  el('div',{},el('h3',{},'Todesursachen'),dh.length?table(['Ursache','Anzahl'],dh.map(([k,n])=>({c:[esc(k),n]})),['','n']):el('p',{class:'hint'},'keine Toten')),
  el('div',{},el('h3',{},'Gründe für Stürze'),fw.length?table(['Grund','Anzahl'],fw.map(([k,n])=>({c:[esc(k),n]})),['','n']):el('p',{class:'hint'},'keine Angaben'))));
 const hd=R.hitsAtDown;
 t.append(el('h3',{},'Treffer bis zur Kampfunfähigkeit'),table(['Kennzahl','Wert'],[{c:['Mittel (alle Treffer)',nf(mean(hd),2)]},{c:['Median',nf(median(hd),0)]},{c:['davon im Stand (Mittel)',nf(mean(R.standAtDown),2)]},{c:['Verschiedene Körperteile (Mittel)',nf(mean(R.partsAtDown),2)]},{c:['Restgesundheit bei Ausfall (Mittel, %)',nf(mean(R.healthAtDown),1)]},{c:['Ausgeschaltet nach höchstens 2 / 3 / 5 / 8 Treffern',[2,3,5,8].map(k=>pc(hd.filter(x=>x<=k).length,hd.length,0)).join(' / ')]}],['','n']));
 const mxT=Math.max(...R.times,10),step=Math.max(5,Math.ceil(mxT/12/5)*5);const edges=[];for(let x=0;x<mxT;x+=step)edges.push(x);
 t.append(el('div',{class:'grid'},el('div',{},el('h3',{},'Verteilung der Kampfdauer'),histogram(R.times,edges,'Sekunden',v=>Math.round(v)+' s')),el('div',{},el('h3',{},'Verteilung der Treffer bis Ausfall'),histogram(hd,[0,1,2,3,4,5,6,8,10,13,17,25],'Treffer',v=>v))));
 t.append(el('div',{class:'row'},el('button',{onclick:()=>{prev=lastR;$('status').textContent='Dieser Lauf dient als Vergleich für den nächsten.';}},'Diesen Lauf als Vergleich merken'),el('button',{onclick:copyCSV},'Tabellen als CSV kopieren')));
}
function copyCSV(){const out=[];for(const tb of document.querySelectorAll('#tab-result table')){for(const tr of tb.rows)out.push([...tr.cells].map(c=>'"'+c.textContent.trim().replace(/"/g,'""')+'"').join(';'));out.push('');}const s=out.join('\n');(navigator.clipboard?.writeText(s)||Promise.reject()).then(()=>$('status').textContent='CSV kopiert.').catch(()=>{const ta=el('textarea',{style:'width:100%;height:160px'});ta.value=s;$('tab-result').append(ta);ta.select();});}
function describe(){const d=t=>ROLES.filter(r=>L.teams[t].classes[r].count>0).map(r=>L.teams[t].classes[r].count+' '+r).join(' + ');const ch=Object.keys(M.tuneChanged()).length;return 'Blau: '+d(0)+' gegen Rot: '+d(L.mirror?0:1)+(L.mirror?' (gespiegelt)':'')+' · Seed '+L.seed+' · '+ch+' Parameter geändert';}

async function simulate(){
 if(running)return;const err=configError();if(err){$('status').textContent=err;return;}
 stopLive();cancelFlag=false;setRunning(true);showTab('result');
 const t=$('tab-result');t.innerHTML='<h2>Rechne …</h2><progress id="pr" value="0" max="'+L.n+'"></progress><p class="hint" id="prt"></p>';
 const t0=performance.now();
 try{const R=await runBatch(+L.n,+L.seed,(i,n)=>{const p=$('pr');if(p){p.value=i;p.max=n;}$('prt').textContent=i+' von '+n+' Kämpfen · '+nf((performance.now()-t0)/1000,1)+' s';});
  if(lastR&&!R.cancelled)prev=lastR;lastR=R;lastDesc=describe();}
 catch(e){t.innerHTML='<p style="color:#f29b83">Fehler: '+esc(e.message)+'</p>';setRunning(false);return;}
 setRunning(false);renderResult();
}

/* ---------- Reihe (Parameter-Sweep) ---------- */
const sweepState={key:'',from:0,to:1,steps:5,n:60};
function renderSweep(){
 const t=$('tab-sweep');t.innerHTML='';
 t.append(el('h2',{},'Reihe: einen Parameter durchfahren'),el('p',{class:'hint'},'Ein Parameter wird in Stufen von „von“ bis „bis“ verändert; für jede Stufe laufen dieselben Kämpfe (gleiche Seeds). So sieht man sofort, wie Kampfdauer, Tote, Schaden oder Siegquote vom Wert abhängen und wo ein guter Wert liegt. Danach steht der Parameter wieder auf seinem Wert.'));
 const all=[];for(const g of M.TUNE_GROUPS)for(const r of g.rows)all.push([r[0],r[1]+' · '+g.name+' · '+r[0]]);
 const dl=el('datalist',{id:'allkeys'});for(const [k,n] of all)dl.append(el('option',{value:k},n));
 const key=el('input',{type:'text',list:'allkeys',placeholder:'Schlüssel eintippen, z. B. accBase',value:sweepState.key});
 const info=el('div',{class:'hint'});
 const fillInfo=()=>{const r=all.find(x=>x[0]===key.value);info.textContent=r?r[1]+' · Spielwert '+TDEF[key.value]+' · aktuell '+T[key.value]:'Bitte einen gültigen Schlüssel wählen (Liste erscheint beim Tippen, Namen der Parameter stehen im Tab „Parameter“).';};
 key.onchange=()=>{sweepState.key=key.value;if(key.value in TDEF){const d=TDEF[key.value];sweepState.from=+(d*.5).toFixed(3);sweepState.to=+(d*1.5||1).toFixed(3);}renderSweep();};fillInfo();
 const box=el('div',{class:'card'},el('div',{class:'row'},field('Parameter',key),field('von',num(sweepState,'from',{step:'any'})),field('bis',num(sweepState,'to',{step:'any'})),field('Stufen',num(sweepState,'steps',{min:2,max:15})),field('Kämpfe je Stufe',num(sweepState,'n',{min:5,max:2000,step:10})),el('button',{class:'primary',id:'sweepGo',onclick:runSweep},'▶ Reihe starten')),info,dl);
 t.append(box,el('div',{id:'sweepOut'}));
}
async function runSweep(){
 if(running)return;const key=sweepState.key;if(!(key in TDEF)){$('status').textContent='Ungültiger Parameter.';return;}const err=configError();if(err){$('status').textContent=err;return;}
 stopLive();cancelFlag=false;setRunning(true);const orig=T[key],steps=Math.max(2,Math.round(sweepState.steps)),vals=[];for(let i=0;i<steps;i++)vals.push(sweepState.from+(sweepState.to-sweepState.from)*i/(steps-1));
 const out=$('sweepOut');out.innerHTML='<progress id="spr" max="'+steps+'" value="0"></progress><p class="hint" id="sprt"></p>';const rows=[];
 try{for(let k=0;k<vals.length&&!cancelFlag;k++){M.T[key]=vals[k];$('sprt').textContent='Stufe '+(k+1)+' von '+steps+' · Wert '+nf(vals[k],3);
   const R=await runBatch(sweepState.n,+L.seed,null);if(R.cancelled)break;rows.push([vals[k],R]);$('spr').value=k+1;}}
 catch(e){out.innerHTML='<p style="color:#f29b83">Fehler: '+esc(e.message)+'</p>';}
 finally{M.T[key]=orig;setRunning(false);}
 const head=['Wert','Blau-Siege','Unentschieden','Kampfdauer (s)','Tote je Kampf','Kampfunfähig je Kampf','Schaden je Kampf','Treffer bis Ausfall','Angriffe je Kämpfer'];
 const tb=rows.map(([v,R])=>{const k=keyNumbers(R),f=R.fights;return {hi:Math.abs(v-TDEF[key])<1e-9,c:[nf(v,3)+(Math.abs(v-TDEF[key])<1e-9?' (Spielwert)':''),pc(R.wins[0],f),pc(R.draws,f),nf(k['Mittlere Kampfdauer (s)'],1),nf(k['Tote je Kampf'],2),nf(k['Kampfunfähige je Kampf'],2),nf(k['Schaden je Kampf'],0),nf(k['Treffer bis Kampfunfähigkeit (Ø)'],2),nf(k['Angriffe je Kämpfer'],1)]};});
 out.innerHTML='';out.append(el('h3',{},'Ergebnis für '+key),table(head,tb,['','n','n','n','n','n','n','n','n']),el('p',{class:'hint'},'Gelb = Spielwert. Der Parameter steht wieder auf '+orig+'.'));
}

/* ---------- Kampf ansehen ---------- */
let liveOn=false,seen=null,lastSkull=0;
function startLive(){
 if(running)return;const err=configError();if(err){$('status').textContent=err;return;}
 if(S.battle?.benchmark){try{M.endBenchmark(-1,'Ende');}catch(e){}}
 M.benchmarkTimeLimit=+L.limit||120;const e=M.startBenchmark(buildConfig(Math.floor(Math.random()*4e9)+1));if(e){$('vinfo').textContent=e;return;}
 M.benchmarkFinale=true;S.options.speed=+$('spd').value;S.battle.paused=false;seen=S.battle;lastSkull=0;$('vlog').innerHTML='';$('pause').textContent='⏸ Pause';liveOn=true;showTab('live');
}
function liveLoop(){
 if(!liveOn||!seen)return;const b=seen;
 for(const a of b.actors)if(a.hitsAtDown!==undefined&&!a._rep){a._rep=1;$('vlog').insertAdjacentHTML('beforeend',`<p>${a.team?'🔴':'🔵'} ${esc(a.g.name)} (${esc(a.g.role)}) ${a.g.dead?'<b>tot</b>':'kampfunfähig'} – ${esc(a.downWhy||a.reason||a.g.cause||'?')} nach ${a.hitsAtDown} Treffern (davon ${a.standAtDown??0} im Stand)</p>`);}
 const L2=b.skullLog||[];while(lastSkull<L2.length){const e=L2[lastSkull++];$('vlog').insertAdjacentHTML('beforeend',`<p>💀 Schädelbruch: ${esc(e.victim)} durch ${esc(e.attacker)} (${esc(e.weapon)}) – ${esc(e.cause)}${e.helm?', trotz Helm':''}</p>`);}
 const alive=t=>b.actors.filter(a=>a.team===t&&!a.down&&!a.g.dead&&!a.surrendered).length;
 $('vinfo').textContent=S.battle===b?`Zeit ${Math.round(b.time)} s · Blau ${alive(0)} / Rot ${alive(1)} kampffähig`:'Kampf beendet – „Nächster Kampf“ startet einen neuen.';
 if(S.battle!==b&&$('auto').checked&&!window._wait){window._wait=1;setTimeout(()=>{window._wait=0;if(liveOn&&$('auto').checked)startLive();},1500);}
 $('vlog').scrollTop=1e9;
}
setInterval(liveLoop,300);
$('spd').onchange=()=>{S.options.speed=+$('spd').value;};
$('pause').onclick=()=>{const b=S.battle;if(!b)return;b.paused=!b.paused;$('pause').textContent=b.paused?'▶ Weiter':'⏸ Pause';};
$('next').onclick=startLive;$('stop').onclick=()=>{stopLive();$('vinfo').textContent='Beendet.';};
$('watch').onclick=startLive;$('go').onclick=simulate;$('cancel').onclick=()=>{cancelFlag=true;};

/* ---------- Gesamt ---------- */
$('resetAll').onclick=()=>{if($('resetAll').dataset.arm!=='1'){$('resetAll').dataset.arm='1';$('resetAll').textContent='Wirklich alles zurücksetzen? (nochmal klicken)';setTimeout(()=>{$('resetAll').dataset.arm='';$('resetAll').textContent='⟲ Alles auf Spielstandard';},4000);return;}
 $('resetAll').dataset.arm='';$('resetAll').textContent='⟲ Alles auf Spielstandard';L=LDEFAULT();M.tuneReset();applyDefs();save();lastR=null;prev=null;renderAll();$('status').textContent='Alles auf Spielstandard.';};
function renderIO(){
 const box=$('tab-setup'),c=el('div',{class:'card'});c.append(el('h3',{},'Einstellungen sichern / teilen'),el('p',{class:'hint'},'Alle Einstellungen (Aufbau, Verteilungen, Körper, Waffen, geänderte Parameter) als Text. Kopieren, speichern, später wieder einfügen. Das Labor merkt sich den letzten Stand auch automatisch in diesem Browser.'));
 const ta=el('textarea',{style:'width:100%;height:110px;background:#30251b;color:#efe0b3;border:1px solid #806247;border-radius:6px;font:12px ui-monospace,monospace',placeholder:'Einstellungen hier einfügen …'});
 c.append(ta,el('div',{class:'row'},el('button',{onclick:()=>{ta.value=JSON.stringify(snapshot());ta.select();try{navigator.clipboard?.writeText(ta.value);}catch(e){}$('status').textContent='Exportiert (in Zwischenablage kopiert, falls erlaubt).';}},'Exportieren'),el('button',{onclick:()=>{try{const o=JSON.parse(ta.value);L=merge(LDEFAULT(),o.settings||{});L.defs=o.defs||{};M.tuneReset();const n=M.tuneImport(o.tune||{});applyDefs();save();renderAll();$('status').textContent='Importiert ('+n+' geänderte Parameter).';}catch(e){$('status').textContent='Import fehlgeschlagen: kein gültiger Text.';}}},'Importieren')));
 box.append(c);
}
function renderAll(){renderSetup();renderIO();renderFighters();renderBody();renderParams();renderSweep();renderResult();updateBadges();}
load();renderAll();
const h=(location.hash||'').slice(1);showTab(TABS.some(t=>t[0]===h)&&h!=='live'?h:'setup');
window.KampfLabor={get L(){return L;},buildConfig,runBatch,simulate,addFight,newAgg,keyNumbers,get last(){return lastR;}};
})();
