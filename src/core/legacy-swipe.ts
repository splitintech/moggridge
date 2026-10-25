/** Compatibility policy: legacy velocities are pixels per millisecond. New controllers use units/second. */
/** Pure swipe intent extracted unchanged from Homes mobileGestures. */
export type SwipeDirection = "left" | "right" | "up" | "down";

export type GesturePoint = {
  x: number;
  y: number;
  time: number;
};

export type GestureThresholds = {
  distance: number;
  restraint: number;
  velocity: number;
  maxDurationMs: number;
  axisRatio: number;
};

export type SwipeResult = {
  direction: SwipeDirection;
  deltaX: number;
  deltaY: number;
  absDeltaX: number;
  absDeltaY: number;
  durationMs: number;
  velocityX: number;
  velocityY: number;
};

export const DEFAULT_GESTURE_THRESHOLDS: GestureThresholds = {
  distance: 64,
  restraint: 52,
  velocity: 0.45,
  maxDurationMs: 900,
  axisRatio: 1.35,
};

export function getSwipeResult(start: GesturePoint, end: GesturePoint): SwipeResult {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const absDeltaX = Math.abs(deltaX);
  const absDeltaY = Math.abs(deltaY);
  const durationMs = Math.max(1, end.time - start.time);
  const horizontal = absDeltaX >= absDeltaY;

  return {
    direction: horizontal ? (deltaX >= 0 ? "right" : "left") : deltaY >= 0 ? "down" : "up",
    deltaX,
    deltaY,
    absDeltaX,
    absDeltaY,
    durationMs,
    velocityX: absDeltaX / durationMs,
    velocityY: absDeltaY / durationMs,
  };
}

export function shouldCommitSwipe(
  result: SwipeResult,
  direction: SwipeDirection | SwipeDirection[],
  thresholds: Partial<GestureThresholds> = {},
): boolean {
  const config = { ...DEFAULT_GESTURE_THRESHOLDS, ...thresholds };
  const allowed = Array.isArray(direction) ? direction : [direction];
  if (!allowed.includes(result.direction)) return false;

  const primary = result.direction === "left" || result.direction === "right"
    ? result.absDeltaX
    : result.absDeltaY;
  const secondary = result.direction === "left" || result.direction === "right"
    ? result.absDeltaY
    : result.absDeltaX;
  const velocity = result.direction === "left" || result.direction === "right"
    ? result.velocityX
    : result.velocityY;

  if (secondary > config.restraint) return false;
  if (primary < config.distance && velocity < config.velocity) return false;
  if (primary <= secondary * config.axisRatio) return false;
  return result.durationMs <= config.maxDurationMs || velocity >= config.velocity;
}

export function shouldPreventScrollForSwipe(
  start: GesturePoint,
  current: GesturePoint,
  axis: "x" | "y",
  ratio = 1.2,
) {
  const dx = Math.abs(current.x - start.x);
  const dy = Math.abs(current.y - start.y);
  return axis === "x" ? dx > 12 && dx > dy * ratio : dy > 12 && dy > dx * ratio;
}
