/** Shared vocabulary for phone screen-to-screen motion. */

export type ScreenTransitionKind =
  | "none"
  | "tab"
  | "push"
  | "pop"
  | "present"
  | "dismiss"
  | "expand"
  | "collapse"
  | "space"
  | "crossfade";

/** `smooth` = page spring (full-screen moves); `precise` = the provider's policy spring (tabs, fades). */
export type ScreenSpring = "smooth" | "precise";

export interface ScreenTransition {
  kind: ScreenTransitionKind;
  /** Tab direction: 1 = towards a later tab, -1 = towards an earlier tab. */
  dir?: 1 | -1;
  /** Expand/collapse source card id (see expandSources). */
  sourceId?: string;
  spring: ScreenSpring;
  /** Set when a drag already moved the outgoing screen; the spring continues from here. */
  interactive?: { progress: number; velocity: number };
}

/**
 * A group of screens that share one layout ("space"): the signed-in app, a
 * dashboard, sign-in, a standalone tool. Moving between families is a space
 * switch; moving inside one is a push, pop or tab. Names are app-defined.
 */
export type ScreenFamily = string;

/** - `screen`: normal page. - `task`: slides up and is dismissed down. - `excluded`: never animated (live sessions, recorders). */
export type ScreenPresentation = "screen" | "task" | "excluded";

/** App-defined skeleton family shown while a screen's code loads (e.g. "list", "detail"). */
export type ScreenSkeletonKind = string;

/** Where a navigation came from, when it matters for motion. */
export type ScreenIntentOrigin = "quick-action" | "card" | "in-app-back" | "gesture";

export interface ScreenIntent {
  kind?: ScreenTransitionKind;
  sourceId?: string;
  origin?: ScreenIntentOrigin;
  interactive?: { progress: number; velocity: number };
}

/** `location.state.screenTransition` payload for declarative links. */
export interface ScreenIntentState {
  screenTransition?: ScreenIntent & { v: 1 };
}
