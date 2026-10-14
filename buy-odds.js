'use strict';
/* =====================================================================================================
   WÜRFELGLÜCK BEIM KAUF
   Direkt nach jedem Kauf (Sklavenhändler: Mensch, Hühnerhändlerin: Hahn) steht auf der Aufdeckkarte, wie selten so ein
   guter Kämpfer ist: „So gut oder besser: 1 von N“ – dazu ein schwarzhumoriger Spruch von Fortuna.
   · Mensch: gemessen am Talent (g.potential). Die Verteilung ist exakt aus dem Generator gerechnet
     (makeGladiator(0): 32 Bernoulli-Würfe, Mittel 62, mit Eigenschaft „Talentiert“ (1 von 16) Mittel 67).
   · Hahn: gemessen an der Gesamtqualität (quality.raw aus hahn-engine.js), Tabelle aus 1 000 000 erzeugten Hähnen
     (tools/buy-odds.cjs). Jenseits der Stichprobe wird der Schwanz geglättet fortgesetzt.
   Reine Anzeige: liest nur, schreibt keinen Spielstand, verbraucht keine Spielzufallszahlen (Spruchwahl mit Math.random).
   Entfernen: buy-odds aus der Skriptliste in boot.js streichen – die Aufrufe in trader.js/huehnerschule.js sind optional.
   ===================================================================================================== */
(()=>{
const M=window.MG;if(!M)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// ---------- Mensch: exakte Verteilung des Talents ----------
const HUMAN=(()=>{const n=32,mix=[[15/16,61/99],[1/16,66/99]],lf=[0];for(let i=1;i<=n;i++)lf[i]=lf[i-1]+Math.log(i);
 const pmf=new Array(101).fill(0);for(const [w,p] of mix)for(let k=0;k<=n;k++){const v=Math.round(1+99*k/n);pmf[v]+=w*Math.exp(lf[n]-lf[k]-lf[n-k]+k*Math.log(p)+(n-k)*Math.log(1-p));}
 const ge=new Array(102).fill(0);for(let v=100;v>=0;v--)ge[v]=ge[v+1]+pmf[v];return ge;})();
function human(g){const t=Math.round(Math.min(100,Math.max(1,g?.potential??50)));return {score:t,label:'Talent '+t,atLeast:Math.max(HUMAN[t],1e-12),better:HUMAN[t+1]};}
// ---------- Hahn: Tabelle der Gesamtqualität ----------
function roosterTail(x){const RT=window.BUY_ODDS_ROOSTER;if(!RT)return null;const g=RT.grid,N=RT.N;if(x<=g[0][0])return 1;
 let i=Math.min(g.length-1,Math.floor((x-g[0][0])/RT.step));while(i>0&&g[i][0]>x)i--;
 const [x0,c0]=g[i],[x1,c1]=g[Math.min(g.length-1,i+1)];
 if(c1>=RT.min&&c0>=RT.min){const f=x1>x0?(x-x0)/(x1-x0):0;return Math.exp(Math.log(c0/N)+(Math.log(c1/N)-Math.log(c0/N))*f);}
 // Schwanz jenseits der Stichprobe: Normalverteilung mit an der Stichprobe angepasster Breite
 const [xa,pa]=RT.tail,z=(x-RT.mu)/RT.sdTail,za=(xa-RT.mu)/RT.sdTail;return pa*Math.exp(-(z*z-za*za)/2)*za/Math.max(za,z);}
function rooster(R){const x=R?.quality?.raw;if(!(x>0)||!window.BUY_ODDS_ROOSTER)return null;return {score:x,label:'Qualität '+(R.quality.label||''),atLeast:Math.max(roosterTail(x),1e-12),better:roosterTail(x+.01)};}
// ---------- Text ----------
const de=(v,d=0)=>v.toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d});
function oneIn(p){const n=1/p;if(n<1.05)return 'praktisch jeder';if(n<10)return '1 von '+de(n,1);if(n<1000)return '1 von '+de(Math.round(n));
 const r=v=>{const e=Math.pow(10,Math.floor(Math.log10(v))-1);return Math.round(v/e)*e;};
 if(n<1e6)return '1 von '+de(r(n));if(n<1e9)return '1 von '+de(r(n)/1e6,1).replace(/,0$/,'')+' Millionen';return '1 von '+de(r(n)/1e9,1).replace(/,0$/,'')+' Milliarden';}
function pct(p){const v=p*100;return v>=99.5?'fast 100':v>=10?de(Math.round(v)):v>=1?de(v,1):v>=.01?de(v,2):'unter 0,01';}
const band=p=>{const n=1/p;return n<1.25?0:n<2?1:n<5?2:n<20?3:n<100?4:n<1000?5:n<10000?6:7;};
const NAMES=['Ausschuss','Unterdurchschnitt','Mittelmaß','Ordentlich','Guter Wurf','Seltener Fang','Glückstreffer','Jahrhundertwurf'];
const LINES={human:[
 ['Fast jeder andere wäre besser gewesen. Sogar der Tote, den du gestern begraben hast.','Ein Trottel. Du kriegst beim nächsten Mal fast sicher einen besseren. Schlechter geht kaum.','Ich habe Leichen gesehen, die mehr Talent hatten. Und zwar nach dem Verwesen.','Den hätte ich nicht mal als Rammbock genommen. Rammböcke haben wenigstens Würde.','Herzlichen Glückwunsch zum schlechtesten Wurf der Woche. Der Sand der Arena freut sich schon.'],
 ['Unter dem Durchschnitt. Er stirbt nicht schneller als andere, nur hässlicher.','Mehr als die Hälfte wäre besser gewesen. Aber die waren ja nicht im Angebot.','Er wird kein Held. Aber ein tragisches Ende hat jeder verdient.','Solides Kanonenfutter. Mit Betonung auf Futter.'],
 ['Durchschnitt. Er wird sterben wie die meisten: laut und überrascht.','Weder Gold noch Mist. Einfach Fleisch mit Meinung.','Mittelmaß. Die Halle der Toten hat noch Platz für Mittelmaß.','Ein ehrlicher Würfel. Ehrlich langweilig.'],
 ['Ordentlich. Der überlebt vielleicht sogar seinen ersten Kampf. Vielleicht.','Besser als die meisten. Pass auf, dass der Schmied ihn nicht sieht.','Ein brauchbarer Wurf. Die Götter haben nur kurz hingeschaut.','Ganz anständig. Fast schade, ihn sterben zu lassen.'],
 ['Guter Fang. So einen kriegst du nicht jeden Tag. Lass ihn nicht gleich vom Löwen fressen.','Das ist ein ordentliches Stück. Selten wie ein nüchterner Schmied.','Der hat Talent. Das macht seinen Tod später umso teurer.','Fortuna war gnädig. Genieß es, sie ist nachtragend.'],
 ['Ein seltenes Stück! Das gibt es nur in einem von hundert Fällen. Der Händler weint jetzt heimlich.','Selten. Wenn der stirbt, kriegt er ein größeres Grab.','So einen findest du nicht wieder. Also wirf ihn bitte nicht gleich den Hähnen vor.','Ein Juwel aus dem Dreck. Er weiß es nur noch nicht.'],
 ['Ein Glückstreffer! Einer von tausend. Opfere der Fortuna – oder wenigstens einen Rekruten.','Das ist ein Wunder auf zwei Beinen. Noch. Pass auf seine Beine auf.','Die Götter haben sich verwürfelt. Behalte ihn, bevor sie es merken.','Der wird berühmt. Entweder in der Arena oder auf deinem Grabstein.'],
 ['JAHRHUNDERTWURF. Einer von zehntausend und mehr. Wenn der stirbt, stirbt auch deine Zukunft.','Den hat Mars persönlich verloren. Er wird ihn zurückwollen.','So etwas würfelt man einmal im Leben. Deins ist ab jetzt in Gefahr – Neider gibt es viele.','Halt ihn vom Schmied fern. Und vom Medicus. Und von dir.']],
rooster:[
 ['Fast jeder Hahn wäre besser gewesen. Dieser ist eine Suppe mit Federn.','Ein Federtrottel. Beim nächsten Mal kriegst du fast sicher einen besseren. Oder einen Truthahn.','Der pickt sich selbst ins Bein. Mehrmals. Mit Absicht.','Kochtopf statt Kampfplatz. Mehr gibt der nicht her.'],
 ['Unterdurchschnittlich. Er stirbt im Sand, aber wenigstens mit Würde. Wenig Würde.','Mehr als die Hälfte der Hähne wäre besser gewesen. Aber die waren schon tot.','Solider Brühwürfel.','Er kräht laut. Das ist auch schon alles.'],
 ['Ein Durchschnittshahn. Kämpft, blutet, wird gegessen. Der Kreislauf des Lebens.','Weder Brathähnchen noch Champion. Irgendwas dazwischen.','Mittelmaß in Federn. Die Hühner gähnen.','Ein ehrlicher Hahn. Ehrlich mittelmäßig.'],
 ['Ordentlich! Der hackt vielleicht ein Auge aus, bevor er im Topf landet.','Besser als die meisten. Die Hühnerfrau wird ihn vermissen. Ein bisschen.','Ein brauchbarer Sporn. Sporen sind nicht alles, aber fast.','Ganz anständig. Fast zu schade für die Suppe.'],
 ['Guter Hahn. So einen kriegst du nicht jeden Tag. Lass ihn nicht in die Nähe des Kochs.','Der hat Feuer im Kamm. Hoffentlich nicht im Ofen.','Fortuna hat ein Ei gelegt. Ein gutes.','Ein Kämpfer. Die anderen Hähne riechen schon das Blut.'],
 ['Ein seltener Vogel! Einer von hundert. Die Hühnerfrau hat sich verzählt.','Selten. Wenn der fällt, bekommt er ein eigenes Grab im Beastrium.','So einen findest du nicht wieder. Also nicht schlachten. Bitte.','Ein Juwel mit Federn. Er weiß es leider genau.'],
 ['Ein Glückstreffer! Einer von tausend. Der Hahn der Götter – nur dümmer.','Ein Wunder mit Schnabel. Bewache ihn vor dem Fuchs und vor dem Koch.','Die Götter haben sich verwürfelt. Behalte ihn, bevor sie ihn zurückkrähen.','Der wird berühmt. Entweder in der Arena oder in einer sehr teuren Suppe.'],
 ['JAHRHUNDERTHAHN. Einer von zehntausend und mehr. Wenn der stirbt, schlachte gleich den Rest mit.','Den hat Mars selbst gebrütet. Er wird ihn zurückwollen.','So einen Hahn kräht die Welt nur einmal. Vielleicht lieber ihn in die Arena und dich in Deckung.','Halt ihn vom Kochtopf fern. Und von dir.']]};
const said=new Map();// gleiche Karte, gleicher Spruch (auch wenn die Seite neu gezeichnet wird)
const pickLine=(kind,b,id)=>{const k=kind+':'+id+':'+b;if(id&&said.has(k))return said.get(k);const l=LINES[kind][b],v=l[Math.floor(Math.random()*l.length)];if(id)said.set(k,v);return v;};
function info(kind,obj){try{const o=kind==='rooster'?rooster(obj):human(obj);if(!o)return null;const b=band(o.atLeast);return {...o,band:b,name:NAMES[b],oneIn:oneIn(o.atLeast),betterPct:pct(o.better),line:pickLine(kind,b,obj?.id)};}catch(e){console.warn(e);return null;}}
function html(kind,obj){const o=info(kind,obj);if(!o)return '';
 return `<div class="bo-card bo-b${o.band}"><p class="bo-head"><b>${esc(o.name)}</b> · ${esc(o.label)} · So gut oder besser: <strong>${esc(o.oneIn)}</strong></p><p class="bo-sub">Einen besseren hättest du in ${esc(o.betterPct)} % der Fälle bekommen.</p><p class="bo-line"><b>Fortuna:</b> „${esc(o.line)}“</p></div>`;}
// Aussehen (eigene kleine Regeln, keine Änderung an bestehenden Stilen)
if(!document.getElementById('bo-style')){const st=document.createElement('style');st.id='bo-style';st.textContent=`.bo-card{margin:6px 0 8px;padding:6px 9px;border:2px solid #5a4429;background:#211a13;color:#f1e3c4;font-size:.84rem;line-height:1.35;text-align:left}.bo-card p{margin:2px 0}.bo-head strong{color:#f5c66a}.bo-sub{font-size:.76rem;color:#c9b38a}.bo-line{font-style:italic;color:#e9d7b0}.bo-line b{font-style:normal;color:#c9a46a}.bo-b0,.bo-b1{border-color:#6b2e22}.bo-b0 .bo-head b,.bo-b1 .bo-head b{color:#ff8a5c}.bo-b2,.bo-b3{border-color:#5a4429}.bo-b4,.bo-b5{border-color:#7a6a2a}.bo-b4 .bo-head b,.bo-b5 .bo-head b{color:#e9d36a}.bo-b6,.bo-b7{border-color:#c9a034;box-shadow:0 0 10px rgba(245,198,106,.45)}.bo-b6 .bo-head b,.bo-b7 .bo-head b{color:#ffd76a}`;document.head.appendChild(st);}
M.buyOdds={human,rooster,info,html,oneIn,lines:LINES};
window.BUY_ODDS_READY=true;
})();
