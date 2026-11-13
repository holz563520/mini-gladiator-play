// SYMBOLE UND UHR ARENA THEORY 2.0 (welt-ikonen.js) · Pixelsymbole statt Emojis: antik, sinnbildlich, manchmal blutig, mit schwarzem Humor.
// Wunsch Thomas 13.11.2026 (Regel 19, AT2_FAHRPLAN.md). Jedes Symbol ist ein 12×12-Pixelbild (unten in BILDER), wird einmal gezeichnet und gemerkt.
// Neue Menüs: Symbol per <i class="ws-i" data-i="name"></i> oder einfach das Emoji im Text lassen, wenn es in EMOJI steht (wird ersetzt).
// Neues Symbol: Bild in BILDER (12 Zeilen à 12 Zeichen, Farben aus FARBE) und Emoji in EMOJI eintragen. Muss erkennbar bleiben.
// Die Uhr (Sonnenscheibe) zeichnet AT2_IKON.uhr(): Steinscheibe mit Riss, Gladius als Zeiger mit Blut an der Spitze, Totenkopf als Mond.
// Nur auf arena-theory-2.html geladen, 1.0 bleibt unberührt.
(function(){
'use strict';
if(window.AT2_IKON)return;
const FARBE={k:'#1a0e06',d:'#4a2a14',b:'#7a4a24',l:'#b07a40',s:'#8c9296',S:'#d8dcd6',g:'#d8a830',G:'#8a6418',r:'#7e140a',R:'#c4281a',
 w:'#e8dcc0',W:'#fff6e0',t:'#d0a850',T:'#8a6a28',n:'#9a907e',N:'#5e564a',c:'#cdb48a',f:'#e8781a',F:'#f8c840',u:'#3a5a7a',U:'#6a92b0',h:'#2a2a2a',o:'#c86a8a'};
const BILDER={
 bauen:[ // Hammer, am Kopf klebt Blut
 '............','.kkkkkkkk...','.kSSSSSSsk..','.ksssssRRk..','.kkkkkkkkk..','....kbk..r..','....kbk.....','....kbk..R..','....klk.....','....kbk.....','....kbk.....','....kkk.....'],
 training:[ // Strohpuppe, Pfeil im Kopf
 '....kkkk....','...ktttTk...','wkkktkTkkkSk','...kTttTkR..','....kkkk....','.....kk.....','..kkkbbkkk..','..ktttTtTk..','...ktttTk...','....kbbk....','....kbbk....','..kkkkkkkk..'],
 kampf:[ // zwei Gladii gekreuzt, einer blutig
 'S..........S','kS........Sk','.kS......Rk.','..kS....Rk..','...kS..Rk...','....kSRk....','....kRSk....','...kgk.kgk..','..kgk...kgk.','.kbk.....kbk','kbk.......kb','kk.........k'],
 tribuene:[ // Bögen des Kolosseums
 '............','..kkkkkkkk..','.knnnnnnnnk.','.kndkndkndk.','.kndkndkndk.','knnnnnnnnnnk','kNdkNdkNdkNk','kndkndkndknk','kndkndkndknk','knnnnnnnnnnk','kkkkkkkkkkkk','............'],
 unterkunft:[ // Bett mit Kissen, Ratte darunter
 '............','............','kk..........','kWk.........','kWkkkkkkkkkk','kWwccccccRck','kkkkkkkkkkkk','kb........bk','kb...kkk..bk','kb..kNNNkwbk','kb.kNNNNk.bk','kk.k....k.kk'],
 schmiede:[ // Amboss, Hammer drüber
 '......kk....','.....kSSk...','....kSsk....','...kbk......','..kbk.......','kkkkkkkkkk..','kSSSSSSSSskk','.kssssssskk.','...kssssk...','...kssssk...','..kkkkkkkk..','.kNNNNNNNNk.'],
 beast:[ // Wolfskopf, Blut an den Zähnen
 '.k........k.','.kdk....kdk.','.kddkkkkddk.','kddddddddddk','kddFddddFddk','kdddddddddk.','.kddddddddk.','..kddddddk..','..kwRwwRwk..','...kRkkRk...','....r..R....','.......r....'],
 kaserne:[ // Scutum mit Riss
 '...kkkkkk...','..kRRRRRRk..','.kRgRRRRgRk.','.kRRRRkRRRk.','.kRRRkSkRRk.','.kRRkSSSkRk.','.kRRRkSkkRk.','.kRRRRkRRRk.','.kRgRRkRgRk.','..kRRkRRRk..','...kkkkkk...','............'],
 kranken:[ // Kreuz aus Verband, durchgeblutet
 '....kkkk....','....kwwk....','....kwrk....','.kkkkwwkkkk.','.kwwwwwwwRk.','.kwrwwwwwwk.','.kkkkwwkkkk.','....kwwk....','....kwRk....','....kwwk....','....kkkk....','............'],
 strasse:[ // Pflaster, ein Blutfleck
 '............','kkkkkkkkkkkk','knnNknnNknnk','kkkkkkkkkkkk','kNknnNknnNkn','kkkkkkkkkkkk','knnNknnNknnk','kkkkkkkkkkkk','kNknnrknnNkn','kkkkkkkkkkkk','knnNknnNknnk','kkkkkkkkkkkk'],
 gelaende:[ // Schaufel im Erdhügel (Grab?)
 '........kk..','.......kbk..','......kbk...','.....kbk....','....kbk.....','...kSSk.....','..kSSSk.....','.kSSSk......','..kkk...k...','....kkkbbkk.','..kkbbwbbbbk','kkbbbbbbbbbk'],
 abreissen:[ // Spitzhacke über geborstener Säule
 '.kkkk.......','kSSSSk.kk...','.kk.kSkk....','.....kSk....','....kbkSk...','...kbk..k...','..kbk.......','.kbk..kkkk..','kbk...kwwk..','.k....kwwkk.','.....kkwwwk.','....kwkwkwwk'],
 gold:[ // Münze mit Totenkopf
 '...kkkkkk...','..kggggggk..','.kgGGGGGGgk.','kgGgwwwwgGgk','kgGwkwwkwGgk','kgGwwwwwwGgk','kgGgwkkwgGgk','kgGgwwwwgGgk','.kgGGGGGGgk.','..kggggggk..','...kkkkkk...','............'],
 bruecke:[ // Holzsteg über Wasser
 '............','............','............','kkkkkkkkkkkk','kllbllbllblk','kkkkkkkkkkkk','.kb......bk.','.kb......bk.','.kb.UUU..bk.','UkbUuuuUUbkU','uuuuuuuuuuuu','uuuuuuuuuuuu'],
 holz:[ // Stamm mit Jahresringen
 '............','............','...kkkkkkkk.','..kllbbbbbbk','.kltlkbbbbbk','.klltlbbbbbk','.kltllkbbbbk','..kllkbbbbbk','...kkkkkkkk.','............','............','............'],
 stein:[ // Steinquader
 '............','............','..kkkkkkkk..','.knnnnnnnnk.','knnNnnnnnnnk','knnnnnnNnnnk','kNnnnnnnnnNk','knnnnNnnnnnk','.kkkkkkkkkk.','............','............','............'],
 speichern:[ // Wachstafel mit Griffel
 'kkkkkkkkkk..','kbbbbbbbbk..','kbddddddbk..','kbdkkkddbk.k','kbddddddbkkS','kbdkkdddbkSk','kbddddddbSk.','kbbbbbbbbk..','kkkkkkkkkk..','............','............','............'],
 pause:[ // zwei Knochen
 '.kk....kk...','kwwk..kwwk..','.kwk...kwk..','.kwk...kwk..','.kwk...kwk..','.kwk...kwk..','.kwk...kwk..','.kwk...kwk..','.kwk...kwk..','kwwk..kwwk..','.kk....kk...','............'],
 reden:[ // Sprechrolle
 '.kkkkkkkkkk.','kwwwwwwwwwwk','kwkkwkkkwwwk','kwwwwwwwwwwk','kwkkkwkkwwwk','kwwwwwwwwwwk','.kkkwkkkkkk.','...kwk......','...kk.......','............','............','............'],
 zange:[ // Zange
 '.k.......k..','.kSk...kSk..','..kSk.kSk...','...kSkSk....','....kSk.....','....kSk.....','...kbkbk....','..kbk.kbk...','.kbk...kbk..','.kk.....kk..','............','............'],
 schaedel:[
 '..kkkkkkk...','.kwwwwwwwk..','kwwwwwwwwwk.','kwkkwwwkkwk.','kwkkwwwkkwk.','kwwwwkwwwwk.','.kwwwwwwwk..','..kwkwkwk...','..kkkkkkk...','............','............','............'],
 kreuz:[ // Grabkreuz aus Holz
 '....kk......','...kbbk.....','.kkkbbkkk...','kbbbbbbbbk..','.kkkbbkkk...','...kbbk.....','...kbbk.....','...kbbk.....','...kbbk.....','..kkbbkk....','.kNNNNNNk...','kNNNNNNNNk..'],
 kette:[
 '............','.kkk........','kSSSk.......','kS.kSkk.....','kSSSkSSk....','.kkkS.kSk...','....kSSkSk..','.....kkS.Sk.','......kSSSk.','.......kkk..','............','............'],
 sanduhr:[ // Sanduhr, roter Sand
 'kkkkkkkkkk..','.kbbbbbbk...','.kWRRRRWk...','..kWRRWk....','...kWRk.....','....kRk.....','...kWRWk....','..kWWRRWk...','.kWRRRRRWk..','.kbbbbbbk...','kkkkkkkkkk..','............'],
 de:[ // zerfetztes Banner
 'kkkkkkkkkk..','khhhhhhhhhk.','khhhhhhhhk..','kRRRRRRRRRk.','kRRRRRRRRk..','kRRRRRRRk...','kggggggggk..','kgggggggggk.','kgggg.gggk..','kk.kkk.kk...','k...........','k...........'],
 en:[
 'kkkkkkkkkk..','kuuWRWuuuk..','kuuWRWuuuuk.','kWWWRWWWWk..','kRRRRRRRRRk.','kWWWRWWWWk..','kuuWRWuuuk..','kuuWRWuu.uk.','kuuWRWuuuk..','kk.kkkk.kk..','k...........','k...........'],
 pfeil:[ '............','............','.....k......','.....kk.....','kkkkkkSk....','kbbbbbSSk...','kkkkkkSk....','.....kk.....','.....k......','............','............','............'],
};
const EMOJI={'🔨':'bauen','🎯':'training','⚔':'kampf','🏟':'tribuene','🛏':'unterkunft','⚒':'schmiede','🐺':'beast','🛡':'kaserne','✚':'kranken',
 '🛤':'strasse','⛰':'gelaende','💥':'abreissen','💰':'gold','🌉':'bruecke','🪵':'holz','🪨':'stein','💾':'speichern','⏸':'pause','💬':'reden',
 '☠':'schaedel','✝':'kreuz','⛓':'kette','⏳':'sanduhr','🇩🇪':'de','🇬🇧':'en'};
const cache={};
function bild(name){if(cache[name])return cache[name];const B=BILDER[name];if(!B)return '';
 const c=document.createElement('canvas');c.width=12;c.height=12;const g=c.getContext('2d');
 for(let y=0;y<12;y++)for(let x=0;x<12;x++){const ch=B[y][x];if(ch&&ch!=='.'&&FARBE[ch]){g.fillStyle=FARBE[ch];g.fillRect(x,y,1,1);}}
 return cache[name]='url('+c.toDataURL()+')';}
function element(name,titel){const i=document.createElement('i');i.className='ws-i';i.dataset.i=name;i.style.backgroundImage=bild(name);i.setAttribute('aria-hidden','true');if(titel)i.title=titel;return i;}
// Emojis in Texten durch Pixelsymbole ersetzen (nur in 2.0-Oberflächen, nicht in Auswahllisten)
const KEYS=Object.keys(EMOJI).sort((a,b)=>b.length-a.length),RX=new RegExp('('+KEYS.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')\\uFE0F?','gu');
function ersetzen(wurzel){
 if(wurzel.nodeType===3){textErsetzen(wurzel);return;}
 if(wurzel.nodeType!==1||wurzel.closest?.('select,option,textarea,script,style'))return;
 const tw=document.createTreeWalker(wurzel,NodeFilter.SHOW_TEXT),L=[];for(let n;(n=tw.nextNode());)if(RX.test(n.data)){RX.lastIndex=0;L.push(n);}RX.lastIndex=0;
 for(const n of L)textErsetzen(n);
 for(const i of wurzel.querySelectorAll?.('i.ws-i[data-i]:not([style])')||[])i.style.backgroundImage=bild(i.dataset.i);}
function textErsetzen(n){const p=n.parentNode;if(!p||p.closest?.('select,option,textarea,script,style'))return;RX.lastIndex=0;if(!RX.test(n.data))return;RX.lastIndex=0;
 const f=document.createDocumentFragment();let last=0;n.data.replace(RX,(m,e,pos)=>{if(pos>last)f.appendChild(document.createTextNode(n.data.slice(last,pos)));f.appendChild(element(EMOJI[e]));last=pos+m.length;return m;});
 if(last<n.data.length)f.appendChild(document.createTextNode(n.data.slice(last)));p.replaceChild(f,n);}
new MutationObserver(ms=>{for(const m of ms){if(m.type==='characterData'){textErsetzen(m.target);continue;}for(const n of m.addedNodes)ersetzen(n);}})
 .observe(document.body,{childList:true,subtree:true,characterData:true});
ersetzen(document.body);

// ---------- Uhr: Steinscheibe im Pixelstil (48×48, dreifach vergrößert) ----------
const U=document.createElement('canvas');U.width=U.height=48;const ug=U.getContext('2d');
const ZIFFER={X:['k.k','k.k','.k.','k.k','k.k'],I:['k','k','k','k','k'],V:['k.k','k.k','k.k','k.k','.k.']};
function ziffern(g,txt,cx,cy,farbe){let w=0;for(const ch of txt)w+=ZIFFER[ch][0].length+1;w--;let x=Math.round(cx-w/2);const y=Math.round(cy-2);g.fillStyle=farbe;
 for(const ch of txt){const Z=ZIFFER[ch];for(let yy=0;yy<5;yy++)for(let xx=0;xx<Z[yy].length;xx++)if(Z[yy][xx]==='k')g.fillRect(x+xx,y+yy,1,1);x+=Z[0].length+1;}}
function kreis(g,cx,cy,r,f){g.fillStyle=f;for(let y=-r;y<=r;y++){const w=Math.floor(Math.sqrt(r*r-y*y+r*.8));g.fillRect(cx-w,cy+y,w*2+1,1);}}
function uhr(zg,h,tag,block){
 const g=ug,c=24;g.clearRect(0,0,48,48);
 kreis(g,c,c,23,'#1a0e06');kreis(g,c,c,22,'#6e665a');kreis(g,c,c,21,'#9a907e');kreis(g,c-1,c-1,19,'#aaa08c');
 // Himmel: oben Tag, unten Nacht
 const r=14;for(let y=-r;y<=r;y++){const w=Math.floor(Math.sqrt(r*r-y*y+r*.8));if(y<0){const t=(y+r)/r;g.fillStyle=t<.35?'#5a9ac0':t<.7?'#8ab8cc':'#e8c88a';}else g.fillStyle=y<2?'#3a2a40':'#161d3a';g.fillRect(c-w,c+y,w*2+1,1);}
 g.fillStyle='#e8e0c8';[[-8,5],[5,8],[-3,11],[9,3],[-11,2],[2,4]].forEach(([x,y])=>g.fillRect(c+x,c+y,1,1));
 g.fillStyle='#4a2a14';g.fillRect(c-15,c,31,1);
 // Riss im Stein und Blutspritzer am Rand (schwarzer Humor: die Zeit läuft für manche ab)
 g.fillStyle='#3a342c';[[31,5],[32,6],[32,7],[33,8],[34,8],[35,9]].forEach(([x,y])=>g.fillRect(x,y,1,1));
 g.fillStyle='#7e140a';[[8,36],[9,37],[7,38],[9,38],[10,39]].forEach(([x,y])=>g.fillRect(x,y,1,1));g.fillStyle='#a01c10';g.fillRect(8,37,1,1);
 // Stunden: Striche, XII oben, XXIV unten, lange Striche bei VI und XVIII
 for(let k=0;k<24;k++){if(k%12===0)continue;if(k%6===0){const a=Math.PI+(k-6)/24*Math.PI*2;g.fillStyle='#2a2019';for(let q=15;q<=19;q++)g.fillRect(Math.round(c+Math.cos(a)*q),Math.round(c+Math.sin(a)*q),1,1);continue;}const a=Math.PI+(k-6)/24*Math.PI*2;g.fillStyle='#2a2019';g.fillRect(Math.round(c+Math.cos(a)*18),Math.round(c+Math.sin(a)*18),1,1);if(k%3===0)g.fillRect(Math.round(c+Math.cos(a)*17),Math.round(c+Math.sin(a)*17),1,1);}
 ziffern(g,'XII',c,c-18,'#2a2019');ziffern(g,'XXIV',c,c+18,'#2a2019');
 // Zeiger: Gladius, Spitze blutig
 const a=Math.PI+(h-6)/24*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a);
 for(let i=-3;i<=12;i++){const x=Math.round(c+ca*i),y=Math.round(c+sa*i);if(i<0){g.fillStyle='#4a2a14';g.fillRect(x,y,1,1);continue;}
  g.fillStyle='#1a0e06';g.fillRect(Math.round(c+ca*i+sa),Math.round(c+sa*i-ca),1,1);g.fillRect(Math.round(c+ca*i-sa*2),Math.round(c+sa*i+ca*2),1,1);
  g.fillStyle=i>=9?'#b01e10':'#e8ecea';g.fillRect(x,y,1,1);g.fillStyle=i>=9?'#7e140a':'#8c9296';g.fillRect(Math.round(c+ca*i-sa),Math.round(c+sa*i+ca),1,1);}
 g.fillStyle='#a01c10';g.fillRect(Math.round(c+ca*10-sa),Math.round(c+sa*10+ca)+1,1,1);g.fillRect(Math.round(c+ca*10-sa),Math.round(c+sa*10+ca)+2,1,1);  // Tropfen
 g.fillStyle='#d8a830';g.fillRect(Math.round(c-sa*2)-0,Math.round(c+ca*2),1,1);g.fillRect(Math.round(c+sa*2),Math.round(c-ca*2),1,1);
 // Sonne oder Totenkopf-Mond am Zeigerende
 const tx=Math.round(c+ca*16),ty=Math.round(c+sa*16);
 if(tag){kreis(g,tx,ty,3,'#1a0e06');kreis(g,tx,ty,2,'#f8c840');g.fillStyle='#fff2b0';g.fillRect(tx-1,ty-1,1,1);}
 else{kreis(g,tx,ty,3,'#0c1024');kreis(g,tx,ty,2,'#e8dcc0');g.fillStyle='#1a0e06';g.fillRect(tx-1,ty-1,1,1);g.fillRect(tx+1,ty-1,1,1);g.fillRect(tx,ty+1,1,1);g.fillRect(tx-1,ty+2,1,1);g.fillRect(tx+1,ty+2,1,1);}
 kreis(g,c,c,1,'#1a0e06');g.fillStyle='#d8a830';g.fillRect(c,c,1,1);
 if(block){g.fillStyle='rgba(26,14,6,.35)';g.fillRect(0,0,48,48);}
 zg.imageSmoothingEnabled=false;zg.drawImage(U,0,0,48,48,0,0,zg.canvas.width,zg.canvas.height);}

window.AT2_IKON={bild,element,ersetzen,uhr,BILDER,EMOJI};
})();
