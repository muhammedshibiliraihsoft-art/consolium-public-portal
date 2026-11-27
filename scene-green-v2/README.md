# Ayatic Codex — Green Stage V1

Editable SVG illustration reconstructed from the supplied green stage reference. Chairs, tables, canopy and curtains omitted; speakers retained. The original stacked custom vector wordmark is reused on the stage and in a smaller size on the podium. The podium's old geometric design is replaced by the logo. Canvas weave, matte foam surfaces and ornamental hanging strips are represented with static SVG patterns and outlines. The ornament engraving is a simplified approximation, not an exact trace. No raster assets, lighting filters, WebGL or additional runtime libraries.

## Integration
Copy `AnimatedScene.jsx`, `AnimatedScene.css` and `stageMotion.js` together. Reuse the existing GSAP dependency.

```jsx
import { AnimatedScene } from './AnimatedScene';
<AnimatedScene className="festival-stage" motionEnabled={sceneActive} />
```

The existing parent owns its sized container, scrolling and ScrollTrigger. SVG viewBox 0 0 1600 700, preserveAspectRatio xMidYMax slice; inner fit preserves the whole stage on narrow displays. The outer scene background is transparent. `stage.svg` is the static editable source; `preview.html` is an offline standalone animated preview using Web Animations API and the same timing plan as the React component.

## Motion map
All tracks repeat over one 8-second master cycle. The main stage structure, lettering, podium and microphone remain static.

| Group | Motion | Active timing (seconds) | Loop |
|---|---|---|---|
| Main and podium accent lines | Draw, hold, erase along path | 0.20–0.95, 5.50–6.25; second line +0.16 | Yes |
| Main and podium stars | Appear after respective line, disappear near exit | 0.95–1.15, 5.50–5.75; second +0.16 | Yes |
| Logo eyes | Four-direction movement in local coordinates | 0–6 | Yes |
| Five hanging ornaments | Gentle pendulum sway, max 1.1 degrees, with small stagger | 0–6.22 | Yes |
| Four foam discs | Lift 3 SVG units, return to original location | 0.60–2.80, +0.16 per disc | Yes |
| Five color tiles | Small opacity pulse | 0.40–2.00, +0.12 per tile | Yes |

## Validation actually performed
- Chromium standalone preview rendered with supplied HTML contents: 1440×820, 1024×768, 768×1024, 390×844, 320×568; artwork bounding box inside the SVG viewport in all five sizes.
- Browser preview: 24 animation tracks; manual pause passed; reduced-motion cancels animations and displays complete scene; no browser page errors observed.
- SVG XML parses, IDs unique, local URL/href references resolve, no embedded raster elements. React ID namespace generated with useId.
- JSX and motion JS transpile syntax check with TypeScript transpileModule (not project typecheck).
- Actual production React/GSAP execution, Strict Mode, multiple mounted instances, real-device frame rate and parent ScrollTrigger integration not tested. Preview uses WAAPI, not GSAP. Material feel is a stylized vector approximation rather than photorealistic 3D.


## V2 — material and monitor refinement
- Replaced the existing small stylized monitor wedges with two larger reference-inspired floor speaker cabinets with mesh grilles, side panels, and static contact shadows.
- Refined green cloth weave and subtle edge creases, foam bead grain and cut edges on the left-hand geometry. The shapes, logos, palette family, hanging ornaments, lectern and other stage layout remain in place.
- No new animated tracks, filters, raster assets, or runtime dependencies. `stageMotion.js` and CSS are byte-identical to V1.
- New Chromium preview checks (HTML loaded via set_content because file navigation is blocked in this environment): 24 animation tracks, five viewport sizes (1440×820, 1024×768, 768×1024, 390×844, 320×568), pause, reduced motion, no JS page errors. SVG local references and unique IDs verified; HTML embeds exact exported SVG. JSX transpilation passed (not a project typecheck). Preview PNGs regenerated.
- Actual production React/GSAP, ScrollTrigger integration and device FPS were not tested. This is a hand-authored vector material approximation, not a photographic or mesh render.
