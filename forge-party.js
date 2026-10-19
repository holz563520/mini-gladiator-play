'use strict';
// =====================================================================================================
// DIE SCHMIEDE-PARTY (Testversion)
// Nach 15 Sekunden Leerlauf hört der Schmied auf zu arbeiten. Von da an wächst über Minuten eine Party:
// Doktor Hirnhammer, Schwester Valeria und der Lanista kommen nach und nach dazu, es wird getrunken,
// getanzt, gekotzt und gebrannt. Alle bewegen sich im Takt des gerade laufenden Schmiede-Liedes.
// · Takt: feste Taktraster der beiden Lieder (unten als DATA), gleitend mit der Audio-Uhr verrechnet.
// · Zeitplan: EV (Sekunden seit Betreten der Schmiede). Ab Ende der Liste laufen Zufallsereignisse endlos weiter.
// · Alles wird nur über M.renderForgeActors gezeichnet (nur Leinwand "smithScene"), nichts am Spielstand geändert.
// · Testhilfe: kleine Leiste unten (+30 s / +2 min / Neustart), dazu M.forgeParty.jump(sekunden).
// =====================================================================================================
(()=>{
const M=window.MG,S=M.s,W=M.workshop,F=W?.state;
if(!M.renderForgeActors||!M.forgeVisuals||!F)return;
// Taktraster (Sekunden der Schläge) und Lautstärkeverlauf (vier Werte pro Sekunde, 0-9) der beiden Schmiede-Lieder, in Reihenfolge der Liste in audio.js.
const BEATS=[[0.05,0.43,0.81,1.2,1.59,1.99,2.38,2.77,3.17,3.56,3.96,4.35,4.75,5.14,5.53,5.91,6.28,6.66,7.07,7.47,7.87,8.25,8.65,9.04,9.43,9.82,10.21,10.6,10.99,11.39,11.77,12.16,12.53,12.91,13.31,13.7,14.09,14.48,14.86,15.24,15.63,16.01,16.39,16.79,17.18,17.58,17.96,18.34,18.74,19.13,19.5,19.9,20.28,20.68,21.07,21.46,21.86,22.24,22.63,23.03,23.42,23.79,24.18,24.58,24.98,25.36,25.74,26.12,26.52,26.91,27.33,27.69,28.08,28.47,28.85,29.25,29.63,30.02,30.43,30.79,31.18,31.57,31.95,32.33,32.73,33.12,33.53,33.89,34.27,34.64,35.05,35.43,35.83,36.21,36.62,36.97,37.36,37.76,38.15,38.53,38.93,39.32,39.71,40.08,40.47,40.89,41.26,41.66,42.03,42.4,42.79,43.19,43.61,43.97,44.34,44.73,45.12,45.49,45.87,46.27,46.66,47.07,47.43,47.83,48.22,48.61,48.98,49.37,49.75,50.14,50.53,50.92,51.32,51.7,52.09,52.45,52.85,53.21,53.63,54.02,54.4,54.8,55.16,55.53,55.94,56.33,56.71,57.12,57.52,57.92,58.29,58.67,59.09,59.49,59.87,60.26,60.65,61.02,61.43,61.82,62.21,62.58,62.95,63.33,63.72,64.09,64.47,64.85,65.24,65.63,66.0,66.39,66.78,67.16,67.55,67.93,68.32,68.72,69.09,69.47,69.86,70.25,70.67,71.03,71.41,71.8,72.18,72.56,72.96,73.35,73.72,74.11,74.5,74.88,75.27,75.65,76.05,76.43,76.82,77.19,77.58,77.96,78.34,78.74,79.12,79.53,79.91,80.29,80.68,81.08,81.46,81.84,82.22,82.6,82.99,83.38,83.77,84.14,84.52,84.89,85.3,85.68,86.04,86.45,86.83,87.2,87.6,87.97,88.36,88.75,89.11,89.5,89.88,90.27,90.65,91.0,91.38,91.79,92.17,92.54,92.94,93.33,93.72,94.1,94.48,94.88,95.25,95.63,96.0,96.39,96.77,97.16,97.56,97.95,98.37,98.75,99.15,99.53,99.94,100.31,100.68,101.06,101.44,101.81,102.19,102.59,102.98,103.36,103.75,104.15,104.54,104.91,105.3,105.7,106.09,106.48,106.88,107.25,107.62,108.0,108.38,108.76,109.16,109.54,109.93,110.32,110.7,111.08,111.48,111.86,112.25,112.63,113.01,113.39,113.79,114.2,114.58,114.97,115.33,115.73,116.1,116.48,116.88,117.26,117.64,118.04,118.41,118.79,119.19,119.58,119.97,120.35,120.73,121.13,121.51,121.9,122.29,122.68,123.08,123.46,123.84,124.24,124.62,125.04,125.41,125.82,126.19,126.57,126.96,127.35,127.74,128.13,128.51,128.89,129.28,129.66,130.04,130.44,130.83,131.22,131.6,131.98],[0.09,0.43,0.77,1.1,1.44,1.78,2.11,2.45,2.79,3.12,3.46,3.8,4.13,4.47,4.81,5.14,5.48,5.82,6.15,6.49,6.83,7.16,7.5,7.84,8.17,8.51,8.86,9.21,9.54,9.88,10.22,10.55,10.89,11.23,11.56,11.9,12.25,12.6,12.95,13.28,13.61,13.94,14.28,14.62,14.95,15.29,15.63,15.96,16.3,16.64,16.97,17.3,17.62,17.97,18.32,18.67,19.02,19.37,19.71,20.06,20.42,20.77,21.12,21.47,21.82,22.18,22.52,22.87,23.23,23.58,23.94,24.29,24.64,24.98,25.34,25.69,26.03,26.38,26.73,27.09,27.45,27.79,28.14,28.5,28.86,29.21,29.56,29.91,30.27,30.62,30.98,31.34,31.68,32.03,32.39,32.74,33.09,33.44,33.79,34.13,34.49,34.84,35.19,35.55,35.9,36.25,36.59,36.94,37.29,37.65,38.0,38.35,38.68,39.03,39.37,39.72,40.07,40.4,40.75,41.1,41.45,41.8,42.14,42.49,42.84,43.19,43.54,43.89,44.22,44.58,44.92,45.27,45.62,45.96,46.31,46.66,47.0,47.35,47.69,48.04,48.39,48.73,49.08,49.42,49.77,50.12,50.47,50.81,51.15,51.5,51.85,52.2,52.54,52.88,53.24,53.58,53.92,54.28,54.64,54.97,55.31,55.65,55.99,56.34,56.69,57.04,57.39,57.74,58.07,58.42,58.77,59.11,59.45,59.8,60.15,60.5,60.84,61.18,61.52,61.87,62.22,62.58,62.91,63.25,63.6,63.94,64.28,64.63,64.97,65.32,65.67,66.01,66.35,66.7,67.05,67.4,67.73,68.08,68.43,68.78,69.11,69.46,69.81,70.15,70.5,70.84,71.19,71.53,71.88,72.23,72.56,72.91,73.25,73.61,73.94,74.28,74.63,74.98,75.33,75.67,76.01,76.36,76.7,77.04,77.38,77.73,78.08,78.41,78.76,79.11,79.46,79.81,80.14,80.49,80.84,81.19,81.53,81.87,82.22,82.57,82.92,83.26,83.59,83.93,84.28,84.61,84.96,85.31,85.66,86.0,86.34,86.68,87.03,87.37,87.71,88.05,88.4,88.75,89.09,89.43,89.77,90.11,90.46,90.8,91.14,91.49,91.83,92.18,92.52,92.87,93.2,93.55,93.89,94.24,94.57,94.91,95.26,95.61,95.94,96.29,96.63,96.97,97.31,97.65,98.0,98.35,98.68,99.03,99.37,99.72,100.05,100.39,100.74,101.09,101.44,101.77,102.11,102.46,102.79,103.13,103.48,103.82,104.16,104.5,104.84,105.19,105.53,105.88,106.22,106.56,106.9,107.24,107.58,107.93,108.27,108.61,108.95,109.31,109.64,109.98,110.32,110.65,110.99,111.34,111.68,112.02,112.36,112.71,113.05,113.39,113.72,114.07,114.4,114.74,115.08,115.44,115.79,116.12,116.46,116.8,117.14,117.49,117.82,118.17,118.5,118.85,119.19,119.52,119.86,120.21,120.55,120.89,121.23,121.57,121.9,122.25,122.59,122.93,123.26,123.61,123.95,124.3,124.63,124.98,125.32,125.65,125.99,126.33,126.66,127.02,127.36,127.7,128.03,128.38,128.72,129.07,129.4,129.74,130.08,130.43,130.76,131.1,131.45,131.8,132.12,132.47,132.81,133.14,133.48,133.84,134.16,134.5,134.85,135.2,135.53,135.87,136.22,136.56,136.89,137.24,137.58,137.91,138.25,138.61,138.94,139.27,139.62,139.97,140.31,140.63,140.98,141.33,141.66,142.0,142.34,142.69,143.02,143.36,143.71,144.04,144.39,144.74,145.07,145.41,145.75,146.09,146.44,146.77,147.11,147.46,147.8,148.14,148.48,148.83,149.16,149.51,149.85,150.19,150.52,150.87,151.21,151.56,151.89,152.23,152.57,152.92,153.25,153.59,153.93,154.27,154.62,154.97,155.3,155.64,155.98,156.33,156.67,156.99,157.34,157.69,158.02,158.37,158.71,159.06,159.39,159.73,160.07,160.42,160.75,161.09,161.43,161.76,162.1,162.45,162.8,163.14,163.49,163.83,164.17,164.5,164.84,165.18,165.51,165.85,166.19,166.52,166.87,167.21,167.54,167.88,168.23,168.57,168.91,169.25,169.6,169.94,170.27,170.61,170.96,171.29,171.63,171.98,172.33,172.65,172.99,173.34,173.67,174.01,174.36,174.72,175.04,175.38,175.72,176.05,176.39,176.74,177.08,177.42,177.78,178.1,178.43,178.77,179.12,179.46,179.79,180.14,180.47,180.81,181.15,181.5,181.84,182.17,182.51,182.85,183.19,183.53,183.87,184.22,184.55,184.89,185.24,185.59,185.92,186.26,186.6,186.93,187.27,187.62,187.95,188.3,188.64,188.98,189.31,189.66,190.0,190.33,190.67,191.01,191.36,191.69,192.03,192.37,192.71,193.05,193.39,193.74,194.07,194.41,194.76,195.11,195.43,195.78,196.12,196.45,196.79,197.14,197.47,197.82,198.16,198.51,198.83,199.18,199.52,199.85,200.19,200.54,200.88,201.22,201.55,201.9,202.23,202.58,202.92,203.26,203.59,203.92,204.25,204.59,204.93,205.28,205.62,205.98,206.34,206.69,207.04,207.38,207.71,208.05,208.4,208.72,209.06,209.41,209.78,210.12,210.45,210.8,211.15,211.49,211.84,212.17,212.49,212.85,213.17,213.51,213.86,214.18,214.52,214.85,215.21,215.55,215.9,216.24,216.58,216.91,217.26,217.59,217.93,218.27,218.63,218.96,219.3,219.64,219.97,220.32,220.67,221.0,221.34,221.69,222.03,222.37,222.7,223.05,223.39,223.72,224.07,224.43,224.77,225.09,225.43,225.78,226.12,226.46,226.79,227.14,227.47,227.81,228.16,228.5,228.83,229.18,229.52,229.85,230.2,230.54,230.88,231.22,231.55,231.89,232.23,232.58,232.92,233.26,233.6,233.94,234.28,234.63,234.96,235.3,235.65,235.98,236.33,236.67,237.01,237.34,237.69,238.03,238.38,238.75,239.07,239.42,239.77,240.09,240.43,240.77,241.1,241.44,241.77,242.11,242.47,242.81,243.16,243.51,243.84,244.18,244.52,244.85,245.2,245.55,245.89,246.22,246.57,246.91,247.25,247.58,247.93,248.27,248.6,248.94,249.28,249.61,249.96,250.3,250.65,250.98,251.32,251.66,251.99,252.34,252.69,253.04,253.38,253.72,254.05,254.39,254.73,255.07,255.42,255.76,256.09,256.43,256.78,257.11,257.45,257.8,258.14,258.48,258.82,259.16,259.49,259.84,260.18,260.53,260.86,261.2,261.55,261.89,262.22,262.56,262.91,263.24,263.59,263.94,264.28,264.61,264.95,265.3,265.64,265.98,266.31,266.66,266.99,267.34,267.67,268.02,268.35,268.7,269.04,269.37,269.71,270.06,270.4,270.74,271.08,271.42,271.77,272.1,272.44,272.79,273.12,273.46,273.8,274.15,274.49,274.83,275.17,275.5,275.85,276.19,276.53,276.87,277.21,277.55,277.88,278.23,278.58,278.92,279.27,279.6,279.94,280.29,280.61,280.96,281.3,281.63,281.97,282.33,282.67,283.02,283.34,283.7,284.03,284.37,284.7,285.05,285.4,285.72,286.06,286.42,286.75,287.08,287.43,287.78,288.11,288.45,288.79,289.13,289.47,289.82,290.16,290.49,290.83,291.18,291.53,291.86,292.2,292.54,292.87,293.21,293.56,293.91,294.24,294.58,294.92,295.26,295.6,295.94,296.28,296.61,296.95,297.29,297.63,297.97,298.31,298.66,298.99,299.33,299.68,300.01,300.35,300.7,301.04,301.37,301.72,302.06,302.39,302.73,303.07,303.42,303.75,304.09,304.44,304.77,305.12,305.46,305.81,306.13,306.47,306.81,307.15,307.5,307.84,308.19,308.52,308.87,309.22,309.56,309.89,310.23,310.58,310.92,311.25,311.59,311.95,312.29,312.61,312.95,313.3,313.63,313.98,314.32,314.65,315.0,315.34,315.69,316.02,316.36,316.7,317.03,317.38,317.72,318.06,318.39,318.74,319.09,319.43,319.76,320.1,320.45,320.78,321.12,321.46,321.79,322.14,322.49,322.83,323.16,323.5,323.84,324.19,324.51,324.86,325.21,325.54,325.88,326.23,326.58,326.9,327.24,327.58,327.92,328.26,328.6,328.95,329.29,329.63,329.97,330.3,330.65,330.99,331.33,331.67,332.02,332.35,332.7,333.03,333.37,333.71,334.04,334.39,334.73,335.06,335.4,335.75,336.09,336.42,336.76,337.11,337.44,337.79,338.14,338.47,338.81,339.15,339.49,339.84,340.18,340.51,340.85,341.19,341.53,341.87,342.2,342.55,342.89,343.23,343.56,343.91,344.25,344.58,344.92,345.27,345.61,345.94,346.29,346.63,346.96,347.31,347.65,347.99,348.32,348.67,349.02,349.34,349.69,350.03,350.37,350.71,351.05,351.39,351.74,352.07,352.41,352.75,353.08,353.43,353.77,354.1,354.44,354.79,355.13,355.46,355.81,356.15,356.48,356.82,357.16,357.49,357.83,358.17,358.5,358.85,359.2,359.55,359.9,360.25,360.59,360.94,361.29,361.64,361.98,362.31,362.65,362.99,363.32,363.66,364.01,364.36,364.7,365.03,365.35,365.68,366.0,366.33,366.65,366.98,367.32,367.65,367.99,368.33,368.69,369.03,369.38,369.72,370.06,370.39,370.75,371.11,371.47,371.8,372.15,372.48,372.82,373.16,373.49,373.84,374.19,374.53,374.86,375.21,375.55,375.88,376.22,376.57,376.91,377.24,377.59,377.93,378.26,378.6,378.95,379.29,379.63,379.97,380.31,380.66,380.99,381.33,381.67,382.01,382.36,382.71,383.05,383.38,383.72,384.07,384.42,384.77,385.11,385.46,385.81,386.17,386.54,386.88,387.22,387.55,387.89,388.23]],ENV=["0126655432222222422224233244375544443434426344434444444543434442433555555545455587542422752437544333332247855553468544765554337578684554443853346525435445457766555676665765655555355386654444433366665334426777776544336655966554544465676544455554565655655555455343536677677877664557665876655347678696665554866668655546578998776556676565866655767564576656646655376665855746677664764565555667546674776854555431455362264343566666346645445546555464566567977666966667997666897776597786666966679886557889999987656787656889777669899988876665667788322101", "00000000015323212111111111111223222223334322222223333323223333333333333442222222343432332333322332323322444432212214433333333333333323333333333333333344444444444554432642434644324464434444326543445444444444354432234433343332343444433223343324333333433345433233433243323334343543323144324323323323344443344333343333344343433333434334433224434444433243233343332332323333323332332323333443436553343644264443346444655434364435534455445445444444444454444445454543444543434444543324346444464444465434555455654345544446565552333344333443333444333444444433334333324222222224454433444433533334444445534335444455443454455565444554443644335554546544446443455443365555553332443335643443334346544455454445545465654644434374436544324654455543335543564435544555755556665457655556666565454566544665465666666645456665556454466666675544667555766667666665433223223112332333234553322322322234233424336665354664356553545546766545556556565335333358555465644575455666567764436665447666666666566545463345454344645666655445544446456445655665344354555663443544656757767657667776777777774433443434333433344477654434434465465666677776555766575756456665777665566665677778885455775546876557656568776887666577767687777877777764444844538735338534377777676777777777776777878888888779664464465354644444569984534344648899998989888777799766898776988787966668886779878888878887666799876987777998989877779987989989993393497777989799987789997988988889888998989899898987677987788977679998989878899979896533243334334444444334333100001212110010001111103988898847528987889989898779999989998889899898988889897999976789799764352264477840000"];
const SONG_LEN=[132.4,388.8],TOTAL=SONG_LEN[0]+SONG_LEN[1],IDLE=15;
const rnd=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),pick=l=>l[Math.floor(Math.random()*l.length)],hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const orig=M.renderForgeActors,VW={x:625,y:145,w:240,h:153},ESSE={x:762,y:243},KEG={x:795,y:272},ANVIL={x:651,y:246};
const mkCv=()=>{const c=document.createElement('canvas');c.width=160;c.height=150;return c;};
const FEET={x:80,y:130},SPLIT=104,FREE=['nod','bang','jump','spin','drink'];
// ---------- Zustand ----------
let T=0,last=0,hidden=false,loopBase=0,lastIdx=0,lastBeat=-1,evDone=0,flash=0,shake=0,randNext=0,ball=0,garland=0,fountain=0,fire=0,smoke=0,strobe=0,congaUntil=0,congaFrom=0,congaSpeed=.5,ref={t:0,pn:0,idx:0},tool=null,syncFix=0,trip=0,tripTarget=0,snap=null;
let DS={},P,news=null,title=null,EV=[];
function reset(){T=0;loopBase=0;lastIdx=0;lastBeat=-1;evDone=0;flash=0;shake=0;randNext=0;ball=0;garland=0;fountain=0;fire=0;smoke=0;strobe=0;congaUntil=0;congaFrom=0;news=null;title=null;trip=0;tripTarget=0;
 P={conf:[],vom:[],pud:[],spark:[],foam:[],smoke:[],txt:[],zzz:[],bottles:[]};
 DS={};EV=script();M.audioEngine?.smithSeek?.(0);}
// ---------- Figuren ----------
function dancer(id,o){return Object.assign({id,kind:'std',x:612,y:272,dir:1,tx:null,ty:null,spd:38,vis:false,mode:'idle',amp:1,hold:'',mt:0,bubble:null,seed:Math.random()*100,walking:false,roam:false,roamSpd:70,stay:0,wait:0,hammerOn:false,mush:false,cv:mkCv(),name:'',col:'#f2d58a'},o);}
function ensure(list){
 const base=list.find(a=>!a.apprentice)||list[0],helper=list.find(a=>a.apprentice);
 if(!DS.sm){DS.sm=dancer('sm',{kind:'std',base,x:base.x,y:base.y,vis:true,name:'Schmied',col:'#ffb35c'});
  DS.dr=dancer('dr',{kind:'doc',name:'Dr. Hirnhammer',col:'#e8e2cf'});
  DS.nu=dancer('nu',{kind:'nurse',name:'Schwester Valeria',col:'#ff9aa8'});
  DS.la=dancer('la',{kind:'std',lan:true,name:'Lanista',col:'#d9b8ff',x:612,y:268});}
 DS.sm.base=base;if(helper&&!DS.ap)DS.ap=dancer('ap',{kind:'std',base:helper,x:helper.x,y:helper.y,vis:false,name:'Lehrling',col:'#9fe0b0'});if(DS.ap&&helper)DS.ap.base=helper;
 if(!DS.la.base){let g=null;try{if(S.lanista&&M.ludus?.ownerFigure)g=M.ludus.ownerFigure(S.lanista);}catch{}if(!g){const rng=S.rng;g=M.makeGladiator(0);S.rng=rng;g.name='Lanista';}
  DS.la.base={id:'party-lan',g,lanista:true,team:0,a:Math.PI,phase:0,state:'idle',energy:100,ammo:0,moveSpeed:0,bloodMarks:{}};}}
// ---------- Takt ----------
function beatClock(dt){
 const now=performance.now(),c=M.audioEngine?.smithClock?.();
 if(c&&c.playing&&BEATS[c.idx]){
  if(c.idx!==ref.idx||Math.abs(c.time-ref.t)>.001){ref={t:c.time,pn:now,idx:c.idx};}
  if(c.idx===0&&lastIdx===1)loopBase++;lastIdx=c.idx;
  const time=ref.t+(now-ref.pn)/1000,g=BEATS[c.idx];let lo=0,hi=g.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(g[m]<=time)lo=m;else hi=m-1;}
  const nxt=g[lo+1]??g[lo]+.39,b=lo+clamp((time-g[lo])/Math.max(.2,nxt-g[lo]),0,1);
  const e=(ENV[c.idx].charCodeAt(clamp(Math.floor(time*4),0,ENV[c.idx].length-1))-48)/9;
  const musicT=loopBase*TOTAL+(c.idx?SONG_LEN[0]:0)+time,diff=musicT-T;
  if(Math.abs(diff)<=3)T+=clamp(diff*dt*2,-dt*.5,dt*3);else if(now-syncFix>3000){syncFix=now;M.audioEngine?.smithSeek?.(((T%TOTAL)+TOTAL)%TOTAL);}
  return {b:b+c.idx*1000,e:clamp(e,0,1),music:true};}
 return {b:T*156/60,e:.7+.3*Math.sin(T*.6),music:false};}
// ---------- Zeitplan ----------
const go=(d,x,y,s)=>{d.tx=x;d.ty=y;if(s)d.spd=s;d.vis=true;d.stay=T+8;};
const say=(d,text,dur)=>{d.bubble={text,t0:T,until:T+(dur||clamp(2.6+text.length*.045,3,6.5))};};
const mode=(d,m,amp=1,extra)=>{d.mode=m;d.amp=amp;d.mt=T;if(extra)Object.assign(d,extra);};
const tell=(text,dur=7.5)=>{news={text,t0:T,until:T+dur};};
const act=(text,sub)=>{title={text,sub,t0:T,until:T+5};};
const burst=n=>{for(let i=0;i<n;i++)confetti(rnd(VW.x,VW.x+VW.w),VW.y+rnd(0,12));};
const after=(dt,fn)=>EV.push({t:T+dt,fn,dyn:true});
function script(){
 const e=[],at=(t,fn)=>e.push({t,fn});
 const C={x:738,y:266},L={x:690,y:272},R={x:790,y:270},FR={x:742,y:284},BK={x:742,y:254};
 at(IDLE,()=>{act('FEIERABEND','Die Schmiede hat geschlossen. Innerlich schon lange.');const d=DS.sm;d.hold='bottle';go(d,C.x,C.y,32);mode(d,'nod',.4);say(d,'Feierabend.');});
 at(IDLE+7,()=>{const d=DS.sm;say(d,'Im Löschfass lag noch was. Schmeckt nach Eisen. Und Hoffnung.');mode(d,'drink',1);});
 at(IDLE+10,()=>tell('Die Flasche war eigentlich Löschwasser. Der Schmied merkt es nicht. Er merkt seit dem letzten Hammerunfall sowieso wenig.'));
 at(IDLE+14,()=>{const d=DS.sm;mode(d,'nod',.9);d.roam=true;d.roamSpd=55;});
 at(IDLE+24,()=>{const d=DS.sm;mode(d,'bang',.7);say(d,'Der Takt passt zum Hammer. Ich schlag jetzt einfach mit dem Kopf.');});
 at(IDLE+32,()=>{const d=DS.dr;d.x=612;d.y=274;go(d,704,274,40);mode(d,'idle',0);tell('Dr. Hirnhammer betritt die Schmiede. Er riecht nach Desinfektionsmittel, Schnaps und schlechten Entscheidungen.');});
 at(IDLE+41,()=>{const d=DS.dr;say(d,'Ich hab Betäubungsmittel mitgebracht. Alles für mich.');mode(d,'nod',.9,{hold:'mug'});d.roam=true;d.roamSpd=62;});
 at(IDLE+44,()=>{const d=DS.dr;d.mush=true;say(d,'Und Pilze! Frisch aus dem Medicus-Keller. Sind hinter den Patienten gewachsen.');tell('Dr. Hirnhammer bringt Pilze mit. Er sagt nicht, ob sie gewachsen sind oder gefunden wurden. Er sagt nur: „Beides.“');});
 at(IDLE+49,()=>{tripTarget=.4;const d=DS.sm;d.hammerOn=true;d.roam=true;d.roamSpd=78;for(const k in DS)if(DS[k].vis)popup(DS[k].x,DS[k].y-62,'NOM','#ffd1f0');say(d,'Der Hammer redet mit mir! Er sagt: LAUFEN!');tell('Die Pilze wirken. Die Wände atmen. Der Amboss lächelt. Der Schmied hört den Hammer sprechen und folgt ihm durch die ganze Schmiede.');});
 at(IDLE+51,()=>{tell('Der Doktor und der Schmied stoßen an. Der Schmied trifft die Flasche. Der Doktor trifft sein Auge.');say(DS.dr,'Auf die Patienten! Mögen sie ... äh ... liegen bleiben.');mode(DS.dr,'drink',1);after(3,()=>mode(DS.dr,'bang',.7));});
 at(IDLE+58,()=>{ball=1;tell('Von der Decke fährt eine Discokugel herab. Niemand weiß, woher. Der Doktor behauptet, er habe sie verschrieben.');});
 at(IDLE+66,()=>{const d=DS.nu;d.x=880;d.y=276;go(d,KEG.x-14,KEG.y+6,38);mode(d,'idle',0);say(d,'Dienstschluss! Die Patienten sind stabil. Also: liegen.');});
 at(IDLE+74,()=>{const d=DS.nu;mode(d,'jump',.9);d.roam=true;d.roamSpd=88;tell('Schwester Valeria hat das Medicus von außen abgeschlossen. Die Patienten haben Verständnis. Sie können nicht anders.');});
 at(IDLE+84,()=>{say(DS.nu,'Wer Schmerzen hat, soll tanzen! Medizinisch nicht belegt!');mode(DS.sm,'bang',1);mode(DS.dr,'bang',.9);go(DS.nu,L.x+30,L.y+8,36);});
 at(IDLE+94,()=>{tell('Der Schmied schüttelt den Kopf so heftig, dass zwei Rüstungen von der Wand fallen. Eine auf den Doktor. Er bemerkt es nicht.');shake=1;});
 at(IDLE+102,()=>{const d=DS.la;d.x=612;d.y=268;go(d,684,262,52);mode(d,'angry',1);});
 at(IDLE+106,()=>{say(DS.la,'WER ZAHLT DAS BIER?!',3.2);for(const k of ['sm','dr','nu'])DS[k].freeze=T+3.2;});
 at(IDLE+110,()=>{say(DS.nu,'Ich nicht. Ich bin Krankenschwester. Ich werde nie bezahlt.',3.6);});
 at(IDLE+114,()=>{const d=DS.la;say(d,'... Ich schreib es auf die Gladiatoren. Die sind eh bald tot.',4);d.hold='beer';});
 at(IDLE+93,()=>{const a=DS.sm,l=DS.la;a.roamSpd=108;tell('Der Schmied rennt mit dem Hammer durch die Schmiede. Keiner weiß, warum. Der Hammer vermutlich schon.');});
 at(IDLE+118,()=>{mode(DS.la,'nod',1);DS.la.roam=true;DS.la.roamSpd=70;burst(26);say(DS.la,'Ich verfolge den Schmied! Er schuldet mir ... irgendwas! Seit Jahren!');DS.la.roamSpd=100;});
 at(132,()=>{tripTarget=.7;act('AKT 2','Eskalation');burst(70);flash=1;for(const k of ['sm','dr','nu','la'])mode(DS[k],'bang',1);});
 at(140,()=>{const d=DS.dr;mode(d,'puke',1);after(3.4,()=>{say(d,'Das war der Meißel. Vom Frühstück.');mode(d,'bang',.8);});tell('Dr. Hirnhammer verabschiedet sich von seinem Mittagessen. Und von einem Zahn.');});
 at(153,()=>{const d=DS.nu;mode(d,'surf',1);go(d,684,266,0);after(.2,()=>go(d,790,266,10));mode(DS.la,'jump',1);mode(DS.sm,'jump',1);tell('Valeria testet, ob Gladiatoren als Hebebühne taugen. Ergebnis: ja. Bis sie jemand loslässt.');});
 at(163,()=>{const d=DS.nu;mode(d,'jump',1);go(d,780,276,30);say(d,'Autsch! Beckenbruch. Für mich ist das ein ganz normaler Dienstag.');shake=1;});
 at(172,()=>{const d=DS.sm;go(d,ANVIL.x+26,ANVIL.y+8,40);mode(d,'hammer',1);say(d,'Ich schmiede euch ein Geschenk! Ein Schwert! Oder einen Löffel. Oder beides!');tell('Der Schmied schmiedet betrunken. Ergebnis: ein Schwert mit dem Griff vorn. Der Lanista kauft es sofort.');});
 at(186,()=>{say(DS.la,'Ich nehme zwölf! Für die Neuen!');});
 at(192,()=>{act('KONGA','der Gefallenen');congaFrom=T;congaUntil=T+26;congaSpeed=.46;tell('Der Lanista startet die Konga der Gefallenen. Wer nicht tanzt, wird verkauft. Wer tanzt, auch.');for(const k of ['sm','dr','nu','la'])DS[k].mode='conga';});
 at(205,()=>{say(DS.la,'Wer hat gewonnen? Egal! Sind eh alle tot!');});
 at(212,()=>{for(const k in DS){DS[k].roam=true;DS[k].roamSpd=105;}tell('Alle rennen. Niemand weiß, wohin. Die Esse weicht aus.');});
 at(218,()=>{fire=1;shake=1;tell('Der Schmied entfacht die Esse. Zur Sicherheit. Zur Unterhaltung. Zur Brandstiftung.');for(const k of ['sm','dr','nu','la']){mode(DS[k],'bang',1.1);}go(DS.sm,C.x-20,C.y,40);go(DS.la,C.x+34,C.y+6,40);go(DS.nu,L.x+10,L.y+8,40);go(DS.dr,R.x-30,R.y,40);});
 at(230,()=>{const d=DS.dr;go(d,KEG.x-20,KEG.y+4,40);mode(d,'hammer',1);say(d,'Ich operiere das Fass. Es hat Druck auf dem Hirn.');});
 at(240,()=>{fountain=1;burst(40);const d=DS.dr;mode(d,'jump',1);tell('Dr. Hirnhammer operiert das Bierfass am offenen Spund. Das Fass überlebt nicht. Der Doktor schon. Meistens.');for(const k of ['sm','la','nu'])go(DS[k],KEG.x-34+(k==='la'?10:k==='nu'?24:0),KEG.y+(k==='nu'?10:2),44);after(3,()=>{for(const k of ['sm','la','nu'])mode(DS[k],'drink',1);});});
 at(252,()=>{const d=DS.nu;mode(d,'fire',1);go(d,ESSE.x-6,ESSE.y+28,40);say(d,'Wärme hilft! Das ist ein ärztlicher Rat!');});
 at(264,()=>{garland=1;tell('Dr. Hirnhammer hängt eine Girlande auf. Sie ist nicht aus Papier. Er sagt: „Nur geliehen."');mode(DS.dr,'bang',1);mode(DS.sm,'bang',1);mode(DS.la,'jump',1);mode(DS.nu,'bang',1.1);go(DS.nu,C.x,C.y+12,40);});
 at(276,()=>{smoke=1;say(DS.sm,'Ich glaub ... das war meine Leber ...');mode(DS.sm,'puke',1);after(3,()=>mode(DS.sm,'bang',1));});
 at(288,()=>{const d=DS.la;go(d,ANVIL.x+30,ANVIL.y+14,50);mode(d,'jump',1.2);say(d,'Ich liebe euch alle! Ihr kostet mich nichts mehr!');tell('Der Lanista steht auf dem Amboss und hält eine Rede. Niemand hört zu. Alle klatschen trotzdem.');});
 at(300,()=>{tripTarget=1;act('AKT 3','Apokalypse');strobe=1;flash=1;burst(100);shake=1.5;for(const k of ['sm','dr','nu','la'])mode(DS[k],'bang',1.3);go(DS.sm,C.x,C.y,40);go(DS.dr,C.x-40,C.y+10,40);go(DS.nu,C.x+36,C.y+8,40);go(DS.la,C.x+4,C.y-12,40);});
 at(312,()=>{const d=DS.sm;mode(d,'lie',1);after(20,()=>{mode(d,'up',1);after(.8,()=>{mode(d,'bang',1.1);say(d,'Wer hat das Licht ausgemacht? ... Ach. Ich war es.');});});tell('Der Schmied legt sich kurz hin. Neben die Esse. Er wird nie wieder aufstehen. (Er steht nach zwanzig Sekunden auf.)');});
 at(322,()=>{const d=DS.dr;go(d,DS.sm.x+14,DS.sm.y+4,40);mode(d,'hammer',1);say(d,'Schädel-Karaoke! Ich nenne es: Percussion!');});
 at(336,()=>{mode(DS.dr,'bang',1.1);tell('Der Lanista und Valeria tanzen Tango. Er führt. Sie führt eigentlich. Beide führen ins Verderben.');mode(DS.la,'spin',1);mode(DS.nu,'spin',1);go(DS.nu,DS.la.x+14,DS.la.y,40);});
 at(350,()=>{tell('Auf dem Dach landet eine Krähe. Sie hat Bier dabei. Sie will nur zuschauen.');});
 at(360,()=>{const d=DS.dr;mode(d,'lie',1);say(d,'Ich bin gerade operiert worden. Von mir.');say(DS.la,'Den verkaufen wir! Der ist gut genährt!');after(14,()=>{mode(d,'up',1);after(.8,()=>mode(d,'bang',1.2));});});
 at(376,()=>{const d=DS.nu;mode(d,'surf',1.2);go(d,C.x-60,C.y,0);after(.2,()=>go(d,C.x+80,C.y,13));tell('Valeria stürzt sich zum zweiten Mal in die Menge. Diesmal fangen sie auch.');});
 at(392,()=>{act('KONGA','die Zweite');congaFrom=T;congaUntil=T+30;congaSpeed=.62;burst(80);for(const k of ['sm','dr','nu','la'])DS[k].mode='conga';});
 at(410,()=>{say(DS.dr,'Ich hab hier einen Patienten! ... Ach. Das ist ein Hocker.');});
 at(424,()=>{mode(DS.sm,'hammer',1.2);go(DS.sm,ANVIL.x+26,ANVIL.y+8,45);say(DS.sm,'Das ist Kunst! Schlechte, aber Kunst!');for(const k of ['dr','nu','la'])mode(DS[k],'bang',1.3);fire=1;});
 at(438,()=>{tell('Die Esse speit Funken im Takt. Die Wände schwitzen. Das Fass hat Mitleid.');shake=1.5;});
 at(452,()=>{say(DS.la,'Ich entlasse euch alle! Nur damit ich euch gleich wieder einstellen kann!');mode(DS.la,'jump',1.3);});
 at(468,()=>{const d=DS.nu;mode(d,'fire',1);go(d,ESSE.x-6,ESSE.y+28,40);say(d,'Das war kein Feuer. Das war Entzündung. Behandelbar!');});
 at(484,()=>{tell('Niemand ist mehr nüchtern. Nicht einmal die Esse.');for(const k of ['sm','dr','nu','la'])mode(DS[k],pick(['bang','jump','spin']),1.4);});
 at(500,()=>{say(DS.sm,'Morgen arbeite ich wieder! Versprochen!');say(DS.dr,'Gelogen!',2.5);});
 at(521,()=>{act('VON VORN','Das Lied beginnt neu. Die Party auch.');tell('Das Lied beginnt von vorn. Die Party auch. Es gibt kein Ende. Es gibt nur Bier.');burst(90);flash=1;randNext=T+12;});
 return e.sort((a,b)=>a.t-b.t);}
// Zufallsereignisse nach dem Zeitplan: es hört nie auf, es wird nur schlimmer.
const R_SAY={sm:['Ich seh drei Ambosse. Welcher ist echt?','Mein Lehrling ist seit Tagen verschwunden. Die Esse ist so satt.','Ich hab dem Doktor mal ein Schwert verkauft. Er benutzt es als Löffel.','Kunden beschweren sich, die Schwerter seien krumm. Die sind nur ehrlich.'],dr:['Wer braucht schon ein Gehirn? Ich bin der lebende Beweis!','Ich operiere jetzt jeden, der still hält. Also: keinen.','Mein Meißel sagt, ich soll aufhören. Der Hammer sagt: weiter.','Heilung ist nur Zerstörung mit gutem Marketing.'],nu:['Die Patienten wollten mitkommen. Ich hab ihnen gesagt: Ihr seid tot.','Hab ich schon gesagt, dass ich nichts getrunken hab? Das war Desinfektionsmittel.','Ich bin Krankenschwester. Ich hab schon Schlimmeres getrunken.','Pflege ist, wenn man lächelt, während es blutet.'],la:['Ich verkaufe Plätze in der Arena! Billig! Ohne Überlebensgarantie!','Die Gladiatoren haben heute frei. Ewig frei.','Ich liebe diese Schmiede. Sie brennt so schön.','Wer ist eigentlich der Typ mit dem Hammer? Egal. Prost!']};
const R_NEWS=['Jemand hat den Amboss gewaschen. Es war Bier. Es wird schlimmer.','Im Löschfass schwimmt jetzt ein Schuh. Niemand weiß, wem er gehört. Der Schuh weiß es.','Die Schmiede hat nun vier Pfützen. Zwei sind Bier. Zwei sind Geschichte.','Draußen klopft die Stadtwache. Der Lanista reicht ein Bier hinaus. Die Wache klopft nicht mehr.','Der Doktor hat dem Hocker einen Namen gegeben. Der Hocker heißt jetzt Gerhard. Gerhard ist stabil.','Valeria hat die Verbandskiste geleert. Der Schmied trägt jetzt stolz eine Mumie als Hut.','Die Esse zählt die Flaschen. Sie ist beim dritten Mal durcheinandergekommen.'];
function randomEvent(){
 const ks=['sm','dr','nu','la'],k=pick(ks),d=DS[k],r=Math.random();
 if(r<.35){say(d,pick(R_SAY[k]));}
 else if(r<.6){tell(pick(R_NEWS));}
 else if(r<.78){mode(d,'puke',1);after(3.4,()=>mode(d,pick(['bang','jump','spin']),1.3));}
 else if(r<.9){mode(d,pick(['bang','jump','spin','drink']),1.4);go(d,rnd(660,830),rnd(258,288),44);}
 else{burst(60);flash=1;shake=1.3;for(const j of ks)mode(DS[j],pick(['bang','jump']),1.4);}
 if(Math.random()<.3){congaFrom=T;congaUntil=T+18;congaSpeed=rnd(.4,.7);for(const j of ks)DS[j].mode='conga';}}
function runEvents(){
 while(EV.length&&EV[0].t<=T){const ev=EV.shift();try{ev.fn();}catch(err){}}
 // Ereignisse mit Verzögerung (after) wurden hinten angehängt: sortieren, bevor sie fällig sind.
 if(EV.some((x,i)=>i&&x.t<EV[i-1].t))EV.sort((a,b)=>a.t-b.t);
 if(T>=randNext&&T>560){randomEvent();randNext=T+rnd(11,19);}}
// ---------- Teilchen ----------
function confetti(x,y){if(P.conf.length<220)P.conf.push({x,y,vx:rnd(-6,6),vy:rnd(18,40),ph:rnd(0,6),col:pick(['#ff4d6d','#ffd23f','#4dd2ff','#7dff6b','#d77bff','#ffffff','#ff9f1c']),w:Math.random()<.5?2:1});}
function spew(x,y,f,k){P.vom.push({x,y,z:rnd(26,32),vx:f*rnd(20,50)+rnd(-4,4),vy:rnd(-5,5),vz:rnd(6,26),col:pick(['#8fae3a','#c9b44a','#7a9a2a','#a64a2c','#b5a23c'])});}
function sparksAt(x,y,n,up=1){for(let i=0;i<n;i++)P.spark.push({x,y,z:rnd(0,6),vx:rnd(-26,26),vy:rnd(-8,8),vz:rnd(30,90)*up,life:rnd(.5,1.1),col:pick(['#ffd899','#e99a46','#fff2b8','#ff7a2e']),g:150});}
function flame(x,y){P.spark.push({x,y,z:rnd(0,4),vx:rnd(-5,5),vy:rnd(-3,3),vz:rnd(55,100),life:rnd(.5,.95),col:pick(['#ffe27a','#ff9a2e','#ff5a1f','#ffd23f']),g:-12,flame:true});}
function popup(x,y,text,col){P.txt.push({x,y,t0:T,text,col:col||'#fff'});}
function stepParticles(dt){
 const land=(p,col)=>{if(P.pud.length>90)P.pud.shift();P.pud.push({x:p.x,y:p.y+rnd(-1,1),r:rnd(2.5,6),col,t:T});};
 for(const p of P.vom){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vz-=170*dt;p.z+=p.vz*dt;if(p.z<=0){p.dead=true;land(p,p.col);}}P.vom=P.vom.filter(p=>!p.dead);
 for(const p of P.foam){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vz-=140*dt;p.z+=p.vz*dt;p.life-=dt;if(p.z<=0||p.life<=0){p.dead=true;if(Math.random()<.18)land(p,'#d9a441');}}P.foam=P.foam.filter(p=>!p.dead);
 for(const p of P.spark){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vz-=p.g*dt;p.z=Math.max(0,p.z+p.vz*dt);p.life-=dt;}P.spark=P.spark.filter(p=>p.life>0);
 for(const p of P.conf){p.ph+=dt*4;p.x+=(p.vx+Math.sin(p.ph)*10)*dt;p.y+=p.vy*dt;}P.conf=P.conf.filter(p=>p.y<VW.y+VW.h-2);
 for(const p of P.smoke){p.x+=p.vx*dt;p.y-=p.vy*dt;p.r+=dt*3;p.a-=dt*.05;}P.smoke=P.smoke.filter(p=>p.a>0&&p.y>VW.y);
 for(const p of P.zzz){p.y-=dt*8;p.x+=Math.sin(T*3+p.ph)*dt*3;}P.zzz=P.zzz.filter(p=>T-p.t0<2.2);
 P.txt=P.txt.filter(p=>T-p.t0<1.4);}
// ---------- Bewegung und Pose ----------
function walkTo(d,dt){
 if(d.tx==null){d.walking=false;return;}
 const dx=d.tx-d.x,dy=d.ty-d.y,dist=Math.hypot(dx,dy);
 if(dist<1||d.spd<=0){d.x=d.tx;d.y=d.ty;d.tx=null;d.walking=false;return;}
 const st=Math.min(dist,d.spd*dt);d.x+=dx/dist*st;d.y+=dy/dist*st;if(Math.abs(dx)>.6)d.dir=dx>0?1:-1;d.walking=true;}
function congaPath(u){const a=u*Math.PI*2;return {x:745+Math.cos(a)*82,y:269+Math.sin(a)*14};}
function headPos(d,f){return {x:d.x+f*14,y:d.y};}
function pose(d,b,en){
 const f=d.dir,a=d.amp*(.55+.45*en),s=Math.sin(Math.PI*b),c=Math.cos(Math.PI*b),ab=Math.abs(s),half=Math.floor(b/2)%2===1;
 const o={dx:0,dy:0,rot:0,top:0,sx:1,sy:1,pose:'stand',fp:'',walk:false,ph:0,dir:f,hold:d.hold,mouth:false};
 const drunk=clamp((T-IDLE-20)/240,0,1);if(!['lie','surf','up'].includes(d.mode)){o.rot+=Math.sin(T*1.3+d.seed)*.045*drunk;o.dx+=Math.sin(T*.9+d.seed)*1.1*drunk;}
 if(d.freeze&&T<d.freeze){o.top=f*.04*Math.sin(T*18);return o;}
 const up=d.kind==='nurse'?'wave':d.kind==='doc'?'flail':'';
 switch(d.mode){
  case 'nod':o.top=f*.12*a*(c+1)/2;o.dy=-10*a*ab;break;
  case 'bang':o.top=f*a*.52*((c+1)/2-.22);o.dy=-14*a*ab;if(up)o.pose=half?up:'stand';else o.fp=half?'throw':'';break;
  case 'jump':o.dy=-24*a*ab;if(up)o.pose=up;else o.fp='throw';break;
  case 'spin':o.dir=Math.sin(Math.PI*b*2)>0?1:-1;o.dy=-13*a*ab;if(up)o.pose=up;break;
  case 'drink':o.fp='drink';o.top=-f*.22;o.dy=-7*a*ab;o.mouth=true;break;
  case 'puke':{const k=T-d.mt;o.top=f*(k<3.2?.95+.06*Math.sin(T*26):.2);o.dy=1;break;}
  case 'lie':{const k=clamp((T-d.mt)/.5,0,1);o.rot=f*1.5*k;o.dy=2*k;o.dx=f*-8*k;o.top=0;o.fp='';break;}
  case 'up':{const k=1-clamp((T-d.mt)/.7,0,1);o.rot=f*1.5*k;o.dy=2*k;o.dx=f*-8*k;break;}
  case 'surf':{const k=clamp((T-d.mt)/.4,0,1);o.rot=f*1.5*k;o.dy=-30*k+Math.sin(T*3)*1.5;o.dx=0;if(up)o.pose=up;break;}
  case 'hammer':{o.walk=false;if(d.kind==='std'){const k=((b/2)%1)*1.2;o.hammer={wind:k<.7?.7-k:0,swing:k>=.7?1.2-k:0,k};}else{o.pose='hammer';}o.top=f*.1*Math.sin(Math.PI*b);o.dy=-.5*ab;break;}
  case 'fire':{o.top=-f*.1;o.walk=false;if(up)o.pose=up;o.fireMouth=true;o.dy=-1*ab;break;}
  case 'angry':o.top=f*.05*Math.sin(T*20);o.fp='shake';o.dy=-.6*ab;break;
  case 'conga':o.walk=true;o.ph=b*Math.PI*.8;o.dy=-1.6*ab;o.top=f*.12*c;if(up)o.pose=half?up:'stand';break;
  default:break;}
 if(FREE.includes(d.mode)){
  // Landung auf dem Schlag: stauchen, in der Luft strecken
  const sq=clamp(1-ab*6,0,1);o.sy*=1-.14*sq+.07*(1-sq)*ab;o.sx*=1+.1*sq;
  if(d.walking){o.dy-=9*ab;o.top+=f*.16;if(up)o.pose=up;else if(!o.fp)o.fp='throw';}
  if(d.hammerOn&&d.kind==='std'){const k=((b/2)%1)*1.2;o.hammer={wind:k<.7?.7-k:0,swing:k>=.7?1.2-k:0,k};o.fp='';}}
 return o;}
// ---------- Zeichnen ----------
function mushroom(q,x,y){q.fillStyle='#f1e8d0';q.fillRect(x-1,y-3,3,6);q.fillStyle='#d63a3a';q.fillRect(x-3,y-6,7,4);q.fillRect(x-2,y-7,5,1);q.fillStyle='#fff';q.fillRect(x-2,y-6,1,1);q.fillRect(x+1,y-5,1,1);q.fillRect(x+3,y-4,1,1);}
function mug(q,x,y,col){q.fillStyle='#3a2a1a';q.fillRect(x-3,y-3,6,7);q.fillStyle=col||'#d9a441';q.fillRect(x-2,y-2,4,5);q.fillStyle='#fff';q.fillRect(x-3,y-4,6,2);q.fillStyle='#3a2a1a';q.fillRect(x+3,y-1,2,3);}
function render(d,o,T,ctx){
 const q=d.cv.getContext('2d');q.imageSmoothingEnabled=false;q.clearRect(0,0,160,150);
 const dir=o.dir;
 if(d.kind==='std'){
  const src=d.base,fig={...src,x:FEET.x,y:FEET.y,a:dir>0?0:Math.PI,state:o.walk||d.walking?'move':'idle',moveSpeed:o.walk||d.walking?34:0,phase:(d.walking?T*9:o.ph)+d.seed*.1,forgePose:o.fp,forgeHold:d.hold,forgeTask:'',wind:0,swing:0,wipeTimer:0,hurt:0,workBeat:0};
  if(o.hammer){fig.technique='overhead';fig.windMax=.7;fig.wind=o.hammer.wind;fig.swingKind='overhead';fig.swingMax=.5;fig.swing=o.hammer.swing;if(src.g?.enemyGear)src.g.enemyGear.secondary=src.hammer||null;}
  else if(src.g?.enemyGear&&!src.lanista)src.g.enemyGear.secondary=null;
  orig(q,[fig]);
 }else if(d.kind==='nurse'){
  window.DOK?.drawNurseSmall(q,{x:FEET.x,y:FEET.y,t:T,walk:o.walk||d.walking,phase:d.walking?T*8:o.ph,dir,pose:o.pose});
  if(d.hold){const raised=o.pose==='wave';mug(q,FEET.x+dir*(raised?10:9),FEET.y-(raised?58:30),'#e8c25a');}
 }else{
  window.DOK?.drawDocSmall(q,{x:FEET.x,y:FEET.y,t:T,walk:o.walk||d.walking,phase:d.walking?T*8:o.ph,dir,pose:o.pose});
  if(d.hold){const raised=o.pose==='flail';mug(q,FEET.x+dir*(raised?15:10),FEET.y-(raised?62:30),'#d9a441');}
  if(d.mush)mushroom(q,FEET.x-dir*(o.pose==='flail'?15:9),FEET.y-(o.pose==='flail'?62:30));
 }
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(d.x+o.dx),Math.round(d.y+o.dy));ctx.rotate(o.rot);ctx.scale(o.sx,o.sy);
 ctx.drawImage(d.cv,0,SPLIT,160,150-SPLIT,-FEET.x,SPLIT-FEET.y,160,150-SPLIT);
 ctx.save();ctx.translate(0,SPLIT-FEET.y);ctx.rotate(o.top);ctx.drawImage(d.cv,0,0,160,SPLIT+1,-FEET.x,-SPLIT,160,SPLIT+1);ctx.restore();
 ctx.restore();}
function wrapText(ctx,text,maxW){const words=text.split(' '),lines=[];let cur='';for(const w of words){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>maxW&&cur){lines.push(cur);cur=w;}else cur=t;}if(cur)lines.push(cur);return lines;}
function bubble(ctx,d,o){
 const bu=d.bubble;if(!bu||T>bu.until)return;
 ctx.save();ctx.font='bold 5.4px "Trebuchet MS",Verdana,sans-serif';ctx.textBaseline='top';
 const lines=wrapText(ctx,bu.text,96),w=Math.min(104,Math.max(...lines.map(l=>ctx.measureText(l).width))+8),h=lines.length*7+10,hx=d.x+o.dx,hy=d.y-70+o.dy;
 const bx=clamp(hx-w/2,VW.x+3,VW.x+VW.w-w-3),by=Math.max(VW.y+2,hy-h-3),a=clamp(Math.min((T-bu.t0)*6,(bu.until-T)*4),0,1);
 ctx.globalAlpha=a;ctx.fillStyle='#fffdf2';ctx.strokeStyle='#241a14';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(bx,by,w,h,2);ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.moveTo(clamp(hx-2,bx+4,bx+w-8),by+h);ctx.lineTo(hx,by+h+4);ctx.lineTo(clamp(hx+3,bx+8,bx+w-4),by+h);ctx.closePath();ctx.fillStyle='#fffdf2';ctx.fill();
 ctx.fillStyle=d.col;ctx.fillRect(bx+1,by+1,w-2,1.5);ctx.fillStyle='#241a14';lines.forEach((l,i)=>ctx.fillText(l,bx+4,by+4.5+i*7));ctx.restore();}
function drawNews(ctx){
 if(!news||T>news.until)return;const a=clamp(Math.min((T-news.t0)*4,(news.until-T)*3),0,1);
 ctx.save();ctx.globalAlpha=a;ctx.font='italic bold 5.2px Georgia,serif';ctx.textBaseline='top';const lines=wrapText(ctx,news.text,218),h=lines.length*7+5;
 ctx.fillStyle='rgba(0,0,0,.78)';ctx.fillRect(VW.x,VW.y+VW.h-h,VW.w,h);ctx.fillStyle='#ffe9a8';ctx.textAlign='center';lines.forEach((l,i)=>ctx.fillText(l,VW.x+VW.w/2,VW.y+VW.h-h+3+i*7));ctx.restore();}
function drawTitle(ctx,b){
 if(!title||T>title.until)return;const k=T-title.t0,a=clamp(Math.min(k*3,(title.until-T)*2),0,1),pulse=1+.08*Math.sin(Math.PI*b);
 ctx.save();ctx.globalAlpha=a;ctx.translate(VW.x+VW.w/2,VW.y+40);ctx.scale(pulse,pulse);ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font='bold 17px Impact,"Arial Black",sans-serif';ctx.lineWidth=3;ctx.strokeStyle='#1a0a2a';ctx.strokeText(title.text,0,0);ctx.fillStyle=`hsl(${(T*140)%360},100%,62%)`;ctx.fillText(title.text,0,0);
 if(title.sub){ctx.font='bold 6px Verdana,sans-serif';ctx.lineWidth=2;ctx.strokeText(title.sub,0,12);ctx.fillStyle='#fff';ctx.fillText(title.sub,0,12);}ctx.restore();}
function lights(ctx,b,en){
 const lv=clamp((T-IDLE)/90,0,1)*.55+clamp((T-132)/200,0,.3);
 const dark=clamp((T-IDLE-4)*.012,0,.52)+(strobe?.08:0);
 ctx.save();ctx.fillStyle=`rgba(10,0,28,${dark})`;ctx.fillRect(VW.x,VW.y,VW.w,VW.h);
 ctx.globalCompositeOperation='lighter';
 // Esse glimmt weiter
 const g=ctx.createRadialGradient(ESSE.x,ESSE.y,2,ESSE.x,ESSE.y,50);g.addColorStop(0,'rgba(255,140,40,.32)');g.addColorStop(1,'rgba(255,140,40,0)');ctx.fillStyle=g;ctx.fillRect(ESSE.x-50,ESSE.y-50,100,100);
 const pulse=Math.pow(1-(b%1),2),n=2+Math.floor(lv*4);
 for(let k=0;k<n;k++){const hue=(T*40+k*70)%360,ox=VW.x+30+k*(VW.w-60)/Math.max(1,n-1),ang=Math.sin(T*(.7+k*.13)+k*1.7)*(.5+.3*lv),len=150;
  ctx.fillStyle=`hsla(${hue},100%,60%,${(.05+.12*pulse*(.4+en))*lv*(strobe?1.6:1)})`;ctx.beginPath();ctx.moveTo(ox-2,VW.y);ctx.lineTo(ox+2,VW.y);ctx.lineTo(ox+Math.tan(ang)*len+26,VW.y+len);ctx.lineTo(ox+Math.tan(ang)*len-26,VW.y+len);ctx.closePath();ctx.fill();}
 ctx.restore();
 if(ball>0){ball=Math.min(1,ball+.01);const by=VW.y+8+ball*10,bx=VW.x+VW.w/2+12;ctx.save();ctx.strokeStyle='#777';ctx.beginPath();ctx.moveTo(bx,VW.y);ctx.lineTo(bx,by-6);ctx.stroke();
  ctx.fillStyle='#aab0bd';ctx.beginPath();ctx.arc(bx,by,6,0,7);ctx.fill();ctx.fillStyle='#e8ecf6';for(let i=0;i<8;i++){const a=T*2+i*.8,x=Math.cos(a)*5;if(Math.cos(a+1.5)>-.2)ctx.fillRect(bx+x-1,by+Math.sin(i*2.1)*4,2,2);}
  ctx.globalCompositeOperation='lighter';for(let i=0;i<14;i++){const a=T*.8+i*.45,x=VW.x+VW.w/2+Math.cos(a*1.3+i)*(40+i*6),y=VW.y+60+Math.sin(a+i*2)*60+i*3;ctx.fillStyle=`hsla(${(i*47+T*60)%360},100%,70%,${.35+.4*pulse})`;ctx.fillRect(x,y,3,3);}ctx.restore();}}
function floorStuff(ctx,b){
 ctx.save();
 for(const p of P.pud){const age=T-p.t,a=clamp(.78-age*.001,.3,.78);ctx.globalAlpha=a;ctx.fillStyle=p.col;ctx.beginPath();ctx.ellipse(p.x,p.y,p.r,p.r*.38,0,0,7);ctx.fill();ctx.globalAlpha=a*.5;ctx.fillStyle='#fff';ctx.fillRect(p.x-p.r*.4,p.y-1,Math.max(1,p.r*.5),1);}
 ctx.globalAlpha=1;
 // leere Flaschen und Krüge: ihre Zahl wächst mit der Zeit
 const nb=Math.min(70,Math.floor(Math.max(0,T-IDLE-10)/6));
 for(let i=0;i<nb;i++){const x=VW.x+12+hash(i*3.7)*(VW.w-24),y=FLOOR_Y(hash(i*9.1)),ang=hash(i*5.3)*3,col=['#4f7a52','#7a5a32','#d9a441'][i%3];ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.fillStyle=col;ctx.fillRect(-1,-4,3,6);ctx.fillRect(0,-7,1,3);ctx.restore();}
 // Fass
 if(T>=IDLE+62){const x=KEG.x,y=KEG.y;ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(x,y+1,11,3,0,0,7);ctx.fill();ctx.fillStyle='#6e4a2c';ctx.fillRect(x-8,y-18,16,18);ctx.fillStyle='#8a6038';ctx.fillRect(x-8,y-18,3,18);ctx.fillStyle='#2e2a28';ctx.fillRect(x-8,y-14,16,2);ctx.fillRect(x-8,y-5,16,2);ctx.fillStyle='#c9ccd0';ctx.fillRect(x-10,y-10,3,2);ctx.fillStyle='#d9a441';ctx.fillRect(x-4,y-12,5,3);}
 // Därme-Girlande
 if(garland){ctx.strokeStyle='#d98a8a';ctx.lineWidth=2.5;ctx.beginPath();for(let i=0;i<=24;i++){const u=i/24,x=VW.x+3+u*(VW.w-6),y=VW.y+22+Math.sin(u*Math.PI)*16+Math.sin(u*40+T*3)*.8;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.stroke();ctx.strokeStyle='#a85c5c';ctx.lineWidth=.6;ctx.stroke();ctx.fillStyle='#c9b36a';for(let i=1;i<6;i++){const u=i/6;ctx.fillRect(VW.x+u*VW.w-1.5,VW.y+22+Math.sin(u*Math.PI)*16+1,3,5);}}
 ctx.restore();}
function FLOOR_Y(r){return 256+r*36;}
function drawParticles(ctx){
 for(const p of P.foam){ctx.fillStyle=p.col||'#f4e2a0';ctx.fillRect(Math.round(p.x),Math.round(p.y-p.z),2,2);}
 for(const p of P.vom){ctx.fillStyle=p.col;ctx.fillRect(Math.round(p.x),Math.round(p.y-p.z),2,2);}
 for(const p of P.spark){ctx.globalAlpha=clamp(p.life*1.5,0,1);ctx.fillStyle=p.col;const s=p.flame?clamp(p.life*4,1,4):1.5;ctx.fillRect(Math.round(p.x),Math.round(p.y-p.z),s,s);}ctx.globalAlpha=1;
 for(const p of P.conf){ctx.fillStyle=p.col;ctx.fillRect(Math.round(p.x),Math.round(p.y),p.w,p.w+1);}
 for(const p of P.smoke){ctx.globalAlpha=p.a;ctx.fillStyle='#8a8aa0';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill();}ctx.globalAlpha=1;
 ctx.save();ctx.font='bold 6px Verdana,sans-serif';ctx.textAlign='center';for(const p of P.zzz){ctx.globalAlpha=1-(T-p.t0)/2.2;ctx.fillStyle='#cfe4ff';ctx.fillText('Z',p.x,p.y);}
 for(const p of P.txt){ctx.globalAlpha=1-(T-p.t0)/1.4;ctx.font='bold 7px Impact,sans-serif';ctx.lineWidth=2;ctx.strokeStyle='#201020';ctx.strokeText(p.text,p.x,p.y-(T-p.t0)*10);ctx.fillStyle=p.col;ctx.fillText(p.text,p.x,p.y-(T-p.t0)*10);}ctx.restore();}
function tripFx(ctx,b,en){
 const k=trip*(.78+.22*Math.sin(T*.35));if(k<.03)return;
 const cv=ctx.canvas;if(!snap||snap.width!==cv.width||snap.height!==cv.height){snap=document.createElement('canvas');snap.width=cv.width;snap.height=cv.height;}
 const sq=snap.getContext('2d');sq.setTransform(1,0,0,1,0,0);sq.clearRect(0,0,snap.width,snap.height);sq.drawImage(cv,0,0);
 const w=cv.width,h=cv.height,fx=Math.sin(T*1.7)*k*w*.012,fy=Math.cos(T*1.3)*k*h*.012,pulse=1+Math.sin(T*.9)*.025*k+Math.pow(1-(b%1),3)*.015*k;
 ctx.save();ctx.setTransform(1,0,0,1,0,0);
 const filt='filter' in ctx;
 for(const [ox,oy,al,hue] of [[fx,fy,.28,60],[-fx*1.2,-fy*.7,.22,-70],[fy*.8,-fx*.6,.14,150]]){
  ctx.globalAlpha=al*Math.min(1,k*1.4);if(filt)ctx.filter='blur('+(k*2.4).toFixed(1)+'px) hue-rotate('+((T*50+hue)%360).toFixed(0)+'deg) saturate('+(1+k).toFixed(2)+')';
  ctx.translate(w/2,h/2);ctx.scale(pulse,pulse);ctx.drawImage(snap,-w/2+ox,-h/2+oy);ctx.setTransform(1,0,0,1,0,0);}
 if(filt)ctx.filter='none';
 // Farbwäsche, die langsam durch den Regenbogen wandert
 ctx.globalAlpha=.16*k;ctx.globalCompositeOperation='soft-light';ctx.fillStyle='hsl('+((T*35)%360)+',100%,55%)';ctx.fillRect(0,0,w,h);
 ctx.restore();}
// ---------- Leiste zum Ausprobieren ----------
function toolbar(on){
 if(!on){tool?.remove();tool=null;return;}
 if(!tool||!tool.isConnected){tool?.remove();tool=document.createElement('div');tool.id='partyTool';
  tool.style.cssText='position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:60;display:flex;gap:6px;align-items:center;background:rgba(15,8,28,.88);border:1px solid #6b4a9a;border-radius:8px;padding:5px 8px;font:12px Verdana,sans-serif;color:#f2e6ff;box-shadow:0 2px 10px #000a';
  tool.innerHTML='<span>🎉 Party <b id="partyClock">0:00</b></span><button data-p="30">+30 s</button><button data-p="120">+2 min</button><button data-p="reset">Neustart</button>';
  for(const b of tool.querySelectorAll('button')){b.style.cssText='background:#3b2760;color:#fff;border:1px solid #8a63c9;border-radius:5px;padding:3px 7px;font:inherit;cursor:pointer';b.onclick=e=>{e.stopPropagation();const v=b.dataset.p;if(v==='reset')reset();else jump(T+ +v);};}
  document.body.appendChild(tool);}
 const c=tool.querySelector('#partyClock');if(c)c.textContent=Math.floor(T/60)+':'+String(Math.floor(T%60)).padStart(2,'0');}
function jump(t){
 t=Math.max(0,t);if(t<T){reset();}
 try{ensure(M.forgeVisuals.workers());}catch{}
 // Zwischenereignisse in Reihenfolge ausführen, damit alle Gäste da sind und der Stand stimmt.
 while(EV.length&&EV[0].t<=t){const ev=EV.shift();T=ev.t;try{ev.fn();}catch{}if(EV.length>1&&EV.some((x,i)=>i&&x.t<EV[i-1].t))EV.sort((a,b)=>a.t-b.t);}
 trip=tripTarget;T=t;loopBase=Math.floor(t/TOTAL);for(const d of Object.values(DS)){d.tx=null;d.walking=false;}M.audioEngine?.smithSeek?.(t%TOTAL);
 for(const k in DS){const d=DS[k];if(!d.vis)continue;}
 // Gäste, die schon da sein müssten, an ihren Platz setzen
 const place={dr:[704,274,IDLE+32],nu:[KEG.x-14,KEG.y+6,IDLE+66],la:[684,262,IDLE+102]};for(const k in place){if(t>place[k][2]+6&&DS[k]){DS[k].x=place[k][0]+rnd(-30,30);DS[k].y=place[k][1]+rnd(-6,10);DS[k].vis=true;}}
 if(DS.sm&&t>IDLE+6){DS.sm.x=738;DS.sm.y=266;}
 for(let i=0;i<Math.min(60,t/6);i++)confetti(rnd(VW.x,VW.x+VW.w),rnd(VW.y,VW.y+VW.h));
 for(let i=0;i<Math.min(60,Math.max(0,t-140)/5);i++)P.pud.push({x:rnd(VW.x+10,VW.x+VW.w-10),y:rnd(256,290),r:rnd(2.5,6),col:pick(['#8fae3a','#c9b44a','#7a9a2a','#a64a2c','#d9a441']),t:T});}
// ---------- Einbindung ----------
function active(ctx){return ctx?.canvas?.id==='smithScene'&&M.ui?.getPage?.()==='forge'&&F.master&&!M.forgeVisuals.scene&&!M.forgeIntro?.scene&&!S.battle&&!document.querySelector?.('.smith-ceremony');}
document.addEventListener('visibilitychange',()=>{if(document.hidden)hidden=true;});
setInterval(()=>{if(tool&&M.ui?.getPage?.()!=='forge')toolbar(false);},400);
M.renderForgeActors=(ctx,list)=>{
 if(!active(ctx)){if(ctx?.canvas?.id==='smithScene')toolbar(false);return orig(ctx,list);}
 const now=performance.now(),dt=last?Math.min(.1,(now-last)/1000):0;
 if(!last||(now-last>1200&&!hidden)||!P)reset();
 hidden=false;last=now;T+=dt;
 const bc=beatClock(dt),b=bc.b,en=bc.e;toolbar(true);
 if(T<IDLE){return orig(ctx,list);}
 ensure(list);runEvents();
 const dancers=Object.values(DS).filter(d=>d.vis);
 // Gäste und Schmied bewegen sich; Konga überschreibt die Wege.
 const conga=T<congaUntil;
 const order=['la','nu','sm','dr','ap'].map(k=>DS[k]).filter(d=>d&&d.vis);
 order.forEach((d,i)=>{if(conga&&d.mode==='conga'){const u=(T-congaFrom)*congaSpeed-i*.075,p=congaPath(u),q2=congaPath(u+.01);d.dir=q2.x>=p.x?1:-1;d.x=p.x;d.y=p.y;d.tx=null;d.walking=true;}else{if(d.mode==='conga'&&!conga){d.mode='bang';d.amp=1.2;d.mt=T;}if(d.roam&&d.tx==null&&T>=d.stay&&T>=d.wait&&FREE.includes(d.mode)&&!(d.freeze&&T<d.freeze)){d.tx=rnd(650,845);d.ty=rnd(256,290);d.spd=d.roamSpd*rnd(.8,1.2);d.wait=T+Math.hypot(d.tx-d.x,d.ty-d.y)/d.spd+rnd(.3,1.6);}
  walkTo(d,dt);}});
 if(DS.ap&&!DS.ap.vis&&T>IDLE+84){DS.ap.vis=true;DS.ap.mode='bang';}
 // Beat-Ereignisse
 const bi=Math.floor(b);if(bi!==lastBeat){lastBeat=bi;if(bc.music||true){flash=Math.max(flash,en>.65?.55:.25);if(fire&&en>.55)for(const x of [VW.x+10,VW.x+VW.w-10])for(let i=0;i<8;i++)flame(x+rnd(-3,3),VW.y+VW.h-6);
  if(fire&&en>.6)sparksAt(ESSE.x+rnd(-8,8),ESSE.y+14,10);
  if(T>132&&en>.6&&Math.random()<.5)for(let i=0;i<10;i++)confetti(rnd(VW.x,VW.x+VW.w),VW.y+rnd(0,8));}}
 trip+=(tripTarget-trip)*Math.min(1,dt*.22);
 if(trip>.06&&Math.random()<dt*trip*40)P.spark.push({x:rnd(VW.x,VW.x+VW.w),y:rnd(250,292),z:rnd(0,30),vx:rnd(-6,6),vy:0,vz:rnd(8,22),life:rnd(1.4,2.6),col:pick(['#ff7ad9','#7affd9','#d9ff7a','#9a7aff','#ffb347']),g:-3});
 const pc=T-IDLE;if(T>132)for(let i=0;i<Math.min(60,3+(T-132)*.12)*dt+Math.random();i++)if(Math.random()<.5)confetti(rnd(VW.x,VW.x+VW.w),VW.y+rnd(0,6));
 if(fountain&&Math.random()<.9)for(let i=0;i<3;i++)P.foam.push({x:KEG.x-2,y:KEG.y-4,z:16,vx:rnd(-16,16),vy:rnd(-6,6),vz:rnd(40,95),life:1.4,col:pick(['#f4e2a0','#e8c25a','#ffffff'])});
 if(smoke&&Math.random()<.35)P.smoke.push({x:rnd(VW.x,VW.x+VW.w),y:VW.y+VW.h-6,vx:rnd(-4,4),vy:rnd(3,8),r:rnd(5,10),a:.16});
 for(const d of order){
  const o=pose(d,b,en);d._o=o;
  const hp=headPos(d,o.dir);
  if(d.mode==='puke'&&T-d.mt<3.2&&Math.random()<dt*40*(1+(T-d.mt)))spew(hp.x,d.y,d.dir,0);
  if(o.fireMouth&&en>.35&&Math.random()<.85)P.spark.push({x:d.x+o.dir*12,y:d.y,z:rnd(24,28),vx:o.dir*rnd(40,80),vy:rnd(-5,5),vz:rnd(0,12),life:rnd(.35,.7),col:pick(['#ffe27a','#ff9a2e','#ff5a1f']),g:-18,flame:true});
  if(d.mode==='lie'&&T-d.mt>.6&&Math.random()<dt*.9)P.zzz.push({x:d.x+o.dir*-10,y:d.y-22,t0:T,ph:Math.random()*6});
  if(o.hammer&&o.hammer.k>.7&&o.hammer.k<.82&&!d._hit){d._hit=true;const ax=d.x+o.dir*16;sparksAt(ax,d.y,9);if(DS.sm&&DS.sm.mode==='lie'&&d.id==='dr')popup(DS.sm.x,DS.sm.y-34,'BONK!','#ffe36b');}
  if(!o.hammer||o.hammer.k<.6)d._hit=false;
  if(d.mode==='hammer'&&d.kind==='doc'){const k=Math.sin(T*10)>.95;if(k&&!d._dh){d._dh=true;sparksAt(d.x+o.dir*10,d.y,5);if(DS.sm&&DS.sm.mode==='lie')popup(DS.sm.x,DS.sm.y-34,'BONK!','#ffe36b');}else if(!k)d._dh=false;}}
 // Zeichnen
 ctx.save();
 lights(ctx,b,en);floorStuff(ctx,b);
 const sx=shake>0?(Math.random()-.5)*2.2*shake*Math.pow(1-(b%1),2):0,sy=shake>0?(Math.random()-.5)*1.6*shake*Math.pow(1-(b%1),2):0;
 shake=Math.max(0,shake-dt*.6);ctx.translate(sx,sy);
 const sorted=order.slice().sort((x,y)=>(x.mode==='surf'?999:x.y)-(y.mode==='surf'?999:y.y));
 for(const d of sorted)render(d,d._o,T,ctx);
 drawParticles(ctx);
 ctx.translate(-sx,-sy);tripFx(ctx,b,en);ctx.translate(sx,sy);
 for(const d of sorted)bubble(ctx,d,d._o);
 ctx.translate(-sx,-sy);
 if(flash>0){ctx.fillStyle=`rgba(255,255,255,${flash*.1})`;ctx.fillRect(VW.x,VW.y,VW.w,VW.h);flash=Math.max(0,flash-dt*3);}
 if(strobe&&Math.floor(T*14)%2===0){ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(VW.x,VW.y,VW.w,VW.h);}
 drawTitle(ctx,b);drawNews(ctx);ctx.restore();
 stepParticles(dt);
 M.forgePartyT=T;};
M.forgeParty={jump:t=>{jump(t);},reset,get t(){return T;},get trip(){return trip;},debug:()=>Object.fromEntries(Object.entries(DS).map(([k,d])=>[k,{x:Math.round(d.x),y:Math.round(d.y),mode:d.mode,walking:d.walking,dy:d._o?+d._o.dy.toFixed(1):0,roam:d.roam}]))};
})();
