import type React from 'react';
export * from '../core/legacy-swipe';
import type { GesturePoint, SwipeDirection } from '../core/legacy-swipe';
export type SwipeResult = import('../core/legacy-swipe').SwipeResult & { target?: EventTarget | null };
export type GestureIntent =
  | "edge-back"
  | "swipe-dismiss"
  | "swipe-tabs"
  | "swipe-action"
  | "pull-refresh"
  | "video"
  | "document"
  | "map-panel";

export type GestureTargetPolicy = {
  ignoreSelector?: string;
  allowMultiTouch?: boolean;
};

export type GestureCallbacks = Partial<Record<SwipeDirection, () => void>>;

export const GESTURE_IGNORE_SELECTOR = [
  "[data-swipe-ignore]",
  "[data-gesture-owner]",
  "[data-disable-edge-swipe]",
  "[data-edge-swipe-back='disabled']",
  "[data-disable-pull-refresh]",
  "[data-radix-scroll-area-viewport]",
  "[contenteditable='true']",
  "input",
  "textarea",
  "select",
  "button",
  "a",
  "video",
  "audio",
  "[role='slider']",
  "[role='tablist']",
  "[role='dialog'] input",
  "[role='dialog'] textarea",
  ".mapboxgl-canvas",
  ".mapboxgl-control-container",
].join(",");

export function isCoarseMobileViewport(width = typeof window !== "undefined" ? window.innerWidth : 1024) {
  return width < 768;
}

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function shouldIgnoreGestureTarget(
  target: EventTarget | null,
  policy: GestureTargetPolicy = {},
): boolean {
  if (typeof Element === "undefined" || !(target instanceof Element)) return false;
  return Boolean(target.closest(policy.ignoreSelector ?? GESTURE_IGNORE_SELECTOR));
}

export function pointFromTouch(touch: Pick<Touch, "clientX" | "clientY">, time = Date.now()): GesturePoint {
  return { x: touch.clientX, y: touch.clientY, time };
}

export function pointFromPointer(
  event: Pick<PointerEvent, "clientX" | "clientY"> | Pick<React.PointerEvent, "clientX" | "clientY">,
  time = Date.now(),
): GesturePoint {
  return { x: event.clientX, y: event.clientY, time };
}


/** Let a nested scroll container consume movement until it reaches the relevant edge. */
export function scrollConsumesSwipe(target: EventTarget | null, boundary: EventTarget | null, dx: number, dy: number): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  const horizontal = Math.abs(dx) >= Math.abs(dy), delta = horizontal ? dx : dy;
  for (let node: HTMLElement | null = target; node; node = node.parentElement) {
    const css = getComputedStyle(node), overflow = horizontal ? css.overflowX || css.overflow : css.overflowY || css.overflow;
    if (/(auto|scroll)/.test(overflow) || node.matches('[data-scroll-boundary],.overflow-auto,.overflow-y-auto')) {
      const extent = horizontal ? node.scrollWidth-node.clientWidth : node.scrollHeight-node.clientHeight;
      let offset = horizontal ? node.scrollLeft : node.scrollTop;
      if (horizontal && css.direction === 'rtl') { offset = -offset; if (delta < 0 ? offset > 1 : offset < extent-1) return true; }
      else if (delta > 0 ? offset > 1 : delta < 0 && offset < extent-1) return true;
    }
    if (node === boundary) break;
  }
  return false;
}
