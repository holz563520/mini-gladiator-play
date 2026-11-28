'use strict';
// =====================================================================================================
// ARENA THEORY · STIERE UND OCHSEN: Köpfe (Seite und vorn), Hörner und Fell je Rasse (gehört zu dist/stier.js, eigenständige Testversion)
// Jede Rasse trägt hier ihren Kopf von der Seite (STIER.HEADS), ihren Kopf von vorn (STIER.HEADS_FRONT) und ihre Fellfarben (STIER.COATS) ein.
// Seite: Mitte des Schädels bei 0,0, das Maul zeigt nach +x, oben (Stirn) ist -y; der Rahmen dreht sich mit dem Kopf.
// Vorn: Mitte zwischen den Augen bei 0,0, oben ist -y. Die Hörner sind in beiden Ansichten dieselbe räumliche Kurve (o.horn aus STIER.hornCurve).
// Mimik (ST2, o.f): ear −1 angelegt … +1 gespitzt · nost geblähte Nüstern · white Augenweiß · blink Lid zu. Beim Wenden (ST2) gibt der Kern dem Kopf von vorn
// o.yc (Kopf schaut zur Seite, −0,5 … 0,5), o.q (Breite der Hörner) und o.pitch (Kopf gesenkt: negativ) mit.
// =====================================================================================================
(()=>{
const S=window.STIER,{rr,poly,disk,seg}=S.prim,mix=S.mix,horn=S.drawHorn,F0={ear:0,nost:0,white:0,blink:0};
const rot=(pts,cx,cy,an)=>{const co=Math.cos(an),si=Math.sin(an);return pts.map(([x,y])=>[cx+(x-cx)*co-(y-cy)*si,cy+(x-cx)*si+(y-cy)*co]);};

// ---------------------------------------------------------------- Spanischer Kampfstier (Bauart A): kurzer breiter Kopf, breite Stirn mit Locken, gerades Profil,
// breites dunkles Flotzmaul, kleine Ohren seitlich unter den Hörnern, kurze kräftige Haken: erst zur Seite, dann nach vorn und oben, hell mit schwarzer Spitze
S.HEADS.lidia=(c,D,SH,col,o)=>{const base=col.base,light=col.light,shade=col.shade,dark=col.dark,e=SH.ear,tip=7+9*SH.face,th=3.7*SH.hornThick,line=col.nose,f=o.f||F0,ea=.5*f.ear,ns=1+.7*f.nost;
 const X=(s,ax)=>(f,u,l)=>ax+o.hornX(s)(f,u,l),Y=(s,ay)=>(f,u,l)=>ay+o.hornY(s)(f,u,l);
 // fernes Ohr und fernes Horn (dunkler, leicht versetzt)
 poly(c,rot([[-1.6,-5.6],[-7.4*e,-7.6],[-8.6*e,-6],[-5.4*e,-4.4],[-1.6,-4]],-1.6,-4.8,ea),mix(shade,dark,.5));
 horn(c,o.horn,X(-1,-.2),Y(-1,-6),th,mix(col.horn,shade,.38),mix(col.hornTip,shade,.2));
 // Schädel, Backe, Profil: Stirn, gerader Nasenrücken, stumpfes Maul, Kinn, Ganasche
 disk(c,0,0,6.6,base);disk(c,1.2,1.8,5.6,base);
 poly(c,[[-3,-6.2],[3,-6.7],[8,-5.3],[tip-2.6,-3.7],[tip-.2,-2.3],[tip+.3,1.5],[tip-1.6,3.6],[tip-6,3.9],[4,6.2],[-1,6.7],[-5.2,4.6],[-5.8,-2]],base);
 poly(c,[[3.2,-6.5],[8,-5.2],[tip-2.8,-3.6],[tip-3.4,-2.5],[7.4,-4.1],[3,-5.2]],mix(base,light,.5));// Licht auf Stirn und Nasenrücken
 poly(c,[[4,6],[tip-6,3.8],[tip-6.4,2.6],[3,4.6],[-2,5.4],[-1,6.6]],mix(base,shade,.6));// Schatten unter der Ganasche
 // Flotzmaul: breit, feucht, etwas heller als das Fell; Nüster und Maulspalte
 poly(c,[[tip-3.6,-3.1],[tip-.2,-2.3],[tip+.3,1.5],[tip-1.6,3.5],[tip-4,3]],col.muzzle);
 rr(c,tip-1.9-.5*(ns-1),-1.5-.5*(ns-1),1.5*ns,1.3*ns,line);rr(c,tip-2.4-(ns-1),-1,.7,.7,line);seg(c,tip+.1,1.9,tip-5,2.7,.45,line);
 rr(c,tip-.6,-2,.7,.6,mix(col.muzzle,'#ffffff',.25));// Glanz
 // Auge: dunkel, mit hellem Rand vorn und einem Glanzpunkt; darüber der Brauenwulst
 rr(c,3.2,-4.5,3.2,2.5,mix(base,light,.62));
 if(f.blink)seg(c,3.4,-3.2,6,-3.1,.6,mix(base,shade,.6));
 else{if(f.white>.25){rr(c,3.3,-4.3,1.2,2,'#e9e1cc');rr(c,3.4,-4.4,2.8,.6,'#e9e1cc');}rr(c,3.6+.6*f.white,-4.1+.3*f.white,2.3,1.7,col.eye);rr(c,5,-4,.7,.7,'#d6c9aa');}
 seg(c,2.6,-5+.4*f.white,6.4,-4.7-.3*f.white,.6,mix(base,shade,.5));
 // Stirnlocken zwischen den Hörnern
 disk(c,1.2,-6.6,1.6,col.tuft);disk(c,3.4,-6.9,1.4,mix(col.tuft,light,.3));disk(c,-.8,-6.8,1.5,mix(col.tuft,light,.2));
 // nahes Horn (Ansatz am Hinterhaupt), danach das nahe Ohr darunter
 disk(c,-1.6,-5.3,th*.62,mix(col.horn,shade,.3));horn(c,o.horn,X(1,-1.6),Y(1,-5.3),th,col.horn,col.hornTip);
 poly(c,rot([[-2.4,-4.4],[-9.4*e,-4.4],[-10.6*e,-2.8],[-7*e,-1.3],[-2.6,-1.9]],-2.5,-3.2,ea),mix(base,light,.22));
 poly(c,rot([[-4,-3.7],[-9*e,-3.6],[-7.2*e,-2.2],[-4,-2.6]],-2.5,-3.2,ea),mix(shade,'#7a5548',.42));
};

// Kopf von vorn: breite Stirn, die Augen sitzen seitlich, das Gesicht verjüngt sich zum breiten Flotzmaul; Ohren waagerecht unter den Hörnern
S.HEADS_FRONT.lidia=(c,D,SH,col,o)=>{const base=col.base,light=col.light,shade=col.shade,dark=col.dark,e=SH.ear,th=3.7*SH.hornThick,f=o.f||F0,ea=1.6*f.ear,ns=1+.6*f.nost;
 // gesenkter Kopf (pitch negativ): das Gesicht verkürzt sich, die Hornspitzen kommen nach vorn unten; yc: Tiefe der Hörner beim seitlichen Blick
 const d=-(o.pitch||0),yc=o.yc||0,q=o.q===undefined?1:o.q,cd=Math.cos(d),sd=Math.sin(d),F=SH.face*Math.max(.5,Math.min(1.12,1-.55*d)),y=v=>v>0?v*F:v;
 for(const s of [-1,1]){// Ohren, dann Hörner (hinter dem Schädel)
  poly(c,[[s*6.6,-6.2],[s*(8+5.6*e),-7-ea],[s*(8+6.8*e),-5.4-ea],[s*(8+3.6*e),-3.4-.4*ea],[s*7,-3.4]],mix(base,light,.16));
  poly(c,[[s*8,-5.6],[s*(8+5*e),-6.1-ea],[s*(8+3.6*e),-4.3-.5*ea],[s*8,-4.3]],mix(shade,'#7a5548',.3));
  horn(c,o.horn,(f,u,l)=>s*q*(5.4+l)+yc*f,(f,u,l)=>-8.6-u*cd+f*sd,th,col.horn,col.hornTip);}
 poly(c,[[-6.6,-9.6],[6.6,-9.6],[8.7,-3.6],[7.5,y(2)],[5.7,y(7.5)],[5.4,y(12)],[3.7,y(13.7)],[-3.7,y(13.7)],[-5.4,y(12)],[-5.7,y(7.5)],[-7.5,y(2)],[-8.7,-3.6]],base);
 poly(c,[[-2.6,-5],[2.6,-5],[3,y(7)],[-3,y(7)]],mix(base,light,.34));// Nasenrücken
 poly(c,[[-8.6,-3.4],[-5.6,-2.4],[-4.6,y(6.5)],[-5.7,y(7.5)],[-7.5,y(2)]],mix(base,light,.16));poly(c,[[8.6,-3.4],[5.6,-2.4],[4.6,y(6.5)],[5.7,y(7.5)],[7.5,y(2)]],mix(base,light,.16));// Wangen
 poly(c,[[-5.3,y(7.4)],[5.3,y(7.4)],[5.5,y(11.8)],[3.7,y(13.7)],[-3.7,y(13.7)],[-5.5,y(11.8)]],col.muzzle);
 seg(c,-3.3,y(12.5),3.3,y(12.5),.45,col.nose);rr(c,-.3,y(9),.6,3.4*F,mix(col.muzzle,col.nose,.6));
 for(const s of [-1,1]){rr(c,s*2.7-1.1*ns,y(9)-.4*(ns-1),2.2*ns,1.6*ns,col.nose);
  rr(c,s*6.9-1.5,-4.1,3,2.5,mix(base,light,.62));
  if(f.blink)seg(c,s*6.9-1.2,-2.9,s*6.9+1.2,-2.9,.6,mix(base,shade,.6));
  else{if(f.white>.25)rr(c,s*6.9-1.4+s*.5,-4,2.8,2.2,'#e9e1cc');rr(c,s*6.9-1.1-s*.5*f.white,-3.7,2.2,1.7,col.eye);rr(c,s*6.9-.4+s*.5,-3.6,.7,.7,'#d6c9aa');}
  seg(c,s*4.6,-4.9,s*8.6,-4.5-.4*f.white,.6,mix(base,shade,.5));
  disk(c,s*q*5.4,-8.6,th*.6,mix(col.horn,shade,.3));}
 for(let i=0;i<7;i++){const h=S.prim.hrand(i*4.7+D.seed%100);disk(c,-4.8+i*1.6,-8.4+h*1.6,1.5,i%2?col.tuft:mix(col.tuft,light,.28));}// Stirnlocken
};

// Fell des Spanischen Kampfstiers: meist schwarz, selten dunkelbraun oder gestromt; Hörner hell mit schwarzer Spitze
S.COATS.lidia=[
 {id:'negro',name:'Black',w:7,base:'#2b2622',light:'#4d443a',shade:'#1d1916',dark:'#100d0b',muzzle:'#403832',nose:'#0b0908',horn:'#e8dfc6',hornTip:'#17120f',eye:'#1c110b',tuft:'#0f0c0a',hoof:'#14100d'},
 {id:'castano',name:'Dark Brown',w:2,base:'#4c3123',light:'#735037',shade:'#33201a',dark:'#1b110d',muzzle:'#2f2622',nose:'#0f0b09',horn:'#e6dbbe',hornTip:'#1a1410',eye:'#1c110b',tuft:'#1c120d',hoof:'#18120e'},
 {id:'chorreado',name:'Brindle',w:1,pattern:'brindle',base:'#5c3c27',light:'#80593c',shade:'#3c2519',dark:'#120c09',muzzle:'#2f2622',nose:'#0f0b09',horn:'#e6dbbe',hornTip:'#1a1410',eye:'#1c110b',tuft:'#160f0b',hoof:'#18120e'}];
})();
