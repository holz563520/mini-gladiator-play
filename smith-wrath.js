'use strict';
// DER ZORN DES SCHMIEDS: seltenes Herumtreiber-Ereignis (Gruppen bis fünf, längere Jagd mit Stolpern, Kriechen, Betteln). Bei etwa jeder fünften neuen Gruppe verlangen sie Gratiswaffen;
// eine besondere Antwort schickt sie zum Schmied. 75 %: Sie gehen hin, der Schmied (Bier in der Hand) erledigt alle.
// 25 %: Einer erkennt den Namen, die Gruppe flieht. Reine Inszenierung mit vorhandenen Figuren, Treffern, Blut und Körperteilen.
// Keine Werte, keine Beute, keine Erfahrung. Das Ergebnis wird beim Start sofort verbucht, Laden spielt nichts erneut ab.
(()=>{
const M=window.MG,S=M.s,T=M.wandererTalk,WD=M.wanderers,$=id=>typeof document==='undefined'?null:document.getElementById(id);
if(!T||!WD)return;
const CHANCE=.2,ACCEPT=.75,W=()=>M.workshop?.state;
function roll(id,salt){let h=2166136261;for(const c of id+'|'+salt)h=Math.imul(h^c.charCodeAt(0),16777619);h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return (h>>>0)/4294967296;}
const choose=(list,id,salt)=>list[Math.floor(roll(id,salt)*list.length)];
const smithName=()=>W()?.master?.name||'Der Schmied';
const eligible=g=>!!g&&!!W()?.master&&W().intro==='done'&&roll(g.id,'freebie')<CHANCE;
// ---------- Texte ----------
const L={
 demand:['He, du feiner Pinkel! Wir brauchen Waffen. Und bevor du fragst: Bezahlen werden wir einen Scheißdreck!','Hör zu, {D}: Wir nehmen uns ein paar Klingen. Umsonst. Weil wir so nett gefragt haben.','Du hast doch Eisen da drin. Gib her, oder sollen wir höflich werden?','Rüstung, Schwerter, egal was. Und zwar gratis, {D}, wir sind nämlich pleite und schlecht gelaunt.','Ein Ludus ohne Gastgeschenke? Rück Waffen raus, und wir vergessen, dass wir hier waren.','Wir brauchen Ausrüstung. Geld haben wir keins, aber jede Menge Ideen, was wir sonst mit deinem Tor machen.'],
 offer:['Aber natürlich! Unser Schmied {N} ist ein ausgesprochen netter Kerl. Fragt ihn einfach persönlich!','{N} verschenkt ständig Waffen. Er liebt Besuch!','Unser Schmied hat ein Herz aus Gold. Geht ruhig rein!','Sagt {N}, dass ihr seine Arbeit für minderwertig haltet. Dann gibt er euch bestimmt was Besseres!','Der Schmied freut sich besonders über unverschämte Gäste!','Fragt nach dem legendären Gratis-Gladius. Er weiß sofort Bescheid!'],
 accept:['Na dann schauen wir mal, was der Wichser zu bieten hat!','Wenn der uns verarscht, hauen wir ihm seinen Amboss in die Fresse!','Ein Schmied, der verschenkt? Der muss ja völlig bescheuert sein!','Hoffentlich hat der alte Sack wenigstens vernünftige Schwerter!','Los, Jungs! Wir plündern den Eisenfresser!','Ich nehme zwei Schwerter. Der Rest kann sich verpissen!','Wenn der nichts rausrückt, reißen wir ihm den Bart aus!','So ein Schmied hat bestimmt Angst vor echten Männern!','Hahaha! Der Trottel arbeitet und wir kassieren!','Ich hoffe, der Schmied ist nicht so hässlich wie seine Hütte!','Dem zeigen wir mal, wie man ordentlich verhandelt!','Ich will das teuerste Schwert, das dieser Penner besitzt!','Vielleicht kriegen wir seinen verdammten Amboss gleich mit!','Wenn der nicht spurt, stecken wir seinen Laden in Brand!','Ich habe noch nie einen Schmied getroffen, den ich nicht beleidigen konnte!','Kommt, wir machen diesem Eisenwichser einen Besuch!','Hoffentlich kann der alte Sack schneller schmieden als laufen!','Gratis Waffen? Endlich mal ein Ludus mit Verstand!','Ich nehme seine beste Klinge. Und seinen Schnaps!','Los, ihr Versager! Wir zeigen dem Hammeropa, wer hier das Sagen hat!'],
 flee:['{N}?! RENNT, IHR IDIOTEN!','Der Schmied?! Der hat meinem Bruder die Zähne mit einem Hammer ausgeschlagen!','NICHT DER! ALLES, NUR NICHT DER!','Ich habe gesehen, was der mit drei Legionären gemacht hat!','Der Typ hat einen Ochsen mit bloßen Händen umgeworfen!','Meine Mutter hat mich vor diesem Irren gewarnt!','Ich kenne den! Der hat seinen letzten Kunden durch die Tür geworfen!','Vergesst die Waffen! ICH WILL LEBEN!','Der hat einen Amboss nach meinem Onkel geworfen!','Ich habe gehört, der schärft seine Schwerter an Menschen!','NEIN! NICHT NOCH MAL!','Das ist der Kerl aus der Taverne! LAUFT!','Der Schmied mit der Flasche?! Wir sind tot!','Mein Cousin hat ihn einmal einen Stümper genannt. Einmal!','Ich habe gehört, sein Lehrling schläft mit einem Helm!','Der hat mal fünf Männer verprügelt, weil einer gehustet hat!','Bei allen Göttern! Ich dachte, der wäre längst hingerichtet!','Der Mann hat einen schlechten Tag, seit ich ihn kenne!','Ich gehe lieber unbewaffnet gegen zehn Gladiatoren!','{N}?! BEHALT DEINEN SCHEISS!'],
 knock:['HEY, ALTER SACK! WIR WOLLEN UNSERE GRATISWAFFEN!'],
 roar:['WER VON EUCH DRECKSÄCKEN HAT MEINEN HAMMER UNTERBROCHEN?!'],
 panic:['SCHEISSE! DAS IST DER FALSCHE SCHMIED!'],
 taunt:['GRATIS?! HIER IST DEIN VERDAMMTER RABATT!','ICH SCHMIEDE WAFFEN, KEINE ALMOSEN!','KOMM ZURÜCK, DU HAST DEIN SCHWERT VERGESSEN!','HAHAHAHA! NOCH EIN FREIWILLIGER!','MEIN HAMMER VERHANDELT NICHT!','DU WOLLTEST STAHL?! FRISS STAHL!','RENN NICHT WEG! DIE BERATUNG IST NOCH NICHT VORBEI!','DAS NENNE ICH KUNDENSERVICE!','ICH HABE HEUTE SCHLECHTE LAUNE! WIE JEDEN TAG!','HAHA! DER NÄCHSTE BITTE!'],
 guide:['Kommt, ich zeige euch meinen Freund, den Schmied. Das ist ein richtig feiner Kerl.','Den kenne ich noch aus alten Tagen. Ein Herz aus Gold, sag ich euch.','Hier entlang, meine Herren. Vorsicht, die Stufe. Wir wollen ja nicht, dass sich jemand wehtut.','{N} freut sich immer über Besuch. Wirklich. Immer.','Ihr werdet sehen, der verschenkt seine Sachen ganz von allein.','Wir haben zusammen in der Arena gestanden. Damals hat er schon allen etwas mitgegeben.','Sagt ihm ruhig direkt, was ihr wollt. Er mag ehrliche Leute.','Ein ganz sanfter Mensch. Hört gern zu, redet wenig.','Der hat noch nie jemanden mit leeren Händen gehen lassen. Mit leerem Kopf schon eher.','Ach, wie schön, endlich mal Gäste! Der Hof war so ruhig in letzter Zeit.','Seine Klingen sind die schärfsten im ganzen Umland. Das werdet ihr gleich merken.','Er arbeitet gerade. Klopft ruhig kräftig, er hört manchmal schlecht.','Wenn er brummt, heißt das: Willkommen.','Ich sag immer: {N} ist der Mann, der jedes Problem löst. Endgültig.','Benehmt euch einfach ganz natürlich. So wie am Tor eben.','Nehmt euch Zeit beim Aussuchen. Er hat Zeit. Ihr vermutlich weniger.','Bei {N} gibt es nur zufriedene Kunden. Die anderen beschweren sich nicht mehr.','Fragt ruhig nach dem Besten, was er hat. Er zeigt es euch persönlich.','Seid nicht schüchtern. Schüchtern war der Letzte auch. Der ist jetzt sehr still.','Hier ist es. Die Schmiede. Ich bleib dann mal ein bisschen hier hinten stehen.'],
 jeer:['HAHAHA! Gratiswaffen! Die haben das wirklich geglaubt!','Ich hab doch gesagt, er ist ein feiner Kerl!','Seht ihr? Er gibt euch was umsonst! Eine Lektion!','Das ist die beste Vorstellung des ganzen Monats!','Und dafür zahlen andere Leute Eintritt!','Merkt euch das, Jungs: Nie den Schmied nach Rabatt fragen!','HAHA! Der rennt ja wie ein Huhn ohne … ach, egal!','Wie dumm kann man eigentlich sein?!','Ich kann nicht mehr! Mein Bauch!','Kundenservice! HAHAHA!'],
 ha:['HAHAHA!','HAHA!','SEHT EUCH DAS AN!','DER RENNT!','HAHAHAHA!','GRATIS! HAHA!','ICH KANN NICHT MEHR!','OH NEIN! HAHA!'],
 arms:['Meine Arme! Wo sind meine Arme?!'],
 trip:['Nein! Warte! Ich … uff!'],
 halves:['Wo … wo sind meine Beine?!'],
 cold:['Mir ist so kalt …'],
 follow:['Wo willst du denn hin? Ohne Beine?'],
 kick:['TOOOR!','UND WEG DAMIT!','SCHÖN WEIT!'],
 pig:['DAS SCHWEIN HAT SICH EINGESCHISSEN!'],
 cheer:['JAAAA!','HAHAAA!','DER NÄCHSTE!','HA! SAUBER!'],
 beg:['Warte! Wir können doch über alles reden!'],
 arm:['Mein Arm! Wo ist mein Arm?!'],
 plead:['Bitte! Ich will gar keine Waffen mehr!'],
 late:['Zu spät. Die Beratung läuft schon.'],
 run:['Ich bin hier weg! Ich bin weg!'],
 leg:['Mein Bein! Mein schönes Bein!'],
 shove:['ZURÜCK MIT DIR!','HIER GEHT’S NICHT RAUS!','NIX DA!'],
 last:['UND DU, LEHRLING! WENN NOCH EINER NACH GRATISWAFFEN FRAGT, BIST DU DER NÄCHSTE!','LEHRLING! BRING MIR NOCH EIN BIER! UND EINEN EIMER!','LEHRLING! DAS HIER WIRD AUFGEWISCHT, BEVOR ICH AUSGETRUNKEN HABE!']
};
const fillD=(text,g,salt)=>text.replace(/\{D\}/g,()=>choose(T.texts?.slots?.D||['Freund'],g.id,salt+'D'));
const shoutName=text=>text.replace(/\{N\}(\?!)/g,(_,q)=>smithName().toUpperCase()+q).replace(/\{N\}/g,smithName());
// ---------- Einhängen in die vorhandenen Herumtreiber-Dialoge ----------
const opener=T.opener,options=T.options,answer=T.answer;
T.opener=g=>eligible(g)?fillD(choose(L.demand,g.id,'demand'),g,'demand'):opener(g);
T.options=g=>{const list=options(g);if(eligible(g))list.push({tone:'schmied',text:shoutName(choose(L.offer,g.id,'offer'))});return list;};
T.answer=(g,tone,outcome)=>tone!=='schmied'?answer(g,tone,outcome):outcome==='WRATH'?choose(L.accept,g.id,'accept'):shoutName(choose(L.flee,g.id,'flee'));
const outcomeOf=g=>roll(g.id,'accept')<ACCEPT?'WRATH':'FLEE';
const PLAIN='<p class="readiness ready">Kein Kampf · die Gruppe zieht ab.</p><div class="buttons"><button class="btn primary" data-action="wanderer:leave">WEITER</button></div>';
function decorate(html){const g=WD.state().group;if(!html||g?.talk?.tone!=='schmied'||!html.includes(PLAIN))return html;const wrath=g.talk.outcome==='WRATH';
 return html.replace(PLAIN,wrath?`<p class="readiness warning">Die Gruppe marschiert zur Schmiede.</p><div class="buttons"><button class="btn primary" data-action="wrath:go">▶ ZUR SCHMIEDE</button></div>`:`<p class="readiness ready">Panik vor dem Tor.</p><div class="buttons"><button class="btn primary" data-action="wrath:go">▶ ANSEHEN</button></div>`);}
const page=M.schoolPage;M.schoolPage=p=>{const html=page(p);return p==='home'||p==='wanderers'?decorate(html):html;};
// ---------- Szene ----------
let sc=null,clock=0;
const lerp=(a,b,k)=>a+(b-a)*Math.max(0,Math.min(1,k)),between=(t,a,b)=>t>=a&&t<b;
function smithActor(){const p=W().master,rng=S.rng,g=M.makeGladiator(0);Object.assign(g,{id:'wrath-smith',name:p.name,height:p.height,weight:p.weight,muscle:58,fame:0,scars:[]});g.appearance={...p.appearance};g.equipment={weapon:null,secondary:null,shield:null,armor:{}};g.enemyGear={weapon:null,secondary:M.makeItem('weapon','gladius',1),shield:null,armor:{}};S.rng=rng;return {id:g.id,g,team:0,x:748,y:240,a:Math.PI,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,forgeWorker:true,forgeHold:'beer',bloodMarks:{}};}
function victim(m,i){const g=JSON.parse(JSON.stringify(m));g.dead=false;return {id:'wrath-'+i,g,team:1,x:0,y:0,a:0,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,bloodMarks:{},index:i};}
// Wege: [Zeit, x, y]. Zwischen den Punkten wird gleichmäßig gegangen; Tempo bleibt menschlich (Schmied höchstens ~65 px/s, Flüchtende ~50).
function at(path,t){if(t<=path[0][0])return {x:path[0][1],y:path[0][2],v:0,dx:0};for(let i=1;i<path.length;i++){const [t1,x1,y1]=path[i],[t0,x0,y0]=path[i-1];if(t<=t1){const k=(t-t0)/(t1-t0||1);return {x:x0+(x1-x0)*k,y:y0+(y1-y0)*k,v:Math.hypot(x1-x0,y1-y0)/(t1-t0||1),dx:x1-x0};}}const q=path[path.length-1];return {x:q[1],y:q[2],v:0,dx:0};}
// Tötungsarten: jedes Opfer anders. Immer einer weicht zurück und stolpert rückwärts; ab drei wird einer durchtrennt und kriecht,
// bis er nach etwa fünf Metern verblutet; manchmal kickt der Schmied einen Kopf weg. Ausgewürfelt bei jedem Besuch (Math.random, kein Spielzufall).
const METHODS=['arm','twoarms','leg','throat'];
function methodsFor(n){const out=Array(n).fill(null),rest=[...METHODS].sort(()=>Math.random()-.5),free=()=>out.map((m,i)=>m?-1:i).filter(i=>i>=0),put=(m,cands)=>{const c=cands.filter(i=>i<n&&!out[i]);if(c.length)out[c[Math.floor(Math.random()*c.length)]]=m;};
 // Mittendurch nur, wo der Oberkörper waagrecht Platz zum Wegkriechen hat (Tür, Südwesten, Bettler)
 if(n>=3)put('bisect',[0,1,4]);put('stumble',[0,1,3,4]);let k=0;for(const i of free())out[i]=rest[k++%rest.length];return out;}
function plan(n,forced){
 // Ankunft und Anklopfen. Danach die Jagd: Die Herumtreiber laufen weg oder weichen zurück, niemand legt sich ohne Grund hin.
 // Ab drei Herumtreibern macht sich einer in die Hose. Nach jedem Kopf jubelt der Schmied.
 const p={n,end:0,kills:[],says:[],sips:[],laughs:[],cheers:[],vic:[],falls:[],kneels:[],shoves:[],backs:[],soil:null,pops:[],kicks:[],deaths:[],crawls:[],methods:forced||methodsFor(n)};
 const head0=p.methods.map((m,i)=>['arm','twoarms','leg','stumble'].includes(m)?i:-1).filter(i=>i>=0);p.kickWho=Math.random()<.75&&head0.length?head0[Math.floor(Math.random()*head0.length)]:-1;
 const S0=[[712,268],[688,274],[664,280],[668,302],[692,302]];
 for(let i=0;i<n;i++)p.vic[i]=[[0,618,312+i*22],[1.7+i*.1,S0[i][0],S0[i][1]]];
 p.vic[0].push([1.9,712,268],[2.3,722,266]);
 p.says.push([2.1,3.7,'v0',L.knock[0]]);
 p.door=4.1;p.says.push([4.7,6.3,'s',L.roar[0]]);p.sips.push([4.25,4.7]);
 const sm=p.smith=[[0,748,240],[p.door+.2,748,246],[6.3,748,246],[6.75,738,264]];let free=6.75;
 const go=(t,x,y,v=46)=>{[x,y]=clear(x,y);const [t0,x0,y0]=sm[sm.length-1],s=Math.max(t,t0,free);if(s>t0)sm.push([s,x0,y0]);const w=walk([[x0,y0],[x,y]],s,v);sm.push(...w.slice(1));free=w[w.length-1][0];return free;};
 const at0=()=>sm[sm.length-1];
 // Kein Jubel nach dem Töten: nur ein kurzer Moment Ruhe, bevor es weitergeht
 const cheer=t=>{free=Math.max(free,t+.5);};
 const hit=(who,t,part,o={})=>{const w=Math.max(t,free+.25);p.kills.push({who,swing:w,part,...o});free=w+.35;if(part==='head'&&!o.kick)cheer(w+.45);return w;};
 const say=(a,who,text)=>{p.says.push([a,a+1.6,who,text]);};
 const path=(i,...pts)=>p.vic[i].push(...pts),back=(i,a,b)=>p.backs.push([i,a,b]);
 const pick=list=>list[Math.floor(Math.random()*list.length)];
 // Fallrichtung so wählen, dass der Körper frei liegt (nicht über Schleifstein, Bank, Brunnen … und nicht auf der Schmiede)
 const clearDir=(x,y,pref)=>{const ok=M.sceneNav?.lyingClear;if(!ok)return pref;return ok(x,y,pref)||!ok(x,y,-pref)?pref:-pref;};
 // Kopf ab (stehend oder liegend), manchmal danach Kopf wegkicken
 // Kopf ab (stehend oder liegend). Liegend: Schmied steht hinter dem Körper, das Klingenende trifft den Hals
 // (Hals liegt 50 vor den Füßen bei Bauchlage, 31 bei Rückenlage; das Klingenende landet etwa 20 vor dem Schmied).
 const head=(i,t,vx,vy,dir,lying,fs=1)=>{const kick=p.kickWho===i,nk=lying?vx+dir*(fs===1?50:31):vx;if(lying)go(t-1.7,nk-dir*20,vy-5,24);
  const w=hit(i,t,'head',{kick,lying,tx:lying?nk+dir*6:vx,hd:lying?undefined:clearDir(vx,vy,dir)});
  if(!kick)return [at0()[1],at0()[2]];const hx=lying?nk+dir*13:vx+dir*16,hy=vy+(lying?2:4),kd=(x=>x>360&&x<850&&!M.sceneNav?.inside?.(x,hy))(hx+dir*90)?dir:-dir;go(w+.55,hx-kd*9,hy+3,26);const k=free+.2;p.kicks.push({who:i,t:k,dir:kd});say(k+.3,'s',pick(L.kick));cheer(k+.5);return [hx-kd*9,hy+3];};
 // Ein Opfer erledigen: Schmied steht bei A neben ihm (dir = Richtung Schmied → Opfer). Gibt den Standort des Schmieds danach zurück.
 function exec(i,A,vx,vy,dir){const m=p.methods[i],V='v'+i;
  if(m==='arm'){const w=hit(i,A,dir>0?'rua':'lua');say(w+.3,V,L.arm[0]);const bx=vx+dir*16,by=vy+3;path(i,[w+.3,vx,vy],[w+1.6,bx,by]);back(i,w+.3,w+1.6);go(w+.8,bx-dir*15,by,24);return head(i,w+1.9,bx,by,dir,false);}
  if(m==='twoarms'){let w=hit(i,A,'lua');w=hit(i,w+.7,'rua');say(w+.3,V,L.arms[0]);p.sips.push([w+.6,w+1.7]);free=Math.max(free,w+1.8);return head(i,w+2,vx,vy,dir,false);}
  if(m==='leg'){const hd=clearDir(vx+dir*18,vy+3,dir),w=hit(i,A,dir>0?'rt':'lt',{hd});say(w+.4,V,L.leg[0]);const cx=vx+hd*18,cy=vy+3;path(i,[w+1,vx,vy],[w+3.2,cx,cy]);p.crawls.push({who:i,t0:w+1,t1:w+3.2});return head(i,w+3.6,cx,cy,hd,true,1);}
  if(m==='stumble'){// weicht rückwärts zurück und fällt auf den Rücken
   const bx=vx+dir*18,by=vy+2;path(i,[A,vx,vy],[A+1.5,bx,by]);back(i,A,A+1.5);p.falls[i]={t:A+1.5,hd:dir,fs:-1};say(A+1.4,V,L.trip[0]);return head(i,A+3.6,bx,by,dir,true,-1);}
  if(m==='throat'){// Schmied geht vorn herum, steht hinter ihm, Kehle durch; taumelt nach vorn und fällt
   const fd=clearDir(vx-dir*10,vy,-dir),sd=-fd;if(sd===dir){go(A+.2,vx,vy+12,30);}const B=sd===dir?go(0,vx+dir*14,vy,30):A;path(i,[A,vx,vy],[B+.3,vx,vy]);const w=hit(i,B+.25,'throat',{tx:vx});path(i,[w+.2,vx,vy],[w+1.4,vx+fd*10,vy]);p.falls[i]={t:w+1.4,hd:fd,fs:1};p.deaths.push([i,w+2.3]);cheer(w+1.6);return [sd===dir?vx+dir*14:vx-dir*14,vy];}
  if(m==='bisect'){// mittendurch: Beine bleiben liegen, der Oberkörper kriecht Arm für Arm weiter und verblutet nach etwa fünf Metern
   const w=hit(i,A,'bisect',{hd:dir});p.falls[i]={t:w+.12,hd:dir,fs:1};say(w+.6,V,L.halves[0]);const tx=Math.max(345,Math.min(860,vx+dir*120)),ty=[vy+6,vy-8,vy+14,vy-14].find(y=>M.sceneNav?.lyingClear?.(tx,y,dir))??vy+6,way=M.sceneNav?.route?M.sceneNav.route([[vx,vy],[tx,ty]]):[[vx,vy],[tx,ty]];
   const crawl=walk(way,w+1.2,12.5),endT=crawl[crawl.length-1][0];path(i,[w+1.2,vx,vy],...crawl.slice(1));p.crawls.push({who:i,t0:w+1.2,t1:endT,bisect:true});p.deaths.push([i,endT+.9]);cheer(w+.5);
   // Der Schmied schlendert mit Bier hinterher und schaut zu, bis der Kriechende verblutet ist
   const fx=tx-dir*44,fy=ty+6;say(w+2.6,'s',L.follow[0]);go(w+2.3,fx,fy,Math.max(8,Math.hypot(fx-at0()[1],fy-at0()[2])/Math.max(1,endT-w-2.8)));p.sips.push([free+.1,endT-.4]);say(endT-2.6,V,L.cold[0]);free=Math.max(free,endT+.9);cheer(endT+1.1);return [fx,fy];}
  return head(i,A,vx,vy,dir,false);}
 // 0: weicht von der Tür zurück in die freie Gasse unterhalb des Werkhofs, dort holt ihn der Schmied ein
 path(0,[4.8,722,266],[6.8,700,297]);back(0,4.8,6.8);let A0=go(6.75,716,297,40);let pos=exec(0,A0,700,297,-1);
 if(n===1){say(free+.2,'s',choose(L.taunt,sc0id,'t0'));return finale(p,free,...pos);}
 say(7.3,'v1',L.panic[0]);
 // Ab drei: einer macht sich vor Angst in die Hose, als der Schmied loslegt
 if(n>=3){p.soil={who:2,t:7.0};p.pops.push([7.6,'HAHAHA! GUCKT EUCH DEN AN!']);}
 // 1: flieht nach Südwesten, weicht vor dem Schmied zurück
 path(1,[7.6,688,274],[9.2,660,296],[10.6,640,322],[11.8,622,352],[12.4,616,370]);
 say(free+.1,'s',choose(L.taunt,sc0id,'t0'));
 let A=go(0,618,378,46);path(1,[A-1.3,616,370],[A,603,384]);back(1,A-1.3,A);pos=exec(1,A,603,384,-1);
 if(n===2)return finale(p,free,...pos);
 // 2 (eingeschissen): rennt um den Brunnen, wartet zitternd, weicht zurück
 path(2,...walk([[664,280],[680,306],[684,336],[700,380],[770,392],[786,370],[770,394]],7.7,34));
 say(free+.1,'s',L.pig[0]);A=go(0,774,398,50);path(2,[A-1.5,770,394],[A,790,398]);back(2,A-1.5,A);pos=exec(2,A,790,398,1);
 // 3 und 4 warten am Rand: 3 rennt zu den lachenden Gladiatoren und wird zurückgeschubst, 4 weicht zurück
 if(n>=4){path(3,[7.8,668,302],[9.6,650,328],[11.0,640,404]);p.shoves.push([11.0,11.9]);path(3,[11.9,640,404],[12.7,654,382]);}
 if(n>=5){path(4,[7.6,692,302],[9.6,684,330]);back(4,7.6,9.6);
  // 4: bettelt, weicht zurück, rennt dann doch los und wird eingeholt
  const ask=free+.1;say(ask,'v4',L.plead[0]);A=go(free+.2,688,330,40);path(4,[A-1.5,684,330],[A,670,334]);back(4,A-1.5,A);
  const late=Math.max(A+.2,ask+4.1);say(late,'s',L.late[0]);p.sips.push([A+.1,late-.2]);free=Math.max(free,late+.4);
  const run=late+2.4;A=go(run+.3,656,360,30);path(4,[run,670,334],[A,641,366]);pos=exec(4,A+.05,641,366,-1);}
 // 3: rennt los, sobald der Schmied kommt, weg vom Schmied, und wird eingeholt
 if(n>=4){const [,sx,sy]=at0(),dir=sx>654?-1:1,Xe=654+dir*86,T=[Xe-dir*16,407],D=Math.hypot(T[0]-sx,T[1]-sy),e=Math.max(free,free+D/36-3);
  say(e-.2,'v3',L.run[0]);path(3,[e,654,382],[e+1.6,654+dir*36,398],[e+2.4,654+dir*64,404],[e+3.2,Xe,408]);
  A=go(e,T[0],T[1],36);pos=exec(3,Math.max(A+.1,e+3.3),Xe,408,dir);}
 return finale(p,free,...pos);}
let sc0id='';
const LEFT=[[630,446],[656,454],[684,444]],RIGHT=[[846,298],[866,320],[832,326]],LANISTA=[822,304];
// Vorspiel: Der Lanista führt die Gruppe vom Tor her zur Schmiede, die übrigen Gladiatoren stellen sich mit Abstand dazu.
function prelude(n){const speed=34,routes=[];for(let i=0;i<n;i++){const pts=[[612,566+i*22],[614,420],[618,312+i*22]],len=pts.slice(1).reduce((v,q,k)=>v+Math.hypot(q[0]-pts[k][0],q[1]-pts[k][1]),0);routes.push(walk(pts,-len/speed,speed));}const off=Math.ceil(Math.max(...routes.map(r=>-r[0][0]))+.6);const lan=[...walk([[634,548],[636,410],[640,300]],-off+.6,speed),[0,640,300],[1.4,700,300],[3.2,LANISTA[0],LANISTA[1]]];return {off,routes,lan};}
function walk(points,t0,speed){points=M.sceneNav?.route?M.sceneNav.route(points):points;let t=t0;return points.map((q,i)=>{if(i)t+=Math.hypot(q[0]-points[i-1][0],q[1]-points[i-1][1])/speed;return [t,q[0],q[1]];});}
// Zielpunkte nie in einem Hindernis (Kohlen, Bank …): an den Rand schieben
function clear(x,y){if(!M.sceneNav?.inside?.(x,y))return [x,y];const d={id:'pt',x,y,a:0,g:{}};M.sceneNav.resolve([d]);return [d.x,d.y];}
function finale(p,t,x,y){{const last=p.smith?.[p.smith.length-1];if(last){x=last[1];y=last[2];}}p.vic=p.vic.map(v=>{for(const q of v){[q[1],q[2]]=clear(q[1],q[2]);}for(let i=1;i<v.length;i++)if(v[i][0]<v[i-1][0])v[i][0]=v[i-1][0];return M.sceneNav?.route?M.sceneNav.route(v):v;});p.inspect=[t,t+.7];p.sips.push([t+.7,t+1.6]);p.says.push([t+2.6,t+4.9,'s',choose(L.last,sc0id,'last')]);const back=t+2.8,home=walk([[x,y],[760,302],[748,246]],back,50),arrive=home[home.length-1][0];p.smith.push(...home,[arrive+.4,748,238]);p.gone=arrive+.4;p.end=Math.max(Math.min(p.gone+.5,t+5.3),...p.deaths.map(d=>d[1]+1.4));return p;}
function fleePlan(n){const p={flee:true,n,says:[[.3,2.4,'v0','']],vic:[],end:3.8};const xs=[610,586,634,562,658];for(let i=0;i<n;i++){const x=xs[i],y=596-(i?6:0),go=1+i*.2;p.vic[i]=[[0,x,y],[go,x,y],[go+.6,x+(i%2?-6:i?6:0),y+30],[go+1.8,610+(i-1)*8,700]];}return p;}
function crowdOf(){return S.roster.filter(g=>!g.dead&&!g.smithDuty).slice(0,6).map((m,i)=>{const g=JSON.parse(JSON.stringify(m)),spot=(i%2?LEFT:RIGHT)[Math.floor(i/2)],from=i%2?[594-Math.floor(i/2)*16,spot[1]+22]:[900,spot[1]];return {id:'crowd-'+i,g,team:0,x:from[0],y:from[1],a:0,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,bloodMarks:{},spot,from,index:i};});}
function start(){const st=WD.state(),g=st.group;if(!g||g.talk?.tone!=='schmied'||S.battle||sc)return false;const outcome=g.talk.outcome,members=g.members.slice(0,5),leader=g.leader.name;sc0id=g.id;
 // Ergebnis sofort verbuchen: Gruppe weg, Erinnerung vermerkt. Erst danach wird nur noch gezeigt.
 WD.decline();const entry=st.known.find(k=>k.name===leader);
 // Wie nach jedem Kampf sieht der Schmied die Ausrüstung der Erschlagenen: gleiche Rezeptlogik wie in der Arena.
 const F=W(),known=[...(F.recipes||[])],refs=[...(F.refinements||[])];if(outcome==='WRATH')M.workshop.encounter?.({id:'wrath-'+g.id,actors:members.map(m=>({team:1,g:m}))});const found=[...(F.recipes||[]).filter(r=>!known.includes(r)).map(()=>'Schmiederezept'),...(F.refinements||[]).filter(r=>!refs.includes(r)).map(()=>'Verfeinerungsrezept')];if(entry)entry.outcome=outcome==='WRATH'?'vom Schmied erschlagen':'vor dem Schmied geflohen';M.persist();
 const n=members.length;sc={found,t:0,outcome,p:outcome==='WRATH'?plan(n,M.smithWrath?.force?.slice(0,n)):fleePlan(n),vic:members.map(victim),smith:outcome==='WRATH'?smithActor():null,limbs:[],fx:[],done:{},say:null,cam:{x:680,y:280}};
 if(outcome==='WRATH'){const pre=prelude(n);sc.off=pre.off;sc.pre=pre;sc.crowd=crowdOf();sc.lan=S.lanista?{id:'wrath-lanista',g:M.ludus.ownerFigure(S.lanista),lanista:true,team:0,x:634,y:548,a:0,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,bloodMarks:{}}:null;const bag=[...L.guide].sort(()=>Math.random()-.5);sc.guide=[[-pre.off+.6,-.4,bag[0]],[.1,1.95,bag[1]]];sc.jeer=[...L.jeer].sort(()=>Math.random()-.5);sc.ha=[];sc.lastJeer=0;sc.lanSay=null;sc.t=-pre.off;}
 if(outcome==='FLEE')sc.p.says[0][3]=shoutName(choose(L.flee,g.id,'flee'));
 sc.view=document.createElement('div');sc.view.id='smithWrath';sc.view.className='smith-ceremony smith-intro smith-wrath no-smith-song';sc.view.setAttribute?.('role','dialog');sc.view.setAttribute?.('aria-modal','true');sc.view.setAttribute?.('aria-label',outcome==='WRATH'?'Der Zorn des Schmieds':'Panische Flucht');
 sc.view.innerHTML='<div><div class="scene-bubble-slot"><div class="scene-bubble" id="smithWrathBubble" hidden></div></div><canvas id="smithWrathCanvas" width="660" height="420" data-action="wrath:tap"></canvas><p id="smithWrathText" aria-live="polite"></p><button class="btn" data-action="wrath:skip">ÜBERSPRINGEN →</button></div>';document.body.appendChild(sc.view);
 sc.cam=outcome==='WRATH'?{x:690,y:282}:{x:610,y:560};M.ui.render();return true;}
function end(){if(!sc)return;const found=sc.found||[];sc.view?.remove?.();sc=null;M.ui.render();if(found.length)M.ui.notify(smithName()+' hat sich die Ausrüstung der Toten angesehen: '+found.length+' '+(found.length===1?found[0]:'neue Rezepte')+' entdeckt.');}
function once(k,fn){if(sc.done[k])return;sc.done[k]=true;fn();}
function blood(x,y,n,dir=1){for(let i=0;i<n;i++)sc.fx.push({x,y,z:38+Math.random()*8,vx:dir*(10+Math.random()*30),vy:Math.random()*14-7,vz:18+Math.random()*26,life:.6+Math.random()*.5,size:2,color:i%3?'#aa3c36':'#87352e'});}
function dust(x,y,n){for(let i=0;i<n;i++)sc.fx.push({x:x+Math.random()*10-5,y,z:2+Math.random()*6,vx:(Math.random()-.5)*60,vy:(Math.random()-.5)*8,vz:12+Math.random()*24,life:.5+Math.random()*.4,size:2,color:'#c9b586'});}
// Kriechen wie im Attentat: Arm vor, Pause, ruckartiger Zug (gleiche mittlere Geschwindigkeit)
const PULL=.6;function pull(t,t0){const tau=t-t0,n=Math.floor(tau/PULL),u=(tau%PULL)/PULL,k=u<.45?0:Math.min(1,(u-.45)/.35);return t0+(n+k*k*(3-2*k))*PULL;}
// Flugbahn eines Körperteils so wählen, dass es frei landet (nicht auf Schrein, Amphore, Puppe …): Richtung oder Weite anpassen
function rest(l,k){let x=l.x,y=l.y,z=l.z,vx=l.vx*k,vy=l.vy*k,vz=l.vz;const dt=1/30;for(let i=0;i<240;i++){if(z<=0&&Math.abs(vz)<4)break;x+=vx*dt;y+=vy*dt;vz-=200*dt;z=Math.max(0,z+vz*dt);if(!z&&vz<0){vz=-vz*.35;vx*=.5;vy*=.5;}}return [x,y];}
function aim(l){const ok=M.sceneNav?.spotClear;if(!ok)return;for(const k of [1,.7,.45,.25,-1,-.6,-.3,0,-2,-3,2,3]){const [x,y]=rest(l,k);if(ok(x,y)&&ok(x,y-3)&&ok(x,y+3)){l.vx*=k;l.vy*=k;if(k<0)l.spin=-l.spin;return;}}}
const lieDir=v=>(v.fallSide||1)*(Math.cos(v.a||0)>=0?1:-1)>=0?1:-1;
function sever(v,part,dir){const g=v.g;for(const k of M.branches[part]||[part])if(g.body[k])g.body[k].missing=true;const lying=v.down||v.fallTimer>0,ls=lieDir(v),off={head:v.fallSide===1?63:44,lua:34,rua:34,lt:14,rt:14}[part]??30;
 sc.limbs.push(lying?{x:v.x+ls*off,y:v.y+1,z:6,angle:0,part,skin:g.appearance.skin,hair:g.appearance.hair,g,vx:dir*10,vy:3,vz:20,spin:dir*4}:{x:v.x+dir*4,y:v.y,z:part==='head'?52:38,angle:0,part,skin:g.appearance.skin,hair:g.appearance.hair,g,vx:dir*(part==='head'?26:34),vy:6,vz:part==='head'?40:30,spin:dir*(part==='head'?6:9)});
 aim(sc.limbs[sc.limbs.length-1]);
 if(lying){for(let i=0;i<(part==='head'?16:10);i++)sc.fx.push({x:v.x+ls*off,y:v.y,z:4+Math.random()*6,vx:dir*(8+Math.random()*24),vy:Math.random()*10-5,vz:14+Math.random()*20,life:.6+Math.random()*.5,size:2,color:i%3?'#aa3c36':'#87352e'});}else blood(v.x,v.y,part==='head'?18:12,dir);M.sound?.('sever');}
function pose(t){const p=sc.p,s=sc.smith;
 // Herumtreiber
 sc.vic.forEach((v,i)=>{v.traderPose=null;for(const [w,d] of p.deaths||[])if(w===i&&t>=d&&!v.g.dead){v.g.dead=true;v.down=true;v.fallTimer=0;M.sound?.('die');}
  if(v.g.dead&&v.down){v.state='idle';v.moveSpeed=0;v.kneeTimer=0;v.facePain=0;if(v.lieA!=null)v.a=v.lieA;return;}const path=p.vic[i];if(!path)return;const cr=(p.crawls||[]).find(c=>c.who===i&&between(t,c.t0,c.t1)),q=at(path,cr?pull(t,cr.t0):t);v.x=q.x;v.y=q.y;v.moveSpeed=q.v>3?10:0;v.state=q.v>3?'move':'idle';v.phase=t*(q.v>40?11:7)+i;if(q.dx)v.a=q.dx>0?0:Math.PI;
  const scared=p.flee?t>.8:t>=p.door;v.retreat=scared?1:0;v.facePain=scared&&!q.v?.3:0;
  if(!p.flee&&t<p.door&&i===0&&between(t,2.1,3.7)){v.state='charge';v.a=0;}
  if(!p.flee&&t<p.door&&q.v<3)v.a=0;
  if(p.flee&&t<1)v.a=0;
  // Zurückweichen: Blick zum Schmied, Füße gehen rückwärts
  for(const [w,a,b] of p.backs||[])if(w===i&&between(t,a,b)&&sc.smith){v.a=sc.smith.x>=v.x?0:Math.PI;v.retreat=1;}
  if(v.throatCut){v.facePain=1;v.retreat=1;}
  if(p.soil?.who===i&&t>=p.soil.t)once('soil',()=>{sc.soilSpot={x:v.x,y:v.y};});
  v.kneeTimer=0;for(const [w,a,b] of p.kneels||[])if(w===i&&between(t,a,b)&&!v.down){v.kneeDuration=b-a;v.kneeTimer=b-t;v.kneeRise=Math.min(.45,(b-a)/2);v.state='idle';v.moveSpeed=0;v.facePain=.6;}
  // Hinfallen (rückwärts gestolpert, Bein ab, Kehle durch): Kopf zeigt in Richtung hd; danach am Boden Arm für Arm weiterkriechen
  const f=p.falls?.[i];if(f&&t>=f.t){if(v.lieA==null){if(f.fs){v.fallSide=f.fs;v.lieA=(f.fs===1)===(f.hd>0)?0:Math.PI;}else{v.lieA=v.a;v.fallSide=f.hd*(Math.cos(v.lieA)>=0?1:-1);}}v.a=v.lieA;const k=t-f.t;v.state='idle';v.moveSpeed=0;v.kneeTimer=0;if(k<.9&&!v.splitPiece){v.fallTimer=2.1-k;v.fallDuration=2.1;}else{v.fallTimer=0;v.down=true;v.facePain=1;if(q.v>1){v.traderPose=Math.floor(t/.6)%2?'pat':'point';v.gest=t*3;}}}});
 for(const l of sc.legs||[]){l.state='idle';l.moveSpeed=0;}
 if(!s)return;
 // Schmied
 s.state='idle';s.moveSpeed=0;s.wind=0;s.swing=0;s.technique=null;s.forgePose='';s.kickTimer=0;s.shoutTimer=0;s.phase=t*4;
 s.hidden=t<p.door||(p.gone&&t>=p.gone);const q=at(p.smith,t);s.x=q.x;s.y=q.y;if(q.v>3){s.state='move';s.moveSpeed=q.v>45?16:10;s.phase=t*(q.v>45?9:6);s.a=q.dx>=0?0:Math.PI;}
 for(const [a,b] of p.sips)if(between(t,a,b))s.forgePose='sip';
 s.jumpTimer=0;for(const [a,b] of p.laughs)if(between(t,a,b)&&q.v<3){s.state='celebrate';s.forgePose='';const u=(t-a)%.6;if(u<.26)s.jumpTimer=.26-u;}
 for(const c of p.cheers||[])if(t>=c)once('cheer'+c,()=>{sc.ha=(sc.ha||[]).filter(h=>h.who!==s);sc.ha.push({who:s,text:L.cheer[Math.floor(Math.random()*L.cheer.length)],until:t+1.4,loud:true});});
 for(const k of p.kicks||[]){if(between(t,k.t-.26,k.t+.22)){s.kickTimer=k.t+.22-t;s.a=k.dir>0?0:Math.PI;s.state='idle';}if(t>=k.t)once('kick'+k.who,()=>{const v=sc.vic[k.who],h=sc.limbs.find(l=>l.part==='head'&&l.g===v?.g);if(!h)return;h.x=s.x+k.dir*9;h.y=s.y-1;h.z=3;h.vx=k.dir*(150+Math.random()*30);h.vy=(Math.random()-.5)*24;h.vz=78;h.spin=k.dir*16;aim(h);blood(h.x,h.y,8,k.dir);M.sound?.('hit');});}
 if(p.inspect&&between(t,...p.inspect)){s.forgePose='inspect';s.a=Math.PI;}
 if(between(t,4.7,6.3)){s.state='charge';s.shoutTimer=.3;}
 for(const k of p.kills){const v=sc.vic[k.who],w=k.swing;if(!v)continue;const tx=k.tx??v.x;if(between(t,w-1.1,w+.8)&&q.v<3&&!s.kickTimer)s.a=tx>=s.x?0:Math.PI;
  if(between(t,w-.3,w)){s.technique='overhead';s.windMax=.3;s.wind=w-t;}
  if(between(t,w,w+.25)){s.swingKind='slash';s.swingMax=.25;s.swing=w+.25-t;}
  const dir=tx>=s.x?1:-1;
  if(t>=w+.12)once('hit'+k.who+k.part,()=>{
   if(k.part==='throat'){v.throatCut=true;M.sound?.('sever');for(let n=0;n<14;n++)sc.fx.push({x:v.x+(Math.cos(v.a)>=0?3:-3),y:v.y,z:44,vx:(Math.cos(v.a)>=0?1:-1)*(16+Math.random()*30),vy:Math.random()*8-4,vz:10+Math.random()*24,life:.7,size:2,color:n%2?'#aa3c36':'#87352e'});return;}
   if(k.part==='bisect'){const hd=k.hd||dir;v.lieA=hd>0?0:Math.PI;v.a=v.lieA;v.fallSide=1;v.down=true;v.splitPiece='upper';v.bleeding=true;v.stagger=0;
    const legs={...v,id:v.id+'-beine',g:v.g,splitPiece:'lower',bloodMarks:{},traderPose:null};(sc.legs??=[]).push(legs);sc.splitAt={x:v.x,y:v.y,hd};
    for(let n=0;n<26;n++)sc.fx.push({x:v.x+hd*25,y:v.y,z:6+Math.random()*10,vx:(Math.random()-.5)*70,vy:Math.random()*14-7,vz:20+Math.random()*34,life:.7+Math.random()*.5,size:2,color:n%3?'#aa3c36':'#87352e'});M.sound?.('sever');return;}
   sever(v,k.part,dir);if(k.part==='head'){v.g.dead=true;v.down=true;v.kneeTimer=0;v.fallTimer=0;if(v.lieA==null){v.lieA=v.a;v.fallSide=(k.hd||dir)*(Math.cos(v.a)>=0?1:-1);}}else if(/^(lt|rt|lsh|rsh)$/.test(k.part)){if(!p.falls[k.who])p.falls[k.who]={t:w+.12,hd:k.hd||dir,fs:1};}else v.stagger=.5;});}
 if(sc.pre&&t<0)sc.vic.forEach((v,i)=>{const q=at(sc.pre.routes[i],t);v.x=q.x;v.y=q.y;v.state=q.v>3?'move':'idle';v.moveSpeed=q.v>3?10:0;v.phase=t*7+i;v.a=0;v.retreat=0;v.facePain=0;});
 crowd(t);
 if(t>=p.door)once('door',()=>{M.sound?.('heavy');dust(748,238,20);sc.view?.classList?.remove('no-smith-song');});}
function crowd(t){if(!sc.crowd)return;const p=sc.p,first=p.kills?.[0]?.swing??1e9,live=sc.vic.find(v=>!v.g.dead)||sc.smith,cx=(sc.smith&&!sc.smith.hidden?sc.smith.x:748),laughing=t>=first-.1&&t<p.end-.4;
 const look=x=>cx>=x?0:Math.PI;
 for(const c of sc.crowd){c.state='idle';c.moveSpeed=0;c.traderPose=null;c.facePain=0;const k=Math.min(1,Math.max(0,(t+sc.off-.4-c.index*.35)/4.2));c.x=lerp(c.from[0],c.spot[0],k);c.y=lerp(c.from[1],c.spot[1],k);if(k>0&&k<1){c.state='move';c.moveSpeed=10;c.phase=t*7+c.index;c.a=c.spot[0]>=c.from[0]?0:Math.PI;}else c.a=look(c.x);
  if(laughing){const u=(t*.75+c.index*.37)%1;if(u<.62)c.state='celebrate';else{c.traderPose='point';c.gest=t;}c.y=c.spot[1]+(u<.62?Math.round(Math.sin(t*14+c.index)):0);}}
 const l=sc.lan;if(!l)return;l.state='idle';l.moveSpeed=0;l.traderPose=null;const q=at(sc.pre.lan,t);l.x=q.x;l.y=q.y;if(q.v>3){l.state='move';l.moveSpeed=10;l.phase=t*6;l.a=q.dx>0?0:q.dx<0?Math.PI:l.a;}else l.a=t<0?0:look(l.x);
 if(laughing){const u=(t*.6)%1;if(u<.55)l.state='celebrate';else l.traderPose='point';}
 for(const [a,text] of p.pops||[])if(t>=a)once('pop'+a,()=>{const c=sc.crowd.reduce((m,x)=>!m||Math.hypot(x.x-sc.cam.x,x.y-sc.cam.y)<Math.hypot(m.x-sc.cam.x,m.y-sc.cam.y)?x:m,null);if(c){sc.ha=sc.ha.filter(h=>h.who!==c);sc.ha.push({who:c,text,until:t+2.6});}});
 // Wer zu den Zuschauern flieht, wird zurückgeschubst
 for(const [a,b] of p.shoves||[])if(between(t,a,b)){const v=sc.vic[3];if(!v)break;const c=sc.crowd.reduce((m,x)=>!m||Math.hypot(x.x-v.x,x.y-v.y)<Math.hypot(m.x-v.x,m.y-v.y)?x:m,null);if(c){c.state='idle';c.traderPose='pull';c.gest=t*4;c.a=v.x>=c.x?0:Math.PI;once('shove'+a,()=>{sc.ha=sc.ha.filter(h=>h.who!==c);sc.ha.push({who:c,text:L.shove[Math.floor(Math.random()*L.shove.length)],until:t+1.8});M.sound?.('hit');});}}
 // Lacher über den Köpfen, sparsam
 if(laughing&&Math.floor(t/1.9)!==sc.haTick){sc.haTick=Math.floor(t/1.9);const who=sc.crowd[Math.floor(Math.random()*sc.crowd.length)];if(who&&sc.ha.length<2&&!sc.ha.some(h=>h.who===who))sc.ha.push({who,text:L.ha[Math.floor(Math.random()*L.ha.length)],until:t+1.8});}
 sc.ha=sc.ha.filter(h=>h.until>t);
 if(laughing&&!sc.lanSay&&(sc.jeers||0)<2&&t-sc.lastJeer>7&&t>first+1.5){sc.lanSay={text:sc.jeer.pop()||L.jeer[0],from:t,until:t+.1};sc.lastJeer=t;sc.jeers=(sc.jeers||0)+1;}if(sc.lanSay&&t>=sc.lanSay.until)sc.lanSay=null;}
function gait(list,ds){sc.odo??={};for(const p of list){if(!p)continue;const o=sc.odo[p.id]??={x:p.x,y:p.y,d:0};const dx=p.x-o.x,d=Math.hypot(dx,p.y-o.y);o.x=p.x;o.y=p.y;if(p.state==='move'&&d>.05&&d<40){o.d+=d;p.phase=o.d*.267;p.moveSpeed=Math.max(8,d/Math.max(ds,1e-3)/.6);
  // Nach oben/unten: kurze Schritte statt weit ausholender Seitschritte (die Figur läuft ins Bild hinein, nicht quer)
  const side=Math.abs(dx)/d;o.side=(o.side??side)*.8+side*.2;p.gaitSpeed=p.moveSpeed*(.28+.72*o.side);}else p.gaitSpeed=undefined;}}
const need=text=>Math.max(2.6,1.2+text.length*.072);
function lineNow(t){const p=sc.p;for(const [a,b,who,text] of p.says)if(between(t,a,b))return {a,b,who,text,key:a+who};if(sc.guide)for(const [a,b,text] of sc.guide)if(between(t,a,b))return {a,b,who:'l',text:shoutName(text),key:'g'+a};if(sc.lanSay&&between(t,sc.lanSay.from,sc.lanSay.from+.1))return {a:sc.lanSay.from,b:sc.lanSay.from+.1,who:'l',text:sc.lanSay.text,key:'j'+sc.lanSay.from};return null;}
// Ruhige Stellen (Lanista vor der Tür, Anklopfen, Gebrüll) warten, bis die Blase gelesen ist; Rufe in der Bewegung bleiben lesbar stehen, ohne anzuhalten. Tippen springt weiter.
const HOLD=t=>t===L.knock[0]||t===L.roar[0]||(sc.guide&&sc.guide[1]&&shoutName(sc.guide[1][2])===t);
function step(dt){const t0=sc.t,Ln=lineNow(t0);if(Ln&&sc.cur?.key!==Ln.key)sc.cur={...Ln,shown:0};if(sc.cur)sc.cur.shown+=dt;
 let nx=t0+dt;sc.waiting=false;if(Ln&&sc.cur&&HOLD(Ln.text)&&nx>=Ln.b&&sc.cur.shown<need(Ln.text)&&!sc.cur.ack){nx=Ln.b-1e-4;sc.waiting=true;}
 if(sc.cur&&!Ln&&(sc.cur.shown>=need(sc.cur.text)||sc.cur.ack))sc.cur=null;sc.t=nx;const t=sc.t,p=sc.p;pose(t);gait([...sc.vic,sc.smith,sc.lan,...(sc.crowd||[])],dt);
 // Blutspur hinter Kriechenden: einzelne Tropfen an der Hüfte bzw. Schnittkante
 for(const v of sc.vic)if(v.down&&!v.g.dead&&p.vic[sc.vic.indexOf(v)]){const tr=v.trail??=[],hx=v.x+lieDir(v)*(v.splitPiece?24:26),last=tr[tr.length-1];if(!last||Math.hypot(hx-last.x,v.y-last.y)>2.2)tr.push({x:hx+(Math.random()*2-1),y:v.y+(Math.random()*2-1),w:2+Math.floor(Math.random()*(v.splitPiece?4:3))});}
 for(const l of sc.limbs){if(l.z<=0&&Math.abs(l.vz)<4){l.z=0;continue;}l.x+=l.vx*dt;l.y+=l.vy*dt;l.vz-=200*dt;l.z=Math.max(0,l.z+l.vz*dt);l.angle+=l.spin*dt;if(!l.z&&l.vz<0){l.vz=-l.vz*.35;l.vx*=.5;l.vy*=.5;l.spin*=.5;}}
 for(const f of sc.fx){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vz-=180*dt;f.z=Math.max(0,f.z+f.vz*dt);f.life-=dt;}sc.fx=sc.fx.filter(f=>f.life>0);
 // Kamera folgt dem Geschehen, ohne zu springen
 const s=sc.smith,cw=(p.crawls||[]).find(c=>c.bisect&&t>=c.t0-1&&t<c.t1+1.6),nk=p.kills?.find(k=>k.part==='head'&&!sc.vic[k.who]?.g.dead),live=cw?[sc.vic[cw.who]]:nk?[sc.vic[nk.who]]:sc.vic.filter(v=>!v.g.dead),focus=p.flee?{x:610,y:600}:sc.pre&&t<0?{x:640,y:Math.max(300,(sc.lan?.y??sc.vic[0].y)-30)}:t<p.door?{x:720,y:290}:{x:(s.x+(live[0]?.x??s.x))/2,y:(s.y+(live[0]?.y??s.y))/2};sc.cam.x+=(focus.x-sc.cam.x)*Math.min(1,dt*2.2);sc.cam.y+=(focus.y-sc.cam.y)*Math.min(1,dt*2.2);
 sc.say=sc.cur?{who:sc.cur.who,text:sc.cur.text}:null;
 paint();if(t>=p.end&&!sc.cur)end();}
const VW=300,VH=VW*420/660;
function paint(){const c=$('smithWrathCanvas');if(!c?.getContext)return;const g=c.getContext('2d'),k=c.width/VW,cx=Math.max(VW/2,Math.min(900-VW/2,sc.cam.x)),cy=Math.max(VH/2,Math.min(670-VH/2,sc.cam.y)),t=sc.t,r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),w,h);};
 sc.bg??=M.ludus.background();g.imageSmoothingEnabled=false;g.setTransform?.(1,0,0,1,0,0);g.clearRect(0,0,c.width,c.height);g.save();const shake=sc.p.door&&between(t,sc.p.door,sc.p.door+.4)?(Math.random()-.5)*6:0;g.translate(shake,0);g.scale(k,k);g.translate(-(cx-VW/2),-(cy-VH/2));g.drawImage(sc.bg,0,0);trails(g,r,t);
 if(!sc.p.flee&&t>=sc.p.door&&!(sc.p.gone&&t>=sc.p.gone+.3)){r(733,187,29,49,'#161a17');r(733,187,29,3,'#0d100e');}
 const list=[...sc.vic,...(sc.legs||[]),...(sc.crowd||[]),...(sc.lan?[sc.lan]:[]),...(sc.smith&&!sc.smith.hidden?[sc.smith]:[])].filter(a=>a.x>-20&&a.x<940).sort((a,b)=>a.y-b.y);M.renderForgeActors(g,list);M.renderForgeEffects(g,sc.limbs,sc.fx);soilPaint(g,t,r);g.restore();
 for(const h of sc.ha||[]){let x=(h.who.x-(cx-VW/2))*k,y=(h.who.y-58-(cy-VH/2))*k;if(x<-40||x>700||y<0||y>420)continue;g.font="bold 21px 'Courier Prime',monospace";const hw=(g.measureText?.(h.text)?.width||h.text.length*12)/2+8;x=Math.max(hw,Math.min(660-hw,x));g.textAlign='center';g.lineWidth=4;g.strokeStyle='#17201c';g.strokeText(h.text,x,y);g.fillStyle='#f4d37a';g.fillText(h.text,x,y);}
 if(sc.say){const who=sc.say.who==='s'?sc.smith:sc.say.who==='l'?sc.lan:sc.vic[+sc.say.who.slice(1)];if(who){const name=sc.say.who==='s'?smithName():sc.say.who==='l'?(S.lanista?.name||'Lanista'):who.g.name.split(' ')[0];sceneBubble('smithWrathBubble',name,sc.say.text,(who.x-(cx-VW/2))*k/c.width,sc.say.who==='s',sc.waiting);}else sceneBubble('smithWrathBubble');}else sceneBubble('smithWrathBubble');
 const el=$('smithWrathText');const line=sc.say?(sc.say.who==='s'?smithName():sc.say.who==='l'?(S.lanista?.name||'Lanista'):sc.vic[+sc.say.who.slice(1)]?.g.name||'')+': „'+sc.say.text+'“':'';if(el&&el.textContent!==line)el.textContent=line;}
// Blutspur: Tropfen und kurze Schlieren zwischen nahen Tropfen (kein durchgehender Faden), dazu Gedärme hinter dem Oberkörper
function trails(g,r,t){if(sc.splitAt){const q=sc.splitAt;r(q.x+q.hd*18,q.y,14,3,'#7c2e28');r(q.x+q.hd*21,q.y+2,8,2,'#9b3530');}
 for(const v of sc.vic){const tr=v.trail;if(!tr?.length)continue;for(let i=0;i<tr.length;i++){const d=tr[i],e=tr[i-1];if(e&&Math.hypot(d.x-e.x,d.y-e.y)<9){const x0=Math.min(d.x,e.x);r(x0,Math.round((d.y+e.y)/2),Math.abs(d.x-e.x)+1,1,'#7c2e28');}r(d.x-1,d.y,d.w,2,i%4?'#9b3530':'#87352e');}
  if(v.splitPiece&&v.down){const s=lieDir(v),x0=v.x+s*23,y0=v.y+1,len=Math.min(46,10+Math.abs(v.x-(sc.splitAt?.x??v.x))*.6);for(let i=0;i<len;i++){const w=Math.sin(i*.38+t*1.3)*2.2+Math.sin(i*.9)*.8;r(x0-s*i,y0+w+1,3,2,'#5e1f22');r(x0-s*i,y0+w-1,3,3,i%6<3?'#e3a1a3':'#c06a74');}for(let j=0;j<3;j++){const i=Math.floor(len*(.3+j*.25));r(x0-s*i-1,y0+Math.sin(i*.38+t*1.3)*2.2-2,4,4,'#d98a90');}r(x0-2,y0-2,5,4,'#7c2e28');}}}
// Eingeschissen: Fleck hinten an der Hose, Tropfen, Pfütze am Schreckensort, grüne Dunstfäden
function soilPaint(g,t,r){const p=sc.p;if(!p.soil||t<p.soil.t)return;const v=sc.vic[p.soil.who];if(!v)return;const k=Math.min(1,(t-p.soil.t)/1.2);
 for(const d of sc.drips||[])r(d.x-1,d.y,3,1,'#5a3d1e');
 if(sc.soilSpot){const q=sc.soilSpot;r(q.x-4,q.y+1,Math.round(5+k*5),2,'#5a3d1e');r(q.x-2,q.y,Math.round(2+k*3),1,'#6e4a24');}
 if(v.down||v.g.dead)return;const rear=Math.cos(v.a)>=0?-1:1,h=v.kneeTimer>0?6:0;r(v.x+rear*2-4,v.y-21+h,8,Math.round(4+k*3),'#3f2914');r(v.x+rear*2-3,v.y-20+h,6,Math.round(3+k*3),'#6b4520');if(k>.3){r(v.x+rear*3,v.y-14+h,2,Math.round(4+k*8),'#5a3d1e');r(v.x+rear*3-3,v.y-14+h,1,Math.round(3+k*6),'#5a3d1e');}if(v.state==='move'&&Math.floor(t*5)!==sc.dripT){sc.dripT=Math.floor(t*5);(sc.drips??=[]).push({x:v.x+rear*3,y:v.y});}
 if(t-p.soil.t<9)for(let i=0;i<3;i++){const u=(t*.8+i/3)%1,x=v.x+rear*3+i*3-3+Math.sin(u*9+i)*2,y=v.y-24-u*22;g.globalAlpha=.7*(1-u);r(x,y,1,3,'#8fa35a');r(x+1,y-3,1,3,'#8fa35a');g.globalAlpha=1;}}
function sceneBubble(id,name,text,xFrac,loud,waiting){const el=$(id);if(!el)return;if(!text){if(!el.hidden)el.hidden=true;return;}const e=v=>String(v).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[ch]),key=name+'|'+text+'|'+!!loud;if(el._key!==key){el._key=key;el.innerHTML='<b>'+e(name)+'</b><span>'+e(text)+'</span><i aria-hidden="true">▼</i>';el.classList?.toggle('loud',!!loud);}if(el.hidden)el.hidden=false;const tx=Math.max(5,Math.min(95,xFrac*100)).toFixed(0)+'%';if(el._tx!==tx){el._tx=tx;el.style?.setProperty?.('--tail',tx);}if(el._w!==!!waiting){el._w=!!waiting;el.classList?.toggle('waiting',!!waiting);}}
function nameBubble(g,name,text,x,y,loud,blink){g.font="bold 23px 'Courier Prime',monospace";g.textBaseline='middle';const maxW=470,words=text.split(' '),rows=[''];for(const w of words){const tr=(rows[rows.length-1]+' '+w).trim();if(g.measureText(tr).width>maxW&&rows[rows.length-1])rows.push(w);else rows[rows.length-1]=tr;}
 const lh=29,w=Math.min(640,Math.max(...rows.map(r=>g.measureText(r).width),140)+32),h=rows.length*lh+48,bx=Math.round(Math.max(10,Math.min(650-w,x-w/2))),by=Math.round(Math.max(8,Math.min(y-24-h,420-h-8))),bg=loud?'#f4d37a':'#efe0b3';
 g.fillStyle='#17201c';g.fillRect(bx-3,by-3,w+6,h+6);g.fillStyle=bg;g.fillRect(bx,by,w,h);const tx=Math.max(bx+14,Math.min(bx+w-24,x-6));g.fillStyle='#17201c';g.fillRect(tx-2,by+h,16,4);g.fillStyle=bg;g.fillRect(tx,by+h-1,12,4);g.fillRect(tx+3,by+h+3,6,4);
 g.textAlign='left';g.font="bold 16px 'Courier Prime',monospace";g.fillStyle='#5a4a2a';g.fillText(name.toUpperCase(),bx+16,by+16);g.font="bold 23px 'Courier Prime',monospace";g.fillStyle='#17201c';rows.forEach((r,i)=>g.fillText(r,bx+16,by+39+i*lh));
 if(blink!==undefined&&blink){g.beginPath();g.moveTo(bx+w-26,by+h-14);g.lineTo(bx+w-12,by+h-14);g.lineTo(bx+w-19,by+h-6);g.fill();}}
function bubble(g,text,x,y,loud){g.font=`bold ${loud?22:19}px 'Courier Prime',monospace`;g.textAlign='center';g.textBaseline='middle';const words=text.split(' '),lines=[''];for(const w of words){if((lines[lines.length-1]+' '+w).trim().length>22)lines.push(w);else lines[lines.length-1]=(lines[lines.length-1]+' '+w).trim();}
 const lh=loud?26:23,width=Math.max(...lines.map(l=>g.measureText?g.measureText(l).width:l.length*12))+24,height=lines.length*lh+14,bx=Math.min(660-width-6,Math.max(6,x-width/2)),by=Math.max(6,y-height);
 g.fillStyle='#17201c';g.fillRect(bx-3,by-3,width+6,height+6);g.fillStyle=loud?'#f4d37a':'#efe0b3';g.fillRect(bx,by,width,height);g.fillRect(Math.max(bx+6,Math.min(bx+width-16,x-5)),by+height,10,8);g.fillStyle='#17201c';lines.forEach((l,i)=>g.fillText(l,bx+width/2,by+7+lh/2+i*lh));}
// ---------- Takt, Klicks ----------
const tick=M.ludusTick;M.ludusTick=dt=>{tick?.(dt);if(!sc||(typeof document!=='undefined'&&document.hidden))return;clock+=dt;if(clock<1/30)return;const d=Math.min(clock,.1);clock=0;step(d);};
const click=M.schoolClick;M.schoolClick=action=>{
 if(action==='wanderer:say:schmied'){const g=WD.state().group;if(g&&!g.talk&&!g.fightId&&!S.battle&&eligible(g)){g.talk={tone:'schmied',outcome:outcomeOf(g)};M.persist();}M.ui.render();return true;}
 if(action==='wrath:tap'){if(sc?.cur)sc.cur.ack=true;return true;}if(action==='wrath:go'){start();return true;}if(action==='wrath:skip'){end();return true;}
 return click(action);};
M.smithWrath={chance:CHANCE,accept:ACCEPT,eligible,outcomeOf,lines:L,start,end,step:d=>sc&&step(d),get scene(){return sc;},plan,fleePlan};
})();
