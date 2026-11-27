# Antigravity Handoff Prompt — Consolium Journey Scenes

You are continuing an in-progress implementation in `D:\work\fest\consolium-public-portal`.

## Goal
Finish and verify the supplied animated SVG scenes integrated into the existing Consolium horizontal Journey section. Preserve the current page design, text, colors, sun/background transitions, lane/water geometry, progress strip, chapter scrolling, and section heights. Do not redesign the UI.

## Current intended scene order
1. Observation / dawn: supplied `ayatic-codex-animated-v2` artwork and animation.
2. Contemplation / noon: supplied `animated-green-stage-v2` artwork and animation.
3. Insight / before dusk: supplied `animated-stage-v4.1-reviewed` blue stage.
4. Zenith / nightfall: existing `scene-v11` Ayatic Codex + CONSOULIUM lockup animation.

The scene mounts are in `scene-v11/entry.jsx`. Shared scene host styles are in `scene-v11/placement.css`. The generated module is `scene-v11/scene-v11.js`, included from `consoulium.html`.

## Locked visual requirements
- Keep the shared Journey lane/water and progress strip visible. Shared lane baseline is SVG `y=560` in a 1600x700 view.
- Keep scene artwork backgrounds transparent. The shared chapter background and sunset transition belong to the existing Journey, not the supplied artwork.
- Green and blue physical stage bases must meet the lane; the blue stage stairs remain separate and must not pull the base alignment vertically.
- The Ayatic Codex scene belongs in the first frame. Its mobile sizing is intended to be up to 35% larger, with responsive fitting that keeps the complete artwork visible. Desktop stays at its base size.
- The final lockup artwork was shifted left, but must remain fully visible. Preserve its vertical baseline and animation timing.
- Earlier desktop size reductions for the previous supplied scenes were explicitly corrected/reverted. Do not reapply a 50% shrink without new instruction.
- Do not change page copy, chapter layout, scroll duration/height, background transitions, sun, or lane geometry.

## Source and provenance
- User supplied `animated-green-stage-v2.zip` and `ayatic-codex-animated-v2.zip`; source folders are `scene-green-v2/` and `scene-ayatic-v2/`.
- `scene-v41/` is the blue stage supplied earlier.
- `scene-v11/` contains the final existing lockup scene and the integration entry/build files.
- Existing repository changes predate this handoff task. Preserve all dirty/untracked work. Do not reset, clean, stash, or discard files.

## Worktree facts at handoff
- Repository: `D:\work\fest\consolium-public-portal`
- Branch: `main`; base HEAD observed as `921b12d8b6339581dc54d3ffe69d4e009d8d97e9`.
- Existing modified/untracked paths before this prompt: `assets/index-BCF1S8HL-loader-smooth.js`, `consoulium.html`, `scene-ayatic-v2/`, `scene-green-v2/`, `scene-v11/`, `scene-v41/`.
- Build command that succeeded: `node scene-v11/build.cjs` (esbuild is currently referenced from `D:/conso-public/node_modules/esbuild`; avoid expanding this into a tooling refactor unless needed for the requested verification).
- `git diff --check` succeeded after the latest scene adjustment.
- The local preview is served at `http://127.0.0.1:8080/consoulium` by `server.cjs` in this repository.
- Desktop browser visually confirmed green-stage rendering and blue-stage rendering in prior checks. Latest mobile sizing/cropping adjustments have not yet been visually verified; do not claim mobile validation without doing it.

## Next steps
1. Re-read applicable `AGENTS.md` and inspect the complete current Git status/diffs; confirm no new user edits appeared since this note.
2. Review the last screenshot: the first-frame artwork was reported as partly missing. Confirm the complete SVG artwork bounds at mobile, tablet, and desktop widths and orientations. Adjust only the scene's fit/scale/position so the full supplied art is visible; preserve the lane and chapter dimensions.
3. Verify all four mounts render in their intended chapter slots and do not overlap adjacent chapter scenes during the horizontal transition.
4. Check browser console errors and reduced-motion/offscreen cleanup where practical. Run `node scene-v11/build.cjs` and `git diff --check` after any source changes.
5. Report source changes separately from local browser verification. Do not push, deploy, or publish unless the user explicitly asks for that in the active task.

## Hard boundaries
Do not alter backend, APIs, database, authorization, tenant behavior, page content, existing Journey copy, shared lane geometry, scrolling, sun/background transitions, or other sections. Preserve unrelated dirty work. Stop after this scene integration and its verification.
