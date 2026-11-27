export const CYCLE = 6.8;
// Start inside the original fully-visible hold, then preserve the same cyclic motion.
const FULL_START = 3.25;
function startFull(frames) {
  const full = frames.filter(([t]) => t <= FULL_START).at(-1)[1];
  const round = t => Math.round(t * 1000000) / 1000000;
  const seam = CYCLE - FULL_START;
  return [
    [0, full],
    ...frames.filter(([t]) => t > FULL_START && t < CYCLE).map(([t,v]) => [round(t-FULL_START),v]),
    [round(seam-.001),frames.at(-1)[1]],
    ...frames.filter(([t]) => t < FULL_START).map(([t,v]) => [round(t+seam),v]),
    [CYCLE,full]
  ];
}
// A single master clock; all values are in seconds. Static artwork is complete.
export function motionTracks(root) {
  const tracks = [];
  const add = (selector, make) => [...root.querySelectorAll(selector)].forEach((node,i,all) => tracks.push({node,frames:make(i,all.length)}));
  const draw = (start,end,exit,finish) => [
    [0,{strokeDasharray:'1 1',strokeDashoffset:'1',opacity:0}],
    [start,{strokeDasharray:'1 1',strokeDashoffset:'1',opacity:0}],
    [start+.004,{strokeDasharray:'1 1',strokeDashoffset:'1',opacity:1}],
    [end,{strokeDasharray:'1 1',strokeDashoffset:'0',opacity:1}],
    [exit,{strokeDasharray:'1 1',strokeDashoffset:'0',opacity:1}],
    [finish,{strokeDasharray:'1 1',strokeDashoffset:'-1',opacity:1}],
    [finish+.004,{strokeDasharray:'1 1',strokeDashoffset:'-1',opacity:0}],
    [CYCLE,{strokeDasharray:'1 1',strokeDashoffset:'1',opacity:0}]
  ];
  add('[data-motion="arc"]',i=>draw(.06+i*.11,1.17+i*.11,5.05+i*.08,6.05+i*.08));
  add('[data-motion="tail"]',()=>draw(.25,1.55,5.05,6.2));
  add('[data-motion="wave"]',()=>[
    [0,{attr:{x:165,width:0}}],[.42,{attr:{x:165,width:0}}],
    [1.64,{attr:{x:165,width:333}}],[5.1,{attr:{x:165,width:333}}],
    [6.2,{attr:{x:498,width:0}}],[CYCLE,{attr:{x:498,width:0}}]
  ]);
  add('[data-motion="diamond"]',()=>[
    [0,{opacity:0}],[1.5,{opacity:0}],[1.8,{opacity:1}],
    [5.05,{opacity:1}],[5.35,{opacity:0}],[CYCLE,{opacity:0}]
  ]);
  const glyph = (i,base) => {
    const start=base+i*.085, exit=5.12+i*.065;
    return [[0,{opacity:0}],[start,{opacity:0}],[start+.32,{opacity:1}],
      [exit,{opacity:1}],[exit+.28,{opacity:0}],[CYCLE,{opacity:0}]];
  };
  add('[data-motion="ayatic"]',i=>glyph(i,.65));
  add('[data-motion="codex"]',i=>glyph(i,.83));
  return tracks.map(({node,frames}) => ({node,frames:startFull(frames)}));
}
export function fitLogo(root) {
  const fit=root.querySelector('.ayatic-fit');
  const artwork=root.querySelector('.ayatic-artwork');
  if(!fit || !artwork || !root.clientWidth || !root.clientHeight) return;
  const width=root.clientWidth, height=root.clientHeight;
  const slice=Math.max(width/1600,height/700);
  const screenWidth=Math.min(width,document.documentElement.clientWidth);
  const vw=screenWidth/slice, vh=height/slice;
  const centerOffset=(width-screenWidth)/(2*slice);
  const bounds=artwork.getBBox();
  const artworkWidth=bounds.width*1.18, artworkHeight=bounds.height*1.18;
  if(!artworkWidth || !artworkHeight) return;
  const centerX=800+(bounds.x+bounds.width/2-666)*1.18;
  const bottomY=350+(bounds.y+bounds.height-439)*1.18;
  const viewportWidth=window.innerWidth;
  const responsiveBoost=viewportWidth<768 ? 1.35 : viewportWidth<1024 ? 1+(0.35*(1024-viewportWidth)/256) : 1;
  const fitScale=Math.min(1,vw*.88/artworkWidth,(vh-70)/artworkHeight);
  const scale=Math.min(.96,responsiveBoost*fitScale,vw*.90/artworkWidth,(vh-70)/artworkHeight);
  fit.setAttribute('transform',`translate(${800+centerOffset} 560) scale(${scale}) translate(${-centerX} ${-bottomY})`);
}
