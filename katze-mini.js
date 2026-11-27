'use strict';
// =====================================================================================================
// ARENA THEORY · KATZEN: Miniaturansichten (gehört zu dist/katze.js, eigenständige Testversion)
// KATZE.mini(sorte oder katze, art, breite): kleines Bild, einmal gezeichnet und gemerkt, danach kostenlos.
// art 'side' = Seitenansicht stehend, 'head' = Kopfbild. Für eine Sorte wird die typische Katze gezeigt.
// =====================================================================================================
(()=>{
const K=window.KATZE,CACHE=new Map();
// Die typische Katze einer Sorte: Sortengröße, häufigstes Fell, unverfälschte Farben, mittlere Mähne
function typical(B){const D=K.create(B.id,1),coat=(K.COATS[B.id]||K.COATS._)[0];D.height=B.cm0;D.length=B.len0;D.weight=B.kg0;
 D.appearance.coat=coat.id;D.appearance.coatName=coat.name;D.appearance.mane=1;for(const k of K.COLKEYS)D.appearance.colors[k]=coat[k];return D;}
K.typical=id=>typical(K.breed(id));
// scale: Bildpunkte je Zentimeter. Ohne Angabe füllt die Katze das Bild (für Listen); mit Angabe stimmt das Größenverhältnis zwischen Sorten.
K.mini=(x,kind='side',w=96,scale=0)=>{const isBreed=typeof x==='string'||!x.seed,B=K.breed(isBreed?(x.id||x):x.breed),D=isBreed?typical(B):x;
 const key=(isBreed?'s:'+B.id:'b:'+D.id+':'+D.appearance.coat+':'+D.height)+':'+kind+':'+w+':'+scale;let cv=CACHE.get(key);if(cv)return cv;
 const h=kind==='head'?w:Math.round(w*.66);cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d'),a=K.actor(D,'stand'),sz=K.szOf(D,K.shapeOf(D));
 if(kind==='head'){const R=K.rig(a,0),k=w/(34*sz);c.save();c.beginPath();c.rect(0,0,w,h);c.clip();K.draw(c,a,w*.44-R.hcx*sz*k,h*.5-R.hcy*sz*k,k,1,{time:0,noShadow:true});c.restore();}
 else{const k=scale?scale*K.CM:Math.min(w/(112*sz),(h-4)/(64*sz));K.draw(c,a,w*.5+6*sz*k,h-3,k,1,{time:0});}
 if(CACHE.size>600)CACHE.clear();CACHE.set(key,cv);return cv;};
K.miniCount=()=>CACHE.size;K.miniClear=()=>CACHE.clear();
})();
