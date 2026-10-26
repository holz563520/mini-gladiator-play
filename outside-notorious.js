'use strict';
/* =====================================================================================================
   PLÜNDERUNGEN · DIE BERÜCHTIGTEN (20 Anführer mit eigenem Aussehen)
   Jeder Bandenanführer einer Plünderung ist einer von 20 Berüchtigten: ein extremes Kennzeichen (der Zahnlose,
   der Verbrannte, der Gehängte …), eigene Texte für die Vorstellung (Opferzahl, Waffe, warum berüchtigt, schwarzer
   Humor), eigener Wortwechsel vor dem Kampf, eigene Rufe. Das Aussehen steckt teils in den echten Figurenwerten
   (Größe, Gewicht, Haut, Haar, Bart, Zähne, fehlende Hand), teils in Zeichnungen:
   · im Kampfbild über M.figureDecor (Haken in arena.js, Figurenkoordinaten, Blick nach +x, Kopf head.x/head.y),
   · in jeder Großaufnahme über M.faceOverlays[g.id] (face-shots.js, Gesichtskoordinaten, 0,0 = Kopfmitte unten).
   Reine Daten und Darstellung, ohne DOM (läuft auch headless in Node). Spielregeln: outside-core.js (D.leader).
   ===================================================================================================== */
(()=>{
const M=window.MG;if(!M)return;
const N=window.DebtNotorious={};M.outsideNotorious=N;
const pick=(r,l)=>l[Math.floor(r()*l.length)];
const A={mix(a,b,t){const p=s=>[1,3,5].map(i=>parseInt(String(s).slice(i,i+2),16)||0),x=p(a),y=p(b);return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,'0')).join('');}};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;

// ---------- Zeichenhilfen ----------
// Kampfbild: rect(x,y,w,h,c) in Figurenpixeln (ganzzahlig). Großaufnahme: Q(x,y,w,h,c) in Gesichtskoordinaten.
function Q(c,fm){const s=fm.s;return (x,y,w,h,col)=>{const p=fm.to(x,y);c.fillStyle=col;c.fillRect(Math.round(p.x),Math.round(p.y),Math.max(1,Math.ceil(w*s)),Math.max(1,Math.ceil(h*s)));};}
// gefüllte Pixel-Ellipse in Gesichtskoordinaten
function QE(q,x,y,rx,ry,col){for(let yy=-ry;yy<=ry;yy++){const w=rx*Math.sqrt(Math.max(0,1-(yy/(ry+.5))**2));if(w>.3)q(x-w,y+yy,w*2,1,col);}}
// dicke Linie aus Pixeln (Gesichtskoordinaten)
function QL(q,x0,y0,x1,y1,w,col){const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)));for(let i=0;i<=n;i++){const k=i/n;q(x0+(x1-x0)*k-w/2,y0+(y1-y0)*k-w/2,w,w,col);}}
const inSkull=(x,y)=>((x)/27)**2+((y+29)/35)**2<1;
// Vollbart in der Großaufnahme: folgt Wangen und Kiefer, Mund bleibt frei, senkrechte Strähnen, ausgefranster Rand. len: so weit reicht er nach unten
function beard(q,c,len=26,o={}){const [base,dark,light]=c;for(let y=-24;y<len;y++){const jag=Math.round(Math.sin(y*1.7)*1.2),
  w=y<-12?0:y<2?25.5-(y+12)*.12:Math.max(4,24-(y-2)*(18/Math.max(8,len-2)));
  const row=(x0,x1)=>{for(let x=Math.round(x0);x<x1;x++){const st=hash(x*3,5),v=Math.sin(y*.5+st*9)+st*1.6;q(x,y,1,1,v>1.4?light:v<-.2?dark:base);}};
  if(y<-12){const sw=4+(y+24)*.9;row(-28,-28+sw);row(28-sw,28);}else row(-w-jag,w+jag);}
 q(-13,-16,26,4,c[0]);for(let x=-13;x<13;x+=2)q(x,-16,1,4,c[1]);q(-15,-14,6,3,c[1]);q(9,-14,6,3,c[1]);
 if(!o.noMouth){q(-7,-11,14,3,'#3a1414');q(-6,-11,12,1,'#7a3a34');q(-5,-9,10,1,'#c8b8a0');}}
const hash=(i,k=1)=>{const v=Math.sin(i*127.1+k*311.7)*43758.5453;return v-Math.floor(v);};

// ---------- Die 20 Berüchtigten ----------
// app: Figurenwerte; wpn: bevorzugte Waffen (eine davon, mit Beinamen nick); fig(a,P,t): Kampfbild; face(q,t,c,fm): Großaufnahme
const T=N.TYPES=[
// 1 ------------------------------------------------------------------------------------------------
{id:'zahnlos',title:'der Zahnlose',crew:'die Zahnlücken',wpn:['mace','club','hammer'],nick:['Zahnfee','Kieferbruch','Mundwerk'],
 app:(g)=>{g.age=Math.max(g.age,52);g.teeth={missing:[0,1,2,3,4,5,6,7],gold:[]};Object.assign(g.appearance,{hair:'#9a958a',style:0,beard:1});},
 kills:'Er zählt nicht mit Strichen, sondern mit Zähnen. Die Kette um seinen Hals reicht inzwischen zweimal herum.',
 why:['Er hat seine eigenen Zähne beim Würfeln verloren und holt sich seitdem fremde zurück. Mit Zinsen.','Er beißt nicht, er lutscht dich zu Tode. Klingt harmlos. Ist es nicht.','Den Zahnarzt von {P} hat er als Erstes besucht. Seitdem gibt es dort keinen mehr. Und keine Zähne.'],
 intro:[['L','Schöne Schähne habt ihr. Wirklich schöne Schähne.'],['P','Bleib, wo du bist, Opa. Du lispelst.'],['L','Daf ift kein Lifpeln. Daf ift Vorfreude. Holt mir ihre Gebiffe, Jungf!']],
 cry:['Die Schähne! Ich will die Schähne!','Mund auf, Schätzchen!'],hurt:['Daf gibt Rache! Mit Schähnen!','Ihr Hunde! Ihr gefunden Hunde!'],
 down:[['L','Endlich … keine … Schahnschmerschen … mehr …'],['P','Die Kette nehmen wir mit. Für den Schmied. Der sammelt Kuriositäten.']],
 fig:(a,P)=>{const {rect,head:h,chest:c,back}=P;if(!back){rect(h.x-2,h.y+8,6,2,'#3a1416');rect(h.x-1,h.y+8,4,1,'#9a4a4a');}
  for(let i=0;i<7;i++){const x=c.x-6+i*2,y=c.y+4+Math.round(Math.sin(i/6*Math.PI)*3);rect(x,y,2,1,'#4a3424');if(!back)rect(x,y+1,1,2,i%3?'#f2ead2':'#d8c8a0');}},
 face:(q,t)=>{QE(q,0,-9,10,3,'#4a1618');q(-8,-11,16,2,'#b8585a');q(-6,-10,12,1,'#d07a76');q(-19,-24,2,12,'#00000028');q(18,-24,2,12,'#00000028');
  for(let i=-8;i<=8;i++){const x=i*3.6,y=7+i*i*.09;q(x-1,y-1,4.5,1,'#4a3424');q(x,y,2.4,4.5,i%3?'#f2ead2':'#d8c8a0');q(x,y,2.4,1,'#fffbe8');}}},
// 2 ------------------------------------------------------------------------------------------------
{id:'verbrannt',title:'der Verbrannte',crew:'die Rußköpfe',wpn:['axe','doubleaxe','mace'],nick:['Zunder','Glutkuss','Fackel'],
 app:(g)=>{Object.assign(g.appearance,{style:0,beard:0,hair:'#2a1c16'});g.scars=[...(g.scars||[]),{part:'head',reason:'Scheunenbrand (eigener)',day:0}];},
 kills:'Die meisten sind verbrannt. Den Rest hat er angezündet, um sicherzugehen.',
 why:['Er ist aus seinem eigenen Scheiterhaufen geklettert und hat den Henker gebeten, das Holz zu bezahlen.','Er riecht nach Rauch. Immer. Auch im Regen. Auch unter Wasser.','Er hat {P} dreimal angezündet. Zweimal aus Versehen. Beim dritten Mal hat es ihm gefallen.'],
 intro:[['L','Kalt heute, oder? Keine Sorge. Mir wird gleich warm.'],['P','Du riechst wie ein Lagerfeuer, in das jemand gepinkelt hat.'],['L','Das war der Letzte, der so geredet hat. Er brennt noch. Los!']],
 cry:['Brennt! Brennt alle!','Ich bring euch Wärme!'],hurt:['Das kitzelt! Ich spür eh nichts mehr!','Mehr! Ich hab Narben, die schlimmer waren!'],
 down:[['L','Endlich … kühl …'],['P','Macht ihm ein Feuer. Er fühlt sich sonst nicht zu Hause.']],
 fig:(a,P,t)=>{const {rect,head:h,back}=P;
  if(back){rect(h.x-7,h.y-8,15,7,'#7a3628');rect(h.x-5,h.y-6,4,2,'#c9705a');rect(h.x+2,h.y-4,3,2,'#a4503e');}
  else{rect(h.x-7,h.y-8,9,7,'#7a3628');rect(h.x-6,h.y-6,4,2,'#c9705a');rect(h.x-2,h.y-4,2,3,'#d88a70');rect(h.x-1,h.y+3,4,5,'#9a4632');rect(h.x,h.y+4,1,2,'#d88a70');rect(h.x-4,h.y+1,3,1,'#5a2418');}
  for(let k=0;k<4;k++){const ph=(t*.45+k/4)%1;rect(h.x-2+Math.sin(ph*6+k)*3,h.y-12-ph*22,2,2,ph<.5?'#8a8a8a99':'#b8b8b855');}},
 face:(q,t)=>{const col=['#5a2418','#7a3628','#8a3a2a','#9a4632','#b05a44','#c9705a','#d88a70'];
  for(let y=-62;y<-3;y+=2)for(let x=-27;x<4;x+=2){if(!inSkull(x,y))continue;const edge=-3+Math.sin(y*.21)*3+Math.sin(y*.07+1)*2;if(x>edge)continue;if(Math.abs(y+33)<3&&x>-22&&x<-10)continue;
   const n=(Math.sin(x*.42+y*.17)+Math.sin(x*.13-y*.31+2)+Math.sin((x+y)*.27))/3,k=clamp(Math.floor((n*.5+.5)*col.length+(hash(x+y*31,7)-.5)*1.4),0,col.length-1);q(x,y,2,2,col[k]);}
  q(-23,-37,14,3,'#6a2a1e');q(-22,-35,12,1,'#a4503e');q(-24,-42,16,3,'#7a3628');
  for(let k=0;k<5;k++){const ph=(t*.4+k/5)%1;QE(q,-14+Math.sin(ph*5+k)*6,-70-ph*40,2+ph*4,1.5+ph*3,`rgba(140,140,140,${(.45*(1-ph)).toFixed(2)})`);}}},
// 3 ------------------------------------------------------------------------------------------------
{id:'glasauge',title:'Glasauge',crew:'die Schielenden',wpn:['long','gladius','spear'],nick:['Augenmaß','Zwinker','Blickfang'],
 app:(g)=>{Object.assign(g.appearance,{style:1,beard:2});g.scars=[...(g.scars||[]),{part:'head',reason:'Auge verwettet',day:0}];},
 kills:'Mit dem gesunden Auge hat er gezielt. Mit dem gläsernen hat er zugesehen.',
 why:['Sein Glasauge hat er einem Händler aus dem Kopf gekauft. Der Händler war noch nicht fertig damit.','Er schaut dich mit dem Glasauge an, während er dich mit dem anderen ersticht. Niemand weiß, welches echt ist. Er auch nicht.','Er nimmt das Auge raus und legt es auf den Tisch, wenn er verhandelt. Er verhandelt selten lange.'],
 intro:[['L','Ich hab ein Auge auf euch geworfen. Wortwörtlich. Es liegt da drüben.'],['P','Dann siehst du ja nur die Hälfte von dem, was gleich passiert.'],['L','Die Hälfte reicht mir. Die andere Hälfte seid ihr. Drauf!']],
 cry:['Ich hab dich im Auge!','Schau mir in die Augen! In das linke!'],hurt:['Mein Auge! Nein, das andere! Das gute!','Ich seh doppelt! Endlich!'],
 down:[['L','Ich … seh … nur noch … Glas …'],['P','Das Auge kommt in die Truhe. Es kann ja aufpassen.']],
 fig:(a,P,t)=>{const {rect,line,head:h,back}=P;if(back)return;rect(h.x+3,h.y+2,3,3,'#eef6ff');rect(h.x+4,h.y+3,1,1,'#2a6ad0');if(Math.sin(t*2.3)>.6)rect(h.x+3,h.y+2,1,1,'#ffffff');line(h.x+2,h.y-3,h.x+7,h.y+8,'#8a3a30',1);},
 face:(q,t)=>{QL(q,-27,-50,-6,-12,2.4,'#7a3028');for(let k=0;k<5;k++){const x=-24+k*4.2,y=-45+k*7;q(x-2,y-1,5,1,'#e8c8b8');}
  QE(q,-16,-32,7,6,'#2a1a14');QE(q,-16,-32,6,5,'#eef6ff');QE(q,-15,-32,3,3,'#3a7ad8');QE(q,-15,-32,1.4,1.4,'#0a1420');q(-19,-36,2,2,'#ffffff');
  if((t%3)<.25)q(-21,-34,3,1,'#ffffffcc');}},
// 4 ------------------------------------------------------------------------------------------------
{id:'riese',title:'der Riese',crew:'die Kniehohen',wpn:['hammer','doubleaxe','greatsword'],nick:['Türklopfer','Dachdecker','Nußknacker'],
 app:(g,r)=>{g.height=Math.round(212+r()*10);g.weight=Math.round(146+r()*18);g.muscle=Math.min(90,(g.muscle||40)+34);g.fat=Math.max(g.fat||16,18);g.arm=Math.round(g.height*.43);g.leg=Math.round(g.height*.49);Object.assign(g.appearance,{style:0,beard:2});},
 stat:g=>{for(const k of ['strength','toughness','pain'])g.stats[k]=clamp(Math.round(g.stats[k]*1.25),3,100);for(const p of Object.values(g.body))p.strength=clamp(Math.round(p.strength*1.2),3,100);},
 kills:'Gezählt hat er nie. Er weiß nur, wie viele Türrahmen er sich schon gestoßen hat. Das sind mehr.',
 why:['Er ist aus dem Steinbruch geflohen und hat den Steinbruch mitgenommen. Jedenfalls den Aufseher. In Stücken.','Die Kette am Hals ist noch vom Sklavenmarkt. Der Händler hängt am anderen Ende. Irgendwo.','In {P} nennen sie ihn den Kirchturm. Weil er die Glocken läuten lässt. Mit Köpfen.'],
 intro:[['L','Hm. Ihr seid klein.'],['P','Und du bist hässlich. Wir können üben, groß zu werden.'],['L','Ich übe zertreten. Zertreten!']],
 cry:['ZERTRETEN!','Klein! Alle so klein!'],hurt:['Aua. Glaub ich.','Das war mein Knie! Da wohnt mein Gleichgewicht!'],
 down:[['L','Bäume … fallen … auch …'],['P','Holz! Ich meine: Achtung! Ach, egal.']],
 fig:(a,P)=>{const {rect,chest:c}=P;rect(c.x-5,-61,11,3,'#3e4244');rect(c.x-5,-61,11,1,'#8a9094');rect(c.x-4,-60,1,1,'#c8ccd0');rect(c.x+3,-60,1,1,'#c8ccd0');for(let k=0;k<5;k++)rect(c.x+1+(k%2),-58+k*3,2,2,k%2?'#5a5e60':'#7a7e80');},
 face:(q)=>{q(-20,2,40,9,'#2e3234');q(-20,2,40,2,'#8a9094');q(-20,9,40,2,'#1a1c1e');for(const x of [-15,-5,5,15]){q(x-1,5,3,3,'#b8bcc0');q(x-1,5,1,1,'#ffffff');}
  for(let k=0;k<6;k++){const y=12+k*5.5,x=6+(k%2)*2;q(x,y,6,6,'#3a3e40');q(x+1,y+1,4,4,k%2?'#6a6e70':'#8a8e90');q(x+2,y+2,2,2,'#2e3234');}}},
// 5 ------------------------------------------------------------------------------------------------
{id:'halbe',title:'der Halbe',crew:'die Langen Kerle',wpn:['axe','doubleaxe','mace'],nick:['Kniescheibe','Schienbeinkuss','Kurzer Prozess'],
 app:(g,r)=>{g.height=Math.round(138+r()*8);g.weight=Math.round(84+r()*10);g.muscle=Math.min(85,(g.muscle||40)+28);g.arm=Math.round(g.height*.45);g.leg=Math.round(g.height*.45);Object.assign(g.appearance,{style:0,beard:3,hair:r()<.5?'#3a2a1e':'#6a6058'});},
 stat:g=>{for(const k of ['toughness','pain','will'])g.stats[k]=clamp(Math.round(g.stats[k]*1.3),3,100);},
 kills:'Alle von unten erwischt. Oberhalb des Knies hat er noch nie gekämpft.',
 why:['Wer über ihn lacht, lacht nur einmal. Dann fehlen ihm die Kniescheiben, und das Lachen verliert sich.','Er hat den Hofnarren von {P} umgebracht, weil der ihn „Kollege“ genannt hat.','Seine Bande heißt „die Langen Kerle“. Wer fragt, warum, wird kürzer gemacht.'],
 intro:[['L','Na? Sucht ihr wen? Ich bin hier unten.'],['P','Oh. Wir dachten, du bist ein Stein mit Bart.'],['L','Der Stein spaltet gleich deine Zehen. JUNGS! Die Waden zuerst!']],
 cry:['Die Knie! Immer auf die Knie!','Von unten! Wie das Unglück!'],hurt:['Das war unter der Gürtellinie! Meiner!','Ihr Riesen! Ihr Bohnenstangen!'],
 down:[['L','Endlich … liege ich … auf Augenhöhe …'],['P','Den tragen wir zu zweit. Nein, einer reicht.']],
 fig:(a,P)=>{const {rect,head:h,back}=P;if(back)return;const c=a.g.appearance.hair;rect(h.x+1,h.y+10,4,16,c);rect(h.x+2,h.y+24,2,4,c);for(const y of [14,19,24])rect(h.x+1,h.y+y,4,1,'#d8a838');},
 face:(q,t,c,fm,g)=>{const hc=g?.appearance?.hair||'#5a4636',d=A.mix(hc,'#100c0a',.45),l=A.mix(hc,'#d8c8b0',.3),gold='#d8a838';beard(q,[hc,d,l],30);
  for(const sx of [-8,8]){for(let y=10;y<32;y+=2){q(sx-3,y,6,2,(y/2)%2?hc:d);q(sx-1,y,2,1,l);}for(const y of [13,22]){q(sx-4,y,8,3,gold);q(sx-4,y,8,1,'#fff0a0');q(sx-4,y+2,8,1,'#8a6a18');}}}},
// 6 ------------------------------------------------------------------------------------------------
{id:'nasenlos',title:'der Nasenlose',crew:'die Schnupfer',wpn:['gladius','short','long'],nick:['Riecher','Schnupftuch','Nasenstüber'],
 app:(g)=>{Object.assign(g.appearance,{style:2,beard:2});g.scars=[...(g.scars||[]),{part:'head',reason:'Nase abgeschnitten (fremde Ehefrau)',day:0}];},
 kills:'Riechen konnte er keinen davon. Das macht es leichter, sagt er.',
 why:['Seine Nase hat ein eifersüchtiger Ehemann abgeschnitten. Den Ehemann hat er danach ganz abgeschnitten.','Er trägt eine Holznase an einem Band. Wenn sie abfällt, stirbt jemand. Meistens der, der lacht.','In {P} sagt man: Der Nasenlose riecht keine Angst. Er sieht sie. Und er mag, was er sieht.'],
 intro:[['L','Hier stinkt’s nach Gladiatoren.'],['P','Woher willst du das wissen? Du hast keine Nase.'],['L','Eben. Und trotzdem rieche ich es. So schlimm ist das. Macht sie kalt!']],
 cry:['Ich riech euer Blut! Nein, tu ich nicht. Aber gleich seh ich’s!','Nase voll von euch!'],hurt:['Meine Nase! Wo ist meine Nase?!','Das war meine gute Holznase!'],
 down:[['L','Ich … riech … nichts … mehr …'],['P','Das war vorher auch schon so.']],
 fig:(a,P)=>{const {rect,head:h,back}=P;rect(h.x-7,h.y+2,back?15:9,1,'#3a2414');if(back)return;rect(h.x+6,h.y+2,3,4,'#8a5a30');rect(h.x+8,h.y+3,1,2,'#b07a48');rect(h.x+6,h.y+5,1,1,'#2a1a10');},
 face:(q)=>{q(-29,-29,58,2,'#3a2414');q(-29,-28,58,1,'#5a3a24');
  q(-6,-31,12,17,'#7a4a26');q(-5,-30,10,15,'#9a6438');for(let y=-29;y<-16;y+=3)q(-4,y,8,1,'#7a4a26');q(-4,-17,3,2,'#2a1a10');q(1,-17,3,2,'#2a1a10');q(-1,-25,2,2,'#c8a070');q(-1,-25,1,1,'#ffffff');
  q(-9,-22,2,6,'#a8584a');q(7,-22,2,6,'#a8584a');}},
// 7 ------------------------------------------------------------------------------------------------
{id:'ohren',title:'der Ohrensammler',crew:'die Lauscher',wpn:['short','gladius','axe'],nick:['Hörrohr','Ohrwurm','Lauscher'],
 app:(g)=>{Object.assign(g.appearance,{style:0,beard:1});},
 kills:'Genau so viele, wie an seinem Riemen hängen. Geteilt durch zwei. Er nimmt immer beide.',
 why:['Er sammelt Ohren, weil ihm keiner zuhört. Jetzt hören ihm viele zu. Allerdings an seinem Gürtel.','Sein eigenes rechtes Ohr hängt auch am Riemen. Er wollte wissen, wie es sich anfühlt. Er sagt: gut.','Der Bürgermeister von {P} hat ihm einmal nicht zugehört. Seitdem hört der Bürgermeister gar nicht mehr. Er ist aber auch tot.'],
 intro:[['L','Was habt ihr gesagt? Ich hör so schlecht auf dem rechten.'],['P','Wir haben gesagt, du sollst aus dem Weg gehen.'],['L','Ah. Dann hör ich lieber mit euren Ohren weiter. Schneidet sie ab!']],
 cry:['Ohren her!','Hört ihr das? Das ist euer Ende!'],hurt:['Was? WAS? Ich hör nix!','Ihr habt mir ins Ohr gestochen! Ins gute!'],
 down:[['L','Ich hör … schon … die Fährmänner …'],['P','Die Sammlung kriegt ein Ohr mehr. Seins.']],
 fig:(a,P)=>{const {rect,line,chest:c,shoulders:s,back}=P;line(s.l.x,s.l.y+2,c.x+7,-30,'#3a2a1a',2);if(back)return;
  for(let k=0;k<6;k++){const u=(k+.5)/6,x=s.l.x+(c.x+7-s.l.x)*u,y=s.l.y+2+(-30-s.l.y-2)*u;rect(x-1,y,3,3,k%2?'#c88a70':'#a8705a');rect(x,y+1,1,1,'#6a3a2a');}},
 face:(q)=>{QE(q,27,-28,4,8,'#8a5444');QE(q,27,-28,2,5,'#6a3a2e');for(let y=-34;y<-20;y+=3){q(24,y,7,1,'#3a2a20');q(26,y-1,1,3,'#3a2a20');}
  for(let i=-7;i<=7;i++){const x=i*4.4,y=5+i*i*.12;q(x-2,y-1,5,1,'#3a2a1a');if(i%2===0||Math.abs(i)<2)continue;QE(q,x,y+5,3.4,5,i%4===1||i%4===-3?'#c88a70':'#a8705a');QE(q,x+.8,y+5,1.6,3,'#6a3a2a');q(x-1,y,2,2,'#3a2a1a');}}},
// 8 ------------------------------------------------------------------------------------------------
{id:'gehoernt',title:'der Gehörnte',crew:'die Stierköpfe',wpn:['spear','trident','axe'],nick:['Hornochse','Aufspießer','Stierkuss'],noHelm:true,
 app:(g)=>{Object.assign(g.appearance,{style:0,beard:3});},
 kills:'Die Hörner hat er einem Stier abgenommen. Der Stier war sein erstes Opfer. Danach wurde es einfacher.',
 why:['Er hat einen Stier mit bloßen Händen getötet und sich die Hörner auf den Helm genagelt. Der Helm war sein Kopf.','Seine Frau ist mit dem Schmied durchgebrannt. Seitdem trägt er die Hörner mit Stolz und den Schmied am Spieß.','In {P} rennen die Kühe weg, wenn er kommt. Die Bauern auch. Die Kühe sind schneller.'],
 intro:[['L','MUUUH!'],['P','War das eine Drohung oder hast du Hunger?'],['L','Beides! Auf sie! Spießt sie auf!']],
 cry:['MUUUUH!','Auf die Hörner mit euch!'],hurt:['Mein Horn! Ihr habt mein Horn angeknackst!','Ich seh rot! Ich seh nur noch rot!'],
 down:[['L','Muh …'],['P','Zieht ihm die Hörner ab. Daraus wird ein schöner Kleiderhaken.']],
 fig:(a,P)=>{const {rect,head:h}=P,c1='#e6dcc0',c2='#b8a888',c3='#f4ecd8';rect(h.x-8,h.y-8,17,3,'#4a4e50');rect(h.x-8,h.y-8,17,1,'#8a9094');
  for(const sd of [-1,1]){const bx=sd<0?h.x-7:h.x+7;rect(bx-1,h.y-10,3,3,c2);rect(bx+sd*2-1,h.y-13,3,3,c1);rect(bx+sd*3-1,h.y-16,3,3,c1);rect(bx+sd*3-1,h.y-19,2,3,c2);rect(bx+sd*2-1,h.y-21,2,2,c3);}},
 face:(q)=>{for(const sd of [-1,1])for(let i=0;i<34;i++){const k=i/33,x=sd*(24+k*40),y=-50+k*6-k*k*14,w=9-k*7;q(x-w/2,y-w/2,w,w,k>.86?'#f4ecd8':i%5===0?'#b8a888':'#e6dcc0');q(x-w/2,y+w/2-1,w,1,'#8a7a5a');}
  q(-28,-58,56,7,'#3e4244');q(-28,-58,56,2,'#8a9094');for(const x of [-20,-8,6,18])q(x,-55,2,2,'#c8ccd0');}},
// 9 ------------------------------------------------------------------------------------------------
{id:'witwe',title:'die Schwarze Witwe',crew:'die Trauergäste',wpn:['long','gladius','spear'],nick:['Mitgift','Ehegelübde','Bis dass der Tod'],noHelm:true,
 app:(g,r)=>{g.sex='female';g.height=Math.round(166+r()*10);g.weight=Math.round(58+r()*10);g.muscle=Math.max(30,(g.muscle||40)-6);Object.assign(g.appearance,{style:3,beard:0,hair:'#141016',silhouette:1});},
 kills:'Sieben Ehemänner. Der Rest waren Gäste auf den Beerdigungen, die zu viel gefragt haben.',
 why:['Sie war siebenmal verheiratet und hat siebenmal geerbt. Die Ringe trägt sie um den Hals. Die Finger hat sie zurückgegeben.','Sie trägt Schwarz, seit sie zwölf ist. Damals hat sie mit dem Üben angefangen.','In {P} heiratet keiner mehr. Die Priester haben ihr ein Hausverbot erteilt. Die Priester liegen jetzt auch im Garten.'],
 intro:[['L','Wie schön. Gleich mehrere Junggesellen.'],['P','Danke, wir sind vergeben.'],['L','Noch. Jungs, deckt den Tisch. Für eine Trauerfeier.']],
 cry:['Bis dass der Tod uns scheidet! Also gleich!','Kommt in meine Arme! Und in meine Klinge!'],hurt:['Du hast mein Kleid ruiniert! Das war Seide!','Kein Mann fasst mich ungestraft an!'],
 down:[['L','Endlich … verwitwet … die Welt …'],['P','Nehmt die Ringe nicht. Die sind verflucht. Oder nehmt sie. Wir sind eh verflucht.']],
 fig:(a,P)=>{const {rect,head:h,chest:c,back}=P,v='#141016';rect(h.x-8,h.y-10,17,4,v);rect(h.x-5,h.y-12,11,3,v);rect(h.x-9,h.y-7,3,26,'#1a141acc');
  if(back){rect(h.x-8,h.y-7,17,22,'#1a141acc');return;}rect(h.x-3,h.y-2,11,4,'#14101688');rect(h.x-2,h.y-1,1,1,v);rect(h.x+2,h.y,1,1,v);rect(h.x+5,h.y-1,1,1,v);rect(h.x,h.y+8,4,1,'#b0202a');
  for(let k=0;k<4;k++)rect(c.x-4+k*3,c.y+2+(k%2),2,2,'#e6c040');},
 face:(q,t)=>{const v='#141016';QE(q,0,-62,30,9,v);q(-31,-58,62,6,v);for(const sd of [-1,1])for(let y=-56;y<40;y++)q(sd<0?-33-y*.08:26+y*.08,y,8,1,y%7?v:'#2a222a');
  q(-25,-54,50,30,'rgba(20,16,22,.42)');for(let x=-24;x<25;x+=4)q(x,-54,1,30,'rgba(10,8,12,.35)');for(let y=-52;y<-24;y+=5)q(-25,y,50,1,'rgba(10,8,12,.3)');for(let x=-24;x<25;x+=4)QE(q,x+2,-24,2,1.4,v);
  q(-7,-10,14,3,'#a8182a');q(-5,-10,10,1,'#d03040');for(let i=-5;i<=5;i++){const x=i*5,y=18+i*i*.25;QE(q,x,y,2.4,2.4,'#e6c040');QE(q,x,y,1,1,'#3a2a14');}}},
// 10 -----------------------------------------------------------------------------------------------
{id:'bemalt',title:'der Bemalte',crew:'die Blauen',wpn:['spear','axe','club'],nick:['Pinselstrich','Waidmannsheil','Farbbeutel'],
 app:(g)=>{Object.assign(g.appearance,{style:4,beard:0});},
 kills:'Für jeden Toten ein neuer Kringel. Inzwischen malt er auf den Rücken. Von fremden Leuten.',
 why:['Er hat sich mit Waid blau gefärbt, damit man das Blut nicht sieht. Jetzt sieht man nur noch ihn.','Er war Färber in {P}. Dann hat er die Farbe gewechselt. Von Stoff zu Haut. Nicht nur seiner.','Seine Bande glaubt, die Farbe macht unverwundbar. Die Gräber am Wegesrand glauben das nicht mehr.'],
 intro:[['L','Blau ist die Farbe des Himmels. Und eurer Lippen, gleich.'],['P','Und du bist blau wie ein Säufer.'],['L','Säufer auch. Aber vor allem wütend. Holt sie!']],
 cry:['Färbt den Boden rot!','Für die Farbe!'],hurt:['Ihr habt meinen Kringel zerkratzt!','Das gibt Flecken! Eure!'],
 down:[['L','Alles … wird … grau …'],['P','Wäscht sich nicht raus. Auch nicht im Hades.']],
 fig:(a,P)=>{const {rect,head:h,back}=P,b='#2a4aa0';if(back){rect(h.x-6,h.y-4,2,8,b);rect(h.x+2,h.y-2,2,6,b);return;}rect(h.x-1,h.y-7,2,6,b);rect(h.x+3,h.y+5,4,1,b);rect(h.x-5,h.y+1,3,1,b);rect(h.x+6,h.y-2,1,3,b);rect(h.x-3,h.y+6,1,3,b);},
 face:(q)=>{const b='#2a4aa0',b2='#4a70c8';
  const spiral=(cx,cy,R)=>{for(let i=0;i<34;i++){const k=i/33,a=k*9.5,r=1+k*R;q(cx+Math.cos(a)*r-1,cy+Math.sin(a)*r-1,2,2,i%5?b:b2);}};
  spiral(-16,-16,8);spiral(16,-16,8);spiral(0,-56,7);for(let x=-22;x<23;x+=4)q(x,-46,2,2,b);for(const sd of [-1,1])for(let y=-38;y<-26;y+=3)q(sd*25,y,2,2,b);q(-2,-28,4,12,b);}},
// 11 -----------------------------------------------------------------------------------------------
{id:'grinse',title:'Grinsemaul',crew:'die Lachnummern',wpn:['short','gladius','long'],nick:['Lachfalte','Schmunzler','Pointe'],
 app:(g)=>{Object.assign(g.appearance,{style:1,beard:0});g.scars=[...(g.scars||[]),{part:'head',reason:'Lächeln geschnitten',day:0}];},
 kills:'Alle mit einem Lächeln auf den Lippen. Seinem. Die anderen haben eher nicht gelacht.',
 why:['Jemand hat ihm ein Lächeln ins Gesicht geschnitten, von Ohr zu Ohr. Seitdem lacht er über alles. Besonders über Leichen.','Er erzählt vor jedem Mord einen Witz. Bisher hat keiner gelacht. Er hält das für ein Zeichen von Respekt.','Der Hofnarr von {P} hat ihn ausgelacht. Jetzt grinst der Hofnarr auch. Für immer. Von innen.'],
 intro:[['L','Kennt ihr den? Kommen ein paar Gladiatoren in einen Wald …'],['P','… und gehen wieder raus. Ende.'],['L','Falsch. Die Pointe ist besser. JUNGS, die Pointe!']],
 cry:['Lacht doch mal!','Ha! HAHAHA!'],hurt:['Das ist nicht lustig! Doch, ein bisschen!','Au! Haha! Au!'],
 down:[['L','Der … war … gut …'],['P','Er grinst immer noch. Das ist unheimlich. Deckt ihn zu.']],
 fig:(a,P)=>{const {rect,head:h,back}=P,r='#9a2a24';if(back)return;rect(h.x-2,h.y+7,1,1,r);rect(h.x-3,h.y+6,1,1,r);rect(h.x-4,h.y+5,1,1,r);rect(h.x-5,h.y+4,1,1,r);rect(h.x+5,h.y+7,1,1,r);rect(h.x+6,h.y+6,1,1,r);rect(h.x+7,h.y+5,1,1,r);rect(h.x-2,h.y+8,8,1,'#5a1a18');},
 face:(q)=>{for(const sd of [-1,1]){for(let i=0;i<20;i++){const k=i/19,x=sd*(9+k*18),y=-9-k*14-Math.sin(k*Math.PI)*3;q(x-1,y-1,2.6,2.6,'#8a2420');q(x-1,y,2.6,1,'#c04a40');}
  for(let i=1;i<6;i++){const k=i/6,x=sd*(9+k*18),y=-9-k*14-Math.sin(k*Math.PI)*3;q(x-2,y-2,1,1,'#2a1a14');q(x+1,y+1,1,1,'#2a1a14');q(x-2,y+1,1,1,'#2a1a14');q(x+1,y-2,1,1,'#2a1a14');}}}},
// 12 -----------------------------------------------------------------------------------------------
{id:'schnabel',title:'der Schnabel',crew:'die Siechen',wpn:['long','mace','spear'],nick:['Aderlass','Fieberkurve','Letzte Ölung'],noHelm:true,
 app:(g)=>{Object.assign(g.appearance,{style:0,beard:0,cloth:'#1c1a1a'});},
 kills:'Er nennt sie Patienten. Keiner hat die Behandlung überlebt. Er nennt das eine Heilung von allem.',
 why:['Er war Pestarzt. Als die Pest vorbei war, hat er einfach weiterbehandelt. Mit dem Messer.','Unter der Maske hat ihn noch keiner gesehen. Die, die es versucht haben, sehen auch sonst nichts mehr.','Er riecht durch den Schnabel Kräuter, damit er den Tod nicht riecht. Er riecht trotzdem gut nach Tod. Er übt viel.'],
 intro:[['L','Ah. Patienten. Ihr seht blass aus.'],['P','Wir sind nicht krank.'],['L','Noch nicht. Die Behandlung beginnt sofort. Schwestern! Bindet sie fest!']],
 cry:['Zeit für den Aderlass!','Tief durchatmen! Ein letztes Mal!'],hurt:['Ein Kunstfehler! Eurer!','Ich brauche einen Arzt! Ich bin ja einer!'],
 down:[['L','Diagnose … tödlich …'],['P','Zweite Meinung: stimmt.']],
 fig:(a,P)=>{const {rect,head:h,back}=P,m='#d8ccb0';rect(h.x-11,h.y-11,23,3,'#181616');rect(h.x-6,h.y-17,13,7,'#201e1e');rect(h.x-6,h.y-12,13,1,'#5a3a2a');
  if(back){rect(h.x-7,h.y-2,15,2,'#4a3424');return;}rect(h.x-1,h.y-6,9,15,m);rect(h.x+7,h.y+2,5,4,m);rect(h.x+11,h.y+3,4,3,'#c8bc9e');rect(h.x+14,h.y+4,2,2,'#b8ac8e');rect(h.x+7,h.y+5,8,1,'#a89c7e');rect(h.x+3,h.y+1,3,3,'#3a2a14');rect(h.x+4,h.y+2,1,1,'#9ac0c8');},
 face:(q,t)=>{const m='#d8ccb0',d='#a89c7e';QE(q,0,-30,26,30,'#3a2a1a');QE(q,0,-30,24,28,m);for(let y=-56;y<0;y+=6)q(-22,y,44,1,'#c8bc9e');
  for(const sd of [-1,1]){QE(q,sd*12,-34,8,8,'#6a4a1c');QE(q,sd*12,-34,6,6,'#3a4a50');QE(q,sd*12,-34,4,4,'#6a8a94');q(sd*12-3,-38,2,2,'#e8f4f8');}
  for(let y=-26;y<26;y++){const k=(y+26)/52,w=11*(1-k)+1.2;q(-w,y,w*2,1,y%5?m:d);q(w-2,y,2,1,d);}q(-2,20,4,4,'#8a7c5e');
  q(-46,-60,92,5,'#181616');q(-46,-60,92,1,'#3a3636');q(-24,-80,48,21,'#201e1e');q(-24,-63,48,3,'#5a3a2a');q(-30,-30,60,2,'#4a3424');}},
// 13 -----------------------------------------------------------------------------------------------
{id:'gehaengt',title:'der Gehängte',crew:'die Galgenvögel',wpn:['axe','hammer','club'],nick:['Strick','Freispruch','Galgenfrist'],
 app:(g)=>{Object.assign(g.appearance,{style:2,beard:1});g.scars=[...(g.scars||[]),{part:'neck',reason:'gehängt (nicht lange genug)',day:0}];},
 stat:g=>{g.stats.pain=clamp(Math.round(g.stats.pain*1.3),3,100);},
 kills:'Drei Henker hat er schon. Den Rest hat er mit dem Strick erwürgt, der ihn nicht wollte.',
 why:['Man hat ihn in {P} gehängt. Zwei Tage lang. Dann ist der Ast gebrochen, und er war schlecht gelaunt.','Er trägt den Strick noch um den Hals. Er sagt, er hängt daran.','Der Richter, der ihn verurteilt hat, schläft jetzt unter dem Galgen. In mehreren Kisten.'],
 intro:[['L','Ich hab schon mal gehangen. Hat nicht geklappt.'],['P','Wir sind keine Henker. Wir sind gründlicher.'],['L','Das sagen alle. Zieht ihnen die Schlinge zu!']],
 cry:['Hängt sie auf! An ihren Därmen!','Galgenfrist abgelaufen!'],hurt:['Der Strick hält! Ich auch!','Ihr kriegt mich nicht klein! Der Galgen hat’s auch nicht geschafft!'],
 down:[['L','Diesmal … hält … es …'],['P','Den Strick lassen wir dran. Gehört zu ihm.']],
 fig:(a,P)=>{const {rect,chest:c}=P;rect(c.x-5,-61,11,2,'#a8884a');rect(c.x-5,-60,11,1,'#7a5a2a');rect(c.x-7,-63,3,4,'#8a6a3a');rect(c.x-8,-60,2,14,'#9a7a42');rect(c.x-9,-47,4,2,'#b89a5a');rect(c.x-4,-59,8,1,'#6a2a4a');},
 face:(q)=>{q(-18,4,36,4,'#5a2a4a');for(let x=-20;x<21;x+=3){q(x,0,3,6,(x/3)%2?'#a8884a':'#8a6a3a');q(x,0,1,6,'#6a4a22');}
  QE(q,-24,-14,6,6,'#8a6a3a');QE(q,-24,-14,3,3,'#6a4a22');for(let y=-8;y<42;y+=3)q(-27+Math.sin(y*.2)*1.5,y,4,3,(y/3)%2?'#a8884a':'#8a6a3a');for(let k=0;k<5;k++)q(-29+k*1.5,42,1,4+k%2*2,'#c8aa6a');
  for(const sx of [-16,13]){q(sx-4,-34,3,1,'#c03a3a');q(sx+3,-31,3,1,'#c03a3a');q(sx-3,-30,2,1,'#c03a3a');}}},
// 14 -----------------------------------------------------------------------------------------------
{id:'schlachter',title:'der Schlachter',crew:'die Metzgerzunft',wpn:['axe','doubleaxe','hammer'],nick:['Hackebeil','Wurstfinger','Filetier'],
 app:(g,r)=>{g.weight=Math.round(150+r()*20);g.fat=Math.max(g.fat||16,42);g.muscle=Math.min(80,(g.muscle||40)+12);Object.assign(g.appearance,{style:0,beard:2});},
 stat:g=>{for(const k of ['strength','toughness'])g.stats[k]=clamp(Math.round(g.stats[k]*1.2),3,100);},
 kills:'Gewogen, nicht gezählt. Er sagt, es waren ungefähr zwei Ochsen. In Menschen.',
 why:['Er war Metzger in {P}. Dann gingen die Schweine aus. Die Würste wurden trotzdem nicht weniger.','Seine Schürze war mal weiß. Er wäscht sie nicht, damit die Kunden wissen, woran sie sind.','Er verkauft auf dem Markt Pasteten. Niemand fragt, was drin ist. Wer fragt, ist drin.'],
 intro:[['L','Frisches Fleisch. Und so gut abgehangen.'],['P','Wir sind nicht zum Verkauf.'],['L','Alles ist zum Verkauf. Pro Pfund. Zerlegt sie!']],
 cry:['Zerlegen! Filetieren!','Heute gibt’s Gladiatorengulasch!'],hurt:['Ihr habt mir ins Kotelett geschnitten!','Das Fett schützt! Das Fett schützt immer!'],
 down:[['L','Ich … war … ein … Filetstück …'],['P','Den tragen? Holt einen Ochsenkarren.']],
 fig:(a,P)=>{const {rect,line,chest:c,shoulders:s,back}=P;if(back){line(s.l.x,s.l.y,c.x,-36,'#d8d2c4',1);return;}line(s.l.x+2,s.l.y,c.x-2,c.y+3,'#d8d2c4',1);line(s.r.x-1,s.r.y,c.x+3,c.y+3,'#d8d2c4',1);
  rect(c.x-6,c.y+3,13,26,'#e8e2d4');rect(c.x-6,c.y+3,1,26,'#c8c2b4');rect(c.x-3,c.y+8,4,3,'#a0302a');rect(c.x+2,c.y+14,3,5,'#8a2420');rect(c.x-4,c.y+20,2,4,'#a0302a');rect(c.x+3,c.y+25,3,2,'#b0403a');},
 face:(q,t,c,fm,g)=>{const sk=g?.appearance?.skin||'#c49470',sh=g?.appearance?.shade||'#94664a';QE(q,0,2,21,7,sh);QE(q,0,0,20,6,sk);q(-14,4,28,1,sh);for(const sd of [-1,1])QL(q,sd*36,6,sd*14,40,4,'#d8d2c4');
  q(-24,30,48,40,'#e8e2d4');q(-24,30,48,2,'#c8c2b4');QE(q,-10,40,5,3,'#a0302a');QE(q,8,52,4,6,'#8a2420');q(12,36,2,9,'#a0302a');
  for(const [x,y] of [[-15,-20],[-12,-14],[14,-46],[17,-40],[6,-5]])QE(q,x,y,1.4,1.4,'#a0302a');}},
// 15 -----------------------------------------------------------------------------------------------
{id:'rotbart',title:'Rotbart',crew:'die Bartläuse',wpn:['doubleaxe','axe','hammer'],nick:['Bartscherer','Rotkehlchen','Kinnhaken'],
 app:(g)=>{Object.assign(g.appearance,{style:2,beard:3,hair:'#c4421c'});},
 kills:'Für jeden einen Knochen im Bart. Wenn er sich kämmt, klappert es wie ein Friedhof im Sturm.',
 why:['Er hat sich seit dem ersten Mord nicht rasiert. Der Bart reicht inzwischen bis zum Gürtel.','In seinem Bart wohnen Läuse, Krümel von drei Jahren und angeblich ein kleiner Vogel.','Er hat den Barbier von {P} erwürgt. Mit dem Bart. Der Barbier wollte nur nachschneiden.'],
 intro:[['L','Seht ihr den Bart? Jedes Haar ein Toter.'],['P','Dann hast du aber eine Menge Läuse auf dem Gewissen.'],['L','Die zählen auch! Packt sie! Ich brauch neue Knochen!']],
 cry:['Für den Bart!','Knochen für meinen Bart!'],hurt:['Nicht den Bart! Alles, nur nicht den Bart!','Mein Bart blutet!'],
 down:[['L','Kämmt … meinen … Bart …'],['P','Wir kämmen ihn. Mit der Axt.']],
 fig:(a,P)=>{const {rect,head:h,back}=P;if(back)return;const c='#c4421c';rect(h.x,h.y+8,7,6,c);rect(h.x+1,h.y+14,5,8,c);rect(h.x+2,h.y+22,3,4,c);rect(h.x+2,h.y+16,2,2,'#efe6d0');rect(h.x+3,h.y+21,2,2,'#efe6d0');rect(h.x+1,h.y+12,1,6,'#8a2a10');},
 face:(q)=>{beard(q,['#c4421c','#8a2a10','#ee7a44'],34);for(const [x,y] of [[-14,6],[11,10],[-6,16],[4,22],[-1,28]]){q(x-2,y-1,5,3,'#efe6d0');q(x-1,y,3,1,'#c8bc9e');q(x+1,y-2,1,1,'#3a2a14');}}},
// 16 -----------------------------------------------------------------------------------------------
{id:'bleich',title:'der Bleiche',crew:'die Schattenmänner',wpn:['long','greatsword','gladius'],nick:['Mondschein','Nachtschicht','Leichentuch'],
 app:(g)=>{Object.assign(g.appearance,{skin:'#efe6dc',shade:'#c4b6ac',hair:'#f2f0ea',style:3,beard:0});},
 stat:g=>{for(const k of ['agility','reflex'])g.stats[k]=clamp(Math.round(g.stats[k]*1.2),3,100);},
 kills:'Alle nachts. Bei Tag bekommt er Sonnenbrand. Das hat mehr Leute erschreckt als seine Klinge.',
 why:['In {P} halten sie ihn für einen Wiedergänger. Er widerspricht nicht. Es ist gut fürs Geschäft.','Seine Augen sind rot wie bei einem Kaninchen. Das letzte Kaninchen, das ihn so angesehen hat, war ein Bauer.','Er schläft in einem Sarg. Nicht aus Aberglauben. Der Sarg war günstig, der Vorbesitzer brauchte ihn nicht mehr.'],
 intro:[['L','Ihr seid laut. Und warm. Ich mag warm.'],['P','Du siehst aus, als wärst du schon tot.'],['L','Ich übe nur. Ihr dürft gleich richtig. Holt sie, Schatten!']],
 cry:['Kommt in die Dunkelheit!','Das Licht geht aus!'],hurt:['Mein Blut ist ja doch rot. Seltsam.','Ihr habt mich gefunden. Das war ein Fehler.'],
 down:[['L','Endlich … Nacht …'],['P','Pfählen? – Nein. Der ist nur bleich. Aber sicher ist sicher.']],
 fig:(a,P)=>{const {rect,head:h,back}=P;if(back)return;rect(h.x-4,h.y+1,3,1,'#9a8a9a');rect(h.x+3,h.y+1,3,1,'#9a8a9a');rect(h.x-3,h.y+3,2,2,'#d02020');rect(h.x+4,h.y+3,2,2,'#d02020');},
 face:(q,t)=>{q(-24,-38,15,2,'#6a5a6a66');q(8,-38,14,2,'#6a5a6a66');q(-23,-27,13,2,'#8a7a8a55');q(8,-27,12,2,'#8a7a8a55');
  if((t%4.4)>=.12){QE(q,-16,-33,2.2,1.6,'#d02020');QE(q,13,-33,2,1.6,'#d02020');q(-17,-34,1,1,'#ffb0b0');q(12,-34,1,1,'#ffb0b0');}}},
// 17 -----------------------------------------------------------------------------------------------
{id:'baer',title:'der Bärenmann',crew:'das Rudel',wpn:['axe','club','doubleaxe'],nick:['Tatze','Winterschlaf','Bärendienst'],noHelm:true,back:true,
 app:(g,r)=>{g.height=Math.max(g.height,190);g.weight=Math.max(g.weight,110);Object.assign(g.appearance,{style:3,beard:3,hair:'#3a2a1e'});},
 stat:g=>{g.stats.strength=clamp(Math.round(g.stats.strength*1.2),3,100);},
 kills:'Den Bären hat er erwürgt. Die Menschen danach waren Nachtisch. Er sagt, Bär schmeckt besser.',
 why:['Er hat einen Bären mit bloßen Händen erwürgt und trägt ihn seitdem als Mütze. Der Bär sieht unglücklicher aus als er.','Im Winter schläft er in einer Höhle bei {P}. Wer ihn weckt, wird gefrühstückt.','Seine Bande heult nachts den Mond an. Er sagt, das ist Taktik. Es ist Bier.'],
 intro:[['L','GRRRRR.'],['P','Ist das ein Mensch oder ein Teppich?'],['L','Beides! Und gleich seid ihr der Bettvorleger! Packt sie!']],
 cry:['GRRAAAH!','Ich fress euch roh!'],hurt:['Das macht mich nur wütender! Und hungriger!','Ihr pikst den Bären! Schlechte Idee!'],
 down:[['L','Winter … schlaf …'],['P','Die Mütze nehm ich. Die hat jetzt zwei Tote auf dem Gewissen.']],
 fig:(a,P)=>{const {rect,head:h,back,layer}=P,f='#5a3a22',f2='#6e4a2c',f3='#3e2816';
  if(layer==='back'){rect(-11,-62,8,34,f3);rect(-12,-34,9,4,f);for(let k=0;k<4;k++)rect(-12+k*2,-30,1,3,f3);return;}
  rect(h.x-9,h.y-14,19,8,f);rect(h.x-8,h.y-15,16,2,f2);rect(h.x-7,h.y-18,4,4,f);rect(h.x+3,h.y-18,4,4,f);rect(h.x-6,h.y-17,2,2,'#a87a5a');rect(h.x+4,h.y-17,2,2,'#a87a5a');rect(h.x-9,h.y-7,3,14,f3);
  if(back)return;rect(h.x+7,h.y-12,7,5,f2);rect(h.x+12,h.y-12,3,2,'#1a1210');rect(h.x+8,h.y-7,6,1,'#f4ecd8');rect(h.x+9,h.y-6,1,2,'#f4ecd8');rect(h.x+12,h.y-6,1,2,'#f4ecd8');rect(h.x+4,h.y-12,1,1,'#e0c040');},
 face:(q,t)=>{const f='#5a3a22',f2='#6e4a2c',f3='#3e2816';for(const sd of [-1,1]){for(let y=-56;y<50;y+=2)q(sd<0?-38:30,y,8,2,(y/2)%3?f:f3);for(let i=0;i<10;i++)q(sd*(30+i*1.5)-(sd<0?6:0),10+i*3,8,30-i*2,(i%2)?f:f3);}
  QE(q,0,-56,34,13,f);QE(q,0,-58,30,9,f2);for(const sd of [-1,1]){QE(q,sd*27,-66,7,7,f);QE(q,sd*27,-66,3.5,3.5,'#a87a5a');QE(q,sd*15,-57,2.4,2.4,'#e0c040');q(sd*15-1,-58,1,1,'#ffffff');}
  QE(q,0,-50,12,8,f2);QE(q,0,-54,6,4,'#1a1210');q(-2,-56,2,1,'#5a5a5a');for(let x=-10;x<=8;x+=3)q(x,-43,2,x===-10||x===8?6:4,'#f4ecd8');}},
// 18 -----------------------------------------------------------------------------------------------
{id:'haken',title:'Hakenhand',crew:'die Fingerlosen',wpn:['gladius','short','mace'],nick:['Fingerzeig','Handschlag','Kleiner Finger'],oneHand:true,
 app:(g)=>{Object.assign(g.appearance,{style:1,beard:2});if(g.body?.lh){g.body.lh.missing=true;g.body.lh.hp=0;}},
 kills:'Die meisten mit der guten Hand. Die besonderen mit dem Haken. Er sagt, die merkt man sich besser.',
 why:['Die linke Hand hat ihm ein Richter abhacken lassen, wegen Diebstahl. Den Haken hat er aus dem Richter gemacht. Jedenfalls aus seinem Gürtel.','Er kratzt sich mit dem Haken. Auch an Stellen, an denen es andere Leute juckt.','In {P} gibt ihm keiner mehr die Hand. Er hat es aber auch nur noch mit einer probiert.'],
 intro:[['L','Gebt mir die Hand. Ich hab nur eine.'],['P','Wir geben dir gleich was ganz anderes.'],['L','Dann nehm ich mir die Hände selbst. Alle! HAKEN RAUS!']],
 cry:['Ich hak euch ab!','Hand drauf!'],hurt:['Gerade noch mal die Hand gerettet! Die andere!','Ihr habt meinen Haken verbogen!'],
 down:[['L','Ich … hab … keine … Hand … mehr … frei …'],['P','Der Haken kommt an die Tür. Für Mäntel.']],
 fig:(a,P,t)=>{const {rect,offHand:o,back}=P;if(!o||back)return;rect(o.x-3,o.y-1,5,5,'#5a3a22');rect(o.x-3,o.y-1,5,1,'#7a5232');rect(o.x,o.y-7,2,7,'#9aa2a6');rect(o.x+1,o.y-9,4,2,'#b8c0c4');rect(o.x+4,o.y-8,2,4,'#d8e0e4');rect(o.x+3,o.y-5,2,1,'#9aa2a6');if(Math.sin(t*3)>.7)rect(o.x+4,o.y-9,1,1,'#ffffff');},
 face:(q,t)=>{const y0=Math.sin(t*1.3)*2;q(36,14+y0,18,22,'#5a3a22');q(36,14+y0,18,4,'#7a5232');for(const yy of [20,27])q(37,yy+y0,16,1,'#3a2414');
  QL(q,45,14+y0,45,2+y0,5,'#9aa2a6');for(let i=0;i<24;i++){const k=i/23,a=Math.PI*(-.1+k*1.25),x=36+Math.cos(a)*9,y=-6+y0-Math.sin(a)*12;QE(q,x,y,2.6-k*.8,2.6-k*.8,k>.88?'#e8f0f4':'#9aa2a6');q(x-1,y-2,1.4,1.4,'#d8e0e4');}
  if((t%2.6)<.3)q(44,-14+y0,3,3,'#ffffff');}},
// 19 -----------------------------------------------------------------------------------------------
{id:'eisenmaske',title:'die Eisenmaske',crew:'die Namenlosen',wpn:['greatsword','long','mace'],nick:['Schweigen','Visier','Rost'],noHelm:true,
 app:(g)=>{Object.assign(g.appearance,{style:2,beard:0});},
 stat:g=>{g.stats.toughness=clamp(Math.round(g.stats.toughness*1.15),3,100);},
 kills:'Niemand weiß es. Er redet nicht. Die Gräber bei {P} reden dafür umso mehr.',
 why:['Er trägt die Maske seit zwanzig Jahren. Angeblich, weil darunter das Gesicht eines Prinzen steckt. Oder gar keins.','Er spricht nie. Wenn er doch spricht, ist danach jemand tot. Meistens der, der zugehört hat.','Die Maske ist an seinem Kopf festgeschmiedet. Er hat den Schmied gebeten, sie fester zu machen. Dann hat er den Schmied fester gemacht. Für immer.'],
 intro:[['L','…'],['P','Hallo? Ist da wer drin?'],['L','… Tötet sie.']],
 cry:['…','Hhhhhh.'],hurt:['…!','Hnngh.'],
 down:[['L','… endlich … Stille …'],['P','Wer macht die Maske ab? – Keiner. Lasst ihm das Geheimnis.']],
 fig:(a,P)=>{const {rect,head:h,back}=P;rect(h.x-7,h.y-1,15,2,'#3a2a1a');if(back)return;rect(h.x-1,h.y-7,10,17,'#5e6264');rect(h.x-1,h.y-7,10,1,'#8a9094');rect(h.x+2,h.y+2,6,1,'#0e0e0e');rect(h.x+5,h.y+6,1,3,'#0e0e0e');rect(h.x+7,h.y+6,1,3,'#0e0e0e');rect(h.x,h.y-5,1,1,'#b8bcc0');rect(h.x,h.y+8,1,1,'#b8bcc0');rect(h.x+3,h.y-3,2,3,'#7a4a2a');},
 face:(q)=>{const m='#5e6264',d='#3e4244',l='#8a9094';QE(q,0,-30,27,33,'#2a2c2e');QE(q,0,-30,25,31,m);for(let y=-58;y<0;y+=4)q(-23,y,8,1,d);q(-2,-58,4,48,l);q(-1,-58,1,48,'#b8bcc0');
  q(-22,-35,16,3,'#0a0a0a');q(6,-35,16,3,'#0a0a0a');for(let x=-8;x<=8;x+=4)for(let y=-14;y<-4;y+=4)q(x-1,y,2,2,'#0a0a0a');
  for(const [x,y] of [[-22,-54],[20,-54],[-24,-20],[22,-20],[-12,-2],[10,-2]]){q(x-1,y-1,3,3,'#b8bcc0');q(x-1,y-1,1,1,'#ffffff');}
  for(const [x,y,h] of [[-16,-31,14],[14,-31,10],[6,-6,8]])q(x,y,2,h,'#7a4a2a');QE(q,15,-48,3,2,d);}},
// 20 -----------------------------------------------------------------------------------------------
{id:'kraehe',title:'der Krähenmann',crew:'der Schwarm',wpn:['spear','long','short'],nick:['Aasgeier','Federkiel','Schnabelhieb'],back:true,
 app:(g)=>{Object.assign(g.appearance,{style:3,beard:1,hair:'#141216',cloth:'#1c1a20'});},
 kills:'Gezählt haben die Krähen. Sie sind ihm dankbar. Er ist ihr bester Koch.',
 why:['Er hat als Junge Krähen gefüttert. Mit Augen. Sie folgen ihm seitdem überallhin.','Sein Mantel ist aus Krähenfedern. Er sagt, er hat die Krähen nicht getötet. Sie sind vor Bewunderung gestorben.','Wenn über {P} die Krähen kreisen, weiß man, dass er da war. Oder gleich kommt. Die Krähen sind meistens zuerst da.'],
 intro:[['L','Hört ihr sie? Die Krähen haben schon Hunger.'],['P','Sag ihnen, sie sollen sich bei dir bedienen.'],['L','Das tun sie. Später. Erst ihr. KRAH!']],
 cry:['KRAAAH!','Für den Schwarm!'],hurt:['Meine Federn! Ihr rupft mich!','Die Krähen sehen zu! Blamiert mich nicht!'],
 down:[['L','Fresst … mich … zuletzt …'],['P','Die Krähen warten schon. Gönnen wir ihnen den Abend.']],
 fig:(a,P,t)=>{const {rect,head:h,shoulders:s,back,layer}=P,f='#1c1a20',f2='#2e2a38';
  if(layer==='back'){for(let k=0;k<9;k++)rect(-12+k*2,-60+Math.abs(k-4),3,30+(k%3)*3,k%2?f:f2);return;}
  for(let k=0;k<8;k++)rect(s.l.x-3+k*3,s.l.y-2+(k%2),3,4,k%2?f:f2);
  const x=back?s.r.x:s.l.x,y=(back?s.r.y:s.l.y)-3,flap=Math.sin(t*1.7)>.85,bob=Math.sin(t*4)>.3?0:1;rect(x-3,y-4,7,4,'#141216');rect(x-4,y-3,2,2,'#141216');rect(x+2,y-7+bob,3,3,'#141216');rect(x+5,y-6+bob,2,1,'#6a6a6a');rect(x+3,y-6+bob,1,1,'#e8e8e8');
  if(flap){rect(x-5,y-8,4,4,'#2e2a38');rect(x+1,y-9,3,4,'#2e2a38');}},
 face:(q,t)=>{const f='#1c1a20',f2='#2e2a38';for(let i=0;i<24;i++){const x=-46+i*4,y=8+Math.abs(i-11.5)*.6;q(x,y,5,10+(i%3)*4,i%2?f:f2);q(x+1,y+2,1,6,'#4a4458');}
  const bob=Math.sin(t*3.2)>.4?0:2,cx=40,cy=-2;QE(q,cx,cy,11,7,'#141216');QE(q,cx-2,cy-1,8,4,'#2e2a38');q(cx-14,cy+2,8,3,'#141216');QE(q,cx+8,cy-10+bob,5,5,'#141216');q(cx+12,cy-10+bob,7,2,'#5a5a5a');q(cx+12,cy-9+bob,5,1,'#3a3a3a');
  if((t%3.3)>.15)q(cx+9,cy-12+bob,2,2,'#e8e8e8');q(cx+9,cy-12+bob,1,1,'#141216');q(cx-1,cy+6,1,4,'#4a4a4a');q(cx+3,cy+6,1,4,'#4a4a4a');
  if(Math.sin(t*1.1)>.9){q(cx-12,cy-14,10,6,f2);q(cx-6,cy-18,8,6,f);}}}
];
N.byId=Object.fromEntries(T.map(x=>[x.id,x]));

// ---------- Allgemeine Sätze ----------
// Bandenmitglieder bei der Vorstellung: {N} Name, {W} Waffe
N.CREW=['{N} mit {W}. Hat seine Mutter verkauft. Zweimal. Beim zweiten Mal war sie schon tot.','{N}, {W} in der Hand. Kann nicht lesen, aber Leichen zählen. Bis zehn. Danach fängt er von vorn an.',
 '{N} trägt {W} und den Gestank von drei Wochen Wald.','{N}. {W}. Hat noch nie verloren, sagt er. Sagt auch sonst viel.','{N}, mit {W}. Ist nur dabei, weil er bei seiner Frau nicht mehr schlafen darf.',
 '{N} schwingt {W}. Hält sich für den Nachfolger. Der Anführer hält ihn für entbehrlich.','{N} hat {W} und Zähne wie ein Friedhof: wenige, schief, gelb.','{N}, {W}. Früher Bäcker. Die Brötchen waren tödlicher.',
 '{N} mit {W}. Lacht beim Töten. Lacht auch beim Essen. Lacht eigentlich immer. Keiner weiß, worüber.','{N}. Wird „der Pfarrer“ genannt, weil er jedem die letzte Ölung gibt. Mit {W}.',
 '{N}, bewaffnet mit {W} und einem Glücksbringer aus einem fremden Finger.','{N} trägt {W}. Ist so dumm, dass man ihm zweimal sagen muss, dass er tot ist.','{N} mit {W}. Hat seinen Bruder für ein Schwein getauscht. Das Schwein war mehr wert.',
 '{N}. {W}. Riecht so streng, dass die Fliegen um Gnade bitten.','{N}, {W} in beiden Händen. Kann nicht zählen, also teilt er nie.','{N} hat {W} und eine Narbe für jede Frau, die Nein gesagt hat. Er ist sehr vernarbt.'];
N.KILLWORD=(n)=>n===1?'einen Menschen':n+' Menschen';
// Opferzahl nach Schwierigkeit (1–5 Totenköpfe)
N.KILLS=[[9,24],[18,46],[35,90],[70,160],[140,330]];
// Kampfbeginn (für alle gleich, je nach Lage)
N.START=['Blut oder Beute!','Heute stirbt hier jemand. Die Frage ist nur, in welcher Reihenfolge.','Kein Zurück mehr.','Für den Ludus!','Und los!'];

// ---------- Anführer ausstatten ----------
// g: Gladiator, typeId: einer der 20, r: Zufall (0–1), diff: 1–5. Setzt Aussehen, Werte und Texte, nicht die Ausrüstung.
N.dress=function(g,typeId,r,diff=3){const ty=N.byId[typeId]||T[0];g.notorious=ty.id;g.appearance={...(g.appearance||{})};try{ty.app?.(g,r);}catch(e){}try{ty.stat?.(g);}catch(e){}
 const [k0,k1]=N.KILLS[clamp(Math.round(diff),1,5)-1];g.notoriousKills=Math.round(k0+r()*(k1-k0));g.kills=Math.max(g.kills||0,Math.round(g.notoriousKills/3));
 N.registerFace(g);return g;};
N.typeOf=g=>g&&g.notorious?N.byId[g.notorious]||null:null;
// Großaufnahmen: Kennzeichen über das Gesicht legen (face-shots.js ruft M.faceOverlays[g.id] auf)
N.registerFace=function(g){const ty=N.typeOf(g);if(!ty?.face)return;const map=M.faceOverlays??={};map[g.id]=(c,fm,t)=>{try{ty.face(Q(c,fm),t,c,fm,g);}catch(e){}};};
N.unregister=g=>{if(g&&M.faceOverlays)delete M.faceOverlays[g.id];};
// Kampfbild: Haken in arena.js (drawGladiator), Figurenkoordinaten
const prevDecor=M.figureDecor;
M.figureDecor=function(a,P){prevDecor?.(a,P);const ty=N.typeOf(a?.g);if(!ty?.fig||(P.layer==='back'&&!ty.back))return;if(a.g.body?.head?.missing&&P.layer==='front')return;try{ty.fig(a,P,P.time||0);}catch(e){}};
})();
