'use strict';
// =====================================================================================================================
// GLADIATORENPROFIL ARENA THEORY 2.0 (welt-profil.js) · Eigenes, leeres Profilfenster statt der Profilseite aus 1.0.
// Wunsch Thomas 13.11.2026: Über „Profil“ kam man in 2.0 auf die Profilseite von 1.0 und von dort in alle 1.0-Menüs
// (Ludus, Arena, Kader, Ausrüstung, Mehr, Medicus, Ausrüsten, Ruhestand …). Die Menüs entstehen neu für 2.0, Schritt für
// Schritt (AT2_FAHRPLAN.md, Abschnitt U, Profil-Schritte). Bis dahin zeigt das Fenster nur Name und Herkunft, sonst nichts.
// Nur auf arena-theory-2.html geladen. Ohne diese Datei (z. B. im Tageslauf-Editor) bleibt der alte Weg in welt-leben.js.
// · Keine Knöpfe in 1.0-Menüs, keine Spielwirkung, kein Speicherwert. Texte aus der Sprachdatei (Regel 10).
// · Leistung: nur ein kleines Fenster, nichts läuft pro Bild.
// =====================================================================================================================
(()=>{
const M=window.MG,L=window.AT2Sprache;if(!M||!L)return;const S=M.s,t=L.t;
const st=document.createElement('style');st.textContent=
 '#wProfil{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:60;width:min(420px,calc(100% - 24px));background:rgba(18,12,9,.97);border:2px solid #8a6a42;box-shadow:0 4px 0 #000;padding:12px 14px;color:#ead9b8;font-size:13px}'+
 '#wProfil[hidden]{display:none}#wProfil header{display:flex;align-items:flex-start;gap:8px}#wProfil header div{flex:1}#wProfil b{display:block;font-size:17px;color:#f0c66e}'+
 '#wProfil small{display:block;opacity:.8;margin-top:2px}#wProfil p{margin:12px 0;line-height:1.45}#wProfil .w-btn{min-height:40px}';
document.head.appendChild(st);
const el=document.createElement('div');el.id='wProfil';el.hidden=true;el.setAttribute('role','dialog');
el.innerHTML='<header><div><b></b><small></small></div><button class="w-x" data-x>✕</button></header><p></p><button class="w-btn" data-x></button>';
document.body.appendChild(el);
let id=null;
function fuellen(){const g=S.roster.find(x=>x.id===id);if(!g){zu();return;}
 el.setAttribute('aria-label',t('profil.titel'));el.querySelector('b').textContent=M.displayName?.(g)||g.name;
 el.querySelector('small').textContent=t('profil.zeile',{alter:g.age,herkunft:g.origin,bau:g.build});
 el.querySelector('p').textContent=t('profil.neu');el.querySelector('header .w-x').setAttribute('aria-label',t('profil.zu'));
 el.querySelector('.w-btn').textContent=t('profil.karte');}
function auf(g){if(!g)return;id=g.id;fuellen();el.hidden=false;}
function zu(){id=null;el.hidden=true;}
el.addEventListener('click',e=>{if(e.target.closest('[data-x]'))zu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!el.hidden)zu();});
L.beiWechsel(()=>{if(!el.hidden)fuellen();});
M.weltProfil={oeffnen:auf,schliessen:zu,offen:()=>!el.hidden};
})();
