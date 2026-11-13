'use strict';
// =====================================================================================================================
// BRÜCKE / HOCHWEG (welt-bruecke.js) · Arena Theory 2.0, Schritt T2 (Thomas 13.11.2026, AT2_FAHRPLAN.md).
// Werkzeug wie bei RollerCoaster Tycoon: Startfeld antippen, dann Stück für Stück bauen (4 Richtungen, ⬈ hoch / ➡ eben / ⬊ runter,
// Holz oder Stein, Geisterstück mit Preis und Höhe, ↶ letztes Stück zurück mit vollem Geld). Ebene Bodenwege baut weiter welt-bau.js
// per Ziehen; am Hang legen sie sich von selbst schräg (Rampe und Treppe sind dasselbe).
// · Regeln: ein Stück je Feld, eine Stufe Steigung je Stück, nie im Boden, höchstens 8 Stufen über dem Boden; erlaubt über Naturboden,
//   Fluss, Senken, Bodenwege, Straßen und die Straßenbrücke; nicht auf Gebäuden, Bäumen, Arena, Tribüne, festen Feldern, anderen Brücken.
// · Preise (bestätigt): Holz 15 G + 5 G je Stufe über dem Boden, Stein 40 G + 10 G je Stufe (Mitte des Decks über der tiefsten Ecke).
// · frei: Stufen frei unter dem Deck (ab 2 kann man darunter durch) – für die Begehbarkeit in T4. Figuren benutzen Brücken erst ab T4.
// · Zugänge: W.brueckeAt(k) (welt-bau.js: kein Haus und kein Gelände darunter, Abreißen entfernt Stücke), M.weltBruecke.daten/laden
//   (welt-spielstand.js). Texte aus der Sprachdatei (Regel 10).
// · Leistung: Form jedes Stücks wird beim Bauen einmal ausgerechnet; gezeichnet wird nur, was im Bild ist, weit draußen nur das Deck.
// =====================================================================================================================
(()=>{
const M=window.MG,W=window.WeltKarte,H=window.WeltHook,L=window.AT2Sprache;if(!M||!W||!H||!M.weltBau||!W.ANORD)return;
const S=M.s,N=W.N,T=W.T,HZ=W.HZ||8,t=(k,v)=>L?L.t(k,v):k;
const MAT=[{id:'holz',preis:15,stufe:5},{id:'stein',preis:40,stufe:10}],MAXH=8,DX=[1,0,-1,0],DY=[0,1,0,-1];
// Ecken eines Feldes: 0 (x,y), 1 (x+1,y), 2 (x+1,y+1), 3 (x,y+1) – wie W.hc. Je Richtung: Eingangsecken und Geländer (Eingang → Ausgang)
const ECK=[[0,0],[1,0],[1,1],[0,1]],EIN=[[0,3],[0,1],[1,2],[3,2]],RAIL=[[[0,1],[3,2]],[[0,3],[1,2]],[[1,0],[2,3]],[[3,0],[2,1]]];
// Kreuzungen (T2-Rückmeldung Thomas 13.11.2026): Kante zum Nachbarn in Richtung s: eigene Ecken KANTE[s] treffen dessen Ecken GEGEN[s].
// Geländer i eines Stücks liegt zur Seite RSEITE[dir][i]; es geht auf, wo dort eine Brücke oder ein Bodenweg auf gleicher Höhe anschließt.
const KANTE=[[1,2],[3,2],[0,3],[0,1]],GEGEN=[[0,3],[0,1],[1,2],[3,2]],RSEITE=[[3,1],[2,0],[3,1],[2,0]];
const istWeg=f=>f===T.WEG||f===T.BRUECKE||(f>=T.STR1&&f<=T.STR5);
const ERLAUBT=new Set([...W.BODEN_NATUR,T.WEG,T.BRUECKE,T.STR1,T.STR2,T.STR3,T.STR4,T.STR5]);
const stuecke=new Map();// k → Stück
const deckE=(p,c)=>EIN[p.dir].includes(c)?p.h0:p.h1,nachbar=(tx,ty,s)=>{const x=tx+DX[s],y=ty+DY[s];return W.inMap(x,y)?W.ix(x,y):-1;};
// schließt an Seite s von p etwas auf gleicher Höhe an? (Brücke: Deck an Deck; Bodenweg: Deck auf Bodenhöhe)
function schliesst(p,s){const n=nachbar(p.tx,p.ty,s);if(n<0)return false;const q=stuecke.get(n),[a,b]=KANTE[s],[c,d]=GEGEN[s];
 if(q)return deckE(p,a)===deckE(q,c)&&deckE(p,b)===deckE(q,d);
 return istWeg(W.feld[n])&&deckE(p,a)===W.hc[n*4+c]&&deckE(p,b)===W.hc[n*4+d];}
function offenNeu(p){p.offen=(schliesst(p,RSEITE[p.dir][0])?1:0)|(schliesst(p,RSEITE[p.dir][1])?2:0);}
// nach Änderungen: Geländer der Stücke auf und um diese Felder neu; Bodenwege daneben neu zeichnen (Randstein auf/zu)
function umgebung(ks){const neu=new Set();for(const k of ks){neu.add(k);const x=k%N,y=(k/N)|0;for(let s=0;s<4;s++){const n=nachbar(x,y,s);if(n>=0)neu.add(n);}}
 for(const k of neu){const q=stuecke.get(k);if(q)offenNeu(q);}return [...neu];}
// Boden einer Ecke: Höhe des Geländes, auf dem Fluss die Wasseroberfläche
const bodenE=(k,c)=>{const h=W.hc[k*4+c];return W.feld[k]===T.FLUSS?Math.max(h,W.WL):h;};
function form(p){const k=p.k,ein=EIN[p.dir],dh=c=>ein.includes(c)?p.h0:p.h1;
 const P=ECK.map(([cx,cy],c)=>{const s=W.iso(p.tx+cx,p.ty+cy);return {x:s.x,y:s.y-dh(c)*HZ,g:s.y-bodenE(k,c)*HZ};});
 const m=W.iso(p.tx+.5,p.ty+.5),top=Math.min(...P.map(q=>q.y));return {P,mx:m.x,my:m.y,top,unten:Math.max(...P.map(q=>q.g))};}
// Stück prüfen: gibt Grund (Textschlüssel) oder null; rechnet Preis, Höhe über dem Boden, frei darunter
function pruefe(p){if(!W.inMap(p.tx,p.ty))return 'rand';const k=W.ix(p.tx,p.ty),f=W.feld[k];p.k=k;
 if(stuecke.has(k))return 'bruecke';if(W.fest?.[k]||W.arenaPlatz?.[k])return 'fest';if(f===T.ARENA||f===T.TRIB)return 'arena';
 if(W.gebaeudeAt?.(p.tx,p.ty)||!ERLAUBT.has(f))return 'haus';if(W.obj?.[k])return 'baum';
 const ein=EIN[p.dir];let gmin=99,gmax=-99,frei=99;
 for(let c=0;c<4;c++){const g=bodenE(k,c),d=ein.includes(c)?p.h0:p.h1;if(d<g)return 'boden';if(g<gmin)gmin=g;if(g>gmax)gmax=g;frei=Math.min(frei,d-g);}
 const hoch=Math.max(0,Math.round((p.h0+p.h1)/2-gmin));if(hoch>MAXH)return 'hoch';
 p.hoch=hoch;p.frei=Math.max(0,Math.min(p.h0,p.h1)-gmax);p.preis=MAT[p.mat].preis+MAT[p.mat].stufe*hoch;return null;}
// ---------- Zeichnen ----------
const FARBE=[{deck:'#9a7346',fuge:'#6b4a2c',seite:'#5c4028',pfeiler:'#47301e',gel:'#7a5534'},{deck:'#a8a29a',fuge:'#7d776f',seite:'#6c665e',pfeiler:'#5d574f',gel:'#8f8980'}];
const R=(g,x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
const poly=(g,pts,col)=>{g.fillStyle=col;g.beginPath();g.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);g.closePath();g.fill();};
const lerp=(a,b,u)=>({x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u});
let schildBild=null;L?.beiWechsel(()=>{schildBild=null;});
function schild(){if(schildBild)return schildBild;const a=t('br.schild'),b=t('br.schild2'),c=document.createElement('canvas'),m=c.getContext('2d');
 m.font='bold 6px ui-monospace,Menlo,Consolas,monospace';const w1=m.measureText(a).width;m.font='4px ui-monospace,Menlo,Consolas,monospace';const w=Math.ceil(Math.max(w1,m.measureText(b).width))+6;
 c.width=w;c.height=14;const g=c.getContext('2d');g.fillStyle='#4a3420';g.fillRect(0,0,w,14);g.fillStyle='#d9c391';g.fillRect(1,1,w-2,12);g.fillStyle='#3a2617';g.textAlign='center';g.textBaseline='top';
 g.font='bold 6px ui-monospace,Menlo,Consolas,monospace';g.fillText(a,w/2,1);g.font='4px ui-monospace,Menlo,Consolas,monospace';g.fillStyle='#6b1d17';g.fillText(b,w/2,8);return schildBild={c,w};}
function male(g,p,geist,vor){const {P}=p.geo,F=FARBE[p.mat],mini=W.mini&&!vor;
 if(mini){poly(g,P,F.deck);if(P[2].g-P[2].y>3)R(g,P[2].x-1,P[2].y,2,P[2].g-P[2].y,F.pfeiler);return;}
 const dicke=p.mat?4:3;
 // Pfeiler an den vorderen Ecken bis zum Boden bzw. Wasser
 for(const c of [1,3,2]){const q=P[c],l=q.g-q.y;if(l>2){const b=p.mat?3:2;R(g,q.x-b/2,q.y,b,l,F.pfeiler);if(!p.mat&&l>14)R(g,q.x-b/2-1,q.y+l*.5,b+2,1,F.seite);}}
 // Deck: Seiten vorn, dann oben
 const tief=q=>({x:q.x,y:q.y+dicke});
 poly(g,[P[1],P[2],tief(P[2]),tief(P[1])],F.seite);poly(g,[P[3],P[2],tief(P[2]),tief(P[3])],F.pfeiler);poly(g,P,F.deck);
 // Bohlen bzw. Plattenfugen quer zur Richtung
 const [ra,rb]=RAIL[p.dir],n=p.mat?3:5;g.fillStyle=F.fuge;
 for(let i=1;i<n;i++){const u=i/n,a=lerp(P[ra[0]],P[ra[1]],u),b=lerp(P[rb[0]],P[rb[1]],u);for(let s=0;s<=1;s+=.125)g.fillRect(Math.round(a.x+(b.x-a.x)*s),Math.round(a.y+(b.y-a.y)*s),1,1);}
 // Geländer (Holz) bzw. Brüstung (Stein) an beiden Seiten
 RAIL[p.dir].forEach(([e,x],i)=>{if(p.offen&(1<<i))return;const a=P[e],b=P[x];if(p.mat){poly(g,[a,b,{x:b.x,y:b.y-3},{x:a.x,y:a.y-3}],F.gel);g.fillStyle=F.fuge;g.fillRect(Math.round((a.x+b.x)/2),Math.round((a.y+b.y)/2-3),1,3);}
  else{for(const u of [0,.5,1]){const q=lerp(a,b,u);R(g,q.x,q.y-5,1,5,F.gel);}for(let s=0;s<=1;s+=.07){const q=lerp(a,b,s);g.fillStyle=F.gel;g.fillRect(Math.round(q.x),Math.round(q.y-5),1,1);}}});
 // Schwarzer Humor: an hohen Holzstücken ab und zu ein Schild am Pfeiler
 if(!p.mat&&!geist&&p.hoch>=4&&W.h2(p.tx,p.ty,77)<.2&&W.detail&&vor){const s=schild(),q=P[2],y=Math.round(q.y+Math.min(30,(q.g-q.y)*.4));g.drawImage(s.c,Math.round(q.x-s.w/2),y);}
 if(geist){g.strokeStyle=geist;g.lineWidth=1.5;g.beginPath();g.moveTo(P[0].x,P[0].y);for(let i=1;i<4;i++)g.lineTo(P[i].x,P[i].y);g.closePath();g.stroke();}}
// Vorgemalte Bilder: Stücke gleicher Form (Richtung, Steigung, Material, Pfeilerlängen, Schild) teilen sich ein Bild.
// Zeichnen kostet dann je Stück ein drawImage (300 Stücke: ~80 Rechtecke je Stück wären zu teuer). Höchstens 400 Bilder, dann neu.
const bilder=new Map();L?.beiWechsel(()=>bilder.clear());
function bildVon(p){const {P}=p.geo,sch=!p.mat&&p.hoch>=4&&W.h2(p.tx,p.ty,77)<.2&&W.detail?1:0,key=p.dir+'|'+(p.h1-p.h0)+'|'+p.mat+'|'+sch+'|'+(p.offen|0)+'|'+[1,2,3].map(c=>Math.round(P[c].g-P[c].y)).join(',');
 let b=bilder.get(key);if(b)return b;if(bilder.size>=400)bilder.clear();
 const x0=P[0].x,y0=P[0].y,Q=P.map(q=>({x:q.x-x0,y:q.y-y0,g:q.g-y0})),xs=Q.map(q=>q.x),ys=Q.flatMap(q=>[q.y,q.g]);
 const mx=Math.floor(Math.min(...xs))-12,my=Math.floor(Math.min(...ys))-8,w=Math.ceil(Math.max(...xs))-mx+12,h=Math.ceil(Math.max(...ys))-my+8+(sch?16:0);
 const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.translate(-mx,-my);
 male(g,{...p,geo:{...p.geo,P:Q}},null,true);b={c,ox:mx,oy:my};bilder.set(key,b);return b;}
function item(p,geist){return {y:p.geo.my+.45,draw(g){if(geist){g.globalAlpha=.6;male(g,p,geist);g.globalAlpha=1;return;}if(W.mini){male(g,p,null);return;}
 const b=bildVon(p),q=p.geo.P[0];g.drawImage(b.c,Math.round(q.x+b.ox),Math.round(q.y+b.oy));}};}
const items0=H.items;H.items=(items,view)=>{items0?.(items,view);
 for(const p of stuecke.values()){const o=p.geo;if(o.mx<view.x0-40||o.mx>view.x1+40||o.top>view.y1+20||o.unten<view.y0-10)continue;items.push(item(p,null));}
 if(werkzeug()&&geist){const o=geist.geo;if(o)items.push(item(geist,geist.grund?'#ff6a5a':'#c8f5b0'));}};
// ---------- Bauen ----------
const B=M.weltBau,werkzeug=()=>B.mode==='bruecke';
let zeiger=null,geist=null,stapel=[],mat=0,neig=0;// zeiger: {tx,ty,h,dir,vor}; vor: Richtung des letzten Stücks (nicht direkt zurück)
function neuesStueck(z,dir,s){return {tx:z.tx,ty:z.ty,dir,h0:z.h,h1:z.h+s,mat};}
function geistNeu(){if(!zeiger){geist=null;return;}const p=neuesStueck(zeiger,zeiger.dir,neig);let grund=zeiger.vor!=null&&(zeiger.dir+2)%4===zeiger.vor?'zurueck':pruefe(p);
 // Kreuzung: vorhandene ebene Brücke auf gleicher Höhe → hindurch, kostet nichts (das Geländer dort geht von selbst auf)
 const da=W.inMap(p.tx,p.ty)&&stuecke.get(W.ix(p.tx,p.ty));if(grund==='bruecke'&&da&&!neig&&da.h0===da.h1&&da.h0===zeiger.h){geist={...da,durch:da,preis:0,grund:null};text();return;}
 if(!grund&&(S.gold||0)<p.preis)grund='gold';p.grund=grund;if(W.inMap(p.tx,p.ty)){p.k=W.ix(p.tx,p.ty);p.geo=form(p);}geist=p;text();}
function setzen(p){p.geo=form(p);stuecke.set(p.k,p);W.rebake?.(umgebung([p.k]));}
function bauen(){if(!geist||geist.grund){if(geist?.grund)M.ui?.notify?.(grundText(geist));return false;}const p=geist;
 if(p.durch){stapel.push({durch:true,z:{...zeiger}});zeiger={tx:p.tx+DX[zeiger.dir],ty:p.ty+DY[zeiger.dir],h:zeiger.h,dir:zeiger.dir,vor:zeiger.dir};geistNeu();return true;}S.gold=(S.gold||0)-p.preis;delete p.grund;setzen(p);
 stapel.push({p,z:{...zeiger}});zeiger={tx:p.tx+DX[p.dir],ty:p.ty+DY[p.dir],h:p.h1,dir:p.dir,vor:p.dir};try{M.sound?.('coin');}catch(e){}
 if(neig<0&&zeiger.h<=Math.ceil(boden(zeiger.tx,zeiger.ty)))neig=0;// unten angekommen: eben weiter
 geistNeu();return true;}
function zurueck(){const s=stapel.pop();if(!s)return false;if(s.durch){zeiger=s.z;geistNeu();return true;}stuecke.delete(s.p.k);W.rebake?.(umgebung([s.p.k]));S.gold=(S.gold||0)+s.p.preis;zeiger=s.z;geistNeu();try{M.sound?.('land');}catch(e){}return true;}
const boden=(tx,ty)=>{if(!W.inMap(tx,ty))return 0;const k=W.ix(tx,ty);let m=-99;for(let c=0;c<4;c++)m=Math.max(m,bodenE(k,c));return m;};
// Startfeld: auf Bodenhöhe; am Ende einer vorhandenen Brücke geht es dort weiter
function start(tx,ty){if(!W.inMap(tx,ty))return;const k=W.ix(tx,ty),p=stuecke.get(k);stapel=[];
 if(p){const nx=p.tx+DX[p.dir],ny=p.ty+DY[p.dir];zeiger={tx:nx,ty:ny,h:p.h1,dir:p.dir,vor:p.dir};}
 else zeiger={tx,ty,h:Math.ceil(boden(tx,ty)),dir:zeiger?.dir??0,vor:null};neig=0;geistNeu();zeigeKnoepfe();}
// Abreißen (welt-bau.js, Werkzeug „Abreißen“): Stücke auf diesen Feldern entfernen, kein Geld zurück
function abreissen(ks){let n=0;for(const k of ks)if(stuecke.delete(k))n++;if(n){stapel=stapel.filter(s=>s.durch||stuecke.has(s.p.k));umgebung(ks);if(zeiger)geistNeu();}return n;}
// ---------- Bedienung ----------
const box=document.getElementById('wBau'),zeile=box?.querySelector('.bau-wz');
const sp=box?.querySelector('span');
const kn=document.createElement('button');kn.className='w-btn';kn.dataset.wz='bruecke';{const str=box?.querySelector('[data-strgruppe]');if(str)str.after(kn);else zeile?.appendChild(kn);}
const feld=document.createElement('div');feld.className='bau-wz bau-bruecke';feld.hidden=true;box?.insertBefore(feld,sp);
// Pfeile: Bildschirmrichtung der Kartenachsen (+x ↘, +y ↙, −x ↖, −y ↗)
const PFEIL=['↘','↙','↖','↗'],PFEIL_ORD=[2,3,1,0];// im 2 × 2-Gitter: ↖ ↗ / ↙ ↘
function knoepfe(){kn.innerHTML=t('br.knopf')+' <small>'+MAT[0].preis+' G</small>';const teil=(titel,inhalt,kl='')=>`<div class="br-teil"><b>${titel}</b><div class="${kl}">${inhalt}</div></div>`;
 feld.innerHTML=teil(t('br.richtung'),PFEIL_ORD.map(d=>`<button class="w-btn" data-dir="${d}" title="${t('br.richtung')}">${PFEIL[d]}</button>`).join(''),'br-pfeile')+
  teil(t('br.neigung'),`<button class="w-btn" data-neig="1" title="${t('br.hoch')}">⬈</button><button class="w-btn" data-neig="0" title="${t('br.eben')}">➡</button><button class="w-btn" data-neig="-1" title="${t('br.runter')}">⬊</button>`,'br-neig')+
  teil(t('br.material'),`<button class="w-btn" data-mat="0">🪵 ${t('br.holz')}</button><button class="w-btn" data-mat="1">🪨 ${t('br.stein')}</button>`)+
  teil('&nbsp;',`<button class="w-btn br-bauen" data-bauen>${t('br.bauen')}</button><button class="w-btn" data-zurueck>${t('br.zurueck')}</button>`);zeigeKnoepfe();}
function zeigeKnoepfe(){for(const b of feld.querySelectorAll('[data-dir]'))b.classList.toggle('on',+b.dataset.dir===(zeiger?.dir??0));
 for(const b of feld.querySelectorAll('[data-neig]'))b.classList.toggle('on',+b.dataset.neig===neig);for(const b of feld.querySelectorAll('[data-mat]'))b.classList.toggle('on',+b.dataset.mat===mat);
 const bb=feld.querySelector('[data-bauen]');if(bb)bb.disabled=!geist||!!geist.grund;const zb=feld.querySelector('[data-zurueck]');if(zb)zb.disabled=!stapel.length;}
knoepfe();L?.beiWechsel(()=>{knoepfe();if(werkzeug())text();});
const grundText=p=>t('br.grund.'+p.grund,{g:p.preis});
function text(){if(!sp||!werkzeug())return;if(!zeiger){sp.textContent=t('br.hilfe');zeigeKnoepfe();return;}const p=geist;
 sp.textContent=p.grund?grundText(p):p.durch?t('br.anschluss'):t('br.info',{mat:t(mat?'br.stein':'br.holz'),neig:neig>0?'⬈':neig<0?'⬊':'➡',g:p.preis,h:p.hoch});zeigeKnoepfe();}
feld.addEventListener('click',e=>{e.stopPropagation();const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.dir!=null){if(zeiger){zeiger.dir=+b.dataset.dir;geistNeu();}}else if(b.dataset.neig!=null){neig=+b.dataset.neig;geistNeu();}
 else if(b.dataset.mat!=null){mat=+b.dataset.mat;geistNeu();}else if(b.dataset.bauen!=null)bauen();else if(b.dataset.zurueck!=null)zurueck();zeigeKnoepfe();});
// Werkzeug an/aus: welt-bau.js schaltet den Modus (data-wz="bruecke"); hier nur Feld und Text nachziehen
let war=false;const tick0=H.tick;H.tick=dt=>{tick0?.(dt);const an=werkzeug();if(an!==war){war=an;feld.hidden=!an;if(an){zeiger=null;geist=null;stapel=[];text();}else{zeiger=null;geist=null;}}};
// Zeiger: Ziehen bewegt die Kamera (lange Brücken), Antippen wählt das Startfeld
const zeiger0=H.pointer;H.pointer=(ph,p)=>werkzeug()?false:zeiger0?zeiger0(ph,p):false;
const tap0=H.tap;H.tap=(p,w)=>{if(!werkzeug())return tap0?tap0(p,w):false;const q=(W.bodenPunkt||W.tileAt)(p.x,p.y),tx=Math.floor(q.tx),ty=Math.floor(q.ty);
 // Antippen des Geisterstücks (oder knapp daneben in Bauhöhe) baut es; sonst neues Startfeld
 if(geist&&(geist.tx===tx&&geist.ty===ty||imGeist(p))){bauen();zeigeKnoepfe();return true;}start(tx,ty);return true;};
// im Werkzeug kein Doppeltipp-Zoom: Startfeld und gleich danach das Geisterstück antippen ist der Normalfall
const einzel0=H.singleTap;H.singleTap=()=>werkzeug()||!!einzel0?.();
function imGeist(p){const P=geist?.geo?.P;if(!P)return false;let inn=false;for(let i=0,j=3;i<4;j=i++){const a=P[i],b=P[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inn=!inn;}return inn;}
// Bodenwege gebaut oder abgerissen: Geländer der Brücken daneben anpassen
const rb0=W.rebake;W.rebake=ks=>{const r=rb0(ks);if(ks&&stuecke.size)umgebung(ks);else if(!ks)for(const q of stuecke.values())offenNeu(q);return r;};
// ---------- Zugänge ----------
W.brueckeAt=k=>stuecke.has(k);
// Bodenweg a, Nachbarfeld b mit Brückenstück: Randstein auf, wenn das Deck dort auf Bodenhöhe ansetzt (welt-raster.js, strMaske)
W.brueckeAnschluss=(a,b)=>{const q=stuecke.get(b);if(!q)return false;const ax=a%N,ay=(a/N)|0;for(let s=0;s<4;s++)if(nachbar(ax,ay,s)===b){const [c,d]=KANTE[s],[e,f]=GEGEN[s];return W.hc[a*4+c]===deckE(q,e)&&W.hc[a*4+d]===deckE(q,f);}return false;};
M.weltBruecke={MAT,MAXH,stuecke:()=>[...stuecke.values()],an:k=>stuecke.get(k),abreissen,start,bauen,zurueck,
 richtung(d){if(zeiger){zeiger.dir=d;geistNeu();}},neigung(s){neig=s;geistNeu();},material(m){mat=m;geistNeu();},get geist(){return geist;},get zeiger(){return zeiger;},
 // Spielstand: [k, Richtung, h0, h1, Material] je Stück
 daten(){const a=[];for(const p of stuecke.values())a.push(p.k,p.dir,p.h0,p.h1,p.mat);return a;},
 laden(a){stuecke.clear();if(!Array.isArray(a))return;for(let i=0;i+4<a.length;i+=5){const k=a[i],p={k,tx:k%N,ty:(k/N)|0,dir:a[i+1]&3,h0:a[i+2],h1:a[i+3],mat:a[i+4]?1:0};
  if(pruefe(p)&&p.hoch==null){let gmin=99;for(let c=0;c<4;c++)gmin=Math.min(gmin,bodenE(k,c));p.hoch=Math.max(0,Math.round((p.h0+p.h1)/2-gmin));p.preis=0;}
  p.geo=form(p);stuecke.set(k,p);}
  if(stuecke.size)W.rebake?.(umgebung([...stuecke.keys()]));}};
})();
