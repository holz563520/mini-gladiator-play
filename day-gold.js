'use strict';
// =====================================================================================================
// TAGESWECHSEL UND GOLDANZEIGE (gesamtes Spiel)
// · „Nächster Tag“: statt der Textmeldung eine kurze Animation wie im Medikus-Kapitel: Nacht über dem Ludus, die Sonne
//   geht auf, „TAG n“, der Schmied: „Der nächste Tag.“ Der Tag selbst wird unverändert über das Spiel fortgeschrieben
//   (M.ui.click('rest') → M.advanceDay). Blockiert das Spiel den Tageswechsel (z. B. Herumtreiber im Hof), erscheint
//   dessen Hinweis wie bisher. Antippen überspringt. Mehrere Tage hintereinander (Testwerkzeuge): ohne Animation.
// · Gold: Münze und Zahl neben „Nächster Tag“. Mehr Gold: Münze wirbelt, Zahl zählt hoch, „+n“ steigt auf, kleine Münzen
//   springen heraus. Weniger Gold: Zahl zählt runter, „−n“ fällt rot, die Anzeige ruckelt.
// Kein neuer Speicherwert.
// =====================================================================================================
(()=>{
const M=window.MG;if(!M)return;const S=M.s,$=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const smithName=()=>M.workshop?.state?.master?.name||'Der Schmied';
// ---------- Tageswechsel ----------
let dawn=null,bypass=false;
const LINES=['Der nächste Tag.','Der nächste Tag. Alle leben noch. Fast alle.','Der nächste Tag. Das Bier ist warm, die Klingen kalt.','Der nächste Tag. Die Sonne geht auf. Leider auch über dir.','Der nächste Tag. Neue Narben, neue Chancen.'];
function paintDawn(c,k,t){const g=c.getContext('2d'),W=c.width,H=c.height,R=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};g.imageSmoothingEnabled=false;
 const mix=(a,b,u)=>'rgb('+a.map((v,i)=>Math.round(v+(b[i]-v)*u)).join(',')+')',night=[[8,12,26],[18,24,46]],dawnC=[[64,52,98],[214,128,70]],day=[[120,170,196],[226,196,138]];
 const top=k<.5?mix(night[0],dawnC[0],k*2):mix(dawnC[0],day[0],(k-.5)*2),bot=k<.5?mix(night[1],dawnC[1],k*2):mix(dawnC[1],day[1],(k-.5)*2);
 for(let y=0;y<H;y+=3){const u=y/H;g.fillStyle=u<.62?top:bot;if(u>.4&&u<.62){g.globalAlpha=1;g.fillStyle=mix(k<.5?night[0]:dawnC[0],k<.5?dawnC[1]:day[1],Math.min(1,(u-.4)/.22*Math.min(1,k*1.6)));}R(0,y,W,3,g.fillStyle);}
 // Sterne verblassen
 if(k<.6)for(let i=0;i<40;i++){const x=(i*73)%W,y=(i*37)%Math.round(H*.5),tw=(Math.sin(t*3+i)+1)/2;g.globalAlpha=(1-k/.6)*(.4+.6*tw);R(x,y,1,1,'#f4ecd0');}g.globalAlpha=1;
 // Sonne steigt
 const sx=W*.66,sy=H*.68-k*H*.3,sr=Math.round(Math.min(W,H)*.06)+4;g.fillStyle='rgba(255,210,120,'+(.15*k)+')';g.beginPath();g.arc(sx,sy,sr*3.2,0,7);g.fill();
 for(let y=-sr;y<=sr;y++){const w=Math.round(Math.sqrt(sr*sr-y*y));R(sx-w,sy+y,w*2,1,y<-sr*.4?'#fff0b0':'#f4c050');}
 if(k>.35)for(let i=0;i<12;i++){const a=i/12*Math.PI*2+t*.4,r0=sr+4,r1=sr+8+Math.sin(t*4+i)*2;g.globalAlpha=Math.min(1,(k-.35)*3)*.8;R(sx+Math.cos(a)*r0,sy+Math.sin(a)*r0,2,2,'#f4d37a');R(sx+Math.cos(a)*r1,sy+Math.sin(a)*r1,1,1,'#f4d37a');}g.globalAlpha=1;
 // Silhouette des Ludus: Mauer, Türme, Arena-Tor, Fahnen
 const sil=k<.5?'#0c1018':'#2a2420',hz=Math.round(H*.66),q=W/320,X=x=>x*q;R(0,hz,W,H-hz,sil);
 for(const [x,w,h] of [[10,26,22],[60,18,30],[118,52,40],[200,20,26],[250,30,20]])R(X(x),hz-h,w*q,h,sil);
 for(let x=0;x<W;x+=8)R(x,hz-4,5,4,sil);R(X(131),hz-52,26*q,12,sil);for(let i=0;i<3;i++)R(X(124+i*14),hz-30,6*q,10,k<.5?'#1c2230':'#4a3a2a');
 for(const [x,h] of [[69,30],[210,26]]){R(X(x),hz-h-10,1,10,sil);R(X(x)+1,hz-h-10,6,4,k<.5?'#3a1414':'#8f2f2a');}
 if(k<.55)for(const [x,y] of [[30,hz-14],[134,hz-24],[262,hz-12]]){g.globalAlpha=1-k/.55;R(X(x),y,2,2,'#f0a13c');}g.globalAlpha=1;
 // Vögel am Morgen
 if(k>.55)for(let i=0;i<3;i++){const bx=((t*18+i*40)%(W+40))-20,by=H*.3+i*7+Math.sin(t*5+i)*2;R(bx,by,2,1,'#2a2420');R(bx+2,by-1,1,1,'#2a2420');R(bx-1,by-1,1,1,'#2a2420');}}
function playDawn(run){const v=document.createElement('div');v.className='mg-dawn';const before=S.day,line=LINES[Math.floor(Math.random()*LINES.length)];
 const cw=200,ch=Math.max(112,Math.min(440,Math.round(cw*innerHeight/Math.max(1,innerWidth))));v.innerHTML=`<canvas width="${cw}" height="${ch}"></canvas><div class="mg-dawn-text"><b>TAG ${before}</b><span class="mg-dawn-say"><i>${esc(smithName())}</i>„${esc(line)}“</span><small>Antippen überspringt</small></div>`;
 document.body.appendChild(v);const c=v.querySelector('canvas'),start=performance.now();let advanced=false,blocked='',done=false;M.sound?.('heavy');
 const finish=()=>{if(done)return;done=true;v.classList.add('out');setTimeout(()=>{v.remove();dawn=null;if(blocked)M.ui.notify?.(blocked);},450);};
 const advance=()=>{if(advanced)return;advanced=true;const d0=S.day;bypass=true;try{run();}finally{bypass=false;}const n=$('notice');
  // Tagesbericht (Fenster „Tag n“) des Spiels schließen: die Animation ersetzt ihn
  const md=$('modal');if(md&&!md.hidden&&/^\s*Tag \d+/.test(md.querySelector('h2,h1,header')?.textContent||md.textContent.slice(0,12)))try{M.ui.close();}catch{}
  if(S.day===d0){blocked=n?.textContent||'Der Tag kann gerade nicht enden.';finish();return;}
  // Tagesbericht des Spiels nicht anzeigen: die Animation ersetzt ihn
  if(n){n.textContent='';n.style.opacity=0;n.classList?.remove('show');}v.querySelector('b').textContent='TAG '+S.day;v.classList.add('morning');M.sound?.('rise');};
 v.addEventListener('click',()=>{advance();finish();});
 (function frame(now){if(done)return;const t=(now-start)/1000,k=Math.max(0,Math.min(1,(t-.7)/1.6));if(t>.6)advance();paintDawn(c,k,t);if(t>3.4)finish();else requestAnimationFrame(frame);})(start);
 dawn=v;}
const baseClick=M.schoolClick;
// Vor allen anderen: erst die Nacht, dann (mitten in der Animation) der echte Tageswechsel über die übrigen Haken
M.schoolClick=function(a){if((a==='rest'||a==='rest3')&&!bypass&&!dawn&&!S.battle){playDawn(()=>M.ui.click(a));return true;}return baseClick?.apply(this,arguments);};
// Wird ein Tag ohne Animation gewechselt (z. B. „7 Tage“), bleibt der Hinweis des Spiels sichtbar.

// ---------- Goldanzeige ----------
const G={shown:null,target:null,el:null,num:null,coin:null,anim:0,spin:0,last:performance.now()};
function mount(){const bar=$('mapuiBar');let el=document.querySelector('.mg-gold');if(el&&el.isConnected){G.el=el;return true;}
 el=document.createElement('div');el.className='mg-gold';el.setAttribute('role','status');el.setAttribute('aria-label','Gold');el.innerHTML='<canvas width="16" height="16" class="mg-coin"></canvas><b>0</b><span class="mg-gold-fx"></span>';
 if(bar){const day=bar.querySelector('.mapui-day');if(day)bar.insertBefore(el,day);else bar.appendChild(el);el.classList.add('in-bar');}else{el.classList.add('floating');document.body.appendChild(el);}
 G.el=el;G.num=el.querySelector('b');G.coin=el.querySelector('canvas');G.fx=el.querySelector('.mg-gold-fx');if(G.shown!=null)G.num.textContent=fmt(G.shown);return true;}
const fmt=n=>Math.round(n).toLocaleString('de-DE');
function coin(c,spin,t){const g=c.getContext('2d');g.clearRect(0,0,16,16);g.imageSmoothingEnabled=false;const w=Math.max(1,Math.abs(Math.cos(spin))*7),face=Math.cos(spin)>=0;
 g.fillStyle='#7a5a14';g.fillRect(8-w-1,1,w*2+2,14);g.fillStyle=face?'#f2c94a':'#d9a832';g.fillRect(8-w,2,w*2,12);g.fillRect(8-w-1,4,w*2+2,8);
 if(w>3){g.fillStyle='#b8862a';g.fillRect(8-w+2,4,w*2-4,1);g.fillRect(8-w+2,11,w*2-4,1);g.fillStyle='#fff1b0';g.fillRect(8-w+1,3,2,3);if(face){g.fillStyle='#9a6a1a';g.fillRect(7,6,2,4);}}
 const sh=(t%4.5);if(sh<.5&&w>4){g.fillStyle='rgba(255,255,255,.8)';g.fillRect(8-w+Math.round(sh*4*w),3,1,10);}}
function burst(delta){const fx=G.fx;if(!fx)return;const up=delta>0,s=document.createElement('i');s.className='mg-gold-delta '+(up?'up':'down');s.textContent=(up?'+':'−')+fmt(Math.abs(delta));fx.appendChild(s);setTimeout(()=>s.remove(),1500);
 if(up){M.sound?.('coin');for(let i=0;i<Math.min(8,3+Math.round(Math.log10(Math.abs(delta)+1)*2));i++){const p=document.createElement('i');p.className='mg-gold-chip';p.style.setProperty('--dx',(Math.random()*60-30)+'px');p.style.setProperty('--dy',(-20-Math.random()*30)+'px');p.style.animationDelay=(i*40)+'ms';fx.appendChild(p);setTimeout(()=>p.remove(),1200);}G.el.classList.remove('gain');void G.el.offsetWidth;G.el.classList.add('gain');}
 else{G.el.classList.remove('loss');void G.el.offsetWidth;G.el.classList.add('loss');}}
function tick(now){requestAnimationFrame(tick);const dt=Math.min(.1,(now-G.last)/1000);G.last=now;if(!S||typeof S.gold!=='number')return;if(!G.el||!G.el.isConnected){mount();}
 if(G.shown==null){G.shown=G.target=S.gold;G.num.textContent=fmt(G.shown);}
 if(S.gold!==G.target){const delta=S.gold-G.target;G.target=S.gold;burst(delta);G.anim=delta>0?1.2:.6;}
 if(G.shown!==G.target){const diff=G.target-G.shown,step=Math.sign(diff)*Math.max(1,Math.abs(diff)*Math.min(1,dt*5));G.shown=Math.abs(step)>=Math.abs(diff)?G.target:G.shown+step;G.num.textContent=fmt(G.shown);}
 G.anim=Math.max(0,G.anim-dt);G.spin+=dt*(G.anim>0?(G.target>=G.shown?22:8):1.6);if(G.coin)coin(G.coin,G.spin,now/1000);}
requestAnimationFrame(tick);
M.dayGold={playDawn};
window.DAY_GOLD_READY=true;
})();
