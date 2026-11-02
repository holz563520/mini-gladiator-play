'use strict';
// Worker des Aufstellungs-Simulators (aufstellung-test.html): lädt das Spiel ohne Bildschirm wie die Arena-Spionage
// und rechnet echte Kämpfe. Kein Spielstand, keine Speicherzugriffe des Spiels.
self.window=self;
{const v=(self.location.search.match(/[?&]v=([^&]*)/)||[])[1]||'';importScripts(...["arena-headless","data","household","management","scout","sim","benchmark","school","world","forge","spy","arena","techniques","manager","school-ui","world-ui","mobile","ludus","intro","forge-ui","forge-intro","scene-nav","barracks","trader","wanderer-talk","wanderers","smith-wrath","archer-plot","hall","lion","hahn-engine","hahn-arena","arena-beasts","hund","arena-core","arena-calibration","arena-challenges","aufstellung-core"].map(n=>n+'.js?v='+v));}
(()=>{
const M=self.MG,S=M.s,A=self.Aufstellung;S.started=true;S.lion={stage:'done',recruits:[],base:[]};S.medic={stage:'skip'};M.persist=()=>true;
self.AN.headless=true;self.HahnArena.headless=true;self.Beasts.fx=false;
const P0=JSON.parse(JSON.stringify(A.P));
let job=null;
function run(){if(!job)return;const j=job;let r;
 try{r=A.fight(j.lineup,j.offer,{vows:j.vows,hero:j.hero,fame:j.fame});}catch(e){postMessage({id:j.id,error:String(e&&e.stack||e)});job=null;return;}
 if(job!==j)return;if(j.n>1){delete r.curve;delete r.events;}
 postMessage({id:j.id,result:r,i:j.i});j.i++;if(j.i<j.n)setTimeout(run,0);else{postMessage({id:j.id,done:true});job=null;}}
self.onmessage=e=>{const d=e.data;
 A.P=Object.assign(JSON.parse(JSON.stringify(P0)),d.P||{});
 try{
  if(d.cmd==='roster')postMessage({id:d.id,roster:A.roster(d.seed)});
  else if(d.cmd==='recruit')postMessage({id:d.id,fighter:A.recruit(d.seed,d.role,d.n)});
  else if(d.cmd==='offers')postMessage({id:d.id,offers:A.offers(d.lineup,d.seed)});
  else if(d.cmd==='fight'){A.describe(d.offer,d.lineup);job={id:d.id,lineup:d.lineup,offer:d.offer,vows:d.vows||[],hero:d.hero,fame:d.fame||0,n:d.n||1,i:0};setTimeout(run,0);}
  else if(d.cmd==='stop')job=null;
  else if(d.cmd==='params')postMessage({id:d.id,P:P0});
 }catch(err){postMessage({id:d.id,error:String(err&&err.stack||err)});}
};
postMessage({ready:true,P:P0});
})();
