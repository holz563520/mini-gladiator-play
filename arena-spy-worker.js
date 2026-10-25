'use strict';
// Spionage der neuen Arena: lädt das Spiel ohne Bildschirm und rechnet Probekämpfe mit derselben Kampflogik (erzeugt von prototypes/arena-neu/to-dist.py)
self.window=self;
{const v=(self.location.search.match(/[?&]v=([^&]*)/)||[])[1]||'';importScripts(...["arena-headless", "data", "household", "management", "scout", "sim", "benchmark", "school", "world", "forge", "spy", "arena", "techniques", "manager", "school-ui", "world-ui", "mobile", "ludus", "intro", "forge-ui", "forge-intro", "scene-nav", "barracks", "trader", "wanderer-talk", "wanderers", "smith-wrath", "archer-plot", "hall", "lion", "hahn-engine", "hahn-arena", "arena-beasts", "hund", "arena-core"].map(n=>n+'.js?v='+v));}
'use strict';
// Spionage-Worker: rechnet Probekämpfe mit genau dem Kampfsystem der Arena (geladen: headless-env, Spiel, Hähne, Löwen, Kern).
(()=>{
const M=self.MG,S=M.s;S.started=true;S.lion={stage:'done',recruits:[],base:[]};S.medic={stage:'skip'};M.persist=()=>true;
self.AN.headless=true;self.HahnArena.headless=true;self.Beasts.fx=false;
let job=null;
const slim=o=>({w:o.winner,t:o.time,to:o.timeout,u:o.units.map(u=>({k:u.key,tm:u.team,d:u.dead?1:0,s:u.severe?1:0,i:u.injured?1:0,h:u.health,l:u.loss}))});
function tick(){if(!job)return;const j=job;let o;try{o=AN.headlessRun(j.spec);}catch(e){postMessage({id:j.id,error:String(e&&e.stack||e)});job=null;return;}
 if(job!==j)return;postMessage({id:j.id,out:slim(o)});j.i++;if(j.i<j.n)setTimeout(tick,0);else{postMessage({id:j.id,done:true});job=null;}}
self.onmessage=e=>{const d=e.data;if(d.cmd==='run'){job={id:d.id,spec:d.spec,n:d.n,i:0};setTimeout(tick,0);}else if(d.cmd==='stop')job=null;};
postMessage({ready:true});
})();
