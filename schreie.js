'use strict';
// =====================================================================================================
// SCHREIE (window.Schrei) – Schmerz-, Todes-, Kampf- und Angstlaute. Im Kampf über audio.js (M.voice) und schrei-worker.js.
// Nutzt den Klangkern von stimme.js (Glottispuls + Formanten + Rauschzweige), aber direkt gesteuert statt über Text.
// Was Schreie menschlich und unterschiedlich macht (Forschung zu Schreien und nichtlinearer Stimme):
//  - Rauheit: Lautstärke-Schwankung im Bereich 30–150 Hz (Arnal u. a. 2015, „Rauheit“ macht einen Laut zum Alarm)
//  - Periodenverdopplung/Subharmonik (Brüllen, Knurren), chaotische Unruhe (Schmerz), Stimmbruch ins Falsett (Kiekser)
//  - gepresste Stimme (kurzer Öffnungsquotient, helle Quelle), weit offener Kiefer (F1 hoch), Hauch und Knarren
//  - Einsätze und Enden: Knacklaut, Hauch, Gaumen-Rasseln, Zischen; dazu Einatmen, Schluchzen, Gurgeln, Husten
// Jede Art ist ein kleines Rezept mit Zufall: jedes Abspielen klingt etwas anders. Figur (Stimmlage, Größe, Rauheit)
// und Stärke wirken auf alle Arten.
// =====================================================================================================
(()=>{
const W=typeof window!=='undefined'?window:self,St=W.Stimme,{Tracks,synth,finish,rng,clamp}=St.core,P=St.P,SR=St.SR;
const FIG={
 rekrut:{name:'Rekrut',f0:132,size:.97,rough:.05,breath:.08},
 veteran:{name:'Veteran',f0:108,size:1.04,rough:.2,breath:.06},
 huene:{name:'Hüne',f0:86,size:1.18,rough:.3,breath:.05},
 barbar:{name:'Barbar',f0:100,size:1.1,rough:.42,breath:.1},
 frau:{name:'Kämpferin',f0:215,size:.84,rough:.06,breath:.16},
 alter:{name:'Alter Mann',f0:126,size:1,rough:.24,breath:.3,shake:.45}
};
const VF=v=>Array.isArray(v)?v:(P[v]?.F||P['@'].F);
const VO=v=>typeof v==='string'?(P[v]?.o??.6):.6;
function lerp(pts,u){if(!pts)return 1;if(u<=pts[0][0])return pts[0][1];for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];if(u<=b[0])return a[1]+(b[1]-a[1])*(u-a[0])/Math.max(1e-6,b[0]-a[0]);}return pts[pts.length-1][1];}
const ENV=[[0,0],[.06,1],[.7,.85],[1,0]];

// ---------- Baukasten: sammelt Schritte, misst die Länge, spielt sie dann in die Steuerdaten ----------
function kit(C,I,r){
 const ops=[];let end=0;const G={C,I,r,ops,
  J:(x,p=.15)=>x*(1+(r()*2-1)*p),pick:a=>a[Math.floor(r()*a.length)],
  get end(){return end;},mark(t){end=Math.max(end,t);}};
 // Stimmhafter Laut mit Einsatz (on) und Ende (off). t = Beginn des Einsatzes, d = Dauer des Vokals.
 G.voc=o=>{const ON={h:.05,q:0,R:.11,m:.09,n:.09,k:.06,g:.04,t:.05,p:.05}[o.on]||0,OFF={h:.13,q:0,x:.14,f:.12,s:.12,S:.14,tS:.17,R:.15,pf:.16,n:.1}[o.off]||0;
  const t=o.t+ON,d=o.d;G.mark(t+d+OFF);
  ops.push(T=>{const eff=o.eff??.5,f1m=1+eff*.24,lvl=(o.lvl??1),I2=.6+.55*I;
   const vl=typeof o.v==='string'||(Array.isArray(o.v)&&typeof o.v[0]==='number')?[[0,o.v],[1,o.v]]:o.v.map((v,i,a)=>Array.isArray(v)&&typeof v[1]==='string'?v:[i/Math.max(1,a.length-1),v]);
   const nas=o.nas||0;
   for(const [u,v] of vl){const F=VF(v),tt=t+u*d,hiV=F[0]<400;T.key('F1',tt,F[0]*(hiV?1+eff*.1:f1m));T.key('F2',tt,F[1]);T.key('F3',tt,F[2]);T.key('F4',tt,F[3]||3500);T.key('MO',tt,nas>.8?0:Math.min(1,VO(v)*(1+eff*.3)));}
   // Tonhöhe und Lautstärke in 5-ms-Schritten (Vibrato, Zittern, Stimmbruch, Nässe)
   let dr=0,wn=0;const brk=o.brk;
   for(let x=0;x<=d+1e-9;x+=.005){const u=x/d;let m=lerp(o.f0||[[0,1],[1,1]],u);if(m>1)m=1+(m-1)*I2;
    if(o.vib)m*=1+o.vib[1]*Math.sin(2*Math.PI*o.vib[0]*x);dr+=(r()*2-1)*.006;dr*=.96;m*=1+dr*(.5+eff);
    if(brk){const a=brk.at,b=brk.at+(brk.len??1),e=.012/d;const w=u<a-e||u>b+e?0:u<a?(u-a+e)/e:u>b?1-(u-b)/e:1;m*=1+(brk.ratio-1)*clamp(w,0,1);}
    T.key('f0',t+x,C.f0*m);
    let a=lerp(o.a||ENV,u)*lvl;if(o.wet){wn+=((r()*2-1)-wn)*.35;a*=1-o.wet*.6*Math.max(0,wn+.3);}
    T.key('AV',t+x,o.whisper?0:a);T.key('AH',t+x,a*(o.br??0)*(o.whisper?1.2:1));}
   T.key('AV',t-.002,0);T.key('AV',t+d+.002,0);T.key('AH',t-.002,0);T.key('AH',t+d+.002,0);
   // Stimmqualität dieser Phase
   const q={OQ:o.oq??clamp(.62-.3*eff,.25,.8),TL:o.tl??clamp(.4+.55*eff,.1,1),SUB:(o.sub||0)*(.5+.6*I),CHA:(o.cha||0)*(.5+.6*I),AM:(o.am||0)*(.6+.5*I),AMF:o.amf||70,TR:o.tr||0,BIP:o.bip||0,BIPR:o.bipr||1.5,CR:o.cr||0,BR:o.brq||0,
    NZ:nas>0?270+nas*(o.nz??(nas>.8?1100:180)):270};
   for(const k in q){T.key(k,t,q[k]);T.key(k,t+d,q[k]);}
   if(brk){const a=t+brk.at*d,b=t+(brk.at+(brk.len??1))*d;T.key('OQ',a-.01,q.OQ);T.key('OQ',a+.01,.78);T.key('OQ',Math.min(b,t+d)-.01,.78);T.key('OQ',Math.min(b,t+d)+.01,q.OQ);T.key('TL',a-.01,q.TL);T.key('TL',a+.01,.22);T.key('TL',Math.min(b,t+d)-.01,.22);T.key('TL',Math.min(b,t+d)+.01,q.TL);}
   // Einsatz
   const F0=VF(vl[0][1]),F1=VF(vl[vl.length-1][1]);
   if(o.on==='h'){T.key('AH',t-ON,0);T.key('AH',t-ON*.6,.5*lvl);T.key('AH',t,.45*lvl);T.key('AH',t+.015,a0(o.br));}
   if(o.on==='q'){T.key('CR',t-.001,0);T.key('CR',t+.002,.9);T.key('CR',t+.03,q.CR);}
   if(o.on==='R'){const s=t-ON;T.key('AV',s,0);T.key('AV',s+.015,.55*lvl);T.key('AV',t-.002,.6*lvl);T.key('AM',s,0);T.key('AM',s+.01,.85);T.key('AM',t,.85);T.key('AM',t+.03,q.AM);T.key('AMF',s,27);T.key('AMF',t+.02,27);T.key('AMF',t+.06,q.AMF);
    T.fric(s,t,'R');T.key('AF',s,0);T.key('AF',s+.01,.25*lvl);T.key('AF',t,.18*lvl);T.key('AF',t+.01,0);T.key('F1',s,520);T.key('F2',s,1250);T.key('F3',s,2300);for(let x=s;x<t;x+=.005)T.key('f0',x,C.f0*lerp(o.f0,0)*.9);}
   if(o.on==='m'||o.on==='n'){const s=t-ON,N=P[o.on];T.key('AV',s,0);T.key('AV',s+.02,.35*lvl);T.key('AV',t-.002,.4*lvl);T.key('NZ',s,N.nz);T.key('NZ',t-.005,N.nz);T.key('NZ',t+.02,q.NZ);T.key('F1',s,250);T.key('F2',s,N.F[1]);T.key('MO',s,0);for(let x=s;x<t;x+=.005)T.key('f0',x,C.f0*lerp(o.f0,0)*.92);}
   if('kgtp'.includes(o.on||'#')){const s=t-ON,Q=P[o.on];T.fric(t-ON*.25,t-ON*.25+.012,Q.fs,o.on==='k'||o.on==='g'?clamp(F0[1]/1900,.7,1.3):1);const tb=t-ON*.25;T.key('AF',tb-.001,0);T.key('AF',tb,Q.ba*lvl);T.key('AF',tb+.01,0);
    if(!Q.vc){T.key('AH',tb+.008,.5*lvl);T.key('AH',t,.4*lvl);T.key('AH',t+.01,a0(o.br));}T.key('MO',s,0);}
   // Ende
   const te=t+d;
   if(o.off==='h'){T.key('AH',te-.01,.35*lvl);T.key('AH',te+OFF,0);}
   if(o.off==='q'){T.key('AV',te-.006,lerp(o.a||ENV,.97)*lvl);T.key('AV',te,0);T.key('CR',te-.02,.7);T.key('CR',te+.01,0);}
   if(o.off==='x'){T.fric(te-.02,te+OFF,'rasp');T.key('AF',te-.03,0);T.key('AF',te,.3*lvl);T.key('AF',te+OFF,0);T.key('AM',te,.7);T.key('AMF',te,32);T.key('AH',te,.2*lvl);T.key('AH',te+OFF,0);}
   if(o.off==='R'){T.fric(te-.02,te+OFF,'R');T.key('AV',te,.5*lvl);T.key('AV',te+OFF*.8,.3*lvl);T.key('AV',te+OFF,0);T.key('AM',te-.01,q.AM);T.key('AM',te+.01,.9);T.key('AMF',te,28);T.key('AF',te,.12*lvl);T.key('AF',te+OFF,0);
    T.key('F1',te+.02,500);T.key('F2',te+.02,1250);for(let x=te;x<te+OFF;x+=.005)T.key('f0',x,C.f0*lerp(o.f0,1)*.92);}
   if(['f','s','S'].includes(o.off)){T.fric(te-.01,te+OFF,o.off);T.key('AF',te-.01,0);T.key('AF',te+.02,P[o.off].af*lvl*1.2);T.key('AF',te+OFF,0);}
   if(o.off==='tS'){const c=te+.04;T.fric(c,c+.13,'S');T.key('AF',c-.001,0);T.key('AF',c,.7*lvl);T.key('AF',c+.1,.55*lvl);T.key('AF',c+.13,0);T.key('MO',te+.01,.15);}
   if(o.off==='pf'){const c=te+.03;T.fric(c,c+.13,'f');T.key('AF',c-.001,0);T.key('AF',c,.5*lvl);T.key('AF',c+.12,.15*lvl);T.key('AF',c+.13,0);T.key('MO',te,0);}
   if(o.off==='n'){T.key('NZ',te,1700);T.key('AV',te,.35*lvl);T.key('AV',te+OFF,0);T.key('F1',te+.01,250);T.key('F2',te+.01,1600);}
   function a0(b){return lerp(o.a||ENV,.05)*lvl*(b??0);}
  });};
 // Atemzug: ein = Einatmen (pfeifend, steigend), sonst Ausatmen (durch den Vokal geformt); voiced = Stimmanteil (Schluchzen, Japsen)
 G.breath=o=>{const t=o.t,d=o.d;G.mark(t+d);ops.push(T=>{const F=VF(o.v||(o.in?'i:':'a')),lvl=o.lvl??.4;
  for(const k of ['F1','F2','F3','F4'])T.key(k,t,F['F1F2F3F4'.indexOf(k)/2]);
  T.key('MO',t,o.in?.35:.6);
  if(o.in){T.fric(t,t+d,o.shape||'ein');T.key('AF',t,0);T.key('AF',t+d*.75,lvl*.55);T.key('AF',t+d,0);T.key('AH',t,0);T.key('AH',t+d*.75,lvl*.35);T.key('AH',t+d,0);}
  else{T.key('AH',t,0);T.key('AH',t+.02,lvl);T.key('AH',t+d,0);}
  if(o.voiced){const f=C.f0*(o.f0m||2);for(let x=0;x<=d;x+=.005){const u=x/d;T.key('f0',t+x,f*(o.in?1+.15*u:1-.2*u));}
   T.key('AV',t,0);T.key('AV',t+d*(o.in?.6:.15),o.voiced*lvl);T.key('AV',t+d,0);T.key('OQ',t,.7);T.key('TL',t,.35);T.key('CHA',t,.25);T.key('OQ',t+d,.7);T.key('TL',t+d,.35);}
  else{T.key('AV',t,0);T.key('AV',t+d,0);}});};
 // Gurgeln: Blasen (kurze, tiefe Klickser) mit zufälligem Abstand
 G.gurgle=o=>{G.mark(o.t+o.d);ops.push(T=>{let x=o.t;while(x<o.t+o.d){const fc=.7+r()*.8,l=(o.lvl??.4)*(.4+r()*.6);T.fric(x,x+.016,'blub',fc);T.key('AF',x-.001,0);T.key('AF',x+.002,l);T.key('AF',x+.012,0);x+=1/(o.rate||20)*(.4+r()*1.2);}});};
 // Husten: Verschluss, explosiver Hauch, rauer Stimmstoß
 G.cough=o=>{const t=o.t,l=o.lvl??1;G.mark(t+.26);ops.push(T=>{const F=VF(o.v||'@');for(const [k,i] of [['F1',0],['F2',1],['F3',2]])T.key(k,t,F[i]*(i===0?1.15:1));T.key('MO',t,.7);
  T.key('AV',t-.03,0);T.key('AH',t-.03,0);T.key('CR',t-.005,.9);T.key('CR',t+.02,.3);T.fric(t,t+.03,'h');T.key('AF',t-.001,0);T.key('AF',t,.6*l);T.key('AF',t+.03,0);
  T.key('AH',t+.002,.95*l);T.key('AH',t+.05,.5*l);T.key('AH',t+.2,0);T.key('AV',t+.01,0);T.key('AV',t+.03,.7*l);T.key('AV',t+.09,.4*l);T.key('AV',t+.13,0);
  for(let x=0;x<.14;x+=.005)T.key('f0',t+x,C.f0*(1.4-x*2));T.key('CHA',t,.55);T.key('CHA',t+.14,.55);T.key('OQ',t,.4);T.key('TL',t,.8);T.key('OQ',t+.14,.4);T.key('TL',t+.14,.8);
  if(o.wet){G.gurgleNow(T,t+.04,.16,30,.35);}});};
 G.gurgleNow=(T,t0,d,rate,lvl)=>{let x=t0;while(x<t0+d){const fc=.7+r()*.8;T.fric(x,x+.016,'blub',fc);T.key('AF',x-.001,0);T.key('AF',x+.002,lvl*(.4+r()*.6));T.key('AF',x+.012,0);x+=1/rate*(.4+r()*1.2);}};
 // Lippenknall (p) für Schnauben
 G.pop=o=>{G.mark(o.t+.03);ops.push(T=>{T.fric(o.t,o.t+.02,'p');T.key('AF',o.t-.001,0);T.key('AF',o.t,.8*(o.lvl??1));T.key('AF',o.t+.015,0);T.key('MO',o.t-.02,0);});};
 G.fricN=o=>{G.mark(o.t+o.d);ops.push(T=>{T.fric(o.t,o.t+o.d,o.shape);T.key('AF',o.t,0);T.key('AF',o.t+o.d*.2,o.lvl);T.key('AF',o.t+o.d*.8,o.lvl*.7);T.key('AF',o.t+o.d,0);T.key('MO',o.t,o.mo??.2);});};
 return G;}

// ---------- Katalog ----------
const CATS=[['treffer','Treffer'],['wunde','Schwer verwundet'],['tod','Sterben'],['angriff','Angriff & Kraft'],['angst','Angst & Verzweiflung'],['atem','Atem & Erschöpfung'],['spott','Lachen & Spott'],['rufe','Rufe (gesprochen)']];
const L=[];const def=(id,cat,name,hint,fn,post={})=>L.push({id,cat,name,hint,fn,post});
const SHORT=[[0,0],[.08,1],[.5,.75],[1,0]];
// Treffer
def('uff','treffer','„Uff“','Stoß in den Bauch, Luft wird herausgedrückt',G=>G.voc({t:0,on:'h',d:G.J(.12),v:['U','@'],f0:[[0,1.3],[.25,1.36],[1,.95]],a:SHORT,eff:.55,br:.35,off:'f'}));
def('ugh','treffer','„Ugh“','Kurzer, kehliger Treffer',G=>G.voc({t:0,on:'q',d:G.J(.16),v:['@','U'],f0:[[0,1.2],[.3,1.26],[1,.85]],a:SHORT,eff:.6,sub:.25,cha:.12,off:'x'}));
def('agh','treffer','„Agh!“','Scharfer Schmerz, abrupt abgebrochen',G=>G.voc({t:0,on:'q',d:G.J(.2),v:['a','a','@'],f0:[[0,1.6],[.2,1.86],[1,1.15]],eff:.85,sub:.15,cha:.1,off:'q'}),{drive:1.6});
def('au','treffer','„Au!“','Klassisch deutsch, steigt und fällt',G=>G.voc({t:0,on:'q',d:G.J(.27),v:[[0,'a'],[.55,'a'],[1,'u:']],f0:[[0,1.7],[.3,2.05],[1,1.25]],eff:.7,cha:.06}));
def('autsch','treffer','„Autsch!“','Mit tsch am Ende',G=>G.voc({t:0,on:'q',d:G.J(.17),v:[[0,'a'],[.6,'a'],[1,'U']],f0:[[0,1.7],[.35,1.92],[1,1.4]],eff:.65,off:'tS'}));
def('hngh','treffer','„Hngh“','Zähne zusammengebissen, Laut durch die Nase',G=>G.voc({t:0,d:G.J(.32),v:'m',nas:1,f0:[[0,.95],[.5,1.22],[1,1.05]],a:[[0,0],[.15,.8],[.8,1],[1,0]],eff:.9,cha:.3,lvl:.8,off:'h'}));
def('zisch','treffer','Zischen','Luft scharf durch die Zähne, dann gepresstes Ausatmen',G=>{G.breath({t:0,d:G.J(.32),in:true,shape:'zisch',lvl:.55});G.voc({t:.36,on:'h',d:G.J(.24),v:['a','@'],f0:[[0,1.3],[1,1]],a:SHORT,eff:.3,br:.6,tr:.7,lvl:.5});});
def('aechz','treffer','Ächzen','Tief, knarrend, mühsam',G=>G.voc({t:0,on:'q',d:G.J(.45),v:['E','@'],f0:[[0,.92],[.4,1],[1,.75]],eff:.4,br:.3,cha:.15,cr:.5,sub:.2}));
// Schwer verwundet
def('aargh','wunde','„Aaargh!“','Langer, rauer Schmerzschrei mit Kehlrasseln',G=>G.voc({t:0,on:'q',d:G.J(.85),v:[[0,'a'],[.7,'a'],[1,'@']],f0:[[0,1.5],[.15,2.2],[.5,2.0],[1,1.35]],eff:1,sub:.35,cha:.18,am:.3,amf:G.J(70),vib:[5.5,.015],off:'x'}),{drive:2.2});
def('kiekser','wunde','Schrei mit Kiekser','Stimme bricht ins Falsett und zurück',G=>G.voc({t:0,on:'h',d:G.J(.85),v:['a','E','E'],f0:[[0,2.1],[.3,2.6],[1,1.9]],brk:{at:G.J(.35),ratio:G.J(1.55,.08),len:G.J(.3)},eff:.9,cha:.08,vib:[6,.02]}),{drive:1.8});
def('bruell','wunde','Schmerzgebrüll','Tief, Periodenverdopplung (Subharmonik), wie ein Tier',G=>G.voc({t:0,on:'R',d:G.J(.9),v:['O','a','a','@'],f0:[[0,1.25],[.3,1.65],[1,1.2]],eff:1,sub:.7,am:.45,amf:G.J(34),cha:.2}),{drive:2.6});
def('weinen','wunde','Schrei mit Weinen','Schreit, schluchzt, wimmert',G=>{G.voc({t:0,on:'q',d:G.J(.6),v:['a','E'],f0:[[0,2.2],[.25,2.6],[1,1.8]],eff:.9,vib:[6.5,.025],cha:.1});let t=G.end+.12;const n=2+Math.floor(G.r()*2);
 for(let k=0;k<n;k++){G.breath({t,d:G.J(.13),in:true,voiced:.6,f0m:2.4,v:'i:',lvl:.5});t+=G.J(.3);}G.voc({t,on:'h',d:G.J(.5),v:['U','u:'],nas:.4,f0:[[0,2.2],[1,1.6]],eff:.3,br:.5,tr:.8,lvl:.45});});
def('stoss','wunde','„Ah! Ah! Aaah!“','Stoßweise, jedes Mal höher und länger',G=>{let t=0;[[.16,1.8],[.2,2.0],[.55,2.4]].forEach(([d,p],k)=>{G.voc({t,on:'q',d:G.J(d,.1),v:k<2?'a':['a','a','@'],f0:[[0,p*.85],[.25,p],[1,p*.75]],eff:.9,cha:.08+k*.05,off:k<2?'q':'h'});t+=d+G.J(.12);});},{drive:1.8});
def('verbissen','wunde','Verbissen – dann bricht es heraus','Erst mit geschlossenem Mund, dann offener Schrei',G=>{G.voc({t:0,d:G.J(.35),v:'m',nas:1,f0:[[0,1],[1,1.3]],a:[[0,0],[.2,.6],[1,1]],eff:1,cha:.35,lvl:.6});G.voc({t:G.end-.01,d:G.J(.65),v:['a','a','@'],f0:[[0,1.9],[.2,2.4],[1,1.6]],eff:1,sub:.25,cha:.15});},{drive:2});
def('heulen','wunde','Heulen','Langes Klagen in Wellen',G=>G.voc({t:0,on:'h',d:G.J(1.4),v:['U','O','a','a','O','U'],f0:[[0,1.6],[.3,2.2],[.5,1.9],[.7,2.1],[1,1.4]],eff:.6,vib:[5.8,.03],br:.15,tr:.3}),{room:.25});
// Sterben
def('tod','tod','Todesschrei','Gellt auf, bricht ein, der letzte Atem entweicht',G=>{G.voc({t:0,on:'q',d:G.J(1.1),v:['a','a','a','@','@'],f0:[[0,2.0],[.2,2.5],[.5,2.1],[.8,1.2],[1,.75]],a:[[0,0],[.04,1],[.45,.9],[.8,.4],[1,0]],eff:1,sub:.25,cha:.2,br:.25,cr:.15,off:'h'});G.breath({t:G.end-.05,d:.5,v:'@',lvl:.22});},{drive:2,room:.2});
def('roecheln','tod','Röcheln','Blut im Hals: nasses Gurgeln',G=>{const d=G.J(1.3);G.voc({t:0,d,v:['@','O','@'],f0:[[0,.85],[.5,.8],[1,.65]],a:[[0,0],[.1,.7],[.8,.6],[1,0]],eff:.4,cha:.5,sub:.4,wet:.9,cr:.3,br:.3,lvl:.6});G.gurgle({t:.05,d:d-.1,rate:G.J(22),lvl:.5});});
def('atemzug','tod','Letzter Atemzug','Einatmen, dann langer, knarrender Seufzer',G=>{G.breath({t:0,d:G.J(.38),in:true,lvl:.45,v:'a'});G.voc({t:.55,on:'h',d:G.J(1.0),v:['@','@'],f0:[[0,.9],[1,.6]],a:[[0,0],[.1,.6],[.6,.4],[1,0]],eff:.2,br:.9,cr:.7,lvl:.45});});
def('erstickt','tod','Erstickter Schrei','Wird abgewürgt, dann nur noch Würgen',G=>{G.voc({t:0,on:'q',d:G.J(.28),v:['a','a'],f0:[[0,2],[.5,2.4],[1,2.3]],eff:1,off:'q',cha:.1});const t=G.end+.12;G.voc({t,d:G.J(.38),v:['@'],f0:[[0,1.3],[1,1]],eff:1,cr:.9,cha:.5,lvl:.4,a:[[0,0],[.2,1],[.45,.25],[.65,.8],[1,0]]});G.gurgle({t:t+.03,d:.3,rate:30,lvl:.35});});
def('sturz','tod','Sturz in die Tiefe','Langer Schrei, der in der Ferne verschwindet',G=>G.voc({t:0,on:'q',d:G.J(1.9),v:['a','a','a','@'],f0:[[0,2.3],[.12,2.5],[1,1.25]],a:[[0,0],[.03,1],[.35,.75],[.75,.25],[1,0]],eff:.9,vib:[6,.02],cha:.08}),{room:.55,roomSize:1.3});
// Angriff & Kraft
def('hah','angriff','„Hah!“','Kurzer Schlagruf beim Zuschlagen',G=>G.voc({t:0,on:'h',d:G.J(.13),v:'a',f0:[[0,1.5],[.3,1.56],[1,1.2]],a:SHORT,eff:.9,off:'q'}),{drive:1.6});
def('hyah','angriff','„Hyah!“','Ausfallschritt mit Stich',G=>G.voc({t:0,on:'h',d:G.J(.25),v:[[0,'i:'],[.25,'a'],[1,'a']],f0:[[0,1.5],[.4,2.0],[1,1.5]],eff:.85,off:'q'}),{drive:1.6});
def('kraft','angriff','Kraftakt','Pressen mit aller Kraft, dann Luft raus',G=>{G.voc({t:0,on:'q',d:G.J(.75),v:'@',nas:.6,f0:[[0,.95],[.8,1.3],[1,1.35]],a:[[0,0],[.1,.5],[.85,1],[1,0]],eff:1,cha:.35,cr:.25,lvl:.7});G.voc({t:G.end+.04,on:'h',d:G.J(.18),v:['a','@'],f0:[[0,1.4],[1,1]],a:SHORT,eff:.4,br:.6,off:'h'});});
def('wut','angriff','Wutgebrüll „Rrraah!“','Rollendes R, dann Gebrüll mit Knurren',G=>G.voc({t:0,on:'R',d:G.J(.75),v:['a','a','@'],f0:[[0,1.2],[.4,1.75],[1,1.3]],eff:1,sub:.5,am:.35,amf:G.J(30),cha:.15}),{drive:2.6});
def('kampf','angriff','Kampfschrei „Hooorr!“','Ansturm, lang gehalten, R am Ende',G=>G.voc({t:0,on:'h',d:G.J(1.0),v:['o:','o:','O'],f0:[[0,1.2],[.25,1.6],[.85,1.65],[1,1.4]],eff:.9,vib:[5,.015],sub:.15,off:'R'}),{drive:2,room:.2});
def('knurr','angriff','Knurren','Drohend, tief, mit geschlossenem Mund',G=>G.voc({t:0,d:G.J(1.0),v:['U','O','U'],nas:.3,f0:[[0,.55],[.5,.62],[1,.5]],a:[[0,0],[.25,.8],[.75,1],[1,0]],eff:.7,sub:.8,am:.6,amf:G.J(26),cha:.2,lvl:.7}));
def('sieg','angriff','Siegesschrei','Gegner liegt: „Haaa – ha!“',G=>{G.voc({t:0,on:'h',d:G.J(.7),v:'a',f0:[[0,1.6],[.6,2.3],[1,2.1]],eff:.85,vib:[5.5,.02]});G.voc({t:G.end+.12,on:'h',d:.2,v:'a',f0:[[0,1.9],[1,1.5]],a:SHORT,eff:.6,off:'q'});},{room:.25});
// Angst & Verzweiflung
def('angst','angst','Angstschrei','Schrill, zitternd, dann Luft holen',G=>{G.voc({t:0,on:'q',d:G.J(.8),v:['i:','E','E'],f0:[[0,2.8],[.2,3.3],[1,2.9]],eff:.8,vib:[7,.045],br:.25,tr:.5});G.breath({t:G.end+.08,d:.25,in:true,voiced:.5,f0m:3,v:'i:',lvl:.4});},{drive:1.8});
def('panik','angst','Panik','Japsen, japsen – dann Schrei',G=>{let t=0;for(let k=0;k<3;k++){G.breath({t,d:G.J(.13),in:true,voiced:.4,f0m:2.6,lvl:.45});t+=G.J(.22);}G.voc({t:t+.05,d:G.J(.6),v:['a','E'],f0:[[0,2.5],[.3,3],[1,2.4]],eff:.9,vib:[7,.04],tr:.4});});
def('wimmern','angst','Wimmern','Leise, durch die Nase, bebend',G=>{let t=0;for(let k=0;k<3;k++){G.voc({t,d:G.J(.3+.1*k),v:['U','i:'],nas:.7,f0:[[0,2.2-.15*k],[.3,2.3-.15*k],[1,1.8-.1*k]],a:SHORT,eff:.3,br:.5,tr:.8,lvl:.4});t=G.end+G.J(.15);}});
def('schluchz','angst','Schluchzen','Ruckartiges Einatmen, weinendes Ausatmen',G=>{let t=0;const n=3+Math.floor(G.r()*2);for(let k=0;k<n;k++){G.breath({t,d:G.J(.12),in:true,voiced:.55,f0m:G.J(2.6,.1),v:'i:',lvl:.5});t+=G.J(.24,.3);}G.voc({t:t+.05,on:'h',d:G.J(.6),v:['a','U'],f0:[[0,2.2],[1,1.5]],eff:.4,br:.5,tr:.9,lvl:.6});});
// Atem & Erschöpfung
def('keuchen','atem','Keuchen','Außer Atem nach dem Kampf',G=>{let t=0;for(let k=0;k<3;k++){G.breath({t,d:G.J(.16),v:'a',lvl:.55,voiced:.12,f0m:1.2});G.breath({t:t+G.J(.2),d:G.J(.18),in:true,lvl:.4});t+=G.J(.44);}});
def('atmen','atem','Schweres Atmen','Langsam, tief, einmal mit Stöhnen',G=>{G.breath({t:0,d:G.J(.45),in:true,lvl:.35,v:'a'});G.breath({t:.55,d:G.J(.55),v:'a',lvl:.45});G.breath({t:1.2,d:G.J(.45),in:true,lvl:.35,v:'a'});G.voc({t:1.75,on:'h',d:G.J(.6),v:['@','@'],f0:[[0,1],[1,.8]],a:[[0,0],[.15,.6],[.6,.5],[1,0]],eff:.3,br:.7,cr:.3,lvl:.5});});
def('husten','atem','Husten','Zwei, drei harte Huster',G=>{const n=2+Math.floor(G.r()*2);let t=.03;for(let k=0;k<n;k++){G.cough({t,lvl:1-k*.15,v:G.pick(['@','a','E'])});t+=G.J(.27);}});
def('bluthusten','atem','Blut husten','Nasse Huster mit Gurgeln',G=>{let t=.03;for(let k=0;k<3;k++){G.cough({t,lvl:.9-k*.15,v:'@',wet:1});t+=G.J(.3);}G.voc({t,d:.4,v:'@',f0:[[0,.8],[1,.7]],eff:.3,wet:.9,cha:.5,cr:.4,lvl:.4});G.gurgle({t,d:.38,rate:24,lvl:.45});});
// Lachen & Spott
def('lachen','spott','Hämisches Lachen','„Ha-ha-ha-ha!“ – fällt ab',G=>{const n=4+Math.floor(G.r()*3);let t=0;for(let k=0;k<n;k++){const p=1.75-.08*k;G.voc({t,on:'h',d:G.J(.09),v:'a',f0:[[0,p],[.4,p*1.04],[1,p*.92]],a:SHORT,eff:.6,br:.15,lvl:1-k*.06});t+=G.J(.19,.08);}G.breath({t:t+.05,d:.22,in:true,lvl:.3});});
def('kichern','spott','Kichern','Hoch und durch die Nase: „Hihihi“',G=>{let t=0;for(let k=0;k<6;k++){const p=2.3-.05*k;G.voc({t,on:'h',d:G.J(.06),v:'I',nas:.3,f0:[[0,p],[1,p*.95]],a:SHORT,eff:.4,br:.4,lvl:.6});t+=G.J(.13,.1);}});
def('schnauben','spott','Verächtliches Schnauben','„Pfff“ – und ein kurzes „Hm“',G=>{G.pop({t:0});G.fricN({t:.005,d:G.J(.3),shape:'f',lvl:.35,mo:.1});G.voc({t:.38,d:.14,v:'m',nas:1,f0:[[0,1.15],[1,.9]],a:SHORT,eff:.4,lvl:.5});});
def('grunzen','spott','Grunzen „Hmpf“','Abfällig, durch die Nase',G=>G.voc({t:0,d:G.J(.18),v:'m',nas:1,f0:[[0,1],[1,.85]],a:SHORT,eff:.6,cha:.25,lvl:.6,off:'pf'}));
// Gesprochene Rufe über die neue Sprachausgabe
const RUFE=[['nein','„Nein!“','Nein! Nein!','schrei'],['gnade','„Gnade!“','Gnade! Bitte, Gnade!','flehen'],['stirb','„Stirb!“','Stirb!','wut'],['rom','„Für Rom!“','Für Rom!','schrei'],
 ['hilfe','„Hilfe!“','Hilfe! Hilfe!','angst'],['zurueck','„Zurück!“','Zurück! Alle zurück!','ruf'],['angriff','„Angriff!“','Angriff!','schrei'],['bitte','„Bitte nicht …“','Bitte … nicht.','erschoepft']];
for(const [id,name,text,style] of RUFE)def('ruf_'+id,'rufe',name,'Gesprochen mit der neuen Stimme, Sprechweise „'+St.STYLES[style].name+'“',null,{text,style});

// ---------- Rendern ----------
function render(id,o={}){const E=L.find(x=>x.id===id);if(!E)throw new Error('Unbekannter Schrei '+id);
 const C={...(o.figure||FIG[o.fig||'rekrut']||FIG.rekrut)},I=clamp(o.intensity??.75,0,1),seed=o.seed??Math.floor(Math.random()*1e9),r=rng(seed);
 if(o.pitch)C.f0*=o.pitch;
 if(E.post.text){const v={pitch:C.f0,size:C.size,range:10,speed:1,rough:C.rough,breath:C.breath,shake:C.shake||0,oq:.55,tilt:.6,creak:.1};const R=St.render(E.post.text,v,{style:E.post.style,seed,room:o.room??.12,retro:o.retro});return {...R,id,seed};}
 const G=kit(C,I,r);E.fn(G);const dur=G.end+.25,T=new Tracks(dur);for(const op of G.ops)op(T);
 const TT=T.build({f0:.006,CR:.004,AM:.008,AMF:.01});
 const raw=synth(TT,{size:C.size*(E.post.size||1),breath:C.breath,rough:C.rough,shake:C.shake||0},r);
 const data=finish(raw,{drive:(E.post.drive||1.2)*(.75+.35*I),room:o.room??E.post.room??.12,roomSize:o.roomSize||E.post.roomSize||1,retro:o.retro});
 const mouth=[];for(let t=0;t<dur;t+=.02){const i=Math.min(TT.n-1,Math.round(t/St.FR));mouth.push({t,o:TT.MO[i]*((TT.AV[i]+TT.AF[i]+TT.AH[i])>.05?1:.3)});}
 const f0=[];for(let i=0;i<TT.n;i+=10)f0.push(TT.AV[i]>.12?TT.f0[i]:0);
 return {data,sr:SR,dur:data.length/SR,mouth,id,seed,info:{f0,f0step:St.FR*10}};}
// ---------- Publikum: Sprechchor mit dem Namen und gemeinsames Klatschen ----------
// Chor: viele verschiedene Stimmen (Männer und einige Frauen, Lage, Größe, Rauheit gemischt) rufen den Namen mit der
// Sprachausgabe, jede etwas versetzt (bis 70 ms) – so klingt es wie eine Menge, nicht wie ein Echo. len = Ende des Rufs ohne Hall.
function chant(name,o={}){const r=rng(o.seed??Math.floor(Math.random()*1e9)),N=o.voices||14,txt=String(name||'').replace(/[^A-Za-zÄÖÜäöüß ]/g,'')+'!',parts=[];let n=0;
 for(let k=0;k<N;k++){const fem=r()<.2,v={pitch:fem?188+r()*45:90+r()*58,size:fem?.84+r()*.06:.95+r()*.2,range:8+r()*5,speed:.9+r()*.18,rough:.08+r()*.3,breath:.08+r()*.15,oq:.5,tilt:.6,creak:0,breathIn:0};
  const R=St.render(txt,v,{style:o.wild?(r()<.7?'schrei':'ruf'):(r()<.35?'schrei':'ruf'),seed:Math.floor(r()*1e9),room:0}),off=Math.floor(r()*.07*SR);let e=R.data.length;while(e>1&&Math.abs(R.data[e-1])<.01)e--;
  parts.push({d:R.data.subarray(0,e),off,g:.55+r()*.45});n=Math.max(n,off+e);}
 const dry=new Float32Array(n);for(const P of parts)for(let i=0;i<P.d.length;i++)dry[P.off+i]+=P.d[i]*P.g;
 let pk=0;for(let i=0;i<n;i++)pk=Math.max(pk,Math.abs(dry[i]));let e=n;while(e>1&&Math.abs(dry[e-1])<pk*.04)e--;
 const data=finish(dry,{drive:1.3,room:o.room??.38,roomSize:1.25});return {data,sr:SR,dur:data.length/SR,len:e/SR};}
// Klatschen: viele Hände zugleich, jede ein kurzer gefilterter Rauschstoß, Zeitstreuung wie bei Menschen (± 15 ms)
function claps(o={}){const r=rng(o.seed??Math.floor(Math.random()*1e9)),n=o.people||45,len=Math.floor(.32*SR),x=new Float32Array(len);
 for(let p=0;p<n;p++){const g=(r()+r()+r()-1.5)*.02,t0=Math.floor(Math.max(0,.025+g)*SR),fc=850+r()*1900,q=1+r()*1.4,dec=(.005+r()*.011)*SR,amp=.4+r()*.6;
  const w=2*Math.PI*fc/SR,al=Math.sin(w)/(2*q),a0=1+al,b0=al/a0,b2=-al/a0,a1=-2*Math.cos(w)/a0,a2=(1-al)/a0;let x1=0,x2=0,y1=0,y2=0;
  for(let i=0;i<dec*7&&t0+i<len;i++){const v=(r()*2-1)*Math.exp(-i/dec)*amp,y=b0*v+b2*x2-a1*y1-a2*y2;x2=x1;x1=v;y2=y1;y1=y;x[t0+i]+=y;}}
 const data=finish(x,{drive:1.2,room:o.room??.22,roomSize:.9});return {data,sr:SR,dur:data.length/SR};}
W.Schrei={FIG,CATS,LIST:L,render,chant,claps};
})();
