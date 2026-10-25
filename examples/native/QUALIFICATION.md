# Native implementation evidence and remaining gates

Verified locally using Node 24 and actual npm packages (2026-10-24):

- Expo 58.0.19; React 19.3.0; React Native 0.88.0; Reanimated 4.7.1; Worklets 0.13.0; Gesture Handler 3.3.x. Exact fixture lockfiles are checked in.
- Native adapter and Expo application TypeScript compilation with RN's generated native types.
- Expo iOS and Android Metro/Hermes exports from checkout source and a packed package.
- Bare React Native Android Metro bundle from source and a packed package, with no Expo imports.
- Eight initial Jest/RN Testing Library contracts passed: disabled controls, controlled favorite rejection, accessibility reorder, live reduced motion and cleanup, truthful progress, lifecycle terminal semantics, persistent surface identity, and cancellation of stale source measurement.
- Retained-overlay/reversal, non-dismissible sheet, duplicate-dismissal, haptic-driver isolation/spring overrides, background accessibility, and missing-slot hiding without player unmount regression tests also passed. Fourteen native tests now pass across the full run plus focused rerun.

The actual official RN 0.88 native iOS/Android projects are included in the bare fixture. The workflow has packed-consumer checks and manual Android Release / iOS Release simulator compilation. Local Xcode is only CommandLineTools; adb and CocoaPods are unavailable. No device release build or Maestro run was performed locally.

Remaining qualification limits:

- No physical iPhone or midrange Android traces, 100-cycle retained-memory checks, 120 Hz evidence, VoiceOver/TalkBack session, or native playback continuity measurements.
- MediaHost preserves player and surface identity while slots change. Missing/removed active slots hide rendering, pointer targets and accessibility without destroying the player. `onSlotAvailabilityChange` lets the consumer choose pause behavior; the host does not own play/pause intent. Slot geometry is refreshed on activation/layout/orientation; an independently scrolling ancestor moving the active slot without layout requires additional tracking before claiming arbitrary scrolling-media support.
- Sheet content scrolling and handle dragging have separate owners. Pan-anywhere dismissal inside arbitrary nested scroll surfaces requires host arbitration; default DismissibleSurface should not wrap an independently scrolling viewport without explicit interaction design.
- The native route adapter suppresses stale pending pushes and respects prevented beforeRemove events. Native interactive pop interruption still needs a real navigator/device qualification run.
- The lab now has shared catalog labels, preset family and stiffness/damping/mass controls, reset, disabled/pending, local RTL layout, large-text, and configuration export. Real OS RTL/large-text matrices, all extracted legacy preset scenarios and full navigator route/back media recipes remain additional qualification.

Reward event and semantic haptic deduplication retain only the latest 512 keys. Reusing an older evicted event ID may replay it. `confirmed=false` cancels the active particle animation and immediately hides its decorative progress.

## Native engineering follow-up (2026-10-25)

See `../../docs/native-completion.md` for added APIs and explicit limits. Source typecheck and the expanded 20-contract Jest run passed on Node 24.13.0. Scrolling media now accepts worklet-updated ancestor offsets; arbitrary ancestor discovery remains outside the host. The lab now contains a real React Navigation stack-router media recipe, direct-entry option, map-marker recipe, bounded momentum, and a native preset reversal gallery. Physical playback continuity, gesture competition and performance remain unqualified.
