import { createContext, useContext } from "react";
import type { Location } from "react-router-dom";
import { classifyScreenTransition, NO_TRANSITION, type ScreenNavigationType } from "./classify";
import {
  browserAnimatedLastPop,
  consumePendingScreenIntent,
  getEntryTransition,
  readStateIntent,
  resolveHistoryIdx,
  setEntryTransition,
} from "./history";
import type { ResolvedScreen, ScreenRouteTable } from "./routeTable";
import type { ScreenFamily, ScreenTransition } from "./types";

export interface ScreenNavigationState {
  /** Screen motion is on (stages also check the viewport before animating). */
  enabled: boolean;
  location: Location;
  navigationType: ScreenNavigationType;
  from: ResolvedScreen | null;
  to: ResolvedScreen;
  family: ScreenFamily;
  transition: ScreenTransition;
  /** Changes whenever a screen-level transition starts. */
  transitionId: number;
  /** Layer identity inside one family; stays put across search-only changes and redirects. */
  screenLayerId: number;
  /** Layer identity across families (space switches). */
  familyLayerId: number;
  /** The app's route table (logical parents for Back, tab orders). */
  table: ScreenRouteTable;
}

interface TrackerSnapshot {
  key: string;
  screen: ResolvedScreen;
  idx: number;
  at: number;
  transition: ScreenTransition;
  transitionId: number;
  screenLayerId: number;
  familyLayerId: number;
}

const REDIRECT_WINDOW_MS = 1000;

export interface ScreenAdvanceOptions {
  enabled: boolean;
  /** Selects the bottom-bar order when one family has several (e.g. "guest" | "member"). */
  role?: string | null;
}

export interface ScreenTrackerOptions {
  table: ScreenRouteTable;
  /**
   * True when the browser has its own edge-swipe Back animation (iOS Safari
   * tab, in-app browsers). Untracked POPs there don't animate a second time.
   * Defaults to `detectIosNonStandalone`.
   */
  iosNonStandalone?: () => boolean;
}

export interface ScreenTracker {
  table: ScreenRouteTable;
  /** Classify the move to `location`. Idempotent per location key. */
  advance(location: Location, navigationType: ScreenNavigationType, options: ScreenAdvanceOptions): ScreenNavigationState;
  reset(): void;
}

/** iOS Safari (not the installed home-screen app). */
export function detectIosNonStandalone(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!ios) return false;
  const standalone =
    Boolean(window.matchMedia?.("(display-mode: standalone)").matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return !standalone;
}

/**
 * One tracker per app. It keeps the last screen so a change is classified
 * exactly once, even when React renders twice (StrictMode) or the provider
 * re-renders for unrelated reasons.
 */
export function createScreenTracker({ table, iosNonStandalone = detectIosNonStandalone }: ScreenTrackerOptions): ScreenTracker {
  let last: TrackerSnapshot | null = null;
  /** Only the latest navigation is cached: a later POP back to an old entry is a new move. */
  let lastResult: { cacheKey: string; state: ScreenNavigationState } | null = null;

  const advance = (location: Location, navigationType: ScreenNavigationType, options: ScreenAdvanceOptions): ScreenNavigationState => {
    const role = options.role ?? null;
    const cacheKey = `${location.key}|${location.pathname}|${location.search}|${role ?? ""}`;
    if (lastResult && lastResult.cacheKey === cacheKey && lastResult.state.enabled === options.enabled) {
      return lastResult.state;
    }

    const to = table.resolveScreen(location.pathname);
    const now = Date.now();
    const idx = resolveHistoryIdx(location.key, navigationType);
    const prev = last;
    const from = prev?.screen ?? null;
    const idxDelta = prev ? idx - prev.idx : 0;

    const pendingIntent = consumePendingScreenIntent(navigationType);
    const intent = pendingIntent ?? (navigationType === "POP" ? null : readStateIntent(location.state));
    const record =
      navigationType === "POP" && prev ? getEntryTransition(idxDelta < 0 ? prev.key : location.key) : null;

    let transition = classifyScreenTransition({
      table,
      from,
      to,
      navigationType,
      idxDelta,
      role,
      record,
      intent,
      env: { active: options.enabled, uaTransition: browserAnimatedLastPop(), iosNonStandalone: iosNonStandalone() },
    });

    let transitionId = prev?.transitionId ?? 0;
    let screenLayerId = prev?.screenLayerId ?? 1;
    let familyLayerId = prev?.familyLayerId ?? 1;
    const screenChanged = Boolean(from && from.key !== to.key);
    const familyChanged = Boolean(from && from.family !== to.family);

    // A redirect right after a navigation (e.g. <Navigate replace>) continues the
    // transition that is already playing instead of starting a second one.
    const inheritedRedirect =
      navigationType === "REPLACE" &&
      !intent &&
      prev !== null &&
      screenChanged &&
      !familyChanged &&
      now - prev.at < REDIRECT_WINDOW_MS &&
      prev.transition.kind !== "none";

    if (inheritedRedirect && prev) {
      transition = prev.transition;
      const inherited = getEntryTransition(prev.key);
      if (inherited) setEntryTransition(location.key, inherited);
    } else if (screenChanged) {
      transitionId += 1;
      screenLayerId += 1;
      if (familyChanged) familyLayerId += 1;
      if (navigationType !== "POP") setEntryTransition(location.key, transition);
    } else {
      transition = NO_TRANSITION;
    }

    const state: ScreenNavigationState = {
      enabled: options.enabled,
      location,
      navigationType,
      from,
      to,
      family: to.family,
      transition,
      transitionId,
      screenLayerId,
      familyLayerId,
      table,
    };

    last = {
      key: location.key,
      screen: to,
      idx,
      // Redirect chains keep the original start time so they can't extend forever.
      at: inheritedRedirect && prev ? prev.at : now,
      transition,
      transitionId,
      screenLayerId,
      familyLayerId,
    };
    lastResult = { cacheKey, state };
    return state;
  };

  return {
    table,
    advance,
    reset() {
      last = null;
      lastResult = null;
    },
  };
}

const ScreenNavigationContext = createContext<ScreenNavigationState | null>(null);

export const ScreenNavigationProvider = ScreenNavigationContext.Provider;

/** Null when no tracker is mounted (motion off, desktop-only builds, isolated tests). */
export function useScreenNavigation(): ScreenNavigationState | null {
  return useContext(ScreenNavigationContext);
}
