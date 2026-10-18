'use strict';
// Medicus-Gebäude für den Ludus (Entwurf v4, Oktober 2026).
// Die Kulisse wird einmal in die gecachte Ludus-Kulisse gezeichnet (paint). Bewegte Teile (Rauch, Krähe, Gläser im Fenster,
// Laterne, Ratten, Schubkarre) liegen auf einer kleinen Ebene, die nur mit 6 Bildern pro Sekunde neu gezeichnet und danach
// kopiert wird (frame). Sie ruht, solange der Ludus nicht sichtbar ist, und lässt sich in den Optionen abschalten.
(()=>{const M=window.MG,S=M.s;
const OX=18,OY=413;              // Lage der Entwurfsfläche in der Ludus-Welt (Dach etwa y 447, Boden etwa y 625)
const W=282,H=214,SHIFT=16;
const WX0=24,WX1=258,DX=205,DY=100,DW=38,DH=72,CX=DX+(DW>>1),LX=DX-15,LY=112;
const SX0=82,SX1=200,SY0=52,SY1=80,GY=10,RT=22,RB=44,RW0=20,RW1=262;
const WIN1={x:48,y:94,w:36,h:40},WIN2={x:136,y:94,w:36,h:40};
const door={x:DX+OX,y:DY+SHIFT+OY,w:DW,h:DH};
let rnd=null;
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const R=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
const pick=a=>a[Math.floor(rnd()*a.length)];
// ---------- Pixelschrift ----------
const F3={A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',O:'010101101101010',P:'110101110100100',Q:'010101101111011',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',Z:'111001010100111',
'0':'111101101101111','1':'010110010010111','2':'110001010100111','3':'110001010001110','4':'101101111001001','5':'111100110001110','6':'011100111101111','7':'111001010010010','8':'111101111101111','9':'111101111001110',
':':'000010000010000','.':'000000000000010','-':'000000111000000','!':'010010010000010','?':'110001010000010',' ':'000000000000000'};
const text3=(c,s,x,y,col)=>{for(let i=0;i<s.length;i++){const gl=F3[s[i]]||F3[' '];for(let k=0;k<15;k++)if(gl[k]==='1')R(c,x+i*4+(k%3),y+Math.floor(k/3),1,1,col);}};
const w3=s=>s.length*4-1;
const F5={M:['10001','11011','10101','10101','10001','10001','10001'],E:['11111','10000','10000','11110','10000','10000','11111'],D:['11110','10001','10001','10001','10001','10001','11110'],I:['01110','00100','00100','00100','00100','00100','01110'],C:['01111','10000','10000','10000','10000','10000','01111'],U:['10001','10001','10001','10001','10001','10001','01110'],S:['01111','10000','10000','01110','00001','00001','11110'],'0':['01110','10001','10011','10101','11001','10001','01110']};
const text5=(c,s,x,y,sc,col)=>{for(let i=0;i<s.length;i++){const gl=F5[s[i]];for(let r=0;r<7;r++)for(let q=0;q<5;q++)if(gl[r][q]==='1')R(c,x+(i*6+q)*sc,y+r*sc,sc,sc,col);}};
// ---------- Fenster ----------
function windowFrame(c,o,opts){const {x,y,w,h}=o;
 R(c,x-5,y+h,w+10,4,'#8d8a78');R(c,x-5,y+h,w+10,1,'#b3af9a');R(c,x-5,y+h+4,w+10,2,'#a39d86');
 R(c,x-2,y-2,w+4,h+4,'#4a3828');R(c,x-2,y-2,w+4,1,'#6e5639');
 R(c,x,y,w,h,'#25363a');R(c,x,y,w,h/2,'#31484d');
 for(const s of [x-12,x+w+2]){R(c,s,y-2,10,h+4,'#5b3f2c');for(let ly=y;ly<y+h;ly+=4){R(c,s+1,ly,8,1,'#3d2a1c');R(c,s+1,ly+1,8,1,'#7a553b');}R(c,s,y-2,1,h+4,'#7a553b');R(c,s+9,y-2,1,h+4,'#3d2a1c');}
 R(c,x-3,y+h+5,w+6,8,'#6a4a32');R(c,x-3,y+h+5,w+6,1,'#8a6644');R(c,x-3,y+h+12,w+6,1,'#3d2a1c');
 for(let bx=x-1;bx<x+w+2;bx+=3)R(c,bx,y+h+1+Math.floor(rnd()*3),2,5,pick(['#4f7a3b','#5e8c46','#3f6a30']));
 for(let fx=x;fx<=x+w;fx+=5){if(opts?.grave&&fx>=x+15&&fx<=x+25)continue;R(c,fx,y+h-2+Math.floor(rnd()*3),2,2,pick(['#d6504a','#e7d36a','#d98ac0','#f0f0e0']));}
 if(opts?.grave){const gx=x+19;R(c,gx-5,y+h+2,3,3,'#5a4630');R(c,gx+4,y+h+3,2,2,'#5a4630');R(c,gx-1,y+h+1,1,4,'#6b4a32');R(c,gx+1,y+h+2,2,1,'#6b4a32');R(c,gx,y+h-2,1,7,'#e8dfc4');R(c,gx-2,y+h,5,1,'#e8dfc4');}
}
function glassFront(c,o,calm){const {x,y,w,h}=o;
 R(c,x+w/2-1,y,2,h,'#4a3828');R(c,x,y+h/2-1,w,2,'#4a3828');R(c,x+w/2-1,y,1,h,'#6e5639');
 if(calm){R(c,x+w-9,y+2,6,1,'#7fa1a2');R(c,x+w-4,y+3,1,3,'#6f9294');return;}
 R(c,x+4,y+4,8,2,'#7fa1a2');R(c,x+4,y+8,3,6,'#6f9294');for(let i=0;i<7;i++)R(c,x+3+i,y+3+i,2,1,'#8fb0b0');}
// ---------- Tür (auch für die Film-Überlagerung) ----------
function doorLeaf(c,x,y,w,h){R(c,x,y,w,h,'#3a2a1d');for(let dx=x+2;dx<x+w-2;dx+=8){R(c,dx,y+2,Math.min(6,x+w-2-dx),h-4,'#5b4330');R(c,dx,y+2,1,h-4,'#7a5d3f');if(dx+5<x+w-2)R(c,dx+5,y+2,1,h-4,'#2c1f15');}
 for(const by of [y+14,y+50]){R(c,x,by,w,4,'#2b2a26');R(c,x,by,w,1,'#55534a');for(let nx=x+3;nx<x+w-2;nx+=9)R(c,nx,by+1,2,2,'#8d8a78');}}
// Tür aufgehen lassen (open 0..1): Blatt klappt an der linken Angel nach innen, dahinter dunkler Raum mit warmem Licht.
function drawDoor(g,open,t=0){if(open<=0.001)return;const {x,y,w,h}=door,o=Math.min(1,open);
 g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
 R(g,x,y,w,h,'#140f0b');R(g,x+2,y+2,w-4,h-4,'#1d1610');
 const glow=.35+.1*Math.sin(t*5);g.globalAlpha=glow*o;R(g,x+4,y+h-30,w-10,26,'#e2ab5c');g.globalAlpha=glow*.6*o;R(g,x+8,y+h-20,w-18,16,'#f4d37a');g.globalAlpha=1;
 R(g,x,y+h-5,w,5,'#2a2118');
 const lw=Math.max(3,Math.round(w*(1-o)*.9));
 // Türblatt in Perspektive: wird schmaler und oben/unten kürzer
 for(let i=0;i<lw;i++){const k=i/Math.max(1,lw-1),inset=Math.round(o*7*k);g.fillStyle=i%8<6?'#5b4330':'#3a2a1d';g.fillRect(x+i,y+inset,1,h-2*inset);if(i%8===0){g.fillStyle='#7a5d3f';g.fillRect(x+i,y+inset,1,h-2*inset);}}
 for(const by of [14,50]){const inset=Math.round(o*7);g.fillStyle='#2b2a26';g.fillRect(x,y+by+(by<30?inset*.3:-inset*.3),lw,4);}
 g.restore();}
// ---------- statische Kulisse ----------
function paint(g){rnd=rng(7);g.save();g.translate(OX,OY);g.imageSmoothingEnabled=false;
 g.save();g.translate(0,SHIFT);
 // Pflaster vor dem Haus
 R(g,WX0-4,180,WX1-WX0+8,16,'#857452');for(let i=0;i<150;i++)R(g,WX0-4+Math.floor(rnd()*(WX1-WX0+8)),180+Math.floor(rnd()*16),1+Math.floor(rnd()*3),1,pick(['#958461','#746545','#8f7f5c']));
 R(g,WX0-4,178,WX1-WX0+8,3,'#5a5244');R(g,WX0-4,180,WX1-WX0+8,1,'#a89b78');
 // Wand
 R(g,WX0,WY0,WX1-WX0,WY1-WY0,'#c9bc9c');
 for(let yy=WY0+6;yy<WY1;yy+=9)for(let xx=WX0+3+((yy/9|0)%2)*11;xx<WX1-6;xx+=24)R(g,xx,yy,12,1,'#b8ab8a');
 for(let n=0;n<260;n++)R(g,WX0+2+Math.floor(rnd()*(WX1-WX0-4)),WY0+2+Math.floor(rnd()*(WY1-WY0-4)),1,1,pick(['#d6caab','#bfb292','#b3a684']));
 for(const sx of [WX0,WX1-10]){R(g,sx,WY0,10,WY1-WY0,'#8d8a78');for(let y2=WY0;y2<WY1;y2+=12){R(g,sx,y2,10,11,(y2/12|0)%2?'#a09c88':'#948f7c');R(g,sx,y2+11,10,1,'#6a6757');R(g,sx+1,y2,2,11,'#b3af9a');}}
 R(g,WX0,172,WX1-WX0,8,'#7a7766');for(let sx=WX0;sx<WX1;sx+=16)R(g,sx,172,1,8,'#5d5b4d');R(g,WX0,172,WX1-WX0,2,'#a29e8a');
 // Dach
 for(let ry=RT;ry<RB;ry++){const x0=Math.floor(RW0+(RB-1-ry)*.55),x1=Math.floor(RW1-(RB-1-ry)*.55);R(g,x0,ry,x1-x0,1,'#59655f');}
 let row=0;
 for(let sy=RT;sy<RB-2;sy+=5){const a0=Math.floor(RW0+(RB-1-sy)*.55),a1=Math.floor(RW1-(RB-1-sy)*.55),off=row%2?6:0;
  for(let sx=a0-off;sx<a1;sx+=12){const xa=Math.max(sx,a0),xb=Math.min(sx+11,a1);if(xb>xa){R(g,xa,sy,xb-xa,4,pick(['#69776f','#5f6c65','#738178','#667269']));R(g,xa,sy+4,xb-xa,1,'#3c4641');R(g,xa,sy,xb-xa,1,'#869388');}if(sx>=a0)R(g,sx,sy,1,5,'#3c4641');}
  row++;}
 R(g,RW0-4,RB-2,RW1-RW0+8,4,'#3e4944');R(g,RW0-4,RB-2,RW1-RW0+8,1,'#7d8a80');R(g,RW0-4,RB+2,RW1-RW0+8,3,'#8f8a74');
 R(g,60,RT-4,RW1-RW0-92,4,'#46524c');R(g,60,RT-4,RW1-RW0-92,1,'#8a978c');
 // Kamin
 R(g,214,RT-10,22,18,'#6d6a5c');for(let ky=RT-6;ky<RT+8;ky+=4)R(g,214,ky,22,1,'#4e4c40');R(g,211,RT-10,28,3,'#8d8a78');
 // Schild mit Untertitel
 R(g,SX0-1,SY0-1,SX1-SX0+2,SY1-SY0+2,'#141b1a');R(g,SX0,SY0,SX1-SX0,SY1-SY0,'#2f4a43');
 R(g,SX0,SY0,SX1-SX0,2,'#456a60');R(g,SX0+2,SY0+2,SX1-SX0-4,1,'#223a34');R(g,SX0+2,SY1-3,SX1-SX0-4,1,'#223a34');
 for(const p of [[SX0+4,SY0+4],[SX1-6,SY0+4],[SX0+4,SY1-6],[SX1-6,SY1-6]])R(g,p[0],p[1],2,2,'#d8c07a');
 for(const cx of [SX0+14,SX1-15]){R(g,cx,SY0-8,1,7,'#2b2a26');R(g,cx-1,SY0-9,3,2,'#6a6252');}
 {const tw=7*12-2,tx=SX0+((SX1-SX0)-tw)/2|0;text5(g,'MEDICUS',tx+1,SY0+5,2,'#142420');text5(g,'MEDICUS',tx,SY0+4,2,'#ecdfb4');
  const sub='ERFOLGSQUOTE: GEMISCHT';text3(g,sub,SX0+((SX1-SX0)-w3(sub))/2|0,SY1-9,'#c9b27a');}
 // Fenster
 windowFrame(g,WIN1,{grave:true});glassFront(g,WIN1);windowFrame(g,WIN2,null);
 // Zettel zwischen den Fenstern
 {const px=100,py=100;R(g,px+10,py-2,2,2,'#2b2a26');R(g,px,py,22,30,'#e6dcc0');R(g,px,py+29,22,1,'#b8ab8a');R(g,px+21,py,1,30,'#cfc4a6');
  text3(g,'TAGE',px+4,py+4,'#3a3327');text3(g,'OHNE',px+4,py+10,'#3a3327');text3(g,'TOTE:',px+2,py+16,'#3a3327');text5(g,'0',px+8,py+22,1,'#a83a2c');}
 // Tür
 R(g,DX-5,DY-5,DW+10,DH+5,'#8d8a78');R(g,DX-5,DY-5,DW+10,2,'#b3af9a');R(g,DX-5,DY-5,2,DH+5,'#a39f8b');R(g,DX+DW+3,DY-5,2,DH+5,'#6a6757');
 doorLeaf(g,DX,DY,DW,DH);
 R(g,DX+DW-9,DY+34,4,6,'#c9a55a');R(g,DX+DW-8,DY+35,2,2,'#f0d890');
 R(g,DX+12,DY+4,14,8,'#25363a');R(g,DX+12,DY+4,14,1,'#4a3828');R(g,DX+18,DY+4,2,8,'#4a3828');
 R(g,DX-8,DY+DH,DW+16,4,'#a39f8b');R(g,DX-8,DY+DH,DW+16,1,'#c4c0ac');
 R(g,DX-11,DY+DH+4,DW+22,4,'#8d8a78');R(g,DX-11,DY+DH+4,DW+22,1,'#b3af9a');R(g,DX-11,DY+DH+8,DW+22,2,'#8f8a74');
 // Fußmatte
 R(g,DX-1,182,DW+2,8,'#6b4a35');R(g,DX-1,182,DW+2,1,'#8a6644');R(g,DX-1,189,DW+2,1,'#3d2a1c');for(let mx=DX;mx<DX+DW;mx+=3)R(g,mx,183,1,1,'#7d5a40');
 text3(g,'ZU SPAET',DX+((DW-w3('ZU SPAET'))/2|0),184,'#d9cfa8');
 // Kreuz über der Tür
 R(g,CX-11,61,22,2,'#5a4532');R(g,CX-2,50,5,24,'#e8dfc4');R(g,CX-9,58,19,5,'#e8dfc4');R(g,CX-2,50,1,24,'#fffbe8');R(g,CX-9,58,19,1,'#fffbe8');R(g,CX+2,50,1,24,'#b3aa8c');R(g,CX-9,62,19,1,'#b3aa8c');
 R(g,CX-1,53,3,18,'#3f8a4e');R(g,CX-6,59,13,3,'#3f8a4e');
 for(const e of [[CX-12,66],[CX-14,71],[CX+11,64],[CX+13,69],[CX-10,76],[CX+9,76]]){R(g,e[0],e[1],3,2,'#4f7a3b');R(g,e[0]+1,e[1]-1,2,1,'#6a9a4e');}
 R(g,CX-12,66,1,12,'#3f6a30');R(g,CX+12,64,1,14,'#3f6a30');
 // Laterne (Körper)
 R(g,LX+2,LY-12,1,12,'#2b2a26');R(g,LX-4,LY-12,7,2,'#2b2a26');R(g,LX,LY,6,9,'#2b2a26');R(g,LX+1,LY+1,4,7,'#f0b84a');R(g,LX+2,LY+2,2,4,'#ffe9a0');
 // Dinge auf dem Pflaster vor dem Haus
 g.save();g.translate(0,GY);
 const pot=(x,y)=>{R(g,x-2,y+9,14,2,'#6b5f46');R(g,x,y,10,9,'#a2603f');R(g,x-1,y,12,2,'#b87348');R(g,x+8,y+2,2,7,'#7a4529');for(let i=0;i<6;i++)R(g,x+1+i,y-4-(i%3)*2,2,5,pick(['#4f7a3b','#5e8c46','#6a9a4e']));};
 pot(28,175);
 // Bank
 g.save();g.translate(-10,0);R(g,50,177,42,2,'#6b5f46');R(g,52,164,38,4,'#7a5d3f');R(g,52,164,38,1,'#93744e');R(g,54,168,3,9,'#5b4632');R(g,85,168,3,9,'#5b4632');g.restore();
 // Tonne mit Teilen
 g.save();g.translate(-90,0);
 R(g,186,178,30,2,'#6b5f46');
 R(g,190,150,22,28,'#6a4a32');for(const y of [154,166])R(g,190,y,22,2,'#2b2a26');R(g,190,150,3,28,'#8a6644');R(g,209,150,3,28,'#4a3220');
 R(g,190,150,22,2,'#4a3220');R(g,191,148,20,3,'#2a1a14');
 const parts=[[192,138,5,12,'#e0b9a0'],[191,132,7,6,'#e0b9a0'],[191,127,1,5,'#e0b9a0'],[193,126,1,6,'#e0b9a0'],[195,127,1,5,'#e0b9a0'],[197,128,1,4,'#e0b9a0'],[198,133,2,3,'#e0b9a0'],[201,134,2,16,'#f0ead2'],[200,133,4,2,'#f0ead2'],[205,140,7,10,'#a9b8ae'],[205,137,2,3,'#a9b8ae'],[208,138,1,2,'#a9b8ae'],[210,138,1,2,'#a9b8ae'],[211,139,1,1,'#a9b8ae']];
 for(const q of parts)R(g,q[0]-1,q[1]-1,q[2]+2,q[3]+2,'#2e1c14');for(const q of parts)R(g,q[0],q[1],q[2],q[3],q[4]);
 R(g,192,138,1,12,'#c49a84');R(g,195,131,1,1,'#e8c24a');R(g,205,137,1,1,'#efefe4');R(g,209,142,1,5,'#8c9a90');
 R(g,192,148,5,2,'#8f2a22');R(g,205,148,7,2,'#8f2a22');R(g,201,148,2,2,'#8f2a22');
 R(g,196,150,2,10,'#6e1d18');R(g,199,150,1,6,'#6e1d18');R(g,203,150,2,14,'#6e1d18');R(g,203,164,2,2,'#8f2a22');R(g,208,150,1,8,'#6e1d18');
 R(g,187,177,28,3,'#5a1a16');R(g,189,177,10,1,'#8f2a22');R(g,203,180,6,1,'#4a1511');
 // heruntergefallene Hand am Boden
 const hand=[[176,175,5,4,'#e0b9a0'],[172,175,4,1,'#e0b9a0'],[171,176,5,1,'#e0b9a0'],[172,177,4,1,'#e0b9a0'],[173,178,3,1,'#e0b9a0'],[177,172,3,3,'#e0b9a0'],[181,176,4,2,'#e0b9a0']];
 R(g,168,178,20,3,'#5a1a16');for(const q of hand)R(g,q[0]-1,q[1]-1,q[2]+2,q[3]+2,'#2e1c14');for(const q of hand)R(g,q[0],q[1],q[2],q[3],q[4]);
 R(g,182,176,3,2,'#8f2a22');R(g,174,177,1,1,'#e8c24a');
 g.restore();
 // Schubkarre mit Laken
 g.save();g.translate(32,0);
 R(g,100,181,54,2,'#6b5f46');
 R(g,108,162,32,8,'#6a4a32');R(g,108,162,32,1,'#8a6644');R(g,108,169,32,1,'#3d2a1c');R(g,108,162,1,8,'#4a3220');R(g,139,162,1,8,'#4a3220');
 R(g,134,170,2,9,'#4a3220');R(g,141,170,2,9,'#4a3220');R(g,134,178,10,1,'#3d2a1c');
 R(g,140,165,10,2,'#7a5d3f');R(g,148,166,2,6,'#7a5d3f');
 R(g,103,171,11,11,'#2b2a26');R(g,105,173,7,7,'#5b4632');R(g,107,175,3,3,'#8d8a78');R(g,108,171,1,11,'#3d2a1c');
 R(g,109,154,30,8,'#d8d2c0');R(g,114,150,14,5,'#d8d2c0');R(g,118,148,6,3,'#d8d2c0');
 R(g,109,160,30,2,'#b8b29e');R(g,118,154,1,8,'#b8b29e');R(g,128,155,1,7,'#b8b29e');R(g,134,156,1,6,'#b8b29e');
 R(g,124,156,3,3,'#8c3a30');R(g,125,159,2,2,'#8c3a30');
 g.restore();
 g.restore();
 // Strohlager für die Verletzten (liegen in der Ludus-Welt davor, siehe M.medicusArt.beds)
 g.restore();
 g.restore();}
const WY0=44,WY1=180;
// ---------- bewegte Teile ----------
function jar(c,x,y,w,h){R(c,x,y+2,w,h-2,'#8fb8b4');R(c,x+1,y+3,w-2,h-4,'#3f6b66');R(c,x+1,y+3,1,h-5,'#5f8f88');R(c,x-1,y,w+2,2,'#6a4a32');R(c,x-1,y,w+2,1,'#8a6644');}
function shelf(c,t){const o=WIN2,p=t%48;
 R(c,o.x,o.y,o.w,o.h,'#1e2a2c');R(c,o.x,o.y+14,o.w,17,'#232f30');
 R(c,o.x+1,o.y+17,o.w-2,2,'#4a3828');R(c,o.x+1,o.y+36,o.w-2,2,'#4a3828');R(c,o.x+1,o.y+19,o.w-2,1,'#2b1f15');R(c,o.x+1,o.y+38,o.w-2,1,'#2b1f15');
 {const ax=o.x+2,ay=o.y+4;jar(c,ax,ay,9,13);
  R(c,ax+2,ay+4,5,5,'#f2f2e6');R(c,ax+2,ay+4,1,1,'#3f6b66');R(c,ax+6,ay+4,1,1,'#3f6b66');R(c,ax+2,ay+8,1,1,'#3f6b66');R(c,ax+6,ay+8,1,1,'#3f6b66');
  const look=(p>=24&&p<36)?0:1;R(c,ax+3+look,ay+5,2,2,'#3a7fb0');R(c,ax+3+look+(look?1:0),ay+5,1,1,'#101414');R(c,ax+3+look,ay+5,1,1,'#101414');
  if(p>=14&&p<=15)R(c,ax+2,ay+4,5,4,'#b89a84');R(c,ax+4,ay+9,1,3,'#a83a2a');}
 {const bx=o.x+22,by=o.y+4;jar(c,bx,by,9,13);const big=(t%6<2);
  R(c,bx+2,by+5,5,4,'#b0282a');R(c,bx+3,by+4,1,1,'#b0282a');R(c,bx+5,by+4,1,1,'#b0282a');R(c,bx+3,by+9,3,1,'#b0282a');R(c,bx+3,by+5,1,1,'#e0605a');
  if(big){R(c,bx+1,by+5,1,3,'#b0282a');R(c,bx+7,by+5,1,3,'#b0282a');R(c,bx+4,by+10,1,1,'#b0282a');}R(c,bx+4,by+2,1,3,'#8c1f22');}
 {const cx=o.x+2,cy=o.y+23;jar(c,cx,cy,9,13);
  for(const q of [[2,9,2],[4,10,2],[6,9,2],[3,11,1],[5,11,1]])R(c,cx+q[0],cy+q[1],1,q[2],'#f0ead2');R(c,cx+4,cy+10,1,1,'#e8c24a');
  const by2=cy+9-(t%8);if(by2>=cy+3)R(c,cx+3+((t>>1)%3),by2,1,1,'#bfe0dc');}
 {const dx=o.x+22,dy=o.y+23;jar(c,dx,dy,9,13);
  R(c,dx+2,dy+5,5,5,'#c98f9a');R(c,dx+3,dy+4,3,1,'#c98f9a');R(c,dx+3,dy+6,3,1,'#9c5f6e');R(c,dx+3,dy+8,3,1,'#9c5f6e');R(c,dx+4,dy+5,1,5,'#9c5f6e');}
 glassFront(c,o,true);
 R(c,o.x,o.y,6,1,'#9aa89e');R(c,o.x,o.y,1,6,'#9aa89e');R(c,o.x+1,o.y+1,3,1,'#7e8d83');R(c,o.x+1,o.y+1,1,3,'#7e8d83');R(c,o.x+2,o.y+2,1,1,'#9aa89e');}
function eyes(c,t){const p=t%72;if(p<30||p>37)return;const o=WIN1,ex=o.x+7,ey=o.y+28,look=p>33?2:1;
 R(c,ex,ey,3,2,'#e8e8d8');R(c,ex+6,ey,3,2,'#e8e8d8');R(c,ex+look,ey,1,2,'#101414');R(c,ex+6+look,ey,1,2,'#101414');}
function ravenPos(t){const p=t%240;let x;if(p<7)x=114-18*(p/7);else if(p<120)x=96;else if(p<127)x=96+18*((p-120)/7);else x=114;
 const hop=(p<7)?Math.sin(p/7*Math.PI)*6:(p>=120&&p<127)?Math.sin((p-120)/7*Math.PI)*6:0,dir=(p<7)?-1:(p>=120&&p<127)?1:((p%80)<56?1:-1);
 return {x:Math.round(x),y:42-Math.round(hop),dir,hop:hop>0};}
function raven(c,t){const o=ravenPos(t),p=t%60,peck=p>=44&&p<=47,blink=p>=20&&p<=21,flap=o.hop;
 c.save();c.translate(o.x,o.y);c.scale(o.dir,1);
 if(!flap){R(c,-2,-3,1,3,'#8c6a3a');R(c,1,-3,1,3,'#8c6a3a');R(c,-3,-1,3,1,'#8c6a3a');R(c,0,-1,3,1,'#8c6a3a');}
 R(c,-10,-7,6,2,'#15181a');R(c,-9,-5,4,1,'#15181a');R(c,-5,-10,11,7,'#15181a');R(c,-4,-10,8,1,'#34404a');R(c,-3,-7,7,1,'#2a3238');R(c,-2,-5,6,1,'#2a3238');
 if(flap){R(c,-6,-17,8,7,'#15181a');R(c,-5,-17,6,1,'#34404a');R(c,-1,-21,4,4,'#15181a');}
 const hy=peck?3:0;R(c,3,-14+hy,6,6,'#15181a');R(c,4,-14+hy,3,1,'#34404a');R(c,9,-12+hy,4,2,'#6a6258');R(c,12,-11+hy,2,1,'#3a362f');R(c,7,-13+hy,1,1,blink?'#15181a':'#f2f2e6');
 c.restore();}
function smoke(c,t){for(let i=0;i<5;i++){const age=((t*.5)+i*3.2)%16,x=225+Math.sin((age+i)*.55)*3+age*.25,y=RT-11-age,a=.55*(1-age/16);
 c.fillStyle='rgba(176,188,170,'+a.toFixed(2)+')';const s=age<5?3:age<10?4:5;c.fillRect(Math.round(x-s/2),Math.round(y-s/2),s,s);}}
function lantern(c,t){const a=.16+(((t*7)%5)/100);
 c.fillStyle='rgba(255,205,110,'+a.toFixed(2)+')';c.beginPath();c.arc(LX+3,LY+4,12,0,6.283);c.fill();
 c.fillStyle='rgba(255,215,130,'+(a+.08).toFixed(2)+')';c.beginPath();c.arc(LX+3,LY+4,7,0,6.283);c.fill();
 R(c,LX+1,LY+1,4,7,'#f0b84a');R(c,LX+2,LY+2,2,4,'#ffe9a0');
 for(let k=0;k<2;k++){const fx=LX+3+Math.cos(t*.7+k*2.4)*9,fy=LY+3+Math.sin(t*1.1+k*1.7)*7;R(c,Math.round(fx),Math.round(fy),1,1,'#101414');}}
function rat(c,x,y,t,dir,gnaw,sniff){const hd=(gnaw||sniff)&&(t%4<2)?1:0,w1=((t>>1)%2),w2=((t>>2)%2),run=!gnaw&&!sniff,step=run?(t%2):0;
 c.save();c.translate(x,y);c.scale(-dir,1);
 R(c,0,3,4,1,'#2a2522');R(c,3,2,7,4,'#6b625a');R(c,4,2,5,1,'#8a8076');R(c,3,5,7,1,'#4f4842');
 R(c,-1,3+hd,5,4,'#7a7068');R(c,-1,3+hd,5,1,'#8f857b');R(c,-3,5+hd,2,2,'#d9a0a0');R(c,2,1+hd,2,2,'#c48a8a');R(c,0,3+hd,1,1,'#c93a2a');
 if(gnaw&&hd)R(c,-3,7,1,1,'#8f2a22');
 R(c,10,4+w1,3,1,'#c99a98');R(c,13,3+w1+w2,3,1,'#c99a98');R(c,16,2+w1,2,1,'#c99a98');R(c,3+step,6,2,1,'#3a342f');R(c,8-step,6,2,1,'#3a342f');
 c.restore();}
function ground(c,t){c.save();c.translate(0,GY);
 rat(c,80,174,t,1,true,false);
 const p=t%120;let x,dir,sn=false;if(p<40){x=196+p*1.3;dir=1;}else if(p<60){x=248;dir=1;sn=true;}else if(p<100){x=248-(p-60)*1.3;dir=-1;}else{x=196;dir=-1;sn=true;}
 rat(c,Math.round(x),177,t,dir,false,sn);
 for(let k=0;k<2;k++)R(c,Math.round(108+Math.cos(t*.9+k*2.1)*10),Math.round(122+Math.sin(t*1.3+k*2)*5),1,1,'#101414');
 c.save();c.translate(32,0);
 const q=t%72,twitch=q>=50&&q<=53,up=twitch?(q%2?1:0):0,sway=(Math.sin(t*.45)>0)?1:0;
 const foot=[[103,155-up,8,4,'#a9b8ae'],[101,154-up,3,2,'#a9b8ae'],[100,156-up,3,1,'#a9b8ae'],[100,157-up,3,1,'#a9b8ae'],[101,158-up,2,1,'#a9b8ae']];
 for(const f of foot)R(c,f[0]-1,f[1]-1,f[2]+2,f[3]+2,'#2e1c14');for(const f of foot)R(c,f[0],f[1],f[2],f[3],f[4]);
 R(c,101,154-up,1,1,'#efefe4');R(c,110,155-up,1,3,'#d8d2c0');
 R(c,101,160,1,3,'#e0d8bd');R(c,99,163,6,7,'#2e1c14');R(c,100,164,4,5,'#efe6cc');R(c,101,165,2,1,'#3a3327');R(c,101,167,2,1,'#a83a2c');
 const arm=[[118+sway,161,3,8,'#e0b9a0'],[117+sway,169,5,4,'#e0b9a0'],[117+sway,172,1,2,'#e0b9a0'],[119+sway,172,1,2,'#e0b9a0'],[121+sway,172,1,2,'#e0b9a0']];
 for(const f of arm)R(c,f[0]-1,f[1]-1,f[2]+2,f[3]+2,'#2e1c14');for(const f of arm)R(c,f[0],f[1],f[2],f[3],f[4]);
 c.restore();c.restore();}
// Bewegungsebene: nur die bewegten Teile, transparent; 6 Bilder pro Sekunde
let layer=null,layerCtx=null,lastTick=-1;
function motionOn(){return S.options?.buildingMotion!=='off';}
function drawLayer(t){if(!layer){layer=document.createElement('canvas');layer.width=W;layer.height=H;layerCtx=layer.getContext('2d');layerCtx.imageSmoothingEnabled=false;}
 const c=layerCtx;c.clearRect(0,0,W,H);c.save();c.translate(0,SHIFT);smoke(c,t);raven(c,t);shelf(c,t);eyes(c,t);lantern(c,t);ground(c,t);c.restore();}
function frame(ctx,seconds){if(!motionOn())return false;const tick=Math.floor(seconds*6);if(tick!==lastTick||!layer){lastTick=tick;drawLayer(tick);}ctx.drawImage(layer,OX,OY);return true;}
// Wer im Krankenlager liegt: flache Strohlager auf dem Pflaster, die Figuren liegen darauf
function beds(g){g.save();g.imageSmoothingEnabled=false;for(let i=0;i<3;i++){const bx=OX+22+i*58,by=OY+SHIFT+189;
 g.globalAlpha=.3;R(g,bx+2,by+1,54,3,'#2f2a1f');g.globalAlpha=1;R(g,bx,by-3,54,4,'#9c8350');R(g,bx,by-3,54,1,'#c0a76d');R(g,bx+3,by-1,48,1,'#7f6a41');for(let k=0;k<10;k++)R(g,bx+3+k*5+(k%2),by-2,3,1,k%2?'#b69a5e':'#8a7347');}g.restore();}
const bedSpot=i=>({x:OX+54+i*58,y:OY+SHIFT+186});
M.medicusArt={bedSpot,paint,frame,drawDoor,door,beds,OX,OY,W,H,SHIFT,motionOn,
 // Welt-Koordinaten für Szenen: Tür, Vorplatz, Mitte der Fassade
 spots:{door:{x:door.x+DW/2,y:door.y+DH},mat:{x:door.x+DW/2,y:OY+SHIFT+190},yard:{x:OX+120,y:OY+SHIFT+192}}};
})();
