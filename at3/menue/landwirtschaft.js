// WAS DIE DATEI TUT: Reiter „Landwirtschaft“ des AT3-Master-Editors (Schritt N6b4a, AT3_NEUAUSRICHTUNG.md 4.3a). Zeigt und ändert daten/landwirtschaft.json:
// Prüfer (jede landwirtschaftliche Ware hat einen Erzeuger, Kulturen mit Biom …), Feldarten-Katalog mit Filter nach Gruppe und Biom, Hofarten, Zahlen
// (Ertrag je Biom-Stufe, Stufe je Biom, Ertrag je Feld, Nahrung je Kopf, Nahrungskorb; alles Vorschläge) und einen Rechner für Bedarf, Ernte, Felder
// und Fehlmenge eines Orts. „Als Datei speichern“ fürs Repository (dist/at3/daten/landwirtschaft.json ersetzen). Rechnung in landwirtschaft.js.
// Bedienung deutsch, Inhalte englisch. Nichts wird im Browser dauerhaft gespeichert.
AT3ED.menue('landwirtschaft',function(el){
 el.innerHTML='<p class="leise">Wird geholt … der Verwalter zählt noch die Furchen.</p>';
 var DAT=['landwirtschaft','gebaeude','waren','rezepte'];
 Promise.all([AT3ED.lade('landwirtschaft','landwirtschaft.js')].concat(DAT.map(function(k){return AT3ED.lade('landwirtschaft','daten/'+k+'.json')}))).then(function(r){
  var X=window.AT3LANDW,roh=JSON.stringify(r[1]),LW=JSON.parse(roh),GEB=r[2],WAR=r[3],REZ=r[4],D=null,P=null,tab='pruefer',wahl=null,geaendert=false,
   filter={gruppe:'',biom:''},rech={biom:'mediterranean',einw:2000,fluss:false,leit:''};
  if(!document.getElementById('lwStil')){var st=document.createElement('style');st.id='lwStil';st.textContent=
   '.lwTabs{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px}.lwTabs .knopf{flex:1 1 auto}'+
   '.lwZeile{display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--papier2);padding:8px 4px;font:inherit;font-size:18px;color:var(--tinte);cursor:pointer}'+
   '.lwZeile small{display:block;font-size:15px;color:var(--tinte2)}.lwZeile.an{background:var(--knopf-an)}'+
   '.lwKarte{border:2px solid var(--rand);background:var(--papier2);padding:8px 10px;margin:8px 0}.lwKarte h3{margin:0 0 4px}'+
   '.lwOk{color:var(--gut)}.lwNein{color:var(--blut)}.lwListe li{margin:3px 0}.lwTab{overflow-x:auto}'+
   '.lwTab table{border-collapse:collapse;font-size:16px}.lwTab td,.lwTab th{border-bottom:1px solid var(--papier2);padding:3px 6px;text-align:right}.lwTab td:first-child,.lwTab th:first-child{text-align:left}'+
   '.lwForm{display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin:6px 0}.lwForm label{display:flex;flex-direction:column;font-size:15px}.lwForm input,.lwForm select{font:inherit;font-size:17px;max-width:11em}';
   document.head.appendChild(st)}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function z1(n){return(Math.round(n*10)/10).toString().replace('.',',')}
  function neu(){D=X.daten(LW,GEB,WAR,REZ);P=X.pruefen(D)}
  function wn(id){return D.W[id]?D.W[id].name:id}
  function gruppeName(id){var g=(LW.gruppen||[]).filter(function(x){return x.id===id})[0];return g?g.de:id}
  function biomName(id){var b=(GEB.biome||[]).filter(function(x){return x.id===id})[0];return b?b.de:id}
  function zeichne(){neu();
   var tabs=[['pruefer','Prüfer'],['kulturen','Feldarten'],['hoefe','Hofarten'],['zahlen','Zahlen'],['rechner','Rechner'],['speichern','Speichern']];
   el.innerHTML='<div class="lwTabs">'+tabs.map(function(t){return '<button class="knopf klein'+(tab===t[0]?' an':'')+'" data-tab="'+t[0]+'">'+t[1]+
    (t[0]==='pruefer'&&P.fehler.length?' ('+P.fehler.length+')':'')+(t[0]==='speichern'&&geaendert?' •':'')+'</button>'}).join('')+'</div>'+
    '<div id="lwInhalt">'+({pruefer:vPruefer,kulturen:vKulturen,hoefe:vHoefe,zahlen:vZahlen,rechner:vRechner,speichern:vSpeichern}[tab])()+'</div>';
   binde()}
  function vPruefer(){var z=P.zahlen;
   var h='<p>'+z.kulturen+' Feldarten · '+z.hofarten+' Hofarten · '+z.waren+' Waren mit Kultur'+(LW.vorschlag?' · <b>alle Zahlen sind Vorschläge</b>':'')+'</p>';
   h+='<p><b>Stufe 1:</b> <span class="'+(P.fehler.some(function(f){return f.art==='erzeuger'||f.art==='katalog'})?'lwNein">✗ Ware ohne Erzeuger oder Kultur':'lwOk">✓ jede Pflanze, jedes Tier und jede pflanzliche Vice hat einen Erzeuger')+'</span></p>';
   if(P.fehler.length)h+='<h3>Fehler</h3><ul class="lwListe">'+P.fehler.map(function(f){return '<li><b>'+esc(f.art)+'</b> '+esc(f.ziel)+' – '+esc(f.text)+'</li>'}).join('')+'</ul>';
   else h+='<p class="lwOk">Keine Fehler. Die Ernte ist gerettet, der Steuereintreiber auch.</p>';
   if(P.hinweise.length)h+='<h3>Hinweise</h3><ul class="lwListe">'+P.hinweise.map(function(f){return '<li>'+esc(f.ziel)+' – '+esc(f.text)+'</li>'}).join('')+'</ul>';
   return h}
  function vKulturen(){
   var h='<div class="lwForm"><label>Gruppe<select id="lwFG"><option value="">alle</option>'+(LW.gruppen||[]).map(function(g){return '<option value="'+g.id+'"'+(filter.gruppe===g.id?' selected':'')+'>'+esc(g.de)+'</option>'}).join('')+'</select></label>'+
    '<label>Biom<select id="lwFB"><option value="">alle</option>'+D.biomAlle.map(function(b){return '<option value="'+b+'"'+(filter.biom===b?' selected':'')+'>'+esc(biomName(b))+'</option>'}).join('')+'</select></label></div>';
   var L=D.K.filter(function(x){return(!filter.gruppe||x.k.gruppe===filter.gruppe)&&(!filter.biom||x.biome.indexOf(filter.biom)>=0)});
   h+='<p class="leise">'+L.length+' von '+D.K.length+'</p>';
   L.forEach(function(x){var k=x.k;h+='<button class="lwZeile'+(wahl===k.id?' an':'')+'" data-kultur="'+esc(k.id)+'">'+esc(k.name)+
    '<small>'+esc(gruppeName(k.gruppe))+' · '+(x.waren.length?x.waren.map(wn).join(', '):'<i>Ware folgt</i>')+(k.aussenposten?' · Außenposten':'')+'</small></button>';
    if(wahl===k.id)h+=karte(x)});
   return h}
  function karte(x){var k=x.k,g=x.g;
   return '<div class="lwKarte"><h3>'+esc(k.name)+'</h3>'+(k.text||(g&&g.text)?'<p><i>'+esc(k.text||g.text)+'</i></p>':'')+
    '<p>Gruppe: '+esc(gruppeName(k.gruppe))+'<br>Gebäude: '+(g?esc(g.id)+' ('+g.groesse.w+' × '+g.groesse.h+')':'– (noch keins)')+'<br>Ware: '+(x.waren.length?x.waren.map(wn).join(', '):'folgt'+(k.kommt?' mit '+esc(k.kommt):''))+
    '<br>Biome: '+x.biome.map(biomName).join(', ')+(k.biomeDazu?' <span class="leise">(davon nur Umland: '+k.biomeDazu.map(biomName).join(', ')+')</span>':'')+
    '<br>Arbeitskräfte: '+k.arbeit+' · Boden: '+esc(k.boden)+' · Saat/Ernte: '+esc(k.saison.join(' / '))+(k.partner?'<br>Fruchtwechsel mit: '+k.partner.map(esc).join(', '):'')+(k.selten?'<br>selten':'')+'</p></div>'}
  function vHoefe(){return (LW.hofarten||[]).map(function(h){return '<div class="lwKarte"><h3>'+esc(h.name)+' <span class="leise">('+esc(h.de)+')</span></h3><p><i>'+esc(h.text)+'</i></p><p>'+
   (h.herden?'Herden statt Felder':'Felder: '+h.felder[0]+'–'+h.felder[1])+' · Familien: '+h.familien+(h.knechte?' · Knechte: '+h.knechte[0]+'–'+h.knechte[1]:'')+(h.wandert?' · zieht mit der Jahreszeit':'')+
   '<br>Biome: '+(h.biome.indexOf('alle')>=0?'alle außer Schnee':h.biome.map(biomName).join(', '))+'<br>Kulturen: '+h.gruppen.map(gruppeName).join(', ')+'</p></div>'}).join('')}
  function vZahlen(){
   var h='<p class="leise">Vorschläge (Regel 11). Ertrag nur nach Biom-Stufe; ein Feld liefert Ertrag je Feld × Faktor Einheiten je Spieltag, ein Kopf isst Nahrung je Kopf.</p>';
   h+='<div class="lwForm"><label>Ertrag je Feld<input type="number" step="0.5" min="0" id="lwEF" value="'+LW.ertragJeFeld+'"></label>'+
    '<label>Nahrung je Kopf<input type="number" step="0.1" min="0" id="lwNK" value="'+LW.nahrungJeKopf+'"></label>'+
    '<label>Fluss hebt um Stufen<input type="number" step="1" min="0" max="2" id="lwFH" value="'+LW.flussHebt+'"></label></div>';
   h+='<h3>Faktor je Stufe</h3><div class="lwForm">'+LW.stufen.map(function(s,i){return '<label>'+esc(s.id)+'<input type="number" step="0.05" min="0" data-faktor="'+i+'" value="'+s.faktor+'"></label>'}).join('')+'</div>';
   h+='<h3>Stufe je Biom</h3><div class="lwForm">'+D.biomAlle.map(function(b){return '<label>'+esc(biomName(b))+'<select data-bstufe="'+b+'">'+LW.stufen.map(function(s){return '<option'+(LW.biomStufe[b]===s.id?' selected':'')+'>'+s.id+'</option>'}).join('')+'</select></label>'}).join('')+'</div>';
   h+='<h3>Nahrungskorb</h3><div class="lwForm">'+LW.korb.map(function(k,i){return '<label>'+esc(k.id)+' ('+k.waren.map(wn).join(', ')+')<input type="number" step="0.05" min="0" max="1" data-korb="'+i+'" value="'+k.anteil+'"></label>'}).join('')+'</div>';
   return h}
  function leitListe(){return rech.leit.split(',').map(function(s){var m=s.trim().match(/^([a-z0-9-]+)\s*(?:[×x*]\s*(\d+))?$/);return m&&D.G[m[1]]?{id:m[1],n:+(m[2]||1)}:null}).filter(Boolean)}
  function vRechner(){
   var h='<div class="lwForm"><label>Biom<select id="lwRB">'+D.biomAlle.map(function(b){return '<option value="'+b+'"'+(rech.biom===b?' selected':'')+'>'+esc(biomName(b))+'</option>'}).join('')+'</select></label>'+
    '<label>Einwohner<input type="number" min="0" step="100" id="lwRE" value="'+rech.einw+'"></label><label>am Fluss<input type="checkbox" id="lwRF"'+(rech.fluss?' checked':'')+'></label>'+
    '<label>Leitgebäude (z. B. tannery×4, brewery×2)<input id="lwRL" value="'+esc(rech.leit)+'" style="max-width:18em"></label></div>';
   var t0=performance.now(),o=X.ort(D,{einw:rech.einw,biom:rech.biom,fluss:rech.fluss,leit:leitListe()}),ms=performance.now()-t0;
   h+='<p>Stufe <b>'+o.stufe.id+'</b> (Faktor '+z1(o.stufe.faktor)+', '+z1(o.stufe.ertrag)+' je Feld) · <b>'+o.felder+'</b> Felder · Fehlmenge '+z1(o.fehl)+' · Überschuss '+z1(o.ueber)+' je Spieltag <span class="leise">('+z1(ms*1000)+' µs)</span></p>';
   h+='<div class="lwTab"><table><tr><th>Ware</th><th>Bedarf</th><th>Felder</th><th>Ernte</th><th>Zukauf</th><th>Kulturen</th></tr>'+o.zeilen.map(function(z){
    return '<tr><td>'+esc(z.name)+'</td><td>'+z1(z.bedarf)+'</td><td>'+z.felder+'</td><td>'+z1(z.ernte)+'</td><td class="'+(z.fehl?'lwNein':'')+'">'+(z.fehl?z1(z.fehl):'–')+'</td><td>'+(z.kulturen.join(', ')||'–')+'</td></tr>'}).join('')+'</table></div>';
   var H=X.hofarten(D,rech.biom);h+='<p class="leise">Hofarten hier: '+(H.length?H.map(function(x){return esc(x.de)}).join(', '):'keine')+'. Wo sie stehen, plant N6b4b.</p>';
   return h}
  function vSpeichern(){return '<p>'+(geaendert?'Geändert. ':'Nichts geändert. ')+'Datei herunterladen und im Repository <code>dist/at3/daten/landwirtschaft.json</code> ersetzen.</p><button class="knopf" id="lwSp">Als Datei speichern</button>'}
  function binde(){
   el.querySelectorAll('[data-tab]').forEach(function(b){b.onclick=function(){tab=b.dataset.tab;zeichne()}});
   el.querySelectorAll('[data-kultur]').forEach(function(b){b.onclick=function(){wahl=wahl===b.dataset.kultur?null:b.dataset.kultur;zeichne()}});
   var q=function(id){return document.getElementById(id)};
   if(q('lwFG'))q('lwFG').onchange=function(){filter.gruppe=this.value;zeichne()};
   if(q('lwFB'))q('lwFB').onchange=function(){filter.biom=this.value;zeichne()};
   function zahl(inp,f){inp.onchange=function(){var v=parseFloat(this.value);if(!(v>=0))return;f(v);geaendert=true;zeichne()}}
   if(q('lwEF'))zahl(q('lwEF'),function(v){LW.ertragJeFeld=v});
   if(q('lwNK'))zahl(q('lwNK'),function(v){LW.nahrungJeKopf=v});
   if(q('lwFH'))zahl(q('lwFH'),function(v){LW.flussHebt=Math.round(v)});
   el.querySelectorAll('[data-faktor]').forEach(function(i){zahl(i,function(v){LW.stufen[+i.dataset.faktor].faktor=v})});
   el.querySelectorAll('[data-korb]').forEach(function(i){zahl(i,function(v){LW.korb[+i.dataset.korb].anteil=v})});
   el.querySelectorAll('[data-bstufe]').forEach(function(s){s.onchange=function(){LW.biomStufe[s.dataset.bstufe]=s.value;geaendert=true;zeichne()}});
   if(q('lwRB'))q('lwRB').onchange=function(){rech.biom=this.value;zeichne()};
   if(q('lwRE'))q('lwRE').onchange=function(){rech.einw=Math.max(0,parseInt(this.value,10)||0);zeichne()};
   if(q('lwRF'))q('lwRF').onchange=function(){rech.fluss=this.checked;zeichne()};
   if(q('lwRL'))q('lwRL').onchange=function(){rech.leit=this.value;zeichne()};
   if(q('lwSp'))q('lwSp').onclick=function(){var b=new Blob([X.alsText(LW)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='landwirtschaft.json';
    document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000)};
  }
  zeichne();
 }).catch(function(e){el.innerHTML='<p class="lwNein">Konnte nicht laden: '+String(e&&e.message||e).replace(/</g,'&lt;')+'</p>'});
});
