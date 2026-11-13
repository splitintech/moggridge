import type { ResolvedScreen, ScreenRouteTable } from "./routeTable";
import type { ScreenIntent, ScreenSpring, ScreenTransition, ScreenTransitionKind } from "./types";

export type ScreenNavigationType = "PUSH" | "REPLACE" | "POP";

export interface ClassifyEnv {
  /** Screen motion is on (stages also check the viewport before animating). */
  active: boolean;
  /** The browser already animated this history step (PopStateEvent.hasUAVisualTransition). */
  uaTransition?: boolean;
  /**
   * iOS Safari or an in-app browser, not the installed home-screen app. Their
   * native edge swipe animates on its own and can't be told apart reliably
   * from the toolbar Back button, so untracked POPs there don't animate.
   */
  iosNonStandalone?: boolean;
}

export interface ClassifyInput {
  table: ScreenRouteTable;
  from: ResolvedScreen | null;
  to: ResolvedScreen;
  navigationType: ScreenNavigationType;
  /** history idx change: negative = back, positive = forward. */
  idxDelta: number;
  /** Selects the bottom-bar order when one family has several (see ScreenRouteTableConfig.tabOrder). */
  role?: string | null;
  /** POP back: how the screen being left was entered. POP forward: how the destination was entered. */
  record?: ScreenTransition | null;
  intent?: ScreenIntent | null;
  env: ClassifyEnv;
}

const SMOOTH_KINDS = new Set<ScreenTransitionKind>(["push", "pop", "present", "dismiss", "expand", "collapse", "space"]);

export const springFor = (kind: ScreenTransitionKind): ScreenSpring => (SMOOTH_KINDS.has(kind) ? "smooth" : "precise");

const make = (kind: ScreenTransitionKind, extra: Partial<ScreenTransition> = {}): ScreenTransition => ({
  kind,
  spring: springFor(kind),
  ...extra,
});

export const NO_TRANSITION: ScreenTransition = make("none");

/** The exact opposite motion, used when going back through history. */
export function reverseTransition(transition: ScreenTransition): ScreenTransition {
  const flip: Partial<Record<ScreenTransitionKind, ScreenTransitionKind>> = {
    push: "pop",
    pop: "push",
    present: "dismiss",
    dismiss: "present",
    expand: "collapse",
    collapse: "expand",
  };
  const kind = flip[transition.kind] ?? transition.kind;
  const dir = transition.kind === "tab" && transition.dir ? ((-transition.dir) as 1 | -1) : transition.dir;
  return { ...transition, kind, dir, spring: springFor(kind), interactive: undefined };
}

/** Classify a forward move (PUSH or REPLACE) by the route table alone. */
function classifyForward(
  table: ScreenRouteTable,
  from: ResolvedScreen,
  to: ResolvedScreen,
  role: string | null,
  intent?: ScreenIntent | null
): ScreenTransition {
  if (intent?.kind && intent.kind !== "none") {
    return make(intent.kind, { sourceId: intent.sourceId, interactive: intent.interactive });
  }
  if (intent?.origin === "quick-action") return make("crossfade");

  if (from.presentation === "excluded" || to.presentation === "excluded") return make("crossfade");
  if (table.isPeer(from.screen, to.screen)) return make("crossfade");

  if (to.presentation === "task" && from.presentation !== "task") return make("present");
  if (from.presentation === "task" && to.presentation !== "task") return make("dismiss");

  if (from.family !== to.family) {
    if (table.isCrossfadeFamily(from.family) || table.isCrossfadeFamily(to.family)) return make("crossfade");
    if (table.isPushFamily(to.family)) return make("push");
    return make("space");
  }

  const order = table.tabOrderFor(to.family, role);
  if (order) {
    const fromIndex = order.indexOf(from.screen);
    const toIndex = order.indexOf(to.screen);
    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
      return make("tab", { dir: toIndex > fromIndex ? 1 : -1 });
    }
  }

  if (from.parentPath && from.parentPath === to.pathname) return make("pop");
  if (to.depth < from.depth) return make("pop");
  return make("push");
}

/** Decide how the screen change should move. Pure: no storage, no DOM. */
export function classifyScreenTransition(input: ClassifyInput): ScreenTransition {
  const { table, from, to, navigationType, idxDelta, record, intent, env } = input;
  const role = input.role ?? null;
  if (!env.active || !from) return NO_TRANSITION;
  if (from.key === to.key) return NO_TRANSITION;

  if (navigationType === "POP") {
    const ownBack = intent?.origin === "in-app-back" || intent?.origin === "gesture";
    if (!ownBack && (env.uaTransition || env.iosNonStandalone)) {
      // The browser already drew its own swipe; don't animate a second time.
      return NO_TRANSITION;
    }
    if (from.presentation === "excluded" || to.presentation === "excluded") return make("crossfade");
    let base: ScreenTransition;
    if (idxDelta < 0) {
      base = record ? reverseTransition(record) : reverseTransition(classifyForward(table, to, from, role));
    } else {
      base = record ?? classifyForward(table, from, to, role);
    }
    if (intent?.interactive && base.kind !== "none") return { ...base, interactive: intent.interactive };
    return { ...base, interactive: undefined };
  }

  return classifyForward(table, from, to, role, intent);
}
