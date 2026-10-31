'use strict';
(()=>{
const describe=xs=>{const a=xs.slice().sort((x,y)=>x-y);return{count:a.length,mean:a.reduce((s,x)=>s+x,0)/Math.max(1,a.length),median:a[Math.floor(a.length*.5)]||0,p95:a[Math.min(a.length-1,Math.floor(a.length*.95))]||0,max:a.at(-1)||0};};
class Run{
 constructor(config){this.config=config;this.samples=[];this.warmupSeconds=2;this.durationSeconds=30;this.elapsed=0;this.started=null;}
 add(sample){if(this.started===null){this.started=sample.now;return false;}this.elapsed=(sample.now-this.started)/1000;if(this.elapsed<=this.warmupSeconds)return false;this.samples.push({...sample});return this.elapsed>=this.warmupSeconds+this.durationSeconds;}
 result(reason='Zeitfenster beendet',valid=true){const s=this.samples,metric=k=>describe(s.map(x=>x[k]||0)),sum=k=>s.reduce((n,x)=>n+(x[k]||0),0),wall=sum('intervalMs')/1000,advanced=sum('advanced'),sim=sum('simMs'),paint=sum('paintMs'),steps=sum('steps'),rate=wall?advanced/wall:0;
 const out={version:1,type:'live-battle-diagnosis',valid,reason,configuration:this.config,warmupSeconds:this.warmupSeconds,sampledSeconds:wall,frames:s.length,fps:wall?s.length/wall:0,simulationSpeed:rate,steps,simulatedSeconds:advanced,simulation:metric('simMs'),presentation:metric('presentationMs'),combat:metric('combatMs'),effects:metric('effectsMs'),drawing:metric('paintMs'),frameIntervals:metric('intervalMs'),backlogSeconds:metric('backlog'),clampedWallSeconds:sum('clampedSeconds'),framesOver33ms:s.filter(x=>x.intervalMs>33.34).length,framesOver50ms:s.filter(x=>x.intervalMs>50).length,simulationMsPerStep:steps?sim/steps:0,simulationCostPerSimulatedSecond:advanced?sim/advanced:0,drawCostAt60fps:s.length?paint/s.length*60:0,raw:s};
 out.sufficient=valid&&wall>=5&&s.length>=60&&steps>0;
 if(!valid)out.finding='Messung abgebrochen; keine belastbare Auswertung.';
 else if(!out.sufficient)out.finding='Zu kurze Messung. Mehr Figuren wählen und erneut messen.';
 else if(out.simulationCostPerSimulatedSecond>=800)out.finding='Die gemessene Kampfberechnung benötigt viel CPU-Zeit pro Kampfsekunde. Ein neuer Figurenrenderer allein reicht wahrscheinlich nicht.';
 else if(out.drawing.mean>8&&paint>sim*1.5)out.finding='Die Zeichenaufrufe sind der größte gemessene CPU-Anteil. Ein Umbau des Figurenrenderers ist ein sinnvoller nächster Test.';
 else if(rate<.85)out.finding='Der Kampf läuft langsamer als Echtzeit. Begrenzte Simulationsschritte und Zeichenlast gemeinsam prüfen; kein eindeutig isolierter Engpass.';
 else if(out.frameIntervals.p95>33.34)out.finding='Langsame Bilder trotz begrenzter gemessener CPU-Arbeit: Browser, GPU, Speicher oder andere Aufgaben können beteiligt sein. GPU-Zeit ist hier nicht separat gemessen.';
 else out.finding='In diesem Lauf kein klarer Engpass. Größere Schlacht oder die problematische Ansicht testen.';
 out.limits='Zeichnen = CPU-Zeit der Canvas/WebGL-Aufrufe einschließlich Upload-Vorbereitung, keine isolierte GPU-Zeit. Bildabstände = requestAnimationFrame-Takt, keine garantierte Display-Ausgabe. 60-FPS-Kosten sind Hochrechnungen. Keine automatische Änderung an Simulation oder Renderer.';
 return out;
 }
}
window.FigureDiagnosis={Run,describe};
})();
