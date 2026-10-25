# Native engineering additions

The adapter keeps frame calculations in Reanimated worklets. JavaScript receives semantic completion/haptic boundaries, not position frames.

## Public additions

- `TransitionHost.mode`: `fullscreen`, `anchored`, logical `start`/`end`, and physical `right`. Explicit `destination` remains supported. `targetSlot` measures a registered destination, including after orientation/layout changes. `expandedContent` reveals from the same progress as geometry, corner radius and backdrop. Missing source entry settles at the destination rather than expanding from a zero rectangle.
- `MediaSlot.scrollOffset`: a shared `{x, y}` value, populated by `useAnimatedScrollHandler`. The host subtracts scroll delta from the measured position on the UI thread. Sum offsets for multiple scrolling ancestors. Keep the host above the scroll viewport and navigator. This API does not discover arbitrary ancestors or recover transforms applied by unrelated code.
- `MomentumSurface`: bounded points, horizontal/vertical axis, shared `MomentumPolicy`, cancellation restoration and accessibility increment/decrement. `SnapCarousel` retains native ScrollView decay; supports deceleration/interval configuration, clamps reported indices and deduplicates settled feedback.
- `GestureOwnershipScope`/`useGestureOwnership`: shared UI-thread ownership for dismissal, momentum and reorder. Dismissal accepts `scrollOffset` (vertical scalar) and fails its recognizer when nested content has already scrolled; `gestureEnabled` provides explicit consumer arbitration. Sheets continue to assign handle pan and content scrolling separate owners.
- Press `compression`/`displacement`; anticipation `squash`/`stretch`/`anticipationMs`; reward `seed`/`particleCount`/`duration`. Reward confirmation remains host-controlled, cancellation hides decoration, and event IDs deduplicate across policy changes.
- `PresetSurface`/`nativePresetNames`: fade, directional slides, scale, pop, flip, rotate and an explicit opacity fallback for blur. These are native equivalents by behavior, not a claim that DOM variant objects or browser blur have native parity.
- `MotionProvider.diagnostics`, `nativeCapabilities()`/`getNativeCapabilities()`, and `useMotionCancellation`. Optional haptics report unavailable unless configured. Native shared-element transitions are deliberately unavailable. Capability results describe implementation, not device qualification.

## Runnable recipes

`examples/native/RouteRecipe.tsx` uses the installed React Navigation `StackRouter`, persistent screen descriptors and one `expo-video` player/view above the navigator. Listing → detail → back changes active media slots; direct entry is available via `directEntry`. The navigator has real history and native navigation events, but is a deliberately minimal custom navigator without a platform edge-pop recognizer. Both video recipes use Android `textureView`, native controls and a deterministic local video. No route action replaces the media source or mounts another player.

The native lab also demonstrates marker effects on an inner pressable while the positioned outer wrapper remains owned by the map, all thirteen interaction catalog patterns, preset reversal, RTL layout, reduced motion, disabled/pending controls, spring controls, reset and configuration export.

## Verification and limits

Node 24 source TypeScript and 20 Jest/RN Testing Library contracts pass, including new bounded carousel indices/haptic deduplication, non-drag momentum endpoints, measured destination lifecycle diagnostics, optional capabilities reward event/listener cleanup and cancelled destination measurement. Tests use the official Reanimated mock, so they do not establish frame pacing or UI-thread rendering correctness.

Device acceptance remains required: physical release builds, native interactive-pop interruption, VoiceOver/TalkBack, nested gesture competition, OS RTL/large text, video advancing-time/audio continuity, Android texture clipping, 100-cycle memory/listener traces and 60/120 Hz traces. Source/Metro success is not playback or physical-device evidence.

Known bounded implementation differences: sheets use handle-only pan; arbitrary pan-anywhere nested-scroll transfer is consumer-owned. Native preset gallery does not expose all legacy web `Variants` objects as native props. Core has no map SDK or speculative Swift/Kotlin bridge dependency.
