// Compatibility for older HTML entry points: the animated brand intro is retired.
'use strict';
(()=>{
 function finish(){if(typeof document!=='undefined')document.getElementById('brandIntro')?.remove?.();}
 window.ArenaTheoryIntro={active:()=>false,finish};
 finish();
})();
