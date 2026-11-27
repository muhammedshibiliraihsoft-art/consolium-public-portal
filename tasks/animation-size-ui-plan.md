# Journey artwork enlargement UI plan

Status: implemented locally; no commit, push, or deployment performed. Responsive QA is partial.

## Scope

Increase the two supplied stages and final Ayatic Codex/CONSOULIUM lockup to 1.5 times their existing responsive fitting result. On phones the new artwork may fill and crop within its current scene host. The first removed illustration stays removed. Preserve artwork proportions, internal animation timing, copy positions, sun, lane, water, navigation, section dimensions and scroll distance.

## Verified implementation

- Scene hosts are absolute with fixed parent dimensions and overflow hidden in scene-v11/placement.css.
- Stage fitting lives in scene-green-v2/stageMotion.js and scene-v41/stageMotion.js.
- Final artwork fitting lives in scene-v11/AnimatedScene.jsx; its scale is currently capped by the distance between copy and lane.
- scene-v11/build.cjs generates the delivered scene-v11.js module.

## Implementation completed

- Applied a single 1.5 multiplier to the existing fit result for the green stage, v41 stage and final lockup. Existing SVG fitting groups remain in place, so animated child transforms keep their owners.
- Kept chapter hosts, viewBox, parent CSS and ScrollTrigger setup unchanged. The existing absolute, fixed-size hosts continue to clip only artwork overflow.
- Phone screenshots show the green stage, v41 stage and final lockup filling the viewport; the final lockup is intentionally cropped at the viewport edges under the user's phone-size clarification.
- Desktop browser verification, runtime height/scroll-range measurements, full-cycle animation checks and console inspection remain unverified.

## Validation record

- `node scene-v11/build.cjs` completed successfully.
- `node --input-type=module --check` passed for both stage fit sources and the generated scene module.
- Local `GET /scene-v11/scene-v11.js` returned HTTP 200 and the served bundle contains all three 1.5 multipliers.
- `git diff --check` passed for tracked changes. The scene sources and generated bundle are untracked in this checkout, so Git did not include those files in that diff check.
- Local phone screenshots visually confirmed the added scenes and unchanged copy/lane placement. Exact viewport dimensions and section/scroll measurements were not captured after the change.
- Desktop screenshot validation was unavailable: the separate Chrome window was minimized and the embedded 1280-pixel viewport rendered blank. Desktop and tablet runtime appearance remains unverified.

## Impact

Only the three SVG fitting sources, generated scene module and this plan status were changed by this task. No API, database, authentication or tenant behavior changed. The main unresolved risk is edge clipping at larger desktop/tablet viewports; verify those rendered sizes before publishing.
