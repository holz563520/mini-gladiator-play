'use strict';
// =====================================================================================================
// DER DOKTOR · Kapitel nach dem Medicus-Kapitel (Oktober 2026)
// · Doktor Hippolytus Hirnhammer: verrückter Arzt mit Meißel und Hammer (Großaufnahme auf M.faceShot wie die
//   Hühnerhändlerin, dazu Mähne, Stirnspiegel, Lupe, Schnauzer, blutiger Kittel, Zahnkette; kleine Hof-Figur)
// · Schwester Valeria: eigene Großaufnahme und Hof-Figur
// · Behandlungsstuhl: Wert wählen, Meißel sitzt je Wert an einer anderen Stelle des Schädels, ein Schlag.
//   Etwa 90 %: Anlage des Werts wird neu gewürfelt. Etwa 10 % (Veteranen bis 5 %): schwerer Hirnschaden, schielt für immer.
//   In beiden Fällen zehn Tage Krankenbett.
// · Story-Szene im Hof: Vorstellung, Erklärung durch den Schmied, Erfolg beim Besten, Fehlschlag beim Einarmigen.
//   Läuft automatisch einmal nach dem Medicus-Kapitel (S.doktor.stage) und lässt sich im Medicus-Menü wiederholen (mit Kopien).
// · Klick auf das Medicus-Gebäude: Auswahl Krankenbetten oder Behandlungstisch.
// Nutzt medic.js (fünf Rekruten des Kapitels), medicus-art.js (Gebäude und Tür) und face-shots.js.
// =====================================================================================================
(()=>{
const M=window.MG,S=M?.s;if(!M||!M.faceShot||!M.medic)return;
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cl=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=v=>{v=cl(v);return v*v*(3-2*v);},lerp=(a,b,k)=>a+(b-a)*k;
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const pick=a=>a[Math.floor(Math.random()*a.length)];
function tl(q){const R=(x,y,w,h,c)=>{q.fillStyle=c;q.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
 const E=(cx,cy,rx,ry,c)=>{for(let y=-ry;y<=ry;y++){const hw=Math.round(rx*Math.sqrt(Math.max(0,1-(y/ry)*(y/ry))));R(cx-hw,cy+y,hw*2+1,1,c);}};
 const L=(x0,y0,x1,y1,w,c)=>{const n=Math.max(1,Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));for(let i=0;i<=n;i++)R(x0+(x1-x0)*i/n-w/2,y0+(y1-y0)*i/n-w/2,w,w,c);};
 return {R,E,L};}
// Kleine Pixelschrift (3 × 5) für Schilder und Tafeln
const F3={A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',O:'010101101101010',P:'110101110100100',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',V:'101101101101010',W:'101101111111101',Z:'111001010100111',':':'000010000010000','!':'010010010000010','?':'110001010000010','-':'000000111000000','/':'001001010100100',' ':'000000000000000',
 '0':'111101101101111','1':'010110010010111','2':'110001010100111','3':'110001010001110','4':'101101111001001','5':'111100110001110'};
const text3=(R,s,x,y,c)=>{for(let i=0;i<s.length;i++){const g=F3[s[i]]||F3[' '];for(let k=0;k<15;k++)if(g[k]==='1')R(x+i*4+k%3,y+Math.floor(k/3),1,1,c);}};

// =====================================================================================================
// 1 · FIGUREN, NAMEN, FARBEN
// =====================================================================================================
const DOC='Doktor Hippolytus Hirnhammer',DOC_SHORT='Dr. Hirnhammer',NURSE='Schwester Valeria';
const DC={skin:'#e9c5a3',shade:'#b88d6c',hair:'#efece2',hairS:'#bdb8aa',coat:'#ece8dc',coatS:'#c7c0ae',coatD:'#9d9686',blood:'#8f2a24',bloodL:'#b8433a',wood:'#8a6644',woodD:'#5b4330',steel:'#a9b2b4',steelL:'#e2e8e6',steelD:'#5f686a',out:'#2a1c14'};
const NC={skin:'#f5d6bc',skinS:'#e0b394',blush:'#f2a29a',hair:'#e2b24c',hairL:'#f8dc8c',hairD:'#a8742a',dress:'#f3f0e6',dressS:'#d6d0c0',red:'#b8323a',lip:'#c43a46',lipL:'#e2626c',eye:'#5aa0d8'};
let docGc=null;
function docG(){if(docGc)return docGc;const rng=S.rng,g=M.makeGladiator(0);S.rng=rng;g.id='dok-doctor';g.name=DOC;g.age=63;Object.assign(g.appearance,{skin:DC.skin,shade:DC.shade,hair:DC.hair,style:0,beard:0,cloth:DC.coat,silhouette:.95});g.scars=[{part:'head',reason:'Selbstversuch'}];g.kills=0;g.equipment={weapon:null,secondary:null,shield:null,armor:{}};return docGc=g;}

// ---------- Hintergrund: Behandlungsraum (für Großaufnahmen 160 × 104 und den Stuhl 220 × 140) ----------
const roomCache=new Map();
function room(W,H,kind){const key=W+'x'+H+kind;if(roomCache.has(key))return roomCache.get(key);const c=mk(W,H),q=c.getContext('2d'),{R,E,L}=tl(q);
 R(0,0,W,H,'#34403b');const floorY=Math.round(H*.8);
 for(let y=0,row=0;y<floorY;y+=8,row++)for(let x=-(row%2)*9;x<W;x+=18){const v=hash(x*3.1+y*7.7);R(x,y,17,7,v>.66?'#3f4c46':v>.33?'#394540':'#43514a');R(x,y+7,18,1,'#252e2a');R(x+17,y,1,8,'#252e2a');if(v>.85)R(x+4,y+3,3,1,'#2e3833');}
 // Feuchte Flecken und Blutspritzer an der Wand
 for(let i=0;i<14;i++){const x=hash(i*5.3+W)*W,y=hash(i*9.1+H)*floorY*.9;const r=1+Math.floor(hash(i*2.7)*3);E(x,y,r,Math.max(1,r-1),'#6e1d18');if(i%3===0)R(x,y+r,1,3+i%4,'#6e1d18');}
 // Boden: Dielen mit Blutlachen
 R(0,floorY,W,H-floorY,'#4a3a2a');for(let y=floorY+3;y<H;y+=5)R(0,y,W,1,'#3a2c1f');for(let i=0;i<9;i++)R(hash(i*3.7)*W,floorY+hash(i*1.3)*(H-floorY),1,4,'#3a2c1f');
 E(W*.3,floorY+(H-floorY)*.6,10,2,'#5e1f1c');E(W*.75,floorY+(H-floorY)*.4,7,2,'#5e1f1c');
 if(kind==='close'){
  // links: Regal mit Gläsern (Auge, Herz), rechts: Knochensäge, Zange, schiefe Urkunde
  R(4,30,38,2,'#5b4330');R(4,32,38,1,'#2e2216');
  const jar=(x,y,inner)=>{R(x,y+2,9,12,'#8fb8b4');R(x+1,y+3,7,10,'#3f6b66');R(x-1,y,11,2,'#6a4a32');inner(x,y);};
  jar(7,16,(x,y)=>{E(x+4,y+8,2,2,'#f2f2e6');R(x+4,y+8,1,1,'#3a7fb0');R(x+4,y+11,1,2,'#a83a2a');});
  jar(20,16,(x,y)=>{E(x+4,y+8,3,2,'#b0282a');R(x+3,y+6,1,1,'#b0282a');R(x+5,y+6,1,1,'#b0282a');});
  jar(33,16,(x,y)=>{R(x+2,y+10,1,2,'#f0ead2');R(x+4,y+11,1,2,'#f0ead2');R(x+6,y+10,1,2,'#e8c24a');});
  R(124,12,2,4,'#2b2a26');R(118,16,4,14,DC.wood);L(122,16,150,20,3,'#9aa3a6');for(let x=124;x<150;x+=2)R(x,20+Math.round((x-122)*.15),1,2,'#5f686a');
  R(130,40,24,16,'#d9cfa8');R(130,40,24,1,'#b8ab8a');text3(R,'DIPLOM',131,43,'#3a3327');L(131,47,152,53,1,'#a83a2c');R(141,57,2,2,'#2b2a26');
 } else {
  // Stuhl-Raum: Tür links (Flur), Strichliste oben
  R(2,18,36,96,'#1f1712');R(4,20,32,92,'#120d0a');R(2,18,36,3,'#5b4330');R(2,18,3,96,'#5b4330');R(35,18,3,96,'#5b4330');
  for(let y=24;y<108;y+=10)R(5,y,30,1,'#1a1410');
  const bx=48;R(bx,2,44,26,'#2b2f2a');R(bx,2,44,1,'#5b4330');R(bx,27,44,1,'#5b4330');R(bx,2,1,26,'#5b4330');R(bx+43,2,1,26,'#5b4330');
  text3(R,'PATIENTEN',bx+2,5,'#d8d4c4');for(let i=0;i<9;i++)R(bx+4+i*3+(i>4?2:0),12,1,5,'#d8d4c4');L(bx+3,17,bx+17,11,1,'#d8d4c4');
  text3(R,'GESUND:',bx+2,20,'#d8d4c4');R(bx+31,20,1,5,'#d8d4c4');
 }
 roomCache.set(key,c);return c;}
function candle(q,W,H,t,x,y){const {R}=tl(q);const f=Math.sin(t*11)+Math.sin(t*17.3);R(x,y,3,8,'#e8dcc0');R(x+1,y-3-(f>0?1:0),1,3,'#f4c45a');R(x+1,y-2,1,1,'#fff2c0');
 const gr=q.createRadialGradient(x+1,y-2,1,x+1,y-2,40);gr.addColorStop(0,'rgba(255,200,120,'+(.22+.04*f).toFixed(3)+')');gr.addColorStop(1,'rgba(0,0,0,0)');q.fillStyle=gr;q.fillRect(0,0,W,H);}

// ---------- Ausschnitt aus M.faceShot: Kopf, Hals, Schultern freistellen (pixelgenau, ohne Kantenschimmer) ----------
const FW=160,FH=104,HEAD={cx:80,cy:38,rx:30,ry:36};
function faceBuf(key){const b=faceBuf.m??=new Map();if(!b.has(key)){const a=mk(FW,FH),z=mk(FW,FH);b.set(key,{a,z,qa:a.getContext('2d',{willReadFrequently:true}),qz:z.getContext('2d')});}return b.get(key);}
const inHead=(x,y,k=1)=>{const dx=(x-HEAD.cx)/(HEAD.rx*k),dy=(y-HEAD.cy)/(HEAD.ry*k);return dx*dx+dy*dy<=1;};
const shapes={
 head:(x,y)=>inHead(x,y)||(x>=65&&x<=95&&y>=58&&y<=86),
 bust:(x,y)=>inHead(x,y)||(x>=64&&x<=96&&y>=56&&y<=86)||(y>=78&&x>=lerp(34,6,(y-78)/26)&&x<=lerp(126,154,(y-78)/26))};
function cutFace(key,o,t,shape){const B=faceBuf(key),z=1/(1.12*(1+.07*ease(t/5)));B.qa.setTransform(1,0,0,1,0,0);
 try{M.faceShot.paint(B.qa,FW,FH,{team:2,lines:0,yaw:0,...o,zoom:z,shake:0},t);}catch(e){B.qa.fillStyle='#000';B.qa.fillRect(0,0,FW,FH);}
 const d=B.qa.getImageData(0,0,FW,FH),p=d.data,fn=shapes[shape||'bust'];for(let y=0;y<FH;y++)for(let x=0;x<FW;x++)if(!fn(x,y))p[(y*FW+x)*4+3]=0;
 B.qz.clearRect(0,0,FW,FH);B.qz.putImageData(d,0,0);return B.z;}

// ---------- Doktor: Großaufnahme (transparent, 160 × 104) ----------
// o: {mood, look (−1 links … 1 rechts), shout, blood, sneeze, hearts, t}
// Die Augen des Gesichtsrenderers werden entfernt (Wangenfarbe von unten nachgezogen), bevor eigene Augen gemalt werden.
const EYE_ZONES=[[54,30,77,47],[85,25,108,45]];
function blankEyes(q){for(const [x0,y0,x1,y1] of EYE_ZONES){const w=x1-x0,h=y1-y0,src=q.getImageData(x0,y1+3,w,1),dst=q.getImageData(x0,y0,w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,j=x*4;if(dst.data[i+3]===0||src.data[j+3]===0)continue;const sh=(y/h)*6;dst.data[i]=Math.max(0,src.data[j]-sh);dst.data[i+1]=Math.max(0,src.data[j+1]-sh);dst.data[i+2]=Math.max(0,src.data[j+2]-sh);dst.data[i+3]=255;}
  q.putImageData(dst,x0,y0);}}
function doctorBuf(t,o={}){const yaw=o.yaw??Math.sin(t*.8)*.25,base=cutFace('doc',{g:docG(),mood:o.mood||'grin',crossEyes:o.cross??true,yaw},t,'head');
 const c=faceBuf('docOut'),q=c.qz;q.clearRect(0,0,FW,FH);const {R,E,L}=tl(q),sx=Math.round(yaw*6),jig=Math.sin(t*9)*.6;
 // Mähne hinter dem Kopf: wild abstehende weiße Büschel rund um den kahlen Schädel
 for(let a=0;a<46;a++){const ang=Math.PI*(.88+a/46*1.24),len=5+hash(a*3.7)*11+(a%5===0?5:0)+jig*hash(a),x0=HEAD.cx+sx*.4+Math.cos(ang)*HEAD.rx*.86,y0=HEAD.cy-4+Math.sin(ang)*HEAD.ry*.86;
  for(let r=0;r<len;r+=2){const x=x0+Math.cos(ang+Math.sin(a+t*3)*.15)*r,y=y0+Math.sin(ang)*r;R(x,y,3,3,r>len-3?DC.hairS:hash(a*7+r)>.7?'#ffffff':DC.hair);}}
 // Kittel, Kragen, Zahnkette, Blutspritzer
 for(let y=70;y<FH;y++){const k=(y-70)/34,x0=lerp(52,20,k),x1=lerp(108,140,k);R(x0,y,x1-x0,1,DC.coat);R(x0,y,3,1,DC.coatS);R(x1-3,y,3,1,DC.coatS);}
 for(let y=70;y<FH;y++){const k=(y-70)/34;R(lerp(70,74,k),y,lerp(20,12,k),1,'#5a4a3a');}
 L(66,70,76,92,3,DC.coatS);L(94,70,84,92,3,DC.coatS);L(66,70,76,92,1,DC.coatD);L(94,70,84,92,1,DC.coatD);
 for(let i=0;i<9;i++){const u=i/8,x=lerp(68,92,u),y=74+Math.sin(u*Math.PI)*9;R(x,y,2,3,i%4===2?'#e8c24a':'#f2ecd6');R(x,y+3,2,1,'#b8ab8a');}
 for(const [x,y,r] of [[40,92,2],[46,86,1],[112,94,3],[118,88,1],[104,80,1],[58,98,1]]){E(x,y,r,r,DC.blood);R(x,y+r,1,3,DC.blood);}
 q.drawImage(base,0,0);blankEyes(q);
 // Kahlkopf-Glanz, Stirnspiegel, buschige Brauen, Lupe vor dem rechten Auge, Knollennase, wilder Schnauzer
 R(70+sx,8,10,2,'#fff1dc');R(72+sx,7,6,1,'#fff7ea');
 R(52,17,57,2,'#2d2a26');E(80+sx,15,7,6,'#7d8789');E(80+sx,15,6,5,'#dfe8ea');R(76+sx,12,3,2,'#ffffff');R(79+sx,14,2,2,'#5a6466');
 const bw=o.mood==='scared'||o.mood==='shock'?-2:0;R(58+sx,27+bw,15,3,DC.hair);R(56+sx,26+bw,4,2,DC.hair);R(86+sx,25+bw,16,3,DC.hair);R(100+sx,24+bw,4,2,DC.hair);
 {const lx=Math.round(Math.sin(t*2.3)*1.2+(o.look||0)*2);R(58+sx,32,15,11,'#3a2f22');R(59+sx,33,13,9,'#f6f1df');R(59+sx,41,13,1,'#d8ccb0');R(63+sx+lx,35,4,4,'#2d6a8a');R(64+sx+lx,36,2,2,'#101010');R(63+sx+lx,35,1,1,'#ffffff');R(58+sx,31,15,2,'#d98a7a');}
 E(93+sx,34,8,7,'#3a2f22');E(93+sx,34,7,6,'#cfe6e2');E(93+sx,34,6,5,'#f6f1df');const ll=Math.round(Math.sin(t*2.9)*2+(o.look||0)*3);E(93+sx+ll,34+Math.round(Math.cos(t*2.3)),3,3,'#2d6a8a');R(92+sx+ll,33,2,2,'#101010');R(95+sx+ll,32,1,1,'#ffffff');R(100+sx,40,2,6,'#3a2f22');
 E(80+sx*1.3,51,4,3,'#d98a7a');R(79+sx*1.3,49,2,1,'#f2b8a6');
 const mw=Math.sin(t*5)*1;R(66+sx,56,28,3,DC.hair);R(63+sx,54+mw,4,3,DC.hair);R(93+sx,54-mw,4,3,DC.hair);R(61+sx,52+mw,3,2,DC.hair);R(96+sx,52-mw,3,2,DC.hair);R(68+sx,58,24,1,DC.hairS);
 if(o.blood)for(let i=0;i<12;i++){const x=58+hash(i*4.1)*44,y=10+hash(i*7.3)*50;R(x,y,i%3?1:2,i%3?1:2,DC.blood);}
 if(o.hearts)for(let i=0;i<3;i++){const k=((t*.6+i/3)%1),x=96+i*12+Math.sin(t*3+i)*3,y=26-k*24;q.globalAlpha=1-k;R(x,y,2,2,'#e2626c');R(x+3,y,2,2,'#e2626c');R(x,y+1,5,2,'#e2626c');R(x+1,y+3,3,1,'#e2626c');R(x+2,y+4,1,1,'#e2626c');q.globalAlpha=1;}
 return c.z;}

// ---------- Schwester Valeria: Großaufnahme (160 × 104) und ganze Figur (160 × 300) ----------
// Liebreizend: goldene Locken, große blaue Augen, volle Lippen, Schönheitsfleck, kurzer weißer Kittel mit rotem Saum,
// schmale Taille, lange Beine, rote Absätze. Dieselben Koordinaten für Großaufnahme und ganze Figur (Schultern bei y 76).
const NH=300;
function nurseBody(q,t,o={}){const {R,E,L}=tl(q),sw=Math.sin(t*1.7),full=!!o.full;
 // Beine, Schuhe (nur ganze Figur)
 if(full){for(const [t0,t1,a0,a1] of [[63,79,67,73],[81,97,87,93]]){for(let y=158;y<282;y++){const k=(y-158)/124,calf=Math.sin(Math.min(1,Math.max(0,(k-.45)/.4))*Math.PI)*1.5,x0=Math.round(lerp(t0,a0,k)-calf*(t0<80?1:0)),x1=Math.round(lerp(t1,a1,k)+calf*(t0<80?0:1));R(x0,y,x1-x0,1,NC.skin);R(x1-2,y,2,1,NC.skinS);R(x0+1,y,1,1,'#f8dcc4');}}
  for(const [x,flip] of [[66,0],[86,1]]){R(x,281,9,4,'#b8323a');R(x+(flip?6:0),285,3,9,'#8a222a');R(x+(flip?0:4),285,5,3,'#b8323a');R(x+1,281,6,1,'#e2626c');}}
 // Kleid: Schultern, Ausschnitt, Brust, Taille mit rotem Gürtel, Hüfte, kurzer Saum
 const rows=full?168:FH;for(let y=74;y<rows;y++){let hw;if(y<84)hw=lerp(26,32,(y-74)/10);else if(y<106)hw=32+(y>86&&y<104?2:0)-Math.max(0,(y-96))*.4;else if(y<124)hw=lerp(28,19,(y-106)/18);else if(y<146)hw=lerp(19,31,(y-124)/22);else hw=31+(y-146)*.25;
  hw=Math.round(hw);R(80-hw,y,hw*2,1,NC.dress);R(80-hw,y,3,1,NC.dressS);R(80+hw-3,y,3,1,NC.dressS);}
 // Brust: zwei Rundungen unter dem Stoff, Schatten darunter
 const jy=Math.round(o.jig||0),jx=Math.round((o.jig||0)*.25);E(69,111,12,2,NC.dressS);E(91,111,12,2,NC.dressS);
 for(const [cx,sd] of [[69-jx,-1],[91+jx,1]]){E(cx,99+jy,13,11,NC.dress);E(cx,104+jy,10,5,'#ebe2c9');
  for(let a=.12;a<Math.PI-.12;a+=.07)R(cx+Math.cos(a)*13,99+jy+Math.sin(a)*11,2,1,'#c4b79a');
  for(let a=-.5;a<.5;a+=.1)R(cx-sd*Math.cos(a)*12.5+sd*0,98+jy+Math.sin(a)*10,1,1,'#d9cfb4');
  E(cx-6,93+jy,4,3,'#ffffff');E(cx-6,93+jy,2,1,'#ffffff');}
 R(80,93,1,13,NC.dressS);R(79,98,3,1,'#c4b79a');
 if(o.shine>0){const sp=(x,y,r)=>{R(x,y-r,1,r*2+1,'#ffffff');R(x-r,y,r*2+1,1,'#ffffff');R(x-1,y-1,3,3,'#fff6c8');};const a=o.shine,r=Math.round(2+a*2+Math.sin(t*14)*1);sp(62-jx,92+jy,r);sp(84+jx,92+jy,Math.max(2,r-1));if(Math.sin(t*9)>0)R(92+jx,102+jy,2,2,'#ffffff');}
 // Ausschnitt (Herzform), Kette mit kleinem Kreuz
 for(let y=76;y<91;y++){const hw=y<84?lerp(8,10,(y-76)/8):lerp(10,2,(y-84)/7);R(80-hw,y,hw*2,1,NC.skin);}R(79,86,1,4,NC.skinS);
 L(70,76,80,91,2,NC.red);L(90,76,80,91,2,NC.red);L(72,78,80,84,1,'#e8c24a');L(88,78,80,84,1,'#e8c24a');R(79,84,3,1,'#e8c24a');R(80,83,1,3,'#e8c24a');
 if(full){R(61,122,38,5,NC.red);R(61,122,38,1,'#e2626c');R(77,121,6,7,'#e8c24a');R(79,123,2,3,NC.red);
  for(let x=52;x<110;x+=6)R(x,166+((x/6)%2),4,2,NC.red);R(49,164,62,1,NC.dressS);
  for(const [x,y] of [[58,138],[100,140],[70,150]])R(x,y,1,6,NC.dressS);
  // Arme: links an der Hüfte, rechts winkt (Kurzarm)
  R(46,78,10,8,NC.dress);R(104,78,10,8,NC.dress);L(50,86,42,112,6,NC.skin);L(42,112,56,132,5,NC.skin);E(57,132,3,3,NC.skin);L(48,86,40,112,1,NC.skinS);
  const wv=Math.round(sw*3);L(110,86,124,64,6,NC.skin);L(124,64,120+wv,44,5,NC.skin);E(120+wv,40,4,5,NC.skin);for(let i=0;i<4;i++)R(116+wv+i*2.4,32+(i%3===0?1:0),2,5,NC.skin);R(126+wv,40,3,2,NC.skin);
  // Notizbrett mit roten Herzchen am Gürtel
  R(98,128,10,13,'#8a6644');R(99,130,8,10,'#efe6cc');R(100,132,2,2,NC.red);R(103,132,2,2,NC.red);R(101,134,3,1,NC.red);R(100,137,6,1,'#9a907a');}
 else{R(44,78,12,26,NC.dress);R(104,78,12,26,NC.dress);R(44,96,2,8,NC.skin);R(114,96,2,8,NC.skin);}}
function nurseHead(q,t,o={}){const {R,E,L}=tl(q),mood=o.mood||'smile',sw=Math.sin(t*1.7),blink=(t%4.3)<.12&&mood!=='wink';
 // Lockenmähne hinten (golden)
 E(80,40,34,36,NC.hairD);for(let i=0;i<22;i++){const s=i%2?1:-1,k=Math.floor(i/2),y=30+k*5.4,x=80+s*(27+Math.sin(k*1.3+t*1.2)*2+(k>6?-2:0));E(x,y,6,5,NC.hair);E(x-s,y-1,3,2,NC.hairL);}
 R(72,58,16,20,NC.skinS);R(74,58,12,18,NC.skin);
 // Gesicht: herzförmig, weiches Kinn
 E(80,38,21,24,NC.skin);E(80,49,15,15,NC.skin);for(let y=22;y<62;y++){const k=(y-38)/24,hw=Math.round(21*Math.sqrt(Math.max(0,1-k*k)));if(hw>3)R(80+hw-2,y,2,1,NC.skinS);}
 E(67,48,mood==='shy'?8:5,mood==='shy'?4:2,NC.blush);E(93,48,mood==='shy'?8:5,mood==='shy'?4:2,NC.blush);if(mood==='shy'){R(106,32,2,4,'#cfe6ee');R(106,31,1,1,'#ffffff');}R(66,47,2,1,'#f7c2b8');R(92,47,2,1,'#f7c2b8');
 // Große blaue Augen mit dichten Wimpern
 const look=mood==='roll'?0:mood==='shy'?-3:Math.round(Math.sin(t*.9)),up=mood==='roll'?-2:mood==='shy'?2:0;
 const eye=(cx,closed,flip)=>{if(closed){L(cx-6,37,cx,40,1,'#1a0f0a');L(cx,40,cx+6,37,1,'#1a0f0a');R(flip?cx-8:cx+6,35,2,1,'#1a0f0a');return;}
  E(cx,38,6,3,'#fbf6ee');E(cx+look,38+up,3,3,NC.eye);E(cx+look,38+up,2,2,'#2a5a8a');R(cx+look,38+up,1,1,'#0c0c10');R(cx+look+1,36+up,1,1,'#ffffff');R(cx+look-1,39+up,1,1,'#9ad0f0');
  R(cx-7,34,15,2,'#1a0f0a');for(let i=0;i<4;i++)R(flip?cx-8-i:cx+7+i,33-i,1,1,'#1a0f0a');for(let i=-5;i<=5;i+=3)R(cx+i,33,1,1,'#1a0f0a');R(cx-4,42,9,1,'#d9a88c');R(flip?cx-6:cx+5,41,1,1,'#1a0f0a');
  if(mood==='roll')R(cx-6,35,13,2,NC.skinS);};
 eye(70,blink||mood==='wink',1);eye(90,blink,0);
 const by=mood==='shock'?-2:mood==='roll'?1:0;L(62,30+by,67,28+by,1,'#7a4a20');L(67,28+by,75,29+by,1,'#7a4a20');L(85,29+by,93,28+by,1,'#7a4a20');L(93,28+by,98,30+by,1,'#7a4a20');
 // Stupsnase, volle rote Lippen, Schönheitsfleck
 R(80,42,1,6,'#e9bea2');R(78,48,5,1,'#dba88a');R(78,49,1,1,'#c08a72');R(82,49,1,1,'#c08a72');R(91,52,1,1,'#3a2014');
 if(mood==='shock'){E(80,56,3,3,'#5c1a1a');E(80,55,4,1,NC.lip);}
 else if(mood==='kiss'){E(80,55,3,2,NC.lip);R(79,54,2,1,NC.lipL);}
 else{R(74,54,13,2,NC.lip);R(76,53,3,1,NC.lip);R(82,53,3,1,NC.lip);R(80,54,1,1,'#8a222a');E(80,57,5,2,NC.lipL);R(77,56,3,1,'#f6a0a4');if(mood!=='roll'){R(73,53,1,1,NC.lip);R(87,53,1,1,NC.lip);R(72,52,1,1,NC.skinS);R(88,52,1,1,NC.skinS);}}
 // Ohrringe, Locken vorn, Haube mit rotem Kreuz
 E(58,50,1,2,'#e8c24a');E(102,50,1,2,'#e8c24a');R(57,53+Math.round(sw),3,3,'#f4d37a');R(101,53-Math.round(sw),3,3,'#f4d37a');
 for(let i=0;i<6;i++){E(61+i*4,20+(i%2)*2,4,4,NC.hair);E(60+i*4,19+(i%2)*2,2,2,NC.hairL);}E(95,21,5,4,NC.hair);E(98,26,3,4,NC.hair);E(62,27,3,5,NC.hair);
 for(let y=4;y<15;y++){const hw=20-Math.abs(y-10)*1.2;R(80-hw,y,hw*2,1,y<6?NC.dressS:NC.dress);}R(62,12,36,2,NC.dressS);R(78,5,4,8,NC.red);R(75,7,10,4,NC.red);
 if(mood==='wink'||o.sparkle){R(110,26,2,2,'#f4d37a');R(113,23,1,1,'#f4d37a');R(108,22,1,1,'#fff6c8');}
 if(o.hearts)for(let i=0;i<3;i++){const k=((t*.5+i/3)%1),x=40+i*30+Math.sin(t*2+i)*4,y=60-k*56;q.globalAlpha=1-k;R(x,y,2,2,'#e2626c');R(x+3,y,2,2,'#e2626c');R(x,y+1,5,2,'#e2626c');R(x+1,y+3,3,1,'#e2626c');R(x+2,y+4,1,1,'#e2626c');q.globalAlpha=1;}}
const nurseHeadShake=(q,t,o)=>{q.save();if(o.shake){q.translate(80,62);q.rotate(o.shake);q.translate(-80,-62);}nurseHead(q,t,o);q.restore();};
function nurseBuf(t,o={}){const c=faceBuf('nurseOut'),q=c.qz;q.clearRect(0,0,FW,FH);nurseBody(q,t,o);nurseHeadShake(q,t,o);return c.z;}
// Ganze Figur für die Kamerafahrt von den Absätzen bis zum Gesicht
const nurseFullCv=mk(FW,NH);
function nurseFull(t,o={}){const q=nurseFullCv.getContext('2d');q.clearRect(0,0,FW,NH);nurseBody(q,t,{...o,full:true});nurseHeadShake(q,t,o);return nurseFullCv;}
// Kamerafahrt in jeder Schwester-Szene: erst das Gesicht, dann hinunter zur Büste (sie wackelt und glänzt), wieder hinauf, dann Zwinkern oder verlegenes Kopfschütteln.
function nurseShow(o={}){const T=o.quick?{a:.4,b:.45,c:1.3,d:.45,e:1.9}:{a:.9,b:.7,c:2.8,d:.7,e:3.6};return (g,w,h,f,t)=>{const b=f.bt??0,pan=o.pan!==false,dn=ease(cl((b-T.a)/T.b)),upk=ease(cl((b-T.c)/T.d)),k=pan?dn-upk:0,tau=b-(T.a+T.b);
  const jig=pan?(tau>0&&tau<3?3.4*Math.exp(-1.5*tau)*Math.sin(tau*26):0)+Math.sin(t*6)*.9*k:0;
  const e=pan&&b>T.e?(o.end||'wink'):null,te=b-T.e;let mood=pan?'smile':(o.mood||'smile');if(!pan&&o.mood)mood=o.mood;if(e==='wink'&&te<1.2)mood='wink';if(e==='shy'&&te>0)mood='shy';if(e==='roll'&&te>0)mood='roll';
  const shake=(e==='shy'||e==='roll')&&te>0&&te<2.4?Math.sin(te*(e==='roll'?13:15))*.07*Math.exp(-te*(e==='roll'?.9:1.1)):0;
  return closeup(g,w,h,t,nurseFull(t,{...o,mood,jig:pan?jig:0,shine:pan?k*(.6+.4*Math.sin(t*8)):0,shake,hearts:o.hearts||(e==='shy'&&te>0&&te<2.4?1:0),sparkle:o.sparkle||(e==='wink'&&te<1.2)}),{srcY:Math.round(lerp(0,46,k)),dy:o.dy});};}

// ---------- Großaufnahme zusammensetzen: Raum, Figur, Vignette, Schrei-Linien; auf beliebige Zielgröße ----------
const closeCv=mk(FW,FH);
function closeup(ctx,w,h,t,layer,o={}){const q=closeCv.getContext('2d');q.imageSmoothingEnabled=false;q.drawImage(room(FW,FH,'close'),0,0);candle(q,FW,FH,t,148,62);if(layer){if(layer.height>FH)q.drawImage(layer,0,Math.round(o.srcY||0),FW,FH,0,0,FW,FH);else q.drawImage(layer,0,o.dy??9);}
 const s=Math.max(w/FW,h/FH)*(1+.05*ease(t/4)),dw=FW*s,dh=FH*s,sh=o.shake||0,ox=sh?(Math.random()-.5)*sh*s:0,oy=sh?(Math.random()-.5)*sh*s*.6:0;ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#0d0907';ctx.fillRect(0,0,w,h);ctx.drawImage(closeCv,Math.round((w-dw)/2+ox),Math.round(Math.min(0,(h-dh)*.4)+oy),Math.round(dw),Math.round(dh));
 if(o.lines){ctx.save();ctx.globalAlpha=.7;ctx.strokeStyle='#fff6dc';ctx.lineWidth=Math.max(2,w/160);for(let i=0;i<18;i++){const a=i/18*Math.PI*2+Math.floor(t*14)*.37,r0=Math.max(w,h)*.74,r1=Math.max(w,h)*(.42+((i*7)%5)*.035);ctx.beginPath();ctx.moveTo(w/2+Math.cos(a)*r0,h*.42+Math.sin(a)*r0);ctx.lineTo(w/2+Math.cos(a)*r1,h*.42+Math.sin(a)*r1);ctx.stroke();}ctx.restore();}
 const vg=ctx.createRadialGradient(w/2,h*.45,Math.min(w,h)*.35,w/2,h*.5,Math.max(w,h)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.6)');ctx.fillStyle=vg;ctx.fillRect(0,0,w,h);}

// ---------- Patient: Kopf und Schultern, auf Wunsch mit Verband, Schielen, Blut, Sternchen ----------
// Schädelbruch im Stil der Spielfigur (figure-skin-pixel2): dunkelrote gezackte Wunde mit rosa Rand, helle Knochenplatte, Risse, Blutlauf.
function skullWound(q,cx,cy,T){const k=cl(T/.25),pix=(x,y,c)=>{q.fillStyle=c;q.fillRect(Math.round(x),Math.round(y),1,1);},{L}=tl(q);
 const inP=(pts,x,y)=>{let c=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [xi,yi]=pts[i],[xj,yj]=pts[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;}return c;};
 const poly=(pts,fc,oc,dy=0)=>{const xs=pts.map(a=>a[0]),ys=pts.map(a=>a[1]),x0=Math.floor(Math.min(...xs))-1,x1=Math.ceil(Math.max(...xs))+1,y0=Math.floor(Math.min(...ys))-1,y1=Math.ceil(Math.max(...ys))+1,m=new Set();
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(inP(pts,x+.5,y+.5)){m.add(x+','+y);pix(cx+x,cy+y+dy,fc);}
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(!m.has(x+','+y)&&(m.has((x+1)+','+y)||m.has((x-1)+','+y)||m.has(x+','+(y+1))||m.has(x+','+(y-1))))pix(cx+x,cy+y+dy,oc);};
 const sc=(pts,f)=>pts.map(([x,y])=>[x*f*1.2,y*f]);
 // Risse im Schädel, wachsen aus der Wunde
 for(const r of [[[-5,-2],[-9,-5],[-12,-4],[-16,-8]],[[5,-3],[9,-6],[11,-10]],[[-2,6],[-5,10],[-4,14],[-8,18]],[[4,5],[8,9],[9,14]],[[-6,2],[-11,4],[-14,9]]])for(let i=0;i<r.length-1;i++){const a=r[i],b=r[i+1],f=cl(k*r.length-i);if(f<=0)break;L(cx+a[0],cy+a[1],cx+a[0]+(b[0]-a[0])*f,cy+a[1]+(b[1]-a[1])*f,1,'#3c1520');pix(cx+a[0]+1,cy+a[1],'#bf5e59');}
 poly(sc([[-4,-8],[2.5,-6.5],[6,-2],[2,5],[-2.5,8.5],[-6,2.5],[-1.5,-1.7]],1.6*(.4+.6*k)),'#3c1520','#bf5e59');
 const bone=sc([[-2.9,5.5],[-.5,-.5],[-2.6,-2.6],[1,-8.2],[3.8,-4.6],[1.7,.5],[2.9,2.9],[.2,7.2]],1.6*k),pop=-Math.round((1-k)*4)-(T>.25&&T<.7?1:0);
 if(k>.3){poly(bone,'#d6c6a3','#665144',pop);L(cx-1,cy+4+pop,cx+1,cy-2+pop,1,'#fff0cd');L(cx-1,cy-2+pop,cx+3,cy-1+pop,1,'#805145');}
 // Blutlauf an der Kopfhaut und pulsierender Rand
 const pul=Math.sin(T*15)>0?1:0;for(let i=0;i<3;i++){const sxs=[-6,1,7][i],len=Math.min(30,Math.max(0,T-.1)*(17+i*5));if(len>0){for(let y=0;y<len;y++)pix(cx+sxs+(y>12&&i===1?1:0),cy+7+y,y%5===4?'#c9453a':'#a8372f');pix(cx+sxs,cy+7+len,'#7b2f2a');}}
 if(T<3.4){pix(cx-5,cy-1+pul,'#c9453a');pix(cx+5,cy+1-pul,'#c9453a');pix(cx,cy+8+pul,'#c9453a');}}
// Blutende Meißelwunde nach gelungener Behandlung (kein Verband): kleines Loch mit rosa Rand, kleine Risse, Blutlauf.
function chiselWound(q,cx,cy,T){const pix=(x,y,c)=>{q.fillStyle=c;q.fillRect(Math.round(x),Math.round(y),1,1);},box=(x,y,w,h,c)=>{q.fillStyle=c;q.fillRect(cx+x,cy+y,w,h);},k=cl(T/.3),pul=Math.sin(T*9)>0?1:0;
 box(-3,-2,7,5,'#bf5e59');box(-2,-3,5,7,'#bf5e59');box(-2,-2,5,5,'#3c1520');box(-1,-1,3,3,'#6e1d18');box(0,-1,1,1,'#a8372f');
 if(k>.2){pix(cx-5,cy-1,'#3c1520');pix(cx-6,cy-2,'#3c1520');pix(cx+5,cy,'#3c1520');pix(cx+6,cy+1,'#3c1520');pix(cx+1,cy-5,'#3c1520');pix(cx,cy+5,'#3c1520');}
 for(let i=0;i<3;i++){const sxs=[-1,1,3][i],len=Math.min(20,Math.max(0,T-.05)*(11+i*4)+(T>=9?4:0));if(len>0){for(let y=0;y<len;y++)pix(cx+sxs,cy+4+y,y%4===3?'#c9453a':'#a8372f');pix(cx+sxs,cy+4+len,'#7b2f2a');}}
 pix(cx-2,cy-3+pul,'#c9453a');pix(cx+3,cy+3-pul,'#c9453a');}
function patientBuf(g,t,o0={}){const o={...o0,g};const cross=o.cross??!!g.dokCross,tilt=o.tilt??(cross&&o.crossX!==false?Math.sin(t*1.9)*.1:0),base=cutFace('pat:'+g.id,{g,mood:o.mood||(cross?'dumb':'nervous'),crossEyes:cross,hurt:o.hurt||0,blood:o.blood||0,tilt,yaw:o.yaw??Math.sin(t*.7)*.15},t,'bust');
 const c=faceBuf('patOut'),q=c.qz;q.clearRect(0,0,FW,FH);q.drawImage(base,0,0);if(o.crossX??cross)blankEyes(q);const {R,E,L}=tl(q);const sx=Math.round((o.yaw??Math.sin(t*.7)*.15)*6);{const dx=sx,dy=-63,cs=Math.cos(tilt||0),sn=Math.sin(tilt||0);patientBuf.anchor={x:80+dx*cs-dy*sn,y:70+dx*sn+dy*cs};}q.save();if(tilt){q.translate(80,70);q.rotate(tilt);q.translate(-80,-70);}
 const X=o.crossX??cross;if(X){const sp=o.spin||0;for(const [cx,cy,ew,eh,i] of [[66,35,12,9,0],[93,33,14,11,1]]){R(cx-ew/2-1,cy-eh/2-1,ew+2,eh+2,'#3a2418');R(cx-ew/2,cy-eh/2,ew,eh,'#f6f1df');R(cx-ew/2,cy+eh/2-1,ew,1,'#d8ccb0');for(let k=0;k<3;k++)R(cx-ew/2+1+k*3,cy-eh/2+1+(k%2),1,2,'#d88a8a');
  let px,py;if(sp){const a=t*17*(i?-1:1);px=cx-1.5+Math.cos(a)*(ew/2-2.5);py=cy-1.5+Math.sin(a)*(eh/2-2.5);}else{const w=Math.round(Math.sin(t*2.3));px=i?cx-ew/2+.5:cx+ew/2-3.5;py=i?cy-eh/2+.5+(w>0?1:0):cy+eh/2-3.5;}R(px,py,3,3,'#160d0a');R(px+1,py,1,1,'#ffffff');}
  R(57,26,14,2,'#3a2418');R(59,24,6,2,'#3a2418');R(86,23,15,2,'#3a2418');}
 if(o.tongue){R(74,59,9,2,'#7a2a30');R(75,61,7,5,'#d0606a');R(78,62,1,4,'#a8404a');R(76,66,5,1,'#c0505a');}
 if(o.marks)for(const [k,[x,y]] of Object.entries(SPOTS)){if(k===o.mark)continue;R(x+sx,y,1,1,'rgba(240,240,225,.55)');}
 if(o.mark&&SPOTS[o.mark]){const [x0,y]=SPOTS[o.mark],x=x0+sx;R(x-2,y-2,1,1,'#f4f0e0');R(x+2,y-2,1,1,'#f4f0e0');R(x-1,y-1,1,1,'#f4f0e0');R(x+1,y-1,1,1,'#f4f0e0');R(x,y,1,1,'#f4f0e0');R(x-1,y+1,1,1,'#f4f0e0');R(x+1,y+1,1,1,'#f4f0e0');R(x-2,y+2,1,1,'#f4f0e0');R(x+2,y+2,1,1,'#f4f0e0');}
 if(o.lump){const [x0,y]=SPOTS[o.lump]||[80,10],x=x0+sx;E(x,y-1,3,2,'#e0a08a');R(x-1,y-2,2,1,'#f2c0a8');}
 if(o.wound){const [x0,y]=SPOTS[o.wound]||[80,10],x=x0+sx;E(x,y,2,2,'#5e1f1c');for(let i=0;i<4;i++)R(x-2+i*1.5,y+2,1,3+i*2+Math.round(o.wound2||0),'#a8372f');}
 if(o.bandage>0){const n=Math.ceil(cl(o.bandage)*6);for(let i=0;i<n;i++){const y=6+i*4,hw=Math.round(HEAD.rx*Math.sqrt(Math.max(0,1-((y+2-HEAD.cy)/HEAD.ry)**2)))+1;R(HEAD.cx-hw,y,hw*2,4,i%2?'#efe9da':'#f8f4ea');R(HEAD.cx-hw,y+3,hw*2,1,'#cfc6b0');}
  if(n>=6){const [x,y]=SPOTS[o.mark||'strength']||[80,10];E(x,Math.max(8,y),3,2,o.cross?'#b8433a':'#c96a5a');R(HEAD.cx+HEAD.rx-2,24,4,6,'#f8f4ea');R(HEAD.cx+HEAD.rx+1,28,3,5,'#efe9da');}}
 if(o.skull>=0)skullWound(q,80+sx,14,o.skull);else if(o.g?.dokSkull&&!o.noSkull)skullWound(q,80+sx,14,9);else if(o.g?.dokWound&&SPOTS[o.g.dokWound]&&!o.noSkull)chiselWound(q,SPOTS[o.g.dokWound][0]+sx,SPOTS[o.g.dokWound][1],o.wt??9);
 if(o.stars){for(let i=0;i<4;i++){const a=t*3.2+i*Math.PI/2,x=80+Math.cos(a)*30,y=4+Math.sin(a)*5;R(x-1,y,3,1,'#f4d37a');R(x,y-1,1,3,'#f4d37a');R(x,y,1,1,'#fff6c8');}}
 if(o.drool){const k=(t*.7)%1;R(76,64,1,2+Math.round(k*8),'#cfe6ee');}
 if(o.sweat){const k=(t*.9)%1;R(58,24+k*16,2,3,'#cfe6ee');R(103,30+((k+.5)%1)*14,2,3,'#cfe6ee');}
 q.restore();
 if(o.birds)for(let i=0;i<3;i++){const a=t*2.6+i*2.09,x=80+Math.cos(a)*27,y=1+Math.sin(a)*4,f=Math.sin(t*14+i)>0?-1:0;R(x-3,y+f,2,1,'#f4d37a');R(x-1,y-1,3,3,'#f4d37a');R(x+2,y+f,2,1,'#f4d37a');R(x+2,y,1,1,'#e39a2a');R(x,y,1,1,'#160d0a');}
 return c.z;}

// ---------- Kleine Hof-Figuren (Weltpixel der Ludus-Karte, Füße bei x/y) ----------
// Doktor: gebückt, langer blutiger Kittel, weiße Haarbüschel, Stirnspiegel, Hammer und Meißel
// Figuren im Gladiatorenstil: ca. 58 Pixel hoch, dicke dunkle Umrisse, gleiche Pixelgröße wie die Rekruten.
// Gezeichnet in einen kleinen Zwischenspeicher, daraus wird die Umrisslinie (Silhouette in vier Richtungen) gebildet.
const OUTL='#1b2f2e',spr=new Map();
function sprite(q,key,x,y,d,draw){let s=spr.get(key);if(!s){s={c:mk(90,100),o:mk(90,100)};spr.set(key,s);}
 const g=s.c.getContext('2d'),go=s.o.getContext('2d');g.clearRect(0,0,90,100);const {R}=tl(g),OX=45,OY=90;
 draw((dx,dy,w,h,c)=>R(d>0?OX+dx:OX-dx-w+1,OY+dy,w,h,c));
 go.globalCompositeOperation='source-over';go.clearRect(0,0,90,100);go.drawImage(s.c,0,0);go.globalCompositeOperation='source-in';go.fillStyle=OUTL;go.fillRect(0,0,90,100);
 const bx=Math.round(x)-OX,by=Math.round(y)-OY;for(const [ox,oy] of [[-1,0],[1,0],[0,-1],[0,1]])q.drawImage(s.o,bx+ox,by+oy);q.drawImage(s.c,bx,by);}
function drawDocSmall(q,o){const d=o.dir||1,t=o.t||0,walk=!!o.walk,ph=o.phase||0,s=walk?Math.sin(ph):0,pose=o.pose||'stand',x=Math.round(o.x),y=Math.round(o.y);
 const bob=walk?Math.abs(Math.cos(ph))*1.5:(pose==='flail'?Math.abs(Math.sin(t*14))*2.5:Math.sin(t*2)*.5),by=-Math.round(bob);
 q.fillStyle='rgba(0,0,0,.28)';q.beginPath();q.ellipse(x,y+1,14,4,0,0,7);q.fill();
 sprite(q,'doc',x,y,d,P=>{
  // Beine: Gehzyklus mit Vor- und Rückschwung und angehobenem Fuß (Schrittlänge passt zur Wegstrecke, kein Rutschen)
  const legs=[0,1].map(k=>{const f=walk?ph*.98+k*Math.PI:0,fx=walk?Math.round(Math.sin(f)*6):(k?4:-4),lift=walk?Math.round(Math.max(0,Math.cos(f))*4):0;return {k,fx,lift,hx:0};}).sort((p,q)=>p.fx-q.fx);
  for(const L of legs){const back=walk&&L===legs[0],top=-14,bot=-4-L.lift;for(let i=0;i<=bot-top;i++){const u=i/Math.max(1,bot-top),px=Math.round(L.hx+(L.fx-L.hx)*u+(L.lift?Math.sin(u*Math.PI)*-2:0));P(px-2,top+i,4,1,back?DC.shade:DC.skin);P(px+1,top+i,1,1,DC.shade);}
   P(L.fx-3,bot,7,4,back?'#33241a':'#4a3424');P(L.fx-3,bot,7,1,'#6a5036');P(L.fx+3,bot+2,1,2,'#2a1c12');}
  // Kittel, vorn aufgerissen, mit Gürtelriemen und Blutspritzern
  for(let r=0;r<31;r++){const yy=-45+r+by,half=7+Math.round(r*.11),sw=walk?Math.round(s*(r>20?1.6:0)):0;
   if(r>=27&&hash(r*31+3)>.55)continue;
   for(let c=-half;c<half;c++){if(r>=26&&hash(c*17+r)>.72)continue;let col=c<-half+2?DC.coatS:DC.coat;if(c>=-1&&c<=0&&r<24)col='#5a4a3a';if(c>half-3&&r>4)col=DC.coatS;if(hash(c*13+r*7)>.93)col=DC.blood;P(c+sw,yy,1,1,col);}}
  P(-3,-45+by,6,2,'#d8cfb8');P(3,-37+by,5,4,DC.coatS);P(4,-39+by,1,3,DC.steel);P(-7,-21+by,14,1,'#5a4a3a');
  // Arme (Ärmel oben, Haut unten) mit Werkzeug
  const up=pose==='hammer'?Math.sin(t*10)>0:false,sl=Math.sin(t*16)*5;
  const hands=pose==='flail'?[[-15,-57+sl+by],[15,-57-sl+by]]:pose==='hammer'?[[-9,-30+by],[8,up?-60+by:-42+by]]:pose==='wave'?[[-10,-28+by],[13,-56+Math.sin(t*12)*3+by]]:[[-10,-27+by+(walk?s*3:0)],[10,-27+by-(walk?s*3:0)]];
  for(let i=0;i<2;i++){const sx=i?7:-8,sy=-43+by,[hx,hy]=hands[i];for(let k=0;k<=12;k++){const u=k/12,px=Math.round(sx+(hx-sx)*u),py=Math.round(sy+(hy-sy)*u);P(px-2,py,4,3,k>7?DC.skin:DC.coat);if(k<=7)P(px-2,py,1,3,DC.coatS);else P(px+1,py,1,3,DC.shade);}
   P(hx-3,hy-2,5,5,DC.skin);P(hx+1,hy-2,1,5,DC.shade);
   if(i===1){P(hx-1,hy-15,2,16,DC.wood);P(hx-4,hy-20,9,7,'#7a5a3a');P(hx-4,hy-20,9,2,'#9a7a52');P(hx-4,hy-14,9,1,'#4a3424');}else{P(hx-1,hy-10,2,9,DC.steel);P(hx-1,hy-10,1,2,DC.steelL);}}
  // Kopf: Glatze, wilde graue Büschel, Stirnspiegel, Schielen, Grinsen mit Zahnlücke
  const hx=1,hy=-59+by;P(hx-6,hy+1,13,13,DC.skin);P(hx+4,hy+1,3,13,DC.shade);P(hx-5,hy,11,1,DC.skin);P(hx-1,hy-2,1,3,DC.hair);P(hx+1,hy-1,1,2,DC.hair);
  for(let i=0;i<6;i++){const j=Math.round(Math.sin(t*9+i)*.8);P(hx-9-(i%2),hy+2+i*2+j,4,3,DC.hair);P(hx+6+(i%2),hy+2+i*2-j,4,3,DC.hair);}
  P(hx-6,hy+3,13,2,'#2d2a26');P(hx-2,hy+1,6,6,'#9aa4a6');P(hx-1,hy+2,4,4,'#dfe8ea');P(hx,hy+3,2,2,'#ffffff');
  P(hx-5,hy+7,4,3,'#f6f1df');P(hx+1,hy+7,4,3,'#f6f1df');P(hx-2,hy+8,2,2,'#101010');P(hx+1,hy+8,2,2,'#101010');P(hx-6,hy+6,5,1,DC.hair);P(hx+1,hy+6,5,1,DC.hair);
  P(hx+1,hy+9,4,4,'#d98a7a');P(hx+3,hy+10,2,2,'#b46a5c');
  P(hx-5,hy+11,11,1,DC.hair);P(hx-4,hy+12,9,2,'#2a1010');P(hx-3,hy+12,2,1,'#f6f1df');P(hx+1,hy+12,2,1,'#f6f1df');P(hx-5,hy+11,1,2,DC.hair);P(hx+5,hy+11,1,2,DC.hair);});}
// Schwester Valeria: gleiche Größe wie die Gladiatoren, lange Beine, kurzer Kittel mit rotem Gürtel, goldene Locken, Haube mit rotem Kreuz
function drawNurseSmall(q,o){const d=o.dir||1,t=o.t||0,walk=!!o.walk,ph=o.phase||0,s=walk?Math.sin(ph*1.47):0,sway=walk?Math.round(Math.sin(ph*1.47)):0,pose=o.pose||'stand',x=Math.round(o.x),y=Math.round(o.y);
 const by=walk?-Math.round(Math.abs(Math.cos(ph))*1.2):Math.round(Math.sin(t*2)*.5),sw=Math.sin(t*1.7),blink=(t%4.3)<.12;
 q.fillStyle='rgba(0,0,0,.26)';q.beginPath();q.ellipse(x,y+1,11,3.5,0,0,7);q.fill();
 sprite(q,'nurse',x,y,d,P=>{
  // lange Beine, Stöckelgang: kleine Schritte, Fuß wird angehoben, Hüfte schwingt
  const legs=[0,1].map(k=>{const f=walk?ph*1.47+k*Math.PI:0,fx=walk?Math.round(Math.sin(f)*4):(k?3:-3),lift=walk?Math.round(Math.max(0,Math.cos(f))*3):0;return {k,fx,lift,hx:0};}).sort((p,q)=>p.fx-q.fx);
  for(const L of legs){const back=walk&&L===legs[0],top=-29,bot=-4-L.lift;for(let i=0;i<=bot-top;i++){const u=i/Math.max(1,bot-top),px=Math.round(L.hx+(L.fx-L.hx)*u+(L.lift?Math.sin(u*Math.PI)*-1.5:0)),w=i<9?4:3;P(px-(w===4?2:1),top+i,w,1,back||i%7===6?NC.skinS:NC.skin);P(px+1,top+i,1,1,NC.skinS);}
   P(L.fx-2,bot,6,3,back?'#8a222a':'#b8323a');P(L.fx-2,bot,6,1,'#d4505a');P(L.fx-2,bot+2,1,2,'#8a222a');}
  // kurzer Kittel: Hüfte, Taille mit rotem Gürtel, Büste, Schultern
  const hw=[5,6,7,7,7,6,4,4,4,5,5,6,6,7,7];for(let r=0;r<15;r++){const yy=-41+r+by,h=hw[r]+(r>10?Math.min(1,Math.max(0,sway)):0);for(let c=-h;c<h;c++){P(c+(r>10?sway:0),yy,1,1,c<-h+1?NC.dressS:(r>12&&hash(c*5+r)>.9?NC.dressS:NC.dress));}}
  P(-4,-33+by,8,1,NC.red);P(-4,-32+by,8,1,'#8a222a');const bj=walk?(Math.cos(ph*2.94)>0?1:0):0;for(const bx of [-6,1]){P(bx+1,-41+by+bj,4,1,NC.dress);P(bx,-40+by+bj,6,4,NC.dress);P(bx+1,-36+by+bj,4,1,NC.dress);P(bx+1,-35+by+bj,4,1,NC.dressS);P(bx+1,-40+by+bj,1,1,'#ffffff');}P(-1,-40+by,2,5,NC.dressS);P(-2,-41+by,4,2,NC.skin);P(-1,-39+by,2,1,NC.skinS);
  // Arme
  const hands=pose==='wave'?[[-7,-27+by],[10,-54+Math.sin(t*12)*3+by]]:[[-8,-28+by+(walk?s*2:0)],[8,-28+by-(walk?s*2:0)]];
  for(let i=0;i<2;i++){const sx=i?5:-6,sy=-40+by,[hx,hy]=hands[i];for(let k=0;k<=12;k++){const u=k/12,px=Math.round(sx+(hx-sx)*u),py=Math.round(sy+(hy-sy)*u);P(px-1,py,3,3,NC.skin);P(px+1,py,1,3,NC.skinS);}P(hx-2,hy-1,4,4,NC.skin);}
  // Kopf mit goldenen Locken und Haube
  const hy=-57+by,lx=Math.round(sw*1.2);P(-8,hy+1,17,9,NC.hair);P(-8+lx,hy+8,4,15,NC.hair);P(5+lx,hy+8,4,15,NC.hair);P(-8+lx,hy+20,4,3,NC.hairL);P(5+lx,hy+20,4,3,NC.hairL);P(-7,hy+4,2,6,NC.hairL);
  P(-5,hy+3,11,11,NC.skin);P(3,hy+4,3,10,NC.skinS);P(-5,hy+3,11,2,NC.hair);
  if(blink){P(-4,hy+8,3,1,'#2a1a14');P(2,hy+8,3,1,'#2a1a14');}else{P(-4,hy+7,3,3,'#f6f1df');P(2,hy+7,3,3,'#f6f1df');P(-3,hy+8,2,2,'#1a3a6a');P(3,hy+8,2,2,'#1a3a6a');P(-4,hy+6,4,1,'#2a1a14');P(2,hy+6,4,1,'#2a1a14');}
  P(-4,hy+11,2,1,NC.blush);P(3,hy+11,2,1,NC.blush);P(-1,hy+12,3,2,NC.lip);
  P(-3,hy+13,7,3,NC.skin);P(2,hy+13,2,3,NC.skinS);P(-5,hy-2,11,5,NC.dress);P(-5,hy-2,1,5,NC.dressS);P(-2,hy,5,1,NC.red);P(0,hy-2,1,5,NC.red);P(-1,hy-2,3,1,NC.red);});}
// Patient im Krankenbett vor dem Medicus: Kopf mit Verband auf dem Kissen, Decke darüber (Weltpixel, x/y = Kopfmitte)
function drawBedPatient(q,o){const {R,E}=tl(q),A=o.g?.appearance||{},sk=A.skin||'#c19169',sh=A.shade||'#875e43',x=Math.round(o.x),y=Math.round(o.y),t=o.t||0,br=Math.sin(t*1.8)>0?1:0;
 R(x+5,y-4-br,34,15+br,'#6f7f62');R(x+5,y-4-br,34,2,'#93a483');for(let i=0;i<4;i++)R(x+10+i*8,y,1,10,'#5d6b52');R(x+5,y+10,34,1,'#4e5a45');
 R(x+7,y-1,9,3,sk);R(x+14,y-1,2,3,sh);
 E(x,y,5,5,sk);R(x+3,y-3,2,7,sh);
 if(o.g?.dokWound&&!o.g?.dokSkull){R(x-3,y-6,6,3,'#bf5e59');R(x-2,y-6,4,2,'#3c1520');R(x-1,y-6,2,1,'#a8372f');R(x+2,y-4,1,3,'#a8372f');R(x-3,y-4,1,2,'#a8372f');}
 if(o.g?.dokSkull){R(x-3,y-6,6,3,'#3c1520');R(x-2,y-7,4,1,'#d6c6a3');R(x-1,y-6,2,1,'#fff0cd');R(x+2,y-4,1,3,'#a8372f');R(x-4,y-5,1,2,'#a8372f');}
 if(o.cross){R(x-3,y,2,2,'#f6f1df');R(x+1,y,2,2,'#f6f1df');R(x-2,y+1,1,1,'#101010');R(x+1,y,1,1,'#101010');R(x-1,y+3,3,2,'#5c1a1a');R(x,y+5,1,2+Math.round((t*.8)%1*3),'#cfe6ee');}
 else{R(x-3,y,2,1,'#3a2a1a');R(x+1,y,2,1,'#3a2a1a');R(x-1,y+3,2,1,'#5c1a1a');}}
// =====================================================================================================
// 2 · REGELN DES BEHANDLUNGSSTUHLS
// =====================================================================================================
// Wo welche Anlage wohnt: Stelle auf dem Schädel (Koordinaten der Großaufnahme, Blick von vorn)
const SPOTS={strength:[80,7],will:[80,13],stamina:[70,10],condition:[90,10],toughness:[73,17],pain:[87,17],agility:[63,15],dexterity:[97,15],precision:[80,22],tactics:[70,25],teamwork:[90,25],reflex:[58,24],block:[102,24],balance:[56,37],aggression:[104,37]};
const KEYS=Object.keys(M.stats).filter(k=>SPOTS[k]);
const WHERE={strength:'ganz oben auf dem Scheitel',will:'unter dem Scheitel',stamina:'hinten links',condition:'hinten rechts',toughness:'links vom Wirbel',pain:'rechts vom Wirbel',agility:'über dem linken Ohr',dexterity:'über dem rechten Ohr',precision:'mitten auf der Stirn',tactics:'linke Stirn',teamwork:'rechte Stirn',reflex:'linke Schläfe oben',block:'rechte Schläfe oben',balance:'gleich neben dem linken Ohr',aggression:'neben dem rechten Ohr'};
const RULE={days:10,malus:.10,failMax:.10,failMin:.05};
// Risiko: frischer Rekrut 10 %, erfahrener Veteran bis hinunter auf 5 % (Erfahrung und Zahl der Kämpfe)
const vet=g=>cl(Math.max(((g.stats?.experience||0)-20)/60,(g.fights||0)/40));
const failChance=g=>RULE.failMax-(RULE.failMax-RULE.failMin)*vet(g);
const statName=k=>M.stats[k]||k;
const capsOf=g=>{if(!g.caps)M.ensureCareer?.(g);return g.caps?.stats||{};};
function rollCap(g){let hits=0;const p=.52+(g.potential||60)*.0026;for(let i=0;i<32;i++)if(Math.random()<p)hits++;return Math.round(1+99*hits/32);}
// Erfolg: die Anlage (Obergrenze) des Werts wird neu ausgewürfelt, wie bei der Entstehung des Gladiators. Liegt der aktuelle Wert darüber, sinkt er mit.
function reroll(g,key,better){const caps=capsOf(g),old=caps[key],val0=g.stats[key];let nv=rollCap(g);if(better){for(let i=0;i<80&&nv<=old;i++)nv=rollCap(g);if(nv<=old)nv=Math.min(99,old+9);}
 caps[key]=nv;if(g.stats[key]>nv)g.stats[key]=nv;return {ok:true,key,old,nv,val0,val:g.stats[key]};}
// Fehlschlag: Hirnschaden. Alle Werte verlieren ein Zehntel (Wert und Anlage), dazu schielt er für immer.
function wreck(g,key){const caps=capsOf(g),rows=[];
 for(const k of Object.keys(M.stats)){const a=g.stats[k],c=caps[k];if(a==null)continue;g.stats[k]=Math.max(1,Math.min(a-1,Math.round(a*(1-RULE.malus))));if(c!=null)caps[k]=Math.max(g.stats[k],Math.min(c-1,Math.round(c*(1-RULE.malus))));rows.push({k,a,b:g.stats[k],c,d:caps[k]});}
 g.dokCross=true;g.dokFails=(g.dokFails||0)+1;M.addScar?.(g,'head','Meißelunfall');return {ok:false,key,rows};}
// So oder so: zehn Tage Krankenbett, Kopfverband (Kopfwunde, die nach den Heilregeln des Spiels genau zehn Tage braucht)
const perDay=()=>(3+(S.buildings?.hospital||0))*(M.HEAL_SPEED||1);
function toBed(g,fail,variant){const h=g.body.head;h.hp=Math.max(4,Math.round(100-(h.chronic||0)-RULE.days*perDay()));h.pain=Math.max(h.pain||0,fail?70:40);h.injury=fail?'Meißelunfall':'Meißelbehandlung';h.grade=M.injuryGrade?.(h)??h.grade;
 try{M.noteInjury?.(g,'head',h.injury,DOC,'Meißel und Hammer');}catch{}h.hp=Math.max(4,Math.round(100-(h.chronic||0)-RULE.days*perDay()));h.dokUntil=S.day+RULE.days;g.dok=(g.dok||0)+1;{const vis=M.medic?.state?.().vis;if(vis){const v=vis[g.id]??={};v.marks={...(v.marks||{}),head:1};}}if(fail&&variant==='skull'){g.dokSkull=true;h.fracture={days:RULE.days,total:RULE.days,severe:true,skull:true};}}
// Zehn Tage Bettruhe ab dem Schlag, unabhängig davon, wie schnell die Kopfwunde nach den Heilregeln zuheilt
function bedDays(g){const h=g?.body?.head;if(!h)return 0;if(h.dokUntil)return Math.max(0,h.dokUntil-S.day);if(!/^Meißel/.test(h.injury||''))return 0;const open=100-(h.chronic||0)-h.hp;return open>0?Math.ceil(open/perDay()):0;}
function treat(g,key,outcome,better,variant){const r=outcome==='ok'?reroll(g,key,better):wreck(g,key);if(outcome==='ok'){g.dokWound=key;g.dokSkull=false;}toBed(g,outcome!=='ok',variant);M.persist?.();return r;}

// =====================================================================================================
// 3 · DER BEHANDLUNGSSTUHL: Bild (220 × 140 Pixel, dreifach vergrößert) und Ablauf eines Schlags
// =====================================================================================================
const CW=220,CH=140,PX=-4,PY=34,DXo=90,DYo=4;
const spotAt=k=>{const [x,y]=SPOTS[k]||SPOTS.strength;return {x:x+PX,y:y+PY};};
// Varianten: Erfolg (klonk, dreimal klopfen, Niesen) und Fehlschlag (schaut der Schwester nach, Hammerkopf fliegt ab, Meißel rutscht)
const VARS={ok:[['klonk','Sauberer Schlag'],['triple','Dreimal klopfen'],['sneeze','Niesen']],fail:[['skull','Schädelbruch: Hammer statt Meißel'],['nurse','Schaut der Schwester nach'],['flyhead','Hammerkopf fliegt ab'],['slip','Meißel rutscht ab']]};
const IMPACT={skull:2.7,klonk:2.32,triple:3.12,sneeze:2.82,nurse:2.62,flyhead:3.25,slip:2.32};
const SAY={
 aim:['Stillhalten. Ich klopfe nur kurz an.','Die {s} wohnt {w}. Mal sehen, ob jemand zu Hause ist.','Keine Sorge. Ich habe das schon einmal gemacht. Gesehen. Ungefähr.','Bitte nicht atmen. Atmen stört mich.','Ein kleiner Klaps für mich, ein großer Sprung für deine {s}.'],
 ok:['TADAA! Ein neuer Mensch! Teilweise.','Sehen Sie? MEDIZIN!','Hervorragend. Ich bin ein Genie. Schwester, schreiben Sie das auf.','Klonk. Das schönste Geräusch der Welt.'],
 fail:['Hoppla.','Das ... war so nicht geplant. Aber interessant!','Schwester! Den Eimer! Nein, den GROSSEN Eimer!','Ich nenne es: Charakterbildung.','Na ja. Schielen ist auch eine Art, die Welt zu sehen.','Sieh es positiv: Er wird nie wieder Angst haben. Er weiß nicht mehr, wovor.','Er lacht. Ich werte das als Behandlungserfolg.','Notieren Sie, Schwester: Patient sehr zufrieden. Glaube ich.'],
 skull:['Oh. Habe ich wieder mal vergessen, den Meißel zu benutzen.'],nurse:['Was? Ich war konzentriert! Auf ... Dinge.'],flyhead:['Der Hammer ist schuld. Ich verklage ihn.'],slip:['Der Meißel ist gerutscht. Ganz allein. Ich war nicht mal in der Nähe.'],sneeze:['Gesundheit! Für mich, meine ich.'],
 bed:['Zehn Tage Bettruhe. Und keine Rechenaufgaben.','Schwester Valeria macht Visite. Ich mache Mittag.']};
const fill=(s,k)=>s.replace(/\{s\}/g,statName(k)).replace(/\{w\}/g,WHERE[k]||'irgendwo');
// Ablauf eines Schlags. o: {g,key,outcome:'ok'|'fail',variant,from,better,onImpact,onDone}
function newProc(o){const variant=o.variant||(o.outcome==='fail'?'skull':pick(VARS[o.outcome].map(v=>v[0])));return {g:o.g,key:o.key,outcome:o.outcome,variant,better:!!o.better,from:o.from||o.key,t:0,impact:IMPACT[variant],hit:false,done:false,res:null,fx:[],onImpact:o.onImpact,onDone:o.onDone,said:{}};}
function stepProc(P,dt){if(P.done)return;P.t+=dt;const t=P.t,I=P.impact;
 if(P.variant==='triple')for(const tt of [1.42,1.82,2.22])if(t>=tt&&!P.said['tap'+tt]){P.said['tap'+tt]=1;M.sound?.('block');P.fx.push({text:'tock',x:spotAt(P.key).x+10,y:spotAt(P.key).y-20,t:0,c:'#eee2c1',s:14});}
 if(P.variant==='sneeze'&&t>=2.0&&!P.said.sn){P.said.sn=1;P.fx.push({text:'HATSCHI!',x:170,y:16,t:0,c:'#eee2c1',s:22});}
 if(P.variant==='flyhead'&&t>=2.32&&!P.said.fly){P.said.fly=1;M.sound?.('block');P.fx.push({text:'KLACK',x:spotAt(P.key).x+18,y:spotAt(P.key).y-24,t:0,c:'#eee2c1',s:14});}
 if(!P.hit&&t>=I){P.hit=true;P.res=treat(P.g,P.key,P.outcome,P.better,P.variant);const s=P.variant==='skull'?(P.anchorNow||spotAt('strength')):P.outcome==='ok'?spotAt(P.key):P.variant==='slip'?{x:76+PX+4,y:30+PY}:P.variant==='nurse'?{x:80+PX,y:20+PY}:spotAt(P.key);P.hitAt=s;
  if(P.outcome==='ok'){M.sound?.('block');P.fx.push({text:'KLONK!',x:s.x,y:s.y-30,t:0,c:'#f4d37a',s:30,big:1});for(let i=0;i<14;i++)P.fx.push({px:1,x:s.x+4,y:s.y-14,vx:(Math.random()-.5)*70,vy:-20-Math.random()*50,life:.5,c:i%2?'#fff6c8':'#f4d37a'});for(let i=0;i<110;i++)P.fx.push({px:1,blood:1,big:Math.random()<.25,x:s.x,y:s.y,vx:(Math.random()-.5)*110,vy:-50-Math.random()*110,life:1.3,c:i%3?'#a8372f':'#c9453a'});P.splats=Array.from({length:8},()=>({x:.05+Math.random()*.9,y:.04+Math.random()*.6,r:.012+Math.random()*.03,drip:.05+Math.random()*.2,seed:Math.random()*9}));}
  else{M.sound?.('heavy');setTimeout(()=>M.sound?.('heavy'),120);M.voice?.('pain',P.g.appearance?.voice,true);P.fx.push({text:P.variant==='skull'?'SCHÄDELBRUCH!':'KRACK!',x:s.x,y:s.y-30,t:0,c:'#f29b83',s:P.variant==='skull'?40:36,big:1});if(P.variant==='skull'){M.sound?.('heavy');setTimeout(()=>M.sound?.('block'),200);for(let i=0;i<40;i++)P.fx.push({px:1,x:s.x,y:s.y,vx:(Math.random()-.5)*150,vy:-60-Math.random()*110,life:1.1,c:i%3?'#efe6cf':'#cfc4a6'});for(let i=0;i<150;i++)P.fx.push({px:1,blood:1,big:Math.random()<.35,x:s.x,y:s.y,vx:(Math.random()-.5)*150,vy:-60-Math.random()*130,life:1.6,c:i%3?'#a8372f':'#7b2f2a'});}P.splats=Array.from({length:P.variant==='skull'?16:7},()=>({x:.06+Math.random()*.88,y:.04+Math.random()*.55,r:.012+Math.random()*.03,drip:.06+Math.random()*.25,seed:Math.random()*9}));for(let i=0;i<90;i++)P.fx.push({px:1,blood:1,x:s.x,y:s.y,vx:(Math.random()-.5)*90,vy:-40-Math.random()*90,life:1.4,c:i%3?'#a8372f':'#7b2f2a'});}
  P.onImpact?.(P);}
 if(P.hit&&P.outcome==='fail'){for(const [tt,txt,c] of [[.55,'*DOIIIING*','#f4d37a'],[1.5,'ÄÄÄH …','#cfe6ee'],[2.3,'HIHI.','#f4d37a']])if(t>=I+tt&&!P.said['x'+tt]){P.said['x'+tt]=1;P.fx.push({text:txt,x:60+Math.random()*30,y:18,t:0,c,s:tt<1?24:18});if(tt<1)M.sound?.('block');}}
 if(P.hit&&(P.outcome==='fail'?t<I+(P.variant==='skull'?3.4:2.6):t<I+1.6)&&Math.random()<dt*(t<I+.8?(P.variant==='skull'?160:90):(P.outcome==='ok'?45:40))){const s=P.anchorNow||P.hitAt;P.fx.push({px:1,blood:1,fol:1,ax:s.x,ay:s.y,big:Math.random()<.3,x:s.x,y:s.y,vx:(Math.random()-.5)*60,vy:-50-Math.random()*90,life:1.4,c:Math.random()<.5?'#a8372f':'#c9453a'});}
 for(const f of P.fx){f.t=(f.t||0)+dt;if(f.px){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=160*dt;f.life-=dt;}}P.fx=P.fx.filter(f=>f.px?f.life>0&&f.y<CH:f.t<1.4);
 if(t>=I+4.3){P.done=true;P.onDone?.(P);}}
// Stand des Bildes zu einem Zeitpunkt: Meißel, Hammer, Blick und Mimik
function pose(P,base){const t=P?P.t:0,I=P?P.impact:9,v=P?.variant,to=spotAt(P?P.key:base.key),fr=spotAt(P?P.from:(base.from||base.key)),aim=P?ease(t/.8):ease(base.aim??1);
 let tip={x:lerp(fr.x,to.x,aim),y:lerp(fr.y,to.y,aim)};if(P&&t>.8&&t<1.2)tip.x+=Math.round(Math.sin(t*40));
 let lift=0,strike=0,head=null,chiselDrop=0;
 if(P){if(v==='triple'){for(const tt of [1.42,1.82,2.22]){const d=t-(tt-.2);if(d>0&&d<.3)lift=Math.max(lift,.25*Math.sin(d/.3*Math.PI));}if(t>2.4)lift=ease((t-2.4)/.6);}
  else lift=t>1.2?ease((t-1.2)/1.0):0;
  const sw=I-.14;if(t>=sw){strike=ease((t-sw)/.12);lift=1-strike;}if(t>=I){strike=1;lift=0;}
  if(t>I+.5){const k=ease((t-I-.5)/.8);strike=1-k;}
  if(v==='sneeze'&&t>2.0&&t<2.6)tip.x+=Math.round(Math.sin(t*50)*2);
  if(v==='slip'&&t>=I){const k=ease((t-I)/.2);tip={x:lerp(to.x,80+PX,k),y:lerp(to.y,30+PY,k)};}
  if(v==='flyhead'&&t>=2.32){const u=t-2.32;head={x:to.x+6+u*8,y:to.y-28-(u*70-u*u*48)};if(t>=I)head={x:to.x+2,y:to.y-6+Math.min(6,(t-I)*30)};}
  if(t>=I&&P.outcome==='fail'&&v!=='flyhead'&&v!=='skull')chiselDrop=ease((t-I)/.5);}
 const look=P&&v==='nurse'&&t>.9&&t<I+.3?-1:0;
 let htip=null;if(v==='skull'){const H=spotAt('strength');htip={x:H.x-7,y:H.y+21};tip={x:DXo+14+Math.round(Math.sin(t*3)),y:DYo+52};chiselDrop=0;}
 return {tip,htip,lift,strike,head,chiselDrop,look};}
// Krankenschwester im Türrahmen (Flur): läuft vorbei, wenn sie gebraucht wird
function nurseInDoor(q,t,x,dir){q.save();q.beginPath();q.rect(4,20,32,92);q.clip();q.translate(x,110);q.scale(1.5,1.5);drawNurseSmall(q,{x:0,y:0,t,walk:true,phase:t*5.6,dir});q.restore();}
const chairCv=mk(CW,CH);
// Zeichnet das ganze Bild auf ctx (Zielgröße w × h). base: {g,key} im Ruhezustand, P: laufender Schlag oder null
function paintChair(ctx,w,h,t,base,P,o={}){const q=chairCv.getContext('2d');q.imageSmoothingEnabled=false;q.setTransform(1,0,0,1,0,0);const {R,E,L}=tl(q),g=P?P.g:base.g,key=P?P.key:base.key,ps=pose(P,base),I=P?P.impact:9,pt=P?P.t:0,hit=P&&P.hit,fail=P&&P.outcome==='fail',SK=P&&P.variant==='skull';
 q.drawImage(room(CW,CH,'chair'),0,0);candle(q,CW,CH,t,146,40);
 // Schwester im Flur: bei „nurse“ während des Schlags, sonst gelegentlich
 if(P&&P.variant==='nurse'&&pt>.6&&pt<I+.6)nurseInDoor(q,t,lerp(46,-8,cl((pt-.6)/(I-.2))),-1);
 else if(o.nurse!=null)nurseInDoor(q,t,o.nurse,o.nurseDir||-1);
 // Stuhl: Pfosten, Lehne, Lederpolster mit Blut
 R(36,38,6,102,'#3e2c1d');R(118,38,6,102,'#3e2c1d');R(37,38,2,102,'#6b4c2e');R(119,38,2,102,'#6b4c2e');R(42,46,76,94,'#4a3524');for(let x=48;x<114;x+=11)R(x,46,3,94,'#3a2a1c');
 R(46,30,68,14,'#2e1c14');R(47,31,66,12,'#6a2f2a');R(47,31,66,2,'#8a3f36');E(60,40,6,2,'#4a1612');E(98,36,4,2,'#4a1612');R(36,36,8,4,'#7d8687');R(116,36,8,4,'#7d8687');
 for(const [x,y] of [[40,70],[121,96],[38,118],[120,60]]){R(x,y,2,6,'#6e1d18');R(x,y+6,1,4,'#6e1d18');}
 // Doktor: Kopf und Kittel (hinter dem Patienten)
 const dmood=!P?(Math.sin(t*.4)>.6?'grin':'confident'):pt<1.2?'confident':!hit?(P.variant==='nurse'&&pt>1?'grin':'roar'):fail?(pt<I+1.2?'shock':'grin'):'grin';
 const dyaw=ps.look<0?-.75:(!P?Math.sin(t*.5)*.3-.35:-.35);
 q.drawImage(doctorBuf(t,{mood:dmood,yaw:dyaw,look:ps.look<0?-1:-.6,hearts:ps.look<0,blood:fail&&hit}),DXo,DYo);
 for(let y=DYo+FH-2;y<CH;y++){const k=(y-(DYo+FH))/40,x0=DXo+lerp(20,14,k),x1=DXo+lerp(140,146,k);R(x0,y,x1-x0,1,DC.coat);R(x0,y,3,1,DC.coatS);R(x1-3,y,3,1,DC.coatS);}
 R(DXo+68,DYo+FH-2,24,CH-(DYo+FH)+2,'#5a4a3a');for(const [x,y] of [[DXo+40,118],[DXo+118,124],[DXo+30,132]])E(x,y,2,2,DC.blood);
 // Patient im Stuhl
 const pm=!P?'nervous':pt<1.2?'nervous':!hit?'scared':fail?(pt<I+.7?'pain':'dumb'):(pt<I+.5?'pain':pt<I+2.2?'relief':'calm');
 const inBed=!P&&bedDays(g)>0,band=0,cross=fail?pt>I+.6:!!g.dokCross;if(inBed&&!o.banner)o={...o,banner:'IM KRANKENBETT · NOCH '+bedDays(g)+(bedDays(g)===1?' TAG':' TAGE')};
 const pb=patientBuf(g,t,{mood:inBed?(g.dokCross?'dumb':'calm'):pm,cross,marks:!hit&&!inBed,mark:hit||inBed?null:key,sweat:!hit&&!inBed,lump:hit&&!fail&&band<1?key:null,skull:SK&&hit?pt-I:undefined,wt:hit?pt-I:undefined,wound:hit&&fail&&band<1?(P.variant==='skull'?null:P.variant==='slip'?'precision':P.variant==='nurse'?'precision':key):null,stars:hit&&!fail&&pt<I+3,drool:(hit&&fail)||(inBed&&g.dokCross),blood:hit?(fail?1:.7):0,hurt:hit&&fail?.8:0,bandage:band,yaw:hit&&!fail?Math.sin(t*3)*.3:undefined,crossX:fail&&hit?pt>I+.5:undefined,spin:fail&&hit&&pt<I+1.9,tongue:(fail&&hit&&pt>I+1.4)||(inBed&&g.dokCross),birds:(fail&&hit&&pt>I+1.6)||(inBed&&g.dokCross),tilt:fail&&hit&&pt>I+.5?Math.sin(t*2.1)*.16+(pt<I+1.6?Math.sin(t*37)*.06:0):undefined});{const sq=SK&&hit?1-.2*Math.max(0,1-(pt-I)/.5):1,dyq=Math.round(FH*(1-sq));q.drawImage(pb,0,0,FW,FH,PX,PY+dyq,FW,Math.round(FH*sq));if(P){const an=patientBuf.anchor;P.anchorNow={x:PX+an.x,y:PY+dyq+an.y*sq};}}
 // Brustgurt mit Schnalle, Armlehnen
 R(14,118,140,6,'#4a2f1d');R(14,118,140,1,'#7a5236');R(78,117,8,8,'#c9a85e');R(80,119,4,4,'#4a2f1d');R(8,126,30,4,'#5b4330');R(122,126,32,4,'#5b4330');
 // Werkzeug und Arme des Doktors (vor dem Patienten)
 const tip=ps.tip,top={x:tip.x+5,y:tip.y-17},drop=ps.chiselDrop,ht=ps.htip||tip,htop={x:ht.x+5,y:ht.y-17};
 const cT=drop?{x:tip.x+drop*16,y:tip.y+drop*44}:tip,cTop=drop?{x:top.x+drop*24,y:top.y+drop*48}:top;
 L(cT.x,cT.y,lerp(cT.x,cTop.x,.62),lerp(cT.y,cTop.y,.62),2,DC.steel);L(cT.x+1,cT.y-1,lerp(cT.x,cTop.x,.6)+1,lerp(cT.y,cTop.y,.6),1,DC.steelL);R(cT.x-1,cT.y,2,2,DC.steelD);L(lerp(cT.x,cTop.x,.62),lerp(cT.y,cTop.y,.62),cTop.x,cTop.y,3,DC.wood);R(cTop.x-2,cTop.y-1,4,2,'#a8875e');
 const sL={x:DXo+46,y:DYo+80},hL=drop?{x:tip.x+14,y:tip.y-4}:{x:lerp(cT.x,cTop.x,.45)+1,y:lerp(cT.y,cTop.y,.45)};
 const eL={x:Math.max(hL.x+18,lerp(sL.x,hL.x,.35)),y:Math.min(sL.y,hL.y)-20};for(const [a,b] of [[sL,eL],[eL,{x:hL.x+3,y:hL.y+1}]])L(a.x,a.y,b.x,b.y,6,DC.coatD);for(const [a,b] of [[sL,eL],[eL,{x:hL.x+3,y:hL.y+1}]])L(a.x,a.y,b.x,b.y,4,DC.coat);R(eL.x-1,eL.y-2,3,2,DC.coatS);R(hL.x-1,hL.y-2,5,5,DC.skin);R(hL.x+3,hL.y-2,1,5,DC.shade);
 const rest={hx:DXo+40,hy:96,kx:DXo+30,ky:82,ex:DXo+50,ey:108},up={hx:htop.x+14,hy:htop.y-34,kx:htop.x+2,ky:htop.y-42,ex:htop.x+34,ey:htop.y+6},down={hx:htop.x+14,hy:htop.y+4,kx:htop.x+2,ky:htop.y-4,ex:htop.x+34,ey:htop.y+22};
 let hd,kd,el;const mixP=(a,b,c,ka,kb)=>({h:{x:lerp(lerp(a.hx,b.hx,ka),c.hx,kb),y:lerp(lerp(a.hy,b.hy,ka),c.hy,kb)},k:{x:lerp(lerp(a.kx,b.kx,ka),c.kx,kb),y:lerp(lerp(a.ky,b.ky,ka),c.ky,kb)},e:{x:lerp(lerp(a.ex,b.ex,ka),c.ex,kb),y:lerp(lerp(a.ey,b.ey,ka),c.ey,kb)}});
 if(!P||pt<1.2&&P.variant!=='triple'){({h:hd,k:kd,e:el}=mixP(rest,rest,rest,0,0));}else{({h:hd,k:kd,e:el}=mixP(rest,up,down,ps.lift,ps.strike));
  if(P.variant==='nurse'&&ps.strike>0){const fo={x:80+PX+12,y:22+PY-8};kd={x:lerp(kd.x,fo.x,ps.strike),y:lerp(kd.y,fo.y,ps.strike)};hd={x:kd.x+12,y:kd.y+8};el={x:kd.x+30,y:kd.y+22};}
  if(P.variant==='sneeze'&&pt>2.0&&pt<2.6){hd.x+=Math.sin(pt*60)*3;kd.x+=Math.sin(pt*60)*4;}}
 if(t>0&&(!P||pt<1.2)){hd.y+=Math.round(Math.sin(t*2)*1);kd.y+=Math.round(Math.sin(t*2)*1);}
 const sR={x:DXo+52,y:DYo+84};for(const [a,b] of [[sR,el],[el,hd]])L(a.x,a.y,b.x,b.y,7,DC.coatD);for(const [a,b] of [[sR,el],[el,hd]])L(a.x,a.y,b.x,b.y,5,DC.coat);R(lerp(el.x,hd.x,.4),lerp(el.y,hd.y,.4),2,2,DC.blood);
 const headOff=!!ps.head;L(hd.x,hd.y,headOff?hd.x-10:kd.x,headOff?hd.y-8:kd.y,2,DC.woodD);R(hd.x-2,hd.y-2,5,5,DC.skin);R(hd.x+2,hd.y-2,1,5,DC.shade);
 const hh=ps.head||kd;R(hh.x-8,hh.y-6,17,12,'#3e2c1d');R(hh.x-7,hh.y-5,15,10,'#8a6644');R(hh.x-7,hh.y-5,15,2,'#a8875e');R(hh.x-8,hh.y-1,17,3,'#7d8687');R(hh.x-8,hh.y-1,17,1,'#b9c1b2');R(hh.x+4,hh.y+2,2,2,'#6e1d18');if(headOff){R(hd.x-11,hd.y-9,3,3,'#e8dcc0');}
 // Effekte
 for(const f of P?.fx||[])if(f.px){const fw=f.fol&&P.anchorNow?Math.max(0,1-(f.t||0)/.5):0;R(f.x+(fw?(P.anchorNow.x-f.ax)*fw:0),f.y+(fw?(P.anchorNow.y-f.ay)*fw:0),f.blood?(f.big?3:2):1,f.blood?(f.big?3:2):1,f.c);}
 if(fail&&hit)for(const [x,y,r] of [[60,128,9],[100,134,6],[30,136,5]]){const k=cl((pt-I)/2);if(k>0)E(x,y,Math.round(r*k)+1,Math.max(1,Math.round(r*k*.3)),'#7b1f1a');}
 // Ausgabe dreifach vergrößert, Texte in Bildschirmauflösung
 const sc=Math.min(w/CW,h/CH),dw=CW*sc,dh=CH*sc,ox=(w-dw)/2,oy=(h-dh)/2,sh=P&&P.hit?(fail?(pt<I+1.3?(SK?24:14)*(1-(pt-I)/1.3):0):(pt<I+.5?7*(1-(pt-I)/.5):0)):0;
 ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#0d0907';ctx.fillRect(0,0,w,h);ctx.drawImage(chairCv,Math.round(ox+(Math.random()-.5)*sh),Math.round(oy+(Math.random()-.5)*sh),Math.round(dw),Math.round(dh));
 if(fail&&hit&&pt<I+1){const a=.5*Math.max(0,Math.sin((pt-I)*Math.PI*3.4))*(1-(pt-I));ctx.fillStyle=`rgba(190,20,15,${a.toFixed(3)})`;ctx.fillRect(0,0,w,h);}
 if(hit&&P.splats){const fade=cl(1-(pt-I-3.2)/1.2);ctx.globalAlpha=fade;for(const s of P.splats){const x=s.x*w,y=s.y*h,r=s.r*w,d=Math.min(s.drip,(pt-I)*.08)*h;ctx.fillStyle='#8a1a14';ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();for(let k=0;k<5;k++){const a=s.seed+k*1.3;ctx.beginPath();ctx.arc(x+Math.cos(a)*r*1.3,y+Math.sin(a)*r*1.1,r*.28,0,7);ctx.fill();}ctx.fillRect(x-r*.18,y,r*.36,d);ctx.beginPath();ctx.arc(x,y+d,r*.25,0,7);ctx.fill();ctx.fillStyle='rgba(255,120,110,.35)';ctx.beginPath();ctx.arc(x-r*.3,y-r*.3,r*.25,0,7);ctx.fill();ctx.fillStyle='#8a1a14';}ctx.globalAlpha=1;}
 ctx.textAlign='center';ctx.textBaseline='middle';
 for(const f of P?.fx||[])if(f.text){const u=f.t/1.4,x=ox+f.x*sc,y=oy+(f.y-u*10)*sc,size=Math.round((f.s||20)*sc/3*(f.big&&u<.15?1+(.15-u)*3:1));ctx.globalAlpha=u<.7?1:1-(u-.7)/.3;ctx.font=`bold ${size}px 'Courier Prime',monospace`;ctx.fillStyle='#17201c';ctx.fillText(f.text,x+3,y+3);ctx.fillStyle=f.c;ctx.fillText(f.text,x,y);ctx.globalAlpha=1;}
 if(o.banner||(P&&P.res&&pt>I+1.1)){const r=o.banner?null:P?.res,txt=o.banner||(r.ok?`${statName(r.key).toUpperCase()}: ANLAGE ${r.old} → ${r.nv}`:(SK?'SCHÄDELBRUCH':'HIRNSCHADEN')+' · ALLE WERTE −10 %'),sub=o.banner?'':P.res.ok?(r.nv>r.old?'Glück gehabt.':r.nv<r.old?'Schlechter als vorher. Pech.':'Unverändert.'):(P.quip??=pick(['Schielt für immer. Sieht jetzt zwei Gegner. Trifft keinen.','Keine Sorgen mehr. Er weiß nicht mehr, was das ist.','Zählt jetzt bis drei. An guten Tagen.','Kann sich selbst in die Ohren schauen.']));
  const by=h-Math.round(52*sc/3);ctx.fillStyle='rgba(13,9,7,.78)';ctx.fillRect(0,by-Math.round(18*sc/3),w,Math.round(40*sc/3));ctx.font=`bold ${Math.round(17*sc/3)}px 'Courier Prime',monospace`;ctx.fillStyle=(r&&!r.ok)||o.bannerRed?'#f29b83':'#f4d37a';ctx.fillText(txt,w/2,by-Math.round(5*sc/3));ctx.font=`${Math.round(11*sc/3)}px 'Courier Prime',monospace`;ctx.fillStyle='#e8dcc0';ctx.fillText(sub,w/2,by+Math.round(11*sc/3));}
 const vg=ctx.createRadialGradient(w/2,h*.45,Math.min(w,h)*.4,w/2,h*.5,Math.max(w,h)*.78);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.5)');ctx.fillStyle=vg;ctx.fillRect(0,0,w,h);}

// =====================================================================================================
// 4 · BEHANDLUNGSTISCH: Oberfläche (Gladiator wählen, Wert wählen, zuschlagen, Ergebnis)
// =====================================================================================================
let chair=null;
const living=()=>S.roster.filter(g=>!g.dead&&!g.retired);
const lowKey=g=>{const c=capsOf(g);return KEYS.slice().sort((a,b)=>(c[a]??99)-(c[b]??99))[0];};
const first=g=>String(g?.name||'').split(' ')[0];
function openChair(gid){closeAll();const men=living();if(!men.length){M.ui.notify?.('Niemand da, den man auf den Stuhl setzen könnte.');return;}
 const g=men.find(x=>x.id===gid)||men.find(x=>!bedDays(x))||men[0];
 chair={g,key:lowKey(g),from:null,aim:1,P:null,t:0,line:'Ah! Ein Freiwilliger! Setz dich. Das Blut auf dem Polster ist schon trocken.',lineT:0,nurse:null,nurseT:6+Math.random()*6,force:'rand',variant:'rand',last:null};
 const v=document.createElement('div');v.className='dok-chair';v.setAttribute('role','dialog');v.setAttribute('aria-label','Behandlungstisch');
 v.innerHTML=`<div class="dok-panel"><header><div><b>BEHANDLUNGSTISCH</b><small>${esc(DOC)} · Schwester Valeria</small></div><button class="btn small" type="button" data-dok="close" aria-label="Schließen">✕</button></header>
<div class="dok-men" id="dokMen"></div>
<div class="dok-stage"><canvas id="dokChair" width="660" height="420"></canvas><p class="dok-line" id="dokLine"></p></div>
<div class="dok-who" id="dokWho"></div>
<div class="dok-stats" id="dokStats"></div>
<div class="dok-go"><p class="dok-odds" id="dokOdds"></p><button class="btn primary dok-hit" type="button" data-dok="go">ZUSCHLAGEN!</button></div>
<div class="dok-result" id="dokResult" hidden></div>
</div>`;
 document.body.appendChild(v);v.addEventListener('change',e=>{if(e.target.id==='dokForce')chair.force=e.target.value;if(e.target.id==='dokVar')chair.variant=e.target.value;});
 renderChair();loop();}
function renderChair(){const C=chair;if(!C)return;const g=C.g,caps=capsOf(g),busy=!!C.P&&!C.P.done,inBed=bedDays(g);
 const men=$('dokMen');if(men){men.innerHTML=living().map(x=>{const d=bedDays(x);return `<button class="dok-man${x===g?' sel':''}" type="button" data-dok="man:${x.id}"${busy?' disabled':''}><canvas data-dokface="${x.id}" width="40" height="50"></canvas><span>${esc(first(x))}</span><small>${d?'🛏 '+d+' T.':x.dokCross?'schielt':'bereit'}</small></button>`;}).join('');
  for(const c of men.querySelectorAll('canvas[data-dokface]')){const x=S.roster.find(y=>y.id===c.dataset.dokface);if(x)M.renderPortrait(c,x,{unarmored:true});}}
 const who=$('dokWho');if(who){const d=B_info(g);who.innerHTML=`<b>${esc(g.name)}</b> · ${d}${g.dok?` · ${g.dok}× behandelt`:''}${g.dokCross?' · <span class="bad">schielt</span>':''}${inBed?` · <span class="bad">liegt noch ${inBed} ${inBed===1?'Tag':'Tage'} im Krankenbett</span>`:''}`;}
 const st=$('dokStats');if(st){st.innerHTML=KEYS.map(k=>{const cap=caps[k]??0,val=g.stats[k]??0,cls=cap<45?'lo':cap>=72?'hi':'';return `<button class="dok-stat${k===C.key?' sel':''}" type="button" data-dok="key:${k}"${busy||inBed?' disabled':''}><b>${esc(statName(k))}</b><span>Wert ${val}</span><span class="cap ${cls}">Anlage ${cap}</span></button>`;}).join('');}
 const odds=$('dokOdds'),fp=Math.round(failChance(g)*1000)/10;if(odds)odds.innerHTML=`<b class="ok">${(100-fp).toLocaleString('de-DE')} %</b> Anlage wird neu ausgewürfelt <span>· besser oder schlechter</span><br><b class="bad">${fp.toLocaleString('de-DE')} %</b> Hirnschaden <span>· alle Werte −10 %, schielt für immer${fp<10?' · Veteran: geringeres Risiko':' · frischer Rekrut: volles Risiko'}</span><br><b>Danach</b> zehn Tage Krankenbett mit Kopfverband`;
 const go=document.querySelector('.dok-hit');if(go){go.disabled=busy||!!inBed;go.textContent=inBed?'LIEGT IM KRANKENBETT':busy?'…':'ZUSCHLAGEN!';}
 setLine(C.line);}
function B_info(g){try{const d=M.barracks?.info?.(g);if(d)return `${'★'.repeat(Math.round(d.tier.level/2))}${'☆'.repeat(5-Math.round(d.tier.level/2))} ${esc(d.tier.name)} · Talent ${d.talent}`;}catch{}return 'Talent '+Math.round(g.potential||0);}
function setLine(t){const el=$('dokLine');if(el&&el._t!==t){el._t=t;el.innerHTML='<b>'+esc(DOC_SHORT)+':</b> „'+esc(t)+'“';}}
function chairClick(cmd,arg){const C=chair;if(!C)return;
 if(cmd==='close'){closeChair();return;}
 if(cmd==='days'){for(let i=0;i<RULE.days;i++)M.advanceDay?.();M.ui.close?.();M.ui.render?.();C.line='Zehn Tage später. Alle Verbände ab. Die Narben bleiben.';renderChair();return;}
 if(cmd==='new'){const rng=S.rng,g=M.makeGladiator(0);S.rng=rng;S.roster.push(g);C.g=g;C.key=lowKey(g);C.line='Frische Ware! Und so ein unberührter Schädel …';C.P=null;$('dokResult').hidden=true;renderChair();return;}
 if(C.P&&!C.P.done)return;
 if(cmd==='man'){const g=S.roster.find(x=>x.id===arg);if(!g)return;C.g=g;C.from=null;C.key=lowKey(g);C.aim=1;C.P=null;$('dokResult').hidden=true;C.line=bedDays(g)?pick(SAY.bed):g.dokCross?'Den hatte ich schon. Er winkt mir immer zu. Beiden von mir.':'Ah, '+first(g)+'! Setz dich. Das Blut auf dem Polster ist schon trocken.';renderChair();return;}
 if(cmd==='key'){if(arg===C.key)return;C.from=C.key;C.key=arg;C.aim=0;C.P=null;$('dokResult').hidden=true;C.line=fill(pick(SAY.aim.slice(1)),arg);renderChair();return;}
 if(cmd==='go'){if(bedDays(C.g)){M.ui.notify?.('Der liegt noch im Krankenbett.');return;}const outcome=C.force==='rand'?(Math.random()<failChance(C.g)?'fail':'ok'):C.force;let variant=C.variant==='rand'?null:C.variant;if(variant&&!VARS[outcome].some(v=>v[0]===variant))variant=null;
  $('dokResult').hidden=true;C.line=fill(SAY.aim[0],C.key);$('dokChair')?.scrollIntoView?.({block:'start',behavior:'smooth'});
  C.P=newProc({g:C.g,key:C.key,outcome,variant,from:C.key,onImpact:P=>{C.line=P.variant==='skull'?SAY.skull[0]:pick(SAY[P.outcome])+(SAY[P.variant]&&P.outcome==='fail'?' '+pick(SAY[P.variant]):'');renderChair();},onDone:P=>{C.last=P.res;showResult(C.g,P.res,P.variant);renderChair();}});renderChair();}}
function resultHTML(g,r,variant){if(r.ok){const d=r.nv-r.old;return `<h4>${d>0?'GEGLÜCKT':d<0?'GEGLÜCKT … ABER PECH':'GEGLÜCKT · UNVERÄNDERT'} · ${esc(g.name)}</h4><p><b>${esc(statName(r.key))}</b>: Anlage <b>${r.old} → ${r.nv}</b> (${d>0?'+':''}${d}) · Wert jetzt ${r.val}${r.val<r.val0?' (gesenkt, weil über der neuen Anlage)':''}</p><p>Zehn Tage Krankenbett. Danach kann er wieder auf den Stuhl.</p>`;}
 const lost=r.rows.reduce((n,x)=>n+(x.a-x.b),0);return `<h4 class="bad">FEHLSCHLAG · ${esc(g.name)}</h4><p>${variant==='skull'?'Der Doktor hat den Meißel in der Hand behalten und mit dem Hammer direkt auf den Schädel geschlagen. Schädelbruch.':variant==='nurse'?'Der Doktor hat Schwester Valeria nachgesehen und die Stirn getroffen.':variant==='flyhead'?'Der Hammerkopf ist abgeflogen und auf den Schädel gefallen.':'Der Meißel ist abgerutscht.'} <b>Hirnschaden:</b> alle Werte −10 %, Wert und Anlage, zusammen −${lost} Punkte. Schielt für immer.</p><div class="dok-loss">${r.rows.map(x=>`<span>${esc(statName(x.k))} <b>${x.a} → ${x.b}</b> <i>Anl. ${x.c} → ${x.d}</i></span>`).join('')}</div><p>Zehn Tage Krankenbett.</p>`;}
function showResult(g,r,variant){const el=$('dokResult');if(!el)return;el.hidden=false;el.className='dok-result '+(r.ok?'ok':'fail');el.innerHTML=resultHTML(g,r,variant);el.scrollIntoView?.({block:'nearest',behavior:'smooth'});}
function stepChair(dt){const C=chair;if(!C)return;C.t+=dt;if(C.aim<1)C.aim=Math.min(1,C.aim+dt*1.6);
 if(C.P&&!C.P.done)stepProc(C.P,dt);
 if(!C.P||C.P.done){C.lineT+=dt;if(C.lineT>9&&!C.P){C.lineT=0;C.line=pick(['Wer zuerst blinzelt, verliert. Oder gewinnt. Kommt darauf an.','Ich habe heute erst einmal danebengehauen. Und das war mit Absicht.','Schwester, haben wir noch Verband? Und Schnaps? Für mich.','Keine Angst. Angst macht den Schädel hart.','Ein Schädel ist wie eine Walnuss. Man muss nur wissen, wo man klopft.']);setLine(C.line);}
  C.nurseT-=dt;if(C.nurseT<=0&&C.nurse==null){C.nurse=46;C.nurseT=10+Math.random()*10;}if(C.nurse!=null){C.nurse-=dt*18;if(C.nurse<-10)C.nurse=null;}}
 const c=$('dokChair');if(!c)return;const P=C.P&&(!C.P.done||C.P.t<C.P.impact+9)?C.P:null;if(P&&P.done)P.t+=dt;
 paintChair(c.getContext('2d'),c.width,c.height,C.t,{g:C.g,key:C.key,from:C.from,aim:C.aim},P&&!P.done?P:(P&&P.done&&P.t<P.impact+6?P:null),{nurse:C.nurse});}
function closeChair(){document.querySelector('.dok-chair')?.remove();chair=null;M.ui.render?.();}

// =====================================================================================================
// 5 · DIE STORY-SZENE IM HOF (Filmbühne nach dem Muster von medic.js)
// =====================================================================================================
const K=.6,Wk=()=>M.workshop.state,smithName=()=>Wk().master?.name||'Der Schmied';
function smithActor(x,y){const p=Wk().master||{},rng=S.rng,g=M.makeGladiator(0);S.rng=rng;Object.assign(g,{id:'dok-smith',name:p.name||'Der Schmied',height:p.height||g.height,weight:p.weight||g.weight,muscle:58,fame:0,scars:[]});g.appearance=p.appearance?{...p.appearance}:g.appearance;g.equipment={weapon:null,secondary:null,shield:null,armor:{}};g.enemyGear={weapon:null,secondary:null,shield:null,armor:{}};
 return {id:'dok-smith',g,team:0,x,y,a:Math.PI,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,forgeWorker:true,forgeHold:'beer',bloodMarks:{},noNav:true};}
function recActor(g,i,x,y){return {id:'dk-'+g.id,g,slot:i,team:0,x,y,a:0,phase:i*1.7,state:'idle',energy:100,ammo:0,moveSpeed:0,unarmored:true,noNav:true,seed:i*2.3};}
const dressHead=g=>{const v=M.medic.state().vis[g.id]??={};(v.dressings??={}).head=true;};
const visOf=g=>M.medic?.state?.().vis?.[g.id]||{};
function applyVis(a,dt){const v=visOf(a.g);a.down=!!a.lying;if(a.down){a.fallSide=-1;a.agony={pose:1,part:a.lieArm?'arm':'leg',rate:a.lying==='bed'?2:6,live:a.lying==='bed'?.25:.7,lie:1.35};}else a.agony=null;
 a.kneeDuration=99;a.kneeTimer=0;a.dressings=v.dressings||{};a.bloodMarks=v.marks||{};a.embedded=[];a.netTimer=0;a.hit=Math.max(0,(a.hit||0)-dt);a.facePain=Math.max(a.down?.5:0,(a.facePain||0)-dt*.5);a.stagger=Math.max(0,(a.stagger||0)-dt);a.fallTimer=0;}
function walker(a,dt){if(!a.to)return false;if(a.delay>0){a.delay-=dt;return true;}const dx=a.to[0]-a.x,dy=a.to[1]-a.y,d=Math.hypot(dx,dy),s=(a.to[2]||40)*dt;if(d<=s){a.x=a.to[0];a.y=a.to[1];a.to=null;a.state='idle';a.moveSpeed=0;a.walk=false;return false;}
 a.x+=dx/d*s;a.y+=dy/d*s;a.state='move';a.moveSpeed=10;a.walk=true;a.odo=(a.odo||0)+s;a.phase=a.odo*.267;if(Math.abs(dx)>.5){a.a=dx>0?0:Math.PI;a.dir=dx>0?1:-1;}return true;}
const poseA=(a,o)=>Object.assign(a,{state:'idle',moveSpeed:0,traderPose:null,forgePose:'',...o});
let film=null;
const need=t=>Math.max(2.3,1.1+t.length*.062);
function play(o){stopFilm();const v=document.createElement('div');v.className='smith-ceremony smith-intro lion-film medic-film no-smith-song dok-film';
 v.innerHTML='<div><div class="medic-top"><span>'+esc(o.label||'')+'</span><button class="btn small" type="button" data-dokf="skip">SZENE ÜBERSPRINGEN ›</button></div><div class="scene-bubble-slot"><div class="scene-bubble" id="dokBubble" hidden></div></div><canvas id="dokFilm" width="660" height="420"></canvas><p id="dokText" aria-live="polite"></p><div id="dokInfo" hidden></div></div>';
 document.body.appendChild(v);
 v.addEventListener('click',e=>{if(!film)return;if(e.target.closest?.('[data-dokf="skip"]')){e.stopPropagation();const s=film.onSkip;s?.();return;}if(film.line||film.hold){if(film.bt>.25)film.ack=true;}});
 film={floats:[],props:{},...o,view:v,i:-1,t:0,bt:0,line:null,shown:0,cam:{...(o.cam||{x:190,y:560,vw:280})},camTo:null,door:0,doorTo:0,doorRate:3,face:null,chair:null,proc:null};next();loop();}
function stopFilm(){film?.view?.remove();film=null;}
function next(){const f=film;f.i++;f.bt=0;f.shown=0;f.ack=false;const b=f.beats[f.i];if(!b){const done=f.done;stopFilm();done?.();return;}
 if('face' in b)f.face=b.face;if('chair' in b){if(b.chair){const o=b.chair(f);f.chair={g:o.g,key:o.key};f.proc=newProc({...o,onImpact:P=>{o.onImpact?.(P,f);}});}else{f.chair=null;f.proc=null;}}
 b.do?.(f);if(!film||film!==f)return;f.line=b.say?{who:b.who||'s',text:typeof b.say==='function'?b.say(f):b.say}:null;f.hold=!!b.hold;if(b.cam)f.camTo={...b.cam};if('card' in b)setCard(typeof b.card==='function'?b.card(f):b.card,f.hold);}
function setCard(html,hold){const el=$('dokInfo');if(!el)return;if(!html){el.hidden=true;el.innerHTML='';return;}el.hidden=false;el.innerHTML=html+(hold?'<small class="medic-tap">TIPPEN ▸</small>':'');}
function stepFilm(dt){const f=film;f.t+=dt;f.bt+=dt;const b=f.beats[f.i];if(!b)return;b.each?.(f,dt,f.bt);if(film!==f)return;
 for(const a of [f.smith,...f.rec])if(a)walker(a,dt);for(const a of f.rec)applyVis(a,dt);for(const p of Object.values(f.props))walker(p,dt);if(f.proc)stepProc(f.proc,dt);
 if(f.camTo){const k=Math.min(1,dt*(f.camTo.rate||2));for(const key of ['x','y','vw'])if(f.camTo[key]!=null)f.cam[key]+=(f.camTo[key]-f.cam[key])*k;}
 f.door+=(f.doorTo-f.door)*Math.min(1,dt*f.doorRate);if(Math.abs(f.doorTo-f.door)<.01)f.door=f.doorTo;
 for(const q of f.floats)q.t+=dt;f.floats=f.floats.filter(q=>q.t<1.6);f.shake=Math.max(0,(f.shake||0)-dt*6);
 if(f.line)f.shown+=dt;const busy=b.until?!b.until(f):false,read=f.hold?f.ack:(!f.line||f.ack||f.shown>=need(f.line.text));
 if(read&&!busy&&(f.hold||f.bt>=(b.dur||0)))next();else paintFilm();}
function speaker(who){const f=film;if(who==='s')return {name:smithName(),a:f.smith};if(who==='d')return {name:DOC_SHORT,a:f.props.doc};if(who==='n')return {name:NURSE,a:f.props.nurse};if(who&&who[0]==='r'){const a=f.rec?.[+who.slice(1)-1];return {name:first(a?.g),a};}return {name:''};}
function paintFilm(){const f=film;if(!f)return;const c=$('dokFilm');if(!c?.getContext)return;const g=c.getContext('2d');g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;
 if(f.face)f.face(g,c.width,c.height,f,f.t);else if(f.chair)paintChair(g,c.width,c.height,f.t,f.chair,f.proc);else paintYard(g,c.width,c.height,f);
 const el=$('dokBubble');if(el){if(!f.line||f.line.who==='cap'){if(!el.hidden)el.hidden=true;}else{const s=speaker(f.line.who),key=s.name+'|'+f.line.text;if(el._key!==key){el._key=key;el.innerHTML='<b>'+esc(s.name)+'</b><span>'+esc(f.line.text)+'</span><i aria-hidden="true">▼</i>';el.classList.toggle('loud',/!$/.test(f.line.text)&&f.line.text===f.line.text.toUpperCase());}if(el.hidden)el.hidden=false;
  const tail=Math.round(f.face||f.chair||!s.a?50:Math.max(5,Math.min(95,((s.a.x-f.cam.x)/f.cam.vw+.5)*100))),wait=!!(f.hold||f.shown>=need(f.line.text)*.6);if(el._tail!==tail){el._tail=tail;el.style.setProperty('--tail',tail+'%');}if(el._wait!==wait){el._wait=wait;el.classList.toggle('waiting',wait);}}}
 const t=$('dokText'),s=f.line?speaker(f.line.who):null,txt=f.line?(f.line.who==='cap'?f.line.text:s.name+': „'+f.line.text+'“'):'';if(t&&t.textContent!==txt)t.textContent=txt;}
let bgCache=null;const backdrop=()=>bgCache=(M.prepareLudusGraphics?.()||bgCache||M.ludus.background());
// Die Tür des Medicus geht tatsächlich auf (Zeichnung und Lage kommen aus medicus-art.js, damit sie zum Gebäude passen).
const drawDoor=(g,open,t)=>M.medicusArt?.drawDoor(g,open,t);
function paintYard(g,w,h,f){const VW=f.cam.vw,VH=VW*h/w,k=w/VW,cx=cl(f.cam.x,VW/2,900-VW/2),cy=cl(f.cam.y,VH/2,670-VH/2),sh=f.shake||0;
 g.fillStyle='#101b20';g.fillRect(0,0,w,h);g.save();g.translate((Math.random()-.5)*sh*k,(Math.random()-.5)*sh*k*.6);g.scale(k,k);g.translate(-(cx-VW/2),-(cy-VH/2));g.drawImage(backdrop(),0,0);M.medicusArt?.frame(g,f.t);M.ludusOverlay?.(g,f.t);drawDoor(g,f.door,f.t);
 const draws=[f.smith,...f.rec].filter(a=>a&&!a.hidden).map(a=>({y:a.y,fn:()=>M.renderForgeActors(g,[a])}));
 for(const b of Object.values(f.props))if(b.bed&&!b.hidden)draws.push({y:b.y,fn:()=>drawBedPatient(g,{...b,t:f.t})});const d=f.props.doc,n=f.props.nurse;if(d&&!d.hidden)draws.push({y:d.y,fn:()=>drawDocSmall(g,{...d,t:f.t})});if(n&&!n.hidden)draws.push({y:n.y,fn:()=>drawNurseSmall(g,{...n,t:f.t})});
 draws.sort((a,b)=>a.y-b.y);for(const x of draws)x.fn();g.restore();
 for(const q of f.floats){const u=q.t/1.6,x=w/2+(q.x-cx)*k,y=h/2+(q.y-cy)*k-u*30;g.globalAlpha=u<.75?1:1-(u-.75)/.25;g.font="bold 24px 'Courier Prime',monospace";g.textAlign='center';g.textBaseline='middle';g.fillStyle='#17201c';g.fillText(q.text,x+2,y+2);g.fillStyle=q.color;g.fillText(q.text,x,y);g.globalAlpha=1;}}
const float=(f,x,y,text,color='#eee2c1')=>f.floats.push({x,y,text,color,t:0});
// Die Rekruten flippen aus: springen, jubeln, Herzchen (oder Empörung)
function flip(f,angry){M.sound?.('crowd');for(const a of f.rec){if(a.hidden)continue;if(!a.lying){a.state='celebrate';a.stagger=.5;a.jumpTimer=.5;}a.facePain=0;float(f,a.x+(Math.random()-.5)*10,a.y-38-Math.random()*10,angry?pick(['!?','WAS?!','PFUI!']):pick(['♥','♥ ♥','JA!','HUI!']),angry?'#f29b83':'#e2626c');}f.shake=angry?1.5:.8;}
const faceDoc=o=>(g,w,h,f,t)=>closeup(g,w,h,t,doctorBuf(t,{yaw:o.yaw??Math.sin(t*.8)*.25,...o}),o);
const faceNurse=o=>nurseShow(o);
const faceRec=(i,o)=>(g,w,h,f,t)=>closeup(g,w,h,t,patientBuf(f.rec[i].g,t,o),o);
const card=(title,rows,note)=>`<div class="medic-card dok-card"><h4>${title}</h4>${rows}${note?`<p class="tiny">${note}</p>`:''}</div>`;
const rulesCard=n=>card(['','1 / 3 · DER BEHANDLUNGSSTUHL','2 / 3 · EIN SCHLAG, ZWEI AUSGÄNGE','3 / 3 · DANACH'][n],
 n===1?`<ol><li>Gladiator auf den Stuhl setzen.</li><li>Einen Wert wählen. Alle Werte stehen mit Wert und Anlage zur Auswahl.</li><li>Der Doktor setzt den Meißel an die Stelle, an der diese Anlage wohnt. Jeder Wert hat seine eigene Stelle.</li><li>Ein Schlag.</li></ol>`
 :n===2?`<dl><dt class="ok">90 %</dt><dd>Die <b>Anlage</b> dieses Werts wird neu ausgewürfelt, wie bei der Geburt des Gladiators. Sie kann besser oder schlechter werden.</dd><dt class="bad">10 %</dt><dd><b>Hirnschaden.</b> Alle Werte verlieren ein Zehntel, Wert und Anlage. Schielt für immer.</dd><dt>Veteran</dt><dd>Mit Erfahrung und vielen Kämpfen sinkt das Risiko bis auf <b>5 %</b>.</dd></dl>`
 :`<p>In beiden Fällen: <b>zehn Tage Krankenbett</b>.</p><p>Lohnt sich bei Gladiatoren, die einen Wert besonders schlecht erwischt haben. Wer oft genug würfeln lässt, bekommt einen Kämpfer mit insgesamt höheren Anlagen. Oder einen, der schielt.</p>`);
const resultCard=(g,r,v)=>`<div class="medic-card dok-card dok-res">${resultHTML(g,r,v)}</div>`;
// Besetzung: beim ersten Mal die fünf echten Rekruten des Medicus-Kapitels (die Behandlungen gelten dann wirklich).
// Bei jeder Wiederholung, oder wenn die fünf nicht mehr da sind, spielen Kopien mit, damit dein Kader unverändert bleibt.
const alive=g=>g&&!g.dead;
const cloneG=g=>{const c=JSON.parse(JSON.stringify(g));c.id='dok-'+g.id+'-'+Math.random().toString(36).slice(2,6);c.dokTemp=true;c.dokWound=null;c.dokSkull=false;c.dokCross=false;c.dok=0;const h=c.body?.head;if(h){h.hp=100-(h.chronic||0);delete h.dokUntil;delete h.fracture;h.injury='';h.pain=0;}return c;};
const tempG=()=>{const rng=S.rng,g=M.makeGladiator(0);S.rng=rng;g.dokTemp=true;g.id='dok-t-'+Math.random().toString(36).slice(2,7);return g;};
function cast(replay){const list=(M.medic.recs?.()||[]).filter(alive);if(!replay&&list.length>=5&&!list.slice(0,5).some(g=>g.dok))return {R:list.slice(0,5),real:true};
 const base=[...list,...S.roster.filter(g=>alive(g)&&!list.includes(g))].slice(0,5),R=base.map(cloneG);while(R.length<5)R.push(tempG());return {R,real:false};}
function story(replay){closeAll();const {R,real}=cast(replay);
 for(const g of R){const v=M.medic.state().vis[g.id]??={};v.down=false;v.kneel=false;v.net=false;}
 const S1=R[0],S5=R[4],k1=lowKey(S1),k5=lowKey(S5),say=(who,text,o)=>({who,say:text,...o}),cap=text=>({who:'cap',say:text});
 const sm=smithActor(300,620),pos=[[132,621],[154,623],[176,621],[126,614],[198,622]],rec=R.map((g,i)=>recActor(g,i,...pos[i]));rec[3].lying=true;
 const res={};
 const over=()=>{endStory(real,R);endCard(res,S1,S5,real);};
 const finish=()=>{if(!res.r1)res.r1=treat(S1,k1,'ok',true);if(!res.r5)res.r5=treat(S5,k5,'fail',false,'skull');stopFilm();over();};
 play({label:'Der Doktor · Vorstellung und Behandlungsstuhl',smith:sm,rec,cam:{x:190,y:568,vw:280},onSkip:finish,done:over,props:{doc:{x:242,y:603,dir:-1,hidden:true,pose:'stand'},nurse:{x:243,y:602,dir:-1,hidden:true}},beats:[
  {dur:.6},
  say('s','Eins noch, bevor ihr hier alles vollblutet: Wir haben auch einen Medikus. Mit Personal.'),
  say('r2','Personal? Was für Personal?',{do:f=>{f.rec[1].a=0;}}),
  {dur:2.2,...cap('Die Tür des Krankenhauses öffnet sich. Langsam.'),do:f=>{const n=f.props.nurse;f.doorTo=1;f.doorRate=2.4;M.sound?.('block');n.hidden=true;n.x=243;n.y=602;n.to=null;setTimeout(()=>{if(film===f){n.hidden=false;n.to=[243,617,14];}},900);M.sound?.('rise');setTimeout(()=>film&&float(film,252,540,'♪','#f4d37a'),700);},until:f=>f.bt>1&&!f.props.nurse.to},
  {face:(g,w,h,f,t)=>closeup(g,w,h,t,nurseFull(t,{mood:'smile',sparkle:f.bt>3.4}),{srcY:lerp(NH-FH,0,ease((f.bt-.4)/3.2))}),dur:4.6,do:f=>{f.doorTo=0;f.doorRate=2;},...cap('Rote Absätze. Lange Beine. Ein sehr kurzer Kittel.')},
  {face:faceNurse({end:'wink'}),dur:4.8,...say('n','Hallo, ihr Süßen. Wer von euch hat denn Schmerzen?')},
  {face:null,dur:1.2,...say('r1','ICH!'),do:f=>flip(f)},
  say('r3','ICH! ICH BLUTE SOGAR!',{do:f=>flip(f)}),
  say('r4','ICH HAB EIN ZERTRÜMMERTES BEIN! DAS ZÄHLT DOPPELT!',{do:f=>flip(f)}),
  say('r5','Ich hab nur noch einen Arm! Aber der winkt für zwei!',{do:f=>flip(f)}),
  {face:faceNurse({end:'shy'}),dur:4.8,...say('n','Schwester Valeria. Ich mache die Verbände, die Suppe und die Briefe an die Hinterbliebenen.')},
  {face:null,...say('r2','Kann mich bitte jemand hauen? Ganz fest? Am liebsten zweimal?',{do:f=>flip(f)})},
  say('s','Freut euch nicht zu früh. Bei Schwester Valeria bleibt man verdächtig lange krank.',{do:f=>{poseA(f.smith,{a:Math.PI});f.smith.forgePose='sip';}}),
  say('r1','Warum?'),
  {dur:2.6,...cap('Schwester Valeria stöckelt quer über den Hof. Zum Schmied.'),do:f=>{f.props.nurse.to=[286,622,22];},until:f=>!f.props.nurse.to},
  {face:faceNurse({end:'shy'}),dur:4.8,...say('n','Ich bin häufig in der Schmiede. Da wird ein guter, kräftiger Blasebalg benötigt.')},
  {face:null,...say('s','Hm. Ja. Weiter im Text.',{do:f=>{f.smith.forgePose='sip';float(f,298,578,'♥','#e2626c');float(f,316,586,'*hust*');}})},
  say('r3','DER SCHMIED?!',{do:f=>flip(f,true)}),
  say('r4','DER HAT EINEN BIERBAUCH!',{do:f=>flip(f,true)}),
  say('s','Das ist Muskelmasse. Gut verteilt.',{do:f=>{f.smith.forgePose='sip';}}),
  say('r5','Deshalb liegt bei euch also jeder drei Wochen mit einem Kratzer im Bett …'),
  {dur:2.0,...cap('Aus dem Krankenhaus dringt ein Schrei. Dann ein Klirren. Dann fröhliches Pfeifen.'),do:f=>{f.shake=2;M.sound?.('heavy');float(f,244,540,'*KLIRR*');float(f,214,530,'AAAH!','#f29b83');setTimeout(()=>film&&float(film,268,534,'♪ ♫','#f4d37a'),900);}},
  {dur:1.6,...cap('Die Tür fliegt auf.'),do:f=>{const d=f.props.doc;f.doorTo=1;f.doorRate=16;f.shake=1.2;d.hidden=false;d.pose='flail';d.to=[240,618,40];M.sound?.('block');},until:f=>!f.props.doc.to},
  {face:faceDoc({mood:'roar',lines:1,shake:1.5}),...say('d','PATIENTEN! FÜNF STÜCK! UND ALLE NOCH WARM!',{do:f=>{f.props.doc.pose='stand';f.doorTo=0;f.doorRate=5;}})},
  {face:null,...say('s','Und das ist der Grund, warum wir überhaupt Patienten haben: Doktor Hippolytus Hirnhammer. Studiert in Alexandria. Rausgeworfen in Alexandria.',{do:f=>poseA(f.smith,{a:Math.PI,traderPose:'point',gest:0})})},
  say('s','Und in Athen. Und in Karthago.',{do:f=>{poseA(f.smith,{a:Math.PI});f.smith.forgePose='sip';}}),
  {face:faceDoc({mood:'confident',look:.5}),...say('d','Karthago war ein Missverständnis! Der Mann WOLLTE ohne Nase leben. Er wusste es nur noch nicht.')},
  {face:null,...say('r3','Hat er gerade „Nase“ gesagt?',{do:f=>{f.rec[2].stagger=.6;}})},
  {face:faceDoc({mood:'grin',hearts:1,look:1,yaw:.55}),...say('d','Schwester Valeria! Mein Engel! Ich habe dir letzte Woche eine Niere geschenkt!')},
  {face:faceNurse({end:'roll',quick:true}),dur:3.4,...say('n','Es war nicht deine.')},
  {face:null,...say('s','Der Doktor hat einen Stuhl, einen Meißel und eine Theorie.',{do:f=>poseA(f.smith,{a:Math.PI})})},
  {face:faceDoc({mood:'confident',lines:.6}),...say('d','Jede Begabung wohnt an einer bestimmten Stelle im Schädel! Stärke oben, Taktik vorne, Gleichgewicht gleich neben dem Ohr. Man muss nur wissen, wo man klopft.')},
  {face:(g,w,h,f,t)=>closeup(g,w,h,t,doctorBuf(t,{mood:'nervous',look:1,yaw:Math.sin(t*2.4)*.55})),...say('d','Stärke ist hier oben. Oder hier. Oder … Moment. Letzte Woche war die noch weiter links.')},
  {face:faceDoc({mood:'confident',lines:.6}),...say('d','Das ist völlig normal! Der Schädel zieht um. Wie jeder Mieter.')},
  {face:null,...say('s','Er klopft seit zwanzig Jahren. Gefunden hat er bisher vor allem Hohlräume.',{do:f=>{poseA(f.smith,{a:Math.PI});f.smith.forgePose='sip';}})},
  {face:null,...say('s','So geht es: Du setzt einen Gladiator auf den Stuhl und wählst einen seiner Werte. Der Doktor setzt den Meißel genau dort an, wo diese Anlage sitzt. Dann ein Schlag.',{hold:true,card:rulesCard(1),do:f=>poseA(f.smith,{a:Math.PI,traderPose:'point',gest:0})})},
  say('s','Neun von zehn Mal wird die Anlage neu ausgewürfelt. Besser oder schlechter. Beim zehnten Mal haut er daneben. Dann sind alle Werte um ein Zehntel schlechter, und der Mann schielt für den Rest seines kurzen Lebens.',{hold:true,card:rulesCard(2)}),
  say('s','Bei alten Veteranen trifft er besser. Da geht nur jeder zwanzigste daneben. Er hat Respekt vor Narben.',{hold:true,card:rulesCard(2)}),
  say('s','So oder so liegt der Mann danach zehn Tage im Krankenbett. Lohnt sich bei einem, der einen Wert besonders schlecht erwischt hat.',{hold:true,card:rulesCard(3),do:f=>{f.smith.forgePose='sip';}}),
  {card:null,...say('r1','Und wer ist so blöd und setzt sich da freiwillig drauf?',{do:f=>{f.rec[0].a=0;}})},
  say('s','Freiwillig? Niemand. Du bist der Erste.',{do:f=>poseA(f.smith,{a:Math.PI,traderPose:'point',gest:0})}),
  {face:faceRec(0,{mood:'scared',sweat:1}),...say('r1','Ich?! Mein Kopf ist das Einzige an mir, das noch heil ist!')},
  {face:null,...say('s',()=>`Eben. Deine Anlage für ${statName(k1)} ist eine Beleidigung für jeden Gladiator.`)},
  {chair:()=>({g:S1,key:k1,outcome:'ok',variant:'triple',better:true,onImpact:P=>{res.r1=P.res;}}),...say('d','Stillhalten. Ich klopfe nur kurz an.'),until:f=>f.proc?.done},
  {chair:null,face:faceRec(0,{mood:'relief',stars:1,mark:k1}),...say('r1','Ich … sehe … Farben, die es gar nicht gibt.')},
  {face:faceDoc({mood:'grin'}),...say('d','Das geht weg. Meistens.')},
  {face:null,...say('s',()=>`${statName(k1)}: Anlage ${res.r1?.old} → ${res.r1?.nv}. Ein besserer Gladiator. Für den Preis von einer Beule.`),hold:true,card:()=>res.r1?resultCard(S1,res.r1):''},
  {card:null,...say('s','Und jetzt du.',{do:f=>{poseA(f.smith,{a:Math.PI,traderPose:'point',gest:0});f.rec[0].stagger=1.5;}})},
  say('r5','Nein. Nein, nein, nein! Ich habe schon einen Arm verloren. Ich brauche meinen Kopf noch!',{do:f=>{f.rec[4].stagger=1.2;f.rec[4].a=0;}}),
  say('s','Wofür?',{do:f=>poseA(f.smith,{a:Math.PI})}),
  say('r5','… Zum Draufsetzen von Helmen?'),
  say('s','Du hast keinen Helm.',{do:f=>{f.smith.forgePose='sip';}}),
  {chair:()=>({g:S5,key:k5,outcome:'fail',variant:'skull',onImpact:P=>{res.r5=P.res;}}),...say('d','Und jetzt ganz ruhig. Hier. Ungefähr.'),until:f=>f.proc?.done},
  {chair:null,face:faceDoc({mood:'shock',blood:1}),...say('d','Oh. Habe ich wieder mal vergessen, den Meißel zu benutzen.')},
  {face:faceRec(4,{mood:'dumb',cross:true,crossX:true,tongue:true,birds:true,drool:1,blood:1,hurt:.6}),...say('r5','Hihi. Zwei Schmiede. Und beide hässlich.')},
  {face:faceRec(4,{mood:'dumb',cross:true,crossX:true,spin:true,tongue:true,birds:true,drool:1,blood:1,hurt:.6}),...say('r5','Wer hat das Licht so laut gemacht? Und warum schmeckt der Boden nach Montag?')},
  {face:null,...say('s','Alle Werte ein Zehntel weniger. Und er schielt so stark, dass er sich selbst in die Ohren gucken kann.',{do:f=>{f.smith.forgePose='sip';}})},
  {face:null,...say('s','Das war dann wohl das zehnte Mal.'),hold:true,card:()=>res.r5?resultCard(S5,res.r5,'skull'):''},
  {card:null,face:faceNurse({end:'roll',quick:true}),dur:3.4,...say('n','Ich hole den großen Eimer.')},
  {face:faceDoc({mood:'grin',look:1,hearts:1,yaw:.55}),...say('d','Ich helfe tragen!')},
  {face:null,...say('s','Sieh es positiv, Junge: Von allem, was wir noch mit dir vorhaben, bekommst du jetzt nur noch die Hälfte mit.',{do:f=>poseA(f.smith,{a:Math.PI,traderPose:'point',gest:0})})},
  {dur:2.6,...cap('Zehn Tage Krankenbett. Für beide.'),cam:{x:124,y:584,vw:176,rate:6},do:f=>{f.rec[0].hidden=true;f.rec[4].hidden=true;Object.assign(f.rec[1],{x:236,y:624});Object.assign(f.rec[2],{x:254,y:622});f.props.bed1={x:52,y:608,g:S1,bed:true};f.props.bed3={x:166,y:608,g:S5,bed:true,cross:true};Object.assign(f.props.doc,{x:206,y:618,dir:-1,pose:'stand'});Object.assign(f.props.nurse,{x:128,y:614,dir:1});float(f,72,596,'z z z','#cfe6ee');float(f,176,596,'?!','#f4d37a');}},
  {face:faceNurse({end:'wink'}),dur:4.8,...say('n','Visite! Ich bringe Wärme. Und Suppe. Und Zeit.')},
  {face:faceDoc({mood:'roar',lines:1,shake:1}),...say('d','NÄCHSTER!')},
  {face:null,dur:2.2,cam:{x:190,y:568,vw:280},do:f=>{f.rec[1].to=[-30,626,70];f.rec[2].to=[-30,632,60];float(f,154,590,'WEG HIER!','#f29b83');M.sound?.('crowd');},...say('r2','LAUFT!')},
  say('s','Der Unterricht ist beendet.',{do:f=>{f.smith.forgePose='sip';}}),
  {dur:.6}]});}
function endStory(real,R){if(real){const d=ds();d.stage='done';d.armed=false;}else{const vis=M.medic.state().vis;for(const g of R)delete vis[g.id];}M.persist?.();}
function endCard(res,a,b,real){document.querySelector('.dok-card-end')?.remove();const v=document.createElement('div');v.className='medic-start dok-card-end';
 v.innerHTML=`<div><p class="eyebrow">KAPITEL ZU ENDE</p><h1>DER DOKTOR</h1>${res.r1?`<p><b>${esc(a.name)}</b>: ${esc(statName(res.r1.key))}, Anlage ${res.r1.old} → ${res.r1.nv}. Zehn Tage Krankenbett.</p>`:''}${res.r5?`<p><b>${esc(b.name)}</b>: Hirnschaden, schielt. Zehn Tage Krankenbett.</p>`:''}
 <p class="tiny">${real?'Der Behandlungstisch steht ab jetzt im Medicus: Gebäude anklicken und „Behandlungstisch“ wählen. Ein Schlag, zwei Möglichkeiten, zehn Tage Krankenbett.':'Wiederholung mit Kopien: dein Kader bleibt unverändert.'}</p>
 <div class="buttons"><button class="btn primary" type="button" data-dokm="chair">BEHANDLUNGSTISCH ÖFFNEN</button><button class="btn" type="button" data-dokm="close">WEITER</button></div></div>`;document.body.appendChild(v);}

// =====================================================================================================
// 6 · MEDICUS ANKLICKEN: Krankenbetten oder Behandlungstisch
// =====================================================================================================
let bypass=false;
const ds=()=>S.doktor??={stage:'',armed:false};
const CHOICE_LINES=['Willkommen! Wer kommt zuerst dran? Und wer zuletzt?','Betten oder Stuhl? Die Betten sind bequemer. Der Stuhl ist lustiger.','Schwester Valeria hat frisch bezogen. Die Flecken gehen nicht mehr raus, aber sie sind trocken.','Heute im Angebot: ein Schlag, zwei Möglichkeiten.'];
function choice(){M.ui.modal('Medicus',`<div class="dok-choice"><canvas id="dokChoiceFace" width="320" height="200"></canvas><p class="medic-quip"><b>${esc(DOC_SHORT)}:</b> „${esc(pick(CHOICE_LINES))}“</p></div>`,
 `<button class="btn" data-action="dok:ward">🛏 KRANKENBETTEN · ÜBERSICHT</button><button class="btn primary" data-action="dok:chair">🔨 BEHANDLUNGSTISCH</button><button class="btn small" data-action="dok:story">🎬 DER DOKTOR · VORSTELLUNG NOCHMAL ANSEHEN</button>`);
 let t=0;const tick=()=>{const c=$('dokChoiceFace');if(!c)return;t+=1/30;closeup(c.getContext('2d'),c.width,c.height,t,doctorBuf(t,{mood:Math.sin(t*.7)>.5?'roar':'grin',yaw:Math.sin(t*.8)*.25}));setTimeout(()=>requestAnimationFrame(tick),33);};requestAnimationFrame(tick);}
// Während des Medicus-Kapitels bleibt der normale Ablauf; die Auswahl gibt es davor nicht und danach immer.
const chapterIdle=()=>['','done','skip','free'].includes(M.medic.state().stage||'');
const baseClick=M.schoolClick;M.schoolClick=function(action){const a=String(action||''),[p,b]=a.split(':');
 if(p==='dok'){M.ui.close?.();if(b==='ward'){bypass=true;try{M.ui.click('nav:medic');}finally{bypass=false;}}else if(b==='chair')openChair();else if(b==='story'){if(!S.battle)story(true);}return true;}
 if(a==='nav:medic'&&!bypass&&!S.battle&&M.ui.getPage?.()==='home'&&chapterIdle()&&!film&&!chair){choice();return true;}
 return baseClick?.apply(this,arguments);};

// =====================================================================================================
// 7 · TAKT UND KAPITELKETTE (Löwen → Medicus → Doktor)
// =====================================================================================================
let raf=0,last=0,wait=0,lastMedic=M.medic.state().stage;
function loop(){if(raf)return;last=0;const run=now=>{const dt=Math.min(.05,last?(now-last)/1000:0);last=now;if(film)stepFilm(dt);if(chair)stepChair(dt);if(film||chair)raf=requestAnimationFrame(run);else raf=0;};raf=requestAnimationFrame(run);}
// Spielstände, die das Medicus-Kapitel schon früher erlebt haben, bekommen den Doktor beim nächsten Besuch des Ludus (einmal); wer es übersprungen hat, bekommt ihn nur über die Medicus-Auswahl.
if(!ds().stage&&!ds().armed){const ms=M.medic.state().stage;if(ms==='done')ds().armed=true;else if(['skip','free'].includes(ms))ds().stage='skip';}
const busy=()=>!!S.battle||!!film||!!chair||!!M.medic?.film||!!M.medic?.guide||!!M.lionChapter?.film||!!M.lionChapter?.guide||!!M.smithWrath?.scene||!!M.archerPlot?.scene||!!M.hall?.film||!!M.intro?.active?.()||!!window.ArenaTheoryIntro?.active?.()||!!M.trader?.tutorial||!!document.querySelector('.smith-ceremony,#introView,#brandIntro,.medic-night,.medic-end,.medic-start,.dok-card-end')||($('modal')&&!$('modal').hidden);
function autoStart(dt){if(document.hidden||M.benchmarkActive)return;const d=ds(),ms=M.medic.state().stage;
 if(!d.stage&&!d.armed){if(lastMedic!=='done'&&ms==='done'){d.armed=true;M.persist?.();}lastMedic=ms;return;}
 lastMedic=ms;if(d.stage||!d.armed)return;if(M.ui.getPage()!=='home'||busy()){wait=0;return;}wait+=dt;if(wait>1.5){wait=0;story(false);}}
const lt=M.ludusTick;M.ludusTick=dt=>{if(film||chair)return;lt?.(dt);autoStart(dt);};
function closeAll(){stopFilm();if(chair){document.querySelector('.dok-chair')?.remove();chair=null;}for(const el of document.querySelectorAll('.dok-card-end'))el.remove();M.ui.close?.();}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-dok],[data-dokm]');if(!b)return;
 if(b.dataset.dokm){e.preventDefault();e.stopPropagation();const m=b.dataset.dokm;if(m==='close'){document.querySelector('.dok-card-end')?.remove();M.ui.render?.();}else if(m==='chair'){document.querySelector('.dok-card-end')?.remove();openChair();}return;}
 const [cmd,arg]=b.dataset.dok.split(':');e.preventDefault();e.stopPropagation();chairClick(cmd,arg);},true);
// Option: Bewegung an den Gebäuden (Krähe, Ratten, Rauch, Laterne) abschalten; spart Rechenzeit auf schwachen Geräten.
{const io=M.injuryOptions;M.injuryOptions=()=>(io?.()||'')+`<div class="list-row"><span>Bewegung an den Gebäuden<br><small>Krähe, Ratten, Rauch und Laterne am Medicus. Aus: ein ruhiges Standbild.</small></span><select class="select" id="buildingMotion"><option value="on"${S.options?.buildingMotion!=='off'?' selected':''}>An</option><option value="off"${S.options?.buildingMotion==='off'?' selected':''}>Aus</option></select></div>`;
 const change=M.schoolChange;M.schoolChange=ev=>{if(ev?.target?.id==='buildingMotion'){(S.options??={}).buildingMotion=ev.target.value;M.persist?.();return true;}return change?.(ev);};}
window.DOK={nurseShow,nurseFull,drawNurseSmall,drawDocSmall,doctorBuf,nurseBuf,patientBuf,closeup,paintChair,newProc,stepProc,treat,bedDays,story,openChair,choice,get film(){return film;},get chair(){return chair;},SPOTS,KEYS,state:ds};
})();
