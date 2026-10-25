# Architecture and adapter boundaries

One package supplies independent entrypoints. The existing root remains compatible with version 0.1.0 and retains callable `shouldAnimate()`. `/core` contains only portable contracts and policies. `/web` uses Framer Motion 12 and accessible Radix primitives. `/native` uses Reanimated 4 and Gesture Handler under the New Architecture. `/extensions` is a future native-effect contract, not a bridge.

Springs are delegated to existing engines. Distances use CSS pixels or native logical layout units, velocity uses units/second, and shared durations use milliseconds. Each adapter converts engine inputs where needed. Matching behavior and perceived feel is the goal; different platforms are not expected to produce identical frame trajectories.

`MotionProvider` controls enabled/reduced-motion policy, family presets and semantic haptic dispatch. `system` follows accessibility preferences, `always` always reduces motion, and `never` explicitly opts out of reduction. Reduced motion does not disable essential interaction state. Haptic drivers are optional; consumers retain business confirmation and analytics ownership.

Use `TransitionHost` above changing route views. A single host coordinates measured geometry and source restoration; do not stack independent scale animations around its surface. Route integrations own a navigation transaction once. Missing sources use a fallback instead of stale geometry. Reanimated experimental shared elements are not used.

`MediaHost` owns one rendering surface under a stable parent. `MediaSlot` supplies geometry, not a new player or portal target. A route change must not change the media key, revision, source URL, or host identity. Native examples use expo-video while the runtime package accepts a provider-owned rendering node. Captions, playback rate, mute and analytics remain on that same player.

Map SDKs retain the root positioning transform. `bindElementMotion` targets an inner visual wrapper and must be destroyed with its marker. Keep pointer, keyboard, and selection ownership explicit.

Legacy Apple objects are compatibility exports under `/presets/apple`; use `createApplePresets` with live policy for new code. Generic presets, entrances and text effects live in separate subpaths so identically named exports cannot overwrite each other.
