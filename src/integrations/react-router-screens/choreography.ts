import type { ScreenTransition, ScreenTransitionKind } from "./types";

/**
 * Every screen motion in one place. `p` runs 0 → 1 for the whole transition;
 * the entering and exiting layers each read their own frame from it. One
 * progress value (not two tweens) keeps both layers in lock-step and lets a
 * drag hand its position and velocity straight to the spring.
 */

export type LayerRole = "enter" | "exit";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface ScreenMotionTokens {
  /** How far the covered screen drifts during push/pop, as a fraction of width. */
  parallax: number;
  /** Darkening on the covered screen at full coverage. */
  pushDim: number;
  presentDim: number;
  /** Tab slide distance in px. */
  tabShift: number;
  /** Space switch scale at the far end. */
  spaceScale: number;
  /** Expand/collapse corner radius at card size. */
  cardRadius: number;
}

export const DEFAULT_SCREEN_MOTION_TOKENS: ScreenMotionTokens = {
  parallax: 0.3,
  pushDim: 0.12,
  presentDim: 0.3,
  tabShift: 28,
  spaceScale: 0.96,
  cardRadius: 24,
};

export interface LayerFrame {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  /** Opacity of the black dimming veil over this layer. */
  dim: number;
  /** Shadow on the moving edge (push/pop), 0..1. */
  shadow: number;
  /** clip-path inset for expand/collapse, or null. */
  clip: string | null;
  /** Higher paints on top. */
  z: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const REST: LayerFrame = { x: 0, y: 0, scale: 1, opacity: 1, dim: 0, shadow: 0, clip: null, z: 1 };

/** Kinds where the exiting screen paints above the entering one. */
const EXIT_ON_TOP = new Set<ScreenTransitionKind>(["pop", "dismiss", "collapse"]);

export function insetFor(rect: Rect, viewport: Viewport, radius: number): string {
  const top = Math.max(0, rect.y);
  const left = Math.max(0, rect.x);
  const right = Math.max(0, viewport.width - (rect.x + rect.width));
  const bottom = Math.max(0, viewport.height - (rect.y + rect.height));
  return `inset(${top}px ${right}px ${bottom}px ${left}px round ${Math.max(0, radius)}px)`;
}

function morphRect(source: Rect, viewport: Viewport, t: number): Rect {
  return {
    x: lerp(source.x, 0, t),
    y: lerp(source.y, 0, t),
    width: lerp(source.width, viewport.width, t),
    height: lerp(source.height, viewport.height, t),
  };
}

export interface FrameInput {
  transition: ScreenTransition;
  role: LayerRole;
  /** 0 → 1. Values outside the range (spring overshoot) are allowed and clamped where it matters. */
  progress: number;
  viewport: Viewport;
  /** Card rect for expand (entering) / collapse (exiting). */
  sourceRect?: Rect | null;
  reducedMotion?: boolean;
  tokens?: ScreenMotionTokens;
}

/** Frame for one layer at progress `p`. Zeros are normalised (no -0 from mirrored formulas). */
export function layerFrame(input: FrameInput): LayerFrame {
  const frame = rawLayerFrame(input);
  return { ...frame, x: frame.x || 0, y: frame.y || 0, dim: frame.dim || 0, shadow: frame.shadow || 0 };
}

function rawLayerFrame({
  transition,
  role,
  progress,
  viewport,
  sourceRect,
  reducedMotion,
  tokens = DEFAULT_SCREEN_MOTION_TOKENS,
}: FrameInput): LayerFrame {
  const p = progress;
  const pc = clamp01(p);
  const kind = transition.kind;
  const top = EXIT_ON_TOP.has(kind) ? role === "exit" : role === "enter";
  const z = top ? 2 : 1;
  const W = viewport.width;
  const H = viewport.height;

  if (kind === "none") return { ...REST, z, opacity: role === "exit" ? 0 : 1 };

  if (reducedMotion) {
    // Movement replaced by a short crossfade; the new screen fades in on top.
    return role === "enter" ? { ...REST, z: 2, opacity: pc } : { ...REST, z: 1, opacity: 1 };
  }

  switch (kind) {
    case "push":
      return role === "enter"
        ? { ...REST, z, x: (1 - p) * W, shadow: 1 - pc * 0.5 }
        : { ...REST, z, x: -tokens.parallax * W * p, dim: tokens.pushDim * pc };
    case "pop":
      return role === "enter"
        ? { ...REST, z, x: -tokens.parallax * W * (1 - p), dim: tokens.pushDim * (1 - pc) }
        : { ...REST, z, x: p * W, shadow: 1 - pc * 0.5 };
    case "tab": {
      const d = transition.dir ?? 1;
      return role === "enter"
        ? { ...REST, z, x: d * tokens.tabShift * (1 - p), opacity: pc }
        : { ...REST, z, x: -d * tokens.tabShift * p, opacity: 1 - pc };
    }
    case "present":
      return role === "enter"
        ? { ...REST, z, y: (1 - p) * H }
        : { ...REST, z, dim: tokens.presentDim * pc };
    case "dismiss":
      return role === "enter"
        ? { ...REST, z, dim: tokens.presentDim * (1 - pc) }
        : { ...REST, z, y: p * H };
    case "space":
      return role === "enter"
        ? { ...REST, z, scale: lerp(tokens.spaceScale, 1, p), opacity: pc }
        : { ...REST, z, scale: lerp(1, tokens.spaceScale, p), opacity: 1 - pc };
    case "crossfade":
      return role === "enter" ? { ...REST, z, opacity: pc } : { ...REST, z, opacity: 1 };
    case "expand": {
      if (role === "exit") return { ...REST, z, dim: tokens.pushDim * pc };
      if (!sourceRect) return { ...REST, z, y: (1 - p) * H * 0.08, opacity: pc };
      const rect = morphRect(sourceRect, viewport, p);
      return { ...REST, z, clip: insetFor(rect, viewport, tokens.cardRadius * (1 - pc)) };
    }
    case "collapse": {
      if (role === "enter") return { ...REST, z, dim: tokens.pushDim * (1 - pc) };
      if (!sourceRect) return { ...REST, z, y: p * H * 0.08, opacity: 1 - pc };
      const rect = morphRect(sourceRect, viewport, 1 - p);
      // Fade the last stretch so the real card underneath takes over cleanly.
      return { ...REST, z, clip: insetFor(rect, viewport, tokens.cardRadius * pc), opacity: pc > 0.85 ? (1 - pc) / 0.15 : 1 };
    }
    default:
      return { ...REST, z };
  }
}

export function frameTransform(frame: LayerFrame): string {
  if (frame.x === 0 && frame.y === 0 && frame.scale === 1) return "none";
  return `translate3d(${frame.x}px, ${frame.y}px, 0) scale(${frame.scale})`;
}
