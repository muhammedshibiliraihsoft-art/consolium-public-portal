export const CYCLE = 8;
// Shared timing for production GSAP and standalone WAAPI preview.
export function motionTracks(root) {
  const tracks = [];
  const add = (selector, make) => Array.from(root.querySelectorAll(selector)).forEach((node,i) => tracks.push({node,frames:make(i)}));
  // A line is completely hidden before/after drawing: no round-cap residue.
  const draw=(a,b,c,d)=>[[0,{strokeDasharray:'1 1',strokeDashoffset:1,opacity:0}],[a,{strokeDasharray:'1 1',strokeDashoffset:1,opacity:0}],[a+.001,{strokeDasharray:'1 1',strokeDashoffset:1,opacity:1}],[b,{strokeDasharray:'1 1',strokeDashoffset:0,opacity:1}],[c,{strokeDasharray:'1 1',strokeDashoffset:0,opacity:1}],[d,{strokeDasharray:'1 1',strokeDashoffset:-1,opacity:1}],[d+.001,{strokeDasharray:'1 1',strokeDashoffset:-1,opacity:0}],[8,{strokeDasharray:'1 1',strokeDashoffset:1,opacity:0}]];
  for(const prefix of ['main','podium']) {
    add(`[data-motion="${prefix}-line"]`,i=>draw(.2+i*.16,.95+i*.16,5.5+i*.16,6.25+i*.16));
    add(`[data-motion="${prefix}-star"]`,i=>[[0,{opacity:0}],[.95+i*.16,{opacity:0}],[1.15+i*.16,{opacity:1}],[5.5+i*.16,{opacity:1}],[5.75+i*.16,{opacity:0}],[8,{opacity:0}]]);
  }
  add('.motion-logo-eye',()=>[[0,{transform:'translate(0px, 0px)'}],[1.2,{transform:'translate(-3px, 0px)'}],[2.4,{transform:'translate(0px, -3px)'}],[3.6,{transform:'translate(3px, 0px)'}],[4.8,{transform:'translate(0px, 3px)'}],[6,{transform:'translate(0px, 0px)'}],[8,{transform:'translate(0px, 0px)'}]]);
  // The hanging ornaments pivot from their suspension point. Outer groups hold placement.
  add('[data-motion="scroll"]',i=>[[0,{transform:'rotate(0deg)'}],[1.5+i*.08,{transform:`rotate(${i%2?-.85:1.1}deg)`}],[3.7+i*.08,{transform:`rotate(${i%2?.85:-1.1}deg)`}],[5.9+i*.08,{transform:'rotate(0deg)'}],[8,{transform:'rotate(0deg)'}]]);
  add('[data-motion="disc"]',i=>[[0,{transform:'translate(0px, 0px)'}],[.6+i*.16,{transform:'translate(0px, 0px)'}],[1.7+i*.16,{transform:'translate(0px, -3px)'}],[2.8+i*.16,{transform:'translate(0px, 0px)'}],[8,{transform:'translate(0px, 0px)'}]]);
  add('[data-motion="tile"]',i=>[[0,{opacity:1}],[.4+i*.12,{opacity:1}],[1.2+i*.12,{opacity:.88}],[2+i*.12,{opacity:1}],[8,{opacity:1}]]);
  return tracks;
}
export function fitStage(root) {
  const target=root.querySelector('.stage-fit');
  if(!target||!root.clientWidth||!root.clientHeight)return;
  const bounds=target.__stageBounds||(target.__stageBounds=target.getBBox());
  if(!bounds.width||!bounds.height){target.__stageBounds=null;return;}
  const width=root.clientWidth, height=root.clientHeight;
  const slice=Math.max(width/1600,height/700);
  const screenWidth=Math.min(width,document.documentElement.clientWidth);
  const vw=screenWidth/slice, vh=height/slice;
  const viewBoxOffsetX=Math.max(0,(1600-width/slice)/2);
  const desktopScale=window.matchMedia('(min-width: 1024px)').matches ? .45 : 1;
  const widthFit=window.matchMedia('(min-width: 1024px)').matches ? .92 : .98;
  const baseFactor=desktopScale*Math.min(1,vw*widthFit/1370,(vh-50)/612);
  const requestedFactor=(desktopScale===1 ? Math.min(baseFactor*1.1,(vh-50)/612) : baseFactor)*1.5;
  // Keep the supplied stage base on the shared Journey lane.
  const laneY=560, stageBaseBottom=677, stageCenterX=820;
  const safeMargin=4/slice;
  const maxWidthFactor=Math.max(0,(vw-2*safeMargin)/bounds.width);
  const aboveLane=laneY-(700-vh)-safeMargin;
  const maxHeightFactor=bounds.y<stageBaseBottom ? Math.max(0,aboveLane)/(stageBaseBottom-bounds.y) : Infinity;
  const belowLane=bounds.y+bounds.height-stageBaseBottom;
  const maxBottomFactor=belowLane>0 ? (140-safeMargin)/belowLane : Infinity;
  const factor=Math.min(requestedFactor,maxWidthFactor,maxHeightFactor,maxBottomFactor);
  const artworkLeft=viewBoxOffsetX+safeMargin+(vw-2*safeMargin-bounds.width*factor)/2;
  const translateX=artworkLeft-factor*(bounds.x-stageCenterX);
  const nextTransform=`translate(${translateX} ${laneY}) scale(${factor}) translate(-${stageCenterX} -${stageBaseBottom})`;
  if(target.__lastTransform!==nextTransform){target.__lastTransform=nextTransform;target.setAttribute('transform',nextTransform);}
}
