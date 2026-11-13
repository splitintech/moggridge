import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { ScreenSkeletonKind } from "./types";

/** App-level settings the stages read: what a "phone" is and what loading looks like. */
export interface ScreenStageConfig {
  /**
   * Media query for the viewports where screens animate (and gestures run).
   * Default: under 768px wide. Wider viewports render the same tree without motion.
   */
  compactQuery?: string;
  /** Rendered inside a moving layer while a screen's code loads. Default: nothing. */
  renderSkeleton?: (kind: ScreenSkeletonKind) => ReactNode;
  /**
   * CSS background for the pinned stage viewport and for layers whose
   * `layerClassName` sets none, so a moving screen never shows what is behind it.
   * Default: "Canvas" (the page's system background).
   */
  background?: string;
}

export const DEFAULT_COMPACT_QUERY = "(max-width: 767.98px)";

const ScreenStageConfigContext = createContext<ScreenStageConfig>({});

export const ScreenStageConfigProvider = ScreenStageConfigContext.Provider;

export function useScreenStageConfig(): ScreenStageConfig {
  return useContext(ScreenStageConfigContext);
}

function subscribeToQuery(query: string) {
  return (onChange: () => void) => {
    if (typeof window === "undefined" || !window.matchMedia) return () => undefined;
    const list = window.matchMedia(query);
    list.addEventListener?.("change", onChange);
    return () => list.removeEventListener?.("change", onChange);
  };
}

/** True while the viewport matches the configured compact (phone) query. */
export function useCompactViewport(): boolean {
  const query = useScreenStageConfig().compactQuery ?? DEFAULT_COMPACT_QUERY;
  const subscribe = useMemo(() => subscribeToQuery(query), [query]);
  return useSyncExternalStore(
    subscribe,
    () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false
  );
}
