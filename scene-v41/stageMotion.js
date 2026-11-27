export const CYCLE = 8;
// Times in seconds. This plan is also used in the standalone browser preview.
export function motionTracks(root) {
  const tracks = [];
  const add = (selector, make) => Array.from(root.querySelectorAll(selector)).forEach((node, i, all) => tracks.push({ node, frames: make(i, all.length) }));
  const draw = (start, end, eraseStart, eraseEnd) => [
    [0,{strokeDasharray:'1 1',strokeDashoffset:1.01,opacity:0}],
    [start,{strokeDasharray:'1 1',strokeDashoffset:1.01,opacity:0}],
    [start+.001,{strokeDasharray:'1 1',strokeDashoffset:1,opacity:1}],
    [end,{strokeDasharray:'1 1',strokeDashoffset:0,opacity:1}],
    [eraseStart,{strokeDasharray:'1 1',strokeDashoffset:0,opacity:1}],
    [eraseEnd,{strokeDasharray:'1 1',strokeDashoffset:-1,opacity:1}],
    [eraseEnd+.001,{strokeDasharray:'1 1',strokeDashoffset:-1.01,opacity:0}],
    [8,{strokeDasharray:'1 1',strokeDashoffset:1.01,opacity:0}]
  ];
  // No geometry shifts: the stage is a physical installation.
  add('[data-motion="side"]', (i) => [[0,{opacity:1}],[.4+i*.045,{opacity:1}],[1+i*.045,{opacity:.78}],[1.7+i*.045,{opacity:1}],[8,{opacity:1}]]);
  add('[data-motion="engraving"]', i => draw(.25+i*.045,1.15+i*.045,5.8+i*.045,6.65+i*.045));
  add('[data-motion="gold"]', () => [[0,{opacity:1}],[1,{opacity:1}],[2.3,{opacity:.78}],[4,{opacity:1}],[8,{opacity:1}]]);
  add('[data-motion="molecule-line"]', i => draw(.3+i*.14,1.35+i*.14,5.6+i*.12,6.5+i*.12));
  add('[data-motion="molecule-node"]', i => [[0,{opacity:0}],[.3+i*.035,{opacity:0}],[.65+i*.035,{opacity:1}],[5.6+i*.035,{opacity:1}],[6.1+i*.035,{opacity:0}],[8,{opacity:0}]]);
  add('[data-motion="accent-line"]', i => draw(.2+i*.12,.85+i*.12,5.6+i*.12,6.35+i*.12));
  add('[data-motion="star"]', i => [[0,{opacity:0}],[.85+i*.12,{opacity:0}],[1.1+i*.12,{opacity:1}],[6.35+i*.12,{opacity:1}],[6.55+i*.12,{opacity:0}],[8,{opacity:0}]]);
  add('.motion-logo-eye', () => [[0,{transform:'translate(0px, 0px)'}],[1.2,{transform:'translate(-4px, 0px)'}],[2.4,{transform:'translate(0px, -4px)'}],[3.6,{transform:'translate(4px, 0px)'}],[4.8,{transform:'translate(0px, 4px)'}],[6,{transform:'translate(0px, 0px)'}],[8,{transform:'translate(0px, 0px)'}]]);
  // Exactly one pen stroke at a time. Finished strokes remain visible until the entire fascia is drawn.
  add('[data-motion="fascia-pen"]', (i,n) => {
    const step=3.8/n, a=.12+i*step, b=a+step;
    return [[0,{strokeDasharray:'1 1',strokeDashoffset:1.01,opacity:0}],[a,{strokeDasharray:'1 1',strokeDashoffset:1.01,opacity:0}],[a+.001,{strokeDasharray:'1 1',strokeDashoffset:1,opacity:1}],[b,{strokeDasharray:'1 1',strokeDashoffset:0,opacity:1}],[6.3,{strokeDasharray:'1 1',strokeDashoffset:0,opacity:1}],[6.8,{strokeDasharray:'1 1',strokeDashoffset:0,opacity:0}],[8,{strokeDasharray:'1 1',strokeDashoffset:1.01,opacity:0}]];
  });
  // Podium accents use independent indices; original stage timing is unchanged.
  add('[data-motion="podium-line"]', i => draw(.2+i*.12,.85+i*.12,5.6+i*.12,6.35+i*.12));
  add('[data-motion="podium-star"]', i => [[0,{opacity:0}],[.85+i*.12,{opacity:0}],[1.1+i*.12,{opacity:1}],[6.35+i*.12,{opacity:1}],[6.55+i*.12,{opacity:0}],[8,{opacity:0}]]);
  return tracks;
}
export function fitStage(root) {
  const target=root.querySelector('.stage-fit');
  if(!target || !root.clientWidth || !root.clientHeight) return;
  const bounds=target.__stageBounds||(target.__stageBounds=target.getBBox());
  if(!bounds.width || !bounds.height){target.__stageBounds=null;return;}
  const width=root.clientWidth, height=root.clientHeight;
  const slice=Math.max(width/1600,height/700);
  const screenWidth=Math.min(width,document.documentElement.clientWidth);
  const vw=screenWidth/slice, vh=height/slice;
  const viewBoxOffsetX=Math.max(0,(1600-width/slice)/2);
  const desktopScale=window.matchMedia('(min-width: 1024px)').matches ? .45 : 1;
  const widthFit=window.matchMedia('(min-width: 1024px)').matches ? .92 : .98;
  const baseFactor=desktopScale*Math.min(1,vw*widthFit/1370,(vh-50)/571);
  const requestedFactor=(desktopScale===1 ? Math.min(baseFactor*1.1,(vh-50)/571) : baseFactor)*1.5;
  // Align the main stage base (excluding the stairs) to the shared lane at y=560.
  const laneY=560;
  const stageBaseBottom=650;
  const stageCenterX=800;
  const safeMargin=4/slice;
  const maxWidthFactor=Math.max(0,(vw-2*safeMargin)/bounds.width);
  const aboveLane=laneY-(700-vh)-safeMargin;
  const maxHeightFactor=bounds.y<stageBaseBottom ? Math.max(0,aboveLane)/(stageBaseBottom-bounds.y) : Infinity;
  const belowLane=bounds.y+bounds.height-stageBaseBottom;
  const maxBottomFactor=belowLane>0 ? (140-safeMargin)/belowLane : Infinity;
  const factor=Math.min(requestedFactor,maxWidthFactor,maxHeightFactor,maxBottomFactor);
  const verticalOffset=laneY+(680-stageBaseBottom)*factor;
  const artworkLeft=viewBoxOffsetX+safeMargin+(vw-2*safeMargin-bounds.width*factor)/2;
  const translateX=artworkLeft-factor*(bounds.x-stageCenterX);
  const nextTransform=`translate(${translateX} ${verticalOffset}) scale(${factor}) translate(-${stageCenterX} -680)`;
  if(target.__lastTransform!==nextTransform){target.__lastTransform=nextTransform;target.setAttribute('transform',nextTransform);}
}
