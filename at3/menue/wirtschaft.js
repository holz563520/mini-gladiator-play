// WAS DIE DATEI TUT: Reiter „Wirtschaft“ des AT3-Master-Editors (Schritt W2a1). Zeigt und ändert die Wirtschaftsdaten aus daten/ (Gebäude, Waren, Rezepte,
// Stufen, Maßtabelle, Systeme, Kulturen, Vices, Eigenständigkeit): Listen mit Filter, Gebäude- und Warenkarte mit „Made by / Used for“, Ketten-Ansicht bis in
// die Arena, Maßtabelle, Prüfer (Arena-Ende, Maße, Eigenständigkeit, unbekannte Waren und Tätigkeiten) und „Als Datei speichern“ fürs Repository
// (dist/at3/daten/<datei> ersetzen). Rechnung in wirtschaft.js. Bedienung deutsch, Inhalte englisch (Spieltexte). Nichts wird im Browser dauerhaft gespeichert.
AT3ED.menue('wirtschaft',function(el){
 el.innerHTML='<p class="leise">Wird geholt … der Kämmerer zählt noch die Säcke.</p>';
 var DATEIEN={gebaeude:'gebaeude.json',waren:'waren.json',rezepte:'rezepte.json',stufen:'stufen.json',masse:'masse.json',eigen:'eigenstaendigkeit.json',
  taetigkeiten:'taetigkeiten.json',systeme:'systeme.json',kulturen:'kulturen.json',vices:'vices.json'};
 var keys=Object.keys(DATEIEN);
 Promise.all([AT3ED.lade('wirtschaft','wirtschaft.js')].concat(keys.map(function(k){return AT3ED.lade('wirtschaft','daten/'+DATEIEN[k])}))).then(function(r){
  var X=window.AT3WIRT,D0={},D={},geaendert={},tab='pruefer',wahl=null,filter={gruppe:'',bereich:'',suche:'',wgruppe:'',wsuche:''},kette='sausages',P=null;
  keys.forEach(function(k,i){D0[k]=JSON.stringify(r[i+1]);D[k]=JSON.parse(D0[k])});
  if(!document.getElementById('wiStil')){var st=document.createElement('style');st.id='wiStil';st.textContent=
   '.wiTabs{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px}.wiTabs .knopf{flex:1 1 auto}'+
   '.wiZeile{display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--papier2);padding:8px 4px;font:inherit;font-size:18px;color:var(--tinte);cursor:pointer}'+
   '.wiZeile small{display:block;font-size:15px;color:var(--tinte2)}.wiZeile.an{background:var(--knopf-an)}'+
   '.wiKarte{border:2px solid var(--rand);background:var(--papier2);padding:8px 10px;margin:8px 0}.wiKarte h3{margin:0 0 4px}'+
   '.wiKarte textarea{width:100%;box-sizing:border-box;font:inherit;font-size:17px;min-height:4em;background:var(--knopf-an);border:2px solid var(--rand)}'+
   '.wiLink{background:none;border:0;padding:0;font:inherit;color:var(--blut);text-decoration:underline;cursor:pointer}'+
   '.wiBaum{margin:0;padding-left:1.1em}.wiBaum li{margin:2px 0}.wiOk{color:var(--gut)}.wiNein{color:var(--blut)}'+
   '.wiFehler li{margin:3px 0}.wiTab{overflow-x:auto}';document.head.appendChild(st)}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function pruefe(){P=X.pruefen({gebaeude:D.gebaeude,waren:D.waren,rezepte:D.rezepte,stufen:D.stufen,masse:D.masse,eigen:D.eigen,taetigkeiten:D.taetigkeiten});return P}
  function I(){return P.index}
  function wn(id){var w=I().ware[id];return w?w.name:id}
  function gn(id){var g=I().geb[id];return g?g.name:id}
  function wl(id){return '<button class="wiLink" data-ware="'+esc(id)+'">'+esc(wn(id))+'</button>'}
  function gl(id){return '<button class="wiLink" data-geb="'+esc(id)+'">'+esc(gn(id))+'</button>'}
  function ein(e){var t=(e.n>1?e.n+' ':'')+(e.oder?e.oder.map(wl).join(' oder '):wl(e.w));return e.opt?'(wahlweise '+t+')':t}
  function rezText(r){
   var L=(r.ein||[]).map(ein);if(r.quelle)L.unshift('<i>'+esc(r.quelle)+'</i>');
   var A=(r.aus||[]).map(function(a){return(a.n>1?a.n+' ':'')+wl(a.w)+(a.verkauf?' (verkauft)':'')});
   if(r.verkauf)A.push('<b>an Besucher verkauft</b>');(r.dienst||[]).forEach(function(x){A.push('<i>'+esc(x)+'</i>')});
   return (L.length?L.join(' + '):'–')+' → '+(A.length?A.join(', '):'–')+' <span class="leise">· '+r.sek+' s</span>';
  }
  function markiere(k){geaendert[k]=true}
  function zeichne(){
   pruefe();
   var tabs=[['pruefer','Prüfer'],['gebaeude','Gebäude'],['waren','Waren'],['ketten','Ketten'],['masse','Maßtabelle'],['stufen','Stufen & Welt'],['speichern','Speichern']];
   var h='<div class="wiTabs">'+tabs.map(function(t){return '<button class="knopf klein'+(tab===t[0]?' an':'')+'" data-tab="'+t[0]+'">'+t[1]+
    (t[0]==='pruefer'&&P.fehler.length?' ('+P.fehler.length+')':'')+(t[0]==='speichern'&&Object.keys(geaendert).length?' •':'')+'</button>'}).join('')+'</div>';
   h+='<div id="wiInhalt">'+({pruefer:vPruefer,gebaeude:vGebaeude,waren:vWaren,ketten:vKetten,masse:vMasse,stufen:vStufen,speichern:vSpeichern}[tab])()+'</div>';
   el.innerHTML=h;binde();
  }
  // ── Prüfer ──
  function vPruefer(){
   var z=P.zahlen,ohneArena=P.fehler.filter(function(f){return f.art==='arena'}),masse=P.fehler.filter(function(f){return f.art==='masse'});
   var h='<p>'+z.gebaeude+' Gebäude · '+z.waren+' Waren · '+z.rezepte+' Rezepte · '+D.taetigkeiten.taetigkeiten.length+' Tätigkeiten · '+D.stufen.stufen.length+' Stufen</p>';
   h+='<p><b>Fertig-Bedingung W2a:</b><br><span class="'+(ohneArena.length?'wiNein':'wiOk')+'">'+(ohneArena.length?'✗ '+ohneArena.length+' Waren ohne Arena-Ende':'✓ keine Ware ohne Arena-Ende')+'</span><br>'+
    '<span class="'+(masse.length?'wiNein':'wiOk')+'">'+(masse.length?'✗ '+masse.length+' Gebäude außerhalb der Maßtabelle':'✓ kein Gebäude außerhalb der Maßtabelle')+'</span></p>';
   var a=z.arenaArt;h+='<p class="leise">Wie die Waren in der Arena ankommen: '+a.verkauf+' verkauft an Buden · '+a.verbrauch+' verbraucht von Arena-Gebäuden · '+a.bau+' als Baustoff · '+
    a.transport+' als Transport · '+a.bedarf+' über den Bedarf einer Stufe · '+a.kette+' erst über eine Verarbeitung.</p>';
   if(P.fehler.length){h+='<h3>Fehler</h3><ul class="wiFehler">'+P.fehler.map(function(f){return '<li><b>'+esc(f.art)+'</b> '+zielLink(f)+' – '+esc(f.text)+'</li>'}).join('')+'</ul>'}
   else h+='<p class="wiOk">Keine Fehler. Der Kämmerer ist enttäuscht, er hatte auf Arbeit gehofft.</p>';
   var hin=P.hinweise.filter(function(x){return x.art!=='eigen'});
   if(hin.length)h+='<h3>Hinweise</h3><ul class="wiFehler">'+hin.map(function(f){return '<li>'+zielLink(f)+' – '+esc(f.text)+'</li>'}).join('')+'</ul>';
   var E=D.eigen;
   h+='<h3>Eigenständigkeit</h3><p>'+esc(E.frage)+'</p><p class="leise">Sperrliste: Namen und Wörter, die erkennbar aus einem anderen Spiel stammen. Der Prüfer sucht sie in Namen und Beschreibungen.</p>';
   h+='<ul class="wiFehler">'+(E.sperrliste.length?E.sperrliste.map(function(s,i){return '<li>„'+esc(s.wort)+'“'+(s.warum?' <span class="leise">('+esc(s.warum)+')</span>':'')+' <button class="knopf klein" data-sperrweg="'+i+'">✕</button></li>'}).join(''):'<li class="leise">leer</li>')+'</ul>';
   h+='<div class="wForm"><label>Wort<input id="wiSperrW"></label><label>Woher / warum<input id="wiSperrG"></label><label>&nbsp;<button class="knopf klein" id="wiSperrDazu">+ auf die Sperrliste</button></label></div>';
   h+='<p><b>Prüfliste je Etappe</b> (von Hand abhaken, wenn Namen, Texte, Bilder und Ketten durchgesehen sind):</p><ul class="wiFehler">'+E.pruefliste.map(function(p,i){
    return '<li><label><input type="checkbox" data-pruef="'+i+'"'+(p.geprueft?' checked':'')+'> '+esc(p.etappe)+'</label>'+(p.geprueft&&p.wann?' <span class="leise">· '+esc(p.wann)+'</span>':'')+'</li>'}).join('')+'</ul>';
   return h;
  }
  function zielLink(f){var id=String(f.id);
   if(/#/.test(id))return gl(id.split('#')[0])+' <span class="leise">('+esc(id)+')</span>';
   if(I().ware[id])return wl(id);if(I().geb[id])return gl(id);return esc(id)}
  // ── Gebäude ──
  function vGebaeude(){
   var G=D.gebaeude,h='<div class="wForm"><label>Gruppe<select id="wiFG"><option value="">alle</option>'+G.gruppen.map(function(g){return '<option value="'+g.id+'"'+(filter.gruppe===g.id?' selected':'')+'>'+esc(g.de)+'</option>'}).join('')+'</select></label>'+
    '<label>Bereich<select id="wiFB"><option value="">alle</option><option value="dorf"'+(filter.bereich==='dorf'?' selected':'')+'>Dorf und Orte</option><option value="arena"'+(filter.bereich==='arena'?' selected':'')+'>Arena-Gelände</option></select></label>'+
    '<label>Suche<input id="wiFS" value="'+esc(filter.suche)+'" placeholder="Name, Kennung, Beruf"></label></div>';
   var q=filter.suche.toLowerCase(),L=G.gebaeude.filter(function(g){return(!filter.gruppe||g.gruppe===filter.gruppe)&&(!filter.bereich||g.bereich===filter.bereich)&&
    (!q||(g.name+' '+g.id+' '+(g.beruf||'')).toLowerCase().indexOf(q)>=0)});
   h+='<p class="leise">'+L.length+' von '+G.gebaeude.length+' Gebäuden</p>';
   if(wahl&&wahl.geb)h+=karteGeb(I().geb[wahl.geb]);
   h+=L.map(function(g){var pl=(g.arbeit||[]).map(function(a){return a.n+' × '+a.t}).join(', ')||g.rolle||'–';
    return '<button class="wiZeile'+(wahl&&wahl.geb===g.id?' an':'')+'" data-geb="'+g.id+'">'+esc(g.name)+'<small>'+esc(g.id)+' · '+esc(X.groesseText(g.groesse))+(g.hof?' mit Feldern':'')+' · '+esc(g.form||'?')+
     ' · '+esc(pl)+(g.stufe?' · Stufe '+g.stufe:'')+(g.kunden?' · Kunden '+g.kunden.join('–'):'')+(g.beruf?' · '+esc(g.beruf):'')+(g.vorhanden?' · vorhanden ('+esc(g.vorhanden)+')':'')+'</small></button>'}).join('');
   return h;
  }
  function karteGeb(g){if(!g)return '';
   var R=I().rez.filter(function(r){return r.geb===g.id}),T=X.ertragstabelle({gebaeude:D.gebaeude,waren:D.waren,rezepte:D.rezepte})[g.id]||{};
   var gr=D.gebaeude.gruppen.filter(function(x){return x.id===g.gruppe})[0],mass=g.groesse||{},meter=D.masse.feld_m;
   var h='<div class="wiKarte"><h3>'+esc(g.name)+' <span class="leise">· '+esc(g.id)+'</span></h3>';
   h+='<p class="leise">'+esc(gr?gr.de:g.gruppe)+' · '+(g.bereich==='arena'?'Arena-Gelände':'Dorf und Orte')+' · Form '+esc(g.form||'?')+' · '+esc(X.groesseText(g.groesse))+(g.hof?' mit Feldern':'')+
    (mass.w?' ≈ '+(mass.w*meter).toFixed(1).replace('.',',')+' × '+(mass.h*meter).toFixed(1).replace('.',',')+' m':'')+(g.gelaende?' · Gelände: '+esc(g.gelaende):'')+(g.wohnt?' · wohnen: '+g.wohnt.n+' (Stufe '+g.wohnt.stufe+')':'')+'</p>';
   h+='<div class="wForm"><label>Name (englisch)<input data-gf="name" value="'+esc(g.name)+'"></label>';
   if(mass.w&&!mass.stufen)h+='<label>Breite (Felder)<input type="number" min="1" max="96" data-gf="w" value="'+mass.w+'"></label><label>Tiefe (Felder)<input type="number" min="1" max="96" data-gf="h" value="'+mass.h+'"></label>';
   if(g.bereich!=='arena')h+='<label>Stufe<select data-gf="stufe">'+[1,2,3,4,5,6].map(function(s){return '<option'+(g.stufe===s?' selected':'')+'>'+s+'</option>'}).join('')+'</select></label>';
   h+='<label>Beruf (englisch)<input data-gf="beruf" value="'+esc(g.beruf||'')+'"></label></div>';
   h+='<label>Beschreibung (englisch)<textarea data-gf="text">'+esc(g.text||'')+'</textarea></label>';
   if(g.planText)h+='<p class="leise">Plan: '+esc(g.planText)+'</p>';
   h+='<p class="leise">Im Plan: '+esc(g.plan||'–')+'</p>';
   if(g.vorschlag)h+='<p class="leise">Vorschlag (nicht im Plan): '+esc(g.vorschlag.join(', '))+'</p>';
   h+='<p><b>Rezepte</b></p>'+(R.length?'<ul class="wiBaum">'+R.map(function(r){return '<li>'+rezText(r)+'</li>'}).join('')+'</ul>':'<p class="leise">keine</p>');
   var tg=Object.keys(T);if(tg.length)h+='<p class="leise">Ertrag je Spieltag bei voller Besetzung: '+tg.map(function(k){var gr=D.waren.gruppen.filter(function(x){return x.id===k})[0];return esc(gr?gr.de:k)+' '+(T[k]/100).toFixed(0)}).join(' · ')+'</p>';
   return h+'</div>';
  }
  // ── Waren ──
  function vWaren(){
   var Wd=D.waren,h='<div class="wForm"><label>Gruppe<select id="wiWG"><option value="">alle</option>'+Wd.gruppen.map(function(g){return '<option value="'+g.id+'"'+(filter.wgruppe===g.id?' selected':'')+'>'+esc(g.de)+'</option>'}).join('')+'</select></label>'+
    '<label>Suche<input id="wiWS" value="'+esc(filter.wsuche)+'" placeholder="Name oder Kennung"></label></div>';
   var q=filter.wsuche.toLowerCase(),L=Wd.waren.filter(function(w){return(!filter.wgruppe||w.gruppe===filter.wgruppe)&&(!q||(w.name+' '+w.id).toLowerCase().indexOf(q)>=0)});
   h+='<p class="leise">'+L.length+' von '+Wd.waren.length+' Waren</p>';
   if(wahl&&wahl.ware)h+=karteWare(wahl.ware);
   h+=L.map(function(w){var x=P.weg[w.id];return '<button class="wiZeile'+(wahl&&wahl.ware===w.id?' an':'')+'" data-ware="'+w.id+'">'+esc(w.name)+'<small>'+esc(w.id)+' · '+esc(gruppeDe(w.gruppe))+
    (w.preis!=null?' · '+w.preis+' G':'')+' · '+(w.haltbar?w.haltbar+' Tage':'hält')+(w.fern?' · Fernhandel':'')+(w.baustoff?' · Baustoff':'')+(w.spiel?' · im Spiel: '+esc(w.spiel):'')+
    ' · '+(x?(x.n?'über '+x.n+' Schritt'+(x.n>1?'e':''):artDe(x.art)):'<span class="wiNein">kein Weg in die Arena</span>')+'</small></button>'}).join('');
   return h;
  }
  function gruppeDe(id){var g=D.waren.gruppen.filter(function(x){return x.id===id})[0];return g?g.de:id}
  function artDe(a){return{verkauf:'an einer Bude verkauft',verbrauch:'von einem Arena-Gebäude verbraucht',bau:'Baustoff',transport:'Transport',bedarf:'Bedarf einer Stufe'}[a]||a}
  function karteWare(id){var w=I().ware[id];if(!w)return '';
   var made=uniq((I().made[id]||[]).map(function(ri){return I().rez[ri].geb})),used=uniq((I().used[id]||[]).map(function(ri){return I().rez[ri].geb})),bed=I().bedarf[id]||[];
   var h='<div class="wiKarte"><h3>'+esc(w.name)+' <span class="leise">· '+esc(w.id)+'</span></h3>';
   h+='<div class="wForm"><label>Name (englisch)<input data-wf="name" value="'+esc(w.name)+'"></label><label>Gruppe<select data-wf="gruppe">'+D.waren.gruppen.map(function(g){return '<option value="'+g.id+'"'+(w.gruppe===g.id?' selected':'')+'>'+esc(g.de)+'</option>'}).join('')+'</select></label>'+
    '<label>Haltbar (Spieltage, 0 = immer)<input type="number" min="0" max="999" data-wf="haltbar" value="'+(w.haltbar||0)+'"></label><label>Grundpreis (Gold)<input type="number" min="0" max="9999" data-wf="preis" value="'+(w.preis==null?'':w.preis)+'"></label>'+
    '<label><span><input type="checkbox" data-wf="baustoff"'+(w.baustoff?' checked':'')+'> Baustoff</span></label><label><span><input type="checkbox" data-wf="fern"'+(w.fern?' checked':'')+'> nur Fernhandel</span></label></div>';
   h+='<label>Arena-Ende (englisch, „Ends up at the arena …“)<textarea data-wf="arena">'+esc(w.arena||'')+'</textarea></label>';
   h+='<p><b>Made by:</b> '+(made.length?made.map(gl).join(', '):(w.fern?'Fernhandel':'<span class="wiNein">niemand</span>'))+'</p>';
   h+='<p><b>Used for:</b> '+(used.length?used.map(gl).join(', '):'–')+'</p>';
   if(bed.length)h+='<p><b>Gebraucht von:</b> '+bed.map(function(s){var S=D.stufen.stufen.filter(function(x){return x.id===s})[0];return esc(S?S.name:s)}).join(', ')+'</p>';
   h+='<p><b>Weg in die Arena:</b> '+wegHtml(id)+'</p>';
   h+='<p><button class="knopf klein" data-kette="'+esc(id)+'">Ganze Kette ansehen</button></p>';
   return h+'</div>';
  }
  function uniq(L){return L.filter(function(x,i){return L.indexOf(x)===i})}
  function wegHtml(id){var L=X.wegListe(P.weg,id);if(!L.length)return '<span class="wiNein">keiner</span>';
   var e=L[L.length-1];return L.map(function(x,i){return wl(x.w)+(x.ueber?' <span class="leise">('+esc(gn(x.ueber))+')</span>':'')}).join(' → ')+' → <b>'+
    (e.art==='verkauf'||e.art==='verbrauch'?esc(gn(e.wo)):e.art==='bedarf'?esc(stufeName(e.wo)):artDe(e.art))+'</b> <span class="leise">('+artDe(e.art)+')</span>'}
  function stufeName(s){var S=D.stufen.stufen.filter(function(x){return x.id===s})[0];return S?S.name:s}
  // ── Ketten ──
  function vKetten(){
   var h='<div class="wForm"><label>Ware<select id="wiKW">'+D.waren.waren.slice().sort(function(a,b){return a.name<b.name?-1:1}).map(function(w){return '<option value="'+w.id+'"'+(w.id===kette?' selected':'')+'>'+esc(w.name)+'</option>'}).join('')+'</select></label></div>';
   h+='<h3>'+esc(wn(kette))+': bis in die Arena</h3><p>'+wegHtml(kette)+'</p>';
   h+='<h3>Woraus es entsteht</h3>'+baum(kette,0,{});
   var used=uniq((I().used[kette]||[]).map(function(ri){return I().rez[ri].geb}));
   h+='<h3>Wofür es gebraucht wird</h3>'+(used.length?'<ul class="wiBaum">'+used.map(function(g){return '<li>'+gl(g)+': '+I().rez.filter(function(r){return r.geb===g&&(r.ein||[]).some(function(e){return X.einWaren(e).indexOf(kette)>=0})}).map(rezText).join('; ')+'</li>'}).join('')+'</ul>':'<p class="leise">nichts</p>');
   return h;
  }
  function baum(id,tiefe,seh){
   if(seh[id]||tiefe>5)return '<span class="leise"> …</span>';seh=Object.assign({},seh);seh[id]=1;
   var R=(I().made[id]||[]).map(function(ri){return I().rez[ri]});
   if(!R.length)return '<ul class="wiBaum"><li class="leise">'+(I().ware[id]&&I().ware[id].fern?'Fernhandel':'Rohstoff')+'</li></ul>';
   return '<ul class="wiBaum">'+R.map(function(r){var E=(r.ein||[]).filter(function(e){return !e.opt});
    return '<li>'+gl(r.geb)+': '+rezText(r)+(E.length&&tiefe<5?E.map(function(e){return '<div>'+wl(X.einWaren(e)[0])+baum(X.einWaren(e)[0],tiefe+1,seh)+'</div>'}).join(''):'')+'</li>'}).join('')+'</ul>';
  }
  // ── Maßtabelle ──
  function vMasse(){
   var M=D.masse,zahl={};D.gebaeude.gebaeude.forEach(function(g){String(g.form||'?').split('→').forEach(function(f){zahl[f]=(zahl[f]||0)+1})});
   var h='<p>1 Feld ≈ '+String(M.feld_m).replace('.',',')+' m · Sitzplatz der Arena ≈ '+String(M.sitzplatz_feld).replace('.',',')+' Felder · '+esc(M.figur)+'</p>';
   h+='<div class="wiTab"><table class="tabelle"><tr><th>Form</th><th>kurze Seite</th><th>lange Seite</th><th>Gebäude</th><th>Beispiele</th></tr>'+M.formen.map(function(f){
    var k=f.rund?'Ø '+f.rund[0]+'–'+f.rund[1]:f.kurz?f.kurz[0]+'–'+f.kurz[1]:'–',l=f.lang?f.lang[0]+'–'+f.lang[1]:'–';
    return '<tr><td>'+esc(f.name)+(f.hof?' <span class="leise">(mit Feldern)</span>':'')+'</td><td>'+k+'</td><td>'+l+'</td><td>'+(zahl[f.id]||0)+'</td><td class="leise">'+esc(f.bsp)+'</td></tr>'}).join('')+'</table></div>';
   h+='<h3>Größen in echt</h3><div class="wiTab"><table class="tabelle"><tr><th>Was</th><th>Felder</th><th>Meter</th></tr>'+M.beispiele.map(function(b){return '<tr><td>'+esc(b.was)+'</td><td>'+esc(b.felder)+'</td><td>'+esc(b.meter)+'</td></tr>'}).join('')+'</table></div>';
   h+='<h3>Arena-Stufen (wie 2.0)</h3><p>'+M.arenaStufen.map(function(a){return esc(a.name)+' Ø '+a.d+' (~'+a.plaetze+' Plätze)'+(a.vorschlag?' <span class="leise">Vorschlag</span>':'')}).join(' → ')+'</p>';
   h+='<p class="leise">Arena-Gelände '+M.arenaGelaende.w+' × '+M.arenaGelaende.h+' Felder: '+esc(M.arenaGelaende.hinweis)+'. Bauklassen: '+M.bauklassen.map(function(b){return esc(b.de)}).join(', ')+'.</p>';
   return h;
  }
  // ── Stufen & Welt ──
  function bedarfText(L){return(L||[]).map(function(b){if(b.w)return wl(b.w)+(b.text?' <span class="leise">('+esc(b.text)+')</span>':'');if(b.oder)return b.oder.map(wl).join(' oder ');
   if(b.g)return gl(b.g);if(b.gruppe)return 'jede Ware aus „'+esc(gruppeDe(b.gruppe))+'“';return '<i>'+esc(b.frei)+'</i> <span class="leise">(noch ohne Gebäude)</span>'}).join(', ')}
  function vStufen(){
   var h='<h3>Bevölkerungsstufen</h3>'+D.stufen.stufen.map(function(s){return '<div class="wiKarte"><b>'+s.id+' · '+esc(s.name)+'</b> <span class="leise">('+esc(s.de)+') · wohnt in '+gl(s.haus)+' · arbeitet in: '+esc(s.arbeitet)+'</span>'+
    '<br>Grund: '+bedarfText(s.grund)+(s.wieStufe?' <span class="leise">+ alles aus Stufe '+s.wieStufe+'</span>':'')+'<br>Zusatz: '+bedarfText(s.zusatz)+'<br><span class="leise">In der Arena: '+esc(s.arena)+'</span></div>'}).join('');
   var S=D.systeme;
   h+='<h3>Siedlungsgrößen</h3><div class="wiTab"><table class="tabelle"><tr><th></th><th>Name</th><th>Einwohner</th><th>höchste Stufe</th><th>Herr</th></tr>'+S.siedlungen.map(function(x){return '<tr><td>'+x.id+'</td><td>'+esc(x.name)+' <span class="leise">('+esc(x.de)+')</span></td><td>'+x.einwohner[0].toLocaleString('de-DE')+'–'+x.einwohner[1].toLocaleString('de-DE')+'</td><td>'+x.hoechsteStufe+'</td><td>'+esc(x.herr)+'</td></tr>'}).join('')+'</table></div>';
   h+='<h3>Politische Systeme</h3><ul class="wiBaum">'+S.systeme.map(function(x){return '<li><b>'+esc(x.name)+'</b> <span class="leise">('+esc(x.de)+')</span>: '+esc(x.herrscher)+' über '+esc(x.unter.join(', '))+' · '+esc(x.bedeutung)+'</li>'}).join('')+'</ul>';
   h+='<h3>Truppen</h3><ul class="wiBaum">'+S.truppen.map(function(t){return '<li><b>'+esc(t.name)+'</b>: '+esc(t.rang.join(' → '))+'</li>'}).join('')+'</ul>';
   h+='<h3>Vices (erfunden)</h3><ul class="wiBaum">'+D.vices.vices.map(function(v){return '<li>'+wl(v.ware)+': '+(v.fern?'nur Fernhandel':gl(v.anbau)+' → '+gl(v.verarbeitung))+' · '+esc(v.wirkung)+' · Laune '+(v.laune>0?'+':'')+v.laune+', Tempo '+(v.tempo>0?'+':'')+v.tempo+', Abhängigkeit '+v.abhaengigkeit+'</li>'}).join('')+'</ul><p class="leise">'+esc(D.vices.hinweis)+'</p>';
   var K=D.kulturen;h+='<h3>Kulturen</h3><p>Werte: '+K.werte.map(function(w){return esc(w.de)}).join(', ')+' · Baustile: '+K.baustile.map(function(w){return esc(w.de)}).join(', ')+'</p><p class="leise">'+esc(K.hinweis)+'</p>';
   return h;
  }
  // ── Speichern ──
  function vSpeichern(){
   var h='<p>Geänderte Dateien hier speichern und im Repository unter <code>dist/at3/daten/</code> ersetzen. Das Spiel und der Prüfer lesen nur diese Dateien.</p>';
   h+=keys.map(function(k){var ge=geaendert[k]||JSON.stringify(D[k])!==D0[k];return '<p><button class="knopf" data-speichern="'+k+'"'+(ge?'':' disabled')+'>'+esc(DATEIEN[k])+'<small>'+(ge?'geändert':'unverändert')+'</small></button></p>'}).join('');
   h+='<p><button class="knopf" id="wiZurueck">Alles zurücksetzen</button></p>';
   return h;
  }
  function speichern(k){var b=new Blob([X.alsText(D[k])],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=DATEIEN[k];document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000)}
  // ── Bedienung ──
  function binde(){
   function alle(sel,fn){[].forEach.call(el.querySelectorAll(sel),fn)}
   alle('[data-tab]',function(b){b.onclick=function(){tab=b.dataset.tab;zeichne()}});
   alle('[data-geb]',function(b){b.onclick=function(){wahl={geb:b.dataset.geb};tab='gebaeude';zeichne();oben()}});
   alle('[data-ware]',function(b){b.onclick=function(){wahl={ware:b.dataset.ware};tab='waren';zeichne();oben()}});
   alle('[data-kette]',function(b){b.onclick=function(){kette=b.dataset.kette;tab='ketten';zeichne()}});
   var q;
   if((q=el.querySelector('#wiFG')))q.onchange=function(){filter.gruppe=q.value;zeichne()};
   if((q=el.querySelector('#wiFB'))){var fb=q;fb.onchange=function(){filter.bereich=fb.value;zeichne()}}
   if((q=el.querySelector('#wiFS'))){var fs=q;fs.oninput=function(){filter.suche=fs.value;var p=fs.selectionStart;zeichne();var n=el.querySelector('#wiFS');n.focus();n.setSelectionRange(p,p)}}
   if((q=el.querySelector('#wiWG'))){var wg=q;wg.onchange=function(){filter.wgruppe=wg.value;zeichne()}}
   if((q=el.querySelector('#wiWS'))){var ws=q;ws.oninput=function(){filter.wsuche=ws.value;var p=ws.selectionStart;zeichne();var n=el.querySelector('#wiWS');n.focus();n.setSelectionRange(p,p)}}
   if((q=el.querySelector('#wiKW'))){var kw=q;kw.onchange=function(){kette=kw.value;zeichne()}}
   alle('[data-gf]',function(x){x.onchange=function(){var g=I().geb[wahl.geb],f=x.dataset.gf,v=x.value;
    if(f==='w'||f==='h'){v=Math.max(1,Math.min(96,Math.round(+v||1)));g.groesse[f]=v;var fm=X.formFuer(D.masse,g);if(fm)g.form=fm}
    else if(f==='stufe')g.stufe=+v;else g[f]=v.trim();markiere('gebaeude');zeichne()}});
   alle('[data-wf]',function(x){x.onchange=function(){var w=I().ware[wahl.ware],f=x.dataset.wf;
    if(x.type==='checkbox'){if(x.checked)w[f]=true;else delete w[f]}
    else if(f==='haltbar'||f==='preis'){w[f]=x.value===''?null:Math.max(0,Math.round(+x.value||0))}
    else w[f]=x.value.trim();markiere('waren');zeichne()}});
   alle('[data-pruef]',function(x){x.onchange=function(){var p=D.eigen.pruefliste[+x.dataset.pruef];p.geprueft=x.checked;p.wann=x.checked?new Date().toISOString().slice(0,10):'';markiere('eigen');zeichne()}});
   alle('[data-sperrweg]',function(x){x.onclick=function(){D.eigen.sperrliste.splice(+x.dataset.sperrweg,1);markiere('eigen');zeichne()}});
   if((q=el.querySelector('#wiSperrDazu')))q.onclick=function(){var w=el.querySelector('#wiSperrW').value.trim(),g=el.querySelector('#wiSperrG').value.trim();if(!w)return;D.eigen.sperrliste.push(g?{wort:w,warum:g}:{wort:w});markiere('eigen');zeichne()};
   alle('[data-speichern]',function(b){b.onclick=function(){speichern(b.dataset.speichern)}});
   if((q=el.querySelector('#wiZurueck')))q.onclick=function(){keys.forEach(function(k){D[k]=JSON.parse(D0[k])});geaendert={};wahl=null;zeichne()};
  }
  function oben(){var k=el.querySelector('.wiKarte');if(k)try{k.scrollIntoView({block:'nearest'})}catch(e){}}
  window.AT3_WIRTSCHAFT={D:D,pruefen:pruefe,ansicht:function(t){tab=t;zeichne()}};
  zeichne();
 }).catch(function(e){el.innerHTML='<p class="witz">Wirtschaftsdaten nicht lesbar: '+String(e.message).replace(/</g,'&lt;')+'</p>'});
});
