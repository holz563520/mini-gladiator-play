'use strict';
// =====================================================================================================================
// BEGEHBARKEIT (welt-begehbar.js) · Arena Theory 2.0, Schritt T4 (Thomas 13.11.2026, AT2_FAHRPLAN.md, Regel 18).
// Für jedes Feld und jede Figurenart (Gladiator, Besucher, Tier, Karren): ob und wie schnell man dort laufen kann.
// · Tempo je Boden (bestätigt, Faktor auf das heutige Lauftempo, ×100 gespeichert): Stein-/Prachtstraße 1,15 · Pflaster 1,1 · Kies 1,0 ·
//   Brücke 1,0 · Trampelpfad 0,95 · Wiese, Erde, Sand 0,85 · Wald, Nadelstreu, Kiesboden 0,75 · Schlamm, Schnee, Geröll 0,6 · Sumpf, Moor 0,45 ·
//   Wasser gesperrt. Nicht in der Liste, nach Ähnlichkeit gewählt: Dschungel wie Wald, Fels wie Geröll, Ludus-Boden, Übungsplatz,
//   Kampffläche und Gräberplatz wie Erde, Handelsstraße und Straßenbrücke wie Kies. Karren +10 % (nur auf Wegen). Hang wie bisher (W.hangF).
// · Wer wo (bestätigt): Besucher nur auf Wegen, Plätzen, Brücken und Toren, nie im Dorf oder auf dem Platz. Gladiatoren überall außer Wasser,
//   Gebäudewänden (Türen offen), großen Bäumen und Felsen, Zäunen und Palisaden (Tore offen). Tiere wie Gladiatoren, aber nie auf Brücken.
//   Karren nur auf Kiesweg und besser, keine steilen Hänge (Feld mit 2 Stufen Höhenunterschied, Kante mit Stufe).
// · Zäune liegen auf den Kanten (W.zaunA/zaunB) und werden beim Schritt von Feld zu Feld geprüft. Brücken (T2) sind eine eigene obere Ebene:
//   Übergang dort, wo das Deck auf gleicher Höhe an Boden oder Brücke anschließt; darunter läuft man ab 2 Stufen Abstand.
// · Neu gerechnet wird nur, was sich ändert: W.rebake(ks) wird umwickelt (wie in welt-bruecke.js), die Felder kommen in eine Liste und werden
//   beim nächsten Bild (oder bei der nächsten Abfrage) im Rechteck ±1 neu gerechnet. Wege, die dort liegen, werden als kaputt markiert.
// · Wegfindung: A* mit 8 Richtungen (schräg nur, wenn beide Nachbarn frei sind), Kosten nach Tempo und Hang, danach geglättet.
//   Suchen stehen in einer Warteschlange und rechnen höchstens BUDGET ms je Bild weiter; gleiche Strecken werden geteilt (Zwischenspeicher).
// · Eingesperrt (Regel 18): Figuren auf gesperrtem Feld gehen zum nächsten freien; wer nicht mehr wegkommt, meldet sich (schwarzer Humor).
// · Anzeige „begehbar / gesperrt“ im Baumenü (Gruppe Werkzeug): grün zügig, gelb langsam, rot gesperrt; nur der sichtbare Ausschnitt.
// · Zugänge: M.weltBegehbar (unten). Notausschalter: 'welt-begehbar' aus WELT_EXTRA in arena-theory-2.html nehmen (alte Bewegung).
// · Nur Arena Theory 2.0 (window.AT2 mit Anordnung). 1.0 bleibt unberührt.
// =====================================================================================================================
(()=>{
const M=window.MG,W=window.WeltKarte,H=window.WeltHook,L=window.AT2Sprache;if(!window.AT2||!M||!W||!H||!W.ANORD)return;
const N=W.N,NN=N*N,T=W.T,HZ=W.HZ||8,t=(k,v)=>L?L.t(k,v):k,NB=window.WeltNatur;
const ARTEN=['gladiator','besucher','tier','karren'],GL=0,BE=1,TI=2,KA=3,BUDGET=1,BMAX=1<<15;
const karte=ARTEN.map(()=>new Uint8Array(NN));
// ---------- Tempo je Boden ----------
const BODEN=new Uint8Array(256);{const s=(v,...ts)=>{for(const x of ts)if(x!=null)BODEN[x]=v;};
 s(115,T.STR4,T.STR5);s(110,T.STR3);s(100,T.STR2,T.WEG,T.BRUECKE,T.WARTE);// B0b: Wartestraße: Gladiatoren dürfen drüber, Besucher nicht (kein WEGE; die Schlange führt welt-arena.js)
 s(95,T.STR1);
 s(85,T.WIESE,T.ERDE,T.SAND,T.TROCKEN,T.LUDUS,T.PLATZ,T.ARENA,T.GRAB);s(75,T.WALD,T.NADEL,T.KIES,T.DSCH);
 s(60,T.SCHLAMM,T.SCHNEE,T.GEROELL,T.FELS);s(45,T.SUMPF,T.MOOR);}
const WEGE=new Set([T.WEG,T.BRUECKE,T.STR1,T.STR2,T.STR3,T.STR4,T.STR5]),KARRENWEG=new Set([T.WEG,T.BRUECKE,T.STR2,T.STR3,T.STR4,T.STR5]);
const BER=W.BER||{DORF:1,PLATZ:2,PARK:3};
// ---------- Kanten, Ecken, Brücken ----------
const DX=[1,0,-1,0],DY=[0,1,0,-1],KANTE=[[1,2],[3,2],[0,3],[0,1]],GEGEN=[[0,3],[0,1],[1,2],[3,2]],EIN=[[0,3],[0,1],[1,2],[3,2]];
const zaun=(k,s)=>s===0?W.zaunB[k+1]:s===2?W.zaunB[k]:s===1?W.zaunA[k+N]:W.zaunA[k];
const bodenE=(k,c)=>{const h=W.hc[k*4+c];return W.feld[k]===T.FLUSS?Math.max(h,W.WL):h;};
const BR=()=>M.weltBruecke,deckE=(p,c)=>EIN[p.dir].includes(c)?p.h0:p.h1;
const brMark=new Uint8Array(NN),brIdx=new Map();let brK=new Int32Array(64),brN=0;
function brueckenNeu(){brMark.fill(0);brIdx.clear();brN=0;const L=BR()?.stuecke?.()||[];if(brK.length<L.length)brK=new Int32Array(L.length*2);
 for(const p of L){if(brN>=BMAX)break;brMark[p.k]=1;brIdx.set(p.k,brN);brK[brN++]=p.k;}}
const brAn=k=>brMark[k]?BR()?.an?.(k):null;
// Abstand unter dem Deck (Stufen): tiefste Deck-Ecke minus höchste Boden-Ecke
function brFrei(p){let d=99,g=-99;for(let c=0;c<4;c++){d=Math.min(d,deckE(p,c));g=Math.max(g,bodenE(p.k,c));}return d-g;}
// Türen der Gebäude (welt-gebaeude.js): bleiben offen, man kommt immer hinein (Regel 11)
const tuer=new Uint8Array(NN);
let tuerL=[],haeuserAlt=null;
function tuerenNeu(){const neu=[];for(const h of M.weltGebaeude?.haeuser?.()||[])if(h.door)neu.push(h.door.k);const weg=tuerL;for(const k of weg)tuer[k]=0;for(const k of neu)tuer[k]=1;tuerL=neu;return weg.concat(neu);}
// T4-Rückmeldung (Thomas 13.11.2026): Bäume, Felsen und Büsche sperren nicht das ganze Feld, nur ihren Fuß in der Feldmitte (Radius RAD Felder).
// Wege führen seitlich daran vorbei; geglättete Strecken halten Abstand.
const RAD=.22,AB=.38;
const hind=k=>{const o=W.obj[k];return o&&NB&&!NB.ARTEN[o]?.flach?RAD:0;};
// ---------- Felder rechnen ----------
function rechneFeld(k){const f=W.feld[k];let g=BODEN[f];
 if(!g&&tuer[k])g=85;
 if(g&&brMark[k]){const p=brAn(k);if(p&&brFrei(p)<2)g=0;}// zu niedrig unter der Brücke
 karte[GL][k]=g;karte[TI][k]=g;
 const b=W.ber[k];karte[BE][k]=g&&WEGE.has(f)&&b!==BER.DORF&&b!==BER.PLATZ?g:0;
 let ka=0;if(g&&KARRENWEG.has(f)){const h=W.hc,i=k*4,lo=Math.min(h[i],h[i+1],h[i+2],h[i+3]),hi=Math.max(h[i],h[i+1],h[i+2],h[i+3]);if(hi-lo<2)ka=Math.min(255,Math.round(g*1.1));}
 karte[KA][k]=ka;}
function rechneRechteck(x0,y0,x1,y1){for(let y=y0;y<=y1;y++){const r=y*N;for(let x=x0;x<=x1;x++)rechneFeld(r+x);}}
// ---------- Änderungen ----------
let alles=true,ver=0,zeitVoll=0,zeitTeil=0;const offen=[],horcher=[];
const rb0=W.rebake;W.rebake=ks=>{const r=rb0(ks);if(!ks||!ks.length)alles=true;else{let x0=N,y0=N,x1=0,y1=0;for(const k of ks){const x=k%N,y=(k/N)|0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
 offen.push([Math.max(0,x0-1),Math.max(0,y0-1),Math.min(N-1,x1+1),Math.min(N-1,y1+1)]);}return r;};
function flush(){if(!alles&&!offen.length)return;const a=performance.now();brueckenNeu();tuerenNeu();let rs;
 if(alles){alles=false;offen.length=0;rechneRechteck(0,0,N-1,N-1);rs=[[0,0,N-1,N-1]];zeitVoll=performance.now()-a;}
 else{rs=offen.splice(0);for(const r of rs)rechneRechteck(r[0],r[1],r[2],r[3]);zeitTeil=performance.now()-a;}
 ver++;for(const r of rs)kaputtIn(r);for(const r of rs)for(const fn of horcher)try{fn(r);}catch(e){console.warn(e);}}
// ---------- Schritte zwischen Feldern ----------
// Knoten: Boden k (0 … NN−1), Brücke NN + Index. Kanten am Boden: Ecken dürfen höchstens 1 Stufe springen (Karren 0).
const istBr=u=>u>=NN,kVon=u=>u>=NN?brK[u-NN]:u;
function tempoK(a,u){if(u<NN)return karte[a][u];return a===TI?0:a===KA?110:100;}
function bodenKante(a,k,n,s){const [p,q]=KANTE[s],[r,o]=GEGEN[s],m=a===KA?0:1;return Math.abs(bodenE(k,p)-bodenE(n,r))<=m&&Math.abs(bodenE(k,q)-bodenE(n,o))<=m;}
// von Knoten u in Richtung s: Zielknoten oder −1
function schritt(a,u,s){const k=kVon(u),x=k%N+DX[s],y=((k/N)|0)+DY[s];if(x<0||y<0||x>=N||y>=N)return -1;const n=y*N+x;if(zaun(k,s))return -1;
 const [p,q]=KANTE[s],[r,o]=GEGEN[s];
 if(istBr(u)){const P=brAn(k);if(!P)return -1;const Q=brAn(n);
  if(Q&&a!==TI&&deckE(P,p)===deckE(Q,r)&&deckE(P,q)===deckE(Q,o))return NN+brIdx.get(n);
  if(karte[a][n]&&deckE(P,p)===bodenE(n,r)&&deckE(P,q)===bodenE(n,o))return n;return -1;}
 if(brMark[n]&&a!==TI){const Q=brAn(n);if(Q&&deckE(Q,r)===bodenE(k,p)&&deckE(Q,o)===bodenE(k,q))return NN+brIdx.get(n);}
 if(karte[a][n]&&bodenKante(a,k,n,s))return n;// auch von einem gesperrten Startfeld hinaus
 return -1;}
// schräg (dx,dy ∈ ±1): nur am Boden, beide Umwege müssen gehen
function schraeg(a,k,sx,sy){const ax=schritt(a,k,sx);if(ax<0||ax>=NN)return -1;const ay=schritt(a,k,sy);if(ay<0||ay>=NN)return -1;const d1=schritt(a,ax,sy),d2=schritt(a,ay,sx);return d1>=0&&d1===d2&&d1<NN?d1:-1;}
// ---------- A* (fortsetzbar) ----------
let gS=null,par=null,stp=null,stamp=0,hN=new Int32Array(1<<14),hF=new Float32Array(1<<14),hLen=0;
function speicher(){if(!gS){gS=new Float32Array(NN+BMAX);par=new Int32Array(NN+BMAX);stp=new Uint32Array(NN+BMAX);}}
function hPush(u,f){if(hLen>=hN.length){const a=new Int32Array(hN.length*2),b=new Float32Array(hN.length*2);a.set(hN);b.set(hF);hN=a;hF=b;}let i=hLen++;
 while(i>0){const j=(i-1)>>1;if(hF[j]<=f)break;hN[i]=hN[j];hF[i]=hF[j];i=j;}hN[i]=u;hF[i]=f;}
function hPop(){const u=hN[0],lu=hN[--hLen],lf=hF[hLen];let i=0;for(;;){let c=2*i+1;if(c>=hLen)break;if(c+1<hLen&&hF[c+1]<hF[c])c++;if(hF[c]>=lf)break;hN[i]=hN[c];hF[i]=hF[c];i=c;}if(hLen>0){hN[i]=lu;hF[i]=lf;}return u;}
const MINK=100/127,SQ=Math.SQRT2;
const hoeheM=k=>{const i=k*4,h=W.hc;return (h[i]+h[i+1]+h[i+2]+h[i+3])/4;};
function heur(u,z){const a=kVon(u),b=kVon(z),dx=Math.abs(a%N-b%N),dy=Math.abs(((a/N)|0)-((b/N)|0));return (dx+dy+(SQ-2)*Math.min(dx,dy))*MINK;}
function kosten(a,u,v,d){const tv=tempoK(a,v);if(!tv)return 1e9;const dh=istBr(u)||istBr(v)?0:Math.abs(hoeheM(kVon(v))-hoeheM(kVon(u)));return d*100/tv*(1+.15*dh);}
const DIAG=[[0,1],[1,2],[2,3],[3,0]];
function suchStart(S){speicher();stamp++;if(stamp>4e9){stp.fill(0);stamp=1;}hLen=0;S.st=stamp;gS[S.von]=0;par[S.von]=0;stp[S.von]=stamp;hPush(S.von,heur(S.von,S.nach));S.n=0;S.lauf=true;}
// rechnet bis zur Frist weiter; gibt true zurück, wenn fertig
function suchWeiter(S,frist){if(!S.lauf||S.st!==stamp)suchStart(S);let i=0;
 while(hLen){if((++i&255)===0&&performance.now()>frist)return false;const u=hPop();if(par[u]<0)continue;// schon zu
  if(u===S.nach){S.erg=pfadAus(S);return true;}
  if(++S.n>S.max){S.erg=null;return true;}
  const gu=gS[u];par[u]=-1-par[u];// zu (par: offen = Vorgänger+1, zu = −1 − das)
  for(let s=0;s<4;s++){const v=schritt(S.art,u,s);if(v>=0)entspanne(S,u,v,gu+kosten(S.art,u,v,1));}
  if(u<NN)for(const [p,q] of DIAG){const v=schraeg(S.art,u,p,q);if(v>=0)entspanne(S,u,v,gu+kosten(S.art,u,v,SQ));}}
 S.erg=null;return true;}
function entspanne(S,u,v,g){if(stp[v]===stamp){if(par[v]<0||g>=gS[v])return;}else stp[v]=stamp;gS[v]=g;par[v]=u+1;hPush(v,g+heur(v,S.nach));}
const vorg=u=>{const p=par[u];return (p<0?-1-p:p)-1;};
function pfadAus(S){const ns=[];for(let u=S.nach;u!==-1;u=vorg(u)){ns.push(u);if(u===S.von)break;}ns.reverse();
 const pts=glaetten(S.art,ns,punkte(ns));
 let x0=N,y0=N,x1=0,y1=0;for(const u of ns){const k=kVon(u),x=k%N,y=(k/N)|0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
 return {art:S.art,pts,knoten:Int32Array.from(ns),box:[x0,y0,x1,y1],kaputt:false,ver};}
// Punkte je Knoten: Feldmitte; steht dort ein Baum oder Fels, seitlich daran vorbei (gleiche Seite wie zuletzt), am Ziel davor stehen bleiben
function punkte(ns){const n=ns.length,mx=i=>{const k=kVon(ns[i]);return k%N+.5;},my=i=>{const k=kVon(ns[i]);return ((k/N)|0)+.5;};let seite=1;const out=[];
 for(let i=0;i<n;i++){const u=ns[i],k=kVon(u),x=mx(i),y=my(i);if(istBr(u)||!hind(k)||i===0){out.push({x,y,b:istBr(u)?1:0,k:u});continue;}
  const a=i>0?i-1:i,c=i<n-1?i+1:i;let dx=mx(c)-mx(a),dy=my(c)-my(a);const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;
  if(i===n-1)out.push({x:x-dx*AB,y:y-dy*AB,b:0,k:u});else out.push({x:x-dy*AB*seite,y:y+dx*AB*seite,b:0,k:u});}
 return out;}
// Glätten: von einem Ankerpunkt so weit wie möglich geradeaus (Sichtlinie über freie Felder, nicht langsamer als der Umweg, keine Brücke,
// mit Abstand zu Bäumen und Felsen)
function glaetten(a,ns,P){if(P.length<3)return P.map(p=>({x:p.x,y:p.y,b:p.b}));const out=[P[0]];let i=0;
 while(i<P.length-1){let j=i+1;if(!P[i].b)for(let m=Math.min(P.length-1,i+24);m>i+1;m--){if(P[m].b)continue;let lo=255;for(let q=i;q<=m;q++){if(P[q].b){lo=-1;break;}lo=Math.min(lo,karte[a][ns[q]]);}if(lo>0&&sicht(a,P[i],P[m],lo)){j=m;break;}}
  out.push(P[j]);i=j;}return out.map(p=>({x:p.x,y:p.y,b:p.b}));}
function sicht(a,p0,p1,lo){let x=p0.x,y=p0.y;const d=Math.hypot(p1.x-x,p1.y-y),n=Math.max(1,Math.ceil(d*5)),sx=(p1.x-x)/n,sy=(p1.y-y)/n;let k=Math.floor(y)*N+Math.floor(x);
 for(let i=1;i<=n;i++){x+=sx;y+=sy;const nk=Math.floor(y)*N+Math.floor(x);
  if(nk!==k){const ddx=nk%N-k%N,ddy=((nk/N)|0)-((k/N)|0);if(Math.abs(ddx)>1||Math.abs(ddy)>1)return false;let v;
   if(ddx&&ddy)v=schraeg(a,k,ddx>0?0:2,ddy>0?1:3);else v=schritt(a,k,ddx>0?0:ddx<0?2:ddy>0?1:3);if(v!==nk||karte[a][nk]<lo)return false;k=nk;}
  const r=hind(k);if(r&&i<n&&Math.hypot(x-(k%N+.5),y-(((k/N)|0)+.5))<r+.1)return false;}return true;}
// ---------- Warteschlange, Zwischenspeicher ----------
const schlange=[],ablage=new Map();let rechenZeit=0,suchen=0;
function kaputtIn(r){const [x0,y0,x1,y1]=r;for(const [key,p] of ablage){const b=p.box;if(b[2]<x0||b[0]>x1||b[3]<y0||b[1]>y1)continue;
  for(const u of p.knoten){const k=kVon(u),x=k%N,y=(k/N)|0;if(x>=x0&&x<=x1&&y>=y0&&y<=y1){p.kaputt=true;ablage.delete(key);break;}}}}
// laufende Wege, die nicht in der Ablage liegen (abgelaufen), merkt sich die Ablage nicht; deshalb bleiben alle ausgegebenen Wege
// bis zur nächsten Änderung in ihr (höchstens ABLAGE Stück, die ältesten fliegen, sind dann aber auch nicht mehr kaputt-meldbar)
const ABLAGE=600;
function frei(a,k){flush();return k>=0&&k<NN&&karte[a][k]>0;}
// nächstes freies Feld um k (Ring für Ring, höchstens r Felder weit)
function naechstesFrei(a,k,r=8){flush();if(karte[a][k])return k;const x=k%N,y=(k/N)|0;
 for(let d=1;d<=r;d++){let best=-1,bd=1e9;for(let j=-d;j<=d;j++)for(let i=-d;i<=d;i++){if(Math.max(Math.abs(i),Math.abs(j))!==d)continue;const xx=x+i,yy=y+j;if(xx<0||yy<0||xx>=N||yy>=N)continue;const q=yy*N+xx;if(karte[a][q]){const e=i*i+j*j;if(e<bd){bd=e;best=q;}}}if(best>=0)return best;}return -1;}
const kVonP=p=>Math.max(0,Math.min(N-1,Math.floor(p.ty)))*N+Math.max(0,Math.min(N-1,Math.floor(p.tx)));
// Weg suchen: von/nach {tx,ty[,b]} in Feldkoordinaten; fertig(pfad|null) kommt sofort (Ablage) oder in einem der nächsten Bilder.
// pfad.pts: [{x,y,b}] Feldmitten (Feldkoordinaten), b = auf der Brücke. pfad.kaputt wird true, wenn sich unterwegs etwas ändert.
function weg(a,von,nach,fertig,opt={}){flush();let s=kVonP(von),z=kVonP(nach);
 if(von.b&&brMark[s]&&a!==TI)s=NN+brIdx.get(s);else{s=naechstesFrei(a,s,opt.rand??6);}
 if(nach.b&&brMark[z]&&a!==TI)z=NN+brIdx.get(z);else z=naechstesFrei(a,z,opt.rand??6);
 if(s<0||z<0){fertig(null);return;}const key=a+':'+s+':'+z,alt=ablage.get(key);
 if(alt&&!alt.kaputt){ablage.delete(key);ablage.set(key,alt);fertig(alt);return;}
 for(const q of schlange)if(q.key===key){q.cbs.push(fertig);return;}
 schlange.push({key,art:a,von:s,nach:z,max:opt.max||60000,cbs:[fertig],st:0});}
function arbeiten(){if(!schlange.length)return;const a=performance.now(),frist=a+BUDGET;
 while(schlange.length&&performance.now()<frist){const S=schlange[0];if(!suchWeiter(S,frist))break;schlange.shift();suchen++;
  if(S.erg){ablage.set(S.key,S.erg);if(ablage.size>ABLAGE)ablage.delete(ablage.keys().next().value);}for(const cb of S.cbs)try{cb(S.erg);}catch(e){console.warn(e);}}
 rechenZeit=performance.now()-a;}
// ---------- Eingesperrt ----------
// zählt erreichbare Felder ab k (höchstens GENUG); weniger als GENUG = eingesperrt
const GENUG=12;
function eingesperrt(a,k){flush();const s=naechstesFrei(a,k,3);if(s<0)return true;const seen=new Set([s]),q=[s];
 while(q.length&&seen.size<GENUG){const u=q.shift();for(let d=0;d<4;d++){const v=schritt(a,u,d);if(v>=0&&!seen.has(v)){seen.add(v);q.push(v);}}}return seen.size<GENUG;}
let gemeldet=0;
function melde(a,name){const jetzt=performance.now();if(jetzt-gemeldet<4000)return false;gemeldet=jetzt;const n=1+((Math.random()*3)|0);
 M.ui?.notify?.(t('bg.gesperrt.'+ARTEN[a]+'.'+n,{name:name||'?'}));return true;}
// ---------- Höhe auf der Brücke ----------
function deckHz(tx,ty,sonst){const x=Math.floor(tx),y=Math.floor(ty);if(x<0||y<0||x>=N||y>=N)return sonst;const p=brAn(y*N+x);if(!p)return sonst;
 const u=tx-x,v=ty-y,h=c=>deckE(p,c);return ((h(0)*(1-u)+h(1)*u)*(1-v)+(h(3)*(1-u)+h(2)*u)*v)*HZ;}
function tempoBei(a,x,y,br){const c=W.tileAt(x,y),tx=Math.floor(c.tx),ty=Math.floor(c.ty);if(tx<0||ty<0||tx>=N||ty>=N)return 100;const k=ty*N+tx;
 if(br&&brMark[k])return tempoK(a,NN);return karte[a][k];}
// ---------- Anzeige ----------
// Leistung: Die Anzeige wird stückweise (Kacheln aus C × C Feldern) in kleine Bilder gemalt und gemerkt; je Bild werden nur die
// sichtbaren Kacheln aufgelegt. Neu gemalt wird nur, was sich geändert hat (je Bild höchstens MAL_MS ms). Weit draußen gröbere Kacheln.
let anzeige=false,anzArt=GL,anzZeit=0,malZeit=0;const FARBE=['#c81e14','#e3b341','#4cae4c'],STUFEN=[[1.2,8],[.6,16],[.3,32],[.15,64],[0,128]],KW=256,MAL_MS=2,KACHELN=100;
const kacheln=new Map();// Schlüssel → {c,x,y,w,h}
function kachelWeg(r){for(const [key,o] of kacheln){if(o.x1<r[0]||o.x0>r[2]||o.y1<r[1]||o.y0>r[3])continue;kacheln.delete(key);}}
horcher.push(kachelWeg);
const g0=H.ground;H.ground=(ctx,view)=>{g0?.(ctx,view);if(!anzeige)return;flush();const a0=performance.now();malen(ctx,view,a0);anzZeit=performance.now()-a0;};
function malen(ctx,view,a0){const cs=W.cam.s,TW=W.TW,TH=W.TH,o=W.iso(0,0),OX=o.x,OY=o.y,hm=(W.HMAX+1)*HZ,mi=(1-Math.min(0,W.HMIN))*HZ;
 let lv=0;while(cs<STUFEN[lv][0])lv++;const C=STUFEN[lv][1];
 const u0=Math.floor((view.x0-OX)/(TW/2))-2,u1=Math.ceil((view.x1-OX)/(TW/2))+2,v0=Math.floor((view.y0-OY-mi)/(TH/2))-2,v1=Math.ceil((view.y1-OY+hm)/(TH/2))+2;
 const tx0=Math.max(0,Math.floor((u0+v0)/2)),tx1=Math.min(N-1,Math.ceil((u1+v1)/2)),ty0=Math.max(0,Math.floor((v0-u1)/2)),ty1=Math.min(N-1,Math.ceil((v1-u0)/2));
 ctx.save();ctx.globalAlpha=.42;ctx.imageSmoothingEnabled=false;let neu=0;
 for(let cy=Math.floor(ty0/C);cy<=Math.floor(ty1/C);cy++)for(let cx=Math.floor(tx0/C);cx<=Math.floor(tx1/C);cx++){const x0=cx*C,y0=cy*C;
  const bx0=(x0-(y0+C))*TW/2+OX,bx1=(x0+C-y0)*TW/2+OX,by0=(x0+y0)*TH/2+OY-hm,by1=(x0+y0+2*C)*TH/2+OY+mi;if(bx1<view.x0||bx0>view.x1||by1<view.y0||by0>view.y1)continue;
  const key=anzArt+'|'+lv+'|'+cx+'|'+cy;let k=kacheln.get(key);
  if(!k){if(neu&&performance.now()-a0>MAL_MS)continue;neu++;const m0=performance.now();k=kachel(anzArt,x0,y0,C,lv,bx0,by0,bx1,by1,OX,OY);malZeit=performance.now()-m0;kacheln.set(key,k);if(kacheln.size>KACHELN)kacheln.delete(kacheln.keys().next().value);}
  else{kacheln.delete(key);kacheln.set(key,k);}
  ctx.drawImage(k.c,k.bx0,k.by0,k.bx1-k.bx0,k.by1-k.by0);}
 ctx.restore();}
function kachel(a,x0,y0,C,lv,bx0,by0,bx1,by1,OX,OY){const sc=KW/(bx1-bx0),cv=document.createElement('canvas');cv.width=KW;cv.height=Math.max(1,Math.ceil((by1-by0)*sc));
 const g=cv.getContext('2d'),A=karte[a],hc=W.hc,TW=W.TW,TH=W.TH,b=lv>=3?1<<(lv-2):1,P=[[],[],[],[]],X=(x,y)=>((x-y)*TW/2+OX-bx0)*sc,Y=(x,y,h)=>((x+y)*TH/2+OY-h*HZ-by0)*sc;
 for(let ty=y0;ty<Math.min(N,y0+C);ty+=b)for(let tx=x0;tx<Math.min(N,x0+C);tx+=b){const k=ty*N+tx,p=brMark[k]?brAn(k):null;let c,h0,h1,h2,h3;
  if(p){c=tempoK(a,NN)?2:0;h0=deckE(p,0);h1=deckE(p,1);h2=deckE(p,2);h3=deckE(p,3);}else{const s=A[k];c=s===0?0:s<95?1:2;if(b===1){h0=hc[k*4];h1=hc[k*4+1];h2=hc[k*4+2];h3=hc[k*4+3];}else h0=h1=h2=h3=hc[k*4];}
  const xb=tx+b,yb=ty+b;P[c].push(X(tx,ty),Y(tx,ty,h0),X(xb,ty),Y(xb,ty,h1),X(xb,yb),Y(xb,yb,h2),X(tx,yb),Y(tx,yb,h3));
  if(lv<=1&&!p&&A[k]&&hind(k)){const cx=tx+.5,cy=ty+.5,r=RAD,hh=(h0+h1+h2+h3)/4;P[3].push(X(cx-r,cy),Y(cx-r,cy,hh),X(cx,cy-r),Y(cx,cy-r,hh),X(cx+r,cy),Y(cx+r,cy,hh),X(cx,cy+r),Y(cx,cy+r,hh));}}// Fuß eines Baums oder Felsens (zuletzt gemalt)
 for(let c=0;c<4;c++){const L=P[c];if(!L.length)continue;g.fillStyle=FARBE[c%3];g.beginPath();for(let i=0;i<L.length;i+=8){g.moveTo(L[i],L[i+1]);g.lineTo(L[i+2],L[i+3]);g.lineTo(L[i+4],L[i+5]);g.lineTo(L[i+6],L[i+7]);g.closePath();}g.fill();}
 if(lv<=1){g.strokeStyle='#5a0a04';g.lineWidth=Math.max(1.5,4*sc);g.beginPath();// Zäune und Palisaden
  for(let ty=y0;ty<Math.min(N,y0+C);ty++)for(let tx=x0;tx<Math.min(N,x0+C);tx++){const k=ty*N+tx;
   if(W.zaunA[k]){g.moveTo(X(tx,ty),Y(tx,ty,hc[k*4]));g.lineTo(X(tx+1,ty),Y(tx+1,ty,hc[k*4+1]));}
   if(W.zaunB[k]){g.moveTo(X(tx,ty),Y(tx,ty,hc[k*4]));g.lineTo(X(tx,ty+1),Y(tx,ty+1,hc[k*4+3]));}}g.stroke();}
 return {c:cv,bx0,by0,bx1,by1,x0:x0-1,y0:y0-1,x1:x0+C,y1:y0+C};}
// Knopf im Baumenü (Gruppe Werkzeug) und Wahl der Figurenart
const box=document.getElementById('wBau'),sp=box?.querySelector('span');let kn=null,reihe=null;
if(box){kn=document.createElement('button');kn.className='w-btn';kn.dataset.bg='1';(box.querySelector('.bau-gruppe[data-gruppe="werkzeug"] > div')||box.querySelector('.bau-wz'))?.appendChild(kn);
 reihe=document.createElement('div');reihe.className='bau-wz bau-begehbar';reihe.hidden=true;box.insertBefore(reihe,sp||null);
 kn.addEventListener('click',e=>{e.stopPropagation();schalte(!anzeige);});
 reihe.addEventListener('click',e=>{e.stopPropagation();const b=e.target.closest('button[data-art]');if(b){anzArt=+b.dataset.art;texte();}});}
function texte(){if(!kn)return;kn.textContent=t('bg.knopf');kn.classList.toggle('on',anzeige);
 reihe.innerHTML='<b>'+t('bg.titel')+'</b>'+ARTEN.map((n,i)=>'<button class="w-btn'+(i===anzArt?' on':'')+'" data-art="'+i+'">'+t('bg.art.'+n)+'</button>').join('')+'<small>'+t('bg.legende')+'</small>';reihe.hidden=!anzeige;window.AT2_IKON?.ersetzen?.(kn);window.AT2_IKON?.ersetzen?.(reihe);}
function schalte(an,art){anzeige=!!an;if(art!=null)anzArt=art;texte();}
texte();L?.beiWechsel?.(texte);
// ---------- Takt ----------
const tick0=H.tick;H.tick=dt=>{tick0?.(dt);const hs=M.weltGebaeude?.haeuser?.();if(hs&&hs!==haeuserAlt){haeuserAlt=hs;if(!alles){const ks=tuerenNeu();if(ks.length){for(const k of ks)rechneFeld(k);ver++;}}}flush();arbeiten();if(anzeige&&box&&box.hidden)schalte(false);};
M.weltBegehbar={ARTEN,GL,BE,TI,KA,BODEN,karte,tempo:(a,k)=>{flush();return karte[a][k];},frei,naechstesFrei,weg,tempoBei,deckHz,eingesperrt,melde,hindernis:hind,RAD,
 beiAenderung(fn){horcher.push(fn);},anzeige:schalte,get an(){return anzeige;},get art(){return anzArt;},get version(){return ver;},
 schritt:(a,k,s)=>{flush();return schritt(a,k,s);},neuRechnen(){alles=true;flush();},
 // Messwerte für Tests
 get zeit(){return {voll:zeitVoll,teil:zeitTeil,suche:rechenZeit,anzeige:anzZeit,kachel:malZeit,kacheln:kacheln.size,suchen,schlange:schlange.length,ablage:ablage.size};},
 sofort(a,von,nach,opt){let r;weg(a,von,nach,p=>{r=p;},opt);while(r===undefined&&schlange.length){const S=schlange[0];suchWeiter(S,1e18);schlange.shift();if(S.erg)ablage.set(S.key,S.erg);for(const cb of S.cbs)cb(S.erg);}return r??null;}};
})();
