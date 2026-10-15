(()=>{'use strict';const M=window.MG,P=window.PixelLive;
if(M.drawRex){const original=M.drawRex;M.drawRex=function(q,a){P.paint(q,a.x||0,a.y||0,()=>original.call(this,P.context,a));};}
if(window.HS?.art&&window.FigureSeller){HS.art.seller=function(q,o){P.paint(q,o.x||0,o.y||0,()=>FigureSeller.paint(P.context,o));};}
M.figureGraphics={version:window.DirectFigureLive?.version||P.version,stage:2,stats:window.DirectFigureLive?.stats||P.stats};
})();
