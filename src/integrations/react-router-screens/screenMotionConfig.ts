import { DEFAULT_SCREEN_MOTION_TOKENS, type ScreenMotionTokens } from "./choreography";

/**
 * Screen motion values. Full-screen moves (push, pop, slide-up, expand, space)
 * use the page spring below; tabs and fades use the MotionProvider's policy
 * spring. A tuning panel may override them with `setScreenMotionOverrides`.
 */
export interface SpringValues {
  stiffness: number;
  damping: number;
  mass: number;
}

/**
 * Page spring for full-screen moves: stiffness 280, damping 32, mass 1 (the
 * Apple "smooth" page spring), approved for SplitIn on 2026-11-13 together with
 * DEFAULT_SCREEN_MOTION_TOKENS (parallax 0.3, pushDim 0.12, tabShift 28,
 * spaceScale 0.96).
 */
export const DEFAULT_PAGE_SPRING: Readonly<SpringValues> = { stiffness: 280, damping: 32, mass: 1 };

export interface ScreenMotionOverrides {
  smooth?: Partial<SpringValues>;
  tokens?: Partial<ScreenMotionTokens>;
  /** 1 = real speed; 3 = three times slower (shape of the spring unchanged). */
  slowMotion?: number;
}

let overrides: ScreenMotionOverrides = {};

export function setScreenMotionOverrides(next: ScreenMotionOverrides) {
  overrides = next;
}

export function getScreenMotionOverrides(): ScreenMotionOverrides {
  return overrides;
}

/**
 * Slowing a spring by `s` without changing its feel: mass × s², damping × s
 * keeps the damping ratio and stretches time by s.
 */
function slowed<T extends SpringValues>(spring: T): T {
  const s = overrides.slowMotion && overrides.slowMotion > 0 ? overrides.slowMotion : 1;
  if (s === 1) return spring;
  return { ...spring, mass: spring.mass * s * s, damping: spring.damping * s };
}

export function smoothScreenSpring() {
  const base = DEFAULT_PAGE_SPRING;
  return slowed({
    type: "spring" as const,
    stiffness: overrides.smooth?.stiffness ?? base.stiffness,
    damping: overrides.smooth?.damping ?? base.damping,
    mass: overrides.smooth?.mass ?? base.mass,
  });
}

/** The app policy spring (or `{ duration: 0 }` when motion is off), slowed in the lab only. */
export function preciseScreenSpring<T extends object>(policyTransition: T): T {
  const candidate = policyTransition as Partial<SpringValues> & { type?: string };
  if (candidate.type !== "spring" || typeof candidate.stiffness !== "number") return policyTransition;
  return slowed({
    ...policyTransition,
    stiffness: candidate.stiffness,
    damping: candidate.damping ?? 10,
    mass: candidate.mass ?? 1,
  }) as T;
}

export function screenMotionTokens(): ScreenMotionTokens {
  return { ...DEFAULT_SCREEN_MOTION_TOKENS, ...overrides.tokens };
}

/** Reduced-motion crossfade duration in seconds. */
export function reducedFadeDuration() {
  return 0.15 * (overrides.slowMotion && overrides.slowMotion > 0 ? overrides.slowMotion : 1);
}
