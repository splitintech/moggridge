import { generatePath, matchPath } from "react-router-dom";
import type { ScreenFamily, ScreenPresentation, ScreenSkeletonKind } from "./types";

/**
 * Motion metadata for one route pattern. Routes that render the same page
 * share a `screen` id, so moving between them never remounts or animates
 * (e.g. /dashboard/maintenance and /dashboard/maintenance/work-orders).
 * Search params and splat segments are never part of a screen key.
 */
export interface RouteMotionEntry {
  pattern: string;
  screen: string;
  family: ScreenFamily;
  /** 0 = top level (tab or home); higher = deeper drill-in. */
  depth: number;
  /** Logical parent path pattern; params are filled from the child match. */
  parent?: string;
  presentation?: ScreenPresentation;
  skeleton?: ScreenSkeletonKind;
  /** Edge-swipe back is off (mid-transaction or full-screen sessions). */
  backDisabled?: boolean;
  /** Splat groups of *different* pages key by full path instead of sharing one screen. */
  keyByPath?: boolean;
}

export interface ResolvedScreen {
  /** Stable identity: screen id plus its named params. */
  key: string;
  screen: string;
  family: ScreenFamily;
  depth: number;
  pathname: string;
  /** Concrete logical-parent path, when one exists. */
  parentPath: string | null;
  presentation: ScreenPresentation;
  skeleton: ScreenSkeletonKind;
  backDisabled: boolean;
  params: Record<string, string | undefined>;
}

export interface ScreenRouteTableConfig {
  /** Ordered: more specific patterns before the generic ones they overlap. */
  entries: readonly RouteMotionEntry[];
  /** Where Back goes for a screen without a parent, per family (default "/"). */
  familyRoots?: Readonly<Record<string, string>>;
  /**
   * Bottom-bar order (screen ids) for a family. `role` lets one family have
   * different bars (e.g. signed-in vs signed-out). The home/logo slot sits in
   * the middle so moving to and from it also has a direction.
   */
  tabOrder?: (family: ScreenFamily, role: string | null) => readonly string[] | null | undefined;
  /** Screens that are alternatives to each other and crossfade. A trailing "*" matches a screen-id prefix. */
  peers?: ReadonlyArray<readonly [string, string]>;
  /** Families entered with a push instead of a space switch (e.g. sign-in is a step forward). */
  pushFamilies?: readonly ScreenFamily[];
  /** Families that crossfade in and out instead of a space switch (standalone tools, token pages). */
  crossfadeFamilies?: readonly ScreenFamily[];
  /** Used for paths no entry matches. Defaults to family "app", depth 1, parent "/". */
  fallback?: { family: ScreenFamily; depth?: number; parent?: string | null; skeleton?: ScreenSkeletonKind };
}

export interface ScreenRouteTable {
  resolveScreen(pathname: string): ResolvedScreen;
  tabOrderFor(family: ScreenFamily, role: string | null): readonly string[] | null;
  familyRoot(family: ScreenFamily): string;
  /** Logical parent for Back when there is no history entry. */
  logicalParentPath(pathname: string): string;
  isPeer(a: string, b: string): boolean;
  isPushFamily(family: ScreenFamily): boolean;
  isCrossfadeFamily(family: ScreenFamily): boolean;
}

const normalize = (pathname: string) => {
  if (!pathname) return "/";
  const trimmed = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return trimmed || "/";
};

const matchesScreen = (pattern: string, screen: string) =>
  pattern.endsWith("*") ? screen.startsWith(pattern.slice(0, -1)) : pattern === screen;

/** Build the resolver an app's screens use. Pure apart from a bounded memo of resolved paths. */
export function createScreenRouteTable(config: ScreenRouteTableConfig): ScreenRouteTable {
  const familyRoots = config.familyRoots ?? {};
  const fallback = config.fallback ?? { family: "app" };
  const pushFamilies = new Set(config.pushFamilies ?? []);
  const crossfadeFamilies = new Set(config.crossfadeFamilies ?? []);
  const peers = config.peers ?? [];
  const cache = new Map<string, ResolvedScreen>();

  const familyRoot = (family: ScreenFamily) => familyRoots[family] ?? "/";

  const resolveScreen = (rawPathname: string): ResolvedScreen => {
    const pathname = normalize(rawPathname);
    const cached = cache.get(pathname);
    if (cached) return cached;

    let resolved: ResolvedScreen | null = null;
    for (const entry of config.entries) {
      const match = matchPath({ path: entry.pattern, end: true, caseSensitive: false }, pathname);
      if (!match) continue;
      const params: Record<string, string | undefined> = { ...match.params };
      delete params["*"];
      const keyParts = Object.keys(params)
        .sort()
        .map((name) => `${name}=${params[name] ?? ""}`);
      let parentPath: string | null = null;
      if (entry.parent) {
        try {
          parentPath = generatePath(entry.parent, params as Record<string, string>);
        } catch {
          parentPath = null;
        }
      }
      if (entry.keyByPath) keyParts.unshift(`path=${pathname}`);
      resolved = {
        key: keyParts.length ? `${entry.screen}?${keyParts.join("&")}` : entry.screen,
        screen: entry.screen,
        family: entry.family,
        depth: entry.depth,
        pathname,
        parentPath,
        presentation: entry.presentation ?? "screen",
        skeleton: entry.skeleton ?? "generic",
        backDisabled: Boolean(entry.backDisabled),
        params,
      };
      break;
    }

    if (!resolved) {
      resolved = {
        key: `${fallback.family}:unknown?path=${pathname}`,
        screen: `${fallback.family}:unknown`,
        family: fallback.family,
        depth: fallback.depth ?? 1,
        pathname,
        parentPath: fallback.parent === undefined ? "/" : fallback.parent,
        presentation: "screen",
        skeleton: fallback.skeleton ?? "generic",
        backDisabled: false,
        params: {},
      };
    }

    if (cache.size > 500) cache.clear();
    cache.set(pathname, resolved);
    return resolved;
  };

  return {
    resolveScreen,
    tabOrderFor: (family, role) => config.tabOrder?.(family, role) ?? null,
    familyRoot,
    logicalParentPath: (pathname) => {
      const screen = resolveScreen(pathname);
      return screen.parentPath ?? familyRoot(screen.family);
    },
    isPeer: (a, b) => peers.some(([x, y]) => (matchesScreen(x, a) && matchesScreen(y, b)) || (matchesScreen(x, b) && matchesScreen(y, a))),
    isPushFamily: (family) => pushFamilies.has(family),
    isCrossfadeFamily: (family) => crossfadeFamilies.has(family),
  };
}
