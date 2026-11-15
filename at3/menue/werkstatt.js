// WAS DIE DATEI TUT: Skizzen-Werkstatt des AT3-Master-Editors (Schritt M3, im Menü Grafik, erst beim Antippen geladen).
// Skizze zeichnen oder ändern (nur Palettenfarben, Raster, Spiegeln, Grundformen, Rückgängig), vorhandenes Bild einmalig auf die Palette umrechnen,
// als Objekt mit Kennung und Version ablegen (Entwürfe im Browser), Prüfer vor dem Speichern, Export als Datei fürs Repository (dist/at3/kartei/).
(function(){
'use strict';
var S=window.AT3_64, PAL=S.PALETTE, RGB=S.PALETTEN[PAL].farben.map(S.farbe), SPEICHER='at3-werkstatt-v1';
var W={obj:null,g:null,w:0,h:0,ax:0,ay:0,farbe:S.nummer(2,4),werkzeug:'stift',zoom:8,raster:true,rueck:[],repo:{},el:null};
function lies(){try{return JSON.parse(localStorage.getItem(SPEICHER))||{objekte:{}}}catch(e){return{objekte:{}}}}
function schreib(d){try{localStorage.setItem(SPEICHER,JSON.stringify(d));return true}catch(e){return false}}
function $(s){return W.el.querySelector(s)}
function meld(t,schlecht){var m=$('#wMeld');m.textContent=t;m.className=schlecht?'witz':'leise'}
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}

// ---------- Raster <-> Speicherformat ----------
function leer(w,h){var g=[];for(var y=0;y<h;y++){g.push(new Int8Array(w).fill(-1))}return g}
function ausBild(b){var g=leer(b.w,b.h);for(var y=0;y<b.h;y++)for(var x=0;x<b.w;x++){var c=b.z[y][x];g[y][x]=c===S.LEER?-1:S.ZEICHEN.indexOf(c)}return g}
function zuBild(){var z=[];for(var y=0;y<W.h;y++){var r='';for(var x=0;x<W.w;x++){var n=W.g[y][x];r+=n<0?S.LEER:S.ZEICHEN[n]}z.push(r)}
 return{kat:$('#wKat').value,w:W.w,h:W.h,ax:W.ax,ay:W.ay,z:z}}
function kopie(){return{g:W.g.map(function(r){return r.slice()}),w:W.w,h:W.h,ax:W.ax,ay:W.ay}}
function merke(){W.rueck.push(kopie());if(W.rueck.length>60)W.rueck.shift()}
function zurueck(){var k=W.rueck.pop();if(!k)return meld('Nichts mehr rückgängig zu machen. Die Vergangenheit ist begraben.');W.g=k.g;W.w=k.w;W.h=k.h;W.ax=k.ax;W.ay=k.ay;masse();malen()}

// ---------- Oberfläche ----------
function aufbauen(el){
 W.el=el;var kats=Object.keys(S.GROESSEN).map(function(k){return'<option value="'+k+'">'+k+' (bis '+S.GROESSEN[k].w+' × '+S.GROESSEN[k].h+')</option>'}).join('');
 var pal='';S.REIHEN.forEach(function(R,r){pal+='<div class="wReihe">';for(var s=0;s<R.n;s++){var n=S.nummer(r,s);pal+='<button class="wF" data-f="'+n+'" style="background:'+S.PALETTEN[PAL].farben[n]+'" title="'+R.name+' '+(s+1)+'"></button>'}pal+='</div>'});
 var wz=[['stift','Stift'],['radier','Radierer'],['fuell','Füllen'],['linie','Linie'],['rechteck','Rechteck'],['ellipse','Ellipse'],['pipette','Pipette'],['anker','Anker']];
 el.innerHTML='<h2>Skizzen-Werkstatt</h2><p class="leise">Palette '+PAL+' („'+S.PALETTEN[PAL].name+'“), 64 Farben. Nichts kommt hinein, was nicht in der Palette steht.</p>'+
  '<div class="wZeile"><button class="knopf klein" id="wNeu">Neu</button><select id="wListe"><option value="">Objekt öffnen …</option></select></div>'+
  '<div class="wForm"><label>Kennung <input id="wId" placeholder="z. B. baum-eiche" autocapitalize="off" spellcheck="false"></label>'+
  '<label>Name (englisch) <input id="wName" placeholder="Old Oak"></label><label>Art <select id="wKat">'+kats+'</select></label>'+
  '<label>Breite <input id="wW" type="number" min="1" inputmode="numeric"></label><label>Höhe <input id="wH" type="number" min="1" inputmode="numeric"></label>'+
  '<span class="leise" id="wInfo"></span></div>'+
  '<div class="wZeile" id="wWz">'+wz.map(function(t){return'<button class="knopf klein" data-wz="'+t[0]+'">'+t[1]+'</button>'}).join('')+'</div>'+
  '<div class="wZeile"><button class="knopf klein" id="wZur">Rückgängig</button><button class="knopf klein" id="wSpiegel">Spiegeln</button>'+
  '<button class="knopf klein" id="wKlein">Zoom −</button><button class="knopf klein" id="wGross">Zoom +</button><button class="knopf klein" id="wRaster">Raster</button></div>'+
  '<div class="wPal">'+pal+'</div>'+
  '<div class="wFlaeche"><canvas id="wCv" class="pixel"></canvas></div>'+
  '<div class="wZeile"><label class="knopf klein">Bild umrechnen<input id="wDatei" type="file" accept="image/*" hidden></label>'+
  '<button class="knopf klein haupt" id="wSpeich">Prüfen &amp; speichern</button></div>'+
  '<div class="wZeile"><button class="knopf klein" id="wExObj">Objekt-Datei</button><button class="knopf klein" id="wExKar">Kartei-Datei</button><button class="knopf klein" id="wKopier">Objekt kopieren</button></div>'+
  '<p id="wMeld" class="leise"></p>';
 [].forEach.call(el.querySelectorAll('.wF'),function(b){b.onclick=function(){W.farbe=+b.dataset.f;if(W.werkzeug==='radier'||W.werkzeug==='pipette'||W.werkzeug==='anker')waehle('stift');knopfZustand()}});
 [].forEach.call(el.querySelectorAll('[data-wz]'),function(b){b.onclick=function(){waehle(b.dataset.wz)}});
 $('#wNeu').onclick=neu;$('#wZur').onclick=zurueck;$('#wSpiegel').onclick=spiegeln;
 $('#wKlein').onclick=function(){W.zoom=Math.max(1,W.zoom-1);malen()};$('#wGross').onclick=function(){W.zoom=Math.min(24,W.zoom+1);malen()};
 $('#wRaster').onclick=function(){W.raster=!W.raster;malen();knopfZustand()};
 $('#wW').onchange=$('#wH').onchange=function(){groesse(+$('#wW').value,+$('#wH').value)};
 $('#wKat').onchange=function(){var g=S.GROESSEN[$('#wKat').value];if(W.w>g.w||W.h>g.h)groesse(Math.min(W.w,g.w),Math.min(W.h,g.h));masse()};
 $('#wListe').onchange=function(){var v=this.value;if(v)oeffnen(v);this.value=''};
 $('#wDatei').onchange=function(){if(this.files[0])umrechnen(this.files[0]);this.value=''};
 $('#wSpeich').onclick=speichern;$('#wExObj').onclick=function(){exportiere('objekt')};$('#wExKar').onclick=function(){exportiere('kartei')};
 $('#wKopier').onclick=kopieren;
 zeiger($('#wCv'));
 var k=AT3ED.kartei();(k&&k.objekte||[]).forEach(function(o){W.repo[o.id]=o});
 liste();neu();
}
function knopfZustand(){
 [].forEach.call(W.el.querySelectorAll('[data-wz]'),function(b){b.classList.toggle('an',b.dataset.wz===W.werkzeug)});
 [].forEach.call(W.el.querySelectorAll('.wF'),function(b){b.classList.toggle('an',+b.dataset.f===W.farbe)});
 $('#wRaster').classList.toggle('an',W.raster);
}
function waehle(t){W.werkzeug=t;knopfZustand()}
function liste(){var sel=$('#wListe'),d=lies(),ids={};Object.keys(W.repo).forEach(function(i){ids[i]='Repo'});Object.keys(d.objekte).forEach(function(i){ids[i]=ids[i]?'Repo + Entwurf':'Entwurf'});
 sel.innerHTML='<option value="">Objekt öffnen … ('+Object.keys(ids).length+')</option>'+Object.keys(ids).sort().map(function(i){return'<option value="'+esc(i)+'">'+esc(i)+' · '+ids[i]+'</option>'}).join('')}
function masse(){$('#wW').value=W.w;$('#wH').value=W.h;var g=S.GROESSEN[$('#wKat').value];$('#wInfo').textContent='Anker '+W.ax+', '+W.ay+' · erlaubt bis '+g.w+' × '+g.h+' · '+S.bytes({w:W.w,h:W.h})+' Byte'}
function neu(){var k='baum',g=S.GROESSEN[k];W.obj=null;$('#wKat').value=k;$('#wId').value='';$('#wName').value='';W.w=48;W.h=80;W.g=leer(W.w,W.h);W.ax=24;W.ay=79;W.rueck=[];W.herkunft='skizze';
 masse();waehle('stift');passend();malen();meld('Leeres Blatt. Wie ein frisch gekaufter Rekrut: alles noch möglich.')}
function laden(o){W.obj=o;$('#wId').value=o.id;$('#wName').value=o.name||'';$('#wKat').value=o.kat;W.g=ausBild(o.bild);W.w=o.bild.w;W.h=o.bild.h;W.ax=o.bild.ax;W.ay=o.bild.ay;W.rueck=[];W.herkunft=o.herkunft||'skizze';masse();passend();malen()}
function oeffnen(id){var d=lies();if(d.objekte[id]){laden(d.objekte[id]);return meld('Entwurf „'+id+'“ geöffnet, Version '+d.objekte[id].version+'.')}
 var r=W.repo[id];if(!r)return;AT3ED.lade('grafik','kartei/'+r.datei).then(function(o){laden(o);meld('„'+id+'“ aus dem Repository geöffnet, Version '+o.version+'.')},function(e){meld('Konnte „'+id+'“ nicht laden: '+e.message,1)})}
function groesse(w,h){var g=S.GROESSEN[$('#wKat').value];w=Math.max(1,Math.min(g.w,w|0));h=Math.max(1,Math.min(g.h,h|0));if(w===W.w&&h===W.h)return masse();
 merke();var n=leer(w,h),dy=h-W.h,dx=Math.floor((w-W.w)/2);   // Fußpunkt bleibt unten in der Mitte
 for(var y=0;y<W.h;y++)for(var x=0;x<W.w;x++){var yy=y+dy,xx=x+dx;if(yy>=0&&yy<h&&xx>=0&&xx<w)n[yy][xx]=W.g[y][x]}
 W.g=n;W.w=w;W.h=h;W.ax=Math.max(0,Math.min(w,W.ax+dx));W.ay=Math.max(0,Math.min(h,W.ay+dy));masse();malen()}
function spiegeln(){merke();W.g.forEach(function(r){r.reverse()});W.ax=W.w-1-W.ax;if(W.ax<0)W.ax=0;masse();malen()}

// ---------- Zeichnen auf dem Bildschirm ----------
// Zoom so wählen, dass das ganze Bild in die Breite passt (ganzzahlig, 2 bis 24 Bildschirmpunkte je Bildpunkt).
function passend(){var b=($('.wFlaeche').clientWidth||320)-6,h=Math.max(200,(window.innerHeight||700)*.68);W.zoom=Math.max(2,Math.min(24,Math.floor(Math.min(b/W.w,h/W.h))))}
function malen(){var cv=$('#wCv'),z=W.zoom;cv.width=W.w*z;cv.height=W.h*z;cv.style.width=W.w*z+'px';cv.style.height=W.h*z+'px';
 var x=cv.getContext('2d');for(var yy=0;yy<W.h;yy++)for(var xx=0;xx<W.w;xx++){var n=W.g[yy][xx];
  if(n<0)x.fillStyle=((xx+yy)&1)?'#c9b88c':'#ddd0a8';else{var c=RGB[n];x.fillStyle='rgb('+c[0]+','+c[1]+','+c[2]+')'}x.fillRect(xx*z,yy*z,z,z)}
 if(W.raster&&z>=5){x.fillStyle='rgba(42,22,8,.18)';for(var i=0;i<=W.w;i++)x.fillRect(i*z,0,1,W.h*z);for(var j=0;j<=W.h;j++)x.fillRect(0,j*z,W.w*z,1)}
 x.strokeStyle='#b0140e';x.lineWidth=2;var ax=W.ax*z+z/2,ay=W.ay*z+z/2;x.beginPath();x.moveTo(ax-z*1.5,ay);x.lineTo(ax+z*1.5,ay);x.moveTo(ax,ay-z*1.5);x.lineTo(ax,ay+z*1.5);x.stroke()}
function punkt(cv,e){var r=cv.getBoundingClientRect();return{x:Math.floor((e.clientX-r.left)/r.width*W.w),y:Math.floor((e.clientY-r.top)/r.height*W.h)}}
function setz(x,y,n){if(x>=0&&y>=0&&x<W.w&&y<W.h)W.g[y][x]=n}
function linie(a,b,n){var dx=Math.abs(b.x-a.x),dy=-Math.abs(b.y-a.y),sx=a.x<b.x?1:-1,sy=a.y<b.y?1:-1,e=dx+dy,x=a.x,y=a.y;
 for(;;){setz(x,y,n);if(x===b.x&&y===b.y)break;var e2=2*e;if(e2>=dy){e+=dy;x+=sx}if(e2<=dx){e+=dx;y+=sy}}}
function rechteck(a,b,n){var x0=Math.min(a.x,b.x),x1=Math.max(a.x,b.x),y0=Math.min(a.y,b.y),y1=Math.max(a.y,b.y);for(var y=y0;y<=y1;y++)for(var x=x0;x<=x1;x++)setz(x,y,n)}
function ellipse(a,b,n){var x0=Math.min(a.x,b.x),x1=Math.max(a.x,b.x),y0=Math.min(a.y,b.y),y1=Math.max(a.y,b.y),cx=(x0+x1+1)/2,cy=(y0+y1+1)/2,rx=(x1-x0+1)/2,ry=(y1-y0+1)/2;
 for(var y=y0;y<=y1;y++)for(var x=x0;x<=x1;x++){var dx=(x+.5-cx)/rx,dy=(y+.5-cy)/ry;if(dx*dx+dy*dy<=1)setz(x,y,n)}}
function fuellen(p,n){if(p.x<0||p.y<0||p.x>=W.w||p.y>=W.h)return;var alt=W.g[p.y][p.x];if(alt===n)return;var st=[p.x,p.y];
 while(st.length){var y=st.pop(),x=st.pop();if(x<0||y<0||x>=W.w||y>=W.h||W.g[y][x]!==alt)continue;W.g[y][x]=n;st.push(x+1,y,x-1,y,x,y+1,x,y-1)}}
function zeiger(cv){var start=null,vorher=null;
 cv.addEventListener('pointerdown',function(e){e.preventDefault();cv.setPointerCapture&&cv.setPointerCapture(e.pointerId);var p=punkt(cv,e),t=W.werkzeug,n=t==='radier'?-1:W.farbe;
  if(t==='pipette'){if(p.y>=0&&p.y<W.h&&p.x>=0&&p.x<W.w&&W.g[p.y][p.x]>=0){W.farbe=W.g[p.y][p.x];waehle('stift')}return}
  merke();if(t==='anker'){W.ax=Math.max(0,Math.min(W.w-1,p.x));W.ay=Math.max(0,Math.min(W.h-1,p.y));masse();malen();return}
  if(t==='fuell'){fuellen(p,W.farbe);malen();return}
  start=p;vorher=W.g.map(function(r){return r.slice()});if(t==='stift'||t==='radier'){setz(p.x,p.y,n);W.letzt=p}else form(p);malen()});
 cv.addEventListener('pointermove',function(e){if(!start)return;var p=punkt(cv,e),t=W.werkzeug;
  if(t==='stift'||t==='radier'){linie(W.letzt,p,t==='radier'?-1:W.farbe);W.letzt=p}else{W.g=vorher.map(function(r){return r.slice()});form(p)}malen()});
 var ende=function(){start=null;vorher=null};cv.addEventListener('pointerup',ende);cv.addEventListener('pointercancel',ende);
 function form(p){var t=W.werkzeug;if(t==='linie')linie(start,p,W.farbe);else if(t==='rechteck')rechteck(start,p,W.farbe);else if(t==='ellipse')ellipse(start,p,W.farbe)}}

// ---------- Vorhandenes Bild einmalig auf die Palette umrechnen ----------
function umrechnen(datei){var url=URL.createObjectURL(datei),im=new Image();
 im.onload=function(){URL.revokeObjectURL(url);var g=S.GROESSEN[$('#wKat').value],k=Math.min(1,g.w/im.width,g.h/im.height),w=Math.max(1,Math.round(im.width*k)),h=Math.max(1,Math.round(im.height*k));
  var c=document.createElement('canvas');c.width=w;c.height=h;var x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(im,0,0,w,h);var d=x.getImageData(0,0,w,h).data;
  merke();W.g=leer(w,h);W.w=w;W.h=h;var gleich=0,cache={};
  for(var y=0;y<h;y++)for(var xx=0;xx<w;xx++){var o=(y*w+xx)*4;if(d[o+3]<128)continue;var key=(d[o]<<16)|(d[o+1]<<8)|d[o+2];
   var n=cache[key];if(n==null){n=cache[key]=S.naechste(d[o],d[o+1],d[o+2],PAL);var q=RGB[n];if(q[0]===d[o]&&q[1]===d[o+1]&&q[2]===d[o+2])gleich++}W.g[y][xx]=n}
  W.ax=Math.floor(w/2);W.ay=$('#wKat').value==='boden'?Math.floor(h/2):h-1;W.herkunft='umgerechnet';masse();passend();malen();
  meld('Umgerechnet: '+im.width+' × '+im.height+(k<1?' verkleinert auf '+w+' × '+h:'')+', '+Object.keys(cache).length+' verschiedene Farben auf die Palette gelegt. Halb Durchsichtiges ist jetzt ganz oder gar nicht da.')};
 im.onerror=function(){URL.revokeObjectURL(url);meld('Das ist kein Bild. Oder ein sehr schlechtes.',1)};im.src=url}

// ---------- Speichern, Kartei, Export ----------
function objekt(){var id=$('#wId').value.trim().toLowerCase(),d=lies(),alt=d.objekte[id]||(W.obj&&W.obj.id===id?W.obj:null),b=zuBild();
 var o={format:'at3-objekt',id:id,version:1,kat:b.kat,name:$('#wName').value.trim(),status:'skizze',herkunft:W.herkunft||'skizze',bild:b};
 if(alt){o.version=alt.version;var gleich=JSON.stringify(alt.bild)===JSON.stringify(b)&&alt.name===o.name&&alt.kat===o.kat;
  if(!gleich){var r=W.repo[id];o.version=r&&alt.version<=r.version?r.version+1:alt.version}
  if(alt.herkunft&&W.herkunft!=='umgerechnet')o.herkunft=alt.herkunft}
 else if(W.repo[id])o.version=W.repo[id].version+1;
 return o}
function speichern(){var o=objekt(),f=S.pruefeObjekt(o);if(f.length)return meld('Abgelehnt: '+f.join('; ')+'.',1);
 var d=lies();d.objekte[o.id]=o;if(!schreib(d))return meld('Browser lässt nicht speichern (privates Fenster?). Gleich exportieren.',1);
 W.obj=o;liste();meld('Gespeichert: „'+o.id+'“ Version '+o.version+' als Entwurf in diesem Browser. Für das Spiel: Objekt-Datei und Kartei-Datei exportieren.');return o}
function kartei(){var k=AT3ED.kartei()||{format:'at3-kartei',version:1,objekte:[]},m={},d=lies();
 (k.objekte||[]).forEach(function(o){m[o.id]=o});Object.keys(d.objekte).forEach(function(id){var o=d.objekte[id];m[id]={id:id,version:o.version,kat:o.kat,name:o.name,status:o.status,datei:'obj/'+id+'.json'}});
 return{format:'at3-kartei',version:1,palette:PAL,objekte:Object.keys(m).sort().map(function(id){return m[id]})}}
function datei(name,text){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();
 setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000)}
function exportiere(was){var o=speichern();if(!o)return;
 if(was==='objekt'){datei(o.id+'.json',JSON.stringify(o)+'\n');meld('Objekt-Datei „'+o.id+'.json“ erzeugt. Gehört nach dist/at3/kartei/obj/.')}
 else{datei('objekte.json',JSON.stringify(kartei(),null,1)+'\n');meld('Kartei-Datei „objekte.json“ erzeugt. Ersetzt dist/at3/kartei/objekte.json.')}}
function kopieren(){var o=speichern();if(!o)return;var t=JSON.stringify(o);
 (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){meld('Objekt „'+o.id+'“ kopiert. In den Chat einfügen, dann legt Claude es ins Repository.')},function(){meld('Kopieren nicht erlaubt. Bitte „Objekt-Datei“ nehmen.',1)})}

window.AT3_WERKSTATT={aufbauen:aufbauen,zustand:function(){return W},bild:zuBild,kartei:kartei,objekt:objekt};
})();
