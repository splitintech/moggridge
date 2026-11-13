import { isValidElement, type ReactNode } from "react";
import { matchRoutes, type RouteObject } from "react-router-dom";

type Preloadable = { preload?: () => Promise<unknown> };

let routes: RouteObject[] = [];
const started = new Set<() => Promise<unknown>>();

/** Called once with the app's route objects (see ScreenRoutes). */
export function registerPrefetchRoutes(next: RouteObject[]) {
  routes = next;
}

/** Find lazyRoute components in a route element, including inside guards like <AuthGuard>. */
function collectPreloads(node: ReactNode, out: Set<() => Promise<unknown>>, depth = 0) {
  if (depth > 6 || node == null || typeof node === "boolean") return;
  if (Array.isArray(node)) {
    for (const child of node) collectPreloads(child, out, depth + 1);
    return;
  }
  if (!isValidElement(node)) return;
  const type = node.type as Preloadable;
  if (typeof type === "function" || typeof type === "object") {
    if (typeof type.preload === "function") out.add(type.preload);
  }
  collectPreloads((node.props as { children?: ReactNode }).children, out, depth + 1);
}

/** The loaders a path would need: its layout(s) and its screen. */
export function preloadersForPath(pathname: string): Array<() => Promise<unknown>> {
  if (!routes.length) return [];
  const matches = matchRoutes(routes, pathname) ?? [];
  const out = new Set<() => Promise<unknown>>();
  for (const match of matches) collectPreloads(match.route.element, out);
  return Array.from(out);
}

/** Start downloading a path's code. Failures are ignored here; the real render reports them. */
export function prefetchRoute(pathname: string): void {
  for (const preload of preloadersForPath(pathname)) {
    if (started.has(preload)) continue;
    started.add(preload);
    void preload().catch(() => {
      started.delete(preload);
    });
  }
}

let delegateInstalled = false;

/**
 * Touch screens never fire pointerenter before a tap, so hover prefetch misses
 * phones. Prefetching on pointerdown buys the ~100 ms before click navigates.
 */
export function installPointerdownRoutePrefetch() {
  if (delegateInstalled || typeof document === "undefined") return;
  delegateInstalled = true;
  document.addEventListener(
    "pointerdown",
    (event) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        prefetchRoute(url.pathname);
      } catch {
        /* malformed href */
      }
    },
    { capture: true, passive: true }
  );
}

export function __resetRoutePrefetchForTests() {
  routes = [];
  started.clear();
}
