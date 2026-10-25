> Historical record. See [final implementation status](implementation-status.md) and final verification logs for the current source.

# Web adapter validation and remaining implementation gaps

Recorded 2026-10-24 from the isolated package checkout. This is local automated evidence, not a stable-release qualification or a claim that every planned behavior is complete.

## Executed checks

Use Node 24 in this environment:

```sh
PATH=/Users/omkarchavan/.nvm/versions/node/v24.13.0/bin:$PATH npx vitest run tests/web
PATH=/Users/omkarchavan/.nvm/versions/node/v24.13.0/bin:$PATH npx playwright test
```

- Web contracts: **8 passed** after the final media MotionValue, drag exclusion, native-button, and reorder changes. Contracts cover disabled buttons, controlled/pending favorites, reactive reduced motion, provider-scoped haptic deduplication, keyboard grid movement, imperative disposal, stable media element/parent identity, and terminal transition events/focus restoration.
- Final sequential Playwright run: **9 passed, 1 skipped, 5 failed** in 7.1 minutes.
  - Chromium: five passes, including the visual artifact test.
  - WebKit: four interaction passes; Chromium-only visual test skipped.
  - Firefox: all five cases failed during `browserType.launch` with `Timeout 30000ms exceeded`, before page actions. The binary started and printed headless/startup messages, but launch initialization did not finish within the configured timeout. This occurred with one worker and an escalated local-server/browser run, so it is not an unapproved sandbox operation. The machine had severe concurrent memory pressure; that is context, not a proven root cause. Firefox remains unqualified and requires a successful rerun in a healthy environment.
- Chromium and WebKit exercised catalog interactions, sheet/popover Escape and focus return, morph reversal and live reduced-motion fullscreen landing, and actual local MP4 playback through route expansion and return. The media checks assert the exact same video element, parent, source, advancing currentTime, and continued playing state.
- The catalog browser case renders all thirteen examples and exercises compression activation, mechanical inner-layer motion with a stationary hit target, selection, carousel edges, dismissal, keyboard grid reorder, layout insertion/removal, favorite rollback, progress, anticipation triggering, and rewards. This is representative coverage, not exhaustive gesture or physics qualification for all thirteen patterns.
- Desktop/mobile screenshots were captured at `/private/tmp/motion-lab-desktop.png` and `/private/tmp/motion-lab-mobile.png` and reviewed by the lead. The checked-in test was subsequently changed to `testInfo.outputPath(...)` for portable CI artifacts; that output-path-only edit was not rerun under the memory-pressure constraint.
- A standalone lab Vite production build and a scoped TypeScript check passed earlier in implementation. Subsequent runtime fixes were covered by the final unit/browser checks; package build/declaration and packed-consumer evidence belongs to the lead's final build record.

Browser failures retain traces under `test-results/*-firefox/trace.zip` in the local workspace. The final run used `workers: 1`, a 30-second launch timeout, and DOMContentLoaded navigation waits. Earlier parallel runs also had Firefox/WebKit navigation timeouts; the final serial WebKit passes supersede those earlier results.

## SplitIn wrapper wave

In the isolated SplitIn checkout:

```sh
npx jest --config jest.config.cjs src/components/animations/__tests__/motionOwnership.test.tsx --runInBand
```

Four ownership tests passed: flag-off wrapper preservation, no second press wrapper around the package-owned button, passive-card hover exclusion, and number accessibility/data attributes. Ten assigned animation/Bento modules passed syntax transpilation and scoped whitespace checks. A full application TypeScript check was cancelled under memory pressure; it must not be reported as passed.

## Remaining source-level gaps, prioritized

### Critical corrections after the first validation run

The following were fixed after the browser run described above; their new focused unit evidence is recorded separately, so the earlier browser result is not misrepresented as post-fix browser evidence.

- `SurfaceRequest.modal` defaults to true. For a persistent player outside the dialog DOM subtree, callers must explicitly use `modal: false`. That branch renders an accessible nonmodal `role="dialog"` surface with a name, initial focus, Escape dismissal and focus restoration, without Radix's focus loop or aria-hiding boundary. It deliberately allows interaction outside the surface and does not dismiss on every outside interaction. A keyboard/aria test checks Shift+Tab from Close into the same stable video and absence of an aria-hidden ancestor. `MediaHost` no longer assigns a global z-index; the example supplies a higher layer only for the expanded destination. A modal player requires an application focus/branch architecture that includes the stable player; merely using the default modal surface with an outside player is unsupported.
- Router rollback checks the owned destination/origin key before popping history. A blocked navigation that never changes location does not pop the prior route; a committed owned push rolls back once. Direct entry still requires the route owner to call `reveal(request)`.
- Same-ID retarget updates content, callbacks and destination. Same-ID and different-ID requests begin from the currently presented rectangle instead of snapping to a new source. Focused tests inspect the initial width across both retarget paths. This resets the scalar transition to a new run; it does not preserve physical velocity across arbitrary retargets. Resize still replaces the frame immediately, and logical start/end reads document direction rather than the source's inherited direction.
- Sheets and menus retain semantic/focus ownership until actual exit-animation completion, cancel the pending exit on reversal, and use no fixed unmount timer. Sheets now animate presentation travel and backdrop opacity as well as snap settling. Popovers explicitly own retained presence rather than asking CSS exit detection to decide when the Motion animation ended.
- Reward deduplication retains the most recent 512 event IDs per mounted component. IDs older than that bounded window may produce a new sequence if reused. Provider haptic deduplication independently retains 1024 explicit keys.

Remaining overlay limitations: sheet gesture dismissal is a fast downward fling at the last snap rather than a configurable distance endpoint; live snap-point/policy retargeting and background interruption remain incompletely covered. Source appearance is an explicit `sourceContent` slot rather than automatic style/artwork extraction. `MorphingSurface` owns source-trigger visibility; callers opening the host directly must own that visibility themselves.

### P2 — Catalog completeness limits

- `LayoutFlow` uses position-only layout animation. Existing siblings can reflow, but it does not itself retain removed elements or animate size, insertion, and removal transitions.
- `SnapCarousel` delegates momentum/bounds/snapping to native scrolling and CSS. It does not expose the shared velocity/projection/decay policy or engine-independent momentum controls. A vertical carousel needs a bounded host height.
- Reorder supports one nonvirtualized container, keyboard move alternatives, cancellation restoration, a pointer-linked lifted visual, and vertical edge autoscroll. The lifted visual disappears on release rather than animating into its final slot; horizontal edge autoscroll, drag hysteresis, and interaction with media-rich item clones need further work.
- `DismissibleSurface` excludes buttons, links, inputs, editable content, video, and slider roles from drag activation, but it does not use a shared gesture arbiter or a full scroll/text-selection ownership model. Drag direction/velocity commitment, pointer cancellation, and synchronized optional backdrop are implemented.
- Mechanical press preserves the native button hit target and moves an inner visual layer. A complete depressed face/shadow requires consumer styling on `visualClassName`/`visualStyle`; an outer button shadow is not automatically compressed.
- Reward sequencing implements confirmed-event deduplication, seeded particles, semantic haptics, completion/cancellation, and composable children. It is not a timeline coordinator for arbitrary badge/count/particle sub-sequences.
- Exactly-once lifecycle events are implemented for transition-host runs and reward callbacks, not a uniform exposed controller contract across every component.

## Qualification not established

No physical mobile Safari/Chrome or installed-PWA validation, screen-reader pass, native-device frame pacing, 100-cycle leak trace, 120 Hz qualification, broad nested overlay/map/slider conflict audit, or exhaustive app flag-on/flag-off journey coverage was completed by this workstream. Desktop browser playback continuity does not replace those gates. The implementation should not be described as a fully qualified completion of the approved interaction catalog or stable milestone.

## Post-correction validation (2026-10-24)

- `npx vitest run tests/web`: 14/14 passed across contracts, critical overlays/media/retarget, and route rollback tests. The retained-popover jsdom case uses a 60-second test budget because FloatingUI/Radix processing was slow on this machine; it asserts completion and reversal rather than using an unmount timer.
- After the final scoped Escape change, `npx vitest run tests/web/critical.test.tsx -t nonmodal`: 1 passed, 3 intentionally excluded. This also checks that a nested keyboard owner consuming Escape does not close the enclosing surface.
- `npx playwright test --project=chromium --project=webkit --workers=1 --grep 'sheet and|morph reverses|video keeps'`: 5 passed, 1 failed. Both engines passed retained sheet/popover focus and morph reversal; WebKit passed media accessibility, keyboard access and continuity. Chromium exposed native video keyboard behavior rather than a stable player identity failure.
- Chromium native controls require multiple reverse-Tab steps and may consume Escape internally, even before the document capture listener. The attempted capture workaround was removed to preserve nested overlay priority. The browser test now verifies keyboard reachability of the player, then dismisses via Escape on the named surface Close control. `npx playwright test --project=chromium --workers=1 --grep 'video keeps'`: 1 passed. Player identity, same parent/source, continuing playback and route return passed. Video-focused Escape is not promised across native browser control implementations; the explicit Close control remains available. No final Firefox rerun was performed.
- No package runtime source changes remain after the final freeze notification; the capture-phase experiment was reverted. Build/declaration/packed-consumer results remain owned by the lead.

### Bounded navigation policy wave

`MobileBottomNavRouteTransition` now consumes the flagged shared layout policy/preset. It preserves the existing route-state triggers, direction, key, disabled-map passthrough, and settled transform cleanup. No new gesture, back-navigation, routing or haptic owner was added. Flag-off keeps the previous local reduced-motion/spring path. Its Jest suite passed 7/7 including shared-policy suppression and stable disabled map subtree.

Read-only triage found no broad Framer transform owners in messaging lists: most effects there are color transitions, shared UI or business/loading state. Adding generic wrapper transforms to those lists would create new behavior without proving scroll/virtualization ownership. Remaining mobile icon alternative files use bespoke animated SVGs, and `DrawerEdgeHandle` delegates to the existing edge-peek gesture hook; replacing those requires explicit gesture/arbitration qualification rather than a mechanical wrapper swap. These remain outside this bounded migration wave.
