import { createElement, lazy, useState, type ComponentProps, type ComponentType, type FunctionComponent } from "react";

// Same constraint as React.lazy, so every existing route component keeps its prop types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

type ModuleFactory<T extends AnyComponent> = () => Promise<{ default: T }>;

export type LazyRouteComponent<T extends AnyComponent> = FunctionComponent<ComponentProps<T>> & {
  /** Download the screen's code ahead of time; safe to call repeatedly. */
  preload: () => Promise<{ default: T }>;
  /** True once the code has arrived. */
  isLoaded: () => boolean;
};

/**
 * Drop-in for React.lazy for route screens.
 *
 * React 18 suspends a lazy component at least once, even when its import has
 * already resolved, so prefetching alone still flashes the nearest Suspense
 * fallback. A lazyRoute renders the loaded component directly when its code is
 * already here. The choice is locked at mount so the element type never swaps
 * (which would remount the screen).
 */
export function lazyRoute<T extends AnyComponent>(factory: ModuleFactory<T>): LazyRouteComponent<T> {
  let promise: Promise<{ default: T }> | null = null;
  let loaded: T | null = null;

  const preload = () => {
    if (!promise) {
      promise = factory().then(
        (module) => {
          loaded = module.default;
          return module;
        },
        (error: unknown) => {
          // Let a later preload or render retry after a network failure.
          promise = null;
          throw error;
        }
      );
    }
    return promise;
  };

  const Lazy = lazy(preload);

  function LazyRoute(props: ComponentProps<T>) {
    const [Resolved] = useState<T | null>(() => loaded);
    return Resolved
      ? createElement(Resolved as ComponentType<ComponentProps<T>>, props)
      : createElement(Lazy as unknown as ComponentType<ComponentProps<T>>, props);
  }

  const component = LazyRoute as LazyRouteComponent<T>;
  component.preload = preload;
  component.isLoaded = () => loaded !== null;
  return component;
}
