'use strict';
// =====================================================================================================
// ARENA THEORY · BÄREN: Köpfe und Fell je Sorte (gehört zu dist/baer.js, eigenständige Testversion)
// Jede Sorte trägt hier ihren Kopfzeichner (BAER.HEADS) und ihre Fellfarben (BAER.COATS) ein.
// Kopf im eigenen Rahmen: Mitte des Schädels bei 0,0, Schnauze zeigt nach +x, oben ist -y.
// =====================================================================================================
(()=>{
const BAER=window.BAER,{rr,poly,disk,seg}=BAER.prim,mix=BAER.mix;

// ---------------------------------------------------------------- Braunbär (Bauart G): breiter Schädel, eingedelltes Profil, kleine runde Ohren, helle Schnauze
BAER.HEADS.br=(c,D,SH,col,o)=>{const base=col.base,dark=col.dark,shade=col.shade,mz=col.muzzle,e=SH.ear,sn=SH.snout,st=SH.stop;
 const tip=6.4+8*sn;// Nasenspitze
 disk(c,-4.4,-6.6,2.7*e,mix(dark,shade,.4));// fernes Ohr
 disk(c,-1.2,3.2,7.2,base);// Backen, Wamme
 disk(c,0,0,7.9,base);// Schädel
 // Stirn mit Absatz, Nasenrücken, Schnauze, Unterkiefer
 poly(c,[[-1,-7.6],[3.4,-7.1],[5.6,-5.4-st*.5],[7,-3.5+st*.25],[tip-1.4,-3],[tip,-2],[tip+.3,.2],[tip-.6,2.2],[tip-3,3.4],[6,4.6],[2,6.6],[-3,6]],base);
 // helle Schnauze, zur Stirn hin auslaufend
 poly(c,[[7.6,-3.1+st*.2],[tip-1.4,-2.9],[tip,-1.9],[tip+.2,.2],[tip-.7,2],[tip-3,3.1],[7.4,3.6],[6.2,.4]],mz);
 poly(c,[[5.4,-2.4],[7.8,-3],[6.6,.6],[7.4,3.4],[4.6,3.4]],mix(base,mz,.5));
 poly(c,[[1,5.2],[6,3.6],[tip-3,3.2],[6.2,4.8],[2,6.7]],shade);// Schatten unterm Kiefer
 seg(c,tip-.5,1.25,7.4,2.3,.55,mix(dark,'#000000',.3));// Maulspalte
 poly(c,[[tip-1.7,-3.1],[tip+.1,-2.2],[tip+.4,-.2],[tip-1.1,-.5]],'#17100c');// Nase
 rr(c,4.3,-3.3,1.5,1.4,'#120c08');rr(c,4.1,-4.3,2.4,.8,shade);// Auge, Braue
 disk(c,-3.2,-6.9,3*e,base);disk(c,-3.1,-6.6,1.7*e,mix(dark,shade,.5));// nahes Ohr
 seg(c,-6.6,2,-7.8,5.4,1,shade);seg(c,-4.6,4.6,-5.6,7.6,1,shade);// Nackenfell
};

// Fell des Europäischen Braunbären: mittel- bis dunkelbraun, hellere Schultern, dunkle Beine
BAER.COATS.brown=[
 {id:'brown',name:'Brown',w:5,base:'#6e4c2f',light:'#927048',shade:'#4d3421',dark:'#2b1c11',muzzle:'#ab8b63',claw:'#d8c8a2'},
 {id:'dark',name:'Dark Brown',w:3,base:'#54392a',light:'#775638',shade:'#3a271c',dark:'#20150e',muzzle:'#927354',claw:'#cdbd98'},
 {id:'golden',name:'Golden Brown',w:2,base:'#8a6338',light:'#b08a55',shade:'#614527',dark:'#352416',muzzle:'#c2a374',claw:'#e0d2ae'},
 {id:'grey',name:'Grey Brown',w:1,base:'#6b5a48',light:'#948169',shade:'#4a3e32',dark:'#2a221b',muzzle:'#ad9a80',claw:'#d8c8a2'}];
})();
