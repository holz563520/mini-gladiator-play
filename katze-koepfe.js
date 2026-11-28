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
// Mimik (o.f aus katze.js, KA2): blink Auge zu · ear -1 angelegt … +1 gespitzt · mouth Unterkiefer klappt auf (dreht um das Kiefergelenk) ·
// lip Oberlippe hochgezogen (Zahnfleisch, Schneidezähne, Eckzahn) · nose Falten auf dem Nasenrücken · tongue Zunge schiebt sich vor
const F0={mouth:0,lip:0,ear:0,blink:0,nose:0,tongue:0};
K.HEADS.lion=(c,D,SH,col,o)=>{const base=col.base,dark=col.dark,shade=col.shade,mz=col.muzzle,e=SH.ear,sn=SH.snout,f=o.f||F0,tip=5.6+7*sn,line='#2a1c16',zahn='#f4eedc';
 const eb=Math.max(0,-f.ear),ef=Math.max(0,f.ear),ex=-2.3*eb+.5*ef,ey=2.6*eb-.7*ef,er=1-.22*eb,lip=f.lip||0,lu=lip*1.3;
 const al=(f.mouth||0)*.78,ca=Math.cos(al),sa=Math.sin(al),HX=1.2,HY=3.4,J=(x,y)=>[HX+(x-HX)*ca-(y-HY)*sa,HY+(x-HX)*sa+(y-HY)*ca];
 disk(c,-3.8+ex,-6.6+ey,2.5*e*er,mix(dark,shade,.5));// fernes Ohr
 // Rachen und Zunge (nur bei offenem Maul), dann der Unterkiefer mit hellem Kinn und unterem Eckzahn
 if(al>.04){poly(c,[[2.5,2.4],[tip-.6,1.6],J(tip-.8,2.4),J(2.5,3.6)],'#5a1a1c');
  if(al>.25)poly(c,[J(3.5,2.5),J(tip-3.2,1.6),J(tip-2.4+(f.tongue||0)*1.4,2.3),J(3.5,3.3)],'#c0626a');}
 poly(c,[J(.5,3.2),J(tip-6.2,2.7),J(tip-2.2,2.3),J(tip-.3,1.7),J(tip-.5,3.3),J(tip-2.4,4.7),J(5.5,5.7),J(0,6.6),[-3,5.4]],base);
 poly(c,[J(tip-6.4,3.1),J(tip-2.2,2.3),J(tip-.3,1.7),J(tip-.5,3.3),J(tip-2.4,4.7),J(tip-6,4.6)],mix(mz,shade,.3));
 if(al>.12||lip>.3){const q=J(tip-2.9,2.3);rr(c,q[0],q[1]-1.7,1,1.9,zahn);}
 disk(c,0,0,7.2,base);disk(c,1.6,2.2,5.6,base);// Schädel, Backe
 // Profil des Oberkopfs: Stirn, gerader Nasenrücken, stumpfe Schnauze bis zur Maulspalte
 poly(c,[[-2,-7],[2.6,-7.1],[5.4,-5.9],[tip-2.2,-3.9],[tip-.2,-3.1],[tip+.3,-1.4],[tip+.1,1.4],[tip-2.2,2.3],[tip-6.2,2.7],[3,4.2],[-4,5]],base);
 poly(c,[[5.2,-5.8],[tip-2.2,-3.9],[tip-2.5,-2.9],[4.8,-4.7]],mix(base,shade,.5));// Nasenrücken dunkler
 // Zahnfleisch, Schneidezähne und oberer Eckzahn: sichtbar, wenn die Lippe hochgezogen oder das Maul offen ist
 if(lip>.2||al>.2){rr(c,tip-5.8,1.3-lu*.4,5,1.2,'#8a3a36');rr(c,tip-5.4,2-lu*.3,3.2,.9,zahn);rr(c,tip-1.9,1.5-lu*.3,1,2.7,zahn);}
 // helle Schnauze: ihr unterer Rand ist die Oberlippe, sie hebt sich beim Zähnezeigen
 poly(c,[[tip-5.8,-1],[tip-1.8,-2.4],[tip+.2,-1.3],[tip+.1,1.2-lu],[tip-2.2,2.2-lu],[tip-6.2,2.6-lu*.5],[tip-7.2,1.6]],mz);
 seg(c,tip-.1,1.4-lu,tip-2.2,2.3-lu,.5,line);seg(c,tip-2.2,2.3-lu,tip-6.2,2.7-lu*.5,.5,line);// Maulspalte
 poly(c,[[tip-2,-3.7],[tip-.1,-3],[tip+.45,-1.3],[tip-1,-1.15]],col.nose);// Nasenspiegel
 if((f.nose||0)>.3){const w=mix(base,shade,.85);seg(c,tip-3.2,-3.5,tip-4.1,-2,.4,w);seg(c,tip-4.8,-4.1,tip-5.6,-2.6,.4,w);}// Falten auf dem Nasenrücken
 for(let i=0;i<3;i++)rr(c,tip-2.6-i*1.25,.1+i*.3-lu*.6,.6,.5,'#6a5038');// Tasthaarpunkte
 seg(c,tip-3,.6-lu*.6,tip-9,2.6-lu*.3,.3,'#f1eada');seg(c,tip-3.4,.2-lu*.6,tip-9,.4-lu*.3,.3,'#f1eada');// Schnurrhaare
 poly(c,[[3.2,-2.1],[6.4,-2.6],[6.2,-1.3],[3.8,-1]],mix(base,mz,.5));// heller Fleck unterm Auge
 // Auge: dunkle Höhle, bernsteinfarbene Iris, Pupille vorn; darüber die Braue als dunkle Zeile (senkt sich beim Drohen)
 rr(c,3.4,-4.2,3,2.2,'#20160f');if(f.blink<.5){rr(c,3.6,-3.9,1.6,1.2,col.eye);rr(c,5,-3.9,1,1.2,'#120c08');}
 rr(c,2.6,-5.4+(lip>.5?.8:0),4,1,mix(base,shade,.7));
 disk(c,-2+ex,-6.9+ey,2.9*e*er,base);disk(c,-1.9+ex,-6.6+ey,1.7*e*er,mix(mz,shade,.55));// nahes Ohr
 seg(c,-3.9+ex,-8.6+ey+eb,-4.6+ex,-5.6+ey,.9*e,mix(dark,'#000000',.2));// schwarzer Rand hinten am Ohr
};

// Löwe von vorn (KA2b, für das Wenden über die Vorderansicht): breiter Schädel, runde Ohren links und rechts, breiter gerader Nasenrücken,
// zwei helle Schnurrhaarkissen, helles Kinn, bernsteinfarbene Augen. Die Mähne steht als Kranz dahinter (zeichnet katze.js).
// o.yaw -1…1: Schnauze, Nase und Augen rücken zu der Seite, in die der Kopf gerade schaut (Dreiviertelansicht), das ferne Ohr wird kleiner.
// o.pitch: Kopf gesenkt (negativ) schiebt die Schnauze tiefer. Mimik wie in der Seitenansicht (Maul, Lippe, Ohren, Blinzeln, Nasenfalten, Zunge).
K.HEADS_FRONT.lion=(c,D,SH,col,o)=>{const base=col.base,dark=col.dark,shade=col.shade,mz=col.muzzle,e=SH.ear,f=o.f||F0,m=f.mouth||0,lp=f.lip||0,eb=Math.max(0,-f.ear),ef=Math.max(0,f.ear),line='#2a1c16',zahn='#f4eedc';
 const yw=Math.max(-1,Math.min(1,o.yaw||0)),mx=yw*3.2,ex=yw*2,dn=Math.max(0,Math.min(2,-(o.pitch||0)*4)),my=2.2+dn,pd=2.5+.5*SH.snout,h=m>=.03?1+5.4*m:0,lu=lp*1.1;
 const ear=sd=>{const far=sd*yw<0?1-.28*Math.abs(yw):1,x=sd*(5.7+1.5*eb)-yw*1.3,y=-6.3+2.4*eb-.5*ef;disk(c,x,y,2.9*e*far,base);disk(c,x-sd*.3,y+.5,1.7*e*far,mix(mz,shade,.55));rr(c,x+sd*1.6*e*far-.4,y-1.4,.9,2.2,mix(dark,'#000000',.2));};
 ear(yw>0?-1:1);ear(yw>0?1:-1);// fernes Ohr zuerst
 poly(c,[[-5.8,-6.2],[5.8,-6.2],[8,-1.6],[7.6,3],[4.8,6.4],[-4.8,6.4],[-7.6,3],[-8,-1.6]],base);disk(c,0,-1,7.6,base);// Schädel und Backen
 poly(c,[[-7.2,3.6],[-4.6,6.4],[4.6,6.4],[7.2,3.6],[4.8,5.4],[-4.8,5.4]],mix(base,shade,.6));// Schatten unter den Backen
 poly(c,[[ex-2,-5],[ex+2,-5],[mx+2.3,my-2.2],[mx-2.3,my-2.2]],mix(base,shade,.4));// breiter Nasenrücken
 if((f.nose||0)>.3){const w=mix(base,shade,.9);rr(c,(ex+mx)/2-1.9,(my-7)/2,3.8,.5,w);rr(c,(ex+mx)/2-1.6,(my-7)/2+1.2,3.2,.5,w);}// Falten auf dem Nasenrücken
 for(const sd of [-1,1]){const x=ex+sd*3.6;poly(c,[[x-1.5,-1.9],[x+1.5,-1.9],[x+sd*1.2+1,-.5],[x+sd*1.2-1,-.5]],mix(base,mz,.5));}// helle Flecken unter den Augen
 // Unterkiefer mit hellem Kinn: klappt nach unten auf; darüber Rachen, Zunge und untere Eckzähne
 if(h){rr(c,mx-3,my+1,6,h+.6,'#5a1a1c');if(m>.25)rr(c,mx-1.6,my+1+h*.45,3.2,h*.6,'#c0626a');if(m>.5&&(f.tongue||0)>.3)rr(c,mx-1.2,my+1+h,2.4,1,'#c0626a');
  rr(c,mx-2.7,my+h-.4,.9,1.4,zahn);rr(c,mx+1.8,my+h-.4,.9,1.4,zahn);}
 poly(c,[[mx-3.2,my+.8+h],[mx+3.2,my+.8+h],[mx+2.4,my+3.6+h],[mx-2.4,my+3.6+h]],mix(mz,shade,.25));rr(c,mx-1.8,my+1.6+h,3.6,1.4,mz);// Kinn
 // Zahnfleisch, Schneidezähne und obere Eckzähne: sichtbar, wenn die Lippe hochgezogen oder das Maul offen ist
 if(lp>.2||m>.2){rr(c,mx-2.8,my+.4-lu*.5,5.6,1.2+lu*.5,'#8a3a36');rr(c,mx-1.5,my+.9-lu*.3,3,.8,zahn);rr(c,mx-2.9,my+.6-lu*.3,1,2.2+1.4*Math.max(m,lp*.6),zahn);rr(c,mx+1.9,my+.6-lu*.3,1,2.2+1.4*Math.max(m,lp*.6),zahn);}
 // helle Schnauze: zwei Schnurrhaarkissen, ihr unterer Rand ist die Oberlippe (hebt sich beim Zähnezeigen)
 disk(c,mx-2.3,my-.3-lu*.5,pd,mz);disk(c,mx+2.3,my-.3-lu*.5,pd,mz);
 poly(c,[[mx-2.3,my-2.6],[mx+2.3,my-2.6],[mx+1.1,my-.7],[mx-1.1,my-.7]],col.nose);// Nasenspiegel
 rr(c,mx-.3,my-.7,.6,1.5-lu*.5,line);if(!h&&lp<.2){rr(c,mx-2.4,my+.8,4.8,.5,line);}// Spalte unter der Nase, Maulspalte
 for(const sd of [-1,1]){for(let i=0;i<2;i++)rr(c,mx+sd*(1.9+i*1.2)-.3,my-.4+i*.4-lu*.5,.6,.5,'#6a5038');// Tasthaarpunkte, Schnurrhaare
  seg(c,mx+sd*3.4,my-.2-lu*.5,mx+sd*9.2,my+1.4-lu*.3,.3,'#f1eada');seg(c,mx+sd*3.6,my-.8-lu*.5,mx+sd*9.4,my-1-lu*.3,.3,'#f1eada');}
 // Augen: dunkle Höhle, bernsteinfarbene Iris, Pupille in der Mitte; darüber die Braue (senkt sich beim Drohen)
 for(const sd of [-1,1]){const x=ex+sd*3.7-1.3;rr(c,x,-4,2.6,2,'#20160f');if(f.blink<.5){rr(c,x+.3,-3.7,2,1.3,col.eye);rr(c,x+.9+yw*.5,-3.7,.8,1.3,'#120c08');}
  rr(c,x-.4,-5.1+(lp>.5?.8:0),3.4,.9,mix(base,shade,.7));}
};

// Fell des Berberlöwen (Grundfarben der ersten Fassung vom Löwen aus 1.0, dist/lion.js: skin, shade, dark): graugelb, Mähne dunkel bis schwarz über Schultern, Brust und Bauch, heller ums Gesicht
K.COATS.barbary=[
 {id:'dark',name:'Dark-maned',w:5,base:'#b18a50',light:'#d9be8a',shade:'#7c582f',dark:'#49341f',muzzle:'#efe6d2',nose:'#3b2a22',mane:'#8c6b3d',maneDark:'#33261a',eye:'#c9962e',tuft:'#2a2018'},
 {id:'black',name:'Black-maned',w:3,base:'#ab8c60',light:'#d6c19a',shade:'#876c46',dark:'#544027',muzzle:'#ece3cf',nose:'#33241d',mane:'#5d4628',maneDark:'#1d1712',eye:'#c08f2c',tuft:'#1b1511'},
 {id:'tawny',name:'Tawny-maned',w:2,base:'#bd9a62',light:'#e0cba0',shade:'#977949',dark:'#60482b',muzzle:'#f1e9d6',nose:'#40302a',mane:'#aa8950',maneDark:'#5c4426',eye:'#d09c30',tuft:'#33261a'}];
})();
