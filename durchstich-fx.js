'use strict';
// =====================================================================================================
// DURCHSTICH-NAHAUFNAHMEN (durchstich-fx.js) · M.pierceFx · reine Darstellung, kein Spielzustand, kein Zufall aus dem Spiel
// Filmische Großaufnahme: die Waffe dringt ein, geht ganz durch (Spitze tritt hinten aus), hält, wird herausgerissen.
// Stellen: Brust, Bauch, Kopf, Hals, Schulter, Oberarm, Unterarm, Hand, Oberschenkel, Unterschenkel, Fuß; dazu „Schädel zertrümmert“.
// Im Stehen kommt die Waffe von der Seite, am Boden (Abstechen) von oben. Haut, Haar, Kleidung und Rüstung vom echten Gladiator.
// Bisher nur im Gang-Editor geladen (gang-editor.html).
// =====================================================================================================
(()=>{
const M=window.MG,TAU=Math.PI*2,cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),ease=v=>{v=cl(v);return v*v*(3-2*v);},easeIn=v=>cl(v)*cl(v);
const FW=240,FH=135,DUR=2.9;
const mix=(a,b,k)=>{const p=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)),x=p(a),y=p(b);return '#'+x.map((v,i)=>Math.max(0,Math.min(255,Math.round(v+(y[i]-v)*k))).toString(16).padStart(2,'0')).join('');};
const hex=c=>/^#[0-9a-f]{6}$/i.test(c||'')?c:'#b98a63';
function rand(seed){let s=(seed>>>0)||1;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return ((s>>>0)%100000)/100000;};}
// Stelle des Spiels → Ansicht
const VIEW={head:'head',neck:'neck',chest:'chest',belly:'belly',ls:'shoulder',rs:'shoulder',lua:'upperarm',rua:'upperarm',lfa:'forearm',rfa:'forearm',lh:'hand',rh:'hand',lt:'thigh',rt:'thigh',lsh:'shin',rsh:'shin',lf:'foot',rf:'foot'};
const PART_NAME={head:'KOPF',neck:'HALS',chest:'BRUSTKORB',belly:'BAUCH',shoulder:'SCHULTER',upperarm:'OBERARM',forearm:'UNTERARM',hand:'HAND',thigh:'OBERSCHENKEL',shin:'UNTERSCHENKEL',foot:'FUSS'};
// Anatomische Beschriftung (deutsch · lateinisch); Seite wird angehängt
const ANAT={
 chest:[['zwischen 4. und 5. Rippe','Spatium intercostale IV','Lunge durchbohrt','Pulmo'],['5. Rippe gebrochen','Costa V','Lunge durchbohrt','Pulmo'],['Brustbein durchstoßen','Sternum','Herzbeutel aufgerissen','Pericardium'],['7. Rippe gesplittert','Costa VII','Zwerchfell durchstoßen','Diaphragma']],
 belly:[['Bauchdecke durchstoßen','M. rectus abdominis','Dünndarm zerrissen','Intestinum tenue'],['unter dem Rippenbogen','Arcus costalis','Leber durchbohrt','Hepar'],['seitlich der Lende','Regio lumbalis','Niere durchstochen','Ren'],['links unter den Rippen','Hypochondrium','Milz aufgerissen','Splen']],
 head:[['Schläfe durchstoßen','Os temporale','Gehirn verletzt','Cerebrum'],['durch die Augenhöhle','Orbita','Schädelbasis gesplittert','Basis cranii'],['Oberkiefer durchstoßen','Maxilla','Zunge durchbohrt','Lingua']],
 neck:[['Halsschlagader durchtrennt','A. carotis communis','Luftröhre verletzt','Trachea'],['Kehlkopf durchstoßen','Larynx','Speiseröhre durchbohrt','Oesophagus'],['3. Halswirbel gesplittert','Vertebra cervicalis III (C3)','Rückenmark verletzt','Medulla spinalis']],
 shoulder:[['Schulterblatt durchstoßen','Scapula','Schultergelenk zerstört','Articulatio humeri'],['unter dem Schlüsselbein','Clavicula','Armgeflecht verletzt','Plexus brachialis']],
 upperarm:[['Bizeps durchbohrt','M. biceps brachii','Oberarmknochen gesplittert','Humerus'],['Trizeps durchstoßen','M. triceps brachii','Armschlagader angestochen','A. brachialis']],
 forearm:[['Elle gesplittert','Ulna','Beugesehnen durchtrennt','Tendines flexorum'],['Speiche durchstoßen','Radius','Unterarm durchbohrt','Antebrachium']],
 hand:[['Mittelhand durchbohrt','Ossa metacarpi','Handwurzel zerstört','Carpus']],
 thigh:[['Oberschenkelmuskel durchbohrt','M. quadriceps femoris','Oberschenkelschlagader angestochen','A. femoralis'],['Oberschenkelknochen gesplittert','Femur','Ischiasnerv verletzt','N. ischiadicus']],
 shin:[['Schienbein gesplittert','Tibia','Wade durchbohrt','M. gastrocnemius'],['Wadenbein durchstoßen','Fibula','Schienbeinmuskel zerrissen','M. tibialis anterior']],
 foot:[['Fuß durchbohrt','Ossa metatarsi','Sprunggelenk verletzt','Articulatio talocruralis']],
 crush:[['Schädeldecke eingeschlagen','Os parietale','Impressionsfraktur','Fractura impressionis'],['Hinterhaupt zertrümmert','Os occipitale','Gehirn gequetscht','Contusio cerebri'],['Stirnbein eingedrückt','Os frontale','Trümmerbruch','Fractura comminuta']]};
const SIDE=id=>id&&id[0]==='l'&&id.length>2?['links','sinister']:id&&id[0]==='r'&&id.length>2?['rechts','dexter']:null;
function labelFor(shot){const list=ANAT[shot.kind==='crush'?'crush':shot.view]||[['durchbohrt','','','']],L=list[(shot.seed>>>3)%list.length],s=SIDE(shot.part);
 return {title:shot.kind==='crush'?'SCHÄDEL ZERTRÜMMERT':shot.down?'ABGESTOCHEN':'DURCHSTICH',part:shot.kind==='crush'?'KOPF':PART_NAME[shot.view]||'',de:L[0]+(L[2]?' · '+L[2]:'')+(s?' · '+s[0]:''),la:L[1]+(L[3]?' · '+L[3]:'')+(s?' '+s[1]:'')};}

// Waffenbild: 'spear' (Schaft + Blatt), 'trident', 'blade' (Klinge + Parierstange + Griff), 'dagger', 'blunt'
const WTYPE=id=>({spear:'spear',javelin:'spear',halberd:'spear',trident:'trident',dagger:'dagger',club:'blunt',mace:'blunt',hammer:'blunt'})[id]||'blade';
const BLADE_W={dagger:5,gladius:7,short:7,rapier:4,long:7,greatsword:9,axe:7,doubleaxe:7};

// shot: {part, view, kind:'pierce'|'crush', down, weapon, att, def (Gladiatoren), seed}
function make(o){const view=VIEW[o.part]||'chest';return {part:o.part,view,kind:o.kind||(WTYPE(o.weapon)==='blunt'?'crush':'pierce'),down:!!o.down,weapon:o.weapon||'gladius',att:o.att,def:o.def,attName:o.attName,defName:o.defName,seed:o.seed??((o.part||'').length*977+(o.weapon||'').length*131+7),t:0,dur:DUR};}

// ---------------------------------------------------------------- Zeichnen
let C=null,X=null;
function buf(){if(!C){C=document.createElement('canvas');C.width=FW;C.height=FH;X=C.getContext('2d');}return X;}
const R=(q,x,y,w,h,c)=>{q.fillStyle=c;q.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
function ell(q,x,y,rx,ry,c,rot=0){q.fillStyle=c;q.beginPath();q.ellipse(x,y,Math.max(.5,rx),Math.max(.5,ry),rot,0,TAU);q.fill();}
function poly(q,pts,c){q.fillStyle=c;q.beginPath();pts.forEach(([x,y],i)=>i?q.lineTo(x,y):q.moveTo(x,y));q.closePath();q.fill();}
function looks(g){const ap=g?.appearance||{},armor=(M.armorItems?.(g)||[]);return {skin:hex(ap.skin),shade:hex(ap.shade||mix(hex(ap.skin),'#000000',.3)),hair:hex(ap.hair||'#3a2a1c'),cloth:hex(ap.cloth||'#55938e'),armor:armor[0]?.material||null};}
const ARMOR_C={leather:'#7a5232',medium:'#8a7a5a',metal:'#a9b2a6'};

// Körperteil im Querschnitt, Eintritt links (vorn), Austritt rechts (hinten). Liefert Eintritts-/Austrittspunkt.
function body(q,view,L,shot,k){const sk=L.skin,sh=L.shade,hi=mix(sk,'#ffffff',.18),armor=L.armor?ARMOR_C[L.armor]:null;
 const cy=68;
 if(view==='chest'||view==='belly'||view==='shoulder'){
  const top=view==='belly'?-10:-30,x0=78,x1=168;
  // Rumpf im Profil: Brust (links) gewölbt, Rücken (rechts) gerade
  poly(q,[[x0+14,top],[x1,top],[x1+4,FH+10],[x0+4,FH+10],[x0-2,cy+34],[x0-6,cy],[x0,cy-30]],sk);
  poly(q,[[x1-10,top],[x1,top],[x1+4,FH+10],[x1-8,FH+10]],sh);
  R(q,x0-4,cy-6,3,30,hi);
  if(view==='chest'){for(let i=0;i<5;i++){const y=cy-26+i*13;q.strokeStyle=mix(sk,'#000000',.12);q.lineWidth=1;q.beginPath();q.moveTo(x0+4,y);q.quadraticCurveTo(x0+40,y+5,x1-6,y+2);q.stroke();}}
  if(view==='belly'){ell(q,x0+6,cy+20,2,3,sh);for(let i=0;i<3;i++)R(q,x0+8,cy-14+i*12,22,1,mix(sk,'#000000',.1));}
  // Kleidung / Rüstung
  const cloth=armor||L.cloth;if(view!=='shoulder')poly(q,[[x0+2,cy+40],[x1+4,cy+40],[x1+4,FH+10],[x0+2,FH+10]],cloth);
  if(armor){poly(q,[[x0+12,top],[x1,top],[x1+2,cy+40],[x0+2,cy+40],[x0-4,cy],[x0+2,cy-30]],armor);for(let i=0;i<6;i++)R(q,x0+8+i*15,cy+36,2,2,mix(armor,'#000000',.4));q.globalAlpha=.25;R(q,x0+4,cy-28,4,60,'#ffffff');q.globalAlpha=1;}
  return {entry:{x:x0-4,y:cy},exit:{x:x1+2,y:cy+2},bone:view==='chest'?'#e8e0c8':null,thick:x1-x0};}
 if(view==='head'){const hx=122,hy=cy-2,r=36;
  R(q,hx-14,hy+r-8,30,40,sk);R(q,hx+6,hy+r-8,10,40,sh);// Hals
  ell(q,hx+2,hy-6,r,r*.95,sk);ell(q,hx+12,hy,r*.7,r*.85,sh);ell(q,hx-2,hy-6,r*.9,r*.9,sk);
  poly(q,[[hx-r+2,hy+4],[hx-r+4,hy+22],[hx-r+14,hy+30],[hx+6,hy+30],[hx+16,hy+18]],sk);// Kiefer
  poly(q,[[hx-r+12,hy+30],[hx+6,hy+30],[hx+14,hy+20],[hx+18,hy+22],[hx+8,hy+33],[hx-r+14,hy+33]],sh);
  poly(q,[[hx-r+2,hy-4],[hx-r-8,hy+6],[hx-r+1,hy+10]],sk);R(q,hx-r-6,hy+6,6,2,sh);// Nase
  R(q,hx-r+8,hy-10,6,3,'#2a201a');R(q,hx-r+9,hy-9,3,2,'#f4ead2');// Auge
  R(q,hx-r+6,hy-16,10,2,mix(L.hair,'#000000',.2));// Braue
  R(q,hx-r+6,hy+20,12,2,mix(sk,'#6b2420',.35));// Mund
  ell(q,hx+8,hy+2,5,8,sh);// Ohr
  q.fillStyle=L.hair;q.beginPath();q.ellipse(hx+6,hy-14,r*.98,r*.72,0,Math.PI*.95,Math.PI*2.15);q.fill();
  if(L.armor==='metal'||L.armor==='medium'){q.fillStyle=ARMOR_C[L.armor];q.beginPath();q.ellipse(hx+4,hy-16,r*1.05,r*.75,0,Math.PI*.95,Math.PI*2.1);q.fill();R(q,hx-r+2,hy-18,r*2,4,mix(ARMOR_C[L.armor],'#000000',.3));}
  return {entry:{x:hx-r+4,y:hy-4},exit:{x:hx+r,y:hy-2},bone:'#efe6cc',thick:r*2};}
 if(view==='neck'){const x0=104,x1=142;
  ell(q,(x0+x1)/2-4,-6,34,30,sk);R(q,x0,0,x1-x0,FH,sk);R(q,x1-8,0,8,FH,sh);poly(q,[[x0,10],[x0-8,26],[x0,30]],mix(sk,'#000000',.08));// Adamsapfel
  poly(q,[[60,FH-28],[x0,FH-44],[x1,FH-44],[190,FH-24],[190,FH+4],[60,FH+4]],armor||L.cloth);
  return {entry:{x:x0-2,y:cy-10},exit:{x:x1+1,y:cy-8},bone:'#efe6cc',thick:x1-x0};}
 // Gliedmaßen senkrecht im Querschnitt
 const W={upperarm:30,forearm:24,hand:20,thigh:42,shin:28,foot:22}[view]||28,x0=120-W/2,x1=120+W/2;
 R(q,x0,-4,W,FH+8,sk);R(q,x1-W*.25,-4,W*.25,FH+8,sh);R(q,x0+2,-4,2,FH+8,hi);
 if(view==='upperarm'||view==='thigh'){ell(q,x0+W*.35,cy-6,W*.42,26,mix(sk,'#ffffff',.06));}
 if(view==='forearm'||view==='shin')R(q,x0+3,cy-40,W-6,1,mix(sk,'#000000',.12));
 if(view==='hand'){for(let i=0;i<4;i++)R(q,x0+2,FH-30+i*7,W-4,1,mix(sk,'#000000',.15));}
 if(view==='foot'){R(q,x0-30,FH-26,W+34,26,sk);R(q,x0-30,FH-6,W+34,6,'#4a3a28');}
 if(armor&&(view==='forearm'||view==='shin')){R(q,x0-1,cy-30,W+2,46,armor);for(let i=0;i<4;i++)R(q,x0+2,cy-26+i*11,W-4,2,mix(armor,'#000000',.35));}
 return {entry:{x:x0-1,y:cy},exit:{x:x1+1,y:cy+1},bone:['upperarm','forearm','thigh','shin'].includes(view)?'#efe6cc':null,thick:W};}

function weapon(q,type,wid,tipX,y,len,blood,bloodFrom){
 // Spitze bei tipX, Waffe liegt nach links
 const steel='#dfe4d2',edge='#8f9a92',dark='#5d6660',wood='#7a5232',woodD='#5a3c22';
 if(type==='spear'||type==='trident'){
  const bl=type==='trident'?22:30;R(q,tipX-len,y-2,len-bl+4,5,wood);R(q,tipX-len,y+2,len-bl+4,1,woodD);
  if(type==='trident'){R(q,tipX-bl-4,y-11,5,23,dark);for(const dy of [-9,0,9]){R(q,tipX-bl,y+dy-1.5,bl-4,3,steel);poly(q,[[tipX-5,y+dy-2.5],[tipX,y+dy],[tipX-5,y+dy+2.5]],steel);}}
  else{poly(q,[[tipX-bl,y-1],[tipX-bl*.55,y-5],[tipX,y],[tipX-bl*.55,y+5],[tipX-bl,y+1]],steel);R(q,tipX-bl*.9,y,bl*.85,1,edge);R(q,tipX-bl-5,y-3,6,7,dark);}}
 else if(type==='blunt'){}
 else{const bw=BLADE_W[wid]||6,bl=Math.max(len-26,40);
  poly(q,[[tipX-bl,y-bw/2],[tipX-8,y-bw/2],[tipX,y],[tipX-8,y+bw/2],[tipX-bl,y+bw/2]],steel);R(q,tipX-bl,y-.5,bl-6,1,edge);
  R(q,tipX-bl-4,y-bw/2-6,4,bw+12,dark);R(q,tipX-bl-24,y-2.5,20,5,'#4a3424');R(q,tipX-bl-28,y-3.5,4,7,'#c9a85e');}
 // Blut auf dem Teil, das durch den Körper gegangen ist
 if(blood>0){q.globalAlpha=cl(blood);for(let x=bloodFrom;x<tipX-2;x+=2)R(q,x,y-1+((x*7)%3)-1,2,2,(x%4)?'#9d2f2a':'#c9584a');q.globalAlpha=1;}}

function blunt(q,wid,cx,cy,ang,s){q.save();q.translate(cx,cy);q.rotate(ang);const steel='#9aa49c',dark='#4d5450';
 R(q,-70,-3,62,6,'#6b4a2c');// Stiel
 if(wid==='hammer'){R(q,-12,-14,20,28,steel);R(q,-12,-14,20,4,mix(steel,'#ffffff',.3));R(q,8,-10,4,20,dark);}
 else if(wid==='mace'){ell(q,0,0,13,13,steel);for(let i=0;i<8;i++){const a=i/8*TAU;poly(q,[[Math.cos(a)*11-2*Math.sin(a),Math.sin(a)*11+2*Math.cos(a)],[Math.cos(a)*20,Math.sin(a)*20],[Math.cos(a)*11+2*Math.sin(a),Math.sin(a)*11-2*Math.cos(a)]],dark);}}
 else{ell(q,0,0,12,10,'#7a5232');ell(q,-3,-3,6,4,'#9a6e44');}
 q.restore();}

// Teilchen analytisch aus der Zeit (kein gespeicherter Zustand)
function spray(q,rnd,n,x,y,t,t0,dir,spread,speed,grav,col,size=2){if(t<t0)return;const dt=t-t0;for(let i=0;i<n;i++){const a=dir+(rnd()-.5)*spread,v=speed*(.35+rnd()*.9),life=.5+rnd()*1.2,s=size*(.6+rnd()*.9);if(dt>life)continue;
 const px=x+Math.cos(a)*v*dt,py=y+Math.sin(a)*v*dt+.5*grav*dt*dt;q.globalAlpha=cl(1-dt/life+.3);R(q,px,py,s,s,i%3?col:'#c9584a');}q.globalAlpha=1;}

function hole(q,p,r,dark,rnd,ragged){ell(q,p.x,p.y,r*.55,r,'#3a1210');ell(q,p.x,p.y,r*.35,r*.7,dark);if(ragged)for(let i=0;i<7;i++){const a=rnd()*TAU;R(q,p.x+Math.cos(a)*r*.6,p.y+Math.sin(a)*r,2,2,'#c9584a');}}
function drips(q,p,t,t0,n,rnd,max){if(t<t0)return;for(let i=0;i<n;i++){const ox=(rnd()-.5)*8,sp=14+rnd()*24,len=Math.min(max,(t-t0)*sp-i*2);if(len>0){R(q,p.x+ox,p.y+2,2,len,'#8f2a24');R(q,p.x+ox,p.y+2+len,2,2,'#a8372f');}}}

// Eine Aufnahme zum Zeitpunkt t (Sekunden) in den Puffer malen
function paint(shot,t){const q=buf(),rnd=rand(shot.seed),L=looks(shot.def),type=WTYPE(shot.weapon);
 q.setTransform(1,0,0,1,0,0);q.imageSmoothingEnabled=false;
 // Hintergrund: dunkler Sand mit roter Glut
 const g=q.createRadialGradient(FW/2,FH/2,10,FW/2,FH/2,FW*.7);g.addColorStop(0,'#5a3220');g.addColorStop(1,'#140a07');q.fillStyle=g;q.fillRect(0,0,FW,FH);
 if(shot.down){R(q,0,FH-16,FW,16,'#7d6643');for(let i=0;i<30;i++)R(q,rnd()*FW,FH-16+rnd()*16,2,1,'#5e4c32');}
 // Wackeln beim Einschlag
 const hitT=shot.kind==='crush'?.42:.34,shake=t>hitT&&t<hitT+.25?(1-(t-hitT)/.25)*5:0,sx=Math.sin(t*90)*shake,sy=Math.cos(t*73)*shake;
 q.save();q.translate(sx,sy);
 const DN=shot.down&&shot.kind!=='crush',SC=DN&&['chest','belly','shoulder','head','neck'].includes(shot.view)?.76:1,MP=p=>DN?{x:FW/2-(p.y-FH/2)*SC,y:FH/2+(p.x-FW/2)*SC+6}:p,RD=d=>d+(DN?Math.PI/2:0);
 q.save();if(DN){q.translate(0,6);q.translate(FW/2,FH/2);q.rotate(Math.PI/2);q.scale(SC,SC);q.translate(-FW/2,-FH/2);}
 if(shot.kind==='crush'){q.restore();crush(q,shot,t,L,rnd);q.restore();return finish(q,shot,t);}
 const tIn0=.34,jolt=t>tIn0?Math.exp(-(t-tIn0)*7)*Math.sin((t-tIn0)*26)*3:0;q.translate(jolt,0);
 const B=body(q,shot.view,L,shot,0),inside=B.exit.x-B.entry.x,y=(B.entry.y+B.exit.y)/2;
 {const r2=rand(shot.seed+50);q.globalAlpha=.18;for(let i=0;i<160;i++){const px=B.entry.x+r2()*inside,py=r2()*FH;R(q,px,py,1,1,r2()<.5?'#000000':'#ffffff');}q.globalAlpha=1;}
 // Zeitplan: anfliegen, durchdringen, halten, herausreißen
 const tIn=.34,tThrough=.62,tHold=1.75,tOut=2.05,out=28,len=inside+90;
 let tip;if(t<tIn)tip=-20+(B.entry.x+20)*easeIn(t/tIn);else if(t<tThrough)tip=B.entry.x+(inside+out)*ease((t-tIn)/(tThrough-tIn));else if(t<tHold)tip=B.exit.x+out+Math.sin(t*40)*1.2;else if(t<tOut)tip=B.exit.x+out-(B.exit.x+out+60)*easeIn((t-tHold)/(tOut-tHold));else tip=-80;
 const through=t>tIn+(tThrough-tIn)*(inside/(inside+out)),pierced=t>=tIn;
 // Wunden
 if(pierced)hole(q,B.entry,4+(t>tOut?2:0),'#6b2420',rand(shot.seed+1),false);
 if(through)hole(q,B.exit,6,'#6b2420',rand(shot.seed+2),true);
 // Waffe: im Körper unsichtbar (nur vorn bis zum Eintritt und hinten ab dem Austritt zu sehen)
 if(tip>-60){q.save();q.beginPath();q.rect(-400,-400,B.entry.x+400,1000);q.rect(B.exit.x,-400,800,1000);q.clip();
  weapon(q,type,shot.weapon,tip,y,len,through?cl((t-tIn)*2):0,B.exit.x);q.restore();
  // kurz vor dem Austritt wölbt sich die Haut hinten nach außen
  if(!through&&tip>B.exit.x-14&&tip<=B.exit.x+2){const k=1-(B.exit.x+2-tip)/16;ell(q,B.exit.x+1,y,2+k*4,4+k*3,L.skin);ell(q,B.exit.x+2+k*2,y,1+k*2,2+k*2,mix(L.skin,'#a8372f',.45));}
  // Wundränder um den Schaft
  if(pierced&&tip>B.entry.x&&t<tOut){R(q,B.entry.x-2,y-4,3,8,'#6b2420');}
  if(through&&t<tOut){R(q,B.exit.x-1,y-5,3,10,'#6b2420');}}
 // Anfliegen: Tempolinien
 if(t<tIn+.06)for(let i=0;i<7;i++){const yy=y-14+i*4.5;R(q,tip-90-((i*37)%30),yy,60,1,'#ffffff22');}
 q.restore();
 // Blut (im Bild, Schwerkraft nach unten): Spritzer beim Austritt nach hinten, beim Herausreißen nach vorn und hinten
 const exitT=tIn+(tThrough-tIn)*(inside/(inside+out)),E=MP({x:B.entry.x-2,y}),Xp=MP({x:B.exit.x+3,y});
 drips(q,MP(B.entry),t,tIn+.2,3,rand(shot.seed+3),40);if(through)drips(q,MP(B.exit),t,tThrough,4,rand(shot.seed+4),55);
 spray(q,rand(shot.seed+5),46,Xp.x,Xp.y,t,exitT,RD(0),1.1,150,170,'#a8372f',2.5);
 if(B.bone)spray(q,rand(shot.seed+6),10,Xp.x,Xp.y,t,exitT,RD(0),.9,120,160,B.bone,2);
 spray(q,rand(shot.seed+7),14,E.x,E.y,t,tIn,RD(Math.PI),1.3,60,160,'#a8372f',2);
 spray(q,rand(shot.seed+8),40,E.x,E.y,t,tHold+.05,RD(Math.PI),1.2,170,170,'#a8372f',3);
 spray(q,rand(shot.seed+9),24,Xp.x,Xp.y,t,tHold+.08,RD(0),1,110,170,'#a8372f',2.5);
 if(DN&&through){const pool=Math.min(1,(t-exitT)/1.2);ell(q,Xp.x,FH-12,6+pool*30,2+pool*4,'#7a1a14');}
 // Blitz beim Eindringen
 if(t>tIn&&t<tIn+.07){q.globalAlpha=.55;R(q,0,0,FW,FH,'#ffffff');q.globalAlpha=1;}
 q.restore();return finish(q,shot,t);}

function crush(q,shot,t,L,rnd){// Schädel zertrümmert: Kopf liegt (am Boden) oder steht, Keule/Streitkolben/Hammer von oben
 const hx=120,hy=shot.down?FH-44:66,r=34,tHit=.42;
 if(shot.down){ell(q,hx+40,hy+30,70,16,mix(L.cloth,'#000000',.2));}
 const B=body(q,'head',L,shot,0);
 const k=t<tHit?0:ease((t-tHit)/.18),dent=k*14;
 if(t>=tHit){// Delle, Risse, Splitter
  ell(q,hx+4,hy-r+dent*.8,18,dent*.9+2,'#3a1210');ell(q,hx+4,hy-r+dent*.9,12,dent*.6,'#6b2420');
  const rr=rand(shot.seed+11);q.strokeStyle='#2a0e0c';q.lineWidth=1;for(let i=0;i<9;i++){const a=Math.PI*(1.05+rr()*.9),l=10+rr()*22*k;q.beginPath();q.moveTo(hx+4,hy-r+dent);q.lineTo(hx+4+Math.cos(a)*l,hy-r+dent-Math.sin(a)*l*-.9+rr()*6);q.stroke();}
  drips(q,{x:hx-6,y:hy-r+dent+4},t,tHit+.1,5,rand(shot.seed+12),60);
  spray(q,rand(shot.seed+13),50,hx+4,hy-r+dent,t,tHit,-Math.PI/2,2.6,170,220,'#a8372f',3);
  spray(q,rand(shot.seed+14),16,hx+4,hy-r+dent,t,tHit,-Math.PI/2,2.2,140,220,'#efe6cc',2);}
 // Waffe: kommt von oben links herab, schlägt ein, bleibt kurz liegen, wird wieder hochgerissen
 const P={x:hx+4,y:hy-r+dent-10},F0={x:P.x-95,y:P.y-80},u=t<tHit?easeIn(t/tHit):1,lift=t>1.5?easeIn((t-1.5)/.5):0;
 const head={x:F0.x+(P.x-F0.x)*u-lift*70,y:F0.y+(P.y-F0.y)*u-lift*80+(t>tHit&&t<tHit+.1?-3*Math.sin((t-tHit)*31):0)},ang=Math.atan2(P.y-F0.y,P.x-F0.x);
 if(t<2.1)blunt(q,shot.weapon,head.x,head.y,ang,1);
 if(t<tHit&&t>tHit-.14)for(let i=0;i<7;i++)R(q,head.x-40-i*7,head.y-34+i*6,26,1,'#ffffff44');
 if(t>tHit&&t<tHit+.07){q.globalAlpha=.6;R(q,0,0,FW,FH,'#ffffff');q.globalAlpha=1;}}

function finish(q,shot,t){// Kinobalken und Rötung am Rand
 const v=q.createRadialGradient(FW/2,FH/2,FH*.45,FW/2,FH/2,FW*.62);v.addColorStop(0,'#00000000');v.addColorStop(1,'#300000bb');q.fillStyle=v;q.fillRect(0,0,FW,FH);
 return C;}

// Auf eine Zielfläche zeichnen: Bild mittig, schwarze Balken, Beschriftung (Schreibmaschine)
function draw(ctx,W,H,shot,t,o={}){
 const img=paint(shot,t),fade=cl(Math.min(t/.15,(shot.dur-t)/.3)),bar=Math.round(H*.1);
 ctx.save();ctx.globalAlpha=fade;ctx.fillStyle='#000000ee';ctx.fillRect(0,0,W,H);
 const sc=Math.max(W/FW,(H-bar*2)/FH),fw=FW*sc,fh=FH*sc,x=Math.round((W-fw)/2),y=Math.round((H-fh)/2);
 ctx.save();ctx.beginPath();ctx.rect(0,bar,W,H-bar*2);ctx.clip();ctx.imageSmoothingEnabled=false;ctx.drawImage(img,x,y,fw,fh);
 // Blut auf der Kamera: große Spritzer beim Austritt bzw. Einschlag und beim Herausreißen, laufen langsam herunter
 const rr=rand(shot.seed+99),hits=shot.kind==='crush'?[.44]:[.52,1.8];for(const t0 of hits){if(t<t0)continue;const n=shot.kind==='crush'?9:6;for(let i=0;i<n;i++){const px=W*(.08+rr()*.84),py=bar+(H-bar*2)*(.05+rr()*.7),r=W*(.012+rr()*.03),age=t-t0,a=cl(1-(age-1)/1.2)*.85;if(a<=0)continue;
  ctx.globalAlpha=a;ctx.fillStyle=i%2?'#7a1a14':'#9d2f2a';ctx.beginPath();ctx.ellipse(px,py,r,r*(.7+rr()*.5),rr()*3,0,TAU);ctx.fill();for(let j=0;j<4;j++){const ang=rr()*TAU,d=r*(1.2+rr()*1.4);ctx.beginPath();ctx.arc(px+Math.cos(ang)*d,py+Math.sin(ang)*d,r*.18,0,TAU);ctx.fill();}
  ctx.fillRect(px-r*.12,py,r*.24,Math.min(H,age*W*.05*(.5+rr())));}}ctx.globalAlpha=1;
 // Herzschlag: rote Ränder pulsieren nach dem Treffer
 if(t>.4){const pulse=Math.max(0,Math.sin((t-.4)*7.5))**4*.35;const v=ctx.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,W*.6);v.addColorStop(0,'#00000000');v.addColorStop(1,`rgba(140,0,0,${pulse})`);ctx.fillStyle=v;ctx.fillRect(0,0,W,H);}
 ctx.restore();
 ctx.fillStyle='#000';ctx.fillRect(0,0,W,bar);ctx.fillRect(0,H-bar,W,bar);
 const L=labelFor(shot),fs=Math.max(12,Math.round(bar*.42)),tw=s=>s.slice(0,Math.max(0,Math.floor((t-.5)*38)));
 ctx.textAlign='left';ctx.font=`700 ${fs}px "Courier Prime",monospace`;ctx.fillStyle='#ff5a4a';ctx.fillText(L.title,Math.round(W*.04),Math.round(bar*.68));
 ctx.textAlign='right';ctx.fillStyle='#dfb66d';ctx.fillText(L.part,Math.round(W*.96),Math.round(bar*.68));
 ctx.textAlign='left';ctx.font=`700 ${Math.round(fs*.72)}px "Courier Prime",monospace`;ctx.fillStyle='#eae4cd';ctx.fillText(tw(L.de),Math.round(W*.04),H-Math.round(bar*.56));
 ctx.font=`italic ${Math.round(fs*.62)}px "Courier Prime",monospace`;ctx.fillStyle='#97aaa8';ctx.fillText(tw(L.la),Math.round(W*.04),H-Math.round(bar*.16));
 if(o.names&&shot.attName){ctx.textAlign='right';ctx.font=`${Math.round(fs*.6)}px "Courier Prime",monospace`;ctx.fillStyle='#97aaa8';ctx.fillText(`${shot.attName} → ${shot.defName}`,Math.round(W*.96),H-Math.round(bar*.56));}
 ctx.restore();}

M.pierceFx={make,draw,paint,labelFor,VIEW,PART_NAME,ANAT,DUR,FW,FH,WTYPE};
})();
