# Implementation Plan: One-page Consoulium public experience

Date: 2026-11-25
Status: plan only; implementation, commit and deployment are outside this planning task.

## Goal and boundary

Make the existing home page a continuous public experience: current Home/Journey/Story, the existing leaderboard as the Standings section, then Results and Schedule, followed by the existing footer. Interpret the requested four pages as Home plus the three currently separate public pages. Preserve all current Home text, scenes, sun/color transitions, brand, motion and desktop/mobile compositions except the explicitly requested integration. Gallery, News, Media and Brochure remain outside scope. Do not change backend, schema, permissions or tenant behavior.

## Verified current state

- `consoulium.html` loads a prebuilt React/GSAP home bundle and the separate Journey scene bundle. The current Home ends with a leaderboard replacement of the former registration block, then footer.
- `festival-standings.html`, `festival-results.html` and `festival-schedule.html` are independent documents using `festival-pages.js` and `festival-pages.css`. The latter has light-theme overrides that do not match Home.
- The public pages read `/mock-data.json`; the Home leaderboard separately reads the same snapshot. The snapshot currently has five demo units, two demo results, and one demo schedule entry.
- Standings requires `public_page`, `sections.results` and `public_leaderboard`. Results also checks `settings.is_public_visible`; Schedule checks `public_page` and `sections.schedule`. These current visibility rules must be traced and retained exactly before extracting shared rendering.
- `nav-routes.js` currently sends Home navigation to the separate HTML documents. Direct legacy URLs exist. The server serves static files at `/consoulium` and `/festival-*.html`.
- Current asset sizes on disk: Home JS about 337 KB; Journey scene JS about 478 KB. These are file sizes, not measured transfer sizes or performance results.

## Uniform UI model

```text
Existing nav + Hero + horizontal Journey + Story
                 ↓ current transition
Standings: existing animated leaderboard heading/band + full unit list
                 ↓ same background and section rhythm
Results: published competitions and result rows
                 ↓ same background and section rhythm
Schedule: chronological program cards / compact timeline
                 ↓
Existing footer
```

- Use the Home page's actual colors, gradients, type scale, gutters, badge shapes, borders, icon language and motion timing as the design contract. Inventory the exact tokens/selectors before coding. Do not import the standalone pages' light overrides, sticky bars or duplicate headers/loaders.
- Keep the current leaderboard visual as the first integrated section. Expand it from the five-card preview to the full Standings content in place, without a second leaderboard elsewhere.
- Results: one section heading and intro in Home's established hierarchy; competition cards with the current item code/category badge, participant, team, rank, grade and points. Preserve published-data semantics; do not invent fields.
- Schedule: the same heading/badge hierarchy; cards ordered by start time with program name, date/time, venue and status. If future day grouping is useful, derive it from verified timestamps without changing data meaning.
- Keep section boundaries visually continuous: controlled spacing, subtle background/color handoff and existing decorative language. Avoid full-screen blank panels, a second page shell, new visual motifs, and unexpected extra scroll height.
- Desktop/laptop: align content to Home's existing max width and grid rhythm. Tablet: use a deliberate reduced-column composition. Phone/narrow phone: one-column cards, readable text, compact touch-safe search/refresh controls, no horizontal overflow or fixed-nav collision. The Journey stays unchanged at every breakpoint.
- All new animations should be small reveal/transform/opacity effects, run once when a section enters view, and honor reduced motion. No continuous animation or expensive scroll handler is needed for data cards.

## Data, loading and scroll model

- Define one public snapshot controller for the integrated sections and current leaderboard. Fetch the snapshot once per refresh, share the result, coalesce concurrent refreshes, and ignore stale responses. Do not make one identical fetch per section.
- Apply each section's current feature/visibility gate separately. A disabled section shows its established unavailable state and must not leak hidden data through the Home DOM.
- Keep one initial Home loader. Do not replay the full-screen loader when scrolling into Results or Schedule. Reserve the section's approximate layout before data arrives, show local skeleton/status only where needed, and expose retry on a failed fetch.
- Start data retrieval early enough that a normal scroll does not wait on an avoidable request; defer expensive card construction until the section is near the viewport if measurement shows it helps. Use a single observer rather than per-card scroll listeners. Avoid forcing layout while GSAP's pinned Journey is active.
- Maintain current search and manual refresh behavior per section with scoped controls. Preserve the current visibility-return refresh only through the shared controller, with coalescing; do not add polling.
- Measure before setting a performance budget: network waterfall, load completion, long main-thread tasks, Journey frame smoothness, layout shift, and memory/DOM size on representative phone and desktop hardware. Compare before/after at the same viewport and throttling. Optimize only observed bottlenecks (for example chunked rendering or modest result limits with an explicit More control); never silently omit published rows.

## Navigation and compatibility

- Home nav/footer/menu links for Standings, Results and Schedule should target stable anchors on `/consoulium`. Preserve keyboard navigation, focus placement and reduced-motion behavior for anchor scrolling.
- Keep `/festival-standings.html`, `/festival-results.html` and `/festival-schedule.html` working during the integration. Decide whether to redirect them to Home anchors only after verifying bookmarks, tenant query parameters and external links. Do not delete these files in the first slice.
- Preserve the tenant parameter and existing visibility/ownership boundaries. The current demo snapshot is not proof of live tenant data; live data integration is a separate decision and verification task.

## Ordered implementation slices and acceptance

1. **Baseline and design contract.** Record Home tokens, section geometry, existing loader/GSAP behavior, desktop/tablet/phone screenshots and performance baseline. Trace nav links and public-page data gates. Acceptance: a documented comparison target, no source changes to Journey.
2. **Shared snapshot controller.** Make the Home leaderboard and future sections consume one snapshot with separate gates, error/empty states and refresh behavior. Acceptance: one request per refresh, no hidden-section data rendered, current leaderboard still works.
3. **Standings integration.** Turn the existing leaderboard preview into the full standings view in its current location, preserving the animated band. Acceptance: all published units shown in point order, search works, five demo units visible, no second leaderboard.
4. **Results integration.** Add Results directly below Standings using Home's UI contract. Acceptance: current published result information is present, grouped and searchable, with loading/empty/error states.
5. **Schedule integration.** Add Schedule below Results in timestamp order using the same UI contract. Acceptance: program, time, venue and status remain accurate; search works; no horizontal overflow.
6. **Navigation and compatibility.** Route current nav/footer/menu actions to Home anchors while retaining legacy URLs. Acceptance: direct/anchor navigation works with tenant query parameter and keyboard focus; no broken links.
7. **Performance and responsive gate.** Measure again, fix only observed loading/scroll issues, and compare against baseline. Acceptance: Journey animation/color transitions unchanged; section loading does not block scrolling; no layout jump, clipping or extra mobile height; reduced-motion path works.

## Verification checkpoints

- After slices 2–3: source/syntax check, snapshot gate checks, one-fetch check, and local browser comparison of Home/Journey/Standings.
- After slices 4–5: focused results/schedule rendering and search checks; mobile portrait/landscape, narrow phone, tablet portrait/landscape, laptop and desktop visual review.
- After slices 6–7: direct URL and anchor navigation, feature-disabled states, retry/failure, slow network, reduced motion, browser console, and before/after performance trace. Separate local evidence from any later deployment evidence.

## Impact and unresolved decisions

- Frontend: Home composition, nav routing, public rendering and CSS. Old-flow risk: prebuilt React DOM and GSAP scroll geometry can be disturbed by inserting content in the wrong place; integrate after the pinned Journey and preserve its DOM/measurements.
- API/data: no new API or schema planned. Existing snapshot request and visibility gates must remain correct. Demo data cannot be presented as live festival standings.
- Compatibility: legacy public URLs and tenant query behavior need verification before any redirect or removal.
- Open decision: whether the current static demo snapshot is only a preview or should later be replaced with a verified live tenant endpoint. This plan does not assume live data access.
- Open decision: exact final order of Results and Schedule if the user wants a different order; the current plan follows the stated Standings → Results → Schedule sequence.

No implementation, commit, push or deployment is authorized by this plan alone.
