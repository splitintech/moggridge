/**
 * Decisions for the finger-following edge swipe back. Distances in px,
 * velocity in px/ms (same unit as the existing drawer gestures).
 */
export const INTERACTIVE_BACK_COMMIT_FRACTION = 1 / 3;
export const INTERACTIVE_BACK_FLICK_PX_PER_MS = 0.5;
/** Ignore samples older than this when measuring release speed. */
const VELOCITY_WINDOW_MS = 100;

export interface TouchSample {
  x: number;
  t: number;
}

/** The drag locks on once it is clearly horizontal and rightward. */
export function shouldLockInteractiveBack(dx: number, dy: number): boolean {
  return dx > 10 && Math.abs(dx) > 1.2 * Math.abs(dy);
}

/** Release speed from the last ~100 ms of movement; positive = rightward. */
export function releaseVelocity(samples: readonly TouchSample[]): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  let first = samples[samples.length - 2];
  for (let index = samples.length - 2; index >= 0; index -= 1) {
    if (last.t - samples[index].t > VELOCITY_WINDOW_MS) break;
    first = samples[index];
  }
  const dt = last.t - first.t;
  return dt > 0 ? (last.x - first.x) / dt : 0;
}

/** Commit past a third of the width, or on a rightward flick; a leftward flick always cancels. */
export function shouldCommitInteractiveBack(progress: number, velocityPxPerMs: number): boolean {
  if (velocityPxPerMs < -0.3) return false;
  return progress >= INTERACTIVE_BACK_COMMIT_FRACTION || velocityPxPerMs >= INTERACTIVE_BACK_FLICK_PX_PER_MS;
}
