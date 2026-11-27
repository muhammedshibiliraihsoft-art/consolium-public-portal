# Ayatic Codex — animated logo

Editable React + inline SVG, with the existing GSAP dependency. Transparent artwork; standalone preview uses a white background to match the reference. The logo's paths were reconstructed from the supplied raster silhouettes, with modest smoothing and approximated gradient stops. Not the official master vector; no raster assets are embedded. 39 SVG paths, 20 animated targets, one production GSAP timeline.

## Integration
Copy AnimatedScene.jsx, AnimatedScene.css and motion.js into the same component directory. Use the existing GSAP installation (3.x). The parent must provide dimensions.

```jsx
import { AnimatedScene } from './AnimatedScene';
<AnimatedScene className="festival-logo" motionEnabled={sceneActive} />
```

Parent ScrollTrigger/pinning is not modified. The SVG uses viewBox 0 0 1600 700 and xMidYMax slice. ResizeObserver fits the full logo to the visible area. Instance-specific IDs are generated with React useId. The lifecycle controller uses IntersectionObserver and visibilitychange, cancels/reverts animation for reduced motion, and cleans up on unmount. `motionEnabled={false}` displays the complete static artwork.

## V2 motion map (6.8-second loop)
The original motion tracks are phase-shifted by 3.25 seconds, with no change to the artwork or drawing speed. At entry the complete mark is visible immediately. Full hold 0–1.80s; original sequential exit ~1.80–3.05s; completely hidden ~3.05–3.61s; original drawing/reveal ~3.61–5.35s; complete hold ~5.35–6.80s, continuing seamlessly into the next cycle. Scroll re-entry restarts the timeline from the complete mark. Tab visibility pauses and resumes, and reduced motion keeps the complete static artwork.

## Files
- preview.html: self-contained browser preview using Web Animations API and the same motion plan.
- logo.svg: editable static artwork (unchanged).
- AnimatedScene.jsx, AnimatedScene.css, motion.js: production integration files.
- desktop-preview.png, mobile-preview.png: browser captures.

The mask reveal follows a curved sweep, not individual pen tracing of every arc. Preview uses white background; actual artwork is transparent.

## V2 validation
Chromium preview: 20 animation tracks, full logo at 0 and 1000 ms (identical pixel counts), partial exit at 2400 ms, no visible logo pixels at 3200 ms, partial entry at 4200 ms, full at 5500 and 6790 ms. Scroll out/in restarts at full logo; reduced motion cancels tracks; no page errors. Desktop and mobile captures refreshed. Static SVG and CSS byte-identical to V1. Motion JS syntax checked. Actual React/GSAP runtime and real-device performance not tested.
