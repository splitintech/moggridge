# Card Motion Studio consolidation

The original card studio and the newer interaction catalog share one package: `@splitin/react-mobile-interactions`. There is no second motion package.

## Public API and preserved tuning

- `/presets` and `/core` export `cardMotionPresets`. Original surface tuning is stiffness 260, damping 32, mass 1.1, restDelta 0.0001, restSpeed 0.001. Slide tuning is stiffness 220, damping 30, mass 1.
- `/web` exports `useSurfaceImageScale(progress, options?)`. It follows the host's reversible progress and the original 0 / 0.6 / 1 -> 1.12 / 1.06 / 1 scale curve. Options can disable the effect or supply three scale values. Scaling is uniform; spring overshoot is clamped. Disabled/reduced policy settles at the final scale. Changing the policy or progress source updates the subscription, and unmount disposes it.
- `/web` exports `SurfaceSlideTrack`. The host controls `index` and `slideCount`, slide accessibility and navigation controls. Slides must occupy 100% of the track width. Optional `spring` overrides the original tuning. Indices clamp to valid bounds; disabled/reduced motion and document backgrounding settle immediately. Retargeting and unmount stop the old animation. Frames do not update React state.
- `MorphingSurface` / `TransitionHost` accept per-request `spring` tuning so original specimens retain their feel without changing the global catalog defaults. `chrome="custom"` keeps accessible host labels but lets the application supply its own visible close control. The original studio uses a full-frame content wrapper and safe-area-aware close button; it no longer collapses to zero height inside the host.

```tsx
import { cardMotionPresets } from '@splitin/react-mobile-interactions/presets';
import { MorphingSurface, SurfaceSlideTrack, useSurfaceImageScale } from '@splitin/react-mobile-interactions/web';
// Place under MotionProvider and TransitionHost.
// Inside a content component:
const scale = useSurfaceImageScale(progress);
// Use scale on a motion.img; preserve aspect ratio with object-fit.
// <SurfaceSlideTrack index={index} slideCount={slides.length}>...</SurfaceSlideTrack>
// <MorphingSurface spring={cardMotionPresets.surface} ... />
```

## One shared lab

The web workshop now has a **Card studies** tab alongside Catalog, Spatial & media, and Recipes. It contains the original listing-to-fullscreen, button-to-right-edge and pill-to-right-edge studies, including slide controls and image pullback. The three photographs are local example assets, carried over from the existing SplitIn studio. Examples and photographs are not published in the runtime tarball.

SplitIn's `scripts/motion/sync-lab.mjs` copies the canonical workshop, card-study recipe, styles and deterministic assets. `/dev/motion-lab` therefore renders the same studies using the installed tarball, not package source aliases. The branded `/dev/card-motion` page also imports the new public APIs. Its layout, text and original CSS remain application-owned. The development-only studio has a local motion policy, matching the package lab; OS reduced motion remains reactive.

The flag-off `LegacyMorphingSurface` remains in SplitIn intentionally as the rollout fallback. It now consumes shared spring tuning. This is a rollback implementation, not a competing package. Main production flags remain off.

## Verification and release boundary

Regression coverage lives in `tests/web/card-motion.test.tsx`, `tests/browser/card-studies.spec.ts` and `tests/consumers/shared-context.cjs`. SplitIn adds `scripts/motion/verify-card-studies.cjs`, usable with `MOTION_BASE_URL`, to exercise the installed package in the original studio and synchronized lab at desktop and phone viewport sizes.

This is an unpublished local beta artifact. Previous release qualification manifests must not be applied to this changed source digest. This extraction does not establish native release-build, physical-device, installed-PWA or production-rollout qualification. The new DOM slide track and image hook are web APIs; portable tuning/calculations are exposed through `/core` for native consumers.
