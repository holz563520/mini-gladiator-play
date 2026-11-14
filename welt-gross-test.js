'use strict';
// GROSSWELT-TEST: streamt nur sichtbare äußere Landschaft, begrenzter Bildcache; bestehende 960er-Stadt bleibt spielbar.
(()=>{
 const W=window.WeltKarte,C=window.WeltGrossCore,NB=window.WeltNatur;if(!W||!C)throw Error('Großwelt-Test: Kartenkern fehlt');
 const world=C.create(window.AT2_GROSS_SEED),cache=new C.ImageCache(),CH=512,OX=W.iso(0,0).x,OY=W.iso(0,0).y;
 const left=OX-C.SIZE*32,top=OY+C.MIN*32,width=C.SIZE*64,height=C.SIZE*32;
 const clamp=C.clamp,inside=(x,y)=>x>=C.MIN&&y>=C.MIN&&x<C.MAX&&y<C.MAX;
 const texts=new Proxy({}, {get:(_,key)=>window.AT2Sprache?.t('gross.'+key)||String(key)});
 const panel=document.createElement('details');panel.id='grossPanel';panel.open=innerWidth>600;
 panel.innerHTML=`<summary>${texts.title}</summary><p>${texts.note}</p><canvas id="grossMini" width="320" height="160" aria-label="${texts.fit}"></canvas><div class="controls"><button data-go="home">${texts.home}</button><button data-go="fit">${texts.fit}</button><button data-go="random">${texts.random}</button><button data-go="zoom">+</button><button data-go="out">−</button><button data-go="new">${texts.new}</button></div><p>${texts.limit}</p><small id="grossStats"></small>`;
 document.body.appendChild(panel);
 const stats=document.getElementById('grossStats'),mini=document.getElementById('grossMini'),mg=mini.getContext('2d');
 const overview=document.createElement('canvas');overview.width=1024;overview.height=512;const og=overview.getContext('2d');
 const home={x:W.cam.x,y:W.cam.y,s:W.cam.s};let job=null,queue=[],wanted=new Set(),overviewDone=false,overviewRows=0,prepMS=0,completed=0,lastHUD=0,jobCount=0;
 const colors=W.testPalette.map(p=>`rgb(${p[0].join(',')})`);
 function polygon(g,points,color){g.fillStyle=color;g.beginPath();g.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);g.closePath();g.fill();}
 function* overviewSteps(){const step=C.SIZE/160;for(let y=C.MIN;y<C.MAX;y+=step){for(let x=C.MIN;x<C.MAX;x+=step){const t=world.sample(x+step/2,y+step/2);polygon(og,[[x,y],[x+step,y],[x+step,y+step],[x,y+step]].map(([a,b])=>{const p=W.iso(a,b);return{x:(p.x-left)/width*1024,y:(p.y-top)/height*512};}),colors[t.type]);}overviewRows++;yield;}overviewDone=true;}
 const overviewJob=overviewSteps();
 // Blend the exterior boundary to the existing terrain; no changes to the central game's arrays.
 function elevation(x,y){const raw=Math.max(-.6,world.height(x,y)),cx=clamp(x,0,W.N-1),cy=clamp(y,0,W.N-1),d=Math.max(Math.abs(x-cx),Math.abs(y-cy));if(d>=24)return raw;return W.hoehe(cx,cy)*(1-d/24)+raw*(d/24);}
 function* buildChunk(cx,cy,lod){
  const c=document.createElement('canvas');c.width=CH;c.height=CH;const g=c.getContext('2d');g.imageSmoothingEnabled=false;const x0=cx*CH*lod,y0=cy*CH*lod;
  const step=Math.max(1,lod/2),corners=[[x0-100,y0-80],[x0+(CH+1)*lod+100,y0-80],[x0-100,y0+(CH+1)*lod+220],[x0+(CH+1)*lod+100,y0+(CH+1)*lod+220]].map(([x,y])=>W.tileAt(x,y));
  const xmin=Math.max(C.MIN,Math.floor(Math.min(...corners.map(p=>p.tx))/step)*step),xmax=Math.min(C.MAX-step,Math.ceil(Math.max(...corners.map(p=>p.tx))/step)*step),ymin=Math.max(C.MIN,Math.floor(Math.min(...corners.map(p=>p.ty))/step)*step),ymax=Math.min(C.MAX-step,Math.ceil(Math.max(...corners.map(p=>p.ty))/step)*step);
  let delivered=false;try{const objects=[];g.setTransform(1/lod,0,0,1/lod,-x0/lod,-y0/lod);
  for(let sum=xmin+ymin;sum<=xmax+ymax;sum+=step){for(let x=Math.max(xmin,sum-ymax);x<=Math.min(xmax,sum-ymin);x+=step){const y=sum-x;if(!inside(x,y))continue;
    if(x>=0&&y>=0&&x+step<=W.N&&y+step<=W.N)continue;
    const p=W.iso(x,y);if(p.x<x0-64*step-100||p.x>x0+CH*lod+64*step+100||p.y<y0-64*step-100||p.y>y0+CH*lod+220)continue;const t=world.sample(x+step/2,y+step/2);
    if(lod<=2){const pts=[[x,y],[x+step,y],[x+step,y+step],[x,y+step]].map(([a,b])=>{const q=W.iso(a,b);q.y-=elevation(a,b)*8;return q;});
     const h0=elevation(x,y),h1=elevation(x+step,y),h2=elevation(x,y+step),shade=clamp(1+(h2-h0)*.13-(h1-h0)*.16,.65,1.3),col=W.testPalette[t.type][0].map(v=>Math.round(clamp(v*shade,0,255)));
     polygon(g,pts,`rgb(${col.join(',')})`);
     if(Math.abs(h1-h0)<.025&&Math.abs(h2-h0)<.025&&step===1){const sp=W.testGroundSprites[t.type*3+Math.floor(world.hash(x,y,3)*3)];if(sp)g.drawImage(sp,p.x-32,p.y-h0*8);}
     if(NB&&t.ground!=='wasser'){const id=NB.waehle(t.biome,t.ground,x+(world.seed%10000),y,t.density,false);if(id){const b=NB.bild(id,NB.variante(x,y)),q=W.iso(x+.5,y+.5);objects.push({b,x:q.x,y:q.y-elevation(x+.5,y+.5)*8});}}
    }else polygon(g,[[x,y],[x+step,y],[x+step,y+step],[x,y+step]].map(([a,b])=>W.iso(a,b)),colors[t.type]);
    yield;
  }}
  objects.sort((a,b)=>a.y-b.y);for(const o of objects){g.drawImage(o.b.img,o.x-o.b.ax,o.y-o.b.ay);yield;}
  delivered=true;return c;
  }finally{if(!delivered){c.width=1;c.height=1;}}
 }
 function visibleJobs(view,lod){const s=CH*lod,list=[];for(let y=Math.floor(view.y0/s);y<=Math.floor(view.y1/s);y++)for(let x=Math.floor(view.x0/s);x<=Math.floor(view.x1/s);x++){
   // Skip chunks wholly inside the existing 960 × 960 game map or outside the large world.
   const pts=[[x*s,y*s],[(x+1)*s,y*s],[x*s,(y+1)*s],[(x+1)*s,(y+1)*s]].map(([a,b])=>W.tileAt(a,b));
   if(pts.every(p=>p.tx>8&&p.ty>8&&p.tx<W.N-8&&p.ty<W.N-8))continue;
   if(pts.every(p=>p.tx<C.MIN)||pts.every(p=>p.ty<C.MIN)||pts.every(p=>p.tx>C.MAX)||pts.every(p=>p.ty>C.MAX))continue;
   list.push({key:`${lod}:${x}:${y}`,x,y,lod,d:(x*s+s/2-W.cam.x)**2+(y*s+s/2-W.cam.y)**2});
  }return list.sort((a,b)=>a.d-b.d);}
 function draw(g,view){
  const start=performance.now(),deadline=start+2,lod=Math.min(512,Math.max(1,2**Math.ceil(Math.log2(.65/W.cam.s))));
  queue=visibleJobs(view,lod);wanted=new Set(queue.map(q=>q.key));if(job&&!wanted.has(job.key)){job.it.return();job=null;}
  // One resumable job and a fixed 2 ms soft budget, including the world overview.
  while(performance.now()<deadline){if(!overviewDone){overviewJob.next();continue;}if(!job){const q=queue.find(q=>!cache.map.has(q.key));if(!q)break;job={...q,it:buildChunk(q.x,q.y,q.lod)};jobCount++;}
   const r=job.it.next();if(r.done){cache.put(job.key,r.value);completed++;job=null;break;}}
  prepMS=performance.now()-start;
  g.save();polygonClip(g,[[C.MIN,C.MIN],[C.MAX,C.MIN],[C.MAX,C.MAX],[C.MIN,C.MAX]]);
  g.imageSmoothingEnabled=false;const bx=Math.max(left,view.x0),by=Math.max(top,view.y0),bw=Math.min(left+width,view.x1)-bx,bh=Math.min(top+height,view.y1)-by;
  if(bw>0&&bh>0)g.drawImage(overview,(bx-left)/width*1024,(by-top)/height*512,bw/width*1024,bh/height*512,bx,by,bw,bh);
  for(const q of queue){const c=cache.get(q.key);if(c)g.drawImage(c,q.x*CH*lod,q.y*CH*lod,CH*lod,CH*lod);}
  g.restore();
  if(performance.now()-lastHUD>400){lastHUD=performance.now();const p=W.tileAt(W.cam.x,W.cam.y);stats.textContent=`${texts.seed}: ${world.seed} · X ${Math.round(p.tx-C.MIN)} / Y ${Math.round(p.ty-C.MIN)} · ${cache.map.size} Bilder / ${(cache.bytes/1048576).toFixed(1)} MiB · ${prepMS.toFixed(1)} ms · ${overviewDone?texts.ready:texts.loading+' '+Math.round(overviewRows/160*100)+'%'}`;
   if(panel.open){mg.clearRect(0,0,320,160);mg.drawImage(overview,0,0,320,160);const a=W.iso(0,0),b=W.iso(W.N,0),c=W.iso(W.N,W.N),d=W.iso(0,W.N);mg.strokeStyle='#ffe1a1';mg.beginPath();[a,b,c,d,a].forEach((p,i)=>{const x=(p.x-left)/width*320,y=(p.y-top)/height*160;i?mg.lineTo(x,y):mg.moveTo(x,y)});mg.stroke();mg.strokeStyle='#fff';mg.strokeRect((view.x0-left)/width*320,(view.y0-top)/height*160,Math.max(3,(view.x1-view.x0)/width*320),Math.max(3,(view.y1-view.y0)/height*160));}}
 }
 function polygonClip(g,tiles){g.beginPath();tiles.forEach(([x,y],i)=>{const p=W.iso(x,y);i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y)});g.closePath();g.clip();}
 function travel(tx,ty,s=.65){const p=W.iso(clamp(tx,C.MIN,C.MAX-1),clamp(ty,C.MIN,C.MAX-1));W.flyTo(p.x,p.y,s);}
 panel.addEventListener('click',e=>{const action=e.target.dataset.go;if(action==='home')W.flyTo(home.x,home.y,home.s);if(action==='fit')W.flyTo(OX,OY+W.N*16,Math.min(W.vw/width,W.vh/height)*.95);if(action==='random'){const r=crypto.getRandomValues(new Uint32Array(2));travel(C.MIN+r[0]/4294967296*C.SIZE,C.MIN+r[1]/4294967296*C.SIZE);}if(action==='zoom'||action==='out')W.flyTo(W.cam.x,W.cam.y,clamp(W.cam.s*(action==='zoom'?2:.5),Math.min(W.vw/width,W.vh/height)*.95,4.5));if(action==='new'){const u=new URL(location.href);u.searchParams.set('seed',crypto.getRandomValues(new Uint32Array(1))[0]);location.href=u.href;}});
 mini.addEventListener('pointerdown',e=>{e.preventDefault();const r=mini.getBoundingClientRect(),x=left+(e.clientX-r.left)/r.width*width,y=top+(e.clientY-r.top)/r.height*height,p=W.tileAt(x,y);travel(p.tx,p.ty);});
 window.AT2Sprache?.beiWechsel(()=>{panel.querySelector('summary').textContent=texts.title;const ps=panel.querySelectorAll('p');ps[0].textContent=texts.note;ps[1].textContent=texts.limit;for(const key of ['home','fit','random','new'])panel.querySelector(`[data-go="${key}"]`).textContent=texts[key];});
 window.WeltGrossTest={draw,travel,world,size:C.SIZE,min:C.MIN,max:C.MAX,get stats(){return {cacheBytes:cache.bytes,cacheLimit:cache.limit,chunks:cache.map.size,completed,jobCount,pending:queue.filter(q=>!cache.map.has(q.key)).length,queued:queue.length,preparationMS:prepMS,overviewDone,seed:world.seed,centralTiles:W.N*W.N};}};
})();
