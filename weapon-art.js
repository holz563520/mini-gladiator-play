/* ARENA THEORY weapon renderer. Cached pixel art; no gameplay RNG or save writes. */
(()=>{'use strict';const M=window.MG,cache=new Map(),MAX_CACHE=384,MAX_BYTES=4*1024*1024,supported=new Set(M.weaponDefs.map(w=>w.id));let hits=0,misses=0,cachePixels=0;const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const lengths={dagger:16,short:26,gladius:30,long:38,greatsword:43};
// Quality changes materials and ornament, never the blade's thickness.
const bladeWidths={dagger:1,short:2,gladius:2,long:2,greatsword:2};
const pole=['spear','trident','halberd','javelin'],axes=['axe','doubleaxe','throwaxe'],blunts=['club','mace','hammer'];
const seed=s=>[...s].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,17);
const noise=(x,y,k)=>{let v=Math.imul(x+139,k+73)^Math.imul(y+631,2246822519);v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967295};
function sprite(item,blood,age){const q=clamp(item.q||0,0,6),id=item.def,b=Math.round(clamp(blood,0,1)*12),dry=age>.65,stage=item.story?.stage||0,key=[id,q,b,dry,stage].join(':');if(cache.has(key)){const v=cache.get(key);cache.delete(key);cache.set(key,v);hits++;return v;}misses++;
 const c=document.createElement('canvas');c.width=112;c.height=88;const g=c.getContext('2d');g.imageSmoothingEnabled=false;let minX=112,minY=88,maxX=-1,maxY=-1;const ox=29,oy=43,look=M.itemLook(item),mask=new Set(),metal=look.metal,edge=look.edge,dark='#34434a',mid='#617078',gold=q>=4?look.trim:'#a28b62',wood=q===0?'#776044':'#694a36';
 const pix=(x,y,color,hit=false)=>{x=Math.round(x);y=Math.round(y);g.fillStyle=color;g.fillRect(x+ox,y+oy,1,1);minX=Math.min(minX,x+ox);minY=Math.min(minY,y+oy);maxX=Math.max(maxX,x+ox);maxY=Math.max(maxY,y+oy);if(hit)mask.add(x+','+y)};
 const rect=(x,y,w,h,color,hit=false)=>{for(let yy=Math.ceil(y);yy<y+h;yy++)for(let xx=Math.ceil(x);xx<x+w;xx++)pix(xx,yy,color,hit)};
 const poly=(pts,color,hit=false)=>{const ys=pts.map(p=>p[1]),xs=pts.map(p=>p[0]);for(let y=Math.floor(Math.min(...ys));y<=Math.max(...ys);y++)for(let x=Math.floor(Math.min(...xs));x<=Math.max(...xs);x++){let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],z=pts[j];if((a[1]>y+.5)!==(z[1]>y+.5)&&x+.5<(z[0]-a[0])*(y+.5-a[1])/(z[1]-a[1])+a[0])inside=!inside}if(inside)pix(x,y,color,hit)}};
 const line=(x0,y0,x1,y1,color,hit=false)=>{const n=Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0)));for(let i=0;i<=n;i++)pix(x0+(x1-x0)*i/(n||1),y0+(y1-y0)*i/(n||1),color,hit)};
 function grip(x0,x1){rect(x0,-2,x1-x0,5,'#302c29');rect(x0,-1,x1-x0,3,wood);for(let x=x0;x<x1;x+=3){line(x,-1,x+2,1,q===0?'#b29363':'#ad8052')}rect(x0-2,-2,3,5,gold);pix(x0-1,-1,edge)}
 function shaft(n){rect(-12,-2,n+14,4,'#302c29');rect(-12,-1,n+14,2,wood);line(-10,-1,n,-1,'#b08a55');for(let x=-9;x<n-10;x+=9)pix(x,0,'#493628');grip(-9,8)}
 if(lengths[id]){const n=lengths[id],t=bladeWidths[id],end=12+n;
 grip(id==='greatsword'?-14:-7,7);rect(6,-(id==='greatsword'?9:5),3,id==='greatsword'?19:11,dark);rect(7,-(id==='greatsword'?9:5),1,id==='greatsword'?19:11,gold);
 poly([[9,-t],[end-6,-t],[end,0],[end-6,t+1],[9,t+1]],dark,true);poly([[10,-t+1],[end-6,-t+1],[end-1,0],[end-6,t],[10,t]],metal,true);
 line(10,-t+1,end-7,-t+1,edge,true);line(12,0,end-4,0,mid,true);line(end-7,-t+1,end-1,0,edge,true);line(10,t,end-7,t,'#4e5b60',true);
 if(id==='gladius'){poly([[14,-t+1],[20,-t],[26,-t+1],[26,0],[14,0]],metal,true);line(19,-t,21,-t,edge,true)}
 if(q>=3)for(let x=15;x<end-8;x+=6){pix(x,-1,gold,true);pix(x+1,0,gold,true)}
 if(q>=5){rect(5,-2,4,5,gold);rect(6,-1,2,2,look.gem||'#c66e4c');pix(6,-1,'#ffe0a0')}
 }else if(pole.includes(id)){const n=id==='javelin'?30:id==='halberd'?47:40;shaft(n-4);rect(n-9,-3,5,6,dark);rect(n-8,-2,3,4,gold);
 poly([[n-5,-3],[n+2,-3],[n+11,0],[n+2,3],[n-5,3]],dark,true);poly([[n-4,-2],[n+2,-2],[n+10,0],[n+2,2],[n-4,2]],metal,true);line(n-3,-2,n+3,-1,edge,true);line(n-3,0,n+8,0,mid,true);
 if(id==='trident'){poly([[n-1,-9],[n+2,-9],[n+2,9],[n-1,9]],dark,true);rect(n,-8,2,16,metal,true);for(const y of [-9,7]){poly([[n,y],[n+9,y],[n+12,y+1],[n+9,y+3],[n,y+3]],dark,true);line(n+1,y+1,n+10,y+1,edge,true)}}
 if(id==='halberd'){poly([[n-9,-3],[n-12,-10],[n-18,-13],[n-18,-7],[n-15,0],[n-18,7],[n-18,12],[n-12,10],[n-9,4]],dark,true);poly([[n-10,-3],[n-13,-9],[n-17,-11],[n-16,-5],[n-13,0],[n-16,6],[n-17,10],[n-13,9],[n-10,3]],metal,true);line(n-17,-10,n-14,-1,edge,true);line(n-14,1,n-17,9,edge,true);poly([[n-9,-2],[n-2,-9],[n,-9],[n-5,-1]],metal,true)}
 }else if(axes.includes(id)){const n=id==='throwaxe'?17:26;shaft(n-1);const h=9+Math.floor(q/2);poly([[n-6,-4],[n-1,-h-2],[n+4,-h],[n+6,-h+4],[n+6,h-3],[n+4,h+1],[n-1,h+2],[n-6,4]],dark,true);poly([[n-5,-3],[n,-h],[n+3,-h+1],[n+4,-h+4],[n+4,h-3],[n+3,h],[n,h+1],[n-5,3]],metal,true);line(n+4,-h+4,n+4,h-3,edge,true);line(n+3,-h+1,n+4,-h+4,edge,true);line(n+4,h-3,n+3,h,edge,true);rect(n-5,-3,4,6,gold);pix(n-4,-1,edge);
 if(id==='doubleaxe'){poly([[n-6,-3],[n-11,-h],[n-16,-h-1],[n-18,-h+3],[n-18,h-3],[n-16,h+1],[n-11,h],[n-6,3]],dark,true);poly([[n-7,-2],[n-11,-h+2],[n-15,-h+1],[n-16,-h+3],[n-16,h-3],[n-15,h-1],[n-11,h-2],[n-7,2]],metal,true);line(n-16,-h+3,n-16,h-3,edge,true)}
 }else if(blunts.includes(id)){shaft(22);if(id==='club'){poly([[9,-3],[12,-6],[23,-8],[28,-4],[29,3],[24,7],[12,5]],'#352c26',true);poly([[10,-2],[13,-5],[23,-6],[26,-3],[27,2],[23,5],[12,4]],'#93653e',true);line(13,-4,23,-5,'#c09a63',true);for(const x of [13,21]){rect(x,-5,3,11,dark,true);rect(x,-4,1,9,metal,true);pix(x+1,-3,edge,true)}}else if(id==='mace'){poly([[15,-4],[17,-8],[26,-8],[31,-4],[31,4],[26,8],[17,8],[15,4]],dark,true);rect(18,-6,10,12,metal,true);for(const y of [-8,-1,6]){poly([[15,y],[29,y],[33,y+2],[29,y+3],[15,y+3]],mid,true);line(16,y,29,y,edge,true)}rect(29,-2,5,4,metal,true)}else{rect(17,-11,18,22,dark,true);rect(19,-10,14,20,metal,true);rect(19,-10,3,20,edge,true);rect(30,-10,3,20,mid,true);rect(23,-7,6,14,'#657079',true);rect(23,-1,7,3,gold,true);pix(25,0,edge,true);poly([[17,-4],[11,-2],[11,2],[17,4]],metal,true)}
 }else if(id==='bow'){for(const sign of [-1,1]){poly([[5,0],[8,sign*8],[7,sign*17],[2,sign*24],[-3,sign*25],[-5,sign*22],[0,sign*21],[3,sign*15],[4,sign*6]],dark);line(5,sign*3,5,sign*15,wood);line(5,sign*15,0,sign*23,'#c8a06a');line(0,sign*23,-4,sign*22,gold)}rect(3,-4,6,8,'#483326');for(let y=-3;y<=3;y+=2)line(3,y,8,y,'#b18a55');
 }else if(id==='crossbow'){poly([[-14,-4],[17,-4],[23,-2],[23,3],[-6,3],[-9,6],[-14,5]],dark);rect(-12,-3,32,5,wood);line(-11,-2,19,-2,'#b78d5b');rect(1,-3,18,2,metal);for(const sign of [-1,1]){poly([[17,0],[18,sign*12],[12,sign*23],[9,sign*22],[14,sign*11],[14,0]],dark);line(16,sign*2,16,sign*11,metal);line(16,sign*11,11,sign*22,edge)}rect(-4,-4,3,8,gold);rect(3,3,2,4,mid);
 }else if(id==='net'){const n=13+Math.floor(q/2);poly([[-n,-n],[n-1,-n+1],[n,n],[-n+1,n-1]],'#554c39');for(let y=-n;y<n;y+=5)for(let x=-n;x<n;x+=5){g.clearRect(x+1+ox,y+1+oy,4,4);pix(x,y,'#d1ba85');pix(x+1,y,'#887448')}for(const [x,y]of [[-n,-n],[n,-n],[n,n],[-n,n]]){rect(x-2,y-2,5,5,dark);rect(x-1,y-1,3,3,metal);pix(x-1,y-1,edge)}
 }
 // Material wear and ornamental progression, confined to existing contact surfaces.
 const k=seed(id);for(const p of mask){const [x,y]=p.split(',').map(Number),v=noise(x,y,k);if(q===0&&v<.10)pix(x,y,'#775039');else if(q<=2&&v<.035)pix(x,y,dark)}
 if(stage>0){rect(0,-3,3,7,'#d6b767');pix(1,-2,stage===2?'#9edbcc':'#bc6f55')}
 const wetPoints=[];if(b>0&&mask.size){const points=[...mask].map(p=>p.split(',').map(Number)),xs=points.map(p=>p[0]),min=Math.min(...xs),max=Math.max(...xs),level=b/12;
 for(const [x,y]of points){const u=(x-min)/Math.max(1,max-min),n=noise(Math.floor(x/3),Math.floor(y/2),k),fine=noise(x,y,k+37),edgeBias=(Math.sin(x*.37+k)*.5+.5)*.16;
 // Swords keep a readable metal edge and a patchy stain near the tip.
 const covered=lengths[id]?(u>.98-level*.38+edgeBias||n<level*.10&&u>.50):(u>.90-level*.70+edgeBias||n<level*.32&&u>.14);
 if(!covered||fine<.10-level*.05)continue;
 wetPoints.push([x,y]);const colors=dry?['#3f2021','#592326','#742b2d']:['#4b1d23','#851f2b','#b12b35'];const ix=fine>.78?2:fine>.25?1:0;pix(x,y,colors[ix]);if(!dry&&fine>.94&&level>.3)pix(x,y,'#e16b62');
 }
 }
 const points=[...mask].map(p=>p.split(',').map(Number)),maxContactX=points.length?Math.max(...points.map(p=>p[0])):0;
 const image=document.createElement('canvas');image.width=Math.max(1,maxX-minX+1);image.height=Math.max(1,maxY-minY+1);
 image.getContext('2d').drawImage(c,minX,minY,image.width,image.height,0,0,image.width,image.height);
 const result={canvas:image,ox:ox-minX,oy:oy-minY,dripPoints:wetPoints.filter(p=>p[0]>maxContactX-12),def:id};
 cache.set(key,result);cachePixels+=image.width*image.height;
 while(cache.size>MAX_CACHE||cachePixels*4>MAX_BYTES){const first=cache.keys().next().value,old=cache.get(first);cachePixels-=old.canvas.width*old.canvas.height;cache.delete(first);}return result;
}
function draw(ctx,item,opt={}){const blood=clamp(opt.blood??item.blood??0,0,1),angle=opt.angle||0,scale=opt.scale??1,x=opt.x||0,y=opt.y||0,t=opt.time||0,s=sprite(item,blood,opt.age||0);
ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);ctx.imageSmoothingEnabled=false;ctx.drawImage(s.canvas,-s.ox,-s.oy);
if(item.def==='bow'||item.def==='crossbow'){const bow=item.def==='bow',pose=opt.pose||{},nock=bow?-4-18*(pose.tension||0):12-17*(pose.tension??1),ax=bow?-4:11;ctx.strokeStyle='#dccdab';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(ax,-22);ctx.lineTo(nock,0);ctx.lineTo(ax,22);ctx.stroke();if(pose.loaded){ctx.fillStyle='#ac9069';ctx.fillRect(nock,-1,34,2);ctx.fillStyle='#d7e1cc';ctx.fillRect(nock+31,-2,5,4)}}ctx.restore();
if(opt.drips===false||blood<.34||(opt.age||0)>.65||!s.dripPoints.length||['javelin','throwaxe'].includes(item.def))return;
// Pick the actual lowest blood-bearing point after rotation, so gravity stays vertical.
const eligible=s.dripPoints,cs=Math.cos(angle),sn=Math.sin(angle);let tip=eligible[0];if(!tip)return;for(const p of eligible)if(p[0]*sn+p[1]*cs>tip[0]*sn+tip[1]*cs)tip=p;if(!tip)return;
const tx=x+(tip[0]*cs-tip[1]*sn)*scale,ty=y+(tip[0]*sn+tip[1]*cs)*scale,period=3.8-blood*1.7,phase=(t+seed(item.def)%23*.13)%period;
if(phase<.65){const sz=(.45+phase)*scale;ctx.fillStyle='#8c2430';ctx.fillRect(Math.round(tx),Math.round(ty),Math.max(1,scale*.7),Math.max(1,sz));}
for(let i=0;i<2;i++){const age=phase-.65-i*.13;if(age<0||age>.7)continue;const dy=(6*age+72*age*age)*scale;ctx.fillStyle=i?'#691e28':'#ae3039';ctx.fillRect(Math.round(tx+i*.7*scale),Math.round(ty+dy),Math.max(1,scale*.7),Math.max(1,scale*(1+age*2.2)));}
}
function dripPoint(item,blood,angle){const points=sprite(item,blood,0).dripPoints;if(!points.length)return null;const cs=Math.cos(angle),sn=Math.sin(angle);let tip=points[0];for(const p of points)if(p[0]*sn+p[1]*cs>tip[0]*sn+tip[1]*cs)tip=p;return tip;}
M.weaponArt={clear(){cache.clear();cachePixels=0;},draw,sprite,dripPoint,supports:id=>supported.has(id),cacheStats:()=>({entries:cache.size,max:MAX_CACHE,pixels:cachePixels,bytes:cachePixels*4,hits,misses})};})();

