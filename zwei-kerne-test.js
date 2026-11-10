'use strict';
// ZWEI-KERNE-TEST (zwei-kerne-test.html): Probe, ob sich Zeichnen auf einem zweiten Kern (Web Worker) lohnt.
// Misst nur, wie teuer es ist, den Kampf bei jedem Bild an einen Worker zu schicken. Zeichnet nichts,
// ändert nichts am Spiel (eigener Benchmarkkampf, Speichern abgeschaltet).
(()=>{
const M=window.MG,S=M.s,$=id=>document.getElementById(id);
const SIZES=[5,10,20,50],WARM=1000,PHASE=3500;
const src='onmessage=e=>{postMessage(e.data&&e.data.t);};';
let worker=null;try{worker=new Worker(URL.createObjectURL(new Blob([src],{type:'text/javascript'})));}catch(e){}
const results=[];

function startFight(n){
 if(S.battle){try{M.endBenchmark(-1,'Zwei-Kerne-Test');}catch(e){}S.battle=null;}
 const err=M.startBenchmark({count:n,count0:n,count1:n,role0:'mixed',role1:'mixed',weapon0:'class',weapon1:'class',shield0:'auto',shield1:'auto',armor0:'auto',armor1:'auto',quality0:2,quality1:2,seed:4711,league:0});
 if(err)throw new Error(err);S.options.speed=1;
}
// Schlank: Akteure ohne Gladiator-Daten, dazu Blut/Tod; Körper (Wunden) nur jedes 6. Bild
function slim(frame){
 const b=S.battle,acts=b.actors.map(a=>{const o={};for(const k in a)if(k!=='g')o[k]=a[k];o.gBlood=a.g.blood;o.gDead=a.g.dead;if(frame%6===0)o.gBody=a.g.body;return o;});
 const rest={};for(const k in b)if(k!=='actors')rest[k]=b[k];return {acts,rest};
}
function run(n,mode){
 return new Promise(res=>{
  let frame=0,t0=performance.now(),logic=0,send=0,rt=0,rtN=0,cnt=0,fail='',pend=0;
  if(worker)worker.onmessage=e=>{if(typeof e.data==='number'){rt+=performance.now()-e.data;rtN++;}pend--;};
  const step=()=>{
   const now=performance.now(),warm=now-t0<WARM;
   if(now-t0>WARM+PHASE||!S.battle||S.battle.result){res({logic:cnt?logic/cnt:0,send:cnt?send/cnt:0,rt:rtN?rt/rtN:0,fail,frames:cnt});return;}
   let a=performance.now();try{M.fixedStep(1/60);}catch(e){}const l=performance.now()-a;
   if(mode&&!fail&&worker&&pend<3){
    a=performance.now();
    try{const msg=mode==='full'?{t:a,b:S.battle}:{t:a,s:slim(frame)};worker.postMessage(msg);pend++;}catch(e){fail=e.name==='DataCloneError'?'lässt sich nicht kopieren':String(e.message||e).slice(0,60);}
    const s=performance.now()-a;if(!warm){send+=s;}
   }
   if(!warm){logic+=l;cnt++;}
   frame++;requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
 });
}
const f=x=>x.toFixed(2).replace('.',',');
const cls=ms=>ms<1?'ok':ms<3?'mid':'bad';
function render(){
 $('res').innerHTML='<tr><th>je Seite</th><th>Rechnen je Bild</th><th>Ganz schicken</th><th>Ganz hin+zurück</th><th>Schlank schicken</th><th>Schlank hin+zurück</th></tr>'+
  results.map(r=>`<tr><td>${r.n}</td><td>${f(r.logic)} ms</td>${r.full.fail?`<td colspan=2 class=bad>${r.full.fail}</td>`:`<td class=${cls(r.full.send)}>${f(r.full.send)} ms</td><td>${f(r.full.rt)} ms</td>`}${r.slim.fail?`<td colspan=2 class=bad>${r.slim.fail}</td>`:`<td class=${cls(r.slim.send)}>${f(r.slim.send)} ms</td><td>${f(r.slim.rt)} ms</td>`}</tr>`).join('');
}
function verdict(){
 const r=results.find(x=>x.n===10)||results[0];if(!r)return '';
 if(r.slim.fail)return 'Schlank schicken ging nicht: '+r.slim.fail+'.';
 return r.slim.send<1.5?`Bei 10 gegen 10 kostet das Schicken ${f(r.slim.send)} ms je Bild. Das ist billig, der Umbau auf zwei Kerne ist machbar.`:`Bei 10 gegen 10 kostet das Schicken ${f(r.slim.send)} ms je Bild, fast so viel wie das Rechnen selbst. Der Umbau lohnt sich auf diesem Gerät kaum.`;
}
function text(){
 return `Zwei-Kerne-Test, Stand ${window.ARENA_BUILD||'029f6cb4'}\nGerät: ${innerWidth}×${innerHeight} px, Pixeldichte ${devicePixelRatio||1}, ${navigator.hardwareConcurrency||'?'} Kerne\n`+
  results.map(r=>`${r.n} je Seite: Rechnen ${f(r.logic)} ms | ganz ${r.full.fail||f(r.full.send)+' ms (hin+zurück '+f(r.full.rt)+')'} | schlank ${r.slim.fail||f(r.slim.send)+' ms (hin+zurück '+f(r.slim.rt)+')'}`).join('\n')+'\n'+verdict();
}
$('go').onclick=async()=>{
 if(!worker){$('prog').textContent='Dieses Gerät kann keinen zweiten Kern (Web Worker) starten.';return;}
 $('go').disabled=true;$('copy').disabled=true;results.length=0;render();
 try{
  for(const n of SIZES){
   const r={n};
   $('prog').textContent=`${n} gegen ${n}: ganz schicken …`;startFight(n);r.full=await run(n,'full');
   $('prog').textContent=`${n} gegen ${n}: schlank schicken …`;startFight(n);r.slim=await run(n,'slim');
   r.logic=(r.full.logic+r.slim.logic)/2;results.push(r);render();
  }
  $('prog').textContent='Fertig. Bitte „Ergebnis kopieren“ und schicken.';$('verdict').textContent=verdict();
 }catch(e){$('prog').textContent='Fehler: '+(e.message||e);}
 if(S.battle){try{M.endBenchmark(-1,'Zwei-Kerne-Test');}catch(e){}}
 $('go').disabled=false;$('copy').disabled=!results.length;
};
$('copy').onclick=()=>{const t=text();(navigator.clipboard?.writeText(t)||Promise.reject()).then(()=>$('prog').textContent='Kopiert.',()=>{prompt('Ergebnis:',t);});};
})();
