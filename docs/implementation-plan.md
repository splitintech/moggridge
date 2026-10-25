# Cross-platform motion package and SplitIn integration plan

## 1. Confirmed outcome and boundaries

Expand **`@splitin/react-mobile-interactions`**, maintained in `splitintech/moggridge`, into a reusable motion system with:

- Shared TypeScript interaction contracts and presets.
- Motion-based rendering for desktop web and mobile PWAs.
- Reanimated-based rendering for iOS and Android.
- Unstyled, accessible components and lower-level hooks.
- All reusable SplitIn UI animation presets, gestures, haptics, and generic effects.
- All 13 requested interaction patterns, plus reversible card expansion and right-edge container expansion.
- Runnable web and native motion labs, practical recipes, and a SplitIn developer-tools integration.
- A feature-flagged migration covering **all interactive SplitIn application UI**.
- npm beta releases followed by a stable release after browser and physical-device qualification.

The existing animation engines will perform spring and decay calculations. Our package will own interaction behavior, configuration, coordination, interruption, snapping policy, and completion semantics.

**Confirmed exclusions:** marketing pages, Remotion/video-production helpers, branded animation assets, custom Swift/Kotlin implementations, legacy React Native architecture, cross-container dragging, and virtualized drag-and-drop. Swift/Kotlin receives an extension contract and integration guide. Native support is delivered through the library, Expo demo, and bare React Native fixture; this project does not convert the entire SplitIn application into React Native.

**Current implementation facts**

- The canonical package currently contains web gestures, back-layer handling, route transitions, and Framer Motion presets.
- SplitIn has 84 Apple-style exports referenced by 77 source files.
- Shared Button and Card have hundreds of consumers; some wrappers also animate independently.
- Mapbox owns marker positioning outside the normal React component tree.
- Existing video continuity handles recovery within a player instance; it does not preserve a player across screens.
- The separate package checkout inside SplitIn must not become a competing source of truth.
- Current local native tooling is incomplete: full Xcode is not selected, and Android tools were not found on PATH.

## 2. Package architecture and public contracts

### Distribution and compatibility

Keep one npm package with explicit entrypoints:

| Entrypoint | Responsibility |
|---|---|
| Existing root | Preserve current web exports, signatures, and behavior. |
| `/core` | Engine-independent types, preset tokens, gesture/snap calculations, interaction contracts. |
| `/web` | React DOM components, hooks, measurement, Motion rendering, imperative element animation. |
| `/native` | React Native components, hooks, Reanimated worklets, native gestures. |
| `/presets/apple` | Existing Apple-style tokens and web-compatible variants. |
| `/presets` | Portable `precise`, `soft`, and `celebratory` preset definitions. |
| Platform-specific integration subpaths | React Router, React Navigation, and optional haptic integrations. |
| `/extensions` | Future native-effect capability and lifecycle contracts. |

Build separate declarations and executable entrypoints. Native imports must not pull React DOM, Framer Motion, Radix, or DOM types into Metro. Web imports must not pull native engines into Vite. Preserve existing ESM/CommonJS root support.

Use optional peer metadata for adapter-specific dependencies, with explicit installation instructions and consumer tests. Preserve worklet directives in native output and test the packed package through Metro.

Keep `framer-motion` 12 for the initial web adapter to match existing consumers. Avoid combining this project with an unnecessary import/package migration.

### Shared API

Provide these public concepts:

- **`MotionProvider`**: enabled state, preset family, reduced-motion policy, semantic haptic driver, optional diagnostics.
- **`SpringSpec` and motion tokens**: explicit stiffness, damping, mass, overshoot policy, durations in milliseconds.
- **Interaction controllers**: controlled/uncontrolled state, target changes, cancellation, completion, and gesture ownership.
- **Transition lifecycle events**: start, completion, and cancellation, identified by a run ID. Each run terminates once.
- **`TransitionHost` and surface registration**: persistent ownership for expansion, routing, source/destination measurement, and returning to a source.
- **`MediaHost` and media slots**: stable ownership for a playing media surface across registered views.
- **Haptic intents**: press, selection, snap, success, warning, error, drag start, and drag completion, mapped by each platform.
- **Capability reporting**: distinguish supported behavior, platform-specific behavior, and unavailable optional integrations.

Shared types must not expose DOM events, `MotionValue`, or Reanimated `SharedValue`. Adapter-specific hooks may expose those values for advanced composition without passing frame updates through React state.

Normalize distances to CSS pixels on web and logical layout units on native; normalize velocity to units per second. Convert legacy gesture velocities explicitly.

### Preset policy

Preserve existing tuning and names. Add these initial spring defaults:

| Family | Stiffness | Damping | Mass | Intended use |
|---|---:|---:|---:|---|
| `precise` | 500 | 30 | 0.5 | Buttons, selection, menus. |
| `soft` | 280 | 32 | 1 | Sheets, cards, container transitions. |
| `celebratory` | 300 | 18 | 0.8 | Decorative icons, badges, milestones. |

These are package defaults, not claims about another company’s private settings. Consumers can override them.

Preserve the existing root’s callable `shouldAnimate()`. Do not export Apple’s conflicting import-time boolean through that root. New components use a reactive motion-policy subscription; legacy static objects remain clearly identified compatibility exports.

### Native baseline

Start the Expo demo and bare RN fixture from the same tested dependency set:

- Expo SDK 58.
- React Native 0.88.0 and React 19.3.0.
- Reanimated 4.7.1 and Worklets 0.13.0.
- Gesture Handler 3.3.x, with the resolved patch locked.

This is the cohesive version set currently documented by Expo. Reconfirm it when implementation begins and commit exact lockfiles. [Expo dependency manifest](https://raw.githubusercontent.com/expo/expo/sdk-58/packages/expo/bundledNativeModules.json)

## 3. Step-by-step implementation

### Step 1 — Establish the baseline, workspaces, and coverage inventory

1. Start isolated implementation branches from current remote `main` in each repository.
2. Record the canonical package version, published npm versions, current exports, tests, and release workflow.
3. Preserve unrelated SplitIn work and the separate nested package checkout.
4. Establish the native toolchain or CI runners, signing/build prerequisites, and physical-device access.
5. Create a coverage manifest recording each interactive surface, route/role, motion owner, gesture owner, haptic owner, proposed replacement, and verification evidence.
6. Include direct Motion usage, CSS animation, wrappers, imperative map elements, and bespoke overlays—not only shared components.

**Exit:** a complete migration inventory, compatibility baseline, and reproducible web/native build environment.

### Step 2 — Create package boundaries and packed-consumer fixtures

1. Add independent core, web, native, presets, and integration builds.
2. Preserve the current root exports and old installation behavior.
3. Add consumers that install an actual packed tarball: existing-root web, new web, Node/core, Expo, and bare RN.
4. Add dependency-graph checks preventing cross-platform imports.
5. Keep examples private and outside the published runtime bundle.

**Exit:** every entrypoint resolves correctly without installing the other platform’s engines.

### Step 3 — Extract and consolidate existing SplitIn motion

1. Move reusable Apple presets, generic entrances, stagger, number/text effects, tilt/flip mechanics, swipe utilities, and reward effects into the appropriate package layers.
2. Maintain an explicit old-to-new export map; preserve differing presets that happen to share names.
3. Separate pure calculations from browser targeting, router logic, app stores, and branded styling.
4. Replace fixed unmount timers with actual animation completion.
5. Implement live reduced-motion updates, safe SSR imports, and immediate final-state rendering when motion is disabled.
6. Keep SplitIn compatibility facades while consumers migrate.

**Exit:** extracted behavior is covered by compatibility tests and remains usable by existing web consumers.

### Step 4 — Implement the common interaction infrastructure

1. Implement gesture ownership, axis locking, cancellation, and scroll arbitration.
2. Track position and velocity through interruption and retargeting.
3. Use one controller for a surface’s motion; prevent nested wrappers from independently animating the same transform.
4. Implement snap-target selection and boundary resistance as shared policies, with each engine driving frames.
5. Scope haptic deduplication to the provider/interaction and trigger feedback at semantic events.
6. Implement focus restoration, accessible names, non-gesture alternatives, and overlay/back priority.
7. Add cleanup for unmount, backgrounding, pointer cancellation, and motion-policy changes.

**Exit:** both adapters pass the same interaction-contract tests.

### Step 5 — Build the complete interaction catalog

Each pattern must have web/native implementations, a lab example, accessibility behavior, interruption tests, and documented configuration.

| Pattern | Required behavior |
|---|---|
| Press compression | Default visual scale of 0.97 while pressed; release/cancel returns smoothly; disabled controls remain inert. |
| Mechanical press | Default 3-unit visual displacement with compressed shadow; preserve the hit area; offer compression as an explicit option. |
| Sliding selection | A measured indicator moves and resizes between items; selection and keyboard focus remain controlled by the host component. |
| Elastic sheets | Configurable snap points, drag resistance, velocity-aware settling, nested scrolling, keyboard avoidance, safe areas, and optional dismissal endpoint. |
| Momentum and snapping | Horizontal/vertical movement, bounded decay, velocity-aware target selection, and explicit first/last-item behavior. |
| Interactive dismissal | Finger-linked progress, threshold/velocity commitment, cancellation back to the current source, and synchronized backdrop/content. |
| Lift, drag, and settle | Single-container lists and photo grids, stable item IDs, edge autoscroll, keyboard/accessibility move actions, and cancellation restoration. |
| Smooth layout reflow | Insert/remove/resize/reorder transitions that preserve readable content and avoid unnecessary text scaling. |
| Anchored menu expansion | Trigger-based transform origin, viewport collision handling, focus ownership, Escape/back dismissal, and repositioning on resize. |
| Favorite reaction | Controlled selected state, press/fill/rebound sequence, disabled/pending handling, and graceful rollback when the host rejects the action. |
| Progress settling | Animate truthful progress; keep decorative bounce separate so displayed progress never exceeds the real value. |
| Squash/stretch/anticipation | Finite configurable sequences on an inner visual layer, preserving layout and touch targets. |
| Coordinated rewards | Cancellable badge/particle/count/haptic sequence, seeded particles, deduplication by event ID, and host-controlled confirmed state. |

Use existing accessible web primitives for dialog/menu semantics. Native components implement corresponding platform accessibility and back behavior.

Do not add haptics twice where existing SplitIn components already emit them. Do not make passive cards appear interactive.

### Step 6 — Build reversible surface expansion and routing

1. Generalize the existing card morph into a persistent transition host.
2. Support fullscreen expansion, anchored expansion, and the existing desktop right-edge behavior.
3. Animate measured geometry, clipping, corner radius, backdrop, and content reveal from one coordinated progress value.
4. Preserve the image’s aspect ratio and existing gentle zoom-out effect.
5. Support open, close, reverse, rapid retargeting, viewport changes, and source remeasurement.
6. Use logical start/end placement in the general API; retain explicit right-edge placement in SplitIn’s existing desktop flow.
7. Add React Router and React Navigation integrations for push, pop, back, direct entry, and cancelled navigation.
8. Keep navigation history changes single-owner and commit them once.
9. Handle missing/offscreen sources with a documented fade/settle fallback and safe focus destination.

Use the persistent host for production morphing. Reanimated’s built-in cross-screen shared-element transition remains experimental and will not be a release dependency. [Reanimated limitations](https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/overview/)

### Step 7 — Establish persistent video ownership

Complete this before migrating listing/media expansion.

1. Register source and destination slots using stable listing/media/revision IDs.
2. Keep the active web video element under one stable parent throughout inline, expanded, route, and return states.
3. Animate the media host’s geometry and clipping; do not change portal targets or remount the player during the transition.
4. Preserve current time, play/pause intent, mute, playback rate, captions, and one analytics owner.
5. Keep the current rendition during expansion; a higher-resolution `src` replacement must not be triggered merely by opening.
6. On native, retain one player and rendering surface under the persistent host. Use `expo-video` in the example integration while keeping the package media contract provider-independent.
7. Keep browser/OS fullscreen, picture-in-picture, and recovery paths distinct from card expansion.
8. Validate Android texture/surface clipping behavior and avoid overlapping duplicate video surfaces. [Expo video behavior](https://docs.expo.dev/versions/latest/sdk/video/)

**Exit:** real device/browser evidence shows continuity through open → route → back, with no duplicate audio, player reset, or new autoplay attempt.

### Step 8 — Add imperative integrations and extension documentation

1. Add an imperative web animation binding with explicit disposal for elements outside React.
2. Apply map-marker press/selection effects to an inner visual wrapper; Mapbox retains control of the root positioning transform.
3. Preserve marker focus, Enter/Space activation, selection, analytics, and cleanup.
4. Provide generic map-marker recipes in the native demo without making a map SDK a core dependency.
5. Document the Swift/Kotlin extension contract: capability discovery, start/retarget/cancel/dispose, completion, reduced motion, and fallback.
6. Demonstrate the contract with a TypeScript test double; do not ship speculative native bridges.

### Step 9 — Build the motion lab and recipes

Deliver a shared scenario catalog rendered by the web and native examples.

Include:

- Every catalog pattern and existing extracted preset family.
- Physics controls, reset, interruption, reversal, and repeated-action controls.
- Reduced-motion, RTL, large-text, and disabled/pending states.
- Mobile/desktop layouts and touch/mouse/keyboard interactions.
- Listing/media, dashboard, onboarding, and reward recipes.
- Source snippets and configuration export.
- Local deterministic assets for repeatable testing.
- Development-only lifecycle and performance diagnostics.

Expand SplitIn’s developer-tools experience using the package examples. Keep gallery code out of normal production entry bundles.

### Step 10 — Migrate all interactive SplitIn UI behind flags

Use the existing feature-flag infrastructure, with a master motion-system flag and family-level flags, initially off. Document that existing environment flags require a deployment to change.

Migrate in these waves:

1. **Press, selection, and forms:** buttons, toggles, checkboxes, radios, switches, tabs, sliders, progress, and validation feedback.
2. **Cards and containers:** dashboard/Bento cards, both listing-card families, application cards, reward cards, and animated wrappers.
3. **Overlays and navigation:** menus, popovers, dialogs, sheets, drawers, sidebars, mobile navigation, notifications, and messaging overlays.
4. **Discovery and media:** map markers, reels, listing grids, desktop detail expansion, mobile detail surfaces, and video controls.
5. **Remaining interactions:** list/photo-grid reorder, layout reflow, favorites, numbers, text, badges, and reward sequences.

For every wave:

- Replace the old motion/gesture owner when the new flag is enabled.
- Preserve the legacy path when disabled.
- Preserve refs, `asChild`, accessibility, input exclusions, analytics, and business behavior.
- Update the coverage manifest with actual runtime evidence.

**Exit:** no unexplained interactive motion consumers remain in scope. Marketing and video-production surfaces remain outside this migration.

### Step 11 — Qualify the package and application integration

Complete the test and performance gates below. Fix failures before promoting the affected implementation wave.

### Step 12 — Publish beta, complete rollout validation, and release stable

1. Publish the first qualified package prerelease to npm’s `beta` tag using the existing OIDC/provenance workflow.
2. Mark corresponding GitHub releases as prereleases.
3. Install the published package into SplitIn with an exact version and lockfile update.
4. Run the broad feature-flagged pilot and complete the coverage manifest.
5. Publish the stable release only after all platform and physical-device gates pass.
6. Verify registry version, dist-tags, tarball contents, provenance, GitHub release, and fresh consumer installation.
7. Retain a documented rollback to the previous package and disabled feature flags.

Use a 1.0 release line for the complete contract, subject to the initial registry check confirming the version is unused. Keep beta and stable promotion separate.

## 4. Testing and acceptance criteria

| Area | Required evidence |
|---|---|
| Core | Unit/velocity conversion, snap selection, boundary behavior, cancellation, lifecycle ordering, and deterministic reward sequencing. |
| Compatibility | Existing root imports and callbacks remain valid; Apple exports are mapped; legacy gesture thresholds are preserved through adapters. |
| Packaging | Packed-tarball tests for Node/core, React 18/19 web, Vite, SSR, Expo Metro, and bare RN; no platform dependency/type leakage. |
| Web | Playwright coverage in Chromium, WebKit, and Firefox; real mobile Safari/Chrome and installed-PWA checks for gestures/media. |
| Native | Jest/RN Testing Library contract tests, Maestro flows, and iOS/Android release builds. |
| Accessibility | Live reduced-motion changes, keyboard navigation, focus return, screen-reader actions, RTL, enlarged text, and non-drag alternatives. |
| Interaction conflicts | Nested scrolling, maps, sliders, text selection, inputs, video controls, drawers, tabs, and edge-back arbitration. |
| Morphing | Exact source/destination landing, rapid reversals, resize/orientation changes, direct entry, route failure, missing sources, and nested overlays. |
| Video | Stable player/surface identity, advancing playback time, preserved user state, single audio stream, and single analytics ownership. |
| Rollout | Every migrated family tested flag-off and flag-on; rollback restores the prior interaction path. |

**Performance gates**

- Test physical release builds on at least one iPhone and one midrange Android.
- Record device model, OS, refresh rate, build SHA, and scenario.
- Run five warmed repetitions of sheet-plus-scroll, rapid card reversal, reorder/autoscroll, and reward scenes.
- Target at least 99% of frames meeting the display deadline in those controlled scenes; investigate reproducible stalls of 100 ms or more.
- Confirm no per-frame React state updates or JS/native bridge traffic in native animation execution.
- Run 100 open/close or drag/settle cycles; verify listener cleanup, inactive animations after unmount, and no sustained retained-memory growth.
- Treat 120 Hz quality as unqualified until tested on corresponding hardware.
- Use platform traces for native frame pacing; simulator success alone does not establish physical-device performance.

Physical-device or toolchain unavailability blocks **stable qualification**, while independent implementation and automated verification can continue.

## 5. Delegation, milestones, and completion

The read-only planning audits have already been delegated and completed. For implementation, use the available **GPT-6 Astra at low reasoning effort** for bounded tasks; a separate lower-tier Astra model is not exposed.

| Workstream | Ownership | Dependency |
|---|---|---|
| Lead | Public contracts, architecture, integration decisions, review, release gates. | Owns the shared specification throughout. |
| Agent A | Existing preset extraction, compatibility facades, core calculations/tests. | Baseline and export map approved. |
| Agent B | Web components, imperative bindings, browser examples/tests. | Shared contracts and component ownership assigned. |
| Agent C | Native adapter, Expo/bare fixtures, native examples/tests. | Shared contracts and native baseline established. |

After the adapters stabilize, reassign bounded agents to SplitIn migration waves, test expansion, and documentation. Keep shared manifests, dependency changes, and release workflows under one owner. Use separate branches/worktrees and exact-path integration to prevent conflicting edits.

**Milestone acceptance**

1. **Foundation:** compatibility map, entrypoints, toolchains, and packed consumers pass.
2. **Interaction catalog:** all 13 patterns work on web, iOS, and Android.
3. **Spatial/media continuity:** reversible morphing, route adapters, and persistent video pass device checks.
4. **Integrated beta:** npm beta is consumed by SplitIn; all interactive application families have flagged implementations.
5. **Stable:** coverage is complete, accessibility and physical-device gates pass, rollback is verified, and published artifacts install correctly.

Completion requires implemented behavior and recorded verification for each milestone. Source presence, a successful package build, or a populated inventory alone does not establish completion.
