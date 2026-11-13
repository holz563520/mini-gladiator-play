// STIL ARENA THEORY 2.0 (welt-stil.js) · „Rattenpergament“: zeichnet allen 2.0-Menüs ihr Pixelpergament und rollt sie beim Öffnen auf. Wunsch Thomas 13.11.2026.
// Anleitung für neue Menüs: siehe Kopf von welt-stil.css und Regel 19 in AT2_FAHRPLAN.md. Kurz: Klasse `ws-papier` geben, sonst nichts.
// Canvas-Texte: AT2_STIL.font(px, titel). Leistung: Papier wird je Fenstergröße einmal klein (1 Pixel = 3 Bildschirmpunkte) gezeichnet und gemerkt;
// beobachtet werden nur neu eingefügte Fenster und das Attribut `hidden`. Nur auf arena-theory-2.html geladen, 1.0 bleibt unberührt.
(function(){
'use strict';
if(window.AT2_STIL)return;
const PX=3;                                // Größe eines Pergament-Pixels in Bildschirmpunkten
const K_TEXT=1.25,K_TITEL=1.27;            // Pixelschriften sind klein: auf Canvas so viel größer als die alte Schrift
// Fenster, die von selbst Pergament bekommen (bestehende 2.0-Oberflächen). Neue Menüs: einfach Klasse `ws-papier` setzen.
const ZIELE=['.ws-papier','#at2Start .s-box','.w-bar','#wBau','#wNah','#wZange','#wProfil','.hs-detail .hs-dbox','#wEdit','#wInfo','#wTablePanel'];
const SEL=ZIELE.join(',');
// welche nicht aufgerollt werden (ständig sichtbar, sollen nicht bei jedem Neuzeichnen zucken)
const OHNE_ROLLE=new Set(['w-bar']);
// Überschriften in Frakturschrift: GROSSBUCHSTABEN sind in Fraktur unlesbar, darum dort als „Arena Theory“ zeigen (nur die Anzeige)
const TITEL=['h1','h2','h3','.ws-titel','.w-title b','.w-uhr b','#weltBoot b','.bau-gruppe>b','.br-teil>b','.nah-t header b','#wProfil header b','#wEdit>header','#at2Start .s-nr'];
const TSEL=TITEL.join(',');
const KLEIN=new Set(['von','und','der','die','das','des','den','dem','im','am','an','zu','zum','zur','mit','für','auf','in','of','the','and','to','a','an','at','for']);
function titel(s){if(!/[A-ZÄÖÜ]{2}/.test(s)||/[a-zäöüß]/.test(s))return s;let i=0;
 return s.replace(/[A-ZÄÖÜß][A-ZÄÖÜß'-]*/g,(w)=>{const l=w.toLowerCase();if(i++&&KLEIN.has(l))return l;return w==='II'||w==='III'||w==='IV'||w==='VI'?w:w[0]+l.slice(1);});}
function titelFix(el){for(const n of el.childNodes)if(n.nodeType===3){const t=titel(n.data);if(t!==n.data)n.data=t;}}

document.body.classList.add('at2-stil');
// Schriften früh laden, damit Canvas-Schilder nicht mit Ersatzschrift gemerkt werden
const bereit=Promise.all([document.fonts.load("20px 'AT2 Text'"),document.fonts.load("24px 'AT2 Titel'")]).catch(()=>{});

function rnd(s){s=(s>>>0)%2147483647||7;return()=>(s=(s*16807)%2147483647)/2147483647;}
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const PAP=[226,204,154];
const cache=new Map();
const NZ=new Float32Array(4096);{const q=rnd(4711);for(let i=0;i<4096;i++)NZ[i]=q();}  // Rauschtabelle (schneller als Zufall je Pixel)
// Pixelpergament zeichnen: verbrannter Rand, Rattenbisse, Flecken, Blut nur in Ecken (weit weg vom Text)
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
 // Blut: ein Spritzer in einer unteren Ecke, nur im Randbereich
 const blut=[];if(r()<.75){const links=r()<.5,cx=links?2+r()*2:W-3-r()*2,cy=H-3-r()*2,R=1.4+r()*1.2;blut.push({x:cx,y:cy,r:R});
  for(let k=0;k<6;k++){const a=r()*6.283,dd=R*(1.3+r()*1.5);const bx=cx+Math.cos(a)*dd,by=cy+Math.sin(a)*dd;if(bx>0&&by>0&&bx<W&&by<H)blut.push({x:bx,y:by,r:.5+r()*.8});}}
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
  if(y>H-9)for(const b of blut){const dx=x-b.x,dy=y-b.y;if(dx*dx+dy*dy<b.r*b.r){R=104-nz*28;G=8;B=6;break;}}
  d[i]=R;d[i+1]=G;d[i+2]=B;d[i+3]=255;}
 g.putImageData(im,0,0);const url='url('+c.toDataURL()+')';
 if(cache.size>60)cache.delete(cache.keys().next().value);
 cache.set(key,url);return url;}

function samen(el){let s=0;const t=(el.id||el.className||'x')+'';for(let i=0;i<t.length;i++)s=(s*31+t.charCodeAt(i))|0;return Math.abs(s)+1;}
const ro=new ResizeObserver(es=>{for(const e of es){const el=e.target;if(!el.isConnected){ro.unobserve(el);continue;}
 const w=Math.round(e.contentRect.width),h=Math.round(e.contentRect.height);if(!w||!h)continue;
 const cs=getComputedStyle(el),W=w+parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight),H=h+parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom);
 el.style.backgroundImage=papier(W,H,samen(el));el.classList.add('ws-fertig');}});

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
 if(rollen&&!el.hidden&&el.offsetParent!==null)aufrollen(el);}
function suchen(wurzel,rollen){
 if(wurzel.nodeType===3){const p=wurzel.parentElement;if(p&&p.matches(TSEL))titelFix(p);return;}
 if(wurzel.nodeType!==1)return;
 if(wurzel.matches(TSEL))titelFix(wurzel);if(wurzel.firstElementChild)for(const el of wurzel.querySelectorAll(TSEL))titelFix(el);
 if(wurzel.matches(SEL))anmelden(wurzel,rollen);
 if(wurzel.firstElementChild)for(const el of wurzel.querySelectorAll(SEL))anmelden(el,rollen);}

new MutationObserver(ms=>{for(const m of ms){
 if(m.type==='attributes'){const el=m.target;if(el.classList.contains('ws-papier')&&!el.hidden&&m.oldValue!==null)aufrollen(el);continue;}
 for(const n of m.addedNodes)if(n.nodeType===3||(n.nodeType===1&&n.className!=='ws-rolle'))suchen(n,true);}})
 .observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden'],attributeOldValue:true});
suchen(document.body,false);

window.AT2_STIL={
 PX,papier,aufrollen,bereit,titel,
 // Canvas-Schrift: px = Größe wie bisher (alte Schrift), titel = Frakturschrift für Überschriften und Schilder
 font(px,titel){return Math.round(px*(titel?K_TITEL:K_TEXT))+"px "+(titel?"'AT2 Titel','AT2 Text'":"'AT2 Text'")+",ui-monospace,monospace";},
};
})();
