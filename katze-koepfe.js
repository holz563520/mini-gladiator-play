'use strict';
// =====================================================================================================
// ARENA THEORY · KATZEN: Köpfe und Fell je Sorte (gehört zu dist/katze.js, eigenständige Testversion)
// Jede Sorte trägt hier ihren Kopfzeichner (KATZE.HEADS) und ihre Fellfarben (KATZE.COATS) ein.
// Kopf im eigenen Rahmen: Mitte des Schädels bei 0,0, Schnauze zeigt nach +x, oben ist -y. Die Mähne zeichnet katze.js vor dem Kopf.
// =====================================================================================================
(()=>{
const K=window.KATZE,{rr,poly,disk,seg}=K.prim,mix=K.mix;

// ---------------------------------------------------------------- Löwe (Bauart A): großer Schädel, gerader Nasenrücken, stumpfe breite Schnauze,
// kräftiges helles Kinn, runde Ohren weit hinten, bernsteinfarbene Augen
// Mimik (o.f aus katze.js): blink Auge zu (Ohren, Zähne, Gähnen kommen in KA2)
const F0={mouth:0,lip:0,ear:0,blink:0,nose:0};
K.HEADS.lion=(c,D,SH,col,o)=>{const base=col.base,dark=col.dark,shade=col.shade,mz=col.muzzle,e=SH.ear,sn=SH.snout,f=o.f||F0,tip=5.6+7*sn,line='#2a1c16';
 disk(c,-3.8,-6.6,2.5*e,mix(dark,shade,.5));// fernes Ohr
 disk(c,0,0,7.2,base);disk(c,1.6,2.4,5.9,base);// Schädel, Backe
 // Profil: Stirn, gerader Nasenrücken, stumpfe Schnauze, starkes Kinn, Kehle
 poly(c,[[-2,-7],[2.6,-7.1],[5.4,-5.9],[tip-2.2,-3.9],[tip-.2,-3.1],[tip+.3,-1.4],[tip+.1,1.2],[tip-.5,3.3],[tip-2.4,4.7],[5.5,5.7],[0,6.6],[-4,5]],base);
 poly(c,[[5.2,-5.8],[tip-2.2,-3.9],[tip-2.5,-2.9],[4.8,-4.7]],mix(base,shade,.5));// Nasenrücken dunkler
 // helle Schnauze und Kinn
 poly(c,[[tip-5.8,-1],[tip-1.8,-2.4],[tip+.2,-1.3],[tip+.1,1.2],[tip-.5,3.2],[tip-2.4,4.5],[tip-6.2,4.3],[tip-7.2,1.6]],mz);
 poly(c,[[tip-6.4,3.3],[tip-.6,2.7],[tip-.5,3.3],[tip-2.4,4.7],[tip-6,4.6]],mix(mz,shade,.4));// Unterlippe im Schatten
 seg(c,tip-.1,1.4,tip-2.2,2.3,.5,line);seg(c,tip-2.2,2.3,tip-6.2,2.7,.5,line);// Maulspalte
 poly(c,[[tip-2,-3.7],[tip-.1,-3],[tip+.45,-1.3],[tip-1,-1.15]],col.nose);// Nasenspiegel
 for(let i=0;i<3;i++)rr(c,tip-2.6-i*1.25,.1+i*.3,.6,.5,'#6a5038');// Tasthaarpunkte
 seg(c,tip-3,.6,tip-9,2.6,.3,'#f1eada');seg(c,tip-3.4,.2,tip-9,.4,.3,'#f1eada');// Schnurrhaare
 poly(c,[[3.2,-2.1],[6.4,-2.6],[6.2,-1.3],[3.8,-1]],mix(base,mz,.5));// heller Fleck unterm Auge
 // Auge: dunkle Höhle, bernsteinfarbene Iris, Pupille vorn; darüber die Braue als dunkle Zeile
 rr(c,3.4,-4.2,3,2.2,'#20160f');if(f.blink<.5){rr(c,3.6,-3.9,1.6,1.2,col.eye);rr(c,5,-3.9,1,1.2,'#120c08');}
 rr(c,2.6,-5.4,4,1,mix(base,shade,.7));
 disk(c,-2,-6.9,2.9*e,base);disk(c,-1.9,-6.6,1.7*e,mix(mz,shade,.55));// nahes Ohr
 seg(c,-3.9,-8.6,-4.6,-5.6,.9*e,mix(dark,'#000000',.2));// schwarzer Rand hinten am Ohr
};

// Fell des Berberlöwen (Grundfarben der ersten Fassung vom Löwen aus 1.0, dist/lion.js: skin, shade, dark): graugelb, Mähne dunkel bis schwarz über Schultern, Brust und Bauch, heller ums Gesicht
K.COATS.barbary=[
 {id:'dark',name:'Dark-maned',w:5,base:'#b18a50',light:'#d9be8a',shade:'#7c582f',dark:'#49341f',muzzle:'#efe6d2',nose:'#3b2a22',mane:'#8c6b3d',maneDark:'#33261a',eye:'#c9962e',tuft:'#2a2018'},
 {id:'black',name:'Black-maned',w:3,base:'#ab8c60',light:'#d6c19a',shade:'#876c46',dark:'#544027',muzzle:'#ece3cf',nose:'#33241d',mane:'#5d4628',maneDark:'#1d1712',eye:'#c08f2c',tuft:'#1b1511'},
 {id:'tawny',name:'Tawny-maned',w:2,base:'#bd9a62',light:'#e0cba0',shade:'#977949',dark:'#60482b',muzzle:'#f1e9d6',nose:'#40302a',mane:'#aa8950',maneDark:'#5c4426',eye:'#d09c30',tuft:'#33261a'}];
})();
