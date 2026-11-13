import { useMemo, useState, type ReactNode } from "react";
import { Routes, useLocation, useNavigationType, type Location } from "react-router-dom";
import { ScreenStageConfigProvider, type ScreenStageConfig } from "./config";
import { installScreenMotionListeners } from "./history";
import { SpaceStage } from "./ScreenStage";
import { ScreenNavigationProvider, type ScreenTracker } from "./tracker";

export interface ScreenRoutesProps extends ScreenStageConfig {
  /** The tracker for this app (createScreenTracker with the app's route table). */
  tracker: ScreenTracker;
  /** Screen motion on. Off renders a plain <Routes>, exactly as without this component. */
  enabled: boolean;
  /** Selects the bottom-bar order when one family has several (passed to the route table's tabOrder). */
  role?: string | null;
  /** Location to render instead of the current one (background-location patterns). */
  location?: Partial<Location>;
  /** Classes for each space layer. Give them a background so a leaving space never shows through. */
  spaceLayerClassName?: string;
  /** The app's <Route> elements. */
  children: ReactNode;
}

const normalizeLocation = (location: Partial<Location>): Location => ({
  pathname: location.pathname ?? "/",
  search: location.search ?? "",
  hash: location.hash ?? "",
  state: location.state ?? null,
  key: location.key ?? "default",
});

/**
 * The app's <Routes>, with phone screen transitions.
 *
 * Classifies every navigation here, above <Routes>, where the real navigation
 * type is still visible (inside a <Routes location> everything reads POP), and
 * animates moves between spaces (families). Layout-level <ScreenStage>s
 * animate moves within a space.
 */
export function ScreenRoutes({
  tracker,
  enabled,
  role = null,
  location,
  spaceLayerClassName,
  compactQuery,
  renderSkeleton,
  background,
  children,
}: ScreenRoutesProps) {
  useState(() => {
    installScreenMotionListeners();
    return null;
  });
  const navigationType = useNavigationType();
  const current = useLocation();
  const config = useMemo(() => ({ compactQuery, renderSkeleton, background }), [compactQuery, renderSkeleton, background]);

  if (!enabled) return <Routes location={location}>{children}</Routes>;

  const nav = tracker.advance(normalizeLocation(location ?? current), navigationType, { enabled, role });
  return (
    <ScreenStageConfigProvider value={config}>
      <ScreenNavigationProvider value={nav}>
        <SpaceStage nav={nav} routes={children} layerClassName={spaceLayerClassName} />
      </ScreenNavigationProvider>
    </ScreenStageConfigProvider>
  );
}
