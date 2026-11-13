'use strict';
// =====================================================================================================================
// BAUEN (welt-bau.js) · Baufunktion der Rasterkarte: Trainingsfeld und Arena. Wunsch Thomas 11./12.11.2026 (Vorbild
// Dungeon Keeper und RollerCoaster Tycoon). Nur auf tageslauf-editor.html geladen, nicht im Spiel. Nichts wird gespeichert.
//
// · „Bauen“ öffnet die Werkzeuge. Rechteck auf Wiese oder Ludus-Boden ziehen, loslassen baut. Jedes Feld kostet Gold
//   aus S.gold des Testspielstands (Preise in WERKZEUG sind Vorschläge, noch nicht bestätigt). „Abreißen“ macht Gebautes
//   wieder zu dem, was vorher dort war (kein Geld zurück); so wird eine Arena auch kleiner.
// · Trainingsfeld: Hau-Puppen entstehen von selbst. Zusammenhängende Felder zählen als ein Feld: je PRO Felder eine
//   Puppe, und je größer das Feld, desto besser die Puppen (STUFEN). Der Trainingshof des Ludus zählt mit.
// · Arena: „Kampffläche“ ist die Grundform. „Tribüne“ daneben gebaut wird Teil der Arena: Jede Reihe weiter weg von der
//   Kampffläche steht eine Stufe höher (bis 4), jedes Tribünenfeld hat PLAETZE Sitzplätze. Daraus formt sich die Arena von
//   selbst (Name nach Größe, Fahnen auf der obersten Reihe). Beim Start steht eine Arena hinter dem Ludus; sie ersetzt
//   das Arena-Tor.
// · Grafik: Felder klappen der Reihe nach auf, neue Puppen springen mit Staub aus dem Boden, bessere Puppen blitzen auf.
// · Noch keine Spielwirkung: kein Training, keine Kämpfe in der Arena, kein Eintritt.
// =====================================================================================================================
(()=>{
const M=window.MG,W=window.WeltKarte,H=window.WeltHook;if(!M||!W||!H||!W.feld)return;const S=M.s,$=id=>document.getElementById(id);
const T=W.T,N=W.N,clamp=(v,a,b)=>v<a?a:v>b?b:v,TAU=Math.PI*2;
// T1: neue Texte aus der Sprachdatei (Regel 10); ohne Sprachkern (Tageslauf-Editor) die deutsche Fassung
const SPR=window.AT2Sprache,sp=(k,v,de)=>SPR?SPR.t(k,v):de.replace(/\{(\w+)\}/g,(_,n)=>v?.[n]??'');
const WERKZEUG={platz:{name:'Trainingsfeld',typ:T.PLATZ,preis:50},arena:{name:'Kampffläche',typ:T.ARENA,preis:80},trib:{name:'Tribüne',typ:T.TRIB,preis:120},
 // Gebäude mit Art: Boden ziehen, Wände, Dach und Einrichtung entstehen von selbst (welt-gebaeude.js). Gleiche Art nebeneinander wächst zusammen.
 // Drei Güteklassen von schäbig bis königlich (Thomas 12.11.), jede teurer; über eine andere Klasse bauen = Umbau zum vollen Preis.
 unterkunft1:{name:'Rattenloch',typ:T.UNT_S,preis:20,haus:1},unterkunft:{name:'Mannschaftsstube',typ:T.UNTERKUNFT,preis:60,haus:1},unterkunft3:{name:'Fürstengemächer',typ:T.UNT_K,preis:200,haus:1},
 // Schmiede in drei Klassen (Thomas 12.11.): halb überdacht, halb Hof; Einrichtung entsteht von selbst (welt-gebaeude.js)
 schmiede1:{name:'Rostgrube',typ:T.SCHM_S,preis:30,haus:1,gruppe:'schmiede'},schmiede:{name:'Waffenschmiede',typ:T.SCHMIEDE,preis:90,haus:1,gruppe:'schmiede'},schmiede3:{name:'Kaiserliche Waffenschmiede',typ:T.SCHM_K,preis:260,haus:1,gruppe:'schmiede'},
 // Beastrium in drei Klassen (Thomas 12.11.): ganz überdacht, voller Metallkäfige für alle Tiere; Einrichtung von selbst (welt-gebaeude.js)
 bestium1:{name:'Knochengrube',typ:T.BST_S,preis:40,haus:1,gruppe:'beast'},bestium:{name:'Beastrium',typ:T.BEAST,preis:120,haus:1,gruppe:'beast'},bestium3:{name:'Kaiserliche Menagerie',typ:T.BST_K,preis:320,haus:1,gruppe:'beast'},
 // Kaserne in drei Klassen (Thomas 12.11.): überall Waffenständer, Waffen und Rüstungen werden hingetragen und abgelegt
 kaserne1:{name:'Bretterbude',typ:T.KAS_S,preis:35,haus:1,gruppe:'kaserne'},kaserne:{name:'Kaserne',typ:T.KASERNE,preis:100,haus:1,gruppe:'kaserne'},kaserne3:{name:'Prätorianerkaserne',typ:T.KAS_K,preis:280,haus:1,gruppe:'kaserne'},
 // Krankenhaus (Thomas 12.11.): nur Betten, eine Stufe. Der Medicus im Ludus ist fest (kein Werkzeug, nicht abreißbar, nicht überbaubar).
 krankenhaus:{name:'Krankenhaus',typ:T.KRANK,preis:80,haus:1,gruppe:'krankenhaus'},
 // Fünf Straßen, jede teurer als die vorige (Preise sind Vorschläge). Noch ohne Wirkung auf Tempo oder Besucher.
 str1:{name:'Trampelpfad',typ:T.STR1,preis:5,str:1},str2:{name:'Kiesweg',typ:T.STR2,preis:12,str:1},str3:{name:'Pflasterweg',typ:T.STR3,preis:25,str:1},str4:{name:'Steinstraße',typ:T.STR4,preis:50,str:1},str5:{name:'Prachtstraße',typ:T.STR5,preis:100,str:1},
 land:{name:'Gelände',preis:3,land:1},// wie RollerCoaster Tycoon Classic, Preis je Feld und Stufe (Vorschlag)
 weg:{name:'Abreißen',preis:0}};
const istStr=t=>t>=T.STR1&&t<=T.STR5,istHaus=t=>t===T.UNTERKUNFT||t===T.UNT_S||t===T.UNT_K||t===T.SCHM_S||t===T.SCHMIEDE||t===T.SCHM_K||t===T.BST_S||t===T.BEAST||t===T.BST_K||t===T.KAS_S||t===T.KASERNE||t===T.KAS_K||t===T.KRANK;
const PREIS=WERKZEUG.platz.preis,PRO=4,PLAETZE=8,STUFEN=[{ab:0,name:'Strohpuppe',mz:'Strohpuppen'},{ab:10,name:'Holzpuppe',mz:'Holzpuppen'},{ab:25,name:'Rüstungspuppe',mz:'Rüstungspuppen'},{ab:60,name:'Drehpuppe',mz:'Drehpuppen'}];
const ARENA_NAME=n=>n<20?'Sandgrube':n<48?'Kleine Arena':n<100?'Arena':'Große Arena';
const stufeVon=n=>{let s=0;for(let i=0;i<STUFEN.length;i++)if(n>=STUFEN[i].ab)s=i;return s;};
const ur=Uint8Array.from(W.feld);// Gelände vor allem Bauen (für „Abreißen“)
const FEST=W.fest,istFest=k=>!!FEST?.[k];// A3: Platz und Bauplatz der Verwaltung sind fest
// A3b: Fläche der großen Arena (B0) ist fest (W.arenaPlatz): kein Bauen, kein Geländewerkzeug, mit Hinweis (höchstens alle 1,5 s)
const AP=W.arenaPlatz,istAP=k=>!!AP?.[k],apText=()=>sp('bau.arenaPlatz',null,'Hier entsteht die große Arena. Der Sand wartet geduldig – er hat ja noch kein Blut gesehen.');
let apZeit=0;const apMelden=()=>{const t=performance.now();if(t-apZeit<1500)return;apZeit=t;M.ui?.notify?.(apText());};
// A3b (Thomas 13.11.2026): gebaut wird auf allen natürlichen Böden außer Wasser (vorher nur Wiese). Bäume, Büsche und Steine
// auf dem Feld verschwinden beim Bauen von selbst (W.rebake) und kosten RODEN G je Stück (Vorschlag, Annahme: Frage offen).
const NATUR=new Set([T.WIESE,T.WALD,T.SAND,T.DSCH,T.SUMPF,T.MOOR,T.FELS,T.SCHNEE]),natur=t=>NATUR.has(t),RODEN=2;
const baubar=(tx,ty)=>W.inMap(tx,ty)&&!istFest(W.ix(tx,ty))&&!W.gebaeudeAt?.(tx,ty)&&(natur(W.feld[W.ix(tx,ty)])||W.feld[W.ix(tx,ty)]===T.LUDUS);
const abreissbar=k=>{const t=W.feld[k];return (t===T.PLATZ||t===T.ARENA||t===T.TRIB||istHaus(t)||istStr(t))&&ur[k]!==t;};
// Umbau nur innerhalb derselben Gebäudeart (Unterkunft ↔ Unterkunft, Schmiede ↔ Schmiede, Beastrium ↔ Beastrium)
const gruppeVon=t=>Object.values(WERKZEUG).find(w=>w.typ===t)?.gruppe||'unterkunft';
const hausBaubar=(k,typ)=>{if(istFest(k))return false;const t=W.feld[k];return natur(t)||t===T.LUDUS||(istHaus(t)&&t!==typ&&gruppeVon(t)===gruppeVon(typ));};
// Straßen dürfen auch auf den alten Weg und über eine andere Straße (Ausbau, voller Preis)
const strBaubar=(k,typ)=>{if(istFest(k)||W.gebaeudeAt?.(k%N,Math.floor(k/N)))return false;const t=W.feld[k];return natur(t)||t===T.LUDUS||t===T.WEG||(istStr(t)&&t!==typ);};

// ---------- Puppen-Bilder (4 Stufen, die Drehpuppe in 8 Drehstellungen) ----------
const PW=48,PH=66,AX=24,AY=58,FRAMES=8,img=[],PK=.42;// PK: Puppen passend zu den kleinen Figuren verkleinert
function mk(){const c=document.createElement('canvas');c.width=PW;c.height=PH;const g=c.getContext('2d');g.imageSmoothingEnabled=false;return [c,g,(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}];}
function fuss(g,R){g.fillStyle='rgba(15,20,10,.3)';g.beginPath();g.ellipse(AX,AY,11,4,0,0,TAU);g.fill();R(AX-7,AY-3,14,3,'#4a3420');R(AX-5,AY-4,10,2,'#6b4a2c');}
function stroh(){const [c,g,R]=mk();fuss(g,R);R(AX-2,22,4,34,'#5e4229');R(AX-1,22,2,34,'#7a5a39');R(AX-13,27,26,3,'#5e4229');
 R(AX-7,24,14,20,'#b8963e');R(AX-6,25,12,18,'#d9b85a');for(let i=0;i<9;i++)R(AX-6+((i*5)%11),26+((i*7)%16),1,3,'#a07c2c');R(AX-7,33,14,2,'#7a5a39');
 R(AX-5,12,10,11,'#c9a64c');R(AX-4,13,8,9,'#e3c672');R(AX-3,16,2,2,'#3a2617');R(AX+1,16,2,2,'#3a2617');R(AX-2,20,4,1,'#3a2617');
 for(const s of [-1,1]){R(AX+s*13-1,25,3,2,'#d9b85a');R(AX+s*15-1,24,2,5,'#b8963e');}for(let i=0;i<4;i++)R(AX-5+i*3,43+(i%2),2,4,'#b8963e');return c;}
function holz(){const [c,g,R]=mk();fuss(g,R);R(AX-4,20,8,36,'#5e4229');R(AX-3,20,5,36,'#8a6a42');R(AX-3,20,2,36,'#a07e52');for(let y=24;y<54;y+=7)R(AX-4,y,8,1,'#4a3420');
 R(AX-5,9,10,12,'#6b4a2c');R(AX-4,10,7,10,'#9b7848');R(AX-3,13,2,2,'#2a1c12');R(AX+1,13,2,2,'#2a1c12');R(AX-2,17,4,1,'#2a1c12');R(AX-14,25,28,3,'#5e4229');
 g.fillStyle='#4a3420';g.beginPath();g.arc(AX-13,31,9,0,TAU);g.fill();g.fillStyle='#8a6a42';g.beginPath();g.arc(AX-13,31,7.5,0,TAU);g.fill();R(AX-14,24,2,14,'#5e4229');R(AX-20,30,14,2,'#5e4229');g.fillStyle='#c9a55a';g.beginPath();g.arc(AX-13,31,2,0,TAU);g.fill();
 R(AX+13,8,3,20,'#a07e52');R(AX+14,8,1,20,'#c9a878');R(AX+11,26,7,2,'#5e4229');return c;}
function ruestung(){const [c,g,R]=mk();fuss(g,R);R(AX-3,22,6,34,'#4a3420');R(AX-2,22,3,34,'#6b4a2c');R(AX-14,25,28,3,'#4a3420');
 R(AX-8,22,16,19,'#5d666c');R(AX-7,23,14,17,'#8f9aa1');R(AX-7,23,5,17,'#b4bfc5');R(AX-7,29,14,1,'#5d666c');R(AX-7,35,14,1,'#5d666c');for(let i=0;i<4;i++)R(AX-6+i*4,41,3,5,i%2?'#7a4a3a':'#96553f');
 R(AX-6,8,12,13,'#5d666c');R(AX-5,9,10,11,'#9aa5ac');R(AX-5,9,4,11,'#c2ccd1');R(AX-4,14,8,2,'#20262a');R(AX-1,14,2,6,'#5d666c');R(AX-1,2,3,7,'#a32f2a');R(AX,1,3,6,'#c9483e');R(AX+2,3,2,5,'#a32f2a');
 g.fillStyle='#3a2617';g.beginPath();g.arc(AX-14,32,10,0,TAU);g.fill();g.fillStyle='#a32f2a';g.beginPath();g.arc(AX-14,32,8.5,0,TAU);g.fill();g.fillStyle='#d7b24a';g.beginPath();g.arc(AX-14,32,3,0,TAU);g.fill();R(AX-22,31,16,2,'#d7b24a');R(AX-15,24,2,16,'#d7b24a');
 R(AX+13,6,2,22,'#c2ccd1');R(AX+12,6,1,22,'#8f9aa1');R(AX+10,26,8,2,'#d7b24a');R(AX+12,28,3,4,'#4a3420');return c;}
function dreh(f){const [c,g,R]=mk(),a=f/FRAMES*TAU,cs=Math.cos(a),sn=Math.sin(a);fuss(g,R);R(AX-9,AY-5,18,3,'#3a2617');R(AX-3,16,6,40,'#4a3420');R(AX-2,16,3,40,'#7a5a39');R(AX-4,30,8,2,'#d7b24a');R(AX-4,44,8,2,'#d7b24a');
 const arm=(side,back)=>{const x=AX+cs*19*side,y=18+sn*4*side;g.strokeStyle=back?'#3a2617':'#5e4229';g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(AX,18);g.lineTo(x,y);g.stroke();
  if(side>0){const w=Math.max(3,Math.abs(cs)*9+3);g.fillStyle='#20140c';g.beginPath();g.ellipse(x,y+9,w+1.5,11,0,0,TAU);g.fill();g.fillStyle=back?'#7a2a26':'#c9483e';g.beginPath();g.ellipse(x,y+9,w,9.5,0,0,TAU);g.fill();g.fillStyle='#d7b24a';g.beginPath();g.ellipse(x,y+9,Math.max(1,w*.35),3,0,0,TAU);g.fill();}
  else{g.strokeStyle='#8f9aa1';g.lineWidth=1.5;g.beginPath();g.moveTo(x,y);g.lineTo(x-sn*3,y+12);g.stroke();g.fillStyle='#20262a';g.beginPath();g.arc(x-sn*3,y+15,5.5,0,TAU);g.fill();g.fillStyle=back?'#5d666c':'#9aa5ac';g.beginPath();g.arc(x-sn*3,y+15,4.3,0,TAU);g.fill();for(let k=0;k<6;k++){const b=k/6*TAU;R(x-sn*3+Math.cos(b)*6-1,y+15+Math.sin(b)*6-1,2,2,'#c2ccd1');}}};
 const first=sn<0?1:-1;arm(first,true);R(AX-5,6,10,12,'#5d666c');R(AX-4,7,8,10,'#9aa5ac');R(AX-4,7,3,10,'#c2ccd1');R(AX-3,11,6,2,'#20262a');R(AX-2,0,4,7,'#d7b24a');R(AX-1,0,2,6,'#f4d37a');arm(-first,false);return c;}
img[0]=[stroh()];img[1]=[holz()];img[2]=[ruestung()];img[3]=[];for(let f=0;f<FRAMES;f++)img[3].push(dreh(f));

// ---------- Tribünen-Bilder: ein Feld als Steinblock mit Sitzbänken, 4 Höhen ----------
const TW=W.TW,TH=W.TH,HOCH=r=>8+r*9,trib=[];
for(let r=1;r<=4;r++){const h=HOCH(r),c=document.createElement('canvas');c.width=TW;c.height=TH+h+2;const g=c.getContext('2d'),P=(pts,f)=>{g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(const p of pts.slice(1))g.lineTo(p[0],p[1]);g.closePath();g.fillStyle=f;g.fill();g.strokeStyle='#2a2019';g.lineWidth=1;g.stroke();};
 const A=[32,0],B=[64,16],C=[32,32],D=[0,16],d=p=>[p[0],p[1]+h];
 P([D,C,d(C),d(D)],'#8a7f6e');P([C,B,d(B),d(C)],'#a89d8a');P([A,B,C,D],'#cfc5b0');
 g.strokeStyle='#8a7f6e';g.lineWidth=2;for(const u of [.3,.66]){g.beginPath();g.moveTo(D[0]+(A[0]-D[0])*u+3,D[1]+(A[1]-D[1])*u+2);g.lineTo(C[0]+(B[0]-C[0])*u-3,C[1]+(B[1]-C[1])*u-2);g.stroke();}
 g.fillStyle='rgba(42,32,25,.35)';for(let y=h%6+4;y<h;y+=6){g.fillRect(2,16+y+1,1,1);g.beginPath();g.moveTo(1,17+y);g.lineTo(32,33+y);g.lineTo(63,17+y);g.lineWidth=.6;g.strokeStyle='rgba(42,32,25,.3)';g.stroke();}
 trib[r]=c;}
// Sitzplätze eines Tribünenfeldes (Versatz zur Feldmitte)
const SITZ=[[-16,-2],[-6,-7],[4,-11],[-7,4],[3,0],[13,-5],[2,9],[13,4]];// 8 Plätze: zwei Bankreihen

// ---------- Trainingsfelder, Puppen, Arenen ----------
let puppen=new Map(),felder=[],arenen=[],tribs=[],clock=0;const rang=new Uint8Array(N*N),neu=new Map(),fx=[],text=[];// neu: Feld → Startzeit der Aufklapp-Animation
const NB=[[1,0],[-1,0],[0,1],[0,-1]],NB8=[...NB,[1,1],[1,-1],[-1,1],[-1,-1]];// Reihen der Tribüne zählen auch über Eck
function gebiete(typ){const seen=new Uint8Array(N*N),out=[];
 for(let i=0;i<N*N;i++){if(seen[i]||W.feld[i]!==typ)continue;const tiles=[],st=[i];seen[i]=1;while(st.length){const k=st.pop();tiles.push(k);const x=k%N,y=(k/N)|0;for(const [dx,dy] of NB){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=N||ny>=N)continue;const q=ny*N+nx;if(!seen[q]&&W.feld[q]===typ){seen[q]=1;st.push(q);}}}out.push(tiles);}return out;}
function plan(tiles){const n=tiles.length,max=stufeVon(n),count=Math.floor(n/PRO);let cx=0,cy=0;for(const k of tiles){cx+=k%N;cy+=(k/N)|0;}cx/=n;cy/=n;
 const rank=k=>{const x=k%N,y=(k/N)|0;return (x%2===0&&y%2===0?0:x%2!==y%2?40:80)+Math.hypot(x-cx,y-cy);};const pick=[...tiles].sort((a,b)=>rank(a)-rank(b)).slice(0,count);
 return {n,max,count,list:pick.map((k,i)=>({k,stufe:i<Math.ceil(count/2)?max:Math.max(0,max-1)}))};}
// Arenen: jede zusammenhängende Kampffläche; Tribünen zählen dazu, wenn sie (über Tribünen) an die Fläche grenzen
function arenenRechnen(){rang.fill(0);const besitz=new Int16Array(N*N).fill(-1),out=[];
 gebiete(T.ARENA).forEach((floor,ai)=>{const a={i:ai,n:floor.length,floor,tribs:[],plaetze:0,max:0};let cx=0,cy=0;for(const k of floor){cx+=k%N+.5;cy+=((k/N)|0)+.5;}a.tx=cx/a.n;a.ty=cy/a.n;const c=W.iso(a.tx,a.ty);a.x=c.x;a.y=c.y;a.oz=W.hz?W.hz(a.tx,a.ty):0;
  let rand=floor,d=0;while(rand.length){d++;const next=[];for(const k of rand){const x=k%N,y=(k/N)|0;for(const [dx,dy] of NB8){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=N||ny>=N)continue;const q=ny*N+nx;if(W.feld[q]===T.TRIB&&!rang[q]){rang[q]=Math.min(4,d);besitz[q]=ai;a.tribs.push(q);a.max=Math.max(a.max,rang[q]);next.push(q);}}}rand=next;}
  a.plaetze=a.tribs.length*PLAETZE;a.name=ARENA_NAME(a.n);out.push(a);});
 tribs=[];for(let k=0;k<N*N;k++)if(W.feld[k]===T.TRIB){if(!rang[k])rang[k]=1;const tx=k%N,ty=(k/N)|0,c=W.iso(tx+.5,ty+.5),a=out[besitz[k]];tribs.push({k,x:c.x,y:c.y,oz:(W.hz?W.hz(tx+.5,ty+.5):0),r:rang[k],a:besitz[k],fahne:!!a&&a.max>=2&&rang[k]===a.max&&W.h2(tx,ty,41)<.34});}
 return out;}
function rechne(first){const alt=puppen,altA=arenen;puppen=new Map();felder=gebiete(T.PLATZ).map(plan);let besser=-1;
 for(const f of felder)for(const p of f.list){const o=alt.get(p.k),tx=p.k%N,ty=(p.k/N)|0,c=W.iso(tx+.5,ty+.5),d={k:p.k,x:c.x,y:c.y,oz:(W.hz?W.hz(tx+.5,ty+.5):0),stufe:p.stufe,seed:W.h2(tx,ty,31),born:o?o.born:first?-9:(neu.get(p.k)??clock)+.25,up:o?o.up:-9};
   if(o&&o.stufe<p.stufe){d.up=clock+.5+d.seed*.5;besser=Math.max(besser,p.stufe);}puppen.set(p.k,d);}
 arenen=arenenRechnen();for(const fn of horcher)try{fn();}catch(e){console.error(e);}
 return {mehr:first?0:Math.max(0,puppen.size-alt.size),besser,plaetze:arenen.reduce((s,a)=>s+a.plaetze,0)-altA.reduce((s,a)=>s+a.plaetze,0)};}
const horcher=[];

// ---------- Bauen: Werkzeug wählen, Rechteck ziehen ----------
let mode=null,drag=null,info=null;
const bar=document.querySelector('#weltUi .w-bar'),gold=document.createElement('span');gold.className='w-chip w-gold';gold.id='wGold';bar.querySelector('.w-chips').appendChild(gold);
const btn=document.createElement('button');btn.className='w-btn w-baubtn';btn.id='wBauBtn';btn.textContent='🔨 Bauen';bar.insertBefore(btn,bar.querySelector('.w-kader'));
const box=document.createElement('div');box.id='wBau';box.hidden=true;
const knopf=([id,w])=>`<button class="w-btn" data-wz="${id}">${w.name}${w.preis?' <small>'+w.preis+' G</small>':''}</button>`,WZ=Object.entries(WERKZEUG);
box.innerHTML='<div class="bau-wz">'+WZ.filter(e=>!e[1].str&&!e[1].haus&&!e[1].land&&e[0]!=='weg').map(knopf).join('')+'<button class="w-btn" data-wz="unterkunft" data-hausgruppe="unterkunft">Unterkunft ▾</button><button class="w-btn" data-wz="schmiede" data-hausgruppe="schmiede">Schmiede ▾</button><button class="w-btn" data-wz="bestium" data-hausgruppe="beast">Beastrium ▾</button><button class="w-btn" data-wz="kaserne" data-hausgruppe="kaserne">Kaserne ▾</button>'+knopf(['krankenhaus',WERKZEUG.krankenhaus])+'<button class="w-btn" data-wz="str1" data-strgruppe>Straße ▾</button><button class="w-btn" data-wz="land">Gelände <small>3 G</small></button>'+knopf(['weg',WERKZEUG.weg])+'<button class="w-btn" data-done>Fertig</button></div>'+['unterkunft','schmiede','beast','kaserne'].map(gr=>'<div class="bau-wz bau-haus" data-g="'+gr+'" hidden>'+WZ.filter(e=>e[1].haus&&(e[1].gruppe||'unterkunft')===gr).map(knopf).join('')+'</div>').join('')+'<div class="bau-wz bau-land" hidden><button class="w-btn" data-land="-1">−</button><b class="land-n">1 × 1</b><button class="w-btn" data-land="1">+</button><button class="w-btn land-glatt" data-glatt="1">'+sp('bau.glatt',null,'〰 Glätten')+'</button></div><div class="bau-wz bau-str" hidden>'+WZ.filter(e=>e[1].str).map(knopf).join('')+'</div><span></span>';
document.getElementById('weltUi').appendChild(box);
const HILFE={platz:'Rechteck auf Wiese oder Ludus-Boden ziehen. Je '+PRO+' Felder eine Puppe; ab '+STUFEN[1].ab+' Feldern '+STUFEN[1].mz+', ab '+STUFEN[2].ab+' '+STUFEN[2].mz+', ab '+STUFEN[3].ab+' '+STUFEN[3].mz+'.',
 arena:'Kampffläche ziehen: Das ist die Grundform der Arena. Größer machen: anbauen. Kleiner machen: abreißen.',
 trib:'Tribünen an die Kampffläche bauen. Jede Reihe weiter außen steht eine Stufe höher. Je Feld '+PLAETZE+' Sitzplätze.',
 unterkunft1:'Rattenloch: Strohhaufen, Ratten und ein Eimer. Billiger wird es nur noch unter freiem Himmel. Boden ziehen, der Rest verkommt von selbst.',
 unterkunft:'Mannschaftsstube: ein Bett je Mann, ein Dach ohne Löcher. Mehr Luxus wäre Verschwendung an Leuten mit kurzer Lebenserwartung. Boden ziehen.',
 schmiede1:'Rostgrube: Schmieden aus dem, was die Toten übrig lassen. Halb überdacht, halb Hof. Boden ziehen, Esse, Amboss und Schrott kommen von selbst.',
 schmiede:'Waffenschmiede: anständiges Eisen für unanständige Zwecke. Halb überdacht, halb Hof. Boden ziehen.',
 schmiede3:'Kaiserliche Waffenschmiede: Basalt, Bronze und ein vergoldeter Amboss. Hier entstehen Klingen, für die man gern stirbt. Boden ziehen.',
 bestium1:'Knochengrube: rostige Käfige, räudige Köter und Knochen von Leuten, die das Futter gebracht haben. Ganz überdacht. Boden ziehen, die Käfige kommen von selbst.',
 bestium:'Beastrium: Bruchstein, Schindeldach, Eisenkäfige für Hunde, Wölfe, Eber und Hähne. Gefüttert wird mit Resten. Du weißt, welchen. Boden ziehen.',
 bestium3:'Kaiserliche Menagerie: goldene Gitter für Löwen, Bären und Tiger. Die Tiere essen besser als deine Gladiatoren, meistens sogar deine Gladiatoren. Boden ziehen.',
 kaserne1:'Bretterbude: wacklige Ständer, rostige Klingen, Helme mit Loch. Das Loch war schon drin, als der Vorbesitzer starb. Boden ziehen, die Waffenständer kommen von selbst.',
 kaserne:'Kaserne: ordentliche Waffenständer für Schwerter, Speere, Schilde und Rüstungen. Sklaven tragen die Ausrüstung hin und her. Boden ziehen.',
 kaserne3:'Prätorianerkaserne: Marmor, Gold und Purpurbüsche. Die Rüstungen sind so schön, dass es fast schade ist, darin zu sterben. Boden ziehen.',
 krankenhaus:'Krankenhaus: Betten, nichts als Betten. Wer hier liegt, kämpft morgen wieder oder nie mehr. Boden ziehen, die Betten kommen von selbst.',
 unterkunft3:'Fürstengemächer: Mosaik, Purpur und Gold. Für Champions, die du behalten willst, bis sie jemand anders zerlegt. Boden ziehen.',
 land:'Gelände wie bei RollerCoaster Tycoon: Feld wählen, gedrückt halten und nach oben ziehen hebt, nach unten senkt. Größe mit − und +; bei 1 × 1 auch eine Ecke oder Kante. 3 G je Feld und Stufe. Gebautes bleibt, wie es ist.',
 weg:'Rechteck über Gebautes ziehen. Es wird wieder zu dem, was vorher dort war. Kein Geld zurück.'};
for(const [id,w] of Object.entries(WERKZEUG))if(w.str)HILFE[id]=w.name+': '+w.preis+' G je Feld. Rechteck oder Linie ziehen, auch über den alten Weg oder eine andere Straße (Ausbau).';
function hilfe(){box.querySelector('span').textContent=mode==='land'&&landGlatt?sp('bau.glattHilfe',{g:WERKZEUG.land.preis},'Glätten: gedrückt halten oder darüberwischen. Kanten und Klippen werden zu sanften Hängen. {g} G je Feld und Stufe. Der Landvermesser nennt es Kunst, der Totengräber Arbeitsbeschaffung.'):mode?HILFE[mode]:'';}
function setMode(m){mode=m===true?'platz':(m||null);drag=null;info=null;box.hidden=!mode;btn.classList.toggle('on',!!mode);const str=!!WERKZEUG[mode]?.str,gr=WERKZEUG[mode]?.haus?(WERKZEUG[mode].gruppe||'unterkunft'):null;box.querySelector('.bau-str').hidden=!str;box.querySelector('.bau-land').hidden=mode!=='land';landSel=null;landDrag=null;glattStopp();for(const r of box.querySelectorAll('.bau-haus'))r.hidden=r.dataset.g!==gr;for(const b of box.querySelectorAll('[data-wz]'))b.classList.toggle('on',b.dataset.strgruppe!=null?str:b.dataset.hausgruppe!=null?b.dataset.hausgruppe===gr:b.dataset.wz===mode);hilfe();W.canvas.style.cursor=mode?'crosshair':'';if(mode)M.weltLeben?.close?.();}
btn.onclick=()=>setMode(mode?null:'platz');
box.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.glatt){landGlatt=!landGlatt;glattStopp();b.classList.toggle('on',landGlatt);hilfe();return;}if(b.dataset.land){landN=clamp(landN+ +b.dataset.land,1,16);box.querySelector('.land-n').textContent=landN+' × '+landN;return;}if(b.dataset.done!=null)setMode(null);else setMode(b.dataset.wz);});
addEventListener('keydown',e=>{if(e.key==='Escape'&&mode){if(drag){drag=null;info=null;hilfe();}else setMode(null);}});
const tile=p=>{const t=(W.bodenPunkt||W.tileAt)(p.x,p.y);return {tx:clamp(Math.floor(t.tx),0,N-1),ty:clamp(Math.floor(t.ty),0,N-1)};};
const mz=(n,e,m)=>n+' '+(n===1?e:m);
function auswahl(){const x0=Math.min(drag.a.tx,drag.b.tx),x1=Math.max(drag.a.tx,drag.b.tx),y0=Math.min(drag.a.ty,drag.b.ty),y1=Math.max(drag.a.ty,drag.b.ty),ok=[],no=[],wz=WERKZEUG[mode],ab=mode==='weg';
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const k=W.ix(x,y);((ab?abreissbar(k):wz.str?strBaubar(k,wz.typ):wz.haus?hausBaubar(k,wz.typ):baubar(x,y))?ok:no).push(k);}
 const eb=!ab&&!wz.str&&ok.length?ebnenPlan(ok,wz.typ).stufen*WERKZEUG.land.preis:0;// T1: Einebnen kostet wie das Geländewerkzeug
 const NBa=window.WeltNatur?.ARTEN,rod=ab?0:ok.reduce((n,k)=>{const o=W.obj?.[k];return n+(o&&!NBa?.[o]?.flach?RODEN:0);},0);// A3b: Roden (Bäume, Büsche, Steine; Gras und Blumen nicht)
 const preis=ok.length*wz.preis+eb+rod;info={ok,no,preis,eb,rod,genug:(S.gold||0)>=preis};let t='Hier geht das nicht.';
 if(ok.length){// Ergebnis vorab ausrechnen: Felder kurz setzen, zählen, zurücksetzen
  const save=ok.map(k=>W.feld[k]);for(const k of ok)W.feld[k]=ab?ur[k]:wz.typ;
  if(ab)t=mz(ok.length,'Feld','Felder')+' abreißen';
  else{t=mz(ok.length,'Feld','Felder')+' · '+preis+' G'+(eb?' '+sp('bau.ebnenKosten',{g:eb},'(davon {g} G zum Einebnen)'):'')+(rod?' '+sp('bau.rodenKosten',{g:rod},'(davon {g} G zum Roden. Die Eichen haben nicht protestiert.)'):'')+(info.genug?'':' · zu wenig Gold');
   if(mode==='platz'){const f=plan(gebiete(T.PLATZ).find(g=>g.includes(ok[0])));t+=' → Trainingsfeld mit '+mz(f.n,'Feld','Feldern')+': '+mz(f.count,'Puppe','Puppen')+', beste: '+STUFEN[f.max].name;}
   else if(wz.haus){const h=M.weltGebaeude?.bei(ok[0]);if(h)t+=' → '+wz.name+' mit '+mz(h.n,'Feld','Feldern')+': '+(h.art==='schmiede'?mz(h.ambosse,'Amboss','Ambosse')+', halb überdacht':h.art==='beast'?mz(h.kaefige,'Käfig','Käfige'):h.art==='kaserne'?mz(h.plaetze,'Platz','Plätze')+' für Waffen und Rüstungen':h.art==='krankenhaus'?mz(h.betten,'Krankenbett','Krankenbetten'):mz(h.betten,'Schlafplatz','Schlafplätze'));}
   else if(!wz.str){const as=arenenRechnen(),a=mode==='arena'?as.find(a=>a.floor.includes(ok[0])):as.find(a=>a.tribs.includes(ok[0]));t+=a?' → '+a.name+': '+mz(a.n,'Feld','Felder')+' Kampffläche, '+a.plaetze+' Sitzplätze':' → liegt an keiner Kampffläche';}}
  ok.forEach((k,i)=>W.feld[k]=save[i]);arenenRechnen();}
 if(!ab&&no.some(istAP))t=ok.length?t+' · '+apText():apText();// A3b
 box.querySelector('span').textContent=t;}
function baue(frei){const {ok,preis,genug}=info,wz=WERKZEUG[mode],ab=mode==='weg';if(!ok.length)return;if(!frei&&!genug){M.ui.notify?.('Zu wenig Gold: '+preis+' G nötig, '+Math.floor(S.gold||0)+' G da.');return;}
 const a=drag.a,betten0=M.weltGebaeude?.betten()||0,amb0=M.weltGebaeude?.ambosse?.()||0;const kf0=M.weltGebaeude?.kaefige?.()||0;let cx=0,cy=0;if(!ab&&!wz.str)ebnen(ok,wz.typ);
 for(const k of ok){W.feld[k]=ab?ur[k]:wz.typ;const x=k%N,y=(k/N)|0;neu.set(k,clock+Math.hypot(x-a.tx,y-a.ty)*.045);const c=W.iso(x+.5,y+.5);cx+=c.x;cy+=c.y-(W.hz?W.hz(x+.5,y+.5):0);}cx/=ok.length;cy/=ok.length;
 if(!frei)S.gold=(S.gold||0)-preis;W.rebake(ok);const r=rechne(false);if(frei)return;try{M.sound?.(ab?'land':'coin');}catch(e){}
 let d=0;const say=(s,col)=>{text.push({x:cx,y:cy-30,t:-d,s,col});d+=.6;};if(preis)say('−'+preis+' G','#f29b83');if(r.mehr)say('+'+mz(r.mehr,'Puppe','Puppen'),'#f4d37a');if(r.besser>=0)say('Bessere Puppen: '+STUFEN[r.besser].mz+'!','#fff2b0');
 const bd=(M.weltGebaeude?.betten()||0)-betten0;if(bd>0)say('+'+mz(bd,'Schlafplatz','Schlafplätze'),'#f4d37a');if(bd<0)say(bd+' Schlafplätze','#f29b83');const ad=(M.weltGebaeude?.ambosse?.()||0)-amb0;if(ad>0)say('+'+mz(ad,'Amboss','Ambosse'),'#f4d37a');if(ad<0)say(ad+' Ambosse','#f29b83');const kd=(M.weltGebaeude?.kaefige?.()||0)-kf0;if(kd>0)say('+'+mz(kd,'Käfig','Käfige'),'#f4d37a');if(kd<0)say(kd+' Käfige','#f29b83');
 if(r.plaetze>0)say('+'+r.plaetze+' Sitzplätze','#f4d37a');if(r.plaetze<0)say(r.plaetze+' Sitzplätze','#f29b83');zeigeGold();}
H.pointer=(phase,p)=>{if(!mode)return false;if(mode==='land')return landZeiger(phase,p);if(phase==='down'){const t=tile(p);drag={a:t,b:t};auswahl();return true;}if(!drag)return true;
 if(phase==='move'){const t=tile(p);if(t.tx!==drag.b.tx||t.ty!==drag.b.ty){drag.b=t;auswahl();}}else if(phase==='up'){drag.b=tile(p);auswahl();baue();drag=null;info=null;setTimeout(()=>{if(mode&&!drag)hilfe();},2600);}else{drag=null;info=null;hilfe();}return true;};
// ---------- Geländewerkzeug wie in RollerCoaster Tycoon Classic ----------
// Auswahl n × n Felder (− / +). Drücken und nach oben ziehen hebt, nach unten senkt, je HZ Weltpunkte eine Stufe. Heben bringt
// die tiefsten Ecken der Auswahl eine Stufe hoch (erst einebnen, dann alles heben), Senken umgekehrt. Bei 1 × 1 wählt die Lage
// des Zeigers eine Ecke, eine Kante oder das ganze Feld. Nachbarfelder bleiben, wie sie sind (Klippe). Gebautes und der Weg
// bleiben unberührt. Kosten: Preis je geändertem Feld und Stufe. Liegt ein Feld danach unter dem Wasserspiegel, wird es Wasser.
let landN=1,landSel=null,landDrag=null;
function landAuswahl(p){if(!W.bodenPunkt||!W.hc)return null;const q=W.bodenPunkt(p.x,p.y),tx=Math.floor(q.tx),ty=Math.floor(q.ty);if(!W.inMap(tx,ty))return null;
 if(landN===1){const u=q.tx-tx,v=q.ty-ty;let c=-1,bd=.28;[[0,0],[1,0],[1,1],[0,1]].forEach(([a,b],i)=>{const d=Math.hypot(u-a,v-b);if(d<bd){bd=d;c=i;}});
  if(c>=0)return {ks:[W.ix(tx,ty)],ecken:[c]};if(Math.min(u,1-u,v,1-v)<.18)return {ks:[W.ix(tx,ty)],ecken:v<.18?[0,1]:u>.82?[1,2]:v>.82?[2,3]:[3,0]};}
 const h=(landN-1)>>1,ks=[];for(let y=ty-h;y<ty-h+landN;y++)for(let x=tx-h;x<tx-h+landN;x++)if(W.inMap(x,y))ks.push(W.ix(x,y));return {ks,ecken:null};}
function feldFix(k,dir){const h=W.hc;for(let n=0;n<4;n++)for(let c=0;c<4;c++){const a=k*4+c,b=k*4+((c+1)&3);if(Math.abs(h[a]-h[b])<=1)continue;
 if(dir>0){if(h[a]<h[b])h[a]=h[b]-1;else h[b]=h[a]-1;}else{if(h[a]>h[b])h[a]=h[b]+1;else h[b]=h[a]+1;}}}
// Eine Stufe heben (dir 1) oder senken (−1). Gibt die geänderten Felder zurück, oder null, wenn es nicht geht (Gold, Grenze).
function landSchritt(sel,dir,frei){const hc=W.hc,ks=sel.ks.filter(k=>W.BODEN_NATUR.has(W.feld[k])&&!istAP(k)),alt=new Map(),neu2=[];if(ks.length<sel.ks.length&&sel.ks.some(istAP))apMelden();if(!ks.length)return [];
 for(const k of ks)alt.set(k,hc.slice(k*4,k*4+4));
 if(sel.ecken){const k=ks[0];for(const c of sel.ecken)hc[k*4+c]+=dir;feldFix(k,dir);neu2.push(k);}
 else{let z=dir>0?127:-128;for(const k of ks)for(let c=0;c<4;c++)z=dir>0?Math.min(z,hc[k*4+c]):Math.max(z,hc[k*4+c]);
  for(const k of ks){let an=false;for(let c=0;c<4;c++)if(hc[k*4+c]===z){hc[k*4+c]+=dir;an=true;}if(an)neu2.push(k);}}
 const preis=neu2.length*WERKZEUG.land.preis,raus=neu2.some(k=>{for(let c=0;c<4;c++){const v=hc[k*4+c];if(v<-12||v>60)return true;}return false;});
 if(raus||(!frei&&(S.gold||0)<preis)){for(const [k,v] of alt)hc.set(v,k*4);if(!raus)M.ui.notify?.('Zu wenig Gold: '+preis+' G nötig.');return null;}
 if(!frei)S.gold=(S.gold||0)-preis;for(const k of neu2){for(let c=0;c<4;c++)W.merkeHoehe(hc[k*4+c]);W.gelaendeTyp(k);}
 if(neu2.length){W.rebake(neu2);zeigeGold();}return neu2;}
function landZeiger(phase,p){if(landGlatt){if(phase==='down'){landSel=landAuswahl(p);glattStopp();if(glattSchritt(landSel)!==null)glattUhr=setInterval(()=>{if(glattSchritt(landSel)===null)glattStopp();},220);}
  else if(phase==='move'){if(glattUhr)landSel=landAuswahl(p);}else glattStopp();return true;}
 if(phase==='down'){landSel=landAuswahl(p);landDrag=landSel&&{y0:p.y,n:0};return true;}
 if(phase==='move'&&landDrag){const ziel=Math.round((landDrag.y0-p.y)/(W.HZ||8));while(landDrag.n!==ziel){const d=ziel>landDrag.n?1:-1;if(!landSchritt(landSel,d)){landDrag.n=ziel;break;}landDrag.n+=d;try{M.sound?.('land');}catch(e){}}return true;}
 if(phase==='up'||phase==='cancel')landDrag=null;return true;}
W.canvas.addEventListener('pointermove',e=>{if(mode!=='land'||landDrag)return;const r=W.canvas.getBoundingClientRect();landSel=landAuswahl(W.toWorld(e.clientX-r.left,e.clientY-r.top));});
// Bauen auf schrägem Boden: die Fläche wird eingeebnet, auf die Höhe eines gleichartigen ebenen Nachbarn, sonst auf den Mittelwert
// T1: ebnenPlan sagt vorab Höhe und Stufen (je Feld die größte Abweichung einer Ecke); bezahlt wird in baue() über den Preis
function ebnenPlan(ok,typ){const hc=W.hc;if(!W.ebnen||!hc)return {L:0,stufen:0};const set=new Set(ok);let L=null;
 for(const k of ok){for(const n of [k-1,k+1,k-N,k+N])if(n>=0&&n<N*N&&!set.has(n)&&W.feld[n]===typ&&hc[n*4]===hc[n*4+1]&&hc[n*4]===hc[n*4+2]&&hc[n*4]===hc[n*4+3]){L=hc[n*4];break;}if(L!=null)break;}
 if(L==null){let s=0;for(const k of ok)for(let c=0;c<4;c++)s+=hc[k*4+c];L=Math.round(s/ok.length/4);}
 let stufen=0;for(const k of ok){let m=0;for(let c=0;c<4;c++)m=Math.max(m,Math.abs(hc[k*4+c]-L));stufen+=m;}return {L,stufen};}
function ebnen(ok,typ){const e=ebnenPlan(ok,typ);if(e.stufen)W.ebnen(ok,e.L);}
// ---------- Glätten (T1, Thomas 13.11.2026) ----------
// Gedrückt halten oder darüberwischen: Jede Ecke der Auswahl geht alle 0,22 s eine Stufe auf das Mittel ihrer Umgebung zu
// (auch der Nachbarfelder), so werden Kanten und Klippen zu sanften Hängen. Gebautes und Wege bleiben. 3 G je Feld und Stufe.
let landGlatt=false,glattUhr=null;
function glattSchritt(sel){const hc=W.hc;if(!sel||!hc)return null;const ks=sel.ks.filter(k=>W.BODEN_NATUR.has(W.feld[k])&&!istAP(k));if(ks.length<sel.ks.length&&sel.ks.some(istAP))apMelden();if(!ks.length)return [];
 let x0=N,y0=N,x1=0,y1=0;for(const k of ks){const x=k%N,y=(k/N)|0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
 const gx=x0-1,gy=y0-1,w=x1-x0+4,h=y1-y0+4,p=new Float32Array(w*h),ziel=new Float32Array(w*h);
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){const X=gx+i,Y=gy+j;let s=0,n=0;
  for(const [fx,fy,c] of [[X,Y,0],[X-1,Y,1],[X-1,Y-1,2],[X,Y-1,3]])if(W.inMap(fx,fy)){s+=hc[W.ix(fx,fy)*4+c];n++;}p[j*w+i]=n?s/n:0;}
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){let s=0,n=0;for(let b=-1;b<=1;b++)for(let a=-1;a<=1;a++){const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=w||jj>=h)continue;s+=p[jj*w+ii];n++;}ziel[j*w+i]=s/n;}
 const alt=new Map(),neu2=[];for(const k of ks){const x=k%N,y=(k/N)|0;alt.set(k,hc.slice(k*4,k*4+4));let an=false;
  [[x,y],[x+1,y],[x+1,y+1],[x,y+1]].forEach(([X,Y],c)=>{const z=ziel[(Y-gy)*w+(X-gx)],v=hc[k*4+c];if(z-v>=.6){hc[k*4+c]++;an=true;}else if(v-z>=.6){hc[k*4+c]--;an=true;}});
  if(an){feldFix(k,1);neu2.push(k);}}
 const preis=neu2.length*WERKZEUG.land.preis;
 if((S.gold||0)<preis){for(const [k,v] of alt)hc.set(v,k*4);M.ui.notify?.(sp('bau.zuWenig',{g:preis},'Zu wenig Gold: {g} G nötig.'));return null;}
 if(!neu2.length)return neu2;S.gold=(S.gold||0)-preis;for(const k of neu2){for(let c=0;c<4;c++)W.merkeHoehe(hc[k*4+c]);W.gelaendeTyp(k);}
 W.rebake(neu2);zeigeGold();try{M.sound?.('land');}catch(e){}return neu2;}
function glattStopp(){if(glattUhr){clearInterval(glattUhr);glattUhr=null;}}
function zeigeGold(){gold.textContent='💰 '+Math.floor(S.gold||0)+' G';}
setInterval(zeigeGold,500);zeigeGold();

// ---------- Zeichnen ----------
const tick0=H.tick;H.tick=dt=>{tick0?.(dt);clock+=dt;};
function raute(ctx,k,fill,stroke){const x=k%N,y=(k/N)|0,[A,B,C,D]=W.ecken?W.ecken(k):[W.iso(x,y),W.iso(x+1,y),W.iso(x+1,y+1),W.iso(x,y+1)];ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.lineTo(C.x,C.y);ctx.lineTo(D.x,D.y);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}}
function zeichneTrib(ctx){const h=HOCH(this.r);ctx.drawImage(trib[this.r],this.x-TW/2,this.y-TH/2-h);
 if(this.fahne){const x=this.x,y=this.y-h,w=Math.sin(clock*5+this.k)*2;ctx.fillStyle='#3a2617';ctx.fillRect(x-1,y-30,2,30);ctx.fillStyle='#a32f2a';ctx.fillRect(x+1,y-30,11,8);ctx.fillStyle='#c9483e';ctx.fillRect(x+1,y-30+Math.round(w>0?1:0),9+Math.round(w),6);ctx.fillStyle='#d7b24a';ctx.fillRect(x-2,y-32,4,3);}}
const items0=H.items;H.items=(items,view)=>{items0?.(items,view);const mini=W.mini;
 for(const t of tribs){if(t.x<view.x0-40||t.x>view.x1+40||t.y<view.y0-30||t.y>view.y1+70)continue;if(!t.draw)t.draw=zeichneTrib;if(t.sy==null)t.sy=t.y;items.push(t);}
 for(const d of puppen.values()){if(d.x<view.x0-30||d.x>view.x1+30||d.y<view.y0-10||d.y>view.y1+70)continue;const age=clock-d.born;if(age<0)continue;
  items.push({y:d.y,oz:d.oz,draw:ctx=>{if(mini){ctx.fillStyle='#5e4229';ctx.fillRect(d.x-1,d.y-9,2,9);ctx.fillStyle=['#d9b85a','#9b7848','#9aa5ac','#c9483e'][d.stufe];ctx.fillRect(d.x-3,d.y-11,6,5);return;}
   const fr=img[d.stufe],im=fr[fr.length>1?Math.floor((clock*5+d.seed*8)%fr.length):0];let s=1,dy=0;
   if(age<.55){const u=age/.55;s=u<.6?u/.6*1.18:1.18-(u-.6)/.4*.18;dy=-Math.sin(Math.min(1,u*1.4)*Math.PI)*14;}
   const up=clock-d.up;if(up>=0&&up<.9){s*=1+Math.sin(up/.9*Math.PI)*.22;}
   ctx.save();ctx.translate(Math.round(d.x),Math.round(d.y+dy*PK));ctx.scale(s*PK,s*PK);ctx.imageSmoothingEnabled=W.detail;ctx.drawImage(im,-AX,-AY);
   if(up>=0&&up<.9){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=(1-up/.9)*.8;ctx.drawImage(im,-AX,-AY);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    for(let i=0;i<7;i++){const a=i/7*TAU+d.seed*6,r=10+up*34,x=Math.cos(a)*r,y=-30+Math.sin(a)*r*.6-up*18,z=3*(1-up/.9);ctx.fillStyle=i%2?'#fff2b0':'#ffd65a';ctx.fillRect(x-z/2,y-z*1.5,z,z*3);ctx.fillRect(x-z*1.5,y-z/2,z*3,z);}}
   ctx.restore();ctx.imageSmoothingEnabled=false;
   if(age>=.3&&age<1&&!d.dust){d.dust=1;for(let i=0;i<9;i++)fx.push({x:d.x,y:d.y,vx:Math.cos(i/9*TAU)*18,vy:Math.sin(i/9*TAU)*7-4,t:0});}}});}};
const world0=H.world;H.world=(ctx,view,dt)=>{world0?.(ctx,view,dt);
 // frisch gebaute Felder: klappen der Reihe nach auf
 for(const [k,t0] of neu){const a=clock-t0;if(a>.5){neu.delete(k);continue;}if(a<0){raute(ctx,k,'rgba(40,30,18,.55)');continue;}raute(ctx,k,`rgba(255,240,190,${(.75*(1-a/.5)).toFixed(3)})`,`rgba(255,214,90,${(1-a/.5).toFixed(3)})`);}
 for(let i=fx.length-1;i>=0;i--){const d=fx[i];d.t+=dt;if(d.t>.45){fx.splice(i,1);continue;}d.x+=d.vx*dt;d.y+=d.vy*dt;ctx.globalAlpha=1-d.t/.45;ctx.fillStyle='#e8d8a8';ctx.fillRect(Math.round(d.x)-1,Math.round(d.y)-1,3,3);}ctx.globalAlpha=1;
 const z=clamp(1/W.cam.s,1,3);ctx.textAlign='center';ctx.textBaseline='middle';
 // Namensschild jeder Arena
 for(const a of arenen){if(a.x<view.x0-200||a.x>view.x1+200||a.y<view.y0-60||a.y>view.y1+60)continue;ctx.save();ctx.translate(0,-(a.oz||0));const s=a.name.toUpperCase()+(a.plaetze?' · '+a.plaetze+' PLÄTZE':'');ctx.font='bold '+Math.round(12*z)+'px ui-monospace,Menlo,Consolas,monospace';const w=ctx.measureText(s).width+10*z;
  ctx.fillStyle='rgba(18,12,9,.8)';ctx.fillRect(Math.round(a.x-w/2),Math.round(a.y-9*z),Math.round(w),Math.round(18*z));ctx.fillStyle='#f4d37a';ctx.fillText(s,Math.round(a.x),Math.round(a.y)+1);ctx.restore();}
 // Auswahl beim Ziehen
 if(mode&&info){const good=mode==='weg'?'rgba(240,120,90,.45)':info.genug?'rgba(120,220,110,.42)':'rgba(240,190,80,.42)';for(const k of info.ok)raute(ctx,k,good,mode==='weg'?'#ffb09a':info.genug?'#c8f5b0':'#ffd65a');for(const k of info.no)raute(ctx,k,'rgba(210,60,50,.3)','rgba(240,120,110,.8)');}
 if(mode==='land'&&landSel){for(const k of landSel.ks)raute(ctx,k,landSel.ecken?null:'rgba(255,240,170,.22)','#ffe9a0');if(landSel.ecken){const P=W.ecken(landSel.ks[0]);ctx.strokeStyle='#ffd65a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(P[landSel.ecken[0]].x,P[landSel.ecken[0]].y);for(const c of landSel.ecken)ctx.lineTo(P[c].x,P[c].y);ctx.stroke();for(const c of landSel.ecken){ctx.fillStyle='#ffd65a';ctx.fillRect(P[c].x-3,P[c].y-3,6,6);}}}
 // aufsteigende Schrift
 for(let i=text.length-1;i>=0;i--){const f=text[i];f.t+=dt;if(f.t>1.9){text.splice(i,1);continue;}if(f.t<0)continue;ctx.globalAlpha=f.t>1.4?1-(f.t-1.4)/.5:1;ctx.font='bold '+Math.round(15*z)+'px ui-monospace,Menlo,Consolas,monospace';const y=f.y-f.t*26*z;ctx.lineWidth=4*z;ctx.strokeStyle='#120c09';ctx.strokeText(f.s,f.x,y);ctx.fillStyle=f.col;ctx.fillText(f.s,f.x,y);}ctx.globalAlpha=1;};
// Im Baumodus öffnet Antippen keine Nahaufnahme
const tap0=H.tap;H.tap=(p,w)=>mode?true:tap0?tap0(p,w):false;

function bauen(wz,x0,y0,x1,y1,frei){const m=mode;mode=wz;drag={a:{tx:x0,ty:y0},b:{tx:x1,ty:y1}};auswahl();const r={felder:info.ok.length,preis:info.preis,genug:info.genug};baue(frei);drag=null;info=null;mode=m;hilfe();return r;}
// Start: eine Arena hinter dem Ludus (ersetzt das Arena-Tor). Kampffläche 8 × 6, zwei Reihen Tribünen, Durchgang zum Ludus.
// 2.0 (A3): dieselbe kleine Arena steht im Arena-Park, der Durchgang zeigt zum Kiesweg vom Parktor (W.ANORD.arena).
const O=W.O||0,AA=W.ANORD?.arena,R=(a,b,c,d)=>[a+O,b+O,a+c-1+O,b+d-1+O];
const durch=(AA?AA.durch:[[48,36],[49,36],[48,37],[49,37]]).map(([x,y])=>W.ix(x+O,y+O));
if(AA){bauen('arena',...R(...AA.boden),true);bauen('trib',...R(...AA.trib),true);}else{bauen('arena',45+O,30+O,52+O,35+O,true);bauen('trib',43+O,28+O,54+O,37+O,true);}for(const k of durch)W.feld[k]=ur[k];
neu.clear();W.rebake(durch);rechne(true);
M.weltBau={neuRechnen(){rechne(true);},ebnenPlan,glatt:glattSchritt,PREIS,PRO,PLAETZE,STUFEN,WERKZEUG,SITZ,HOCH,setMode,get mode(){return mode;},felder:()=>felder,puppen:()=>[...puppen.values()],arenen:()=>arenen,tribs:()=>tribs,plan,stufeVon,beiAenderung(fn){horcher.push(fn);},
 bauen(a,b,c,d,e){return typeof a==='string'?bauen(a,b,c,d,e):bauen('platz',a,b,c,d);},
 // Test: Geländewerkzeug an Feld (tx,ty), Größe n, Stufen (+ heben, − senken), ecken z. B. [0] oder [0,1] bei n = 1
 gelaende(tx,ty,n=1,stufen=1,ecken=null,frei=false){const h=(n-1)>>1,ks=[];if(ecken)ks.push(W.ix(tx,ty));else for(let y=ty-h;y<ty-h+n;y++)for(let x=tx-h;x<tx-h+n;x++)if(W.inMap(x,y))ks.push(W.ix(x,y));const sel={ks,ecken},d=Math.sign(stufen),out=new Set();for(let i=0;i<Math.abs(stufen);i++){const r=landSchritt(sel,d,frei);if(!r)break;r.forEach(k=>out.add(k));}return [...out];}};
})();
