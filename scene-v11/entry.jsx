import React from './react-shim.js';
import {sceneReactDOM} from '/assets/index-BCF1S8HL-loader-smooth.js';
import {AnimatedScene as AyaticHero3D} from '../scene-ayatic-3d/AnimatedScene.jsx';
import {AnimatedScene as FinalScene} from './AnimatedScene.jsx';
import {AnimatedScene as PenultimateScene} from '../scene-v41/AnimatedScene.jsx';
import {AnimatedScene as GreenStage} from '../scene-green-v2/AnimatedScene.jsx';

function mountInto(chapter, className, Component) {
 const target=chapter?.querySelector('.chapter__scene');
 if(!target) return false;
 if(target.querySelector(`.${className}`)) return true;
 const host=document.createElement('div'); host.className=className; target.append(host);
 sceneReactDOM.createRoot(host).render(<Component />);
 return true;
}
function mountHero() {
 const target=document.querySelector('.hero__title-3d');
 if(!target) return false;
 if(target.querySelector('.ayatic-3d-scene')) return true;
 const host=document.createElement('span'); host.className='hero__title-3d-mount'; target.append(host);
 sceneReactDOM.createRoot(host).render(<AyaticHero3D />);
 return true;
}
function mount() {
 const hero=mountHero();
 const chapters=[...document.querySelectorAll('.journey .chapter')];
 if(chapters.length<3) return false;
 const firstScene=chapters[0]?.querySelector('.chapter__scene');
 firstScene?.querySelectorAll('.scene-palm, .scene-tree, [data-scene-palm], [data-scene-tree]').forEach(node=>node.remove());
 const green=mountInto(chapters[0],'custom-stage-green-v2',GreenStage);
 const penultimate=mountInto(chapters[1],'custom-stage-v41',PenultimateScene);
 const final=mountInto(chapters.at(-1),'custom-scene-v11',FinalScene);
 return hero && green && penultimate && final;
}
if(!mount()) {const observer=new MutationObserver(()=>{if(mount())observer.disconnect()});observer.observe(document.getElementById('root'),{childList:true,subtree:true});}
const mq=window.matchMedia('(max-width: 760px) and (aspect-ratio <= 1)');
const remount=()=>requestAnimationFrame(()=>requestAnimationFrame(mount));
if(mq.addEventListener) mq.addEventListener('change',remount); else mq.addListener(remount);
