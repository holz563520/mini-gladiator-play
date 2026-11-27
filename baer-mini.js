'use strict';
// =====================================================================================================
// ARENA THEORY · BÄREN: Miniaturansichten (gehört zu dist/baer.js, eigenständige Testversion)
// BAER.mini(sorte oder bär, art, breite): kleines Bild, einmal gezeichnet und gemerkt, danach kostenlos.
// art 'side' = Seitenansicht stehend, 'head' = Kopfbild. Für eine Sorte wird der typische Bär gezeigt.
// =====================================================================================================
(()=>{
const BAER=window.BAER,CACHE=new Map();
// Der typische Bär einer Sorte: Sortengröße, häufigstes Fell, unverfälschte Farben
function typical(B){const D=BAER.create(B.id,1),coat=(BAER.COATS[B.id]||BAER.COATS._)[0];D.height=B.cm0;D.upright=B.up0;D.weight=B.kg0;
 D.appearance.coat=coat.id;D.appearance.coatName=coat.name;for(const k of ['base','light','shade','dark','muzzle','claw'])D.appearance.colors[k]=coat[k];return D;}
BAER.typical=id=>typical(BAER.breed(id));
// scale: Bildpunkte je Zentimeter. Ohne Angabe füllt der Bär das Bild (für Listen); mit Angabe stimmt das Größenverhältnis zwischen Sorten.
BAER.mini=(x,kind='side',w=96,scale=0)=>{const isBreed=typeof x==='string'||!x.seed,B=BAER.breed(isBreed?(x.id||x):x.breed),D=isBreed?typical(B):x;
 const key=(isBreed?'s:'+B.id:'b:'+D.id+':'+D.appearance.coat+':'+D.height)+':'+kind+':'+w+':'+scale;let cv=CACHE.get(key);if(cv)return cv;
 const h=kind==='head'?w:Math.round(w*.66);cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d'),a=BAER.actor(D,'stand'),sz=a.P.sz;
 if(kind==='head'){const R=BAER.rig(a,0),k=w/(30*sz);c.save();c.beginPath();c.rect(0,0,w,h);c.clip();BAER.draw(c,a,w*.44-R.hcx*sz*k,h*.52-R.hcy*sz*k,k,1,{time:0,noShadow:true});c.restore();}
 else{const k=scale?scale*BAER.CM:Math.min(w/(96*sz),(h-4)/(52*sz));BAER.draw(c,a,w*.47-5*sz*k,h-3,k,1,{time:0});}
 if(CACHE.size>600)CACHE.clear();CACHE.set(key,cv);return cv;};
BAER.miniCount=()=>CACHE.size;BAER.miniClear=()=>CACHE.clear();
})();
