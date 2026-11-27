export const CYCLE = 6.4;

function frames(node, list) {
  return { node, frames: list };
}

export function motionTracks(svg) {
  const floatGroup = svg.querySelector('[data-motion="float"]');
  const extrudeGroup = svg.querySelector('[data-motion="extrude"]');
  const shadowGroup = svg.querySelector('[data-motion="shadow"]');
  const highlightGroup = svg.querySelector('[data-motion="highlight"]');

  return [
    frames(floatGroup, [
      [0.0, { x: 0, y: 0, rotation: 0, svgOrigin: '935 427' }],
      [1.6, { x: 0, y: -3, rotation: -0.28, svgOrigin: '935 427' }],
      [3.2, { x: 0, y: 0, rotation: 0.12, svgOrigin: '935 427' }],
      [4.8, { x: 0, y: 3, rotation: 0.28, svgOrigin: '935 427' }],
      [6.4, { x: 0, y: 0, rotation: 0, svgOrigin: '935 427' }],
    ]),
    frames(extrudeGroup, [
      [0.0, { x: 10, y: 10 }],
      [1.6, { x: 11, y: 11 }],
      [3.2, { x: 10, y: 10 }],
      [4.8, { x: 9, y: 9 }],
      [6.4, { x: 10, y: 10 }],
    ]),
    frames(shadowGroup, [
      [0.0, { opacity: 0.12, scaleX: 1, scaleY: 1, svgOrigin: '935 427' }],
      [1.6, { opacity: 0.09, scaleX: 0.992, scaleY: 0.986, svgOrigin: '935 427' }],
      [3.2, { opacity: 0.12, scaleX: 1, scaleY: 1, svgOrigin: '935 427' }],
      [4.8, { opacity: 0.1, scaleX: 1.006, scaleY: 1.01, svgOrigin: '935 427' }],
      [6.4, { opacity: 0.12, scaleX: 1, scaleY: 1, svgOrigin: '935 427' }],
    ]),
    frames(highlightGroup, [
      [0.0, { opacity: 0, x: -230 }],
      [0.7, { opacity: 0, x: -230 }],
      [1.4, { opacity: 0.34, x: 0 }],
      [2.0, { opacity: 0, x: 170 }],
      [4.0, { opacity: 0, x: 170 }],
      [4.8, { opacity: 0.28, x: -20 }],
      [5.4, { opacity: 0, x: 210 }],
      [6.4, { opacity: 0, x: 210 }],
    ]),
  ].filter(item => item.node);
}
