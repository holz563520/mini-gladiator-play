'use strict';
/* =====================================================================================================
   TROPHÄEN DER BERÜCHTIGTEN (Wunsch Thomas 27.10.)
   Jeder berüchtigte Anführer (outside-notorious.js, bosses-1…5.js) lässt bei einer gewonnenen Plünderung einen Gegenstand
   fallen, der zu ihm passt: die Maske des Maskenmanns, den Bart des Barttyps, die Krähe des Krähenmanns …
   · Der Gegenstand kommt ins Trophäenlager (S.relics) und lässt sich im Platz „Besonderer Gegenstand“ der Ausrüstungspuppe
     anlegen (g.relic = {id,type,w}). Je Gladiator ein Stück, je Stück ein Träger.
   · Wirkung: +2 Fertigkeitspunkte auf die Waffengattung des Anführers (über M.mastery, also überall, wo der Kampf die
     Waffenfertigkeit liest). Der gespeicherte Wert g.mastery bleibt unverändert; Lernen und Obergrenzen wie bisher.
   · Aussehen: Der Träger trägt das Stück dezent im Kampfbild (M.figureDecor) und in jeder Großaufnahme (M.faceOverlays).
     Der Anführer selbst trägt es groß (big:true).
   Zeichnungen (ART): fig(P,R,t,o) in Figurenkoordinaten (Kopfanker P.head = Stirn, Gesicht leicht nach +x gedreht),
   face(q,R,t,o) in Gesichtskoordinaten (0,0 = Kinn, Augen y≈−33, x≈±15), icon(q,R,t) in einem 32×32-Feld.
   ===================================================================================================== */
(()=>{
const M=window.MG;if(!M)return;
const R=window.MGRelics=M.relics={};
const clamp=(v,a,b)=>v<a?a:v>b?b:v,hash=(i,k=1)=>{const v=Math.sin(i*127.1+k*311.7)*43758.5453;return v-Math.floor(v);};
const mix=(a,b,t)=>{const p=s=>[1,3,5].map(i=>parseInt(String(s).slice(i,i+2),16)||0),x=p(a),y=p(b);return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,'0')).join('');};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// ---------- Zeichenhilfen (Gesicht/Symbol) ----------
function Q(c,fm){const s=fm.s;return (x,y,w,h,col)=>{const p=fm.to(x,y);c.fillStyle=col;c.fillRect(Math.round(p.x),Math.round(p.y),Math.max(1,Math.ceil(w*s)),Math.max(1,Math.ceil(h*s)));};}
function QE(q,x,y,rx,ry,col){for(let yy=-ry;yy<=ry;yy++){const w=rx*Math.sqrt(Math.max(0,1-(yy/(ry+.5))**2));if(w>.3)q(x-w,y+yy,w*2,1,col);}}
// Ellipsenring (außen rx/ry, innen irx/iry frei)
function QR(q,x,y,rx,ry,irx,iry,col){for(let yy=-ry;yy<=ry;yy++){const w=rx*Math.sqrt(Math.max(0,1-(yy/(ry+.5))**2)),wi=Math.abs(yy)<iry?irx*Math.sqrt(Math.max(0,1-(yy/(iry+.5))**2)):0;if(w<=.3)continue;if(wi<=.3)q(x-w,y+yy,w*2,1,col);else{q(x-w,y+yy,w-wi,1,col);q(x+wi,y+yy,w-wi,1,col);}}}
function QL(q,x0,y0,x1,y1,w,col){const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)));for(let i=0;i<=n;i++){const k=i/n;q(x0+(x1-x0)*k-w/2,y0+(y1-y0)*k-w/2,w,w,col);}}
function beard(q,c,len=26,o={}){const [base,dark,light]=c;for(let y=-24;y<len;y++){const jag=Math.round(Math.sin(y*1.7)*1.2),
  w=y<-12?0:y<2?25.5-(y+12)*.12:Math.max(4,24-(y-2)*(18/Math.max(8,len-2)));
  const row=(x0,x1)=>{for(let x=Math.round(x0);x<x1;x++){const st=hash(x*3,5),v=Math.sin(y*.5+st*9)+st*1.6;q(x,y,1,1,v>1.4?light:v<-.2?dark:base);}};
  if(y<-12){const sw=4+(y+24)*.9;row(-28,-28+sw);row(28-sw,28);}else row(-w-jag,w+jag);}
 q(-13,-16,26,4,c[0]);for(let x=-13;x<13;x+=2)q(x,-16,1,4,c[1]);q(-15,-14,6,3,c[1]);q(9,-14,6,3,c[1]);
 if(!o.noMouth){q(-7,-11,14,3,'#3a1414');q(-6,-11,12,1,'#7a3a34');q(-5,-9,10,1,'#c8b8a0');}}
R.H={Q,QE,QL,QR,beard,hash,mix,clamp};
const helmOf=(g,o)=>!!(o?.armor?.helm||o?.helmet);

// ---------- Anhänger (für Ketten) ----------
// Zeichnet eine Anhängerform v an (x,y) mit Größe k (1 = Figur, 3 = Großaufnahme/Symbol)
function charm(q,x,y,k,v,c,t){const [m,hi,dk]=[c[1]||'#d8b040',c[2]||'#fff0a0',c[3]||'#6a4a18'],u=k;
 const px=(a,b,w,h,col)=>q(x+a*u,y+b*u,w*u,h*u,col);
 switch(v){
 case 'ember':{const gl=.6+.4*Math.sin((t||0)*5);px(-1,0,3,3,'#3a1a10');px(0,1,1,1,gl>.8?'#ffe080':'#ff8a20');if(k>1){QE(q,x+.5*u,y+1.5*u,2.4*u,2.4*u,`rgba(255,140,40,${(.18*gl).toFixed(2)})`);px(-1,0,3,1,'#7a3018');}break;}
 case 'eye':px(-1,0,3,3,'#eef6ff');px(0,1,1,1,'#2a6ad0');if(k>1){px(-1,0,1,1,'#ffffff');}break;
 case 'nail':px(-1,-1,3,1,'#8a9094');px(0,0,1,4,'#6a7074');px(0,3,1,1,'#3a3e40');break;
 case 'rings':if(k>1.5){for(let i=0;i<3;i++){const cx=x+(-2.2+i*2.2)*u,cy=y+(1+(i%2)*1.2)*u;for(let j=0;j<16;j++){const a=j/16*Math.PI*2;q(cx+Math.cos(a)*1.3*u,cy+Math.sin(a)*1.3*u,Math.max(1,u*.45),Math.max(1,u*.45),j<5?hi:j>10?dk:m);}}}else for(let i=0;i<3;i++){px(-2+i*2,i%2,2,2,i===1?'#e6c040':m);px(-2+i*2,i%2,1,1,hi);}break;
 case 'coin':px(-1,0,3,3,dk);px(-1,0,2,2,m);px(-1,0,1,1,hi);break;
 case 'skull':px(-1,0,3,2,'#e8e0c8');px(-1,2,3,1,'#c8bea0');px(-1,1,1,1,'#2a2018');px(1,1,1,1,'#2a2018');break;
 case 'fang':px(-1,0,2,1,'#f4ecd8');px(-1,1,2,1,'#e8dcc0');px(0,2,1,1,'#d8c8a0');break;
 case 'claw':px(-1,0,1,1,'#2a2420');px(0,1,1,1,'#3a3430');px(0,2,1,1,'#5a5450');px(-1,3,1,1,'#7a7470');break;
 case 'key':px(-1,0,3,2,m);px(0,0,1,1,dk);px(0,2,1,3,m);px(1,3,1,1,m);break;
 case 'moon':px(-1,0,2,1,'#e8eef8');px(-2,1,1,2,'#d8e0ec');px(-1,3,2,1,'#e8eef8');break;
 case 'heart':px(-1,0,1,1,'#b0202a');px(1,0,1,1,'#b0202a');px(-1,1,3,1,'#c8303a');px(0,2,1,1,'#8a1820');break;
 case 'dice':px(-1,0,3,3,'#f0ead8');px(-1,0,1,1,'#2a2018');px(1,2,1,1,'#2a2018');px(0,1,1,1,'#2a2018');break;
 case 'feather':px(0,0,1,4,m);px(-1,1,1,2,hi);px(1,1,1,2,dk);break;
 case 'shell':px(-1,0,3,2,'#f0d8c8');px(-1,0,1,2,'#d8b0a0');px(1,0,1,2,'#d8b0a0');px(0,2,1,1,'#c89888');break;
 case 'bone':px(-1,0,1,1,'#e8e0c8');px(1,0,1,1,'#e8e0c8');px(0,1,1,2,'#d8d0b8');px(-1,3,1,1,'#e8e0c8');px(1,3,1,1,'#e8e0c8');break;
 case 'gem':px(-1,0,3,3,dk);px(0,0,1,3,m);px(-1,1,3,1,m);px(0,1,1,1,hi);break;
 case 'tooth':px(-1,0,2,2,'#f2ead2');px(-1,2,1,1,'#d8c8a0');break;
 case 'hand':px(-1,0,3,2,'#c49470');px(-1,-1,1,1,'#c49470');px(0,-2,1,2,'#c49470');px(1,-1,1,1,'#c49470');px(-1,2,3,1,'#8a2420');break;
 case 'bell':px(-1,0,3,2,m);px(-1,2,3,1,dk);px(0,3,1,1,dk);px(-1,0,1,1,hi);break;
 case 'arrow':px(0,0,1,4,'#8a6a3a');px(-1,3,3,1,'#e8e0c8');px(0,-1,1,1,'#9aa2a6');break;
 case 'hourglass':px(-1,0,3,1,dk);px(0,1,1,1,'#e8d8a0');px(-1,2,3,1,dk);break;
 case 'compass':px(-1,0,3,3,m);px(0,0,1,3,dk);px(0,1,1,1,'#c02020');break;
 case 'horseshoe':px(-2,0,1,3,'#8a9094');px(2,0,1,3,'#8a9094');px(-1,3,3,1,'#6a7074');px(-2,0,1,1,'#c8ccd0');break;
 case 'vial':px(0,0,1,1,'#8a6a3a');px(-1,1,3,3,'#3a8a40');px(-1,1,1,1,'#a0f0a0');px(0,3,1,1,'#205a28');break;
 case 'tusk':px(-1,0,2,1,'#f4ecd8');px(0,1,2,1,'#f4ecd8');px(0,2,2,1,'#e8dcc0');px(1,3,1,1,'#d8c8a0');px(1,4,1,1,'#c8b890');break;
 case 'bolt':px(0,0,2,1,m);px(-1,1,2,1,m);px(0,2,2,1,hi);px(-1,3,2,1,m);px(-1,4,1,1,hi);break;
 default:px(-1,0,3,3,m);px(-1,0,1,1,hi);}}
R.charm=charm;

// ---------- Kunstarten ----------
// fig: Figur (P), face: Großaufnahme (q), icon: 32×32-Symbol. o.big = der Anführer selbst, o.g = Träger
const ART=R.ART={};
// Kette mit Zähnen/Ohren/Knochen …
ART.teeth={fig(P,R,t,o){const {rect,chest:c,back}=P,n=o.big?7:5,w=o.big?2:2;for(let i=0;i<n;i++){const x=c.x-(n-1)+i*w,y=c.y+3+Math.round(Math.sin(i/(n-1)*Math.PI)*(o.big?3:2));rect(x,y,w,1,R.c[0]);if(!back)rect(x,y+1,1,o.big?2:1,i%3?R.c[1]:R.c[2]);}},
 face(q,R,t,o){const n=o.big?8:6;for(let i=-n;i<=n;i++){const x=i*3.6,y=7+i*i*.09;q(x-1,y-1,4.5,1,R.c[0]);if(!o.big&&i%2)continue;q(x,y,2.4,4.5,i%3?R.c[1]:R.c[2]);q(x,y,2.4,1,'#fffbe8');}},
 icon(q,R){for(let i=0;i<15;i++){const a=Math.PI*(.08+i/14*.84),x=16-Math.cos(a)*12,y=6+Math.sin(a)*14;q(x-1,y-1,2,2,R.c[0]);if(i%2===0){q(x-1,y+1,2,4,i%3?R.c[1]:R.c[2]);q(x-1,y+1,2,1,'#fffbe8');}}}};
// Band mit Anhänger
ART.pendant={fig(P,R,t,o){const {rect,chest:c,back}=P,k=o.big?1:1,d=o.big?6:5;for(let i=0;i<=d;i++){rect(c.x-d+i,c.y+Math.round(i*.8),1,1,R.c[0]);rect(c.x+d-i,c.y+Math.round(i*.8),1,1,R.c[0]);}
  if(!back)charm(rect,c.x,c.y+Math.round(d*.8)+1,k,R.v,R.c,t);},
 face(q,R,t,o){QL(q,-20,0,0,18,1.4,R.c[0]);QL(q,20,0,0,18,1.4,R.c[0]);charm(q,0,19,o.big?3.4:2.6,R.v,R.c,t);},
 icon(q,R,t){for(let i=0;i<20;i++){const a=Math.PI*(i/19),x=16-Math.cos(a)*10,y=4+Math.sin(a)*9;q(x,y,1.4,1.4,R.c[0]);}charm(q,16,14,4,R.v,R.c,t);}};
// Eisenkragen mit Kette
ART.collar={fig(P,R,t,o){const {rect,chest:c}=P,y=c.y-(o.big?11:6),w=o.big?11:9;rect(c.x-w/2,y,w,2,R.c[0]);rect(c.x-w/2,y,w,1,R.c[1]);const n=o.big?5:3;for(let k=0;k<n;k++)rect(c.x+1+(k%2),y+3+k*3,2,2,k%2?R.c[2]:R.c[0]);},
 face(q,R){q(-20,2,40,9,R.c[2]);q(-20,2,40,2,R.c[1]);q(-20,9,40,2,'#1a1c1e');for(const x of [-15,-5,5,15]){q(x-1,5,3,3,'#b8bcc0');q(x-1,5,1,1,'#ffffff');}for(let k=0;k<6;k++){const y=12+k*5.5,x=6+(k%2)*2;q(x,y,6,6,R.c[2]);q(x+1,y+1,4,4,k%2?R.c[0]:R.c[1]);q(x+2,y+2,2,2,'#2e3234');}},
 icon(q,R){QR(q,16,9,13,6,9,3,R.c[2]);q(4,8,24,4,R.c[0]);q(4,8,24,1,R.c[1]);for(let k=0;k<5;k++){q(15+(k%2)*2,13+k*3.4,3,3,k%2?R.c[2]:R.c[1]);q(16+(k%2)*2,14+k*3.4,1,1,'#1a1c1e');}}};
// Bart (an- und ablegbar: Bartstück, Zopfbart …)
ART.beard={fig(P,R,t,o){const {rect,head:h,back}=P;if(back)return;const [b,d,l]=R.c,long=R.v==='long'||o.big;
  rect(h.x-2,h.y+8,8,4,b);rect(h.x-1,h.y+12,6,long?6:3,b);if(long)rect(h.x,h.y+18,4,3,b);rect(h.x+1,h.y+10,1,long?8:4,d);rect(h.x+4,h.y+9,1,3,l);
  if(R.v==='braid'){const gold=R.c[3]||'#d8a838';rect(h.x+1,h.y+14,2,long?10:6,b);for(const y of [15,19])rect(h.x+1,h.y+y,2,1,gold);}
  if(R.v==='fork'){rect(h.x-1,h.y+15,2,4,b);rect(h.x+3,h.y+15,2,4,b);}
  if(R.v==='bones'){rect(h.x+1,h.y+13,2,1,'#efe6d0');rect(h.x+2,h.y+17,2,1,'#efe6d0');}},
 face(q,R,t,o){const [b,d,l]=R.c,len=R.v==='long'?34:R.v==='short'?14:28;beard(q,[b,d,l],len,{noMouth:true});
  if(R.v==='braid'){const gold=R.c[3]||'#d8a838';for(const sx of [-8,8]){for(let y=10;y<34;y+=2){q(sx-3,y,6,2,(y/2)%2?b:d);q(sx-1,y,2,1,l);}for(const y of [14,24]){q(sx-4,y,8,3,gold);q(sx-4,y,8,1,'#fff0a0');q(sx-4,y+2,8,1,'#8a6a18');}}}
  if(R.v==='fork'){for(const sx of [-9,9])for(let y=22;y<40;y++)q(sx-3+Math.sign(sx)*(y-22)*.25,y,6,1,(y%3)?b:d);}
  if(R.v==='bones')for(const [x,y] of [[-14,6],[11,10],[-6,16],[4,22],[-1,28]]){q(x-2,y-1,5,3,'#efe6d0');q(x-1,y,3,1,'#c8bc9e');}},
 icon(q,R){const [b,d,l]=R.c;for(let y=4;y<30;y++){const w=y<10?13:Math.max(2,13-(y-10)*.55);for(let x=16-w;x<16+w;x++){const v=Math.sin(y*.6+hash(Math.round(x),3)*9)+hash(Math.round(x),3);q(x,y,1,1,v>1.3?l:v<0?d:b);}}
  q(9,4,14,3,b);q(11,9,10,2,'#00000055');if(R.v==='braid'){const gold=R.c[3]||'#d8a838';q(10,18,4,2,gold);q(18,18,4,2,gold);q(10,24,4,2,gold);q(18,24,4,2,gold);}}};
// aufgesetzte Nase
ART.nose={fig(P,R,t,o){const {rect,head:h,back}=P;if(R.v==='bone'){if(back)return;rect(h.x+2,h.y+5,7,1,'#f0e8d0');rect(h.x+2,h.y+4,1,3,'#e0d8c0');rect(h.x+8,h.y+4,1,3,'#e0d8c0');return;}if(R.v==='ring'){if(back)return;rect(h.x+4,h.y+6,3,1,R.c[0]);rect(h.x+4,h.y+7,1,2,R.c[0]);rect(h.x+6,h.y+7,1,2,R.c[0]);rect(h.x+4,h.y+9,3,1,R.c[2]);if(o.big)rect(h.x+5,h.y+6,1,1,R.c[1]);return;}rect(h.x-6,h.y+2,o.big?(back?15:9):13,1,'#3a2414');if(back)return;rect(h.x+5,h.y+2,3,4,R.c[0]);rect(h.x+7,h.y+3,1,2,R.c[1]);rect(h.x+5,h.y+5,1,1,'#2a1a10');},
 face(q,R,t,o){if(R.v==='bone'){QL(q,-16,-17,16,-17,3,'#f0e8d0');for(const sd of [-1,1]){QE(q,sd*17,-19,2.4,2.4,'#e8e0c8');QE(q,sd*17,-15,2.4,2.4,'#e8e0c8');}q(-16,-16,32,1,'#c8bea0');return;}
  if(R.v==='ring'){const sw=Math.sin((t||0)*2.6)*1;for(let i=0;i<28;i++){const a=Math.PI*(-.1+i/27*1.2),x=Math.cos(a)*6+sw,y=-15+Math.sin(a)*6;q(x-1,y-1,2.4,2.4,i<6?R.c[1]:i>20?R.c[2]:R.c[0]);}return;}
  q(-29,-29,58,2,'#3a2414');q(-6,-31,12,17,R.c[2]);q(-5,-30,10,15,R.c[0]);for(let y=-29;y<-16;y+=3)q(-4,y,8,1,R.c[2]);q(-4,-17,3,2,'#2a1a10');q(1,-17,3,2,'#2a1a10');q(-1,-25,2,2,R.c[1]);q(-1,-25,1,1,'#ffffff');},
 icon(q,R){if(R.v==='bone'){QL(q,5,16,27,16,4,'#f0e8d0');for(const x of [5,27]){QE(q,x,13,3,3,'#e8e0c8');QE(q,x,19,3,3,'#e8e0c8');}q(6,17,20,1,'#c8bea0');return;}
  if(R.v==='ring'){for(let i=0;i<48;i++){const a=i/48*Math.PI*2;q(16+Math.cos(a)*10-1.5,16+Math.sin(a)*10-1.5,3.4,3.4,i<12?R.c[1]:i>34?R.c[2]:R.c[0]);}return;}
  q(2,8,28,2,'#3a2414');q(11,4,10,22,R.c[2]);q(12,5,8,20,R.c[0]);for(let y=7;y<24;y+=4)q(13,y,6,1,R.c[2]);q(12,22,3,3,'#2a1a10');q(17,22,3,3,'#2a1a10');q(15,9,2,3,R.c[1]);}};
// Schulterriemen mit Trophäen
ART.strap={fig(P,R,t,o){const {rect,line,chest:c,shoulders:s,back}=P;line(s.l.x,s.l.y+2,c.x+7,-30,R.c[0],o.big?2:1);if(back)return;const n=o.big?6:4;
  for(let k=0;k<n;k++){const u=(k+.5)/n,x=s.l.x+(c.x+7-s.l.x)*u,y=s.l.y+2+(-30-s.l.y-2)*u;rect(x-1,y,o.big?3:2,o.big?3:2,k%2?R.c[1]:R.c[2]);}},
 face(q,R){QL(q,-40,14,30,60,5,R.c[0]);for(let k=0;k<5;k++){const u=(k+.5)/5,x=-40+70*u,y=14+46*u;QE(q,x,y+5,3.4,5,k%2?R.c[1]:R.c[2]);QE(q,x+.8,y+5,1.6,3,'#00000044');}},
 icon(q,R){QL(q,3,4,29,28,3,R.c[0]);for(let k=0;k<5;k++){const u=(k+.5)/5,x=3+26*u,y=4+24*u;QE(q,x+2,y+3,2.6,3.4,k%2?R.c[1]:R.c[2]);QE(q,x+2.6,y+3,1,2,'#00000044');}}};
// Hörner / Geweih (auch über dem Helm)
ART.horns={fig(P,R,t,o){const {rect,head:h}=P,[c1,c2,c3]=R.c,v=R.v;if(!o.big&&!P.armored){rect(h.x-6,h.y-6,13,2,'#5a3a22');}
  for(const sd of [-1,1]){const bx=sd<0?h.x-6:h.x+7;
   if(v==='antler'){rect(bx,h.y-10,1,4,c1);rect(bx+sd*1,h.y-13,1,3,c1);rect(bx+sd*2,h.y-15,1,2,c2);rect(bx-sd*1,h.y-14,1,2,c2);if(o.big){rect(bx+sd*3,h.y-18,1,3,c3);rect(bx,h.y-17,1,2,c3);}}
   else if(v==='ram'){rect(bx-1,h.y-9,3,3,c1);rect(bx+sd*2-1,h.y-10,3,3,c1);rect(bx+sd*3-1,h.y-7,2,3,c2);rect(bx+sd*2,h.y-4,2,2,c3);}
   else if(v==='goat'){rect(bx,h.y-10,2,3,c1);rect(bx-sd,h.y-13,2,3,c1);rect(bx-sd*2,h.y-16,1,3,c2);if(o.big)rect(bx-sd*3,h.y-18,1,2,c3);}
   else{const k=o.big?1:0;rect(bx-1,h.y-9,3,2,c2);rect(bx+sd*2-1,h.y-11,3,2,c1);rect(bx+sd*3-1,h.y-13-k*2,2,2+k*2,c1);if(o.big)rect(bx+sd*2-1,h.y-19,2,2,c3);else rect(bx+sd*3-1,h.y-15,1,2,c3);}}},
 face(q,R,t,o){const [c1,c2,c3]=R.c,v=R.v,big=o.big?1:.72;
  for(const sd of [-1,1])for(let i=0;i<34;i++){const k=i/33;let x,y,w;
   if(v==='ram'){const a=k*5.2;x=sd*(22+Math.cos(a-1.2)*14*big+k*6);y=-46+Math.sin(a-1.2)*14*big+k*8;w=9-k*5;}
   else if(v==='antler'){x=sd*(24+k*36*big);y=-42-k*12*big-Math.sin(k*3)*3;w=4.4-k*2;if(i%8===4){QL(q,x,y,x-sd*1,y-12,2.6,c2);QE(q,x-sd,y-12,1.4,1.4,c3);}}
   else if(v==='goat'){x=sd*(18+k*24*big);y=-52-k*26*big+k*k*10;w=7-k*5;}
   else{x=sd*(24+k*40*big);y=-50+k*6-k*k*14;w=9-k*7;}
   q(x-w/2,y-w/2,w,w,k>.86?c3:i%5===0?c2:c1);q(x-w/2,y+w/2-1,w,1,'#00000033');}
  if(!helmOf(o.g,o)){q(-28,-58,56,6,'#5a3a22');q(-28,-58,56,1,'#8a6a4a');}},
 icon(q,R){const [c1,c2,c3]=R.c,v=R.v;for(const sd of [-1,1])for(let i=0;i<20;i++){const k=i/19;let x,y,w;
   if(v==='ram'){const a=k*5;x=16+sd*(4+Math.cos(a-1.2)*6+k*3);y=14+Math.sin(a-1.2)*6+k*4;w=4-k*2;}
   else if(v==='antler'){x=16+sd*(4+k*10);y=24-k*20;w=2;if(i%6===3)QL(q,x,y,x-sd*3,y-6,1.4,c2);}
   else if(v==='goat'){x=16+sd*(3+k*6);y=24-k*20+k*k*4;w=3.4-k*2;}
   else{x=16+sd*(4+k*11);y=20-k*4-k*k*10+k*k*k*6;w=4.4-k*3;}
   q(x-w/2,y-w/2,w,w,k>.85?c3:i%4===0?c2:c1);}
  q(8,22,16,4,'#5a3a22');q(8,22,16,1,'#8a6a4a');}};
// Bemalung (Farbtopf): Muster im Gesicht
function paintFace(q,R,t,o){const [a,b]=R.c,v=R.v;
 if(v==='spiral'){const sp=(cx,cy,r)=>{for(let i=0;i<34;i++){const k=i/33,an=k*9.5,rr=1+k*r;q(cx+Math.cos(an)*rr-1,cy+Math.sin(an)*rr-1,2,2,i%5?a:b);}};sp(-16,-16,8);sp(16,-16,8);if(o.big){sp(0,-56,7);for(let x=-22;x<23;x+=4)q(x,-46,2,2,a);}q(-2,-28,4,12,a);}
 else if(v==='stripes'){for(const sd of [-1,1])for(let k=0;k<3;k++){QL(q,sd*8,-26+k*5,sd*24,-22+k*5,2.4,k===1?b:a);}if(o.big)q(-2,-60,4,30,a);}
 else if(v==='skull'){QE(q,-14,-33,8,6,a);QE(q,14,-33,8,6,a);q(-3,-24,6,6,a);for(let x=-10;x<=10;x+=4)q(x-1,-12,2,6,a);if(o.big){q(-26,-60,52,4,b);}}
 else if(v==='pale'){q(-24,-56,48,52,'rgba(240,236,228,.38)');QE(q,-15,-33,6,5,'rgba(110,80,110,.45)');QE(q,15,-33,6,5,'rgba(110,80,110,.45)');}
 else if(v==='soot'){for(let y=-56;y<-4;y+=2)for(let x=-24;x<24;x+=2){const n=Math.sin(x*.3+y*.2)+Math.sin(x*.13-y*.4);if(n>.6)q(x,y,2,2,a);}}
 else if(v==='hand'){for(const [x,y,w,h] of [[4,-34,12,14],[6,-44,3,10],[10,-46,3,12],[14,-44,3,10],[17,-38,3,8],[0,-30,4,4]])q(x,y,w,h,a);q(6,-30,6,2,b);}
 else if(v==='dots'){for(let i=0;i<12;i++){const an=i/12*Math.PI*2;QE(q,Math.cos(an)*20,-28+Math.sin(an)*20,1.6,1.6,i%2?a:b);}}
 else if(v==='gold'){q(-24,-40,48,10,a);q(-24,-40,48,2,b);q(-24,-32,48,1,'#00000033');}
 else{q(-24,-36,48,6,a);}}
ART.paint={fig(P,R,t,o){const {rect,head:h,back}=P,[a,b]=R.c,v=R.v;if(back){rect(h.x-6,h.y-2,2,6,a);return;}
  if(v==='pale'){rect(h.x-4,h.y-3,11,12,'rgba(240,236,228,.35)');rect(h.x-2,h.y+2,2,2,'#6a4a6a');rect(h.x+3,h.y+2,2,2,'#6a4a6a');return;}
  if(v==='soot'){rect(h.x-3,h.y-2,10,4,'rgba(30,26,24,.55)');rect(h.x-2,h.y+5,8,3,'rgba(30,26,24,.4)');return;}
  if(v==='gold'){rect(h.x-4,h.y+1,12,3,a);rect(h.x-4,h.y+1,12,1,b);return;}
  if(v==='hand'){rect(h.x+3,h.y+1,4,4,a);rect(h.x+3,h.y-1,1,2,a);rect(h.x+5,h.y-2,1,3,a);return;}
  if(v==='skull'){rect(h.x-2,h.y+1,3,3,a);rect(h.x+3,h.y+1,3,3,a);rect(h.x,h.y+8,5,2,a);return;}
  if(v==='stripes'){rect(h.x-3,h.y+4,3,1,a);rect(h.x+4,h.y+4,3,1,a);rect(h.x-3,h.y+6,3,1,b);rect(h.x+4,h.y+6,3,1,b);return;}
  rect(h.x-1,h.y-6,2,o.big?6:4,a);rect(h.x+3,h.y+5,3,1,a);rect(h.x-4,h.y+5,2,1,a);if(o.big){rect(h.x+6,h.y-2,1,3,a);rect(h.x-3,h.y+6,1,3,b);}},
 face:paintFace,
 icon(q,R){const [a,b]=R.c;QE(q,16,22,10,7,'#6a4a2a');QE(q,16,20,10,4,'#8a6a3e');QE(q,16,19,8,3,a);q(10,18,6,1,b);QL(q,20,16,28,3,2.4,'#a07a4a');q(26,2,3,4,a);}};
// Ohrring
ART.earring={fig(P,R,t,o){const {rect,head:h,back}=P;const x=back?h.x+6:h.x-5,y=h.y+6;rect(x,y,1,1,R.c[0]);
  if(R.v==='bell'){rect(x-1,y+1,3,2,R.c[1]);rect(x,y+3,1,1,R.c[2]);}else if(R.v==='tooth'){rect(x,y+1,1,3,'#f2ead2');}else{rect(x-1,y+1,1,2,R.c[1]);rect(x+1,y+1,1,2,R.c[1]);rect(x,y+3,1,1,R.c[1]);}},
 face(q,R,t,o){for(const sd of o.big?[-1,1]:[1]){const x=sd*27,y=-20,sw=Math.sin((t||0)*3+sd)*1.5;q(x-.5,y,1.4,3,R.c[0]);
  if(R.v==='bell'){QE(q,x+sw,y+7,3.6,3.6,R.c[1]);q(x-3.6+sw,y+9,7.2,1.4,R.c[2]);QE(q,x+sw,y+11,1.2,1.2,R.c[2]);q(x-2+sw,y+5,1.4,1.4,'#fff8c0');}
  else if(R.v==='tooth'){q(x-1+sw,y+3,2.6,7,'#f2ead2');q(x-1+sw,y+9,1.4,2,'#d8c8a0');}
  else for(let i=0;i<20;i++){const a=i/20*Math.PI*2;q(x+Math.cos(a)*4.4+sw,y+7+Math.sin(a)*4.4,1.6,1.6,i%4?R.c[1]:R.c[2]);}}},
 icon(q,R){q(15,3,2,5,R.c[0]);if(R.v==='bell'){QE(q,16,17,8,8,R.c[1]);q(8,22,16,3,R.c[2]);QE(q,16,27,2.4,2.4,R.c[2]);q(11,13,3,3,'#fff8c0');}else if(R.v==='tooth'){q(13,8,6,18,'#f2ead2');q(13,22,3,6,'#d8c8a0');}
  else for(let i=0;i<40;i++){const a=i/40*Math.PI*2;q(16+Math.cos(a)*9,17+Math.sin(a)*9,2.4,2.4,i%5?R.c[1]:R.c[2]);}}};
// Masken (dezent: halbes Gesicht; groß: ganz)
function maskFace(q,R,t,o){const [m,d,l]=R.c,v=R.v;
 const base=(rx,ry,cy=-30)=>{QE(q,0,cy,rx+2,ry+2,'#2a1a14');QE(q,0,cy,rx,ry,m);};
 const eyes=(y,w,h,col='#0a0a0a',gap=14)=>{for(const sd of [-1,1])QE(q,sd*gap,y,w,h,col);};
 switch(v){
 case 'beak':{base(24,28);for(let y=-56;y<0;y+=6)q(-22,y,44,1,d);for(const sd of [-1,1]){QE(q,sd*12,-34,8,8,'#6a4a1c');QE(q,sd*12,-34,6,6,'#3a4a50');QE(q,sd*12,-34,4,4,'#6a8a94');q(sd*12-3,-38,2,2,'#e8f4f8');}
  for(let y=-26;y<26;y++){const k=(y+26)/52,w=11*(1-k)+1.2;q(-w,y,w*2,1,y%5?m:d);}q(-30,-30,60,2,'#4a3424');break;}
 case 'iron':{base(25,31);for(let y=-58;y<0;y+=4)q(-23,y,8,1,d);q(-2,-58,4,48,l);q(-22,-35,16,3,'#0a0a0a');q(6,-35,16,3,'#0a0a0a');for(let x=-8;x<=8;x+=4)for(let y=-14;y<-4;y+=4)q(x-1,y,2,2,'#0a0a0a');
  for(const [x,y] of [[-22,-54],[20,-54],[-24,-20],[22,-20]]){q(x-1,y-1,3,3,'#b8bcc0');q(x-1,y-1,1,1,'#ffffff');}break;}
 case 'bone':{base(24,30);eyes(-33,7,6);QE(q,0,-21,3,4,'#0a0a0a');for(let x=-12;x<=12;x+=4){q(x-1.5,-12,3,7,'#f0ead8');q(x-1.5,-12,3,1,'#0a0a0a');}for(let i=0;i<6;i++)q(-20+i*7,-52+(i%2)*3,1,8,d);break;}
 case 'gold':{base(24,29);q(-24,-48,48,3,l);eyes(-33,7,3);q(-10,-12,20,3,'#3a2a10');q(-8,-11,16,1,d);for(let x=-20;x<21;x+=5)q(x,-58,2,6,l);QE(q,0,-22,4,7,l);QE(q,-1,-24,1,4,'#fff8c0');break;}
 case 'laugh':{base(24,30);for(const sd of [-1,1])for(let i=0;i<10;i++){const a=Math.PI*(i/9);q(sd*14+Math.cos(a)*6-1,-32-Math.sin(a)*4,2,2,'#0a0a0a');}for(let i=0;i<24;i++){const a=Math.PI*(i/23);q(Math.cos(a)*14-1,-16+Math.sin(a)*8,2,2,'#0a0a0a');}QE(q,0,-10,10,3,'#0a0a0a');QE(q,-17,-22,4,3,l);QE(q,17,-22,4,3,l);break;}
 case 'weep':{base(24,30);for(const sd of [-1,1]){for(let i=0;i<10;i++){const a=Math.PI*(i/9);q(sd*14+Math.cos(a)*6-1,-34+Math.sin(a)*4,2,2,'#0a0a0a');}for(let y=-28;y<-6;y+=3)q(sd*14-1,y,2,2,l);}for(let i=0;i<20;i++){const a=Math.PI*(i/19);q(Math.cos(a)*10-1,-6-Math.sin(a)*5,2,2,'#0a0a0a');}break;}
 case 'fox':case 'wolf':case 'cat':{const ear=v==='cat'?9:13;for(const sd of [-1,1])for(let y=0;y<ear;y++){const w=(ear-y)*.9;q(sd*17-w/2,-48-y,w,1,y<2?m:y<ear-2?d:m);if(y>2&&y<ear-3)q(sd*17-w/4,-48-y,w/2,1,'#2a1a14');}
  for(let y=-50;y<-2;y++){const k=(y+50)/48,w=k<.55?27:27-(k-.55)/.45*(v==='cat'?14:19);q(-w-1,y,w*2+2,1,'#2a1a14');q(-w,y,w*2,1,m);if(k>.45)for(const sd of [-1,1])q(sd*(w*.45)-(sd<0?w*.55:0),y,w*.55,1,l);}
  q(-26,-50,52,2,d);eyes(-32,6,2.4,'#e8c040');for(const sd of [-1,1])QE(q,sd*14,-32,1.4,2.4,'#0a0a0a');QE(q,0,-16,3,2,'#0a0a0a');q(-1,-14,2,6,'#0a0a0a');for(const sd of [-1,1])q(sd*8-2,-20,4,1,d);break;}
 case 'owl':{base(24,28);for(const sd of [-1,1]){QE(q,sd*12,-32,10,10,l);QE(q,sd*12,-32,6,6,'#e8a030');QE(q,sd*12,-32,3,3,'#0a0a0a');}for(let y=-14;y<-2;y++)q(-(y+14)*.25-2,y,((y+14)*.25+2)*2,1,'#c89030');for(let y=-58;y<-46;y+=3)q(-22,y,44,1,d);break;}
 case 'boar':{base(24,28);eyes(-36,3,2,'#c02020');QE(q,0,-14,12,8,d);QE(q,-4,-14,2,3,'#0a0a0a');QE(q,4,-14,2,3,'#0a0a0a');for(const sd of [-1,1])QL(q,sd*10,-8,sd*16,-24,3,'#f4ecd8');for(const sd of [-1,1])q(sd*20-3,-58,6,10,d);break;}
 case 'demon':{base(24,30);eyes(-34,8,3,'#e02020');for(const sd of [-1,1])QL(q,sd*6,-42,sd*20,-38,3,'#0a0a0a');q(-12,-14,24,6,'#0a0a0a');for(let x=-11;x<11;x+=3)q(x,-14,2,3,'#f4ecd8');for(const sd of [-1,1])QL(q,sd*18,-56,sd*28,-74,4,l);break;}
 case 'wood':{base(24,30);for(let y=-58;y<0;y+=3)q(-22+Math.sin(y)*2,y,44,1,d);eyes(-33,5,4);q(-2,-30,4,14,l);q(-8,-10,16,3,'#0a0a0a');break;}
 case 'leather':{base(24,22,-34);eyes(-34,6,4);for(let x=-22;x<23;x+=6){q(x,-56,1,40,d);}q(-24,-18,48,2,d);for(const sd of [-1,1])q(sd*22,-40,4,2,l);break;}
 case 'exec':{for(let y=-74;y<4;y++){const k=(y+74)/78,w=y<-58?(y+74)*1.6:k<.92?29:29-(k-.92)*90;q(-w,y,w*2,1,(y%5)?m:d);}for(const sd of [-1,1]){QE(q,sd*13,-33,6,3.4,'#0a0606');QE(q,sd*13,-33,2,1.6,'#e8d8c0');}q(-6,-14,12,2,d);for(let x=-28;x<29;x+=7)q(x,-2,2,6,d);break;}
 case 'cloth':{q(-26,-24,52,26,m);for(let x=-24;x<25;x+=5)q(x,-24,1,26,d);q(-26,-24,52,2,l);break;}
 case 'mirror':{base(24,30);q(-20,-56,40,44,l);q(-20,-56,40,44,'rgba(255,255,255,.25)');const s=((t||0)*.6)%1;q(-20+s*36,-56,4,44,'rgba(255,255,255,.55)');eyes(-33,5,2);break;}
 case 'plague':case 'sack':{base(24,30);for(let i=0;i<40;i++)q(-22+hash(i,4)*44,-58+hash(i,5)*56,2,1,d);eyes(-33,5,5);for(let x=-10;x<11;x+=4)q(x,-14,1,4,'#2a1a10');q(-10,-12,20,1,'#2a1a10');break;}
 default:{base(24,30);eyes(-33,6,4);}}}
ART.mask={fig(P,R,t,o){const {rect,head:h,back}=P,[m,d,l]=R.c,v=R.v;rect(h.x-6,h.y+1,o.big?(back?15:9):13,1,'#2a1a14');if(back)return;const big=o.big;
  if(v==='beak'){rect(h.x-1,h.y-4,9,13,m);rect(h.x+7,h.y+2,5,4,m);rect(h.x+11,h.y+3,big?4:2,3,d);rect(h.x+3,h.y+1,3,3,'#3a2a14');rect(h.x+4,h.y+2,1,1,'#9ac0c8');return;}
  if(v==='exec'){rect(h.x-4,h.y-9,13,20,m);rect(h.x-2,h.y-11,9,2,m);rect(h.x,h.y-12,5,1,m);rect(h.x-1,h.y+1,3,1,'#0a0606');rect(h.x+4,h.y+1,3,1,'#0a0606');rect(h.x-4,h.y+10,13,1,d);return;}
  if(v==='cloth'){rect(h.x-3,h.y+5,11,6,m);rect(h.x-3,h.y+5,11,1,l);rect(h.x+1,h.y+6,1,5,d);return;}
  if(v==='fox'||v==='wolf'||v==='cat'){rect(h.x-3,h.y-2,11,9,m);rect(h.x-2,h.y-5,2,3,m);rect(h.x+5,h.y-5,2,3,m);rect(h.x+1,h.y+4,5,4,l);rect(h.x-1,h.y+1,2,1,'#e8c040');rect(h.x+4,h.y+1,2,1,'#e8c040');rect(h.x+3,h.y+5,1,1,'#0a0a0a');return;}
  if(v==='boar'){rect(h.x-3,h.y-2,11,11,m);rect(h.x+1,h.y+4,6,4,d);rect(h.x+1,h.y+8,1,2,'#f4ecd8');rect(h.x+6,h.y+8,1,2,'#f4ecd8');rect(h.x-1,h.y+1,1,1,'#c02020');rect(h.x+5,h.y+1,1,1,'#c02020');return;}
  if(v==='owl'){rect(h.x-3,h.y-2,11,10,m);rect(h.x-2,h.y,4,4,l);rect(h.x+3,h.y,4,4,l);rect(h.x-1,h.y+1,2,2,'#e8a030');rect(h.x+4,h.y+1,2,2,'#e8a030');rect(h.x+2,h.y+5,1,2,'#c89030');return;}
  if(v==='demon'){rect(h.x-3,h.y-2,11,11,m);rect(h.x-2,h.y+1,3,1,'#e02020');rect(h.x+4,h.y+1,3,1,'#e02020');rect(h.x-1,h.y+6,7,2,'#0a0a0a');rect(h.x-4,h.y-5,1,3,l);rect(h.x+8,h.y-5,1,3,l);return;}
  rect(h.x-3,h.y-3,11,big?13:11,m);rect(h.x-3,h.y-3,11,1,l);
  if(v==='iron'){rect(h.x+2,h.y-3,1,12,l);rect(h.x-2,h.y+1,3,1,'#0a0a0a');rect(h.x+4,h.y+1,3,1,'#0a0a0a');rect(h.x+3,h.y+5,1,2,'#0a0a0a');rect(h.x+5,h.y+5,1,2,'#0a0a0a');}
  else if(v==='bone'){rect(h.x-2,h.y+1,3,2,'#0a0a0a');rect(h.x+4,h.y+1,3,2,'#0a0a0a');for(let x=0;x<6;x+=2)rect(h.x-1+x,h.y+6,1,2,'#0a0a0a');}
  else if(v==='gold'){rect(h.x-2,h.y+1,3,1,'#0a0a0a');rect(h.x+4,h.y+1,3,1,'#0a0a0a');rect(h.x+2,h.y+2,1,3,l);rect(h.x,h.y+6,5,1,d);}
  else if(v==='laugh'){rect(h.x-2,h.y+1,3,1,'#0a0a0a');rect(h.x+4,h.y+1,3,1,'#0a0a0a');rect(h.x-1,h.y+5,1,1,'#0a0a0a');rect(h.x,h.y+6,5,1,'#0a0a0a');rect(h.x+5,h.y+5,1,1,'#0a0a0a');}
  else if(v==='weep'){rect(h.x-2,h.y+1,3,1,'#0a0a0a');rect(h.x+4,h.y+1,3,1,'#0a0a0a');rect(h.x-1,h.y+3,1,3,l);rect(h.x+5,h.y+3,1,3,l);rect(h.x+1,h.y+6,3,1,'#0a0a0a');}
  else if(v==='mirror'){rect(h.x-2,h.y-2,9,9,l);rect(h.x-1+Math.round(((t||0)*.6%1)*7),h.y-2,1,9,'#ffffffaa');}
  else{rect(h.x-2,h.y+1,3,2,'#0a0a0a');rect(h.x+4,h.y+1,3,2,'#0a0a0a');rect(h.x+1,h.y+6,4,1,d);}},
 face:maskFace,
 icon(q,R,t){const s=(x,y,w,h,c)=>q(16+(x)*.38,26+(y)*.38,w*.38,h*.38,c);maskFace(s,R,t,{big:true});}};
// Henkersstrick
ART.noose={fig(P,R,t,o){const {rect,chest:c}=P,y=c.y-(o.big?11:6);rect(c.x-5,y,11,2,R.c[0]);rect(c.x-5,y+1,11,1,R.c[1]);rect(c.x-7,y-2,3,4,R.c[1]);rect(c.x-8,y+1,2,o.big?14:9,R.c[0]);rect(c.x-9,y+(o.big?14:9),4,2,R.c[2]);},
 face(q,R){q(-18,4,36,4,'#5a2a4a');for(let x=-20;x<21;x+=3){q(x,0,3,6,(x/3)%2?R.c[0]:R.c[1]);q(x,0,1,6,'#6a4a22');}QE(q,-24,-14,6,6,R.c[1]);QE(q,-24,-14,3,3,'#6a4a22');for(let y=-8;y<42;y+=3)q(-27+Math.sin(y*.2)*1.5,y,4,3,(y/3)%2?R.c[0]:R.c[1]);for(let k=0;k<5;k++)q(-29+k*1.5,42,1,4+k%2*2,R.c[2]);},
 icon(q,R){for(let i=0;i<30;i++){const a=i/30*Math.PI*2;q(16+Math.cos(a)*8,11+Math.sin(a)*7,2.4,2.4,i%2?R.c[0]:R.c[1]);}for(let y=4;y<30;y+=2)q(7+Math.sin(y*.3),y,3,2,(y/2)%2?R.c[0]:R.c[1]);q(5,29,6,2,R.c[2]);}};
// Schürze
ART.apron={fig(P,R,t,o){const {rect,line,chest:c,shoulders:s,back}=P;if(back){line(s.l.x,s.l.y,c.x,-36,R.c[1],1);return;}line(s.l.x+2,s.l.y,c.x-2,c.y+3,R.c[1],1);line(s.r.x-1,s.r.y,c.x+3,c.y+3,R.c[1],1);
  const hgt=o.big?26:20;rect(c.x-5,c.y+3,11,hgt,R.c[0]);rect(c.x-5,c.y+3,1,hgt,R.c[1]);rect(c.x-3,c.y+8,3,2,R.c[2]);rect(c.x+2,c.y+13,2,4,R.c[2]);if(o.big){rect(c.x-4,c.y+20,2,4,R.c[2]);rect(c.x+3,c.y+25,3,2,R.c[2]);}},
 face(q,R){for(const sd of [-1,1])QL(q,sd*36,6,sd*14,40,4,R.c[1]);q(-24,30,48,40,R.c[0]);q(-24,30,48,2,R.c[1]);QE(q,-10,40,5,3,R.c[2]);QE(q,8,52,4,6,R.c[2]);q(12,36,2,9,R.c[2]);},
 icon(q,R){QL(q,9,2,12,10,2,R.c[1]);QL(q,23,2,20,10,2,R.c[1]);q(7,10,18,20,R.c[0]);q(7,10,18,1,R.c[1]);q(7,10,1,20,R.c[1]);QE(q,12,16,3,2,R.c[2]);QE(q,19,22,2,4,R.c[2]);q(4,12,4,2,R.c[1]);q(24,12,4,2,R.c[1]);}};
// Halstuch / Leichentuch
ART.scarf={fig(P,R,t,o){const {rect,chest:c,back}=P,y=c.y-6,fl=Math.round(Math.sin((t||0)*2)*1);rect(c.x-5,y,11,3,R.c[0]);rect(c.x-5,y,11,1,R.c[2]);rect(c.x-5,y+2,11,1,R.c[1]);
  if(!back){rect(c.x-4+fl,y+3,3,o.big?10:7,R.c[0]);rect(c.x-4+fl,y+3,1,o.big?10:7,R.c[1]);rect(c.x-4+fl,y+(o.big?13:10),3,1,R.c[1]);}else rect(c.x+2,y+3,3,o.big?12:8,R.c[0]);},
 face(q,R,t){const [m,d,l]=R.c,fl=Math.sin((t||0)*2)*2;for(let y=-2;y<12;y++){const sag=Math.sin((y+2)/14*Math.PI)*2;for(let x=-32;x<32;x+=2){const f=Math.sin(x*.32+y*.2)+Math.sin(x*.11-1);q(x,y+sag*(1-Math.abs(x)/32),2,1,f>1.1?l:f<-.6?d:m);}}
  QE(q,-14,8,6,5,m);QE(q,-15,7,3,2,l);QE(q,-12,10,3,2,d);
  for(let y=12;y<46;y++){const w=8+y*.08,sx=-20+fl*(y-12)/34+Math.sin(y*.3)*1;for(let x=0;x<w;x++){const f=Math.sin(x*1.1+y*.15);q(sx+x,y,1,1,x<2?d:f>.7?l:m);}}
  for(let k=0;k<5;k++)q(-20+fl+k*2.2,46,1.2,3+(k%2)*2,d);},
 icon(q,R){q(3,6,26,7,R.c[0]);q(3,6,26,2,R.c[2]);for(let x=5;x<29;x+=4)q(x,6,1,7,R.c[1]);q(8,12,7,16,R.c[0]);q(8,12,2,16,R.c[1]);for(let k=0;k<3;k++)q(8+k*2.6,28,1.6,3,R.c[1]);}};
// Fell über den Schultern, Tierkopf auf der Schulter (groß: als Mütze)
function animalHead(rect,x,y,R,big,sd=1){const [f,f2,f3]=R.c,v=R.v;
 if(v==='lion'){rect(x-3,y-2,8,7,f3);rect(x-2,y-1,6,5,f);rect(x+sd*2,y+2,3,2,f2);rect(x,y,1,1,'#2a1a10');}
 else if(v==='wolf'){rect(x-2,y,6,4,f);rect(x-2,y-2,2,2,f);rect(x+2,y-2,2,2,f);rect(x+sd*3,y+2,3,2,f2);rect(x,y+1,1,1,'#e0c040');}
 else if(v==='boar'){rect(x-2,y,6,5,f);rect(x+sd*3,y+2,3,3,f2);rect(x+sd*4,y+4,1,2,'#f4ecd8');rect(x,y+1,1,1,'#c02020');}
 else{rect(x-2,y,6,5,f);rect(x-2,y-1,2,2,f);rect(x+2,y-1,2,2,f);rect(x+sd*3,y+2,3,2,f2);rect(x+sd*5,y+2,1,1,'#1a1210');rect(x,y+1,1,1,'#e0c040');}}
ART.pelt={back:true,fig(P,R,t,o){const {rect,head:h,shoulders:s,back,layer}=P,[f,f2,f3]=R.c;
  if(layer==='back'){rect(-11,-58,8,o.big?30:24,f3);rect(-12,o.big?-30:-36,9,3,f);for(let k=0;k<4;k++)rect(-12+k*2,o.big?-28:-34,1,2,f3);return;}
  if(o.big&&!P.armored){rect(h.x-8,h.y-12,17,7,f);rect(h.x-7,h.y-13,15,2,f2);rect(h.x-8,h.y-6,3,12,f3);if(!back){const x=h.x+9,y=h.y-11;animalHead(rect,x,y,R,true);}return;}
  for(let k=0;k<7;k++)rect(s.l.x-3+k*3,s.l.y-2+(k%2),3,3,k%2?f:f2);if(!back)animalHead(rect,s.l.x,s.l.y-5,R,false,-1);},
 face(q,R,t,o){const [f,f2,f3]=R.c;for(const sd of [-1,1]){for(let i=0;i<10;i++)q(sd*(30+i*1.5)-(sd<0?6:0),10+i*3,8,30-i*2,(i%2)?f:f3);QE(q,sd*36,18,14,10,f2);}
  if(o.big&&!helmOf(o.g,o)){QE(q,0,-56,34,13,f);QE(q,0,-58,30,9,f2);for(const sd of [-1,1]){QE(q,sd*27,-66,7,7,f);QE(q,sd*27,-66,3.5,3.5,f3);}QE(q,0,-50,12,8,f2);QE(q,0,-54,6,4,'#1a1210');for(let x=-10;x<=8;x+=3)q(x,-43,2,x===-10||x===8?6:4,'#f4ecd8');}
  else{const x=-40,y=-2;QE(q,x,y,10,8,f);QE(q,x,y-2,8,5,f2);QE(q,x+(R.v==='boar'?-9:-8),y+2,4,3,f3);QE(q,x-3,y-4,1.6,1.6,R.v==='boar'?'#c02020':'#e0c040');for(const sd of [-1,1])QE(q,x+sd*6,y-8,2.4,2.4,f);}},
 icon(q,R){const [f,f2,f3]=R.c;for(let i=0;i<14;i++)q(3+i*2,10+(i%3),3,18-(i%4)*2,i%2?f:f3);QE(q,16,10,9,7,f);QE(q,16,8,7,4,f2);for(const sd of [-1,1])QE(q,16+sd*6,4,2.4,2.4,f);QE(q,16,13,3,2,'#1a1210');q(12,8,2,2,'#e0c040');q(19,8,2,2,'#e0c040');}};
// am Gürtel
function beltThing(rect,x,y,R,t,big){const [m,d,l]=R.c,v=R.v,sw=Math.round(Math.sin((t||0)*2.2));
 if(v==='hook'){rect(x-1,y,3,3,'#5a3a22');rect(x,y+3,1,4,m);rect(x+1,y+6,2,1,m);rect(x+2,y+4,1,2,l);}
 else if(v==='skull'){rect(x+sw,y,1,2,'#6a4a2a');rect(x-1+sw,y+2,4,3,'#e8e0c8');rect(x-1+sw,y+5,4,1,'#c8bea0');rect(x+sw,y+3,1,1,'#2a2018');rect(x+2+sw,y+3,1,1,'#2a2018');}
 else if(v==='horn'){rect(x-1,y+1,4,2,m);rect(x+3,y+2,2,2,d);rect(x-2,y,2,2,l);}
 else if(v==='flask'){rect(x,y,2,1,d);rect(x-1,y+1,4,5,m);rect(x-1,y+1,1,5,l);}
 else if(v==='keys'){rect(x,y,1,2,d);for(let k=0;k<3;k++)rect(x-1+k*2+sw,y+2,1,4-k%2,m);}
 else if(v==='scalp'){rect(x,y,3,2,'#c49470');for(let k=0;k<4;k++)rect(x-1+k+sw,y+2,1,5+(k%2),m);}
 else if(v==='hand'){rect(x+sw,y,1,2,'#6a4a2a');rect(x-1+sw,y+2,3,3,'#b08468');rect(x-1+sw,y+5,1,2,'#b08468');rect(x+1+sw,y+5,1,2,'#b08468');}
 else if(v==='dice'){rect(x,y,1,2,d);rect(x-1+sw,y+2,3,3,'#f0ead8');rect(x+sw,y+3,1,1,'#2a2018');}
 else if(v==='book'){rect(x-1,y,4,5,m);rect(x-1,y,1,5,d);rect(x,y+1,2,1,l);}
 else if(v==='bell'){rect(x,y,1,2,d);rect(x-1+sw,y+2,3,3,m);rect(x-1+sw,y+2,1,1,l);rect(x+sw,y+5,1,1,d);}
 else if(v==='flute'){rect(x-2,y+1,7,1,m);rect(x-2,y+2,7,1,d);rect(x,y+1,1,1,'#2a1a10');rect(x+2,y+1,1,1,'#2a1a10');}
 else if(v==='lantern'){const gl=.6+.4*Math.sin((t||0)*3.3);rect(x,y,1,1,d);rect(x-1,y+1,3,4,d);rect(x,y+2,1,2,gl>.75?'#c8f0ff':l);rect(x-1,y+1,3,1,m);if(big)rect(x-2,y+1,5,4,`rgba(140,220,255,${(.12*gl).toFixed(2)})`);}
 else{rect(x-1,y,4,4,m);rect(x-1,y,4,1,l);rect(x,y+1,2,1,d);}}
ART.belt={fig(P,R,t,o){const {rect,chest:c,back}=P;if(back)return;beltThing(rect,c.x-7,c.y+(o.big?13:14),R,t,o.big);if(o.big)beltThing(rect,c.x+6,c.y+14,R,t+1,true);},
 face(q,R,t,o){if(!o.big)return;const s=(x,y,w,h,col)=>q(-44+x*3,26+y*3,w*3,h*3,col);beltThing(s,0,0,R,t,true);},
 icon(q,R,t){const s=(x,y,w,h,col)=>q(10+x*3.6,4+y*3.6,w*3.6,h*3.6,col);q(0,2,32,3,'#5a3a22');q(0,2,32,1,'#7a5232');beltThing(s,1.4,0,R,t,true);}};
// Tier auf der Schulter
function pet(rect,x,y,R,t,big,face){const [b,b2,e]=R.c,v=R.v,bob=Math.sin((t||0)*4)>.3?0:1;
 if(v==='rat'){rect(x-2,y-2,5,3,b);rect(x+3,y-2+bob,2,2,b);rect(x+5,y-1+bob,1,1,'#e8a0a0');rect(x+3,y-3+bob,1,1,b2);rect(x-5,y,4,1,'#c88a8a');rect(x+3,y-2+bob,1,1,'#0a0a0a');return;}
 if(v==='snake'){for(let i=0;i<7;i++)rect(x-4+i,y-1+Math.round(Math.sin(i*1.2+(t||0)*3)),1,2,i%2?b:b2);rect(x+3,y-3,2,2,b);rect(x+5,y-2,1,1,'#c02020');return;}
 if(v==='owl'){rect(x-2,y-5,5,6,b);rect(x-2,y-6,1,1,b2);rect(x+2,y-6,1,1,b2);rect(x-1,y-4,1,1,e);rect(x+1,y-4,1,1,e);rect(x,y-3,1,1,'#c89030');return;}
 if(v==='monkey'){rect(x-2,y-4,5,5,b);rect(x-3,y-3,1,2,b2);rect(x+3,y-3,1,2,b2);rect(x-1,y-2,3,2,b2);rect(x-1,y-3,1,1,'#0a0a0a');rect(x+1,y-3,1,1,'#0a0a0a');rect(x-5,y,3,1,b);return;}
 if(v==='bird'){const hop=Math.sin((t||0)*6)>.6?1:0;rect(x-2,y-3-hop,4,3,b);rect(x+1,y-5-hop,2,2,b);rect(x+3,y-4-hop,1,1,'#e0a040');rect(x+2,y-5-hop,1,1,e);rect(x-3,y-3-hop,2,1,b2);rect(x-1,y-2-hop,2,1,'#e8d8b0');return;}
 if(v==='falcon'){rect(x-3,y-4,6,4,b);rect(x+2,y-7+bob,3,3,b2);rect(x+5,y-6+bob,1,1,'#e0b040');rect(x+3,y-6+bob,1,1,e);rect(x-4,y-3,2,1,b2);rect(x-1,y-5,3,1,'#c0a060');return;}
 rect(x-3,y-4,7,4,b);rect(x-4,y-3,2,2,b);rect(x+2,y-7+bob,3,3,b);rect(x+5,y-6+bob,2,1,'#6a6a6a');rect(x+3,y-6+bob,1,1,e);if(Math.sin((t||0)*1.7)>.85){rect(x-5,y-8,4,4,b2);rect(x+1,y-9,3,4,b2);}}
ART.pet={fig(P,R,t,o){const {rect,shoulders:s,back}=P;const x=back?s.r.x:s.l.x,y=(back?s.r.y:s.l.y)-3;pet(rect,x,y,R,t,o.big);},
 face(q,R,t){const s=(x,y,w,h,col)=>q(40+x*2.6,4+y*2.6,w*2.6,h*2.6,col);pet(s,0,0,R,t,true);},
 icon(q,R,t){const s=(x,y,w,h,col)=>q(14+x*3,22+y*3,w*3,h*3,col);q(2,24,28,3,'#5a3a22');pet(s,0,0,R,t,true);}};
// Kopfbedeckung (Krone, Kranz, Kapuze, Stirnband, Feder)
function hatFig(rect,h,R,t,big,helm){const [m,d,l]=R.c,v=R.v,top=helm?h.y-12:h.y-8;
 if(v==='crown'){rect(h.x-5,top,11,3,m);rect(h.x-5,top,11,1,l);for(const x of [-5,-1,3])rect(h.x+x,top-2,2,2,m);rect(h.x-1,top+1,2,1,d);return;}
 if(v==='wreath'){for(let x=-6;x<=6;x+=2){rect(h.x+x,top+1+(Math.abs(x)>4?1:0),2,2,x%4?m:d);rect(h.x+x,top+(Math.abs(x)>4?1:0),1,1,l);}return;}
 if(v==='feather'){rect(h.x+3,top-1,2,2,d);for(let k=0;k<(big?9:6);k++)rect(h.x+4-k*.6,top-2-k,2,1,k%3?m:l);return;}
 if(v==='plume'){for(let k=0;k<(big?8:6);k++)rect(h.x-2-k,top-1+Math.round(k*.6),3,2,k%2?m:l);return;}
 if(helm)return;
 if(v==='hood'){rect(h.x-7,h.y-9,15,6,m);rect(h.x-8,h.y-4,3,12,m);rect(h.x+6,h.y-4,2,4,m);rect(h.x-7,h.y-9,15,1,l);rect(h.x-8,h.y-4,1,12,d);return;}
 if(v==='bandana'){rect(h.x-6,h.y-6,13,3,m);rect(h.x-6,h.y-6,13,1,l);rect(h.x-8,h.y-4,3,2,m);rect(h.x-9,h.y-2,2,3,d);for(let x=-5;x<6;x+=3)rect(h.x+x,h.y-5,1,1,l);return;}
 if(v==='cap'){rect(h.x-6,h.y-9,13,5,m);rect(h.x-6,h.y-9,13,1,l);rect(h.x+5,h.y-5,4,1,d);return;}
 if(v==='turban'){rect(h.x-7,h.y-11,15,7,m);for(let y=-10;y<-4;y+=2)rect(h.x-7,h.y+y,15,1,d);rect(h.x,h.y-10,2,2,l);return;}
 rect(h.x-6,h.y-4,13,2,m);rect(h.x-6,h.y-4,13,1,l);rect(h.x+1,h.y-4,2,2,d);}
function hatFace(q,R,t,o){const [m,d,l]=R.c,v=R.v,helm=helmOf(o.g,o),top=helm?-68:-62;
 if(v==='crown'){q(-26,top,52,10,m);q(-26,top,52,2,l);for(let i=0;i<5;i++){const x=-24+i*11;for(let y=0;y<10;y++)q(x+y*.4,top-y,7-y*.8,1,m);QE(q,x+3,top-11,2,2,l);}for(const x of [-14,0,14])QE(q,x,top+5,2.4,2.4,i2c(x));return;}
 if(v==='wreath'){for(let i=0;i<22;i++){const a=Math.PI*(1.05+i/21*.9),x=Math.cos(a)*30,y=top+12+Math.sin(a)*-8;QE(q,x,y,4,2.4,i%2?m:d);QE(q,x-1,y-1,1.6,1,l);}return;}
 if(v==='feather'){if(!helm){q(-28,-58,56,5,d);q(-28,-58,56,1,l);}for(let i=0;i<34;i++){const k=i/33,x=10+k*34,y=top+5-k*14+k*k*6,vw=7-k*4;q(x-1,y,2.4,2.4,d);for(let j=1;j<vw;j++){q(x-j*.4,y-j,1.6,1.4,(i+j)%5===0?l:m);q(x+j*.3,y+j*.8,1.6,1.4,(i+j)%6===0?l:m);}}return;}
 if(v==='plume'){for(let i=0;i<30;i++){const k=i/29,x=6-k*40,y=top+2-Math.sin(k*Math.PI)*6+k*k*18;QE(q,x,y,5.4-k*2.4,3.4,i%3===0?l:i%2?m:d);}return;}
 if(helm)return;
 if(v==='hood'){QR(q,0,-30,44,48,27,33,m);QR(q,0,-30,30,35,26,32,d);for(let i=0;i<20;i++){const a=Math.PI*(1.05+i/19*.9);q(Math.cos(a)*38-1,-30+Math.sin(a)*42,2,3,d);}for(const sd of [-1,1])for(let y=-30;y<24;y++)q(sd<0?-40:32,y,8,1,y%6?m:d);for(let i=0;i<12;i++){const a=Math.PI*(1.1+i/11*.8);q(Math.cos(a)*34-1,-34+Math.sin(a)*38-1,2,2,l);}return;}
 if(v==='bandana'){q(-28,-54,56,12,m);q(-28,-54,56,2,l);for(let x=-24;x<26;x+=8)QE(q,x,-48,1.6,1.6,l);QL(q,-28,-46,-40,-30,5,m);QL(q,-30,-46,-36,-28,3,d);return;}
 if(v==='cap'){QE(q,0,-58,28,12,m);q(-28,-58,56,6,m);q(-28,-52,56,2,d);q(16,-52,22,4,d);return;}
 if(v==='turban'){QE(q,0,-62,32,16,m);for(let y=-74;y<-50;y+=4)q(-30,y,60,1,d);QE(q,0,-60,4,4,l);QE(q,0,-60,2,2,'#ffffff');return;}
 q(-28,-46,56,7,m);q(-28,-46,56,2,l);q(-2,-46,6,7,d);}
const i2c=x=>x===0?'#c02030':'#3060c0';
ART.hat={fig(P,R,t,o){const {rect,head:h}=P;hatFig(rect,h,R,t,o.big,P.armored);},face:hatFace,
 icon(q,R,t){const s=(x,y,w,h,c)=>q(16+x*.42,26+y*.42,w*.42,h*.42,c);hatFace(s,R,t,{});}};
// Augenklappe, Monokel, Brille, Augenbinde
ART.eye={fig(P,R,t,o){const {rect,line,head:h,back}=P,[m,d,l]=R.c,v=R.v;if(back){rect(h.x-6,h.y+1,13,1,d);return;}
  if(v==='patch'){line(h.x-5,h.y-2,h.x+8,h.y+4,d,1);rect(h.x+3,h.y+1,3,3,m);}else if(v==='monocle'){rect(h.x+3,h.y+1,3,3,l);rect(h.x+4,h.y+2,1,1,'#2a6ad0');rect(h.x+5,h.y+4,1,4,m);}
  else if(v==='goggles'){rect(h.x-3,h.y,11,1,d);rect(h.x-2,h.y,3,3,m);rect(h.x+4,h.y,3,3,m);rect(h.x-1,h.y+1,1,1,l);rect(h.x+5,h.y+1,1,1,l);}
  else{rect(h.x-4,h.y+1,12,3,m);rect(h.x-4,h.y+1,12,1,l);}},
 face(q,R,t,o){const [m,d,l]=R.c,v=R.v;
  if(v==='patch'){QL(q,-28,-46,28,-22,2.4,d);QE(q,-15,-33,8,7,m);QE(q,-15,-34,6,4,mix(m,'#ffffff',.15));}
  else if(v==='monocle'){for(let i=0;i<36;i++){const a=i/36*Math.PI*2;q(-15+Math.cos(a)*8,-33+Math.sin(a)*8,2,2,m);}q(-21,-39,4,3,'rgba(255,255,255,.6)');QL(q,-8,-28,-6,2,1.2,m);}
  else if(v==='goggles'){q(-30,-36,60,4,d);for(const sd of [-1,1]){QE(q,sd*15,-33,9,8,m);QE(q,sd*15,-33,6,5,l);q(sd*15-4,-37,3,2,'#ffffffaa');}}
  else{q(-30,-38,60,10,m);q(-30,-38,60,2,l);q(-30,-30,60,1,d);QL(q,-30,-32,-40,-20,4,m);}},
 icon(q,R){const s=(x,y,w,h,c)=>q(16+x*.48,32+y*.48,w*.48,h*.48,c);ART.eye.face(s,R,0,{});}};
// Armreif
ART.bracer={fig(P,R,t,o){const {rect,mainHand:m,offHand:oh}=P,[a,d,l]=R.c,v=R.v;for(const hd of o.big?[m,oh]:[m]){if(!hd)continue;rect(hd.x-2,hd.y-5,4,3,a);rect(hd.x-2,hd.y-5,4,1,l);if(v==='spikes'){rect(hd.x-3,hd.y-4,1,1,l);rect(hd.x+2,hd.y-4,1,1,l);}if(v==='snake')rect(hd.x-1,hd.y-4,1,1,'#c02020');}},
 face(q,R,t,o){if(!o.big)return;const [a,d,l]=R.c;for(const sd of [-1,1]){q(sd*44-6,40,12,8,a);q(sd*44-6,40,12,2,l);}},
 icon(q,R){const [a,d,l]=R.c,v=R.v;for(let i=0;i<40;i++){const an=i/40*Math.PI*2;q(16+Math.cos(an)*10,16+Math.sin(an)*8,3,3,i%5?a:d);q(16+Math.cos(an)*10,15+Math.sin(an)*8,3,1,l);}
  if(v==='spikes')for(let i=0;i<8;i++){const an=i/8*Math.PI*2;QL(q,16+Math.cos(an)*11,16+Math.sin(an)*9,16+Math.cos(an)*15,16+Math.sin(an)*13,1.6,l);}
  if(v==='snake'){QE(q,26,10,3,2.4,a);q(27,9,1,1,'#c02020');}}};
// Umhang
ART.cape={back:true,fig(P,R,t,o){const {rect,chest:c,shoulders:s,layer,back}=P,[m,d,tr]=R.c,fl=Math.round(Math.sin((t||0)*1.6)*1.5);
  if(layer==='back'){const n=o.big?10:8,len=o.big?40:30;for(let k=0;k<n;k++){const L=len+(k%3)*2-(R.v==='torn'?((k*7)%5)*3:0),x0=-12+k*2+(k>n/2?fl:0),y0=-58+Math.abs(k-n/2)*.4;rect(x0,y0,3,L,k%2?m:d);if(R.v==='scale')for(let y=y0+3;y<y0+L-2;y+=4)rect(x0+(y%8?0:1),y,2,1,tr);}if(R.v!=='torn')rect(-12,-58+len+2,n*2+1,1,tr);return;}
  rect(c.x-6,c.y-4,13,2,m);rect(c.x-1,c.y-4,3,3,tr);rect(c.x,c.y-3,1,1,'#ffffff');if(!back){rect(s.l.x-2,s.l.y-2,3,4,m);rect(s.r.x-1,s.r.y-2,3,4,m);}},
 face(q,R,t){const [m,d,tr]=R.c;for(const sd of [-1,1]){for(let i=0;i<8;i++){const x=sd*(32+i*2)-(sd<0?8:0),y=2+i*2;q(x,y,8,40,i%2?m:d);if(R.v==='scale')for(let yy=y+2;yy<y+40;yy+=5)q(x+((yy+i)%2)*3,yy,4,2,tr);}}q(-26,2,52,6,m);if(R.v==='scale')for(let x=-24;x<26;x+=5)q(x,3,3,2,tr);QE(q,0,6,5,5,tr);QE(q,-1,5,2,2,'#ffffff');},
 icon(q,R){const [m,d,tr]=R.c;for(let k=0;k<12;k++)q(4+k*2,6+Math.abs(k-6)*.4,2.4,22+(k%3),k%2?m:d);q(4,4,24,4,m);QE(q,16,6,3,3,tr);q(4,29,24,1,tr);}};
// Waffenzeichen auf dem Symbol (kleine Ecke): zeigt, für welche Waffe der Bonus gilt
R.ART_LIST=Object.keys(ART);

// ---------- Daten: Stücke ----------
const N=()=>window.DebtNotorious;
R.typeOf=id=>N()?.byId?.[id]||null;
R.def=id=>R.typeOf(id)?.relic||null;
R.weaponOf=id=>R.typeOf(id)?.weapon||null;
R.weaponName=w=>M.weaponDefs?.find(d=>d.id===w)?.name||w||'';
R.BONUS=2;
// Zeichnen
R.fig=(rel,P,t,o={})=>{const A=ART[rel?.art];if(!A)return;if(P.layer==='back'&&!A.back)return;try{A.fig(P,rel,t,o);}catch(e){}};
R.face=(rel,q,t,o={})=>{const A=ART[rel?.art];if(!A?.face)return;try{A.face(q,rel,t,o);}catch(e){}};
R.icon=(cv,typeId,t=0,o={})=>{const rel=R.def(typeId);const c=cv.getContext('2d'),W=cv.width,H=cv.height,s=Math.min(W,H)/36;c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;if(!o.keep)c.clearRect(0,0,W,H);
 if(!o.bare){const gr=c.createRadialGradient(W/2,H/2,2,W/2,H/2,Math.max(W,H)*.6);gr.addColorStop(0,'#3a2c44');gr.addColorStop(1,'#140f18');c.fillStyle=gr;c.fillRect(0,0,W,H);}
 if(!rel)return;const ox=(W-32*s)/2,oy=(H-32*s)/2,q=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(ox+x*s),Math.round(oy+y*s),Math.max(1,Math.ceil(w*s)),Math.max(1,Math.ceil(h*s)));};
 try{ART[rel.art].icon(q,rel,t);}catch(e){}};

// ---------- Lager und Träger ----------
const S=()=>M.s;
R.list=()=>{const s=S();if(!s)return [];if(!Array.isArray(s.relics))s.relics=[];return s.relics;};
R.holder=id=>(S()?.roster||[]).find(g=>!g.dead&&!g.retired&&g.relic?.id===id)||null;
R.free=()=>R.list().filter(r=>!R.holder(r.id));
R.grant=function(typeId,o={}){const ty=R.typeOf(typeId);if(!ty?.relic)return null;const it={id:(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)),type:typeId,day:S()?.day||0,from:o.from||ty.title,place:o.place||''};R.list().push(it);return it;};
R.name=it=>R.def(it?.type||it)?.name||'Trophäe';
R.label=it=>{const ty=R.typeOf(it?.type||it);return ty?`${ty.relic.name} · +${R.BONUS} ${R.weaponName(ty.weapon)}`:'Trophäe';};
R.equip=function(g,relicId){if(!g)return 'Kein Gladiator.';if(!relicId){if(g.relic){delete g.relic;R.unregisterFace(g);}return 'Abgelegt.';}
 const it=R.list().find(r=>r.id===relicId);if(!it)return 'Nicht im Lager.';const prev=R.holder(relicId);if(prev&&prev!==g){delete prev.relic;R.unregisterFace(prev);}
 g.relic={id:it.id,type:it.type,w:R.weaponOf(it.type)};R.registerFace(g);return 'Angelegt: '+R.name(it);};
// Wirkung: +2 auf die Waffengattung (für alle, die über M.mastery lesen: Kampf, Bewertung, Vorhersage)
R.bonus=(g,id)=>{const r=g?.relic;if(!r||g.notorious)return 0;const w=r.w||R.weaponOf(r.type);return w&&w===id?R.BONUS:0;};
if(typeof M.mastery==='function'&&!M.mastery.relic){const base=M.mastery;M.mastery=function(g,id){return base(g,id)+R.bonus(g,id);};M.mastery.relic=true;}

// ---------- Darstellung am Träger ----------
R.registerFace=g=>{if(!g?.relic||g.notorious)return;const map=M.faceOverlays??={};const prev=map[g.id];if(prev?.relic)return;
 const fn=(c,fm,t,o)=>{const rel=R.def(g.relic?.type);if(!rel)return;try{R.face(rel,Q(c,fm),t,{...(o||{}),g});}catch(e){}};fn.relic=true;map[g.id]=fn;};
R.unregisterFace=g=>{if(M.faceOverlays?.[g?.id]?.relic)delete M.faceOverlays[g.id];};
const prevDecor=M.figureDecor;
M.figureDecor=function(a,P){prevDecor?.(a,P);const g=a?.g;if(!g?.relic||g.notorious)return;const rel=R.def(g.relic.type);if(!rel)return;
 if(g.body?.head?.missing&&['mask','beard','nose','eye','paint','hat','horns','earring'].includes(rel.art))return;
 if(!M.faceOverlays?.[g.id])R.registerFace(g);R.fig(rel,P,P.time||0,{big:false,g});};

// ---------- Platz „Besonderer Gegenstand“ (Ausrüstungspuppe) ----------
R.slotHTML=g=>{const it=g?.relic&&R.list().find(r=>r.id===g.relic.id);if(!it)return `<span class="special-icon" aria-hidden="true"></span><span class="eyebrow">Besonderer Gegenstand</span><strong>${R.list().length?'LEER':'NOCH LEER'}</strong><small>${R.list().length?R.free().length+' im Trophäenlager':'Trophäen der Berüchtigten'}</small>`;
 return `<canvas class="relic-ico" width="72" height="72" data-relic="${esc(it.type)}"></canvas><span class="eyebrow">Besonderer Gegenstand</span><strong>${esc(R.name(it))}</strong><small class="relic-bonus">+${R.BONUS} ${esc(R.weaponName(R.weaponOf(it.type)))}</small>`;};
R.paintIcons=root=>{for(const cv of (root||document).querySelectorAll('canvas[data-relic]'))R.icon(cv,cv.dataset.relic,0);};
R.mountSlot=function(doll,g){let s=doll.querySelector('.doll-special');if(!s){s=document.createElement('div');doll.appendChild(s);}s.className='doll-slot doll-special'+(g?.relic?' filled':'');s.style.gridArea='empty';s.removeAttribute('aria-disabled');s.setAttribute('role','button');s.tabIndex=0;
 s.innerHTML=R.slotHTML(g);R.paintIcons(s);const open=()=>R.chooser(g,()=>{R.mountSlot(doll,g);});s.onclick=open;s.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};};
R.chooser=function(g,done){if(!g||!M.ui?.modal)return;const all=R.list(),cur=g.relic?.id;
 const row=it=>{const ty=R.typeOf(it.type),h=R.holder(it.id),mine=it.id===cur;return `<div class="relic-row${mine?' on':''}"><canvas width="64" height="64" data-relic="${esc(it.type)}"></canvas><div><b>${esc(R.name(it))}</b><small>${esc(ty?.relic?.text||'')}</small><small class="relic-bonus">+${R.BONUS} ${esc(R.weaponName(ty?.weapon))} · von ${esc(it.from||ty?.title||'?')}${it.day?' · Tag '+it.day:''}${h&&!mine?' · trägt '+esc(h.name):''}</small></div><button class="btn small${mine?'':' primary'}" type="button" data-relic-pick="${mine?'':esc(it.id)}">${mine?'Ablegen':h?'Übernehmen':'Anlegen'}</button></div>`;};
 const html=all.length?`<p>Trophäen der Berüchtigten. Jedes Stück gibt seinem Träger <b class="gold">+${R.BONUS} Fertigkeit</b> mit der Waffe des Anführers, der es getragen hat. Ein Stück je Gladiator.</p><div class="relic-list">${[...all].sort((a,b)=>(b.id===cur)-(a.id===cur)||(R.typeOf(a.type)?.tier||0)-(R.typeOf(b.type)?.tier||0)).map(row).join('')}</div>`
  :`<p>Noch leer. Besiegt bei einer Plünderung den berüchtigten Anführer: Er lässt immer ein Stück fallen, das zu ihm passt (Maske, Bart, Kette …). Getragen gibt es <b class="gold">+${R.BONUS} Fertigkeit</b> mit seiner Waffe.</p>`;
 M.ui.modal('Besonderer Gegenstand · '+esc(g.name),html);
 const box=document.getElementById('modal');if(!box)return;R.paintIcons(box);
 for(const b of box.querySelectorAll('[data-relic-pick]'))b.onclick=()=>{const msg=R.equip(g,b.dataset.relicPick||null);try{M.persist?.();}catch(e){}M.ui.close?.();M.ui.notify?.(msg);done?.();};};
window.RELICS_READY=true;
})();
