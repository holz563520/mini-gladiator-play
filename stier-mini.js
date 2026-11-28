'use strict';
// =====================================================================================================
// ARENA THEORY · STIERE UND OCHSEN: Miniaturansichten (gehört zu dist/stier.js, eigenständige Testversion)
// STIER.mini(rasse oder tier, art, breite, maßstab, form): kleines Bild, einmal gezeichnet und gemerkt, danach kostenlos.
// art 'side' = Seitenansicht stehend, 'head' = Kopfbild von der Seite, 'front' = Kopf von vorn. Für eine Rasse wird das typische Tier der Form gezeigt.
// Heller Sandgrund hinter dem Tier, damit auch ein schwarzer Stier auf dunklen Listen zu erkennen ist.
// =====================================================================================================
(()=>{
const S=window.STIER,CACHE=new Map(),SAND='#cdbb96';
// Das typische Tier einer Rasse und Form: Rassengröße, häufigstes Fell, unverfälschte Farben, mittlere Hörner
function typical(B,form){const D=S.create(B.id,1,form),coat=(S.COATS[B.id]||S.COATS._)[0];D.height=Math.round(B.cm0*(form==='ox'?1.05:1));D.weight=B.kg0;
 D.appearance.coat=coat.id;D.appearance.coatName=coat.name;D.appearance.pattern=coat.pattern||'';D.appearance.horn=1;for(const k of S.COLKEYS)D.appearance.colors[k]=coat[k];return D;}
S.typical=(id,form='bull')=>typical(S.breed(id),form);
// scale: Bildpunkte je Zentimeter. Ohne Angabe füllt das Tier das Bild (für Listen); mit Angabe stimmt das Größenverhältnis zwischen Rassen und Formen.
S.mini=(x,kind='side',w=96,scale=0,form='bull')=>{const isBreed=typeof x==='string'||!x.seed,B=S.breed(isBreed?(x.id||x):x.breed),D=isBreed?typical(B,form):x;
 const key=(isBreed?'s:'+B.id+':'+form:'b:'+D.id+':'+D.appearance.coat+':'+D.height)+':'+kind+':'+w+':'+scale;let cv=CACHE.get(key);if(cv)return cv;
 const h=kind==='side'?Math.round(w*.7):w;cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d'),a=S.actor(D,'stand'),SH=S.shapeOf(D),sz=S.szOf(D,SH);
 c.fillStyle=SAND;c.fillRect(0,0,w,h);c.save();c.beginPath();c.rect(0,0,w,h);c.clip();
 if(kind==='head'){const R=S.rig(a,0),k=w/(46*sz);S.draw(c,a,w*.4-R.hcx*sz*k,h*.6-R.hcy*sz*k,k,1,{time:0,noShadow:true});}
 else if(kind==='front'){const k=w/(64*sz);S.drawFront(c,D,w*.5,h*.52,k);}
 else{const k=scale?scale*S.CM:Math.min(w/(112*sz),(h-5)/(74*sz));S.draw(c,a,w*.5-6*sz*k,h-4,k,1,{time:0});}
 c.restore();if(CACHE.size>600)CACHE.clear();CACHE.set(key,cv);return cv;};
S.miniCount=()=>CACHE.size;S.miniClear=()=>CACHE.clear();
})();
