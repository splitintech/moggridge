/** Portable contracts: distances are logical units, velocities units/second, durations milliseconds. */
export interface SpringSpec {
  stiffness: number;
  damping: number;
  mass: number;
  overshootClamping?: boolean;
}
export type MotionFamily = "precise" | "soft" | "celebratory";
export type MotionPolicy = "system" | "always" | "never";
export const motionPresets: Record<MotionFamily, SpringSpec> = {
  precise: { stiffness: 500, damping: 30, mass: 0.5 },
  soft: { stiffness: 280, damping: 32, mass: 1 },
  celebratory: { stiffness: 300, damping: 18, mass: 0.8 },
};
export function resolveReducedMotion(
  policy: MotionPolicy,
  system: boolean,
): boolean {
  return policy === "always" || (policy === "system" && system);
}
export interface ResolvedMotionPolicy {
  enabled: boolean;
  reducedMotion: boolean;
}
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export type HapticIntent =
  | "press"
  | "selection"
  | "snap"
  | "success"
  | "warning"
  | "error"
  | "drag-start"
  | "drag-end";
export type HapticDriver = (intent: HapticIntent) => void | Promise<void>;
export interface MotionEvent {
  id: number;
  phase: "start" | "complete" | "cancel";
  reason?: string;
}
export function clamp(value: number, min: number, max: number): number {
  "worklet";
  if (min > max) throw new RangeError("Minimum exceeds maximum");
  return Math.min(max, Math.max(min, value));
}
export const millisecondsToSeconds = (value: number): number => value / 1000;
export const secondsToMilliseconds = (value: number): number => value * 1000;
export const legacyVelocityToUnitsPerSecond = (value: number): number =>
  value * 1000;
export const unitsPerSecondToLegacyVelocity = (value: number): number =>
  value / 1000;
export function snapTarget(
  position: number,
  velocity: number,
  points: readonly number[],
  projectionMs = 180,
): number {
  "worklet";
  if (
    !points.length ||
    ![position, velocity, projectionMs, ...points].every(Number.isFinite) ||
    projectionMs < 0
  )
    throw new RangeError(
      "Snap inputs must be finite, with points and nonnegative projection",
    );
  const projected = position + (velocity * projectionMs) / 1000;
  return points.reduce((best, point) => {
    const distance = Math.abs(projected - point),
      prior = Math.abs(projected - best);
    return distance < prior ||
      (distance === prior && (velocity > 0 ? point > best : point < best))
      ? point
      : best;
  });
}
/** Continuous rubber band with a finite asymptotic overscroll distance. */
export function rubberBand(
  value: number,
  min: number,
  max: number,
  limit = 80,
): number {
  "worklet";
  if (limit < 0) throw new RangeError("Resistance limit must be nonnegative");
  const bounded = clamp(value, min, max),
    excess = value - bounded;
  return limit === 0
    ? bounded
    : bounded + (excess * limit) / (limit + Math.abs(excess));
}
export const resistBounds = rubberBand;
export function interpolateRect(from: Rect, to: Rect, progress: number): Rect {
  const p = clamp(progress, 0, 1),
    lerp = (a: number, b: number) => a + (b - a) * p;
  return {
    x: lerp(from.x, to.x),
    y: lerp(from.y, to.y),
    width: lerp(from.width, to.width),
    height: lerp(from.height, to.height),
  };
}
/** The renderer samples position/velocity. No engine or frame loop lives in core. */
export function createMotionLifecycle(onEvent?: (event: MotionEvent) => void) {
  let sequence = 0,
    active: number | null = null,
    disposed = false;
  let state = { position: 0, velocity: 0, target: 0 };
  const events: MotionEvent[] = [];
  let notifying = false;
  const notify = (...next: MotionEvent[]) => {
    events.push(...next);
    if (notifying) return;
    notifying = true;
    try {
      while (events.length) {
        const event = events.shift()!;
        onEvent?.(event);
      }
    } finally {
      notifying = false;
    }
  };
  const terminate = (
    phase: "complete" | "cancel",
    id = active,
    reason?: string,
  ) => {
    if (id === null || id !== active) return false;
    active = null;
    notify({ id, phase, ...(reason ? { reason } : {}) });
    return true;
  };
  const start = (target = state.target) => {
    if (disposed) throw new Error("Motion lifecycle is disposed");
    if (!Number.isFinite(target)) throw new RangeError("Target must be finite");
    // Queue the replacement before notifying cancellation so reentrant listeners cannot orphan a run.
    const previous = active,
      id = ++sequence;
    state = { ...state, target };
    active = id;
    notify(
      ...(previous !== null
        ? [{ id: previous, phase: "cancel" as const, reason: "retarget" }]
        : []),
      { id, phase: "start" },
    );
    return id;
  };
  return {
    get snapshot() {
      return { ...state, runId: active };
    },
    start,
    retarget: start,
    sample(id: number, position: number, velocity: number) {
      if (id !== active) return false;
      if (![position, velocity].every(Number.isFinite))
        throw new RangeError("Samples must be finite");
      state = { ...state, position, velocity };
      return true;
    },
    complete(id: number) {
      if (id !== active) return false;
      state = { position: state.target, target: state.target, velocity: 0 };
      return terminate("complete", id);
    },
    cancel(reason = "cancelled") {
      return terminate("cancel", active, reason);
    },
    dispose() {
      disposed = true;
      terminate("cancel", active, "dispose");
    },
  };
}
export type GestureAxis = "x" | "y";
export interface GestureClaim {
  owner: string;
  axis: GestureAxis;
  priority?: number;
  cancel?: () => void;
}
export function createGestureArbiter() {
  let owner: GestureClaim | null = null;
  return {
    get owner() {
      return owner ? { ...owner } : null;
    },
    claim(next: GestureClaim) {
      if (owner?.owner === next.owner) return true;
      if (owner && (next.priority ?? 0) <= (owner.priority ?? 0)) return false;
      const previous = owner;
      owner = next;
      previous?.cancel?.();
      return owner === next;
    },
    release(id: string) {
      if (owner?.owner !== id) return false;
      owner = null;
      return true;
    },
    cancel() {
      const previous = owner;
      owner = null;
      previous?.cancel?.();
    },
  };
}
export function lockGestureAxis(
  dx: number,
  dy: number,
  threshold = 8,
  dominance = 1.2,
): GestureAxis | null {
  "worklet";
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return null;
  return Math.abs(dx) > Math.abs(dy) * dominance
    ? "x"
    : Math.abs(dy) > Math.abs(dx) * dominance
      ? "y"
      : null;
}
/** Positive finger movement scrolls toward the start. At the edge the sheet can claim it. */
export function shouldScrollConsume(
  delta: number,
  offset: number,
  extent: number,
  tolerance = 1,
): boolean {
  "worklet";
  return delta > 0
    ? offset > tolerance
    : delta < 0
      ? offset < extent - tolerance
      : false;
}
export function createHapticEmitter(
  driver?: HapticDriver,
  capacity = 256,
  onError?: (error: unknown) => void,
) {
  const seen = new Set<string>();
  return {
    emit(intent: HapticIntent, eventId?: string) {
      if (!driver || (eventId !== undefined && seen.has(eventId))) return false;
      if (eventId !== undefined) {
        seen.add(eventId);
        if (seen.size > Math.max(1, capacity))
          seen.delete(seen.values().next().value!);
      }
      try {
        Promise.resolve(driver(intent)).catch((error) => onError?.(error));
      } catch (error) {
        onError?.(error);
      }
      return true;
    },
    reset() {
      seen.clear();
    },
  };
}
export function moveItem<T>(
  items: readonly T[],
  from: number,
  to: number,
): T[] {
  if (
    ![from, to].every(Number.isInteger) ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  )
    throw new RangeError("Indices must identify items");
  const next = [...items],
    [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}
export function createReorderSession<T>(initial: readonly T[]) {
  const original = [...initial];
  let current = [...initial],
    closed = false;
  return {
    get value() {
      return [...current];
    },
    update(next: readonly T[]) {
      if (closed) return false;
      const counts = new Map<T, number>();
      for (const item of original)
        counts.set(item, (counts.get(item) ?? 0) + 1);
      for (const item of next) counts.set(item, (counts.get(item) ?? 0) - 1);
      if (
        next.length !== original.length ||
        [...counts.values()].some((count) => count !== 0)
      )
        throw new Error("Reorder must preserve items");
      current = [...next];
      return true;
    },
    commit() {
      closed = true;
      return [...current];
    },
    cancel() {
      if (!closed) {
        closed = true;
        current = [...original];
      }
      return [...current];
    },
  };
}
export function edgeScrollVelocity(
  pointer: number,
  min: number,
  max: number,
  edge = 40,
  speed = 600,
): number {
  "worklet";
  if (max <= min || edge <= 0) return 0;
  const band = Math.min(edge, (max - min) / 2);
  return pointer < min + band
    ? -speed * clamp((min + band - pointer) / band, 0, 1)
    : pointer > max - band
      ? speed * clamp((pointer - max + band) / band, 0, 1)
      : 0;
}
export interface RewardParticle {
  x: number;
  y: number;
  rotation: number;
  delayMs: number;
  durationMs: number;
}
export function createRewardParticles(
  seed: number,
  count = 16,
): RewardParticle[] {
  if (!Number.isInteger(count) || count < 0 || count > 10000)
    throw new RangeError("Invalid particle count");
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    x: (random() - 0.5) * 240,
    y: -40 - random() * 140,
    rotation: random() * 720 - 360,
    delayMs: random() * 120,
    durationMs: 600,
  }));
}
export const truthfulProgress = (
  displayed: number,
  confirmed: number,
): number => clamp(displayed, 0, clamp(confirmed, 0, 1));
export const interactionCatalog = [
  "press-compression",
  "mechanical-press",
  "sliding-selection",
  "elastic-sheet",
  "momentum-snap",
  "interactive-dismissal",
  "lift-drag-settle",
  "layout-reflow",
  "anchored-menu",
  "favorite-reaction",
  "progress-settling",
  "anticipation",
  "coordinated-rewards",
] as const;
export type InteractionPattern = (typeof interactionCatalog)[number];
export interface MotionCapability {
  pattern: InteractionPattern;
  status: "supported" | "platform-specific" | "unavailable";
  reason?: string;
}
/** A capability declaration is not evidence of device qualification. */
export function capabilityCatalog(
  support: Partial<
    Record<InteractionPattern, Omit<MotionCapability, "pattern">>
  > = {},
): MotionCapability[] {
  return interactionCatalog.map((pattern) => ({
    pattern,
    ...(support[pattern] ?? {
      status: "unavailable",
      reason: "Adapter has not declared support",
    }),
  }));
}

/** Engine-independent bounded decay projection; adapters own frame integration. */
export interface MomentumPolicy {
  projectionMs?: number;
  maxVelocity?: number;
  /** Clamp prevents wraparound at the first/last item. */
  boundary?: "clamp";
}
export function resolveMomentumTarget(
  position: number,
  velocity: number,
  points: readonly number[],
  policy: MomentumPolicy = {},
): number {
  "worklet";
  const maximum = policy.maxVelocity ?? 8000;
  if (!Number.isFinite(maximum) || maximum < 0)
    throw new RangeError("Maximum velocity must be finite and nonnegative");
  return snapTarget(
    position,
    clamp(velocity, -maximum, maximum),
    points,
    policy.projectionMs ?? 180,
  );
}
export interface RewardStage {
  id: string;
  atMs: number;
}
/** Stable ordering permits simultaneous stages without losing their declaration order. */
export function rewardTimeline(
  stages: readonly RewardStage[],
  durationMs: number,
): RewardStage[] {
  if (
    !Number.isFinite(durationMs) ||
    durationMs < 0 ||
    stages.some(
      (stage) =>
        !Number.isFinite(stage.atMs) ||
        stage.atMs < 0 ||
        stage.atMs > durationMs,
    )
  )
    throw new RangeError("Reward stages must fit the timeline");
  if (new Set(stages.map((stage) => stage.id)).size !== stages.length)
    throw new Error("Reward stage IDs must be unique");
  return [...stages].sort((a, b) => a.atMs - b.atMs);
}
