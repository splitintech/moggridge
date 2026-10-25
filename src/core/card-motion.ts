import type { SpringSpec } from './motion';

export interface SurfaceSpringSpec extends SpringSpec {
  restDelta?: number;
  restSpeed?: number;
}

/** Original Card Motion Studio tuning, shared by recipes and adapters. */
export const cardMotionPresets = {
  surface: { stiffness: 260, damping: 32, mass: 1.1, restDelta: 0.0001, restSpeed: 0.001 },
  slide: { stiffness: 220, damping: 30, mass: 1 },
  imageProgress: [0, 0.6, 1],
  imageScale: [1.12, 1.06, 1],
} as const;

/** Clamp spring overshoot so the image never shrinks below its final size. */
export function surfaceImageScale(progress: number, scales: readonly [number, number, number] = cardMotionPresets.imageScale) {
  const p = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 1;
  const midpoint = cardMotionPresets.imageProgress[1];
  return p <= midpoint
    ? scales[0] + (scales[1] - scales[0]) * p / midpoint
    : scales[1] + (scales[2] - scales[1]) * (p - midpoint) / (1 - midpoint);
}

export function clampSlideIndex(index: number, count: number) {
  const last = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0) - 1);
  return Math.max(0, Math.min(last, Math.trunc(Number.isFinite(index) ? index : 0)));
}
