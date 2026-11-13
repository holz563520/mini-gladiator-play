// STIL ARENA THEORY 2.0 (welt-stil.js) · „Rattenpergament“: zeichnet allen 2.0-Menüs ihr Pixelpergament und rollt sie beim Öffnen auf. Wunsch Thomas 13.11.2026.
// Blut- und Brandflecken liegen bei jedem Öffnen zufällig, aber nie über Text, Knöpfen oder Bildern (Rückmeldung Thomas 13.11.2026).
// Anleitung für neue Menüs: siehe Kopf von welt-stil.css und Regel 19 in AT2_FAHRPLAN.md. Kurz: Klasse `ws-papier` geben, sonst nichts.
// Canvas-Texte: AT2_STIL.font(px). Leistung: Papier wird je Fenstergröße einmal klein (1 Pixel = 3 Bildschirmpunkte) gezeichnet und gemerkt;
// beobachtet werden nur neu eingefügte Fenster und das Attribut `hidden`. Nur auf arena-theory-2.html geladen, 1.0 bleibt unberührt.
(function(){
'use strict';
if(window.AT2_STIL)return;
const PX=3;                                // Größe eines Pergament-Pixels in Bildschirmpunkten
const K_TEXT=1.25;                         // Pixelschrift ist klein: auf Canvas so viel größer als die alte Schrift
// Fenster, die von selbst Pergament bekommen (bestehende 2.0-Oberflächen). Neue Menüs: einfach Klasse `ws-papier` setzen.
const ZIELE=['.ws-papier','#at2Start .s-box','.w-bar','#wBau','#wNah','#wZange','#wProfil','.hs-detail .hs-dbox','#wEdit','#wInfo','#wTablePanel'];
const SEL=ZIELE.join(',');
// welche nicht aufgerollt werden (ständig sichtbar, sollen nicht bei jedem Neuzeichnen zucken)
const OHNE_ROLLE=new Set(['w-bar']);
document.body.classList.add('at2-stil');
// Schriften früh laden, damit Canvas-Schilder nicht mit Ersatzschrift gemerkt werden
const bereit=document.fonts.load("20px 'AT2 Text'").catch(()=>{});

function rnd(s){s=(s>>>0)%2147483647||7;return()=>(s=(s*16807)%2147483647)/2147483647;}
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const PAP=[226,204,154];
const cache=new Map();
const NZ=new Float32Array(4096);{const q=rnd(4711);for(let i=0;i<4096;i++)NZ[i]=q();}  // Rauschtabelle (schneller als Zufall je Pixel)
// Pixelpergament zeichnen: unregelmäßig ausgefranster, verkohlter Rand in wechselnder Tiefe, abgerissene Ecken, Bissspuren aus einzelnen
// Zahnabdrücken, Flecken. Jede Variante (var) sieht anders aus. occ (Belegung durch Text/Knöpfe) wird nie angefressen oder verkohlt.
function linie(n,r,amp){  // 1D-Rauschen über eine Kante: große Wellen, kleine Zacken, einzelne Risse und Brandzungen
 const a=new Float32Array(n),o=[[14+r()*22,amp*(.6+r()*.6)],[4+r()*4,amp*.45],[1.6+r()*1.2,amp*.22]];
 for(const [per,am] of o){const k=Math.ceil(n/per)+2,pt=[];for(let i=0;i<k;i++)pt.push(r());for(let i=0;i<n;i++){const t=i/per,j=Math.floor(t),f=t-j,s=f*f*(3-2*f);a[i]+=((pt[j]*(1-s)+pt[j+1]*s)-.5)*2*am;}}
 for(let i=0;i<n;i++)a[i]+=(r()-.5)*1.1;
 for(let k=0,m=Math.floor(n/22+r()*2);k<m;k++){const c=Math.floor(r()*n),w=1+Math.floor(r()*3),t=2+r()*3.5;for(let i=-w;i<=w;i++)if(c+i>=0&&c+i<n)a[c+i]+=t*(1-Math.abs(i)/(w+1));}
 return a;}
function papier(w,h,vari,occ,mitFlecken){
 const W=Math.max(8,Math.ceil(w/PX)),H=Math.max(6,Math.ceil(h/PX)),key=W+'x'+H+':'+vari;
 if(!occ&&cache.has(key))return cache.get(key);
 const r=rnd(vari*7919+W*31+H*17+11),c=document.createElement('canvas');c.width=W;c.height=H;
 const g=c.getContext('2d'),im=g.createImageData(W,H),d=im.data;
 const MAXT=4.6;  // so tief darf der Rand höchstens fressen (Pergament-Pixel)
 const tief=(n,amp)=>{const L=linie(n,r,amp),o=.6+r()*1.4;for(let i=0;i<n;i++)L[i]=Math.max(0,Math.min(MAXT,L[i]+o));return L;};
 const dT=tief(W,1.6+r()*1.6),dB=tief(W,1.6+r()*1.6),dL=tief(H,1.2+r()*1.4),dR=tief(H,1.2+r()*1.4);
 const bT=linie(W,r,1.4),bB=linie(W,r,1.4),bL=linie(H,r,1.2),bR=linie(H,r,1.2);   // Breite der Brandzone schwankt
 // abgerissene Ecken (schräg, gezackt), rechts oben kleiner (dort sitzt oft ✕)
 const ecke=[0,1,2,3].map(i=>r()<.55?(i===1?2+r()*2.5:2.5+r()*5):0);
 // Bisse: Gruppen aus 3–6 Zahnabdrücken an zufälligen Kanten
 const zaehne=[];for(let k=0,n=Math.floor(r()*3)+(W*H>2500?1:0);k<n;k++){const s=Math.floor(r()*4),pos=.12+r()*.76,cx=s<2?pos*W:(s===2?-0.5:W-.5),cy=s<2?(s===0?-0.5:H-.5):pos*H;
  for(let z=0,m=3+Math.floor(r()*4);z<m;z++){const zr=.9+r()*1.8,ab=(z-m/2)*(1.3+r()*.8);zaehne.push({x:cx+(s<2?ab:0)+(r()-.5),y:cy+(s>=2?ab:0)+(r()-.5),r:zr*(s<2?1:1)});}}
 const fl=[];for(let i=0,n=1+Math.floor(r()*3+W*H/6000);i<n;i++)fl.push({x:r()*W,y:r()*H,rx:2+r()*Math.min(W,H)*.3,ry:2+r()*Math.min(W,H)*.2});
 const PAPV=[PAP[0]-r()*14,PAP[1]-r()*16,PAP[2]-r()*20];   // jede Variante etwas anders vergilbt
 const off=Math.floor(r()*4096);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4,j=y*W+x;
  let e=Math.min(x-dL[y],W-1-x-dR[y],y-dT[x],H-1-y-dB[x]);
  const ec=[x+y,(W-1-x)+y,x+(H-1-y),(W-1-x)+(H-1-y)];for(let k=0;k<4;k++)if(ecke[k]){const n=NZ[(x*13+y*29+k*977)&4095];e=Math.min(e,ec[k]-ecke[k]*1.4+n*1.6);}
  if(e<9)for(const z of zaehne){const dx=x-z.x,dy=y-z.y;if(dx>z.r+2||dx<-z.r-2||dy>z.r+2||dy<-z.r-2)continue;e=Math.min(e,Math.sqrt(dx*dx+dy*dy)-z.r+NZ[(x*7+y*11)&4095]*.9);}
  const bz=x<y&&x<H-y?bL[y]:(W-1-x<y&&W-1-x<H-1-y?bR[y]:(y<H/2?bT[x]:bB[x])),bb=Math.max(1.4,2.6+bz);
  if(occ&&occ[j]===1)e=Math.max(e,bb+1.5);
  if(e<.5){d[i+3]=0;continue;}
  const th=BAYER[(y&3)*4+(x&3)]/16,nz=NZ[(x*73+y*151+off)&4095];
  let R=PAPV[0]-nz*10,G=PAPV[1]-nz*10,B=PAPV[2]-nz*8;
  if(nz>.972){R*=.82;G*=.78;B*=.7;}
  for(let k=0;k<fl.length;k++){const f=fl[k],qx=(x-f.x)/f.rx,qy=(y-f.y)/f.ry;if(qx>1||qx<-1||qy>1||qy<-1)continue;const q=Math.sqrt(qx*qx+qy*qy);if(q<1&&th<(1-q)*.26){R*=.9;G*=.86;B*=.8;}}
  if(e<1.3){R=20+nz*10;G=8;B=3;}else if(e<bb*.55){R=58+nz*22;G=24;B=7;}else if(e<bb&&th<.6){R=R*.5+42;G=G*.42+14;B*=.3;}else if(e<bb+2.2&&th<.3){R*=.84;G*=.74;B*=.6;}
  d[i]=R;d[i+1]=G;d[i+2]=B;d[i+3]=255;}
 g.putImageData(im,0,0);
 if(mitFlecken){g.globalCompositeOperation='source-atop';g.drawImage(mitFlecken,0,0);g.globalCompositeOperation='source-over';}  // Flecken nur aufs Papier, nicht in abgerissene Stellen
 const url='url('+c.toDataURL()+')';
 if(!occ&&!mitFlecken){if(cache.size>60)cache.delete(cache.keys().next().value);cache.set(key,url);}
 return url;}

function samen(el){let s=0;const t=(el.id||el.className||'x')+'';for(let i=0;i<t.length;i++)s=(s*31+t.charCodeAt(i))|0;return Math.abs(s)+1;}

// ---------- Blut- und Brandflecken: zufällig je Öffnen, nie über Inhalt ----------
const MEDIEN=new Set(['CANVAS','IMG','SVG','svg','VIDEO']);   // Bilder: keine Flecken drunter, aber der Rand darf ausfransen (sie liegen ohnehin obenauf)
const FREI_TAGS=new Set(['BUTTON','INPUT','SELECT','TEXTAREA','CANVAS','IMG','SVG','svg','VIDEO','PROGRESS','METER']);
// Belegung in Pergament-Pixeln: 1 = Text und Knöpfe (Rand frisst nie hinein), 2 = Bilder/Canvas (nur keine Flecken), 1 Pixel Abstand
function belegung(el,W,H){
 const occ=new Uint8Array(W*H),b0=el.getBoundingClientRect(),M=1;
 const mark=(r,v=1)=>{if(r.width<1||r.height<1)return;const x0=Math.max(0,Math.floor((r.left-b0.left)/PX)-M),x1=Math.min(W-1,Math.ceil((r.right-b0.left)/PX)+M),
  y0=Math.max(0,Math.floor((r.top-b0.top)/PX)-M),y1=Math.min(H-1,Math.ceil((r.bottom-b0.top)/PX)+M);for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const k=y*W+x;if(occ[k]!==1)occ[k]=v;}};
 const rg=document.createRange(),tw=document.createTreeWalker(el,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode(n){
  if(n.nodeType===1){if(n.classList?.contains('ws-rolle'))return NodeFilter.FILTER_REJECT;if(FREI_TAGS.has(n.tagName)){mark(n.getBoundingClientRect(),MEDIEN.has(n.tagName)?2:1);return NodeFilter.FILTER_REJECT;}return NodeFilter.FILTER_SKIP;}
  return n.data.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP;}});
 for(let n;(n=tw.nextNode());){rg.selectNodeContents(n);for(const r of rg.getClientRects())mark(r);}
 return occ;}
function frei(occ,W,H,x,y,r){const R=Math.ceil(r);for(let yy=Math.floor(y-R);yy<=y+R;yy++)for(let xx=Math.floor(x-R);xx<=x+R;xx++){
 if(xx<0||yy<0||xx>=W||yy>=H)continue;if((xx-x)**2+(yy-y)**2>r*r)continue;if(occ[yy*W+xx])return false;}return true;}
function neueFlecken(occ,W,H){
 const L=[],R=Math.random,nBlut=1+Math.floor(R()*2),nBrand=Math.floor(R()*3),gross=Math.min(W,H);
 const setze=(art,rmin,rmax)=>{for(let t=0;t<90;t++){const r=(rmax-(rmax-rmin)*t/90)*(.85+R()*.15),x=1+R()*(W-2),y=1+R()*(H-2),reich=art==='blut'?r*2.2:r*1.1;
  if(frei(occ,W,H,x,y,reich)){const f={art,x:x/W,y:y/H,r,teile:[]};if(art==='blut')for(let k=0,n=4+Math.floor(R()*6);k<n;k++){const a=R()*6.283,d=r*(1.2+R()*1.0);f.teile.push([Math.cos(a)*d,Math.sin(a)*d,.5+R()*.9]);}
   else for(let k=0;k<7;k++)f.teile.push([R(),R()]);L.push(f);return;}}};
 for(let i=0;i<nBlut;i++)setze('blut',1.6,Math.max(2,Math.min(4.5,gross*.14)));
 for(let i=0;i<nBrand;i++)setze('brand',2.8,Math.max(3.2,Math.min(9,gross*.26)));
 return L;}
function noch(f,occ,W,H){return frei(occ,W,H,f.x*W,f.y*H,f.art==='blut'?f.r*2.2:f.r*1.1);}
function fleckenBild(L,W,H){
 const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d'),im=g.createImageData(W,H),d=im.data;
 const px=(x,y,R,G,B)=>{x|=0;y|=0;if(x<0||y<0||x>=W||y>=H)return;const i=(y*W+x)*4;d[i]=R;d[i+1]=G;d[i+2]=B;d[i+3]=255;};
 for(const f of L){const cx=f.x*W,cy=f.y*H,r=f.r;
  if(f.art==='blut'){const kreis=(mx,my,rr,dunkel)=>{for(let y=Math.floor(my-rr);y<=my+rr;y++)for(let x=Math.floor(mx-rr);x<=mx+rr;x++){const q=((x-mx)**2+(y-my)**2)/(rr*rr);if(q<=1){const n=NZ[(x*73+y*151)&4095];px(x,y,(dunkel?96:132)-n*30+(q<.3?14:0),q<.3?14:8,6);}}};
   kreis(cx,cy,r,false);for(const t of f.teile)kreis(cx+t[0],cy+t[1],t[2],R0(t));
}
  else{for(let y=Math.floor(cy-r);y<=cy+r;y++)for(let x=Math.floor(cx-r);x<=cx+r;x++){const n=NZ[(x*31+y*197)&4095],q=Math.sqrt((x-cx)**2+(y-cy)**2)/r+ (n-.5)*.35;
   if(q<.42)px(x,y,24+n*14,10,3);else if(q<.62)px(x,y,62+n*20,26,8);else if(q<.82&&BAYER[(y&3)*4+(x&3)]<9)px(x,y,120+n*20,70,28);else if(q<1&&BAYER[(y&3)*4+(x&3)]<4)px(x,y,150,104,58);}}}
 g.putImageData(im,0,0);return c;}
function R0(t){return t[2]<.8;}

const offen=new Set();let geplant=0;
// Inhalt ändert sich (z. B. Uhrzeit, Hinweistext): höchstens alle 250 ms prüfen, ob ein Fleck jetzt unter Text läge
function inhalt(el){const t=performance.now();if(el._wsT&&t-el._wsT<250){if(!el._wsSpaet)el._wsSpaet=setTimeout(()=>{el._wsSpaet=0;inhalt(el);},260);return;}el._wsT=t;planen(el,false);}
function malen(el){
 if(!el.isConnected||el.hidden)return;const b=el.getBoundingClientRect();if(b.width<4||b.height<4)return;
 const W=Math.max(8,Math.ceil(b.width/PX)),H=Math.max(6,Math.ceil(b.height/PX));
 if(el._wsNeu||el._wsVar==null)el._wsVar=Math.floor(Math.random()*1e6);
 let L=el._wsFlecken,occ=null;const cs=getComputedStyle(el),roll=(/auto|scroll/.test(cs.overflowY)&&el.scrollHeight>el.clientHeight+2)||(/auto|scroll/.test(cs.overflowX)&&el.scrollWidth>el.clientWidth+2);
 if(roll)L=[];   // Inhalt scrollt: Text kann überall hin, darum keine Flecken
 else{occ=belegung(el,W,H);const gr=el._wsGr,anders=!gr||Math.abs(gr[0]-W)>W*.1||Math.abs(gr[1]-H)>H*.1;
  if(!L||el._wsNeu||anders||!L.length){L=neueFlecken(occ,W,H);el._wsGr=[W,H];}else L=L.filter(f=>noch(f,occ,W,H));}
 const key=W+'x'+H+':'+L.length+':'+el._wsVar;el._wsNeu=false;
 if(el._wsKey===key&&el._wsFlecken&&el._wsFlecken.length===L.length&&L.every((f,i)=>f===el._wsFlecken[i])){return;}
 el._wsFlecken=L;el._wsKey=key;el.style.backgroundImage=papier(b.width,b.height,el._wsVar,occ,L.length?fleckenBild(L,W,H):null);el.classList.add('ws-fertig');}
function planen(el,neu){if(neu)el._wsNeu=true;offen.add(el);if(!geplant)geplant=requestAnimationFrame(()=>{geplant=0;const a=[...offen];offen.clear();for(const e of a)malen(e);});}
const ro=new ResizeObserver(es=>{for(const e of es){if(!e.target.isConnected){ro.unobserve(e.target);continue;}planen(e.target,false);}});

function aufrollen(el){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 if([...el.classList].some(c=>OHNE_ROLLE.has(c))&&el.dataset.wsGerollt)return;el.dataset.wsGerollt=1;
 if(getComputedStyle(el).position==='static')el.style.position='relative';
 const b=el.getBoundingClientRect();el.classList.toggle('ws-hoch',b.top+b.height/2>innerHeight*.55);
 el.querySelector(':scope>.ws-rolle')?.remove();el.classList.remove('ws-auf');void el.offsetWidth;
 const rolle=document.createElement('i');rolle.className='ws-rolle';rolle.setAttribute('aria-hidden','true');el.appendChild(rolle);el.classList.add('ws-auf');
 setTimeout(()=>{rolle.remove();el.classList.remove('ws-auf');},300);}

function anmelden(el,rollen){
 if(!el.classList.contains('ws-papier')){el.classList.add('ws-papier');ro.observe(el);}
 planen(el,true);
 if(rollen&&!el.hidden&&el.offsetParent!==null)aufrollen(el);}
function suchen(wurzel,rollen){
 if(wurzel.nodeType!==1)return;
 if(wurzel.matches(SEL))anmelden(wurzel,rollen);
 if(wurzel.firstElementChild)for(const el of wurzel.querySelectorAll(SEL))anmelden(el,rollen);}

new MutationObserver(ms=>{for(const m of ms){
 if(m.type==='attributes'){const el=m.target;if(el.classList.contains('ws-papier')&&!el.hidden&&m.oldValue!==null){planen(el,true);aufrollen(el);}continue;}
 for(const n of m.addedNodes)if(n.nodeType===1&&n.className!=='ws-rolle')suchen(n,true);
 const box=m.target.nodeType===1?m.target.closest('.ws-papier'):null;if(box&&!(m.addedNodes.length===1&&m.addedNodes[0].className==='ws-rolle'))inhalt(box);}})
 .observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden'],attributeOldValue:true});
suchen(document.body,false);

window.AT2_STIL={
 PX,papier,aufrollen,bereit,neuMalen:el=>planen(el,true),
 // Prüfung für Tests: wie viele Flecken liegen gerade über Inhalt (soll 0 sein)
 pruefen(el){const b=el.getBoundingClientRect(),W=Math.max(8,Math.ceil(b.width/PX)),H=Math.max(6,Math.ceil(b.height/PX)),occ=belegung(el,W,H);return (el._wsFlecken||[]).filter(f=>!frei(occ,W,H,f.x*W,f.y*H,f.r)).length;},
 // Canvas-Schrift: px = Größe wie bisher (alte Schrift)
 font(px){return Math.round(px*K_TEXT)+"px 'AT2 Text',ui-monospace,monospace";},
};
})();
