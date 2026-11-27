'use strict';
// =====================================================================================================
// ARENA THEORY · BÄREN: Köpfe und Fell je Sorte (gehört zu dist/baer.js, eigenständige Testversion)
// Jede Sorte trägt hier ihren Kopfzeichner (BAER.HEADS) und ihre Fellfarben (BAER.COATS) ein.
// Kopf im eigenen Rahmen: Mitte des Schädels bei 0,0, Schnauze zeigt nach +x, oben ist -y.
// =====================================================================================================
(()=>{
const BAER=window.BAER,{rr,poly,disk,seg,push,pop}=BAER.prim,mix=BAER.mix;

// ---------------------------------------------------------------- Braunbär (Bauart G): breiter Schädel, eingedelltes Profil, kleine runde Ohren, helle Schnauze
// Mimik (o.f aus baer.js): mouth Maul auf (0–1) · lip Lefzen gehoben · ear Ohren (-1 angelegt … 1 nach vorn) · blink Auge zu · nose Nase zuckt
const F0={mouth:0,lip:0,ear:0,blink:0,nose:0};
BAER.HEADS.br=(c,D,SH,col,o)=>{const base=col.base,dark=col.dark,shade=col.shade,mz=col.muzzle,e=SH.ear,sn=SH.snout,st=SH.stop,f=o.f||F0,m=f.mouth,lp=f.lip,eb=Math.max(0,-f.ear),ef=Math.max(0,f.ear);
 const tip=6.4+8*sn,tooth='#e8dcc0';// Nasenspitze
 disk(c,-4.4-1.4*eb+.5*ef,-6.6+1.6*eb-.3*ef,2.7*e*(1-.2*eb),mix(dark,shade,.4));// fernes Ohr
 disk(c,-1.2,3.2,7.2,base);// Backen, Wamme
 disk(c,0,0,7.9,base);// Schädel
 // Stirn mit Absatz, Nasenrücken, Schnauze, Unterkiefer
 poly(c,[[-1,-7.6],[3.4,-7.1],[5.6,-5.4-st*.5],[7,-3.5+st*.25],[tip-1.4,-3],[tip,-2],[tip+.3,.2],[tip-.6,2.2],[tip-3,3.4],[6,4.6],[2,6.6],[-3,6]],base);
 // helle Schnauze, zur Stirn hin auslaufend
 poly(c,[[7.6,-3.1+st*.2],[tip-1.4,-2.9],[tip,-1.9],[tip+.2,.2],[tip-.7,2],[tip-3,3.1],[7.4,3.6],[6.2,.4]],mz);
 poly(c,[[5.4,-2.4],[7.8,-3],[6.6,.6],[7.4,3.4],[4.6,3.4]],mix(base,mz,.5));
 if(m<.03){poly(c,[[1,5.2],[6,3.6],[tip-3,3.2],[6.2,4.8],[2,6.7]],shade);// Schatten unterm Kiefer
  seg(c,tip-.5,1.25,7.4,2.3,.55,mix(dark,'#000000',.3));}// Maulspalte
 else{// Maul offen: Rachen, dann der Unterkiefer, um das Kiefergelenk gedreht
  const jx0=5.4,jy0=2.6,an=m*.78,jl=tip-1.2-jx0,ca=Math.cos(an),sa=Math.sin(an),X=(x,y)=>jx0+x*ca-y*sa,Y=(x,y)=>jy0+x*sa+y*ca;
  poly(c,[[jx0-1,jy0-.9],[tip-.6,1.05],[tip-.5,2.3],[X(jl,-1.2),Y(jl,-1.2)],[X(0,1.4),Y(0,1.4)]],'#3a1512');
  poly(c,[[jx0+1.5,jy0-.2],[tip-2.6,1.5],[X(jl-2.4,-.9),Y(jl-2.4,-.9)],[X(1.5,.4),Y(1.5,.4)]],'#6e2a25');
  push(jx0,jy0,an);// Unterkiefer im eigenen Rahmen, bleibt im Raster
  if(m>.4)poly(c,[[1.4,-.5],[jl-2.2,-1.5],[jl-.9,-1.25],[jl-1.6,-.5],[1.6,.6]],'#b65c53');// Zunge
  poly(c,[[-1.6,-.3],[jl,-1.05],[jl+.5,.5],[jl-2.6,1.6],[.6,2.4],[-3.4,2.5]],mix(base,mz,.55));poly(c,[[jl-4.6,-.72],[jl,-1.05],[jl+.5,.5],[jl-2.6,1.6]],mz);
  poly(c,[[-3.2,1.6],[.6,1.6],[jl-2.6,.9],[jl-2.6,1.6],[.6,2.4],[-3.4,2.5]],shade);
  poly(c,[[jl-2.3,-.95],[jl-1.3,-1.05],[jl-1.7,-2.6]],tooth);rr(c,jl-.9,-1.6,.7,.7,tooth);rr(c,jl-4.6,-1.25,1.6,.6,tooth);// Eckzahn unten, Schneidezahn, Backenzähne
  pop();}
 if(lp>.03){// Lefze gehoben: Zahnfleisch, Zähne, Falten auf dem Nasenrücken
  poly(c,[[tip-5,2],[tip-.7,1.15],[tip-.6,1.1-1.3*lp],[tip-4.8,1.9-1.2*lp]],'#6a2420');rr(c,tip-4.6,1.9-.9*lp,1.5,.2+.8*lp,tooth);rr(c,tip-1.5,1.2-.8*lp,.8,.2+.7*lp,tooth);
  if(lp>.3){seg(c,tip-3.4,-3,tip-3.9,-1.5,.5,shade);seg(c,tip-5,-3,tip-5.6,-1.4,.5,shade);}}
 if(m>=.03||lp>.03)poly(c,[[tip-3.1,1.55-.9*lp],[tip-1.9,1.3-.9*lp],[tip-2.3,3.2]],tooth);// Eckzahn oben
 poly(c,[[tip-1.7,-3.1+f.nose],[tip+.1,-2.2+f.nose],[tip+.4,-.2+f.nose*.5],[tip-1.1,-.5+f.nose*.5]],'#17100c');// Nase
 if(f.blink>.5)rr(c,4.2,-2.6,1.8,.5,dark);else rr(c,4.3,-3.3,1.5,1.4,'#120c08');rr(c,4.1,-4.3+.6*lp,2.4,.8+.3*lp,shade);// Auge, Braue
 disk(c,-3.2-1.8*eb+.6*ef,-6.9+2*eb-.3*ef,3*e*(1-.2*eb),base);disk(c,-3.1-1.8*eb+.7*ef,-6.6+2*eb-.3*ef,1.7*e*(1-.3*eb),mix(dark,shade,.5));// nahes Ohr
 seg(c,-6.6,2,-7.8,5.4,1,shade);seg(c,-4.6,4.6,-5.6,7.6,1,shade);// Nackenfell
};

// Braunbär von vorn (für das Wenden über die Vorderansicht): breiter Schädel, Ohren links und rechts, helle Schnauze in der Mitte.
// o.yaw -1…1: Schnauze, Nase und Augen rücken zu der Seite, in die der Kopf gerade schaut (Dreiviertelansicht), das ferne Ohr wird kleiner.
// o.pitch: Kopf gesenkt (negativ) schiebt die Schnauze tiefer. Mimik wie in der Seitenansicht (Maul, Lefzen, Ohren, Blinzeln, Nase).
BAER.HEADS_FRONT.br=(c,D,SH,col,o)=>{const base=col.base,dark=col.dark,shade=col.shade,mz=col.muzzle,e=SH.ear,f=o.f||F0,m=f.mouth,lp=f.lip,eb=Math.max(0,-f.ear),ef=Math.max(0,f.ear),tooth='#e8dcc0';
 const yw=Math.max(-1,Math.min(1,o.yaw||0)),mx=yw*3.4,ex=yw*2.2,dn=Math.max(0,Math.min(2.2,-(o.pitch||0)*4)),my=2.4+dn,sn=3.6+.9*SH.snout;
 const ear=(sd)=>{const far=sd*yw<0?1-.25*Math.abs(yw):1,x=sd*(6+1.2*eb)-yw*1.4,y=-6.3+2.2*eb-.4*ef;disk(c,x,y,3*e*far,base);disk(c,x+sd*-.2,y+.4,1.7*e*far,mix(dark,shade,.5));};
 ear(yw>0?-1:1);ear(yw>0?1:-1);// fernes Ohr zuerst
 poly(c,[[-6.4,-5.6],[6.4,-5.6],[8.6,-1],[8.2,4],[5,7.4],[-5,7.4],[-8.2,4],[-8.6,-1]],base);disk(c,0,-1.4,8.1,base);// Schädel und Backen
 poly(c,[[-7.6,4.4],[-4.6,7.4],[4.6,7.4],[7.6,4.4],[5,6.2],[-5,6.2]],shade);// Schatten unter den Backen
 poly(c,[[ex-1.9,-4.6],[ex+1.9,-4.6],[mx+2.6,my-2.6],[mx-2.6,my-2.6]],mix(base,mz,.45));// Nasenrücken
 disk(c,mx,my,sn,mz);poly(c,[[mx-sn+.6,my],[mx+sn-.6,my],[mx+sn-1.6,my+sn-.2],[mx-sn+1.6,my+sn-.2]],mz);// Schnauze
 if(m>=.03){const h=1+4.4*m;rr(c,mx-2.6,my+1.2,5.2,h,'#3a1512');if(m>.4)rr(c,mx-1.3,my+1.2+h*.5,2.6,h*.5,'#b65c53');// Rachen, Zunge
  rr(c,mx-2.6,my+1.2,1,1+1.3*m,tooth);rr(c,mx+1.6,my+1.2,1,1+1.3*m,tooth);rr(c,mx-2.2,my+.4+h,.9,.9,tooth);rr(c,mx+1.3,my+.4+h,.9,.9,tooth);// Eckzähne oben und unten
  rr(c,mx-3,my+1.2+h,6,1.7,mix(base,mz,.55));}// Unterkiefer
 else{rr(c,mx-.4,my+.4,.9,1.8,mix(dark,'#000000',.3));rr(c,mx-2.2,my+2,4.4,.8,mix(dark,'#000000',.3));}// Maulspalte
 if(lp>.03){rr(c,mx-2.8,my+1,5.6,.4+1*lp,'#6a2420');rr(c,mx-2.6,my+1.2,5.2,.3+.7*lp,tooth);rr(c,mx-2.7,my+1.2,1,.8+1.2*lp,tooth);rr(c,mx+1.7,my+1.2,1,.8+1.2*lp,tooth);
  if(lp>.3){rr(c,mx-2,my-3.2,.6,1.4,shade);rr(c,mx+1.4,my-3.2,.6,1.4,shade);}}
 rr(c,mx-1.7,my-2+f.nose*.5,3.4,2.2,'#17100c');rr(c,mx-.9,my+.1+f.nose*.5,1.8,.7,'#17100c');// Nase
 for(const sd of [-1,1]){const x=ex+sd*3.9-.7;if(f.blink>.5)rr(c,x-.2,-2.5,1.8,.5,dark);else rr(c,x,-3.2,1.4,1.4,'#120c08');rr(c,x-.5,-4.3+.6*lp,2.4,.8+.3*lp,shade);}// Augen, Brauen
};

// Fell des Europäischen Braunbären: mittel- bis dunkelbraun, hellere Schultern, dunkle Beine
BAER.COATS.brown=[
 {id:'brown',name:'Brown',w:5,base:'#6e4c2f',light:'#927048',shade:'#4d3421',dark:'#2b1c11',muzzle:'#ab8b63',claw:'#d8c8a2'},
 {id:'dark',name:'Dark Brown',w:3,base:'#54392a',light:'#775638',shade:'#3a271c',dark:'#20150e',muzzle:'#927354',claw:'#cdbd98'},
 {id:'golden',name:'Golden Brown',w:2,base:'#8a6338',light:'#b08a55',shade:'#614527',dark:'#352416',muzzle:'#c2a374',claw:'#e0d2ae'},
 {id:'grey',name:'Grey Brown',w:1,base:'#6b5a48',light:'#948169',shade:'#4a3e32',dark:'#2a221b',muzzle:'#ad9a80',claw:'#d8c8a2'}];
})();
