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
// Pixelpergament zeichnen (Grundpapier, je Größe gemerkt): verbrannter Rand, Rattenbisse, leichte Flecken. Blut und Brand kommen als eigene Schicht (flecken()).
function papier(w,h,seed){
 const W=Math.max(8,Math.ceil(w/PX)),H=Math.max(6,Math.ceil(h/PX)),key=W+'x'+H+':'+(seed%5);
 if(cache.has(key))return cache.get(key);
 const r=rnd(seed*7919+W*31+H),c=document.createElement('canvas');c.width=W;c.height=H;
 const g=c.getContext('2d'),im=g.createImageData(W,H),d=im.data;
 const nx=new Float32Array(W),ny=new Float32Array(H);for(let i=0;i<W;i++)nx[i]=r();for(let i=0;i<H;i++)ny[i]=r();
 // Bisse: an Unter- und Seitenkanten, oben nur links (rechts oben sitzt oft ✕); kleine Fenster weniger
 const bisse=[],nb=W*H>3000?2+Math.floor(r()*2):1;
 for(let i=0;i<nb;i++){const s=Math.floor(r()*4),gr=Math.min(H/4,3+r()*3);
  if(s===0)bisse.push({x:W*(.1+r()*.45),y:-gr*.35,r:gr});else if(s===1)bisse.push({x:W+gr*.35,y:H*(.3+r()*.5),r:gr});
  else if(s===2)bisse.push({x:W*(.15+r()*.7),y:H+gr*.35,r:gr});else bisse.push({x:-gr*.35,y:H*(.3+r()*.5),r:gr});}
 const flecken=[];for(let i=0,n=1+Math.floor(W*H/5000);i<n;i++)flecken.push({x:r()*W,y:r()*H,r:3+r()*Math.min(W,H)*.22});
 const off=Math.floor(r()*4096);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4;
  let e=Math.min(x,y,W-1-x,H-1-y);
  e-=(x<2||x>W-3?nx[y%W]*2:0)+(y<2||y>H-3?ny[x%H]*2:0)+((x*7+y*13)%5===0?.6:0);
  if(e<9)for(const b of bisse){const dx=x-b.x,dy=y-b.y;if(dx>b.r+1||dx<-b.r-1||dy>b.r+1||dy<-b.r-1)continue;e=Math.min(e,Math.sqrt(dx*dx+dy*dy)-b.r+((x+y)&1?.8:0));}
  if(e<.5){d[i+3]=0;continue;}
  const th=BAYER[(y&3)*4+(x&3)]/16,nz=NZ[(x*73+y*151+off)&4095];
  let R=PAP[0]-nz*9,G=PAP[1]-nz*9,B=PAP[2]-nz*7;
  if(nz>.975){R*=.84;G*=.8;B*=.72;}                                  // Fasern
  for(let k=0;k<flecken.length;k++){const f=flecken[k];const dx=x-f.x,dy=y-f.y;if(dx>f.r||dx<-f.r||dy>f.r||dy<-f.r)continue;const q=Math.sqrt(dx*dx+dy*dy)/f.r;if(q<1&&th<(1-q)*.22){R*=.92;G*=.89;B*=.85;}}
  if(e<1.6){R=22;G=9;B=3;}else if(e<2.6){R=66;G=27;B=8;}else if(e<4.2&&th<.5){R=R*.55+40;G=G*.45+12;B*=.35;}else if(e<6&&th<.22){R*=.82;G*=.72;B*=.6;}
  d[i]=R;d[i+1]=G;d[i+2]=B;d[i+3]=255;}
 g.putImageData(im,0,0);const url='url('+c.toDataURL()+')';
 if(cache.size>60)cache.delete(cache.keys().next().value);
 cache.set(key,url);return url;}

function samen(el){let s=0;const t=(el.id||el.className||'x')+'';for(let i=0;i<t.length;i++)s=(s*31+t.charCodeAt(i))|0;return Math.abs(s)+1;}

// ---------- Blut- und Brandflecken: zufällig je Öffnen, nie über Inhalt ----------
const FREI_TAGS=new Set(['BUTTON','INPUT','SELECT','TEXTAREA','CANVAS','IMG','SVG','svg','VIDEO','PROGRESS','METER']);
// Belegung in Pergament-Pixeln: alles mit Text, Knöpfe, Bilder (mit 2 Pixeln Abstand)
function belegung(el,W,H){
 const occ=new Uint8Array(W*H),b0=el.getBoundingClientRect(),M=1;
 const mark=r=>{if(r.width<1||r.height<1)return;const x0=Math.max(0,Math.floor((r.left-b0.left)/PX)-M),x1=Math.min(W-1,Math.ceil((r.right-b0.left)/PX)+M),
  y0=Math.max(0,Math.floor((r.top-b0.top)/PX)-M),y1=Math.min(H-1,Math.ceil((r.bottom-b0.top)/PX)+M);for(let y=y0;y<=y1;y++)occ.fill(1,y*W+x0,y*W+x1+1);};
 const rg=document.createRange(),tw=document.createTreeWalker(el,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode(n){
  if(n.nodeType===1){if(n.classList?.contains('ws-rolle'))return NodeFilter.FILTER_REJECT;if(FREI_TAGS.has(n.tagName)){mark(n.getBoundingClientRect());return NodeFilter.FILTER_REJECT;}return NodeFilter.FILTER_SKIP;}
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
 g.putImageData(im,0,0);return 'url('+c.toDataURL()+')';}
function R0(t){return t[2]<.8;}

const offen=new Set();let geplant=0;
// Inhalt ändert sich (z. B. Uhrzeit, Hinweistext): höchstens alle 250 ms prüfen, ob ein Fleck jetzt unter Text läge
function inhalt(el){const t=performance.now();if(el._wsT&&t-el._wsT<250){if(!el._wsSpaet)el._wsSpaet=setTimeout(()=>{el._wsSpaet=0;inhalt(el);},260);return;}el._wsT=t;planen(el,false);}
function malen(el){
 if(!el.isConnected||el.hidden)return;const b=el.getBoundingClientRect();if(b.width<4||b.height<4)return;
 const W=Math.max(8,Math.ceil(b.width/PX)),H=Math.max(6,Math.ceil(b.height/PX)),grund=papier(b.width,b.height,samen(el));
 let L=el._wsFlecken;const cs=getComputedStyle(el),roll=(/auto|scroll/.test(cs.overflowY)&&el.scrollHeight>el.clientHeight+2)||(/auto|scroll/.test(cs.overflowX)&&el.scrollWidth>el.clientWidth+2);
 if(roll)L=[];   // Inhalt scrollt: Text kann überall hin, darum keine Flecken
 else{const occ=belegung(el,W,H),gr=el._wsGr,anders=!gr||Math.abs(gr[0]-W)>W*.1||Math.abs(gr[1]-H)>H*.1;
  if(!L||el._wsNeu||anders||!L.length){L=neueFlecken(occ,W,H);el._wsGr=[W,H];}else L=L.filter(f=>noch(f,occ,W,H));}
 const key=W+'x'+H+':'+L.length;el._wsNeu=false;
 if(el._wsKey===key&&el._wsFlecken&&el._wsFlecken.length===L.length&&L.every((f,i)=>f===el._wsFlecken[i])){return;}
 el._wsFlecken=L;el._wsKey=key;
 el.style.backgroundImage=L.length?fleckenBild(L,W,H)+','+grund:grund;el.classList.add('ws-fertig');}
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
