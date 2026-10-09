'use strict';
// SZENEN-NAVIGATION: In den Videosequenzen (Schmied-Einführung, Händler, Start-Intro, Zorn des Schmieds, Attentat)
// laufen Figuren nicht durch Brunnen, Bänke, Werkzeug, Wände oder durch andere Leute hindurch.
// Arbeitet unmittelbar vor dem Zeichnen: Wer in einem Hindernis oder in einer anderen Figur stünde, wird an den Rand geschoben.
// Die Drehbücher der Szenen planen ihre Wege ohnehin um die Hindernisse herum; das hier ist das Sicherheitsnetz.
// Gezielter Körperkontakt (Handschlag, Griff, Kopf in die Esse) setzt a.noNav und bleibt unberührt. Keine Spielwirkung.
(()=>{
const M=window.MG;if(!M)return;
// Fußflächen in Kulissen-Koordinaten (900 × 670). E = Ellipse (Mitte, Halbachsen), R = Rechteck (links, oben, rechts, unten).
const E=(x,y,rx,ry,name)=>({k:'e',x,y,rx,ry,name}),R=(x0,y0,x1,y1,name)=>({k:'r',x0,y0,x1,y1,name});
const OBST=[
 E(742,352,38,20,'Brunnen'),E(676,400,8,4,'Olivenbaum'),E(816,347,8,4,'Olivenbaum'),E(853,395,7,4,'Zypresse'),
 R(818,386,850,416,'Mars-Schrein'),R(688,312,726,330,'Bank'),R(781,314,799,325,'Amphore'),R(651,332,669,343,'Amphore'),R(841,422,859,433,'Amphore'),
 R(636,150,731,238,'Schmiede'),R(764,150,860,238,'Schmiede'),R(660,250,698,263,'Amboss'),R(704,281,736,293,'Schleifstein'),R(770,268,802,290,'Trog'),R(803,283,851,295,'Werkbank'),R(640,272,663,284,'Kohle'),R(823,243,854,255,'Blasebalg'),
 R(356,363,394,372,'Puppe'),R(500,365,538,374,'Puppe'),R(429,473,467,482,'Puppe'),R(334,262,354,274,'Stroh'),R(538,262,558,274,'Stroh'),
 R(55,436,60,440,'Kettenpfahl'),R(247,436,252,440,'Kettenpfahl'),R(226,429,246,440,'Wassertrog')];
const RAD=13,DEPTH=2.5; // Abstand zweier stehender Figuren; Tiefe zählt 2,5-fach (hintereinander stehen ist erlaubt)
const upright=a=>a&&!a.hidden&&!a.down&&!a.g?.dead&&!(a.fallTimer>0)&&!a.noNav&&!a.bodyView;
const lying=a=>a&&!a.hidden&&(a.down||a.g?.dead)&&!a.carried;
const mass=a=>a.navMass??(a.forgeWorker&&!a.apprentice?5:a.trader?3:1);
function inside(o,x,y){if(o.k==='e'){const u=(x-o.x)/o.rx,v=(y-o.y)/o.ry;return u*u+v*v<1;}return x>o.x0&&x<o.x1&&y>o.y0&&y<o.y1;}
// Rand des Hindernisses, an dem die Figur stehen bleibt (kürzester Weg hinaus; in der Tiefe zählt jeder Pixel doppelt)
function out(o,x,y){if(o.k==='e'){let u=(x-o.x)/o.rx,v=(y-o.y)/o.ry,d=Math.hypot(u,v);if(d<1e-4){u=1;v=0;d=1;}return {x:o.x+u/d*o.rx*1.001,y:o.y+v/d*o.ry*1.001};}
 const l=x-o.x0,r=o.x1-x,t=(y-o.y0)*2,b=(o.y1-y)*2,m=Math.min(l,r,t,b);return m===l?{x:o.x0-.01,y}:m===r?{x:o.x1+.01,y}:m===t?{x,y:o.y0-.01}:{x,y:o.y1+.01};}
const body=a=>{const s=(a.fallSide||1)*(Math.cos(a.a||0)>=0?1:-1)>=0?1:-1;return E(a.x+s*21,a.y+1,30,5,'Körper');};
let report=null;
function push(a,x,y,kind,what){if(report){const d=Math.hypot(x-a.x,(y-a.y)*DEPTH);if(d>.3)report({kind,what,id:a.id,name:a.g?.name,x:a.x,y:a.y,d});}a.x=x;a.y=y;}
function resolve(list){if(!Array.isArray(list))return list;const up=list.filter(upright),down=list.filter(lying).map(body);
 for(let pass=0;pass<3;pass++)for(let i=0;i<up.length;i++)for(let j=i+1;j<up.length;j++){const a=up[i],b=up[j];let dx=b.x-a.x,dy=(b.y-a.y)*DEPTH,d=Math.hypot(dx,dy);if(d>=RAD)continue;
  if(d<1e-3){dx=String(a.id)<String(b.id)?1:-1;dy=0;d=1;}const k=(RAD-d)/d,wa=mass(a),wb=mass(b),fa=wb/(wa+wb),fb=wa/(wa+wb);
  push(a,a.x-dx*k*fa,a.y-dy*k*fa/DEPTH,'Person',b.g?.name||b.id);push(b,b.x+dx*k*fb,b.y+dy*k*fb/DEPTH,'Person',a.g?.name||a.id);}
 for(const a of up){for(const o of down)if(inside(o,a.x,a.y)){/* neben dem Körper vorbei, nicht über ihn: nur seitlich (in der Tiefe) ausweichen */const u=(a.x-o.x)/o.rx,h=o.ry*Math.sqrt(Math.max(0,1-u*u))*1.001;push(a,a.x,a.y>=o.y?o.y+h:o.y-h,'Körper','liegende Figur');}
  for(const o of OBST)if(inside(o,a.x,a.y)){const p=out(o,a.x,a.y);push(a,p.x,p.y,'Hindernis',o.name);}}
 return list;}
// Weg (Liste von [x,y] oder [t,x,y]) um Hindernisse herumführen: Teilstücke, die ein Hindernis schneiden, bekommen einen Umweg-Punkt.
function hits(o,x0,y0,x1,y1){for(let i=1;i<20;i++){const k=i/20;if(inside(o,x0+(x1-x0)*k,y0+(y1-y0)*k))return true;}return false;}
function detour(o,x0,y0,x1,y1){const mx=(x0+x1)/2,my=(y0+y1)/2;let cx,cy,rx,ry;if(o.k==='e'){cx=o.x;cy=o.y;rx=o.rx;ry=o.ry;}else{cx=(o.x0+o.x1)/2;cy=(o.y0+o.y1)/2;rx=(o.x1-o.x0)/2*1.42;ry=(o.y1-o.y0)/2*1.42;}
 // senkrecht zur Laufrichtung ausweichen; bevorzugt die Seite, auf der die Strecke schon liegt, und nie in ein anderes Hindernis hinein
 let nx=-(y1-y0),ny=x1-x0;if((mx-cx)*nx+(my-cy)*ny<0){nx=-nx;ny=-ny;}const n=Math.hypot(nx/rx,ny/ry)||1,cand=[];
 for(const side of [1,-1])for(const k of [1.3,1.6,2])cand.push([cx+side*nx/n*k,cy+side*ny/n*k]);
 const free=cand.filter(([x,y])=>!OBST.some(q=>inside(q,x,y)));const best=(free.length?free:cand).sort((a,b)=>(Math.hypot(a[0]-x0,a[1]-y0)+Math.hypot(x1-a[0],y1-a[1]))-(Math.hypot(b[0]-x0,b[1]-y0)+Math.hypot(x1-b[0],y1-b[1])))[0];return best;}
function route(points,depth=0){const timed=points[0]?.length===3,P=points.map(p=>timed?p:[0,p[0],p[1]]),res=[P[0]];
 for(let i=1;i<P.length;i++){const [t0,x0,y0]=res[res.length-1],[t1,x1,y1]=P[i];const o=depth<4&&OBST.find(o=>!inside(o,x0,y0)&&!inside(o,x1,y1)&&hits(o,x0,y0,x1,y1));
  if(o){const [dx,dy]=detour(o,x0,y0,x1,y1),l1=Math.hypot(dx-x0,dy-y0),l2=Math.hypot(x1-dx,y1-dy),tm=t0+(t1-t0)*l1/((l1+l2)||1);const sub=route([[t0,x0,y0],[tm,dx,dy],[t1,x1,y1]],depth+1);res.push(...sub.slice(1));}
  else res.push(P[i]);}
 return timed?res:res.map(p=>[p[1],p[2]]);}
const SCENES=new Set(['smithWrathCanvas','archerPlotCanvas','plotTalkCanvas','smithIntroCanvas','introCanvas']);
const want=(ctx,list)=>{const id=ctx?.canvas?.id;return SCENES.has(id)||(id==='ludusCanvas'&&Array.isArray(list)&&list.some(a=>a?.trader));};
const forge=M.renderForgeActors;if(forge)M.renderForgeActors=(ctx,list)=>{if(want(ctx,list))resolve(list);return forge(ctx,list);};
const ludus=M.renderLudusActors;if(ludus)M.renderLudusActors=(ctx,list)=>{if(want(ctx,list))resolve(list);return ludus(ctx,list);};
// Sichtbare Umrisse der Kulissen-Gegenstände (Bild, nicht Fußfläche) und ihre Standlinie. Liegt ein Körper hinter der Standlinie
// eines Gegenstands und überdeckt ihn, sähe es aus, als läge er obendrauf (der Körper wird ja nach der Kulisse gezeichnet).
const P=(x0,y0,x1,y1,base,name)=>({x0,y0,x1,y1,base,name});
const PROPS=[P(705,267,735,292,293,'Schleifstein'),P(771,264,801,289,290,'Trog'),P(804,269,849,294,295,'Werkbank'),P(659,219,700,261,262,'Amboss'),P(640,269,663,284,284,'Kohle'),P(818,231,853,254,255,'Blasebalg'),
 P(690,312,724,329,330,'Bank'),P(781,300,797,324,324,'Amphore'),P(651,318,667,342,342,'Amphore'),P(841,408,857,432,432,'Amphore'),P(710,327,774,374,367,'Brunnen'),
 P(657,347,695,402,402,'Olivenbaum'),P(797,294,835,349,349,'Olivenbaum'),P(820,354,848,414,414,'Mars-Schrein'),P(838,324,867,396,396,'Zypresse'),
 P(636,150,860,238,239,'Schmiede'),P(354,301,396,371,371,'Puppe'),P(498,303,540,373,373,'Puppe'),P(427,411,469,481,481,'Puppe')];
// Liegt ein Körper (Füße bei x,y, Kopf in Richtung s) frei, ohne über einem Gegenstand vor ihm oder auf einer Wand zu liegen?
function lyingClear(x,y,s){const a=Math.min(x+s*2,x+s*62),b=Math.max(x+s*2,x+s*62),top=y-18,bot=y+14;if(a<330||b>870)return false;
 return !PROPS.some(o=>a<o.x1&&b>o.x0&&top<o.y1&&bot>o.y0&&(o.base>y+1||o.name==='Schmiede'));}
// Freier Fleck für einen abgetrennten Kopf oder Arm: nicht in einem Hindernis, nicht hinter/auf einem Gegenstand, nicht am Rand
function spotClear(x,y){if(x<335||x>865||OBST.some(o=>inside(o,x,y)))return false;return !PROPS.some(o=>x+4>o.x0&&x-4<o.x1&&y>o.y0&&y-6<o.y1&&(o.base>y+1||o.name==='Schmiede'));}
M.sceneNav={obstacles:OBST,props:PROPS,lyingClear,spotClear,inside:(x,y)=>OBST.find(o=>inside(o,x,y))||null,resolve,route,body,radius:RAD,set report(fn){report=fn;},get report(){return report;}};
})();
